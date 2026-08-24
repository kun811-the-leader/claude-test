# 업무 지휘본부 (보고 보드)

`app-script.js`가 보드의 전체 소스입니다. 브라우저와 Node 양쪽에서 동작하는 하나의 파일로, 두 가지 역할을 합니다.

- **브라우저에서 실행될 때**: 화면을 그리고(`업무 배정 / 진행 / 보고 / 승인` 흐름, 타임라인, 완료 테이블), 사용자가 뭔가를 바꿀 때마다 Claude Artifact의 `artifact` 런타임 기능(`claude.use('artifact')`)을 통해 페이지 전체를 새 버전으로 다시 게시합니다. 이게 "자동 반영"이 동작하는 원리입니다 — 상태가 브라우저 로컬이 아니라 아티팩트 자체에 저장돼요.
- **Node에서 `require`될 때**: 같은 렌더링 함수(`shellHtml`, `appHtml`)를 그대로 재사용해서, 초기 페이지를 만들거나(빌드) 상태를 프로그램적으로 갱신할 때 씁니다.

## 초기 페이지 빌드

```bash
node build.js            # state.json을 읽어서 ../report-board.html 생성
node build.js out.html   # 출력 경로 지정
```

## 상태(state) 구조

```json
{
  "tasks": [
    {
      "id": "t-...",
      "roleId": "market-researcher",
      "title": "업무 제목",
      "brief": "상세 지시사항",
      "deadline": "2026-08-30 또는 null (recurring이면 항상 null)",
      "dependsOn": "다른-업무-id 또는 null",
      "recurring": false,
      "createdAt": 1234567890000,
      "status": "assigned | in_progress | reported | scheduled | accepted | cancelled",
      "acceptedAt": null,
      "tags": ["한번짜리 업무가 승인될 때 붙는 태그"],
      "runs": [{ "text": "...", "tags": ["..."], "reportedAt": 0, "acceptedAt": 0 }],
      "thread": [{ "type": "assign|start|report|feedback|accept|cancel", "text": "...", "ts": 1234567890000, "tags": ["accept에만"] }]
    }
  ]
}
```

반복 업무(`recurring: true`)는 승인해도 `accepted`로 끝나지 않고 `scheduled`(다음 실행 대기)로 돌아가며,
그 회차의 보고·태그는 `runs[]`에 쌓입니다. 완료 테이블에는 반복 업무의 매 회차가 한 줄씩 표시됩니다.

## 채팅으로 업무를 배정하는 흐름 (agent.js)

담당자 스킬들은 `.claude/skills/_shared/board-protocol.md`에 정의된 절차에 따라 이 CLI로 상태를
갱신합니다. 사람이 직접 쓸 때도 형식은 같습니다.

```bash
# 저장소 루트에서 실행. <in.html>은 Artifact 도구의 action:"read"로 받은 최신 보드 HTML.
node board/agent.js assign '{"roleId":"market-researcher","title":"...","brief":"...","deadline":"2026-09-05","recurring":false,"dependsOn":null}' <in.html> <out.html>
node board/agent.js start  '{"taskId":"t-..."}' <in.html> <out.html>
node board/agent.js report '{"taskId":"t-...","text":"..."}' <in.html> <out.html>
node board/agent.js accept '{"taskId":"t-...","tags":["태그1","태그2"]}' <in.html> <out.html>
node board/agent.js revise '{"taskId":"t-...","text":"피드백"}' <in.html> <out.html>
node board/agent.js cancel '{"taskId":"t-..."}' <in.html> <out.html>
node board/agent.js show '{}' <in.html>   # 현재 업무 목록을 stderr에 출력, HTML은 안 바꿈
```

각 명령은 `<out.html>`을 쓰고, 새로 생기거나 건드린 taskId를 stdout으로 출력합니다. `<out.html>`을 그대로
Artifact 도구로 같은 URL에 다시 게시하면 반영됩니다. 여러 단계를 이어붙일 땐 `<out.html>`을 다음 명령의
`<in.html>`로 재사용하면 됩니다 (같은 경로를 in/out으로 같이 써도 됨).

## 로직을 수정하고 싶을 때

1. `app-script.js`를 수정합니다 (렌더링과 `mutations.*` 둘 다 여기 있습니다 — 브라우저와 `agent.js`가
   같은 함수를 공유하므로 한 곳만 고치면 됩니다).
2. 현재 게시된 아티팩트의 최신 상태를 가져와 `state.json`에 반영합니다 (그래야 배정된 업무가 날아가지 않아요).
3. `node build.js`로 다시 빌드하고, Artifact 도구로 같은 URL에 다시 게시합니다 (`capabilities: {"artifact": {}}` 유지).
