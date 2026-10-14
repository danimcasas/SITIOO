$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$downloads = Join-Path $root '.local\downloads'
[IO.Directory]::CreateDirectory($downloads) | Out-Null
function Read-RemoteText([string]$url) {
    $value = (Invoke-WebRequest -Uri $url -TimeoutSec 90).Content
    if ($value -is [byte[]]) { return [Text.Encoding]::UTF8.GetString($value) }
    return [string]$value
}
function Fetch([string]$name, [string]$url, [string]$expected = '') {
    $target = Join-Path $downloads $name
    if (-not (Test-Path -LiteralPath $target)) {
        $partial = $target + '.partial-' + [guid]::NewGuid().ToString('N')
        Invoke-WebRequest -Uri $url -OutFile $partial -TimeoutSec 900
        $actual = (Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($expected -and $actual -ne $expected) { throw "SHA-256 incorrecto: $name. Se conserva la descarga para diagnóstico." }
        Move-Item -LiteralPath $partial -Destination $target
    }
    $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expected -and $actual -ne $expected) { throw "SHA-256 incorrecto en caché: $name" }
    Write-Host "Verificado: $name"
    return [pscustomobject]@{name=$name;url=$url;sha256=$actual;bytes=(Get-Item -LiteralPath $target).Length;provider_sha256=[bool]$expected}
}
$lockFile=Join-Path $root 'config\windows-dependencies.lock.json'
if(Test-Path -LiteralPath $lockFile){
    $locked=Get-Content -LiteralPath $lockFile -Raw | ConvertFrom-Json
    foreach($item in $locked){Fetch $item.name $item.url $item.sha256 | Out-Null}
    $signature=Get-AuthenticodeSignature -LiteralPath (Join-Path $downloads 'vc_redist.x64.exe')
    if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation'){throw 'Firma Microsoft no válida.'}
    $locked | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $downloads 'manifest.json') -Encoding utf8
    $locked | ForEach-Object {$_.sha256+'  '+$_.name} | Set-Content -LiteralPath (Join-Path $downloads 'SHA256SUMS.txt') -Encoding utf8
    Write-Host 'Componentes comprobados con el archivo de versiones y hashes. Sin instalaciones globales.'
    return
}
$records = @()
$records += Fetch 'php-8.4.26-nts-Win32-vs17-x64.zip' 'https://windows.php.net/downloads/releases/php-8.4.26-nts-Win32-vs17-x64.zip' 'da68394f9193b7f6b89d0c76861a4034ae10efee7fd55a7255d8118c2acf70d7'
$records += Fetch 'php-8.4.26-src.zip' 'https://windows.php.net/downloads/releases/php-8.4.26-src.zip' 'abaca319deb54e5e0af9c3fba606b23e54964dad5c96fe54a63931b0f8bc2d04'
$records += Fetch 'mariadb-11.4.13-winx64.zip' 'https://archive.mariadb.org/mariadb-11.4.13/winx64-packages/mariadb-11.4.13-winx64.zip' 'd62986d433eeebfde218560b276103831604a61e929e87f1a17f5aebd80257e2'
$sourceSums = Read-RemoteText 'https://archive.mariadb.org/mariadb-11.4.13/source/sha256sums.txt'
$sourceHash = [regex]::Match($sourceSums, '(?m)^([a-f0-9]{64})\s+\.?/?mariadb-11\.4\.13\.tar\.gz\s*$').Groups[1].Value
if (-not $sourceHash) { throw 'No se encontró el hash oficial de la fuente MariaDB.' }
$records += Fetch 'mariadb-11.4.13.tar.gz' 'https://archive.mariadb.org/mariadb-11.4.13/source/mariadb-11.4.13.tar.gz' $sourceHash
$records += Fetch 'wordpress-7.1.3.zip' 'https://downloads.wordpress.org/release/wordpress-7.1.3.zip'
$records += Fetch 'wordpress-7.1.3-es_ES.zip' 'https://downloads.wordpress.org/translation/core/7.1.3/es_ES.zip'
$cliHash = [regex]::Match((Read-RemoteText 'https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar.sha256'), '[a-f0-9]{64}').Value
if (-not $cliHash) { throw 'Falta la suma oficial de WP-CLI.' }
$records += Fetch 'wp-cli-2.12.0.phar' 'https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar' $cliHash
$caHash = [regex]::Match((Read-RemoteText 'https://curl.se/ca/cacert-2026-09-25.pem.sha256'), '[a-f0-9]{64}').Value
if (-not $caHash) { throw 'Falta la suma oficial de los certificados raíz.' }
$records += Fetch 'cacert-2026-09-25.pem' 'https://curl.se/ca/cacert-2026-09-25.pem' $caHash
$msPage = Invoke-WebRequest -Uri 'https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170' -TimeoutSec 90
$msUrl = @($msPage.Links.href | Where-Object { $_ -match '^https://aka\.ms/.*/vc_redist\.x64\.exe$' } | Select-Object -Unique)[0]
if (-not $msUrl) { throw 'No se encontró el redistribuible x64 en la página oficial Microsoft.' }
$records += Fetch 'vc_redist.x64.exe' $msUrl
$signature = Get-AuthenticodeSignature -LiteralPath (Join-Path $downloads 'vc_redist.x64.exe')
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation') { throw 'Firma Microsoft no válida.' }
$records | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $downloads 'manifest.json') -Encoding utf8
$records | ForEach-Object { $_.sha256 + '  ' + $_.name } | Set-Content -LiteralPath (Join-Path $downloads 'SHA256SUMS.txt') -Encoding utf8
Write-Host 'Descargas completadas; no se ha instalado el redistribuible en Windows.'

