export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return formatDate(date);
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  clarifying: "의도 확인중",
  ready: "시작 대기",
  queued: "대기열",
  working: "진행중",
  review: "검토 대기",
  revision: "재작업중",
  scheduled: "다음 실행 대기",
  approved: "완료",
  cancelled: "취소됨",
  failed: "실행 실패",
};

export const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "ok" | "danger"> = {
  draft: "neutral",
  clarifying: "accent",
  ready: "accent",
  queued: "accent",
  working: "accent",
  review: "warn",
  revision: "warn",
  scheduled: "neutral",
  approved: "ok",
  cancelled: "neutral",
  failed: "danger",
};
