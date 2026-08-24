import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/gmail/adapter";
import { prisma } from "@/lib/prisma";
import { getDefaultWorkspace } from "@/lib/workspace";
import { audit } from "@/lib/audit";
import { encryptToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const client = getOAuthClient();
  if (!client || !code) {
    return NextResponse.json({ error: "Missing code or OAuth not configured" }, { status: 400 });
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let accountEmail: string | undefined;
  try {
    const oauth2 = await import("googleapis").then((g) => g.google.oauth2({ version: "v2", auth: client }));
    const info = await oauth2.userinfo.get();
    accountEmail = info.data.email ?? undefined;
  } catch {
    // non-fatal — connection still succeeds without a displayed email
  }

  if (!tokens.refresh_token) {
    // Google only returns a refresh_token on the FIRST consent (or after
    // revoking + re-consenting) — without one we'd have nothing durable to
    // encrypt and store, so fail loudly instead of silently half-connecting.
    return NextResponse.json(
      { error: "Google didn't return a refresh token. Revoke this app's access in your Google Account and try connecting again." },
      { status: 400 }
    );
  }
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);

  const workspace = await getDefaultWorkspace();
  for (const provider of ["gmail", "google_drive"] as const) {
    await prisma.integration.upsert({
      where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
      update: {
        status: "connected",
        accountEmail,
        refreshTokenEnc: encryptedRefreshToken,
        scope: tokens.scope,
        connectedAt: new Date(),
      },
      create: {
        workspaceId: workspace.id,
        provider,
        status: "connected",
        accountEmail,
        refreshTokenEnc: encryptedRefreshToken,
        scope: tokens.scope,
        connectedAt: new Date(),
      },
    });
  }

  await audit({ workspaceId: workspace.id, actorType: "user", action: "INTEGRATION_CONNECTED", entityType: "integration", entityId: "google", metadata: { accountEmail } });

  return NextResponse.redirect(new URL("/integrations", req.url));
}
