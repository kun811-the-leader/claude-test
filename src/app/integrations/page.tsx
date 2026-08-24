import { prisma } from "@/lib/prisma";
import { isGoogleOAuthConfigured } from "@/lib/gmail/adapter";
import { getLlmAdapter } from "@/lib/llm/adapter";
import { getWebSearchAdapter } from "@/lib/tools/web-search";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const integrations = await prisma.integration.findMany();
  const byProvider = Object.fromEntries(integrations.map((i) => [i.provider, i]));
  const oauthConfigured = isGoogleOAuthConfigured();
  const llmMode = getLlmAdapter().mode;
  const searchMode = getWebSearchAdapter().mode;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">System</div>
      <h1 className="font-display text-3xl font-black">연동</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Credential이 없는 항목은 정직하게 "연결 필요"로 표시돼요 — 연결된 척하지 않습니다.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <IntegrationRow
          name="Claude (Anthropic API)"
          connected={llmMode === "live"}
          detail={llmMode === "live" ? "실제 Claude로 에이전트가 동작해요." : "Demo Mode — .env에 ANTHROPIC_API_KEY를 추가하세요."}
        />
        <IntegrationRow
          name="Gmail"
          connected={byProvider.gmail?.status === "connected"}
          detail={
            byProvider.gmail?.status === "connected"
              ? `${byProvider.gmail.accountEmail ?? "연결됨"} · ${formatDate(byProvider.gmail.connectedAt)}`
              : oauthConfigured
                ? "연결 필요"
                : "GOOGLE_CLIENT_ID/SECRET 미설정"
          }
          action={oauthConfigured && byProvider.gmail?.status !== "connected" ? "/api/integrations/google/start" : undefined}
        />
        <IntegrationRow
          name="Google Drive"
          connected={byProvider.google_drive?.status === "connected"}
          detail={
            byProvider.google_drive?.status === "connected"
              ? `${byProvider.google_drive.accountEmail ?? "연결됨"} · ${formatDate(byProvider.google_drive.connectedAt)}`
              : oauthConfigured
                ? "연결 필요 (Gmail과 같은 버튼으로 함께 연결돼요)"
                : "GOOGLE_CLIENT_ID/SECRET 미설정"
          }
          action={oauthConfigured && byProvider.google_drive?.status !== "connected" ? "/api/integrations/google/start" : undefined}
        />
        <IntegrationRow
          name="웹 검색 (시장조사 담당자)"
          connected={searchMode === "live"}
          detail={searchMode === "live" ? "실제 검색 Provider 연결됨" : "Mock — SEARCH_API_KEY 미설정, 결과는 예시입니다"}
        />
        <IntegrationRow name="내부 Storage" connected detail="항상 사용 가능 (Credential 불필요)" />
      </div>
    </div>
  );
}

function IntegrationRow({
  name,
  connected,
  detail,
  action,
}: {
  name: string;
  connected: boolean;
  detail: string;
  action?: string;
}) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-ink-muted">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${connected ? "bg-ok-bg text-ok" : "bg-surface2 text-ink-muted border border-line"}`}>
          {connected ? "연결됨" : "연결 필요"}
        </span>
        {action && (
          <a href={action} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
            연결하기
          </a>
        )}
      </div>
    </div>
  );
}
