/* Feslottet – MODELS-2: shop catalogue models (Feboden wear, Dyrebutikken extras, Lekebutikken, Musikkbua, Gavebua) + F.Wear.
   Owner: MODELS-2. Micro-voxels 1/16 m, palette NAMES only, front = +z, origin = bottom centre.
   Model ids follow js/data/catalog.js: w_* (wear), pet_*, toy_*, food_* (in m_food.js), mus_*, gift_*.

   WEAR ANCHORS (all wearables have meta.wear = {anchor, dy}; dy in metres, applied by F.Wear.make):
     'head'  origin goes on the TOP of the head (ch_fairy: (0,1.28,0); F.People.make: anchors.head). Crowns/tiaras sit on it,
             hats sink a little (dy < 0) so the brim rests around the hair.
     'back'  origin goes between the shoulder blades (ch_fairy wing root (0,0.56,-0.19); People anchors.back). Wings: dy = -0.38.
     'body'  origin goes at the waist/belly (ch_fairy body (0,0.45,0.12); People anchors.body). Dresses: dy = -0.42 (hem near the feet).
     'feet'  origin on the ground between the feet (shoes as a pair).
     'hand'  origin in the hand (wands: grip at the origin).          'neck' origin at the throat (necklaces, scarves).
   F.Wear.make(id, opts) -> Group whose origin is the anchor point (child = the VOX model shifted by meta.wear.dy).
   F.Wear.anchor(id) -> 'head'|'back'|'body'|'feet'|'hand'|'neck'|null.   Wings have parts wingL/wingR (flap = rotation.y).
   F.Wear.fairyOpts(catalogId) -> the matching ch_fairy option patch ({dress:'ball'} / {wings:'gull'} / {head:'tiara'} / {shoes} / {wand})
   so the fairy avatar (MODELS-3 ch_fairy) can show bought wear natively.
   WAVE 2 meta hints on every MODELS-2 def (set in flushSoft): meta.variants {c:[…]} on every colourable model (VOX.make(id,{variant:'rand'}));
   meta.showRy = 0.6 on long models (depth > 1.3 × width: animals, vehicles, skis …) – spawn/shelf code may use it as the display yaw
   (th ry) so the silhouette reads instead of a head-on view.
   IDS: w_sommerkjole w_ballkjole w_stjernekjole w_regnbuekjole w_blomsterkjole w_boblekjole w_sommerfuglvinger w_glittervinger
     w_regnbuevinger w_krystallvinger w_gullvinger w_blomsterkrans w_tiara w_litenkrone w_solhatt w_glittersko w_rosasko w_stjernestav
     w_hjertestav w_månestav pet_dyrekurv pet_godbiter toy_hoppetau toy_såpebobler toy_sparkesykkel toy_rulleskøyter mus_xylofon
     gift_tøfler gift_kongehatt gift_lesebriller gift_perlekjede gift_hagehansker gift_bein gift_garnnøste gift_kokkelue gift_vannkanne
   SOFT FALLBACKS (bottom of file; defined at DOMContentLoaded/boot ONLY if no other package defined the id): household castables
     (møbler: stol seng bord sofa benk teppe peis hylle skap pute dyne trone krakk gardin vugge; ting: bok lys kopp kam lim lås klokke vase
     kurv krus skål glass flaske kanne skje gaffel brev kart globus nøkkel lykt kamera saks pensel blyant bøtte spade eske pose såpe børste
     stige bilde; bjelle radio huske sklie), stall goods skjell krystall, and nature/building words (sol sky måne rose lilje plante kaktus
     palme kongle blad fjær pinne frø dam mur tak dør vindu port trapp telt hytte låve tårn slott). Word ids that MODELS-3 draws under a
     prefixed id are aliased (tre→n_tre, blomst→n_blomst, hus→v_hus, bro→v_bro, … see WORD_ALIAS). F.M2.flushSoft() forces it. */
(function () {
'use strict';
const F = window.F, V = F.VOX, P = F.PAL, H = F.U.hash2;
const D = (id, size, build, meta, extra) => V.def(id, Object.assign({ size, scale: 1 / 16, build, meta: Object.assign({ by: 'models2' }, meta || {}) }, extra || {}));
const pick = (o, k, d) => (o && o[k] != null ? o[k] : d);
// lazy alias: the source def may be defined by a file that loads later (m_food / m_toys_clothes) – resolve at build time
const alias = (id, src, size, fixed, meta) => D(id, size, (v, o) => { const s = V.defs[src]; if (s) s.build(v, Object.assign({}, fixed, o)); }, Object.assign({ alias: src }, meta || {}));
const inC = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.25;
function ring(v, cx, y, cz, r0, r1, c, h) { for (let yy = y; yy < y + (h || 1); yy++) for (let z = 0; z < v.size[2]; z++) for (let x = 0; x < v.size[0]; x++) if (inC(x, z, cx, cz, r1) && !inC(x, z, cx, cz, r0)) v.set(x, yy, z, c); }
const exposed = (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1) || !v.get(x, y - 1, z);
function discZ(v, cx, cy, z0, z1, r, c) { for (let z = z0; z <= z1; z++) for (let y = 0; y < v.size[1]; y++) for (let x = 0; x < v.size[0]; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25) v.set(x, y, z, c); }
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

// translucent wing tints, derived from palette names (registered as glass colours)
function glassTint(name, base, k, mix) {
  if (P[name] != null) return;
  const c = new THREE.Color(P[base]).lerp(new THREE.Color(P[mix || 'white']), k); let h = c.getHex();
  const used = new Set(Object.values(P)); while (used.has(h)) h ^= 1;
  P[name] = h; V.GLASS.add(h);
}
glassTint('m2gRose', 'pink', 0.35); glassTint('m2gGold', 'yellow', 0.3); glassTint('m2gLilac', 'lilac', 0.3); glassTint('m2gMint', 'mint', 0.2);
glassTint('m2gSky', 'sky', 0.15); glassTint('m2gPeach', 'peach', 0.1); glassTint('m2gIce', 'crystal', 0.2);

/* ================================================================ F.Wear */
F.Wear = {
  anchor(id) { const d = V.defs[id]; return (d && d.meta && d.meta.wear && d.meta.wear.anchor) || null; },
  make(id, o) {
    const g = new THREE.Group(); g.name = 'wear_' + id;
    const m = V.make(id, o || {}); const w = (V.defs[id].meta || {}).wear || {};
    m.position.y = w.dy || 0; g.add(m); g.userData.model = m; g.userData.parts = m.userData.parts;
    return g;
  },
  // catalogue id -> ch_fairy option patch (MODELS-3 fairy avatar shows these natively)
  fairyOpts(cid) {
    const M = {
      sommerkjole: { dress: 'sommer' }, ballkjole: { dress: 'ball' }, stjernekjole: { dress: 'stjerne' }, regnbuekjole: { dress: 'regnbue' },
      blomsterkjole: { dress: 'blomst' }, boblekjole: { dress: 'boble' },
      sommerfuglvinger: { wings: 'sommerfugl' }, glittervinger: { wings: 'glitter' }, regnbuevinger: { wings: 'regnbue' }, krystallvinger: { wings: 'krystall' }, gullvinger: { wings: 'gull' },
      blomsterkrans: { head: 'blomst' }, tiara: { head: 'tiara' }, litenkrone: { head: 'krone' }, solhatt: { head: 'solhatt' },
      glittersko: { shoes: 'glitter' }, rosasko: { shoes: 'rosa' }, stjernestav: { wand: 'stjerne' }, hjertestav: { wand: 'hjerte' }, 'månestav': { wand: 'maane' },
    };
    return M[cid] || null;
  },
};

/* ================================================================ FEBODEN – dresses (dress family in m_toys_clothes.js) */
const DRESS_META = { group: 'klær', react: 'wear', wear: { anchor: 'body', dy: -0.42 } };
alias('w_sommerkjole', 'dress', [14, 16, 10], { kind: 'sommer', c: 'peach' }, DRESS_META);
alias('w_ballkjole', 'dress', [14, 16, 10], { kind: 'ball' }, DRESS_META);
alias('w_stjernekjole', 'dress', [14, 16, 10], { kind: 'stjerne' }, DRESS_META);
alias('w_regnbuekjole', 'dress', [14, 16, 10], { kind: 'regnbue' }, DRESS_META);
alias('w_blomsterkjole', 'dress', [14, 16, 10], { kind: 'blomst' }, DRESS_META);
alias('w_boblekjole', 'dress', [14, 16, 10], { kind: 'boble' }, DRESS_META);

/* ---------------------------------------------------------- wings: pair, parts wingL (+x) / wingR (−x), root at (12, 6, 1) */
const WC = 12; // centre line x between 11|12 (grid 24 wide)
function wingShape(dx, y) { // dx = distance from centre (≥1), returns 'up'|'lo'|'' and an edge flag
  const up = ((dx - 6) / 5.4) ** 2 + ((y - 11.5) / 5.6) ** 2, lo = ((dx - 4.4) / 3.6) ** 2 + ((y - 3.6) / 3.6) ** 2;
  if (up <= 1) return { k: 'up', e: up > 0.62 };
  if (lo <= 1) return { k: 'lo', e: lo > 0.5 };
  return null;
}
const WING = {
  sommerfugl: (dx, y, s) => s.e ? 'coral' : (dx === 6 || dx === 7) && (y === 13 || y === 14) ? 'plum' : (dx === 4 && y === 4) ? 'white' : s.k === 'up' ? 'orange' : 'yellow',
  glitter: (dx, y, s) => s.e ? 'lilac' : H(dx, y, 9) < 0.16 ? 'glowYellow' : 'm2gLilac',
  regnbue: (dx, y, s) => s.e ? 'white' : ['m2gLilac', 'm2gSky', 'm2gMint', 'm2gGold', 'm2gPeach', 'm2gRose'][Math.max(0, Math.min(5, Math.floor((y - 1) / 2.8)))],
  krystall: (dx, y, s) => s.e ? 'crystal' : (dx + y) % 5 === 0 ? 'white' : 'm2gIce',
  gull: (dx, y, s) => s.e ? 'gold' : H(dx, y, 4) < 0.14 ? 'glowYellow' : 'm2gGold',
};
function wingHalf(v, kind, side) {
  for (let y = 0; y < 18; y++) for (let dx = 1; dx <= 11; dx++) {
    const s = wingShape(dx, y); if (!s) continue;
    const x = side > 0 ? WC - 1 + dx : WC - dx;
    v.set(x, y, 1, WING[kind](dx, y, s));
  }
  // vein from the root
  if (kind === 'sommerfugl' || kind === 'gull' || kind === 'krystall') for (let t = 1; t <= 8; t++) { const x = side > 0 ? WC - 1 + t : WC - t; v.set(x, 6 + Math.round(t * 0.7), 1, kind === 'gull' ? 'gold' : kind === 'krystall' ? 'crystal' : 'woodRed'); }
}
function wingsDef(id, kind) {
  D(id, [24, 18, 3], (v) => { v.box(WC - 1, 5, 0, WC, 7, 2, kind === 'gull' ? 'gold' : 'white'); v.set(WC - 1, 6, 2, 'gem1'); v.set(WC, 6, 2, 'gem1'); },
    { group: 'klær', react: 'wear', wear: { anchor: 'back', dy: -0.38 }, fairy: { wings: kind } },
    { parts: { wingL: { pivot: [WC, 6, 1.5], build(v) { wingHalf(v, kind, 1); } }, wingR: { pivot: [WC, 6, 1.5], build(v) { wingHalf(v, kind, -1); } } } });
}
wingsDef('w_sommerfuglvinger', 'sommerfugl'); wingsDef('w_glittervinger', 'glitter'); wingsDef('w_regnbuevinger', 'regnbue');
wingsDef('w_krystallvinger', 'krystall'); wingsDef('w_gullvinger', 'gull');

/* ---------------------------------------------------------- headwear */
D('w_blomsterkrans', [12, 4, 12], (v) => {
  ring(v, 5.5, 0, 5.5, 4.2, 5.4, 'leaf');
  const cols = ['pink', 'butter', 'white', 'lilac', 'coral', 'sky'];
  for (let a = 0; a < 8; a++) {
    const an = a / 8 * Math.PI * 2, x = Math.round(5.5 + Math.cos(an) * 4.9), z = Math.round(5.5 + Math.sin(an) * 4.9), c = cols[a % cols.length];
    v.set(x, 1, z, 'yellow'); v.set(x + 1, 1, z, c); v.set(x - 1, 1, z, c); v.set(x, 1, z + 1, c); v.set(x, 1, z - 1, c); v.set(x, 2, z, c);
  }
  v.set(5, 0, 11, 'leaf2'); v.set(6, 0, 0, 'leaf2'); v.set(0, 0, 5, 'leaf2');
}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.05 }, fairy: { head: 'blomst' } });
alias('w_tiara', 'tiara', [15, 11, 8], {}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.06 }, fairy: { head: 'tiara' } });
D('w_litenkrone', [10, 8, 10], (v) => {
  ring(v, 4.5, 0, 4.5, 3.4, 4.6, 'gold', 3); ring(v, 4.5, 0, 4.5, 3.4, 4.6, 'honey', 1);
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2, x = Math.round(4.5 + Math.cos(an) * 4.1), z = Math.round(4.5 + Math.sin(an) * 4.1); if (a % 2 === 0) { v.set(x, 3, z, 'gold'); v.set(x, 4, z, 'gold'); v.set(x, 5, z, 'gem1'); } }
  v.set(4, 1, 9, 'gem2'); v.set(5, 1, 9, 'gem2'); v.set(9, 1, 4, 'gem3'); v.set(0, 1, 5, 'gem3'); v.set(4, 1, 0, 'gem2');
  v.cyl(4.5, 0, 4.5, 3.3, 2, 'red'); v.cyl(4.5, 0, 4.5, 3.3, 1, 0); v.cyl(4.5, 2, 4.5, 2.4, 1, 'red'); v.set(4, 3, 4, 'gold'); v.set(5, 3, 5, 'gold');
}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.08 }, fairy: { head: 'krone' } });
D('w_solhatt', [16, 7, 16], (v, o) => {
  v.cyl(7.5, 0, 7.5, 7.8, 1, 'hay'); ring(v, 7.5, 0, 7.5, 7, 7.8, 'honey');
  for (let y = 1; y <= 4; y++) v.cyl(7.5, y, 7.5, 4 - (y > 3 ? 0.8 : 0), 1, 'hay');
  v.cyl(7.5, 1, 7.5, 3, 3, 0); v.cyl(7.5, 4, 7.5, 3.2, 1, 'hay');
  ring(v, 7.5, 1, 7.5, 3.2, 4.1, pick(o, 'c', 'pink'), 2);
  v.paint((x, y, z, c) => c === P.hay && (x + z) % 2 === 0 ? P.butter : null);
  // flower + ribbon tails
  v.set(11, 2, 9, 'yellow'); v.set(12, 2, 9, 'white'); v.set(10, 2, 9, 'white'); v.set(11, 3, 9, 'white'); v.set(11, 1, 9, 'white'); v.set(11, 2, 10, 'white');
  v.box(4, 0, 11, 4, 1, 13, 'pink'); v.box(5, 0, 12, 5, 0, 14, 'pink');
}, { group: 'klær', react: 'wear', colour: true, wear: { anchor: 'head', dy: -0.18 }, fairy: { head: 'solhatt' }, variants: { c: ['pink', 'sky', 'mint', 'lilac', 'red'] } });

/* ---------------------------------------------------------- shoes (pairs) */
function shoePair(v, c, sole, bling) {
  for (const x0 of [1, 7]) {
    v.box(x0, 0, 1, x0 + 3, 0, 8, sole); v.box(x0, 1, 1, x0 + 3, 2, 8, c); v.box(x0, 3, 1, x0 + 3, 3, 3, c);
    v.box(x0 + 1, 2, 3, x0 + 2, 2, 6, 0); v.box(x0 + 1, 1, 3, x0 + 2, 1, 6, 'cream');
    v.box(x0, 3, 5, x0 + 3, 3, 5, c); v.set(x0 + 1, 2, 8, bling || c); v.set(x0 + 2, 2, 8, bling || c);
    v.set(x0 + 1, 3, 1, 'gold'); v.set(x0 + 2, 3, 1, 'gold');
  }
  if (bling) v.paint((x, y, z, col) => col === P[c] && H(x, y, z) < 0.25 ? P[bling] : null);
}
D('w_glittersko', [12, 5, 10], (v) => shoePair(v, 'gold', 'white', 'glowYellow'), { group: 'klær', react: 'wear', wear: { anchor: 'feet', dy: 0 }, fairy: { shoes: 'glitter' } });
D('w_rosasko', [12, 5, 10], (v) => { shoePair(v, 'pink', 'white'); for (const x0 of [1, 7]) { v.set(x0 + 1, 3, 6, 'rose'); v.set(x0 + 2, 3, 6, 'rose'); v.set(x0 + 1, 4, 6, 'rose'); } },
  { group: 'klær', react: 'wear', wear: { anchor: 'feet', dy: 0 }, fairy: { shoes: 'rosa' } });

/* ---------------------------------------------------------- wands (grip at the origin) */
// 5-point star in the x–y plane (top point up)
function star(v, cx, cy, z0, z1, ro, ri, c) {
  for (let z = z0; z <= z1; z++) for (let y = 0; y < v.size[1]; y++) for (let x = 0; x < v.size[0]; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx) - Math.PI / 2;
    const k = Math.pow((Math.cos(5 * th) + 1) / 2, 2.2); if (d <= ri + (ro - ri) * k + 0.15) v.set(x, y, z, c);
  }
}
F.M2 = Object.assign(F.M2 || {}, { star, heart });
function wand(v, tipFn, stick) {
  v.box(3, 0, 1, 4, 10, 2, stick || 'white'); v.paint((x, y, z, c) => y % 3 === 1 && y <= 10 ? P.gold : null);
  tipFn(v);
}
const WAND = { group: 'klær', react: 'wear', wear: { anchor: 'hand', dy: -0.05 } };
D('w_stjernestav', [9, 21, 4], (v) => wand(v, (v2) => { star(v2, 4, 15, 1, 2, 4.6, 1.9, 'glowYellow'); v2.set(3, 16, 3, 'white'); v2.set(4, 15, 3, 'gold'); }, 'lilac'), Object.assign({ fairy: { wand: 'stjerne' } }, WAND));
D('w_hjertestav', [9, 20, 4], (v) => wand(v, (v2) => { heart(v2, 3.5, 14.2, 1, 2, 3.4, 'gem1'); v2.set(2, 16, 3, 'white'); v2.set(2, 15, 3, 'white'); }, 'pink'), Object.assign({ fairy: { wand: 'hjerte' } }, WAND));
D('w_månestav', [9, 20, 4], (v) => wand(v, (v2) => {
  for (let y = 10; y <= 19; y++) for (let x = 0; x < 9; x++) { const a = Math.hypot(x - 3.6, y - 14.6), b = Math.hypot(x - 5.4, y - 15.6); if (a <= 4.2 && b > 3.2) v2.box(x, y, 1, x, y, 2, 'butter'); }
  v2.set(7, 18, 1, 'glowYellow'); v2.set(7, 12, 2, 'glowYellow'); v2.set(8, 15, 2, 'glowYellow');
}, 'navySoft'), Object.assign({ fairy: { wand: 'maane' } }, WAND));

/* ================================================================ DYREBUTIKKEN extras */
D('pet_dyrekurv', [16, 8, 13], (v) => {
  for (let y = 0; y <= 5; y++) for (let z = 0; z < 13; z++) for (let x = 0; x < 16; x++) { const q = ((x - 7.5) / (7.6 - (5 - y) * 0.15)) ** 2 + ((z - 6) / (6.1 - (5 - y) * 0.15)) ** 2; if (q <= 1 && (y === 0 || q > 0.62)) v.set(x, y, z, (x + y + z) % 2 ? 'woodLight' : 'honey'); }
  for (let z = 0; z < 13; z++) for (let x = 0; x < 16; x++) if ((((x - 7.5) / 7.6) ** 2 + ((z - 6) / 6.1) ** 2) > 0.62 && v.get(x, 5, z) && z > 8 && Math.abs(x - 7.5) < 3) { v.set(x, 5, z, 0); v.set(x, 4, z, 0); }
  v.ellipsoid(7.5, 2, 6, 5.4, 1.6, 4, 'rose'); v.paint((x, y, z, c) => c === P.rose && (x + z) % 4 === 0 ? P.white : null);
  // bone-shaped name sign
  v.box(5, 6, 0, 10, 7, 0, 'white'); v.set(4, 6, 0, 'white'); v.set(4, 7, 0, 'white'); v.set(11, 6, 0, 'white'); v.set(11, 7, 0, 'white');
}, { group: 'dyr', react: 'look' });
D('pet_godbiter', [12, 9, 10], (v) => {
  v.box(2, 0, 2, 9, 7, 7, 'sky'); v.box(3, 8, 3, 8, 8, 6, 'sky'); v.box(2, 7, 2, 9, 7, 7, 'white');
  v.box(3, 2, 8, 8, 5, 8, 'white'); v.box(4, 3, 8, 7, 4, 8, 'woodLight'); v.set(3, 3, 8, 'woodLight'); v.set(3, 4, 8, 'woodLight'); v.set(8, 3, 8, 'woodLight'); v.set(8, 4, 8, 'woodLight');
  // loose bone biscuits
  for (const [x, z] of [[0, 1], [9, 8], [1, 8]]) { v.box(x, 0, z, x + 2, 0, z, 'woodLight'); v.set(x, 0, z + 1, 'woodLight'); v.set(x + 2, 0, z + 1, 'woodLight'); }
}, { group: 'dyr', react: 'eat' });

/* ================================================================ LEKEBUTIKKEN */
D('toy_hoppetau', [14, 8, 13], (v, o) => {
  const c = pick(o, 'c', 'pink');
  for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 2; v.set(Math.round(6.5 + Math.cos(t) * 5.2), i % 2 ? 0 : 1, Math.round(6 + Math.sin(t) * 4.6), i % 6 < 3 ? 'white' : 'red'); }
  for (const [x, z] of [[1, 10], [11, 10]]) { v.box(x, 0, z, x + 1, 5, z + 1, c); v.box(x, 6, z, x + 1, 6, z + 1, 'white'); v.box(x, 0, z, x + 1, 0, z + 1, 'white'); }
}, { group: 'leker', react: 'play', colour: true, variants: { c: ['pink', 'sky', 'mint', 'yellow', 'purple'] } });
D('toy_såpebobler', [14, 16, 12], (v, o) => {
  v.cyl(4, 0, 6, 2.6, 7, pick(o, 'c', 'sky')); v.cyl(4, 7, 6, 1.6, 2, 'pink'); v.cyl(4, 0, 6, 2.65, 1, 'pink'); v.box(2, 3, 8, 6, 4, 9, 'white'); v.set(4, 3, 9, 'gem1');
  v.line(5, 8, 6, 8, 12, 6, 'pink'); for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; v.set(Math.round(9 + Math.cos(t) * 1.6), Math.round(13 + Math.sin(t) * 1.6), 6, 'pink'); }
  const bub = (x, y, z, r) => { v.sphere(x, y, z, r, 'glass'); v.sphere(x, y, z, r - 1, 0); v.set(Math.round(x - r * 0.5), Math.round(y + r * 0.5), Math.round(z + r * 0.6), 'white'); };
  bub(11, 6, 5, 2.4); bub(12, 11, 9, 1.6); bub(8, 3, 9, 1.5);
}, { group: 'leker', react: 'play', colour: true, variants: { c: ['sky', 'mint', 'yellow', 'lilac'] } });
D('toy_sparkesykkel', [8, 17, 18], (v, o) => {
  const c = pick(o, 'c', 'mint');
  v.box(2, 1, 3, 5, 2, 13, c); v.box(2, 2, 3, 5, 2, 12, c === 'mint' ? 'teal' : c);
  for (const z of [3, 15]) { for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; v.set(3, Math.round(1.6 + Math.sin(t) * 1.6), Math.round(z + Math.cos(t) * 1.6), 'black'); v.set(4, Math.round(1.6 + Math.sin(t) * 1.6), Math.round(z + Math.cos(t) * 1.6), 'black'); } v.box(3, 1, z, 4, 2, z, 'pink'); }
  v.line(3, 2, 14, 3, 15, 13, 'silver'); v.line(4, 2, 14, 4, 15, 13, 'silver'); v.box(0, 15, 13, 7, 15, 13, 'silver'); v.box(0, 15, 13, 1, 15, 13, 'pink'); v.box(6, 15, 13, 7, 15, 13, 'pink');
  v.box(2, 3, 13, 5, 4, 14, c); v.set(1, 16, 13, 'rose'); v.set(6, 16, 13, 'rose'); v.set(3, 12, 14, 'glowYellow');
}, { group: 'leker', react: 'ride', ride: 1.3, colour: true, variants: { c: ['mint', 'pink', 'sky', 'red', 'purple'] } });
D('toy_rulleskøyter', [12, 10, 11], (v, o) => {
  const c = pick(o, 'c', 'pink');
  for (const x0 of [1, 7]) {
    v.box(x0, 2, 1, x0 + 3, 3, 9, 'white'); v.box(x0, 4, 1, x0 + 3, 9, 4, 'white'); v.box(x0 + 1, 5, 2, x0 + 2, 9, 3, 0); v.box(x0, 4, 5, x0 + 3, 6, 8, 'white');
    v.box(x0, 8, 1, x0 + 3, 9, 4, c); v.box(x0, 5, 7, x0 + 3, 5, 7, c); v.box(x0 + 1, 3, 9, x0 + 2, 3, 10, 'rose');
    for (const z of [2, 7]) { v.box(x0, 0, z, x0, 1, z + 1, 'mint'); v.box(x0 + 3, 0, z, x0 + 3, 1, z + 1, 'mint'); }
  }
}, { group: 'leker', react: 'ride', ride: 1.2, colour: true, variants: { c: ['pink', 'sky', 'purple', 'mint'] } });

/* ================================================================ MUSIKKBUA */
D('mus_xylofon', [18, 8, 12], (v) => {
  const cols = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
  v.box(0, 0, 1, 17, 1, 2, 'woodLight'); v.box(0, 0, 8, 17, 1, 9, 'woodLight'); v.set(0, 2, 1, 'woodDark'); v.set(17, 2, 1, 'woodDark');
  for (let i = 0; i < 8; i++) { const x = 1 + i * 2, len = 9 - Math.floor(i / 2); const z0 = Math.round(5.5 - len / 2); v.box(x, 2, z0, x, 2, z0 + len, cols[i]); v.set(x, 3, z0 + 1, 'silver'); v.set(x, 3, z0 + len - 1, 'silver'); }
  for (const [x0, z0] of [[3, 10], [9, 11]]) { v.line(x0, 3, z0, x0 + 5, 3, z0 + 0, 'woodLight'); v.box(x0 + 5, 3, z0, x0 + 6, 4, z0, 'red'); }
}, { group: 'musikk', react: 'play' });

/* ================================================================ GAVEBUA */
D('gift_tøfler', [12, 6, 11], (v) => {
  for (const x0 of [1, 7]) {
    v.box(x0, 0, 1, x0 + 3, 0, 9, 'gold'); v.box(x0, 1, 4, x0 + 3, 3, 9, 'red'); v.box(x0 + 1, 2, 4, x0 + 2, 3, 6, 0); v.box(x0, 1, 1, x0 + 3, 1, 3, 'red');
    v.box(x0, 1, 1, x0 + 3, 1, 1, 'gold'); v.set(x0 + 1, 3, 9, 'gold'); v.set(x0 + 2, 3, 9, 'gold'); v.set(x0 + 1, 4, 8, 'gold'); v.set(x0 + 2, 4, 8, 'gold'); v.set(x0 + 1, 4, 9, 'gem2');
    v.box(x0, 1, 9, x0 + 3, 2, 9, 'white');
  }
}, { group: 'klær', react: 'wear', wear: { anchor: 'feet', dy: 0 } });
D('gift_kongehatt', [12, 12, 12], (v) => {
  v.cyl(5.5, 0, 5.5, 5.2, 2, 'white'); v.paint((x, y, z, c) => (x + z + y) % 3 === 0 ? P.black : null);
  for (let y = 2; y <= 8; y++) v.cyl(5.5, y, 5.5, 4.6 + (y > 5 ? 0.4 : 0), 1, 'red'); v.ellipsoid(5.5, 8, 5.5, 5, 2.4, 5, 'red');
  for (let a = 0; a < 5; a++) { const an = a / 5 * Math.PI * 2, x = Math.round(5.5 + Math.cos(an) * 4.4), z = Math.round(5.5 + Math.sin(an) * 4.4); v.box(x, 2, z, x, 6, z, 'gold'); }
  v.sphere(5.5, 10.6, 5.5, 1.3, 'gold'); v.set(5, 11, 5, 'gem1');
}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.12 } });
D('gift_lesebriller', [14, 5, 7], (v) => {
  for (const cx of [3.5, 9.5]) { for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; v.set(Math.round(cx + Math.cos(t) * 2.6), Math.round(2.4 + Math.sin(t) * 2), 5, 'plum'); } discZ(v, cx, 2.4, 5, 5, 1.6, 'glass'); }
  v.box(6, 3, 5, 7, 3, 5, 'plum'); v.box(0, 3, 0, 0, 3, 5, 'plum'); v.box(13, 3, 0, 13, 3, 5, 'plum'); v.set(0, 2, 0, 'plum'); v.set(13, 2, 0, 'plum');
}, { group: 'klær', react: 'wear', wear: { anchor: 'face', dy: -0.15 } });
alias('gift_perlekjede', 'kjede', [11, 13, 3], {}, { group: 'klær', react: 'wear', wear: { anchor: 'neck', dy: -0.5 } });
D('gift_hagehansker', [14, 4, 12], (v) => {
  for (const [x0, flip] of [[1, 0], [8, 1]]) {
    v.box(x0, 0, 1, x0 + 4, 1, 6, 'green'); v.box(x0, 0, 7, x0 + 4, 1, 9, 'leaf2');
    for (let f = 0; f < 4; f++) v.box(x0 + f + (f > 1 ? 1 : 0) - (f > 2 ? 1 : 0), 0, 7, x0 + f, 1, 9 + (f === 1 || f === 2 ? 1 : 0), 'leaf2');
    v.box(flip ? x0 + 5 : x0 - 1, 0, 5, flip ? x0 + 5 : x0 - 1, 1, 7, 'leaf2');
    v.set(x0 + 2, 2, 3, 'pink'); v.set(x0 + 1, 2, 3, 'white'); v.set(x0 + 3, 2, 3, 'white'); v.set(x0 + 2, 2, 4, 'white'); v.set(x0 + 2, 2, 2, 'white');
  }
}, { group: 'klær', react: 'wear', wear: { anchor: 'hand', dy: -0.08 } });
D('gift_bein', [14, 5, 6], (v) => {
  v.box(3, 1, 2, 10, 3, 3, 'cream'); for (const x of [2, 11]) { v.sphere(x, 2, 1.5, 1.6, 'cream'); v.sphere(x, 2, 3.8, 1.6, 'cream'); }
  v.box(4, 0, 4, 9, 0, 5, 'red'); v.set(6, 1, 5, 'red'); v.set(7, 1, 5, 'red');
}, { group: 'dyr', react: 'eat' });
D('gift_garnnøste', [12, 13, 11], (v) => {
  v.sphere(5, 4.6, 5, 4.4, 'lavender');
  v.paint((x, y, z, c) => c === P.lavender && ((x + y) % 3 === 0 || (y - z + 30) % 4 === 0) ? P.lilac : null);
  v.line(9, 1, 7, 11, 0, 10, 'lavender'); v.set(11, 0, 9, 'lavender');
  v.line(2, 6, 5, 9, 12, 5, 'silver'); v.line(3, 7, 7, 10, 11, 9, 'silver'); v.set(9, 12, 5, 'pink'); v.set(10, 11, 9, 'pink');
}, { group: 'leker', react: 'play' });
D('gift_kokkelue', [12, 14, 12], (v) => {
  v.cyl(5.5, 0, 5.5, 4.2, 5, 'white'); v.cyl(5.5, 0, 5.5, 3.2, 4, 0);
  for (const [x, z] of [[3.5, 3.5], [7.5, 3.5], [3.5, 7.5], [7.5, 7.5], [5.5, 5.5]]) v.sphere(x, 8.6, z, 3, 'white');
  v.paint((x, y, z, c) => c === P.white && y >= 6 && H(x, y, z) < 0.15 ? P.milk : null);
  ring(v, 5.5, 1, 5.5, 3.3, 4.25, 'cream', 1);
}, { group: 'klær', react: 'wear', wear: { anchor: 'head', dy: -0.2 } });
D('gift_vannkanne', [16, 12, 9], (v) => {
  v.cyl(6, 0, 4.5, 3.8, 8, 'teal'); v.cyl(6, 8, 4.5, 3.2, 1, 'teal'); v.cyl(6, 8, 4.5, 2.2, 1, 0);
  v.line(9, 2, 4, 14, 8, 4, 'teal'); v.line(9, 3, 5, 14, 9, 5, 'teal'); v.box(14, 8, 3, 15, 10, 6, 'silver');
  v.box(1, 3, 4, 1, 8, 5, 'teal'); v.box(2, 9, 4, 6, 10, 5, 'teal'); v.box(1, 8, 4, 2, 9, 5, 'teal');
  v.set(15, 11, 4, 'water'); v.set(15, 11, 5, 'sky');
  v.box(4, 3, 8, 7, 5, 8, 'white'); v.set(5, 4, 9, 'pink'); v.set(6, 4, 9, 'yellow');
}, { group: 'ting', react: 'play' });

/* ================================================================ SOFT DEFS – household castables (møbler / ting / a few leker)
   Defined only if no other package defines the same id (checked after every script has loaded: DOMContentLoaded / boot).
   So MODELS-1/3 may define e.g. 'stol' themselves and theirs wins; otherwise these guarantee every castable word has a model. */
const SOFT = [];
const soft = (id, size, build, meta, extra) => SOFT.push([id, size, build, Object.assign({ soft: true }, meta || {}), extra]);
// castable word -> another package's model (MODELS-3 uses prefixed ids); used only when nobody defined the word id itself
const WORD_ALIAS = { tre: ['n_tre', 'n_tre_rund'], blomst: ['n_blomst', 'n_blomster'], stein: ['n_stein'], sopp: ['n_sopp'], busk: ['n_busk'], gress: ['n_gress'],
  'kløver': ['n_firklover', 'n_klover'], hus: ['v_hus'], bro: ['v_bro'], gjerde: ['v_gjerde'], 'brønn': ['v_bronn', 'p_bronn'], 'mølle': ['n_molle'], skilt: ['v_veiskilt'],
  bod: ['v_markedsbod', 'p_bod'], krans: ['w_blomsterkrans'], 'snø': ['n_snohaug', 'n_snomann'], sand: ['n_sandslott'] };
function flushSoft() {
  // aliases declared with a guessed size: adopt the source's real size once every file has loaded
  for (const id in V.defs) { const d = V.defs[id], a = d.meta && d.meta.by === 'models2' && d.meta.alias; if (a && V.defs[a] && !d.meta.soft) d.size = V.defs[a].size.slice(); }
  for (const w in WORD_ALIAS) { if (V.has(w)) continue; const t = WORD_ALIAS[w].find(id => V.has(id)); if (!t) continue; const d = V.defs[t];
    V.def(w, { size: d.size, scale: d.scale, build: d.build, parts: d.parts, meta: Object.assign({}, d.meta || {}, { alias: t, soft: true }) }); }
  for (const a of SOFT.splice(0)) if (!V.has(a[0])) D(...a);
  for (const id in V.defs) { const d = V.defs[id], m = d.meta; if (!m || m.by !== 'models2') continue;
    if (m.colour && !m.variants && !m.alias) m.variants = { c: KID_COLS.slice() };
    // display hint: long models (animals, vehicles, skis …) read far better turned ~35° than straight at the camera (front = +z)
    if (m.showRy == null && d.size && d.size[2] > d.size[0] * 1.3 && !m.wear) m.showRy = 0.6; }
}
const KID_COLS = ['red', 'blue', 'yellow', 'green', 'purple', 'pink'];  // the reading colours (F.WORDS.COLOURS) that read well on a model
const C = (o, d) => pick(o, 'c', d);
function frontZ(v, x, y) { for (let z = v.size[2] - 1; z >= 0; z--) if (v.get(x, y, z)) return z; return -1; }

/* ---------- møbler */
soft('stol', [12, 18, 12], (v, o) => {
  for (const [x, z] of [[1, 1], [9, 1], [1, 9], [9, 9]]) v.box(x, 0, z, x + 1, 7, z + 1, 'woodDark');
  v.box(0, 8, 0, 11, 9, 11, 'wood'); v.box(1, 10, 2, 10, 10, 10, C(o, 'rose'));
  v.box(0, 10, 0, 1, 17, 1, 'wood'); v.box(10, 10, 0, 11, 17, 1, 'wood'); v.box(0, 16, 0, 11, 17, 1, 'wood'); v.box(2, 11, 0, 9, 15, 1, C(o, 'rose'));
  v.set(4, 13, 2, 'white'); v.set(7, 13, 2, 'white');
}, { group: 'møbler', colour: true, react: 'sit' });
soft('seng', [16, 13, 26], (v, o) => {
  const c = C(o, 'sky');
  for (const [x, z] of [[0, 0], [15, 0], [0, 25], [15, 25]]) v.box(x, 0, z, x, 4, z, 'woodDark');
  v.box(0, 2, 0, 15, 3, 25, 'wood'); v.box(1, 4, 1, 14, 5, 24, 'white');
  v.box(0, 4, 0, 15, 12, 1, 'wood'); v.box(1, 6, 0, 14, 11, 0, 'woodLight'); heart(v, 7.5, 8.4, 1, 1, 2.2, 'rose');
  v.box(0, 4, 25, 15, 8, 25, 'wood');
  v.box(2, 6, 2, 13, 7, 6, 'white'); v.box(3, 8, 3, 12, 8, 5, 'white');
  v.box(0, 6, 8, 15, 7, 24, c); v.box(1, 8, 8, 14, 8, 23, c); v.box(0, 3, 8, 0, 6, 24, c); v.box(15, 3, 8, 15, 6, 24, c);
  v.paint((x, y, z, col) => col === P[c] && (x + z) % 4 === 0 && y === 8 ? P.white : null); v.box(1, 8, 8, 14, 8, 9, 'white');
}, { group: 'møbler', colour: true, react: 'sit' });
soft('bord', [18, 12, 14], (v, o) => {
  for (const [x, z] of [[1, 1], [15, 1], [1, 11], [15, 11]]) v.box(x, 0, z, x + 1, 9, z + 1, 'woodDark');
  v.box(0, 10, 0, 17, 11, 13, 'wood'); v.box(0, 11, 0, 17, 11, 13, 'woodLight');
  v.box(2, 8, 2, 15, 9, 2, 'wood'); v.box(2, 8, 11, 15, 9, 11, 'wood');
  v.box(6, 11, 4, 11, 11, 9, C(o, 'white')); v.paint((x, y, z, col) => y === 11 && x >= 6 && x <= 11 && z >= 4 && z <= 9 && (x + z) % 2 ? P.red : null);
}, { group: 'møbler', colour: true, react: 'look' });
soft('sofa', [24, 13, 12], (v, o) => {
  const c = C(o, 'rose');
  v.box(1, 0, 1, 22, 1, 10, 'woodDark'); v.box(0, 2, 1, 23, 5, 10, c); v.box(0, 6, 1, 23, 12, 3, c);
  v.box(0, 6, 1, 2, 9, 10, c); v.box(21, 6, 1, 23, 9, 10, c);
  v.box(3, 6, 4, 11, 7, 10, c); v.box(12, 6, 4, 20, 7, 10, c); v.box(3, 6, 4, 20, 6, 10, c);
  v.paint((x, y, z, col) => col === P[c] && (x === 11 || x === 12) && y >= 6 && y <= 7 && z >= 4 ? P.white : null);
  v.box(4, 8, 4, 7, 11, 5, 'butter'); v.box(16, 8, 4, 19, 11, 5, 'mint');
  for (const x of [1, 22]) v.box(x, 0, 1, x, 0, 2, 'woodDark');
}, { group: 'møbler', colour: true, react: 'sit' });
soft('benk', [20, 12, 10], (v) => {
  for (const x of [1, 17]) { v.box(x, 0, 2, x + 1, 5, 3, 'navySoft'); v.box(x, 0, 7, x + 1, 5, 8, 'navySoft'); v.box(x, 5, 2, x + 1, 5, 8, 'navySoft'); v.box(x, 6, 1, x + 1, 11, 1, 'navySoft'); }
  for (const z of [2, 4, 6, 8]) v.box(0, 6, z, 19, 6, z, 'woodLight');
  for (const y of [8, 10]) v.box(0, y, 0, 19, y, 0, 'woodLight');
  v.paint((x, y, z, c) => c === P.woodLight && x % 6 === 0 ? P.wood : null);
}, { group: 'møbler', react: 'sit' });
soft('teppe', [18, 6, 16], (v, o) => {
  // a soft rug rolled out on the floor: patterned middle, border, fringe at both ends, the far end still rolled up
  const c = C(o, 'red');
  v.box(1, 0, 1, 16, 0, 13, c);
  v.paint((x, y, z, col) => y === 0 && col === P[c] && (x === 2 || x === 15 || z === 2 || z === 12) ? P.cream : y === 0 && col === P[c] && x > 3 && x < 14 && z > 3 && z < 11 && (Math.abs(x - 8.5) + Math.abs(z - 7) * 1.2) % 4 < 1.2 ? P.yellow : null);
  for (let x = 1; x <= 16; x += 2) v.set(x, 0, 14, 'cream');
  for (let x = 1; x <= 16; x++) { v.box(x, 1, 0, x, 4, 2, c); v.box(x, 2, 1, x, 3, 1, x % 3 ? 'cream' : 'yellow'); }
  for (let x = 1; x <= 16; x += 2) v.set(x, 0, 0, 'cream');
}, { group: 'møbler', colour: true, react: 'warm' });
soft('peis', [20, 20, 9], (v) => {
  v.box(0, 0, 0, 19, 16, 5, 'brick'); v.paint((x, y, z, c) => (y % 3 === 0) || ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) ? P.stone2 : null);
  v.box(5, 1, 3, 14, 10, 5, 0); v.box(5, 1, 0, 14, 1, 5, 'stoneDark');
  v.box(0, 17, 0, 19, 18, 7, 'woodDark'); v.box(0, 0, 6, 19, 1, 8, 'stone');
  v.box(7, 2, 3, 12, 3, 4, 'woodDark'); v.box(6, 2, 4, 13, 2, 4, 'wood');
  v.ellipsoid(9.5, 4, 3.6, 2.6, 3.4, 1.2, 'flame'); v.ellipsoid(9.5, 3.5, 3.6, 1.6, 2, 1, 'glowYellow'); v.set(8, 7, 3, 'orange'); v.set(11, 6, 4, 'orange');
  v.box(3, 19, 2, 4, 19, 3, 'gold'); v.box(15, 19, 2, 16, 19, 3, 'gold'); v.set(3, 19, 1, 'flame');
}, { group: 'møbler', react: 'warm' });
soft('hylle', [16, 18, 6], (v) => {
  v.box(0, 0, 0, 15, 17, 1, 'woodLight'); v.box(0, 0, 0, 0, 17, 5, 'wood'); v.box(15, 0, 0, 15, 17, 5, 'wood');
  for (const y of [0, 6, 12, 17]) v.box(0, y, 0, 15, y, 5, 'wood');
  const cols = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'teal', 'pink'];
  for (let i = 0; i < 6; i++) { const h = 3 + (i % 3); v.box(1 + i, 1, 2, 1 + i, h, 4, cols[i]); }
  v.box(9, 1, 2, 13, 2, 4, 'navySoft'); v.cyl(11, 7, 3, 1.5, 3, 'sky'); v.set(11, 10, 3, 'leaf'); v.set(10, 11, 3, 'pink');
  for (let i = 0; i < 4; i++) v.box(2 + i, 7, 2, 2 + i, 10 - (i % 2), 4, cols[(i + 3) % 8]);
  v.sphere(6, 14.5, 3, 1.6, 'gold');
}, { group: 'møbler', react: 'look' });
soft('skap', [14, 22, 9], (v) => {
  v.box(0, 0, 0, 13, 20, 7, 'woodLight'); v.box(0, 21, 0, 13, 21, 8, 'wood'); v.box(0, 0, 0, 13, 0, 8, 'wood');
  v.box(6, 1, 8, 7, 20, 8, 'wood'); v.set(5, 10, 8, 'gold'); v.set(8, 10, 8, 'gold');
  for (const x0 of [1, 8]) { v.box(x0, 12, 8, x0 + 4, 19, 8, 'woodRed'); v.box(x0, 2, 8, x0 + 4, 9, 8, 'woodRed'); }
}, { group: 'møbler', react: 'look' }, { parts: {} });
soft('pute', [12, 5, 12], (v, o) => {
  const c = C(o, 'pink');
  for (let y = 0; y < 5; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) { const dx = Math.abs(x - 5.5), dz = Math.abs(z - 5.5), h = 2.4 * (1 - Math.max(dx, dz) / 6.2) + 0.8; if (dx <= 5.2 && dz <= 5.2 && Math.abs(y - 1.9) <= h) v.set(x, y, z, c); }
  for (const [x, z] of [[0, 0], [11, 0], [0, 11], [11, 11]]) v.set(x, 2, z, 'gold');
  v.set(5, 4, 5, 'white'); v.set(6, 4, 6, 'white'); v.set(5, 4, 6, 'white'); v.set(6, 4, 5, 'white');
  v.paint((x, y, z, col) => col === P[c] && y === 3 && (x === 5 || x === 6 || z === 5 || z === 6) ? P.white : null);
}, { group: 'møbler', colour: true, react: 'sit' });
soft('dyne', [16, 7, 13], (v, o) => {
  const c = C(o, 'sky');
  v.box(0, 0, 0, 15, 2, 12, c); v.box(1, 3, 1, 14, 4, 11, c); v.box(2, 5, 2, 13, 5, 10, c);
  v.paint((x, y, z, col) => col === P[c] && (x * 3 + z * 5 + y) % 7 === 0 ? P.white : null);
  v.box(0, 2, 0, 15, 2, 12, 'white'); v.box(1, 4, 1, 14, 4, 11, 'white'); v.paint((x, y, z, col) => col === P.white && (y === 2 || y === 4) && !(x === 0 || x === 15 || z === 0 || z === 12 || x === 1 || x === 14 || z === 1 || z === 11) ? P[c] : null);
}, { group: 'møbler', colour: true, react: 'warm' });
soft('trone', [16, 26, 13], (v) => {
  v.box(1, 0, 1, 14, 2, 12, 'gold'); v.box(2, 3, 2, 13, 7, 12, 'gold'); v.box(3, 8, 3, 12, 9, 12, 'red');
  v.box(1, 3, 1, 14, 22, 3, 'gold'); v.box(3, 8, 3, 12, 20, 3, 'red'); v.box(1, 8, 4, 2, 12, 12, 'gold'); v.box(13, 8, 4, 14, 12, 12, 'gold');
  v.box(5, 23, 1, 10, 23, 3, 'gold'); v.box(6, 24, 2, 9, 24, 2, 'gold'); v.set(7, 25, 2, 'gem1'); v.set(8, 25, 2, 'gem1');
  for (const x of [1, 14]) { v.set(x, 23, 2, 'gem2'); v.set(x, 13, 12, 'gem2'); }
  heart(v, 7.5, 15, 4, 4, 2.2, 'gold'); v.set(7, 15, 5, 'gem1'); v.set(8, 15, 5, 'gem1');
}, { group: 'møbler', react: 'sit' });
soft('krakk', [9, 9, 9], (v) => {
  for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6]]) v.box(x, 0, z, x + 1, 6, z + 1, 'woodDark');
  v.cyl(4, 7, 4, 4.2, 2, 'wood'); v.cyl(4, 8, 4, 3.3, 1, 'woodLight'); v.box(2, 3, 2, 6, 3, 2, 'woodDark'); v.box(2, 3, 6, 6, 3, 6, 'woodDark');
}, { group: 'møbler', react: 'sit' });
soft('gardin', [18, 22, 4], (v, o) => {
  const c = C(o, 'rose');
  v.box(0, 21, 1, 17, 21, 1, 'gold'); v.set(0, 21, 1, 'gem1'); v.set(17, 21, 1, 'gem1');
  for (const [x0, x1, dir] of [[1, 7, 1], [10, 16, -1]]) for (let y = 0; y <= 20; y++) { const pull = y < 9 && y > 5 ? 2 : 0; for (let x = x0; x <= x1; x++) { if (dir > 0 && x > x1 - pull) continue; if (dir < 0 && x < x0 + pull) continue; v.set(x, y, 1 + ((x + (dir > 0 ? 0 : 1)) % 2), c); } }
  v.box(4, 7, 3, 6, 7, 3, 'gold'); v.box(11, 7, 3, 13, 7, 3, 'gold');
  v.paint((x, y, z, col) => col === P[c] && y === 0 ? P.white : null);
}, { group: 'møbler', colour: true, react: 'look' });
soft('vugge', [14, 14, 18], (v) => {
  for (let x = 0; x < 14; x++) for (let z = 0; z < 18; z++) for (let y = 0; y < 3; y++) { const r = Math.hypot((z - 8.5) / 9, (y - 6) / 6.4); if (r <= 1 && r > 0.8 && (x === 1 || x === 12)) v.set(x, y, z, 'woodDark'); }
  v.box(1, 3, 2, 12, 8, 15, 'woodLight'); v.box(2, 5, 3, 11, 8, 14, 0); v.box(2, 5, 3, 11, 5, 14, 'white');
  v.box(1, 9, 2, 12, 13, 3, 'woodLight'); heart(v, 6.5, 11, 3, 3, 1.6, 'pink');
  v.box(3, 6, 4, 10, 6, 13, 'mint'); v.box(3, 7, 9, 10, 7, 13, 'mint'); v.paint((x, y, z, c) => c === P.mint && (x + z) % 3 === 0 ? P.white : null);
  v.box(5, 6, 4, 8, 7, 6, 'white');
}, { group: 'møbler', react: 'sit' });

/* ---------- ting */
soft('bok', [14, 6, 11], (v, o) => {
  const c = C(o, 'red');
  // open book: cover + two curved page blocks, a coloured picture on the right page
  v.box(0, 0, 0, 13, 0, 10, c);
  for (let x = 1; x <= 12; x++) { const h = 1 + Math.round(2.4 * Math.sin(Math.PI * ((x <= 6 ? x - 1 : x - 7) + 0.5) / 6)); v.box(x, 1, 1, x, h, 9, 'white'); }
  v.box(6, 1, 1, 7, 1, 9, 'cream2');
  for (const z of [3, 5, 7]) for (let x = 2; x <= 5; x++) v.set(x, frontZ(v, x, 0) >= 0 ? 0 : 0, z, null);
  v.paint((x, y, z, col) => col === P.white && !v.get(x, y + 1, z) && x <= 5 && x >= 2 && (z === 3 || z === 5 || z === 7) ? P.grey : null);
  v.paint((x, y, z, col) => col === P.white && !v.get(x, y + 1, z) && x >= 8 && x <= 11 && z >= 3 && z <= 7 ? (z <= 4 ? P.sky : z === 5 && x === 10 ? P.yellow : P.grass) : null);
  v.box(6, 2, 10, 7, 2, 10, 'rose');
}, { group: 'ting', colour: true, react: 'look' });
soft('lys', [7, 13, 7], (v) => {
  v.cyl(3, 0, 3, 3.2, 1, 'gold'); v.cyl(3, 1, 3, 1.6, 1, 'gold');
  v.cyl(3, 2, 3, 1.7, 7, 'white'); v.set(1, 8, 3, 'cream'); v.set(1, 7, 3, 'cream'); v.set(5, 8, 3, 'cream');
  v.set(3, 9, 3, 'black'); v.set(3, 10, 3, 'flame'); v.set(3, 11, 3, 'glowYellow'); v.set(3, 12, 3, 'glowYellow');
  v.box(5, 1, 3, 6, 2, 3, 'gold');
}, { group: 'ting', react: 'light' });
soft('kopp', [12, 8, 10], (v, o) => {
  const c = C(o, 'sky');
  v.cyl(5, 0, 5, 5.2, 1, 'white'); ring(v, 5, 0, 5, 4.3, 5.2, c);
  v.cyl(5, 1, 5, 3.3, 6, c); v.cyl(5, 2, 5, 2.3, 5, 0); v.cyl(5, 2, 5, 2.3, 3, 'brown'); v.cyl(5, 5, 5, 2.3, 1, 'woodLight');
  v.box(9, 2, 4, 9, 5, 5, c); v.box(8, 5, 4, 9, 5, 5, c); v.box(8, 2, 4, 8, 2, 5, c);
  v.paint((x, y, z, col) => col === P[c] && y >= 2 && y <= 5 && (x + y) % 3 === 0 && z >= 7 ? P.white : null);
}, { group: 'ting', colour: true, react: 'eat' });
soft('kam', [13, 7, 3], (v, o) => {
  v.box(0, 4, 1, 12, 6, 1, C(o, 'pink')); for (let x = 0; x <= 12; x += 2) v.box(x, 0, 1, x, 3, 1, C(o, 'pink')); v.box(0, 6, 1, 12, 6, 1, 'rose'); v.set(2, 5, 2, 'white');
}, { group: 'ting', react: 'look' });
soft('lim', [6, 12, 6], (v) => {
  v.cyl(2.5, 0, 2.5, 2.3, 8, 'white'); v.cyl(2.5, 2, 2.5, 2.35, 4, 'yellow'); v.box(1, 3, 5, 4, 4, 5, 'red');
  v.cyl(2.5, 8, 2.5, 2.3, 4, 'orange'); v.cyl(2.5, 11, 2.5, 1.6, 1, 'orange');
}, { group: 'ting', react: 'look' });
soft('lås', [9, 12, 4], (v) => {
  v.box(0, 0, 0, 8, 6, 3, 'gold'); v.box(1, 7, 1, 1, 10, 2, 'silver'); v.box(7, 7, 1, 7, 10, 2, 'silver'); v.box(2, 11, 1, 6, 11, 2, 'silver'); v.set(1, 11, 1, 'silver'); v.set(7, 11, 1, 'silver');
  v.box(4, 2, 3, 4, 4, 3, 'black'); v.set(4, 4, 4, 'black'); v.set(0, 6, 3, 'honey'); v.set(8, 0, 3, 'honey');
  heart(v, 4, 3.4, 4, 4, 1.4, 'gem1'); v.set(4, 3, 4, 'black');
}, { group: 'ting', react: 'look' });
soft('klokke', [12, 14, 7], (v) => {
  discZ(v, 5.5, 6, 1, 4, 5, 'red'); discZ(v, 5.5, 6, 5, 5, 4, 'white');
  v.set(5, 6, 6, 'black'); v.box(5, 7, 6, 5, 9, 6, 'black'); v.box(6, 6, 6, 8, 6, 6, 'black');
  for (const [x, y] of [[5, 10], [9, 6], [5, 2], [1, 6]]) v.set(x, y, 6, 'black');
  v.sphere(2, 12, 3, 1.8, 'gold'); v.sphere(9, 12, 3, 1.8, 'gold'); v.box(5, 11, 3, 6, 12, 3, 'silver');
  v.box(2, 0, 2, 3, 1, 3, 'gold'); v.box(8, 0, 2, 9, 1, 3, 'gold');
}, { group: 'ting', react: 'look' });
soft('vase', [10, 18, 10], (v, o) => {
  const c = C(o, 'blue');
  for (let y = 0; y < 10; y++) { const r = 2.2 + 2 * Math.sin(Math.PI * (y + 1) / 11); v.cyl(4.5, y, 4.5, r, 1, c); }
  v.cyl(4.5, 10, 4.5, 2.4, 1, c); v.cyl(4.5, 2, 4.5, 1.6, 9, 0);
  v.paint((x, y, z, col) => col === P[c] && (y === 4 || y === 6) ? P.white : null);
  const fl = (x, y, z, k) => { v.set(x, y, z, 'yellow'); v.set(x + 1, y, z, k); v.set(x - 1, y, z, k); v.set(x, y + 1, z, k); v.set(x, y - 1, z, k); v.set(x, y, z + 1, k); };
  v.line(4, 9, 4, 3, 14, 4, 'leaf'); v.line(5, 9, 5, 7, 13, 5, 'leaf'); v.line(4, 9, 5, 4, 15, 6, 'leaf');
  fl(3, 15, 4, 'pink'); fl(7, 14, 5, 'red'); fl(4, 16, 6, 'white'); v.set(2, 12, 4, 'leaf2'); v.set(8, 11, 5, 'leaf2');
}, { group: 'ting', colour: true, react: 'smell' });
soft('kurv', [14, 13, 11], (v) => {
  for (let y = 0; y <= 6; y++) for (let z = 0; z < 11; z++) for (let x = 0; x < 14; x++) { const q = ((x - 6.5) / (6.2 + y * 0.1)) ** 2 + ((z - 5) / (4.8 + y * 0.1)) ** 2; if (q <= 1 && (y === 0 || q > 0.6)) v.set(x, y, z, (x + y + z) % 2 ? 'woodLight' : 'honey'); }
  for (let i = 0; i <= 20; i++) { const t = Math.PI * i / 20; v.set(Math.round(6.5 - Math.cos(t) * 6), Math.round(6 + Math.sin(t) * 6), 5, 'woodLight'); }
  v.box(2, 5, 2, 11, 6, 8, 'red'); v.paint((x, y, z, c) => c === P.red && (x + z) % 2 ? P.white : null);
  v.sphere(4, 7, 4, 1.5, 'red'); v.sphere(8, 7, 5, 1.5, 'leaf2'); v.set(4, 9, 4, 'woodDark');
}, { group: 'ting', react: 'look' });
soft('krus', [10, 9, 8], (v, o) => {
  const c = C(o, 'red');
  v.cyl(4, 0, 4, 3.6, 8, c); v.cyl(4, 1, 4, 2.6, 7, 0); v.cyl(4, 1, 4, 2.6, 5, 'brown');
  v.box(8, 2, 3, 9, 2, 4, c); v.box(9, 2, 3, 9, 6, 4, c); v.box(8, 6, 3, 9, 6, 4, c);
  heart(v, 4, 4, 7, 7, 1.6, 'white');
}, { group: 'ting', colour: true, react: 'eat' });
soft('skål', [12, 6, 12], (v, o) => {
  const c = C(o, 'sky');
  for (let y = 0; y < 5; y++) v.cyl(5.5, y, 5.5, y === 0 ? 3.4 : 3.8 + y * 0.45, 1, c);
  v.cyl(5.5, 1, 5.5, 3.6, 4, 0); v.cyl(5.5, 4, 5.5, 4.6, 1, 0);
  v.paint((x, y, z, col) => col === P[c] && y === 3 ? P.white : null);
  v.ellipsoid(5.5, 2, 5.5, 3.3, 1.6, 3.3, 'red'); v.sphere(4, 3, 4, 1.4, 'leaf2'); v.sphere(7, 3, 6, 1.4, 'yellow');
}, { group: 'ting', colour: true, react: 'eat' });
soft('glass', [8, 11, 8], (v) => { // the drink is opaque (reads from far away), glass only at the base and above it, a pink straw
  v.cyl(3.5, 0, 3.5, 3.4, 1, 'glass'); v.cyl(3.5, 1, 3.5, 3, 6, 'orange'); v.cyl(3.5, 6, 3.5, 3, 1, 'honey');
  v.cyl(3.5, 7, 3.5, 3.4, 3, 'glass'); v.cyl(3.5, 7, 3.5, 2.4, 3, 0);
  v.line(4, 5, 3, 6, 10, 2, 'pink'); v.set(1, 6, 6, 'white'); v.set(1, 4, 6, 'white');
}, { group: 'ting', react: 'eat' });
soft('flaske', [6, 16, 6], (v) => {
  v.cyl(2.5, 0, 2.5, 2.6, 9, 'gem3'); v.cyl(2.5, 9, 2.5, 1.9, 1, 'gem3'); v.cyl(2.5, 10, 2.5, 1.1, 4, 'gem3');
  v.paint((x, y, z, c) => c === P.gem3 ? P.leaf : null); v.cyl(2.5, 3, 2.5, 2.65, 3, 'cream'); v.box(1, 4, 5, 4, 4, 5, 'red');
  v.cyl(2.5, 14, 2.5, 1.1, 2, 'woodLight'); v.set(1, 8, 4, 'white');
}, { group: 'ting', react: 'look' });
soft('kanne', [13, 13, 9], (v) => {
  for (let y = 0; y < 11; y++) v.cyl(5, y, 4.5, 3.4 + Math.sin(Math.PI * y / 12) * 0.8 - (y > 8 ? 0.6 : 0), 1, 'white');
  v.cyl(5, 2, 4.5, 2.6, 9, 0); v.paint((x, y, z, c) => c === P.white && (y === 3 || y === 7) ? P.blue : null);
  v.box(9, 9, 4, 11, 10, 5, 'white'); v.set(12, 11, 4, 'white'); v.set(12, 11, 5, 'white');
  v.box(0, 2, 4, 0, 9, 5, 'white'); v.box(1, 9, 4, 1, 9, 5, 'white'); v.box(1, 2, 4, 1, 2, 5, 'white');
  v.cyl(5, 9, 4.5, 2.6, 1, 'milk');
}, { group: 'ting', react: 'eat' });
soft('skje', [8, 18, 6], (v) => { // standing upright so the bowl reads: a big shiny spoon with a pink grip
  v.ellipsoid(3.5, 13.5, 2.5, 3, 4, 1.6, 'silver'); v.ellipsoid(3.5, 13.5, 3.2, 2, 3, 0.8, 'steel'); v.set(2, 15, 4, 'white');
  v.box(3, 0, 2, 4, 9, 3, 'silver'); v.box(2, 0, 2, 5, 4, 3, 'pink'); v.set(3, 2, 4, 'white');
}, { group: 'ting', react: 'look' });
soft('gaffel', [8, 18, 5], (v) => { // standing fork with four clear prongs and a mint grip
  v.box(3, 0, 1, 4, 9, 2, 'silver'); v.box(2, 0, 1, 5, 4, 2, 'mint'); v.set(3, 2, 3, 'white');
  v.box(0, 10, 1, 7, 11, 2, 'silver'); for (const x of [0, 2, 5, 7]) v.box(x, 12, 1, x, 17, 2, 'silver');
}, { group: 'ting', react: 'look' });
soft('brev', [13, 10, 3], (v) => {
  v.box(0, 0, 1, 12, 8, 1, 'white'); for (let i = 0; i <= 6; i++) { v.set(i, 8 - Math.round(i * 0.7), 2, 'cream2'); v.set(12 - i, 8 - Math.round(i * 0.7), 2, 'cream2'); }
  heart(v, 6, 3.6, 2, 2, 1.7, 'red'); v.set(5, 4, 2, 'cherry');
  v.box(1, 9, 1, 3, 9, 1, 'sky');
}, { group: 'ting', react: 'look' });
soft('kart', [16, 3, 12], (v) => {
  v.box(1, 0, 1, 14, 0, 10, 'cream2'); v.cyl(0.5, 0, 5.5, 0, 1, null);
  for (const x of [0, 15]) v.box(x, 0, 1, x, 1, 10, 'woodLight');
  v.paint((x, y, z, c) => c === P.cream2 && Math.hypot((x - 6) / 4, (z - 5) / 3) < 1 ? P.grass : c === P.cream2 && Math.hypot(x - 11, z - 3) < 1.6 ? P.sand : c === P.cream2 && (x + z) % 5 === 0 ? P.sky : null);
  v.set(11, 1, 3, 'red'); v.set(12, 1, 4, 'red'); v.set(10, 1, 4, 'red'); v.set(12, 1, 2, 'red'); v.set(10, 1, 2, 'red');
  v.set(5, 1, 4, 'leaf'); v.set(6, 1, 6, 'leaf'); v.set(7, 1, 5, 'woodDark');
}, { group: 'ting', react: 'look' });
soft('globus', [11, 16, 11], (v) => {
  v.cyl(5, 0, 5, 3, 1, 'woodDark'); v.box(5, 1, 5, 5, 3, 5, 'gold');
  v.sphere(5, 9, 5, 4.6, 'blue');
  v.paint((x, y, z, c) => c === P.blue && F.U.noise2(x * 0.55 + z * 0.3, y * 0.6, 3) > 0.55 ? P.green : null);
  v.paint((x, y, z, c) => (c === P.blue || c === P.green) && y >= 13 ? P.white : null);
  for (let i = 0; i < 18; i++) { const t = Math.PI * (i / 17) - Math.PI / 2; v.set(Math.round(5 - Math.cos(t) * 5.6), Math.round(9 + Math.sin(t) * 5.6), 5, 'gold'); }
}, { group: 'ting', react: 'look' });
soft('nøkkel', [7, 15, 3], (v) => {
  for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; v.set(Math.round(3 + Math.cos(t) * 2.6), Math.round(11.5 + Math.sin(t) * 2.6), 1, 'gold'); }
  heart(v, 3, 11.4, 1, 1, 1.2, 'gem1');
  v.box(3, 0, 1, 3, 8, 1, 'gold'); v.box(4, 0, 1, 5, 1, 1, 'gold'); v.box(4, 3, 1, 5, 3, 1, 'gold'); v.set(4, 4, 1, 'gold');
}, { group: 'ting', react: 'look' });
soft('lykt', [8, 15, 8], (v) => {
  v.box(1, 0, 1, 6, 0, 6, 'navySoft'); v.box(1, 1, 1, 6, 8, 6, 'glass'); v.box(2, 1, 2, 5, 7, 5, 0);
  for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6]]) v.box(x, 1, z, x, 8, z, 'navySoft');
  v.box(3, 1, 3, 4, 3, 4, 'white'); v.box(3, 4, 3, 4, 5, 4, 'flame'); v.set(3, 6, 3, 'glowYellow');
  for (let y = 9; y <= 11; y++) v.cyl(3.5, y, 3.5, 3 - (y - 9), 1, 'navySoft'); v.box(3, 12, 3, 4, 14, 4, 'navySoft'); v.box(3, 13, 3, 4, 13, 4, 0);
}, { group: 'ting', react: 'light' });
soft('kamera', [12, 9, 8], (v) => {
  v.box(0, 0, 1, 11, 6, 5, 'navySoft'); v.box(0, 2, 1, 11, 4, 5, 'black'); v.box(2, 7, 2, 4, 7, 4, 'navySoft'); v.box(8, 7, 2, 9, 7, 3, 'red');
  discZ(v, 5.5, 3.2, 6, 7, 2.6, 'silver'); discZ(v, 5.5, 3.2, 7, 7, 1.7, 'black'); v.set(5, 4, 8 - 1, 'sky'); v.set(1, 5, 6, 'glowYellow');
}, { group: 'ting', react: 'look' });
soft('saks', [10, 14, 2], (v) => {
  v.line(2, 7, 0, 8, 13, 0, 'silver'); v.line(7, 7, 0, 1, 13, 0, 'silver'); v.line(2, 7, 1, 8, 13, 1, 'silver'); v.line(7, 7, 1, 1, 13, 1, 'silver');
  for (const cx of [2.5, 7]) for (let i = 0; i < 14; i++) { const t = i / 14 * Math.PI * 2; v.set(Math.round(cx + Math.cos(t) * 2.2), Math.round(4 + Math.sin(t) * 2.6), 0, 'red'); v.set(Math.round(cx + Math.cos(t) * 2.2), Math.round(4 + Math.sin(t) * 2.6), 1, 'red'); }
  v.set(4, 9, 1, 'gold');
}, { group: 'ting', react: 'look' });
soft('pensel', [5, 18, 5], (v) => {
  v.cyl(2, 0, 2, 1.1, 11, 'woodRed'); v.cyl(2, 11, 2, 1.3, 3, 'silver'); v.cyl(2, 14, 2, 1.5, 2, 'woodLight'); v.cyl(2, 16, 2, 1, 2, 'blue'); v.set(2, 17, 2, 'blue');
}, { group: 'ting', react: 'look' });
soft('blyant', [5, 18, 5], (v) => {
  v.cyl(2, 0, 2, 1.4, 2, 'pink'); v.cyl(2, 2, 2, 1.45, 1, 'silver'); v.cyl(2, 3, 2, 1.4, 11, 'yellow'); v.paint((x, y, z, c) => c === P.yellow && (x + z) % 2 === 0 ? P.honey : null);
  v.cone(2, 14, 2, 1.4, 3, 'woodLight'); v.set(2, 16, 2, 'black'); v.set(2, 17, 2, 'black');
}, { group: 'ting', react: 'look' });
soft('bøtte', [11, 12, 11], (v, o) => {
  const c = C(o, 'red');
  for (let y = 0; y < 8; y++) v.cyl(5, y, 5, 3.6 + y * 0.18, 1, c); v.cyl(5, 1, 5, 3, 7, 0); ring(v, 5, 7, 5, 4.2, 5.1, 'yellow');
  for (let i = 0; i <= 14; i++) { const t = Math.PI * i / 14; v.set(Math.round(5 - Math.cos(t) * 4.8), Math.round(7 + Math.sin(t) * 4), 5, 'yellow'); }
  v.set(5, 3, 9, 'white'); v.set(4, 4, 9, 'white'); v.set(6, 4, 9, 'white');
  v.cyl(5, 1, 5, 3, 3, 'sand');
}, { group: 'ting', colour: true, react: 'look' });
soft('spade', [7, 20, 4], (v) => {
  v.box(3, 7, 1, 3, 17, 2, 'woodLight'); v.box(1, 18, 1, 5, 19, 2, 'woodLight'); v.box(1, 17, 1, 1, 18, 2, 'woodLight'); v.box(5, 17, 1, 5, 18, 2, 'woodLight');
  for (let y = 0; y <= 6; y++) { const w = y < 2 ? 1 + y : 3; v.box(3 - w, y, 1, 3 + w, y, 1, 'silver'); } v.set(3, 0, 1, 'steel');
}, { group: 'ting', react: 'look' });
soft('eske', [12, 10, 11], (v, o) => {
  const c = C(o, 'woodLight');
  v.box(1, 0, 1, 10, 6, 9, c); v.box(2, 1, 2, 9, 6, 8, 0); v.box(2, 1, 2, 9, 2, 8, 'cream2');
  v.box(1, 7, 0, 10, 7, 1, c); v.box(1, 7, 9, 10, 7, 10, c); v.box(0, 7, 1, 0, 9, 9, c); v.box(11, 7, 1, 11, 9, 9, c);
  v.box(4, 3, 10, 7, 4, 10, 'white'); v.set(5, 3, 10, 'red'); v.set(6, 4, 10, 'red');
}, { group: 'ting', colour: true, react: 'look' });
soft('pose', [11, 14, 7], (v) => {
  v.box(1, 0, 1, 9, 9, 5, 'woodLight'); v.box(2, 9, 2, 8, 9, 4, 0); v.box(2, 1, 2, 8, 9, 4, 0); v.box(2, 1, 2, 8, 1, 4, 'woodLight');
  v.paint((x, y, z, c) => c === P.woodLight && y === 9 && (x + z) % 2 ? P.honey : null);
  for (const z of [1, 5]) { v.box(3, 10, z, 3, 12, z, 'woodDark'); v.box(7, 10, z, 7, 12, z, 'woodDark'); v.box(3, 12, z, 7, 12, z, 'woodDark'); }
  v.sphere(4, 9.5, 3, 1.5, 'red'); v.box(6, 8, 3, 6, 12, 3, 'yellow'); v.set(7, 10, 3, 'leaf');
  heart(v, 5, 4, 6, 6, 1.6, 'red');
}, { group: 'ting', react: 'look' });
soft('såpe', [11, 7, 9], (v) => {
  v.box(1, 0, 1, 8, 2, 6, 'blossom'); v.box(2, 3, 2, 7, 3, 5, 'blossom'); v.box(3, 3, 3, 6, 3, 4, 'pink');
  const bub = (x, y, z, r) => { v.sphere(x, y, z, r, 'glass'); v.sphere(x, y, z, r - 1, 0); };
  bub(8, 4.5, 6, 1.8); bub(4, 5, 4, 1.2); bub(9.4, 2, 2.4, 1.2); v.set(7, 5, 7, 'white');
}, { group: 'ting', react: 'look' });
soft('børste', [14, 5, 5], (v) => {
  v.ellipsoid(4, 2, 2, 3.6, 1.6, 2.2, 'pink'); v.box(7, 1, 1, 13, 2, 2, 'pink'); v.box(12, 1, 1, 13, 2, 3, 'rose');
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 3; z++) if ((x + z) % 2 === 0) v.set(x, 4, z, 'white');
}, { group: 'ting', react: 'look' });
soft('stige', [9, 26, 4], (v) => {
  v.box(0, 0, 1, 1, 25, 2, 'woodLight'); v.box(7, 0, 1, 8, 25, 2, 'woodLight');
  for (let y = 2; y <= 24; y += 4) v.box(2, y, 1, 6, y, 2, 'wood');
}, { group: 'ting', react: 'look' });
soft('bilde', [14, 13, 3], (v) => {
  v.box(0, 0, 0, 13, 12, 1, 'gold'); v.box(1, 1, 1, 12, 11, 1, 'sky');
  v.box(1, 1, 1, 12, 4, 1, 'grass'); v.box(3, 4, 1, 6, 7, 1, 'white'); v.box(3, 8, 1, 6, 8, 1, 'roofRed'); v.box(4, 9, 1, 5, 9, 1, 'roofRed'); v.box(4, 4, 1, 4, 5, 1, 'woodDark');
  v.box(9, 8, 1, 10, 9, 1, 'yellow'); v.set(11, 9, 1, 'yellow'); v.set(9, 10, 1, 'yellow'); v.set(8, 8, 1, 'yellow');
  v.box(0, 0, 2, 13, 0, 2, 'gold'); v.box(0, 12, 2, 13, 12, 2, 'gold'); v.box(0, 0, 2, 0, 12, 2, 'gold'); v.box(13, 0, 2, 13, 12, 2, 'gold');
}, { group: 'ting', react: 'look' });
soft('bjelle', [9, 12, 9], (v) => {
  for (let y = 1; y <= 8; y++) v.cyl(4, y, 4, y < 3 ? 4 : 4 - (y - 3) * 0.45, 1, 'gold'); v.cyl(4, 1, 4, 3, 5, 0); v.sphere(4, 1, 4, 1.2, 'honey');
  v.box(3, 9, 4, 5, 10, 4, 'red'); v.box(2, 10, 4, 6, 11, 4, 'red'); v.set(4, 10, 5, 'gold');
  v.paint((x, y, z, c) => c === P.gold && y === 2 ? P.honey : null);
}, { group: 'musikk', react: 'play' });
soft('radio', [14, 13, 7], (v) => {
  v.box(0, 0, 1, 13, 8, 5, 'woodRed'); v.box(1, 1, 6, 7, 7, 6, 'cream2'); v.paint((x, y, z, c) => c === P.cream2 && (x + y) % 2 === 0 ? P.woodLight : null);
  discZ(v, 10.5, 5, 6, 6, 1.6, 'silver'); v.set(10, 5, 7, 'black'); discZ(v, 10.5, 1.6, 6, 6, 0.9, 'gold');
  v.line(11, 9, 2, 13, 12, 2, 'silver'); v.set(13, 12, 2, 'red'); v.box(1, 9, 3, 12, 9, 3, 'woodDark');
}, { group: 'musikk', react: 'play' });
soft('huske', [18, 20, 10], (v) => {
  v.line(1, 0, 1, 4, 19, 5, 'woodDark'); v.line(1, 0, 9, 4, 19, 5, 'woodDark'); v.line(16, 0, 1, 13, 19, 5, 'woodDark'); v.line(16, 0, 9, 13, 19, 5, 'woodDark');
  v.box(3, 19, 4, 14, 19, 6, 'wood');
  v.box(7, 6, 5, 7, 18, 5, 'hay'); v.box(10, 6, 5, 10, 18, 5, 'hay'); v.box(6, 5, 3, 11, 5, 7, 'red');
}, { group: 'leker', react: 'play' });
soft('sklie', [10, 17, 24], (v) => {
  for (let y = 0; y <= 14; y++) { v.set(1, y, 2, 'silver'); v.set(8, y, 2, 'silver'); if (y % 3 === 1) v.box(2, y, 2, 7, y, 2, 'silver'); }
  v.box(1, 14, 2, 8, 14, 6, 'yellow'); v.box(1, 15, 2, 1, 16, 6, 'red'); v.box(8, 15, 2, 8, 16, 6, 'red');
  for (let z = 6; z <= 23; z++) { const y = Math.max(0, Math.round(14 - (z - 6) * 0.82)); v.box(2, y, z, 7, y, z, 'sky'); v.set(1, y + 1, z, 'blue'); v.set(8, y + 1, z, 'blue'); }
  v.box(1, 0, 6, 1, 13, 6, 'silver'); v.box(8, 0, 6, 8, 13, 6, 'silver');
}, { group: 'leker', react: 'play' });


/* ---------- stall goods / nature fallbacks (MODELS-3 owns nature; these only appear if nobody defines them) */
soft('skjell', [12, 5, 11], (v) => {
  for (let z = 0; z < 11; z++) for (let x = 0; x < 12; x++) { const dx = x - 5.5, dz = z - 1, d = Math.hypot(dx, dz); const a = Math.atan2(dz, dx); if (d <= 9.6 && dz >= 0 && a > 0.35 && a < Math.PI - 0.35) { const h = Math.max(1, Math.round(3.4 * (1 - d / 10.5))); for (let y = 0; y <= h; y++) v.set(x, y, z, Math.round(a * 4.2) % 2 ? 'peach' : 'blossom'); } }
  v.box(4, 0, 0, 7, 1, 1, 'coral'); v.set(5, 2, 1, 'coral'); v.set(6, 2, 1, 'coral');
}, { group: 'natur', react: 'look' });
soft('krystall', [10, 14, 10], (v) => {
  const sp = (x, z, h, c) => { for (let y = 0; y < h; y++) { const r = y > h - 3 ? (h - y) * 0.5 : 1.3; v.cyl(x, y, z, r, 1, c); } };
  sp(4.5, 4.5, 13, 'crystal'); sp(2, 6, 8, 'crystal'); sp(7, 6.5, 9, 'crystal'); sp(5, 2, 7, 'crystal');
  v.box(1, 0, 1, 8, 0, 8, 'lavender'); v.paint((x, y, z, c) => c === P.lavender && (x + z) % 3 === 0 ? P.lilac : null);
  v.set(4, 12, 5, 'white'); v.set(2, 7, 7, 'white');
}, { group: 'natur', react: 'look' });


/* ---------- nature / building fallbacks for castable words (MODELS-3's domain; only used if no word id or alias exists) */
soft('sol', [16, 16, 6], (v) => {
  discZ(v, 7.5, 7.5, 1, 4, 4.6, 'yellow'); discZ(v, 7.5, 7.5, 0, 5, 3.4, 'yellow');
  for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; for (let r = 5.6; r <= (a % 2 ? 7.2 : 7.8); r += 0.5) v.box(Math.round(7.5 + Math.cos(an) * r), Math.round(7.5 + Math.sin(an) * r), 2, Math.round(7.5 + Math.cos(an) * r), Math.round(7.5 + Math.sin(an) * r), 3, a % 2 ? 'orange' : 'yellow'); }
  v.box(5, 8, 6, 5, 9, 6, 'black'); v.box(10, 8, 6, 10, 9, 6, 'black'); v.set(5, 9, 6, 'white'); v.set(10, 9, 6, 'white');
  v.box(6, 5, 6, 9, 5, 6, 'woodRed'); v.set(5, 6, 6, 'woodRed'); v.set(10, 6, 6, 'woodRed'); v.set(4, 7, 6, 'coral'); v.set(11, 7, 6, 'coral');
}, { group: 'natur', react: 'warm' });
soft('sky', [18, 10, 10], (v) => {
  for (const [x, y, z, r] of [[5, 4, 5, 3.6], [9, 5.6, 5, 4.4], [13, 4, 5, 3.4], [7.4, 2.6, 5.4, 2.8], [11, 2.6, 5.4, 2.8]]) v.sphere(x, y, z, r, 'white');
  v.paint((x, y, z, c) => y <= 1 ? P.snow : null); v.paint((x, y, z, c) => y <= 0 ? P.ice : null);
}, { group: 'natur', react: 'look' });
soft('måne', [12, 14, 5], (v) => {
  for (let y = 0; y < 14; y++) for (let x = 0; x < 12; x++) { const a = Math.hypot(x - 5, y - 6.6), b = Math.hypot(x - 7.6, y - 7.6); if (a <= 6.4 && b > 5) v.box(x, y, 1, x, y, 3, 'butter'); }
  v.paint((x, y, z, c) => (x * 3 + y * 5) % 11 === 0 ? P.yellow : null);
  v.set(2, 7, 4, 'black'); v.set(2, 8, 4, 'black'); v.set(2, 5, 4, 'blossom');
}, { group: 'natur', react: 'look' });
soft('rose', [7, 18, 7], (v, o) => {
  const pc = pick(o, 'c', 'rose'), pc2 = o && o.c ? (o.c === 'white' ? 'cream' : o.c === 'yellow' ? 'butter' : o.c) : 'red';
  v.box(3, 0, 3, 3, 12, 3, 'leafDark'); v.box(4, 4, 3, 5, 4, 4, 'leaf'); v.set(5, 5, 4, 'leaf'); v.box(1, 8, 3, 2, 8, 3, 'leaf'); v.set(1, 9, 2, 'leaf');
  v.ellipsoid(3, 14.4, 3, 2.6, 2.8, 2.6, pc); v.cyl(3, 16, 3, 1.4, 2, pc2); v.set(3, 17, 3, pc);
  v.paint((x, y, z, c) => c === P[pc] && (x + y + z) % 3 === 0 ? P[pc2] : null);
  v.box(2, 12, 2, 4, 12, 4, 'leaf');
}, { group: 'natur', colour: true, react: 'smell' });
soft('lilje', [8, 18, 8], (v) => {
  v.box(3, 0, 3, 4, 11, 4, 'leaf'); v.line(3, 2, 3, 0, 8, 3, 'leaf2'); v.line(4, 3, 4, 7, 9, 5, 'leaf2');
  for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; v.line(3.5, 12, 3.5, Math.round(3.5 + Math.cos(an) * 3.4), 16, Math.round(3.5 + Math.sin(an) * 3.4), 'white'); }
  v.cyl(3.5, 12, 3.5, 1.4, 2, 'white'); v.box(3, 13, 3, 4, 15, 4, 'butter'); v.set(3, 16, 3, 'orange'); v.set(4, 16, 4, 'orange');
}, { group: 'natur', react: 'smell' });
soft('plante', [10, 16, 10], (v) => {
  for (let y = 0; y < 5; y++) v.cyl(4.5, y, 4.5, 2.6 + y * 0.35, 1, 'woodRed'); v.cyl(4.5, 4, 4.5, 3.6, 1, 'coral'); v.cyl(4.5, 4, 4.5, 2.8, 1, 'soil');
  for (const [dx, dz, h] of [[0, 0, 11], [-2, 1, 8], [2, -1, 9], [1, 2, 7], [-1, -2, 7]]) { v.line(4, 5, 4, 4 + dx, 5 + h - 3, 4 + dz, 'leafDark'); v.ellipsoid(4 + dx * 1.6, 5 + h - 2, 4 + dz * 1.6, 1.8, 1.2, 1.8, 'leaf'); }
}, { group: 'natur', react: 'look' });
soft('kaktus', [10, 15, 10], (v) => {
  for (let y = 0; y < 4; y++) v.cyl(4.5, y, 4.5, 3 + y * 0.25, 1, 'brick'); v.cyl(4.5, 3, 4.5, 2.6, 1, 'sand');
  v.cyl(4.5, 4, 4.5, 1.7, 9, 'green'); v.sphere(4.5, 12.6, 4.5, 1.7, 'green');
  v.box(1, 7, 4, 2, 8, 5, 'green'); v.box(1, 8, 4, 1, 10, 5, 'green'); v.box(7, 9, 4, 8, 10, 5, 'green'); v.box(8, 10, 4, 8, 11, 5, 'green');
  v.paint((x, y, z, c) => c === P.green && (x + y + z) % 3 === 0 ? P.leafDark : null);
  v.set(4, 14, 4, 'pink'); v.set(5, 14, 5, 'pink'); v.set(4, 15, 5, 'yellow');
}, { group: 'natur', react: 'look' });
soft('palme', [14, 24, 14], (v) => {
  for (let y = 0; y < 17; y++) v.box(6 + Math.round(Math.sin(y * 0.18) * 1.2), y, 6, 7 + Math.round(Math.sin(y * 0.18) * 1.2), y, 7, y % 3 === 0 ? 'woodLight' : 'wood');
  for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; for (let t = 0; t <= 6; t++) { const y = Math.round(18 - (t * t) / 9), x = Math.round(7 + Math.cos(an) * t), z = Math.round(6.5 + Math.sin(an) * t); v.set(x, y, z, a % 2 ? 'leaf' : 'leafDark'); v.set(x, y - 1, z, 'leaf2'); } }
  v.sphere(7, 16, 6.5, 1.2, 'brown'); v.sphere(8, 15.6, 7.6, 1.1, 'brown');
}, { group: 'natur', react: 'look' });
soft('kongle', [7, 10, 7], (v) => {
  for (let y = 0; y < 9; y++) { const r = 2.8 * Math.sin(Math.PI * (y + 1) / 10) + 0.4; v.cyl(3, y, 3, r, 1, y % 2 ? 'brown' : 'woodRed'); }
  v.paint((x, y, z, c) => (x + z + y) % 2 === 0 ? P.woodDark : null); v.set(3, 9, 3, 'woodDark');
}, { group: 'natur', react: 'look' });
soft('blad', [12, 3, 14], (v) => {
  for (let z = 0; z < 13; z++) for (let x = 0; x < 12; x++) { const t = z / 12, w = 5 * Math.sin(Math.PI * Math.min(1, t * 1.05)); if (Math.abs(x - 5.5) <= w) v.set(x, Math.abs(x - 5.5) > 3 ? 1 : 0, z, 'leaf'); }
  for (let z = 0; z < 13; z++) v.set(5, 1, z, 'leafDark'); for (let k = 2; k < 11; k += 3) { v.line(5, 1, k, 2, 1, k + 2, 'leafDark'); v.line(6, 1, k, 9, 1, k + 2, 'leafDark'); }
  v.box(5, 0, 12, 6, 0, 13, 'woodDark');
}, { group: 'natur', react: 'look' });
soft('fjær', [9, 14, 14], (v) => { // a big soft feather on a slant: rainbow-ish vanes, white quill
  for (let i = 0; i <= 30; i++) { const t = i / 30, y = 1 + t * 11.5, z = 1 + t * 11, w = 3.4 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.2;
    for (let x = 0; x < 9; x++) if (Math.abs(x - 4) <= w && t > 0.12) v.set(x, Math.round(y), Math.round(z), Math.abs(x - 4) > w - 1 ? 'lavender' : t > 0.66 ? 'pink' : t > 0.4 ? 'sky' : 'lilac'); }
  for (let i = 0; i <= 30; i++) { const t = i / 30; v.set(4, Math.round(1 + t * 11.5) + 1, Math.round(1 + t * 11), 'white'); }
  v.set(4, 0, 0, 'white'); v.set(4, 1, 1, 'white');
  v.set(1, 6, 6, 0); v.set(7, 9, 9, 0);
}, { group: 'natur', react: 'look' });
soft('pinne', [16, 3, 5], (v) => { v.box(0, 0, 2, 15, 1, 2, 'wood'); v.line(9, 1, 2, 13, 2, 0, 'wood'); v.set(13, 2, 0, 'leaf'); v.set(4, 1, 2, 'woodDark'); v.set(1, 0, 3, 'woodDark'); }, { group: 'natur', react: 'look' });
soft('frø', [10, 13, 4], (v) => {
  v.box(1, 0, 1, 8, 12, 2, 'cream2'); v.box(1, 11, 1, 8, 12, 2, 'woodLight'); v.box(2, 4, 3, 7, 9, 3, 'sky');
  v.box(4, 5, 3, 5, 6, 3, 'leaf'); v.set(4, 7, 3, 'yellow'); v.set(5, 7, 3, 'yellow'); v.set(3, 8, 3, 'yellow'); v.set(6, 8, 3, 'yellow'); v.set(4, 8, 3, 'orange'); v.set(5, 8, 3, 'orange');
  v.set(2, 1, 3, 'woodDark'); v.set(4, 2, 3, 'woodDark'); v.set(6, 1, 3, 'woodDark');
}, { group: 'natur', react: 'look' });
soft('dam', [20, 4, 18], (v) => {
  for (let z = 0; z < 18; z++) for (let x = 0; x < 20; x++) { const q = ((x - 9.5) / 9.6) ** 2 + ((z - 8.5) / 8.4) ** 2; if (q <= 1) v.set(x, 0, z, q > 0.72 ? 'pathStone' : 'water'); }
  v.paint((x, y, z, c) => c === P.water && H(x, z, 2) < 0.06 ? P.sky : null);
  v.box(5, 1, 6, 7, 1, 7, 'leaf'); v.set(6, 2, 6, 'pink'); v.box(12, 1, 10, 13, 1, 11, 'leaf');
  for (const [x, z] of [[1, 8], [18, 7], [9, 0], [10, 17], [16, 13]]) v.set(x, 1, z, 'stone2');
}, { group: 'natur', react: 'look' });
/* buildings (small toy-like, 1/16) */
soft('mur', [20, 12, 6], (v) => {
  v.box(0, 0, 1, 19, 8, 4, 'stone'); v.paint((x, y, z, c) => y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 ? P.stone2 : null);
  for (let x = 0; x < 20; x += 4) v.box(x, 9, 1, x + 1, 11, 4, 'stone'); v.box(0, 8, 0, 19, 8, 5, 'stoneDark');
  v.set(5, 3, 5, 'leaf'); v.set(6, 2, 5, 'leaf'); v.set(6, 3, 5, 'pink');
}, { group: 'hus', react: 'look' });
soft('tak', [18, 10, 14], (v) => {
  for (let y = 0; y < 9; y++) v.box(Math.min(8, y), y, 0, Math.max(9, 17 - y), y, 13, y % 2 ? 'roofRed' : 'roofPink');
  v.box(8, 9, 0, 9, 9, 13, 'woodDark'); v.box(13, 4, 9, 14, 8, 10, 'brick'); v.box(13, 9, 9, 14, 9, 10, 'stoneDark');
}, { group: 'hus', react: 'look' });
soft('dør', [12, 20, 4], (v) => {
  v.box(0, 0, 0, 11, 19, 1, 'stone2'); v.box(1, 0, 1, 10, 17, 2, 'woodRed'); for (let x = 1; x <= 10; x++) { const top = 17 + Math.round(Math.sqrt(Math.max(0, 20 - (x - 5.5) ** 2)) - 3.2); v.box(x, 17, 1, x, Math.min(18, top), 2, 'woodRed'); }
  v.paint((x, y, z, c) => c === P.woodRed && x % 3 === 0 ? P.wood : null);
  v.box(8, 8, 3, 8, 9, 3, 'gold'); heart(v, 5.5, 13, 3, 3, 1.6, 'pink'); v.box(3, 3, 3, 8, 3, 3, 'woodDark');
}, { group: 'hus', react: 'look' });
soft('vindu', [12, 13, 4], (v) => {
  v.box(0, 0, 1, 11, 12, 2, 'white'); v.box(1, 1, 1, 10, 11, 2, 'glass'); v.box(5, 1, 1, 6, 11, 2, 'white'); v.box(1, 6, 1, 10, 6, 2, 'white');
  v.box(0, 0, 2, 11, 0, 3, 'woodLight'); v.box(1, 1, 3, 10, 2, 3, 'woodRed'); v.set(2, 3, 3, 'red'); v.set(4, 3, 3, 'pink'); v.set(7, 3, 3, 'yellow'); v.set(9, 3, 3, 'red');
  v.box(0, 3, 0, 0, 11, 0, 'sky'); v.box(11, 3, 0, 11, 11, 0, 'sky');
}, { group: 'hus', react: 'look' });
soft('port', [20, 20, 5], (v) => {
  for (const x0 of [0, 16]) { v.box(x0, 0, 1, x0 + 3, 17, 4, 'stone'); v.box(x0, 18, 1, x0 + 3, 19, 4, 'stone2'); }
  for (let x = 4; x <= 15; x++) { const top = 13 + Math.round(4 * Math.sin(Math.PI * (x - 3.5) / 12.5)); v.box(x, top, 2, x, top + 1, 3, 'gold'); for (let y = 0; y < top; y++) if (x % 2 === 0) v.box(x, y, 2, x, y, 3, 'navySoft'); }
  v.box(4, 6, 2, 15, 6, 3, 'navySoft'); v.box(4, 1, 2, 15, 1, 3, 'navySoft'); heart(v, 9.5, 10, 2, 3, 1.6, 'gold');
}, { group: 'hus', react: 'look' });
soft('trapp', [12, 12, 16], (v) => {
  for (let i = 0; i < 6; i++) v.box(1, 0, i * 2 + 2, 10, 11 - i * 2, i * 2 + 3, i % 2 ? 'stone' : 'stone2');
  v.box(0, 0, 2, 0, 12, 3, 'woodDark'); v.box(11, 0, 2, 11, 12, 3, 'woodDark'); v.line(0, 12, 2, 0, 2, 14, 'wood'); v.line(11, 12, 2, 11, 2, 14, 'wood');
}, { group: 'hus', react: 'look' });
soft('telt', [16, 13, 16], (v, o) => {
  const c = pick(o, 'c', 'red');
  for (let y = 0; y < 12; y++) { const w = 7.5 * (1 - y / 12); v.box(Math.round(7.5 - w), y, 1, Math.round(7.5 + w), y, 14, y % 4 < 2 ? c : 'white'); }
  for (let y = 0; y < 7; y++) { const w = 2.6 * (1 - y / 7); v.box(Math.round(7.5 - w), y, 14, Math.round(7.5 + w), y, 14, 'woodDark'); v.box(Math.round(7.5 - w), y, 15, Math.round(7.5 + w), y, 15, 0); }
  v.box(7, 12, 1, 8, 12, 14, 'woodDark'); v.box(7, 12, 14, 7, 14, 14, 'woodDark'); v.box(8, 13, 14, 9, 14, 14, 'yellow');
}, { group: 'hus', colour: true, react: 'look' });
function cottage(v, wall, roof, W, D, Hw) {
  v.box(1, 0, 1, W - 2, Hw, D - 2, wall); v.paint((x, y, z, c) => c === P[wall] && y % 2 === 0 && (x === 1 || x === W - 2 || z === 1 || z === D - 2) ? P[wall === 'woodRed' ? 'roofRed' : 'cream2'] : null);
  for (let y = 0; y <= Math.ceil(W / 2); y++) v.box(Math.max(0, y - 1), Hw + 1 + y, 0, Math.min(W - 1, W - y), Hw + 1 + y, D - 1, roof);
  const cx = Math.floor(W / 2) - 1; v.box(cx, 0, D - 2, cx + 1, Math.min(5, Hw - 1), D - 1, 'woodDark'); v.set(cx + 1, 3, D - 1, 'gold');
  v.box(2, 4, D - 1, 3, 5, D - 1, 'glass'); v.box(W - 4, 4, D - 1, W - 3, 5, D - 1, 'glass');
}
soft('hytte', [16, 18, 14], (v) => { cottage(v, 'woodDark', 'grass', 16, 14, 7); v.paint((x, y, z, c) => c === P.grass && H(x, z, y) < 0.15 ? P.blossom : null); v.box(12, 10, 3, 13, 15, 4, 'stone2'); }, { group: 'hus', react: 'look' });
soft('låve', [18, 18, 16], (v) => { cottage(v, 'woodRed', 'roofRed', 18, 16, 8); v.box(6, 0, 15, 11, 7, 15, 'white'); v.line(6, 0, 15, 11, 7, 15, 'woodRed'); v.line(11, 0, 15, 6, 7, 15, 'woodRed'); v.box(7, 10, 15, 10, 12, 15, 'hay'); }, { group: 'hus', react: 'look' });
soft('tårn', [12, 30, 12], (v) => {
  v.cyl(5.5, 0, 5.5, 4.4, 20, 'stone'); v.paint((x, y, z, c) => c === P.stone && (y % 4 === 0 || (x + z + Math.floor(y / 4) * 2) % 5 === 0) ? P.stone2 : null);
  for (let a = 0; a < 10; a++) { if (a % 2) continue; const an = a / 10 * Math.PI * 2; v.box(Math.round(5.5 + Math.cos(an) * 4.4), 20, Math.round(5.5 + Math.sin(an) * 4.4), Math.round(5.5 + Math.cos(an) * 4.4), 21, Math.round(5.5 + Math.sin(an) * 4.4), 'stone'); }
  v.cone(5.5, 20, 5.5, 4, 8, 'roofPink'); v.box(5, 28, 5, 5, 29, 5, 'gold'); v.box(6, 28, 5, 7, 29, 5, 'rose');
  v.box(4, 12, 9, 6, 15, 9, 'glass'); v.box(4, 0, 9, 6, 4, 10, 'woodDark');
}, { group: 'hus', react: 'look' });
soft('slott', [24, 26, 18], (v) => {
  v.box(4, 0, 4, 19, 10, 15, 'stone'); v.paint((x, y, z, c) => c === P.stone && (y % 3 === 0) && (x + z) % 2 === 0 ? P.stone2 : null);
  for (let x = 4; x <= 19; x += 2) { v.set(x, 11, 4, 'stone'); v.set(x, 11, 15, 'stone'); }
  for (const [x, z] of [[3.5, 3.5], [19.5, 3.5], [3.5, 15.5], [19.5, 15.5]]) { v.cyl(x, 0, z, 2.8, 15, 'stone2'); v.cone(x, 15, z, 3.2, 7, 'roofPink'); }
  v.box(9, 11, 7, 14, 17, 12, 'stone'); v.cone(11.5, 18, 9.5, 4, 7, 'roofLilac'); v.box(11, 25, 9, 11, 25, 9, 'gold');
  v.box(10, 0, 15, 13, 6, 16, 'woodDark'); for (let x = 10; x <= 13; x++) v.set(x, 7, 16, 'stone'); v.box(6, 6, 16, 7, 8, 16, 'glass'); v.box(16, 6, 16, 17, 8, 16, 'glass'); v.box(11, 13, 13, 12, 15, 13, 'glass');
  v.box(11, 20, 9, 11, 22, 9, 'gold'); v.set(12, 22, 9, 'red'); v.set(13, 22, 9, 'red');
}, { group: 'hus', react: 'look' });

if (typeof document === 'undefined' || document.readyState !== 'loading') flushSoft();
else document.addEventListener('DOMContentLoaded', flushSoft);
F.on && F.on('boot', flushSoft);
F.M2 = Object.assign(F.M2 || {}, { flushSoft });
})();
