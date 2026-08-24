import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; statuses: string[] | undefined }[] = [
  { key: "all", label: "전체", statuses: undefined },
  { key: "active", label: "진행중", statuses: ["draft", "clarifying", "ready", "queued", "working", "revision"] },
  { key: "review", label: "검토대기", statuses: ["review"] },
  { key: "recurring", label: "반복업무", statuses: ["scheduled"] },
  { key: "approved", label: "승인완료", statuses: ["approved"] },
  { key: "cancelled", label: "취소", statuses: ["cancelled", "failed"] },
];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "all" } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;

  const tasks = await prisma.task.findMany({
    where: activeTab.statuses ? { status: { in: activeTab.statuses } } : undefined,
    include: { agent: true, entityTags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Tasks</div>
      <h1 className="font-display text-3xl font-black">업무</h1>

      <div className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/tasks?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm ${
              t.key === activeTab.key ? "border-accent font-semibold text-accent" : "border-transparent text-ink-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="py-2">업무</th>
              <th>담당자</th>
              <th>상태</th>
              <th>Deadline</th>
              <th>Tags</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-line">
                <td className="py-2">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:text-accent">
                    {t.title}
                  </Link>
                </td>
                <td className="text-ink-muted">{t.agent.name}</td>
                <td>
                  <StatusBadge status={t.status} />
                </td>
                <td className="text-ink-muted">{t.deadline ? formatDate(t.deadline) : t.isRecurring ? "반복" : "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {t.entityTags.slice(0, 3).map((et) => (
                      <span key={et.id} className="badge bg-accent-bg text-accent">
                        #{et.tag.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-ink-muted">{formatDate(t.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <div className="card mt-3 text-sm italic text-ink-muted">이 탭에는 업무가 없어요.</div>}
      </div>
    </div>
  );
}
