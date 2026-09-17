# BE-4: 수락 이후 소켓 종료와 탈퇴 경계 검증

작성일: 2026-09-17 | 상태: **검증 완료 / 서버 변경 불필요**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 마지막 소켓 종료가 JOINED→LEFT로 이어지는 현재 동작을 검증하고 이전 방 정리와 새 방 연결의 경합을 재현한다. 서버 수정은 재현으로 확인한 오류에 한정한다.

**Dependencies:** BE-1, BE-3; FE-4와 함께 검증

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-api-and-realtime.md`, `docs/specs/06-gameplay-lifecycle.md` 및 권한/상태 규칙이 충돌하면 `docs/specs/02-domain-model.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] 종료된 소켓의 방과 사용자에 대해서만 정리하며 이전 방 정리가 새 방 멤버십을 변경하지 않는다.
- [ ] 같은 사용자·방의 유효한 다른 연결이 남은 경우 탈퇴시키지 않는다.
- [ ] FE-4 적용 후 C→A 수락 상태가 유지되고 의도적인 퇴장은 정상 처리된다.

**Files likely touched / inspected:**
- [`src/modules/realtime/gateway/realtime.gateway.ts`](../../../src/modules/realtime/gateway/realtime.gateway.ts)
- [`src/modules/realtime/gateway/realtime.gateway.unit.spec.ts`](../../../src/modules/realtime/gateway/realtime.gateway.unit.spec.ts)
- [`src/modules/realtime/service/realtime-disconnect.service.spec.ts`](../../../src/modules/realtime/service/realtime-disconnect.service.spec.ts)
- [`src/modules/game-room-participants/service/game-room-participants.service.spec.ts`](../../../src/modules/game-room-participants/service/game-room-participants.service.spec.ts)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
pnpm exec jest --runInBand realtime.gateway.unit.spec.ts realtime-disconnect.service.spec.ts game-room-participants.service.spec.ts
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 서버의 즉시 탈퇴가 현재 정책인지 먼저 관련 명세와 비교한다. 재접속 유예나 TTL을 자동 도입하지 않는다. 서버 변경이 불필요하면 검증 결과만 기록한다.

## 실행 로그 — 2026-09-17

**What was done:** 같은 사용자로 이전 방과 새 방 소켓을 연결한 뒤 이전 연결을 종료하는 gateway 회귀 테스트 추가. 정리 대상이 이전 방에 한정되고 새 방은 새 소켓이 종료될 때만 정리됨을 확인. 서버 제품 코드 변경 없음.

**Verification completed:** gateway·disconnect·participant 서비스 20개 테스트 통과. backend tsc --noEmit 통과. 기존 다중 소켓 및 JOINED→LEFT 테스트 유지.

**Not verified / remaining:** FE-4의 실제 화면 검증 결과 및 실DB 세 계정 검증은 Task 5에서 별도 기록.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementaion-logs/invitation-room-lifecycle-2026-09-17/task-4.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.
