const fs = require('fs');
const path = require('path');

const appScriptPath = path.join(__dirname, 'app-script.js');
const appSrc = fs.readFileSync(appScriptPath, 'utf8');
const mod = require(appScriptPath);

const statePath = path.join(__dirname, 'state.json');
let state = { tasks: [] };
if (fs.existsSync(statePath)) {
  state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

const html = mod.shellHtml(state, appSrc);
const outPath = process.argv[2] || path.join(__dirname, '..', 'report-board.html');
fs.writeFileSync(outPath, html);
console.log('wrote', outPath, '(' + html.length + ' bytes), tasks:', state.tasks.length);
