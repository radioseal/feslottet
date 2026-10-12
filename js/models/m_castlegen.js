/* Feslottet – WP3 REALM: castle generator for the kingdom castles (DESIGN2 §3.5). Scale 1/2 m (props 1/4). Palette NAMES only.
   Parametric VOX defs (fixed max grids, model centred; origin = bottom centre; front = +z = south, toward the plaza):
     cg_keep  {w,d,h (m), wall, wall2, trim, windows:'arch'|'round'|'star', gable:'stepped'|null, emb, finial, rainbow, style}
     cg_tower {r,h (m), wall, wall2, trim, windows, cren:bool, rainbow}
     cg_roof  {kind:'cone'|'spire'|'onion'|'dome'|'stepped'|'sail', r (m), col, col2, finial, rainbow, glass}
     cg_wall  {len, h (m), wall, wall2, trim}     cg_gate {wall, wall2, trim, emb}     cg_flag {col, emb} (scale 1/4)
     cg_hedge {len (m), fl}   cg_prop_<name> (20 theme props, scale 1/4)   building site: cg_fence {len}, cg_stillas, cg_kran, cg_kubehaug {c1,c2,c3}
   Assembly (castle-local metres, castle centre = region centre; keep door faces south toward the plaza and the market):
     F.CastleGen.spec(realm) -> {keep:{w,d,h}, towers, roof, roof2, wall, hedge, pal, emblem, props, windows, ...}
     F.CastleGen.parts(realm) -> [{id, opts, x, z, y, ry}]  (y = metres above the flat plaza level)
     F.CastleGen.boxes(realm) -> [{x0,z0,x1,z1}] colliders      F.CastleGen.layout(realm) -> {door, gate, market:[{x,z,ry}], sign, spots}
     F.CastleGen.build(realm) -> THREE.Group (whole castle; gallery / previews)    F.CastleGen.FOOT = {x0,z0,x1,z1} reserved footprint
     F.CastleGen.siteParts(realm) -> parts of the building site (state 'site')
   Sizes: liten 16×12×10 (2 front towers), middels 20×14×12 (4 towers, low hedge ring), stor 26×16×14 (4 + 1 tall, curtain wall, gate). */
(function () {
'use strict';
const F = window.F, V = F.VOX;
const D = (id, spec) => { if (!V.has(id)) V.def(id, Object.assign({ meta: { group: 'kongeslott' } }, spec)); };
const H2 = (a, b, c) => F.U.hash2(a, b, c);
const RAINBOW = ['red', 'orange', 'yellow', 'green', 'sky', 'purple'];

/* ------------------------------------------------------------ emblems (pixel rows, top first) */
const EMB = {
  flower: ['.X.X.', 'XXXXX', '.XOX.', 'XXXXX', '.X.X.'],
  horseshoe: ['X...X', 'XO.OX', 'X...X', 'XX.XX', '.XXX.'],
  bubble: ['.XXX.', 'XO..X', 'X...X', 'X...X', '.XXX.'],
  shell: ['..X..', '.XXX.', 'XXXXX', 'X.X.X', '.XXX.'],
  cake: ['.O.O.', 'XXXXX', 'OOOOO', 'XXXXX', 'XXXXX'],
  note: ['..XX.', '..X.X', '..X..', 'XXX..', 'XXX..'],
  star: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'],
  snowflake: ['X.X.X', '.XXX.', 'XXOXX', '.XXX.', 'X.X.X'],
  crystal: ['..X..', '.XXX.', '.XOX.', '.XXX.', '..X..'],
  rainbow: ['.RRR.', 'RYYYR', 'YG.GY', 'G...G', 'G...G'],
  heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  crown: ['X.X.X', 'XXXXX', 'XOXOX', 'XXXXX'],
};
F.CastleGen = F.CastleGen || {};
F.CastleGen.EMB = EMB;
// draw an emblem on a vertical plane facing +z (z = zf) or +x; c = main colour, c2 = accent ('O')
function emblem(v, kind, x0, ytop, zf, c, c2, axis) {
  const rows = EMB[kind] || EMB.heart;
  rows.forEach((row, i) => {
    for (let j = 0; j < row.length; j++) {
      const ch = row[j]; if (ch === '.') continue;
      const col = ch === 'O' ? (c2 || 'white') : ch === 'R' ? 'red' : ch === 'Y' ? 'yellow' : ch === 'G' ? 'green' : c;
      if (axis === 'x') v.set(zf, ytop - i, x0 + j, col); else v.set(x0 + j, ytop - i, zf, col);
    }
  });
}
/* finial on top of a roof: (cx, y0, cz) voxel coords at the tip (cx/cz may be .5 for even grids) */
function finial(v, kind, cx, y0, cz) {
  const X = Math.floor(cx), Z = Math.floor(cz); y0 = Math.round(y0);
  switch (kind) {
    case 'flower': v.box(X, y0, Z, X, y0 + 1, Z, 'leaf'); v.set(X - 1, y0 + 2, Z, 'pink'); v.set(X + 1, y0 + 2, Z, 'pink'); v.set(X, y0 + 2, Z - 1, 'pink'); v.set(X, y0 + 2, Z + 1, 'pink'); v.set(X, y0 + 3, Z, 'pink'); v.set(X, y0 + 2, Z, 'butter'); break;
    case 'horse': v.box(X, y0, Z, X, y0 + 2, Z, 'gold'); v.box(X - 1, y0 + 3, Z, X + 1, y0 + 3, Z, 'gold'); v.box(X + 1, y0 + 4, Z, X + 1, y0 + 5, Z, 'gold'); v.set(X + 2, y0 + 5, Z, 'gold'); v.set(X, y0 + 4, Z, 'gold'); break;
    case 'bubble': v.set(X, y0, Z, 'silver'); v.sphere(X, y0 + 2, Z, 1.6, 'ice'); v.set(X - 1, y0 + 3, Z + 1, 'white'); break;
    case 'shell': v.set(X, y0, Z, 'gold'); v.box(X - 1, y0 + 1, Z, X + 1, y0 + 1, Z, 'peach'); v.box(X - 2, y0 + 2, Z, X + 2, y0 + 2, Z, 'sand'); v.box(X - 1, y0 + 3, Z, X + 1, y0 + 3, Z, 'peach'); v.set(X, y0 + 4, Z, 'sand'); break;
    case 'cherry': v.set(X, y0, Z, 'leaf'); v.sphere(X, y0 + 2, Z, 1.3, 'cherry'); v.set(X, y0 + 4, Z, 'leaf2'); v.set(X + 1, y0 + 4, Z, 'leaf'); break;
    case 'note': v.box(X, y0, Z, X, y0 + 4, Z, 'navySoft'); v.box(X - 2, y0, Z, X - 1, y0 + 1, Z, 'navySoft'); v.set(X + 1, y0 + 4, Z, 'navySoft'); v.set(X + 1, y0 + 3, Z, 'navySoft'); break;
    case 'star': v.set(X, y0, Z, 'gold'); v.box(X - 2, y0 + 2, Z, X + 2, y0 + 2, Z, 'gold'); v.box(X, y0 + 1, Z, X, y0 + 4, Z, 'gold'); v.box(X - 1, y0 + 1, Z, X + 1, y0 + 3, Z, 'gold'); v.set(X - 1, y0 + 1, Z, 0); v.set(X + 1, y0 + 1, Z, 0); break;
    case 'snowflake': v.box(X, y0, Z, X, y0 + 4, Z, 'white'); v.box(X - 2, y0 + 2, Z, X + 2, y0 + 2, Z, 'white'); v.set(X - 1, y0 + 1, Z, 'ice'); v.set(X + 1, y0 + 3, Z, 'ice'); v.set(X - 1, y0 + 3, Z, 'ice'); v.set(X + 1, y0 + 1, Z, 'ice'); break;
    case 'crystal': v.box(X, y0, Z, X, y0 + 4, Z, 'crystal'); v.box(X - 1, y0 + 1, Z, X + 1, y0 + 2, Z, 'crystal'); v.set(X, y0 + 5, Z, 'white'); break;
    case 'rainbow': for (let k = 0; k < 4; k++) { const c = RAINBOW[k]; v.set(X - 2 + 0, y0 + k, Z, c); v.set(X + 2, y0 + k, Z, c); } v.box(X - 1, y0 + 4, Z, X + 1, y0 + 4, Z, 'red'); v.set(X - 2, y0 + 3, Z, 'orange'); v.set(X + 2, y0 + 3, Z, 'orange'); break;
    default: v.box(X, y0, Z, X, y0 + 2, Z, 'gold'); v.sphere(X, y0 + 3, Z, 1, 'gold');
  }
}
F.CastleGen.finial = finial;

/* window cut into a face. face: 'z' (front +z plane at zf, inset toward -z) | 'x+' | 'x-' (side planes at x = xf) */
function win(v, kind, a, y, f, face, pane, frame) {
  const P = pane || 'sky', T = frame || 'white';
  const cells = [];
  if (kind === 'round') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (!((i === 0 || i === 3) && (j === 0 || j === 3))) cells.push([i, j]); }
  else if (kind === 'star') { [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [0, 3], [2, 3], [1, 3], [1, 4]].forEach(p => cells.push(p)); }
  else { for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) cells.push([i, j]); cells.push([1, 4]); }
  for (const [i, j] of cells) {
    if (face === 'z') { v.set(a + i, y + j, f, 0); v.set(a + i, y + j, f - 1, P); }
    else if (face === 'x+') { v.set(f, y + j, a + i, 0); v.set(f - 1, y + j, a + i, P); }
    else { v.set(f, y + j, a + i, 0); v.set(f + 1, y + j, a + i, P); }
  }
  // sill
  const w = kind === 'round' ? 4 : 3;
  for (let i = -1; i <= w; i++) { if (face === 'z') v.set(a + i, y - 1, f, T); else v.set(f, y - 1, a + i, T); }
  // a little highlight
  if (face === 'z') v.set(a + 1, y + (kind === 'star' ? 3 : 2), f - 1, 'white');
}

/* ------------------------------------------------------------ keep */
D('cg_keep', { size: [58, 46, 38], scale: 1 / 2,
  build(v, o) {
    const sx = 58, sz = 38;
    const W = Math.round((o.w || 20) * 2), Dp = Math.round((o.d || 14) * 2), H = Math.round((o.h || 12) * 2);
    const x0 = sx / 2 - W / 2, x1 = x0 + W - 1, z0 = sz / 2 - Dp / 2, z1 = z0 + Dp - 1;
    const wall = o.wall || 'stone', wall2 = o.wall2 || 'stone2', trim = o.trim || 'gold';
    v.box(x0 - 1, 0, z0 - 1, x1 + 1, 1, z1 + 1, wall2);                        // plinth
    v.box(x0, 2, z0, x1, H - 1, z1, wall);
    // corner quoins (alternating wall2 blocks)
    for (let y = 2; y < H; y++) if (((y >> 1) & 1) === 0) for (const x of [x0, x1]) for (const z of [z0, z1]) { v.set(x, y, z, wall2); v.set(x + (x === x0 ? 1 : -1), y, z, wall2); v.set(x, y, z + (z === z0 ? 1 : -1), wall2); }
    // band (rainbow stripes for the rainbow castle)
    const bandY = Math.round(H * 0.42);
    if (o.rainbow) { for (let k = 0; k < 3; k++) for (let x = x0; x <= x1; x++) { v.set(x, bandY + k, z1, RAINBOW[(k * 2 + ((x >> 2) & 1)) % 6]); } }
    else { v.box(x0, bandY, z1, x1, bandY, z1, trim); v.box(x0, bandY, z0, x0, bandY, z1, trim); v.box(x1, bandY, z0, x1, bandY, z1, trim); }
    // cornice
    v.box(x0 - 1, H, z0 - 1, x1 + 1, H, z1 + 1, trim);
    // grand door (front centre, 3 m wide × 4.5 m arched)
    const dw = 6, dh = 9, dx0 = sx / 2 - dw / 2;
    for (let x = dx0 - 1; x < dx0 + dw + 1; x++) for (let y = 2; y <= dh + 3; y++) {
      const ex = x < dx0 || x >= dx0 + dw, top = y > dh + 1 - (x === dx0 || x === dx0 + dw - 1 ? 1 : 0);
      if (ex || top) { if (y <= dh + 2) v.set(x, y, z1, wall2); continue; }
      v.set(x, y, z1, 0); v.set(x, y, z1 - 1, ((x - dx0) === 2 || (x - dx0) === 3) ? 'woodDark' : 'wood');
    }
    for (let x = dx0 - 1; x < dx0 + dw + 1; x++) v.set(x, dh + 3, z1, trim);
    v.set(dx0 + 1, 6, z1 - 1, 'gold'); v.set(dx0 + 4, 6, z1 - 1, 'gold');
    v.box(dx0 - 2, 2, z1 + 1, dx0 + dw + 1, 2, z1 + 1, wall2);                   // doorstep
    // emblem plate above the door
    v.box(sx / 2 - 4, dh + 5, z1 + 1, sx / 2 + 3, dh + 11, z1 + 1, wall2);
    emblem(v, o.emb || 'heart', sx / 2 - 3, dh + 10, z1 + 2, trim, 'white');
    // windows: front (two rows), sides, back (painted only)
    const kind = o.windows || 'arch', pane = kind === 'star' ? 'butter' : 'sky';
    const rows = []; for (let y = 6; y + 6 < H - 1; y += 9) rows.push(y);
    for (const y of rows) for (let x = x0 + 3; x + 4 <= x1 - 2; x += 7) { if (y < dh + 12 && x + 4 > dx0 - 2 && x < dx0 + dw + 2) continue; win(v, kind, x, y, z1, 'z', pane, trim); }
    for (const y of rows) for (let z = z0 + 4; z + 4 <= z1 - 3; z += 8) { win(v, kind, z, y, x1, 'x+', pane, trim); win(v, kind, z, y, x0, 'x-', pane, trim); }
    // top: crenellations, or stepped gables
    if (o.gable === 'stepped') {
      const n = W >= 44 ? 3 : 2, gw = Math.floor(W / n);
      for (let g = 0; g < n; g++) {
        const gx0 = x0 + g * gw, gx1 = g === n - 1 ? x1 : gx0 + gw - 1, gc = (gx0 + gx1) / 2, gh = Math.min(12, Math.floor((gx1 - gx0) / 2) + 1);
        for (let x = gx0; x <= gx1; x++) {
          const p = Math.max(1, Math.round(gh - Math.abs(x - gc) * (gh / ((gx1 - gx0) / 2 + 0.5))));
          v.box(x, H + 1, z0 + 1, x, H + p, z1 - 1, ((x + g) % 3 === 0) ? (o.roof2 || o.roof || 'roofRed') : (o.roof || 'roofRed'));
          const ps = Math.max(2, Math.ceil(p / 2) * 2 + 1);
          v.box(x, H + 1, z1, x, H + ps, z1, wall); v.box(x, H + 1, z0, x, H + ps, z0, wall);
          v.set(x, H + ps, z1, trim);
        }
        // a round window in each gable
        win(v, 'round', Math.round(gc) - 2, H + 2, z1, 'z', pane, trim);
        if (g === Math.floor(n / 2) && o.finial) finial(v, o.finial, gc, H + gh + 3, z1);
      }
    } else {
      for (let x = x0 - 1; x <= x1 + 1; x++) if (((x - x0 + 1) & 3) < 2) { v.box(x, H + 1, z0 - 1, x, H + 2, z0 - 1, wall); v.box(x, H + 1, z1 + 1, x, H + 2, z1 + 1, wall); }
      for (let z = z0 - 1; z <= z1 + 1; z++) if (((z - z0 + 1) & 3) < 2) { v.box(x0 - 1, H + 1, z, x0 - 1, H + 2, z, wall); v.box(x1 + 1, H + 1, z, x1 + 1, H + 2, z, wall); }
    }
  } });

/* ------------------------------------------------------------ round tower */
D('cg_tower', { size: [18, 64, 18], scale: 1 / 2,
  build(v, o) {
    const c = 8.5, R = Math.max(1.5, (o.r || 3) * 2), H = Math.round((o.h || 15) * 2);
    const wall = o.wall || 'stone', wall2 = o.wall2 || 'stone2', trim = o.trim || 'gold';
    v.cyl(c, 0, c, R + 0.6, 2, wall2);
    for (let y = 2; y < H - 2; y++) v.cyl(c, y, c, R, 1, o.rainbow && (y % 8) < 2 ? RAINBOW[(y >> 3) % 6] : wall);
    v.cyl(c, Math.round(H * 0.45), c, R + 0.3, 1, trim);
    v.cyl(c, H - 2, c, R + 1, 2, trim);                                          // corbel ring
    if (o.cren) { v.cyl(c, H, c, R + 1, 2, wall); v.cyl(c, H, c, R - 0.2, 2, 0); for (let a = 0; a < 16; a += 2) { const ang = a / 16 * Math.PI * 2; v.set(Math.round(c + Math.cos(ang) * (R + 0.5)), H + 1, Math.round(c + Math.sin(ang) * (R + 0.5)), 0); } }
    // windows on the front (+z) half and both sides
    const kind = o.windows || 'arch', pane = kind === 'star' ? 'butter' : 'sky';
    const zf = Math.round(c + R);
    for (let y = 8; y + 7 < H - 2; y += 10) {
      win(v, kind === 'round' ? 'round' : (kind === 'star' ? 'star' : 'arch'), Math.round(c) - (kind === 'round' ? 2 : 1), y, zf, 'z', pane, trim);
      if (R >= 5) { win(v, 'arch', Math.round(c) - 1, y + 4, Math.round(c + R), 'x+', pane, trim); win(v, 'arch', Math.round(c) - 1, y + 4, Math.round(c - R), 'x-', pane, trim); }
    }
  } });

/* ------------------------------------------------------------ roofs (cone / spire / onion / dome / stepped / sail) */
D('cg_roof', { size: [26, 60, 26], scale: 1 / 2,
  build(v, o) {
    const c = 12.5, R = Math.max(2, (o.r || 3.5) * 2), kind = o.kind || 'cone';
    const col = o.col || 'roofPink', col2 = o.col2 || 'white';
    const band = (y, base) => (o.rainbow ? RAINBOW[Math.floor(y / 3) % 6] : (y % 3 === 2 ? col2 : base));
    let top = 0;
    if (kind === 'cone' || kind === 'spire' || kind === 'sail') {
      const h = Math.round(R * (kind === 'spire' ? 3.6 : 2.3));
      for (let y = 0; y < h; y++) { const rr = (R + 1) * (1 - y / h); if (rr < 0.4) { v.set(Math.floor(c), y, Math.floor(c), col); continue; } v.cyl(c, y, c, rr, 1, band(y, col)); }
      top = h;
    } else if (kind === 'onion') {
      v.cyl(c, 0, c, R * 0.55, 2, col2);
      v.ellipsoid(c, R * 0.9 + 1, c, R * 0.95, R * 0.95, R * 0.95, col);
      v.paint((x, y, z, cc) => (y > 1 && ((y >> 1) % 3 === 0) && cc === F.PAL[col] ? F.PAL[col2] : null));
      const y0 = Math.round(R * 1.8) + 1;
      for (let y = 0; y < Math.round(R * 1.6); y++) { const rr = R * 0.45 * (1 - y / (R * 1.6)); if (rr < 0.4) v.set(Math.floor(c), y0 + y, Math.floor(c), col); else v.cyl(c, y0 + y, c, rr, 1, col); }
      top = y0 + Math.round(R * 1.6);
    } else if (kind === 'dome') {
      const g = o.glass ? 'glass' : col;
      for (let y = 0; y <= R; y++) { const rr = Math.sqrt(Math.max(0, (R + 0.5) * (R + 0.5) - y * y)); v.cyl(c, y, c, rr, 1, (y % 4 === 3 && !o.glass) ? col2 : g); }
      if (o.glass) v.cyl(c, 0, c, R + 0.6, 1, col2);
      top = R + 1;
    } else if (kind === 'stepped') {
      // a stepped (tiered) cap: 3 shrinking crenellated drums
      let rr = R + 0.5, y = 0;
      for (let k = 0; k < 3; k++) { v.cyl(c, y, c, rr, 3, k % 2 ? col2 : col); y += 3; rr -= R * 0.28; }
      v.cone(c, y, c, Math.max(1.2, rr), 4, col); top = y + 4;
    }
    if (kind === 'sail') {
      // windmill sails on the front (+z) of the cap
      const hy = Math.round(top * 0.45), hz = Math.round(c + R * 0.5) + 2, L = Math.min(12, R * 1.6);
      v.box(Math.floor(c), hy, hz - 2, Math.floor(c), hy, hz, 'woodDark');
      for (let a = 0; a < 4; a++) {
        const ang = a * Math.PI / 2 + Math.PI / 4;
        for (let t = 1; t <= L; t++) {
          const x = Math.round(c + Math.cos(ang) * t), y = Math.round(hy + Math.sin(ang) * t);
          v.set(x, y, hz, 'woodDark');
          if (t > 2) { const px = Math.round(c + Math.cos(ang) * t - Math.sin(ang) * 1.5), py = Math.round(hy + Math.sin(ang) * t + Math.cos(ang) * 1.5); v.set(px, py, hz, (t & 1) ? 'white' : col2); }
        }
      }
    }
    if (o.finial) finial(v, o.finial, c, top, c);
  } });

/* ------------------------------------------------------------ curtain wall, gatehouse, flag, hedge */
// curtain wall at 1 m voxels (a long wall at 1/2 m costs ≈ 4× the triangles)
D('cg_wall', { size: [44, 7, 2], scale: 1,
  build(v, o) {
    const L = Math.min(42, Math.round(o.len || 20)), H = Math.round(o.h || 4), x0 = 22 - Math.round(L / 2), x1 = x0 + L - 1;
    const wall = o.wall || 'stone', wall2 = o.wall2 || 'stone2', trim = o.trim || 'gold';
    v.box(x0, 0, 0, x1, 0, 1, wall2); v.box(x0, 1, 0, x1, H - 2, 1, wall);
    v.box(x0, H - 1, 0, x1, H - 1, 1, trim);
    for (let x = x0; x <= x1; x++) if (((x - x0) & 1) === 0) v.box(x, H, 0, x, H, 1, wall);
  } });
D('cg_gate', { size: [26, 24, 12], scale: 1 / 2,
  build(v, o) {
    const wall = o.wall || 'stone', wall2 = o.wall2 || 'stone2', trim = o.trim || 'gold';
    const x0 = 3, x1 = 22, z0 = 1, z1 = 10, H = 15;
    v.box(x0, 0, z0, x1, H, z1, wall);
    v.box(x0, 0, z0, x1, 1, z1, wall2);
    // arched passage (3.5 m wide, 5 m tall)
    for (let x = 9; x <= 16; x++) for (let y = 0; y <= 10; y++) { const top = y >= 9 && (x === 9 || x === 16) || (y === 10 && (x === 10 || x === 15)); if (!top) for (let z = z0; z <= z1; z++) v.set(x, y, z, 0); }
    for (let x = 8; x <= 17; x++) v.set(x, 11, z1, trim);
    for (let z = z0; z <= z1; z++) { v.set(9, 0, z, 'pathStone'); }
    // turrets
    for (const tx of [3.5, 21.5]) { v.cyl(tx, 0, z1 - 0.5, 3, H + 5, wall2); v.cyl(tx, H + 5, z1 - 0.5, 3.6, 1, trim); v.cone(tx, H + 6, z1 - 0.5, 3.6, 6, o.roof || 'roofPink'); }
    for (let x = x0 + 4; x <= x1 - 4; x++) if ((x & 3) < 2) v.box(x, H + 1, z1, x, H + 2, z1, wall);
    v.box(10, 12, z1 + 1, 15, 14, z1 + 1, wall2); emblem(v, o.emb || 'heart', 10, 14, z1 + 1, trim, 'white');
  } });
D('cg_flag', { size: [14, 26, 2], scale: 1 / 4,
  build(v, o) {
    v.box(1, 0, 0, 1, 24, 0, 'white'); v.set(1, 25, 0, 'gold');
    const col = o.col || 'pink';
    v.box(2, 14, 0, 12, 23, 0, col);
    for (let y = 14; y <= 23; y++) v.set(12 + (y & 1), y, 0, (y & 1) ? col : 0);
    emblem(v, o.emb || 'heart', 5, 21, 1, 'white', 'butter');
  } });
// fix wave (review:art #1): hanging wall banners on the keep front (flag colour, trim edge, emblem, swallowtail), 2.5 × 5 m
D('cg_banner', { size: [12, 21, 1], scale: 1 / 4,
  build(v, o) {
    const col = o.col || 'pink', trim = o.trim || 'gold';
    v.box(0, 20, 0, 11, 20, 0, trim);                                         // the rod
    v.box(1, 3, 0, 10, 19, 0, col);
    for (let y = 3; y <= 19; y++) { v.set(1, y, 0, trim); v.set(10, y, 0, trim); }
    for (let x = 1; x <= 10; x++) v.set(x, 17, 0, trim);
    for (let i = 0; i < 3; i++) { v.set(1 + i, 2 - i, 0, col); v.set(10 - i, 2 - i, 0, col); v.set(4 + i, 2 - i, 0, 0); }   // swallowtail
    v.box(4, 2, 0, 7, 2, 0, 0);
    emblem(v, o.emb || 'heart', 3, 14, 0, 'white', 'butter');
  } });
D('cg_hedge', { size: [86, 4, 3], scale: 1 / 2,
  build(v, o) {
    const L = Math.min(84, Math.round((o.len || 20) * 2)), x0 = 43 - Math.round(L / 2), x1 = x0 + L - 1;
    v.box(x0, 0, 0, x1, 2, 2, 'leaf');
    for (let x = x0; x <= x1; x++) { if (H2(x, 3, 7) < 0.35) v.set(x, 3, 1, 'leaf2'); if (H2(x, 5, 9) < 0.18) v.set(x, 2, 2, o.fl || 'pink'); }
  } });

/* ------------------------------------------------------------ theme props (scale 1/4; ≈ 4–8 m) */
const PROP = (name, size, build) => D('cg_prop_' + name, { size, scale: 1 / 4, build });
PROP('rosebue', [22, 22, 6], v => {
  for (const x of [2, 19]) v.box(x, 0, 2, x, 14, 3, 'woodLight');
  for (let a = 0; a <= 20; a++) { const t = a / 20 * Math.PI, x = Math.round(10.5 - Math.cos(t) * 9), y = Math.round(14 + Math.sin(t) * 6); v.box(x, y, 1, x, y + 1, 4, 'leaf'); if (a % 3 === 0) v.set(x, y + 2, 2, 'rose'); if (a % 3 === 1) v.set(x, y, 5, 'pink'); }
  for (let y = 2; y < 14; y += 3) { v.set(1, y, 3, 'rose'); v.set(20, y + 1, 3, 'pink'); }
});
PROP('blomsterbed', [24, 6, 16], v => {
  v.ellipsoid(12, 0, 8, 11, 1.5, 7, 'soil');
  for (let x = 2; x < 22; x++) for (let z = 2; z < 14; z++) if (((x - 12) / 10) ** 2 + ((z - 8) / 6.5) ** 2 < 1 && H2(x, z, 3) < 0.45) { v.set(x, 2, z, 'leaf'); v.set(x, 3, z, ['rose', 'pink', 'butter', 'white', 'lilac'][Math.floor(H2(x, z, 4) * 5)]); }
});
PROP('hesteskobue', [22, 26, 4], v => {
  for (let a = 0; a <= 28; a++) { const t = a / 28 * Math.PI, x = Math.round(11 - Math.cos(t) * 8), y = Math.round(14 + Math.sin(t) * 9); v.box(x - 1, y - 1, 1, x + 1, y + 1, 2, 'gold'); }
  for (const x of [2, 19]) v.box(x, 0, 1, x + 1, 14, 2, 'gold');
  for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7 * Math.PI; v.set(Math.round(11 - Math.cos(t) * 8), Math.round(14 + Math.sin(t) * 9), 3, 'woodDark'); }
});
PROP('stall', [28, 24, 22], v => {
  v.box(2, 0, 2, 25, 11, 19, 'woodRed'); v.box(2, 0, 2, 25, 1, 19, 'stone2');
  for (let y = 12; y < 22; y++) { const k = y - 12; v.box(2 + k, y, 1, 25 - k, y, 20, (y % 3 === 0) ? 'woodDark' : 'roofRed'); }
  v.box(10, 0, 19, 17, 8, 20, 'white'); v.box(11, 0, 20, 16, 7, 20, 'woodDark'); v.line(11, 0, 20, 16, 7, 20, 'white'); v.line(16, 0, 20, 11, 7, 20, 'white');
  v.box(4, 6, 20, 7, 8, 20, 'white'); v.box(20, 6, 20, 23, 8, 20, 'white'); v.set(13, 10, 20, 'gold'); v.set(14, 10, 20, 'gold');
});
PROP('boblefontene', [24, 22, 24], v => {
  v.cyl(11.5, 0, 11.5, 10, 2, 'white'); v.cyl(11.5, 1, 11.5, 8.5, 1, 'water'); v.cyl(11.5, 0, 11.5, 2, 8, 'sky'); v.cyl(11.5, 8, 11.5, 4, 1, 'white');
  v.sphere(11.5, 13, 11.5, 3, 'ice'); v.sphere(6, 9, 9, 2, 'ice'); v.sphere(17, 11, 14, 2.2, 'ice'); v.sphere(9, 17, 14, 1.6, 'ice'); v.set(10, 15, 13, 'white'); v.set(5, 10, 10, 'white');
});
PROP('båt', [24, 22, 36], v => {
  // a little pond with a sailing boat in it (the prop stands on the plaza lawn)
  v.ellipsoid(11.5, 0, 17.5, 11.5, 0.6, 17.5, 'sand');
  for (let x = 1; x < 23; x++) for (let z = 1; z < 35; z++) if (((x - 11.5) / 10) ** 2 + ((z - 17.5) / 16) ** 2 < 1) v.set(x, 0, z, 'water');
  for (let z = 5; z < 31; z++) { const w = Math.round(5 * Math.sin((z - 4) / 27 * Math.PI)); v.box(12 - w, 1, z, 11 + w, 3, z, z % 4 === 0 ? 'white' : 'woodRed'); }
  v.box(11, 4, 17, 12, 20, 18, 'woodLight');
  for (let y = 6; y < 19; y++) { const w = Math.round((19 - y) * 0.45); v.box(13, y, 18 - w, 13, y, 18, 'white'); }
});
PROP('brygge', [10, 6, 64], v => {
  v.box(1, 3, 0, 8, 3, 63, 'woodLight');
  for (let z = 0; z < 64; z += 4) v.box(1, 3, z, 8, 3, z, 'wood');
  for (let z = 2; z < 64; z += 10) { v.box(0, 0, z, 0, 5, z, 'woodDark'); v.box(9, 0, z, 9, 5, z, 'woodDark'); }
});
PROP('skjellhaug', [22, 10, 22], v => {
  v.ellipsoid(11, 0, 11, 9, 4, 8, 'sand');
  for (let k = 0; k < 14; k++) { const x = 3 + Math.floor(H2(k, 1, 5) * 16), z = 3 + Math.floor(H2(k, 2, 5) * 16); const y = 2 + Math.floor((1 - Math.hypot(x - 11, z - 11) / 10) * 3); v.box(x, y, z, x + 1, y, z + 1, ['peach', 'pink', 'white', 'coral'][k % 4]); v.set(x, y + 1, z, 'white'); }
});
PROP('kakefontene', [24, 30, 24], v => {
  v.cyl(11.5, 0, 11.5, 10, 2, 'white'); v.cyl(11.5, 1, 11.5, 8.5, 1, 'pink');
  v.cyl(11.5, 2, 11.5, 7, 6, 'peach'); v.cyl(11.5, 7, 11.5, 7.4, 1, 'white');
  v.cyl(11.5, 8, 11.5, 5, 6, 'blossom'); v.cyl(11.5, 13, 11.5, 5.4, 1, 'white');
  v.cyl(11.5, 14, 11.5, 3, 5, 'cream'); v.cyl(11.5, 18, 11.5, 3.3, 1, 'pink');
  v.sphere(11.5, 21, 11.5, 1.8, 'cherry'); v.set(11, 23, 11, 'leaf');
  for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; v.set(Math.round(11.5 + Math.cos(t) * 7.4), 8, Math.round(11.5 + Math.sin(t) * 7.4), 'cherry'); }
});
PROP('epletre-rad', [32, 24, 10], v => {
  for (const x of [5, 16, 27]) { v.box(x, 0, 4, x + 1, 8, 5, 'woodDark'); v.sphere(x + 0.5, 13, 4.5, 5, 'leaf'); for (let k = 0; k < 6; k++) v.set(x - 3 + Math.floor(H2(x, k, 3) * 7), 10 + Math.floor(H2(k, x, 4) * 7), 9, 'red'); }
});
PROP('vindmølletårn-seil', [30, 40, 22], v => {
  for (let y = 0; y < 24; y++) v.cyl(14.5, y, 10.5, 6 - y * 0.12, 1, y < 2 ? 'stone2' : 'white');
  v.cone(14.5, 24, 10.5, 4.5, 6, 'roofBlue');
  v.box(13, 0, 16, 16, 6, 16, 'woodDark');
  for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + 0.4; for (let t = 1; t < 14; t++) { const x = Math.round(14.5 + Math.cos(ang) * t), y = Math.round(22 + Math.sin(ang) * t); v.set(x, y, 17, 'woodDark'); if (t > 3) v.set(Math.round(x - Math.sin(ang) * 2), Math.round(y + Math.cos(ang) * 2), 17, 'white'); } }
});
PROP('klokketårn', [16, 44, 16], v => {
  v.box(4, 0, 4, 11, 26, 11, 'white'); v.box(4, 0, 4, 11, 1, 11, 'stone2');
  v.clear(5, 20, 4, 10, 25, 11); v.box(4, 20, 4, 4, 25, 4, 'white'); v.box(11, 20, 4, 11, 25, 4, 'white'); v.box(4, 20, 11, 4, 25, 11, 'white'); v.box(11, 20, 11, 11, 25, 11, 'white');
  v.cyl(7.5, 21, 7.5, 2, 3, 'gold'); v.set(7, 20, 7, 'gold');
  v.box(3, 26, 3, 12, 26, 12, 'gold'); v.cone(7.5, 27, 7.5, 6, 12, 'roofBlue');
  v.cyl(7.5, 12, 11.6, 2.4, 1, 'white');
});
PROP('stjerneglobus', [20, 28, 20], v => {
  v.cyl(9.5, 0, 9.5, 5, 1, 'gold'); v.box(9, 1, 9, 10, 7, 10, 'gold');
  v.sphere(9.5, 15, 9.5, 7, 'navySoft');
  v.paint((x, y, z, c) => (c === F.PAL.navySoft && H2(x * 3 + z, y, 11) < 0.12 ? 'butter' : null));
  for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; v.set(Math.round(9.5 + Math.cos(t) * 8), 15, Math.round(9.5 + Math.sin(t) * 8), 'gold'); }
  finial(v, 'star', 9.5, 23, 9.5);
});
PROP('lavendelrad', [32, 8, 16], v => {
  for (let r = 0; r < 3; r++) for (let x = 1; x < 31; x++) { v.set(x, 0, 2 + r * 5, 'leaf'); v.box(x, 1, 2 + r * 5, x, 2 + (x % 2), 2 + r * 5, (x + r) % 3 ? 'lavField' : 'lavender'); }
});
PROP('snømann', [14, 26, 14], v => {
  v.sphere(6.5, 4, 6.5, 5, 'snow'); v.sphere(6.5, 12, 6.5, 3.8, 'snow'); v.sphere(6.5, 18, 6.5, 3, 'snow');
  v.set(5, 19, 9, 'black'); v.set(8, 19, 9, 'black'); v.box(6, 18, 9, 7, 18, 11, 'orange');
  v.box(3, 21, 3, 10, 21, 10, 'red'); v.box(4, 22, 4, 9, 24, 9, 'red'); v.set(6, 25, 6, 'white');
  v.box(3, 14, 9, 10, 15, 9, 'sky');
});
PROP('isspir', [22, 32, 22], v => {
  const sp = [[11, 11, 3.5, 28], [5, 7, 2, 16], [16, 6, 2.2, 18], [6, 16, 2, 14], [17, 16, 2.4, 20]];
  for (const [x, z, r, h] of sp) v.cone(x, 0, z, r, h, 'ice');
  v.paint((x, y, z, c) => (c === F.PAL.ice && (x + y) % 5 === 0 ? 'white' : null));
});
PROP('krystallspir', [22, 36, 22], v => {
  const sp = [[11, 11, 3.5, 32], [5, 7, 2, 18], [16, 6, 2.2, 22], [6, 16, 2, 15], [17, 16, 2.4, 24]];
  sp.forEach(([x, z, r, h], i) => v.cone(x, 0, z, r, h, i % 2 ? 'lavender' : 'crystal'));
  v.paint((x, y, z, c) => (c === F.PAL.crystal && y % 6 === 0 ? 'white' : null));
});
PROP('krystallhaug', [24, 14, 24], v => {
  v.ellipsoid(12, 0, 12, 10, 3, 9, 'stone2');
  for (let k = 0; k < 9; k++) { const x = 4 + Math.floor(H2(k, 3, 9) * 16), z = 4 + Math.floor(H2(k, 4, 9) * 16); v.cone(x, 2, z, 1.6, 5 + (k % 4) * 2, ['crystal', 'lavender', 'gem2', 'gem1'][k % 4]); }
});
PROP('regnbuebue', [36, 22, 4], v => {
  for (let a = 0; a <= 60; a++) { const t = a / 60 * Math.PI; for (let k = 0; k < 6; k++) { const r = 16 - k; v.box(Math.round(17.5 - Math.cos(t) * r), Math.round(Math.sin(t) * r), 1, Math.round(17.5 - Math.cos(t) * r), Math.round(Math.sin(t) * r), 2, RAINBOW[k]); } }
  for (const x of [1, 33]) { v.sphere(x + 0.5, 1, 1.5, 2.2, 'white'); v.sphere(x + 1.5, 2, 1.5, 1.8, 'white'); }
});
PROP('fargebed', [28, 6, 18], v => {
  for (let x = 1; x < 27; x++) for (let z = 1; z < 17; z++) { v.set(x, 0, z, 'soil'); if ((z % 3) !== 0) { v.set(x, 1, z, 'leaf'); v.set(x, 2, z, RAINBOW[Math.floor(x / 4.5) % 6]); } }
  v.box(0, 0, 0, 27, 1, 0, 'white'); v.box(0, 0, 17, 27, 1, 17, 'white'); v.box(0, 0, 0, 0, 1, 17, 'white'); v.box(27, 0, 0, 27, 1, 17, 'white');
});

/* ------------------------------------------------------------ building site (state 'site'): fence, scaffolds, crane, cube piles */
D('cg_fence', { size: [86, 6, 2], scale: 1 / 2,
  build(v, o) {
    const L = Math.min(84, Math.round((o.len || 20) * 2)), x0 = 43 - Math.round(L / 2), x1 = x0 + L - 1;
    for (let x = x0; x <= x1; x += 4) v.box(x, 0, 0, x, 3, 0, 'woodLight');
    v.box(x0, 1, 0, x1, 1, 0, (o.c || 'butter')); v.box(x0, 3, 0, x1, 3, 0, 'white');
    for (let x = x0; x <= x1; x++) if ((x >> 1) & 1) v.set(x, 1, 1, 'coral');
  } });
D('cg_stillas', { size: [18, 26, 18], scale: 1 / 4,
  build(v) {
    for (const x of [1, 16]) for (const z of [1, 16]) v.box(x, 0, z, x, 24, z, 'woodLight');
    for (const y of [8, 16, 24]) { v.box(1, y, 1, 16, y, 16, 'wood'); v.clear(3, y, 3, 14, y, 14); v.box(1, y, 1, 16, y, 3, 'woodLight'); }
    v.line(1, 0, 1, 16, 8, 1, 'woodDark'); v.line(16, 8, 16, 1, 16, 16, 'woodDark');
    v.box(6, 0, 6, 11, 5, 11, 'stone2'); v.box(7, 6, 7, 10, 7, 10, 'stone');
  } });
// the crane: mast + cabin in the body, the jib (with its hook) is a part that turns slowly (P1 animation, F.Things 'rk_bygg' tick)
D('cg_kran', { size: [40, 64, 10], scale: 1 / 4,
  build(v) {
    v.box(10, 0, 2, 17, 2, 7, 'stone2');
    for (let y = 2; y < 56; y++) { v.set(12, y, 3, 'yellow'); v.set(15, y, 3, 'yellow'); v.set(12, y, 6, 'yellow'); v.set(15, y, 6, 'yellow'); if (y % 4 === 0) { v.box(12, y, 3, 15, y, 3, 'yellow'); v.box(12, y, 6, 15, y, 6, 'yellow'); } }
  },
  parts: { jib: { pivot: [13.5, 56, 4.5], build(v) {
    v.box(2, 56, 3, 38, 58, 6, 'yellow'); for (let x = 2; x < 39; x += 3) v.set(x, 59, 4, 'orange');
    v.box(11, 59, 2, 16, 62, 7, 'sky'); v.box(2, 52, 3, 7, 55, 6, 'stone2');
    v.box(34, 40, 4, 34, 55, 4, 'black'); v.box(32, 36, 3, 36, 39, 6, 'gold');
  } } } });
D('cg_kubehaug', { size: [16, 12, 16], scale: 1 / 4,
  build(v, o) {
    const cs = [o.c1 || 'pink', o.c2 || 'white', o.c3 || 'gold'];
    let k = 0;
    for (let y = 0; y < 3; y++) for (let x = y * 2; x < 14 - y * 2; x += 4) for (let z = y * 2; z < 14 - y * 2; z += 4) { v.box(x, y * 4, z, x + 3, y * 4 + 3, z + 3, cs[(k++) % 3]); }
  } });

D('cg_byggeskilt', { size: [14, 18, 3], scale: 1 / 4,
  build(v, o) {
    for (const x of [2, 11]) v.box(x, 0, 1, x, 12, 1, 'woodDark');
    v.box(1, 6, 0, 12, 15, 0, 'woodLight'); v.box(1, 6, 0, 12, 6, 0, 'wood'); v.box(1, 15, 0, 12, 15, 0, 'wood');
    // a little castle silhouette + the kingdom emblem
    v.box(3, 8, 0, 4, 11, 0, o.col || 'pink'); v.box(9, 8, 0, 10, 11, 0, o.col || 'pink'); v.box(5, 8, 0, 8, 10, 0, 'white'); v.set(3, 12, 0, o.col || 'pink'); v.set(10, 12, 0, o.col || 'pink');
    emblem(v, o.emb || 'heart', 4, 14, 0, o.col || 'pink', 'white');
    v.box(4, 0, 0, 9, 1, 2, 'yellow'); v.set(5, 1, 0, 'black'); v.set(7, 1, 0, 'black');
  } });

/* =====================================================================================================================
   Assembly
   ===================================================================================================================== */
const SIZES = {
  liten: { keep: { w: 16, d: 12, h: 10 }, towers: 2, tall: false, wall: false, hedge: false, tr: 2.5, th: 3 },
  middels: { keep: { w: 20, d: 14, h: 12 }, towers: 4, tall: false, wall: false, hedge: true, tr: 3, th: 4 },
  stor: { keep: { w: 26, d: 16, h: 14 }, towers: 4, tall: true, wall: true, hedge: false, tr: 3, th: 4 },
};
const WINDOWS = { blomst: 'round', hest: 'arch', boble: 'round', skjell: 'round', kake: 'arch', musikk: 'arch', stjerne: 'star', sno: 'arch', krystall: 'star', regnbue: 'round' };
const KZ = -2;                                    // keep front (door) z, castle-local
const FOOT = { x0: -30, z0: -25, x1: 30, z1: 25 };
F.CastleGen.FOOT = FOOT;
F.CastleGen.SIZES = SIZES;
F.CastleGen.KZ = KZ;
// fix wave (review:parent #4): the first kingdom must not look like home (red gabled roof + tri-colour cones)
const SHAPE = { blomst: { roof: 'dome', roof2: 'dome', glassRoof: 'towers' } };   // pink flower dome on the keep, glass greenhouse domes on the towers
function spec(r) {
  r = r || {};
  if (SHAPE[r.id]) r = Object.assign({}, r, SHAPE[r.id]);
  const S = SIZES[r.size] || SIZES.middels, pal = Object.assign({ wall: 'stone', wall2: 'stone2', roof: 'roofPink', trim: 'gold', flag: 'pink' }, r.pal || {});
  const win0 = WINDOWS[r.id] || ['arch', 'round', 'star'][Math.floor(H2((r.k || 1) * 7, 3, 17) * 3)];
  return { id: r.id, size: r.size || 'middels', keep: Object.assign({}, S.keep), towers: S.towers, tall: S.tall, wall: S.wall, hedge: S.hedge, tr: S.tr, th: S.th,
    roof: r.roof || 'cone', roof2: r.roof2 || 'cone', pal, emblem: r.emblem || 'heart', finial: r.finial || null, props: (r.props || []).slice(0, 2), windows: win0,
    style: r.style || null, rainbow: !!r.rainbow, glassRoof: r.glassRoof === 'towers' ? 'towers' : !!r.glassRoof, pier: !!r.pier };
}
F.CastleGen.spec = spec;
// roof colours: dome/onion use the roof colour + white accents; cones get shingle stripes in a lighter tone
const ROOF2 = { roofPink: 'blossom', roofRed: 'coral', roofBlue: 'sky', roofLilac: 'lavender', roofMint: 'mint', teal: 'mint', sky: 'white', lavender: 'white' };
function parts(r) {
  const S = spec(r), P = S.pal, K = S.keep, out = [];
  const st = S.style ? { style: S.style } : {};
  const add = (id, opts, x, z, y, ry) => out.push({ id, opts: Object.assign({}, opts, id === 'cg_roof' ? st : {}), x, z, y: y || 0, ry: ry || 0 });
  const kz = KZ - K.d / 2;
  const stepped = S.roof === 'stepped';
  add('cg_keep', { w: K.w, d: K.d, h: K.h, wall: P.wall, wall2: P.wall2, trim: P.trim, windows: S.windows, gable: stepped ? 'stepped' : null, roof: P.roof, roof2: ROOF2[P.roof] || 'white', emb: S.emblem, finial: stepped ? S.finial : null, rainbow: S.rainbow }, 0, kz);
  // corner towers
  const tr = S.tr, th = K.h + S.th, rk2 = S.roof2 === 'stepped' ? 'cone' : S.roof2;
  const corners = [[-K.w / 2, KZ - 0.4], [K.w / 2, KZ - 0.4]];
  if (S.towers >= 4) corners.push([-K.w / 2, KZ - K.d + 0.4], [K.w / 2, KZ - K.d + 0.4]);
  corners.forEach(([x, z], i) => {
    add('cg_tower', { r: tr, h: th, wall: P.wall, wall2: P.wall2, trim: P.trim, windows: S.windows, rainbow: S.rainbow }, x, z);
    add('cg_roof', { kind: rk2, r: tr + 0.5, col: P.roof, col2: ROOF2[P.roof] || 'white', finial: i < 2 ? S.finial : null, rainbow: S.rainbow, glass: S.glassRoof && rk2 === 'dome' }, x, z, th);
  });
  // centre piece on the keep (not for stepped gables): a drum + the kingdom roof
  if (!stepped) {
    const rc = Math.min(K.w, K.d) * 0.3, dh = S.roof === 'sail' ? 6 : 3;
    add('cg_tower', { r: rc, h: dh + 1, wall: P.wall, wall2: P.wall2, trim: P.trim, windows: S.windows, rainbow: S.rainbow }, 0, kz, K.h - 1);
    add('cg_roof', { kind: S.roof, r: rc + 0.4, col: P.roof, col2: ROOF2[P.roof] || 'white', finial: S.finial, rainbow: S.rainbow, glass: S.glassRoof === true }, 0, kz, K.h + dh);
  }
  // tall tower behind the keep (stor)
  if (S.tall) {
    const tz = KZ - K.d - 0.5, h = K.h + 13;
    add('cg_tower', { r: 3, h, wall: P.wall, wall2: P.wall2, trim: P.trim, windows: S.windows, rainbow: S.rainbow }, 0, tz);
    add('cg_roof', { kind: S.roof === 'stepped' ? 'cone' : (S.roof === 'dome' ? 'onion' : S.roof === 'sail' ? 'cone' : S.roof), r: 3.5, col: P.roof, col2: ROOF2[P.roof] || 'white', finial: S.finial, rainbow: S.rainbow }, 0, tz, h);
  }
  // flags on the keep's front corners
  for (const sx of [-1, 1]) add('cg_flag', { col: P.flag, emb: S.emblem }, sx * (K.w / 2 - 2.5), KZ - 1.2, K.h + 1);
  // hanging banners either side of the door (fix wave: the home-castle facade kit)
  for (const sx of [-1, 1]) add('cg_banner', { col: P.flag, trim: P.trim, emb: S.emblem }, sx * 3.4, KZ + 0.15, Math.max(2.5, K.h - 6.5));
  // curtain wall (stor) or a low hedge ring (middels)
  if (S.wall) {
    const X = K.w / 2 + 7, ZB = KZ - K.d - 5, ZF = KZ + 9, wo = { h: 4, wall: P.wall, wall2: P.wall2, trim: P.trim };
    add('cg_wall', Object.assign({ len: 2 * X }, wo), 0, ZB - 0.75);
    add('cg_wall', Object.assign({ len: ZF - ZB }, wo), -X - 0.75, (ZF + ZB) / 2, 0, Math.PI / 2);
    add('cg_wall', Object.assign({ len: ZF - ZB }, wo), X + 0.75, (ZF + ZB) / 2, 0, Math.PI / 2);
    const fl = X - 5.2;
    add('cg_wall', Object.assign({ len: fl }, wo), -(X + 5.2) / 2, ZF - 0.75);
    add('cg_wall', Object.assign({ len: fl }, wo), (X + 5.2) / 2, ZF - 0.75);
    add('cg_gate', { wall: P.wall, wall2: P.wall2, trim: P.trim, emb: S.emblem, roof: P.roof }, 0, ZF - 3);
  } else if (S.hedge) {
    const X = K.w / 2 + 5, ZB = KZ - K.d - 4, ZF = KZ + 6, fl = P.flag;
    add('cg_hedge', { len: 2 * X, fl }, 0, ZB);
    add('cg_hedge', { len: ZF - ZB, fl }, -X, (ZF + ZB) / 2, 0, Math.PI / 2);
    add('cg_hedge', { len: ZF - ZB, fl }, X, (ZF + ZB) / 2, 0, Math.PI / 2);
    add('cg_hedge', { len: X - 3.5, fl }, -(X + 3.5) / 2, ZF);
    add('cg_hedge', { len: X - 3.5, fl }, (X + 3.5) / 2, ZF);
  }
  // theme props
  propSpots(S).forEach((p, i) => { const name = S.props[i]; if (name && V.has('cg_prop_' + name)) out.push({ id: 'cg_prop_' + name, opts: {}, x: p[0], z: p[1], y: 0, ry: p[2] || 0, prop: name }); });
  return out;
}
function propSpots(S) {
  const K = S.keep;
  const sp = S.wall ? [[19, 15, 0], [-19, 17, 0]] : [[-(K.w / 2 + 8), KZ + 3, 0], [K.w / 2 + 8, KZ + 3, 0]];
  S.props.forEach((name, i) => { if (name === 'brygge') sp[i] = [23, 14, 0]; if (name === 'båt') sp[i] = [S.wall ? 22 : 18, 18, 0.3]; });
  return sp;
}
F.CastleGen.parts = parts;
// colliders (castle-local AABBs)
function boxes(r) {
  const S = spec(r), K = S.keep, out = [];
  const B = (x0, z0, x1, z1) => out.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  B(-K.w / 2, KZ - K.d, K.w / 2, KZ);
  const tr = S.tr * 0.9;
  const corners = [[-K.w / 2, KZ - 0.4], [K.w / 2, KZ - 0.4]];
  if (S.towers >= 4) corners.push([-K.w / 2, KZ - K.d + 0.4], [K.w / 2, KZ - K.d + 0.4]);
  for (const [x, z] of corners) B(x - tr, z - tr, x + tr, z + tr);
  if (S.tall) B(-2.7, KZ - K.d - 3.3, 2.7, KZ - K.d + 0.5);
  if (S.wall) {
    const X = K.w / 2 + 7, ZB = KZ - K.d - 5, ZF = KZ + 9;
    B(-X - 1.6, ZB - 1.6, X + 1.6, ZB); B(-X - 1.6, ZB, -X, ZF); B(X, ZB, X + 1.6, ZF);
    B(-X - 1.6, ZF - 1.6, -2.0, ZF); B(2.0, ZF - 1.6, X + 1.6, ZF);
    B(-5.5, ZF - 5, -2.0, ZF + 0.4); B(2.0, ZF - 5, 5.5, ZF + 0.4);
  } else if (S.hedge) {
    const X = K.w / 2 + 5, ZB = KZ - K.d - 4, ZF = KZ + 6;
    B(-X - 0.6, ZB - 0.6, X + 0.6, ZB + 0.6); B(-X - 0.6, ZB, -X + 0.6, ZF); B(X - 0.6, ZB, X + 0.6, ZF);
    B(-X - 0.6, ZF - 0.6, -3.5, ZF + 0.6); B(3.5, ZF - 0.6, X + 0.6, ZF + 0.6);
  }
  propSpots(S).forEach((p, i) => { const name = S.props[i]; if (!name) return; if (name === 'brygge') { B(p[0] - 1.2, p[1], p[0] + 1.2, p[1] + 16); return; } const h = name === 'lavendelrad' || name === 'fargebed' || name === 'blomsterbed' ? 2.6 : 2.2; B(p[0] - h, p[1] - h * 0.7, p[0] + h, p[1] + h * 0.7); });
  return out;
}
F.CastleGen.boxes = boxes;
// spots (castle-local): door (outside the keep door), gate (arrival / royals greet), market stalls, signpost, garden, throne-side
function layout(r) {
  const S = spec(r), K = S.keep;
  return {
    door: { x: 0, z: KZ + 0.7 }, doorOut: { x: 0, z: KZ + 2.4 },
    gate: { x: 0, z: S.wall ? KZ + 12.5 : KZ + 9 },
    market: [{ x: -9, z: 14, ry: Math.PI / 2 }, { x: 9, z: 14, ry: -Math.PI / 2 }, { x: -9, z: 20.5, ry: Math.PI / 2 }],
    sign: { x: 4.6, z: 22.5 },
    garden: { x: -(K.w / 2 + 4), z: KZ + 3 }, market0: { x: 0, z: 17 },
    keep: { x0: -K.w / 2, z0: KZ - K.d, x1: K.w / 2, z1: KZ }, wall: S.wall, hedge: S.hedge,
  };
}
F.CastleGen.layout = layout;
// building site parts (state 'site'), castle-local
function siteParts(r) {
  const S = spec(r), P = S.pal, out = [];
  const add = (id, opts, x, z, ry) => out.push({ id, opts: opts || {}, x, z, y: 0, ry: ry || 0 });
  const X = 15, Z0 = -14, Z1 = 10;
  add('cg_fence', { len: 2 * X, c: P.flag }, 0, Z0);
  add('cg_fence', { len: Z1 - Z0, c: P.flag }, -X, (Z0 + Z1) / 2, Math.PI / 2);
  add('cg_fence', { len: Z1 - Z0, c: P.flag }, X, (Z0 + Z1) / 2, Math.PI / 2);
  add('cg_fence', { len: X - 3, c: P.flag }, -(X + 3) / 2, Z1);
  add('cg_fence', { len: X - 3, c: P.flag }, (X + 3) / 2, Z1);
  const cubes = { c1: P.wall, c2: P.roof, c3: P.trim };
  add('cg_kubehaug', cubes, -9, 4); add('cg_kubehaug', cubes, 9, 5, 0.6); add('cg_kubehaug', cubes, -3, -9, 1.2);
  return out;
}
F.CastleGen.siteParts = siteParts;
F.CastleGen.siteThings = () => [{ kind: 'stillas', x: -8, z: -6 }, { kind: 'stillas', x: 0, z: -5 }, { kind: 'stillas', x: 6, z: 2 }, { kind: 'skilt', x: 4.5, z: 13 }, { kind: 'kran', x: 8, z: -8 }];
// whole castle as one group (gallery, previews, ceremony)
F.CastleGen.build = function (r, o) {
  o = o || {};
  const g = new THREE.Group(); g.name = 'castle_' + (r && r.id);
  for (const p of (o.site ? siteParts(r) : parts(r))) {
    const m = V.make(p.id, p.opts); m.position.set(p.x, p.y, p.z); m.rotation.y = p.ry; g.add(m);
  }
  return g;
};
// triangle count of a castle's merged parts (perf gate: ≤ 40k)
F.CastleGen.tris = function (r) {
  let n = 0;
  for (const p of parts(r)) {
    const e = V.geometry(p.id, p.opts);
    const cnt = geos => { let k = 0; for (const c of ['opaque', 'glass', 'glow']) { const g = geos && geos[c]; if (g) k += (g.index ? g.index.count : g.attributes.position.count) / 3; } return k; };
    n += cnt(e.body); for (const pn in e.parts) n += cnt(e.parts[pn].geo);
  }
  return Math.round(n);
};
})();
