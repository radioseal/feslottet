/* Feslottet – MODELS-3: nature (single trees only – no forests), flowers, bushes, rocks, water plants, snow, crystals,
   shells, collectibles and fairy power pieces. Also F.M3K = the small shared voxel kit used by all MODELS-3 files.
   Front = +z, origin = bottom centre, palette names only.

   Trees (1/10, ~4.5 m):  tree{kind:'eple'|'kirsebær'|'rund'|'bjørk', seed:1..4}  (= n_tre)   explicit: n_tre_eple n_tre_kirsebaer n_tre_rund n_tre_bjork
                          n_epletre (interactable, parts crown + fruit; pivot = top of trunk)   n_kirsebaertre (parts crown + petals)
   Flowers (1/16): flower{kind:'tulipan'|'rund'|'klokke', col} (= n_blomst)   n_blomster{seed} clump   n_solsikke (part head)
                   n_lavendel   n_rosebusk
   Plants: n_busk{kind:'rund'|'blomst'|'baer'} (1/10)  n_gress  n_siv (reeds)  n_nokkerose (lily pad)  n_klover  n_sopp (cute mushroom)
   Rocks (1/10): n_stein{kind:'liten'|'stor'|'flat'}
   Snow: n_snomann (parts mid, head, hat)  n_akebakke (sled; part kjelke)  n_skoytedam (1/8 ice oval)  n_snohaug
   Crystals: n_krystaller (parts k1..k5)  n_krystallhoyde (1/8 landmark)
   Beach: n_skjell (part top + pearl)  n_sandslott (parts t1 t2 t3)  n_sandslott_stor (landmark)  n_strandball
   Farm-ish: n_bikube (part bees)  n_hoyball (part kitten)
   Learning spots: n_bokstavsteiner (parts s1..s5; letters are HTML labels at meta.labels)  n_tryllepunkt (part ring)  n_taptting (sparkle marker)
   Collectibles: n_firklover  n_gullbokstav (letter = HTML label)
   Fairy powers: n_krystallbro (1 m segment, tile along z)  n_stjernebro  n_vinstige (3 m vine ladder)  n_liljeblad (lily-pad step)  n_storboble (ride bubble)
   Landmarks: n_kjempesolsikke (1/8, part head) */
(function () {
'use strict';
const F = window.F, V = F.VOX;
const H = (x, y, z, s) => F.U.hash2(x * 73 + z * 19, y * 31 + z, s || 1);

/* ------------------------------------------------------------------ shared kit (MODELS-3) */
const tint = (name, base, k, mix) => {
  if (F.PAL[name] != null) return;
  const c = new THREE.Color(F.PAL[base]).lerp(new THREE.Color(F.PAL[mix || 'white']), k);
  let h = c.getHex(); const used = new Set(Object.values(F.PAL)); while (used.has(h)) h += 1;
  F.PAL[name] = h; V.GLASS.add(h);
};
// glass tints (wings, crystals, bubbles, greenhouse panes)
tint('gRose', 'pink', 0.38); tint('gMint', 'mint', 0.25); tint('gAqua', 'sky', 0.2); tint('gGold', 'yellow', 0.35); tint('gLilac', 'lilac', 0.3);
tint('gPeach', 'peach', 0.15); tint('gIce', 'crystal', 0.1, 'lilac'); tint('gSky', 'blue', 0.5);
const K = F.M3K = {
  H,
  exposed: (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1),
  // speckle: recolour a fraction p of voxels of colour `from` (optionally only exposed ones)
  speck(v, from, to, p, seed, surf) { const f = F.col(from); v.paint((x, y, z, c) => (c === f && (!surf || K.exposed(v, x, y, z)) && H(x, y, z, seed) < p ? to : null)); },
  // lumpy round crown made of overlapping ellipsoids
  blob(v, cx, cy, cz, rx, ry, rz, c, lumps, seed) {
    v.ellipsoid(cx, cy, cz, rx, ry, rz, c);
    const r = F.U.rng(seed || 1);
    for (let i = 0; i < (lumps || 0); i++) { const a = r() * Math.PI * 2, e = (r() - 0.3) * 0.9; const rr = Math.min(rx, rz) * (0.45 + r() * 0.15); v.sphere(cx + Math.cos(a) * rx * 0.62, cy + e * ry * 0.7, cz + Math.sin(a) * rz * 0.62, rr, c); }
  },
  // rounded box (vertical edges chamfered)
  rbox(v, x0, y0, z0, x1, y1, z1, c) { v.box(x0, y0, z0, x1, y1, z1, c); for (let y = y0; y <= y1; y++) { v.set(x0, y, z0, 0); v.set(x1, y, z0, 0); v.set(x0, y, z1, 0); v.set(x1, y, z1, 0); } return v; },
  // horizontal ring
  ring(v, cx, y, cz, r, c, step) { const n = Math.max(12, Math.round(r * 8)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; v.set(Math.round(cx + Math.cos(a) * r), y, Math.round(cz + Math.sin(a) * r), typeof c === 'function' ? c(i) : c); } },
  // vertical disc in the x-y plane (wheels), thickness along z
  wheelXY(v, cx, cy, z0, z1, r, rim, hub, spokes) {
    for (let z = z0; z <= z1; z++) for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d <= r + 0.4 && d > r - 0.9) v.set(x, y, z, rim);
    }
    if (spokes) for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2; v.line(Math.round(cx), Math.round(cy), z0, Math.round(cx + Math.cos(a) * (r - 0.6)), Math.round(cy + Math.sin(a) * (r - 0.6)), z0, hub); }
    v.box(Math.round(cx - 0.5), Math.round(cy - 0.5), z0, Math.round(cx + 0.5), Math.round(cy + 0.5), z1, hub);
  },
  // flower head: plus of petals + centre
  flower(v, x, y, z, petal, centre, up) {
    v.set(x, y, z, centre || 'yellow');
    if (up !== false) { v.set(x + 1, y, z, petal); v.set(x - 1, y, z, petal); v.set(x, y, z + 1, petal); v.set(x, y, z - 1, petal); }
    else { v.set(x + 1, y, z, petal); v.set(x - 1, y, z, petal); v.set(x, y + 1, z, petal); v.set(x, y - 1, z, petal); }
  },
  PASTELS: ['rose', 'pink', 'butter', 'lilac', 'peach', 'white', 'coral', 'sky', 'lavender'],
  def(id, d) { if (V.has(id)) return; V.def(id, d); },
};

/* ------------------------------------------------------------------ trees (single, rounded) */
const TREE = {
  eple: { trunk: 'wood', crown: ['leaf', 'leaf2'], th: 13, r: [12.5, 9.5, 12.5], cy: 25, fruit: 'red', dark: 'leafDark' },
  kirsebær: { trunk: 'woodRed', crown: ['blossom', 'pink'], th: 13, r: [12.5, 9.5, 12.5], cy: 25, extra: 'white', dark: 'cherry' },
  rund: { trunk: 'wood', crown: ['leaf2', 'grass'], th: 12, r: [13, 10.5, 13], cy: 25, dark: 'leaf' },
  bjørk: { trunk: 'white', crown: ['leaf2', 'mint'], th: 17, r: [9.5, 13, 9.5], cy: 30, dark: 'grassDark' },
};
function trunk(v, T, kind, seed) {
  const cx = 15, cz = 15;
  v.box(cx - 2, 0, cz - 2, cx + 1, T.th, cz + 1, T.trunk);
  v.box(cx - 3, 0, cz - 1, cx + 2, 1, cz, T.trunk); v.box(cx - 1, 0, cz - 3, cx, 1, cz + 2, T.trunk);
  v.line(cx, T.th - 3, cz, cx + 5, T.th + 4, cz - 1, T.trunk); v.line(cx - 1, T.th - 2, cz, cx - 6, T.th + 5, cz + 1, T.trunk); v.line(cx, T.th - 1, cz, cx + 1, T.th + 5, cz + 5, T.trunk);
  if (kind === 'bjørk') v.paint((x, y, z, c) => (c === F.col('white') && y > 1 && H(x, y, z, seed) < 0.16 ? 'black' : null));
  if (kind !== 'bjørk') v.paint((x, y, z, c) => (c === F.col(T.trunk) && H(x, y, z, seed + 5) < 0.18 ? 'woodDark' : null));
}
function crown(v, T, kind, seed) {
  K.blob(v, 14.5, T.cy, 14.5, T.r[0], T.r[1], T.r[2], T.crown[0], kind === 'bjørk' ? 4 : 7, seed);
  K.speck(v, T.crown[0], T.crown[1], 0.32, seed);
  const cDark = F.col(T.dark), c0 = F.col(T.crown[0]), c1 = F.col(T.crown[1]);
  v.paint((x, y, z, c) => ((c === c0 || c === c1) && y < T.cy - T.r[1] * 0.35 && H(x, y, z, seed + 1) < 0.45 ? T.dark : null));
  if (T.extra) K.speck(v, T.crown[0], T.extra, 0.08, seed + 3, true);
}
function fruit(v, T, seed, col, kind) {
  const g = V.grid(30, 46, 30); crown(g, T, kind || 'eple', seed);
  for (let z = 0; z < 30; z++) for (let y = 18; y < 46; y++) for (let x = 0; x < 30; x++) if (g.get(x, y, z) && K.exposed(g, x, y, z) && H(x, y, z, seed + 9) < 0.07 && y < T.cy + 6) {
    // put the apple just outside the crown surface
    const dx = x - 14.5, dz = z - 14.5, L = Math.hypot(dx, dz) || 1;
    v.set(Math.round(x + dx / L * 0.8), y, Math.round(z + dz / L * 0.8), col || 'red');
  }
}
function treeDef(id, fixedKind, interactive) {
  K.def(id, {
    size: [30, 46, 30], scale: 1 / 10,
    build(v, o) { const kind = fixedKind || o.kind || 'rund', T = TREE[kind] || TREE.rund, seed = o.seed || 1; trunk(v, T, kind, seed); if (!interactive) { crown(v, T, kind, seed); if (kind === 'eple') fruit(v, T, seed); } },
    parts: interactive ? {
      crown: { pivot: [15, 16, 15], build(v, o) { const kind = fixedKind, T = TREE[kind]; crown(v, T, kind, o.seed || 1); } },
      fruit: { pivot: [15, 16, 15], build(v, o) { if (fixedKind === 'eple') fruit(v, TREE.eple, o.seed || 1); else fruit(v, TREE.kirsebær, (o.seed || 1) + 2, 'white', 'kirsebær'); } },
    } : undefined,
    meta: { group: 'tree', gallery: fixedKind ? null : [{ kind: 'eple' }, { kind: 'kirsebær' }, { kind: 'rund' }, { kind: 'bjørk' }, { kind: 'rund', seed: 3 }], radius: 0.35 },
  });
}
K.tree = { TREE, trunk, crown, fruit };
/* Low-poly LOD copies: K.lod(newId, srcId, f=2, thr=3) defines newId = srcId downsampled by f (scale × f, ~1/f² triangles).
   Each f×f×f block becomes one voxel (most common colour) when ≥ thr cells are filled. Parts are merged into the body. */
function downsample(g, v, f, thr) {
  const cells = new Map();
  g.paint((x, y, z, hex) => { const k = ((x / f) | 0) + ',' + ((y / f) | 0) + ',' + ((z / f) | 0); let e = cells.get(k); if (!e) cells.set(k, e = { n: 0, c: {} }); e.n++; e.c[hex] = (e.c[hex] || 0) + 1 + (g.get(x, y + 1, z) ? 0 : 0.5); return null; });
  for (const [k, e] of cells) { if (e.n < thr) continue; let best = null, bn = -1; for (const h in e.c) if (e.c[h] > bn) { bn = e.c[h]; best = +h; } const [x, y, z] = k.split(',').map(Number); v.set(x, y, z, best); }
}
/* K.lodParts(newId, srcId, f, thr, meta): like K.lod but every moving part stays a part (same name, pivot / f), so things that animate
   parts (mill sails, stall awning, apple-tree crown) can use the cheap copy. */
K.lodParts = (id, srcId, f, thr, meta) => {
  f = f || 2; thr = thr || 3;
  const src = () => V.defs[srcId];
  if (V.has(id)) return;
  const names = Object.keys((V.defs[srcId] && V.defs[srcId].parts) || {});
  const parts = {};
  for (const pn of names) parts[pn] = {
    get pivot() { const p = src().parts[pn].pivot; return [p[0] / f, p[1] / f, p[2] / f]; },
    build(v, o) { const d = src(); const g = V.grid(...d.size); d.build(V.grid(...d.size), o); void d.parts[pn].pivot; d.parts[pn].build(g, o); downsample(g, v, f, 1); },
  };
  V.def(id, {
    get size() { const d = src(); return d ? d.size.map(n => Math.ceil(n / f)) : [4, 4, 4]; },
    get scale() { const d = src(); return d ? d.scale * f : 0.1; },
    build(v, o) { const d = src(); if (!d) return; const g = V.grid(...d.size); d.build(g, o); downsample(g, v, f, thr); },
    parts,
    meta: Object.assign({}, (V.defs[srcId] && V.defs[srcId].meta) || {}, { group: 'lod', lodOf: srcId, gallery: null }, meta || {}),
  });
};
K.lod = (id, srcId, f, thr, meta) => {
  f = f || 2; thr = thr || 3;
  const src = () => V.defs[srcId];
  if (V.has(id)) return;
  V.def(id, {
    get size() { const d = src(); return d ? d.size.map(n => Math.ceil(n / f)) : [4, 4, 4]; },
    get scale() { const d = src(); return d ? d.scale * f : 0.1; },
    build(v, o) {
      const d = src(); if (!d) return;
      const [sx, sy, sz] = d.size, g = V.grid(sx, sy, sz); d.build(g, o);
      for (const pn in (d.parts || {})) { void d.parts[pn].pivot; d.parts[pn].build(g, o); }
      const cells = new Map();
      g.paint((x, y, z, hex) => { const k = ((x / f) | 0) + ',' + ((y / f) | 0) + ',' + ((z / f) | 0); let e = cells.get(k); if (!e) cells.set(k, e = { n: 0, c: {} }); e.n++; e.c[hex] = (e.c[hex] || 0) + 1 + (g.get(x, y + 1, z) ? 0 : 0.5); return null; });
      const prio = new Set(((meta && meta.lodPrio) || []).map(n => F.PAL[n]));   // colours that win a cell when present (windows, doors)
      for (const [k, e] of cells) { if (e.n < thr) continue; let best = null, bn = -1; for (const h in e.c) { const sc = e.c[h] + (prio.has(+h) ? 100 : 0); if (sc > bn) { bn = sc; best = +h; } } const [x, y, z] = k.split(',').map(Number); v.set(x, y, z, best); }
    },
    meta: Object.assign({ group: 'lod', lodOf: srcId }, meta || {}),
  });
};

treeDef('tree'); treeDef('n_tre');
treeDef('n_tre_eple', 'eple'); treeDef('n_tre_kirsebaer', 'kirsebær'); treeDef('n_tre_rund', 'rund'); treeDef('n_tre_bjork', 'bjørk');
treeDef('n_epletre', 'eple', true); treeDef('n_kirsebaertre', 'kirsebær', true);

/* ------------------------------------------------------------------ flowers */
K.oneFlower = (...a) => oneFlower(...a);
function oneFlower(v, x, z, h, kind, col, seed) {
  v.line(x, 0, z, x, h - 1, z, 'green');
  if (h > 4) { v.set(x + 1, 2, z, 'leaf2'); v.set(x - 1, 3, z, 'leaf2'); }
  if (kind === 'tulipan') { v.box(x - 1, h, z - 1, x + 1, h + 2, z + 1, col); v.clear(x, h + 2, z, x, h + 2, z); v.set(x, h + 1, z, 'butter'); v.set(x - 1, h + 2, z - 1, 0); v.set(x + 1, h + 2, z + 1, 0); }
  else if (kind === 'klokke') { v.set(x, h, z, col); v.box(x - 1, h - 1, z - 1, x + 1, h - 1, z + 1, col); v.set(x, h - 2, z, 'white'); }
  else K.flower(v, x, h, z, col, H(x, h, z, seed) < 0.5 ? 'yellow' : 'white');
}
K.def('n_blomst', {
  size: [7, 12, 7], scale: 1 / 16,
  build(v, o) { oneFlower(v, 3, 3, 7, o.kind || 'tulipan', o.col || 'rose', 1); },
  meta: { group: 'flower', gallery: [{ kind: 'tulipan', col: 'rose' }, { kind: 'rund', col: 'lilac' }, { kind: 'klokke', col: 'sky' }, { kind: 'tulipan', col: 'butter' }] },
});
if (!V.has('flower')) V.def('flower', Object.assign({}, V.defs.n_blomst, { id: 'flower' }));
K.def('n_blomster', { // a clump of 5–7 mixed flowers
  size: [16, 12, 16], scale: 1 / 16,
  build(v, o) {
    const r = F.U.rng((o.seed || 1) * 977), kinds = ['tulipan', 'rund', 'rund', 'klokke'];
    v.ellipsoid(7.5, 0, 7.5, 6, 1.5, 6, 'leaf2'); K.speck(v, 'leaf2', 'leaf', 0.3, 2);
    const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r(), d = 1.5 + r() * 4; oneFlower(v, Math.round(7.5 + Math.cos(a) * d), Math.round(7.5 + Math.sin(a) * d), 4 + Math.floor(r() * 4), F.U.pick(r, kinds), (o.cols && o.cols[i % o.cols.length]) || F.U.pick(r, K.PASTELS), i); }
  },
  meta: { group: 'flower', gallery: [{ seed: 1 }, { seed: 2 }, { seed: 3, cols: ['rose', 'pink'] }] },
});
K.def('n_solsikke', {
  size: [14, 36, 12], scale: 1 / 16,
  build(v) {
    v.box(6, 0, 5, 7, 27, 6, 'green');
    for (const [y, d] of [[8, 1], [14, -1], [20, 1]]) { v.box(d > 0 ? 8 : 2, y, 4, d > 0 ? 11 : 5, y + 1, 7, 'leaf'); v.set(d > 0 ? 12 : 1, y + 2, 5, 'leaf'); }
  },
  parts: { head: { pivot: [7, 28, 6], build(v) {
    v.cyl(6.5, 28, 7.5, 3.6, 1, 'woodDark'); // disc lies flat initially? -> make it face +z instead:
    v.clear(0, 28, 0, 13, 28, 11);
    for (let y = 24; y <= 35; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, y - 29.5); if (d <= 3.2) v.set(x, y, 8, H(x, y, 8, 4) < 0.3 ? 'brown' : 'woodDark'); else if (d <= 6 && (Math.round(Math.atan2(y - 29.5, x - 6.5) * 2.5) % 2 === 0 || d <= 5)) v.set(x, y, 8, d > 5 ? 'yellow' : 'honey'); }
    v.box(5, 27, 6, 8, 31, 7, 'leaf2');
  } } },
  meta: { group: 'flower' },
});
K.def('n_kjempesolsikke', { // landmark: giant sunflower (Kjempesolsikken), 1/8 → ~6 m
  size: [26, 52, 20], scale: 1 / 8,
  build(v) {
    v.box(11, 0, 8, 14, 38, 11, 'green'); v.box(10, 0, 7, 15, 3, 12, 'green');
    for (const [y, d] of [[10, 1], [18, -1], [26, 1], [32, -1]]) { v.ellipsoid(d > 0 ? 18.5 : 6.5, y, 9.5, 4.5, 1.5, 2.5, 'leaf'); }
    K.speck(v, 'leaf', 'leafDark', 0.25, 3);
  },
  parts: { head: { pivot: [13, 40, 10], build(v) {
    for (let y = 28; y < 52; y++) for (let x = 0; x < 26; x++) { const d = Math.hypot(x - 12.5, y - 40.5); if (d <= 6) { v.set(x, y, 13, H(x, y, 1, 2) < 0.35 ? 'brown' : 'woodDark'); v.set(x, y, 12, 'woodDark'); } else if (d <= 11.5) { const a = Math.atan2(y - 40.5, x - 12.5); if (d <= 8.5 || Math.cos(a * 12) > -0.2) { v.set(x, y, 12, d > 9.5 ? 'yellow' : 'honey'); } } }
    // happy face on the disc
    v.box(10, 42, 14, 10, 43, 14, 'black'); v.box(15, 42, 14, 15, 43, 14, 'black'); v.set(10, 43, 14, 'white'); v.set(15, 43, 14, 'white');
    v.box(11, 38, 14, 14, 38, 14, 'cherry'); v.set(10, 39, 14, 'cherry'); v.set(15, 39, 14, 'cherry'); v.set(9, 40, 14, 'blossom'); v.set(16, 40, 14, 'blossom');
    v.box(11, 34, 10, 14, 40, 11, 'leaf2');
  } } },
  meta: { group: 'landmark' },
});
K.def('n_lavendel', {
  size: [20, 14, 14], scale: 1 / 16,
  build(v, o) {
    v.ellipsoid(9.5, 1, 6.5, 9, 3, 6, 'grassDark'); K.speck(v, 'grassDark', 'mint', 0.25, 4);
    const r = F.U.rng((o.seed || 1) * 31);
    for (let i = 0; i < 26; i++) { const x = 2 + Math.floor(r() * 16), z = 1 + Math.floor(r() * 12); if (!v.get(x, 1, z)) continue; const h = 6 + Math.floor(r() * 6); v.line(x, 2, z, x, h - 3, z, 'grassDark'); v.box(x, h - 3, z, x, h, z, r() < 0.5 ? 'lavField' : (r() < 0.5 ? 'purple' : 'lilac')); }
  },
  meta: { group: 'flower' },
});
K.def('n_rosebusk', {
  size: [16, 14, 16], scale: 1 / 16,
  build(v, o) { K.blob(v, 7.5, 6, 7.5, 7, 6, 7, 'leaf', 3, 2); K.speck(v, 'leaf', 'leafDark', 0.3, 5); const c = o.col || 'rose'; K.speck(v, 'leaf', c, 0.12, 9, true); K.speck(v, 'leafDark', 'pink', 0.08, 11, true); },
  meta: { group: 'flower', gallery: [{}, { col: 'butter' }, { col: 'white' }] },
});

/* ------------------------------------------------------------------ bushes, grass, rocks, water plants */
K.def('n_busk', {
  size: [18, 13, 18], scale: 1 / 10,
  build(v, o) {
    const k = o.kind || 'rund';
    K.blob(v, 8.5, 5, 8.5, 8, 6, 8, 'leaf2', 4, o.seed || 2); K.speck(v, 'leaf2', 'leaf', 0.35, 3);
    v.clear(0, 0, 0, 17, 0, 17); v.box(7, 0, 7, 10, 1, 10, 'woodDark');
    if (k === 'blomst') { K.speck(v, 'leaf2', 'blossom', 0.12, 7, true); K.speck(v, 'leaf', 'white', 0.08, 8, true); }
    if (k === 'baer') K.speck(v, 'leaf', 'red', 0.12, 9, true);
  },
  meta: { group: 'plant', gallery: [{ kind: 'rund' }, { kind: 'blomst' }, { kind: 'baer' }] },
});
K.def('n_gress', {
  size: [8, 6, 8], scale: 1 / 16,
  build(v, o) { const r = F.U.rng((o.seed || 1) * 7); for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(r() * 6), z = 1 + Math.floor(r() * 6), h = 2 + Math.floor(r() * 4); v.line(x, 0, z, x, h, z, r() < 0.5 ? 'grass' : 'grassDark'); } },
  meta: { group: 'plant' },
});
K.def('n_siv', {
  size: [10, 24, 10], scale: 1 / 16,
  build(v) {
    const pts = [[2, 2, 18], [5, 4, 22], [7, 2, 16], [3, 7, 20], [7, 7, 14], [5, 1, 12]];
    for (const [x, z, h] of pts) { v.line(x, 0, z, x, h, z, 'grassDark'); if (h > 15) v.box(x, h - 5, z, x, h - 2, z, 'brown'); }
    v.line(1, 0, 5, 0, 9, 4, 'leaf2'); v.line(8, 0, 4, 9, 10, 3, 'leaf2');
  },
  meta: { group: 'plant' },
});
K.def('n_nokkerose', {
  size: [14, 4, 14], scale: 1 / 16,
  build(v, o) { for (let z = 0; z < 14; z++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, z - 6.5), a = Math.atan2(z - 6.5, x - 6.5); if (d <= 6.5 && !(a > -0.25 && a < 0.25)) v.set(x, 0, z, d < 1.5 ? 'leafDark' : 'leaf'); } if (o.flower !== false) { v.box(5, 1, 5, 8, 1, 8, 'pink'); v.box(6, 2, 6, 7, 2, 7, 'blossom'); v.set(6, 3, 6, 'butter'); v.set(4, 1, 6, 'pink'); v.set(9, 1, 7, 'pink'); v.set(6, 1, 4, 'pink'); v.set(7, 1, 9, 'pink'); } },
  meta: { group: 'plant' },
});
K.def('n_liljeblad', { // Blomsterfeen's lily-pad stepping stone (walkable), 1.4 m
  size: [14, 3, 14], scale: 1 / 10,
  build(v) { for (let z = 0; z < 14; z++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, z - 6.5), a = Math.atan2(z - 6.5, x - 6.5); if (d <= 6.6 && !(a > -0.3 && a < 0.3 && d > 2)) v.box(x, 0, z, x, d < 5 ? 1 : 0, z, d > 5.6 ? 'leafDark' : 'leaf'); } K.speck(v, 'leaf', 'leaf2', 0.2, 3, true); v.set(4, 2, 9, 'pink'); v.set(5, 2, 9, 'blossom'); v.set(4, 2, 10, 'pink'); },
  meta: { group: 'power' },
});
K.def('n_klover', { size: [8, 3, 8], scale: 1 / 16, build(v) { for (const [x, z] of [[2, 2], [5, 2], [2, 5], [5, 5]]) v.box(x - 1, 1, z - 1, x, 1, z, 'leaf2'); v.box(3, 0, 3, 4, 1, 4, 'leaf'); v.set(1, 2, 1, 'white'); v.set(6, 2, 6, 'white'); }, meta: { group: 'plant' } });
K.def('n_firklover', { size: [10, 6, 10], scale: 1 / 16, build(v) { v.line(5, 0, 5, 5, 3, 5, 'green'); for (const [x, z] of [[3, 3], [7, 3], [3, 7], [7, 7]]) { v.box(x - 1, 4, z - 1, x, 4, z, 'leaf'); v.set(x, 5, z, 'leaf2'); } v.box(4, 4, 4, 5, 4, 5, 'leafDark'); v.set(5, 5, 5, 'glowYellow'); }, meta: { group: 'collect' } });
K.def('n_sopp', { size: [10, 10, 10], scale: 1 / 16, build(v) { v.cyl(4.5, 0, 4.5, 1.6, 5, 'cream'); v.ellipsoid(4.5, 6, 4.5, 4.5, 2.6, 4.5, 'red'); v.clear(0, 0, 0, 9, 5, 9); v.cyl(4.5, 0, 4.5, 1.6, 6, 'cream'); K.speck(v, 'red', 'white', 0.18, 3, true); }, meta: { group: 'plant' } });
K.def('n_stein', {
  size: [14, 8, 12], scale: 1 / 10,
  build(v, o) {
    const k = o.kind || 'liten';
    if (k === 'stor') K.blob(v, 6.5, 3, 5.5, 6, 4.5, 5, 'grey', 2, 4);
    else if (k === 'flat') v.ellipsoid(6.5, 0.5, 5.5, 6.5, 1.8, 5.5, 'stone2');
    else K.blob(v, 6.5, 1.5, 5.5, 4, 3, 3.5, 'grey', 1, 2);
    K.speck(v, 'grey', 'stoneDark', 0.25, 5); K.speck(v, 'stone2', 'stoneDark', 0.2, 5);
    v.paint((x, y, z, c) => (y >= 3 && !v.get(x, y + 1, z) && H(x, y, z, 6) < 0.35 ? 'grassDark' : null));
  },
  meta: { group: 'rock', gallery: [{ kind: 'liten' }, { kind: 'stor' }, { kind: 'flat' }] },
});

/* ------------------------------------------------------------------ snow */
K.def('n_snomann', {
  size: [18, 32, 16], scale: 1 / 16,
  build(v) { v.sphere(8.5, 5.5, 7.5, 5.8, 'snow'); K.speck(v, 'snow', 'ice', 0.15, 2); },
  parts: {
    mid: { pivot: [9, 11, 8], build(v) { v.sphere(8.5, 13.5, 7.5, 4.4, 'snow'); for (const y of [12, 14, 16]) v.set(8, y, 12, 'black'); v.line(4, 14, 7, 0, 17, 7, 'woodDark'); v.line(13, 14, 7, 17, 17, 7, 'woodDark'); v.set(0, 18, 7, 'woodDark'); v.set(17, 18, 7, 'woodDark'); v.box(4, 16, 4, 13, 17, 11, 'red'); v.box(11, 12, 11, 12, 16, 11, 'red'); v.set(11, 11, 11, 'white'); v.set(12, 11, 11, 'white'); for (const [x, y] of [[0, 18], [17, 18]]) { v.box(x, y, 6, x, y + 1, 8, 'mint'); } v.set(8, 12, 12, 'red'); v.set(8, 14, 12, 'butter'); v.set(8, 16, 12, 'sky'); } },
    head: { pivot: [9, 17, 8], build(v) { v.sphere(8.5, 20.5, 7.5, 3.6, 'snow'); v.set(7, 21, 11, 'black'); v.set(10, 21, 11, 'black'); v.set(7, 22, 11, 'black'); v.set(10, 22, 11, 'black'); v.box(8, 20, 11, 9, 20, 14, 'orange'); v.box(7, 18, 11, 10, 18, 11, 'black'); v.set(6, 19, 11, 'blossom'); v.set(11, 19, 11, 'blossom'); } },
    hat: { pivot: [9, 23, 6], build(v) { v.box(6, 23, 3, 11, 23, 8, 'navySoft'); v.box(7, 24, 4, 10, 27, 7, 'navySoft'); v.box(7, 24, 4, 10, 24, 7, 'red'); v.set(10, 25, 7, 'butter'); v.set(9, 25, 7, 'blossom'); } },
  },
  meta: { group: 'snow' },
});
K.def('n_akebakke', { // a red sled (sled hill marker)
  size: [12, 8, 22], scale: 1 / 16,
  build(v) { v.box(1, 3, 2, 10, 4, 18, 'red'); v.box(1, 5, 2, 1, 6, 15, 'red'); v.box(10, 5, 2, 10, 6, 15, 'red'); for (const x of [1, 10]) { v.box(x, 0, 2, x, 0, 20, 'silver'); v.line(x, 1, 20, x, 3, 18, 'silver'); v.set(x, 1, 3, 'silver'); v.set(x, 2, 3, 'silver'); } v.line(3, 4, 19, 8, 4, 19, 'woodLight'); v.box(4, 5, 4, 7, 5, 7, 'butter'); },
  meta: { group: 'snow' },
});
K.def('n_skoytedam', { // skating pond 6 × 4.5 m: blue ice with white skate curls and a snowy rim
  size: [50, 2, 38], scale: 1 / 8,
  build(v) {
    for (let z = 0; z < 38; z++) for (let x = 0; x < 50; x++) {
      const d = ((x - 24.5) / 24.5) ** 2 + ((z - 18.5) / 18.5) ** 2; if (d > 1) continue;
      if (d > 0.82) { v.set(x, 0, z, 'snow'); if (H(x, 1, z, 2) < 0.45) v.set(x, 1, z, 'snow'); continue; }
      const r1 = Math.hypot(x - 16, z - 17), r2 = Math.hypot(x - 33, z - 20), curl = Math.abs(r1 - 7) < 0.6 || Math.abs(r2 - 5) < 0.6 || Math.abs(r2 - 9) < 0.55;
      v.set(x, 0, z, curl ? 'white' : (d > 0.72 ? 'ice' : (H(x, 0, z, 3) < 0.14 ? 'ice' : 'sky')));
    }
  },
  meta: { group: 'snow' },
});
K.def('n_snohaug', { size: [20, 12, 18], scale: 1 / 10, build(v) { K.blob(v, 9.5, 2, 8.5, 9, 6, 8, 'snow', 3, 5); K.speck(v, 'snow', 'ice', 0.2, 3);
  v.paint((x, y, z, c) => (y <= 2 && z >= 12 ? 'ice' : null)); // blue shade at the foot
  v.box(14, 6, 9, 14, 9, 9, 'woodDark'); v.set(13, 9, 9, 'woodDark'); v.set(15, 8, 9, 'woodDark'); // a twig
  for (const [x, y, z] of [[6, 7, 10], [11, 8, 6], [4, 5, 14], [9, 8, 12]]) if (v.get(x, y - 1, z)) v.set(x, y, z, 'white');
  v.box(5, 5, 15, 7, 6, 16, 'red'); v.set(6, 7, 15, 'white'); // a forgotten red mitten
}, meta: { group: 'snow' } });

/* ------------------------------------------------------------------ crystals */
function prism(v, cx, cz, r, h, c, lean) {
  for (let y = 0; y < h; y++) { const rr = y > h - r - 1 ? Math.max(0.3, r * (h - y) / (r + 1)) : r; const ox = lean ? lean * y / h : 0; v.cyl(cx + ox, y, cz, rr, 1, c); }
}
const KRYS = [['crystal', 0, 0, 2.2, 16], ['gRose', -4, 1, 1.6, 11], ['gLilac', 4, -1, 1.8, 13], ['gAqua', -2, -4, 1.4, 9], ['gIce', 3, 4, 1.3, 8]];
K.def('n_krystaller', {
  size: [18, 20, 16], scale: 1 / 16,
  build(v) { v.ellipsoid(8.5, 0, 7.5, 8, 2, 7, 'stone2'); K.speck(v, 'stone2', 'grey', 0.2, 3); },
  parts: Object.fromEntries(KRYS.map(([c, dx, dz, r, h], i) => ['k' + (i + 1), { pivot: [8.5 + dx, 1, 7.5 + dz], build(v) { const g = V.grid(18, 20, 16); prism(g, 8.5 + dx, 7.5 + dz, r, h, c, dx * 0.4); for (let z = 0; z < 16; z++) for (let y = 0; y < 19; y++) for (let x = 0; x < 18; x++) if (g.get(x, y, z)) v.set(x, y + 1, z, c); } }])),
  meta: { group: 'crystal' },
});
K.def('n_krystallhoyde', { // landmark Krystallhøyden: a hill of giant crystals, 1/8 → 5 m
  size: [40, 44, 36], scale: 1 / 8,
  build(v) {
    K.blob(v, 19.5, 2, 17.5, 18, 7, 16, 'stone2', 4, 3); v.clear(0, 0, 0, 39, -1, 35); K.speck(v, 'stone2', 'lavender', 0.12, 4, true); K.speck(v, 'stone2', 'grey', 0.2, 5);
    const sets = [['crystal', 19, 17, 4, 40, 0], ['gRose', 11, 20, 3, 26, -4], ['gLilac', 27, 14, 3.4, 30, 5], ['gAqua', 15, 9, 2.6, 20, -3], ['gIce', 26, 25, 2.6, 22, 3], ['gRose', 31, 22, 2, 14, 4], ['crystal', 8, 12, 2, 13, -3]];
    for (const [c, x, z, r, h, l] of sets) { const g = V.grid(40, 44, 36); prism(g, x, z, r, h, c, l); for (let zz = 0; zz < 36; zz++) for (let y = 0; y < 44 - 5; y++) for (let xx = 0; xx < 40; xx++) if (g.get(xx, y, zz)) v.set(xx, y + 5, zz, c); }
  },
  meta: { group: 'landmark' },
});

/* ------------------------------------------------------------------ beach */
K.def('n_skjell', {
  size: [12, 8, 12], scale: 1 / 16,
  build(v) { for (let z = 2; z < 11; z++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, z - 2); if (d <= 7.5 && z >= 2) v.set(x, 0, z, Math.round(Math.atan2(z - 2, x - 5.5) * 4) % 2 ? 'peach' : 'coral'); } v.box(4, 0, 1, 7, 1, 2, 'coral'); v.box(4, 1, 5, 6, 2, 7, 'white'); v.set(5, 2, 6, 'milk'); },
  parts: { top: { pivot: [6, 1, 2], build(v) { for (let z = 2; z < 11; z++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, z - 2); if (d <= 7.5) v.set(x, 1 + Math.round((7.5 - d) * 0.35), z, Math.round(Math.atan2(z - 2, x - 5.5) * 4) % 2 ? 'peach' : 'blossom'); } } } },
  meta: { group: 'beach' },
});
function sandcastle(v, s, x0, z0) {
  v.box(x0, 0, z0, x0 + 13 * s, 3 * s, z0 + 11 * s, 'sand'); K.speck(v, 'sand', 'hay', 0.12, 2);
  v.box(x0 + 5 * s, 3 * s, z0 + 11 * s, x0 + 8 * s, 6 * s, z0 + 11 * s, 'woodLight');
}
function tower(v, cx, cz, r, h, y0) { v.cyl(cx, y0, cz, r, h, 'sand'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; if (i % 2 === 0) v.set(Math.round(cx + Math.cos(a) * r), y0 + h, Math.round(cz + Math.sin(a) * r), 'sand'); } K.speck(v, 'sand', 'hay', 0.1, 3); }
K.def('n_sandslott', {
  size: [24, 22, 20], scale: 1 / 16,
  build(v) { v.box(3, 0, 3, 20, 4, 16, 'sand'); for (let x = 3; x <= 20; x += 2) { v.set(x, 5, 3, 'sand'); v.set(x, 5, 16, 'sand'); } v.box(10, 0, 16, 13, 3, 16, 'woodLight'); v.clear(11, 0, 16, 12, 2, 16); K.speck(v, 'sand', 'hay', 0.1, 5); v.set(5, 0, 18, 'coral'); v.set(18, 0, 18, 'peach'); },
  parts: {
    t1: { pivot: [5, 5, 5], build(v) { tower(v, 5, 5, 2.4, 7, 5); v.line(5, 13, 5, 5, 16, 5, 'woodDark'); v.box(6, 15, 5, 8, 16, 5, 'rose'); } },
    t2: { pivot: [18, 5, 5], build(v) { tower(v, 18, 5, 2.4, 9, 5); } },
    t3: { pivot: [12, 5, 10], build(v) { tower(v, 11.5, 10, 3.2, 12, 5); v.line(11, 18, 10, 11, 21, 10, 'woodDark'); v.box(12, 20, 10, 14, 21, 10, 'sky'); } },
  },
  meta: { group: 'beach' },
});
K.def('n_sandslott_stor', { // landmark Sandslottet, 1/8 → 5 m
  size: [44, 40, 36], scale: 1 / 8,
  build(v) {
    v.box(4, 0, 4, 39, 10, 31, 'sand'); for (let x = 4; x <= 39; x += 2) { v.set(x, 11, 4, 'sand'); v.set(x, 11, 31, 'sand'); } for (let z = 4; z <= 31; z += 2) { v.set(4, 11, z, 'sand'); v.set(39, 11, z, 'sand'); }
    for (const [x, z, r, h] of [[6, 6, 4, 22], [37, 6, 4, 22], [6, 29, 4, 20], [37, 29, 4, 20], [21.5, 17.5, 6, 28]]) tower(v, x, z, r, h, 0);
    v.box(18, 0, 31, 25, 8, 31, 'woodLight'); v.clear(19, 0, 31, 24, 7, 31); v.box(19, 0, 32, 24, 0, 35, 'woodLight');
    for (const [x, z, h] of [[21, 17, 29], [6, 6, 23]]) { v.line(x, h, z, x, h + 8, z, 'woodDark'); v.box(x + 1, h + 5, z, x + 5, h + 8, z, 'rose'); }
    K.speck(v, 'sand', 'hay', 0.12, 7); K.speck(v, 'sand', 'peach', 0.03, 9, true);
    for (let i = 0; i < 6; i++) v.set(8 + i * 5, 11, 4, i % 2 ? 'coral' : 'white');
  },
  meta: { group: 'landmark' },
});
K.def('n_strandball', { size: [8, 8, 8], scale: 1 / 16, build(v) { v.sphere(3.5, 3.5, 3.5, 3.6, 'white'); v.paint((x, y, z) => { const a = Math.atan2(z - 3.5, x - 3.5); const s = Math.floor((a + Math.PI) / (Math.PI / 3)); return ['red', 'white', 'blue', 'white', 'yellow', 'white'][s % 6]; }); }, meta: { group: 'beach' } });

/* ------------------------------------------------------------------ farm-ish */
K.def('n_bikube', {
  size: [14, 18, 14], scale: 1 / 10,
  build(v) {
    v.box(2, 0, 2, 11, 3, 11, 'woodLight'); v.box(3, 0, 3, 4, 2, 4, 'woodDark'); v.box(9, 0, 9, 10, 2, 10, 'woodDark'); v.box(3, 0, 9, 4, 2, 10, 'woodDark'); v.box(9, 0, 3, 10, 2, 4, 'woodDark');
    for (let i = 0; i < 9; i++) v.cyl(6.5, 4 + i, 6.5, 5.2 - Math.max(0, i - 3) * 0.75, 1, i % 2 ? 'honey' : 'hay');
    v.box(6, 4, 11, 7, 5, 12, 'woodDark');
    v.box(10, 4, 11, 12, 6, 13, 'gGold'); v.box(10, 4, 11, 12, 5, 13, 'honey'); v.box(10, 7, 11, 12, 7, 13, 'red');
  },
  parts: { bees: { pivot: [7, 10, 7], build(v) { for (const [x, y, z] of [[1, 12, 6], [12, 9, 3], [8, 15, 12]]) { v.set(x, y, z, 'yellow'); v.set(x + 1, y, z, 'black'); v.set(x, y + 1, z, 'white'); } } } },
  meta: { group: 'farm' },
});
K.def('n_hoyball', {
  size: [16, 12, 14], scale: 1 / 10,
  build(v) { for (let x = 1; x < 15; x++) for (let y = 0; y < 12; y++) for (let z = 0; z < 14; z++) { const d = Math.hypot(y - 5.5, z - 6.5); if (d <= 5.8) v.set(x, y, z, (x === 1 || x === 14) ? (Math.round(d) % 2 ? 'honey' : 'hay') : (H(x, y, z, 2) < 0.2 ? 'honey' : 'hay')); } v.box(5, 0, 0, 5, 11, 13, 0); v.paint((x, y, z) => (x === 5 ? 'woodRed' : null)); for (let y = 0; y < 12; y++) for (let z = 0; z < 14; z++) if (Math.hypot(y - 5.5, z - 6.5) <= 5.9) { v.set(5, y, z, 'woodRed'); v.set(10, y, z, 'woodRed'); } },
  parts: { kitten: { pivot: [8, 9, 9], build(v) { v.box(6, 9, 7, 9, 11, 9, 'orange'); v.box(6, 12, 7, 9, 14, 10, 'orange'); v.set(6, 15, 8, 'orange'); v.set(9, 15, 8, 'orange'); v.set(7, 13, 10, 'black'); v.set(9, 13, 10, 'black'); v.set(8, 12, 10, 'pink'); v.box(6, 12, 10, 6, 12, 10, 'blossom'); v.box(9, 9, 6, 9, 9, 4, 'orange'); } } },
  meta: { group: 'farm' },
});

/* ------------------------------------------------------------------ learning spots + collectibles */
K.def('n_bokstavsteiner', {
  size: [34, 6, 14], scale: 1 / 10,
  build(v) { for (let x = 0; x < 34; x += 3) if (H(x, 0, 0, 2) < 0.6) v.set(x, 0, 12, 'grassDark'); },
  parts: Object.fromEntries([0, 1, 2, 3, 4].map(i => {
    const cx = 3.5 + i * 6.7, cz = 6 + Math.round(Math.sin(i / 4 * Math.PI) * -2.5);
    const pc = ['peach', 'mint', 'sky', 'butter', 'lilac'][i];
    return ['s' + (i + 1), { pivot: [cx, 0, cz], build(v) { v.ellipsoid(cx, 1, cz, 3.2, 3, 3.2, 'stone2'); v.clear(Math.floor(cx - 4), 4, Math.floor(cz - 4), Math.ceil(cx + 4), 5, Math.ceil(cz + 4)); v.paint((x, y, z) => (y === 3 || (y === 2 && !v.get(x, y + 1, z)) ? pc : null)); K.speck(v, 'stone2', 'stone', 0.25, i + 2); v.set(Math.round(cx) + 2, 3, Math.round(cz) - 2, 'white'); } }];
  })),
  meta: { group: 'learn', labels: [0, 1, 2, 3, 4].map(i => [(3.5 + i * 6.7 - 17) / 10, 0.45, (6 + Math.round(Math.sin(i / 4 * Math.PI) * -2.5) - 7) / 10]) },
});
K.def('n_tryllepunkt', { // fairy power spot: a glowing star mosaic in a ring of crystal + flower posts (visible from far away)
  size: [32, 8, 32], scale: 1 / 16,
  build(v) {
    for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
      const dx = x - 15.5, dz = z - 15.5, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx), R = 4.2 + 3.4 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2);
      if (d < R) v.set(x, 0, z, d < 2.2 ? 'white' : 'glowYellow');
      else if (d < 11.2 && d > 10) v.set(x, 0, z, H(x, 0, z, 4) < 0.5 ? 'butter' : 'white');
      else if (d < 12 && H(x, 0, z, 3) < 0.08) v.set(x, 0, z, 'glowYellow');
    }
  },
  parts: { ring: { pivot: [16, 0, 16], build(v) {
    K.ring(v, 15.5, 0, 15.5, 14, i => (i % 6 < 3 ? 'pink' : (i % 12 < 6 ? 'lilac' : 'sky')));
    K.ring(v, 15.5, 1, 15.5, 14, i => (i % 6 < 3 ? 'pink' : (i % 12 < 6 ? 'lilac' : 'sky')));
    K.ring(v, 15.5, 0, 15.5, 13, i => (i % 5 === 0 ? 'white' : 'butter'));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.round(15.5 + Math.cos(a) * 13.5), z = Math.round(15.5 + Math.sin(a) * 13.5);
      if (i % 2 === 0) { v.box(x, 1, z, x, 5, z, 'crystal'); v.set(x, 6, z, 'glowYellow'); v.set(x + 1, 3, z, 'crystal'); }
      else { v.box(x, 1, z, x, 3, z, 'leaf'); v.set(x, 4, z, 'butter'); for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(x + ox, 4, z + oz, i % 4 === 1 ? 'rose' : 'lilac'); }
    }
  } } },
  meta: { group: 'learn' },
});
K.def('n_taptting', { // glittering marker for a lost item (the item model itself is placed on top by the quest code)
  size: [14, 12, 14], scale: 1 / 16,
  build(v) { for (const [x, y, z] of [[2, 6, 3], [11, 9, 4], [6, 11, 10], [12, 3, 11], [1, 2, 9]]) { v.set(x, y, z, 'glowYellow'); v.set(x + 1, y, z, 'white'); v.set(x - 1, y, z, 'white'); v.set(x, y + 1, z, 'white'); v.set(x, y - 1, z, 'white'); } K.ring(v, 6.5, 0, 6.5, 5.5, i => (i % 3 ? 'butter' : 'glowYellow')); },
  meta: { group: 'learn' },
});
K.def('n_gullbokstav', { size: [10, 12, 4], scale: 1 / 16, build(v) { K.rbox(v, 0, 1, 0, 9, 11, 3, 'gold'); v.box(1, 2, 3, 8, 10, 3, 'butter'); v.set(0, 11, 3, 'glowYellow'); v.set(9, 1, 3, 'glowYellow'); v.box(3, 0, 1, 6, 0, 2, 'honey'); }, meta: { group: 'collect', labels: [[0, 0.4, 0.15]] } });

/* ------------------------------------------------------------------ fairy power pieces */
K.def('n_krystallbro', { // 1 m long, 2 m wide walkable segment; tile along z (deck top at y = 0.3 m)
  size: [20, 10, 10], scale: 1 / 10,
  build(v) {
    v.box(0, 2, 0, 19, 2, 9, 'gIce'); v.box(1, 1, 0, 18, 1, 9, 'crystal');
    for (let z = 0; z < 10; z += 3) { v.box(0, 3, z, 0, 6, z, 'crystal'); v.box(19, 3, z, 19, 6, z, 'crystal'); v.set(0, 7, z, 'gLilac'); v.set(19, 7, z, 'gLilac'); }
    v.box(0, 6, 0, 0, 6, 9, 'gIce'); v.box(19, 6, 0, 19, 6, 9, 'gIce');
    for (let x = 2; x < 18; x += 4) v.set(x, 2, 4, 'white');
  },
  meta: { group: 'power', deckY: 0.3 },
});
K.def('n_stjernebro', {
  size: [20, 10, 10], scale: 1 / 10,
  build(v) {
    v.box(0, 2, 0, 19, 2, 9, 'gGold'); for (let x = 0; x < 20; x++) v.set(x, 1, 0, ['gRose', 'gPeach', 'gGold', 'gMint', 'gSky', 'gLilac'][Math.floor(x / 3.4)]);
    for (let z = 1; z < 10; z += 4) for (const x of [0, 19]) { v.box(x, 3, z, x, 5, z, 'gold'); v.set(x, 6, z, 'glowYellow'); v.set(x, 7, z, 'glowYellow'); }
    for (let x = 3; x < 18; x += 5) v.set(x, 2, 5, 'glowYellow');
  },
  meta: { group: 'power', deckY: 0.3 },
});
K.def('n_vinstige', { // vine ladder, 3 m tall, leans against walls (back = −z)
  size: [12, 48, 4], scale: 1 / 16,
  build(v) {
    for (let y = 0; y < 48; y++) { const w = Math.round(Math.sin(y * 0.4)); v.set(1 + w, y, 1, 'leafDark'); v.set(10 - w, y, 1, 'leafDark'); if (y % 3 === 0) { v.set(w > 0 ? 3 : 0, y, 2, 'leaf'); v.set(w > 0 ? 8 : 11, y, 2, 'leaf'); } }
    for (let y = 3; y < 48; y += 6) { v.box(2, y, 1, 9, y, 1, 'green'); v.set(5, y + 1, 2, y % 12 === 3 ? 'pink' : 'butter'); v.set(6, y + 1, 2, 'white'); }
  },
  meta: { group: 'power' },
});
K.def('n_boblepute', { // Boblefeen's bouncy bubble stepping cushion (walkable), 1.2 m
  size: [12, 6, 12], scale: 1 / 10,
  build(v) {
    for (let z = 0; z < 12; z++) for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot((x - 5.5) / 5.6, (y - 1) / 4.2, (z - 5.5) / 5.6); if (d <= 1 && y >= 0) v.set(x, y, z, y <= 1 ? 'teal' : 'sky'); }
    v.box(3, 4, 7, 4, 4, 8, 'white'); v.set(4, 5, 6, 'white'); v.set(8, 3, 9, 'white'); K.speck(v, 'sky', 'lilac', 0.08, 3, true);
  },
  meta: { group: 'power' },
});
K.def('n_storboble', { // Boblefeen's ride bubble, 1.8 m
  size: [18, 18, 18], scale: 1 / 10,
  build(v) {
    for (let z = 0; z < 18; z++) for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) { const d = Math.hypot(x - 8.5, y - 8.5, z - 8.5); if (d <= 8.6 && d > 7.6) v.set(x, y, z, ((x + y) % 7 === 0 && y > 11) ? 'white' : (y > 12 ? 'gAqua' : (x > 11 ? 'gLilac' : 'gSky'))); }
    v.box(5, 13, 14, 6, 14, 15, 'white'); v.set(7, 15, 14, 'white');
  },
  meta: { group: 'power' },
});
/* ------------------------------------------------------------------ low-poly decor variants (for merged chunk decor far from paths) */
K.lod('n_tre_lo', 'n_tre', 2, 3, { gallery: [{ kind: 'eple' }, { kind: 'kirsebær' }, { kind: 'rund' }, { kind: 'bjørk' }] });
K.lod('n_busk_lo', 'n_busk', 2, 3);
K.lodParts('n_epletre_lo', 'n_epletre', 2, 3);
})();
