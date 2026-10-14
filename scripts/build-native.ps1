$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
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
$source = Join-Path $root 'native\sitioo-win.cpp'
$exe = Join-Path $out 'sitioo-win.exe'
$obj = Join-Path $out 'sitioo-win.obj'
& $compiler /nologo /std:c++17 /O2 /MT /EHsc /W4 /utf-8 /guard:cf ("/Fo" + $obj) ("/Fe" + $exe) $source /link /DYNAMICBASE /NXCOMPAT /HIGHENTROPYVA advapi32.lib crypt32.lib
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el auxiliar Windows.' }
Get-FileHash -LiteralPath $exe -Algorithm SHA256 | Select-Object Algorithm,Hash
$plugin=Join-Path $root 'plugins\sitioo-migration'
if(Test-Path -LiteralPath $plugin){
 [IO.Directory]::CreateDirectory((Join-Path $plugin 'bin')) | Out-Null
 [IO.Directory]::CreateDirectory((Join-Path $plugin 'native')) | Out-Null
 Copy-Item -LiteralPath $exe -Destination (Join-Path $plugin 'bin\sitioo-win.exe')
 Copy-Item -LiteralPath $source -Destination (Join-Path $plugin 'native\sitioo-win.cpp')
 Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $plugin 'native\build-native.ps1')
}
