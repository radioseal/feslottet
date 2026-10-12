/* Feslottet – pointer input: tap things (pick boxes 1.3× bbox, else nearest within 40 px), tap ground to fly there,
   hover glow, zoom steps (wheel / + −), Q/E 90° rotation, Space = press nearest within 3 m. No dragging anywhere.
   F.Input.enabled   F.Input.pick(cx,cy) -> {thing, point}   F.Input.pressAt(cx,cy)   F.Input.screenOf(thing)
   v3 (WP4): pick priority – persons (life_actor / def.person) win over decor; def.pickLow things only when nothing else is hit.
   clarity §3.5 (12.10.): a tap on Puff's little clouds flies her to the farthest live cloud (F.HUD.trailSnap); emits 'trailTap'
   {x, z, tap} and 'worldClick' with hit.trail = {x, z}. */
(function () {
'use strict';
const F = window.F;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const I = F.Input = { enabled: true, hover: null, pickHooks: [] };
const box = new THREE.Box3(), tmpV = new THREE.Vector3(), hitV = new THREE.Vector3();
function setNdc(cx, cy) {
  const r = F.R.renderer.domElement.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, F.R.camera);
}
// natural 11.10. (audit D10 #55): the pick box is the thing's REAL body – spray, particles (Points / Sprites / Lines), glow halos and
// see-through or additive effect meshes, hover hulls and parts listed in def.pickIgnore (a fountain's 'jet') never count. (An invisible
// pick volume – a mesh whose material is visible:false, e.g. Fetårnet's cylinder – still counts: it is placed there on purpose.)
const _bm = new THREE.Box3();
function isFx(m, ign) {
  for (let o = m; o; o = o.parent) { if (o.userData && (o.userData.noPick || o.userData.hull || o.userData.isSil)) return true; if (ign && o.name && ign.has(o.name)) return true; if (ign && o.userData && o.userData.partName && ign.has(o.userData.partName)) return true; }
  if (m.isPoints || m.isSprite || m.isLine) return true;
  const mt = m.material; if (!mt || Array.isArray(mt)) return false;
  if (mt.visible === false) return false;
  if (mt.blending === THREE.AdditiveBlending) return true;
  if (mt.vertexColors) return false;      // voxel glass (the statue's wings, windows) is part of the real body (verify round 2)
  return mt.transparent && mt.opacity < 0.6;
}
function bodyBox(th) {
  const o = th.obj, b = new THREE.Box3(), ign = th.def && th.def.pickIgnore ? new Set(th.def.pickIgnore) : null, skip = new Set();
  if (ign && th.parts) for (const k of ign) if (th.parts[k]) skip.add(th.parts[k]);
  o.traverse(m => {
    if (!(m.isMesh || m.isPoints || m.isSprite || m.isLine)) return;
    for (let q = m; q && q !== o; q = q.parent) if (skip.has(q)) return;
    if (isFx(m, ign)) return;
    const g = m.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingBox || g.boundingBox.isEmpty()) return;
    _bm.copy(g.boundingBox).applyMatrix4(m.matrixWorld); b.union(_bm);
  });
  return b;
}
// cached local bbox per thing (recomputed when obj changes scale/size via thing.bboxDirty = true)
function worldBox(th) {
  if (!th._lb || th.bboxDirty) {
    th.bboxDirty = false;
    const o = th.obj; const pos = o.position.clone(), rot = o.rotation.y; o.position.set(0, 0, 0); o.rotation.y = 0; o.updateMatrixWorld(true);
    const b = bodyBox(th); o.position.copy(pos); o.rotation.y = rot; o.updateMatrixWorld(true);
    if (b.isEmpty()) b.set(new THREE.Vector3(-0.4, 0, -0.4), new THREE.Vector3(0.4, 0.8, 0.4));
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).multiplyScalar(0.65);
    s.x = Math.max(s.x, 0.35); s.y = Math.max(s.y, 0.35); s.z = Math.max(s.z, 0.35);
    // rotate-invariant: use max horizontal half-extent
    const hx = Math.max(s.x, s.z);
    th._lb = { c, hx, hy: s.y, hxx: s.x, hzz: s.z };      // hxx/hzz: true local half-extents (oriented pick box, lead w3)
  }
  const l = th._lb;
  box.min.set(th.obj.position.x + l.c.x - l.hx, th.obj.position.y + l.c.y - l.hy, th.obj.position.z + l.c.z - l.hx);
  box.max.set(th.obj.position.x + l.c.x + l.hx, th.obj.position.y + l.c.y + l.hy, th.obj.position.z + l.c.z + l.hx);
  return box;
}
// oriented pick box: transform the ray into the thing's local frame (its yaw) so long things (tables, rows) get a long box,
// not a huge square one that steals taps from characters standing next to them
const _m4 = new THREE.Matrix4(), _lr = new THREE.Ray(), _lb3 = new THREE.Box3(), _hp = new THREE.Vector3();
function hitDist(th) {
  worldBox(th);
  const l = th._lb, o = th.obj;
  _m4.makeRotationY(-o.rotation.y);
  _lr.origin.copy(ray.ray.origin).sub(o.position).applyMatrix4(_m4);
  _lr.direction.copy(ray.ray.direction).applyMatrix4(_m4);
  const hxx = l.hxx != null ? l.hxx : l.hx, hzz = l.hzz != null ? l.hzz : l.hx;   // others may set th._lb themselves (castle railing)
  _lb3.min.set(l.c.x - hxx, l.c.y - l.hy, l.c.z - hzz); _lb3.max.set(l.c.x + hxx, l.c.y + l.hy, l.c.z + hzz);
  const p = _lr.intersectBox(_lb3, _hp);
  return p ? p.distanceTo(_lr.origin) : null;
}
// def.pickable(th) -> false: not tappable right now (the drawbridge while she stands on it: a tap there is a walk)
const pickOK = t => { if (!t.def.pickable) return true; try { return t.def.pickable(t) !== false; } catch (e) { return true; } };
function pressables() {
  const sp = F.Space.cur, c = F.R.cam.target, out = [];
  for (const t of F.Things.list) if (t.space === sp && (t.def.press || t.def.beh) && t.def.hoverable !== false && t.obj && t.obj.visible && !t.hidden && Math.abs(t.x - c.x) < 60 && Math.abs(t.z - c.z) < 60 && pickOK(t)) out.push(t);
  return out;
}
// natural 11.10. (audit D10 #55): a WIDE pick box (> 1.2 m half-width: fountains, houses, the bridge-end posts) only takes the tap when
// the ray really hits the thing's body; a tap through the generous margin (or the gap between two posts) goes to what is behind it –
// usually the ground, so she walks there. Small things keep their generous box (easy to hit for small fingers).
const WIDE = 1.2;
const _rc = new THREE.Raycaster();
// the distance along the current ray to the thing's real body (visible, non-effect meshes), null when the ray misses it; undefined when
// the thing has no such mesh (then it cannot be judged by its body)
// (seen: only what she can see – an invisible pick volume, e.g. a tower's cylinder, does not count; clarity §3.5 cloud taps)
function bodyDist(th, seen) {
  const ign = th.def && th.def.pickIgnore ? new Set(th.def.pickIgnore) : null, skip = new Set();
  if (ign && th.parts) for (const k of ign) if (th.parts[k]) skip.add(th.parts[k]);
  const ms = [];
  th.obj.traverse(m => { if (!m.isMesh || isFx(m, ign)) return; if (seen && m.material && m.material.visible === false) return; for (let q = m; q && q !== th.obj; q = q.parent) if (skip.has(q) || q.visible === false) return; ms.push(m); });
  if (!ms.length) return undefined;
  _rc.ray.copy(ray.ray); _rc.near = 0; _rc.far = Infinity;
  try { const h = _rc.intersectObjects(ms, false)[0]; return h ? h.distance : null; } catch (e) { return undefined; }
}
function hitsBody(th) { return bodyDist(th) !== null; }
I.hitsBody = hitsBody;
const boxVol = t => { const l = t._lb; return l ? (l.hxx != null ? l.hxx : l.hx) * (l.hzz != null ? l.hzz : l.hx) * l.hy : Infinity; };
I.screenOf = function (th) {
  const v = tmpV.set(th.obj ? th.obj.position.x : th.x, (th.obj ? th.obj.position.y : th.y) + 0.6, th.obj ? th.obj.position.z : th.z).project(F.R.camera);
  const r = F.R.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 };
};
// v3 WP4 pick priority (DESIGN3 §3): a person (Thing 'life_actor' or def.person) hit by the ray wins over any non-person hit
// (a chandelier or an occupied throne in front of the king must not swallow the tap); def.pickLow / th.pickLow things (hanging
// decor) are only picked when nothing else is hit (no other box, no near anchor, no pick hook).
const isPerson = t => t.type === 'life_actor' || !!(t.def && t.def.person);
const isLow = t => !!(t.pickLow || (t.def && t.def.pickLow));
const seatOf = p => (p.actor && p.actor.act && p.actor.act.sit ? p.actor.act.tgt : null);
const hangsAbove = (t, p) => { const y0 = worldBox(t).min.y; return y0 > p.obj.position.y + 1.4; };   // (worldBox reuses one Box3: read min.y first)
I.pick = function (cx, cy) {
  setNdc(cx, cy);
  let best = null, bestD = Infinity, person = null, personD = Infinity, low = null, lowD = Infinity;
  const cands = [];
  for (const t of pressables()) {
    const d = hitDist(t);
    if (d == null) continue;
    // (a thing that set its own th._lb – the castle railing – keeps it: only boxes computed here carry hxx)
    if (t._lb && t._lb.hxx != null && Math.max(t._lb.hxx, t._lb.hzz) > WIDE && !isPerson(t) && !hitsBody(t)) continue;
    if (isPerson(t)) { if (d < personD) { personD = d; person = t; } }
    else if (isLow(t)) { if (d < lowD) { lowD = d; low = t; } }
    else { cands.push(t); if (d < bestD) { bestD = d; best = { thing: t, point: ray.ray.at(d, new THREE.Vector3()) }; } }
  }
  // verify round 2 (D10): a small thing that stands ON or IN a bigger one (the kettle on the oven) sits inside the bigger thing's
  // generous box, so the nearest box never was its own. When the ray meets the smaller thing's real body before the bigger thing's body
  // (or the bigger body is not hit at all), the smaller thing takes the tap. A tap that only grazes a small thing's margin is unchanged.
  if (best && cands.length > 1) {
    const bt = best.thing, bv = boxVol(bt); let bd, bdDone = false, won = null, wd = Infinity;
    for (const t of cands) {
      if (t === bt || !(boxVol(t) < bv)) continue;
      const md = bodyDist(t); if (md == null || md >= wd) continue;
      if (!bdDone) { bd = bodyDist(bt); bdDone = true; }
      if (bd === undefined) break;                       // the bigger thing has no body to compare with: it keeps the tap
      if (bd === null || md < bd) { won = t; wd = md; }
    }
    if (won) best = { thing: won, point: ray.ray.at(wd, new THREE.Vector3()) };
  }
  // … unless the nearer thing really stands in front of the person: the person wins when the boxes overlap along the ray (≤ 1.2 m:
  // she stands at a stall, behind a table), when the nearer thing hangs above head height (a chandelier ~4–5 m in front of the
  // seated king) or is the seat the person sits on (a throne). A stall / house well in front of someone keeps its tap.
  if (person && (!best || personD < bestD + 1.2 || hangsAbove(best.thing, person) || seatOf(person) === best.thing)) return { thing: person, point: ray.ray.at(personD, new THREE.Vector3()), person: true };
  // a BIG thing's generous pick box (shops, balloon, houses) must not swallow taps meant for an animal standing beside it:
  // if the box hit is big, let the pick hooks (instanced fauna) answer first (lead, DESIGN2 W1 request)
  if (best && best.thing._lb && best.thing._lb.hx > 1.5) {
    for (const h of I.pickHooks) { let r = null; try { r = h(cx, cy); } catch (e) { console.error('pickHook', e); } if (r) { r.hook = true; r.thing = null; return r; } }
  }
  if (best) return best;
  const lowHit = low ? { thing: low, point: ray.ray.at(lowD, new THREE.Vector3()), low: true } : null;
  // nearest pressable whose screen anchor is within 40 px
  // (not for big things – shops, houses, towers: their pick box is easy to hit, and a ground tap beside them must still fly her)
  let near = null, nd = 40;
  for (const t of pressables()) { if ((t._lb && t._lb.hx > 1.5) || isLow(t)) continue; const s = I.screenOf(t); if (!s.onScreen) continue; const d = Math.hypot(s.x - cx, s.y - cy); if (d < nd) { nd = d; near = t; } }
  if (near && nd < 20) return { thing: near, point: new THREE.Vector3(near.x, near.y, near.z), near: true };
  // DESIGN2 §9.2 pick hooks (e.g. instanced animals that are not things): fn(sx, sy) -> {kind, rec, press?, point?} | null
  for (const h of I.pickHooks) { let r = null; try { r = h(cx, cy); } catch (e) { console.error('pickHook', e); } if (r) { r.hook = true; r.thing = null; return r; } }
  if (lowHit) return lowHit;
  if (near) return { thing: near, point: new THREE.Vector3(near.x, near.y, near.z), near: true };
  // ground
  const grounds = [];
  if (F.Space.cur === 'out') F.W.chunks.forEach(ch => ch.ground && grounds.push(ch.ground));
  if (F.Space.groundMeshes) grounds.push(...F.Space.groundMeshes(F.Space.cur));
  const gh = ray.intersectObjects(grounds, false)[0];
  if (gh) return { thing: null, point: gh.point };
  groundPlane.constant = -F.Player.pos.y;
  const p = new THREE.Vector3(); if (ray.ray.intersectPlane(groundPlane, p)) return { thing: null, point: p };
  return null;
};
const marker = (() => { const b = F.M.builder(); b.torus(0.45, 0.06, 'white', 0, 0.08, 0, { rx: Math.PI / 2, noShadow: true }); b.group.visible = false; return b.group; })();
let markerT = 0;
/* clarity §3.5 (12.10.): Puff's little clouds (F.HUD.follow) are a way she can tap. A ground tap on or near a live cloud flies her to the
   farthest cloud of the newest wave (F.HUD.trailSnap: within 2 m on the ground) – along the way, not one short step (the walkthrough
   needed ~12 taps toward the castle). «Near» is also judged as she SEES it, at any zoom: a tap on a cloud's picture on screen counts
   even where the ground under her finger is a little off (a raised cloud, a slope, a far zoom). A tap that lands on a thing only through
   the generous margin of its pick box or the 40 px «near» help, while her finger is on a cloud, follows the cloud too; an animal, or a
   person's or thing's own body standing in front of the cloud (the cloud is hidden there), keeps the tap. Feature-detected: without
   F.HUD.trailSnap a ground tap is a plain ground tap. */
function cloudsUnder(cx, cy) {
  let L = null; try { L = F.HUD && F.HUD.trailDots ? F.HUD.trailDots() : null; } catch (e) { L = null; }
  if (!L || !L.length) return [];
  const cam = F.R.camera, r = F.R.renderer.domElement.getBoundingClientRect(), tf = Math.tan((cam.fov || 38) * Math.PI / 360), out = [];
  for (const d of L) {
    let gy = F.Player.pos.y; try { gy = F.Space.heightAt(d.x, d.z); } catch (e) { /* no height here */ }
    tmpV.set(d.x, gy + 0.28 + 0.3 * Math.min(1, (d.age || 0) / 2.9), d.z);
    const camD = cam.position.distanceTo(tmpV);
    const v = tmpV.project(cam); if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    const sz = Math.max(0.62, Math.min(2.2, camD * 0.035));                 // the puff's size (hud.js puffDot)
    const rad = Math.max(22, 0.5 * sz * r.height / (2 * camD * tf) + 8);     // its half width on screen + a finger's slack
    const dd = Math.hypot(sx - cx, sy - cy);
    if (dd <= rad) out.push({ x: d.x, z: d.z, dist: camD, px: dd, sz });
  }
  return out.sort((a, b) => a.px - b.px);
}
// the farthest point of the way: trailSnap's dot (the newest wave's farthest), or – when that wave is still being laid out, cloud by
// cloud, and its farthest cloud is only a few metres ahead – the farthest cloud of an earlier live wave (also on the way, further on)
function wayEnd(s) {
  let L = null; try { L = F.HUD.trailDots ? F.HUD.trailDots() : null; } catch (e) { L = null; }
  if (!s || !L || !L.length) return s;
  const P = F.Player.pos, far = new Map();
  for (const d of L) { const f = far.get(d.wave); if (!f || d.i > f.i) far.set(d.wave, d); }
  let best = s, bd = Math.hypot(s.x - P.x, s.z - P.z);
  far.forEach(d => { const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd > bd + 2) { best = { x: d.x, z: d.z }; bd = dd; } });
  return best;
}
function trailDest(cx, cy, hit) {
  const H = F.HUD; if (!H || typeof H.trailSnap !== 'function') return null;
  const snap = (x, z) => { try { const s = H.trailSnap(x, z); return s && s.x != null && s.z != null ? wayEnd(s) : null; } catch (e) { return null; } };
  // (a snap only ever takes her further along than where she tapped – never back to a cloud nearer than her finger)
  const P = F.Player.pos, further = (s, x, z) => (s && Math.hypot(s.x - P.x, s.z - P.z) >= Math.hypot(x - P.x, z - P.z) - 1 ? s : null);
  if (hit.hook) return null;                                         // an animal under her finger keeps the tap
  if (!hit.thing) { const s = further(snap(hit.point.x, hit.point.z), hit.point.x, hit.point.z); if (s) return s; }
  let C = cloudsUnder(cx, cy); if (!C.length) return null;
  if (hit.thing && !(hit.near || hit.low)) {
    // a thing or person whose BODY stands in front of the cloud keeps the tap (the cloud is hidden there); its pick box's margin
    // does not (she sees the cloud and taps it), nor does a pick volume with nothing visible in it (a learning tower's box: the tower
    // she sees is built elsewhere and is narrower than its 4.2 m box)
    setNdc(cx, cy);
    // (a cloud on a bridge deck or a step sits half in it: its upper half still shows – the slack is half the cloud's size)
    const b = bodyDist(hit.thing, true);
    if (b != null) C = C.filter(d => d.dist < b + 0.25 + 0.5 * d.sz);
    if (!C.length) return null;
  }
  return further(snap(C[0].x, C[0].z), C[0].x, C[0].z);
}
// tests: why a tap at (cx, cy) does or does not follow Puff's way
I.trailWhy = function (cx, cy) {
  const hit = I.pick(cx, cy); if (!hit) return null;
  const C = cloudsUnder(cx, cy); let b = null;
  if (hit.thing) { setNdc(cx, cy); b = bodyDist(hit.thing, true); }
  return { thing: hit.thing ? hit.thing.id : null, near: !!hit.near, low: !!hit.low, person: !!hit.person, hook: !!hit.hook, body: b === undefined ? 'none' : b,
    clouds: C.map(d => ({ x: +d.x.toFixed(2), z: +d.z.toFixed(2), dist: +d.dist.toFixed(2), px: Math.round(d.px) })), dest: trailDest(cx, cy, hit) };
};
I.pressAt = function (cx, cy) {
  if (!I.enabled || F.Player.frozen) return null;
  let hit = I.pick(cx, cy);
  if (!hit) return null;
  const way = trailDest(cx, cy, hit);
  if (way) {
    // a tap on Puff's way: a ground tap whose destination is the farthest cloud (the ring shows where she flies when it is in sight)
    const from = hit.thing ? null : hit.point;
    hit = { thing: null, point: from || new THREE.Vector3(way.x, F.Player.pos.y, way.z), trail: { x: way.x, z: way.z } };
    F.emit('worldClick', hit);
    let y = F.Player.pos.y; try { y = F.Space.heightAt(way.x, way.z); } catch (e) { /* keep her height */ }
    const dest = new THREE.Vector3(way.x, y, way.z), s = I.screenOf({ x: way.x, y: y - 0.6, z: way.z });
    F.Space.scene().add(marker);
    marker.position.copy(s.onScreen ? dest : hit.point); marker.visible = true; markerT = 0.9;
    F.Player.goTo(way.x, way.z);
    F.emit('trailTap', { x: way.x, z: way.z, tap: { x: hit.point.x, z: hit.point.z } });
    return hit;
  }
  F.emit('worldClick', hit);
  if (hit.thing) { F.sfx.click(); I.flash(hit.thing); F.Player.goPress(hit.thing); }
  else if (hit.hook) { F.sfx.click(); if (hit.press) { try { hit.press(hit); } catch (e) { console.error('pickHook press', e); } } F.emit('hookPress', hit); }
  else {
    F.Space.scene().add(marker);
    marker.position.copy(hit.point); marker.visible = true; markerT = 0.9;
    F.Player.goTo(hit.point.x, hit.point.z);
  }
  return hit;
};
I.pressNearest = function (maxD = 3) {
  if (!I.enabled || F.Player.frozen) return null;
  let best = null, bd = maxD;
  for (const t of pressables()) { const d = Math.hypot(t.x - F.Player.pos.x, t.z - F.Player.pos.z) - t.radius; if (d < bd) { bd = d; best = t; } }
  if (best) F.Player.goPress(best);
  return best;
};
let downAt = null, wheelAcc = 0, wheelT = 0;
function attach(cv) {
  cv.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointermove', e => {
    if (!I.enabled) { cv.style.cursor = ''; return; }
    const hit = I.pick(e.clientX, e.clientY);
    const th = hit && hit.thing;
    if (th !== I.hover) { I.hover = th; F.emit('hover', th); }
    cv.style.cursor = (th || (hit && hit.hook)) ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerup', e => {
    if (downAt && e.button === 0 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 30) I.pressAt(e.clientX, e.clientY);
    downAt = null;
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    wheelAcc += e.deltaY; const now = performance.now();
    if (Math.abs(wheelAcc) > 60 && now - wheelT > 250) { F.R.zoomStep(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelT = now; }
  }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
}
// block browser page zoom (ctrl+wheel / pinch) so the page itself never zooms
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
I.attach = function () { attach(F.R.renderer.domElement); F.R.scene.add(marker); };
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return;
  if (F.UI && F.UI.keyCapture && F.UI.keyCapture.onKey && /^Key|^Digit|^Backspace|^Enter|^Space|^Minus|^Equal/.test(e.code)) return;   // a widget is typing
  if (e.code === 'KeyQ') F.R.rotateStep(1);
  else if (e.code === 'KeyE') F.R.rotateStep(-1);
  else if (e.key === '+' || e.code === 'Equal') F.R.zoomStep(-1);
  else if (e.key === '-' || e.code === 'Minus') F.R.zoomStep(1);
  else if (e.code === 'Space') { e.preventDefault(); I.pressNearest(3); }
});
/* hover feedback: a soft pale-gold rim (inverted hull: each mesh's geometry drawn again with BackSide, scaled out from its centre by a
   screen-constant ~3 px) that gently pulses, plus a light warm tint. I.outline(thing, on) is also used to flash the thing she just
   tapped (I.flash(thing, ms)). Hulls never raycast, never cast shadows and share one material. */
const HULL_MAT = new THREE.MeshBasicMaterial({ color: 0xffd45a, side: THREE.BackSide, transparent: true, opacity: 0.95, depthWrite: false, fog: false });
const hulls = new Map();          // thing -> [hull meshes]
const _hb = new THREE.Vector3(), _hs = new THREE.Vector3();
I.outline = function (th, on) {
  if (!on) { const L = hulls.get(th); if (!L) return; hulls.delete(th); L.forEach(h => { if (h.parent) { h.parent.userData.nHull = Math.max(0, (h.parent.userData.nHull || 1) - 1); h.parent.remove(h); } }); return; }
  if (!th || !th.obj || hulls.has(th)) return;
  const d = F.R.camera.position.distanceTo(th.obj.getWorldPosition(_hb));
  const t = F.U.clamp(d * 0.0042, 0.035, 0.18);           // rim thickness in metres ≈ constant on screen (~4 px)
  const L = []; let n = 0;
  th.obj.updateMatrixWorld(true);
  th.obj.traverse(m => {
    if (!m.isMesh || m.isInstancedMesh || !m.geometry || !m.visible || m.userData.isSil || m.userData.hull || n >= 80) return;
    const mt = m.material; if (!mt || Array.isArray(mt) || (mt.transparent && mt.opacity < 0.9) || mt.blending === THREE.AdditiveBlending) return;
    const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); if (g.boundingBox.isEmpty()) return;
    const sz = g.boundingBox.getSize(_hs), c = g.boundingBox.getCenter(_hb);
    const e = m.matrixWorld.elements, ws = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]) || 1, tl = t / ws;
    const h = new THREE.Mesh(g, HULL_MAT);
    h.scale.set(1 + 2 * tl / Math.max(sz.x, 0.02), 1 + 2 * tl / Math.max(sz.y, 0.02), 1 + 2 * tl / Math.max(sz.z, 0.02));
    h.position.set(c.x * (1 - h.scale.x), c.y * (1 - h.scale.y), c.z * (1 - h.scale.z));
    h.userData.hull = true; h.castShadow = false; h.receiveShadow = false; h.raycast = () => {}; h.renderOrder = 1;
    m.add(h); m.userData.nHull = (m.userData.nHull || 0) + 1; L.push(h); n++;
  });
  hulls.set(th, L);
};
let flashT = null, flashTh = null;
I.flash = function (th, ms = 650) {
  if (!th || !th.obj) return;
  if (flashTh && flashTh !== th && flashTh !== I.hover) I.outline(flashTh, false);
  flashTh = th; I.outline(th, true);
  if (flashT) F.T.clear(flashT);
  flashT = F.T.timeout(() => { if (flashTh && flashTh !== I.hover) I.outline(flashTh, false); flashTh = null; flashT = null; }, ms);
};
let glowList = [];
F.on('hover', th => {
  glowList.forEach(([m, orig]) => { if (m.material !== orig) m.material.dispose(); m.material = orig; }); glowList = [];
  hulls.forEach((L, t) => { if (t !== th && t !== flashTh) I.outline(t, false); });
  if (!th || !th.obj) return;
  I.outline(th, true);
  th.obj.traverse(m => {
    if (!m.isMesh || m.userData.hull || !m.material || !m.material.emissive) return;
    const cl = m.material.clone(); cl.emissive = new THREE.Color(0xfff2c0); cl.emissiveIntensity = 0.18;
    glowList.push([m, m.material]); m.material = cl;
  });
});
F.on('tick', (dt, t) => { if (hulls.size) HULL_MAT.opacity = 0.72 + 0.26 * (0.5 + 0.5 * Math.sin((t || 0) * 5)); });
F.on('spaceChanged', () => { glowList.forEach(([m, orig]) => { m.material = orig; }); glowList = []; [...hulls.keys()].forEach(t => I.outline(t, false)); flashTh = null; marker.visible = false; });
F.on('tick', dt => { if (markerT > 0) { markerT -= dt; marker.scale.setScalar(1 + (0.9 - markerT)); if (markerT <= 0) marker.visible = false; } });
})();
