"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendClarifyingMessage, confirmBriefAndRun } from "@/app/actions";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Brief {
  objective: string;
  background: string | null;
  scope: string | null;
  target: string | null;
  deliverables: string[];
}

export function ClarifyingPanel({
  taskId,
  messages,
  pendingBrief,
}: {
  taskId: string;
  messages: Message[];
  pendingBrief: Brief | null;
}) {
  const [reply, setReply] = useState("");
  const [deadline, setDeadline] = useState("");
  const [scheduleType, setScheduleType] = useState<"one_off" | "daily" | "weekly">("one_off");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`card max-w-[85%] ${m.role === "user" ? "ml-auto bg-accent-bg" : ""}`}
          >
            <div className="mb-1 text-[11px] font-mono uppercase text-ink-muted">
              {m.role === "user" ? "나" : "담당자"}
            </div>
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
          </div>
        ))}
      </div>

      {pendingBrief ? (
        <div className="card border-accent">
          <div className="mb-2 font-display text-sm font-bold text-accent">제안된 Execution Brief</div>
          <dl className="flex flex-col gap-1 text-sm">
            <Row k="목표" v={pendingBrief.objective} />
            {pendingBrief.background && <Row k="배경" v={pendingBrief.background} />}
            {pendingBrief.scope && <Row k="범위" v={pendingBrief.scope} />}
            {pendingBrief.target && <Row k="대상" v={pendingBrief.target} />}
            {pendingBrief.deliverables.length > 0 && <Row k="결과물" v={pendingBrief.deliverables.join(", ")} />}
          </dl>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-muted">업무 형태</label>
              <select
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as any)}
              >
                <option value="one_off">1회 (데드라인)</option>
                <option value="daily">매일 반복</option>
                <option value="weekly">매주 반복</option>
              </select>
            </div>
            {scheduleType === "one_off" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-muted">Deadline</label>
                <input
                  type="date"
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            )}
            <button
              disabled={pending}
              className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  await confirmBriefAndRun(
                    taskId,
                    deadline || undefined,
                    scheduleType === "one_off" ? undefined : { type: scheduleType }
                  );
                  router.refresh();
                })
              }
            >
              {pending ? "실행하는 중…" : "이대로 시작"}
            </button>
          </div>
        </div>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          startTransition(async () => {
            await sendClarifyingMessage(taskId, reply.trim());
            setReply("");
            router.refresh();
          });
        }}
      >
        <input
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={pendingBrief ? "브리프를 고치고 싶으면 여기에 적어주세요" : "답변을 입력하세요"}
        />
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          보내기
        </button>
      </form>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 flex-none text-ink-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
