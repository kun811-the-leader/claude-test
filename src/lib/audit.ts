import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json";

export type AuditAction =
  | "TASK_CREATED"
  | "TASK_BRIEF_CONFIRMED"
  | "TASK_STATUS_CHANGED"
  | "AGENT_JOB_STARTED"
  | "AGENT_JOB_FINISHED"
  | "TOOL_CALLED"
  | "TOOL_BLOCKED"
  | "REPORT_CREATED"
  | "REVISION_REQUESTED"
  | "REPORT_APPROVED"
  | "TASK_CANCELLED"
  | "EMAIL_BATCH_APPROVED"
  | "EMAIL_SENT"
  | "FILE_MOVED"
  | "FILE_DELETED"
  | "MEETING_INDEXED"
  | "HANDOFF_CREATED"
  | "TAG_APPLIED"
  | "INTEGRATION_CONNECTED";

export async function audit(params: {
  workspaceId: string;
  actorType: "user" | "agent" | "system";
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? toJson(params.metadata) : null,
    },
  });
}
