import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "AI Staff Operating System",
  description: "1명의 사용자가 AI 전문인력에게 업무를 배정하고 승인하는 지휘본부",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-body">
        <div className="flex">
          <Sidebar />
          <main className="min-h-screen flex-1 overflow-y-auto p-8">
            {!process.env.AUTH_ENABLED && <NoAuthBanner />}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

/**
 * There is no per-user login yet (see docs/ARCHITECTURE.md's auth gap).
 * Until that ships, anyone who can reach this deployment's URL sees and can
 * change everything in it — real Gmail/Drive connections and real
 * confidential documents don't belong here yet. This banner is the loud,
 * hard-to-miss version of that warning; docs/DEPLOYMENT.md has the quiet
 * one. Set AUTH_ENABLED=1 once real auth is wired up to remove it.
 */
function NoAuthBanner() {
  return (
    <div className="mb-6 rounded-xl border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
      <strong>로그인 기능 없음.</strong> 이 주소를 아는 사람은 누구나 전체 내용을 보고 바꿀 수 있어요. 아직
      실제 회사 Gmail/Drive를 연결하거나 진짜 기밀 문서를 올리지 마세요 — 자세한 내용은{" "}
      <code className="rounded bg-surface px-1">docs/ARCHITECTURE.md</code>.
    </div>
  );
}
