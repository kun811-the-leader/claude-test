import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail/adapter";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function GET() {
  const url = getAuthUrl(SCOPES);
  if (!url) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID/SECRET not configured — set them in .env first." },
      { status: 400 }
    );
  }
  return NextResponse.redirect(url);
}
