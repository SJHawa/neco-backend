# Implementaion Logs Guide

## Purpose

This directory stores handoff-oriented implementaion logs for work performed against the plans in `docs/plans/`.

The execution, commit, and handoff unit is always the individual task from the assigned plan file.

Use the folder that matches the workstream:

- `common/` for the shared sequential track in `docs/plans/common-sequential-plan.md`
- `worker-1/` for `docs/plans/worker-1-auth-and-ai-chat-plan.md`
- `worker-2/` for `docs/plans/worker-2-room-participant-mission-plan.md`
- `worker-3/` for `docs/plans/worker-3-realtime-runtime-execution-plan.md`

Each log should help the next worker answer four questions quickly:

1. What plan task was worked on?
2. What changed and why does it matter?
3. What dependencies were satisfied, changed, or newly introduced?
4. What must the next worker know before continuing?

## Required Workflow

Before starting work:

1. Read this file.
2. Read `docs/plans/README.md`.
3. Read `docs/plans/common-sequential-plan.md`.
4. Read the assigned worker plan only after the shared foundation checkpoint allows parallel work.
5. Read all existing logs relevant to:
   - the current workstream folder
   - direct dependency tasks from the plan
   - `common/` when the task depends on shared contracts or integration work
6. Check the **Open questions** section of the immediately preceding task log. If any question is still marked `[ ]`, stop and report it before making changes.

After finishing a task:

1. Verify the task using the task-specific checks from the plan.
2. Create exactly one commit for that completed task before starting any new task.
3. Create or update the phase log file in the correct workstream folder.
4. Immediately append one task entry for the completed task.
5. Record the commit hash created for that task entry.
6. Record what the next worker must know, including any effect on other workstreams.

## Folder Structure

```text
docs/implementaion-logs/
├── README.md
├── common/
├── worker-1/
├── worker-2/
└── worker-3/
```

Routing rule:

- Shared foundation, cross-stream integration, and stabilization logs go to `common/`.
- Parallel stream logs stay inside the worker folder that owns the plan file.
- If a worker task forces a shared-contract change, log the worker-local impact in that worker folder and the contract decision in `common/`.

## How to Read Logs

Reading order:

1. Identify the current task in the assigned plan file.
2. Note its dependencies.
3. Read the latest logs for:
   - the current workstream folder
   - `common/` if the task depends on shared contracts
   - any upstream worker folder explicitly referenced by the plan or a prior log
4. Extract anything that affects:
   - file ownership
   - DTO or enum contracts
   - migration order
   - authorization assumptions
   - runtime or realtime behavior
   - follow-up work intentionally deferred

If a previous log conflicts with the current plan or the source specs, do not silently follow the stale log. Note the conflict in the new log and follow `docs/specs/`.

## Relationship to the Plans

The plan files under `docs/plans/` define:

- dependency order
- acceptance criteria
- verification expectations
- which work may run in parallel

The implementaion logs record:

- what actually happened for each completed task
- what the next worker must preserve
- what changed from expectation
- what remains risky or unresolved for downstream work

## File Naming

Prefer one markdown file per phase inside each workstream folder. Example:

- `common/phase-1-foundation.md`
- `common/phase-2-integration.md`
- `worker-1/phase-1-auth.md`
- `worker-2/phase-2-missions.md`
- `worker-3/phase-2-runtime.md`

If a phase becomes too large, split by task range:

- `worker-2/phase-1-lobby-task-w2-1-w2-2.md`
- `common/phase-2-integration-task-c3-c4.md`

## Log Template

```markdown
## [YYYY-MM-DD] [Task ID]: [Task title]

**Plan reference:** `docs/plans/<plan-file>.md`

**Summary:**
- [What was completed]

**Dependencies reviewed before starting:**
- [Plan task or log file reviewed]

**Implementation details:**
- [Key implementation fact]
- [Key implementation fact]

**Files changed:**
- `path/to/file`

**Verification:**
- [x] [Check performed]
- [ ] [Check not performed, with reason]

**Commit:**
- `[commit-hash]` [commit subject]

**Impact on next tasks:**
- [What is now unblocked]
- [What remains constrained]

**Design decisions made:**
- [Decision and rationale]

**Deviations from spec:**
- [Deviation and reason]

**Trade-offs:**
- [Alternative considered and why the chosen approach won]

**Open questions:**
- [ ] [Unresolved question]
- [x] [Resolved question] → [Resolution note]

**Open risks or follow-ups:**
- [Risk or follow-up item]

**Instructions for the next worker:**
- [What to read first]
- [What assumption is safe or unsafe]
- [What must be preserved]
```

## Writing Rules

- Write for the next worker, not for historical completeness.
- Mention exact task IDs from the plan such as `C3` or `W2-4`.
- Focus on information that changes downstream implementation choices.
- Record unresolved issues immediately.
- Do not batch multiple task completions into one log entry.
- Before starting a task, confirm the previous task's open questions are resolved.

## Minimum Handoff Rule

A completed task is not closed until both exist:

- a dedicated commit for that task
- a matching log entry in the correct workstream folder

If you changed anything, leave enough information for the next worker to continue without re-reading the full diff first.
