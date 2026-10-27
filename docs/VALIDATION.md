# 현재 환경 검증 결과

## 카카오 동의 후 로그인 마무리 진단 · 2026-10-27

사용자가 카카오 동의 화면까지 이동한 뒤 앱에서 일반 오류 문구를 확인했습니다. 이후 **카카오 Client Secret은 활성화했지만 Netlify에는 등록하지 않았다**고 확인했습니다. 이 설정 누락은 제공자의 인증 결과 교환을 막을 수 있으므로, 사용 중인 REST API 키에 연결된 Client Secret을 `KAKAO_CLIENT_SECRET`으로 등록하도록 안내했습니다. 실제 운영 로그인 완료는 아직 확인하지 않았습니다.

콜백·Firebase 회원 생성·회원 저장·교환권·custom token·브라우저 로그인 실패를 구분하고, 사용자 화면에는 허용 목록의 짧은 확인 코드만 표시하도록 보완했습니다.

| 확인 | 결과 |
| --- | --- |
| `npm run test:server` | 17개 통과. 제공자 HTTP/JSON 오류, Client Secret 누락·등록 후 흐름, 콜백 단계 구분, 쿠키 정리, 실패 후 교환권 재사용 차단 포함 |
| `npm test` | 18개 통과. 확인 코드 표시, 알 수 없는 query 값 미표시, 주소에서 콜백 정보 제거 포함 |
| Auth 에뮬레이터 + 브라우저 | 로그인 마무리 오류 테스트 1개 통과. 교환 API 오류와 실제 Firebase SDK의 잘못된 custom token 거부를 화면의 확인 코드로 구분 |
| `npm run build` | TypeScript·운영 빌드 성공 |
| `npm run test:functions` | Netlify 서버 함수 7개 패키징 성공 |

위 단독 브라우저 테스트는 Authentication 에뮬레이터만 실행하고, 회원 조회·저장을 하지 않는 실패 경로를 검사했습니다. Firestore를 포함한 전체 로그인 에뮬레이터 테스트는 GitHub Actions의 검증 대상입니다. 제공자 응답을 대체한 재현 성공을 실제 카카오 로그인 완료로 간주하지 않습니다.

## 로그인 시작 오류 진단 · 2026-10-27

사용자가 운영 앱의 `auth-start?provider=kakao`에서 `auth_unavailable`, 이후 `server_error` 응답을 확인했습니다. 저장소 생성 여부·IAM 권한·서버 인증 실패를 운영 환경에서 구분할 수 있도록, Firebase 초기화와 OAuth 요청 저장 실패에 안전한 진단 이름을 추가했습니다. 운영 비밀키나 Firebase 관리 콘솔에는 접근하지 않았으며, 실제 운영 원인과 로그인 성공은 아직 확인하지 못했습니다.

사용자가 보낸 Firebase 콘솔 화면에서 `healthycash`의 `(default)` 데이터베이스가 존재하고 데이터 탭이 비어 있는 상태를 확인했습니다. 서버 환경변수의 실제 대상 프로젝트와 서비스 계정 접근 권한은 이 화면만으로 확인할 수 없습니다.

| 확인 | 결과 |
| --- | --- |
| `npm run test:server` | 기존 9개와 새 진단 테스트 4개, 총 13개 통과 |
| 저장 실패 처리 | 저장소 없음·권한·API 비활성화·인증 거부·선행조건·할당량·통신 등 11개 오류 입력에서 제공자 이동과 쿠키 발급 없이 종료 |
| 비밀값 보호 | 원본 오류·토큰·요청·비공개키 대신 고정된 진단 이름만 응답·로그에 포함되는지 확인 |
| 실제 Admin SDK 초기화 | 잘못된 PEM을 운영 함수 진입점에 입력했을 때 안전한 `firebase_credentials_invalid` 진단으로 변환 |
| `npm run test:functions` | Netlify 서버 함수 7개 패키징 성공 |
| `npm run build` | TypeScript 및 운영 빌드 성공 |

이 검증은 오류를 분류하고 안전하게 보여 주는 변경을 확인합니다. Firebase의 운영 설정을 대신 변경하거나 실제 카카오 로그인을 완료한 것은 아닙니다.

## 회원 인증 추가 · 2026-10-26

| 확인 | 결과 |
| --- | --- |
| `npm run build` | TypeScript·프로덕션 번들 성공, Firebase 번들 분리 |
| `npm run test:server` | 서버 테스트 9개 통과: state·쿠키 바인딩·재사용·만료·CSRF·프로필 필드·제공자 응답·비활성 계정 |
| `npm run test:functions` | Netlify 함수 7개 esbuild 패키징 성공 |
| 브라우저 시연·로그인 준비 화면 | 기존 15개 + 신규 2개 테스트, PC·모바일 화면 검증 |
| `npm run test:firebase` 로컬 실행 | 공식 Firestore 에뮬레이터 JAR 다운로드가 환경의 네트워크 제한으로 차단되어 실행 불가 |
| GitHub Actions | [실행 #2 성공](https://github.com/sorahanel/healthycash/actions/runs/40259724270), 커밋 `1f6d3ea`: 빌드·함수 패키징·전체 테스트 통과 |
| Firestore·Auth 에뮬레이터 | GitHub Actions에서 권한·트랜잭션·custom token 테스트 5개 통과 |
| 로그인 브라우저 흐름 | GitHub Actions에서 신규/재로그인·프로필 유지·계정 전환·취소/만료·API 권한 테스트 4개 통과 |
| 로컬 Auth 에뮬레이터 | 실제 Firebase SDK로 custom token 로그인·ID token 검증·위조/비활성 계정 거부·로그아웃 확인 |
| 실제 네이버·카카오 및 운영 Firebase 로그인 | 실제 프로젝트·제공자 키 설정 전이므로 미검증 |

에뮬레이터 테스트는 본인 단건 조회, 타인·미인증 접근 거부, 브라우저 쓰기 금지, 원자적 일회성 소비, 가입일·수정 프로필 보존, Firebase custom token, 로그인 유지·로그아웃을 검사합니다. 소셜 제공자 응답만 테스트용으로 대체합니다. 실제 서비스 검증은 [설정 안내](AUTH_SETUP.md)의 배포 후 확인 순서로 진행합니다.

2026-10-27에 제공된 Firebase 프로젝트 ID `healthycash`를 설정 예시에 반영했습니다. Spark 요금제에서 기본 배포가 유료 TTL 활성화를 요구하지 않도록 인덱스 설정을 정리했습니다. 운영 프로젝트에 대한 규칙 배포와 실제 제공자 로그인은 아직 수행하지 않았습니다.

같은 날 제공받은 Firebase 공개 웹 설정을 Netlify 운영 빌드에 반영했습니다. 웹 앱 ID는 `1:338718980944:web:e7de5936b40e8890e48a55`입니다. 서버 서비스 계정 및 제공자 비밀키는 포함하지 않습니다.

## 기존 시연 검증 · 2026-10-23

2026-10-23, Node.js 24.19.0, Chromium, `/workspace/healthycash` 기준입니다.

| 확인 | 결과 |
| --- | --- |
| `npm ci --cache /tmp/healthycash-npm-cache --no-audit --no-fund` | 성공 |
| `npm run build` | 타입 검사·프로덕션 번들 성공 |
| `npm test` | Playwright 15개 테스트 통과, 실패·건너뜀 없음 |
| 개발 서버 내부 요청 | 루트 HTML·진입 모듈·구강 일러스트 HTTP 200 |
| 320·375·390·768·1024·1440px 레이아웃 | 홈 가로 넘침 없음 |
| 모바일 주요 8개 화면 | 메뉴 전환·제목·가로 넘침 검사 통과 |
| 프로덕션 번들 Chromium 실행 | 홈 렌더링·걸음 추가·모바일 메뉴·병원 비공개 게이트 확인 |
| 프로덕션 브라우저 오류·정적 리소스 HTTP 실패 | 관찰되지 않음 |

테스트는 가상 보상·예시 거래와 현재 브라우저 범위를 검증합니다. 실제 의료·센서·결제·서버 보안 검증이나 모바일 스토어 심사를 의미하지 않습니다.

환경 설정의 `install_script`와 `start_skill` 초안 저장이 확인되었습니다. 외부 배포, 환경 발행, 새 작업으로의 복원 검증은 수행하지 않았습니다.
