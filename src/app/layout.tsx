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
          <main className="min-h-screen flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
