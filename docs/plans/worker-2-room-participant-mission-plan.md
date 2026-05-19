# Implementation Plan: Worker 2 Room, Participant, and Mission State

## Overview

Worker 2 owns the authoritative room-state domain: rooms, participants, mission instances, mission steps, hints, and the parts of game start that can be built without realtime or execution wiring. This stream can run in parallel after shared contracts are fixed.

## Architecture Decisions

- Keep all room and membership transitions inside service-layer authorization boundaries.
- Build room creation, invitation, and mission lifecycle as domain services first so shared integration can connect AI chat and realtime on top of stable room-state behavior.

## Task List

### Phase 1: Lobby and Membership State

## Task W2-1: Implement room and participant persistence model

**Description:** Create the persistent entities, repositories, migrations, enums, and service-layer validations for rooms and room participants, including owner and membership lifecycle rules.

**Acceptance criteria:**
- [ ] `game_rooms` and `game_room_participants` match the data model and canonical status sets.
- [ ] Owner and invited-user authorization checks are enforced in the service layer.
- [ ] Duplicate membership and invalid transition rules are rejected explicitly.
- [ ] One user cannot belong to more than one `WAITING` room at the same time.

**Verification:**
- [ ] Tests cover room ownership, duplicate invite prevention, accept or deny ownership checks, and membership transition rules.
- [ ] Tests cover prevention of duplicate `WAITING` room creation or join for the same user.
- [ ] Manual check: database column naming and indexes follow `docs/specs/04-data-model.md`.
- [ ] Manual check: no direct gateway or controller logic bypasses service validation.

**Dependencies:** Shared Tasks C1-C2

**Files likely touched:**
- `src/modules/game-rooms/`
- `src/modules/game-room-participants/`
- `database/migrations/`

**Estimated scope:** Medium: 3-5 files

## Task W2-2: Implement main-entry room and participant query APIs

**Description:** Add the main-entry list APIs that let authenticated users fetch accessible rooms and room-participant state before gameplay begins.

**Acceptance criteria:**
- [ ] `GET /v1/game-rooms` returns only rooms the user can access.
- [ ] `GET /v1/game-rooms` never returns more than one `WAITING` room for the same user.
- [ ] `GET /v1/game-room-participants` returns participant state relevant to the authenticated user.
- [ ] Empty-list and missing-resource behavior match the API contract.

**Verification:**
- [ ] Tests cover ownership-based filtering and empty-list behavior.
- [ ] Manual check: multiple `WAITING` rooms for one user are treated as an abnormal state rather than a supported contract shape.
- [ ] Manual check: response shape and timestamps follow the canonical API rules.
- [ ] Manual check: lobby re-entry semantics remain compatible with `docs/specs/06-gameplay-lifecycle.md`.

**Dependencies:** Task W2-1

**Files likely touched:**
- `src/modules/game-rooms/`
- `src/modules/game-room-participants/`
- `src/shared/`

**Estimated scope:** Small: 1-2 files

### Phase 2: Mission Lifecycle

## Task W2-3: Implement mission template, room mission, and game-start domain services

**Description:** Build the persistent mission-template and room-mission domain pieces needed for room creation follow-up and game start, including first-step readiness and mission container metadata.

**Acceptance criteria:**
- [ ] Mission template and mission step persistence match `docs/specs/02-domain-model.md` and `docs/specs/04-data-model.md`.
- [ ] Game-start domain logic creates `game_room_mission`, `game_room_mission_steps`, and initial ready state without yet depending on realtime broadcasts.
- [ ] Room status changes obey `WAITING -> IN_PROGRESS` rules only when owner and participant constraints pass.

**Verification:**
- [ ] Tests cover owner-only start, minimum participant validation, and first-step initialization.
- [ ] Manual check: status names remain canonical.
- [ ] Manual check: runtime container identifiers are stored as mission metadata, not invented elsewhere.

**Dependencies:** Task W2-2

**Files likely touched:**
- `src/modules/game-room-missions/`
- `src/modules/game-rooms/`
- `database/migrations/`

**Estimated scope:** Medium: 3-5 files

## Task W2-4: Implement hint retrieval and mission completion state transitions

**Description:** Add the mission hint API and the room-mission state helpers needed later by turn evaluation and final completion, using mission-template hint text as the MVP source of truth.

**Acceptance criteria:**
- [ ] `GET /v1/game-room-missions/{missionId}/hints?scope=current-step` returns hint data from the current mission step.
- [ ] Mission step transitions support `LOCKED`, `READY`, `IN_PROGRESS`, `CLEARED`, and `FAILED`.
- [ ] Completion helpers support final mission finish and strike-limit termination without depending on AI-generated hints.

**Verification:**
- [ ] Tests cover current-step hint retrieval and invalid mission access.
- [ ] Manual check: hint policy matches `docs/specs/07-integrations-and-ai.md`.
- [ ] Manual check: helper APIs are ready for shared Tasks C3-C4 without changing canonical contracts.

**Dependencies:** Task W2-3

**Files likely touched:**
- `src/modules/game-room-missions/`
- `src/modules/mission-results/`
- `src/shared/`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Worker 2 Complete

- [ ] Room, participant, and mission services are independently testable
- [ ] Game-start domain logic is ready for shared integration
- [ ] Ready to hand off to shared Tasks C3-C4

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Membership and room-state transitions drift from API enums | High | Derive validations from shared enums fixed in Task C2 |
| Mission lifecycle assumes realtime or runtime details too early | Medium | Keep Worker 2 limited to authoritative persistence and domain services |
| Hint API becomes AI-dependent | Medium | Keep `mission_template_step.hint_text` as the primary contract |

## Open Questions

- If room summary payloads require new fields for AI follow-up or realtime entry, coordinate those changes through the shared sequential track instead of extending this stream unilaterally.
