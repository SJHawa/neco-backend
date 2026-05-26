## [2026-05-26] W2-3: Implement mission template, room mission, and game-start domain services

**Plan reference:** `docs/plans/worker-2-room-participant-mission-plan.md`

**Summary:**
- Added mission-template, mission-template-step, game-room-mission, and game-room-mission-step persistence plus migration coverage for Worker 2 mission lifecycle state.
- Implemented authoritative game-start domain services that validate owner and participant constraints, create the room mission and copied step state, set the first mission step to `READY`, and move the room from `WAITING` to `IN_PROGRESS`.
- Exposed `POST /v1/game-rooms/{gameRoomId}/start` as the canonical authenticated start entry point for this worker scope, while keeping runtime container IDs server-owned rather than client-provided.

**Dependencies reviewed before starting:**
- `docs/plans/README.md`
- `docs/plans/common-sequential-plan.md`
- `docs/plans/worker-2-room-participant-mission-plan.md`
- `docs/implementaion-logs/README.md`
- `docs/implementaion-logs/common/phase-1-foundation.md`
- `docs/implementaion-logs/worker-2/phase-1-lobby.md`
- `docs/specs/00-overview.md`
- `docs/specs/02-domain-model.md`
- `docs/specs/03-modules.md`
- `docs/specs/04-data-model.md`
- `docs/specs/05-api-and-realtime.md`
- `docs/specs/06-gameplay-lifecycle.md`
- `docs/specs/07-integrations-and-ai.md`

**Implementation details:**
- Added `MissionTemplateEntity`, `MissionTemplateStepEntity`, `GameRoomMissionEntity`, and `GameRoomMissionStepEntity` with canonical snake_case columns, JSONB mission payload storage, `current_step_id`, and canonical `LOCKED` / `READY` room-step statuses.
- Added migration `1779760000000-CreateMissionAndGameStartTables.ts` for `docker_images`, `mission_templates`, `mission_template_steps`, `game_room_missions`, and `game_room_mission_steps`, including the `mission_templates.docker_image_id -> docker_images.id` foreign key and the documented `game_room_missions(game_room_id)` index.
- `GameRoomMissionsService.createMissionForGameStart()` now validates template existence, room-difficulty alignment, presence of at least one ordered template step, single-mission-per-room protection, mission metadata copying, and first-step initialization.
- `GameRoomsService.startGame()` now enforces `OWNER + JOINED` ownership, `WAITING` room status, joined-participant min/max checks, room-level advisory locking, mission creation delegation, and the final room `IN_PROGRESS` transition.
- Added `POST /v1/game-rooms/{gameRoomId}/start` in `GameRoomsController`, with UUID validation for `gameRoomId` and `missionTemplateId`, returning the started room ID, room-mission ID, status, and Seoul-time `updatedAt`.
- Added room-level advisory locking to participant mutations as well, so invite, accept, deny, leave, and start serialize against the same room lifecycle boundary rather than racing on per-user locks only.

**Files changed:**
- `database/migrations/1779760000000-CreateMissionAndGameStartTables.ts`
- `src/modules/game-room-missions/game-room-missions.module.ts`
- `src/modules/game-room-missions/entity/mission-template.entity.ts`
- `src/modules/game-room-missions/entity/mission-template-step.entity.ts`
- `src/modules/game-room-missions/entity/game-room-mission.entity.ts`
- `src/modules/game-room-missions/entity/game-room-mission-step.entity.ts`
- `src/modules/game-room-missions/service/game-room-missions.service.ts`
- `src/modules/game-room-missions/service/game-room-missions.service.spec.ts`
- `src/modules/game-rooms/controller/game-rooms.controller.ts`
- `src/modules/game-rooms/entity/game-room.entity.ts`
- `src/modules/game-rooms/game-rooms.module.ts`
- `src/modules/game-rooms/service/game-rooms.service.ts`
- `src/modules/game-rooms/service/game-rooms.service.spec.ts`
- `src/modules/game-room-participants/service/game-room-participants.service.ts`
- `src/modules/game-room-participants/service/game-room-participants.service.spec.ts`

**Verification:**
- [x] `corepack.cmd pnpm typecheck`
- [x] `corepack.cmd pnpm lint`
- [x] `.\node_modules\.bin\jest.cmd --runInBand src/modules/game-rooms/service/game-rooms.service.spec.ts src/modules/game-room-missions/service/game-room-missions.service.spec.ts src/modules/game-room-participants/service/game-room-participants.service.spec.ts`
- [x] Manual check: mission-step statuses remain the canonical `LOCKED`, `READY`, `IN_PROGRESS`, `CLEARED`, `FAILED` set from the shared enums.
- [x] Manual check: runtime container identifiers remain stored on `game_room_missions.container_id`, not in a separate ad hoc store.
- [x] `gpt-5.4` subagent review completed; missing start endpoint, room lifecycle locking gaps, public runtime-container leakage, and template-image FK issues were fixed, and the final pass reported no remaining P1-P3 findings in W2-3 scope.
- [ ] First-turn creation and realtime `game-started` / `game-state-updated` broadcasting were not implemented here because those are owned by later turn/runtime/realtime integration work (`W3-*` and shared `C4`), not by Worker 2's W2-3 acceptance boundary.

**Commit:**
- `2c36e16` feat(worker-2): implement mission lifecycle start domain

**Impact on next tasks:**
- `W2-4` can now read hint data and mission progress from stable template-step and room-mission-step persistence instead of inventing its own state model.
- Shared `C3` can call `GameRoomsService.startGame()` through a validated service boundary rather than mutating room status or mission tables directly.
- Shared `C4` and Worker 3 can layer runtime provisioning, first-turn creation, and gameplay broadcasts on top of an existing authoritative mission-start transaction.

**Design decisions made:**
- Kept template metadata (`judge_policy_json`, `project_structure_json`, `docker_image_id`) on the reusable template and copied the mutable gameplay state into `game_room_missions` so room runtime state stays isolated from template edits.
- Added room-scoped advisory locks in addition to the earlier user-scoped locks so room start cannot race lobby membership mutations.
- Kept `container_id` nullable at the domain-service layer because runtime preparation is integrated later, but removed any client-controlled `runtimeContainerId` field from the public HTTP contract to preserve server ownership of runtime identifiers.

**Deviations from spec:**
- None within W2-3 acceptance. Full first-turn creation and realtime start broadcasts remain intentionally deferred to later tasks that own turn and transport integration.

**Trade-offs:**
- Added a minimal `docker_images` persistence table in the same migration so `mission_templates.docker_image_id` can be protected by a real FK now, instead of waiting for a later runtime-focused stream and leaving template references weak in the meantime.
- Did not add turn persistence in this task even though the end-to-end gameplay lifecycle creates the first turn at game start, because Worker 2's accepted scope stops at authoritative mission and room-start domain state and the turn module is owned elsewhere.

**Open questions:**
- [x] Should the public start endpoint accept a runtime container identifier from the client? Resolved as `No`; runtime identifiers remain server-owned metadata and are not part of the HTTP request contract.
- [x] Does W2-3 need to enforce the template-to-image relationship at the DB layer already? Resolved as `Yes`; `docker_images` was added so `mission_templates.docker_image_id` can use a real FK immediately.

**Open risks or follow-ups:**
- `C4` still needs to create the first turn and emit gameplay-entry broadcasts after this authoritative mission-start transaction succeeds.
- Runtime preparation is still not wired in this worker stream, so later integration must populate `game_room_missions.container_id` from the runtime adapter instead of assuming it already exists.
- The current public start response is intentionally minimal and will likely be superseded by broader gameplay-entry state once shared turn/realtime integration lands.

**Instructions for the next worker:**
- Read this file before starting `W2-4` or shared `C3`/`C4`, and treat `GameRoomsService.startGame()` plus `GameRoomMissionsService.createMissionForGameStart()` as the only authoritative path for mission-start persistence.
- Preserve the room-level advisory lock when adding any new mutation that changes lobby membership or room-start readiness.
- Use `game_room_mission_steps` as the live step-state source of truth and `mission_template_steps.hint_text` as the hint-text source until AI-generated hints are intentionally introduced.
- Do not move `container_id` into controller-managed or client-managed state; later runtime integration must fill it from the server-owned adapter layer.
