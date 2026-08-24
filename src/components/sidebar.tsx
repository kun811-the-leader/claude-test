import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AGENT_DEFINITIONS } from "@/lib/agents/definitions";

async function reviewCount() {
  try {
    return await prisma.task.count({ where: { status: "review" } });
  } catch {
    return 0;
  }
}

export async function Sidebar() {
  const count = await reviewCount();
  const agents = Object.values(AGENT_DEFINITIONS);

  return (
    <aside className="flex h-screen w-60 flex-none flex-col gap-6 overflow-y-auto border-r border-line bg-surface p-4">
      <div>
        <div className="font-display text-lg font-bold">AI Staff OS</div>
        <div className="text-xs text-ink-muted">지휘본부</div>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        <SidebarLink href="/" label="지휘본부" />
        <SidebarLink href="/review" label="검토 대기" badge={count || undefined} />
        <SidebarLink href="/tasks" label="업무" />
        <SidebarLink href="/workflows" label="Workflow" />
      </nav>

      <div>
        <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">AI Staff</div>
        <nav className="flex flex-col gap-1 text-sm">
          {agents.map((a) => (
            <SidebarLink key={a.key} href={`/agents/${a.key}`} label={a.name} />
          ))}
        </nav>
      </div>

      <div>
        <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Knowledge</div>
        <nav className="flex flex-col gap-1 text-sm">
          <SidebarLink href="/knowledge" label="Knowledge" />
          <SidebarLink href="/meetings" label="회의록" />
        </nav>
      </div>

      <div className="mt-auto">
        <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">System</div>
        <nav className="flex flex-col gap-1 text-sm">
          <SidebarLink href="/integrations" label="연동" />
        </nav>
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-ink hover:bg-surface2"
    >
      <span>{label}</span>
      {badge ? <span className="badge bg-warn-bg text-warn">{badge}</span> : null}
    </Link>
  );
}
