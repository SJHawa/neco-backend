# BE-3: 방 생성 이후 초대 방 문맥 정합성

작성일: 2026-09-17 | 상태: **구현 완료 / 실환경 미검증**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 새 방 생성 성공 후 세션 방 ID 저장과 후속 초대 대상을 검증한다. AI가 반환한 과거 방 ID가 현재 소유 대기방보다 우선되는 사례를 재현한 뒤 필요한 범위에서 문맥을 수정한다.

**Dependencies:** BE-1, BE-2

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-api-and-realtime.md`, `docs/specs/06-gameplay-lifecycle.md` 및 권한/상태 규칙이 충돌하면 `docs/specs/02-domain-model.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [x] B의 새 방 ID와 저장된 세션 방 ID가 일치하고 후속 초대가 그 방에서 실행된다.
- [x] 과거 방이나 유효하지 않은 멤버십이 후속 요청 문맥으로 지속되지 않는다.
- [x] 타인의 방 초대는 기존 OWNER + JOINED 검사로 거부한다.

**Files likely touched / inspected:**
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.ts)
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts)
- [`src/modules/game-rooms/service/game-rooms.service.spec.ts`](../../../src/modules/game-rooms/service/game-rooms.service.spec.ts)

**Verification — 계획 명령 (실제 결과는 아래 실행 로그):**

저장소 루트에서 실행한다.

```sh
pnpm exec jest --runInBand ai-chat-sessions.service.spec.ts game-rooms.service.spec.ts
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 권한 오류를 없애기 위해 권한 검사를 완화하지 않는다. 명시한 타인 방을 무조건 본인 방으로 바꾸지 않는다. BE-2와 같은 서비스 파일을 수정하므로 순차 진행한다.

## 실행 로그 — 2026-09-17

**What was done:** 메시지에 명시되지 않은 AI 방 ID는 초대·시작 대상에서 제외. 삭제·종료된 방 및 유효 멤버십이 없는 세션 문맥을 해제. 방 생성→세션 저장→후속 초대를 연속 테스트로 검증. 명시한 타인 방의 권한 오류는 그대로 유지.

**Verification completed:** 채팅·방·참여자 서비스 테스트 54개 통과.

**Not verified / remaining:** 실DB와 실제 LLM 사용 여부는 BE-5에서 구분. 권한 검사 완화 없음.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-3.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

**Implementation commit:** `236fae3` (이후 검증 체크리스트 갱신은 Task 5 로그 커밋).
