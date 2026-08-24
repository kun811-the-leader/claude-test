import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

/**
 * Workflow view, honestly scoped: a visual node/edge canvas editor (spec
 * §26/§28) isn't built yet — the `Workflow`/`WorkflowNode`/`WorkflowEdge`
 * tables exist and are ready for one. What IS real here: every task created
 * via Handoff (spec §27) carries `sourceTaskId`, so this page traces those
 * chains into a Flow View automatically, with zero manual wiring required.
 */
export default async function WorkflowsPage() {
  const roots = await prisma.task.findMany({
    where: { sourceTaskId: null },
    include: { agent: true, _count: { select: { dependsOn: true } } },
    orderBy: { createdAt: "desc" },
  });

  const chains = await Promise.all(
    roots.map(async (root) => {
      const chain = await traceHandoffChain(root.id);
      return { root, chain };
    })
  );
  const withChains = chains.filter((c) => c.chain.length > 1);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Workflow</div>
      <h1 className="font-display text-3xl font-black">업무 흐름</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Handoff로 이어진 업무들의 흐름입니다. 노드/엣지를 직접 그리는 편집기는 아직 없고, 실제 Handoff 이력을
        자동으로 추적해 보여줘요.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {withChains.length === 0 && (
          <div className="card text-sm italic text-ink-muted">
            아직 Handoff로 이어진 업무 흐름이 없어요. 보고를 승인하면 다음 담당자에게 넘길지 물어봐요 — 그렇게 만든
            흐름이 여기 표시됩니다.
          </div>
        )}
        {withChains.map(({ root, chain }) => (
          <div key={root.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              {chain.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-ink-muted">→</span>}
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:border-accent">
                    <span className="text-xs text-ink-muted">{t.agentName}</span>
                    <span className="text-sm font-medium">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChainNode {
  id: string;
  title: string;
  status: string;
  agentName: string;
}

async function findRoot(id: string) {
  return prisma.task.findUnique({ where: { id }, include: { agent: true } });
}
type TaskWithAgent = NonNullable<Awaited<ReturnType<typeof findRoot>>>;

async function traceHandoffChain(rootId: string): Promise<ChainNode[]> {
  const chain: ChainNode[] = [];
  let current: TaskWithAgent | null = await findRoot(rootId);
  while (current) {
    chain.push({ id: current.id, title: current.title, status: current.status, agentName: current.agent.name });
    current = await prisma.task.findFirst({
      where: { sourceTaskId: current.id },
      include: { agent: true },
    });
  }
  return chain;
}
