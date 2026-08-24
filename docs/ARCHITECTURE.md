# Architecture

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript (strict) · Prisma · SQLite (dev) /
Postgres-compatible schema (prod) · Tailwind · Zod · `@anthropic-ai/sdk` · `googleapis` · `cron-parser`.

No separate backend — Server Actions in `src/app/actions.ts` are the API layer. No background worker
process — the Scheduler is a pollable function (`src/lib/scheduler.ts`) triggered by an API route or a
local script, matching Vercel's serverless deployment model rather than assuming a long-running Node
process.

## Directory layout

```
src/
  app/                    Next.js routes (Command Center, Agent pages, Task detail, Review, ...)
    actions.ts            Every state-mutating Server Action — the real "API"
    api/scheduler/tick/   Production scheduler entry point
    api/integrations/     Google OAuth start/callback
  components/             Client components (forms, panels) — thin, call actions.ts directly
  lib/
    agents/
      definitions.ts      The 7 Agent Definitions (identity, policy, prompts) — DATA, not scattered strings
      context-assembler.ts  Builds { system, messages } per spec §47 (Task/Knowledge/Policy/Workflow memory)
      executor.ts          runAgentJob(): the Agent Engine's actual execution loop
    task/state-machine.ts  The ONLY place task.status transitions are decided
    tools/
      registry.ts          Tool Permission Guard (spec §18) — the real enforcement point
      web-search.ts         Search adapter (Live/Mock)
    llm/adapter.ts          Anthropic adapter + Demo Mode
    gmail/adapter.ts         OAuth + Gmail client factory
    storage/adapter.ts       Internal storage now, Drive adapter seam
    knowledge/
      embed.ts               Local hashed-BOW "embedding" (see docs/DATABASE.md)
      rag.ts                 Chunk / index / search
    scheduler.ts             Recurring task tick logic
    json.ts, types.ts, format.ts, audit.ts, workspace.ts
prisma/schema.prisma        Data model (see docs/DATABASE.md)
scripts/smoke-test*.ts      Real end-to-end tests of the Core Loop (no mocking of our own code)
legacy/                     Everything from before this rebuild, preserved untouched
```

## The Agent Engine, concretely

```
Task (clarifying) --advanceClarifyingConversation()--> LLM asked to either ask a
  question or emit a ```brief fence --> TaskBrief drafted --> status: ready
        |
        v  user clicks "이대로 시작" (confirmBriefAndRun)
Task (queued) -> runAgentJob() -> status: working
   -> assembleContext(): Task Memory + Knowledge Memory (RAG) + Agent Policy + Workflow Context
      (+ web.search results pre-fetched for market-researcher)
   -> LLM asked for one JSON ReportDeliverable
   -> parseDeliverable(): strict parse -> brace-extraction fallback -> raw-text fallback
        (never throws the agent's output away over imperfect JSON)
   -> Report + ReportVersion(1) created -> status: review
        |
        v  user approves (tags) or requests revision (feedback)
review --approve--> approved (+ Document/KnowledgeChunk indexed, suggestedHandoffTo returned)
review --revise---> revision -> runAgentJob() again (feedback is appended to the conversation
                     first, so the next run's context includes it) -> review (loop)
```

Every step is real — there is no path where the UI shows an agent "thinking" while nothing actually
runs. `scripts/smoke-test.ts` exercises this whole loop against the actual database and actual (Demo
Mode) LLM adapter and asserts on the resulting rows, not on rendered HTML.

## What's intentionally simplified vs a "real" multi-step agent

The executor does **one LLM call per phase** (one for clarifying, one for execution) rather than an
interactive Anthropic `tool_use` loop where the model can call `web.search`, read the result, decide to
search again, etc. Instead, `context-assembler.ts` pre-fetches what a tool call would have returned
(RAG hits, web search results) and hands it to the model as context in a single shot. This is a real,
honest simplification — not a Potemkin one — but it means an agent can't yet decide *mid-task* "I need
one more search before I can answer." Upgrading to a true iterative tool loop is the natural next step
and doesn't require changing the database shape (`AgentToolCall` already models individual tool calls
for when that loop exists) — only `executor.ts`.

## What's stubbed and exactly how to finish it

| Area | Current state | To finish |
|---|---|---|
| Gmail actual mail ops | OAuth connect/callback real; `list/label/archive/send` not called yet | Implement against `googleapis.gmail` in a new `src/lib/gmail/operations.ts`, gated by `assertPermitted` |
| Google Drive | Adapter interface + OAuth only | Implement `GoogleDriveStorageAdapter` methods against Drive v3 |
| Real embeddings | Local hashed BOW (`src/lib/knowledge/embed.ts`) | Swap `embed()` for a provider call; re-index via `indexDocument()` |
| Web search | Mock by default | Implement `LiveWebSearchAdapter` in `src/lib/tools/web-search.ts` against your chosen provider |
| Transcription | Paste-only (always works) | Implement an adapter in a new `src/lib/transcription/adapter.ts`, call it from a new "upload audio" path in the meeting form |
| Meeting → MeetingActionItem | Mark's report uses the generic `ReportDeliverable.structured` field, not the dedicated `Meeting`/`MeetingActionItem` tables | Add a parser that reads `structured` into `Meeting`+`MeetingActionItem` rows on approval, plus a "[업무 생성]" button per action item calling `createHandoffTask`-like logic |
| Workflow visual editor | Flow View auto-traces Handoff chains | Build a canvas UI writing to `WorkflowNode`/`WorkflowEdge` |
| Auth / multi-workspace | Schema supports it; no login. A site-wide banner (`src/app/layout.tsx`'s `NoAuthBanner`, hidden by setting `AUTH_ENABLED`) and a confirm-through warning page before Google OAuth (`/integrations/connect-warning`) exist specifically because there's no login — don't remove either without adding real auth first | Add NextAuth (or similar), replace `getDefaultWorkspace()`/`getDefaultUser()` with session lookups, then set `AUTH_ENABLED=1` |
| True iterative tool-use loop | Single-shot context injection (see above) | Rewrite `executor.ts` around Anthropic's `tool_use` content blocks |

None of these are "TODO, ran out of time and hoped nobody would notice" — each has a real interface
already in place specifically so the next session can implement just the missing half.
