// node tools/showcase2.js – open-world update showcase shots into _dev/shots/v2final/
const { launch } = require('./cdp');
const O = '_dev/shots/v2final/';
(async () => {
  const b = await launch({ size: '1470,773' });
  const shot = async (n, sec = 1.5) => { await b.eval(`F.dbg.step(${sec})`); await b.screenshot(O + n + '.jpg'); console.log('shot', n); };
  const tryE = async (n, expr, sec) => { try { await b.eval(expr); await shot(n, sec); } catch (e) { console.log(n, 'ERR', e.message.slice(0, 160)); } };
  await b.open('Feslottet.html#test&silent&seed=7&fresh&skip&fairy=blomst', 'window.F && F.booted === true && F.dbg && F.dbg.ready()');
  await shot('01_wake_tower', 2);
  await tryE('02_outside_tower', "F.dbg.teleport(80,-80)", 2);
  await tryE('03_courtyard', "F.dbg.teleport(6,10)", 2);
  await tryE('04_castle_inside', "F.dbg.bld && F.dbg.bld('slott',0)", 2);
  await tryE('05_castle_floor1', "F.dbg.bld && F.dbg.bld('slott',1)", 2);
  await tryE('06_park_animals', "F.dbg.teleport(-50,60)", 3);
  await tryE('07_farm', "(()=>{const r=(F.FAUNA&&F.Fauna)?1:0; F.dbg.teleport(300,40); return r;})()", 4);
  const realms = await b.eval("(F.Realm.list()||[]).map(r=>({id:r.id,x:r.x,z:r.z,state:r.state}))");
  console.log('realms', JSON.stringify(realms).slice(0, 400));
  const r0 = realms.find(r => r.state && r.state !== 'site') || realms[0];
  if (r0) { await tryE('08_kingdom_' + r0.id, `F.dbg.teleport(${r0.x},${r0.z + 34})`, 4); }
  const r1 = realms.find(r => r !== r0 && r.state && r.state !== 'site');
  if (r1) { await tryE('09_kingdom_' + r1.id, `F.dbg.teleport(${r1.x},${r1.z + 34})`, 4); }
  await tryE('10_album', "F.Album.open(12)", 1.5);
  await b.eval('F.Album.close && F.Album.close()');
  await tryE('11_beach', "(()=>{ const p=F.dbg.goRegion('strand'); return p; })()", 4);
  await tryE('12_snow', "(()=>{ const p=F.dbg.goRegion('snohaugen'); return p; })()", 4);
  await tryE('13_lavender', "(()=>{ const p=F.dbg.goRegion('lavendel'); return p; })()", 4);
  await tryE('14_map', "F.Map && F.Map.open && F.Map.open()", 1.5);
  await b.eval('F.Map && F.Map.close && F.Map.close()');
  await tryE('15_courtyard_close', "(()=>{ F.dbg.teleport(4,14); F.R.setCam && F.R.setCam({dist:16}); })()", 2);
  await tryE('16_wand_cast', "(()=>{ F.dbg.teleport(4,40); F.dbg.wand.open(); F.dbg.wand.type('hest'); F.dbg.wand.submit(); })()", 2.2);
  console.log('errors', b.errors.slice(0, 6));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
