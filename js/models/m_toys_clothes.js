/* Feslottet – MODELS-2: clothes, toys, vehicles, music, fairy-tale things (castable words). Owner: MODELS-2.
   Micro-voxels 1/16 m, palette NAMES only, front = +z, origin = bottom centre.
   IDS (72): klær lue hatt sko sokk vott skjerf jakke dress kjole skjørt bukse genser støvel tøffel hanske belte veske sekk kappe smykke
     kjede sløyfe slips hjelm forkle kåpe vest ring | leker ball dukke drage(kite) tau robot kloss kule spill boble jojo |
     kjøretøy bil buss tog trikk fly båt robåt kano ferje skip ubåt flåte rakett sykkel ski kjelke slede vogn |
     musikk gitar fløyte fiolin tuba note | eventyr tiara fest gave hjerte perle pakke skatt gull stav flagg skjold
   o.c (a PAL name) recolours the main colour of every model with meta.colour (LES L10 «rød ball», «blå bil» …; all 8 F.WORDS.COLOURS work).
   Family: dress{c|col, kind:'sommer'|'ball'|'stjerne'|'regnbue'|'blomst'|'boble'}  ('kjole' = dress{kind:'sommer'}, honours o.c)
   Parts: bil buss tog trikk vogn → wheelF/wheelB (spin = rotation.x); fly → prop (spin = rotation.z). F.Rig.tick spins them when moving.
   Wearables carry meta.wear = {anchor:'head'|'body'|'back'|'feet'|'hand'|'neck'|'face', dy} (see m_catalog.js F.Wear). */
(function () {
'use strict';
const F = window.F, V = F.VOX, P = F.PAL, H = F.U.hash2;
const D = (id, size, build, meta, extra) => V.def(id, Object.assign({ size, scale: 1 / 16, build, meta: Object.assign({ by: 'models2' }, meta || {}) }, extra || {}));
const pick = (o, k, d) => (o && o[k] != null ? o[k] : d);
const C = (o, d) => pick(o, 'c', d);

/* ---------------------------------------------------------- helpers */
const inC = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.25;
function ring(v, cx, y, cz, r0, r1, c, h) { for (let yy = y; yy < y + (h || 1); yy++) for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) if (inC(x, z, cx, cz, r1) && !inC(x, z, cx, cz, r0)) v.set(x, yy, z, c); }
const exposed = (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1) || !v.get(x, y - 1, z);
function surfSpeck(v, from, to, p, seed) { const f = P[from] != null ? P[from] : from; v.paint((x, y, z, c) => c === f && exposed(v, x, y, z) && H(x * 5 + z, y * 11 + x, seed || 7) < p ? to : null); }
function frontZ(v, x, y) { for (let z = v.size[2] - 1; z >= 0; z--) if (v.get(x, y, z)) return z; return -1; }
function front(v, x, y, c, dz) { const z = frontZ(v, x, y); if (z >= 0) v.set(x, y, z + (dz || 0), c); return z; }
// vertical disc in the x–y plane (facing ±z)
function discZ(v, cx, cy, z0, z1, r, c) { for (let z = z0; z <= z1; z++) for (let y = 0; y < v.size[1]; y++) for (let x = 0; x < v.size[0]; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25) v.set(x, y, z, c); }
// vertical disc in the y–z plane (facing ±x) – wheels
function discX(v, x0, x1, cy, cz, r, c) { for (let x = x0; x <= x1; x++) for (let y = 0; y < v.size[1]; y++) for (let z = 0; z < v.size[2]; z++) if ((y - cy) ** 2 + (z - cz) ** 2 <= r * r + 0.25) v.set(x, y, z, c); }
function wheelX(v, x0, x1, cy, cz, r) { discX(v, x0, x1, cy, cz, r, 'black'); discX(v, x0, x1, cy, cz, Math.max(0.6, r - 1.2), 'silver'); }
const starAt = (v, x, y, z, c, axis) => { // tiny 5-voxel star / cross
  if (axis === 'y') { v.set(x, y, z, c); v.set(x + 1, y, z, c); v.set(x - 1, y, z, c); v.set(x, y, z + 1, c); v.set(x, y, z - 1, c); }
  else { v.set(x, y, z, c); v.set(x + 1, y, z, c); v.set(x - 1, y, z, c); v.set(x, y + 1, z, c); v.set(x, y - 1, z, c); }
};
const HEART_PX = { 5: ['XX.XX', 'XXXXX', '.XXX.', '..X..'], 7: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'] };
function heart(v, cx, cy, z0, z1, s, c) { // heart in the x–y plane, s = size (≈ half width); small hearts use pixel patterns
  if (s < 2.7) {
    const pat = HEART_PX[s < 2 ? 5 : 7], w = pat[0].length, x0 = Math.round(cx - (w - 1) / 2), y0 = Math.round(cy + (pat.length - 1) / 2);
    for (let z = z0; z <= z1; z++) pat.forEach((row, r) => { for (let i = 0; i < w; i++) if (row[i] === 'X') v.set(x0 + i, y0 - r, z, c); });
    return;
  }
  for (let z = z0; z <= z1; z++) for (let y = 0; y < v.size[1]; y++) for (let x = 0; x < v.size[0]; x++) {
    const X = (x - cx) / s, Y = (y - cy) / s; if (X * X + (Y - Math.sqrt(Math.abs(X)) * 0.8) ** 2 <= 1.05) v.set(x, y, z, c);
  }
}

/* ================================================================ CLOTHES */
D('lue', [12, 12, 12], (v, o) => {
  const c = C(o, 'red'), c2 = pick(o, 'c2', 'white');
  for (let y = 0; y < 9; y++) { const r = y < 3 ? 5.4 : 5.4 * Math.sqrt(Math.max(0, 1 - ((y - 2) / 6.6) ** 2)); v.cyl(5.5, y, 5.5, r, 1, y < 3 ? c2 : c); }
  v.cyl(5.5, 0, 5.5, 4.4, 8, 0);
  v.paint((x, y, z, col) => y >= 4 && y <= 5 && col === P[c] && (x + z) % 2 === 0 ? P[c2] : null);
  v.paint((x, y, z, col) => y < 3 && (Math.round(Math.atan2(z - 5.5, x - 5.5) * 4) % 2 === 0) ? P.cream : null);
  v.sphere(5.5, 9.6, 5.5, 2, c2);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'head', dy: -0.22 } });

D('hatt', [14, 9, 14], (v, o) => {
  const c = C(o, 'blue');
  v.cyl(6.5, 0, 6.5, 6.8, 1, c); ring(v, 6.5, 0, 6.5, 6, 6.8, c);
  for (let y = 1; y < 6; y++) v.cyl(6.5, y, 6.5, 3.9 - (y > 3 ? 0.4 : 0), 1, c);
  v.cyl(6.5, 6, 6.5, 3.2, 1, c); v.set(6, 6, 6, 0); v.set(7, 6, 6, 0); v.set(6, 6, 7, 0); v.set(7, 6, 7, 0);
  ring(v, 6.5, 1, 6.5, 3, 3.95, 'yellow', 2);
  // feather + flower on the band
  v.set(10, 2, 7, 'red'); v.set(10, 3, 7, 'red'); v.set(10, 2, 8, 'pink'); v.set(10, 2, 6, 'pink');
  v.line(10, 3, 5, 12, 8, 3, 'white'); v.line(11, 3, 5, 13, 7, 3, 'white');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'head', dy: -0.12 } });

function shoe(v, x0, c, sole, strap) {
  v.box(x0, 0, 1, x0 + 3, 0, 8, sole);
  v.box(x0, 1, 1, x0 + 3, 2, 8, c); v.box(x0, 3, 1, x0 + 3, 3, 3, c);
  v.box(x0 + 1, 2, 3, x0 + 2, 2, 6, 0); v.box(x0 + 1, 1, 3, x0 + 2, 1, 6, 'cream');
  v.set(x0, 2, 8, c); v.set(x0 + 3, 2, 8, c);
  if (strap) { v.box(x0, 3, 5, x0 + 3, 3, 5, c); v.set(x0 + 3, 3, 5, 'gold'); }
}
D('sko', [12, 5, 10], (v, o) => { const c = C(o, 'red'); shoe(v, 1, c, 'white', true); shoe(v, 7, c, 'white', true); },
  { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'feet', dy: 0 } });

D('sokk', [6, 14, 10], (v, o) => {
  const c = C(o, 'pink');
  v.box(1, 3, 1, 4, 13, 4, c); v.box(1, 0, 1, 4, 3, 9, c);
  v.paint((x, y, z, col) => y >= 4 && y % 3 === 0 ? P.white : null);
  v.box(1, 11, 1, 4, 13, 4, 'white'); v.paint((x, y, z, col) => y >= 11 && (x + z) % 2 === 0 ? P.cream : null);
  v.box(1, 0, 8, 4, 3, 9, 'red'); v.box(1, 0, 1, 4, 2, 2, 'red');
  v.box(2, 12, 2, 3, 13, 3, 0);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'feet', dy: 0 } });

D('vott', [10, 14, 4], (v, o) => {
  const c = C(o, 'red');
  v.box(1, 0, 1, 7, 3, 2, 'white'); v.paint((x, y, z) => y <= 3 && x % 2 === 0 ? P.cream : null);
  for (let y = 4; y <= 13; y++) { const w = y > 11 ? (y === 13 ? 1.6 : 2.6) : 3.1; for (let x = 0; x < 10; x++) if (Math.abs(x - 4) <= w) v.box(x, y, 1, x, y, 2, c); }
  v.box(7, 6, 1, 8, 9, 2, c); v.set(9, 8, 1, c); v.set(9, 8, 2, c); v.set(8, 10, 1, c);
  // Selbu star
  const s = 'white'; v.set(4, 8, 3, s); v.set(3, 9, 3, s); v.set(5, 9, 3, s); v.set(3, 7, 3, s); v.set(5, 7, 3, s); v.set(4, 10, 3, s); v.set(4, 6, 3, s); v.set(2, 8, 3, s); v.set(6, 8, 3, s);
  v.box(1, 4, 3, 7, 4, 3, s); v.box(2, 12, 3, 6, 12, 3, s);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'hand', dy: -0.1 } });

D('skjerf', [14, 12, 12], (v, o) => {
  const c = C(o, 'red'), c2 = pick(o, 'c2', 'white');
  // loop around an invisible neck
  for (let y = 7; y <= 10; y++) ring(v, 6.5, y, 5.5, 3.2, 5, c);
  // hanging ends in front
  v.box(3, 0, 9, 5, 8, 10, c); v.box(7, 2, 10, 9, 8, 11, c);
  v.paint((x, y, z, col) => col === P[c] && y % 3 === 0 ? P[c2] : null);
  for (const x of [3, 5]) v.set(x, 0, 10, c2); v.set(4, 0, 9, c2);
  for (let x = 7; x <= 9; x += 2) { v.set(x, 1, 10, c2); v.set(x, 1, 11, c2); }
  v.box(6, 6, 9, 8, 8, 10, c);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'neck', dy: -0.45 } });

D('jakke', [16, 15, 8], (v, o) => {
  const c = C(o, 'blue');
  v.box(4, 2, 2, 11, 12, 5, c); v.box(3, 3, 2, 12, 11, 5, c);
  // sleeves
  v.box(0, 3, 2, 2, 11, 5, c); v.box(13, 3, 2, 15, 11, 5, c); v.box(0, 2, 2, 2, 2, 5, 'white'); v.box(13, 2, 2, 15, 2, 5, 'white');
  // hood / collar
  v.box(4, 13, 1, 11, 14, 4, c); v.box(5, 12, 4, 10, 13, 5, 0); v.box(5, 14, 2, 10, 14, 3, 'cream2');
  // zipper, pockets, hem
  v.box(7, 2, 6, 8, 12, 6, 'silver'); v.set(7, 12, 6, 'gold');
  v.box(4, 3, 6, 6, 5, 6, 'navySoft'); v.box(9, 3, 6, 11, 5, 6, 'navySoft');
  v.box(3, 2, 2, 12, 2, 5, 'white');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.28 } });

/* ---------------------------------------------------------- dress family */
function dressBuild(v, o) {
  const kind = o.kind || 'sommer', c = pick(o, 'c', pick(o, 'col', { sommer: 'pink', ball: 'lavender', stjerne: 'navySoft', regnbue: 'white', blomst: 'pink', boble: 'sky' }[kind]));
  const cx = 7, cz = 4.5;
  const flare = kind === 'ball' ? 6.8 : kind === 'boble' ? 6.2 : 5.6;
  // skirt y 0..8, bodice 9..14
  for (let y = 0; y <= 8; y++) {
    const t = y / 8, r = flare - (flare - 3) * Math.pow(t, kind === 'ball' ? 0.7 : 1);
    for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) if (((x - cx) / r) ** 2 + ((z - cz) / Math.min(r, 4.6)) ** 2 <= 1.02) v.set(x, y, z, c);
  }
  v.box(5, 9, 3, 9, 13, 5, c); v.box(6, 9, 6, 8, 12, 6, c); v.set(5, 14, 4, c); v.set(9, 14, 4, c); v.box(6, 13, 5, 8, 13, 5, 0);
  v.box(5, 9, 3, 9, 9, 6, pick(o, 'belt', kind === 'ball' ? 'gold' : 'white'));
  // bow at the waist
  v.set(7, 9, 7, 'rose'); v.set(6, 10, 7, 'rose'); v.set(8, 10, 7, 'rose'); v.set(6, 8, 7, 'rose'); v.set(8, 8, 7, 'rose');
  const surf = (fn) => v.paint((x, y, z, col) => y <= 8 && exposed(v, x, y, z) ? fn(x, y, z, col) : null);
  if (kind === 'sommer') { surf((x, y, z) => (x * 3 + y * 5 + z * 7) % 13 === 0 && y > 0 ? 'white' : y === 0 ? 'white' : null); }
  if (kind === 'ball') { v.box(3, 12, 3, 4, 13, 5, c); v.box(10, 12, 3, 11, 13, 5, c); surf((x, y, z) => H(x, y, z * 7) < 0.1 ? 'glowYellow' : y === 0 ? 'white' : null); v.set(7, 12, 7, 'gem2'); }
  if (kind === 'stjerne') { surf((x, y, z) => ((x * 7 + y * 3 + z * 5) % 11 === 0) ? 'glowYellow' : null); v.set(7, 12, 7, 'gold'); v.set(6, 11, 7, 'gold'); v.set(8, 11, 7, 'gold'); }
  if (kind === 'regnbue') { const rb = ['purple', 'blue', 'mint', 'yellow', 'orange', 'red', 'pink', 'pink', 'pink']; v.paint((x, y, z, col) => y <= 8 && col === P[c] ? rb[y] : null); }
  if (kind === 'blomst') { surf((x, y, z) => y % 3 === 0 ? 'blossom' : null); for (let a = 0; a < 10; a++) { const an = a / 10 * Math.PI * 2; v.set(Math.round(cx + Math.cos(an) * (flare + 0.4)), 0, Math.round(cz + Math.sin(an) * Math.min(flare, 4.6)), 'leaf2'); } v.set(7, 13, 7, 'yellow'); v.set(6, 13, 7, 'white'); v.set(8, 13, 7, 'white'); v.set(7, 14, 7, 'white'); v.set(7, 12, 7, 'white'); }
  if (kind === 'boble') { surf((x, y, z) => H(x, y, z) < 0.15 ? 'white' : null); for (const [x, y, z] of [[1, 3, 4], [12, 5, 5], [7, 6, 9]]) v.set(x, y, z, 'glass'); }
}
D('dress', [14, 16, 10], dressBuild, { group: 'klær', family: 'dress', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.42 }, variants: { kind: ['sommer', 'ball', 'stjerne', 'regnbue', 'blomst', 'boble'] } });
D('kjole', [14, 16, 10], (v, o) => dressBuild(v, Object.assign({ kind: 'sommer' }, o)), { group: 'klær', family: 'dress', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.42 }, variants: { c: ['pink', 'red', 'blue', 'yellow', 'green', 'purple', 'white'] } });

D('skjørt', [12, 8, 12], (v, o) => {
  const c = C(o, 'pink');
  for (let y = 0; y <= 6; y++) { const r = 5.6 - y * 0.42; v.cyl(5.5, y, 5.5, r, 1, c); }
  v.cyl(5.5, 0, 5.5, 2.4, 7, 0); v.cyl(5.5, 7, 5.5, 3.2, 1, 'white'); v.cyl(5.5, 7, 5.5, 2.2, 1, 0);
  v.paint((x, y, z, col) => col === P[c] && Math.round(Math.atan2(z - 5.5, x - 5.5) * 3.2) % 2 === 0 ? P.rose : null);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.4 } });

D('bukse', [11, 15, 5], (v, o) => {
  const c = C(o, 'jeansBlue');
  v.box(1, 0, 1, 4, 10, 3, c); v.box(6, 0, 1, 9, 10, 3, c); v.box(1, 8, 1, 9, 13, 3, c); v.box(1, 13, 1, 9, 14, 3, 'navySoft');
  v.box(5, 0, 1, 5, 7, 3, 0);
  v.set(5, 13, 4, 'gold'); v.box(5, 9, 4, 5, 12, 4, 'navySoft'); v.box(1, 0, 1, 4, 0, 3, 'navySoft'); v.box(6, 0, 1, 9, 0, 3, 'navySoft');
  v.box(2, 11, 4, 3, 12, 4, 'navySoft'); v.box(7, 11, 4, 8, 12, 4, 'navySoft'); v.set(1, 14, 4, 'navySoft'); v.set(9, 14, 4, 'navySoft');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.45 } });

D('genser', [18, 14, 6], (v, o) => {
  const c = C(o, 'red');
  v.box(4, 0, 1, 13, 12, 4, c); v.box(0, 7, 1, 3, 11, 4, c); v.box(14, 7, 1, 17, 11, 4, c);
  v.box(0, 7, 1, 0, 11, 4, 'white'); v.box(17, 7, 1, 17, 11, 4, 'white'); v.box(4, 0, 1, 13, 0, 4, 'white');
  v.box(7, 12, 1, 10, 13, 4, 'white'); v.box(8, 13, 2, 9, 13, 3, 0);
  // Norwegian knit pattern bands
  for (let x = 4; x <= 13; x++) { v.set(x, 10, 5, 'white'); v.set(x, 6, 5, 'white'); v.set(x, (x % 2) ? 7 : 9, 5, 'white'); v.set(x, 8, 5, x % 4 === 1 ? 'white' : c); }
  for (const x of [6, 11]) { v.set(x, 3, 5, 'white'); v.set(x - 1, 3, 5, 'white'); v.set(x + 1, 3, 5, 'white'); v.set(x, 4, 5, 'white'); v.set(x, 2, 5, 'white'); }
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.3 } });

D('støvel', [12, 11, 10], (v, o) => {
  const c = C(o, 'yellow');
  for (const x0 of [1, 7]) { v.box(x0, 0, 1, x0 + 3, 1, 8, c); v.box(x0, 2, 1, x0 + 3, 10, 4, c); v.box(x0 + 1, 3, 2, x0 + 2, 10, 3, 0); v.box(x0, 0, 1, x0 + 3, 0, 8, 'navySoft'); v.box(x0, 9, 1, x0 + 3, 10, 4, 'white'); v.set(x0 + 3, 8, 3, 'red'); }
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'feet', dy: 0 } });

D('tøffel', [12, 6, 11], (v, o) => {
  const c = C(o, 'pink');
  for (const x0 of [1, 7]) {
    v.box(x0, 0, 1, x0 + 3, 0, 9, 'white'); v.box(x0, 1, 4, x0 + 3, 3, 9, c); v.box(x0 + 1, 2, 4, x0 + 2, 3, 6, 0);
    v.set(x0, 4, 8, c); v.set(x0, 5, 8, c); v.set(x0 + 3, 4, 8, c); v.set(x0 + 3, 5, 8, c); v.set(x0 + 1, 3, 10, 'black'); v.set(x0 + 2, 3, 10, 'black'); v.set(x0 + 1, 2, 10, 'rose'); v.set(x0 + 2, 2, 10, 'rose');
    v.set(x0, 4, 9, 'blossom'); v.set(x0 + 3, 4, 9, 'blossom');
  }
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'feet', dy: 0 } });

D('hanske', [14, 17, 5], (v, o) => {
  const c = C(o, 'purple');
  v.box(1, 0, 1, 10, 3, 3, 'white'); v.paint((x, y, z, col) => y <= 3 && x % 2 === 0 ? P.cream : null);
  v.box(1, 4, 1, 10, 9, 3, c);
  for (const [x, h] of [[1, 13], [4, 16], [7, 15], [10, 12]]) { v.box(x, 10, 1, Math.min(x + 1, 10), h, 3, c); v.set(x, h, 2, 'white'); }
  v.box(11, 5, 1, 12, 8, 3, c); v.box(12, 8, 1, 13, 10, 3, c); v.set(13, 10, 2, 'white');
  heart(v, 5.5, 6.4, 4, 4, 1.6, 'pink');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'hand', dy: -0.1 }, variants: { c: ['purple', 'red', 'blue', 'green', 'pink'] } });

D('belte', [20, 4, 10], (v, o) => {
  const c = C(o, 'brown');
  // strap in a gentle S across the ground, pointed tip, holes, a big square gold buckle with a prong
  for (let x = 0; x <= 15; x++) { const z = Math.round(4 + Math.sin(x * 0.42) * 1.6); v.box(x, 0, z, x, 0, z + 2, c); if (x >= 2 && x <= 8 && x % 2 === 0) v.set(x, 0, z + 1, 'woodDark'); }
  v.set(0, 0, Math.round(4 + 0) + 0, 0); v.set(0, 0, 6, 0);
  v.box(15, 0, 2, 19, 1, 8, 'gold'); v.box(16, 0, 3, 18, 1, 7, 0); v.box(16, 0, 4, 18, 0, 6, c); v.box(17, 1, 5, 19, 1, 5, 'silver'); v.set(19, 0, 5, 'honey');
  v.paint((x, y, z, col) => col === P[c] && (z === 3 || z === 7) && x > 0 ? P[c === 'brown' ? 'woodDark' : c] : null);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.05 }, variants: { c: ['brown', 'red', 'black', 'pink'] } });

D('veske', [12, 14, 6], (v, o) => {
  const c = C(o, 'pink');
  v.box(1, 0, 1, 10, 7, 4, c); v.box(0, 1, 1, 0, 6, 4, c); v.box(11, 1, 1, 11, 6, 4, c);
  v.box(1, 5, 5, 10, 7, 5, 'rose'); v.box(5, 4, 5, 6, 5, 5, 'gold');
  v.box(3, 8, 2, 3, 12, 3, 'gold'); v.box(8, 8, 2, 8, 12, 3, 'gold'); v.box(4, 13, 2, 7, 13, 3, 'gold');
  v.set(3, 2, 5, 'white'); v.set(8, 3, 5, 'white');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'hand', dy: -0.6 } });

D('sekk', [12, 15, 9], (v, o) => {
  const c = C(o, 'red');
  v.box(2, 0, 2, 9, 11, 6, c); v.box(3, 12, 2, 8, 12, 6, c); v.box(2, 9, 1, 9, 12, 7, pick(o, 'c2', 'navySoft'));
  v.box(3, 2, 7, 8, 7, 8, pick(o, 'c2', 'navySoft')); v.box(4, 7, 8, 7, 7, 8, 'yellow'); v.set(5, 5, 8, 'yellow');
  v.box(3, 2, 1, 3, 10, 1, 'navySoft'); v.box(8, 2, 1, 8, 10, 1, 'navySoft'); v.box(5, 13, 3, 6, 14, 4, 'navySoft');
  v.set(3, 10, 7, 'white'); v.set(8, 11, 7, 'mint');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'back', dy: -0.4 } });

D('kappe', [16, 17, 9], (v, o) => {
  const c = C(o, 'red');
  for (let y = 0; y <= 14; y++) { const r = 7 - y * 0.27; for (let z = 0; z < 9; z++) for (let x = 0; x < 16; x++) { const dx = (x - 7.5) / r, dz = (z - 4) / 3.4; const d = dx * dx + dz * dz; if (d <= 1 && d >= 0.45 && !(z > 4 && Math.abs(x - 7.5) < 2.2 - y * 0.06)) v.set(x, y, z, c); } }
  v.paint((x, y, z, col) => y === 0 ? P.gold : null);
  v.box(5, 15, 3, 10, 16, 5, 'gold'); v.box(7, 14, 6, 8, 15, 6, 'gem1');
  v.paint((x, y, z, col) => col === P[c] && z <= 3 && y > 1 && y < 14 ? null : null);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'back', dy: -0.75 } });

D('smykke', [10, 13, 3], (v, o) => {
  for (let i = 0; i <= 30; i++) { const t = i / 30 * Math.PI * 2; const x = 4.5 + Math.sin(t) * 4.2, y = 8 + Math.cos(t) * 4.4; if (y < 8.6 || true) v.set(Math.round(x), Math.round(y), 1, 'gold'); }
  heart(v, 4.5, 2.2, 0, 2, 2.4, 'gem1'); v.set(3, 3, 2, 'white');
  v.box(4, 4, 1, 5, 4, 1, 'gold');
}, { group: 'klær', react: 'wear', wear: { anchor: 'neck', dy: -0.5 } });

D('kjede', [15, 17, 5], (v, o) => {
  const c = C(o, 'white');
  for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; if (Math.abs(Math.sin(t)) < 0.2 && Math.cos(t) > 0) continue;
    v.sphere(7 + Math.sin(t) * 5.6, 10 + Math.cos(t) * 5.6, 2, 0.95, i % 3 === 0 ? 'blossom' : c); }
  heart(v, 7, 2.4, 1, 3, 2.4, 'gem1'); v.set(6, 3, 4, 'white'); v.box(6, 4, 2, 8, 5, 2, 'gold');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'neck', dy: -0.5 }, variants: { c: ['white', 'gold', 'sky', 'mint'] } });

D('sløyfe', [13, 9, 4], (v, o) => {
  const c = C(o, 'pink');
  for (let y = 0; y < 9; y++) for (let x = 0; x < 13; x++) { const dx = Math.abs(x - 6); if (dx >= 1 && Math.abs(y - 5) <= 1 + dx * 0.55 && dx <= 6 && y >= 2) v.box(x, y, 1, x, y, 2, c); }
  v.box(5, 4, 1, 7, 6, 3, pick(o, 'c2', 'rose'));
  v.box(4, 0, 1, 4, 3, 1, c); v.box(8, 0, 1, 8, 3, 1, c); v.set(3, 0, 1, c); v.set(9, 0, 1, c);
  v.paint((x, y, z, col) => col === P[c] && z === 2 && (x === 2 || x === 10) ? P.rose : null);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'head', dy: -0.08 } });

D('slips', [6, 15, 3], (v, o) => {
  const c = C(o, 'red');
  v.box(2, 12, 0, 3, 13, 2, c); v.box(1, 14, 0, 4, 14, 1, 'white');
  for (let y = 1; y < 12; y++) { const w = y < 3 ? (y === 1 ? 0 : 1) : y > 9 ? 1 : 1.5; for (let x = 0; x < 6; x++) if (Math.abs(x - 2.5) <= w + 0.5) v.box(x, y, 0, x, y, 1, c); }
  v.paint((x, y, z, col) => col === P[c] && (x + y) % 4 === 0 && y < 12 ? P.navySoft : null);
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'neck', dy: -0.75 } });

D('hjelm', [12, 9, 14], (v, o) => {
  // bicycle helmet: a round shell (hollow for the head), white stripe front-to-back, dark vents, a visor brim at the front
  const c = C(o, 'sky');
  v.ellipsoid(5.5, 0, 6, 5.6, 8.4, 6.1, c); v.ellipsoid(5.5, 0, 6, 4.3, 6.6, 4.8, 0);
  v.paint((x, y, z, col) => (col === P[c] && (x === 5 || x === 6) ? P.white : (col === P[c] && (x === 3 || x === 8) && y >= 5 && z >= 3 && z <= 9 ? P.navySoft : null)));
  v.box(2, 1, 12, 9, 2, 13, 'navySoft'); v.box(3, 3, 12, 8, 3, 12, 'navySoft');
  v.box(0, 0, 5, 0, 1, 7, 'navySoft'); v.box(11, 0, 5, 11, 1, 7, 'navySoft');
}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.3 } });

D('forkle', [12, 15, 3], (v, o) => {
  const c = C(o, 'white');
  v.box(2, 0, 1, 9, 9, 1, c); v.box(3, 10, 1, 8, 13, 1, c); v.box(1, 0, 1, 1, 7, 1, c); v.box(10, 0, 1, 10, 7, 1, c);
  v.box(0, 9, 1, 2, 9, 1, 'red'); v.box(9, 9, 1, 11, 9, 1, 'red'); v.box(3, 14, 1, 3, 14, 1, 'red'); v.box(8, 14, 1, 8, 14, 1, 'red');
  v.box(3, 2, 2, 8, 5, 2, 'red'); v.box(4, 3, 2, 7, 4, 2, 'cherry');
  v.paint((x, y, z, col) => col === P[c] && y >= 6 && (x + y) % 4 === 0 ? P.blossom : null);
  v.box(0, 0, 1, 11, 0, 1, 'red');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.4 } });

D('kåpe', [18, 18, 7], (v, o) => {
  const c = C(o, 'coral');
  for (let y = 0; y <= 14; y++) { const w = y < 8 ? 5.2 - y * 0.16 : 4; v.box(Math.round(8.5 - w), y, 1, Math.round(8.5 + w), y, 4, c); }
  v.box(0, 10, 1, 4, 14, 4, c); v.box(13, 10, 1, 17, 14, 4, c); v.box(0, 10, 1, 0, 14, 4, 'cream2'); v.box(17, 10, 1, 17, 14, 4, 'cream2');
  v.box(5, 15, 1, 12, 16, 4, c); v.box(7, 16, 2, 10, 16, 3, 0);
  v.box(6, 12, 5, 7, 15, 5, 'rose'); v.box(10, 12, 5, 11, 15, 5, 'rose');
  v.box(4, 8, 5, 13, 8, 5, 'woodDark'); v.set(8, 8, 6, 'gold'); v.set(9, 8, 6, 'gold');
  for (const y of [11, 5, 2]) { v.set(7, y, 5, 'gold'); v.set(10, y, 5, 'gold'); }
  v.box(8, 0, 5, 9, 7, 5, c); v.box(8, 0, 1, 9, 0, 4, 'cream2');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.55 } });

D('vest', [12, 12, 6], (v, o) => {
  const c = C(o, 'green');
  v.box(2, 0, 1, 9, 10, 4, c);
  for (let y = 7; y <= 10; y++) { const w = y - 7; v.box(5 - w, y, 4, 6 + w, y, 4, 0); v.box(5 - w, y, 3, 6 + w, y, 3, 0); }
  v.box(2, 8, 1, 2, 10, 4, 0); v.box(9, 8, 1, 9, 10, 4, 0); v.box(3, 10, 1, 3, 11, 2, c); v.box(8, 10, 1, 8, 11, 2, c);
  for (const y of [1, 3, 5]) v.set(6, y, 5, 'gold');
  v.box(3, 3, 5, 4, 3, 5, 'leafDark'); v.box(7, 3, 5, 8, 3, 5, 'leafDark'); v.box(5, 0, 5, 5, 6, 5, 'leafDark');
}, { group: 'klær', colour: true, react: 'wear', wear: { anchor: 'body', dy: -0.3 } });

D('ring', [8, 10, 4], (v) => {
  for (let i = 0; i < 28; i++) { const t = i / 28 * Math.PI * 2; v.set(Math.round(3.5 + Math.cos(t) * 3.2), Math.round(3.4 + Math.sin(t) * 3.2), 1, 'gold'); v.set(Math.round(3.5 + Math.cos(t) * 3.2), Math.round(3.4 + Math.sin(t) * 3.2), 2, 'gold'); }
  v.box(2, 7, 1, 5, 7, 2, 'gold'); v.box(2, 8, 1, 5, 8, 2, 'gem1'); v.box(3, 9, 1, 4, 9, 2, 'gem1'); v.set(3, 8, 2, 'white');
}, { group: 'klær', react: 'wear', wear: { anchor: 'hand', dy: 0 } });

/* ================================================================ TOYS */
D('ball', [11, 11, 11], (v, o) => {
  v.sphere(5, 5, 5, 5.2, 'white');
  if (o.c) v.paint((x, y, z) => Math.abs(y - 5) > 1.2 ? P[o.c] : null);
  else v.paint((x, y, z) => { const a = Math.atan2(z - 5, x - 5); const k = Math.floor((a + Math.PI) / (Math.PI * 2) * 6) % 6; return Math.abs(y - 5) > 4 ? P.white : [P.red, P.white, P.yellow, P.white, P.blue, P.white][k]; });
  v.set(2, 8, 8, 'white'); v.set(3, 9, 7, 'white');
}, { group: 'leker', colour: true, react: 'play', rig: 'none' });

D('dukke', [10, 17, 7], (v, o) => {
  const dc = C(o, 'pink'), hair = pick(o, 'hair', 'hairRed');
  // skirt + body
  for (let y = 2; y <= 7; y++) { const r = 4 - (y - 2) * 0.35; v.cyl(4.5, y, 3, r, 1, dc); }
  v.box(3, 8, 2, 6, 10, 4, dc); v.box(3, 8, 5, 6, 8, 5, 'white');
  v.box(3, 0, 2, 3, 2, 3, 'skin'); v.box(6, 0, 2, 6, 2, 3, 'skin'); v.box(3, 0, 3, 3, 0, 4, 'red'); v.box(6, 0, 3, 6, 0, 4, 'red');
  v.box(1, 7, 3, 2, 10, 3, 'skin'); v.box(7, 7, 3, 8, 10, 3, 'skin'); v.box(1, 9, 3, 2, 10, 3, dc); v.box(7, 9, 3, 8, 10, 3, dc);
  // head
  v.box(2, 11, 1, 7, 15, 5, 'skin');
  v.box(2, 15, 1, 7, 16, 5, hair); v.box(1, 11, 1, 1, 15, 4, hair); v.box(8, 11, 1, 8, 15, 4, hair); v.box(2, 12, 1, 7, 15, 1, hair);
  v.box(0, 9, 2, 0, 12, 3, hair); v.box(9, 9, 2, 9, 12, 3, hair); v.set(0, 8, 2, 'rose'); v.set(9, 8, 2, 'rose');
  v.box(3, 13, 6, 3, 14, 6, 'black'); v.box(6, 13, 6, 6, 14, 6, 'black'); v.set(3, 14, 6, 'white'); v.set(6, 14, 6, 'white');
  v.box(4, 12, 6, 5, 12, 6, 'cherry'); v.set(2, 12, 6, 'blossom'); v.set(7, 12, 6, 'blossom');
  v.paint((x, y, z, c) => c === P.skin && z === 5 && y >= 11 && y <= 15 ? null : null);
  v.box(3, 11, 6, 6, 15, 6, 'skin'); v.box(3, 13, 6, 3, 14, 6, 'black'); v.box(6, 13, 6, 6, 14, 6, 'black'); v.set(3, 14, 6, 'white'); v.set(6, 14, 6, 'white'); v.box(4, 12, 6, 5, 12, 6, 'cherry'); v.set(3, 11, 6, 'blossom'); v.set(6, 11, 6, 'blossom');
  v.box(3, 16, 2, 6, 16, 3, 'yellow'); v.set(4, 16, 4, 'yellow');
}, { group: 'leker', colour: true, react: 'play' });

D('drage', [13, 19, 5], (v, o) => {
  // kite: diamond with 4 coloured panels, cross sticks, ribbon tail with bows
  const c = C(o, 'red');
  for (let y = 6; y <= 18; y++) for (let x = 0; x < 13; x++) { const dy = y < 13 ? (13 - y) / 7 : (y - 13) / 5; if (Math.abs(x - 6) <= 6 * (1 - dy) + 0.3) v.set(x, y, 2, (x < 6) !== (y < 13) ? c : 'yellow'); }
  v.box(6, 6, 3, 6, 18, 3, 'woodDark'); v.box(1, 13, 3, 11, 13, 3, 'woodDark');
  for (let i = 0; i < 6; i++) { const y = 5 - i, x = 6 + Math.round(Math.sin(i * 1.3) * 1.5); v.set(x, y, 2, 'white'); if (i % 2 === 0) { v.set(x - 1, y, 2, 'sky'); v.set(x + 1, y, 2, 'sky'); } }
  v.set(6, 0, 2, 'white');
}, { group: 'leker', colour: true, react: 'play' });

D('tau', [20, 8, 16], (v) => {
  // a thick twisted rope in a big S across the ground, a fat knot in the middle, frayed ends
  for (let i = 0; i <= 120; i++) { const t = i / 120, x = 1.5 + t * 17, z = 8 + Math.sin(t * Math.PI * 2) * 5.2; v.sphere(x, 1.3, z, 1.35, 'hay'); }
  v.sphere(10, 2.4, 8, 2.4, 'hay');
  v.paint((x, y, z, c) => c === P.hay && ((x + z + y * 2) % 4 < 2) ? P.woodLight : null);
  for (const [x, z] of [[0, 7], [0, 9], [1, 8], [19, 7], [19, 9], [18, 8]]) { v.set(x, 0, z, 'butter'); v.set(x, 1, z, 'hay'); }
}, { group: 'leker', react: 'play' });

D('robot', [14, 18, 8], (v, o) => {
  const c = C(o, 'silver');
  v.box(4, 0, 2, 5, 3, 5, 'steel'); v.box(8, 0, 2, 9, 3, 5, 'steel'); v.box(4, 0, 5, 5, 0, 6, 'navySoft'); v.box(8, 0, 5, 9, 0, 6, 'navySoft');
  v.box(3, 4, 1, 10, 10, 6, c); v.box(5, 6, 7, 8, 8, 7, 'navySoft'); v.set(5, 7, 7, 'gem3'); v.set(6, 7, 7, 'gem1'); v.set(7, 7, 7, 'gem2'); v.set(8, 7, 7, 'glowYellow');
  v.box(1, 6, 3, 2, 10, 4, 'steel'); v.box(11, 6, 3, 12, 10, 4, 'steel'); v.box(0, 5, 3, 2, 5, 4, 'red'); v.box(11, 5, 3, 13, 5, 4, 'red');
  v.box(3, 11, 1, 10, 16, 6, c); v.box(4, 13, 7, 5, 14, 7, 'gem2'); v.box(8, 13, 7, 9, 14, 7, 'gem2'); v.set(4, 14, 7, 'white'); v.set(8, 14, 7, 'white');
  v.box(5, 12, 7, 8, 12, 7, 'navySoft'); v.box(2, 12, 3, 2, 14, 4, 'red'); v.box(11, 12, 3, 11, 14, 4, 'red');
  v.set(6, 17, 3, 'steel'); v.set(7, 17, 3, 'steel'); v.set(6, 17, 4, 'glowYellow');
}, { group: 'leker', react: 'play' });

D('kloss', [12, 9, 8], (v, o) => {
  const c = C(o, 'red');
  v.box(0, 0, 0, 11, 5, 7, c);
  for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) v.cyl(1.5 + x * 3, 6, 1.5 + z * 4, 1.1, 2, c);
  v.paint((x, y, z, col) => col === P[c] && y === 7 ? P[pick(o, 'hl', 'coral')] : null);
}, { group: 'leker', colour: true, react: 'play' });

D('kule', [14, 8, 12], (v, o) => {
  const c = C(o, 'blue');
  const marble = (cx, cy, cz, r, a, b) => { v.sphere(cx, cy, cz, r, a);
    v.paint((x, y, z, col) => col === P[a] && Math.hypot(x - cx, y - cy, z - cz) <= r + 0.5 && Math.abs(Math.sin((x - cx) * 1.3 + (y - cy) * 0.9) * 1.6 - (z - cz)) < 0.7 ? P[b] : null);
    v.set(Math.round(cx - r * 0.5), Math.round(cy + r * 0.6), Math.round(cz + r * 0.5), 'white'); };
  marble(4.2, 3.6, 5, 3.6, c, 'white'); marble(10.4, 2.6, 4, 2.6, c === 'red' ? 'yellow' : 'red', 'butter'); marble(9.6, 2.2, 9.4, 2.2, c === 'green' ? 'pink' : 'green', 'white');
}, { group: 'leker', colour: true, react: 'play', variants: { c: ['blue', 'red', 'green', 'yellow', 'purple'] } });

D('spill', [16, 7, 16], (v) => {
  v.box(0, 0, 0, 15, 0, 15, 'woodLight');
  for (let x = 1; x < 15; x++) for (let z = 1; z < 15; z++) if (x === 1 || x === 14 || z === 1 || z === 14) v.set(x, 1, z, ['red', 'yellow', 'blue', 'green'][Math.floor(((x + z) % 8) / 2)]); else if ((x === 7 || x === 8) || (z === 7 || z === 8)) v.set(x, 1, z, 'white');
  v.box(2, 1, 2, 4, 1, 4, 'red'); v.box(11, 1, 2, 13, 1, 4, 'yellow'); v.box(2, 1, 11, 4, 1, 13, 'blue'); v.box(11, 1, 11, 13, 1, 13, 'green');
  // dice + pawns
  v.box(5, 1, 9, 7, 3, 11, 'white'); v.set(6, 3, 10, 'black'); v.set(7, 2, 10, 'black'); v.set(6, 2, 11, 'black');
  for (const [x, z, c] of [[3, 3, 'red'], [12, 3, 'yellow'], [3, 12, 'blue'], [12, 12, 'green'], [10, 7, 'red']]) { v.box(x, 2, z, x, 3, z, c); v.set(x, 4, z, c); }
}, { group: 'leker', react: 'play' });

D('boble', [12, 12, 12], (v) => {
  v.sphere(5.5, 6, 5.5, 5.6, 'glass'); v.sphere(5.5, 6, 5.5, 4.4, 0);
  v.set(3, 9, 9, 'white'); v.set(2, 8, 9, 'white'); v.set(4, 10, 9, 'white');
  v.paint((x, y, z, c) => c === P.glass && x >= 9 && y <= 4 ? P.crystal : null);
  v.set(9, 3, 9, 'gem1'); v.set(10, 4, 8, 'gem2'); v.set(1, 5, 2, 'gem3');
}, { group: 'leker', react: 'play' });

D('jojo', [9, 14, 5], (v, o) => {
  const c = C(o, 'red');
  discZ(v, 4, 4, 0, 1, 4.2, c); discZ(v, 4, 4, 3, 4, 4.2, c); v.box(3, 3, 2, 5, 5, 2, 'white');
  discZ(v, 4, 4, 4, 4, 2, 'yellow'); v.set(4, 4, 4, 'white');
  v.line(4, 8, 2, 4, 13, 2, 'white'); v.box(3, 13, 2, 5, 13, 2, 'white');
}, { group: 'leker', colour: true, react: 'play' });

/* ================================================================ VEHICLES */
const wheelParts = (xL, xR, ys, zs, r) => {
  const parts = {};
  zs.forEach((z, i) => { parts[i ? 'wheelF' : 'wheelB'] = { pivot: [(xL + xR + 1) / 2, ys + 0.5, z + 0.5], build(v) { wheelX(v, 0, xL, ys, z, r); wheelX(v, xR, v.size[0] - 1, ys, z, r); } }; });
  return parts;
};
D('bil', [14, 12, 22], (v, o) => {
  const c = C(o, 'red');
  v.box(1, 2, 1, 12, 6, 20, c);
  for (let z = 1; z <= 20; z++) { if (z <= 2 || z >= 19) { v.set(1, 6, z, 0); v.set(12, 6, z, 0); } }
  v.box(2, 7, 5, 11, 11, 15, c); v.box(2, 7, 4, 11, 9, 4, c); v.box(2, 7, 16, 11, 9, 16, c);
  v.box(1, 7, 6, 1, 10, 9, 'glass'); v.box(12, 7, 6, 12, 10, 9, 'glass'); v.box(1, 7, 11, 1, 10, 14, 'glass'); v.box(12, 7, 11, 12, 10, 14, 'glass');
  v.box(3, 8, 16, 10, 10, 16, 'glass'); v.box(3, 8, 4, 10, 10, 4, 'glass');
  v.box(1, 7, 6, 12, 7, 14, c);
  v.box(2, 2, 21, 11, 3, 21, 'silver'); v.set(2, 5, 21, 'glowYellow'); v.set(3, 5, 21, 'glowYellow'); v.set(10, 5, 21, 'glowYellow'); v.set(11, 5, 21, 'glowYellow');
  v.box(2, 2, 0, 11, 3, 0, 'silver'); v.set(2, 5, 0, 'red'); v.set(11, 5, 0, 'red');
  v.box(5, 4, 21, 8, 4, 21, 'steel');
  v.box(0, 5, 13, 0, 5, 14, 'black'); v.box(13, 5, 13, 13, 5, 14, 'black');
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: wheelParts(1, 12, 2.5, [4.5, 16.5].map(Math.round), 2.6) });

D('buss', [14, 16, 28], (v, o) => {
  const c = C(o, 'yellow');
  v.box(1, 2, 1, 12, 13, 26, c); v.box(2, 14, 2, 11, 14, 25, c);
  for (let z = 3; z <= 23; z += 4) { v.box(1, 8, z, 1, 11, z + 2, 'glass'); v.box(12, 8, z, 12, 11, z + 2, 'glass'); }
  v.box(2, 7, 26, 11, 12, 26, 'glass'); v.box(1, 2, 26, 12, 3, 26, 'silver'); v.set(2, 5, 26, 'glowYellow'); v.set(11, 5, 26, 'glowYellow');
  v.box(12, 2, 20, 12, 11, 22, 'navySoft'); v.box(1, 6, 1, 12, 6, 26, 'white'); v.box(5, 13, 26, 8, 13, 26, 'black'); v.set(6, 13, 27, 'glowYellow');
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: wheelParts(1, 12, 2.5, [5, 21], 2.6) });

D('tog', [12, 17, 24], (v, o) => {
  const c = C(o, 'red');
  // boiler
  for (let z = 10; z <= 22; z++) discZ(v, 5.5, 7.5, z, z, 3.6, c);
  discZ(v, 5.5, 7.5, 23, 23, 2.6, 'black'); discZ(v, 5.5, 7.5, 23, 23, 1, 'steel');
  for (const z of [13, 18]) discZ(v, 5.5, 7.5, z, z, 3.7, 'gold');
  v.cyl(5.5, 11, 19.5, 1.6, 4, 'black'); v.cyl(5.5, 14, 19.5, 2.2, 1, 'black'); v.cyl(5.5, 11, 14.5, 1.3, 2, 'gold');
  // cab
  v.box(1, 3, 1, 10, 13, 9, c); v.box(0, 14, 0, 11, 15, 10, 'navySoft'); v.box(1, 9, 4, 1, 12, 7, 'glass'); v.box(10, 9, 4, 10, 12, 7, 'glass'); v.box(3, 9, 9, 8, 12, 9, 'glass');
  v.box(1, 2, 1, 10, 3, 23, 'navySoft'); v.box(2, 1, 23, 9, 2, 23, 'red'); v.set(5, 10, 23, 'glowYellow'); v.set(6, 10, 23, 'glowYellow');
  v.box(4, 1, 24 - 1, 7, 1, 23, 'steel');
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: wheelParts(1, 10, 2.5, [5, 16], 2.5) });

D('trikk', [12, 18, 26], (v, o) => {
  const c = C(o, 'blue');
  v.box(1, 2, 1, 10, 13, 24, c); v.box(1, 2, 1, 10, 6, 24, 'white');
  for (let z = 3; z <= 21; z += 4) { v.box(1, 8, z, 1, 11, z + 2, 'glass'); v.box(10, 8, z, 10, 11, z + 2, 'glass'); }
  v.box(2, 8, 24, 9, 12, 24, 'glass'); v.box(2, 8, 1, 9, 12, 1, 'glass'); v.box(2, 14, 2, 9, 14, 23, 'grey');
  v.line(5, 15, 10, 5, 17, 14, 'black'); v.line(5, 17, 14, 5, 15, 18, 'black'); v.box(3, 17, 14, 8, 17, 14, 'black');
  v.set(3, 4, 25, 'glowYellow'); v.set(8, 4, 25, 'glowYellow'); v.box(2, 12, 25, 9, 12, 25, 'navySoft');
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: wheelParts(1, 10, 1.5, [5, 20], 1.7) });

D('fly', [22, 11, 20], (v, o) => {
  const c = C(o, 'sky');
  for (let z = 1; z <= 16; z++) { const r = z < 4 ? 1.4 + z * 0.5 : z > 13 ? 3.4 - (z - 13) * 0.4 : 3.4; discZ(v, 10.5, 5, z, z, r, c); }
  v.box(0, 4, 8, 21, 5, 12, 'red'); v.box(1, 6, 9, 3, 6, 11, 'white'); v.box(18, 6, 9, 20, 6, 11, 'white');
  v.box(5, 6, 1, 16, 6, 3, 'red'); v.box(10, 7, 0, 11, 11, 3, 'red'); v.set(10, 11, 0, 'white');
  v.box(9, 7, 11, 12, 9, 14, 'glass'); v.box(8, 5, 17, 13, 5, 17, 'white');
  v.box(7, 0, 12, 7, 2, 12, 'grey'); v.box(14, 0, 12, 14, 2, 12, 'grey'); v.box(7, 0, 11, 7, 1, 13, 'black'); v.box(14, 0, 11, 14, 1, 13, 'black');
  for (let z = 4; z <= 14; z += 2) { v.set(7, 6, z, 'glass'); v.set(14, 6, z, 'glass'); }
  v.paint((x, y, z, col) => col === P[c] && y <= 2 ? P.white : null);
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: { prop: { pivot: [11, 5.5, 18], build(v) { v.box(10, 5, 17, 11, 5, 18, 'gold'); v.box(10, 1, 19, 11, 9, 19, 'woodDark'); v.box(10, 5, 19, 11, 5, 19, 'red'); } } } });

D('båt', [12, 20, 20], (v, o) => {
  const c = C(o, 'red');
  for (let y = 0; y <= 4; y++) for (let z = 0; z < 20; z++) for (let x = 0; x < 12; x++) {
    const w = 5 - (4 - y) * 0.55, zz = (z - 9.5) / (9.6 - (4 - y) * 0.6), front = z > 9.5 ? 1 - Math.max(0, (z - 13) / 6) : 1;
    if (Math.abs(x - 5.5) <= w * front && Math.abs(zz) <= 1) v.set(x, y, z, y === 4 ? 'white' : c);
  }
  for (let y = 2; y <= 4; y++) for (let z = 0; z < 20; z++) for (let x = 1; x < 11; x++) { const w = 5 - (4 - y) * 0.55 - 1, zz = (z - 9.5) / (9.6 - (4 - y) * 0.6 - 1), fr = z > 9.5 ? 1 - Math.max(0, (z - 12) / 6) : 1; if (Math.abs(x - 5.5) <= w * fr && Math.abs(zz) <= 1) v.set(x, y, z, 0); }
  v.box(1, 2, 3, 10, 2, 15, 'woodLight');
  v.box(5, 3, 9, 6, 19, 9, 'woodDark');
  for (let y = 5; y <= 18; y++) { const w = Math.round((18 - y) * 0.5); v.box(5, y, 10, 6, y, 10 + w, 'white'); }
  for (let y = 7; y <= 15; y++) { const w = Math.round((15 - y) * 0.45); if (w > 0) v.box(5, y, 8 - w, 6, y, 8, 'white'); }
  v.box(5, 18, 9, 6, 19, 9, 'woodDark'); v.box(5, 18, 10, 6, 19, 11, 'yellow');
  v.paint((x, y, z, col) => col === P.white && y >= 5 && y % 4 === 0 && z >= 10 ? P.sky : null);
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('robåt', [12, 7, 20], (v, o) => {
  const c = C(o, 'woodLight');
  for (let y = 0; y <= 4; y++) for (let z = 0; z < 20; z++) for (let x = 0; x < 12; x++) { const w = 4.6 - (4 - y) * 0.5, zz = (z - 9.5) / (9.6 - (4 - y) * 0.7), fr = z > 9.5 ? 1 - Math.max(0, (z - 14) / 6) : 1; if (Math.abs(x - 5.5) <= w * fr && Math.abs(zz) <= 1) v.set(x, y, z, y === 4 ? 'woodDark' : c); }
  for (let y = 1; y <= 4; y++) for (let z = 0; z < 20; z++) for (let x = 1; x < 11; x++) { const w = 3.6 - (4 - y) * 0.5, zz = (z - 9.5) / (8.6 - (4 - y) * 0.7), fr = z > 9.5 ? 1 - Math.max(0, (z - 13) / 6) : 1; if (Math.abs(x - 5.5) <= w * fr && Math.abs(zz) <= 1) v.set(x, y, z, 0); }
  v.box(2, 3, 6, 9, 3, 7, 'woodDark'); v.box(2, 3, 12, 9, 3, 13, 'woodDark');
  v.line(0, 4, 4, 11, 4, 9, 'woodLight'); v.line(0, 4, 13, 11, 4, 8, 'woodLight'); v.box(0, 4, 3, 0, 4, 5, 'woodDark'); v.box(11, 4, 12, 11, 4, 14, 'woodDark');
  v.paint((x, y, z, col) => col === P[c] && y === 1 ? P.white : null);
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('kano', [8, 6, 24], (v, o) => {
  const c = C(o, 'red');
  for (let y = 0; y <= 3; y++) for (let z = 0; z < 24; z++) for (let x = 0; x < 8; x++) { const t = Math.abs(z - 11.5) / 11.5, w = 3.4 * Math.sqrt(Math.max(0, 1 - t * t)) - (3 - y) * 0.45; if (Math.abs(x - 3.5) <= w) v.set(x, y + (t > 0.85 ? 1 : 0), z, c); }
  for (let y = 1; y <= 4; y++) for (let z = 2; z < 22; z++) for (let x = 1; x < 7; x++) { const t = Math.abs(z - 11.5) / 11.5, w = 3.4 * Math.sqrt(Math.max(0, 1 - t * t)) - 1.1; if (Math.abs(x - 3.5) <= w && t < 0.8) v.set(x, y, z, 0); }
  v.box(1, 2, 11, 6, 2, 12, 'woodLight'); v.line(2, 3, 4, 6, 5, 18, 'woodLight'); v.box(5, 5, 17, 6, 5, 19, 'woodDark');
  v.paint((x, y, z, col) => col === P[c] && y === 3 ? P.white : null);
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('ferje', [14, 16, 30], (v, o) => {
  const c = C(o, 'white');
  for (let z = 0; z < 30; z++) { const fr = z > 24 ? (z - 24) / 6 : 0; v.box(Math.round(1 + fr * 3), 0, z, Math.round(12 - fr * 3), 4, z, z % 1 === 0 ? 'blue' : 'blue'); }
  v.box(1, 3, 0, 12, 4, 26, 'white'); v.box(2, 5, 4, 11, 8, 22, c); v.box(3, 9, 8, 10, 11, 18, c);
  for (let z = 5; z <= 21; z += 2) { v.set(2, 7, z, 'glass'); v.set(11, 7, z, 'glass'); }
  v.box(3, 10, 18, 10, 10, 18, 'glass'); v.box(5, 12, 10, 8, 15, 12, 'red'); v.box(5, 15, 10, 8, 15, 12, 'black');
  v.box(1, 2, 0, 12, 2, 28, 'red');
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('skip', [12, 24, 28], (v, o) => {
  const c = C(o, 'woodRed');
  for (let y = 0; y <= 6; y++) for (let z = 0; z < 28; z++) for (let x = 0; x < 12; x++) { const w = 5.4 - (6 - y) * 0.5, t = (z - 13.5) / (13.6 - (6 - y) * 0.8), fr = z > 13 ? 1 - Math.max(0, (z - 18) / 10) : 1; if (Math.abs(x - 5.5) <= w * fr && Math.abs(t) <= 1) v.set(x, y, z, y === 6 ? 'woodDark' : y === 3 ? 'gold' : c); }
  v.box(2, 6, 3, 9, 6, 22, 'woodLight'); v.box(2, 7, 1, 9, 8, 5, 'woodDark');
  for (const [z, h] of [[7, 22], [14, 23], [20, 19]]) { v.box(5, 7, z, 6, h, z, 'woodDark'); for (let y = 10; y <= h - 3; y++) { const w = 4 - Math.abs(y - (h - 3 + 10) / 2) * 0.15; v.box(Math.round(5.5 - w), y, z + 1, Math.round(5.5 + w), y, z + 1, 'white'); } v.box(5, h, z, 6, h, z + 1, 'red'); }
  for (let z = 4; z <= 20; z += 4) { v.set(0, 4, z, 'black'); v.set(11, 4, z, 'black'); }
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('ubåt', [12, 16, 24], (v, o) => {
  // capsule hull, conning tower with a tall bent periscope, big round portholes, propeller cross at the back
  const c = C(o, 'yellow');
  for (let z = 1; z <= 22; z++) { const t = Math.abs(z - 11.5) / 11.2; discZ(v, 5.5, 4.5, z, z, 4.3 * Math.sqrt(Math.max(0.05, 1 - t ** 4)), c); }
  v.box(4, 8, 9, 7, 11, 14, c); v.box(4, 11, 9, 7, 11, 14, 'orange'); v.box(5, 9, 14, 6, 10, 14, 'glass');
  v.box(5, 12, 11, 6, 14, 11, 'steel'); v.box(5, 14, 12, 6, 14, 13, 'steel'); v.box(5, 14, 14, 6, 14, 14, 'glass');
  for (const z of [5, 11, 17]) for (const x of [0, 11]) { discX(v, x, x, 5, z, 1.6, 'steel'); discX(v, x, x, 5, z, 0.9, 'glass'); }
  v.box(5, 4, 23, 6, 5, 23, 'glass'); v.box(5, 1, 0, 6, 8, 0, 'orange'); v.box(1, 4, 0, 10, 5, 1, 'orange');
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('flåte', [16, 12, 16], (v) => {
  for (let i = 0; i < 6; i++) { const x = 1 + i * 2.4; for (let z = 0; z < 16; z++) for (let y = 0; y < 3; y++) for (let xx = Math.floor(x); xx <= Math.ceil(x) + 1; xx++) if ((xx - x - 0.5) ** 2 + (y - 1) ** 2 <= 1.6 && z > (i % 2) && z < 15 - (i % 3 === 0 ? 1 : 0)) v.set(xx, y, z, i % 2 ? 'woodLight' : 'wood'); }
  v.box(0, 2, 3, 15, 2, 3, 'hay'); v.box(0, 2, 12, 15, 2, 12, 'hay');
  v.box(7, 3, 7, 7, 11, 7, 'woodDark'); v.box(8, 7, 7, 11, 10, 7, 'red'); v.box(8, 8, 7, 10, 9, 7, 'white');
}, { group: 'kjøretøy', react: 'ride' });

D('rakett', [12, 24, 12], (v, o) => {
  const c = C(o, 'white');
  for (let y = 3; y <= 20; y++) { const r = y > 15 ? 3.6 * Math.sqrt(1 - ((y - 15) / 6) ** 2) : 3.6; v.cyl(5.5, y, 5.5, r, 1, y > 17 ? 'red' : c); }
  v.cyl(5.5, 21, 5.5, 0.6, 1, 'red');
  for (const [x, z] of [[1, 5], [10, 5], [5, 1], [5, 10]]) { v.box(Math.min(x, 5), 3, Math.min(z, 5), Math.max(x, 6), 7, Math.max(z, 6), 'red'); }
  v.cyl(5.5, 3, 5.5, 3.65, 5, c); v.cyl(5.5, 2, 5.5, 2.2, 1, 'steel');
  discZ(v, 5.5, 13, 9, 9, 1.8, 'glass'); v.paint((x, y, z, col) => col === P.glass ? null : null);
  v.cyl(5.5, 0, 5.5, 1.6, 2, 'flame'); v.set(5, 0, 5, 'glowYellow'); v.set(6, 0, 6, 'orange');
  v.box(4, 12, 9, 7, 14, 9, 'glass'); v.box(5, 11, 9, 6, 15, 9, 'glass'); v.box(3, 12, 9, 3, 14, 9, 'silver'); v.box(8, 12, 9, 8, 14, 9, 'silver');
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('sykkel', [6, 14, 22], (v, o) => {
  // runs along z (riders face +z). Two big solid wheels (black tyre, white rim, silver hub) read as wheels from any angle.
  const c = C(o, 'pink');
  for (const cz of [5, 16]) { discX(v, 2, 3, 4.5, cz, 4.5, 'black'); discX(v, 2, 3, 4.5, cz, 3.3, 'white'); discX(v, 2, 3, 4.5, cz, 1.2, 'silver'); }
  for (const x of [2, 3]) {
    v.line(x, 5, 5, x, 10, 8, c); v.line(x, 4, 10, x, 10, 8, c); v.line(x, 4, 5, x, 4, 10, c);   // rear triangle + seat tube
    v.line(x, 10, 8, x, 10, 15, c); v.line(x, 4, 10, x, 9, 15, c); v.line(x, 11, 15, x, 5, 16, c); // top tube, down tube, fork
  }
  v.box(1, 11, 6, 4, 11, 9, 'black'); v.box(2, 11, 15, 3, 12, 15, 'silver');                       // seat, stem
  v.box(0, 13, 15, 5, 13, 15, 'silver'); v.set(0, 13, 15, 'red'); v.set(5, 13, 15, 'red'); v.set(4, 13, 16, 'yellow'); // handlebar, grips, bell
  v.box(2, 3, 9, 3, 5, 11, 'grey'); v.set(1, 3, 10, 'black'); v.set(4, 5, 10, 'black');             // crank + pedals
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('ski', [14, 5, 24], (v, o) => {
  const c = C(o, 'red');
  for (const x of [3, 8]) { v.box(x, 0, 1, x + 2, 0, 20, c); v.box(x, 1, 21, x + 2, 1, 21, c); v.box(x, 2, 22, x + 2, 2, 22, c); v.box(x, 3, 23, x + 2, 3, 23, c);
    v.paint((xx, y, z, col) => col === P[c] && xx === x + 1 && z % 4 === 1 ? P.white : null);
    v.box(x, 1, 9, x + 2, 2, 12, 'navySoft'); v.box(x, 1, 10, x + 2, 1, 11, 'black'); v.box(x, 0, 1, x + 2, 0, 1, 'black'); }
  // poles lying across with baskets and grips
  v.line(0, 1, 3, 13, 1, 17, 'steel'); v.line(13, 1, 3, 0, 1, 17, 'steel');
  for (const [x, z] of [[1, 4], [12, 4]]) { v.box(x - 1, 1, z - 1, x + 1, 1, z + 1, 'black'); v.set(x, 1, z, 'yellow'); }
  for (const [x, z] of [[13, 17], [0, 17]]) v.box(x, 1, z - 1, x, 2, z, 'pink');
}, { group: 'kjøretøy', colour: true, react: 'ride', variants: { c: ['red', 'blue', 'yellow', 'green'] } });

D('kjelke', [11, 7, 18], (v, o) => {
  const c = C(o, 'red');
  for (const x of [1, 9]) { v.box(x, 0, 1, x, 0, 15, 'steel'); v.set(x, 1, 16, 'steel'); v.set(x, 2, 17, 'steel'); v.set(x, 3, 17, 'steel'); v.box(x, 1, 3, x, 2, 3, 'steel'); v.box(x, 1, 12, x, 2, 12, 'steel'); }
  v.box(1, 3, 1, 9, 3, 15, c); v.paint((x, y, z, col) => col === P[c] && z % 3 === 0 ? P.woodRed : null);
  v.box(1, 4, 1, 1, 5, 6, c); v.box(9, 4, 1, 9, 5, 6, c); v.line(4, 4, 16, 6, 6, 17, 'hay'); v.set(5, 4, 15, 'hay');
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('slede', [14, 14, 22], (v, o) => {
  const c = C(o, 'red');
  for (const x of [1, 12]) { v.box(x, 0, 1, x, 0, 18, 'gold'); for (let k = 0; k < 4; k++) v.set(x, 1 + k, 19 + (k < 2 ? k : 2 - (k - 2)), 'gold'); v.set(x, 5, 19, 'gold'); v.box(x, 1, 4, x, 2, 4, 'gold'); v.box(x, 1, 14, x, 2, 14, 'gold'); }
  v.box(1, 3, 1, 12, 7, 17, c); v.box(2, 5, 2, 11, 7, 15, 0); v.box(2, 5, 2, 11, 5, 15, 'plum');
  v.box(1, 8, 1, 12, 12, 4, c); v.box(2, 8, 2, 11, 12, 3, c); v.box(1, 12, 1, 12, 12, 4, 'gold'); v.box(1, 7, 1, 12, 7, 17, 'gold');
  v.box(1, 3, 17, 12, 9, 18, c); v.set(5, 9, 18, 'gold'); v.set(8, 9, 18, 'gold'); v.box(5, 4, 19, 8, 6, 19, 'gold');
  v.box(4, 6, 7, 9, 9, 12, 'gem1'); v.box(5, 10, 9, 8, 10, 10, 'gold');
}, { group: 'kjøretøy', colour: true, react: 'ride' });

D('vogn', [14, 12, 20], (v, o) => {
  const c = C(o, 'woodLight');
  v.box(1, 4, 2, 12, 4, 15, 'wood'); v.box(1, 5, 2, 12, 8, 2, c); v.box(1, 5, 15, 12, 8, 15, c); v.box(1, 5, 2, 1, 8, 15, c); v.box(12, 5, 2, 12, 8, 15, c);
  v.paint((x, y, z, col) => col === P[c] && y === 8 ? P.woodDark : null);
  v.box(2, 5, 3, 11, 7, 14, 'hay'); v.paint((x, y, z, col) => col === P.hay && y === 7 && H(x, z, 4) < 0.3 ? P.butter : null);
  v.box(6, 5, 16, 7, 5, 19, 'woodDark'); v.box(5, 5, 19, 8, 5, 19, 'woodDark');
}, { group: 'kjøretøy', colour: true, react: 'ride' }, { parts: (() => { const p = {}; for (const [n, z] of [['wheelB', 4], ['wheelF', 13]]) p[n] = { pivot: [7, 3.5, z + 0.5], build(v) { for (const x of [0, 13]) { for (let i = 0; i < 20; i++) { const t = i / 20 * Math.PI * 2; v.set(x, Math.round(3 + Math.sin(t) * 2.8), Math.round(z + Math.cos(t) * 2.8), 'woodDark'); } v.line(x, 0, z, x, 6, z, 'wood'); v.line(x, 3, z - 3, x, 3, z + 3, 'wood'); } } }; return p; })() });

/* ================================================================ MUSIC */
D('gitar', [10, 20, 5], (v, o) => {
  const c = C(o, 'woodLight');
  discZ(v, 4.5, 4, 1, 3, 4.2, c); discZ(v, 4.5, 8.4, 1, 3, 3.2, c);
  discZ(v, 4.5, 6.6, 3, 3, 1.3, 'woodDark'); v.box(3, 2, 3, 6, 2, 4, 'woodDark');
  v.box(4, 11, 2, 5, 17, 3, 'wood'); v.box(3, 17, 2, 6, 19, 3, 'woodDark'); v.set(3, 18, 4, 'silver'); v.set(6, 18, 4, 'silver'); v.set(3, 19, 4, 'silver'); v.set(6, 19, 4, 'silver');
  v.paint((x, y, z, col) => col === P.wood && z === 3 && y % 2 ? P.silver : null);
  v.line(4, 3, 4, 4, 16, 4, 'white'); v.line(5, 3, 4, 5, 16, 4, 'white');
  v.paint((x, y, z, col) => col === P[c] && (x === 0 || x === 9 || y === 0) ? P.woodDark : null);
}, { group: 'musikk', react: 'play' });

D('fløyte', [8, 16, 18], (v) => {
  // recorder lying on a slant: bell on the ground at the back, mouthpiece up front; finger holes on top
  for (let i = 0; i <= 40; i++) { const t = i / 40, y = 1.8 + t * 11, z = 2 + t * 13.5, r = t < 0.12 ? 2.2 : 1.7; v.sphere(4, y, z, r, t < 0.12 ? 'woodLight' : t > 0.85 ? 'woodLight' : 'cream2'); }
  for (let k = 0; k < 7; k++) { const t = 0.2 + k * 0.085, y = Math.round(1.8 + t * 11 + 1.6), z = Math.round(2 + t * 13.5); v.set(4, y, z, 'woodDark'); }
  v.box(3, 13, 15, 5, 13, 16, 'woodDark'); v.set(4, 12, 17, 'black');
  v.box(1, 0, 1, 7, 0, 5, 'pink'); v.box(1, 0, 3, 7, 0, 3, 'rose');
}, { group: 'musikk', react: 'play' });

D('fiolin', [10, 20, 6], (v) => {
  discZ(v, 4.5, 3.8, 1, 2, 3.8, 'woodRed'); discZ(v, 4.5, 8.6, 1, 2, 3, 'woodRed'); v.box(2, 6, 1, 7, 6, 2, 'woodRed'); v.set(1, 6, 1, 0); v.set(8, 6, 1, 0); v.set(1, 6, 2, 0); v.set(8, 6, 2, 0);
  v.box(4, 11, 2, 5, 16, 2, 'woodDark'); v.box(4, 17, 2, 5, 18, 2, 'woodDark'); v.set(5, 19, 2, 'woodDark');
  v.box(4, 3, 3, 5, 11, 3, 'black'); v.set(3, 7, 3, 'woodDark'); v.set(6, 7, 3, 'woodDark'); v.set(3, 6, 3, 'woodDark'); v.set(6, 6, 3, 'woodDark');
  v.line(1, 2, 5, 9, 15, 5, 'woodLight'); v.line(1, 3, 5, 9, 16, 5, 'white');
}, { group: 'musikk', react: 'play' });

D('tuba', [12, 16, 10], (v) => {
  for (let y = 2; y <= 11; y++) discZ(v, 5.5, y, 3, 6, 2.6, 'gold');
  discZ(v, 5.5, 7, 3, 6, 3.2, 'gold'); for (let y = 10; y <= 15; y++) v.cyl(5.5, y, 4.5, 1.8 + (y - 10) * 0.6, 1, 'gold'); v.cyl(5.5, 14, 4.5, 3.6, 2, 0); v.cyl(5.5, 15, 4.5, 4.4, 1, 'honey'); v.cyl(5.5, 15, 4.5, 3.5, 1, 0);
  v.box(7, 6, 7, 9, 9, 7, 'silver'); v.set(7, 10, 7, 'silver'); v.set(8, 10, 7, 'silver'); v.set(9, 10, 7, 'silver');
  v.box(3, 1, 4, 8, 2, 5, 'gold'); v.line(2, 7, 7, 1, 11, 8, 'gold'); v.set(1, 12, 8, 'silver');
}, { group: 'musikk', react: 'play' });

D('note', [10, 16, 3], (v, o) => {
  const c = C(o, 'purple');
  discZ(v, 2.6, 2.4, 1, 1, 2.5, c); discZ(v, 7.6, 4.4, 1, 1, 2.5, c);
  v.box(4, 3, 1, 4, 13, 1, c); v.box(9, 5, 1, 9, 15, 1, c); v.box(4, 13, 1, 9, 15, 1, c); v.box(4, 11, 1, 9, 11, 1, c);
  v.box(0, 0, 0, 9, 15, 0, 0); v.paint((x, y, z, col) => col === P[c] ? null : null);
  v.set(1, 3, 2, 'white');
}, { group: 'musikk', colour: true, react: 'look' });

/* ================================================================ FAIRY-TALE */
D('tiara', [15, 11, 8], (v) => {
  // princess tiara: curved silver band, a filled scalloped front plate with five peaks, pink heart gem in the middle
  for (let i = 0; i <= 30; i++) { const t = Math.PI * (i / 30), x = Math.round(7 - Math.cos(t) * 6.6), z = Math.round(1 + Math.sin(t) * 4.6); v.box(x, 0, z, x, 1, z, 'gold'); }
  const peak = x => { const d = Math.abs(x - 7); return Math.round(2 + 6.2 * Math.max(0, Math.cos(d * Math.PI / 6.8)) + (d % 3 === 0 ? 1.5 : 0)); };
  for (let x = 1; x <= 13; x++) { const h = peak(x), z = Math.round(1 + Math.sin(Math.PI * (x - 0.4) / 14) * 4.6); v.box(x, 2, z, x, h, z, 'silver'); }
  v.paint((x, y, z, c) => c === P.silver && y >= 2 && !v.get(x, y + 1, z) ? P.gold : null);
  v.paint((x, y, z, c) => c === P.silver && y >= 3 && (x + y) % 5 === 0 ? P.white : null);
  const hz = Math.round(1 + 4.6); v.set(7, 6, hz + 1, 'gem1'); v.set(6, 7, hz + 1, 'gem1'); v.set(8, 7, hz + 1, 'gem1'); v.set(7, 5, hz + 1, 'gem1'); v.set(6, 6, hz + 1, 'gem1'); v.set(8, 6, hz + 1, 'gem1'); v.set(6, 7, hz + 2, 'white');
  for (const [x, c] of [[3, 'gem2'], [11, 'gem2'], [1, 'gem3'], [13, 'gem3']]) { const h = peak(x), z = Math.round(1 + Math.sin(Math.PI * (x - 0.4) / 14) * 4.6); v.set(x, h + 1, z, c); }
  v.set(7, 10, hz, 'glowYellow');
}, { group: 'eventyr', react: 'wear', wear: { anchor: 'head', dy: -0.06 } });

D('fest', [16, 22, 12], (v) => {
  // party: three balloons tied to a gift
  v.box(4, 0, 3, 11, 5, 9, 'pink'); v.box(7, 0, 3, 8, 5, 9, 'butter'); v.box(4, 0, 6, 11, 5, 6, 'butter'); v.box(4, 6, 3, 11, 6, 9, 'pink'); v.box(7, 6, 3, 8, 6, 9, 'butter');
  v.set(6, 7, 6, 'butter'); v.set(5, 8, 6, 'butter'); v.set(9, 7, 6, 'butter'); v.set(10, 8, 6, 'butter');
  const bal = (x, y, z, c) => { v.ellipsoid(x, y, z, 2.6, 3.1, 2.6, c); v.set(Math.round(x), Math.round(y - 3.4), Math.round(z), c); v.line(Math.round(x), Math.round(y - 4), Math.round(z), 7, 8, 6, 'white'); v.set(Math.round(x - 1), Math.round(y + 1), Math.round(z + 2), 'white'); };
  bal(3, 15, 5, 'red'); bal(8, 18, 6, 'sky'); bal(12.5, 15, 6.5, 'yellow');
  for (let i = 0; i < 8; i++) v.set(Math.floor(H(i, 3, 3) * 16), 0, Math.floor(H(i, 5, 3) * 12), ['mint', 'pink', 'yellow', 'sky'][i % 4]);
}, { group: 'eventyr', react: 'look' });

D('gave', [12, 13, 12], (v, o) => {
  const c = C(o, 'red'), rib = pick(o, 'ribbon', o.c === 'yellow' ? 'red' : 'yellow');
  v.box(1, 0, 1, 10, 7, 10, c); v.box(0, 8, 0, 11, 9, 11, c);
  v.box(5, 0, 0, 6, 9, 11, rib); v.box(0, 0, 5, 11, 9, 6, rib); v.box(5, 0, 1, 6, 7, 10, rib); v.box(1, 0, 5, 10, 7, 6, rib);
  v.box(5, 0, 0, 6, 7, 0, 0); v.box(5, 0, 11, 6, 7, 11, 0); v.box(0, 0, 5, 0, 7, 6, 0); v.box(11, 0, 5, 11, 7, 6, 0);
  v.box(5, 0, 0, 6, 7, 1, rib); v.box(5, 0, 10, 6, 7, 11, rib);
  // bow
  v.ellipsoid(3.6, 10.8, 5.5, 2.2, 1.6, 1.2, rib); v.ellipsoid(7.4, 10.8, 5.5, 2.2, 1.6, 1.2, rib); v.box(5, 10, 5, 6, 11, 6, rib);
  v.set(3, 11, 5, c); v.set(8, 11, 5, c);
}, { group: 'eventyr', colour: true, react: 'look' });

D('hjerte', [12, 11, 5], (v, o) => {
  const c = C(o, 'red');
  heart(v, 5.5, 4.4, 1, 3, 5.2, c); heart(v, 5.5, 4.4, 0, 4, 4.2, c);
  v.set(3, 8, 4, 'white'); v.set(2, 7, 4, 'white'); v.set(3, 8, 3, 'white');
  v.paint((x, y, z, col) => col === P[c] && y <= 1 ? P[c === 'red' ? 'cherry' : c] : null);
}, { group: 'eventyr', colour: true, react: 'look' });

D('perle', [16, 13, 14], (v) => {
  // open scallop shell: ribbed bottom bowl, the lid standing up behind, a big shiny pearl in the middle
  for (let y = 0; y <= 2; y++) for (let z = 0; z < 14; z++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, (z - 7) * 1.1); if (d <= 7.4 && (y === 0 || d > 5.6 - y)) v.set(x, y, z, 'blossom'); }
  for (let x = 0; x < 16; x++) for (let y = 1; y < 13; y++) { const d = Math.hypot(x - 7.5, (y - 1) * 0.95); if (d <= 7.4) v.box(x, y, 1, x, y, d > 6.2 ? 2 : 1, 'blossom'); }
  v.paint((x, y, z, c) => c === P.blossom && (Math.round(Math.atan2(y + z * 0.0 - 1, x - 7.5) * 5) % 2 === 0) ? P.peach : null);
  v.cyl(7.5, 1, 7.5, 2.6, 1, 'pink'); v.sphere(7.5, 4.4, 7.6, 3, 'milk'); v.set(6, 6, 10, 'white'); v.set(6, 5, 10, 'white'); v.set(7, 6, 10, 'white'); v.set(9, 7, 9, 'glowYellow');
}, { group: 'eventyr', react: 'look' });

D('pakke', [14, 9, 11], (v, o) => {
  const pc = C(o, 'woodLight');
  v.box(1, 0, 1, 12, 7, 9, pc); v.paint((x, y, z, c) => (x + y * 3 + z) % 7 === 0 ? P.honey : null);
  v.box(6, 0, 0, 7, 8, 10, 'white'); v.box(0, 0, 4, 13, 8, 5, 'white'); v.box(6, 0, 1, 7, 7, 9, pc); v.box(1, 0, 4, 12, 7, 5, pc);
  v.box(6, 8, 1, 7, 8, 9, 'white'); v.box(1, 8, 4, 12, 8, 5, 'white'); v.box(6, 0, 10, 7, 7, 10, 'white'); v.box(13, 0, 4, 13, 7, 5, 'white');
  v.box(6, 0, 0, 7, 7, 0, 0); v.box(0, 0, 4, 0, 7, 5, 0);
  v.box(2, 3, 10, 5, 6, 10, 'white'); v.box(3, 4, 10, 4, 5, 10, 'red'); v.box(9, 6, 10, 11, 7, 10, 'sky');
}, { group: 'eventyr', colour: true, react: 'look' });

D('skatt', [16, 14, 12], (v) => {
  v.box(1, 0, 1, 14, 6, 10, 'woodRed'); v.box(2, 1, 2, 13, 6, 9, 0); v.box(2, 1, 2, 13, 5, 9, 'gold');
  v.ellipsoid(7.5, 6, 5.5, 5.6, 2, 3.6, 'gold'); v.paint((x, y, z, c) => c === P.gold && y >= 6 && H(x, z, y) < 0.12 ? ['gem1', 'gem2', 'gem3', 'glowYellow'][Math.floor(H(z, x, 2) * 4)] : null);
  for (const x of [1, 14]) v.box(x, 0, 1, x, 6, 10, 'gold'); v.box(1, 0, 1, 14, 0, 10, 'woodDark');
  v.box(7, 3, 11, 8, 5, 11, 'gold'); v.set(7, 4, 11, 'black');
  // open lid at the back
  v.box(1, 7, 0, 14, 13, 1, 'woodRed'); v.box(1, 13, 0, 14, 13, 1, 'gold'); v.box(1, 7, 0, 1, 13, 1, 'gold'); v.box(14, 7, 0, 14, 13, 1, 'gold');
  v.set(3, 8, 6, 'gold'); v.set(12, 8, 4, 'gold'); v.box(3, 7, 9, 4, 7, 10, 'gold');
}, { group: 'eventyr', react: 'look' });

D('gull', [13, 8, 11], (v) => {
  // a little heap of gold bars with bevelled tops + a few coins and a sparkle
  const bar = (x, y, z) => { v.box(x, y, z, x + 4, y + 1, z + 2, 'honey'); v.box(x + 1, y + 2, z, x + 3, y + 2, z + 2, 'gold'); v.box(x + 1, y + 1, z, x + 3, y + 1, z + 2, 'gold'); };
  bar(1, 0, 1); bar(7, 0, 1); bar(1, 0, 6); bar(7, 0, 6); bar(4, 3, 3);
  v.paint((x, y, z, c) => c === P.gold && !v.get(x, y + 1, z) && (x + z) % 3 === 0 ? P.yellow : null);
  for (const [x, z] of [[11, 9], [0, 9], [6, 10]]) { v.cyl(x, 0, z, 1.3, 1, 'gold'); v.set(x, 1, z, 'honey'); }
  v.set(6, 6, 4, 'glowYellow'); v.set(5, 7, 4, 'white');
}, { group: 'eventyr', react: 'look' });

D('stav', [9, 21, 4], (v, o) => {
  v.box(3, 0, 1, 4, 10, 2, 'lilac'); v.paint((x, y, z, c) => c === P.lilac && y % 3 === 0 ? P.white : null);
  const s = pick(o, 'tip', 'glowYellow');
  for (let z = 1; z <= 2; z++) for (let y = 10; y < 21; y++) for (let x = 0; x < 9; x++) { const dx = x - 4, dy = y - 15, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx) - Math.PI / 2; if (d <= 1.9 + 2.7 * Math.pow((Math.cos(5 * th) + 1) / 2, 2.2) + 0.15) v.set(x, y, z, s); }
  v.set(3, 16, 3, 'white'); v.set(4, 15, 3, 'gold');
}, { group: 'eventyr', react: 'play', wear: { anchor: 'hand', dy: -0.05 } });

D('flagg', [14, 22, 4], (v, o) => {
  v.box(1, 0, 1, 1, 21, 1, 'white'); v.set(1, 21, 1, 'gold'); v.box(0, 0, 0, 2, 0, 2, 'grey');
  const c = C(o, 'red');
  for (let x = 2; x <= 13; x++) for (let y = 12; y <= 20; y++) { const wy = y + (Math.sin(x * 0.7) > 0.5 ? 0 : 0); const cross = (x >= 5 && x <= 7) || (y >= 15 && y <= 17), inner = x === 6 || y === 16; v.set(x, wy, 1 + (x % 4 === 0 ? 1 : 0), inner ? 'blue' : cross ? 'white' : c); }
}, { group: 'eventyr', colour: true, react: 'look' });

D('skjold', [12, 14, 4], (v, o) => {
  const c = C(o, 'blue');
  for (let y = 0; y < 14; y++) for (let x = 0; x < 12; x++) { const w = y > 6 ? 5.6 : 5.6 * Math.sqrt(Math.max(0, 1 - ((6 - y) / 6.4) ** 2)) - (y < 2 ? 0 : 0); const ww = y >= 6 ? 5.6 : 5.6 * (y / 6) ** 0.6; if (Math.abs(x - 5.5) <= ww) v.box(x, y, 1, x, y, 2, c); }
  v.paint((x, y, z, col) => col === P[c] && (!v.get(x - 1, y, z) || !v.get(x + 1, y, z) || !v.get(x, y - 1, z) || !v.get(x, y + 1, z)) ? P.gold : null);
  heart(v, 5.5, 6, 3, 3, 2.6, 'red'); v.set(4, 8, 3, 'white');
}, { group: 'eventyr', colour: true, react: 'look' });
})();
