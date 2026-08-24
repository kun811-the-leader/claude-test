# 배포하기 (누구나 따라할 수 있는 버전)

목표: 브라우저 주소창에 링크를 치면 바로 열리는, 진짜 서버로 돌아가는 주소를 만드는 것. 코드를 만질 필요는
없고, 계정 두 개 만들고 클릭 몇 번 + 값 복사-붙여넣기만 하면 됩니다.

## 1단계 — 무료 데이터베이스 만들기 (Neon)

1. https://neon.tech 접속 → "Sign up" → GitHub 계정으로 로그인 (이 저장소 계정과 같은 걸로)
2. 프로젝트 이름 아무거나 입력하고 생성 (무료 플랜으로 충분)
3. 생성되면 "Connection string" 이라고 써있는 걸 찾아서 **전체 복사** (`postgresql://...`로 시작하는 긴 문자열)
   — 이게 비밀번호나 마찬가지니 저장해두고, 공개된 곳(카톡 단톡방 등)에 붙여넣지 마세요.

## 2단계 — Vercel에 배포하기

1. https://vercel.com 접속 → "Sign up" → 역시 GitHub 계정으로 로그인
2. "Add New..." → "Project" 클릭
3. 저장소 목록에서 `claude-test` 찾아서 "Import"
4. **Branch를 `claude/custom-work-assistants-ply5kc`로 바꿔주세요** (기본은 main인데, 새 앱은 이
   브랜치에 있어요) — Import 화면에서 "Configure" 근처에 브랜치 선택하는 곳이 있어요. 안 보이면 일단
   Import 하고 나서 프로젝트 Settings → Git → Production Branch에서 바꿔도 됩니다.
5. "Environment Variables" 섹션 펼치고 아래 두 개를 추가:
   - `DATABASE_URL` = 1단계에서 복사한 Neon 연결 문자열
   - `ANTHROPIC_API_KEY` = (있으면) 실제 Claude로 동작. 없으면 비워둬도 되고, Demo Mode로 동작해요.
6. "Deploy" 클릭. 2~3분 기다리면 `https://claude-test-....vercel.app` 같은 주소가 생겨요.

## 3단계 — 데이터베이스에 초기 데이터 넣기

배포는 됐는데 아직 데이터베이스가 비어있어요 (Agent 7명이 없는 상태). 이건 딱 한 번만 하면 됩니다.

**가장 쉬운 방법: 저한테 Neon 연결 문자열을 알려주세요** (이 대화창에 붙여넣으시면 돼요 — 이 대화는 비공개
공간이니 괜찮아요). 그러면 제가 여기서 바로 `npm run db:push`랑 `npm run db:seed`를 실행해서 채워드릴게요.

## 4단계 — 확인

배포된 주소를 열어서 지휘본부 화면이 뜨고, 왼쪽에 7명 담당자 이름이 보이면 성공이에요.

## 이후에 코드가 바뀌면?

제가 이 브랜치에 새 커밋을 푸시할 때마다 Vercel이 자동으로 다시 배포해줘요 (따로 뭘 안 하셔도 됩니다).
