// node tools/gallery_shot.js [styles=1] [variants=1] [only=m_food]  – one gallery image per model file → _dev/gallery/<file>.jpg
// (vision review of every VOX def; errors per file are printed). Uses tools/gallery.html.
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp');
(async () => {
  const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '_dev', 'gallery');
  fs.mkdirSync(OUT, { recursive: true });
  const extra = process.argv.slice(2).filter(a => /^(styles|variants|style|angle)=/.test(a));
  const only = (process.argv.find(a => a.startsWith('only=')) || '').slice(5);
  const files = ['core/fx.js', ...fs.readdirSync(path.join(ROOT, 'js', 'models')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort().map(f => 'models/' + f)]
    .filter(f => !only || f.includes(only));
  const cols = 10, W = cols * 186 + 12;
  const b = await launch({ size: W + ',2000' });
  let total = 0, errs = 0;
  for (const f of files) {
    await b.open('tools/gallery.html#' + ['files=' + f, ...extra].join('&'), 'window.GALLERY_DONE != null');
    const n = await b.eval('window.GALLERY_DONE'), e = await b.eval('window.GALLERY_ERRORS');
    const h = await b.eval('document.body.scrollHeight');
    await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: Math.min(h, 12000), deviceScaleFactor: 1, mobile: false });
    const name = path.basename(f, '.js');
    await b.screenshot(path.join(OUT, name + '.jpg'));
    console.log(name.padEnd(18), 'models', n, e ? 'ERRORS ' + e : '');
    total += n; errs += e;
  }
  console.log('total', total, 'errors', errs, b.errors.slice(0, 10));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
