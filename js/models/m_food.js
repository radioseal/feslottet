/* Feslottet – MODELS-2: food & drink (castable words + Bakeriet catalogue). Owner: MODELS-2.
   Micro-voxels 1/16 m, palette NAMES only, front = +z, origin = bottom centre. Toy-diorama sizes (an apple ≈ 0.5 m) so items read at a glance.
   IDS (51): cake kake food_bløtkake bolle food_kanelbolle vaffel is iskrem saft kjeks food_muffins food_jordbær eple pære banan drue gulrot
     tomat agurk potet løk mais sitron plomme ananas melon kiwi mango blåbær bær nøtt ert kål brød ost egg melk vann juice brus kakao
     grøt suppe salat pasta ris pizza taco pølse smør pai
   Family: cake{tiers:1..3, c|col (frosting), sponge, fill, top:'berries'|'candles'|'none'}; 'kake' = cake{tiers:2,col:'pink'} and honours o.c.
   meta.react: 'eat' | 'drink'. Drinks use the 'glass' palette (transparent sub-mesh) with opaque liquid inside. */
(function () {
'use strict';
const F = window.F, V = F.VOX, P = F.PAL, H = F.U.hash2;
const D = (id, size, build, meta, extra) => V.def(id, Object.assign({ size, scale: 1 / 16, build, meta: Object.assign({ group: 'mat', by: 'models2' }, meta || {}) }, extra || {}));

/* ---------------------------------------------------------- tiny helpers (palette names only) */
const inC = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.25;
function ring(v, cx, y, cz, r0, r1, c, h) { for (let yy = y; yy < y + (h || 1); yy++) for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) if (inC(x, z, cx, cz, r1) && !inC(x, z, cx, cz, r0)) v.set(x, yy, z, c); }
function speck(v, from, to, p, seed) { const f = P[from]; v.paint((x, y, z, c) => c === f && H(x * 7 + y * 3, z * 13 + y, seed || 3) < p ? to : null); }
function topC(v, from, to) { const f = P[from]; v.paint((x, y, z, c) => c === f && !v.get(x, y + 1, z) ? to : null); }
const exposed = (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1);
function surfSpeck(v, from, to, p, seed) { const f = P[from]; v.paint((x, y, z, c) => c === f && exposed(v, x, y, z) && H(x * 5 + z, y * 11 + x, seed || 7) < p ? to : null); }
// drips of colour c running down from layer y over the rim of a cylinder (cx,cz,r) – a frosting/jam look
function drips(v, cx, y, cz, r, c, maxLen, seed) {
  for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) {
    if (!inC(x, z, cx, cz, r)) continue;
    if (inC(x + 1, z, cx, cz, r) && inC(x - 1, z, cx, cz, r) && inC(x, z + 1, cx, cz, r) && inC(x, z - 1, cx, cz, r)) continue;
    const n = Math.floor(H(x * 3 + seed, z * 5, 11) * (maxLen + 1));
    for (let k = 1; k <= n; k++) if (v.get(x, y - k, z)) v.set(x, y - k, z, c);
  }
}
// open bowl (y0..y0+h-1) with optional coloured band
function bowl(v, cx, cz, r, h, c, band, y0) {
  y0 = y0 || 0;
  for (let y = 0; y < h; y++) v.cyl(cx, y0 + y, cz, y === 0 ? r - 1.6 : y === 1 ? r - 0.6 : r, 1, c);
  v.cyl(cx, y0 + 1, cz, r - 1.6, h - 1, 0);
  if (band) ring(v, cx, y0 + h - 2, cz, r - 0.9, r, band);
}
// glass tumbler with liquid: the drink is an opaque column (strong colour at play distance), glass only at the base and above the drink
function tumbler(v, cx, cz, r, h, liq, lh) {
  v.cyl(cx, 0, cz, r, 1, 'glass');
  if (liq) v.cyl(cx, 1, cz, r - 0.4, lh, liq);
  v.cyl(cx, 1 + lh, cz, r, h - 1 - lh, 'glass'); v.cyl(cx, 1 + lh, cz, r - 1, h - 1 - lh, 0);
}
const strawberry = (v, x, y, z) => { v.set(x, y, z, 'red'); v.set(x, y + 1, z, 'red'); v.set(x, y + 2, z, 'leaf'); };

/* ---------------------------------------------------------- cake family */
function cakeBuild(v, o) {
  const tiers = Math.max(1, Math.min(3, o.tiers || 2)), col = o.c || o.col || 'pink', sp = o.sponge || 'cream2', fill = o.fill || 'cherry';
  const top = o.top || 'berries';
  const cx = 8.5, cz = 8.5, R = [7, 5, 3.2], HH = [5, 4, 4];
  v.cyl(cx, 0, cz, 8.6, 1, 'white');
  ring(v, cx, 0, cz, 7.6, 8.6, 'silver');
  let y = 1;
  for (let t = 0; t < tiers; t++) {
    const r = R[t], h = HH[t];
    v.cyl(cx, y, cz, r, h, sp);
    v.cyl(cx, y + Math.floor(h / 2) - 1, cz, r, 1, fill);
    v.cyl(cx, y + h, cz, r, 1, col);
    drips(v, cx, y + h, cz, r, col, 2, t * 7 + 1);
    y += h + 1;
    // cream dollops around the edge
    if (t < tiers - 1 || top === 'none') {
      for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2, rr = r - 0.7; v.set(Math.round(cx + Math.cos(an) * rr), y, Math.round(cz + Math.sin(an) * rr), a % 2 ? 'milk' : 'white'); }
    }
  }
  // sprinkles on every frosting top
  v.paint((x, yy, z, c) => c === P[col] && !v.get(x, yy + 1, z) && H(x, z, yy) < 0.12 ? ['yellow', 'sky', 'mint', 'white'][Math.floor(H(z, x, 3) * 4)] : null);
  const rt = R[tiers - 1];
  if (top === 'berries') {
    const n = tiers === 3 ? 4 : 6;
    for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2 + 0.4; strawberry(v, Math.round(cx + Math.cos(an) * (rt - 1.4)), y, Math.round(cz + Math.sin(an) * (rt - 1.4))); }
    v.set(8, y, 8, 'milk'); v.set(9, y, 9, 'milk'); v.set(8, y, 9, 'milk'); v.set(9, y, 8, 'milk'); v.set(8, y + 1, 8, 'white');
  } else if (top === 'candles') {
    const n = tiers === 3 ? 3 : 5;
    for (let a = 0; a < n; a++) {
      const an = a / n * Math.PI * 2, x = Math.round(cx + Math.cos(an) * (rt - 1.6)), z = Math.round(cz + Math.sin(an) * (rt - 1.6));
      for (let k = 0; k < 3; k++) v.set(x, y + k, z, k % 2 ? 'white' : ['sky', 'pink', 'mint', 'yellow', 'lilac'][a]);
      v.set(x, y + 3, z, 'flame');
    }
  }
}
D('cake', [18, 26, 18], cakeBuild, { family: 'cake', variants: { tiers: [1, 2, 3], col: ['pink', 'mint', 'butter', 'lavender', 'brown'], top: ['berries', 'candles'] } });
D('kake', [18, 26, 18], (v, o) => cakeBuild(v, Object.assign({ tiers: 2, col: 'pink' }, o)), { family: 'cake', react: 'eat', variants: { col: ['pink', 'mint', 'butter', 'lavender', 'brown'], top: ['berries', 'candles'] } });

// bløtkake: tall cream cake with strawberries and a slice cut out showing the layers
D('food_bløtkake', [18, 14, 18], (v, o) => {
  const cx = 8.5, cz = 8.5;
  v.cyl(cx, 0, cz, 8.6, 1, 'white'); ring(v, cx, 0, cz, 7.6, 8.6, 'silver');
  const layers = ['hay', 'hay', 'milk', 'red', 'hay', 'hay', 'milk', 'hay', 'hay'];
  layers.forEach((c, i) => v.cyl(cx, 1 + i, cz, 6, 1, c));
  ring(v, cx, 1, cz, 6, 7, 'milk', 9);
  v.cyl(cx, 10, cz, 7, 1, 'milk');
  for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; v.set(Math.round(cx + Math.cos(an) * 6.2), 11, Math.round(cz + Math.sin(an) * 6.2), 'white'); }
  for (let a = 0; a < 7; a++) { const an = a / 7 * Math.PI * 2 + 0.3; strawberry(v, Math.round(cx + Math.cos(an) * 3.6), 11, Math.round(cz + Math.sin(an) * 3.6)); }
  strawberry(v, 8, 11, 8); strawberry(v, 9, 11, 9);
  // cut wedge toward the front (+z) so the layers show
  for (let y = 1; y < 14; y++) for (let z = 0; z < 18; z++) for (let x = 0; x < 18; x++) { const ang = Math.atan2(x - cx, z - cz); if (Math.abs(ang - 0.35) < 0.42 && Math.hypot(x - cx, z - cz) > 0.6) v.set(x, y, z, 0); }
}, { react: 'eat' });

/* ---------------------------------------------------------- bakery */
D('bolle', [10, 6, 10], (v) => {
  v.ellipsoid(4.5, 0, 4.5, 4.7, 4.9, 4.7, 'honey');
  v.paint((x, y, z, c) => y >= 3 ? P.woodLight : y === 0 ? P.hay : null);
  v.paint((x, y, z, c) => !v.get(x, y + 1, z) && y >= 2 && H(x, z, 5) < 0.22 ? 'white' : null);
}, { react: 'eat' });

D('food_kanelbolle', [11, 6, 11], (v) => {
  const cx = 5, cz = 5;
  v.ellipsoid(cx, 0, cz, 5.2, 4.6, 5.2, 'honey');
  v.paint((x, y, z, c) => {
    if (!exposed(v, x, y, z) || y < 1) return null;
    const d = Math.hypot(x - cx, z - cz), a = Math.atan2(z - cz, x - cx) / (Math.PI * 2) + 0.5;
    return ((d - a * 1.8) % 1.8 + 1.8) % 1.8 < 0.75 ? P.woodRed : null;
  });
  // icing drizzle
  for (let i = 0; i < 3; i++) for (let t = 0; t <= 8; t++) { const x = 1 + t, z = Math.round(2 + i * 3 + Math.sin(t * 0.9 + i) * 0.8); for (let y = 6; y >= 0; y--) if (v.get(x, y, z)) { v.set(x, y, z, 'milk'); break; } }
}, { react: 'eat' });

D('vaffel', [17, 5, 17], (v) => {
  // five hearts in a ring, tips meeting in the middle (Norwegian waffle)
  const cx = 8, cz = 8;
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + Math.PI / 2, dx = Math.cos(a), dz = Math.sin(a);
    for (let z = 0; z < 17; z++) for (let x = 0; x < 17; x++) {
      const px = x - cx, pz = z - cz, u = px * dx + pz * dz, w = -px * dz + pz * dx;
      const lobe = Math.hypot(u - 5.6, Math.abs(w) - 1.55) <= 1.75, tri = u >= 0.4 && u <= 6 && Math.abs(w) <= (u - 0.4) * 0.58;
      if (lobe || tri) v.box(x, 0, z, x, 1, z, 'honey');
    }
  }
  v.paint((x, y, z, c) => y === 1 && x % 2 === 1 && z % 2 === 1 ? P.woodLight : null);
  v.paint((x, y, z, c) => y === 0 ? P.woodLight : null);
  v.ellipsoid(8, 2, 12, 1.7, 1.2, 1.7, 'red'); v.ellipsoid(8, 2.4, 13.5, 1.4, 1.3, 1.2, 'milk'); v.set(8, 4, 13, 'white');
}, { react: 'eat' });

D('is', [9, 18, 9], (v) => {
  const c = 4;
  for (let y = 0; y < 9; y++) v.cyl(c, y, c, 0.5 + 3.3 * y / 8, 1, 'honey');
  v.paint((x, y, z, col) => y < 9 && ((x + y) % 3 === 0 || (z + y + 1) % 3 === 0) && exposed(v, x, y, z) ? P.woodLight : null);
  v.cyl(c, 9, c, 4, 1, 'woodLight');
  v.sphere(c, 11, c, 3.6, 'pink');
  v.sphere(c, 14.5, c, 2.9, 'mint');
  drips(v, c, 9, c, 4, 'pink', 2, 4);
  v.set(c, 17, c, 'red'); v.set(c, 17, c + 1, 'red'); v.set(c + 1, 17, c, 'red');
  surfSpeck(v, 'mint', 'white', 0.06, 2);
}, { react: 'eat' });

D('saft', [10, 15, 10], (v) => {
  tumbler(v, 4.5, 4.5, 4, 11, 'red', 8);
  v.cyl(4.5, 8, 4.5, 3.4, 1, 'cherry'); v.box(3, 9, 3, 4, 9, 4, 'ice'); v.box(5, 9, 5, 6, 9, 6, 'ice');
  for (let i = 0; i <= 7; i++) v.set(6 + Math.floor(i / 4), 7 + i, 4, i % 2 ? 'white' : 'pink');
  // lemon slice on the rim
  for (let a = 0; a < 7; a++) { const an = Math.PI * (0.1 + 0.8 * a / 6); v.set(0, 9 + Math.round(Math.sin(an) * 2.4), Math.round(4.5 + Math.cos(an) * 2.4), a % 3 === 0 ? 'white' : 'yellow'); }
  v.box(0, 10, 4, 0, 10, 5, 'butter');
}, { react: 'drink' });

D('kjeks', [14, 11, 13], (v) => {
  // a little tower of chocolate-chip cookies (chips on every top) and one cookie leaning against it, with a bite out of the top one
  const ck = (cx, y, cz, r) => { v.cyl(cx, y, cz, r, 2, 'honey'); ring(v, cx, y, cz, r - 0.8, r, 'woodLight', 2);
    v.paint((x, yy, z, c) => yy === y + 1 && c === P.honey && H(x * 3 + y, z, 7) < 0.22 ? P.brown : null); };
  ck(6, 0, 7, 5); ck(6.4, 2, 6.6, 4.8); ck(5.8, 4, 7, 4.6); ck(6.2, 6, 6.8, 4.4);
  v.cyl(9.6, 6, 9.2, 1.8, 2, 0);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) if ((x - 11) ** 2 + (y - 4.6) ** 2 <= 4.2 * 4.2) v.box(Math.min(13, x), y, 1, Math.min(13, x), y, 2, (x - 11) ** 2 + (y - 4.6) ** 2 > 3.4 * 3.4 ? 'woodLight' : 'honey');
  for (const [x, y] of [[10, 6], [12, 4], [10, 3], [12, 7]]) v.set(x, y, 3, 'brown');
}, { react: 'eat' });

D('food_muffins', [10, 11, 10], (v) => {
  const c = 4.5;
  for (let y = 0; y < 5; y++) v.cyl(c, y, c, 3.2 + y * 0.3, 1, 'pink');
  v.paint((x, y, z, col) => col === P.pink && Math.round(Math.atan2(z - c, x - c) * 3) % 2 === 0 ? P.rose : null);
  v.ellipsoid(c, 5, c, 4.8, 4.2, 4.8, 'brown');
  v.paint((x, y, z, col) => col === P.brown && y >= 5 && !v.get(x, y + 1, z) && H(x, z, 4) < 0.18 ? ['yellow', 'pink', 'sky', 'white'][Math.floor(H(z, x, 1) * 4)] : null);
  v.set(4, 10, 4, 'red'); v.set(5, 10, 5, 'red'); v.set(4, 10, 5, 'red'); v.set(5, 10, 4, 'red');
}, { react: 'eat' });

D('food_jordbær', [12, 9, 10], (v) => {
  // small woody punnet heaped with strawberries
  v.box(1, 0, 1, 10, 3, 8, 'woodLight'); v.box(2, 1, 2, 9, 3, 7, 0); v.box(2, 1, 2, 9, 2, 7, 'leaf');
  v.paint((x, y, z, c) => c === P.woodLight && (x + y) % 2 === 0 ? P.honey : null);
  const berry = (x, y, z) => { v.ellipsoid(x, y, z, 1.7, 1.6, 1.7, 'red'); v.set(x, y + 2, z, 'leaf'); v.set(x - 1, y + 1, z, 'leaf'); };
  [[3.5, 3.5, 3.5], [6.5, 3.5, 3.5], [3.5, 3.5, 6], [6.5, 3.5, 6], [8.5, 3.5, 5], [5, 5.5, 4.8], [7, 5.2, 5.5]].forEach(p => berry(...p));
  surfSpeck(v, 'red', 'butter', 0.12, 5);
}, { react: 'eat' });

/* ---------------------------------------------------------- fruit & veg */
D('eple', [9, 12, 9], (v) => {
  v.ellipsoid(4, 4, 4, 4.3, 4.1, 4.3, 'red');
  v.set(4, 8, 4, 0); v.set(4, 0, 4, 'cherry');
  v.line(4, 8, 4, 4, 10, 4, 'woodDark'); v.set(5, 10, 4, 'woodDark');
  v.box(5, 9, 4, 7, 9, 5, 'leaf'); v.set(6, 10, 4, 'leaf2');
  v.set(2, 6, 7, 'coral'); v.set(2, 5, 7, 'coral'); v.set(1, 6, 6, 'coral');
}, { react: 'eat' });

D('pære', [9, 15, 9], (v) => {
  v.ellipsoid(4, 3.8, 4, 4.1, 3.8, 4.1, 'leaf2');
  v.ellipsoid(4, 7.6, 4, 2.5, 3.6, 2.5, 'leaf2'); v.ellipsoid(4, 6, 4, 3.2, 2, 3.2, 'leaf2');
  v.paint((x, y, z, c) => c === P.leaf2 && y < 6 && x <= 3 && z >= 5 ? P.hay : null);
  surfSpeck(v, 'leaf2', 'gem3', 0.06, 4);
  v.line(4, 11, 4, 5, 13, 4, 'woodDark'); v.box(5, 12, 4, 7, 12, 5, 'leaf');
}, { react: 'eat' });

D('banan', [15, 7, 6], (v) => {
  for (let i = 0; i <= 26; i++) {
    const t = i / 26, x = 1.5 + t * 11.5, y = 1.6 + 3.6 * (2 * t - 1) ** 2, r = 1.75 * (1 - 0.55 * Math.abs(2 * t - 1) ** 3);
    v.ellipsoid(x, y, 2.5, r, r, r + 0.15, 'yellow');
  }
  v.paint((x, y, z, c) => c === P.yellow && !v.get(x, y + 1, z) && y >= 2 ? P.butter : null);
  v.box(0, 5, 2, 1, 6, 2, 'woodDark'); v.set(14, 5, 2, 'brown'); v.set(13, 5, 2, 'hay');
}, { react: 'eat' });

D('drue', [10, 13, 7], (v) => {
  const g = (x, y, z) => v.sphere(x, y, z, 1.45, 'plum');
  [[2, 9], [4.5, 9], [7, 9], [3.2, 6.8], [5.8, 6.8], [4.5, 4.6], [1.6, 7.2], [7.6, 7], [4.5, 2.4]].forEach(([x, y]) => { g(x, y, 3); g(x + 0.6, y - 0.5, 4.6); });
  speck(v, 'plum', 'purple', 0.3, 2); surfSpeck(v, 'purple', 'lavender', 0.08, 3);
  v.line(4, 10, 3, 5, 12, 3, 'woodDark'); v.box(6, 11, 2, 8, 12, 4, 'leaf'); v.set(7, 12, 3, 'leaf2');
}, { react: 'eat' });

D('gulrot', [14, 9, 6], (v) => {
  for (let x = 3; x <= 13; x++) { const r = 2.6 * Math.pow(1 - (x - 3) / 11.5, 0.75); for (let z = 0; z < 6; z++) for (let y = 0; y < 6; y++) if ((y - 2.5) ** 2 + (z - 2.5) ** 2 <= r * r + 0.2) v.set(x, y, z, 'orange'); }
  v.paint((x, y, z, c) => c === P.orange && x % 3 === 1 && H(y, z, x) < 0.35 ? P.honey : null);
  v.line(3, 3, 2, 0, 8, 1, 'leaf'); v.line(3, 3, 3, 1, 8, 3, 'leaf2'); v.line(3, 3, 3, 0, 7, 5, 'leaf'); v.line(3, 2, 2, 0, 5, 2, 'leafDark');
  v.set(0, 8, 2, 'leaf2'); v.set(2, 8, 4, 'leaf');
}, { react: 'eat' });

D('tomat', [9, 9, 9], (v) => {
  v.ellipsoid(4, 3.6, 4, 4.3, 3.6, 4.3, 'red');
  v.set(4, 7, 4, 'leafDark'); v.box(3, 7, 4, 5, 7, 4, 'leaf'); v.box(4, 7, 3, 4, 7, 5, 'leaf'); v.set(2, 7, 4, 'leaf'); v.set(6, 7, 4, 'leaf'); v.set(4, 7, 2, 'leaf'); v.set(4, 7, 6, 'leaf');
  v.set(4, 8, 4, 'leafDark');
  v.set(2, 5, 7, 'coral'); v.set(1, 5, 6, 'coral');
}, { react: 'eat' });

D('agurk', [15, 6, 6], (v) => {
  v.ellipsoid(7, 2.5, 2.5, 7, 2.6, 2.6, 'leafDark');
  surfSpeck(v, 'leafDark', 'leaf2', 0.18, 2);
  v.set(0, 2, 2, 'butter'); v.set(14, 2, 2, 'leaf');
}, { react: 'eat' });

D('potet', [12, 7, 9], (v) => {
  v.ellipsoid(5.5, 3, 4, 5.2, 3, 3.6, 'woodLight'); v.ellipsoid(3.4, 3.4, 4.4, 2.6, 2.6, 2.6, 'woodLight'); v.ellipsoid(8, 2.8, 3.8, 2.8, 2.4, 2.8, 'woodLight');
  v.paint((x, y, z, c) => y <= 1 ? P.soil : null);
  for (const [x, y, z] of [[3, 5, 7], [7, 4, 7], [9, 3, 6], [5, 6, 4], [2, 3, 7]]) { const zz = (() => { for (let k = 8; k >= 0; k--) if (v.get(x, y, k)) return k; return -1; })(); if (zz >= 0) v.set(x, y, zz, 'brown'); }
  surfSpeck(v, 'woodLight', 'hay', 0.12, 9);
}, { react: 'eat' });

D('løk', [9, 12, 9], (v) => {
  v.ellipsoid(4, 4, 4, 4.2, 4, 4.2, 'honey');
  v.cone(4, 7, 4, 2.2, 3, 'honey');
  v.paint((x, y, z, c) => c === P.honey && (Math.round(Math.atan2(z - 4, x - 4) * 2.2) % 2 === 0) ? P.woodLight : null);
  v.line(4, 9, 4, 4, 11, 4, 'hay'); v.set(5, 11, 4, 'leaf2');
  v.set(3, 0, 4, 'cream2'); v.set(5, 0, 4, 'cream2'); v.set(4, 0, 3, 'cream2'); v.set(4, 0, 5, 'cream2');
}, { react: 'eat' });

D('mais', [14, 8, 8], (v) => {
  for (let x = 2; x <= 13; x++) { const r = 2.6 * (x > 10 ? 1 - (x - 10) / 4 : 1); for (let z = 0; z < 8; z++) for (let y = 0; y < 8; y++) if ((y - 3.5) ** 2 + (z - 3.5) ** 2 <= r * r + 0.3) v.set(x, y, z, (x + y + z) % 2 ? 'yellow' : 'butter'); }
  // husk leaves peeled back at the left
  v.box(0, 1, 2, 4, 2, 5, 'leaf2'); v.line(4, 6, 2, 0, 7, 1, 'leaf'); v.line(4, 6, 5, 0, 7, 6, 'leaf'); v.line(4, 1, 1, 1, 0, 0, 'leaf'); v.line(4, 1, 6, 1, 0, 7, 'leaf');
  v.box(4, 2, 1, 5, 5, 1, 'leaf2'); v.box(4, 2, 6, 5, 5, 6, 'leaf2');
}, { react: 'eat' });

D('sitron', [15, 10, 13], (v) => {
  v.ellipsoid(7, 4.4, 4.5, 5.6, 4.1, 4.1, 'yellow'); v.box(0, 4, 4, 1, 5, 5, 'yellow'); v.box(13, 4, 4, 14, 5, 5, 'yellow'); v.set(14, 4, 4, 'honey');
  surfSpeck(v, 'yellow', 'butter', 0.12, 4);
  v.box(6, 8, 4, 9, 8, 5, 'leaf'); v.set(5, 8, 5, 'leaf2'); v.set(7, 9, 4, 'leafDark'); v.set(8, 9, 5, 'leaf');
  // a slice lying in front: white pith, yellow segments
  for (let z = 7; z < 13; z++) for (let x = 3; x < 12; x++) { const d = Math.hypot(x - 7, z - 10); if (d > 3.1) continue;
    const seg = Math.round(Math.atan2(z - 10, x - 7) / (Math.PI / 4)) % 2 === 0; v.box(x, 0, z, x, 1, z, d > 2.4 ? 'yellow' : d < 0.8 ? 'white' : seg ? 'butter' : 'white'); }
}, { react: 'eat' });

D('plomme', [11, 13, 11], (v) => {
  v.ellipsoid(5, 4.6, 5, 4.6, 4.6, 4.3, 'plum');
  v.paint((x, y, z, c) => c === P.plum && x <= 3 ? P.purple : null);
  v.paint((x, y, z, c) => (c === P.plum || c === P.purple) && x === 5 && z >= 7 ? P.navySoft : null);
  surfSpeck(v, 'plum', 'lavender', 0.08, 1);
  v.set(2, 7, 8, 'white'); v.set(3, 8, 8, 'white');
  v.line(5, 9, 5, 6, 11, 5, 'woodDark'); v.box(6, 10, 5, 9, 10, 6, 'leaf'); v.box(7, 11, 5, 8, 11, 6, 'leaf2');
}, { react: 'eat' });

D('ananas', [9, 17, 9], (v) => {
  v.ellipsoid(4, 5, 4, 3.8, 5, 3.8, 'honey');
  v.paint((x, y, z, c) => c === P.honey && ((x + y + z) % 4 === 0 || (x - y + z + 40) % 4 === 0) ? P.woodLight : null);
  const leaf = (dx, dz, h, c) => v.line(4, 9, 4, 4 + dx, 9 + h, 4 + dz, c);
  leaf(0, 0, 7, 'leafDark'); leaf(2, 0, 5, 'leaf'); leaf(-2, 0, 5, 'leaf'); leaf(0, 2, 5, 'leaf'); leaf(0, -2, 5, 'leaf');
  leaf(3, 2, 3, 'leaf2'); leaf(-3, -2, 3, 'leaf2'); leaf(2, -3, 4, 'leafDark'); leaf(-2, 3, 4, 'leafDark');
  v.box(3, 10, 3, 5, 11, 5, 'leaf');
}, { react: 'eat' });

D('melon', [14, 8, 5], (v) => {
  // watermelon slice standing like a smile
  for (let z = 1; z <= 3; z++) for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) {
    const d = Math.hypot(x - 6.5, y - 7.5); if (y > 7.4 || d > 7.2) continue;
    v.set(x, y, z, d > 6.2 ? 'leafDark' : d > 5.3 ? 'mint' : 'red');
  }
  v.paint((x, y, z, c) => c === P.red && (z === 3 || z === 1) && (x * 3 + y * 5) % 7 === 0 && y < 6 && y > 1 ? P.black : null);
  v.paint((x, y, z, c) => c === P.red && y === 7 ? P.cherry : null);
}, { react: 'eat' });

D('kiwi', [14, 9, 12], (v) => {
  v.ellipsoid(4.5, 3.8, 4.5, 3.8, 3.6, 4.2, 'woodLight'); surfSpeck(v, 'woodLight', 'brown', 0.2, 3);
  // half kiwi, cut face up
  for (let y = 0; y <= 3; y++) v.cyl(9, y, 7.4, Math.sqrt(Math.max(0, 4.3 ** 2 - (3.4 - y) ** 2)), 1, 'woodLight');
  v.paint((x, y, z, c) => { if (y !== 3 || c !== P.woodLight || Math.hypot(x - 9, z - 7.4) > 4.2) return null; const d = Math.hypot(x - 9, z - 7.4); return d < 1.1 ? P.cream : d < 3.2 ? P.gem3 : P.leaf2; });
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; v.set(Math.round(9 + Math.cos(a) * 1.9), 3, Math.round(7.4 + Math.sin(a) * 1.9), 'black'); }
}, { react: 'eat' });

D('mango', [11, 9, 9], (v) => {
  // kidney-shaped mango: green at the stem, blushing red-orange, yellow belly
  v.ellipsoid(5, 3.8, 4, 4.4, 3.6, 3.4, 'orange'); v.ellipsoid(6.6, 4.2, 4, 3.4, 3.4, 3.2, 'orange');
  v.paint((x, y, z, c) => x >= 7 && y >= 4 ? P.red : x <= 3 && y <= 3 ? P.yellow : x >= 8 ? P.coral : null);
  v.paint((x, y, z, c) => x >= 8 && y >= 6 ? P.leaf2 : null);
  v.set(9, 7, 4, 'woodDark'); v.box(9, 8, 4, 10, 8, 5, 'leaf');
}, { react: 'eat' });

D('blåbær', [11, 6, 9], (v) => {
  v.ellipsoid(5, 0, 4, 5, 1, 4, 'leaf'); v.line(1, 0, 4, 9, 0, 4, 'leafDark');
  [[3, 2, 3], [5.5, 2, 3], [8, 2, 4], [4, 2, 5.5], [6.5, 2, 5.5], [4.8, 3.8, 4.2], [2.5, 2, 5.6]].forEach(([x, y, z]) => v.sphere(x, y, z, 1.35, 'navySoft'));
  surfSpeck(v, 'navySoft', 'lavender', 0.12, 2);
  v.paint((x, y, z, c) => c === P.navySoft && !v.get(x, y + 1, z) && H(x, z, y) < 0.3 ? P.purple : null);
}, { react: 'eat' });

D('bær', [11, 7, 11], (v) => {
  bowl(v, 5, 5, 5.1, 4, 'white', 'sky');
  v.ellipsoid(5, 3, 5, 4, 2.4, 4, 'red');
  surfSpeck(v, 'red', 'navySoft', 0.3, 1); surfSpeck(v, 'red', 'cherry', 0.25, 2);
  v.set(5, 6, 5, 'leaf'); v.set(4, 6, 5, 'leaf');
}, { react: 'eat' });

D('nøtt', [7, 9, 7], (v) => {
  v.ellipsoid(3, 3.4, 3, 3.1, 3.4, 3.1, 'woodLight');
  v.ellipsoid(3, 6, 3, 3.3, 1.7, 3.3, 'brown');
  speck(v, 'brown', 'woodDark', 0.3, 4);
  v.set(3, 8, 3, 'woodDark'); v.set(3, 0, 3, 'woodRed');
}, { react: 'eat' });

D('ert', [13, 6, 7], (v) => {
  // open pea pod with peas
  for (let x = 1; x <= 11; x++) { const w = 2.6 * Math.sin(Math.PI * (x - 0.3) / 11.4); for (let z = 0; z < 7; z++) for (let y = 0; y < 4; y++) { const d = Math.hypot(z - 3, (y - 3) * 1.1); if (d <= w + 0.3 && d >= w - 0.9) v.set(x, y, z, 'leaf'); } }
  for (let i = 0; i < 5; i++) v.sphere(2.6 + i * 1.9, 2.4, 3, 1.05, 'gem3');
  v.line(0, 3, 3, 1, 3, 3, 'leafDark'); v.set(0, 4, 3, 'leafDark');
}, { react: 'eat' });

D('kål', [11, 10, 11], (v) => {
  v.sphere(5, 4.6, 5, 4.5, 'leaf2');
  for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; v.ellipsoid(5 + Math.cos(an) * 3, 3, 5 + Math.sin(an) * 3, 2.4, 3, 2.4, 'leaf'); }
  v.paint((x, y, z, c) => c === P.leaf2 && (x === 5 || z === 5) && y > 4 ? P.mint : null);
}, { react: 'eat' });

/* ---------------------------------------------------------- meals & dairy */
D('brød', [15, 9, 9], (v) => {
  // loaf: straight sides, domed crust, three diagonal cuts, flour dust
  v.box(1, 0, 1, 13, 3, 7, 'woodLight');
  for (let x = 1; x <= 13; x++) for (let y = 3; y < 9; y++) for (let z = 0; z < 9; z++) if (((z - 4) / 3.6) ** 2 + ((y - 3) / 4.6) ** 2 <= 1 && (x > 1 && x < 13 || y < 7)) v.set(x, y, z, 'woodLight');
  v.paint((x, y, z, c) => y === 0 ? P.honey : null);
  v.paint((x, y, z, c) => c === P.woodLight && !v.get(x, y + 1, z) && y >= 5 && [3, 7, 11].some(k => Math.abs(x - k - (z - 4) * 0.5) < 0.6) ? P.cream2 : null);
  v.paint((x, y, z, c) => c === P.woodLight && !v.get(x, y + 1, z) && H(x, z, 2) < 0.1 ? P.milk : null);
}, { react: 'eat' });

D('ost', [12, 8, 11], (v) => {
  for (let y = 0; y <= 6; y++) for (let z = 0; z < 11; z++) for (let x = 0; x < 12; x++) if (Math.abs(z - 5) <= 5.2 * x / 11 + 0.5) v.set(x, y, z, x >= 10 ? 'honey' : 'yellow');
  v.paint((x, y, z, c) => c === P.yellow && y === 6 ? P.butter : null);
  [[4, 3, 7.5], [7, 2, 9], [8, 5, 9.4], [5, 6.6, 5], [8, 6.6, 3.5], [2, 5, 6]].forEach(([x, y, z]) => v.sphere(x, y, z, 1.15, 0));
}, { react: 'eat' });

D('egg', [14, 13, 14], (v) => {
  // one clean upright egg (oval, widest below the middle, flat enough to stand) – reads as «egg» alone and in a carton of 10
  for (let y = 0; y < 13; y++) { const t = (y + 0.5) / 13, r = 5.0 * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * (1 - 0.22 * t) + 0.45; if (r > 0.6) v.cyl(6.5, y, 6.5, r, 1, 'cream'); }
  v.paint((x, y, z, c) => (c === P.cream && y >= 6 && y <= 10 && x <= 5 && z >= 8 ? P.white : (c === P.cream && y <= 2 ? P.cream2 : null)));
}, { react: 'eat' });

D('melk', [7, 14, 7], (v) => {
  v.box(1, 0, 1, 5, 9, 5, 'milk'); v.box(1, 2, 1, 5, 6, 5, 'blue');
  v.set(3, 5, 5, 'milk'); v.box(2, 3, 5, 4, 4, 5, 'milk'); v.set(3, 2, 5, 'milk');
  for (let k = 0; k < 3; k++) v.box(1, 10 + k, 1 + k, 5, 10 + k, 5 - k, 'milk');
  v.box(1, 13, 3, 5, 13, 3, 'white'); v.set(2, 11, 4, 'blue'); v.set(2, 12, 3, 'blue');
  v.box(1, 9, 1, 5, 9, 5, 'sky');
}, { react: 'drink' });

D('vann', [10, 14, 10], (v) => {
  tumbler(v, 4.5, 4.5, 4, 11, 'sky', 8);
  v.paint((x, y, z, c) => c === P.sky && (y === 3 || y === 6) && H(x, z, y) < 0.5 ? P.water : null);
  v.cyl(4.5, 8, 4.5, 3.4, 1, 'water'); v.box(2, 9, 3, 3, 10, 4, 'ice'); v.box(5, 9, 5, 6, 9, 6, 'ice'); v.set(3, 7, 9, 'white'); v.set(3, 6, 9, 'white');
  // a big water drop beside the glass
  v.sphere(8.6, 2.2, 8.4, 1.4, 'sky'); v.set(9, 4, 8, 'sky'); v.set(8, 3, 9, 'white');
}, { react: 'drink' });

D('juice', [9, 12, 8], (v) => {
  tumbler(v, 3.5, 3.5, 3.6, 10, 'orange', 7);
  v.cyl(3.5, 7, 3.5, 3, 1, 'honey');
  // orange slice on the rim
  for (let a = 0; a < 7; a++) { const an = Math.PI * (0.1 + 0.8 * a / 6); v.set(7, 8 + Math.round(Math.sin(an) * 2.6), Math.round(3.5 + Math.cos(an) * 2.6), a % 3 === 0 ? 'yellow' : 'orange'); }
  v.box(7, 9, 3, 7, 9, 4, 'butter');
  v.line(2, 6, 2, 1, 11, 1, 'mint');
}, { react: 'drink' });

D('brus', [6, 16, 6], (v) => {
  v.cyl(2.5, 0, 2.5, 2.6, 9, 'glass'); v.cyl(2.5, 9, 2.5, 1.9, 2, 'glass'); v.cyl(2.5, 11, 2.5, 1.2, 3, 'glass');
  v.cyl(2.5, 1, 2.5, 1.6, 10, 'gem3'); v.cyl(2.5, 11, 2.5, 0.5, 2, 'gem3');
  v.cyl(2.5, 3, 2.5, 2.6, 3, 'yellow'); v.box(1, 4, 5, 4, 4, 5, 'red');
  v.cyl(2.5, 14, 2.5, 1.3, 1, 'red');
  v.paint((x, y, z, c) => c === P.gem3 && H(x, y, z) < 0.12 ? P.white : null);
}, { react: 'drink' });

D('kakao', [11, 11, 9], (v) => {
  // a cup of cocoa with whipped cream and marshmallows
  v.cyl(4, 0, 4.5, 3.7, 7, 'sky'); v.cyl(4, 1, 4.5, 2.7, 6, 0); v.cyl(4, 1, 4.5, 2.7, 5, 'brown');
  ring(v, 4, 2, 4.5, 2.8, 3.7, 'white'); ring(v, 4, 4, 4.5, 2.8, 3.7, 'white');
  v.box(8, 1, 4, 9, 1, 5, 'sky'); v.box(9, 1, 4, 10, 5, 5, 'sky'); v.box(8, 5, 4, 9, 5, 5, 'sky'); v.box(9, 2, 4, 9, 4, 5, 0);
  v.ellipsoid(4, 6.5, 4.5, 2.8, 2.2, 2.8, 'milk'); v.set(4, 8, 4, 'white'); v.set(4, 9, 4, 'white');
  v.set(2, 7, 6, 'pink'); v.set(6, 7, 3, 'pink'); v.set(6, 7, 6, 'white');
  v.paint((x, y, z, c) => c === P.milk && !v.get(x, y + 1, z) && H(x, z, 6) < 0.2 ? P.woodDark : null);
}, { react: 'drink' });

D('grøt', [12, 8, 12], (v) => {
  bowl(v, 5.5, 5.5, 5.6, 5, 'white', 'blue');
  v.ellipsoid(5.5, 3.4, 5.5, 4.6, 1.8, 4.6, 'cream');
  v.box(5, 5, 5, 6, 5, 6, 'yellow'); v.set(5, 5, 4, 'butter');
  surfSpeck(v, 'cream', 'woodRed', 0.07, 3); surfSpeck(v, 'cream', 'white', 0.08, 5);
  v.line(8, 5, 4, 11, 7, 2, 'silver'); v.box(7, 4, 4, 8, 4, 5, 'silver');
}, { react: 'eat' });

D('suppe', [12, 8, 12], (v) => {
  bowl(v, 5.5, 5.5, 5.6, 5, 'white', 'coral');
  v.cyl(5.5, 1, 5.5, 4.6, 3, 'orange');
  v.paint((x, y, z, c) => c === P.orange && y === 3 && Math.abs(Math.hypot(x - 5.5, z - 5.5) - 2) < 0.6 ? P.milk : null);
  v.set(5, 4, 5, 'leaf'); v.set(6, 4, 5, 'leaf2'); v.set(5, 4, 6, 'leaf');
  v.line(8, 4, 4, 11, 7, 2, 'silver');
}, { react: 'eat' });

D('salat', [12, 9, 12], (v) => {
  bowl(v, 5.5, 5.5, 5.6, 5, 'woodLight', 'wood');
  v.ellipsoid(5.5, 4.4, 5.5, 4.8, 3, 4.8, 'leaf2');
  surfSpeck(v, 'leaf2', 'leaf', 0.35, 2); surfSpeck(v, 'leaf2', 'red', 0.08, 7); surfSpeck(v, 'leaf2', 'yellow', 0.06, 9); surfSpeck(v, 'leaf2', 'white', 0.05, 11);
}, { react: 'eat' });

D('pasta', [14, 7, 14], (v) => {
  v.cyl(6.5, 0, 6.5, 6.8, 1, 'white'); ring(v, 6.5, 0, 6.5, 5.6, 6.8, 'sky');
  v.ellipsoid(6.5, 1, 6.5, 4.6, 3, 4.6, 'butter');
  v.paint((x, y, z, c) => c === P.butter && ((x + y * 2 + z) % 3 === 0) ? P.hay : null);
  v.ellipsoid(6.5, 3.6, 6.5, 2.6, 1, 2.6, 'red');
  v.sphere(5.5, 4.3, 6, 1.2, 'woodRed'); v.sphere(7.8, 4, 7.4, 1.2, 'woodRed'); v.set(6.5, 5, 5, 'leaf');
}, { react: 'eat' });

D('ris', [12, 8, 12], (v) => {
  bowl(v, 5.5, 5.5, 5.6, 5, 'white', 'red');
  v.ellipsoid(5.5, 4, 5.5, 4.6, 2.6, 4.6, 'milk');
  surfSpeck(v, 'milk', 'cream', 0.25, 3);
  v.line(7, 6, 2, 11, 7, 1, 'woodLight'); v.line(8, 6, 3, 11, 7, 3, 'woodLight');
}, { react: 'eat' });

D('pizza', [17, 4, 17], (v) => {
  const c = 8;
  v.cyl(c, 0, c, 8.1, 1, 'honey'); ring(v, c, 1, c, 7, 8.1, 'honey');
  v.cyl(c, 1, c, 7, 1, 'red');
  v.paint((x, y, z, col) => col === P.red && H(x, z, 1) < 0.75 ? P.butter : null);
  [[5, 5], [11, 6], [8, 10], [4, 10], [12, 11], [9, 3]].forEach(([x, z]) => { v.cyl(x, 2, z, 1.2, 1, 'red'); });
  [[7, 7], [10, 9], [6, 12], [12, 4]].forEach(([x, z]) => v.set(x, 2, z, 'leaf'));
  for (let t = 0; t <= 7; t++) { v.set(c + t, 1, c, 'honey'); v.set(c - Math.round(t * 0.5), 1, c + Math.round(t * 0.86), 'honey'); v.set(c - Math.round(t * 0.5), 1, c - Math.round(t * 0.86), 'honey'); }
  ring(v, c, 0, c, 7.2, 8.1, 'woodLight');
}, { react: 'eat' });

D('taco', [13, 9, 8], (v) => {
  for (let x = 1; x <= 11; x++) for (let y = 0; y < 9; y++) for (let z = 0; z < 8; z++) { const d = Math.hypot(y - 7.5, z - 3.5); if (d <= 4.6 && d >= 3.6 && y <= 7) v.set(x, y, z, 'honey'); }
  v.box(2, 5, 2, 10, 7, 5, 'woodRed');
  v.paint((x, y, z, c) => c === P.woodRed && y === 7 ? [P.leaf2, P.red, P.yellow, P.leaf][Math.floor(H(x, z, 2) * 4)] : null);
  for (let x = 2; x <= 10; x += 2) { v.set(x, 8, 2, 'leaf2'); v.set(x + 1, 8, 5, 'leaf2'); }
  surfSpeck(v, 'honey', 'woodLight', 0.12, 3);
}, { react: 'eat' });

D('pølse', [15, 6, 7], (v) => {
  for (let x = 1; x <= 12; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 7; z++) { const d = Math.hypot(y - 2.6, z - 3); if (d <= 3 && !(y >= 2 && Math.abs(z - 3) < 1.4)) v.set(x, y, z, 'woodLight'); }
  v.paint((x, y, z, c) => c === P.woodLight && y === 0 ? P.hay : null);
  for (let x = 0; x <= 14; x++) for (let y = 2; y < 5; y++) for (let z = 2; z <= 4; z++) if (Math.hypot(y - 3, z - 3) <= 1.3 && (x > 0 && x < 14 || (y === 3 && z === 3))) v.set(x, y, z, 'woodRed');
  for (let x = 2; x <= 11; x++) v.set(x, 5, 2 + (x % 3 === 0 ? 0 : x % 3 === 1 ? 1 : 2), 'red');
  for (let x = 3; x <= 12; x += 2) v.set(x, 5, 3 + (x % 4 === 1 ? 1 : -1), 'yellow');
}, { react: 'eat' });

D('smør', [10, 6, 8], (v) => {
  v.box(0, 0, 0, 9, 0, 7, 'sky'); v.box(1, 1, 1, 8, 1, 6, 'sky');
  v.box(2, 2, 2, 7, 4, 5, 'yellow'); v.box(2, 4, 2, 7, 4, 5, 'butter');
  v.box(0, 2, 2, 1, 2, 5, 'silver'); v.set(6, 5, 3, 'butter');
}, { react: 'eat' });

D('pai', [14, 6, 14], (v) => {
  const c = 6.5;
  v.cyl(c, 0, c, 6.8, 1, 'sky'); v.cyl(c, 1, c, 6.4, 3, 'honey'); v.cyl(c, 2, c, 5.4, 2, 'plum');
  ring(v, c, 4, c, 5.4, 6.4, 'woodLight');
  for (let i = 0; i < 14; i += 3) { v.box(i, 4, 1, i, 4, 12, 'hay'); v.box(1, 4, i, 12, 4, i, 'hay'); }
  v.paint((x, y, z, col) => y === 4 && !inC(x, z, c, c, 6) ? 0 : null);
}, { react: 'eat' });

D('iskrem', [12, 14, 12], (v) => {
  // ice-cream sundae in a glass bowl: three scoops, cream, a wafer and a cherry
  v.cyl(5.5, 0, 5.5, 2.4, 1, 'glass'); v.cyl(5.5, 1, 5.5, 1, 2, 'glass');
  for (let y = 3; y <= 6; y++) v.cyl(5.5, y, 5.5, 2.6 + (y - 3) * 0.9, 1, 'glass');
  v.cyl(5.5, 4, 5.5, 2.2 + 0.5, 3, 'pink');
  v.sphere(3.8, 7.6, 5.5, 2.3, 'pink'); v.sphere(7.4, 7.6, 5, 2.3, 'butter'); v.sphere(5.6, 7.8, 7.6, 2.2, 'brown'); v.sphere(5.5, 9.4, 5.2, 2.1, 'mint');
  v.ellipsoid(5.5, 11, 5.5, 1.6, 1.1, 1.6, 'milk'); v.set(5, 12, 5, 'white');
  v.set(5, 13, 5, 'red'); v.set(6, 13, 5, 'red'); v.set(5, 13, 6, 'cherry'); v.line(6, 13, 5, 7, 13, 3, 'leafDark');
  v.box(8, 9, 3, 8, 12, 4, 'honey'); v.box(9, 10, 3, 9, 12, 4, 'woodLight');
  v.paint((x, y, z, c) => (c === P.mint || c === P.butter) && !v.get(x, y + 1, z) && H(x, z, y) < 0.18 ? ['red', 'sky', 'yellow'][Math.floor(H(z, x, 4) * 3)] : null);
}, { react: 'eat' });
})();
