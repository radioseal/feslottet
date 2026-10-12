/* Feslottet – WP5 BEASTS: the open-world animal models + the F.Beasts API (DESIGN2 §4.2–4.3). Owner: WP5.
   Same conventions as m_animals.js (micro-voxels 1/16 m, palette names only, front +z, origin bottom centre, chibi: big head, big eyes, blush).
   NEW MODELS (22): sommerfugl marihøne gresshoppe maur øyenstikker rådyr grevling bever oter hegre hare sjøstjerne eremittkreps lunde manet
     blekksprut reke sjøhest lemen moskus isbjørnunge elefantunge
   KINDS: fugl_<kind> (spurv lerke vipe meis trost hakkespett kråke skjære svale tjeld rype), fisk_<kind> (gull makrell torsk);
     recolours hare{c:'snow'}, rev{c:'snow'} (m_animals.js).
   LEGENDS (lg_*): enhjørning vingehest skylam krystallhjort solhare perlehval kjempeskilpadde månekatt (overlays on the family models).
   RIGS: everything uses the m_animals part names so F.Rig.tick animates it (legs*, head, tail, wingL/R, clawL/R, earL/R; 'flutter' = insect wings).
   API (DESIGN2 §9.2, replaces the stub):
     F.Beasts.make(spId, {merged}) -> THREE.Group (kind, opts, glitter and legend applied; obj.name = VOX model id so F.Rig works; userData.sp, userData.glitter)
       default: a skinned rig (1 draw call; 2–3 with glass/glow voxels), parts are Bones; {vox:true} -> classic VOX group (one mesh per part)
       {merged:true} -> one Mesh (the inst geometry, 1 draw call, no rig) for a tight draw-call budget
     F.Beasts.thumb(spId, px=128, {sil}) -> dataURL (cached; sil:true|colour = flat silhouette for the album)      F.Beasts.inst(spId) -> {geometry, material} (greedy-meshed rest pose, shared material)
     F.Beasts.has(spId)   F.Beasts.spec(spId) -> {model, opts, glitter}   F.Beasts.ids() (110 species)   F.Beasts.tris(spId)
     F.Glitter.apply(group, 'krystall'|'blomst'|'boble'|'stjerne') – generic: 60 % vertex-colour remap + attachments (shards, crown, bubbles, star trail).
   FALLBACK: F.Beasts.FALLBACK maps a missing model to the nearest family model + recolour (the album never breaks). */
(function () {
'use strict';
const F = window.F;
function models() {
const V = F.VOX, P = F.PAL, H = F.U.hash2;
const K = F.AnimKit;
const { quad, bird, horse, eye, front, tube, earTri, speck, surfSpeck, exposed, pick, S16 } = K || {};

/* ---------------------------------------------------------- helpers */
// set the top-most voxel at (x, z) (dy = 1: one above it)
function top(v, x, z, c, dy) { for (let y = v.size[1] - 1; y >= 0; y--) if (v.get(x, y, z)) { v.set(x, y + (dy || 0), z, c); return y; } return -1; }
// cute eye looking UP (flat animals seen from above): 2×2 black with a white highlight on the top surface
function eyeUp(v, x, z) { top(v, x, z, 'black'); top(v, x + 1, z, 'black'); top(v, x, z + 1, 'black'); top(v, x + 1, z + 1, 'white'); }
// recolour every voxel of colour a to b
const swap = (v, a, b) => v.paint((x, y, z, c) => (c === P[a] ? P[b] : null));
/* derive(id, baseId, D): a new def = the base model blitted into a bigger grid + extras (legend overlays).
   D = { pad:[x (each side), y (top), z (each side)], lift (shift up), opts (base options), body(v,o,I), parts:{name(v,o,I)}, newParts:{name: I => ({pivot, build})},
         recolor(v,o,I,part), scaleK, meta }   I = { px, ly, pz, X(x), Y(y), Z(z), size } maps base coordinates into the new grid. */
function derive(id, baseId, D) {
  const bd = V.defs[baseId]; if (!bd) return null;
  const [bw, bh, bl] = bd.size, pad = D.pad || [0, 0, 0], px = pad[0], pz = pad[2], ly = D.lift || 0;
  const size = [bw + 2 * px, bh + pad[1] + ly, bl + 2 * pz];
  const I = { px, ly, pz, X: x => x + px, Y: y => y + ly, Z: z => z + pz, size, base: bd.size };
  const bo = o => Object.assign({}, D.opts || {}, o || {});
  const blit = (dst, fn, o) => {
    const s = V.grid(bw, bh, bl); fn(s, o); const sd = s.data, dd = dst.data, SX = size[0], SY = size[1];
    for (let z = 0; z < bl; z++) for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const k = sd[x + bw * (y + bh * z)]; if (k) dd[(x + px) + SX * ((y + ly) + SY * (z + pz))] = k; }
  };
  const parts = {};
  for (const pn in (bd.parts || {})) {
    const p = bd.parts[pn], pv = p.pivot || [bw / 2, 0, bl / 2];
    parts[pn] = { pivot: [pv[0] + px, pv[1] + ly, pv[2] + pz], build(v, o) { o = bo(o); blit(v, p.build, o); if (D.parts && D.parts[pn]) D.parts[pn](v, o, I); if (D.recolor) D.recolor(v, o, I, pn); } };
  }
  for (const pn in (D.newParts || {})) parts[pn] = D.newParts[pn](I);
  return V.def(id, { size, scale: bd.scale * (D.scaleK || 1), build(v, o) { o = bo(o); blit(v, bd.build, o); if (D.body) D.body(v, o, I); if (D.recolor) D.recolor(v, o, I, 'body'); },
    parts, meta: Object.assign({}, bd.meta, { base: baseId, by: 'wp5', variants: undefined }, D.meta || {}) });
}
const M = (meta) => Object.assign({ group: 'dyr', react: 'pet', by: 'wp5' }, meta);

if (K) {
/* ================================================================ INSECTS & SMALL CRAWLERS (pages 10, 13, 14, 15) */
// sommerfugl: flat colourful wings (parts wingL/wingR, rig 'flutter' beats them upward), plum body, curly antennae
V.def('sommerfugl', { size: [19, 10, 13], scale: S16, build(v) {
  tube(v, [[9, 3, 2], [9, 3.4, 6], [9, 3.6, 9]], 1.2, 'plum');
  v.sphere(9, 4, 10.6, 1.9, 'plum');
  v.paint((x, y, z, c) => c === P.plum && z < 9 && z % 2 === 0 ? P.lavender : null);
  eye(v, 7, 4, 2, 2); eye(v, 10, 4, 1, 2); front(v, 9, 3, 'rose');
  v.line(8, 6, 11, 6, 9, 12, 'plum'); v.line(10, 6, 11, 12, 9, 12, 'plum'); v.set(6, 9, 11, 'pink'); v.set(12, 9, 11, 'pink');
}, parts: (() => {
  const wing = (v, o, sgn) => {
    const c = pick(o, 'c', 'sky'), c2 = pick(o, 'c2', { sky: 'lavender', pink: 'butter', butter: 'orange', orange: 'butter' }[c] || c), edge = pick(o, 'edge', 'navySoft'), cx = 9 + sgn * 0.5;
    const fw = [cx + sgn * 4.6, 7.6, 4.4, 3.4, c], hw = [cx + sgn * 3.6, 3.4, 3.4, 2.6, c2];   // forewing (front), hindwing (back)
    for (const [ex, ez, rx, rz, wc] of [fw, hw]) for (let z = 0; z < 13; z++) for (let x = 0; x < 19; x++) {
      if ((x - 9) * sgn < 1) continue;
      const q = ((x - ex) / rx) ** 2 + ((z - ez) / rz) ** 2; if (q > 1) continue;
      v.set(x, 4 + Math.floor(Math.abs(x - 9) / 4), z, q > 0.62 ? edge : q < 0.18 ? pick(o, 'spot', 'white') : wc);
    }
    for (const [dx, dz] of [[6.4, 9.6], [5.6, 2.2]]) { const x = Math.round(cx + sgn * dx); v.set(x, 4 + Math.floor(Math.abs(x - 9) / 4), Math.round(dz), 'white'); }
  };
  return { wingL: { pivot: [9.5, 4.5, 6], build(v, o) { wing(v, o, 1); } }, wingR: { pivot: [8.5, 4.5, 6], build(v, o) { wing(v, o, -1); } } };
})(), meta: M({ rig: 'flutter', fly: true, variants: { c: ['sky', 'pink', 'butter', 'orange'] } }) });

// marihøne: red dome with black spots and seam, black head with big white eyes
V.def('marihøne', { size: [12, 9, 15], scale: S16, build(v) {
  v.ellipsoid(5.5, 1.6, 6.4, 4.6, 5.4, 5.6, 'red'); v.box(0, 0, 0, 11, 0, 14, 0);
  v.paint((x, y, z, c) => c === P.red && (x === 5 || x === 6) && y >= 4 && z <= 10 ? P.black : null);
  const spots = [[3, 6.4, 3.6], [8, 6.4, 3.6], [2, 4.4, 7.6], [9, 4.4, 7.6], [3.4, 6.8, 8.6], [7.6, 6.8, 8.6]];
  v.paint((x, y, z, c) => c === P.red && spots.some(([sx, sy, sz]) => (x - sx) ** 2 + (y - sy) ** 2 * 0.5 + (z - sz) ** 2 < 0.9) ? P.black : null);
  v.ellipsoid(5.5, 2.6, 11.6, 2.5, 2.1, 1.9, 'black'); v.box(0, 0, 9, 11, 0, 14, 0);
  for (const [x, px] of [[3, 4], [7, 7]]) { v.box(x, 2, 13, x + 1, 3, 13, 'white'); v.set(px, 2, 13, 'black'); v.set(px, 3, 13, 'black'); }
  v.set(5, 1, 13, 'rose'); v.set(6, 1, 13, 'rose');
  v.line(4, 4, 12, 3, 6, 14, 'black'); v.line(7, 4, 12, 8, 6, 14, 'black'); v.set(3, 7, 14, 'black'); v.set(8, 7, 14, 'black');
  v.box(1, 0, 6, 1, 0, 7, 'black'); v.box(10, 0, 6, 10, 0, 7, 'black');
}, parts: {
  legFL: { pivot: [1.5, 1, 10], build(v) { v.box(0, 0, 9, 1, 0, 10, 'black'); } }, legFR: { pivot: [10.5, 1, 10], build(v) { v.box(10, 0, 9, 11, 0, 10, 'black'); } },
  legBL: { pivot: [1.5, 1, 3.5], build(v) { v.box(0, 0, 3, 1, 0, 4, 'black'); } }, legBR: { pivot: [10.5, 1, 3.5], build(v) { v.box(10, 0, 3, 11, 0, 4, 'black'); } },
}, meta: M({ rig: 'quad' }) });

// gresshoppe: slim green hopper, big folded hind legs (legBL/legBR), long antennae
V.def('gresshoppe', { size: [11, 13, 19], scale: S16, build(v) {
  v.ellipsoid(5, 4.6, 7, 2.1, 2.2, 5.6, 'green'); v.paint((x, y, z, c) => c === P.green && z <= 9 && z % 2 === 1 ? P.leafDark : null);
  v.ellipsoid(5, 5.8, 13.4, 2.6, 3, 2.8, 'green'); v.paint((x, y, z, c) => c === P.green && y <= 3 && z >= 6 ? P.butter : null);
  v.box(4, 7, 3, 6, 7, 11, 'leafDark'); v.box(4, 6, 2, 6, 6, 3, 'leafDark');   // folded wings along the back
  eye(v, 2, 6, 2, 2); eye(v, 6, 6, 2, 2); front(v, 4, 5, 'leafDark'); front(v, 5, 5, 'leafDark'); front(v, 2, 5, 'blossom'); front(v, 7, 5, 'blossom');
  v.line(4, 8, 14, 2, 11, 17, 'leafDark'); v.line(6, 8, 14, 8, 11, 17, 'leafDark'); v.set(1, 12, 18, 'leafDark'); v.set(9, 12, 18, 'leafDark');
}, parts: (() => {
  const hind = (x, dx) => ({ pivot: [x + 0.5, 6, 9.5], build(v) { v.line(x, 6, 9, x + dx, 9, 4, 'green'); v.line(x + dx, 6, 9, x + dx, 9, 5, 'green'); v.line(x + dx, 9, 4, x + dx, 1, 3, 'green'); v.box(x + dx, 0, 3, x + dx, 0, 4, 'leafDark'); } });
  const fr = x => ({ pivot: [x + 0.5, 3, 11.5], build(v) { v.line(x, 3, 11, x, 0, 12, 'green'); } });
  return { legBL: hind(3, -1), legBR: hind(7, 1), legFL: fr(3), legFR: fr(7) };
})(), meta: M({ rig: 'hop' }) });

// maur: brown ant made of three clear beads (gaster, thorax, big head), big eyes, little antennae, stubby legs, carrying a green leaf
V.def('maur', { size: [11, 13, 18], scale: S16, build(v) {
  v.ellipsoid(5, 3.6, 3.4, 2.7, 2.6, 3, 'black'); v.paint((x, y, z, c) => c === P.black && z <= 4 && z % 2 === 1 && y >= 4 ? P.brown : null);
  v.ellipsoid(5, 3.4, 8.2, 1.6, 1.6, 1.6, 'woodRed');
  v.ellipsoid(5, 4.4, 12.6, 2.8, 2.8, 2.5, 'woodRed');
  eye(v, 2, 4, 2, 2); eye(v, 6, 4, 2, 2); front(v, 2, 3, 'blossom'); front(v, 7, 3, 'blossom'); front(v, 4, 2, 'woodDark'); front(v, 5, 2, 'woodDark');
  for (const [x0, d] of [[4, -1], [6, 1]]) { v.line(x0, 7, 12, x0 + d, 8, 13, 'woodDark'); v.line(x0 + d, 8, 13, x0 + 2 * d, 8, 15, 'woodDark'); }
  v.box(2, 0, 8, 3, 0, 8, 'woodDark'); v.box(7, 0, 8, 8, 0, 8, 'woodDark');
  // a leaf held high over the back (leafcutter style) – reads from far away
  v.line(5, 5, 9, 5, 7, 7, 'leafDark');
  for (let z = 2; z <= 9; z++) for (let x = 1; x <= 9; x++) { const q = ((x - 5) / 4) ** 2 + ((z - 5.5) / 3.6) ** 2; if (q <= 1) v.set(x, 8 + (q > 0.6 ? 1 : 0), z, x === 5 ? 'leafDark' : 'leaf2'); }
}, parts: (() => {
  const leg = (x, z, dx) => ({ pivot: [x + 0.5, 2, z + 0.5], build(v) { v.box(Math.min(x, x + dx), 0, z, Math.max(x, x + dx), 1, z, 'woodDark'); } });
  return { legFL: leg(3, 10, -2), legFR: leg(7, 10, 2), legBL: leg(3, 6, -2), legBR: leg(7, 6, 2) };
})(), meta: M({ rig: 'quad' }) });

// øyenstikker: long teal body, huge round eyes, 4 glass wings (parts), rig 'flutter'
V.def('øyenstikker', { size: [21, 8, 19], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'blue');
  tube(v, [[10, 3, 0], [10, 3.2, 6], [10, 3.4, 11]], 0.9, c); v.paint((x, y, z, cc) => cc === P[c] && z % 2 === 0 && z < 11 ? P.navySoft : null);
  v.ellipsoid(10, 3.6, 13, 1.7, 1.7, 2.2, c);
  v.sphere(8.6, 4.2, 16.2, 1.8, 'mint'); v.sphere(11.4, 4.2, 16.2, 1.8, 'mint');
  for (const x of [8, 11]) { v.set(x, 4, 18, 'black'); v.set(x + 1, 4, 18, 'black'); v.set(x, 5, 18, 'white'); v.set(x + 1, 5, 18, 'black'); }
  v.set(10, 2, 17, 'rose'); v.set(7, 3, 17, 'blossom'); v.set(13, 3, 17, 'blossom');
  v.line(9, 2, 13, 8, 0, 14, 'navySoft'); v.line(11, 2, 13, 12, 0, 14, 'navySoft'); v.line(9, 2, 12, 8, 0, 11, 'navySoft'); v.line(11, 2, 12, 12, 0, 11, 'navySoft');
}, parts: (() => {
  const wing = (v, sgn) => {
    for (const [ez, rz] of [[13.2, 1.6], [10, 1.5]]) for (let z = 0; z < 19; z++) for (let x = 0; x < 21; x++) {
      if ((x - 10) * sgn < 1) continue; const ex = 10 + sgn * 5.2, q = ((x - ex) / 5) ** 2 + ((z - ez) / rz) ** 2; if (q > 1) continue;
      v.set(x, 5, z, q > 0.62 || (x - 10) * sgn === 9 ? 'blue' : (x + z) % 4 === 0 ? 'sky' : 'glass');
    }
  };
  return { wingL: { pivot: [10.5, 5.5, 11.5], build(v) { wing(v, 1); } }, wingR: { pivot: [9.5, 5.5, 11.5], build(v) { wing(v, -1); } } };
})(), meta: M({ rig: 'flutter', fly: true, variants: { c: ['blue', 'teal', 'plum'] } }) });

/* ================================================================ MEADOW & ORCHARD MAMMALS */
// rådyr: slender reddish doe with big ears, white muzzle and rump, thin legs
quad('rådyr', { size: [10, 23, 19], col: 'woodRed',
  body: [9.4, 8, 2.8, 2.7, 5], legs: { x0: 3, w: 1, d: 1, zF: 11, zB: 4, h: 7, foot: 'woodDark', footH: 1 },
  neck: [[11, 11], [14.6, 13]], neckR: 1.5,
  head: [15.6, 13.8, 2.5, 2.4, 2.7], headPivot: [11, 11], tailPivot: [10, 3],
  paintBody(v, o) { v.paint((x, y, z, c) => c === P[pick(o, 'c', 'woodRed')] && y <= 8 && z >= 5 && z <= 11 ? P.cream2 : null); v.ellipsoid(4.5, 9.6, 3, 1.8, 1.8, 0.8, 'white'); },
  face(v, o) {
    const c = pick(o, 'c', 'woodRed');
    v.ellipsoid(4.5, 14.4, 16, 1.6, 1.3, 1.2, 'cream'); v.box(4, 15, 17, 5, 15, 17, 'black');
    eye(v, 2, 15, 2, 2); eye(v, 6, 15, 2, 2); front(v, 2, 14, 'blossom'); front(v, 7, 14, 'blossom');
    for (const [x, d] of [[2, -1], [7, 1]]) { v.box(x, 17, 13, x, 18, 14, c); v.box(x + d, 18, 13, x + d, 20, 14, c); v.set(x + d, 21, 13, c); v.set(x + d, 19, 14, 'blossom'); v.set(x + d, 20, 14, 'blossom'); }
    v.paint((x, y, z, cc) => cc === P[c] && y <= 13 && z >= 13 && y >= 11 ? P.cream2 : null);
  },
  tail(v) { v.box(4, 9, 2, 5, 10, 2, 'white'); },
}, M({ rig: 'quad', variants: { c: ['woodRed', 'woodLight'] } }));

// grevling: low grey badger, black-and-white striped face, black legs
quad('grevling', { size: [12, 10, 20], col: 'grey',
  body: [4.6, 8.6, 4, 3.2, 6.2], legs: { x0: 2, zF: 12, zB: 4, h: 2, c: 'black' },
  head: [5, 15.4, 3, 2.7, 3.2], headCol: 'white', headPivot: [4.6, 13], tailPivot: [4.6, 2.6],
  paintBody(v) { surfSpeck(v, 'grey', 'silver', 0.2, 9); v.paint((x, y, z, c) => c === P.grey && y <= 2 ? P.black : null); },
  face(v) {
    v.paint((x, y, z, c) => c === P.white && z >= 13 && y >= 4 && ((x >= 2 && x <= 3) || (x >= 8 && x <= 9)) ? P.black : null);
    v.box(5, 3, 18, 6, 4, 18, 'white'); v.box(5, 4, 19, 6, 4, 19, 'black');
    for (const x of [2, 8]) { front(v, x, 6, 'white'); front(v, x + 1, 6, 'black'); front(v, x, 5, 'black'); front(v, x + 1, 5, 'black'); }
    front(v, 4, 4, 'blossom'); front(v, 7, 4, 'blossom');
    v.box(2, 7, 13, 3, 8, 13, 'black'); v.box(8, 7, 13, 9, 8, 13, 'black'); v.set(2, 8, 13, 'white'); v.set(9, 8, 13, 'white');
  },
  tail(v) { v.box(5, 4, 1, 6, 5, 2, 'silver'); },
}, M({ rig: 'quad' }));

/* ================================================================ WATER FRIENDS (page 15) */
// bever: chubby brown beaver, big white front teeth, flat criss-cross paddle tail
quad('bever', { size: [12, 12, 20], col: 'brown',
  body: [5.2, 9, 4, 4.2, 5.6], legs: { x0: 2, zF: 12, zB: 5, h: 1, c: 'woodDark' },
  head: [7, 15.4, 3.2, 3, 3], headPivot: [7, 13], tailPivot: [3, 4],
  paintBody(v) { surfSpeck(v, 'brown', 'wood', 0.18, 4); v.paint((x, y, z, c) => (c === P.brown || c === P.wood) && z >= 12 && y <= 5 ? P.woodLight : null); },
  face(v) {
    v.ellipsoid(5.5, 6, 17.8, 2, 1.5, 1.1, 'woodLight'); v.box(5, 7, 19, 6, 7, 19, 'black');
    v.box(5, 3, 18, 6, 5, 19, 'white'); v.set(5, 3, 19, 'cream2'); v.set(6, 3, 19, 'cream2');
    eye(v, 3, 8, 2, 2); eye(v, 7, 8, 2, 2); front(v, 2, 7, 'blossom'); front(v, 9, 7, 'blossom');
    v.box(2, 10, 14, 3, 10, 15, 'woodDark'); v.box(8, 10, 14, 9, 10, 15, 'woodDark');
  },
  tail(v) { for (let z = 0; z <= 4; z++) for (let x = 2; x <= 9; x++) if (!((z === 0) && (x === 2 || x === 9))) { const y = 1 + Math.round((4 - z) * 0.5); v.set(x, y, z, (x + z) % 2 ? 'woodDark' : 'black'); v.set(x, y - 1, z, 'woodDark'); } v.box(5, 2, 4, 6, 3, 5, 'brown'); },
}, M({ rig: 'quad' }));

// oter: sleek otter, cream face, whiskers, long tapering tail
quad('oter', { size: [10, 11, 23], col: 'wood',
  body: [4.2, 10.4, 2.8, 2.7, 6.8], legs: { x0: 2, zF: 14, zB: 5, h: 1, c: 'woodDark' },
  head: [6, 18.4, 3, 2.7, 2.8], headPivot: [5.6, 16], tailPivot: [3.4, 4],
  paintBody(v) { v.paint((x, y, z, c) => c === P.wood && z >= 13 && y <= 5 ? P.cream2 : null); },
  face(v) {
    v.paint((x, y, z, c) => c === P.wood && y <= 6 && z >= 17 ? P.cream2 : null); v.ellipsoid(4.5, 5.2, 20.2, 2.4, 1.5, 1.2, 'cream2'); v.box(4, 6, 21, 5, 6, 21, 'black');
    eye(v, 2, 7, 2, 2); eye(v, 6, 7, 2, 2); front(v, 1, 6, 'blossom'); front(v, 8, 6, 'blossom');
    for (const x of [2, 7]) { v.set(x, 5, 21, 'white'); v.set(x, 4, 21, 'white'); }
    v.box(1, 9, 17, 2, 9, 17, 'woodDark'); v.box(7, 9, 17, 8, 9, 17, 'woodDark');
  },
  tail(v) { tube(v, [[4.5, 3, 4], [4.5, 2, 2], [4.5, 1, 0]], 1.3, 'wood'); },
}, M({ rig: 'quad' }));

// hegre: grey heron on long legs, white S-neck, yellow beak, little black crest plume
bird('hegre', { size: [12, 27, 19], col: 'grey',
  body: [12, 7.6, 3.2, 3.1, 5], head: [22.4, 13.4, 2.2, 2, 2.4], headCol: 'white', headPivot: [14, 10.6],
  neck: [[14, 11], [16.5, 12.8], [18.5, 12], [20.5, 12.8]], neckR: 1.2, neckCol: 'white',
  paintBody(v) { v.paint((x, y, z, c) => c === P.grey && y <= 10 && z >= 7 ? P.silver : null); },
  face(v) {
    v.box(5, 22, 15, 6, 22, 18, 'yellow'); v.box(5, 21, 15, 6, 21, 16, 'honey');
    eye(v, 3, 22, 2, 2); eye(v, 7, 22, 2, 2); v.set(3, 24, 14, 'black'); v.set(8, 24, 14, 'black'); front(v, 3, 21, 'blossom'); front(v, 8, 21, 'blossom');
    v.line(5, 24, 12, 5, 25, 9, 'black'); v.line(6, 24, 12, 6, 25, 9, 'black'); v.set(5, 25, 8, 'black');
  },
  wing: { x: 9, y0: 9, y1: 14, z0: 3, z1: 11, drop: 2, c: 'grey', tip: 'navySoft', tipN: 2 },
  legs: { xs: [4, 7], z: 8, h: 9, c: 'honey', foot: 1 },
  tail(v) { v.box(4, 10, 1, 7, 11, 2, 'navySoft'); }, tailPivot: [11, 3],
}, M({ rig: 'bird' }));

/* ================================================================ HILLS, BEACH, SEA, SNOW */
// hare: long ears with dark tips, long hind feet, sitting; c:'snow' = snøhare (white, black ear tips)
quad('hare', { size: [10, 22, 14], col: 'woodLight',
  body: [4.6, 5.6, 3.3, 3.9, 4], legs: { x0: 2, zF: 8, zB: 2, h: 1, d: 2, w: 2 },
  head: [9.6, 7.8, 3.2, 3, 3], headPivot: [7.8, 6.8], tailPivot: [3, 1.5],
  paintBody(v, o) { const c = pick(o, 'c', 'woodLight'); v.paint((x, y, z) => z >= 7 && y <= 5 && x >= 3 && x <= 6 ? P[c === 'snow' ? 'white' : 'cream2'] : null);
    v.ellipsoid(1.6, 2.4, 4, 1.4, 2.4, 2.8, c); v.ellipsoid(7.4, 2.4, 4, 1.4, 2.4, 2.8, c); if (c !== 'snow') surfSpeck(v, c, 'wood', 0.1, 6);
    else { v.paint((x, y, z, cc) => cc === P.snow && y >= 6 ? P.steel : null); surfSpeck(v, 'steel', 'silver', 0.3, 6); } },
  legPaint(v, o, k, n, x, z) { const c = pick(o, 'c', 'woodLight'); if (n === 'legBL' || n === 'legBR') { v.box(x, 0, z, x + 1, 0, z + 5, c); v.set(x, 0, z + 5, 'cream2'); v.set(x + 1, 0, z + 5, 'cream2'); } else v.box(x, 0, z, x + 1, 1, z + 1, c === 'snow' ? 'white' : 'cream2'); },
  face(v, o) {
    const c = pick(o, 'c', 'woodLight'), tip = c === 'snow' ? 'black' : 'woodDark';
    for (const [x0, d] of [[1, 0], [6, 1]]) { v.box(x0 + d, 11, 6, x0 + 1 + d, 19, 7, c); v.box(x0 + 1 - d + d, 12, 7, x0 + 1 - d + d, 18, 7, 'blossom'); v.box(x0 + d, 19, 6, x0 + 1 + d, 20, 7, tip); }
    eye(v, 2, 9, 2, 2); eye(v, 6, 9, 2, 2);
    front(v, 4, 8, 'pink'); front(v, 5, 8, 'pink'); front(v, 4, 7, 'white'); front(v, 5, 7, 'white'); front(v, 1, 8, 'blossom'); front(v, 8, 8, 'blossom');
  },
  tail(v) { v.sphere(4.5, 3, 0.8, 1.3, 'white'); },
}, M({ rig: 'hop', variants: { c: ['woodLight', 'snow'] } }));

// sjøstjerne: flat five-armed star (raised centre, butter bumps) with a happy face looking up
V.def('sjøstjerne', { size: [17, 4, 17], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'orange');
  for (let z = 0; z < 17; z++) for (let x = 0; x < 17; x++) {
    const dx = x - 8, dz = z - 8, r = Math.hypot(dx, dz), th = Math.atan2(dx, dz), f = Math.pow(Math.abs(Math.cos(5 * th / 2)), 2.2), R = 2.6 + 5.6 * f;
    if (r <= R) { v.set(x, 0, z, c); if (r <= R * 0.62 || r < 3.4) v.set(x, 1, z, c); if (r < 2.6) v.set(x, 2, z, c); }
  }
  v.paint((x, y, z, cc) => cc === P[c] && !v.get(x, y + 1, z) && H(x * 3, z * 5, 21) < 0.14 ? P.butter : null);
  eyeUp(v, 5, 7); eyeUp(v, 10, 7); top(v, 7, 11, 'woodRed'); top(v, 8, 11, 'woodRed'); top(v, 9, 11, 'woodRed'); top(v, 6, 10, 'woodRed'); top(v, 10, 10, 'woodRed'); top(v, 4, 10, 'blossom'); top(v, 12, 10, 'blossom');
}, meta: M({ rig: 'none', variants: { c: ['orange', 'coral', 'pink', 'lavender'] } }) });

// eremittkreps: a spiral shell with a little orange crab peeking out (claws animate)
V.def('eremittkreps', { size: [12, 12, 14], scale: S16, build(v) {
  v.ellipsoid(5.5, 5.4, 5, 4.2, 4.6, 4.2, 'peach');
  v.paint((x, y, z, c) => { if (c !== P.peach) return null; const d = Math.hypot(x - 5.5, y - 5.4), a = Math.atan2(y - 5.4, x - 5.5) / (Math.PI * 2) + 0.5; const sp = ((d - a * 2.4) % 2.4 + 2.4) % 2.4; return sp < 0.9 ? P.coral : null; });
  v.box(5, 10, 3, 6, 11, 4, 'coral'); v.set(5, 11, 2, 'peach');
  v.ellipsoid(5.5, 2.6, 9.6, 2.6, 2, 2, 'orange');
  for (const x of [4, 7]) { v.box(x, 4, 10, x, 6, 10, 'orange'); v.set(x, 7, 10, 'white'); v.set(x, 7, 11, 'black'); v.set(x, 8, 10, 'black'); }
  front(v, 5, 2, 'woodRed'); front(v, 6, 2, 'woodRed'); front(v, 3, 3, 'blossom'); front(v, 8, 3, 'blossom');
  for (let i = 0; i < 2; i++) { v.box(2, 0, 8 + i * 2, 3, 0, 8 + i * 2, 'orange'); v.box(8, 0, 8 + i * 2, 9, 0, 8 + i * 2, 'orange'); }
}, parts: {
  clawL: { pivot: [8, 2, 11], build(v) { v.box(8, 1, 11, 9, 2, 12, 'red'); v.box(9, 1, 13, 10, 3, 13, 'red'); v.set(10, 3, 13, 0); } },
  clawR: { pivot: [3, 2, 11], build(v) { v.box(2, 1, 11, 3, 1, 12, 'red'); v.box(1, 1, 13, 2, 2, 13, 'red'); } },
}, meta: M({ rig: 'none' }) });

// lunde: upright puffin, white face, big striped beak, orange feet
bird('lunde', { size: [11, 15, 12], col: 'black',
  body: [5.8, 5, 3.4, 4.6, 3.4], head: [11, 5.6, 3.1, 2.9, 2.9], headPivot: [9, 5.4],
  paintBody(v) { v.paint((x, y, z, c) => c === P.black && z >= 6 && Math.abs(x - 5) <= 2.4 && y <= 9 && y >= 1 ? P.white : null); },
  face(v) {
    v.paint((x, y, z, c) => c === P.black && z >= 7 && y >= 9 && y <= 12 && Math.abs(x - 5) <= 2.6 ? P.white : null);
    v.box(4, 9, 8, 6, 11, 9, 'navySoft'); v.box(4, 9, 10, 6, 11, 10, 'orange'); v.box(4, 10, 11, 6, 10, 11, 'red'); v.set(5, 9, 11, 'orange'); v.box(4, 11, 10, 6, 11, 10, 'yellow');
    eye(v, 2, 11, 2, 2); eye(v, 7, 11, 2, 2); front(v, 2, 10, 'coral'); front(v, 8, 10, 'coral');
  },
  wing: { x: 8, y0: 3, y1: 8, z0: 2, z1: 6, drop: 2, c: 'black', tip: 'black' },
  legs: { xs: [3, 6], z: 5, h: 0, c: 'orange', webW: 1, foot: 2 },
  tail(v) { v.box(4, 1, 0, 6, 2, 1, 'black'); }, tailPivot: [3, 2],
}, M({ rig: 'bird' }));

// manet: glassy jelly dome with a pink heart, cute face, wavy tentacles (part 'tail' sways)
V.def('manet', { size: [13, 15, 13], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'pink');
  v.ellipsoid(6, 9.6, 6, 5, 4.6, 5, 'glass'); v.clear(0, 0, 0, 12, 8, 12);
  v.ellipsoid(6, 9.6, 6, 3.9, 3.6, 3.9, c); v.clear(0, 0, 0, 12, 8, 12);
  v.box(1, 9, 1, 11, 9, 11, 0); v.ellipsoid(6, 9, 6, 5, 0.6, 5, 'blossom'); v.ellipsoid(6, 9, 6, 3.6, 0.6, 3.6, c);
  v.paint((x, y, z, cc) => cc === P[c] && y >= 12 && H(x, z * 3, 31) < 0.25 ? P.white : null);
  for (const x of [3, 7]) for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) { const zz = (() => { for (let z = 12; z >= 0; z--) if (v.get(x + dx, 11 + dy, z)) return z; return -1; })(); if (zz >= 0) v.set(x + dx, 11 + dy, zz, dx === 0 && dy === 1 ? 'white' : 'black'); }
  front(v, 2, 10, 'rose'); front(v, 10, 10, 'rose'); front(v, 5, 10, 'plum'); front(v, 6, 10, 'plum');
}, parts: { tail: { pivot: [6.5, 8, 6.5], build(v, o) {
  const cols = ['blossom', 'lavender', pick(o, 'c', 'pink')];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 3.2 : 2; const pts = []; for (let y = 8; y >= 1; y--) pts.push([6 + Math.cos(a) * r + Math.sin(y * 0.9 + i) * 0.7, y, 6 + Math.sin(a) * r + Math.cos(y * 0.9 + i) * 0.7]);
    for (const [x, y, z] of pts) v.set(Math.round(x), y, Math.round(z), cols[i % 3]); }
} } }, meta: M({ rig: 'fish', variants: { c: ['pink', 'lavender', 'peach'] } }) });

// blekksprut: round coral octopus, big eyes, eight curly arms
V.def('blekksprut', { size: [15, 13, 15], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'coral');
  v.ellipsoid(7, 7.8, 7, 4.4, 4.6, 4.2, c); v.paint((x, y, z, cc) => cc === P[c] && y >= 9 && H(x * 2, y + z, 17) < 0.14 ? P.peach : null);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    tube(v, [[7 + cs * 2.4, 3.6, 7 + sn * 2.4], [7 + cs * 4.6, 1.2, 7 + sn * 4.6], [7 + cs * 6.3, 0.6, 7 + sn * 6.3]], 1.05, c);
    v.set(Math.round(7 + cs * 6.6), 1, Math.round(7 + sn * 6.6), c); v.set(Math.round(7 + cs * 4.6), 0, Math.round(7 + sn * 4.6), 'peach'); }
  eye(v, 4, 7, 2, 2); eye(v, 8, 7, 2, 2); front(v, 6, 5, 'woodRed'); front(v, 7, 5, 'woodRed'); front(v, 3, 6, 'blossom'); front(v, 10, 6, 'blossom');
}, meta: M({ rig: 'none', variants: { c: ['coral', 'lavender', 'pink'] } }) });

// reke: curved pink shrimp, fan tail (part 'tail'), long whiskers
V.def('reke', { size: [8, 11, 17], scale: S16, build(v) {
  tube(v, [[3.5, 3.6, 13], [3.5, 5.2, 10.6], [3.5, 5.8, 7.6], [3.5, 5, 5], [3.5, 3.6, 3.4]], 2, 'coral');
  v.sphere(3.5, 3.6, 13.6, 2.3, 'coral');
  v.paint((x, y, z, c) => c === P.coral && z < 12 && (z % 2 === 0) && y >= 5 ? P.peach : null);
  v.paint((x, y, z, c) => c === P.coral && y <= 2 ? P.blossom : null);
  for (const x of [2, 5]) { v.set(x, 5, 15, 'coral'); v.set(x, 6, 15, 'black'); v.set(x, 6, 16, 'black'); v.set(x, 7, 15, 'white'); }
  v.line(3, 4, 16, 1, 9, 16, 'coral'); v.line(4, 4, 16, 6, 9, 16, 'coral'); v.set(0, 10, 15, 'coral'); v.set(7, 10, 15, 'coral');
  front(v, 1, 3, 'blossom'); front(v, 6, 3, 'blossom'); front(v, 3, 2, 'woodRed'); front(v, 4, 2, 'woodRed');
  for (let z = 5; z <= 11; z += 2) { v.set(2, 0, z, 'coral'); v.set(5, 0, z, 'coral'); v.set(2, 1, z, 'coral'); v.set(5, 1, z, 'coral'); }
}, parts: { tail: { pivot: [4, 3.5, 3], build(v) { v.box(2, 2, 1, 5, 4, 2, 'coral'); v.box(1, 1, 0, 6, 4, 0, 'peach'); v.set(1, 4, 0, 0); v.set(6, 4, 0, 0); } } },
  meta: M({ rig: 'fish' }) });

// sjøhest: upright yellow seahorse, curled tail, little crown and dorsal fin (part 'tail' flutters)
V.def('sjøhest', { size: [9, 19, 12], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'yellow');
  tube(v, [[4, 13.6, 4.8], [4, 11, 5.6], [4, 8, 6], [4, 5.4, 5], [4, 3.6, 3.6], [4, 2, 3.4], [4, 1.2, 5], [4, 2.4, 6.4], [4, 3.4, 5.6]], 1.9, c);
  v.ellipsoid(4, 9, 6.6, 2.6, 3.6, 2.4, c);
  v.sphere(4, 15, 5.2, 2.6, c);
  tube(v, [[4, 14.6, 7], [4, 14.2, 9.4], [4, 14.1, 10.6]], 1, c); v.set(4, 14, 11, 'orange');
  v.paint((x, y, z, cc) => cc === P[c] && y < 13 && y % 2 === 0 && z <= 5 ? P.orange : null);
  v.paint((x, y, z, cc) => cc === P[c] && z >= 7 && y >= 6 && y <= 11 ? P.butter : null);
  for (const x of [2, 5]) { v.set(x, 15, 7, 'black'); v.set(x + 1, 15, 7, 'black'); v.set(x, 16, 7, 'white'); v.set(x + 1, 16, 7, 'black'); }
  v.set(2, 14, 7, 'blossom'); v.set(6, 14, 7, 'blossom');
  v.set(4, 18, 4, 'orange'); v.set(3, 17, 4, 'orange'); v.set(5, 17, 4, 'orange'); v.set(4, 18, 6, 'orange');
}, parts: { tail: { pivot: [4.5, 9, 3], build(v) { for (let y = 7; y <= 11; y++) for (let z = 1; z <= 2; z++) if (!(z === 1 && (y === 7 || y === 11))) v.set(4, y, z, (y + z) % 2 ? 'butter' : 'orange'); } } },
  meta: M({ rig: 'fish', variants: { c: ['yellow', 'pink', 'mint'] } }) });

// lemen: round little lemming, black head stripe, honey cheeks
quad('lemen', { size: [10, 9, 13], col: 'woodLight',
  body: [3.6, 5.4, 3.7, 3.4, 4.4], legs: { x0: 2, zF: 8, zB: 3, h: 0, w: 1, d: 1, foot: 'blossom' },
  head: [4.6, 9.4, 3.2, 3, 2.6], headPivot: [3.4, 8], tailPivot: [3, 1],
  paintBody(v) { v.paint((x, y, z, c) => c === P.woodLight && y >= 6 && Math.abs(x - 4.5) <= 1 && z >= 4 ? P.woodDark : c === P.woodLight && y <= 2 && z >= 5 ? P.cream2 : c === P.woodLight && y >= 3 && (x <= 1 || x >= 8) ? P.woodRed : null); },
  face(v) {
    v.paint((x, y, z, c) => c === P.woodLight && y >= 6 && Math.abs(x - 4.5) <= 2.6 && z <= 10 ? P.black : c === P.woodLight && y <= 6 ? P.woodRed : null);
    eye(v, 2, 4, 2, 2); eye(v, 6, 4, 2, 2); front(v, 4, 3, 'pink'); front(v, 5, 3, 'pink'); front(v, 4, 2, 'cream2'); front(v, 5, 2, 'cream2');
    front(v, 1, 3, 'blossom'); front(v, 8, 3, 'blossom');
    for (const [x, d] of [[1, 1], [7, 0]]) { v.box(x, 7, 8, x + 1, 8, 9, 'woodRed'); v.set(x + d, 7, 9, 'blossom'); }   // round mouse ears
  },
  tail(v) { v.set(4, 2, 0, 'woodLight'); },
}, M({ rig: 'hop' }));

// moskus: shaggy dark musk ox, long hair skirt, light saddle, friendly round horns
quad('moskus', { size: [16, 18, 23], col: 'woodDark',
  body: [9, 10, 5.2, 4.8, 7.4], legs: { x0: 4, zF: 13, zB: 5, h: 3, c: 'cream2', foot: 'woodDark' },
  head: [8.6, 18.6, 3.2, 3.2, 3], headPivot: [10, 15.5], tailPivot: [9, 3],
  paintBody(v, o, k) {
    for (let z = 3; z <= 17; z++) for (let x = 0; x < 16; x++) { const q = ((x - 7.5) / 5.2) ** 2 + ((z - 10) / 7.4) ** 2; if (q <= 1 && q > 0.45) for (let y = 3; y <= 8; y++) if (!v.get(x, y, z)) v.set(x, y, z, H(x, z, 3) < 0.4 ? 'brown' : 'woodDark'); }
    v.paint((x, y, z, c) => c === P.woodDark && y >= 12 && z >= 7 && z <= 13 && Math.abs(x - 7.5) <= 3 ? P.woodLight : null);
    v.paint((x, y, z, c) => c === P.woodDark && (x + z) % 3 === 0 && y < 12 ? P.brown : null);
  },
  face(v) {
    v.ellipsoid(7.5, 7, 20.6, 2.2, 1.6, 1.2, 'brown'); v.box(7, 8, 21, 8, 8, 21, 'black'); v.box(7, 6, 21, 8, 6, 21, 'cream2');
    eye(v, 4, 9, 2, 2); eye(v, 10, 9, 2, 2); front(v, 4, 8, 'blossom'); front(v, 11, 8, 'blossom');
    v.box(5, 11, 17, 10, 12, 19, 'cream2');
    for (const [x, d] of [[4, -1], [11, 1]]) {
      v.box(x, 11, 17, x, 12, 18, 'cream2'); v.box(x + d, 10, 17, x + d, 11, 18, 'cream2'); v.box(x + 2 * d, 9, 17, x + 2 * d, 10, 18, 'cream2');
      v.box(x + 3 * d, 7, 18, x + 3 * d, 9, 18, 'cream2'); v.set(x + 3 * d, 6, 19, 'cream'); v.set(x + 3 * d, 7, 20, 'cream'); v.set(x + 3 * d, 8, 20, 'white');
    }
  },
  tail(v) { v.box(7, 8, 2, 8, 9, 2, 'woodDark'); },
}, M({ rig: 'quad' }));

// isbjørnunge: round white polar bear cub, black button nose, little round ears
quad('isbjørnunge', { size: [12, 14, 17], col: 'cream2',
  body: [5.6, 7.4, 3.9, 3.7, 5], legs: { x0: 2, zF: 10, zB: 3, h: 2, foot: 'cream2' },
  head: [9, 12.6, 3.5, 3.3, 3.2], headPivot: [7.5, 11], tailPivot: [6, 2],
  paintBody(v) { surfSpeck(v, 'cream2', 'cream', 0.22, 7); },
  face(v) {
    v.ellipsoid(5.5, 7.8, 15.2, 2, 1.5, 1.2, 'white'); v.box(5, 8, 16, 6, 8, 16, 'black'); v.set(5, 7, 16, 'woodDark'); v.set(6, 7, 16, 'woodDark');
    eye(v, 2, 9, 2, 2); eye(v, 8, 9, 2, 2); front(v, 2, 8, 'blossom'); front(v, 9, 8, 'blossom');
    for (const x of [2.4, 8.6]) { v.sphere(x, 12.2, 11.6, 1.3, 'cream2'); v.set(Math.round(x), 12, 13, 'blossom'); }
  },
  tail(v) { v.sphere(5.5, 5.6, 1.6, 1, 'cream2'); },
}, M({ rig: 'quad' }));

// elefantunge: grey baby elephant, big pink-lined ears (earL/earR flap), curly trunk, toenails
{
  const d = quad('elefantunge', { size: [16, 17, 19], col: 'grey',
    body: [7.6, 8, 4.8, 4.4, 5.6], legs: { x0: 3, w: 3, d: 3, zF: 10, zB: 3, h: 4, foot: 'grey' },
    head: [10.6, 13.6, 3.8, 3.6, 3.3], headPivot: [10, 11.5], tailPivot: [8, 2.4],
    legPaint(v, o, k, n, x, z) { if (n[3] === 'F') { v.set(x, 0, z + 2, 'white'); v.set(x + 2, 0, z + 2, 'white'); } },
    face(v) {
      tube(v, [[7.5, 9, 16.4], [7.5, 6.6, 17.2], [7.5, 4.6, 17], [7.5, 4, 16]], 1.25, 'grey'); v.box(7, 3, 15, 8, 3, 15, 'blossom');
      eye(v, 4, 11, 2, 2); eye(v, 10, 11, 2, 2); front(v, 4, 10, 'blossom'); front(v, 11, 10, 'blossom');
      v.set(7, 14, 13, 'grey'); v.set(8, 15, 12, 'grey'); v.set(7, 15, 11, 'grey');
    },
    tail(v) { v.box(7, 5, 1, 7, 7, 1, 'grey'); v.box(7, 4, 0, 8, 4, 1, 'black'); },
  }, M({ rig: 'quad' }));
  const ear = (x, inner) => ({ pivot: [x + 0.5, 12, 12], build(v) { for (let y = 8; y <= 15; y++) for (let z = 8; z <= 15; z++) { const q = ((y - 11.6) / 3.8) ** 2 + ((z - 11.6) / 3.4) ** 2; if (q <= 1) { v.set(x, y, z, 'grey'); if (q < 0.55) v.set(x + inner, y, z, 'blossom'); } } } });
  if (d) { d.parts.earL = ear(14, -1); d.parts.earR = ear(1, 1); }
}

/* ================================================================ BIRD KINDS: fugl_<kind> (11), one parametric small-bird body
   s = { c body, belly, head, cap, cheek, bib, wing, tip, bar, tail, tailT:'short'|'long'|'fork'|'fan', beak, beakL, legs, legH, big, dz, crest, spots, ring, eyeStripe, shoulder } */
function smallBird(id, s) {
  const dz = s.dz || 0, b = s.big || 0, L = 13 + dz, Hh = 13 + Math.ceil(b) + (s.crest ? 3 : 0) + (s.legH ? s.legH - 1 : 0), ly = s.legH ? s.legH - 1 : 0;
  const cx = 5.5, hy = 9.4 + b * 0.7 + ly, hz = 8.4 + dz, hr = 2.9 + b * 0.25;
  return bird(id, { size: [12, Hh, L], col: s.c,
    body: [5 + b * 0.5 + ly, 6 + dz, 3.6 + b * 0.35, 3.3 + b * 0.35, 4.2 + b * 0.45], head: [hy, hz, hr], headCol: s.head || s.c, headPivot: [7.5 + b * 0.5 + ly, 7.5 + dz],
    paintBody(v) {
      if (s.belly) v.paint((x, y, z, c) => c === P[s.c] && z >= 6 + dz && y <= (s.bellyY != null ? s.bellyY : 6) + ly && Math.abs(x - cx) <= 2.8 ? P[s.belly] : null);
      if (s.spots) v.paint((x, y, z, c) => c === P[s.belly] && (x + y * 2 + z) % 3 === 0 ? P[s.spots] : null);
      if (s.shoulder) { v.box(1, 6 + ly, 6 + dz, 1, 7 + ly, 8 + dz, s.shoulder); v.box(10, 6 + ly, 6 + dz, 10, 7 + ly, 8 + dz, s.shoulder); }
      if (s.vent) v.box(4, 2 + ly, 2 + dz, 7, 3 + ly, 3 + dz, s.vent);
    },
    face(v) {
      const ey = Math.round(hy), hc = s.head || s.c;
      if (s.cap) v.paint((x, y, z, c) => c === P[hc] && y >= ey + 2 ? P[s.cap] : null);
      if (s.nape) v.paint((x, y, z, c) => c === P[hc] && y >= ey && z <= hz - 1.5 ? P[s.nape] : null);
      if (s.cheek) v.paint((x, y, z, c) => (c === P[hc]) && y >= ey - 2 && y <= ey + 1 && z >= hz - 1 && (x <= 3 || x >= 8) ? P[s.cheek] : null);
      if (s.bib) v.paint((x, y, z, c) => (c === P[hc] || c === P[s.c] || c === P[s.belly]) && y >= ey - 3 && y <= ey - 2 && z >= hz && Math.abs(x - cx) <= 1.6 ? P[s.bib] : null);
      if (s.eyeStripe) for (const x of [2, 3, 8, 9]) front(v, x, ey + 1, s.eyeStripe);
      eye(v, 3, ey, 2, 2); eye(v, 7, ey, 2, 2);
      if (s.ring) { front(v, 2, ey, s.ring); front(v, 9, ey, s.ring); }
      else { front(v, 2, ey - 1, 'blossom'); front(v, 9, ey - 1, 'blossom'); }
      const bz = Math.round(hz + hr), bl = s.beakL || 1, bc = s.beak || 'honey';
      v.box(5, ey - 1, bz, 6, ey - 1, bz + bl, bc); if (!s.thinBeak) v.box(5, ey - 2, bz, 6, ey - 2, bz + Math.max(0, bl - 1), bc);
      if (s.crest === 'thin') { v.line(5, ey + 3, hz - 1, 5, ey + 5, hz - 4, s.crestC || 'black'); v.line(6, ey + 3, hz - 1, 6, ey + 5, hz - 4, s.crestC || 'black'); v.set(5, ey + 6, hz - 5, s.crestC || 'black'); }
      else if (s.crest) { v.box(5, ey + 3, Math.round(hz) - 2, 6, ey + 4, Math.round(hz) - 1, s.crestC || s.cap || hc); v.set(5, ey + 5, Math.round(hz) - 3, s.crestC || s.cap || hc); }
    },
    wing: { x: 9 + (b >= 1 ? 1 : 0), y0: 3 + ly, y1: 7 + ly + Math.floor(b * 0.5), z0: 1 + dz - (s.longWing || 0), z1: 7 + dz, drop: 1, c: s.wing || s.c, tip: s.tip || s.wing || s.c, tipN: 1 + (s.longWing || 0),
      paint: s.bar ? (v, o, x) => { for (let z = 3 + dz; z <= 6 + dz; z++) v.set(x, 6 + ly, z, s.bar); } : null },
    legs: { xs: [4, 7], z: 6 + dz, h: 1 + ly, c: s.legs || 'skin2', foot: 1 },
    tail(v) {
      const tc = s.tail || s.wing || s.c, t = s.tailT || 'short', y0 = 4 + ly, z0 = 1 + dz;
      if (t === 'short') { v.box(5, y0 + 1, z0 - 1, 6, y0 + 3, z0, tc); }
      else if (t === 'long') { for (let i = 0; i <= dz + 1; i++) v.box(5, y0 + 1 + Math.floor(i / 3), z0 - i, 6, y0 + 2 + Math.floor(i / 3), z0 - i, i === dz + 1 && s.tailTip ? s.tailTip : tc); }
      else if (t === 'fork') { v.box(5, y0 + 1, z0 - 1, 6, y0 + 2, z0, tc); for (let i = 1; i <= dz + 1; i++) { v.set(4 - (i > 2 ? 1 : 0), y0 + 1, z0 - i, tc); v.set(7 + (i > 2 ? 1 : 0), y0 + 1, z0 - i, tc); } }
      else if (t === 'fan') { v.box(4, y0 + 1, z0 - 1, 7, y0 + 3, z0, tc); if (s.tailTip) v.box(4, y0 + 3, z0 - 1, 7, y0 + 3, z0 - 1, s.tailTip); }
      if (s.tailEdge) { v.set(4, y0 + 1, z0 - 1, s.tailEdge); v.set(7, y0 + 1, z0 - 1, s.tailEdge); }
    }, tailPivot: [6, 2 + dz + ly],
  }, M({ rig: 'bird', kind: id.slice(5) }));
}
smallBird('fugl_spurv', { c: 'woodLight', belly: 'cream2', head: 'woodLight', cap: 'grey', cheek: 'cream', bib: 'black', wing: 'brown', bar: 'cream2', tip: 'woodDark', tail: 'brown', beak: 'woodDark', legs: 'skin2' });
smallBird('fugl_lerke', { c: 'woodLight', belly: 'cream2', spots: 'wood', head: 'woodLight', cap: 'wood', crest: 1, crestC: 'wood', wing: 'wood', bar: 'cream2', tip: 'woodDark', tail: 'wood', tailEdge: 'white', beak: 'skin2', legs: 'skin2' });
smallBird('fugl_vipe', { c: 'leafDark', belly: 'white', bellyY: 4, head: 'white', cap: 'black', bib: 'black', crest: 'thin', crestC: 'black', wing: 'teal', tip: 'black', tail: 'white', tailTip: 'black', tailT: 'fan', beak: 'black', legs: 'rose', legH: 3, eyeStripe: null });
smallBird('fugl_meis', { c: 'leaf2', belly: 'yellow', head: 'white', cap: 'blue', eyeStripe: 'navySoft', bib: 'navySoft', wing: 'blue', bar: 'white', tip: 'sky', tail: 'blue', beak: 'black', beakL: 0, thinBeak: true, legs: 'grey' });
smallBird('fugl_trost', { c: 'woodLight', belly: 'cream', spots: 'brown', head: 'woodLight', wing: 'woodLight', tip: 'wood', tail: 'wood', beak: 'honey', legs: 'skin2', big: 0.6 });
smallBird('fugl_hakkespett', { c: 'black', belly: 'white', head: 'white', cap: 'red', nape: 'black', cheek: 'white', wing: 'black', bar: 'white', shoulder: 'white', tip: 'black', tail: 'black', tailT: 'long', dz: 2, beak: 'grey', beakL: 2, thinBeak: true, legs: 'grey', vent: 'red' });
smallBird('fugl_kråke', { c: 'hairGrey', belly: 'silver', head: 'black', wing: 'black', tip: 'black', tail: 'black', tailT: 'fan', beak: 'black', beakL: 2, legs: 'black', big: 1, bib: 'black' });
smallBird('fugl_skjære', { c: 'black', belly: 'white', head: 'black', shoulder: 'white', wing: 'black', tip: 'navySoft', tail: 'navySoft', tailT: 'long', tailTip: 'teal', dz: 4, beak: 'black', beakL: 1, legs: 'black', big: 0.6 });
smallBird('fugl_svale', { c: 'navySoft', belly: 'cream', head: 'navySoft', bib: 'red', cheek: 'red', wing: 'navySoft', tip: 'black', longWing: 1, tail: 'navySoft', tailT: 'fork', dz: 3, beak: 'black', beakL: 0, thinBeak: true, legs: 'black' });
smallBird('fugl_tjeld', { c: 'black', belly: 'white', head: 'black', wing: 'black', bar: 'white', tip: 'black', tail: 'white', tailTip: 'black', tailT: 'fan', beak: 'orange', beakL: 3, thinBeak: true, ring: 'red', legs: 'rose', legH: 2, big: 0.6 });
smallBird('fugl_rype', { c: 'steel', belly: 'white', bellyY: 7, head: 'white', cap: 'steel', wing: 'white', tip: 'steel', tail: 'black', tailT: 'fan', beak: 'black', beakL: 0, legs: 'white', big: 0.8, crest: null, ring: 'red', eyeStripe: 'red' });

/* ================================================================ FISH KINDS: fisk_<kind> (gull, makrell, torsk) */
function fishKind(id, f) {
  const [W, Hh, L] = f.size, cx = (W - 1) / 2, cy = f.cy, bz = f.bz;
  return V.def(id, { size: f.size, scale: S16, build(v, o) {
    v.ellipsoid(cx, cy, bz, f.r[0], f.r[1], f.r[2], f.c);
    if (f.paint) f.paint(v, cx, cy);
    const ez = Math.round(bz + f.r[2] * 0.55), ey = Math.round(cy + 1);
    for (const x of [0, W - 1]) { const xx = x === 0 ? Math.round(cx - f.r[0] + 0.4) : Math.round(cx + f.r[0] - 0.4); v.set(xx, ey, ez, 'black'); v.set(xx, ey + 1, ez, 'black'); v.set(xx, ey + 1, ez - 1, 'white'); v.set(xx, ey, ez - 1, 'black'); v.set(xx, ey - 1, ez - 1, 'blossom'); }
    v.box(Math.floor(cx), cy - 1, Math.round(bz + f.r[2]), Math.ceil(cx), cy - 1, Math.round(bz + f.r[2]), f.mouth || 'coral');
    if (f.fins) f.fins(v, cx, cy);
  }, parts: { tail: { pivot: [W / 2, cy, Math.round(bz - f.r[2]) + 1], build(v, o) { f.tail(v, cx, cy, Math.round(bz - f.r[2])); } } },
  meta: M({ rig: 'fish', kind: id.slice(5) }) });
}
fishKind('fisk_gull', { size: [7, 13, 15], c: 'orange', cy: 6, bz: 9, r: [2.4, 3.4, 4.2], mouth: 'rose',
  paint(v) { v.paint((x, y, z, c) => c === P.orange && y <= 4 ? P.honey : c === P.orange && H(x, y * 3 + z, 41) < 0.18 ? P.gold : null); },
  fins(v, cx) { v.box(3, 10, 6, 3, 11, 10, 'coral'); v.set(3, 12, 8, 'coral'); v.box(0, 3, 8, 0, 4, 9, 'coral'); v.box(6, 3, 8, 6, 4, 9, 'coral'); },
  tail(v, cx, cy, z0) { for (let z = 0; z <= z0; z++) { const h = 1 + (z0 - z); v.box(3, cy - h - 1, z, 3, cy + h + 1, z, z <= 1 ? 'blossom' : 'coral'); } v.box(2, cy - 1, z0, 4, cy + 1, z0, 'orange'); } });
fishKind('fisk_makrell', { size: [7, 10, 19], c: 'teal', cy: 4.6, bz: 10.4, r: [2.2, 2.6, 6.4], mouth: 'navySoft',
  paint(v, cx, cy) { v.paint((x, y, z, c) => c === P.teal && y <= cy - 1 ? P.silver : c === P.teal && y >= cy + 1 && (z + Math.round(y * 1.5)) % 3 === 0 ? P.navySoft : null); },
  fins(v) { v.box(3, 7, 9, 3, 8, 12, 'navySoft'); v.set(3, 7, 6, 'navySoft'); v.set(3, 7, 5, 'navySoft'); v.box(0, 3, 12, 0, 3, 13, 'silver'); v.box(6, 3, 12, 6, 3, 13, 'silver'); },
  tail(v, cx, cy, z0) { v.box(3, cy - 1, z0 - 1, 3, cy + 1, z0, 'teal'); for (let i = 0; i <= 2; i++) { v.set(3, cy + 2 + i, z0 - 2 - i, 'navySoft'); v.set(3, cy - 2 - i, z0 - 2 - i, 'navySoft'); } } });
fishKind('fisk_torsk', { size: [9, 12, 18], c: 'woodLight', cy: 5.6, bz: 9.6, r: [3, 3.6, 6], mouth: 'woodRed',
  paint(v, cx, cy) { v.paint((x, y, z, c) => c === P.woodLight && y <= cy - 2 ? P.cream : c === P.woodLight && H(x * 3, y + z * 2, 51) < 0.22 ? P.wood : null); v.paint((x, y, z, c) => (c === P.woodLight || c === P.wood) && y === Math.round(cy) ? P.cream : null); },
  fins(v, cx, cy) { v.box(4, 9, 7, 4, 10, 9, 'wood'); v.box(4, 9, 11, 4, 10, 13, 'wood'); v.set(4, 3, 15, 'wood'); v.set(4, 2, 15, 'wood'); v.set(4, 2, 16, 'woodDark'); v.box(0, 4, 11, 0, 5, 12, 'wood'); v.box(8, 4, 11, 8, 5, 12, 'wood'); },
  tail(v, cx, cy, z0) { for (let z = 0; z <= z0; z++) { const h = Math.max(1, 3 - z); v.box(4, Math.round(cy) - h, z, 4, Math.round(cy) + h, z, 'wood'); } } });

/* ================================================================ LEGENDS (page 20): overlays on family models (≤ 3,000 triangles inst) */
const RAINBOW = ['pink', 'butter', 'mint', 'sky', 'lavender'];
// enhjørning: white horse, rainbow mane and tail, golden spiral horn, golden hooves
horse('lg_enhjørning', { col: 'white', mane: RAINBOW, hoof: 'gold', muzzle: 'milk', blaze: false, socks: 0, longMane: true, horn: true,
  H: 30, L: 25, legH: 8, bodyRx: 3.4, bodyRy: 3.5, bodyZ: 10.5, bodyRz: 7, headY: 20, headZ: 19.6, headR: [2.9, 2.8, 3.4],
  paintBody(v) { v.paint((x, y, z, c) => c === P.white && H(x * 7, y + z * 3, 61) < 0.04 ? P.butter : null); },
  meta: M({ rig: 'quad', legend: 'horn' }) });
// vingehest: white-lilac horse with big feathered wings raised up and out (wingL/wingR flap)
horse('lg_vingehest_b', { col: 'milk', mane: ['lavender', 'lilac'], hoof: 'silver', muzzle: 'white', blaze: false, socks: 0, longMane: true,
  H: 27, L: 25, legH: 8, bodyRx: 3.4, bodyRy: 3.5, bodyZ: 10.5, bodyRz: 7, headY: 20, headZ: 19.6, headR: [2.9, 2.8, 3.4], meta: M({ rig: 'quad', hidden: true }) });
derive('lg_vingehest', 'lg_vingehest_b', { pad: [6, 6, 0], meta: { legend: 'wings', hidden: false },
  newParts: {
    wingL: I => ({ pivot: [I.X(9), 13, I.Z(11)], build(v) { wingF(v, I.X(9), 1); } }),
    wingR: I => ({ pivot: [I.X(2), 13, I.Z(11)], build(v) { wingF(v, I.X(2), -1); } }),
  } });
function wingF(v, x0, d) { // feathered wing plate rising up-and-out from the shoulder
  for (let i = 0; i <= 11; i++) {             // i = height above the shoulder
    const y = 13 + i, out = Math.round(i * 0.55), zf = 14 - Math.round(i * 0.35), len = 6 + Math.round(Math.min(i, 8) * 0.5) - (i > 8 ? (i - 8) * 2 : 0);
    for (let j = 0; j < len; j++) { const z = zf - j; if (z < 1) break; const c = i >= 9 || j >= len - 2 ? (j % 2 ? 'butter' : 'lavender') : (i % 3 === 2 ? 'cream' : 'white'); v.set(x0 + d * out, y, z, c); if (i < 7 && j > 0 && j < len - 1) v.set(x0 + d * (out + 1), y, z, 'white'); }
  }
}
// skylam: a lamb of cloud floating on a little cloud
derive('lg_skylam', 'lam', { pad: [2, 2, 2], lift: 3, meta: { legend: 'cloud' },
  recolor(v, o, I, part) { v.paint((x, y, z, c) => c === P.wool ? (H(x, y * 5, z + 7) < 0.25 ? P.sky : P.snow) : c === P.white ? P.snow : null); },
  body(v, o, I) {
    const [sx, , sz] = I.size, r = F.U.rng(77);
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 2 + r() * 4; v.sphere(sx / 2 - 0.5 + Math.cos(a) * d, 1.6 + r(), sz / 2 - 0.5 + Math.sin(a) * d * 1.2, 1.6 + r() * 0.8, r() < 0.3 ? 'sky' : 'snow'); }
    for (let i = 0; i < 6; i++) v.sphere(I.X(2 + r() * 8), I.Y(6 + r() * 4), I.Z(3 + r() * 9), 1.6, 'snow');
    v.set(I.X(2), I.Y(11), I.Z(6), 'butter'); v.set(I.X(9), I.Y(10), I.Z(9), 'butter');
  } });
// krystallhjort: icy deer with crystal antlers and crystal dapples
derive('lg_krystallhjort', 'rådyr', { pad: [3, 7, 0], opts: { c: 'snow' }, meta: { legend: 'crystal' },
  recolor(v, o, I, part) { v.paint((x, y, z, c) => { if (c === P.cream2) return P.ice; if (c !== P.snow) return null; const h = H(x * 3, y, z * 5); return h < 0.14 ? P.gem2 : h < 0.62 ? P.crystal : P.ice; }); },
  parts: { head(v, o, I) {
    for (const [x0, d] of [[I.X(3), -1], [I.X(6), 1]]) {
      v.box(x0, 18, 13, x0, 20, 13, 'crystal'); v.line(x0, 20, 13, x0 + d * 2, 24, 12, 'crystal'); v.line(x0 + d, 22, 13, x0 + d * 3, 23, 14, 'crystal');
      v.line(x0 + d * 2, 24, 12, x0 + d * 2, 27, 11, 'crystal'); v.set(x0 + d * 3, 25, 12, 'crystal'); v.set(x0 + d * 2, 28, 11, 'white'); v.set(x0 + d * 4, 24, 14, 'gem2');
    }
    v.set(I.X(4), 17, 16, 'gem2'); v.set(I.X(5), 17, 16, 'gem2');
  } } });
// solhare: golden hare with a sun-ray halo behind the head
derive('lg_solhare', 'hare', { pad: [4, 3, 0], opts: { c: 'honey' }, meta: { legend: 'sun' },
  parts: { head(v, o, I) {
    const cx = I.X(4.5), cy = 9.6, z = 5;
    for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2, long = a % 2 === 0; for (let rr = 4.2; rr <= (long ? 7.4 : 6); rr += 0.5) v.set(Math.round(cx + Math.cos(t) * rr), Math.round(cy + 1.5 + Math.sin(t) * rr), z, long ? 'glowYellow' : 'gold'); }
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; v.set(Math.round(cx + Math.cos(t) * 4.2), Math.round(cy + 1.5 + Math.sin(t) * 4.2), z, 'yellow'); }
  } },
  recolor(v, o, I, part) { v.paint((x, y, z, c) => c === P.wood ? P.gold : c === P.cream2 ? P.butter : null); } });
// perlehval: pearly whale with a pearl crown and a shimmering spout
derive('lg_perlehval', 'hval', { pad: [0, 5, 0], scaleK: 2.6, meta: { legend: 'pearl' },
  recolor(v, o, I, part) { v.paint((x, y, z, c) => c === P.blue ? (y >= 6 ? P.milk : P.lilac) : c === P.sky ? P.blossom : c === P.navySoft ? P.plum : c === P.water ? P.ice : null);
    // mother-of-pearl: pastel rainbow mottling on the white back, so the legend shimmers instead of looking pale
    v.paint((x, y, z, c) => { if (c !== P.milk) return null; const h = H(x * 5, y * 3, z * 7); return h < 0.18 ? P.blossom : h < 0.32 ? P.sky : h < 0.4 ? P.butter : h < 0.52 ? P.lilac : null; }); },
  body(v, o, I) {
    v.box(5, 10, 11, 8, 10, 14, 'gold'); v.set(5, 11, 11, 'gold'); v.set(8, 11, 11, 'gold'); v.set(5, 11, 14, 'gold'); v.set(8, 11, 14, 'gold');
    v.sphere(6.5, 12.4, 12.5, 1.9, 'white'); v.set(6, 14, 13, 'glowYellow'); v.set(5, 13, 13, 'ice');
  } });
// kjempeskilpadde: big gentle tortoise (×2.2) whose shell is a flower garden
derive('lg_kjempeskilpadde', 'pet_skilpadde', { pad: [1, 2, 1], scaleK: 2.2, meta: { legend: 'giant' },
  body(v, o, I) {
    const cols = ['blossom', 'butter', 'white', 'lavender', 'pink'];
    const [sx, sy, sz] = I.size; let n = 0;
    for (let z = 2; z < sz - 4; z += 2) for (let x = 2; x < sx - 2; x += 2) {
      if (H(x, z, 71) < 0.45) continue; let y = -1; for (let yy = sy - 1; yy >= 0; yy--) if (v.get(x, yy, z)) { y = yy; break; } if (y < 4) continue;
      const c = cols[(n++) % cols.length]; v.set(x, y + 1, z, 'butter'); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!v.get(x + dx, y + 1, z + dz)) v.set(x + dx, y + 1, z + dz, c);
    }
    v.paint((x, y, z, c) => c === P.leafDark ? P.leaf2 : null);
  } });
// månekatt: silver-lilac cat with a glowing crescent moon on the forehead and star specks
derive('lg_månekatt', 'katt', { pad: [0, 3, 0], opts: { c: 'lavender', stripe: 'navySoft' }, meta: { legend: 'moon' },
  recolor(v, o, I, part) { v.paint((x, y, z, c) => c === P.white ? P.silver : null); if (part === 'body') v.paint((x, y, z, c) => c === P.lavender && H(x * 5, y * 3, z) < 0.07 ? P.butter : null); },
  parts: { head(v) {   // a glowing crescent moon standing on the forehead
    for (let y = 12; y <= 17; y++) for (let x = 1; x <= 8; x++) { const d1 = Math.hypot(x - 4.5, y - 14.6), d2 = Math.hypot(x - 5.7, y - 15.4); if (d1 <= 2.7 && d2 > 2.1 && !v.get(x, y, 13)) { v.set(x, y, 13, 'glowYellow'); v.set(x, y, 12, 'gold'); } }
  } } });

/* sea giants seen from the shore (hval 12–25 m out, delfin 6–14 m out): same voxels, bigger scale; the castable 'hval'/'delfin' stay small */
derive('hval_stor', 'hval', { scaleK: 2.6, meta: { sea: true } });
derive('delfin_stor', 'delfin', { scaleK: 1.4, meta: { sea: true } });
} // if K

} // models()
if (F.AnimKit) models(); else (F.__animKitWait = F.__animKitWait || []).push(models);
})();

/* ================================================================ F.Beasts API + F.Glitter (DESIGN2 §4.3) */
(function () {
'use strict';
const F = window.F, V = F.VOX;
/* species id -> [model, opts, glitter]. Mirrors DESIGN2 §4.2; F.FAUNA rows (WP4) are used for ids not listed here. */
const S = (m, o, g) => [m, o || null, g || null];
const SPECIES = {
  // 10 Slottsparken
  due: S('due'), and: S('and'), ekorn: S('ekorn'), kanin: S('kanin'), sommerfugl: S('sommerfugl'), svane: S('svane'), pinnsvin: S('pinnsvin'),
  gullfisk: S('fisk_gull'), blomsterkanin: S('kanin', null, 'blomst'), stjerneekorn: S('ekorn', null, 'stjerne'),
  // 11 Landsbyen
  katt: S('katt'), hund: S('hund'), mus: S('mus'), spurv: S('fugl_spurv'), kattunge: S('pet_kattunge'), valp: S('valp'), papegøye: S('pet_papegøye'),
  marsvin: S('pet_marsvin'), krystallkatt: S('katt', null, 'krystall'), boblevalp: S('valp', null, 'boble'),
  // 12 Gården
  ku: S('ku'), sau: S('sau'), gris: S('gris'), høne: S('høne'), hest: S('hest'), kalv: S('kalv'), lam: S('lam'), geit: S('geit'),
  blomsterku: S('ku', null, 'blomst'), stjernegris: S('gris', null, 'stjerne'),
  // 13 Engen
  bie: S('bie'), humle: S('humle'), larve: S('larve'), marihøne: S('marihøne'), gresshoppe: S('gresshoppe'), rådyr: S('rådyr'), lerke: S('fugl_lerke'),
  vipe: S('fugl_vipe'), krystallsommerfugl: S('sommerfugl', null, 'krystall'), blomsterhumle: S('humle', null, 'blomst'),
  // 14 Frukthagen
  meis: S('fugl_meis'), trost: S('fugl_trost'), snegl: S('snegl'), maur: S('maur'), kråke: S('fugl_kråke'), hakkespett: S('fugl_hakkespett'),
  grevling: S('grevling'), ugle: S('ugle'), blomstersnegl: S('snegl', null, 'blomst'), krystallmeis: S('fugl_meis', null, 'krystall'),
  // 15 Innsjøen
  frosk: S('frosk'), gås: S('gås'), fisk: S('fisk', { c: 'sky' }), øyenstikker: S('øyenstikker'), andunge: S('pet_andunge'), bever: S('bever'), oter: S('oter'),
  hegre: S('hegre'), boblefisk: S('fisk', null, 'boble'), krystallfrosk: S('frosk', null, 'krystall'),
  // 16 Møllehaugene
  hare: S('hare'), esel: S('esel'), ponni: S('ponni'), skjære: S('fugl_skjære'), svale: S('fugl_svale'), føll: S('føll'), rev: S('rev'), lama: S('lama'),
  stjernerev: S('rev', null, 'stjerne'), bobleesel: S('esel', null, 'boble'),
  // 17 Stranda
  krabbe: S('krabbe'), måke: S('måke'), sjøstjerne: S('sjøstjerne'), tjeld: S('fugl_tjeld'), eremittkreps: S('eremittkreps'), sel: S('sel'), lunde: S('lunde'),
  skilpadde: S('pet_skilpadde'), boblekrabbe: S('krabbe', null, 'boble'), stjernemåke: S('måke', null, 'stjerne'),
  // 18 Havet
  makrell: S('fisk_makrell'), torsk: S('fisk_torsk'), manet: S('manet'), blekksprut: S('blekksprut'), reke: S('reke'), delfin: S('delfin_stor'), hval: S('hval_stor'),
  sjøhest: S('sjøhest'), krystallsjøhest: S('sjøhest', null, 'krystall'), stjernedelfin: S('delfin_stor', null, 'stjerne'),
  // 19 Snøhaugen
  pingvin: S('pingvin'), rype: S('fugl_rype'), snøhare: S('hare', { c: 'snow' }), rein: S('rein'), lemen: S('lemen'), fjellrev: S('rev', { c: 'snow' }),
  moskus: S('moskus'), elg: S('elg'), blomsterrein: S('rein', null, 'blomst'), boblepingvin: S('pingvin', null, 'boble'),
  // 20 Legendene
  enhjørning: S('lg_enhjørning'), vingehest: S('lg_vingehest'), skylam: S('lg_skylam'), isbjørnunge: S('isbjørnunge'), krystallhjort: S('lg_krystallhjort'),
  solhare: S('lg_solhare'), perlehval: S('lg_perlehval'), kjempeskilpadde: S('lg_kjempeskilpadde'), månekatt: S('lg_månekatt'), elefantunge: S('elefantunge'),
};
// legend overlay names (F.FAUNA opts.legend) -> legend model
const LEGEND = { horn: 'lg_enhjørning', wings: 'lg_vingehest', cloud: 'lg_skylam', crystal: 'lg_krystallhjort', sun: 'lg_solhare', pearl: 'lg_perlehval',
  giant: 'lg_kjempeskilpadde', moon: 'lg_månekatt' };
/* FALLBACK: a model that is missing at integration time -> nearest family model + recolour (opts must be options that model supports) */
const FALLBACK = {
  sommerfugl: ['bie'], marihøne: ['bie'], gresshoppe: ['larve'], maur: ['larve'], øyenstikker: ['bie'], rådyr: ['føll', { c: 'woodRed' }],
  grevling: ['pet_pinnsvin'], bever: ['pet_marsvin'], oter: ['pet_marsvin'], hegre: ['svane'], hare: ['kanin', { c: 'woodLight' }],
  sjøstjerne: ['krabbe'], eremittkreps: ['krabbe'], lunde: ['pingvin'], manet: ['fisk', { c: 'pink' }], blekksprut: ['fisk', { c: 'pink' }],
  reke: ['fisk', { c: 'pink' }], sjøhest: ['fisk', { c: 'yellow' }], lemen: ['mus'], moskus: ['sau'], isbjørnunge: ['sau'], elefantunge: ['esel'],
  lg_enhjørning: ['pet_enhjørningføll'], lg_vingehest: ['hest', { c: 'white' }], lg_skylam: ['lam'], lg_krystallhjort: ['føll'], lg_solhare: ['kanin'],
  lg_perlehval: ['hval'], lg_kjempeskilpadde: ['pet_skilpadde'], lg_månekatt: ['katt', { c: 'hairGrey' }],
  hval_stor: ['hval'], delfin_stor: ['delfin'],
  fisk_gull: ['fisk', { c: 'orange' }], fisk_makrell: ['fisk', { c: 'sky' }], fisk_torsk: ['fisk', { c: 'yellow' }],
};
['spurv', 'lerke', 'vipe', 'meis', 'trost', 'hakkespett', 'kråke', 'skjære', 'svale', 'tjeld', 'rype'].forEach(k => { FALLBACK['fugl_' + k] = ['fugl']; });
const BY_MOVE = { fly: 'fugl', swim: 'fisk', hop: 'kanin', crawl: 'larve', walk: 'katt' };
const ELEMENTS = ['krystall', 'blomst', 'boble', 'stjerne'];
const faunaRow = id => { const FA = F.FAUNA; if (!FA) return null; try { return FA.byId ? FA.byId(id) : (FA.species || []).find(s => s.id === id) || null; } catch (e) { return null; } };
// a data-side model name (+ opts) -> our model id + opts
function modelFor(model, opts) {
  opts = opts || {}; const o = Object.assign({}, opts); let m = model;
  if (o.legend && LEGEND[o.legend]) { m = LEGEND[o.legend]; delete o.legend; }
  if ((m === 'fugl' || m === 'fisk') && o.kind) { const k = String(o.kind); m = m + '_' + (k === 'gullfisk' ? 'gull' : k); delete o.kind; }
  delete o.legend; delete o.kind;
  return [m, Object.keys(o).length ? o : null];
}
const specCache = new Map();
function spec(spId) {
  if (specCache.has(spId)) return specCache.get(spId);
  let m = null, o = null, g = null, src = 'wp5';
  const mine = SPECIES[spId], row = faunaRow(spId);
  if (mine) { [m, o, g] = mine; }
  else if (row && row.model) { [m, o] = modelFor(row.model, Object.assign({}, row.opts || {}, row.legend ? { legend: row.legend } : {})); g = row.glitter || null; src = 'fauna'; }
  else if (V.has(spId)) { m = spId; src = 'vox'; }
  if (g && !ELEMENTS.includes(g)) g = null;
  if (m && !V.has(m)) { const fb = FALLBACK[m]; if (fb && V.has(fb[0])) { o = Object.assign({}, fb[1] || {}, o && o.c === 'snow' ? {} : {}); m = fb[0]; src += '+fallback'; } else m = null; }
  if (!m) { const mv = row && BY_MOVE[row.move]; m = V.has(mv) ? mv : (V.has('fugl') ? 'fugl' : null); o = null; src = 'fallback'; }
  const r = { id: spId, model: m, opts: o, glitter: g, src, known: !!(mine || row || V.has(spId)) };
  if (V.defs[m]) specCache.set(spId, r);   // cache only once the model exists (models may register later in the gallery)
  return r;
}

/* ---------------------------------------------------------- F.Glitter */
// element gradients: dark → mid → light (60 % mix toward the tone matching the vertex luminance)
const GRAD = {
  krystall: [0x5a66e0, 0x78c4ff, 0xaee2ff], blomst: [0xd0508e, 0xff8cc0, 0xffb6da], boble: [0x2f8ccc, 0x5cc8f0, 0xa4e6ff], stjerne: [0xd08a10, 0xffcf3a, 0xffeca8],
};
const gradC = {}; for (const k in GRAD) gradC[k] = GRAD[k].map(h => new THREE.Color(h));
const tmpC = new THREE.Color();
const hslA = { h: 0, s: 0, l: 0 }, hslB = { h: 0, s: 0, l: 0 };
function remapRGB(r, g, b, el, out) {
  const mx = Math.max(r, g, b); if (mx < 0.3) { out[0] = r; out[1] = g; out[2] = b; return out; }   // keep eyes / dark outlines
  const L = Math.min(1, 0.299 * r + 0.587 * g + 0.114 * b), G = gradC[el];
  if (L < 0.5) tmpC.copy(G[0]).lerp(G[1], L / 0.5); else tmpC.copy(G[1]).lerp(G[2], (L - 0.5) / 0.5);
  // 60 % toward the element tone in saturation and lightness, hue taken from the element (no muddy warm+cool mixes)
  tmpC.getHSL(hslB); tmpC.setRGB(r, g, b).getHSL(hslA);
  tmpC.setHSL(hslB.h, hslA.s * 0.4 + hslB.s * 0.6, hslA.l * 0.4 + hslB.l * 0.6);
  out[0] = tmpC.r; out[1] = tmpC.g; out[2] = tmpC.b; return out;
}
const remapHex = (hex, el) => { tmpC.setHex(hex); const o = remapRGB(tmpC.r, tmpC.g, tmpC.b, el, [0, 0, 0]); return new THREE.Color(o[0], o[1], o[2]).getHex(); };
const geoCache = new Map();
function remapGeo(geo, el) {
  const key = geo.uuid + '|' + el; let g = geoCache.get(key); if (g) return g;
  const c = geo.getAttribute('color'); if (!c) return geo;
  g = new THREE.BufferGeometry();
  for (const n in geo.attributes) if (n !== 'color') g.setAttribute(n, geo.attributes[n]);
  const a = new Float32Array(c.array.length), t = [0, 0, 0];
  for (let i = 0; i < a.length; i += 3) { remapRGB(c.array[i], c.array[i + 1], c.array[i + 2], el, t); a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (geo.index) g.setIndex(geo.index);
  g.boundingBox = geo.boundingBox && geo.boundingBox.clone(); g.boundingSphere = geo.boundingSphere && geo.boundingSphere.clone();
  geoCache.set(key, g); return g;
}
// small voxel attachments (registered once): crystal shard, flower, flower crown
V.def('gl_shard', { size: [3, 7, 3], scale: 1 / 16, build(v) { v.box(1, 0, 1, 1, 6, 1, 'crystal'); v.box(0, 0, 1, 2, 3, 1, 'crystal'); v.box(1, 0, 0, 1, 3, 2, 'crystal'); v.set(1, 6, 1, 'white'); v.set(1, 4, 1, 'ice'); }, meta: { group: 'fx', by: 'wp5' } });
V.def('gl_flower', { size: [3, 2, 3], scale: 1 / 16, build(v, o) { const c = o.c || 'blossom'; v.set(1, 0, 1, 'leaf'); v.set(0, 1, 1, c); v.set(2, 1, 1, c); v.set(1, 1, 0, c); v.set(1, 1, 2, c); v.set(1, 1, 1, 'butter'); }, meta: { group: 'fx', by: 'wp5', variants: { c: ['blossom', 'lavender', 'white'] } } });
V.def('gl_crown', { size: [9, 2, 9], scale: 1 / 16, build(v) {
  const cols = ['blossom', 'butter', 'lavender', 'white', 'pink', 'mint'];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = Math.round(4 + Math.cos(a) * 3.6), z = Math.round(4 + Math.sin(a) * 3.6); v.set(x, 0, z, i % 2 ? 'leaf' : 'leaf2'); if (i % 2 === 0) v.set(x, 1, z, cols[(i / 2) % cols.length]); }
}, meta: { group: 'fx', by: 'wp5' } });
let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(32, 2); g.lineTo(36, 28); g.lineTo(62, 32); g.lineTo(36, 36); g.lineTo(32, 62); g.lineTo(28, 36); g.lineTo(2, 32); g.lineTo(28, 28); g.closePath(); g.fill();
  starTex = new THREE.CanvasTexture(c); return starTex;
}
const SPR = {}; const sprMat = el => SPR[el] || (SPR[el] = new THREE.SpriteMaterial({ map: starTexture(), color: { krystall: 0xdff8ff, blomst: 0xffd6ea, boble: 0xcff8ff, stjerne: 0xfff0a0 }[el], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
let bubGeo = null, bubMat = null;
const live = new Set();
function partBox(obj, group) { // local-space bbox of a part pivot's meshes (skinned rigs: the cached part box of that bone)
  if (obj.isBone) { const pb = group && group.userData.partBoxes && group.userData.partBoxes[obj.name]; return pb ? pb.clone() : new THREE.Box3(); }
  const b = new THREE.Box3(); obj.children.forEach(m => { if (m.isMesh && m.geometry && !m.userData.glit) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); } }); return b;
}
// merge small voxel attachments into one mesh per material class (draw-call thrift)
const _mm = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
function mergeGeos(list) {   // list: [geometry, matrix4]
  let nv = 0, ni = 0; list.forEach(([g]) => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const Pp = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), I = new Uint32Array(ni); let vo = 0, io = 0;
  for (const [g0, m] of list) {
    const g = g0.clone(); g.applyMatrix4(m); const cnt = g.attributes.position.count;
    Pp.set(g.attributes.position.array, vo * 3); N.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.color) C.set(g.attributes.color.array, vo * 3); else C.fill(1, vo * 3, (vo + cnt) * 3);
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; io += ix.length; } else { for (let i = 0; i < cnt; i++) I[io + i] = vo + i; io += cnt; }
    vo += cnt; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.setIndex(new THREE.BufferAttribute(I, 1)); out.computeBoundingBox(); out.computeBoundingSphere(); return out;
}
function bundle(items) {   // items: {id, o, p:[x,y,z], s, r:[rx,ry,rz]} -> Group with ≤ 1 mesh per class
  const by = {};
  for (const it of items) {
    const e = V.geometry(it.id, it.o || {}); _me.set((it.r || [])[0] || 0, (it.r || [])[1] || 0, (it.r || [])[2] || 0); _mq.setFromEuler(_me);
    _mm.compose(_mp.set(it.p[0], it.p[1], it.p[2]), _mq, _ms.setScalar(it.s || 1));
    for (const cls in e.body) (by[cls] = by[cls] || []).push([e.body[cls], _mm.clone()]);
  }
  const g = new THREE.Group();
  for (const cls in by) { const m = new THREE.Mesh(mergeGeos(by[cls]), V.material(cls)); if (cls === 'glass') m.renderOrder = 2; g.add(m); }
  return g;
}
function attach(group, el) {
  const box = new THREE.Box3(); group.children.forEach(m => { if (m.isMesh && m.geometry && !m.userData.glit) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); } });
  const parts = (group.userData && group.userData.parts) || {};
  for (const pn in parts) { if (parts[pn].isBone) continue; const pb = partBox(parts[pn]); if (!pb.isEmpty()) { pb.translate(parts[pn].position); box.union(pb); } }
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), big = Math.max(size.x, size.y, size.z);
  const k = Math.max(0.7, Math.min(2.2, big / 1.1));   // attachment scale relative to a ~1 m animal
  const add = (o, parent) => { o.userData.glit = true; o.traverse(m => { m.userData.glit = true; m.castShadow = false; }); (parent || group).add(o); return o; };
  const head = parts.head;
  if (el === 'krystall') {
    const n = big > 0.9 ? 3 : 2, items = [];
    for (let i = 0; i < n; i++) items.push({ id: 'gl_shard', s: k * 0.8 * (i === 1 ? 1.15 : 0.85), p: [c.x + (i - (n - 1) / 2) * 0.04, box.max.y - 0.06 * k, c.z + (i - (n - 1) / 2) * size.z * 0.22], r: [(i - 1) * -0.2, 0, (i - 1) * 0.35] });
    add(bundle(items));
  } else if (el === 'blomst') {
    if (head && !partBox(head, group).isEmpty()) { const hb = partBox(head, group); const cr = add(V.make('gl_crown'), head); const hs = hb.getSize(new THREE.Vector3()); cr.scale.setScalar(Math.max(0.55, Math.min(1.3, hs.x / 0.62)));
      cr.position.set((hb.min.x + hb.max.x) / 2, hb.min.y + Math.min(hs.y, hs.x * 1.05) - 0.04, (hb.min.z + hb.max.z) / 2); }
    else { const cr = add(V.make('gl_crown')); cr.scale.setScalar(Math.max(0.4, Math.min(0.8, size.x / 1.5))); cr.position.set(c.x, box.max.y - 0.03, c.z + size.z * 0.2); }
    const r = F.U.rng(F.U.hashStr(group.name || 'x'));
    const fl = []; for (let i = 0; i < 3; i++) fl.push({ id: 'gl_flower', o: { c: ['blossom', 'lavender', 'white'][i] }, s: k * (head ? 1 : 0.7), p: [box.min.x + size.x * (0.25 + r() * 0.5), box.max.y * (0.55 + r() * 0.2), box.min.z + size.z * (0.15 + i * 0.25)] });
    add(bundle(fl));
  } else if (el === 'boble') {
    bubGeo = bubGeo || new THREE.IcosahedronGeometry(1, 1);
    bubMat = bubMat || new THREE.MeshPhongMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.45, shininess: 120, specular: 0xffffff, depthWrite: false, emissive: 0x204050 });
    const ring = add(new THREE.Group()); ring.position.set(c.x, c.y, c.z); ring.name = 'glitRing';
    const R = Math.max(size.x, size.z) * 0.62 + 0.08;
    const L = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; _mm.compose(_mp.set(Math.cos(a) * R, Math.sin(i * 2.1) * size.y * 0.25, Math.sin(a) * R), _mq.identity(), _ms.setScalar((0.05 + (i % 3) * 0.018) * k)); L.push([bubGeo, _mm.clone()]); }
    const bm = new THREE.Mesh(mergeGeos(L), bubMat); bm.renderOrder = 4; ring.add(bm);
    ring.traverse(m => { m.userData.glit = true; });
    group.userData.glitRing = ring;
  }
  if (el === 'krystall' || el === 'stjerne') {
    const r = F.U.rng(F.U.hashStr((group.name || '') + el));
    for (let i = 0; i < (el === 'stjerne' ? 5 : 4); i++) { const sp = new THREE.Sprite(sprMat(el)); const s = 0.13 * k; sp.position.set(box.min.x + size.x * r(), box.min.y + size.y * (0.45 + r() * 0.6), box.min.z + size.z * r()); sp.scale.setScalar(s * 0.7); sp.userData = { tw: true, ph: i * 1.7, s, glit: true }; group.add(sp); }
  }
  group.userData.glitBox = { c, size, k };
}
F.Glitter = {
  ELEMENTS,
  /* generic: 60 % vertex-colour remap toward the element palette + attachments. Idempotent per group. */
  apply(group, el, o) {
    if (!group || !gradC[el] || (group.userData && group.userData.glitter)) return group;
    group.traverse(m => { if (m.isMesh && m.geometry && !m.userData.glit) m.geometry = remapGeo(m.geometry, el); });
    group.userData.glitter = el;
    if (!(o && o.colourOnly)) attach(group, el);
    live.add(group);
    let first = null; group.traverse(m => { if (!first && m.isMesh && !m.userData.glit) first = m; });
    if (first) first.onBeforeRender = () => { if (!live.has(group)) live.add(group); };   // pooled rigs come back to life
    return group;
  },
  remapHex, gradient: GRAD,
};
// animate: twinkles, bubble ring orbit, star trail (only while on stage)
const trail = [];
const onStage = g => { let o = g; while (o) { if (!o.visible) return false; if (o.isScene) return true; o = o.parent; } return false; };
const wp = new THREE.Vector3();
F.on && F.on('tick', (dt, t) => {
  for (let i = trail.length - 1; i >= 0; i--) { const s = trail[i]; s.userData.life -= dt; const k = Math.max(0, s.userData.life / 0.9); s.material.opacity = k; s.position.y += dt * 0.25; if (s.userData.life <= 0) { if (s.parent) s.parent.remove(s); s.material.dispose(); trail.splice(i, 1); } }
  if (!live.size) return;
  for (const g of live) {
    if (!g.parent) { if ((g.userData._orph = (g.userData._orph || 0) + 1) > 600) live.delete(g); continue; }
    g.userData._orph = 0;
    if (!onStage(g)) continue;
    for (const c of g.children) if (c.userData && c.userData.tw) { const k = Math.max(0, Math.sin(t * 2.4 + c.userData.ph)); c.scale.setScalar(0.0001 + c.userData.s * k * k); }
    if (g.userData.glitRing) { g.userData.glitRing.rotation.y = t * 0.9; g.userData.glitRing.children.forEach((b, i) => { b.position.y = Math.sin(t * 1.6 + i * 2.1) * 0.08; }); }
    if (g.userData.glitter === 'stjerne' && trail.length < 40) {
      g.getWorldPosition(wp); const last = g.userData._tp || (g.userData._tp = wp.clone());
      if (wp.distanceTo(last) > 0.35) {
        let sc = g; while (sc.parent) sc = sc.parent;
        const m = sprMat('stjerne').clone(); m.opacity = 1; const s = new THREE.Sprite(m); s.position.copy(last).y += 0.25 + Math.random() * 0.3; s.scale.setScalar(0.22); s.userData = { life: 0.9 };
        sc.add(s); trail.push(s); last.copy(wp);
      }
    }
  }
});

/* ---------------------------------------------------------- inst: greedy-meshed rest pose (body + parts), one shared material */
let instMat = null;
function solidGrid(id, o) {
  const def = V.defs[id], [sx, sy, sz] = def.size, col = new Int32Array(sx * sy * sz).fill(-1);
  const take = fn => { const g = V.grid(sx, sy, sz); fn(g, o || {}); g.paint((x, y, z, c) => { col[x + sx * (y + sy * z)] = c; return null; }); };
  take(def.build); for (const pn in (def.parts || {})) take(def.parts[pn].build);
  return { col, sx, sy, sz, s: def.scale };
}
// far-LOD glitter marks baked into the grid (the full model has real attachments): crystal spikes, flowers, star sparkles, bubble beads
function glitGrid(G, el) {
  const { sx, sy, sz } = G, PADY = 4, ny = sy + PADY, col = new Int32Array(sx * ny * sz).fill(-1);
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) col[x + sx * (y + ny * z)] = G.col[x + sx * (y + sy * z)];
  const topY = (x, z) => { for (let y = sy - 1; y >= 0; y--) if (col[x + sx * (y + ny * z)] >= 0) return y; return -1; };
  const set = (x, y, z, c) => { if (x >= 0 && y >= 0 && z >= 0 && x < sx && y < ny && z < sz) col[x + sx * (y + ny * z)] = c; };
  const cx = Math.floor(sx / 2), r = F.U.rng(F.U.hashStr(el + sx + sy + sz));
  if (el === 'krystall') {
    const zs = [Math.round(sz * 0.35), Math.round(sz * 0.5), Math.round(sz * 0.65)];
    zs.forEach((z, i) => { const t = topY(cx, z); if (t < 0) return; const h = i === 1 ? 4 : 3; for (let k = 1; k <= h; k++) set(cx, t + k, z, k === h ? 0xfffffe : 0x9fe8fe); set(cx - 1, t + 1, z, 0x9fe8fe); set(cx + 1, t + 1, z, 0x9fe8fe); });
  } else if (el === 'blomst' || el === 'stjerne') {
    const cols = el === 'blomst' ? [0xf6a9c9, 0xfff0a1, 0xfffffe, 0xb9a5f1] : [0xfff6b1, 0xffe067];
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * sx), z = Math.floor(r() * sz), t = topY(x, z); if (t < 0) continue; set(x, t + 1, z, cols[i % cols.length]); if (el === 'stjerne' && i % 3 === 0) set(x, t + 2 + Math.floor(r() * 2), z, cols[0]); }
  } else if (el === 'boble') {
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (sx / 2)), z = Math.round(sz / 2 + Math.sin(a) * (sz / 2 - 0.5)), y = Math.round(sy * (0.5 + 0.12 * i)); set(x, y, z, 0xcff4fe); }
  }
  return { col, sx, sy: ny, sz, s: G.s, raw: true };
}
function greedy(G, el, keep) {
  const { col, sx, sy, sz, s } = G, dims = [sx, sy, sz];
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) ? -1 : col[x + sx * (y + sy * z)];
  const Pp = [], N = [], C = [], I = [], c3 = new THREE.Color(), q = [0, 0, 0], tint = new Map();
  const colour = h => { if (!el || (keep && keep.has(h))) return h; let r = tint.get(h); if (r == null) { r = remapHex(h, el); tint.set(h, r); } return r; };
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, w = (d + 2) % 3, du = dims[u], dw = dims[w], mask = new Int32Array(du * dw);
    for (const sg of [1, -1]) for (let i = 0; i < dims[d]; i++) {
      for (let bq = 0; bq < dw; bq++) for (let a = 0; a < du; a++) {
        q[d] = i; q[u] = a; q[w] = bq; const c = at(q[0], q[1], q[2]); let m = -1;
        if (c >= 0) { q[d] = i + sg; if (at(q[0], q[1], q[2]) < 0) m = c; }
        mask[a + du * bq] = m;
      }
      for (let bq = 0; bq < dw; bq++) for (let a = 0; a < du;) {
        const c = mask[a + du * bq]; if (c < 0) { a++; continue; }
        let wd = 1; while (a + wd < du && mask[a + wd + du * bq] === c) wd++;
        let ht = 1; outer: while (bq + ht < dw) { for (let kk = 0; kk < wd; kk++) if (mask[a + kk + du * (bq + ht)] !== c) break outer; ht++; }
        const plane = sg > 0 ? i + 1 : i, vi = Pp.length / 3;
        for (const [ca, cb] of [[a, bq], [a + wd, bq], [a + wd, bq + ht], [a, bq + ht]]) {
          const p = [0, 0, 0]; p[d] = plane; p[u] = ca; p[w] = cb; Pp.push((p[0] - sx / 2) * s, p[1] * s, (p[2] - sz / 2) * s);
          const n = [0, 0, 0]; n[d] = sg; N.push(n[0], n[1], n[2]);
        }
        c3.setHex(colour(c)); const sh = d === 1 ? (sg > 0 ? 1 : 0.7) : 0.92;
        for (let kk = 0; kk < 4; kk++) C.push(c3.r * sh, c3.g * sh, c3.b * sh);
        if (sg > 0) I.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); else I.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
        for (let bb = 0; bb < ht; bb++) for (let kk = 0; kk < wd; kk++) mask[a + kk + du * (bq + bb)] = -1;
        a += wd;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/* ---------------------------------------------------------- thumbnails (same lighting and framing as F.Thumb) */
let tr = null, tscene = null, tcam = null; const thumbs = new Map();
let silMat = null;
const SIL34 = new Set(['kanin', 'hare', 'lg_solhare', 'pingvin', 'ugle', 'pet_marsvin']);   // these read better from 3/4 (two ears, the face disc)
function thumbOf(obj, size, sil) {
  if (!tr) {
    tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.setPixelRatio(1);
    tscene = new THREE.Scene(); tscene.add(new THREE.HemisphereLight(0xeaf4ff, 0x9bbf86, 0.75)); const d = new THREE.DirectionalLight(0xfff0d8, 0.75); d.position.set(3, 6, 5); tscene.add(d);
    tcam = new THREE.PerspectiveCamera(28, 1, 0.01, 200);
  }
  tr.setSize(size, size); tscene.add(obj);
  obj.traverse(o => { if (o.isSprite && o.userData.tw) o.scale.setScalar(o.userData.s * 0.8); if (sil && (o.isSprite || o.userData.glit)) o.visible = false; });
  const ring = obj.userData.glitRing; if (ring) ring.visible = false;   // frame the animal, not its bubble halo
  const box = new THREE.Box3(), bb = new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverse(o => { if (o.isMesh && o.geometry && o.visible && !(ring && o.parent === ring)) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(bb); } });
  if (ring && !sil) ring.visible = true;
  // silhouettes are read by outline only, so they use a near side profile (legs, tail, ears, beak and trunk all stick out); colour thumbs keep the 3/4 view
  const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), angle = sil ? (SIL34.has(obj.userData.model) ? 0.55 : 1.2) : 0.5, el = sil ? 0.2 : 0.45;
  const R = Math.max(Math.max(sz.x, sz.y * 1.1, sz.z) * 1.75, sz.length() * 0.5 * 3.3) + 0.02;
  tcam.position.set(c.x + Math.sin(angle) * R, c.y + R * el, c.z + Math.cos(angle) * R); tcam.lookAt(c);
  tscene.overrideMaterial = sil ? (silMat || (silMat = new THREE.MeshBasicMaterial({ color: 0xffffff }))) : null;
  if (sil) silMat.color.set(sil);
  tr.setClearColor(0x000000, 0); tr.render(tscene, tcam); tscene.overrideMaterial = null;
  const url = tr.domElement.toDataURL('image/png'); tscene.remove(obj); return url;
}

/* ---------------------------------------------------------- skinned rigs: the whole animal in 1 draw call (2–3 with glass / glow voxels)
   Every VOX part becomes a THREE.Bone at its pivot; obj.userData.parts[name] = that bone, so F.Rig.tick animates it unchanged. */
const skinCache = new Map();
function skinGeo(model, opts) {
  const key = model + '|' + JSON.stringify(opts || {}); let e = skinCache.get(key); if (e) return e;
  const g = V.geometry(model, opts || {}), names = Object.keys(g.parts), out = {}, boxes = {};
  for (const cls of ['opaque', 'glass', 'glow']) {
    const L = []; if (g.body[cls]) L.push([g.body[cls], 0, [0, 0, 0]]);
    names.forEach((pn, i) => { const pg = g.parts[pn].geo[cls]; if (pg) L.push([pg, i + 1, g.parts[pn].pos]); });
    if (!L.length) continue;
    let nv = 0, ni = 0; L.forEach(([q]) => { nv += q.attributes.position.count; ni += q.index.count; });
    const Pp = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), I = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const [q, bi, off] of L) {
      const pa = q.attributes.position.array, cnt = q.attributes.position.count;
      for (let i = 0; i < cnt; i++) { Pp[(vo + i) * 3] = pa[i * 3] + off[0]; Pp[(vo + i) * 3 + 1] = pa[i * 3 + 1] + off[1]; Pp[(vo + i) * 3 + 2] = pa[i * 3 + 2] + off[2]; SI[(vo + i) * 4] = bi; SW[(vo + i) * 4] = 1; }
      N.set(q.attributes.normal.array, vo * 3); C.set(q.attributes.color.array, vo * 3);
      const ix = q.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; io += ix.length; vo += cnt;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3));
    m.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); m.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    m.setIndex(new THREE.BufferAttribute(I, 1)); m.computeBoundingBox(); m.computeBoundingSphere();
    out[cls] = m;
  }
  names.forEach(pn => { const b = new THREE.Box3(); for (const cls in g.parts[pn].geo) { const q = g.parts[pn].geo[cls]; if (!q.boundingBox) q.computeBoundingBox(); b.union(q.boundingBox); } boxes[pn] = b; });
  e = { geos: out, names, pos: names.map(pn => g.parts[pn].pos), boxes };
  skinCache.set(key, e); return e;
}
function skinnedMake(model, opts) {
  const e = skinGeo(model, opts), grp = new THREE.Group(); grp.name = model;
  const root = new THREE.Bone(); root.name = 'root'; grp.add(root);
  const bones = [root], parts = {};
  e.names.forEach((pn, i) => { const b = new THREE.Bone(); b.name = pn; b.position.set(e.pos[i][0], e.pos[i][1], e.pos[i][2]); root.add(b); bones.push(b); parts[pn] = b; });
  grp.updateMatrixWorld(true);
  const sk = new THREE.Skeleton(bones);
  for (const cls in e.geos) {
    const m = new THREE.SkinnedMesh(e.geos[cls], V.material(cls)); m.name = model + ':' + cls;
    m.castShadow = cls === 'opaque'; m.receiveShadow = cls === 'opaque'; if (cls === 'glass') m.renderOrder = 2;
    grp.add(m); m.bind(sk);
  }
  grp.userData.parts = parts; grp.userData.partBoxes = e.boxes; grp.userData.skinned = true;
  grp.addEventListener('removed', () => sk.dispose());   // lead: free the float bone texture on despawn (three rebuilds it lazily if the rig is re-added) – was a GPU texture leak
  return grp;
}

let SKIN = true;   // F.Beasts.skinned(false) falls back to classic VOX groups (one mesh per part)
const instCache = new Map();
const GLIT_KEEP = new Set([0x9fe8fe, 0xfffffe, 0xf6a9c9, 0xfff0a1, 0xb9a5f1, 0xfff6b1, 0xffe067, 0xcff4fe]);   // far-LOD glitter marks (off-palette on purpose: never tinted)
F.Beasts = {
  SPECIES, FALLBACK, LEGEND,
  spec,
  ids: () => Object.keys(SPECIES),
  has(spId) { const r = spec(spId); return !!(r.known && r.model && V.has(r.model)); },
  /* full rigged model: a VOX Group (obj.name = model id → F.Rig.tick / F.Rig.bob work) */
  make(spId, mo) {
    const r = spec(spId);
    if (mo && mo.merged) {   // one draw call, rest pose, no rig (cheap near-LOD when the draw-call budget is tight)
      const it = F.Beasts.inst(spId); const m = it ? new THREE.Mesh(it.geometry, it.material) : new THREE.Group();
      m.name = 'merged:' + (r.model || spId); m.userData.sp = spId; m.userData.model = r.model; m.userData.parts = {}; m.userData.glitter = r.glitter; return m;
    }
    let g;
    try { g = !r.model ? new THREE.Group() : (mo && mo.vox) || !SKIN ? V.make(r.model, r.opts || {}) : skinnedMake(r.model, r.opts || {}); }
    catch (e) { console.warn('Beasts.make', spId, e.message); try { g = V.make(r.model, r.opts || {}); } catch (e2) { g = new THREE.Group(); } }
    g.userData.sp = spId; g.userData.model = r.model;
    if (r.glitter) F.Glitter.apply(g, r.glitter);
    return g;
  },
  thumb(spId, px, o) {
    px = px || 128; const r = spec(spId); const key = spId + '|' + px + (o && o.sil ? '|sil' : '');
    if (thumbs.has(key)) return thumbs.get(key);
    let url = '';
    try {
      const sil = o && o.sil ? (o.sil === true ? 0x6b5f9a : o.sil) : null;
      if (!r.glitter && !sil && F.Thumb && r.model) url = F.Thumb.url(r.model, r.opts || {}, { size: px });
      else if (r.model) url = thumbOf(F.Beasts.make(spId), px, sil);
    } catch (e) { console.warn('Beasts.thumb', spId, e.message); }
    if (url) thumbs.set(key, url);
    return url;
  },
  /* instancing source for 14–45 m: greedy-meshed rest pose with flat vertex colours (glitter remapped), one shared Lambert material */
  inst(spId) {
    if (instCache.has(spId)) return instCache.get(spId);
    const r = spec(spId); if (!r.model) return null;
    let res = null;
    try { const G0 = solidGrid(r.model, r.opts); res = { geometry: r.glitter ? greedy(glitGrid(G0, r.glitter), r.glitter, GLIT_KEEP) : greedy(G0, null), material: instMat || (instMat = new THREE.MeshLambertMaterial({ vertexColors: true })) }; }
    catch (e) { console.warn('Beasts.inst', spId, e.message); return null; }
    if (V.defs[r.model]) instCache.set(spId, res);
    return res;
  },
  skinned(on) { if (on != null) SKIN = !!on; return SKIN; },
  tris(spId) { const g = F.Beasts.make(spId); let t = 0; g.traverse(o => { if (o.isMesh && o.geometry.index) t += o.geometry.index.count / 3; }); const it = F.Beasts.inst(spId); return { full: t, inst: it ? it.geometry.index.count / 3 : 0 }; },
};
F.on && F.on('ready', () => { if (F.dbg && !F.dbg.beasts) F.dbg.beasts = () => F.Beasts.ids().map(id => [id, F.Beasts.spec(id).model, F.Beasts.has(id)]); });
})();
