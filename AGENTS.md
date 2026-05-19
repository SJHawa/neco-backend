# AGENTS.md

Use the smallest safe change that satisfies the user's goal. Let the task context determine how much planning, clarification, implementation, retrieval, and verification are needed.

Prefer outcome-first execution over process-heavy behavior. Define the goal, make the smallest safe change, verify what matters, then stop.

## 1. Collaboration style

Be concise, direct, and practical.

Prefer making progress over stopping for clarification when the request is clear enough to attempt. Ask only when missing information would materially affect correctness, data safety, security, public API behavior, user-visible behavior, or irreversible work.

When ambiguity is low-risk, make a conservative assumption, state it briefly if it matters for review, and continue.

When disagreeing with a requested approach, explain the tradeoff and suggest the simpler or safer alternative.

## 2. Understand the task before changing code

Before editing, classify the task:

- trivial change: typo, copy, formatting, config value, small documentation update
- bug fix: existing behavior is wrong
- feature change: new behavior is requested
- refactor: structure changes without intended behavior change
- risky change: auth, security, data, schema, migration, public API, payment, permissions, privacy, or destructive operations

Use the classification to choose the appropriate level of planning, implementation, and verification.

For multi-step, risky, or tool-heavy tasks, start with a brief user-visible update that states the intended approach. Keep it to one or two sentences. Do not narrate every command or low-level operation.

### Spec-first server development

For backend and server-facing work, read the relevant files under `docs/specs/` before changing code or writing new specs.

- Treat `docs/specs/` as the implementation source of truth.
- Use the smallest spec set needed for the task.
- If implementation ideas conflict with the specs, do not silently optimize around the specs. Resolve against the documented policy first.

## 3. Success criteria

A task is complete when:

- The requested behavior is implemented with the smallest safe change.
- The change is scoped to the user's goal.
- Relevant validation has passed, or the reason validation could not be run is clearly stated.
- Any assumption, blocker, skipped check, or follow-up risk is called out.
- The final response summarizes what changed and how it was verified.

Do not expand the task to improve unrelated code, add optional features, or perform speculative cleanup.

## 4. Choose the smallest safe implementation

Default to direct code.

Add abstraction only when justified by at least one of the following:

- current duplication exists
- domain behavior becomes clearer
- testability materially improves
- the existing codebase already uses the abstraction pattern locally

Do not add speculative flexibility for future requirements.

Avoid:

- features beyond what was requested
- configuration options that were not requested
- generic frameworks for one-off behavior
- broad rewrites when a local change is enough
- error handling for scenarios that cannot realistically occur in the current design

Before expanding scope, check whether the extra work is necessary for the stated goal. If not, leave it out.

## 5. Keep the diff local and reviewable

Change only the files and lines needed for the requested behavior.

Match local style, naming, formatting, file organization, testing patterns, and error-handling conventions, even if a different style would be preferable in isolation.

Adjacent cleanup is allowed only when your change would otherwise leave the code inconsistent, unsafe, untyped, failing tests, or difficult to verify.

When your own change creates unused imports, variables, functions, files, or dead branches, remove them.

If you notice unrelated issues, mention them instead of fixing them.

Every changed line should be traceable to the user's request, required validation, or cleanup caused by your own change.

## 6. Retrieval budget

Use existing repository context first.

Read or search additional sources only when needed to answer or implement safely.

Retrieve more information when:

- the task depends on a specific library, framework, API, version, error message, or external behavior
- the repository does not contain enough evidence to make the change safely
- a specific document, URL, issue, ticket, design note, or code artifact must be read
- the user asks for current, source-backed, or exhaustive information
- the answer would otherwise rely on an unsupported factual claim

Stop retrieving once there is enough evidence to implement or answer the core request correctly.

Do not keep searching to improve phrasing, collect nonessential examples, or justify generic statements.

Prefer authoritative sources such as official documentation, repository code, project docs, specs, or directly relevant issues.

### Spec routing

When the task touches one of the following areas, read these files first:

- Project purpose, domain terms, or scope:
  - `docs/specs/00-overview.md`
- System boundaries, runtime architecture, infrastructure assumptions, or external services:
  - `docs/specs/01-architecture.md`
- Domain entities, business concepts, or invariants:
  - `docs/specs/02-domain-model.md`
- Module ownership, responsibilities, dependencies, and layering:
  - `docs/specs/03-modules.md`
- Database schema, persistence rules, indexes, or durable vs ephemeral state:
  - `docs/specs/04-data-model.md`
- HTTP API, WebSocket contracts, enums, error codes, auth exceptions, or payload expectations:
  - `docs/specs/05-api-and-realtime.md`
- User flows, sequence behavior, room lifecycle, turn lifecycle, timeout, or game progression:
  - `docs/specs/06-gameplay-lifecycle.md`
- Docker runtime, Redis, MQ, LLM, hint policy, or AI authority boundaries:
  - `docs/specs/07-integrations-and-ai.md`
- Security rules, reconnection policy, testing scope, milestones, or conflict handling:
  - `docs/specs/08-security-testing-and-delivery.md`

## 7. Verification proportional to risk

Run the narrowest useful validation available.

Choose validation based on task type:

- trivial change: run only a lightweight relevant check if available
- bug fix: prefer a regression test that reproduces the bug, then make it pass
- feature change: test the new behavior and important edge cases
- refactor: verify behavior before and after when practical
- risky change: run targeted tests plus typecheck, lint, build, migration check, or smoke test as relevant

For coding tasks, prefer these checks when applicable:

- targeted unit tests for changed behavior
- integration tests for affected flows
- type checks
- lint checks
- build checks for affected packages
- minimal smoke tests when full validation is too expensive

If full validation is expensive, unavailable, or unnecessary, run the smallest check that gives useful confidence.

If validation cannot be run, state exactly:

- what was not run
- why it was not run
- the next best check the user should run

Never claim validation passed if it was not actually run.

Do not delete, disable, skip, weaken, or rewrite failing tests merely to make the test suite pass unless the user explicitly approves that change. If a test is obsolete or incorrect, explain why and ask before removing or weakening it.

## 8. Stop rules

Stop and respond when the requested goal is met and the narrowest useful validation has passed.

Do not continue modifying code for optional polish, unrelated cleanup, broader refactors, extra abstractions, or speculative future requirements.

Stop and ask only when missing information materially affects correctness, data safety, security, public API behavior, user-visible behavior, or irreversible work.

If blocked by missing dependencies, failing environment setup, unavailable credentials, unclear requirements, or external service access, report the blocker and the next best path.

If tests fail for reasons unrelated to your change, do not fix unrelated failures unless asked. Report the failure and explain why it appears unrelated.

### Conflict policy

When specs and code differ, do not make an arbitrary judgment.

1. Identify the conflicting file, field, status, flow, or rule precisely.
2. Apply the precedence defined in `docs/specs/00-overview.md`.
3. If the higher-priority spec is clear, implement to that spec and mention the mismatch in the final response.
4. If the conflict is not resolved by precedence, stop and ask for clarification rather than guessing.

## 9. Final response format

For completed coding tasks, respond concisely with:

- What changed
- How it was verified
- Any assumptions, skipped checks, blockers, or follow-up risks

Do not include large code dumps unless requested.

Do not over-explain implementation details that are obvious from the diff.

If no files were changed, clearly state that.

## 10. Project commands

Current repository state:

- There is no `package.json`, `src/`, or runnable application scaffold yet.
- Treat the repository as a documentation-first planning repository until the backend scaffold is added.

Current commands:

- Install: not available yet
- Dev: not available yet
- Test: not available yet
- Targeted test: not available yet
- Typecheck: not available yet
- Lint: not available yet
- Build: not available yet

Planned commands after the NestJS backend is scaffolded:

- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Targeted test: `pnpm test -- <path-or-pattern>`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Build: `pnpm build`

Use the most specific command that validates the changed behavior.

## 11. Project-specific notes

- Package manager: none installed yet; planned package manager is `pnpm`
- Runtime: source code not scaffolded yet; planned runtime is Node.js
- Framework: source code not scaffolded yet; planned framework is NestJS
- Test framework: not configured yet
- Formatting: no formatter config present yet
- Linting: no linter config present yet
- Main source directory: not present yet; planned directory is `src/`
- Main test directory: not present yet; likely module-local tests under `src/modules/**` plus integration coverage to be added with the scaffold
- Environment variables: not defined in repository yet; expected future secrets include JWT, PostgreSQL, Redis, LLM, and runtime integration settings
- Deployment/build target: currently documentation only; planned target is Docker Compose with `app`, `postgres`, and `redis`

Follow existing local conventions over generic preferences.
