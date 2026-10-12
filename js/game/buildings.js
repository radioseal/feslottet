/* Feslottet – WP1 BLD: F.Bld, the building engine (DESIGN2 §2.2–2.5). Interiors live in F.R.inScene as dollhouse rows (open front +z,
   back wall at local z 0, cells 14 × 10 m, floors 6 m apart). Entered only through doors (0.35 s white dip in + out); inside nothing
   fades: rooms, the spiral stairs and the lift are continuous movement. F.Bld = F.Space.impl.in.

   F.Bld.register(plan) / registerSimple(o)   plan = { id, name, kind:'slott'|'tarn'|'kongeslott', origin:{x,z}, floors,
       cells:[{key, f, c, shell:'r_*', opts:{style, doorL, doorR}, num, name, type (PLACE table), place:[rows]? (overrides PLACE),
               npc:[[lx,lz,ry]…]?, spawn:[lx,lz]?, legacy:'stjernetarn'? (old room id: alias + thing-id prefix) }],
       stair:{cell, c:[cx,cz], r:1.6, floors:[0,1,2]}|null, lift:{cells:[…], lx, lz, ry}|null,
       exits:[{id, cell, lx:7, lz:9.7, out:{x, z, ry}}], furnish:true, bed:{cell, lx, lz}? }
     registerSimple({id, name, kind, origin, rooms:[{key, shell, name, num, type, place, …}] (one per floor, single column),
       stair:{c:[cx,cz]}|null, exit:{lx, lz, out}, bed}) → plan
   Runtime: cur (plan id | null), f (floor she stands on), visF (floor drawn), roomKey (cell key she is in; B.room is the lookup FUNCTION), busy
     enter(planId, {exit?, at?:'bed'|{room}|{f,x,z}, instant?}) → Promise   leave({exit?, instant?}) → Promise
     room(planId, keyOrNum) roomAt(x, z?, f?) toWorld(planId, roomKey, lx, lz) → {x,y,z,f} spot(planId, roomKey, i)
     spawnIn(planId, roomKey, type, lx, lz, o) furnish(planId, roomKey, type, {pal}) exitPos() → {x,z,f,via?}
     pathTo({x,z,f}) → [{f, pts, to, hint?, via?}]   guideTo(target) (trail + hint; never teleports)   openMap() closeMap()
     restore(pos) → Promise<bool>   pos() → {space, b, f, x, z}   exitNow({to?, exit?, space?}) (sync, no fades: debug teleport / travel)   heightAt blocked findPath scene   addBlock(planId, f, x0,z0,x1,z1)
     stairs(dir 'up'|'down') (walk to the mouth + climb)   ride(target {f}|room number) (the lift; no fade)   addDoor(bld, x, z, o)
   Things: 'b_dor' (outdoor door, data {bld, exit}), 'b_portal' (indoor exit, data {bld, exit}). Model 'b_spiral' (m_rooms.js).
   v3 WP1 DOORS (DESIGN3 §4): leaving is a TAP (no walk-out): 'b_portal' = the UT mat between two lantern posts (tap box = the mat only,
     taps go through a pick hook that ignores near-misses on the HUD wand), 'b_utskilt' = the tall UT sign beside it (same action),
     'b_utpil' = small «UT ←/→/↓» signs (over the doorway toward the exit; at the stairs / lift on upper floors; tap = the glitter way out).
     guideOut(o?) (§3: trail to the mat or first to the stairs / lift + «Se etter ordet ut!»; o.quiet) goOut(exitId?) (fly onto the mat and
     leave)  utPress() utShown() (the HUD «UT» button #bldUt, css/doors.css)  wayDir(planId, cellKey) → {kind:'exit'|'door'|'down', side, via}
     wayPoint() reach(planId) → {cellKey: {ok, n, total, f}} (flood fill from the exit + stairs / lift)  inDoorBand(planId, key, lx, lz)
     skipped (what the doorway / mat rules changed)  idleSec()  quietRooms (true | fn(plan)) or plan.quietRooms: no automatic «rom {n}».
     She appears ≥ 3.5 m inside after a door entry (SPAWN_LZ); the exit room's camera keeps the mat above the bottom 140 px (EXIT_CAM).
   Events: bldEntered(id) bldLeft(id) floorChanged(f, id) roomEntered(room, prev) (home rooms: legacy id; other buildings: '<planId>:<cell>')
   doorCrossed({bld, dir}) bldBuilt(id) bldRegistered(id) */
(function () {
'use strict';
const F = window.F, U = F.U;
const PX = 15, FH = 6, CW = 14, CD = 10;
const TAU = Math.PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = { inOut: k => k * k * (3 - 2 * k), out: k => 1 - Math.pow(1 - k, 3) };
const has = id => F.VOX.has(id);
const say = (id, slots) => (F.TPL && F.TPL.has && F.TPL.has(id) ? F.SAYF(id, slots || {}) : Promise.resolve(false));
// v5c WP-W2 (logic #45, DESIGN4 §8): room numbers are natural plates 1–30 (bld_rom / bld_rom_der, set ROOM_NUMS). A plate outside the
// set (an old v1 10–20 key, a realm plan with big numbers) is never spoken as a missing clip: the line is skipped.
const roomOK = n => { const R = (F.SETS && F.SETS.ROOM_NUMS) || null; n = +n; return Number.isInteger(n) && (R ? R.includes(n) : n >= 1 && n <= 30); };
const sayRoom = (id, n) => (roomOK(n) ? say(F.TPL.has(id) ? id : 'bld_rom', { n: +n }) : Promise.resolve(false));
const sfx = (n, ...a) => { try { if (F.sfx && F.sfx[n]) F.sfx[n](...a); } catch (e) { /* audio is optional */ } };
const HOME = { slott: 1, tarn: 1 };
const SPAWN_LZ = 6.0, MAT_DZ = -0.3;      // v3 §4.4 spawn depth after a door entry; the exit mat sits 0.3 m inside the exit line (on the floor)
const NOT_ROYAL = new Set(['c_heis', 'c_sokkel', 'c_slot', 'c_inngangsdor', 'c_ordbok', 'c_portrett']);   // home-only furniture (lift, Ordmuseet, Fetårnet slots)

const pre = (F.Bld && F.Bld.plans) || {};
const B = F.Bld = {
  PX, FH, CW, CD, plans: {}, cur: null, f: 0, visF: 0, roomKey: null, busy: false, yNow: null, gen: 0, epoch: 0,
  PLACE: {}, DECOR: {}, extras: {},       // furnishing tables (things_castle.js fills them)
  skipped: [],                            // v3 §4.7: [plan, cell, type, lx, lz] of solid furniture left out of a doorway band
  showBelow: false,
};

/* ================================================================== plans */
function normalise(p) {
  const P = Object.assign({ name: p.id, kind: 'slott', origin: { x: 0, z: 0 }, floors: 1, cells: [], stair: null, lift: null, exits: [], furnish: true }, p);
  P.ox = (P.origin && P.origin.x) || 0; P.oz = (P.origin && P.origin.z) || 0;
  P.home = !!HOME[P.id];
  P.grid = {}; P.byKey = {}; P.alias = {};
  let cmin = Infinity, cmax = -Infinity, fmax = 0;
  P.cells = P.cells.map(c0 => {
    const c = Object.assign({}, c0);
    c.f = c.f | 0; c.c = c.c | 0;
    c.id = c.key; c.floor = c.f; c.col = c.c; c.bld = P.id;
    c.name = c.name || c.key; c.type = c.type || c.key; c.num = c.num != null ? c.num : null;
    const x0 = P.ox + PX * c.c, y = FH * c.f;
    c.x0 = x0;
    c.bounds = { x0, x1: x0 + CW, z0: P.oz, z1: P.oz + CD, y };
    c.center = { x: x0 + CW / 2, y, z: P.oz + CD / 2 };
    c.spawn = c.spawn ? { x: x0 + c.spawn[0], z: P.oz + c.spawn[1] } : { x: x0 + CW / 2, z: P.oz + 8.4 };
    c.things = [];
    c.npcSpots = (c.npc || [[5, 5], [9, 5]]).map(([lx, lz, ry]) => ({ x: x0 + lx, z: P.oz + lz, y, f: c.f, ry: ry || 0, room: c.key, bld: P.id }));
    P.grid[c.f + ',' + c.c] = c; P.byKey[c.key] = c;
    if (c.legacy) P.alias[c.legacy] = c.key;
    cmin = Math.min(cmin, c.c); cmax = Math.max(cmax, c.c); fmax = Math.max(fmax, c.f);
    return c;
  });
  P.floors = Math.max(P.floors | 0, fmax + 1);
  P.x0 = P.ox + PX * (isFinite(cmin) ? cmin : 0) - 0.5; P.x1 = P.ox + PX * (isFinite(cmax) ? cmax : 0) + CW + 0.5;
  P.at = (f, c) => P.grid[f + ',' + c] || null;
  if (P.stair) {
    const sc = P.byKey[P.stair.cell] || P.cells[0];
    const fl = (P.stair.floors || [0, 1]).slice().sort((a, b) => a - b);
    P.stair = Object.assign({ r: 1.6 }, P.stair, { floors: fl, col: sc.c, cx: P.stair.c[0], cz: P.stair.c[1] });
    P.stair.x = P.ox + PX * sc.c + P.stair.cx; P.stair.z = P.oz + P.stair.cz;
    P.stair.fMin = fl[0]; P.stair.fMax = fl[fl.length - 1];
  }
  if (P.lift) P.lift = Object.assign({ lx: 9.6, lz: 0.75, ry: 0 }, P.lift);
  P.exits = (P.exits || []).map(e => Object.assign({ lx: 7, lz: 9.7 }, e));
  // v3 §4.4: in an exit room she never appears on / right behind the mat (default spawn lz 8.4 → 6.0, ≥ 3.5 m inside)
  for (const e of P.exits) { const c = P.byKey[e.cell]; if (c && !(p.cells.find(q => q.key === c.key) || {}).spawn) c.spawn = { x: c.x0 + e.lx, z: P.oz + SPAWN_LZ }; }
  P.boxes = []; for (let f = 0; f < P.floors; f++) P.boxes.push([]);
  P.built = false; P.things = new Set();
  return P;
}
B.register = function (p) {
  if (!p || !p.id) return null;
  const old = B.plans[p.id];
  const P = normalise(p);
  B.plans[P.id] = P;
  if (old && old.built) replaceBuilt(old, P);
  F.emit('bldRegistered', P.id);
  return P;
};
// single-column plan (tower, small houses): one room per floor, the stair column = that column
B.registerSimple = function (o) {
  if (o.cells && o.exits) return B.register(o);                      // already a full plan (WP2's tower passes one)
  const rooms = o.rooms || o.cells || [];
  const cells = rooms.map((r, f) => Object.assign({ f, c: 0 }, r));
  const first = cells[0] || { key: 'rom' };
  const stair = o.stair && cells.length > 1 ? Object.assign({ cell: first.key, c: [10.6, 2.3], r: 1.6, floors: cells.map(c => c.f) }, o.stair) : null;
  const ex = o.exit === null ? [] : [Object.assign({ id: 'dor', cell: first.key, lx: 7, lz: 9.7 }, o.exit || {})];
  return B.register(Object.assign({}, o, { cells, stair, exits: ex, floors: cells.length, rooms: undefined }));
};
B.plan = id => B.plans[id] || null;
for (const id in pre) try { B.register(pre[id]); } catch (e) { console.error('[bld] pre-registered plan', id, e); }

function cellOf(P, key) {
  if (!P || key == null) return null;
  if (typeof key === 'object' && key.key) return P.byKey[key.key] || null;
  // v5 WP-X: a numeric key is a LEGACY v1 number (10–20) where the plan keeps one (the home castle), else the plate number
  if (typeof key === 'number' || /^\d+$/.test(String(key))) return P.cells.find(c => c.legacyNum != null && c.legacyNum === +key) || P.cells.find(c => c.num === +key) || null;
  const k = String(key);
  return P.byKey[k] || P.byKey[P.alias[k]] || P.cells.find(c => c.type === k || String(c.name).toLowerCase() === k.toLowerCase()) || null;
}
B.room = (planId, key) => cellOf(B.plans[planId], key);
const planAtX = x => { for (const id in B.plans) { const P = B.plans[id]; if (x >= P.x0 - 0.6 && x <= P.x1 + 0.6) return P; } return null; };
B.planAt = planAtX;
B.roomAt = function (x, z, f) {
  const P = planAtX(x); if (!P) return null;
  if (f == null) f = (P.id === B.cur) ? B.f : 0;
  const c = Math.floor((x - P.ox + 0.5) / PX);
  return P.at(f, c);
};
B.toWorld = function (planId, key, lx, lz) {
  const P = B.plans[planId], c = cellOf(P, key); if (!c) return null;
  return { x: c.x0 + lx, y: c.bounds.y, z: P.oz + lz, f: c.f };
};
// stand spot i of a room (world {x, z, y, f, ry, room, bld}); a spot another indoor actor already stands on (< 0.9 m) is skipped, like
// the old F.Castle.npcSpot, so two cast members posted to one room never stand inside each other. o.any: the raw spot i.
B.spot = function (planId, key, i, o) {
  const c = cellOf(B.plans[planId], key); if (!c || !c.npcSpots.length) return null;
  const S = c.npcSpots, n = S.length, i0 = (((i | 0) % n) + n) % n;
  const A = !(o && o.any) && F.Act && F.Act.list ? F.Act.list.filter(a => a.space === 'in' && (a.bld || 'slott') === planId && (a.f | 0) === c.f && a !== (o && o.self)) : [];
  for (let k = 0; k < n; k++) {
    const s = S[(i0 + k) % n];
    if (!A.some(a => Math.hypot(a.x - s.x, a.z - s.z) < 0.9)) return Object.assign({ f: c.f }, s);
  }
  return Object.assign({ f: c.f }, S[i0]);
};
B.cellOf = cellOf;
B.curPlan = () => (B.cur && B.plans[B.cur]) || null;

/* ================================================================== build */
const pmat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
function addBox(P, f, x0, z0, x1, z1) { if (!P.boxes[f]) P.boxes[f] = []; const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }; P.boxes[f].push(b); return b; }
B.addBlock = function (planId, f, x0, z0, x1, z1) { const P = B.plans[planId]; if (!P) return null; return addBox(P, f, x0, z0, x1, z1); };
function buildWalls(P) {
  const oz = P.oz;
  for (const c of P.cells) {
    const f = c.f, x0 = c.x0;
    addBox(P, f, x0 - 0.6, oz - 1.5, x0 + 15.6, oz + 0.5);                        // back wall
    addBox(P, f, x0 - 0.6, oz + 9.9, x0 + 15.6, oz + 11.5);                          // front edge (dollhouse): closed everywhere – leaving is a tap on the UT mat / sign / button (v3 §4.1)
    if (!P.at(f, c.c - 1)) addBox(P, f, x0 - 1.5, oz - 1.5, x0 + 0.5, oz + 11.5);
    if (!P.at(f, c.c + 1)) addBox(P, f, x0 + 13.5, oz - 1.5, x0 + 16.5, oz + 11.5);
    else { addBox(P, f, x0 + 13.5, oz - 1.5, x0 + 15.5, oz + 3.5); addBox(P, f, x0 + 13.5, oz + 6.5, x0 + 15.5, oz + 11.5); }
  }
}
function shellOpts(P, c) {
  const o = Object.assign({}, c.opts || {});
  if (o.doorL == null) o.doorL = !!P.at(c.f, c.c - 1);
  if (o.doorR == null) o.doorR = !!P.at(c.f, c.c + 1);
  const S = P.stair;
  if (S && c.c === S.col && c.f > S.fMin && c.f <= S.fMax && o.hole == null) o.hole = { c: [S.cx, S.cz], r: 1.75, top: c.f === S.fMax ? 1 : 0, bottom: 0 };
  return o;
}
function makeShell(P, c) {
  const id = c.shell && has(c.shell) ? c.shell : (has('r_' + c.type) ? 'r_' + c.type : (has('r_hallen') ? 'r_hallen' : null));
  if (!id) return new THREE.Group();
  try { return F.VOX.make(id, shellOpts(P, c)); } catch (e) { console.error('[bld] shell', id, e); return new THREE.Group(); }
}
let shaftMat = null, shaftGeo = null;
function shafts(P, c, g) {
  if (!shaftMat) {
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 64; const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,244,214,0.8)'); gr.addColorStop(1, 'rgba(255,244,214,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 16, 64);
    shaftMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.5 });
    shaftGeo = new THREE.PlaneGeometry(1.4, 4.2);
  }
  const d = F.VOX.defs && F.VOX.defs[c.shell], mw = d && d.meta && d.meta.windows;
  const xs = Array.isArray(mw) ? mw : [];
  for (const lx of xs) {
    if (P.stair && c.c === P.stair.col && Math.abs(lx - P.stair.cx) < 2.2) continue;      // no light shaft through the spiral
    const m = new THREE.Mesh(shaftGeo, shaftMat); m.renderOrder = 3; m.position.set(c.x0 + lx, c.f * FH + 1.9, P.oz + 1.9); m.rotation.x = -0.62; g.add(m);
  }
}
function backdrop(P) {
  const w = (P.x1 - P.x0) + 260, g = new THREE.PlaneGeometry(w, 170, 1, 12), col = [], top = new THREE.Color(0x8fd0ff), bot = new THREE.Color(0xe8f7ff);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = U.clamp((p.getY(i) + 30) / 110, 0, 1); const cc = bot.clone().lerp(top, k); col.push(cc.r, cc.g, cc.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.position.set((P.x0 + P.x1) / 2, 45, P.oz - 1.4); return m;
}
function buildCell(P, c) {
  const g = new THREE.Group(); g.name = 'cell_' + P.id + '_' + c.key;
  const sh = makeShell(P, c); sh.position.set(c.x0 + 7, c.f * FH - 0.25, P.oz + 5); g.add(sh); c.shell3 = sh; c.shellObj = sh;
  if (P.at(c.f, c.c + 1) && has('r_dorgang')) { const d = F.VOX.make('r_dorgang'); d.position.set(c.x0 + 14.5, c.f * FH - 0.25, P.oz + 5); g.add(d); }
  try { shafts(P, c, g); } catch (e) { /* cosmetic */ }
  P.root.add(g); c.group = g; c.shellGroup = g;
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(CW + 1, CD), pmat); pp.rotation.x = -Math.PI / 2; pp.position.set(c.center.x, c.f * FH + 0.02, P.oz + 5);
  pp.userData.room = c.key; pp.userData.bld = P.id; pp.userData.f = c.f; F.R.inScene.add(pp); pp.updateMatrixWorld(true); c.pickPlane = pp;
  const ly = c.f * FH + 3.05;
  c.anch = { num: V3(c.center.x - (c.name.length > 12 ? 3.4 : 2.4), ly, P.oz + 0.6), name: V3(c.center.x + (c.num ? 1.2 : 0), ly, P.oz + 0.6) };
  if (F.UI && F.UI.label) {
    if (c.num) c.numLabel = F.UI.label(c.anch.num, String(c.num), { kind: 'num', space: 'in', maxDist: 40 });
    if (!c.noName) c.nameLabel = F.UI.label(c.anch.name, c.name, { kind: 'plaque', space: 'in', maxDist: 40 });
    if (c.numLabel) c.numLabel.show(false); if (c.nameLabel) c.nameLabel.show(false);
  }
}
function buildStair(P) {
  const S = P.stair; if (!S) return;
  S.segs = {};
  // each segment holds the full stair (seen from the floor above, rising through the hole) and a cut one that ends in a ceiling-hatch
  // ring at the wall top (seen from its own floor: no steps stick out above the walls; fix_wp1 #4)
  for (let f = S.fMin; f < S.fMax; f++) {
    const m = new THREE.Group();
    const full = has('b_spiral') ? F.VOX.make('b_spiral', {}) : new THREE.Group();
    const cut = has('b_spiral') ? F.VOX.make('b_spiral', { cut: true }) : new THREE.Group();
    m.add(full); m.add(cut); m.userData.full = full; m.userData.cut = cut; cut.visible = false;
    m.position.set(S.x, f * FH, S.z); m.name = 'spiral_' + f; m.userData.stairF = f;
    m.traverse(o => { o.userData.stairF = f; });
    P.root.add(m); S.segs[f] = m;
  }
}
// the part of a segment that is drawn now (stair taps raycast only that one)
const segShown = m => (m.userData.cut && m.userData.cut.visible ? m.userData.cut : (m.userData.full || m));
// DESIGN2 §2.2 build cache: slott and tarn stay built; at most 2 royal plans are built (an evicted plan loses its things, VOX geometry stays cached)
function unbuild(P) {
  if (!P.built || P.id === B.cur) return;
  for (const id of P.things) { const t = F.Things.byId(id); if (t) F.Things.remove(t); }
  P.things.clear();
  if (P.root && P.root.parent) P.root.parent.remove(P.root);
  for (const c of P.cells) { if (c.pickPlane && c.pickPlane.parent) c.pickPlane.parent.remove(c.pickPlane); if (c.numLabel) c.numLabel.remove(); if (c.nameLabel) c.nameLabel.remove(); c.group = null; c.things = []; c.numLabel = c.nameLabel = null; }
  P.boxes = []; for (let f = 0; f < P.floors; f++) P.boxes.push([]);
  if (P.stair) P.stair.segs = null;
  P.built = false;
}
B.unbuild = id => { const P = B.plans[id]; if (P) unbuild(P); };
function evictRoyals(keep) {
  const built = Object.values(B.plans).filter(Q => Q.built && !Q.home && Q !== keep && Q.id !== B.cur).sort((a, b) => (a.lastUse || 0) - (b.lastUse || 0));
  const royalsBuilt = Object.values(B.plans).filter(Q => Q.built && !Q.home).length;
  for (let i = 0; i < built.length && royalsBuilt - i >= 2; i++) unbuild(built[i]);
}
function build(P) {
  P.lastUse = performance.now();
  if (P.built) return P;
  if (!P.home) evictRoyals(P);
  P.built = true;
  const t0 = performance.now();
  P.root = new THREE.Group(); P.root.name = 'bld_' + P.id; F.R.inScene.add(P.root);
  P.boxes = []; for (let f = 0; f < P.floors; f++) P.boxes.push([]);
  P.root.add(backdrop(P));
  buildWalls(P);
  for (const c of P.cells) { try { buildCell(P, c); } catch (e) { console.error('[bld] cell', P.id, c.key, e); } }
  try { buildStair(P); } catch (e) { console.error('[bld] stair', e); }
  try { spawnFixed(P); } catch (e) { console.error('[bld] lift/portals', e); }
  if (P.furnish !== false) for (const c of P.cells) { try { furnishCell(P, c); } catch (e) { console.error('[bld] furnish', P.id, c.key, e); } }
  P.buildMs = performance.now() - t0;
  F.emit('bldBuilt', P.id);
  if (B.cur === P.id) updateVis(true);
  return P;
}
B.build = id => { const P = B.plans[id]; return P ? build(P) : null; };
B.remakeShell = function (planId, key, extra) {
  const P = B.plans[planId], c = cellOf(P, key); if (!c || !c.group || !c.shellObj) return null;
  c.opts = Object.assign({}, c.opts || {}, extra || {});
  const pos = c.shellObj.position.clone(); c.group.remove(c.shellObj);
  const m = makeShell(P, c); m.position.copy(pos); c.group.add(m); c.shellObj = m; c.shell3 = m;
  return m;
};
// a plan replaced after it was built (WP2's tower over the fallback): rebuild, move un-furnished things by their local room coords
function replaceBuilt(old, P) {
  const moved = [];
  for (const id of old.things) {
    const t = F.Things.byId(id); if (!t) continue;
    const c = old.byKey[t.room] || B.roomAt(t.x, t.z, t.floor);
    moved.push([t, c ? (P.byKey[c.key] || P.byKey[P.alias[c.key]] || cellOf(P, c.type)) : null, c]);
  }
  if (old.root && old.root.parent) old.root.parent.remove(old.root);
  for (const c of old.cells) { if (c.pickPlane && c.pickPlane.parent) c.pickPlane.parent.remove(c.pickPlane); if (c.numLabel) c.numLabel.remove(); if (c.nameLabel) c.nameLabel.remove(); }
  build(P);
  for (const [t, nc, oc] of moved) {
    if (!F.Things.byId(t.id) || F.Things.byId(t.id) !== t) continue;          // re-furnished with the same id: done
    if (!nc || !oc) { F.Things.remove(t); continue; }
    const lx = t.x - oc.x0, lz = t.z - old.oz, dy = (t.y || 0) - oc.f * FH;
    t.x = nc.x0 + lx; t.z = P.oz + lz; t.y = nc.f * FH + dy; t.floor = nc.f; t.room = nc.key; t.bld = P.id;
    if (t.obj) t.obj.position.set(t.x, t.y, t.z);
    nc.things.push(t.id); P.things.add(t.id);
  }
  if (B.cur === P.id) { const p = F.Player.pos, c = B.roomAt(p.x, p.z, B.f); if (!c) placeAt(P, P.cells[0], P.cells[0].spawn.x, P.cells[0].spawn.z); updateVis(true); }
}

/* ================================================================== furnishing + spawning */
function thingId(P, c, type, o) {
  const pre = P.home ? (c.legacy || c.type || c.key) : (P.id + '_' + c.key);
  return 'c_' + pre + '_' + type + (o && o.idx != null ? '_' + o.idx : '');
}
B.spawnIn = function (planId, key, type, lx, lz, o) {
  const P = B.plans[planId], c = cellOf(P, key); if (!c) return null;
  if (!F.Things.defs[type]) return null;
  o = Object.assign({}, o); o.space = 'in'; o.y = c.f * FH + (o.dy || 0);
  o.id = o.id || thingId(P, c, type, o);
  const th = F.Things.spawn(type, c.x0 + lx, P.oz + lz, o);
  if (th) { th.room = c.key; th.floor = c.f; th.bld = P.id; c.things.push(th.id); P.things.add(th.id); }
  return th;
};
const TYPE_ALIAS = { hallen: 'hall', inngang: 'hall', prinsesse: 'mia', heisen: 'hall' };
const placeOf = t => B.PLACE[t] || B.PLACE[TYPE_ALIAS[t]] || null;
const decorOf = t => B.DECOR[t] || B.DECOR[TYPE_ALIAS[t]] || null;
function furnishCell(P, c) {
  const rows = c.place || placeOf(c.type) || [];
  B.furnish(P.id, c.key, c.type, { rows, home: P.home });
}
// v3 §4.7: nothing solid may stand in a side doorway that leads to a neighbouring room (lx < 1.8 / > 12.2, lz 3–7): the Ballsal chairs
// sealed the room in 4 kingdoms. Returns true when (lx, lz) of cell c is inside such a band.
function inDoorBand(P, c, lx, lz, pad) {
  pad = pad || 0;
  if (lz < 3 - pad || lz > 7 + pad) return false;
  return (lx < 1.8 + pad && !!P.at(c.f, c.c - 1)) || (lx > 12.2 - pad && !!P.at(c.f, c.c + 1));
}
// v3 §4.3: the UT mat (lz 8.9–9.9 at the exit) stays visible: a flat thing lying over it from behind (the Hallen runner c_loper ends
// on the mat) is pushed back until it ends 0.1 m before the mat
function clearMat(P, c, th) {
  if (!th.obj || th.solid) return;
  for (const e of P.exits) {
    if (e.cell !== c.key) continue;
    const bb = new THREE.Box3().setFromObject(th.obj), x0 = c.x0 + e.lx - 1.4, x1 = c.x0 + e.lx + 1.4, z0 = P.oz + e.lz + MAT_DZ - 0.5;
    if (bb.isEmpty() || bb.max.x < x0 || bb.min.x > x1 || bb.max.z <= z0 - 0.1 || th.z >= z0 || bb.max.y > 0.8 + c.f * FH) continue;
    const dz = bb.max.z - (z0 - 0.1);
    th.z -= dz; th.obj.position.z = th.z; note(P, c, th.type + ':offMat', +(-dz).toFixed(2), 0);
  }
}
// a log of what the doorway / mat rules changed (each plan build adds its own rows once; capped)
function note(P, c, what, lx, lz) { const k = P.id + '|' + c.key + '|' + what + '|' + lx + '|' + lz; if (B.skipped.length < 300 && !B.skipped.some(r => r.k === k)) { const r = [P.id, c.key, what, lx, lz]; r.k = k; B.skipped.push(r); } }
B.inDoorBand = (planId, key, lx, lz) => { const P = B.plans[planId], c = cellOf(P, key); return !!(c && inDoorBand(P, c, lx, lz)); };
B.furnish = function (planId, key, type, o) {
  o = o || {};
  const P = B.plans[planId], c = cellOf(P, key); if (!c) return [];
  const rows = o.rows || placeOf(type || c.type) || [];
  const out = [];
  for (const row of rows) {
    const [tt, lx0, lz, ro] = row; let lx = lx0;
    if (!P.home && NOT_ROYAL.has(tt)) continue;
    if (!F.Things.defs[tt]) continue;
    // a solid thing in a doorway band is moved inward (kept: it may be a quest target), never left in the way (v3 §4.7)
    const sol = ro && ro.solid != null ? ro.solid : F.Things.defs[tt].solid;
    if (sol && inDoorBand(P, c, lx, lz)) { const rr = F.Things.defs[tt].radius || 0.7; lx = lx < 7 ? Math.max(lx, 1.8 + rr + 0.35) : Math.min(lx, 12.2 - rr - 0.35); note(P, c, tt + ':inward', lx0, lz); }
    const r = Object.assign({}, ro || {});
    const th = B.spawnIn(P.id, c.key, tt, lx, lz, r);
    if (th) { out.push(th); try { clearMat(P, c, th); } catch (e) { /* cosmetic */ } }
    if (r.block) {
      const bx0 = r.block[0], bz0 = r.block[1], bx1 = r.block[2], bz1 = r.block[3];
      if (inDoorBand(P, c, (bx0 + bx1) / 2, (bz0 + bz1) / 2)) note(P, c, tt + ':block', lx, lz);
      else addBox(P, c.f, c.x0 + bx0, P.oz + bz0, c.x0 + bx1, P.oz + bz1);
    }
  }
  // static decor (rugs, chairs, plants): meshes in the cell group, solid ones block
  const dec = (o.decor !== false) && (decorOf(type || c.type) || []);
  if (dec && c.group) for (const [id, lx, lz, d0] of dec) {
    const d = d0 || {}; if (!has(id)) continue;
    if (d.solid && inDoorBand(P, c, lx, lz)) { note(P, c, id, lx, lz); continue; }      // v3 §4.7: keep doorways open (static decor is left out)
    const m = F.VOX.make(id, d.o || {}); m.name = 'decor_' + id;
    m.position.set(c.x0 + lx, c.f * FH + (d.dy || 0) + (/teppe|rug/.test(id) ? 0.005 : 0), P.oz + lz); m.rotation.y = d.ry || 0;
    if (d.s) { if (Array.isArray(d.s)) m.scale.set(d.s[0], d.s[1], d.s[2]); else m.scale.setScalar(d.s); }
    c.group.add(m);
    if (d.solid) { m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); addBox(P, c.f, bb.min.x + 0.12, bb.min.z + 0.12, bb.max.x - 0.12, bb.max.z - 0.12); }
  }
  const ex = P.home && o.extras !== false && B.extras[type || c.type];
  if (ex) try { ex(P, c); } catch (e) { console.error('[bld] extras', type, e); }
  return out;
};
// lift cabins and exit portals come from the plan itself
function spawnFixed(P) {
  if (P.lift && F.Things.defs.c_heis) for (const k of P.lift.cells) {
    const c = cellOf(P, k); if (!c) continue;
    B.spawnIn(P.id, c.key, 'c_heis', P.lift.lx, P.lift.lz, { ry: P.lift.ry || 0, id: P.home ? thingId(P, c, 'c_heis') : null });
  }
  for (const e of P.exits) {
    const c = cellOf(P, e.cell); if (!c) continue;
    const th = B.spawnIn(P.id, c.key, 'b_portal', e.lx, e.lz + MAT_DZ, { id: 'b_portal_' + P.id + '_' + e.id, data: { bld: P.id, exit: e.id } });
    e.thing = th; e.cellObj = c;
    // the tall UT sign right of the mat (left when the mat is near the right wall)
    const sx = e.lx + (e.lx > 11 ? -1.95 : 1.95);
    e.sign = F.Things.defs.b_utskilt ? B.spawnIn(P.id, c.key, 'b_utskilt', sx, e.lz - 0.15, { id: 'b_utskilt_' + P.id + '_' + e.id, dy: 2.75, data: { bld: P.id, exit: e.id } }) : null;
  }
  try { wayoutSigns(P); } catch (err) { console.error('[bld] way-out signs', err); }
}

/* ================================================================== collision, height, paths (= F.Space.impl.in) */
function thingFloor(t) { return t.floor != null ? t.floor : Math.floor(((t.y || 0) + 1) / FH); }
function stairBlocks(P, f, x, z, r) {
  const S = P.stair; if (!S || f < S.fMin || f > S.fMax) return false;
  const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz);
  if (d >= 1.85 + r) return false;
  return !inMouth(P, f, x, z);
}
function mouthSector(P, f) {
  const S = P.stair; const lo = f === S.fMin ? -10 : -35, hi = f === S.fMax ? 10 : 35;
  return [lo * Math.PI / 180, hi * Math.PI / 180];
}
function inMouth(P, f, x, z, rMax) {
  const S = P.stair; if (!S) return false;
  const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz);
  if (d < 0.9 || d > (rMax || 2.4)) return false;
  const a = Math.atan2(dx, dz), [lo, hi] = mouthSector(P, f);
  return a >= lo && a <= hi;
}
B.inMouth = (x, z) => { const P = B.curPlan(); return !!(P && inMouth(P, B.f, x, z, 2.0)); };
const impl = {
  floorY: 0,
  heightAt() { return B.yNow != null ? B.yNow : B.f * FH; },
  blocked(x, z, r, ign) {
    const P = B.curPlan(); if (!P) return false;
    const f = B.f, BX = P.boxes[f] || [];
    for (let i = 0; i < BX.length; i++) { const b = BX[i]; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true; }
    if (stairBlocks(P, f, x, z, r)) return true;
    const L = F.Things.list;
    for (let i = 0; i < L.length; i++) {
      const t = L[i]; if (!t.solid || t === ign || t.space !== 'in') continue;
      if (t.x < P.x0 - 2 || t.x > P.x1 + 2 || Math.abs(t.z - P.oz - 5) > 8 || thingFloor(t) !== f) continue;
      const dx = t.x - x, dz = t.z - z, rr = t.radius + r; if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  },
  // A* on a 0.5 m grid over the current plan + floor (door waypoints come for free); cross-floor legs: B.pathTo
  findPath(sx, sz, gx, gz, r, ign) {
    const P = B.curPlan(); if (!P) return [[gx, gz]];
    const cell = 0.5, minX = P.x0 - 1, minZ = P.oz - 0.5, w = Math.ceil((P.x1 - P.x0 + 2) / cell) + 1, h = 23;
    const toI = x => U.clamp(Math.round((x - minX) / cell), 0, w - 1), toJ = z => U.clamp(Math.round((z - minZ) / cell), 0, h - 1);
    const cache = new Int8Array(w * h);
    const free = (i, j) => { if (i < 0 || j < 0 || i >= w || j >= h) return false; const k = j * w + i; if (!cache[k]) cache[k] = impl.blocked(minX + i * cell, minZ + j * cell, r || 0.35, ign) ? 2 : 1; return cache[k] === 1; };
    const si = toI(sx), sj = toJ(sz); let gi = toI(gx), gj = toJ(gz);
    if (!free(gi, gj)) { let best = null; for (let rr = 1; rr < 8 && !best; rr++) for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) if (!best && free(gi + di, gj + dj)) best = [gi + di, gj + dj]; if (!best) return [[gx, gz]]; [gi, gj] = best; }
    const g = new Float32Array(w * h).fill(Infinity), came = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
    const heap = [];
    const push = (pr, k) => { heap.push([pr, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const s = sj * w + si; g[s] = 0; push(Math.hypot(si - gi, sj - gj), s);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false, it = 0;
    while (heap.length && it++ < 20000) {
      const k = pop()[1]; if (closed[k]) continue; closed[k] = 1;
      const i = k % w, j = (k - i) / w;
      if (i === gi && j === gj) { found = true; break; }
      for (const [di, dj, cst] of D) {
        const ni = i + di, nj = j + dj; if (!free(ni, nj)) continue;
        if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
        const nk = nj * w + ni, ng = g[k] + cst;
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; push(ng + Math.hypot(ni - gi, nj - gj), nk); }
      }
    }
    if (!found) return [[gx, gz]];
    const pts = []; let k = gj * w + gi;
    while (k !== -1 && k !== s) { const i = k % w, j = (k - i) / w; pts.push([minX + i * cell, minZ + j * cell]); k = came[k]; }
    pts.reverse();
    const clear = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25); for (let q = 1; q < n; q++) { const t = q / n; if (impl.blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r || 0.35, ign)) return false; } return true; };
    const out = []; let cur = [sx, sz];
    for (let q = 0; q < pts.length; q++) if (q === pts.length - 1 || !clear(cur, pts[q + 1])) { out.push(pts[q]); cur = pts[q]; }
    // the exact goal instead of its grid point – only when the straight last leg to it is clear too (natural 11.10.: from the bed the
    // last leg to the stair mouth grazed the stair ring and she ran on the spot); else the grid point first, then the goal
    if (out.length) {
      const n = out.length, gp = out[n - 1], prev = n > 1 ? out[n - 2] : [sx, sz];
      if (Math.hypot(gp[0] - gx, gp[1] - gz) < 0.6 && !impl.blocked(gx, gz, r || 0.35, ign)) {
        if (clear(prev, [gx, gz])) out[n - 1] = [gx, gz];
        else if (clear(gp, [gx, gz])) out.push([gx, gz]);
      }
    }
    return out.length ? out : [[gx, gz]];
  },
  scene: () => F.R.inScene,
};
B.impl = impl;
B.heightAt = impl.heightAt; B.blocked = impl.blocked; B.findPath = impl.findPath; B.scene = impl.scene;
F.Space.impl.in = impl;
F.Space.groundMeshes = space => {
  if (space !== 'in') return [];
  const P = B.curPlan(); if (!P || !P.built) return [];
  return P.cells.filter(c => c.f === B.visF && c.pickPlane).map(c => c.pickPlane);
};

/* ================================================================== visibility (only visF; the stair cell below; spiral segments touching visF) */
let visKey = '', visAcc = 0;
function cellVisible(P, c) {
  if (!c.group) return false;
  const px = F.Player.pos.x;
  if (c.f === B.visF) return Math.abs(c.center.x - px) <= 30 + 7;
  if (B.showBelow && c.f < B.visF) return Math.abs(c.center.x - px) <= 30;
  return !!(P.stair && c.c === P.stair.col && c.f === B.visF - 1);
}
function updateVis(force) {
  const P = B.curPlan();
  const inside = F.Space.cur === 'in' && P && P.built;
  const px = F.Player.pos.x;
  const key = inside ? P.id + '|' + B.visF + '|' + Math.round(px / 5) : 'none';
  if (!force && key === visKey) return;
  visKey = key;
  for (const id in B.plans) {
    const Q = B.plans[id]; if (!Q.built) continue;
    const mine = inside && Q === P;
    Q.root.visible = mine;
    for (const c of Q.cells) {
      const on = mine && cellVisible(Q, c), lab = on && c.f === B.visF;
      if (c.group) c.group.visible = on;
      if (c.numLabel) c.numLabel.show(lab); if (c.nameLabel) c.nameLabel.show(lab);
    }
    if (Q.stair && Q.stair.segs) for (const f in Q.stair.segs) {
      const m = Q.stair.segs[f], low = +f === B.visF;
      m.visible = mine && (low || +f + 1 === B.visF);
      if (m.userData.cut) { m.userData.cut.visible = low; m.userData.full.visible = !low; }
    }
  }
  thingVis(P, inside);
}
function thingVis(P, inside) {
  const L = F.Things.list;
  for (let i = 0; i < L.length; i++) {
    const t = L[i]; if (t.space !== 'in' || !t.obj) continue;
    let on = false;
    if (inside && t.x >= P.x0 - 1 && t.x <= P.x1 + 1 && Math.abs(t.z - P.oz - 5) < 9) {
      const f = thingFloor(t);
      if (f === B.visF) { const c = P.at(f, Math.floor((t.x - P.ox + 0.5) / PX)); on = !!c && c.group && cellVisible(P, c); }
    }
    if (t.offStage) on = false;                         // a furnishing that waits for later (Ordmuseet's empty pedestals): hidden, not pickable
    if (!on) { if (t.obj.visible) { t.obj.visible = false; t._cHid = true; } t.hidden = true; }
    else { if (t._cHid) { t.obj.visible = true; t._cHid = false; } t.hidden = false; }
    if (t.labels) t.labels.forEach(Lb => Lb.show && Lb.show(on));
  }
}
B.updateVis = updateVis;

/* ================================================================== camera ('in': target follows her, x/z clamped) */
// v3 §4.8: in the exit room the view is pushed forward so the UT mat (lz 9.4) stays above the bottom 140 px (and off the wand) at every
// zoom: target lz ≥ EXIT_CAM[zoom] there (measured on a 686 px canvas: mat centre y ≈ 535 / 532 / 541 ≤ 546, the mat's front edge above
// the wand's top 576; the back floor stays on screen), blended out over 4 m toward the neighbouring rooms so the camera never jumps.
const EXIT_CAM = [8.7, 7.6, 6.1];
F.R.cam.clamp = function (v) {
  const P = B.curPlan(); if (!P) return v;
  v.x = U.clamp(v.x, P.x0 + 5, Math.max(P.x0 + 5, P.x1 - 5)); v.z = U.clamp(v.z, P.oz + 3, P.oz + 7.5);
  const zi = F.R.cam.zoomInI != null ? F.R.cam.zoomInI : 1, need = EXIT_CAM[U.clamp(zi, 0, 2)];
  let wMax = 0;
  for (const e of P.exits) {
    const c = cellOf(P, e.cell); if (!c || c.f !== B.visF) continue;
    const w = U.clamp(1 - (Math.abs(F.Player.pos.x - (c.x0 + 7)) - 5) / 4, 0, 1); if (w > wMax) wMax = w;
  }
  if (wMax > 0) v.z = Math.max(v.z, U.lerp(v.z, P.oz + need, wMax));
  return v;
};
function camFollow() {
  const c = F.R.cam; if (c.mode !== 'in' || F.Space.cur !== 'in') return;
  const p = F.Player.pos;
  c.target.set(p.x, p.y + 1.0, p.z); F.R.cam.clamp(c.target);
}

/* ================================================================== the white dip (doors only) */
let dipEl = null, dipGen = 0;
function dip(to, ms) {
  if (!dipEl) {
    dipEl = document.createElement('div'); dipEl.id = 'bldDip';
    dipEl.style.cssText = 'position:fixed;inset:0;z-index:35;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 50%, #fff 0%, #fffaf0 55%, #ffeef7 100%);';
    document.body.appendChild(dipEl);
  }
  const from = +dipEl.style.opacity || 0, g = ++dipGen;
  if (!ms) { dipEl.style.opacity = String(to); return Promise.resolve(); }
  return F.T.tween(ms, k => { if (g === dipGen) dipEl.style.opacity = String(from + (to - from) * ease.inOut(k)); });
}
B.dip = dip;
B.dipping = () => !!(dipEl && +dipEl.style.opacity > 0.01);

/* ================================================================== enter / leave */
function freeSpot(P, c, x, z) {
  const f0 = B.f, cur0 = B.cur; B.cur = P.id; B.f = c.f;
  let best = { x, z };
  try {
    if (impl.blocked(x, z, 0.4)) {
      let found = null;
      for (let rad = 0.5; rad < 6 && !found; rad += 0.5) for (let a = 0; a < 16 && !found; a++) {
        const px = x + Math.cos(a / 16 * TAU) * rad, pz = U.clamp(z + Math.sin(a / 16 * TAU) * rad, P.oz + 0.9, P.oz + 9.4);
        if (px > c.bounds.x0 + 0.8 && px < c.bounds.x1 - 0.8 && !impl.blocked(px, pz, 0.4)) found = { x: px, z: pz };
      }
      if (found) best = found;
    }
  } finally { B.cur = cur0; B.f = f0; }
  return best;
}
B.freeSpot = (planId, key, x, z) => { const P = B.plans[planId], c = cellOf(P, key); return c ? freeSpot(P, c, x, z) : { x, z }; };
let doorArm = null;
function placeAt(P, c, x, z) {
  build(P);
  B.gen++;
  B.cur = P.id; B.f = c.f; B.visF = c.f; B.yNow = null;
  const zi = F.R.cam.zoomInI != null ? F.R.cam.zoomInI : 1;
  const cam = { mode: 'in', pitch: 0.66, yaw: 0, dist: F.R.ZOOM_IN ? F.R.ZOOM_IN[zi] : 15, snap: true };
  if (F.Space.cur !== 'in') F.Space.set('in', { x, z, cam });
  else { F.Player.teleport(x, z); F.R.setCam(cam); }
  F.Player.pos.y = c.f * FH;
  setRoom(c, true);
  camFollow(); F.R.cam.init = false;
  updateVis(true);
}
function resolveAt(P, o) {
  const at = o.at;
  const bed = P.bed || (P.spots && (P.spots.wake || P.spots.bed));
  if (at === 'bed' && bed) { const c = cellOf(P, bed.cell) || P.cells[0]; return { c, x: c.x0 + bed.lx, z: P.oz + bed.lz }; }
  if (at && typeof at === 'object' && at.room != null) { const c = cellOf(P, at.room) || P.cells[0]; const s = freeSpot(P, c, c.spawn.x, c.spawn.z); return { c, x: s.x, z: s.z }; }
  if (at && typeof at === 'object' && at.x != null) {
    const f = at.f | 0, c = P.at(f, Math.floor((at.x - P.ox + 0.5) / PX)) || P.cells.find(q => q.f === f) || P.cells[0];
    const x = U.clamp(at.x, c.bounds.x0 + 0.4, c.bounds.x1 - 0.4), z = U.clamp(at.z, P.oz + 0.6, P.oz + 9.4);
    const s = at.free ? freeSpot(P, c, x, z) : { x, z }; return { c, x: s.x, z: s.z };
  }
  const e = (o.exit && P.exits.find(q => q.id === o.exit)) || P.exits[0];
  if (e) { const c = cellOf(P, e.cell) || P.cells[0]; return { c, x: c.x0 + e.lx, z: P.oz + SPAWN_LZ + 1.4, exit: e }; }   // behind the dip; then a glide to SPAWN_LZ
  const c = P.cells[0]; return { c, x: c.spawn.x, z: c.spawn.z };
}
async function ensurePlan(id) {
  if (B.plans[id]) return B.plans[id];
  if (/^rk_/.test(id) && F.Realm && F.Realm.ensure) { try { await F.Realm.ensure(id.slice(3)); } catch (e) { console.error('[bld] realm ensure', e); } }
  return B.plans[id] || null;
}
function freeze(on) { const Pl = F.Player; if (on) { Pl.stop(); Pl.frozen = true; F.Input.enabled = false; } else { Pl.frozen = false; F.Input.enabled = true; } }
function glide(x, z, ms) { const p = F.Player.pos, x0 = p.x, z0 = p.z, g = B.gen; return F.T.tween(ms, k => { if (g !== B.gen) return; const e = ease.inOut(k); p.x = U.lerp(x0, x, e); p.z = U.lerp(z0, z, e); }); }
function enterInstant(P, o) {
  if (B.busy) { B.epoch++; B.busy = false; B._leaving = false; freeze(false); }      // a running climb / ride / door crossing is cancelled
  const r = resolveAt(P, o); placeAt(P, r.c, r.x, r.z);
  if (r.exit) { const s = freeSpot(P, r.c, r.x, P.oz + SPAWN_LZ); F.Player.teleport(s.x, s.z); F.Player.pos.y = r.c.f * FH; camFollow(); }   // ≥ 3.5 m inside the exit (v3 §4.4)
  if (B.dipping()) dip(0, 350);
  F.emit('bldEntered', P.id);
  return true;
}
// sync when instant (dip:false) and the plan exists – old callers (F.Castle.enter, tests, resume) rely on that
B.enter = function (id, o) {
  o = o || {};
  if ((o.instant || o.dip === false) && B.plans[id]) return Promise.resolve(enterInstant(B.plans[id], o));
  return enterDoor(id, o);
};
async function enterDoor(id, o) {
  const P = await ensurePlan(id); if (!P) return false;
  if (o.instant || o.dip === false) return enterInstant(P, o);
  if (B.busy) return false; B.busy = true;
  freeze(true);
  const ep = B.epoch;                       // exitNow / Space.set('out') / an instant enter meanwhile → this crossing is abandoned (state already reset)
  try {
    const d = o.door;
    if (d && F.Space.cur === 'out') { const ry = d.ry || 0, Pl = F.Player; Pl.heading = ry + Math.PI; await glide(Pl.pos.x - Math.sin(ry) * 0.6, Pl.pos.z - Math.cos(ry) * 0.6, 250); }
    if (ep !== B.epoch) return false;
    sfx('door');
    await dip(1, 350);
    if (ep !== B.epoch) return false;
    const r = resolveAt(P, o);
    placeAt(P, r.c, r.x, r.z);
    F.Player.heading = Math.PI;
    await dip(0, 350);
    if (ep !== B.epoch) return false;
    if (r.exit) { const s = freeSpot(P, r.c, r.c.x0 + r.exit.lx, P.oz + SPAWN_LZ); await glide(s.x, s.z, 250); }   // ≥ 3.5 m inside (v3 §4.4); input frozen ≤ 1.2 s in total
    if (ep !== B.epoch) return false;
    F.emit('bldEntered', P.id); F.emit('doorCrossed', { bld: P.id, dir: 'in' });
    if (P.home && P.id === 'slott') say('bld_inn');
  } catch (e) { console.error('[bld] enter', e); }
  freeze(false); B.busy = false;
  return true;
};
function nearestExit(P) {
  const p = F.Player.pos; let best = null, bd = Infinity;
  for (const e of P.exits) { const c = cellOf(P, e.cell); if (!c) continue; const d = Math.abs(c.f - B.f) * 100 + Math.hypot(c.x0 + e.lx - p.x, P.oz + e.lz - p.z); if (d < bd) { bd = d; best = e; } }
  return best;
}
// DESIGN2 §2.4: she appears in front of the door; a plan whose exit.out IS the door spot (royal plans) is pushed 1.8 m out of the door box
function exitOut(P, e) {
  const out = (e && e.out) || { x: 0, z: 30.5, ry: 0 };
  const dor = P && F.Things.byId('b_dor_' + P.id);
  if (dor && Math.hypot(out.x - dor.x, out.z - dor.z) < 1.0) { const dr = dor.ry || 0; return { x: dor.x + Math.sin(dr) * 1.8, z: dor.z + Math.cos(dr) * 1.8, ry: out.ry || 0 }; }
  return out;
}
function leaveNow(P, e) {
  const out = exitOut(P, e), ry = out.ry || 0;
  B.gen++; if (B.busy && !B._leaving) { B.busy = false; F.Player.frozen = false; F.Input.enabled = true; }
  B.cur = null; B.f = 0; B.visF = 0; B.yNow = null;
  const prev = B.roomKey; B.roomKey = null; void prev;
  F.Space.set('out', { x: out.x, z: out.z, cam: { mode: 'out', pitch: 0.92, yaw: ry, dist: (F.R.ZOOM || [16, 24, 36])[F.R.cam.zoomI] || 24, snap: true } });
  F.Player.heading = ry;
  F.R.cam.target.copy(F.Player.pos); F.R.cam.init = false;
  doorArm = { bld: P.id, t: F.T.now };
  updateVis(true);
}
B.leave = async function (o) {
  o = o || {};
  const P = B.curPlan(); if (!P) { if (F.Space.cur === 'in') F.Space.set('out', { x: 0, z: 30.5 }); return false; }
  const e = (o.exit && P.exits.find(q => q.id === o.exit)) || nearestExit(P) || P.exits[0];
  if (o.instant || o.dip === false) { leaveNow(P, e); if (B.dipping()) dip(0, 350); F.emit('bldLeft', P.id); return true; }
  if (B.busy) return false; B.busy = true;
  freeze(true);
  const ep = B.epoch;
  try {
    const Pl = F.Player; Pl.heading = 0;
    await glide(Pl.pos.x, Math.min(P.oz + 10.2, Pl.pos.z + 0.6), 300);
    if (ep !== B.epoch) return false;
    sfx('door'); say('bld_ut');
    await dip(1, 350);
    if (ep !== B.epoch) return false;
    B._leaving = true; leaveNow(P, e); B._leaving = false;
    await dip(0, 350);
    F.emit('bldLeft', P.id); F.emit('doorCrossed', { bld: P.id, dir: 'out' });
  } catch (err) { console.error('[bld] leave', err); }
  freeze(false); B.busy = false;
  return true;
};

// synchronous, no fades (debug teleport, travel, tests): cancels any climb / ride / door crossing, resets cur/f/visF/room, unfreezes
// input it froze, puts her outdoors at the exit (or o.to {x,z,ry}) unless o.space === false, emits bldLeft. Safe to call when outside.
function resetState() {
  B.epoch++; B.gen++; dipGen++;
  if (dipEl) dipEl.style.opacity = '0';
  if (B.busy || B._leaving) { B.busy = false; B._leaving = false; freeze(false); }
  B.cur = null; B.f = 0; B.visF = 0; B.roomKey = null; B.yNow = null;
  keyHold = 0; idleIn = 0;
  try { if (F.BldMap && F.BldMap.close) F.BldMap.close(); } catch (e) { /* map optional */ }
}
B.exitNow = function (o) {
  o = o || {};
  const P = B.curPlan(), id = B.cur;
  const e = P ? ((o.exit && P.exits.find(q => q.id === o.exit)) || nearestExit(P) || P.exits[0]) : null;
  resetState();
  if (F.Space.cur === 'in' && o.space !== false) {
    const out = o.to || exitOut(P, e), ry = out.ry || 0;
    F.Space.set('out', { x: out.x, z: out.z, cam: { mode: 'out', pitch: 0.92, yaw: ry, dist: (F.R.ZOOM || [16, 24, 36])[F.R.cam.zoomI] || 24, snap: true } });
    F.R.cam.target.copy(F.Player.pos); F.R.cam.init = false;
  } else if (o.to && F.Space.cur === 'out') F.Player.teleport(o.to.x, o.to.z);
  if (id) doorArm = { bld: id, t: F.T.now };
  updateVis(true);
  if (id) F.emit('bldLeft', id);
  return !!id;
};

/* ================================================================== room tracking */
B.roomOK = roomOK;      // v5c WP-W2: tests / royals can check a plate before speaking it
let lastNumSay = -99;
function setRoom(c, quiet) {
  const prev = B.roomKey;
  B.roomKey = c ? c.key : null;
  if (!c || prev === c.key) return;
  // home rooms keep their legacy ids; other buildings say '<planId>:<cell>' (= F.Castle.cur), so a royal Tronsalen never counts as the home one
  const P = B.plans[c.bld], rid = P && !P.home ? P.id + ':' + c.key : c.key;
  F.emit('roomEntered', rid, prev && P && !P.home ? P.id + ':' + prev : prev);
  // royal castles: every numbered room says its number on entry (DESIGN2 §3.7: teens in every castle)
  // v3 (WP4 §7.8 request): plan.quietRooms or F.Bld.quietRooms (true | fn(plan) → bool) turns the automatic number line off
  const qr = P && (P.quietRooms || (typeof B.quietRooms === 'function' ? B.quietRooms(P) : B.quietRooms));
  if (!quiet && !qr && !B.flying && P && P.kind === 'kongeslott' && c.num != null && F.T.now - lastNumSay > 2.5) { lastNumSay = F.T.now; sayRoom('bld_rom', c.num); }
  // v5 WP-X (#45): the room she rode to says its number when she really walks in («Her er rom 9!»), not at the lift landing
  else if (B.rideTo && B.rideTo.key === c.key && B.rideTo.bld === c.bld) { B.rideTo = null; if (c.num != null && F.T.now - lastNumSay > 2.5) { lastNumSay = F.T.now; sayRoom('bld_rom', c.num); } }
}

/* ================================================================== spiral stairs (DESIGN2 §2.3) */
B.canStairs = function (dir) {
  const P = B.curPlan(), S = P && P.stair; if (!S) return false;
  return dir === 'up' ? (B.f >= S.fMin && B.f < S.fMax) : (B.f > S.fMin && B.f <= S.fMax);
};
B.stairMouth = function (f) { const P = B.curPlan(), S = P && P.stair; if (!S) return null; return { x: S.x, z: S.z + 1.8, f: f != null ? f : B.f }; };
// the walk to the stair mouth / the lift doors (ms: give up after that long). → {ok, mind}: mind = she changed her mind on the way – a
// new tap / UT / the map gave her another goal, a panel or Staven opened, arrow keys – so the climb / ride must not start (natural,
// round 2: a cancelled walk near the stairs used to climb anyway, and UT then took her UP with «Opp trappa!»)
async function walkTo(x, z, o, ms) {
  const Pl = F.Player;
  const pr = Pl.goTo(x, z, o), mine = Pl.onArrive;
  const ok = await (ms ? Promise.race([pr, F.T.sleep(ms).then(() => false)]) : pr);
  if (ok) return { ok: true, mind: false };
  const K = Pl.keys || {}, keys = K.ArrowUp || K.ArrowDown || K.ArrowLeft || K.ArrowRight || K.KeyW || K.KeyA || K.KeyS || K.KeyD;
  const mind = !!((Pl.onArrive && Pl.onArrive !== mine) || Pl.frozen || B.busy || keys || F.Space.cur !== 'in' ||
    (F.UI.isOpen && F.UI.isOpen()) || (F.Wand && F.Wand.isOpen && F.Wand.isOpen()));
  return { ok: false, mind };
}
// o.quiet: no «Opp/Ned trappa!» and no floor line (the UT trip, natural D9)
B.stairs = async function (dir, o) {
  if (B.busy || F.Player.frozen || F.Space.cur !== 'in') return false;
  if (!B.canStairs(dir)) { sfx('boing'); return false; }
  const m = B.stairMouth();
  const p = F.Player.pos;
  if (Math.hypot(p.x - m.x, p.z - m.z) > 1.2 && !B.inMouth(p.x, p.z)) {
    const w = await walkTo(m.x, m.z + 0.3, { stopDist: 0.4 });
    if (!w.ok && (w.mind || Math.hypot(p.x - m.x, p.z - m.z) > 2.5)) return false;    // another goal now, or blocked far from the stairs
  }
  return B.climb(dir, o);
};
// a climb / lift ride is running in this building (B.gen): a UT tap meanwhile is kept for the moment she steps off (B.utPress)
let transitGen = -1;
B.climb = async function (dir, o) {
  const quiet = !!(o && o.quiet);
  const P = B.curPlan(), S = P && P.stair;
  if (!S || B.busy || !B.canStairs(dir)) return false;
  B.busy = true; freeze(true); transitGen = B.gen;
  const Pl = F.Player, p = Pl.pos, f0 = B.f, f1 = dir === 'up' ? f0 + 1 : f0 - 1, R = 1.0;
  try {
    const sx = S.x, sz = S.z;
    await glide(sx + R * Math.sin(0), sz + R * Math.cos(0), 240);
    let swapped = false, last = -1; const g = B.gen;
    B.yNow = f0 * FH;
    await F.T.tween(1600, k => {
      if (g !== B.gen) return;
      const e = ease.inOut(k) * 0.35 + k * 0.65;
      const th = dir === 'up' ? TAU * e : TAU * (1 - e);
      const yb = dir === 'up' ? f0 * FH + FH * e : f1 * FH + FH * (1 - e);
      const step = Math.floor(e * 24);
      B.yNow = yb + 0.1 * Math.abs(Math.sin(e * 24 * Math.PI));
      p.x = sx + R * Math.sin(th); p.z = sz + R * Math.cos(th); p.y = B.yNow;
      Pl.heading = dir === 'up' ? Math.atan2(Math.cos(th), -Math.sin(th)) : Math.atan2(-Math.cos(th), Math.sin(th));
      if (step !== last) { if (step % 3 === 0) sfx('step'); last = step; }
      if (!swapped && k >= 0.5) {
        swapped = true; B.visF = f1; updateVis(true);
        if (!quiet) say(dir === 'up' ? 'bld_opp' : 'bld_ned');
      }
    });
    if (g !== B.gen) { B.busy = false; transitGen = -1; return false; }   // cancelled (she left the building meanwhile)
    B.f = f1; B.yNow = null; p.y = f1 * FH;
    await glide(sx, sz + 2.3, 200);
    Pl.heading = 0;
    await glide(sx, sz + 3.0, 400);
    const c = P.at(f1, S.col); if (c) setRoom(c);
    F.emit('floorChanged', f1, P.id);
    if (!quiet && P.floors > 2 && F.SETS && F.SETS.ETASJE && F.SETS.ETASJE[f1]) F.T.timeout(() => say('bld_etasje', { e: F.SETS.ETASJE[f1] }), 700);
  } catch (e) { console.error('[bld] climb', e); B.yNow = null; B.f = f1; }
  freeze(false); B.busy = false; transitGen = -1;
  updateVis(true);
  return true;
};
// taps on visible steps: above her floor = up, in the hole below = down
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function stairHook(sx, sy) {
  if (F.Space.cur !== 'in' || B.busy) return null;
  const P = B.curPlan(), S = P && P.stair; if (!S || !S.segs) return null;
  const objs = []; for (const f in S.segs) if (S.segs[f].visible) objs.push(segShown(S.segs[f]));
  if (!objs.length) return null;
  const r = F.R.renderer.domElement.getBoundingClientRect();
  ndc.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, F.R.camera);
  const hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null;
  const dir = hit.point.y > B.f * FH + 0.3 ? 'up' : 'down';
  if (!B.canStairs(dir)) return null;
  return { kind: 'stair', dir, point: hit.point, press: () => { B.stairs(dir); } };
}
if (F.Input && F.Input.pickHooks) F.Input.pickHooks.push(stairHook);
// arrow keys inside the mouth zone: counter-clockwise tangent (+x at the front) = up, clockwise = down, straight in = up (else down)
let keyHold = 0;
function keyStairs(dt) {
  if (F.Space.cur !== 'in' || B.busy || F.Player.frozen) { keyHold = 0; return; }
  const P = B.curPlan(); if (!P || !P.stair) return;
  const k = F.Player.keys || {};
  const fw = (k.ArrowUp || k.KeyW ? 1 : 0) - (k.ArrowDown || k.KeyS ? 1 : 0), sd = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
  if (!fw && !sd) { keyHold = 0; return; }
  const p = F.Player.pos; if (!inMouth(P, B.f, p.x, p.z, 1.7)) { keyHold = 0; return; }      // she has to step onto the stairs: walking past never climbs
  keyHold += dt; if (keyHold < 0.15) return;
  let dir = null;
  if (sd > 0) dir = 'up'; else if (sd < 0) dir = 'down'; else if (fw > 0) dir = B.canStairs('up') ? 'up' : 'down';
  if (dir && B.canStairs(dir)) { keyHold = 0; B.climb(dir); }
}

/* ================================================================== the lift (DESIGN2 §2.3): doors close, floor swaps behind them, doors open */
function liftThing(P, f) { const c = P.lift && P.lift.cells.map(k => cellOf(P, k)).find(q => q && q.f === f); return c ? F.Things.byId(c.things.find(id => { const t = F.Things.byId(id); return t && t.type === 'c_heis'; })) : null; }
B.liftFront = function (f) { const P = B.curPlan(); if (!P || !P.lift) return null; const c = P.lift.cells.map(k => cellOf(P, k)).find(q => q && q.f === (f != null ? f : B.f)); return c ? { x: c.x0 + P.lift.lx, z: P.oz + P.lift.lz + 1.9, f: c.f } : null; };
function slideDoors(th, open, ms) {
  if (!th || !th.parts) return Promise.resolve();
  const L = th.parts.doorL, R = th.parts.doorR; if (!L || !R) return Promise.resolve();
  const a0 = L.position.x, b0 = R.position.x, a1 = open ? -1.1 : 0, b1 = open ? 1.1 : 0;
  return F.T.tween(ms, k => { const e = ease.inOut(k); L.position.x = U.lerp(a0, a1, e); R.position.x = U.lerp(b0, b1, e); });
}
// o.quiet: no lift / floor / room lines and no trail afterwards (the UT trip, natural D9)
B.ride = async function (target, o) {
  const quiet = !!(o && o.quiet);
  const P = B.curPlan(); if (!P || !P.lift || F.Space.cur !== 'in') return false;
  let tc = null, floorRide = false;
  // v5 WP-X: {f} alone = a floor button (the landing of that floor's lift, no trail); a room target trails to the room
  if (typeof target === 'object' && target && target.f != null) {
    floorRide = !target.room;
    tc = target.room ? cellOf(P, target.room) : (P.cells.find(c => c.f === target.f && ((P.lift && P.lift.cells) || []).includes(c.key)) || P.cells.find(c => c.f === target.f));
  } else tc = cellOf(P, target);
  if (!tc) return false;
  if (B.busy) return false;
  const front = B.liftFront(); if (!front) return false;
  const Pl = F.Player, p = Pl.pos;
  if (Math.hypot(p.x - front.x, p.z - front.z) > 1.6) {
    if (Pl.frozen) await glide(front.x, front.z, 400);                 // a task froze her (F01 lift answer): glide to the doors
    else { const w = await walkTo(front.x, front.z, { stopDist: 0.3 }, 9000); if (!w.ok && (w.mind || Math.hypot(p.x - front.x, p.z - front.z) > 3)) return false; }
  }
  if (B.busy) return false;
  B.busy = true; freeze(true); transitGen = B.gen;
  const f0 = B.f, f1 = tc.f;
  try {
    const a = liftThing(P, f0);
    if (f1 !== f0) {
      await slideDoors(a, true, 350);
      Pl.heading = Math.PI; await glide(front.x, P.oz + P.lift.lz + 0.75, 380); Pl.heading = 0;
      await slideDoors(a, false, 600);
      if (!quiet) say(f1 > f0 ? 'bld_heis_opp' : 'bld_heis_ned');
      const lab = a && F.UI.label ? F.UI.label(V3(a.x, a.y + 4.3, a.z + 0.4), String(f0 + 1), { kind: 'num', space: 'in', maxDist: 60 }) : null;
      const step = f1 > f0 ? 1 : -1, y0 = f0 * FH;
      for (let f = f0 + step; f !== f1 + step; f += step) {
        sfx('chime');
        if (a && a.parts && a.parts.viser) a.parts.viser.rotation.z = -1.2 + (f / Math.max(1, P.floors - 1)) * 2.4;
        if (B.cur !== P.id) break;
        await F.T.tween(520, k => { if (B.cur !== P.id) return; B.yNow = U.lerp(y0 + (f - step - f0) * FH, y0 + (f - f0) * FH, ease.inOut(k)); p.y = B.yNow; if (a && a.obj) a.obj.position.x = a.x + Math.sin(k * 40) * 0.03; });
        if (lab) lab.set(String(f + 1));
      }
      if (a && a.obj) a.obj.position.x = a.x;
      if (B.cur !== P.id) { if (lab) lab.remove(); B.yNow = null; return false; }      // she left the building during the ride (travel, map)
      B.f = f1; B.visF = f1; B.yNow = null; p.y = f1 * FH;
      updateVis(true);
      if (lab) { const b = liftThing(P, f1); if (b) lab.anchor = V3(b.x, b.y + 4.3, b.z + 0.4); F.T.timeout(() => lab.remove(), 1500); }
      const b = liftThing(P, f1);
      sfx('bell', 1318);
      await slideDoors(b, true, 600);
      await glide(front.x, P.oz + P.lift.lz + 2.2, 380);
      slideDoors(b, false, 500);
      const c = P.at(f1, P.at(f1, Math.floor((p.x - P.ox + 0.5) / PX)) ? Math.floor((p.x - P.ox + 0.5) / PX) : tc.c); if (c) setRoom(c);
      F.emit('floorChanged', f1, P.id);
      // v5 WP-X (#45): at the landing – the floor («Nå er vi i andre etasje.»), or «Rom 9 er der borte!» for a room target
      const E = F.SETS.ETASJE || [];
      if (quiet) { /* the UT trip: just the bell and the doors */ }
      else if (floorRide) { if (E[f1]) say('bld_etasje', { e: E[f1] }); }
      else if (tc.num != null && tc.key !== (c && c.key)) sayRoom('bld_rom_der', tc.num);
    } else {
      await slideDoors(a, true, 350); sfx('bell', 1318); F.T.timeout(() => slideDoors(a, false, 500), 900);
    }
    if (!floorRide && tc.num != null) B.rideTo = { key: tc.key, bld: tc.bld != null ? tc.bld : P.id, t: F.T.now };
  } catch (e) { console.error('[bld] ride', e); B.yNow = null; B.f = f1; B.visF = f1; }
  freeze(false); B.busy = false; transitGen = -1;
  updateVis(true);
  if (tc && !floorRide && !quiet) B.guideTo({ room: tc.key }, { quiet: true });
  return true;
};

/* ================================================================== paths across floors, trail, exits */
B.pathTo = function (t) {
  const P = B.curPlan(); if (!P || !t) return [];
  const p = F.Player.pos, f = t.f != null ? t.f : B.f;
  if (f === B.f) return [{ f, pts: impl.findPath(p.x, p.z, t.x, t.z, 0.35), to: { x: t.x, z: t.z, f } }];
  // another floor: to the stair mouth (or the lift) first
  const S = P.stair, canS = S && f >= S.fMin && f <= S.fMax && B.f >= S.fMin && B.f <= S.fMax;
  const lf = P.lift && B.liftFront();
  let via = null, kind = null;
  if (canS && Math.abs(f - B.f) === 1) { via = B.stairMouth(); kind = 'stair'; }
  else if (lf) { via = lf; kind = 'lift'; }
  else if (canS) { via = B.stairMouth(); kind = 'stair'; }
  if (!via) return [];
  return [{ f: B.f, pts: impl.findPath(p.x, p.z, via.x, via.z, 0.35), to: via, via: kind, hint: kind === 'stair' ? (f > B.f ? 'bld_opp' : 'bld_ned') : (f > B.f ? 'bld_heis_opp' : 'bld_heis_ned') }];
};
B.trail = function (pts, o) {
  o = o || {};
  const p = F.Player.pos, poly = [[p.x, p.z]].concat(pts || []), dots = [];
  for (let i = 1; i < poly.length; i++) {
    const [ax, az] = poly[i - 1], [bx, bz] = poly[i], seg = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.round(seg / 1.3));
    for (let j = 1; j <= k; j++) dots.push([ax + (bx - ax) * j / k, az + (bz - az) * j / k]);
  }
  const sp = F.Space.cur, b = B.cur, f = B.f, list = dots.slice(0, 50);
  [0, 1].forEach(wave => list.forEach(([x, z], i) => F.T.timeout(() => {
    if (F.Space.cur !== sp || B.cur !== b || B.f !== f) return;
    if (F.FX && F.FX.burst) F.FX.burst(V3(x, f * FH + 0.35, z), { n: wave ? 7 : 11, colors: [0xffe066, 0xffffff, 0xff9ccf], speed: 0.55, up: 1.3, life: 2.6, size: 0.16, gravity: 0.3 });
    if (i % 4 === 0 && !wave) sfx('pling', i % 8);
  }, (o.delay || 0) + wave * 2600 + i * 70)));
  return list.length;
};
// guide her (never teleports): a glitter trail to the room, or to the stairs / lift with Puff's hint
B.guideTo = function (t, o) {
  o = o || {};
  const P = B.curPlan(); if (!P) return false;
  let tgt = t;
  if (t && (t.room != null)) { const c = cellOf(P, t.room); if (!c) return false; tgt = { x: c.center.x, z: P.oz + 6.2, f: c.f }; }
  else if (typeof t === 'number' || typeof t === 'string') { const c = cellOf(P, t); if (!c) return false; tgt = { x: c.center.x, z: P.oz + 6.2, f: c.f }; }
  const legs = B.pathTo(tgt); if (!legs.length) return false;
  const L = legs[0];
  B.trail(L.pts);
  if (L.hint && !o.quiet) say(L.hint);
  return L;
};
B.exitPos = function () {
  const P = B.curPlan(); if (!P || F.Space.cur !== 'in') return null;
  const here = P.exits.filter(e => { const c = cellOf(P, e.cell); return c && c.f === B.f; });
  const p = F.Player.pos;
  if (here.length) { let best = null, bd = Infinity; for (const e of here) { const c = cellOf(P, e.cell), x = c.x0 + e.lx, z = P.oz + e.lz + MAT_DZ, d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = { x, z, f: B.f, exit: e.id }; } } return best; }
  const e = P.exits[0]; if (!e) return null;
  const ec = cellOf(P, e.cell);
  const L = B.pathTo({ x: ec.x0 + e.lx, z: P.oz + e.lz + MAT_DZ, f: ec.f })[0];
  return L ? Object.assign({ via: L.via }, L.to) : null;
};
B.openMap = function (o) { if (F.BldMap && F.BldMap.open) return F.BldMap.open(o); return null; };
B.closeMap = function () { if (F.BldMap && F.BldMap.close) F.BldMap.close(); };

/* ================================================================== save position */
B.pos = function () {
  const p = F.Player.pos;
  if (F.Space.cur === 'in' && B.cur) return { space: 'in', b: B.cur, f: B.f, x: +p.x.toFixed(1), z: +p.z.toFixed(1), room: B.roomKey };
  return { space: 'out', x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
};
const LEGACY_TARN = { fetarn: 0, stjernetarn: 1 };
B.restore = async function (pos) {
  if (!pos || pos.space !== 'in') return false;
  try {
    if (pos.b) {
      const P = await ensurePlan(pos.b);
      if (!P) { const d = F.Realm && F.Realm.door && /^rk_/.test(pos.b) ? F.Realm.door(pos.b.slice(3)) : null; if (d) { if (F.Space.cur !== 'out') F.Space.set('out', { x: d.x, z: d.z + 1.8 }); else F.Player.teleport(d.x, d.z + 1.8); } return false; }
      if (pos.x != null) await B.enter(P.id, { at: { f: pos.f | 0, x: pos.x, z: pos.z, free: true }, instant: true });
      else await B.enter(P.id, { at: pos.room ? { room: pos.room } : undefined, instant: true });
      return true;
    }
    const room = pos.room || 'fetarn';
    if (room in LEGACY_TARN && B.plans.tarn) {
      const T = B.plans.tarn;
      if (room === 'fetarn') await B.enter('tarn', { at: T.bed ? 'bed' : { room: T.cells.find(c => c.f === 0).key }, instant: true });
      else { const c = T.cells.find(q => q.f === 1) || T.cells[0]; await B.enter('tarn', { at: { room: c.key }, instant: true }); }
      return true;
    }
    const S = B.plans.slott, c = S && cellOf(S, room);
    if (c) { await B.enter('slott', { at: { room: c.key }, instant: true }); return true; }
  } catch (e) { console.error('[bld] restore', e); }
  return false;
};

/* ================================================================== doors: outdoor 'b_dor' (data {bld, exit}) and indoor 'b_portal' */
B.addDoor = function (bld, x, z, o) {
  o = o || {};
  return F.Things.spawn('b_dor', x, z, { id: o.id || ('b_dor_' + bld), ry: o.ry || 0, data: Object.assign({ bld, exit: o.exit || null }, o.data || {}) });
};
F.Things.def('b_dor', {
  name: 'døra', radius: 0.8, solid: false, reach: 2.4, hoverable: true, noNet: true,
  build(th) {
    const g = new THREE.Group();
    if (has('b_dor')) g.add(F.VOX.make('b_dor', th.data.opts || {}));
    const pick = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 0.9), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, 2.1, -0.95); g.add(pick);
    return g;
  },
  init(th) { th.labelY = 4.6; },
  async press(th) { if (F.Space.cur === 'out' && !B.busy) await B.enter(th.data.bld, { exit: th.data.exit, door: th }); },
});
// v3 §4.2/4.3: the indoor exit is a low UT mat between two lantern posts; its tap box covers the mat only (2.6 × 1.04 m, 0.48 m tall).
// A tap on the mat, on the UT sign or on the HUD «UT» button = she flies onto the mat and leaves (glide + dip). Walking never leaves.
const pop = th => { try { if (th.obj && F.FX && F.FX.pop) F.FX.pop(th.obj); } catch (e) { /* cosmetic */ } };
const lockBox = (th, lb) => { th._lb = lb; try { Object.defineProperty(th, 'bboxDirty', { get: () => false, set: () => {}, configurable: true }); } catch (e) { /* plain flag */ } };
// The mat is not a plain pressable (hoverable:false): its taps go through exitHook below, which also ignores taps right around the HUD
// wand (the mat can sit just above Staven: a near-miss on the wand must never take her out, v3 §4.8). F.Things.press / goPress still work.
F.Things.def('b_portal', {
  name: 'utgangen', radius: 0.6, solid: false, reach: 0.9, space: 'in', hoverable: false, noNet: true,
  build(th) {
    const g = new THREE.Group();
    if (has('b_portal')) { const m = F.VOX.make('b_portal', {}); g.add(m); th.parts = m.userData.parts || {}; }
    return g;
  },
  // 2.6 × 1.1 m over the mat, ~0.5 m tall (the c_gelender pattern); used by exitHook
  init(th) { lockBox(th, { c: V3(0, 0.12, 0), hx: 1.3, hy: 0.24, hxx: 1.3, hzz: 0.52 }); },
  async press(th) { if (F.Space.cur === 'in' && !B.busy) await B.leave({ exit: th.data.exit }); },
});
// she flies onto the mat of that exit (any distance on this floor), then leaves; another floor: the whole trip out (B.flyOut)
function goOut(exitId) {
  const P = B.curPlan(); if (!P || F.Space.cur !== 'in' || B.busy || F.Player.frozen) return false;
  const e = (exitId && P.exits.find(q => q.id === exitId)) || nearestExit(P) || P.exits[0];
  const c = e && cellOf(P, e.cell);
  if (!e || !e.thing || !c) { B.guideOut(); return false; }
  if (c.f !== B.f) { B.flyOut(e.id); return true; }
  F.Player.goPress(e.thing);
  return true;
}
B.goOut = goOut;
/* natural audit D9 (#60): UT on another floor is the same as UT on the exit floor – she goes OUT. She flies to the stairs / lift (the
   glitter trail runs ahead of her), takes it down without Puff's «Ned trappa!» / lift / floor lines, crosses to the mat and leaves.
   A little faster than a walk (a fairy on her way out). A tap somewhere else on a walking leg ends the trip (her new goal wins); a
   second UT tap starts it again from where she is. Resolves true once she is outdoors. B.flying while it runs. */
const FLY_MUL = 1.6;
let flyTok = 0;
B.flying = false;
B.flyOut = async function (exitId) {
  const P = B.curPlan(); if (!P || F.Space.cur !== 'in' || B.busy || F.Player.frozen) return false;
  const tok = ++flyTok, Pl = F.Player, m0 = Pl.speedMul === FLY_MUL ? 1 : Pl.speedMul;
  const mine = () => tok === flyTok && B.cur === P.id && F.Space.cur === 'in';
  B.flying = true; Pl.speedMul = FLY_MUL;
  try {
    for (let hop = 0; hop <= P.floors && mine(); hop++) {
      const e = (exitId && P.exits.find(q => q.id === exitId)) || nearestExit(P) || P.exits[0], c = e && cellOf(P, e.cell);
      if (!e || !c) return false;
      const tgt = { x: c.x0 + e.lx, z: P.oz + e.lz + MAT_DZ, f: c.f };
      const L = B.pathTo(tgt)[0];
      if (L && L.pts) B.trail(L.pts);
      if (c.f === B.f) {
        const mat = e.thing; if (!mat) return false;
        F.T.timeout(() => { if (mine() && B.f === c.f && F.FX && F.FX.burst) F.FX.burst(V3(mat.x, mat.y + 0.5, mat.z), { n: 22, colors: [0xffe066, 0xffffff, 0x8ce99a], speed: 0.9, up: 1.8, life: 1.8, size: 0.15, gravity: 0.2 }); }, 300);
        const ang = Math.atan2(Pl.pos.x - mat.x, Pl.pos.z - mat.z), r = Math.max(0.2, (mat.def.reach != null ? mat.def.reach : 0.9) - 0.4);
        if (Math.hypot(Pl.pos.x - mat.x, Pl.pos.z - mat.z) > r + 0.3) {
          const ok = await Pl.goTo(mat.x + Math.sin(ang) * r, mat.z + Math.cos(ang) * r, { ignore: mat, stopDist: 0.3 });
          if (!ok || !mine()) return false;
        }
        Pl.heading = Math.atan2(mat.x - Pl.pos.x, mat.z - Pl.pos.z);
        await F.Things.run(mat);                                   // = a tap on the mat: B.leave (glide, dip, out)
        return F.Space.cur === 'out';
      }
      if (!L || !L.via) { if (!hop) B.guideOut({ quiet: true }); return false; }     // no way down from here: at least the glitter way
      const ok = L.via === 'stair' ? await B.stairs(c.f < B.f ? 'down' : 'up', { quiet: true }) : await B.ride({ f: c.f }, { quiet: true });
      if (!ok) return false;
    }
    return false;
  } catch (err) { console.error('[bld] flyOut', err); return false; }
  finally { if (tok === flyTok) { B.flying = false; if (Pl.speedMul === FLY_MUL) Pl.speedMul = m0; } }
};
F.Things.def('b_utskilt', {
  name: 'utskiltet', radius: 0.3, solid: false, reach: 99, space: 'in', hoverable: true, noNet: true,
  build(th) {
    const g = new THREE.Group();
    if (has('b_utskilt')) { const m = F.VOX.make('b_utskilt', {}); m.position.y = -2.75; g.add(m); }   // obj sits at the board (the tap anchor is on the board, not the post foot)
    return g;
  },
  init(th) { lockBox(th, { c: V3(0, 0.44, 0.05), hx: 0.69, hy: 0.44, hxx: 0.69, hzz: 0.12 }); },
  press(th) { pop(th); goOut(th.data && th.data.exit); },            // never speaks the word on the sign (v3 §4.3)
});
// small UT ←/→/↓ signs (v3 §4.6): a tap draws the glitter way out (no speech: she reads the sign herself)
F.Things.def('b_utpil', {
  name: 'utpila', radius: 0.3, solid: false, reach: 99, space: 'in', hoverable: true, noNet: true,
  build(th) {
    const g = new THREE.Group(), d = th.data || {};
    if (has('b_utpil')) { const m = F.VOX.make('b_utpil', { dir: d.dir, post: d.post || 0 }); m.position.y = -(d.post || 0) / 12; g.add(m); }
    return g;
  },
  init(th) { lockBox(th, { c: V3(0, 0.29, 0.05), hx: 0.75, hy: 0.36, hxx: 0.75, hzz: 0.25 }); },
  press(th) { pop(th); sfx('pling', 3); B.guideOut({ quiet: true }); },
});
// pick hook for the exit mat (and the UT sign when a BIG box, e.g. the Hallen runner's, lies in front of it – F.Input asks the hooks
// first then): a ray through the mat / sign box of this floor answers as that exit thing (same action as a direct tap). Taps within
// 36 px of the visible HUD wand's rim never count for the mat.
function nearWand(sx, sy) {
  const w = F.HUD && F.HUD.wand; if (!w || !w.isConnected) return false;
  const bc = document.body.classList; if (bc.contains('hud-task') || bc.contains('tray-open') || bc.contains('wand-open') || bc.contains('overview-on')) return false;
  const r = w.getBoundingClientRect(); if (!r.width) return false;
  return Math.hypot(sx - (r.left + r.width / 2), sy - (r.top + r.height / 2)) < r.width / 2 + 36;
}
const exRay = new THREE.Raycaster(), exNdc = new THREE.Vector2(), exM = new THREE.Matrix4(), exR = new THREE.Ray(), exB = new THREE.Box3(), exP = V3(0, 0, 0);
function exitHook(sx, sy) {
  if (F.Space.cur !== 'in' || B.busy) return null;
  const P = B.curPlan(); if (!P) return null;
  const r = F.R.renderer.domElement.getBoundingClientRect();
  exNdc.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1); exRay.setFromCamera(exNdc, F.R.camera);
  let best = null, bd = Infinity;
  const wandNear = nearWand(sx, sy);
  for (const e of P.exits) for (const th of [e.thing, e.sign]) {
    if (!th || !th.obj || !th._lb || th.hidden || !th.obj.visible) continue;
    if (th === e.thing && wandNear) continue;
    const l = th._lb, o = th.obj;
    exM.makeRotationY(-o.rotation.y); exR.origin.copy(exRay.ray.origin).sub(o.position).applyMatrix4(exM); exR.direction.copy(exRay.ray.direction).applyMatrix4(exM);
    exB.min.set(l.c.x - l.hxx, l.c.y - l.hy, l.c.z - l.hzz); exB.max.set(l.c.x + l.hxx, l.c.y + l.hy, l.c.z + l.hzz);
    const p = exR.intersectBox(exB, exP); if (!p) continue;
    const d = p.distanceTo(exR.origin); if (d < bd) { bd = d; best = th; }
  }
  if (!best) return null;
  const th = best;
  return { kind: 'exit', exitThing: th, point: V3(th.x, th.y, th.z), press: () => { if (F.Input.flash) F.Input.flash(th); F.Player.goPress(th); } };
}
if (F.Input && F.Input.pickHooks) F.Input.pickHooks.push(exitHook);
let doorList = [], doorAcc = 9, lastP = null;
// a door only takes her in when she moves INTO it (a walk along the keep front never enters by accident). Indoors nothing is walked:
// the indoor walk-into-zone exit is gone (v3 §4.1) – leaving is always a tap.
function doorTick(dt) {
  const p = F.Player.pos, prev = lastP; lastP = { x: p.x, z: p.z, sp: F.Space.cur };
  if (B.busy || F.Player.frozen) return;
  const moved = prev && prev.sp === F.Space.cur ? { x: p.x - prev.x, z: p.z - prev.z } : { x: 0, z: 0 };
  if (F.Space.cur === 'out') {
    doorAcc += dt; if (doorAcc > 1) { doorAcc = 0; doorList = F.Things.list.filter(t => t.type === 'b_dor' && t.space === 'out'); }
    let inside = null, inward = false;
    for (const d of doorList) {
      const dx = p.x - d.x, dz = p.z - d.z; if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue;
      const ry = d.ry || 0, c = Math.cos(ry), sn = Math.sin(ry), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      if (Math.abs(lx) <= 1.2 && lz >= -1.4 && lz <= 0.9) { inside = d; inward = (moved.x * sn + moved.z * c) < -0.004; break; }
    }
    if (!inside) { doorArm = null; return; }
    if (doorArm && doorArm.bld === inside.data.bld) return;          // just came out of this door: walk away first
    if (!inward) return;
    doorArm = { bld: inside.data.bld };
    B.enter(inside.data.bld, { exit: inside.data.exit, door: inside });
  }
}

/* ================================================================== the way out (v3 §4.5, §4.6, §4.9, §3 guideOut) */
// which way leads out of cell c: {kind:'exit'} (the mat is in this room), {kind:'door', side:'l'|'r'} (the side doorway toward it),
// {kind:'down', via:'stair'|'lift'} (this room holds the stairs / lift that lead down toward the exit floor), or null
function exitCell(P) { const e = P.exits[0]; return e ? cellOf(P, e.cell) : null; }
function viaOn(P, f, ef) {
  const S = P.stair, canS = S && f >= S.fMin && f <= S.fMax && ef >= S.fMin && ef <= S.fMax;
  const lc = P.lift ? P.lift.cells.map(k => cellOf(P, k)).find(q => q && q.f === f) : null;
  if (canS && Math.abs(f - ef) === 1) return { via: 'stair', col: S.col };
  if (lc) return { via: 'lift', col: lc.c };
  if (canS) return { via: 'stair', col: S.col };
  return null;
}
function wayDir(P, c) {
  const ec = exitCell(P); if (!ec || !c) return null;
  if (c.f === ec.f) {
    if (P.exits.some(e => e.cell === c.key)) return { kind: 'exit' };
    if (ec.c < c.c && P.at(c.f, c.c - 1)) return { kind: 'door', side: 'l' };
    if (ec.c > c.c && P.at(c.f, c.c + 1)) return { kind: 'door', side: 'r' };
    return null;
  }
  const v = viaOn(P, c.f, ec.f); if (!v) return null;
  if (v.col === c.c) return { kind: 'down', via: v.via };
  if (v.col < c.c && P.at(c.f, c.c - 1)) return { kind: 'door', side: 'l' };
  if (v.col > c.c && P.at(c.f, c.c + 1)) return { kind: 'door', side: 'r' };
  return null;
}
B.wayDir = (planId, key) => { const P = B.plans[planId]; return P ? wayDir(P, cellOf(P, key)) : null; };
// world point of the way out of cell c (doorway centre / stair mouth / lift front / mat)
function wayPoint(P, c) {
  const w = wayDir(P, c); if (!w) return null;
  const y = c.f * FH;
  if (w.kind === 'exit') { const e = P.exits.find(q => q.cell === c.key); return { x: c.x0 + e.lx, y, z: P.oz + e.lz + MAT_DZ, w }; }
  if (w.kind === 'door') return { x: c.x0 + (w.side === 'l' ? 0.2 : 13.8), y, z: P.oz + 5, w };
  if (w.via === 'stair' && P.stair) return { x: P.stair.x, y, z: P.stair.z + 1.8, w };
  if (P.lift) return { x: c.x0 + P.lift.lx, y, z: P.oz + P.lift.lz + 1.9, w };
  return null;
}
B.wayPoint = () => { const P = B.curPlan(); if (!P || F.Space.cur !== 'in') return null; const c = P.at(B.f, Math.floor((F.Player.pos.x - P.ox + 0.5) / PX)); return c ? wayPoint(P, c) : null; };
// the small UT signs: over the doorway toward the exit; «UT ↓» at the stairs / lift on upper floors (never in the exit room itself)
function wayoutSigns(P) {
  if (!F.Things.defs.b_utpil) return;
  const ec = exitCell(P); if (!ec) return;
  for (const c of P.cells) {
    const w = wayDir(P, c); if (!w || w.kind === 'exit') continue;
    const id = k => 'b_utpil_' + P.id + '_' + c.key + '_' + k;
    if (w.kind === 'door') B.spawnIn(P.id, c.key, 'b_utpil', w.side === 'l' ? 1.25 : 12.75, 5.0, { id: id(w.side), dy: 3.95, data: { dir: w.side } });
    if (c.f === ec.f) continue;
    // upper floors: «UT ↓» at every way down this room holds (stairs and/or lift)
    const S = P.stair;
    if (S && c.c === S.col && c.f > S.fMin && c.f <= S.fMax) { const sx = S.cx > 7 ? S.cx - 2.3 : S.cx + 2.3; B.spawnIn(P.id, c.key, 'b_utpil', sx, S.cz + 0.7, { id: id('trapp'), dy: 26 / 12, data: { dir: 'd', post: 26 } }); }
    if (P.lift && P.lift.cells.includes(c.key)) B.spawnIn(P.id, c.key, 'b_utpil', P.lift.lx - 2.0, P.lift.lz + 0.05, { id: id('heis'), dy: 2.7, data: { dir: 'd' } });
  }
}
// F.Bld.guideOut(o) (§3, WP1): a glitter trail from her position to the exit mat (or first to the stairs / lift) + «Se etter ordet ut!»
// (or Puff's bld_ned / bld_heis_ned on another floor). o.quiet: no speech. false when she is not inside a building.
B.guideOut = function (o) {
  o = o || {};
  const P = B.curPlan(); if (!P || F.Space.cur !== 'in') return false;
  const e = nearestExit(P) || P.exits[0], ec = e && cellOf(P, e.cell); if (!ec) return false;
  const tgt = { x: ec.x0 + e.lx, z: P.oz + e.lz + MAT_DZ, f: ec.f };
  const L = B.pathTo(tgt)[0];
  if (L) B.trail(L.pts); else B.trail([[tgt.x, tgt.z]]);
  const mat = e.thing;
  if (mat && ec.f === B.f && F.FX && F.FX.burst) F.T.timeout(() => { if (B.cur === P.id && B.f === ec.f) F.FX.burst(V3(mat.x, mat.y + 0.5, mat.z), { n: 22, colors: [0xffe066, 0xffffff, 0x8ce99a], speed: 0.9, up: 1.8, life: 1.8, size: 0.15, gravity: 0.2 }); }, 600);
  if (!o.quiet) { if (L && L.hint) say(L.hint); else if (F.TPL && F.TPL.has && F.TPL.has('bld_ut_finn')) say('bld_ut_finn'); }
  idleIn = 0;
  return L || true;
};

/* ------------------------------------------------------------------ idle help (v3 §4.9): ~20 s without a new room or a task → the
   way out of THIS room glows (the doorway toward the exit / the stairs or lift down / the mat): three pulses, then a 20 s rest.
   natural 11.10. (D8 class): «idle» means hands off – any tap, key or wheel and anything she does (a press, a walk, Staven, the book,
   the album) starts the 20 s again, so the way out never glows while she plays in a room */
let idleIn = 0, glowAcc = 0, glowN = 0;
const progress = () => { idleIn = 0; glowN = 0; };
F.on('roomEntered', progress); F.on('floorChanged', progress); F.on('bldEntered', progress); F.on('taskStart', progress); F.on('taskEnd', progress);
['press', 'goTo', 'cast', 'wandOpen', 'bookOpened', 'albumOpened', 'mailboxOpen'].forEach(ev => F.on(ev, progress));
try { addEventListener('pointerdown', progress, true); addEventListener('keydown', progress, true); addEventListener('wheel', progress, { capture: true, passive: true }); } catch (e) { /* no DOM */ }
const IDLE_S = 20;
function wayBurst() {
  const wp = B.wayPoint();
  if (wp && F.FX && F.FX.burst) F.FX.burst(V3(wp.x, wp.y + (wp.w.kind === 'door' ? 1.6 : 0.6), wp.z), { n: 16, colors: [0xffe066, 0xffffff, 0x8ce99a], speed: 0.8, up: 1.6, life: 1.6, size: 0.14, gravity: 0.2 });
  return !!wp;
}
// F.Bld.idleHelpOff: () → true while another module owns the hint in this building (tower.js: the morning in Fetårnet, natural D8)
B.idleHelpOff = null;
function idleGlow(dt) {
  if (F.Space.cur !== 'in' || !B.cur || B.busy || (F.Task && F.Task.current) || (F.UI && F.UI.isOpen && F.UI.isOpen())) { if (F.Space.cur !== 'in') idleIn = 0; return; }
  if (typeof B.idleHelpOff === 'function' && B.idleHelpOff()) { idleIn = 0; glowN = 0; return; }
  idleIn += dt; if (idleIn < IDLE_S) return;
  glowAcc += dt; if (glowAcc < 1.6) return; glowAcc = 0;
  wayBurst();
  if (++glowN >= 3) { glowN = 0; idleIn = 0; }
}
// n silent pulses (1.6 s apart) at the way out of the room she is in; false when there is no way point here
B.glowWay = function (n) {
  if (F.Space.cur !== 'in' || !B.cur || !B.wayPoint()) return false;
  const b = B.cur, f = B.f;
  for (let i = 0; i < (n || 3); i++) F.T.timeout(() => { if (F.Space.cur === 'in' && B.cur === b && B.f === f) wayBurst(); }, i * 1600);
  return true;
};
B.idleSec = () => idleIn;

/* ------------------------------------------------------------------ the HUD «UT» button (v3 §4.5): bottom-left above the gear, indoors only
   (hidden in tasks, panels, maps, the spell bar). Any floor: the whole trip out (B.flyOut: the trail ahead of her, stairs / lift down
   without a line, onto the mat, out – natural D9). Its own DOM element; css/doors.css. */
const UT_ICON = '<svg viewBox="0 0 40 48" class="ut-door"><path d="M6 46 V14 A14 14 0 0 1 34 14 V46 Z" fill="#c0392b" stroke="#e0a91e" stroke-width="3"/><path d="M11 46 V16 A9 9 0 0 1 29 16 V46 Z" fill="#fff3d6"/><path d="M20 22 V38 M13 32 L20 39 L27 32" stroke="#2f9e44" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let utEl = null, utAcc = 0;
function ensureCss() {
  if (document.querySelector('link[href$="doors.css"]')) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/doors.css'; document.head.appendChild(l);   // until build_html lists it
}
function utButton() {
  if (utEl && utEl.isConnected) return utEl;
  ensureCss();
  utEl = document.createElement('div'); utEl.id = 'bldUt'; utEl.className = 'bld-ut';
  utEl.setAttribute('role', 'button'); utEl.setAttribute('aria-label', 'Ut');
  utEl.innerHTML = UT_ICON + '<span class="ut-word">UT</span>';
  utEl.addEventListener('pointerdown', e => e.stopPropagation());
  utEl.addEventListener('click', e => { e.stopPropagation(); B.utPress(); });
  document.body.appendChild(utEl);
  return utEl;
}
// natural round 2: UT tapped while she is on the stairs or in the lift (a tap that came a moment too late to stop the climb, or she
// changed her mind on the way up) is not lost – she goes out as soon as she steps off. Any new goal or press forgets it.
let utLater = false;
F.on('goTo', () => { utLater = false; }); F.on('press', () => { utLater = false; });
F.on('tick', () => {
  if (!utLater || B.busy || F.Player.frozen) return;
  utLater = false;
  if (F.Space.cur === 'in') B.utPress();
});
B.utPress = function () {
  if (!utShown()) return false;
  if (B.busy && transitGen === B.gen) { if (!utLater) sfx('click'); utLater = true; return true; }
  if (B.busy || F.Player.frozen) return false;
  sfx('click');
  const P = B.curPlan(); if (!P) return false;
  const e = nearestExit(P), c = e && cellOf(P, e.cell);
  if (e && c && e.thing) { B.flyOut(e.id); return true; }        // any floor: the trail runs ahead, she flies to the mat (and down first)
  return !!B.guideOut();
};
function utShown() {
  if (F.Space.cur !== 'in' || !B.cur || !B.curPlan() || !(B.curPlan().exits || []).length) return false;
  if (F.Task && F.Task.current) return false;
  const bc = document.body.classList;
  if (bc.contains('hud-task') || bc.contains('tray-open') || bc.contains('wand-open') || bc.contains('overview-on') || bc.contains('map-open') || bc.contains('album-open') || bc.contains('screen-on') || bc.contains('parent-open')) return false;
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return false;
  if (F.BldMap && F.BldMap.isOpen) return false;
  if (F.Shell && F.Shell.screen) return false;
  if (F.HUD && (F.HUD.hidden || (F.HUD.root && F.HUD.root.classList.contains('hidden')))) return false;
  if (F.Travel && F.Travel.busy) return false;
  if (F.R.cam && F.R.cam.look) return false;
  return true;
}
B.utShown = utShown;
function utTick(dt) {
  utAcc += dt; if (utAcc < 0.12) return; utAcc = 0;
  const on = utShown();
  if (!on && !utEl) return;
  const el = utButton();
  if (el.classList.contains('on') !== on) el.classList.toggle('on', on);
  // a slow glow while the idle help runs (the button is also «the way out»)
  el.classList.toggle('hint', on && idleIn >= IDLE_S);
}

/* ------------------------------------------------------------------ reachability (v3 §4.7 gate + map greying): flood fill on the 0.5 m
   grid from the exit mat (and from every stair mouth / lift front, which connect the floors). B.reach(planId) → {cellKey: {ok, n, total}} */
B.reach = function (planId) {
  const P = B.plans[planId]; if (!P) return null;
  if (!P.built) build(P);
  const cur0 = B.cur, f0 = B.f, out = {};
  const cell = 0.5, minX = P.x0 - 1, minZ = P.oz - 0.5, w = Math.ceil((P.x1 - P.x0 + 2) / cell) + 1, h = 23;
  try {
    B.cur = P.id;
    for (let f = 0; f < P.floors; f++) {
      B.f = f;
      const free = new Int8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) free[j * w + i] = impl.blocked(minX + i * cell, minZ + j * cell, 0.35) ? 0 : 1;
      const seen = new Uint8Array(w * h), q = [];
      const seed = (x, z) => { const i = Math.round((x - minX) / cell), j = Math.round((z - minZ) / cell); for (let r = 0; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const k = (j + dj) * w + (i + di); if (i + di >= 0 && i + di < w && j + dj >= 0 && j + dj < h && free[k] && !seen[k]) { seen[k] = 1; q.push(k); return; } } };
      for (const e of P.exits) { const c = cellOf(P, e.cell); if (c && c.f === f) seed(c.x0 + e.lx, P.oz + e.lz + MAT_DZ - 0.3); }
      if (P.stair && f >= P.stair.fMin && f <= P.stair.fMax) seed(P.stair.x, P.stair.z + 2.0);
      if (P.lift) for (const k of P.lift.cells) { const c = cellOf(P, k); if (c && c.f === f) seed(c.x0 + P.lift.lx, P.oz + P.lift.lz + 1.9); }
      while (q.length) {
        const k = q.pop(), i = k % w, j = (k - i) / w;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue; const nk = nj * w + ni; if (free[nk] && !seen[nk]) { seen[nk] = 1; q.push(nk); } }
      }
      for (const c of P.cells) {
        if (c.f !== f) continue;
        let n = 0, tot = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const x = minX + i * cell, z = minZ + j * cell; if (x < c.x0 + 1 || x > c.x0 + 13 || z < P.oz + 1 || z > P.oz + 9) continue; const k = j * w + i; if (!free[k]) continue; tot++; if (seen[k]) n++; }
        out[c.key] = { ok: n >= Math.max(8, tot * 0.5), n, total: tot, f };
      }
    }
  } finally { B.cur = cur0; B.f = f0; }
  return out;
};

/* ================================================================== per-frame */
F.on('tick', (dt) => {
  if (F.Space.cur === 'in' && B.cur) {
    const P = B.curPlan();
    if (!B.busy) {
      const p = F.Player.pos, c = P.at(B.f, Math.floor((p.x - P.ox + 0.5) / PX));
      if (c && c.key !== B.roomKey) setRoom(c);
    }
    camFollow();
    keyStairs(dt);
    visAcc += dt; updateVis(visAcc > 0.5); if (visAcc > 0.5) visAcc = 0;
  }
  doorTick(dt);
  idleGlow(dt);
  utTick(dt);
});
// someone switched to 'out' while she was still inside (F.Space.set by travel / debug / old code): same clean reset as exitNow
F.on('spaceChanged', cur => {
  if (cur !== 'in' && B.cur) { const id = B.cur; resetState(); doorArm = { bld: id, t: F.T.now }; F.emit('bldLeft', id); }
  else if (cur !== 'in') { B.roomKey = null; B.yNow = null; }
  updateVis(true);
});
F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.bld = (id, f) => { const P = B.plans[id || 'slott']; if (!P) return null; const c = P.cells.find(q => q.f === (f | 0)) || P.cells[0]; B.enter(P.id, { at: { room: c.key }, instant: true }); F.debug.frames(3); return { b: B.cur, f: B.f, room: B.roomKey }; };
});
})();
