#!/usr/bin/env node
// Agent-side CLI: apply one board mutation to a locally-saved copy of the
// published board HTML, and write out the new HTML ready to publish.
//
// Usage:
//   node agent.js <op> <argsJson> <inHtmlPath> <outHtmlPath>
//
// ops: assign | start | report | accept | revise | cancel | show
//
//   assign  '{"roleId":"market-researcher","title":"...","brief":"...","deadline":"2026-08-30","recurring":false,"dependsOn":null}'
//   start   '{"taskId":"t-..."}'
//   report  '{"taskId":"t-...","text":"..."}'
//   accept  '{"taskId":"t-...","tags":["고객사A","Q3"]}'
//   revise  '{"taskId":"t-...","text":"..."}'
//   cancel  '{"taskId":"t-..."}'
//   show    (prints a compact task list to stderr, writes state.json, no HTML change)
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
  return JSON.parse(m[1]);
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
  } else if (op === 'show') {
    state.tasks.forEach(function (t) {
      console.error(
        '[' + t.status + ']' + (t.recurring ? ' (recurring, ' + t.runs.length + ' runs)' : '') +
        ' ' + t.id + ' :: ' + mod.ROLE_BY_ID[t.roleId].name + ' :: ' + t.title +
        (t.deadline ? ' (deadline ' + t.deadline + ')' : '')
      );
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

  // Print the id of the task this op touched (or the newly created one) so
  // the caller can chain further ops without re-deriving it.
  const touched = args.taskId || (newState.tasks[newState.tasks.length - 1] && newState.tasks[newState.tasks.length - 1].id);
  console.error('ok: ' + op + ' -> task ' + touched + ' | wrote ' + out);
  console.log(touched);
}

main();
