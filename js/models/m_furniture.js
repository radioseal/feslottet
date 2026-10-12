/* Feslottet – MODELS-1: castle furniture & interactable props (DESIGN §7 items 1–85). Palette NAMES only; front faces +z.
   Scale 1/10 for big furniture, 1/16 for props. Every moving bit is a named part (VOX parts = pivot groups in obj.userData.parts):
   doors (door, doorL, doorR, shutterL, shutterR), lids (lid, lid0..), keys, pendulum, hand, wheel(s), plus per-object extras.
   meta.anim describes the intended motion for F.BEH (rotation sign conventions in radians). meta.room = room key. */
(function () {
'use strict';
const F = window.F, V = F.VOX;
const H2 = (a, b, c) => F.U.hash2(a, b, c);
function D(id, size, scale, build, parts, meta) { V.def(id, { size, scale, build, parts: parts || undefined, meta: Object.assign({ group: 'castle' }, meta || {}) }); }

/* ------------------------------------------------------------ helpers */
// rounded box: box with the 8 corner voxels removed (and optionally the vertical edges)
function rbox(v, x0, y0, z0, x1, y1, z1, c, edges) {
  v.box(x0, y0, z0, x1, y1, z1, c);
  for (const x of [x0, x1]) for (const z of [z0, z1]) { if (edges) v.box(x, y0, z, x, y1, z, 0); else { v.set(x, y0, z, 0); v.set(x, y1, z, 0); } }
  return v;
}
function legs(v, x0, z0, x1, z1, y0, y1, c, w) { w = w || 1; for (const x of [x0, x1 - w + 1]) for (const z of [z0, z1 - w + 1]) v.box(x, y0, z, x + w - 1, y1, z + w - 1, c); }
// disc facing +z (xy plane) / facing +x (yz plane)
function discZ(v, cx, cy, z, r, c, z1) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.2) v.box(x, y, z, x, y, z1 == null ? z : z1, c); }
function discX(v, x, cy, cz, r, c, x1) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) if ((z - cz) ** 2 + (y - cy) ** 2 <= r * r + 0.2) v.box(x, y, z, x1 == null ? x : x1, y, z, c); }
// horizontal cylinder along x / along z
function cylX(v, x0, x1, cy, cz, r, c) { for (let x = x0; x <= x1; x++) discX(v, x, cy, cz, r, c); }
function cylZ(v, z0, z1, cx, cy, r, c) { for (let z = z0; z <= z1; z++) discZ(v, cx, cy, z, r, c); }
// ring (annulus) in the xz plane at height y
function ringY(v, cx, y, cz, r0, r1, c) { for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) { const d = Math.hypot(x - cx, z - cz); if (d <= r1 + 0.25 && d >= r0 - 0.25) v.set(x, y, z, c); } }
// hollow vessel (cylinder wall + bottom)
function vessel(v, cx, y0, cz, r, h, c, inner) { v.cyl(cx, y0, cz, r, h, c); v.cyl(cx, y0 + 1, cz, r - 1, h - 1, 0); if (inner) v.cyl(cx, y0 + 1, cz, r - 1, 1, inner); }
// candle with flame (flame = glow)
function candle(v, x, y, z, h, c) { v.box(x, y, z, x, y + h - 1, z, c || 'cream'); v.set(x, y + h, z, 'flame'); v.set(x, y + h + 1, z, 'lamp'); }
// cute face on the +z side: eyes 2 apart, cheeks, smile
function face(v, cx, ey, z, o) {
  o = o || {}; const g = o.gap || 2;
  v.set(cx - g, ey, z, 'black'); v.set(cx + g, ey, z, 'black');
  if (o.big) { v.set(cx - g, ey + 1, z, 'black'); v.set(cx + g, ey + 1, z, 'black'); }
  if (o.cheeks !== false) { v.set(cx - g - 1, ey - 1, z, 'pink'); v.set(cx + g + 1, ey - 1, z, 'pink'); }
  if (o.smile) { v.set(cx - 1, ey - 2, z, 'black'); v.set(cx, ey - 2, z, 'black'); }
}
const BOOKC = ['rose', 'sky', 'butter', 'mint', 'lilac', 'coral', 'teal', 'roofRed', 'plum', 'roofBlue'];
// row of books standing along x on y0, depth z0..z1
function books(v, x0, x1, y0, hMax, z0, z1, seed) {
  let x = x0, i = 0;
  while (x <= x1) {
    const w = 1 + (H2(x, seed, 3) < 0.3 ? 1 : 0), h = hMax - Math.floor(H2(x, seed, 4) * 3);
    const c = BOOKC[Math.floor(H2(x, seed, 5) * BOOKC.length)];
    if (H2(x, seed, 6) < 0.08 && x + 2 <= x1) { v.box(x, y0, z0, x + 2, y0, z1, c); x += 3; i++; continue; } // a lying book
    v.box(x, y0, z0, Math.min(x1, x + w - 1), y0 + h - 1, z1, c);
    v.box(x, y0 + h - 3, z1, Math.min(x1, x + w - 1), y0 + h - 3, z1, 'gold');     // spine band
    x += w; i++;
  }
}
// pixel glyph on +z plane
function glyph(v, rows, x0, ytop, z, c) { rows.forEach((row, i) => { for (let j = 0; j < row.length; j++) if (row[j] === 'X') v.set(x0 + j, ytop - i, z, c); }); }
const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
const HEART3 = ['X.X', 'XXX', '.X.'];
const STAR5 = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'];
const PLUS = ['.X.', 'XXX', '.X.'];

/* ============================================================ HALLEN */
// 1 c_inngangsdor – big arched double door; behind the doors a painted view of the park
D('c_inngangsdor', [30, 40, 7], 1 / 10, (v) => {
  const inner = (x, y) => x >= 3 && x <= 26 && (y <= 22 || (x - 14.5) ** 2 + (y - 22) ** 2 <= 11.6 ** 2);
  const outer = (x, y) => (y <= 24 || (x - 14.5) ** 2 + (y - 24) ** 2 <= 15.2 ** 2);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) {
    if (!outer(x, y)) continue;
    if (inner(x, y)) { v.set(x, y, 0, y < 6 ? ((x + y) % 3 ? 'grass' : 'leaf2') : y < 8 ? 'pathStone' : ((x * 7 + y * 3) % 23 === 0 ? 'white' : 'sky')); continue; }
    const a = Math.atan2(y - 24, x - 14.5), vs = y > 24 ? Math.floor((a + Math.PI) * 4) : Math.floor(y / 3);
    v.box(x, y, 0, x, y, 3, (vs & 1) ? 'stone2' : 'stone');
  }
  // keystone with a crown
  v.box(13, 34, 4, 16, 39, 4, 'gold'); v.set(13, 39, 4, 0); v.set(16, 39, 4, 0); v.set(14, 38, 5, 'gem1'); v.set(15, 38, 5, 'gem2');
  v.box(1, 0, 4, 28, 0, 6, 'stone2');                       // step
  // the park view: a little drawbridge path and a tree-free rolling hill + sun
  v.box(12, 0, 0, 17, 7, 0, 'pathStone'); v.set(22, 28, 0, 'yellow'); v.set(23, 28, 0, 'yellow'); v.set(22, 29, 0, 'yellow'); v.set(23, 29, 0, 'yellow');
}, {
  doorL: { pivot: [3, 0, 4.5], build(v) { doorLeaf(v, 3, 14, false); } },
  doorR: { pivot: [27, 0, 4.5], build(v) { doorLeaf(v, 15, 26, true); } },
}, { room: 'hallen', anim: { doorL: 'rotation.y 0 -> -1.6 (opens toward +z)', doorR: 'rotation.y 0 -> +1.6' } });
function doorLeaf(v, x0, x1, right) {
  const inner = (x, y) => (y <= 22 || (x - 14.5) ** 2 + (y - 22) ** 2 <= 11.6 ** 2);
  for (let y = 0; y < 34; y++) for (let x = x0; x <= x1; x++) {
    if (!inner(x, y)) continue;
    const seam = (x - x0) % 4 === 3;
    v.box(x, y, 4, x, y, 4, seam ? 'woodDark' : 'woodRed');
  }
  for (const y of [4, 15, 26]) for (let x = x0; x <= x1; x++) if (inner(x, y)) v.set(x, y, 5, 'gold');       // hinge bands
  // heart window
  const hx = right ? x0 + 3 : x0 + 4;
  glyph(v, HEART, hx, 25, 4, 'crystal');
  // ring handle
  const rx = right ? x0 + 1 : x1 - 1;
  v.set(rx, 13, 5, 'gold'); v.set(rx, 12, 6, 'gold'); v.set(rx, 10, 6, 'gold'); v.set(rx, 11, 6, 0); v.set(rx - 1, 11, 6, 'gold'); v.set(rx + 1, 11, 6, 'gold');
}

// 2 c_heis – gilded lift cage with sliding lattice doors and a floor dial
D('c_heis', [28, 38, 13], 1 / 10, (v) => {
  v.box(0, 0, 0, 27, 1, 12, 'stone2');                         // base step
  v.box(1, 2, 0, 26, 30, 1, 'woodRed');                        // back panel
  for (let y = 4; y < 28; y += 6) for (let x = 3; x < 25; x += 6) v.box(x, y, 2, x + 3, y + 3, 2, 'wood');
  v.box(9, 6, 2, 18, 24, 2, 'glass');                          // mirror
  v.box(2, 2, 2, 25, 2, 10, 'roofRed');                        // carpet
  for (const x of [1, 26]) for (const z of [1, 11]) v.box(x, 2, z, x, 30, z, 'gold');   // corner posts
  for (const x of [1, 26]) for (let y = 4; y < 30; y += 3) v.box(x, y, 2, x, y, 10, 'gold'); // side lattice rails
  for (const x of [1, 26]) v.box(x, 3, 3, x, 29, 9, 'glass');
  v.box(0, 31, 0, 27, 32, 12, 'gold');                         // top
  // crown dome
  for (let i = 0; i < 4; i++) v.box(3 + i * 2, 33 + i, 2 + i, 24 - i * 2, 33 + i, 10 - i, i & 1 ? 'roofPink' : 'pink');
  v.box(13, 37, 6, 14, 37, 6, 'gold');
  // dial (cream semicircle) on the front of the dome
  for (let y = 31; y <= 36; y++) for (let x = 8; x <= 19; x++) { const d = Math.hypot(x - 13.5, y - 31); if (d <= 5.6) v.set(x, y, 12, d > 4.8 ? 'gold' : 'cream'); }
  for (let i = 0; i <= 4; i++) { const a = Math.PI * (0.1 + 0.8 * i / 4); v.set(Math.round(13.5 - Math.cos(a) * 4), Math.round(31 + Math.sin(a) * 4), 12, 'navySoft'); }
  // call-button column (the number buttons themselves are big HTML chips)
  v.box(27, 10, 9, 27, 18, 11, 'gold'); v.set(27, 16, 12, 'butter'); v.set(27, 14, 12, 'butter'); v.set(27, 12, 12, 'gem2');
}, {
  doorL: { pivot: [2, 2, 11.5], build(v) { liftGate(v, 2, 13); } },
  doorR: { pivot: [26, 2, 11.5], build(v) { liftGate(v, 14, 25); } },
  viser: { pivot: [13.5, 31.5, 13], build(v) { for (let i = 0; i < 4; i++) v.set(13, 32 + i, 13, i === 3 ? 'rose' : 'roofRed'); } },
}, { room: 'hallen', anim: { doorL: 'position.x -1.1 m (slides open)', doorR: 'position.x +1.1 m', viser: 'rotation.z sweep -1.2..+1.2 (floor counter)' } });
function liftGate(v, x0, x1) {
  for (let y = 2; y <= 29; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === 2 || y === 29;
    const lat = ((x + y) % 4 === 0) || ((x - y + 400) % 4 === 0);
    if (edge || lat) v.set(x, y, 11, 'gold'); else v.set(x, y, 11, 'glass');
  }
  v.set(x0 === 2 ? x1 - 1 : x0 + 1, 15, 12, 'gold');
}

// 3 c_rustning – friendly knight armour holding a rose, pink plume; visor lifts, a mouse waves inside
D('c_rustning', [18, 34, 12], 1 / 16, (v) => {
  v.box(3, 0, 2, 14, 1, 10, 'woodDark'); v.box(4, 2, 3, 13, 2, 9, 'woodRed');      // plinth
  for (const x of [6, 10]) { v.box(x, 3, 5, x + 1, 10, 7, 'steel'); v.box(x, 3, 5, x + 1, 4, 8, 'steel'); v.box(x, 7, 7, x + 1, 7, 7, 'gold'); } // legs + knees
  v.box(5, 11, 4, 12, 13, 8, 'steel'); v.box(5, 11, 8, 12, 11, 8, 'gold');           // tassets
  v.ellipsoid(8.5, 17, 6, 4.2, 4.2, 3, 'steel');                                      // torso
  glyph(v, HEART3, 7, 18, 9, 'roofPink');
  v.box(5, 14, 9, 12, 14, 9, 'gold');                                               // belt
  for (const x of [3.5, 13.5]) { v.sphere(x, 21, 6, 2.2, 'silver'); v.box(Math.round(x) - 1, 13, 5, Math.round(x), 19, 7, 'steel'); v.box(Math.round(x) - 1, 12, 6, Math.round(x), 13, 8, 'steel'); }
  // rose in the right gauntlet
  v.box(13, 13, 9, 13, 20, 9, 'leaf'); v.set(12, 16, 9, 'leaf'); v.box(12, 21, 8, 14, 22, 10, 'rose'); v.set(13, 23, 9, 'rose');
  v.ellipsoid(8.5, 26.5, 6, 3.8, 4, 3.6, 'steel');                                    // helmet
  v.box(5, 23, 4, 12, 23, 9, 'gold');                                                // gorget band
  v.box(7, 24, 7, 10, 28, 9, 'navySoft');                                            // dark-ish inside behind the visor
  // plume
  for (let i = 0; i < 9; i++) v.sphere(8.5 - i * 0.6, 31 + Math.sin(i * 0.5) * 1.5, 5 - i * 0.4, 1.6, i & 1 ? 'roofPink' : 'pink');
}, {
  visor: { pivot: [8.5, 29, 6], build(v) { for (let y = 24; y <= 29; y++) for (let x = 5; x <= 12; x++) { const q = ((x - 8.5) / 3.6) ** 2 + ((y - 26.5) / 3.8) ** 2; if (q <= 1) v.set(x, y, 9 + (q < 0.5 ? 1 : 0), (y === 26 && x > 5 && x < 12) ? 'steel' : 'silver'); } v.set(8, 25, 10, 'gold'); v.set(9, 25, 10, 'gold'); } },
  mus: { pivot: [8.5, 25, 8], build(v) { v.box(7, 25, 8, 10, 26, 8, 'grey'); v.set(7, 27, 8, 'pink'); v.set(10, 27, 8, 'pink'); v.set(8, 26, 9, 'black'); v.set(9, 26, 9, 'black'); v.set(8.5 | 0, 25, 9, 'pink'); v.set(11, 26, 8, 'grey'); v.set(11, 27, 8, 'skin'); } },
}, { room: 'hallen', anim: { visor: 'rotation.x 0 -> -1.3 (lifts up)', mus: 'pops forward / waves (rotation.z ±0.4)' } });

// 4 c_gelender – short grand staircase with a curly banister; newel knob is a part
D('c_gelender', [40, 26, 14], 1 / 10, (v) => {
  for (let i = 0; i < 7; i++) { const x0 = 6 + i * 4; v.box(x0, 0, 0, 39, 3 * i + 2, 11, 'stone2'); v.box(x0, 3 * i + 2, 0, x0 + 3, 3 * i + 2, 11, 'roofRed'); v.box(x0, 3 * i + 2, 11, x0 + 3, 3 * i + 2, 11, 'gold'); }
  v.box(34, 0, 0, 39, 22, 11, 'stone2'); v.box(34, 22, 0, 39, 22, 11, 'roofRed');
  // balusters + rail along the front edge (z 12)
  for (let x = 6; x <= 39; x += 2) { const st = Math.min(6, Math.floor((x - 6) / 4)); const y0 = 3 * st + 3; v.box(x, y0, 12, x, y0 + 5, 12, 'white'); }
  for (let x = 4; x <= 39; x++) { const t = Math.max(0, Math.min(1, (x - 6) / 28)); const y = Math.round(8 + t * 18 * 0.95); v.box(x, y, 12, x, y + 1, 13, 'woodRed'); }
  // curl at the bottom of the rail + newel post
  v.box(2, 0, 11, 5, 1, 13, 'stone2'); v.box(3, 2, 12, 4, 8, 13, 'white'); v.box(2, 8, 11, 5, 9, 13, 'woodRed');
}, {
  knopp: { pivot: [3.5, 10, 12.5], build(v) { v.sphere(3.5, 11.5, 12.5, 1.8, 'gold'); v.set(3, 13, 12, 'gold'); } },
}, { room: 'hallen', anim: { knopp: 'spin rotation.y / bounce' }, slide: { from: [-1.6, 2.6, 0.75], to: [1.6, 0.9, 0.75] } });

// 5 c_portrett – the king's portrait with a painted cat; right eye winks, cat head yawns
D('c_portrett', [26, 32, 3], 1 / 16, (v) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 26; x++) {
    const fr = x < 2 || x > 23 || y < 2 || y > 29;
    if (fr) v.set(x, y, 0, ((x + y) % 3 === 0) ? 'honey' : 'gold');
    else v.set(x, y, 0, y < 8 ? ((x + y) % 5 ? 'leaf2' : 'grass') : 'sky');
  }
  for (const [x, y] of [[1, 1], [24, 1], [1, 30], [24, 30]]) { v.set(x, y, 1, 'gold'); v.set(x, y, 2, 'honey'); }
  v.box(11, 31, 1, 14, 31, 1, 'gold'); v.set(12, 31, 2, 'gem1');
  // king: red robe with ermine collar
  v.box(6, 2, 1, 19, 10, 1, 'roofRed'); v.box(7, 10, 1, 18, 11, 1, 'white'); for (const x of [8, 11, 14, 17]) v.set(x, 11, 1, 'grey');
  v.box(12, 2, 1, 13, 9, 1, 'gold');
  v.ellipsoid(12.5, 16.5, 1, 4.6, 5, 0.5, 'skin');                                  // head
  v.box(9, 12, 1, 16, 13, 1, 'wool'); v.box(10, 11, 1, 15, 11, 1, 'wool'); v.box(11, 14, 1, 14, 14, 1, 'wool'); // beard
  v.set(10, 15, 1, 'wool'); v.set(15, 15, 1, 'wool');
  v.set(12, 15, 2, 'coral'); v.set(13, 15, 2, 'coral');                            // smile
  v.set(9, 16, 1, 'pink'); v.set(16, 16, 1, 'pink');                              // cheeks
  v.set(10, 18, 1, 'black');                                                      // left eye (right eye is a part)
  v.box(8, 21, 1, 17, 22, 1, 'gold'); for (const x of [8, 11, 14, 17]) v.set(x, 23, 1, 'gold'); v.set(12, 22, 2, 'gem2'); v.set(14, 22, 2, 'gem1');
  // painted cat on the right
  v.box(19, 2, 1, 22, 5, 1, 'orange');
}, {
  eye: { pivot: [15.5, 18.5, 1.5], build(v) { v.set(15, 18, 1, 'black'); } },
  katt: { pivot: [20.5, 6, 1.5], build(v) { v.box(19, 6, 1, 22, 8, 1, 'orange'); v.set(19, 9, 1, 'orange'); v.set(22, 9, 1, 'orange'); v.set(20, 7, 2, 'black'); v.set(21, 7, 2, 'black'); v.set(20, 6, 2, 'pink'); } },
}, { room: 'hallen', anim: { eye: 'scale.y 1 -> 0.15 -> 1 (wink)', katt: 'scale.y 1.3 + rotation.z (yawn)' } });

// 6 c_klokkestreng – bell pull: bracket, brass bell, velvet rope with a gold tassel
D('c_klokkestreng', [12, 46, 7], 1 / 16, (v) => {
  v.box(4, 38, 0, 7, 45, 1, 'woodRed'); v.box(5, 44, 2, 6, 44, 4, 'gold'); v.box(5, 39, 2, 6, 39, 2, 'gold');
  v.box(5, 40, 2, 6, 43, 3, 'gold');                                        // bracket arm
}, {
  bell: { pivot: [5.5, 44, 5], build(v) { v.box(5, 43, 5, 6, 43, 5, 'gold'); for (let i = 0; i < 5; i++) ringY(v, 5.5, 42 - i, 5, 0, 1 + i * 0.6, i === 4 ? 'honey' : 'gold'); v.set(5, 37, 5, 'honey'); } },
  rope: { pivot: [5.5, 38, 2], build(v) {
    for (let y = 8; y <= 37; y++) v.set(5, y, 2, (y % 6 === 0) ? 'gold' : 'roofRed');
    for (let y = 2; y <= 7; y++) for (let x = 3; x <= 8; x++) for (let z = 0; z <= 4; z++) { const r = Math.hypot(x - 5.5, z - 2) ; if (r <= 1 + (8 - y) * 0.35) v.set(x, y, z, y === 7 ? 'roofRed' : 'gold'); }
  } },
}, { room: 'hallen', anim: { rope: 'pull: position.y -0.15 then back', bell: 'swing rotation.z ±0.5 (n times)' } });

// 7 c_loper – red carpet that rolls up (teppe scales along z toward the back, rull moves with it)
D('c_loper', [22, 5, 62], 1 / 10, (v) => {
  for (const x of [1, 4, 7, 10, 13, 16, 19]) v.set(x, 0, 0, 'gold');            // fringe at the back end
}, {
  rug: { pivot: [11, 0, 1], build(v) {
    for (let z = 1; z <= 58; z++) for (let x = 1; x <= 20; x++) {
      const b = x === 1 || x === 20 || x === 3 || x === 18;
      const hz = (z - 6) % 12, hx = x - 8;
      const heart = hz >= 0 && hz < 5 && hx >= 0 && hx < 5 && HEART[hz][hx] === 'X';
      v.set(x, 0, z, b ? 'gold' : heart ? 'rose' : 'roofRed');
    }
  } },
  rull: { pivot: [11, 1.5, 59.5], build(v) { cylX(v, 1, 20, 1.5, 59.5, 1.6, 'roofRed'); for (const x of [1, 20]) discX(v, x, 1.5, 59.5, 1.2, 'gold'); } },
}, { room: 'hallen', anim: { rug: 'scale.z 1 -> 0.06 (roll up toward the back)', rull: 'position.z follows the carpet end; rotation.x spins' } });

// 8 c_palme – potted palm; a giant bud on top blooms (part blomst), fronds sway (part blader)
D('c_palme', [26, 46, 26], 1 / 16, (v) => {
  v.cyl(13, 0, 13, 6, 2, 'woodRed'); v.cyl(13, 2, 13, 5.5, 7, 'coral'); v.cyl(13, 9, 13, 6.5, 2, 'butter');
  v.cyl(13, 10, 13, 5, 1, 'soil');
  for (let y = 11; y <= 32; y++) { const x = 13 + Math.round(Math.sin(y * 0.12) * 1.2); v.box(x - 1, y, 12, x + 1, y, 14, (y % 3 === 0) ? 'woodDark' : 'woodLight'); }
}, {
  blader: { pivot: [13, 33, 13], build(v) {
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3;
      for (let t = 0; t <= 11; t++) {
        const x = 13 + Math.cos(a) * t, z = 13 + Math.sin(a) * t, y = 33 + t * 0.55 - (t * t) * 0.09;
        v.set(Math.round(x), Math.round(y), Math.round(z), (t & 1) ? 'leaf' : 'leaf2');
        if (t > 1 && t < 10) { v.set(Math.round(x - Math.sin(a)), Math.round(y - 1), Math.round(z + Math.cos(a)), 'leafDark'); v.set(Math.round(x + Math.sin(a)), Math.round(y - 1), Math.round(z - Math.cos(a)), 'leaf'); }
      }
    }
    v.sphere(13, 33, 13, 1.8, 'leafDark');
  } },
  bloom: { pivot: [13, 35, 13], build(v) { v.ellipsoid(13, 37, 13, 1.8, 2.4, 1.8, 'rose'); v.set(13, 40, 13, 'pink'); v.box(12, 35, 12, 14, 35, 14, 'leaf'); } },
}, { room: 'hallen', anim: { bloom: 'scale 1 -> 3.5 bloom, then back', blader: 'sway rotation.z ±0.15' } });

// 9 c_paraply – a pink umbrella displayed open in a striped stand (part skjerm spins / pops)
D('c_paraply', [22, 36, 22], 1 / 16, (v) => {
  v.cyl(11, 0, 11, 3.5, 11, 'roofBlue'); v.cyl(11, 1, 11, 2.5, 10, 0);
  for (let y = 0; y < 11; y++) if (y % 3 === 1) ringY(v, 11, y, 11, 3, 3.6, 'white');
  ringY(v, 11, 10, 11, 3, 3.9, 'gold');
}, {
  umb: { pivot: [11, 4, 11], build(v) {
    v.box(11, 4, 11, 11, 31, 11, 'woodDark');
    for (let i = 0; i < 6; i++) { const r = 10 - i * 1.6; for (let z = 0; z < 22; z++) for (let x = 0; x < 22; x++) { const d = Math.hypot(x - 11, z - 11); if (d <= r + 0.3 && d > r - 1.7) { const g = Math.floor((Math.atan2(z - 11, x - 11) + Math.PI) / (Math.PI / 4)); v.set(x, 27 + i, z, (g & 1) ? 'white' : 'pink'); } } }
    v.set(11, 33, 11, 'gold'); v.set(11, 34, 11, 'gold');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; v.set(Math.round(11 + Math.cos(a) * 10), 26, Math.round(11 + Math.sin(a) * 10), 'gold'); }
  } },
}, { room: 'hallen', anim: { umb: 'pop: scale 0.4 -> 1.15 -> 1, spin rotation.y' } });

/* ============================================================ 10 KJØKKENET */
// 10 ovn – pastel enamel stove with a glowing oven window (part door folds down)
D('ovn', [16, 24, 12], 1 / 10, (v) => {
  for (const x of [2, 13]) for (const z of [2, 9]) { v.set(x, 0, z, 'gold'); v.set(x, 1, z, 'gold'); }
  rbox(v, 1, 2, 1, 14, 13, 10, 'mint', true);
  v.box(1, 14, 1, 14, 14, 10, 'steel');                                       // cook top
  for (const cx of [4.5, 10.5]) { ringY(v, cx, 15, 5.5, 1.5, 2.6, 'grey'); v.set(Math.round(cx), 15, 5, 'coral'); }
  v.box(1, 13, 10, 14, 13, 10, 'white');
  for (const x of [3, 6, 9, 12]) v.set(x, 12, 11, 'gold');                    // knobs
  v.box(3, 4, 9, 12, 10, 9, 'orange'); v.box(5, 6, 9, 10, 8, 9, 'flame');      // warm oven inside
  v.box(12, 15, 7, 13, 23, 8, 'steel'); v.box(11, 23, 6, 14, 23, 9, 'steel');  // chimney pipe
}, {
  door: { pivot: [7.5, 3, 11], build(v) {
    v.box(2, 3, 10, 13, 10, 10, 'cream'); v.box(4, 5, 10, 11, 9, 10, 'glass'); v.box(4, 10, 11, 11, 10, 11, 'gold');
    v.set(2, 3, 10, 0); v.set(13, 3, 10, 0);
  } },
}, { room: 'kjokken', castable: true, anim: { door: 'rotation.x 0 -> +1.4 (folds down/out)' } });

// 11 gryte – black cooking pot with a ladle; lid ajar
D('gryte', [18, 16, 16], 1 / 16, (v) => {
  // black cooking pot with steel rim and handles (the red pot with white dots read as a toadstool / drum)
  vessel(v, 9, 0, 8, 7, 10, 'black', 'butter');
  v.cyl(9, 0, 8, 6, 1, 'grey');
  ringY(v, 9, 9, 8, 6.5, 7.4, 'steel');
  for (const x of [0, 17]) { v.box(x, 6, 6, x, 8, 10, 'grey'); }
  v.cyl(9, 1, 8, 6, 7, 'butter');                                           // soup
  v.set(7, 8, 6, 'orange'); v.set(11, 8, 10, 'leaf'); v.set(10, 8, 6, 'orange');
}, {
  lid: { pivot: [9, 10, 8], build(v) { v.cyl(9, 10, 8, 7, 1, 'black'); v.cyl(9, 11, 8, 5, 1, 'black'); v.box(8, 12, 7, 10, 13, 9, 'gold'); } },
  sleiv: { pivot: [9, 8, 8], build(v) { v.line(9, 8, 8, 15, 15, 8, 'woodLight'); v.box(8, 7, 7, 10, 7, 9, 'woodLight'); } },
}, { room: 'kjokken', castable: true, anim: { lid: 'hop position.y +0.12', sleiv: 'stir rotation.y spin' } });

// 12 c_krukker – shelf with 5 glass jars (mel, salt, ris, sukker, te), lids lid0..lid4; labels are HTML
const JARS = [['milk', 'roofPink'], ['white', 'roofBlue'], ['wool', 'mint'], ['snow', 'butter'], ['woodRed', 'lilac']];
function jar(v, x0, y0, z0, i, lidOnly) {
  const [fill, lid] = JARS[i % 5];
  if (lidOnly) { v.box(x0 + 1, y0 + 9, z0 + 1, x0 + 6, y0 + 9, z0 + 6, lid); v.box(x0 + 2, y0 + 10, z0 + 2, x0 + 5, y0 + 10, z0 + 5, lid); v.set(x0 + 3, y0 + 11, z0 + 3, 'gold'); return; }
  rbox(v, x0, y0, z0, x0 + 7, y0 + 8, z0 + 7, 'glass', true);
  rbox(v, x0 + 1, y0, z0 + 1, x0 + 6, y0 + 4 + (i % 3), z0 + 6, fill, true);
  v.box(x0 + 2, y0 + 3, z0 + 7, x0 + 5, y0 + 6, z0 + 7, 'white');           // label patch
}
// two-tier wall shelf: jars 0,2,4 on the top tier, 1,3 on the bottom tier (labels never crowd)
const KJ = i => [1 + i * 8, (i % 2) ? 2 : 15];        // jar i -> [x0, y0]
D('c_krukker', [42, 27, 11], 1 / 16, (v) => {
  for (const y of [0, 13]) { v.box(0, y, 0, 41, y + 1, 10, 'woodLight'); v.box(0, y + 1, 10, 41, y + 1, 10, 'wood'); for (const x of [3, 38]) v.box(x, y - 2, 0, x, y - 1, 3 - 0, 'woodDark'); }
  v.box(0, 0, 0, 0, 14, 1, 'woodLight'); v.box(41, 0, 0, 41, 14, 1, 'woodLight');
  for (let i = 0; i < 5; i++) { const [x0, y0] = KJ(i); jar(v, x0, y0, 1, i); }
}, Object.fromEntries([0, 1, 2, 3, 4].map(i => { const [x0, y0] = KJ(i); return ['lid' + i, { pivot: [x0 + 3.5, y0 + 9, 4.5], build(v) { jar(v, x0, y0, 1, i, true); } }]; })),
{ room: 'kjokken', jars: ['mel', 'salt', 'ris', 'sukker', 'te'], anim: { lid0: 'hop position.y +0.15 + puff' }, wall: true });
D('c_krukke', [8, 13, 8], 1 / 16, (v, o) => { jar(v, 0, 0, 0, o.i || 0); }, { lid: { pivot: [3.5, 9, 3.5], build(v, o) { jar(v, 0, 0, 0, o.i || 0, true); } } },
  { room: 'kjokken', variants: { i: [0, 1, 2, 3, 4] }, note: 'single jar; i = 0 mel, 1 salt, 2 ris, 3 sukker, 4 te' });

// 13 c_kran – little sink with a gooseneck tap and a glass to fill (part vann scales up)
D('c_kran', [26, 26, 14], 1 / 16, (v) => {
  rbox(v, 0, 0, 1, 25, 10, 12, 'cream', true);
  for (const x0 of [2, 14]) { v.box(x0, 2, 13, x0 + 9, 8, 13, 'mint'); v.set(x0 + (x0 === 2 ? 8 : 1), 6, 14 > 13 ? 13 : 13, 'gold'); }
  v.box(0, 11, 0, 25, 11, 13, 'white');
  v.box(3, 9, 3, 15, 11, 11, 0); v.box(3, 8, 3, 15, 8, 11, 'steel');          // basin
  v.box(8, 12, 1, 9, 21, 2, 'silver'); v.box(8, 21, 2, 9, 22, 6, 'silver'); v.box(8, 20, 6, 9, 20, 7, 'silver');  // gooseneck
  // the glass on the counter (right)
  for (let y = 12; y <= 18; y++) ringY(v, 20, y, 7, 1.6, 2.5, 'glass');
  v.cyl(20, 12, 7, 2.4, 1, 'glass');
  ringY(v, 20, 16, 7, 2.3, 2.7, 'gold');                                    // the fill line
}, {
  handle: { pivot: [11, 14, 2], build(v) { v.box(11, 13, 1, 11, 14, 2, 'silver'); v.box(11, 15, 1, 13, 15, 2, 'gold'); } },
  vann: { pivot: [20, 13, 7], build(v) { v.cyl(20, 13, 7, 1.5, 2, 'water'); } },
}, { room: 'kjokken', anim: { handle: 'rotation.y 0 -> 1.2', vann: 'scale.y 1 -> 2.0 (water up to the gold line)' }, glassAt: [0.25, 0.8, -0.06] });

// 14 kjele – mint kettle with white dots; lid hops (whistles)
D('kjele', [16, 16, 12], 1 / 16, (v) => {
  v.ellipsoid(8, 5, 6, 5.5, 5, 5, 'roofMint');
  v.box(2, 0, 0, 14, 0, 12, 0); v.cyl(8, 0, 6, 4, 1, 'steel');
  v.paint((x, y, z, c) => (c === F.PAL.roofMint && y >= 3 && y <= 7 && (y === 5 ? (x + z) % 4 === 0 : (y === 3 || y === 7) && (x + z) % 4 === 2)) ? 'white' : null);
  ringY(v, 8, 8, 6, 2, 3.4, 'steel');
  for (let i = 0; i < 5; i++) v.box(13 + i * 0.6 | 0, 4 + i, 6, (13 + i * 0.6 | 0) + 1, 4 + i, 6, 'roofMint');  // spout
  v.set(15, 9, 6, 'steel');
  // handle arch
  for (let x = 4; x <= 12; x++) { const y = 12 + Math.round(Math.sin((x - 4) / 8 * Math.PI) * 2.5); v.set(x, y, 6, 'woodDark'); }
  v.box(4, 9, 6, 4, 11, 6, 'steel'); v.box(12, 9, 6, 12, 11, 6, 'steel');
}, { lid: { pivot: [8, 9, 6], build(v) { v.cyl(8, 9, 6, 2.6, 1, 'roofMint'); v.box(8, 10, 6, 8, 11, 6, 'gold'); } } },
{ room: 'kjokken', castable: true, anim: { lid: 'rattle: position.y +0.06 hops' } });

// 15 c_eggkartong – open ten-carton (2 x 5) + two loose eggs (part egg wobbles / hatches)
function egg(v, cx, y0, cz, c) { v.ellipsoid(cx, y0 + 2.9, cz, 2.3, 3.0, 2.3, c || 'cream'); }
D('c_eggkartong', [40, 12, 14], 1 / 16, (v) => {
  v.box(0, 0, 0, 30, 2, 13, 'pathStone');
  for (let x = 0; x <= 30; x++) for (const z of [0, 6, 13]) v.set(x, 3, z, 'stone2');
  for (const x of [0, 6, 12, 18, 24, 30]) v.box(x, 3, 0, x, 3, 13, 'stone2');
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) egg(v, 3 + i * 6, 1, 3 + r * 7, (i + r) % 3 === 0 ? 'white' : 'cream');
  egg(v, 35, 0, 4, 'cream');
}, {
  lid: { pivot: [15, 3, -0.5], build(v) { v.box(0, 3, 0, 30, 11, 0, 'pathStone'); for (let i = 0; i < 5; i++) v.set(3 + i * 6, 7, 0, 'stone2'); v.box(11, 4, 0, 19, 5, 0, 'butter'); } },
  egg: { pivot: [35, 0, 10], build(v) { egg(v, 35, 0, 10, 'white'); } },
}, { room: 'kjokken', anim: { egg: 'wobble rotation.z ±0.3', lid: 'flap rotation.x' }, tenFrame: true });

// 16 c_melsekk – flour sack tied with twine; top flops (part top)
D('c_melsekk', [16, 22, 14], 1 / 16, (v) => {
  for (let y = 0; y <= 13; y++) { const t = y / 13, rx = 6.8 - t * t * 3.4 - (y === 0 ? 0.6 : 0), rz = 5.4 - t * t * 2.6 - (y === 0 ? 0.5 : 0);
    for (let z = 0; z < 14; z++) for (let x = 0; x < 16; x++) if (Math.abs((x - 7.5) / rx) ** 3 + Math.abs((z - 6.5) / rz) ** 3 <= 1) v.set(x, y, z, 'sand'); }
  // burlap sack: tan weave + a red 'MEL' band (reads as a flour sack at room distance, not a white blob)
  v.paint((x, y, z, c) => c === F.PAL.sand && (y === 4 || y === 5) ? 'roofRed' : c === F.PAL.sand && ((x + y * 3 + z * 5) % 7 === 0) ? 'hay' : null);
  for (let y = 2; y <= 11; y++) v.set(7, y, 13 - (y > 9 ? 1 : 0), (y & 1) ? 'hay' : 'cream2');                 // seam
  for (const [dx, y] of [[-2, 8], [2, 8], [-2, 6], [2, 6], [-1, 9], [1, 9], [-1, 7], [1, 7]]) v.set(7.5 + dx | 0, y, 13, 'honey');   // wheat
  ringY(v, 7.5, 13, 6.5, 0, 2.8, 'cream2'); ringY(v, 7.5, 14, 6.5, 0, 2.4, 'woodRed');
  for (const [x, z] of [[1, 13], [14, 12], [2, 1]]) v.set(x, 0, z, 'white');
}, { top: { pivot: [7.5, 15, 6.5], build(v) { v.ellipsoid(7.5, 17, 6.5, 3.4, 2.4, 2.8, 'cream2'); v.set(4, 19, 6, 'cream2'); v.set(11, 19, 7, 'cream2'); v.set(7, 19, 6, 'white'); v.set(8, 19, 7, 'white'); v.set(7, 20, 7, 'white'); } } },
{ room: 'kjokken', anim: { top: 'flop rotation.z ±0.4 + flour puff' } });

// 17 c_deig – pastry board: dough lump (scales flat), rolling pin, heart + star cutters
D('c_deig', [30, 8, 18], 1 / 16, (v) => {
  v.box(0, 0, 0, 29, 1, 17, 'wood'); v.box(0, 1, 0, 29, 1, 0, 'woodDark'); v.box(28, 0, 6, 31, 1, 11, 'wood');
  v.paint((x, y, z, c) => c === F.PAL.wood && y === 1 && (x + z * 3) % 13 === 0 ? 'woodRed' : null);
  glyph(v, ['X.X.', 'XXXX', '.XX.'].map(r => r), 21, 4, 3, 'butter');
  // flour dust
  for (const [x, z] of [[5, 14], [8, 3], [24, 15], [3, 6]]) v.set(x, 2, z, 'white');
}, {
  deig: { pivot: [9, 2, 9], build(v) { v.ellipsoid(9, 2, 9, 5.5, 3.6, 5, 'milk'); v.box(3, 0, 3, 15, 1, 15, 0); v.cyl(9, 2, 9, 5, 1, 'milk'); v.set(8, 5, 8, 'cream'); v.set(10, 4, 10, 'cream'); } },
  pin: { pivot: [15, 3.5, 9], build(v) { cylX(v, 11, 22, 3.5, 14, 1.6, 'woodLight'); cylX(v, 8, 10, 3.5, 14, 0.8, 'woodRed'); cylX(v, 23, 25, 3.5, 14, 0.8, 'woodRed'); } },
  form: { pivot: [22.5, 2, 6], build(v) { const H = ['X.X.X', 'XXXXX', 'X...X', '.X.X.', '..X..']; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (H[i][j] === 'X' || (i < 2 && H[i][j] === '.')) { } for (const [x, z] of [[20, 4], [21, 3], [23, 3], [24, 4], [20, 5], [24, 5], [21, 6], [23, 6], [22, 7], [22, 4]]) v.box(x, 2, z, x, 3, z, 'rose'); } },
}, { room: 'kjokken', anim: { deig: 'scale.y 1 -> 0.35, scale.xz 1.3', pin: 'roll position.x ±0.3 + rotation.x', form: 'stamp position.y -0.05' } });

// 18 c_kakeboks – round blue biscuit tin with stars; lid pops (cookies inside)
D('c_kakeboks', [16, 13, 16], 1 / 16, (v) => {
  vessel(v, 8, 0, 8, 7, 8, 'roofBlue');
  for (let y = 1; y < 8; y++) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + (y & 1) * 0.4; if ((y + k) % 3 === 0) v.set(Math.round(8 + Math.cos(a) * 7), y, Math.round(8 + Math.sin(a) * 7), 'butter'); }
  ringY(v, 8, 0, 8, 6.5, 7.4, 'gold');
  for (const [x, z] of [[6, 7], [9, 9], [8, 5], [5, 10]]) { v.box(x - 1, 7, z - 1, x + 1, 7, z + 1, 'woodLight'); v.set(x, 8, z, 'woodDark'); }
}, { lid: { pivot: [8, 8, 8], build(v) { v.cyl(8, 8, 8, 7.4, 1, 'roofBlue'); ringY(v, 8, 8, 8, 6.8, 7.6, 'gold'); v.cyl(8, 9, 8, 6, 1, 'sky'); glyph(v, ['.X.', 'XXX', '.X.'], 7, 10, 8, 'butter'); v.box(7, 10, 7, 9, 10, 9, 'woodLight'); v.set(8, 11, 8, 'woodDark'); } } },
{ room: 'kjokken', anim: { lid: 'pop position.y +0.2, rotation.z 0.4' } });

// 19 c_brodkurv – wicker basket with baguette, round loaf and bun (parts brod1..3 hop)
D('c_brodkurv', [22, 12, 16], 1 / 16, (v) => {
  for (let y = 0; y <= 5; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 22; x++) {
    const q = ((x - 10.5) / (9.5 + y * 0.3)) ** 2 + ((z - 7.5) / (6 + y * 0.25)) ** 2;
    if (q <= 1 && (q > 0.62 || y === 0)) v.set(x, y, z, ((x + z + y) % 2) ? 'hay' : 'woodLight');
  }
  for (let z = 0; z < 16; z++) for (let x = 0; x < 22; x++) { const q = ((x - 10.5) / 11.2) ** 2 + ((z - 7.5) / 7.6) ** 2; if (q <= 1 && q > 0.78) v.set(x, 6, z, 'wood'); }
  v.box(4, 3, 3, 17, 4, 12, 'white');                           // napkin
  v.box(3, 5, 12, 6, 5, 14, 'roofPink'); v.box(15, 5, 2, 18, 5, 4, 'roofPink');
}, {
  loaf0: { pivot: [10, 5, 6], build(v) { cylX(v, 3, 18, 6.5, 6, 1.6, 'honey'); for (const x of [6, 10, 14]) v.set(x, 8, 6, 'butter'); } },
  loaf1: { pivot: [7, 5, 10], build(v) { v.ellipsoid(7, 7, 10, 3.2, 2.4, 3, 'woodLight'); v.set(7, 9, 10, 'cream'); v.set(6, 9, 9, 'cream'); } },
  loaf2: { pivot: [14, 5, 10], build(v) { v.ellipsoid(14, 6.5, 10, 2.2, 1.8, 2.2, 'honey'); v.set(14, 8, 10, 'white'); } },
}, { room: 'kjokken', anim: { loaf0: 'hop', loaf1: 'hop', loaf2: 'hop' } });

/* ============================================================ 11 SPISESALEN */
// 20 c_langbord – long table with a white cloth; place settings (part dekk) set themselves
D('c_langbord', [52, 13, 18], 1 / 10, (v) => {
  for (const x of [3, 25, 48]) for (const z of [4, 13]) { v.box(x, 0, z, x, 7, z, 'woodRed'); v.set(x, 0, z, 'gold'); }
  v.box(1, 8, 2, 50, 8, 15, 'white');                                                       // table top: top face = 0.9 m
  v.box(1, 4, 1, 50, 7, 1, 'white'); v.box(1, 4, 16, 50, 7, 16, 'white'); v.box(0, 4, 2, 0, 7, 15, 'white'); v.box(51, 4, 2, 51, 7, 15, 'white');
  for (let x = 0; x <= 51; x++) { v.set(x, 4, 16, 'roofPink'); v.set(x, 4, 1, 'roofPink'); }
  for (let z = 1; z <= 16; z++) { v.set(0, 4, z, 'roofPink'); v.set(51, 4, z, 'roofPink'); }
  for (let x = 2; x < 50; x++) if (x % 2) v.set(x, 8, 8 + (x % 4 === 1 ? 1 : 0), 'blossom');   // table runner
  v.box(25, 9, 8, 26, 11, 9, 'glass'); v.set(25, 12, 8, 'rose'); v.set(26, 12, 9, 'butter'); v.set(25, 12, 9, 'leaf'); v.set(26, 12, 8, 'pink');
}, {
  dekk: { pivot: [26, 9, 9], build(v) {
    for (const x of [6, 15, 36, 45]) for (const z of [4, 13]) {
      ringY(v, x, 9, z, 0, 1.6, 'white'); ringY(v, x, 9, z, 1.4, 2.2, 'roofBlue');
      v.set(x + 3, 9, z, 'silver'); v.set(x + 3, 9, z + (z < 8 ? -1 : 1), 'silver');
      v.box(x - 3, 9, z, x - 3, 10, z, 'pink');
    }
  } },
}, { room: 'spisesal', anim: { dekk: 'drop in from position.y +0.5 with clinks / hop' }, seats: 8, topY: 0.9 });

// 21 c_lysestake – long silver holder with 10 candles; flames f0..f9 (glow) light one by one
D('c_lysestake', [44, 18, 8], 1 / 16, (v) => {
  v.box(1, 0, 2, 42, 0, 5, 'silver'); v.box(2, 1, 3, 41, 2, 4, 'silver');
  for (const x of [1, 42]) { v.box(x, 0, 1, x, 1, 6, 'gold'); }
  for (let i = 0; i < 10; i++) { const x = 3 + i * 4; v.box(x - 1, 3, 3, x + 1, 3, 4, 'gold'); v.box(x, 4, 3, x, 10 + (i % 2), 4, i % 2 ? 'blossom' : 'cream'); v.set(x, 11 + (i % 2), 3, 'black'); }
}, { flames: { pivot: [21.5, 12, 3.5], build(v) { for (let i = 0; i < 10; i++) { const x = 3 + i * 4, y = 12 + (i % 2); v.set(x, y, 3, 'flame'); v.set(x, y + 1, 3, 'lamp'); v.set(x, y, 4, 'flame'); } } } },
{ room: 'spisesal', anim: { flames: 'visible = lit (all 10 flames at once)' }, count: 10 });

// 22 c_avis – Kongeposten on a little reading stand (part side turns the top page)
D('c_avis', [20, 18, 10], 1 / 16, (v) => {
  for (const x of [2, 17]) { v.line(x, 0, 7, x, 12, 3, 'woodRed'); v.line(x, 0, 2, x, 6, 5, 'woodRed'); }
  for (let y = 4; y <= 15; y++) { const z = 7 - Math.round((y - 4) * 0.3); v.box(2, y, z, 17, y, z, 'woodRed'); }
  v.box(2, 3, 8, 17, 3, 9, 'woodRed');
}, {
  side: { pivot: [10, 4, 8], build(v) {
    for (let y = 4; y <= 17; y++) { const z = 8 - Math.round((y - 4) * 0.3); for (let x = 3; x <= 16; x++) v.set(x, y, z, 'white'); }
    for (let x = 3; x <= 16; x++) { v.set(x, 16, 4, 'navySoft'); v.set(x, 17, 4, 'navySoft'); }
    for (let y = 6; y <= 13; y += 2) { const z = 8 - Math.round((y - 4) * 0.3); for (let x = 4; x <= 9; x++) v.set(x, y, z, 'grey'); }
    for (let y = 7; y <= 13; y++) { const z = 8 - Math.round((y - 4) * 0.3); for (let x = 11; x <= 15; x++) v.set(x, y, z, y < 9 ? 'leaf2' : (x === 13 && y > 10) ? 'roofPink' : 'sky'); }
    v.box(12, 9, 6, 14, 10, 6, 'stone');
  } },
}, { room: 'spisesal', anim: { side: 'page flip rotation.y 0 -> -2.8 around the left edge' } });

// 23 tekanne – porcelain teapot with blue flowers; lid part
D('tekanne', [18, 15, 12], 1 / 16, (v) => {
  v.ellipsoid(9, 5.5, 6, 5.5, 5, 5, 'white');
  v.box(3, 0, 1, 15, 0, 11, 0); v.cyl(9, 0, 6, 3.5, 1, 'white'); ringY(v, 9, 0, 6, 3, 4, 'roofBlue');
  v.paint((x, y, z, c) => { if (c !== F.PAL.white || z < 8) return null; for (const [fx, fy] of [[6, 6], [12, 5], [9, 3]]) { const d = Math.abs(x - fx) + Math.abs(y - fy); if (d === 0) return 'roofBlue'; if (d === 1) return 'sky'; } return null; });
  ringY(v, 9, 9, 6, 2.5, 3.5, 'gold');
  for (let i = 0; i < 6; i++) v.box(14 + Math.floor(i * 0.5), 3 + i, 6, 15 + Math.floor(i * 0.5), 3 + i, 6, 'white');  // spout
  v.set(17, 9, 6, 'gold');
  v.box(1, 4, 6, 1, 7, 6, 'white'); v.set(2, 8, 6, 'white'); v.set(2, 3, 6, 'white');      // loop handle
}, { lid: { pivot: [9, 10, 6], build(v) { v.cyl(9, 10, 6, 2.6, 1, 'white'); v.set(9, 11, 6, 'gold'); v.set(9, 12, 6, 'gold'); } } },
{ room: 'spisesal', castable: true, anim: { lid: 'hop', whole: 'tilt rotation.z -0.5 to pour' } });

// 24 c_gjokur – cuckoo clock: house, roof, face, door + bird, pendulum, weights
D('c_gjokur', [20, 42, 11], 1 / 16, (v) => {
  v.box(3, 18, 2, 16, 33, 7, 'woodRed');
  for (let i = 0; i < 7; i++) { v.box(1 + i, 34 + i, 1, 18 - i, 34 + i, 9, i % 2 ? 'roofMint' : 'mint'); }
  v.box(9, 41, 4, 10, 41, 5, 'butter');
  discZ(v, 9.5, 24.5, 8, 4.6, 'cream'); discZ(v, 9.5, 24.5, 8, 4.6, 'cream');
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; v.set(Math.round(9.5 + Math.cos(a) * 3.6), Math.round(24.5 + Math.sin(a) * 3.6), 9, k % 3 === 0 ? 'navySoft' : 'gold'); }
  v.box(7, 30, 8, 12, 33, 8, 'woodDark');                    // door frame recess
  v.box(8, 31, 7, 11, 33, 7, 'navySoft');
  v.box(3, 18, 8, 16, 18, 8, 'woodDark');
  for (const x of [4, 15]) { v.set(x, 34, 9, 'leaf'); v.set(x, 33, 9, 'rose'); }
  // weights on chains
  for (const x of [6, 13]) { v.box(x, 6, 4, x, 17, 4, 'gold'); v.ellipsoid(x, 4, 4, 1.4, 2.6, 1.4, 'woodDark'); }
}, {
  door: { pivot: [8, 31, 8.5], build(v) { v.box(8, 31, 8, 11, 33, 8, 'wood'); v.set(10, 32, 9, 'gold'); } },
  bird: { pivot: [9.5, 31, 7], build(v) { v.box(9, 31, 7, 10, 32, 7, 'butter'); v.set(9, 33, 7, 'butter'); v.set(10, 33, 7, 'butter'); v.set(9, 32, 8, 'black'); v.set(10, 32, 8, 'orange'); } },
  pendulum: { pivot: [9.5, 18, 5], build(v) { v.box(9, 7, 5, 10, 17, 5, 'gold'); discZ(v, 9.5, 7, 5, 2.4, 'gold'); v.set(9, 7, 6, 'honey'); } },
  hand: { pivot: [9.5, 24.5, 9.5], build(v) { for (let i = 0; i <= 3; i++) v.set(9, 24 + i, 9, 'navySoft'); for (let i = 0; i <= 2; i++) v.set(10 + i, 24, 9, 'navySoft'); } },
}, { room: 'spisesal', anim: { pendulum: 'swing rotation.z ±0.35 (loop)', door: 'rotation.y -1.6 open', bird: 'position.z +0.15 pops out, cuckoo n times', hand: 'rotation.z' } });

// 25 c_fruktfat – footed porcelain bowl with fruit (part frukt)
D('c_fruktfat', [22, 14, 22], 1 / 16, (v) => {
  v.cyl(11, 0, 11, 3.5, 1, 'white'); v.cyl(11, 1, 11, 1.5, 3, 'white');
  for (let y = 4; y <= 9; y++) ringY(v, 11, y, 11, y === 4 ? 0 : 3 + (y - 4) * 1.3, 4.4 + (y - 4) * 1.3, 'white');
  ringY(v, 11, 9, 11, 9.2, 10.6, 'gold'); ringY(v, 11, 6, 11, 6, 7.2, 'roofBlue');
}, {
  fruit: { pivot: [11, 6, 11], build(v) {
    v.sphere(8, 8, 9, 2.4, 'red'); v.set(8, 11, 9, 'woodDark'); v.set(9, 11, 9, 'leaf');
    v.sphere(13, 8, 13, 2.4, 'gem3'); v.set(13, 11, 13, 'woodDark');
    v.sphere(14, 8, 8, 2.2, 'red'); v.set(14, 10, 8, 'leaf');
    v.ellipsoid(9, 8.5, 14, 2, 2.8, 2, 'butter'); v.set(9, 11, 14, 'woodDark');
    for (const [x, y, z] of [[11, 10, 11], [12, 10, 11], [11, 10, 12], [12, 9, 10], [10, 9, 12], [11, 11, 11]]) v.set(x, y, z, 'plum');
    for (let i = 0; i < 7; i++) v.set(6 + i, 9 + Math.round(Math.sin(i / 6 * Math.PI) * 2), 6, 'yellow');
  } },
}, { room: 'spisesal', anim: { fruit: 'hop; apples roll out (spawn eple models) and hop back counted' } });

// 26 c_serviett – a napkin folded into a swan on a plate + stack of napkins in a ring
D('c_serviett', [18, 12, 14], 1 / 16, (v) => {
  ringY(v, 6, 0, 7, 0, 5.4, 'white'); ringY(v, 6, 0, 7, 4.4, 5.6, 'roofBlue');
  for (let i = 0; i < 4; i++) v.box(13, i, 4, 17, i, 9, i & 1 ? 'roofPink' : 'white');
  ringY(v, 15, 2, 6.5, 2.4, 3.2, 'gold');
}, {
  nap: { pivot: [6, 1, 7], build(v) {
    v.ellipsoid(6, 3, 7, 3.6, 2.2, 3, 'white'); v.box(3, 1, 5, 9, 1, 9, 'white');
    v.ellipsoid(4.5, 4.5, 7, 2, 2, 2.6, 'white');                                         // folded wings
    for (let y = 4; y <= 9; y++) v.set(8, y, 7, 'white'); v.set(9, 9, 7, 'white'); v.set(10, 9, 7, 'orange'); v.set(8, 9, 8, 'black');
  } },
}, { room: 'spisesal', anim: { nap: 'hop + spin rotation.y' } });

/* ============================================================ 12 TRONSALEN */
// 27 c_trone – gold throne with pink velvet and a heart crest (part pute squeaks)
D('c_trone', [20, 30, 14], 1 / 10, (v) => {
  for (const x of [2, 16]) for (const z of [3, 11]) v.box(x, 0, z, x + 1, 6, z, 'gold');
  v.box(2, 6, 3, 17, 7, 12, 'gold');                                         // seat base
  v.box(2, 7, 1, 17, 22, 3, 'gold');                                         // back frame
  v.box(4, 8, 3, 15, 21, 3, 'roofPink');                                     // velvet back
  for (const [x, y] of [[6, 18], [9, 18], [12, 18], [7, 14], [11, 14], [9, 10]]) v.set(x, y, 4, 'gold');
  // heart crest on top
  for (let y = 22; y <= 29; y++) for (let x = 2; x <= 17; x++) { const hx = (x - 9.5) / 7, hy = (y - 25.5) / 5; const h = (hx * hx + hy * hy - 1) ** 3 - hx * hx * (-hy) ** 3; if (h <= 0) v.box(x, y, 1, x, y, 2, (Math.abs(x - 9.5) < 4 && y > 23 && y < 28) ? 'roofPink' : 'gold'); }
  v.set(9, 26, 3, 'gem1'); v.set(10, 26, 3, 'gem1'); v.set(9, 25, 3, 'gem1'); v.set(10, 25, 3, 'gem1');
  // armrests with gold balls
  for (const x of [1, 17]) { v.box(x, 8, 3, x + 1, 12, 12, 'gold'); v.box(x, 12, 3, x + 1, 12, 12, 'roofPink'); v.sphere(x + 0.5, 13, 12, 1.4, 'gold'); v.set(x, 10, 13, 'gem2'); }
  v.box(4, 0, 12, 15, 1, 13, 'roofRed'); v.box(4, 2, 12, 15, 2, 13, 'gold');   // foot step
}, { pute: { pivot: [9.5, 8, 7.5], build(v) { v.ellipsoid(9.5, 8.8, 7.5, 6.4, 1.6, 4.4, 'pink'); v.set(9, 10, 7, 'gold'); v.set(10, 10, 8, 'gold'); } } },
{ room: 'tronsal', anim: { pute: 'squash scale.y 0.6 -> 1.1 (squeak)' }, seat: [0, 0.95, 0.15] });

// 28 krone – gold crown with gems and pearls (castable)
function crownVox(v) {
  ringY(v, 7, 0, 7, 4.8, 6, 'gold'); ringY(v, 7, 1, 7, 5, 6, 'gold'); ringY(v, 7, 2, 7, 5, 6, 'gold'); ringY(v, 7, 3, 7, 4.8, 6, 'honey');
  v.ellipsoid(7, 3, 7, 4.6, 4, 4.6, 'roofRed'); v.box(2, 0, 2, 12, 2, 12, 0); ringY(v, 7, 0, 7, 4.8, 6, 'gold'); ringY(v, 7, 1, 7, 5, 6, 'gold'); ringY(v, 7, 2, 7, 5, 6, 'gold');
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; v.set(Math.round(7 + Math.cos(a) * 6.3), 2, Math.round(7 + Math.sin(a) * 6.3), ['gem1', 'gem2', 'gem3', 'gem2'][k % 4]); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.26; const x = Math.round(7 + Math.cos(a) * 5.5), z = Math.round(7 + Math.sin(a) * 5.5); v.box(x, 4, z, x, 7, z, 'gold'); v.set(x, 8, z, 'white'); }
  v.box(7, 7, 7, 7, 8, 7, 'gold'); v.sphere(7, 9.5, 7, 1.4, 'gold'); v.set(7, 11, 7, 'gem1');
}
D('krone', [14, 12, 14], 1 / 16, () => {}, { crown: { pivot: [7, 0, 7], build: crownVox } },
{ room: 'tronsal', castable: true, anim: { crown: 'hop onto her head / sneeze hop back' }, wear: 'head' });

// 29 c_lysekrone – crystal chandelier; part krone spins (pivot at the chain top)
D('c_lysekrone', [34, 36, 34], 1 / 16, (v) => {
  v.box(16, 35, 16, 17, 35, 17, 'gold');
}, {
  body: { pivot: [16.5, 35, 16.5], build(v) {
    for (let y = 22; y <= 34; y++) v.set(16 + (y & 1), y, 16 + ((y >> 1) & 1), 'gold');            // chain
    v.ellipsoid(16.5, 16, 16.5, 2.4, 6, 2.4, 'gold'); v.sphere(16.5, 9, 16.5, 1.6, 'crystal');
    for (const [n, R, y] of [[8, 13, 12], [6, 7.5, 18]]) for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + (n === 6 ? 0.3 : 0), x = 16.5 + Math.cos(a) * R, z = 16.5 + Math.sin(a) * R;
      for (let t = 0; t <= 10; t++) { const tt = t / 10; v.set(Math.round(16.5 + Math.cos(a) * R * tt), Math.round(y - 3 + Math.sin(tt * Math.PI) * 1.5 + tt * 3 - 3 * tt), Math.round(16.5 + Math.sin(a) * R * tt), 'gold'); }
      v.box(Math.round(x), y - 1, Math.round(z), Math.round(x), y - 1, Math.round(z), 'gold');
      candle(v, Math.round(x), y, Math.round(z), 2, 'cream');
      v.set(Math.round(x), y - 2, Math.round(z), 'crystal'); v.set(Math.round(x), y - 3, Math.round(z), 'crystal');
    }
  } },
}, { room: 'tronsal', anim: { body: 'spin rotation.y + sway rotation.z ±0.05' }, hangFromTop: true });

// 30 c_fanfare – two crossed golden trumpets on a lilac shield with hanging banners
D('c_fanfare', [30, 34, 8], 1 / 16, (v) => {
  for (let y = 8; y <= 30; y++) for (let x = 6; x <= 23; x++) { const w = y > 14 ? 9 : 9 - (14 - y) * 1.3; if (Math.abs(x - 14.5) <= w) v.set(x, y, 0, (Math.abs(x - 14.5) > w - 1.2 || y === 30) ? 'gold' : 'roofLilac'); }
  glyph(v, ['X.X.X', 'XXXXX', 'XXXXX'], 12, 26, 1, 'gold');
  glyph(v, HEART3, 13, 20, 1, 'pink');
}, {
  horn: { pivot: [14.5, 20, 3], build(v) {
    for (const s of [1, -1]) { for (let t = 0; t <= 22; t++) { const x = Math.round(14.5 - s * 11 + s * t), y = 9 + Math.round(t * 0.95); v.set(x, y, 3, 'gold'); }
      const bx = Math.round(14.5 + s * 11), by = 30; for (let r = 0; r < 3; r++) v.box(bx - r, by + r - 1, 3 - r, bx + r, by + r - 1, 3 + r, 'gold'); v.set(bx, by + 1, 3, 'honey'); }
  } },
  banner: { pivot: [14.5, 15, 4], build(v) {
    v.box(5, 7, 4, 10, 14, 4, 'roofPink'); v.set(5, 7, 4, 0); v.set(10, 7, 4, 0); v.set(7, 7, 4, 0); v.set(8, 7, 4, 0); v.box(5, 12, 4, 10, 12, 4, 'gold'); glyph(v, HEART3, 6, 11, 5, 'butter');
    v.box(19, 7, 4, 24, 14, 4, 'roofBlue'); v.set(19, 7, 4, 0); v.set(24, 7, 4, 0); v.set(21, 7, 4, 0); v.set(22, 7, 4, 0); v.box(19, 12, 4, 24, 12, 4, 'gold'); glyph(v, PLUS, 20, 11, 5, 'butter');
  } },
}, { room: 'tronsal', anim: { banner: 'unfurl scale.y 0.15 -> 1 (both banners)', horn: 'wobble' }, wall: true });

// 31 c_vindu – tall arched window with blue heart shutters (closed by default) + flower box
D('c_vindu', [22, 32, 6], 1 / 10, (v) => {
  const inner = (x, y) => x >= 3 && x <= 18 && y >= 4 && (y <= 22 || (x - 10.5) ** 2 + (y - 22) ** 2 <= 7.6 ** 2);
  for (let y = 2; y < 32; y++) for (let x = 0; x < 22; x++) {
    const out = y <= 24 || (x - 10.5) ** 2 + (y - 24) ** 2 <= 10.4 ** 2; if (!out || x < 1 || x > 20) continue;
    if (inner(x, y)) { v.set(x, y, 0, y < 8 ? ((x + y) % 3 ? 'grass' : 'leaf2') : ((x * 5 + y * 3) % 19 === 0 ? 'white' : 'sky')); v.set(x, y, 1, (x === 10 || x === 11 || y === 15) ? 'white' : 'glass'); }
    else v.box(x, y, 0, x, y, 2, 'stone');
  }
  v.box(1, 2, 3, 20, 3, 4, 'white'); v.box(2, 0, 3, 19, 1, 5, 'woodRed');           // sill + flower box
  for (let x = 2; x <= 19; x++) { v.set(x, 2, 5, (x % 3 === 0) ? 'rose' : (x % 3 === 1) ? 'butter' : 'leaf'); }
}, {
  shutterL: { pivot: [3, 4, 3], build(v) { for (let y = 4; y <= 28; y++) for (let x = 3; x <= 10; x++) { if (!((y <= 22 || (x - 10.5) ** 2 + (y - 22) ** 2 <= 7.6 ** 2))) continue; v.set(x, y, 3, (x === 3 || y === 4 || x % 3 === 0) ? 'roofBlue' : 'sky'); } glyph(v, HEART3, 5, 20, 4, 'white'); v.set(10, 14, 4, 'gold'); } },
  shutterR: { pivot: [19, 4, 3], build(v) { for (let y = 4; y <= 28; y++) for (let x = 11; x <= 18; x++) { if (!((y <= 22 || (x - 10.5) ** 2 + (y - 22) ** 2 <= 7.6 ** 2))) continue; v.set(x, y, 3, (x === 18 || y === 4 || x % 3 === 2) ? 'roofBlue' : 'sky'); } glyph(v, HEART3, 14, 20, 4, 'white'); v.set(11, 14, 4, 'gold'); } },
}, { room: 'tronsal', wall: true, anim: { shutterL: 'rotation.y 0 -> -1.7 (open outward)', shutterR: 'rotation.y 0 -> +1.7' } });

// 32 c_gullbjelle – golden hand bell hanging in a small crowned stand (part bell swings)
D('c_gullbjelle', [16, 24, 12], 1 / 16, (v) => {
  v.box(1, 0, 2, 14, 1, 9, 'woodRed'); v.box(2, 2, 3, 13, 2, 8, 'roofLilac');
  for (const x of [2, 13]) v.box(x, 2, 5, x, 19, 6, 'woodRed');
  for (let x = 2; x <= 13; x++) v.box(x, 19 + Math.round(Math.sin((x - 2) / 11 * Math.PI) * 2), 5, x, 19 + Math.round(Math.sin((x - 2) / 11 * Math.PI) * 2), 6, 'gold');
  glyph(v, ['X.X.X', 'XXXXX'], 5, 23, 5, 'gold'); v.set(7, 23, 6, 'gem1');
}, { bell: { pivot: [7.5, 19, 5.5], build(v) { v.box(7, 17, 5, 8, 19, 6, 'gold'); for (let i = 0; i < 7; i++) ringY(v, 7.5, 16 - i, 5.5, 0, 1.2 + i * 0.55, i === 6 ? 'honey' : 'gold'); v.set(7, 8, 5, 'honey'); v.set(8, 8, 6, 'honey'); } } },
{ room: 'tronsal', anim: { bell: 'swing rotation.z ±0.6 (ding)' } });


/* ============================================================ 13 BALLSALEN */
// 33 c_glitterkule – mirror ball on a chain (part ball spins)
D('c_glitterkule', [18, 28, 18], 1 / 16, (v) => { v.box(8, 27, 8, 9, 27, 9, 'gold'); }, {
  ball: { pivot: [8.5, 27, 8.5], build(v) {
    for (let y = 17; y <= 26; y++) v.set(8 + (y & 1), y, 8 + (y & 1), 'gold');
    v.sphere(8.5, 9.5, 8.5, 7, 'silver');
    v.paint((x, y, z, c) => { const k = (x * 3 + y * 5 + z * 7) % 6; return ['silver', 'crystal', 'white', 'gem2', 'lilac', 'crystal'][k]; });
    v.box(8, 16, 8, 9, 17, 9, 'gold');
  } },
}, { room: 'ballsal', anim: { ball: 'spin rotation.y (loop while dancing)' }, hangFromTop: true });

// 34 c_grammofon – gramophone with a pink flower horn (parts plate spins, arm)
D('c_grammofon', [20, 28, 20], 1 / 16, (v) => {
  rbox(v, 1, 0, 1, 18, 5, 16, 'woodRed', true); v.box(1, 5, 1, 18, 5, 16, 'wood'); v.box(1, 2, 17, 18, 2, 17, 'gold');
  v.set(18, 3, 9, 'gold'); v.set(19, 3, 9, 'gold'); v.set(19, 4, 9, 'woodLight');                     // crank
  v.box(4, 6, 3, 4, 7, 3, 'gold');
}, {
  horn: { pivot: [4, 7, 3], build(v) {
  for (let i = 0; i <= 12; i++) { const t = i / 12, y = 7 + t * 14, z = 3 + t * 14, x = 4 + t * 5, r = 0.9 + t * t * 6.5;
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { const d = Math.hypot(xx - x, yy - y); if (d <= r + 0.2 && (i < 3 || d >= r - 1.2)) v.set(xx, yy, Math.round(z), i === 12 ? 'gold' : (Math.floor(Math.atan2(yy - y, xx - x) * 2.5 + 8) & 1) ? 'roofPink' : 'pink'); } }
  } },
  plate: { pivot: [11, 6, 10], build(v) { ringY(v, 11, 6, 10, 0, 5.5, 'navySoft'); ringY(v, 11, 6, 10, 0, 1.8, 'roofPink'); ringY(v, 11, 6, 10, 3.2, 3.6, 'roofBlue'); v.set(11, 7, 10, 'gold'); } },
  arm: { pivot: [16, 7, 4], build(v) { v.box(16, 6, 4, 16, 7, 4, 'gold'); v.line(16, 7, 4, 13, 7, 9, 'gold'); v.set(13, 6, 9, 'silver'); } },
}, { room: 'ballsal', anim: { plate: 'spin rotation.y', arm: 'rotation.y 0.25 onto the record', horn: 'wobble / pulse' } });

// 35 c_dansegulv – 3 x 3 light-up dance tiles with gold seams (parts t0..t8)
const TILEC = ['rose', 'butter', 'sky', 'mint', 'lilac', 'peach', 'blossom', 'gem2', 'gem3'];
D('c_dansegulv', [40, 2, 40], 1 / 10, (v) => {
  for (const k of [0, 13, 26, 39]) { v.box(k, 0, 0, k, 0, 39, 'gold'); v.box(0, 0, k, 39, 0, k, 'gold'); }
}, { tiles: { pivot: [19.5, 0, 19.5], build(v) { TILEC.forEach((c, i) => { const cx = i % 3, cz = Math.floor(i / 3); v.box(1 + cx * 13, 0, 1 + cz * 13, 12 + cx * 13, 0, 12 + cz * 13, c); for (let k = 0; k < 4; k++) v.set(3 + cx * 13 + k * 2 + (k > 1 ? 1 : 0), 0, 3 + cz * 13 + k * 2, 'white'); }); } } },
{ room: 'ballsal', anim: { tiles: 'hop position.y +0.06; light squares are FX' }, walkable: true });

// 36 harpe – golden harp with pastel strings (part strenger shimmers)
D('harpe', [18, 34, 10], 1 / 16, (v) => {
  v.box(2, 0, 2, 15, 1, 7, 'gold'); v.box(3, 2, 3, 14, 2, 6, 'honey');
  for (let y = 2; y <= 30; y++) v.box(2, y, 4, 3, y, 5, 'gold');                        // column
  v.box(1, 30, 3, 4, 32, 6, 'gold'); v.set(2, 33, 4, 'gem1'); v.set(3, 33, 5, 'gem1');    // crown top
  for (let y = 3; y <= 26; y++) { const x = Math.round(4 + (y - 3) * 0.5); v.box(x, y, 3, x + 2, y, 6, 'woodLight'); }      // soundboard
  for (let x = 3; x <= 17; x++) { const y = Math.round(29 - (x - 3) * 0.35 + Math.sin((x - 3) / 14 * Math.PI * 1.5) * 1.6); v.box(x, y, 4, x, y + 1, 5, 'gold'); }  // neck
}, { strenger: { pivot: [9, 3, 4.5], build(v) {
  for (let x = 5; x <= 15; x++) { const yb = Math.round(3 + (x - 4) * 2) + 2, yt = Math.round(29 - (x - 3) * 0.35 + Math.sin((x - 3) / 14 * Math.PI * 1.5) * 1.6) - 1; for (let y = yb; y <= yt; y++) v.set(x, y, 4, x % 3 === 0 ? 'roofPink' : x % 3 === 1 ? 'white' : 'butter'); }
} } }, { room: 'ballsal', castable: true, anim: { strenger: 'shimmer scale.x 1.05 / position.x wiggle' } });

// 37 c_spilledase – music box with a spinning ballerina (parts lid, ballerina)
D('c_spilledase', [18, 20, 14], 1 / 16, (v) => {
  rbox(v, 1, 0, 2, 16, 6, 13, 'roofPink', true); v.box(1, 6, 2, 16, 6, 13, 'gold'); v.box(2, 1, 13, 15, 1, 13, 'gold');
  v.box(3, 3, 13, 14, 5, 13, 'pink'); glyph(v, HEART3, 7, 5, 14, 'gold');
  v.box(3, 6, 4, 14, 6, 11, 'roofRed');                                              // velvet inside
  v.box(17, 3, 7, 17, 3, 8, 'gold'); v.box(17, 4, 8, 17, 6, 8, 'gold');               // winding key
}, {
  // lid rests OPEN (standing up at the back, mirror inside facing the ballerina)
  lid: { pivot: [9, 7, 2], build(v) { for (let y = 7; y <= 18; y++) v.box(1, y, 1, 16, y, 2, 'roofPink'); v.box(1, 7, 2, 16, 7, 2, 'gold'); v.box(1, 18, 1, 16, 18, 2, 'gold'); v.box(3, 9, 3, 14, 16, 3, 'glass'); v.box(2, 8, 3, 15, 8, 3, 'gold'); v.box(2, 17, 3, 15, 17, 3, 'gold'); glyph(v, ['X.X', 'XXX', '.X.'], 7, 19 - 1, 0, 'gold'); } },
  ballerina: { pivot: [8.5, 7, 7.5], build(v) {
    ringY(v, 8.5, 7, 7.5, 0, 1.6, 'gold');
    v.box(8, 8, 7, 9, 9, 8, 'skin'); ringY(v, 8.5, 10, 7.5, 0, 2.6, 'blossom'); ringY(v, 8.5, 11, 7.5, 0, 1.6, 'white');
    v.box(8, 11, 7, 9, 13, 8, 'pink'); v.box(8, 14, 7, 9, 15, 8, 'skin'); v.box(8, 16, 7, 9, 16, 7, 'hairBrown'); v.set(8, 17, 7, 'hairBrown');
    v.set(7, 14, 7, 'skin'); v.set(6, 15, 7, 'skin'); v.set(10, 14, 8, 'skin'); v.set(11, 15, 8, 'skin');
  } },
}, { room: 'ballsal', anim: { lid: 'rests open; rotation.x 0 -> +1.5 closes it', ballerina: 'spin rotation.y + small hops' } });

// 38 tromme – red marching drum with zig-zag cords and crossed sticks (castable)
D('tromme', [16, 16, 16], 1 / 16, (v) => {
  v.cyl(8, 0, 8, 7, 11, 'roofRed');
  ringY(v, 8, 0, 8, 6, 7.4, 'gold'); ringY(v, 8, 10, 8, 6, 7.4, 'gold');
  for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI * 2, a1 = (k + 0.5) / 6 * Math.PI * 2, a2 = (k + 1) / 6 * Math.PI * 2, R = 7.4;
    for (let t = 0; t <= 8; t++) { const f = t / 8; for (const [aa, ab, ya, yb] of [[a0, a1, 1, 9], [a1, a2, 9, 1]]) { const a = aa + (ab - aa) * f, y = Math.round(ya + (yb - ya) * f); v.set(Math.round(8 + Math.cos(a) * R), y, Math.round(8 + Math.sin(a) * R), 'white'); } } }
}, {
  skinn: { pivot: [8, 11, 8], build(v) { ringY(v, 8, 11, 8, 0, 6.2, 'white'); ringY(v, 8, 11, 8, 0, 1.2, 'cream'); } },
  stikker: { pivot: [8, 12, 8], build(v) { v.line(2, 12, 4, 13, 14, 12, 'woodLight'); v.line(2, 12, 12, 13, 14, 4, 'woodLight'); v.set(13, 15, 12, 'white'); v.set(13, 15, 4, 'white'); } },
}, { room: 'ballsal', castable: true, anim: { skinn: 'boom scale.y 0.6 -> 1', stikker: 'tap rotation.z ±0.3' } });

/* ============================================================ 14 BIBLIOTEKET */
// 39 c_bokhylle – tall bookcase full of books (part bok flies out)
D('c_bokhylle', [26, 34, 9], 1 / 10, (v) => {
  v.box(0, 0, 0, 25, 31, 8, 'woodRed'); v.box(2, 2, 1, 23, 29, 8, 0);
  v.box(0, 0, 8, 25, 1, 8, 'woodDark');
  for (const y of [2, 8, 14, 20, 26]) { v.box(1, y, 1, 24, y, 8, 'wood'); v.box(1, y, 8, 24, y, 8, 'woodDark'); }
  for (const [y, sd] of [[3, 1], [9, 2], [15, 3], [21, 4]]) books(v, 2, 23, y, 5, 2, 6, sd);
  books(v, 2, 13, 27, 3, 2, 6, 9); v.ellipsoid(19, 28, 4, 2, 1.6, 2, 'sky'); v.set(19, 30, 4, 'gold');      // globe ornament
  v.box(0, 32, 0, 25, 32, 8, 'woodDark'); glyph(v, ['X.X.X', 'XXXXX'], 10, 33, 4, 'gold');
  v.set(1, 30, 9, 'gold'); v.set(24, 30, 9, 'gold');
  v.box(11, 15, 2, 12, 19, 6, 0);                                                     // gap where the flying book sits
}, { book: { pivot: [11.5, 15, 6], build(v) { v.box(11, 15, 3, 12, 19, 7, 'roofRed'); v.box(11, 18, 7, 12, 18, 7, 'gold'); v.set(11, 16, 7, 'gold'); } } },
{ room: 'bibliotek', anim: { book: 'fly out: position.z +0.6, loop, open (F25 pop-up model)' } });

// 40 c_globus – globe on a wooden stand with a gold meridian (part globe spins)
D('c_globus', [18, 28, 18], 1 / 16, (v) => {
  v.cyl(9, 0, 9, 5, 1, 'woodRed'); v.cyl(9, 1, 9, 1.2, 6, 'woodDark'); v.cyl(9, 7, 9, 2.2, 1, 'gold');
  for (let a = -0.15; a <= Math.PI + 0.15; a += 0.04) { const x = 9 + Math.cos(a) * 8, y = 16 + Math.sin(a) * 8; v.set(Math.round(x), Math.round(y), 9, 'gold'); }
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) { const x = 9 + Math.cos(a) * 8, y = 16 + Math.sin(a) * 8; if (y > 8) v.set(Math.round(x), Math.round(y), 9, 'gold'); }
  v.set(9, 24, 9, 'gold'); v.set(9, 8, 9, 'gold');
}, { globe: { pivot: [9, 16, 9], build(v) {
  v.sphere(9, 16, 9, 6.6, 'roofBlue');
  v.paint((x, y, z) => { const n = F.U.noise2(x * 0.38 + z * 0.21, y * 0.42 + z * 0.17, 9); return n > 0.6 ? (y > 20 ? 'snow' : n > 0.72 ? 'leaf2' : 'gem3') : (n > 0.55 ? 'sand' : ((x + y + z) % 7 === 0 ? 'sky' : null)); });
} } }, { room: 'bibliotek', anim: { globe: 'spin rotation.y fast then slow' } });

// 41 c_stige – rolling library ladder with wheels (part wheels)
D('c_stige', [12, 36, 12], 1 / 10, () => {}, { ladder: { pivot: [5.5, 0, 9.5], build(v) {
  for (const x of [1, 10]) for (let y = 2; y <= 33; y++) { const z = Math.round(9 - (y - 2) / 31 * 7); v.box(x, y, z, x, y, z, 'woodRed'); v.set(x, y, z + 1, y % 2 ? 'woodRed' : 'wood'); }
  for (let y = 5; y <= 31; y += 4) { const z = Math.round(9 - (y - 2) / 31 * 7); v.box(2, y, z, 9, y, z + 1, 'woodLight'); }
  for (const x of [1, 10]) { v.box(x, 33, 1, x, 34, 2, 'gold'); v.set(x, 35, 1, 'gold'); }
  for (const x of [0, 11]) discX(v, x, 1.2, 9.5, 1.3, 'gold'); v.box(1, 1, 9, 10, 1, 10, 'steel');
} } }, { room: 'bibliotek', anim: { ladder: 'roll position.x along the shelf (fairy rides)' }, ride: true });

// 42 c_lesestol – lilac wingback reading chair with a book on the arm (part book opens)
D('c_lesestol', [18, 18, 16], 1 / 10, (v) => {
  for (const x of [2, 15]) for (const z of [3, 13]) v.box(x, 0, z, x, 1, z, 'gold');
  rbox(v, 1, 2, 2, 16, 6, 14, 'roofLilac', true);
  v.box(1, 6, 2, 16, 16, 4, 'roofLilac'); rbox(v, 2, 15, 2, 15, 17, 4, 'roofLilac', false);
  for (const x of [1, 14]) { v.box(x, 6, 4, x + 2, 10, 14, 'roofLilac'); v.box(x, 10, 4, x + 2, 10, 14, 'lavender'); v.box(x, 6, 2, x + 2, 15, 6, 'roofLilac'); }   // arms + wings
  v.box(4, 7, 5, 13, 8, 14, 'lavender');                                                    // cushion
  for (const [x, y] of [[6, 12], [11, 12], [8, 14], [9, 10]]) v.set(x, y, 5, 'gold');
  v.box(5, 9, 4, 12, 13, 4, 'lavender');
}, { book: { pivot: [15, 11, 10], build(v) { v.box(14, 11, 8, 16, 11, 12, 'roofRed'); v.box(14, 12, 8, 16, 12, 12, 'white'); v.box(14, 13, 8, 16, 13, 12, 'roofRed'); v.set(15, 12, 13, 'roofPink'); } } },
{ room: 'bibliotek', anim: { book: 'open: rotation.z -0.6 / scale' }, seat: [0, 0.75, 0.1] });

// 43 lampe – floor lamp with a butter-yellow fringed shade (part glow = bulb, toggle visible)
D('lampe', [14, 30, 14], 1 / 16, (v) => {
  v.cyl(7, 0, 7, 4, 1, 'gold'); v.cyl(7, 1, 7, 2.5, 1, 'honey');
  for (let y = 2; y <= 19; y++) v.box(7, y, 7, 7, y, 7, y % 6 === 0 ? 'honey' : 'gold');
}, {
  shade: { pivot: [7, 19, 7], build(v, o) {
    const on = !!(o && o.on), c = on ? 'glowYellow' : 'butter';
    for (let i = 0; i < 9; i++) { const r = 6.4 - i * 0.42; ringY(v, 7, 19 + i, 7, r - 1.1, r, i === 0 || i === 8 ? 'roofPink' : c); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; v.set(Math.round(7 + Math.cos(a) * 6.4), 18, Math.round(7 + Math.sin(a) * 6.4), k & 1 ? 'roofPink' : 'butter'); }
    v.set(7, 28, 7, 'gold');
  } },
  glow: { pivot: [7, 22, 7], build(v) { v.sphere(7, 22, 7, 1.6, 'lamp'); v.box(7, 20, 7, 7, 20, 7, 'gold'); } },
}, { room: 'bibliotek', castable: true, variants: { on: [true] }, anim: { shade: 'wobble; make with {on:true} for the lit shade', glow: 'toggle visible (bulb)' } });

// 44 c_skrivepult – writing desk with paper, inkwell and a quill (part quill writes)
D('c_skrivepult', [22, 20, 13], 1 / 10, (v) => {
  for (const x of [1, 20]) for (const z of [2, 11]) v.box(x, 0, z, x, 8, z, 'woodRed');
  v.box(0, 9, 1, 21, 9, 12, 'woodRed'); v.box(1, 6, 2, 20, 8, 11, 'woodRed');
  for (const x of [5, 16]) { v.box(x - 2, 6, 12, x + 2, 8, 12, 'wood'); v.set(x, 7, 13, 'gold'); }
  // upper cabinet with pigeonholes
  v.box(0, 10, 1, 21, 15, 3, 'woodRed'); for (const x of [3, 8, 13, 18]) v.box(x - 1, 11, 3, x + 1, 14, 3, 'woodDark');
  books(v, 2, 9, 11, 3, 2, 3, 22);
  v.box(0, 16, 1, 21, 16, 3, 'gold');
  v.box(4, 10, 5, 13, 10, 10, 'white'); for (let z = 6; z <= 9; z++) v.box(5, 10, z, 11 - (z & 1) * 2, 10, z, z === 6 ? 'white' : 'stone2');  // paper with lines
  v.cyl(16, 10, 7, 1.6, 2, 'navySoft'); v.set(16, 12, 7, 'gold');                      // inkwell
}, { quill: { pivot: [16, 12, 7], build(v) { v.line(16, 12, 7, 18, 19, 5, 'white'); v.line(17, 14, 6, 19, 18, 5, 'blossom'); v.set(16, 11, 7, 'gold'); } } },
{ room: 'bibliotek', anim: { quill: 'write: rotation wobble, moves to the paper' } });

/* ============================================================ 15 MUSIKKROMMET */
// 45 piano – black grand piano with gold trim and a white keyboard (parts lid, keys); black so it reads at room distance
const PIANO = (x, z) => { if (x < 1 || x > 16 || z < 1 || z > 17) return false; const t = (17 - z) / 16; const right = 16 - t * t * 7; return x <= right; };
D('piano', [18, 24, 22], 1 / 10, (v) => {
  for (const [x, z] of [[2, 15], [14, 15], [4, 3]]) { v.box(x, 0, z, x, 6, z, 'gold'); v.set(x, 0, z + 1, 'gold'); }
  for (let z = 0; z < 22; z++) for (let x = 0; x < 18; x++) if (PIANO(x, z)) { v.box(x, 7, z, x, 9, z, 'black'); if (!PIANO(x + 1, z) || !PIANO(x - 1, z) || !PIANO(x, z - 1)) v.set(x, 8, z, 'gold'); }
  v.box(1, 7, 18, 16, 8, 21, 'black'); v.box(1, 9, 18, 16, 9, 18, 'black');            // key bed + fallboard
  for (const x of [1, 16]) v.box(x, 7, 18, x, 10, 21, 'black');
  for (let x = 3; x <= 14; x++) if ([0, 1, 3, 4, 5].includes((x - 3) % 7)) v.set(x, 9, 19, 'hairBlack');   // black keys
  v.box(4, 10, 16, 13, 12, 16, 'gold'); v.box(5, 10, 17, 12, 10, 17, 'gold');          // music desk
  v.box(6, 0, 15, 11, 0, 17, 'gold'); v.box(7, 1, 16, 7, 3, 16, 'gold'); v.box(10, 1, 16, 10, 3, 16, 'gold'); // pedals
}, {
  // lid rests propped open (hinge on the left long side, ~35 deg) with a gold prop stick
  lid: { pivot: [1, 10, 9], build(v) { for (let z = 0; z < 18; z++) for (let x = 0; x < 18; x++) if (PIANO(x, z)) { const y = 10 + Math.round((x - 1) * 0.62); v.set(x, y, z, 'black'); if (x === 1 || !PIANO(x + 1, z)) v.set(x, y, z, 'gold'); } v.box(12, 10, 9, 12, 16, 9, 'gold'); } },
  keys: { pivot: [8.5, 8, 19], build(v) { for (let x = 2; x <= 15; x++) v.box(x, 8, 19, x, 8, 21, x % 2 ? 'milk' : 'white'); } },
}, { room: 'musikkrom', castable: true, anim: { lid: 'rests propped open; rotation.z -0.55 closes, +0.2 flaps', keys: 'press rotation.x 0.08 per note' } });

// 46 c_xylofon – rainbow xylophone, 11 bars for 10..20 (parts bar0..bar10 + kolle)
const XYC = ['red', 'orange', 'yellow', 'gem3', 'mint', 'teal', 'sky', 'roofBlue', 'lavender', 'purple', 'pink'];
D('c_xylofon', [38, 10, 18], 1 / 16, (v) => {
  for (const [x, z] of [[1, 2], [36, 5], [1, 15], [36, 12]]) v.box(x, 0, z, x, 2, z, 'woodDark');
  for (let x = 0; x <= 37; x++) { const zb = Math.round(2 + x / 37 * 3), zf = Math.round(15 - x / 37 * 3); v.box(x, 3, zb, x, 3, zb, 'woodRed'); v.box(x, 3, zf, x, 3, zf, 'woodRed'); }
}, Object.assign(Object.fromEntries(XYC.map((c, i) => { const x0 = 2 + i * 3, L = 14 - Math.round(i * 0.6), z0 = Math.round(8.5 - L / 2); return ['bar' + i, { pivot: [x0 + 1, 4, 8.5], build(v) { v.box(x0, 4, z0, x0 + 1, 4, z0 + L - 1, c); v.set(x0, 5, z0 + 1, 'silver'); v.set(x0 + 1, 5, z0 + L - 2, 'silver'); } }]; })),
  { kolle: { pivot: [18, 4, 16.5], build(v) { v.line(12, 4, 17, 22, 4, 17, 'woodLight'); v.sphere(23.5, 4.5, 17, 1.4, 'roofPink'); v.line(14, 4, 15 + 1, 24, 4, 15 + 1, 0); } } }),
{ room: 'musikkrom', anim: { bar0: 'tap: position.y -0.03 bounce; bars bar0..bar10 = 10..20 left to right' }, barX: XYC.map((_, i) => +((2 + i * 3 + 1 - 19) / 16).toFixed(3)) });

// 47 floyte – silver flute on a velvet cushion (part floyte)
D('floyte', [28, 10, 10], 1 / 16, (v) => {
  rbox(v, 2, 0, 2, 25, 3, 7, 'roofLilac', true); v.box(2, 3, 2, 25, 3, 7, 'lavender');
  for (const [x, z] of [[2, 2], [25, 2], [2, 7], [25, 7]]) { v.set(x, 1, z, 'gold'); }
  v.box(2, 0, 4, 2, 1, 5, 'gold'); v.box(25, 0, 4, 25, 1, 5, 'gold');
}, { floyte: { pivot: [14, 5, 4.5], build(v) { cylX(v, 1, 26, 5, 4.5, 1, 'silver'); for (let x = 8; x <= 22; x += 2) v.set(x, 6, 4, 'gold'); v.box(4, 6, 4, 5, 6, 5, 'silver'); v.set(4, 6, 5, 'navySoft'); v.set(26, 5, 4, 'gold'); } } },
{ room: 'musikkrom', anim: { floyte: 'lift + trill wobble rotation.z ±0.1' } });

// 48 c_trommesett – drum kit: bass drum, toms, snare, cymbal (parts cymbal, stikker)
D('c_trommesett', [32, 26, 22], 1 / 16, (v) => {
  cylZ(v, 6, 13, 15, 8, 7.4, 'roofBlue'); discZ(v, 15, 8, 14, 6.6, 'white'); discZ(v, 15, 8, 14, 7.6, 'gold'); discZ(v, 15, 8, 14, 6.4, 'white');
  glyph(v, HEART, 13, 10, 15, 'roofPink');
  v.box(9, 0, 8, 9, 1, 12, 'silver'); v.box(21, 0, 8, 21, 1, 12, 'silver');
  for (const [x, z] of [[10, 9], [20, 9]]) v.box(x, 13, z, x, 15, z, 'silver');
  v.cyl(26, 9, 15, 3.6, 4, 'white'); ringY(v, 26, 12, 15, 0, 3.4, 'cream'); ringY(v, 26, 9, 15, 3, 3.8, 'gold'); ringY(v, 26, 12, 15, 3, 3.8, 'gold');
  for (const [x, z] of [[24, 13], [28, 13], [26, 17]]) v.line(26, 9, 15, x, 0, z, 'silver');
  v.box(4, 0, 6, 4, 19, 6, 'silver'); for (const [x, z] of [[2, 4], [6, 4], [4, 8]]) v.line(4, 3, 6, x, 0, z, 'silver');
  v.cyl(8, 0, 16, 2.5, 4, 'peach'); ringY(v, 8, 4, 16, 0, 2.6, 'roofRed');                       // little stool
}, {
  tom: { pivot: [15, 16, 9], build(v) { for (const [x, z] of [[10, 9], [20, 9]]) { v.cyl(x, 16, z, 3.2, 4, 'roofBlue'); ringY(v, x, 19, z, 0, 3, 'white'); ringY(v, x, 16, z, 2.6, 3.4, 'gold'); } } },
  cymbal: { pivot: [4, 20, 6], build(v) { ringY(v, 4, 20, 6, 0, 4.6, 'gold'); ringY(v, 4, 21, 6, 0, 1.4, 'honey'); } },
  stikker: { pivot: [26, 13, 15], build(v) { v.line(22, 13, 14, 29, 15, 18, 'woodLight'); v.line(23, 13, 18, 30, 15, 13, 'woodLight'); } },
}, { room: 'musikkrom', anim: { cymbal: 'wobble rotation.x ±0.25', stikker: 'drum roll rotation.z jitter' } });

// 49 c_notestativ – music stand with a sheet of notes (part sheet flutters)
D('c_notestativ', [16, 28, 10], 1 / 16, (v) => {
  for (const [x, z] of [[3, 2], [13, 2], [8, 9]]) v.line(8, 5, 5, x, 0, z, 'gold');
  v.box(8, 5, 5, 8, 17, 5, 'gold');
  for (let y = 17; y <= 26; y++) { const z = 5 + Math.round((y - 17) * -0.3); v.box(1, y, z, 15, y, z, 'gold'); }
  v.box(1, 17, 6, 15, 17, 7, 'gold');
}, { sheet: { pivot: [8, 18, 6], build(v) {
  for (let y = 18; y <= 27; y++) { const z = 6 + Math.round((y - 17) * -0.3); for (let x = 2; x <= 14; x++) v.set(x, y, z, (y % 3 === 0) ? 'grey' : 'white'); }
  for (const [x, y] of [[4, 25], [7, 22], [10, 25], [12, 19], [5, 19]]) { const z = 6 + Math.round((y - 17) * -0.3) + 1; v.set(x, y, z, 'navySoft'); v.set(x + 1, y + 1, z, 'navySoft'); v.set(x + 1, y + 2, z, 'navySoft'); }
} } }, { room: 'musikkrom', anim: { sheet: 'flutter rotation.x ±0.1; notes hop off (FX)' } });

/* ============================================================ 16 SKATTKAMMERET */
// 50 c_myntverk – whimsical coin exchanger (10 ones in, one 10-coin out): gear, lever, flap
D('c_myntverk', [20, 26, 15], 1 / 10, (v) => {
  rbox(v, 2, 0, 2, 17, 15, 12, 'roofLilac', true);
  for (const y of [1, 14]) for (let x = 3; x <= 16; x += 3) v.set(x, y, 13, 'gold');
  v.box(5, 7, 12, 14, 12, 12, 'glass'); v.box(4, 6, 13, 15, 6, 13, 'gold'); v.box(4, 13, 13, 15, 13, 13, 'gold');
  for (const [x, y] of [[6, 7], [8, 7], [10, 7], [12, 7], [7, 8], [9, 8], [11, 8], [13, 7], [8, 9], [10, 9]]) v.set(x, y, 11, 'gold');
  // funnel on top
  for (let i = 0; i < 6; i++) ringY(v, 9.5, 16 + i, 7, 1 + i * 0.9 - 0.9, 1.6 + i * 0.9, 'gold');
  v.set(9, 20, 7, 'honey'); v.set(10, 21, 6, 'honey');
  // output chute + tray
  v.box(7, 1, 13, 12, 4, 13, 'navySoft'); v.box(6, 0, 13, 13, 0, 15, 'gold'); v.box(6, 1, 14, 6, 1, 15, 'gold'); v.box(13, 1, 14, 13, 1, 15, 'gold');
  // chimney with a little heart
  v.box(14, 16, 4, 15, 22, 5, 'steel'); v.set(14, 23, 4, 'roofPink');
}, {
  wheel: { pivot: [1, 10, 7], build(v) { discX(v, 1, 10, 7, 4, 'gold'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; v.set(1, Math.round(10 + Math.sin(a) * 5), Math.round(7 + Math.cos(a) * 5), 'gold'); } discX(v, 0, 10, 7, 1.2, 'honey'); } },
  lever: { pivot: [18, 9, 7], build(v) { v.box(18, 9, 7, 18, 9, 7, 'gold'); v.box(19, 9, 7, 19, 15, 7, 'gold'); v.sphere(19, 16, 7, 1.3, 'roofRed'); } },
  flap: { pivot: [9.5, 4, 13.5], build(v) { v.box(7, 1, 14, 12, 4, 14, 'gold'); v.set(9, 3, 15, 'honey'); v.set(10, 3, 15, 'honey'); } },
}, { room: 'skattkammer', anim: { wheel: 'rotation.x spin', lever: 'rotation.x pull -0.8', flap: 'rotation.x +1.2 opens, 10-coin rolls out' } });

// 51 c_kiste – treasure chest with a number lock (parts lid, lock)
D('c_kiste', [22, 18, 15], 1 / 16, (v) => {
  rbox(v, 1, 0, 1, 20, 8, 13, 'woodRed', true);
  for (let y = 1; y < 8; y++) if (y % 3 === 0) { v.box(1, y, 13, 20, y, 13, 'wood'); v.box(1, y, 1, 20, y, 1, 'wood'); }
  for (const x of [2, 19]) { v.box(x, 0, 1, x, 8, 13, 'gold'); }
  v.box(2, 8, 2, 19, 8, 12, 'gold');                                       // treasure inside (seen when open)
  for (const [x, z] of [[5, 5], [12, 8], [16, 4], [8, 10]]) v.set(x, 9, z, ['gem1', 'gem2', 'gem3', 'white'][(x + z) % 4]);
}, {
  lid: { pivot: [10.5, 9, 1], build(v) {
    for (let z = 1; z <= 13; z++) { const h = Math.round(Math.sin((z - 1) / 12 * Math.PI) * 3); v.box(1, 9, z, 20, 9 + h, z, 'woodRed'); v.box(2, 9 + h, z, 2, 9 + h, z, 'gold'); v.box(19, 9 + h, z, 19, 9 + h, z, 'gold'); }
    v.box(1, 9, 13, 20, 9, 13, 'gold');
  } },
  lock: { pivot: [10.5, 6, 14], build(v) { v.box(9, 4, 14, 12, 7, 14, 'gold'); v.box(10, 8, 14, 11, 9, 14, 'gold'); v.set(10, 8, 14, 0); v.box(10, 5, 15, 11, 6, 15, 'cream'); } },
}, { room: 'skattkammer', anim: { lid: 'rotation.x 0 -> -1.7 (opens back)', lock: 'jiggle rotation.z / drop when solved' } });

// 52 c_myntstabel – two towers of ten gold coins on a velvet tray (parts stack0, stack1 topple + restack)
function coinStack(v, cx, cz, n) { for (let i = 0; i < n; i++) { ringY(v, cx, 2 + i, cz, 0, 2.6, i % 2 ? 'gold' : 'honey'); } }
D('c_myntstabel', [24, 14, 14], 1 / 16, (v) => {
  rbox(v, 0, 0, 1, 23, 1, 12, 'roofRed', true); v.box(1, 1, 2, 22, 1, 11, 'roofRed');
  for (const [x, z] of [[18, 3], [20, 9], [17, 8]]) ringY(v, x, 2, z, 0, 2.6, 'gold');
}, { stack0: { pivot: [5, 2, 6.5], build(v) { coinStack(v, 5, 6.5, 10); } }, stack1: { pivot: [11, 2, 6.5], build(v) { coinStack(v, 11, 6.5, 10); } } },
{ room: 'skattkammer', anim: { stack0: 'topple rotation.z 1.4 then restack (counted 1..10)', stack1: 'same' }, coinsPerStack: 10 });

// 53 c_sparebosser – shelf with the royal piggy banks (pig0 king gold+crown, pig1 queen pink+tiara, pig2 Mia lilac+heart)
const PIGS = [['gold', 'crown'], ['roofPink', 'tiara'], ['lilac', 'heart'], ['pink', 'flower']];
function pig(v, cx, y0, cz, i) {
  const [c, deco] = PIGS[i];
  const sn = (c === 'pink' || c === 'roofPink') ? 'blossom' : 'pink';
  for (const [dx, dz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) v.box(cx + dx, y0, cz + dz, cx + dx, y0 + 1, cz + dz, c);
  v.ellipsoid(cx, y0 + 5, cz, 5.2, 4.2, 4.6, c);
  discZ(v, cx, y0 + 4.5, Math.round(cz + 4.4), 1.8, sn); discZ(v, cx, y0 + 4.5, Math.round(cz + 4.4) + 1, 1.3, sn);
  v.set(cx - 1, y0 + 4, Math.round(cz + 5.4), 'rose'); v.set(cx + 1, y0 + 4, Math.round(cz + 5.4), 'rose');
  v.set(cx - 2, y0 + 7, cz + 4, 'black'); v.set(cx + 2, y0 + 7, cz + 4, 'black');
  v.set(cx - 3, y0 + 5, cz + 4, 'rose'); v.set(cx + 3, y0 + 5, cz + 4, 'rose');
  for (const s of [-1, 1]) { v.box(cx + s * 3, y0 + 9, cz + 1, cx + s * 2, y0 + 9, cz + 2, c); v.set(cx + s * 3, y0 + 10, cz + 1, sn); }
  v.box(cx - 1, y0 + 9, cz - 1, cx + 1, y0 + 9, cz - 1, 'navySoft');                                     // coin slot
  v.set(cx, y0 + 5, cz - 5, sn); v.set(cx + 1, y0 + 6, cz - 5, sn); v.set(cx, y0 + 7, cz - 5, sn);        // curly tail
  if (deco === 'crown') { v.box(cx - 2, y0 + 10, cz, cx + 2, y0 + 10, cz, 'honey'); v.set(cx - 2, y0 + 11, cz, 'honey'); v.set(cx, y0 + 11, cz, 'honey'); v.set(cx + 2, y0 + 11, cz, 'honey'); v.set(cx, y0 + 12, cz, 'gem1'); }
  if (deco === 'tiara') { v.box(cx - 2, y0 + 10, cz, cx + 2, y0 + 10, cz, 'silver'); v.set(cx, y0 + 11, cz, 'gem2'); v.set(cx - 1, y0 + 11, cz, 'silver'); v.set(cx + 1, y0 + 11, cz, 'silver'); }
  if (deco === 'heart') { v.set(cx + 3, y0 + 10, cz + 2, 'rose'); v.set(cx + 4, y0 + 10, cz + 2, 'rose'); v.set(cx + 3, y0 + 11, cz + 2, 'rose'); v.set(cx + 4, y0 + 11, cz + 1, 'rose'); }
  if (deco === 'flower') { v.set(cx - 3, y0 + 11, cz + 1, 'butter'); v.set(cx - 4, y0 + 11, cz + 1, 'white'); v.set(cx - 2, y0 + 11, cz + 1, 'white'); v.set(cx - 3, y0 + 12, cz + 1, 'white'); v.set(cx - 3, y0 + 10, cz + 2, 'white'); }
}
D('c_sparebosser', [40, 14, 12], 1 / 16, (v) => {
  v.box(0, 0, 0, 39, 1, 11, 'woodLight'); v.box(0, 1, 11, 39, 1, 11, 'wood');
}, Object.fromEntries([0, 1, 2].map(i => ['pig' + i, { pivot: [7 + i * 13, 2, 6], build(v) { pig(v, 7 + i * 13, 2, 6, i); } }])),
{ room: 'skattkammer', owners: ['konge', 'dronning', 'mia'], pigX: [-1.25, -0.44, 0.38], anim: { pig0: 'wobble rotation.z ±0.15 when its owner talks' } });
D('c_sparebosse', [12, 13, 11], 1 / 16, () => {}, { pig: { pivot: [6, 0, 5], build(v, o) { pig(v, 6, 0, 5, o.i || 0); } } },
  { room: 'skattkammer', variants: { i: [0, 1, 2] }, anim: { pig: 'wobble' } });

// 54 c_juvelskrin – jewellery box with pearls and rings (part lid)
D('c_juvelskrin', [16, 16, 13], 1 / 16, (v) => {
  for (const x of [2, 13]) for (const z of [2, 10]) v.sphere(x, 0.5, z, 1, 'gold');
  rbox(v, 1, 1, 1, 14, 7, 11, 'lavender', true);
  for (const x of [1, 14]) for (const z of [1, 11]) v.box(x, 1, z, x, 7, z, 'gold');
  v.box(1, 7, 1, 14, 7, 11, 'gold');
  v.box(3, 2, 12, 12, 4, 12, 'lilac'); v.box(3, 2, 12, 12, 2, 12, 'gold'); v.set(7, 3, 13, 'gold'); v.set(8, 3, 13, 'gold');   // drawer
  for (const [x, c] of [[3, 'gem1'], [6, 'gem2'], [9, 'gem3'], [12, 'gem1']]) v.set(x, 6, 12, c);
  v.box(2, 8, 2, 13, 8, 10, 'roofRed');
  for (let x = 3; x <= 12; x++) v.set(x, 9, 4 + Math.round(Math.sin(x) * 1), 'white');                // pearls
  v.set(6, 9, 7, 'gold'); v.set(7, 9, 7, 'gem1'); v.set(10, 9, 7, 'gold'); v.set(10, 10, 7, 'gem2');
}, { lid: { pivot: [7.5, 9, 1], build(v) { rbox(v, 1, 9, 1, 14, 11, 11, 'lavender', true); v.box(1, 9, 1, 14, 9, 11, 'gold'); v.box(2, 11, 2, 13, 11, 10, 'lilac'); glyph(v, HEART, 5, 12, 6, 'gem1'); for (let x = 5; x <= 9; x++) v.set(x, 12, 6, 0); for (const [x, z] of [[5, 7], [6, 6], [6, 7], [6, 8], [7, 7], [7, 6], [7, 8], [8, 6], [8, 7], [8, 8], [9, 7], [7, 9], [6, 5], [8, 5]]) v.set(x, 12, z, 'gem1'); for (const x of [1, 14]) for (const z of [1, 11]) v.box(x, 9, z, x, 10, z, 'gold'); } } },
{ room: 'skattkammer', anim: { lid: 'rotation.x 0 -> -1.5, sparkle burst' } });

/* ============================================================ 17 ORDMUSEET */
// 55 c_sokkel – marble pedestal with a velvet turntable (part top spins the displayed model)
D('c_sokkel', [10, 11, 10], 1 / 10, (v) => {
  v.box(0, 0, 0, 9, 1, 9, 'stone2'); v.box(1, 2, 1, 8, 2, 8, 'stone');
  v.box(2, 3, 2, 7, 8, 7, 'white'); for (let y = 3; y <= 8; y++) for (const [x, z] of [[2, 4], [2, 6], [7, 4], [7, 6], [4, 2], [6, 2], [4, 7], [6, 7]]) v.set(x, y, z, 'stone2');
  v.box(1, 9, 1, 8, 9, 8, 'gold');
}, { top: { pivot: [5, 10, 5], build(v) { ringY(v, 5, 10, 5, 0, 3.8, 'roofRed'); ringY(v, 5, 10, 5, 3.2, 4.2, 'gold'); } } },
{ room: 'ordmuseum', anim: { top: 'spin rotation.y (the word model on top spins with it)' }, topY: 1.1 });

// 56 c_ordbok – giant open dictionary on a lectern (part page turns)
D('c_ordbok', [18, 18, 12], 1 / 10, (v) => {
  v.box(5, 0, 3, 12, 1, 8, 'woodRed'); v.box(8, 2, 5, 9, 10, 6, 'woodRed');
  for (let y = 11; y <= 13; y++) { const z = 8 - (y - 11) * 2; v.box(1, y, z - 1, 16, y, z, 'woodRed'); }
  v.box(1, 12, 9, 16, 12, 9, 'gold');
  // open book: cover + pages (left & right halves)
  for (let i = 0; i <= 6; i++) { const z = 8 - i, y = 14 + i; v.box(1, y, z, 16, y, z, 'roofRed'); v.box(2, y + 1, z, 15, y + 1, z, i % 2 ? 'white' : 'milk'); if (i % 2 === 0 && i > 0) { v.box(3, y + 1, z, 7, y + 1, z, 'grey'); v.box(10, y + 1, z, 14, y + 1, z, 'grey'); } }
  for (let i = 0; i <= 6; i++) v.set(8, 15 + i, 8 - i, 'stone2');
  v.box(11, 8, 8, 11, 14, 8, 'roofPink');                                                     // ribbon
}, { page: { pivot: [8.5, 16, 5], build(v) { for (let i = 1; i <= 5; i++) v.box(9, 15 + i + 1, 8 - i, 14, 15 + i + 1, 8 - i, 'white'); } } },
{ room: 'ordmuseum', anim: { page: 'turn rotation.z 0 -> +3.0 around the spine' } });

/* ============================================================ 18 PRINSESSENS ROM */
// 57 c_miaseng – Mia's pink heart bed with a little canopy (part pillows)
D('c_miaseng', [20, 24, 26], 1 / 10, (v) => {
  for (const x of [1, 18]) for (const z of [2, 24]) v.box(x, 0, z, x, 4, z, 'gold');
  v.box(1, 3, 2, 18, 4, 24, 'white'); v.box(2, 5, 3, 17, 6, 23, 'white');
  // duvet with hearts
  for (let z = 9; z <= 24; z++) for (let x = 1; x <= 18; x++) v.set(x, 7, z, ((x + z * 2) % 7 === 0) ? 'white' : 'pink');
  for (let z = 9; z <= 24; z++) { v.box(1, 4, z, 1, 6, z, 'pink'); v.box(18, 4, z, 18, 6, z, 'pink'); }
  v.box(1, 4, 24, 18, 6, 24, 'pink'); v.box(1, 3, 25, 18, 3, 25, 'roofPink');
  // heart headboard
  for (let y = 4; y <= 16; y++) for (let x = 0; x <= 19; x++) { const hx = (x - 9.5) / 9, hy = (y - 11.5) / 6.5; const h = (hx * hx + hy * hy - 1) ** 3 - hx * hx * (-hy) ** 3; if (h <= 0) v.box(x, y, 1, x, y, 2, (h > -0.02) ? 'gold' : 'roofPink'); }
  // small canopy crown + drapes
  v.box(6, 20, 1, 13, 20, 4, 'gold'); for (const x of [6, 9, 13]) v.set(x, 21, 2, 'gold'); v.set(9, 22, 2, 'gem1');
  for (let y = 10; y <= 19; y++) { v.set(5 - Math.round((19 - y) * 0.3), y, 3, 'lavender'); v.set(14 + Math.round((19 - y) * 0.3), y, 3, 'lavender'); v.set(6 - Math.round((19 - y) * 0.3), y, 4, 'lilac'); v.set(13 + Math.round((19 - y) * 0.3), y, 4, 'lilac'); }
}, { pillows: { pivot: [9.5, 7, 6], build(v) { v.ellipsoid(6, 8, 6, 3.4, 1.6, 2.4, 'white'); v.ellipsoid(13, 8, 6, 3.4, 1.6, 2.4, 'blossom'); v.set(13, 9, 7, 'rose'); } } },
{ room: 'prinsesse', anim: { pillows: 'fly up position.y +0.6 spin', whole: 'bounce scale.y' }, seat: [0, 0.75, 0.3] });

// 58 c_dukkehus – a tiny copy of the castle; its front opens (part front)
D('c_dukkehus', [28, 34, 14], 1 / 16, (v) => {
  v.box(0, 0, 0, 27, 1, 13, 'woodLight');
  v.box(4, 2, 1, 23, 22, 11, 'stone'); v.box(5, 2, 2, 22, 21, 11, 0);
  const rc = [['butter', 'peach', 'lavender'], ['mint', 'sky', 'butter'], ['blossom', 'lilac', 'ice']];
  for (let f = 0; f < 3; f++) { v.box(5, 2 + f * 7, 2, 22, 2 + f * 7, 11, 'woodLight'); for (let c = 0; c < 3; c++) { v.box(5 + c * 6, 3 + f * 7, 2, 10 + c * 6, 8 + f * 7, 2, rc[f][c]); v.box(5 + c * 6, 2 + f * 7, 3, 10 + c * 6, 2 + f * 7, 10, f === 0 && c === 1 ? 'roofRed' : 'woodLight'); } }
  v.box(10, 3, 3, 11, 4, 4, 'gold'); v.box(17, 10, 3, 19, 11, 5, 'pink'); v.set(7, 17, 3, 'lamp');
  for (let y = 22; y <= 30; y++) { const i = y - 22; v.box(4 + i, y, 1, 23 - i, y, 11, 'roofPink'); }
  for (const tx of [3, 24]) { v.cyl(tx, 2, 6, 2.6, 22, 'stone'); v.cone(tx, 24, 6, 3.2, 9, 'roofLilac'); v.set(tx, 33, 6, 'gold'); }
}, { front: { pivot: [4, 2, 12], build(v) {
  v.box(4, 2, 12, 23, 22, 12, 'stone');
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) { const x = 6 + c * 6, y = 4 + f * 7; v.box(x, y, 12, x + 2, y + 3, 12, 'glass'); v.box(x - 1, y - 1, 13, x + 3, y - 1, 13, 'white'); }
  v.box(12, 2, 12, 15, 6, 12, 'woodRed'); v.box(12, 2, 12, 15, 4, 12, 'woodRed'); v.set(13, 7, 12, 'woodRed'); v.set(14, 7, 12, 'woodRed');
  glyph(v, HEART3, 12, 21, 13, 'roofPink');
} } }, { room: 'prinsesse', anim: { front: 'rotation.y 0 -> -1.8 (dollhouse opens), then the castle overview' } });

// 59 c_gyngehest – white rocking horse with a pink saddle (part horse rocks)
D('c_gyngehest', [30, 24, 10], 1 / 16, (v) => { v.box(5, 0, 1, 24, 0, 8, 'blossom'); }, {
  horse: { pivot: [15, 0, 5], build(v) {
    for (let x = 1; x <= 28; x++) { const y = Math.round(1 + ((x - 14.5) / 13.5) ** 2 * 4); for (const z of [2, 7]) v.box(x, y, z, x, y + 1, z, 'woodRed'); }
    for (const [x, z] of [[8, 2], [8, 7], [21, 2], [21, 7]]) v.box(x, 3, z, x + 1, 10, z, 'white');
    v.ellipsoid(14.5, 12, 4.5, 8, 3.4, 3, 'white');
    v.box(11, 15, 2, 17, 15, 7, 'roofPink'); v.box(10, 12, 1, 17, 14, 1, 'roofPink'); v.box(10, 12, 8, 17, 14, 8, 'roofPink'); v.box(12, 16, 3, 13, 16, 6, 'gold');
    for (let i = 0; i < 7; i++) v.box(21 + Math.round(i * 0.4), 13 + i, 3, 23 + Math.round(i * 0.4), 14 + i, 6, 'white');   // neck
    v.ellipsoid(26, 20, 4.5, 3.4, 2.2, 2.2, 'white'); v.set(29, 19, 4, 'pink'); v.set(29, 19, 5, 'pink');           // head + nose
    v.set(26, 21, 7, 'black'); v.set(26, 21, 2, 'black'); v.box(24, 23, 4, 24, 23, 5, 'white');
    for (let i = 0; i < 9; i++) v.box(19 + Math.round(i * 0.55), 15 + i, 4, 20 + Math.round(i * 0.55), 16 + i, 5, i & 1 ? 'butter' : 'yellow');      // mane
    for (let i = 0; i < 6; i++) v.box(6 - Math.round(i * 0.5), 13 - i, 4, 7 - Math.round(i * 0.5), 13 - i, 5, 'butter');   // tail
    v.line(23, 18, 7, 13, 15, 7, 'roofRed');                                                                                  // rein
  } },
}, { room: 'prinsesse', anim: { horse: 'rock rotation.z ±0.25 (pivot at the rocker centre)' } });

// 60 c_lekekiste – sky-blue toy chest with stars (part lid), toys inside
D('c_lekekiste', [22, 16, 14], 1 / 16, (v) => {
  rbox(v, 1, 0, 1, 20, 8, 12, 'sky', true);
  v.paint((x, y, z, c) => c === F.PAL.sky && (z === 12 || x === 1 || x === 20) && (x * 3 + y * 5) % 9 === 0 ? 'butter' : null);
  v.box(1, 0, 12, 20, 0, 12, 'white'); v.box(1, 8, 12, 20, 8, 12, 'white');
  v.box(3, 8, 3, 7, 10, 7, 'red'); v.set(5, 11, 5, 'red'); v.sphere(12, 9.5, 6, 2, 'yellow'); v.box(15, 8, 3, 18, 11, 6, 'mint'); v.set(16, 12, 4, 'gem2');
}, { lid: { pivot: [10.5, 9, 1], build(v) { for (let z = 1; z <= 12; z++) { const h = Math.round(Math.sin((z - 1) / 11 * Math.PI) * 2); v.box(1, 9, z, 20, 9 + h, z, 'roofBlue'); } v.box(1, 9, 12, 20, 9, 12, 'white'); glyph(v, ['.X.', 'XXX', '.X.'], 9, 11, 12, 'butter'); } } },
{ room: 'prinsesse', anim: { lid: 'rotation.x 0 -> -1.6; a random toy hops out' } });

// 61 bamse – sitting teddy bear with a pink bow (castable; parts head, armL, armR)
D('bamse', [16, 21, 14], 1 / 16, (v) => {
  v.ellipsoid(8, 6, 6, 5, 5.5, 4.5, 'wood');
  v.ellipsoid(8, 6, 9, 3, 3.6, 1.5, 'woodLight');
  for (const x of [4.5, 11.5]) { v.ellipsoid(x, 2.5, 9, 2.2, 2.2, 3.2, 'wood'); discZ(v, x, 2.5, 12, 1.5, 'woodLight'); }
  v.box(6, 11, 10, 10, 11, 10, 'roofPink'); v.set(5, 12, 10, 'roofPink'); v.set(11, 12, 10, 'roofPink'); v.set(5, 10, 10, 'roofPink'); v.set(11, 10, 10, 'roofPink'); v.set(8, 11, 11, 'rose');
}, {
  head: { pivot: [8, 12, 6], build(v) {
    v.sphere(8, 15.5, 6.5, 4.5, 'wood');
    for (const x of [4, 12]) { v.sphere(x, 19, 6, 1.8, 'wood'); v.set(x, 19, 7, 'woodLight'); v.set(x, 19, 8, 'pink'); }
    v.ellipsoid(8, 14.5, 10, 2.2, 1.6, 1.4, 'woodLight'); v.set(8, 15, 11, 'woodDark'); v.set(8, 14, 11, 'woodDark');
    v.set(6, 16, 10, 'black'); v.set(10, 16, 10, 'black'); v.set(5, 15, 10, 'pink'); v.set(11, 15, 10, 'pink');
  } },
  armL: { pivot: [4, 9, 6], build(v) { v.ellipsoid(2.5, 7, 7, 1.6, 3, 1.8, 'wood'); } },
  armR: { pivot: [12, 9, 6], build(v) { v.ellipsoid(13.5, 7, 7, 1.6, 3, 1.8, 'wood'); } },
}, { room: 'prinsesse', castable: true, anim: { head: 'tilt rotation.z ±0.2', armL: 'hug rotation.z -0.6', armR: 'hug rotation.z +0.6' } });

// 62 c_gardin – window with pink polka-dot curtains (closed); curtains swish open (scale.x)
D('c_gardin', [24, 30, 6], 1 / 10, (v) => {
  for (let y = 3; y <= 24; y++) for (let x = 3; x <= 20; x++) { const fr = x === 3 || x === 20 || y === 3 || y === 24 || x === 11 || x === 12 || y === 14; v.set(x, y, 0, y < 7 && !fr ? 'grass' : fr ? 'white' : 'sky'); if (!fr) v.set(x, y, 1, 'glass'); }
  v.box(2, 2, 1, 21, 2, 3, 'white');
  v.box(0, 27, 3, 23, 27, 3, 'gold'); v.sphere(0, 27, 3, 1.2, 'gold'); v.sphere(23, 27, 3, 1.2, 'gold');
  v.set(16, 18, 0, 'yellow'); v.set(17, 18, 0, 'yellow'); v.set(16, 19, 0, 'yellow'); v.set(17, 19, 0, 'yellow');
}, {
  shutterL: { pivot: [1, 26, 4], build(v) { for (let y = 1; y <= 26; y++) for (let x = 1; x <= 11; x++) v.set(x, y, 4 + ((x & 1) && y < 24 ? 1 : 0), (x * 3 + y * 2) % 7 === 0 ? 'white' : 'pink'); v.box(1, 25, 4, 11, 26, 5, 'roofPink'); } },
  shutterR: { pivot: [22, 26, 4], build(v) { for (let y = 1; y <= 26; y++) for (let x = 12; x <= 22; x++) v.set(x, y, 4 + ((x & 1) && y < 24 ? 1 : 0), (x * 3 + y * 2) % 7 === 0 ? 'white' : 'pink'); v.box(12, 25, 4, 22, 26, 5, 'roofPink'); } },
}, { room: 'prinsesse', wall: true, anim: { shutterL: 'curtain: swish open scale.x 1 -> 0.35', shutterR: 'curtain: scale.x 1 -> 0.35' } });

// 63 c_miatavle – Mia's whiteboard on an easel with doodles (part chalk); words shown as HTML labels
D('c_miatavle', [28, 34, 12], 1 / 16, (v) => {
  for (const [x0, x1, z0, z1] of [[3, 6, 9, 3], [24, 21, 9, 3]]) v.line(x0, 0, z0, x1, 32, z1, 'woodLight');
  v.line(13, 0, 1, 13, 30, 4, 'woodLight');
  v.box(1, 8, 4, 26, 31, 5, 'roofPink'); v.box(2, 9, 5, 25, 30, 5, 'white');
  v.box(1, 7, 5, 26, 7, 7, 'roofPink');
  glyph(v, HEART3, 3, 29, 6, 'rose'); glyph(v, ['.X.', 'XXX', '.X.'], 22, 29, 6, 'butter');
  for (let x = 3; x <= 7; x++) v.set(x, 10, 6, x & 1 ? 'mint' : 'leaf'); v.set(24, 11, 6, 'sky'); v.set(23, 10, 6, 'sky'); v.set(25, 10, 6, 'sky');
  v.set(5, 8, 7, 'sky'); v.set(6, 8, 7, 'sky'); v.set(20, 8, 7, 'mint'); v.set(21, 8, 7, 'mint');
}, { chalk: { pivot: [11, 8, 7], build(v) { v.box(10, 8, 7, 13, 8, 7, 'rose'); v.set(14, 8, 7, 'white'); } } },
{ room: 'prinsesse', anim: { chalk: 'writes: wiggle position.x' }, board: { w: 1.5, h: 1.4, y: 1.2 } });

// 64 c_akvarium – aquarium with sand, plants, a pink castle and 3 fish (parts fish0..fish2)
D('c_akvarium', [28, 22, 14], 1 / 16, (v) => {
  v.box(1, 0, 1, 26, 2, 12, 'white'); v.box(1, 2, 12, 26, 2, 12, 'gold');
  v.box(1, 3, 1, 26, 17, 12, 'glass'); v.box(2, 3, 2, 25, 15, 11, 'crystal');
  v.box(2, 3, 2, 25, 4, 11, 'sand'); for (const [x, z, c] of [[6, 9, 'coral'], [19, 4, 'stone2'], [22, 9, 'lilac']]) v.set(x, 5, z, c);
  for (const [x, z] of [[4, 4], [8, 3], [21, 6], [24, 3]]) for (let y = 5; y <= 11 + (x % 3); y++) v.set(x + ((y >> 1) & 1), y, z, y & 1 ? 'leaf' : 'leaf2');
  v.box(13, 5, 4, 16, 9, 7, 'roofPink'); v.box(14, 10, 5, 15, 11, 6, 'pink'); v.set(14, 7, 8, 'navySoft');
  v.box(1, 18, 1, 26, 18, 12, 'white'); v.box(3, 18, 3, 24, 18, 10, 0);
  for (const [x, y, z] of [[10, 13, 6], [11, 15, 6], [18, 12, 8]]) v.set(x, y, z, 'white');
}, {
  fish: { pivot: [14, 10, 7], build(v) {
    v.ellipsoid(11, 10, 8, 2, 1.4, 1, 'orange'); v.set(8, 10, 8, 'orange'); v.set(8, 11, 8, 'orange'); v.set(8, 9, 8, 'orange'); v.set(12, 11, 9, 'black'); v.set(11, 10, 9, 'white');
    v.ellipsoid(17, 13, 6, 2, 1.4, 1, 'yellow'); v.set(17, 13, 7, 'sky'); v.set(20, 13, 6, 'yellow'); v.set(20, 14, 6, 'yellow'); v.set(20, 12, 6, 'yellow'); v.set(16, 14, 7, 'black');
    v.ellipsoid(15, 7, 9, 1.6, 1.2, 1, 'gem2'); v.set(13, 7, 9, 'gem2'); v.set(13, 8, 9, 'pink'); v.set(16, 8, 10, 'black');
  } },
}, { room: 'prinsesse', anim: { fish: 'swim position.x ±0.4 loop (all three fish), swims to the finger' } });

/* ============================================================ 19 KONGEPARETS SOVEROM */
// 65 c_himmelseng – royal four-poster with lilac drapes and a crown (parts pillows, canopy)
D('c_himmelseng', [26, 30, 28], 1 / 10, (v) => {
  for (const x of [1, 24]) for (const z of [1, 26]) v.box(x, 0, z, x, 25, z, 'gold');
  v.box(1, 3, 1, 24, 5, 26, 'woodRed'); v.box(2, 6, 2, 23, 7, 25, 'white');
  for (let z = 10; z <= 26; z++) for (let x = 1; x <= 24; x++) v.set(x, 8, z, ((x * 2 + z) % 9 === 0) ? 'butter' : 'lavender');
  for (let z = 10; z <= 26; z++) { v.box(1, 5, z, 1, 7, z, 'lavender'); v.box(24, 5, z, 24, 7, z, 'lavender'); }
  v.box(1, 5, 26, 24, 7, 26, 'lavender'); v.box(1, 4, 27, 24, 4, 27, 'gold');
  v.box(2, 6, 0, 23, 16, 1, 'woodRed'); v.box(4, 8, 1, 21, 14, 1, 'roofRed'); glyph(v, ['X.X.X', 'XXXXX', 'XXXXX'], 10, 18, 1, 'gold'); v.box(10, 16, 0, 14, 16, 1, 'gold');
}, {
  pillows: { pivot: [12.5, 8, 5], build(v) { v.ellipsoid(7, 9, 5, 4.4, 1.8, 2.6, 'white'); v.ellipsoid(18, 9, 5, 4.4, 1.8, 2.6, 'white'); v.set(18, 10, 7, 'gold'); } },
  canopy: { pivot: [12.5, 26, 13.5], build(v) {
    v.box(0, 26, 0, 25, 27, 27, 'roofLilac'); v.box(2, 26, 2, 23, 26, 25, 'lavender');
    for (let x = 0; x <= 25; x++) { v.set(x, 25 - (x % 3 === 1 ? 1 : 0), 0, 'roofLilac'); v.set(x, 25 - (x % 3 === 1 ? 1 : 0), 27, 'roofLilac'); }
    for (const [x, z] of [[0, 0], [25, 0], [0, 27], [25, 27]]) for (let y = 8; y <= 25; y++) v.set(x, y, z, (y & 1) ? 'roofLilac' : 'lavender');
    v.set(12, 28, 13, 'gold'); v.set(13, 28, 14, 'gold');
  } },
}, { room: 'soverom', anim: { pillows: 'fly up + feathers', canopy: 'sway rotation.z ±0.03' }, seat: [0, 0.85, 0.4] });

// 66 c_tofler – the king's red velvet slippers with pompoms (parts left, right)
function slipper(v, x0) { for (let z = 1; z <= 10; z++) { const w = z < 3 ? 1 : 2; v.box(x0 + 2 - w, 0, z, x0 + 2 + w, 0, z, 'woodRed'); v.box(x0 + 2 - w, 1, z, x0 + 2 + w, z > 4 ? 2 : 1, z, 'roofRed'); } v.box(x0 + 1, 2, 1, x0 + 3, 2, 4, 'roofRed'); v.box(x0 + 1, 1, 2, x0 + 3, 1, 4, 'lavender'); v.sphere(x0 + 2, 3.5, 8, 1.4, 'wool'); v.set(x0 + 2, 3, 10, 'gold'); }
D('c_tofler', [14, 6, 12], 1 / 16, () => {}, { left: { pivot: [3, 0, 6], build(v) { slipper(v, 1); } }, right: { pivot: [10, 0, 6], build(v) { slipper(v, 8); } } },
{ room: 'soverom', anim: { left: 'waddle rotation.z ±0.3 + step forward', right: 'waddle (opposite phase)' } });

// 67 c_vugge – wooden cradle with baby Ole and a star mobile (parts cradle rocks, mobile spins)
D('c_vugge', [18, 26, 12], 1 / 10, (v) => {
  v.box(2, 0, 2, 15, 0, 9, 'blossom');
  v.box(16, 0, 5, 16, 24, 6, 'gold'); v.box(10, 24, 5, 16, 24, 6, 'gold');
}, {
  cradle: { pivot: [8.5, 0, 5.5], build(v) {
    for (let x = 1; x <= 16; x++) { const y = Math.round(((x - 8.5) / 7.5) ** 2 * 2); for (const z of [2, 9]) v.set(x, y, z, 'woodRed'); }
    rbox(v, 2, 2, 2, 15, 7, 9, 'woodLight', true); v.box(3, 3, 3, 14, 7, 8, 0); v.box(3, 3, 3, 14, 5, 8, 'sky');
    for (const x of [2, 15]) v.box(x, 7, 2, x, 10, 9, 'woodLight');
    v.box(3, 6, 3, 14, 6, 8, 'sky'); glyph(v, HEART3, 7, 6, 10, 'roofPink');
    v.sphere(5, 7.5, 5.5, 1.8, 'skin'); v.set(4, 8, 7, 'black'); v.set(6, 8, 7, 'black'); v.box(3, 8, 4, 6, 9, 7, 'sky'); v.set(5, 7, 7, 'pink');
    v.box(6, 6, 3, 13, 6, 8, 'blossom');
  } },
  mobile: { pivot: [10, 24, 5.5], build(v) { v.box(10, 21, 5, 10, 23, 5, 'gold'); v.box(6, 21, 5, 14, 21, 5, 'gold'); for (const [x, c] of [[6, 'butter'], [10, 'sky'], [14, 'blossom']]) { v.box(x, 18, 5, x, 20, 5, 'white'); glyph(v, ['.X.', 'XXX', '.X.'], x - 1, 18, 5, c); } } },
}, { room: 'soverom', anim: { cradle: 'rock rotation.z ±0.2', mobile: 'spin rotation.y' } });

// 68 c_stjernelampe – star lamp: blue globe with star holes over a warm bulb (part shade turns)
D('c_stjernelampe', [14, 18, 14], 1 / 16, (v) => {
  v.cyl(7, 0, 7, 4, 1, 'gold'); v.cyl(7, 1, 7, 2.6, 2, 'honey'); v.box(7, 3, 7, 7, 4, 7, 'gold');
  v.sphere(7, 10, 7, 3, 'lamp');
}, { star: { pivot: [7, 10, 7], build(v) {
  v.sphere(7, 10, 7, 5.6, 'roofBlue'); v.sphere(7, 10, 7, 4.6, 0);
  v.paint((x, y, z) => { const a = Math.atan2(z - 7, x - 7), b = y - 10; return ((Math.round(a * 4) + Math.round(b / 2)) % 3 === 0 && Math.abs(b) < 4) ? 'glowYellow' : null; });
  v.box(6, 15, 6, 8, 16, 8, 'gold');
} } }, { room: 'soverom', anim: { star: 'turn rotation.y slowly; stars painted on the ceiling (FX)' } });

// 69 c_kongeskap – royal wardrobe with capes inside (parts doorL, doorR)
D('c_kongeskap', [22, 34, 11], 1 / 10, (v) => {
  for (const x of [1, 20]) v.box(x, 0, 2, x, 1, 9, 'gold');
  v.box(0, 2, 0, 21, 28, 9, 'woodRed'); v.box(2, 3, 1, 19, 27, 9, 0);
  v.box(2, 3, 1, 19, 27, 1, 'lavender');
  v.box(2, 24, 3, 19, 24, 4, 'gold');                                           // rail
  cape(v, 5, 'roofRed'); cape(v, 11, 'plum'); cape(v, 16, 'roofBlue');
  v.box(0, 29, 0, 21, 29, 10, 'woodRed'); for (let i = 0; i < 4; i++) v.box(5 + i, 30 + i, 1, 16 - i, 30 + i, 3, 'woodRed');
  glyph(v, ['X.X.X', 'XXXXX'], 8, 33, 4, 'gold'); v.set(10, 32, 4, 'gem1');
}, {
  doorL: { pivot: [0, 2, 10], build(v) { door2(v, 0, 10); } },
  doorR: { pivot: [22, 2, 10], build(v) { door2(v, 11, 21); } },
}, { room: 'soverom', anim: { doorL: 'rotation.y 0 -> -1.7', doorR: 'rotation.y 0 -> +1.7', capes: 'inside (body)' } });
function cape(v, x, c) { v.box(x, 23, 4, x + 1, 24, 5, 'gold'); for (let y = 8; y <= 22; y++) { const w = Math.round((22 - y) * 0.18) + 1; v.box(x - w + 1, y, 3, x + w, y, 6, c); } v.box(x - 1, 21, 3, x + 2, 22, 6, 'white'); }
function door2(v, x0, x1) {
  v.box(x0, 2, 9, x1, 28, 9, 'woodRed'); v.box(x0 + 1, 3, 10, x1 - 1, 27, 10, 'wood');
  for (let y = 6; y <= 24; y++) for (let x = x0 + 2; x <= x1 - 2; x++) { const q = ((x - (x0 + x1) / 2) / ((x1 - x0) / 2 - 1.4)) ** 2 + ((y - 15) / 9) ** 2; if (q <= 1) v.set(x, y, 10, q > 0.72 ? 'gold' : 'lavender'); }
  v.set(x0 === 0 ? x1 - 1 : x0 + 1, 15, 11, 'gold');
}

/* ============================================================ 20 BADET */
// 70 c_badekar – pink clawfoot tub (parts water rises, foam)
D('c_badekar', [22, 14, 12], 1 / 10, (v) => {
  for (const x of [3, 18]) for (const z of [2, 9]) { v.box(x, 0, z, x, 1, z, 'gold'); v.set(x + (x < 10 ? -1 : 1), 0, z, 'gold'); }
  for (let y = 2; y <= 8; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 22; x++) { const q = ((x - 10.5) / (9 + (y - 2) * 0.25)) ** 2 + ((z - 5.5) / (4.3 + (y - 2) * 0.15)) ** 2; if (q <= 1) v.set(x, y, z, q > 0.68 || y === 2 ? 'roofPink' : 0); }
  v.paint((x, y, z, c) => c === F.PAL.roofPink && y === 8 ? 'white' : null);
  for (let y = 3; y <= 8; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 22; x++) if (!v.get(x, y, z)) { const q = ((x - 10.5) / (9 + (y - 2) * 0.25)) ** 2 + ((z - 5.5) / (4.3 + (y - 2) * 0.15)) ** 2; if (q <= 1 && q > 0.55) v.set(x, y, z, 'white'); }
  v.box(20, 9, 5, 20, 12, 6, 'gold'); v.box(18, 12, 5, 20, 12, 6, 'gold'); v.set(18, 11, 5, 'gold'); v.set(21, 10, 4, 'gold'); v.set(21, 10, 7, 'gold');
}, {
  water: { pivot: [10.5, 3, 5.5], build(v) { for (let z = 0; z < 12; z++) for (let x = 0; x < 22; x++) { const q = ((x - 10.5) / 8.6) ** 2 + ((z - 5.5) / 3.8) ** 2; if (q <= 0.62) v.box(x, 3, z, x, 4, z, 'crystal'); } } },
  foam: { pivot: [10.5, 7, 5.5], build(v) { for (const [x, z, r] of [[6, 4, 1.6], [9, 6, 1.4], [14, 5, 1.8], [12, 3, 1.2], [16, 6, 1.3]]) v.sphere(x, 8, z, r, 'white'); } },
}, { room: 'bad', anim: { water: 'scale.y 1 -> 2.6 (fills)', foam: 'rise + wobble; ducks float on top (spawn c_gummiand)' }, waterTopY: 0.9 });

// 71 c_sape – shell soap dish with a pink soap bar (part soap slides)
D('c_sape', [12, 5, 10], 1 / 16, (v) => {
  for (let z = 0; z < 10; z++) for (let x = 0; x < 12; x++) { const q = ((x - 5.5) / 5.6) ** 2 + ((z - 4.5) / 4.6) ** 2; if (q <= 1) { v.set(x, 0, z, 'sky'); if (q > 0.6) v.set(x, 1, z, (Math.round(Math.atan2(z - 4.5, x - 5.5) * 3) & 1) ? 'sky' : 'white'); } }
}, { soap: { pivot: [5.5, 1, 4.5], build(v) { rbox(v, 3, 1, 3, 8, 2, 6, 'blossom', true); v.set(5, 3, 4, 'white'); v.set(6, 3, 4, 'white'); v.set(7, 4, 5, 'crystal'); } } },
{ room: 'bad', anim: { soap: 'slide position.x ±0.15 + bubbles' } });

// 72 speil – standing oval mirror with a gold frame (castable; part mirror shimmers / fogs)
D('speil', [16, 30, 8], 1 / 16, (v) => {
  for (const [x, z] of [[3, 2], [12, 2], [3, 6], [12, 6]]) v.box(x, 0, z, x, 1, z, 'gold');
  v.box(3, 1, 2, 12, 1, 6, 'gold'); v.box(7, 2, 4, 8, 5, 4, 'gold');
  for (let y = 5; y <= 28; y++) for (let x = 0; x < 16; x++) { const q = ((x - 7.5) / 6.6) ** 2 + ((y - 16.5) / 11.4) ** 2; if (q <= 1 && q > 0.7) v.box(x, y, 3, x, y, 4, 'gold'); }
  v.set(7, 29, 4, 'gold'); v.set(8, 29, 4, 'gold'); v.set(7, 28, 5, 'gem1');
  for (let y = 7; y <= 26; y++) for (let x = 2; x < 14; x++) { const q = ((x - 7.5) / 6.6) ** 2 + ((y - 16.5) / 11.4) ** 2; if (q <= 0.72) v.set(x, y, 3, 'silver'); }
}, { fog: { pivot: [7.5, 16.5, 5], build(v) { for (let y = 8; y <= 25; y++) for (let x = 3; x < 13; x++) { const q = ((x - 7.5) / 6.6) ** 2 + ((y - 16.5) / 11.4) ** 2; if (q <= 0.6) v.set(x, y, 5, 'glass'); } for (const [x, y] of [[6, 19], [9, 19], [5, 18], [7, 18], [8, 18], [10, 18], [5, 17], [10, 17], [6, 16], [9, 16], [7, 15], [8, 15]]) v.set(x, y, 6, 'white'); } },
  mirror: { pivot: [7.5, 16.5, 4], build(v) { for (let y = 7; y <= 26; y++) for (let x = 2; x < 14; x++) { const q = ((x - 7.5) / 6.6) ** 2 + ((y - 16.5) / 11.4) ** 2; if (q <= 0.72) v.set(x, y, 4, (x - y + 40) % 9 === 0 || (x - y + 41) % 9 === 0 ? 'white' : 'glass'); } } } },
{ room: 'bad', castable: true, anim: { mirror: 'shimmer', fog: 'visible = fogged (init hidden); a heart is drawn in the fog' } });

// 73 c_gummiand – rubber duck with a tiny crown (part duck hops)
D('c_gummiand', [12, 13, 12], 1 / 16, () => {}, { duck: { pivot: [6, 0, 6], build(v) {
  v.ellipsoid(6, 3, 5.5, 4.6, 3, 4.6, 'yellow'); v.box(1, 0, 1, 11, 0, 11, 0);
  v.set(6, 5, 1, 'yellow'); v.set(6, 6, 1, 'yellow');                     // tail
  v.sphere(6, 8, 7, 2.8, 'yellow');
  v.box(5, 7, 10, 7, 7, 11, 'orange'); v.box(5, 6, 10, 7, 6, 10, 'orange');
  v.set(4, 9, 8, 'black'); v.set(8, 9, 8, 'black'); v.set(4, 8, 8, 'pink'); v.set(8, 8, 8, 'pink');
  v.box(5, 11, 6, 7, 11, 8, 'gold'); v.set(5, 12, 6, 'gold'); v.set(7, 12, 8, 'gold'); v.set(5, 12, 8, 'gold'); v.set(7, 12, 6, 'gold');
  v.ellipsoid(3, 4, 5.5, 1, 2, 2.6, 'butter'); v.ellipsoid(9, 4, 5.5, 1, 2, 2.6, 'butter');
} } }, { room: 'bad', anim: { duck: 'squeak: scale.y 0.8 then hop' }, floats: true });

// 74 c_vask – pedestal basin with a gold tap and a pink towel (parts handle, water)
D('c_vask', [18, 26, 11], 1 / 10, (v) => {
  v.cyl(9, 0, 5, 2.6, 1, 'white'); v.cyl(9, 1, 5, 1.6, 8, 'white'); v.cyl(9, 9, 5, 2.6, 1, 'white');
  for (let y = 10; y <= 12; y++) for (let z = 0; z < 11; z++) for (let x = 0; x < 18; x++) { const q = ((x - 9) / (6 + (y - 10) * 0.8)) ** 2 + ((z - 5) / (4 + (y - 10) * 0.5)) ** 2; if (q <= 1 && (q > 0.55 || y === 10)) v.set(x, y, z, 'white'); }
  v.box(8, 12, 0, 10, 16, 1, 'gold'); v.box(9, 16, 1, 9, 16, 4, 'gold'); v.set(9, 15, 4, 'gold');
  v.box(1, 18, 0, 16, 18, 0, 'gold'); v.box(2, 12, 1, 6, 18, 1, 'roofPink'); v.box(2, 12, 1, 6, 12, 1, 'white');      // towel bar + towel
}, {
  handle: { pivot: [9, 17, 1], build(v) { v.box(9, 17, 0, 9, 17, 1, 'gold'); v.box(7, 18, 1, 11, 18, 1, 'gold'); v.set(7, 18, 2, 'white'); v.set(11, 18, 2, 'white'); } },
  water: { pivot: [9, 15, 4], build(v) { v.box(9, 11, 4, 9, 14, 4, 'crystal'); } },
}, { room: 'bad', anim: { handle: 'rotation.y 0 -> 1', water: 'visible toggle / scale.y' } });

/* ============================================================ GARDEROBEN */
function dress(v, cx, y0, z, c) {
  v.line(cx - 2, y0 + 14, z, cx, y0 + 16, z, 'gold'); v.line(cx + 2, y0 + 14, z, cx, y0 + 16, z, 'gold'); v.set(cx, y0 + 17, z, 'gold');
  v.box(cx - 1, y0 + 9, z - 1, cx + 1, y0 + 14, z + 1, c);
  for (let y = 0; y <= 8; y++) { const r = 1.2 + (8 - y) * 0.42; for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let zz = z - 2; zz <= z + 2; zz++) if (((x - cx) / r) ** 2 + ((zz - z) / 2.2) ** 2 <= 1) v.set(x, y0 + y, zz, y === 0 ? 'white' : c); }
  v.box(cx - 1, y0 + 9, z + 1, cx + 1, y0 + 9, z + 1, 'white');
}
// 75 c_kjolestativ – clothes rack with 4 dresses (part dresses slides along)
D('c_kjolestativ', [30, 22, 10], 1 / 10, (v) => {
  for (const x of [1, 28]) { v.box(x, 1, 5, x, 20, 5, 'gold'); v.box(x - 1, 0, 2, x + 1, 0, 8, 'gold'); v.set(x, 0, 1, 'gold'); v.set(x, 0, 9, 'gold'); }
  v.box(1, 20, 5, 28, 20, 5, 'gold'); v.sphere(1, 21, 5, 1, 'gold'); v.sphere(28, 21, 5, 1, 'gold');
}, { dresses: { pivot: [14.5, 20, 5], build(v) { [['rose', 6], ['sky', 11], ['butter', 17], ['mint', 22]].forEach(([c, x]) => dress(v, x, 2, 5, c)); for (const [x, y] of [[6, 8], [11, 9], [17, 8], [22, 9]]) v.set(x, y, 7, 'white'); } } },
{ room: 'garderobe', anim: { dresses: 'slide position.x ±0.3; tap to try on owned outfits' } });

// 76 c_hattehylle – wall shelf with three hats (parts hat0..hat2)
D('c_hattehylle', [32, 26, 9], 1 / 16, (v) => {
  v.box(0, 0, 0, 31, 25, 0, 'peach'); v.box(0, 0, 0, 31, 0, 0, 'woodLight');
  for (const y of [2, 13]) { v.box(1, y, 1, 30, y, 8, 'woodLight'); v.box(1, y, 8, 30, y, 8, 'wood'); v.box(3, y - 1, 1, 3, y - 1, 3, 'wood'); v.box(28, y - 1, 1, 28, y - 1, 3, 'wood'); }
  for (const x of [6, 16, 26]) { v.set(x, 23, 1, 'gold'); v.set(x, 23, 2, 'gold'); }
}, {
  hat0: { pivot: [8, 3, 5], build(v) { ringY(v, 8, 3, 5, 0, 5.4, 'hay'); v.cyl(8, 4, 5, 3, 3, 'hay'); ringY(v, 8, 5, 5, 2.6, 3.4, 'roofPink'); v.set(11, 5, 8, 'rose'); v.set(12, 5, 8, 'rose'); } },
  hat1: { pivot: [22, 3, 5], build(v) { ringY(v, 22, 3, 5, 0, 4.2, 'navySoft'); v.cyl(22, 4, 5, 2.8, 6, 'navySoft'); ringY(v, 22, 5, 5, 2.4, 3.2, 'gold'); v.set(22, 6, 8, 'gem1'); } },
  hat2: { pivot: [15, 14, 5], build(v) { for (let i = 0; i < 8; i++) ringY(v, 15, 14 + i, 5, 0, 3.4 - i * 0.42, i % 2 ? 'roofLilac' : 'lavender'); v.set(15, 22, 5, 'butter'); v.set(15, 23, 5, 'butter'); for (let y = 15; y <= 20; y += 2) v.set(15, y, 8 - Math.round((y - 14) * 0.4), 'butter'); } },
}, { room: 'garderobe', wall: true, anim: { hat0: 'hop onto her head in turn', hat1: 'hop', hat2: 'hop' } });

// 77 c_skohylle – shoe rack with three pairs (parts shoes0..shoes2 tap-dance)
function shoePair(v, x0, y0, c, heel) { for (const dx of [0, 4]) { v.box(x0 + dx, y0, 2, x0 + dx + 2, y0, 7, c); v.box(x0 + dx, y0 + 1, 2, x0 + dx + 2, y0 + 1, 4, c); if (heel) v.box(x0 + dx + 1, y0, 2, x0 + dx + 1, y0 + 2, 2, c); v.set(x0 + dx + 1, y0 + 1, 6, 'white'); } }
D('c_skohylle', [28, 18, 10], 1 / 16, (v) => {
  for (const x of [0, 27]) v.box(x, 0, 0, x, 17, 9, 'white');
  for (const y of [0, 8]) { v.box(0, y, 0, 27, y, 9, 'white'); v.box(0, y, 9, 27, y, 9, 'roofPink'); }
  v.box(0, 17, 0, 27, 17, 9, 'white'); v.box(1, 1, 0, 26, 16, 0, 'blossom');
}, {
  shoes: { pivot: [13.5, 1, 5], build(v) { shoePair(v, 3, 1, 'gem2', true); shoePair(v, 16, 1, 'red', false); shoePair(v, 9, 9, 'blossom', false); v.set(10, 11, 3, 'rose'); v.set(14, 11, 3, 'rose'); } },
}, { room: 'garderobe', anim: { shoes: 'tap-dance: position.y hops' } });

// 78 c_fespeil – fairy mirror with crystal frame, butterfly wings and a star (parts mirror, wingL, wingR) – change fairy
D('c_fespeil', [24, 38, 6], 1 / 16, (v) => {
  v.box(8, 0, 1, 15, 1, 4, 'lavender'); v.box(10, 2, 2, 13, 3, 3, 'lavender');
  for (let y = 4; y <= 33; y++) for (let x = 0; x < 24; x++) { const q = ((x - 11.5) / 7.4) ** 2 + ((y - 18.5) / 14.5) ** 2; if (q <= 1 && q > 0.74) v.box(x, y, 2, x, y, 3, q > 0.9 ? 'lavender' : ((x + y) % 4 ? 'crystal' : 'gem2')); }
  for (const [x, y] of [[11, 34], [12, 34], [11, 35], [12, 35], [10, 35], [13, 35], [11, 36], [12, 36]]) v.set(x, y, 3, 'glowYellow');
  for (let y = 6; y <= 31; y++) for (let x = 5; x < 19; x++) { const q = ((x - 11.5) / 7.4) ** 2 + ((y - 18.5) / 14.5) ** 2; if (q <= 0.76) v.set(x, y, 2, 'silver'); }
}, {
  mirror: { pivot: [11.5, 18.5, 3], build(v) { for (let y = 6; y <= 31; y++) for (let x = 5; x < 19; x++) { const q = ((x - 11.5) / 7.4) ** 2 + ((y - 18.5) / 14.5) ** 2; if (q <= 0.76) v.set(x, y, 3, (x + y) % 11 === 0 ? 'white' : 'glass'); } } },
  wingL: { pivot: [4, 24, 2.5], build(v) { for (let y = 16; y <= 32; y++) for (let x = 0; x <= 5; x++) { const q1 = ((x - 2) / 2.6) ** 2 + ((y - 27) / 5) ** 2, q2 = ((x - 2.5) / 2.2) ** 2 + ((y - 19.5) / 3.4) ** 2; if (q1 <= 1 || q2 <= 1) v.set(x, y, 2, (q1 > 0.6 && q1 <= 1) || (q2 > 0.6 && q2 <= 1) ? 'lilac' : 'glass'); } } },
  wingR: { pivot: [19, 24, 2.5], build(v) { for (let y = 16; y <= 32; y++) for (let x = 18; x <= 23; x++) { const q1 = ((x - 21) / 2.6) ** 2 + ((y - 27) / 5) ** 2, q2 = ((x - 20.5) / 2.2) ** 2 + ((y - 19.5) / 3.4) ** 2; if (q1 <= 1 || q2 <= 1) v.set(x, y, 2, (q1 > 0.6 && q1 <= 1) || (q2 > 0.6 && q2 <= 1) ? 'lilac' : 'glass'); } } },
}, { room: 'garderobe', anim: { wingL: 'flap rotation.y ±0.5', wingR: 'flap (mirrored)', mirror: 'shimmer' } });

// 79 c_symaskin – mint vintage sewing machine (parts wheel spins, needle bobs)
D('c_symaskin', [26, 18, 12], 1 / 16, (v) => {
  rbox(v, 0, 0, 1, 25, 2, 10, 'woodLight', true);
  v.box(2, 3, 3, 23, 4, 8, 'roofMint');                                     // bed
  v.box(17, 5, 4, 22, 13, 7, 'roofMint');                                   // pillar
  v.box(5, 11, 4, 22, 14, 7, 'roofMint'); v.box(4, 8, 4, 7, 14, 7, 'roofMint');   // arm + head
  for (let x = 8; x <= 16; x++) v.set(x, 12, 8, (x % 3 === 0) ? 'gold' : 'roofMint');
  v.box(8, 13, 8, 16, 13, 8, 'gold');
  v.box(12, 15, 5, 13, 17, 6, 'roofPink'); v.set(12, 18, 5, 'gold');       // thread spool
  v.box(3, 5, 2, 11, 5, 9, 'sky'); for (const [x, z] of [[4, 3], [7, 6], [10, 4], [5, 8]]) v.set(x, 5, z, 'white');   // fabric
}, {
  wheel: { pivot: [23, 10, 5.5], build(v) { discX(v, 23, 10, 5.5, 3, 'gold'); discX(v, 24, 10, 5.5, 1.2, 'honey'); v.set(24, 12, 5, 'roofPink'); } },
  needle: { pivot: [5.5, 8, 5.5], build(v) { v.box(5, 6, 5, 5, 7, 5, 'silver'); } },
}, { room: 'garderobe', anim: { wheel: 'rotation.x spin', needle: 'position.y ±0.06 fast; a ribbon flutters out (FX)' } });

/* ============================================================ FETÅRNET */
// 80 c_tarnvindu – round tower window with a cushioned window seat (part window swings open)
D('c_tarnvindu', [24, 28, 8], 1 / 10, (v) => {
  for (let y = 0; y < 28; y++) for (let x = 0; x < 24; x++) { const d = Math.hypot(x - 11.5, y - 16); if (d <= 11.5 && d > 9) v.box(x, y, 0, x, y, 2, (Math.floor(Math.atan2(y - 16, x - 11.5) * 3) & 1) ? 'stone' : 'stone2'); if (d <= 9) v.set(x, y, 0, y < 12 ? ((x + y) % 3 ? 'grass' : 'leaf2') : y < 13 ? 'leaf' : ((x * 7 + y) % 17 === 0 ? 'white' : 'sky')); }
  v.box(0, 0, 0, 23, 5, 7, 'woodLight'); v.box(1, 6, 1, 22, 7, 7, 'blossom'); v.box(1, 5, 7, 22, 5, 7, 'gold');
  for (const x of [3, 19]) v.ellipsoid(x, 9, 3, 2.4, 2, 1.6, x < 10 ? 'mint' : 'butter');
  for (let x = 2; x <= 21; x += 4) v.set(x, 3, 8, 'gold');
}, { window: { pivot: [2.5, 16, 2.5], build(v) { for (let y = 0; y < 28; y++) for (let x = 0; x < 24; x++) { const d = Math.hypot(x - 11.5, y - 16); if (d <= 9.4) { const seg = Math.floor((Math.atan2(y - 16, x - 11.5) + Math.PI) / (Math.PI / 4)); v.set(x, y, 2, d > 8.4 || Math.abs(x - 11.5) < 0.6 || Math.abs(y - 16) < 0.6 ? 'white' : (d < 3 ? 'crystal' : 'glass')); if (d > 3 && d < 3.8) v.set(x, y, 2, ['rose', 'butter', 'mint', 'sky', 'lavender', 'pink', 'gem3', 'coral'][seg]); } } } } },
{ room: 'fetarn', wall: true, anim: { window: 'rotation.y 0 -> -1.4 (opens); camera wide view' }, seat: [0, 0.75, 0.4] });

// 81 c_sparegris – her big pink piggy bank (parts coin drops into the slot, pig wobbles)
D('c_sparegris', [16, 16, 13], 1 / 16, () => {}, {
  pig: { pivot: [8, 0, 6], build(v) { pig(v, 8, 0, 6, 3); } },
  coin: { pivot: [8, 13, 5], build(v) { discZ(v, 8, 13, 5, 1.8, 'gold'); v.set(8, 13, 6, 'honey'); } },
}, { room: 'fetarn', anim: { coin: 'drop position.y -0.25 into the slot + clink', pig: 'wobble' } });

// 82 c_dyrekurv – wicker pet basket with a cushion, bone and ball (part cushion)
D('c_dyrekurv', [22, 12, 16], 1 / 16, (v) => {
  for (let y = 0; y <= 5; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 22; x++) {
    const q = ((x - 10.5) / 10.4) ** 2 + ((z - 7.5) / 7.4) ** 2, front = z > 11 && y > 3;
    if (q <= 1 && (q > 0.7 || y === 0) && !front) v.set(x, y, z, ((x + y + z) & 1) ? 'hay' : 'woodLight');
  }
  v.box(14, 0, 15, 18, 0, 15, 'white'); for (const x of [13, 19]) { v.set(x, 0, 14, 'white'); v.set(x, 0, 15, 'white'); }
  v.sphere(3, 2, 13, 1.6, 'sky');
}, { cushion: { pivot: [10.5, 1, 7.5], build(v) { for (let z = 0; z < 16; z++) for (let x = 0; x < 22; x++) { const q = ((x - 10.5) / 8.4) ** 2 + ((z - 7.5) / 5.6) ** 2; if (q <= 1) v.box(x, 1, z, x, q < 0.6 ? 3 : 2, z, ((x + z) % 5 === 0) ? 'white' : 'roofPink'); } } } },
{ room: 'fetarn', anim: { cushion: 'puff scale.y 1.3 then back' } });

/* ============================================================ STJERNETÅRNET */
// 83 c_teleskop – brass telescope on a wooden tripod (part tube tilts / turns)
D('c_teleskop', [26, 28, 14], 1 / 16, (v) => {
  for (const [x, z] of [[6, 2], [18, 2], [12, 12]]) v.line(12, 15, 7, x, 0, z, 'woodRed');
  v.box(11, 15, 6, 13, 16, 8, 'gold');
}, { tube: { pivot: [12, 17, 7], build(v) {
  for (let i = 0; i <= 22; i++) { const t = i / 22, x = 2 + t * 21, y = 13 + t * 12, r = 1.2 + t * 1.5; discX(v, Math.round(x), y, 7, r, (i % 6 === 0) ? 'gold' : (i > 18 ? 'honey' : 'roofBlue')); }
  discX(v, 23, 25, 7, 2.6, 'gold'); discX(v, 24, 25, 7, 2.1, 'crystal');
  v.box(1, 12, 7, 2, 13, 7, 'navySoft');
  v.box(12, 17, 7, 12, 18, 7, 'gold');
} } }, { room: 'stjernetarn', anim: { tube: 'rotation.y / rotation.z aim at a landmark' } });

// 84 c_kartbord – map table with a parchment map, rolled ends and a compass (parts map, needle)
D('c_kartbord', [20, 13, 15], 1 / 10, (v) => {
  for (const x of [2, 17]) for (const z of [2, 12]) v.box(x, 0, z, x, 7, z, 'woodRed');
  v.box(1, 6, 2, 18, 6, 12, 'woodRed'); v.box(0, 8, 0, 19, 8, 14, 'woodRed'); v.box(0, 7, 0, 19, 7, 0, 'gold'); v.box(0, 7, 14, 19, 7, 14, 'gold');
  ringY(v, 16, 9, 11, 0, 1.8, 'gold'); ringY(v, 16, 9, 11, 0, 1.2, 'cream');
}, {
  map: { pivot: [8, 9, 7], build(v) {
    for (let z = 2; z <= 12; z++) for (let x = 2; x <= 14; x++) { const n = F.U.noise2(x * 0.4, z * 0.4, 4); v.set(x, 9, z, n > 0.62 ? 'sky' : n < 0.32 ? 'leaf2' : n < 0.4 ? 'mint' : 'cream2'); }
    for (let x = 3; x <= 12; x++) if (x % 2) v.set(x, 9, Math.round(7 + Math.sin(x * 0.7) * 2), 'woodRed');
    v.box(8, 10, 6, 9, 10, 7, 'roofPink'); v.set(8, 11, 6, 'gold');
    cylZ(v, 2, 12, 1.5, 10, 1, 'cream'); cylZ(v, 2, 12, 15, 10, 1, 'cream');
  } },
  needle: { pivot: [16, 10, 11], build(v) { v.set(16, 10, 10, 'red'); v.set(16, 10, 12, 'white'); v.set(16, 10, 11, 'gold'); } },
}, { room: 'stjernetarn', anim: { map: 'flutter / open the map (Kart)', needle: 'rotation.y spin then settle north' } });

// 85 c_stjernebilde – constellation board (soft blue sky with tiny dots and a moon); the 11 numbered stars are added by the thing
D('c_stjernebilde', [34, 26, 4], 1 / 16, (v) => {
  for (let y = 0; y < 26; y++) for (let x = 0; x < 34; x++) { const edge = x < 1 || x > 32 || y < 1 || y > 24; if ((x < 2 || x > 31) && (y < 2 || y > 23)) continue; v.set(x, y, 0, edge ? 'gold' : ((x * 7 + y * 13) % 29 === 0 ? 'white' : (y > 18 ? 'roofBlue' : (y > 9 ? 'navySoft' : 'roofBlue')))); }
  for (let y = 1; y < 25; y++) for (let x = 1; x < 33; x++) if ((x + y * 3) % 23 === 0) v.set(x, y, 1, 'lavender');
  for (let x = 2; x <= 7; x++) for (let y = 19; y <= 23; y++) { const q = Math.hypot(x - 4.5, y - 21), q2 = Math.hypot(x - 5.8, y - 21.6); if (q <= 2.4 && q2 > 2) v.set(x, y, 1, 'butter'); }
  for (const [x, y] of [[0, 25], [33, 25], [0, 0], [33, 0]]) v.set(x, y, 1, 'gold');
}, null, { room: 'stjernetarn', wall: true, note: 'the 11 stars 10..20 are thing-made (tmp_star + labels) on top of this board' });

/* ============================================================ static decor furniture (non-interactive, for room DECOR tables) */
// c_kjokkenbord – kitchen table 2.6 x 0.9 x 1.4 m (same footprint as tmp_kbord; top face 0.9 m) with a checked cloth
D('c_kjokkenbord', [26, 9, 14], 1 / 10, (v) => {
  for (const [x, z] of [[1, 1], [23, 1], [1, 11], [23, 11]]) { v.box(x, 0, z, x + 1, 7, z + 1, 'wood'); v.box(x, 0, z, x + 1, 0, z + 1, 'woodDark'); }
  v.box(0, 7, 0, 25, 7, 13, 'woodLight'); v.box(0, 8, 0, 25, 8, 13, 'woodLight');
  for (let z = 3; z <= 10; z++) for (let x = 6; x <= 19; x++) v.set(x, 8, z, ((x >> 1) + (z >> 1)) & 1 ? 'white' : 'coral');
  v.box(0, 6, 0, 25, 6, 0, 'wood'); v.box(0, 6, 13, 25, 6, 13, 'wood');
}, null, { room: 'kjokken', decor: true, topY: 0.9 });
// c_benk – upholstered bench (hall, lift landings)
D('c_benk', [24, 9, 8], 1 / 10, (v) => {
  for (const x of [1, 21]) for (const z of [1, 5]) v.box(x, 0, z, x + 1, 3, z + 1, 'gold');
  rbox(v, 0, 4, 0, 23, 5, 7, 'woodRed', false); v.box(1, 6, 1, 22, 7, 6, 'roofPink');
  for (const x of [5, 11, 17]) v.set(x, 7, 3, 'gold');
}, null, { decor: true, seat: [0, 0.8, 0] });
// c_plante – big flower pot (pink blossoms)
D('c_plante', [14, 22, 14], 1 / 16, (v) => {
  v.cyl(7, 0, 7, 4, 1, 'woodRed'); v.cyl(7, 1, 7, 4.6, 6, 'roofBlue'); ringY(v, 7, 4, 7, 4.2, 5, 'white'); ringY(v, 7, 7, 7, 4.2, 5.2, 'gold'); v.cyl(7, 7, 7, 4, 1, 'soil');
  v.ellipsoid(7, 13, 7, 5.6, 5.6, 5.6, 'leaf');
  v.paint((x, y, z, c) => c === F.PAL.leaf ? (F.U.hash2(x * 5 + z, y, 31) < 0.22 ? 'blossom' : F.U.hash2(x, y * 3 + z, 32) < 0.1 ? 'rose' : F.U.hash2(x + y, z, 33) < 0.3 ? 'leaf2' : null) : null);
}, null, { decor: true });
// c_soyle – white pillar with gold capital (2.5 m)
D('c_soyle', [8, 26, 8], 1 / 10, (v) => {
  v.box(0, 0, 0, 7, 1, 7, 'stone2'); v.cyl(3.5, 2, 3.5, 2.8, 21, 'white');
  v.paint((x, y, z, c) => c === F.PAL.white && y > 2 && y < 22 && (Math.round(Math.atan2(z - 3.5, x - 3.5) * 2.5) & 1) ? 'cream' : null);
  ringY(v, 3.5, 22, 3.5, 0, 3.4, 'gold'); v.box(0, 23, 0, 7, 25, 7, 'stone2'); v.box(0, 24, 0, 7, 24, 7, 'gold');
}, null, { decor: true });
// c_teppe – round rug (3 m) in rainbow rings
D('c_teppe', [30, 1, 30], 1 / 10, (v) => {
  const C = ['blossom', 'butter', 'mint', 'sky', 'lavender', 'pink', 'white'];
  for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) { const r = Math.hypot(x - 14.5, z - 14.5); if (r <= 14.6) v.set(x, 0, z, r > 13.6 ? 'white' : C[Math.floor(r / 2.2) % C.length]); }
}, null, { decor: true, walkable: true });
// c_stol – dining chair with a pink heart back
D('c_stol', [10, 18, 10], 1 / 10, (v) => {
  for (const [x, z] of [[1, 1], [8, 1], [1, 8], [8, 8]]) v.box(x, 0, z, x, 6, z, 'woodRed');
  v.box(0, 7, 0, 9, 7, 9, 'woodRed'); v.box(1, 8, 1, 8, 8, 8, 'roofPink');
  v.box(1, 8, 0, 1, 16, 0, 'woodRed'); v.box(8, 8, 0, 8, 16, 0, 'woodRed');
  for (let y = 10; y <= 16; y++) for (let x = 1; x <= 8; x++) { const hx = (x - 4.5) / 3.6, hy = (y - 13.2) / 3; const h = (hx * hx + hy * hy - 1) ** 3 - hx * hx * (-hy) ** 3; if (h <= 0) v.set(x, y, 0, 'roofPink'); }
}, null, { decor: true, seat: [0, 0.8, 0] });
// c_slott – small complete castle (picture / icon model, e.g. Kongeposten), 1/16
D('c_slott', [26, 30, 16], 1 / 16, (v) => {
  v.box(0, 0, 0, 25, 1, 15, 'grass');
  v.box(4, 2, 3, 21, 16, 12, 'stone'); for (let x = 4; x <= 21; x += 2) v.set(x, 17, 12, 'stone');
  for (let y = 2; y <= 16; y++) if ((y & 3) === 0) v.box(4, y, 12, 21, y, 12, 'stone2');
  v.box(11, 2, 13, 14, 7, 13, 'woodRed'); v.box(12, 8, 13, 13, 8, 13, 'woodRed');
  for (const [x, y] of [[6, 10], [18, 10], [8, 4], [16, 4]]) { v.box(x, y, 13, x + 1, y + 2, 13, 'glass'); }
  for (let i = 0; i < 6; i++) v.box(6 + i, 17 + i, 4, 19 - i, 17 + i, 11, 'roofPink');
  for (const [tx, roof] of [[3, 'roofLilac'], [22, 'roofBlue']]) { v.cyl(tx, 2, 7.5, 2.8, 18, 'stone'); v.cone(tx, 20, 7.5, 3.4, 8, roof); v.set(tx, 28, 7.5, 'gold'); v.set(tx, 29, 7.5, 'rose'); }
  v.box(12, 23, 7, 13, 26, 8, 'stone'); v.cone(12.5, 27, 7.5, 1.8, 3, 'roofLilac');
  v.box(10, 12, 13, 15, 14, 13, 'roofPink'); v.set(12, 13, 14, 'gold'); v.set(13, 13, 14, 'gold');
}, null, { group: 'castle', icon: true });

// c_maleri – framed painting (opts {k:'blomst'|'hav'|'katt'|'slott'}), hangs on a wall (front +z)
D('c_maleri', [20, 16, 2], 1 / 16, (v, o) => {
  const k = (o && o.k) || 'blomst';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) { const fr = x < 1 || x > 18 || y < 1 || y > 14; v.set(x, y, 0, fr ? (((x + y) % 3) ? 'gold' : 'honey') : (y < 5 ? 'leaf2' : 'sky')); }
  if (k === 'blomst') { for (const [x, c] of [[5, 'rose'], [10, 'butter'], [14, 'lavender']]) { v.box(x, 4, 1, x, 8, 1, 'leaf'); glyph(v, PLUS, x - 1, 11, 1, c); v.set(x, 10, 1, 'yellow'); } }
  if (k === 'hav') { v.box(1, 1, 1, 18, 5, 1, 'water'); for (let x = 2; x < 18; x += 3) v.set(x, 5, 1, 'white'); v.box(7, 6, 1, 11, 6, 1, 'woodRed'); v.box(9, 7, 1, 9, 11, 1, 'woodDark'); v.box(10, 8, 1, 12, 10, 1, 'white'); v.set(15, 12, 1, 'yellow'); v.set(16, 12, 1, 'yellow'); }
  if (k === 'katt') { v.ellipsoid(10, 6, 1, 4, 3, 0.5, 'orange'); v.box(7, 8, 1, 9, 10, 1, 'orange'); v.set(7, 11, 1, 'orange'); v.set(9, 11, 1, 'orange'); v.set(7, 9, 1, 'black'); v.set(9, 9, 1, 'black'); v.set(8, 8, 1, 'pink'); v.line(14, 5, 1, 16, 8, 1, 'orange'); }
  if (k === 'slott') { v.box(6, 4, 1, 13, 9, 1, 'stone'); for (const x of [5, 14]) { v.box(x, 4, 1, x, 11, 1, 'stone'); v.set(x, 12, 1, 'roofPink'); } v.box(8, 10, 1, 11, 11, 1, 'roofPink'); v.box(9, 4, 1, 10, 6, 1, 'woodRed'); }
}, null, { decor: true, wall: true, variants: { k: ['blomst', 'hav', 'katt', 'slott'] } });
// c_peis – cozy fireplace with a warm (glowing) fire, mantel candles and a heart guard (never scary)
D('c_peis', [22, 22, 8], 1 / 10, (v) => {
  v.box(0, 0, 0, 21, 15, 4, 'brick'); v.paint((x, y, z, c) => c === F.PAL.brick && (y % 3 === 0 || (x + ((y / 3) | 0) * 2) % 5 === 0) ? 'cream' : null);
  v.box(5, 1, 2, 16, 10, 4, 0); v.box(5, 1, 1, 16, 10, 1, 'woodDark');
  for (let y = 9; y <= 11; y++) for (let x = 5; x <= 16; x++) if ((x - 10.5) ** 2 / 36 + (y - 8) ** 2 / 9 > 1) v.set(x, y, 4, 'brick');
  v.box(6, 1, 2, 15, 1, 3, 'woodRed'); v.box(7, 2, 2, 14, 2, 3, 'wood');                       // logs
  for (const [x, h] of [[8, 4], [10, 6], [11, 7], [13, 4], [9, 5], [12, 5]]) for (let y = 3; y < 3 + h; y++) v.set(x, y, 2 + (y & 1), y > 2 + h - 2 ? 'glowYellow' : (y > 4 ? 'flame' : 'orange'));
  v.box(-1, 16, 0, 22, 16, 6, 'woodRed'); v.box(0, 15, 5, 21, 15, 5, 'woodRed');                 // mantel
  candle(v, 3, 17, 3, 2, 'cream'); candle(v, 18, 17, 3, 2, 'blossom'); v.box(9, 17, 2, 12, 19, 2, 'gold'); v.box(10, 18, 3, 11, 18, 3, 'cream');
  for (let x = 4; x <= 17; x++) v.set(x, 1, 6, 'gold'); for (let x = 4; x <= 17; x += 3) v.box(x, 2, 6, x, 5, 6, 'gold');  // low guard
  glyph(v, HEART3, 9, 5, 6, 'roofPink');
  v.box(0, 0, 5, 21, 0, 7, 'stone2');
}, null, { decor: true, wall: true, glow: 'fire' });
// c_vase – tall floor vase with flowers
D('c_vase', [12, 26, 12], 1 / 16, (v) => {
  for (let y = 0; y <= 13; y++) { const r = 2.6 + Math.sin(y / 13 * Math.PI) * 2.4 - (y > 11 ? 0.8 : 0); ringY(v, 6, y, 6, 0, r, y % 5 === 2 ? 'gold' : 'roofBlue'); }
  v.paint((x, y, z, c) => c === F.PAL.roofBlue && (x + y * 2 + z) % 7 === 0 ? 'white' : null);
  for (const [dx, dz, h, c] of [[0, 0, 11, 'rose'], [-2, 1, 9, 'butter'], [2, -1, 10, 'blossom'], [1, 2, 8, 'lavender'], [-1, -2, 9, 'white']]) { v.line(6, 13, 6, 6 + dx, 13 + h, 6 + dz, 'leaf'); v.sphere(6 + dx, 14 + h, 6 + dz, 1.3, c); v.set(6 + dx, 14 + h, 6 + dz, 'yellow'); }
}, null, { decor: true });
// c_tallerkenhylle – wall shelf with plates and cups (dining room / kitchen)
D('c_tallerkenhylle', [28, 18, 6], 1 / 16, (v) => {
  for (const y of [0, 8]) { v.box(0, y, 0, 27, y, 5, 'woodRed'); v.box(0, y, 5, 27, y, 5, 'wood'); }
  v.box(0, 0, 0, 0, 16, 1, 'woodRed'); v.box(27, 0, 0, 27, 16, 1, 'woodRed'); v.box(0, 16, 0, 27, 16, 2, 'woodRed');
  for (let i = 0; i < 4; i++) { discZ(v, 4 + i * 6.5, 4.5, 1, 3, i & 1 ? 'white' : 'milk'); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; v.set(Math.round(4 + i * 6.5 + Math.cos(a) * 2.6), Math.round(4.5 + Math.sin(a) * 2.6), 2, ['roofBlue', 'rose', 'mint', 'lavender'][i]); } }
  for (let i = 0; i < 5; i++) { const x = 3 + i * 5; v.box(x, 9, 2, x + 2, 11, 3, ['pink', 'sky', 'butter', 'mint', 'lilac'][i]); v.set(x + 3, 10, 2, ['pink', 'sky', 'butter', 'mint', 'lilac'][i]); }
}, null, { decor: true, wall: true });

})();
