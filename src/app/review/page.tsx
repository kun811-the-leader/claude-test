import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const tasks = await prisma.task.findMany({
    where: { status: "review" },
    include: { agent: true, reports: { orderBy: { createdAt: "desc" }, take: 1, include: { versions: { orderBy: { version: "desc" }, take: 1 } } } },
    orderBy: { updatedAt: "asc" }, // oldest-waiting first
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Review Queue</div>
      <h1 className="font-display text-3xl font-black">검토 대기</h1>
      <p className="mt-1 text-sm text-ink-muted">{tasks.length}건이 승인을 기다리고 있어요.</p>

      <div className="mt-6 flex flex-col gap-2">
        {tasks.length === 0 && <div className="card text-sm italic text-ink-muted">검토할 보고가 없어요.</div>}
        {tasks.map((t) => {
          const summary = t.reports[0]?.versions[0]?.summary ?? "";
          return (
            <Link key={t.id} href={`/tasks/${t.id}`} className="card block hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge border border-line bg-surface2 text-ink-muted">{t.agent.name}</span>
                  <span className="font-medium">{t.title}</span>
                </div>
                <span className="text-xs text-ink-muted">{formatRelative(t.updatedAt)}</span>
              </div>
              {summary && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{summary}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
