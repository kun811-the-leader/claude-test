# Task State Machine, Handoff, Workflow

## State Machine

Single source of truth: `src/lib/task/state-machine.ts`.

```
draft → clarifying → ready → queued → working → review
                                          │  approve → approved
                                          │  revise  → revision → working → review (loop)
approved --(if recurring)--> scheduled --(scheduler tick)--> working → review → ...
any non-terminal state → cancelled
working → failed (agent job crashed) → queued (retry) or cancelled
```

Legacy artifact-board status → new status mapping (`LEGACY_STATUS_MAP` in the same file):

| legacy | new |
|---|---|
| assigned | ready |
| in_progress | working |
| reported | review |
| scheduled | scheduled |
| accepted | approved |
| cancelled | cancelled |

## Recurring tasks: Task-as-template + TaskRun

A recurring task doesn't get a separate `TaskTemplate` row — the `Task` itself holds the schedule
(`isRecurring`, `scheduleType`, `cronExpression`, `nextRunAt`) and never reaches the terminal `approved`
state; approving one run sends it back to `scheduled` instead. Each individual execution is a `TaskRun`
row (`runIndex`, `status`, timestamps) linked 1:1 to that run's `Report`. This means "지난 30일 시장
모니터링 결과를 종합해줘" is answerable by querying `TaskRun`s + their `Report`s for one `Task.id` — no
need to reconstruct history from a pile of separate one-off tasks.

Scheduler idempotency: a task is only picked up when `status === "scheduled"` AND `nextRunAt <= now`.
The moment a run starts, status flips to `working`, so a second tick before the first finishes is a
no-op. Verified in `scripts/smoke-test-recurring.ts`.

## Handoff

`Task.sourceTaskId` / `sourceReportId` link a task to the task it was created from. Nothing is copy-
pasted — `context-assembler.ts` loads the source task's latest approved report summary directly into
the new task's LLM context. `createHandoffTask()` in `src/app/actions.ts` is the only place this
relationship is created; it's always **user-initiated** (an approved report's Agent Definition
`handoffRules.suggestsHandoffTo` renders as buttons, the user picks one) — never automatic, per spec
§27's v1 scope ("초기 버전에서는 자동 생성하지 말고 사용자에게 제안").

## Workflow

`Workflow`/`WorkflowNode`/`WorkflowEdge` tables exist for a future visual editor. Until that's built,
`/workflows` auto-traces Handoff chains (`sourceTaskId` walked forward) into a linear Flow View — real
data, no manual wiring, just not a drag-and-drop canvas yet.
