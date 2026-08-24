# Product Spec

## 이게 뭔가요

Todo 앱도 아니고, ChatGPT 창 7개도 아닙니다. 한 명의 사용자가 7명의 AI 전문인력(Agent)에게 실제 업무를
배정하고, Agent가 의도를 되묻고, 실행하고, 구조화된 보고를 올리고, 사용자가 승인/재작업을 결정하고, 승인된
결과가 회사의 Knowledge와 다음 업무로 이어지는 시스템입니다.

핵심 루프:

```
Context → Task → Deliverable → Approval → Knowledge → Next Task → New Context
```

## 사용자의 역할

사용자는 실행자가 아니라 팀장입니다. 업무 지시, 질문에 답변, 진행상황 확인, 결과물 검토, 승인/재작업 요청,
다음 업무 결정 — 이게 전부입니다. 실제 리서치, 초안 작성, 메일 정리는 Agent가 합니다.

## 7명의 AI Staff

`docs/AGENTS.md` 참고. 시장조사 / 영업 / 마케팅 / 메일 확인 / 파일 정리 / 인사이트 토론 / 회의록(마크).

## 지금 실제로 되는 것 (v1)

- 업무 배정 → Clarifying 대화 → Execution Brief 제안/확정 → 실행 → 구조화된 Report → 검토 → 승인/재작업
  → Tag → Knowledge 색인 → Handoff 제안 → 다음 업무 생성. `scripts/smoke-test.ts`로 실제로 검증됩니다.
- 반복 업무(TaskTemplate 역할을 하는 Task + TaskRun) + Scheduler(수동/API 트리거, 중복 실행 방지).
  `scripts/smoke-test-recurring.ts`로 검증됩니다.
- Tool Permission Guard — side-effecting Tool(이메일 발송, 파일 삭제)은 서버에서 approvalId 없이 절대
  실행되지 않습니다.
- Knowledge 검색 — 로컬 임베딩(실제로 동작하는 keyword-hashing 기반, 신경망 임베딩 아님, `docs/DATABASE.md`
  참고)으로 승인된 보고서/회의록을 검색하고 인용합니다.
- Gmail/Drive OAuth 플로우, Demo/Mock Mode 전체.

## 지금 안 되는 것 (정직하게)

- Gmail/Drive **실제** 메일함 조작(list/label/send 실제 API 호출 배선)은 OAuth 연결 이후의 다음 단계입니다
  — Adapter와 스키마는 준비되어 있습니다.
- 진짜 신경망 임베딩(RAG 품질은 키워드 검색에 가깝습니다) — Provider 연결 시 `src/lib/knowledge/embed.ts`
  한 곳만 교체하면 됩니다.
- Workflow 시각 편집기(노드를 드래그해서 연결) — 대신 Handoff 이력을 자동 추적하는 Flow View가 있습니다.
- 회의 오디오 녹음/자동 받아쓰기 — Transcript 붙여넣기는 항상 동작합니다.
- 로그인/멀티 워크스페이스 — 스키마는 준비돼 있지만 지금은 단일 워크스페이스로 동작합니다.

## 완료 기준 체크 (spec §69 대응)

- [x] 7명의 Agent, Role/Permission 다름 (`src/lib/agents/definitions.ts`)
- [x] 업무 배정 가능
- [x] 업무별 Conversation
- [x] Clarifying Question
- [x] Execution Brief
- [x] Agent Job 실제 실행 (Demo Mode 또는 실제 Claude)
- [x] 구조화된 Report
- [x] 검토 대기함
- [x] 승인/재작업
- [x] Report Version 보존
- [x] 완료 업무 Task Table
- [x] 여러 Tag
- [x] 승인 결과 → Knowledge
- [x] Handoff
- [x] Workflow에서 흐름 확인 (Flow View, 시각 편집기는 아님)
- [x] 반복업무 Template/Run
- [~] Gmail Integration 구조 (OAuth 배선 완료, 실제 메일 조작은 다음 단계)
- [x] Insight가 Knowledge 기반으로 답함 (RAG, citation)
- [~] Mark: 회의 → 회의록(요약/결정사항/Action Item)까지는 일반 Task/Report 루프로 실제 동작합니다.
      다만 전용 `Meeting`/`MeetingActionItem` 테이블에 구조화 저장 + Action Item별 "[업무 생성]" 버튼은
      아직 배선되지 않았습니다 (테이블은 있음, `docs/ARCHITECTURE.md`의 남은 일 참고).
