import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgentDefinition } from "@/lib/agents/definitions";
import { AssignTaskForm } from "@/components/assign-task-form";
import { StatusBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = getAgentDefinition(key);
  if (!def) notFound();

  const agent = await prisma.agent.findFirst({ where: { key } });
  if (!agent) notFound();

  const tasks = await prisma.task.findMany({
    where: { agentId: agent.id, status: { notIn: ["approved", "cancelled"] } },
    orderBy: { updatedAt: "desc" },
  });
  const recentCompleted = await prisma.task.findMany({
    where: { agentId: agent.id, status: "approved" },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">AI Staff</div>
      <h1 className="font-display text-3xl font-black">{def.name}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">{def.mission}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {def.responsibilities.map((r) => (
          <span key={r} className="badge border border-line bg-surface2 text-ink-muted">
            {r}
          </span>
        ))}
      </div>

      <div className="mt-6">
        <AssignTaskForm agentKey={key} />
      </div>

      <SectionTitle>진행중 / 검토대기 / 반복업무</SectionTitle>
      {tasks.length === 0 ? (
        <EmptyRow text="배정된 업무가 없어요." />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between hover:border-accent">
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                <span className="font-medium">{t.title}</span>
                {t.isRecurring && <span className="text-xs text-accent">🔁 {t.scheduleType}</span>}
              </div>
              <span className="text-xs text-ink-muted">{formatRelative(t.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}

      <SectionTitle>최근 완료</SectionTitle>
      {recentCompleted.length === 0 ? (
        <EmptyRow text="아직 완료된 업무가 없어요." />
      ) : (
        <div className="flex flex-col gap-2">
          {recentCompleted.map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between hover:border-accent">
              <span className="font-medium">{t.title}</span>
              <span className="text-xs text-ink-muted">{formatRelative(t.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 font-display text-lg font-bold">{children}</h2>;
}
function EmptyRow({ text }: { text: string }) {
  return <div className="card text-sm italic text-ink-muted">{text}</div>;
}
