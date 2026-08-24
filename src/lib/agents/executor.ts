import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json";
import { assertTransition } from "@/lib/task/state-machine";
import { assembleContext } from "@/lib/agents/context-assembler";
import { getLlmAdapter } from "@/lib/llm/adapter";
import { ReportDeliverableSchema, type ReportDeliverable } from "@/lib/types";
import { audit } from "@/lib/audit";

/**
 * StructuredOutputParser (spec §17). The model is asked for one JSON object;
 * this tries strict parse first, then a best-effort brace-extraction (models
 * sometimes wrap JSON in prose despite instructions), and only as a last
 * resort falls back to treating the raw text as the executive summary — it
 * never throws away the agent's output just because it wasn't perfect JSON.
 */
export function parseDeliverable(raw: string): ReportDeliverable {
  const attempts = [raw, raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)];
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      const result = ReportDeliverableSchema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // try next candidate
    }
  }
  return ReportDeliverableSchema.parse({
    executiveSummary: raw.slice(0, 2000),
    deliverables: [],
    keyFindings: [],
    sources: [],
    suggestedNextActions: [],
    suggestedTags: [],
    agentNote: "모델 출력이 JSON 형식이 아니어서 원문을 executiveSummary로 저장했습니다.",
  });
}

/**
 * Runs one Agent Job end to end: Task -> Context -> LLM -> Structured
 * Deliverable -> Report -> `review`. This is the Phase 4 engine the whole
 * product is built around (spec §17, §68's "Core Loop").
 */
export async function runAgentJob(taskId: string, taskRunId?: string): Promise<{ reportId: string }> {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { agent: true } });

  assertTransition(task.status as any, "working");
  await prisma.task.update({ where: { id: taskId }, data: { status: "working" } });
  await audit({
    workspaceId: task.workspaceId,
    actorType: "system",
    action: "TASK_STATUS_CHANGED",
    entityType: "task",
    entityId: taskId,
    metadata: { from: task.status, to: "working" },
  });

  const job = await prisma.agentJob.create({
    data: { taskId, taskRunId, agentId: task.agentId, status: "running", startedAt: new Date() },
  });
  await audit({
    workspaceId: task.workspaceId,
    actorType: "system",
    action: "AGENT_JOB_STARTED",
    entityType: "agent_job",
    entityId: job.id,
  });

  try {
    const { system, messages } = await assembleContext(taskId);
    const llm = getLlmAdapter();
    const raw = await llm.complete({ system, messages });
    const deliverable = parseDeliverable(raw);

    const report = await prisma.report.create({
      data: {
        taskId,
        taskRunId,
        status: "submitted",
        versions: {
          create: {
            version: 1,
            summary: deliverable.executiveSummary,
            deliverables: toJson(deliverable.deliverables),
            keyFindings: toJson(deliverable.keyFindings),
            sources: toJson(deliverable.sources),
            limitations: deliverable.limitations,
            suggestedNextActions: toJson(deliverable.suggestedNextActions),
            suggestedTags: toJson(deliverable.suggestedTags),
            agentNote: deliverable.agentNote,
            structuredResult: deliverable.structured ? toJson(deliverable.structured) : null,
          },
        },
      },
    });

    assertTransition("working", "review");
    await prisma.task.update({ where: { id: taskId }, data: { status: "review" } });

    await prisma.agentJob.update({
      where: { id: job.id },
      data: { status: "succeeded", finishedAt: new Date(), outputSnapshot: toJson(deliverable) },
    });

    await audit({
      workspaceId: task.workspaceId,
      actorType: "agent",
      actorId: task.agentId,
      action: "REPORT_CREATED",
      entityType: "report",
      entityId: report.id,
    });

    return { reportId: report.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentJob.update({
      where: { id: job.id },
      data: { status: "failed", finishedAt: new Date(), error: message },
    });
    await prisma.task.update({ where: { id: taskId }, data: { status: "failed" } });
    await audit({
      workspaceId: task.workspaceId,
      actorType: "system",
      action: "AGENT_JOB_FINISHED",
      entityType: "agent_job",
      entityId: job.id,
      metadata: { status: "failed", error: message },
    });
    throw err;
  }
}
