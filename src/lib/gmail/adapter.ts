import { google } from "googleapis";

/**
 * Gmail Adapter (spec §9, §43). Two concerns kept separate on purpose:
 *   - OAuth (getAuthUrl/exchangeCode) always works, it just needs
 *     GOOGLE_CLIENT_ID/SECRET to produce a real consent screen.
 *   - Mail operations (list/label/archive/send) require a connected
 *     Integration row (per-workspace stored token) — never a bare API key.
 * Until a workspace has connected Gmail, `getGmailClient` returns null and
 * every caller must render "연결 필요" — never a fake "connected" state
 * (spec §43, §67-#3).
 */

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: MailCategory;
}

export type MailCategory =
  | "urgent"
  | "reply_required"
  | "meeting"
  | "sales"
  | "important_info"
  | "newsletter"
  | "promotion"
  | "spam_candidate"
  | "archive_candidate";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getOAuthClient() {
  if (!isGoogleOAuthConfigured()) return null;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(scopes: string[]): string | null {
  const client = getOAuthClient();
  if (!client) return null;
  return client.generateAuthUrl({ access_type: "offline", scope: scopes, prompt: "consent" });
}

export const GMAIL_SCOPES = {
  readOnly: ["https://www.googleapis.com/auth/gmail.readonly"],
  readWrite: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
  ],
};

/**
 * Returns a real Gmail API client bound to a stored refresh token, or null
 * if this workspace hasn't connected Gmail yet / OAuth isn't configured.
 * Access-token refresh is handled by the googleapis client itself once the
 * refresh_token is set as credentials.
 */
export function getGmailClient(refreshToken: string | null | undefined) {
  const client = getOAuthClient();
  if (!client || !refreshToken) return null;
  client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: client });
}

/** Heuristic categorizer used until/unless a smarter model-driven pass replaces it. */
export function categorizeSubjectAndFrom(subject: string, from: string): MailCategory {
  const s = subject.toLowerCase();
  const f = from.toLowerCase();
  if (f.includes("noreply") || f.includes("no-reply")) {
    if (s.includes("newsletter") || s.includes("digest")) return "newsletter";
    return "promotion";
  }
  if (s.includes("긴급") || s.includes("urgent") || s.includes("asap")) return "urgent";
  if (s.includes("회의") || s.includes("meeting") || s.includes("미팅")) return "meeting";
  if (s.includes("제안") || s.includes("견적") || s.includes("계약")) return "sales";
  return "important_info";
}
