## [2026-05-26] C3: Integrate AI chat commands with room lifecycle

**Plan reference:** `docs/plans/common-sequential-plan.md`

**Summary:**
- Connected `AiChatSessionsService` command execution to authoritative Worker 2 room, participant, and mission services for `ROOM_CREATE`, `USER_INVITE`, `ROOM_JOIN`, `USER_INVITE_DENY`, and `GAME_START`.
- Kept ambiguous or unsupported AI parsing non-authoritative, and converted command execution failures into `FAILED` chat results without silently mutating state outside validated service paths.
- Addressed post-implementation `gpt-5.4` review findings by making invite execution transactional as a batch, restricting owner-room fallback to `WAITING` rooms, and validating mission templates before room creation.

**Dependencies reviewed before starting:**
- `docs/implementaion-logs/README.md`
- `docs/implementaion-logs/common/phase-1-foundation.md`
- `docs/implementaion-logs/worker-1/phase-2-intent-parsing.md`
- `docs/implementaion-logs/worker-2/phase-1-lobby.md`
- `docs/implementaion-logs/worker-2/phase-2-missions.md`
- `docs/implementaion-logs/worker-3/phase-1-realtime.md`
- `docs/plans/README.md`
- `docs/plans/common-sequential-plan.md`
- `docs/specs/03-modules.md`
- `docs/specs/05-api-and-realtime.md`
- `docs/specs/06-gameplay-lifecycle.md`
- `docs/specs/08-security-testing-and-delivery.md`

**Implementation details:**
- `AiChatSessionsService` now resolves validated `AiChatCommandDto` values into real service calls instead of always returning `PENDING`. Successful command execution persists `SUCCESS` `commandResult` values and updates `ai_chat_sessions.game_room_id` when the room context changes.
- `ROOM_CREATE` remains `PENDING` until both difficulty and mission template are present. Once both exist, `GameRoomMissionsService.validateMissionTemplateSelection()` runs before `GameRoomsService.createRoom()` so invalid template selections do not create `WAITING` rooms.
- `USER_INVITE` now resolves invitee nicknames to user IDs and calls the new `GameRoomParticipantsService.inviteParticipants()` batch path so all invitations run inside one transaction rather than partially persisting on mid-loop failure.
- `ROOM_JOIN` and `USER_INVITE_DENY` now resolve invitation context from explicit `participantId`, explicit `gameRoomId`, or the latest invited membership and then call Worker 2 acceptance or denial services only.
- `GAME_START` now resolves the selected mission template from the latest successful room-creation request for the same room and then calls `GameRoomsService.startGame()` through the same service-layer validation used by the HTTP API.
- Fallback room resolution for owner-driven commands now only targets `OWNER + JOINED` membership on `WAITING` rooms, avoiding accidental selection of `IN_PROGRESS` rooms when both statuses exist for the same user.
- `AiChatCommandResultMapper` gained `SUCCESS` and detail-aware `FAILED` mapping helpers so chat responses can reflect the authoritative API path, resolved room ID, participant summary, and `started` state after execution.

**Files changed:**
- `src/modules/ai-chat-sessions/ai-chat-sessions.module.ts`
- `src/modules/ai-chat-sessions/ai-chat-sessions.service.ts`
- `src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts`
- `src/modules/ai-chat-sessions/constants/ai-chat-error.constants.ts`
- `src/modules/ai-chat-sessions/intent/ai-chat-command-result.mapper.ts`
- `src/modules/game-room-participants/service/game-room-participants.service.ts`
- `src/modules/game-room-participants/service/game-room-participants.service.spec.ts`
- `src/modules/game-room-missions/service/game-room-missions.service.ts`
- `src/modules/game-room-missions/service/game-room-missions.service.spec.ts`

**Verification:**
- [x] `corepack.cmd pnpm typecheck`
- [x] `.\node_modules\.bin\jest.cmd --runInBand src/modules/ai-chat-sessions/ai-chat-sessions.service.spec.ts src/modules/ai-chat-sessions/intent/ai-chat-command-result.mapper.spec.ts src/modules/game-room-participants/service/game-room-participants.service.spec.ts src/modules/game-room-missions/service/game-room-missions.service.spec.ts`
- [x] `corepack.cmd pnpm lint`
- [x] `corepack.cmd pnpm build`
- [x] `gpt-5.4` review subagent run before and after fixes; initial findings on partial invite persistence, wrong owner-room fallback, and pre-validation room creation were fixed, and re-review reported no remaining findings.
- [ ] DB-backed integration tests were not run because the repository still lacks authenticated Postgres integration wiring for AI chat plus lobby flows.

**Commit:**
- `6bcae3a` feat(common): integrate ai chat commands with room lifecycle

**Impact on next tasks:**
- `C4` can assume AI-chat-driven room creation, invitation, acceptance, denial, and game-start preparation now traverse the same authoritative Worker 2 services as direct HTTP flows.
- Worker 3 or shared integration can emit realtime state changes on top of authoritative room mutations without inventing a second room-lifecycle path in the gateway layer.
- AI chat history now carries enough execution result metadata for the client to distinguish `PENDING`, `SUCCESS`, and `FAILED` command outcomes without bypassing service authority.

**Design decisions made:**
- Chose to keep command execution inside `AiChatSessionsService` orchestration rather than adding controller-level shortcuts so the AI chat module remains the integration seam while room-state authority stays in Worker 2 services.
- Added batch invitation support to Worker 2 instead of compensating in Worker 1 because atomic invitation behavior is a room-membership invariant, not an AI-only concern.
- Reused prior successful `ROOM_CREATE` request history to resolve the selected mission template for `GAME_START` rather than introducing a new session-local mutable store.

**Deviations from spec:**
- None intended. The implementation preserves the spec rule that invalid or ambiguous AI commands must not create authoritative room state.

**Trade-offs:**
- `GAME_START` currently derives the chosen template from prior successful chat history for the same room. This keeps the change local for C3, but a later explicit room-level persisted selection field may simplify C4 or direct HTTP start flows.
- Verification is still unit-test heavy because the repository does not yet provide a seeded authenticated integration harness for AI chat plus room mutations.

**Open questions:**
- [x] Can partial `USER_INVITE` execution leave authoritative state behind on a failed AI chat command? -> No. `inviteParticipants()` now batches the mutation in one transaction.
- [x] Can owner-room fallback select an `IN_PROGRESS` room when the user also owns a `WAITING` room? -> No. Fallback now filters to `WAITING` only.
- [x] Can `ROOM_CREATE` create a room before mission template validity is known? -> No. Template validation now runs before room creation.

**Open risks or follow-ups:**
- `GAME_START` still does not create the first turn or emit `game-started`; that remains `C4` scope with Worker 3 integration.
- Realtime participant broadcasts are still not triggered from these room-state service calls; shared integration must wire that sequencing deliberately instead of assuming C3 already broadcasts.
- A future DB-backed integration test should cover multi-invite rollback and `ROOM_CREATE -> GAME_START` template-selection continuity against real Postgres transactions.

**Instructions for the next worker:**
- Start `C4` from this log and preserve `AiChatSessionsService -> Worker 2 service` authority boundaries. Do not reintroduce direct repository mutation from AI chat code.
- If you need room-start context beyond `gameRoomId`, read the latest successful `ROOM_CREATE` request history first or promote that state into explicit persistence through the shared track.
- Keep invitation mutation paths batch-safe; any future multi-user lobby change should preserve single-transaction behavior for the whole command.
