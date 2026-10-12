/* Feslottet – F.Fauna: open-world animal life (DESIGN2 §4.4–4.8). Owner: WP4 FAUNA. Data: js/data/fauna.js (F.FAUNA).
   Animals are NOT F.OBJ things: light records {id, sp, x, z, y, ry, st, t, home, g} in chunk-deterministic groups.
   Layers (§4.5): A residents per chunk (same every visit) · B one «glimt» slot per chunk (new every day / phase / weather) ·
                  C legends at landmarks (via chained W.landmarkHooks) · Z Dyreparken residents (not in the album) · S seeds from retired thing types.
   Groups are generated when a chunk loads; records exist only for groups whose home is within ~58 m of her (≤ 160 records).
   LOD (§4.7): ≤ 14 m rigged model from a pool (F.Beasts.make, F.Rig.tick; F.Fauna.cfg.maxRig = 10) · up to 45 m one InstancedMesh per species
             (F.Beasts.inst) · > 45 m hidden. Budgets enforced each 10 Hz LOD pass: ≤ 34 draw calls, ≤ 66k triangles (real rig triangles counted),
             ≤ 22 instanced species. One instanced blob-shadow mesh, 2 Points for cues. Simulation: ≤ 12 m every frame, mid range 10 Hz decisions.
   Behaviours (§4.4): wander graze/peck herd row-follow flock(lift together) circle peekaboo(shy) curious sleep(K) play swim/jump perch pop-up; never scary.
   API: F.Fauna = { near(x,z,r)->[rec], pick(sx,sy)->rec|null, focus(rec), release(rec,{mode:'won'|'later'}), react(rec,'tilt'|'happy'|'won'|'later'),
                    countIn(chunkKey)->n, setCompanion(spId|null), companion()->spId|null, today()->spId|null, eligible(spId)->bool,
                    tap(rec), pet(rec), seed(spId,x,z) (retired thing types), records(), groupsIn(key), glimtIn(key), screenOf(rec), enabled, cfg, stats,
                    approachSpot(rec) (dry shore point ≤ 6 m for water animals), shoreZ(x) (real waterline) }
   W2: release(rec,{mode:'later', home:true}) → the animal walks off, shrinks into a sparkle and stays away for this day+phase (F.save.fauna.gone).
   rec = { id, gid, sp (species row), spId, x, y, z, ry, st, lod (0 hidden | 1 instanced | 2 rig), obj (rig when lod 2), g (group), focus, tapped }
   Perch: birds / cats / squirrels / owls sit on fences, posts, mailboxes, hay bales, wells, trees and mills near their home (F.Things.near).
   Picking: registered in F.Input.pickHooks (exact: the tap must be inside the record's projected model box +4 px, ≥ 28 px; ≤ 30 m of her).
   Tap (natural audit 11.10., D2): un-befriended → she flies close, it looks up, sounds, hops, and a heart bubble floats above it ≈ 12 s
        (FA.invite()); a tap on the heart – or on the animal again ≥ 0.5 s later – starts F.Befriend.start(rec). Resting (cooldown) / play
        break: the reaction only (break: «Dyra leker nå…» once a session). Befriended / Dyreparken → its own sound + hearts + a hop; one
        spoken petting line per species per session at most. Flying fauna never get her see-through silhouette's tint (FA.flies).
   Events: animalSeen(sp, rec) legendSeen(sp). Save: F.save.fauna = {dry, legendSeen{sp:{day,x,z}}, seen{sp:day}, companion, petAway}.
   Debug (on ready): F.dbg.fauna(spId) spawns one near her; F.dbg.faunaStats(); F.dbg.faunaList(r).
   v5 WP-A: LOD hysteresis (45/49 m edge, sticky budget ranking, triangle budget keeps shown animals first – playtest flicker cause 2);
   petting plays the species' synthesized voice (F.sfx.animal) and a friend sometimes repeats a fact / its word (F.VIT); «Den våknet!»
   when a tap wakes a sleeper (#47); the companion cheers only outdoors and in view (#34); setCompanion(sp, {quiet}) (#50).
   v5c WP-A2: petting a friend teaches through F.VIT.petPick (never a due key: that one waits for the Vennestjerne recall); windy weather
   plays a soft gust before «Hør på vinden!» (#48) and now and then while it blows; a friend with a due question twinkles when she is
   near (FA.friendAsks(sp)); the real seasons: migrants away 10 Nov – 14 Mar (gather from 15 Oct), hibernators asleep 20 Nov – 19 Mar
   (FA.awayKind(sp) 'reise' | 'dvale' | null, FA.seasonDate(), FA._date for tests).
   Clarity 12.10. (§3.9 FA): F.Fauna.unknownNear(x,z,r) / greet(rec) / discOf(rec) / onScreen(rec) (the §3.0 contract: the «?» cue and
   Puff's «nytt dyr» suggestion); first-sight words wait in a queue for calm + the animal on screen (fa_new is the once-ever «?»
   explanation, F.First's when its engine runs); no weather / phase lines, no «Jeg ser glitterspor!»; the migrants' gathering line once a
   year, «Velkommen til dyreparken!» once ever; while a task or a trial runs no «?» / twinkle / legend column is drawn and animals in
   front of the task's stage step aside (or fade) – nothing of ours covers a task at any zoom; the «?» keeps its size when she zooms out. */
(function () {
'use strict';
const F = window.F, U = F.U;
const CH = 32, NEAR = 14, MID = 45, PICK_PX = 48, PICK_M = 30;
const MAX_REC = 160, MAX_INST = 22, DC_BUDGET = 34, TRI_BUDGET = 66000;
const CFG = { maxRig: 10, nearR: 14, stageClear: true };   // F.Fauna.cfg (tests / tuning); W2: F.Beasts.make rigs are one skinned mesh each, so the ~10 closest get one (§4.7)
const MAT_R = 58, DEMAT_R = 74;
const TAU = Math.PI * 2;
const FA = F.Fauna = {
  enabled: !/nofauna/.test(location.hash || ''),
  stats: { recs: 0, rigs: 0, inst: 0, instSp: 0, dc: 0, tris: 0, groups: 0, ms: 0 },
};
FA.cfg = CFG;
const PR = FA.prof = { p1: 0, sim: 0, lod: 0, render: 0, n: 0 };
const save = () => {
  const s = F.save.fauna || (F.save.fauna = {});
  if (s.dry == null) s.dry = 0; if (!s.legendSeen) s.legendSeen = {}; if (!s.seen) s.seen = {};
  return s;
};
const SPD = id => (F.FAUNA && F.FAUNA.byId ? F.FAUNA.byId(id) : null);
const hasRaw = id => { try { return !!(F.Album && F.Album.has && F.Album.has(id)); } catch (e) { return false; } };
const friendCache = new Map();
const has = id => { let v = friendCache.get(id); if (v === undefined) { v = hasRaw(id); friendCache.set(id, v); } return v; };
const kikkert = () => { try { return !!(F.Eco && F.Eco.gear && F.Eco.gear('kikkert')); } catch (e) { return false; } };
const day = () => (F.save && F.save.day) || 1;
const seed = () => (F.W && F.W.seed) || 1;
const phaseIdx = () => (F.Weather && F.Weather.phaseIdx ? F.Weather.phaseIdx() : 1);
const phase = () => (F.Weather && F.Weather.phase ? F.Weather.phase() : 'dag');
const weatherAt = rid => { try { return F.Weather && F.Weather.at ? F.Weather.at(rid) : 'sol'; } catch (e) { return 'sol'; } };
const inPark = (x, z) => Math.abs(x) < 111 && Math.abs(z) < 111;
const castleBlock = (x, z) => Math.abs(x) < 37 && Math.abs(z) < 29;

/* ================================================================ area of a chunk (pure function of the seed) */
const areaCache = new Map();
function area(cx, cz) {
  const k = cx + ',' + cz; let a = areaCache.get(k); if (a) return a;
  const x = cx * CH + 16, z = cz * CH + 16;
  a = { key: k, cx, cz, x0: cx * CH, z0: cz * CH, x, z, village: false, sig: null };
  if (inPark(x, z)) { a.kind = 'park'; a.ring = 0; a.regionId = 'r_0_0'; a.biome = 'slott'; }
  else {
    let g = null; try { g = F.W.region ? F.W.region(x, z) : null; } catch (e) { g = null; }
    a.regionId = g ? g.id : 'r_0_0'; a.ring = g ? Math.max(Math.abs(g.cellX | 0), Math.abs(g.cellY | 0)) : 1; a.landmark = g && g.landmark;
    let b = null; try { b = F.W.biomeAt ? F.W.biomeAt(x, z) : null; } catch (e) { b = null; }
    a.biome = b || (g && g.biome) || 'blomstereng';
    if (a.biome === 'slott') a.biome = 'blomstereng';
    a.kind = a.biome;
    if (a.biome === 'hav') { const cz2 = F.W.coastZ ? F.W.coastZ(x) : 500; a.nearShore = a.z0 < cz2 + 34; }
    try { const vs = F.W.villages ? F.W.villages({ x, z }, 60) : []; a.village = vs.some(v => Math.hypot(v.x - x, v.z - z) < 56); } catch (e) { a.village = false; }
    try { const rid = F.Realm && F.Realm.at ? F.Realm.at(x, z) : null; const R = rid && F.REALMS && (F.REALMS.byId ? F.REALMS.byId[rid] : F.REALMS.find(r => r.id === rid)); a.sig = (R && R.creature) || null; } catch (e) { a.sig = null; }
  }
  if (areaCache.size > 4000) areaCache.clear();
  areaCache.set(k, a); return a;
}
const PAGE_OF_KIND = { park: 10, gardsland: 12, blomstereng: 13, lavendel: 13, frukthage: 14, innsjo: 15, vindmolle: 16, strand: 17, hav: 18, snohaugen: 19 };
// layer A group count (§4.5) – also what WP3's topUp counts (F.Fauna.countIn)
function groupCount(a) {
  const r = U.rng(U.hashStr('faunaN' + a.key + ':' + seed()));
  let n = 0;
  switch (a.kind) {
    case 'park': n = 4 + (r() < 0.5 ? 1 : 0); break;     // parent request: the world must feel full (design: 3–4)
    case 'gardsland': n = 3 + (r() < 0.5 ? 1 : 0); break;
    case 'strand': n = 2 + (r() < 0.5 ? 1 : 0) + 1 + (r() < 0.5 ? 1 : 0); break;
    case 'snohaugen': n = 2; break;
    case 'hav': n = a.nearShore ? 1 + (r() < 0.5 ? 1 : 0) : 0; break;
    default: n = 3 + (r() < 0.5 ? 1 : 0);                 // blomstereng, lavendel, frukthage, vindmolle, innsjo (design: 2–3)
  }
  if (a.village) n += 1 + (r() < 0.5 ? 1 : 0);
  return n;
}
FA.countIn = key => { const m = /^(-?\d+),(-?\d+)$/.exec(key || ''); if (!m) return 0; try { return groupCount(area(+m[1], +m[2])); } catch (e) { return 0; } };

/* ================================================================ placement tests */
const SF = () => (F.W && F.W.SURF) || { ROAD: 1, EDGE: 2, PLAZA: 3 };
function surfAt(x, z) {
  const ch = F.W.chunkOf(x, z); if (!ch || !ch.SURF) return -1;
  const ix = Math.floor((x - ch.cx * CH) / 0.5), iz = Math.floor((z - ch.cz * CH) / 0.5);
  if (ix < 0 || iz < 0 || ix > 63 || iz > 63) return -1;
  return ch.SURF[iz * 64 + ix];
}
function fieldAt(x, z) { const ch = F.W.chunkOf(x, z); if (!ch || !ch.FKA) return 0; const ix = Math.floor((x - ch.cx * CH) / 0.5), iz = Math.floor((z - ch.cz * CH) / 0.5); return (ix < 0 || iz < 0 || ix > 63 || iz > 63) ? 0 : ch.FKA[iz * 64 + ix]; }
const PARK_NO = ['plaza', 'market', 'labyrint', 'fehage', 'tallhage', 'stall', 'drivhus'];
function parkOK(x, z) {
  const P = F.Park; if (castleBlock(x, z)) return false;
  if (P && P.pathDist && P.pathDist(x, z) < 0.8) return false;
  if (P && P.zones) for (const n of PARK_NO) { const zn = P.zones[n]; if (zn && Math.hypot(x - zn.x, z - zn.z) < zn.r + 1) return false; }
  const T = F.Tower && F.Tower.door; if (T && Math.hypot(x - T.x, z - T.z) < 14) return false;
  return true;
}
function landOK(s, x, z, strict) {
  if (castleBlock(x, z)) return false;
  if (inPark(x, z) && !parkOK(x, z)) return false;
  if (F.W.water(x, z)) return false;
  if (F.W.blocked(x, z, 0.4)) return false;
  const sf = surfAt(x, z), C = SF();
  if (sf === C.ROAD) return false;
  if (s.page !== 11 && (sf === C.EDGE || sf === C.PLAZA)) return false;
  if (strict && s.page !== 11 && !inPark(x, z) && F.W.freeFn) { try { if (!F.W.freeFn(x, z, 0.3)) return false; } catch (e) { /* ignore */ } }
  return true;
}
/* sea bands are metres out from the real waterline (first wet cell south of W.coastZ, cached per metre of x). W2: the default camera
   only shows ~7 m of sea beyond her when she stands at the shore, so whales (now 2.6×) and dolphins (1.4×) swim close enough to be seen */
function seaBand(s) {
  switch (s.near) { case 'out': return [2.5, 5.5]; case 'far': return [3.5, 6]; case 'jetty': return [1, 7]; case 'shallows': return [0.5, 4.5]; default: return [1, 7]; }
}
const shoreCache = new Map();
function shoreZ(x) {
  const k = Math.round(x); let z = shoreCache.get(k); if (z !== undefined) return z;
  const c = F.W.coastZ ? F.W.coastZ(k) : 500; z = c;
  for (let d = -6; d <= 30; d += 0.5) if (F.W.water(k, c + d)) { z = c + d; break; }
  if (shoreCache.size > 5000) shoreCache.clear();
  shoreCache.set(k, z); return z;
}
FA.shoreZ = shoreZ;
function spotOK(s, x, z, strict) {
  if (!F.W.chunkOf(x, z)) return false;
  if (s.where === 'water') return F.W.water(x, z) && !castleBlock(x, z) && (!inPark(x, z) || !(F.Park && F.Park.zones) || Math.hypot(x - 72, z - 6) < 20);
  if (s.where === 'sea') {
    if (!F.W.water(x, z)) return false;
    const d = z - shoreZ(x), b = seaBand(s);
    return d >= b[0] - 1 && d <= b[1] + 1;
  }
  if (s.where === 'air') return !castleBlock(x, z) && !(inPark(x, z) && !parkOK(x, z)) && !F.W.blocked(x, z, 0.3);
  if (!landOK(s, x, z, strict)) return false;
  if (s.near === 'shore') { const d = 2.6; if (!(F.W.water(x + d, z) || F.W.water(x - d, z) || F.W.water(x, z + d) || F.W.water(x, z - d))) return false; }
  if (s.near === 'snow' || s.near === 'snowplain' || s.near === 'snowmound') { const sf = surfAt(x, z), C = SF(); if (C.SNOW != null && sf !== C.SNOW && sf !== C.ICE && sf !== -1 && F.W.biomeAt && F.W.biomeAt(x, z) !== 'snohaugen') return false; }
  if (s.page === 17 && s.near !== 'rocks') { const sf = surfAt(x, z), C = SF(); if (C.SAND != null && sf !== C.SAND && sf !== C.WET && sf !== -1) return false; }
  return true;
}
// a spot for a whole group inside chunk a (deterministic: rng-driven candidates; herds prefer pastures)
function findSpot(a, s, rng, tries) {
  let best = null;
  const wantField = s.social === 'herd' && ['gardsland', 'vindmolle'].includes(a.kind);
  for (let i = 0; i < (tries || 16); i++) {
    const x = a.x0 + 2 + rng() * 28, z = a.z0 + 2 + rng() * 28;
    if ((a.kind === 'park') !== inPark(x, z)) continue;
    if (!spotOK(s, x, z, true)) continue;
    if (!wantField) return { x, z };
    if (fieldAt(x, z) === 4) return { x, z };
    if (!best) best = { x, z };
  }
  return best;
}
const chunkHasWater = new Map();
function waterIn(a) {
  if (chunkHasWater.has(a.key)) return chunkHasWater.get(a.key);
  let n = 0;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (F.W.water(a.x0 + 2 + i * 4, a.z0 + 2 + j * 4)) n++;
  const r = { any: n > 0, n };
  if (chunkHasWater.size > 3000) chunkHasWater.clear();
  chunkHasWater.set(a.key, r); return r;
}

/* ================================================================ species choice */
function staticGate(s, a) { return !(s.when.ring && a.ring < s.when.ring); }
function poolFor(a, page, tier, water) {
  return F.FAUNA.species.filter(s => s.page === page && s.tier === tier && s.page !== 20 && staticGate(s, a) && (s.biomes[0] === '*village' || s.biomes[0] === '*water' || s.biomes.length !== 1 || s.biomes[0] !== 'lavendel' || a.kind === 'lavendel')
    && (water ? (s.where === 'water' || s.where === 'sea' || s.near === 'shore' || s.near === 'water') : (s.where !== 'water' && s.where !== 'sea' && s.near !== 'shore' && s.near !== 'water')));
}
function wPick(rng, list, wf) {
  let tot = 0; const ws = list.map(s => { const w = wf ? wf(s) : 1; tot += w; return w; });
  if (!tot) return null; let r = rng() * tot;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function groupSize(s, rng) { const [a, b] = s.group; return a + Math.floor(rng() * (b - a + 1)); }

/* ================================================================ group generation per chunk */
const groups = new Map();         // chunkKey -> [group]
const glimt = new Map();          // chunkKey -> {key, g|null, x, z, passed}
const seeds = new Map();          // chunkKey -> [[spId, x, z]]
const anchors = new Map();        // chunkKey -> [{lm, regionId, x, z}]
const recs = [];
let gidN = 0, ridN = 0;
function mkGroup(a, s, home, n, layer, extra) {
  return Object.assign({ gid: 'g' + (gidN++), key: a.key, a, sp: s, n, x: home.x, z: home.z, layer, live: false, recs: [], r: Math.max(2.5, s.radius + Math.sqrt(n) * 0.7),
    liftT: 10 + Math.random() * 20, hide: false }, extra || {});
}
function genResidents(a) {
  const out = [];
  const n = groupCount(a); if (!n) return out;
  const rng = U.rng(U.hashStr('fauna' + a.cx + ',' + a.cz + ':' + seed()));
  const wat = waterIn(a);
  const used = new Set();
  let villageLeft = a.village ? n - (groupCount(Object.assign({}, a, { village: false }))) : 0;
  let seaLeft = a.kind === 'strand' ? 1 + (rng() < 0.5 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) {
    let page = PAGE_OF_KIND[a.kind] || 13, water = false;
    if (villageLeft > 0 && i >= n - villageLeft) page = 11;
    else if (a.kind === 'strand' && seaLeft > 0 && i >= n - (villageLeft > 0 ? villageLeft : 0) - seaLeft) { page = 18; water = true; }
    else if (a.kind === 'hav') { page = 18; water = true; }
    else if (wat.any && wat.n >= 3 && i === 0 && a.kind !== 'strand') { water = true; if (a.kind !== 'park') page = 15; }
    else if (a.kind === 'innsjo') page = rng() < 0.6 ? 15 : 13;
    const tier = rng() < 0.85 ? 1 : 2;
    let pool = poolFor(a, page, tier, water);
    if (!pool.length && tier === 2) pool = poolFor(a, page, 1, water);
    if (!pool.length) pool = poolFor(a, page, 1, false);
    const s = wPick(rng, pool, sp2 => (used.has(sp2.id) ? 0.15 : 1) * (a.sig === sp2.id ? 3 : 1));
    if (!s) continue;
    used.add(s.id);
    let home = findSpot(a, s, rng), s2 = s;
    if (!home && water) {   // no usable water here after all: a land animal of the page instead
      const lp = poolFor(a, page === 18 ? 17 : page === 15 ? 13 : page, 1, false);
      s2 = wPick(rng, lp, x => (used.has(x.id) ? 0.15 : 1)); home = s2 ? findSpot(a, s2, rng) : null;
    }
    if (!home || !s2) continue;
    out.push(mkGroup(a, s2, home, groupSize(s2, rng), 'A'));
  }
  // seeds from retired thing types (worldgen's lake ducks / creek frogs …) become small resident groups
  for (const [id, x, z] of (seeds.get(a.key) || [])) {
    const s = SPD(id); if (!s) continue;
    let p = { x, z };
    if (!spotOK(s, x, z)) { const r2 = U.rng(U.hashStr('seed' + x + ',' + z)); p = null; for (let k = 0; k < 10 && !p; k++) { const xx = x + (r2() - 0.5) * 8, zz = z + (r2() - 0.5) * 8; if (spotOK(s, xx, zz)) p = { x: xx, z: zz }; } }
    if (p) out.push(mkGroup(a, s, p, Math.min(s.group[1], Math.max(s.group[0], 2)), 'S'));
  }
  // co-locate young animals with a parent herd in the same chunk (kalv→ku, lam→sau, føll→ponni/hest)
  const PAR = { kalv: ['ku'], lam: ['sau'], føll: ['ponni', 'hest'], andunge: ['and', 'gås'] };
  for (const g of out) { const ps = PAR[g.sp.id]; if (!ps) continue; const p = out.find(h => ps.includes(h.sp.id)); if (p) { g.x = p.x + 1.2; g.z = p.z + 1.2; g.parent = p; } }
  return out;
}
const TIERW = [[40, 40, 18, 2], [35, 30, 28, 7], [30, 25, 30, 15], [25, 20, 30, 25]];
function glimtKey(a) { return day() + '|' + phaseIdx() + '|' + weatherAt(a.regionId); }
function fairyEl() { const f = F.save && F.save.fairy; return ['krystall', 'blomst', 'boble', 'stjerne'].includes(f) ? f : null; }
function ctxFor(a) {
  const fr = (() => { try { return F.Album && F.Album.friends ? F.Album.friends() : []; } catch (e) { return []; } })();
  const pf = {}; fr.forEach(id => { const s = SPD(id); if (s) pf[s.page] = (pf[s.page] || 0) + 1; });
  return { phase: phase(), weather: weatherAt(a.regionId), ring: a.ring, friends: fr.length, pageFriends: pf, kikkert: kikkert() };
}
function genGlimt(a) {
  const key = glimtKey(a);
  const rng = U.rng(U.hashStr('glimt|' + a.cx + '|' + a.cz + '|' + seed() + '|' + key));
  const slot = { key, g: null, x: a.x0 + 8 + rng() * 16, z: a.z0 + 8 + rng() * 16, passed: false };
  if (a.kind === 'hav' && !a.nearShore) return slot;
  const sv = save();
  const forced = sv.dry >= 15;
  const ring = Math.min(3, a.ring | 0);
  let tier;
  if (forced) tier = rng() < 0.6 ? 2 : 3;
  else {
    const tw = (F.FAUNA.GLIMT || TIERW)[ring]; let r = rng() * 100, t = 0;
    for (; t < 4; t++) { r -= tw[t]; if (r <= 0) break; }
    tier = t >= 4 ? 0 : t;    // 0 nothing, 1 vanlig, 2 sjelden, 3 svært sjelden
  }
  if (!tier) return slot;
  const c = ctxFor(a);
  const pages = [PAGE_OF_KIND[a.kind] || 13]; if (a.village) pages.push(11);
  const wat = waterIn(a);
  if (wat.any && a.kind !== 'strand' && a.kind !== 'hav' && a.kind !== 'park') pages.push(15);
  if (a.kind === 'strand') pages.push(18);
  if (ring === 0 && tier === 3 && !pages.includes(10)) return slot;
  let pool = F.FAUNA.species.filter(s => pages.includes(s.page) && s.tier === tier && F.FAUNA.eligibleWhen(s, c) && !awayNow(s.id)
    && (s.biomes.length !== 1 || s.biomes[0] !== 'lavendel' || a.kind === 'lavendel')
    && (!forced || !has(s.id)) && ((s.where === 'water' || s.near === 'shore' || s.near === 'water') ? wat.any : true) && (s.where === 'sea' ? (a.kind === 'strand' || a.kind === 'hav') : true));
  if (!pool.length) return slot;
  const el = fairyEl(), kk = kikkert();
  const flock = (() => { try { const S = seasonNow().S; return !!(S && S.flock); } catch (e) { return false; } })();   // autumn: migrants gather
  const s = wPick(rng, pool, sp2 => (sp2.when.phase || sp2.when.weather ? 2 : 1) * (sp2.glitter && sp2.glitter === el ? 2 : 1) * (has(sp2.id) ? 1 : 3) * (a.sig === sp2.id ? 3 : 1) * (kk && sp2.tier >= 2 ? 1.5 : 1)
    * (flock && F.THEMES && F.THEMES.migrant && F.THEMES.migrant(sp2.id) ? 3 : 1));
  if (!s) return slot;
  const home = findSpot(a, s, rng, 20); if (!home) return slot;
  const n = s.tier >= 3 ? 1 : Math.max(1, Math.min(s.group[1], groupSize(s, rng)));
  slot.g = mkGroup(a, s, home, n, 'B'); slot.x = home.x; slot.z = home.z;
  // (clarity §3.9 FA, R14: no «Jeg ser glitterspor!» – the rare animal's own twinkle shows it)
  if (forced) { sv.dry = 0; slot.forced = true; F.store && F.store(); }
  return slot;
}
/* layer C legends + Dyreparken residents: anchors registered from the landmark hooks (chained, never replacing WP3's own) */
function hookLandmarks() {
  const W = F.W; if (!W || !W.landmarkHooks) return false;
  const LMS = W.LANDMARKS ? Object.keys(W.LANDMARKS) : ['fyrtarn', 'sandslott', 'kjempemolle', 'pariserhjul', 'isslott', 'krystallhoyden', 'kjempesolsikke', 'regnbuebro', 'ballongplass', 'dyrepark'];
  LMS.forEach(lm => {
    const prev = W.landmarkHooks[lm];
    if (prev && prev._fauna) return;
    const fn = function (ctx, region, h) {
      if (prev) prev(ctx, region, h);
      if (ctx.plan || !region || !region.center) return;
      const x = region.center.x, z = region.center.z;
      if (!(x >= ctx.x0 && x < ctx.x0 + ctx.S && z >= ctx.z0 && z < ctx.z0 + ctx.S)) return;   // once: the chunk holding the centre
      const k = W.key(ctx.cx, ctx.cz);
      const L = anchors.get(k) || []; if (!L.some(q => q.regionId === region.id)) L.push({ lm, regionId: region.id, x, z, y: h && h.y });
      anchors.set(k, L);
    };
    fn._fauna = true;
    W.landmarkHooks[lm] = fn;
  });
  return true;
}
function genAnchors(a) {
  const out = [];
  for (const an of (anchors.get(a.key) || [])) {
    if (an.lm === 'dyrepark') {
      const r = U.rng(U.hashStr('zoo' + an.regionId));
      const ids = U.sample(r, F.FAUNA.RESIDENTS || ['løve', 'giraff', 'sebra', 'ape', 'panda'], 3);
      ids.forEach((id, i) => {
        const s = zooSpecies(id); if (!s) return;
        const home = { x: an.x - 6 + i * 6, z: an.z - 19 + (i % 2) * 4 };
        const g = mkGroup(a, s, home, 1, 'Z', { box: { x0: an.x - 9.5, x1: an.x + 9.5, z0: an.z - 28, z1: an.z - 11 } });
        out.push(g);
      });
      a.zoo = { x: an.x, z: an.z - 18 };
    }
    // legend for this landmark type
    const L = F.FAUNA.species.find(s => s.page === 20 && s.landmark === an.lm);
    if (!L) continue;
    const key = day() + '|' + phaseIdx();
    const c = ctxFor(Object.assign({}, a, { regionId: an.regionId }));
    const ok = F.FAUNA.eligibleWhen(L, c) && (U.hashStr('legend|' + an.regionId + '|' + key + '|' + seed()) / 4294967296) < (has(L.id) ? 0.4 : 0.55);   // 40 %, 55 % until befriended (pacing, tools/fauna_sim.js)
    a.legendKey = key + '|' + c.weather;
    if (!ok && !(FA._forceLegend === L.id)) continue;
    const rng = U.rng(U.hashStr('lgpos' + an.regionId));
    let home = null;
    for (let i = 0; i < 48 && !home; i++) {
      const ang = rng() * TAU, d = (L.where === 'sea' ? 14 : 5) + rng() * (L.where === 'sea' ? 16 : 7);
      const x = an.x + Math.cos(ang) * d, z = an.z + (L.where === 'sea' ? Math.abs(Math.sin(ang)) * d + 20 : Math.sin(ang) * d);
      if (L.where === 'sea' ? (i < 36 ? spotOK(L, x, z) : F.W.water(x, z)) : spotOK(L, x, z)) home = { x, z };   // sea legends: in the band seen from the shore first
    }
    if (home) out.push(mkGroup(a, L, home, 1, 'C', { regionId: an.regionId }));
  }
  return out;
}
const ZOO = {};
function zooSpecies(id) {
  if (ZOO[id]) return ZOO[id];
  if (!F.VOX || !F.VOX.has(id)) return null;
  ZOO[id] = { id, word: id, def: id, page: 0, tier: 0, model: id, opts: null, glitter: null, legend: null, base: id, where: 'land', near: null,
    when: { phase: null, weather: null, ring: 0, needs: null }, group: [1, 1], move: 'walk', social: 'solo', shy: 0, radius: 4, speed: 0.6, acts: ['graze', 'curious'],
    sound: null, cat: 'zoo', land: false, zoo: true };
  return ZOO[id];
}
function genChunkGroups(a) {
  let L = [];
  try { L = genResidents(a); } catch (e) { console.error('[fauna] residents', a.key, e); }
  try { L = L.concat(genAnchors(a)); } catch (e) { console.error('[fauna] anchors', a.key, e); }
  groups.set(a.key, L);
  try { glimt.set(a.key, genGlimt(a)); } catch (e) { console.error('[fauna] glimt', a.key, e); }
}

/* ================================================================ records */
/* release(rec, {mode:'later', home:true}) (WP6, legends): the animal walks off and stays home until another day or phase.
   F.save.fauna.gone = {'<regionId|chunk>|<spId>': '<day>|<phaseIdx>'} (only current-phase entries are kept) */
const goneKey = () => day() + '|' + phaseIdx();
const goneId = g => (g.regionId || g.key) + '|' + g.sp.id;
function isGone(g) { const sv = F.save && F.save.fauna; const gk = sv && sv.gone && sv.gone[goneId(g)]; return !!gk && gk === goneKey(); }
function markGone(g) {
  const sv = save(), k = goneKey(), o = {};
  for (const id in (sv.gone || {})) if (sv.gone[id] === k) o[id] = k;     // prune older days / phases
  o[goneId(g)] = k; sv.gone = o; F.store && F.store();
  g.hide = true; acc1 = 1;
}
/* v5c WP-A2 (longevity_plan #6, VIT V7): the real seasons (F.THEMES.season; F.Cal.date() when WP-C's calendar exists, FA._date in tests):
   migrating birds are away 10 Nov – 14 Mar (they gather 15 Oct – 9 Nov: more of them, «Se, fuglene samler seg!»; back from 15 Mar:
   «Velkommen tilbake!»), hibernators sleep 20 Nov – 19 Mar – they do not appear (the album card says where they are). The companion,
   debug spawns and the zoo are never gated. */
FA._date = null;
FA.seasonDate = () => { if (FA._date) return FA._date; try { if (F.Cal && typeof F.Cal.date === 'function') { const d = F.Cal.date(); if (d instanceof Date) return d; } } catch (e) { /* no calendar */ } return new Date(); };
let seasonC = { t: -1e9, d: null };
function seasonNow() { if (FA._date || F.T.now - seasonC.t > 60 || !seasonC.d) { const d = FA.seasonDate(); seasonC = { t: F.T.now, d, S: F.THEMES && F.THEMES.season ? F.THEMES.season(d) : null }; } return seasonC; }
FA.awayKind = spId => { try { const c = seasonNow(); return F.THEMES && F.THEMES.awayKind ? F.THEMES.awayKind(spId, c.d) : null; } catch (e) { return null; } };
const awayNow = spId => !!FA.awayKind(spId);
function gateOK(g) {
  const s = g.sp;
  if (s.zoo || g.layer === 'P' || g.layer === 'D') return true;
  if (awayNow(s.id)) return false;
  if ((g.layer === 'C' || g.goneOK) && isGone(g)) return false;
  if (s.when.phase && s.when.phase !== phase()) return false;
  if (s.when.weather && s.when.weather !== weatherAt(g.a.regionId)) return false;
  return true;
}
function mkRec(g, i, x, z) {
  const s = g.sp;
  const r = { id: 'f' + (ridN++), gid: g.gid, g, sp: s, spId: s.id, i, x, z, y: 0, ry: Math.random() * TAU, st: 'idle', t: 0.5 + Math.random() * 3, tx: x, tz: z,
    spd: s.speed, ph: Math.random() * 10, lod: 0, obj: null, inst: -1, pop: 1, air: 0, focus: false, tapped: false, seen: false, head: 0, squash: 1, hopK: 0,
    home: { x: g.x, z: g.z }, lead: null };
  return r;
}
function materialize(g) {
  if (g.live) return;
  g.live = true; g.recs = [];
  const s = g.sp, rng = U.rng(U.hashStr(g.gid + s.id));
  const spread = 0.8 + Math.sqrt(g.n) * 0.85;
  const ang0 = rng() * TAU;
  for (let i = 0; i < g.n; i++) {
    let x = g.x, z = g.z;
    if (i > 0) {
      if (s.social === 'row') { x = g.x - Math.sin(ang0) * i * 0.8; z = g.z - Math.cos(ang0) * i * 0.8; }
      else { const a = rng() * TAU, d = 0.9 + rng() * spread; x = g.x + Math.cos(a) * d; z = g.z + Math.sin(a) * d; }
      if (!spotOK(s, x, z) || F.W.chunkKeyAt(x, z) !== g.key) { x = g.x + (rng() - 0.5) * 0.6; z = g.z + (rng() - 0.5) * 0.6; }
    }
    const r = mkRec(g, i, x, z);
    if (s.social === 'row') r.ry = ang0;
    g.recs.push(r); recs.push(r);
  }
  const lead = g.recs[0];
  g.recs.forEach((r, i) => { if (i > 0) { r.lead = (s.social === 'row') ? g.recs[i - 1] : lead; } });
  if (g.parent && g.parent.live && g.parent.recs[0]) g.recs.forEach(r => { r.lead = g.parent.recs[0]; r.follow = true; });
}
function dematerialize(g) {
  if (!g.live) return;
  g.live = false;
  for (const r of g.recs) { dropRig(r); r.dead = true; }
  for (let i = recs.length - 1; i >= 0; i--) if (recs[i].dead) recs.splice(i, 1);
  g.recs = [];
}
function allGroups(fn) { groups.forEach(L => L.forEach(fn)); glimt.forEach(sl => { if (sl.g) fn(sl.g); }); if (dbgGroups.length) dbgGroups.forEach(fn); if (compG) fn(compG); }
const dbgGroups = [];

/* ================================================================ chunk events */
F.on('chunkLoaded', ch => {
  if (!FA.enabled) return;
  try { genChunkGroups(area(ch.cx, ch.cz)); } catch (e) { console.error('[fauna] chunk', ch.key, e); }
});
F.on('chunkUnloaded', ch => {
  const L = groups.get(ch.key); if (L) L.forEach(dematerialize);
  const sl = glimt.get(ch.key); if (sl && sl.g) dematerialize(sl.g);
  groups.delete(ch.key); glimt.delete(ch.key); chunkHasWater.delete(ch.key); seeds.delete(ch.key); anchors.delete(ch.key);   // both re-register when the chunk loads again
  for (let i = dbgGroups.length - 1; i >= 0; i--) if (dbgGroups[i].key === ch.key) { dematerialize(dbgGroups[i]); dbgGroups.splice(i, 1); }
});
/* retired thing types (things_world.js) call this from their init: their spot seeds a resident group */
FA.seed = function (spId, x, z) {
  const k = F.W.chunkKeyAt(x, z); const L = seeds.get(k) || [];
  if (!L.some(q => Math.abs(q[1] - x) < 0.1 && Math.abs(q[2] - z) < 0.1)) L.push([spId, x, z]);
  seeds.set(k, L);
};

/* ================================================================ models: instanced geometry + rig pool */
const FALLBACK = { sommerfugl: 'bie', marihøne: 'bie', gresshoppe: 'frosk', maur: 'larve', øyenstikker: 'bie', rådyr: 'geit', grevling: 'gris', bever: 'mus', oter: 'mus',
  hegre: 'gås', hare: 'kanin', sjøstjerne: 'krabbe', eremittkreps: 'krabbe', lunde: 'and', manet: 'fisk', blekksprut: 'fisk', reke: 'krabbe', sjøhest: 'fisk', lemen: 'mus',
  moskus: 'ku', isbjørnunge: 'sau', elefantunge: 'gris', pingvin: 'and' };
const WHITE = new THREE.Color(1, 1, 1);
const ELCOL = { krystall: 0x9fe8ff, blomst: 0xffb3d9, boble: 0x8ff0e8, stjerne: 0xffe066 };
function modelFor(s) {
  let m = s.model, o = s.opts;
  if (!F.VOX.has(m)) { m = FALLBACK[m] || 'kanin'; o = null; }
  if (!F.VOX.has(m)) m = 'kanin';
  return { m, o: o ? Object.assign({}, o) : {} };
}
function beastsReal(s) { try { return !s.zoo && F.Beasts && F.Beasts.has && F.Beasts.has(s.id) && F.Beasts.spec; } catch (e) { return false; } }
const geoCache = new Map();
let lambert = null;
function mergeGeos(list) {
  let nv = 0, ni = 0;
  list.forEach(([g]) => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), I = new Uint32Array(ni);
  let vo = 0, io = 0;
  list.forEach(([g, off]) => {
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = g.attributes.color ? g.attributes.color.array : null, cnt = g.attributes.position.count;
    for (let i = 0; i < cnt; i++) { P[(vo + i) * 3] = p[i * 3] + off[0]; P[(vo + i) * 3 + 1] = p[i * 3 + 1] + off[1]; P[(vo + i) * 3 + 2] = p[i * 3 + 2] + off[2]; }
    N.set(n, vo * 3); if (c) C.set(c, vo * 3); else C.fill(0.8, vo * 3, (vo + cnt) * 3);
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; io += ix.length; }
    else { for (let i = 0; i < cnt; i++) I[io + i] = vo + i; io += cnt; }
    vo += cnt;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
function instGeo(s) {
  const k = s.zoo ? 'z:' + s.id : s.id;
  if (geoCache.has(k)) return geoCache.get(k);
  let res = null;
  try {
    if (beastsReal(s) && F.Beasts.inst) { const r = F.Beasts.inst(s.id); if (r && r.geometry) res = { geometry: r.geometry, material: r.material }; }
  } catch (e) { console.error('[fauna] Beasts.inst', s.id, e); }
  if (!res) {
    const { m, o } = modelFor(s);
    const e = F.VOX.geometry(m, o);
    const L = [];
    if (e.body.opaque) L.push([e.body.opaque, [0, 0, 0]]); if (e.body.glow) L.push([e.body.glow, [0, 0, 0]]);
    for (const pn in e.parts) { const p = e.parts[pn]; if (p.geo.opaque) L.push([p.geo.opaque, p.pos]); if (p.geo.glow) L.push([p.geo.glow, p.pos]); }
    if (!lambert) lambert = new THREE.MeshLambertMaterial({ vertexColors: true });
    res = { geometry: L.length ? mergeGeos(L) : new THREE.BoxGeometry(0.3, 0.3, 0.3), material: lambert };
  }
  const bb = res.geometry.boundingBox || (res.geometry.computeBoundingBox(), res.geometry.boundingBox);
  res.tris = (res.geometry.index ? res.geometry.index.count : res.geometry.attributes.position.count) / 3;
  res.h = bb ? bb.max.y : 0.6; res.w = bb ? Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) : 0.6;
  geoCache.set(k, res);
  return res;
}
/* parent 11.10. («when going under flying birds they become greyed out»): her see-through silhouette (F.FX.silhouette: lilac at 38 %
   wherever something is in front of her, stencil != 1) was painted over every bird / insect flying between the camera and her. Flying
   fauna now mark their own visible pixels with stencil 1 – as her own front parts do – so the lilac never lands on them, while walls,
   trees and houses still show her through. Only on CLONED materials (one clone per shared VOX / Beasts material, used by flying fauna
   alone; the shared materials are never touched), and drawn after the rest of the opaque world (renderOrder 2), so a bird hidden
   behind a wall marks nothing there and her silhouette stays whole. F.Fauna.flies(species) says which species. */
const AIR_RO = 2;
const flies = s => !!s && (s.where === 'air' || s.move === 'fly' || s.cat === 'fugl' || (s.acts || []).indexOf('circle') >= 0);
FA.flies = flies;
const silFree = new Map();   // shared material -> its stencil-marking clone
function silFreeMat(m) {
  if (!m || (m.userData && m.userData.silFree)) return m;
  let c = silFree.get(m);
  if (!c) {
    c = m.clone();
    c.stencilWrite = true; c.stencilRef = 1; c.stencilFunc = THREE.AlwaysStencilFunc;
    c.stencilZPass = THREE.ReplaceStencilOp; c.stencilFail = THREE.KeepStencilOp; c.stencilZFail = THREE.KeepStencilOp;
    c.userData = Object.assign({}, m.userData, { silFree: true });
    silFree.set(m, c);
  }
  return c;
}
function markSilFree(obj) {
  obj.traverse(c => {
    if (!c.isMesh || (c.userData && c.userData.isSil)) return;
    c.material = Array.isArray(c.material) ? c.material.map(silFreeMat) : silFreeMat(c.material);
    if ((c.renderOrder || 0) < AIR_RO) c.renderOrder = AIR_RO;
  });
}
const IM = new Map();   // spId -> {mesh, cap, n}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function instMesh(s) {
  const k = s.zoo ? 'z:' + s.id : s.id;
  let o = IM.get(k); if (o) return o;
  const G = instGeo(s), cap = Math.max(24, Math.min(64, s.group[1] * 3 + 4));
  const mesh = new THREE.InstancedMesh(G.geometry, flies(s) ? silFreeMat(G.material) : G.material, cap);
  if (flies(s)) mesh.renderOrder = AIR_RO;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.count = 0; mesh.visible = false; mesh.name = 'fauna_' + k;
  mesh.userData.fauna = true; mesh.raycast = () => {};
  F.R.scene.add(mesh);
  o = { mesh, cap, n: 0, G };
  IM.set(k, o);
  return o;
}
// rig pool: reuse built groups per species
const pool = new Map();   // spId -> [obj]
const rigMeshes = new Map(), rigTris = new Map();
function makeRig(s) {
  let obj = null;
  try { if (beastsReal(s)) obj = F.Beasts.make(s.id); } catch (e) { console.error('[fauna] Beasts.make', s.id, e); obj = null; }
  if (!obj) {
    const { m, o } = modelFor(s);
    obj = F.VOX.make(m, o);
    if (s.glitter) { try { if (F.Glitter && F.Glitter.apply) F.Glitter.apply(obj, s.glitter); } catch (e) { /* stub */ } }
  }
  obj.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
  if (flies(s)) markSilFree(obj);
  obj.userData.fauna = true;
  let n = 0, tr = 0; obj.traverse(c => { if (c.isMesh && c.visible !== false) { n++; const g = c.geometry; tr += g ? (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 : 0; } });
  rigMeshes.set(s.zoo ? 'z:' + s.id : s.id, n); rigTris.set(s.zoo ? 'z:' + s.id : s.id, tr);
  return obj;
}
function takeRig(r) {
  if (r.obj) return r.obj;
  const k = r.sp.zoo ? 'z:' + r.sp.id : r.sp.id;
  const L = pool.get(k); let obj = L && L.pop();
  if (!obj) obj = makeRig(r.sp);
  r.obj = obj; F.R.scene.add(obj); obj.visible = true;
  return obj;
}
function dropRig(r) {
  if (!r.obj) return;
  const k = r.sp.zoo ? 'z:' + r.sp.id : r.sp.id;
  if (r.obj.parent) r.obj.parent.remove(r.obj);
  const L = pool.get(k) || []; if (L.length < 3) L.push(r.obj); pool.set(k, L);
  r.obj = null;
}
const rigCost = s => rigMeshes.get(s.zoo ? 'z:' + s.id : s.id) || 7;

/* blob shadows (1 draw call) + cue points (2 draw calls) + legend columns */
let shadow = null, cueQ = null, cueS = null;
const SHCAP = MAX_REC + 12, CUEQ = 40, CUES = 90;
function canvasTex(draw, n) { const cv = document.createElement('canvas'); cv.width = cv.height = n || 64; draw(cv.getContext('2d'), cv.width); const t = new THREE.CanvasTexture(cv); return t; }
function ensureFx() {
  if (shadow) return;
  const sg = new THREE.CircleGeometry(0.5, 14); sg.rotateX(-Math.PI / 2);
  shadow = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0x2a3a2a, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SHCAP);
  shadow.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shadow.frustumCulled = false; shadow.count = 0; shadow.renderOrder = 1; shadow.userData.fauna = true; shadow.raycast = () => {};
  F.R.scene.add(shadow);
  const qTex = canvasTex((x, n) => {
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.strokeStyle = '#b07ad8'; x.lineWidth = 5;
    x.beginPath(); x.arc(n / 2, n / 2 - 2, n / 2 - 6, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#8a4fc0'; x.font = 'bold ' + (n * 0.62) + 'px Andika, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', n / 2, n / 2);
  }, 64);
  const mk = (cap, tex, size) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3).fill(1), 3));
    g.setDrawRange(0, 0);
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, fog: false, alphaTest: 0.05 }));
    p.frustumCulled = false; p.renderOrder = 6; p.userData.fauna = true; p.raycast = () => {}; F.R.scene.add(p); return p;
  };
  cueQ = mk(CUEQ, qTex, 1.25);
  const sTex = canvasTex((x, n) => {
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, n, n); x.fillStyle = 'white'; x.fillRect(n / 2 - 1, 4, 2, n - 8); x.fillRect(4, n / 2 - 1, n - 8, 2);
  }, 32);
  cueS = mk(CUES, sTex, 0.32);
}
const columns = new Map();   // rec -> mesh
let colGeo = null;
function columnFor(r, on) {
  let m = columns.get(r);
  if (!on) { if (m) { m.parent && m.parent.remove(m); columns.delete(r); } return; }
  if (m) return m;
  if (!colGeo) {
    colGeo = new THREE.CylinderGeometry(1.6, 2.2, 46, 18, 6, true);
    const cols = [0xff8a8a, 0xffc078, 0xfff08a, 0x9be7a5, 0x8fd0ff, 0xc3a6ff, 0xffffff], P = colGeo.attributes.position, C = new Float32Array(P.count * 3), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const k = (P.getY(i) + 23) / 46; c.setHex(cols[Math.min(6, Math.floor(k * 6.99))]); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
    colGeo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  }
  m = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.renderOrder = 3; m.userData.fauna = true; m.raycast = () => {};
  F.R.scene.add(m); columns.set(r, m);
  return m;
}

/* ================================================================ behaviour */
let PS = 0, still = 0, lastPX = 0, lastPZ = 0;
const SLEEPERS = { ku: 1, sau: 1, gris: 1, hest: 1, høne: 1, geit: 1, esel: 1, ponni: 1, lama: 1, kalv: 1, lam: 1, føll: 1 };
function chunkBox(r) { const g = r.g; if (g.box) return g.box; const x0 = Math.floor(g.x / CH) * CH, z0 = Math.floor(g.z / CH) * CH; return g.box = { x0: x0 + 0.6, x1: x0 + CH - 0.6, z0: z0 + 0.6, z1: z0 + CH - 0.6 }; }
function clampBox(r, x, z) { const b = chunkBox(r); return [U.clamp(x, b.x0, b.x1), U.clamp(z, b.z0, b.z1)]; }
function moveOK(r, x, z) {   // 2 probes per decision (target + midpoint)
  const s = r.sp;
  if (s.where === 'air') return spotOK(s, x, z);
  if (!spotOK(s, x, z)) return false;
  const mx = (x + r.x) / 2, mz = (z + r.z) / 2;
  if (s.where === 'water' || s.where === 'sea') return F.W.water(mx, mz);
  return !F.W.blocked(mx, mz, 0.35) && !F.W.water(mx, mz);
}
function goTo(r, x, z, spdK, st) {
  [x, z] = clampBox(r, x, z);
  if (!moveOK(r, x, z)) return false;
  if (stageZ && !r.focus && inStage(x, z)) return false;     // while a task runs, nobody wanders onto / in front of its stage
  r.tx = x; r.tz = z; r.st = st || 'walk'; r.spdK = spdK || 1; r.t = 12;
  return true;
}
function wanderTarget(r, rad) {
  const g = r.g, a = Math.random() * TAU, d = (rad || g.r) * (0.3 + 0.7 * Math.random());
  return [g.x + Math.cos(a) * d, g.z + Math.sin(a) * d];
}
const has1 = (s, a) => s.acts.indexOf(a) >= 0;
/* perch: birds, cats, squirrels and owls sit on fences, signposts, mailboxes, hay bales, trees and mill tops near their home */
const PERCH_RE = /tre$|tre_|epletre|grind|molle|veiskilt|skilt|postkasse|benk|fuglekasse|vindfloy|hoyball|bronn|tallstolpe|lykt|gjerde/;
function perchSpots(g) {
  if (g.perch && F.T.now - g.perchT < 20) return g.perch;
  g.perchT = F.T.now; g.perch = [];
  try {
    const L = F.Things.near(g.x, g.z, 9, 'out');
    for (const th of L) {
      if (!th.obj || th.hidden || !PERCH_RE.test(th.type) || F.W.chunkKeyAt(th.x, th.z) !== g.key) continue;
      const h = F.BEH && F.BEH.util && F.BEH.util.heightOf ? F.BEH.util.heightOf(th) : 1;
      if (h < 0.5 || h > 9) continue;
      g.perch.push({ x: th.x, z: th.z, h: h * 0.96, th });
      if (g.perch.length >= 4) break;
    }
  } catch (e) { g.perch = []; }
  return g.perch;
}
function canPerch(s) { return has1(s, 'perch') && (s.cat === 'fugl' || s.base === 'katt' || s.base === 'ekorn' || s.id === 'katt') && s.where !== 'water'; }
function decide(r, dP) {
  const s = r.sp, g = r.g;
  if (r.perched) {   // hop down after a while
    if (r.perchAt) r.perchAt.used = null;
    const [x, z] = wanderTarget(r, 3); r.perched = false; r.perchAt = null;
    r.fx = r.x; r.fz = r.z; [r.tx, r.tz] = clampBox(r, x, z); r.a0 = r.air; r.a1 = 0; r.st = 'fly'; r.k = 0; r.dur = 1.4; r.toPerch = false;
    if (!spotOK(s, r.tx, r.tz)) { r.tx = g.x; r.tz = g.z; }
    return;
  }
  // sleep: farm animals during kveld (some of them)
  if (SLEEPERS[s.id] && phase() === 'kveld' && (r.i % 3 !== 1) && !r.tapped) { r.st = 'sleep'; r.t = 6 + Math.random() * 6; return; }
  // pop-up animals hide in their hole now and then (never while she is close)
  if (has1(s, 'popup') && dP > 5 && Math.random() < 0.3) { r.st = 'hidden'; r.t = 3 + Math.random() * 5; return; }
  // curious: walks up to her when she stands still
  if (has1(s, 'curious') && still > 2 && dP < 9 && dP > 1.8 && Math.random() < 0.7) {
    const P = F.Player.pos, a = Math.atan2(r.x - P.x, r.z - P.z);
    if (goTo(r, P.x + Math.sin(a) * 1.5, P.z + Math.cos(a) * 1.5, 0.8, 'walk')) return;
  }
  // play near her
  if ((has1(s, 'play') || has1(s, 'slide')) && dP < 6 && Math.random() < 0.35) { r.st = 'play'; r.t = 1.4 + Math.random(); r.k = 0; return; }
  // row: followers trail their predecessor continuously (see integrate); leader wanders slowly
  if (s.social === 'row' && r.lead) { r.st = 'trail'; r.t = 4; return; }
  // herd / follow: stay 1.2–3 m from the leader
  if ((s.social === 'herd' || r.follow) && r.lead && !r.lead.dead) {
    const L = r.lead, a = (r.i * 2.399) % TAU, d = 1.2 + (r.i % 4) * 0.6 + Math.random() * 0.6;
    const tx = L.tx + Math.cos(a) * d, tz = L.tz + Math.sin(a) * d;
    if (Math.hypot(tx - r.x, tz - r.z) > 0.8 && Math.random() < 0.7 && goTo(r, tx, tz, 1, 'walk')) return;
  }
  // grazing / pecking
  if ((has1(s, 'graze') || has1(s, 'peck') || has1(s, 'snuffle') || has1(s, 'dabble')) && Math.random() < 0.45) { r.st = 'graze'; r.t = 2 + Math.random() * 2; return; }
  if (canPerch(s) && !r.perched && Math.random() < (s.id === 'ugle' || s.id === 'hakkespett' ? 0.8 : 0.3)) {
    const P = perchSpots(g).filter(p => !p.used || p.used.dead || p.used.perchAt !== p);
    if (P.length) {
      const p = P[Math.floor(Math.random() * P.length)], a = Math.random() * TAU, o = Math.min(0.35, 0.1 + p.h * 0.03);
      p.used = r; r.perchAt = p;
      r.fx = r.x; r.fz = r.z; r.tx = p.x + Math.cos(a) * o; r.tz = p.z + Math.sin(a) * o; r.a0 = r.air || 0; r.a1 = p.h;
      r.st = 'fly'; r.k = 0; r.dur = Math.max(1.2, Math.hypot(r.tx - r.x, r.tz - r.z) / 2.8); r.toPerch = true;
      return;
    }
  }
  // swimmers jump now and then
  if (has1(s, 'jump') && Math.random() < 0.25) { r.st = 'jump'; r.t = 0.9; r.k = 0; return; }
  // wander
  if (Math.random() < 0.75) {
    for (let k = 0; k < 2; k++) { const [x, z] = wanderTarget(r, s.move === 'crawl' ? 1.5 : g.r); if (goTo(r, x, z, 1, 'walk')) return; }
  }
  r.st = 'idle'; r.t = 1.5 + Math.random() * 3.5;
}
function liftFlock(g) {   // small birds and gulls lift together, circle and land 6–10 m away
  const L = g.recs; if (!L.length) return;
  L.forEach(r => { if (r.perched) { r.perched = false; if (r.perchAt) r.perchAt.used = null; r.perchAt = null; r.a0 = r.air; r.a1 = 0; } });
  let cx = g.x, cz = g.z;
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * TAU, d = 6 + Math.random() * 4; const x = L[0].x + Math.cos(a) * d, z = L[0].z + Math.sin(a) * d;
    const [x2, z2] = clampBox(L[0], x, z);
    if (spotOK(g.sp, x2, z2)) { cx = x2; cz = z2; break; }
  }
  g.x = cx; g.z = cz;
  L.forEach((r, i) => {
    if (r.focus) return;
    const a = Math.random() * TAU, d = Math.random() * 1.6; const [tx, tz] = clampBox(r, cx + Math.cos(a) * d, cz + Math.sin(a) * d);
    r.fx = r.x; r.fz = r.z; r.tx = tx; r.tz = tz; r.st = 'fly'; r.k = 0; r.dur = Math.max(1.6, Math.hypot(tx - r.x, tz - r.z) / 3.2) + i * 0.05;
  });
  if (Math.hypot(F.Player.pos.x - cx, F.Player.pos.z - cz) < 14 && F.sfx && F.sfx.whoosh) F.sfx.whoosh();
}
function integrate(r, dt, t, dP) {
  const s = r.sp;
  r.t -= dt; r.ph += dt;
  if (r.focus) {
    const P = F.Player.pos; r.ry = turn(r.ry, Math.atan2(P.x - r.x, P.z - r.z), dt * 5); r.moving = false; r.happy = true; r.head = 0; r.pop = Math.min(1, r.pop + dt * 3);
    if (r.hopT > 0) { r.hopT -= dt; r.hopK = Math.abs(Math.sin(r.hopT * 9)) * 0.3; } else r.hopK = 0;
    if (r.wig) r.wig = Math.max(0, r.wig - dt);
    return;
  }
  if (r.stageOff) r.pop = Math.max(0, r.pop - dt * 3);      // it stood in front of a task's stage and could not step aside: it fades
  if (r.greetT > 0) { greetStep(r, dt); return; }           // FA.greet: it looks up at her and hops (≈ 1.5 s)
  // shy: if she comes fast and close, hop away 2–4 m (never once tapped)
  if (s.shy && !r.tapped && !r.perched && PS > 3 && dP < 2.5 && r.st !== 'shy') {
    const P = F.Player.pos, a = Math.atan2(r.x - P.x, r.z - P.z), d = s.shy >= 2 ? 3.5 : 2.4;
    if (goTo(r, r.x + Math.sin(a) * d, r.z + Math.cos(a) * d, 2.6, 'shy')) { r.t = 3; r.wig = 0.8; }
  }
  // flock lift when she rushes in
  if (s.social === 'flock' && s.cat === 'fugl' && PS > 3 && dP < 3 && r.st !== 'fly' && !r.tapped) { liftFlock(r.g); r.g.liftT = 18 + Math.random() * 20; }
  switch (r.st) {
    case 'walk': case 'shy': case 'trail': case 'fly': moveStep(r, dt); break;
    case 'perch': r.moving = false; r.head = 0; if (Math.random() < dt * 0.4) r.ry += (Math.random() - 0.5) * 1.2; break;
    case 'graze': r.moving = false; r.head = Math.min(1, r.head + dt * 3); if (r.t <= 0) { r.st = 'idle'; r.t = 0.3; } break;
    case 'sleep':
      r.moving = false; r.head = 0; r.squash = Math.max(0.72, r.squash - dt);
      r.zz = (r.zz || Math.random() * 2) - dt; if (r.zz <= 0) { r.zz = 2.6; if (dP < 16 && r.lod) puff(r); }
      if (r.t <= 0) { r.squash = 1; r.st = 'idle'; r.t = 0.1; }
      break;
    case 'hidden': r.moving = false; r.pop = Math.max(0, r.pop - dt * 3); if (r.t <= 0 || dP < 4) { r.st = 'idle'; r.t = 4 + Math.random() * 6; } break;
    case 'play': {
      r.k = (r.k || 0) + dt; r.moving = false; r.happy = true;
      if (s.move === 'hop' || has1(s, 'slide')) r.hopK = Math.abs(Math.sin(r.k * 7)) * 0.35; else r.ry += dt * 6;
      if (r.t <= 0) { r.st = 'idle'; r.t = 1 + Math.random() * 2; r.hopK = 0; r.happy = false; }
      break;
    }
    case 'jump': {
      if (!r.k && dP < 24) splash(r);
      r.k = (r.k || 0) + dt / 0.9; r.air = Math.sin(Math.min(1, r.k) * Math.PI) * 1.1; r.moving = false;
      if (r.k >= 1) { r.air = 0; r.st = 'idle'; r.t = 3 + Math.random() * 6; if (dP < 24) splash(r); if (dP < 14 && F.sfx && F.sfx.splash && Math.random() < 0.3) F.sfx.splash(); }
      break;
    }
    default: r.moving = false; r.head = Math.max(0, r.head - dt * 3);
  }
  if (r.st !== 'hidden' && !r.stageOff) r.pop = Math.min(1, r.pop + dt * 2.5);
  if (r.st !== 'sleep' && r.squash < 1) r.squash = Math.min(1, r.squash + dt);
  if (r.st !== 'graze') r.head = Math.max(0, r.head - dt * 3);
  if (r.wig) r.wig = Math.max(0, r.wig - dt);
  if (r.leaving != null) {   // release home: walk off, shrink into a sparkle, gone until another day / phase
    r.leaving -= dt; if (r.t < 1) r.t = 1;
    if (r.leaving < 1) r.pop = Math.max(0, r.leaving);
    if (r.leaving <= 0) {
      r.leaving = null; r.pop = 0;
      try { if (F.FX && F.FX.sparkle && r.lod) F.FX.sparkle(new THREE.Vector3(r.x, (r.y || 0) + 0.6, r.z), 0xffd6f5); } catch (e) { /* ignore */ }
      markGone(r.g);
    }
    return;
  }
  if (has1(s, 'circle')) { r.st = 'circle'; r.t = 99; moveStep(r, 0); }
  if (r.t <= 0 && r.st !== 'fly') { decide(r, dP); if (dP > 25 && r.st !== 'walk' && r.st !== 'trail') r.t += 1.5; }   // far records decide less often
}
// motion only (no probes): used every frame for near records and between the 10 Hz decisions of mid-range ones
function moveStep(r, dt) {
  const s = r.sp;
  if (r.st === 'circle') { const a = r.ph * 0.6 + r.i * (TAU / Math.max(1, r.g.n)); const rad = 5 + (r.i % 3); r.x = r.g.x + Math.cos(a) * rad; r.z = r.g.z + Math.sin(a) * rad; r.ry = a + Math.PI; r.air = 4.5 + Math.sin(r.ph + r.i) * 0.8; r.flying = true; return; }
  if (r.st === 'fly') {
    r.k = Math.min(1, r.k + dt / r.dur);
    const k = U.smooth(r.k);
    const a0 = r.a0 || 0, a1 = r.a1 || 0;
    r.x = r.fx + (r.tx - r.fx) * k; r.z = r.fz + (r.tz - r.fz) * k; r.air = a0 + (a1 - a0) * k + Math.sin(r.k * Math.PI) * (r.a0 != null ? 1.4 : 2.6);
    r.ry = turn(r.ry, Math.atan2(r.tx - r.fx, r.tz - r.fz), dt * 6); r.moving = false; r.flying = true;
    if (r.k >= 1) {
      r.flying = false; r.air = a1;
      if (r.toPerch) { r.perched = true; r.st = 'perch'; r.t = 6 + Math.random() * 10; r.ry = Math.random() * TAU; }
      else { r.st = 'idle'; r.t = 0.5 + Math.random() * 2; r.air = 0; }
      r.a0 = r.a1 = null; r.toPerch = false;
    }
    return;
  }
  if (r.st !== 'walk' && r.st !== 'shy' && r.st !== 'trail') return;
  let tx = r.tx, tz = r.tz, sp = s.speed * (r.spdK || 1);
  if (r.st === 'trail' && r.lead && !r.lead.dead) {
    const L = r.lead, gap = s.id === 'maur' ? 0.35 : 0.85;
    tx = L.x - Math.sin(L.ry) * gap; tz = L.z - Math.cos(L.ry) * gap;
    const dd = Math.hypot(tx - r.x, tz - r.z); sp = Math.max(s.speed * 0.6, dd * 1.6);
    if (dd < 0.05) { r.moving = false; return; }
  }
  const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz);
  if (d < 0.08 || r.t <= 0) { r.moving = false; if (r.st !== 'trail') { const wasShy = r.st === 'shy'; r.st = 'idle'; r.t = wasShy ? 1 : 1 + Math.random() * 3; } return; }
  const step = Math.min(d, sp * dt);
  r.x += dx / d * step; r.z += dz / d * step;
  r.ry = turn(r.ry, Math.atan2(dx, dz), dt * 6);
  r.moving = true; r.head = 0;
}
// little effects (only when she is close): water rings for jumping fish, «z» puffs over sleepers
function splash(r) { try { if (F.FX && F.FX.burst) F.FX.burst(new THREE.Vector3(r.x, F.W.WATER + 0.05, r.z), { kind: 'water', n: 8, up: 1.2, speed: 0.6 }); } catch (e) { /* ignore */ } }
let puffT = -9;
function puff(r) { if (F.T.now - puffT < 0.9) return; puffT = F.T.now; try { if (F.FX && F.FX.float) F.FX.float('z', new THREE.Vector3(r.x, (r.y || 0) + instGeo(r.sp).h + 0.2, r.z)); } catch (e) { /* ignore */ } }
function turn(a, b, k) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * Math.min(1, k); }
function gyOf(r) {   // ground height, recomputed only when the record moved
  if (r.gyx === undefined || Math.abs(r.gyx - r.x) > 0.12 || Math.abs(r.gyz - r.z) > 0.12) { r.gy = F.W.groundY(r.x, r.z); r.gyx = r.x; r.gyz = r.z; }
  return r.gy;
}
function yOf(r, t) {
  const s = r.sp;
  let y;
  if (s.where === 'water' || s.where === 'sea') {
    const fish = s.cat === 'fisk' || ['manet', 'blekksprut', 'reke', 'sjøhest'].includes(s.base) || s.id === 'hval' || s.id === 'perlehval' || s.id === 'delfin' || s.id === 'stjernedelfin';
    // W2: small fish swim half under the (transparent) surface instead of lying on it; whales and dolphins show their backs
    const big = s.id.indexOf('hval') >= 0 || s.id.indexOf('delfin') >= 0;
    y = F.W.WATER + (fish ? (big ? -0.25 : s.base === 'manet' ? -0.32 : -Math.max(0.32, Math.min(0.7, instGeo(s).h * 0.55))) : -0.06) + Math.sin(t * 1.6 + r.ph) * 0.03;
  } else {
    y = gyOf(r);
    if (s.where === 'air') y += 0.7 + (r.i % 3) * 0.25 + Math.sin(t * 2.2 + r.ph) * 0.18;
  }
  return y + r.air + r.hopK;
}

/* ================================================================ main loop */
let acc1 = 0, acc10 = 0, errs = 0, hiddenAll = false;
/* nothing of ours covers a task (parent 11.10./12.10.: «problems clear on any allowed zoom»): while a task or a trial runs, the «?»
   discs, the rarity twinkles and the legend columns are not drawn (cueOff), and animals in front of the task's stage step aside (or
   fade where they cannot walk off) until it ends (stageClear) */
let cueOff = false;
const near = [], mid = [];
function hideAll() {
  if (hiddenAll) return;
  hiddenAll = true;
  IM.forEach(o => { o.mesh.visible = false; o.mesh.count = 0; });
  recs.forEach(r => { if (r.obj) r.obj.visible = false; });
  if (shadow) shadow.count = 0;
  if (cueQ) { cueQ.geometry.setDrawRange(0, 0); cueS.geometry.setDrawRange(0, 0); }
  columns.forEach(m => { m.visible = false; });
}
function pass1Hz() {
  const P = F.Player.pos;
  // materialize / dematerialize by group-home distance (nearest first; cap MAX_REC)
  const cand = [];
  allGroups(g => { const d = Math.hypot(g.x - P.x, g.z - P.z); g.d = d; g.hide = !gateOK(g); cand.push(g); });
  cand.sort((a, b) => a.d - b.d);
  let n = 0;
  for (const g of cand) {
    const far = g.layer === 'C' ? 30 : 0;    // legends exist further out so their rainbow column shows from ~80 m
    const want = (g.d < (g.live ? DEMAT_R : MAT_R) + far || g.layer === 'P') && !g.hide;
    if (want && n + g.n <= MAX_REC) { materialize(g); n += g.n; }
    else if (g.live) dematerialize(g);
  }
  // glimt slots: re-roll on a new day / phase / weather; bad-luck counter when she passes within 25 m
  const sv = save();
  glimt.forEach((sl, key) => {
    const a = sl.g ? sl.g.a : areaCache.get(key); if (!a) return;
    const k2 = glimtKey(a);
    if (k2 !== sl.key) { if (sl.g) dematerialize(sl.g); try { glimt.set(key, genGlimt(a)); } catch (e) { console.error('[fauna] glimt', e); } return; }
    if (!sl.passed && Math.hypot(sl.x - P.x, sl.z - P.z) < 25) { sl.passed = true; if (!sl.g || has(sl.g.sp.id)) { sv.dry++; } }
  });
  // legends: re-evaluate when day / phase / weather change
  groups.forEach((L, key) => {
    const a = areaCache.get(key); if (!a || !anchors.has(key)) return;
    const k2 = day() + '|' + phaseIdx() + '|' + weatherAt((anchors.get(key)[0] || {}).regionId);
    if (a.legendKey && a.legendKey !== k2) {
      L.filter(g => g.layer === 'C' || g.layer === 'Z').forEach(dematerialize);
      const rest = L.filter(g => g.layer !== 'C' && g.layer !== 'Z');
      let add = []; try { add = genAnchors(a); } catch (e) { console.error('[fauna] anchors', e); }
      groups.set(key, rest.concat(add));
    }
  });
  // Dyreparken welcome – once ever (the place banner names it every visit), and only when it is calm
  anchors.forEach((L, key) => { const a = areaCache.get(key); if (a && a.zoo && !a.zooHi && Math.hypot(a.zoo.x - P.x, a.zoo.z - P.z) < 22) { a.zooHi = true; if (!sv.zooHi && !whyBusy()) { sv.zooHi = day(); F.store && F.store(); F.SAYF && F.SAYF('fa_zoo_hi'); } } });
  // still / speed of the fairy
  FA.stats.groups = cand.length;
}
function lodPass() {
  const P = F.Player.pos;
  near.length = 0; mid.length = 0;
  for (const r of recs) {
    const d = Math.hypot(r.x - P.x, r.z - P.z); r.dP = d;
    // v5 WP-A (playtest flicker cause 2): ±4 m hysteresis at the 45 m edge – shown animals stay until 49 m
    if (r.g.hide || r.pop < 0.05 && r.st === 'hidden' || d > (r.lod ? MID + 4 : MID)) { r.want = 0; continue; }
    r.want = 1;
    if (d <= NEAR || r.focus || r.g.layer === 'P') near.push(r); else mid.push(r);
  }
  near.sort((a, b) => (b.focus || b.g.layer === 'P' ? 1 : 0) - (a.focus || a.g.layer === 'P' ? 1 : 0) || a.dP - b.dP);
  // sticky ranking: an animal on screen keeps its budget slot until a hidden one is 8 m closer (the triangle/species cuts below
  // no longer flip animals at the cut every 0.1 s while they wander)
  const rk = r => r.dP - (r.lod ? 8 : 0);
  mid.sort((a, b) => rk(a) - rk(b));
  // rigs first (nearest), then instanced; enforce draw-call / triangle / species caps
  const rig = [], inst = [];
  const sh0 = (near.length + mid.length) * 14;   // blob shadows (12 tris each) + cue sprites
  near.forEach(r => { if (rig.length < CFG.maxRig && (r.dP <= CFG.nearR || r.focus || r.g.layer === 'P')) rig.push(r); else inst.push(r); });
  mid.forEach(r => inst.push(r));
  const spCount = new Map(); inst.forEach(r => spCount.set(instKey(r.sp), (spCount.get(instKey(r.sp)) || 0) + 1));
  // species cap: keep the 22 most populous instanced species
  if (spCount.size > MAX_INST) {
    const shown = new Set(inst.filter(r => r.lod === 1).map(r => instKey(r.sp)));
    const keep = new Set([...spCount.entries()].sort((a, b) => (shown.has(b[0]) ? 1 : 0) - (shown.has(a[0]) ? 1 : 0) || b[1] - a[1]).slice(0, MAX_INST).map(e => e[0]));
    for (let i = inst.length - 1; i >= 0; i--) if (!keep.has(instKey(inst[i].sp))) { inst[i].want = 0; inst.splice(i, 1); }
    spCount.forEach((v, k) => { if (!keep.has(k)) spCount.delete(k); });
  }
  let dc = 3 + spCount.size + rig.reduce((n, r) => n + rigCost(r.sp), 0) + (columns.size || 0);
  while (dc > DC_BUDGET && rig.length > 1) {
    const r = rig.pop(); const k = instKey(r.sp);
    dc -= rigCost(r.sp); if (!spCount.has(k)) { spCount.set(k, 0); dc++; } spCount.set(k, spCount.get(k) + 1); inst.unshift(r);
  }
  // still over (many species): drop the least populous instanced species until the draw-call and species caps hold
  if (dc > DC_BUDGET || spCount.size > MAX_INST) {
    const shownSp = new Set(inst.filter(r => r.lod > 0).map(r => instKey(r.sp)));
    const order = [...spCount.entries()].sort((x, y) => (shownSp.has(x[0]) ? 1 : 0) - (shownSp.has(y[0]) ? 1 : 0) || x[1] - y[1]);   // v5: drop hidden species first
    const drop = new Set();
    for (const [k2] of order) { if (dc <= DC_BUDGET && spCount.size - drop.size <= MAX_INST) break; drop.add(k2); dc--; }
    for (let i = inst.length - 1; i >= 0; i--) if (drop.has(instKey(inst[i].sp))) { inst[i].want = 0; inst.splice(i, 1); }
    drop.forEach(k2 => spCount.delete(k2));
  }
  let tris = sh0;
  rig.forEach(r => { tris += rigTris.get(instKey(r.sp)) || instGeo(r.sp).tris * 2; });
  // v5 WP-A: budget hysteresis – animals already on screen are kept up to the full budget first; a hidden one comes in only while
  // 2,000 triangles stay free (so the cut no longer toggles the same animals on and off every 0.1 s)
  { const kept = [];
    for (const shown of [true, false]) {
      const lim = shown ? TRI_BUDGET : TRI_BUDGET - 2000; let full = false;
      for (const r of inst) { if (!!r.lod !== shown) continue; const tt = instGeo(r.sp).tris; if (full || tris + tt > lim) { full = true; r.want = 0; continue; } tris += tt; kept.push(r); }
    }
    inst.length = 0; kept.forEach(r => inst.push(r)); }
  for (const r of recs) r.lodN = 0;
  rig.forEach(r => { r.lodN = 2; }); inst.forEach(r => { r.lodN = 1; });
  for (const r of recs) { if (r.lodN !== 2 && r.obj) dropRig(r); r.lod = r.lodN; }
  FA.stats.recs = recs.length; FA.stats.rigs = rig.length; FA.stats.inst = inst.length; FA.stats.instSp = spCount.size; FA.stats.dc = dc; FA.stats.tris = Math.round(tris);
}
const instKey = s => (s.zoo ? 'z:' + s.id : s.id);
function render(t, dt) {
  ensureFx();
  IM.forEach(o => { o.n = 0; });
  let sh = 0, nq = 0, ns = 0;
  const QA = cueQ.geometry.attributes.position.array, SA = cueS.geometry.attributes.position.array, SC = cueS.geometry.attributes.color.array;
  const cueR = kikkert() ? 30 : 15;
  const P = F.Player.pos;
  for (const r of recs) {
    if (!r.lod) { if (r.obj) r.obj.visible = false; continue; }
    const s = r.sp, G = instGeo(s);
    r.y = yOf(r, t);
    const sq = r.squash * (0.15 + 0.85 * (r.stageOff ? 1 : r.pop)), shr = r.stageOff ? Math.max(0.001, r.pop) : 1;   // stageOff: shrinks whole
    const wig = r.wig ? Math.sin(t * 30) * 0.25 * r.wig : 0;
    const pitch = r.head * 0.22 + (r.flying ? -0.1 : 0);
    const roll = r.st === 'sleep' ? 0.35 : 0;
    const scl = (s.legend === 'giant' ? 2.2 : 1) * shr;
    if (r.lod === 2) {
      const o = takeRig(r); o.visible = true;
      o.position.set(r.x, r.y, r.z); o.rotation.set(pitch, r.ry + wig, roll, 'YXZ'); o.scale.set(scl, scl * sq, scl);
      try { if (F.Rig) F.Rig.tick(o, t, { moving: r.moving, happy: r.happy || r.focus, fly: r.flying || s.where === 'air', speed: (r.spdK || 1) }); } catch (e) { /* not rigged */ }
      if (o.userData.parts && o.userData.parts.head && r.head > 0) o.userData.parts.head.rotation.x += r.head * 0.5;
    } else {
      const o = instMesh(s);
      if (o.n < o.cap) {
        _e.set(pitch, r.ry + wig, roll, 'YXZ'); _q.setFromEuler(_e); _p.set(r.x, r.y + (r.moving && s.move !== 'crawl' && s.where === 'land' ? Math.abs(Math.sin(t * 9 + r.ph)) * (s.move === 'hop' ? 0.2 : 0.03) : 0), r.z); _s.set(scl, scl * sq, scl);
        _m.compose(_p, _q, _s); o.mesh.setMatrixAt(o.n, _m);
        if (s.glitter) { _c.setHex(ELCOL[s.glitter] || 0xffffff).lerp(WHITE, 0.45); o.mesh.setColorAt(o.n, _c); } else o.mesh.setColorAt(o.n, _c.setRGB(1, 1, 1));
        o.n++;
      }
    }
    // blob shadow (land + low fliers)
    if (sh < SHCAP && s.where !== 'water' && s.where !== 'sea') {
      const gy = gyOf(r) + 0.03, w = Math.max(0.35, G.w * 0.9 * scl) * (1 - Math.min(0.6, (r.air + (s.where === 'air' ? 0.8 : 0)) * 0.15)) * r.pop;
      _q.identity(); _p.set(r.x, gy, r.z); _s.set(w, 1, w); _m.compose(_p, _q, _s); shadow.setMatrixAt(sh++, _m);
    }
    // cues: «?» for un-befriended species within 15 m (30 with Kikkert), twinkles for sjelden, element sparkles for glitterdyr
    const unk = !s.zoo && !has(s.id) && r.pop > 0.5 && !cueOff;
    if (unk && r.dP < cueR && nq < CUEQ && (r.i === 0 || r.g.n <= 3)) { QA[nq * 3] = r.x; QA[nq * 3 + 1] = r.y + G.h * scl + 0.55 + Math.sin(t * 2.5 + r.ph) * 0.08; QA[nq * 3 + 2] = r.z; nq++; }
    if ((s.tier >= 2) && !cueOff && r.dP < cueR * 1.5 && ns < CUES - 3) {
      const n = s.tier >= 3 ? 3 : 1, cc = s.glitter ? _c.setHex(ELCOL[s.glitter]) : _c.setHex(0xfff2a8);
      for (let k = 0; k < n; k++) {
        if (Math.sin(t * 3 + r.ph * 7 + k * 2) < -0.2 && s.tier < 3) continue;
        const a = t * 1.5 + k * 2.1 + r.ph, rr = 0.35 + G.w * 0.5;
        SA[ns * 3] = r.x + Math.cos(a) * rr; SA[ns * 3 + 1] = r.y + G.h * (0.5 + 0.4 * Math.sin(a * 1.3)) * scl + (s.tier >= 3 ? ((t * 0.6 + k * 0.33) % 1) * 0.6 : 0); SA[ns * 3 + 2] = r.z + Math.sin(a) * rr;
        SC[ns * 3] = cc.r; SC[ns * 3 + 1] = cc.g; SC[ns * 3 + 2] = cc.b; ns++;
      }
    }
    if (s.tier === 4 || r.g.layer === 'C') { const m = columnFor(r, true); m.visible = !cueOff; m.position.set(r.x, r.y + 23, r.z); m.material.opacity = 0.34 + 0.1 * Math.sin(t * 2); }
    // first sight: recorded at once; what is said about it waits in the discovery queue until it is calm and on screen (clarity §3.9 FA)
    if (!r.seen && r.dP < 15 && r.pop > 0.5) {
      r.seen = true;
      const sv = save();
      F.emit('animalSeen', s.id, r);
      seasonSeen(s, r);
      if (!s.zoo && !sv.seen[s.id]) {
        sv.seen[s.id] = day(); F.store && F.store();
        if (!has(s.id) && r.g.layer !== 'P' && s.tier !== 4) discover(r, s.tier === 3 ? 'fa_glitter' : 'fa_new');
      }
      if (s.tier === 4 && !sv.legendSeen[s.id]) { sv.legendSeen[s.id] = { day: day(), x: Math.round(r.x), z: Math.round(r.z) }; F.store && F.store(); F.emit('legendSeen', s.id); discover(r, 'fa_legend'); }
    }
  }
  // legend columns are visible from 80 m even when the legend itself is beyond the LOD range
  columns.forEach((m, r) => { if (r.dead) { columnFor(r, false); return; } if (!r.lod) { const d = Math.hypot(r.x - P.x, r.z - P.z); m.visible = d < 80 && !cueOff; if (m.visible) m.position.set(r.x, F.W.groundY(r.x, r.z) + 23, r.z); } });
  recs.forEach(r => { if ((r.sp.tier === 4 || r.g.layer === 'C') && !r.lod && !columns.has(r) && Math.hypot(r.x - P.x, r.z - P.z) < 80) { const m = columnFor(r, true); m.position.set(r.x, F.W.groundY(r.x, r.z) + 23, r.z); } });
  IM.forEach(o => { o.mesh.count = o.n; o.mesh.visible = o.n > 0; if (o.n) { o.mesh.instanceMatrix.needsUpdate = true; if (o.mesh.instanceColor) o.mesh.instanceColor.needsUpdate = true; } });
  shadow.count = sh; shadow.instanceMatrix.needsUpdate = true;
  cueQ.geometry.setDrawRange(0, nq); cueQ.geometry.attributes.position.needsUpdate = true;
  cueS.geometry.setDrawRange(0, ns); cueS.geometry.attributes.position.needsUpdate = true; cueS.geometry.attributes.color.needsUpdate = true;
  cueS.material.opacity = 0.75 + 0.25 * Math.sin(t * 6);
  // the «?» stays readable when she zooms out (≈ 19 px at the far zoom step instead of 12; the near steps keep their size)
  const zk = Math.max(1, ((F.R.cam && F.R.cam.dist) || 24) / 24);
  cueQ.material.size = 1.25 * zk; cueS.material.size = 0.32 * zk;
}
F.on('tick', (dt, t) => {
  if (!FA.enabled || !F.booted || !F.W || !F.Player) return;
  if (F.Space.cur !== 'out') { hideAll(); return; }
  if (errs > 5) return;
  const t0 = performance.now();
  try {
    hiddenAll = false;
    const P = F.Player.pos;
    PS = dt > 0 ? Math.hypot(P.x - lastPX, P.z - lastPZ) / dt : 0; lastPX = P.x; lastPZ = P.z;
    if (PS > 40) PS = 0;   // teleport
    still = PS < 0.3 ? still + dt : 0;
    acc1 += dt; acc10 += dt;
    const tA = performance.now();
    if (acc1 >= 1) { acc1 = 0; pass1Hz(); }
    PR.p1 += performance.now() - tA;
    // flocks lift on their own now and then
    let doMid = false; if (acc10 >= 0.1) { doMid = true; }
    for (const r of recs) {
      const d = Math.hypot(r.x - P.x, r.z - P.z);
      if (r.g.hide) continue;
      if (d > MID + 8 && !r.focus && r.g.layer !== 'P') continue;   // > 45 m: no simulation
      if (r.g.layer === 'P') { companionTick(r, dt, t); continue; }
      if (d <= NEAR || r.focus) integrate(r, dt, t, d);
      else if (doMid) integrate(r, acc10, t, d);
      else if (r.lod && (r.st === 'walk' || r.st === 'shy' || r.st === 'trail' || r.st === 'fly' || r.st === 'circle')) integrateLight(r, dt);
    }
    const tB = performance.now(); PR.sim += tB - tA;
    if (doMid) {
      friendCache.clear();
      allGroups(g => { if (!g.live || g.sp.social !== 'flock' || g.sp.cat !== 'fugl' || has1(g.sp, 'circle')) return; g.liftT -= acc10; if (g.liftT <= 0) { g.liftT = 15 + Math.random() * 25; if (g.d < MID) liftFlock(g); } });
      acc10 = 0; lodPass();
    }
    const tC = performance.now(); PR.lod += tC - tB;
    render(t, dt);
    PR.render += performance.now() - tC; PR.n++;
  } catch (e) { errs++; console.error('[fauna] tick', e); if (errs > 5) { console.error('[fauna] disabled after repeated errors'); hideAll(); } }
  FA.stats.ms = FA.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
});
// light per-frame motion for mid-range records between their 10 Hz decisions (keeps walking smooth without probes)
function integrateLight(r, dt) { r.ph += dt; const t0 = r.t; moveStep(r, dt); r.t = t0; }
F.on('spaceChanged', () => { if (F.Space.cur !== 'out') hideAll(); });

/* ================================================================ picking + taps */
const _v = new THREE.Vector3();
/* v2 fix (parent + review:kid): an EXACT hit – the tap must land inside the animal's projected model box (+4 px; tiny insects get a 28 px box
   at least), no nearest-within-48-px snap, so a «fly there» tap on grass beside an animal never starts an encounter by accident. */
const PICK_PAD = 4, PICK_MINH = 14;
function screenBox(r, cv) {
  const G = instGeo(r.sp), bb = G.geometry.boundingBox; if (!bb) return null;
  const scl = r.sp.legend === 'giant' ? 2.2 : 1, c = Math.cos(r.ry || 0), sn = Math.sin(r.ry || 0);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const lx = (i & 1 ? bb.max.x : bb.min.x) * scl, ly = (i & 2 ? bb.max.y : Math.max(0, bb.min.y)) * scl, lz = (i & 4 ? bb.max.z : bb.min.z) * scl;
    _v.set(r.x + lx * c + lz * sn, r.y + ly, r.z - lx * sn + lz * c).project(F.R.camera);
    if (_v.z > 1) return null;
    const x = cv.left + (_v.x + 1) / 2 * cv.width, y = cv.top + (1 - _v.y) / 2 * cv.height;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: Math.max((x1 - x0) / 2 + PICK_PAD, PICK_MINH), hh: Math.max((y1 - y0) / 2 + PICK_PAD, PICK_MINH) };
}
FA.pick = function (sx, sy) {
  if (!FA.enabled || F.Space.cur !== 'out' || !F.R || !F.R.camera) return null;
  const P = F.Player.pos, cv = F.R.renderer.domElement.getBoundingClientRect();
  let best = null, bd = Infinity;
  for (const r of recs) {
    if (!r.lod || r.pop < 0.4 || r.g.hide) continue;
    if (Math.hypot(r.x - P.x, r.z - P.z) > PICK_M) continue;
    const b = screenBox(r, cv); if (!b) continue;
    const dx = Math.abs(sx - b.cx) / b.hw, dy = Math.abs(sy - b.cy) / b.hh;
    if (dx > 1 || dy > 1) continue;
    const d = Math.max(dx, dy);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
};
FA.screenBox = r => (F.R && F.R.camera ? screenBox(r, F.R.renderer.domElement.getBoundingClientRect()) : null);
FA.screenOf = function (r) {
  const cv = F.R.renderer.domElement.getBoundingClientRect(), G = instGeo(r.sp);
  _v.set(r.x, r.y + G.h * 0.5, r.z).project(F.R.camera);
  return { x: cv.left + (_v.x + 1) / 2 * cv.width, y: cv.top + (1 - _v.y) / 2 * cv.height, onScreen: _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1 };
};
function pickHook(sx, sy) {
  const r = FA.pick(sx, sy); if (!r) return null;
  const point = new THREE.Vector3(r.x, r.y + instGeo(r.sp).h * 0.5, r.z);
  return { kind: 'fauna', rec: r, point, dist: point.distanceTo(F.R.camera.position), press: () => FA.tap(r) };   // dist: for a depth compare with thing hits (lead)
}
const SFX = { mo: 'moo', bae: 'baa', noff: 'oink', klukk: 'cluck' };
function soundOf(r) {
  const s = r.sp, f = F.sfx || {};
  // v5 WP-A: the species' own soft synthesized voice (js/game/sfx_animals.js) – never a TTS onomatopoeia
  if (f.animal && s.sound && f.animal(s.sound)) return;
  const n = SFX[s.sound]; if (n && f[n]) { f[n](); return; }
  if (f.squeak && (s.cat === 'fugl' || s.cat === 'smådyr')) f.squeak(); else if (f.boing) f.boing();
}
function hearts(r, n) {
  try { if (F.FX && F.FX.burst) F.FX.burst(new THREE.Vector3(r.x, r.y + instGeo(r.sp).h + 0.3, r.z), { kind: 'heart', n: n || 10, up: 2, speed: 0.9 }); } catch (e) { /* ignore */ }
}
function playNow(r, sec) { if (r.focus) return; r.st = 'play'; r.t = sec || 1.6; r.k = 0; r.pop = 1; }
/* where she flies to for a tap: land animals 1.9 m away on her side; water and sea animals the nearest dry shore point ≤ 6 m away
   (§5.2, same rule as WP6's encounter approach); a whale further out: the dry point on the line toward her (she watches from the shore) */
function dryOK(x, z, m) { try { return !F.W.water(x, z) && !F.W.blocked(x, z, 0.35) && !castleBlock(x, z) && (!m || (!F.W.water(x + m, z) && !F.W.water(x - m, z) && !F.W.water(x, z + m) && !F.W.water(x, z - m))); } catch (e) { return false; } }
function approachSpot(r) {
  const P = F.Player.pos, s = r.sp, a = Math.atan2(P.x - r.x, P.z - r.z);
  if (s.where !== 'water' && s.where !== 'sea') {
    for (const da of [0, 0.5, -0.5, 1, -1]) { const x = r.x + Math.sin(a + da) * 1.9, z = r.z + Math.cos(a + da) * 1.9; if (dryOK(x, z)) return { x, z }; }
    return { x: r.x + Math.sin(a) * 1.9, z: r.z + Math.cos(a) * 1.9 };
  }
  for (let d = 1.5; d <= 10.01; d += 0.5) for (let k = 0; k < 12; k++) {   // ≤ 6 m whenever the shore allows; a whale further out: up to 10 m
    const ang = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6, x = r.x + Math.sin(ang) * d, z = r.z + Math.cos(ang) * d;
    if (dryOK(x, z, 0.6)) return { x, z };   // a margin, so she never stops on the wet edge
  }
  const D = Math.hypot(P.x - r.x, P.z - r.z);
  for (let d = 6.5; d < D; d += 0.5) { const x = r.x + Math.sin(a) * d, z = r.z + Math.cos(a) * d; if (dryOK(x, z, 0.6)) return { x, z }; }
  return null;
}
FA.approachSpot = approachSpot;
/* parent 11.10. («feels so cheesy»; audit D2 #3 / #17 / #63): petting is the animal's own sound, hearts and a hop – no narrator on top
   of the real moo («Den sier mø!» is retired, and so is «De bor i dyreparken.» on every zoo tap). At most ONE spoken petting line per
   species per session: «Så myk den er!» for a furry / feathered land animal, «Kos, kos, den liker deg!» for the others she can cuddle;
   none for insects, crawlers and sea animals. */
const petSaid = new Set();
const SOFT = { 'gårdsdyr': 1, 'kjæledyr': 1, vilt: 1, 'smådyr': 1 };
function petLine(s) {
  if (s.where === 'water' || s.where === 'sea' || s.cat === 'insekt' || s.cat === 'sjødyr' || s.move === 'crawl' || s.move === 'swim') return null;
  return SOFT[s.cat] ? 'fa_pet2' : 'fa_pet3';
}
FA.pet = function (r) {
  soundOf(r); hearts(r, 12); playNow(r, 1.8);
  const s = r.sp;
  if (F.SAYF) {
    // v5c WP-A2: petting a friend TEACHES (teach before test, DESIGN5 §2.3 / §9): F.VIT.petPick says what it may tell – a fact or its word
    // that still needs exposures, else a new one within today's caps – and never a key that is due (that one is kept for the
    // Vennestjerne recall: hearing it right before the question would hand her the answer). At most one teaching line per friend per
    // 90 s (the other taps: its sound / a petting line).
    const busy = F.Speech && F.Speech.busy && F.Speech.busy();
    if (F.OBJ && F.OBJ.animalTalk && !s.zoo && hasRaw(s.id) && F.VIT && F.VIT.petPick && !busy && F.T.now - (petTaught[s.id] || -1e9) > 90) {
      let pk = null; try { pk = F.VIT.petPick(s.id); } catch (e) { pk = null; }
      if (pk) {
        petTaught[s.id] = F.T.now;
        if (pk.kind === 'word') { F.VIT.sayWord(s.id, pk.wd); return; }
        const p0 = pk.isNew && F.TPL.has('vit_visste') ? F.SAYF('vit_visste') : Promise.resolve();
        p0.then(() => F.VIT.sayFact(s.id, pk.text)); return;
      }
    }
    const id = petLine(s), key = (s.zoo ? 'z:' : '') + s.id;
    if (!id || petSaid.has(key) || busy) return;
    petSaid.add(key);
    F.SAYF(id);
  }
};
const petTaught = {};
// v5c WP-A2: the season lines – a migrant seen while they gather, the first migrant back in spring. Clarity 12.10. (rare beats constant):
// each ONCE A YEAR (the gathering was once a day for four weeks), through the discovery queue (calm, the bird on screen, no greet)
function seasonSeen(s, r) {
  try {
    if (!F.THEMES || !F.THEMES.migrant || !F.THEMES.migrant(s.id) || (F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy)) return;
    const S = seasonNow().S, sv = save(), y = seasonNow().d.getFullYear();
    if (S && S.flock && sv.flockYear !== y && F.TPL.has('fa_flokk')) { sv.flockYear = y; F.store && F.store(); discover(r, 'fa_flokk', { noGreet: true }); }
    else if (S && S.back && sv.backYear !== y && F.TPL.has('fa_tilbake')) { sv.backYear = y; F.store && F.store(); discover(r, 'fa_tilbake', { noGreet: true }); }
  } catch (e) { /* lines only */ }
}
let tapBusy = false;
/* audit D2 #42 (parent 11.10.: «random stuff are being said for her to do stuff … destructive»): the FIRST tap on an un-befriended
   animal starts nothing. She flies close, the animal looks up at her, makes its sound and hops, and a heart bubble floats above it for
   ≈ 12 s. Tapping the heart (or the animal again, ≥ 0.5 s after her PREVIOUS tap on it) starts the Venneprøve – she chooses it, the same
   pattern as a friend's ★. Mashing the animal (taps < 0.5 s apart) never starts it: each quick tap only restarts the 0.5 s. No words.
   A resting animal (cooldown) or a play break: the reaction only, no heart. */
const INVITE_S = 12, RETAP_S = 0.5;
let invite = null;                 // {r, t0, last, el, off}  (last = her latest tap on the invited animal)
function inviteOff(why) {
  const iv = invite; if (!iv) return;
  invite = null;
  try { iv.off(); } catch (e) { /* listener */ }
  if (iv.el) { iv.el.style.pointerEvents = 'none'; iv.el.style.opacity = '0'; setTimeout(() => iv.el.remove(), 260); }
  if (why !== 'start' && iv.r && !iv.r.dead && iv.r.focus && !(F.Befriend && F.Befriend.busy)) { iv.r.focus = false; iv.r.t = 0.5; }
}
FA.invite = () => (invite ? { id: invite.r.id, sp: invite.r.sp.id, age: +(F.T.now - invite.t0).toFixed(2), el: !!invite.el } : null);
const HEART_SVG = '<svg viewBox="0 0 24 22" aria-hidden="true" style="width:100%;height:100%;display:block"><path fill="#ff6fa8" stroke="#fff" stroke-width="1.6" d="M12 21C5.6 15.6 1.2 11.6 1.2 6.9 1.2 3.7 3.6 1.4 6.6 1.4c2.1 0 3.9 1.1 5.4 3.1 1.5-2 3.3-3.1 5.4-3.1 3 0 5.4 2.3 5.4 5.5 0 4.7-4.4 8.7-10.8 14.1z"/></svg>';
function inviteOn(r) {
  inviteOff('new');
  const host = document.querySelector('#bubbles') || document.body;
  const el = document.createElement('div');
  el.className = 'wbubble fa-heart';
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Bli venn');
  el.style.cssText = 'pointer-events:auto;cursor:pointer;padding:7px;width:46px;height:44px;border-radius:24px;transition:opacity .25s;touch-action:manipulation';
  el.innerHTML = HEART_SVG;
  host.appendChild(el);
  const iv = invite = { r, t0: F.T.now, last: F.T.now, el, off: null };
  const upd = () => {
    if (invite !== iv) return;
    if (r.dead || F.Space.cur !== 'out' || F.T.now - iv.t0 > INVITE_S || (F.Task && F.Task.current)) { inviteOff('gone'); return; }
    const h = instGeo(r.sp).h * (r.sp.legend === 'giant' ? 2.2 : 1);
    _v.set(r.x, (r.y || 0) + h + 0.45, r.z).project(F.R.camera);
    const cv = F.R.renderer.domElement.getBoundingClientRect(), k = (F.T.now - iv.t0);
    el.style.left = (cv.left + (_v.x + 1) / 2 * cv.width).toFixed(1) + 'px'; el.style.top = (cv.top + (1 - _v.y) / 2 * cv.height).toFixed(1) + 'px';
    el.style.display = _v.z < 1 ? '' : 'none';
    // pops in, then breathes gently; fades over its last second
    const pop = Math.min(1, k / 0.25), s = (0.6 + 0.4 * pop) * (1 + 0.07 * Math.sin(k * 4.2));
    el.style.transform = `translate(-50%, -100%) scale(${s.toFixed(3)})`;
    el.style.opacity = String(Math.max(0, Math.min(1, INVITE_S - k)));
  };
  iv.off = F.on('preRender', upd); upd();
  const go = e => { e.stopPropagation(); e.preventDefault(); if (invite === iv) { F.sfx.click(); startTrial(r); } };
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', go);
}
function inviteReact(r, heart) {
  // the animal looks up at her: it stops, turns to her, hops and makes its own sound (a resting one only wiggles)
  r.focus = true; r.tapped = true; r.hopK = 0;
  if (r.st === 'fly' || r.st === 'circle') { r.air = 0; r.flying = false; }
  r.st = 'idle'; r.t = INVITE_S;
  r.hopT = 0.6; soundOf(r);
  if (heart) hearts(r, 5); else r.wig = 0.7;
}
async function startTrial(r) {
  if (tapBusy || r.dead || (F.Befriend && F.Befriend.busy)) return;
  inviteOff('start');
  tapBusy = true;
  const t0 = F.T.now; let res = null;
  try { res = F.Befriend && F.Befriend.start ? await F.Befriend.start(r) : null; } catch (e) { console.error('[fauna] Befriend.start', e); }
  tapBusy = false;
  if (r.focus) FA.release(r, { mode: res && res.won ? 'won' : 'later' });
  // no encounter happened (stub / refused): give the petting reaction so the tap never feels dead
  if (!res || (!res.won && !(res.outcomes && res.outcomes.length) && F.T.now - t0 < 0.2)) FA.pet(r);
}
let wokeSaid = false, breakSaid = false;
FA.tap = async function (r) {
  if (!r || r.dead || tapBusy) return;
  if (F.Befriend && F.Befriend.busy) return;
  const s = r.sp;
  // the invited animal again, a calm tap (≥ 0.5 s after her previous one): she wants to play – the Venneprøve starts. A bouncing finger or
  // a child mashing the animal (taps < 0.5 s apart) only restarts the 0.5 s – it never starts a trial she did not choose
  if (invite && invite.r === r) { const gap = F.T.now - invite.last; invite.last = F.T.now; if (gap >= RETAP_S) startTrial(r); return; }
  r.tapped = true;
  // logic #47: a tap wakes a sleeper (the squash and its sound show it; «Den våknet!» once a session)
  if (r.st === 'sleep') { r.squash = 1; r.st = 'idle'; r.t = 2; if (!wokeSaid && F.SAYF) { wokeSaid = true; F.SAYF(F.TPL.has('fa_woke') ? 'fa_woke' : 'fa_sleep'); } }
  const friendly = s.zoo || hasRaw(s.id) || r.g.layer === 'P';
  const brk = !friendly && F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask();
  const resting = !friendly && !brk && !!(F.Befriend && F.Befriend.cooling && F.Befriend.cooling(s.id));
  if (!friendly) {   // the invitation: shown at once (the animal looks up as she taps), then she flies close
    inviteReact(r, !brk && !resting);
    if (!brk && !resting && F.Befriend && F.Befriend.start) inviteOn(r);
    else F.T.timeout(() => { if (!invite || invite.r !== r) { if (r.focus && !(F.Befriend && F.Befriend.busy)) { r.focus = false; r.t = 0.5; } } }, 2500);
    if (brk && !breakSaid && F.SAYF) { breakSaid = true; F.SAYF('fa_break'); }     // why no heart: said once a session
  }
  // fly close (the animal stays put once tapped); the befriend flow does its own framing approach
  const P = F.Player.pos, d = Math.hypot(r.x - P.x, r.z - P.z);
  const sp = d > 2.6 && F.Player.goTo ? approachSpot(r) : null;
  if (sp && Math.hypot(sp.x - P.x, sp.z - P.z) > 0.8) {
    const own = !r.focus; r.focus = true;
    try { await Promise.race([F.Player.goTo(sp.x, sp.z), F.T.sleep(4000)]); } catch (e) { /* ignore */ }
    if (own && !(F.Befriend && F.Befriend.busy)) r.focus = false;
  }
  if (friendly) {   // v3 Vennestjerne (WP2): a friend may invite her to play (2nd tap → mini-trial); else the petting reaction
    if (!s.zoo && hasRaw(s.id) && F.Befriend && F.Befriend.friendTap) { try { if (F.Befriend.friendTap(r)) return; } catch (e) { console.error('[fauna] friendTap', e); } }
    FA.pet(r); return;
  }
};
F.on('befriendStart', () => inviteOff('start'));
// small reactions the befriend flow asks for: 'tilt' (curious head tilt) | 'happy' (hop) | 'won' (hearts + play) | 'later'
FA.react = function (r, kind) {
  if (!r || r.dead) return false;
  if (kind === 'tilt') { r.wig = 0.9; }
  else if (kind === 'happy') { r.hopT = 0.6; soundOf(r); }
  else if (kind === 'won') { hearts(r, 16); r.hopT = 1.2; soundOf(r); }
  else if (kind === 'later') { r.wig = 0.6; }
  return true;
};
/* clarity §3.0 / §3.9: F.Fauna.greet(rec) – the animal notices her: it stops, turns to her, looks up and hops once or twice, with its own
   sound (never words). A sleeper only stirs (no sound); a bird in the air calls and wiggles (it is not pulled out of the sky); an animal she
   is busy with (its heart invitation / a trial) is left alone. Returns true when it reacted. Used by the first-time «?» cue (firsts.js),
   by Puff's «nytt dyr» suggestion (hud.js) and by fauna.js itself at the first sight of a species. */
function greetStep(r, dt) {
  r.greetT -= dt; r.greetK = (r.greetK || 0) + dt;
  const P = F.Player.pos, k = r.greetK;
  r.ry = turn(r.ry, Math.atan2(P.x - r.x, P.z - r.z), dt * 7); r.moving = false;
  r.head = -Math.min(1.3, k * 6) * (r.greetT > 0.3 ? 1 : Math.max(0, r.greetT / 0.3));      // nose up (the body pitch reads it), then back
  r.hopK = k > 0.25 && k < 0.95 ? Math.abs(Math.sin((k - 0.25) * 9)) * 0.28 : 0;            // two little hops
  if (r.greetT <= 0) { r.greetT = 0; r.head = 0; r.hopK = 0; if (r.st !== 'perch') { r.st = 'idle'; r.t = 0.6 + Math.random(); } }
}
FA.greet = function (r) {
  if (!r || r.dead || !r.sp || (r.g && r.g.hide) || r.focus || r.leaving != null) return false;
  if (invite && invite.r === r) return false;
  if (r.st === 'sleep') { r.wig = 0.5; if (r.lod) puff(r); return true; }
  soundOf(r);
  if (r.st === 'fly' || r.st === 'circle' || r.st === 'jump' || r.flying) { r.wig = 0.8; return true; }
  if (r.st === 'hidden') { r.st = 'idle'; r.t = 2; }
  r.greetT = 1.5; r.greetK = 0;
  if (r.st !== 'perch') r.st = 'idle';
  r.t = Math.max(r.t || 0, 1.6); r.moving = false;
  return true;
};
FA.focus = function (r) { if (!r) return; r.focus = true; r.tapped = true; r.st = 'idle'; r.t = 99; r.pop = 1; r.air = 0; r.hopK = 0; };
FA.release = function (r, o) {
  if (!r) return; r.focus = false; r.t = 0.5;
  const mode = (o && o.mode) || 'later';
  if (mode === 'won') { hearts(r, 16); playNow(r, 2.4); soundOf(r); r.leaving = null; }
  else {
    const P = F.Player.pos, a = Math.atan2(r.x - P.x, r.z - P.z), far = o && o.home ? 5 : 3.5;
    if (!goTo(r, r.x + Math.sin(a) * far, r.z + Math.cos(a) * far, o && o.home ? 1.5 : 1.2, 'walk')) { r.st = 'idle'; }
    if (o && o.home && r.g.layer !== 'P' && r.g.layer !== 'D') { r.leaving = 2.6; r.g.goneOK = true; r.t = 3; }   // a legend goes home until another day / phase
  }
};
FA.near = function (x, z, rad) { return recs.filter(r => !r.g.hide && Math.hypot(r.x - x, r.z - z) <= rad); };
/* clarity §3.0: F.Fauna.unknownNear(x, z, r) -> the animals she has not met («?») within r m, drawn now, nearest first – ONE record per
   group: the one that carries the group's «?» disc (the first of a group bigger than 3, every one of a small group). Not: friends, the
   zoo, her companion, hidden / leaving / gated animals, a species resting after a trial (Befriend.cooling: a tap would only get a wiggle
   – Puff never sends her to a dead end). F.Fauna.discOf(rec) -> {x, y, z, drawn} where its «?» floats (drawn: within the cue range). */
const coolingSp = id => { try { return !!(F.Befriend && F.Befriend.cooling && F.Befriend.cooling(id)); } catch (e) { return false; } };
const discBearer = r => (r.i === 0 || r.g.n <= 3);
FA.unknownNear = function (x, z, rad) {
  if (!FA.enabled || !F.Space || F.Space.cur !== 'out') return [];
  const out = [];
  for (const r of recs) {
    if (r.dead || !r.lod || r.g.hide || r.pop <= 0.5 || r.leaving != null || r.g.layer === 'P' || r.sp.zoo || !discBearer(r)) continue;
    const d = Math.hypot(r.x - x, r.z - z); if (d > rad) continue;
    if (hasRaw(r.sp.id) || coolingSp(r.sp.id)) continue;
    out.push([d, r]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(e => e[1]);
};
FA.discOf = function (r) {
  if (!r || !r.sp) return null;
  const scl = r.sp.legend === 'giant' ? 2.2 : 1;
  return { x: r.x, y: (r.y || 0) + instGeo(r.sp).h * scl + 0.55, z: r.z, drawn: !!r.lod && !r.sp.zoo && !has(r.sp.id) && r.pop > 0.5 && discBearer(r) && (r.dP || 0) < (kikkert() ? 30 : 15) && !cueOff };
};
/* clarity §3.9 FA #1: what fauna.js itself says when she first sees something – fa_new («Se, et nytt dyr!»), fa_glitter (a very rare
   animal), fa_legend (a legend), and the season lines – is QUEUED at first sight and spoken only
     · when it is calm: no speech, onboarding, task, trial, panel, title / bedtime screen, scripted scene, camera look, cloud ride, open
       wand, first-time cue playing, bedtime light (whyBusy());
     · while that animal's «?» disc (the animal itself for a friend / a legend) is ON SCREEN and clear of the HUD;
     · ≥ 25 s after the last one; dropped after 20 s (or when the animal goes) – never said late, off screen or into a scene.
   The animal greets her first (FA.greet), then the line follows (show, then tell).
   fa_new is the once-ever «?» explanation (clarity §6 'dyr'): never again once F.First.seen('dyr'); when F.First's cue engine runs
   (every real game) it owns that line – the cue greets the animal and says it, calm and ≤ 10 m – so fauna.js only greets later new
   species silently (one greet per 20 s at most). Without F.First (or #test with the engine off) the queue says fa_new itself, once. */
const tryv = (fn, d) => { try { return fn(); } catch (e) { return d; } };
function whyBusy() {
  if (!F.booted) return 'boot';
  if (F.Speech && F.Speech.busy && F.Speech.busy()) return 'speech';
  if (F.Onboard && F.Onboard.active) return 'onboard';
  if (F.Task && F.Task.current) return 'task';
  if (F.Befriend && F.Befriend.busy) return 'trial';
  if (F.Shell && F.Shell.screen) return 'screen';
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return 'panel';
  if (F.HUD && F.HUD.scene && tryv(() => F.HUD.scene(), null)) return 'scene';
  if (F.R && F.R.cam && F.R.cam.look) return 'look';
  if (F.Travel && (F.Travel.busy || F.Travel.offering)) return 'travel';
  if (F.Wand && F.Wand.isOpen && tryv(() => F.Wand.isOpen(), false)) return 'wand';
  if (F.Day && (F.Day.golden || F.Day.inBed)) return 'day';
  if (F.First && F.First.playing) return 'first';
  return null;
}
FA.whyBusy = whyBusy;
const _sv = new THREE.Vector3();
function ptOnScreen(x, y, z) {
  if (!F.R || !F.R.camera || !F.R.renderer) return false;
  _sv.set(x, y, z).project(F.R.camera);
  if (!(_sv.z < 1 && _sv.z > -1 && Math.abs(_sv.x) < 0.92 && Math.abs(_sv.y) < 0.92)) return false;
  const R = F.R.renderer.domElement.getBoundingClientRect(), sx = R.left + (_sv.x + 1) / 2 * R.width, sy = R.top + (1 - _sv.y) / 2 * R.height;
  if (F.First && typeof F.First.covered === 'function' && tryv(() => F.First.covered({ left: sx - 18, right: sx + 18, top: sy - 18, bottom: sy + 18 }), false)) return false;
  return true;
}
FA.onScreen = function (r) {   // its «?» disc (or, for a friend / the zoo, the animal itself) is in view and not under the HUD
  if (!r || r.dead || !r.lod || r.pop < 0.5) return false;
  const d = FA.discOf(r), G = instGeo(r.sp);
  return d && d.drawn ? ptOnScreen(d.x, d.y, d.z) : ptOnScreen(r.x, (r.y || 0) + G.h * 0.5, r.z);
};
const DISC_GAP = 25, DISC_TTL = 20, GREET_GAP = 20;
const pend = [];              // [{r, line, t0, greet}]
let discT = -1e9, greetT = -1e9;
function discover(r, line, o) {
  if (!r) return;
  const rr = discBearer(r) ? r : (r.g.recs[0] || r);
  if (pend.some(p => p.r === rr && p.line === line)) return;
  pend.push({ r: rr, line, t0: F.T.now, greet: !(o && o.noGreet), onScreen: !(o && o.anywhere) });
  if (pend.length > 4) { const k = pend.findIndex(p => !p.line || p.line === 'fa_new'); pend.splice(k >= 0 ? k : 0, 1); }   // a silent greet goes first
}
FA._pend = () => pend.map(p => ({ id: p.r && p.r.id, sp: p.r && p.r.sp && p.r.sp.id, line: p.line, age: +(F.T.now - p.t0).toFixed(1), on: !!(p.r && FA.onScreen(p.r)),
  sinceLine: +(F.T.now - discT).toFixed(1), sinceGreet: +(F.T.now - greetT).toFixed(1), why: whyBusy() }));
function firstOwnsNew() {
  const Fi = F.First; if (!Fi) return false;
  return !!(Fi.enabled || tryv(() => Fi.seen('dyr'), false));
}
function discTick() {
  for (let i = pend.length - 1; i >= 0; i--) {
    const p = pend[i];
    if ((p.r && p.r.dead) || F.T.now - p.t0 > DISC_TTL || F.Space.cur !== 'out') { pend.splice(i, 1); continue; }
    if (p.line === 'fa_new' && firstOwnsNew()) {          // the once-ever explanation is F.First's (or done): a silent greet only
      if (F.First && !F.First.seen('dyr')) { pend.splice(i, 1); continue; }   // its cue greets this animal itself
      p.line = null;
    }
    if (p.line === 'fa_new' && !F.First && save().newSaid) p.line = null;      // (no F.First at all: still once ever)
  }
  if (!pend.length || whyBusy()) return;
  for (let i = 0; i < pend.length; i++) {
    const p = pend[i];
    if (p.line ? F.T.now - discT < DISC_GAP : F.T.now - greetT < GREET_GAP) continue;
    if (p.onScreen && p.r && !FA.onScreen(p.r)) continue;
    if (p.line && !F.TPL.has(p.line)) { pend.splice(i, 1); return; }
    pend.splice(i, 1);
    greetT = F.T.now;
    if (p.greet && p.r) FA.greet(p.r);
    if (!p.line) return;
    discT = F.T.now;
    const line = p.line;
    if (line === 'fa_new' && !F.First) { save().newSaid = day(); F.store && F.store(); }
    F.T.timeout(() => { if (!whyBusy() && F.Space.cur === 'out' && F.SAYF) F.SAYF(line); }, p.greet ? 700 : 0);
    return;
  }
}
FA.records = () => recs;
FA.groupsIn = key => (groups.get(key) || []).concat(glimt.get(key) && glimt.get(key).g ? [glimt.get(key).g] : []);
FA.glimtIn = key => glimt.get(key) || null;
FA.area = (cx, cz) => area(cx, cz);

/* ================================================================ companion (§4.8) */
let compG = null;
function companionTick(r, dt, t) {
  const P = F.Player.pos, d = Math.hypot(P.x - r.x, P.z - r.z);
  r.pop = r.stageOff ? Math.max(0, r.pop - dt * 3) : Math.min(1, r.pop + dt * 3); r.t -= dt;
  if (d > 14) { r.x = P.x - Math.sin(F.Player.heading || 0) * 1.6; r.z = P.z - Math.cos(F.Player.heading || 0) * 1.6; }
  else if (d > 1.8) {
    const sp = Math.max(r.sp.speed * 2, Math.min(7, d * 1.4)), st = Math.min(d - 1.6, sp * dt);
    r.x += (P.x - r.x) / d * st; r.z += (P.z - r.z) / d * st; r.ry = turn(r.ry, Math.atan2(P.x - r.x, P.z - r.z), dt * 6); r.moving = true;
  } else { r.moving = false; if (r.st === 'play') { r.k = (r.k || 0) + dt; r.hopK = Math.abs(Math.sin(r.k * 7)) * 0.3; if (r.t <= 0) { r.st = 'idle'; r.hopK = 0; } } else r.ry = turn(r.ry, Math.atan2(P.x - r.x, P.z - r.z), dt * 3); }
  r.happy = r.st === 'play';
}
// o.quiet (logic #50): the album says its own «Nå følger den deg!» / «Nå går den hjem.» – no second line from here
FA.setCompanion = function (spId, o) {
  const sv = save(), quiet = !!(o && o.quiet);
  if (compG) { compG.recs.forEach(r => { dropRig(r); r.dead = true; }); for (let i = recs.length - 1; i >= 0; i--) if (recs[i].dead) recs.splice(i, 1); compG = null; }
  const s = spId ? SPD(spId) : null;
  if (!s || !s.land) {
    const was = sv.companion; sv.companion = null;
    if (sv.petAway && F.Eco && F.Eco.setPet) { const p = sv.petAway; sv.petAway = null; try { F.Eco.setPet(p); } catch (e) { console.error(e); } }
    F.store && F.store();
    if (was && spId === null && !quiet) F.SAYF && F.SAYF('fa_comp_off');
    return null;
  }
  sv.companion = s.id;
  // her bought pet waits at home while a companion walks with her (restored when the companion is cleared)
  let petHome = false;
  try { const cur = F.save.shop && F.save.shop.pet; if (cur && F.Eco && F.Eco.setPet) { sv.petAway = cur; F.Eco.setPet(null); petHome = true; } } catch (e) { console.error(e); }
  F.store && F.store();
  const P = F.Player.pos;
  const a = { key: 'companion', x0: P.x - 1e6, z0: P.z - 1e6, regionId: null, ring: 0 };
  compG = mkGroup(a, s, { x: P.x + 1, z: P.z + 1 }, 1, 'P', { box: { x0: -1e7, x1: 1e7, z0: -1e7, z1: 1e7 } });
  compG.live = true; const r = mkRec(compG, 0, P.x + 1.2, P.z + 1.2); r.tapped = true; compG.recs = [r]; recs.push(r);
  hearts(r, 10);
  if (F.SAY) (quiet ? Promise.resolve() : F.SAYF('fa_comp_on')).then(() => { if (petHome) F.SAYF('fa_comp_pet'); });
  return r;
};
FA.companion = () => (save().companion || null);
/* v5c WP-A2 (logic #48): windy weather can be HEARD – a soft gust (sfx_animals.js 'vind') when the wind comes (no line: clarity §3.9,
   the wind shows and sounds by itself), then now and then while it blows (every 25–50 s outdoors; never during a task, an encounter or
   speech) */
let windNext = 0, gustT = -1e9;
const gust = () => { gustT = F.T.now; try { if (F.AnimalSfx && F.AnimalSfx.play) F.AnimalSfx.play('vind'); else if (F.sfx && F.sfx.wind) F.sfx.wind(); } catch (e) { /* sound only */ } };
F.on('weatherChanged', (rid, w) => {      // (also fires on every region change: at most one gust per 20 s)
  if (w !== 'vind' || F.Space.cur !== 'out' || (F.Task && F.Task.current) || F.T.now - gustT < 20) return;
  gustT = F.T.now; F.T.timeout(gust, 900); windNext = F.T.now + 25 + Math.random() * 25;
});
F.on('tick', () => {
  if (!windNext || F.T.now < windNext) return;
  windNext = F.T.now + 25 + Math.random() * 25;
  let w = 'sol'; try { w = F.Weather && F.Weather.here ? F.Weather.here() : 'sol'; } catch (e) { w = 'sol'; }
  if (w !== 'vind') { windNext = 0; return; }
  if (F.Space.cur !== 'out' || (F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy) || (F.Speech && F.Speech.busy && F.Speech.busy())) return;
  gust();
});
/* v5c WP-A2: a friend that has something to ask her (F.Befriend.starReady: a fact it taught her is due for recall, < 3 stars, no star
   today) twinkles now and then when she is near (≤ 12 m, drawn, outdoors, nothing running) – the Vennestjerne loop is discoverable
   without words; one twinkle per species (its closest animal) per 6 s, readiness cached 30 s per species */
const askCache = new Map(), askT = new Map();
let askAcc = 0;
function friendAsks(sp, fresh) {
  const c = askCache.get(sp);
  if (c && !fresh && F.T.now - c.t < 30) return c.v;
  let v = false; try { v = !!(F.Befriend && F.Befriend.starReady && F.Befriend.starReady(sp)); } catch (e) { v = false; }
  askCache.set(sp, { t: F.T.now, v }); return v;
}
FA.friendAsks = friendAsks;
F.on('befriendEnd', () => askCache.clear());
F.on('tick', dt => {
  askAcc += dt || 0; if (askAcc < 1.2) return; askAcc = 0;
  if (!FA.enabled || F.Space.cur !== 'out' || (F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy) || (F.UI.isOpen && F.UI.isOpen())) return;
  const P = F.Player.pos, best = new Map();                       // one twinkle per species (its closest animal), ≤ 1 per 6 s
  for (const r of recs) {
    if (!r.lod || r.dead || r.g.layer === 'P' || r.sp.zoo || !hasRaw(r.sp.id)) continue;
    const d = Math.hypot(r.x - P.x, r.z - P.z); if (d > 12) continue;
    const b = best.get(r.sp.id); if (!b || d < b.d) best.set(r.sp.id, { r, d });
  }
  for (const [sp, { r }] of best) {
    if (F.T.now - (askT.get(sp) || -1e9) < 6 || !friendAsks(sp)) continue;
    askT.set(sp, F.T.now);
    try { F.FX.sparkle(new THREE.Vector3(r.x, r.y + instGeo(r.sp).h + 0.35, r.z), 0xffe27a); } catch (e) { /* decor */ }
  }
});
// (clarity §3.9 FA #2, R16: no phase lines – «Nå er det kveld. Nattdyra våkner!» was said in full daylight, because the phases cycle with
//  play time while the light stays bright. The evening shows itself: farm animals doze, the night animals are about; the album hints
//  keep that knowledge.)

/* ---------------------------------------------------------------- a task's stage stays clear of animals (any zoom)
   4 Hz while a task runs outdoors: an animal (not the one she is busy with) whose screen box overlaps the stage's screen rect and that
   stands nearer to the camera than the stage's far side walks 4–5 m off to the side; one that cannot (water, air, blocked, or still
   there after 3 s) fades out (stageOff) until the task ends. The stage rect = the task's own 3D things (S.objs), else 1.5 m around its
   anchor, + 16 px. */
const _sb = new THREE.Box3(), _sb2 = new THREE.Box3(), _sp = new THREE.Vector3();
let stageAcc = 0, stageOn = false;
function stageRectOf(S) {
  const cam = F.R.camera, cv = F.R.renderer.domElement.getBoundingClientRect();
  _sb.makeEmpty();
  for (const o of (S.objs || [])) { if (!o || !o.parent || !o.visible) continue; _sb2.setFromObject(o); if (!_sb2.isEmpty()) _sb.union(_sb2); }
  if (_sb.isEmpty() && S.anchor) { const A = S.anchor; _sb.min.set(A.x - 1.5, (A.y || 0), A.z - 1.5); _sb.max.set(A.x + 1.5, (A.y || 0) + 1.5, A.z + 1.5); }
  if (_sb.isEmpty()) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    _sp.set(i & 1 ? _sb.max.x : _sb.min.x, i & 2 ? _sb.max.y : _sb.min.y, i & 4 ? _sb.max.z : _sb.min.z).project(cam);
    if (_sp.z > 1) continue;
    const x = cv.left + (_sp.x + 1) / 2 * cv.width, y = cv.top + (1 - _sp.y) / 2 * cv.height;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (!(x1 > x0)) return null;
  const c = _sb.getCenter(new THREE.Vector3());
  return { x0: x0 - 16, y0: y0 - 16, x1: x1 + 16, y1: y1 + 16, dc: Math.hypot(c.x - cam.position.x, c.z - cam.position.z), c,
    bx0: _sb.min.x - 0.6, bx1: _sb.max.x + 0.6, bz0: _sb.min.z - 0.6, bz1: _sb.max.z + 0.6 };
}
FA._stageRect = () => { const T = F.Task && F.Task.current; return T && T.S ? stageRectOf(T.S) : null; };
// a spot just outside the stage's footprint, on the animal's own side first, that is not in front of the stage on screen
function asideSpot(r, R, cv, cam) {
  const cx = (R.bx0 + R.bx1) / 2, cz = (R.bz0 + R.bz1) / 2, hx = (R.bx1 - R.bx0) / 2, hz = (R.bz1 - R.bz0) / 2;
  const a0 = Math.atan2(r.x - cx, r.z - cz);
  for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
    const sx = Math.sin(a0 + da), sz = Math.cos(a0 + da);
    const t = Math.min(Math.abs(sx) > 1e-3 ? hx / Math.abs(sx) : 1e9, Math.abs(sz) > 1e-3 ? hz / Math.abs(sz) : 1e9) + 1.4;
    if (t > 14) continue;
    const x = cx + sx * t, z = cz + sz * t;
    if (Math.hypot(x - cam.x, z - cam.z) <= R.dc + 0.5) {       // on the camera's side: only where it is clear of the stage on screen
      _sp.set(x, F.W.groundY(x, z) + 0.5, z).project(F.R.camera);
      const px = cv.left + (_sp.x + 1) / 2 * cv.width, py = cv.top + (1 - _sp.y) / 2 * cv.height;
      if (px > R.x0 - 40 && px < R.x1 + 40 && py > R.y0 - 40 && py < R.y1 + 40) continue;
    }
    const [x2, z2] = clampBox(r, x, z);
    if (Math.hypot(x2 - x, z2 - z) > 0.3 || !moveOK(r, x2, z2)) continue;
    return { x: x2, z: z2 };
  }
  return null;
}
// the stage zone of the running task (null when none): its footprint, and the ground in front of it that shows over it on screen
let stageZ = null;
function inStage(x, z) {
  const Z = stageZ; if (!Z) return false;
  if (x > Z.bx0 && x < Z.bx1 && z > Z.bz0 && z < Z.bz1) return true;
  if (Math.hypot(x - Z.cx, z - Z.cz) > Z.dc) return false;
  _sp.set(x, F.W.groundY(x, z) + 0.5, z).project(F.R.camera);
  const px = Z.cv.left + (_sp.x + 1) / 2 * Z.cv.width, py = Z.cv.top + (1 - _sp.y) / 2 * Z.cv.height;
  return px > Z.x0 - 30 && px < Z.x1 + 30 && py > Z.y0 - 30 && py < Z.y1 + 30;
}
function stageClear() {
  const T = F.Task && F.Task.current, S = T && T.S;
  if (!S || F.Space.cur !== 'out' || !F.R || !F.R.camera) { stageZ = null; return; }
  const R = stageRectOf(S); if (!R) { stageZ = null; return; }
  const cv = F.R.renderer.domElement.getBoundingClientRect(), cam = F.R.camera.position;
  stageZ = Object.assign({}, R, { cv, cx: cam.x, cz: cam.z });
  for (const r of recs) {
    if (r.dead || !r.lod || r.focus || r.g.hide || r.pop < 0.05) continue;
    if (T.ctx && (T.ctx.rec === r || (T.ctx.npc && T.ctx.npc.rec === r))) continue;
    const b = screenBox(r, cv); if (!b) continue;
    // it covers the stage only when it stands ON it (its footprint) or nearer to the camera than its middle – one behind it is hidden
    // by the stage itself (depth), even where their screen boxes overlap
    const over = b.cx + b.hw > R.x0 && b.cx - b.hw < R.x1 && b.cy + b.hh > R.y0 && b.cy - b.hh < R.y1;
    const onIt = r.x > R.bx0 && r.x < R.bx1 && r.z > R.bz0 && r.z < R.bz1;
    if (!over || (!onIt && Math.hypot(r.x - cam.x, r.z - cam.z) > R.dc)) {
      if (r.stageAway && r.st !== 'walk' && r.st !== 'shy' && r.t < 1) r.t = 1;     // stepped aside: it waits there (no wandering back)
      continue;
    }
    if (r.stageOff) continue;
    if (r.stageAway && r.st === 'walk' && (r.stageWalk = (r.stageWalk || 0) + 0.25) < 6) continue;   // on its way off the stage
    const land = r.sp.where === 'land' && !r.flying && !r.perched && r.g.layer !== 'P';
    if (land && !r.stageAway) {        // it walks off to the side (one try)
      const sp = asideSpot(r, R, cv, cam);
      if (sp) { r.tx = sp.x; r.tz = sp.z; r.st = 'walk'; r.spdK = 1.8; r.t = 8; r.greetT = 0; r.stageAway = true; r.stageWalk = 0; continue; }
    }
    // it cannot walk off (water, air, no room) or still covers the stage: it shrinks away with a sparkle – as the stage's own things
    // do – and pops back when the task ends
    r.stageOff = true; r.stageAway = true;
    try { if (F.FX && F.FX.sparkle) F.FX.sparkle(new THREE.Vector3(r.x, (r.y || 0) + instGeo(r.sp).h * 0.6, r.z), 0xfff2c0); } catch (e) { /* decor */ }
  }
  stageOn = true;
}
function stageRelease() {
  stageZ = null;
  if (!stageOn) return; stageOn = false;
  for (const r of recs) { if (r.stageOff || r.stageAway) { r.stageOff = false; r.stageAway = false; r.stageWalk = 0; } }
}
F.on('tick', dt => {
  if (!FA.enabled || !F.booted) return;
  cueOff = !!((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy));
  stageAcc += dt || 0; if (stageAcc < 0.25) return; stageAcc = 0;
  try {
    if (F.Task && F.Task.current && F.Space.cur === 'out' && CFG.stageClear) stageClear(); else stageRelease();
    discTick();
  } catch (e) { console.error('[fauna] stage / discover', e); }
});
F.on('taskEnd', () => stageRelease());
let cheerSaid = false;
F.on('taskEnd', (item, res) => {
  if (!compG || !res || res.outcome !== 'A') return;
  const r = compG.recs[0]; if (!r) return;
  // logic #34: the companion cheers only where she can see it – outdoors, drawn (lod > 0) and close to her
  const P = F.Player.pos, seen = F.Space.cur === 'out' && !r.dead && r.lod > 0 && Math.hypot(r.x - P.x, r.z - P.z) < 12;
  if (!seen) return;
  r.st = 'play'; r.t = 1.8; r.k = 0; hearts(r, 8);
  // (natural audit: the cheering is seen – «Vennen din jubler for deg!» once a session, not on every 4th right answer)
  if (!cheerSaid && Math.random() < 0.25) F.T.timeout(() => { const P2 = F.Player.pos; if (!cheerSaid && F.Space.cur === 'out' && !r.dead && r.lod > 0 && Math.hypot(r.x - P2.x, r.z - P2.z) < 14) { cheerSaid = true; F.SAYF && F.SAYF('fa_comp_cheer'); } }, 1400);
});

/* ================================================================ today / eligible */
FA.eligible = function (spId) {
  const s = SPD(spId); if (!s) return false;
  if (awayNow(spId)) return false;                // v5c: on its journey south / asleep for the winter
  const P = F.Player ? F.Player.pos : { x: 0, z: 0 };
  let a; try { a = area(Math.floor(P.x / CH), Math.floor(P.z / CH)); } catch (e) { a = { ring: 0, regionId: 'r_0_0' }; }
  const c = ctxFor(a); c.ring = undefined;    // ring is about where she goes, not where she is
  return F.FAUNA.eligibleWhen(s, c);
};
FA.today = function () {
  const L = F.FAUNA.species.filter(s => s.tier <= 2 && s.page <= 19 && !has(s.id) && !awayNow(s.id));
  if (!L.length) return null;
  const fr = (() => { try { return F.Album && F.Album.friends ? F.Album.friends().length : 0; } catch (e) { return 0; } })();
  const maxPage = fr < 5 ? 10 : fr < 15 ? 13 : fr < 30 ? 16 : 19;
  const pool = L.filter(s => s.page <= maxPage && (s.tier === 1 || fr >= 5));
  const P2 = pool.length ? pool : L;
  return P2[U.hashStr('dagensdyr|' + day() + '|' + seed()) % P2.length].id;
};

/* ================================================================ boot */
F.on('boot', () => { hookLandmarks(); });
F.on('ready', () => {
  hookLandmarks();
  if (F.Input && F.Input.pickHooks && !F.Input.pickHooks.includes(pickHook)) F.Input.pickHooks.push(pickHook);
  // chunks loaded before we were listening (boot teleport) get their groups now
  try { F.W.chunks.forEach(ch => { if (!groups.has(ch.key) && ch.stage === 5) genChunkGroups(area(ch.cx, ch.cz)); }); } catch (e) { console.error('[fauna] ready', e); }
  const sv = save();
  // (v5c: a companion that is on its journey south / asleep for the winter does not come along until it is back)
  if (sv.companion) { const id = sv.companion; F.T.timeout(() => { try { if ((has(id) || !F.Album || !F.Album.has) && !awayNow(id)) FA.setCompanion(id); } catch (e) { console.error(e); } }, 800); }
  if (!F.dbg) return;
  F.dbg.fauna = function (spId) {
    const s = SPD(spId) || zooSpecies(spId); if (!s) return 'no species ' + spId;
    const P = F.Player.pos; let x = P.x + 2.5, z = P.z + 2;
    if (s.where === 'water' || s.where === 'sea') { for (let k = 0; k < 40; k++) { const a = k * 0.7, d = 2 + k * 0.6; const xx = P.x + Math.cos(a) * d, zz = P.z + Math.sin(a) * d; if (F.W.water(xx, zz)) { x = xx; z = zz; break; } } }
    const a = area(Math.floor(x / CH), Math.floor(z / CH));
    const g = mkGroup(a, s, { x, z }, Math.min(s.group[1], Math.max(1, s.group[0])), 'D'); dbgGroups.push(g); materialize(g); acc1 = 1; acc10 = 1;
    return g.recs.map(r => r.id);
  };
  F.dbg.faunaStats = () => Object.assign({}, FA.stats, { live: recs.length, groupsLoaded: [...groups.values()].reduce((n, L) => n + L.length, 0) });
  F.dbg.faunaList = (rad) => { const P = F.Player.pos; return recs.filter(r => Math.hypot(r.x - P.x, r.z - P.z) <= (rad || 45)).map(r => ({ id: r.id, sp: r.sp.id, x: +r.x.toFixed(1), z: +r.z.toFixed(1), st: r.st, lod: r.lod, layer: r.g.layer, d: +(r.dP || 0).toFixed(1) })); };
  F.dbg.faunaTap = id => { const r = recs.find(q => q.id === id); if (!r) return false; FA.tap(r); return true; };
  F.dbg.faunaScreen = id => { const r = recs.find(q => q.id === id); return r ? FA.screenOf(r) : null; };
  F.dbg.legend = id => { FA._forceLegend = id; areaCache.forEach(a => { a.legendKey = 'x'; }); acc1 = 1; return id; };
});
})();
