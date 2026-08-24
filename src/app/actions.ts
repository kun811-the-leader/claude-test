"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toJson, fromJson } from "@/lib/json";
import { getDefaultWorkspace, getDefaultUser } from "@/lib/workspace";
import { getAgentDefinition } from "@/lib/agents/definitions";
import { assertTransition } from "@/lib/task/state-machine";
import { runAgentJob } from "@/lib/agents/executor";
import { getLlmAdapter } from "@/lib/llm/adapter";
import { EXECUTION_BRIEF_SCHEMA } from "@/lib/types";
import { indexDocument } from "@/lib/knowledge/rag";
import { audit } from "@/lib/audit";
import { parseExpression } from "cron-parser";

/** revalidatePath throws outside an actual Next.js request (e.g. scripts,
 * the scheduler running via `npm run scheduler:tick`). These calls are a
 * cache-freshness nicety, not correctness-critical — swallow that one case. */
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside request scope
  }
}

// ── Task creation & clarifying conversation ────────────────────────────

export async function createTask(params: { agentKey: string; title: string; instruction: string }) {
  const workspace = await getDefaultWorkspace();
  const agent = await prisma.agent.findUniqueOrThrow({
    where: { workspaceId_key: { workspaceId: workspace.id, key: params.agentKey } },
  });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      agentId: agent.id,
      title: params.title,
      status: "clarifying",
      conversations: {
        create: {
          agentId: agent.id,
          kind: "task",
          messages: { create: { role: "user", content: params.instruction } },
        },
      },
    },
  });

  await audit({ workspaceId: workspace.id, actorType: "user", action: "TASK_CREATED", entityType: "task", entityId: task.id });

  // Kick off the clarifying turn immediately so the user isn't staring at silence.
  await advanceClarifyingConversation(task.id);

  safeRevalidate("/");
  return { taskId: task.id };
}

const BRIEF_FENCE_RE = /```brief\s*([\s\S]*?)```/;

/**
 * Runs one clarifying turn: builds the agent's clarifying-mode prompt from
 * its ClarificationPolicy, asks the LLM, and looks for a ```brief fenced
 * JSON block signalling "I have enough to start" (spec §14-§15). If found,
 * a TaskBrief is drafted (unconfirmed) and the task moves to `ready`.
 */
async function advanceClarifyingConversation(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { agent: true, conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
  });
  const def = getAgentDefinition(task.agent.key);
  const conversation = task.conversations[0];
  if (!def || !conversation) return;

  const system = `${def.systemPrompt}

## 지금은 업무 배정 직후의 Clarifying 단계입니다
${def.clarificationPolicy.guidance}
질문은 최대 ${def.clarificationPolicy.maxQuestions}개까지만 하세요. 사용자가 준 정보로 충분하다고 판단되면,
질문 대신 아래 형식으로 Execution Brief를 제안하세요 (다른 말 없이 이 펜스만):

\`\`\`brief
{
  "objective": string,
  "background": string,
  "scope": string,
  "target": string,
  "constraints": string[],
  "exclusions": string[],
  "requiredSources": string[],
  "deliverables": string[],
  "successCriteria": string[]
}
\`\`\`
`;

  const llm = getLlmAdapter();
  const reply = await llm.complete({
    system,
    messages: conversation.messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
  });

  await prisma.message.create({ data: { conversationId: conversation.id, role: "agent", content: reply } });

  const briefMatch = reply.match(BRIEF_FENCE_RE);
  if (briefMatch) {
    try {
      const parsed = EXECUTION_BRIEF_SCHEMA.parse(JSON.parse(briefMatch[1]!));
      const nextVersion = ((await prisma.taskBrief.count({ where: { taskId } })) || 0) + 1;
      await prisma.taskBrief.create({
        data: {
          taskId,
          version: nextVersion,
          objective: parsed.objective,
          background: parsed.background,
          scope: parsed.scope,
          target: parsed.target,
          constraints: toJson(parsed.constraints),
          exclusions: toJson(parsed.exclusions),
          requiredSources: toJson(parsed.requiredSources),
          deliverables: toJson(parsed.deliverables),
          successCriteria: toJson(parsed.successCriteria),
          deadline: task.deadline,
        },
      });
      assertTransition(task.status as any, "ready");
      await prisma.task.update({ where: { id: taskId }, data: { status: "ready" } });
    } catch {
      // Model claimed readiness but the JSON didn't validate — stay in
      // `clarifying` and let the user's next message trigger another try.
    }
  }
}

export async function sendClarifyingMessage(taskId: string, content: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { conversations: true } });
  const conversation = task.conversations[0];
  if (!conversation) throw new Error("Task has no conversation");

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content } });
  if (task.status === "ready") {
    // user replied after a brief was proposed -> back to clarifying to revise it
    assertTransition("ready", "clarifying");
    await prisma.task.update({ where: { id: taskId }, data: { status: "clarifying" } });
  }
  await advanceClarifyingConversation(taskId);
  safeRevalidate(`/tasks/${taskId}`);
}

// ── Brief confirmation & execution ──────────────────────────────────────

export async function confirmBriefAndRun(taskId: string, deadline?: string, schedule?: { type: "one_off" | "daily" | "weekly"; cron?: string }) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const brief = await prisma.taskBrief.findFirstOrThrow({ where: { taskId }, orderBy: { version: "desc" } });

  await prisma.taskBrief.update({ where: { id: brief.id }, data: { confirmedAt: new Date() } });
  await audit({ workspaceId: task.workspaceId, actorType: "user", action: "TASK_BRIEF_CONFIRMED", entityType: "task", entityId: taskId });

  assertTransition(task.status as any, "queued");
  const isRecurring = Boolean(schedule && schedule.type !== "one_off");
  let nextRunAt: Date | null = null;
  let cronExpression: string | null = null;
  if (isRecurring) {
    cronExpression = schedule!.cron ?? (schedule!.type === "daily" ? "0 9 * * *" : "0 9 * * 1");
    nextRunAt = parseExpression(cronExpression, { tz: "Asia/Seoul" }).next().toDate();
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "queued",
      deadline: deadline ? new Date(deadline) : null,
      isRecurring,
      scheduleType: schedule?.type ?? "one_off",
      cronExpression,
      nextRunAt,
    },
  });

  if (isRecurring) {
    // First run happens immediately so the user sees output right away;
    // subsequent runs are created by the scheduler (see src/lib/scheduler.ts).
    const run = await prisma.taskRun.create({ data: { taskId, runIndex: 1, status: "working", startedAt: new Date() } });
    await runAgentJob(taskId, run.id);
    await prisma.taskRun.update({ where: { id: run.id }, data: { status: "review", finishedAt: new Date() } });
  } else {
    await runAgentJob(taskId);
  }

  safeRevalidate(`/tasks/${taskId}`);
  safeRevalidate("/review");
  safeRevalidate("/");
}

// ── Review / Approval ────────────────────────────────────────────────────

export async function approveReport(reportId: string, tags: string[]) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { task: { include: { agent: true } }, versions: { orderBy: { version: "desc" }, take: 1 }, taskRun: true },
  });
  const latestVersion = report.versions[0]!;
  const user = await getDefaultUser();

  await prisma.approval.create({
    data: { reportId, reportVersionId: latestVersion.id, decision: "approved", decidedByUserId: user.id },
  });

  const suggested = fromJson<string[]>(latestVersion.suggestedTags, []);
  const allTags = Array.from(new Set([...suggested, ...tags])).filter(Boolean);
  for (const label of allTags) {
    const key = label.trim().toLowerCase().replace(/\s+/g, "-");
    const tag = await prisma.tag.upsert({
      where: { workspaceId_key: { workspaceId: report.task.workspaceId, key } },
      update: {},
      create: { workspaceId: report.task.workspaceId, key, label, kind: "free" },
    });
    await prisma.entityTag.create({ data: { tagId: tag.id, entityType: "task", taskId: report.taskId } });
    await prisma.entityTag.create({ data: { tagId: tag.id, entityType: "report", reportId } });
  }
  if (allTags.length) {
    await audit({ workspaceId: report.task.workspaceId, actorType: "user", action: "TAG_APPLIED", entityType: "report", entityId: reportId, metadata: allTags });
  }

  const isRecurring = report.task.isRecurring;
  assertTransition(report.task.status as any, "approved");
  await prisma.task.update({ where: { id: report.taskId }, data: { status: "approved" } });

  if (report.taskRunId) {
    await prisma.taskRun.update({ where: { id: report.taskRunId }, data: { status: "approved" } });
  }

  // Index into Knowledge Base (spec §22 step 7)
  const doc = await prisma.document.create({
    data: {
      workspaceId: report.task.workspaceId,
      title: report.task.title,
      sourceType: "report",
      sourceId: reportId,
      storageProvider: "internal",
      content: [latestVersion.summary, ...fromJson<{ title: string; content: string }[]>(latestVersion.deliverables, []).map((d) => `${d.title}\n${d.content}`)].join("\n\n"),
    },
  });
  await indexDocument(doc.id);
  await audit({ workspaceId: report.task.workspaceId, actorType: "system", action: "MEETING_INDEXED", entityType: "document", entityId: doc.id, metadata: { via: "report_approval" } });

  if (isRecurring) {
    assertTransition("approved", "scheduled");
    const next = report.task.cronExpression
      ? parseExpression(report.task.cronExpression, { tz: report.task.timezone }).next().toDate()
      : null;
    await prisma.task.update({ where: { id: report.taskId }, data: { status: "scheduled", lastRunAt: new Date(), nextRunAt: next } });
  }

  await audit({ workspaceId: report.task.workspaceId, actorType: "user", action: "REPORT_APPROVED", entityType: "report", entityId: reportId });

  const suggestedHandoffTo = getAgentDefinition(report.task.agent.key)?.handoffRules.suggestsHandoffTo ?? [];

  safeRevalidate(`/tasks/${report.taskId}`);
  safeRevalidate("/review");
  safeRevalidate("/tasks");
  return { suggestedHandoffTo };
}

export async function requestRevision(reportId: string, feedback: string) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { task: true, versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const user = await getDefaultUser();

  await prisma.approval.create({
    data: {
      reportId,
      reportVersionId: report.versions[0]!.id,
      decision: "revision_requested",
      feedback,
      decidedByUserId: user.id,
    },
  });

  assertTransition(report.task.status as any, "revision");
  await prisma.task.update({ where: { id: report.taskId }, data: { status: "revision" } });
  await audit({ workspaceId: report.task.workspaceId, actorType: "user", action: "REVISION_REQUESTED", entityType: "report", entityId: reportId, metadata: { feedback } });

  // Feed the feedback back in as a conversation turn so the next run has it as context.
  const conversation = await prisma.conversation.findFirst({ where: { taskId: report.taskId } });
  if (conversation) {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: "user", content: `[재작업 요청]\n${feedback}` },
    });
  }

  await runAgentJob(report.taskId);

  safeRevalidate(`/tasks/${report.taskId}`);
  safeRevalidate("/review");
}

export async function cancelTask(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assertTransition(task.status as any, "cancelled");
  await prisma.task.update({ where: { id: taskId }, data: { status: "cancelled" } });
  await audit({ workspaceId: task.workspaceId, actorType: "user", action: "TASK_CANCELLED", entityType: "task", entityId: taskId });
  safeRevalidate(`/tasks/${taskId}`);
  safeRevalidate("/");
}

// ── Handoff ───────────────────────────────────────────────────────────

export async function createHandoffTask(params: {
  sourceTaskId: string;
  targetAgentKey: string;
  title: string;
  instruction: string;
}) {
  const source = await prisma.task.findUniqueOrThrow({ where: { id: params.sourceTaskId } });
  const sourceReport = await prisma.report.findFirst({ where: { taskId: params.sourceTaskId }, orderBy: { createdAt: "desc" } });
  const workspace = await getDefaultWorkspace();
  const agent = await prisma.agent.findUniqueOrThrow({
    where: { workspaceId_key: { workspaceId: workspace.id, key: params.targetAgentKey } },
  });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      agentId: agent.id,
      title: params.title,
      status: "clarifying",
      sourceTaskId: source.id,
      sourceReportId: sourceReport?.id,
      conversations: {
        create: { agentId: agent.id, kind: "task", messages: { create: { role: "user", content: params.instruction } } },
      },
    },
  });

  await audit({ workspaceId: workspace.id, actorType: "user", action: "HANDOFF_CREATED", entityType: "task", entityId: task.id, metadata: { sourceTaskId: source.id } });
  await advanceClarifyingConversation(task.id);

  safeRevalidate("/");
  return { taskId: task.id };
}

// ── Knowledge ─────────────────────────────────────────────────────────

export async function searchKnowledgeAction(query: string) {
  const workspace = await getDefaultWorkspace();
  const { searchKnowledge } = await import("@/lib/knowledge/rag");
  return searchKnowledge({ workspaceId: workspace.id, query, limit: 8 });
}

// ── Meetings (Mark) ──────────────────────────────────────────────────────

export async function createMeetingFromTranscript(params: { title: string; transcript: string }) {
  const workspace = await getDefaultWorkspace();
  const agent = await prisma.agent.findUniqueOrThrow({
    where: { workspaceId_key: { workspaceId: workspace.id, key: "meeting-mark" } },
  });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      agentId: agent.id,
      title: `회의록: ${params.title}`,
      status: "clarifying",
      conversations: {
        create: {
          agentId: agent.id,
          kind: "task",
          messages: {
            create: {
              role: "user",
              content: `다음 회의 내용을 정리해줘.\n\n제목: ${params.title}\n\n${params.transcript}`,
            },
          },
        },
      },
    },
  });

  await audit({ workspaceId: workspace.id, actorType: "user", action: "TASK_CREATED", entityType: "task", entityId: task.id, metadata: { via: "meeting" } });
  await advanceClarifyingConversation(task.id);
  safeRevalidate("/meetings");
  return { taskId: task.id };
}
