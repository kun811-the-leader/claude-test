"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeetingFromTranscript } from "@/app/actions";

export function NewMeetingForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => setOpen(true)}>
        + 회의록 추가
      </button>
    );
  }

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !transcript.trim()) return;
        startTransition(async () => {
          const { taskId } = await createMeetingFromTranscript({ title: title.trim(), transcript: transcript.trim() });
          router.push(`/tasks/${taskId}`);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">회의 제목</label>
        <input className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">
          Transcript (받아쓴 내용을 붙여넣으세요 — 오디오 업로드/자동 받아쓰기는 TRANSCRIPTION_API_KEY 연결 후 지원됩니다)
        </label>
        <textarea
          className="min-h-[160px] rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setOpen(false)}>
          취소
        </button>
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "마크에게 전달하는 중…" : "마크에게 정리 요청"}
        </button>
      </div>
    </form>
  );
}
