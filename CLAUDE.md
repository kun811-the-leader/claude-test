# CLAUDE.md — 이 저장소에서 지켜야 할 규칙

## 절대 하지 말 것

1. **상태를 직접 바꾸지 말 것.** `task.status`를 어디서든 직접 assign하지 말고, 항상
   `src/lib/task/state-machine.ts`의 `assertTransition()`을 거치세요. 허용되지 않은 전이는
   `IllegalTransitionError`를 던지게 되어 있고, 그게 맞는 동작입니다.
2. **side-effecting Tool을 approvalId 없이 호출하지 말 것.** `gmail.send`, `storage.delete` 등은
   `src/lib/tools/registry.ts`의 `assertPermitted()`를 통과해야만 실행됩니다. UI에서 버튼을 숨기는 것만으로
   끝내지 마세요 — 서버에서도 반드시 검증되어야 합니다.
3. **Credential이 없다고 기능을 가짜로 "연결된 것처럼" 보여주지 말 것.** Gmail/Drive/검색/Transcription은
   미설정 시 명확히 "연결 필요" 또는 "[MOCK]"으로 표시합니다 (`src/app/integrations/page.tsx`,
   `src/lib/gmail/adapter.ts`, `src/lib/tools/web-search.ts` 참고).
4. **Prompt를 컴포넌트 파일에 하드코딩하지 말 것.** 모든 Agent 정의(`systemPrompt` 포함)는
   `src/lib/agents/definitions.ts` 한 곳에서 관리합니다.
5. **JSON 컬럼을 `JSON.parse`/`JSON.stringify` 직접 호출하지 말 것.** 항상 `src/lib/json.ts`의
   `toJson`/`fromJson`을 거치세요 — SQLite는 네이티브 Json 타입이 없어서 모든 구조화 컬럼이 String입니다.
6. **`legacy/`를 삭제하거나 사용자 승인 없이 되돌리지 말 것.**
7. **Report Version을 덮어쓰지 말 것.** 재작업은 항상 같은 `Report`에 새 `ReportVersion`을 추가합니다 (현재
   구현은 재작업 시 `runAgentJob`이 새 버전을 만듭니다 — `report.currentVersion` 증가 로직을 건드릴 때
   주의).

## 아키텍처 원칙

- **State Machine이 유일한 진실.** `src/lib/task/state-machine.ts`
- **Tool Registry + Permission Guard가 유일한 실행 게이트.** `src/lib/tools/registry.ts`
- **Agent 정의는 데이터.** `src/lib/agents/definitions.ts` — 새 Agent를 추가할 때 이 파일에 정의를
  추가하고 `prisma/seed.ts`를 다시 실행하세요.
- **모든 외부 연동은 Adapter 패턴.** LLM(`src/lib/llm/adapter.ts`), Gmail(`src/lib/gmail/adapter.ts`),
  Storage(`src/lib/storage/adapter.ts`), 웹검색(`src/lib/tools/web-search.ts`) — Credential 유무에 따라
  Live/Mock을 구현이 스스로 고릅니다. 호출부는 어떤 모드인지 몰라도 됩니다.
- **감사 로그.** 상태를 바꾸는 모든 Server Action은 `src/lib/audit.ts`의 `audit()`을 호출합니다.

## 설계 언어

- 파스텔이 아니라 실무용 Dashboard 톤 — `src/app/globals.css`의 CSS 변수(`--paper`, `--surface`,
  `--accent`, `--ok`/`--warn`/`--danger`)를 그대로 쓰세요. 기존 Artifact 보드(`legacy/board`)에서
  그대로 계승한 토큰입니다.
- 화면에 정보를 다 쏟아붓지 마세요 — 지휘본부(`src/app/page.tsx`)는 "지금 확인해야 할 것"을 우선합니다.

## 변경 시 검증

```bash
npm run typecheck
npm run build
npx tsx scripts/smoke-test.ts
npx tsx scripts/smoke-test-recurring.ts
```
