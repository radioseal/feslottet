/* Feslottet – MODELS-3: Slottsparken (castle park) props, DESIGN §7 items 86–122. Front = +z, origin = bottom centre.
   p_bod (Feens bod: her stall; meta.shelves = stock spots, meta.sign = HTML sign anchor; parts 'awning', 'bell')
   p_bronn (parts bucket, crank)  p_flagg (part 'flag' at the top; meta.flag = label anchor)  p_klokketarn (part 'bell')
   p_fontene (part 'jet')  p_huske (parts seat, seat2; swing = rotation.x)  p_sklie  p_vippe (part 'plank'; tilt = rotation.x)
   p_sandkasse (part 'spade')  p_trampoline (part 'mat')  p_karusell (part 'top' = rotor)  p_andedam (duck house; part 'ducks')
   p_robat (part 'oars')  p_svaner (parts swan1, swan2)  p_rosebed (part 'roses')  p_hekkdyr{shape:'klump'|'kanin'|'hjerte'|'svane'}
   p_hekk{kind:'rett'|'hjorne'|'ende'|'t'|'kryss'} (2 m maze cells, 1.1 m tall)
   p_labyrint (maze centre plinth; part 'letter' = golden letter block)
   p_paviljong (bandstand)  p_iskiosk  p_ballongselger (part 'balloons')  p_drage (part 'kite' – the kite high up)
   p_fuglebad (part 'birds')  p_lykt (part 'lamp')  p_statue (stone fairy; parts 'arm', 'bird')  p_hinkerute (11 squares; meta.squares label spots 10→20)
   p_tallvei (one stepping stone; meta.label)  p_tallhage{num:10..20, bloom:0|1|2} (numeral flower bed; part 'flowers')
   p_spreder (part 'jet')  p_drivhus (part 'tomatoes')  p_kjokkenhage (part 'carrots')  p_stall (parts 'door', 'pony')  p_honsehus (parts 'door', 'hen')
   p_sjakk (board)  p_sjakkbrikke{piece:'konge'|'dronning'|'tarn'|'hest'|'loper'|'bonde', side:'lys'|'mork'}  p_boblemaskin (parts 'fan', 'bubbles')
   p_tomt (build plot, part 'light' glowing corners)  p_blomsterbed{seed} */
(function () {
'use strict';
const F = window.F, V = F.VOX, K = () => F.M3K;
const H = (x, y, z, s) => F.U.hash2(x * 73 + z * 19, y * 31 + z, s || 1);
const def = (id, d) => { if (!V.has(id)) V.def(id, d); };
// copy another def (body + parts) into one grid (used for statues / re-skins); offset dx,dy,dz
function compose(v, id, o, dx, dy, dz, paint, only, skip) {
  const d = V.defs[id]; if (!d) return;
  const [sx, sy, sz] = d.size;
  const g = V.grid(sx, sy, sz); if (!only) d.build(g, o || {});
  for (const pn in (d.parts || {})) { if ((only && !only.includes(pn)) || (skip && skip.includes(pn))) continue; const p = d.parts[pn]; void p.pivot; p.build(g, o || {}); }
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const k = g.get(x, y, z); if (k) v.set(x + dx, y + dy, z + dz, paint ? paint(x, y, z) : k); }
}

/* ------------------------------------------------------------------ Feens bod (her stall) */
def('p_bod', {
  size: [34, 36, 24], scale: 1 / 10,
  build(v) {
    // counter with scalloped front
    v.box(2, 0, 13, 31, 9, 18, 'cream'); v.box(1, 9, 12, 32, 10, 19, 'woodLight');
    for (let x = 2; x <= 31; x++) if (x % 4 < 2) v.box(x, 1, 19, x, 8, 19, 'lilac'); else v.box(x, 1, 19, x, 8, 19, 'pink');
    for (let x = 4; x <= 29; x += 5) { v.set(x, 5, 20, 'glowYellow'); v.set(x - 1, 5, 20, 'butter'); v.set(x + 1, 5, 20, 'butter'); v.set(x, 6, 20, 'butter'); v.set(x, 4, 20, 'butter'); }
    // back shelves (two tiers) for her goods
    v.box(2, 0, 2, 31, 22, 3, 'woodLight'); v.box(2, 8, 4, 31, 8, 8, 'wood'); v.box(2, 15, 4, 31, 15, 7, 'wood');
    for (const x of [1, 32]) { v.box(x, 0, 2, x, 28, 3, 'lavender'); v.box(x, 0, 17, x, 28, 18, 'lavender'); }
    // sign board on top (HTML label «Feens bod» at meta.sign)
    v.box(9, 30, 9, 24, 35, 10, 'cream'); v.box(8, 30, 9, 8, 35, 10, 'gold'); v.box(25, 30, 9, 25, 35, 10, 'gold'); v.box(8, 35, 9, 25, 35, 10, 'gold');
    v.set(16, 36, 9, 'glowYellow'); v.set(17, 36, 9, 'glowYellow');
  },
  parts: { awning: { pivot: [17, 29, 12], build(v) {
    for (let z = 0; z <= 23; z++) { const y = 29 - Math.floor(z / 3.2); for (let x = 0; x <= 33; x++) v.set(x, y, z, Math.floor(x / 4) % 2 ? 'lilac' : 'pink'); }
    for (let x = 0; x <= 33; x++) if (x % 4 !== 3) v.set(x, 21, 23, Math.floor(x / 4) % 2 ? 'lilac' : 'pink');
    for (let x = 3; x <= 31; x += 7) v.set(x, 26, 12, 'glowYellow');
  } }, bell: { pivot: [30, 21, 21], build(v) { v.line(30, 21, 21, 30, 18, 21, 'gold'); v.box(29, 15, 20, 31, 17, 22, 'gold'); v.set(30, 14, 21, 'honey'); } } },
  meta: { group: 'park', sign: [0, 3.25, -0.2], shelves: [[-0.9, 0.9, -0.6], [0.4, 0.9, -0.6], [-0.9, 1.6, -0.6], [0.4, 1.6, -0.6], [-0.5, 1.05, 0.35], [0.6, 1.05, 0.35]] },
});

/* ------------------------------------------------------------------ well, flag, bell tower, fountain */
def('p_bronn', {
  size: [18, 26, 18], scale: 1 / 10,
  build(v, o) { if (V.defs.v_bronn) { V.defs.v_bronn.build(v, o); v.paint((x, y, z, c) => (c === F.col('roofRed') ? 'roofPink' : c === F.col('woodRed') ? 'roofLilac' : null)); } },
  parts: {
    bucket: { pivot: [9, 15, 9], build(v, o) { if (V.defs.v_bronn) V.defs.v_bronn.parts.bucket.build(v, o); } },
    crank: { pivot: [16, 16, 9], build(v, o) { if (V.defs.v_bronn) V.defs.v_bronn.parts.crank.build(v, o); } },
  },
  meta: { group: 'park' },
});
def('p_flagg', {
  size: [24, 64, 8], scale: 1 / 10,
  build(v) { v.box(1, 0, 1, 6, 2, 6, 'stone2'); v.box(3, 3, 3, 4, 60, 4, 'white'); v.box(2, 61, 2, 5, 62, 5, 'gold'); v.box(3, 63, 3, 4, 63, 4, 'gold'); v.box(5, 4, 3, 5, 6, 3, 'grey'); v.line(5, 6, 4, 5, 60, 4, 'grey'); },
  parts: { flag: { pivot: [5, 58, 4], build(v) { for (let x = 5; x < 23; x++) { const w = Math.round(Math.sin(x * 0.6) * 0.8); for (let y = 49; y <= 58; y++) v.set(x, y + w, 4, y > 55 ? 'pink' : (y > 52 ? 'white' : 'lilac')); } v.box(12, 52, 4, 15, 55, 4, 'glowYellow'); } } },
  meta: { group: 'park', flag: [1.4, 5.4, 0.1] },
});
def('p_klokketarn', {
  size: [24, 70, 24], scale: 1 / 8,
  build(v) {
    v.box(2, 0, 2, 21, 2, 21, 'stoneDark'); v.box(4, 3, 4, 19, 44, 19, 'stone'); K().speck(v, 'stone', 'stone2', 0.25, 3);
    v.box(9, 3, 19, 14, 14, 19, 'woodDark'); v.box(8, 15, 19, 15, 15, 19, 'stone2');
    // clock face front
    for (let y = 26; y <= 40; y++) for (let x = 4; x <= 19; x++) { const d = Math.hypot(x - 11.5, y - 33); if (d <= 7) v.set(x, y, 20, d > 6 ? 'gold' : 'cream'); }
    v.box(11, 33, 21, 12, 38, 21, 'navySoft'); v.box(12, 33, 21, 16, 34, 21, 'navySoft'); v.set(11, 33, 21, 'gold');
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; v.set(Math.round(11.5 + Math.cos(a) * 5.3), Math.round(33 + Math.sin(a) * 5.3), 21, 'navySoft'); }
    // open belfry with pillars + pink roof
    v.box(3, 45, 3, 20, 46, 20, 'stone2');
    for (const [x, z] of [[4, 4], [18, 4], [4, 18], [18, 18]]) v.box(x, 47, z, x + 1, 56, z + 1, 'stone');
    v.box(3, 57, 3, 20, 58, 20, 'stone2');
    for (let i = 0; i < 11; i++) v.box(3 + i, 59 + i, 3 + i, 20 - i, 59 + i, 20 - i, i % 3 === 2 ? 'white' : 'roofPink');
    v.box(11, 69, 11, 12, 69, 12, 'gold');
  },
  parts: { bell: { pivot: [12, 56, 12], build(v) { v.box(11, 55, 11, 12, 56, 12, 'woodDark'); for (let i = 0; i < 6; i++) v.cyl(11.5, 49 + i, 11.5, 1.5 + (5 - i) * 0.5, 1, 'gold'); v.cyl(11.5, 48, 11.5, 1, 1, 'honey'); } } },
  meta: { group: 'park' },
});
def('p_fontene', { // big two-tier park fountain, 4 m
  size: [40, 34, 40], scale: 1 / 10,
  build(v) {
    v.cyl(19.5, 0, 19.5, 19, 4, 'stone'); v.cyl(19.5, 1, 19.5, 17.6, 4, 0); v.cyl(19.5, 1, 19.5, 17.6, 2, 'water');
    K().ring(v, 19.5, 4, 19.5, 18.5, i => (i % 5 === 0 ? 'pink' : 'stone2'));
    v.cyl(19.5, 3, 19.5, 3, 12, 'stone2'); v.cyl(19.5, 14, 19.5, 9, 2, 'stone'); v.cyl(19.5, 15, 19.5, 7.8, 1, 'water');
    v.cyl(19.5, 16, 19.5, 2, 6, 'stone2'); v.cyl(19.5, 21, 19.5, 4.5, 2, 'stone'); v.cyl(19.5, 22, 19.5, 3.4, 1, 'water');
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; const x = Math.round(19.5 + Math.cos(a) * 9), z = Math.round(19.5 + Math.sin(a) * 9); v.box(x - 1, 3, z - 1, x + 1, 5, z + 1, 'stone2'); v.set(x, 6, z, 'gold'); }
  },
  parts: { jet: { pivot: [20, 23, 20], build(v) {
    v.cyl(19.5, 23, 19.5, 0.9, 7, 'sky'); v.set(19, 30, 19, 'white'); v.set(20, 31, 20, 'white');
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; for (let k = 0; k < 8; k++) { const r = 1 + k * 1.1, y = 30 - Math.round(k * k * 0.22); v.set(Math.round(19.5 + Math.cos(a) * r), y, Math.round(19.5 + Math.sin(a) * r), k > 4 ? 'gAqua' : 'sky'); } }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (let k = 0; k < 5; k++) v.set(Math.round(19.5 + Math.cos(a) * (8.5 + k * 0.9)), 15 - k * 2 + 4, Math.round(19.5 + Math.sin(a) * (8.5 + k * 0.9)), 'gAqua'); }
  } } },
  meta: { group: 'park' },
});

/* ------------------------------------------------------------------ playground */
def('p_huske', { // swing set, two seats
  size: [32, 28, 14], scale: 1 / 10,
  build(v, o) {
    const c = o.col || 'sky';
    for (const x of [1, 30]) { v.line(x, 0, 1, x, 25, 6, c); v.line(x, 0, 12, x, 25, 7, c); v.line(x + (x > 2 ? -1 : 1), 0, 1, x + (x > 2 ? -1 : 1), 25, 6, c); }
    v.box(0, 26, 6, 31, 27, 7, 'pink');
    for (const x of [0, 31]) v.box(x, 0, 0, x, 0, 13, 'grey');
  },
  parts: {
    seat: { pivot: [9, 26, 7], build(v) { for (const x of [6, 12]) v.line(x, 25, 7, x, 5, 7, 'grey'); v.box(5, 4, 5, 13, 4, 9, 'butter'); v.box(5, 5, 5, 13, 5, 5, 'coral'); } },
    seat2: { pivot: [23, 26, 7], build(v) { for (const x of [20, 26]) v.line(x, 25, 7, x, 5, 7, 'grey'); v.box(19, 4, 5, 27, 4, 9, 'mint'); v.box(19, 5, 5, 27, 5, 5, 'teal'); } },
  },
  meta: { group: 'play', gallery: [{}, { col: 'lilac' }] },
});
def('p_sklie', { // slide (ladder at the back, chute to the front)
  size: [14, 26, 38], scale: 1 / 10,
  build(v) {
    for (const x of [2, 11]) v.box(x, 0, 2, x, 20, 2, 'sky');
    for (let y = 2; y < 20; y += 3) v.box(2, y, 2, 11, y, 2, 'butter');
    v.box(2, 19, 2, 11, 19, 8, 'butter'); for (const x of [2, 11]) { v.box(x, 0, 8, x, 24, 8, 'sky'); v.box(x, 20, 2, x, 24, 2, 'sky'); } v.box(2, 24, 2, 11, 24, 8, 'roofPink'); v.box(3, 25, 3, 10, 25, 7, 'roofPink');
    for (const x of [2, 11]) v.box(x, 20, 3, x, 22, 7, 'lilac');
    for (let z = 9; z < 37; z++) { const y = Math.max(1, Math.round(19 - (z - 9) * 0.68 + Math.max(0, z - 31) * 0.5)); v.box(3, y, z, 10, y, z, 'pink'); v.set(3, y + 1, z, 'rose'); v.set(10, y + 1, z, 'rose'); }
    v.box(3, 0, 36, 10, 0, 37, 'sand');
  },
  meta: { group: 'play' },
});
def('p_vippe', { // seesaw
  size: [10, 12, 40], scale: 1 / 10,
  build(v) { v.box(2, 0, 17, 7, 1, 22, 'stone2'); v.box(3, 2, 18, 6, 5, 21, 'red'); },
  parts: { plank: { pivot: [5, 6, 20], build(v) {
    v.box(2, 6, 1, 7, 6, 38, 'coral'); for (let z = 2; z < 38; z += 4) v.box(2, 6, z, 7, 6, z + 1, 'butter'); for (const z of [3, 36]) { v.box(2, 7, z - 2, 7, 7, z + 1, 'sky'); v.box(2, 8, z - 2, 7, 10, z - 2, 'sky'); v.box(2, 10, z + 2, 7, 10, z + 2, 'red'); v.box(2, 9, z + 2, 2, 10, z + 2, 'red'); v.box(7, 9, z + 2, 7, 10, z + 2, 'red'); }
  } } },
  meta: { group: 'play', seats: [[0, 0.8, -1.7], [0, 0.8, 1.7]] },
});
def('p_sandkasse', {
  size: [26, 8, 26], scale: 1 / 10,
  build(v) {
    v.box(0, 0, 0, 25, 3, 25, 'woodLight'); v.box(1, 0, 1, 24, 3, 24, 0); v.box(1, 0, 1, 24, 2, 24, 'sand'); K().speck(v, 'sand', 'hay', 0.12, 3);
    for (const [x, z] of [[0, 0], [25, 0], [0, 25], [25, 25]]) v.box(x, 0, z, x, 4, z, 'woodRed');
    v.box(3, 3, 3, 6, 6, 6, 'sky'); v.box(4, 4, 4, 5, 6, 5, 'sand'); v.set(3, 7, 4, 'sky'); v.set(6, 7, 4, 'sky');
    v.box(16, 3, 15, 21, 5, 19, 'sand'); for (const [x, z] of [[16, 15], [21, 15], [16, 19], [21, 19]]) v.box(x, 6, z, x, 7, z, 'sand');
  },
  parts: { spade: { pivot: [10, 3, 18], build(v) { v.line(8, 3, 16, 12, 6, 20, 'red'); v.box(7, 3, 14, 9, 3, 16, 'red'); } } },
  meta: { group: 'play' },
});
def('p_trampoline', {
  size: [32, 9, 32], scale: 1 / 10,
  build(v) {
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = Math.round(15.5 + Math.cos(a) * 13.5), z = Math.round(15.5 + Math.sin(a) * 13.5); v.box(x, 0, z, x, 4, z, 'grey'); }
    K().ring(v, 15.5, 5, 15.5, 15, i => (i % 8 < 4 ? 'sky' : 'lilac')); K().ring(v, 15.5, 5, 15.5, 14.4, i => (i % 8 < 4 ? 'sky' : 'lilac'));
  },
  parts: { mat: { pivot: [16, 5, 16], build(v) { for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, z - 15.5); if (d < 13.6) v.set(x, 5, z, d < 4 ? 'pink' : (d < 5 ? 'white' : 'navySoft')); } } } },
  meta: { group: 'play' },
});
def('p_karusell', { // playground carousel, 1/10 → 4 m: small low striped crown + gold spokes, so the 6 horses on gold poles show from the high camera
  size: [40, 32, 40], scale: 1 / 10,
  build(v) { v.cyl(19.5, 0, 19.5, 19, 1, 'pathStone'); v.cyl(19.5, 1, 19.5, 2.2, 20, 'gold'); },
  parts: { top: { pivot: [20, 0, 20], build(v) {
    v.cyl(19.5, 1, 19.5, 17.5, 1, 'cream'); K().ring(v, 19.5, 2, 19.5, 17.4, i => (i % 6 < 3 ? 'pink' : 'butter'));
    for (let i = 0; i < 7; i++) v.cyl(19.5, 21 + i, 19.5, Math.max(0.6, 8.5 - i * 1.25), 1, i % 2 ? 'rose' : 'white');
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, x = Math.round(19.5 + Math.cos(a) * 8.3), z = Math.round(19.5 + Math.sin(a) * 8.3); v.box(x, 20, z, x, k % 2 ? 19 : 20, z, k % 2 ? 'pink' : 'butter'); } // scalloped edge
    v.box(19, 28, 19, 20, 31, 20, 'gold'); v.box(21, 30, 19, 23, 31, 20, 'pink'); v.set(23, 30, 19, 'rose');                       // top flag
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = Math.round(19.5 + Math.cos(a) * 13), z = Math.round(19.5 + Math.sin(a) * 13);
      v.box(x, 2, z, x, 20, z, 'gold'); v.line(Math.round(19.5 + Math.cos(a) * 8), 21, Math.round(19.5 + Math.sin(a) * 8), x, 20, z, 'gold'); v.set(x, 21, z, 'gold');
      const c = ['white', 'pink', 'butter', 'sky', 'lilac', 'mint'][k]; const dx = Math.round(-Math.sin(a) * 2), dz = Math.round(Math.cos(a) * 2);
      v.box(x - 1, 9, z - 1, x + 1, 12, z + 1, c); v.box(x + dx - 1, 9, z + dz - 1, x + dx + 1, 12, z + dz + 1, c); v.box(x - dx, 9, z - dz, x - dx, 11, z - dz, c);
      v.box(x + dx * 2, 11, z + dz * 2, x + dx * 2, 15, z + dz * 2, c); v.set(x + dx * 2, 15, z + dz * 2, 'black'); v.box(x + dx, 6, z + dz, x + dx, 8, z + dz, c); v.box(x - dx, 6, z - dz, x - dx, 8, z - dz, c);
      v.set(x, 13, z, 'rose'); v.set(x - dx, 12, z - dz, 'gold'); }
  } } },
  meta: { group: 'play' },
});
def('p_sjakk', { // giant chess board on the lawn, 4 × 4 m (8×8 squares of 0.5 m)
  size: [42, 2, 42], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 41, 0, 41, 'stone2'); for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) v.box(1 + x * 5, 1, 1 + z * 5, 5 + x * 5, 1, 5 + z * 5, (x + z) % 2 ? 'teal' : 'milk'); v.box(0, 1, 0, 41, 1, 0, 'woodLight'); v.box(0, 1, 41, 41, 1, 41, 'woodLight'); v.box(0, 1, 0, 0, 1, 41, 'woodLight'); v.box(41, 1, 0, 41, 1, 41, 'woodLight'); },
  meta: { group: 'play', square: 0.5 },
});
const PIECE = {
  bonde: (v, c) => { v.sphere(7.5, 13, 7.5, 3.2, c); v.cyl(7.5, 4, 7.5, 2.2, 7, c); },
  tarn: (v, c) => { v.cyl(7.5, 4, 7.5, 3.4, 13, c); for (let i = 0; i < 8; i++) if (i % 2 === 0) { const a = i / 8 * Math.PI * 2; v.box(Math.round(7.5 + Math.cos(a) * 3), 17, Math.round(7.5 + Math.sin(a) * 3), Math.round(7.5 + Math.cos(a) * 3), 18, Math.round(7.5 + Math.sin(a) * 3), c); } },
  loper: (v, c) => { v.cyl(7.5, 4, 7.5, 2.4, 9, c); v.ellipsoid(7.5, 16, 7.5, 3, 4.5, 3, c); v.set(7, 21, 7, c); v.set(7, 22, 7, 'gold'); },
  hest: (v, c) => { v.cyl(7.5, 4, 7.5, 3, 6, c); v.box(5, 10, 5, 10, 18, 9, c); v.box(5, 15, 9, 10, 18, 13, c); v.box(6, 19, 6, 6, 20, 7, c); v.box(9, 19, 6, 9, 20, 7, c); v.set(6, 17, 10, 'black'); v.set(9, 17, 10, 'black'); v.box(7, 11, 4, 8, 19, 4, 'rose'); },
  dronning: (v, c) => { v.cyl(7.5, 4, 7.5, 2.6, 13, c); v.cyl(7.5, 17, 7.5, 3.6, 2, c); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; v.set(Math.round(7.5 + Math.cos(a) * 3.2), 19, Math.round(7.5 + Math.sin(a) * 3.2), 'gold'); } v.set(7, 20, 7, 'gem1'); },
  konge: (v, c) => { v.cyl(7.5, 4, 7.5, 2.8, 15, c); v.cyl(7.5, 19, 7.5, 3.4, 2, c); v.box(7, 21, 7, 8, 25, 8, 'gold'); v.box(5, 23, 7, 10, 23, 8, 'gold'); },
};
def('p_sjakkbrikke', {
  size: [16, 27, 16], scale: 1 / 16,
  build(v, o) { const c = o.side === 'mork' ? 'plum' : 'cream'; v.cyl(7.5, 0, 7.5, 5.5, 2, c); v.cyl(7.5, 2, 7.5, 4.5, 2, c); (PIECE[o.piece] || PIECE.bonde)(v, c); K().speck(v, c, o.side === 'mork' ? 'lavender' : 'cream2', 0.12, 4); K().ring(v, 7.5, 2, 7.5, 5, o.side === 'mork' ? 'lavender' : 'gold'); },
  meta: { group: 'play', gallery: Object.keys(PIECE).map((p, i) => ({ piece: p, side: i % 2 ? 'mork' : 'lys' })) },
});
def('p_boblemaskin', {
  size: [18, 24, 16], scale: 1 / 16,
  build(v) { K().rbox(v, 2, 0, 3, 15, 9, 13, 'lilac'); v.box(2, 9, 3, 15, 9, 13, 'pink'); v.box(3, 3, 14, 3, 4, 14, 'mint'); v.box(14, 3, 14, 14, 4, 14, 'butter'); v.set(8, 10, 8, 'gAqua'); },
  parts: { fan: { pivot: [9, 5.5, 14.5], build(v) { for (let y = 2; y < 9; y++) for (let x = 4; x < 14; x++) { const d = Math.hypot(x - 8.5, y - 5), a = Math.atan2(y - 5, x - 8.5); if (d < 3.4) v.set(x, y, 14, d < 1.2 ? 'grey' : (Math.cos(a * 3) > 0 ? 'white' : 'sky')); } } }, bubbles: { pivot: [9, 10, 9], build(v) { for (const [x, y, z, r] of [[5, 15, 12, 2], [12, 18, 10, 1.6], [8, 21, 13, 1.3], [14, 13, 14, 1.2]]) { for (let zz = -2; zz <= 2; zz++) for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const d = Math.hypot(xx, yy, zz); if (d <= r && d > r - 1) v.set(x + xx, y + yy, z + zz, yy > 0 && xx < 0 ? 'white' : 'gAqua'); } } } } },
  meta: { group: 'play' },
});

/* ------------------------------------------------------------------ water things */
def('p_andedam', { // duck house on a stilt at the pond edge + a row of ducklings
  size: [30, 26, 24], scale: 1 / 10,
  build(v) {
    v.box(14, 0, 8, 15, 12, 9, 'woodDark');
    v.box(9, 13, 4, 20, 20, 13, 'butter'); v.box(13, 14, 13, 16, 18, 13, 'woodDark'); v.box(11, 12, 13, 18, 12, 15, 'woodLight');
    for (let i = 0; i < 7; i++) v.box(8 + i, 21 + i, 3, 21 - i, 21 + i, 14, i % 2 ? 'white' : 'roofBlue');
    v.box(3, 0, 18, 8, 6, 18, 'woodLight'); v.box(4, 6, 18, 7, 6, 18, 'woodRed'); v.box(5, 0, 18, 6, 0, 19, 'woodDark');
  },
  parts: { ducks: { pivot: [15, 0, 20], build(v) {
    const duck = (x, z, s, c) => { v.box(x, 0, z, x + 2 * s, s + 1, z + 3 * s, c); v.box(x + s - 1 + (s > 1 ? 1 : 0), s + 2, z + 3 * s - 1, x + s + (s > 1 ? 1 : 0), 2 * s + 2, z + 3 * s, c); v.set(x + s, 2 * s + 1, z + 3 * s + 1, 'orange'); v.set(x + s - (s > 1 ? 0 : 1), 2 * s + 2, z + 3 * s, 'black'); };
    duck(13, 15, 2, 'white'); duck(19, 13, 1, 'yellow'); duck(23, 12, 1, 'yellow'); duck(27, 11, 1, 'yellow');
  } } },
  meta: { group: 'water' },
});
def('p_robat', { // rowing boat (also Reisebua 'ride_robåt')
  size: [16, 10, 32], scale: 1 / 10,
  build(v, o) {
    const c = o.col || 'sky';
    for (let z = 1; z < 31; z++) { const t = (z - 1) / 29, w = Math.max(1, Math.round(6.5 * Math.pow(Math.sin(Math.PI * t), 0.55))); v.box(8 - w, 0, z, 7 + w, 4, z, c); v.box(8 - w, 4, z, 7 + w, 4, z, 'white'); if (w > 1) v.box(9 - w, 1, z, 6 + w, 4, z, 0); v.box(8 - w, 0, z, 7 + w, 0, z, 'woodLight'); }
    for (const z of [10, 20]) v.box(3, 3, z, 12, 3, z + 1, 'woodLight');
    v.set(7, 5, 30, 'rose'); v.set(8, 5, 30, 'rose');
  },
  parts: { oars: { pivot: [8, 4, 15], build(v) { for (const s of [-1, 1]) { const x0 = s < 0 ? 2 : 13; v.line(x0, 4, 15, x0 + s * 3, 2, 15, 'woodLight'); v.box(Math.min(x0 + s * 3, x0 + s * 4), 1, 13, Math.max(x0 + s * 3, x0 + s * 4), 2, 17, 'woodLight'); } } } },
  meta: { group: 'water', gallery: [{}, { col: 'mint' }, { col: 'coral' }] },
});
def('p_svaner', { // two white swans facing each other; their necks draw a heart
  size: [32, 24, 16], scale: 1 / 16,
  build(v) {},
  parts: Object.fromEntries([['swan1', 1], ['swan2', -1]].map(([n, s]) => [n, { pivot: [s > 0 ? 9 : 23, 0, 8], build(v) {
    const X = x => (s > 0 ? x : 31 - x);
    v.ellipsoid(X(8.5), 3, 7.5, 6, 3.4, 4.2, 'white'); v.ellipsoid(X(4), 5, 7.5, 2.6, 2.6, 3.2, 'wool'); v.set(X(2), 7, 7, 'white'); v.set(X(2), 7, 8, 'white');
    const P = [[13, 4.5], [12, 8], [10.5, 11], [10, 14], [10.6, 16.8], [11.8, 18.4], [12.6, 18.2]];
    for (let i = 0; i < P.length - 1; i++) for (let k = 0; k <= 6; k++) { const t = k / 6, x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, y = P[i][1] + (P[i + 1][1] - P[i][1]) * t; v.sphere(X(x), y, 7.5, 1.05, 'white'); }
    v.sphere(X(12.8), 17.4, 7.5, 1.6, 'white');
    v.set(X(14), 16, 7, 'orange'); v.set(X(14), 16, 8, 'orange'); v.set(X(15), 15, 7, 'orange'); v.set(X(15), 15, 8, 'orange');
    v.set(X(13), 18, 9, 'black'); v.set(X(13), 18, 6, 'black');
  } }])),
  meta: { group: 'water' },
});
def('p_fuglebad', {
  size: [14, 14, 14], scale: 1 / 10,
  build(v) { v.cyl(6.5, 0, 6.5, 3.5, 2, 'stone2'); v.cyl(6.5, 2, 6.5, 1.5, 6, 'stone'); for (let i = 0; i < 3; i++) v.cyl(6.5, 8 + i, 6.5, 4 + i * 1.2, 1, 'stone'); v.cyl(6.5, 10, 6.5, 4.6, 1, 'water'); K().speck(v, 'stone', 'stone2', 0.2, 3); },
  parts: { birds: { pivot: [7, 11, 7], build(v) { for (const [x, z, s] of [[2, 6, 1], [10, 8, -1]]) { v.box(x, 11, z, x + 1, 12, z + 1, 'woodLight'); v.set(x + (s > 0 ? 2 : -1), 13, z, 'woodLight'); v.set(x + (s > 0 ? 3 : -2), 13, z, 'orange'); v.set(x + (s > 0 ? 2 : -1), 14, z, 'black'); v.set(x - s, 12, z, 'brown'); } } } },
  meta: { group: 'park' },
});
def('p_spreder', {
  size: [24, 12, 24], scale: 1 / 16,
  build(v) { v.box(10, 0, 10, 13, 1, 13, 'grey'); v.box(11, 2, 11, 12, 4, 12, 'yellow'); v.box(9, 5, 11, 14, 5, 12, 'yellow'); },
  parts: { jet: { pivot: [12, 5, 12], build(v) { for (let k = 0; k < 14; k++) { const t = k / 13; v.set(Math.round(14 + t * 9), Math.round(6 + Math.sin(t * Math.PI) * 5), 12, k % 3 ? 'sky' : 'gAqua'); v.set(Math.round(9 - t * 9), Math.round(6 + Math.sin(t * Math.PI) * 5), 11, k % 3 ? 'sky' : 'gAqua'); } } } },
  meta: { group: 'park' },
});

/* ------------------------------------------------------------------ gardens */
def('p_rosebed', {
  size: [26, 10, 16], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 25, 2, 15, 'brick'); v.box(1, 0, 1, 24, 2, 14, 'soil'); K().speck(v, 'soil', 'woodDark', 0.2, 3); },
  parts: { roses: { pivot: [13, 3, 8], build(v) { for (let i = 0; i < 4; i++) { const cx = 4 + i * 6, g = V.grid(26, 10, 16); K().blob(g, cx, 5, 7.5, 3, 3, 4, 'leaf', 1, i + 3); for (let z = 0; z < 16; z++) for (let y = 3; y < 10; y++) for (let x = 0; x < 26; x++) { const k = g.get(x, y, z); if (k) v.set(x, y, z, (K().exposed(g, x, y, z) && H(x, y, z, 7) < 0.18) ? ['rose', 'pink', 'red', 'white'][i] : (H(x, y, z, 8) < 0.3 ? 'leafDark' : 'leaf')); } } } } },
  meta: { group: 'garden' },
});
def('p_blomsterbed', {
  size: [24, 6, 14], scale: 1 / 10,
  build(v, o) { v.box(0, 0, 0, 23, 1, 13, 'woodLight'); v.box(1, 0, 1, 22, 1, 12, 'soil'); const r = F.U.rng((o.seed || 1) * 13); for (let z = 2; z < 12; z += 2) for (let x = 2; x < 22; x += 2) { v.box(x, 2, z, x, 2 + Math.floor(r() * 2), z, 'green'); v.set(x, 4, z, F.U.pick(r, K().PASTELS)); } },
  meta: { group: 'garden' },
});
const HEKK = {
  klump: v => { K().blob(v, 7.5, 9, 7.5, 6, 6, 6, 'leaf', 3, 2); },
  kanin: v => { v.ellipsoid(7.5, 7, 7.5, 5, 4.5, 6, 'leaf'); v.sphere(7.5, 12, 11, 3.5, 'leaf'); v.box(6, 15, 10, 6, 20, 11, 'leaf'); v.box(9, 15, 10, 9, 20, 11, 'leaf'); v.sphere(7.5, 7, 1.5, 2, 'leaf2'); },
  hjerte: v => { v.sphere(5, 14, 7.5, 3.6, 'leaf'); v.sphere(10, 14, 7.5, 3.6, 'leaf'); for (let y = 4; y < 14; y++) { const w = (y - 4) * 0.62; v.box(Math.round(7.5 - w), y, 6, Math.round(7.5 + w) - 1, y, 9, 'leaf'); } },
  svane: v => { v.ellipsoid(7.5, 7, 6, 5, 4, 6.5, 'leaf'); for (let y = 8; y < 17; y++) v.box(7, y, 11 + Math.round(Math.sin((y - 8) / 8 * Math.PI) * 2), 8, y, 12 + Math.round(Math.sin((y - 8) / 8 * Math.PI) * 2), 'leaf'); v.box(7, 16, 11, 8, 18, 14, 'leaf'); },
};
def('p_hekkdyr', {
  size: [16, 22, 16], scale: 1 / 10,
  build(v, o) { v.box(4, 0, 4, 11, 2, 11, 'brick'); v.box(5, 2, 5, 10, 2, 10, 'soil'); const g = V.grid(16, 22, 16); (HEKK[o.shape] || HEKK.klump)(g); for (let z = 0; z < 16; z++) for (let y = 0; y < 22; y++) for (let x = 0; x < 16; x++) if (g.get(x, y, z) && y > 2) v.set(x, y, z, H(x, y, z, 4) < 0.3 ? 'leafDark' : 'leaf'); if (o.shape === 'kanin' || o.shape === 'svane') { v.set(6, 13, 14, 'black'); v.set(9, 13, 14, 'black'); } },
  meta: { group: 'garden', gallery: Object.keys(HEKK).map(s => ({ shape: s })), shapes: Object.keys(HEKK) },
});
def('p_hekk', { // 2 × 2 m maze cell, 1.1 m tall hedge; kind rett (along z) | hjorne | ende | t | kryss
  size: [20, 11, 20], scale: 1 / 10,
  build(v, o) {
    const k = o.kind || 'rett', a = 7, b = 12; // hedge band x∈[7,12]
    const zN = [0, a], zS = [b, 19], xW = [0, a], xE = [b, 19];
    const arms = { rett: 'NS', hjorne: 'NE', ende: 'N', t: 'NEW', kryss: 'NESW' }[k] || 'NS';
    v.box(a, 0, a, b, 10, b, 'leaf');
    if (arms.includes('N')) v.box(a, 0, 0, b, 10, a, 'leaf'); if (arms.includes('S')) v.box(a, 0, b, b, 10, 19, 'leaf');
    if (arms.includes('W')) v.box(0, 0, a, a, 10, b, 'leaf'); if (arms.includes('E')) v.box(b, 0, a, 19, 10, b, 'leaf');
    v.paint((x, y, z) => (H(x, y, z, 6) < 0.3 ? 'leafDark' : (y === 10 && H(x, y, z, 2) < 0.3 ? 'leaf2' : null)));
    if (H(1, 2, 3, (o.seed || 1)) < 0.5) v.paint((x, y, z) => (y === 10 && H(x, y, z, 9) < 0.03 ? 'blossom' : null));
  },
  meta: { group: 'garden', gallery: ['rett', 'hjorne', 'ende', 't', 'kryss'].map(k => ({ kind: k })) },
});
def('p_labyrint', { // maze centre: little plinth where the golden letter floats
  size: [16, 12, 16], scale: 1 / 10,
  build(v) { v.cyl(7.5, 0, 7.5, 7, 1, 'pathStone'); v.cyl(7.5, 1, 7.5, 3, 5, 'stone'); v.cyl(7.5, 6, 7.5, 4, 1, 'gold'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; v.set(Math.round(7.5 + Math.cos(a) * 6), 1, Math.round(7.5 + Math.sin(a) * 6), k % 2 ? 'rose' : 'butter'); } },
  parts: { letter: { pivot: [8, 9, 8], build(v) { K().rbox(v, 5, 8, 7, 10, 13, 8, 'gold'); v.box(6, 9, 9, 9, 12, 9, 'butter'); v.set(5, 13, 9, 'glowYellow'); v.set(10, 8, 9, 'glowYellow'); } } },
  meta: { group: 'garden', letter: [0, 1.0, 0] },
});
def('p_drivhus', { // greenhouse
  size: [36, 30, 28], scale: 1 / 8,
  build(v) {
    v.box(0, 0, 0, 35, 1, 27, 'brick'); v.box(1, 2, 1, 34, 16, 26, 'gMint'); v.box(2, 2, 2, 33, 16, 25, 0);
    for (let x = 1; x <= 34; x += 5) { v.box(x, 2, 1, x, 16, 1, 'white'); v.box(x, 2, 26, x, 16, 26, 'white'); }
    for (const z of [1, 9, 18, 26]) { v.box(1, 2, z, 1, 16, z, 'white'); v.box(34, 2, z, 34, 16, z, 'white'); }
    v.box(1, 16, 1, 34, 16, 26, 'white');
    for (let i = 0; i < 12; i++) { v.box(1, 17 + i, 1 + i, 34, 17 + i, 1 + i, 'gMint'); v.box(1, 17 + i, 26 - i, 34, 17 + i, 26 - i, 'gMint'); for (let x = 1; x <= 34; x += 5) { v.set(x, 17 + i, 1 + i, 'white'); v.set(x, 17 + i, 26 - i, 'white'); } }
    v.box(1, 29, 13, 34, 29, 14, 'white');
    for (const z of [1, 26]) for (let i = 0; i < 12; i++) { } // gable (open)
    for (let y = 17; y < 29; y++) { const w = y - 17; v.box(1, y, 1 + w, 1, y, 26 - w, 'gMint'); v.box(34, y, 1 + w, 34, y, 26 - w, 'gMint'); }
    v.box(14, 2, 26, 21, 13, 26, 'white'); v.box(15, 2, 26, 20, 12, 26, 'gMint');
    v.box(3, 2, 4, 32, 5, 7, 'woodLight'); v.box(3, 2, 20, 32, 5, 23, 'woodLight'); v.box(4, 5, 5, 31, 5, 6, 'soil'); v.box(4, 5, 21, 31, 5, 22, 'soil');
  },
  parts: { tomatoes: { pivot: [18, 6, 14], build(v) { for (const z of [5, 21]) for (let x = 5; x <= 30; x += 4) { v.line(x, 6, z, x, 13, z, 'green'); for (let y = 7; y < 13; y += 2) { v.set(x + 1, y, z, 'leaf'); if ((x + y) % 3 === 0) v.set(x - 1, y, z, 'red'); } } } } },
  meta: { group: 'garden' },
});
def('p_kjokkenhage', { // kitchen garden: soil rows with carrot tops (carrots pop up = part)
  size: [28, 8, 22], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 27, 1, 21, 'woodLight'); v.box(1, 0, 1, 26, 1, 20, 'soil'); for (let z = 2; z < 20; z += 4) v.box(1, 2, z, 26, 2, z + 1, 'soil'); K().speck(v, 'soil', 'woodDark', 0.15, 4);
    for (let x = 3; x < 25; x += 4) { v.box(x, 3, 14, x, 5, 14, 'leaf'); v.set(x - 1, 5, 14, 'leaf2'); v.set(x + 1, 5, 14, 'leaf2'); v.sphere(x, 4, 18, 1.4, 'leaf'); } v.line(1, 3, 7, 26, 3, 7, 'leaf2'); },
  parts: { carrots: { pivot: [14, 2, 3], build(v) { for (let x = 3; x < 25; x += 3) { v.box(x, 3, 3, x, 4, 3, 'orange'); v.set(x, 5, 3, 'leaf'); v.set(x - 1, 6, 3, 'leaf2'); v.set(x + 1, 6, 3, 'leaf2'); v.set(x, 6, 3, 'leaf'); } } } },
  meta: { group: 'garden' },
});

/* ------------------------------------------------------------------ animals' houses */
def('p_stall', { // pony stable
  size: [44, 38, 30], scale: 1 / 8,
  build(v) {
    v.box(1, 0, 1, 42, 1, 28, 'stoneDark'); v.box(2, 2, 2, 41, 18, 27, 'woodRed');
    for (let y = 3; y <= 18; y += 3) v.box(2, y, 27, 41, y, 27, 'roofRed');
    for (const x of [2, 41]) v.box(x, 2, 27, x, 18, 27, 'white'); v.box(2, 18, 27, 41, 18, 27, 'white');
    for (let i = 0; i < 16; i++) v.box(0, 19 + i, i, 43, 19 + i, 29 - i, i % 3 === 0 ? 'white' : 'roofBlue');
    for (let y = 19; y < 34; y++) { const w = y - 19; v.box(2, y, 2 + w, 41, y, 27 - w, 'woodRed'); }
    v.box(14, 22, 28, 29, 31, 28, 'white'); v.box(15, 23, 28, 28, 30, 28, 'woodDark'); v.box(16, 24, 29, 27, 29, 29, 'hay');
    v.box(15, 2, 27, 28, 9, 27, 'white'); v.clear(16, 2, 27, 27, 9, 27); v.box(16, 2, 28, 27, 9, 28, 'woodLight'); v.line(16, 2, 28, 27, 9, 28, 'white'); v.line(16, 9, 28, 27, 2, 28, 'white');
    v.box(15, 10, 27, 28, 16, 27, 'white'); v.box(16, 10, 26, 27, 16, 26, 'woodDark');
    v.box(4, 2, 28, 10, 5, 29, 'hay'); v.box(33, 2, 28, 39, 4, 29, 'woodLight'); v.box(34, 4, 28, 38, 4, 29, 'water');
    v.box(5, 11, 27, 9, 14, 27, 'glass'); v.box(34, 11, 27, 38, 14, 27, 'glass');
  },
  parts: { pony: { pivot: [21, 10, 27], build(v) { v.box(19, 10, 26, 24, 14, 29, 'wool'); v.box(19, 13, 29, 24, 17, 31, 'wool'); v.box(20, 13, 32, 23, 14, 32, 'cream2'); v.set(20, 16, 32, 'black'); v.set(23, 16, 32, 'black'); v.set(20, 17, 32, 'white'); v.set(23, 17, 32, 'white'); v.box(21, 15, 28, 22, 18, 31, 'pink'); v.set(19, 18, 30, 'wool'); v.set(24, 18, 30, 'wool'); } }, door: { pivot: [16, 10, 28], build(v) { v.box(16, 10, 28, 27, 16, 28, 'woodLight'); v.line(16, 10, 28, 27, 16, 28, 'white'); v.set(26, 13, 29, 'gold'); } } },
  meta: { group: 'park' },
});
def('p_honsehus', { // henhouse on stilts with a ramp
  size: [26, 26, 26], scale: 1 / 10,
  build(v) {
    for (const [x, z] of [[4, 6], [20, 6], [4, 18], [20, 18]]) v.box(x, 0, z, x + 1, 6, z + 1, 'woodDark');
    v.box(3, 7, 5, 22, 17, 20, 'butter'); for (let y = 8; y <= 17; y += 2) v.box(3, y, 20, 22, y, 20, 'honey');
    for (let i = 0; i < 8; i++) v.box(2, 18 + i, 4 + i, 23, 18 + i, 21 - i, i % 2 ? 'white' : 'roofRed');
    v.box(11, 8, 21, 14, 12, 21, 'woodDark'); for (let z = 21; z < 26; z++) v.box(11, Math.max(0, 7 - (z - 21) * 1.4), z, 14, Math.max(0, 7 - (z - 21) * 1.4), z, 'woodLight');
    v.box(5, 12, 21, 8, 15, 21, 'white'); v.box(17, 12, 21, 20, 15, 21, 'white');
    v.box(6, 13, 21, 7, 14, 21, 'glass'); v.box(18, 13, 21, 19, 14, 21, 'glass');
    v.box(7, 0, 23, 9, 1, 24, 'white'); v.set(9, 2, 24, 'red'); v.set(10, 1, 24, 'orange');
  },
  parts: { hen: { pivot: [12, 2, 24], build(v) { v.box(16, 1, 22, 19, 4, 25, 'white'); v.box(17, 4, 24, 18, 6, 25, 'white'); v.set(17, 7, 24, 'red'); v.set(18, 7, 24, 'red'); v.set(18, 5, 26, 'orange'); v.set(17, 6, 26, 'black'); v.box(15, 3, 22, 15, 4, 23, 'white'); v.set(17, 0, 23, 'orange'); v.set(18, 0, 23, 'orange'); } }, door: { pivot: [12, 13, 21], build(v) { v.box(11, 8, 22, 14, 12, 22, 'woodRed'); v.set(13, 10, 23, 'gold'); } } },
  meta: { group: 'park' },
});

/* ------------------------------------------------------------------ bandstand, kiosks, sellers */
def('p_paviljong', { // octagonal bandstand
  size: [48, 46, 48], scale: 1 / 8,
  build(v) {
    for (let y = 0; y < 5; y++) v.cyl(23.5, y, 23.5, 22 - (y === 4 ? 0 : 0), 1, y === 4 ? 'cream2' : 'stone2');
    for (let z = 0; z < 48; z++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - 23.5, z - 23.5); if (d < 21 && v.get(x, 4, z) && (Math.floor(x / 4) + Math.floor(z / 4)) % 2) v.set(x, 4, z, 'butter'); }
    v.box(19, 0, 42, 28, 1, 47, 'stone2'); v.box(19, 2, 42, 28, 3, 45, 'stone2');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8, x = Math.round(23.5 + Math.cos(a) * 19), z = Math.round(23.5 + Math.sin(a) * 19); v.box(x, 5, z, x + 1, 30, z + 1, 'white'); }
    K().ring(v, 23.5, 9, 23.5, 19.5, i => (i % 3 === 0 ? 'white' : 0)); K().ring(v, 23.5, 10, 23.5, 19.5, 'white');
    for (let x = 19; x <= 28; x++) for (const y of [9, 10]) for (let z = 40; z < 46; z++) v.set(x, y, z, 0);
    for (let i = 0; i < 14; i++) v.cyl(23.5, 31 + i, 23.5, Math.max(0.6, 23 - i * 1.65), 1, i === 0 ? 'white' : (i % 2 ? 'roofPink' : 'white'));
    v.cyl(23.5, 45, 23.5, 1, 1, 'gold');
    K().ring(v, 23.5, 30, 23.5, 22, i => (i % 6 < 3 ? 'pink' : 'white'));
  },
  meta: { group: 'park', stage: [0, 0.65, 0] },
});
def('p_iskiosk', { // ice-cream kiosk with a giant cone on the roof
  size: [30, 46, 24], scale: 1 / 10,
  build(v) {
    K().rbox(v, 2, 0, 2, 27, 18, 21, 'peach'); for (let x = 3; x <= 26; x += 3) v.box(x, 1, 21, x, 9, 21, 'white');
    v.box(4, 10, 21, 25, 17, 21, 0); v.box(4, 10, 20, 25, 17, 20, 'cream'); v.box(3, 9, 21, 26, 9, 23, 'white');
    for (let z = 0; z <= 23; z++) { const y = 21 - Math.floor(z / 3.5); for (let x = 0; x <= 29; x++) v.set(x, y, z, Math.floor(x / 3) % 2 ? 'pink' : 'white'); }
    for (let x = 0; x <= 29; x++) if (x % 3 !== 1) v.set(x, 14, 23, Math.floor(x / 3) % 2 ? 'pink' : 'white');
    for (const [c, x] of [['butter', 7], ['mint', 13], ['rose', 19]]) { v.box(x, 10, 21, x + 3, 11, 22, 'cream'); v.sphere(x + 1.5, 12, 21.5, 1.6, c); }
    // giant cone
    for (let y = 22; y < 34; y++) v.cyl(14.5, y, 11.5, 0.6 + (y - 22) * 0.42, 1, (y % 3) ? 'honey' : 'woodLight');
    v.sphere(14.5, 37, 11.5, 5.2, 'pink'); v.sphere(14.5, 42, 11.5, 3.6, 'butter'); v.set(14, 46, 11, 'red'); v.set(14, 45, 11, 'red');
    K().speck(v, 'pink', 'white', 0.08, 3, true);
  },
  meta: { group: 'park', counter: [0, 1.0, 1.0] },
});
def('p_ballongselger', { // balloon cart
  size: [22, 46, 20], scale: 1 / 10,
  build(v) {
    v.box(3, 4, 6, 18, 11, 15, 'mint'); v.box(3, 11, 6, 18, 11, 15, 'white'); for (let x = 4; x <= 17; x += 3) v.box(x, 5, 15, x, 10, 15, 'white');
    for (const x of [3, 17]) { for (let y = 0; y < 7; y++) for (let z = 7; z < 14; z++) if (Math.hypot(y - 3, z - 10) <= 3.2) v.set(x - (x > 10 ? -1 : 1), y, z, Math.hypot(y - 3, z - 10) > 2.2 ? 'navySoft' : 'white'); }
    v.line(18, 11, 6, 21, 15, 4, 'woodDark'); v.box(10, 12, 10, 11, 22, 11, 'woodDark');
  },
  parts: { balloons: { pivot: [11, 22, 11], build(v) {
    const B = [[4, 36, 8, 'rose'], [11, 40, 11, 'butter'], [17, 36, 12, 'sky'], [8, 31, 13, 'mint'], [15, 30, 7, 'lilac'], [12, 34, 15, 'coral']];
    for (const [x, y, z, c] of B) { v.line(11, 22, 11, x, y - 3, z, 'white'); v.ellipsoid(x, y, z, 2.6, 3.2, 2.6, c); v.set(x, y - 4, z, c); v.set(x - 1, y + 1, z + 2, 'white'); }
  } } },
  meta: { group: 'park' },
});
def('p_drage', { // kite on a long string, 6 m up
  size: [24, 64, 10], scale: 1 / 10,
  build(v) { v.box(2, 0, 4, 3, 3, 5, 'woodDark'); v.box(1, 0, 3, 4, 0, 6, 'grassDark'); },
  parts: { kite: { pivot: [3, 3, 5], build(v) {
    for (let i = 0; i <= 50; i++) { const t = i / 50; v.set(Math.round(3 + t * 14 + Math.sin(t * 6) * 1.2), Math.round(3 + t * 50), 5, 'white'); }
    const cx = 17, cy = 57; for (let y = -6; y <= 6; y++) { const w = 6 - Math.abs(y) * (y > 0 ? 1 : 0.7); for (let x = -Math.floor(w); x <= Math.floor(w); x++) v.set(cx + x, cy + y, 5, (x >= 0) === (y >= 0) ? 'rose' : 'butter'); }
    v.line(cx, cy - 6, 5, cx, cy + 6, 5, 'woodDark'); v.line(cx - 5, cy, 5, cx + 5, cy, 5, 'woodDark');
    for (let k = 0; k < 4; k++) { v.set(cx - 1 + (k % 2) * 2, cy - 8 - k * 2, 5, 'sky'); v.set(cx, cy - 7 - k * 2, 5, 'white'); }
  } } },
  meta: { group: 'park' },
});
def('p_lykt', { // pastel park lamp with two lanterns
  size: [16, 36, 8], scale: 1 / 10,
  build(v) { v.box(6, 0, 2, 9, 2, 5, 'navySoft'); v.box(7, 3, 3, 8, 30, 4, 'navySoft'); v.box(2, 28, 3, 13, 28, 4, 'navySoft'); v.set(7, 31, 3, 'gold'); for (const x of [2, 13]) { v.box(x - 1, 21, 2, x + 1, 21, 5, 'navySoft'); v.box(x - 1, 27, 2, x + 1, 27, 5, 'navySoft'); } },
  parts: { lamp: { pivot: [8, 24, 4], build(v) { for (const x of [2, 13]) v.box(x - 1, 22, 2, x + 1, 26, 5, 'lamp'); } } },
  meta: { group: 'park', glow: true },
});
def('p_statue', { // a stone fairy on a plinth (+ a pigeon that flaps off)
  size: [32, 44, 18], scale: 1 / 12,
  build(v) {
    v.box(6, 0, 1, 25, 2, 16, 'stone2'); v.box(8, 3, 3, 23, 14, 14, 'stone'); v.box(7, 15, 2, 24, 16, 15, 'stone2');
    K().speck(v, 'stone', 'stone2', 0.2, 3);
    const stone = (x, y, z) => (H(x, y, z, 5) < 0.25 ? 'stone2' : 'stone');
    if (V.defs.ch_fairy) compose(v, 'ch_fairy', { kind: 'stjerne' }, 0, 17, 1, stone, null, ['armR']);
    v.box(13, 6, 15, 18, 10, 15, 'gold');
  },
  parts: { arm: { pivot: [13, 27, 9], build(v) { const stone = (x, y, z) => (H(x, y, z, 5) < 0.25 ? 'stone2' : 'stone'); if (V.defs.ch_fairy) compose(v, 'ch_fairy', { kind: 'stjerne' }, 0, 17, 1, stone, ['armR']); } }, bird: { pivot: [16, 40, 9], build(v) { v.box(15, 40, 7, 17, 41, 10, 'grey'); v.set(16, 42, 10, 'grey'); v.set(16, 42, 11, 'orange'); v.set(16, 43, 10, 'silver'); v.set(15, 42, 10, 'black'); } } },
  meta: { group: 'park', plaque: [0, 0.7, 0.65] },
});

/* ------------------------------------------------------------------ number places */
def('p_hinkerute', { // hopscotch: 11 squares 10→20 along −z (start at the front). Labels: meta.squares (metres)
  size: [24, 2, 68], scale: 1 / 10,
  build(v) {
    const cols = ['rose', 'butter', 'mint', 'sky', 'lilac', 'peach'];
    SQ.forEach(([x, z], i) => { v.box(x, 0, z, x + 5, 0, z + 5, cols[i % 6]); v.box(x + 1, 0, z + 1, x + 4, 0, z + 4, 'white'); v.box(x + 2, 0, z + 2, x + 3, 0, z + 3, cols[i % 6]); });
    v.box(4, 0, 64, 19, 0, 66, 'white'); v.cyl(11.5, 0, 3, 3.5, 1, 'butter'); v.cyl(11.5, 1, 3, 1.8, 1, 'gold');
  },
  meta: { group: 'learn' },
});
const SQ = []; (function () { let z = 61 - 6, row = 0; const layout = [1, 2, 1, 2, 1, 2, 1, 1]; let n = 0; for (const w of layout) { if (n >= 11) break; if (w === 1) { SQ.push([9, z]); n++; } else { SQ.push([3, z]); SQ.push([15, z]); n += 2; } z -= 7; row++; } SQ.length = 11; })();
V.defs.p_hinkerute && (V.defs.p_hinkerute.meta.squares = SQ.map(([x, z]) => [((x + 3) - 12) / 10, 0.05, ((z + 3) - 34) / 10]));
def('p_tallvei', { // one stepping stone of Tallveien (the number is an HTML label at meta.label)
  size: [14, 3, 12], scale: 1 / 10,
  build(v, o) { v.ellipsoid(6.5, 0, 5.5, 6.5, 2.2, 5.5, 'stone'); v.clear(0, 0, 0, 13, -1, 11); K().speck(v, 'stone', 'stone2', 0.25, (o.seed || 1) + 2); v.paint((x, y, z) => (!v.get(x, y + 1, z) && Math.hypot(x - 6.5, z - 5.5) < 3 ? 'cream' : null)); },
  meta: { group: 'learn', label: [0, 0.25, 0] },
});
def('p_tallhage', { // numeral flower bed (10–20); bloom 0 = green buds, 1 = some flowers, 2 = full bloom
  size: [30, 6, 22], scale: 1 / 10,
  build(v, o) {
    v.box(0, 0, 0, 29, 1, 21, 'woodLight'); v.box(1, 0, 1, 28, 1, 20, 'soil'); K().speck(v, 'soil', 'woodDark', 0.15, (o.num || 10));
    for (let x = 0; x < 30; x += 3) { v.set(x, 2, 0, 'white'); v.set(x, 2, 21, 'white'); }
  },
  parts: { flowers: { pivot: [15, 2, 11], build(v, o) {
    const n = String(F.U.clamp(o.num != null ? o.num : 10, 0, 99)), bloom = o.bloom != null ? o.bloom : 2;
    const cols = ['rose', 'butter', 'lilac', 'sky', 'pink', 'peach', 'coral', 'mint', 'white', 'lavender', 'cherry'];
    const c = cols[(+n) % cols.length];
    const Sx = 3, Sz = 3, W = n.length * 4 * Sx - Sx, x0 = Math.round((30 - W) / 2), z0 = 3;
    for (let i = 0; i < n.length; i++) { const g = V.FONT[n[i]]; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let a = 0; a < Sx; a++) for (let b = 0; b < Sz; b++) {
      const x = x0 + i * 4 * Sx + q * Sx + a, z = z0 + r * Sz + b;
      const lit = bloom >= 2 || (bloom === 1 && H(x, 0, z, 3) < 0.5);
      v.set(x, 2, z, 'leaf');
      if ((a + b) % 2 === 0) v.set(x, 3, z, lit ? ((a === 1 && b === 1) ? 'yellow' : c) : 'leaf2');
    } }
  } } },
  meta: { group: 'learn', gallery: [{ num: 10 }, { num: 13 }, { num: 17, bloom: 1 }, { num: 20, bloom: 0 }] },
});
def('p_tomt', { // build plot marker (3 × 3 m): soil square, corner posts, glowing corner lights (part 'lys')
  size: [30, 6, 30], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 29, 0, 29, 'pathStone'); v.box(2, 0, 2, 27, 0, 27, 'soil'); K().speck(v, 'soil', 'woodLight', 0.1, 3); for (const [x, z] of [[0, 0], [28, 0], [0, 28], [28, 28]]) v.box(x, 0, z, x + 1, 3, z + 1, 'woodLight'); for (let i = 2; i < 28; i += 4) { v.set(i, 1, 0, 'white'); v.set(i, 1, 29, 'white'); v.set(0, 1, i, 'white'); v.set(29, 1, i, 'white'); } },
  parts: { light: { pivot: [15, 4, 15], build(v) { for (const [x, z] of [[0, 0], [28, 0], [0, 28], [28, 28]]) v.box(x, 4, z, x + 1, 5, z + 1, 'glowYellow'); for (let i = 5; i < 26; i += 5) { v.set(i, 1, 14, 'glowYellow'); v.set(14, 1, i, 'glowYellow'); } } } },
  meta: { group: 'park', size: 3 },
});
/* ------------------------------------------------------------------ ids used by things_park.js (CASTLE+PARK) */
def('p_tavle', { // park notice board (parts note1..note3)
  size: [24, 28, 5], scale: 1 / 10,
  build(v) { for (const x of [1, 21]) v.box(x, 0, 1, x + 1, 22, 2, 'woodDark'); v.box(0, 8, 1, 23, 24, 1, 'woodLight'); v.box(1, 9, 2, 22, 23, 2, 'cream2');
    for (let k = 0; k < 6; k++) v.box(k * 2, 25 + (k < 3 ? k : 5 - k), 0, 23 - k * 2, 25 + (k < 3 ? k : 5 - k), 3, k % 2 ? 'white' : 'roofMint'); v.set(11, 27, 1, 'gold'); v.set(12, 27, 1, 'gold'); },
  parts: {
    note1: { pivot: [6, 18, 3], build(v) { v.box(3, 15, 3, 9, 21, 3, 'white'); v.box(4, 19, 3, 8, 19, 3, 'sky'); v.box(4, 17, 3, 7, 17, 3, 'sky'); v.set(6, 21, 4, 'red'); } },
    note2: { pivot: [16, 17, 3], build(v) { v.box(13, 12, 3, 19, 19, 3, 'butter'); v.box(14, 17, 3, 18, 17, 3, 'coral'); v.box(14, 15, 3, 17, 15, 3, 'coral'); v.set(16, 19, 4, 'green'); } },
    note3: { pivot: [10, 12, 3], build(v) { v.box(7, 10, 3, 12, 14, 3, 'blossom'); v.box(8, 12, 3, 11, 12, 3, 'rose'); v.set(10, 14, 4, 'blue'); } },
  },
  meta: { group: 'park' },
});
def('p_butikk', { // market shop booth for Markedsplassen; o.a/o.b = awning colours; goods are placed by the thing at (±1.1, 1.15, 0.9)
  size: [40, 38, 26], scale: 1 / 10,
  build(v, o) {
    const A = o.a || 'pink', B = o.b || 'white';
    v.box(2, 0, 12, 37, 10, 21, 'woodLight'); v.box(1, 10, 11, 38, 11, 23, 'wood');
    for (let x = 3; x <= 36; x++) v.box(x, 1, 22, x, 9, 22, Math.floor((x - 3) / 3) % 2 ? A : B);
    v.box(2, 0, 2, 37, 27, 3, 'cream2'); for (const y of [13, 19]) v.box(3, y, 4, 36, y, 7, 'wood');
    for (let x = 4; x <= 34; x += 3) { const c = ['rose', 'butter', 'mint', 'sky', 'lilac', 'peach', 'coral'][x % 7]; v.box(x, 14, 4, x + 1, 16, 6, c); v.box(x + 1, 20, 4, x + 2, 22, 5, c); }
    for (const x of [2, 37]) { v.box(x, 0, 3, x, 28, 3, 'woodDark'); v.box(x, 11, 21, x, 28, 21, 'woodDark'); }
    for (let z = 0; z < 25; z++) { const y = 29 - Math.floor(z / 4); for (let x = 0; x < 40; x++) v.set(x, y, z, Math.floor(x / 4) % 2 ? A : B); }
    for (let x = 0; x < 40; x++) if (x % 4 !== 3) v.set(x, 22, 24, Math.floor(x / 4) % 2 ? A : B);
    for (let x = 1; x < 39; x += 3) v.set(x, 21, 24, ['rose', 'butter', 'sky', 'mint'][x % 4]);
    v.box(11, 30, 10, 28, 36, 11, 'white'); v.box(12, 31, 11, 27, 35, 11, 'cream'); v.box(10, 30, 10, 10, 36, 11, A); v.box(29, 30, 10, 29, 36, 11, A); v.box(10, 37, 10, 29, 37, 11, A);
  },
  meta: { group: 'park', sign: [0, 3.35, 0.0] },
});
def('p_stein', { // big stepping stone (2 m) for Tallveien; o.c = top colour
  size: [20, 3, 20], scale: 1 / 10,
  build(v, o) { v.cyl(9.5, 0, 9.5, 9.5, 2, 'stone2'); v.cyl(9.5, 2, 9.5, 8.5, 1, o.c || 'pathStone'); v.paint((x, y, z, c) => (y === 2 && H(x, y, z, 8) < 0.15 ? 'white' : (y < 2 && H(x, y, z, 3) < 0.25 ? 'stone' : null))); K().ring(v, 9.5, 2, 9.5, 8.6, i => (i % 4 === 0 ? 'white' : null) || 0); },
  meta: { group: 'learn', label: [0, 0.3, 0], gallery: [{ c: 'butter' }, { c: 'mint' }, { c: 'sky' }] },
});
def('p_benk', { // park bench: navy iron + pastel wood
  size: [24, 13, 10], scale: 1 / 10,
  build(v, o) { const c = o.col || 'woodLight'; for (const x of [2, 20]) { v.box(x, 0, 2, x + 1, 4, 3, 'navySoft'); v.box(x, 0, 7, x + 1, 4, 8, 'navySoft'); v.box(x, 5, 1, x + 1, 12, 1, 'navySoft'); v.set(x, 12, 2, 'navySoft'); v.box(x, 7, 2, x + 1, 7, 8, 'navySoft'); }
    for (let z = 2; z <= 8; z += 2) v.box(0, 5, z, 23, 5, z, c); for (const y of [8, 10, 12]) v.box(0, y, 1, 23, y, 1, c); v.set(11, 13 - 1, 0, 'gold'); },
  meta: { group: 'park', seat: [0, 0.55, 0.15] },
});
def('p_tre', { // park tree (1/9) – kind eple|kirsebær|rund|bjørk; part 'crown' (+ fruit for eple) pivot at the top of the trunk
  size: [30, 46, 30], scale: 1 / 9,
  build(v, o) { const T = K().tree; T.trunk(v, T.TREE[o.kind] || T.TREE.rund, o.kind || 'rund', o.seed || 1); },
  parts: { crown: { pivot: [15, 14, 15], build(v, o) { const T = K().tree, kind = T.TREE[o.kind] ? o.kind : 'rund'; T.crown(v, T.TREE[kind], kind, o.seed || 1); if (kind === 'eple') T.fruit(v, T.TREE.eple, o.seed || 1); } } },
  meta: { group: 'tree', gallery: [{ kind: 'eple' }, { kind: 'kirsebær' }, { kind: 'rund' }] },
});
def('p_blomster', { // a 2 m patch of mixed flowers
  size: [24, 10, 24], scale: 1 / 12,
  build(v, o) { const r = F.U.rng((o.seed || 1) * 131), kinds = ['tulipan', 'rund', 'rund', 'klokke'];
    for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) if (Math.hypot(x - 11.5, z - 11.5) < 11.5) v.set(x, 0, z, H(x, 0, z, 2) < 0.4 ? 'leaf' : 'leaf2');
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 9.5; K().oneFlower(v, Math.round(11.5 + Math.cos(a) * d), Math.round(11.5 + Math.sin(a) * d), 3 + Math.floor(r() * 4), F.U.pick(r, kinds), F.U.pick(r, K().PASTELS), i); } },
  meta: { group: 'garden' },
});
def('p_svane', { // one swan (front +z), for things that place two swans facing each other
  size: [10, 18, 18], scale: 1 / 10,
  build(v) {
    v.ellipsoid(4.5, 3, 7.5, 4, 3, 6.5, 'white'); v.ellipsoid(4.5, 5, 4, 3, 2.2, 3.4, 'wool'); v.set(4, 7, 1, 'white'); v.set(5, 7, 1, 'white');
    for (let i = 0; i <= 20; i++) { const t = i / 20, z = 11 + Math.sin(t * Math.PI * 1.1) * 2.6 - t * 1.2, y = 4 + t * 10; v.sphere(4.5, y, z, 0.95, 'white'); }
    v.sphere(4.5, 14.2, 11.6, 1.5, 'white'); v.box(4, 13, 13, 5, 13, 15, 'orange'); v.set(4, 12, 15, 'orange'); v.set(5, 12, 15, 'orange');
    v.set(3, 15, 12, 'black'); v.set(6, 15, 12, 'black'); v.set(3, 14, 12, 'blossom'); v.set(6, 14, 12, 'blossom');
  },
  meta: { group: 'water' },
});
})();
