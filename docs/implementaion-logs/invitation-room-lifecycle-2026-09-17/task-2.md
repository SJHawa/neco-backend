# BE-2: 유효한 초대 조회와 대상 검증

작성일: 2026-09-17 | 상태: **구현 완료 / 실환경 미검증**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 오래된 세션 문맥이 유효한 초대 조회를 가리지 않도록 수정한다. 명시한 대상과 대상이 생략된 요청을 구분하고, 유효하지 않은 명시 대상에서 임의의 다른 초대로 전환하지 않는다.

**Dependencies:** BE-1; FE-1과 메시지 내 초대 식별 방식 합의

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-api-and-realtime.md`, `docs/specs/06-gameplay-lifecycle.md` 및 권한/상태 규칙이 충돌하면 `docs/specs/02-domain-model.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] 초대 대상의 본인 소유, INVITED 상태, WAITING 방 여부를 검증한다.
- [ ] 과거 세션이 있어도 현재 유효한 초대를 수락·거절할 수 있고, 모호한 대상은 임의 처리하지 않는다.
- [ ] 타인의 초대 및 이미 처리된 초대를 다시 처리할 수 없다.

**Files likely touched / inspected:**
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.ts)
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts)
- [`src/modules/game-room-participants/service/game-room-participants.service.ts`](../../../src/modules/game-room-participants/service/game-room-participants.service.ts)
- [`src/modules/game-room-participants/service/game-room-participants.service.spec.ts`](../../../src/modules/game-room-participants/service/game-room-participants.service.spec.ts)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
pnpm exec jest --runInBand ai-chat-sessions.service.spec.ts game-room-participants.service.spec.ts
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** HTTP 본문은 { message }를 유지한다. participantId/gameRoomId를 요청 필드로 추가하거나 clientAction을 부활시키지 않는다. 서비스 권한 검증을 우회하지 않는다.

## 실행 로그 — 2026-09-17

**What was done:** 초대 조회에서 세션 방 의존 제거. 본인 INVITED + WAITING 조건으로 명시 대상을 조회하고 대상 생략 시 유일한 유효 초대만 선택. 카드 메시지의 실제 ID를 AI가 반환한 과거 ID보다 우선한다.

**Verification completed:** 참여자 서비스 및 채팅 테스트 37개 통과. BE-3용 기존 방 ID 회귀 1개는 수정 전 예상 실패로 남음.

**Not verified / remaining:** 실제 LLM·DB 통합 검증은 BE-5 대상.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-2.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.
