import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { getAgentDefinition } from "@/lib/agents/definitions";
import { searchKnowledge } from "@/lib/knowledge/rag";
import { getWebSearchAdapter } from "@/lib/tools/web-search";
import type { LlmMessage } from "@/lib/llm/adapter";
import type { ExecutionBrief } from "@/lib/types";

/**
 * ContextAssembler (spec §17, §47). Deliberately does NOT dump every
 * conversation and every document into the prompt — it assembles four
 * distinct memories and keeps each bounded:
 *   - Task Memory: this task's clarifying conversation
 *   - Knowledge Memory: top RAG hits for the brief's objective
 *   - Agent Policy: the agent's permanent system prompt
 *   - Workflow Context: the source task's latest approved report, if this
 *     task was created via Handoff
 */
export async function assembleContext(taskId: string): Promise<{ system: string; messages: LlmMessage[] }> {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      agent: true,
      conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      briefs: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  const def = getAgentDefinition(task.agent.key);
  const brief = task.briefs[0];
  const briefDeliverables = fromJson<string[]>(brief?.deliverables, []);

  const knowledgeScope = fromJson<string[]>(task.agent.knowledgeScope, []);
  const knowledgeHits = brief
    ? await searchKnowledge({
        workspaceId: task.workspaceId,
        query: brief.objective,
        sourceTypes: knowledgeScope.includes("*") ? undefined : knowledgeScope,
        limit: 5,
      })
    : [];

  let workflowContext = "";
  if (task.sourceTaskId) {
    const sourceReport = await prisma.report.findFirst({
      where: { taskId: task.sourceTaskId },
      orderBy: { createdAt: "desc" },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    const latest = sourceReport?.versions[0];
    if (latest) {
      workflowContext = `\n\n## 이전 업무(Handoff 출처)에서 승인된 결과 요약\n${latest.summary}`;
    }
  }

  let searchContext = "";
  if (task.agent.key === "market-researcher" && brief) {
    const search = getWebSearchAdapter();
    const results = await search.search(brief.objective);
    searchContext =
      "\n\n## 웹 검색 결과 (web.search)\n" +
      results.map((r) => `- ${r.title} (${r.url})\n  ${r.snippet}`).join("\n");
    if (search.mode === "mock") {
      searchContext += "\n\n(SEARCH_API_KEY가 설정되지 않아 위 결과는 MOCK입니다 — 실제 사실로 인용하지 마세요.)";
    }
  }

  const knowledgeContext = knowledgeHits.length
    ? "\n\n## 내부 Knowledge 검색 결과 (인용 시 문서명을 반드시 표시)\n" +
      knowledgeHits
        .map((h) => `- [${h.documentTitle}] ${h.content.slice(0, 300)}`)
        .join("\n")
    : "";

  const briefText = brief
    ? [
        `Objective: ${brief.objective}`,
        brief.background ? `Background: ${brief.background}` : "",
        brief.scope ? `Scope: ${brief.scope}` : "",
        brief.target ? `Target: ${brief.target}` : "",
        briefDeliverables.length ? `Deliverables: ${briefDeliverables.join(", ")}` : "",
        brief.deadline ? `Deadline: ${brief.deadline.toISOString().slice(0, 10)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "(Execution Brief가 아직 확정되지 않았습니다)";

  const system = `${def?.systemPrompt ?? task.agent.systemPrompt}

## Execution Brief
${briefText}${workflowContext}${knowledgeContext}${searchContext}

## 출력 형식
반드시 다음 JSON 하나만 출력하세요 (설명 문장 없이, 마크다운 코드펜스 없이):
{
  "executiveSummary": string,
  "deliverables": [{ "title": string, "content": string }],
  "keyFindings": string[],
  "sources": [{ "title": string, "url": string, "publisher": string, "excerpt": string }],
  "limitations": string,
  "suggestedNextActions": string[],
  "suggestedTags": string[],
  "agentNote": string,
  "structured": <에이전트별 구조화 데이터, 예: 시장조사면 leads 배열>
}`;

  const conversationMessages: LlmMessage[] =
    task.conversations[0]?.messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })) ?? [];

  const messages: LlmMessage[] =
    conversationMessages.length > 0
      ? conversationMessages
      : [{ role: "user", content: brief?.objective ?? task.title }];

  return { system, messages };
}

export type { ExecutionBrief };
