param([Parameter(Mandatory)][string]$Path, [switch]$RequireSignature)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$file=Get-Item -LiteralPath $Path
if($file.VersionInfo.ProductName -ne 'SITIOO' -or $file.VersionInfo.ProductVersion -ne $version){throw "Wrong product metadata: $($file.Name)"}
if($RequireSignature){
  if($env:SIGNPATH_CERTIFICATE_SHA256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'The approved public certificate SHA-256 fingerprint is required.'}
  $signature=Get-AuthenticodeSignature -LiteralPath $file.FullName
  if($signature.Status -ne 'Valid' -or -not $signature.TimeStamperCertificate){throw "Missing valid timestamped signature: $($file.Name)"}
  $fingerprint=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($signature.SignerCertificate.RawData))
  if($fingerprint -ne $env:SIGNPATH_CERTIFICATE_SHA256){throw "Unexpected signing certificate: $($file.Name)"}
}
Write-Output "Verified $($file.Name); product SITIOO $version; signature required: $RequireSignature"
