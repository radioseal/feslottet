// node tools/gallery.js <out.png> [files=models/a.js,models/b.js] [filter=xx] [style=crystal] [styles=1] [variants=1] [cols=8]
// Renders every VOX model from the given js files into a labelled grid screenshot (for visual review).
// Default files: every js/models/*.js plus core/fx.js (manipulatives).  Big galleries are split into several images (_2, _3 …).
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp');
(async () => {
  const out = process.argv[2] || 'gallery.png';
  let args = process.argv.slice(3).filter(a => !a.startsWith('cols='));
  if (!args.some(a => a.startsWith('files='))) {
    const dir = path.join(__dirname, '..', 'js', 'models');
    const list = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort().map(f => 'models/' + f);
    args.push('files=' + ['core/fx.js', ...list].join(','));
  }
  const cols = +((process.argv.find(a => a.startsWith('cols=')) || 'cols=8').split('=')[1]);
  const W = cols * 186 + 12;
  const b = await launch({ size: W + ',2400' });
  await b.open('tools/gallery.html#' + args.join('&'), 'window.GALLERY_DONE != null');
  const n = await b.eval('window.GALLERY_DONE');
  const h = await b.eval('document.body.scrollHeight');
  const PAGE = 7800; let k = 0;
  for (let y = 0; y < h; y += PAGE, k++) {
    await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: Math.min(PAGE, h - y), deviceScaleFactor: 1, mobile: false });
    await b.eval(`window.scrollTo(0, ${y})`);
    await new Promise(r => setTimeout(r, 150));
    const file = k === 0 ? out : out.replace(/(\.\w+)$/, `_${k + 1}$1`);
    await b.screenshot(file);
    console.log('wrote', file);
  }
  console.log('models', n, 'errors', await b.eval('window.GALLERY_ERRORS'), b.errors.slice(0, 10));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
