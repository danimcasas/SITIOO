$ErrorActionPreference='Stop'
if(-not $env:SITIOO_SIGNING_DIR){throw 'Signing workspace is missing.'}
node (Join-Path $PSScriptRoot 'start-build.cjs')
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
