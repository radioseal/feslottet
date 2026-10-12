/* Feslottet – the home castle (WP1 BLD, DESIGN2 §2.6, §2.9–2.10). The interior is plan 'slott' of the F.Bld engine (buildings.js):
   three floors of dollhouse rooms, the spiral stairs and the lift in Hallen (col 2), one exit portal at the Hallen front.
   Outside: the drawbridge is always down, the gatehouse leads into the courtyard, the keep door (b_dor_slott) leads in.

   F.Castle (backward-compatible shims over F.Bld; DESIGN2 §2.2):
     rooms {id: cell}  room(key) roomByNum(n) cellAt(f, c) roomAt(x, y?) npcSpot(key, i, avoid) addBlock(f, x0, z0, x1, z1) floorAt()
     cur (room id while inside) floor (F.Bld.f) inside   enter(key) (sync, short white dip-out)   exit() (sync)
     walkIn() (walks her to the keep door) walkOut() (= F.Bld.leave)   goRoomByNumber(n) (glitter trail, never a teleport)
     overview(on) (= the indoor map)   exitPos() → {x, z, f}   gatePos()   lift {open(o) → Promise<n|null>, buttons, mark, highlight, travel(n)}
     bridge.tap()   setFlags(realmIds)   showGift(realmId)   giftSpot(realmId) → {space, bld?, f?, x, z, y}   towers {tall, les, skriv}
     kit (helpers for things files; kit.spawnIn(roomId, type, lx, lz, o))
   Room ids: hall kjokken spisesal tronsal ballsal bibliotek musikkrom heis1 skattkammer ordmuseum mia soverom heis2 bad garderobe
   (+ 'fetarn' / 'stjernetarn' from the tower plan 'tarn'). */
(function () {
'use strict';
const F = window.F, U = F.U, B = F.Bld;
const PX = 15, FH = 6, CW = 14, CD = 10, CH = 5.5;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = { out: k => 1 - Math.pow(1 - k, 3), inOut: k => k * k * (3 - 2 * k), back: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const VOX = F.VOX;
const has = id => VOX.has(id);
function vdef(id, d) { if (!has(id)) VOX.def(id, d); }
const sfx = (n, ...a) => { try { if (F.sfx && F.sfx[n]) F.sfx[n](...a); } catch (e) { /* optional */ } };

/* ================================================================== plan 'slott' (legacy grid: cell (c, f) x ∈ [15c, 15c+14], y = 6f) */
/* v5 WP-X (DESIGN4 §8 natural numbers, logic #46): the plates count the rooms naturally floor by floor – 1. etasje 1–4, 2. etasje 5–8,
   3. etasje 9–12 (left to right; the hall and the lift landings have no number). legacy = the v1 number 10–20: NUMERIC keys keep
   meaning the legacy number everywhere (F.Castle.room(18), F.Bld.room('slott', 20), CAST posts {room: 11}, Q2 obj.room) so callers
   in other files keep working; the shown/spoken number is c.num – look a room up by its plate with F.Castle.roomByPlate(n), and say
   F.Castle.room('bad').num, never a literal. */
const ROOM_LIST = [
  { id: 'kjokken', num: 1, legacy: 10, name: 'Kjøkkenet', floor: 0, col: 0 },
  { id: 'spisesal', num: 2, legacy: 11, name: 'Spisesalen', floor: 0, col: 1 },
  { id: 'hall', num: null, name: 'Hallen', floor: 0, col: 2 },
  { id: 'tronsal', num: 3, legacy: 12, name: 'Tronsalen', floor: 0, col: 3 },
  { id: 'ballsal', num: 4, legacy: 13, name: 'Ballsalen', floor: 0, col: 4 },
  { id: 'bibliotek', num: 5, legacy: 14, name: 'Biblioteket', floor: 1, col: 0 },
  { id: 'musikkrom', num: 6, legacy: 15, name: 'Musikkrommet', floor: 1, col: 1 },
  { id: 'heis1', num: null, name: 'Heisen 2. etasje', floor: 1, col: 2 },
  { id: 'skattkammer', num: 7, legacy: 16, name: 'Skattkammeret', floor: 1, col: 3 },
  { id: 'ordmuseum', num: 8, legacy: 17, name: 'Ordmuseet', floor: 1, col: 4 },
  { id: 'mia', num: 9, legacy: 18, name: 'Prinsessens rom', floor: 2, col: 0 },
  { id: 'soverom', num: 10, legacy: 19, name: 'Kongeparets soverom', floor: 2, col: 1 },
  { id: 'heis2', num: null, name: 'Heisen 3. etasje', floor: 2, col: 2 },
  { id: 'bad', num: 11, legacy: 20, name: 'Badet', floor: 2, col: 3 },
  { id: 'garderobe', num: 12, name: 'Garderoben', floor: 2, col: 4 },
];
const ALIAS = {
  hallen: 'hall', inngang: 'hall', kjokkenet: 'kjokken', 'kjøkken': 'kjokken', 'kjøkkenet': 'kjokken', spisesalen: 'spisesal', tronsalen: 'tronsal', trone: 'tronsal',
  ballsalen: 'ballsal', biblioteket: 'bibliotek', musikkrommet: 'musikkrom', musikk: 'musikkrom', skattkammeret: 'skattkammer', skatt: 'skattkammer',
  ordmuseet: 'ordmuseum', museum: 'ordmuseum', prinsessens: 'mia', 'prinsessens rom': 'mia', miasrom: 'mia', kongeparets: 'soverom', 'kongeparets soverom': 'soverom',
  soverommet: 'soverom', badet: 'bad', garderoben: 'garderobe', 'stjernetårnet': 'stjernetarn', stjerne: 'stjernetarn', 'fetårnet': 'fetarn', fe: 'fetarn', heisen: 'hall',
  'heisen 1': 'heis1', 'heisen 2': 'heis2', stjernerom: 'stjernetarn', stjernerommet: 'stjernetarn',
};
// NPC spots (local lx 0..14, lz 0..10; ry 0 = facing the camera): clear of furniture, door mouths, the spiral (3.4, 2.3) and the lift (9.6, 0.75)
const NPC_SPOTS = {
  kjokken: [[8.8, 3.4], [3.0, 4.0, 0.4], [9.8, 6.2, -0.3]],
  spisesal: [[5.0, 6.9, 0.2], [9.0, 6.9, -0.2], [2.8, 7.6, 0.5], [11.4, 7.6, -0.5]],
  hall: [[6.6, 4.4, 0.2], [11.8, 4.6, -0.3], [10.4, 7.6, -0.4]],
  tronsal: [[7.0, 3.5], [4.4, 5.0, 0.3], [9.6, 5.0, -0.3], [10.4, 7.4, -0.4]],
  ballsal: [[5.6, 5.0, 0.3], [8.6, 5.0, -0.3], [3.8, 6.6, 0.4]],
  bibliotek: [[9.2, 3.8, -0.3], [4.8, 4.2, 0.3], [9.0, 6.8, -0.3]],
  musikkrom: [[6.6, 3.6], [9.6, 4.6, -0.3], [4.6, 5.6, 0.3]],
  heis1: [[6.6, 4.4, 0.2], [11.8, 4.6, -0.3], [10.4, 7.4, -0.4]],
  skattkammer: [[5.0, 4.0, 0.3], [9.0, 4.0, -0.3], [4.6, 6.0, 0.4]],
  ordmuseum: [[4.2, 8.4, 0.3], [10.2, 8.4, -0.3], [2.4, 8.8, 0.5]],
  mia: [[9.0, 4.2, -0.3], [6.6, 4.6], [10.4, 6.0, -0.4], [3.0, 6.4, 0.4]],
  soverom: [[4.4, 3.2, 0.3], [9.8, 3.4, -0.3], [9.0, 5.8, -0.3], [3.4, 5.2, 0.4]],
  heis2: [[6.6, 4.4, 0.2], [11.8, 4.6, -0.3], [10.4, 7.4, -0.4]],
  bad: [[8.2, 4.0, -0.2], [10.6, 5.6, -0.4], [5.6, 5.2, 0.2]],
  garderobe: [[6.6, 3.6], [9.4, 4.4, -0.3], [5.0, 5.8, 0.3]],
  fetarn: [[5.0, 4.4, 0.3], [7.6, 6.6], [3.0, 7.0, 0.3]],
  stjernetarn: [[5.6, 3.8, 0.3], [11.2, 7.2, -0.4], [4.4, 6.2, 0.3]],
};
const SHELL_ID = { hall: 'r_hallen', mia: 'r_prinsesse' };
const STAIR = { cell: 'hall', c: [3.4, 2.3], r: 1.6, floors: [0, 1, 2] };
const LIFT = { cells: ['hall', 'heis1', 'heis2'], lx: 9.6, lz: 0.75, ry: 0 };
const EXIT = { id: 'hoved', cell: 'hall', lx: 7, lz: 9.7, out: { x: 0, z: 1.8, ry: 0 } };
B.register({
  id: 'slott', name: 'Slottet', kind: 'slott', origin: { x: 0, z: 0 }, floors: 3,
  cells: ROOM_LIST.map(r => ({ key: r.id, f: r.floor, c: r.col, shell: SHELL_ID[r.id] || 'r_' + r.id, num: r.num, legacyNum: r.legacy != null ? r.legacy : null, name: r.name, type: r.id,
    npc: NPC_SPOTS[r.id], spawn: r.id === 'hall' ? [7, 6.0] : undefined })),
  stair: STAIR, lift: LIFT, exits: [EXIT], furnish: true,
});
// legacy ROOM_LIST entries proxy the live 'slott' cell (r.group, r.things, r.bounds, r.spawn, r.npcSpots …), so old callers keep working
// (fix_wp1 #8); r.group is null until the plan is built
for (const r of ROOM_LIST) {
  const cell = () => (B.plans.slott && B.plans.slott.byKey[r.id]) || null;
  for (const k of ['group', 'shellGroup', 'shellObj', 'shell3', 'things', 'bounds', 'center', 'spawn', 'npcSpots', 'key', 'bld', 'x0', 'f', 'c', 'shell', 'type', 'pickPlane', 'anch'])
    if (!(k in r)) Object.defineProperty(r, k, { get: () => { const c = cell(); return c ? c[k] : (k === 'things' || k === 'npcSpots' ? [] : null); }, enumerable: false, configurable: true });
}
// fallback tower plan (until WP2's tower.js registers 'tarn'): the old Fetårnet + Stjernetårnet rooms as a single column at x −400
function fallbackTarn() {
  if (B.plans.tarn) return;
  B.registerSimple({
    id: 'tarn', name: 'Fetårnet', kind: 'tarn', origin: { x: -400, z: 0 }, _fallback: true,
    rooms: [{ key: 'fetarn', shell: 'r_fetarn', name: 'Fetårnet', type: 'fetarn', npc: NPC_SPOTS.fetarn, opts: { doorL: false, doorR: false } },
      { key: 'stjernetarn', shell: 'r_stjernetarn', name: 'Stjernetårnet', type: 'stjernetarn', npc: NPC_SPOTS.stjernetarn, opts: { doorL: false, doorR: false } }],
    stair: { c: [10.6, 2.3] }, exit: { lx: 7, lz: 9.7, out: { x: 80, z: -85.8, ry: 0 } }, bed: { cell: 'fetarn', lx: 4.4, lz: 4.6 }, furnish: true,
  });
}

/* ================================================================== F.Castle (shims) */
const rooms = {};
function refreshRooms() {
  for (const k in rooms) delete rooms[k];
  const S = B.plans.slott, T = B.plans.tarn;
  if (S) for (const c of S.cells) rooms[c.key] = c;
  if (T) for (const c of T.cells) { rooms[c.key] = c; if (c.type && !rooms[c.type]) rooms[c.type] = c; if (c.legacy && !rooms[c.legacy]) rooms[c.legacy] = c; }
  if (T && !rooms.stjernetarn) { const c = T.cells.find(q => q.f === 1); if (c) rooms.stjernetarn = c; }
  if (T && !rooms.fetarn) { const c = T.cells.find(q => q.f === 0); if (c) rooms.fetarn = c; }
  // other buildings (royal castles): '<planId>:<cell>' so F.Castle.rooms[F.Castle.cur] is the room she is really in (task stage bounds)
  for (const id in B.plans) { if (id === 'slott' || id === 'tarn') continue; for (const c of B.plans[id].cells) rooms[id + ':' + c.key] = c; }
}
refreshRooms();
F.on('bldRegistered', () => refreshRooms());
// numeric keys = the legacy v1 numbers (10–20) for old callers; roomByPlate(n) = the natural number on the plate
const roomByNum = n => { const S = B.plans.slott; return (S && (S.cells.find(c => c.legacyNum === +n) || S.cells.find(c => c.num === +n))) || null; };
const roomByPlate = n => { const S = B.plans.slott; return (S && S.cells.find(c => c.num === +n)) || null; };
function room(key) {
  if (key == null) return null;
  if (typeof key === 'object' && (key.key || key.id)) return rooms[key.key || key.id] || null;
  if (typeof key === 'number' || /^\d+$/.test(String(key))) return roomByNum(+key);
  const k = String(key).toLowerCase();
  if (rooms[k]) return rooms[k];
  if (ALIAS[k] && rooms[ALIAS[k]]) return rooms[ALIAS[k]];
  for (const id in rooms) if (String(rooms[id].name).toLowerCase() === k) return rooms[id];
  return null;
}
const cellAt = (floor, col) => { const S = B.plans.slott; return S ? S.at(floor, col) : null; };
const Castle = F.Castle = {
  rooms, ROOM_LIST, room, roomByNum, roomByPlate, cellAt, PX, FH, CW, CD, CH, STAIR, LIFT, EXIT,
  ov: false, busy: false, ext: null, towers: {}, lift: null, kit: null,
  floorAt: () => B.f * FH,
  roomAt(x, y) {
    const P = B.planAt(x); if (!P) return null;
    const f = y != null ? U.clamp(Math.round(y / FH), 0, P.floors - 1) : (B.cur === P.id ? B.f : 0);
    return P.at(f, Math.floor((x - P.ox + 0.5) / PX));
  },
};
Object.defineProperties(Castle, {
  cur: { get: () => (F.Space.cur === 'in' && B.cur && B.roomKey) ? ((B.cur === 'slott' || B.cur === 'tarn') ? B.roomKey : B.cur + ':' + B.roomKey) : null, set() {}, enumerable: true },
  floor: { get: () => B.f, set() {}, enumerable: true },
  inside: { get: () => F.Space.cur === 'in' && !!B.cur, set() {}, enumerable: true },
});
Castle.npcSpot = function (key, i, avoid) {
  const r = room(key); if (!r || !r.npcSpots || !r.npcSpots.length) return null;
  const S = r.npcSpots, n = S.length, i0 = ((i | 0) % n + n) % n;
  for (let k = 0; k < n; k++) {
    const s = S[(i0 + k) % n];
    const taken = (avoid || []).some(a => Math.hypot(a.x - s.x, a.z - s.z) < 0.9) || (F.Act && F.Act.list || []).some(a => a.space === 'in' && a.room === r.id && Math.hypot(a.x - s.x, a.z - s.z) < 0.9);
    if (!taken) return Object.assign({}, s);
  }
  return Object.assign({}, S[i0]);
};
Castle.addBlock = function (floor, x0, z0, x1, z1) { return B.addBlock('slott', floor, x0, z0, x1, z1); };
Castle.freeSpot = (r, x, z) => { r = room(r); return r ? B.freeSpot(r.bld, r.key, x, z) : { x, z }; };
// legacy: switch inside NOW (sync) – used by tests, resume and old callers; door crossings use F.Bld.enter with the dip
Castle.enter = function (key) {
  const r = room(key) || rooms.hall; if (!r) return null;
  if (Castle.ov) Castle.overview(false);
  B.enter(r.bld, { at: { room: r.key }, instant: true });
  return r;
};
Castle.exit = function () {
  if (Castle.ov) Castle.overview(false);
  if (F.Space.cur !== 'in') return;
  if (B.cur) B.leave({ instant: true }); else F.Space.set('out', { x: 0, z: 30.5 });
};
// deprecated: walks her to the keep door (the door crossing does the rest)
Castle.walkIn = function () {
  const d = F.Things.byId('b_dor_slott');
  if (F.Space.cur === 'out' && d && !F.Player.frozen) return Promise.resolve(F.Player.goPress(d));
  return Promise.resolve();
};
Castle.walkOut = function () { return F.Space.cur === 'in' ? B.leave() : Promise.resolve(false); };
// deprecated: a glitter trail to room n (inside), or to the keep door (outside); never a teleport
Castle.goRoomByNumber = function (n) {
  const r = n === 'fetarn' ? rooms.fetarn : roomByNum(n);
  if (!r) return Promise.resolve(false);
  if (F.Space.cur === 'in' && B.cur === r.bld) return Promise.resolve(!!B.guideTo({ room: r.key }));
  if (F.Space.cur === 'out' && F.HUD && F.HUD.trail) { const d = F.Things.byId('b_dor_' + r.bld); if (d) { F.HUD.trail(F.Player.pos.x, F.Player.pos.z, d.x, d.z + 0.6); return Promise.resolve(true); } }
  return Promise.resolve(false);
};
// deprecated: the dollhouse overview is now the indoor map
Castle.overview = function (on) { if (on) { if (F.Space.cur === 'in') B.openMap(); } else B.closeMap(); };
Castle.gate = { x: 0, z: 30.5 };
Castle.gatePos = () => ({ x: 0, z: 30.5 });
Castle.exitPos = function () { const e = B.exitPos(); return e ? { x: e.x, z: e.z, f: e.f, via: e.via } : null; };
F.on('spaceChanged', cur => { if (cur !== 'in' && Castle.ov) Castle.overview(false); });

/* ================================================================== lift panel (c_heis) – v5 WP-X (DESIGN4 §8): the buttons are the FLOORS
   (3 / 2 / 1 «etasje», top floor first), like a real lift; the room plates carry the natural room numbers. travel(f) rides to that
   floor's landing and says «Nå er vi i andre etasje.». F01 no longer uses this panel as its answer widget (F.Pickers.lift has no
   open(): F01 runs its own lift board) – REQUEST WP-R2: F01 in the castle asks for a floor or a real plate number. */
const lift = Castle.lift = {
  task: null,
  panel: null, buttons: {}, floors: true,
  rows() {
    const P = B.curPlan() || B.plans.slott; if (!P) return [];
    const out = [];
    for (let f = (P.floors || 1) - 1; f >= 0; f--) out.push([f + 1]);
    return out;
  },
  open(o) {
    o = o || lift.task || {};
    if (lift.panel) return Promise.resolve(null);
    return new Promise(res => {
      const wrap = F.UI.el('div', 'liftpanel');
      lift.buttons = {};
      let done = false;
      const finish = (n) => { if (done) return; done = true; h.close(); res(n); };
      const press = async (n, b) => {
        F.emit('liftPick', n);
        if (o.pick) {
          let go = false;
          try { go = await o.pick(n, b); } catch (e) { console.error(e); }
          if (!go) return;
          finish(n); await lift.travel(n); return;
        }
        finish(n);
        await lift.travel(n);
      };
      const here = B.f != null ? B.f + 1 : null;
      for (const row of lift.rows()) {
        const R = F.UI.el('div', 'lift-row');
        for (const n of row) {
          const b = F.UI.btn('<span class="ln">' + n + '</span><span class="le" style="font-size:15px;font-weight:600;opacity:.75;margin-top:2px">etasje</span>', () => press(n, b), { cls: 'liftbtn' });
          b.style.flexDirection = 'column'; b.dataset.n = n; lift.buttons[n] = b; R.appendChild(b);
          if (n === here) { b.classList.add('here'); b.style.opacity = '0.55'; }
        }
        wrap.appendChild(R);
      }
      const h = F.UI.open(wrap, { cls: 'lift-wrap', onClose: () => { lift.panel = null; if (!done) { done = true; res(null); } } });
      lift.panel = h;
      if (!o.pick) say(F.TPL.has('bld_heis_etasje') ? 'bld_heis_etasje' : 'castle_heis_hvor');
    });
  },
  close() { if (lift.panel) lift.panel.close(); },
  highlight(n, cls) { const b = lift.buttons[n]; if (b) { b.classList.add(cls || 'glow'); } },
  mark(n, cls) { const b = lift.buttons[n]; if (b) { b.classList.remove('right', 'wrong'); b.classList.add(cls); } },
  // the ride: doors close, the floor changes behind them, doors open, a glitter trail to the room (no fade, no teleport)
  travel(n) {
    if (F.Space.cur === 'in' && B.cur) return B.ride({ f: Math.max(0, (+n || 1) - 1) });
    return Promise.resolve(false);
  },
};
F.Pickers = F.Pickers || {};
F.Pickers.lift = { floors: true };      // (no open(): the floor panel is not a number-answer widget)

/* ================================================================== tmp voxel models for the learning towers (used only if no c_laere_* def) */
// learning-tower floor (0.75 m tall at 1/4 m): o.c body colour, o.gold mastered, o.win window
vdef('tmp_tfloor', {
  size: [15, 3, 15], scale: 1 / 4,
  build(v, o) {
    const body = o.gold ? 'gold' : o.c, band = o.gold ? 'butter' : o.c2;
    v.cyl(7, 0, 7, 6.6, 3, body); v.cyl(7, 2, 7, 6.9, 1, band);
    v.box(6, 0, 13, 8, 1, 14, o.gold ? 'white' : 'sky');
    if (o.num) v.set(7, 1, 0, 'white');
  },
});
vdef('tmp_tbase', {
  size: [19, 4, 19], scale: 1 / 4,
  build(v, o) { v.cyl(9, 0, 9, 9, 2, 'stone2'); v.cyl(9, 2, 9, 7.6, 2, 'stone'); v.box(7, 2, 16, 11, 3, 18, o.c || 'pink'); },
});
vdef('tmp_troof', {
  size: [17, 14, 17], scale: 1 / 4,
  build(v, o) { v.cyl(8, 0, 8, 7.8, 1, 'white'); v.cone(8, 1, 8, 7.4, 10, o.c || 'roofPink'); v.box(8, 11, 8, 8, 12, 8, 'gold'); v.set(8, 13, 8, 'glowYellow'); },
});
vdef('tmp_balcony', {
  size: [12, 6, 6], scale: 1 / 4,
  build(v, o) {
    v.box(0, 0, 0, 11, 0, 5, 'white'); for (let x = 0; x < 12; x += 2) v.box(x, 1, 5, x, 2, 5, 'white'); v.box(0, 3, 5, 11, 3, 5, 'white');
    if (o.kind === 'flowers') for (let x = 1; x < 11; x += 2) { v.set(x, 1, 2, 'leaf'); v.set(x, 2, 2, x % 4 === 1 ? 'pink' : 'yellow'); }
    else if (o.kind === 'flag') { v.box(5, 1, 2, 5, 5, 2, 'gold'); v.box(6, 3, 2, 9, 5, 2, 'pink'); }
    else { v.box(4, 1, 2, 5, 2, 3, 'woodDark'); v.box(5, 3, 1, 8, 4, 2, 'gold'); v.set(9, 4, 1, 'sky'); }
  },
});
vdef('tmp_figurine', {
  size: [9, 12, 5], scale: 1 / 16 * 2,
  build(v, o) { v.cone(4, 0, 2, 3, 6, o.c || 'lilac'); v.sphere(4, 7.5, 2, 2, 'skin'); v.box(3, 9, 1, 5, 10, 3, 'hairBlond'); v.set(4, 11, 2, 'gold'); },
  parts: { wings: { pivot: [4, 5, 1], build(v) { v.box(0, 4, 0, 2, 7, 0, 'glass'); v.box(6, 4, 0, 8, 7, 0, 'glass'); } } },
});

/* ================================================================== exterior (DESIGN2 §2.6): open gate, courtyard, keep door, occluder fade */
const COURT = { x0: -22.5, x1: 22.5, z0: 0.2, z1: 14.4 };
function buildExterior() {
  const S = F.R.scene;
  const root = new THREE.Group(); root.name = 'castleExt';
  const E = Castle.ext = { root };
  // lily pads on the moat + Andedammen reeds (cosmetic)
  const lp = F.M.builder(), wy = (F.W.WATER != null ? F.W.WATER : -0.15) + 0.03;
  for (let i = 0; i < 30; i++) {
    const a = U.hash2(i, 3, 9), t = U.hash2(i, 7, 9) * 2 - 1, side = i % 4;
    let x, z;
    if (side === 0) { x = t * 30; z = -23.3 + (a - .5) * 3; } else if (side === 1) { x = t * 30; if (Math.abs(x) < 5) x += 9 * Math.sign(x || 1); z = 23.3 + (a - .5) * 3; }
    else if (side === 2) { x = -31.3 + (a - .5) * 3; z = t * 18; } else { x = 31.3 + (a - .5) * 3; z = t * 18; }
    lp.cyl(0.55, 0.55, 0.05, 0x5ec05c, x, wy, z, { seg: 8 }); if (i % 3 === 0) lp.sphere(0.16, i % 2 ? 0xff7fb0 : 0xffffff, x + 0.12, wy + 0.1, z);
  }
  for (let i = 0; i < 18; i++) {
    const a = U.hash2(i, 11, 5) * Math.PI * 2, q = Math.sqrt(0.4 + U.hash2(i, 13, 5) * 0.4), x = 72 + Math.cos(a) * 16 * q, z = 6 + Math.sin(a) * 11 * q;
    if (Math.hypot(x - 76, z - 3) < 4.8 || Math.hypot(x - 61, z - 2) < 3) continue;
    lp.cyl(0.6, 0.6, 0.05, 0x5ec05c, x, wy, z, { seg: 8 }); if (i % 3 === 0) lp.sphere(0.17, i % 2 ? 0xff7fb0 : 0xffffff, x + 0.12, wy + 0.1, z);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9 + U.hash2(i, 17, 5) * 0.05) * Math.PI * 2, x = 72 + Math.cos(a) * 16 * 0.93, z = 6 + Math.sin(a) * 11 * 0.93;
    if (z > 12) continue;
    for (let k = 0; k < 5; k++) { const h = 0.8 + U.hash2(i, k, 21) * 0.6; lp.box(0.09, h, 0.09, k % 2 ? 0x6fae4a : 0x8cc45a, x + (U.hash2(i, k, 23) - 0.5) * 0.9, wy + h / 2, z + (U.hash2(i, k, 29) - 0.5) * 0.9); }
    lp.box(0.14, 0.32, 0.14, 0x9a6a3a, x, wy + 1.2, z);
  }
  root.add(F.M.mergeStatic(lp.group, { noShadow: true }));
  // courtyard paving: a cobble path gate → keep door, a round plaza by the well
  const cb = F.M.builder();
  for (let z = 0.4; z < 14.6; z += 0.8) for (let x = -1.6; x <= 1.6; x += 0.8) { const k = U.hash2(Math.round(x * 5), Math.round(z * 5), 3); cb.box(0.74, 0.06, 0.74, k < 0.33 ? 0xd9cbb2 : k < 0.66 ? 0xe8dcc6 : 0xcdbfa6, x, 0.03, z); }
  for (let r = 1; r <= 3; r++) for (let a = 0; a < 6 * r; a++) { const an = a / (6 * r) * Math.PI * 2, x = -12 + Math.cos(an) * r * 0.85, z = 9 + Math.sin(an) * r * 0.85; cb.box(0.7, 0.05, 0.7, (a + r) % 2 ? 0xe8dcc6 : 0xd9cbb2, x, 0.025, z); }
  root.add(F.M.mergeStatic(cb.group, { noShadow: true }));
  // fix_wp1 #3/#5: the whole yard is cobbled in fans round the keep door, with flower borders along the walls
  const yd = F.M.builder(), STONE = [0xeadfca, 0xddd0b8, 0xf2e6d2, 0xe6cfc4];
  for (let z = 0.5; z < 15; z += 1) for (let x = -22.5; x <= 22.5; x += 1) {
    if (Math.abs(x) < 2.1) continue;
    const band = Math.floor(Math.hypot(x, z) / 1.6) & 1, k = U.hash2(Math.round(x * 3), Math.round(z * 3), 7);
    yd.box(0.94, 0.03, 0.94, band ? STONE[k < 0.5 ? 0 : 2] : STONE[k < 0.5 ? 1 : 3], x, 0.012, z);
  }
  const FL = [0xff7fb0, 0xffe066, 0xc6a8ff, 0xffffff, 0xff9a6b, 0x8fd0ff];
  const border = (x0, z0, x1, z1) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55));
    yd.box(Math.abs(x1 - x0) + 0.7, 0.22, Math.abs(z1 - z0) + 0.7, 0x6fae4a, (x0 + x1) / 2, 0.11, (z0 + z1) / 2);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; yd.box(0.08, 0.3, 0.08, 0x5c9a3e, x, 0.3, z); yd.sphere(0.17, FL[(i * 7 + Math.round(x + z)) % FL.length], x, 0.5, z, { seg: 6, seg2: 4 }); }
  };
  border(-22.4, 1.2, -22.4, 14.2); border(22.4, 1.2, 22.4, 14.2); border(-20.5, 14.6, -7.6, 14.6); border(7.6, 14.6, 20.5, 14.6);
  root.add(F.M.mergeStatic(yd.group, { noShadow: true }));
  const g = F.CastleKit.build(); root.add(g);
  const P = g.userData.parts;
  E.kit = g; E.objs = g.userData.objs || {}; E.facade = P.facade || null; E.facadeR = P.facadeR || null; E.bridgePart = P.bridge || null;
  E.roomsPart = P.rooms || null; if (E.roomsPart) E.roomsPart.visible = false;      // the painted room boxes are gone for good (walk-in castle)
  if (E.bridgePart) E.bridgePart.rotation.x = Math.PI / 2;                          // the drawbridge is always down
  E.beaconAt = F.CastleKit.beaconTop || [0, 50, -8];
  // rainbow beacon (glow, fog:false, visible from everywhere; billboarded)
  const beam = new THREE.Group(); beam.position.set(E.beaconAt[0], E.beaconAt[1], E.beaconAt[2]);
  const RB = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc];
  RB.forEach((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 280, 0.4), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set((i - 2.5) * 1.0, 141, 0); beam.add(m); });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.75, fog: false, depthWrite: false }));
  beam.add(halo); root.add(beam); E.beam = beam; E.halo = halo;
  // flag poles on the keep front (10, empty until a kingdom friendship)
  E.poles = [];
  const pg = new THREE.Group(); pg.name = 'flagpoles';
  // fix_wp1 #5: the row stands on the courtyard ground along the keep front (was 16 m up the keep, out of view), the door kept clear
  const PX10 = [-12.3, -10.1, -7.9, -5.7, -3.5, 3.5, 5.7, 7.9, 10.1, 12.3];
  for (let i = 0; i < 10; i++) {
    const x = PX10[i], m = has('c_flaggstang') ? F.VOX.make('c_flaggstang', {}) : new THREE.Group();
    m.position.set(x, 0, 1.0); pg.add(m); E.poles.push({ x, y: 0, z: 1.0, obj: m, flag: null });
  }
  root.add(pg);
  S.add(root);
  // colliders: moat ring (gate gap open), keep, gatehouse sides, curtain walls (1.6 m), corner towers, the strip outside the walls
  const W = F.W;
  E.walls = [W.addWall(-34.8, -26.8, 34.8, -26.8, 0.6), W.addWall(-34.8, 26.8, -3.2, 26.8, 0.6), W.addWall(3.2, 26.8, 34.8, 26.8, 0.6),
    W.addWall(-34.8, -26.8, -34.8, 26.8, 0.6), W.addWall(34.8, -26.8, 34.8, 26.8, 0.6)];
  E.boxes = [
    W.addBox(-16, -15.75, 16, -0.25),                                    // keep
    W.addBox(-7, 13.25, -2.2, 19.25), W.addBox(2.2, 13.25, 7, 19.25),     // gatehouse sides (the passage x ±2.2 stays free)
    W.addBox(-20.9, 15.2, -5.6, 16.8), W.addBox(5.6, 15.2, 20.9, 16.8),   // south curtain walls
    W.addBox(-24.8, -13.2, -23.2, 13.2), W.addBox(23.2, -13.2, 24.8, 13.2), // side walls
    W.addBox(-21.2, -16.8, 21.2, -15.2),                                 // north walls
    W.addBox(-28.8, 16.8, -2.3, 20.8), W.addBox(2.3, 16.8, 28.8, 20.8),   // the bank strip outside the south walls (no sneaking round)
    W.addBox(-28.8, -20.8, -24.8, 20.8), W.addBox(24.8, -20.8, 28.8, 20.8), W.addBox(-28.8, -20.8, 28.8, -16.8),
  ];
  const TW = [[-24, -16], [24, -16], [-24, 16], [24, 16]];
  E.blocker = (x, z, r) => { if (Math.abs(x) > 30 || Math.abs(z) > 22) return false; for (const [tx, tz] of TW) if (Math.hypot(x - tx, z - tz) < 4.2 + r) return true; return false; };
  W.blockers.push(E.blocker);
  E.walk = W.addWalkable({ x0: -2.2, z0: 17.6, x1: 2.2, z1: 27.6, y: 0.5 });       // the bridge deck over the moat
  // occluder fade: south walls + gatehouse (own material clones so nothing else fades)
  E.fadeObjs = [E.objs.wallSW, E.objs.wallSE, E.objs.gate].filter(Boolean);
  E.fadeMats = [];
  for (const o of E.fadeObjs) o.traverse(m => { if (!m.isMesh || !m.material) return; m.material = m.material.clone(); E.fadeMats.push({ m: m.material, op: m.material.opacity, tr: m.material.transparent }); });
  E.fadeK = 1;
  // the keep door (DESIGN2 §2.4): walk into it or tap it
  B.addDoor('slott', 0, 0.6, { id: 'b_dor_slott', exit: 'hoved' });
  buildCourtyard();
  buildTowers();
}
function applyFade(k) {
  const E = Castle.ext; if (!E || !E.fadeMats) return;
  for (const f of E.fadeMats) { f.m.opacity = f.op * k; f.m.transparent = f.tr || k < 0.999; f.m.depthWrite = k > 0.6; }
  for (const o of E.fadeObjs) o.visible = k > 0.02;
}
F.on('tick', (dt, t) => {
  const E = Castle.ext; if (!E || F.Space.cur !== 'out') return;
  if (E.beam) { const c = F.R.camera.position; E.beam.rotation.y = Math.atan2(c.x - E.beam.position.x, c.z - E.beam.position.z); E.halo.scale.setScalar(1 + Math.sin(t * 2) * 0.12); }
  const p = F.Player.pos;
  // the whole courtyard + the gate passage: south walls and gatehouse fade, and the view tilts down a little (sees over the gatehouse)
  const inCourt = p.x >= COURT.x0 && p.x <= COURT.x1 && p.z > COURT.z0 + 1.5 && p.z <= 19 && Math.abs(Math.atan2(Math.sin(F.R.cam.yaw), Math.cos(F.R.cam.yaw))) < 0.4;
  const goal = inCourt ? 0 : 1;           // a clean dollhouse cutaway (0.35 left a hazy voxel ghost over her)
  if (Math.abs(E.fadeK - goal) > 0.001) { E.fadeK += U.clamp(goal - E.fadeK, -dt / 0.25, dt / 0.25); applyFade(E.fadeK); }
  const c = F.R.cam;
  if (inCourt && !E.tilt && c.mode === 'out' && !c.look && !c.focus && Math.abs(c.pitchGoal - 0.92) < 0.01) { c.pitchGoal = 1.04; E.tilt = true; }
  else if (!inCourt && E.tilt) { if (Math.abs(c.pitchGoal - 1.04) < 0.01) c.pitchGoal = 0.92; E.tilt = false; }
});
Castle.facadeOpen = () => {};      // the facade swing is gone (DESIGN2 §2.10)
// the drawbridge: always down; a tap is a clank and a wobble (never blocks the way). natural 11.10. (audit D10 #55): the clank is the
// sound – no «Klonk! Vindebrua er nede.» line
Castle.bridge = {
  async tap(th) {
    const E = Castle.ext, p = E && E.bridgePart;
    sfx('thud'); sfx('tone', 196, 0.25, 'square', 0.04, 0.05, 160); sfx('tone', 392, 0.18, 'triangle', 0.03, 0.08, 300);
    if (th && F.FX && F.FX.sparkle) F.FX.sparkle(V3(th.x, 1.4, th.z - 2));
    if (p) await F.T.tween(700, k => { p.rotation.x = Math.PI / 2 - Math.sin(k * Math.PI * 3) * 0.04 * (1 - k); });
    if (p) p.rotation.x = Math.PI / 2;
  },
};
// the bridge-end lanterns as a Thing (a tap clanks the bridge; the deck itself is plain walkable ground). natural 11.10. (audit D10):
// while she stands on the deck a tap is a WALK, never a press (F.Input asks def.pickable), and only the two lantern posts are the thing
// (input.js checks the real meshes of a wide pick box) – a tap on the deck between them walks her there
Castle.onBridge = (x, z) => Math.abs(x) <= 2.6 && z >= 17.2 && z <= 28.2;
F.Things.def('c_vindebru', {
  name: 'vindebroen', radius: 0.6, solid: false, reach: 3.2, hoverable: true, surprise: false,
  pickable: () => !(F.Space.cur === 'out' && Castle.onBridge(F.Player.pos.x, F.Player.pos.z)),
  build(th) {
    const g = new THREE.Group();
    const b = F.M.builder();
    for (const x of [-2.6, 2.6]) { b.box(0.5, 1.6, 0.5, 0xe2d6bf, x, 0.8, 0); b.box(0.7, 0.2, 0.7, 0xf5c542, x, 1.7, 0); b.box(0.36, 0.42, 0.36, 0xfff4a0, x, 2.0, 0, { emissive: 0xffe066, ei: 0.8 }); b.cone(0.36, 0.35, 0xec7aa8, x, 2.4, 0); }
    g.add(b.group);
    th.parts = { posts: b.group };
    return g;
  },
  init(th) { th.labelY = 2.6; },
  async press(th) { th.reactedVisibly = true; await Castle.bridge.tap(th); },
});

/* ================================================================== courtyard things (DESIGN2 §2.6, P0) */
F.Things.def('c_bronn', {
  name: 'brønnen', radius: 1.1, solid: true, reach: 2.4,
  build(th) { const id = has('v_bronn') ? 'v_bronn' : has('p_bronn') ? 'p_bronn' : null; const m = id ? F.VOX.make(id, {}) : new THREE.Group(); th.parts = m.userData.parts || {}; return m; },
  async press(th) {
    th.reactedVisibly = true; say('bld_bronn'); sfx('splash');
    const b = th.parts && th.parts.bucket, c = th.parts && th.parts.crank;
    if (c) F.T.tween(1200, k => { c.rotation.x = k * Math.PI * 4; });
    if (b) { const y0 = b.position.y; await F.T.tween(600, k => { b.position.y = y0 - Math.sin(k * Math.PI) * 0.9; }); b.position.y = y0; }
    if (F.FX && F.FX.burst) F.FX.burst(V3(th.x, 1.2, th.z), { n: 16, colors: [0x9fdcff, 0xffffff], speed: 1.2, up: 2.4, gravity: 3, life: 1.1, size: 0.1 });
  },
});
F.Things.def('c_gardbenk', {
  name: 'benken', radius: 0.9, solid: true, reach: 2.2,
  build(th) { const id = has('p_benk') ? 'p_benk' : has('g_benk') ? 'g_benk' : has('c_benk') ? 'c_benk' : null; return id ? F.VOX.make(id, {}) : new THREE.Group(); },
  async press(th) {
    th.reactedVisibly = true; say('bld_benk');
    const av = F.Player.avatar;
    if (av) await F.T.tween(700, k => { av.position.y = Math.sin(k * Math.PI) * 0.5; });
    if (av) av.position.y = 0;
    if (F.FX && F.FX.burst) F.FX.burst(V3(th.x, 1.0, th.z), { n: 10, colors: [0xff7fb0, 0xffe066], speed: 0.8, up: 1.6, life: 1.2, size: 0.1 });
  },
});
F.Things.def('c_gardbed', {
  name: 'blomsterbedet', radius: 0.9, solid: true, reach: 2.2,
  build(th) { const id = has('p_blomsterbed') ? 'p_blomsterbed' : has('g_blomsterbed') ? 'g_blomsterbed' : null; return id ? F.VOX.make(id, { seed: th.data.seed || 1 }) : new THREE.Group(); },
  async press(th) {
    th.reactedVisibly = true; say('park_blomst'); sfx('pling', 3);
    await F.T.tween(600, k => { th.obj.scale.y = 1 + Math.sin(k * Math.PI) * 0.25; });
    th.obj.scale.y = 1;
    if (F.FX && F.FX.burst) F.FX.burst(V3(th.x, 0.8, th.z), { n: 14, colors: [0xff7fb0, 0xffe066, 0xc6a8ff], speed: 0.9, up: 1.8, life: 1.3, size: 0.1 });
  },
});
F.Things.def('c_flaggstang', {
  name: 'flaggstanga', radius: 0.3, solid: false, reach: 2.4, hoverable: false,
  build() { return new THREE.Group(); },
});
function buildCourtyard() {
  const S = (type, x, z, o) => { if (!F.Things.defs[type]) return null; return F.Things.spawn(type, x, z, Object.assign({ id: 'c_gard_' + type + '_' + Math.round(x) + '_' + Math.round(z) }, o || {})); };
  S('c_bronn', -12, 9);
  S('c_gardbenk', -6.5, 12.8, { ry: Math.PI });
  S('c_gardbenk', 11, 3.2, { ry: -Math.PI / 2 });
  S('c_gardbed', -17, 3.2, { data: { seed: 1 } });
  S('c_gardbed', 17, 3.2, { data: { seed: 2 } });
  S('c_gardbed', -17, 11.8, { data: { seed: 3 } });
  S('c_gardbed', 17, 11.8, { data: { seed: 4 } });
  // fix_wp1 #3: more to do in the yard (existing park / village things, each with its own reaction and speech)
  S('p_fontene', 6.5, 6.6);
  S('p_hinkerute', 9.6, 11.4);
  S('p_honsehus', 19.8, 7.6, { ry: -Math.PI / 2 });
  S('v_vaskesnor', -6.5, 3.4);
  S('v_trillebar', 14.4, 13.1, { ry: 0.4 });
  S('p_fuglebad', -8.4, 7.6);
  S('v_vindspill', -20.8, 1.8);
  S('v_parasoll', 20.6, 1.9);
  S('v_fuglekasse', -20.8, 13.4);
  S('p_tavle', 4.8, 3.3);
}

/* ================================================================== kingdom flags + gifts (DESIGN2 §2.6; WP8 calls these on Vennskap) */
const GIFTS = {
  blomst: { model: 'c_gave_rosebusk', space: 'out', x: -17, z: 7.5, room: null },
  hest: { model: 'c_gave_hestesko', space: 'out', x: 0, z: -0.15, y: 5.4, room: null },
  boble: { model: 'c_gave_boblefontene', space: 'out', x: 12, z: 8.5, room: null },
  skjell: { model: 'c_gave_skjell', room: 'bad', lx: 9.4, lz: 6.8 },
  kake: { model: 'c_gave_kakefat', room: 'spisesal', lx: 8.0, lz: 4.75, dy: 0.9 },
  musikk: { model: 'c_gave_spilledase', room: 'mia', lx: 6.4, lz: 8.0 },
  stjerne: { model: 'c_gave_stjerneglobus', room: 'bibliotek', lx: 9.2, lz: 4.8 },
  sno: { model: 'c_gave_snokule', room: 'tronsal', lx: 3.6, lz: 3.2 },
  krystall: { model: 'c_gave_krystallkrone', room: 'skattkammer', lx: 7.2, lz: 4.6 },
  regnbue: { model: 'c_gave_regnbue', space: 'out', x: 0, z: -8, y: 24, room: null },
};
Castle.GIFTS = GIFTS;
Castle.giftSpot = function (realmId) {
  const g = GIFTS[realmId]; if (!g) return null;
  if (!g.room) return { space: 'out', x: g.x, z: g.z, y: g.y || 0 };
  const p = B.toWorld('slott', g.room, g.lx, g.lz); if (!p) return null;
  return { space: 'in', bld: 'slott', f: p.f, x: p.x, z: p.z, y: p.y + (g.dy || 0), room: g.room };
};
Castle.giftRoom = realmId => { const g = GIFTS[realmId]; const r = g && g.room ? room(g.room) : null; return r ? r.name : null; };
Castle.showGift = function (realmId, o) {
  o = o || {};
  const g = GIFTS[realmId]; if (!g || !F.Things.defs.c_gave) return null;
  const id = 'c_gave_' + realmId;
  let th = F.Things.byId(id);
  if (!th) {
    if (g.room) th = B.spawnIn('slott', g.room, 'c_gave', g.lx, g.lz, { id, dy: g.dy || 0, data: { realm: realmId, model: g.model } });
    else th = F.Things.spawn('c_gave', g.x, g.z, { id, space: 'out', y: g.y || 0, data: { realm: realmId, model: g.model } });
  }
  F.save.castleGifts = F.save.castleGifts || {};
  if (!F.save.castleGifts[realmId]) { F.save.castleGifts[realmId] = 1; F.store(); }
  if (th && o.say !== false && g.room && F.SETS.ROOMS && F.SETS.ROOMS.includes(room(g.room).name)) say('bld_gave', { rom: room(g.room).name });
  return th;
};
F.Things.def('c_gave', {
  name: 'gaven', radius: 0.5, solid: false, reach: 2.4, space: 'in',
  build(th) { const id = th.data.model; return id && has(id) ? F.VOX.make(id, {}) : (has('c_gave_rosebusk') ? F.VOX.make('c_gave_rosebusk', {}) : new THREE.Group()); },
  async press(th) {
    th.reactedVisibly = true; sfx('chime');
    await F.T.tween(800, k => { th.obj.rotation.y = Math.sin(k * Math.PI * 2) * 0.3; th.obj.position.y = th.y + Math.sin(k * Math.PI) * 0.15; });
    th.obj.rotation.y = th.ry || 0; th.obj.position.y = th.y;
    if (F.FX && F.FX.burst) F.FX.burst(V3(th.x, th.y + 1, th.z), { n: 18, colors: [0xffe066, 0xff9ccf, 0x9fdcff], speed: 1, up: 2, life: 1.4, size: 0.1 });
  },
});
const FLAGC = { blomst: 'pink', hest: 'woodLight', boble: 'sky', skjell: 'ice', kake: 'peach', musikk: 'lavender', stjerne: 'navySoft', sno: 'white', krystall: 'crystal', regnbue: 'butter' };
Castle.setFlags = function (realmIds) {
  const E = Castle.ext; if (!E || !E.poles) return 0;
  const list = (realmIds || []).slice(0, 10);
  E.poles.forEach((p, i) => {
    const r = list[i];
    if (p.flag && p.flag.userData.realm !== r) { p.obj.remove(p.flag); p.flag = null; }
    if (r && !p.flag && has('c_flagg')) {
      const R = (F.REALMS || []).find(q => q.id === r) || {};
      const f = F.VOX.make('c_flagg', { c: (R.flag || FLAGC[r] || 'pink') }); f.userData.realm = r; f.position.y = 0; p.obj.add(f); p.flag = f;
    }
  });
  return list.length;
};
F.on('castleReady', () => {
  try {
    const gifts = F.save.castleGifts || {};
    for (const r in gifts) Castle.showGift(r, { say: false });
    if (F.save.castleFlags) Castle.setFlags(F.save.castleFlags);
    else if (F.RQuest && F.RQuest.friend && F.REALMS && F.REALMS.length) Castle.setFlags(F.REALMS.map(r => r.id).filter(id => { try { return F.RQuest.friend(id); } catch (e) { return false; } }));
  } catch (e) { console.error('[castle] gifts/flags', e); }
});
F.on('friendship', realmId => {
  try {
    F.save.castleFlags = F.save.castleFlags || [];
    const fresh = realmId && !F.save.castleFlags.includes(realmId);
    if (fresh) { F.save.castleFlags.push(realmId); F.store(); }
    Castle.setFlags(F.save.castleFlags);
    if (fresh) F.T.timeout(() => say('bld_flagg'), 2500);
  } catch (e) { console.error('[castle] flag', e); }
});

/* ================================================================== learning towers (§9.8) */
const TOWER_DEF = {
  tall: { name: 'Talltårnet', word: 'tall', x: 12, z: 39, c: 'sky', c2: 'roofBlue', roof: 'roofBlue', fig: 'sky', max: 34 },
  les: { name: 'Lesetårnet', word: 'les', x: 19.5, z: 42, c: 'mint', c2: 'roofMint', roof: 'roofMint', fig: 'mint', max: 11 },
  skriv: { name: 'Skrivetårnet', word: 'skriv', x: 27, z: 39, c: 'blossom', c2: 'roofPink', roof: 'roofPink', fig: 'pink', max: 11 },
};
const FLOOR_H = 0.75;
function buildTowers() {
  const K = has('c_laere_base') && has('c_laere_etasje') && has('c_laere_tak');
  const BASE_H = K ? 2.0 : 1.0;
  for (const key in TOWER_DEF) {
    const d = TOWER_DEF[key];
    const g = new THREE.Group(); g.position.set(d.x, F.W.groundY ? F.W.groundY(d.x, d.z) : 0, d.z);
    g.add(K ? F.VOX.make('c_laere_base', { kind: key }) : F.VOX.make('tmp_tbase', { c: d.c2 }));
    const floors = new THREE.Group(); floors.position.y = BASE_H; g.add(floors);
    const roof = K ? F.VOX.make('c_laere_tak', { kind: key }) : F.VOX.make('tmp_troof', { c: d.roof }); g.add(roof);
    const fig = F.VOX.make('tmp_figurine', { c: d.fig }); fig.position.set(0, 0, K ? 2.45 : 1.75); g.add(fig);
    F.R.scene.add(g);
    const floorModel = (i, gold) => K ? F.VOX.make(gold ? (has('c_laere_gull') ? 'c_laere_gull' : 'c_laere_etasje') : 'c_laere_etasje', { kind: key })
      : F.VOX.make('tmp_tfloor', { c: (i % 2) ? d.c : d.c2, c2: 'white', gold });
    const T = Castle.towers[key] = {
      key, name: d.name, def: d, group: g, floors, roof, fig, n: 0, gold: 0, curF: 0, baseH: BASE_H, max: d.max,
      setFloors(n, goldN, o) {
        o = o || {};
        n = U.clamp(n | 0, 0, d.max); goldN = U.clamp(goldN == null ? T.gold : goldN | 0, 0, n);
        const old = T.n; T.n = n; T.gold = goldN;
        while (floors.children.length) floors.remove(floors.children[0]);
        for (let i = 0; i < n; i++) {
          const f = floorModel(i, i < goldN);
          f.position.y = i * FLOOR_H; floors.add(f);
          if (i % 3 === 2) { const bal = F.VOX.make('tmp_balcony', { kind: ['flowers', 'flag', 'scope'][Math.floor(i / 3) % 3] }); bal.scale.setScalar(0.55); bal.position.set(0, i * FLOOR_H + 0.05, K ? 1.95 : 1.65); floors.add(bal); }
          if (o.animate && i >= old && F.FX && F.FX.assemble) {
            const wp = V3(d.x, g.position.y + BASE_H + i * FLOOR_H, d.z);
            F.FX.assemble(K ? (i < goldN && has('c_laere_gull') ? 'c_laere_gull' : 'c_laere_etasje') : 'tmp_tfloor', K ? { kind: key } : { c: (i % 2) ? d.c : d.c2, c2: 'white', gold: i < goldN }, f, wp, { ms: 1100 });
          }
        }
        roof.position.y = BASE_H + n * FLOOR_H;
        T.setCur(o.cur != null ? o.cur : n);
        if (T.thing) T.thing.bboxDirty = true;
        if (!F.flags.collect) { F.save.towers = F.save.towers || {}; F.save.towers[key] = { n, gold: goldN }; }
        F.emit('towerChanged', key, n, goldN);
        return T;
      },
      setCur(k) {
        T.curF = U.clamp(k, 0, T.n); const y = BASE_H + Math.max(0, T.curF - 1) * FLOOR_H + 0.1;
        if (T._ready && Math.abs(T.fig.position.y - y) > 0.01) { const y0 = T.fig.position.y; F.T.tween(1400, q => { T.fig.position.y = U.lerp(y0, y, ease.inOut(q)); }); } else T.fig.position.y = y;
      },
      height() { return BASE_H + T.n * FLOOR_H + (K ? 8 : 3.5); },
      async wave() {
        const arm = roof.userData.parts && roof.userData.parts.arm, fg = roof.userData.parts && roof.userData.parts.figur;
        const w = T.fig.userData.parts && T.fig.userData.parts.wings;
        await F.T.tween(1600, k => {
          const s = Math.sin(k * Math.PI * 6);
          if (arm) arm.rotation.z = s * 0.6; if (fg) fg.position.y = (fg.userData.y0 != null ? fg.userData.y0 : (fg.userData.y0 = fg.position.y)) + Math.abs(Math.sin(k * Math.PI * 3)) * 0.25;
          T.fig.rotation.y = s * 0.5; if (w) w.scale.x = 1 + Math.sin(k * Math.PI * 10) * 0.25;
        });
        if (arm) arm.rotation.z = 0; if (fg && fg.userData.y0 != null) fg.position.y = fg.userData.y0; T.fig.rotation.y = 0;
      },
    };
    const sv = (F.save.towers || {})[key];
    T.setFloors(sv ? sv.n : 1, sv ? sv.gold : 0);
    T._ready = true;
  }
}

/* ================================================================== speech helper */
// numbers (counting sequences) are learning content: QUEUE them (F.SAY) so none is dropped while another line plays;
// everything else stays 'free' (only if nothing else is speaking). A long backlog drops the number instead of piling up.
// natural 11.10. (audit D3): a free-play count (the cuckoo, the clock tower) belongs to the thing she tapped – say(…, th) drops the next
// number once she has tapped something else, and that tap also drops the numbers already queued (outside tasks and ceremonies)
const QUEUED_SAY = new Set(['castle_n']);
let lastPress = null;
function say(id, slots, voice, th) {
  if (!(F.TPL && F.TPL.has(id))) return Promise.resolve(false);
  if (QUEUED_SAY.has(id) && th && lastPress && lastPress !== th) return Promise.resolve(false);
  if (QUEUED_SAY.has(id) && !(F.Speech && F.Speech.q && F.Speech.q.length > 6)) return F.SAY(id, slots, voice).then(() => true);
  return F.SAYF(id, slots, voice);
}
F.on('press', th => {
  const prev = lastPress; lastPress = th;
  if (!prev || prev === th || !(F.UI && F.UI.freePlay ? F.UI.freePlay() : !(F.Task && F.Task.current))) return;
  const S = F.Speech; if (!S || !S.q || !S.q.length) return;
  S.q = S.q.filter(it => { if ((it.voice || '') === '' && /^\d{1,3}!$/.test(it.s)) { if (it.done) it.done(); return false; } return true; });
});
Castle.lastPress = () => lastPress;
Castle.say = say;

/* ================================================================== kit for things files */
const kit = Castle.kit = {
  V3, ease, say,
  // a VOX model if the id exists (MODELS-*), else the fallback id (tmp_)
  model(id, opts, fb, fbOpts) { if (id && has(id)) return F.VOX.make(id, opts || {}); if (fb && has(fb)) return F.VOX.make(fb, fbOpts || opts || {}); const g = new THREE.Group(); return g; },
  part(th, names) { for (const n of [].concat(names)) if (th.parts && th.parts[n]) return th.parts[n]; return null; },
  tw: (ms, fn) => F.T.tween(ms, fn),
  sleep: ms => F.T.sleep(ms),
  wpos(th, dy) { return V3(th.obj.position.x, th.obj.position.y + (dy || 1), th.obj.position.z); },
  burst(pos, o) { if (F.FX && F.FX.burst) F.FX.burst(pos, o); },
  sparkle(pos, c) { if (F.FX && F.FX.sparkle) F.FX.sparkle(pos, c); },
  sfx(name, ...a) { try { if (F.sfx[name]) F.sfx[name](...a); } catch (e) {} },
  // spin, hop, swing… on any Object3D; all return Promises and end at rest (unless hold)
  hop(o, h = 0.4, ms = 450) { const y0 = o.position.y; return F.T.tween(ms, k => { o.position.y = y0 + Math.sin(k * Math.PI) * h; }).then(() => { o.position.y = y0; }); },
  spin(o, turns = 1, ms = 900, axis = 'y') { const a0 = o.rotation[axis]; return F.T.tween(ms, k => { o.rotation[axis] = a0 + ease.inOut(k) * turns * Math.PI * 2; }).then(() => { o.rotation[axis] = a0; }); },
  swing(o, amp = 0.4, ms = 2400, axis = 'z', n = 3) { const a0 = o.rotation[axis]; return F.T.tween(ms, k => { o.rotation[axis] = a0 + Math.sin(k * Math.PI * 2 * n) * amp * (1 - k); }).then(() => { o.rotation[axis] = a0; }); },
  wobble(o, amp = 0.12, ms = 700) { const a0 = o.rotation.z; return F.T.tween(ms, k => { o.rotation.z = a0 + Math.sin(k * Math.PI * 4) * amp * (1 - k); }).then(() => { o.rotation.z = a0; }); },
  squash(o) { return F.FX && F.FX.pop ? F.FX.pop(o) : Promise.resolve(); },
  rotTo(o, axis, to, ms = 500) { const a0 = o.rotation[axis]; return F.T.tween(ms, k => { o.rotation[axis] = U.lerp(a0, to, ease.out(k)); }); },
  moveTo(o, x, y, z, ms = 500) { const p0 = o.position.clone(); return F.T.tween(ms, k => { const e = ease.inOut(k); o.position.set(U.lerp(p0.x, x, e), U.lerp(p0.y, y, e), U.lerp(p0.z, z, e)); }); },
  scaleTo(o, s, ms = 400) { const s0 = o.scale.x; return F.T.tween(ms, k => o.scale.setScalar(U.lerp(s0, s, ease.out(k)))); },
  // temporary child model(s) that live for ttl ms (visible state change), then shrink away
  temp(th, obj, x, y, z, ttl = 3000) {
    obj.position.set(x, y, z); th.obj.add(obj);
    obj.traverse(m => { m.userData.thing = th; });
    F.T.timeout(() => { const s0 = obj.scale.x; F.T.tween(300, k => obj.scale.setScalar(s0 * (1 - k))).then(() => { if (obj.parent) obj.parent.remove(obj); }); }, ttl);
    return obj;
  },
  // n items laid out as rows of ten (+ the rest), popping in one by one; counted when count:true
  async row(th, make, n, o) {
    o = o || {};
    const g = new THREE.Group(); const sp = o.sp || 0.22, y = o.y || 1.2, z = o.z || 0.6;
    g.position.set(0, y, z); th.obj.add(g);
    const items = [];
    for (let i = 0; i < n; i++) {
      const it = make(i); const r = Math.floor(i / 10), c = i % 10;
      it.position.set((c - 4.5) * sp + (c >= 5 ? sp * 0.35 : 0), -r * sp * 1.25, r * 0.02); it.scale.setScalar(0.001); g.add(it); items.push(it);
      F.T.tween(220, k => it.scale.setScalar(Math.max(0.001, ease.back(k) * (o.s || 1))));
      if (o.count) { if (F.sfx.pling) F.sfx.pling(i % 8); }
      await F.T.sleep(o.ms || 140);
    }
    if (o.count && n >= 10) say('castle_n', { n: Math.min(n, 20) });
    F.T.timeout(() => { F.T.tween(350, k => g.scale.setScalar(1 - k)).then(() => { if (g.parent) g.parent.remove(g); }); }, o.ttl || 3500);
    return g;
  },
  // 1-in-10 surprise (F.BEH's if present)
  maybeSurprise(th, p = 0.1) {
    if (th.def.surprise === false) return;
    if (F.rand() >= p) return;
    if (F.BEH && F.BEH.defs && F.BEH.defs.surprise && F.BEH.run) { F.BEH.run(th, 'surprise', {}); return; }
    kit.surprise(th);
  },
  surprise(th, kind) {
    const p = kit.wpos(th, 1.6);
    kind = kind || U.pick(F.rand, ['confetti', 'rainbow', 'coin', 'hearts']);
    if (kind === 'coin') { kit.sfx('coin'); if (F.Eco && F.Eco.add) F.Eco.add(1, { from: th.id, reason: 'surprise' }); if (F.FX.float) F.FX.float('+1', p); }
    else if (kind === 'rainbow') { kit.burst(p, { n: 36, colors: [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc], speed: 2.2, up: 4, life: 1.6 }); kit.sfx('chime'); }
    else if (kind === 'hearts') { kit.burst(p, { n: 18, colors: [0xff7fb0, 0xff5d8f, 0xffc8a8], speed: 1.2, up: 3, gravity: 1, life: 1.6, size: 0.12 }); kit.sfx('giggle'); }
    else { kit.burst(p, { n: 40, speed: 3, up: 5, life: 1.5 }); kit.sfx('tada'); }
    say('castle_overrask');
    th.reactedVisibly = true;
  },
  // common wrapper: squash + run fn + surprise; guarantees reactedVisibly when fn animates
  react(th, fn) {
    return async () => {
      th.reactedVisibly = true;
      kit.squash(th.obj);
      try { await fn(th); } catch (e) { console.error('react', th.type, e); }
      kit.maybeSurprise(th);
    };
  },
  // place a thing into a castle room (local coords lx ∈ 0..14, lz ∈ 0..10); legacy id c_<room>_<type>[_idx]
  spawnIn(roomId, type, lx, lz, o) {
    const r = room(roomId); if (!r) return null;
    o = Object.assign({}, o); o.id = o.id || ('c_' + roomId + '_' + type + (o.idx != null ? '_' + o.idx : ''));
    return B.spawnIn(r.bld, r.key, type, lx, lz, o);
  },
};

/* ================================================================== Fetårnet wallpaper slot (Møbelbua 'vegg' items) → r_fetarn {tapet} */
function tapetOpts() {
  const it = F.save.shop && F.save.shop.slots && F.save.shop.slots.vegg;
  if (!it) return {};
  return /blomst/.test(it) ? { tapet: 'blomst' } : /stripe/.test(it) ? { tapet: 'stripe' } : {};
}
function applyTapet(anim) {
  const T = B.plans.tarn, c = T && T.built && T.cells.find(q => q.f === 0);
  if (!c || !c.group || !c.shellObj || !/r_fetarn/.test(c.shell || '')) return;
  const t = tapetOpts(); if (!t.tapet && !c._tapet) return;
  if (c._tapet === t.tapet) return;
  c._tapet = t.tapet;
  B.remakeShell('tarn', c.key, t);
  if (anim && F.FX && F.FX.sparkle) F.FX.sparkle(V3(c.center.x, c.f * FH + 3, T.oz + 1));
}
F.on('placed', (kind, key) => { if (kind === 'slot' && key === 'vegg') applyTapet(true); });
F.on('bldBuilt', id => { if (id === 'tarn') applyTapet(false); });

/* ================================================================== boot */
F.on('boot', () => {
  try { buildExterior(); } catch (e) { console.error('castle exterior', e); }
  try { B.build('slott'); } catch (e) { console.error('castle interior', e); }
  try { fallbackTarn(); refreshRooms(); } catch (e) { console.error('castle tower fallback', e); }
  F.emit('castleBuilt');
  F.emit('castleReady');
});
// debug helpers (F.dbg is created by js/debug.js, which loads later)
F.on('boot', () => {
  if (!F.dbg) return;
  F.dbg.room = () => Castle.cur;
  F.dbg.overview = on => { Castle.overview(on !== false); F.debug.frames(5); return Castle.ov; };
  F.dbg.towers = (a, b, c) => { Castle.towers.tall.setFloors(a); Castle.towers.les.setFloors(b); Castle.towers.skriv.setFloors(c); return [a, b, c]; };
});
})();
