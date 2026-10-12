/* Feslottet – WP10 SHELL: travel (DESIGN2 §2.1, §2.8.6, §3.6, §9.2). The only outdoor jumps besides a door crossing:
   map fast travel and bedtime «Vi flyr hjem» are a ≤ 4 s CLOUD RIDE (no teleport flash):
     1. input frozen, Puff's line; Puff (the HUD cloud) flies to her and shrinks into a puffy 3D cloud that swells under her – the cloud
        has Puff's face – and lifts her ~3.5 m (0.38 s swell + 0.9 s lift), the camera rises with her;
     2. a sky dip: blue sky with clouds drifting past (≈ 0.8 s); meanwhile she leaves any building, is moved, the chunks load;
     3. the sky clears above the arrival spot and the cloud sets her down, then poofs and Puff flies back to its corner (0.35 s).
        Total ≈ 3.0 s game time (+ chunk build time).
   F.Travel = { toRealm(id) -> Promise<bool>, toHome({bedtime}) -> Promise<bool>, toCastle() -> Promise<bool>, canFast(id) -> bool,
                to({x, z, heading?, line?, slots?}) -> Promise<bool>, ride(fn, o) -> Promise, busy, lastMs,
                offer(target) -> Promise<bool>, offering, take() -> Promise<bool>, cancelOffer(why) }
   clarity plan 12.10. §3.4 (owner «travel»): Puff's ride offer. F.HUD's Puff answer for a far goal at a place she has been
   (F.Map.canRide) calls TV.offer(target): the HUD Puff element flies (450 ms) to just under her screen point and becomes the tap
   target; TV.offering = the target while it waits there. Her tap on Puff (hud.js puffPress → TV.take()) rides – the same ride the map
   gives (F.Map.rideTo: toRealm / toHome / toCastle / to), with no second line (Puff already said «Hopp på, så flyr vi!»). Anything else
   cancels and Puff flies back silently: a tap anywhere else, her moving > 3 m, a task / panel / map / wand / scene / screen, a space
   change, or 10 s. While it waits Puff gives two small silent hops (3.5 s, 7 s), and it never sits on a HUD button (at the front of a
   room, right above the wand, it moves up a little – she stands in it – or aside). The promise resolves true when the ride ran, false
   when the offer ended without one. The map rides and the bedtime ride use the same Puff-into-the-cloud visual, with no offer step.
   Fast travel is free and only to kingdoms she has FOUND (walked to herself once): F.Realm.state ∈ found|friend. Other kingdoms:
   «Fly mot lyset, så finner du det!». Home = the Fetårnet doorstep (F.Tower.outside); with {bedtime:true} she lands on the cloud bed
   (F.Tower.toBed inside the sky dip). Events: travelStart(kind, id) travelEnd(kind, id, ok), rideOffer(target), rideOfferEnd(why)
   (why ∈ ride|tap|move|time|task|panel|map|wand|scene|screen|hud|space|look|ride-busy|cancel). Debug (ready): F.dbg.travel(id|'home'). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sayF = (id, slots) => (F.TPL && F.TPL.has && F.TPL.has(id) ? F.SAYF(id, slots || {}) : Promise.resolve(false));
const sfx = (n, ...a) => { try { if (F.sfx && F.sfx[n]) F.sfx[n](...a); } catch (e) { /* audio is optional */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RISE = 3.5;            // the ride's height (m)
const SWELL = 0.8;           // the swelling cloud already lifts her this much, so its face is seen above the ground
const SZ = 1.4;              // the cloud is Puff: 1.4× the old ride cloud
const CLOUD_Y = -0.42;       // the cloud's centre under her feet (she sits a little in it)
const OFFER_SEC = 10, OFFER_MOVE = 3;
const TV = F.Travel = { busy: false, lastMs: 0, RISE, offering: null };

/* ------------------------------------------------------------ the cloud under her: Puff (soft white puffs + Puff's face) */
let cloud = null;
function makeCloud() {
  const g = new THREE.Group(); g.name = 'travelCloud';
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xdfe9ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.97 });
  const noRay = m => { m.castShadow = false; m.receiveShadow = false; m.raycast = () => {}; return m; };
  // +z = toward the camera (the whole cloud turns to face the camera each frame, so the face is always seen)
  [[0, 0, 0, 0.95], [0.85, 0.05, 0.1, 0.7], [-0.85, 0.02, 0.1, 0.72], [0.35, 0.25, -0.55, 0.62], [-0.4, 0.2, -0.5, 0.6], [0, -0.05, 0.62, 0.62]].forEach(([x, y, z, r]) => {
    const m = noRay(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat)); m.position.set(x, y, z); m.scale.y = 0.62; g.add(m);
  });
  // the face on the front puff, tilted up toward the camera (the play camera looks down ≈ 50°)
  const face = new THREE.Group(); face.name = 'puffFace'; face.position.set(0, -0.05, 0.62); face.rotation.x = -0.5; g.add(face);
  const ink = new THREE.MeshBasicMaterial({ color: 0x3b2f5c }), glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blush = new THREE.MeshBasicMaterial({ color: 0xffb3cf, transparent: true, opacity: 0.85, depthWrite: false });
  [-1, 1].forEach(s => {
    const eye = noRay(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), ink)); eye.scale.set(1, 1.3, 0.55); eye.position.set(s * 0.17, 0.06, 0.53); face.add(eye);
    const gl = noRay(new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), glint)); gl.position.set(s * 0.17 + 0.025, 0.1, 0.575); face.add(gl);
    const bl = noRay(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), blush)); bl.scale.set(1.15, 0.62, 0.25); bl.position.set(s * 0.33, -0.06, 0.47); bl.rotation.y = s * 0.55; face.add(bl);
  });
  const smile = noRay(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 14, Math.PI), ink)); smile.rotation.z = Math.PI; smile.position.set(0, -0.04, 0.55); face.add(smile);
  return g;
}
function cloudOn(on) {
  const P = F.Player;
  if (on) { if (!cloud) cloud = makeCloud(); cloud.scale.setScalar(0.01); cloud.position.set(0, CLOUD_Y, 0); faceCam(); if (cloud.parent !== P.obj) P.obj.add(cloud); }
  else if (cloud && cloud.parent) cloud.parent.remove(cloud);
}
// the cloud (and Puff's face on it) turns to the camera: she rides Puff, and Puff looks at the player
function faceCam() {
  const c = F.R && F.R.camera, P = F.Player;
  if (!cloud || !c || !P || !P.obj) return;
  cloud.rotation.y = Math.atan2(c.position.x - P.pos.x, c.position.z - P.pos.z) - (P.obj.rotation.y || 0);
}
const lift = h => { const a = F.Player.avatar; if (a) a.position.y = h; if (cloud) cloud.position.y = h + CLOUD_Y; };

/* ------------------------------------------------------------ the sky dip overlay (blue sky + drifting clouds) */
let sky = null;
function skyEl() {
  if (sky) return sky;
  sky = document.createElement('div'); sky.className = 'trav-sky';
  const puff = (l, t, s, d) => `<div class="trav-c" style="left:${l}%;top:${t}%;--s:${s};animation-delay:${d}s"><i></i><i></i><i></i></div>`;
  sky.innerHTML = puff(70, 14, 1.3, 0) + puff(30, 34, 1.0, -0.4) + puff(85, 58, 1.5, -0.2) + puff(10, 70, 1.1, -0.6) + puff(50, 82, 0.9, -0.1) + '<div class="trav-fe"></div>';
  document.body.appendChild(sky);
  return sky;
}
const tween = (ms, fn) => (F.T.tween ? F.T.tween(ms, fn) : (fn(1), Promise.resolve()));

/* ------------------------------------------------------------ Puff, the HUD element (F.HUD.puff), flies to her (clarity §3.4)
   Driven per frame (preRender) in game time with an inline transform; the element's own place (#hud, bottom right) never changes.
   modes: home (no inline style) · fly (to under her) · under (waits under her, follows her screen point) · in (shrinks into the
   ride cloud) · back (flies home). */
const PU = { mode: 'home', cur: null, anim: null, base: null, baseT: -1e9 };
function puffEl() { const e = F.HUD && F.HUD.puff; return e && e.isConnected ? e : null; }
// the element's own centre (client px) without our transform: offsetLeft/Top ignore transforms
function puffBase(e) {
  const now = performance.now();
  if (PU.base && now - PU.baseT < 400) return PU.base;
  const par = e.offsetParent, pr = par ? par.getBoundingClientRect() : { left: 0, top: 0 };
  PU.base = { x: pr.left + e.offsetLeft + e.offsetWidth / 2, y: pr.top + e.offsetTop + e.offsetHeight / 2, w: e.offsetWidth, h: e.offsetHeight };
  PU.baseT = now;
  return PU.base;
}
// her feet (plus dy metres) on screen, client px; null when behind the camera
const tmpV = new THREE.Vector3();
function herPt(dy) {
  const P = F.Player, c = F.R && F.R.camera, cv = F.R && F.R.renderer && F.R.renderer.domElement;
  if (!P || !c || !cv) return null;
  const a = P.avatar, ay = a ? a.position.y : 0;
  tmpV.set(P.pos.x, P.pos.y + ay + (dy || 0), P.pos.z).project(c);
  if (tmpV.z > 1) return null;
  const r = cv.getBoundingClientRect();
  return { x: r.left + (tmpV.x + 1) / 2 * r.width, y: r.top + (1 - tmpV.y) / 2 * r.height };
}
// the HUD's visible buttons (wand, UT, purse, goal card, map, album …) Puff must never sit on: client rects, re-read every 300 ms
const OB = { t: -1e9, r: [] }, OB_GAP = 6;
function hudObstacles(e) {
  const now = performance.now(); if (now - OB.t < 300) return OB.r;
  OB.t = now; OB.r = [];
  try {
    document.querySelectorAll('#hud .hud-btn, .bld-ut.on, .hud-place.on').forEach(o => {
      if (o === e || e.contains(o) || o.contains(e)) return;
      const q = o.getBoundingClientRect(); if (q.width < 4 || q.height < 4) return;
      const cs = getComputedStyle(o); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
      OB.r.push({ l: q.left - OB_GAP, t: q.top - OB_GAP, r: q.right + OB_GAP, b: q.bottom + OB_GAP });
    });
  } catch (err) { OB.r = []; }
  return OB.r;
}
const hitOf = (p, b, obs) => obs.find(o => p.x - b.w / 2 < o.r && p.x + b.w / 2 > o.l && p.y - b.h / 2 < o.b && p.y + b.h / 2 > o.t) || null;
// the nearest spot to p (on screen) that keeps Puff off every HUD button: pushed up / left / right / down out of what it hits (two
// rounds, for a corner of two buttons); going up costs a little more (Puff then hides more of her). None clear → p.
function offHud(e, p, b, fit) {
  const obs = hudObstacles(e); if (!obs.length || !hitOf(p, b, obs)) return p;
  let best = null, bestC = 1e9, layer = [p];
  for (let round = 0; round < 2 && layer.length; round++) {
    const next = [];
    for (const q of layer) {
      const o = hitOf(q, b, obs); if (!o) continue;
      for (const c of [{ x: q.x, y: o.t - b.h / 2 }, { x: q.x, y: o.b + b.h / 2 }, { x: o.l - b.w / 2, y: q.y }, { x: o.r + b.w / 2, y: q.y }]) {
        const f = fit(c); if (Math.abs(f.x - c.x) > 0.5 || Math.abs(f.y - c.y) > 0.5) continue;   // off screen
        const cost = Math.abs(f.x - p.x) + Math.max(0, p.y - f.y) * 1.3 + Math.max(0, f.y - p.y);
        if (hitOf(f, b, obs)) { next.push(f); continue; }
        if (cost < bestC) { bestC = cost; best = f; }
      }
    }
    if (best) return best;
    layer = next;
  }
  return p;
}
// where Puff waits: its top just under her feet (she seems to stand on it), kept fully on screen and off the HUD buttons
function underPt(e) {
  const h = herPt(0); if (!h) return PU.cur ? { x: PU.cur.x, y: PU.cur.y } : null;
  const b = puffBase(e), m = 8;
  const fit = q => ({ x: clamp(q.x, b.w / 2 + m, innerWidth - b.w / 2 - m), y: clamp(q.y, b.h / 2 + m, innerHeight - b.h / 2 - m) });
  return offHud(e, fit({ x: h.x, y: h.y + b.h * 0.3 }), b, fit);
}
const feetPt = () => herPt(0);
const homePt = e => { const b = puffBase(e); return { x: b.x, y: b.y }; };
function paint(e, c) {
  const b = puffBase(e);
  e.style.transform = `translate(${(c.x - b.x).toFixed(1)}px, ${(c.y - b.y).toFixed(1)}px) scale(${c.s.toFixed(3)})`;
  e.style.opacity = c.o >= 0.999 ? '' : c.o.toFixed(3);
}
function release(e) {
  PU.mode = 'home'; PU.cur = null; PU.anim = null;
  if (!e) return;
  // (no css transition back: the element is already home; flush the style before hud.css's own transition returns)
  e.style.transition = 'none'; e.style.transform = ''; e.style.opacity = ''; e.style.pointerEvents = '';
  void e.offsetWidth; e.style.transition = '';
  e.classList.remove('trav-offer');
}
// animate from where Puff is now to `to` (a point or a fn(e) → point, re-read every frame), scale s1, opacity o1, with a small arc
function animTo(mode, to, ms, s1, o1, arc, then) {
  const e = puffEl(); if (!e) { PU.mode = mode; if (then) then(); return; }
  const b = puffBase(e);
  const from = PU.cur ? Object.assign({}, PU.cur) : { x: b.x, y: b.y, s: 1, o: 1 };
  e.style.transition = 'none';
  PU.mode = mode; PU.cur = from;
  PU.anim = { t0: F.T.now, d: Math.max(0.001, ms / 1000), from, to, s1, o1, arc: arc || 0, then };
  drive(0);
}
const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const bump = (t, at, d) => (t > at && t < at + d ? Math.sin((t - at) / d * Math.PI) : 0);
function drive(dt) {
  faceCam();
  const e = puffEl();
  if (!e) return;
  const A = PU.anim;
  if (A) {
    const k = clamp((F.T.now - A.t0) / A.d, 0, 1), q = easeIO(k);
    const tp = (typeof A.to === 'function' ? A.to(e) : A.to) || { x: A.from.x, y: A.from.y };
    const c = { x: A.from.x + (tp.x - A.from.x) * q, y: A.from.y + (tp.y - A.from.y) * q - Math.sin(k * Math.PI) * A.arc, s: A.from.s + (A.s1 - A.from.s) * q, o: A.from.o + (A.o1 - A.from.o) * q };
    PU.cur = c; paint(e, c);
    if (k >= 1) { PU.anim = null; const fn = A.then; if (fn) fn(); }
    return;
  }
  if (PU.mode === 'under' && offer) {
    const tp = underPt(e); if (!tp) return;
    const c = PU.cur || { x: tp.x, y: tp.y, s: 1, o: 1 }, f = Math.min(1, (dt || 0) * 14 + 0.2);
    c.x += (tp.x - c.x) * f; c.y += (tp.y - c.y) * f; c.s = 1; c.o = 1; PU.cur = c;
    // two small silent hops while she waits (an invitation, no words)
    const w = F.T.now - offer.settled, hop = offer.settled ? bump(w, 3.5, 0.45) + bump(w, 7, 0.45) : 0;
    paint(e, { x: c.x, y: c.y - hop * 10, s: 1 + hop * 0.1, o: 1 });
  }
}
F.on('preRender', dt => { if (PU.mode !== 'home' || PU.anim || (cloud && cloud.parent)) { try { drive(dt); } catch (err) { console.error('[travel] puff', err); } } });
addEventListener('resize', () => { PU.baseT = -1e9; });
// the ride: Puff flies to her feet and shrinks into the swelling cloud (from under her after an offer, else from its corner)
function puffInto() {
  const e = puffEl(); if (!e) return;
  e.style.pointerEvents = 'none';                                 // a second tap during the ride never lands on Puff
  animTo('in', feetPt, PU.mode === 'under' ? 360 : 380, 0.25, 0, PU.mode === 'under' ? 0 : 40, null);
}
// the poof: Puff pops out of the cloud at her feet and flies home (350 ms)
function puffOut() {
  const e = puffEl(); if (!e) { PU.mode = 'home'; return; }
  const h = feetPt() || homePt(e);
  PU.cur = { x: h.x, y: h.y, s: 0.4, o: 1 };
  animTo('back', homePt, 350, 1, 1, 30, () => release(puffEl()));
}
function puffBack() {
  const e = puffEl(); if (!e) { PU.mode = 'home'; return; }
  e.style.pointerEvents = '';
  animTo('back', homePt, 350, 1, 1, 30, () => release(puffEl()));
}

/* ------------------------------------------------------------ the ride */
let quietRide = false;       // a ride taken from Puff's offer: Puff already said «Hopp på, så flyr vi!»
// fn runs while the sky covers the screen (leave buildings, move, load). Resolves true when the ride ran.
TV.ride = async function (fn, o) {
  o = o || {};
  if (TV.busy) return false;
  const line = quietRide ? null : o.line;
  if (offer) endOffer('ride-busy');
  TV.busy = true;
  const t0 = performance.now(), g0 = F.T.now, P = F.Player;
  const wasFrozen = P.frozen, wasInput = F.Input.enabled;
  P.stop(); P.frozen = true; F.Input.enabled = false;
  F.emit('travelStart', o.kind || 'to', o.id || null);
  let ok = true;
  try {
    if (F.Map && F.Map.isOpen && F.Map.close) F.Map.close();
    if (line) sayF(line, o.slots);
    // 1. Puff shrinks into the cloud that swells under her (outdoors and indoors alike) and lifts her
    cloudOn(true); sfx('whoosh'); puffInto();
    const focus = V3(P.pos.x, P.pos.y, P.pos.z);
    const outCam = F.R.cam.mode === 'out';
    if (outCam) F.R.cam.focus = focus;
    await tween(380, k => { const e = 1 - (1 - k) * (1 - k); if (cloud) cloud.scale.setScalar(SZ * (0.01 + k * 0.99)); lift(e * SWELL); focus.y = P.pos.y + e * SWELL * 0.7; });
    await tween(900, k => { const h = SWELL + k * k * (RISE - SWELL); lift(h); focus.y = P.pos.y + h * 0.7; });
    // 2. the sky dip: clouds drift past while she is moved
    const s = skyEl(); s.classList.remove('out'); void s.offsetWidth; s.classList.add('on'); sfx('magic');
    await F.T.sleep(330);
    const f0 = performance.now();
    try { await fn(); } catch (e) { ok = false; console.error('[travel] move', e); }
    TV.lastMoveMs = Math.round(performance.now() - f0);          // the synchronous move + chunk build (hidden by the sky)
    if (F.R.cam.focus === focus) F.R.cam.focus = null;
    lift(RISE);
    await F.T.sleep(450);
    // 3. the sky clears above the arrival, the cloud sets her down, poofs, and Puff flies back to its corner
    const f2 = V3(P.pos.x, P.pos.y + RISE * 0.7, P.pos.z);
    if (F.R.cam.mode === 'out') { F.R.cam.focus = f2; F.R.cam.target.copy(f2); }
    s.classList.add('out'); s.classList.remove('on');
    const LAND = SWELL * 0.6;
    await tween(760, k => { const e = 1 - (1 - k) * (1 - k); const h = LAND + (1 - e) * (RISE - LAND); lift(h); f2.y = P.pos.y + h * 0.7; });
    if (F.R.cam.focus === f2) F.R.cam.focus = null;
    sfx('pop');
    try { if (F.FX && F.FX.burst) F.FX.burst(V3(P.pos.x, P.pos.y + 0.3, P.pos.z), { n: 16, colors: [0xffffff, 0xeaf4ff, 0xfff6c0], speed: 1.1, up: 0.6, life: 0.9, size: 0.2, gravity: 0.1 }); } catch (e) { /* fx optional */ }
    puffOut();
    await tween(220, k => { if (cloud) cloud.scale.setScalar(SZ * (1 - k * 0.99)); lift(LAND * (1 - k)); });
  } catch (e) { ok = false; console.error('[travel] ride', e); }
  cloudOn(false); lift(0);
  if (PU.mode === 'in') puffOut();                                // (a ride that broke off before the poof)
  if (F.R.cam.focus && F.R.cam.focus.isVector3 && !F.Task.current) F.R.cam.focus = null;
  if (sky) { sky.classList.remove('on'); F.T.timeout(() => sky && sky.classList.remove('out'), 400); }
  // she can move again (a task that started meanwhile, e.g. a royal greeting, keeps her in place as usual)
  P.frozen = !!(F.Task && F.Task.current); F.Input.enabled = true; void wasFrozen; void wasInput;
  TV.lastMs = Math.round(performance.now() - t0); TV.lastSec = +(F.T.now - g0).toFixed(2);
  TV.busy = false;
  F.emit('travelEnd', o.kind || 'to', o.id || null, ok);
  return ok;
};

/* ------------------------------------------------------------ Puff's ride offer (clarity §3.4.1) */
let offer = null;            // { target, ride (the target the ride goes by), t0, settled, x, z, space, look0, res, promise }
// what stops an offer: at the offer itself (look0 === undefined) a running camera glance does not count – her tap ends a glance anyway
function offerBlocked(look0) {
  if (TV.busy) return 'ride-busy';
  if (F.Task && F.Task.current) return 'task';
  if (F.Map && F.Map.isOpen) return 'map';
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return 'panel';
  if (F.Shell && F.Shell.screen) return 'screen';
  if (F.HUD && F.HUD.hidden) return 'hud';
  if (document.body.classList.contains('wand-open')) return 'wand';
  try { if (F.HUD && F.HUD.scene && F.HUD.scene()) return 'scene'; } catch (e) { /* partial boot */ }
  const L = F.R && F.R.cam && F.R.cam.look;
  if (L && look0 !== undefined && L !== look0) return 'look';      // a new glance (a ceremony) began while Puff waited
  return null;
}
// where the ride would set her down (the map's rule, F.Map.rideOf), and whether that brings her to the goal at all
function landingOf(t) {
  let r = null; try { r = F.Map && typeof F.Map.rideOf === 'function' ? F.Map.rideOf(t) : null; } catch (e) { r = null; }
  if (!r) return null;
  if (r.kind === 'realm') return TV.arrival(r.id);
  if (r.kind === 'home' && r.x == null) return TV.homeSpot();
  if (r.kind === 'castle' && r.x == null) { const g = (F.Castle && F.Castle.gatePos && F.Castle.gatePos()) || { x: 0, z: 30.5 }; return { x: g.x, z: g.z + 1 }; }
  return r.x != null ? { x: r.x, z: r.z } : null;
}
// a ride that sets her down far from the goal (e.g. a royal quest whose step lies outside its kingdom: the map would land her at the
// kingdom's gate) is no help: no offer (she would land, still be far, and Puff would offer the same ride again)
function rideUseful(t) {
  const L = landingOf(t); if (!L) return true;
  let o = null; try { o = F.Quest && F.Quest.outdoorOf ? F.Quest.outdoorOf(t) : null; } catch (e) { o = null; }
  if (!o && (t.space || 'out') === 'out' && t.x != null) o = { x: t.x, z: t.z };
  if (!o || !isFinite(o.x) || !isFinite(o.z)) return true;
  const dL = Math.hypot(L.x - o.x, L.z - o.z);
  if (dL < 150) return true;
  if (F.Space.cur !== 'out') return false;
  const P = F.Player.pos;
  return dL < Math.hypot(P.x - o.x, P.z - o.z) * 0.5;
}
TV.rideUseful = rideUseful;
// the ride for a goal target: the map's rule (F.Map.canRide / rideOf) when it brings her to the goal; a royal quest's step can carry
// its kingdom's tag although it lies elsewhere (RQ1: a step by Fetårnet) – then the ride goes by the step's own place
function canRideT(t) { try { return F.Map && typeof F.Map.canRide === 'function' ? !!F.Map.canRide(t) : true; } catch (e) { return false; } }
function rideFor(t) {
  if (!t || typeof t !== 'object') return null;
  let u = false;
  if (canRideT(t)) { try { u = rideUseful(t); } catch (e) { u = true; } if (u) return t; }
  if (t.realm && t.x != null) {
    let at = null; try { at = F.Realm && F.Realm.at ? F.Realm.at(t.x, t.z) : null; } catch (e) { at = null; }
    if (at !== t.realm) { const t2 = Object.assign({}, t, { realm: at || null }); if (canRideT(t2)) { try { u = rideUseful(t2); } catch (e) { u = false; } if (u) return t2; } }
  }
  return null;
}
TV.rideFor = rideFor;
function endOffer(why) {
  if (!offer) return null;
  const o = offer; offer = null; TV.offering = null; down = null;
  F.emit('rideOfferEnd', why);
  if (why !== 'ride') { if (!TV.busy) puffBack(); o.res(false); }
  return o;
}
TV.offer = function (target) {
  if (!target || typeof target !== 'object' || TV.busy) return Promise.resolve(false);
  if (!puffEl() || offerBlocked()) return Promise.resolve(false);
  const ride = rideFor(target);
  if (!ride) return Promise.resolve(false);                       // not a place she has been, or a ride that would not help
  if (offer) { offer.target = target; offer.ride = ride; offer.t0 = F.T.now; offer.settled = PU.mode === 'under' ? F.T.now : 0; return offer.promise; }   // asked again: the clock restarts
  const P = F.Player;
  if (P.stop) P.stop();                                           // she turned to Puff: her walk ends here
  let res = null; const promise = new Promise(r => { res = r; });
  offer = { target, ride, t0: F.T.now, settled: 0, x: P.pos.x, z: P.pos.z, space: F.Space.cur, look0: (F.R && F.R.cam && F.R.cam.look) || null, res, promise };
  TV.offering = target;
  const e = puffEl(); e.classList.add('trav-offer'); e.style.pointerEvents = '';
  animTo('fly', underPt, 450, 1, 1, 46, () => { if (offer) { PU.mode = 'under'; offer.settled = F.T.now; } });
  F.emit('rideOffer', target);
  return promise;
};
// her tap on Puff (hud.js puffPress while TV.offering): the ride, the same one the map gives
function rideTarget(t) {
  if (F.Map && typeof F.Map.rideTo === 'function') return F.Map.rideTo(t);
  if (t.realm) return TV.toRealm(t.realm);
  if (t.bld === 'slott') return TV.toCastle();
  if (t.bld === 'tarn' || (t.home && t.x == null)) return TV.toHome();
  const o = F.Quest && F.Quest.outdoorOf ? F.Quest.outdoorOf(t) : (t.x != null ? { x: t.x, z: t.z } : null);
  return o ? TV.to({ x: o.x, z: o.z + 4, kind: 'place' }) : Promise.resolve(false);
}
TV.take = function () {
  if (!offer || TV.busy) return Promise.resolve(false);
  const o = endOffer('ride');
  let p = null;
  quietRide = true;
  try { p = rideTarget(o.ride || o.target); } catch (e) { console.error('[travel] take', e); p = null; } finally { quietRide = false; }
  if (!TV.busy) puffBack();                                       // (no ride started after all: Puff goes home)
  const done = Promise.resolve(p).then(v => !!v, e => { console.error('[travel] take', e); return false; });
  done.then(v => o.res(v));
  return done;
};
TV.cancelOffer = why => !!endOffer(why || 'cancel');
TV.offerBlocked = offerBlocked;
// anything else cancels: a tap (not a camera drag) anywhere but on Puff
let down = null;
addEventListener('pointerdown', e => {
  if (!offer) return;
  const pe = puffEl();
  down = pe && e.target && pe.contains(e.target) ? null : { x: e.clientX, y: e.clientY };
}, true);
addEventListener('pointerup', e => {
  if (!offer || !down) return;
  const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (d < 30) endOffer('tap');
}, true);
F.on('tick', () => {
  if (!offer) return;
  const P = F.Player.pos;
  const why = offerBlocked(offer.look0) || (F.Space.cur !== offer.space ? 'space' : null) ||
    (Math.hypot(P.x - offer.x, P.z - offer.z) > OFFER_MOVE ? 'move' : null) || (F.T.now - offer.t0 > OFFER_SEC ? 'time' : null);
  if (why) endOffer(why);
});
F.on('taskStart', () => endOffer('task'));
F.on('spaceChanged', () => endOffer('space'));

/* ------------------------------------------------------------ moving her (inside the sky dip) */
async function leaveBuilding() {
  if (F.Space.cur !== 'in') return;
  if (F.Bld && F.Bld.cur && F.Bld.leave) { try { await F.Bld.leave({ instant: true }); } catch (e) { console.error('[travel] leave', e); } }
  if (F.Space.cur === 'in') F.Space.set('out', { x: 0, z: 30.5 });
}
function freeSpot(x, z) {
  const ok = (a, b) => !F.Space.blocked(a, b, 0.5) && !(F.W.water && F.W.water(a, b));
  if (ok(x, z)) return { x, z };
  for (let r = 1.5; r <= 16; r += 1.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (ok(px, pz)) return { x: px, z: pz }; }
  return { x, z };
}
TV.freeSpot = freeSpot;
function moveTo(x, z, heading) {
  F.Player.teleport(x, z);
  if (F.W.update) { try { F.W.update(x, z, true); } catch (e) { console.error('[travel] load', e); } }
  const p = freeSpot(x, z); if (p.x !== x || p.z !== z) F.Player.teleport(p.x, p.z);
  if (heading != null) F.Player.heading = heading;
  if (F.R.cam.mode !== 'out' && F.R.setCam) F.R.setCam({ mode: 'out', pitch: 0.92, snap: true });
}
TV.to = function (o) {
  o = o || {};
  return TV.ride(async () => { await leaveBuilding(); moveTo(o.x, o.z, o.heading); }, { kind: o.kind || 'to', id: o.id, line: o.line === undefined ? 'hud_fly' : o.line, slots: o.slots });
};

/* ------------------------------------------------------------ the §9.2 API */
const realmOf = id => (F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null);
TV.canFast = function (id) {
  if (!id || id === 'home') return true;
  let st = null; try { st = F.Realm && F.Realm.state ? F.Realm.state(id) : null; } catch (e) { st = null; }
  return st === 'found' || st === 'friend';
};
TV.arrival = function (id) {
  let g = null; try { g = F.Realm && F.Realm.gate ? F.Realm.gate(id) : null; } catch (e) { g = null; }
  return g ? { x: g.x, z: g.z + 6 } : null;
};
TV.toRealm = async function (id) {
  const R = realmOf(id);
  if (!TV.canFast(id)) { sfx('boing'); await sayF('trav_selv'); return false; }
  const a = TV.arrival(id); if (!a) return false;
  const ok = await TV.to({ x: a.x, z: a.z, heading: Math.PI, kind: 'realm', id, line: R && F.TPL.has('trav_reiser') ? 'trav_reiser' : 'hud_fly', slots: R ? { slott: R.castle } : null });
  return ok;
};
TV.homeSpot = function () {
  const o = (F.Tower && F.Tower.outside) || F.spawnPoint || { x: 80, z: -85.8 };
  return { x: o.x, z: o.z + 0.6 };
};
TV.toHome = async function (o) {
  o = o || {};
  const h = TV.homeSpot();
  const ok = await TV.ride(async () => {
    if (o.bedtime && F.Tower && F.Tower.toBed) {
      // bedtime: she lands on the cloud bed in Fetårnet (WP2) – the ride ends indoors
      if (F.Space.cur === 'in' && !(F.Tower.inside && F.Tower.inside())) await leaveBuilding();
      if (F.Space.cur === 'out') moveTo(h.x, h.z, 0);
      try { await F.Tower.toBed(); } catch (e) { console.error('[travel] toBed', e); }
      return;
    }
    await leaveBuilding(); moveTo(h.x, h.z, 0);
  }, { kind: 'home', id: o.bedtime ? 'bed' : 'home', line: (o.quiet || o.bedtime) ? null : (F.TPL.has('trav_hjem') ? 'trav_hjem' : 'hud_home') });   // bedtime: WP2 already said «… Vi flyr hjem!»
  if (o.bedtime) return ok && !!(F.Tower && F.Tower.inside && F.Tower.inside());
  if (ok) F.emit('flewHome');
  return ok;
};
TV.toCastle = async function () {
  const g = (F.Castle && F.Castle.gatePos && F.Castle.gatePos()) || { x: 0, z: 30.5 };
  return TV.to({ x: g.x, z: g.z + 1, heading: Math.PI, kind: 'castle', id: 'slott', line: 'hud_fly' });
};

F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.travel = async (id) => {
    const t0 = performance.now();
    const ok = id === 'home' || !id ? await TV.toHome() : id === 'castle' ? await TV.toCastle() : await TV.toRealm(id);
    return { ok, ms: Math.round(performance.now() - t0), sec: TV.lastSec, pos: [+F.Player.pos.x.toFixed(1), +F.Player.pos.z.toFixed(1)], space: F.Space.cur };
  };
  F.dbg.puff = () => ({ mode: PU.mode, offering: !!offer, cur: PU.cur && { x: Math.round(PU.cur.x), y: Math.round(PU.cur.y), s: +PU.cur.s.toFixed(2), o: +PU.cur.o.toFixed(2) }, her: herPt(0) });
});
})();
