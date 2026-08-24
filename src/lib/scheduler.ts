import { prisma } from "@/lib/prisma";
import { parseExpression } from "cron-parser";
import { assertTransition } from "@/lib/task/state-machine";
import { runAgentJob } from "@/lib/agents/executor";

/**
 * Scheduler tick (spec §25, §13). Production: point an external cron (Vercel
 * Cron, GitHub Actions, a real cron daemon — anything that can POST) at
 * /api/scheduler/tick on an interval. Local dev: `npm run scheduler:tick`
 * runs this function directly, no server or cron needed (spec's explicit
 * "Local에서는 Manual Trigger가 있어야 한다").
 *
 * Idempotency: a task is only picked up if `nextRunAt <= now` AND its
 * current status is exactly `scheduled` — the moment a run starts its status
 * flips to `working`, so a second tick landing before the first finishes
 * (e.g. an overlapping cron trigger) will not double-run it (spec §64
 * "동일 Schedule이 중복 실행되지 않는지").
 */
export async function tickScheduler(): Promise<{ triggered: string[]; failed: { taskId: string; error: string }[] }> {
  const due = await prisma.task.findMany({
    where: { isRecurring: true, enabled: true, status: "scheduled", nextRunAt: { lte: new Date() } },
  });

  const triggered: string[] = [];
  const failed: { taskId: string; error: string }[] = [];

  for (const task of due) {
    try {
      assertTransition(task.status as any, "working");
      const runCount = await prisma.taskRun.count({ where: { taskId: task.id } });
      const run = await prisma.taskRun.create({
        data: { taskId: task.id, runIndex: runCount + 1, status: "working", startedAt: new Date() },
      });

      await runAgentJob(task.id, run.id);
      await prisma.taskRun.update({ where: { id: run.id }, data: { status: "review", finishedAt: new Date() } });

      const next = task.cronExpression
        ? parseExpression(task.cronExpression, { tz: task.timezone }).next().toDate()
        : null;
      await prisma.task.update({ where: { id: task.id }, data: { lastRunAt: new Date(), nextRunAt: next } });

      triggered.push(task.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ taskId: task.id, error: message });
    }
  }

  return { triggered, failed };
}
