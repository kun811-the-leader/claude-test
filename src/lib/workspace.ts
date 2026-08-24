import { prisma } from "@/lib/prisma";

/**
 * Single-workspace-for-now helper. The schema already supports multiple
 * workspaces/users (spec §36 "Multi Workspace 확장이 불가능한 구조로 만들지
 * 마라") — there's just no auth/session layer wired up yet to pick a
 * different one. See docs/ARCHITECTURE.md for what a real login would add.
 */
export async function getDefaultWorkspace() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    throw new Error("No workspace found — run `npm run db:seed` first.");
  }
  return workspace;
}

export async function getDefaultUser() {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found — run `npm run db:seed` first.");
  }
  return user;
}
