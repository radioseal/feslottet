/* Feslottet – MODELS-3: shop items that are placed (catalogue ids from js/data/catalog.js).
   Møbelbua – Fetårnet slot furniture (1/10, front +z, back against the wall at −z):
     f_blomsterteppe f_regnbueteppe (rugs) · f_stjernelampe f_sopplampe (part 'light') · f_rosagardiner f_stjernegardiner (parts 'left','right';
     window opening 2 m wide in the middle) · f_bokhylle f_lekehylle · f_hjerteseng f_himmelseng f_skyseng (part 'pillows') ·
     f_blomstertapet f_stripetapet (wall swatch panels; meta.pattern for the room shell) · f_gyngestol (part 'chair', rocks about x) ·
     f_saccosekk · f_akvarium (part 'fish') · f_dukkehus (part 'roof') · f_litepiano (part 'lid')
   Hagesenteret – plot items (3 × 3 m plots): g_blomsterbed g_solsikker g_rosebusk g_benk g_lyktestolpe (part 'light') g_fuglebad (part 'birds') g_epletre
     g_huske (part 'seat') g_sklie g_trampoline (part 'mat') g_fontene (part 'jet') g_lysthus
   Byggebua – plot buildings: b_lekehus (part 'door') b_iskiosk b_feensbod (parts bell, awning) b_vindmølle (part 'sails') b_karusell (part 'rotor') b_pariserhjul (part 'wheel')
   Reisebua – rides: ride_robåt (part 'oars') ride_hestevogn (part 'wheels') ride_luftballong (part 'balloon')
   Every model has meta.shop = catalogue id. */
(function () {
'use strict';
const F = window.F, V = F.VOX, K = () => F.M3K;
const H = (x, y, z, s) => F.U.hash2(x * 73 + z * 19, y * 31 + z, s || 1);
const def = (id, d) => { if (!V.has(id)) V.def(id, d); };
// re-use another def's build/parts with a different scale / fixed options (lazy: the source may load later)
function alias(id, src, scale, fixed, meta, size) {
  const srcDef = () => V.defs[src];
  const parts = {};
  const pn = (meta && meta.parts) || [];
  for (const n of pn) parts[n] = { get pivot() { const p = srcDef() && srcDef().parts[n]; return p ? p.pivot : undefined; }, build(v, o) { const p = srcDef() && srcDef().parts[n]; if (p) p.build(v, Object.assign({}, fixed || {}, o)); } };
  V.def(id, { size: size || (srcDef() ? srcDef().size : [16, 16, 16]), scale, build(v, o) { const d = srcDef(); if (d) d.build(v, Object.assign({}, fixed || {}, o)); }, parts: pn.length ? parts : undefined, meta: Object.assign({ group: 'shop' }, meta || {}) });
  // size must match the source grid: fix up lazily on first use
  const d = V.defs[id]; if (!size && !srcDef()) Object.defineProperty(d, 'size', { get() { return srcDef() ? srcDef().size : [16, 16, 16]; } });
}

/* ================================================================== Møbelbua (1/10) */
def('f_blomsterteppe', { size: [26, 1, 18], scale: 1 / 10,
  build(v) { for (let z = 0; z < 18; z++) for (let x = 0; x < 26; x++) { const e = x === 0 || z === 0 || x === 25 || z === 17; v.set(x, 0, z, e ? 'rose' : 'mint'); } for (const [x, z, c] of [[5, 5, 'pink'], [12, 9, 'butter'], [19, 5, 'lilac'], [6, 12, 'peach'], [19, 12, 'pink'], [12, 3, 'white'], [12, 14, 'lilac']]) { v.set(x, 0, z, 'yellow'); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(x + a, 0, z + b, c); v.set(x + 1, 0, z + 1, 'leaf2'); } for (let x = 2; x < 24; x += 2) { v.set(x, 0, 1, 'white'); v.set(x, 0, 16, 'white'); } },
  meta: { group: 'slot', slot: 'teppe', shop: 'blomsterteppe' } });
def('f_regnbueteppe', { size: [24, 1, 18], scale: 1 / 10,
  build(v) { const band = ['lilac', 'sky', 'mint', 'butter', 'peach', 'pink', 'white']; for (let z = 0; z < 18; z++) for (let x = 0; x < 24; x++) { const d = Math.hypot((x - 11.5) / 12, (z - 8.5) / 9); if (d <= 1) v.set(x, 0, z, band[Math.min(6, Math.floor(d * 7))]); } },
  meta: { group: 'slot', slot: 'teppe', shop: 'regnbueteppe' } });
def('f_stjernelampe', { size: [10, 18, 8], scale: 1 / 10,
  build(v) { v.cyl(4.5, 0, 3.5, 3, 1, 'lilac'); v.box(4, 1, 3, 5, 10, 4, 'gold'); },
  parts: { light: { pivot: [5, 11, 4], build(v) { for (let y = 10; y < 18; y++) for (let x = 0; x < 10; x++) { const cx = x - 4.5, cy = y - 13.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx) - Math.PI / 2; const R = 1.8 + 2.4 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2.5); if (r <= R) v.box(x, y, 3, x, y, 4, r < R - 1 ? 'glowYellow' : 'gold'); } } } },
  meta: { group: 'slot', slot: 'lampe', shop: 'stjernelampe', glow: true } });
def('f_sopplampe', { size: [12, 12, 12], scale: 1 / 10,
  build(v) { v.cyl(5.5, 0, 5.5, 2.4, 6, 'cream'); v.box(5, 0, 8, 6, 2, 8, 'woodDark'); v.set(6, 1, 9, 'gold'); },
  parts: { light: { pivot: [6, 6, 6], build(v) { v.ellipsoid(5.5, 7, 5.5, 5.6, 3.6, 5.6, 'red'); v.clear(0, 0, 0, 11, 6, 11); K().speck(v, 'red', 'white', 0.18, 2, true); v.cyl(5.5, 6, 5.5, 4.5, 1, 'glowYellow'); } } },
  meta: { group: 'slot', slot: 'lampe', shop: 'sopplampe', glow: true } });
function curtains(v, side, c, c2, star) {
  const x0 = side < 0 ? 0 : 20, x1 = side < 0 ? 5 : 25;
  for (let y = 0; y < 26; y++) for (let x = x0; x <= x1; x++) { const fold = (x + (y > 8 ? 0 : 0)) % 2; v.set(x, y, fold ? 1 : 2, (star && H(x, y, 1, 3) < 0.08) ? 'glowYellow' : (fold ? c : c2)); }
  v.box(x0, 9, 3, x1, 9, 3, 'gold');
}
for (const [id, c, c2, star, shop] of [['f_rosagardiner', 'pink', 'blossom', false, 'rosagardiner'], ['f_stjernegardiner', 'navySoft', 'lavender', true, 'stjernegardiner']]) {
  def(id, { size: [26, 28, 4], scale: 1 / 10,
    build(v) { v.box(0, 26, 1, 25, 26, 1, 'gold'); v.set(0, 27, 1, 'gold'); v.set(25, 27, 1, 'gold'); for (let x = 1; x < 25; x++) v.set(x, 25, 2, (x % 3 === 0) ? 'gold' : c2); },
    parts: { left: { pivot: [0, 26, 2], build(v) { curtains(v, -1, c, c2, star); } }, right: { pivot: [26, 26, 2], build(v) { curtains(v, 1, c, c2, star); } } },
    meta: { group: 'slot', slot: 'gardiner', shop } });
}
const BOOKS = ['rose', 'sky', 'butter', 'mint', 'lilac', 'coral', 'teal', 'peach', 'plum'];
def('f_bokhylle', { size: [16, 22, 7], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 15, 21, 6, 'woodLight'); v.box(1, 1, 1, 14, 20, 6, 0); v.box(1, 1, 0, 14, 20, 0, 'wood'); for (const y of [1, 7, 13]) v.box(1, y, 1, 14, y, 6, 'woodLight');
    for (const y0 of [2, 8, 14]) { let x = 1; while (x < 14) { const w = 1, h = 3 + Math.floor(H(x, y0, 1, 2) * 3), c = BOOKS[Math.floor(H(x, y0, 2, 3) * BOOKS.length)]; if (H(x, y0, 3, 4) < 0.12) { x += 1; continue; } v.box(x, y0, 2, x + w - 1, y0 + h - 1, 5, c); v.set(x, y0 + h - 2, 5, 'white'); x += w; } } v.box(0, 21, 0, 15, 21, 6, 'wood'); },
  meta: { group: 'slot', slot: 'hylle', shop: 'bokhylle' } });
def('f_lekehylle', { size: [18, 14, 8], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 17, 13, 7, 'mint'); v.box(1, 1, 1, 16, 12, 7, 0); v.box(1, 1, 0, 16, 12, 0, 'white'); v.box(1, 6, 1, 16, 6, 7, 'mint'); v.box(1, 1, 1, 16, 1, 7, 'mint');
    v.sphere(4, 4, 4, 2, 'rose'); v.paint((x, y, z, c) => (c === F.col('rose') && y === 4 ? 'white' : null));
    v.box(8, 2, 3, 10, 4, 5, 'butter'); v.box(11, 2, 3, 13, 4, 5, 'sky'); v.box(9, 5, 3, 11, 5, 5, 'coral'); v.box(14, 2, 2, 15, 3, 6, 'lilac');
    v.ellipsoid(5, 9, 4, 2.2, 2, 2, 'woodLight'); v.sphere(5, 11.5, 4, 1.6, 'woodLight'); v.set(4, 12.5, 4, 'woodLight'); v.set(6, 12.5, 4, 'woodLight'); v.set(5, 11, 6, 'black');
    v.box(9, 7, 3, 15, 9, 5, 'red'); v.box(10, 10, 4, 12, 11, 4, 'red'); v.set(9, 7, 6, 'black'); v.set(14, 7, 6, 'black'); },
  meta: { group: 'slot', slot: 'hylle', shop: 'lekehylle' } });
function bedBase(v, W, L, frame, sheet) { v.box(1, 0, 2, W - 2, 3, L - 1, frame); v.box(2, 4, 3, W - 3, 5, L - 1, 'white'); v.box(1, 5, 9, W - 2, 6, L - 1, sheet); v.box(1, 3, 9, 1, 5, L - 1, sheet); v.box(W - 2, 3, 9, W - 2, 5, L - 1, sheet); }
const pillows = (W, c) => ({ pivot: [W / 2, 6, 5], build(v) { v.box(3, 6, 3, W / 2 - 2, 8, 7, c); v.box(W / 2 + 1, 6, 3, W - 4, 8, 7, 'white'); v.set(5, 9, 5, c); } });
def('f_hjerteseng', { size: [22, 18, 26], scale: 1 / 10,
  build(v) { bedBase(v, 22, 26, 'pink', 'blossom'); for (let y = 4; y < 18; y++) for (let x = 0; x < 22; x++) { const hx = (x - 10.5) / 9, hy = (y - 11) / 7; const inH = (Math.hypot(hx + 0.45, hy - 0.35) < 0.55) || (Math.hypot(hx - 0.45, hy - 0.35) < 0.55) || (hy < 0.4 && Math.abs(hx) < 0.95 - (0.4 - hy) * 0.7); if (inH) v.box(x, y, 0, x, y, 1, 'rose'); } v.paint((x, y, z, c) => (c === F.col('blossom') && z > 12 && (x + z) % 5 === 0 ? 'white' : null)); },
  parts: { pillows: pillows(22, 'pink') },
  meta: { group: 'slot', slot: 'seng', shop: 'hjerteseng' } });
def('f_himmelseng', { size: [22, 30, 26], scale: 1 / 10,
  build(v) { bedBase(v, 22, 26, 'white', 'lilac'); for (const [x, z] of [[1, 2], [20, 2], [1, 25], [20, 25]]) v.box(x, 0, z, x, 26, z, 'gold'); v.box(1, 3, 0, 20, 12, 1, 'white'); v.box(3, 12, 0, 18, 13, 1, 'white');
    for (let x = 1; x <= 20; x++) for (let z = 2; z <= 25; z++) { v.set(x, 27, z, (x + z) % 4 === 0 ? 'gold' : 'lavender'); if (x === 1 || x === 20 || z === 2 || z === 25) { v.set(x, 26, z, 'lavender'); if ((x + z) % 2) v.set(x, 25, z, 'lilac'); } }
    for (const z of [3, 4, 23, 24]) for (const x of [1, 20]) v.box(x, 6, z, x, 24, z, z < 10 ? 'lilac' : 'lavender');
    v.box(10, 28, 12, 11, 29, 14, 'gold'); v.set(10, 29, 13, 'gem1'); },
  parts: { pillows: pillows(22, 'lilac') },
  meta: { group: 'slot', slot: 'seng', shop: 'himmelseng' } });
def('f_skyseng', { size: [26, 18, 28], scale: 1 / 10,
  build(v) { K().blob(v, 12.5, 4, 14, 11.5, 4, 12.5, 'white', 6, 3); v.clear(0, 0, 0, 25, 0, 27); v.paint((x, y, z, c) => (y <= 2 ? 'snow' : null));
    const band = ['rose', 'peach', 'butter', 'mint', 'sky', 'lilac']; for (let i = 0; i < 6; i++) for (let a = 0; a <= 40; a++) { const t = a / 40 * Math.PI; v.box(Math.round(12.5 + Math.cos(t) * (11 - i)), Math.round(6 + Math.sin(t) * (11 - i)), 1, Math.round(12.5 + Math.cos(t) * (11 - i)), Math.round(6 + Math.sin(t) * (11 - i)), 2, band[i]); }
    v.box(5, 7, 10, 20, 7, 25, 'sky'); v.paint((x, y, z, c) => (c === F.col('sky') && y === 7 && (x * 3 + z) % 7 === 0 ? 'white' : null)); },
  parts: { pillows: { pivot: [13, 8, 6], build(v) { v.ellipsoid(8, 9, 6, 3.5, 1.6, 2.5, 'white'); v.ellipsoid(17, 9, 6, 3.5, 1.6, 2.5, 'blossom'); } } },
  meta: { group: 'slot', slot: 'seng', shop: 'skyseng' } });
for (const [id, shop, pat] of [['f_blomstertapet', 'blomstertapet', 'blomst'], ['f_stripetapet', 'stripetapet', 'stripe']]) {
  def(id, { size: [20, 26, 2], scale: 1 / 10,
    build(v) { for (let y = 0; y < 26; y++) for (let x = 0; x < 20; x++) { let c; if (pat === 'stripe') c = Math.floor(x / 2) % 2 ? 'mint' : 'cream'; else { c = 'peach'; const fx = (x + (Math.floor(y / 6) % 2) * 3) % 6, fy = y % 6; if (fx === 2 && fy === 2) c = 'yellow'; else if (Math.abs(fx - 2) + Math.abs(fy - 2) === 1) c = (Math.floor(y / 6) % 2) ? 'rose' : 'lilac'; else if (fx === 4 && fy === 4) c = 'leaf2'; } v.set(x, y, 0, c); } v.box(0, 0, 1, 19, 1, 1, 'white'); v.box(0, 24, 1, 19, 25, 1, 'white'); },
    meta: { group: 'slot', slot: 'vegg', shop, pattern: pat } });
}
def('f_gyngestol', { size: [14, 18, 18], scale: 1 / 10,
  build(v) {},
  parts: { chair: { pivot: [7, 0, 9], build(v) { for (const x of [1, 12]) for (let z = 0; z < 18; z++) { const y = Math.round(((z - 8.5) / 8.5) ** 2 * 2.5); v.set(x, y, z, 'woodDark'); } for (const [x, z] of [[1, 4], [12, 4], [1, 13], [12, 13]]) v.box(x, 1, z, x, 6, z, 'wood'); v.box(1, 6, 4, 12, 7, 14, 'wood'); v.box(2, 8, 5, 11, 8, 13, 'coral'); v.box(1, 7, 3, 12, 17, 4, 'wood'); v.box(2, 9, 4, 11, 16, 4, 'peach'); for (const x of [1, 12]) v.box(x, 8, 5, x, 11, 13, 'wood'); v.box(5, 12, 5, 8, 14, 5, 'white'); } } },
  meta: { group: 'slot', slot: 'stol', shop: 'gyngestol' } });
def('f_saccosekk', { size: [14, 9, 14], scale: 1 / 10,
  build(v) { v.ellipsoid(6.5, 3, 6.5, 6.5, 4, 6.5, 'pink'); v.ellipsoid(6.5, 6, 4, 5, 3, 3, 'pink'); v.clear(0, 0, 0, 13, -1, 13); v.ellipsoid(6.5, 5.5, 8, 4, 1.5, 4, 'rose'); K().speck(v, 'pink', 'blossom', 0.2, 3); },
  meta: { group: 'slot', slot: 'stol', shop: 'saccosekk' } });
def('f_akvarium', { size: [18, 20, 9], scale: 1 / 10,
  build(v) { v.box(1, 0, 1, 16, 8, 7, 'woodLight'); v.box(2, 1, 7, 15, 7, 7, 'wood'); v.set(8, 4, 8, 'gold'); v.box(0, 9, 0, 17, 9, 8, 'navySoft'); v.box(0, 10, 0, 17, 18, 8, 'gAqua'); v.box(1, 10, 1, 16, 17, 7, 0); v.box(1, 10, 1, 16, 10, 7, 'sand'); v.box(3, 11, 2, 3, 15, 2, 'leaf'); v.box(14, 11, 3, 14, 14, 3, 'leaf2'); v.box(6, 11, 2, 8, 12, 3, 'coral'); v.box(0, 19, 0, 17, 19, 8, 'navySoft'); },
  parts: { fish: { pivot: [9, 14, 4], build(v) { for (const [x, y, z, c] of [[5, 14, 4, 'orange'], [11, 15, 5, 'yellow'], [9, 12, 3, 'rose']]) { v.box(x, y, z, x + 2, y + 1, z, c); v.set(x - 1, y, z, c); v.set(x - 1, y + 1, z, c); v.set(x + 2, y + 1, z + 1, 'black'); } v.set(12, 17, 4, 'white'); v.set(6, 16, 5, 'white'); } } },
  meta: { group: 'slot', slot: 'akvarium', shop: 'akvarium' } });
def('f_dukkehus', { size: [16, 18, 10], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 15, 10, 8, 'pink'); v.box(1, 1, 1, 14, 9, 8, 0); v.box(1, 1, 1, 14, 1, 8, 'woodLight'); v.box(1, 5, 1, 14, 5, 8, 'woodLight'); v.box(7, 1, 1, 8, 9, 8, 'pink');
    v.box(2, 2, 1, 6, 4, 1, 'mint'); v.box(9, 2, 1, 13, 4, 1, 'butter'); v.box(2, 6, 1, 6, 8, 1, 'lilac'); v.box(9, 6, 1, 13, 8, 1, 'sky'); v.box(3, 2, 3, 5, 2, 5, 'rose'); v.box(10, 6, 3, 12, 6, 6, 'white'); v.box(10, 7, 3, 12, 7, 3, 'pink'); },
  parts: { roof: { pivot: [8, 11, 4], build(v) { for (let i = 0; i < 7; i++) v.box(i, 11 + i, 0, 15 - i, 11 + i, 8, i % 2 ? 'roofLilac' : 'white'); v.box(11, 13, 2, 12, 17, 3, 'brick'); } } },
  meta: { group: 'slot', slot: 'pynt1', shop: 'dukkehus' } });
def('f_litepiano', { size: [18, 16, 9], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 17, 14, 4, 'white'); v.box(0, 6, 4, 17, 7, 8, 'white'); for (const x of [1, 16]) v.box(x, 0, 6, x, 6, 7, 'white'); v.box(1, 7, 5, 16, 7, 8, 'white'); for (let x = 1; x <= 16; x += 1) v.set(x, 8, 7, x % 2 ? 'cream' : 'white'); for (const x of [2, 3, 5, 6, 7, 9, 10, 12, 13, 14]) v.set(x, 8, 6, 'black'); v.box(2, 10, 4, 15, 13, 4, 'cream2'); v.box(7, 11, 5, 10, 12, 5, 'pink'); v.set(4, 15, 2, 'rose'); v.set(13, 15, 2, 'sky'); v.box(3, 15, 1, 14, 15, 3, 'white'); },
  parts: { lid: { pivot: [9, 9, 5], build(v) { v.box(1, 9, 5, 16, 9, 8, 'white'); v.box(1, 9, 8, 16, 10, 8, 'white'); } } },
  meta: { group: 'slot', slot: 'pynt1', shop: 'litepiano' } });

/* ================================================================== Hagesenteret (1/10) */
alias('g_blomsterbed', 'p_blomsterbed', 1 / 10, { seed: 5 }, { group: 'plot', shop: 'blomsterbed' }, [24, 6, 14]);
def('g_solsikker', { size: [24, 38, 12], scale: 1 / 16,
  build(v) { v.box(0, 0, 0, 23, 2, 11, 'woodLight'); v.box(1, 2, 1, 22, 2, 10, 'soil');
    for (const [cx, h] of [[5, 28], [12, 34], [19, 25]]) { v.box(cx, 3, 5, cx + 1, h, 6, 'green'); v.box(cx + 2, 10, 5, cx + 4, 11, 6, 'leaf'); v.box(cx - 3, 15, 5, cx - 1, 16, 6, 'leaf');
      for (let y = h - 4; y <= h + 4; y++) for (let x = cx - 4; x <= cx + 5; x++) { const d = Math.hypot(x - cx - 0.5, y - h); if (d <= 2.3) v.set(x, y, 8, 'woodDark'); else if (d <= 4.3) v.set(x, y, 8, d > 3.4 ? 'yellow' : 'honey'); } } },
  meta: { group: 'plot', shop: 'solsikker' } });
def('g_rosebusk', { size: [18, 16, 18], scale: 1 / 10,
  build(v) { v.cyl(8.5, 0, 8.5, 5, 4, 'brick'); v.cyl(8.5, 3, 8.5, 4.2, 1, 'soil'); K().blob(v, 8.5, 10, 8.5, 7, 5.5, 7, 'leaf', 3, 4); K().speck(v, 'leaf', 'leafDark', 0.3, 2); K().speck(v, 'leaf', 'rose', 0.14, 6, true); K().speck(v, 'leafDark', 'pink', 0.1, 7, true); },
  meta: { group: 'plot', shop: 'rosebusk' } });
def('g_benk', { size: [22, 14, 10], scale: 1 / 10,
  build(v) { for (const x of [1, 19]) { v.box(x, 0, 1, x + 1, 5, 2, 'navySoft'); v.box(x, 0, 7, x + 1, 5, 8, 'navySoft'); v.box(x, 6, 1, x + 1, 13, 1, 'navySoft'); v.box(x, 6, 2, x + 1, 7, 8, 'navySoft'); }
    for (let z = 2; z <= 8; z += 2) v.box(0, 5, z, 21, 5, z, 'white'); for (const y of [8, 10, 12]) v.box(1, y, 1, 20, y, 1, 'white'); v.set(10, 13, 1, 'pink'); v.set(11, 13, 1, 'pink'); },
  meta: { group: 'plot', shop: 'benk', seat: [0, 0.55, 0.15] } });
def('g_lyktestolpe', { size: [10, 30, 10], scale: 1 / 10,
  build(v) { v.box(3, 0, 3, 6, 1, 6, 'mint'); v.box(4, 2, 4, 5, 23, 5, 'mint'); v.box(2, 29, 2, 7, 29, 7, 'mint'); v.set(4, 30 - 1, 4, 'mint'); for (const [x, z] of [[2, 2], [7, 2], [2, 7], [7, 7]]) v.box(x, 24, z, x, 28, z, 'mint'); v.box(2, 23, 2, 7, 23, 7, 'mint'); },
  parts: { light: { pivot: [5, 24, 5], build(v) { v.box(3, 24, 3, 6, 28, 6, 'lamp'); } } },
  meta: { group: 'plot', shop: 'lyktestolpe', glow: true } });
alias('g_fuglebad', 'p_fuglebad', 1 / 10, {}, { group: 'plot', shop: 'fuglebad', parts: ['birds'] }, [14, 14, 14]);
def('g_epletre', { size: [30, 46, 30], scale: 1 / 12,
  build(v, o) { const d = V.defs.n_tre_eple; if (d) d.build(v, { seed: 2 }); v.cyl(15, 0, 15, 6, 1, 'brick'); v.cyl(15, 1, 15, 5, 1, 'soil'); },
  meta: { group: 'plot', shop: 'epletre' } });
def('g_huske', { size: [22, 22, 12], scale: 1 / 10,
  build(v) { for (const x of [1, 20]) { v.line(x, 0, 1, x, 19, 5, 'woodLight'); v.line(x, 0, 10, x, 19, 6, 'woodLight'); } v.box(0, 20, 5, 21, 21, 6, 'woodRed'); v.set(0, 22 - 1, 5, 'woodRed'); },
  parts: { seat: { pivot: [11, 20, 6], build(v) { for (const x of [8, 14]) v.line(x, 19, 6, x, 5, 6, 'white'); v.box(7, 4, 4, 15, 4, 8, 'pink'); v.box(7, 5, 4, 15, 5, 4, 'rose'); for (const x of [8, 14]) { v.set(x, 12, 6, 'blossom'); v.set(x, 9, 6, 'butter'); } } } },
  meta: { group: 'plot', shop: 'huske' } });
def('g_sklie', { size: [12, 18, 28], scale: 1 / 10,
  build(v) { for (const x of [2, 9]) v.box(x, 0, 2, x, 14, 2, 'mint'); for (let y = 2; y < 14; y += 3) v.box(2, y, 2, 9, y, 2, 'white'); v.box(2, 13, 2, 9, 13, 7, 'white'); for (const x of [2, 9]) v.box(x, 0, 7, x, 16, 7, 'mint'); v.box(2, 17, 2, 9, 17, 7, 'butter');
    for (let z = 8; z < 27; z++) { const y = Math.max(1, Math.round(13 - (z - 8) * 0.68)); v.box(3, y, z, 8, y, z, 'butter'); v.set(3, y + 1, z, 'yellow'); v.set(8, y + 1, z, 'yellow'); } },
  meta: { group: 'plot', shop: 'sklie' } });
def('g_trampoline', { size: [24, 7, 24], scale: 1 / 10,
  build(v) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; v.box(Math.round(11.5 + Math.cos(a) * 10), 0, Math.round(11.5 + Math.sin(a) * 10), Math.round(11.5 + Math.cos(a) * 10), 3, Math.round(11.5 + Math.sin(a) * 10), 'grey'); } K().ring(v, 11.5, 4, 11.5, 11, i => (i % 6 < 3 ? 'pink' : 'butter')); },
  parts: { mat: { pivot: [12, 4, 12], build(v) { for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) { const d = Math.hypot(x - 11.5, z - 11.5); if (d < 10.2) v.set(x, 4, z, d < 3 ? 'butter' : 'lilac'); } } } },
  meta: { group: 'plot', shop: 'trampoline' } });
alias('g_fontene', 'v_fontene', 1 / 10, {}, { group: 'plot', shop: 'fontene', parts: ['jet'] }, [24, 22, 24]);
def('g_lysthus', { size: [30, 34, 30], scale: 1 / 10,
  build(v) { v.cyl(14.5, 0, 14.5, 14, 1, 'pathStone'); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = Math.round(14.5 + Math.cos(a) * 12), z = Math.round(14.5 + Math.sin(a) * 12); v.box(x, 1, z, x, 20, z, 'white'); }
    for (let y = 2; y < 8; y++) for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2; if (a > 1.2 && a < 1.95) continue; if ((k + y) % 3 === 0) v.set(Math.round(14.5 + Math.cos(a) * 12), y, Math.round(14.5 + Math.sin(a) * 12), 'white'); }
    for (let i = 0; i < 12; i++) v.cyl(14.5, 21 + i, 14.5, Math.max(0.6, 15 - i * 1.25), 1, i % 2 ? 'roofPink' : 'white'); v.set(14, 33, 14, 'gold');
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; v.set(Math.round(14.5 + Math.cos(a) * 12.5), 19, Math.round(14.5 + Math.sin(a) * 12.5), k % 2 ? 'rose' : 'leaf'); }
    v.cyl(14.5, 1, 14.5, 2.5, 5, 'woodLight'); v.cyl(14.5, 6, 14.5, 4, 1, 'white'); },
  meta: { group: 'plot', shop: 'lysthus' } });

/* ================================================================== Byggebua (plot buildings) */
def('b_lekehus', { size: [26, 30, 24], scale: 1 / 10,
  build(v) { v.box(2, 0, 2, 23, 1, 21, 'woodLight'); v.box(3, 2, 3, 22, 15, 20, 'butter'); for (let y = 3; y <= 15; y += 3) v.box(3, y, 20, 22, y, 20, 'peach');
    for (let i = 0; i < 12; i++) { v.box(1, 16 + i, 1 + i, 24, 16 + i, 22 - i, i % 2 ? 'roofRed' : 'coral'); if (i % 4 === 0) { v.box(1, 16 + i, 1 + i, 24, 16 + i, 1 + i, 'white'); v.box(1, 16 + i, 22 - i, 24, 16 + i, 22 - i, 'white'); } }
    for (let y = 16; y < 26; y++) { const w = y - 16; v.box(3, y, 3 + w, 22, y, 20 - w, 'butter'); }
    v.box(9, 2, 21, 16, 12, 21, 'white'); v.clear(10, 2, 21, 15, 11, 21); v.box(10, 2, 20, 15, 11, 20, 'woodDark');
    v.box(4, 8, 21, 7, 11, 21, 'glass'); v.box(18, 8, 21, 21, 11, 21, 'glass'); for (const x of [4, 18]) { v.box(x, 7, 22, x + 3, 7, 22, 'woodRed'); v.set(x, 8, 22, 'rose'); v.set(x + 2, 8, 22, 'butter'); }
    v.box(12, 20, 21, 13, 22, 21, 'glass'); v.set(23, 27, 11, 'pink'); v.box(18, 18, 6, 20, 26, 8, 'brick'); },
  parts: { door: { pivot: [10, 2, 21], build(v) { v.box(10, 2, 21, 15, 11, 21, 'mint'); v.set(14, 6, 22, 'gold'); v.box(11, 8, 21, 14, 10, 21, 'glass'); } } },
  meta: { group: 'plot', shop: 'lekehus' } });
alias('b_iskiosk', 'p_iskiosk', 1 / 10, {}, { group: 'plot', shop: 'iskiosk' }, [30, 46, 24]);
alias('b_feensbod', 'p_bod', 1 / 10, {}, { group: 'plot', shop: 'feensbod', parts: ['bell', 'awning'] }, [34, 36, 24]);
alias('b_vindmølle', 'n_molle', 1 / 14, {}, { group: 'plot', shop: 'vindmølle', parts: ['sails'] }, [56, 70, 30]);
alias('b_karusell', 'v_karusell', 1 / 11, {}, { group: 'plot', shop: 'karusell', parts: ['rotor'] }, [40, 36, 40]);
alias('b_pariserhjul', 'v_pariserhjul', 1 / 12, {}, { group: 'plot', shop: 'pariserhjul', parts: ['wheel'] }, [56, 74, 24]);

/* ================================================================== Reisebua (rides) */
alias('ride_robåt', 'p_robat', 1 / 10, { col: 'coral' }, { group: 'ride', shop: 'robåt', parts: ['oars'] }, [16, 10, 32]);
def('ride_hestevogn', { size: [18, 22, 30], scale: 1 / 10,
  build(v) {
    v.box(3, 5, 6, 14, 6, 23, 'gold');
    for (let z = 7; z <= 22; z++) for (let y = 7; y <= 18; y++) for (let x = 2; x <= 15; x++) { const d = ((x - 8.5) / 6.8) ** 2 + ((y - 12.5) / 6.2) ** 2 + ((z - 14.5) / 8.5) ** 2; if (d <= 1) v.set(x, y, z, 'white'); }
    v.box(4, 9, 10, 13, 18, 19, 0); v.box(4, 9, 10, 13, 10, 19, 'pink'); v.box(5, 11, 11, 12, 12, 11, 'pink');
    v.paint((x, y, z, c) => (c === F.col('white') && (y === 12 || z === 14) && (x === 2 || x === 15 || y > 16) ? 'gold' : null));
    v.box(7, 19, 13, 10, 20, 16, 'gold'); v.set(8, 21, 14, 'gem1');
    v.line(6, 6, 24, 6, 5, 29, 'woodDark'); v.line(11, 6, 24, 11, 5, 29, 'woodDark'); v.box(6, 5, 29, 11, 5, 29, 'woodDark'); },
  parts: { wheels: { pivot: [9, 5, 15], build(v) { for (const [x, z, r] of [[1, 9, 4.6], [16, 9, 4.6], [1, 21, 3.6], [16, 21, 3.6]]) { for (let y = 0; y < 11; y++) for (let zz = 0; zz < 30; zz++) { const d = Math.hypot(y - 5, zz - z); if (d <= r && d > r - 1.1) v.set(x, y, zz, 'gold'); } v.box(x, 5, z, x, 5, z, 'honey'); v.line(x, 5 - Math.round(r) + 1, z, x, 5 + Math.round(r) - 1, z, 'gold'); v.line(x, 5, z - Math.round(r) + 1, x, 5, z + Math.round(r) - 1, 'gold'); } } } },
  meta: { group: 'ride', shop: 'hestevogn' } });
alias('ride_luftballong', 'v_luftballong', 1 / 11, { cols: ['lilac', 'pink', 'butter', 'mint'] }, { group: 'ride', shop: 'luftballong', parts: ['balloon'] }, [36, 58, 36]);
})();
