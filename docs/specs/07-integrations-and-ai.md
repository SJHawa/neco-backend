# Integrations and AI Policy

## Docker or Container Runtime

Responsibilities:

- prepare per-mission execution environments
- issue and track container identifiers
- execute submitted code
- return stdout, stderr, and exit code

Recommended flow:

1. resolve the image referenced by the mission template
2. prepare the runtime container at game start
3. store `game_room_missions.container_id`
4. execute code on each turn submission
5. store the result in `executions`

Failure rule:

- runtime failure is not automatically the same as mission failure
- runtime errors may surface as `mission_results.judge_status = ERROR`

## Confirmed Docker Model

Planned MVP runtime model:

- `docker-compose.yml` contains `app`, `postgres`, and `redis`
- the `app` container mounts `/var/run/docker.sock`
- mission runner images are built locally and loaded into the host Docker engine

Lifecycle:

1. `integrations/runtime` starts one runner container per game at start time
2. the container ID is saved to `game_room_missions.container_id`
3. snapshots are injected through `docker cp` or stdin pipe
4. execution runs through `docker exec`
5. the container is removed when the game ends or fails abnormally

Default limits:

- `--cpus="0.5"`
- `--memory="256m"`
- `--network none`
- read-only root filesystem with writable tmpfs only
- execution time limit: 10 seconds

## LLM Integration

The LLM has three roles:

1. AI chat intent parsing
2. debugging and mission feedback generation
3. realtime assistive notifications
4. invitation briefings and room-summary follow-up messages after state changes

Rules:

- the LLM never modifies authoritative state directly
- every LLM result must be validated by the server before state application
- parsed intents must be converted into internal command DTOs
- mission template card clicks are delivered as natural-language user messages, not a separate `clientAction` payload

## Socket, Redis, and MQ

### WebSocket

- maintains realtime room sessions
- broadcasts per-room state
- distributes whole-file `content`-based code-change events
- supports gameplay-entry, mission-introduction, participant-update, and turn-transition broadcasts through the canonical contract
- includes `fileUrl` values in `game-started` gameplay-entry state so the client can fetch initial file contents

### Redis

- tracks session connectivity support state
- caches current turn support state
- supports multi-instance fan-out when needed later
- may also hold transient broadcast-support state immediately after game start or turn events

### MQ

- reserved for future heavy execution or AI judgment workloads
- MVP may remain synchronous or mixed without a real queue
- sequence-diagram queue boundaries describe an allowed processing shape, not a mandatory MVP component

## AI Game Master Policy

### AI May Decide

- natural-language intent interpretation
- difficulty and template recommendation
- natural-language mission template selection interpretation
- invitation target parsing
- debugging feedback wording
- hint summaries, failure explanations, and notice text

### The Server Must Decide

- whether room creation is allowed
- whether invite targets are valid
- whether room join is allowed
- whether game start is allowed
- who the current turn player is
- when a turn ends
- whether a strike increases
- whether a step clears
- whether the game ends

### AI Usage Policy

- AI request and response pairs should be stored
- incorrect AI intent must not change state unless domain validation passes
- core gameplay must still proceed when AI feedback generation fails

### Hint Policy

- MVP hints should come from `mission_template_step.hint_text` first
- AI-generated hints are optional support, not the primary contract
