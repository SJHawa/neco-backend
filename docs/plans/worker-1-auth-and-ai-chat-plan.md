# Implementation Plan: Worker 1 Auth and AI Chat

## Overview

Worker 1 owns authenticated entry and AI-chat-driven command interpretation after the shared foundation is complete. This stream can proceed in parallel because it depends on shared contracts but does not need to own room-state persistence internals beyond service interfaces.

## Architecture Decisions

- Keep Worker 1 inside the `auth` and `ai-chat-sessions` boundaries from `docs/specs/03-modules.md`.
- AI remains assistive only. This stream may parse intents and create chat history, but it must hand authoritative mutations to room and participant services.

## Task List

### Phase 1: Entry and Session Flows

## Task W1-1: Implement auth module and token lifecycle

**Description:** Build signup, login, nickname duplication check, client-supplied `passwordHash` credential handling, automatic AI chat session creation at signup, and hashed refresh-token persistence according to the auth contract and security rules.

**Acceptance criteria:**
- [ ] `GET /v1/auth/check-nickname`, `POST /v1/auth/signup`, `POST /v1/auth/login`, and `POST /v1/auth/refresh-token` match the API contract.
- [ ] `POST /v1/auth/signup` and `POST /v1/auth/login` accept `passwordHash` as a SHA-256 hex string.
- [ ] Successful signup automatically creates exactly one reusable AI chat session for that user.
- [ ] Passwords and raw refresh tokens are never stored directly.
- [ ] Access-token and refresh-token issuance use the shared JWT and environment-loading foundation.

**Verification:**
- [ ] Unit or integration tests cover signup, login failure, refresh rotation, and duplicate nickname checks.
- [ ] Tests cover AI chat session auto-creation during signup and prevent duplicate session creation for one user.
- [ ] Manual check: response wrapper and error shape match `docs/specs/05-api-and-realtime.md`.
- [ ] Manual check: sensitive values are not logged, and the client-supplied `passwordHash` is treated as the stored login credential in MVP.

**Dependencies:** Shared Tasks C1-C2

**Files likely touched:**
- `src/modules/auth/`
- `src/integrations/jwt/`
- `src/database/`

**Estimated scope:** Medium: 3-5 files

## Task W1-2: Implement AI chat session read and message write flow

**Description:** Add the main-entry and detail APIs for AI chat sessions and messages, including stored message history and request tracking for user and assistant turns.

**Acceptance criteria:**
- [ ] `GET /v1/ai-chat-sessions` returns the authenticated user's single AI chat session in MVP.
- [ ] `GET /v1/ai-chat-sessions/{aiChatSessionId}/messages` returns only the authenticated user's data.
- [ ] `POST /v1/ai-chat-sessions/{aiChatSessionId}/messages` persists message and request history with canonical sender and message types.
- [ ] Empty lists and missing-resource behavior follow the API contract.

**Verification:**
- [ ] Tests cover single-session ownership, empty-list behavior only before signup backfill or migration contexts if applicable, and message persistence.
- [ ] Manual check: timestamps serialize in `Asia/Seoul`.
- [ ] Manual check: AI chat tables align with the persistence model in `docs/specs/04-data-model.md`.

**Dependencies:** Task W1-1

**Files likely touched:**
- `src/modules/ai-chat-sessions/`
- `src/shared/`
- `src/database/`

**Estimated scope:** Medium: 3-5 files

### Phase 2: Intent Parsing and Follow-Up Messaging

## Task W1-3: Implement AI intent parsing and internal command mapping

**Description:** Add the LLM-backed intent parsing path that converts user chat into validated internal command DTOs for room creation, invitation, join, denial, and game-start requests.

**Acceptance criteria:**
- [ ] Supported request types are exactly `ROOM_CREATE`, `USER_INVITE`, `ROOM_JOIN`, `USER_INVITE_DENY`, and `GAME_START`.
- [ ] LLM output is validated before any downstream service call is attempted.
- [ ] Natural-language mission template selection messages are handled through the normal chat parsing path, not a separate `clientAction` contract.
- [ ] Failed or ambiguous parsing results in a completed chat response without unauthorized state mutation.

**Verification:**
- [ ] Unit tests cover valid mapping, invalid mapping, and unsupported intent payloads.
- [ ] Manual check: Worker 1 does not decide authoritative state.
- [ ] Manual check: command DTOs remain stable for shared integration Task C3.

**Dependencies:** Task W1-2

**Files likely touched:**
- `src/modules/ai-chat-sessions/`
- `src/integrations/llm/`
- `src/shared/`

**Estimated scope:** Medium: 3-5 files

## Task W1-4: Implement AI follow-up messaging and prompt-template support

**Description:** Add prompt-template handling and assistant follow-up generation for room creation guidance, invitation summary, invitation briefing, and mission or room summary messages without changing authoritative state ownership.

**Acceptance criteria:**
- [ ] Prompt templates are seed-driven and managed internally as described in `docs/specs/03-modules.md` and `docs/specs/08-security-testing-and-delivery.md`.
- [ ] Follow-up messages exist for room creation, invitation, acceptance, denial, and start-preparation support.
- [ ] AI feedback failure does not block core chat persistence or later room-state processing.

**Verification:**
- [ ] Tests cover fallback behavior when prompt templates or LLM feedback fail.
- [ ] Manual check: stored AI request and response pairs follow the AI usage policy.
- [ ] Manual check: no prompt-template handling leaks secrets or bypasses validation.

**Dependencies:** Task W1-3

**Files likely touched:**
- `src/modules/ai-chat-sessions/`
- `src/modules/prompt-template/`
- `database/seeds/`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Worker 1 Complete

- [ ] Auth and AI chat APIs are independently testable
- [ ] Intent DTOs are ready for shared integration
- [ ] Ready to hand off to shared Task C3

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM output shape drifts from internal DTO assumptions | High | Validate every parsed command against shared DTOs before use |
| Auth and AI chat both need shared user or token entities | Medium | Keep entity ownership aligned with shared persistence conventions from Task C2 |
| Worker 1 starts mutating room state directly | High | Restrict state changes to downstream service calls and verify in shared Task C3 |

## Open Questions

- If follow-up message payloads need new canonical API fields, escalate that change through the shared sequential track before implementation.
