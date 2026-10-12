/* Feslottet – interactable things registry.
   F.Things.def(type, {
     name: 'pianoet',                 // spoken/display name (optional)
     build(thing, rng) -> THREE.Object3D   // model; origin at the foot point. Use F.M.builder(); store animated parts on thing.parts
     radius: 0.8,                     // collision/reach radius (world units)
     solid: true,                     // blocks walking
     reach: 1.6,                      // how close the fairy must come before press() runs (default radius+1.2)
     press(thing) -> void|Promise,    // what happens on press (reaction, task, shop ...)
     tick(thing, dt, t),              // optional per-frame animation (only while loaded and near)
     hoverable: true,                 // default true
   })
   const th = F.Things.spawn(type, x, z, {id, ry, y, data, scale, zone})   // returns thing
   thing = { id, type, def, x, y, z, ry, obj, parts, data, state (persisted in F.save.world[id]), zone, busy }
   F.Things.setState(thing, patch)  – persists
   F.Things.remove(thing)
   F.Things.near(x, z, r) -> things   F.Things.byId(id)   F.Things.press(thing) (walk+press via player) */
(function () {
'use strict';
const F = window.F;
const defs = {};
const list = [];
const byId = new Map();
let autoId = 0;
F.Things = {
  defs, list,
  def(type, d) {
    if (defs[type]) console.warn('Things.def duplicate type', type);
    defs[type] = Object.assign({ radius: 0.7, solid: true, hoverable: true }, d, { type });
    return defs[type];
  },
  spawn(type, x, z, o) {
    o = o || {};
    const def = defs[type];
    if (!def) { console.warn('unknown thing type', type); return null; }
    const id = o.id || ('t' + (autoId++));
    if (byId.has(id)) F.Things.remove(byId.get(id));
    const space = o.space || def.space || 'out';
    const th = { id, type, def, x, z, space, y: o.y != null ? o.y : (F.Space ? F.Space.impl[space].heightAt(x, z) : 0), ry: o.ry || 0, scale: o.scale || 1,
      data: o.data || {}, zone: o.zone || null, parts: {}, busy: false, t0: Math.random() * 10, lastReactAt: 0 };
    th.state = (F.save.world && F.save.world[id]) || {};
    const rng = F.U.rng(F.U.hashStr(id));
    let obj;
    try { obj = def.build ? def.build(th, rng) : (def.model && F.VOX.has(def.model) ? F.VOX.make(def.model, Object.assign({}, def.modelOpts || {}, th.data.opts || {})) : new THREE.Group()); }
    catch (e) { console.error('build failed for', type, e); obj = new THREE.Group(); }
    th.obj = obj;
    obj.position.set(x, th.y, z); obj.rotation.y = th.ry; if (th.scale !== 1) obj.scale.setScalar(th.scale);
    obj.traverse(m => { m.userData.thing = th; });
    th.radius = (o.radius != null ? o.radius : def.radius) * th.scale;
    th.parts = (obj.userData && obj.userData.parts) || th.parts;
    th.react = (name, params) => F.BEH && F.BEH.run ? F.BEH.run(th, name, params) : Promise.resolve();
    th.solid = o.solid != null ? o.solid : def.solid;
    (o.parent || F.Space.scene(space)).add(obj);
    list.push(th); byId.set(id, th);
    if (def.init) try { def.init(th); } catch (e) { console.error('init failed', type, e); }
    return th;
  },
  remove(th) {
    const i = list.indexOf(th); if (i >= 0) list.splice(i, 1);
    byId.delete(th.id);
    if (th.obj && th.obj.parent) th.obj.parent.remove(th.obj);
    if (th.def.dispose) try { th.def.dispose(th); } catch (e) {}
  },
  byId: id => byId.get(id),
  ofType: type => list.filter(t => t.type === type),
  near(x, z, r, space) { const sp = space || F.Space.cur; return list.filter(t => t.space === sp && Math.hypot(t.x - x, t.z - z) <= r + t.radius); },
  setState(th, patch) {
    Object.assign(th.state, patch);
    F.save.world[th.id] = th.state;
    F.store();
  },
  // walk to the thing, then run its press()
  press(th) { return F.Player ? F.Player.goPress(th) : F.Things.run(th); },
  async run(th) {
    if (th.busy || !(th.def.press || th.def.beh)) return;
    th.busy = true;
    const w = netWatch(th);
    F.emit('press', th);
    th.lastReactAt = F.T.now;
    try {
      if (th.def.press) await th.def.press(th);
      else if (th.def.beh && F.BEH && F.BEH.runList) await F.BEH.runList(th, th.def.beh);
    } catch (e) { console.error('press failed', th.type, e); }
    th.busy = false;
    F.emit('pressed', th);
    netSettle(w);
  },
};

/* ---------------------------------------------------------- press safety net: EVERY press visibly reacts.
   From the moment a press starts until 0.3 s after it resolves we watch for a visible change: the thing's transforms / visibility /
   children / materials / state, an effect (F.FX_LOG) within 4 m of the thing or the fairy, a UI reaction (F.UI.seen: panel, bubble,
   toast, coins, label, tray), a task, a new thing, the fairy moving (rides) or a space change. If nothing happened, the thing does
   a squash-pop + sparkle + a soft sound. F.Things.net = {ms, on, fired, checked, log[]}  (def.noNet: true opts a type out). */
const NET = F.Things.net = { ms: 300, on: true, fired: 0, checked: 0, log: [] };
const watching = new Set();
function sig(th) {
  let h = 0, n = 0;
  if (th.obj) th.obj.traverse(o => {
    if (++n > 500 || o.userData.isSil || o.userData.hull) return;
    const p = o.position, r = o.rotation, s = o.scale;
    h = h * 1.0001 + n * (p.x * 1.3 + p.y * 2.7 + p.z * 3.1 + r.x * 5.3 + r.y * 7.1 + r.z * 9.7 + s.x * 11.3 + s.y * 13.1 + s.z * 17.9 + (o.visible ? 19 : 0) + (o.children.length - (o.userData.nHull || 0)) * 23);
    const m = o.material; if (m && !Array.isArray(m)) { h += n * (m.id * 0.013 + (m.opacity || 0) * 3.7); if (m.color) h += n * (m.color.r + m.color.g * 2 + m.color.b * 3); }
  });
  return h.toFixed(6) + '|' + (th.obj ? +th.obj.visible : 0) + '|' + JSON.stringify(th.state || {});
}
function netWatch(th) {
  const P = F.Player && F.Player.pos;
  const w = { th, s0: sig(th), fx: F.FX_SEEN || 0, ui: (F.UI && F.UI.seen) || 0, n: list.length, sp: F.Space && F.Space.cur, px: P ? P.x : 0, pz: P ? P.z : 0, seen: false };
  watching.add(w);
  return w;
}
function netSeen(w) {
  if (w.seen) return true;
  const th = w.th, P = F.Player && F.Player.pos;
  let seen = (F.UI && F.UI.seen || 0) !== w.ui || list.length !== w.n || (F.Space && F.Space.cur !== w.sp) || !!(F.Task && F.Task.current) ||
    (P && Math.hypot(P.x - w.px, P.z - w.pz) > 0.3) || !th.obj || !th.obj.parent;
  if (!seen && (F.FX_SEEN || 0) !== w.fx && F.FX_LOG) {
    for (let i = F.FX_LOG.length - 1; i >= 0; i--) {
      const e = F.FX_LOG[i]; if (e.n <= w.fx) break;
      if (Math.hypot(e.x - th.x, e.z - th.z) < 4 + (th.radius || 0) || (P && Math.hypot(e.x - P.x, e.z - P.z) < 3)) { seen = true; break; }
    }
  }
  if (!seen && sig(th) !== w.s0) seen = true;
  w.seen = seen;
  return seen;
}
function netSettle(w) {
  if (!NET.on || w.th.def.noNet) { watching.delete(w); return; }
  NET.checked++;
  if (netSeen(w)) { watching.delete(w); return; }
  F.T.timeout(() => {
    watching.delete(w);
    if (netSeen(w)) return;
    const th = w.th;
    NET.fired++; NET.log.push(th.type); if (NET.log.length > 50) NET.log.shift();
    th.netReacted = true;
    try {
      if (th.obj && th.obj.parent) {
        F.FX.pop(th.obj);
        const b = new THREE.Box3().setFromObject(th.obj), top = new THREE.Vector3((b.min.x + b.max.x) / 2, b.isEmpty() ? th.y + 1 : b.max.y + 0.15, (b.min.z + b.max.z) / 2);
        F.FX.sparkle(top);
      }
      if (F.sfx.sparkle) F.sfx.sparkle(); else if (F.sfx.pop) F.sfx.pop();
    } catch (e) { console.error('press net', th.type, e); }
  }, NET.ms);
}
// sample while presses run (cheap: stops as soon as a change is seen)
F.on('tick', () => { if (!watching.size) return; for (const w of watching) if (!w.seen) netSeen(w); });
// far hiding of chunk things (draw-call budget): the cut follows the zoom (what the camera can see) and the framing pull-back;
// small props (radius < 0.6 m) go earlier – they are a few pixels at that distance anyway. F.Things.FAR = [zoom0, zoom1, zoom2] metres.
F.Things.FAR = [34, 42, 50];
function farCut() {
  const cam = F.R.cam; let f = F.Things.FAR[cam.zoomI] || 45;
  if (cam.frameK > 0.05) f = Math.max(f, 42 + 18 * cam.frameK);      // castle framing pulls the camera back: show a bit further
  if (cam.mode !== 'out') f = Math.max(f, 50);                          // rides / wand / title views: keep the old generous cut
  return f;
}
// per-frame ticks for things near the camera focus
F.on('tick', (dt, t) => {
  const c = F.R.cam.target, sp = F.Space.cur;
  const cut = farCut(), cutS = cut * 0.72;
  for (let i = 0; i < list.length; i++) {
    const th = list[i];
    // hide far outdoor things (draw-call budget)
    if (th.space === 'out' && th.obj && th.zone === 'chunk' && !th.hidden) { const lim = th.radius < 0.6 ? cutS : cut; const far = Math.abs(th.x - c.x) > lim || Math.abs(th.z - c.z) > lim; if (th.obj.visible === far) th.obj.visible = !far; }
    if (!th.def.tick || th.space !== sp) continue;
    if (Math.abs(th.x - c.x) > 60 || Math.abs(th.z - c.z) > 60) continue;
    try { th.def.tick(th, dt, t); } catch (e) { console.error('tick', th.type, e); th.def.tick = null; }
  }
});
})();
