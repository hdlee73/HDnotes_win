# 기기 동기화 (같은 Wi-Fi · 핫스팟 · USB 테더링, 사용자 실행형, 문서 단위 양방향)

- 휴대폰(Android): 도구 → ‘다른 기기와 동기화’ → 코드·주소 표시. 창이 열려 있는 동안만 TCP 서버(임의 포트)와 UDP 43126 응답기가 켜집니다.
- PC: 도구 → ‘다른 기기와 동기화’ → 휴대폰 자동 찾기(`net.discover`) → 코드 입력 → 문서별 동작 확인 → ‘동기화’.
- 찾기: PC가 `HDNOTES-DISCOVER 1`을 255.255.255.255, 사설망 인터페이스마다의 브로드캐스트 주소, 각 인터페이스의 게이트웨이(USB 테더링·핫스팟에서는 휴대폰 자신)로 UDP 43126에 보냅니다. 휴대폰은 `{"app":"HDnotes","platform","name","id","version","port"}`로 답합니다(코드는 포함하지 않음). PC는 보내고 답만 받으므로 인바운드 방화벽 규칙이 필요 없습니다.
- 계획(`planSync`): 휴대폰 id별로 PC에 저장한 지난 동기화 직후의 수정 시각(baseline)과 비교합니다.
  - 한쪽만 바뀜 → 그쪽에서 복사, 양쪽 다 바뀜 → 충돌 표시 + 더 최신 쪽 선택, 그대로 → 건너뜀(접어 둠).
  - 처음 비교(기록 없음) → 2분 이상 차이 나면 더 최신 쪽, 아니면 같음으로 봅니다.
  - 한쪽에만 있음 → 기록이 없으면 새 문서로 복사, 기록이 있으면 다른 쪽에서 지운 것으로 보고 건너뜀(삭제는 전달하지 않음).
- 복사 단위: 문서 하나의 PDF + 노트(sidecar JSON) + 참조된 이미지·녹음·동영상. 열려 있는 문서는 덮어쓰지 않습니다(양쪽 모두).
- 보안: 평문 HTTP + 6자리 코드(10회 오류 시 잠김), 사설 IPv4만 허용. 기록은 `sync_base:<id>` 설정값.
- 구조: `web/js/sync.js`(로직) · `host/Bridge.cs net.http / net.discover` · Android `DeviceSync.java`.
- 테스트: `sh dev/sync-harness.sh ../HDnotes`(안드로이드 `DeviceSync.java`를 로컬 JVM에서 띄워 `dev/sync-test.mjs` 통합 실행, UDP 찾기 포함), `node dev/sync-test.mjs`(단위), `node dev/sync-ui-test.mjs`(화면).
