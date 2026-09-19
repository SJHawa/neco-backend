# BE-5: 세 계정 통합 검증과 서버 인계

작성일: 2026-09-17 | 상태: **부분 검증 완료 / 실서버 대기**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 분리된 세 사용자 세션으로 최초 초대부터 게임 종료 후 재초대까지 검증하고 서버의 최종 방·참여 상태를 기록한다.

**Dependencies:** BE-2, BE-3, BE-4, FE-2, FE-3, FE-4

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-api-and-realtime.md`, `docs/specs/06-gameplay-lifecycle.md` 및 권한/상태 규칙이 충돌하면 `docs/specs/02-domain-model.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] A→B 수락과 거절을 별도 초기 상태에서 검증하고 B 생성→초대도 성공한다.
- [ ] A→C 게임 종료 후 C의 새 방에서 A가 수락하고 다음 게임을 시작한다.
- [ ] 지연 응답·연결 종료 사례와 비방장 접근 거부를 함께 검증한다.

**Files likely touched / inspected:**
- [`src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts`](../../../src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts)
- [`src/modules/realtime/gateway/realtime.gateway.unit.spec.ts`](../../../src/modules/realtime/gateway/realtime.gateway.unit.spec.ts)
- [`docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-5.md`](../../../docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-5.md)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
pnpm exec jest --runInBand ai-chat-sessions.service.spec.ts game-room-participants.service.spec.ts game-rooms.service.spec.ts realtime.gateway.unit.spec.ts realtime-disconnect.service.spec.ts
pnpm typecheck
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 실제 DB·인증·LLM·소켓을 사용하는 검증 여부를 구분해 기록한다. 단위 테스트 통과를 실제 세 계정 검증 완료로 간주하지 않는다.

## 실행 로그 — 2026-09-19

**What was done:** 관련 회귀 검증과 전체 테스트 실행. 초대 조회·생성 후 초대·권한 거부·방별 소켓 정리 결과 기록. 이 Task에서 제품 로직 변경은 없고 이전 수정의 줄 끝 공백만 정리.

**Verification completed:** 관련 5 suite / 62개 통과, tsc --noEmit 통과. 전체 실행에서는 37 suite / 230개 통과. 1 suite는 기존 TurnsService 생성자 인자 누락으로 컴파일 실패.

**Not verified / remaining:** 실제 서버·DB·LLM·세 계정 연속 플레이는 미검증. 로컬 백엔드/DB 서비스가 실행 중이지 않으며 개발 서버 주소와 테스트 계정 생성 가능 여부를 사용자에게 요청했다. 환경 확보 전 이 Task를 완료로 표시하지 않는다.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-5.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

## 환경 확보 후 실행할 실제 세 계정 검증

1. A/B/C를 서로 다른 브라우저 프로필로 로그인한다. 기존 서비스 사용자 데이터를 임의 삭제하지 않는다.
2. A가 방을 만들고 B를 초대한다. B의 수락 및 거절은 서로 분리된 초기 상태에서 검증한다.
3. 이전 게임 종료 후 B가 새 방을 만들고 A를 초대한다. 생성 방 ID, 세션 방 ID, 초대 명령 방 ID가 일치하는지 기록한다.
4. A가 C를 초대하고 게임을 시작해 종료한다. C가 새 방을 만든 뒤 A를 초대하고 A가 수락한다.
5. A의 멤버십 JOINED와 새 방 소켓 유지, 다음 게임 시작을 확인한다. 실제 퇴장 시 해당 방만 LEFT가 되는지 검증한다.
6. 각 단계의 요청 ID·방 ID·초대 ID·참여 상태·소켓 종료 시점을 기록한다. 토큰과 계정 비밀번호는 로그에 남기지 않는다.

**완료 조건:** 위 실서비스 결과와 자동 테스트 결과가 모두 확인된 후에만 Task 5 상태 및 상단 체크리스트를 완료로 갱신한다.

## 전체 테스트의 별도 기존 실패

`src/test/scenarios/spec-validation.scenarios.spec.ts`의 558, 644, 1074행에서 TurnsService 생성자가 요구하는 7개 인자 중 5개만 전달해 TS2554가 발생한다. 이 파일과 TurnsService는 이번 작업에서 수정하지 않았다. 테스트를 삭제하거나 약화하지 않았으며 관련 62개 회귀 테스트는 별도로 모두 통과했다.
