# Firebase · 카카오 · 네이버 회원 연동

현재 배포 주소: https://healthycashsh.netlify.app/

연결할 Firebase 프로젝트: [`healthycash`](https://console.firebase.google.com/project/healthycash/overview?hl=ko). `.firebaserc`와 환경변수 예시는 이 프로젝트 기준입니다. 테스트는 별도의 `demo-healthycash` 에뮬레이터 프로젝트를 명시적으로 사용합니다.

코드는 로그인·회원 저장 기능을 포함합니다. 실제 계정과 비밀키는 저장소에 없으므로, 아래 콘솔 설정과 Firestore 규칙 배포 후 Netlify를 다시 배포해야 로그인 버튼이 활성화됩니다. 환경변수가 없는 상태에서도 기존 시연은 동작합니다.

## 1. Firebase 프로젝트

지금 Authentication의 로그인 방법 목록에 보이는 **GitHub는 이용자의 GitHub 계정 로그인**입니다. GitHub 코드 저장소나 Netlify 배포 권한을 연결하는 설정이 아닙니다. 이번 구현의 네이버·카카오 로그인은 서버에서 Firebase custom token을 발급하므로, 이 목록에서 GitHub·OpenID Connect·SAML 제공업체를 추가할 필요가 없습니다.

1. 이미 만든 [`healthycash` 프로젝트](https://console.firebase.google.com/project/healthycash/overview?hl=ko)를 엽니다.
2. [프로젝트 설정 → 일반 → 내 앱](https://console.firebase.google.com/project/healthycash/settings/general?hl=ko)으로 이동합니다. 웹 앱이 없으면 **웹 앱 `</>`**을 선택하고 닉네임을 `healthycash-web` 등으로 등록합니다. 현재 Netlify를 사용하므로 Firebase Hosting 연결은 선택하지 않아도 됩니다. SDK 설정의 `firebaseConfig`에서 `apiKey`, `authDomain`, `projectId`, `appId`를 확인합니다. 이 웹 설정은 공개 가능한 값입니다. 서비스 계정 비공개키와는 다릅니다.
3. Authentication을 시작하고 설정 → 승인된 도메인에 `healthycashsh.netlify.app`을 추가합니다. 로컬 개발에는 `localhost`, `127.0.0.1`을 명시적으로 추가합니다.
4. Firestore Database를 **프로덕션 모드**로 생성합니다. 실제 운영 대상에 맞는 위치(예: 서울 `asia-northeast3`)를 선택합니다. 데이터베이스 위치는 나중에 간단히 변경할 수 없으므로 확인합니다.
5. 프로젝트 설정 → 서비스 계정 → Firebase Admin SDK에서 서버용 비공개키를 준비합니다. JSON의 `project_id`, `client_email`, `private_key`를 서버 환경변수에 넣습니다. JSON 파일 자체를 저장소에 넣지 않습니다.
6. Firebase CLI에 본인 계정으로 로그인하고 `healthycash` 프로젝트에 규칙을 배포합니다.

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project healthycash
```

로컬 CLI에서 권한이 없으면 Firebase 콘솔의 Firestore → 규칙에서 `firestore.rules` 내용을 게시할 수 있습니다.

제공해 주신 콘솔 화면은 **Spark 무료 요금제**입니다. 기본 설정은 결제 연결이 필요한 Firestore TTL 정책을 활성화하지 않습니다. `firestore.indexes.json`은 인증 상태의 만료 시각 필드에 불필요한 인덱스를 만들지 않도록 설정합니다. **인증 만료와 재사용 차단은 서버가 직접 검사하고, 사용한 state·교환권은 트랜잭션에서 삭제합니다.** 중간에 취소하거나 닫아서 남은 만료 문서는 Firebase 콘솔이나 승인된 서버 정리 작업으로 주기적으로 삭제해야 합니다. 추후 자동 TTL 정리를 사용할 때는 요금제·과금 조건을 확인하고 `oauthFlows`, `loginTickets`의 `expiresAt` 필드에 별도로 활성화합니다.

서비스 계정에는 필요한 Firebase Authentication 및 Firestore 작업 권한만 부여합니다. 브라우저 Firebase API 키는 웹 설정이며, 서버의 비공개키와는 별개입니다. 프로젝트 ID는 브라우저와 서버가 같아야 합니다.

## 2. 카카오 설정

[카카오 개발자센터](https://developers.kakao.com/)에서 애플리케이션을 생성합니다.

- 웹 플랫폼 사이트 도메인: `https://healthycashsh.netlify.app`
- 카카오 로그인: 활성화
- Redirect URI: `https://healthycashsh.netlify.app/.netlify/functions/kakao-callback`
- 동의항목: 닉네임. 이 구현은 이메일·전화번호·프로필 사진을 저장하지 않습니다. 닉네임을 받지 못하면 `헬시 이웃`으로 가입합니다.
- REST API 키 → `KAKAO_REST_API_KEY`
- Client Secret 검증을 활성화했다면 해당 값 → `KAKAO_CLIENT_SECRET`

REST API의 인가 코드 흐름을 사용합니다. JavaScript 키와 어드민 키를 대신 넣지 않습니다. 비즈 앱 여부와 동의항목에 따라 카카오에서 요구하는 절차를 진행합니다.

## 3. 네이버 설정

[네이버 개발자센터](https://developers.naver.com/)에서 네이버 로그인을 사용하는 애플리케이션을 등록합니다.

- 서비스 URL: `https://healthycashsh.netlify.app`
- Callback URL: `https://healthycashsh.netlify.app/.netlify/functions/naver-callback`
- 필요한 제공 정보: 닉네임. 이름·이메일·연락처는 이 구현에 필요하지 않습니다.
- Client ID → `NAVER_CLIENT_ID`
- Client Secret → `NAVER_CLIENT_SECRET`

개발 단계에는 테스트 계정으로 확인합니다. 일반 사용자에게 공개하려면 네이버의 서비스 적용·검수 절차를 완료합니다.

네이버와 카카오 계정은 별도 회원입니다. 같은 이메일이나 닉네임으로 자동 병합하지 않습니다. 회원 UID는 `제공자_제공자회원ID의SHA256` 형식이므로 동일 제공자로 재로그인하면 같은 UID를 사용합니다. 제공자 토큰과 원본 제공자 회원 ID는 Firestore에 저장하지 않습니다.

## 4. Netlify 환경변수

프로젝트 설정 → Environment variables에 `.env.example`을 참고해 값을 등록합니다. 비밀값은 채팅·GitHub·프런트엔드 코드에 넣지 않습니다.

| 변수 | 값의 출처 | 적용 범위 |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase 웹 앱 설정 `apiKey` | Builds |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` | Builds |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` | Builds |
| `VITE_FIREBASE_APP_ID` | `appId` | Builds |
| `APP_BASE_URL` | `https://healthycashsh.netlify.app` | Functions |
| `FIREBASE_PROJECT_ID` | 서비스 계정 `project_id` | Functions |
| `FIREBASE_CLIENT_EMAIL` | 서비스 계정 `client_email` | Functions |
| `FIREBASE_PRIVATE_KEY` | 서비스 계정 PEM 비공개키 | Functions / 비밀값 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 | Functions |
| `KAKAO_CLIENT_SECRET` | 카카오 시크릿, 활성화한 경우 | Functions / 비밀값 |
| `NAVER_CLIENT_ID` | 네이버 Client ID | Functions |
| `NAVER_CLIENT_SECRET` | 네이버 Client Secret | Functions / 비밀값 |

Netlify에서 적용 범위를 나누는 옵션이 없으면 해당 배포에서 함수와 빌드가 읽을 수 있도록 설정합니다. `VITE_` 접두사는 표의 웹 설정 4개에만 붙입니다. 비공개키는 실제 줄바꿈이 있는 PEM 또는 리터럴 `\n`을 포함한 문자열 모두 처리합니다.

`APP_BASE_URL`에는 경로·쿼리 없이 고정된 실제 사이트 주소를 넣습니다. 요청 헤더나 사용자 입력으로 콜백 주소를 만들지 않습니다. Production 배포에서 이 값을 사용하고, 미리보기 배포에 운영 로그인 키를 자동으로 공유하지 마세요. 미리보기 로그인은 별도로 등록한 고정 주소와 별도 환경 설정이 필요합니다.

변경 후 Netlify에서 재배포합니다. 수동으로 `dist`만 업로드하면 서버 함수가 배포되지 않으므로 **GitHub 연결 빌드 또는 Netlify CLI 배포**를 사용합니다. `netlify.toml`이 Functions 디렉터리와 SPA 경로를 지정합니다.

## 5. 로그인과 회원 저장 흐름

```text
로그인 버튼 → auth-start → 제공자 로그인/동의
           → kakao-callback 또는 naver-callback
           → /auth/complete → auth-exchange
           → Firebase signInWithCustomToken → 본인 Firestore 문서 조회
```

- `auth-start`는 서로 다른 난수 `state`와 브라우저 바인딩 쿠키를 생성합니다. `state`의 해시와 쿠키의 해시를 Firestore에 보관하며 요청은 10분 후 만료됩니다.
- 콜백은 제공자·쿠키·state·만료를 검증하고 Firestore 트랜잭션에서 state를 한 번만 소비합니다. 이후 서버가 제공자에게 코드를 교환하고 사용자 정보 API로 회원 ID를 확인합니다.
- 서버가 Firebase Auth 회원과 `users/{uid}` 문서를 준비합니다. 최초 가입일을 유지하고 재로그인에서는 `lastLoginAt`만 갱신합니다. 직접 수정한 닉네임·동네를 소셜 기본값으로 덮어쓰지 않습니다.
- 콜백은 60초짜리 일회용 교환권을 **HttpOnly·Secure·SameSite=Lax·Path=/** 쿠키로 전달하고 고정된 `/auth/complete`로 이동합니다. 쿠키에 Firebase 토큰이나 제공자 토큰을 담지 않습니다.
- 브라우저의 같은 출처 POST 요청에서만 교환권을 소비하고 Firebase custom token을 응답 본문으로 받습니다. custom token을 URL·리다이렉트 쿼리·앱 자체 localStorage에 넣지 않습니다. 이후 로그인 지속성은 Firebase SDK가 관리합니다.
- 프로필 변경은 Firebase ID token을 서버가 **폐기 여부까지 검증**한 다음, 토큰의 UID 문서만 수정합니다. 닉네임과 지정된 동네만 수정 가능합니다. UID·가입일·제공자·잔액 등 추가 필드는 거부합니다.
- 로그아웃은 Firebase SDK의 브라우저 세션과 인증 쿠키를 지웁니다. 모든 기기 강제 로그아웃·계정 연결·회원 탈퇴는 별도 기능입니다.

OAuth 제공자가 보내는 일시적인 인가 코드는 표준 콜백 쿼리에 포함됩니다. 최종 앱 주소에는 인가 코드·Firebase 토큰·교환권이 남지 않습니다. 함수 코드에서 토큰이나 콜백 전문을 로그로 출력하지 않습니다.

## 6. 저장 범위와 접근 규칙

```text
users/{uid}
  uid, provider, nickname, neighborhood
  createdAt, updatedAt, lastLoginAt

oauthFlows/{stateHash}       # 서버 전용, 만료 10분
loginTickets/{ticketHash}    # 서버 전용, 만료 60초
```

- Firestore 클라이언트: 로그인한 본인 문서의 단건 조회만 가능. 회원 목록 조회와 모든 쓰기 불가.
- 서버 Admin SDK: 인증 검증 후 회원 생성·수정. 보안 규칙을 우회하는 서버 권한이므로 서버 키를 외부에 노출하지 않습니다.
- `healthycash-demo-v1`의 예시 닉네임·HC·XP·미션·쿠폰을 서버에 전송하는 코드는 없습니다. 홈·설정의 시연 프로필과 마이페이지의 실제 프로필은 분리되어 있습니다.
- 혈압·검사 수치는 계속 현재 페이지 메모리에만 보관합니다. 로그인 계정이 바뀌거나 로그아웃하면 메모리의 기록·동의를 지웁니다. 서버 건강정보 저장과 실제 HC 원장은 구현 대상이 아닙니다.
- 운영 대시보드는 공개된 **샘플 데이터 시연**입니다. 회원 목록이나 실제 관리자 기능을 제공하지 않습니다.

## 7. 개발과 검증

```bash
npm ci
npm run build
npm run test:server   # OAuth 바인딩·위조·재사용·만료·서버 프로필 검증
npm test             # 기존 시연 + 설정 없는 로그인 화면
npm run test:auth    # Firebase 에뮬레이터 규칙/트랜잭션 + 브라우저 로그인
```

`test:auth`는 Node 24, Java 21, Chromium 및 최초 실행 시 Firestore 에뮬레이터 다운로드가 필요합니다. `demo-healthycash` 테스트 프로젝트만 사용하고 실제 계정 키는 필요하지 않습니다. Playwright 브라우저가 없다면 `npx playwright install chromium`으로 설치하고 해당 환경의 `CHROMIUM_PATH`를 지정합니다. GitHub Actions에서는 기본 Playwright Chromium을 사용합니다.

에뮬레이터 브라우저 테스트는 **소셜 제공자의 응답만 대체**합니다. 서버 핸들러·Firebase custom token 로그인·로그인 유지·로그아웃·Firestore 조회·수정·접근 규칙은 실제 SDK와 에뮬레이터를 사용합니다. 테스트용 소셜 인증 어댑터는 `tests/`에만 있으며 배포 함수에는 포함되지 않습니다. 이를 실제 네이버·카카오 계정 로그인 성공으로 간주하지 않습니다.

실제 로컬 연동은 `.env.example`을 `.env`로 복사해 비밀값을 본인 컴퓨터에서 입력하고 `npm run dev:netlify`를 사용합니다. `APP_BASE_URL=http://localhost:8888`, `NETLIFY_DEV=true`로 설정하고 각 제공자에 동일한 localhost 콜백 주소를 별도로 등록해야 합니다. 일반 `npm run dev`는 프런트엔드만 실행합니다. `.env`는 Git에서 제외됩니다.

### 실제 배포 후 확인

1. `/.netlify/functions/auth-config`가 각 제공자의 준비 여부를 반환하는지 확인합니다. 이 응답에는 키가 없습니다.
2. 카카오·네이버 각각 신규 로그인 → Firebase Auth 사용자 및 Firestore 문서 1개 생성 확인.
3. 마이페이지 수정 → 새로고침 → 로그아웃 → 재로그인 후 UID·가입일·수정한 프로필 유지 확인.
4. 다른 회원으로 로그인했을 때 이전 회원정보가 보이지 않는지 확인.
5. 로그인 취소·새로고침·다른 브라우저에서 콜백 재사용 시 다시 로그인 안내 확인.
6. HC 잔액·혈압 수치가 Firestore 회원 문서에 없는지 확인.

회원 서비스 공개 전에는 서비스 운영 주체, 보유 기간, 문의·탈퇴 방법을 담은 실제 개인정보처리방침을 연결하세요. 로그인 화면의 수집 안내는 법적 고지를 대체하는 문서가 아닙니다.

## 자주 발생하는 문제

| 증상 | 확인할 설정 |
| --- | --- |
| 로그인 버튼이 비활성화됨 | 웹 Firebase 환경변수 4개와 Functions 환경변수, 변경 후 재빌드 |
| 카카오 Redirect URI 오류 | 실제 주소·프로토콜·함수 경로가 등록값과 완전히 같은지 |
| 네이버 테스트 계정만 로그인됨 | 테스트 사용자 등록 및 서비스 검수 상태 |
| 로그인 후 회원정보 조회 거부 | Firestore 생성 여부, 규칙 게시 여부, 서버/클라이언트 프로젝트 ID 일치 |
| `auth_unavailable` | 서비스 계정 PEM 줄바꿈·권한, APP_BASE_URL, 운영 환경에 에뮬레이터 변수 미설정 |
| 재사용·만료 안내 | 새 로그인 버튼에서 다시 시작. 이전 콜백 주소는 북마크하지 않음 |

공식 문서: [Firebase 맞춤 인증](https://firebase.google.com/docs/auth/web/custom-auth?hl=ko) · [카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api) · [네이버 로그인](https://developers.naver.com/docs/login/api/api.md)
