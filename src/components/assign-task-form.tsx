"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/app/actions";

export function AssignTaskForm({ agentKey }: { agentKey: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        onClick={() => setOpen(true)}
      >
        + 업무 배정
      </button>
    );
  }

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !instruction.trim()) return;
        startTransition(async () => {
          const { taskId } = await createTask({ agentKey, title: title.trim(), instruction: instruction.trim() });
          router.push(`/tasks/${taskId}`);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">업무 제목 *</label>
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 일본 B2B 잠재고객 30곳 조사"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">간단한 지시사항 *</label>
        <textarea
          className="min-h-[80px] rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="자연스러운 문장으로 지시하세요. 담당자가 필요한 걸 되물어봅니다."
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setOpen(false)}>
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "배정하는 중…" : "배정하고 대화 시작"}
        </button>
      </div>
    </form>
  );
}
