# Integrations

Every integration follows the same rule: **no credential → clearly labeled "연결 필요" or "[MOCK]", never
a fake "connected" state.** Check `/integrations` in the app for live status.

## Anthropic (Claude)

`ANTHROPIC_API_KEY` in `.env`. Without it, `src/lib/llm/adapter.ts` serves Demo Mode — every response is
prefixed `[DEMO MODE]` and the clarifying/execution prompts are specifically recognized so the full Core
Loop (see `docs/ARCHITECTURE.md`) stays testable without a key.

## Google (Gmail + Drive)

1. Google Cloud Console → create an OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/integrations/google/callback` (match
   `GOOGLE_REDIRECT_URI` in `.env`).
3. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.
4. Visit `/integrations` and click 연결하기 — this hits `/api/integrations/google/start`, which builds
   the consent URL via `getAuthUrl()` in `src/lib/gmail/adapter.ts`.
5. On success, the callback route stores a refresh token on the `Integration` row for both `gmail` and
   `google_drive` providers (one OAuth grant covers both scopes).

What this gets you today: a real, working OAuth handshake and a `getGmailClient()` factory that returns
a real `googleapis` client bound to the stored token. What it does **not** yet do: call `list`/`label`/
`send` against that client — see `docs/ARCHITECTURE.md`'s stub table for exactly what to add.

## Web search (market-researcher's research tool)

`SEARCH_API_KEY` in `.env`. Without it, `src/lib/tools/web-search.ts` returns Mock results explicitly
labeled as such — `market-researcher`'s system prompt is instructed never to cite them as fact. To go
live, implement `LiveWebSearchAdapter.search()` against your chosen provider (Brave/Tavily/Bing/...);
left unimplemented rather than guessed because no provider was specified and guessing a request shape
without testing it against a real key would risk shipping broken code.

## Transcription (Mark's meeting audio)

Not wired — `TRANSCRIPTION_API_KEY` is reserved in `.env.example` for whichever provider you pick.
Pasting a transcript directly always works regardless (spec §1's requirement that missing-credential
paths degrade, never block).

## Scheduler

Not a "connection" in the OAuth sense, but still credential-gated: `POST /api/scheduler/tick` requires
`Authorization: Bearer $SCHEDULER_SECRET`. Point any external cron (Vercel Cron, a GitHub Action, a real
crontab) at it on an interval. Locally, skip the HTTP hop entirely with `npm run scheduler:tick`.
