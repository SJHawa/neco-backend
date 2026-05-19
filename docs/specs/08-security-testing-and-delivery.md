# Security, Testing, and Delivery

## Security Rules

### Authentication

- all APIs require `Bearer` access tokens by default
- access tokens should be short-lived
- refresh tokens are stored as hashes
- `POST /v1/auth/signup` and `POST /v1/auth/login` accept `passwordHash` as a SHA-256 hex string supplied by the client

### Authorization

- users may read only their own chat sessions
- users may access only rooms they belong to
- only the invited user may accept or deny that invitation
- only the room owner may start the game
- only the current turn player may submit the turn

### Resource Validation

Resource checks must be performed in the service layer, not only in guards.

Examples:

- `participant.userId === currentUserId`
- `gameRoom.ownerUserId === currentUserId`
- `turn.playerUserId === currentUserId`

### Sensitive Data

- never store raw passwords
- treat the client-supplied `passwordHash` as the stored login credential in MVP
- do not apply additional server-side password hashing in the current MVP contract
- never store raw refresh tokens
- never log access or refresh tokens
- protect runtime secrets from leaking through stdout or stderr

### External Secret Management

- LLM and runtime access keys must be managed through environment variables
- secrets must not be exposed in code or logs

## Performance and Realtime Constraints

- do not persist every realtime content update
- keep runtime startup and execution timeout separate
- AI feedback failure must not block turn completion
- MVP does not support reconnection
- server time is the source of truth for deadlines

## Reconnection Policy

MVP does not support reconnect-and-resume.

When a WebSocket connection drops:

- the participant becomes `LEFT`
- `room-participants-updated` is broadcast
- if that player owned the current turn during `IN_PROGRESS`, the turn is closed as `TIMEOUT`
- if remaining `JOINED` users fall below `min_participants`, the room is finished
- the same user may not auto-resume without a new invitation

## Test Strategy

### Unit Tests

Focus areas:

- auth service
- AI chat intent mapper and validator
- room start validation
- invitation, join, and denial validation
- turn submission validation
- mission result aggregation
- runtime and LLM adapter mapping

### Integration Tests

Focus areas:

- signup and automatic AI chat session creation
- game start mission and turn initialization
- invite acceptance and denial transitions
- snapshot, execution, and result persistence on turn submit
- room-owner authorization
- hint retrieval
- duplicate `WAITING` room prevention

### WebSocket Scenario Tests

- `join-room` initial state
- `code-change` to `code-updated`
- `turn-submit` to `turn-evaluated` to `turn-changed`
- `game-started` receive-and-enter flow
- `game-started` file metadata plus `fileUrl` delivery for initial editor loading

### Spec Validation Scenarios

- signup -> automatic AI chat session creation -> login -> main entry
- AI chat room creation -> invitation -> acceptance -> game start
- code sync -> submit -> failed judgment -> next turn
- final turn submit -> final broadcast -> finish
- hint retrieval, AI feedback failure, Docker execution failure, and reconnect policy

## Delivery Phases

### Phase 1: Shared Foundation and Fixed Contracts

- create `docker-compose.yml`
- define app and runner Dockerfiles
- scaffold the NestJS source tree
- choose ORM and create migration/seed layout
- implement shared response, exception filter, and request ID interceptor
- centralize shared enums and constants
- add JWT guard and environment loading

### Phase 2: Parallel Streams

- auth and AI chat
- room, participant, and mission state
- realtime, runtime, and execution plumbing

### Phase 3: Core Gameplay Pipeline

- connect AI chat commands to room lifecycle
- implement game start, turn transition, snapshots, and mission results
- implement broadcast sequencing

### Phase 4: External Integrations and Judgment Hardening

- prompt-template handling
- hint API
- runtime execution integration
- stdout/stderr/exit code persistence

### Phase 5: Stabilization

- document-driven E2E scenario checks
- timeout, duplicate submit, and authorization error coverage
- state-name mismatch cleanup
- logging and observability hardening

## Conflict Policy

### Source of Truth

- The spec files in `docs/specs/` are the implementation source of truth for this repository state.
- Code must be written to match the specs, not the other way around, unless a human explicitly revises the spec.

### When Spec and Code Differ

Do not invent a resolution.

1. Identify the conflicting files and the exact field, status, flow, or rule.
2. Follow document precedence from [`00-overview.md`](./00-overview.md).
3. If the precedence order resolves it clearly, implement to the higher-priority spec and note the lower-priority mismatch.
4. If the conflict is between spec and code without a clear higher-priority spec, stop and ask for human clarification instead of guessing.

### Current Confirmed Decisions

- `TurnStatus = IN_PROGRESS | SUBMITTED | TIMEOUT`
- MVP room-state runtime path is `WAITING -> IN_PROGRESS -> FINISHED`
- realtime code sync uses whole-file `content` fan-out, not CRDT/Yjs
- Docker runtime uses sibling containers through mounted Docker socket
- prompt templates are seed-driven
- timeout follows the same judgment path as submit
- WebSocket reconnection is not supported in MVP
- all timestamps are serialized in `Asia/Seoul`
- pagination is not supported in MVP
