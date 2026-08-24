(function (root) {
  'use strict';

  /* ================= static data ================= */

  var ROLES = [
    { id: 'market-researcher', name: '시장조사 담당자', desc: '시장·경쟁사·트렌드 리서치, 잠재고객군 발굴', scope: '조회 전용' },
    { id: 'sales-assistant', name: '영업담당자', desc: '어프로치 포인트·제안서·아웃리치 시퀀스 작성', scope: '초안만·발송 금지' },
    { id: 'marketing-assistant', name: '마케팅 담당자', desc: '콘텐츠 캘린더·캠페인 기획·SNS/광고 카피', scope: '초안만' },
    { id: 'mail-checker', name: '메일 확인 담당자', desc: 'Gmail 확인·요약·라벨 정리', scope: '정리 자동·발송은 일괄승인' },
    { id: 'file-organizer', name: '파일 정리 담당자', desc: 'Drive 파일 분류·이동·이름 정리', scope: '정리 자동·삭제 승인' },
    { id: 'insight-sparring-partner', name: '인사이트 토론자', desc: '저장된 자료 근거로 비판적 토론', scope: '대화형' }
  ];

  var ROLE_BY_ID = {};
  ROLES.forEach(function (r) { ROLE_BY_ID[r.id] = r; });

  var STATUS_META = {
    assigned: { label: '배정됨', cls: 'st-assigned' },
    in_progress: { label: '진행중', cls: 'st-progress' },
    reported: { label: '검토 대기', cls: 'st-reported' },
    accepted: { label: '완료', cls: 'st-accepted' },
    cancelled: { label: '취소됨', cls: 'st-cancelled' }
  };

  var THREAD_LABEL = {
    assign: '업무 배정',
    start: '작업 시작',
    report: '보고',
    feedback: '피드백',
    accept: '승인',
    cancel: '취소'
  };

  /* ================= head / style ================= */

  var HEAD_EXTRA =
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@700;900&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">';

  var STYLE_CSS = `
    :root {
      --paper: #EEF0F4;
      --surface: #FFFFFF;
      --surface-2: #F6F7FA;
      --ink: #1A2130;
      --ink-muted: #5B6472;
      --line: #DADFE7;
      --accent: #3454D1;
      --accent-bg: #E7ECFB;
      --accent-ink: #FFFFFF;
      --ok: #1E8E5A;
      --ok-bg: #E3F5EC;
      --warn: #A9660C;
      --warn-bg: #FBF0DD;
      --danger: #B23A2E;
      --danger-bg: #FBE7E3;
      --chip-bg: #E7E9EF;
      --chip-ink: #444C5A;
      --shadow: 0 1px 2px rgba(20,24,34,.06), 0 8px 24px -12px rgba(20,24,34,.18);
      --font-display: 'Gothic A1', 'IBM Plex Sans KR', 'Noto Sans KR', sans-serif;
      --font-body: 'IBM Plex Sans KR', 'Noto Sans KR', sans-serif;
      --font-mono: 'IBM Plex Mono', 'IBM Plex Sans KR', monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --paper: #10131A; --surface: #171B24; --surface-2: #1E232E;
        --ink: #E7E9EE; --ink-muted: #9AA3B2; --line: #2A3040;
        --accent: #7C93FF; --accent-bg: rgba(124,147,255,.16); --accent-ink: #10131A;
        --ok: #45C285; --ok-bg: rgba(69,194,133,.14);
        --warn: #E3A83D; --warn-bg: rgba(227,168,61,.14);
        --danger: #E2695C; --danger-bg: rgba(226,105,92,.14);
        --chip-bg: #232937; --chip-ink: #C3C9D6;
        --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.5);
      }
    }
    :root[data-theme="dark"] {
      --paper: #10131A; --surface: #171B24; --surface-2: #1E232E;
      --ink: #E7E9EE; --ink-muted: #9AA3B2; --line: #2A3040;
      --accent: #7C93FF; --accent-bg: rgba(124,147,255,.16); --accent-ink: #10131A;
      --ok: #45C285; --ok-bg: rgba(69,194,133,.14);
      --warn: #E3A83D; --warn-bg: rgba(227,168,61,.14);
      --danger: #E2695C; --danger-bg: rgba(226,105,92,.14);
      --chip-bg: #232937; --chip-ink: #C3C9D6;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.5);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { background: var(--paper); color: var(--ink); font-family: var(--font-body); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 36px 22px 80px; }
    a { color: var(--accent); }
    .eyebrow { font-family: var(--font-mono); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-muted); }
    h1 { font-family: var(--font-display); font-weight: 900; font-size: clamp(26px,4vw,38px); letter-spacing: -.02em; text-wrap: balance; margin: 2px 0 0; }
    .sub { color: var(--ink-muted); font-size: 14.5px; max-width: 68ch; margin-top: 4px; }
    .sub strong { color: var(--ink); font-weight: 600; }

    .banner { border-radius: 10px; padding: 10px 14px; font-size: 13px; margin: 16px 0; display: flex; gap: 8px; align-items: center; }
    .banner.warn { background: var(--warn-bg); color: var(--warn); }
    .banner.danger { background: var(--danger-bg); color: var(--danger); }
    .banner.info { background: var(--accent-bg); color: var(--accent); }

    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; margin: 22px 0 30px; box-shadow: var(--shadow); }
    .stat { background: var(--surface); padding: 15px 16px; display: flex; flex-direction: column; gap: 4px; }
    .stat .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 24px; line-height: 1; }
    .stat .label { font-size: 12px; color: var(--ink-muted); }
    .stat.tone-warn .num { color: var(--warn); }
    .stat.tone-accent .num { color: var(--accent); }
    .stat.tone-ok .num { color: var(--ok); }

    /* section headers */
    .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 40px 0 12px; }
    .section-head h2 { font-family: var(--font-display); font-weight: 700; font-size: 19px; margin: 0; letter-spacing: -.01em; }
    .section-head .hint { font-size: 12.5px; color: var(--ink-muted); }
    label.toggle { font-size: 12px; color: var(--ink-muted); display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }

    /* timeline */
    .timeline { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); box-shadow: var(--shadow); overflow: hidden; }
    .timeline-empty { padding: 28px; text-align: center; color: var(--ink-muted); font-size: 13.5px; }
    .timeline-scroll { overflow-x: auto; }
    .timeline-grid { position: relative; }
    .tl-row { display: flex; border-top: 1px solid var(--line); }
    .tl-row:first-child { border-top: none; }
    .tl-axis { display: flex; position: sticky; top: 0; background: var(--surface-2); z-index: 2; border-bottom: 1px solid var(--line); }
    .tl-lane-label { position: sticky; left: 0; z-index: 3; width: 152px; flex: none; padding: 8px 12px; font-size: 12.5px; font-weight: 600; background: var(--surface); border-right: 1px solid var(--line); display: flex; align-items: center; }
    .tl-axis .tl-lane-label { background: var(--surface-2); font-weight: 700; }
    .tl-day { flex: none; font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-muted); text-align: center; padding: 8px 0; border-right: 1px dashed var(--line); }
    .tl-day.today { color: var(--accent); font-weight: 700; }
    .tl-lane-body { position: relative; flex: none; }
    .tl-track { position: relative; }
    .tl-bar { position: absolute; border-radius: 8px; padding: 4px 8px; font-size: 11.5px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 1px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    .tl-bar.st-assigned { background: var(--chip-bg); color: var(--chip-ink); }
    .tl-bar.st-progress { background: var(--accent-bg); color: var(--accent); border-color: var(--accent); }
    .tl-bar.st-reported { background: var(--warn-bg); color: var(--warn); border-color: var(--warn); }
    .tl-bar.st-accepted { background: var(--ok-bg); color: var(--ok); }
    .tl-legend { display: flex; gap: 14px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid var(--line); font-size: 11.5px; color: var(--ink-muted); }
    .tl-legend span { display: inline-flex; align-items: center; gap: 5px; }
    .tl-legend i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

    /* role sections */
    .role-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .role-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px; }
    .role-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .role-name { font-family: var(--font-display); font-weight: 700; font-size: 18px; }
    .role-desc { color: var(--ink-muted); font-size: 13px; margin-top: 2px; }
    .scope-chip { flex: none; font-family: var(--font-mono); font-size: 10.5px; color: var(--chip-ink); background: var(--chip-bg); border-radius: 999px; padding: 4px 9px; white-space: nowrap; }

    button { font-family: var(--font-body); cursor: pointer; border-radius: 8px; border: 1px solid transparent; }
    .btn-primary { background: var(--accent); color: var(--accent-ink); font-weight: 600; font-size: 13px; padding: 8px 13px; border: none; }
    .btn-primary:disabled { opacity: .55; cursor: default; }
    .btn-ghost { background: transparent; border: 1px solid var(--line); color: var(--ink-muted); font-size: 12.5px; padding: 7px 11px; }
    .btn-ghost:hover { color: var(--ink); border-color: var(--ink-muted); }
    .btn-danger { background: transparent; border: 1px solid var(--danger); color: var(--danger); font-size: 12px; padding: 6px 10px; }
    .btn-text { background: none; border: none; color: var(--ink-muted); font-size: 12px; text-decoration: underline; padding: 2px; }

    input, textarea, select {
      font-family: var(--font-body); font-size: 13.5px; color: var(--ink); background: var(--surface);
      border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; width: 100%;
    }
    textarea { resize: vertical; min-height: 70px; }
    input:focus, textarea:focus, select:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field .lbl { font-size: 11.5px; color: var(--ink-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .assign-form { display: none; flex-direction: column; gap: 10px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
    .assign-form.open { display: flex; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }

    .task-list { display: flex; flex-direction: column; gap: 8px; }
    .task-item { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    .task-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; background: var(--surface); }
    .task-title { font-weight: 600; font-size: 13.5px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { font-family: var(--font-mono); font-size: 10.5px; padding: 3px 8px; border-radius: 999px; flex: none; }
    .tag.st-assigned { background: var(--chip-bg); color: var(--chip-ink); }
    .tag.st-progress { background: var(--accent-bg); color: var(--accent); }
    .tag.st-reported { background: var(--warn-bg); color: var(--warn); }
    .tag.st-accepted { background: var(--ok-bg); color: var(--ok); }
    .tag.st-cancelled { background: var(--chip-bg); color: var(--ink-muted); }
    .deadline { font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted); flex: none; }
    .deadline.overdue { color: var(--danger); font-weight: 600; }
    .dep-badge { font-size: 11px; color: var(--ink-muted); flex: none; }

    .task-body { display: none; padding: 12px; border-top: 1px solid var(--line); background: var(--surface-2); flex-direction: column; gap: 10px; }
    .task-body.open { display: flex; }
    .task-brief { font-size: 13px; white-space: pre-wrap; }
    .thread { display: flex; flex-direction: column; gap: 8px; }
    .thread-item { font-size: 12.5px; border-left: 2px solid var(--line); padding-left: 8px; }
    .thread-item .th-meta { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-muted); }
    .thread-item.report { border-left-color: var(--warn); }
    .thread-item.feedback { border-left-color: var(--danger); }
    .thread-item.accept { border-left-color: var(--ok); }
    .task-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .inline-form { display: flex; flex-direction: column; gap: 8px; }

    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
    th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-muted); font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    td.num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .table-empty { padding: 24px; text-align: center; color: var(--ink-muted); font-size: 13px; }
    .filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .chip-filter { font-size: 12px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-muted); }
    .chip-filter.active { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

    footer.note { margin-top: 34px; font-size: 12.5px; color: var(--ink-muted); text-align: center; }
  `;

  /* ================= pure helpers ================= */

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function dateOnly(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDateStr(s) { return new Date(s + 'T00:00:00'); }

  function addDaysStr(dateStr, n) {
    var d = parseDateStr(dateStr);
    d.setDate(d.getDate() + n);
    return dateOnly(d.getTime());
  }

  function dayDiff(aStr, bStr) {
    return Math.round((parseDateStr(bStr).getTime() - parseDateStr(aStr).getTime()) / 86400000);
  }

  function fmtDayLabel(dateStr) {
    var d = parseDateStr(dateStr);
    var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return (d.getMonth() + 1) + '/' + d.getDate() + ' (' + wd + ')';
  }

  function fmtDeadline(dateStr) {
    if (!dateStr) return '기한 없음';
    var d = parseDateStr(dateStr);
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
  }

  function formatRelative(ts) {
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return '방금 전';
    if (min < 60) return min + '분 전';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + '시간 전';
    var day = Math.floor(hr / 24);
    if (day === 1) return '어제';
    if (day < 7) return day + '일 전';
    return fmtDeadline(dateOnly(ts));
  }

  function isOverdue(task) {
    if (!task.deadline || task.status === 'accepted' || task.status === 'cancelled') return false;
    return task.deadline < dateOnly(Date.now());
  }

  function openTasksForRole(state, roleId) {
    return state.tasks.filter(function (t) {
      return t.roleId === roleId && t.status !== 'accepted' && t.status !== 'cancelled';
    }).sort(function (a, b) {
      var ad = a.deadline || '9999-99-99', bd = b.deadline || '9999-99-99';
      return ad < bd ? -1 : ad > bd ? 1 : a.createdAt - b.createdAt;
    });
  }

  function cancelledTasksForRole(state, roleId) {
    return state.tasks.filter(function (t) { return t.roleId === roleId && t.status === 'cancelled'; });
  }

  function taskById(state, id) {
    for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i];
    return null;
  }

  /* ================= render: pure string builders ================= */

  function statsHtml(state) {
    var open = state.tasks.filter(function (t) { return t.status !== 'accepted' && t.status !== 'cancelled'; });
    var review = open.filter(function (t) { return t.status === 'reported'; }).length;
    var todayStr = dateOnly(Date.now());
    var weekEnd = addDaysStr(todayStr, 7);
    var dueSoon = open.filter(function (t) { return t.deadline && t.deadline >= todayStr && t.deadline <= weekEnd; }).length;
    var done = state.tasks.filter(function (t) { return t.status === 'accepted'; }).length;
    return (
      '<div class="stats">' +
        '<div class="stat"><span class="num">' + open.length + '</span><span class="label">진행 중 업무</span></div>' +
        '<div class="stat tone-warn"><span class="num">' + review + '</span><span class="label">검토 대기</span></div>' +
        '<div class="stat tone-accent"><span class="num">' + dueSoon + '</span><span class="label">7일 내 마감</span></div>' +
        '<div class="stat tone-ok"><span class="num">' + done + '</span><span class="label">완료 누적</span></div>' +
      '</div>'
    );
  }

  function bannerHtml(ui) {
    var out = '';
    if (ui.offline) out += '<div class="banner warn">이 화면은 지금 공유 저장소에 연결되지 못했어요. 변경 사항이 다른 곳에는 반영되지 않아요 (새로고침 후 다시 시도해보세요).</div>';
    if (ui.readOnly) out += '<div class="banner info">읽기 전용 화면이에요. 이 화면에서는 업무를 배정하거나 승인할 수 없어요.</div>';
    if (ui.error) out += '<div class="banner danger">' + escapeHtml(ui.error) + '</div>';
    return out;
  }

  function timelineHtml(state, ui) {
    var tasks = state.tasks.filter(function (t) {
      if (t.status === 'cancelled') return false;
      if (t.status === 'accepted' && !ui.showCompletedInTimeline) return false;
      return true;
    });

    var head =
      '<div class="section-head">' +
        '<h2>워크플로우 타임라인</h2>' +
        '<label class="toggle"><input type="checkbox" data-act="toggle-timeline-completed" ' + (ui.showCompletedInTimeline ? 'checked' : '') + '> 완료된 업무도 표시</label>' +
      '</div>';

    if (!tasks.length) {
      return head + '<div class="timeline"><div class="timeline-empty">아직 배정된 업무가 없어요. 아래에서 담당자에게 업무를 배정하면 여기에 흐름이 표시돼요.</div></div>';
    }

    var todayStr = dateOnly(Date.now());
    var rangeStart = todayStr, rangeEnd = addDaysStr(todayStr, 13);
    tasks.forEach(function (t) {
      var s = dateOnly(t.createdAt);
      var e = t.deadline || s;
      if (s < rangeStart) rangeStart = s;
      if (e > rangeEnd) rangeEnd = e;
    });
    var totalDays = dayDiff(rangeStart, rangeEnd) + 1;
    var DAY_W = 58, TRACK_H = 30, TRACK_GAP = 6, LANE_PAD = 8;

    var axisDays = '';
    for (var i = 0; i < totalDays; i++) {
      var ds = addDaysStr(rangeStart, i);
      axisDays += '<div class="tl-day' + (ds === todayStr ? ' today' : '') + '" style="width:' + DAY_W + 'px">' + fmtDayLabel(ds) + '</div>';
    }
    var axisRow = '<div class="tl-row tl-axis"><div class="tl-lane-label">담당자</div>' + axisDays + '</div>';

    var laneRows = ROLES.map(function (role) {
      var roleTasks = tasks.filter(function (t) { return t.roleId === role.id; })
        .sort(function (a, b) { return dateOnly(a.createdAt) < dateOnly(b.createdAt) ? -1 : 1; });

      var tracks = [];
      roleTasks.forEach(function (t) {
        var s = dateOnly(t.createdAt), e = t.deadline || s;
        var placed = false;
        for (var ti = 0; ti < tracks.length; ti++) {
          var last = tracks[ti][tracks[ti].length - 1];
          var lastEnd = last.deadline || dateOnly(last.createdAt);
          if (dayDiff(lastEnd, s) > 0) { tracks[ti].push(t); placed = true; break; }
        }
        if (!placed) tracks.push([t]);
      });
      if (!tracks.length) tracks = [[]];

      var laneHeight = tracks.length * (TRACK_H + TRACK_GAP) + LANE_PAD;
      var bars = '';
      tracks.forEach(function (track, ti) {
        track.forEach(function (t) {
          var s = dateOnly(t.createdAt), e = t.deadline || s;
          var left = Math.max(0, dayDiff(rangeStart, s)) * DAY_W + 3;
          var span = Math.max(1, dayDiff(s, e) + 1) * DAY_W - 6;
          var meta = STATUS_META[t.status] || STATUS_META.assigned;
          var dep = t.dependsOn ? ' ⛓' : '';
          bars +=
            '<div class="tl-bar ' + meta.cls + '" data-bar="' + t.id + '" ' +
              'style="left:' + left + 'px;width:' + span + 'px;top:' + (ti * (TRACK_H + TRACK_GAP) + LANE_PAD / 2) + 'px;height:' + TRACK_H + 'px" ' +
              'title="' + escapeHtml(t.title) + ' · ' + meta.label + '">' +
              escapeHtml(t.title) + dep +
            '</div>';
        });
      });

      return (
        '<div class="tl-row">' +
          '<div class="tl-lane-label">' + escapeHtml(role.name) + '</div>' +
          '<div class="tl-lane-body" style="width:' + (totalDays * DAY_W) + 'px;height:' + laneHeight + 'px">' + bars + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      head +
      '<div class="timeline"><div class="timeline-scroll"><div class="timeline-grid" id="timeline-grid">' +
        '<svg id="timeline-svg" style="position:absolute;left:0;top:0;pointer-events:none"></svg>' +
        axisRow + laneRows +
      '</div></div>' +
      '<div class="tl-legend">' +
        '<span><i style="background:var(--chip-bg)"></i>배정됨</span>' +
        '<span><i style="background:var(--accent)"></i>진행중</span>' +
        '<span><i style="background:var(--warn)"></i>검토 대기</span>' +
        (ui.showCompletedInTimeline ? '<span><i style="background:var(--ok)"></i>완료</span>' : '') +
        '<span>⛓ 선행 업무 있음</span>' +
      '</div></div>'
    );
  }

  function threadItemHtml(item) {
    var label = THREAD_LABEL[item.type] || item.type;
    return (
      '<div class="thread-item ' + item.type + '">' +
        '<div class="th-meta">' + label + ' · ' + formatRelative(item.ts) + '</div>' +
        (item.text ? '<div>' + escapeHtml(item.text) + '</div>' : '') +
      '</div>'
    );
  }

  function taskItemHtml(state, task, ui) {
    var meta = STATUS_META[task.status] || STATUS_META.assigned;
    var open = ui.openTask[task.id];
    var dep = task.dependsOn ? taskById(state, task.dependsOn) : null;

    var actions = '';
    if (task.status === 'assigned') {
      actions += '<button class="btn-ghost" data-act="start-task" data-task="' + task.id + '">진행 시작</button>';
    }
    if (task.status === 'assigned' || task.status === 'in_progress') {
      actions +=
        '<div class="inline-form" style="flex:1 1 100%">' +
          '<textarea data-report-input="' + task.id + '" placeholder="완료된 결과물/보고 내용을 붙여넣으세요"></textarea>' +
          '<div class="form-actions"><button class="btn-primary" data-act="submit-report" data-task="' + task.id + '">보고 등록</button></div>' +
        '</div>';
    }
    if (task.status === 'reported') {
      if (open === 'revise') {
        actions +=
          '<div class="inline-form" style="flex:1 1 100%">' +
            '<textarea data-revise-input="' + task.id + '" placeholder="무엇을 다시 해야 하는지 적어주세요"></textarea>' +
            '<div class="form-actions"><button class="btn-primary" data-act="submit-revise" data-task="' + task.id + '">피드백 보내고 재작업 요청</button></div>' +
          '</div>';
      } else {
        actions += '<button class="btn-primary" data-act="accept-task" data-task="' + task.id + '">승인</button>';
        actions += '<button class="btn-ghost" data-act="open-revise" data-task="' + task.id + '">피드백 / 재작업 요청</button>';
      }
    }
    if (task.status !== 'accepted' && task.status !== 'cancelled') {
      actions += '<button class="btn-danger" data-act="cancel-task" data-task="' + task.id + '">업무 취소</button>';
    }

    return (
      '<div class="task-item">' +
        '<div class="task-head" data-act="toggle-task" data-task="' + task.id + '">' +
          '<span class="tag ' + meta.cls + '">' + meta.label + '</span>' +
          '<span class="task-title">' + escapeHtml(task.title) + '</span>' +
          (dep ? '<span class="dep-badge" title="선행 업무: ' + escapeHtml(dep.title) + '">⛓ ' + escapeHtml(ROLE_BY_ID[dep.roleId] ? ROLE_BY_ID[dep.roleId].name : '') + '</span>' : '') +
          '<span class="deadline' + (isOverdue(task) ? ' overdue' : '') + '">' + fmtDeadline(task.deadline) + '</span>' +
        '</div>' +
        '<div class="task-body' + (open ? ' open' : '') + '">' +
          '<div class="task-brief">' + escapeHtml(task.brief || '(상세 지시사항 없음)') + '</div>' +
          '<div class="thread">' + task.thread.map(threadItemHtml).join('') + '</div>' +
          '<div class="task-actions">' + actions + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function assignFormHtml(role, state, ui) {
    var open = ui.openAssign[role.id];
    var depOptions = state.tasks.filter(function (t) {
      return t.roleId !== role.id && t.status !== 'accepted' && t.status !== 'cancelled';
    }).map(function (t) {
      return '<option value="' + t.id + '">[' + escapeHtml(ROLE_BY_ID[t.roleId].name) + '] ' + escapeHtml(t.title) + '</option>';
    }).join('');

    return (
      '<div class="assign-form' + (open ? ' open' : '') + '" data-assign-form="' + role.id + '">' +
        '<div class="field"><span class="lbl">업무 제목</span><input type="text" name="title" placeholder="예: B2B SaaS 잠재고객 20곳 조사"></div>' +
        '<div class="field"><span class="lbl">상세 지시사항</span><textarea name="brief" placeholder="조건, 배경, 원하는 결과물 형태를 최대한 자세히 적어주세요"></textarea></div>' +
        '<div class="field-row">' +
          '<div class="field"><span class="lbl">데드라인</span><input type="date" name="deadline"></div>' +
          '<div class="field"><span class="lbl">선행 업무 (선택)</span><select name="dependsOn"><option value="">없음</option>' + depOptions + '</select></div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button class="btn-ghost" data-act="cancel-assign" data-role="' + role.id + '">취소</button>' +
          '<button class="btn-primary" data-act="submit-assign" data-role="' + role.id + '">업무 배정</button>' +
        '</div>' +
      '</div>'
    );
  }

  function roleSectionHtml(role, state, ui) {
    var open = openTasksForRole(state, role.id);
    var cancelled = cancelledTasksForRole(state, role.id);
    return (
      '<div class="role-card">' +
        '<div class="role-top">' +
          '<div><div class="role-name">' + escapeHtml(role.name) + '</div><div class="role-desc">' + escapeHtml(role.desc) + '</div></div>' +
          '<span class="scope-chip">' + escapeHtml(role.scope) + '</span>' +
        '</div>' +
        '<button class="btn-primary" style="align-self:flex-start" data-act="toggle-assign" data-role="' + role.id + '">+ 업무 배정</button>' +
        assignFormHtml(role, state, ui) +
        '<div class="task-list">' +
          (open.length ? open.map(function (t) { return taskItemHtml(state, t, ui); }).join('') : '<div style="font-size:13px;color:var(--ink-muted);font-style:italic">배정된 업무가 없어요.</div>') +
        '</div>' +
        (cancelled.length ?
          '<button class="btn-text" data-act="toggle-cancelled" data-role="' + role.id + '">취소된 업무 ' + cancelled.length + '건 ' + (ui.showCancelled[role.id] ? '숨기기' : '보기') + '</button>' +
          (ui.showCancelled[role.id] ? '<div class="task-list">' + cancelled.map(function (t) { return taskItemHtml(state, t, ui); }).join('') + '</div>' : '')
          : '') +
      '</div>'
    );
  }

  function tableHtml(state, ui) {
    var accepted = state.tasks.filter(function (t) { return t.status === 'accepted'; })
      .sort(function (a, b) { return (b.acceptedAt || 0) - (a.acceptedAt || 0); });
    var filtered = ui.tableRoleFilter === 'all' ? accepted : accepted.filter(function (t) { return t.roleId === ui.tableRoleFilter; });

    var filters = '<button class="chip-filter' + (ui.tableRoleFilter === 'all' ? ' active' : '') + '" data-act="set-table-filter" data-value="all">전체 (' + accepted.length + ')</button>' +
      ROLES.map(function (r) {
        var n = accepted.filter(function (t) { return t.roleId === r.id; }).length;
        return '<button class="chip-filter' + (ui.tableRoleFilter === r.id ? ' active' : '') + '" data-act="set-table-filter" data-value="' + r.id + '">' + escapeHtml(r.name) + ' (' + n + ')</button>';
      }).join('');

    if (!filtered.length) {
      return '<div class="filter-row">' + filters + '</div><div class="table-wrap"><div class="table-empty">아직 승인된 업무가 없어요. 보고를 검토하고 승인하면 여기 쌓여요.</div></div>';
    }

    var rows = filtered.map(function (t) {
      var reportItem = null;
      for (var i = t.thread.length - 1; i >= 0; i--) { if (t.thread[i].type === 'report') { reportItem = t.thread[i]; break; } }
      return (
        '<tr>' +
          '<td>' + escapeHtml(ROLE_BY_ID[t.roleId].name) + '</td>' +
          '<td>' + escapeHtml(t.title) + '</td>' +
          '<td class="num">' + fmtDeadline(t.deadline) + '</td>' +
          '<td class="num">' + fmtDeadline(dateOnly(t.acceptedAt)) + '</td>' +
          '<td>' + escapeHtml(reportItem ? (reportItem.text.length > 80 ? reportItem.text.slice(0, 80) + '…' : reportItem.text) : '') + '</td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="filter-row">' + filters + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>담당자</th><th>업무</th><th>데드라인</th><th>완료일</th><th>보고 요약</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  function appHtml(state, ui) {
    return (
      '<header>' +
        '<span class="eyebrow" id="today-label"></span>' +
        '<h1>업무 지휘본부</h1>' +
        '<p class="sub">각 담당자에게 <strong>업무를 배정</strong>하고, 보고가 올라오면 검토해서 승인하세요. 승인된 업무는 완료 테이블에 쌓이고, 서로 이어지는 업무는 타임라인에서 흐름으로 볼 수 있어요.</p>' +
      '</header>' +
      bannerHtml(ui) +
      statsHtml(state) +
      timelineHtml(state, ui) +
      '<div class="section-head"><h2>담당자별 업무</h2><span class="hint">카드에서 업무를 배정하고 진행 상황을 확인하세요</span></div>' +
      '<div class="role-grid">' + ROLES.map(function (r) { return roleSectionHtml(r, state, ui); }).join('') + '</div>' +
      '<div class="section-head"><h2>완료된 업무</h2><span class="hint">승인된 업무 전체 기록</span></div>' +
      tableHtml(state, ui) +
      '<footer class="note">업무 배정·보고·승인은 이 저장소에 실시간으로 저장돼요. 담당자가 채팅에서 작업을 마치면 자동으로 보고가 올라옵니다.</footer>'
    );
  }

  /* ================= shell ================= */

  function shellHtml(state, appSrc) {
    var stateJson = JSON.stringify(state).replace(/</g, '\\u003C');
    return (
      '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>업무 지휘본부</title>\n' + HEAD_EXTRA + '\n<style>' + STYLE_CSS + '</style>\n</head>\n<body>\n' +
      '<div class="wrap" id="app"></div>\n' +
      '<script type="application/json" id="state-data">' + stateJson + '</' + 'script>\n' +
      '<script id="app-script">' + appSrc + '</' + 'script>\n' +
      '</body>\n</html>\n'
    );
  }

  /* ================= exports ================= */

  var exportsApi = {
    ROLES: ROLES,
    STATUS_META: STATUS_META,
    HEAD_EXTRA: HEAD_EXTRA,
    STYLE_CSS: STYLE_CSS,
    shellHtml: shellHtml,
    appHtml: appHtml,
    escapeHtml: escapeHtml,
    dateOnly: dateOnly
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsApi;
  }

  if (typeof document !== 'undefined') {
    runBrowser();
  }

  function runBrowser() {
    var SELF_SRC = document.currentScript.textContent;
    var STATE = JSON.parse(document.getElementById('state-data').textContent);
    var ui = {
      openAssign: {}, openTask: {}, showCancelled: {},
      showCompletedInTimeline: false, tableRoleFilter: 'all',
      saving: false, readOnly: false, offline: false, error: ''
    };
    var artifactCap = null;

    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

    function render() {
      var todayEl;
      document.getElementById('app').innerHTML = appHtml(STATE, ui);
      todayEl = document.getElementById('today-label');
      if (todayEl) {
        var now = new Date();
        var wd = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
        todayEl.textContent = now.getFullYear() + '.' + pad2(now.getMonth() + 1) + '.' + pad2(now.getDate()) + ' (' + wd + ') 기준';
      }
      drawConnectors();
    }

    function drawConnectors() {
      requestAnimationFrame(function () {
        var svg = document.getElementById('timeline-svg');
        var grid = document.getElementById('timeline-grid');
        if (!svg || !grid) return;
        svg.setAttribute('width', grid.scrollWidth);
        svg.setAttribute('height', grid.scrollHeight);
        var defs = '<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" style="fill:var(--accent)"></path></marker></defs>';
        var paths = [];
        STATE.tasks.forEach(function (t) {
          if (!t.dependsOn) return;
          var srcEl = grid.querySelector('[data-bar="' + t.dependsOn + '"]');
          var tgtEl = grid.querySelector('[data-bar="' + t.id + '"]');
          if (!srcEl || !tgtEl) return;
          var x1 = srcEl.offsetLeft + srcEl.offsetWidth, y1 = srcEl.offsetTop + srcEl.offsetHeight / 2;
          var x2 = tgtEl.offsetLeft, y2 = tgtEl.offsetTop + tgtEl.offsetHeight / 2;
          var midX = (x1 + x2) / 2;
          paths.push('<path d="M' + x1 + ',' + y1 + ' C ' + midX + ',' + y1 + ' ' + midX + ',' + y2 + ' ' + x2 + ',' + y2 + '" style="stroke:var(--accent);stroke-width:1.6;fill:none;opacity:.5" marker-end="url(#arrowhead)"></path>');
        });
        svg.innerHTML = defs + paths.join('');
      });
    }

    function publishState(newState) {
      ui.saving = true; ui.error = ''; render();
      if (!artifactCap) { STATE = newState; ui.saving = false; ui.offline = true; render(); return; }
      artifactCap.publish(shellHtml(newState, SELF_SRC)).then(function () {
        /* successful publish reloads this view automatically */
      }).catch(function (err) {
        ui.saving = false;
        var code = err && err.code;
        if (code === 'not_writer' || code === 'not_granted' || code === 'capability_disabled' || code === 'not_declared') {
          ui.readOnly = true;
        } else if (code !== 'conflict') {
          ui.error = (err && err.message) || '저장에 실패했어요. 다시 시도해주세요.';
        }
        render();
      });
    }

    function findTask(s, id) { for (var i = 0; i < s.tasks.length; i++) if (s.tasks[i].id === id) return s.tasks[i]; return null; }

    function assignTask(roleId, data) {
      var s = deepClone(STATE), now = Date.now();
      s.tasks.push({
        id: 't-' + now + '-' + Math.random().toString(36).slice(2, 7),
        roleId: roleId, title: data.title, brief: data.brief,
        deadline: data.deadline || null, dependsOn: data.dependsOn || null,
        createdAt: now, status: 'assigned', acceptedAt: null,
        thread: [{ type: 'assign', text: data.brief, ts: now }]
      });
      publishState(s);
    }
    function startTask(id) { var s = deepClone(STATE), t = findTask(s, id); if (!t) return; t.status = 'in_progress'; t.thread.push({ type: 'start', text: '', ts: Date.now() }); publishState(s); }
    function submitReport(id, text) { if (!text || !text.trim()) return; var s = deepClone(STATE), t = findTask(s, id); if (!t) return; t.status = 'reported'; t.thread.push({ type: 'report', text: text.trim(), ts: Date.now() }); publishState(s); }
    function acceptTask(id) { var s = deepClone(STATE), t = findTask(s, id); if (!t) return; t.status = 'accepted'; t.acceptedAt = Date.now(); t.thread.push({ type: 'accept', text: '', ts: Date.now() }); publishState(s); }
    function requestRevision(id, text) { if (!text || !text.trim()) return; var s = deepClone(STATE), t = findTask(s, id); if (!t) return; t.status = 'in_progress'; t.thread.push({ type: 'feedback', text: text.trim(), ts: Date.now() }); publishState(s); }
    function cancelTask(id) { var s = deepClone(STATE), t = findTask(s, id); if (!t) return; t.status = 'cancelled'; t.thread.push({ type: 'cancel', text: '', ts: Date.now() }); publishState(s); }

    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act'), roleId = el.getAttribute('data-role'), taskId = el.getAttribute('data-task');

      if (act === 'toggle-assign') {
        ui.openAssign[roleId] = !ui.openAssign[roleId]; render();
        setTimeout(function () { var f = document.querySelector('[data-assign-form="' + roleId + '"] [name=title]'); if (f) f.focus(); }, 0);
      } else if (act === 'cancel-assign') { ui.openAssign[roleId] = false; render(); }
      else if (act === 'submit-assign') {
        var form = document.querySelector('[data-assign-form="' + roleId + '"]');
        var title = form.querySelector('[name=title]').value.trim();
        if (!title) { form.querySelector('[name=title]').focus(); return; }
        assignTask(roleId, {
          title: title,
          brief: form.querySelector('[name=brief]').value.trim(),
          deadline: form.querySelector('[name=deadline]').value,
          dependsOn: form.querySelector('[name=dependsOn]').value || null
        });
      } else if (act === 'toggle-task') {
        ui.openTask[taskId] = ui.openTask[taskId] ? false : true; render();
      } else if (act === 'start-task') { startTask(taskId); }
      else if (act === 'submit-report') {
        var ta = document.querySelector('[data-report-input="' + taskId + '"]');
        submitReport(taskId, ta.value);
      } else if (act === 'accept-task') { acceptTask(taskId); }
      else if (act === 'open-revise') {
        ui.openTask[taskId] = 'revise'; render();
        setTimeout(function () { var fa = document.querySelector('[data-revise-input="' + taskId + '"]'); if (fa) fa.focus(); }, 0);
      } else if (act === 'submit-revise') {
        var fa2 = document.querySelector('[data-revise-input="' + taskId + '"]');
        requestRevision(taskId, fa2.value);
      } else if (act === 'cancel-task') {
        if (root.confirm ? root.confirm('이 업무를 취소할까요?') : true) cancelTask(taskId);
      } else if (act === 'toggle-cancelled') { ui.showCancelled[roleId] = !ui.showCancelled[roleId]; render(); }
      else if (act === 'toggle-timeline-completed') { ui.showCompletedInTimeline = !ui.showCompletedInTimeline; render(); }
      else if (act === 'set-table-filter') { ui.tableRoleFilter = el.getAttribute('data-value'); render(); }
    });

    render();
    var capPromise = (root.claude && root.claude.use) ? root.claude.use('artifact') : Promise.resolve(null);
    capPromise.then(function (cap) { artifactCap = cap; if (!cap) ui.offline = true; render(); }).catch(function () { ui.offline = true; render(); });
    root.addEventListener('resize', drawConnectors);
  }

})(typeof window !== 'undefined' ? window : this);
