# Code-signs the given files with the PFX from the repository secrets CODESIGN_PFX_BASE64 / CODESIGN_PASSWORD.
# Without those secrets it signs nothing and the build goes on unsigned (a ::notice says so). The PFX is decoded to
# $env:RUNNER_TEMP only for the signing and deleted right after. See signing/README.md.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrEmpty($env:CODESIGN_PFX_BASE64) -or [string]::IsNullOrEmpty($env:CODESIGN_PASSWORD)) {
  Write-Host "::notice title=codesign::CODESIGN_PFX_BASE64 / CODESIGN_PASSWORD secrets not set: $($Files.Count) file(s) left unsigned"
  exit 0
}
$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
  Sort-Object { [version]($_.Directory.Parent.Name -replace '[^0-9.]', '') } -Descending | Select-Object -First 1
if (-not $signtool) { $signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue }
if (-not $signtool) { Write-Host "::error title=codesign::signtool.exe not found"; exit 1 }
$tmp = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$pfx = Join-Path $tmp ("codesign-" + [guid]::NewGuid().ToString('N') + ".pfx")
try {
  [IO.File]::WriteAllBytes($pfx, [Convert]::FromBase64String($env:CODESIGN_PFX_BASE64))
  foreach ($f in $Files) {
    $ok = $false
    foreach ($ts in 'http://timestamp.digicert.com', 'http://timestamp.sectigo.com') {
      & $signtool.FullName sign /f $pfx /p $env:CODESIGN_PASSWORD /fd SHA256 /tr $ts /td SHA256 /d HDnotes $f
      if ($LASTEXITCODE -eq 0) { $ok = $true; break }
      Write-Host "::warning title=codesign::timestamp server $ts failed for $(Split-Path $f -Leaf), trying the next one"
    }
    if (-not $ok) { Write-Host "::error title=codesign::could not sign $f"; exit 1 }
    Write-Host "::notice title=codesign::signed $(Split-Path $f -Leaf)"
  }
}
finally { if (Test-Path $pfx) { Remove-Item $pfx -Force } }
