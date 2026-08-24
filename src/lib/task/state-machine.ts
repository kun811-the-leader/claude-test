import { TaskStatus } from "@/lib/types";

/**
 * The single source of truth for task status transitions (spec §16). Nothing
 * else in the codebase should assign `task.status = "..."` directly — always
 * go through `transition()` so an illegal jump throws instead of silently
 * corrupting state.
 *
 *   draft → clarifying → ready → queued → working → review
 *     review --approve--> approved
 *     review --revise---> revision → working → review (loop)
 *   scheduled is used by recurring tasks between runs (see TaskRun).
 *   Any non-terminal state can move to cancelled. working can move to failed
 *   (agent job crashed) and failed can be retried back to queued.
 */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ["clarifying", "cancelled"],
  clarifying: ["clarifying", "ready", "cancelled"],
  ready: ["queued", "clarifying", "cancelled"],
  queued: ["working", "cancelled"],
  working: ["review", "failed", "scheduled", "cancelled"],
  review: ["approved", "revision", "cancelled"],
  revision: ["working", "cancelled"],
  scheduled: ["working", "cancelled"],
  approved: ["scheduled"], // recurring task's report was approved -> waits for next run
  cancelled: [],
  failed: ["queued", "cancelled"],
};

export class IllegalTransitionError extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Illegal task transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

/** Legacy artifact-board status -> new state machine status (spec §16 migration table). */
export const LEGACY_STATUS_MAP: Record<string, TaskStatus> = {
  assigned: "ready",
  in_progress: "working",
  reported: "review",
  scheduled: "scheduled",
  accepted: "approved",
  cancelled: "cancelled",
};
