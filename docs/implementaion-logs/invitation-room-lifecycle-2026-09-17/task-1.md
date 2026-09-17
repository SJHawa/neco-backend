# BE-1: 오류 재현과 서버 상태 추적

작성일: 2026-09-17 | 상태: **재현 완료 / 실환경 미검증**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 초대 조회, 새 방 소유권, 수락 후 이탈을 구분하는 재현 테스트를 만든다. 실제 요청 순서와 사용자·방·채팅 세션·참여 상태·소켓 종료 시점을 연결해 기록한다.

**Dependencies:** 없음

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-api-and-realtime.md`, `docs/specs/06-gameplay-lifecycle.md` 및 권한/상태 규칙이 충돌하면 `docs/specs/02-domain-model.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] 과거 방 문맥이 있으면 현재 초대를 찾지 못하는 사례를 createMessage 경계에서 재현한다.
- [ ] B의 새 방 생성 후 초대 요청이 어느 방을 대상으로 실행되는지 확인한다.
- [ ] C→A 수락 후 이탈이 실제 DB LEFT 변경인지 화면 표시 문제인지 구분한다.

**Files likely touched / inspected:**
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts)
- [`src/modules/game-room-participants/service/game-room-participants.service.spec.ts`](../../../src/modules/game-room-participants/service/game-room-participants.service.spec.ts)
- [`src/modules/realtime/gateway/realtime.gateway.unit.spec.ts`](../../../src/modules/realtime/gateway/realtime.gateway.unit.spec.ts)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
pnpm exec jest --runInBand ai-chat-sessions.service.spec.ts game-room-participants.service.spec.ts realtime.gateway.unit.spec.ts
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 재현 전 원인을 확정하지 않는다. 테스트용 LLM 응답을 고정한 결과와 실제 LLM 응답을 구분한다.

## 실행 로그 — 2026-09-17

**What was done:** createMessage 경계에서 초대 수락·거절 2건 및 이전 AI 방 ID 오선택 1건 회귀 테스트 추가. 서비스의 실제 조회·명령 선택 로직을 사용하며 저장소와 LLM은 대역이다.

**Verification completed:** 기존 20개 통과, 추가 3개가 예상대로 실패. 아직 수정 전 RED 상태.

**Not verified / remaining:** 실제 DB·LLM·세 브라우저의 제보 재현은 BE-5에서 별도 확인.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-1.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.
