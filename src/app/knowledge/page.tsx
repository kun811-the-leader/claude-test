import { prisma } from "@/lib/prisma";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">Knowledge</div>
      <h1 className="font-display text-3xl font-black">Knowledge</h1>
      <p className="mt-1 text-sm text-ink-muted">
        승인된 보고, 회의록, 업로드한 자료가 여기 색인돼요. 인사이트 토론자가 이 자료를 근거로 답합니다.
      </p>

      <div className="mt-6">
        <KnowledgeSearch />
      </div>

      <h2 className="mb-2 mt-8 font-display text-lg font-bold">저장된 문서</h2>
      <div className="flex flex-col gap-2">
        {documents.length === 0 && <div className="card text-sm italic text-ink-muted">아직 저장된 문서가 없어요.</div>}
        {documents.map((d) => (
          <div key={d.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-ink-muted">
                {d.sourceType} · 청크 {d._count.chunks}개
              </div>
            </div>
            <span className="text-xs text-ink-muted">{formatDate(d.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
