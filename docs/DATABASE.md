# Database

Schema: `prisma/schema.prisma`. Provider is `postgresql` — point `DATABASE_URL` at any real Postgres
(a free one from neon.tech/Supabase/Vercel Postgres for dev or prod, or a local `postgres` for offline
dev) and `npm run db:push` works as-is. Verified against a real local Postgres 16, not just SQLite.

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

## Seeding

`npm run db:seed` (`prisma/seed.ts`) upserts one workspace, one user, and the 7 agents from
`src/lib/agents/definitions.ts`. Safe to re-run any time — it won't duplicate rows or touch existing
tasks/reports.
