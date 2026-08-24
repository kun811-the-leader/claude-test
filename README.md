# AI Staff Operating System

한 명의 사용자가 7명의 AI 전문인력(시장조사·영업·마케팅·메일·파일정리·인사이트·회의록)에게 업무를 배정하고,
보고를 검토·승인하고, 승인된 결과가 회사의 지식과 다음 업무로 이어지는 지휘본부입니다.

이전 버전(Claude Code 채팅 + 정적 Artifact 보드)은 `legacy/`에 그대로 남아 있습니다 — 삭제하지 않았습니다.
왜 이 구조로 바뀌었는지, 무엇이 실제로 동작하고 무엇이 아직 Mock인지는 `docs/ARCHITECTURE.md`를 먼저 읽어보세요.

## 바로 열어서 쓰고 싶다면

코드를 안 만지고 브라우저 주소만으로 쓰고 싶으면 `docs/DEPLOYMENT.md`를 따라 하세요 (계정 두 개 만들고
클릭 몇 번이면 됩니다).

## 로컬에서 개발하기

```bash
npm install
cp .env.example .env        # DATABASE_URL에 Postgres 연결 문자열 채우기 (로컬 Postgres 또는 무료 호스팅)
npm run db:push             # 스키마 반영
npm run db:seed             # 7명의 Agent 시드
npm run dev                 # http://localhost:3000
```

`ANTHROPIC_API_KEY` 없이도 Demo Mode로 전체 흐름이 동작합니다.

Credential 없이도(`ANTHROPIC_API_KEY` 미설정) 지휘본부 → 업무 배정 → Clarifying 대화 → Execution Brief →
실행 → 검토 → 승인 → Knowledge 색인 → Handoff까지 전체 흐름을 Demo Mode로 그대로 밟아볼 수 있습니다. 실제
Claude로 동작시키려면 `.env`에 `ANTHROPIC_API_KEY`만 넣으면 됩니다.

## 핵심 루프를 직접 확인하기

UI를 켜지 않고도 Core Loop 전체가 실제로 동작하는지 스크립트로 확인할 수 있습니다:

```bash
npm run db:push && npm run db:seed   # 매번 깨끗한 상태에서 시작하고 싶다면 rm prisma/dev.db 먼저
npx tsx scripts/smoke-test.ts            # 배정→Clarifying→Brief→실행→재작업→승인→Knowledge→Handoff
npx tsx scripts/smoke-test-recurring.ts  # 반복 업무 + Scheduler + 중복 실행 방지
```

## 문서

- `docs/DEPLOYMENT.md` — 계정 만들고 클릭만으로 배포하는 방법 (비개발자용)
- `docs/PRODUCT_SPEC.md` — 이 제품이 무엇이고 무엇이 아닌지
- `docs/ARCHITECTURE.md` — 기술 구조, 무엇이 실제로 동작하고 무엇이 Mock/미구현인지
- `docs/AGENTS.md` — 7명의 AI Staff 정의
- `docs/WORKFLOWS.md` — Task 상태 머신, Handoff, Workflow
- `docs/INTEGRATIONS.md` — Gmail/Drive/검색/Transcription 연동 방법
- `docs/DATABASE.md` — 스키마 설명
- `CLAUDE.md` — 이 저장소에서 작업할 때 반드시 지켜야 하는 규칙
