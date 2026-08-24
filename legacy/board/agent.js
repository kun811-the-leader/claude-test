#!/usr/bin/env node
// Agent-side CLI: apply one board mutation to a locally-saved copy of the
// published board HTML, and write out the new HTML ready to publish.
//
// Usage:
//   node agent.js <op> <argsJson> <inHtmlPath> <outHtmlPath>
//
// ops: assign | start | report | accept | revise | cancel | mission-add |
//      mission-toggle | mission-delete | show
//
//   assign         '{"roleId":"market-researcher","title":"...","brief":"...","deadline":"2026-08-30","recurring":false,"dependsOn":null}'
//   start          '{"taskId":"t-..."}'
//   report         '{"taskId":"t-...","text":"..."}'
//   accept         '{"taskId":"t-...","tags":["고객사A","Q3"]}'
//   revise         '{"taskId":"t-...","text":"..."}'
//   cancel         '{"taskId":"t-..."}'
//   mission-add    '{"scope":"day 또는 week","text":"오늘/이번주 꼭 할 것","linkedTaskId":"t-... 또는 생략"}'
//   mission-toggle '{"missionId":"m-..."}'
//   mission-delete '{"missionId":"m-..."}'
//   show           (prints a compact task+mission list to stderr, writes state.json, no HTML change)
//
// The extracted <script type="application/json" id="state-data"> block is the
// source of truth. This script never re-renders the DOM (that only happens in
// the browser) — it only rewrites that one JSON block via shellHtml(), which
// is the SAME function the browser calls when a viewer publishes a change.

const fs = require('fs');
const path = require('path');

const mod = require(path.join(__dirname, 'app-script.js'));

function extractState(html) {
  const m = html.match(/<script type="application\/json" id="state-data">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('state-data block not found in input HTML');
  return mod.ensureCollections(JSON.parse(m[1]));
}

function main() {
  const [op, argsJson, inPath, outPath] = process.argv.slice(2);
  if (!op || !inPath) {
    console.error('usage: node agent.js <op> <argsJson> <inHtmlPath> [outHtmlPath]');
    process.exit(1);
  }
  const html = fs.readFileSync(inPath, 'utf8');
  const state = extractState(html);
  const args = argsJson ? JSON.parse(argsJson) : {};

  let newState = state;
  if (op === 'assign') {
    newState = mod.mutations.assign(state, args.roleId, args);
  } else if (op === 'start') {
    newState = mod.mutations.start(state, args.taskId);
  } else if (op === 'report') {
    newState = mod.mutations.report(state, args.taskId, args.text);
  } else if (op === 'accept') {
    newState = mod.mutations.accept(state, args.taskId, args.tags || []);
  } else if (op === 'revise') {
    newState = mod.mutations.revise(state, args.taskId, args.text);
  } else if (op === 'cancel') {
    newState = mod.mutations.cancel(state, args.taskId);
  } else if (op === 'mission-add') {
    newState = mod.mutations.addMission(state, args);
  } else if (op === 'mission-toggle') {
    newState = mod.mutations.toggleMission(state, args.missionId);
  } else if (op === 'mission-delete') {
    newState = mod.mutations.deleteMission(state, args.missionId);
  } else if (op === 'show') {
    state.tasks.forEach(function (t) {
      console.error(
        '[' + t.status + ']' + (t.recurring ? ' (recurring, ' + t.runs.length + ' runs)' : '') +
        ' ' + t.id + ' :: ' + mod.ROLE_BY_ID[t.roleId].name + ' :: ' + t.title +
        (t.deadline ? ' (deadline ' + t.deadline + ')' : '')
      );
    });
    (state.missions || []).forEach(function (m) {
      console.error('[mission/' + m.scope + '/' + m.periodKey + ']' + (m.done ? ' (done)' : '') + ' ' + m.id + ' :: ' + m.text);
    });
    fs.writeFileSync(path.join(__dirname, 'state.json'), JSON.stringify(state, null, 2));
    return;
  } else {
    console.error('unknown op: ' + op);
    process.exit(1);
  }

  const appSrc = fs.readFileSync(path.join(__dirname, 'app-script.js'), 'utf8');
  const outHtml = mod.shellHtml(newState, appSrc);
  const out = outPath || inPath;
  fs.writeFileSync(out, outHtml);
  fs.writeFileSync(path.join(__dirname, 'state.json'), JSON.stringify(newState, null, 2));

  // Print the id this op touched (or the newly created one) so the caller
  // can chain further ops without re-deriving it.
  let touched = args.taskId || args.missionId;
  if (!touched) {
    if (op === 'mission-add') touched = newState.missions[newState.missions.length - 1] && newState.missions[newState.missions.length - 1].id;
    else touched = newState.tasks[newState.tasks.length - 1] && newState.tasks[newState.tasks.length - 1].id;
  }
  console.error('ok: ' + op + ' -> ' + touched + ' | wrote ' + out);
  console.log(touched);
}

main();
