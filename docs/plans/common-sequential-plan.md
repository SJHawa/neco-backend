# Implementation Plan: Shared Sequential Track

## Overview

This track covers the work that must remain sequential because it defines repository-wide contracts or integrates outputs from multiple worker streams. It acts as the dependency gate before parallel work starts and the merge path after the three worker streams finish.

## Architecture Decisions

- Shared contracts come first. Response wrappers, enums, request metadata, ORM layout, and migration strategy must be fixed before worker streams can safely diverge.
- Cross-stream integration returns to the shared track. Room lifecycle, turn progression, and final verification depend on outputs from auth/AI chat, room state, and realtime/runtime work together.

## Task List

### Phase 1: Shared Foundation

## Task C1: Scaffold application and infrastructure baseline

**Description:** Create the initial NestJS source layout, Docker Compose baseline, runtime container definitions, and environment-loading foundation described in the specs so all later tasks build on the same project shape.

**Acceptance criteria:**
- [ ] `src/`, `database/`, `integrations/`, `shared/`, and `modules/` follow the module layout contract from `docs/specs/03-modules.md`.
- [ ] `docker-compose.yml` and app or runner Dockerfiles match the runtime assumptions from `docs/specs/01-architecture.md` and `docs/specs/07-integrations-and-ai.md`.
- [ ] Environment loading is established for JWT, PostgreSQL, Redis, LLM, and runtime settings.

**Verification:**
- [ ] Repository scaffold matches the planned structure by inspection.
- [ ] Docker and config files can be reviewed against the relevant specs without unresolved contract gaps.
- [ ] Manual check: confirm no worker plan needs to invent its own bootstrap structure.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `src/main.ts`
- `src/app.module.ts`
- `docker-compose.yml`
- `Dockerfile`
- `database/`

**Estimated scope:** Large: 5+ files

## Task C2: Establish shared contracts and persistence conventions

**Description:** Implement the cross-cutting contracts that every worker depends on: response envelope, exception handling, request ID propagation, shared enums or constants, ORM selection, migration layout, and base authorization guard structure.

**Acceptance criteria:**
- [ ] API response wrapper and error format match `docs/specs/05-api-and-realtime.md`.
- [ ] Shared enums cover the canonical status sets from `docs/specs/04-data-model.md` and `docs/specs/05-api-and-realtime.md`.
- [ ] ORM, migration, and seed layout are fixed so worker streams can add tables and modules without redefining persistence conventions.

**Verification:**
- [ ] Targeted tests or bootstrap smoke checks exist for response and error formatting once the scaffold is runnable.
- [ ] Manual check: enum names and serialization conventions match the specs exactly.
- [ ] Manual check: worker plans can reference a single shared migration and DTO strategy.

**Dependencies:** Task C1

**Files likely touched:**
- `src/common/`
- `src/shared/`
- `src/database/`
- `database/migrations/`
- `database/seeds/`

**Estimated scope:** Large: 5+ files

### Checkpoint: Shared Foundation

- [ ] Tasks C1-C2 are complete
- [ ] Shared contracts are stable enough for three workers to proceed independently
- [ ] Human review confirms the worker split can start

### Phase 2: Cross-Stream Integration

## Task C3: Integrate AI chat commands with room lifecycle

**Description:** Connect the AI chat command flow from Worker 1 to the room, participant, and mission services from Worker 2 so `ROOM_CREATE`, `USER_INVITE`, `ROOM_JOIN`, `USER_INVITE_DENY`, and `GAME_START` mutate state through server-owned validation paths.

**Acceptance criteria:**
- [ ] AI chat commands resolve into internal DTOs and validated service calls only.
- [ ] Room creation, invitation, acceptance, denial, and game-start preparation follow the pipelines from `docs/specs/06-gameplay-lifecycle.md`.
- [ ] AI parsing failures or invalid commands do not produce authoritative state changes.

**Verification:**
- [ ] Integration tests cover AI-chat-led room creation and invitation flows.
- [ ] Manual check: state transitions still match canonical enums and membership rules.
- [ ] Manual check: no integration bypasses the service-layer authority rule.

**Dependencies:** Task C2, Worker 1 completion, Worker 2 completion

**Files likely touched:**
- `src/modules/ai-chat-sessions/`
- `src/modules/game-rooms/`
- `src/modules/game-room-participants/`
- `src/shared/`

**Estimated scope:** Medium: 3-5 files

## Task C4: Connect game start, turn progression, and mission-result flow

**Description:** Merge room-state logic, realtime events, runtime execution, snapshot persistence, and mission-result handling into one authoritative gameplay pipeline covering game start through final mission completion.

**Acceptance criteria:**
- [ ] Game start creates room mission, mission steps, first turn, and broadcasts initial gameplay state.
- [ ] `game-started` payload includes initial editor file metadata and `fileUrl` values required by the canonical contract.
- [ ] Turn submit and timeout both persist snapshots, execution records, and evaluation outcomes before the next turn is created.
- [ ] Final mission completion updates room and mission state and emits the required final broadcasts.

**Verification:**
- [ ] Integration tests cover game start, turn submit, timeout, and completion paths.
- [ ] WebSocket scenario tests cover `game-started`, `turn-evaluated`, `turn-changed`, and `mission-result`.
- [ ] Manual check: `game-started` gameplay-entry state is sufficient for file-list rendering and initial editor loading without extra bootstrap fetches beyond `fileUrl`.
- [ ] Manual check: server authority boundaries remain intact around AI and realtime layers.

**Dependencies:** Task C3, Worker 2 completion, Worker 3 completion

**Files likely touched:**
- `src/modules/game-rooms/`
- `src/modules/turns/`
- `src/modules/mission-results/`
- `src/modules/realtime/`
- `src/integrations/runtime/`

**Estimated scope:** Large: 5+ files

### Checkpoint: Cross-Stream Integration

- [ ] Tasks C3-C4 are complete
- [ ] Main entry to gameplay flow works end-to-end
- [ ] Cross-worker contracts remain aligned with `docs/specs/05-api-and-realtime.md`

### Phase 3: Stabilization

## Task C5: Harden timeout, authorization, and scenario coverage

**Description:** Finish the sequential track with the cross-cutting validation that cannot be owned by a single worker: timeout behavior, duplicate submit handling, room and turn authorization, reconnect policy, and end-to-end scenario checks.

**Acceptance criteria:**
- [ ] Timeout follows the same persistence and judgment path as manual submit.
- [ ] Authorization checks enforce room membership, room ownership, invited-user ownership, and current-turn-player submission rules.
- [ ] Document-driven scenario tests cover the core MVP flows and key failure paths from `docs/specs/08-security-testing-and-delivery.md`.

**Verification:**
- [ ] Integration and WebSocket scenario tests cover the spec validation flows.
- [ ] Manual check: reconnect policy and `LEFT` transition behavior match the specs.
- [ ] Manual check: any remaining spec mismatches are documented before handoff.

**Dependencies:** Task C4

**Files likely touched:**
- `test/`
- `src/modules/`
- `src/common/`
- `docs/implementaion-logs/common/`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Complete

- [ ] All shared-track acceptance criteria are met
- [ ] Worker-stream outputs are integrated without contract drift
- [ ] Ready for implementation handoff or execution

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared enums or payload shapes change after worker branches start | High | Freeze contracts in Tasks C1-C2 and route later changes through the shared track only |
| Game lifecycle integration exposes spec mismatches late | High | Use Tasks C3-C4 as explicit contract-reconciliation checkpoints against `docs/specs/05-api-and-realtime.md` and `docs/specs/06-gameplay-lifecycle.md` |
| Realtime and runtime flows drift from persistence model | Medium | Keep snapshot, execution, and mission-result persistence verification inside the shared integration track |

## Open Questions

- None at planning time. If a worker needs to change shared enums, migrations, or canonical event payloads, the change must be escalated back into this shared track.
