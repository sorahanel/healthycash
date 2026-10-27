# 현재 환경 검증 결과

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
