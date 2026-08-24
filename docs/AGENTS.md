# AI Staff — Agent Definitions

Source of truth: `src/lib/agents/definitions.ts`. This file summarizes it — if they disagree, the code
wins.

| key | 이름 | Mission | 허용 Tool | 금지 | Handoff 제안 |
|---|---|---|---|---|---|
| `market-researcher` | 시장조사 담당자 | 시장/경쟁사/트렌드/잠재고객 리서치 | web.search, web.fetch, knowledge.search | email.send, file.delete, external.publish | sales-assistant, marketing-assistant |
| `sales-assistant` | 영업 담당자 | 리드를 Sales Opportunity로 전환 | knowledge.search, lead.read | **email.send (항상 금지 — Draft만)** | mail-checker |
| `marketing-assistant` | 마케팅 담당자 | 캠페인/콘텐츠 기획 | knowledge.search, web.search | email.send, file.delete | (없음) |
| `mail-checker` | 메일 확인 담당자 | Inbox 관리 + 승인된 발송 | gmail.read/label/archive, **gmail.send (approvalId 필수)** | gmail.trash_permanent | (없음) |
| `file-organizer` | 파일 정리 담당자 | Storage 정리 → Knowledge | storage.list/read/move/rename/tag, **storage.delete (approvalId 필수)** | - | (없음) |
| `insight-sparring-partner` | 인사이트 토론자 | 내부 자료 기반 사고 파트너 | knowledge.search | email.send, file.delete, external.publish | market-researcher, sales-assistant, marketing-assistant |
| `meeting-mark` (마크) | 회의록 담당자 | 회의 → 요약/결정/Action Item → Knowledge | knowledge.write | email.send, file.delete, external.publish | market-researcher, sales-assistant, marketing-assistant |

## 새 Agent 추가하기

1. `src/lib/types.ts`의 `AGENT_KEYS`에 새 key 추가
2. `src/lib/agents/definitions.ts`의 `AGENT_DEFINITIONS`에 정의 추가 (모든 필드 필수 — 타입이 강제함)
3. `npm run db:seed` 재실행 (upsert라서 안전하게 반복 실행 가능)
4. 필요하면 `src/lib/tools/registry.ts`에 새 Tool 추가

## Clarifying → Brief 프로토콜

각 Agent의 `clarificationPolicy.guidance`가 "무엇을 물어볼지"를 결정합니다. 모델은 질문 대신
` ```brief ` 펜스로 JSON Execution Brief를 제안할 수 있고, 이게 감지되면 자동으로 `TaskBrief` row가
생성되고 Task가 `ready`로 넘어갑니다 (`src/app/actions.ts`의 `advanceClarifyingConversation`).
