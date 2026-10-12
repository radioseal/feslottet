// node tools/showcase.js – a few representative screenshots into _dev/shots/final/ (for the parent's morning summary)
const { launch } = require('./cdp');
const O = '_dev/shots/final/';
(async () => {
  const b = await launch({ size: '1470,773' });
  const shot = async (n, sec = 1.5) => { await b.eval(`F.dbg.step(${sec})`); await b.screenshot(O + n + '.jpg'); };
  await b.open('Feslottet.html#test&silent&seed=7&fresh&skip&fairy=blomst', 'window.F && F.booted === true && F.dbg && F.dbg.ready()');
  await shot('1_fetarnet');
  try { await b.eval("F.dbg.enter('tronsal')"); await shot('2_tronsalen'); } catch (e) { console.log('tronsal', e.message); }
  try { await b.eval("F.dbg.enter('kjokken')"); await shot('3_kjokkenet'); } catch (e) {}
  await b.eval('F.dbg.teleport(0,36)'); await shot('4_slottet', 2);
  await b.eval('F.dbg.teleport(-60,40)'); await shot('5_parken', 2);
  try { const v = await b.eval('(F.W.villages({x:300,z:0},400)||[])[0] && [F.W.villages({x:300,z:0},400)[0].houses[0].x, F.W.villages({x:300,z:0},400)[0].houses[0].z]'); if (v) { await b.eval(`F.dbg.teleport(${v[0]},${v[1] + 6})`); await shot('6_landsby', 2); } } catch (e) { console.log('village', e.message); }
  await b.eval('F.dbg.teleport(4,40)'); await b.eval('F.dbg.step(1)');
  try { await b.eval("F.Wand.cast('14 eple')"); } catch (e) { try { await b.eval("F.Wand.cast('eple', 14)"); } catch (e2) { console.log('cast', e2.message); } }
  await shot('7_tallmagi_14_eple', 5);
  try { await b.eval("F.dbg.forceTask('F07',{strand:'T-MENGDE',rung:4,target:13})"); await shot('8_oppgave_tryllebygg', 4); await b.eval('F.dbg.abortTask && F.dbg.abortTask()'); } catch (e) { console.log('task', e.message); }
  console.log('errors', b.errors.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
