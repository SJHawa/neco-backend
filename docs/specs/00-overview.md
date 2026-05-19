# Neco-Naeco Backend Overview

## Purpose

This spec set is the implementation source of truth for the `neco-naeco` backend. It is intended to be directly actionable for backend implementation, not a high-level introduction only.

It fixes the following boundaries:

- module responsibilities
- state transitions and their owners
- HTTP and WebSocket contracts
- AI decision boundaries versus server authority
- transaction boundaries and failure handling

## Scope

This spec set covers the MVP backend design for:

- a single NestJS server
- PostgreSQL-backed persistence
- WebSocket-based realtime gameplay synchronization
- Docker or external container runtime mission execution
- LLM-based AI chat, feedback, and judgment assistance

## MVP Scope

Included:

- signup, login, and token refresh
- AI-chat-driven room creation, invitation, acceptance, denial, and game start preparation
- persistence for rooms, participants, missions, turns, snapshots, execution results, and judgment results
- realtime synchronization for participants, code, turns, and results
- mission runtime preparation and code execution requests
- AI game-master intent parsing, mission feedback, hints, and realtime notices

Excluded:

- ranking, profile, friend list, and replay
- payments, shops, and achievements
- GUI desktop environments inside containers
- large-scale traffic distribution, multi-region, and HA automation
- automatic multi-provider LLM failover
- complex operations console or admin back office

## Core MVP Constraints

- All resource access is restricted to authenticated users.
- The server owns the authoritative game state.
- AI may suggest transitions or explanations, but the server applies the final state change.
- Realtime code sync is collaborative state only; only turn-end snapshots are persisted.
- Mission execution must run in an isolated runtime, not inside the application process.

## Repository Facts

- As of May 19, 2026, this repository contains design documents only and does not yet contain executable backend source such as `src/` or `package.json`.
- `docs/etc/*.md` is the current design source set.
- `README.md` currently contains only the repository name.
- The wiki in `docs/specs/` exists to make those design decisions easier to route and consume.

## Source Hierarchy

When documents disagree, use this order:

1. [`05-api-and-realtime.md`](./05-api-and-realtime.md) for external API and event contracts
2. [`04-data-model.md`](./04-data-model.md) for persistent storage structure
3. [`03-modules.md`](./03-modules.md) for server boundaries and layering
4. [`06-gameplay-lifecycle.md`](./06-gameplay-lifecycle.md) for intended flow and sequence context
5. [`08-security-testing-and-delivery.md`](./08-security-testing-and-delivery.md) for operational constraints, decisions, and open risks

## Reading Guide

- Project purpose, terms, and scope: this file
- System boundaries and runtime architecture: [`01-architecture.md`](./01-architecture.md)
- Domain entities and invariants: [`02-domain-model.md`](./02-domain-model.md)
- Module ownership and layering: [`03-modules.md`](./03-modules.md)
- Database structure and persistence rules: [`04-data-model.md`](./04-data-model.md)
- HTTP and WebSocket contract: [`05-api-and-realtime.md`](./05-api-and-realtime.md)
- User flow, sequence flow, and state transitions: [`06-gameplay-lifecycle.md`](./06-gameplay-lifecycle.md)
- Docker, LLM, socket, and AI policy: [`07-integrations-and-ai.md`](./07-integrations-and-ai.md)
- Security, testing, milestones, and conflict handling: [`08-security-testing-and-delivery.md`](./08-security-testing-and-delivery.md)

## Source Documents Used

- `docs/etc/tech-spec.md`
- `docs/etc/api-spec.md`
- `docs/etc/erd.md`
- `docs/etc/folder-structure.md`
- `docs/etc/sequence-diagram.md`
- `docs/etc/user-flow.md`
