/* Feslottet – MODELS-1: castle exterior (scale 1/2 m) + learning-tower segments.
   All ids prefixed c_. Palette NAMES only. Front faces +z (south / the forecourt). Origin = bottom centre of each grid.

   ASSEMBLY (castle centre 0,0; footprint 56 x 40 m):
     F.CastleKit.layout  -> [{id, x, y, z, ry, opts, name}]  (metres, castle-local; ry radians)
     F.CastleKit.build() -> THREE.Group 'castle' with userData {parts:{bridge, facade}, keep, gate, objs:{name:obj}}
       bridge : drawbridge pivot (in c_porthus). rotation.x = 0 raised, +PI/2 lowered (deck top 0.5 m, reaches z = 26 m).
       facade / facadeR : the keep front opens like a dollhouse cabinet (double doors, 16 m each). facade (west half, hinge on
                the west edge) rotation.y = -1.45, facadeR (east half, hinge east edge) rotation.y = +1.45 -> both swing ~83 deg
                outward without hitting the south wall, revealing 15 painted dollhouse room boxes (cosmetic).
     F.CastleKit.beaconTop -> [x, y, z] top of the tall tower (for the rainbow beacon).
     F.CastleKit.gateFront -> [x, z] where the lowered bridge ends (outside), F.CastleKit.gateInside -> [x, z] courtyard side.
   Heights (diorama, camera-friendly): walls 7 m, corner towers 16-17 m, gatehouse 8 m (+turrets 13 m), keep 16 m (+roof 23.5 m),
   tall centre tower top 38 m.
   Defs: c_borg (keep, parts facade), c_tarn_sv c_tarn_so c_tarn_nv c_tarn_no (corner towers), c_tarn_hoy (tall centre tower),
         c_mur_sor c_mur_side c_mur_nord (wall segments, opts {banner:'pink'|'blue'|...}), c_porthus (gatehouse, part bridge),
         c_vindebru (stand-alone drawbridge, part bridge – same hinge rules),
         learning towers (scale 1/4 so one floor = exactly 0.75 m): c_laere_base, c_laere_etasje, c_laere_gull, c_laere_tak
         (opts {kind:'tall'|'les'|'skriv'}; base 2 m tall, floor 0.75 m, roof part 'arm' waves, part 'figur' = figurine). */
(function () {
'use strict';
const F = window.F, V = F.VOX;
const P = () => F.PAL;
const H2 = (a, b, c) => F.U.hash2(a, b, c);

/* ------------------------------------------------------------ helpers */
// stone block texture on 'stone' voxels (bricks 4x2 cells, staggered)
function stoneTex(v, seed) {
  const S = P().stone;
  v.paint((x, y, z, c) => {
    if (c !== S) return null;
    const row = y >> 1, off = (row & 1) * 2;
    const h = H2(Math.floor((x + off) / 4) * 7 + Math.floor((z + off) / 4) * 13, row, seed || 5);
    return h < 0.2 ? 'stone2' : h > 0.94 ? 'cream' : null;
  });
}
const ROOFS = { pink: ['roofPink', 'pink'], lilac: ['roofLilac', 'lavender'], blue: ['roofBlue', 'sky'], mint: ['roofMint', 'mint'] };
function roofTex(v, kind, y0) {
  const [a, b] = ROOFS[kind]; const A = P()[a];
  v.paint((x, y, z, c) => {
    if (c !== A || y < y0) return null;
    // horizontal shingle rows; every 3rd row lighter, with scalloped offsets
    const r = (y - y0) % 3;
    if (r === 2 && ((x + z + y) & 1)) return b;
    return null;
  });
}
// small pixel emblems drawn on a face (plane z = zf, facing +z)
const EMB = {
  heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  star: ['..X..', 'XXXXX', '.XXX.', '.X.X.'],
  crown: ['X.X.X', 'XXXXX', 'XXXXX'],
  flower: ['.X.', 'XXX', '.X.'],
  heart3: ['X.X', 'XXX', '.X.'],
  star3: ['.X.', 'XXX', '.X.'],
};
function emblem(v, kind, x0, ytop, zf, c) {
  const rows = EMB[kind];
  rows.forEach((row, i) => { for (let j = 0; j < row.length; j++) if (row[j] === 'X') v.set(x0 + j, ytop - i, zf, c); });
}
// hanging banner on +z face: rod at y=top, cloth w wide L long, V-notch bottom, emblem
function banner(v, x0, top, w, L, zf, cloth, emb, embC) {
  v.box(x0 - 1, top, zf, x0 + w, top, zf, 'gold');
  v.box(x0, top - L + 1, zf, x0 + w - 1, top - 1, zf, cloth);
  // V notch
  const mid = (w - 1) / 2;
  for (let x = x0; x < x0 + w; x++) if (Math.abs(x - x0 - mid) < 0.6 * (w / 4)) v.set(x, top - L + 1, zf, 0);
  v.box(x0, top - 2, zf, x0 + w - 1, top - 2, zf, 'gold');
  if (emb) emblem(v, emb, x0 + Math.floor((w - EMB[emb][0].length) / 2), top - (EMB[emb].length > 3 ? 4 : 3), zf, embC || 'white');
}
// arched window on a flat +z face: surface layer zf gets glass+frame, layer behind gets the pane colour
function flatWin(v, x0, y0, w, h, zf, o) {
  o = o || {};
  const back = o.back === undefined ? 'navySoft' : o.back, frame = o.frame || 'white', depth = o.depth || 1;
  const inside = (x, y) => {
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
    if (w >= 3 && y === y0 + h - 1 && (x === x0 || x === x0 + w - 1)) return false; // rounded top corners
    return true;
  };
  for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
    if (inside(x, y)) {
      v.set(x, y, zf, 'glass');
      for (let d = 1; d <= depth; d++) v.set(x, y, zf - d, back);
    } else if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) v.set(x, y, zf, frame);
  }
  // mullion cross for big windows
  if (w >= 5 && !o.noCross) { const mx = x0 + Math.floor(w / 2); for (let y = y0; y < y0 + h; y++) if (inside(mx, y)) v.set(mx, y, zf, frame); const my = y0 + Math.floor(h * 0.45); for (let x = x0; x < x0 + w; x++) if (inside(x, my)) v.set(x, my, zf, frame); }
  if (o.sill) v.box(x0 - 1, y0 - 1, zf + 1, x0 + w, y0 - 1, zf + 1, o.sill);
  if (o.shutters) { v.box(x0 - 2, y0, zf + 1, x0 - 2, y0 + h - 2, zf + 1, o.shutters); v.box(x0 + w + 1, y0, zf + 1, x0 + w + 1, y0 + h - 2, zf + 1, o.shutters); }
  if (o.flowers) { v.box(x0 - 1, y0 - 2, zf + 1, x0 + w, y0 - 2, zf + 2, 'woodRed'); for (let x = x0 - 1; x <= x0 + w; x++) v.set(x, y0 - 1, zf + 2, (x & 1) ? o.flowers : 'leaf'); }
}
// window on a round tower surface: centre angle ang (atan2(dz,dx); front = PI/2)
function towerWin(v, cx, cz, R, ang, y0, h, w, o) {
  o = o || {};
  const [sx, , sz] = v.size;
  for (let y = y0 - 1; y <= y0 + h; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
    if (r > R + 0.6 || r < R - 2.6 || !v.get(x, y, z)) continue;
    let da = Math.atan2(dz, dx) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const s = da * R; if (Math.abs(s) > w / 2 + 1.1) continue;
    const top = y === y0 + h - 1;
    const inside = y >= y0 && y < y0 + h && Math.abs(s) <= (top ? 0.55 : w / 2);
    if (r > R - 1.1) { if (inside) v.set(x, y, z, o.glass || 'glass'); else v.set(x, y, z, o.frame || 'white'); }
    else if (inside) v.set(x, y, z, o.back || 'navySoft');
  }
}
// crenellation ring on a round top
function merlonRing(v, cx, cz, r0, r1, y0, h, n, c) {
  const [sx, , sz] = v.size;
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const r = Math.hypot(x - cx, z - cz); if (r > r1 + 0.3 || r < r0 - 0.3) continue;
    const a = (Math.atan2(z - cz, x - cx) + Math.PI) / (2 * Math.PI);
    if (Math.floor(a * n * 2) % 2 === 0) v.box(x, y0, z, x, y0 + h - 1, z, c);
  }
}
// finial: gold ball + pole + pennant flag (facing +z, waving to +x)
function finial(v, cx, y0, cz, poleH, flagC) {
  v.set(cx, y0, cz, 'gold'); v.set(cx, y0 + 1, cz, 'gold');
  v.box(cx, y0 + 2, cz, cx, y0 + 1 + poleH, cz, 'white');
  if (flagC) { const ft = y0 + 1 + poleH; v.box(cx + 1, ft - 2, cz, cx + 4, ft, cz, flagC); v.set(cx + 5, ft - 1, cz, flagC); v.set(cx + 4, ft - 2, cz, 0); }
}

/* ------------------------------------------------------------ towers (scale 1/2) */
function tower(v, o) {
  const [S, Hh] = v.size; const c = (S - 1) / 2, R = o.R, hb = o.hb;
  v.cyl(c, 0, c, R + 1, 3, 'stone2');               // plinth
  v.cyl(c, 3, c, R, hb - 3, 'stone');               // body
  // string course
  v.cyl(c, Math.floor(hb * 0.5), c, R + 0.6, 1, 'stone2');
  stoneTex(v, o.seed || 3);
  // windows: front + sides, two levels
  const lv = o.levels || [Math.floor(hb * 0.25), Math.floor(hb * 0.62)];
  for (const y of lv) for (const a of (o.angles || [Math.PI / 2, Math.PI / 2 + 1.25, Math.PI / 2 - 1.25, -Math.PI / 2])) towerWin(v, c, c, R, a, y, 5, 3, { frame: o.frame || 'white' });
  if (o.heartWin) towerWin(v, c, c, R, Math.PI / 2, hb - 7, 3, 3, { glass: 'crystal', frame: 'gold' });
  let y = hb;
  if (o.style === 'battlement') {
    v.cyl(c, y, c, R + 1.4, 2, 'stone2'); y += 2;                  // corbels
    merlonRing(v, c, c, R + 0.4, R + 1.4, y, 2, o.merlons || 8, 'stone');
    v.cyl(c, y, c, R - 0.5, 1, 'stone2');
    const rc = R - 0.5; v.cone(c, y, c, rc, o.hr, ROOFS[o.roof][0]); roofTex(v, o.roof, y);
    finial(v, Math.round(c), y + o.hr, Math.round(c), o.pole || 5, o.flag);
  } else {
    // eaves: overhanging cone roof (witch-hat but friendly) + a little gold band
    v.cyl(c, y, c, R + 0.5, 1, 'stone2'); y += 1;
    v.cyl(c, y, c, R + 2, 1, 'gold');
    v.cone(c, y + 1, c, R + 2, o.hr, ROOFS[o.roof][0]); roofTex(v, o.roof, y + 1);
    // small dormer window on the roof front
    const dz = Math.round(c + (R + 2) * 0.66), dy = y + Math.round(o.hr * 0.3);
    v.box(Math.round(c) - 1, dy, dz - 1, Math.round(c) + 1, dy + 2, dz, 'cream'); v.set(Math.round(c), dy, dz + 1, 'glass'); v.set(Math.round(c), dy + 1, dz + 1, 'glass');
    v.box(Math.round(c) - 2, dy + 3, dz - 1, Math.round(c) + 2, dy + 3, dz + 1, ROOFS[o.roof][0]); v.box(Math.round(c) - 1, dy + 4, dz - 1, Math.round(c) + 1, dy + 4, dz, ROOFS[o.roof][0]);
    finial(v, Math.round(c), y + 1 + o.hr, Math.round(c), o.pole || 5, o.flag);
  }
  if (o.balcony) {             // gold-railed balcony ring with a door
    const by = o.balcony;
    v.cyl(c, by, c, R + 2, 1, 'stone2');
    merlonRing(v, c, c, R + 1.5, R + 2.2, by + 1, 1, 18, 'gold');
    towerWin(v, c, c, R, Math.PI / 2, by + 1, 6, 3, { back: 'woodRed', glass: 'woodRed', frame: 'gold' });
  }
  if (o.vine) {                // climbing roses up the front (flowers, not forest)
    for (let yy = 3; yy < hb - 4; yy++) {
      const a = Math.PI / 2 + 0.9 + Math.sin(yy * 0.35) * 0.25;
      const x = Math.round(c + Math.cos(a) * (R + 0.6)), z = Math.round(c + Math.sin(a) * (R + 0.6));
      v.set(x, yy, z, (yy % 4 === 0) ? 'rose' : (yy % 4 === 2 ? 'blossom' : 'leaf'));
    }
  }
}
const TOWERS = {   // diorama heights: corner towers ~17 m, tall centre tower ~22 m on top of the 16 m keep
  c_tarn_sv: { R: 8, hb: 18, hr: 14, roof: 'pink', style: 'eaves', flag: 'rose', vine: true, size: [21, 46, 21], seed: 11, heartWin: true, levels: [4] },
  c_tarn_so: { R: 8, hb: 17, hr: 14, roof: 'blue', style: 'eaves', flag: 'sky', balcony: 10, size: [21, 46, 21], seed: 12, levels: [3] },
  c_tarn_nv: { R: 7, hb: 20, hr: 13, roof: 'lilac', style: 'battlement', flag: 'lavender', size: [19, 46, 19], seed: 13, levels: [4, 12] },
  c_tarn_no: { R: 7, hb: 19, hr: 13, roof: 'pink', style: 'battlement', flag: 'rose', size: [19, 46, 19], seed: 14, vine: true, levels: [4, 11] },
  c_tarn_hoy: { R: 6, hb: 20, hr: 16, roof: 'lilac', style: 'eaves', flag: 'gem1', size: [17, 46, 17], seed: 15, balcony: 11,
    levels: [13], angles: [Math.PI / 2 + 1.6, Math.PI / 2 - 1.6, -Math.PI / 2], pole: 4 },
};
for (const id in TOWERS) {
  const t = TOWERS[id];
  V.def(id, { size: t.size, scale: 1 / 2, build(v) { tower(v, t); }, meta: { group: 'castle', kind: 'tower', heightM: (t.hb + t.hr + 10) / 2 } });
}

/* ------------------------------------------------------------ walls (scale 1/2), grid depth 6: plinth z0/z5, core z1..4 */
function wall(v, o) {
  const [L, Hh, D] = v.size; const top = Hh - 1;
  v.box(0, 0, 0, L - 1, 2, D - 1, 'stone2');                   // plinth both sides
  v.box(0, 3, 1, L - 1, top - 4, D - 2, 'stone');              // core
  v.box(0, top - 3, 0, L - 1, top - 3, D - 1, 'stone2');       // corbel band (both faces)
  v.box(0, top - 2, 0, L - 1, top - 2, D - 1, 'stone');        // walkway + parapet base
  for (let x = 0; x < L; x++) {                                // merlons outer + inner
    if (((x + 1) >> 1) % 2 === 0) v.box(x, top - 1, D - 1, x, top, D - 1, 'stone');
    if (((x + 1) >> 1) % 2 === 0) v.box(x, top - 1, 0, x, top, 0, 'stone');
  }
  stoneTex(v, o.seed || 7);
  // outer face (+z, surface z=D-2 -> decorations at z=D-1)
  const n = Math.max(1, Math.round(L / 13)), step = L / n;
  for (let i = 0; i < n; i++) {
    const cx = Math.round(step * (i + 0.5));
    if (o.banner && i % 2 === 0) banner(v, cx - 2, top - 4, 5, 8, D - 1, o.banner === 'mix' ? (i % 4 === 0 ? 'roofPink' : 'roofBlue') : o.banner, (i % 4 === 0) ? 'heart3' : 'star3', 'butter');
    else flatWin(v, cx - 1, 5, 3, 4, D - 2, { sill: 'stone2', flowers: (i & 1) ? 'rose' : 'butter' });
  }
  // inner face (-z): small windows
  for (let i = 0; i < n; i++) { const cx = Math.round(step * (i + 0.5)); for (let y = 5; y < 9; y++) { v.set(cx, y, 1, y === 8 ? 'stone2' : 'navySoft'); } }
}
V.def('c_mur_sor', { size: [30, 14, 6], scale: 1 / 2, build(v, o) { wall(v, { banner: o.banner || 'mix', seed: 21 }); }, meta: { group: 'castle', kind: 'wall', variants: { banner: ['roofPink', 'roofBlue', 'mix'] } } });
V.def('c_mur_side', { size: [52, 14, 6], scale: 1 / 2, build(v, o) { wall(v, { banner: o.banner || 'roofLilac', seed: 22 }); }, meta: { group: 'castle', kind: 'wall' } });
V.def('c_mur_nord', { size: [42, 14, 6], scale: 1 / 2, build(v, o) { wall(v, { banner: o.banner || 'roofPink', seed: 23 }); }, meta: { group: 'castle', kind: 'wall' } });

/* ------------------------------------------------------------ gatehouse + drawbridge (scale 1/2)
   grid [28, 46, 11]: body z 0..8, front face at z = 9; gate opening x 10..17, y 1..11 (+arch); bridge raised at z 9, hinge y=1 */
const GX0 = 9, GX1 = 18; // bridge spans x 9..18 (10 cells = 5 m)
function bridgeVox(v, x0, x1, z) {
  for (let y = 1; y <= 15; y++) for (let x = x0; x <= x1; x++) v.set(x, y, z, (x - x0) % 3 === 2 ? 'woodDark' : ((y * 7 + x) % 5 === 0 ? 'woodLight' : 'wood'));
  for (const y of [3, 13]) v.box(x0, y, z, x1, y, z, 'steel');
  for (const x of [x0 + 1, x1 - 1]) v.set(x, 15, z + 1, 'steel');     // chain rings at the top
}
function gatehouse(v, withBridge) {
  const W = 28;
  v.box(1, 0, 0, W - 2, 2, 9, 'stone2');
  v.box(2, 3, 1, W - 3, 16, 8, 'stone');
  v.box(1, 17, 0, W - 2, 17, 9, 'stone2');
  for (let x = 1; x < W - 1; x++) if (((x + 1) >> 1) % 2 === 0) { v.box(x, 18, 9, x, 19, 9, 'stone'); v.box(x, 18, 0, x, 19, 0, 'stone'); }
  // flanking turrets
  for (const tx of [4.5, W - 5.5]) {
    v.cyl(tx, 0, 6, 4.2, 3, 'stone2'); v.cyl(tx, 3, 6, 3.6, 19, 'stone');
    v.cyl(tx, 22, 6, 4.4, 1, 'gold'); v.cone(tx, 23, 6, 4.4, 8, 'roofBlue');
    v.set(Math.round(tx), 31, 6, 'gold'); v.set(Math.round(tx), 32, 6, 'gold');
  }
  stoneTex(v, 31);
  roofTex(v, 'blue', 23);
  for (const tx of [4.5, W - 5.5]) { towerWin(v, tx, 6, 3.6, Math.PI / 2, 6, 4, 1, {}); towerWin(v, tx, 6, 3.6, Math.PI / 2, 14, 4, 1, {}); }
  // gate opening through the whole depth (arched)
  const g0 = 10, g1 = 17, gm = (g0 + g1) / 2;
  for (let y = 1; y <= 13; y++) for (let x = g0; x <= g1; x++) {
    const top = y > 9 ? ((x - gm) / 4.2) ** 2 + ((y - 9) / 4.2) ** 2 > 1 : false;
    if (!top) v.box(x, y, 0, x, y, 9, 0);
  }
  v.box(g0, 0, 0, g1, 0, 9, 'pathStone');                        // threshold floor
  // arch voussoirs
  for (let y = 1; y <= 14; y++) for (let x = g0 - 1; x <= g1 + 1; x++) {
    if (v.get(x, y, 8)) { const q = ((x - gm) / 5.2) ** 2 + ((Math.max(0, y - 9)) / 5.2) ** 2; if (q <= 1 && (x < g0 || x > g1 || y > 9)) v.set(x, y, 8, 'stone2'); }
  }
  // crest standing on the battlement above the gate: pink shield with a gold crown
  v.box(11, 18, 8, 16, 22, 9, 'roofPink'); v.box(12, 17, 9, 15, 17, 9, 'roofPink'); v.box(12, 23, 8, 15, 23, 9, 'roofPink');
  emblem(v, 'crown', 11, 22, 10, 'gold'); v.set(16, 22, 10, 0); v.set(13, 20, 10, 'gem1'); v.set(14, 20, 10, 'gem2');
  // chain slots + chain stubs
  for (const x of [GX0 + 1, GX1 - 1]) { v.set(x, 16, 9, 'navySoft'); v.set(x, 16, 10, 'steel'); }
  // lanterns either side of the gate
  for (const x of [g0 - 3, g1 + 3]) { v.set(x, 8, 9, 'gold'); v.set(x, 9, 10, 'gold'); v.set(x, 10, 10, 'lamp'); v.set(x, 11, 10, 'gold'); }
  // flower pots
  for (const x of [g0 - 2, g1 + 2]) { v.set(x, 3, 9, 'woodRed'); v.set(x, 4, 9, 'leaf'); v.set(x, 5, 9, 'rose'); }
  if (withBridge) bridgeVox(v, GX0, GX1, 10);
}
V.def('c_porthus', { size: [28, 34, 12], scale: 1 / 2,
  build(v) { gatehouse(v, false); },
  parts: { bridge: { pivot: [13.5, 1, 10], build(v) { bridgeVox(v, GX0, GX1, 10); } } },
  meta: { group: 'castle', kind: 'gate', anim: { bridge: 'rotation.x 0 (raised) -> +PI/2 (lowered, deck top 0.5 m, 7.5 m long)' }, frontM: 1, gateWidthM: 4 } });
// stand-alone drawbridge (if the gate is static and the bridge is its own Thing); origin below the hinge line
V.def('c_vindebru', { size: [12, 17, 4], scale: 1 / 2,
  build(v) { v.box(0, 0, 0, 11, 0, 1, 'stone2'); v.box(0, 16, 0, 0, 16, 1, 'steel'); v.box(11, 16, 0, 11, 16, 1, 'steel'); },
  parts: { bridge: { pivot: [6, 1, 2], build(v) { bridgeVox(v, 1, 10, 2); } } },
  meta: { group: 'castle', anim: { bridge: 'rotation.x +PI/2 lowers it toward +z' } } });

/* ------------------------------------------------------------ keep (scale 1/2) with dollhouse room boxes behind a hinged facade
   grid [64, 62, 31]: walls x 0..63, back z 0..1, facade z 28..29 (part), roof overhang z 30. floors: slabs y 0, 13, 26, 39..40 */
const KEEP_ROOMS = [
  ['kjokken', 'spisesal', 'hallen', 'tronsal', 'ballsal'],
  ['bibliotek', 'musikk', 'heis', 'skatt', 'ordmuseum'],
  ['prinsesse', 'soverom', 'heis', 'bad', 'garderobe'],
];
const RC = { // wall, wall2 (pattern), floor, floor2
  kjokken: ['butter', 'cream', 'cream', 'peach'], spisesal: ['peach', 'coral', 'woodLight', 'wood'], hallen: ['cream2', 'stone2', 'pathStone', 'stone2'],
  tronsal: ['lavender', 'lilac', 'stone', 'roofRed'], ballsal: ['blossom', 'white', 'white', 'pink'], bibliotek: ['mint', 'teal', 'wood', 'woodDark'],
  musikk: ['sky', 'white', 'woodLight', 'wood'], heis: ['cream2', 'gold', 'pathStone', 'stone2'], skatt: ['butter', 'honey', 'stone2', 'gold'],
  ordmuseum: ['lilac', 'white', 'woodLight', 'woodRed'], prinsesse: ['blossom', 'pink', 'lavender', 'lilac'], soverom: ['sky', 'lavender', 'woodLight', 'woodRed'],
  bad: ['ice', 'mint', 'white', 'mint'], garderobe: ['peach', 'lilac', 'lilac', 'lavender'],
};
const KX = c => [2 + 12 * c, 12 + 12 * c];      // room x range (inclusive)
const KY = f => [1 + 10 * f, 9 + 10 * f];       // room y range above slab (rooms 4.5 m)
function keepRoomBox(v, key, x0, x1, y0, y1) {
  const [w1, w2, f1, f2] = RC[key];
  // back wall pattern (z=2..3), floor (slab top y0-1)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) v.set(x, y, 2, ((x + (y >> 1)) % 4 === 0 && y > y0 + 2) ? w2 : w1);
  for (let y = y0; y <= y0 + 1; y++) for (let x = x0; x <= x1; x++) v.set(x, y, 2, 'woodLight'); // wainscot
  for (let z = 3; z <= 27; z++) for (let x = x0; x <= x1; x++) v.set(x, y0 - 1, z, ((x + z) & 1) ? f1 : f2);
  // ceiling lamp (glow) hanging
  const cx = Math.round((x0 + x1) / 2);
  v.set(cx, y1, 14, 'gold'); v.set(cx, y1 - 1, 14, 'lamp'); v.set(cx - 1, y1 - 1, 14, 'lamp'); v.set(cx + 1, y1 - 1, 14, 'lamp');
  // window in the back wall
  for (let y = y0 + 3; y <= y0 + 6; y++) for (let x = cx - 1; x <= cx + 1; x++) v.set(x, y, 2, y === y0 + 6 && x !== cx ? w1 : 'sky');
  v.box(cx - 2, y0 + 2, 3, cx + 2, y0 + 2, 3, 'white');
  // furniture hints (0.5 m voxels)
  const fy = y0;
  switch (key) {
    case 'kjokken': v.box(x0 + 1, fy, 3, x0 + 3, fy + 2, 5, 'coral'); v.set(x0 + 2, fy + 1, 6, 'navySoft'); v.box(x0 + 1, fy + 3, 3, x0 + 1, fy + 6, 3, 'steel'); v.box(x1 - 4, fy, 12, x1 - 1, fy + 1, 15, 'woodLight'); v.set(x1 - 3, fy + 2, 13, 'red'); break;
    case 'spisesal': v.box(x0 + 2, fy, 10, x1 - 2, fy + 1, 14, 'white'); for (let x = x0 + 3; x < x1 - 2; x += 2) v.set(x, fy + 2, 12, 'flame'); break;
    case 'hallen': for (let i = 0; i < 6; i++) v.box(x0 + i, fy, 3, x0 + i, fy + i, 6, 'roofRed'); v.box(cx - 1, fy, 3, cx + 1, fy + 4, 3, 'woodDark'); v.box(cx - 1, fy + 5, 3, cx + 1, fy + 5, 3, 'gold'); break;
    case 'tronsal': v.box(cx - 1, fy, 4, cx + 1, fy + 3, 5, 'gold'); v.box(cx, fy, 6, cx, fy + 1, 6, 'roofPink'); v.box(cx - 1, fy - 1, 6, cx + 1, fy - 1, 27, 'roofRed'); break;
    case 'ballsal': v.box(cx - 1, y1 - 3, 13, cx + 1, y1 - 2, 15, 'crystal'); v.set(cx, y1 - 4, 14, 'lamp'); v.box(x0 + 1, fy, 4, x0 + 2, fy + 3, 5, 'gold'); break;
    case 'bibliotek': for (let x = x0; x <= x1; x++) for (let y = fy; y <= fy + 7; y++) v.set(x, y, 3, y % 3 === 2 ? 'woodDark' : ['rose', 'sky', 'butter', 'mint', 'lilac', 'coral'][(x * 3 + y) % 6]); break;
    case 'musikk': v.box(x0 + 2, fy, 6, x0 + 5, fy + 2, 9, 'navySoft'); v.box(x0 + 2, fy + 2, 9, x0 + 5, fy + 2, 9, 'white'); v.box(x1 - 3, fy, 5, x1 - 2, fy + 4, 5, 'gold'); break;
    case 'heis': v.box(cx - 2, fy, 3, cx + 2, fy + 6, 4, 'gold'); v.box(cx - 1, fy, 4, cx + 1, fy + 5, 4, 'glass'); break;
    case 'skatt': v.box(x0 + 2, fy, 5, x0 + 4, fy + 1, 7, 'woodRed'); v.box(x0 + 2, fy + 2, 5, x0 + 4, fy + 2, 7, 'gold'); v.box(x1 - 4, fy, 6, x1 - 2, fy, 8, 'gold'); v.box(x1 - 3, fy + 1, 7, x1 - 3, fy + 2, 7, 'gold'); break;
    case 'ordmuseum': for (let x = x0 + 1; x < x1; x += 3) { v.box(x, fy, 6, x, fy + 1, 6, 'white'); v.set(x, fy + 2, 6, ['rose', 'butter', 'sky', 'mint'][x % 4]); } break;
    case 'prinsesse': v.box(x0 + 1, fy, 4, x0 + 5, fy + 1, 8, 'pink'); v.box(x0 + 1, fy + 2, 4, x0 + 5, fy + 3, 4, 'roofPink'); v.set(x0 + 2, fy + 2, 5, 'white'); break;
    case 'soverom': v.box(cx - 3, fy, 4, cx + 3, fy + 1, 9, 'white'); v.box(cx - 3, fy + 2, 4, cx + 3, fy + 2, 9, 'lavender'); for (const x of [cx - 3, cx + 3]) v.box(x, fy, 4, x, fy + 6, 4, 'woodRed'); v.box(cx - 3, fy + 6, 4, cx + 3, fy + 6, 6, 'roofLilac'); break;
    case 'bad': v.box(x0 + 2, fy, 4, x0 + 6, fy + 1, 7, 'white'); v.box(x0 + 3, fy + 1, 5, x0 + 5, fy + 1, 6, 'water'); v.set(x0 + 4, fy + 2, 5, 'yellow'); break;
    case 'garderobe': v.box(x0 + 1, fy + 5, 4, x1 - 1, fy + 5, 4, 'gold'); for (let x = x0 + 1; x < x1; x += 2) v.box(x, fy + 1, 4, x, fy + 4, 5, ['rose', 'sky', 'butter', 'mint', 'lilac'][x % 5]); break;
  }
}
// interior of the keep: slabs, dividers and the 15 painted room boxes (part 'rooms' – hide it while the facade is closed)
function keepRooms(v) {
  for (const y of [10, 20]) { v.box(2, y, 2, 61, y, 27, 'cream'); v.box(2, y, 27, 61, y, 27, 'white'); }
  v.box(2, 0, 3, 61, 0, 27, 'stone2');
  for (let c = 0; c < 4; c++) { const x = KX(c)[1] + 1; v.box(x, 1, 2, x, 29, 27, 'cream'); }
  KEEP_ROOMS.forEach((row, f) => row.forEach((key, c) => { const [x0, x1] = KX(c), [y0, y1] = KY(f); keepRoomBox(v, key, x0, x1, y0, y1); }));
}
function keepFacade(v) {
  // facade slab z 28..29, x 0..63, y 0..31
  v.box(0, 0, 28, 63, 31, 29, 'stone');
  v.box(0, 0, 28, 63, 2, 29, 'stone2');
  stoneTex(v, 41);
  for (const y of [10, 20]) v.box(0, y, 29, 63, y, 29, 'stone2');       // floor bands
  for (let x = 0; x < 64; x++) v.set(x, 30, 29, (x >> 1) & 1 ? 'roofPink' : 'white'); // pink-white frieze
  v.box(0, 31, 28, 63, 31, 29, 'stone2');
  // quoins at both edges
  for (let y = 3; y < 30; y++) { const q = (y >> 1) & 1; v.set(0, y, 29, q ? 'stone2' : 'cream'); v.set(1, y, 29, q ? 'stone2' : 'stone'); v.set(63, y, 29, q ? 'stone2' : 'cream'); v.set(62, y, 29, q ? 'stone2' : 'stone'); }
  // windows (see-through into the room boxes: layer 28 cleared behind glass)
  for (let f = 0; f < 3; f++) for (let c = 0; c < 5; c++) {
    if (c === 2) continue;
    const [x0, x1] = KX(c), cx = Math.round((x0 + x1) / 2), y0 = KY(f)[0] + 2;
    flatWin(v, cx - 2, y0, 5, 6, 29, { back: 0, sill: 'white', shutters: f === 1 ? 'roofBlue' : 'roofPink', flowers: f === 0 ? (c & 1 ? 'butter' : 'rose') : null, depth: 1, noCross: false });
  }
  // grand door (centre, ground floor) – arched, pink-red with gold studs
  const dc = 31.5;
  for (let y = 1; y <= 9; y++) for (let x = 27; x <= 36; x++) {
    const q = ((x - dc) / 4.6) ** 2 + ((Math.max(0, y - 5)) / 4.6) ** 2; if (q > 1) continue;
    v.set(x, y, 29, (q > 0.72) ? 'stone2' : (x === 31 || x === 32) ? 'woodDark' : 'woodRed'); v.set(x, y, 28, 'woodDark');
  }
  for (const [x, y] of [[29, 4], [34, 4], [29, 7], [34, 7], [30, 2], [33, 2]]) v.set(x, y, 30, 'gold');
  // balcony above the door (floor 1 centre)
  v.box(26, 11, 29, 37, 11, 30, 'stone2');
  for (let x = 26; x <= 37; x++) if (x % 2 === 0 || x === 37) v.set(x, 12, 30, 'gold');
  v.box(26, 13, 30, 37, 13, 30, 'gold');
  flatWin(v, 29, 12, 6, 7, 29, { back: 0, frame: 'gold', depth: 1 });
  // big crest (floor 2 centre): rose-window
  for (let y = 21; y <= 29; y++) for (let x = 26; x <= 37; x++) {
    const q = ((x - 31.5) / 5.4) ** 2 + ((y - 25) / 4.4) ** 2; if (q > 1) continue;
    v.set(x, y, 29, q > 0.7 ? 'gold' : (((x + y) & 1) ? 'crystal' : (q < 0.2 ? 'gem1' : 'glass')));
  }
  // banners
  banner(v, 14, 29, 4, 8, 30, 'roofLilac', 'star3', 'butter'); banner(v, 46, 29, 4, 8, 30, 'roofLilac', 'star3', 'butter');
}
function keepBody(v) {
  // outer shell (no front): back + sides, slabs, room boxes
  v.box(0, 0, 0, 63, 31, 1, 'stone');            // back wall
  v.box(0, 0, 0, 1, 31, 27, 'stone');            // west wall
  v.box(62, 0, 0, 63, 31, 27, 'stone');          // east wall
  v.box(0, 0, 0, 63, 2, 1, 'stone2'); v.box(0, 0, 0, 1, 2, 27, 'stone2'); v.box(62, 0, 0, 63, 2, 27, 'stone2');
  stoneTex(v, 42);
  // back/side windows outside
  for (let f = 0; f < 3; f++) {
    for (let c = 0; c < 5; c++) { const cx = Math.round((KX(c)[0] + KX(c)[1]) / 2); for (let y = KY(f)[0] + 2; y < KY(f)[0] + 7; y++) { v.set(cx, y, 0, 'navySoft'); v.set(cx + 1, y, 0, 'navySoft'); } }
    for (const z of [8, 20]) for (let y = KY(f)[0] + 2; y < KY(f)[0] + 7; y++) { v.set(0, y, z, 'navySoft'); v.set(63, y, z, 'navySoft'); v.set(0, y, z + 1, 'navySoft'); v.set(63, y, z + 1, 'navySoft'); }
  }
  v.box(2, 0, 2, 61, 0, 27, 'stone2'); v.box(2, 30, 2, 61, 31, 27, 'cream');      // ground + top slab (always present)
  // roof: gable along x, ridge at z 15, overhang z 30 front
  const R0 = 32;
  for (let i = 0; i <= 16; i++) {
    const y = R0 + i, za = i - 1, zb = 30 - i;
    if (za > zb) break;
    v.box(0, y, Math.max(0, za), 63, y, Math.max(0, za), 'roofPink'); v.box(0, y, Math.min(30, zb), 63, y, Math.min(30, zb), 'roofPink');
    if (zb - za > 1) { v.box(0, y, za + 1, 0, y, zb - 1, 'stone'); v.box(63, y, za + 1, 63, y, zb - 1, 'stone'); v.box(1, y, za + 1, 62, y, zb - 1, 'cream'); }
  }
  v.box(0, R0, 28, 63, R0, 30, 'roofPink'); // eave over facade
  roofTex(v, 'pink', R0);
  v.box(0, R0 + 15, 14, 63, R0 + 15, 16, 'gold');       // ridge
  // dormers on the front slope
  for (const dx of [8, 20, 44, 56]) {
    const dz = 24, dy = R0 + 5;
    v.box(dx - 2, dy, dz - 3, dx + 2, dy + 3, dz, 'cream'); v.set(dx, dy + 1, dz + 1, 'glass'); v.set(dx, dy + 2, dz + 1, 'glass'); v.set(dx - 1, dy + 1, dz + 1, 'white'); v.set(dx + 1, dy + 1, dz + 1, 'white');
    for (let k = 0; k < 4; k++) v.box(dx - 3 + k, dy + 4 + k, dz - 3, dx + 3 - k, dy + 4 + k, dz + 1, 'roofLilac');
  }
  // Stjernetårnet: little observatory with blue dome over col 1 (back slope so it does not hide the tall tower)
  const oy = R0 + 9;
  v.cyl(18, oy, 9, 4, 6, 'stone'); v.ellipsoid(18, oy + 6, 9, 4.4, 4, 4.4, 'roofBlue'); v.box(18, oy + 7, 13, 19, oy + 8, 15, 'gold'); v.set(18, oy + 11, 9, 'gold');
  for (const a of [0.5, 1.5, 2.5]) { const x = Math.round(18 + Math.cos(a) * 4), z = Math.round(9 + Math.sin(a) * 4); v.set(x, oy + 2, z, 'butter'); v.set(x, oy + 3, z, 'butter'); }
  // corner bartizans (little front-corner turrets)
  for (const bx of [3, 60]) { v.cyl(bx, 27, 27, 3, 5, 'stone'); v.cyl(bx, R0, 27, 3.6, 1, 'gold'); v.cone(bx, R0 + 1, 27, 3.6, 9, 'roofBlue'); v.set(bx, R0 + 10, 27, 'gold'); }
  roofTex(v, 'blue', R0 + 1);
}
V.def('c_borg', { size: [64, 54, 31], scale: 1 / 2,
  build(v) { keepBody(v); },
  // facade = double doors: 'facade' (west half, hinge on the west edge) + 'facadeR' (east half, hinge on the east edge)
  parts: {
    facade: { pivot: [0, 0, 30], build(v) { keepFacade(v); v.clear(32, 0, 0, 63, 53, 30); } },
    facadeR: { pivot: [64, 0, 30], build(v) { keepFacade(v); v.clear(0, 0, 0, 31, 53, 30); } },
    rooms: { pivot: [32, 0, 15], build: keepRooms },
  },
  meta: { group: 'castle', kind: 'keep', anim: { facade: 'rotation.y 0 -> -1.45 (west half opens outward)', facadeR: 'rotation.y 0 -> +1.45 (east half opens outward)',
      rooms: 'cosmetic room boxes (~35k tris): set visible=false while both facade halves are closed' },
    roomBoxes: KEEP_ROOMS, towerSeat: [0, 16, -0.25], bodyTopM: 16, ridgeM: 23.5 } });

/* ------------------------------------------------------------ learning towers (scale 1/4; one floor = 3 voxels = 0.75 m)
   grid 17 x .. x 17, round, radius 7.5 voxels (≈ 3.75 m across). opts.kind 'tall' (pink), 'les' (mint), 'skriv' (lilac) */
const LT = { tall: ['roofPink', 'blossom', 'pink'], les: ['roofMint', 'mint', 'mint'], skriv: ['roofLilac', 'lavender', 'lilac'] };
const lk = o => LT[(o && o.kind) || 'tall'] || LT.tall;
V.def('c_laere_base', { size: [19, 8, 19], scale: 1 / 4,
  build(v, o) {
    const [roof, light] = lk(o);
    v.cyl(9, 0, 9, 9, 2, 'stone2'); v.cyl(9, 2, 9, 7.5, 6, 'stone'); stoneTex(v, 51);
    v.cyl(9, 7, 9, 8, 1, roof);
    // arched door front + steps
    v.box(7, 2, 15, 11, 5, 17, 0); v.box(8, 6, 16, 10, 6, 17, 0); v.box(7, 2, 15, 11, 5, 15, 'woodRed'); v.box(8, 6, 15, 10, 6, 15, 'woodRed'); v.set(10, 4, 16, 'gold');
    v.box(6, 0, 17, 12, 1, 18, 'pathStone');
    // emblem plaque spot (HTML label shows the floor count); little flowers
    for (const x of [3, 15]) { v.set(x, 2, 15, 'leaf'); v.set(x, 3, 15, light); }
  },
  meta: { group: 'castle', kind: 'learnTower', heightM: 2, variants: { kind: ['tall', 'les', 'skriv'] } } });
function ltFloor(v, o, gold) {
  const [roof, light, win] = lk(o);
  v.cyl(9, 0, 9, 7.5, 3, gold ? 'gold' : 'stone');
  if (!gold) stoneTex(v, 52);
  v.cyl(9, 0, 9, 7.9, 1, gold ? 'honey' : light);                 // coloured band per floor (stripes when stacked)
  // 4 windows (front, back, sides) on rows 1..2
  for (const a of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) towerWin(v, 9, 9, 7.5, a, 1, 2, 2, { frame: gold ? 'yellow' : 'white', glass: gold ? 'glowYellow' : 'glass', back: gold ? 'lamp' : win });
}
V.def('c_laere_etasje', { size: [19, 3, 19], scale: 1 / 4, build(v, o) { ltFloor(v, o, false); }, meta: { group: 'castle', kind: 'learnTower', heightM: 0.75 } });
V.def('c_laere_gull', { size: [19, 3, 19], scale: 1 / 4, build(v, o) { ltFloor(v, o, true); }, meta: { group: 'castle', kind: 'learnTower', heightM: 0.75, note: 'mastered floor' } });
// roof with figurine: kind tall -> fairy holding a big "10" star; les -> open book; skriv -> pencil
function ltFigure(v, o) {
  const k = (o && o.kind) || 'tall';
  // little golden fairy statue on the cone tip (trophy look, no painted face): skirt in the tower colour, gold body, crystal wings
  const cx = 9, cz = 9, y0 = 21, dc = k === 'tall' ? 'pink' : k === 'les' ? 'mint' : 'lilac';
  v.box(cx - 2, y0, cz - 1, cx + 2, y0, cz + 1, dc); v.box(cx - 1, y0 + 1, cz - 1, cx + 1, y0 + 2, cz + 1, dc);
  v.box(cx - 1, y0 + 3, cz, cx + 1, y0 + 3, cz, 'gold');
  v.box(cx - 1, y0 + 4, cz - 1, cx + 1, y0 + 5, cz + 1, 'gold'); v.set(cx, y0 + 6, cz, 'gold'); v.set(cx, y0 + 6, cz - 1, 'honey');
  v.set(cx - 1, y0 + 6, cz, 'honey'); v.set(cx + 1, y0 + 6, cz, 'honey');
  v.box(cx - 3, y0 + 2, cz - 1, cx - 2, y0 + 5, cz - 1, 'crystal'); v.box(cx + 2, y0 + 2, cz - 1, cx + 3, y0 + 5, cz - 1, 'crystal'); // wings
}
function ltArm(v, o) {
  const k = (o && o.kind) || 'tall';
  const cx = 9, cz = 9, y0 = 21;
  v.box(cx + 2, y0 + 3, cz + 1, cx + 2, y0 + 5, cz + 1, 'gold');
  if (k === 'tall') { v.box(cx + 2, y0 + 6, cz - 1, cx + 4, y0 + 8, cz + 1, 'gold'); v.set(cx + 3, y0 + 9, cz, 'gold'); v.set(cx + 5, y0 + 7, cz, 'gold'); }
  else if (k === 'les') { v.box(cx + 1, y0 + 6, cz, cx + 4, y0 + 7, cz, 'white'); v.box(cx + 1, y0 + 6, cz - 1, cx + 4, y0 + 6, cz - 1, 'rose'); }
  else { v.box(cx + 2, y0 + 6, cz, cx + 2, y0 + 10, cz, 'butter'); v.set(cx + 2, y0 + 11, cz, 'pink'); v.set(cx + 2, y0 + 5, cz + 1, 'woodLight'); }
}
V.def('c_laere_tak', { size: [19, 33, 19], scale: 1 / 4,
  build(v, o) {
    const [roof] = lk(o);
    v.cyl(9, 0, 9, 8, 1, 'stone2'); v.cyl(9, 1, 9, 9, 1, 'gold');
    v.cone(9, 2, 9, 9, 18, roof);
    roofTex(v, roof === 'roofPink' ? 'pink' : roof === 'roofMint' ? 'mint' : 'lilac', 2);
    v.box(9, 19, 9, 9, 20, 9, 'gold');
  },
  parts: {
    figur: { pivot: [9.5, 21, 9.5], build: ltFigure },
    arm: { pivot: [11.5, 24, 9.5], build: ltArm },
  },
  meta: { group: 'castle', kind: 'learnTower', heightM: 8, anim: { arm: 'rotation.z wave ±0.6', figur: 'bounce / spin' } } });

/* ------------------------------------------------------------ WP1 BLD (DESIGN2 §2.6): flag poles on the keep + the 10 kingdom friendship gifts */
V.def('c_flaggstang', { size: [5, 50, 5], scale: 1 / 16,
  build(v) { v.box(2, 0, 2, 2, 46, 2, 'white'); v.box(1, 0, 1, 3, 1, 3, 'stone2'); v.sphere(2, 47.5, 2, 1.6, 'gold'); },
  meta: { group: 'castle', note: 'empty flag pole (3 m); c_flagg goes on it' } });
V.def('c_flagg', { size: [40, 50, 3], scale: 1 / 16,
  build(v, o) {
    const c = o.c || 'pink';
    for (let y = 33; y <= 45; y++) for (let x = 21; x <= 38; x++) { const wave = Math.round(Math.sin((x - 21) / 5) * 0.8); const yy = y + wave; if (yy < 50) v.set(x, yy, 1, (x === 21 || y === 33 || y === 45) ? 'gold' : c); }
    const S = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'];
    S.forEach((row, i) => { for (let j = 0; j < 5; j++) if (row[j] === 'X') v.set(27 + j, 42 - i + Math.round(Math.sin((27 + j - 21) / 5) * 0.8), 2, 'white'); });
  },
  meta: { group: 'castle', note: 'kingdom flag; place at the pole origin (pole at grid x 20)', variants: { c: ['pink', 'sky', 'mint', 'butter', 'lavender'] } } });
const GV = (id, size, scale, build) => V.def(id, { size, scale, build, meta: { group: 'castle', kind: 'gift' } });
GV('c_gave_rosebusk', [26, 26, 26], 1 / 12, v => {
  v.box(10, 0, 10, 15, 3, 15, 'woodRed'); v.box(9, 3, 9, 16, 4, 16, 'soil');
  v.ellipsoid(12.5, 14, 12.5, 11, 10, 11, 'leaf'); v.paint((x, y, z, c) => (c === F.col('leaf') && F.U.hash2(x * 3 + z, y, 5) < 0.18) ? 'leaf2' : null);
  for (let i = 0; i < 26; i++) { const a = i * 2.4, h = 6 + (i * 7) % 15; const r = Math.sqrt(Math.max(0, 1 - ((h - 14) / 10) ** 2)) * 11; const x = Math.round(12.5 + Math.cos(a) * r), z = Math.round(12.5 + Math.sin(a) * r); v.set(x, h, z, i % 3 ? 'rose' : 'pink'); v.set(x, h + 1, z, 'rose'); }
});
GV('c_gave_hestesko', [22, 22, 3], 1 / 10, v => {
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) { const d = Math.hypot(x - 10.5, y - 11); if (d <= 10.5 && d >= 6.8 && !(y < 9 && Math.abs(x - 10.5) < 6.5)) v.box(x, y, 0, x, y, 2, d > 9.6 || d < 7.6 ? 'honey' : 'gold'); }
  for (let i = 0; i < 6; i++) { const a = Math.PI * (0.05 + i * 0.18) + Math.PI * 0.0; v.set(Math.round(10.5 + Math.cos(a + Math.PI * 0.95) * 8.6), Math.round(11 - Math.sin(a + Math.PI * 0.95) * 8.6), 3 > 2 ? 2 : 2, 'white'); }
});
GV('c_gave_boblefontene', [30, 34, 30], 1 / 12, v => {
  v.cyl(14.5, 0, 14.5, 14, 4, 'stone2'); v.cyl(14.5, 1, 14.5, 12.5, 3, 'water'); v.cyl(14.5, 4, 14.5, 2.5, 10, 'pink'); v.cyl(14.5, 14, 14.5, 6, 2, 'stone2'); v.cyl(14.5, 15, 14.5, 4.6, 1, 'water');
  for (const [x, y, z, r] of [[14.5, 21, 14.5, 3.4], [9, 26, 12, 2.4], [20, 27, 17, 2.6], [13, 31, 18, 1.8], [19, 22, 9, 1.8]]) v.sphere(x, y, z, r, 'glass');
});
GV('c_gave_skjell', [28, 18, 22], 1 / 12, v => {
  for (let z = 0; z < 22; z++) for (let x = 0; x < 28; x++) {
    const dx = (x - 13.5) / 13.5, dz = (z - 3) / 18; if (dz < 0 || dx * dx + dz * dz > 1) continue;
    const a = Math.atan2(z - 3, x - 13.5), rib = Math.abs(Math.sin(a * 9)) > 0.55, h = Math.round((1 - (dx * dx + dz * dz)) * 9) + 2;
    for (let y = 0; y < h; y++) v.set(x, y, z, y === h - 1 ? (rib ? 'pink' : 'peach') : 'cream');
  }
  v.box(11, 0, 0, 16, 2, 3, 'peach'); v.sphere(13.5, 4, 5, 2.2, 'white');
});
GV('c_gave_kakefat', [18, 22, 18], 1 / 14, v => {
  v.cyl(8.5, 0, 8.5, 4, 1, 'gold'); v.cyl(8.5, 1, 8.5, 1.2, 6, 'gold'); v.cyl(8.5, 7, 8.5, 8.6, 1, 'white');
  v.cyl(8.5, 8, 8.5, 7, 6, 'pink'); v.cyl(8.5, 14, 8.5, 7.2, 1, 'white'); v.cyl(8.5, 15, 8.5, 5, 4, 'butter'); v.cyl(8.5, 19, 8.5, 5.2, 1, 'white');
  v.set(8, 20, 8, 'red'); v.set(9, 20, 9, 'red'); v.set(8, 21, 8, 'leaf');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; v.set(Math.round(8.5 + Math.cos(a) * 7), 13, Math.round(8.5 + Math.sin(a) * 7), i % 2 ? 'rose' : 'white'); }
});
GV('c_gave_spilledase', [18, 26, 14], 1 / 14, v => {
  v.box(0, 0, 0, 17, 7, 13, 'woodRed'); v.box(1, 1, 13, 16, 6, 13, 'roofPink'); v.box(0, 7, 0, 17, 7, 13, 'gold');
  for (const [x, y] of [[4, 3], [8, 4], [12, 3]]) v.set(x, y, 13, 'gold');
  v.box(6, 8, 0, 11, 12, 1, 'woodRed'); v.box(7, 9, 1, 10, 11, 1, 'glass');                     // the open lid
  v.box(8, 8, 6, 9, 8, 7, 'white'); v.box(8, 9, 6, 9, 13, 7, 'pink'); v.box(6, 12, 6, 11, 12, 7, 'pink'); v.box(8, 14, 6, 9, 16, 7, 'skin'); v.set(8, 17, 6, 'hairBlond'); v.set(9, 17, 7, 'hairBlond');
  v.box(7, 10, 5, 10, 10, 8, 'blossom');
});
GV('c_gave_stjerneglobus', [18, 28, 18], 1 / 14, v => {
  v.cyl(8.5, 0, 8.5, 5, 1, 'woodDark'); v.cyl(8.5, 1, 8.5, 1, 7, 'gold');
  v.sphere(8.5, 17, 8.5, 8, 'navySoft');
  v.paint((x, y, z, c) => (c === F.col('navySoft') && F.U.hash2(x * 7 + z, y, 9) < 0.09) ? 'butter' : null);
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; v.set(Math.round(8.5 + Math.cos(t) * 8.8), 17, Math.round(8.5 + Math.sin(t) * 8.8), 'gold'); }
  v.set(8, 26, 8, 'gold'); v.set(8, 27, 8, 'glowYellow');
});
GV('c_gave_snokule', [16, 22, 16], 1 / 14, v => {
  v.cyl(7.5, 0, 7.5, 7, 3, 'roofBlue'); v.cyl(7.5, 3, 7.5, 7.4, 1, 'gold');
  v.sphere(7.5, 12, 7.5, 7.5, 'glass');
  v.box(5, 4, 6, 10, 8, 9, 'white'); v.box(6, 9, 6, 6, 11, 6, 'pink'); v.box(9, 9, 6, 9, 11, 6, 'pink'); v.set(6, 12, 6, 'gold'); v.set(9, 12, 6, 'gold');
  for (let i = 0; i < 14; i++) v.set(3 + (i * 5) % 10, 5 + (i * 3) % 12, 3 + (i * 7) % 10, 'white');
});
GV('c_gave_krystallkrone', [20, 16, 20], 1 / 12, v => {
  for (let y = 0; y < 5; y++) for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; v.set(Math.round(9.5 + Math.cos(t) * 8), y, Math.round(9.5 + Math.sin(t) * 8), y === 0 || y === 4 ? 'gold' : 'crystal'); }
  for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2, x = Math.round(9.5 + Math.cos(t) * 8), z = Math.round(9.5 + Math.sin(t) * 8); for (let y = 5; y < 13 - (k % 2) * 3; y++) v.set(x, y, z, 'crystal'); v.set(x, 13 - (k % 2) * 3, z, k % 2 ? 'gem2' : 'gem1'); }
});
GV('c_gave_regnbue', [84, 44, 3], 1 / 4, v => {
  const C = ['red', 'orange', 'yellow', 'leaf', 'sky', 'lavender'];
  for (let y = 0; y < 44; y++) for (let x = 0; x < 84; x++) { const d = Math.hypot(x - 41.5, y); const k = Math.floor((42 - d) / 2); if (d <= 42 && k >= 0 && k < C.length) v.box(x, y, 0, x, y, 2, C[k]); }
  for (const cx of [6, 77]) v.ellipsoid(cx, 2, 1.5, 6, 3, 2, 'white');
});

/* ------------------------------------------------------------ assembly helper */
const L = [
  { name: 'keep', id: 'c_borg', x: 0, y: 0, z: -8 },
  { name: 'tallTower', id: 'c_tarn_hoy', x: 0, y: 16, z: -8.25 },
  { name: 'towerSW', id: 'c_tarn_sv', x: -24, y: 0, z: 16 },
  { name: 'towerSE', id: 'c_tarn_so', x: 24, y: 0, z: 16 },
  { name: 'towerNW', id: 'c_tarn_nv', x: -24, y: 0, z: -16 },
  { name: 'towerNE', id: 'c_tarn_no', x: 24, y: 0, z: -16 },
  { name: 'wallSW', id: 'c_mur_sor', x: -13.25, y: 0, z: 16, opts: { banner: 'mix' } },
  { name: 'wallSE', id: 'c_mur_sor', x: 13.25, y: 0, z: 16, opts: { banner: 'mix' } },
  { name: 'wallW', id: 'c_mur_side', x: -24, y: 0, z: 0, ry: -Math.PI / 2 },
  { name: 'wallE', id: 'c_mur_side', x: 24, y: 0, z: 0, ry: Math.PI / 2 },
  { name: 'wallNW', id: 'c_mur_nord', x: -10.5, y: 0, z: -16, ry: Math.PI },
  { name: 'wallNE', id: 'c_mur_nord', x: 10.5, y: 0, z: -16, ry: Math.PI },
  { name: 'gate', id: 'c_porthus', x: 0, y: 0, z: 16.25 },
];
F.CastleKit = {
  layout: L,
  beaconTop: [0, 38, -8.25],
  gateFront: [0, 26.5], gateInside: [0, 12],
  facadeHinge: [-16, -0.75], facadeHingeR: [16, -0.75],
  // keep facade hinge in castle coords (west edge of the keep front)
  build() {
    const g = new THREE.Group(); g.name = 'castle';
    const objs = {};
    for (const p of L) {
      const o = V.make(p.id, p.opts || {});
      o.position.set(p.x, p.y || 0, p.z); o.rotation.y = p.ry || 0;
      g.add(o); objs[p.name] = o;
    }
    const kp = objs.keep.userData.parts;
    g.userData = { objs, keep: objs.keep, gate: objs.gate, parts: { bridge: objs.gate.userData.parts.bridge, facade: kp.facade, facadeR: kp.facadeR, rooms: kp.rooms } };
    return g;
  },
};
})();
