import Anthropic from "@anthropic-ai/sdk";

/**
 * Every agent call goes through this interface, never through the Anthropic
 * SDK directly — that's what keeps the Agent Engine (src/lib/agents/executor.ts)
 * from being welded to one provider (spec §17).
 */
export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmAdapter {
  readonly mode: "live" | "demo";
  complete(input: { system: string; messages: LlmMessage[] }): Promise<string>;
}

class AnthropicAdapter implements LlmAdapter {
  readonly mode = "live" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete({ system, messages }: { system: string; messages: LlmMessage[] }): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  }
}

/**
 * Demo Mode — used whenever ANTHROPIC_API_KEY is unset. Returns a clearly
 * labeled canned response so the whole Task → Brief → Report → Approval loop
 * is exercisable end-to-end without a credential (spec §1, §60). It never
 * pretends to be real output: every response is prefixed so it can't be
 * mistaken for a live agent result in the UI or in logs.
 */
/**
 * Demo Mode is deliberately smart enough to walk the ENTIRE Core Loop
 * (clarify -> brief -> execute -> report) with zero credentials, because
 * that loop is the thing spec §68/§60 says must be testable without keys.
 * It recognizes the two structured-output prompts the app actually sends
 * (the ```brief fence during clarifying, the JSON deliverable during
 * execution) and answers each with a clearly-labeled synthetic payload —
 * never silently indistinguishable from a real Claude response.
 */
class DemoAdapter implements LlmAdapter {
  readonly mode = "demo" as const;

  async complete({ system, messages }: { system: string; messages: LlmMessage[] }): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";

    if (system.includes("```brief")) {
      return [
        "[DEMO MODE] 충분히 이해했다고 가정하고 바로 Execution Brief를 제안할게요 (실제 Claude라면 여기서 몇 가지 더 물어볼 수도 있어요).",
        "",
        "```brief",
        JSON.stringify(
          {
            objective: last.slice(0, 300),
            background: "DEMO MODE — ANTHROPIC_API_KEY 미설정으로 자동 생성된 예시 Brief입니다.",
            scope: "",
            target: "",
            constraints: [],
            exclusions: [],
            requiredSources: [],
            deliverables: ["요약 리포트"],
            successCriteria: [],
          },
          null,
          2
        ),
        "```",
      ].join("\n");
    }

    if (system.includes("반드시 다음 JSON 하나만 출력")) {
      // Ground the canned summary in the actual brief (not just the latest
      // message, which after a revision round is only the feedback text) so
      // demo output stays topically consistent across re-runs.
      const objectiveMatch = system.match(/Objective:\s*(.+)/);
      const topic = objectiveMatch?.[1]?.slice(0, 160) ?? last.slice(0, 120);
      return JSON.stringify({
        executiveSummary: `[DEMO MODE] "${topic}" 에 대한 예시 결과입니다. ANTHROPIC_API_KEY를 설정하면 실제 Claude가 이 자리를 채웁니다.`,
        deliverables: [{ title: "예시 결과물", content: "실제 키 연결 전까지의 placeholder 내용입니다." }],
        keyFindings: ["DEMO MODE에서 생성된 예시 항목입니다."],
        sources: [],
        limitations: "DEMO MODE — 실제 리서치나 도구 실행이 이루어지지 않았습니다.",
        suggestedNextActions: [],
        suggestedTags: ["demo"],
        agentNote: "실제 키가 없어 Demo Mode로 실행되었습니다.",
      });
    }

    return `[DEMO MODE — ANTHROPIC_API_KEY 미설정] 받은 메시지: "${last.slice(0, 200)}"`;
  }
}

let cached: LlmAdapter | null = null;

export function getLlmAdapter(): LlmAdapter {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  cached = key ? new AnthropicAdapter(key) : new DemoAdapter();
  return cached;
}
