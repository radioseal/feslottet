/* Feslottet – PARK «Slottsparken» (WP CASTLE+PARK). DESIGN §4.2, §8.6 (plots), §9.8 (Tallhagen).
   Hand-built reserved square x,z ∈ [−112, 112] around the castle (centre 0,0; south = +z, the camera looks north).
   Terrain comes from WORLD's reserve hooks (height + colour per 0.5 m cell): flat lawn with mowing stripes, stone paths,
   paved forecourt, sand playground, carved moat and duck pond (WORLD's global water fills them), a terraced kite hill.
   F.Park = { zones:{name:{x,z,r}}, LAYOUT, tallvei:{stones:[things], highlight(n), hide(n), show(n)}, tallhage:{beds:{n:thing}, setBloom(n, lvl0..4)},
              plots:[thingIds], shops:{shopId:thing}, groundAt(x,z), placePlot(plotId, itemId) }
   F.spawnPoint = Fetårnet's doorstep (DESIGN2; it was the forecourt in front of the drawbridge).
   DESIGN2 (WP2 HOME): Fetårnet stands north of Fehagen (tower.js): the lawn x 70–90, z −102…−84 is kept clear, a 2.6 m path runs from
   the tower door through Fehagen (round the plots) to its south arch, flower beds and a bench sit by the door, F.spawnPoint is the
   doorstep (80, −85.8). Park spot 'borggården' (6, 8) is the courtyard post. c_vindebru (WP1's def) → F.Castle.bridge.tap(). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const R0 = 112;

/* ================================================================== layout data */
const Z = {
  plaza: { x: 0, z: 40, r: 14 }, market: { x: -48, z: 52, r: 15 }, lekeplass: { x: -68, z: 24, r: 14 }, dam: { x: 72, z: 6, r: 16 },
  rosehage: { x: -38, z: -56, r: 14 }, labyrint: { x: 0, z: -74, r: 13 }, fehage: { x: 80, z: -72, r: 14 }, tallhage: { x: 47, z: 94, r: 18 },
  drage: { x: -66, z: 90, r: 16 }, sorpark: { x: 0, z: 80, r: 20 }, stall: { x: -66, z: -70, r: 12 }, drivhus: { x: 46, z: -66, r: 10 },
};
// path polylines [ [x,z]..., width ]
const PATHS = [
  [[[0, 27], [0, 112]], 4.2],                                        // main south axis (Tallveien)
  [[[-38, -30], [38, -30], [38, 30], [-38, 30], [-38, -30]], 3.2],  // ring round the moat
  [[[-38, 0], [-112, 0]], 3], [[[38, 0], [54, -4], [72, -8.6], [90, -4], [112, 0]], 3],        // east road bends round the south of Andedammen [[[0, -30], [0, -58]], 3], [[[0, -58], [17, -58], [17, -91], [0, -91], [0, -112]], 3],
  [[[-30, 44], [-40, 48]], 3], [[[-38, 30], [-58, 26], [-66, 22]], 3],                  // to market + playground
  [[[38, 22], [52, 18], [56, 14]], 3], [[[38, -24], [58, -42], [80, -57]], 3],          // to the pond + Fehagen
  [[[-38, -26], [-38, -44]], 3], [[[-40, -30], [-62, -60]], 3],
  [[[30, -30], [44, -56]], 2.6], [[[0, 72], [-20, 72]], 2.6], [[[0, 74], [22, 74]], 2.6],
  [[[0, 92], [-24, 96]], 2.6], [[[0, 88], [24, 92]], 2.6], [[[-24, 96], [-52, 92]], 2.6], [[[20, 50], [30, 50]], 2.6],
  [[[0, 60], [40, 62]], 2.4], [[[56, 14], [60, 22], [86, 22]], 2.4],
  [[[80, -87.6], [80, -82.6], [76, -79.4], [76, -62.6], [80, -59.4], [80, -57]], 2.6],   // Fetårnet's door → round the plots → Fehagen's arch
  [[[80, -57], [96, -57], [103.5, -57.6], [103.5, -60.5]], 2.4],                            // → Vennehagen's gate (P1 reservation)
];
const TARN = { x0: 70, x1: 90, z0: -102, z1: -84 };   // the tower's lawn: no decor
// DESIGN2 P1: Vennehagen (the friends' garden) is reserved east of Fehagen – a fenced lawn with 7 slots for befriended animals' homes
const VENNE = { x0: 97.5, x1: 109.5, z0: -84.5, z1: -59.5, gate: { x: 103.5, z: -59.5 },
  slots: [[100, -82], [107, -82], [100, -73.5], [107, -73.5], [100, -65], [107, -65], [103.5, -78]] };
const PLAZA = { x0: -24, x1: 32, z0: 27.2, z1: 52 };
const MARKET = { x0: -64, x1: -32, z0: 38, z1: 70 };   // z 66-70: paved walk in front of the south row (it faces the camera)
const SAND = { x: -68, z: 24, r: 13 };
const POND = { x: 72, z: 6, rx: 16, rz: 11, islet: { x: 76, z: 3, r: 3.2 } };
const HILL = { x: -66, z: 90, r: 18, h: 3.5 };
const MAZE = { x: 0, z: -74, half: 12 };
// Tallhagen: 11 numeral beds 10–20, two rows
const TALLHAGE = [];
for (let n = 10; n <= 20; n++) { const i = n - 10, row = i < 6 ? 0 : 1, k = row ? i - 6 : i; TALLHAGE.push({ n, x: 26 + k * 8 + (row ? 4 : 0), z: row ? 101 : 89 }); }
const STONES = []; for (let n = 10; n <= 20; n++) STONES.push({ n, x: 0, z: 60 + (n - 10) * 4.6 });
const HINKE = { x: -30, z: 100 };

function segPt(px, pz, ax, az, bx, bz) { const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1; let t = ((px - ax) * vx + (pz - az) * vz) / L; t = U.clamp(t, 0, 1); return Math.hypot(px - (ax + t * vx), pz - (az + t * vz)); }
function pathDist(x, z) {   // returns distance minus half-width (<0 = on path)
  let best = 99;
  for (const [pts, w] of PATHS) for (let i = 0; i < pts.length - 1; i++) { const d = segPt(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) - w / 2; if (d < best) best = d; }
  return best;
}
const inRect = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const moatRing = (x, z) => (Math.abs(x) <= 34 && Math.abs(z) <= 26) && !(Math.abs(x) <= 28.2 && Math.abs(z) <= 20.2);
const pondQ = (x, z) => ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2;

/* ================================================================== terrain (WORLD reserve hooks) */
function height(x, z) {
  if (moatRing(x, z)) return -0.8;
  const q = pondQ(x, z);
  if (q < 1) { if (Math.hypot(x - POND.islet.x, z - POND.islet.z) < POND.islet.r) return 0.25; return q < 0.55 ? -0.95 : -0.6; }
  const dh = Math.hypot(x - HILL.x, z - HILL.z);
  if (dh < HILL.r) return Math.round(HILL.h * (1 - dh / HILL.r) * 2) / 2;
  if (Math.abs(x) > R0 - 1.5 || Math.abs(z) > R0 - 1.5) return 0;
  return 0;
}
const C = n => F.PAL[n];
function color(x, z, h) {
  if (h < -0.1) return C('sand');
  if (moatRing(x, z) || pondQ(x, z) < 1.12) return C('pathStone');                       // banks
  if (Math.abs(x) <= 28.2 && Math.abs(z) <= 20.2) return C('grass');                      // castle courtyard
  const pd = pathDist(x, z);
  const fx = Math.floor(x / 2), fz = Math.floor(z / 2);
  if (inRect(x, z, PLAZA)) {
    const d = Math.hypot(x - 0, z - 40);
    if (d < 6.5) { const a = Math.atan2(z - 40, x); const ring = Math.floor(d / 1.6); if (ring === 0) return C('butter'); return ((Math.floor((a + Math.PI) / (Math.PI / 6)) + ring) & 1) ? C('blossom') : C('cream2'); }
    if (d < 7.5) return C('gold');
    return ((fx + fz) & 1) ? C('pathStone') : C('cream2');
  }
  if (inRect(x, z, MARKET)) return ((fx + fz) & 1) ? C('pathStone') : C('stone2');
  if (pd < 0) return pd > -0.5 ? C('stone2') : C('pathStone');
  if (Math.hypot(x - SAND.x, z - SAND.z) < SAND.r) return Math.hypot(x - SAND.x, z - SAND.z) > SAND.r - 0.6 ? C('woodLight') : C('sand');
  for (const b of TALLHAGE) if (Math.abs(x - b.x) < 3 && Math.abs(z - b.z) < 4) return (Math.abs(x - b.x) > 2.5 || Math.abs(z - b.z) > 3.5) ? C('woodLight') : C('soil');
  if (Math.abs(x - Z.drivhus.x) < 9 && z > -92 && z < -72) return ((Math.floor(z / 1.5)) & 1) ? C('soil') : C('grassDark');   // kitchen garden rows
  if (Math.abs(x - Z.fehage.x) < 15 && Math.abs(z - Z.fehage.z) < 13) return (Math.floor((z - Z.fehage.z + 13) / 2.5) & 1) ? C('mint') : C('grass');   // mowing stripes (a checkerboard read as a debug grid)
  if (Math.hypot(x - HILL.x, z - HILL.z) < HILL.r) return (h >= 3) ? C('leaf2') : C('grass');
  // mowing stripes
  return (Math.floor((x + R0) / 4) & 1) ? C('grass') : C('leaf2');
}
const RES = { name: 'park', x0: -R0, z0: -R0, x1: R0, z1: R0, y: 0, blend: 12, noGen: true, height, color };
if (F.W && F.W.reserve) F.W.reserve(RES);
// worldgen.js (loaded later) registers a plain 'park' reserve with the same name – take it back at boot, before chunks load
F.on('boot', () => { if (!F.W || !F.W.reserve) return; F.W.reserve(RES); if (F.W.chunks && F.W.chunks.size && F.W.reloadAll) F.W.reloadAll(); });

/* ================================================================== tmp decor models (if MODELS-3 has none) */
const has = id => F.VOX.has(id);
function vdef(id, d) { if (!has(id)) F.VOX.def(id, d); }
vdef('tmp_tree', {
  size: [26, 44, 26], scale: 1 / 8,
  build(v, o) {
    const k = o.kind || 'rund';
    v.cyl(13, 0, 13, 1.6, 20, 'woodDark'); v.box(12, 0, 12, 14, 2, 14, 'wood');
    const L1 = k === 'kirsebær' ? 'blossom' : 'leaf', L2 = k === 'kirsebær' ? 'pink' : 'leaf2';
    v.ellipsoid(13, 28, 13, 11, 10, 11, L1); v.ellipsoid(8, 24, 14, 6, 6, 6, L1); v.ellipsoid(18, 25, 11, 6, 6, 6, L1); v.ellipsoid(13, 36, 13, 7, 6, 7, L1);
    v.paint((x, y, z, c) => (c === F.PAL[L1] && F.U.hash2(x * 3 + z, y, 7) < 0.28) ? F.PAL[L2] : null);
    if (k === 'eple') v.paint((x, y, z, c) => (c === F.PAL.leaf && F.U.hash2(x + z * 5, y * 3, 3) < 0.05 && y < 34) ? F.PAL.red : null);
    if (k === 'rund') v.paint((x, y, z, c) => (c === F.PAL.leaf && F.U.hash2(x + z * 5, y * 3, 4) < 0.025) ? F.PAL.blossom : null);
  },
});
vdef('tmp_hedge', { size: [8, 5, 4], scale: 1 / 4, build(v, o) { v.box(0, 0, 0, 7, (o.h || 5) - 1, 3, 'leafDark'); v.paint((x, y, z, c) => F.U.hash2(x * 7 + z, y * 3 + z, 2) < 0.3 ? F.PAL.leaf : null); if (o.flowers) v.paint((x, y, z, c) => (y >= 3 && F.U.hash2(x + z * 9, y, 11) < 0.12) ? F.PAL[o.flowers] : null); } });
vdef('tmp_flowers', {   // a clump of 7 flowers with plus-shaped heads (~500 tris; it is used a few hundred times)
  size: [14, 6, 14], scale: 1 / 16,
  build(v, o) {
    const cs = o.cs || ['pink', 'yellow', 'white'];
    const P = [[2, 2], [7, 2], [12, 3], [4, 7], [10, 7], [3, 12], [9, 11]];
    P.forEach(([x, z], i) => { const h = 2 + (i % 2); v.box(x, 0, z, x, h, z, 'leaf'); if (i % 2) v.set(x + 1, 1, z, 'leaf2'); const c = cs[i % cs.length];
      v.set(x - 1, h + 1, z, c); v.set(x + 1, h + 1, z, c); v.set(x, h + 1, z - 1, c); v.set(x, h + 1, z + 1, c); v.set(x, h + 1, z, 'yellow'); });
  },
});
vdef('tmp_bush', { size: [12, 9, 12], scale: 1 / 8, build(v, o) { v.ellipsoid(6, 4, 6, 5.5, 4.5, 5.5, 'leaf'); v.paint((x, y, z, c) => F.U.hash2(x * 5 + z, y, 9) < 0.25 ? F.PAL.leaf2 : (o.c && F.U.hash2(x + z * 3, y * 7, 1) < 0.08 ? F.PAL[o.c] : null)); } });
vdef('tmp_fence', { size: [16, 7, 2], scale: 1 / 8, build(v) { for (let x = 0; x < 16; x += 3) { v.box(x, 0, 0, x + 1, 5, 1, 'white'); v.set(x, 6, 0, 'white'); } v.box(0, 2, 0, 15, 2, 0, 'white'); v.box(0, 4, 0, 15, 4, 0, 'white'); } });
vdef('tmp_lamppost', { size: [8, 46, 8], scale: 1 / 16, build(v) { v.box(2, 0, 2, 5, 2, 5, 'navySoft'); v.box(3, 3, 3, 4, 36, 4, 'navySoft'); v.box(1, 37, 1, 6, 37, 6, 'gold'); v.box(2, 38, 2, 5, 42, 5, 'lamp'); v.box(1, 43, 1, 6, 43, 6, 'gold'); v.set(3, 44, 3, 'gold'); v.set(4, 45, 4, 'gold'); } });
vdef('tmp_parkgate', {
  size: [36, 26, 4], scale: 1 / 4,
  build(v) {
    for (const x of [0, 30]) { v.box(x, 0, 0, x + 5, 19, 3, 'stone'); v.box(x - 1, 20, 0, x + 6, 21, 3, 'stone2'); v.cone(x + 2.5, 22, 1.5, 3, 4, 'roofPink'); }
    for (let x = 6; x < 30; x++) { const y = 17 + Math.round(Math.sin((x - 6) / 23 * Math.PI) * 5); v.box(x, y, 1, x, y + 1, 2, 'white'); if (x % 3 === 0) v.set(x, y + 2, 1, x % 2 ? 'pink' : 'roofMint'); }
  },
});
vdef('tmp_planter', { size: [14, 9, 14], scale: 1 / 10, build(v, o) { v.cyl(7, 0, 7, 6.5, 4, 'stone2'); v.cyl(7, 4, 7, 7, 1, 'stone'); v.cyl(7, 4, 7, 5.5, 1, 'soil'); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 4 : 2.2; const x = Math.round(7 + Math.cos(a) * r), z = Math.round(7 + Math.sin(a) * r); v.box(x, 5, z, x, 6, z, 'leaf'); v.set(x, 7, z, i % 3 ? (o.c || 'pink') : 'white'); } v.box(7, 5, 7, 7, 7, 7, 'leaf'); v.set(7, 8, 7, 'yellow'); } });
vdef('tmp_crate', { size: [8, 7, 6], scale: 1 / 10, build(v, o) { v.box(0, 0, 0, 7, 4, 5, 'woodLight'); v.box(0, 2, 0, 7, 2, 5, 'wood'); for (let x = 1; x < 7; x += 2) for (let z = 1; z < 5; z += 2) v.box(x, 5, z, x + 1, 6, z + 1, o.c || 'red'); } });
vdef('tmp_buntpole', { size: [6, 40, 6], scale: 1 / 10, build(v) { v.box(2, 0, 2, 3, 36, 3, 'white'); v.box(1, 37, 1, 4, 38, 4, 'gold'); v.set(2, 39, 2, 'pink'); for (let y = 30; y < 36; y += 2) { v.set(4, y, 2, ['pink', 'butter', 'sky'][y % 3]); v.set(1, y, 3, ['mint', 'lilac', 'coral'][y % 3]); } } });
vdef('tmp_picnic', { size: [24, 3, 20], scale: 1 / 10, build(v) { for (let z = 0; z < 20; z++) for (let x = 0; x < 24; x++) v.set(x, 0, z, ((x >> 2) + (z >> 2)) & 1 ? 'red' : 'white'); v.box(4, 1, 4, 6, 2, 6, 'woodLight'); v.box(16, 1, 12, 17, 2, 13, 'cherry'); v.box(10, 1, 8, 12, 1, 10, 'butter'); } });
vdef('tmp_mazehedge', { size: [8, 5, 8], scale: 1 / 4, build(v) { v.box(0, 0, 0, 7, 4, 7, 'leafDark'); v.paint((x, y, z, c) => F.U.hash2(x * 7 + z, y * 3, 5) < 0.3 ? F.PAL.leaf : (y === 4 && F.U.hash2(x + z * 5, 1, 9) < 0.06 ? F.PAL.blossom : null)); } });
vdef('tmp_arch', { size: [28, 26, 4], scale: 1 / 8, build(v, o) { for (const x of [0, 25]) v.box(x, 0, 1, x + 2, 19, 2, 'white'); for (let x = 0; x < 28; x++) { const y = 19 + Math.round(Math.sin(x / 27 * Math.PI) * 5); v.box(x, y, 0, x, y + 1, 3, 'white'); } v.paint((x, y, z, c) => (F.U.hash2(x * 3 + z, y, 2) < 0.45 && c === F.PAL.white) ? F.PAL[F.U.hash2(x, y, 7) < 0.5 ? 'leaf' : (o.c || 'rose')] : null); } });
// tiny lawn flowers (a 1 m patch of daisies / buttercups / clover; ~100 tris) – the lawns are never bare
vdef('tmp_daisies', { size: [16, 3, 16], scale: 1 / 9, build(v, o) { const cs = o.cs || ['white', 'yellow']; for (let i = 0; i < 9; i++) { const x = 1 + Math.round(F.U.hash2(i, 3, o.k || 1) * 13), z = 1 + Math.round(F.U.hash2(i, 7, o.k || 1) * 13); v.set(x, 0, z, 'leaf'); v.set(x, 1, z, cs[i % cs.length]); if (i % 3 === 0) v.set(x + 1, 0, z, 'leaf2'); } } });
vdef('tmp_tuft', { size: [7, 5, 7], scale: 1 / 12, build(v, o) { const k = o.k || 0; for (let i = 0; i < 5; i++) { const x = 1 + ((i * 3 + k) % 5), z = 1 + ((i * 2 + k * 3) % 5), h = 1 + ((i + k) % 3); v.box(x, 0, z, x, h, z, i % 2 ? 'leaf2' : 'grassDark'); } } });
vdef('tmp_fountain_small', { size: [16, 14, 16], scale: 1 / 10, build(v) { v.cyl(8, 0, 8, 7.5, 3, 'stone2'); v.cyl(8, 1, 8, 6.5, 2, 'water'); v.cyl(8, 3, 8, 1.5, 6, 'stone'); v.cyl(8, 9, 8, 3, 1, 'stone2'); v.set(8, 10, 8, 'sky'); v.set(8, 11, 8, 'sky'); v.set(8, 12, 8, 'white'); } });

/* ================================================================== static decor: voxel-aware merge, one batch per 32 m cell */
const statics = [];   // {id, o, x, y, z, ry, s}
function deco(id, x, z, o) { o = o || {}; statics.push({ id: has(o.real) ? o.real : id, opts: o.opts || {}, x, y: o.y != null ? o.y : groundAt(x, z), z, ry: o.ry || 0, s: o.s || 1 }); }
function groundAt(x, z) { return F.W && F.W.groundY ? Math.max(0, height(x, z)) : 0; }
function mergeStatics(list) {
  const cells = new Map();
  const m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
  for (const it of list) {
    let geo; try { geo = F.VOX.geometry(it.id, it.opts); } catch (err) { console.warn('park deco', it.id, err); continue; }
    // lead (perf): ground-hugging decor (tufts, flowers, daisies, picnic blankets < 0.6 m) goes into its own no-shadow meshes –
    // ~455k triangles out of the shadow pass, the shadows were invisible at this scale anyway
    let ymax = 0; const hgt = (gs, off) => { for (const c in gs) { const q = gs[c]; if (!q.boundingBox) q.computeBoundingBox(); ymax = Math.max(ymax, (q.boundingBox.max.y + (off ? off[1] : 0)) * it.s); } };
    hgt(geo.body, null); for (const pn in geo.parts) hgt(geo.parts[pn].geo, geo.parts[pn].pos);
    const key = Math.floor(it.x / 32) + ',' + Math.floor(it.z / 32) + (ymax < 0.6 ? ',lo' : '');
    let cell = cells.get(key); if (!cell) cells.set(key, cell = {});
    const addGeo = (gs, off) => {
      for (const cls in gs) {
        const g = gs[cls]; const acc = cell[cls] || (cell[cls] = { P: [], N: [], Cc: [], I: [] });
        e.set(0, it.ry, 0); q.setFromEuler(e); sc.set(it.s, it.s, it.s); pv.set(it.x, it.y, it.z);
        m4.compose(pv, q, sc); if (off) m4.multiply(new THREE.Matrix4().makeTranslation(off[0], off[1], off[2]));
        nm.getNormalMatrix(m4);
        const P = g.attributes.position, N = g.attributes.normal, Cl = g.attributes.color, base = acc.P.length / 3;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m4); acc.P.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); acc.N.push(v.x, v.y, v.z); acc.Cc.push(Cl.getX(i), Cl.getY(i), Cl.getZ(i)); }
        const I = g.index; for (let i = 0; i < I.count; i++) acc.I.push(I.getX(i) + base);
      }
    };
    addGeo(geo.body, null);
    for (const pn in geo.parts) addGeo(geo.parts[pn].geo, geo.parts[pn].pos);
  }
  const out = [];
  cells.forEach((cell, key) => {
    const [kx, kz] = key.split(',').map(Number), lo = key.endsWith(',lo');
    for (const cls in cell) {
      const a = cell[cls]; const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(a.N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(a.Cc, 3));
      g.setIndex(a.I.length > 65535 ? new THREE.Uint32BufferAttribute(a.I, 1) : new THREE.Uint16BufferAttribute(a.I, 1)); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, F.VOX.material(cls === 'opaque' ? 'opaque' : cls)); m.userData.cx = kx * 32 + 16; m.userData.cz = kz * 32 + 16; m.castShadow = cls === 'opaque' && !lo; m.userData.lo = lo; m.receiveShadow = cls === 'opaque'; if (cls === 'glass') m.renderOrder = 2;
      out.push(m);
    }
  });
  return out;
}

/* ================================================================== decor layout */
function buildDecor() {
  const rng = U.rng(4242);
  // border hedge with 4 gate gaps + gate arches
  for (let t = -R0 + 1; t < R0; t += 2) {
    for (const [x, z, ry] of [[t, -R0 + 0.5, 0], [t, R0 - 0.5, 0], [-R0 + 0.5, t, Math.PI / 2], [R0 - 0.5, t, Math.PI / 2]]) {
      if (Math.abs(t) < 5) continue;
      deco('tmp_hedge', x, z, { ry, opts: { flowers: (Math.floor(t / 2) % 5 === 0) ? 'pink' : null } });
    }
  }
  for (const [x, z, ry] of [[0, -R0 + 0.5, 0], [0, R0 - 0.5, 0], [-R0 + 0.5, 0, Math.PI / 2], [R0 - 0.5, 0, Math.PI / 2]]) deco('tmp_parkgate', x, z, { ry });
  // single trees (blossom / apple / round), never in groves
  const free = (x, z, r) => {
    if (Math.abs(x) < 40 && Math.abs(z) < 32) return false;
    if (pathDist(x, z) < r) return false;
    if (inRect(x, z, { x0: PLAZA.x0 - 3, x1: PLAZA.x1 + 3, z0: PLAZA.z0, z1: PLAZA.z1 + 3 }) || inRect(x, z, { x0: MARKET.x0 - 3, x1: MARKET.x1, z0: MARKET.z0 - 3, z1: MARKET.z1 + 3 })) return false;
    if (pondQ(x, z) < 1.6) return false;
    for (const k in Z) { const zz = Z[k]; if (Math.hypot(x - zz.x, z - zz.z) < zz.r + r) return false; }
    if (x > 18 && x < 76 && z > 82 && z < 108) return false;
    if (x > TARN.x0 - 4 && x < TARN.x1 + 4 && z > TARN.z0 - 4 && z < TARN.z1 + 2) return false;
    if (x > VENNE.x0 - 4 && x < VENNE.x1 + 4 && z > VENNE.z0 - 4 && z < VENNE.z1 + 4) return false;
    for (const t of trees) if (Math.hypot(t[0] - x, t[1] - z) < 9) return false;
    return Math.abs(x) < R0 - 4 && Math.abs(z) < R0 - 4;
  };
  const trees = [];
  for (let i = 0; i < 900 && trees.length < 70; i++) {
    const x = (rng() * 2 - 1) * (R0 - 6), z = (rng() * 2 - 1) * (R0 - 6);
    if (!free(x, z, 3)) continue;
    trees.push([x, z]);
    const kind = U.pick(rng, ['kirsebær', 'eple', 'rund', 'rund', 'kirsebær']);
    // MODELS-3's low-poly tree (≈1.8k tris instead of ≈5k: keeps the forecourt view under the 600k triangle budget)
    deco('tmp_tree', x, z, { real: 'n_tre_lo', opts: { kind }, ry: rng() * 6.28, s: 0.85 + rng() * 0.35 });
  }
  Park.trees = trees;
  // flower clumps along paths, bushes, lamp posts
  for (let i = 0; i < 1600; i++) {
    const x = (rng() * 2 - 1) * (R0 - 4), z = (rng() * 2 - 1) * (R0 - 4);
    const pd = pathDist(x, z);
    if (pd < 0.6 || pd > 2.2) continue;
    if (Math.abs(x) < 36 && Math.abs(z) < 28) continue;
    if (inRect(x, z, PLAZA) || inRect(x, z, MARKET) || pondQ(x, z) < 1.3) continue;
    if (inRect(x, z, TARN) || inRect(x, z, VENNE)) continue;
    if (rng() < 0.12) deco('tmp_flowers', x, z, { opts: { cs: U.pick(rng, [['pink', 'white', 'yellow'], ['lilac', 'white', 'sky'], ['red', 'yellow', 'orange'], ['rose', 'blossom', 'white']]) }, ry: rng() * 6.28 });
    else if (rng() < 0.03) deco('tmp_bush', x, z, { opts: { c: U.pick(rng, ['pink', 'yellow', null]) }, ry: rng() * 6.28 });
  }
  // lawn details: daisy patches, flower clumps and bushes on the open grass (away from paths, zones, trees and water)
  const lawnFree = (x, z, r) => {
    if (Math.abs(x) < 38 && Math.abs(z) < 30) return false;
    if (pathDist(x, z) < r + 0.6) return false;
    if (inRect(x, z, { x0: PLAZA.x0 - 2, x1: PLAZA.x1 + 2, z0: PLAZA.z0, z1: PLAZA.z1 + 2 }) || inRect(x, z, { x0: MARKET.x0 - 3, x1: MARKET.x1 + 2, z0: MARKET.z0 - 3, z1: MARKET.z1 + 3 })) return false;
    if (pondQ(x, z) < 1.35 || Math.hypot(x - SAND.x, z - SAND.z) < SAND.r + 1.5) return false;
    if (Math.abs(x - MAZE.x) < 16 && Math.abs(z - MAZE.z) < 16) return false;
    for (const b of TALLHAGE) if (Math.abs(x - b.x) < 4 && Math.abs(z - b.z) < 5) return false;
    for (const t of trees) if (Math.hypot(t[0] - x, t[1] - z) < 2.6) return false;
    if (Math.abs(x - Z.fehage.x) < 16 && Math.abs(z - Z.fehage.z) < 14) return false;
    if (inRect(x, z, TARN) || inRect(x, z, VENNE)) return false;
    if (Math.abs(x - Z.drivhus.x) < 10 && z > -93 && z < -56) return false;
    return Math.abs(x) < R0 - 3 && Math.abs(z) < R0 - 3;
  };
  const DAIS = [['white', 'yellow'], ['white', 'pink'], ['yellow', 'butter'], ['lilac', 'white'], ['white', 'white', 'yellow']];
  for (let i = 0, n = 0; i < 6000 && n < 1500; i++) {
    const x = (rng() * 2 - 1) * (R0 - 4), z = (rng() * 2 - 1) * (R0 - 4);
    if (!lawnFree(x, z, 0.2)) continue; n++;
    deco('tmp_tuft', x, z, { opts: { k: n % 5 }, ry: rng() * 6.28, s: 0.8 + rng() * 0.6 });
  }
  for (let i = 0, n = 0; i < 6000 && n < 800; i++) {
    const x = (rng() * 2 - 1) * (R0 - 4), z = (rng() * 2 - 1) * (R0 - 4);
    if (!lawnFree(x, z, 0.5)) continue; n++;
    const q = rng();
    if (q < 0.76) deco('tmp_daisies', x, z, { opts: { cs: DAIS[n % DAIS.length], k: n % 7 }, ry: rng() * 6.28, s: 1 + rng() * 0.6 });
    else if (q < 0.9) deco('tmp_flowers', x, z, { opts: { cs: U.pick(rng, [['pink', 'white', 'yellow'], ['lilac', 'white', 'sky'], ['rose', 'blossom', 'white'], ['yellow', 'orange', 'white']]) }, ry: rng() * 6.28 });
    else deco('tmp_bush', x, z, { real: 'n_busk_lo', opts: { c: U.pick(rng, ['pink', 'yellow', null]) }, ry: rng() * 6.28, s: 0.8 + rng() * 0.4 });
  }
  // plaza flower ring + benches of flowers by the gate
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; deco('tmp_flowers', Math.cos(an) * 8.3, 40 + Math.sin(an) * 8.3, { opts: { cs: a % 2 ? ['pink', 'white'] : ['yellow', 'lilac'] }, ry: an }); }
  // forecourt life: round flower planters, low flowering hedges along the plaza edges, little bushes
  for (const [x, z] of [[-20, 31], [-20, 49], [28, 49], [-8, 44], [8, 44], [-14, 30], [14, 30]]) { deco('tmp_planter', x, z, { opts: { c: (x + z) % 3 ? 'pink' : 'butter' } }); }
  for (let t = -22; t <= 30; t += 2) { if (Math.abs(t) < 4) continue; deco('tmp_hedge', t, 53, { opts: { flowers: (t / 2) % 3 ? 'pink' : 'yellow', h: 3 } }); }
  for (let z = 30; z <= 51; z += 2) { deco('tmp_hedge', -25, z, { ry: Math.PI / 2, opts: { flowers: 'lilac', h: 3 } }); if (z < 34 || z > 46) deco('tmp_hedge', 33, z, { ry: Math.PI / 2, opts: { flowers: 'pink', h: 3 } }); }
  // playground fence + flowers
  for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; if (Math.abs(Math.sin(an)) < 0.25 && Math.cos(an) > 0) continue; deco('tmp_fence', SAND.x + Math.cos(an) * 13.6, SAND.z + Math.sin(an) * 13.6, { ry: -an + Math.PI / 2 }); }
  // hedge maze (low, 1.1 m) with a gap layout
  const M = MAZE, cell = 2;
  const maze = ['###########.###', '#.....#.......#', '#.###.#.#####.#', '#.#.....#...#.#', '#.#.#####.#.#.#', '#...#.....#...#', '###.#.###.#####', '#.....#*#.....#', '#####.#.#.###.#', '#.....#.#...#.#', '#.#####.###.#.#', '#.#.....#...#.#', '#.#.###.#.###.#', '#...#.......#.#', '#######.#######'];
  maze.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '#') return; const x = M.x - 14 + i * cell, z = M.z - 14 + j * cell; deco('tmp_mazehedge', x, z, {}); if (F.W.addBox) F.W.addBox(x - 1, z - 1, x + 1, z + 1); }));
  // a little gold star path inside the maze? no – she finds the way herself (the hedge is low: she sees over it)
  // fences round Fehagen + Rosehagen
  for (let t = -14; t <= 14; t += 2) {
    if (Math.abs(t) > 2) { deco('tmp_fence', Z.fehage.x + t, Z.fehage.z + 13.5, {}); deco('tmp_fence', Z.fehage.x + t, Z.fehage.z - 13.5, {}); }
    deco('tmp_fence', Z.fehage.x - 15, Z.fehage.z + t * 0.9, { ry: Math.PI / 2 }); deco('tmp_fence', Z.fehage.x + 15, Z.fehage.z + t * 0.9, { ry: Math.PI / 2 });
  }
  for (let t = -12; t <= 12; t += 2) { if (Math.abs(t) > 2) deco('tmp_hedge', Z.rosehage.x + t, Z.rosehage.z + 12, { opts: { flowers: 'rose', h: 3 } }); deco('tmp_hedge', Z.rosehage.x + t, Z.rosehage.z - 12, { opts: { flowers: 'rose', h: 3 } }); }
  // market square: a flower planter in the middle, crates, flower buckets, bunting poles
  deco('tmp_fountain_small', -48, 52.5, { s: 2.4 });
  deco('tmp_planter', -55, 52.5, { opts: { c: 'butter' }, s: 1.3 }); deco('tmp_planter', -41, 55.5, { opts: { c: 'pink' }, s: 1.3 });
  for (const [x, z, cs] of [[-51.5, 49.5, ['pink', 'white', 'yellow']], [-44.5, 49.5, ['lilac', 'sky', 'white']], [-51.5, 55.5, ['rose', 'butter', 'white']], [-44.5, 56, ['yellow', 'pink', 'lilac']], [-58, 49, ['pink', 'yellow', 'white']], [-58, 56, ['sky', 'lilac', 'white']]]) deco('tmp_flowers', x, z, { opts: { cs }, s: 1.4 });
  for (const [x, z] of [[-53, 68.5], [-47, 68.5], [-41, 68.5], [-35, 68.5]]) deco('tmp_flowers', x, z, { opts: { cs: ['pink', 'butter', 'white'] }, s: 1.4 });
  for (const [x, z, ry] of [[-53, 47, 0.3], [-41, 48, -0.4], [-54, 58, 0.8], [-40, 57.5, -0.2], [-47, 45.5, 0], [-47, 59.5, 0]]) deco('tmp_crate', x, z, { ry, opts: { c: ['red', 'orange', 'green', 'yellow'][Math.abs(Math.round(x + z)) % 4] } });
  for (const [x, z] of [[-34, 44], [-34, 61], [-63, 44], [-63, 61]]) deco('tmp_buntpole', x, z, {});
  // Fehagen: an arch at the gate, flowers along the fence, a little fountain in the middle
  deco('tmp_arch', Z.fehage.x, Z.fehage.z + 13.6, { opts: { c: 'pink' } });
  deco('tmp_fountain_small', Z.fehage.x, Z.fehage.z, {});
  for (let t = -13; t <= 13; t += 2.2) { if (pathDist(Z.fehage.x + t, Z.fehage.z - 12.6) > 0.4) deco('tmp_flowers', Z.fehage.x + t, Z.fehage.z - 12.6, { opts: { cs: ['pink', 'lilac', 'white'] } }); deco('tmp_flowers', Z.fehage.x - 14.2, Z.fehage.z + t * 0.9, { opts: { cs: ['yellow', 'pink', 'sky'] } }); deco('tmp_flowers', Z.fehage.x + 14.2, Z.fehage.z + t * 0.9, { opts: { cs: ['rose', 'white', 'butter'] } }); }
  // Vennehagen (P1 reservation): a low white fence with an arch at the south gate, a few flowers inside
  for (let x = VENNE.x0; x <= VENNE.x1 + 0.01; x += 2) { deco('tmp_fence', x, VENNE.z0, {}); if (Math.abs(x - VENNE.gate.x) > 2) deco('tmp_fence', x, VENNE.z1, {}); }
  for (let z = VENNE.z0 + 1; z <= VENNE.z1 - 1 + 0.01; z += 2) { deco('tmp_fence', VENNE.x0 - 0.5, z, { ry: Math.PI / 2 }); deco('tmp_fence', VENNE.x1 + 0.5, z, { ry: Math.PI / 2 }); }
  deco('tmp_arch', VENNE.gate.x, VENNE.gate.z + 0.2, { opts: { c: 'lilac' } });
  for (const [x, z] of [[98.6, -60.6], [108.4, -60.6], [98.6, -83.4], [108.4, -83.4]]) deco('tmp_flowers', x, z, { opts: { cs: ['lilac', 'pink', 'white'] }, s: 1.3 });
  // Rosehagen: rows of rose bushes, an arbour, a bench
  deco('tmp_arch', Z.rosehage.x, Z.rosehage.z + 12.2, { opts: { c: 'rose' } });
  for (let i = 0; i < 14; i++) { const x = Z.rosehage.x - 10 + (i % 7) * 3.3, z = Z.rosehage.z + (i < 7 ? -9 : 9); deco('tmp_bush', x, z, { opts: { c: ['rose', 'pink', 'yellow', 'white'][i % 4] }, s: 0.9 }); }
  for (let i = 0; i < 8; i++) deco('tmp_flowers', Z.rosehage.x - 9 + (i % 4) * 6, Z.rosehage.z + (i < 4 ? -2.5 : 2.5) + 0, { opts: { cs: ['red', 'rose', 'pink'] } });
  // the south avenue: flower borders along Tallveien
  for (let z = 58; z <= 108; z += 3.3) { deco('tmp_flowers', -3.4, z, { opts: { cs: ['pink', 'yellow', 'white'] } }); deco('tmp_flowers', 3.4, z, { opts: { cs: ['lilac', 'sky', 'white'] } }); }
  // picnic lawn blankets
  deco('tmp_picnic', 44, 64, { ry: 0.3 }); deco('tmp_picnic', 52, 70, { ry: -0.4 });
  // Dragebakken: a picnic and a flower ring at the foot of the kite hill
  deco('tmp_picnic', -53, 99, { ry: 0.5 }); deco('tmp_picnic', -79, 99, { ry: -0.6 });
  for (let a = 0.15; a < Math.PI - 0.1; a += Math.PI / 9) deco('tmp_flowers', HILL.x + Math.cos(a) * 18.8, HILL.z + Math.sin(a) * 18.8, { opts: { cs: ['yellow', 'white', 'sky'] }, s: 1.3 });
  // Rosehagen: flower borders along both long sides
  for (let z = Z.rosehage.z - 10; z <= Z.rosehage.z + 10; z += 3.3) { deco('tmp_flowers', Z.rosehage.x - 13, z, { opts: { cs: ['red', 'pink', 'white'] }, s: 1.3 }); deco('tmp_flowers', Z.rosehage.x + 13, z, { opts: { cs: ['rose', 'yellow', 'white'] }, s: 1.3 }); }
  // the north lawn behind the castle: planters, bushes and a flower row
  deco('tmp_planter', -8, -40, { opts: { c: 'pink' }, s: 1.5 }); deco('tmp_planter', 8, -40, { opts: { c: 'lilac' }, s: 1.5 });
  for (const x of [-14, 14]) deco('tmp_bush', x, -46, { opts: { c: 'pink' }, s: 1 });
  for (let x = -12; x <= 12; x += 3) if (Math.abs(x) > 3) deco('tmp_flowers', x, -35, { opts: { cs: ['pink', 'yellow', 'white'] }, s: 1.3 });
  Park.statics = statics;
  const meshes = mergeStatics(statics);
  const root = new THREE.Group(); root.name = 'parkStatics'; meshes.forEach(m => root.add(m));
  F.R.scene.add(root);
  Park.staticRoot = root;
}

/* ================================================================== interactables placement (types in things_park.js / castle.js) */
const SP = [];   // [type, x, z, {ry, data, id}]
function S(type, x, z, o) { SP.push([type, x, z, o || {}]); }
function layout() {
  // forecourt
  S('c_vindebru', 0, 27.6, { id: 'c_vindebru' });
  S('p_bod', -15, 43, { ry: 0, id: 'p_bod' });
  S('p_bronn', -23, 34, { id: 'p_bronn' });
  S('p_flagg', -7, 31, { id: 'p_flagg' }); S('p_flagg', 7, 31, { id: 'p_flagg2', data: { c: 'mint' } });
  S('p_klokketarn', 33, 50, { id: 'p_klokketarn' });
  S('p_tavle', -8, 50, { id: 'p_tavle' });
  for (const k of ['tall', 'les', 'skriv']) S('p_laeretarn', 0, 0, { id: 'p_laeretarn_' + k, data: { tower: k } });
  // Markedsplassen: U of 11 shops opening east
  const shops = F.SHOP_ORDER || ['feboden', 'dyrebutikken', 'mobelbua', 'hagesenteret', 'bakeriet', 'lekebutikken', 'musikkbua', 'reisebua', 'gavebua', 'tryllebua', 'byggebua'];
  const U11 = [[-56, 42, 0], [-50, 42, 0], [-44, 42, 0], [-38, 42, 0], [-61, 47, Math.PI / 2], [-61, 52.5, Math.PI / 2], [-61, 58, Math.PI / 2], [-56, 63, 0], [-50, 63, 0], [-44, 63, 0], [-38, 63, 0]];   // south row faces south (toward the camera), not its back
  shops.forEach((sh, i) => { const [x, z, ry] = U11[i]; S('p_butikk', x, z, { ry, id: 'p_butikk_' + sh, data: { shop: sh } }); });
  // south park
  S('p_fontene', -20, 72, { id: 'p_fontene' });
  S('p_paviljong', 22, 76, { id: 'p_paviljong' });
  S('p_iskiosk', -12, 86, { id: 'p_iskiosk', ry: Math.PI / 2 });
  S('p_ballongselger', 11, 84, { id: 'p_ballongselger', ry: -Math.PI / 2 });
  STONES.forEach(s => S('p_tallvei', s.x, s.z, { id: 'p_tallvei_' + s.n, data: { n: s.n } }));
  S('p_hinkerute', HINKE.x, HINKE.z, { id: 'p_hinkerute', scale: 2 });
  TALLHAGE.forEach(b => S('p_tallhage', b.x, b.z, { id: 'p_tallhage_' + b.n, data: { n: b.n } }));
  S('p_drage', HILL.x, HILL.z, { id: 'p_drage', y: HILL.h });
  S('p_statue', -18, 58, { id: 'p_statue' });
  S('p_benk', -26, 70, { id: 'p_benk_fontene', ry: Math.PI / 2 }); S('p_benk', 32, 66, { id: 'p_benk_piknik', ry: -0.5 });
  // west: Lekeplassen
  S('p_huske', -74, 16, { id: 'p_huske' }); S('p_sklie', -62, 15.5, { id: 'p_sklie', ry: Math.PI }); S('p_vippe', -77, 25, { id: 'p_vippe', ry: Math.PI / 2 });
  S('p_sandkasse', -68, 24, { id: 'p_sandkasse' }); S('p_trampoline', -59.5, 25, { id: 'p_trampoline' }); S('p_karusell', -67, 33, { id: 'p_karusell' });
  S('p_sjakk', -86, 26, { id: 'p_sjakk' }); S('p_boblemaskin', -59, 32, { id: 'p_boblemaskin' }); S('p_benk', -76, 33, { id: 'p_benk_lek', ry: 0.6 });
  // east: Andedammen
  S('p_andedam', 58, 12, { id: 'p_andedam', ry: -Math.PI / 2 }); S('p_robat', 61, 2, { id: 'p_robat' }); S('p_svaner', 80, 9, { id: 'p_svaner' });
  S('p_fuglebad', 86, 26, { id: 'p_fuglebad' }); S('p_benk', 66, 22, { id: 'p_benk_dam', ry: Math.PI });
  // north
  [[-44, -60], [-38, -52], [-32, -60], [-38, -46]].forEach(([x, z], i) => S('p_rosebed', x, z, { id: 'p_rosebed_' + i, data: { c: ['red', 'pink', 'yellow', 'white'][i] } }));
  S('p_hekkdyr', 22, -46, { id: 'p_hekkdyr_1' }); S('p_hekkdyr', 28, -50, { id: 'p_hekkdyr_2', data: { start: 1 } }); S('p_hekkdyr', 16, -50, { id: 'p_hekkdyr_3', data: { start: 2 } });
  S('p_labyrint', MAZE.x, MAZE.z, { id: 'p_labyrint' });
  S('p_drivhus', 46, -64, { id: 'p_drivhus' }); S('p_kjokkenhage', 46, -82, { id: 'p_kjokkenhage' });
  S('p_stall', -66, -70, { id: 'p_stall', ry: Math.PI / 6 }); S('p_honsehus', -84, -52, { id: 'p_honsehus' });
  S('p_spreder', 24, -94, { id: 'p_spreder' });
  // lamps along the main paths
  [[3.6, 34], [-3.6, 34], [3.6, 64], [-3.6, 64], [3.6, 82], [-3.6, 82], [3.6, 100], [-3.6, 100], [-40, 26], [40, 26], [-40, -26], [40, -26], [-60, 3], [53, 1], [3, -50], [-3, -90]].forEach(([x, z], i) => S('p_lykt', x, z, { id: 'p_lykt_' + i }));
  // build plots: 6 in Fehagen + 6 public
  for (let i = 0; i < 6; i++) S('p_tomt', Z.fehage.x - 8 + (i % 3) * 8, Z.fehage.z - 5 + Math.floor(i / 3) * 10, { id: 'p_tomt_fe_' + (i + 1) });
  [[-44, 78], [36, 112 - 18], [-96, -16], [96, 36], [-22, -98], [92, -22]].forEach(([x, z], i) => S('p_tomt', x, z, { id: 'p_tomt_park_' + (i + 1) }));
  // a few pressable trees + flower patches
  [[-52, -20], [54, 46], [-30, 84], [70, 84], [-90, 60], [88, -40]].forEach(([x, z], i) => S('p_tre', x, z, { id: 'p_tre_' + i, data: { kind: ['eple', 'kirsebær', 'rund'][i % 3] } }));
  [[-20, 52], [24, 56], [-48, 6], [48, -8], [8, -44]].forEach(([x, z], i) => S('p_blomster', x, z, { id: 'p_blomster_' + i }));
  // Fetårnet's doorstep (DESIGN2 §2.7): two flower beds and a bench (the mailbox and the tower are tower.js)
  S('p_blomster', 75.5, -86.6, { id: 'p_blomster_tarn' }); S('p_blomster', 85.5, -89.5, { id: 'p_blomster_tarn2' });
  S('p_benk', 75.8, -89.6, { id: 'p_benk_tarn', ry: 0.35 });
}

/* ================================================================== API */
const Park = F.Park = Object.assign(F.Park || {}, {
  zones: Z, PATHS, STONES, TALLHAGE, POND, HILL, MAZE, height, color, pathDist, groundAt, vennehage: VENNE, tarnLawn: TARN,
  things: [], shops: {}, plots: [],
  // good standing spots for characters (LIFE: F.Act.parkPos)
  spots: { slottsplassen: { x: 6, z: 35 }, markedsplassen: { x: -44, z: 52 }, rosehagen: { x: -31, z: -50 }, drivhuset: { x: 46, z: -56 }, lekeplassen: { x: -62, z: 30 },
    stallen: { x: -60, z: -62 }, parken: { x: 6, z: 66 }, andedammen: { x: 56, z: 18 }, fehagen: { x: 80, z: -60 }, tallhagen: { x: 47, z: 82 }, dragebakken: { x: -58, z: 84 },
    fontena: { x: -14, z: 72 }, paviljongen: { x: 22, z: 68 }, bod: { x: -15, z: 46.5 },
    'borggården': { x: 6, z: 8 }, fetarnet: { x: 77.5, z: -83.5 } },
  tallvei: {
    stones: [],
    get(n) { return Park.tallvei.stones.find(t => t.data.n === n) || null; },
    highlight(n, on) { const t = Park.tallvei.get(n); if (t && t.def.highlight) t.def.highlight(t, on !== false); },
    hide(n) { const t = Park.tallvei.get(n); if (t && t.label) t.label.show(false); },
    show(n) { const t = Park.tallvei.get(n); if (t && t.label) t.label.show(true); },
  },
  tallhage: {
    beds: {},
    setBloom(n, lvl) { const t = Park.tallhage.beds[n]; if (t && t.def.setBloom) t.def.setBloom(t, lvl); },
  },
});
F.spawnPoint = { x: 80, z: -85.8 };   // Fetårnet's doorstep (DESIGN2 §2.7)

F.on('boot', () => {
  const tw = F.Castle && F.Castle.towers;
  try { buildDecor(); } catch (e) { console.error('park decor', e); }
  layout();
  for (const [type, x, z, o] of SP) {
    if (!F.Things.defs[type]) { console.warn('park: no thing type', type); continue; }
    const th = F.Things.spawn(type, x, z, Object.assign({ zone: 'park' }, o));
    if (!th) continue;
    Park.things.push(th);
    if (type === 'p_butikk') Park.shops[th.data.shop] = th;
    if (type === 'p_tomt') Park.plots.push(th.id);
    if (type === 'p_tallvei') Park.tallvei.stones.push(th);
    if (type === 'p_tallhage') Park.tallhage.beds[th.data.n] = th;
  }
  F.emit('parkReady');
});
// DESIGN2 §2.6: c_vindebru (placed here) is defined by WP1 in castle.js; its press calls F.Castle.bridge.tap()
// hide far park things (draw calls) – the camera target decides
F.on('tick', (() => { let acc = 0; return dt => {
  acc += dt; if (acc < 0.3 || F.Space.cur !== 'out') return; acc = 0;
  const c = F.R.cam.target, L = F.R.cam.look;
  // a scripted glance (F.R.look, e.g. Fetårnet → the castle) shows the park round its centre too
  const lx = L ? c.x + (L.tx - c.x) * 0.7 : c.x, lz = L ? c.z + (L.tz - c.z) * 0.7 : c.z;
  const farOf = (x, z, r) => (Math.abs(x - c.x) > r || Math.abs(z - c.z) > r) && (!L || Math.abs(x - lx) > r || Math.abs(z - lz) > r);
  for (const th of Park.things) { if (!th.obj) continue; const far = th._pFar = farOf(th.x, th.z, th._pFar ? 52 : 58); if (th.obj.visible === far) { th.obj.visible = !far; th.hidden = far; } }   // ±3 m hysteresis
  // merged decor cells (32 m): only those within ~75 m of the camera focus (the title view sees the whole park: keep all there)
  // v5 WP-X (playtest flicker): F.R detailCull (render.js) is the ONLY writer of these cells' .visible; the park only says which cells
  // it wants (userData.keep, 75 m ± 6 hysteresis) – two writers with different rules made cells blink while she stood still
  if (Park.staticRoot) { const all = !!(F.Shell && F.Shell.screen); for (const m of Park.staticRoot.children) { const dT = Math.min(Math.hypot(m.userData.cx - c.x, m.userData.cz - c.z), L ? Math.hypot(m.userData.cx - lx, m.userData.cz - lz) : Infinity); m.userData.keep = all || dT < (m.userData.keep !== false ? 81 : 69); } }
}; })());
})();
