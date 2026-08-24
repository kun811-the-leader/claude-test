"use client";

import { useState, useTransition } from "react";
import { searchKnowledgeAction } from "@/app/actions";

interface Hit {
  documentId: string;
  documentTitle: string;
  sourceType: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim()) return;
          startTransition(async () => setHits(await searchKnowledgeAction(query.trim())));
        }}
      >
        <input
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 일본 시장 관련해서 지금까지 뭘 알아냈지?"
        />
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          검색
        </button>
      </form>

      {hits !== null && (
        <div className="flex flex-col gap-2">
          {hits.length === 0 && (
            <div className="card text-sm italic text-ink-muted">
              현재 저장된 내부 자료만으로는 근거가 부족합니다.
            </div>
          )}
          {hits.map((h, i) => (
            <div key={i} className="card">
              <div className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
                <span className="badge border border-line bg-surface2">{h.documentTitle}</span>
                <span>{h.sourceType}</span>
                <span className="ml-auto font-mono">score {h.score.toFixed(2)}</span>
              </div>
              <p className="text-sm text-ink-muted">{h.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
