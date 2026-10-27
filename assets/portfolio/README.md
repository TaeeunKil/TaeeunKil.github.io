# 포트폴리오 화면 출처

사용자 기존 SSAFY 포트폴리오 2026-09-30 PDF에 포함된 이미지 객체를 원본 그대로 추출했다. 전체 문서나 개인정보 페이지는 복사하지 않았다.

- moayo-home.jpg: 4쪽, 서비스 메인 화면. 전체 화면의 모든 요소를 개인 단독 구현으로 주장하지 않는다.
- ttomanito-mission.jpg: 8쪽, 미션 화면.
- rental-list.jpg: 12쪽, 물품 목록.
- rental-sdui.jpg: 13쪽, SDUI 화면과 JSON 대응 예시.

과거 문서의 기간·정확도 그래프는 가져오지 않았다. 웹 본문의 기간과 역할은 별도 확인 기록을 따른다.

- moayo-logo.jpg: 4쪽 로고 이미지 객체.
- moayo-crawling.jpg: 5쪽 크롤링 구성도.
- ttomanito-lazy-loading.jpg: 11쪽 비교표. 당시 발표 수치이며 측정 조건은 재검증하지 않음.

- ovion-logo.svg: OVION 웹 프로젝트의 기존 로고. 흰색 워드마크를 어두운 배경에 표시.
- mattermost-logo.svg: Mattermost 웹 프로젝트의 기존 로고.
- rental-logo.svg: 기존 PDF 12쪽 로그인 화면의 로고 영역을 SVG viewBox로 표시.
- ttomanito-logo.svg: 기존 PDF 8쪽 표지의 마스코트 영역을 SVG viewBox로 표시.

- jacmel-mark.svg, deploy-mark.svg, legal-mark.svg, moayo-mark.svg: 포트폴리오용으로 만든 프로젝트 표식. 공식 서비스 로고가 아님. 모아요의 기존 추출 이미지 대신 사용.

- 모아요 마크는 moayo-home.jpg의 왼쪽 위 서비스 마크를 참고해 SVG로 재구성했다. 원본 벡터 파일은 찾지 못했다. 이전에 추출한 moayo-logo.jpg는 서비스 로고로 사용하지 않는다.
- Jacmel MGCMS는 사용자 확인에 따라 OVION 로고를 함께 사용한다.

- kafrust-mark.svg: 포트폴리오용 메시지 흐름 표식. Kafka 또는 Rust의 공식 로고가 아님.
- awm-mark.svg와 translator-mark.svg: 각 프로젝트의 기록 보관과 자막 기능을 나타내는 포트폴리오용 표식. 공식 로고가 아님.

## 2026-10-20 실행 화면

- jacmel-overview.jpg: 로컬 Jacmel 운영 화면. 계측값 미연결.
- deploy-console.jpg: 실행 중인 배포 콘솔의 대기 화면. 내부 주소가 있는 하단은 캡처 범위에서 제외.
- awm-overview.jpg: 실제 AWM 앱에 별도 임시 Vault와 예시 기록을 넣어 촬영. 개인 세션은 사용하지 않음.
- meeting-translator.jpg: 기존 Windows 앱의 회의 시작 전 화면. 캡처 후 원래 번역 엔진 설정 복원.
- legal-rag-home.jpg: 보관된 ai_output-master 프런트엔드 소스의 로컬 실행 화면. 답변 백엔드 미연결.
- mattermost-ai.jpg: 내부 브라우저에서 공지 보드와 AI 패널을 촬영. 개인 메시지 목록을 접고 비어 있는 입력창과 전송 버튼까지 포함해 전체 화면 촬영. 메시지 전송과 보드 변경 없음.

## 2026-10-27 mail-mcp 근거

- mail-mcp-mark.svg: 포트폴리오용 봉투 표식. 공식 로고가 아님.
- 기준 커밋: https://github.com/TaeeunKil/mail-mcp/tree/56fcb10112058facaf89abdb669568a1706287b8
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/README.md
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/SECURITY.md
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/TEST_REPORT.md
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/VERCEL.md
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/NAVER_SETUP.md
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/imap_connector/core.py
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/imap_connector/oauth_auth.py
- https://github.com/TaeeunKil/mail-mcp/blob/56fcb10112058facaf89abdb669568a1706287b8/imap_connector/http_server.py
- CI: https://github.com/TaeeunKil/mail-mcp/actions/runs/40442968583 — Python 3.11/3.12/3.13 각각 164 passed 로그 확인. 해당 커밋 Vercel status success 확인. 이 작업에서 mail-mcp 테스트를 재실행한 것은 아님.
- ChatGPT/dot 연결, 본문 4건, PDF 첨부 3건 메타데이터, 도구 스키마 문제 해결 및 dot 30분 조회는 사용자가 전달한 실제 연결 기록. 개인 메일은 재조회하지 않음. 공개 문서의 이전 연결 미완료 상태와 구분. 스키마 문제의 구체적 수정 원인은 미확인이라 추측하지 않음.
- 첨부 payload 다운로드/디코딩 없음. 크기 추정과 payload 디코딩을 구분. 실제 메일 내용/계정 주소/UUID/토큰/비밀번호/첨부파일명은 수록하지 않음.

## mail-mcp 설계 판단 보완

- 설계 판단 및 면접 문답은 사용자 요청으로 블로그 저장소 밖 개인 문서로 이동. 사이트에는 수록하거나 연결하지 않음. 2026-10-27 공식 요금/실행 제한 확인 기록은 개인 문서에 보관.
- 구성요소: Python >=3.11, mcp==2.3.0, Starlette Route/Request/Response 및 ASGI 미들웨어, stateless Streamable HTTP, 표준 imaplib/email/ssl을 지정 커밋에서 확인. Vercel/Supabase는 플랫폼/서비스로 분류.
- KST 08:00–22:00 매일 30분 dot 조회와 중요 메일만 기존 대화 알림은 전달된 승인 운영 기록. 스케줄을 생성하거나 수정하지 않음. 영속 큐/체크포인트/겹침 조회/중복 제거는 현재 서버 구현으로 주장하지 않음.
- 공식 근거 링크는 문서 각 비교 항목에 배치. Auth0 무료 플랜 존재와 당시 비용 우려를 구분. Mailopoly watch/webhook 기능과 일반 ChatGPT 자동 wake를 구분.
