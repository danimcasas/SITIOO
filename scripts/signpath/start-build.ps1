$ErrorActionPreference='Stop'
if(-not $env:SITIOO_SIGNING_DIR){throw 'Signing workspace is missing.'}
$node=(Get-Command node).Source
$script=Join-Path $PSScriptRoot 'build.cjs'
$project=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$process=Start-Process -FilePath $node -ArgumentList ('"'+$script+'"') -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $env:SITIOO_SIGNING_DIR 'build.stdout.log') -RedirectStandardError (Join-Path $env:SITIOO_SIGNING_DIR 'build.stderr.log')
$process.Id | Set-Content -LiteralPath (Join-Path $env:SITIOO_SIGNING_DIR 'build.pid')
Write-Output 'Packager started; signing stages are checked in order.'
