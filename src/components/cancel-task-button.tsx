"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTask } from "@/app/actions";

export function CancelTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      className="rounded-lg border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-50"
      onClick={() => {
        if (!confirm("이 업무를 취소할까요?")) return;
        startTransition(async () => {
          await cancelTask(taskId);
          router.refresh();
        });
      }}
    >
      업무 취소
    </button>
  );
}
