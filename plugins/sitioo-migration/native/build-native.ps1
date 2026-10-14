$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$standalone = Test-Path -LiteralPath (Join-Path $PSScriptRoot 'sitioo-win.cpp')
if($standalone){$source=Join-Path $PSScriptRoot 'sitioo-win.cpp'; $version=[regex]::Match((Get-Content -LiteralPath (Join-Path $root 'sitioo-migration.php') -Raw),'(?m)^\s*\* Version: (\S+)').Groups[1].Value}
else{$source=Join-Path $root 'native\sitioo-win.cpp'; $version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version}
$versionMatch=[regex]::Match($version,'^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$')
if(-not $versionMatch.Success){throw 'Formato de versión no admitido.'}
$parts=@(1..4 | ForEach-Object {if($versionMatch.Groups[$_].Value){[int]$versionMatch.Groups[$_].Value}else{0}})
$fixedVersion=$parts -join ','
$out = Join-Path $root '.local\native'
[IO.Directory]::CreateDirectory($out) | Out-Null
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw 'Se necesitan herramientas C++ locales autorizadas.' }
$toolDir = Get-ChildItem -LiteralPath (Join-Path $vs 'VC\Tools\MSVC') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10'
$sdkVersion = Get-ChildItem -LiteralPath (Join-Path $sdkRoot 'Include') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdk = $sdkVersion.Name
$compiler = Join-Path $toolDir.FullName 'bin\Hostx64\x64\cl.exe'
$env:INCLUDE = (Join-Path $toolDir.FullName 'include') + ';' + (Join-Path $sdkRoot "Include\$sdk\ucrt") + ';' + (Join-Path $sdkRoot "Include\$sdk\shared") + ';' + (Join-Path $sdkRoot "Include\$sdk\um")
$env:LIB = (Join-Path $toolDir.FullName 'lib\x64') + ';' + (Join-Path $sdkRoot "Lib\$sdk\ucrt\x64") + ';' + (Join-Path $sdkRoot "Lib\$sdk\um\x64")
$exe = Join-Path $out 'sitioo-win.exe'
$obj = Join-Path $out 'sitioo-win.obj'
$resourceCompiler=Join-Path $sdkRoot "bin\$sdk\x64\rc.exe"
$rc=Join-Path $out 'sitioo-version.rc'
$res=Join-Path $out 'sitioo-version.res'
@"
#include <windows.h>
1 VERSIONINFO
 FILEVERSION $fixedVersion
 PRODUCTVERSION $fixedVersion
 FILEFLAGSMASK 0x3fL
 FILEFLAGS 0x2L
 FILEOS VOS_NT_WINDOWS32
 FILETYPE VFT_APP
BEGIN
 BLOCK "StringFileInfo"
 BEGIN
  BLOCK "040904b0"
  BEGIN
   VALUE "CompanyName", "danimcasas.com e iNextalent.com\0"
   VALUE "FileDescription", "SITIOO Windows helper\0"
   VALUE "FileVersion", "$version\0"
   VALUE "InternalName", "sitioo-win\0"
   VALUE "OriginalFilename", "sitioo-win.exe\0"
   VALUE "ProductName", "SITIOO\0"
   VALUE "ProductVersion", "$version\0"
   VALUE "LegalCopyright", "danimcasas.com e iNextalent.com; GPL v2 or later\0"
  END
 END
 BLOCK "VarFileInfo"
 BEGIN
  VALUE "Translation", 0x409, 1200
 END
END
"@ | Set-Content -LiteralPath $rc -Encoding unicode
& $resourceCompiler /nologo ("/fo"+$res) $rc
if($LASTEXITCODE -ne 0){throw 'No se pudieron compilar los metadatos de Windows.'}
& $compiler /nologo /std:c++17 /O2 /MT /EHsc /W4 /utf-8 /guard:cf ("/Fo" + $obj) ("/Fe" + $exe) $source $res /link /DYNAMICBASE /NXCOMPAT /HIGHENTROPYVA /Brepro advapi32.lib crypt32.lib
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el auxiliar Windows.' }
Get-FileHash -LiteralPath $exe -Algorithm SHA256 | Select-Object Algorithm,Hash
$plugin=if($standalone){$root}else{Join-Path $root 'plugins\sitioo-migration'}
if(Test-Path -LiteralPath $plugin){
 [IO.Directory]::CreateDirectory((Join-Path $plugin 'bin')) | Out-Null
 [IO.Directory]::CreateDirectory((Join-Path $plugin 'native')) | Out-Null
 Copy-Item -LiteralPath $exe -Destination (Join-Path $plugin 'bin\sitioo-win.exe')
 if(-not $standalone){
  Copy-Item -LiteralPath $source -Destination (Join-Path $plugin 'native\sitioo-win.cpp')
  Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $plugin 'native\build-native.ps1')
 }
}
