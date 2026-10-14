$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$downloads = Join-Path $root '.local\downloads'
$engine = Join-Path $root '.local\engine-windows-x64'
function Expand-CheckedZip([string]$archive, [string]$destination) {
    $archiveHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
    $marker = $destination + '.extracted.sha256'
    if (Test-Path -LiteralPath $marker) {
        if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne $archiveHash) { throw 'La extracción anterior pertenece a otro archivo.' }
        return
    }
    if (Test-Path -LiteralPath $destination) { throw "Extracción incompleta o destino ocupado: $destination" }
    $prefix = [IO.Path]::GetFullPath($destination) + [IO.Path]::DirectorySeparatorChar
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
        $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $zip.Entries) {
            $target = [IO.Path]::GetFullPath((Join-Path $destination $entry.FullName))
            if (-not $target.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or $entry.FullName -match '(^[\\/]|:|(^|[\\/])\.\.([\\/]|$))' -or ((($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000)) { throw 'Ruta de archivo no admitida.' }
            if (-not $entry.FullName.EndsWith('/') -and -not $seen.Add($target)) { throw 'Nombres que colisionan en Windows.' }
        }
        [IO.Directory]::CreateDirectory($destination) | Out-Null
        foreach ($entry in $zip.Entries) {
            $target = [IO.Path]::GetFullPath((Join-Path $destination $entry.FullName))
            if ($entry.FullName.EndsWith('/')) { [IO.Directory]::CreateDirectory($target) | Out-Null; continue }
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $false)
        }
        [IO.File]::WriteAllText($marker, $archiveHash)
    } finally { $zip.Dispose() }
}
[IO.Directory]::CreateDirectory($engine) | Out-Null
Expand-CheckedZip (Join-Path $downloads 'php-8.4.26-nts-Win32-vs17-x64.zip') (Join-Path $engine 'php')
Expand-CheckedZip (Join-Path $downloads 'mariadb-11.4.13-winx64.zip') (Join-Path $engine 'mariadb')
Expand-CheckedZip (Join-Path $downloads 'wordpress-7.1.3.zip') (Join-Path $engine 'wordpress-base')
$wordPress = Join-Path $engine 'wordpress-base\wordpress'
Expand-CheckedZip (Join-Path $downloads 'wordpress-7.1.3-es_ES.zip') (Join-Path $wordPress 'wp-content\languages')
[IO.Directory]::CreateDirectory((Join-Path $engine 'bin')) | Out-Null
Copy-Item -LiteralPath (Join-Path $root '.local\native\sitioo-win.exe') -Destination (Join-Path $engine 'bin\sitioo-win.exe')
Copy-Item -LiteralPath (Join-Path $downloads 'wp-cli-2.12.0.phar') -Destination (Join-Path $engine 'wp-cli.phar')
Copy-Item -LiteralPath (Join-Path $downloads 'cacert-2026-09-25.pem') -Destination (Join-Path $engine 'cacert.pem')
foreach ($name in @('router.php','control-db.php')) { Copy-Item -LiteralPath (Join-Path $root "packages\engine\$name") -Destination (Join-Path $engine $name) }
$php = Join-Path $engine 'php\php.exe'
$phpIni = @'
extension_dir="${SITIOO_PHP_EXT}"
extension=mysqli
extension=pdo_mysql
extension=curl
extension=openssl
extension=mbstring
extension=zip
extension=gd
extension=intl
extension=fileinfo
extension=sodium
curl.cainfo="${SITIOO_CA_FILE}"
openssl.cafile="${SITIOO_CA_FILE}"
date.timezone=UTC
error_reporting=22527
display_errors=Off
log_errors=Off
expose_php=Off
memory_limit=256M
upload_max_filesize=64M
post_max_size=64M
max_execution_time=120
'@
[IO.File]::WriteAllText((Join-Path $engine 'php.ini'), $phpIni, [Text.UTF8Encoding]::new($false))
[IO.Directory]::CreateDirectory((Join-Path $engine 'empty-ini')) | Out-Null
[IO.File]::WriteAllText((Join-Path $engine 'wp-cli.yml'), "color: false`n")
$manifest = [ordered]@{platform='win32';arch='x64';version='0.2.0-beta.2';php='php/php.exe';database='mariadb/mariadb-11.4.13-winx64/bin/mariadbd.exe';client='mariadb/mariadb-11.4.13-winx64/bin/mariadb.exe';installDb='mariadb/mariadb-11.4.13-winx64/bin/mariadb-install-db.exe';wpCli='wp-cli.phar';wordpress='wordpress-base/wordpress';helper='bin/sitioo-win.exe';phpVersion='8.4.26';mariaDbVersion='11.4.13';wordpressVersion='7.1.3';wpCliVersion='2.12.0'}
[IO.File]::WriteAllText((Join-Path $engine 'manifest.json'), ($manifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
$env:SITIOO_PHP_EXT = Join-Path $engine 'php\ext'
$env:SITIOO_CA_FILE = Join-Path $engine 'cacert.pem'
$env:PHP_INI_SCAN_DIR = Join-Path $engine 'empty-ini'
& $php -c (Join-Path $engine 'php.ini') --version
& $php -c (Join-Path $engine 'php.ini') -m
if ($LASTEXITCODE -ne 0) { throw 'PHP no arrancó correctamente.' }
& (Join-Path $engine $manifest.database) --no-defaults --version
Write-Host 'Motor preparado en carpeta privada del proyecto.'
