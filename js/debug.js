/* Feslottet – debug / test API (DESIGN §11.6). Always loaded; harmless. Modules may add F.dbg.* helpers. */
(function () {
'use strict';
const F = window.F;
const dbg = F.dbg = F.dbg || {};
const ring = dbg.events = [];
const origEmit = F.emit;
F.emit = function (ev, ...args) {
  if (ev !== 'tick' && ev !== 'preRender' && ev !== 'playerMoved' && ev !== 'subtitle') {
    ring.push({ t: +F.T.now.toFixed(2), ev, args: args.map(a => a && a.id ? a.id : (typeof a === 'object' ? (a && a.type) || '{}' : a)) });
    if (ring.length > 400) ring.shift();
  }
  return origEmit(ev, ...args);
};
dbg.ready = () => !!F.booted && F.W.chunks.size > 0;
dbg.step = (sec, dt = 1 / 30) => F.debug.seconds(sec, dt);
dbg.teleport = (x, z) => { if (F.Bld && F.Bld.cur && F.Bld.exitNow) F.Bld.exitNow(); if (F.Space.cur !== 'out') F.Space.set('out'); F.Player.teleport(x, z); F.debug.frames(2); return [F.Player.pos.x, F.Player.pos.z]; };
dbg.enter = room => { F.Castle.enter(room); F.debug.frames(3); return F.Space.cur; };
dbg.exit = () => { F.Castle.exit(); F.debug.frames(3); return F.Space.cur; };
dbg.list = (o) => {
  o = o || {}; const sp = o.space || F.Space.cur, r = o.radius || 60, P = F.Player.pos;
  return F.Things.list.filter(t => t.space === sp && Math.hypot(t.x - P.x, t.z - P.z) <= r).map(t => {
    const s = F.Input.screenOf(t);
    return { id: t.id, type: t.type, name: t.def.name || null, x: +t.x.toFixed(2), z: +t.z.toFixed(2), space: t.space, learn: t.def.learn || null,
      press: !!t.def.press, screen: { x: Math.round(s.x), y: Math.round(s.y), on: s.onScreen } };
  });
};
dbg.things = type => F.Things.list.filter(t => !type || t.type === type).map(t => ({ id: t.id, type: t.type, x: +t.x.toFixed(2), z: +t.z.toFixed(2), space: t.space }));
// teleport into reach, run press, step 2 s; reports whether it visibly reacted / opened a task
dbg.click = async (id, sec = 2) => {
  const t = F.Things.byId(id); if (!t) throw new Error('no thing ' + id);
  if (t.space !== F.Space.cur) throw new Error('thing in other space: ' + t.space);
  const before = snapshot(t);
  const nUI = document.querySelectorAll('.panel-wrap').length;
  const p = F.Things.run(t);
  F.debug.seconds(sec);
  const after = snapshot(t);
  return { ok: true, reacted: t.lastReactAt > 0 && (before !== after || !!t.reactedVisibly), task: !!F.Task.current || document.querySelectorAll('.panel-wrap').length > nUI, settled: await Promise.race([p.then(() => true), Promise.resolve(false)]) };
};
function snapshot(t) {
  const a = [];
  if (t.obj) t.obj.traverse(o => { a.push(o.position.x.toFixed(3), o.position.y.toFixed(3), o.rotation.x.toFixed(3), o.rotation.y.toFixed(3), o.rotation.z.toFixed(3), o.scale.x.toFixed(3), o.scale.y.toFixed(3), o.visible ? 1 : 0); });
  return a.join(',') + JSON.stringify(t.state || {}) + (t.obj ? t.obj.children.length : 0);
}
dbg.clickXY = (x, y) => F.Input.pressAt(x, y);
dbg.state = () => {
  const info = F.R.renderer.info;
  return { space: F.Space.cur, room: F.Castle.cur || null, pos: [+F.Player.pos.x.toFixed(1), +F.Player.pos.z.toFixed(1)], coins: F.save.coins, fairy: F.save.fairy, day: F.save.day || 1,
    strands: (F.LEARN.summary() || {}).strands, quest: F.save.quests && F.save.quests.active || null,
    panels: [...document.querySelectorAll('.panel-wrap')].map(p => p.className), missingSpeech: F.missingSpeech.size,
    drawCalls: info.render.calls, tris: info.render.triangles, things: F.Things.list.length, chunks: F.W.chunks.size };
};
dbg.density = (cx, cz) => F.W.density ? F.W.density(cx, cz) : null;
dbg.give = n => { F.Eco.add(n, { reason: 'dbg' }); return F.save.coins; };
dbg.skip = () => { F.Speech.clearQueue(); const c = F.Speech.cur; if (c) { try { c.pause && c.pause(); } catch (e) {} F.Speech.cur = null; F.Speech.next(); } return true; };
dbg.shot = (q = 0.8) => F.debug.shot(q);
dbg.missing = () => [...F.missingSpeech];
})();
