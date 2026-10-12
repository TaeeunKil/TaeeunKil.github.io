param([switch]$Read)
$ErrorActionPreference = 'Stop'
$credentialDirectory = Join-Path $env:USERPROFILE '.codex\secrets'
$credentialPath = Join-Path $credentialDirectory 'typesafe-blog-review.dpapi'
if ($Read) {
    if (-not (Test-Path -LiteralPath $credentialPath)) { exit 1 }
    $secureKey = Get-Content -LiteralPath $credentialPath -Raw | ConvertTo-SecureString
    $credential = New-Object System.Management.Automation.PSCredential('typesafe', $secureKey)
    [Console]::Out.Write($credential.GetNetworkCredential().Password)
    exit 0
}
$secureKey = Read-Host 'Paste TypeSafe API key (hidden input)' -AsSecureString
if ($secureKey.Length -eq 0) { throw 'Empty key was not saved.' }
New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
$secureKey | ConvertFrom-SecureString | Set-Content -LiteralPath $credentialPath -Encoding ASCII
Write-Output 'Saved outside the repository, encrypted for this Windows user using DPAPI.'
