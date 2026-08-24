import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [working, review, dueSoon, dueToday, failed, reviewTasks, recentApproved, agents] = await Promise.all([
    prisma.task.count({ where: { status: { in: ["queued", "working"] } } }),
    prisma.task.count({ where: { status: "review" } }),
    prisma.task.count({ where: { deadline: { gte: now, lte: in7Days }, status: { notIn: ["approved", "cancelled"] } } }),
    prisma.task.count({ where: { isRecurring: true, status: "scheduled", nextRunAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.task.count({ where: { status: "failed" } }),
    prisma.task.findMany({
      where: { status: "review" },
      include: { agent: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.task.findMany({
      where: { status: "approved" },
      include: { agent: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.agent.findMany({
      include: { _count: { select: { tasks: true } } },
    }),
  ]);

  const agentStatusCounts = await Promise.all(
    agents.map(async (agent) => {
      const [w, r, s] = await Promise.all([
        prisma.task.count({ where: { agentId: agent.id, status: { in: ["queued", "working"] } } }),
        prisma.task.count({ where: { agentId: agent.id, status: "review" } }),
        prisma.task.count({ where: { agentId: agent.id, status: "scheduled" } }),
      ]);
      return { agent, working: w, review: r, scheduled: s };
    })
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Command Center</div>
      <h1 className="font-display text-3xl font-black">지휘본부</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        지금 판단해야 할 것부터 보여드립니다. 각 AI Staff에게 업무를 배정하려면 왼쪽에서 담당자를 고르세요.
      </p>

      <div className="mt-6 grid grid-cols-5 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-sm">
        <Kpi label="진행중" value={working} />
        <Kpi label="검토대기" value={review} tone="warn" />
        <Kpi label="마감임박(7일)" value={dueSoon} tone="accent" />
        <Kpi label="오늘 자동실행" value={dueToday} />
        <Kpi label="실패한 업무" value={failed} tone={failed > 0 ? "danger" : undefined} />
      </div>

      <Section title="내가 확인해야 할 것" hint="검토 대기 중인 보고">
        {reviewTasks.length === 0 ? (
          <EmptyRow text="검토할 보고가 없어요." />
        ) : (
          <div className="flex flex-col gap-2">
            {reviewTasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="card flex items-center justify-between gap-3 hover:border-accent"
              >
                <div className="flex items-center gap-3">
                  <span className="badge bg-surface2 border border-line text-ink-muted">{t.agent.name}</span>
                  <span className="font-medium">{t.title}</span>
                </div>
                <span className="text-xs text-ink-muted">{formatRelative(t.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="오늘 실행되는 반복업무" hint="Schedule Task">
        <RecurringToday />
      </Section>

      <Section title="Agent별 업무 현황">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {agentStatusCounts.map(({ agent, working, review, scheduled }) => (
            <Link key={agent.id} href={`/agents/${agent.key}`} className="card hover:border-accent">
              <div className="font-medium">{agent.name}</div>
              <div className="mt-2 flex gap-3 text-xs text-ink-muted">
                <span>진행중 {working}</span>
                <span>검토 {review}</span>
                <span>반복 {scheduled}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="최근 완료">
        {recentApproved.length === 0 ? (
          <EmptyRow text="아직 승인된 업무가 없어요." />
        ) : (
          <div className="flex flex-col gap-2">
            {recentApproved.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between hover:border-accent">
                <div className="flex items-center gap-3">
                  <span className="badge bg-surface2 border border-line text-ink-muted">{t.agent.name}</span>
                  <span className="font-medium">{t.title}</span>
                </div>
                <span className="text-xs text-ink-muted">{formatDate(t.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

async function RecurringToday() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const tasks = await prisma.task.findMany({
    where: { isRecurring: true, status: "scheduled", nextRunAt: { gte: todayStart, lt: todayEnd } },
    include: { agent: true },
  });
  if (tasks.length === 0) return <EmptyRow text="오늘 예정된 반복 실행이 없어요." />;
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((t) => (
        <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between hover:border-accent">
          <div className="flex items-center gap-3">
            <span className="badge bg-surface2 border border-line text-ink-muted">{t.agent.name}</span>
            <span className="font-medium">{t.title}</span>
          </div>
          <span className="text-xs text-ink-muted">{t.nextRunAt ? formatDate(t.nextRunAt) : "-"}</span>
        </Link>
      ))}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "accent" | "warn" | "danger" }) {
  const toneClass = tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="bg-surface p-4">
      <div className={`font-mono text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="card text-sm italic text-ink-muted">{text}</div>;
}
