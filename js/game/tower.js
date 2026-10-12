/* Feslottet – WP2 HOME: Fetårnet, her own fairy tower (DESIGN2 §2.7–2.8).
   Outdoors: the tower c_fetarn_ute at (80, −92) north of Fehagen (collider r 4.2, door at (80, −87.6) facing south), a glow star
   (+ a fog-free sprite that shines at golden bedtime), the mailbox h_postkasse (83.4, −86.4) and the door thing (WP1's b_dor when it
   exists, else h_tarndor). Indoors: plan 'tarn' (origin (−400, 0)): f0 'fetarn' «Fetårnet» (cloud bed, window, piggy bank, pet basket,
   mirror, Møbelbua slots – ids kept), f1 'stjernerom' «Stjernerommet» (telescope, map table, star picture – ids kept), spiral (10.6, 2.3).
   The day: wake() in the cloud bed (a hop down) → (complete idleness only: one soft glow at the way out; a spoken «Gå ut døra!» only
   before she has ever been out) → first exit of the day = 'towerExit' → the very first exit: F.R.look at the castle «Se, slottet!»
   (later mornings: a glance only toward a kingdom she has never been shown) → the post: envelopes are tucked into the mailbox (its flag
   goes up and it glows) → a tap on it lays them out.
   Until WP1's F.Bld is real (stub), the legacy castle room 'fetarn' is used and gets a temporary way out (h_utdor).
   F.Tower = { C, R, door, outside, MAIL, wake(o) -> Promise, toBed() -> Promise, bedSpot(), miaSpot(), mailbox() -> thing,
               firstExitLook() -> Promise, inside() -> bool, exitPos() -> {x,y,z}, post() -> n waiting, real() -> bool }
   Events: 'towerExit' (first exit of the day), 'dayFlow' ('wake'|'out'|'bed'), 'mailboxOpen' (thing). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C = { x: 80, z: -92 }, RAD = 4.2;
const DOOR = { x: 80, z: -87.6 }, OUT = { x: 80, z: -85.8 }, MAIL = { x: 83.4, z: -86.4 };
const ORIGIN = { x: -400, z: 0 };
const BED = { lx: 3.2, lz: 2.2 }, BED_OFF = { lx: 4.6, lz: 4.4 };   // the bed and the floor spot she hops down to
const SPIRAL = { c: [10.6, 2.3], r: 1.6 };
const EXIT = { lx: 7, lz: 9.7 };
const EXIT_LEGACY = { lx: 11.6, lz: 8.9 };     // the old castle room: away from its spawn (7, 8.4) so she never walks out by accident
const has = id => F.VOX.has(id);
const say = (id, slots) => (F.TPL && F.TPL.has(id) ? F.SAY(id, slots) : Promise.resolve());
// a thing's reaction line (bed, tower, shelf): through F.SAYF, so the free-play narrator limiter (ui.js, audit D4) decides – the SFX and
// the motion always play
const sayf = (id, slots) => (F.TPL && F.TPL.has(id) ? (F.SAYF || F.SAY)(id, slots) : Promise.resolve());
const sleep = ms => F.T.sleep(ms);
const T = F.Tower = Object.assign(F.Tower || {}, { C, R: RAD, door: DOOR, outside: OUT, MAIL, ORIGIN, morning: false, mail: [] });
/* F.save.home (natural audit 11.10., D8 / #46) – what she already knows, so the morning only shows what is new:
   out: she has left the tower at least once · look: the first-exit castle glance has played · seen: {realmId: 1} kingdoms shown by a
   glance (or by their own appear ceremony) · mail: she has opened the mailbox · nudged: the one spoken door hint has been said.
   An older save that finished the onboarding has done all of it (seen = null: seeded with today's kingdoms on first use). */
function H() {
  let h = F.save.home;
  if (!h || typeof h !== 'object') {
    const old = !!(F.save.onb && F.save.onb.done);
    h = F.save.home = { out: old, look: old, seen: old ? null : {}, mail: old, nudged: old };
  }
  return h;
}
T.known = H;
// natural #46: true when Pip's «Pip har med post til deg!» (quests.js envelopes, q_post) should stay unsaid – she already knows the
// mailbox (Pip's flight, the raised flag and the glow are the whole message), or she is inside the tower and cannot see Pip at all
T.postQuiet = () => !!(H().mail || T.inside());

/* ================================================================== plan 'tarn' (WP1's F.Bld engine builds it) */
const PLAN = {
  id: 'tarn', name: 'Fetårnet', kind: 'tarn', origin: { x: ORIGIN.x, z: ORIGIN.z }, floors: 2,
  cells: [
    { key: 'fetarn', f: 0, c: 0, shell: 'r_fetarn', opts: { doorL: false, doorR: false }, num: null, name: 'Fetårnet', type: 'fetarn' },
    { key: 'stjernerom', f: 1, c: 0, shell: 'r_stjernetarn', opts: { doorL: false, doorR: false, hole: { c: SPIRAL.c.slice(), r: 1.75 } }, num: null, name: 'Stjernerommet', type: 'stjernetarn', legacy: 'stjernetarn' },
  ],
  stair: { cell: 'fetarn', c: SPIRAL.c.slice(), r: SPIRAL.r, floors: [0, 1] },
  lift: null,
  exits: [{ id: 'dor', cell: 'fetarn', lx: EXIT.lx, lz: EXIT.lz, out: { x: OUT.x, z: OUT.z, ry: 0 } }],
  bed: { cell: 'fetarn', lx: BED_OFF.lx, lz: BED_OFF.lz },
  spots: { bed: { cell: 'fetarn', lx: BED.lx, lz: BED.lz }, wake: { cell: 'fetarn', lx: BED_OFF.lx, lz: BED_OFF.lz }, mia: { cell: 'fetarn', lx: 6.2, lz: 7.4 } },
  furnish: false,          // tower.js places the things itself (ids kept from the old castle floor 3)
};
// [type, lx, lz, {id, dy, ry, idx, data}] – ids are the legacy c_<room>_<type>[_idx] so saved states (piggy coins, slots) survive
const FUR = {
  fetarn: [['c_feseng', BED.lx, BED.lz, { id: 'c_fetarn_c_feseng' }], ['c_tarnvindu', 7, 0.62, { dy: 1.0 }], ['c_sparegris', 4.4, 8.6], ['c_dyrekurv', 9.6, 8.6],
    ['h_fespeil', 12.9, 7.0, { id: 'c_fetarn_c_fespeil_2', ry: -Math.PI / 2 }]],
  stjernerom: [['c_teleskop', 3.6, 2.0], ['c_kartbord', 6.6, 5.6], ['c_stjernebilde', 6.4, 0.62, { dy: 1.6 }], ['h_legendehylle', 1.6, 1.6, { ry: Math.PI / 4 }]],
};
const ROOMID = { fetarn: 'fetarn', stjernerom: 'stjernetarn' };   // legacy id prefix per cell
// Møbelbua slots in Fetårnet (same ids as things_castle.js SLOT_POS; moved off the spiral and the cloud bed)
const SLOTS = { seng: [1.7, 5.8, Math.PI / 2], lampe: [8.3, 1.0, 0], hylle: [5.2, 0.9, 0], stol: [11.6, 6.4, -0.6], akvarium: [12.4, 8.8, Math.PI], pynt1: [2.4, 8.2, 0.5],
  teppe: [7, 5.6, 0], gardiner: [13.36, 4.6, -Math.PI / 2, 2.3], vindu: [3.25, 0.7, 0, 2.3], vegg: [0.8, 8.4, Math.PI / 2, 2.6] };

const stubBld = () => !F.Bld || !F.Bld.toWorld || !F.Bld.enter;
function registerPlan() {
  if (!F.Bld || !F.Bld.register) return;
  try {
    if (F.Bld.plan && F.Bld.plan('tarn') && F.Bld.plan('tarn')._wp2 === PLAN._wp2 && PLAN._wp2) return;
    PLAN._wp2 = 1;
    if (F.Bld.registerSimple) F.Bld.registerSimple(PLAN); else F.Bld.register(PLAN);
  } catch (e) { console.error('[tower] register', e); }
}
registerPlan();
// the real engine answers toWorld for our plan; the stub returns null
let isReal = false;   // once the engine answered, it stays
const real = T.real = () => { if (isReal) return true; try { return (isReal = !stubBld() && !!F.Bld.toWorld('tarn', 'fetarn', 7, 5)); } catch (e) { return false; } };
const legacyRoom = () => (F.Castle && F.Castle.rooms && F.Castle.rooms.fetarn && F.Castle.rooms.fetarn.bounds) ? F.Castle.rooms.fetarn : null;
// tower-local (lx, lz) on a cell → world (inScene) position
function W(cell, lx, lz) {
  if (real()) { try { const p = F.Bld.toWorld('tarn', cell || 'fetarn', lx, lz); if (p) return { x: p.x, y: p.y != null ? p.y : 0, z: p.z, f: p.f != null ? p.f : (cell === 'stjernerom' ? 1 : 0) }; } catch (e) { console.error(e); } }
  const r = legacyRoom(); if (r && (!cell || cell === 'fetarn')) return { x: r.bounds.x0 + lx, y: (r.floor || 0) * 6, z: (r.bounds.z0 || 0) + lz, f: r.floor || 0, legacy: true };
  return null;
}
T.toWorld = W;
T.inside = () => F.Space.cur === 'in' && ((real() && F.Bld.cur === 'tarn') || (!real() && F.Castle && (F.Castle.cur === 'fetarn' || F.Castle.cur === 'stjernetarn')));
T.bedSpot = () => W('fetarn', BED_OFF.lx, BED_OFF.lz);
T.bedTop = () => W('fetarn', BED.lx + 0.4, BED.lz + 0.2);
T.miaSpot = () => W('fetarn', 6.2, 7.4);
T.exitPos = () => (real() ? W('fetarn', EXIT.lx, 9.3) : W('fetarn', EXIT_LEGACY.lx, EXIT_LEGACY.lz));

/* ================================================================== things: cloud bed, mailbox, doors */
F.Things.def('c_feseng', {
  name: 'skysenga', radius: 1.2, solid: true, reach: 2.4,
  build(th) {
    const g = new THREE.Group(); const m = F.VOX.make(has('c_feseng') ? 'c_feseng' : 'tmp_bush', {}); g.add(m);
    th.parts = (m.userData && m.userData.parts) || {};
    return g;
  },
  async press(th) {
    th.reactedVisibly = true;
    const b = th.parts.blanket, o = th.obj.children[0];
    if (F.sfx.boing) F.sfx.boing();
    sayf('home_seng');
    if (o) await F.T.tween(700, k => { o.scale.y = 1 - Math.sin(k * Math.PI * 3) * 0.08 * (1 - k); o.scale.x = 1 + Math.sin(k * Math.PI * 3) * 0.04 * (1 - k); });
    if (b) F.T.tween(600, k => { b.position.y = Math.sin(k * Math.PI) * 0.12; });
    F.FX.burst(V3(th.x, th.y + 1.2, th.z), { n: 14, colors: [0xffffff, 0xfff0a0, 0xc6a8ff], speed: 0.9, up: 1.4, life: 1.2, size: 0.1, gravity: 0.4 });
    F.Things.setState(th, { hugs: (th.state.hugs || 0) + 1 });
  },
});

// the fairy mirror in her room: the castle's c_fespeil model, but a tap opens the cloud fairy stage (her own fairy pre-picked, ✓ keeps
// it), so a change is always a deliberate choice – never a surprise swap on an exploring tap
F.Things.def('h_fespeil', {
  name: 'fespeilet', radius: 0.5, solid: true, space: 'in', surprise: false,
  build(th) { const d = F.Things.defs.c_fespeil; if (d && d.build) return d.build(th); const g = new THREE.Group(); if (has('c_fespeil')) g.add(F.VOX.make('c_fespeil', {})); return g; },
  async press(th) {
    th.reactedVisibly = true;
    if (F.sfx.magic) F.sfx.magic();
    F.Things.setState(th, { looks: (th.state.looks || 0) + 1 });
    F.FX.burst(V3(th.x, (th.y || 0) + 1.6, th.z), { n: 30, colors: [0x9fe8ff, 0xc6a8ff, 0xffffff], speed: 1.4, up: 2, life: 1.2 });
    const busy = !F.Title || !F.Title.fairySelect || !F.Fairy || !F.Fairy.set || F.Task.current || (F.Shell && F.Shell.screen) || (F.Onboard && F.Onboard.active);
    if (busy) return;                                     // (onboarding, a task, a screen): just the sparkle, never a question without a choice
    await sleep(450);
    if (!T.inside() || F.Task.current || (F.Shell && F.Shell.screen)) return;
    const c = F.R.cam, cam = { mode: c.mode, target: c.target.clone(), dist: c.distGoal, pitch: c.pitchGoal, yaw: c.yawGoal };
    const cur = F.save.fairy || 'krystall';
    let kind = cur;
    try { kind = await F.Title.fairySelect(cur); } catch (e) { console.error('[tower] mirror', e); }
    // fairySelect is the title's stage: give the world back (input, HUD, the room camera)
    F.Input.enabled = true; F.Player.frozen = false; F.Player.obj.visible = true;
    if (F.HUD.show) F.HUD.show(true);
    F.R.setCam(Object.assign(cam, { snap: true }));
    if (kind && kind !== cur) { try { F.Fairy.set(kind); } catch (e) { console.error('[tower] Fairy.set', e); } }
  },
});
// the mailbox: post lives here (the flag goes up), a tap lays the envelopes out in front of it
F.Things.def('h_postkasse', {
  name: 'postkassa', radius: 0.6, solid: true, reach: 2.2, surprise: false,
  build(th) {
    const g = new THREE.Group();
    const m = has('v_postkasse') ? F.VOX.make('v_postkasse', {}) : (has('o_postkasse') ? F.VOX.make('o_postkasse', {}) : new THREE.Group());
    m.scale.setScalar(1.7); g.add(m);
    th.parts = (m.userData && m.userData.parts) || {};
    // a big invisible pick box (the mailbox is slim)
    const pick = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 1.0), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 1.2; g.add(pick);
    return g;
  },
  init(th) { th.labelY = 2.8; flag(th, T.mail.length > 0, true); },
  tick(th, dt, t) { if (th._pulse && th.obj) { const s = 1 + Math.max(0, Math.sin(t * 5)) * 0.06; th.obj.scale.set(s, s, s); } },
  press(th) { return openMailbox(th); },
});
function flag(th, up, snap) {
  const f = th && th.parts && th.parts.flag; if (!f) return;
  if (f.userData.x0 == null) f.userData.x0 = f.rotation.x;
  const to = f.userData.x0 + (up ? 0 : 1.45);
  if (snap) { f.rotation.x = to; return; }
  const a = f.rotation.x; F.T.tween(500, k => { f.rotation.x = a + (to - a) * U.smooth(k); });
}
let pulseGlow = null;
function pulse(on) {
  const th = T.mailbox(); if (!th) return;
  th._pulse = !!on;
  if (!on && th.obj) th.obj.scale.set(1, 1, 1);
  if (on && !pulseGlow && th.obj) pulseGlow = F.FX.glow(th.obj, { color: 0xfff0a0, size: 2.6, ms: 0 });
  if (!on && pulseGlow) { pulseGlow.remove(); pulseGlow = null; }
}
T.pulse = pulse;
T.mailbox = () => F.Things.byId('h_postkasse');
T.post = () => T.mail.filter(m => !m.data || m.data.day == null || m.data.day === (F.save.day || 1)).length;

// today's envelopes that are waiting: tucked in the mailbox (T.mail) or lying anywhere else
const today = () => F.save.day || 1;
const envs = () => F.Things.list.filter(t => t.type === 'life_brev' && (t.data.day == null || t.data.day === today()));
function delivered() { const q = F.save.quests; return !!(q && q.envelopesDay === today()); }
async function openMailbox(th) {
  th.reactedVisibly = true;
  const d = th.parts && th.parts.door;
  if (d) { const a = d.rotation.x; F.T.tween(400, k => { d.rotation.x = a + 1.3 * U.smooth(k); }).then(() => F.T.timeout(() => F.T.tween(400, k => { d.rotation.x = a + 1.3 * (1 - U.smooth(k)); }), 1600)); }
  if (F.sfx.pling) F.sfx.pling(3);
  const h = H(); if (!h.mail) { h.mail = true; F.store(); }
  F.emit('mailboxOpen', th);
  pulse(false);
  // WP8 may take over the post (DESIGN2 §2.8 step 4)
  if (F.Quest && typeof F.Quest.openMailbox === 'function') { try { return await F.Quest.openMailbox(th); } catch (e) { console.error('[tower] Quest.openMailbox', e); } }
  // envelopes lying elsewhere (inside the tower) come to the mailbox too
  for (const e of envs()) if (!e._atBox) { T.mail.push({ id: e.id, data: Object.assign({}, e.data) }); F.Things.remove(e); }
  if (T.mail.length) { await layOut(th); return; }
  if (!delivered() && F.Day && F.Day.postNow) { F.Day.postNow('mailbox'); return; }
  F.FX.sparkle(V3(th.x, th.y + 2.2, th.z));
  await say('home_tom');
}
// the envelopes hop out of the mailbox and land in a row in front of it
const fresh = () => { T.mail = T.mail.filter(m => !m.data || m.data.day == null || m.data.day === today()); return T.mail; };
F.on('dayFlow', s => { if (s === 'wake') { fresh(); const box = T.mailbox(); if (box) flag(box, T.mail.length > 0, true); } });
async function layOut(th) {
  const L = fresh().splice(0);
  flag(th, false);
  const out = [];
  for (let i = 0; i < L.length; i++) {
    const it = L[i], x = MAIL.x + 2.5 + i * 1.5, z = MAIL.z - 0.5 + (i % 2) * 0.6;     // beside the mailbox, this side of Fehagen's fence
    const e = F.Things.spawn('life_brev', x, z, { id: it.id, space: 'out', data: it.data });
    if (!e) continue;
    e._atBox = true; out.push(e);
    const o = e.obj; if (o) { const y0 = o.position.y; F.T.tween(520, k => { o.position.set(th.x + (x - th.x) * k, y0 + 1.6 * Math.sin(k * Math.PI) + (1 - k) * 0.8, th.z + (z - th.z) * k); }).then(() => { o.position.set(x, y0, z); F.FX.sparkle(V3(x, y0 + 0.3, z)); }); }
    if (F.sfx.pop) F.sfx.pop();
    await sleep(220);
  }
  await sleep(400);
  F.emit('postOut', out.map(e => e.id));
  return out;
}
T.layOut = () => { const th = T.mailbox(); return th ? layOut(th) : Promise.resolve([]); };

// fallback door (when WP1's b_dor is not there): a tap or walking into the 1.2 m box in front of the door goes in
F.Things.def('h_tarndor', {
  name: 'døra', radius: 0.9, solid: false, reach: 1.9, surprise: false, hoverable: true,
  build() {
    const g = new THREE.Group();
    const pick = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 1.2), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, 1.5, -0.3); g.add(pick);
    return g;
  },
  press(th) { th.reactedVisibly = true; return T.goIn(); },
});
// the tower body: a tap = «this is your home» and she flies to the door and goes in (what a child expects)
F.Things.def('h_tarn', {
  name: 'Fetårnet', radius: RAD, solid: false, reach: 99, surprise: false, hoverable: true,
  build() {
    const g = new THREE.Group();
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 15, 16), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 7.5; g.add(pick);
    return g;
  },
  async press(th) {
    th.reactedVisibly = true;
    const s = T.extParts && T.extParts.star;
    if (s) F.T.tween(900, k => { s.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.5); });
    F.FX.sparkle(V3(C.x, 20.5, C.z), 0xfff0a0);
    sayf((F.Day && F.Day.golden) ? 'home_stjerne' : 'home_tarn');
    const P = F.Player;
    if (Math.hypot(P.pos.x - OUT.x, P.pos.z - OUT.z) > 0.8) { const ok = await P.goTo(OUT.x, OUT.z); if (!ok) return; }
    await T.goIn();
  },
});
// Stjernerommet's legend shelf (P1): the sagndyr (tier 4) she is friends with stand in its 10 niches; the rest are faint stars
const legends = () => { try { return ((F.FAUNA && F.FAUNA.species) || []).filter(sp => sp.tier === 4).slice(0, 10); } catch (e) { return []; } };
const isFriend = id => { try { return !!(F.Album && F.Album.has && F.Album.has(id)); } catch (e) { return false; } };
function fillShelf(th) {
  if (!th || !th.obj) return;
  const holder = th._figs || (th._figs = new THREE.Group());
  if (!holder.parent) th.obj.add(holder);
  while (holder.children.length) holder.remove(holder.children[0]);
  legends().forEach((sp, i) => {
    const x = (4.5 + 9 * (i % 5) - 24) / 16, y = (3 + 16 * Math.floor(i / 5)) / 16, z = 0.02;
    let m = null;
    if (isFriend(sp.id)) {
      try { m = F.Beasts && F.Beasts.make ? F.Beasts.make(sp.id) : null; } catch (e) { m = null; }
      if (m) {
        const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), k = 0.4 / Math.max(0.01, sz.x, sz.y * 0.9, sz.z);
        m.scale.multiplyScalar(k); m.position.set(x, y - bb.min.y * k, z); m.rotation.y = 0.35;
      }
    }
    if (!m && has('tmp_star')) { m = F.VOX.make('tmp_star', {}); m.scale.setScalar(1.6); m.position.set(x, y + 0.42, z + 0.1); m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } }); }
    if (m) { m.traverse(o => { o.userData.thing = th; }); holder.add(m); }
  });
  th._n = legends().filter(sp => isFriend(sp.id)).length;
}
F.Things.def('h_legendehylle', {
  name: 'sagnhylla', radius: 0.7, solid: true, reach: 2.2, surprise: false,
  build(th) { const g = new THREE.Group(); if (has('h_legendehylle')) g.add(F.VOX.make('h_legendehylle', {})); return g; },
  init(th) { th.labelY = 2.9; F.T.timeout(() => fillShelf(th), 0); },
  async press(th) {
    th.reactedVisibly = true;
    fillShelf(th);
    if (F.sfx.chime) F.sfx.chime();
    F.FX.burst(V3(th.x, th.y + 2.4, th.z), { n: 22, colors: [0xfff0a0, 0xffffff, 0xc6a8ff], speed: 1.2, up: 1.6, life: 1.3, size: 0.09 });
    sayf(th._n ? 'home_hylle' : 'home_hylle0');
    const figs = th._figs ? th._figs.children.slice() : [];
    for (const f of figs) { const y0 = f.position.y; F.T.tween(420, k => { f.position.y = y0 + Math.sin(k * Math.PI) * 0.12; }); await sleep(90); }
    F.Things.setState(th, { looks: (th.state.looks || 0) + 1 });
  },
});
F.on('friendMade', () => { const th = F.Things.byId('c_stjernetarn_h_legendehylle'); if (th) fillShelf(th); });

// legacy way out of the old castle room 'fetarn' (only while F.Bld is the stub): a glowing arch at the room front
F.Things.def('h_utdor', {
  name: 'døra', radius: 0.8, solid: false, reach: 1.6, surprise: false,
  build() {
    const g = new THREE.Group();
    if (has('tmp_arch')) { const a = F.VOX.make('tmp_arch', { c: 'lilac' }); a.scale.setScalar(0.75); g.add(a); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 40), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 0.4); ring.raycast = () => {}; g.add(ring);
    return g;
  },
  tick(th, dt, t) { const r = th.obj && th.obj.children[th.obj.children.length - 1]; if (r) r.scale.setScalar(1 + Math.sin(t * 4) * 0.1); },
  press(th) { th.reactedVisibly = true; return T.goOut(); },
});

/* ================================================================== exterior (outdoor scene) */
let ext = null, starSprite = null, extMats = null, extY = 0, fadeK = 1;
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,250,215,1)'); gr.addColorStop(0.25, 'rgba(255,236,150,0.85)'); gr.addColorStop(0.6, 'rgba(255,214,120,0.25)'); gr.addColorStop(1, 'rgba(255,210,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function buildExterior() {
  if (!has('c_fetarn_ute')) return;
  const y = F.W && F.W.groundY ? Math.max(0, F.W.groundY(C.x, C.z)) : 0;
  const m = F.VOX.make('c_fetarn_ute', {});
  m.position.set(C.x, y, C.z); m.name = 'fetarnUte';
  extMats = [];
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); const q = o.material; q.userData.f0 = { t: q.transparent, o: q.opacity, d: q.depthWrite }; extMats.push(q); } });   // own materials: the occluder fade
  F.R.scene.add(m);
  ext = T.ext = m; extY = y;
  const parts = (m.userData && m.userData.parts) || {};
  T.extParts = parts;
  // the fog-free star glow (always a little, bright at golden bedtime): the way home from afar
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2b0, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.45 });
  starSprite = new THREE.Sprite(mat); starSprite.scale.set(5, 5, 1); starSprite.position.set(C.x, y + 20.25, C.z); starSprite.raycast = () => {};
  F.R.scene.add(starSprite); T.starSprite = starSprite;
  // collider: the round wall (WORLD's blockers; the park reserve has no chunk boxes)
  if (F.W && F.W.blockers) F.W.blockers.push((x, z, r) => { const dx = x - C.x, dz = z - C.z; return dx * dx + dz * dz < (RAD + r) * (RAD + r); });
}
F.on('tick', (dt, t) => {
  if (!ext) return;
  const s = T.extParts && T.extParts.star; if (s) s.rotation.y = t * 0.6;
  if (starSprite) { const want = (F.Day && F.Day.golden) ? 1 : 0.42; const m = starSprite.material; m.opacity += (want + Math.sin(t * 2.2) * 0.06 - m.opacity) * Math.min(1, dt * 2); const sc = (F.Day && F.Day.golden) ? 7.5 : 5; starSprite.scale.x += (sc - starSprite.scale.x) * Math.min(1, dt * 2); starSprite.scale.y = starSprite.scale.x; }
});
// the tower between the camera and her (Q/E turns, the door spot): its wall fades to 0.3 like the courtyard occluders
function towerBlocks() {
  if (!ext || F.Space.cur !== 'out' || !F.R.camera) return false;
  const cam = F.R.camera.position, P = F.Player.pos;
  const ax = P.x - cam.x, az = P.z - cam.z, L2 = ax * ax + az * az || 1;
  const t = U.clamp(((C.x - cam.x) * ax + (C.z - cam.z) * az) / L2, 0, 1);
  if (Math.hypot(cam.x + ax * t - C.x, cam.z + az * t - C.z) > RAD + 0.8) return false;
  return cam.y + ((P.y || 0) + 1 - cam.y) * t < extY + 19.5;          // the sight line passes below the finial
}
F.on('tick', dt => {
  if (!extMats) return;
  const want = towerBlocks() ? 0.3 : 1;
  if (want === fadeK) return;
  fadeK += (want - fadeK) * Math.min(1, dt * 6);
  if (Math.abs(fadeK - want) < 0.01) fadeK = want;
  for (const m of extMats) {
    const f0 = m.userData.f0, tr = fadeK < 1 || f0.t;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    m.opacity = f0.o * fadeK; m.depthWrite = fadeK < 1 ? fadeK > 0.95 && f0.d : f0.d;
  }
});
T.fade = () => +fadeK.toFixed(2);
function swingDoor(open) {
  const d = T.extParts && T.extParts.door; if (!d) return Promise.resolve();
  const a = d.rotation.y, to = open ? -1.35 : 0;
  if (open && F.sfx.creak) F.sfx.creak();
  return F.T.tween(380, k => { d.rotation.y = a + (to - a) * U.smooth(k); });
}
T.swingDoor = swingDoor;

/* ================================================================== placement (outdoor things at boot, interior things at ready) */
F.on('boot', () => {
  try { buildExterior(); } catch (e) { console.error('[tower] exterior', e); }
  try {
    F.Things.spawn('h_postkasse', MAIL.x, MAIL.z, { id: 'h_postkasse', ry: 0, zone: 'park' });
    F.Things.spawn('h_tarn', C.x, C.z, { id: 'h_tarn', zone: 'park' });
  } catch (e) { console.error('[tower] mailbox', e); }
});
function placeDoor() {
  if (F.Things.defs.b_dor) {
    let d = F.Things.byId('b_dor_tarn');
    if (!d) d = (F.Bld && F.Bld.addDoor) ? F.Bld.addDoor('tarn', DOOR.x, DOOR.z, { id: 'b_dor_tarn', exit: 'dor' }) : F.Things.spawn('b_dor', DOOR.x, DOOR.z, { id: 'b_dor_tarn', zone: 'park', data: { bld: 'tarn', exit: 'dor' } });
    // the tower model has its own round door: hide the generic door model, keep the (invisible) pick box and the trigger
    if (d && d.obj) d.obj.traverse(o => { if (o.isMesh && o.material && o.material.visible !== false) o.visible = false; });
    const old = F.Things.byId('h_tarndor'); if (old) F.Things.remove(old);
    return;
  }
  if (!F.Things.byId('h_tarndor')) F.Things.spawn('h_tarndor', DOOR.x, DOOR.z + 0.6, { id: 'h_tarndor', zone: 'park' });
}
function spawnIn(cell, type, lx, lz, o) {
  if (!F.Things.defs[type]) return null;
  o = Object.assign({}, o);
  o.id = o.id || ('c_' + ROOMID[cell] + '_' + type + (o.idx != null ? '_' + o.idx : ''));
  if (real() && F.Bld.spawnIn) {
    try { const th = F.Bld.spawnIn('tarn', cell, type, lx, lz, o); if (th) return th; } catch (e) { console.error('[tower] Bld.spawnIn', type, e); }
    const p = W(cell, lx, lz); if (!p) return null;
    const th = F.Things.spawn(type, p.x, p.z, Object.assign(o, { space: 'in', y: p.y + (o.dy || 0) }));
    if (th) { th.room = cell; th.floor = p.f; th.bld = 'tarn'; }
    return th;
  }
  return null;
}
function furnish() {
  if (!real()) return false;
  for (const cell in FUR) for (const [type, lx, lz, o] of FUR[cell]) spawnIn(cell, type, lx, lz, o || {});
  for (const s in SLOTS) { const [x, z, ry, dy] = SLOTS[s]; spawnIn('fetarn', 'c_slot', x, z, { idx: s, ry, dy: dy || 0, data: { slot: s, wall: !!dy } }); }
  // the teddy sits on the cloud bed (onboard.js owned it before; same id)
  if (F.Things.defs.bamse) spawnIn('fetarn', 'bamse', BED.lx - 0.2, BED.lz - 0.3, { id: 'shell_fetarn_bamse', ry: 0.5, dy: 0.78 });
  T.furnished = true;
  return true;
}
T.furnish = furnish;
function legacyExtras() {
  // old castle floor 3: a way out to the tower door while the building engine is a stub
  if (real() || !legacyRoom() || F.Things.byId('h_utdor')) return;
  try { if (F.Castle.kit && F.Castle.kit.spawnIn) F.Castle.kit.spawnIn('fetarn', 'h_utdor', EXIT_LEGACY.lx, EXIT_LEGACY.lz, { id: 'h_utdor' }); } catch (e) { console.error('[tower] legacy door', e); }
}
F.on('ready', () => {
  registerPlan();
  try { placeDoor(); } catch (e) { console.error('[tower] door', e); }
  try { furnish(); } catch (e) { console.error('[tower] furnish', e); }
  try { legacyExtras(); } catch (e) { console.error('[tower] legacy', e); }
});

/* ================================================================== going in and out */
let moving = false;
T.goIn = async function () {
  if (moving) return false; moving = true;
  try {
    if (F.Player.frozen) return false;
    await swingDoor(true);
    if (real()) { await F.Bld.enter('tarn', { exit: 'dor' }); }
    else if (legacyRoom() && F.Castle.enter) { await F.HUD.fade(() => { F.Castle.enter('fetarn'); const p = T.exitPos(); if (p) F.Player.teleport(p.x, p.z - 1.2); }); }
    swingDoor(false);
    if (T.inside()) { say('home_hjem'); F.emit('dayFlow', 'in'); }
    return T.inside();
  } finally { moving = false; }
};
T.goOut = async function () {
  if (moving) return false; moving = true;
  try {
    if (real()) await F.Bld.leave({ exit: 'dor' });
    else await F.HUD.fade(() => { F.Space.set('out', { x: OUT.x, z: OUT.z }); F.R.setCam({ mode: 'out', yaw: 0, snap: true }); });
    return F.Space.cur === 'out';
  } finally { moving = false; }
};
// walking into the box in front of the door (fallback door only; WP1's b_dor triggers itself)
F.on('tick', (() => { let acc = 0; return dt => {
  acc += dt; if (acc < 0.15) return; acc = 0;
  if (F.Player.frozen || moving) return;
  const P = F.Player.pos;
  if (F.Space.cur === 'in') {          // legacy room (stub engine): flying onto the glowing arch goes out
    const u = !real() && F.Player.moving && F.Things.byId('h_utdor');
    if (u && u.space === 'in' && Math.hypot(P.x - u.x, P.z - u.z) < 0.9) T.goOut();
    return;
  }
  if (F.Things.defs.b_dor) return;
  if (Math.abs(P.x - DOOR.x) < 0.8 && P.z < DOOR.z + 1.0 && P.z > DOOR.z - 0.6 && F.Player.moving) T.goIn();
}; })());
// she left the tower: the first time today is the morning's way out. The camera glance only when it shows her something (natural #46):
// the very first exit (the castle «Se, slottet!» + a kingdom's light), or a kingdom she has never been shown. An ordinary morning: no
// camera grab and no line – the post comes, the mailbox flag goes up and glows.
function onLeft() {
  F.T.timeout(() => swingDoor(true).then(() => F.T.timeout(() => swingDoor(false), 700)), 0);
  const td = F.save.today || {};
  if (td.towerOut) return;
  td.towerOut = true;
  const h = H(), first = !h.look, fresh = first ? null : newRealms();
  h.out = true; F.store();
  T.morning = false;
  F.emit('towerExit');
  F.emit('dayFlow', 'out');
  if (!first && !fresh.length) { T.lastLook = 'none'; quietMorning().catch(e => console.error('[tower] morning', e)); return; }
  T.lastLook = first ? 'castle' : 'beam';
  preloadCastle(true);                                  // during the dip out: the land round the castle is there for the glance
  T.looking = true;
  T.firstExitLook(first ? {} : { castle: false, only: fresh }).catch(e => console.error('[tower] look', e)).then(() => { T.looking = false; preloadCastle(false); });
}
// awake kingdoms she has never been shown (an older save: today's kingdoms count as shown)
function newRealms() {
  const RM = F.Realm; if (!RM || !RM.list) return [];
  const h = H();
  let aw = [];
  try { aw = RM.list().filter(s => (RM.awake ? RM.awake(s.id) : (s.state && s.state !== 'site'))).map(s => s.id); } catch (e) { return []; }
  if (!h.seen) { h.seen = {}; aw.forEach(id => { h.seen[id] = 1; }); F.store(); return []; }
  return aw.filter(id => !h.seen[id]);
}
// keepUnfound: her tap cut the glance before a kingdom's light was shown – the unfound kingdoms stay «new», so a later morning's glance
// shows that light (and «Se lyset! …» the first time); the castle glance itself is never repeated (h.look)
function markSeen(keepUnfound) {
  const h = H(); h.look = true; h.seen = h.seen || {};
  const RM = F.Realm;
  try { if (RM && RM.list) for (const s of RM.list()) if ((RM.awake ? RM.awake(s.id) : (s.state && s.state !== 'site')) && !(keepUnfound && unfound(RM, s))) h.seen[s.id] = 1; } catch (e) { /* no realms */ }
  F.store();
}
// a kingdom that rose while she watched (realm.js's ceremony glance is running outdoors): it is not new tomorrow morning
F.on('realmAppeared', id => { if (F.Space.cur !== 'out' || !(F.R.cam && F.R.cam.look)) return; const h = H(); if (h.seen) { h.seen[id] = 1; F.store(); } });
// an ordinary morning out of the door: the post (Pip, the mailbox flag + glow), nothing said by the tower
async function quietMorning() {
  await sleep(700);                                       // the dip out finishes
  if (F.Onboard && F.Onboard.active) return;
  if (!delivered() && F.Day && F.Day.postNow) F.Day.postNow('exit');
  else postHint();
}
F.on('bldLeft', id => { if (id === 'tarn') onLeft(); });
F.on('doorCrossed', d => { if (d && d.bld === 'tarn' && d.dir === 'in' && !moving) swingDoor(true).then(() => F.T.timeout(() => swingDoor(false), 900)); });
F.on('spaceChanged', (cur, prev) => {
  // going back in during the castle glance: end the glance (an outdoor look target would leave the indoor view empty)
  if (T.looking && cur === 'in' && F.R.cam.look && F.R.cam.look.done) { try { F.R.cam.look.done(); } catch (e) { /* already done */ } T.looking = false; }
  // legacy (stub F.Bld): leaving the castle's fetarn room through h_utdor lands at the tower door
  if (real() || cur !== 'out' || prev !== 'in') return;
  const P = F.Player.pos; if (Math.hypot(P.x - OUT.x, P.z - OUT.z) < 3) onLeft();
});

/* ================================================================== the glance at the castle + the post */
const CASTLE = { x: 0, y: 12, z: 0 };
// the glance looks ~120 m away: load the chunk ring round the castle and keep it while the camera is there
let keep0 = null;
function preloadCastle(on) {
  const Wd = F.W; if (!Wd || !Wd.update || F.Space.cur !== 'out') { if (!on && keep0 != null && Wd) { Wd.R_KEEP = keep0; keep0 = null; } return; }
  try {
    if (on) {
      if (keep0 == null) keep0 = Wd.R_KEEP;
      Wd.R_KEEP = Math.max(keep0, 5);
      const P = F.Player.pos, t0 = performance.now();
      Wd.update(CASTLE.x, 16, true);
      Wd.update(P.x, P.z, true);
      T.preloadMs = Math.round(performance.now() - t0);
    } else if (keep0 != null) { Wd.R_KEEP = keep0; keep0 = null; }
  } catch (e) { console.error('[tower] preload', e); }
}
// o.castle === false: no castle stop (a morning with only a new kingdom); o.only: the kingdom ids the light stop may turn to
T.firstExitLook = async function (o) {
  o = o || {};
  await sleep(700);                                       // the dip out finishes, she steps away from the door
  // another glance is playing (e.g. WP3's new-kingdom ceremony on bldLeft): let it finish first
  for (let k = 0; k < 32 && F.R.cam.look; k++) await sleep(250);
  if (F.Space.cur !== 'out') return false;
  const P = F.Player.pos;
  if (Math.hypot(P.x - DOOR.x, P.z - DOOR.z) > 30) return false;   // lead: she jumped away (debug teleport / cloud travel) – no glance
  let seen = true;
  if (o.castle !== false) {
    // F.R.look leans 70 % toward its target: aim past the castle so the view centres on it
    const tgt = { x: P.x + (CASTLE.x - P.x) / 0.7, y: CASTLE.y, z: P.z + (CASTLE.z - P.z) / 0.7 };
    F.emit('dayFlow', 'look');
    const look = F.R.look ? F.R.look(tgt, { ms: 3800, dist: 74, pitch: 0.4 }) : sleep(3200);
    await sleep(500);
    say('home_slottet');
    seen = await look;
  }
  // second stop (DESIGN2 §2.8.3): turn toward an awake kingdom so its light pillar is in view (skipped after a tap)
  let beam = null;
  if (seen !== false && F.Space.cur === 'out') { try { beam = await beamLook(o.only); } catch (e) { console.error('[tower] beam look', e); } }
  markSeen(seen === false || beam === 'cut');
  T.looking = false;
  await sleep(300);
  // the post: only if something waits (the onboarding shows the mailbox itself)
  if (F.Onboard && F.Onboard.active) return true;
  if (!delivered() && F.Day && F.Day.postNow) F.Day.postNow('exit');
  else postHint();
  return true;
};
// the kingdom she has not found yet (a light only stands over an unfound one – clarity §2/§3.6) that needs the least turning; the view
// faces it, the camera rises above her (clear of the tower and the castle) and leans ahead, so the pillar stands in the upper middle of
// the screen; then the view turns back
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const unfound = (RM, s) => { const st = s.state != null ? s.state : (RM.state ? RM.state(s.id) : null); return st === 'appeared'; };
// clarity §3.7 / §6 «beam»: «Se lyset! Der borte ligger et slott du ikke har funnet ennå.» the first time ever a light is shown, then
// never again (later mornings: the glance alone). F.First (firsts.js) when it is there; F.save.home.beam keeps it either way.
function beamFirst() {
  const h = H(), Fi = F.First;
  const seen = !!h.beam || !!(Fi && typeof Fi.seen === 'function' && Fi.seen('beam'));
  if (!seen) { h.beam = true; F.store(); }
  try { if (Fi && typeof Fi.mark === 'function') Fi.mark('beam'); } catch (e) { console.error('[tower] First.mark', e); }
  return !seen;
}
T.beamFirst = beamFirst;
async function beamLook(only) {
  const RM = F.Realm; if (!RM || !RM.list || !F.R.look || !F.R.setCam) return false;
  const P = F.Player.pos, c = F.R.cam, yaw0 = c.yawGoal;
  let best = null, bs = 1e9;
  for (const s of RM.list()) {
    if (only && !only.includes(s.id)) continue;
    if (!unfound(RM, s)) continue;
    const dx = s.x - P.x, dz = s.z - P.z; if (Math.hypot(dx, dz) < 80) continue;
    const dy = wrapA(Math.atan2(-dx, -dz) - yaw0);            // camera behind her: the view direction is (−sin yaw, −cos yaw)
    const sc = Math.abs(dy);
    if (sc < bs) { bs = sc; best = { s, yaw: yaw0 + dy, dx, dz }; }
  }
  if (!best) return false;
  T.beamTarget = best.s.id;
  const h = Math.hypot(best.dx, best.dz), D = 90;
  F.R.setCam({ yaw: best.yaw });
  await sleep(250);
  if (F.Space.cur !== 'out') { F.R.setCam({ yaw: yaw0 }); return false; }
  const look = F.R.look({ x: P.x + best.dx / h * D, y: 2, z: P.z + best.dz / h * D }, { ms: 3600, dist: 60, pitch: 0.6 });
  let cut = false; look.then(v => { if (v === false) cut = true; });
  await sleep(700);
  // a tap before the light was in view: no line over a view that is already turning back; the light waits for a later morning
  if (cut || (F.R.cam.look && F.R.cam.look.cancel)) { await look; F.R.setCam({ yaw: yaw0 }); await sleep(400); return 'cut'; }
  if (beamFirst()) say('realm_lyset_forst');
  const ok = await look;
  F.R.setCam({ yaw: yaw0 });
  await sleep(400);
  return ok;
}
T.beamLook = beamLook;
let hinted = 0;
async function postHint() {
  for (let k = 0; k < 24 && !T.mail.length; k++) await sleep(250);     // Pip is on the way
  if (!T.mail.length || F.Space.cur !== 'out') return;
  pulse(true);
  // natural #46: once she has opened the mailbox herself, the raised flag + the glow are the whole message (Pip already said his line);
  // clarity §3.7: while the onboarding runs, its own «Du har post! Trykk på postkassa.» (home_onb_post) says it
  if (H().mail || (F.Onboard && F.Onboard.active)) return;
  if (F.T.now - hinted > 20) { hinted = F.T.now; for (let k = 0; k < 16 && F.Speech.busy(); k++) await sleep(250); await say('home_post'); }
  // still waiting after a while (and she is near): one friendly reminder
  for (let k = 0; k < 60 && T.mail.length; k++) await sleep(250);
  const box = T.mailbox(), P = F.Player.pos;
  if (T.mail.length && box && F.Space.cur === 'out' && Math.hypot(P.x - box.x, P.z - box.z) < 18 && !F.Task.current && !(F.UI.isOpen && F.UI.isOpen()) && !(F.Onboard && F.Onboard.active)) { F.FX.sparkle(V3(box.x, 2.4, box.z)); say('home_postkasse'); }
}
T.postHint = postHint;
// post keeper: today's envelopes that land by the tower go into the mailbox (flag up); the tap lays them out
F.on('tick', (() => { let acc = 0; return dt => {
  acc += dt; if (acc < 0.3) return; acc = 0;
  if (F.Quest && typeof F.Quest.openMailbox === 'function') return;      // WP8 handles it
  const box = T.mailbox(); if (!box) return;
  let n = 0;
  for (const e of envs()) {
    if (e._atBox || e.space !== 'out') continue;
    if (Math.hypot(e.x - DOOR.x, e.z - DOOR.z) > 14) continue;
    T.mail.push({ id: e.id, data: Object.assign({}, e.data) });
    F.FX.sparkle(V3(e.x, (e.y || 0) + 0.4, e.z));
    F.Things.remove(e); n++;
  }
  if (n) { flag(box, true); F.FX.trail && F.FX.trail(V3(DOOR.x, 1.5, DOOR.z + 1), V3(MAIL.x, 2.2, MAIL.z), { ms: 500 }); F.emit('postTucked', T.mail.length); if (!(F.Onboard && F.Onboard.active)) postHint(); }
}; })());

/* ================================================================== waking up and going to bed */
// she wakes in the cloud bed and hops down; resolves when she can move
T.wake = async function (o) {
  o = o || {};
  T.morning = true;
  let ok = false;
  try {
    if (real()) {
      const top = T.bedTop();
      await F.Bld.enter('tarn', { at: { f: 0, x: top.x, z: top.z }, dip: false, snap: true });
      ok = T.inside();
      if (ok && !T.furnished) furnish();
      if (ok) sitOnBed();
    } else if (legacyRoom() && F.Castle.enter) {
      F.Castle.enter('fetarn'); ok = F.Space.cur === 'in'; legacyExtras();
    }
  } catch (e) { console.error('[tower] wake', e); }
  F.emit('dayFlow', 'wake');
  if (ok && o.hop !== false) await T.hop();
  return ok;
};
// she sits on the cloud bed (frozen) until hop()
let onBed = false;
function sitOnBed() {
  const P = F.Player, top = T.bedTop(); if (!top) return;
  P.frozen = true; onBed = true;
  P.teleport(top.x, top.z); P.heading = 0;
  if (P.avatar) P.avatar.position.y = 0.75;
}
T.hop = async function () {
  const P = F.Player, a = P.avatar, top = T.bedTop(), off = T.bedSpot();
  if (!onBed || !top || !off) { onBed = false; if (a) a.position.y = 0; P.frozen = false; return; }
  // #skip (tests, quick starts): no animation – she simply stands by the bed and can move at once
  if (F.flags && F.flags.skip) { onBed = false; if (a) a.position.y = 0; if (T.inside()) P.teleport(off.x, off.z); P.frozen = false; return; }
  try {
    await sleep(o2ms(0.5));
    if (!T.inside()) return;
    if (F.sfx.boing) F.sfx.boing();
    let gone = false;                                   // a teleport / door / map ride during the hop wins
    await F.T.tween(650, k => { if (gone || !T.inside()) { gone = true; return; } P.pos.x = top.x + (off.x - top.x) * k; P.pos.z = top.z + (off.z - top.z) * k; if (a) a.position.y = 0.75 * (1 - k) + Math.sin(k * Math.PI) * 0.9; });
    F.FX.burst(V3(off.x, (off.y || 0) + 0.2, off.z), { n: 10, colors: [0xffffff, 0xfff0a0], speed: 0.8, up: 0.8, life: 0.8, size: 0.08 });
  } catch (e) { console.error('[tower] hop', e); } finally { onBed = false; if (a) a.position.y = 0; P.frozen = false; }
};
function o2ms(sec) { return sec * 1000; }
// bedtime: she lands on the cloud bed (after the cloud ride / dip)
T.toBed = async function () {
  let ok = false;
  T.morning = false;                                     // no «Gå ut døra!» at bedtime
  try {
    if (real()) { const top = T.bedTop(); await F.Bld.enter('tarn', { at: { f: 0, x: top.x, z: top.z }, dip: false, snap: true }); ok = T.inside(); if (ok) { const off = T.bedSpot(); F.Player.teleport(off.x, off.z); } }
    else if (legacyRoom() && F.Castle.enter) { F.Castle.enter('fetarn'); ok = F.Space.cur === 'in'; }
  } catch (e) { console.error('[tower] toBed', e); }
  F.emit('dayFlow', 'bed');
  return ok;
};

/* ================================================================== the morning in the tower: no nagging (natural audit D8)
   Any input (a tap anywhere, a key, the wheel) and any walk resets the idle clock. Once she has played that morning (pressed a thing,
   opened the wand / Trylleboka / the album, cast, a task) there is no hint at all until the next morning – she is busy, not lost.
   - she has never been out (the day-1 door hint; normally the onboarding shows the door): ONE spoken «Gå ut døra!» + the sparkle trail
     after NUDGE_S of complete idleness, said once, ever;
   - otherwise ONE soft glow at the way out of this room (the UT mat; upstairs the stairs) after GLOW_S of complete idleness, once per
     morning, no line, no «Se etter ordet ut!».
   The building engine's own 20 s idle glow stays off in the tower while the morning runs (F.Bld.idleHelpOff). */
const NUDGE_S = 10, GLOW_S = 30;
let idle = 0, nudges = 0, glows = 0, played = false, hintDone = false;
const still = () => { idle = 0; };
const playedNow = () => { idle = 0; if (T.morning) played = true; };
F.on('goTo', still);
['press', 'cast', 'wandOpen', 'bookOpened', 'albumOpened', 'taskStart', 'mailboxOpen'].forEach(ev => F.on(ev, playedNow));
try { addEventListener('pointerdown', still, true); addEventListener('keydown', still, true); addEventListener('wheel', still, { capture: true, passive: true }); } catch (e) { /* no DOM */ }
F.on('dayFlow', s => { if (s === 'wake') { idle = 0; played = false; hintDone = false; } if (s === 'bed') T.morning = false; });
F.on('bedtime', () => { T.morning = false; });
async function trailToExit() {
  if (real() && F.Bld.guideOut) { F.Bld.guideOut({ quiet: true }); return; }          // the engine's trail knows the stairs
  const p = T.exitPos(); if (!p) return;
  const P = F.Player.pos, n = Math.max(4, Math.round(Math.hypot(p.x - P.x, p.z - P.z) / 0.7));
  for (let i = 1; i <= n && T.inside(); i++) { const k = i / n; F.FX.sparkle(V3(P.x + (p.x - P.x) * k, p.y + 0.15, P.z + (p.z - P.z) * k)); await sleep(70); }
  const ring = F.FX.ring ? F.FX.ring(V3(p.x, p.y + 0.05, p.z)) : null; void ring;
}
T.nudge = async function () { nudges++; trailToExit(); await say('home_gaut'); };
// the soft glow: three silent pulses at the way out of this room
T.glowWay = function () {
  glows++;
  if (real() && F.Bld.glowWay && F.Bld.glowWay(3)) return true;
  const p = T.exitPos(); if (!p) return false;
  for (let i = 0; i < 3; i++) F.T.timeout(() => { if (T.inside()) F.FX.sparkle(V3(p.x, p.y + 0.6, p.z), 0xffe066); }, i * 1600);
  return true;
};
F.on('tick', dt => {
  if (!T.morning || played || hintDone || !T.inside() || (F.Onboard && F.Onboard.active)) return;
  const wand = F.Wand && F.Wand.isOpen && F.Wand.isOpen();
  if (F.Player.moving || F.Task.current || wand || (F.UI.isOpen && F.UI.isOpen()) || (F.Shell && F.Shell.screen) || (F.Bld && F.Bld.busy)) { idle = 0; return; }
  if (F.Player.frozen || F.Speech.busy()) return;        // hold (the hop from the bed, a line playing)
  idle += dt;
  const h = H();
  if (!h.out && !h.nudged) { if (idle >= NUDGE_S) { hintDone = true; h.nudged = true; F.store(); T.nudge(); } }
  else if (idle >= GLOW_S) { hintDone = true; T.glowWay(); }
});
T.idle = () => ({ idle: +idle.toFixed(1), played, hintDone, nudges, glows });
F.on('ready', () => { if (F.Bld) F.Bld.idleHelpOff = () => T.morning && T.inside(); });

/* ================================================================== debug */
F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.tower = () => ({ real: real(), inside: T.inside(), morning: T.morning, mail: T.mail.length, nudges, glows, played, look: T.lastLook || null, delivered: delivered(), towerOut: !!(F.save.today && F.save.today.towerOut),
    pos: [+F.Player.pos.x.toFixed(2), +F.Player.pos.z.toFixed(2)], space: F.Space.cur, bld: F.Bld && F.Bld.cur, f: F.Bld && F.Bld.f, furnished: !!T.furnished });
  F.dbg.towerWake = async () => { await T.wake(); F.debug.frames(3); return F.dbg.tower(); };
  F.dbg.towerOut = async () => { await T.goOut(); F.debug.frames(3); return F.dbg.tower(); };
  F.dbg.towerIn = async () => { await T.goIn(); F.debug.frames(3); return F.dbg.tower(); };
});
})();
