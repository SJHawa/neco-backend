# Modules and Layering

## Source Layout Contract

The planned backend source layout is:

```text
src/
├── main.ts
├── app.module.ts
├── common/
├── database/
├── integrations/
├── shared/
└── modules/
```

## Top-Level Layer Responsibilities

### `common/`

Framework-level shared code:

- config
- constants
- decorators
- exceptions
- filters
- guards
- interceptors
- middleware
- pipes
- types
- utils

`common/` must not contain business logic.

### `database/`

Database connection and infrastructure setup:

- migrations
- seeds
- database module

### `integrations/`

External system adapters:

- jwt
- redis
- mq
- websocket
- llm
- runtime

Services must go through these adapters rather than calling external libraries directly.

### `shared/`

Cross-domain business-level shared assets:

- DTOs
- enums
- interfaces
- mappers

### `modules/`

Feature-based domain modules. Each module is an independent ownership boundary.

## Internal Module Structure

Each module follows:

```text
modules/{module-name}/
├── controller/
├── service/
├── entity/
├── gateway/   # only when needed
└── {module-name}.module.ts
```

Layer rules:

- `Controller -> Service -> Repository -> Entity`
- `Service -> Integrations`
- controllers and gateways orchestrate only
- entities are never exposed directly as API response models

## Module Ownership

### `auth`

Responsibilities:

- signup
- login
- access-token issuance
- refresh-token rotation

Primary entities:

- `users`
- `refresh_tokens`

### `ai-chat-sessions`

Responsibilities:

- fetch AI chat sessions
- fetch AI chat messages
- accept user messages
- interpret `ROOM_CREATE`, `USER_INVITE`, `ROOM_JOIN`, `USER_INVITE_DENY`, `GAME_START`

Dependencies:

- `integrations/llm`
- room and participant services as needed

### `game-rooms`

Responsibilities:

- list accessible rooms
- create rooms
- return room state
- start games

Dependencies:

- room mission setup
- docker image/runtime preparation

### `game-room-participants`

Responsibilities:

- list participants
- create invitations
- accept invitations
- deny invitations
- process leave

### `game-room-missions`

Responsibilities:

- create mission instances on game start
- track current step
- return hints
- finish missions

### `turns`

Responsibilities:

- create the current turn
- end turns
- create the next turn
- manage submission and timeout state
- persist turn snapshots

### `executions`

Responsibilities:

- persist execution requests
- track execution state
- store stdout, stderr, and exit code

### `mission-results`

Responsibilities:

- persist turn-level and mission-level judgment results
- apply strike counts and step success or failure

### `realtime gateway`

Responsibilities:

- establish WebSocket connections
- authenticate `join-room`
- relay code changes, submissions, and state broadcasts
- return latest state on join when supported by policy

Rule:

- the gateway never decides authoritative state directly

### `docker-images` / runtime integration

Responsibilities:

- map mission templates to runtime images
- prepare containers
- execute commands
- collect results

### prompt-template / AI-template management

Responsibilities:

- manage prompt templates for AI chat intent parsing
- manage templates for feedback, debugging, and judgment assistance

This remains internal or seed-driven in MVP.
