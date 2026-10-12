/* Feslottet – WP9 SHOPS: models for the 9 themed kingdom shops + the Kikkert (DESIGN2 §6.2). Owner: WP9.
   Ids follow js/data/catalog.js (w_ wear, toy_, food_, pet_, gear_, f_ Fetårnet slot furniture, g_ plot items, ride_ plot rides).
   Palette names only, front = +z, origin = bottom centre. Small things 1/16 m; slot / plot / ride things 1/10 m (like m_slots.js).
   Wearables carry meta.wear {anchor, dy} (m_catalog.js convention) so People/royals can wear them; head pieces are sized for the
   fairy's big head (inner ring ≥ 12 × 10 voxels) – fairy.js WEAR attaches them 1:1 at the head anchor.
   Every model has meta.shop = catalogue id and meta.by = 'wp9'. */
(function () {
'use strict';
const F = window.F, V = F.VOX, P = F.PAL, H = F.U.hash2;
const def = (id, size, scale, build, meta, extra) => { if (V.has(id)) return; V.def(id, Object.assign({ size, scale, build, meta: Object.assign({ by: 'wp9' }, meta || {}) }, extra || {})); };
const S16 = 1 / 16, S10 = 1 / 10;
const inC = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.25;
function ring(v, cx, y, cz, r0, r1, c, h) { for (let yy = y; yy < y + (h || 1); yy++) for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) if (inC(x, z, cx, cz, r1) && !inC(x, z, cx, cz, r0)) v.set(x, yy, z, c); }
function discZ(v, cx, cy, z0, z1, r, c) { for (let z = z0; z <= z1; z++) for (let y = 0; y < v.size[1]; y++) for (let x = 0; x < v.size[0]; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25) v.set(x, y, z, c); }
function discX(v, x0, x1, cy, cz, r, c) { for (let x = x0; x <= x1; x++) for (let y = 0; y < v.size[1]; y++) for (let z = 0; z < v.size[2]; z++) if ((y - cy) ** 2 + (z - cz) ** 2 <= r * r + 0.25) v.set(x, y, z, c); }
function wheelX(v, x, cy, cz, r, c, hub) { for (let y = 0; y < v.size[1]; y++) for (let z = 0; z < v.size[2]; z++) { const d = Math.hypot(y - cy, z - cz); if (d <= r + 0.3 && d > r - 1.1) v.set(x, y, z, c); } v.set(x, Math.round(cy), Math.round(cz), hub || c); v.line(x, Math.round(cy - r + 1), Math.round(cz), x, Math.round(cy + r - 1), Math.round(cz), c); v.line(x, Math.round(cy), Math.round(cz - r + 1), x, Math.round(cy), Math.round(cz + r - 1), c); }
// flat 5-point star in the x–y plane (facing +z) at depth z0..z1
function star(v, cx, cy, z0, z1, R, c, c2) {
  for (let z = z0; z <= z1; z++) for (let y = Math.floor(cy - R - 1); y <= cy + R + 1; y++) for (let x = Math.floor(cx - R - 1); x <= cx + R + 1; x++) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dx, dy);
    const rr = R * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3));
    if (r <= rr + 0.3) v.set(x, y, z, c2 && r > rr - 0.9 ? c2 : c);
  }
}
// translucent wing tints (registered once as glass colours)
const tint = (name, base, k) => { if (P[name] != null) return; const c = new THREE.Color(P[base]).lerp(new THREE.Color(P.white), k); let h = c.getHex(); const used = new Set(Object.values(P)); while (used.has(h)) h ^= 1; P[name] = h; V.GLASS.add(h); };
tint('s2gRose', 'rose', 0.3); tint('s2gCoral', 'coral', 0.25); tint('s2gGold', 'gold', 0.3); tint('s2gSky', 'sky', 0.25);
const tiny = (v, x, y, z, c) => { v.set(x, y, z, c); v.set(x + 1, y, z, c); v.set(x - 1, y, z, c); v.set(x, y + 1, z, c); v.set(x, y - 1, z, c); };
const flower = (v, x, y, z, c, mid) => { v.set(x, y, z, mid || 'yellow'); v.set(x + 1, y, z, c); v.set(x - 1, y, z, c); v.set(x, y, z + 1, c); v.set(x, y, z - 1, c); };

/* ================================================================ WEAR – head pieces (fairy-sized, anchor 'head') */
const HEAD = dy => ({ group: 'klær', react: 'wear', wear: { anchor: 'head', dy } });
// hollow crown that fits over the fairy's head + hair (12 × 10 voxels): brim at y=0
function crown(v, cx, cz, r, h, c, top) { for (let y = 0; y < h; y++) ring(v, cx, y, cz, r - 1, r, c); if (top) v.cyl(cx, h, cz, r, 1, top); }
def('w_tulipanhatt', [18, 16, 18], S16, (v) => {
  const cx = 8.5, cz = 8.5;
  ring(v, cx, 0, cz, 6.4, 8.8, 'leaf');                                    // leafy brim
  for (const [a, l] of [[0.4, 1], [2.1, 1], [3.9, 1], [5.4, 1]]) for (let t = 6; t <= 9; t++) v.set(Math.round(cx + Math.cos(a) * t), 0, Math.round(cz + Math.sin(a) * t), 'leaf2');
  for (let y = 1; y <= 9; y++) { const r = 6.6 + Math.sin(y / 9 * Math.PI) * 0.8; ring(v, cx, y, cz, r - 1.1, r, y < 3 ? 'rose' : 'red'); }
  v.cyl(cx, 10, cz, 6.6, 1, 'red');
  // three petal tips
  for (const a of [Math.PI / 2, Math.PI / 2 + 2.1, Math.PI / 2 + 4.2]) { const x = Math.round(cx + Math.cos(a) * 4.8), z = Math.round(cz + Math.sin(a) * 4.8); v.box(x - 1, 11, z - 1, x + 1, 12, z + 1, 'red'); v.set(x, 13, z, 'red'); v.set(x, 14, z, 'rose'); }
  v.cyl(cx, 11, cz, 2.5, 1, 'yellow'); v.set(8, 12, 8, 'butter'); v.set(9, 12, 9, 'butter');
  v.paint((x, y, z, c) => (c === P.red && y > 2 && y < 10 && H(x, y, z) < 0.06 ? 'pink' : null));
}, Object.assign(HEAD(-0.2), { shop: 'tulipanhatt' }));
def('w_blomsterkrone', [18, 7, 18], S16, (v) => {
  const cx = 8.5, cz = 8.5;
  ring(v, cx, 0, cz, 6.4, 7.6, 'leaf');
  const cols = ['pink', 'white', 'lilac', 'rose', 'butter', 'blossom'];
  for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2, x = Math.round(cx + Math.cos(an) * 7), z = Math.round(cz + Math.sin(an) * 7); flower(v, x, 1, z, cols[a % 6]); v.set(x, 2, z, cols[a % 6]); }
  for (const [dx, h] of [[-3, 4], [0, 6], [3, 4]]) { const x = Math.round(cx + dx), z = 15; v.line(x, 1, z, x, h, z, 'leaf2'); flower(v, x, h, z, dx === 0 ? 'rose' : 'pink'); v.set(x, h + 1, z, dx === 0 ? 'rose' : 'pink'); }
}, Object.assign(HEAD(-0.1), { shop: 'blomsterkrone' }));
def('w_ridehjelm', [16, 11, 18], S16, (v) => {
  const cx = 7.5, cz = 8.5;
  for (let y = 0; y <= 9; y++) { const r = 7.2 * Math.sqrt(Math.max(0, 1 - (y / 9.6) ** 2)); if (r < 0.8) { v.set(7, y, 8, 'navySoft'); continue; } ring(v, cx, y, cz, Math.max(0, r - 1.2), r, 'navySoft'); }
  v.cyl(cx, 9, cz, 1.6, 1, 'navySoft'); v.set(7, 10, 8, 'navySoft'); v.set(8, 10, 9, 'navySoft');
  // visor at the front, harness band, gold button
  for (let x = 2; x <= 13; x++) for (let z = 15; z <= 17; z++) if (inC(x, z, cx, cz + 2, 8)) v.set(x, 1, z, 'black');
  ring(v, cx, 1, cz, 6.2, 7.3, 'white'); v.set(7, 10, 9, 'gold'); v.set(8, 10, 8, 'gold');
  for (let y = 3; y <= 8; y++) v.set(7, y, 1, 'gold');
}, Object.assign(HEAD(-0.32), { shop: 'ridehjelm' }));
def('w_ponniflette', [16, 9, 12], S16, (v) => {
  // a big pink bow with two braided ribbons and a tiny golden horseshoe charm (sits on top of the head)
  const bow = (x0, s) => { for (let y = 3; y <= 8; y++) { const w = Math.round(1 + Math.abs(y - 5.5) * 0.9); for (let k = 0; k < w + 2; k++) v.box(x0 + s * k, y, 5, x0 + s * k, y, 7, 'pink'); } };
  bow(7, -1); bow(9, 1); v.box(7, 4, 5, 9, 7, 8, 'rose'); v.set(8, 5, 9, 'gold'); v.set(7, 6, 9, 'gold'); v.set(9, 6, 9, 'gold');
  for (const x of [6, 10]) for (let y = 0; y <= 3; y++) v.box(x, y, 6, x, y, 6, y % 2 ? 'blossom' : 'pink');
  v.set(1, 6, 6, 'blossom'); v.set(14, 6, 6, 'blossom');
}, Object.assign(HEAD(-0.02), { shop: 'ponniflette' }));
def('w_perlekrone', [16, 9, 16], S16, (v) => {
  const cx = 7.5, cz = 7.5;
  ring(v, cx, 0, cz, 6.4, 7.6, 'silver', 2);
  for (let a = 0; a < 10; a++) { const an = a / 10 * Math.PI * 2, x = Math.round(cx + Math.cos(an) * 7), z = Math.round(cz + Math.sin(an) * 7); const h = a % 2 ? 4 : 6; v.line(x, 2, z, x, h - 1, z, 'silver'); v.set(x, h, z, 'milk'); }
  v.set(7, 1, 15, 'teal'); v.set(8, 1, 15, 'teal'); v.set(7, 2, 15, 'gem3'); v.box(7, 3, 15, 8, 5, 15, 'white'); v.set(7, 6, 15, 'milk'); v.set(8, 6, 15, 'milk');
  v.paint((x, y, z, c) => (c === P.silver && y === 0 && (x + z) % 3 === 0 ? 'white' : null));
}, Object.assign(HEAD(-0.06), { shop: 'perlekrone' }));
def('w_boblekrone', [16, 11, 16], S16, (v) => {
  const cx = 7.5, cz = 7.5;
  ring(v, cx, 0, cz, 6.4, 7.6, 'sky', 2); v.paint((x, y, z, c) => (y === 1 && (x + z) % 3 === 0 ? 'white' : null));
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2, x = cx + Math.cos(an) * 7, z = cz + Math.sin(an) * 7, r = a % 2 ? 1.5 : 2.3, y = 2 + r + (a % 3);
    v.sphere(x, y, z, r, 's2gSky'); v.set(Math.round(x - 0.6), Math.round(y + r * 0.5), Math.round(z), 'white'); }
  v.sphere(7.5, 6.5, 15, 2.4, 's2gSky'); v.set(7, 7, 16, 'white'); v.set(6, 8, 15, 'white');
}, Object.assign(HEAD(-0.08), { shop: 'boblekrone' }));
def('w_kakehatt', [16, 16, 16], S16, (v) => {
  const cx = 7.5, cz = 7.5;
  for (let y = 0; y <= 4; y++) ring(v, cx, y, cz, 6.4 + y * 0.2, 7.5 + y * 0.25, ['peach', 'pink', 'peach', 'pink', 'peach', 'pink'][(y + 1) % 2]);
  v.paint((x, y, z, c) => (y <= 4 && (Math.round(Math.atan2(z - cz, x - cx) * 5) % 2 === 0) ? 'rose' : null));
  for (let y = 5; y <= 11; y++) { const r = Math.max(0.6, 8 - (y - 5) * 1.15); v.cyl(cx, y, cz, r, 1, y % 2 ? 'cream' : 'white'); }
  v.clear(2, 5, 2, 13, 5, 13); ring(v, cx, 5, cz, 6.6, 8.2, 'white');
  v.sphere(cx, 13.2, cz, 1.6, 'cherry'); v.line(8, 14, 8, 9, 15, 7, 'leaf2');
  v.paint((x, y, z, c) => (y >= 6 && y <= 10 && (c === P.white || c === P.cream) && H(x, y, z, 5) < 0.07 ? ['red', 'sky', 'yellow', 'mint'][(x + y) % 4] : null));
}, Object.assign(HEAD(-0.24), { shop: 'kakehatt' }));
def('w_stjernehatt', [18, 22, 18], S16, (v) => {
  const cx = 8.5, cz = 8.5;
  ring(v, cx, 0, cz, 6.4, 8.9, 'navySoft'); ring(v, cx, 1, cz, 6.4, 7.6, 'gold');
  for (let y = 2; y <= 19; y++) { const r = 7.4 * (1 - (y - 2) / 19); if (r < 0.7) { v.set(8 + Math.round((y - 15) / 3), y, 8, 'navySoft'); continue; } ring(v, cx + (y > 13 ? (y - 13) * 0.25 : 0), y, cz, Math.max(0, r - 1.2), r, 'navySoft'); }
  v.paint((x, y, z, c) => (c === P.navySoft && y > 2 && H(x, y, z, 3) < 0.09 ? 'glowYellow' : null));
  star(v, 10, 20, 9, 9, 2, 'glowYellow');
}, Object.assign(HEAD(-0.2), { shop: 'stjernehatt' }));
def('w_vinterlue', [16, 15, 16], S16, (v) => {
  const cx = 7.5, cz = 7.5;
  for (let y = 0; y <= 10; y++) { const r = y < 3 ? 7.6 : 7.4 * Math.sqrt(Math.max(0, 1 - ((y - 2) / 8.6) ** 2)); if (r < 0.8) continue; ring(v, cx, y, cz, y < 3 ? 6.3 : Math.max(0, r - 1.2), r, y < 3 ? 'white' : 'red'); }
  v.cyl(cx, 10, cz, 2.6, 1, 'red');
  v.paint((x, y, z, c) => (y < 3 && (Math.round(Math.atan2(z - cz, x - cx) * 5) % 2 === 0) ? 'cream' : (y === 5 || y === 6) && c === P.red && (x + z) % 2 === 0 ? 'white' : null));
  v.sphere(cx, 12.4, cz, 2.3, 'white');
}, Object.assign(HEAD(-0.3), { shop: 'vinterlue' }));
def('w_krystallhatt', [18, 14, 18], S16, (v) => {
  const cx = 8.5, cz = 8.5;
  ring(v, cx, 0, cz, 6.4, 8.9, 'ice');
  crown(v, cx, cz, 7.2, 8, 'lavender'); for (let y = 1; y < 8; y++) ring(v, cx, y, cz, 6.1, 7.2, y === 2 ? 'silver' : 'crystal');
  v.cyl(cx, 8, cz, 7.2, 1, 'crystal');
  for (const [x, z, h] of [[8, 8, 5], [5, 7, 3], [11, 9, 3], [8, 5, 2], [9, 12, 2]]) { v.box(x, 9, z, x, 8 + h, z, 'crystal'); v.set(x, 9 + h, z, 'glass'); }
  v.set(8, 2, 16, 'gem2'); v.set(9, 2, 16, 'gem2');
}, Object.assign(HEAD(-0.22), { shop: 'krystallhatt' }));

/* ================================================================ WEAR – dresses (anchor 'body', grid like m_catalog's dress) */
const DRESS = { group: 'klær', react: 'wear', wear: { anchor: 'body', dy: -0.42 } };
function dressDef(id, shop, rows, body, deco) {
  def(id, [14, 16, 10], S16, (v) => {
    const cx = 7, cz = 4.5, flare = 6.2;
    for (let y = 0; y <= 8; y++) { const r = flare - (flare - 3) * (y / 8); for (let z = 0; z < 10; z++) for (let x = 0; x < 14; x++) if (((x - cx) / r) ** 2 + ((z - cz) / Math.min(r, 4.6)) ** 2 <= 1.02) v.set(x, y, z, rows[Math.min(rows.length - 1, y)]); }
    v.box(5, 9, 3, 9, 13, 5, body); v.box(6, 9, 6, 8, 12, 6, body); v.set(5, 14, 4, body); v.set(9, 14, 4, body); v.box(6, 13, 5, 8, 13, 5, 0);
    if (deco) deco(v);
  }, Object.assign({ shop }, DRESS));
}
const surf = (v, fn) => v.paint((x, y, z, c) => (y <= 8 && (!v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1)) ? fn(x, y, z, c) : null));
dressDef('w_rosekjole', 'rosekjole', ['rose', 'pink', 'pink', 'blossom', 'pink', 'pink', 'blossom', 'pink', 'pink'], 'rose', v => {
  surf(v, (x, y, z) => (y % 3 === 1 && (x + z) % 3 === 0 ? 'red' : y % 3 === 1 && (x + z) % 3 === 1 ? 'leaf2' : null));
  v.set(7, 12, 6, 'red'); v.set(6, 12, 6, 'rose'); v.set(8, 12, 6, 'rose'); v.set(7, 11, 6, 'leaf2');
});
dressDef('w_kakekjole', 'kakekjole', ['cream', 'cream', 'pink', 'pink', 'cream', 'brown', 'brown', 'pink', 'white'], 'white', v => {
  surf(v, (x, y, z) => ((y === 4 || y === 8) && (x + z) % 2 === 0 ? 'white' : y === 1 && H(x, z, 2) < 0.3 ? ['red', 'sky', 'yellow'][(x + z) % 3] : null));
  v.set(7, 13, 6, 'cherry'); v.set(7, 12, 6, 'cherry'); v.set(6, 11, 6, 'pink'); v.set(8, 11, 6, 'pink');
});
dressDef('w_notekjole', 'notekjole', ['white', 'navySoft', 'navySoft', 'navySoft', 'navySoft', 'navySoft', 'navySoft', 'navySoft', 'navySoft'], 'navySoft', v => {
  surf(v, (x, y, z) => (y === 2 || y === 4 ? 'white' : y === 6 && (x + z) % 4 === 0 ? 'gold' : y === 7 && (x + z) % 4 === 0 ? 'gold' : null));
  v.set(7, 12, 6, 'gold'); v.set(7, 11, 6, 'gold'); v.set(6, 10, 6, 'gold');
});
dressDef('w_krystallkjole', 'krystallkjole', ['crystal', 'lavender', 'ice', 'lavender', 'ice', 'lilac', 'ice', 'lavender', 'ice'], 'ice', v => {
  surf(v, (x, y, z) => (y === 0 && (x + z) % 2 === 0 ? 'crystal' : H(x, y, z, 9) < 0.1 ? 'glass' : null));
  v.set(7, 12, 6, 'gem2'); v.set(7, 11, 6, 'crystal');
});

/* ================================================================ WEAR – wings (anchor 'back', parts wingL/wingR like m_catalog) */
function wingsDef(id, shop, cellFn, root) {
  const WC = 12;
  const half = (v, side) => { for (let y = 0; y < 18; y++) for (let dx = 1; dx <= 11; dx++) { const c = cellFn(dx, y); if (c) v.set(side > 0 ? WC - 1 + dx : WC - dx, y, 1, c); } };
  def(id, [24, 18, 3], S16, (v) => { v.box(WC - 1, 5, 0, WC, 7, 2, root || 'white'); v.set(WC - 1, 6, 2, 'gem1'); v.set(WC, 6, 2, 'gem1'); },
    { group: 'klær', react: 'wear', wear: { anchor: 'back', dy: -0.38 }, shop },
    { parts: { wingL: { pivot: [WC, 6, 1.5], build(v) { half(v, 1); } }, wingR: { pivot: [WC, 6, 1.5], build(v) { half(v, -1); } } } });
}

wingsDef('w_rosevinger', 'rosevinger', (dx, y) => {
  // petal pairs: 3 overlapping round petals
  const p = [[6.5, 12, 4.2], [4.2, 15, 2.6], [4.6, 4, 3.4]].map(([px, py, r]) => Math.hypot(dx - px, (y - py) * 1.05) / r);
  const m = Math.min(...p); if (m > 1) return null;
  return m > 0.72 ? 'rose' : (dx + y) % 5 === 0 ? 'pink' : 's2gRose';
});
wingsDef('w_sjøstjernevinger', 'sjøstjernevinger', (dx, y) => {
  const cx = 6, cy = 10, r = Math.hypot(dx - cx, y - cy), a = Math.atan2(y - cy, dx - cx) + 0.25;
  const R = 2.6 + 3.6 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2.2);
  if (r > R) return null;
  return r > R - 1 ? 'coral' : H(dx, y, 3) < 0.15 ? 'peach' : 's2gCoral';
}, 'coral');
wingsDef('w_stjernevinger', 'stjernevinger', (dx, y) => {
  const cx = 6, cy = 10, r = Math.hypot(dx - cx, y - cy), a = Math.atan2(y - cy, dx - cx) + 0.3;
  const R = 2.8 + 3.6 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3);
  const lo = Math.hypot(dx - 4, (y - 3) * 1.1) <= 2.6;
  if (r > R && !lo) return null;
  return (r > R - 1 && !lo) ? 'gold' : H(dx, y, 4) < 0.12 ? 'glowYellow' : 's2gGold';
}, 'gold');

/* ================================================================ WEAR – shoes (anchor 'feet'), cape, neck pieces */
const FEET = { group: 'klær', react: 'wear', wear: { anchor: 'feet', dy: 0 } };
function shoePair(id, shop, size, one, meta) { def(id, size, S16, (v) => { one(v, 1); one(v, size[0] - 5); }, Object.assign({ shop }, FEET, meta || {})); }
shoePair('w_regnstøvler', 'regnstøvler', [12, 9, 10], (v, x) => {
  v.box(x, 0, 1, x + 3, 0, 8, 'black'); v.box(x, 1, 1, x + 3, 7, 4, 'yellow'); v.box(x, 1, 5, x + 3, 2, 8, 'yellow'); v.box(x, 7, 1, x + 3, 8, 4, 'butter'); v.box(x + 1, 3, 2, x + 2, 8, 3, 0);
  v.set(x, 5, 4, 'red'); v.set(x + 3, 4, 4, 'red'); v.set(x + 1, 2, 8, 'red');
});
shoePair('w_månesko', 'månesko', [12, 5, 10], (v, x) => {
  v.box(x, 0, 1, x + 3, 0, 8, 'navySoft'); v.box(x, 1, 1, x + 3, 2, 8, 'silver'); v.box(x, 3, 1, x + 3, 3, 3, 'silver'); v.box(x + 1, 2, 3, x + 2, 2, 6, 0);
  v.set(x + 1, 2, 8, 'glowYellow'); v.set(x + 2, 3, 8, 'glowYellow'); v.set(x + 2, 1, 8, 'glowYellow'); v.set(x + 1, 3, 2, 'glowYellow');
});
shoePair('w_krystallsko', 'krystallsko', [12, 6, 10], (v, x) => {
  v.box(x, 0, 1, x + 3, 0, 8, 'silver'); v.box(x, 1, 1, x + 3, 2, 8, 'crystal'); v.box(x, 3, 1, x + 3, 4, 2, 'crystal'); v.box(x + 1, 2, 3, x + 2, 2, 6, 0);
  v.box(x + 1, 0, 0, x + 2, 1, 1, 'glass'); v.set(x + 1, 3, 8, 'gem2'); v.set(x + 2, 3, 8, 'white');
});
def('w_stjernekappe', [16, 18, 4], S16, (v) => {
  for (let y = 0; y <= 15; y++) { const w = 3 + Math.round((15 - y) * 0.3); for (let x = 8 - w; x <= 7 + w; x++) v.set(x, y, 1, 'navySoft'); }
  v.box(4, 16, 1, 11, 16, 2, 'gold'); v.set(7, 17, 2, 'gem1'); v.set(8, 17, 2, 'gem1');
  v.paint((x, y, z, c) => (c === P.navySoft && H(x, y, 3, 2) < 0.1 ? 'glowYellow' : null));
  star(v, 7.5, 8, 0, 0, 2.6, 'gold');
  for (let x = 0; x < 16; x++) if (v.get(x, 0, 1)) v.set(x, 0, 1, 'gold');
}, { group: 'klær', react: 'wear', wear: { anchor: 'back', dy: -0.62 }, shop: 'stjernekappe' });
const NECK = { group: 'klær', react: 'wear', wear: { anchor: 'neck', dy: -0.5 } };
function necklace(id, shop, chain, bead, pendant) {
  def(id, [14, 14, 6], S16, (v) => {
    for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI, x = Math.round(6.5 + Math.cos(t) * 6), y = Math.round(13 - Math.sin(t) * 7); v.set(x, y, 2, a % 3 === 0 && bead ? bead(a) : chain); }
    pendant(v);
  }, Object.assign({ shop }, NECK));
}
necklace('w_skjellkjede', 'skjellkjede', 'cream', a => ['peach', 'pink', 'white'][a % 3], v => {
  for (let y = 1; y <= 5; y++) for (let x = 4; x <= 9; x++) { const d = Math.hypot(x - 6.5, (y - 1) * 1.15); if (d <= 3.6) v.box(x, y, 2, x, y, 3, d > 2.8 ? 'peach' : ((x - 4) % 2 ? 'cream' : 'peach')); }
  v.set(6, 0, 3, 'peach'); v.set(7, 0, 3, 'peach');
});
necklace('w_krystallkjede', 'krystallkjede', 'silver', a => (a % 6 === 0 ? 'crystal' : 'silver'), v => {
  v.box(6, 2, 2, 7, 5, 3, 'crystal'); v.box(5, 3, 2, 8, 4, 3, 'crystal'); v.set(6, 1, 3, 'glass'); v.set(7, 6, 3, 'gem2'); v.set(6, 6, 3, 'gem2');
});
def('w_skjerf', [16, 12, 14], S16, (v) => {
  for (let y = 8; y <= 11; y++) ring(v, 7.5, y, 6.5, 4.2, 6, 'red');
  v.box(4, 0, 11, 6, 9, 12, 'red'); v.box(9, 2, 12, 11, 9, 13, 'red');
  v.paint((x, y, z, c) => (c === P.red && y % 3 === 0 ? 'white' : null));
  for (const x of [4, 6]) v.set(x, 0, 12, 'white'); for (const x of [9, 11]) v.set(x, 2, 13, 'white');
}, Object.assign({ shop: 'skjerf' }, { group: 'klær', react: 'wear', wear: { anchor: 'neck', dy: -0.62 } }));
def('w_votter', [16, 13, 5], S16, (v) => {
  const mit = (x0, flip) => {
    v.box(x0, 0, 1, x0 + 5, 2, 3, 'white');
    for (let y = 3; y <= 11; y++) { const w = y > 9 ? (y === 11 ? 1 : 2) : 3; for (let x = x0; x <= x0 + 5; x++) if (Math.abs(x - (x0 + 2.5)) <= w) v.box(x, y, 1, x, y, 3, 'red'); }
    const tx = flip ? x0 - 1 : x0 + 6; v.box(tx, 5, 1, tx, 8, 3, 'red');
    v.set(x0 + 2, 7, 4, 'white'); v.set(x0 + 3, 7, 4, 'white'); v.set(x0 + 2, 8, 4, 'white'); v.set(x0 + 3, 6, 4, 'white'); v.box(x0, 3, 4, x0 + 5, 3, 4, 'white');
  };
  mit(1, true); mit(9, false);
}, { group: 'klær', react: 'wear', wear: { anchor: 'hand', dy: -0.1 }, shop: 'votter' });
// one small mitten that fits the fairy's hand (fairy.js WEAR puts one on each arm part)
def('w_vott1', [3, 3, 3], S16, (v) => { v.box(0, 0, 0, 2, 0, 2, 'white'); v.box(0, 1, 0, 2, 2, 2, 'red'); v.set(1, 2, 2, 'white'); }, { group: 'klær', part: 'votter' });

/* ================================================================ TOYS (1/16) */
const TOY = (shop, react) => ({ group: 'leker', react: react || 'play', shop });
def('toy_hestebørste', [14, 7, 9], S16, (v) => {
  v.ellipsoid(6.5, 3.5, 4, 6.4, 2.2, 3.8, 'woodLight'); v.clear(0, 0, 0, 13, 2, 8);
  for (let x = 2; x <= 11; x++) for (let z = 1; z <= 7; z++) if (((x - 6.5) / 5.4) ** 2 + ((z - 4) / 3.2) ** 2 <= 1 && (x + z) % 2 === 0) v.box(x, 0, z, x, 2, z, 'woodDark');
  v.box(3, 5, 2, 10, 6, 2, 'woodRed'); v.box(3, 5, 6, 10, 6, 6, 'woodRed'); v.box(3, 6, 3, 3, 6, 5, 'woodRed'); v.box(10, 6, 3, 10, 6, 5, 'woodRed');
  v.set(6, 5, 7, 'gold'); v.set(7, 5, 7, 'gold');
}, TOY('hestebørste'));
def('toy_sal', [16, 13, 16], S16, (v) => {
  v.box(3, 4, 2, 12, 4, 13, 'sky'); v.paint((x, y, z, c) => (y === 4 && (x === 3 || x === 12 || z === 2 || z === 13) ? 'white' : null));
  for (let z = 3; z <= 12; z++) { const top = 6 + Math.round(((z - 7.5) / 4.5) ** 2 * 2.2); v.box(4, 5, z, 11, top, z, 'woodRed'); }
  v.box(6, 8, 12, 9, 10, 13, 'woodRed'); v.box(7, 11, 12, 8, 11, 13, 'brown');          // pommel
  v.box(4, 8, 2, 11, 10, 3, 'woodRed'); v.box(5, 11, 2, 10, 11, 2, 'brown');           // cantle
  for (const x of [2, 13]) v.box(x, 1, 4, x + (x < 8 ? 1 : 0), 6, 11, 'brown');        // side flaps
  v.box(3, 5, 4, 3, 6, 11, 'brown'); v.box(12, 5, 4, 12, 6, 11, 'brown');
  for (const x of [1, 14]) { v.line(x, 6, 7, x, 2, 7, 'brown'); v.box(x, 0, 6, x, 1, 9, 'silver'); }
  v.paint((x, y, z, c) => (c === P.woodRed && y >= 7 && (x === 4 || x === 11) ? 'gold' : null));
}, TOY('sal'));
def('toy_badeand', [12, 12, 14], S16, (v) => {
  v.ellipsoid(5.5, 3.5, 6, 5, 3.5, 5.6, 'yellow'); v.clear(0, 0, 0, 11, 0, 13);
  v.sphere(5.5, 8.5, 9, 3.2, 'yellow'); v.box(4, 7, 12, 7, 8, 13, 'orange'); v.box(5, 7, 13, 6, 7, 13, 'coral');
  v.set(3, 9, 11, 'black'); v.set(8, 9, 11, 'black'); v.set(3, 10, 11, 'white'); v.set(8, 10, 11, 'white');
  v.box(4, 6, 0, 7, 7, 1, 'yellow'); v.set(5, 8, 0, 'yellow'); v.set(6, 8, 0, 'yellow');
  v.set(1, 4, 6, 'butter'); v.set(10, 4, 6, 'butter'); v.set(1, 5, 5, 'butter'); v.set(10, 5, 5, 'butter');
}, TOY('badeand'));
def('toy_såpe', [14, 12, 10], S16, (v) => {
  v.box(1, 0, 2, 10, 3, 8, 'pink'); v.box(2, 4, 3, 9, 4, 7, 'blossom'); v.box(2, 0, 2, 9, 0, 8, 'rose');
  for (const [x, y, z, r] of [[4, 7, 5, 1.6], [8, 9, 4, 1.2], [11, 6, 6, 1.5], [6, 10.5, 6, 1]]) { v.sphere(x, y, z, r, 'glass'); v.set(Math.round(x - 0.5), Math.round(y + r * 0.6), Math.round(z), 'white'); }
}, TOY('såpe'));
def('toy_sandbøtte', [14, 16, 12], S16, (v) => {
  for (let y = 0; y <= 8; y++) ring(v, 6, y, 6, 3.6 + y * 0.18 - 1.1, 3.6 + y * 0.18, y === 8 ? 'butter' : 'sky');
  v.cyl(6, 0, 6, 3.6, 1, 'sky'); v.cyl(6, 1, 6, 3, 5, 'sand');
  for (let t = 0; t <= 12; t++) { const a = t / 12 * Math.PI; v.set(Math.round(6 - Math.cos(a) * 5), Math.round(9 + Math.sin(a) * 5), 6, 'butter'); }
  v.line(12, 0, 3, 12, 11, 7, 'red'); v.box(11, 0, 1, 13, 3, 3, 'red'); v.box(12, 11, 7, 13, 12, 8, 'red');
  v.set(5, 6, 10, 'coral'); v.set(6, 6, 10, 'coral'); v.set(5, 5, 10, 'coral');
}, TOY('sandbøtte'));
def('toy_badering', [18, 6, 18], S16, (v) => {
  for (let y = 0; y <= 4; y++) { const t = Math.abs(y - 2) / 2.6; ring(v, 8.5, y, 8.5, 4 + t * 1.6, 8.6 - t * 1.6, 'red'); }
  v.paint((x, y, z) => (Math.floor((Math.atan2(z - 8.5, x - 8.5) + Math.PI) / (Math.PI / 4)) % 2 ? 'white' : null));
}, TOY('badering'));
def('toy_bjeller', [16, 14, 8], S16, (v) => {
  v.line(1, 12, 4, 14, 12, 4, 'rose'); v.line(1, 13, 4, 14, 13, 4, 'rose'); v.box(6, 12, 4, 9, 13, 5, 'red');
  for (const [x, h] of [[3, 6], [8, 4], [13, 6]]) {
    v.line(x, h + 5, 4, x, 11, 4, 'gold');
    for (let y = h; y <= h + 4; y++) { const r = 1.2 + (h + 4 - y) * 0.45; v.cyl(x, y, 4, r, 1, 'gold'); }
    v.cyl(x, h - 1, 4, 2.9, 1, 'honey'); v.set(x, h - 2, 4, 'woodDark');
  }
}, TOY('bjeller', 'music'));
def('toy_sangbok', [16, 6, 14], S16, (v) => {
  v.box(0, 0, 0, 15, 1, 13, 'navySoft'); v.box(1, 2, 1, 7, 3, 12, 'cream'); v.box(8, 2, 1, 14, 3, 12, 'cream'); v.box(7, 1, 0, 8, 2, 13, 'gold');
  v.box(1, 4, 2, 6, 4, 11, 'white'); v.box(9, 4, 2, 14, 4, 11, 'white');
  for (const z of [4, 6, 8, 10]) { v.box(1, 4, z, 6, 4, z, 'grey'); v.box(9, 4, z, 14, 4, z, 'grey'); }
  for (const [x, z] of [[2, 5], [4, 7], [10, 9], [12, 6], [13, 8]]) { v.set(x, 5, z, 'black'); v.set(x + 1, 5, z, 'black'); }
}, TOY('sangbok', 'read'));
def('toy_blokkfløyte', [6, 22, 6], S16, (v) => {
  v.cyl(2.5, 0, 2.5, 1.9, 3, 'woodLight'); v.cyl(2.5, 3, 2.5, 1.4, 15, 'cream'); v.cyl(2.5, 18, 2.5, 1.7, 3, 'woodLight'); v.set(2, 21, 3, 'woodDark');
  for (const y of [5, 7, 9, 11, 13, 15]) v.set(2, y, 4, 'woodDark');
  v.set(2, 19, 4, 'black'); v.cyl(2.5, 17, 2.5, 1.5, 1, 'woodDark');
}, TOY('blokkfløyte', 'music'));
def('toy_trekkspill', [18, 14, 8], S16, (v) => {
  v.box(0, 1, 1, 3, 12, 6, 'red'); v.box(14, 1, 1, 17, 12, 6, 'red');
  for (let x = 4; x <= 13; x++) v.box(x, 2 + (x % 2), 1 + (x % 2), x, 11 - (x % 2), 6 - (x % 2), x % 2 ? 'white' : 'cream');
  for (let y = 2; y <= 11; y++) v.set(1, y, 7, y % 2 ? 'white' : 'black'); v.box(0, 2, 7, 0, 11, 7, 'white');
  for (const [y, z] of [[3, 7], [5, 7], [7, 7], [9, 7]]) { v.set(15, y, z, 'gold'); v.set(16, y + 1, z, 'gold'); }
  v.box(5, 12, 3, 12, 13, 4, 'brown'); v.box(0, 0, 1, 3, 0, 6, 'gold'); v.box(14, 0, 1, 17, 0, 6, 'gold');
}, TOY('trekkspill', 'music'));
def('toy_skøyter', [14, 10, 16], S16, (v) => {
  for (const x0 of [1, 8]) {
    v.box(x0 + 1, 0, 1, x0 + 1, 0, 14, 'silver'); v.box(x0 + 1, 1, 13, x0 + 1, 2, 14, 'silver'); v.set(x0 + 1, 1, 2, 'silver'); v.set(x0 + 1, 1, 9, 'silver');
    v.box(x0, 2, 2, x0 + 3, 4, 12, 'white'); v.box(x0, 5, 2, x0 + 3, 9, 6, 'white'); v.box(x0 + 1, 5, 3, x0 + 2, 9, 5, 0);
    for (const y of [5, 7]) v.box(x0, y, 7, x0 + 3, y, 7, 'pink'); v.box(x0, 9, 2, x0 + 3, 9, 6, 'pink');
  }
}, TOY('skøyter', 'ride'));
def('toy_akebrett', [14, 6, 20], S16, (v) => {
  for (let z = 1; z <= 18; z++) for (let x = 1; x <= 12; x++) if (inC(x, z, 6.5, z < 5 ? 5 : z > 15 ? 14 : z, 5.6)) v.set(x, 0, z, 'red');
  v.box(1, 1, 1, 1, 2, 18, 'red'); v.box(12, 1, 1, 12, 2, 18, 'red'); v.box(1, 1, 18, 12, 3, 19, 'red');
  v.box(4, 3, 18, 9, 5, 18, 'red'); v.box(5, 4, 18, 8, 4, 18, 0); v.box(3, 1, 7, 10, 1, 12, 'coral');
}, TOY('akebrett', 'ride'));
def('toy_krystallstav', [7, 24, 7], S16, (v) => {
  v.cyl(3, 0, 3, 1, 15, 'silver'); v.cyl(3, 2, 3, 1.4, 2, 'lavender'); v.cyl(3, 14, 3, 1.8, 1, 'gold');
  for (let y = 15; y <= 22; y++) { const r = y < 18 ? (y - 14) * 0.9 : (23 - y) * 0.6; v.cyl(3, y, 3, Math.max(0.4, r), 1, y % 3 ? 'crystal' : 'glass'); }
  v.set(3, 23, 3, 'white');
}, TOY('krystallstav'));
def('toy_glimtstein', [12, 10, 12], S16, (v) => {
  v.cyl(5.5, 0, 5.5, 5.4, 2, 'lavender'); v.cyl(5.5, 2, 5.5, 4.5, 1, 'plum');
  for (let y = 3; y <= 9; y++) { const r = y < 6 ? (y - 2) * 1.1 : (10 - y) * 0.95; v.cyl(5.5, y, 5.5, Math.max(0.5, r), 1, y % 2 ? 'crystal' : 'gem2'); }
  v.set(4, 7, 8, 'glowYellow'); v.set(7, 5, 8, 'glowYellow'); v.set(3, 5, 7, 'white'); v.set(6, 9, 6, 'glowYellow');
}, TOY('glimtstein'));

/* ================================================================ FOOD (1/16) */
const FOOD = shop => ({ group: 'mat', react: 'eat', shop });
def('food_gulrøtter', [16, 7, 16], S16, (v) => {
  for (const [x, z, a] of [[4, 4, 0.3], [8, 8, 0], [12, 5, -0.4]]) {
    for (let t = 0; t <= 9; t++) { const r = 1.6 - t * 0.14, px = x + Math.sin(a) * t, pz = z + Math.cos(a) * t; for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 2; dy++) if (Math.hypot(dx, dy - 1) <= r) v.set(Math.round(px + dx), dy, Math.round(pz), 'orange'); }
    v.box(x - 1, 1, z - 3, x + 1, 3, z - 1, 'leaf'); v.set(x, 4, z - 3, 'leaf2'); v.set(x - 1, 3, z - 4, 'leaf2');
  }
}, FOOD('gulrøtter'));
def('food_fiskemat', [12, 14, 10], S16, (v) => {
  v.cyl(5.5, 0, 4.5, 4.4, 11, 'teal'); v.cyl(5.5, 11, 4.5, 4.6, 2, 'white'); v.cyl(5.5, 13, 4.5, 2.2, 1, 'sky');
  v.box(2, 3, 9, 9, 8, 9, 'white');
  v.box(3, 5, 9, 6, 6, 9, 'orange'); v.set(7, 6, 9, 'orange'); v.set(7, 4, 9, 'orange'); v.set(7, 5, 9, 'orange'); v.set(4, 6, 9, 'black');
  v.paint((x, y, z, c) => (c === P.teal && y < 2 ? 'navySoft' : null));
}, FOOD('fiskemat'));
def('food_smultring', [14, 5, 14], S16, (v) => {
  for (let y = 0; y <= 3; y++) { const t = Math.abs(y - 1.5) / 2; ring(v, 6.5, y, 6.5, 2.2 + t, 6.4 - t, y >= 2 ? 'pink' : 'honey'); }
  v.paint((x, y, z, c) => (y === 3 && H(x, z, 4) < 0.22 ? ['white', 'sky', 'yellow', 'mint'][(x * 3 + z) % 4] : null));
}, FOOD('smultring'));
def('food_karamell', [18, 7, 8], S16, (v) => {
  v.ellipsoid(8.5, 3, 3.5, 4.5, 3, 3.2, 'gold');
  for (const s of [-1, 1]) for (let k = 1; k <= 4; k++) { const x = Math.round(8.5 + s * (4 + k)); const w = k * 0.7; for (let y = 0; y <= 6; y++) for (let z = 0; z <= 7; z++) if (Math.abs(y - 3) <= w && Math.abs(z - 3.5) <= w) v.set(x, y, z, 'honey'); }
  v.paint((x, y, z, c) => (c === P.gold && (x + y) % 3 === 0 ? 'brown' : null));
}, FOOD('karamell'));
def('food_nøttepose', [12, 14, 10], S16, (v) => {
  for (let y = 0; y <= 9; y++) { const r = y < 7 ? 4.6 : 3.6 - (y - 7) * 0.6; ring(v, 5.5, y, 4.5, Math.max(0, r - 1), r, 'hay'); }
  v.cyl(5.5, 0, 4.5, 4.6, 1, 'hay'); v.cyl(5.5, 1, 4.5, 3.6, 8, 'brown');
  ring(v, 5.5, 8, 4.5, 2.6, 3.8, 'red');
  for (const [x, y, z] of [[4, 10, 4], [6, 11, 5], [7, 10, 3], [5, 12, 4]]) { v.set(x, y, z, 'brown'); v.set(x + 1, y, z, 'woodLight'); }
  v.set(5, 5, 9, 'woodDark'); v.set(6, 5, 9, 'woodDark'); v.set(5, 4, 9, 'woodLight');
}, FOOD('nøttepose'));
def('food_sukkerspinn', [12, 22, 12], S16, (v) => {
  v.line(5, 0, 5, 5, 9, 5, 'white'); v.line(6, 0, 5, 6, 9, 5, 'cream');
  v.ellipsoid(5.5, 15, 5.5, 5.2, 6, 5.2, 'pink');
  v.paint((x, y, z, c) => (c === P.pink && H(x, y, z, 6) < 0.3 ? 'blossom' : c === P.pink && H(x, y, z, 7) < 0.12 ? 'white' : null));
}, FOOD('sukkerspinn'));
def('food_kakao', [12, 13, 10], S16, (v) => {
  v.cyl(5, 0, 5, 4, 8, 'sky'); v.cyl(5, 1, 5, 3, 7, 0); v.cyl(5, 6, 5, 3, 1, 'brown');
  v.ellipsoid(5, 8.5, 5, 3.4, 2, 3.4, 'white'); v.set(5, 10, 5, 'white'); v.set(4, 9, 6, 'cream');
  for (const [x, z] of [[3, 4], [6, 6], [6, 3]]) v.set(x, 10, z, 'pink');
  v.box(9, 2, 4, 10, 6, 5, 'sky'); v.box(10, 3, 4, 10, 5, 5, 0);
  v.paint((x, y, z, c) => (c === P.sky && y === 4 && (x + z) % 2 === 0 ? 'white' : null));
}, FOOD('kakao'));

/* ================================================================ PET + GEAR */
def('pet_gullfisk', [14, 14, 14], S16, (v) => {
  v.sphere(6.5, 7, 6.5, 6.4, 'glass'); v.sphere(6.5, 7, 6.5, 5.4, 0); v.clear(0, 12, 0, 13, 13, 13); v.clear(2, 3, 10, 11, 10, 13); ring(v, 6.5, 11, 6.5, 3.4, 4.8, 'ice');
  for (let x = 1; x <= 12; x++) for (let z = 1; z <= 12; z++) if (inC(x, z, 6.5, 6.5, 5.6) && !inC(x, z, 6.5, 6.5, 4.6)) v.set(x, 2, z, 'sky');
  v.cyl(6.5, 1, 6.5, 4.6, 1, 'sand'); v.box(3, 2, 5, 3, 5, 5, 'leaf'); v.set(4, 6, 5, 'leaf'); v.box(10, 2, 8, 10, 3, 8, 'pink'); v.set(9, 2, 4, 'white');
  // a big orange fish swimming to the right, facing the viewer a little
  v.ellipsoid(6, 7, 7, 3, 2, 1.6, 'orange'); v.box(9, 6, 7, 9, 8, 7, 'coral'); v.set(10, 5, 7, 'coral'); v.set(10, 9, 7, 'coral'); v.set(10, 7, 7, 'coral');
  v.set(4, 8, 8, 'black'); v.set(4, 8, 6, 'black'); v.set(6, 9, 7, 'coral'); v.set(7, 9, 7, 'coral'); v.set(3, 7, 7, 'peach');
  v.set(3, 10, 8, 'white'); v.set(2, 11, 7, 'white');
}, { group: 'dyr', react: 'pet', shop: 'gullfisk' });
def('gear_kikkert', [18, 14, 12], S16, (v) => {
  // binoculars standing on their eyepieces, big lenses facing the viewer (+z)
  for (const x of [4.5, 12.5]) {
    for (let z = 1; z <= 9; z++) discZ(v, x, 7, z, z, z > 6 ? 3.6 : 3, z > 6 ? 'navySoft' : 'black');
    discZ(v, x, 7, 10, 10, 3.6, 'gold'); discZ(v, x, 7, 11, 11, 2.6, 'sky'); v.set(Math.round(x) - 1, 8, 11, 'white'); v.set(Math.round(x) - 2, 9, 11, 'white');
    discZ(v, x, 7, 0, 0, 2.2, 'gold');
  }
  v.box(7, 5, 3, 10, 9, 8, 'navySoft'); v.box(8, 10, 4, 9, 11, 6, 'gold'); v.set(8, 12, 5, 'gold');
  v.line(1, 6, 2, 0, 1, 2, 'red'); v.line(16, 6, 2, 17, 1, 2, 'red'); v.box(0, 0, 2, 17, 0, 2, 'red');
}, { group: 'leker', react: 'play', shop: 'kikkert' });

/* ================================================================ SLOT furniture for Fetårnet (1/10, back against the wall at −z) */
const SLOT = (slot, shop, extra) => Object.assign({ group: 'slot', slot, shop }, extra || {});
def('f_hestesko', [12, 14, 3], S10, (v) => {
  for (let a = 0; a <= 30; a++) { const t = -0.35 + a / 30 * (Math.PI + 0.7), x = Math.round(5.5 + Math.cos(t) * 4.6), y = Math.round(7 + Math.sin(t) * 5.2); v.box(x, y, 1, x, y, 2, 'gold'); v.set(x + (x < 5.5 ? 1 : -1), y, 1, 'gold'); }
  for (const [x, y] of [[2, 4], [9, 4], [1, 8], [10, 8], [3, 11], [8, 11]]) v.set(x, y, 2, 'honey');
  v.box(4, 12, 1, 7, 13, 2, 'rose'); v.set(3, 11, 2, 'pink'); v.set(8, 11, 2, 'pink');
  flower(v, 2, 1, 2, 'pink'); flower(v, 9, 1, 2, 'lilac');
}, SLOT('vegg', 'hestesko'));
def('f_stallykt', [10, 20, 10], S10, (v) => {
  v.cyl(4.5, 0, 4.5, 3, 1, 'woodDark'); v.box(4, 1, 4, 5, 10, 5, 'woodDark');
  v.box(1, 11, 1, 8, 11, 8, 'black'); v.box(2, 18, 2, 7, 18, 7, 'black'); v.cone(4.5, 19, 4.5, 2.4, 1, 'black');
  for (const [x, z] of [[1, 1], [8, 1], [1, 8], [8, 8]]) v.box(x, 12, z, x, 17, z, 'black');
  v.box(2, 12, 2, 7, 17, 7, 'glass'); v.box(3, 13, 3, 6, 16, 6, 'lamp'); v.box(4, 14, 4, 5, 15, 5, 'flame');
}, SLOT('lampe', 'stallykt', { glow: true }));
def('f_bobleseng', [22, 16, 26], S10, (v) => {
  v.box(1, 0, 2, 20, 4, 24, 'white'); v.box(2, 5, 3, 19, 6, 23, 'sky'); v.box(2, 7, 3, 19, 7, 15, 'sky');
  v.paint((x, y, z, c) => (c === P.sky && (x + z) % 4 === 0 ? 'white' : null));
  v.box(4, 7, 18, 9, 8, 22, 'white'); v.box(12, 7, 18, 17, 8, 22, 'white');
  for (const [x, y, r] of [[5, 10, 3], [11, 12, 3.8], [17, 10, 3], [8, 14, 2], [14, 15, 2.2]]) { v.sphere(x, y, 1.5, r, 'glass'); v.set(Math.round(x - 1), Math.round(y + r - 1), 2, 'white'); }
  v.box(0, 0, 0, 21, 5, 1, 'sky'); for (const [x, z] of [[1, 24], [20, 24]]) v.box(x, 0, z, x, 5, z + 1, 'sky');
}, SLOT('seng', 'bobleseng'));
def('f_pepperkakehus', [14, 15, 12], S10, (v) => {
  v.box(1, 0, 1, 12, 7, 10, 'brown');
  for (let y = 8; y <= 13; y++) { const w = 6.5 - (y - 8) * 1.1; v.box(Math.round(6.5 - w), y, 0, Math.round(6.5 + w - 1), y, 11, y === 8 ? 'white' : 'woodRed'); }
  v.paint((x, y, z, c) => (c === P.woodRed && (x + y) % 3 === 0 ? 'white' : null));
  v.box(5, 0, 11, 7, 4, 11, 'woodDark'); v.set(5, 5, 11, 'white'); v.set(7, 5, 11, 'white'); v.set(6, 5, 11, 'white');
  for (const x of [2, 10]) { v.box(x, 3, 11, x + 1, 5, 11, 'butter'); v.set(x, 6, 11, 'white'); v.set(x + 1, 6, 11, 'white'); }
  v.box(1, 7, 0, 12, 7, 11, 'white');
  for (const [x, y, c] of [[1, 2, 'red'], [12, 4, 'mint'], [3, 1, 'sky'], [11, 1, 'yellow'], [9, 6, 'pink']]) v.set(x, y, 11, c);
  v.box(9, 12, 3, 10, 14, 4, 'brown');
}, SLOT('pynt1', 'pepperkakehus'));
def('f_spilledåse', [12, 14, 10], S10, (v) => {
  v.box(0, 0, 0, 11, 5, 9, 'rose'); v.box(0, 5, 0, 11, 5, 9, 'pink'); v.box(1, 1, 9, 10, 1, 9, 'gold'); v.box(1, 4, 9, 10, 4, 9, 'gold');
  v.set(5, 2, 9, 'gold'); v.set(6, 3, 9, 'gold'); v.set(6, 2, 9, 'gold'); v.box(11, 2, 4, 11, 3, 5, 'gold'); v.set(11, 3, 6, 'gold');
  v.cyl(5.5, 6, 4.5, 2, 1, 'gold');
}, SLOT('pynt1', 'spilledåse'), { parts: { dancer: { pivot: [6, 7, 5], build(v) {
  v.box(5, 7, 4, 6, 7, 5, 'skin'); v.box(4, 8, 3, 7, 9, 6, 'blossom'); v.box(5, 10, 4, 6, 11, 5, 'pink'); v.box(5, 12, 4, 6, 13, 5, 'skin'); v.box(5, 13, 3, 6, 13, 3, 'hairBrown');
  v.set(4, 11, 4, 'skin'); v.set(7, 11, 5, 'skin'); v.set(3, 12, 4, 'skin'); v.set(8, 12, 5, 'skin');
} } } });
def('f_nattlampe', [12, 12, 8], S10, (v) => {
  v.box(2, 0, 2, 9, 1, 6, 'lilac');
  for (const [x, y, r] of [[3.5, 5, 2.6], [6, 6.5, 3.2], [8.5, 5, 2.4]]) v.ellipsoid(x, y, 4, r, r * 0.9, 2.2, 'lamp');
  v.box(2, 3, 2, 9, 4, 6, 'lamp');
  v.set(4, 6, 6, 'black'); v.set(7, 6, 6, 'black'); v.set(5, 5, 7, 'rose'); v.set(6, 5, 7, 'rose');
  tiny(v, 1, 9, 4, 'glowYellow'); tiny(v, 10, 10, 4, 'glowYellow');
}, SLOT('lampe', 'nattlampe', { glow: true }));
def('f_månelampe', [12, 20, 8], S10, (v) => {
  v.cyl(5.5, 0, 4, 3.4, 1, 'navySoft'); v.box(5, 1, 3, 6, 5, 4, 'gold');
  for (let y = 5; y <= 19; y++) for (let x = 0; x < 12; x++) { const a = Math.hypot(x - 5.5, y - 12), b = Math.hypot(x - 8.5, y - 13.5); if (a <= 7 && b > 5.4) v.box(x, y, 3, x, y, 4, a > 6.1 ? 'gold' : 'glowYellow'); }
  v.set(2, 13, 5, 'black'); v.set(3, 11, 5, 'rose');
  tiny(v, 10, 6, 4, 'glowYellow');
}, SLOT('lampe', 'månelampe', { glow: true }));
def('f_stjernekart', [22, 16, 2], S10, (v) => {
  v.box(0, 0, 0, 21, 15, 0, 'woodLight'); v.box(1, 1, 0, 20, 14, 1, 'navySoft');
  const pts = [[3, 11], [6, 12], [9, 10], [12, 12], [15, 9], [17, 11], [4, 5], [7, 3], [10, 5], [13, 4], [16, 6], [19, 3]];
  for (let i = 0; i < pts.length - 1; i++) if (i !== 5) v.line(pts[i][0], pts[i][1], 1, pts[i + 1][0], pts[i + 1][1], 1, 'lavender');
  for (const [x, y] of pts) v.set(x, y, 1, 'glowYellow');
  for (const [x, y] of [[2, 2], [19, 13], [11, 7], [5, 8], [18, 7]]) v.set(x, y, 1, 'white');
  v.box(9, 14, 1, 12, 15, 1, 'gold');
}, SLOT('vegg', 'stjernekart'));
def('f_teleskop', [14, 22, 16], S10, (v) => {
  for (const [x, z] of [[2, 3], [11, 3], [6, 13]]) v.line(x, 0, z, 7, 10, 8, 'woodDark');
  v.box(6, 10, 7, 8, 11, 9, 'gold');
}, SLOT('pynt1', 'teleskop'), { parts: { tube: { pivot: [7, 12, 8], build(v) {
  for (let t = 0; t <= 13; t++) { const z = 2 + t * 0.85, y = 9 + t * 0.85, r = 1.4 + t * 0.12; for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.hypot(dx, dy) <= r) v.set(7 + dx, Math.round(y + dy), Math.round(z), t > 11 ? 'gold' : t < 2 ? 'woodDark' : 'honey'); }
  v.set(7, 21, 14, 'sky');
} } } });
def('f_krystallampe', [12, 18, 12], S10, (v) => {
  v.cyl(5.5, 0, 5.5, 4.4, 2, 'silver'); v.cyl(5.5, 2, 5.5, 3.4, 1, 'lavender');
  const spike = (x, z, h, lx, lz, c) => { for (let y = 0; y < h; y++) { const t = y / h, r = 1.5 * (1 - t * 0.75); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) <= r) v.set(Math.round(x + lx * y + dx), 3 + y, Math.round(z + lz * y + dz), c); } v.set(Math.round(x + lx * h), 3 + h, Math.round(z + lz * h), 'white'); };
  spike(5.5, 5.5, 13, 0, 0, 'crystal'); spike(4, 6, 9, -0.25, 0.05, 'gem2'); spike(7, 5, 10, 0.25, -0.05, 'crystal'); spike(5.5, 7.5, 7, 0, 0.3, 'lavender'); spike(6, 4, 8, 0.05, -0.3, 'gem2');
  v.box(5, 6, 5, 6, 10, 6, 'lamp'); v.set(5, 11, 6, 'glowYellow');
}, SLOT('lampe', 'krystallampe', { glow: true }));
def('f_krystallslott', [18, 20, 14], S10, (v) => {
  v.box(0, 0, 0, 17, 1, 13, 'lavender'); v.box(3, 2, 3, 14, 9, 10, 'crystal'); v.box(7, 2, 10, 10, 6, 10, 'plum');
  for (const [x, z, h] of [[2, 2, 12], [15, 2, 12], [2, 11, 10], [15, 11, 10], [8.5, 6.5, 16]]) { v.cyl(x, 2, z, 1.8, h, 'ice'); v.cone(x, 2 + h, z, 2.3, 4, 'glass'); v.set(Math.round(x), 6 + h, Math.round(z), 'glowYellow'); }
  v.paint((x, y, z, c) => (c === P.crystal && (x + y) % 4 === 0 ? 'white' : null));
  for (const x of [5, 12]) v.box(x, 6, 10, x, 7, 10, 'lamp');
}, SLOT('pynt1', 'krystallslott'));

/* ================================================================ PLOT items (1/10, 3 × 3 m build plots) */
const PLOT = (shop, extra) => Object.assign({ group: 'plot', shop }, extra || {});
def('g_frøpose', [24, 12, 18], S10, (v) => {
  v.box(1, 0, 1, 22, 1, 16, 'soil'); v.box(0, 0, 0, 23, 1, 0, 'woodLight'); v.box(0, 0, 17, 23, 1, 17, 'woodLight'); v.box(0, 0, 0, 0, 1, 17, 'woodLight'); v.box(23, 0, 0, 23, 1, 17, 'woodLight');
  const cols = ['red', 'pink', 'butter', 'lilac', 'rose', 'white'];
  for (let i = 0; i < 18; i++) { const x = 3 + (i % 6) * 3.4, z = 3 + Math.floor(i / 6) * 4.5, h = 3 + Math.floor(H(i, 2, 3) * 4); v.line(Math.round(x), 2, Math.round(z), Math.round(x), 1 + h, Math.round(z), 'leaf'); v.set(Math.round(x) + 1, 3, Math.round(z), 'leaf2'); v.box(Math.round(x), 2 + h, Math.round(z), Math.round(x), 3 + h, Math.round(z), cols[i % 6]); v.set(Math.round(x) - 1, 3 + h, Math.round(z), cols[i % 6]); v.set(Math.round(x) + 1, 3 + h, Math.round(z), cols[i % 6]); }
  v.box(20, 2, 14, 21, 10, 14, 'woodLight'); v.box(17, 6, 15, 23, 11, 15, 'hay'); v.box(18, 8, 16, 22, 10, 16, 'white'); flower(v, 20, 9, 17, 'rose');
}, PLOT('frøpose'));
def('g_humlehus', [14, 26, 12], S10, (v) => {
  v.box(6, 0, 5, 7, 12, 6, 'woodDark'); v.box(1, 12, 2, 12, 22, 9, 'woodRed');
  for (let y = 23; y <= 25; y++) v.box(1 + (y - 23) * 2, y, 1, 12 - (y - 23) * 2, y, 10, 'roofRed');
  v.box(2, 13, 9, 11, 21, 9, 'hay');
  for (let y = 14; y <= 20; y += 2) for (let x = 3; x <= 10; x += 2) v.set(x + (y % 4 ? 1 : 0), y, 9, 'woodDark');
  for (const [x, y, z] of [[0, 18, 11], [13, 15, 10], [10, 24, 9]]) { v.set(x, y, z, 'yellow'); v.set(x, y, z - 1, 'black'); v.set(x, y + 1, z, 'white'); }
  flower(v, 3, 1, 9, 'pink'); flower(v, 10, 1, 9, 'lilac'); v.line(3, 0, 9, 3, 1, 9, 'leaf');
}, PLOT('humlehus'));
def('g_blomsterbue', [28, 28, 8], S10, (v) => {
  for (const x of [2, 25]) v.box(x, 0, 3, x + 1, 16, 4, 'white');
  for (let a = 0; a <= 40; a++) { const t = a / 40 * Math.PI, x = Math.round(13.5 - Math.cos(t) * 11.5), y = Math.round(16 + Math.sin(t) * 10); v.box(x, y, 2, x + 1, y + 1, 5, 'white'); }
  v.paint((x, y, z, c) => (c === P.white && H(x, y, z, 2) < 0.55 ? (H(x, y, z, 3) < 0.4 ? 'leaf' : ['rose', 'pink', 'red', 'blossom'][(x + y + z) % 4]) : null));
  for (const x of [0, 26]) { v.box(x, 0, 1, x + 1, 2, 6, 'leaf'); flower(v, x, 3, 4, 'rose'); }
}, PLOT('blomsterbue'));
def('g_boblemaskin', [16, 24, 14], S10, (v) => {
  v.box(2, 0, 3, 13, 9, 11, 'sky'); v.box(3, 10, 4, 12, 10, 10, 'white'); v.box(5, 2, 11, 10, 7, 11, 'white');
  v.set(6, 4, 12, 'red'); v.set(9, 4, 12, 'yellow'); v.box(7, 11, 6, 8, 13, 8, 'silver'); discZ(v, 7.5, 14.5, 7, 7, 2.2, 'rose');
  for (const [x, y, z, r] of [[4, 17, 7, 2], [10, 19, 6, 2.6], [6, 22, 8, 1.4], [13, 15, 9, 1.4]]) { v.sphere(x, y, z, r, 'glass'); v.set(Math.round(x - 0.5), Math.round(y + r * 0.6), z, 'white'); }
  for (const [x, z] of [[2, 3], [13, 3], [2, 11], [13, 11]]) v.set(x, 0, z, 'navySoft');
}, PLOT('boblemaskin'));
def('g_parasoll', [26, 24, 26], S10, (v) => {
  v.line(12, 0, 13, 13, 20, 13, 'white');
  for (let y = 16; y <= 21; y++) { const r = 11.5 * (1 - (y - 16) / 6.5); v.cyl(12.5, y, 12.5, r, 1, 'teal'); if (y < 21) v.cyl(12.5, y, 12.5, Math.max(0, r - 1.4), 1, 0); }
  v.paint((x, y, z) => (y >= 16 && Math.floor((Math.atan2(z - 12.5, x - 12.5) + Math.PI) / (Math.PI / 5)) % 2 ? 'white' : null));
  v.set(12, 22, 12, 'red'); v.set(13, 22, 13, 'red');
  v.box(2, 0, 17, 11, 0, 24, 'coral'); v.paint((x, y, z, c) => (y === 0 && c === P.coral && z % 2 ? 'butter' : null));
  v.cyl(19, 0, 20, 2, 3, 'red'); v.cyl(19, 1, 20, 1.2, 2, 'sand'); v.set(4, 1, 6, 'peach'); v.set(5, 1, 6, 'cream'); v.set(21, 1, 6, 'pink');
}, PLOT('parasoll'));
def('g_sjokoladefontene', [20, 22, 20], S10, (v) => {
  v.cyl(9.5, 0, 9.5, 9, 2, 'silver'); v.cyl(9.5, 1, 9.5, 8, 1, 'brown');
  v.cyl(9.5, 2, 9.5, 1.5, 16, 'silver');
  for (const [y, r] of [[8, 6], [13, 4], [17, 2.4]]) { v.cyl(9.5, y, 9.5, r, 1, 'silver'); v.cyl(9.5, y + 1, 9.5, r - 0.6, 1, 'brown'); for (let a = 0; a < 10; a++) { const t = a / 10 * Math.PI * 2, x = Math.round(9.5 + Math.cos(t) * (r + 0.4)), z = Math.round(9.5 + Math.sin(t) * (r + 0.4)); v.line(x, y, z, x, y - 2 - (a % 3), z, 'brown'); } }
  v.cyl(9.5, 19, 9.5, 1.4, 2, 'brown');
  for (let a = 0; a < 9; a++) { const t = a / 9 * Math.PI * 2, x = Math.round(9.5 + Math.cos(t) * 8.3), z = Math.round(9.5 + Math.sin(t) * 8.3); v.set(x, 2, z, 'red'); v.set(x, 3, z, 'leaf2'); }
}, PLOT('sjokoladefontene'));
def('g_konsertscene', [30, 24, 22], S10, (v) => {
  v.box(0, 0, 0, 29, 3, 17, 'woodLight'); v.box(0, 3, 0, 29, 3, 17, 'wood'); for (let x = 0; x < 30; x += 3) v.box(x, 0, 17, x, 3, 17, 'woodDark');
  v.box(1, 3, 18, 3, 3, 21, 'woodLight'); v.box(1, 1, 18, 3, 2, 21, 'woodLight');
  for (const x of [0, 28]) v.box(x, 4, 0, x + 1, 20, 2, 'navySoft');
  v.box(0, 20, 0, 29, 22, 2, 'navySoft'); for (let x = 1; x < 29; x += 2) v.set(x, 21, 3, 'glowYellow');
  for (const s of [0, 1]) for (let x = 2; x <= 7; x++) v.box(s ? 29 - x : x, 4, 1, s ? 29 - x : x, 19 - (x - 2) * 2, 2, x % 2 ? 'red' : 'cherry');
  v.box(2, 4, 0, 27, 19, 0, 'plum');
  v.box(13, 4, 9, 13, 10, 9, 'silver'); v.sphere(13, 11, 9, 1, 'black');
  v.box(19, 4, 6, 22, 6, 9, 'red'); v.box(19, 7, 6, 22, 7, 9, 'white');
  for (const [x, y] of [[6, 14], [9, 16], [21, 15], [24, 13]]) { v.box(x, y, 1, x + 1, y + 1, 1, 'gold'); v.line(x + 1, y + 1, 1, x + 1, y + 4, 1, 'gold'); }
}, PLOT('konsertscene'));
def('g_snømann', [16, 26, 14], S10, (v) => {
  v.sphere(7.5, 5, 7, 5, 'snow'); v.sphere(7.5, 12.5, 7, 3.8, 'snow'); v.sphere(7.5, 18.5, 7, 3, 'snow');
  v.box(7, 18, 10, 8, 18, 12, 'orange'); v.set(6, 19, 10, 'black'); v.set(9, 19, 10, 'black');
  for (const y of [10, 12, 14]) v.set(7, y, 11, 'black');
  ring(v, 7.5, 15, 7, 0, 3.2, 'red'); v.box(9, 11, 10, 10, 15, 10, 'red');
  v.cyl(7.5, 21, 7, 3, 2, 'blue'); v.cyl(7.5, 23, 7, 2, 2, 'blue'); v.set(7, 25, 7, 'white');
  v.line(2, 13, 7, 0, 16, 7, 'woodDark'); v.line(13, 13, 7, 15, 16, 7, 'woodDark');
  v.line(14, 0, 4, 14, 14, 4, 'woodLight'); v.box(13, 0, 3, 15, 2, 5, 'hay');
}, PLOT('snømannsett'));

/* ================================================================ RIDES (plot rides, 1/10) */
const RIDE = shop => ({ group: 'ride', shop });
def('ride_blomstervogn', [18, 20, 28], S10, (v) => {
  v.box(2, 5, 4, 15, 6, 23, 'woodLight'); v.box(2, 7, 4, 2, 10, 23, 'woodLight'); v.box(15, 7, 4, 15, 10, 23, 'woodLight'); v.box(2, 7, 4, 15, 10, 4, 'woodLight'); v.box(2, 7, 23, 15, 10, 23, 'woodLight');
  v.paint((x, y, z, c) => (c === P.woodLight && y === 9 ? 'pink' : null));
  for (let x = 3; x <= 14; x++) for (let z = 5; z <= 22; z++) { const h = 11 + Math.round(H(x, z, 2) * 3); v.box(x, 7, z, x, h - 1, z, 'leaf'); v.set(x, h, z, H(x, z, 5) < 0.6 ? ['rose', 'pink', 'butter', 'white', 'lilac', 'red'][(x * 3 + z) % 6] : 'leaf2'); }
  for (const x of [1, 16]) { wheelX(v, x, 4, 8, 3.8, 'woodDark', 'gold'); wheelX(v, x, 4, 20, 3.8, 'woodDark', 'gold'); }
  v.line(6, 6, 24, 6, 5, 27, 'woodDark'); v.line(11, 6, 24, 11, 5, 27, 'woodDark'); v.box(6, 5, 27, 11, 5, 27, 'woodDark');
}, RIDE('blomstervogn'));
def('ride_gullsal', [12, 22, 26], S10, (v) => {
  // a white wooden rocking pony wearing the golden saddle
  for (let z = 3; z <= 22; z++) { const y = Math.round(1 + ((z - 12.5) / 9.5) ** 2 * 3); v.box(1, y, z, 1, y, z, 'gold'); v.box(10, y, z, 10, y, z, 'gold'); }
  for (const [z] of [[7], [18]]) { v.box(2, 2, z, 3, 9, z + 1, 'white'); v.box(8, 2, z, 9, 9, z + 1, 'white'); }
  v.box(2, 9, 5, 9, 14, 20, 'white'); v.box(3, 15, 18, 8, 19, 21, 'white'); v.box(3, 18, 21, 8, 21, 25, 'white');
  v.set(3, 20, 24, 'black'); v.set(8, 20, 24, 'black'); v.box(4, 18, 25, 7, 18, 25, 'pink');
  v.box(5, 15, 15, 6, 22, 21, 'lilac'); v.box(5, 22, 20, 6, 23, 22, 'lilac'); v.box(5, 9, 2, 6, 14, 4, 'lilac'); v.set(5, 8, 2, 'lilac');
  v.box(2, 14, 9, 9, 16, 15, 'gold'); v.box(2, 16, 9, 9, 17, 10, 'gold'); v.box(3, 17, 14, 8, 17, 15, 'honey'); v.set(5, 15, 16, 'gem1'); v.set(6, 15, 16, 'gem1');
  v.box(1, 10, 11, 1, 14, 12, 'gold'); v.box(10, 10, 11, 10, 14, 12, 'gold');
}, RIDE('gullsal'));
def('ride_bobleballong', [26, 40, 26], S10, (v) => {
  v.sphere(12.5, 25, 12.5, 12.4, 'glass');
  for (let a = 0; a < 7; a++) { const t = a / 7 * Math.PI * 2; v.set(Math.round(12.5 + Math.cos(t) * 12), 26 + (a % 3), Math.round(12.5 + Math.sin(t) * 12), 'white'); }
  v.box(7, 32, 20, 8, 35, 21, 'white'); v.box(6, 34, 19, 7, 34, 20, 'white');
  v.box(8, 0, 8, 17, 5, 17, 'hay'); v.box(9, 1, 9, 16, 5, 16, 0); v.box(8, 5, 8, 17, 5, 17, 'woodRed');
  v.paint((x, y, z, c) => (c === P.hay && (x + y) % 2 === 0 ? 'woodLight' : null));
  for (const [x, z] of [[8, 8], [17, 8], [8, 17], [17, 17]]) v.line(x, 6, z, Math.round(12.5 + (x - 12.5) * 0.6), 13, Math.round(12.5 + (z - 12.5) * 0.6), 'woodDark');
  v.cyl(12.5, 12, 12.5, 3, 1, 'sky');
}, RIDE('bobleballong'));
def('ride_glassbunnsbåt', [18, 16, 32], S10, (v) => {
  for (let z = 1; z <= 30; z++) { const w = 7.5 * Math.sqrt(Math.max(0, 1 - ((z - 14) / 16) ** 2)); if (w < 1) continue; for (let x = Math.round(8.5 - w); x <= Math.round(8.5 + w) - 1; x++) { v.set(x, 0, z, 'glass'); v.box(x, 1, z, x, 5, z, 'white'); } }
  v.clear(2, 1, 3, 15, 5, 27);
  for (let z = 2; z <= 28; z++) for (let x = 0; x < 18; x++) if (v.get(x, 1, z) && (!v.get(x + 1, 1, z) || !v.get(x - 1, 1, z))) v.set(x, 4, z, 'teal');
  v.paint((x, y, z, c) => (c === P.white && y === 5 ? 'teal' : null));
  for (const [x, z] of [[4, 8], [13, 8], [4, 20], [13, 20]]) v.box(x, 5, z, x, 12, z, 'white');
  v.box(3, 13, 7, 14, 13, 21, 'coral'); v.paint((x, y, z, c) => (y === 13 && z % 3 === 0 ? 'white' : null));
  v.box(4, 1, 10, 13, 1, 18, 'sky'); v.set(8, 1, 14, 'orange'); v.set(10, 1, 12, 'yellow'); v.set(6, 1, 16, 'coral');
}, RIDE('glassbunnsbåt'));
def('ride_kane', [16, 16, 28], S10, (v) => {
  for (const x of [2, 13]) { v.box(x, 0, 2, x, 0, 25, 'gold'); v.box(x, 1, 25, x, 3, 26, 'gold'); v.set(x, 4, 25, 'gold'); for (const z of [6, 12, 19]) v.box(x, 1, z, x, 3, z, 'gold'); }
  v.box(1, 4, 3, 14, 6, 22, 'red'); v.box(1, 7, 3, 1, 10, 22, 'red'); v.box(14, 7, 3, 14, 10, 22, 'red');
  v.box(1, 7, 3, 14, 14, 5, 'red'); v.box(1, 15, 3, 14, 15, 4, 'gold'); v.box(1, 7, 21, 14, 10, 22, 'red');
  v.box(2, 7, 6, 13, 9, 20, 'white'); v.box(2, 10, 9, 13, 10, 15, 'lilac'); v.box(2, 10, 6, 13, 12, 7, 'cream');
  v.paint((x, y, z, c) => (c === P.red && (x === 1 || x === 14) && y === 8 ? 'gold' : null));
  for (const [x, y] of [[4, 12], [11, 12]]) { v.set(x, y, 6, 'gold'); v.set(x, y - 1, 6, 'honey'); }
}, RIDE('kanefart'));
})();
