// node tools/budget_speech.js – clips per template-id prefix (DESIGN2 §8.2 caps), total vs 15000 (cap raised for the v4 curriculum, DESIGN4). Runs the game headless (#collect).
const { launch } = require('./cdp');
const CAPS = { bld: 55, home: 30, realm: 35, fa: 55, bf: 320, al: 320, roy: 160, rq: 170, shop: 95, trav: 30, map: 30 };
(async () => {
  const b = await launch({ size: '800,600' });
  try {
    await b.open('Feslottet.html#collect&silent', 'window.F && F.booted === true');
    const r = await b.eval(`(() => { const by = {}; let total = 0; const seen = new Set();
      for (const id in F.TPL.all) { const s = F.TPL.all[id], names = Object.keys(s.slots), sets = names.map(n => F.SETS.get(s.slots[n]));
        let combos = 1; sets.forEach(x => combos *= x.length); const n = s.voices.length * s.text.length * combos;
        const pre = id.split('_')[0]; by[pre] = (by[pre] || 0) + n; total += n; }
      const uniq = new Set(F.collectSpeech(1).map(([v, t]) => v + '|' + t)).size;
      return { by, total, uniq }; })()`);
    const rows = Object.entries(r.by).sort((a, c) => c[1] - a[1]);
    for (const [k, n] of rows) console.log((k + '_').padEnd(10), String(n).padStart(6), CAPS[k] ? ' cap(new)≈' + CAPS[k] : '');
    console.log('templates expand to', r.total, '| unique clips', r.uniq, r.uniq > 15000 ? 'OVER 15000!' : 'ok (≤ 15000)');
    process.exitCode = r.uniq > 15000 ? 1 : 0;
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(2); });
