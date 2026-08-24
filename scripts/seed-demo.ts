/** Populates a few realistic tasks across different states, purely for screenshots/demo. */
import { createTask, confirmBriefAndRun, approveReport, sendClarifyingMessage } from "../src/app/actions";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 1) A task still in clarifying (agent asking questions)
  await createTask({
    agentKey: "mail-checker",
    title: "받은편지함 정리",
    instruction: "요즘 메일함이 너무 지저분해서 정리 좀 해줘.",
  });

  // 2) A task through to review (waiting for approval)
  const t2 = await createTask({
    agentKey: "market-researcher",
    title: "일본 B2B 잠재고객 조사",
    instruction: "일본에서 통로이미지의 잠재 B2B 고객 30곳을 조사해줘. 광고대행사, 미디어, 콘텐츠 제작사 위주로.",
  });
  await confirmBriefAndRun(t2.taskId, "2026-09-05");

  // 3) A fully approved task (shows up in completed / knowledge)
  const t3 = await createTask({
    agentKey: "marketing-assistant",
    title: "9월 캠페인 기획",
    instruction: "9월 신제품 런칭 캠페인 기획해줘. 타겟은 30대 직장인.",
  });
  await confirmBriefAndRun(t3.taskId, "2026-09-10");
  const report3 = await prisma.report.findFirstOrThrow({ where: { taskId: t3.taskId }, orderBy: { createdAt: "desc" } });
  await approveReport(report3.id, ["9월캠페인", "신제품런칭"]);

  // 4) A recurring task, already run once and waiting on schedule
  const t4 = await createTask({
    agentKey: "market-researcher",
    title: "생성형 AI 이미지 시장 매일 모니터링",
    instruction: "매일 오전 9시에 생성형 AI 이미지 시장의 주요 뉴스를 조사해줘.",
  });
  await confirmBriefAndRun(t4.taskId, undefined, { type: "daily" });
  const report4 = await prisma.report.findFirstOrThrow({ where: { taskId: t4.taskId }, orderBy: { createdAt: "desc" } });
  await approveReport(report4.id, ["시장모니터링"]);

  console.log(JSON.stringify({ reviewTaskId: t2.taskId }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
