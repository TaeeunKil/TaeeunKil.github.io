[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$credentialDirectory = Join-Path $env:USERPROFILE '.codex\secrets'
$credentialPath = Join-Path $credentialDirectory 'typesafe-blog-review.dpapi'
$secureKey = Read-Host 'Paste TypeSafe API key (hidden input)' -AsSecureString
if ($secureKey.Length -eq 0) { throw 'Empty key was not saved.' }
New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
$secureKey | ConvertFrom-SecureString | Set-Content -LiteralPath $credentialPath -Encoding ASCII
Write-Output 'Saved outside the repository, encrypted for this Windows user using DPAPI.'
