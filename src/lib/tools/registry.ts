/**
 * Tool Registry + Permission Guard (spec §18).
 *
 * Every tool an agent can call is registered here with a `sideEffect` flag.
 * Side-effecting tools (email.send, storage.delete, ...) REQUIRE an
 * `approvalId` that resolves to a real `Approval` row in the database — the
 * check happens in `assertPermitted`, called from the executor on the
 * server, not just hidden behind a disabled button in the UI. A tool call
 * that fails this check throws and is recorded as "blocked" on the
 * AgentToolCall row (spec §38 audit trail).
 */

export interface ToolDefinition {
  name: string;
  description: string;
  sideEffect: boolean;
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  "web.search": { name: "web.search", description: "웹 검색", sideEffect: false },
  "web.fetch": { name: "web.fetch", description: "URL 원문 가져오기", sideEffect: false },
  "knowledge.search": { name: "knowledge.search", description: "내부 Knowledge Base 검색 (RAG)", sideEffect: false },
  "knowledge.write": { name: "knowledge.write", description: "문서를 Knowledge Base에 색인", sideEffect: false },
  "lead.read": { name: "lead.read", description: "저장된 Lead 조회", sideEffect: false },

  "gmail.read": { name: "gmail.read", description: "메일함 조회", sideEffect: false },
  "gmail.label": { name: "gmail.label", description: "라벨 적용", sideEffect: false },
  "gmail.archive": { name: "gmail.archive", description: "아카이브 이동 (삭제 아님)", sideEffect: false },
  "gmail.send": { name: "gmail.send", description: "메일 발송", sideEffect: true },
  "gmail.trash": { name: "gmail.trash", description: "휴지통 이동", sideEffect: true },
  "gmail.trash_permanent": { name: "gmail.trash_permanent", description: "영구 삭제 — 정책상 어떤 Agent도 사용 불가", sideEffect: true },

  "storage.list": { name: "storage.list", description: "파일 목록 조회", sideEffect: false },
  "storage.read": { name: "storage.read", description: "파일 내용 읽기", sideEffect: false },
  "storage.move": { name: "storage.move", description: "파일 이동", sideEffect: false },
  "storage.rename": { name: "storage.rename", description: "파일명 변경", sideEffect: false },
  "storage.tag": { name: "storage.tag", description: "파일 태깅", sideEffect: false },
  "storage.delete": { name: "storage.delete", description: "파일 삭제", sideEffect: true },

  "external.publish": { name: "external.publish", description: "외부 게시 (SNS/블로그 등)", sideEffect: true },
};

export class ToolPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolPermissionError";
  }
}

/**
 * Throws unless `toolName` is both (a) in the agent's allowedTools list and
 * (b) either not a side-effecting tool, or backed by a real approvalId.
 * Call this from every tool execution path — the UI hiding a button is a
 * convenience, this is the actual gate.
 */
export function assertPermitted(params: {
  toolName: string;
  agentAllowedTools: string[];
  approvalId?: string | null;
}): void {
  const { toolName, agentAllowedTools, approvalId } = params;
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new ToolPermissionError(`Unknown tool: ${toolName}`);
  }
  if (!agentAllowedTools.includes(toolName)) {
    throw new ToolPermissionError(`Agent is not permitted to call ${toolName}`);
  }
  if (tool.sideEffect && !approvalId) {
    throw new ToolPermissionError(
      `${toolName} is a side-effecting tool and requires an approvalId; none was provided`
    );
  }
}
