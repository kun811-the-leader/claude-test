# Database

Schema: `prisma/schema.prisma`. Provider is `postgresql`. Migrations are real and committed
(`prisma/migrations/`) — local dev uses `npm run db:migrate` (`prisma migrate dev`, generates + applies
a migration), everywhere else uses `npm run db:deploy` (`prisma migrate deploy`, applies committed
migrations only, never generates new ones). `npm run build` runs `db:deploy` automatically, so Vercel
applies pending migrations on every deploy with no manual step. Verified against a real local
Postgres 16.

## Connection pooling (required for serverless)

The datasource block declares two URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — the running app queries through this
  directUrl = env("DIRECT_URL")     // unpooled — migrations use this instead
}
```

Why both: a serverless platform (Vercel) can spin up many function instances concurrently, each
potentially opening its own Postgres connection. Without pooling, a burst of traffic exhausts Neon's
(or any Postgres's) connection limit fast. Routing normal app queries through a pooler (PgBouncer, which
Neon provides built-in — the `-pooler` host) fixes that. But `prisma migrate deploy`/`db push` run DDL
and take advisory locks that PgBouncer's transaction-pooling mode doesn't support, so those specifically
need the direct, unpooled connection — that's what `directUrl` is for. Prisma picks the right one
automatically depending on what command you're running; nothing in application code needs to know the
difference.

Get both strings from your Neon project dashboard: "Pooled connection" → `DATABASE_URL`, "Direct
connection" → `DIRECT_URL`. See `docs/DEPLOYMENT.md` for the full setup walkthrough.

## Why "enum" and "Json" columns are plain String

The schema was originally built against SQLite (whose Prisma connector has neither native `Json` nor
native enums) and stayed that way after moving to Postgres, on purpose — no migration needed, and one
fewer thing to keep in sync between the TypeScript layer and the database:

- Every "enum" (`Task.status`, `Approval.decision`, ...) is a plain `String` column, validated at the
  application boundary by the zod enums in `src/lib/types.ts` — never compared against a raw string
  literal anywhere else.
- Every "Json-shaped" column (`Agent.responsibilities`, `ReportVersion.sources`, ...) is a `String`
  holding serialized JSON, always read/written through `src/lib/json.ts`'s `toJson`/`fromJson` — never
  `JSON.parse`/`stringify` ad hoc.

Postgres itself fully supports native `Json`/`jsonb` and enum types now that we're on it — converting
these columns is a real, available cleanup, just not required for anything to work. If you do it, the
only files that need to change are `prisma/schema.prisma` (drop `// string[]`-style String fields to
native `Json`) and `src/lib/json.ts`'s call sites (which become no-ops).

## Embeddings: local now, pgvector later

`KnowledgeChunk.embedding` is a `String` holding a JSON float array today (see
`src/lib/knowledge/embed.ts` — a deterministic hashed bag-of-words vector, real and functional but
closer to keyword search than true semantic search). `src/lib/knowledge/rag.ts` does the cosine-
similarity ranking in application code, capped at a 2000-chunk scan per query — fine at this scale,
not fine at 100k+ chunks.

To upgrade: on Postgres, add a native `vector` column (the `pgvector` extension) to `KnowledgeChunk`,
replace `embed()` with a real embedding provider call, and replace the manual cosine-similarity loop in
`searchKnowledge()` with an ANN index query (`<=>` operator). Nothing else in the codebase needs to
change — `searchKnowledge()`'s return shape is the seam.

## Multi-workspace

The schema already threads `workspaceId` through every table (spec §36's requirement). What's missing
is auth: `src/lib/workspace.ts`'s `getDefaultWorkspace()`/`getDefaultUser()` just grab the first row.
Adding real auth means replacing those two functions with session-based lookups — every query already
filters by `workspaceId`, so no query-layer changes are needed elsewhere.

## Seeding / bootstrapping

`npm run db:seed` (`prisma/seed.ts`) upserts one workspace, one user, and the 7 agents from
`src/lib/agents/definitions.ts` — every write is an `upsert` keyed on a stable field (workspace id,
user email, `[workspaceId, agentKey]`), so running it 1 time or 100 times leaves the database in the
same state. It never touches tasks/reports/anything a user created.

`npm run db:bootstrap` is `db:deploy && db:seed` chained — the one command to run against a brand new
database (first prod deploy, a new preview environment, ...). Also idempotent for the same reason.

`scripts/seed-demo.ts` is different on purpose: it creates a handful of tasks in different states purely
so there's something to look at while exploring the UI. Running it twice creates two sets of demo tasks
— it is **not** meant for production, only for `npm run dev` exploration.
