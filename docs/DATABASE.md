# Database

Schema: `prisma/schema.prisma`. SQLite for local dev (`DATABASE_URL="file:./dev.db"`, zero setup),
designed to move to Postgres/Supabase with minimal changes.

## Why SQLite now, and exactly how to leave it

SQLite's Prisma connector supports neither a native `Json` type nor native enums. So:

- Every "enum" (`Task.status`, `Approval.decision`, ...) is a plain `String` column, validated at the
  application boundary by the zod enums in `src/lib/types.ts` — never compared against a raw string
  literal anywhere else.
- Every "Json-shaped" column (`Agent.responsibilities`, `ReportVersion.sources`, ...) is a `String`
  holding serialized JSON, always read/written through `src/lib/json.ts`'s `toJson`/`fromJson` — never
  `JSON.parse`/`stringify` ad hoc.

To move to Postgres: change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`, point
`DATABASE_URL` at your Postgres instance, run `npm run db:push` (or set up real migrations with
`prisma migrate`). The enum/Json fields keep working as plain strings — you don't have to touch them,
though converting them to native `Json`/enum types afterward is a nice-to-have, not required.

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
