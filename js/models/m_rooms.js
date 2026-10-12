/* Feslottet – MODELS-1: dollhouse room shells r_<room> (scale 1/4 m) + lift-free door passage.
   Every shell: grid 56 x 23 x 40 voxels = 14 m (x) x 5.75 m (y) x 10 m (z). Origin = bottom centre (VOX rule), so place a shell at
   (c*15 + 7, f*6 - 0.25, 5) in inScene coordinates: the walkable FLOOR TOP is 0.25 m above the origin (F.ROOMKIT.FLOOR_TOP).
   Open front (z = 10 m), back wall z 0..0.5 m, side walls x 0..0.5 / 13.5..14 m (inner faces at 0.5 and 13.5 m).
   Side door gaps at z 3.5..6.5 m, 3 m tall (arched) only where a neighbour exists (see doors in F.ROOMKIT.rooms).
   Back-wall windows are at x 2.5..4 m and 10..11.5 m (none in Hallen; Heisen 1 and Badet only the left one). Keep the back-wall
   centre x 5..9 m free for thrones, beds, lift, doors.
   F.ROOMKIT.rooms: [{id, key, num, name, col, floor, doorL, doorR}]   F.ROOMKIT.at(col, floor) -> room
   r_fetarn takes opts {tapet:'blomst'|'stripe'} (Møbelbua wallpaper slot). r_dorgang = 1 m door passage between two rooms
   (place at x = c*15 + 14.5, y = f*6 - 0.25, z = 5). Palette names only. */
(function () {
'use strict';
const F = window.F, V = F.VOX;
const W = 56, H = 23, D = 40;
const ROOMS = [
  { id: 'r_kjokken', key: 'kjokken', num: 10, name: 'Kjøkkenet', col: 0, floor: 0 },
  { id: 'r_spisesal', key: 'spisesal', num: 11, name: 'Spisesalen', col: 1, floor: 0 },
  { id: 'r_hallen', key: 'hallen', num: null, name: 'Hallen', col: 2, floor: 0 },
  { id: 'r_tronsal', key: 'tronsal', num: 12, name: 'Tronsalen', col: 3, floor: 0 },
  { id: 'r_ballsal', key: 'ballsal', num: 13, name: 'Ballsalen', col: 4, floor: 0 },
  { id: 'r_bibliotek', key: 'bibliotek', num: 14, name: 'Biblioteket', col: 0, floor: 1 },
  { id: 'r_musikkrom', key: 'musikkrom', num: 15, name: 'Musikkrommet', col: 1, floor: 1 },
  { id: 'r_heis1', key: 'heis1', num: null, name: 'Heisen', col: 2, floor: 1 },
  { id: 'r_skattkammer', key: 'skattkammer', num: 16, name: 'Skattkammeret', col: 3, floor: 1 },
  { id: 'r_ordmuseum', key: 'ordmuseum', num: 17, name: 'Ordmuseet', col: 4, floor: 1 },
  { id: 'r_prinsesse', key: 'prinsesse', num: 18, name: 'Prinsessens rom', col: 0, floor: 2 },
  { id: 'r_soverom', key: 'soverom', num: 19, name: 'Kongeparets soverom', col: 1, floor: 2 },
  { id: 'r_heis2', key: 'heis2', num: null, name: 'Heisen', col: 2, floor: 2 },
  { id: 'r_bad', key: 'bad', num: 20, name: 'Badet', col: 3, floor: 2 },
  { id: 'r_garderobe', key: 'garderobe', num: null, name: 'Garderoben', col: 4, floor: 2 },
  { id: 'r_stjernetarn', key: 'stjernetarn', num: null, name: 'Stjernetårnet', col: 1, floor: 3 },
  { id: 'r_fetarn', key: 'fetarn', num: null, name: 'Fetårnet', col: 2, floor: 3 },
];
const at = (c, f) => ROOMS.find(r => r.col === c && r.floor === f) || null;
ROOMS.forEach(r => { r.doorL = !!at(r.col - 1, r.floor); r.doorR = !!at(r.col + 1, r.floor); });

/* style per room: wall pattern, colours, wainscot, floor, curtains, extras */
const S = {
  kjokken: { wall: 'butter', wall2: 'cream', pat: 'tiles', wains: 'brick', wains2: 'cream', wainH: 8, frieze: 'coral', floor: ['checker', 'cream', 'peach', 2], curtain: 'coral' },
  spisesal: { wall: 'peach', wall2: 'coral', pat: 'dots', wains: 'woodRed', wains2: 'wood', frieze: 'gold', floor: ['planks', 'woodLight', 'wood'], curtain: 'roofRed' },
  hallen: { win: [false, false], wall: 'cream2', wall2: 'stone2', pat: 'diamond', wains: 'stone2', wains2: 'stone', frieze: 'gold', floor: ['marble', 'pathStone', 'stone2'], curtain: null },
  tronsal: { wall: 'lavender', wall2: 'butter', pat: 'crowns', wains: 'lilac', wains2: 'lavender', frieze: 'gold', floor: ['checker', 'stone', 'stone2', 2], curtain: 'roofPink' },
  ballsal: { wall: 'blossom', wall2: 'white', pat: 'stripes', wains: 'white', wains2: 'blossom', frieze: 'gold', floor: ['checker', 'white', 'pink', 2], curtain: 'roofLilac' },
  bibliotek: { wall: 'mint', wall2: 'teal', pat: 'dots', wains: 'wood', wains2: 'woodDark', wainH: 9, frieze: 'woodDark', floor: ['planks', 'wood', 'woodDark'], curtain: 'teal' },
  musikkrom: { wall: 'sky', wall2: 'white', pat: 'notes', wains: 'woodLight', wains2: 'wood', frieze: 'navySoft', floor: ['planks', 'woodLight', 'honey'], curtain: 'roofBlue' },
  heis1: { win: [true, false], wall: 'cream2', wall2: 'gold', pat: 'stripes', wains: 'woodRed', wains2: 'wood', frieze: 'gold', floor: ['marble', 'pathStone', 'stone2'], curtain: null },
  skattkammer: { wall: 'butter', wall2: 'honey', pat: 'diamond', wains: 'stone2', wains2: 'stone', frieze: 'gold', floor: ['checker', 'stone2', 'honey', 2], curtain: null },
  ordmuseum: { wall: 'lilac', wall2: 'white', pat: 'pilasters', wains: 'white', wains2: 'lavender', frieze: 'gold', floor: ['parquet', 'woodLight', 'wood'], curtain: 'plum' },
  prinsesse: { wall: 'blossom', wall2: 'white', pat: 'hearts', wains: 'white', wains2: 'pink', frieze: 'rose', floor: ['carpet', 'lavender', 'lilac', 'white'], curtain: 'rose' },
  soverom: { wall: 'sky', wall2: 'white', pat: 'stars', wains: 'lavender', wains2: 'lilac', frieze: 'gold', floor: ['carpet', 'lavender', 'white', 'gold'], curtain: 'roofLilac' },
  heis2: { wall: 'cream2', wall2: 'gold', pat: 'stripes', wains: 'woodRed', wains2: 'wood', frieze: 'gold', floor: ['marble', 'pathStone', 'stone2'], curtain: null },
  bad: { win: [true, false], wall: 'ice', wall2: 'white', pat: 'tiles', wains: 'mint', wains2: 'white', wainH: 9, frieze: 'teal', floor: ['checker', 'white', 'mint', 1], curtain: 'mint' },
  garderobe: { wall: 'peach', wall2: 'lilac', pat: 'stripes', wains: 'white', wains2: 'peach', frieze: 'plum', floor: ['carpet', 'blossom', 'white', 'lilac'], curtain: 'plum' },
  stjernetarn: { wall: 'roofBlue', wall2: 'butter', pat: 'stars', wains: 'navySoft', wains2: 'roofBlue', frieze: 'gold', floor: ['round', 'woodLight', 'navySoft', 'butter'], curtain: null },
  fetarn: { wall: 'lilac', wall2: 'butter', pat: 'stars', wains: 'white', wains2: 'lavender', frieze: 'pink', floor: ['round', 'woodLight', 'blossom', 'mint'], curtain: 'pink' },
};
const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
const NOTE = ['.XX', '.X.', '.X.', 'XX.', 'XX.'];
const STAR = ['.X.', 'XXX', '.X.'];
const CROWN = ['X.X.X', 'XXXXX', 'XXXXX'];
const glyph = (g, u, y, pu, py) => { const gu = u - pu, gy = py - y; return gy >= 0 && gy < g.length && gu >= 0 && gu < g[0].length && g[gy][gu] === 'X'; };
// wallpaper colour at (u along wall, y up)
function paper(s, u, y) {
  const a = s.wall, b = s.wall2;
  switch (s.pat) {
    case 'stripes': return ((u >> 1) % 3 === 0) ? b : a;
    case 'dots': return (u % 6 === 0 && y % 6 === 0) || (u % 6 === 3 && y % 6 === 3) ? b : a;
    case 'diamond': { const p = (u + y) % 8, q = (u - y + 80) % 8; return (p === 0 || q === 0) ? b : a; }
    case 'tiles': return (u % 3 === 2 || y % 3 === 2) ? b : a;
    case 'hearts': { const pu = Math.floor(u / 10) * 10 + ((Math.floor(y / 8) & 1) ? 5 : 1), py = Math.floor(y / 8) * 8 + 6; return glyph(HEART, u, y, pu, py) ? 'rose' : a; }
    case 'notes': { const pu = Math.floor(u / 9) * 9 + ((Math.floor(y / 7) & 1) ? 4 : 1), py = Math.floor(y / 7) * 7 + 6; return glyph(NOTE, u, y, pu, py) ? b : a; }
    case 'stars': { const pu = Math.floor(u / 7) * 7 + ((Math.floor(y / 6) & 1) ? 3 : 0), py = Math.floor(y / 6) * 6 + 4; return glyph(STAR, u, y, pu, py) ? b : a; }
    case 'crowns': { const pu = Math.floor(u / 10) * 10 + ((Math.floor(y / 7) & 1) ? 5 : 2), py = Math.floor(y / 7) * 7 + 5; return glyph(CROWN, u, y, pu, py) ? b : a; }
    case 'pilasters': return (u % 14 < 2) ? b : a;
    case 'flowers': { const pu = Math.floor(u / 8) * 8 + ((Math.floor(y / 6) & 1) ? 4 : 0), py = Math.floor(y / 6) * 6 + 4; if (glyph(STAR, u, y, pu, py)) return (u - pu === 1 && py - y === 1) ? 'butter' : 'rose'; return (u + y) % 11 === 0 ? 'leaf' : a; }
  }
  return a;
}
function wallCol(s, u, y) {
  const wh = s.wainH || 6;
  if (y === 1) return 'white';                                    // skirting
  if (y <= wh) {
    if (s.wains === 'brick') { const row = (y - 2) >> 1, off = (row & 1) * 2; return ((y - 2) % 2 === 1 || (u + off) % 4 === 0) ? s.wains2 : 'brick'; }
    return (u % 8 === 0 || y === 2 || y === wh) ? s.wains2 : s.wains;  // framed wainscot panels
  }
  if (y === wh + 1) return 'white';                                // chair rail
  if (y === 20) return s.frieze;
  if (y >= 21) return 'white';                                     // crown moulding
  return paper(s, u, y);
}
function floorCol(s, x, z) {
  const [k, a, b, c] = s.floor;
  switch (k) {
    case 'checker': { const n = c || 2; return (((x >> n) + (z >> n)) & 1) ? b : a; }
    case 'planks': { const row = z >> 1, pid = Math.floor((x + row * 5) / 14); if ((x + row * 5) % 14 === 0) return b; return F.U.hash2(pid, row, 77) < 0.22 ? b : a; }
    case 'parquet': { const bx = x >> 2, bz = z >> 2; return ((bx + bz) & 1) ? ((x & 3) === 0 ? b : a) : ((z & 3) === 0 ? b : a); }
    case 'marble': { const p = (x + z) % 10, q = (x - z + 100) % 10; return (p === 0 || q === 0) ? b : a; }
    case 'carpet': {
      if (x < 5 || x > 50 || z < 4 || z > 37) return ((z >> 1) & 1) && (x + (z >> 1) * 5) % 14 === 0 ? 'woodDark' : 'woodLight';  // wood edge
      if (x === 5 || x === 50 || z === 4 || z === 37) return c || 'white';
      if (x === 7 || x === 48 || z === 6 || z === 35) return c || 'white';
      return ((x + z) % 10 === 0 || (x - z + 100) % 10 === 0) ? b : ((x + z) % 10 === 5 && (x - z + 100) % 10 === 5) ? (c || 'white') : a;
    }
    case 'round': {
      const dx = (x - 27.5) / 20, dz = (z - 21) / 13, r = Math.hypot(dx, dz);
      if (r > 1) return ((z >> 1) & 1) && (x + (z >> 1) * 5) % 14 === 0 ? 'wood' : a;
      const ring = Math.floor(r * 5);
      return [c, b, 'butter', b, c][ring] || b;
    }
  }
  return a;
}
// back-wall window: x0..x0+5 (6 wide), y 6..14, arched; outer layer shows a painted view (sky, cloud, hills)
function backWindow(v, s, x0) {
  const x1 = x0 + 5, y0 = 6, y1 = 15;
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && !(y === y1 && (x === x0 || x === x1)) && !(y === y1 - 1 && false);
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (inside(x, y)) {
      v.set(x, y, 1, 0);
      const hill = y <= y0 + 1 + ((x * 3) % 4 === 0 ? 1 : 0);
      const cloud = (y === y0 + 6 && x >= x0 + 1 && x <= x0 + 3) || (y === y0 + 7 && x === x0 + 2);
      v.set(x, y, 0, hill ? ((x & 1) ? 'grass' : 'leaf2') : cloud ? 'white' : 'sky');
      if (x === x0 + 3 || y === y0 + 5) v.set(x, y, 0, 'white');           // mullions
    } else if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y - 1) || inside(x, y + 1)) v.set(x, y, 1, 'white');
  }
  v.box(x0 - 1, y0 - 1, 2, x1 + 1, y0 - 1, 2, 'white');                     // sill
  if (s.curtain) {
    for (let y = y0 - 2; y <= y1 + 2; y++) { v.set(x0 - 2, y, 2, (y & 1) ? s.curtain : 'white'); v.set(x0 - 3, y, 2, s.curtain); v.set(x1 + 2, y, 2, (y & 1) ? s.curtain : 'white'); v.set(x1 + 3, y, 2, s.curtain); }
    v.box(x0 - 3, y1 + 2, 2, x1 + 3, y1 + 3, 2, s.curtain); v.box(x0 - 3, y1 + 4, 2, x1 + 3, y1 + 4, 2, 'gold');
    v.set(x0 - 3, y0 + 3, 3, 'gold'); v.set(x1 + 3, y0 + 3, 3, 'gold');                      // tie-backs
  }
}
function sconce(v, x, z, y) { v.set(x, y, z, 'gold'); v.set(x, y + 1, z, 'gold'); v.set(x, y + 2, z, 'flame'); v.set(x, y + 3, z, 'flame'); }
function doorGap(v, xw, xi, s) {
  // gap through the side wall (layers xw outer, xi inner) z 14..25, y 1..12 + arch
  for (let y = 1; y <= 15; y++) for (let z = 13; z <= 26; z++) {
    const half = 6, cz = 19.5, dz = Math.abs(z - cz);
    const top = y <= 11 ? half : Math.sqrt(Math.max(0, 36 - (y - 11) ** 2 * 2.2));
    if (dz <= top - 0.5) { v.set(xw, y, z, 0); v.set(xi, y, z, 0); }
    else if (dz <= top + 0.8 && y <= 15) v.set(xi, y, z, s.frieze === 'navySoft' ? 'gold' : 'white');
  }
}
function shell(v, key, room, o) {
  o = o || {};
  const s = Object.assign({}, S[key]);
  if (o.style && typeof o.style === 'object') for (const k in o.style) { const v = o.style[k]; if (v == null || v === '') continue; if (k === 'floor' && !Array.isArray(v)) continue; s[k] = v; }
  if (key === 'fetarn' && o && o.tapet) { const t = String(o.tapet); if (/blomst/.test(t)) { s.pat = 'flowers'; s.wall = 'mint'; } else if (/strip/.test(t)) { s.pat = 'stripes'; s.wall = 'blossom'; s.wall2 = 'butter'; } }
  // floor slab + pattern
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) v.set(x, 0, z, (z === D - 1) ? 'stone2' : floorCol(s, x, z));
  // walls
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) { v.set(x, y, 0, 'stone2'); v.set(x, y, 1, wallCol(s, x, y)); }
    for (let z = 1; z < D; z++) { v.set(0, y, z, 'stone2'); v.set(1, y, z, wallCol(s, z, y)); v.set(W - 1, y, z, 'stone2'); v.set(W - 2, y, z, wallCol(s, D - z, y)); }
  }
  // dollhouse cut: front faces of the side walls get a clean trim
  for (let y = 1; y < H; y++) { v.set(0, y, D - 1, 'cream'); v.set(1, y, D - 1, y % 4 === 0 ? s.frieze : 'white'); v.set(W - 1, y, D - 1, 'cream'); v.set(W - 2, y, D - 1, y % 4 === 0 ? s.frieze : 'white'); }
  v.box(0, H - 1, 0, W - 1, H - 1, 1, 'white'); v.box(0, H - 1, 0, 1, H - 1, D - 1, 'white'); v.box(W - 2, H - 1, 0, W - 1, H - 1, D - 1, 'white');
  const dL = o.doorL != null ? !!o.doorL : room.doorL, dR = o.doorR != null ? !!o.doorR : room.doorR;
  if (dL) doorGap(v, 0, 1, s);
  if (dR) doorGap(v, W - 1, W - 2, s);
  const win = s.win || [true, true];
  if (win[0]) backWindow(v, s, 10); if (win[1]) backWindow(v, s, 40);
  sconce(v, 20, 2, 10); sconce(v, 35, 2, 10);
  extras[key] && extras[key](v, s, o || {});
  if (o.hole) stairHole(v, s, o.hole);
}
// DESIGN2 §2.3: an upper floor over the spiral – floor voxels cleared inside r, a gold rim and a railing ring (r 1.8, 1.6 m open at the front)
function stairHole(v, s, h) {
  const [cx, cz] = h.c || [3.4, 2.3], r = h.r || 1.75, open = 0.8 / 1.8;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const lx = (x + 0.5) / 4, lz = (z + 0.5) / 4, d = Math.hypot(lx - cx, lz - cz);
    if (d < r) { for (let y = 0; y < 1; y++) v.set(x, y, z, 0); continue; }
    if (d < r + 0.26) v.set(x, 0, z, 'gold');
    if (d >= 1.75 && d < 2.0) {
      const a = Math.atan2(lx - cx, lz - cz);
      if (Math.abs(a) <= open) continue;
      if (!v.get(x, 1, z) || true) {
        v.set(x, 4, z, 'gold');
        const k = Math.round(a / 0.28);
        if (Math.abs(a - k * 0.28) < 0.07) for (let y = 1; y <= 3; y++) v.set(x, y, z, 'white');
      }
    }
  }
}
// round-ish tower rooms: diagonal back corners, wallpapered like the walls
function chamfer(v, s) { for (let y = 1; y < H; y++) for (let i = 0; i < 6; i++) { const c = wallCol(s, i * 2, y); v.set(2 + i, y, 7 - i, c); v.set(W - 3 - i, y, 7 - i, c); v.set(2 + i, y, 6 - i, 'stone2'); v.set(W - 3 - i, y, 6 - i, 'stone2'); } }
const extras = {
  hallen(v) {
    // red runner from the front to the back centre + pilasters + crest
    for (let z = 2; z < D - 1; z++) for (let x = 24; x <= 31; x++) v.set(x, 0, z, (x === 24 || x === 31) ? 'gold' : 'roofRed');
    for (const x of [16, 39]) { v.box(x, 1, 2, x + 1, 21, 2, 'stone'); v.box(x - 1, 1, 2, x + 2, 2, 3, 'stone2'); v.box(x - 1, 19, 2, x + 2, 20, 3, 'stone2'); }
    // crest over the centre (top)
    for (let y = 16; y <= 19; y++) for (let x = 25; x <= 30; x++) v.set(x, y, 2, (y === 16 && (x === 25 || x === 30)) ? 0 : 'roofPink');
    v.set(26, 19, 3, 'gold'); v.set(28, 19, 3, 'gold'); v.set(30, 19, 3, 'gold'); v.box(26, 18, 3, 29, 18, 3, 'gold');
  },
  tronsal(v) {
    // dais at the back centre + runner + banners
    v.box(18, 1, 2, 37, 1, 9, 'stone2'); v.box(21, 2, 2, 34, 2, 6, 'stone2');
    v.box(18, 1, 9, 37, 1, 9, 'gold'); v.box(21, 2, 6, 34, 2, 6, 'gold');
    for (let z = 10; z < D - 1; z++) for (let x = 24; x <= 31; x++) v.set(x, 0, z, (x === 24 || x === 31) ? 'gold' : 'roofRed');
    for (const x of [16, 37]) { v.box(x, 8, 2, x + 2, 18, 2, 'roofPink'); v.box(x - 1, 19, 2, x + 3, 19, 2, 'gold'); v.set(x + 1, 15, 3, 'butter'); v.set(x + 1, 14, 3, 'butter'); v.set(x, 14, 3, 'butter'); v.set(x + 2, 14, 3, 'butter'); v.set(x + 1, 8, 2, 0); }
  },
  ballsal(v) {
    // tall mirrors between windows (glass with gold frames)
    for (const x of [22, 31]) { v.box(x - 1, 4, 2, x + 3, 17, 2, 'gold'); v.box(x, 5, 2, x + 2, 16, 2, 'glass'); }
  },
  kjokken(v) {
    // copper pans on a rail + range hood over the back left
    v.box(24, 15, 2, 33, 15, 2, 'steel');
    for (const [x, r] of [[25, 1], [28, 2], [32, 1]]) { v.box(x, 13 - r * 2, 2, x + r, 14, 2, 'honey'); v.set(x + (r > 1 ? 1 : 0), 14, 3, 'honey'); }
  },
  bibliotek(v) {
    // high shelf band with books along the back wall top
    for (let x = 2; x < W - 2; x++) { v.set(x, 16, 2, 'woodDark'); if (x % 7 !== 0) for (let y = 17; y <= 19; y++) v.set(x, y, 2, ['rose', 'sky', 'butter', 'mint', 'lilac', 'coral', 'teal'][(x * 5 + (x >> 2)) % 7]); }
  },
  musikkrom(v) {
    // big gold note on the wall centre
    for (const [x, y] of [[27, 12], [28, 12], [27, 13], [28, 13], [29, 13], [29, 14], [29, 15], [29, 16], [29, 17], [30, 17], [31, 16]]) v.set(x, y, 2, 'gold');
  },
  skattkammer(v) {
    // vault-style round door decoration in the back wall centre + gold heaps in the corners
    for (let y = 4; y <= 18; y++) for (let x = 20; x <= 35; x++) { const q = ((x - 27.5) / 7.5) ** 2 + ((y - 11) / 7.5) ** 2; if (q <= 1) v.set(x, y, 2, q > 0.75 ? 'gold' : q > 0.6 ? 'steel' : 'silver'); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; v.set(Math.round(27.5 + Math.cos(a) * 4), Math.round(11 + Math.sin(a) * 4), 3, 'gold'); }
    for (const [cx, cz] of [[5, 5], [50, 5]]) v.ellipsoid(cx, 0.5, cz, 3.5, 2.5, 3, 'gold');
    for (const [x, z] of [[4, 4], [6, 6], [49, 5], [51, 6]]) v.set(x, 3, z, 'gem1');
  },
  ordmuseum(v) {
    // gold rope barriers on low posts along the back + "museum" arch frieze
    for (let x = 4; x < W - 4; x += 8) { v.box(x, 1, 6, x, 4, 6, 'gold'); }
    for (let x = 4; x < W - 4; x++) v.set(x, 4 - ((x - 4) % 8 > 1 && (x - 4) % 8 < 7 ? 1 : 0), 6, 'roofRed');
  },
  prinsesse(v) {
    // heart garland across the back wall
    for (let x = 4; x < W - 4; x++) { const y = 19 - Math.round(Math.sin(((x - 4) / (W - 8)) * Math.PI) * 2); v.set(x, y, 2, (x % 4 === 0) ? 'rose' : 'gold'); }
  },
  soverom(v) { for (let x = 4; x < W - 4; x++) { const y = 19 - Math.round(Math.sin(((x - 4) / (W - 8)) * Math.PI * 2) * 1); if (x % 3) v.set(x, y, 2, 'butter'); } },
  bad(v) { for (let x = 2; x < W - 2; x++) v.set(x, 9, 2, (x & 1) ? 'teal' : 'white'); },
  garderobe(v) { /* the wall mirrors beside the windows read as frosted ghost panels; the room has a standing mirror (c_fespeil) */ },
  stjernetarn(v, s) {
    // chamfered (round-ish) back corners + a moon
    chamfer(v, s);
    for (let y = 14; y <= 18; y++) for (let x = 25; x <= 30; x++) { const q = ((x - 27.5) / 2.8) ** 2 + ((y - 16) / 2.6) ** 2, q2 = ((x - 29) / 2.4) ** 2 + ((y - 16.6) / 2.4) ** 2; if (q <= 1 && q2 > 1) v.set(x, y, 2, 'butter'); }
  },
  fetarn(v, s) {
    chamfer(v, s);
    // rainbow arch painted above the centre
    const cols = ['rose', 'orange', 'butter', 'mint', 'sky', 'lavender'];
    for (let y = 12; y <= 20; y++) for (let x = 18; x <= 37; x++) { const r = Math.hypot((x - 27.5) / 1.0, (y - 11) * 1.15); const k = Math.floor(9.6 - r); if (k >= 0 && k < 6 && r <= 9.6) v.set(x, y, 2, cols[5 - k]); }
  },
};
for (const room of ROOMS) {
  V.def(room.id, { size: [W, H, D], scale: 1 / 4,
    build(v, o) { shell(v, room.key, room, o); },
    // windows: local x (0..14 m from the room's left edge) of each back-wall window centre (CASTLE puts light shafts only there)
    meta: { group: 'room', room: room.key, num: room.num, name: room.name, col: room.col, floor: room.floor, doorL: room.doorL, doorR: room.doorR, floorTop: 0.25,
      windows: [3.25, 10.75].filter((x, i) => ((S[room.key] && S[room.key].win) || [true, true])[i]),
      variants: room.key === 'fetarn' ? { tapet: ['blomst', 'stripe'] } : undefined } });
}
// 1 m door passage between neighbouring rooms (floor + side jambs + arched lintel); x = c*15 + 14.5
V.def('r_dorgang', { size: [4, 16, 14], scale: 1 / 4,
  build(v) {
    v.box(0, 0, 0, 3, 0, 13, 'pathStone');
    for (let y = 1; y <= 15; y++) for (let z = 0; z <= 13; z++) {
      const dz = Math.abs(z - 6.5), top = y <= 11 ? 6 : Math.sqrt(Math.max(0, 36 - (y - 11) ** 2 * 2.2));
      if (dz > top - 0.5) v.box(0, y, z, 3, y, z, (dz > top + 0.6) ? 'stone2' : 'white');
    }
  },
  meta: { group: 'room', note: 'door passage; walkable floor top 0.25 m' } });
/* ---------------------------------------------------------- DESIGN2 §2.3: spiral staircase segment (one floor gap: 360°, 24 steps of 0.25 m)
   b_spiral: grid 15 × 29 × 15 at 1/4 m, centre voxel 7 (= local 0,0). Column r 0.3, steps r 0.3–1.6 rising counter-clockwise seen from
   above (front +z → +x → back → −x → front), step k (0..23) tops out at (k+1)·0.25 m; gold railing at r 1.65, 1 m above each step. */
// opts {cut:true}: the lower-floor view – everything above the wall top (5.5 m) is left out and the stair ends in a gold ceiling-hatch ring
V.def('b_spiral', { size: [15, 29, 15], scale: 1 / 4,
  build(v0, o) {
    const CUT = 21, cut = !!(o && o.cut);
    const v = cut ? { set: (x, y, z, k) => { if (y <= CUT) v0.set(x, y, z, k); } } : v0;
    const c = 7, n = 24, seg = Math.PI * 2 / n;
    for (let z = 0; z < 15; z++) for (let x = 0; x < 15; x++) {
      const dx = x - c, dz = z - c, d = Math.hypot(dx, dz);
      let th = Math.atan2(dx, dz); if (th < 0) th += Math.PI * 2;
      const k = Math.min(n - 1, Math.floor(th / seg)), frac = th / seg - k;
      if (d <= 1.25) { for (let y = 0; y < n; y++) v.set(x, y, z, (y % 4 === 3) ? 'gold' : 'cream2'); continue; }
      if (d <= 6.45) {
        const edge = frac > 0.84;                                         // the nosing of each step
        const col = edge ? 'gold' : (d > 2.4 && d < 5.2) ? ((k & 1) ? 'roofRed' : 'red') : 'cream';
        v.set(x, k, z, col);
        if (k > 0) v.set(x, k - 1, z, 'stone2');
        if (d > 5.6) for (let y = Math.max(0, k - 3); y < k - 1; y++) v.set(x, y, z, 'cream2');      // the outer stringer: a solid helix band under the steps
      } else if (d <= 7.05 && k <= 21) {
        v.set(x, k + 4, z, 'gold'); if (frac > 0.5) v.set(x, k + 5, z, 'gold');               // handrail (stepped up with the helix)
        if (frac < 0.3) for (let y = k + 1; y <= k + 3; y++) v.set(x, y, z, 'white');           // a baluster on every step
        v.set(x, k, z, 'cream2');
      }
    }
    v.set(c, 24, c, 'gold'); v.set(c, 25, c, 'gold');                      // finial on the column
    if (cut) for (let z = 0; z < 15; z++) for (let x = 0; x < 15; x++) { const d = Math.hypot(x - 7, z - 7); if (d > 5.9 && d <= 7.2) v0.set(x, CUT, z, (Math.round(Math.atan2(x - 7, z - 7) * 4) & 1) ? 'gold' : 'cream2'); }
  },
  meta: { group: 'room', note: 'spiral stair segment, centre at the origin, 6 m rise; place at (cx, 6f, cz)' } });
// v3 WP1 (DESIGN3 §4.3): the way out is a low door that matches its tap area – a 2.6 × 1.0 m red/gold mat with the voxel word UT
// and a glowing arrow (out → +z, toward the camera), between two low lantern posts (1.1 m, warm glow). No arch, no door leaves:
// nothing tall stands on the camera side. The tall «UT» sign board is its own model/thing (b_utskilt), right of the mat.
// Glyphs: rows top → bottom = back (−z) → front (+z), so the word reads upright from the camera.
const GL = {
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
  L: ['..X..', '.X...', 'XXXXX', '.X...', '..X..'],          // ←
  R: ['..X..', '...X.', 'XXXXX', '...X.', '..X..'],          // →
  D: ['..X..', '..X..', 'X.X.X', '.XXX.', '..X..'],          // ↓ (screen down = out of the room)
  // big floor glyphs for the 1.0 m deep mat (6 rows, seen foreshortened from the camera)
  U6: ['X..X', 'X..X', 'X..X', 'X..X', 'X..X', 'XXXX'],
  T6: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..'],
  A6: ['..X..', '..X..', '..X..', 'XXXXX', '.XXX.', '..X..'],     // arrow out (+z = toward the camera)
};
// a glyph flat on the floor: x0 = left column, z0 = top (back) row, at height y
function glyphFloor(v, g, x0, y, z0, col) { const G = GL[g]; for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === 'X') v.set(x0 + q, y, z0 + r, col); }
// a glyph standing upright facing +z: x0 = left column, yTop = top row, at depth z
function glyphWall(v, g, x0, yTop, z, col) { const G = GL[g]; for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === 'X') v.set(x0 + q, yTop - r, z, col); }
V.def('b_portal', { size: [28, 10, 8], scale: 1 / 8,
  build(v) {
    // the mat: x 4..24 (21 voxels = 2.6 m), z 0..7 (1.0 m); gold rim, red field
    v.box(4, 0, 0, 24, 0, 7, 'gold'); v.box(5, 0, 1, 23, 0, 6, 'roofRed');
    // the word UT inlaid in white (and raised one voxel so it catches the light), the arrow glowing
    for (const y of [0, 1]) { glyphFloor(v, 'U6', 6, y, 1, 'white'); glyphFloor(v, 'T6', 11, y, 1, 'white'); glyphFloor(v, 'A6', 18, y, 1, y ? 'glowYellow' : 'butter'); }
    // two low lantern posts (2 × 2 voxels) outside the mat ends, 1.1 m tall with a warm lamp head
    for (const x0 of [1, 25]) {
      v.box(x0, 0, 3, x0 + 1, 5, 4, 'gold'); v.box(x0, 1, 3, x0 + 1, 4, 4, 'woodDark');
      v.box(x0, 6, 3, x0 + 1, 7, 4, 'lamp'); v.box(x0, 8, 3, x0 + 1, 8, 4, 'gold');
    }
  },
  meta: { group: 'room', note: 'exit mat (UT + arrow) with two lantern posts at a room front (thing at lx 7, lz 9.4), front +z; tap box = the mat only' } });
// the tall «UT» sign right of the exit mat: a board (1.4 × 0.75 m) on a post, board y 2.75–3.5 m, facing the camera (+z); same action as the mat
V.def('b_utskilt', { size: [11, 29, 4], scale: 1 / 8,
  build(v) {
    v.box(5, 0, 1, 6, 21, 2, 'woodDark'); v.box(4, 0, 0, 7, 1, 3, 'gold');                       // post + foot
    v.box(0, 22, 1, 10, 28, 2, 'gold'); v.box(1, 23, 1, 9, 27, 2, 'roofRed');                        // board: gold frame, red field
    glyphWall(v, 'U', 2, 27, 3, 'white'); glyphWall(v, 'T', 6, 27, 3, 'white');
    v.set(5, 28, 3, 'lamp');
  },
  meta: { group: 'room', note: 'UT sign board on a post (board 2.75–3.5 m), front +z' } });
// small way-out signs inside the building (DESIGN3 §4.6): «UT ←», «UT →» over a doorway toward the exit, «UT ↓» at the stairs / lift on
// upper floors. opts {dir:'l'|'r'|'d', post: voxels (0 = wall/bracket sign)}. Board 17 × 7 voxels at 1/12 m (1.4 × 0.6 m), facing +z.
V.def('b_utpil', { size: [17, 40, 3], scale: 1 / 12,
  build(v, o) {
    o = o || {}; const dir = o.dir === 'l' ? 'L' : o.dir === 'r' ? 'R' : 'D', post = o.post | 0, y0 = post;
    if (post) { v.box(7, 0, 0, 9, post - 1, 1, 'woodDark'); v.box(6, 0, 0, 10, 0, 1, 'gold'); }
    v.box(0, y0, 0, 16, y0 + 6, 1, 'gold'); v.box(1, y0 + 1, 0, 15, y0 + 5, 1, 'mint');
    const top = y0 + 5;
    if (dir === 'L') { glyphWall(v, 'L', 2, top, 2, 'glowYellow'); glyphWall(v, 'U', 8, top, 2, 'white'); glyphWall(v, 'T', 12, top, 2, 'white'); }
    else { glyphWall(v, 'U', 2, top, 2, 'white'); glyphWall(v, 'T', 6, top, 2, 'white'); glyphWall(v, dir, 10, top, 2, 'glowYellow'); }
  },
  meta: { group: 'room', note: 'way-out sign UT ←/→/↓ (opts dir l|r|d, post height in voxels at 1/12 m)', variants: { dir: ['l', 'r', 'd'] } } });
// outdoor door mat (the keep door, the tower door, royal keep doors): tap it or walk in
V.def('b_dor', { size: [22, 2, 12], scale: 1 / 8,
  build(v) {
    v.box(0, 0, 0, 21, 0, 11, 'gold'); v.box(1, 0, 1, 20, 0, 10, 'roofPink');
    for (const [hx, hy] of [[-1, 0], [1, 0], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, -2], [0, -2], [1, -2], [0, -3]]) v.set(10 + hx, 1, 7 + hy, 'white');
    for (const x of [4, 17]) { v.set(x, 1, 3, 'butter'); v.set(x - 1, 1, 4, 'butter'); v.set(x + 1, 1, 4, 'butter'); }
  },
  meta: { group: 'room', note: 'door mat in front of a building door' } });
F.ROOMKIT = { rooms: ROOMS, at, FLOOR_TOP: 0.25, CELL: { w: 14, d: 10, h: 5.5, pitchX: 15, pitchY: 6 },
  place: r => [r.col * 15 + 7, r.floor * 6 - 0.25, 5] };
})();
