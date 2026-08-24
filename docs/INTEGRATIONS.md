# Integrations

Every integration follows the same rule: **no credential → clearly labeled "연결 필요" or "[MOCK]", never
a fake "connected" state.** Check `/integrations` in the app for live status.

## Anthropic (Claude)

`ANTHROPIC_API_KEY` in `.env`. Without it, `src/lib/llm/adapter.ts` serves Demo Mode — every response is
prefixed `[DEMO MODE]` and the clarifying/execution prompts are specifically recognized so the full Core
Loop (see `docs/ARCHITECTURE.md`) stays testable without a key.

## Google (Gmail + Drive)

**Don't connect a real account until this app has real login** — see the warning at the top of
`docs/DEPLOYMENT.md`. The app itself gates this: visiting `/integrations` and clicking 연결하기 lands on
`/integrations/connect-warning` first, which requires an explicit click-through before Google's consent
screen even opens.

1. Set `TOKEN_ENCRYPTION_KEY` in `.env` (`openssl rand -base64 32`) — required, the connect flow fails
   without it rather than storing a refresh token unencrypted.
2. Google Cloud Console → create an OAuth 2.0 Client ID (Web application).
3. Authorized redirect URI: `http://localhost:3000/api/integrations/google/callback` (match
   `GOOGLE_REDIRECT_URI` in `.env`).
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.
5. Visit `/integrations` → 연결하기 → read the warning → 그래도 연결할게요 → Google's consent screen →
   `/api/integrations/google/start` builds that URL via `getAuthUrl()` in `src/lib/gmail/adapter.ts`.
6. On success, the callback route (`src/app/api/integrations/google/callback/route.ts`) encrypts the
   refresh token with `encryptToken()` before storing it on the `Integration` row, for both `gmail` and
   `google_drive` providers (one OAuth grant covers both scopes). If Google doesn't return a
   `refresh_token` (happens on a repeat consent), the route fails loudly instead of storing nothing
   silently — revoke the app's access in your Google Account and reconnect to force a fresh one.

What this gets you today: a real, working, encrypted-at-rest OAuth handshake and a `getGmailClient()`
factory that decrypts the stored token and returns a real `googleapis` client. What it does **not** yet
do: call `list`/`label`/`send` against that client — see `docs/ARCHITECTURE.md`'s stub table for exactly
what to add.

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
