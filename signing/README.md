# HDnotes 코드 서명

이 저장소는 공개 저장소이므로 **인증서(PFX)·개인 키·암호는 절대 커밋하지 않습니다.**
CI(`.github/workflows/build.yml`)는 저장소 Secrets에 아래 두 값이 있을 때만 `HDnotes.exe`와 설치 파일(`HDnotes-Setup-…exe`)에 서명합니다.

| Secret 이름 | 내용 |
|---|---|
| `CODESIGN_PFX_BASE64` | 코드 서명용 PFX 파일을 Base64로 바꾼 문자열 |
| `CODESIGN_PASSWORD` | 그 PFX의 암호 |

두 값이 없으면 서명을 건너뛰고(빌드 로그에 `codesign` 알림이 나옵니다) 서명 없이 그대로 빌드·릴리스합니다.
서명은 `tools/sign.ps1`이 합니다: PFX를 러너 임시 폴더(`$RUNNER_TEMP`)에 풀고,
`signtool sign /fd SHA256 /tr <타임스탬프 서버> /td SHA256`으로 서명한 뒤 PFX 파일을 바로 지웁니다.

## 1. 자체 서명 코드 서명 인증서 만들기 (Windows PowerShell)

```powershell
# 인증서 만들기 (현재 사용자 저장소, 5년 유효)
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=HDnotes (hdlee73)" -KeyAlgorithm RSA -KeyLength 3072 `
  -HashAlgorithm SHA256 -KeyExportPolicy Exportable `
  -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(5)

# 암호를 정해 PFX로 내보내기 (저장소 밖의 폴더에 저장하세요)
$pw = Read-Host "PFX 암호" -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath "$env:USERPROFILE\hdnotes-codesign.pfx" -Password $pw

# (선택) 공개 인증서만 따로 내보내기: 사용자 PC에서 '신뢰할 수 있는 게시자'로 등록할 때 씁니다
Export-Certificate -Cert $cert -FilePath "$env:USERPROFILE\hdnotes-codesign.cer"
```

## 2. GitHub Secrets 등록

1. PFX를 Base64 문자열로 바꿔 클립보드에 복사합니다.
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\hdnotes-codesign.pfx")) | Set-Clipboard
   ```
2. GitHub에서 **hdlee73/HDnotes_win → Settings → Secrets and variables → Actions → New repository secret**을 엽니다.
3. 이름 `CODESIGN_PFX_BASE64`, 값에 붙여넣기 → 저장.
4. 다시 **New repository secret**: 이름 `CODESIGN_PASSWORD`, 값에 1단계에서 정한 PFX 암호 → 저장.

GitHub CLI를 쓴다면:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\hdnotes-codesign.pfx")) | gh secret set CODESIGN_PFX_BASE64 -R hdlee73/HDnotes_win
gh secret set CODESIGN_PASSWORD -R hdlee73/HDnotes_win   # 암호를 물으면 입력
```

다음 빌드부터 로그에 `signed HDnotes.exe`, `signed HDnotes-Setup-…exe`가 나오면 서명된 것입니다.
서명 확인: 파일 우클릭 → 속성 → **디지털 서명** 탭, 또는 `Get-AuthenticodeSignature .\HDnotes-Setup-v1.0.0-x64.exe`.

## 알아 둘 점

- **자체 서명 인증서**는 파일이 변조되지 않았음을 보장하지만, Windows SmartScreen의 "알 수 없는 게시자" 경고를 없애지는 못합니다.
  경고 없이 배포하려면 공인 인증 기관(CA)의 코드 서명 인증서(또는 Azure Trusted Signing)가 필요합니다. 그때도 위 두 Secret만 새 PFX로 바꾸면 됩니다.
- 자체 서명 인증서를 신뢰하게 하려면, 사용자가 `hdnotes-codesign.cer`를 **신뢰할 수 있는 게시자**와 **신뢰할 수 있는 루트 인증 기관**에 직접 설치해야 합니다.
- PFX와 암호는 저장소에 올리지 말고, 안전한 곳(암호 관리자 등)에 보관하세요. 유출되었다면 새 인증서를 만들고 Secrets를 바꾸세요.
- 인증서 만료 전에 같은 방법으로 새로 만들어 Secrets를 갱신하면 됩니다. 타임스탬프가 찍힌 기존 서명은 만료 뒤에도 유효합니다.
