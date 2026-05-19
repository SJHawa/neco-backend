# Implementation Plan: Worker 3 Realtime, Runtime, and Execution Plumbing

## Overview

Worker 3 owns the non-authoritative transport and execution plumbing: WebSocket gateway, ephemeral code-sync support state, runtime adapter, execution persistence, and the turn-evaluation support path. This stream can progress in parallel after the shared contracts are fixed.

## Architecture Decisions

- Keep the gateway orchestration-only. Authoritative decisions stay in service-layer modules.
- Separate ephemeral collaboration state from durable execution and snapshot records so realtime transport does not leak into the persistence model.

## Task List

### Phase 1: Realtime Transport

## Task W3-1: Implement authenticated realtime gateway and room join flow

**Description:** Build the WebSocket gateway foundation for authenticated `join-room`, room-level session tracking, close-code handling, and initial state relay support without deciding authoritative room or turn state.

**Acceptance criteria:**
- [ ] The gateway supports `join-room` with the canonical close codes from `docs/specs/05-api-and-realtime.md`.
- [ ] Room access validation is delegated to service-layer authorization.
- [ ] The gateway can return the latest allowed state on join according to policy.

**Verification:**
- [ ] WebSocket tests cover invalid token, forbidden room, missing room, and successful join cases.
- [ ] Manual check: reconnect behavior is not implemented beyond the MVP policy.
- [ ] Manual check: no authoritative mutation happens directly in the gateway.

**Dependencies:** Shared Tasks C1-C2

**Files likely touched:**
- `src/modules/realtime/`
- `src/integrations/websocket/`
- `src/common/`

**Estimated scope:** Medium: 3-5 files

## Task W3-2: Implement code-sync transport and ephemeral session state

**Description:** Add `code-change` to `code-updated` fan-out, current-turn support state caching, and in-memory or Redis-backed latest-file-content buffering without persisting every edit.

**Acceptance criteria:**
- [ ] Only the current turn player may emit editable code changes once integrated with turn ownership checks.
- [ ] Realtime whole-file `content` updates are stored ephemerally, not durably.
- [ ] `code-change` and `code-updated` use canonical whole-file synchronization payloads with `content: string`.
- [ ] The gateway can fan out room-scoped code updates using the canonical event names.

**Verification:**
- [ ] WebSocket tests cover code-change fan-out and unauthorized edit rejection.
- [ ] Manual check: no realtime content persistence is introduced outside the snapshot path.
- [ ] Manual check: Redis usage stays optional and bounded to support state.

**Dependencies:** Task W3-1

**Files likely touched:**
- `src/modules/realtime/`
- `src/integrations/redis/`
- `src/shared/`

**Estimated scope:** Medium: 3-5 files

### Phase 2: Runtime and Execution Support

## Task W3-3: Implement runtime adapter and execution persistence

**Description:** Build the runtime integration layer that prepares mission containers, executes submitted code, and persists execution records with stdout, stderr, exit code, and runtime failure handling.

**Acceptance criteria:**
- [ ] Runtime integration follows the Docker-socket sibling-container model from `docs/specs/07-integrations-and-ai.md`.
- [ ] `executions` persistence supports `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`, and `TIMEOUT`.
- [ ] Runtime failures are represented explicitly without silently converting them into successful mission results.

**Verification:**
- [ ] Tests cover execution status transitions and runtime failure mapping.
- [ ] Manual check: secrets are not exposed through logs or persisted outputs.
- [ ] Manual check: execution records link back to room, mission, turn, and user context.

**Dependencies:** Task W3-2

**Files likely touched:**
- `src/integrations/runtime/`
- `src/modules/executions/`
- `database/migrations/`

**Estimated scope:** Medium: 3-5 files

## Task W3-4: Implement turn-evaluation support path and AI assistive notices

**Description:** Prepare the transport and integration hooks for turn submission results, mission feedback notices, debug summaries, and other assistive AI realtime messages so the shared integration track can connect authoritative turn logic later.

**Acceptance criteria:**
- [ ] Realtime event support exists for `turn-submit`, `turn-evaluated`, `turn-changed`, `game-state-updated`, and `mission-result`.
- [ ] AI assistive notices use the canonical realtime event types without deciding final state.
- [ ] Failure of assistive AI messaging does not block execution persistence or later turn completion.

**Verification:**
- [ ] WebSocket or integration tests cover event emission paths and non-blocking failure behavior.
- [ ] Manual check: canonical event names and payload boundaries match `docs/specs/05-api-and-realtime.md`.
- [ ] Manual check: this stream remains transport and integration support, not lifecycle authority.

**Dependencies:** Task W3-3

**Files likely touched:**
- `src/modules/realtime/`
- `src/modules/executions/`
- `src/integrations/llm/`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Worker 3 Complete

- [ ] Realtime and runtime support layers are independently testable
- [ ] Execution persistence and event hooks are ready for shared Task C4
- [ ] Ready to hand off to shared Tasks C3-C5

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gateway code starts owning room or turn decisions | High | Verify every mutation path delegates to domain services |
| Execution and realtime payloads drift from canonical event contracts | High | Treat `docs/specs/05-api-and-realtime.md` as the fixed external source |
| Redis or runtime assumptions leak into core domain logic | Medium | Hide all vendor details behind `integrations/` adapters |

## Open Questions

- If turn-result payloads require new shared DTOs, make that change through the shared sequential track before downstream workers consume it.
