# 헬시캐시 로그인 연결하기 — 처음부터 따라 하는 안내서

이 안내서는 **브라우저에서 클릭하고 복사·붙여넣기 하는 방법**으로 설명합니다. 명령어를 입력하거나 프로그램을 설치하지 않아도 됩니다.

목표는 [헬시캐시 앱](https://healthycashsh.netlify.app/)에서 카카오·네이버로 로그인하고, 내 닉네임과 동네를 저장하는 것입니다. 앱 코드와 Firebase 공개 웹 설정은 GitHub에 반영되어 있습니다. 아래 설정을 마친 뒤 실제 로그인을 확인해야 연결 완료입니다.

**지금 ‘프로젝트 설정 → 서비스 계정 → Firebase Admin SDK’ 화면을 보고 있다면 [3단계: 비공개키 받기](#3단계-firebase에서-서버용-비공개키-받기)부터 진행하세요.** 이미 끝낸 단계는 다시 하지 않아도 됩니다.

진행 순서:

1. [로그인 도메인 확인](#1단계-로그인에-사용할-도메인-확인하기)
2. [Firestore 생성과 규칙 게시](#2단계-회원정보를-보관할-firestore-만들기)
3. [Firebase 비공개키 받기](#3단계-firebase에서-서버용-비공개키-받기)
4. [Netlify에 Firebase 값 4개 입력](#4단계-netlify에-firebase-설정값-넣기)
5. [카카오 로그인 연결](#5단계-카카오-로그인-연결하기)
6. [네이버 로그인 연결](#6단계-네이버-로그인-연결하기)
7. [Netlify 재배포](#7단계-netlify에서-다시-배포하기)
8. [로그인과 회원정보 저장 확인](#8단계-정말-연결됐는지-확인하기)

## 먼저 알아둘 말 5개

| 화면에서 보이는 말 | 쉽게 설명하면 |
| --- | --- |
| Firebase Authentication | 누가 로그인했는지 확인하는 곳 |
| Firestore Database | 회원정보를 보관하는 보관함 |
| Netlify Functions | 로그인과 회원정보 저장을 처리하는 서버 프로그램 |
| 환경변수 / Environment variables | 서버 프로그램이 읽는 설정. **이름(Key)**과 **내용(Value)** 한 쌍으로 입력 |
| 비공개키 / Client Secret | 서버가 사용하는 비밀 열쇠. Netlify 설정에만 입력하고 채팅·GitHub에는 올리지 않음 |

작업할 사이트는 다음과 같습니다. 브라우저 탭을 각각 열어 두면 편합니다.

| 사이트 | 할 일 |
| --- | --- |
| [Firebase](https://console.firebase.google.com/project/healthycash/overview?hl=ko) | 회원 보관함 만들기, 접근 규칙 설정, 비공개키 받기 |
| [Netlify](https://app.netlify.com/) | Firebase와 소셜 로그인 설정값 넣기, 다시 배포하기 |
| [카카오 개발자센터](https://developers.kakao.com/) | 카카오 로그인 앱 등록 |
| [네이버 개발자센터](https://developers.naver.com/) | 네이버 로그인 앱 등록 |

이 문서에서 사용하는 이름과 주소는 아래와 같습니다.

| 항목 | 입력할 내용 |
| --- | --- |
| Firebase 프로젝트 ID | `healthycash` |
| 실제 서비스 주소 | `https://healthycashsh.netlify.app` |
| GitHub 저장소 | [sorahanel/healthycash](https://github.com/sorahanel/healthycash) |

메뉴 이름은 서비스 화면 개편에 따라 조금 다를 수 있습니다. 한글과 영어 이름을 함께 적었으니 비슷한 이름을 찾아 주세요.

## 1단계: 로그인에 사용할 도메인 확인하기

1. [Firebase의 healthycash 프로젝트](https://console.firebase.google.com/project/healthycash/overview?hl=ko)를 엽니다.
2. 왼쪽에서 **Authentication**을 누릅니다.
3. 위쪽 **설정** 탭을 누릅니다.
4. **승인된 도메인**을 누릅니다.
5. 목록에 `healthycashsh.netlify.app`이 있는지 확인합니다.
6. 없다면 **도메인 추가**를 누르고 아래 값만 입력한 뒤 저장합니다.

```text
healthycashsh.netlify.app
```

이 칸에는 `https://`나 끝의 `/`를 넣지 않습니다.

**완료 확인:** 목록에 `healthycashsh.netlify.app`이 보이면 됩니다. 보내주신 화면에서는 이미 등록되어 있었습니다.

`localhost`는 내 컴퓨터에서 앱을 실행해 테스트할 때 쓰는 주소입니다. ‘로컬 개발’이라는 별도 메뉴를 찾을 필요는 없습니다. 지금은 Netlify에 배포한 앱을 연결하므로 localhost 설정을 추가로 할 필요가 없습니다.

Authentication의 ‘로그인 방법’ 탭에서 **GitHub를 켤 필요도 없습니다.** 그 버튼은 ‘이용자가 GitHub 계정으로 로그인하는 기능’을 뜻합니다. 이번 앱은 카카오·네이버 로그인 결과를 서버가 확인하고 Firebase에 전달하도록 구현되어 있습니다.

## 2단계: 회원정보를 보관할 Firestore 만들기

### 2-1. 데이터베이스 생성하기

1. [Firestore 화면 바로 열기](https://console.firebase.google.com/project/healthycash/firestore?hl=ko)를 누릅니다.
2. 메뉴로 찾으려면 Firebase 왼쪽 **데이터베이스 및 스토리지 → Firestore Database**로 이동합니다. 화면에 따라 **빌드(Build)** 아래에 있을 수 있습니다.
3. **데이터베이스 만들기**를 누릅니다. 이미 **데이터 / 규칙 / 색인** 등의 탭이 보이면 만들어진 상태이므로 2-2로 넘어갑니다.
4. 에디션을 묻는 화면이 나오면 **Standard**를 선택합니다.
5. 데이터베이스 ID는 **`(default)`**로 둡니다. 현재 앱은 이 기본 데이터베이스를 사용합니다.
6. 위치는 한국에서 사용할 서비스라면 **서울 `asia-northeast3`**를 선택합니다. 위치는 만든 뒤 쉽게 바꿀 수 없으므로 확인하고 진행합니다.
7. 보안 설정을 묻는 화면에서 **프로덕션 모드로 시작**을 선택합니다.
8. **만들기 / 사용 설정**을 눌러 생성이 끝날 때까지 기다립니다.

이미 데이터베이스를 만들었다면 위치를 맞추려고 삭제하거나 다시 만들지 마세요. 기존 데이터베이스를 사용합니다.

### 2-2. 회원정보 접근 규칙 게시하기

프로덕션 모드의 초기 규칙은 앱의 접근을 막습니다. 아래 규칙으로 바꾸면 **로그인한 사람이 자기 회원정보만 읽을 수 있게** 됩니다. 회원정보 생성·수정은 인증을 확인하는 서버가 처리합니다.

1. Firestore 위쪽 **규칙(Rules)** 탭을 누릅니다.
2. 기존 코드가 보이는 **편집 영역 안**을 클릭합니다.
3. 편집 영역의 기존 내용을 모두 선택하고 지웁니다.
4. 아래 코드를 첫 줄부터 마지막 줄까지 복사해 붙여넣습니다. 코드 상자의 복사 버튼을 사용해도 됩니다.
5. **게시(Publish)**를 누릅니다. 붙여넣기만 하고 탭을 닫으면 적용되지 않습니다.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow get: if request.auth != null && request.auth.uid == uid;
      allow list, create, update, delete: if false;
    }
    // Only the Admin SDK in trusted server functions may use authentication state.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

이 코드는 저장소의 [firestore.rules](../firestore.rules)와 같습니다. 오류가 난다고 `allow read, write: if true;`로 바꾸지 마세요. 회원정보가 공개될 수 있습니다.

**완료 확인:** 게시가 완료되고 규칙 탭에 위 내용이 보이면 됩니다. **데이터 탭은 비어 있어도 정상**입니다. `users`라는 보관함은 첫 로그인 때 서버가 만듭니다. 직접 ‘컬렉션 시작’을 누를 필요는 없습니다.

## 3단계: Firebase에서 서버용 비공개키 받기

### 3-1. 지금 보고 있는 화면에서 다운로드하기

1. [프로젝트 설정 → 서비스 계정](https://console.firebase.google.com/project/healthycash/settings/serviceaccounts/adminsdk?hl=ko)을 엽니다.
2. 왼쪽 **Firebase Admin SDK**가 선택되어 있는지 확인합니다.
3. 화면 아래쪽 파란색 **새 비공개 키 생성** 버튼을 누릅니다.
4. 확인 창의 안내를 읽고 **키 생성**을 누릅니다.
5. 이름이 `.json`으로 끝나는 파일이 컴퓨터에 내려받아집니다. 보통 **다운로드** 폴더에 있습니다.

화면의 **Node.js / 자바 / Python / Go**는 예제 코드를 보여 주는 선택입니다. **Python이 선택되어 있어도 JSON 파일을 받을 수 있습니다.** 검은색·회색 코드 상자의 프로그램 코드를 복사하거나 실행할 필요는 없습니다.

이미 이 프로젝트의 비공개키 JSON 파일을 안전하게 보관하고 있다면 그 파일을 사용해도 됩니다. 같은 작업을 할 때마다 새 키를 만들 필요는 없습니다.

### 3-2. JSON 파일을 메모장으로 열기

Windows에서는 다음 순서로 엽니다.

1. **파일 탐색기 → 다운로드** 폴더를 엽니다.
2. 방금 받은 `.json` 파일을 찾습니다.
3. 파일을 마우스 오른쪽 버튼으로 누릅니다.
4. **연결 프로그램 → 메모장**을 선택합니다. 메모장이 바로 안 보이면 **다른 앱 선택**에서 찾습니다.
5. 파일은 수정하지 말고 열어 둡니다. 다음 단계에서 세 항목의 값만 복사합니다.

Mac이라면 Finder의 다운로드 폴더에서 파일을 오른쪽 클릭하고 **다음으로 열기 → 텍스트 편집기**를 선택합니다.

파일에는 여러 항목이 있습니다. 필요한 것은 **`project_id`, `client_email`, `private_key` 세 개**입니다. 아래는 모양을 설명하는 예시이며, 이메일과 키는 반드시 본인 파일에서 복사합니다.

```json
{
  "project_id": "healthycash",
  "client_email": "firebase-adminsdk-xxxxx@healthycash.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n여기에_본인의_긴_키가_있음\n-----END PRIVATE KEY-----\n"
}
```

**완료 확인:** 메모장에서 위 세 항목을 찾을 수 있으면 준비됐습니다. 파일 전체를 Netlify에 업로드하는 방식이 아닙니다.

이 파일은 서버용 비밀 열쇠입니다. **채팅에 첨부하거나 GitHub에 올리지 말고**, 본인만 접근할 수 있는 곳에 보관하세요. 공용 컴퓨터나 자동 공유 폴더에 남겨 두지 마세요.

## 4단계: Netlify에 Firebase 설정값 넣기

### 4-1. 입력할 화면 찾기

1. [Netlify](https://app.netlify.com/)에 로그인합니다.
2. **Projects** 또는 **Sites** 목록을 엽니다.
3. 주소가 **`healthycashsh.netlify.app`**인 프로젝트를 누릅니다.
4. **Project configuration** 또는 **Site configuration**을 누릅니다.
5. **Environment variables**를 찾습니다. 화면에 따라 **Build & deploy** 아래에 있습니다.
6. **Add a variable → Add a single variable**을 누릅니다. ‘환경변수 추가’ 또는 ‘새 변수’라고 표시될 수도 있습니다.

이제 두 칸을 채우게 됩니다.

| 입력 칸 | 넣을 내용 |
| --- | --- |
| **Key** | 아래 안내의 대문자 이름. 예: `FIREBASE_PROJECT_ID` |
| **Value** | 그 이름에 해당하는 실제 값. 예: `healthycash` |

적용 범위 선택이 나오면 다음처럼 설정합니다.

- **Scopes:** 서버에서 읽도록 **Functions**를 포함합니다. 범위 선택 기능이 없다면 기본 범위를 사용합니다.
- **Deploy context:** 실제 서비스에 적용할 **Production**을 선택합니다. **Different value for each deploy context**라는 선택지가 있다면 그것을 선택하고 Production 칸에 값을 넣습니다. 운영 비밀키를 Deploy Previews나 Branch deploys에도 복사하지 않습니다.
- **Contains secret values / Secret:** 비밀값 표시 옵션이 있으면 `FIREBASE_PRIVATE_KEY`와 각 로그인 서비스의 `CLIENT_SECRET`에 켭니다.

각 변수를 입력한 다음 **Create variable / Save**를 누릅니다. 아래 4개를 **하나씩 따로** 추가하세요. 같은 이름이 이미 있다면 새로 만들지 말고 그 항목을 편집합니다.

### 4-2. 첫 번째 변수: 서비스 주소

**Key** 칸에 입력:

```text
APP_BASE_URL
```

**Value** 칸에 입력:

```text
https://healthycashsh.netlify.app
```

저장합니다. 이 값은 앞의 ‘승인된 도메인’과 달리 **`https://`까지 포함**합니다. 뒤에 `/auth` 같은 경로를 붙이지 않습니다.

### 4-3. 두 번째 변수: Firebase 프로젝트 ID

**Key** 칸에 입력:

```text
FIREBASE_PROJECT_ID
```

**Value** 칸에 입력:

```text
healthycash
```

메모장의 `"project_id": "healthycash"`와 같은지 확인하고 저장합니다. 다른 프로젝트 이름이 적혀 있다면 Firebase에서 healthycash 프로젝트의 키를 받았는지 확인합니다.

### 4-4. 세 번째 변수: 서비스 계정 이메일

**Key** 칸에 입력:

```text
FIREBASE_CLIENT_EMAIL
```

**Value**에는 메모장 JSON 파일의 **`client_email` 값**을 복사합니다.

예를 들어 파일에 다음처럼 적혀 있다면:

```text
"client_email": "firebase-adminsdk-xxxxx@healthycash.iam.gserviceaccount.com",
```

두 번째 따옴표 묶음 **안의 이메일 주소만** 복사합니다. `"client_email":`, 양 끝의 `"`, 마지막 `,`는 빼고 붙여넣은 뒤 저장합니다.

여기에는 본인의 Gmail 주소를 넣는 것이 아닙니다. **JSON 파일의 서비스 계정 이메일**을 사용합니다.

### 4-5. 네 번째 변수: 비공개키

**Key** 칸에 입력:

```text
FIREBASE_PRIVATE_KEY
```

**Value**에는 메모장 JSON 파일의 **`private_key` 값 전체**를 복사합니다.

1. 메모장에서 `"private_key":`를 찾습니다. `private_key_id`와 이름이 비슷하니 구분하세요.
2. 값의 시작인 `-----BEGIN PRIVATE KEY-----`부터 선택합니다.
3. 긴 중간 내용과 `-----END PRIVATE KEY-----` 뒤의 마지막 `\n`까지 모두 선택합니다.
4. 값 앞뒤를 감싼 큰따옴표 `"`와 줄 끝 쉼표 `,`는 선택하지 않습니다.
5. 복사해서 Netlify **Value** 칸에 붙여넣고 저장합니다.

붙여넣을 값의 모양은 아래와 같습니다. 아래의 설명용 문장을 실제 값으로 넣지는 마세요.

```text
-----BEGIN PRIVATE KEY-----\n본인_JSON_파일의_긴_키_전체\n-----END PRIVATE KEY-----\n
```

**`\n`은 줄바꿈을 뜻하는 표시입니다. 보이는 그대로 복사하면 됩니다.** 직접 Enter로 바꾸거나 삭제하지 않아도 앱의 서버가 처리합니다. 따옴표로 둘러싸거나 `FIREBASE_PRIVATE_KEY=`까지 Value 칸에 넣지 마세요.

### 4-6. 네 항목이 모두 저장됐는지 확인하기

Netlify 환경변수 목록에 다음 **이름 4개**가 있는지 봅니다.

| 이름 | 값 |
| --- | --- |
| `APP_BASE_URL` | `https://healthycashsh.netlify.app` |
| `FIREBASE_PROJECT_ID` | `healthycash` |
| `FIREBASE_CLIENT_EMAIL` | JSON 파일의 `client_email` |
| `FIREBASE_PRIVATE_KEY` | JSON 파일의 `private_key` 전체 |

저장 뒤 비밀값이 점이나 별표로 가려져 보이는 것은 정상입니다.

**완료 확인:** 4개가 저장되어 있고 Production의 Functions에서 사용할 수 있으면 됩니다. 아직 카카오·네이버 키를 넣지 않았으므로 로그인 버튼이 활성화되지 않아도 정상입니다.

이 이름들 앞에 **`VITE_`를 붙이지 마세요.** `VITE_`는 브라우저에 공개되는 설정에 쓰는 이름입니다. 공개 Firebase 웹 설정 4개는 이미 코드에 반영되어 있으므로 다시 입력할 필요가 없습니다. `netlify.toml`이나 GitHub 코드에 비공개키를 적는 작업도 하지 않습니다.

## 5단계: 카카오 로그인 연결하기

### 5-1. 카카오 앱 만들기

1. [카카오 개발자센터](https://developers.kakao.com/)에 카카오 계정으로 로그인합니다.
2. **내 애플리케이션**을 누릅니다.
3. 이미 헬시캐시 앱을 만들었다면 그 앱을 엽니다. 없다면 **애플리케이션 추가하기**를 누릅니다.
4. 앱 이름은 **헬시캐시**로 입력합니다. 회사명·사업자명 등 나머지는 화면의 안내에 따라 실제 운영 정보를 입력합니다.
5. 생성한 앱의 설정 화면을 엽니다.

### 5-2. 사이트 주소와 로그인 복귀 주소 등록하기

메뉴 위치가 달라졌다면 앱 설정에서 **플랫폼 / Web / 카카오 로그인 / Redirect URI**라는 이름을 찾아 주세요.

1. **앱 설정 → 플랫폼 → Web 플랫폼 등록**에서 사이트 도메인에 아래 주소를 입력하고 저장합니다.

```text
https://healthycashsh.netlify.app
```

2. **제품 설정 → 카카오 로그인**을 엽니다.
3. **활성화 설정**을 **ON**으로 바꾸고 저장합니다.
4. 같은 로그인 설정의 **Redirect URI 등록**에 아래 주소를 그대로 붙여넣고 저장합니다.

```text
https://healthycashsh.netlify.app/.netlify/functions/kakao-callback
```

Redirect URI는 ‘카카오에서 로그인을 마친 뒤 돌아올 주소’입니다. **사이트 주소와 별도로 등록**해야 하며, 마지막 `kakao-callback`까지 모두 넣습니다.

5. **동의항목**에서 **닉네임**을 설정합니다. 이메일·전화번호·프로필 사진은 현재 앱이 저장하지 않습니다. 닉네임을 받지 못하면 앱은 기본 닉네임 `헬시 이웃`을 사용합니다.

### 5-3. 카카오 키를 Netlify에 넣기

1. 카카오 앱의 **앱 키** 화면을 엽니다. **앱 설정 → 요약 정보** 또는 **앱 → 앱 키** 등에 있을 수 있습니다.
2. **REST API 키**를 복사합니다. JavaScript 키나 Admin 키를 복사하지 않습니다.
3. Netlify **Environment variables**로 돌아갑니다.
4. 다음 이름으로 변수를 만들고, 복사한 REST API 키를 Value에 넣어 저장합니다.

```text
KAKAO_REST_API_KEY
```

5. 카카오의 **카카오 로그인 → 보안** 등에서 **Client Secret** 사용 상태를 확인합니다.
6. Client Secret 검증이 활성화되어 있다면, 해당 값을 복사해 Netlify에 다음 변수로 저장합니다.

```text
KAKAO_CLIENT_SECRET
```

Client Secret 검증이 꺼져 있다면 현재 구현에서는 이 변수가 필수는 아닙니다. 켰다면 반드시 같은 값을 등록해야 합니다. 두 변수도 4단계와 같이 **Production / Functions**에 적용합니다.

**완료 확인:** 카카오 로그인이 ON이고, 복귀 주소가 등록되어 있으며, Netlify에 REST API 키와 필요한 Client Secret이 저장되어 있으면 됩니다.

카카오 앱의 운영 상태에 따라 팀원 등록·앱 설정·추가 동의항목 권한 등의 절차가 요구될 수 있습니다. 개발자센터에 제한 안내가 나오면 해당 앱의 안내를 확인하세요.

## 6단계: 네이버 로그인 연결하기

### 6-1. 네이버 앱 등록하기

1. [네이버 개발자센터](https://developers.naver.com/)에 로그인합니다.
2. **Application → 애플리케이션 등록**을 누릅니다. 이미 등록했다면 **내 애플리케이션**에서 해당 앱을 엽니다.
3. 애플리케이션 이름에 **헬시캐시**를 입력합니다.
4. **사용 API**에서 **네이버 로그인**을 선택합니다.
5. 제공 정보 설정에서는 **별명(닉네임)**을 사용합니다. 현재 앱은 이름·이메일·전화번호를 저장하지 않습니다.
6. **로그인 오픈 API 서비스 환경**에서 **PC 웹**을 선택합니다.
7. **서비스 URL**에 아래 주소를 입력합니다.

```text
https://healthycashsh.netlify.app
```

8. **Callback URL**에 아래 주소를 입력하고 등록·저장합니다.

```text
https://healthycashsh.netlify.app/.netlify/functions/naver-callback
```

Callback URL도 ‘로그인 뒤 돌아올 주소’입니다. 서비스 URL과 서로 다른 칸에 입력합니다.

### 6-2. 네이버 키 두 개를 Netlify에 넣기

1. 네이버 개발자센터 **내 애플리케이션 → 헬시캐시 → 개요** 등에서 **Client ID**와 **Client Secret**을 확인합니다.
2. Netlify 환경변수에 다음 2개를 하나씩 등록합니다.

| Netlify의 Key 칸 | Value 칸에 붙여넣을 내용 |
| --- | --- |
| `NAVER_CLIENT_ID` | 네이버 앱의 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 앱의 Client Secret |

3. 두 변수도 **Production / Functions**에 적용하고 저장합니다.
4. 네이버 앱의 **멤버 관리 / 테스트 계정** 설정에서 시연에 사용할 계정을 허용합니다. 개발 상태에서는 앱 관리자와 허용된 테스트 계정으로 먼저 확인합니다.

**완료 확인:** 서비스 URL과 Callback URL을 저장했고, Netlify에 네이버 변수 2개가 있으면 됩니다. 일반 이용자에게 공개하려면 네이버의 서비스 적용·검수 절차도 완료해야 합니다.

카카오와 네이버는 **각각 별도 회원 계정**입니다. 같은 사람이 두 서비스로 로그인하더라도 자동으로 합쳐지지 않습니다.

## 7단계: Netlify에서 다시 배포하기

환경변수를 저장한 뒤 **재배포해야** 새 설정이 적용됩니다. 페이지 새로고침만으로는 적용되지 않습니다.

1. Netlify에서 `healthycashsh.netlify.app` 프로젝트를 엽니다.
2. **Deploys**를 누릅니다.
3. **Trigger deploy → Deploy site**를 누릅니다. 화면에 따라 **Deploy project** 또는 비슷한 이름일 수 있습니다.
4. 새 배포가 목록에 나타나면 눌러 진행 상태를 봅니다.
5. 배포가 성공하고 **Published** 등으로 표시될 때까지 기다립니다.
6. [헬시캐시 앱](https://healthycashsh.netlify.app/)을 새로 엽니다. 이전 화면이 계속 보이면 Windows에서는 **Ctrl + Shift + R**, Mac에서는 **Command + Shift + R**로 새로고침합니다.

현재 저장소의 배포 설정은 빌드 명령 **`npm run build`**, 배포 폴더 **`dist`**, 서버 함수 폴더 **`netlify/functions`**입니다. GitHub `sorahanel/healthycash`의 **main** 브랜치가 연결된 배포를 사용합니다.

파일을 끌어다 놓는 수동 업로드만 하면 로그인에 필요한 서버 함수가 빠질 수 있으므로 **연결된 GitHub 저장소를 빌드해 배포**하세요.

**완료 확인:** 새 운영 배포가 성공하고 아래 8단계를 진행할 수 있으면 됩니다.

## 8단계: 정말 연결됐는지 확인하기

### 8-1. 서버가 설정값을 읽었는지 확인하기

아래 주소를 브라우저에서 엽니다.

[로그인 설정 확인 화면 열기](https://healthycashsh.netlify.app/.netlify/functions/auth-config)

두 서비스를 모두 설정했다면 아래와 같은 글자가 표시됩니다.

```json
{"providers":{"kakao":true,"naver":true}}
```

- `true`: 서버가 필요한 설정값을 읽고 있습니다.
- `false`: 해당 서비스의 필수 설정이 없거나 공통 서버 설정을 읽지 못했습니다.

**`true`는 키가 올바른지나 실제 로그인 성공까지 확인한 결과는 아닙니다.** 다음의 실제 로그인도 확인하세요. 이 화면에는 비공개키가 표시되지 않습니다.

### 8-2. 첫 로그인과 회원정보 저장 확인하기

1. [헬시캐시 앱](https://healthycashsh.netlify.app/)을 엽니다.
2. 위쪽 **로그인** 또는 메뉴의 **마이페이지**를 누릅니다.
3. **카카오로 시작하기**를 누릅니다.
4. 카카오 화면에서 로그인하고 필요한 동의를 진행합니다.
5. 헬시캐시로 돌아와 **마이페이지 → 내 회원정보**가 표시되는지 확인합니다.
6. **회원 닉네임**과 **회원 동네**를 바꾸고 **회원정보 저장**을 누릅니다.
7. **회원정보를 저장했어요.**라는 안내가 나오는지 확인합니다.
8. Firebase **Authentication → 사용자**를 열어 사용자가 생성됐는지 확인합니다.
9. Firebase **Firestore Database → 데이터 → users**를 열어 회원 문서가 생성됐는지 확인합니다.

문서에는 `uid`(회원 고유번호), `provider`(카카오 또는 네이버), `nickname`, `neighborhood`, 가입·수정·접속 시각이 들어갑니다. **실제 이메일이 표시되지 않아도 정상**입니다. 현재 앱은 이메일을 회원정보로 저장하지 않습니다.

### 8-3. 기존 계정 유지와 로그아웃 확인하기

1. 현재 회원 문서의 **uid**와 **createdAt**(가입 시각)을 본인 화면에서 확인해 둡니다.
2. 앱을 새로고침합니다. 로그인 상태와 저장한 닉네임·동네가 유지되어야 합니다.
3. 일반 브라우저 창을 닫았다가 같은 브라우저로 다시 엽니다. 브라우저가 사이트 데이터를 지우지 않았다면 로그인 상태가 유지되어야 합니다.
4. 마이페이지의 **로그아웃**을 누릅니다. 로그인 버튼이 다시 보여야 합니다.
5. **같은 카카오 계정**으로 다시 로그인합니다.
6. 같은 uid와 가입 시각, 수정한 닉네임·동네가 유지되는지 확인합니다. 회원 문서가 새로 하나 더 생기면 안 됩니다.
7. 로그아웃한 뒤 **네이버로 시작하기**로도 8-2와 8-3을 확인합니다. 네이버 첫 로그인은 별도 회원이므로 새 문서가 생기는 것이 정상입니다.

### 8-4. 다른 사람 정보와 시연 데이터가 섞이지 않는지 확인하기

1. 본인 계정 A로 닉네임을 저장한 뒤 로그아웃합니다.
2. 다른 테스트 계정 B로 로그인합니다. A의 프로필이 B에게 보이면 안 됩니다.
3. 로그아웃 상태의 마이페이지에서는 회원정보 대신 로그인 화면이 보여야 합니다.
4. Firestore의 `users` 문서에 시연용 HC 잔액·걸음 수·혈압이 들어가 있지 않은지 확인합니다.
5. 로그인 중 카카오·네이버 화면에서 취소해 보고, 앱에서 다시 로그인 버튼을 눌러 정상적으로 시작할 수 있는지 확인합니다.

앱에 보이는 **HC·XP·미션·건강 기록은 계속 시연용**입니다. 로그인했다고 실제 회원 계정으로 옮겨지지 않습니다.

위 확인은 화면에서 볼 수 있는 동작 점검입니다. ‘타인 조회 거부’, ‘브라우저에서 회원정보 직접 쓰기 거부’, ‘로그인 요청 위조·재사용 차단’ 같은 권한 검증은 별도의 자동 테스트로 확인합니다. 기존 결과는 [검증 기록](VALIDATION.md), 실행 방법과 구현 설명은 [개발자 참고자료](AUTH_TECHNICAL.md)에 있습니다.

## 막혔을 때 확인할 것

| 지금 보이는 상황 | 먼저 할 일 |
| --- | --- |
| JSON 파일이 다운로드되지 않음 | 브라우저의 다운로드 목록과 다운로드 차단 안내 확인. 회사 보안 정책이 막았다면 관리자에게 승인된 저장 방법 문의 |
| ‘새 비공개 키 생성’ 버튼이 없거나 권한 오류가 남 | healthycash 프로젝트와 관리 계정인지 확인. 조직에서 키 생성을 제한했다면 관리자에게 문의 |
| Netlify에서 값이 가려져 보임 | 비밀값 숨김 표시일 수 있음. 값 대신 변수 이름·Production·Functions 적용 여부 확인 |
| 양쪽 로그인 설정이 모두 `false` | 4단계의 공통 변수 4개와 각 서비스 키, Production / Functions 적용, 재배포 완료 여부 확인 |
| 한쪽 로그인 설정만 `false` | 카카오는 REST API 키, 네이버는 Client ID와 Client Secret 둘 다 등록했는지 확인 |
| 설정은 `true`인데 로그인 실패 | 키 값의 오타·따옴표·복귀 주소·제공자 앱 상태 확인. `true`는 설정 존재 여부만 뜻함 |
| 카카오에서 Redirect URI 오류 | 5단계의 `kakao-callback`까지 포함한 주소를 그대로 등록했는지 확인 |
| 네이버에서 특정 계정만 로그인 가능 | 테스트 계정 등록과 네이버 서비스 검수 상태 확인 |
| 로그인 후 회원정보를 못 불러옴 | 기본 Firestore `(default)` 생성, 2-2 규칙 게시, 서버와 웹의 프로젝트 ID가 모두 healthycash인지 확인 |
| `auth_unavailable` 또는 로그인 준비 안내 | 비공개키 전체와 서비스 계정 이메일을 정확히 입력했는지, Functions에 적용했는지 확인 |
| 로그인 시간이 지났거나 요청 확인 불가 안내 | 앱의 로그인 버튼에서 새로 시작. 로그인 중간 주소를 복사하거나 이전 콜백 주소를 재사용하지 않음 |
| 설정 확인 주소에서 앱 화면이나 404가 나옴 | GitHub 연결 배포와 서버 함수 배포 여부 확인. 수동 파일 업로드만 했는지 확인 |
| 다시 배포하는 과정에서 실패 | Netlify Deploys에서 실패한 배포의 로그를 열고 오류 부분 확인 |

도움을 요청할 때는 **어느 단계인지, 오류 문구, 변수 이름 목록**을 알려 주세요. 비공개키·Client Secret의 실제 값과 JSON 파일 전체는 보내지 마세요.

## 연결을 마친 뒤

- 실제 이용자에게 공개하기 전, 서비스 운영자·보유 기간·문의 및 탈퇴 방법이 담긴 개인정보처리방침을 연결합니다. 현재 앱의 짧은 수집 안내만으로 이를 대신하지 않습니다.
- 현재 Firebase Spark 설정에서는 자동 삭제용 유료 TTL 기능을 켜지 않습니다. 로그인 유효시간과 재사용 차단은 서버가 확인합니다. 취소된 로그인에서 남은 만료 자료를 정리하는 운영 방법은 [개발자 참고자료](AUTH_TECHNICAL.md)를 따릅니다.
- 본인 컴퓨터에서 개발하거나 자동 검증을 다시 실행하려는 경우에도 [개발자 참고자료](AUTH_TECHNICAL.md)를 사용합니다. **배포된 앱을 연결하는 위 과정에는 로컬 개발 환경이 필요하지 않습니다.**

설정 경로 참고: [Firebase 맞춤 인증](https://firebase.google.com/docs/auth/web/custom-auth?hl=ko) · [카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api) · [네이버 로그인](https://developers.naver.com/docs/login/api/api.md)
