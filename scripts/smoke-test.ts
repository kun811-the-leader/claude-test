/**
 * End-to-end smoke test of the Core Loop, run directly against the server
 * action functions (no HTTP server needed). Exercises: create -> clarifying
 * (Demo Mode proposes a brief) -> confirm+run -> review -> approve -> tag ->
 * knowledge index -> handoff. Exits non-zero on any assertion failure.
 */
import { createTask, sendClarifyingMessage, confirmBriefAndRun, approveReport, createHandoffTask, requestRevision } from "../src/app/actions";
import { prisma } from "../src/lib/prisma";
import { searchKnowledge } from "../src/lib/knowledge/rag";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  console.log("1) createTask (market-researcher)");
  const { taskId } = await createTask({
    agentKey: "market-researcher",
    title: "일본 B2B 잠재고객 조사",
    instruction: "일본에서 통로이미지의 잠재 B2B 고객 5곳을 조사해줘.",
  });
  let task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  console.log("   status:", task.status);
  assert(task.status === "ready", `expected ready after demo brief proposal, got ${task.status}`);

  console.log("2) confirmBriefAndRun (one-off, deadline set)");
  await confirmBriefAndRun(taskId, "2026-09-01");
  task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  console.log("   status:", task.status);
  assert(task.status === "review", `expected review after run, got ${task.status}`);

  const report = await prisma.report.findFirstOrThrow({ where: { taskId }, orderBy: { createdAt: "desc" } });

  console.log("3) requestRevision then re-run");
  await requestRevision(report.id, "5곳 말고 3곳만 더 자세히 다시 해줘 (테스트)");
  task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  console.log("   status:", task.status);
  assert(task.status === "review", `expected review again after rework, got ${task.status}`);

  const report2 = await prisma.report.findFirstOrThrow({ where: { taskId }, orderBy: { createdAt: "desc" } });

  console.log("4) approveReport with a tag");
  const { suggestedHandoffTo } = await approveReport(report2.id, ["스모크테스트"]);
  const taskWithTags = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { entityTags: { include: { tag: true } } } });
  console.log("   status:", taskWithTags.status, "tags:", taskWithTags.entityTags.map((t) => t.tag.label));
  console.log("   suggestedHandoffTo:", suggestedHandoffTo);
  assert(taskWithTags.status === "approved", `expected approved, got ${taskWithTags.status}`);
  assert(taskWithTags.entityTags.some((t) => t.tag.label === "스모크테스트"), "tag not applied");
  assert(suggestedHandoffTo.includes("sales-assistant"), "expected sales-assistant handoff suggestion");

  console.log("5) knowledge index + search");
  const hits = await searchKnowledge({ workspaceId: taskWithTags.workspaceId, query: "일본 B2B 잠재고객" });
  console.log("   hits:", hits.length);
  assert(hits.length > 0, "expected at least one knowledge hit after approval indexing");

  console.log("6) createHandoffTask -> sales-assistant");
  const { taskId: handoffTaskId } = await createHandoffTask({
    sourceTaskId: taskId,
    targetAgentKey: "sales-assistant",
    title: "일본 리드 영업 전략",
    instruction: "방금 조사한 리드들 영업 전략 짜줘.",
  });
  const handoffTask = await prisma.task.findUniqueOrThrow({ where: { id: handoffTaskId } });
  console.log("   sourceTaskId:", handoffTask.sourceTaskId, "status:", handoffTask.status);
  assert(handoffTask.sourceTaskId === taskId, "handoff task missing sourceTaskId");

  console.log("\nALL SMOKE TESTS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
