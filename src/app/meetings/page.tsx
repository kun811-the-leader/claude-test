import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { NewMeetingForm } from "@/components/new-meeting-form";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const agent = await prisma.agent.findFirst({ where: { key: "meeting-mark" } });
  const tasks = agent
    ? await prisma.task.findMany({ where: { agentId: agent.id }, orderBy: { updatedAt: "desc" } })
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Mark</div>
      <h1 className="font-display text-3xl font-black">회의록</h1>
      <p className="mt-1 text-sm text-ink-muted">
        회의 내용을 붙여넣으면 마크가 요약·결정사항·Action Item·태그로 정리해요. 승인하면 Knowledge에 저장됩니다.
      </p>

      <div className="mt-6">
        <NewMeetingForm />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {tasks.length === 0 && <div className="card text-sm italic text-ink-muted">아직 회의록이 없어요.</div>}
        {tasks.map((t) => (
          <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between hover:border-accent">
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status} />
              <span className="font-medium">{t.title}</span>
            </div>
            <span className="text-xs text-ink-muted">{formatDate(t.updatedAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
