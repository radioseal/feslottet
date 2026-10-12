// Regenerates Feslottet.html from the folder contents (fixed core order, then data/models/learn/game/world/ui alphabetical).
// Run after adding/removing any js/css file:  node tools/build_html.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CORE = ['00_core', 'save', 'audio', 'models', 'vox', 'render', 'things', 'space', 'world', 'player', 'input', 'ui', 'fx', 'stubs'].map(n => `js/core/${n}.js`);
// tpl.js must load before js/speech/lines_*.js (they register templates at load time)
const order = (a, b) => (a === 'tpl.js' ? -1 : b === 'tpl.js' ? 1 : a < b ? -1 : a > b ? 1 : 0);
// v4: some files must lead their folder (DESIGN4 §1: ladders before the engine/generators; the task runtime before the kit and formats)
const FIRST = { learn: ['ladders.js'], 'game/tasks': ['stage.js', 'kit.js'] };
const dirJs = d => { const p = path.join(ROOT, 'js', d); if (!fs.existsSync(p)) return [];
  const pri = FIRST[d] || [], rank = f => { const i = pri.indexOf(f); return i < 0 ? pri.length : i; };
  return fs.readdirSync(p).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort((a, b) => rank(a) - rank(b) || order(a, b)).map(f => `js/${d}/${f}`); };
const css = ['css/font_andika.css', 'css/base.css', ...fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css') && !['font_andika.css', 'base.css'].includes(f)).sort().map(f => 'css/' + f)];
const scripts = ['js/three.min.js', ...CORE, ...['data', 'speech', 'models', 'learn', 'game', 'game/tasks', 'world', 'ui'].flatMap(dirJs)];
if (fs.existsSync(path.join(ROOT, 'audio/speech.js'))) scripts.push('audio/speech.js');
if (fs.existsSync(path.join(ROOT, 'js/debug.js'))) scripts.push('js/debug.js');
scripts.push('js/main.js');
const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Feslottet</title>
${css.map(c => `<link rel="stylesheet" href="${c}">`).join('\n')}
</head>
<body>
<div id="view"></div>
<div id="bubbles"></div>
<div id="hud"></div>
<div id="panels"></div>
<div id="toasts"></div>
<div id="sub"></div>
<div id="screens"></div>
${scripts.map(s => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, process.env.OUT || 'Feslottet.html'), html);
console.log('Feslottet.html:', css.length, 'css,', scripts.length, 'scripts');
