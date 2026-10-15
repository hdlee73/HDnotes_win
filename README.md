# HDnotes for Windows

<img src="web/assets/hdnotes-icon.svg" width="96" alt="HDnotes 아이콘">

PDF·한글·Office 문서를 열어 펜으로 필기하고, 새 노트를 만드는 Windows 노트 앱입니다. 화면과 메뉴는 삼성 노트(Windows)의 사용 흐름을 따릅니다.
갤럭시 북 플렉스, 서피스 같은 펜 지원 노트북과 일반 노트북·데스크톱(마우스·키보드)을 모두 지원합니다.
안드로이드용 HDnotes와 같은 기능·같은 아이콘을 쓰며, 백업 파일을 서로 주고받을 수 있습니다. (이전 이름: Everynote)

## 화면 구성
- **문서함**: 왼쪽 탐색 창(모든 노트 · 즐겨찾기 · 최근 문서 · 휴지통 · 폴더), 위쪽 버튼(노트 작성 · PDF 가져오기 · 편집 · 보기 방식), 검색 창, 정렬(수정 날짜 / 열어본 날짜 / 이름), 휴지통에서 복원·완전 삭제.
- **노트 편집**: 위쪽에 ‹(문서함) · 문서 이름 · 전체 화면 · 읽기 모드 · 페이지 관리 · 노트 스타일 · 삽입 · 공유 · 파일로 저장 · 인쇄 · 검색 · ⋮.
  오른쪽 도구 모음(키보드 · 펜 · 형광펜 · 지우개 · 올가미 · 실행 취소/다시 실행 · 테이프 · 텍스트 표시 · 메모 · 도형 · 텍스트 선택 · 북마크 · 두 쪽 보기), 도구 옆에 붙어 열리는 펜/지우개 설정 창, 플로팅 툴바.
  도구 모음은 오른쪽 · 왼쪽 · 아래 · 떠 있는 창 중에서 고를 수 있습니다.

## 기능
- **PDF, HWP/HWPX, DOC/DOCX, PPT/PPTX, XLS/XLSX 불러오기** (HWP는 내장 엔진, 나머지는 설치된 MS Office 또는 LibreOffice로 PDF 변환)
- 펜 필기·형광펜·지우개·올가미·테이프, 글자 선택(하이라이트·메모·번역·읽어주기·사전), 글상자·이미지·스티커·도형·표·동영상·유튜브 링크 삽입, 녹음
- 탭으로 여러 문서 열기, 두 쪽 보기, 화면 나누기, 페이지 넘김 애니메이션
- 검색(스캔본은 Windows OCR), 학습 패널(오답/단어 정리 내보내기), 북마크·개요·썸네일, 주석 포함 PDF/JSON 내보내기, 인쇄
- 마우스 사용: 휠·방향키·드래그로 페이지 넘기기, Ctrl+휠 확대/축소, 왼쪽 아래 확대 버튼(＋ / 100% / －)
- AVI·WMV 등 앱 안에서 재생할 수 없는 동영상은 넣을 때 MP4로 자동 변환(Windows 내장 기능, 오프라인)
- 문서함 전체 백업/복원: Everynote·HDnotes(Windows·안드로이드) 백업과 호환
- **휴대폰과 동기화**: 같은 Wi-Fi·핫스팟·USB 테더링에서 안드로이드 HDnotes를 자동으로 찾아, 양쪽에서 바뀐 문서만 서로 맞춤(도구 → 다른 기기와 동기화, [자세히](docs/device-sync.md))

## 설치
[Releases](https://github.com/hdlee73/HDnotes_win/releases)에서 받습니다.

| 파일 | 설명 |
|---|---|
| `HDnotes-Setup-vX.Y.Z-x64.exe` | **설치 프로그램(권장)** — 일반 PC (Intel/AMD) |
| `HDnotes-Setup-vX.Y.Z-arm64.exe` | 설치 프로그램 — ARM 노트북 (Surface Pro X, Snapdragon 등) |
| `HDnotes-vX.Y.Z-win-x64.exe` / `-win-arm64.exe` | 설치 없이 실행하는 단일 파일(포터블) |
| `SHA256SUMS.txt` | 각 파일의 SHA-256 값 |

설치 방법
1. `HDnotes-Setup-…exe`를 실행합니다. 언어는 Windows 언어에 맞춰 한국어/영어로 표시됩니다.
2. 기본값은 **내 계정에만 설치**(`%LOCALAPPDATA%\Programs\HDnotes`)이며 관리자 권한이 필요 없습니다. 모든 사용자용으로 설치하려면 설치 시작 때 나오는 선택 창에서 ‘모든 사용자’를 고르세요.
3. 추가 작업 선택: **바탕 화면 바로 가기**, ‘PDF·HWP·Office 문서에 **HDnotes로 열기** 추가’(기본 앱은 바뀌지 않으며, 기본 앱으로 쓰려면 Windows 설정 > 앱 > 기본 앱에서 직접 지정).
4. 시작 메뉴에 HDnotes가 만들어집니다. 시작 메뉴/바탕 화면 아이콘을 우클릭 > **작업 표시줄에 고정**하세요.
5. 실행 중인 HDnotes가 있으면 설치/제거 때 자동으로 닫힙니다.

HDnotes는 Everynote와 따로 설치되는 앱입니다. Everynote의 문서는 Everynote의 ⋮ 메뉴 > **모든 문서 백업**으로 백업한 뒤, HDnotes의 ⋮ 메뉴 > **모든 문서 복원**으로 옮기세요.

제거: Windows 설정 > 앱 > 설치된 앱 > HDnotes > 제거. **내 문서와 설정은 기본으로 남겨 둡니다.** 제거 중 묻는 창에서 ‘예’를 고르면 설정·캐시(`%LOCALAPPDATA%\HDnotes`)를 지우고, 한 번 더 확인한 뒤에만 문서 폴더(`문서\HDnotes`)까지 지웁니다.
자동 설치(조용히): `HDnotes-Setup-….exe /VERYSILENT /TASKS="desktopicon"`, 제거는 `"%LOCALAPPDATA%\Programs\HDnotes\unins000.exe" /VERYSILENT` (`/PURGEDATA`로 설정까지 삭제).

요구 사항: Windows 10(1809 이상)/11, **WebView2 런타임**(Windows 11과 최신 Windows 10에는 기본 포함. 없으면 실행할 때 안내 창이 열립니다).
저장 위치: 문서 `문서\HDnotes`, 설정·캐시 `%LOCALAPPDATA%\HDnotes`.

## 앱 정보와 업데이트
설정 > **앱 정보·업데이트**에서 버전과 업데이트 날짜, 만든이(이현덕, hdlee73@gmail.com), 업데이트 정보 링크를 보고 **업데이트 확인**을 누를 수 있습니다.
앱을 열 때 [이 저장소의 릴리스](https://github.com/hdlee73/HDnotes_win/releases)에서 새 버전을 확인해 알려 줍니다(앱 정보에서 끌 수 있음). 설치판은 새 설치 파일을 내려받아 바로 업데이트할 수 있습니다.

## 오프라인(인터넷이 막힌 사내망)에서 제한되는 기능
HDnotes의 핵심 기능은 **인터넷 없이 모두 동작**합니다: 문서 열기, 펜·타이핑·도형 편집, 검색, 북마크, 녹음, 인쇄, 내보내기, HWP 변환(내장 엔진), 스캔본 OCR(Windows OCR), 읽어주기(Windows에 설치된 음성).

| 기능 | 오프라인에서 | 비고 |
|---|---|---|
| 번역(글자 선택 > 번역) | 사용 불가 | 기본 브라우저로 Google 번역 페이지를 엽니다. |
| 사전(글자 선택 > 사전) | 사용 불가 | 기본 브라우저로 네이버 사전을 엽니다. |
| 단어장(글자 선택 > 단어장) | 일부 | 단어는 복사되지만 네이버 영영사전 페이지는 인터넷이 필요합니다. |
| 유튜브 영상 링크·미리보기 | 사용 불가 | 삽입한 영상의 썸네일과 재생은 인터넷이 필요합니다. |
| 읽어주기 | 일부 | ‘Microsoft … Online (Natural)’ 같은 온라인 음성은 인터넷이 필요합니다. 설정 > 시간 및 언어 > 음성에서 설치하는 오프라인 음성을 쓰세요. |
| 스캔본 OCR | 언어 팩 필요 | Windows 설정에서 한국어/영어 OCR 언어 팩이 설치되어 있어야 합니다(설치 때만 인터넷 필요). |
| DOC/PPT/XLS 변환 | 조건부 | PC에 MS Office 또는 LibreOffice가 설치되어 있어야 합니다(인터넷 불필요). HWP/HWPX는 내장 엔진이라 항상 가능합니다. |
| WebView2 런타임 설치 | 설치 때만 | 사내망에서는 Microsoft의 *Evergreen Standalone Installer*(오프라인용)를 미리 설치하세요. |
| 앱 링크(웹 주소 열기) | 사용 불가 | 문서 속 링크는 기본 브라우저로 열립니다. |

HDnotes는 사용 통계를 보내지 않습니다. 인터넷에 접속하는 것은 위 표의 기능을 직접 사용할 때와 새 버전 확인(GitHub 릴리스 조회)뿐입니다.

## 구조와 빌드
- `web/` HTML/JS 앱 · `host/` WPF·WebView2 셸(`HDnotes.csproj`: 파일·변환·OCR·업데이트) · `installer/` Inno Setup(`HDnotes.iss`) · CI `.github/workflows/build.yml` · 문서 `docs/`.
- 버전은 `VERSION` 파일, 릴리스 노트는 `docs/release-notes/vX.Y.Z.md`. `main`에 올린 `VERSION`의 릴리스가 아직 없으면 CI가 빌드해 릴리스를 만듭니다.
- **아이콘**: 원본은 `web/assets/hdnotes-icon.svg` 하나입니다. `python tools/make_icons.py` 한 번으로 `host/Assets/app.ico`, `installer/hdnotes.ico`, 설치 마법사 그림, 웹 PNG·파비콘을 다시 만듭니다.
- **선 아이콘**: 안드로이드 앱과 같은 아이콘을 `art/shared-icons.json`에서 가져옵니다 (`node tools/import_shared_icons.mjs [icons.json]` → `node tools/export_icons.mjs`).
- **코드 서명**: 저장소 Secrets(`CODESIGN_PFX_BASE64`, `CODESIGN_PASSWORD`)가 있을 때만 서명합니다. 방법은 [signing/README.md](signing/README.md).
- 개발용 테스트: `dev/*-test.mjs` (Playwright + Chromium).
- 이전 이름(Everynote) 시절의 릴리스 노트는 `docs/history/`에 있습니다.
