// node tools/smoke.js [shot.jpg] — boots the game headless, steps frames, reports errors + state
const { launch } = require('./cdp');
(async () => {
  const b = await launch({ size: '1470,773' });
  await b.open('Feslottet.html#silent&seed=1&fresh');
  await b.eval('F.debug.frames(10)');
  console.log(JSON.stringify(await b.eval('F.dbg.state()')));
  console.log('things', await b.eval('F.Things.list.length'), 'chunks', await b.eval('F.W.chunks.size'));
  if (process.argv[2]) await b.screenshot(process.argv[2]);
  console.log('errors', b.errors.length ? b.errors.slice(0, 15) : 'none');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
