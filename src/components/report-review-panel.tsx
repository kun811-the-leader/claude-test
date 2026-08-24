"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReport, requestRevision, createHandoffTask } from "@/app/actions";
import { AGENT_DEFINITIONS } from "@/lib/agents/definitions";

interface ReportVersionView {
  version: number;
  summary: string;
  deliverables: { title: string; content: string }[];
  keyFindings: string[];
  sources: { title: string; url?: string; publisher?: string; excerpt?: string }[];
  limitations: string | null;
  suggestedNextActions: string[];
  suggestedTags: string[];
  agentNote: string | null;
}

export function ReportReviewPanel({
  taskId,
  reportId,
  version,
  demoMode,
}: {
  taskId: string;
  reportId: string;
  version: ReportVersionView;
  demoMode: boolean;
}) {
  const [tab, setTab] = useState<"none" | "approve" | "revise">("none");
  const [tags, setTags] = useState(version.suggestedTags.join(", "));
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const [handoffOptions, setHandoffOptions] = useState<string[] | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      {demoMode && (
        <div className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">
          Demo Mode 결과입니다 — ANTHROPIC_API_KEY를 설정하면 실제 에이전트가 이 자리를 채웁니다.
        </div>
      )}

      <div className="card">
        <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">Executive Summary (v{version.version})</div>
        <p className="whitespace-pre-wrap text-sm">{version.summary}</p>
      </div>

      {version.deliverables.length > 0 && (
        <div className="flex flex-col gap-2">
          {version.deliverables.map((d, i) => (
            <div key={i} className="card">
              <div className="mb-1 text-sm font-semibold">{d.title}</div>
              <p className="whitespace-pre-wrap text-sm text-ink-muted">{d.content}</p>
            </div>
          ))}
        </div>
      )}

      {version.keyFindings.length > 0 && (
        <div className="card">
          <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">Key Findings</div>
          <ul className="list-disc pl-5 text-sm">
            {version.keyFindings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {version.sources.length > 0 && (
        <div className="card">
          <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">Sources</div>
          <ul className="flex flex-col gap-1 text-sm">
            {version.sources.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                {s.publisher ? <span className="text-ink-muted"> · {s.publisher}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.limitations && (
        <div className="card">
          <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">Limitations</div>
          <p className="text-sm text-ink-muted">{version.limitations}</p>
        </div>
      )}

      {version.suggestedNextActions.length > 0 && (
        <div className="card">
          <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">추천하는 다음 행동</div>
          <ul className="list-disc pl-5 text-sm">
            {version.suggestedNextActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {handoffOptions && handoffOptions.length > 0 && (
        <div className="card border-accent">
          <div className="mb-2 text-sm font-semibold text-accent">이 결과를 다음 업무로 넘길까요?</div>
          <div className="flex flex-wrap gap-2">
            {handoffOptions.map((key) => (
              <button
                key={key}
                className="rounded-lg border border-accent px-3 py-1.5 text-xs text-accent"
                onClick={() =>
                  startTransition(async () => {
                    const title = prompt(`${AGENT_DEFINITIONS[key as keyof typeof AGENT_DEFINITIONS]?.name}에게 넘길 업무 제목을 입력하세요`);
                    if (!title) return;
                    const instruction = prompt("간단한 지시사항") ?? "";
                    const { taskId: newTaskId } = await createHandoffTask({
                      sourceTaskId: taskId,
                      targetAgentKey: key,
                      title,
                      instruction,
                    });
                    router.push(`/tasks/${newTaskId}`);
                  })
                }
              >
                {AGENT_DEFINITIONS[key as keyof typeof AGENT_DEFINITIONS]?.name ?? key}에게 전달
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "none" && !handoffOptions && (
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setTab("approve")}
          >
            승인
          </button>
          <button className="rounded-lg border border-line px-4 py-2 text-sm" onClick={() => setTab("revise")}>
            피드백 / 재작업 요청
          </button>
        </div>
      )}

      {tab === "approve" && (
        <div className="card flex flex-col gap-2">
          <label className="text-xs text-ink-muted">태그 (쉼표로 구분, 이미 제안된 태그가 채워져 있어요)</label>
          <input
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setTab("none")}>
              취소
            </button>
            <button
              disabled={pending}
              className="rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
                  const { suggestedHandoffTo } = await approveReport(reportId, tagList);
                  if (suggestedHandoffTo.length > 0) {
                    setHandoffOptions(suggestedHandoffTo);
                    setTab("none");
                  } else {
                    router.refresh();
                  }
                })
              }
            >
              태그 달고 승인
            </button>
          </div>
        </div>
      )}

      {tab === "revise" && (
        <div className="card flex flex-col gap-2">
          <label className="text-xs text-ink-muted">무엇을 다시 해야 하는지 적어주세요</label>
          <textarea
            className="min-h-[80px] rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setTab("none")}>
              취소
            </button>
            <button
              disabled={pending || !feedback.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  await requestRevision(reportId, feedback.trim());
                  router.refresh();
                })
              }
            >
              {pending ? "재작업 중…" : "피드백 보내고 재작업 요청"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
