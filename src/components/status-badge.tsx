import { STATUS_LABEL, STATUS_TONE } from "@/lib/format";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-surface2 text-ink-muted border border-line",
  accent: "bg-accent-bg text-accent",
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
  danger: "bg-danger-bg text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return <span className={`badge ${TONE_CLASSES[tone]}`}>{STATUS_LABEL[status] ?? status}</span>;
}
