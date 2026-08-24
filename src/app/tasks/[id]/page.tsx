import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { StatusBadge } from "@/components/status-badge";
import { ClarifyingPanel } from "@/components/clarifying-panel";
import { ReportReviewPanel } from "@/components/report-review-panel";
import { CancelTaskButton } from "@/components/cancel-task-button";
import { formatDate } from "@/lib/format";
import { getLlmAdapter } from "@/lib/llm/adapter";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      agent: true,
      conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      briefs: { orderBy: { version: "desc" }, take: 1 },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      },
      runs: { orderBy: { runIndex: "desc" } },
      dependsOn: { include: { dependsOnTask: true } },
      entityTags: { include: { tag: true } },
    },
  });
  if (!task) notFound();

  const brief = task.briefs[0];
  const pendingBrief =
    task.status === "ready" && brief
      ? {
          objective: brief.objective,
          background: brief.background,
          scope: brief.scope,
          target: brief.target,
          deliverables: fromJson<string[]>(brief.deliverables, []),
        }
      : null;

  const latestReport = task.reports[0];
  const latestVersion = latestReport?.versions[0];
  const showReview = task.status === "review" && latestReport && latestVersion;
  const showClarifying = ["draft", "clarifying", "ready"].includes(task.status);
  const isDemo = getLlmAdapter().mode === "demo";

  const latestJobError = task.status === "failed"
    ? (await prisma.agentJob.findFirst({ where: { taskId: task.id }, orderBy: { createdAt: "desc" } }))?.error
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">{task.agent.name}</div>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-black">{task.title}</h1>
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-muted">
        {task.deadline && <span>Deadline {formatDate(task.deadline)}</span>}
        {task.isRecurring && <span>🔁 {task.scheduleType} (다음: {task.nextRunAt ? formatDate(task.nextRunAt) : "-"})</span>}
        {task.dependsOn.length > 0 && (
          <span>선행 업무: {task.dependsOn.map((d) => d.dependsOnTask.title).join(", ")}</span>
        )}
      </div>

      {task.entityTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.entityTags.map((et) => (
            <span key={et.id} className="badge bg-accent-bg text-accent">
              #{et.tag.label}
            </span>
          ))}
        </div>
      )}

      {!["approved", "cancelled"].includes(task.status) && (
        <div className="mt-3">
          <CancelTaskButton taskId={task.id} />
        </div>
      )}

      <div className="mt-6">
        {showClarifying && (
          <ClarifyingPanel
            taskId={task.id}
            messages={task.conversations[0]?.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })) ?? []}
            pendingBrief={pendingBrief}
          />
        )}

        {(task.status === "queued" || task.status === "working") && (
          <div className="card text-sm text-ink-muted">담당자가 지금 작업 중이에요. 완료되면 검토 대기로 올라옵니다.</div>
        )}

        {showReview && (
          <ReportReviewPanel
            taskId={task.id}
            reportId={latestReport.id}
            demoMode={isDemo}
            version={{
              version: latestVersion.version,
              summary: latestVersion.summary,
              deliverables: fromJson(latestVersion.deliverables, []),
              keyFindings: fromJson(latestVersion.keyFindings, []),
              sources: fromJson(latestVersion.sources, []),
              limitations: latestVersion.limitations,
              suggestedNextActions: fromJson(latestVersion.suggestedNextActions, []),
              suggestedTags: fromJson(latestVersion.suggestedTags, []),
              agentNote: latestVersion.agentNote,
            }}
          />
        )}

        {task.status === "approved" && latestVersion && (
          <div className="card">
            <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">승인된 최종 결과 (v{latestVersion.version})</div>
            <p className="whitespace-pre-wrap text-sm">{latestVersion.summary}</p>
          </div>
        )}

        {task.status === "scheduled" && (
          <div className="card text-sm text-ink-muted">
            반복 업무예요. 다음 실행 예정: {task.nextRunAt ? formatDate(task.nextRunAt) : "-"}. 지금 바로 실행하려면
            <code className="mx-1 rounded bg-surface2 px-1.5 py-0.5">npm run scheduler:tick</code>
            을 실행하세요 (로컬 개발용 Manual Trigger).
          </div>
        )}

        {task.status === "failed" && (
          <div className="card border-danger">
            <div className="mb-1 text-sm font-semibold text-danger">실행 실패</div>
            <p className="text-sm text-ink-muted">{latestJobError ?? "알 수 없는 오류"}</p>
          </div>
        )}

        {task.status === "cancelled" && <div className="card text-sm text-ink-muted">취소된 업무입니다.</div>}

        {task.runs.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 font-display text-sm font-bold">실행 이력</div>
            <div className="flex flex-col gap-1 text-xs text-ink-muted">
              {task.runs.map((r) => (
                <div key={r.id} className="flex justify-between border-b border-line py-1">
                  <span>#{r.runIndex}</span>
                  <StatusBadge status={r.status} />
                  <span>{r.finishedAt ? formatDate(r.finishedAt) : r.startedAt ? formatDate(r.startedAt) : "-"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
