import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail/adapter";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function GET(req: NextRequest) {
  // This app has no per-user login yet (see docs/ARCHITECTURE.md). Anyone
  // who can reach this URL can reach everything a connected Gmail/Drive
  // account exposes. Route through the warning page instead of letting a
  // stray link or crawler kick off a real OAuth grant.
  if (req.nextUrl.searchParams.get("confirmed") !== "1") {
    return NextResponse.redirect(new URL("/integrations/connect-warning", req.url));
  }
  const url = getAuthUrl(SCOPES);
  if (!url) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID/SECRET not configured — set them in .env first." },
      { status: 400 }
    );
  }
  return NextResponse.redirect(url);
}
