# Open Questions from frontend

프론트엔드 개발자와 협의하여 결정된 사항을 정리합니다.

---

## 1. AI chat session 생성 시점

**기존 질문**
`/main` 최초 진입 시 AI chat session이 없는 경우 세션을 어떻게 생성할 것인가?
v1.2 명세에는 AI chat session 생성 API가 없다.

**결정된 내용**
회원가입 API 처리 시 서버가 AI chat session을 자동으로 생성한다.

**백엔드 작업 내용**
- `POST /v1/auth/signup` 처리 시 해당 유저의 AI chat session을 자동 생성한다.

---

## 2. `game-started` 이벤트의 초기 파일 정보

**기존 질문**
`game-started` 이벤트에 에디터 초기 파일 정보가 포함되는가?
RoomPage에서 파일 탭과 Monaco Editor를 구성하려면 초기 파일 목록, 기본 파일명, 초기 코드 내용, 편집 가능 여부가 필요하다.

**결정된 내용**
`game-started` 이벤트의 `missionState.projectStructure.files` 배열 각 요소에 S3 URL(`fileUrl`)을 추가한다. 프론트엔드는 해당 URL로 초기 코드 내용을 fetch하여 에디터에 로드한다.

**백엔드 작업 내용**
- `game-started` 이벤트의 `missionState.projectStructure.files` 배열 각 요소에 `fileUrl: string` (S3 presigned URL 또는 공개 URL) 필드를 추가한다.
- 예시:
  ```json
  "files": [
    {
      "filePath": "main.py",
      "language": "python",
      "readonly": false,
      "fileUrl": "https://s3.amazonaws.com/bucket/workspace/main.py"
    }
  ]
  ```

---

## 3. 코드 동기화 이벤트 payload 기준

**기존 질문**
코드 동기화 이벤트 payload는 `content` 기준으로 확정할 것인가?
Yjs를 사용하지 않기로 했으므로 `codeDelta` 대신 전체 파일 `content`를 전송하는 방향이 논의되었다.

**결정된 내용**
`content` (전체 파일 내용) 기준으로 확정한다.

**백엔드 작업 내용**
- WebSocket 이벤트 `code-change` (Client → Server) 및 `code-updated` (Server → Client)의 payload를 `codeDelta` 대신 `content: string` 필드로 명세한다.

---

## 4. `GET /game-rooms` 응답에서 단일 방 보장 조건

**기존 질문**
`GET /game-rooms`가 복수 배열을 반환할 때 서버는 실제로 한 방만 보장하는가?
서비스 정책은 한 사용자당 한 방이다.

**결정된 내용**
`status`가 `WAITING`인 방만 한 개 존재함을 보장한다. 프론트엔드는 복수 응답을 비정상 상태로 처리한다.

**백엔드 작업 내용**
- 한 사용자가 `WAITING` 상태의 방에 동시에 두 개 이상 소속될 수 없도록 서버에서 중복 생성/참가를 제한한다.

---

## 6. AI 채팅에서 미션 템플릿 선택 전달 방식

**기존 질문**
AI 채팅에서 미션 템플릿 선택은 어떤 방식으로 서버에 전달하는가?
v1.2에서는 `clientAction`이 제거되어 body가 `message`만 있다.

**결정된 내용**
템플릿 카드 클릭 시 자연어 메시지로 전송한다 (예: "이 템플릿으로 할게").

**백엔드 작업 내용**
- 없음. AI가 자연어 메시지를 해석하여 처리한다.

---

## 9. passwordHash 생성 방식

**기존 질문**
`passwordHash`는 프론트에서 어떤 방식으로 생성하는가?
해시 알고리즘, salt 정책, 서버 추가 hashing 여부를 정해야 한다.

**결정된 내용**
서버는 별도의 hashing을 수행하지 않는다. 프론트엔드에서 SHA-256으로 해시하여 전송한다. (HTTPS 전제)

**백엔드 작업 내용**
- `POST /v1/auth/signup` 및 `POST /v1/auth/login`에서 수신한 `passwordHash` 값을 그대로 사용한다 (서버 측 추가 hashing 없음).
- API 명세에 `passwordHash`가 SHA-256 hex string임을 명시한다.
