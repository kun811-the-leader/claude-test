import { createTask, confirmBriefAndRun, approveReport } from "../src/app/actions";
import { prisma } from "../src/lib/prisma";
import { tickScheduler } from "../src/lib/scheduler";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  console.log("1) createTask (market-researcher, recurring)");
  const { taskId } = await createTask({
    agentKey: "market-researcher",
    title: "생성형 AI 이미지 시장 매일 모니터링",
    instruction: "매일 오전 9시에 생성형 AI 이미지 시장의 주요 뉴스를 조사해줘.",
  });

  console.log("2) confirmBriefAndRun (daily schedule) — should run once immediately");
  await confirmBriefAndRun(taskId, undefined, { type: "daily" });
  let task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  console.log("   status:", task.status, "isRecurring:", task.isRecurring, "nextRunAt:", task.nextRunAt);
  assert(task.status === "review", `expected review after first run, got ${task.status}`);
  assert(task.isRecurring, "expected isRecurring=true");

  let runs = await prisma.taskRun.findMany({ where: { taskId } });
  assert(runs.length === 1, `expected 1 run so far, got ${runs.length}`);

  console.log("3) approve run #1 — recurring task should go back to `scheduled`, not `approved`");
  const report1 = await prisma.report.findFirstOrThrow({ where: { taskId }, orderBy: { createdAt: "desc" } });
  await approveReport(report1.id, []);
  task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  console.log("   status:", task.status, "nextRunAt:", task.nextRunAt);
  assert(task.status === "scheduled", `expected scheduled after approving a recurring run, got ${task.status}`);

  console.log("4) force nextRunAt into the past, then tickScheduler()");
  await prisma.task.update({ where: { id: taskId }, data: { nextRunAt: new Date(Date.now() - 60000) } });
  const result = await tickScheduler();
  console.log("   triggered:", result.triggered, "failed:", result.failed);
  assert(result.triggered.includes(taskId), "scheduler did not pick up the due task");

  task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  runs = await prisma.taskRun.findMany({ where: { taskId }, orderBy: { runIndex: "asc" } });
  console.log("   status:", task.status, "run count:", runs.length);
  assert(task.status === "review", `expected review after run #2, got ${task.status}`);
  assert(runs.length === 2, `expected 2 runs after scheduler tick, got ${runs.length}`);

  console.log("5) tickScheduler again immediately — must NOT double-run (still in review, not scheduled)");
  const result2 = await tickScheduler();
  assert(result2.triggered.length === 0, `expected no re-trigger while task is in review, got ${result2.triggered}`);

  console.log("\nALL RECURRING SMOKE TESTS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
