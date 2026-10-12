// Collects every sentence Feslottet can speak -> tools/sentences.json  ([voice, text] pairs)
// Runs the real game in headless Chrome (#collect&silent) and calls F.collectSpeech(N),
// which runs every registered enumerator (F.speechEnum) and samples every task generator at every level.
// Usage: node tools/collect_speech.js [N=400]      node tools/collect_speech.js --check
'use strict';
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp');
(async () => {
  const check = process.argv.includes('--check');
  const N = +(process.argv.find(a => /^\d+$/.test(a)) || 400);
  const b = await launch({ size: '800,600' });
  try {
    await b.open((process.env.PAGE || 'Feslottet.html') + '#collect&silent', 'window.F && F.booted === true');
    const list = await b.eval(`F.collectSpeech(${N})`);
    if (b.errors.length) console.error('page errors:\n  ' + b.errors.slice(0, 20).join('\n  '));
    const uniq = [...new Map(list.map(([v, t]) => [v + '|' + t, [v, t]])).values()].sort((a, c) => (a[0] + a[1]).localeCompare(c[0] + c[1]));
    if (check) {
      const code = fs.readFileSync(path.join(__dirname, '..', 'audio', 'speech.js'), 'utf8');
      const map = JSON.parse(code.replace(/^window\.SPEECH = /, '').replace(/;\s*$/, ''));
      const miss = uniq.filter(([v, t]) => { const f = map[v ? v + '|' + t : t]; return !f || !fs.existsSync(path.join(__dirname, '..', f)); });
      console.log(`sentences ${uniq.length}, missing ${miss.length}`);
      miss.slice(0, 40).forEach(x => console.log('  MISSING', JSON.stringify(x)));
      process.exitCode = miss.length ? 1 : 0;
    } else {
      fs.writeFileSync(path.join(__dirname, 'sentences.json'), JSON.stringify(uniq, null, 0).replace(/\],\[/g, '],\n['));
      const byV = {}; uniq.forEach(([v]) => byV[v || 'narrator'] = (byV[v || 'narrator'] || 0) + 1);
      console.log('sentences', uniq.length, JSON.stringify(byV));
      if (uniq.length > 15000) { console.error('OVER BUDGET: more than 15000 clips'); process.exitCode = 3; }
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(2); });
