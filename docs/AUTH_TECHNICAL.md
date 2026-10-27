# 회원 인증 기술 참고자료

클릭 순서대로 설정하려면 [처음 설정하는 분을 위한 안내](AUTH_SETUP.md)를 먼저 따라 하세요. 이 문서는 개발·운영 담당자가 구현과 자동 검증 방법을 확인할 때 사용하는 참고자료입니다.

## 1. 로그인과 회원 저장 흐름

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

## 2. 저장 범위와 접근 규칙

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

## 3. 개발과 검증

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

운영 웹 설정은 `netlify.toml`의 Production 빌드에만 적용됩니다. 로컬 `.env`에는 Firebase 웹 앱의 공개 설정 `apiKey`, `authDomain`, `projectId`, `appId`를 각각 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`로 입력합니다. 서버 비공개키에는 `VITE_` 접두사를 사용하지 않습니다. Firebase Authentication의 승인된 도메인에 개발에 사용할 `localhost` 또는 `127.0.0.1`도 등록합니다.

### 실제 배포 후 확인

1. `/.netlify/functions/auth-config`가 각 제공자의 준비 여부를 반환하는지 확인합니다. 이 응답에는 키가 없습니다.
2. 카카오·네이버 각각 신규 로그인 → Firebase Auth 사용자 및 Firestore 문서 1개 생성 확인.
3. 마이페이지 수정 → 새로고침 → 로그아웃 → 재로그인 후 UID·가입일·수정한 프로필 유지 확인.
4. 다른 회원으로 로그인했을 때 이전 회원정보가 보이지 않는지 확인.
5. 로그인 취소·새로고침·다른 브라우저에서 콜백 재사용 시 다시 로그인 안내 확인.
6. HC 잔액·혈압 수치가 Firestore 회원 문서에 없는지 확인.

회원 서비스 공개 전에는 서비스 운영 주체, 보유 기간, 문의·탈퇴 방법을 담은 실제 개인정보처리방침을 연결하세요. 로그인 화면의 수집 안내는 법적 고지를 대체하는 문서가 아닙니다.

## 4. Firestore 규칙·인덱스 배포와 만료 문서 정리

아래 명령은 프로젝트 폴더에서 실행합니다. 브라우저에서 본인의 Firebase 관리 계정으로 로그인하고 대상 프로젝트가 `healthycash`인지 확인합니다.

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project healthycash
```

콘솔에서 규칙만 게시해도 현재 로그인 기능에 필요한 접근 제한은 적용됩니다. `firestore.indexes.json`의 `expiresAt` 인덱스 제외 설정은 위 명령으로 함께 적용할 수 있습니다.

설정 당시 확인한 Firebase 프로젝트는 **Spark 무료 요금제**입니다. 기본 설정은 결제 연결이 필요한 Firestore TTL 정책을 활성화하지 않습니다. `firestore.indexes.json`은 인증 상태의 만료 시각 필드에 불필요한 인덱스를 만들지 않도록 설정합니다. **인증 만료와 재사용 차단은 서버가 직접 검사하고, 사용한 state·교환권은 트랜잭션에서 삭제합니다.** 중간에 취소하거나 닫아서 남은 만료 문서는 Firebase 콘솔이나 승인된 서버 정리 작업으로 주기적으로 삭제해야 합니다. 추후 자동 TTL 정리를 사용할 때는 요금제·과금 조건을 확인하고 `oauthFlows`, `loginTickets`의 `expiresAt` 필드에 별도로 활성화합니다.

서비스 계정에는 필요한 Firebase Authentication 및 Firestore 작업 권한만 부여합니다. 브라우저 Firebase API 키는 웹 설정이며, 서버의 비공개키와는 별개입니다. 프로젝트 ID는 브라우저와 서버가 같아야 합니다.

## 5. 운영과 미리보기 환경

`netlify.toml`의 빌드 환경변수는 Functions 실행 시 사용할 서버 환경변수를 대신하지 않습니다. `APP_BASE_URL`, `FIREBASE_PROJECT_ID`를 포함한 서버용 값은 Netlify 환경변수에 등록합니다. 브라우저의 공개 설정 4개에만 `VITE_` 접두사를 사용합니다.

`APP_BASE_URL`에는 경로·쿼리 없이 고정된 실제 사이트 주소를 넣습니다. 요청 헤더나 사용자 입력으로 콜백 주소를 만들지 않습니다. 미리보기 배포에 운영 로그인 키를 공유하지 않습니다. 미리보기 로그인은 별도로 등록한 고정 주소와 별도 환경 설정이 필요합니다.

현재 코드는 입력한 PEM 키로 custom token에 서명합니다. Firebase 서비스 계정에는 필요한 Firebase Authentication 및 Firestore 작업 권한을 부여하고, 권한 오류를 해결하려고 불필요한 프로젝트 소유자 권한을 추가하지 않습니다.

공식 문서: [Firebase 맞춤 인증](https://firebase.google.com/docs/auth/web/custom-auth?hl=ko) · [카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api) · [네이버 로그인](https://developers.naver.com/docs/login/api/api.md)

## 6. 로그인 시작 실패 진단

`auth-start`에서 Firestore의 `oauthFlows` 문서 생성이 실패하면 503 응답의 `error: server_error`와 함께 고정된 `diagnostic` 이름을 반환합니다. SDK 초기화 실패도 `auth_unavailable`과 고정된 진단 이름을 반환합니다. 성공한 로그인 흐름과 state·브라우저 쿠키 검증은 그대로 유지합니다. 저장 실패 시 제공자 페이지로 리다이렉트하거나 로그인 쿠키를 발급하지 않습니다.

진단 분류는 SDK의 허용 목록 오류 코드, Google 토큰 응답의 알려진 오류 이름, 알려진 인증 실패·API 비활성화 표시만 사용합니다. 숫자 gRPC 오류 5·7·16·9·8·4·14를 각각 저장소 찾기·권한·인증·선행조건·할당량·통신 관련 범주로 구분합니다. 분류는 원인 범위를 좁히기 위한 것으로, 예를 들어 `firestore_not_found`만으로 잘못된 프로젝트 ID와 데이터베이스 미생성을 구분할 수는 없습니다.

서버 로그에는 `event: auth_setup_failure`, 고정된 `stage`, 고정된 `diagnostic`만 남깁니다. 원본 오류 메시지·stack·metadata·요청·토큰·회원 ID·문서 경로·환경변수는 출력하지 않습니다. `auth-config`는 계속 설정값 존재 여부만 반환하며, 실제 Firebase 접속을 검증하는 엔드포인트가 아닙니다.

재현 테스트는 `tests/server/diagnostics.test.mjs`에서 실행합니다. 저장 실패가 인증을 진행시키지 않는지, 실제 Firebase Admin SDK의 잘못된 PEM이 안전한 진단으로 바뀌는지, 응답과 로그에 민감한 테스트 문자열이 없는지 확인합니다.
