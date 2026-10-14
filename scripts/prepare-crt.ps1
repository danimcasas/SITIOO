$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$installer=Join-Path $root '.local\downloads\vc_redist.x64.exe'
$signature=Get-AuthenticodeSignature -LiteralPath $installer
if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation'){throw 'La firma del redistribuible no es válida.'}
$seven=(Get-ChildItem -LiteralPath (Join-Path $root '.local\cache\electron-builder') -Filter '7za.exe' -Recurse | Select-Object -First 1).FullName
if(-not $seven){throw 'Falta 7zip del empaquetador.'}
$work=Join-Path $root '.local\vendor\crt-extracted'
if(-not (Test-Path -LiteralPath $work)){
 [IO.Directory]::CreateDirectory($work) | Out-Null
 Add-Type -TypeDefinition @'
using System;using System.IO;
public static class SitiooCab {
 public static void Extract(string source,string output){byte[] b=File.ReadAllBytes(source);int n=0;
 for(int i=0;i<b.Length-36;i++)if(b[i]==77&&b[i+1]==83&&b[i+2]==67&&b[i+3]==70){uint length=BitConverter.ToUInt32(b,i+8);if(length>=36&&(long)i+length<=b.Length){using(var f=File.Create(Path.Combine(output,"container-"+(n++)+".cab")))f.Write(b,i,(int)length);i+=(int)length-1;}}
 if(n!=2)throw new Exception("Contenedores inesperados en el redistribuible.");
 }
}
'@
 [SitiooCab]::Extract($installer,$work)
 & $seven x (Join-Path $work 'container-0.cab') ('-o'+(Join-Path $work 'manifest')) -bso0 -bsp0
 if($LASTEXITCODE -ne 0){throw 'No se pudo extraer el manifiesto.'}
 & $seven x (Join-Path $work 'container-1.cab') ('-o'+(Join-Path $work 'payload')) -bso0 -bsp0
 if($LASTEXITCODE -ne 0){throw 'No se pudo extraer el contenedor.'}
 [xml]$manifest=Get-Content -LiteralPath (Join-Path $work 'manifest\0') -Raw
 $payload=$manifest.BurnManifest.Payload | Where-Object {$_.FilePath -eq 'packages\vcRuntimeMinimum_amd64\cab1.cab'}
 if(-not $payload){throw 'No se encontró el paquete x64.'}
 $cab=Join-Path $work ('payload\'+$payload.SourcePath)
 if((Get-FileHash -LiteralPath $cab -Algorithm SHA1).Hash -ne $payload.Hash){throw 'El paquete x64 no coincide con el contenedor firmado.'}
 & $seven x $cab ('-o'+(Join-Path $work 'dlls')) -bso0 -bsp0
 if($LASTEXITCODE -ne 0){throw 'No se pudo extraer el paquete x64.'}
}
$destinations=@((Join-Path $root '.local\engine-windows-x64\php'),(Join-Path $root '.local\engine-windows-x64\mariadb\mariadb-11.4.13-winx64\bin'))
$rows=@()
foreach($dll in Get-ChildItem -LiteralPath (Join-Path $work 'dlls') -File){
 $name=$dll.VersionInfo.OriginalFilename.ToLowerInvariant()
 if($name -notmatch '^(vcruntime140(?:_1|_threads)?|msvcp140(?:_1|_2|_atomic_wait|_codecvt_ids)?|concrt140)\.dll$'){continue}
 $bytes=[IO.File]::ReadAllBytes($dll.FullName);$pe=[BitConverter]::ToInt32($bytes,60)
 if([BitConverter]::ToUInt16($bytes,$pe+4) -ne 0x8664){throw 'El componente no es x64.'}
 if((Get-AuthenticodeSignature -LiteralPath $dll.FullName).Status -ne 'Valid'){throw 'Firma de componente no válida.'}
 foreach($destination in $destinations){Copy-Item -LiteralPath $dll.FullName -Destination (Join-Path $destination $name)}
 $rows+=[ordered]@{file=$name;version=$dll.VersionInfo.FileVersion;sha256=(Get-FileHash -LiteralPath $dll.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
}
if($rows.Count -lt 4){throw 'El paquete de bibliotecas está incompleto.'}
$rows | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root '.local\engine-windows-x64\crt-manifest.json') -Encoding utf8
Write-Host "Bibliotecas x64 preparadas junto a PHP y MariaDB: $($rows.Count). No se ha ejecutado el instalador del sistema."
