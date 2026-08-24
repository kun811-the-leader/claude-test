# 배포하기

## 시작 전에 꼭 읽어주세요

**이 앱은 아직 로그인 기능이 없습니다.** 배포된 주소를 아는 사람은 누구나 전체 내용을 보고 바꿀 수 있어요.
그래서:
- **실제 회사 Gmail/Drive를 연결하지 마세요.** 연결하려고 하면 앱이 경고 화면을 한 번 보여줘요 — 그건
  실수 방지용이지 안전장치가 아닙니다. 실제 연결은 로그인 기능이 생긴 뒤에 하세요.
- **진짜 기밀 문서를 Knowledge에 올리지 마세요.**
- 아래 "2단계"에서 다루는 **Vercel Deployment Protection을 꼭 켜세요** — 최소한의 안전장치입니다.

## 1단계 — 무료 데이터베이스 만들기 (Neon)

1. https://neon.tech 접속 → "Sign up" → GitHub 계정으로 로그인
2. 프로젝트 생성 (무료 플랜으로 충분)
3. 프로젝트 대시보드에서 연결 문자열을 **두 개** 찾으세요 (둘 다 필요해요):
   - **Pooled connection** (호스트 이름에 `-pooler`가 들어감) → 이게 `DATABASE_URL`
   - **Direct connection** (`-pooler` 없음) → 이게 `DIRECT_URL`

   둘 다 필요한 이유: 서버리스(Vercel) 환경에서는 앱이 매 요청마다 새 연결을 열 수 있어서, 연결을
   모아주는 Pooled 연결이 없으면 데이터베이스가 감당을 못 해요. 반대로 스키마를 바꾸는 작업(마이그레이션)은
   Pooled 연결로는 안 되고 Direct 연결이 필요해요. (`docs/DATABASE.md` "Connection pooling" 참고)

4. 두 문자열 다 어딘가에 잠깐 저장해두세요 (2단계에서 붙여넣을 거예요). **이건 비밀번호나 마찬가지예요 —
   카톡/이메일 등 다른 곳에 공유하지 마세요.**

## 2단계 — Vercel에 배포하기

1. https://vercel.com 접속 → "Sign up" → GitHub 계정으로 로그인
2. "Add New..." → "Project" → 저장소 목록에서 `claude-test` 찾아서 "Import"
3. 브랜치를 `claude/custom-work-assistants-ply5kc`로 선택 (Import 화면 또는 나중에 Settings → Git →
   Production Branch에서)
4. "Environment Variables" 섹션에 아래를 추가:

   | 이름 | 값 | 필수 |
   |---|---|---|
   | `DATABASE_URL` | Neon의 Pooled connection 문자열 | 필수 |
   | `DIRECT_URL` | Neon의 Direct connection 문자열 | 필수 |
   | `TOKEN_ENCRYPTION_KEY` | 터미널에서 `openssl rand -base64 32` 실행한 결과값 | Gmail/Drive 연결할 거면 필수 |
   | `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 발급 | 없으면 Demo Mode |
   | `SCHEDULER_SECRET` | 아무 긴 임의 문자열 (예: `openssl rand -hex 24`) | 반복 업무 쓸 거면 필수 |

5. "Deploy" 클릭. 빌드 과정에서 **데이터베이스 마이그레이션이 자동으로 적용돼요** (`npm run build`에
   `prisma migrate deploy`가 포함되어 있어서, 여기서 사람이 따로 명령어를 칠 필요가 없어요). 2~3분 기다리면
   `https://....vercel.app` 주소가 생겨요.

## 3단계 — Deployment Protection 켜기 (꼭 하세요)

로그인 기능이 없는 상태라, Vercel이 기본 제공하는 보호 기능을 대신 켜두는 게 중요해요.

1. Vercel 프로젝트 → Settings → **Deployment Protection**
2. "Vercel Authentication"을 **Production과 Preview 둘 다** 켜세요 (무료 플랜에서도 됩니다). 이러면
   Vercel에 로그인한 사람(=여러분과 초대한 사람)만 열 수 있어요.
3. 나중에 다른 사람에게 링크를 공유해야 하면, 그 사람을 Vercel 프로젝트에 초대하거나(Settings → Members),
   Pro 플랜의 "Password Protection"을 대신 쓰세요.

## 4단계 — 데이터베이스 초기 데이터 넣기 (딱 한 번)

마이그레이션은 자동으로 됐지만, 7명의 Agent를 채우는 건 별도 명령이에요 (일부러 배포마다 자동 실행되게
안 해뒀어요 — 데이터를 다루는 작업은 사람이 명시적으로 할 때만 하는 게 안전해서요).

**저한테 부탁하는 방법(추천)**: 1단계에서 복사한 Neon의 **Direct connection** 문자열을 이 대화창에
붙여넣어 주세요. 이 대화는 비공개 공간이라 괜찮아요. 그러면 제가 여기서
```
DATABASE_URL="..." DIRECT_URL="..." npm run db:bootstrap
```
을 실행해서 채워드릴게요. 이 명령은 **몇 번을 실행해도 안전해요** (이미 있는 건 건드리지 않고, 없는 것만
채워요) — 나중에 또 필요하면 언제든 다시 요청하셔도 됩니다.

## 5단계 — 확인

배포된 주소를 열어서 (Vercel Authentication 로그인 뜨면 로그인) 지휘본부 화면에 7명 담당자 이름이 보이면
성공이에요.

## 이후에 코드가 바뀌면?

제가 이 브랜치에 새 커밋을 푸시할 때마다 Vercel이 자동으로 다시 빌드·배포해요 — 그때마다 마이그레이션도
자동으로 같이 적용됩니다. 사람이 할 일은 없어요.

---

## Production 배포 체크리스트

배포 전에 하나씩 확인하세요.

- [ ] Neon에서 **Pooled**와 **Direct** 연결 문자열을 둘 다 받았다 (`DATABASE_URL`, `DIRECT_URL`)
- [ ] Vercel 환경변수에 위 표의 값을 다 넣었다 (특히 Gmail/Drive 쓸 거면 `TOKEN_ENCRYPTION_KEY` 빠뜨리지
      않기 — 없으면 연결 시도 자체가 에러로 막힙니다)
- [ ] `.env` 파일은 어디에도 커밋되지 않았다 (`.gitignore`에 있음 — `git status`로 한번 확인)
- [ ] Vercel **Deployment Protection**을 Production/Preview 둘 다 켰다
- [ ] 첫 배포 후 `npm run db:bootstrap`으로 (또는 저한테 부탁해서) 7명 Agent를 채웠다
- [ ] 배포된 주소를 열어서 지휘본부에 담당자 7명이 보이는지 확인했다
- [ ] **아직 로그인 기능이 없다는 걸 인지했고**, 실제 회사 Gmail/Drive나 진짜 기밀 문서는 연결/업로드
      **하지 않기로** 했다 (로그인 기능 추가 후로 미룸)
- [ ] `ANTHROPIC_API_KEY`를 넣었다면, 실제 Claude 응답이 나오는지 업무 하나 배정해서 확인했다
- [ ] 반복 업무를 쓸 거면, 외부 Cron(예: Vercel Cron, GitHub Actions)을 `POST /api/scheduler/tick`에
      `Authorization: Bearer $SCHEDULER_SECRET`으로 걸어뒀다 (`docs/ARCHITECTURE.md` 참고)
