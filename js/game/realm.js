/* Feslottet – WP3 REALM: the growing world (DESIGN2 §3.2–3.8). Owns F.save.realm.
   Sites: deterministic from the seed only (never from the save): every region cell (i, j) with j ≤ 2 and 1 ≤ ring ≤ 9 is a candidate,
     sorted by (ring, HH(i, j, 31)); kingdom k takes the first free, non-adjacent candidate within rings minRing..minRing+2 whose biome
     matches (strand ⇔ beach row j = 2), else (second pass) the first free non-adjacent one with ring ≥ minRing, biome FORCED.
     Each site reserves its footprint (W.reserve 'rk_<id>', 60 × 50 m, flat, cobbled plaza) so nothing else is ever generated there.
   States: site → appeared → found (within 40 m of the gate) → friend (F.RQuest.friend(id), WP8).
     F.save.realm = {appeared:{id:day}, found:{id:day}, goodSince, lastDay, today, said:{}, lit, crest:{id:1}}; a fresh or old save starts
     with K1 + K2 appeared (lit = the kingdom the light was last shown for; crest = found crests still to fly into Kart).
     The next kingdom (lowest k still 'site') appears when goodSince ≥ 25 first-try answers, the newest appeared kingdom is found,
     < 2 appearances today, the special gates hold (krystall: ≥ 6 found; regnbue: all 9 others friends) and she is outdoors, idle.
     Checked 4 s after taskEnd, on bldLeft and on dayStart. Ceremony ≤ 6 s: realm_nytt, F.R.look toward the site while its pillar rises,
     'realmAppeared'; within 120 m the building site turns into the castle with FX.assemble.
   Lights (clarity plan 12.10. §3.6, section 4): at most ONE light, only for a kingdom she has not found yet – a DOM light with its crest
     at the top edge of the screen in its bearing (play camera); the real translucent 3D pillar only in a camera look (the day-1 look,
     the appearance ceremony). Found: the light goes out and, after the arrival ceremony, the crest flies into the Kart button.
   Royal interiors: plan 'rk_<id>' (F.Bld.register, WP1 engine): one floor, cells in realm.rooms order, 'inngang' = r_hallen with exit
     'hoved' → the keep door; every other room gets a natural number 1, 2, 3 … along the floor (v5); shells recoloured by opts.style.
   API (DESIGN2 §9.2): F.Realm = { list(), get(id), siteAt(i,j), at(x,z), state(id), canAppear(), next(), appear(id) -> Promise,
     ensure(id) -> Promise, gate(id), door(id), spot(id, name), plan(id), sites(), footprint(id), sayWelcome(id)
     + (clarity §3.0) edge (getter: the .realm-edge element or null), edgeInfo(), lightId(), crestFly(id), crestLast }
   Events: realmAppeared(id) realmFound(id) realmLoaded(id) realmUnloaded(id) realmCrest(id) (the crest landed on Kart).
   Debug (F.on('ready')): F.dbg.realmAppear(), F.dbg.realmGo(id), F.dbg.realmFind(id), F.dbg.realmGood(n).
   v5c WP-Q: building sites are the home of F60 Klosstårnet / F59 Voksetårnet (rk_bygg tap → F.OBJ.home, its quiet / pacing rules;
   Realm.siteHomes counts them); the builders' wish runs the 'bygg' story slot (F.Quest.slotItem) before the old block counting. */
(function () {
'use strict';
const F = window.F, U = F.U;
const REALMS = () => (F.REALMS && F.REALMS.length ? F.REALMS : []);
const realmOf = id => (F.REALMS && F.REALMS.get ? F.REALMS.get(id) : REALMS().find(r => r.id === id)) || null;
const FOOT = () => (F.CastleGen && F.CastleGen.FOOT) || { x0: -30, z0: -25, x1: 30, z1: 25 };
const GOOD_NEED = 25, FOUND_R = 40, DAY_CAP = 2;
// speech guard (W2): a realm_ line is only spoken once its template is registered and its slot is in the set – never a BAD SAY
// (lines_world.js registers them at load; boot-time / early-tick calls before that, or a castle name missing from REALMS, stay silent)
const sayWarned = {};
const sayOk = (id, slots) => { let err; try { err = !(F.TPL && F.TPL.has(id)) ? 'not registered' : F.TPL.validate(id, slots, ''); } catch (e) { err = String(e); } if (err && !sayWarned[id]) { sayWarned[id] = 1; console.warn('[Realm] skipped line ' + id + ': ' + err); } return !err; };
const SAYR = (id, slots) => sayOk(id, slots) ? F.SAY(id, slots) : Promise.resolve(false);
const SAYFR = (id, slots) => sayOk(id, slots) ? F.SAYF(id, slots) : Promise.resolve(false);

/* =====================================================================================================================
   1. Sites
   ===================================================================================================================== */
let SITES = null, SITES_SEED = null;
function computeSites() {
  const W = F.W;
  if (!W || !W.cellBase || !W.regionHash) return { byId: {}, byCell: new Map(), list: [] };
  if (SITES && SITES_SEED === W.seed && SITES.n === REALMS().length) return SITES;
  const cands = [];
  for (let j = -9; j <= 2; j++) for (let i = -9; i <= 9; i++) {
    const ring = Math.max(Math.abs(i), Math.abs(j));
    if (ring < 1 || ring > 9) continue;
    cands.push({ i, j, ring, h: W.regionHash(i, j, 31) });
  }
  cands.sort((a, b) => a.ring - b.ring || a.h - b.h);
  const used = [];
  const adj = c => used.some(u => Math.max(Math.abs(u.i - c.i), Math.abs(u.j - c.j)) <= 1);
  const out = { byId: {}, byCell: new Map(), list: [], n: REALMS().length };
  for (const K of REALMS()) {
    const strand = K.biome === 'strand';
    let pick = null, forced = false;
    for (const c of cands) {
      if (c.used || c.ring < K.minRing || c.ring > K.minRing + 2 || adj(c)) continue;
      if ((c.j === 2) !== strand) continue;
      if (K.biome && !strand && W.cellBase(c.i, c.j).biome !== K.biome) continue;
      pick = c; break;
    }
    if (!pick) for (const c of cands) {
      if (c.used || c.ring < K.minRing || adj(c)) continue;
      if ((c.j === 2) !== strand) continue;
      pick = c; forced = !!K.biome && !strand; break;
    }
    if (!pick) continue;
    pick.used = true; used.push(pick);
    const b = W.cellBase(pick.i, pick.j), biome = (K.biome && !strand) ? K.biome : b.biome;
    const s = { id: K.id, k: K.k, i: pick.i, j: pick.j, ring: pick.ring, x: b.x, z: b.z, regionId: 'r_' + pick.i + '_' + pick.j,
      biome, forced: forced && b.biome !== K.biome, y: W.siteLevel ? W.siteLevel(pick.i, pick.j, b, biome) : 0.25 };
    out.byId[K.id] = s; out.byCell.set(pick.i + ',' + pick.j, K.id); out.list.push(s);
  }
  SITES = out; SITES_SEED = W.seed;
  reserveAll();
  return SITES;
}
// the footprint of every site is reserved (flat plaza) from the start, whatever its state – nothing can ever be lost there
const LAWN = { snohaugen: 0xeef4ff, strand: 0xf3dfae };
function reserveAll() {
  const W = F.W, Fp = FOOT();
  for (const s of SITES.list) {
    const R = realmOf(s.id), lay = F.CastleGen && F.CastleGen.layout ? F.CastleGen.layout(R) : null;
    const lawn = LAWN[s.biome] || 0x8ed36c, cob = [0xe8dcc4, 0xd8ccb4], path = 0xe0c896;
    const wallR = lay && lay.wall, keep = lay && lay.keep;
    const color = (x, z) => {
      const lx = x - s.x, lz = z - s.z, ix = Math.floor(x), iz = Math.floor(z);
      if (stateOf(s.id) === 'site') {                                                                         // building site: lawn + paths
        if ((Math.abs(lx) < 1.6 && lz > 9) || (lz > 12.5 && lz < 15.5 && Math.abs(lx) > 15)) return path;
        if (Math.abs(lx) < 15 && lz > -14 && lz < 10) return ((ix + iz) & 3) ? 0xb08860 : 0xa07a54;         // the dug plot
        return LAWN[s.biome] ? lawn : (((ix >> 2) + (iz >> 2)) & 1 ? 0x8ed36c : 0x86cc66);
      }
      if (lz > 9 && lz < 24 && Math.abs(lx) < 13) return cob[(ix + iz) & 1];                              // market plaza
      if (Math.abs(lx) < 2.2 && lz > -3) return cob[(ix + iz) & 1];                                         // gate path to the door
      if (lz > 12 && lz < 16 && Math.abs(lx) < 31) return path;                                             // side paths to the E/W ports
      if (wallR && keep && lz > keep.z1 && lz < keep.z1 + 9 && Math.abs(lx) < keep.x1 + 6.5) return ((ix >> 1) + (iz >> 1)) & 1 ? 0xf1e8d6 : 0xe2d6bf;   // courtyard
      return (LAWN[s.biome] ? lawn : (((ix >> 2) + (iz >> 2)) & 1 ? 0x8ed36c : 0x86cc66));
    };
    W.reserve({ name: 'rk_' + s.id, realm: s.id, x0: s.x + Fp.x0, z0: s.z + Fp.z0, x1: s.x + Fp.x1, z1: s.z + Fp.z1, y: s.y, blend: 12, noGen: true, color });
  }
}
function sites() { return computeSites(); }
const stateOf = id => { try { return state(id); } catch (e) { return null; } };
function site(id) { return sites().byId[id] || null; }

/* =====================================================================================================================
   2. State (F.save.realm)
   ===================================================================================================================== */
function S() {
  let s = F.save.realm;
  if (!s || typeof s !== 'object') {
    const day = F.save.day || 1;
    s = F.save.realm = { appeared: {}, found: {}, goodSince: 0, lastDay: null, today: 0, said: {} };
    for (const R of REALMS()) if (R.k <= 2) s.appeared[R.id] = day;
    F.store();
  }
  s.appeared = s.appeared || {}; s.found = s.found || {}; s.said = s.said || {};
  if (s.goodSince == null) s.goodSince = 0;
  return s;
}
const isFriend = id => !!(F.RQuest && F.RQuest.friend && (() => { try { return F.RQuest.friend(id); } catch (e) { return false; } })());
function state(id) {
  if (!site(id)) return null;
  const s = S();
  if (s.appeared[id] == null) return 'site';
  if (isFriend(id)) return 'friend';
  if (s.found[id] != null) return 'found';
  return 'appeared';
}
const awake = id => { const st = state(id); return st === 'appeared' || st === 'found' || st === 'friend'; };
function newest() {
  const s = S(); let best = null;
  for (const R of REALMS()) if (s.appeared[R.id] != null && (!best || R.k > best.k)) best = R;
  return best;
}
function next() {
  for (const R of REALMS()) if (site(R.id) && state(R.id) === 'site') return R.id;
  return null;
}
function gateOk(R) {
  const s = S();
  if (R.gate === 'found6' || R.id === 'krystall') return Object.keys(s.found).filter(id => s.appeared[id] != null).length >= 6;
  if (R.gate === 'friends9' || R.id === 'regnbue') return REALMS().filter(r => r.id !== R.id).every(r => isFriend(r.id));
  return true;
}
// rule only (no situation): goodSince, newest found, day cap, special gates
function ruleOk(o) {
  o = o || {};
  const s = S(), id = next(); if (!id) return false;
  const R = realmOf(id); if (!R) return false;
  const day = F.save.day || 1;
  const today = s.lastDay === day ? s.today : 0;
  if (!o.force) {
    if (s.goodSince < GOOD_NEED) return false;
    const nw = newest(); if (nw && s.found[nw.id] == null) return false;
    if (today >= DAY_CAP) return false;
  }
  return gateOk(R);
}
function situationOk() {
  if (F.Space && F.Space.cur !== 'out') return false;
  if (F.Task && F.Task.current) return false;
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return false;
  if (F.Player && F.Player.frozen) return false;
  if (busy) return false;
  return true;
}
function canAppear() { return ruleOk() && situationOk(); }
let busy = false;
function check() {
  if (!F.booted || busy) return false;
  if (!canAppear()) return false;
  const id = next(); if (!id) return false;
  appear(id);
  return true;
}

/* ---- the ceremony */
async function appear(id, o) {
  o = o || {};
  const R = realmOf(id), st = site(id);
  if (!R || !st || awake(id)) return false;
  busy = true;
  try {
    const s = S(), day = F.save.day || 1;
    if (s.lastDay !== day) { s.lastDay = day; s.today = 0; }
    s.appeared[id] = day; s.today++; s.goodSince = 0;
    F.store();
    relocateAdds();
    const P = F.Player && F.Player.pos ? F.Player.pos : { x: 0, z: 0 };
    const d = Math.hypot(st.x - P.x, st.z - P.z);
    const outside = F.Space && F.Space.cur === 'out';
    if (outside && !o.silent) SAYR('realm_nytt');
    beam(id).rise = 0;
    glanceId = id; shownAcc = 0;                     // the new kingdom's pillar is shown first (and big) during the glance
    // glance toward the site: only ≈ 45 m out (F.R.look leans 70 % toward it; further would show the unloaded edge of the world)
    const lookAt = (() => { const k = Math.min(1, 45 / Math.max(1, d)); return { x: P.x + (st.x - P.x) * k, y: 4, z: P.z + (st.z - P.z) * k }; })();
    const near = outside && d < 120;
    // ≤ 6 s in all: the glance, the rising beam and (near) the cube assembly run at the same time.
    // fix wave (review:art #2): the view turns toward the site's bearing and flattens (pitch 0.32) so the rising pillar stands on the
    // horizon in the middle of the screen; the yaw goes back when the glance ends (a tap ends it early, as every glance)
    let look = Promise.resolve(true);
    if (outside && F.R && F.R.look && !o.silent) {
      const c = F.R.cam, yaw0 = c.yawGoal;
      let yT = Math.atan2(-(st.x - P.x), -(st.z - P.z));
      if (c.mode === 'out' && d > 1) { yT += Math.PI * 2 * Math.round((yaw0 - yT) / (Math.PI * 2)); c.yawGoal = yT; } else yT = yaw0;
      look = F.R.look(lookAt, { ms: 3600, dist: 50, pitch: 0.32 }).then(r => { if (c.yawGoal === yT) c.yawGoal = yaw0; return r; });
    }
    const swap = near ? assembleSwap(id) : (reloadSite(id), Promise.resolve());
    if (F.sfx && F.sfx.magic) F.sfx.magic();
    if (F.FX && F.FX.sparkle && outside) { try { F.FX.sparkle(new THREE.Vector3(lookAt.x, (F.W ? F.W.groundY(P.x, P.z) : 0) + 2, lookAt.z)); } catch (e) { /* far */ } }
    await F.T.tween(2000, k => { beam(id).rise = U.smooth(k); });
    // clarity §3.6.3 (R7): no «realm_lyset» here any more – realm_nytt already said it, the rising pillar shows the rest
    F.emit('realmAppeared', id);
    await Promise.race([Promise.all([look, swap]), F.T.sleep(3200)]);
    return true;
  } finally { busy = false; F.T.timeout(() => { if (glanceId === id && !(F.R.cam && F.R.cam.look)) glanceId = null; }, 2500); }
}
// within 120 m: the building site vanishes and the keep assembles from cubes in its place, then the whole castle loads
const hold = {};
async function assembleSwap(id) {
  const st = site(id), R = realmOf(id);
  hold[id] = true; reloadSite(id);
  let tmp = null;
  try {
    const kp = F.CastleGen.parts(R).find(p => p.id === 'cg_keep');
    if (kp && F.FX && F.FX.assemble) {
      tmp = F.VOX.make(kp.id, kp.opts);
      tmp.position.set(st.x + kp.x, st.y, st.z + kp.z);
      F.R.scene.add(tmp);
      await Promise.race([F.FX.assemble(kp.id, kp.opts, tmp, tmp.position.clone(), { ms: 1600, max: 380 }), F.T.sleep(2600)]);
    }
  } catch (e) { console.warn('[Realm] assemble', e); }
  hold[id] = false; reloadSite(id);
  if (tmp) F.T.timeout(() => { if (tmp.parent) tmp.parent.remove(tmp); }, 700);
}
function reloadSite(id) {
  const st = site(id), Fp = FOOT();
  if (!st || !F.W) return;
  if (F.W.reloadRect) F.W.reloadRect(st.x + Fp.x0 - 6, st.z + Fp.z0 - 6, st.x + Fp.x1 + 6, st.z + Fp.z1 + 6);
}

/* ---- old saves: bought / placed things inside a kingdom footprint move to the nearest free spot outside it (never lost) */
function relocateAdds() {
  const ch = F.save.chunks; if (!ch || !F.W) return 0;
  const Fp = FOOT(); let moved = 0;
  const inside = (x, z) => { for (const s of sites().list) if (x > s.x + Fp.x0 - 1 && x < s.x + Fp.x1 + 1 && z > s.z + Fp.z0 - 1 && z < s.z + Fp.z1 + 1) return s; return null; };
  const moves = [];
  for (const key in ch) {
    const d = ch[key]; if (!d || !Array.isArray(d.add)) continue;
    for (const a of d.add.slice()) {
      const s = inside(a.x, a.z); if (!s) continue;
      // the nearest edge of the footprint (+2.5 m) that is not deep water
      const lx = a.x - s.x, lz = a.z - s.z;
      const opts = [[s.x + Fp.x0 - 2.5, a.z, Math.abs(lx - Fp.x0)], [s.x + Fp.x1 + 2.5, a.z, Math.abs(Fp.x1 - lx)], [a.x, s.z + Fp.z0 - 2.5, Math.abs(lz - Fp.z0)], [a.x, s.z + Fp.z1 + 2.5, Math.abs(Fp.z1 - lz)]].sort((p, q) => p[2] - q[2]);
      let to = null;
      for (const [x, z] of opts) { if (!F.W.deep || !F.W.deep(x, z)) { to = [x, z]; break; } }
      if (!to) to = [opts[0][0], opts[0][1]];
      moves.push({ key, a, x: +to[0].toFixed(2), z: +to[1].toFixed(2) });
    }
  }
  for (const m of moves) {
    const d = ch[m.key], i = d.add.indexOf(m.a); if (i < 0) continue;
    d.add.splice(i, 1);
    m.a.x = m.x; m.a.z = m.z; m.a.moved = 'realm';
    const nk = F.W.chunkKeyAt(m.x, m.z), nd = F.W.diff(nk);
    nd.add.push(m.a);
    if (m.a.kind === 'cast' && F.save.castList) { const ci = F.save.castList.findIndex(c => c[1] === m.a.uid); if (ci >= 0) F.save.castList[ci][0] = nk; }
    // a loaded copy follows
    const live = F.Things && F.Things.list.find(t => t.addUid === m.a.uid);
    if (live) { live.x = m.x; live.z = m.z; if (live.obj) { live.obj.position.x = m.x; live.obj.position.z = m.z; live.obj.position.y = F.W.groundY(m.x, m.z); } }
    moved++;
  }
  if (moved) { F.store(); console.log('[Realm] moved ' + moved + ' saved things out of kingdom footprints'); }
  return moved;
}

/* =====================================================================================================================
   3. Discovery: found, «Der er …!», market line, welcome
   ===================================================================================================================== */
const said = (key) => { const s = S(), day = F.save.day || 1; if (s.said[key] === day) return true; s.said[key] = day; return false; };
function gate(id) { const st = site(id); if (!st) return null; const L = F.CastleGen.layout(realmOf(id)); return { x: st.x + L.gate.x, z: st.z + L.gate.z }; }
function door(id) { const st = site(id); if (!st) return null; const L = F.CastleGen.layout(realmOf(id)); return { x: st.x + L.doorOut.x, z: st.z + L.doorOut.z }; }
// the narrator welcome (once a day per kingdom) – only after the first arrival: on that one the king himself says «Velkommen til …!» (WP7)
function sayWelcome(id) { const R = realmOf(id), st = state(id); if (!R || (st !== 'found' && st !== 'friend') || said('w:' + id)) return Promise.resolve(false); return SAYFR('realm_velkommen', { slott: R.castle }); }
let acc = 0;
F.on('tick', dt => {
  acc += dt; if (acc < 0.5) return; acc = 0;
  if (!F.booted || !F.Space || F.Space.cur !== 'out' || !F.Player) return;
  const P = F.Player.pos, s = S();
  for (const st of sites().list) {
    const d0 = Math.hypot(st.x - P.x, st.z - P.z); if (d0 > 140) continue;
    const R = realmOf(st.id), stt = state(st.id);
    if (stt === 'site') { continue; }
    if (stt === 'appeared' && d0 < 110 && !s.said['der:' + st.id] && !(F.Task && F.Task.current) && R && sayOk('realm_der', { slott: R.castle })) { s.said['der:' + st.id] = 1; SAYFR('realm_der', { slott: R.castle }); }
    const g = gate(st.id);
    // v5 (#32): the first-arrival ceremony waits until no task / encounter / panel runs (re-checked every 0.5 s)
    if (s.found[st.id] == null && Math.hypot(g.x - P.x, g.z - P.z) < FOUND_R && !(F.Royals && F.Royals.greetBusy && F.Royals.greetBusy())) found(st.id);
    // the market line once per day per kingdom
    const mk = { x: st.x, z: st.z + 17 };
    if (Math.hypot(mk.x - P.x, mk.z - P.z) < 8 && !(F.Task && F.Task.current) && !said('mk:' + st.id)) SAYFR('realm_marked');
  }
});
function found(id) {
  const s = S(); if (s.found[id] != null || !awake(id)) return;
  s.found[id] = F.save.day || 1;
  (s.crest = s.crest || {})[id] = 1;                // clarity §3.6.3: its crest flies into Kart once the arrival ceremony is over
  F.store();
  if (F.sfx && F.sfx.levelup) F.sfx.levelup();
  // the coins come from the castle gate she has just reached (honest coins: a visible source, not the middle of the screen)
  if (F.Eco && F.Eco.add) { try { const g = gate(id); F.Eco.add(10, { reason: 'realmFound', from: g && window.THREE ? new THREE.Vector3(g.x, (F.W && F.W.groundY ? F.W.groundY(g.x, g.z) : 0) + 2, g.z) : null }); } catch (e) { /* stub */ } }
  foundT = F.T.now;
  F.emit('realmFound', id);
  glanceCastle(id);
}
/* fix wave (review:art #1): the kingdom castle is framed as a castle.
   - a landmark frame spot per awake kingdom (core F.R.frameSpots, as the home castle): standing at the gate / market / signpost in
     front of the castle, the camera pulls back and flattens so the whole castle reads with the fairy low in the view;
   - on the first arrival (realmFound) a 3 s glance at the castle (same treatment as the home-castle glance from the tower). */
function castleBox(id) {
  const st = site(id), R = realmOf(id); if (!st || !R || !F.CastleGen || !F.CastleGen.spec) return null;
  const S = F.CastleGen.spec(R), K = S.keep, KZ = F.CastleGen.KZ != null ? F.CastleGen.KZ : -2;
  return { x: st.x, z: st.z + KZ - K.d / 2, hx: K.w / 2 + (S.tr || 3), hz: K.d / 2 + 1, h: K.h + (S.th || 4) + 6, y: st.y || 0 };
}
function frameSpot(id) {
  const R = F.R; if (!R || !Array.isArray(R.frameSpots) || !awake(id)) return;
  const key = 'rk_' + id; if (R.frameSpots.some(s => s.id === key)) return;
  const b = castleBox(id); if (!b) return;
  R.frameSpots.push({ id: key, x: b.x, z: b.z, hx: b.hx, hz: b.hz, range: 44, D: 44, elev: 0.5, off: 0.24 });
}
function frameSpotsAll() { for (const st of sites().list) if (awake(st.id)) frameSpot(st.id); }
F.on('realmAppeared', id => frameSpot(id));
F.on('ready', () => { try { frameSpotsAll(); } catch (e) { console.warn('[Realm] frame spots', e); } });
function glanceCastle(id) {
  if (!F.R || !F.R.look || !F.Space || F.Space.cur !== 'out' || !F.R.cam || F.R.cam.look || F.R.cam.focus || F.R.cam.mode !== 'out' || (F.Task && F.Task.current)) return Promise.resolve(false);
  const b = castleBox(id), P = F.Player && F.Player.pos; if (!b || !P) return Promise.resolve(false);
  // F.R.look leans 70 % toward its target: aim past the castle centre so the view centres on it (and a little up, on the towers)
  const tgt = { x: P.x + (b.x - P.x) / 0.7, y: b.y + 30, z: P.z + (b.z - P.z) / 0.7 };
  return F.R.look(tgt, { ms: 3200, dist: 58, pitch: 0.42 });
}
// the narrator welcome on entering a kingdom region (WP10's banner may take this over: F.Realm.autoWelcome = false)
F.on('regionEntered', r => {
  if (!r || F.Realm.autoWelcome === false) return;
  const id = r.realm || (sites().byCell.get(r.cellX + ',' + r.cellY));
  if (id && awake(id)) sayWelcome(id);
});

/* =====================================================================================================================
   4. Beams (appeared / found / friend kingdoms)
   ===================================================================================================================== */
const BEAMS = {};
let beamRoot = null;
function emblemCanvas(R) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const col = '#' + new THREE.Color(F.PAL[R.pal && R.pal.flag] || 0xff7fb0).getHexString();
  g.fillStyle = col; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
  const rows = (F.CastleGen.EMB || {})[R.emblem] || (F.CastleGen.EMB || {}).heart || [];
  const px = 8, ox = 32 - rows[0].length * px / 2, oy = 32 - rows.length * px / 2;
  rows.forEach((row, i) => { for (let j = 0; j < row.length; j++) { const ch = row[j]; if (ch === '.') continue; g.fillStyle = ch === 'O' ? '#fff3a0' : ch === 'R' ? '#e8484f' : ch === 'Y' ? '#ffd84a' : ch === 'G' ? '#4fbf5a' : '#ffffff'; g.fillRect(ox + j * px, oy + i * px, px, px); } });
  return cv;
}
const EMBLEM_TEX = {};   // lead: one cached texture per kingdom (was rebuilt on every beam/sign rebuild → slow GPU texture leak)
function emblemTexture(R) { const k = R && R.id || '?'; return EMBLEM_TEX[k] || (EMBLEM_TEX[k] = new THREE.CanvasTexture(emblemCanvas(R))); }
// a small emblem picture for signpost plaques and the castle name plaque (DESIGN2 §3.6)
function emblemIcon(id, px) {
  const R = realmOf(id); if (!R) return null;
  const cv = emblemCanvas(R); px = px || 22;
  cv.className = 'realm-emblem';
  cv.style.cssText = 'width:' + px + 'px;height:' + px + 'px;vertical-align:middle;margin-right:5px;margin-top:-3px;display:inline-block';
  return cv;
}
function beam(id) {
  if (BEAMS[id]) return BEAMS[id];
  const R = realmOf(id), st = site(id);
  if (!beamRoot) { beamRoot = new THREE.Group(); beamRoot.name = 'realmBeams'; F.R.scene.add(beamRoot); }
  const col = new THREE.Color(F.PAL[R.pal && R.pal.flag] || 0xff7fb0);
  const g = new THREE.Group(); g.name = 'beam_' + id;
  const H = 60;
  // soft column: alpha rises from the ground over 4 m, then fades toward the top (4-component vertex colours = vertex alpha)
  const grad = (g, a0) => { const pos = g.attributes.position, n = pos.count, c = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const y = pos.getY(i), a = y < 0.5 ? 0 : (y < 4 ? 0.7 : U.lerp(1, 0.12, U.clamp((y - 4) / (H - 4), 0, 1))); c[i * 4] = c[i * 4 + 1] = c[i * 4 + 2] = 1; c[i * 4 + 3] = a * a0; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 4)); return g; };
  const ring = (r0, r1, seg) => { const g = new THREE.CylinderGeometry(r1, r0, H, seg, 6, true); g.translate(0, H / 2, 0); return grad(g, 1); };
  const geo = ring(2.0, 1.5, 18);
  const shell = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const cgeo = ring(0.55, 0.4, 10);
  const core = new THREE.Mesh(cgeo, new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.5), vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emblemTexture(R), transparent: true, depthWrite: false, fog: false }));
  sp.position.y = H + 5; sp.scale.setScalar(9);
  shell.renderOrder = 5; core.renderOrder = 6; sp.renderOrder = 7;
  [shell, core, sp].forEach(m => { m.raycast = () => {}; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; });
  g.add(shell, core, sp);
  beamRoot.add(g);
  const b = BEAMS[id] = { id, g, shell, core, sp, rise: 1, x: st.x, z: st.z, y: st.y || 0 };
  return b;
}
/* The outdoor camera looks steeply down (pitch 0.92, FOV 38°): the ground is only visible ≈ 6–20 m beyond the fairy and the far plane
   is ≈ 156 m, so a column standing at a castle 300 m away is never on screen (and a pillar drawn closer seemed to stand on her garden).
   clarity plan 12.10. §3.6 (owner «realm») – a light means ONE thing: a kingdom she has not found yet.
   - Selection: only awake kingdoms still 'appeared' (not found), at most ONE: during a camera look the kingdom that just appeared (its
     ceremony) or the one the tower's «Se lyset!» look turns to (F.Tower.beamTarget, within 30° of the look's bearing) – any other look
     shows none; otherwise only a kingdom IN FRONT of her (≤ 80° from the view's bearing): the goal's kingdom when it is unfound, else
     the one she was shown last (F.save.realm.lit, any distance, kept to 85° – the light after the morning look is the one the look
     showed), else the nearest in front. With none in front the same order without the bearing (nothing shows until she turns).
   - Play camera (no F.R.cam.look): the 3D group stays hidden and a DOM light .realm-edge stands at the TOP EDGE of the screen in the
     kingdom's bearing: a 26·u × 90·u glow from the edge in its flag colour + its crest (40·u, centred 44·u down), a slow 2 s shimmer, under
     the HUD buttons (z 16, no taps). x = where the ground line from the fairy toward the kingdom crosses the crest's screen row (so a tap
     there flies her toward it), else W/2·(1 + tan(bearing)/tan(hFOV/2)); clamped between the purse / goal card (right edge + 16·u) and
     the top-right buttons (left edge − 16·u). It fades with the bearing (full ≤ 80°, gone ≥ 100°: a kingdom behind her is on the map),
     within 60–105 m of any OTHER awake castle (she is at a kingdom; its own castle never fades it – it leads her in until she has found
     it), under the calm gate (tasks, encounters, panels, the wand, a ride, title /
     bedtime, a hidden HUD) and while the place banner would touch it. A screen element: the same at every zoom. Its crest (a 56·u
     circle) takes a tap while it clearly shows: she flies along the kingdom's bearing (not into whatever stands under it on screen).
   - F.R.look (the day-1 look, the appearance ceremony): the real 3D pillar (foot on the ground line at the upper quarter, crest on top).
   - Found: the light goes out at once (no candidate any more). After the arrival ceremony (the castle glance, the royals' greeting, no
     task / panel / ride) the crest pops up over the castle and flies (700 ms, game time) into the Kart button, which bumps and glows
     ('new') until she opens the map. Pending flights are saved (F.save.realm.crest {id:1}) – a reload before it flew flies it later.
   API: F.Realm.edge -> the .realm-edge element while it shows, else null · F.Realm.edgeInfo() -> {id, x, op, nx, lo, hi} | null ·
   F.Realm.lightId() -> the selected kingdom | null · F.Realm.edgeWhy() -> why it is hidden | null · F.Realm.edgeTap() / edgeTaps() (a tap
   on its crest / how many) · F.Realm.crestFly(id) -> Promise · F.Realm.crestLast {id, x, y, mx, my} (tests).
   Event 'realmCrest'(id) when a crest lands on Kart. */
const _c = new THREE.Vector3(), _d = new THREE.Vector3(), _r = new THREE.Vector3(), _q0 = new THREE.Vector3(), _q1 = new THREE.Vector3();
let shown = new Set(), shownAcc = 0, gk = 0, gkT = 0, glanceId = null, foundT = -1e9, wasLooking = false;
const uu = () => (F.HUD && F.HUD.u) || 1;
// why the light may not show now (null = it may); beamsAllowed() / edgeAllowed() are the boolean forms
function beamsWhy() {
  const c = F.R.cam;
  if (c && c.look) return null;                                                                  // the appearance glance
  if (!c || c.mode !== 'out') return 'cam';
  if (c.focus) return 'focus';                                                                   // task stage framing, wand, cinematic
  if (F.Task && F.Task.current) return 'task';
  if (F.Befriend && F.Befriend.busy) return 'befriend';
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return 'panel';
  return null;
}
const beamsAllowed = () => !beamsWhy();
// the top-edge light also waits for a ride, the title / bedtime screens and a hidden HUD (it lives with the HUD)
function edgeWhy() {
  const w = beamsWhy(); if (w) return w;
  if (F.Travel && F.Travel.busy) return 'ride';
  if (F.Shell && F.Shell.screen) return 'screen';
  if (!F.HUD || !F.HUD.built || F.HUD.hidden) return 'hud';
  if (document.body.classList.contains('hud-task')) return 'hud-task';
  if (F.Wand && typeof F.Wand.isOpen === 'function') { try { if (F.Wand.isOpen()) return 'wand'; } catch (e) { /* partial */ } }
  return null;
}
const edgeAllowed = () => !edgeWhy();
Object.defineProperty(F, '_realmBeamGate', { value: () => gk, enumerable: false });
// the ground point (height gy) seen at NDC (nx, ny); null when that ray does not hit the ground in front of the camera
function groundAt(cam, nx, ny, gy, out) {
  out.set(nx, ny, 0.5).unproject(cam).sub(_c).normalize();
  if (out.y > -0.02) return null;
  const k = (gy - _c.y) / out.y;
  return out.multiplyScalar(k).add(_c);
}
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function goalRealm() {
  try { const g = F.Quest && F.Quest.goal ? F.Quest.goal() : null; const r = g && ((g.target && g.target.realm) || g.realm); if (r) return r; } catch (e) { /* no goal API */ }
  try { const q = F.Quest && F.Quest.target ? F.Quest.target() : null; return (q && q.realm) || null; } catch (e) { return null; }
}
// which kingdom gets the one light (≤ 1 s cache; a new glance or a look start / end re-picks at once)
const _v = new THREE.Vector3();
function pick(t, P, cam) {
  const L = F.R.cam && F.R.cam.look, looking = !!L;
  if (shownAcc && t - shownAcc < 1 && looking === wasLooking && !(glanceId && !shown.has(glanceId) && state(glanceId) === 'appeared')) return;
  shownAcc = t; wasLooking = looking;
  const unf = sites().list.filter(st => state(st.id) === 'appeared');
  const ok = id => !!id && unf.some(st => st.id === id);
  let id = null;
  if (ok(glanceId)) id = glanceId;
  else if (looking) {
    // a look shows a pillar only when it turns toward the kingdom the tower's «Se lyset!» look picked (F.Tower.beamTarget, within 30°
    // of the look's bearing); the castle glance before it, or a look at a found castle, shows none – the first light she sees is the
    // one Puff names
    const bt = F.Tower && F.Tower.beamTarget;
    if (ok(bt)) { const st = site(bt), la = Math.atan2(L.tx - P.x, L.tz - P.z); if (st && Math.abs(wrapA(Math.atan2(st.x - P.x, st.z - P.z) - la)) < 0.52) id = bt; }
  } else {
    // the play camera: a kingdom she can SEE in front of her (≤ 80° from the view's bearing – the camera turns only with Q / E): one
    // behind her must not hold the one light and leave the screen empty (12.10. verifier: seeds 3 / 4 / 9). Order: the goal's kingdom,
    // the one she was shown last (any distance: after «Se lyset!» the light is the one the look showed; it keeps it to 85°, so two near
    // the side of the view do not swap), the nearest. Nothing in front: the same order without the bearing (it shows nothing until
    // she turns, and the last one stays remembered)
    const s = S(), gr = goalRealm();
    cam.getWorldDirection(_v); const va = Math.atan2(_v.x, _v.z);
    const front = (k, lim) => { const st = site(k); return !!st && Math.abs(wrapA(Math.atan2(st.x - P.x, st.z - P.z) - va)) <= lim; };
    const A80 = 1.396, A85 = 1.484;
    const nearest = only => { let bd = 1e18, b = null; for (const st of unf) { if (only && !front(st.id, A80)) continue; const d = Math.hypot(st.x - P.x, st.z - P.z); if (d < bd) { bd = d; b = st.id; } } return b; };
    if (ok(gr) && front(gr, gr === s.lit ? A85 : A80)) id = gr;
    else if (ok(s.lit) && front(s.lit, A85)) id = s.lit;
    else id = nearest(true) || (ok(gr) ? gr : ok(s.lit) ? s.lit : nearest(false));
  }
  if (id) { const s = S(); if (s.lit !== id) { s.lit = id; F.store(); } }
  shown = new Set(id ? [id] : []);
}

/* ---- the top-edge light (DOM) */
const EDGE_CSS = '.realm-edge{position:fixed;left:0;top:0;width:calc(40px*var(--u,1));height:calc(90px*var(--u,1));z-index:16;pointer-events:none;display:none;will-change:transform,opacity}' +
  '.realm-edge .re-glow{position:absolute;left:50%;top:0;width:calc(26px*var(--u,1));height:100%;transform:translateX(-50%);border-radius:0 0 calc(13px*var(--u,1)) calc(13px*var(--u,1));' +
  'background:linear-gradient(180deg,var(--rc1) 0%,var(--rc2) 45%,rgba(255,255,255,0) 100%);box-shadow:0 0 calc(14px*var(--u,1)) var(--rc2);animation:reShim 2s ease-in-out infinite}' +
  '.realm-edge .re-core{position:absolute;left:50%;top:0;width:calc(8px*var(--u,1));height:78%;transform:translateX(-50%);border-radius:0 0 calc(4px*var(--u,1)) calc(4px*var(--u,1));' +
  'background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,0));animation:reShim 2s ease-in-out infinite reverse}' +
  '.realm-edge .re-halo{position:absolute;left:50%;top:calc(44px*var(--u,1));width:calc(66px*var(--u,1));height:calc(66px*var(--u,1));transform:translate(-50%,-50%);border-radius:50%;' +
  'background:radial-gradient(circle,rgba(255,255,255,.75) 0%,var(--rc2) 42%,rgba(255,255,255,0) 70%);animation:reShim 2s ease-in-out infinite}' +
  '.realm-edge .re-crest{position:absolute;left:0;top:calc(24px*var(--u,1));width:calc(40px*var(--u,1));height:calc(40px*var(--u,1));filter:drop-shadow(0 0 calc(5px*var(--u,1)) rgba(255,255,255,.95));animation:reBob 2s ease-in-out infinite}' +
  '.realm-edge .re-crest canvas,.realm-crest-fly canvas{width:100%;height:100%;display:block}' +
  '.realm-edge .re-tap{position:absolute;left:50%;top:calc(44px*var(--u,1));width:calc(56px*var(--u,1));height:calc(56px*var(--u,1));transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;-webkit-tap-highlight-color:transparent}' +
  '.realm-edge.tap .re-tap{pointer-events:auto;cursor:pointer}.realm-edge.hit .re-halo{animation:reHit .45s ease-out}' +
  '@keyframes reHit{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}40%{opacity:1;transform:translate(-50%,-50%) scale(1.35)}100%{opacity:.8;transform:translate(-50%,-50%) scale(1)}}' +
  '.realm-crest-fly{position:fixed;left:0;top:0;width:calc(72px*var(--u,1));height:calc(72px*var(--u,1));z-index:32;pointer-events:none;filter:drop-shadow(0 0 calc(10px*var(--u,1)) rgba(255,246,190,.95));transform-origin:50% 50%}' +
  '@keyframes reShim{0%,100%{opacity:.72}50%{opacity:1}}@keyframes reBob{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(3px*var(--u,1)))}}';
let edgeEl = null, edgeCrest = null, edgeId = null, edgeOp = 0, edgeX = null, edgeInfo = null, bnd = null, bndT = -1, bannerK = 1;
function edgeCss() { if (!document.getElementById('realm-edge-css')) { const s = document.createElement('style'); s.id = 'realm-edge-css'; s.textContent = EDGE_CSS; document.head.appendChild(s); } }
function edgeBuild() {
  if (edgeEl && edgeEl.isConnected) return edgeEl;
  edgeCss();
  edgeEl = document.createElement('div'); edgeEl.className = 'realm-edge';
  edgeEl.innerHTML = '<div class="re-glow"></div><div class="re-core"></div><div class="re-halo"></div><div class="re-crest"></div><div class="re-tap"></div>';
  edgeCrest = edgeEl.querySelector('.re-crest'); edgeId = null;
  edgeEl.querySelector('.re-tap').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); edgeTap(); });
  document.body.appendChild(edgeEl);
  return edgeEl;
}
/* a tap ON the light (its crest) flies her that way – along the kingdom's bearing, as far as the ground under the crest's row (12–45 m).
   Without it the tap went to whatever stood under the crest on screen (Fetårnet at the tower door: she went inside – 12.10. verifier).
   Only while it clearly shows (op ≥ 0.5) and she could fly anyway (F.Input.enabled, not frozen, the calm gate). */
let edgeGo = 25, edgeTapN = 0;
function edgeTap() {
  if (!edgeEl || !edgeInfo || edgeOp < 0.5 || edgeWhy()) return false;
  const I = F.Input, Pl = F.Player;
  if (!I || !I.enabled || !Pl || Pl.frozen || typeof Pl.goTo !== 'function') return false;
  const st = site(edgeInfo.id); if (!st) return false;
  const P = Pl.pos, dx = st.x - P.x, dz = st.z - P.z, dh = Math.hypot(dx, dz) || 1;
  const k = Math.min(U.clamp(edgeGo, 12, 45), Math.max(0, dh - 2));
  const x = P.x + dx / dh * k, z = P.z + dz / dh * k;
  edgeTapN++;
  edgeEl.classList.remove('hit'); void edgeEl.offsetWidth; edgeEl.classList.add('hit');
  if (F.sfx && F.sfx.click) { try { F.sfx.click(); } catch (e) { /* audio */ } }
  // the same signal as a ground tap (Puff's help, the first-tap bookkeeping): nothing was hit, she flies to that point
  try { F.emit('worldClick', { thing: null, point: new THREE.Vector3(x, P.y, z), realmEdge: edgeInfo.id }); } catch (e) { /* listener */ }
  Pl.goTo(x, z);
  return true;
}
function edgeHide() { edgeOp = 0; edgeInfo = null; if (edgeEl) edgeEl.style.display = 'none'; }
const rgba = (n, a) => { const c = new THREE.Color(n); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; };
function edgeSet(id) {
  if (edgeId === id) return;
  edgeId = id; edgeCrest.innerHTML = '';
  const R = realmOf(id); if (!R) return;
  const cv = emblemCanvas(R); cv.className = 'realm-emblem'; edgeCrest.appendChild(cv);
  const col = F.PAL[R.pal && R.pal.flag] || 0xff7fb0;
  edgeEl.style.setProperty('--rc1', rgba(col, 0.9)); edgeEl.style.setProperty('--rc2', rgba(col, 0.38));
  edgeEl.dataset.realm = id;
}
// a HUD element's rect while it is really there (shown, not faded out)
function hudRect(sel) {
  const e = document.querySelector(sel); if (!e || !e.isConnected) return null;
  const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null;
  const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null;
  return r;
}
// the free band at the top: right of the purse / goal card, left of the top-right buttons (re-read every 0.3 s)
function edgeBounds(t) {
  if (bnd && t - bndT < 0.3 && t >= bndT) return bnd;
  bndT = t;
  const u = uu(), half = 20 * u, gap = 16 * u;
  let L = 0, R = innerWidth;
  for (const sel of ['#hud .hud-purse', '#hud .hud-goal']) { const r = hudRect(sel); if (r) L = Math.max(L, r.right); }
  for (const sel of ['#hud .hud-book', '#hud .hud-kikkert', '#hud .hud-album', '#hud .hud-map']) { const r = hudRect(sel); if (r && r.top < 140 * u) R = Math.min(R, r.left); }
  bnd = { lo: L + gap + half, hi: R - gap - half, half };
  return bnd;
}
function drawEdge(t, dt, id, T, nearK) {
  const st = site(id), b = BEAMS[id];
  if (!st) { edgeHide(); return; }
  const cam = F.R.camera, rc = F.R.renderer.domElement.getBoundingClientRect(), u = uu();
  const fh = Math.hypot(_d.x, _d.z) || 1, fx = _d.x / fh, fz = _d.z / fh;
  _r.set(-fz, 0, fx);
  const dx = st.x - T.x, dz = st.z - T.z, dh = Math.hypot(dx, dz) || 1;
  const fw = (dx * fx + dz * fz) / dh, rt = (dx * _r.x + dz * _r.z) / dh;
  const ang = Math.atan2(Math.abs(rt), fw);
  const angK = U.clamp((1.75 - ang) / 0.35, 0, 1);                                  // full ≤ 80°, gone ≥ 100°
  // x: where the line from the fairy toward the kingdom crosses the crest's screen row on the ground
  const nyc = 1 - 2 * (44 * u) / Math.max(1, rc.height), gy = T.y || 0;
  const q0 = groundAt(cam, 0, nyc, gy, _q0), q1 = q0 && groundAt(cam, 1, nyc, gy, _q1);
  let nx;
  if (q0 && q1) {
    const f0 = (q0.x - T.x) * fx + (q0.z - T.z) * fz, l0 = (q0.x - T.x) * _r.x + (q0.z - T.z) * _r.z;
    const Lr = Math.max(0.5, (q1.x - q0.x) * _r.x + (q1.z - q0.z) * _r.z);
    nx = fw > 0.02 && f0 > 0.5 ? (f0 * rt / fw - l0) / Lr : (rt >= 0 ? 1e3 : -1e3);
    edgeGo = fw > 0.02 && f0 > 0.5 ? f0 / fw : 45;                                   // a tap on the crest: as far as that row's ground
  } else {
    edgeGo = 25;
    const hf = Math.tan(cam.fov * Math.PI / 360) * cam.aspect, a = Math.atan2(rt, fw);
    nx = Math.abs(a) < Math.PI / 2 - 0.01 ? Math.tan(a) / hf : (rt >= 0 ? 1e3 : -1e3);
  }
  const B = edgeBounds(t);
  if (B.lo > B.hi) { edgeHide(); return; }
  const x0 = rc.left + (U.clamp(nx, -50, 50) + 1) / 2 * rc.width, x = U.clamp(x0, B.lo, B.hi);
  // the place banner slides in at the top middle: the light steps back while it would touch it
  // (its real rect: also while it slides in or out – parked, it sits above the top edge)
  let bk = 1; const pl = document.querySelector('.hud-place');
  if (pl && (pl.classList.contains('on') || pl.getBoundingClientRect().bottom > 2)) { const r = pl.getBoundingClientRect(); if (r.width > 2 && r.bottom > 2 && r.top < 96 * u && x + B.half + 8 * u > r.left && x - B.half - 8 * u < r.right) bk = 0; }
  bannerK = bk >= bannerK ? Math.min(1, bannerK + dt * 2) : 0;                     // the banner arrives fast: step back at once
  const rise = b ? U.clamp(b.rise * 1.4, 0, 1) : 1;
  const want = gk * angK * nearK * rise * bannerK;
  if (edgeId && edgeId !== id && edgeOp > 0) edgeOp = 0;                            // another kingdom takes the light: it fades in anew
  edgeOp = want > edgeOp ? Math.min(want, edgeOp + dt * 1.4) : bannerK === 0 ? 0 : Math.max(want, edgeOp - dt * 3.5);
  if (edgeOp < 0.01) { edgeOp = Math.max(0, edgeOp); if (edgeEl) edgeEl.style.display = 'none'; edgeInfo = null; return; }
  edgeBuild(); edgeSet(id);
  edgeX = x;
  edgeEl.style.display = 'block';
  edgeEl.style.opacity = Math.min(1, edgeOp).toFixed(3);
  edgeEl.style.transform = `translate(${(x - B.half).toFixed(1)}px,0)`;
  edgeEl.classList.toggle('tap', edgeOp >= 0.5);
  edgeInfo = { id, x: Math.round(x), op: +edgeOp.toFixed(2), nx: +U.clamp(nx, -99, 99).toFixed(2), lo: Math.round(B.lo), hi: Math.round(B.hi) };
}
function updateBeams(t) {
  if (!F.booted) return;
  const cam = F.R.camera; if (!cam) return;
  const dt = gkT ? Math.min(0.2, Math.max(0, t - gkT)) : 0.016; gkT = t;
  if (F.Space && F.Space.cur !== 'out') { beamRoot.visible = false; gk = 0; edgeHide(); return; }
  const looking = !!(F.R.cam && F.R.cam.look);
  // calm-screen gate, smoothed (≈ 0.3 s out, 0.8 s back in)
  const want = (looking ? beamsAllowed() : edgeAllowed()) ? 1 : 0;
  gk = want >= gk ? Math.min(1, gk + dt * 1.25) : Math.max(0, gk - dt * 3.5);     // (≥: at 1 it stays 1 – no 17 % flicker)
  const T = (F.R.cam && F.R.cam.look && F.R.cam.smooth) ? F.R.cam.smooth : ((F.R.cam && F.R.cam.target) || { x: 0, y: 0, z: 0 });
  const P = F.Player && F.Player.pos ? F.Player.pos : { x: 0, z: 0 };
  cam.updateMatrixWorld();
  pick(t, P, cam);
  const id = shown.size ? [...shown][0] : null;
  if (!looking) {
    beamRoot.visible = false;
    if (!id || gk < 0.01) { edgeOp = Math.max(0, edgeOp - dt * 3.5); edgeHide(); return; }
    cam.updateMatrixWorld(); cam.getWorldPosition(_c); cam.getWorldDirection(_d);
    // she is at ANOTHER kingdom: the light fades (60–105 m from the nearest other awake castle). Its own kingdom does not fade it: the
    // light leads her all the way in until she has found it (40 m from the gate) – a fade there left her in a dead zone (child path)
    let dNear = 1e9;
    for (const st of sites().list) if (st.id !== id && awake(st.id)) dNear = Math.min(dNear, Math.hypot(st.x - P.x, st.z - P.z));
    drawEdge(t, dt, id, T, U.clamp((dNear - 60) / 45, 0, 1));
    return;
  }
  edgeHide();
  beamRoot.visible = gk > 0.01;
  if (!beamRoot.visible) return;
  cam.updateMatrixWorld(); cam.getWorldPosition(_c); cam.getWorldDirection(_d);
  const gy = T.y || 0, camY = Math.max(2, _c.y - gy);
  const fh = Math.hypot(_d.x, _d.z) || 1, fx = _d.x / fh, fz = _d.z / fh;           // horizontal view direction
  _r.set(-fz, 0, fx);                                                                // horizontal right
  const q0 = groundAt(cam, 0, 0.5, gy, _q0), q1 = q0 && groundAt(cam, 1, 0.5, gy, _q1);
  if (!q0 || !q1) { for (const k in BEAMS) BEAMS[k].g.visible = false; return; }
  const f0 = Math.max(2, (q0.x - T.x) * fx + (q0.z - T.z) * fz);                     // how far ahead of the fairy that ground line lies
  const Lr = Math.max(2, (q1.x - q0.x) * _r.x + (q1.z - q0.z) * _r.z);               // its visible half-width
  const hf = Math.tan(cam.fov * Math.PI / 360);
  for (const st of sites().list) {
    const on = st.id === id;
    if (!on && !BEAMS[st.id]) continue;
    const b = beam(st.id);
    if (!on) { b.g.visible = false; continue; }
    // the look shows it wherever it is: one behind her is pinned at the side edge it is nearer to ("over there")
    const dx = st.x - T.x, dz = st.z - T.z, dh = Math.hypot(dx, dz) || 1;
    const fw = (dx * fx + dz * fz) / dh, rt = (dx * _r.x + dz * _r.z) / dh;
    const hero = st.id === glanceId;
    const lat0 = fw > 0.05 ? f0 * rt / fw : (rt >= 0 ? 1 : -1) * 1e3, lat = U.clamp(lat0, -0.8 * Lr, 0.8 * Lr);
    const pinK = Math.abs(lat0) > 0.8 * Lr ? 0.75 : 1;                               // pinned at the edge: a little softer
    const fade = pinK * gk * U.clamp(b.rise * 1.4, 0, 1);
    b.g.visible = fade > 0.01;
    if (!b.g.visible) continue;
    b.g.position.set(q0.x + _r.x * lat, gy - 0.5, q0.z + _r.z * lat);
    const Dh = Math.hypot(b.g.position.x - _c.x, b.g.position.z - _c.z), Dc = Math.hypot(Dh, camY);
    const w = U.clamp((hero ? 0.05 : 0.032) * Dc, 0.3, hero ? 7 : 4) / 2.0;         // shell radius 2.0 → ≈ 3 % of the distance
    const Hc = Math.max(4, camY * 0.85);                                              // the column never reaches the camera's height
    b.g.scale.set(w, (Hc / 60) * Math.max(0.001, b.rise), w);
    const near = hero ? 1.5 : 1;
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.1 + st.k);
    b.shell.material.opacity = 0.5 * fade * pulse * near; b.core.material.opacity = 0.55 * fade * pulse * near;
    // the crest: a small marker on the pillar about an eighth of the view below the top edge (world size ≈ 4 % of its distance)
    const aC = Math.asin(U.clamp(-_d.y, -1, 1)) - Math.atan(0.72 * hf), hC = U.clamp(camY - Dh * Math.tan(aC), 1.5, Hc * 0.9);
    const sy = b.g.scale.y || 1;
    b.sp.position.y = (hC + 0.25 * Math.sin(t * 1.6 + st.k)) / sy;
    const cs = U.clamp((hero ? 0.075 : 0.04) * Math.hypot(Dh, camY - hC), 0.6, hero ? 8 : 3.2);
    b.sp.scale.set(cs / w, cs / sy, 1);
    b.sp.material.opacity = Math.min(1, fade * near * 1.2);
  }
}
F.on('preRender', () => { if (beamRoot) updateBeams(F.T.now); else if (F.booted) { for (const st of sites().list) if (awake(st.id)) beam(st.id); } });

/* ---- found: the crest flies into Kart (after the arrival ceremony) */
let crestBusy = false, crestAcc = 0;
function crestCalm(id) {
  if (!F.booted || crestBusy) return false;
  if (F.T.now - foundT < 0.8) return false;
  if (!F.HUD || !F.HUD.built || F.HUD.hidden || !F.HUD.map) return false;
  if (F.R.cam && (F.R.cam.look || F.R.cam.focus)) return false;
  if (F.HUD.scene) { try { if (F.HUD.scene()) return false; } catch (e) { /* partial */ } }
  if (F.Royals && F.Royals.greeting && F.Royals.greeting[id]) return false;
  if (F.Task && F.Task.current) return false;
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return false;
  if (F.Travel && F.Travel.busy) return false;
  if (F.Shell && F.Shell.screen) return false;
  if (F.Befriend && F.Befriend.busy) return false;
  return true;
}
const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
async function crestFly(id) {
  const s = S(); if (s.crest && s.crest[id]) { delete s.crest[id]; F.store(); }
  const R = realmOf(id), mapEl = F.HUD && F.HUD.map;
  if (!R || !mapEl) { if (F.HUD && F.HUD.mapGlow) F.HUD.mapGlow(true, 'new'); return false; }
  crestBusy = true;
  let el = null;
  try {
    edgeCss();
    const u = uu(), sz = 72 * u;
    // it starts over the castle (its keep, when that is on screen and below the HUD row), else at the top middle
    let sx = innerWidth / 2, sy = 150 * u;
    const bx = castleBox(id);
    if (bx && F.Space.cur === 'out' && F.R.camera) {
      const v = new THREE.Vector3(bx.x, bx.y + bx.h * 0.75, bx.z).project(F.R.camera), rc = F.R.renderer.domElement.getBoundingClientRect();
      if (v.z < 1 && v.z > -1 && Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.8) { sx = rc.left + (v.x + 1) / 2 * rc.width; sy = rc.top + (1 - v.y) / 2 * rc.height; }
    }
    sy = U.clamp(sy, 140 * u, innerHeight - 200 * u);
    el = document.createElement('div'); el.className = 'realm-crest-fly'; el.dataset.realm = id;
    el.appendChild(emblemCanvas(R));
    document.body.appendChild(el);
    const set = (x, y, sc, op) => { el.style.transform = `translate(${(x - sz / 2).toFixed(1)}px,${(y - sz / 2).toFixed(1)}px) scale(${sc.toFixed(3)})`; el.style.opacity = String(op); };
    set(sx, sy, 0.2, 0);
    if (F.sfx && F.sfx.chime) { try { F.sfx.chime(); } catch (e) { /* audio */ } }
    await F.T.tween(340, k => set(sx, sy - 12 * u * k, 0.2 + backOut(k), F.Task && F.Task.current ? 0 : Math.min(1, k * 3)));
    if (!(F.Task && F.Task.current)) await F.T.sleep(260);
    const y0 = sy - 12 * u;
    // (a task that starts meanwhile is never crossed: the crest goes straight home, unseen)
    await F.T.tween(700, k => {
      const mr = mapEl.getBoundingClientRect(), tx = mr.left + mr.width / 2, ty = mr.top + mr.height / 2, e = (F.Task && F.Task.current) ? 1 : U.smooth(k);
      set(sx + (tx - sx) * e, y0 + (ty - y0) * e - Math.sin(Math.PI * e) * 70 * u, 1.2 - 0.7 * e, e >= 1 && k < 1 ? 0 : 1);
    });
    const fr = el.getBoundingClientRect(), mr = mapEl.getBoundingClientRect();
    Realm.crestLast = { id, x: Math.round(fr.left + fr.width / 2), y: Math.round(fr.top + fr.height / 2), mx: Math.round(mr.left + mr.width / 2), my: Math.round(mr.top + mr.height / 2), t: F.T.now };
    mapEl.classList.remove('bf-bump'); void mapEl.offsetWidth; mapEl.classList.add('bf-bump');
    if (F.sfx && F.sfx.pop) { try { F.sfx.pop(); } catch (e) { /* audio */ } }
    if (F.HUD.mapGlow) F.HUD.mapGlow(true, 'new');
    F.emit('realmCrest', id);
    return true;
  } catch (e) { console.warn('[Realm] crest', e); if (F.HUD && F.HUD.mapGlow) F.HUD.mapGlow(true, 'new'); return false; }
  finally { if (el) el.remove(); crestBusy = false; }
}
F.on('tick', dt => {
  crestAcc += dt; if (crestAcc < 0.25) return; crestAcc = 0;
  const s = F.save && F.save.realm; if (!s || !s.crest) return;
  for (const id in s.crest) { if (crestCalm(id)) { crestFly(id); break; } }
});
// found → its light goes out at once; appeared → the new kingdom may take the light (re-pick now, not within the second)
F.on('realmFound', () => { shownAcc = 0; });
F.on('realmAppeared', () => { shownAcc = 0; });
F.on('goalChanged', () => { shownAcc = 0; });

/* =====================================================================================================================
   5. Royal interiors (plans for F.Bld, WP1 engine)
   ===================================================================================================================== */
const ROOMNAME = { ballsal: 'Ballsalen', tronsal: 'Tronsalen', spisesal: 'Spisesalen', kjokken: 'Kjøkkenet', bad: 'Badet', musikkrom: 'Musikkrommet',
  bibliotek: 'Biblioteket', soverom: 'Kongeparets soverom', garderobe: 'Garderoben', skattkammer: 'Skattkammeret', inngang: 'Hallen', ordmuseum: 'Ordmuseet', prinsesse: 'Prinsessens rom' };
const PLANS = {};
function planFor(id) {
  if (PLANS[id]) return PLANS[id];
  const R = realmOf(id), st = site(id); if (!R || !st) return null;
  const rooms = (R.rooms && R.rooms.length ? R.rooms : ['ballsal', 'inngang', 'tronsal', 'spisesal']).slice(0, 5);
  // v5 WP-X (DESIGN4 §8 natural numbers): the rooms are numbered 1, 2, 3 … along the floor (left to right, the hall has none) – no more
  // random plates 10–20 (Roy.romCall «Kongen venter i rom {n}!» uses RK_ROOMS 1–6)
  const nums = [1, 2, 3, 4, 5, 6];
  const pal = R.pal || {};
  const style = { wall: pal.wall, wall2: pal.wall2, curtain: pal.flag, frieze: pal.trim, roof: pal.roof };
  let ni = 0;
  const cells = rooms.map((type, c) => {
    const inn = type === 'inngang';
    return { key: type, f: 0, c, shell: inn ? 'r_hallen' : 'r_' + type, type: inn ? 'hallen' : type,
      opts: { style, doorL: c > 0, doorR: c < rooms.length - 1, hole: null }, num: inn ? null : nums[ni++], name: ROOMNAME[type] || 'Hallen' };
  });
  const inn = cells.find(c => c.key === 'inngang') || cells[0];
  const dOut = door(id);
  const plan = PLANS[id] = { id: 'rk_' + id, name: R.castle, kind: 'kongeslott', realm: id, origin: { x: 400 + 100 * (R.k - 1), z: 0 }, floors: 1, cells,
    stair: null, lift: null, exits: [{ id: 'hoved', cell: inn.key, lx: 7, lz: 9.7, out: { x: dOut.x, z: dOut.z, ry: 0 } }], furnish: true, pal, style,
    home: false, noEarned: true };
  return plan;
}
function register(id) {
  const p = planFor(id); if (!p) return null;
  const B = F.Bld; if (!B || !B.register) return p;
  try { if (!B.plan || !B.plan(p.id)) B.register(p); } catch (e) { console.warn('[Realm] plan register', id, e); }
  return p;
}
async function ensure(id) {
  const p = register(id); if (!p) return false;
  const B = F.Bld;
  try { if (B && B.build) await B.build(p.id); else if (B && B.prepare) await B.prepare(p.id); } catch (e) { console.warn('[Realm] ensure', id, e); return false; }
  return true;
}
function spot(id, name) {
  const st = site(id); if (!st) return null;
  const R = realmOf(id), L = F.CastleGen.layout(R);
  const out = (p) => ({ space: 'out', x: st.x + p.x, z: st.z + p.z });
  switch (name) {
    case 'gate': return out(L.gate);
    case 'door': return out(L.doorOut);
    case 'market': return out(L.market0);
    case 'garden': return out(L.garden);
    case 'sign': return out(L.sign);
    case 'stall0': case 'stall1': case 'stall2': { const m = L.market[+name.slice(5)]; return out({ x: m.x + Math.sin(m.ry) * 2.2, z: m.z + Math.cos(m.ry) * 2.2 }); }
    case 'throne': case 'throne2': case 'tronsal': case 'inside': case 'hall': {
      // 'throne' = the king, in front of the throne (c_trone at lx 7); 'throne2' = the queen, 2.2 m to his right (W2, WP7 request)
      const p = planFor(id), key = name === 'hall' || name === 'inside' ? 'inngang' : 'tronsal';
      const c = p.cells.find(q => q.key === key) || p.cells[0];
      return { space: 'in', bld: p.id, f: 0, room: c.key, x: p.origin.x + 15 * c.c + (name === 'throne2' ? 9.2 : 7), z: p.origin.z + 4.2 };
    }
  }
  return null;                                                                   // unknown spot name: the caller uses its own fallback
}

/* =====================================================================================================================
   6. Chunk-side hooks for worldgen.js (castle parts, building site, market, door) + load events
   ===================================================================================================================== */
const loaded = {};
F.on('chunkLoaded', ch => {
  const info = ch && ch.info; if (!info || !info.realm) return;
  const id = info.realm;
  if (!loaded[id] && awake(id)) { loaded[id] = ch.key; register(id); F.emit('realmLoaded', id); }
});
F.on('chunkUnloaded', ch => {
  for (const id in loaded) if (loaded[id] === ch.key) { delete loaded[id]; F.emit('realmUnloaded', id); }
});
Object.defineProperty(F, '_realmLoaded', { value: loaded, enumerable: false });

/* things: the keep door (fallback when WP1's b_dor is missing) and the building-site props (tap → «Her bygger de …») */
F.Things.def('rk_dor', {
  name: 'døra', radius: 1.2, solid: false, reach: 2.2,
  build() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.4), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = 2.2; g.add(m); return g; },
  async press(th) {
    const id = th.data.realm, B = F.Bld;
    if (!awake(id)) return SAYR('realm_stengt');
    SAYFR('realm_inn');
    const ok = await ensure(id);
    let entered = false;
    if (ok && B && B.enter) { try { entered = await B.enter('rk_' + id, { exit: 'hoved' }); } catch (e) { console.warn('[Realm] enter', e); } }
    if (!entered) return SAYR('realm_stengt');
    return true;
  },
});
F.Things.def('rk_bygg', {
  name: 'byggeplassen', radius: 1.6, solid: true, reach: 2.6,
  build(th) { const id = th.data.model || 'cg_stillas'; return F.VOX.has(id) ? F.VOX.make(id, th.data.opts || {}) : new THREE.Group(); },
  tick(th, dt, t) { const j = th.parts && th.parts.jib; if (j) j.rotation.y = Math.sin(t * 0.22 + th.x) * 0.9; },   // the crane's jib swings slowly
  async press(th) {
    if (F.FX && F.FX.wobble) F.FX.wobble(th.obj, 0.06);
    if (F.sfx && F.sfx.thud) F.sfx.thud();
    th.reactedVisibly = true;
    // v5c WP-Q (DESIGN5 §3.1 / longevity hook 25): the building site is the home of F60 Klosstårnet (and F59 Voksetårnet) – the
    // first tap of the day (then every 4th) opens a block-tower task there when it serves her level (F.OBJ.home: quiet / pacing rules)
    const h = F.OBJ && F.OBJ.home ? F.OBJ.home(th, ['F60', 'F59'], { place: 'byggeplass', ctx: { place: 'byggeplass' } }) : null;
    if (h) { Realm.siteHomes = (Realm.siteHomes || 0) + 1; return h; }
    return SAYR('realm_bygger');
  },
});
// P1 (§3.4): builders at a building site offer block-counting tasks; a first-try answer there counts ×3 toward the next kingdom
function builderWish(a, id) {
  if (!a || !a.setWish || state(id) !== 'site') return;
  a.setWish({ kind: 'task', model: 'cg_kubehaug', opts: (() => { const R = realmOf(id), P = (R && R.pal) || {}; return { c1: P.wall, c2: P.roof, c3: P.trim }; })(),
    onPress: async (who) => {
      const s = S();
      if (!s.said['bygg:' + id]) { s.said['bygg:' + id] = 1; await SAYR('realm_bygger'); }
      if (!F.Task || !F.Task.offer) return;
      // v5c WP-Q: the builders' slot – the block tower, the growing tower, counting the blocks, bundles – at her level (engine mix);
      // the old block counting (F08 / F09 / F07) when nothing of the slot fits
      const ctx = { npc: who, place: 'byggeplass' };
      const it = F.Quest && F.Quest.slotItem && F.Quest.SLOT ? F.Quest.slotItem({ formats: F.Quest.SLOT.bygg, lead: ['F60', 'F59'], leadP: 0.6 }, ctx, {}) : null;
      const res = it && F.Task.run ? await F.Task.run(it, ctx) : await F.Task.offer({ formats: ['F08', 'F09', 'F07'], ctx });
      if (res && res.outcome === 'A') { S().goodSince += 2; F.store(); }          // + the 1 that taskEnd counted = ×3
      if (who.clearWish) who.clearWish();
      F.T.timeout(() => builderWish(who, id), 20000);
    } });
}
F.on('wishSpot', spot => {
  if (!spot || !spot.builder) return;
  const a = F.Act && F.Act.byId ? F.Act.byId('v_' + spot.id) : null;
  if (a) builderWish(a, spot.realm);
});
// worldgen asks: what to generate for this kingdom cell (state-dependent; hold = mid-ceremony empty plaza)
function genInfo(id) { return { state: state(id), hold: !!hold[id] }; }

/* =====================================================================================================================
   7. Wiring
   ===================================================================================================================== */
F.on('boot', () => { computeSites(); S(); try { relocateAdds(); } catch (e) { console.warn('[Realm] relocate', e); } });
F.on('taskEnd', (item, res) => {
  if (res && res.outcome === 'A') { const s = S(); s.goodSince = (s.goodSince || 0) + (res.realmK || 1); F.store(); }
  F.T.timeout(() => check(), 4000);                                   // §3.3: the check runs 4 s after every taskEnd (only A answers count)
});
F.on('bldLeft', () => F.T.timeout(() => check(), 1200));
F.on('dayStart', () => { const s = S(); const day = F.save.day || 1; if (s.lastDay !== day) { s.lastDay = day; s.today = 0; F.store(); } F.T.timeout(() => check(), 6000); });
F.on('friendship', () => { /* WP8: a friend may open the special gates */ F.T.timeout(() => check(), 6000); });

const Realm = F.Realm = {
  list() { return sites().list.map(s => ({ id: s.id, k: s.k, x: s.x, z: s.z, state: state(s.id), regionId: s.regionId, ring: s.ring, i: s.i, j: s.j, biome: s.biome, castle: (realmOf(s.id) || {}).castle })); },
  get(id) { const s = site(id); if (!s) return null; return Object.assign({ state: state(id), realm: realmOf(id) }, s); },
  siteAt(i, j) { return sites().byCell.get(i + ',' + j) || null; },
  at(x, z) { const Fp = FOOT(); for (const s of sites().list) if (x >= s.x + Fp.x0 && x <= s.x + Fp.x1 && z >= s.z + Fp.z0 && z <= s.z + Fp.z1) return s.id; return null; },
  state, canAppear, next, appear, ensure, gate, door, spot, sayWelcome,
  sites: () => sites().list.slice(), site, plan: planFor, register, footprint(id) { const s = site(id), Fp = FOOT(); return s ? { x0: s.x + Fp.x0, z0: s.z + Fp.z0, x1: s.x + Fp.x1, z1: s.z + Fp.z1 } : null; },
  ruleOk, check, found, relocateAdds, genInfo, awake, newest, beams: BEAMS,
  autoWelcome: true, GOOD_NEED, DAY_CAP, P1_BUILDERS: true, emblemIcon,
  save: S,
  // clarity §3.0 / §3.6: the top-edge light (the element while it shows, else null), its numbers, the kingdom it is for; the crest flight
  get edge() { return edgeEl && edgeEl.isConnected && edgeEl.style.display !== 'none' ? edgeEl : null; },
  edgeInfo: () => (edgeInfo && edgeEl && edgeEl.style.display !== 'none' ? Object.assign({}, edgeInfo) : null),
  lightId: () => (shown.size ? [...shown][0] : null),
  edgeWhy: () => edgeWhy() || (bannerK < 0.5 ? 'banner' : null),
  edgeTap, edgeTaps: () => edgeTapN,
  crestFly, crestBusy: () => crestBusy, crestLast: null,
};
F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.realmAppear = (id) => { id = id || next(); if (!id) return null; appear(id, {}); return id; };
  F.dbg.realmGo = (id) => {
    id = id || (newest() || {}).id; const g = gate(id); if (!g) return null;
    if (F.Bld && F.Bld.cur && F.Bld.leave) { try { F.Bld.leave({ instant: true }); } catch (e) { /* teleport below anyway */ } }
    F.dbg.teleport(g.x, g.z + 6);
    if (F.R.cam.mode !== 'out' && F.R.setCam) F.R.setCam({ mode: 'out', pitch: 0.92, yaw: 0, snap: true });
    if (F.W.update) F.W.update(g.x, g.z + 6, true);
    return [g.x, g.z + 6];
  };
  F.dbg.realmFind = (id) => { found(id); return state(id); };
  F.dbg.realmGood = (n) => { const s = S(); s.goodSince = n == null ? GOOD_NEED : n; F.store(); return s.goodSince; };
  F.dbg.realms = () => Realm.list();
});
void Realm;
})();
