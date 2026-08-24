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
      "deadline": "2026-08-30",
      "dependsOn": "다른-업무-id 또는 null",
      "createdAt": 1234567890000,
      "status": "assigned | in_progress | reported | accepted | cancelled",
      "acceptedAt": null,
      "thread": [{ "type": "assign|start|report|feedback|accept|cancel", "text": "...", "ts": 1234567890000 }]
    }
  ]
}
```

## 로직을 수정하고 싶을 때

1. `app-script.js`를 수정합니다.
2. 현재 게시된 아티팩트의 최신 상태를 가져와 `state.json`에 반영합니다 (그래야 배정된 업무가 날아가지 않아요).
3. `node build.js`로 다시 빌드하고, Artifact 도구로 같은 URL에 다시 게시합니다 (`capabilities: {"artifact": {}}` 유지).
