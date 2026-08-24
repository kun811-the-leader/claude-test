import Link from "next/link";

export default function ConnectWarningPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-danger">주의</div>
      <h1 className="font-display text-2xl font-black">아직 로그인 기능이 없어요</h1>

      <div className="card mt-6 border-danger">
        <p className="text-sm">
          이 앱은 아직 <strong>사용자별 로그인이 없습니다</strong>. 지금 Gmail/Drive를 연결하면, 이 앱 주소를
          아는 사람은 <strong>누구나</strong> 그 계정의 메일과 파일에 접근할 수 있게 됩니다 — 로그인 화면이
          없어서 막을 방법이 없어요.
        </p>
        <p className="mt-3 text-sm">권장 사항:</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
          <li>실제 회사 Gmail/Drive 대신, 테스트용 계정으로 먼저 연결해보세요.</li>
          <li>배포 주소를 아무에게나 공유하지 마세요 (Vercel Deployment Protection 사용을 권장합니다 —
            <code className="mx-1 rounded bg-surface2 px-1 py-0.5">docs/DEPLOYMENT.md</code> 참고).</li>
          <li>진짜 회사 계정을 연결하려면 먼저 로그인 기능을 추가하는 걸 권장합니다.</li>
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href="/integrations" className="rounded-lg border border-line px-4 py-2 text-sm">
          취소하고 돌아가기
        </Link>
        <a
          href="/api/integrations/google/start?confirmed=1"
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white"
        >
          이해했어요, 그래도 연결할게요
        </a>
      </div>
    </div>
  );
}
