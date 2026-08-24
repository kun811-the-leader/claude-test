import { PrismaClient } from "@prisma/client";
import { AGENT_DEFINITIONS } from "../src/lib/agents/definitions";
import { toJson } from "../src/lib/json";

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: "default-workspace" },
    update: {},
    create: { id: "default-workspace", name: "기본 워크스페이스" },
  });

  await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "실장님",
      email: "owner@example.com",
      role: "owner",
    },
  });

  for (const def of Object.values(AGENT_DEFINITIONS)) {
    await prisma.agent.upsert({
      where: { workspaceId_key: { workspaceId: workspace.id, key: def.key } },
      update: {
        name: def.name,
        mission: def.mission,
        responsibilities: toJson(def.responsibilities),
        clarificationPolicy: toJson(def.clarificationPolicy),
        executionPolicy: toJson(def.executionPolicy),
        allowedTools: toJson(def.allowedTools),
        forbiddenActions: toJson(def.forbiddenActions),
        outputSchema: def.outputSchema,
        approvalPolicy: toJson(def.approvalPolicy),
        handoffRules: toJson(def.handoffRules),
        knowledgeScope: toJson(def.knowledgeScope),
        systemPrompt: def.systemPrompt,
      },
      create: {
        workspaceId: workspace.id,
        key: def.key,
        name: def.name,
        mission: def.mission,
        responsibilities: toJson(def.responsibilities),
        clarificationPolicy: toJson(def.clarificationPolicy),
        executionPolicy: toJson(def.executionPolicy),
        allowedTools: toJson(def.allowedTools),
        forbiddenActions: toJson(def.forbiddenActions),
        outputSchema: def.outputSchema,
        approvalPolicy: toJson(def.approvalPolicy),
        handoffRules: toJson(def.handoffRules),
        knowledgeScope: toJson(def.knowledgeScope),
        systemPrompt: def.systemPrompt,
      },
    });
  }

  console.log(`Seeded workspace ${workspace.id} with ${Object.keys(AGENT_DEFINITIONS).length} agents.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
