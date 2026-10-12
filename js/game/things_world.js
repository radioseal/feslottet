/* Feslottet – kingdom interactables (DESIGN §7 #124–161 + extras) and their fallback voxel models (o_*).
   Owner: OBJECTS+BEHAVIOURS WP.  Every type: F.Things.def(type, {...}) with play variants (cycled per press), 1-in-10 surprise,
   persisted state via F.BEH.init. Learning spots use F.BEH.learnOrPlay(th, formats, play, payoff).
   Model choice: the DESIGN id model (n_*, v_*, sau …) when MODELS-2/3 provide it WITH the needed parts, else our o_* model.
   Published for WORLD:  F.OBJ.types  {type:{name, spot, learn, biomes:{Biome:weight}, radius, water, ext}}   (86 types, Wave 2)
                         F.OBJ.forBiome(biome) -> [[type, weight], ...]     F.OBJ.spots(biome) -> [type, ...]
                         F.OBJ.dataFor(type, rng) -> default data (num/lock/letters/start/item)
                         ext:true types are placed by OUR additive chunk generator (F.OBJ.extrasPerChunk, default 2.2/chunk).
                         If WORLD starts drawing from forBiome itself, set F.W.objTables = true → our generator stays out.
   Wave 2 (WP4 2026-10-10: wandering animals moved to js/game/fauna.js), learning spots invite (glow + twinkle + breath; mailbox flag up)
   while a task can be offered and carry a per-biome garnish (o_pynt); letter stones show one legible letter plaque. 
   Thing data understood: v_husdor {num, voice, label:false}  v_tallstolpe {num}  v_skattkiste {lock:'num'|'word'}
     n_bokstavsteiner {letters}  n_trappesteiner {start}  n_taptting {item}  v_veiskilt {dirs:[{name, x, z}]}  v_markedsbod {shop} */
(function () {
'use strict';
const F = window.F, U = F.U;
const D = (id, spec) => { if (!F.VOX.has(id)) F.VOX.def(id, Object.assign({ meta: { group: 'objekt' } }, spec)); };
const disc = (v, cx, cy, cz, r, col, axis) => { // flat disc; axis 'y' (horizontal) | 'z' (facing front) | 'x'
  const R = Math.ceil(r);
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) if (a * a + b * b <= r * r + 0.3) {
    if (axis === 'z') v.set(cx + a, cy + b, cz, typeof col === 'function' ? col(a, b) : col);
    else if (axis === 'x') v.set(cx, cy + b, cz + a, typeof col === 'function' ? col(a, b) : col);
    else v.set(cx + a, cy, cz + b, typeof col === 'function' ? col(a, b) : col);
  }
};
const surface = (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1);

/* =================================================================== MODELS (o_*) */
// windmill (4.5 m wide, 7 m tall) – sails turn about the front hub
D('o_molle', { size: [36, 58, 28], scale: 1 / 8,
  build(v) {
    for (let y = 0; y < 37; y++) v.cyl(18, y, 13, 8 - y * 0.075, 1, y === 14 || y === 15 ? 'woodRed' : (y < 2 ? 'stone2' : 'cream'));
    v.box(16, 0, 19, 19, 7, 21, 'woodDark'); v.box(17, 8, 21, 18, 8, 21, 'woodDark');
    v.box(17, 22, 18, 18, 25, 20, 'sky'); v.box(16, 22, 19, 16, 25, 19, 'woodDark'); v.box(19, 22, 19, 19, 25, 19, 'woodDark');
    v.box(9, 28, 13, 9, 30, 14, 'sky');
    v.cone(18, 36, 13, 8, 10, 'roofRed'); v.set(18, 46, 13, 'gold');
    v.box(17, 39, 18, 19, 41, 22, 'woodDark');
    for (let x = 4; x <= 32; x += 3) v.set(x, 14, 21 - Math.abs(x - 18) * 0.35 | 0, 'woodRed');
  },
  parts: { sails: { pivot: [18, 40, 23], build(v) {
    v.box(17, 39, 23, 19, 41, 24, 'woodDark'); v.set(18, 40, 25, 'gold');
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      for (let i = 2; i <= 17; i++) v.set(18 + dx * i, 40 + dy * i, 24, 'woodDark');
      for (let i = 5; i <= 17; i++) for (let j = 1; j <= 3; j++) v.set(18 + dx * i - dy * j, 40 + dy * i + dx * j, 24, (j === 3 || i % 4 === 0) ? 'woodLight' : 'white');
    }
  } } } });
D('o_melsekk', { size: [8, 10, 6], scale: 1 / 16, build(v) { v.ellipsoid(3.5, 3.6, 2.5, 3.5, 3.6, 2.5, 'cream'); v.box(3, 7, 2, 4, 9, 3, 'cream2'); v.box(2, 7, 2, 5, 7, 3, 'woodLight'); v.box(2, 3, 5, 5, 4, 5, 'butter'); } });
// well with crank and bucket
D('o_bronn', { size: [22, 30, 22], scale: 1 / 12,
  build(v) {
    v.cyl(11, 0, 11, 8, 8, 'stone'); v.cyl(11, 7, 11, 8.4, 1, 'stone2');
    v.paint((x, y, z, c) => (y < 7 && ((x * 7 + y * 3 + z * 5) % 11 === 0)) ? 'stoneDark' : null);
    v.cyl(11, 2, 11, 6, 7, 0); v.cyl(11, 4, 11, 6, 1, 'water');
    v.box(2, 8, 10, 3, 22, 12, 'wood'); v.box(19, 8, 10, 20, 22, 12, 'wood');
    for (let i = 0; i < 6; i++) v.box(1, 22 + i, 4 + i, 21, 22 + i, 18 - i, i % 2 ? 'roofRed' : 'coral');
  },
  parts: {
    crank: { pivot: [21, 17, 11], build(v) { v.box(3, 17, 11, 21, 17, 11, 'woodDark'); v.box(21, 17, 11, 21, 20, 11, 'woodDark'); v.box(21, 20, 11, 21, 20, 13, 'woodLight'); } },
    bucket: { pivot: [11, 17, 11], build(v) { v.box(11, 12, 11, 11, 16, 11, 'woodLight'); v.box(9, 8, 9, 13, 11, 13, 'woodRed'); v.box(10, 11, 10, 12, 11, 12, 'water'); v.box(9, 10, 9, 13, 10, 13, 'steel'); v.box(9, 11, 9, 13, 11, 9, 'woodRed'); } },
  } });
D('o_froskl', { size: [8, 6, 8], scale: 1 / 16, build(v) { v.ellipsoid(3.5, 2, 3.5, 3.4, 2, 3.4, 'green'); v.box(2, 0, 5, 5, 1, 6, 'butter'); v.sphere(2, 4, 5, 1.2, 'green'); v.sphere(5, 4, 5, 1.2, 'green'); v.set(2, 5, 6, 'black'); v.set(5, 5, 6, 'black'); v.box(2, 2, 7, 5, 2, 7, 'coral'); } });
// apple tree – the crown is a part (shakes)
D('o_epletre', { size: [30, 42, 30], scale: 1 / 10,
  build(v) { v.cyl(15, 0, 15, 2.2, 16, 'wood'); v.box(12, 0, 14, 18, 1, 16, 'wood'); v.box(14, 0, 12, 16, 1, 18, 'wood'); v.line(15, 12, 15, 10, 17, 13, 'wood'); v.line(15, 13, 15, 20, 18, 17, 'wood'); },
  parts: { crown: { pivot: [15, 15, 15], build(v, o) {
    const cr = o.crown || 'leaf', cr2 = o.crown ? 'pink' : 'leaf2', cr3 = o.crown ? 'white' : 'leafDark'; v.ellipsoid(15, 27, 15, 12, 10, 12, cr); v.ellipsoid(9, 29, 12, 6, 6, 6, cr2); v.ellipsoid(21, 25, 19, 6, 5, 6, cr2); v.ellipsoid(16, 34, 14, 7, 4, 7, cr); v.ellipsoid(13, 22, 21, 6, 5, 4, cr3);
    const r = U.rng(77);
    v.paint((x, y, z, c) => (surface(v, x, y, z) && r() < 0.07 && y > 18) ? (o.c || 'red') : (r() < 0.05 ? (o.crown ? 'leaf' : 'leafDark') : null));
  } } } });
D('o_eplekurv', { size: [10, 8, 10], scale: 1 / 16, build(v) { v.cyl(4.5, 0, 4.5, 4.5, 4, 'woodLight'); v.cyl(4.5, 1, 4.5, 3.5, 4, 0); v.sphere(3, 4, 4, 1.6, 'red'); v.sphere(6, 4, 5, 1.6, 'red'); v.sphere(4.5, 5, 6, 1.5, 'red'); v.line(0, 4, 4, 4, 7, 4, 'wood'); v.line(9, 4, 4, 5, 7, 4, 'wood'); } });
// beehive (skep) on a stand
D('o_bikube', { size: [16, 25, 16], scale: 1 / 16,
  build(v) {
    for (const [x, z] of [[3, 3], [12, 3], [3, 12], [12, 12]]) v.box(x, 0, z, x, 4, z, 'woodDark');
    v.box(2, 5, 2, 13, 5, 13, 'wood');
    const rr = [6.5, 6.9, 6.9, 6.6, 6.1, 5.4, 4.4, 3.2, 1.8];
    rr.forEach((r, i) => v.cyl(7.5, 6 + 2 * i, 7.5, r, 2, i % 2 ? 'honey' : 'hay'));
    v.box(6, 6, 12, 9, 8, 14, 'woodDark'); v.box(5, 9, 14, 10, 9, 14, 'wood');
  } });
D('o_bie', { size: [5, 5, 6], scale: 1 / 16, build(v) { v.ellipsoid(2, 2, 2.5, 1.6, 1.5, 2.4, 'yellow'); v.box(1, 1, 2, 3, 3, 2, 'black'); v.box(1, 1, 0, 3, 3, 0, 'black'); v.box(0, 4, 2, 1, 4, 3, 'glass'); v.box(3, 4, 2, 4, 4, 3, 'glass'); v.set(2, 2, 5, 'black'); } });
D('o_honning', { size: [6, 8, 6], scale: 1 / 16, build(v) { v.cyl(2.5, 0, 2.5, 2.6, 5, 'honey'); v.cyl(2.5, 5, 2.5, 2.8, 2, 'red'); v.set(2, 7, 2, 'red'); v.box(1, 2, 5, 4, 3, 5, 'cream'); } });
// mailbox: front door (hinges down) and a flag on the side
D('o_postkasse', { size: [13, 25, 15], scale: 1 / 16,
  build(v) { v.box(5, 0, 5, 6, 13, 7, 'woodDark'); v.box(1, 14, 1, 10, 21, 12, 'red'); v.box(2, 22, 1, 9, 22, 12, 'red'); v.box(3, 23, 1, 8, 23, 12, 'red'); v.box(1, 18, 1, 10, 18, 12, 'rose'); v.box(4, 14, 13, 7, 14, 13, 'woodDark'); },
  parts: {
    door: { pivot: [5.5, 15, 13], build(v) { v.box(2, 15, 13, 9, 21, 13, 'coral'); v.box(3, 22, 13, 8, 22, 13, 'coral'); v.box(4, 19, 14, 7, 19, 14, 'gold'); } },
    flag: { pivot: [11, 16, 6], build(v) { v.box(11, 16, 6, 11, 16, 11, 'woodDark'); v.box(11, 16, 10, 11, 18, 13, 'yellow'); } },
  } });
D('o_brev', { size: [8, 6, 2], scale: 1 / 16, build(v) { v.box(0, 0, 0, 7, 5, 1, 'white'); v.line(0, 5, 1, 3, 2, 1, 'cream2'); v.line(7, 5, 1, 4, 2, 1, 'cream2'); v.set(3, 2, 1, 'rose'); v.set(4, 2, 1, 'rose'); v.set(3, 1, 1, 'rose'); } });
// round hay bale with a hidden kitten
D('o_hoyball', { size: [22, 18, 16], scale: 1 / 12,
  build(v) {
    for (let x = 2; x <= 19; x++) for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) {
      const d = Math.hypot(y - 7, z - 7.5); if (d > 7.3) continue;
      v.set(x, y, z, (x === 2 || x === 19) ? (Math.floor(d) % 2 ? 'hay' : 'butter') : ((x === 6 || x === 15) ? 'woodLight' : ((x * 3 + y * 5 + z) % 7 === 0 ? 'butter' : 'hay')));
    }
  },
  parts: { kitten: { pivot: [11, 11, 9], build(v) { v.ellipsoid(11, 12, 9, 2.6, 2.2, 2.2, 'orange'); v.set(9, 14, 9, 'orange'); v.set(13, 14, 9, 'orange'); v.set(9, 15, 9, 'pink'); v.set(13, 15, 9, 'pink'); v.set(10, 12, 11, 'black'); v.set(12, 12, 11, 'black'); v.set(11, 11, 11, 'pink'); v.box(9, 13, 9, 13, 13, 9, 'butter'); } } } });
D('o_kattunge', { size: [8, 9, 11], scale: 1 / 16, build(v) { v.ellipsoid(3.5, 3, 4, 2.6, 2.4, 3.4, 'orange'); v.sphere(3.5, 5.5, 8, 2.4, 'orange'); v.set(2, 8, 8, 'orange'); v.set(5, 8, 8, 'orange'); v.set(2, 6, 10, 'black'); v.set(5, 6, 10, 'black'); v.set(3, 5, 10, 'pink'); v.line(3, 3, 0, 3, 7, 0, 'orange'); v.paint((x, y, z, c) => (c === F.PAL.orange && z % 3 === 0 && y > 3) ? 'butter' : null); } });
// wheelbarrow with pumpkins
D('o_trillebar', { size: [16, 16, 26], scale: 1 / 14,
  build(v) {
    v.box(3, 5, 5, 12, 9, 18, 'jeansBlue'); v.clear(4, 6, 6, 11, 9, 17); v.box(3, 9, 5, 12, 9, 5, 'navySoft');
    v.box(4, 0, 6, 4, 5, 6, 'woodDark'); v.box(11, 0, 6, 11, 5, 6, 'woodDark');
    v.box(4, 7, 0, 4, 7, 5, 'wood'); v.box(11, 7, 0, 11, 7, 5, 'wood'); v.box(4, 7, 0, 4, 8, 0, 'red'); v.box(11, 7, 0, 11, 8, 0, 'red');
    v.box(6, 3, 18, 6, 6, 21, 'woodDark'); v.box(9, 3, 18, 9, 6, 21, 'woodDark');
  },
  parts: {
    wheel: { pivot: [7.5, 3, 21], build(v) { for (let y = 0; y <= 6; y++) for (let z = 18; z <= 24; z++) { const d = Math.hypot(y - 3, z - 21); if (d <= 3.2) { v.set(7, y, z, d > 2.2 ? 'black' : 'grey'); v.set(8, y, z, d > 2.2 ? 'black' : 'grey'); } } } },
    load: { pivot: [7.5, 9, 11], build(v) { v.ellipsoid(6, 10, 9, 2.8, 2.2, 2.8, 'orange'); v.ellipsoid(9.5, 10, 14, 2.6, 2.1, 2.6, 'orange'); v.set(6, 13, 9, 'leafDark'); v.set(9, 13, 14, 'leafDark'); v.paint((x, y, z, c) => (c === F.PAL.orange && (x + z) % 3 === 0) ? 'coral' : null); } },
  } });
// farm animals (fallbacks when MODELS-2 has none)
D('o_sau', { size: [12, 16, 20], scale: 1 / 16,
  build(v) { for (const [x, z] of [[3, 5], [8, 5], [3, 12], [8, 12]]) v.box(x, 0, z, x, 4, z + 1, 'black');
    v.ellipsoid(5.5, 8, 9, 5.5, 4.6, 7, 'wool'); [[3, 12, 6], [8, 12, 9], [4, 11, 12], [7, 12, 4], [2, 9, 9], [9, 9, 12]].forEach(([x, y, z]) => v.sphere(x, y, z, 2.6, 'wool')); v.box(5, 7, 1, 6, 9, 1, 'wool'); },
  parts: { head: { pivot: [5.5, 9, 15], build(v) { v.ellipsoid(5.5, 9, 17, 2.3, 2.8, 2.2, 'skin4'); v.sphere(5.5, 12, 16, 2.2, 'wool'); v.box(2, 10, 16, 3, 10, 17, 'skin4'); v.box(8, 10, 16, 9, 10, 17, 'skin4'); v.set(4, 10, 19, 'white'); v.set(7, 10, 19, 'white'); v.set(4, 9, 19, 'black'); v.set(7, 9, 19, 'black'); v.set(5, 7, 19, 'pink'); v.set(6, 7, 19, 'pink'); } } } });
D('o_ku', { size: [16, 22, 28], scale: 1 / 14,
  build(v) {
    for (const [x, z] of [[3, 6], [11, 6], [3, 17], [11, 17]]) { v.box(x, 0, z, x + 1, 7, z + 1, 'white'); v.box(x, 0, z, x + 1, 1, z + 1, 'grey'); }
    v.box(2, 8, 4, 13, 15, 20, 'white'); v.box(3, 16, 5, 12, 16, 19, 'white'); v.box(1, 9, 5, 14, 14, 19, 'white');
    const r = U.rng(5); v.paint((x, y, z, c) => (c === F.PAL.white && y > 8 && U.noise2(x * 0.35, z * 0.35 + y * 0.2, 9) > 0.62) ? 'black' : null);
    v.box(6, 7, 13, 9, 7, 15, 'pink'); v.line(7, 14, 3, 7, 8, 1, 'white'); v.set(7, 8, 1, 'black');
  },
  parts: { head: { pivot: [7.5, 14, 21], build(v) { v.box(5, 11, 20, 10, 17, 24, 'white'); v.box(5, 11, 25, 10, 13, 26, 'pink'); v.set(6, 12, 27, 'rose'); v.set(9, 12, 27, 'rose'); v.set(5, 15, 25, 'black'); v.set(10, 15, 25, 'black'); v.box(3, 16, 22, 4, 16, 23, 'white'); v.box(11, 16, 22, 12, 16, 23, 'white'); v.set(5, 18, 22, 'cream2'); v.set(10, 18, 22, 'cream2'); v.box(6, 17, 21, 9, 17, 22, 'black'); } } } });
D('o_gris', { size: [12, 13, 20], scale: 1 / 16,
  build(v) { for (const [x, z] of [[3, 5], [8, 5], [3, 12], [8, 12]]) v.box(x, 0, z, x, 3, z + 1, 'pink'); v.ellipsoid(5.5, 7, 9, 5, 4.5, 7, 'pink'); v.line(5, 9, 1, 5, 11, 0, 'pink'); v.set(6, 11, 0, 'pink'); },
  parts: { head: { pivot: [5.5, 8, 15], build(v) { v.sphere(5.5, 8, 16, 3.4, 'pink'); v.box(4, 6, 19, 7, 8, 19, 'rose'); v.set(4, 7, 20 > 19 ? 19 : 20, 'rose'); v.set(5, 7, 19, 'coral'); v.set(6, 7, 19, 'coral'); v.set(3, 10, 19, 'black'); v.set(8, 10, 19, 'black'); v.box(2, 11, 15, 3, 12, 16, 'rose'); v.box(8, 11, 15, 9, 12, 16, 'rose'); } } } });
D('o_hone', { size: [9, 14, 12], scale: 1 / 16,
  build(v) { v.box(3, 0, 5, 3, 3, 5, 'orange'); v.box(5, 0, 5, 5, 3, 5, 'orange'); v.ellipsoid(4, 6, 5, 3.5, 3, 4, 'white'); v.box(2, 7, 0, 6, 10, 2, 'white'); v.box(3, 9, 0, 5, 11, 1, 'cream2'); v.box(1, 5, 4, 1, 7, 7, 'cream2'); v.box(7, 5, 4, 7, 7, 7, 'cream2'); },
  parts: { head: { pivot: [4, 8, 8], build(v) { v.sphere(4, 10, 9, 2.2, 'white'); v.box(4, 12, 8, 4, 13, 10, 'red'); v.box(4, 9, 11, 4, 9, 11, 'red'); v.box(3, 10, 11, 5, 10, 11, 'orange'); v.set(2, 11, 10, 'black'); v.set(6, 11, 10, 'black'); } } } });
D('o_krabbe', { size: [20, 10, 14], scale: 1 / 16,
  build(v) { v.ellipsoid(9.5, 3.5, 6.5, 5.5, 2.6, 4.2, 'coral');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) v.line(9.5 + s * 4, 2, 4 + i * 2, 9.5 + s * 8, 0, 3 + i * 2.5, 'red');
    v.box(7, 5, 9, 7, 7, 9, 'coral'); v.box(12, 5, 9, 12, 7, 9, 'coral'); v.set(7, 8, 9, 'white'); v.set(12, 8, 9, 'white'); v.set(7, 8, 10, 'black'); v.set(12, 8, 10, 'black'); v.box(8, 3, 11, 11, 3, 11, 'rose'); },
  parts: { clawL: { pivot: [5, 3, 9], build(v) { v.line(5, 3, 9, 2, 4, 11, 'red'); v.ellipsoid(2, 5, 12, 1.6, 1.5, 1.4, 'coral'); v.set(1, 6, 13, 'red'); } },
           clawR: { pivot: [14, 3, 9], build(v) { v.line(14, 3, 9, 17, 4, 11, 'red'); v.ellipsoid(17, 5, 12, 1.6, 1.5, 1.4, 'coral'); v.set(18, 6, 13, 'red'); } } } });
D('o_egg', { size: [4, 5, 4], scale: 1 / 16, build(v) { v.ellipsoid(1.5, 2.2, 1.5, 1.6, 2.3, 1.6, 'cream2'); } });
D('o_melk', { size: [8, 10, 8], scale: 1 / 16, build(v) { v.cyl(3.5, 0, 3.5, 3.4, 7, 'steel'); v.cyl(3.5, 1, 3.5, 2.6, 7, 0); v.cyl(3.5, 5, 3.5, 2.6, 1, 'milk'); v.line(0, 7, 3, 3, 9, 3, 'grey'); v.line(7, 7, 3, 4, 9, 3, 'grey'); } });
D('o_ull', { size: [12, 7, 9], scale: 1 / 16, build(v) { v.sphere(4, 3, 4, 3, 'wool'); v.sphere(8, 3.5, 4, 3, 'wool'); v.sphere(6, 4.5, 5, 2.6, 'white'); } });
// sunflower – the head turns
D('o_solsikke', { size: [16, 38, 12], scale: 1 / 12,
  build(v) { v.box(7, 0, 5, 8, 26, 6, 'leafDark'); v.ellipsoid(4, 11, 5.5, 3.5, 1.2, 2, 'leaf'); v.ellipsoid(11, 16, 5.5, 3.5, 1.2, 2, 'leaf'); v.ellipsoid(4, 21, 5.5, 2.8, 1, 1.6, 'leaf2'); },
  parts: { head: { pivot: [7.5, 27, 6], build(v) {
    disc(v, 7.5, 30, 6, 7.2, (a, b) => { const d = Math.hypot(a, b); if (d < 3.2) return (a + b) % 2 ? 'brown' : 'woodDark'; if (d < 3.9) return 'orange'; return Math.floor(Math.atan2(b, a) * 3) % 2 ? 'yellow' : 'butter'; }, 'z');
    disc(v, 7.5, 30, 5, 4, 'leafDark', 'z'); v.box(7, 26, 5, 8, 27, 6, 'leafDark');
  } } } });
// lavender bush
D('o_lavendel', { size: [22, 15, 16], scale: 1 / 12,
  build(v) { v.ellipsoid(11, 1, 8, 10, 2.5, 7, 'leafDark'); const r = U.rng(31);
    for (let k = 0; k < 46; k++) { const x = 2 + Math.floor(r() * 18), z = 2 + Math.floor(r() * 12); if (((x - 11) / 10) ** 2 + ((z - 8) / 7) ** 2 > 0.9) continue; const h = 6 + Math.floor(r() * 6);
      v.box(x, 2, z, x, h - 3, z, 'leaf'); v.box(x, h - 2, z, x, h, z, r() < 0.5 ? 'lavField' : (r() < 0.5 ? 'purple' : 'lilac')); } } });
D('o_sommerfugl', { size: [9, 3, 6], scale: 1 / 16,
  build(v) { v.box(4, 1, 1, 4, 1, 4, 'black'); v.set(4, 2, 5, 'black'); },
  parts: { wingL: { pivot: [4, 1, 3], build(v, o) { v.box(0, 1, 0, 3, 1, 3, o.c || 'butter'); v.box(1, 1, 4, 3, 1, 5, o.c2 || 'pink'); v.set(1, 1, 1, 'white'); } },
           wingR: { pivot: [4, 1, 3], build(v, o) { v.box(5, 1, 0, 8, 1, 3, o.c || 'butter'); v.box(5, 1, 4, 7, 1, 5, o.c2 || 'pink'); v.set(7, 1, 1, 'white'); } } } });
// crystal cluster (three crystals as parts → xylophone)
const prism = (v, cx, cz, h, r, col, tip) => { for (let y = 0; y < h; y++) { const rr = y < h - r * 1.6 ? r : r * (h - y) / (r * 1.6); v.cyl(cx, y, cz, Math.max(0.4, rr), 1, y > h - 3 && tip ? tip : col); } };
D('o_krystaller', { size: [22, 26, 20], scale: 1 / 12,
  build(v) { v.ellipsoid(11, 0, 10, 10, 2, 8, 'stone2'); v.ellipsoid(6, 1, 13, 3, 2, 3, 'grey'); v.ellipsoid(17, 1, 7, 3, 2, 3, 'stoneDark'); },
  parts: {
    c1: { pivot: [11, 1, 9], build(v) { prism(v, 11, 9, 24, 3.2, 'crystal', 'white'); } },
    c2: { pivot: [5, 1, 11], build(v) { prism(v, 5, 11, 15, 2.4, 'lavender', 'lilac'); } },
    c3: { pivot: [17, 1, 12], build(v) { prism(v, 17, 12, 18, 2.6, 'gem2', 'crystal'); } },
    c4: { pivot: [13, 1, 15], build(v) { prism(v, 13, 15, 10, 1.8, 'gem1', 'pink'); } },
  } });
D('o_krystall', { size: [5, 10, 5], scale: 1 / 16, build(v) { prism(v, 2, 2, 10, 2, 'crystal', 'gem2'); } });
// snowman (parts appear one by one)
D('o_snomann', { size: [18, 32, 16], scale: 1 / 12,
  build(v) { v.sphere(9, 5, 8, 5.4, 'snow'); v.ellipsoid(9, 0, 8, 7, 1, 6, 'snow'); },
  parts: {
    b2: { pivot: [9, 10, 8], build(v) { v.sphere(9, 13, 8, 4.2, 'snow'); v.set(9, 14, 12, 'black'); v.set(9, 12, 12, 'black'); v.line(5, 13, 8, 1, 17, 8, 'woodDark'); v.line(13, 13, 8, 17, 17, 8, 'woodDark'); v.set(1, 18, 8, 'woodDark'); v.set(17, 18, 8, 'woodDark'); } },
    b3: { pivot: [9, 17, 8], build(v) { v.sphere(9, 20, 8, 3.2, 'snow'); v.box(6, 17, 6, 12, 17, 10, 'red'); v.box(11, 14, 10, 12, 17, 11, 'red'); v.set(8, 21, 11, 'black'); v.set(10, 21, 11, 'black'); v.set(8, 19, 11, 'black'); v.set(9, 18, 11, 'black'); v.set(10, 19, 11, 'black'); } },
    nose: { pivot: [9, 20, 11], build(v) { v.box(9, 20, 11, 9, 20, 14, 'orange'); v.set(9, 20, 15 > 15 ? 15 : 15, 'orange'); } },
    hat: { pivot: [9, 23, 8], build(v) { v.cyl(9, 23, 8, 3.8, 1, 'navySoft'); v.cyl(9, 24, 8, 2.6, 5, 'navySoft'); v.cyl(9, 24, 8, 2.7, 1, 'pink'); v.set(11, 25, 10, 'butter'); } },
  } });
// sled (akebakke)
D('o_slede', { size: [12, 9, 20], scale: 1 / 12,
  build(v) { for (const x of [2, 9]) { v.box(x, 0, 1, x, 0, 16, 'steel'); v.box(x, 1, 17, x, 2, 18, 'steel'); v.set(x, 3, 18, 'steel'); v.box(x, 1, 4, x, 2, 4, 'steel'); v.box(x, 1, 12, x, 2, 12, 'steel'); }
    v.box(1, 3, 2, 10, 3, 16, 'red'); v.box(1, 4, 2, 10, 4, 3, 'red'); v.box(2, 4, 16, 9, 5, 16, 'woodRed'); v.line(2, 5, 16, 5, 8, 19, 'woodLight'); v.box(3, 4, 6, 8, 4, 10, 'butter'); } });
D('o_akebakke', { size: [20, 12, 24], scale: 1 / 10,
  build(v) { for (let z = 0; z < 24; z++) { const h = Math.max(0, Math.round(10 - z * 0.45)); for (let x = 0; x < 20; x++) { const w = Math.abs(x - 9.5); if (w > 9.5 - (z < 3 ? 3 - z : 0)) continue; v.box(x, 0, z, x, Math.max(0, h - Math.floor(w * 0.25)), z, 'snow'); } }
    v.paint((x, y, z, c) => (y > 0 && (x * 5 + z * 3) % 13 === 0) ? 'ice' : null); v.box(8, 0, 22, 11, 0, 23, 'ice'); } });
// skating pond
D('o_skoytedam', { size: [40, 3, 30], scale: 1 / 8,
  build(v) { for (let x = 0; x < 40; x++) for (let z = 0; z < 30; z++) { const q = ((x - 19.5) / 19.5) ** 2 + ((z - 14.5) / 14.5) ** 2; if (q > 1) continue;
    if (q > 0.8) v.box(x, 0, z, x, q > 0.9 ? 2 : 1, z, 'snow'); else v.set(x, 0, z, ((x * 7 + z * 3) % 17 === 0) ? 'white' : 'ice'); }
    for (let a = 0; a < 6.2; a += 0.08) v.set(Math.round(19.5 + Math.cos(a) * 9), 0, Math.round(14.5 + Math.sin(a) * 6), 'snow'); } });
// lighthouse (8 m)
D('o_fyrtarn', { size: [22, 66, 22], scale: 1 / 8,
  build(v) { v.cyl(11, 0, 11, 10, 2, 'stone2'); v.ellipsoid(11, 2, 11, 9, 2, 9, 'stoneDark');
    for (let y = 3; y < 46; y++) v.cyl(11, y, 11, 7 - (y - 3) * 0.045, 1, Math.floor((y - 3) / 7) % 2 ? 'red' : 'white');
    v.box(9, 3, 17, 12, 9, 18, 'woodDark'); for (const y of [16, 30]) v.box(10, y, 16, 11, y + 3, 17, 'sky');
    v.cyl(11, 46, 11, 7, 1, 'navySoft'); v.cyl(11, 47, 11, 7, 2, 'white'); v.cyl(11, 47, 11, 6, 2, 0);
    v.cyl(11, 47, 11, 4.2, 8, 'glass'); v.cyl(11, 48, 11, 2.2, 5, 'glowYellow');
    v.cone(11, 55, 11, 5, 8, 'red'); v.set(11, 63, 11, 'gold'); v.set(11, 64, 11, 'gold'); },
  parts: { beam: { pivot: [11, 51, 11], build() {} } } });
// sailboat
D('o_seilbat', { size: [16, 36, 28], scale: 1 / 12,
  build(v) { for (let z = 2; z <= 25; z++) { const w = z < 7 ? (z - 2) * 1.0 + 1.5 : z > 20 ? (25 - z) * 1.1 + 1 : 6.5;
      v.box(Math.round(7.5 - w), 1, z, Math.round(7.5 + w), 4, z, 'white'); v.box(Math.round(7.5 - w), 4, z, Math.round(7.5 + w), 4, z, 'navySoft'); v.box(Math.round(7.5 - w * 0.6), 0, z, Math.round(7.5 + w * 0.6), 0, z, 'jeansBlue'); }
    v.box(4, 4, 6, 11, 4, 20, 'woodLight'); v.box(7, 4, 13, 8, 32, 13, 'woodDark'); v.box(8, 30, 13, 11, 32, 13, 'pink'); },
  parts: { sail: { pivot: [7.5, 8, 13], build(v) { for (let y = 7; y <= 29; y++) { const L = Math.round((29 - y) * 0.5); v.box(7, y, 14, 7, y, 14 + L, (y % 6 === 0) ? 'coral' : 'white'); } } } } });
// seashell with a pearl
D('o_skjell', { size: [13, 7, 12], scale: 1 / 16,
  build(v) { for (let x = 0; x < 13; x++) for (let z = 1; z < 12; z++) { const d = Math.hypot(x - 6, z - 1); if (d > 9.5 || z < 1) continue; v.box(x, 0, z, x, 1, z, Math.floor(Math.atan2(z - 1, x - 6) * 5) % 2 ? 'peach' : 'coral'); }
    v.box(5, 0, 0, 7, 1, 1, 'coral'); v.sphere(6, 2, 5, 1.4, 'milk'); },
  parts: { top: { pivot: [6, 2, 1], build(v) { for (let x = 0; x < 13; x++) for (let z = 1; z < 12; z++) { const d = Math.hypot(x - 6, z - 1); if (d > 9.5) continue; v.set(x, 2 + (d < 6 ? 1 : 0), z, Math.floor(Math.atan2(z - 1, x - 6) * 5) % 2 ? 'pink' : 'peach'); } } } } });
D('o_perle', { size: [4, 4, 4], scale: 1 / 16, build(v) { v.sphere(1.5, 1.5, 1.5, 1.7, 'milk'); v.set(1, 3, 1, 'white'); } });
// sandcastle – four towers grow one by one
const tower = (v, cx, cz, h, flag) => { v.cyl(cx, 0, cz, 2.6, h, 'sand'); for (let a = 0; a < 6.28; a += 1.05) v.set(Math.round(cx + Math.cos(a) * 2.4), h, Math.round(cz + Math.sin(a) * 2.4), 'sand'); v.cone(cx, h, cz, 1.6, 3, 'cream2'); v.box(cx, h + 3, cz, cx, h + 6, cz, 'woodDark'); v.box(cx + 1, h + 5, cz, cx + 2, h + 6, cz, flag); };
D('o_sandslott', { size: [26, 26, 22], scale: 1 / 12,
  build(v) { v.box(4, 0, 4, 21, 6, 17, 'sand'); for (let x = 4; x <= 21; x += 2) { v.set(x, 7, 4, 'sand'); v.set(x, 7, 17, 'sand'); } for (let z = 4; z <= 17; z += 2) { v.set(4, 7, z, 'sand'); v.set(21, 7, z, 'sand'); }
    v.box(11, 0, 17, 14, 4, 17, 'woodDark'); v.ellipsoid(12.5, 0, 19.5, 7, 0.6, 2.5, 'cream2');
    v.paint((x, y, z, c) => (c === F.PAL.sand && (x * 3 + y * 7 + z * 11) % 13 === 0) ? 'cream2' : null); v.set(8, 2, 18, 'pink'); v.set(17, 2, 18, 'sky'); },
  parts: { t1: { pivot: [4, 0, 4], build(v) { tower(v, 4, 4, 11, 'pink'); } }, t2: { pivot: [21, 0, 4], build(v) { tower(v, 21, 4, 13, 'sky'); } },
           t3: { pivot: [4, 0, 17], build(v) { tower(v, 4, 17, 9, 'butter'); } }, t4: { pivot: [21, 0, 17], build(v) { tower(v, 21, 17, 10, 'mint'); } } } });
// Ferris wheel: the wheel spins, six cabins stay upright (positioned in tick)
const PH = { hub: [23, 25, 7], R: 19 };
D('o_pariserhjul', { size: [46, 48, 16], scale: 1 / 8,
  build(v) { v.box(3, 0, 0, 42, 1, 15, 'pathStone'); v.box(17, 1, 13, 29, 1, 15, 'pink');
    for (const z of [2, 3, 11, 12]) { v.line(9, 1, z, 23, 25, z, 'steel'); v.line(37, 1, z, 23, 25, z, 'steel'); }
    v.box(22, 24, 2, 24, 26, 12, 'grey'); },
  parts: {
    wheel: { pivot: [23, 25, 7], build(v) { const [hx, hy] = PH.hub, R = PH.R;
      for (let a = 0; a < Math.PI * 2; a += 0.012) { const x = Math.round(hx + Math.cos(a) * R), y = Math.round(hy + Math.sin(a) * R); const seg = Math.floor(a / (Math.PI / 6)) % 2 ? 'pink' : 'white'; v.set(x, y, 6, seg); v.set(x, y, 8, seg); }
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; v.line(hx, hy, 7, Math.round(hx + Math.cos(a) * R), Math.round(hy + Math.sin(a) * R), 7, 'white'); v.set(Math.round(hx + Math.cos(a + 0.26) * R), Math.round(hy + Math.sin(a + 0.26) * R), 7, 'glowYellow'); }
      v.box(hx - 1, hy - 1, 5, hx + 1, hy + 1, 9, 'gold'); } },
    c0: { pivot: [23, 25, 11], build(v) { cabin(v, 'sky'); } }, c1: { pivot: [23, 25, 11], build(v) { cabin(v, 'pink'); } }, c2: { pivot: [23, 25, 11], build(v) { cabin(v, 'butter'); } },
    c3: { pivot: [23, 25, 11], build(v) { cabin(v, 'mint'); } }, c4: { pivot: [23, 25, 11], build(v) { cabin(v, 'lilac'); } }, c5: { pivot: [23, 25, 11], build(v) { cabin(v, 'coral'); } },
  } });
function cabin(v, c) { v.box(23, 22, 11, 23, 25, 11, 'steel'); v.box(20, 17, 9, 26, 21, 13, c); v.clear(21, 19, 9, 25, 21, 13); v.box(20, 22, 9, 26, 22, 13, c); v.box(21, 18, 10, 25, 18, 12, 'cream'); }
// water wheel
D('o_vannhjul', { size: [14, 32, 32], scale: 1 / 10,
  build(v) { v.box(0, 0, 14, 1, 17, 17, 'woodDark'); v.box(12, 0, 14, 13, 17, 17, 'woodDark'); v.box(0, 0, 0, 13, 1, 31, 'water'); v.paint((x, y, z, c) => (c === F.PAL.water && (x + z) % 5 === 0) ? 'sky' : null); },
  parts: { wheel: { pivot: [7, 16, 16], build(v) { const R = 13;
    for (let a = 0; a < Math.PI * 2; a += 0.02) { const y = Math.round(16 + Math.sin(a) * R), z = Math.round(16 + Math.cos(a) * R); v.set(3, y, z, 'wood'); v.set(10, y, z, 'wood'); }
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; const y = Math.round(16 + Math.sin(a) * R), z = Math.round(16 + Math.cos(a) * R); v.line(3, 16, 16, 3, y, z, 'woodLight'); v.line(10, 16, 16, 10, y, z, 'woodLight'); v.box(3, y, z, 10, y, z, 'woodRed'); const y2 = Math.round(16 + Math.sin(a) * (R - 2)), z2 = Math.round(16 + Math.cos(a) * (R - 2)); v.box(4, y2, z2, 9, y2, z2, 'woodRed'); }
    v.box(2, 15, 15, 11, 17, 17, 'steel'); } } } });
// letter stones (decorative 3×5 letters; tasks show proper tiles)
D('o_bokstavsteiner', { size: [44, 10, 15], scale: 1 / 12,
  build(v) { v.ellipsoid(22, 0, 7, 21, 1, 6, 'grassDark'); },
  parts: Object.fromEntries([0, 1, 2, 3, 4].map(i => ['s' + i, { pivot: [5 + i * 8.5, 0, 7], build(v, o) {
    const cx = Math.round(5 + i * 8.5); v.ellipsoid(cx, 3, 7, 3.8, 3.4, 3.6, i % 2 ? 'stone2' : 'pathStone'); v.box(cx - 2, 6, 5, cx + 2, 6, 9, 'stone');
    v.ellipsoid(cx, 6, 7, 1.6, 0.6, 1.6, o.top || 'pathStone');
  } }])) });
// signpost post (boards are built at runtime from data.dirs)
D('o_veiskilt', { size: [12, 34, 12], scale: 1 / 12,
  build(v) { v.box(5, 0, 5, 6, 30, 6, 'wood'); v.box(4, 0, 4, 7, 1, 7, 'stone2'); v.box(4, 31, 4, 7, 31, 7, 'roofRed'); v.box(5, 32, 5, 6, 32, 6, 'roofRed'); v.set(5, 33, 5, 'gold'); } });
// notice board
D('o_oppslagstavle', { size: [26, 28, 7], scale: 1 / 12,
  build(v) { v.box(2, 0, 2, 3, 24, 3, 'wood'); v.box(22, 0, 2, 23, 24, 3, 'wood'); v.box(1, 8, 2, 24, 22, 3, 'woodDark'); v.box(2, 9, 3, 23, 21, 3, 'woodLight');
    v.box(0, 23, 0, 25, 23, 6, 'roofRed'); v.box(2, 24, 1, 23, 24, 5, 'roofRed'); v.box(5, 25, 2, 20, 25, 4, 'coral'); },
  parts: { notes: { pivot: [12, 21, 4], build(v) { [[3, 13, 'white'], [9, 15, 'butter'], [15, 12, 'pink'], [19, 16, 'mint'], [5, 17, 'sky']].forEach(([x, y, c]) => { v.box(x, y - 4, 4, x + 3, y, 4, c); v.set(x + 1, y, 5, 'red'); v.box(x + 1, y - 2, 4, x + 2, y - 2, 4, 'grey'); }); } } } });
// house door (sits in front of a house wall)
D('o_husdor', { size: [20, 34, 6], scale: 1 / 16,
  build(v) { v.box(0, 0, 0, 19, 1, 5, 'pathStone'); v.box(2, 1, 0, 3, 30, 2, 'white'); v.box(16, 1, 0, 17, 30, 2, 'white'); v.box(2, 30, 0, 17, 32, 2, 'white'); v.box(4, 2, 0, 15, 29, 0, 'woodDark');
    v.box(5, 2, 3, 14, 2, 5, 'coral'); v.box(1, 33, 0, 18, 33, 3, 'roofRed'); },
  parts: {
    door: { pivot: [4, 2, 1], build(v, o) { v.box(4, 2, 1, 15, 29, 2, o.c || 'woodRed'); v.box(6, 4, 3, 13, 4, 3, 'woodDark'); v.box(6, 4, 3, 6, 13, 3, 'woodDark'); v.box(13, 4, 3, 13, 13, 3, 'woodDark'); v.box(6, 13, 3, 13, 13, 3, 'woodDark');
      v.box(7, 20, 2, 12, 26, 2, 'glass'); v.box(7, 23, 3, 12, 23, 3, 'white'); v.box(9, 20, 3, 10, 26, 3, 'white'); v.set(14, 15, 3, 'gold'); v.box(9, 16, 3, 10, 17, 3, 'gold'); } },
    villager: { pivot: [9.5, 2, 0], build(v, o) { v.box(6, 2, 0, 13, 17, 0, o.shirt || 'sky'); v.sphere(9.5, 21, 0, 3.4, o.skin || 'skin'); v.box(6, 23, 0, 13, 25, 0, o.hair || 'hairBrown'); v.set(8, 21, 0, 'black'); v.set(11, 21, 0, 'black'); v.box(9, 19, 0, 10, 19, 0, 'coral'); v.box(4, 12, 0, 5, 18, 0, o.skin || 'skin'); } },
  } });
D('o_nabo', { size: [16, 28, 4], scale: 1 / 16, build(v, o) { v.box(4, 0, 1, 11, 15, 2, o.shirt || 'sky'); v.box(2, 9, 1, 3, 15, 2, o.shirt || 'sky'); v.box(12, 9, 1, 13, 15, 2, o.shirt || 'sky'); v.box(12, 16, 1, 13, 20, 2, o.skin || 'skin');
  v.sphere(7.5, 20, 1.5, 3.6, o.skin || 'skin'); v.box(4, 22, 0, 11, 24, 3, o.hair || 'hairBrown'); v.box(4, 19, 0, 4, 23, 3, o.hair || 'hairBrown'); v.box(11, 19, 0, 11, 23, 3, o.hair || 'hairBrown');
  v.set(6, 20, 3, 'black'); v.set(9, 20, 3, 'black'); v.box(7, 18, 3, 8, 18, 3, 'coral'); v.set(5, 19, 3, 'pink'); v.set(10, 19, 3, 'pink'); } });
D('o_kjeks', { size: [7, 2, 7], scale: 1 / 16, build(v) { disc(v, 3, 0, 3, 3.2, 'honey'); disc(v, 3, 1, 3, 2.6, 'woodLight'); v.set(2, 1, 2, 'woodDark'); v.set(4, 1, 4, 'woodDark'); v.set(4, 1, 2, 'woodDark'); } });
// market stall
D('o_markedsbod', { size: [26, 31, 17], scale: 1 / 10,
  build(v) { v.box(2, 0, 9, 23, 9, 14, 'woodLight'); for (let x = 2; x <= 23; x += 3) v.box(x, 1, 15 > 14 ? 14 : 15, x, 8, 14, 'butter'); v.box(2, 9, 9, 23, 9, 15, 'wood');
    for (const [x, z] of [[2, 2], [23, 2], [2, 14], [23, 14]]) v.box(x, 0, z, x, 25, z, 'wood'); v.box(3, 0, 2, 22, 12, 2, 'woodDark');
    v.box(6, 27, 15, 19, 30, 15, 'butter'); v.box(7, 28, 16, 18, 29, 16, 'coral'); },
  parts: {
    awning: { pivot: [12.5, 25, 2], build(v) { for (let z = 2; z <= 16; z++) { const y = Math.round(26 - (z - 2) * 0.35); v.box(1, y, z, 24, y, z, 'red'); for (let x = 1; x <= 24; x++) if (Math.floor((x - 1) / 3) % 2) v.set(x, y, z, 'white'); } for (let x = 1; x <= 24; x++) v.set(x, 20, 16, Math.floor((x - 1) / 3) % 2 ? 'white' : 'red'); } },
    goods: { pivot: [12.5, 10, 11], build(v) { [[4, 'red'], [6, 'red'], [5, 'red']].forEach(([x, c], i) => v.sphere(x, 11, 10 + i, 1.2, c)); v.ellipsoid(10, 11, 11, 2, 1.2, 1.4, 'woodLight'); v.box(14, 10, 10, 16, 13, 12, 'honey'); v.box(14, 14, 10, 16, 14, 12, 'red'); v.sphere(20, 11, 11, 1.4, 'orange'); v.sphere(22, 11, 12, 1.2, 'yellow'); } },
  } });
// footbridge (arched)
D('o_bro', { size: [40, 12, 14], scale: 1 / 8,
  build(v) { for (let x = 0; x < 40; x++) { const y = Math.round(3 * Math.sin(Math.PI * x / 39)); v.box(x, 0, 3, x, y, 10, (x % 3 === 0) ? 'woodDark' : 'wood'); v.box(x, 0, 3, x, y, 3, 'woodDark'); v.box(x, 0, 10, x, y, 10, 'woodDark');
    v.set(x, y + 4, 2, 'woodRed'); v.set(x, y + 4, 11, 'woodRed'); if (x % 5 === 0) { v.box(x, y + 1, 2, x, y + 4, 2, 'woodRed'); v.box(x, y + 1, 11, x, y + 4, 11, 'woodRed'); } }
    v.box(0, 0, 2, 1, 6, 2, 'woodRed'); v.box(38, 0, 2, 39, 6, 2, 'woodRed'); v.box(0, 0, 11, 1, 6, 11, 'woodRed'); v.box(38, 0, 11, 39, 6, 11, 'woodRed'); } });
D('o_pinne', { size: [10, 2, 2], scale: 1 / 16, build(v) { v.box(0, 0, 0, 9, 0, 1, 'wood'); v.set(6, 1, 0, 'leaf'); } });
D('o_fisk', { size: [4, 6, 12], scale: 1 / 16, build(v) { v.ellipsoid(1.5, 3, 6, 1.5, 2.6, 4.2, 'orange'); v.box(1, 1, 0, 2, 5, 1, 'coral'); v.set(0, 4, 9, 'black'); v.set(3, 4, 9, 'black'); v.box(1, 5, 4, 2, 5, 7, 'coral'); } });
// garden gate in a short fence
D('o_grind', { size: [30, 14, 4], scale: 1 / 12,
  build(v) { for (const x0 of [0, 21]) { for (let x = x0; x <= x0 + 8; x += 4) v.box(x, 0, 1, x, 11, 2, 'white'); v.box(x0, 4, 1, x0 + 8, 5, 2, 'white'); v.box(x0, 9, 1, x0 + 8, 10, 2, 'white'); }
    v.box(9, 0, 1, 10, 13, 2, 'white'); v.box(19, 0, 1, 20, 13, 2, 'white'); v.set(9, 13, 1, 'pink'); v.set(20, 13, 1, 'pink'); },
  parts: { gate: { pivot: [11, 0, 2], build(v) { for (let x = 11; x <= 18; x++) if (x % 2) v.box(x, 1, 1, x, 11, 2, 'woodLight'); v.box(11, 3, 1, 18, 3, 2, 'woodLight'); v.box(11, 9, 1, 18, 9, 2, 'woodLight'); v.line(11, 3, 2, 18, 9, 2, 'woodRed'); v.set(14, 7, 3 > 3 ? 3 : 3, 'pink'); } } } });
// wind chime
const TUBES = [[4, 6, 'silver'], [6, 9, 'lilac'], [9, 9, 'sky'], [11, 6, 'mint'], [8, 4, 'pink']];
D('o_vindspill', { size: [14, 30, 14], scale: 1 / 16,
  build(v) { v.box(1, 0, 1, 2, 27, 2, 'woodDark'); v.box(1, 27, 1, 9, 28, 2, 'woodDark'); v.box(8, 26, 2, 8, 27, 7, 'woodDark'); v.cyl(7.5, 24, 7, 4, 1, 'wood'); v.line(8, 25, 7, 8, 26, 7, 'grey'); },
  parts: Object.fromEntries(TUBES.map(([x, z, c], i) => ['t' + i, { pivot: [x, 23, z], build(v) { v.box(x, 23 - (8 + i * 2), z, x, 23, z, c); v.set(x, 23 - (8 + i * 2), z, 'white'); } }])) });
// picnic (blanket, basket, teapot, cups, cake)
D('o_piknik', { size: [28, 10, 22], scale: 1 / 12,
  build(v) { for (let x = 1; x <= 26; x++) for (let z = 1; z <= 20; z++) v.set(x, 0, z, ((x >> 1) + (z >> 1)) % 2 ? 'pink' : 'white');
    v.box(2, 1, 2, 7, 5, 6, 'woodLight'); v.box(2, 5, 2, 7, 5, 6, 'woodRed'); v.line(2, 6, 4, 4, 8, 4, 'wood'); v.line(7, 6, 4, 5, 8, 4, 'wood');
    v.cyl(20, 1, 15, 3.2, 1, 'white'); v.cyl(20, 2, 15, 2.5, 3, 'cream'); v.cyl(20, 5, 15, 2.5, 1, 'pink'); v.set(20, 6, 15, 'red'); },
  parts: {
    pot: { pivot: [13, 1, 8], build(v) { v.ellipsoid(13, 4, 8, 3, 3, 2.6, 'sky'); v.line(16, 4, 8, 18, 6, 8, 'sky'); v.box(9, 4, 8, 10, 6, 8, 'sky'); v.box(12, 7, 7, 14, 7, 9, 'white'); v.set(13, 8, 8, 'white'); v.box(10, 4, 10, 16, 4, 10, 'white'); } },
    cup1: { pivot: [9, 1, 15], build(v) { v.cyl(9, 1, 15, 1.5, 3, 'white'); v.cyl(9, 3, 15, 1, 1, 'wood'); v.set(11, 2, 15, 'white'); } },
    cup2: { pivot: [15, 1, 18], build(v) { v.cyl(15, 1, 18, 1.5, 3, 'mint'); v.cyl(15, 3, 18, 1, 1, 'wood'); v.set(17, 2, 18, 'mint'); } },
  } });
// hot-air balloon
D('o_luftballong', { size: [30, 52, 30], scale: 1 / 10,
  build(v) { v.box(11, 0, 11, 18, 5, 18, 'woodLight'); v.clear(12, 2, 12, 17, 5, 17); v.box(11, 5, 11, 18, 5, 18, 'wood'); v.box(12, 1, 12, 17, 1, 17, 'woodDark');
    for (const [x, z] of [[11, 11], [18, 11], [11, 18], [18, 18]]) v.line(x, 5, z, x < 15 ? 8 : 21, 19, z < 15 ? 8 : 21, 'woodDark');
    v.box(14, 8, 14, 15, 9, 15, 'steel'); v.box(14, 10, 14, 15, 11, 15, 'flame');
    for (let y = 16; y <= 49; y++) for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) {
      const dy = (y - 33) / 16, r = y < 22 ? 4 + (y - 16) * 1.2 : 13.5 * Math.sqrt(Math.max(0, 1 - dy * dy * (dy < 0 ? 0.55 : 1)));
      const d = Math.hypot(x - 14.5, z - 14.5); if (d > r || d < r - 1.6) continue;
      const band = Math.floor((Math.atan2(z - 14.5, x - 14.5) + Math.PI) / (Math.PI * 2) * 12) % 3;
      v.set(x, y, z, y < 20 ? 'woodLight' : ['pink', 'butter', 'sky'][band]);
    } } });
// power spot (glowing ring)
D('o_tryllepunkt', { size: [34, 4, 34], scale: 1 / 16,
  build(v) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const x = Math.round(16.5 + Math.cos(a) * 10), z = Math.round(16.5 + Math.sin(a) * 10); v.box(x, 0, z, x, i % 3 === 0 ? 2 : 1, z, ['lilac', 'pink', 'sky', 'mint'][i % 4]); } },
  parts: { ring: { pivot: [16.5, 0, 16.5], build(v) { for (let x = 0; x < 34; x++) for (let z = 0; z < 34; z++) { const d = Math.hypot(x - 16.5, z - 16.5); if (d > 13.6 && d < 15.6) v.set(x, 0, z, Math.floor(Math.atan2(z - 16.5, x - 16.5) * 4) % 2 ? 'glowYellow' : 'lamp'); } } } } });
// treasure chest (lid opens backwards)
D('o_skattkiste', { size: [18, 17, 13], scale: 1 / 16,
  build(v, o) { v.box(1, 0, 1, 16, 8, 10, 'woodRed'); v.box(3, 0, 1, 3, 8, 11, 'gold'); v.box(14, 0, 1, 14, 8, 11, 'gold'); v.box(2, 7, 2, 15, 8, 9, 'gold');
    v.box(7, 4, 11, 10, 8, 11, o.lock === 'word' ? 'butter' : 'gold'); v.set(8, 6, 12, 'black'); v.set(9, 6, 12, 'black'); v.set(8, 5, 12, 'navySoft'); },
  parts: { lid: { pivot: [8.5, 9, 1], build(v) { v.box(1, 9, 1, 16, 12, 10, 'woodRed'); v.box(2, 13, 1, 15, 13, 10, 'woodRed'); v.box(3, 9, 1, 3, 13, 11, 'gold'); v.box(14, 9, 1, 14, 13, 11, 'gold'); v.box(7, 9, 11, 10, 10, 11, 'gold'); } } } });
// lost things (fallback models)
D('o_nokkel', { size: [10, 3, 4], scale: 1 / 16, build(v) { v.box(0, 0, 1, 2, 0, 3, 'gold'); v.set(1, 0, 2, 0); v.box(3, 0, 2, 9, 0, 2, 'gold'); v.box(7, 0, 0, 7, 0, 1, 'gold'); v.box(9, 0, 0, 9, 0, 1, 'gold'); v.set(1, 1, 1, 'gem1'); } });
D('o_votte', { size: [7, 9, 3], scale: 1 / 16, build(v) { v.box(1, 0, 0, 5, 6, 2, 'red'); v.box(0, 3, 0, 0, 5, 2, 'red'); v.box(2, 7, 0, 4, 7, 2, 'red'); v.box(1, 0, 0, 5, 1, 2, 'white'); v.set(3, 4, 2, 'white'); } });
D('o_ring', { size: [7, 7, 3], scale: 1 / 16, build(v) { for (let a = 0; a < 6.3; a += 0.2) v.set(Math.round(3 + Math.cos(a) * 2.6), Math.round(2.6 + Math.sin(a) * 2.6), 1, 'gold'); v.sphere(3, 6, 1, 1.1, 'gem1'); } });
// fallen house-number plate (lies flat; stands up when fixed)
D('o_tallstolpe', { size: [16, 22, 16], scale: 1 / 16,
  build(v) { v.box(7, 0, 2, 8, 20, 3, 'wood'); v.box(6, 20, 2, 9, 20, 4, 'woodDark'); v.box(5, 0, 1, 10, 0, 4, 'stone2'); },
  parts: { plate: { pivot: [7.5, 1, 5], build(v) { v.box(2, 0, 5, 13, 0, 14, 'white'); v.box(2, 1, 5, 13, 1, 5, 'navySoft'); v.box(2, 1, 14, 13, 1, 14, 'navySoft'); v.box(2, 1, 5, 2, 1, 14, 'navySoft'); v.box(13, 1, 5, 13, 1, 14, 'navySoft'); } } } });
// butterflies over a flower clump
D('o_sommerfugler', { size: [16, 20, 16], scale: 1 / 12,
  build(v) { v.ellipsoid(8, 1, 8, 7, 2, 7, 'leaf'); [[5, 6, 'pink'], [10, 5, 'butter'], [8, 10, 'lilac'], [12, 11, 'coral']].forEach(([x, z, c]) => { v.box(x, 2, z, x, 6, z, 'leafDark'); v.ellipsoid(x, 7, z, 1.8, 0.8, 1.8, c); v.set(x, 8, z, 'butter'); }); },
  parts: Object.fromEntries([[4, 12, 6, 'butter'], [11, 15, 9, 'sky'], [7, 17, 12, 'pink']].map(([x, y, z, c], i) => ['b' + i, { pivot: [x, y, z], build(v) { v.box(x, y, z - 1, x, y, z + 1, 'black'); v.box(x - 2, y, z - 1, x - 1, y, z + 1, c); v.box(x + 1, y, z - 1, x + 2, y, z + 1, c); v.set(x - 2, y, z + 1, 'white'); v.set(x + 2, y, z + 1, 'white'); } }])) });
// frog on a lily pad
D('o_frosk', { size: [18, 10, 18], scale: 1 / 16,
  build(v) { disc(v, 9, 0, 9, 8.4, (a, b) => (a > 0 && Math.abs(b) <= a * 0.25) ? 0 : ((a * a + b * b) % 7 === 0 ? 'leafDark' : 'leaf')); v.ellipsoid(4, 1, 13, 1.6, 1, 1.6, 'pink'); v.set(4, 2, 13, 'butter'); },
  parts: { frog: { pivot: [9, 1, 8], build(v) { v.ellipsoid(9, 3, 8, 3.6, 2.4, 3.2, 'green'); v.box(7, 1, 10, 11, 2, 11, 'butter'); v.sphere(7, 6, 10, 1.4, 'green'); v.sphere(11, 6, 10, 1.4, 'green'); v.set(7, 6, 12, 'white'); v.set(11, 6, 12, 'white'); v.set(7, 7, 12, 'black'); v.set(11, 7, 12, 'black'); v.box(8, 3, 12, 10, 3, 12, 'coral'); v.box(5, 1, 5, 6, 1, 7, 'green'); v.box(12, 1, 5, 13, 1, 7, 'green'); } } } });
// duck family
const duck = (v, x, z, s, c) => { v.ellipsoid(x, 2 * s, z, 2.4 * s, 1.6 * s, 3.2 * s, c); v.sphere(x, 4.3 * s, z + 2 * s, 1.5 * s, c); v.box(x, 4 * s, z + 3.5 * s, x, 4 * s, z + 4 * s, 'orange'); v.set(x - 1, 4.7 * s, z + 3 * s, 'black'); v.set(x + 1, 4.7 * s, z + 3 * s, 'black'); v.set(x, 3 * s, z - 3 * s, c); };
D('o_ender', { size: [26, 10, 14], scale: 1 / 16,
  build(v) { duck(v, 5, 6, 1.6, 'white'); v.box(4, 3, 3, 6, 3, 4, 'cream2'); },
  parts: Object.fromEntries([[13, 7], [18, 6], [23, 7]].map(([x, z], i) => ['d' + i, { pivot: [x, 0, z], build(v) { duck(v, x, z, 0.85, 'butter'); } }])) });
D('o_andunge', { size: [6, 7, 9], scale: 1 / 16, build(v) { duck(v, 2.5, 3.5, 0.9, 'butter'); } });
// rabbit
D('o_kanin', { size: [9, 15, 13], scale: 1 / 16,
  build(v) { v.ellipsoid(4, 3.5, 5, 3.5, 3.2, 4.2, 'white'); v.sphere(4, 3, 1, 1.4, 'white'); v.box(2, 0, 8, 3, 1, 9, 'white'); v.box(5, 0, 8, 6, 1, 9, 'white'); },
  parts: { head: { pivot: [4, 6, 9], build(v) { v.sphere(4, 7, 10, 2.6, 'white'); v.box(2, 9, 9, 3, 14, 10, 'white'); v.box(5, 9, 9, 6, 14, 10, 'white'); v.box(2, 10, 10, 3, 13, 10, 'pink'); v.box(5, 10, 10, 6, 13, 10, 'pink'); v.set(3, 8, 12, 'black'); v.set(5, 8, 12, 'black'); v.set(4, 6, 12, 'pink'); } } } });
D('o_gulrot', { size: [4, 10, 4], scale: 1 / 16, build(v) { v.cone(1.5, 0, 1.5, 1.6, 7, 'orange'); v.box(1, 7, 1, 2, 9, 2, 'leaf'); v.set(0, 9, 1, 'leaf2'); v.set(3, 8, 2, 'leaf2'); } });
// tree with a rope swing
D('o_tregynge', { size: [34, 40, 24], scale: 1 / 10,
  build(v) { v.cyl(7, 0, 12, 2.4, 25, 'wood'); v.box(7, 20, 11, 28, 21, 13, 'wood'); v.ellipsoid(14, 30, 12, 14, 8, 10, 'leaf'); v.ellipsoid(7, 33, 10, 7, 5, 7, 'leaf2'); v.ellipsoid(23, 28, 14, 7, 5, 6, 'leafDark');
    const r = U.rng(9); v.paint((x, y, z, c) => (y > 24 && surface(v, x, y, z) && r() < 0.05) ? 'blossom' : null); },
  parts: { seat: { pivot: [21, 20, 12], build(v) { v.box(17, 6, 12, 17, 19, 12, 'woodLight'); v.box(25, 6, 12, 25, 19, 12, 'woodLight'); v.box(16, 5, 10, 26, 5, 14, 'woodRed'); } } } });
// laundry line
D('o_vaskesnor', { size: [44, 28, 5], scale: 1 / 16,
  build(v) { v.box(1, 0, 2, 2, 26, 3, 'wood'); v.box(41, 0, 2, 42, 26, 3, 'wood'); v.box(0, 25, 2, 3, 25, 3, 'wood'); v.box(40, 25, 2, 43, 25, 3, 'wood'); v.box(2, 24, 2, 41, 24, 2, 'white'); },
  parts: {
    shirt: { pivot: [10, 24, 2], build(v) { v.box(6, 14, 2, 14, 23, 2, 'sky'); v.box(4, 20, 2, 5, 23, 2, 'sky'); v.box(15, 20, 2, 16, 23, 2, 'sky'); v.box(9, 22, 2, 11, 23, 2, 'white'); v.set(10, 18, 3 > 3 ? 3 : 3, 'butter'); } },
    dress: { pivot: [22, 24, 2], build(v) { for (let y = 12; y <= 23; y++) { const w = y > 19 ? 2 : Math.round((20 - y) * 0.6) + 2; v.box(22 - w, y, 2, 22 + w, y, 2, y === 17 ? 'white' : 'pink'); } } },
    sock: { pivot: [32, 24, 2], build(v) { v.box(31, 17, 2, 33, 23, 2, 'red'); v.box(31, 15, 2, 36, 17, 2, 'red'); v.box(31, 21, 2, 33, 21, 2, 'white'); } },
    towel: { pivot: [38, 24, 2], build(v) { v.box(36, 13, 2, 40, 23, 2, 'butter'); v.box(36, 15, 2, 40, 15, 2, 'coral'); } },
  } });
// birdhouse on a pole
D('o_fuglekasse', { size: [12, 36, 13], scale: 1 / 16,
  build(v) { v.box(5, 0, 5, 6, 22, 6, 'wood'); v.box(2, 22, 2, 9, 30, 9, 'butter'); for (let i = 0; i < 4; i++) v.box(1 + i, 31 + i, 1, 10 - i, 31 + i, 10, 'roofRed');
    v.box(5, 26, 10, 6, 27, 10, 'woodDark'); v.box(5, 24, 10, 6, 24, 12, 'woodDark'); },
  parts: { bird: { pivot: [5.5, 25, 9], build(v) { v.sphere(5.5, 27, 9, 1.6, 'sky'); v.set(5, 27, 11, 'orange'); v.set(6, 27, 11, 'orange'); v.set(4, 28, 10, 'black'); v.set(7, 28, 10, 'black'); } } } });
// friendly mushrooms (bouncy)
const mush = (v, cx, cz, h, r, cap) => { v.cyl(cx, 0, cz, Math.max(1, r * 0.35), h, 'cream'); for (let y = 0; y <= Math.ceil(r * 0.6); y++) v.cyl(cx, h + y, cz, r * Math.sqrt(1 - (y / (r * 0.62 + 0.4)) ** 2), 1, cap);
  v.paint((x, y, z, c) => (y >= h && c === F.PAL[cap] && (x * 5 + z * 3 + y) % 6 === 0) ? 'white' : null); };
D('o_sopp', { size: [20, 14, 20], scale: 1 / 12,
  build(v) { v.ellipsoid(10, 0, 10, 9, 1, 9, 'grassDark'); },
  parts: { m1: { pivot: [10, 0, 9], build(v) { mush(v, 10, 9, 6, 6, 'red'); } }, m2: { pivot: [4, 0, 15], build(v) { mush(v, 4, 15, 4, 3.4, 'coral'); } }, m3: { pivot: [16, 0, 15], build(v) { mush(v, 16, 15, 3, 3, 'butter'); } } } });
// number stepping stones (labels show the numbers)
D('o_trappesteiner', { size: [64, 4, 12], scale: 1 / 10,
  build(v) { },
  parts: Object.fromEntries([0, 1, 2, 3].map(i => ['s' + i, { pivot: [8 + i * 16, 0, 6], build(v) { v.ellipsoid(8 + i * 16, 0.5, 6, 4.6, 1.6, 4.2, 'stone2'); v.ellipsoid(8 + i * 16, 1.2, 6, 3.8, 1, 3.4, 'pathStone'); } }])) });
// park bench
D('o_benk', { size: [26, 14, 10], scale: 1 / 12,
  build(v) { for (const x of [2, 23]) { v.box(x, 0, 2, x, 5, 2, 'navySoft'); v.box(x, 0, 7, x, 5, 7, 'navySoft'); v.box(x, 5, 1, x, 12, 1, 'navySoft'); v.box(x, 7, 2, x, 7, 7, 'navySoft'); }
    for (const z of [2, 4, 6]) v.box(1, 5, z, 24, 5, z + 1, 'woodLight'); for (const y of [8, 10, 12]) v.box(1, y, 1, 24, y, 1, 'woodLight'); } });
// lamp post
D('o_lyktestolpe', { size: [8, 46, 8], scale: 1 / 14,
  build(v) { v.box(2, 0, 2, 5, 2, 5, 'navySoft'); v.box(3, 3, 3, 4, 36, 4, 'navySoft'); v.box(2, 30, 2, 5, 30, 5, 'navySoft');
    v.box(2, 37, 2, 5, 42, 5, 'glass'); for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6]]) v.box(x, 37, z, x, 42, z, 'navySoft'); v.box(1, 36, 1, 6, 36, 6, 'navySoft');
    v.box(1, 43, 1, 6, 43, 6, 'navySoft'); v.box(2, 44, 2, 5, 44, 5, 'navySoft'); v.set(3, 45, 3, 'gold'); v.set(4, 45, 4, 'gold'); },
  parts: { light: { pivot: [3.5, 38, 3.5], build(v) { v.box(3, 38, 3, 4, 41, 4, 'glowYellow'); } } } });
// puddle
D('o_vannpytt', { size: [22, 1, 16], scale: 1 / 10,
  build(v) { for (let x = 0; x < 22; x++) for (let z = 0; z < 16; z++) { const q = ((x - 10.5) / 10.5) ** 2 + ((z - 7.5) / 7.5) ** 2 + (U.noise2(x * 0.3, z * 0.3, 4) - 0.5) * 0.6; if (q < 0.75) v.set(x, 0, z, q < 0.1 && x > 12 ? 'sky' : 'water'); } } });
// hedgehog
D('o_pinnsvin', { size: [12, 9, 15], scale: 1 / 16,
  build(v) { v.ellipsoid(5.5, 3.5, 6.5, 5, 3.6, 6, 'woodDark'); v.paint((x, y, z, c) => (y > 2 && (x + y * 2 + z) % 3 === 0) ? 'woodLight' : ((x + z) % 4 === 0 ? 'brown' : null));
    v.ellipsoid(5.5, 2.5, 12, 2.8, 2.2, 2.4, 'peach'); v.box(5, 2, 14, 6, 2, 14, 'black'); v.set(4, 4, 13, 'black'); v.set(7, 4, 13, 'black'); v.box(2, 0, 3, 3, 0, 4, 'peach'); v.box(8, 0, 3, 9, 0, 4, 'peach'); v.box(2, 0, 9, 3, 0, 10, 'peach'); v.box(8, 0, 9, 9, 0, 10, 'peach'); } });
// snail
D('o_snegle', { size: [9, 12, 16], scale: 1 / 16,
  build(v) { v.box(3, 0, 1, 5, 1, 14, 'mint'); v.box(3, 2, 12, 5, 5, 14, 'mint'); v.line(3, 6, 13, 2, 9, 14, 'mint'); v.line(5, 6, 13, 6, 9, 14, 'mint'); v.set(2, 10, 14, 'black'); v.set(6, 10, 14, 'black'); v.box(3, 3, 15, 5, 3, 15, 'coral'); },
  parts: { shell: { pivot: [4, 2, 7], build(v) { v.ellipsoid(4, 6, 7, 3.2, 4.5, 4.5, 'coral'); v.paint((x, y, z, c) => { const d = Math.hypot(y - 6, z - 7); return (Math.floor(d * 1.3 + Math.atan2(y - 6, z - 7)) % 2) ? 'peach' : null; }); } } } });
// singing flowers
D('o_syngeblomster', { size: [24, 24, 10], scale: 1 / 12,
  build(v) { v.box(1, 0, 3, 22, 3, 8, 'woodRed'); v.box(2, 3, 4, 21, 3, 7, 'soil'); [[4, 13], [12, 17], [19, 14]].forEach(([x, h]) => { v.box(x, 4, 5, x, h, 5, 'leafDark'); v.ellipsoid(x - 2, 8, 5, 2, 0.8, 1, 'leaf'); }); },
  parts: Object.fromEntries([[4, 13, 'pink'], [12, 17, 'butter'], [19, 14, 'lilac']].map(([x, h, c], i) => ['f' + i, { pivot: [x, h, 6], build(v) { disc(v, x, h + 3, 6, 3.4, (a, b) => Math.hypot(a, b) < 1.5 ? 'butter' : c, 'z'); v.set(x, h + 3, 7, 'coral'); } }])) });
// kite on a stake
D('o_drage', { size: [18, 46, 8], scale: 1 / 12,
  build(v) { v.box(8, 0, 3, 9, 3, 4, 'wood'); v.line(8, 3, 4, 12, 30, 4, 'white'); },
  parts: { kite: { pivot: [12, 34, 4], build(v) { for (let x = 6; x <= 18; x++) for (let y = 26; y <= 44; y++) { if (Math.abs(x - 12) / 6 + Math.abs(y - 35) / 9 > 1) continue; v.set(x, y, 4, (x < 12) === (y < 35) ? 'coral' : 'butter'); }
    v.line(12, 26, 4, 12, 44, 4, 'woodDark'); v.line(6, 35, 4, 18, 35, 4, 'woodDark'); for (let i = 0; i < 4; i++) { v.set(12 + (i % 2), 24 - i * 2, 4, 'white'); v.box(11 + (i % 2), 23 - i * 2, 4, 13 + (i % 2), 23 - i * 2, 4, i % 2 ? 'pink' : 'sky'); } } } } });
// juice stand
D('o_saftbod', { size: [24, 26, 14], scale: 1 / 12,
  build(v) { v.box(2, 0, 4, 21, 9, 12, 'woodLight'); for (let x = 2; x <= 21; x++) if (Math.floor(x / 2) % 2) v.box(x, 1, 13 > 12 ? 12 : 12, x, 8, 12, 'butter');
    v.box(2, 10, 4, 21, 10, 12, 'white'); v.box(2, 0, 3, 3, 22, 3, 'wood'); v.box(20, 0, 3, 21, 22, 3, 'wood'); v.box(1, 20, 2, 22, 24, 4, 'coral'); v.text('SAFT', 4, 20, 5, 'white');
    v.cyl(15, 11, 8, 1.4, 3, 'glass'); v.cyl(18, 11, 8, 1.4, 3, 'glass'); v.cyl(18, 11, 8, 1, 2, 'orange'); },
  parts: { jug: { pivot: [8, 11, 8], build(v) { v.cyl(8, 11, 8, 2.4, 6, 'glass'); v.cyl(8, 11, 8, 1.8, 4, 'orange'); v.box(5, 13, 8, 5, 16, 8, 'glass'); v.set(11, 16, 8, 'glass'); } },
           glass1: { pivot: [15, 11, 8], build(v) { v.cyl(15, 11, 8, 1, 2, 'orange'); } } } });
// fishing jetty
D('o_brygge', { size: [14, 16, 44], scale: 1 / 10,
  build(v) { for (let z = 0; z < 44; z++) v.box(1, 4, z, 12, 4, z, z % 3 === 0 ? 'woodDark' : 'woodLight'); for (const z of [2, 20, 41]) { v.box(1, 0, z, 2, 4, z + 1, 'woodDark'); v.box(11, 0, z, 12, 4, z + 1, 'woodDark'); }
    v.cyl(4, 5, 34, 2, 3, 'jeansBlue'); v.box(8, 5, 26, 10, 7, 30, 'woodRed'); },
  parts: { rod: { pivot: [10, 5, 32], build(v) { v.line(10, 5, 32, 10, 14, 41, 'woodDark'); v.line(10, 14, 42, 10, 6, 43, 'white'); v.set(10, 6, 43, 'red'); } } } });
// rowing boat
D('o_robat', { size: [18, 10, 30], scale: 1 / 12,
  build(v) { for (let z = 1; z <= 28; z++) { const w = z < 6 ? (z - 1) * 0.9 + 1.5 : z > 24 ? (28 - z) * 1.2 + 1.2 : 5.5;
    v.box(Math.round(8.5 - w), 1, z, Math.round(8.5 + w), 4, z, 'woodRed'); v.box(Math.round(8.5 - w), 0, z, Math.round(8.5 + w), 0, z, 'woodDark'); if (w > 1.5) v.box(Math.round(8.5 - w) + 1, 2, z, Math.round(8.5 + w) - 1, 4, z, 'woodLight'); }
    v.box(4, 3, 10, 13, 3, 11, 'wood'); v.box(4, 3, 19, 13, 3, 20, 'wood'); v.box(5, 4, 1, 12, 4, 1, 'white'); },
  parts: { oarL: { pivot: [3, 5, 15], build(v) { v.line(3, 5, 15, 0, 3, 15, 'woodLight'); v.box(0, 2, 13, 0, 3, 17, 'woodLight'); } }, oarR: { pivot: [14, 5, 15], build(v) { v.line(14, 5, 15, 17, 3, 15, 'woodLight'); v.box(17, 2, 13, 17, 3, 17, 'woodLight'); } } } });
// beach hut
D('o_badehytte', { size: [20, 30, 20], scale: 1 / 10,
  build(v) { v.box(2, 0, 2, 17, 18, 17, 'white'); v.paint((x, y, z, c) => (Math.floor(x / 2) % 2 && (z === 17 || z === 2)) || (Math.floor(z / 2) % 2 && (x === 2 || x === 17)) ? 'coral' : null);
    for (let i = 0; i < 7; i++) v.box(1, 19 + i, 1 + i, 18, 19 + i, 18 - i, i % 2 ? 'butter' : 'roofMint'); v.box(1, 0, 18, 18, 0, 19, 'woodLight'); v.sphere(13, 13, 17, 1.6, 'sky'); v.set(13, 13, 18, 'white'); },
  parts: { door: { pivot: [5, 1, 18], build(v) { v.box(5, 1, 18, 10, 14, 18, 'sky'); v.set(9, 7, 19, 'gold'); v.box(6, 11, 18, 9, 12, 18, 'white'); } } } });
D('o_badeball', { size: [8, 8, 8], scale: 1 / 16, build(v) { v.sphere(3.5, 3.5, 3.5, 3.6, 'white'); v.paint((x, y, z) => ['red', 'white', 'sky', 'yellow'][Math.floor((Math.atan2(z - 3.5, x - 3.5) + Math.PI) / (Math.PI / 2)) % 4]); v.set(3, 7, 3, 'white'); } });

// snow extras: penguin, igloo (a seal peeks out), snowball pile
D('o_pingvin', { size: [11, 17, 10], scale: 1 / 16,
  build(v) { v.ellipsoid(5, 6, 5, 4, 5.5, 3.6, 'navySoft'); v.ellipsoid(5, 5.5, 7, 2.8, 4.4, 2, 'white'); v.sphere(5, 12, 5, 3, 'navySoft'); v.ellipsoid(5, 11.5, 7, 2, 2, 1.2, 'white');
    v.set(4, 13, 8, 'black'); v.set(6, 13, 8, 'black'); v.box(4, 11, 8, 6, 11, 9, 'orange'); v.box(3, 0, 5, 4, 0, 8, 'orange'); v.box(6, 0, 5, 7, 0, 8, 'orange'); v.box(2, 9, 4, 8, 9, 7, 'pink'); v.box(7, 6, 7, 7, 9, 8, 'pink'); },
  parts: { wingL: { pivot: [1, 9, 5], build(v) { v.box(0, 3, 4, 1, 9, 6, 'navySoft'); } }, wingR: { pivot: [9, 9, 5], build(v) { v.box(9, 3, 4, 10, 9, 6, 'navySoft'); } } } });
D('o_iglo', { size: [26, 14, 30], scale: 1 / 12,
  build(v) { for (let x = 0; x < 26; x++) for (let y = 0; y < 14; y++) for (let z = 0; z < 26; z++) { const q = ((x - 12.5) / 12.5) ** 2 + (y / 12.5) ** 2 + ((z - 12.5) / 12.5) ** 2; if (q <= 1 && q > 0.62) v.set(x, y, z, (y % 3 === 0 || (x + (y % 2) * 2) % 5 === 0) ? 'ice' : 'snow'); }
    for (let z = 22; z < 30; z++) for (let x = 8; x <= 17; x++) for (let y = 0; y <= 7; y++) { const q = ((x - 12.5) / 4.6) ** 2 + (y / 7.2) ** 2; if (q <= 1) v.set(x, y, z, q > 0.5 ? 'snow' : 'navySoft'); } },
  parts: { peek: { pivot: [12.5, 0, 27], build(v) { v.sphere(12.5, 3, 27, 2.6, 'hairGrey'); v.set(11, 4, 29, 'black'); v.set(14, 4, 29, 'black'); v.box(12, 3, 29, 13, 3, 29, 'black'); v.set(10, 2, 29, 'white'); v.set(15, 2, 29, 'white'); } } } });
D('o_snoballer', { size: [18, 9, 18], scale: 1 / 12, build(v) { v.ellipsoid(9, 0, 9, 8, 1, 8, 'snow'); [[6, 6], [12, 7], [9, 12], [8, 9]].forEach(([x, z], i) => v.sphere(x, i === 3 ? 6 : 2.5, z, 2.6, i % 2 ? 'snow' : 'white')); },
  parts: { big: { pivot: [14, 0, 13], build(v) { v.sphere(14, 2.5, 13, 2.6, 'snow'); } } } });
D('o_snoball', { size: [5, 5, 5], scale: 1 / 16, build(v) { v.sphere(2, 2, 2, 2.4, 'snow'); } });

/* =================================================================== TYPES */
const BEH = () => F.BEH;
const OBJ = F.OBJ = { types: {}, list: [] };
const ALIAS = () => (F.BEH && F.BEH.ALIAS) || {};
function chooseModel(ids, needs) {
  for (const id of ids) {
    if (!id || !F.VOX.has(id)) continue;
    if (!id.startsWith('o_') && needs && needs.length) {
      const ps = Object.keys(F.VOX.defs[id].parts || {});
      if (!needs.every(n => ps.includes(n) || (ALIAS()[n] || []).some(a => ps.includes(a)))) continue;
    }
    return id;
  }
  return null;
}
function nextPlay(th, spec) {
  const L = spec.play; if (L.length === 1) return L[0];
  th._pv = th._pv == null ? 0 : (th._pv + 1) % L.length;
  return L[th._pv];
}
const say = (tpl, o) => ['say', Object.assign({ tpl }, o || {})];
// learning spots INVITE while they can give a task: a soft pulsing glow above them + twinkles (+ a per-type hook, e.g. the
// mailbox raises its flag). Calm during the play-break, during a task, or once solved (fixed / opened / found).
function spotInvite(th, dt, t, spec) {
  if ((th._ic = (th._ic || 0) - dt) <= 0) {
    th._ic = 0.6;
    const done = th.hidden || th.state.fixed || th.state.opened || th.state.found, P = F.Player.pos;
    // v5 WP-W (DESIGN4 §5): an invitation is an unsolicited offer → F.Quest.quiet() (the play break), not canOfferTask()
    th._invite = !done && th.space === F.Space.cur && !(F.Task && F.Task.current) && !(F.Quest && (F.Quest.quiet ? F.Quest.quiet() : (F.Quest.canOfferTask && !F.Quest.canOfferTask()))) && !(F.Befriend && F.Befriend.busy) && Math.hypot(th.x - P.x, th.z - P.z) < 32;
  }
  const on = !!th._invite && !th.busy;
  const k = th._ik = U.clamp((th._ik || 0) + (on ? dt : -dt) * 1.4, 0, 1);
  if (spec.twinkle !== false) {
    if (k > 0 && !th._ih) { const h = F.BEH.util.heightOf(th) / (th.obj.scale.y || 1); th._ih = F.BEH.util.halo(th.obj, 'butter', U.clamp(h * 1.1, 1.1, 2.4), new THREE.Vector3(0, h * 0.7 + 0.2, 0)); th._ih.material.opacity = 0; }
    if (th._ih) { th._ih.visible = k > 0.02; th._ih.material.opacity = k * (0.34 + 0.2 * Math.sin(t * 2.4 + th.t0)); }
  }
  if (spec.invite) spec.invite(th, on, dt, t, k);
  if (!on || spec.twinkle === false) return;
  // a gentle «press me» breath now and then
  if ((th._pulse = (th._pulse || 0) + dt) > 4.2 && !th.obj.userData._an) { th._pulse = Math.random(); const o = th.obj; F.BEH.util.anim(o, 560, (q, b) => { const a = Math.sin(q * Math.PI) * 0.06; o.scale.set(b.s.x * (1 + a * 0.5), b.s.y * (1 + a), b.s.z * (1 + a * 0.5)); }); }
  if ((th._tw = (th._tw || 0) + dt) < 1.6) return; th._tw = Math.random() * 0.5;
  const p = F.BEH.util.topOf(th, 1); p.x += (Math.random() - 0.5) * 0.6; p.z += (Math.random() - 0.5) * 0.6; p.y += 0.15;
  F.FX.sparkle(p, 0xfff2a8);
}
// learning spots look different per biome: a little biome garnish next to them (flowers, hay + pumpkin, apples, reeds,
// shells + starfish, a pinwheel, lavender, snow + ice crystals)
const PYNT_B = ['blomstereng', 'gardsland', 'frukthage', 'innsjo', 'strand', 'vindmolle', 'lavendel', 'snohaugen'];
function addGarnish(th, obj, spec) {
  let b = 'blomstereng'; try { b = (F.W.biomeAt && F.W.biomeAt(th.x, th.z)) || b; } catch (e) {}
  if (!PYNT_B.includes(b)) b = 'blomstereng';
  const g = F.VOX.make('o_pynt', { b }), side = (hashOf(th) % 2 ? 1 : -1), r = (spec.radius || 0.7) + 0.3;
  const lx = side * r, lz = 0.3, c = Math.cos(th.ry), s = Math.sin(th.ry);
  let gy = 0; try { gy = U.clamp(F.Space.impl[th.space || 'out'].heightAt(th.x + lx * c + lz * s, th.z - lx * s + lz * c) - th.y, -0.4, 0.4); } catch (e) {}
  g.position.set(lx, gy, lz); g.rotation.y = side * 0.6; g.name = 'garnish'; obj.add(g); th.biome = b;
}
function T(type, spec) {
  spec.play = spec.play || [[['wobble']]];
  if (spec.spot) { const tk = spec.tick; spec.tick = tk ? (th, dt, t) => { tk(th, dt, t); spotInvite(th, dt, t, spec); } : (th, dt, t) => spotInvite(th, dt, t, spec); }
  OBJ.types[type] = { name: spec.name, spot: !!spec.spot, learn: spec.learn || null, biomes: spec.biomes || {}, radius: spec.radius || 0.7, water: !!spec.water, ext: !!spec.ext };
  OBJ.list.push(type);
  if (spec.home) (OBJ.homes = OBJ.homes || {})[type] = spec.home.slice();
  F.Things.def(type, {
    name: spec.name, radius: spec.radius || 0.7, solid: spec.solid != null ? spec.solid : true, reach: spec.reach, learn: spec.learn, surprise: spec.surprise !== false,
    beh: spec.play[0], play: spec.play, spot: !!spec.spot, objSpec: spec,
    build(th, rng) {
      const id = chooseModel(spec.models, spec.needs); th.modelId = id;
      const o = Object.assign({}, spec.modelOpts || {}, spec.opts ? spec.opts(th, rng) : {}, th.data.opts || {});
      th.modelOpts = o;
      let obj;
      try { obj = id ? F.VOX.make(id, o) : new THREE.Group(); } catch (e) { console.error('model failed', type, id, e); obj = new THREE.Group(); }
      if (spec.decorate) spec.decorate(th, obj, rng);
      if (spec.spot && spec.garnish !== false && th.space === 'out') try { addGarnish(th, obj, spec); } catch (e) { console.error('garnish', type, e); }
      return obj;
    },
    init(th) { if (spec.init) spec.init(th); F.BEH.init(th); },
    press(th) {
      const normal = () => {
        if (spec.press) return spec.press(th, spec);
        if (spec.spot && spec.learn) return F.BEH.learnOrPlay(th, spec.learn, nextPlay(th, spec), spec.after);
        return F.BEH.runList(th, nextPlay(th, spec));
      };
      // v5 WP-W (DESIGN5 §3.1): a world HOME of a format – her tap may open it there (level + play-break aware), else the thing plays
      // v5c WP-W2: an interaction HOOK first (spec.hook(th) -> Promise | null: a true sentence / a due question, once a day), then the home
      if (spec.hook) { let hk = null; try { hk = spec.hook(th); } catch (e) { console.error('[hook]', type, e); } if (hk) return hk.then(r => (r === null ? normal() : r)); }
      if (spec.home && !spec.homeInPress) { const h = OBJ.home(th, spec.home, { place: spec.homePlace, after: spec.homeAfter || homePayoff(spec) }); if (h) return h.then(res => res || normal()); }
      return normal();
    },
    tick: spec.tick,
    dispose(th) { (th._labels || []).forEach(L => L.remove()); th._labels = []; if (spec.dispose) spec.dispose(th); },
  });
}
// v5c WP-W2: a home's default PAYOFF when she solved its task herself – the thing's own first reaction (without its line) + hearts:
// the gate swings open, the stones ring, the crystals sing (OBJ.home calls it only after A / production B)
function homePayoff(spec) {
  const first = (spec.play && spec.play[0]) || [];
  const acts = first.filter(x => !(Array.isArray(x) && x[0] === 'say'));
  return th => F.BEH.runList(th, acts.concat([['hearts']]), { noSurprise: true });
}
const label = (th, anchor, text, o) => { if (!F.UI.label) return null; const L = F.UI.label(anchor, text, Object.assign({ space: th.space }, o || {})); (th._labels = th._labels || []).push(L); return L; };
const hashOf = th => U.hashStr(th.id + ':' + th.type);
/* v5c WP-W2 (longevity hook #14, LES): stalls carry a sign she reads HERSELF (F.UI.tryRead: 1st tap sounds it out by sound units, 2nd
   tap the whole word) – never spoken first. The word clip: word_<w>, else rw_word (WORDS set), else rw_label (LABEL_WORDS), else a sparkle. */
function signTpl(w) {
  if (F.TPL.has('word_' + w)) return { tpl: 'word_' + w, slots: {} };
  try { if (F.TPL.has('rw_word') && F.SETS.get && (F.SETS.get('WORDS') || []).includes(w)) return { tpl: 'rw_word', slots: { w } }; } catch (e) { /* no set */ }
  if (F.TPL.has('rw_label') && Array.isArray(F.SETS.LABEL_WORDS) && F.SETS.LABEL_WORDS.includes(w)) return { tpl: 'rw_label', slots: { w } };
  return { tpl: null, slots: {} };
}
function readSign(th, word, dy) {
  try {
    if (!F.UI.tryRead || !F.UI.label || th._sign || th.space !== 'out') return;
    const sy = th.obj.scale.y || 1, a = new THREE.Object3D(); a.position.set(0, dy != null ? dy / sy : F.BEH.util.heightOf(th) / sy + 0.25, 0.35); th.obj.add(a);
    const L = label(th, a, F.UI.caseText ? F.UI.caseText(word) : word.toUpperCase(), { kind: 'plaque', size: 22, maxDist: 18 }); if (!L) return;
    const t = signTpl(word);
    th._sign = F.UI.tryRead(L, word, { maxDist: 10, tpl: t.tpl, slots: t.slots });
  } catch (e) { console.error('[sign]', th.type, e); }
}
function dropSign(th) { try { if (th._sign) th._sign.remove(); } catch (e) { /* gone */ } th._sign = null; }
OBJ.readSign = readSign;
// number chips in a row must stay visibly separate: hide a thing's labels at the farthest zoom (36 m) where they would touch
function labelsByZoom(th) { const c = F.R.cam, far = (c.distGoal != null ? c.distGoal : c.dist) > 30; if (th._far !== far) { th._far = far; (th._labels || []).forEach(L => L.show(!far)); } }

/* ---- #124 windmill */
T('n_molle', { name: 'mølla', models: ['n_molle', 'o_molle'], needs: ['sails'], radius: 1.7, reach: 3.4, biomes: { Vindmølleåsene: 6, Gårdsland: 1 },
  // v5c WP-W2 (hook #4, mat_og_opphav): the flour sack pops out with «Brød lages av korn.» – the first tap of the day
  hook: th => OBJ.trueLine(th, 'hk_brod_korn', { vis: [['spin', { part: 'sails', axis: 'z', turns: -3, ms: 2600, sound: 'whoosh', bg: true }], ['pop', { model: ['melsekk', 'o_melsekk'], from: 0.12, size: 0.5 }], ['fx', { kind: 'flour', at: 'base', n: 30 }]] }),
  tick(th, dt) { const s = th.parts.sails || th.parts.vinger; if (s) s.rotation.z -= dt * 0.5 * ((F.Weather && F.Weather.windK) || 1); },
  play: [
    [['spin', { part: 'sails', axis: 'z', turns: -3, ms: 2600, sound: 'whoosh' }], ['pop', { model: ['melsekk', 'o_melsekk'], from: 0.12, size: 0.5 }], ['fx', { kind: 'flour', at: 'base', n: 30 }], say('obj_molle')],
    [['spin', { part: 'sails', axis: 'z', turns: -2, ms: 1800 }], ['fly', { birds: 2 }], say('obj_molle_2')],
  ] });
/* ---- #125 well */
T('v_bronn', { name: 'brønnen', models: ['v_bronn', 'o_bronn'], needs: ['bucket'], radius: 1.0, biomes: { Landsby: 3, Gårdsland: 1 },
  play: [
    [['spin', { part: 'crank', axis: 'x', turns: 2, ms: 1200, sound: 'creak', bg: true, byModel: { v_bronn: { axis: 'z' } } }], ['rise', { part: 'bucket', h: 0.45, hold: 900 }], ['splash', { part: 'bucket' }], say('obj_bronn')],
    [['say', { tpl: 'obj_bronn_2' }], ['emerge', { part: 'nopart', model: ['frosk', 'o_froskl'] }], ['sound', { name: 'ribbit' }]],
    [['spin', { part: 'crank', axis: 'x', turns: 2, ms: 1200, sound: 'creak', bg: true, byModel: { v_bronn: { axis: 'z' } } }], ['rise', { part: 'bucket', h: 0.45, hold: 700 }], ['pop', { model: ['frosk', 'o_froskl'], sound: 'ribbit', life: 3000 }], say('obj_bronn_3')],
  ] });
/* ---- #126 apple tree (apples fall; counted into a ten-tray) */
T('n_epletre', { name: 'epletreet', models: ['n_epletre', 'o_epletre'], needs: ['crown'], radius: 0.9, reach: 2.6, learn: ['F08'], biomes: { Frukthage: 8, Blomstereng: 1, Landsby: 1 },
  // v5c WP-W2 (plants deck): one apple falls and opens – «Eplet har frø inni.» (first tap of the day)
  hook: th => OBJ.trueLine(th, 'hk_eple_fro', { vis: [['shake', { part: 'crown', fx: 'leaf' }], ['drop', { model: ['eple', 'o_eple'], n: 1, life: 3200, size: 0.3 }]] }),
  play: [
    [['shake', { part: 'crown', fx: 'leaf' }], fruitOff, countNat('drop', { model: ['eple', 'o_eple'], count: true, lo: 3, hi: 8 }), fruitBack],   // natural 11.10.: 3–8 apples, a rising pling each, the total chip silently
    [['shake', { part: 'crown', fx: 'petal' }], ['drop', { model: ['eple', 'o_eple'], n: 4, life: 3000, size: 0.26 }], say('obj_epletre_2')],
  ] });
function fruitOff(th) { const f = th.parts.fruit; if (f) f.visible = false; }
function fruitBack(th) { const f = th.parts.fruit; if (!f) return; F.T.timeout(() => { f.visible = true; f.scale.setScalar(0.01); F.T.tween(700, k => f.scale.setScalar(Math.max(0.01, F.BEH.util.ease.back(k)))); F.sfx.grow(); }, 4000); }
/* ---- #127 beehive */
// v5 WP-W (playtest «Bzzz»): the harsh sawtooth game-show 'buzz' is gone from the hive. A soft bee hum instead: WP-A's synthesized
// animal sound when it exists (F.sfx.bie / F.sfx.bee / F.AnimalSfx.play('bie')), else a gentle triangle wing flutter.
function beeHum() {
  try {
    if (F.AnimalSfx && F.AnimalSfx.play && F.AnimalSfx.play('bie') !== false) return;
    const own = F.sfx.bie || F.sfx.bee; if (own && own !== beeHum) { own(); return; }
    if (F.sfx.tone) for (let i = 0; i < 8; i++) F.sfx.tone(225 + Math.random() * 25, 0.07, 'triangle', 0.03, i * 0.055);
  } catch (e) { /* audio off */ }
}
if (!F.sfx.beeSoft) F.sfx.beeSoft = beeHum;
T('n_bikube', { name: 'bikuben', models: ['n_bikube', 'o_bikube'], radius: 0.6, biomes: { Blomstereng: 3, Lavendelåker: 3 },
  // v5c WP-W2 (hook #1/#4): the bee's true sentences (honey rises with «Bia lager honning av nektar.»); the hive may ask «Hva spiser bia?»
  hook: th => OBJ.firstHook(() => OBJ.vitAsk(th, 'bie', { kinds: ['mat'], after: t => F.BEH.runList(t, [['sound', { name: 'beeSoft' }], ['fly', { model: 'o_bie', birds: 5, ms: 2400, size: 0.12 }], ['rise', { model: ['honning', 'o_honning'], n: 1, h: 0.6, size: 0.35 }]], { noSurprise: true }) }),
    () => OBJ.animalX(th, 'bie', { vis: { 'Bia lager honning av nektar.': [['sound', { name: 'beeSoft' }], ['rise', { model: ['honning', 'o_honning'], n: 1, h: 0.6, size: 0.35 }]],
      '*': [['sound', { name: 'beeSoft' }], ['fly', { model: 'o_bie', birds: 4, ms: 2200, size: 0.12 }]] } })),
  tick(th, dt, t) { const own = th.parts.bier || th.parts.bees; if (own) { own.rotation.y += dt * 1.6; own.position.y = (own.userData.y0 != null ? own.userData.y0 : (own.userData.y0 = own.position.y)) + Math.sin(t * 3) * 0.04; return; }
    if (!th._bees) { th._bees = []; for (let i = 0; i < 3; i++) { const b = F.VOX.make('o_bie'); th.obj.add(b); th._bees.push(b); } }
    th._bees.forEach((b, i) => { const a = t * (1.6 + i * 0.3) + i * 2.1; b.position.set(Math.cos(a) * (0.5 + i * 0.12), 1.2 + Math.sin(a * 2.3) * 0.15 + i * 0.1, Math.sin(a) * (0.5 + i * 0.12)); b.rotation.y = -a; }); },
  play: [
    [['sound', { name: 'beeSoft' }], ['fly', { model: 'o_bie', birds: 5, ms: 2400, size: 0.12 }], ['rise', { model: ['honning', 'o_honning'], n: 1, h: 0.6, size: 0.35 }], say('obj_bikube')],
    [['wobble', { amp: 0.1, sound: 'beeSoft' }], ['dance', { ms: 1600, music: 'beeSoft' }]],
  ] });
/* ---- #128 mailbox (learning spot F23/F28) */
// the flag is DOWN at rest (MODELS-3's model is authored with it up → lowered here) and goes UP while a letter (task) waits
function flagDown(th) { const f = th.parts.flag; if (f.userData._fd == null) f.userData._fd = f.rotation.x + (th.modelId === 'v_postkasse' ? 1.57 : 0); return f.userData._fd; }
T('v_postkasse', { name: 'postkassa', models: ['v_postkasse', 'o_postkasse'], needs: ['flag'], radius: 0.45, spot: true, learn: ['F23', 'F28', 'F02'], biomes: { Landsby: 4, Gårdsland: 1 },   // v3 WP5: F02 = Postrunden on the real street
  init(th) { const f = th.parts.flag; if (f) f.rotation.x = flagDown(th); },
  invite(th, on, dt) { const f = th.parts.flag; if (!f || f.userData._an) return; const want = flagDown(th) + (on ? -1.57 : 0), d = want - f.rotation.x; if (Math.abs(d) < 0.002) return;
    f.rotation.x += d * Math.min(1, dt * 4); if (on && Math.abs(d) > 1.2 && !th._flagSnd) { th._flagSnd = 1; if (Math.hypot(th.x - F.Player.pos.x, th.z - F.Player.pos.z) < 12) F.sfx.pling && F.sfx.pling(7); } if (!on) th._flagSnd = 0; },
  play: [
    [['open', { part: 'door', axis: 'x', angle: 1.4, hold: 900 }], ['pop', { model: ['brev', 'o_brev'], size: 0.3 }], say('obj_postkasse')],
    [['swing', { part: 'flag', axis: 'x', amp: 0.5, n: 3, ms: 1200, sound: 'pling' }], ['open', { part: 'door', axis: 'x', angle: 1.4, hold: 600 }], ['fly', { birds: 1, model: 'o_fugl' }], say('obj_postkasse_2')],
  ],
  after: th => F.BEH.runList(th, [['open', { part: 'door', axis: 'x', angle: 1.4, hold: 500 }], ['hearts']], { noSurprise: true }) });
/* ---- #129 hay bale */
T('n_hoyball', { home: ['F71'], homePlace: 'farm', name: 'høyballen', models: ['n_hoyball', 'o_hoyball'], needs: ['kitten'], radius: 0.9, biomes: { Gårdsland: 5 },
  init(th) { const k = th.parts.kitten; if (k) k.visible = false; },
  // v5c WP-W2 (ORD Or-U): the kitten pops out of the hay – «Vi sier: leken som en kattunge!» + its meaning (once a day)
  hook: th => OBJ.wordHook(th, 'kattunge', { act: [['emerge', { part: 'kitten', model: ['kattunge', 'o_kattunge'], h: 0.32, hold: 2600, sound: 'meow', hide: true }]] }),
  play: [
    [['fx', { kind: 'hay', n: 34 }], ['emerge', { part: 'kitten', model: ['kattunge', 'o_kattunge'], h: 0.32, hold: 1600, sound: 'meow', hide: true }], say('obj_hoyball')],
    [['shake', { fx: 'hay' }], ['bounce', { h: 0.25 }], say('obj_hoyball_2')],
  ] });
/* ---- #130 wheelbarrow */
T('v_trillebar', { home: ['F71'], homePlace: 'farm', name: 'trillebåra', models: ['v_trillebar', 'o_trillebar'], needs: ['load'], radius: 0.7, biomes: { Gårdsland: 3, Frukthage: 2 },
  play: [
    [['spin', { part: 'wheel', axis: 'x', turns: 1, ms: 1400, sound: 'creak', bg: true }], ['walk', { r: 0.8, ms: 1400 }], ['wobble', { part: 'load', amp: 0.2, n: 6 }]],
    [['wobble', { part: 'load', amp: 0.25, n: 5 }], ['pop', { model: ['gresskar', 'o_eple'], opts: { c: 'orange' }, size: 0.3 }], say('obj_trillebar_2')],
  ] });
/* ---- #131–134 farm animals as pressable things (WP4: wandering animals now live in fauna.js; these keep a light idle life only:
   tail wag, head nods, a little graze). The retired animal thing types (retire() below) seed fauna groups instead. */
function animalIdle(th, dt, t) {
  const tail = th.parts.tail, head = th.parts.head, ph = t + th.t0 * 7;
  if (tail && !tail.userData._an) tail.rotation.y = Math.sin(ph * 5) * 0.35;
  if (head && !head.userData._an) {
    if (head.userData._hx0 == null) head.userData._hx0 = head.rotation.x;
    const g = Math.max(0, Math.sin(ph * 0.35) - 0.75) * 4; head.rotation.x = head.userData._hx0 + g * 0.45 + Math.sin(ph * 0.9) * 0.05;
  }
}
/* retired animal things (DESIGN2 §4.5 migration): worldgen may still spawn them (lake ducks, creek frogs); they are invisible markers
   that seed a fauna group of the matching species at their spot (F.Fauna.seed). Not in any biome table (not in OBJ.list). */
function retire(type, spId) {
  F.Things.def(type, { name: null, radius: 0.1, solid: false, hoverable: false, retired: true,
    build: () => new THREE.Group(),
    init(th) { th.hidden = true; if (th.space === 'out' && F.Fauna && F.Fauna.seed) { try { F.Fauna.seed(spId, th.x, th.z); } catch (e) { console.error(e); } } } });
}
/* v5c WP-W2 (longevity hooks #1 #4 #5): the first tap of the day on a farm animal says ONE true sentence about it (its album facts,
   F.VIT.sayFact – what it gives us pops out with it), and once a fact was taught twice on an earlier day the animal itself may ask it
   back (F82 «Hva spiser kua?»; a happy hop when she knew it). Other taps play as before. */
const happy = snd => th => F.BEH.runList(th, [['hop', { n: 2, sound: snd }], ['hearts']], { noSurprise: true });
const animalHook = (sp, snd, vis, kinds) => th => OBJ.firstHook(() => OBJ.vitAsk(th, sp, { kinds, after: happy(snd) }), () => OBJ.animalX(th, sp, { vis }));
T('sau', { name: 'sauen', models: ['sau', 'o_sau'], radius: 0.5, solid: false, biomes: { Gårdsland: 4, Vindmølleåsene: 4 },
  tick: animalIdle,
  hook: animalHook('sau', 'baa', { 'Sauen gir oss ull.': [['sound', { name: 'baa' }], ['pop', { model: ['ull', 'o_ull'], size: 0.4, from: 0.6 }]],
    'Av ull kan vi strikke gensere.': [['wobble', { amp: 0.08, sound: 'baa' }], ['pop', { model: ['ull', 'o_ull'], size: 0.4, from: 0.6 }]],
    '*': [['wobble', { part: 'head', axis: 'x', amp: 0.35, n: 4, ms: 1400, sound: 'baa' }]] }),
  play: [
    [['sound', { name: 'baa' }], ['follow', { secs: 5, sound: 'baa' }]],
    [['wobble', { amp: 0.08, sound: 'baa' }], ['pop', { model: ['ull', 'o_ull'], size: 0.4, from: 0.6 }], ['fx', { kind: 'snow', n: 20 }]],
    [['hop', { n: 2, sound2: 'baa' }], ['sound', { name: 'baa' }]],
  ] });
T('ku', { name: 'kua', models: ['ku', 'o_ku'], radius: 0.8, biomes: { Gårdsland: 4 },
  tick: animalIdle,
  hook: animalHook('ku', 'moo', { 'Kua gir oss melk.': [['sound', { name: 'moo' }], ['pop', { model: ['melk', 'o_melk'], size: 0.35, from: 0.3 }]],
    '*': [['wobble', { part: 'head', axis: 'x', amp: 0.35, n: 4, ms: 1400, sound: 'moo' }]] }),
  play: [
    [['sound', { name: 'moo' }], ['wobble', { part: 'head', amp: 0.2, axis: 'z', sound: 'moo' }], ['pop', { model: ['melk', 'o_melk'], size: 0.35, from: 0.3 }]],
    [['dance', { ms: 2000, music: 'moo' }]],
  ] });
T('gris', { name: 'grisen', models: ['gris', 'o_gris'], radius: 0.5, solid: false, biomes: { Gårdsland: 3 },
  tick: animalIdle,
  hook: animalHook('gris', 'oink', { 'Grisen ruller seg i gjørme for å holde seg kjølig.': [['wobble', { amp: 0.25, n: 8, ms: 1000, sound: 'oink' }], ['splash', { fx: 'sand' }]],
    '*': [['wobble', { part: 'head', axis: 'x', amp: 0.3, n: 4, ms: 1200, sound: 'oink' }]] }),
  play: [
    [['sound', { name: 'oink' }], ['wobble', { amp: 0.25, n: 8, ms: 1000, sound: 'oink' }], ['splash', { fx: 'sand' }]],
    [['hop', { n: 3, sound: 'oink' }]],
  ] });
// v5c WP-W2 (hook #5): a hen lays ONE egg per tap – the v1 variant that counted 10–20 eggs out of one hen is gone
T('hone', { name: 'høna', models: ['hone', 'høne', 'o_hone'], radius: 0.35, solid: false, biomes: { Gårdsland: 4, Landsby: 1 },
  tick: animalIdle,
  hook: animalHook('høne', 'cluck', { 'Høna legger egg.': [['sound', { name: 'cluck' }], ['pop', { model: ['egg', 'o_egg'], from: 0.2, size: 0.12 }]],
    'Kyllingen kommer ut av egget.': [['sound', { name: 'cluck' }], ['pop', { model: ['egg', 'o_egg'], from: 0.2, size: 0.12 }]],
    '*': [['wobble', { part: 'head', axis: 'x', amp: 0.5, n: 6, ms: 800, sound: 'cluck' }]] }, ['mat', 'unge', 'hjem']),
  play: [
    [['sound', { name: 'cluck' }], ['wobble', { part: 'head', axis: 'x', amp: 0.5, n: 6, ms: 800, sound: 'cluck' }], ['pop', { model: ['egg', 'o_egg'], from: 0.2, size: 0.12 }]],
    [['hop', { n: 2, sound: 'cluck' }]],
  ] });
/* ---- #135 sunflower */
// v5c WP-W2 (hook #12, a false fact fixed): the sunflower turns towards the SUN (the light comes from +x/+z), never towards her
async function faceSun(th) {
  const U2 = F.BEH.util, o = U2.part(th, 'head') || th.obj;
  const from = o.rotation.y; let d = Math.atan2(30, 22) - th.ry - from;
  while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  F.sfx.grow && F.sfx.grow();
  if (Math.abs(d) < 0.15) await F.BEH.run(th, 'wobble', { part: 'head', amp: 0.1, n: 3 });
  else await U2.tweenRest(o, 'rotation', 'y', from + d, 900, U2.ease.out);
  U2.burst(U2.topOf(th, 1), 'petal', { n: 8 });
}
T('n_solsikke', { name: 'solsikken', models: ['n_solsikke', 'o_solsikke'], needs: ['head'], radius: 0.4, solid: false, biomes: { Lavendelåker: 4, Blomstereng: 2, Gårdsland: 1 },
  hook: th => OBJ.trueLine(th, 'hk_planter', { vis: [faceSun] }),     // «Planter trenger vann, lys og jord.»
  play: [
    [faceSun, say('obj_solsikke')],
    [['grow', { stages: 3, s0: 0.7 }], ['sparkle', { color: 'butter' }], say('obj_solsikke_2')],
  ] });
/* ---- #136 lavender */
T('n_lavendel', { name: 'lavendelen', models: ['n_lavendel', 'o_lavendel'], radius: 0.9, solid: false, biomes: { Lavendelåker: 8, Blomstereng: 1 },
  hook: th => OBJ.animalX(th, 'sommerfugl', { vis: { '*': [['fly', { model: 'o_sommerfugl', birds: 4, ms: 2600, size: 0.18 }]] } }),   // v5c WP-W2 (hook #2)
  play: [
    [['fly', { model: 'o_sommerfugl', birds: 5, ms: 2800, size: 0.18 }], ['fx', { kind: 'lav', n: 18 }], say('obj_lavendel')],
    [['shake', { fx: 'lav', sound: 'rustle' }], ['hearts'], say('obj_lavendel_2')],
  ] });
/* ---- #137 crystals (xylophone; Krystallfeen harvests one for her stall) */
T('n_krystaller', { home: ['F46'], homePlace: 'krystallhule', name: 'krystallene', models: ['n_krystaller', 'o_krystaller'], radius: 0.9, biomes: { Snøhaugen: 4, Vindmølleåsene: 1 },
  play: [
    [['note', { parts: ['c1', 'c2', 'c3', 'c4', 'k1', 'k2', 'k3', 'k4', 'k5'], scale: 'penta', inst: 'bell', n: 5, gap: 120 }], say('obj_krystaller')],
    [['note', { parts: ['c4', 'c3', 'c2', 'c1', 'k5', 'k4', 'k3', 'k2', 'k1'], scale: 'major', inst: 'crystal', n: 4, gap: 160 }], ['fx', { kind: 'crystal' }], (th) => harvestCrystal(th)],
    [['sound', { name: 'crystal' }], countNat('count', { model: ['krystall', 'o_krystall'], size: 0.3, lo: 3, hi: 9 })],
  ] });
async function harvestCrystal(th) {
  if ((F.save.fairy || 'krystall') !== 'krystall') return F.BEH.run(th, 'sparkle', { color: 'crystal' });
  await F.BEH.run(th, 'pop', { model: ['krystall', 'o_krystall'], size: 0.3, life: 1200 });
  if (F.Stall && F.Stall.stock) try { F.Stall.stock('krystall', 1); } catch (e) {}
  F.SAYF('obj_krystaller_hoste');
}
/* ---- #138 snowman (built ball by ball) */
T('n_snomann', { name: 'snømannen', models: ['n_snomann', 'o_snomann'], needs: ['hat'], radius: 0.6, biomes: { Snøhaugen: 5 },
  press: th => F.BEH.react(th, [buildSnowman, say('obj_snomann')]) });
async function buildSnowman(th) {
  const order = ['b2', 'b3', 'nose', 'hat'].map(n => F.BEH.util.part(th, n)).filter(Boolean);
  if (!order.length) return F.BEH.run(th, 'bounce', {});
  F.sfx.snow && F.sfx.snow(); F.BEH.util.burst(F.BEH.util.topOf(th, 0.6), 'snow', { n: 30 });
  order.forEach(o => { o.visible = false; });
  th.lastReactAt = F.T.now;
  await F.T.sleep(350);
  for (const o of order) {
    o.visible = true; const y0 = o.position.y;
    F.sfx.pop();
    await F.T.tween(380, k => { o.position.y = y0 + (1 - F.BEH.util.ease.out(k)) * 0.8; o.scale.setScalar(0.5 + 0.5 * k); });
    o.position.y = y0; o.scale.setScalar(1);
    F.sfx.thud(); F.FX.sparkle(F.BEH.util.wpos(o).add(new THREE.Vector3(0, 0.2, 0)));
    await F.T.sleep(160);
  }
  F.sfx.tada();
}
/* ---- #139 sled hill */
T('n_akebakke', { name: 'akebakken', models: ['n_akebakke', 'o_slede'], radius: 0.6, solid: false, biomes: { Snøhaugen: 4 },
  play: [
    [['ride', { mode: 'line', dz: 6, terrain: true, ms: 3000, sound: 'whoosh', seatY: 0.4, jiggle: 0.02 }], ['fx', { kind: 'snow', at: 'base', n: 24 }], say('obj_akebakke')],
    [['ride', { mode: 'line', dx: 5, dz: 3, terrain: true, ms: 3000, sound: 'whoosh', seatY: 0.4 }], say('obj_akebakke_2')],
  ] });
/* ---- #140 skating pond */
T('n_skoytedam', { name: 'skøytedammen', models: ['n_skoytedam', 'o_skoytedam'], radius: 2.3, solid: false, reach: 3.5, biomes: { Snøhaugen: 3 },
  hook: th => OBJ.trueLine(th, 'hk_vann_is', { vis: [['sparkle', { color: 'ice' }], ['fx', { kind: 'snow', n: 20 }]] }),   // v5c WP-W2: «Når vann fryser, blir det til is.»
  play: [
    [['ride', { mode: 'orbit', r: 1.4, ms: 3600, music: 'waltz', fx: 'snow', dy: 0.15 }], say('obj_skoytedam')],
    [['ride', { mode: 'orbit', r: 1.0, turns: 2, ms: 3200, music: 'tune', fx: 'star', dy: 0.15 }], ['sparkle', { color: 'ice' }], say('obj_skoytedam_2')],
  ] });
/* ---- #141 lighthouse */
T('v_fyrtarn', { name: 'fyrtårnet', models: ['v_fyrtarn', 'o_fyrtarn'], radius: 1.3, reach: 3, biomes: { Strand: 1 },
  init(th) { const b = th.parts.beam || th.obj; th._lamp = F.BEH.util.halo(b, 'glowYellow', 2.4, b === th.obj ? new THREE.Vector3(0, 6.4, 0) : null); },
  tick(th, dt, t) { if (th._lamp) th._lamp.material.opacity = 0.6 + Math.sin(t * 2) * 0.3; },
  play: [
    [['beam', { part: 'beam', turns: 2, ms: 3600 }], say('obj_fyrtarn')],
    [['beam', { part: 'beam', turns: 1, ms: 2400, bg: true }], ['view', { dist: 58, ms: 3600 }], say('obj_fyrtarn_2')],
  ] });
/* ---- #142 sailboat */
T('v_seilbat', { name: 'seilbåten', models: ['v_seilbat', 'o_seilbat'], radius: 1.2, reach: 3.2, water: true, biomes: { Strand: 3, Innsjø: 2 },
  tick(th, dt, t) { if (!th.obj.userData._an) { th.obj.rotation.z = Math.sin(t * 1.3 + th.t0) * 0.04; } },
  play: [
    [['bob', { ms: 1200 }], ['ride', { mode: 'circle', r: 2.5, ms: 5200, wake: true, sound: 'splash' }], say('obj_seilbat')],
    [['swing', { part: 'sail', axis: 'y', amp: 0.6, n: 2, ms: 1600, sound: 'swish' }], ['bob']],
  ] });
/* ---- #143 crab */
T('krabbe', { name: 'krabben', models: ['krabbe', 'o_krabbe'], radius: 0.4, solid: false, biomes: { Strand: 5 },
  // v5c WP-W2 (hook #3): «Krabben går sidelengs.» while it walks sideways; «… to av dem er klør» while the claws wave
  hook: th => OBJ.animalX(th, 'krabbe', { vis: { 'Krabben går sidelengs.': [['walk', { r: 1, ms: 1600 }]],
    '*': [['swing', { part: 'clawR', axis: 'z', amp: 0.9, n: 4, ms: 1500, sound: 'squeak' }], ['wobble', { part: 'clawL', amp: 0.6, n: 6 }]] } }),
  play: [
    [['dance', { ms: 2200, music: 'tune' }], ['wobble', { part: 'clawL', amp: 0.6, n: 6 }], say('obj_krabbe')],
    [['swing', { part: 'clawR', axis: 'z', amp: 0.9, n: 4, ms: 1500, sound: 'squeak' }], ['walk', { r: 1, ms: 1600 }], say('obj_krabbe_2')],
  ] });
/* ---- #144 seashell */
T('n_skjell', { home: ['F58'], homePlace: 'stall', name: 'skjellet', models: ['n_skjell', 'o_skjell'], needs: ['top'], radius: 0.4, solid: false, biomes: { Strand: 5 },
  play: [
    [['open', { part: 'top', axis: 'x', angle: -1.0, hold: 1600, sound: 'squeak' }], ['note', { scale: 'penta', inst: 'bell', n: 3 }], say('obj_skjell')],
    [['open', { part: 'top', axis: 'x', angle: -1.1, hold: 1200, sound: 'squeak' }], ['pop', { model: ['perle', 'o_perle'], size: 0.12 }], say('obj_skjell_2')],
  ] });
/* ---- #145 sandcastle */
T('n_sandslott', { home: ['F60', 'F59'], homePlace: 'building', name: 'sandslottet', models: ['n_sandslott', 'o_sandslott'], needs: ['t1'], radius: 1.1, biomes: { Strand: 4 },
  play: [[['cycle', { parts: ['t1', 't2', 't3', 't4'], sound: 'pop', fx: 'sand', wrapFx: 'water' }], say('obj_sandslott')]] });
/* ---- #146 Ferris wheel */
T('v_pariserhjul', { name: 'pariserhjulet', models: ['v_pariserhjul', 'o_pariserhjul'], needs: ['wheel'], radius: 2.4, reach: 3.6, biomes: { Landsby: 1 },
  init(th) { placeCabins(th); },
  tick(th, dt) { const w = th.parts.wheel; if (!w) return; if (!th._riding) w.rotation.z += dt * 0.12; placeCabins(th); },
  press: th => F.BEH.react(th, [rideWheel, say('obj_pariserhjul')]) });
function placeCabins(th) {
  const w = th.parts.wheel; if (!w || !th.parts.c0) return; const s = 1 / 8, R = PH.R * s;
  for (let i = 0; i < 6; i++) { const c = th.parts['c' + i]; if (!c) continue; const a = i * Math.PI / 3 + w.rotation.z; c.position.set(Math.cos(a) * R, PH.hub[1] * s + Math.sin(a) * R, 3 * s); }
}
async function rideWheel(th) {
  const w = th.parts.wheel; if (!w) return F.BEH.run(th, 'spin', {});
  th._riding = true; F.sfx.tune && F.sfx.tune();
  const c0 = th.parts.c0, ms = 6500, z0 = w.rotation.z;
  // bring cabin 0 to the bottom first, then one full turn while she rides
  const bottom = -Math.PI / 2 - 0 - z0; let d = c0 ? ((bottom % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) : 0; if (d > 0.01) d -= Math.PI * 2;
  await F.T.tween(900, k => { w.rotation.z = z0 + d * F.BEH.util.ease.inOut(k); placeCabins(th); });
  const z1 = w.rotation.z;
  const spin = F.T.tween(ms, k => { w.rotation.z = z1 + Math.PI * 2 * F.BEH.util.ease.inOut(k); placeCabins(th); });
  if (th.space === F.Space.cur && c0) await F.BEH.util.carry(() => F.BEH.util.wpos(c0).add(new THREE.Vector3(0, -0.85, 0)), ms);
  else if (th.space === F.Space.cur) { // wheel without separate cabins: ride along the rim
    if (th._rimR == null) { const b = new THREE.Box3().setFromObject(w); th._rimR = Math.max(1, (b.max.y - b.min.y) / 2 - 0.6); }
    await F.BEH.util.carry(() => { const h = F.BEH.util.wpos(w), a = w.rotation.z - z1 - Math.PI / 2; return h.add(new THREE.Vector3(Math.cos(a) * th._rimR * Math.cos(th.ry) + Math.sin(th.ry) * 1.1, Math.sin(a) * th._rimR - 0.6, -Math.cos(a) * th._rimR * Math.sin(th.ry) + Math.cos(th.ry) * 1.1)); }, ms);
  }
  await spin; th._riding = false; F.sfx.tada();
}
/* ---- #147 water wheel */
T('v_vannhjul', { name: 'vannhjulet', models: ['v_vannhjul', 'o_vannhjul'], needs: ['wheel'], radius: 1.4, reach: 3, water: true, biomes: { Innsjø: 3, Gårdsland: 1 },
  tick(th, dt) { const w = th.parts.wheel; if (w) w.rotation.x += dt * 0.6; },
  play: [
    [['spin', { part: 'wheel', axis: 'x', turns: 1.5, ms: 2000, sound: 'splash' }], ['splash'], say('obj_vannhjul')],
    [['splash', { n: 40 }], ['fx', { kind: 'water', n: 30 }], say('obj_vannhjul_2')],
  ] });
/* ---- #148 letter stones (learning spot F35/F36) */
const STONES = ['s0', 's1', 's2', 's3', 's4', 's5'];
const LETTERSETS = ['solis', 'katme', 'bilra', 'husto', 'nesav', 'pelim', 'rotef', 'gulen'];
T('n_bokstavsteiner', { name: 'bokstavsteinene', models: ['n_bokstavsteiner', 'o_bokstavsteiner'], radius: 1.6, solid: false, reach: 2.8, spot: true, learn: ['F35', 'F36'], biomes: { Blomstereng: 1, Landsby: 1, Strand: 1, Innsjø: 1, Gårdsland: 1, Frukthage: 1, Vindmølleåsene: 1, Lavendelåker: 1, Snøhaugen: 1 },
  opts: th => ({ letters: (th.data.letters || LETTERSETS[hashOf(th) % LETTERSETS.length]).slice(0, 5) }),
  init(th) { stoneLetters(th); },
  play: [
    [['note', { parts: STONES, scale: 'major', inst: 'bell', n: 5, gap: 110 }], say('obj_bokstavsteiner')],
    [sayLetters],
  ],
  after: th => F.BEH.runList(th, [['light', { seq: STONES, ms: 120, hold: 600 }], ['fx', { kind: 'star' }]], { noSurprise: true }) });
// the stones' letters as ONE legible HTML plaque above the middle stone, letters spaced apart (DESIGN §2.7; per-stone plaques
// overlapped at normal zoom). Lowercase unless the parent setting says UPPERCASE. sayLetters highlights them one by one.
function stoneLetters(th) {
  const letters = String(th.modelOpts.letters || '').split(''), up = th.modelId === 'o_bokstavsteiner' ? 0.7 : 0.55;
  const stones = STONES.map(n => th.parts[n]).filter(Boolean);
  th._letters = stones.map((s, i) => ({ s, ch: letters[i] })).filter(it => it.ch);
  if (!th._letters.length) return;
  const a = new THREE.Object3D(); a.position.set(0, up, 0); stones[Math.floor(stones.length / 2)].add(a);
  const L = label(th, a, letters.join(''), { kind: 'word', size: 32, maxDist: 20 }); if (!L) return;
  th._letterLabel = L; L.el.textContent = '';
  Object.assign(L.el.style, { background: '#fff6dc', border: '3px solid #e0a91e', padding: '2px 10px', letterSpacing: '0' });
  th._letters.forEach(it => { const sp = document.createElement('span'); sp.className = 'lch'; sp.textContent = F.UI.caseText(it.ch);
    Object.assign(sp.style, { display: 'inline-block', margin: '0 8px', transition: 'transform .15s, color .15s' }); L.el.appendChild(sp); it.span = sp; });
}
// the stones light up one by one and each letter is SOUNDED (/s/ /o/ /l/ …, F.LYD) – v3 WP5: no letter names
async function sayLetters(th) {
  const U2 = F.BEH.util, list = th._letters || [];
  if (!list.length) return F.BEH.run(th, 'light', { seq: STONES, color: 'butter', ms: 220, hold: 900 });
  for (let i = 0; i < list.length; i++) {
    const it = list[i], h = U2.halo(it.s, 'butter', 1.0, new THREE.Vector3(0, 0.3, 0));
    U2.snd('pling', i * 2); if (it.span) Object.assign(it.span.style, { color: '#d0428a', transform: 'scale(1.4)' });
    U2.anim(it.s, 320, (k, b) => { it.s.position.y = b.p.y + Math.sin(k * Math.PI) * 0.08; });
    // v3 WP5: the letter's SOUND (F.LYD, recorded letter sounds) – never its name
    if (F.LYD) await F.LYD.letter(it.ch); else await F.T.sleep(300);
    await F.T.sleep(200); U2.killHalo(h); if (it.span) Object.assign(it.span.style, { color: '', transform: '' });
  }
  U2.snd('tada');
}
/* ---- #149 signpost «Veiviser» (v3 WP5, DESIGN3 §9.3): one arm per destination (each dir gets its own compass arm), the name plaque
   sits ON the arm tip (size 24 for all), the picture-word stem bold + a thumbnail (crest for kingdoms, castle for 'slottet').
   Tap → a REAL F26: the arm plaques are the choices (f_read.js real mode); right → the arm glows, a glitter trail runs down that road
   and the narrator names where it goes. Outside a task the plaques are F.UI.tryRead (1st tap sounds out the stem, 2nd tap the road). */
const ARMV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const dirAng = (th, d) => (d.ang != null ? d.ang : Math.atan2((d.x || 0) - th.x, (d.z || 0) - th.z));
// unique compass arm per destination (nearest free one, in data order: home first)
function armsOf(th) {
  if (th._armOf) return th._armOf;
  const dirs = (th.data.dirs || []).slice(0, 4), used = new Set(), out = [];
  dirs.forEach(d => {
    const a = dirAng(th, d), dx = Math.sin(a), dz = Math.cos(a);
    const order = Object.keys(ARMV).sort((p, q) => (-(ARMV[p][0] * dx + ARMV[p][1] * dz)) - (-(ARMV[q][0] * dx + ARMV[q][1] * dz)));
    const c = order.find(k => !used.has(k)) || order[0]; used.add(c); out.push(c);
  });
  return (th._armOf = out);
}
const VV = new Set();          // arm plaques in the world (overlap nudge pass below)
function vvValue(d) { return (F.placeStem && F.placeStem(d.name, d.realm)) || String(d.name || '').toLowerCase(); }
function vvSay(d) {
  if (d.castle) return { tpl: 'rw_f26_vei_hjem', slots: {} };
  if (d.realm && F.SETS.REALMS && F.SETS.get('REALMS').includes(d.name)) return { tpl: 'rw_f26_vei_slott', slots: { slott: d.name } };
  if (F.SETS.PLACES.includes(d.name)) return { tpl: 'rw_f26_vei', slots: { place: d.name } };
  return { tpl: null, slots: {} };
}
function armPlaques(th) {
  if (th._arms && th._arms.every(a => F.UI.labels && F.UI.labels.has(a.L))) return th._arms;
  if (th._arms) th._arms.forEach(a => { try { a.tr && a.tr.remove(); a.L && a.L.remove(); } catch (e) { /* gone */ } });
  th._arms = null;
  const dirs = (th.data.dirs || []).slice(0, 4); if (!dirs.length) return (th._arms = []);
  const arms = th._arms = [];
  const letters = armsOf(th), order = 'NESW'.split('').filter(c => letters.includes(c));
  dirs.forEach((d, k) => {
    if (!d.name) return;
    const anchor = new THREE.Object3D();
    const boards = th._dirBoards ? th._dirBoards.slice(-dirs.length) : null;
    if (th.modelId === 'o_veiskilt' && boards && boards[k]) { anchor.position.set(0.75, 0.2, 0.1); boards[k].g.add(anchor); }
    else { const c = letters[k], i = Math.max(0, order.indexOf(c)), v = ARMV[c] || ARMV.E; anchor.position.set(v[0] * 1.25, 2.95 - i * 0.4, v[1] * 1.25); th.obj.add(anchor); }
    const L = label(th, anchor, d.name, { kind: 'plaque', size: 24, maxDist: 24 }); if (!L) return;
    L.el.classList.add('vv-arm');
    const stem = F.placeStem ? F.placeStem(d.name, d.realm) : null;
    // the thumbnail: the kingdom crest, a castle for home, else the stem's model
    let icon = null;
    try {
      if (d.realm && F.Realm && F.Realm.emblemIcon) icon = F.Realm.emblemIcon(d.realm, 30);
      if (!icon) { const m = d.castle ? 'slott' : stem && F.WORDS && F.WORDS.get && F.WORDS.get(stem) ? (F.WORDS.get(stem).model || stem) : null; if (m && F.VOX.has(m) && F.Thumb) icon = F.Thumb.img(m, {}, { size: 64 }); }
    } catch (e) { icon = null; }
    if (icon) { icon.classList.add('vv-thumb'); icon.style.cssText = ''; L.el.insertBefore(icon, L.el.firstChild); }
    const sy = vvSay(d);
    const tr = F.UI.tryRead ? F.UI.tryRead(L, d.name, { stem, tpl: sy.tpl, slots: sy.slots, maxDist: 10 }) : null;
    const arm = { L, d, k, stem, value: vvValue(d), tr, arm: letters[k], ang: dirAng(th, d) };
    arms.push(arm); VV.add({ L, th, pr: (d.castle ? 0 : 1 + k) + (Math.abs(th.x) + Math.abs(th.z)) * 1e-6 });
  });
  return arms;
}
T('v_veiskilt', { name: 'veiskiltet', models: ['v_veiskilt', 'o_veiskilt'], radius: 0.4, spot: true, learn: ['F26'], biomes: {},
  opts: th => { // MODELS-3 signpost: one arm per destination (unique compass arm, north = −z)
    const dirs = th.data.dirs || []; if (!dirs.length) return {};
    const set = new Set(armsOf(th));
    return { arms: 'NESW'.split('').filter(c => set.has(c)).join('') || 'E' };
  },
  decorate(th, obj) {
    if (th.modelId !== 'o_veiskilt') return;
    const dirs = th.data.dirs || []; const arms = new THREE.Group(); arms.name = 'arms'; obj.add(arms);
    const b = F.M.builder(); b.group.position.set(0, 0, 0);
    const letters = armsOf(th);
    dirs.slice(0, 4).forEach((d, i) => {
      const v = ARMV[letters[i]] || ARMV.E, ang = Math.atan2(v[0], v[1]) - th.ry;
      const g = new THREE.Group(); g.rotation.y = ang - Math.PI / 2; g.position.y = 2.3 - i * 0.38;
      const bb = F.M.builder(); bb.box(1.1, 0.26, 0.06, i % 2 ? 'woodLight' : 'cream2', 0.62, 0, 0); bb.box(0.14, 0.18, 0.06, i % 2 ? 'woodLight' : 'cream2', 1.22, 0, 0, { rz: Math.PI / 4 });
      g.add(bb.group); arms.add(g); g.userData.tip = new THREE.Vector3(0.75, 0.05, 0.05);
      th._dirBoards = th._dirBoards || []; th._dirBoards.push({ g, name: d.name });
    });
    obj.userData.parts = obj.userData.parts || {}; obj.userData.parts.arms = arms;
  },
  init(th) { armPlaques(th); },
  press: async th => {
    // a real reading task when one can be offered (the arms that have a picture-word stem are preferred targets)
    if (F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask() && F.Task && F.Task.offer && !F.Task.current) {
      const arms = armPlaques(th), prefer = arms.filter(a => a.stem).map(a => 'LES:' + a.stem);
      th.lastReactAt = F.T.now || 1e-6; F.FX.sparkle(F.BEH.util.topOf(th, 1)); F.sfx.magic && F.sfx.magic();
      F.BEH.offers = (F.BEH.offers || 0) + 1;
      let res = null;
      try { res = await F.Task.offer({ formats: ['F26'], prefer, levelFill: false, ctx: { thing: th, signpost: true, place: 'crossroad', prefer } }); } catch (e) { console.error('veiskilt offer', e); }
      th.reactedVisibly = true;
      if (res) return res;
    }
    return F.BEH.runList(th, nextPlay(th, F.Things.defs.v_veiskilt.objSpec));
  },
  play: [
    [['wobble', { part: 'arms', axis: 'y', amp: 0.25, n: 4, sound: 'creak' }], ['fly', { birds: 1 }]],
    [['sparkle'], ['wobble', { part: 'arms', axis: 'y', amp: 0.15, n: 3 }]],
  ] });
if (F.Things.defs.v_veiskilt) F.Things.defs.v_veiskilt.ownLabels = true;     // worldgen: no floating plaques, the post carries them
OBJ.veiviser = { armsOf, armPlaques, vvValue, VV };
// arm plaques read like arrow boards: an arm that points left/right on screen has its plaque on that side of the tip (with an arrow
// tip, css .vv-arm[data-side]); plaques that still overlap (N/S arms project onto the post) step up instead of hiding
const _pv = new THREE.Vector3();
F.on('preRender', () => {
  if (!VV.size || !F.UI || !F.UI.labels) return;
  const vis = [], cam = F.R.camera, rc = F.R.renderer.domElement.getBoundingClientRect();
  for (const it of VV) {
    const L = it.L;
    if (!F.UI.labels.has(L)) { VV.delete(it); continue; }
    if (L.el.style.marginTop) L.el.style.marginTop = '';
    if (L.el.style.display === 'none' || !L._w) continue;
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(L.el.style.transform || ''); if (!m) continue;
    const x = +m[1], y = +m[2];
    let side = 0;
    if (it.th && it.th.obj) { _pv.set(it.th.x, (it.th.y || 0) + 2.4, it.th.z).project(cam); const px = rc.left + (_pv.x + 1) / 2 * rc.width; side = x - px > 12 ? 1 : x - px < -12 ? -1 : 0; }
    const ml = side * (L._w / 2 - 4);
    if (L.el.dataset.side !== String(side)) { L.el.dataset.side = String(side); L.el.style.marginLeft = ml ? ml.toFixed(0) + 'px' : ''; }
    vis.push({ L, pr: it.pr, x0: x + ml - L._w / 2 - 3, x1: x + ml + L._w / 2 + 3, y0: y - L._h - 2, y1: y + 2 });
  }
  if (vis.length < 2) return;
  vis.sort((a, b) => a.pr - b.pr);
  const kept = [];
  for (const v of vis) {
    let dy = 0;
    for (let g = 0; g < 4; g++) {
      const hit = kept.find(k => v.x1 > k.x0 && v.x0 < k.x1 && v.y1 - dy > k.y0 && v.y0 - dy < k.y1);
      if (!hit) break;
      dy += (v.y1 - dy) - hit.y0 + 2;
    }
    if (dy > 0) v.L.el.style.marginTop = (-dy).toFixed(0) + 'px';
    kept.push({ x0: v.x0, x1: v.x1, y0: v.y0 - dy, y1: v.y1 - dy });
  }
});
/* ---- #150 notice board (learning spot F23) */
T('v_oppslagstavle', { name: 'oppslagstavla', models: ['v_oppslagstavle', 'o_oppslagstavle'], needs: ['notes'], radius: 0.8, spot: true, learn: ['F23'], biomes: { Landsby: 4 },
  play: [
    [['wobble', { part: 'notes', axis: 'x', amp: 0.18, n: 6, ms: 1000, sound: 'swish' }]],
    [['shake', { part: 'notes', fx: 'confetti', sound: 'swish' }], ['pop', { model: ['brev', 'o_brev'], size: 0.3 }]],
  ],
  after: th => F.BEH.runList(th, [['wobble', { part: 'notes', axis: 'x', amp: 0.2 }], ['hearts']], { noSurprise: true }) });
/* ---- #151 house door: knock → villager waves / cookie (number plate label if data.num) */
const SHIRTS = ['sky', 'pink', 'mint', 'butter', 'lilac', 'coral', 'jeansBlue'], SKINS = ['skin', 'skin2', 'skin3', 'skin4'], HAIRS = ['hairBrown', 'hairBlond', 'hairBlack', 'hairRed', 'hairGrey'];
T('v_husdor', { name: 'døra', models: ['v_husdor', 'o_husdor'], needs: ['door'], radius: 0.6, reach: 1.9, biomes: {},
  opts: th => { const h = hashOf(th); return { c: ['woodRed', 'sky', 'mint', 'coral', 'butter'][h % 5], shirt: SHIRTS[(h >>> 3) % SHIRTS.length], skin: SKINS[(h >>> 6) % 4], hair: HAIRS[(h >>> 8) % 5] }; },
  init(th) { const v = th.parts.villager; if (v) v.visible = false; if (th.data.num != null && th.data.label === true) { const a = new THREE.Object3D(); a.position.set(0, 2.25, 0.25); th.obj.add(a); label(th, a, String(th.data.num), { kind: 'num' }); } },
  press: th => {
    // natural 11.10. (audit D3 #13): a knock is ALWAYS the wave and the cookie. One knock in three (per door, hash-offset) the villager also
    // has a wish in their own voice that fits the house – «Posten min kom til feil hus. Kan du hjelpe meg?» (F02 Postrunden with THIS door
    // as the reference; only where its street has ≥ 3 doors 10–20) or the house's windows (F49 Faktafamiliehuset) – and a gold ★ note she
    // may tap to help. At most one door wish a day (the 'v_husdor' home), ≥ 90 s after the last home task.
    const n = th.data.num, day = F.save.day || 1, HD = F.save.homeDays || {};
    th._kn3 = (th._kn3 != null ? th._kn3 : hashOf(th) % 3) + 1;
    let wish = null;
    if (th._kn3 % 3 === 0 && canTask() && !(F.Quest && F.Quest.quiet && F.Quest.quiet()) && HD.v_husdor !== day && F.T.now - OBJ.homeLast >= OBJ.HOME_GAP) {
      const post = n >= 10 && n <= 20 && f02Street(th), fam = OBJ.homeFits(['F49'], 'hus');
      const open = (fmts, ctx) => () => { OBJ.homeLast = F.T.now; OBJ.homeN++; (F.save.homeDays = F.save.homeDays || {}).v_husdor = F.save.day || 1; try { F.store && F.store(); } catch (e) { /* no store */ } return offerAt(th, fmts, ctx); };
      if (fam && (!post || (th._kn3 / 3) % 2 === 0)) wish = { tpl: 'obj_dor_onske_tall', open: open(fam, { place: 'hus', houseNum: n, home: true }) };
      else if (post) wish = { tpl: 'obj_dor_onske_post', open: open(['F02'], { refHouse: n, place: 'village' }) };
    }
    return F.BEH.react(th, [t => knock(t, wish)]);
  } });
// v5 WP-W (DESIGN4 §8): the number band she works in – world number props follow it instead of v1's 10–20.
// T-NAVN / T-ORDEN rung < 10 → natural counting 1–20; rung 10 → 20–50; rung ≥ 11 → 1–100. F.OBJ.numBand() / F.OBJ.sayNum(n)
// natural 11.10. (audit #23, parent «all numbers were like from 10, even where it doesnt make sense»): world number props are NATURAL
// and fixed – 1–20 – whatever her level; her curriculum focus lives in the tasks. r is still reported (tests / callers).
function numBand() {
  let r = 0;
  try { const S = ((F.LEARN && F.LEARN.summary && F.LEARN.summary()) || {}).strands || {}; r = Math.max((S['T-NAVN'] || {}).rung || 0, (S['T-ORDEN'] || {}).rung || 0); } catch (e) { r = 0; }
  return { lo: 1, hi: 20, r };
}
// a heard number never goes silent: 1–20 the object clip, else the narrator's whole clip 0–100 (core_num / hud_num)
function sayNum(n, o) {
  n = Math.round(+n);
  if (n >= 1 && n <= 20) return F.SAY('obj_num', { n }, '', o);
  const id = F.TPL.has('core_num') ? 'core_num' : F.TPL.has('hud_num') ? 'hud_num' : null;
  return id && n >= 0 && n <= 100 ? F.SAY(id, { n }, '', o) : Promise.resolve();
}
OBJ.numBand = numBand; OBJ.sayNum = sayNum;
// v5c WP-W2 (longevity hooks #6/#7): heaps that are counted aloud hold a NATURAL amount for the thing – a tree drops 4–12 apples, a
// rock pool shows 3–10 shells – and grow to 10–20 once her number band is past 20 (the count behaviour says 1–20). o.fixed: the
// thing's own small range always (ice-cream scoops). Never v1's «always 10–20».
// natural 11.10. (audit #18/#9): the thing's own natural range ALWAYS (a tree drops 3–8 apples, a pool holds 4–9 shells) – never 10–20
function natCount(th, lo, hi) {
  const a = lo, b = hi;
  th._nc = (th._nc || 0) + 1;
  return a + (U.hashStr(th.id + ':' + th._nc + ':' + (F.save.day || 1)) % (b - a + 1));
}
OBJ.natCount = natCount;
// v5c WP-W2 (review X «clocks that never tell the time»): ONE Feslandet clock – the hour follows the day (07–20 over F.R.dayK); the
// clock tower strikes it and the cuckoo calls it ((h−1) % 12 + 1 strokes, counted 1…n). No time question (TID is not built yet).
OBJ.hour = () => { const k = F.R && typeof F.R.dayK === 'number' ? Math.max(0, Math.min(1, F.R.dayK)) : 0; return 7 + Math.round(k * 13); };
OBJ.strokes = () => ((OBJ.hour() - 1) % 12) + 1;
function countNat(beh, p) { return th => F.BEH.run(th, beh, Object.assign({}, p, { n: natCount(th, p.lo, p.hi, p.fixed) })); }   // hoisted: used in the T() tables above
// F02 Postrunden can use this door's real street: ≥3 doors numbered 10–20 (f_num.js villageNear filter) in the village around it
function f02Street(th) {
  try {
    const vs = F.W && F.W.villages ? F.W.villages({ x: th.x, z: th.z }, 80) || [] : [];
    const v = vs.find(q => Math.abs(th.x - q.x) < 30 && Math.abs(th.z - q.z) < 56);
    return !!(v && v.houses && v.houses.filter(h => h.num >= 10 && h.num <= 20).length >= 3);
  } catch (e) { return false; }
}
OBJ.f02Street = f02Street;
(OBJ.homes = OBJ.homes || {}).v_husdor = ['F49', 'F02'];     // the village door: F49 Faktafamiliehuset / F02 Postrunden (press above)
// a task at this thing when one can be offered (like F.BEH.learnOrPlay, plus extra ctx / prefer) → Result | null
const canTask = () => !!(F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask() && F.Task && F.Task.offer && !F.Task.current);
async function offerAt(th, formats, ctx, prefer) {
  if (!canTask()) return null;
  th.lastReactAt = F.T.now || 1e-6;
  F.FX.sparkle(F.BEH.util.topOf(th, 1)); F.sfx.magic && F.sfx.magic();
  F.BEH.offers = (F.BEH.offers || 0) + 1;
  let res = null;
  try { res = await F.Task.offer({ formats, prefer, levelFill: false, ctx: Object.assign({ thing: th, place: th.data && th.data.place }, ctx || {}) }); } catch (e) { console.error('offerAt', th.type, e); }
  th.reactedVisibly = true;
  return res;
}
OBJ.offerAt = offerAt;
/* v5 WP-W (DESIGN5 §3.1, DESIGN4 §5) – WORLD HOMES of the formats. F.OBJ.home(th, formats, {place, ctx, every, force}) -> Promise<Result|null> | null
   Her tap on a home thing opens one of its formats there when:
   - the format is registered (F.Task.defs – the v4/v5 format files may not be in the build yet: feature-detected),
   - an offer is allowed and not quiet (F.Quest.quiet(): no tasks from homes in the play break; never during an encounter / the throne),
   - F.LEARN.peek says one of these formats serves her level right now (no demo items, no wrong-level tasks),
   - and the home is due: the first tap of the day on this kind of thing, then every 4th tap of it; at most one home task per 90 s.
   Returns null synchronously when nothing is offered (the caller plays its normal reaction). Formats register 'any' as fallback;
   the homes only make them appear naturally. F.OBJ.homes = {type: formats} (the table below, tests). */
OBJ.homeLast = -1e9;
OBJ.HOME_GAP = 90;                 // s between two home offers anywhere (homes are invitations, the engine paces the rest)
OBJ.homes = OBJ.homes || {};
OBJ.homeN = 0;
const fmtOK = f => !!(F.Task && F.Task.defs && F.Task.defs[f] && (!F.Task.resolveFormat || F.Task.resolveFormat(f)));
OBJ.homeFits = function (formats, place) {
  if (OBJ.homeOff) return null;
  const avail = (formats || []).filter(fmtOK);
  if (!avail.length || !F.LEARN || !F.LEARN.peek) return null;
  let pk = null;
  try { pk = F.LEARN.peek({ formats: avail, place, rng: F.rand, now: Date.now() }); } catch (e) { pk = null; }
  if (!pk || !pk.format) return null;
  const fid = F.Task.resolveFormat ? F.Task.resolveFormat(pk.format) : pk.format;
  return avail.includes(fid) || avail.includes(pk.format) ? avail : null;
};
// natural 11.10. (audit D3 #13/#21/#42 «toys never spring tasks»): her tap on a toy ALWAYS plays the toy. OBJ.home (called on the tap)
// only checks whether the home is due (its kind not done today, ≥ 90 s after the last home task, a format fits her level now) and then
// shows a visible INVITE – a small gold ★ note above the toy (F.OBJ.invite). Only a tap on that note opens the task; the toy keeps
// playing. Returns null (the caller plays its reaction). o.force: the old direct offer (scripted callers / tests).
OBJ.home = function (th, formats, o) {
  o = o || {};
  if (OBJ.homeOff || !th || !F.Task || !F.Task.offer || F.Task.current || (F.Onboard && F.Onboard.active)) return null;   // homeOff: tests that press every play variant
  if (F.Quest && (F.Quest.quiet ? F.Quest.quiet() : (F.Quest.canOfferTask && !F.Quest.canOfferTask()))) return null;
  if ((F.Befriend && F.Befriend.busy) || (F.Throne && F.Throne.busy) || (F.RQuest && F.RQuest.busy) || (F.Quest && F.Quest.stepRunning && F.Quest.stepRunning())) return null;
  const day = F.save.day || 1, HD = F.save.homeDays = F.save.homeDays || {}, key = o.key || th.type;
  if (!o.force && (HD[key] === day || F.T.now - OBJ.homeLast < OBJ.HOME_GAP)) return null;
  const place = o.place || (th.data && th.data.place) || null;
  const avail = OBJ.homeFits(formats, place); if (!avail) return null;
  if (o.force) return homeOffer(th, avail, o, place);
  OBJ.invite(th, { key, open: () => homeOffer(th, avail, o, place) });
  return null;
};
function homeOffer(th, avail, o, place) {
  const day = F.save.day || 1, HD = F.save.homeDays = F.save.homeDays || {};
  OBJ.homeLast = F.T.now; OBJ.homeN++; if (o.opened) try { o.opened(); } catch (e) { /* hook log */ }
  HD[o.key || th.type] = day; try { F.store && F.store(); } catch (e) { /* no store */ }
  const pr = offerAt(th, avail, Object.assign({ place, home: true }, o.ctx || {}));
  if (!o.after) return pr;
  // v5c WP-W2: the thing's PAYOFF – only when she solved it herself (A / B / after «Hjelp meg»), never after a rapid guess or a shown solution
  return pr.then(async res => { const it = lastTaskItem(); if (res && solvedSelf(res, it)) { try { await o.after(th, res, it); } catch (e) { console.error('[home] payoff', th.type, e); } } return res; });
}
OBJ.homeOffer = homeOffer;
/* the INVITE note (natural 11.10., audit D3): F.OBJ.invite(th, {key, open, delay}) -> bool. One note at a time: the newest toy she
   played with. It rises ~1.2 s after her tap (after the toy's own reaction), with the spot glow above the toy; a tap on the note walks
   her to the toy and runs spec.open() (the task). The note fades after OBJ.INVITE_S (25 s) unshown-tapped, when she is > 12 m away, when
   a task / encounter / ceremony starts, or in another space; an ignored note does not come back for that kind for 60 s.
   F.OBJ.inviteNow() -> {id, type, key, shown} | null;  F.OBJ.inviteTap() = her tap on the note (tests use the real DOM click). */
OBJ.INVITE_S = 25; OBJ.INVITE_R = 12;
const INV = OBJ._inv = { th: null, spec: null, t0: 0, until: 0, el: null, halo: null, ignored: {} };
const inviteBusy = () => !!(OBJ.hookBusy() || quietNow() || !F.Task || F.Task.current || (F.Befriend && F.Befriend.busy) || (F.Throne && F.Throne.busy) || (F.RQuest && F.RQuest.busy));
function dropInvite(ignored) {
  if (ignored && INV.spec && INV.spec.key) INV.ignored[INV.spec.key] = F.T.now;
  if (INV.el) INV.el.style.display = 'none';
  if (INV.halo) { try { F.BEH.util.killHalo(INV.halo); } catch (e) { /* gone */ } INV.halo = null; }
  INV.th = null; INV.spec = null;
}
// verify round 2: the note stays put while she plays among things of the SAME kind (rose beds, two chests): no jumping, no new halo or
// pling per tap. A shown note that she leaves for ANOTHER kind of toy counts as ignored (that kind rests 60 s), so it cannot hop
// back and forth between two toys.
OBJ.invite = function (th, spec) {
  if (!th || !spec || typeof spec.open !== 'function' || inviteBusy()) return false;
  if (spec.key && INV.ignored[spec.key] != null && F.T.now - INV.ignored[spec.key] < 60) return false;
  if (INV.th && INV.th !== th && INV.spec && spec.key && INV.spec.key === spec.key) return true;
  if (INV.th && INV.th !== th) dropInvite(F.T.now >= INV.t0);
  if (INV.th === th) { INV.until = F.T.now + OBJ.INVITE_S; return true; }
  INV.th = th; INV.spec = spec; INV.t0 = F.T.now + (spec.delay != null ? spec.delay : 1.2); INV.until = INV.t0 + OBJ.INVITE_S;
  F.emit('invite', th, spec.key);
  return true;
};
OBJ.inviteNow = () => (INV.th ? { id: INV.th.id, type: INV.th.type, key: INV.spec && INV.spec.key, shown: !!(INV.el && INV.el.style.display !== 'none') } : null);
OBJ.dropInvite = dropInvite;
function inviteEl() {
  if (INV.el) return INV.el;
  const el = INV.el = document.createElement('div');
  el.className = 'lifewish gold home-invite';
  el.innerHTML = '<div class="lw-dot">★</div>';
  el.style.display = 'none';
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => { e.stopPropagation(); OBJ.inviteTap(); });
  (document.getElementById('bubbles') || document.body).appendChild(el);
  return el;
}
OBJ.inviteTap = async function () {
  const th = INV.th, spec = INV.spec;
  if (!th || !spec || inviteBusy() || F.T.now < INV.t0) return null;
  dropInvite(false);
  F.sfx.pling && F.sfx.pling(9);
  F.emit('inviteTap', th, spec.key);
  // she flies to the toy first (the task sits at the thing), then the task opens there
  try {
    const P = F.Player, d = Math.hypot(th.x - P.pos.x, th.z - P.pos.z), r = (th.radius || 0.6) + 1.1;
    if (d > r + 1.5 && P.goTo) { const k = (d - r) / d; await P.goTo(P.pos.x + (th.x - P.pos.x) * k, P.pos.z + (th.z - P.pos.z) * k); }
  } catch (e) { /* stays */ }
  if (F.Task && F.Task.current) return null;
  // the toy is busy while its task + payoff run (a tap on it meanwhile does not start its play on top of the payoff)
  let res = null; th.busy = true;
  try { res = await spec.open(th); } catch (e) { console.error('[invite]', th.type, e); } finally { th.busy = false; }
  return res;
};
const _iv = new THREE.Vector3();
F.on('preRender', () => {
  if (!INV.th) return;
  const th = INV.th, P = F.Player.pos;
  const gone = !th.obj || th.hidden || th.space !== F.Space.cur || inviteBusy() || Math.hypot(th.x - P.x, th.z - P.z) > OBJ.INVITE_R;
  if (gone || F.T.now > INV.until) { dropInvite(F.T.now > INV.until || Math.hypot(th.x - P.x, th.z - P.z) > OBJ.INVITE_R); return; }
  const el = inviteEl();
  if (F.T.now < INV.t0 || th.busy) { el.style.display = 'none'; return; }
  if (!INV.halo) { try { const h = F.BEH.util.heightOf(th) / (th.obj.scale.y || 1); INV.halo = F.BEH.util.halo(th.obj, 'butter', U.clamp(h * 1.1, 1.1, 2.4), new THREE.Vector3(0, h * 0.7 + 0.2, 0)); F.sfx.pling && F.sfx.pling(7); } catch (e) { INV.halo = null; } }
  if (INV.halo) INV.halo.material.opacity = 0.3 + 0.18 * Math.sin(F.T.now * 2.4);
  _iv.copy(F.BEH.util.topOf(th, 1)); _iv.y += 0.35 + ((INV.spec && INV.spec.dy) || 0); _iv.project(F.R.camera);
  if (_iv.z > 1 || Math.abs(_iv.x) > 1.05 || Math.abs(_iv.y) > 1.05) { el.style.display = 'none'; return; }
  const r = F.R.renderer.domElement.getBoundingClientRect();
  const x = r.left + (_iv.x + 1) / 2 * r.width;
  let y = r.top + (1 - _iv.y) / 2 * r.height;
  // spec.avoid() -> a DOM label the note must never cover (the door's number plate): the note stays above it at any zoom
  if (INV.spec && INV.spec.avoid) { try { const a = INV.spec.avoid(); const q = a && a.isConnected ? a.getBoundingClientRect() : null; if (q && q.width > 0 && x > q.left - 40 && x < q.right + 40) y = Math.min(y, q.top - 8); } catch (e) { /* no plate */ } }
  y += Math.sin(F.T.now * 2.2) * 4;
  el.style.display = '';
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(0.8)`;
});
F.on('spaceChanged', () => dropInvite(false));
// guessing never pays: the payoff needs her own solution – A, or B / «Hjelp meg» only in a production task (g < 0.1, nothing to guess);
// never after a rapid guess (R) or a shown solution (C)
const solvedSelf = (res, item) => {
  const o4 = res && (res.out4 || res.outcome); if (!o4 || res.rapid) return false;
  if (o4 === 'A') return true;
  const g = item && item.g != null ? +item.g : (res.g != null ? +res.g : 0);
  return (o4 === 'B' || o4 === 'H') && g < 0.1;
};
const lastTaskItem = () => (F.Task && F.Task.lastResult && F.Task.lastResult.item) || {};
OBJ.solvedSelf = solvedSelf;

/* v5c WP-W2 (DESIGN5 §10, longevity_plan §3) – INTERACTION HOOKS: fun things that say one true thing, and a few that ask.
   F.OBJ.hook(th, key, run) -> Promise | null      kind X (exposure): asks nothing and REPLACES this tap's play variant (run(th), ≈ one
       clip). Once per key per day; at most OBJ.HOOK_MAX (8) exposure moments a day across the world (questions are paced apart); never while a task,
       an encounter, the throne ceremony, a royal quest, a quest step or the onboarding runs. null → the caller plays as before.
   F.OBJ.ask(th, key, formats, {place, after, ctx}) -> Promise<Result|null> | null   kind Q (question): a home offer (F.OBJ.home – the
       format is registered, F.LEARN.peek says it fits her level now, not in the play break, ≥ 90 s after the last home offer) at most
       once per key per day, with after(th, res, item) = the thing's payoff when she solved it herself.
   F.OBJ.factHook(th, sp, {vis, key}) the animal's own true sentence (F.THEMES through F.VIT.sayFact: counts the exposure, ≤ 3 new facts
       a day; two exposures on a day before make it a quiz key – teach first). vis = {factText|'*': [behaviour list]} (no line inside).
   F.OBJ.vitAsk(th, sp, {kinds, after}) a DUE recall about THIS animal (F82 «Faktakortet»; the key was taught ≥ 2× on an earlier day):
       «Hva spiser kua?» at the cow. Only kinds that are not visible on the spot (no «Hvor er kua?» in front of the cow).
   F.OBJ.trueLine(th, tpl|[tpl…], {vis, key}) a true sentence from knowledge_seed.json's concept decks (lines_obj.js hk_*; a list = one a
       day in turn; exposure key 'K:<tpl>').
   F.OBJ.wordHook(th, sp, {act}) the animal's tier-2 word / expression acted out (F.VIT.sayWord: ORD Or-T / Or-U exposure, ≤ 2 new a day).
   F.OBJ.animalX(th, sp, {vis, act}) an animal's daily moment: its fact on even days, its word / expression on odd days (one key a thing).
   F.OBJ.readSign(th, word, dy) a stall sign she reads herself (F.UI.tryRead, never spoken first).   F.OBJ.natCount(th, lo, hi) natural
       counts for heaps that are counted aloud (lo–hi in her lowest band, 10–20 once she works past 20).
   Payoffs (OBJ.home o.after / vitAsk o.after) need her own solution: A, or B / «Hjelp meg» in a production task (g < 0.1) – never R or C.
   Tests: F.OBJ.hookLog [{key, kind, day}], F.save.hooks {day, n, k}; F.OBJ.hookOff = true switches every hook off (press_world). */
OBJ.HOOK_MAX = 8;
// parent 11.10. («all animals say what they are eating … doesn't seem natural to a real game»): animals in the world never recite a
// fact or quiz her when tapped – they behave like animals. Their facts live on the album card (tap to hear). true = the v5c behaviour.
OBJ.animalTalk = false;
// natural 11.10. (audit D3 #1/#14/#53): objects never recite school facts either («Brød lages av korn.», «Stein synker.»); every hook's
// visible reaction stays as the thing's normal play (the flour sack, the sinking stone, the globe). true = the v5c behaviour.
OBJ.objTalk = false;
OBJ.hookLog = [];
function hookSt() { const d = F.save.day || 1; let H = F.save.hooks; if (!H || H.day !== d || !H.k) H = F.save.hooks = { day: d, n: 0, k: {} }; return H; }
OBJ.hookState = hookSt;
OBJ.hookBusy = () => !!((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy) || (F.Throne && F.Throne.busy) || (F.RQuest && F.RQuest.busy) ||
  (F.Quest && F.Quest.stepRunning && F.Quest.stepRunning()) || (F.Onboard && F.Onboard.active) || (F.Task && F.Task._series));
// the daily budget of 8 is for EXPOSURE moments (X); a question (Q, key 'Q:…') has its own pacing (once per key a day, ≥ 90 s after the
// last home offer) – so a morning of happy tapping never uses up the day's learning offers
OBJ.hookDue = key => { if (OBJ.hookOff || !key) return false; const H = hookSt(); return !H.k[key] && (/^Q:/.test(key) || H.n < OBJ.HOOK_MAX); };
function hookMark(key, kind) {
  const H = hookSt(); H.k[key] = 1; if (kind !== 'Q') H.n++;
  OBJ.hookLog.push({ key, kind, day: H.day, t: F.T.now }); if (OBJ.hookLog.length > 80) OBJ.hookLog.shift();
  try { F.store && F.store(); } catch (e) { /* no store */ }
}
OBJ.hook = function (th, key, run) {
  if (!th || !OBJ.hookDue(key) || OBJ.hookBusy()) return null;
  hookMark(key, 'X');
  th.lastReactAt = F.T.now || 1e-6; th.reactedVisibly = true;
  return Promise.resolve().then(() => run(th)).catch(e => console.error('[hook]', key, e));
};
const quietNow = () => !!(F.Quest && (F.Quest.quiet ? F.Quest.quiet() : (F.Quest.canOfferTask && !F.Quest.canOfferTask())));
OBJ.ask = function (th, key, formats, o) {
  o = o || {};
  if (!th || OBJ.hookOff || OBJ.homeOff || OBJ.hookBusy() || !OBJ.hookDue('Q:' + key)) return null;
  if (!(F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask())) return null;      // no offer now (play break / limit): the key stays for later
  // natural 11.10.: no task on her tap – a due question shows the gold ★ invite (OBJ.home); the hook counts once she opens it
  const h = OBJ.home(th, formats, Object.assign({}, o, { key: 'Q:' + key, daily: true, opened: () => hookMark('Q:' + key, 'Q') }));
  if (h) hookMark('Q:' + key, 'Q');
  return h;
};
// a due-day check for ask hooks lives in OBJ.home (o.daily: the first tap of the day on o.key only, no «every 4th» repeat)
// the fact to say: one she has heard once (the 2nd exposure makes it a quiz key), else a new keyed one within today's cap, else the
// facts in turn by day (spaced repeats are free practice) – never more than one fact per tap
function pickFact(facts) {
  const V = F.VIT, d = F.save.day || 1;
  let f = facts.find(x => x.key && V.known(x.key) === 1 && !V.gold(x.key)) || facts.find(x => x.key && !V.known(x.key) && V.canNew('f'));
  if (!f) { const pool = facts.filter(x => !x.gold); const L = pool.length ? pool : facts; f = L[d % L.length]; }
  return f;
}
OBJ.factHook = function (th, sp, o) {
  o = o || {};
  if (!F.VIT || !F.VIT.sayFact || !F.VIT.factsFor || !F.THEMES || !F.TPL.has('vit_fakta')) return null;
  let facts = []; try { facts = F.VIT.factsFor(sp) || []; } catch (e) { facts = []; }
  if (o.only) facts = facts.filter(f => o.only.includes(f.text));
  if (!facts.length) return null;
  return OBJ.hook(th, o.hookKey || ('fakta:' + (o.key || th.type)), async () => {
    const f = pickFact(facts), V = o.vis || {}, list = V[f.text] || V['*'];
    const pv = list ? F.BEH.runList(th, list, { noSurprise: true }) : null;
    await F.T.sleep(list ? 350 : 0);
    await F.VIT.sayFact(sp, f.text);
    if (pv) await pv;
    F.emit('hookFact', { thing: th.type, sp, text: f.text });
  });
};
// the animal's tier-2 word or expression (ORD Or-T / Or-U), acted out: «Se, den er rolig!» + «Den tar det med ro.» / «Vi sier: treg som
// en snegle!» + its meaning (F.VIT.sayWord: an exposure; ≤ 2 NEW words a day – over the cap a new word is not used, the caller falls back)
const WORD_ACT = {
  rolig: [['wobble', { part: 'head', axis: 'x', amp: 0.12, n: 2, ms: 2400 }]], glupsk: [['wobble', { amp: 0.22, n: 10, ms: 900 }]], ivrig: [['hop', { n: 3 }]],
  blid: [['hearts']], stolt: [['bounce', { h: 0.12 }]], forsiktig: [['wobble', { amp: 0.04, n: 2, ms: 1800 }]], modig: [['hop', { n: 1 }]],
  leken: [['hop', { n: 2 }], ['hearts']], treg: [['wobble', { amp: 0.04, n: 2, ms: 2800 }]], sjenert: [['wobble', { amp: 0.05, n: 3, ms: 1200 }]], sterk: [['bounce', { h: 0.2 }]], tålmodig: [['wobble', { amp: 0.05, n: 2, ms: 2600 }]],
};
OBJ.wordHook = function (th, sp, o) {
  if (!OBJ.animalTalk) return null;       // natural 11.10. (audit #15): no idiom lessons on taps – the kitten / the mouse just pop out
  o = o || {};
  if (!F.VIT || !F.VIT.wordFor || !F.VIT.sayWord || !F.VIT.known) return null;
  let wd = null; try { wd = F.VIT.wordFor(sp); } catch (e) { wd = null; }
  if (!wd || !F.TPL.has(wd.tpl) || !F.TPL.has(wd.mean)) return null;
  if (!F.VIT.known(wd.key) && !F.VIT.canNew('w')) return null;        // today's 2 new words are taken: a fact instead
  return OBJ.hook(th, o.hookKey || ('ord:' + (o.key || th.type)), async () => {
    const list = o.act || WORD_ACT[wd.kind === 'ord' ? wd.text : (wd.text.split(' ')[0])] || [['hearts']];
    const pv = F.BEH.runList(th, list, { noSurprise: true });
    await F.VIT.sayWord(sp, wd);
    await pv;
    F.emit('hookWord', { thing: th.type, sp, key: wd.key });
  });
};
// an animal's daily exposure: its true fact one day, its word / expression the next (one moment per thing a day, key 'dyr:<type>')
OBJ.animalX = function (th, sp, o) {
  if (!OBJ.animalTalk) return null;      // the thing plays its normal reaction
  o = o || {};
  const k = 'dyr:' + (o.key || th.type), f = () => OBJ.factHook(th, sp, Object.assign({}, o, { hookKey: k })), w = () => OBJ.wordHook(th, sp, { hookKey: k, act: o.act });
  return ((F.save.day || 1) % 2) ? OBJ.firstHook(w, f) : OBJ.firstHook(f, w);
};
OBJ.vitAsk = function (th, sp, o) {
  if (!OBJ.animalTalk) return null;
  o = o || {};
  if (!th || OBJ.hookOff || OBJ.homeOff || !F.VIT || !F.VIT.isDue || !F.LEARN || !F.LEARN.next || !F.Task || !F.Task.run || !fmtOK('F82')) return null;
  if (OBJ.hookBusy() || quietNow() || !(F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask())) return null;
  const hk = 'Q:vit:' + (o.key || th.type); if (!OBJ.hookDue(hk) || F.T.now - OBJ.homeLast < OBJ.HOME_GAP) return null;
  const keys = (o.kinds || ['mat', 'unge']).map(k => 'VIT:' + k + ':' + sp).filter(k => { try { return F.VIT.isDue(k); } catch (e) { return false; } });
  if (!keys.length) return null;
  let item = null;
  for (let i = 0; i < 4 && !item; i++) {
    let it = null; try { it = F.LEARN.next({ formats: ['F82'], prefer: keys, place: 'dyr', rng: F.rand, now: Date.now() }); } catch (e) { it = null; }
    if (it && keys.includes(it.key)) item = it;
  }
  if (!item) return null;
  hookMark(hk, 'Q'); OBJ.homeLast = F.T.now; OBJ.homeN++;
  th.lastReactAt = F.T.now || 1e-6; th.reactedVisibly = true;
  F.FX.sparkle(F.BEH.util.topOf(th, 1)); F.sfx.magic && F.sfx.magic();
  F.BEH.offers = (F.BEH.offers || 0) + 1;
  return F.Task.run(item, { thing: th, place: 'dyr', home: true }).then(async res => {
    if (res && solvedSelf(res, item) && o.after) { try { await o.after(th, res, item); } catch (e) { console.error('[vitAsk] payoff', th.type, e); } }
    return res;
  }).catch(e => { console.error('[vitAsk]', th.type, e); return null; });
};
OBJ.trueLine = function (th, tpl, o) {
  if (!OBJ.objTalk) return null;          // the thing plays its normal reaction
  o = o || {};
  const L = [].concat(tpl).filter(t => F.TPL.has(t)); if (!L.length) return null;
  const k0 = o.key || L[0]; tpl = L[(F.save.day || 1) % L.length];     // a list: one sentence a day, in turn
  return OBJ.hook(th, 'sann:' + k0, async () => {
    const pv = o.vis ? F.BEH.runList(th, o.vis, { noSurprise: true }) : null;
    try { if (F.VIT && F.VIT.expose) F.VIT.expose('K:' + tpl); } catch (e) { /* no VIT */ }
    await F.T.sleep(o.vis ? 300 : 0);
    await F.SAY(tpl);
    if (pv) await pv;
  });
};
// a thing's hook chain: the first non-null of the given hook calls (each returns Promise | null)
OBJ.firstHook = (...fns) => { for (const fn of fns) { let h = null; try { h = fn(); } catch (e) { console.error('[hook] chain', e); } if (h) return h; } return null; };
// v3 WP5 §9.9: a learning spot during the play break – the hourglass sparkles and Puff says when it opens again (no task, no dead tap)
const HOURGLASS = '<svg viewBox="0 0 40 52" width="40" height="52" style="display:block"><path d="M8 4 H32 M8 48 H32" stroke="#b98a45" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M11 6 C11 20 20 22 20 26 C20 30 11 32 11 46 H29 C29 32 20 30 20 26 C20 22 29 20 29 6 Z" fill="#fff6dc" stroke="#b98a45" stroke-width="2.5"/>' +
  '<path d="M14 12 H26 C24 19 20 21 20 24 C20 21 16 19 14 12 Z M13 44 C14 37 18 35 20 34 C22 35 26 37 27 44 Z" fill="#f5c542"/></svg>';
async function laterLock(th, line) {
  try { F.UI.bubbleAt(th, HOURGLASS, 2600); } catch (e) { /* no bubble */ }
  F.FX.sparkle(F.BEH.util.topOf(th, 1)); F.sfx.chime && F.sfx.chime();
  F.emit('spotLater', th);
  await F.BEH.run(th, 'wobble', { amp: 0.06, n: 3 });
  if (F.TPL.has(line)) await F.SAYF(line);
}
const inBreak = () => !!(F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask());
OBJ.laterLock = laterLock;
async function knock(th, wish) {
  // v5 WP-W (logic #5): the resident's name decides the voice at the door (never a woman's name with a man's voice)
  const res = th.data.resident, voice = th.data.voice || (res && F.Act && F.Act.FEMALE ? (F.Act.FEMALE.has(res) ? 'vk' : 'vm') : ['vm', 'vk', 'barn'][hashOf(th) % 3]);
  for (let i = 0; i < 3; i++) { F.sfx.thud(); F.BEH.util.anim(th.obj, 120, (k, b) => { th.obj.position.z = b.p.z + Math.sin(k * Math.PI) * 0.02; }); await F.T.sleep(220); }
  await F.T.sleep(300);
  const door = th.parts.door, vil = th.parts.villager;
  if (door) { F.sfx.door(); await F.BEH.util.tweenRest(door, 'rotation', 'y', (door.userData._r0 = door.userData._r0 != null ? door.userData._r0 : door.rotation.y) - 1.7, 500, F.BEH.util.ease.out); }
  let tmp = null;
  if (!vil) { tmp = F.VOX.make('o_nabo', th.modelOpts || {}); tmp.position.set(0, 0, -0.06); th.obj.add(tmp); }
  const who = vil || tmp;
  who.visible = true; F.BEH.util.anim(who, 2600, (k, b) => { who.rotation.z = b.r.z + Math.sin(k * Math.PI * 6) * 0.06; });
  await F.SAY('obj_dor_hei', null, voice);
  const variant = (th._kn = (th._kn || 0) + 1) % 2;
  if (variant === 1) { await F.SAY('obj_dor_kjeks', null, voice); await F.BEH.run(th, 'pop', { model: ['kjeks', 'o_kjeks'], size: 0.18, life: 3500 }); }
  else { await F.BEH.run(th, 'hearts', {}); if (!wish) F.SAYF('obj_dor_vink', null, voice); }
  // natural 11.10.: a wish in the villager's own voice + the gold ★ note at the door (she chooses; the knock itself never starts a task)
  // (verify round 2: the wish counts as the day's door wish as soon as it is SAID – an ignored wish is never said again that day; the
  // note sits higher than usual so it never covers the door's number plate)
  if (wish && F.TPL.has(wish.tpl) && canTask()) {
    (F.save.homeDays = F.save.homeDays || {}).v_husdor = F.save.day || 1; try { F.store && F.store(); } catch (e) { /* no store */ }
    await F.SAY(wish.tpl, null, voice);
    OBJ.invite(th, { key: 'v_husdor', delay: 0, dy: th.data.label === true ? 0.75 : 0, avoid: () => ((th._labels || [])[0] || {}).el, open: wish.open });
  }
  await F.T.sleep(600);
  if (vil) vil.visible = false; if (tmp) th.obj.remove(tmp);
  if (door) { await F.BEH.util.tweenRest(door, 'rotation', 'y', door.userData._r0, 500); F.sfx.door(); }
}
/* ---- #152 market stall (opens a shop if LIFE provides one) */
T('v_markedsbod', { name: 'boden', models: ['v_markedsbod', 'o_markedsbod'], needs: ['awning'], radius: 1.3, reach: 2.6, biomes: { Landsby: 2 },
  press: async th => {
    F.emit('stallPressed', th);
    if (th.data.shop && F.Shop && F.Shop.open && F.SHOPS && F.SHOPS[th.data.shop]) { await F.BEH.react(th, [['ring', { n: 2, f: 1320 }]], { noSurprise: true }); return F.Shop.open(th.data.shop, { thing: th }); }
    return F.BEH.react(th, [['ring', { n: 2, f: 1320 }], ['bounce', { part: 'goods', h: 0.15, n: 2 }], ['wobble', { part: 'awning', axis: 'x', amp: 0.08 }], say('obj_markedsbod')]);
  } });
/* ---- #153 bridge: a stick floats under, a fish jumps */
// v5c WP-W2 (hook #18, materials deck): the stick floats («Tre flyter.»), every other tap a stone sinks («Stein synker.») – exposure only,
// never a «flyter eller synker?» guess
T('v_bro', { home: ['F44'], homePlace: 'bro', name: 'broen', models: ['v_bro', 'o_bro'], radius: 0.8, solid: false, reach: 3, water: true, biomes: { Innsjø: 2 },
  hook: th => OBJ.trueLine(th, 'hk_tre_flyter', { vis: [stickRace] }),
  press: th => { th._bro = (th._bro || 0) + 1; return F.BEH.react(th, th._bro % 2 === 0 ? [stoneSink] : [stickRace, say('obj_bro')]); } });
async function stoneSink(th) {
  const U2 = F.BEH.util, s = U2.spawnModel(th, ['n_stein', 'o_snoball'], { size: 0.28, opts: { c: 'stone' } });
  const c = U2.baseOf(th), cs = Math.cos(th.ry), sn = Math.sin(th.ry);
  const p0 = new THREE.Vector3(c.x + sn * 0.9, c.y + 0.6, c.z + cs * 0.9); s.position.copy(p0);
  F.sfx.whoosh();
  await F.T.tween(450, k => { s.position.y = p0.y - k * 0.75; s.rotation.x = k * 2; });
  F.sfx.splash(); F.FX.ring(s.position.clone(), 0xffffff); U2.burst(s.position.clone(), 'water', { n: 14 });
  await F.T.tween(1400, k => { s.position.y = p0.y - 0.75 - k * 0.7; s.scale.setScalar(Math.max(0.01, s.scale.x * (1 - k * 0.04))); });
  if (s.parent) s.parent.remove(s);
}
async function stickRace(th) {
  const U2 = F.BEH.util, s = U2.spawnModel(th, ['pinne', 'o_pinne'], { size: 0.5 });
  const c = U2.baseOf(th), cs = Math.cos(th.ry), sn = Math.sin(th.ry);
  const p0 = new THREE.Vector3(c.x - sn * -0.9, c.y + 0.6, c.z - cs * 0.9); s.position.copy(p0);
  F.sfx.whoosh();
  await F.T.tween(500, k => { s.position.y = p0.y - k * 0.75; s.rotation.z = k * 2; });
  F.sfx.splash(); F.FX.ring(s.position.clone(), 0xffffff);
  await F.T.tween(2200, k => { s.position.set(p0.x + sn * 2.2 * k, p0.y - 0.75 + Math.sin(k * 20) * 0.02, p0.z + cs * 2.2 * k); s.rotation.y = k * 1.5; });
  U2.removeLater(s, 200, true);
  const f = U2.spawnModel(th, ['fisk', 'o_fisk'], { size: 0.35 }); const f0 = new THREE.Vector3(c.x + 1.2, c.y - 0.1, c.z + 0.6);
  F.sfx.splash();
  await F.T.tween(900, k => { f.position.set(f0.x - k * 1.0, f0.y + Math.sin(k * Math.PI) * 1.4, f0.z); f.rotation.x = -Math.PI / 2 + k * Math.PI; });
  F.sfx.splash(); U2.burst(f.position.clone(), 'water', { n: 20 }); if (f.parent) f.parent.remove(f);
}
/* ---- #154 gate */
T('v_grind', { home: ['F47'], homePlace: 'hage', name: 'grinden', models: ['v_grind', 'o_grind'], needs: ['gate'], radius: 0.5, biomes: { Gårdsland: 2, Landsby: 1, Frukthage: 1 },
  play: [[['open', { part: 'gate', axis: 'y', angle: -1.6, stay: true, sound: 'creak' }], ['sound', { name: 'squeak' }]]] });
/* ---- #155 wind chime */
T('v_vindspill', { name: 'vindspillet', models: ['v_vindspill', 'o_vindspill'], radius: 0.35, solid: false, biomes: { Landsby: 2, Strand: 1, Vindmølleåsene: 1 },
  tick(th, dt, t) { for (let i = 0; i < 5; i++) { const p = th.parts['t' + i]; if (p && !p.userData._an) p.rotation.x = Math.sin(t * 1.7 + i) * 0.05; } },
  play: [
    [['note', { parts: ['t0', 't1', 't2', 't3', 't4'], scale: 'penta', inst: 'bell', n: 5, gap: 140, oct: 24 }], ['swing', { part: 't2', axis: 'x', amp: 0.4, n: 4, ms: 1400, sound: 'chime' }], say('obj_vindspill')],
    [['swing', { part: 't0', axis: 'z', amp: 0.5, n: 4, ms: 1200, sound: 'chime', bg: true }], ['swing', { part: 't3', axis: 'x', amp: 0.5, n: 4, ms: 1300, sound: 'chime' }], say('obj_vindspill_2')],
  ] });
/* ---- #156 picnic */
T('v_piknik', { name: 'pikniken', models: ['v_piknik', 'o_piknik'], needs: ['pot'], radius: 1.2, solid: false, biomes: { Blomstereng: 3, Frukthage: 1, Innsjø: 1 },
  play: [
    [['pour', { part: 'pot', axis: 'z', angle: -0.7, ms: 1500, fx: 'honey' }], ['bounce', { part: 'cup1', h: 0.12, sound: 'pling' }], ['ring', { n: 2, f: 1760, part: 'cup2' }], say('obj_piknik')],
    [['steam', { fx: 'heart', n: 4 }], ['bounce', { part: 'cup2', h: 0.12 }], say('obj_piknik_2')],
  ] });
/* ---- #157 hot-air balloon */
T('v_luftballong', { name: 'luftballongen', models: ['v_luftballong', 'o_luftballong'], radius: 1.2, reach: 3, biomes: { Blomstereng: 1, Vindmølleåsene: 1, Gårdsland: 1 },
  tick(th, dt, t) { if (!th.obj.userData._an) th.obj.position.y = th.y + Math.sin(t * 0.9 + th.t0) * 0.08; },
  play: [
    [['ride', { mode: 'line', dz: 0, dyLine: 7, ms: 7000, sound: 'whoosh', seatY: 0.05, with: ['view', { dist: 62, ms: 6000 }] }], say('obj_luftballong')],
    [['glow', { color: 'flame', y: 0.2 }], ['bounce', { h: 0.4 }], say('obj_luftballong_2')],
  ] });
/* ---- #158 power spot (F07; dormant: a fairy-style flourish) */
T('n_tryllepunkt', { name: 'tryllepunktet', models: ['n_tryllepunkt', 'o_tryllepunkt'], radius: 1.0, solid: false, spot: true, twinkle: false, learn: ['F07', 'F06', 'F09', 'F43'], biomes: { Innsjø: 2, Blomstereng: 1, Snøhaugen: 1, Strand: 1, Vindmølleåsene: 1 },
  init(th) { th._halo = F.BEH.util.halo(th.obj, 'lilac', 2.6, new THREE.Vector3(0, 0.5, 0)); try { buildPatch(th, false); } catch (e) { console.error('tryllepunkt patch', e); } try { if (th.state.cross) growCross(th, true); } catch (e) { console.error('tryllepunkt crossing', e); } },
  dispose(th) { th._gone = true; if (th._cross) { try { th._cross.remove(); } catch (e) { /* already gone */ } th._cross = null; } },
  tick(th, dt, t) { const r = th.parts.ring; if (r) r.rotation.y += dt * 0.6; if (th._halo) th._halo.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.25; if ((th._sp = (th._sp || 0) + dt) > 1.4 && th.space === F.Space.cur) { th._sp = 0; F.FX.sparkle(new THREE.Vector3(th.x + (Math.random() - .5) * 1.6, th.obj.position.y + 0.3, th.z + (Math.random() - .5) * 1.6), 0xfff2a8); } },
  play: [[fairyFlourish, say('obj_tryllepunkt')]],
  after: th => {
    // w3 review: what she made with her fairy power stays – a growing patch (4 per solved task, max 12) of crystals / flowers, saved in th.state.patch
    try { const st = th.state.patch || { n: 0, k: F.save.fairy || 'krystall' }; F.Things.setState(th, { patch: { n: Math.min(12, (st.n || 0) + 4), k: st.k } }); buildPatch(th, true); } catch (e) { console.error('tryllepunkt patch', e); }
    // v2 fix (parent): her fairy power builds a REAL, lasting, walkable crossing made of her own fairy's pieces (F.Fairy.grow):
    // krystall = crystal bridge, blomst = flower lily pads, boble = bubble path, stjerne = star bridge. Lake spots: to the islet
    // (data.bridge from worldgen); land spots: a short fairy path in a free direction. Saved in th.state.cross, rebuilt instantly on load.
    // (Saves from before this fix that already have th.state.bridged keep their old w_bridge thing.)
    try {
      if (!th.state.bridged && !th.state.cross) {
        const seg = crossSeg(th);
        if (seg) { F.Things.setState(th, { cross: Object.assign({ k: F.save.fairy || 'krystall' }, seg) }); growCross(th, false); if (F.sfx.magic) F.sfx.magic(); }
      }
    } catch (e) { console.error('tryllepunkt crossing', e); }
    return F.BEH.runList(th, [fairyFlourish, ['fx', { kind: 'confetti', n: 50 }]], { noSurprise: true });
  } });
/* the crossing segment: lake spot -> its islet (worldgen data.bridge); land spot -> 6 m fairy path in the first free direction (or null) */
function crossSeg(th) {
  const b = th.data && th.data.bridge;
  if (b) return { ax: b.ax, az: b.az, bx: b.bx, bz: b.bz, lake: 1 };
  const W = F.W; if (th.space !== 'out' || !W || !W.blocked) return null;
  const a0 = (hashOf(th) % 8) * Math.PI / 4, D0 = 2.4, D1 = 8.4;
  for (let k = 0; k < 8; k++) {
    const a = a0 + k * Math.PI / 4, dx = Math.sin(a), dz = Math.cos(a);
    let ok = true;
    for (let d = D0; d <= D1 + 0.01 && ok; d += 0.5) {
      const x = th.x + dx * d, z = th.z + dz * d;
      if (W.blocked(x, z, 0.9, th) || (W.deep && W.deep(x, z)) || (W.inReserved && W.inReserved(x, z, 0))) ok = false;
    }
    if (ok) return { ax: +(th.x + dx * D0).toFixed(2), az: +(th.z + dz * D0).toFixed(2), bx: +(th.x + dx * D1).toFixed(2), bz: +(th.z + dz * D1).toFixed(2) };
  }
  return null;
}
function growCross(th, instant) {
  const c = th.state.cross; if (!c || th._cross || th._crossP || !F.Fairy || !F.Fairy.grow) return;
  const kind = (F.Fairy.kinds || []).includes(c.k) ? c.k : 'krystall';
  // lily pads and bubbles float ON the lake (the bridges keep F.Fairy.grow's own deck height)
  const wy = F.W && F.W.WATER != null ? F.W.WATER : -0.25, y = c.lake && (kind === 'blomst' || kind === 'boble') ? wy + (kind === 'boble' ? 0.1 : 0.02) : undefined;
  th._crossP = F.Fairy.grow(kind, { from: { x: c.ax, z: c.az }, to: { x: c.bx, z: c.bz }, y, instant: !!instant, space: th.space || 'out' }).then(res => {
    th._crossP = null;
    if (th._gone) { res.remove(); return; }
    th._cross = res;
    if (!instant && F.FX && F.FX.burst) F.FX.burst(new THREE.Vector3(c.bx, (F.W ? F.W.groundY(c.bx, c.bz) : 0) + 0.6, c.bz), { kind: 'heart', n: 12, up: 2, speed: 1 });
  }).catch(e => { th._crossP = null; console.error('tryllepunkt crossing', e); });
}
const PATCH_MODELS = { krystall: ['krystall', 'o_krystall', 'wd_icespike'], blomst: ['o_blomst', 'wd_flowers'] };
const PATCH_COLS = ['blossom', 'butter', 'lilac', 'pink', 'coral', 'white'];
function buildPatch(th, grow) {
  const st = th.state && th.state.patch; if (!st || !st.n || !th.obj) return;
  const id = (PATCH_MODELS[st.k] || ['wd_flowers']).find(m => F.VOX.has(m)); if (!id) return;
  if (!th._patch) { th._patch = new THREE.Group(); th._patch.name = 'patch'; th.obj.add(th._patch); }
  const g = th._patch, c = Math.cos(th.ry || 0), s = Math.sin(th.ry || 0);
  for (let i = g.children.length, j = 0; i < Math.min(12, st.n); i++, j++) {
    const a = i * 2.39996 + 0.4, r = 1.5 + (i % 3) * 0.32, lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    let gy = 0; try { gy = U.clamp(F.Space.impl[th.space || 'out'].heightAt(th.x + lx * c + lz * s, th.z - lx * s + lz * c) - th.y, -0.4, 0.4); } catch (e) {}
    let m; try { m = F.VOX.make(id, id === 'wd_flowers' ? { cs: [PATCH_COLS[i % PATCH_COLS.length], 'white', 'butter'] } : {}); } catch (e) { continue; }
    const b = new THREE.Box3().setFromObject(m), h = Math.max(b.max.y - b.min.y, b.max.x - b.min.x, b.max.z - b.min.z) || 0.4, sc = 0.6 / h;
    m.position.set(lx, gy, lz); m.rotation.y = a * 3; m.scale.setScalar(grow ? 0.01 : sc); g.add(m);
    if (grow) F.T.timeout(() => F.T.tween(600, k => m.scale.setScalar(sc * Math.max(0.01, F.BEH.util.ease.back(k)))), 400 + j * 180);
  }
  th.bboxDirty = true;
}
async function fairyFlourish(th) {
  const k = F.save.fairy || 'krystall';
  if (k === 'krystall') { F.sfx.crystal(); await F.BEH.run(th, 'pop', { model: ['krystall', 'o_krystall'], n: 3, size: 0.35, life: 3000, sound: 'crystal' }); }
  else if (k === 'blomst') { await F.BEH.run(th, 'pop', { model: 'o_blomst', n: 4, size: 0.4, life: 4000, sound: 'grow' }); }
  else if (k === 'boble') { for (let i = 0; i < 4; i++) { F.BEH.util.burst(F.BEH.util.topOf(th, 1).add(new THREE.Vector3(0, 0.4, 0)), 'bubble', { n: 8, gravity: -1.2, up: 1.4, speed: 0.6, size: 0.14, life: 1.6 }); F.sfx.pop(); await F.T.sleep(200); } }
  else await F.BEH.run(th, 'light', { n: 6, color: 'butter', hold: 1000 });
  await F.BEH.run(th, 'spin', { part: 'ring', turns: 1, ms: 900, sound: 'magic' });
}
/* ---- #159 treasure chest (F14 number lock / F35 word lock) */
T('v_skattkiste', { name: 'skattkista', models: ['v_skattkiste', 'o_skattkiste'], needs: ['lid'], radius: 0.6, spot: true, learn: ['F14', 'F16'], biomes: { Strand: 2, Innsjø: 1, Snøhaugen: 1, Vindmølleåsene: 1, Landsby: 1 },
  opts: th => ({ lock: th.data.lock || (hashOf(th) % 2 ? 'word' : 'num') }),
  press: th => {
    if (th.state.opened) return F.BEH.react(th, [['open', { part: 'lid', axis: 'x', angle: -1.9, hold: 1200, sound: 'creak' }], ['sparkle', { color: 'gold' }], say('obj_skattkiste')]);
    const formats = th.modelOpts.lock === 'word' ? ['F35'] : ['F14'];
    if (inBreak() && !F.Task.current) return laterLock(th, 'obj_las_senere');
    return F.BEH.learnOrPlay(th, formats, [['wobble', { part: 'lid', axis: 'x', amp: 0.12, n: 6, sound: 'thud' }], say('obj_skattkiste_lukket')], async (t, res) => {
      F.Things.setState(t, { opened: true });
      await F.BEH.runList(t, [['open', { part: 'lid', axis: 'x', angle: -1.9, hold: 1800, sound: 'creak' }], ['fx', { kind: 'gold', n: 40 }], ['coin']], { noSurprise: true });
    });
  } });
/* ---- #160 lost thing (quest 13): pick it up → owner can be found */
const LOST = [['nøkkel', 'o_nokkel'], ['vott', 'o_votte'], ['ring', 'o_ring'], ['bamse'], ['ball'], ['hatt'], ['sko']];
T('n_taptting', { name: 'den tapte tingen', models: ['o_nokkel'], radius: 0.35, solid: false, spot: true, twinkle: false, learn: ['F23'], biomes: { Blomstereng: 1, Gårdsland: 1, Landsby: 1, Strand: 1, Frukthage: 1, Innsjø: 1, Lavendelåker: 1, Vindmølleåsene: 1, Snøhaugen: 1 },
  decorate(th, obj) {
    if (th.data.item && F.VOX.has(th.data.item)) { obj.clear(); const m = F.VOX.make(th.data.item); obj.add(m); th.itemModel = th.data.item; }
    else { const cand = LOST[hashOf(th) % LOST.length]; const id = cand.find(x => F.VOX.has(x)) || 'o_nokkel'; obj.clear(); const m = F.VOX.make(id); obj.add(m); th.itemModel = id; }
    const b = new THREE.Box3().setFromObject(obj), h = Math.max(b.max.y - b.min.y, b.max.x - b.min.x, b.max.z - b.min.z) || 0.3; if (h > 0.45) obj.children[0].scale.setScalar(0.45 / h);
  },
  init(th) { if (th.state.found) { th.obj.visible = false; th.hidden = true; } else th._halo = F.BEH.util.halo(th.obj, 'glowYellow', 0.9, new THREE.Vector3(0, 0.2, 0)); },
  tick(th, dt, t) { if (th.hidden) return; th.obj.rotation.y += dt * 0.8; if (th._halo) th._halo.material.opacity = 0.5 + Math.sin(t * 3) * 0.3; },
  press: th => {
    if (th.state.found) return F.BEH.react(th, [['sparkle']]);
    if (F.Quest && typeof F.Quest.lostItem === 'function') { try { const r = F.Quest.lostItem(th); if (r) return r; } catch (e) { console.error(e); } }
    return F.BEH.learnOrPlay(th, ['F23'], [pickUp, say('obj_taptting')], th2 => pickUp(th2));
  } });
async function pickUp(th) {
  F.sfx.chime(); F.FX.sparkle(F.BEH.util.topOf(th, 1));
  const o = th.obj, p0 = o.position.clone();
  await F.T.tween(700, k => { const P = F.Player.obj.position; o.position.set(p0.x + (P.x - p0.x) * k, p0.y + Math.sin(k * Math.PI) * 1.2 + (P.y + 1 - p0.y) * k, p0.z + (P.z - p0.z) * k); o.scale.setScalar(Math.max(0.05, 1 - k * 0.8)); });
  o.visible = false; th.hidden = true; o.position.copy(p0); o.scale.setScalar(1);
  F.Things.setState(th, { found: true, foundDay: F.save.day || 1 });
  if (F.Quest && F.Quest.log) try { F.Quest.log('lostFound', { thing: th.id, item: th.itemModel }); } catch (e) {}
  F.emit('lostFound', th, th.itemModel);
}
/* ---- #161 fallen house-number plate (F15) */
T('v_tallstolpe', { name: 'husnummeret', models: ['o_tallstolpe'], radius: 0.45, spot: true, learn: ['F15', 'F14', 'F16'], biomes: { Landsby: 3 },
  init(th) { th.data.num = postNum(th); applyPlate(th, false); },
  press: async th => {
    if (inBreak() && !F.Task.current) return laterLock(th, 'obj_tall_senere');
    if (th.state.fixed) {
      // v3 WP5 §9.4: the post ASKS (a number task, this number preferred); its number is said only AFTER her answer
      const n = th.data.num, prefer = ['T-NAVN:' + n, 'T-SKRIV:' + n];
      const res = await offerAt(th, ['F03', 'F15', 'F02'], { place: 'village', houseNum: n, prefer }, prefer);
      if (res) { await F.BEH.react(th, [['wobble', { part: 'plate', axis: 'z', amp: 0.15, sound: 'pling' }], ['say', { tpl: 'obj_tallstolpe_nr', slots: { n }, queue: true }]], { noSurprise: true }); return res; }
      return F.BEH.react(th, [['wobble', { part: 'plate', axis: 'z', amp: 0.15, sound: 'pling' }], ['sparkle']]);
    }
    return F.BEH.learnOrPlay(th, ['F15'], [['wobble', { part: 'plate', axis: 'x', amp: 0.1, sound: 'thud' }], ['sparkle'], say('obj_tallstolpe')], fixPlate);
  } });
// v5 WP-W #29 + DESIGN4 §8: a fallen plate belongs to a GAP of its street (a number with no house yet; else just past the street's
// end) – never a duplicate of a real door or of another post of the same village. Kept in the thing's saved state.
function postNum(th) {
  if (th.state && th.state.num != null) return th.state.num;
  let num = null;
  try {
    const vs = (F.W && F.W.villages ? F.W.villages({ x: th.x, z: th.z }, 140) || [] : []).filter(v => v.numLo != null)
      .sort((a, b) => Math.hypot(a.x - th.x, a.z - th.z) - Math.hypot(b.x - th.x, b.z - th.z));
    const v = vs[0] && Math.hypot(vs[0].x - th.x, vs[0].z - th.z) < 110 ? vs[0] : null;
    if (v) {
      const taken = new Set(v.houses.map(h => +h.num));
      F.Things.list.forEach(t => { if (t !== th && t.type === 'v_tallstolpe' && t.data && t.data.vil === v.regionId && t.data.num != null) taken.add(+t.data.num); });
      const pool = (v.gaps || []).concat([1, 2, 3, 4].map(k => v.numHi + k)).filter(n => !taken.has(n) && n <= 60);   // HOUSE_NUMS clips 1–60
      // many posts in one village: the next free numbers around the street (still never a door, never a twin, within the 1–60 clips)
      if (!pool.length) for (let k = Math.max(1, v.numLo - 12); k <= Math.min(60, v.numHi + 12); k++) if (!taken.has(k)) pool.push(k);
      if (pool.length) num = pool[hashOf(th) % pool.length];
      th.data.vil = v.regionId;
    }
  } catch (e) { num = null; }
  if (num == null) num = 1 + hashOf(th) % 40;
  try { F.Things.setState(th, { num }); } catch (e) { /* no state */ }
  return num;
}
function applyPlate(th, animate) {
  const p = th.parts.plate; if (!p) return Promise.resolve();
  const up = !!th.state.fixed;
  if (!animate) { p.rotation.x = up ? -Math.PI / 2 : 0; p.position.y = (up ? 0.72 : 1 / 16); p.position.z = up ? 0.12 - 3 / 16 : (5 - 8) / 16; if (up) addPlateLabel(th); return Promise.resolve(); }
  const y0 = p.position.y, z0 = p.position.z;
  return F.T.tween(900, k => { const e = F.BEH.util.ease.back(k); p.rotation.x = -Math.PI / 2 * e; p.position.y = y0 + (0.72 - y0) * e + Math.sin(k * Math.PI) * 0.3; p.position.z = z0 + (0.12 - 3 / 16 - z0) * k; }).then(() => addPlateLabel(th));
}
function addPlateLabel(th) { if (th._plateLabel) return; const a = new THREE.Object3D(); a.position.set(0, 0.95, 0.15); th.obj.add(a); th._plateLabel = label(th, a, String(th.data.num), { kind: 'num' }); }
async function fixPlate(th) {
  F.Things.setState(th, { fixed: true });
  F.sfx.whoosh(); await applyPlate(th, true); F.sfx.tada(); F.FX.sparkle(F.BEH.util.topOf(th, 1));
  await F.SAY('obj_tallstolpe_nr', { n: th.data.num });
}

/* =================================================================== EXTRAS (invented variety) */
retire('n_sommerfugler', 'sommerfugl');
retire('n_frosk', 'frosk');
retire('n_ender', 'and');
retire('n_kanin', 'kanin');
T('v_tregynge', { name: 'gynga', models: ['o_tregynge'], radius: 0.6, reach: 3.2, ext: true, biomes: { Blomstereng: 1, Frukthage: 2, Landsby: 1 },
  play: [[['ride', { mode: 'part', part: 'seat', ms: 3600, dy: -1.5, with: ['swing', { part: 'seat', axis: 'x', amp: 0.75, n: 4 }] }], say('obj_tregynge')]] });
/* v5c WP-W2 (hook #25, MØNSTER): the washing line is a home of F58 «Perlemakeren» – once a day, at her level, not in the play break.
   Payoff when she made the pattern herself: the clothes on the line hang in HER pattern (same structure, clothes instead of beads)
   and stay there (th.state.hung) until she makes the next one. */
const HANG_COLS = ['pink', 'sky', 'butter', 'mint', 'lilac', 'coral'];
function hangBuild(th, cols, animate) {
  if (th._hung) { th.obj.remove(th._hung); th._hung = null; }
  if (!cols || !cols.length) return;
  const g = new THREE.Group(); g.name = 'hung'; th._hung = g;
  const sy = th.obj.scale.y || 1, h = F.BEH.util.heightOf(th) / sy * 0.6, n = cols.length, w = 1.5 / sy;
  cols.forEach((c, i) => {
    const b = F.M.builder(); const kind = i % 2;
    if (kind) { b.box(0.16, 0.2, 0.03, c, 0, -0.1, 0); b.box(0.26, 0.06, 0.03, c, 0, -0.03, 0); } else { b.box(0.18, 0.22, 0.03, c, 0, -0.11, 0); }
    const m = b.group; m.scale.setScalar(1 / sy); m.position.set(-w / 2 + (i + 0.5) * w / n, h, 0.12 / sy); g.add(m);
    if (animate) { m.scale.setScalar(0.01); F.T.timeout(() => { F.sfx.pling && F.sfx.pling(i % 8); F.T.tween(260, k => m.scale.setScalar(Math.max(0.01, F.BEH.util.ease.back(k) / sy))); }, 260 * i); }
  });
  g.traverse(o => { o.userData.thing = th; });
  th.obj.add(g); th.bboxDirty = true;
}
async function hangPattern(th, res, item) {
  const p = (item && item.params) || {};
  const seq = [].concat(p.shown || [], Array.isArray(item.target) ? item.target : []).slice(0, 9);
  if (seq.length < 3) return F.BEH.runList(th, [['hearts']], { noSurprise: true });
  const map = new Map(), key = t => (t && typeof t === 'object') ? JSON.stringify(t) : String(t);
  const cols = seq.map(t => { const k = key(t); if (!map.has(k)) map.set(k, HANG_COLS[map.size % HANG_COLS.length]); return map.get(k); });
  F.Things.setState(th, { hung: cols });
  hangBuild(th, cols, true);
  await F.T.sleep(260 * cols.length + 300);
  if (F.TPL.has('obj_vaskesnor_monster')) await F.SAY('obj_vaskesnor_monster');
}
T('v_vaskesnor', { name: 'klessnora', models: ['o_vaskesnor'], radius: 1.0, ext: true, biomes: { Landsby: 2, Gårdsland: 1 },
  init(th) { try { if (th.state.hung) hangBuild(th, th.state.hung, false); } catch (e) { console.error('vaskesnor', e); } },
  hook: th => OBJ.ask(th, 'vaskesnor', ['F58'], { after: hangPattern }),
  tick(th, dt, t) { ['shirt', 'dress', 'sock', 'towel'].forEach((n, i) => { const p = th.parts[n]; if (p && !p.userData._an) p.rotation.x = Math.sin(t * 1.4 + i) * 0.08; }); },
  play: [
    [['swing', { part: 'shirt', axis: 'x', amp: 0.5, n: 3, ms: 1500, bg: true, sound: 'swish' }], ['swing', { part: 'dress', axis: 'x', amp: 0.6, n: 3, ms: 1600, bg: true }], ['swing', { part: 'towel', axis: 'x', amp: 0.5, n: 3, ms: 1500 }]],
    [['rise', { part: 'sock', h: 0.8, hold: 600 }], ['spin', { part: 'sock', axis: 'z', turns: 1, ms: 700 }], say('obj_vaskesnor_2')],
  ] });
T('v_fuglekasse', { name: 'fuglekassa', models: ['o_fuglekasse'], needs: ['bird'], radius: 0.3, ext: true, biomes: { Landsby: 2, Frukthage: 2, Blomstereng: 1, Gårdsland: 1 },
  init(th) { const b = th.parts.bird; if (b) b.visible = false; },
  hook: th => OBJ.firstHook(() => OBJ.vitAsk(th, 'meis', { kinds: ['mat'], after: happy('chirp') }), () => OBJ.animalX(th, 'meis', { vis: { '*': [['emerge', { part: 'bird', h: 0.04, hold: 1600, sound: 'chirp', hide: true }]] } })),   // v5c WP-W2 (hook #2)
  play: [
    [['emerge', { part: 'bird', h: 0.04, hold: 1200, sound: 'chirp', hide: true }], ['fly', { birds: 3, from: 0.8 }], say('obj_fuglekasse')],
    [['emerge', { part: 'bird', h: 0.04, hold: 1600, sound: 'chirp', hide: true }], ['note', { scale: 'penta', inst: 'pluck', n: 3, oct: 24 }], say('obj_fuglekasse_2')],
  ] });
T('n_sopp', { name: 'soppene', models: ['o_sopp'], needs: ['m1'], radius: 0.7, solid: false, ext: true, biomes: { Blomstereng: 2, Innsjø: 1, Frukthage: 1 },
  play: [
    [['bounce', { part: 'm1', h: 0.3, n: 3, grow: true }], ['fx', { kind: 'gold', n: 16 }], say('obj_sopp')],
    [['note', { parts: ['m2', 'm1', 'm3'], scale: 'major', inst: 'pluck', n: 3, gap: 120 }], ['sparkle'], say('obj_sopp_2')],
  ] });
T('n_trappesteiner', { home: ['F52', 'F18'], homePlace: 'pond', name: 'tallsteinene', models: ['o_trappesteiner'], radius: 2.2, solid: false, reach: 3, ext: true, biomes: { Innsjø: 2, Blomstereng: 1, Gårdsland: 1, Landsby: 1 },
  // v5 WP-W (DESIGN4 §8): the stones follow her number band (natural 1–20 → 20–50 → 1–100), not v1's 10–20
  init(th) { const B = numBand(), st = B.lo + hashOf(th) % Math.max(1, B.hi - B.lo - 2); th.data.start = st;
    for (let i = 0; i < 4; i++) { const s = th.parts['s' + i]; if (!s) continue; const a = new THREE.Object3D(); a.position.set(0, 0.42, 0); s.add(a); label(th, a, String(st + i), { kind: 'num', maxDist: 22 }); } },
  tick: labelsByZoom,
  press: th => F.BEH.react(th, [hopStones]) });
async function hopStones(th) {
  const st = th.data.start, P = F.Player;
  const stones = [0, 1, 2, 3].map(i => th.parts['s' + i]).filter(Boolean);
  if (!stones.length) return F.BEH.run(th, 'bounce', {});
  const here = th.space === F.Space.cur;
  let i = 0; let cur = stones[0]; const U2 = F.BEH.util;
  const carry = here ? U2.carry(k => { const idx = Math.min(stones.length - 1, Math.floor(k * stones.length)); const f = k * stones.length - idx; const a = U2.wpos(stones[Math.max(0, idx)]); return a.add(new THREE.Vector3(0, 0.1 + Math.sin(f * Math.PI) * 0.6, 0)); }, stones.length * 750) : null;
  for (const s of stones) {
    F.sfx.boing(); F.sfx.pling(i * 2);
    U2.anim(s, 300, (k, b) => { s.position.y = b.p.y - Math.sin(k * Math.PI) * 0.06; });
    const h = U2.halo(s, 'butter', 1.0, new THREE.Vector3(0, 0.2, 0));
    F.T.timeout(() => U2.killHalo(h), 1600);
    await F.T.sleep(750);       // natural 11.10.: a pling per stone, the numbers are on the stones – no counting aloud on a free tap
    i++;
  }
  if (carry) await carry;
}
T('v_benk', { name: 'benken', models: ['o_benk'], radius: 0.8, ext: true, biomes: { Landsby: 2, Vindmølleåsene: 2, Blomstereng: 1, Innsjø: 1, Strand: 1 },
  play: [
    [['sit', { ms: 2600, top: 0.45 }], ['fly', { birds: 2 }], say('obj_benk')],
    [['sit', { ms: 2000, top: 0.45 }], ['pop', { model: 'o_fugl', n: 3, size: 0.18, life: 2500, sound: 'chirp' }], say('obj_benk_2')],
  ] });
T('v_lyktestolpe', { name: 'lykta', models: ['o_lyktestolpe'], needs: ['light'], radius: 0.25, ext: true, biomes: { Landsby: 3, Strand: 1 },
  play: [[['toggle', { part: 'light', mode: 'light', key: 'on', hidePart: true, color: 'glowYellow', size: 1.4 }]]] });
T('n_vannpytt', { name: 'sølepytten', models: ['o_vannpytt'], radius: 0.9, solid: false, ext: true, biomes: { Gårdsland: 1, Landsby: 1, Blomstereng: 0.5 },
  play: [
    [['splash', { n: 44 }], ['splash', { n: 30 }], say('obj_vannpytt')],
    [['splash', { n: 36 }], ['surprise', { kind: 'rainbow' }], say('obj_vannpytt_2')],
  ] });
retire('n_pinnsvin', 'pinnsvin');
retire('n_snegle', 'snegl');
T('n_syngeblomster', { name: 'syngeblomstene', models: ['o_syngeblomster'], radius: 0.8, ext: true, biomes: { Blomstereng: 3, Lavendelåker: 1, Landsby: 1 },
  play: [[['note', { parts: ['f0', 'f1', 'f2'], scale: 'major', inst: 'piano', n: 3, gap: 160 }], ['note', { parts: ['f2', 'f1', 'f0'], scale: 'major', inst: 'piano', n: 2, gap: 160 }], say('obj_syngeblomster')]] });
T('v_drage', { name: 'dragen', models: ['o_drage'], needs: ['kite'], radius: 0.4, solid: false, ext: true, biomes: { Vindmølleåsene: 4, Strand: 1, Blomstereng: 1 },
  tick(th, dt, t) { const k = th.parts.kite; if (k && !k.userData._an) { k.rotation.z = Math.sin(t * 1.1 + th.t0) * 0.15; } },
  play: [
    [['rise', { part: 'kite', h: 1.0, hold: 1200, sound: 'whoosh' }], say('obj_drage')],
    [['spin', { part: 'kite', axis: 'z', turns: 1, ms: 1400, sound: 'whoosh' }], ['fx', { kind: 'confetti', y: 1, n: 20 }], say('obj_drage_2')],
  ] });
T('v_saftbod', { name: 'saftboden', models: ['o_saftbod'], needs: ['jug'], radius: 1.1, ext: true, biomes: { Frukthage: 3, Landsby: 1, Strand: 1 },
  init(th) { readSign(th, 'saft'); }, dispose: dropSign,
  play: [[['pour', { part: 'jug', axis: 'z', angle: -1.1, ms: 1600, fx: 'honey' }], ['grow', { part: 'glass1', stages: 3, s0: 0.3 }], ['hearts'], say('obj_saftbod')]] });
T('v_brygge', { name: 'brygga', models: ['o_brygge'], needs: ['rod'], radius: 0.8, solid: false, reach: 3, ext: true, water: true, biomes: { Innsjø: 3, Strand: 1 },
  // v5c WP-W2: a fish jumps – «Fisken puster med gjeller.» one day, «Vi sier: frisk som en fisk!» the next
  hook: th => OBJ.animalX(th, 'fisk', { vis: { '*': [['pop', { model: ['fisk', 'o_fisk'], size: 0.35, life: 2200, sound: 'splash' }]] }, act: [['pop', { model: ['fisk', 'o_fisk'], size: 0.35, life: 2600, sound: 'splash' }]] }),
  play: [
    [['swing', { part: 'rod', axis: 'x', amp: 0.5, n: 2, ms: 1400, sound: 'swish' }], ['pop', { model: ['fisk', 'o_fisk'], size: 0.35, life: 2000, sound: 'splash' }], say('obj_brygge')],
    [['swing', { part: 'rod', axis: 'x', amp: 0.3, n: 3, ms: 1400 }], ['splash'], say('obj_brygge_2')],
  ] });
T('v_robat', { name: 'robåten', models: ['o_robat'], radius: 1.0, reach: 3, ext: true, water: true, biomes: { Innsjø: 3 },
  play: [[['swing', { part: 'oarL', axis: 'z', amp: 0.4, n: 6, ms: 4500, bg: true, sound: 'splash' }], ['swing', { part: 'oarR', axis: 'z', amp: 0.4, n: 6, ms: 4500, bg: true }], ['ride', { mode: 'circle', r: 2, ms: 4500, wake: true }], say('obj_robat')]] });
T('v_badehytte', { name: 'badehytta', models: ['o_badehytte'], needs: ['door'], radius: 1.1, ext: true, biomes: { Strand: 4 },
  play: [
    [['open', { part: 'door', angle: -1.8, hold: 1500 }], ['pop', { model: ['badeball', 'ball', 'o_badeball'], size: 0.4, life: 3000, sound: 'boing' }], say('obj_badehytte')],
    [['open', { part: 'door', angle: -1.8, hold: 900 }], ['fly', { birds: 2 }], say('obj_badehytte_2')],
  ] });

retire('n_pingvin', 'pingvin');
// v5c WP-W2 (hook #13, a misconception removed): no seal lives in the igloo (seals live in the sea – F.THEMES) – a warm light inside
T('v_iglo', { name: 'igloen', models: ['v_iglo', 'o_iglo'], radius: 1.4, ext: true, biomes: { Snøhaugen: 1.2 },
  init(th) { const p = th.parts.peek; if (p) p.visible = false; },
  play: [
    [['glow', { color: 'flame', y: 0.3 }], ['fx', { kind: 'snow', n: 24, y: 1 }]],
    [['fx', { kind: 'snow', n: 40, y: 1 }], ['bounce', { h: 0.08 }]],
  ] });
T('n_snoballer', { name: 'snøballene', models: ['o_snoballer'], needs: ['big'], radius: 0.7, solid: false, ext: true, biomes: { Snøhaugen: 2 },
  play: [
    [['rise', { model: 'o_snoball', n: 3, h: 1.4, size: 0.25, fx: 'snow' }], ['fx', { kind: 'snow', n: 30 }], say('obj_snoballer')],
    [['grow', { part: 'big', stages: 4, s0: 0.5, fx: 'snow' }], say('obj_snoballer_2')],
  ] });

// biome garnish next to learning spots (one small merged model per spot; variants b = biome id)
D('o_pynt', { size: [12, 12, 12], scale: 1 / 14,
  build(v, o) {
    const b = o.b || 'blomstereng', fl = (x, z, h, c) => { v.box(x, 1, z, x, h, z, 'leaf'); v.set(x, h + 1, z, c); v.set(x - 1, h + 1, z, c); v.set(x + 1, h + 1, z, c); v.set(x, h + 1, z - 1, c); v.set(x, h + 1, z + 1, c); v.set(x, h + 2, z, 'butter'); };
    if (b === 'snohaugen') { v.ellipsoid(6, 0, 6, 5.5, 2.4, 5, 'snow'); prism(v, 4, 5, 8, 1.4, 'crystal', 'white'); prism(v, 8, 7, 6, 1.2, 'ice', 'crystal'); v.set(9, 2, 3, 'white'); }
    else if (b === 'strand') { v.ellipsoid(6, 0, 6, 5.5, 1.6, 5, 'sand'); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; v.line(4, 2, 5, Math.round(4 + Math.cos(a) * 2.4), 2, Math.round(5 + Math.sin(a) * 2.4), 'coral'); } v.set(4, 2, 5, 'orange');
      v.ellipsoid(8.5, 1.6, 8, 2, 1, 1.6, 'peach'); v.set(8, 2, 9, 'pink'); v.set(9, 2, 8, 'pink'); }
    else if (b === 'gardsland') { v.ellipsoid(4.5, 0, 6, 4, 2.6, 3.6, 'hay'); v.paint((x, y, z, c) => ((x + z * 2 + y) % 4 === 0) ? 'butter' : null); v.ellipsoid(8.5, 1.6, 8, 2.4, 1.8, 2.2, 'orange'); v.paint((x, y, z, c) => (c === F.PAL.orange && x % 2 === 0) ? 'coral' : null); v.box(8, 3, 8, 8, 4, 8, 'leafDark'); }
    else if (b === 'frukthage') { v.ellipsoid(6, 0, 6, 5, 1, 4.5, 'grassDark'); v.sphere(4, 2, 5, 1.6, 'red'); v.sphere(7, 2, 7.5, 1.6, 'red'); v.sphere(8.5, 2, 4, 1.5, 'butter'); v.set(4, 4, 5, 'woodDark'); v.set(7, 4, 7, 'woodDark'); v.set(5, 4, 5, 'leaf'); }
    else if (b === 'innsjo') { v.ellipsoid(6, 0, 6, 5, 1, 4.5, 'grassDark'); [[3, 4, 9], [5, 7, 11], [7, 4, 8], [4, 8, 7]].forEach(([x, z, h]) => { v.box(x, 1, z, x, h, z, 'leafDark'); v.box(x, h + 1, z, x, h + 2, z, 'brown'); }); v.ellipsoid(9, 1, 8, 1.8, 1.2, 1.6, 'stone2'); }
    else if (b === 'vindmolle') { v.ellipsoid(6, 0, 6, 4, 1, 4, 'grassDark'); v.box(6, 1, 6, 6, 8, 6, 'woodLight'); [['pink', 1, 0], ['sky', 0, 1], ['butter', -1, 0], ['mint', 0, -1]].forEach(([c, dx, dy]) => { for (let i = 1; i <= 3; i++) for (let j = 0; j < i; j++) v.set(6 + dx * i - dy * j, 9 + dy * i + dx * j, 7, c); }); v.set(6, 9, 7, 'gold'); }
    else if (b === 'lavendel') { v.ellipsoid(6, 0, 6, 5, 1.4, 4.5, 'leafDark'); for (const [x, z, h] of [[3, 5, 6], [5, 7, 8], [7, 4, 7], [8, 8, 6], [4, 8, 5], [9, 6, 8]]) { v.box(x, 1, z, x, h - 2, z, 'leaf'); v.box(x, h - 1, z, x, h + 1, z, (x + z) % 2 ? 'lavField' : 'purple'); } }
    else { v.ellipsoid(6, 0, 6, 5, 1, 4.5, 'grassDark'); fl(3, 5, 4, 'pink'); fl(7, 8, 6, 'butter'); fl(9, 4, 3, 'lilac'); }
  },
  meta: { group: 'objekt', variants: { b: ['blomstereng', 'gardsland', 'frukthage', 'innsjo', 'strand', 'vindmolle', 'lavendel', 'snohaugen'] } } });

/* =================================================================== WAVE 2: more variety (25 kid-meaningful types, own o_* models)
   Every type: model + 2–3 play variants + spoken lines (lines_obj.js) + biome weights (F.OBJ.forBiome). All placed by the extras
   generator below (ext:true) unless WORLD takes them from forBiome. Nothing scary: teddies, kites, snails, puppets, trains … */
const front = (v, x, y, c) => { for (let z = v.size[2] - 1; z >= 0; z--) if (v.get(x, y, z)) { v.set(x, y, z, c); return z; } return -1; };
const H3 = (x, y, z, s) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + (s || 0) * 11.3) * 43758.5453; return h - Math.floor(h); };
const ring = (v, cx, y, cz, r, col) => { for (let a = 0; a < Math.PI * 2; a += 0.5 / Math.max(1, r)) v.set(Math.round(cx + Math.cos(a) * r), y, Math.round(cz + Math.sin(a) * r), typeof col === 'function' ? col(a) : col); };

// picnic blanket with a teddy bear
D('o_teppebamse', { size: [36, 18, 28], scale: 1 / 16,
  build(v) { for (let x = 1; x <= 34; x++) for (let z = 1; z <= 26; z++) v.set(x, 0, z, ((x >> 2) + (z >> 2)) % 2 ? 'sky' : 'white');
    for (let x = 1; x <= 34; x += 3) { v.set(x, 0, 0, 'sky'); v.set(x, 0, 27, 'sky'); }
    disc(v, 26, 1, 18, 3, 'white'); v.set(25, 2, 17, 'honey'); v.set(27, 2, 18, 'honey'); v.set(26, 2, 19, 'woodLight'); v.set(24, 2, 19, 'honey');
    v.cyl(22, 1, 8, 1.3, 2, 'pink'); v.set(22, 2, 8, 'woodRed'); v.cyl(30, 1, 10, 1.3, 2, 'mint'); v.set(30, 2, 10, 'woodRed');
    v.box(28, 1, 3, 33, 4, 6, 'woodLight'); v.box(28, 4, 3, 33, 4, 6, 'woodRed'); v.line(28, 5, 4, 30, 7, 4, 'wood'); v.line(33, 5, 4, 31, 7, 4, 'wood'); },
  parts: { teddy: { pivot: [10, 1, 12], build(v) {
    v.ellipsoid(10, 4.5, 12, 3.3, 3.5, 2.8, 'woodLight'); v.ellipsoid(10, 4, 14.2, 2.1, 2.4, 0.9, 'cream');
    v.ellipsoid(7.6, 2, 14.4, 1.5, 1.3, 2.2, 'woodLight'); v.ellipsoid(12.4, 2, 14.4, 1.5, 1.3, 2.2, 'woodLight'); v.set(7.6, 2, 16.6, 'peach'); v.set(12.4, 2, 16.6, 'peach');
    v.ellipsoid(6.4, 5.5, 13, 1.2, 2.6, 1.3, 'woodLight'); v.ellipsoid(13.6, 5.5, 13, 1.2, 2.6, 1.3, 'woodLight');
    v.sphere(10, 10.2, 12, 3.1, 'woodLight'); v.sphere(7.4, 12.8, 12, 1.3, 'woodLight'); v.sphere(12.6, 12.8, 12, 1.3, 'woodLight'); v.set(7.4, 12.8, 13, 'peach'); v.set(12.6, 12.8, 13, 'peach');
    v.ellipsoid(10, 9.4, 14.6, 1.5, 1.1, 1, 'cream'); front(v, 10, 10, 'black'); front(v, 9, 11, 'black'); front(v, 11, 11, 'black');
    for (const x of [8, 9, 10, 11, 12]) front(v, x, 7, x === 10 ? 'rose' : 'pink');
  } } } });
// hammock between two posts
D('o_hengekoye', { size: [40, 22, 12], scale: 1 / 12,
  build(v) { for (const x of [1, 37]) { v.box(x, 0, 5, x + 1, 18, 6, 'wood'); v.box(x - 1, 18, 4, x + 2, 19, 7, 'woodDark'); v.box(x - 1, 0, 4, x + 2, 0, 7, 'stone2'); }
    v.line(3, 16, 5, 6, 14, 5, 'cream2'); v.line(3, 16, 6, 6, 14, 6, 'cream2'); v.line(36, 16, 5, 33, 14, 5, 'cream2'); v.line(36, 16, 6, 33, 14, 6, 'cream2');
    v.ellipsoid(20, 0, 6, 18, 0.6, 5, 'grassDark'); },
  parts: { seat: { pivot: [20, 15, 6], build(v) {
    for (let x = 6; x <= 33; x++) { const y = Math.round(14 - 6 * Math.sin(Math.PI * (x - 6) / 27)); for (let z = 3; z <= 9; z++) { v.set(x, y, z, ['coral', 'butter', 'mint', 'sky'][Math.floor((x - 6) / 4) % 4]); if (z === 3 || z === 9) v.set(x, y + 1, z, 'white'); } }
    v.box(8, 12, 4, 10, 12, 8, 'white'); v.box(8, 13, 5, 10, 13, 7, 'white');
  } } } });
// ice-cream cart (umbrella + bell)
D('o_isvogn', { size: [24, 34, 20], scale: 1 / 12,
  build(v) { v.box(3, 4, 3, 19, 13, 12, 'white'); v.box(3, 11, 3, 19, 12, 12, 'pink'); v.box(3, 5, 12, 19, 5, 12, 'sky'); v.box(2, 13, 2, 20, 13, 13, 'sky');
    for (let x = 4; x <= 18; x += 2) front(v, x, 8, x % 4 ? 'butter' : 'mint');
    disc(v, 2, 3, 7, 3.2, (a, b) => Math.hypot(a, b) > 2.3 ? 'navySoft' : 'grey', 'x'); disc(v, 20, 3, 7, 3.2, (a, b) => Math.hypot(a, b) > 2.3 ? 'navySoft' : 'grey', 'x');
    v.line(20, 11, 7, 23, 14, 7, 'steel'); v.box(23, 14, 6, 23, 14, 8, 'steel');
    v.sphere(7, 15, 7, 1.7, 'pink'); v.sphere(11, 15, 6, 1.7, 'butter'); v.sphere(14.5, 15, 8, 1.7, 'mint'); v.set(11, 17, 6, 'red');
    v.box(9, 0, 10, 9, 3, 10, 'steel'); },
  parts: {
    umbrella: { pivot: [11, 14, 9], build(v) { v.box(11, 14, 9, 11, 27, 9, 'steel');
      for (let y = 26; y <= 30; y++) { const r = (31 - y) * 1.8; for (let x = 0; x < 24; x++) for (let z = 0; z < 16; z++) { const d = Math.hypot(x - 11, z - 9) ; if (d <= r && d > r - 2.4) v.set(x, y, z, Math.floor((Math.atan2(z - 9, x - 11) + Math.PI) / (Math.PI / 4)) % 2 ? 'pink' : 'white'); } }
      v.set(11, 31, 9, 'red'); } },
    bell: { pivot: [18, 16, 10], build(v) { v.box(18, 14, 10, 18, 15, 10, 'steel'); v.cyl(18, 16, 10, 1.4, 2, 'gold'); v.set(18, 18, 10, 'gold'); } },
  } });
D('o_iskule', { size: [7, 11, 7], scale: 1 / 16, build(v, o) { for (let y = 0; y < 6; y++) v.cyl(3, y, 3, 0.4 + y * 0.42, 1, y % 2 ? 'honey' : 'woodLight'); v.sphere(3, 7.5, 3, 2.7, o.c || 'pink'); v.set(3, 10, 3, 'red'); },
  meta: { group: 'objekt', variants: { c: ['pink', 'butter', 'mint', 'brown'] } } });
// snail race (3 lanes; numbered snails)
const snailCols = [['mint', 'coral'], ['butter', 'lilac'], ['peach', 'sky']];
D('o_sneglelop', { size: [52, 8, 27], scale: 1 / 12,
  build(v) { for (let x = 1; x <= 50; x++) for (let z = 1; z <= 25; z++) v.set(x, 0, z, (x === 17 || x === 35) ? 'white' : ((x + z) % 7 === 0 ? 'leaf' : 'leaf2'));
    for (let x = 1; x <= 50; x++) { v.set(x, 0, 3, 'white'); v.set(x, 0, 22, (x % 2) ? 'black' : 'white'); v.set(x, 0, 23, (x % 2) ? 'white' : 'black'); }
    for (const x of [0, 51]) { v.box(x, 0, 23, x, 7, 23, 'woodDark'); } v.box(0, 7, 23, 51, 7, 23, 'woodLight'); for (let x = 2; x <= 49; x += 3) { v.set(x, 6, 23, ['pink', 'butter', 'sky', 'mint'][x % 4]); v.set(x + 1, 6, 23, ['pink', 'butter', 'sky', 'mint'][x % 4]); } },
  parts: Object.fromEntries([0, 1, 2].map(i => ['sn' + i, { pivot: [8 + i * 18, 1, 6], build(v) { const x = 8 + i * 18, [b, s] = snailCols[i];
    v.box(x - 1, 1, 3, x + 1, 1, 9, b); v.box(x - 1, 2, 8, x + 1, 3, 9, b); v.line(x - 1, 4, 9, x - 1, 6, 10, b); v.line(x + 1, 4, 9, x + 1, 6, 10, b); v.set(x - 1, 6, 10, 'black'); v.set(x + 1, 6, 10, 'black');
    v.ellipsoid(x, 4, 5, 1.8, 2.6, 2.6, s); v.paint((X, Y, Z, c) => (c === F.PAL[s] && Math.floor(Math.hypot(Y - 4, Z - 5) * 1.4) % 2) ? 'white' : null); } }])) });
// little bridge with a bell
D('o_bjellebro', { size: [40, 22, 16], scale: 1 / 10,
  build(v) { for (let x = 9; x <= 30; x++) for (let z = 0; z <= 15; z++) v.set(x, 0, z, (x === 9 || x === 30) ? 'sand' : ((x * 3 + z * 7) % 11 === 0 ? 'sky' : 'water'));
    for (let x = 4; x <= 35; x++) { const y = 1 + Math.round(4 * Math.sin(Math.PI * (x - 4) / 31)); v.box(x, y, 4, x, y, 11, (x % 3 === 0) ? 'woodDark' : 'wood'); v.box(x, 1, 4, x, y - 1, 4, 'woodDark'); v.box(x, 1, 11, x, y - 1, 11, 'woodDark');
      v.set(x, y + 4, 3, 'woodRed'); v.set(x, y + 4, 12, 'woodRed'); if (x % 4 === 0) { v.box(x, y + 1, 3, x, y + 3, 3, 'woodRed'); v.box(x, y + 1, 12, x, y + 3, 12, 'woodRed'); } }
    v.box(37, 0, 13, 37, 17, 13, 'woodDark'); v.box(34, 17, 13, 37, 17, 13, 'woodDark'); v.box(36, 0, 12, 38, 0, 14, 'stone2');
    [[6, 13, 'pink'], [32, 2, 'butter'], [3, 2, 'lilac']].forEach(([x, z, c]) => { v.box(x, 1, z, x, 2, z, 'leaf'); v.set(x, 3, z, c); }); },
  parts: { bell: { pivot: [35, 16, 13], build(v) { v.box(35, 14, 13, 35, 16, 13, 'grey'); v.cyl(35, 11, 13, 1.7, 3, 'gold'); v.set(35, 14, 13, 'gold'); v.set(35, 10, 13, 'woodDark'); } } } });
// wishing well with flowers and a heart
D('o_onskebronn', { size: [20, 26, 20], scale: 1 / 12,
  build(v) { v.cyl(10, 0, 10, 7.5, 5, 'pathStone'); v.paint((x, y, z) => ((x * 5 + y * 3 + z * 7) % 9 === 0) ? 'stone2' : null); v.cyl(10, 1, 10, 6, 4, 0); v.cyl(10, 3, 10, 6, 1, 'water'); v.set(9, 3, 9, 'gem2'); v.set(12, 3, 11, 'gem2');
    ring(v, 10, 5, 10, 7, a => ['pink', 'butter', 'lilac', 'white', 'coral'][Math.floor(a * 2.2) % 5]);
    for (const x of [2, 18]) { v.box(x, 5, 10, x, 18, 10, 'woodLight'); for (let y = 6; y <= 18; y += 2) v.set(x + (y % 4 ? 1 : -1), y, 10, 'leaf'); }
    v.box(2, 19, 10, 18, 19, 10, 'woodLight'); v.set(6, 20, 10, 'leaf'); v.set(14, 20, 10, 'leaf');
    const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']; heart.forEach((row, r) => [...row].forEach((c, q) => { if (c === '1') v.set(7 + q, 25 - r, 10, (r === 1 && q === 1) ? 'white' : 'pink'); })); v.box(10, 19, 10, 10, 19, 10, 'woodLight'); } });
// a ring of five sunflowers
D('o_solsikkering', { size: [30, 30, 30], scale: 1 / 12,
  build(v) { v.ellipsoid(15, 0, 15, 13, 1, 13, 'grass'); v.ellipsoid(15, 1, 15, 3, 2, 3, 'leaf2'); v.set(15, 3, 15, 'butter'); },
  parts: Object.fromEntries([0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 + 0.3, x = Math.round(15 + Math.cos(a) * 10), z = Math.round(15 + Math.sin(a) * 10), h = 17 + (i % 3) * 3;
    return ['f' + i, { pivot: [x, h, z], build(v) { v.box(x, 0, z, x, h - 1, z, 'leafDark'); v.ellipsoid(x - 2, Math.round(h * 0.45), z, 2, 0.8, 1, 'leaf'); v.ellipsoid(x + 2, Math.round(h * 0.6), z, 2, 0.8, 1, 'leaf');
      disc(v, x, h + 1, z, 4.2, (p, q) => { const d = Math.hypot(p, q); if (d < 1.8) return (p + q) % 2 ? 'brown' : 'woodDark'; if (d < 2.4) return 'orange'; return Math.floor(Math.atan2(q, p) * 3) % 2 ? 'yellow' : 'butter'; }, 'z'); } }]; })) });
// three kites on a stake (each kite + string pivots at the spool → sways in the wind)
const KITES = [[6, 46, 'coral', 'butter'], [15, 54, 'sky', 'white'], [24, 44, 'mint', 'pink']];
D('o_dragefest', { size: [30, 60, 10], scale: 1 / 12,
  build(v) { v.box(14, 0, 4, 16, 3, 6, 'woodRed'); v.cyl(15, 3, 5, 1.4, 1, 'white'); v.box(13, 0, 3, 17, 0, 7, 'stone2'); },
  parts: Object.fromEntries(KITES.map(([kx, ky, c1, c2], i) => ['k' + i, { pivot: [15, 4, 5], build(v) {
    v.line(15, 4, 5, kx, ky - 7, 5, 'white');
    for (let x = kx - 5; x <= kx + 5; x++) for (let y = ky - 7; y <= ky + 7; y++) { if (Math.abs(x - kx) / 5 + Math.abs(y - ky) / 7 > 1) continue; v.set(x, y, 5, (x < kx) === (y < ky) ? c1 : c2); }
    v.line(kx, ky - 7, 5, kx, ky + 7, 5, 'woodDark'); v.line(kx - 5, ky, 5, kx + 5, ky, 5, 'woodDark');
    for (let j = 0; j < 4; j++) { v.set(kx + (j % 2), ky - 8 - j * 2, 5, 'white'); v.box(kx - 1 + (j % 2), ky - 9 - j * 2, 5, kx + 1 + (j % 2), ky - 9 - j * 2, 5, j % 2 ? c1 : c2); }
  } }])) });
// lily pond with stepping stones and a frog
const POND_ST = [[7, 23], [14, 17], [21, 12], [28, 7]];
D('o_liljedam', { size: [36, 8, 30], scale: 1 / 12,
  build(v) { for (let x = 0; x < 36; x++) for (let z = 0; z < 30; z++) { const q = ((x - 17.5) / 17.5) ** 2 + ((z - 14.5) / 14.5) ** 2; if (q > 1) continue;
      if (q > 0.78) v.box(x, 0, z, x, H3(x, 0, z) < 0.4 ? 1 : 0, z, H3(x, 1, z) < 0.3 ? 'stone2' : 'grass'); else v.set(x, 0, z, (x * 7 + z * 3) % 13 === 0 ? 'sky' : 'water'); }
    [[10, 9, 'pink'], [26, 20, 'white'], [8, 16, null], [24, 14, null]].forEach(([x, z, f]) => { disc(v, x, 1, z, 2.4, (a, b) => (a > 0 && Math.abs(b) <= a * 0.4) ? 0 : 'leaf', 'y'); if (f) { v.set(x, 2, z, f); v.set(x - 1, 2, z, f); v.set(x, 2, z - 1, f); v.set(x, 3, z, 'butter'); } });
    for (const [x, z] of [[3, 6], [32, 24], [5, 22]]) { v.box(x, 1, z, x, 5, z, 'leafDark'); v.box(x, 6, z, x, 7, z, 'brown'); } },
  parts: Object.assign(Object.fromEntries(POND_ST.map(([x, z], i) => ['s' + i, { pivot: [x, 1, z], build(v) { v.ellipsoid(x, 1, z, 2.8, 1.3, 2.4, 'stone2'); v.ellipsoid(x, 1.6, z, 2.2, 0.8, 1.8, 'pathStone'); } }])),
    { frog: { pivot: [24, 1, 14], build(v) { v.ellipsoid(24, 3, 14, 2.4, 1.6, 2.2, 'green'); v.sphere(23, 4.5, 15.5, 0.9, 'green'); v.sphere(25, 4.5, 15.5, 0.9, 'green'); v.set(23, 5, 16, 'black'); v.set(25, 5, 16, 'black'); v.box(23, 2, 16, 25, 2, 16, 'butter'); } } }) });
// camping tent with a sleeping cat
D('o_telt', { size: [24, 20, 26], scale: 1 / 12,
  build(v) { for (let z = 2; z <= 21; z++) for (let y = 0; y <= 14; y++) { const w = Math.round((14 - y) * 0.75); const shell = z === 2; for (let x = 12 - w; x <= 12 + w; x++) if (shell || x === 12 - w || x === 12 + w || y === 14) v.set(x, y, z, shell ? 'navySoft' : (Math.floor(x / 3) % 2 ? 'coral' : 'butter')); }
    v.box(5, 0, 22, 19, 0, 25, 'woodLight'); v.line(12, 14, 21, 12, 17, 23, 'woodDark'); v.set(12, 18, 23, 'pink'); v.set(13, 18, 23, 'pink');
    v.box(20, 0, 23, 20, 3, 23, 'woodDark'); v.box(19, 4, 22, 21, 6, 24, 'glass'); v.set(20, 5, 23, 'flame'); v.box(19, 7, 22, 21, 7, 24, 'navySoft'); },
  parts: {
    door: { pivot: [4, 0, 22], build(v) { for (let y = 0; y <= 13; y++) { const w = Math.round((14 - y) * 0.75); for (let x = 12 - w; x <= 12; x++) v.set(x, y, 22, x === 12 - w ? 'coral' : 'butter'); } v.set(10, 6, 23, 'woodRed'); } },
    door2: { pivot: [20, 0, 22], build(v) { for (let y = 0; y <= 13; y++) { const w = Math.round((14 - y) * 0.75); for (let x = 13; x <= 12 + w; x++) v.set(x, y, 22, x === 12 + w ? 'coral' : 'butter'); } } },
    cat: { pivot: [12, 1, 17], build(v) { v.ellipsoid(12, 2, 16, 3.4, 1.8, 2.8, 'orange'); v.paint((x, y, z, c) => (c === F.PAL.orange && x % 2 === 0 && y > 1) ? 'butter' : null);
      v.sphere(13.5, 2.6, 18.5, 1.8, 'orange'); v.set(12.5, 4.5, 18.5, 'orange'); v.set(14.5, 4.5, 18.5, 'orange'); v.set(13, 2.6, 20, 'black'); v.set(14, 2.6, 20, 'black'); v.set(13.5, 2, 20, 'pink'); v.line(9, 1, 17, 11, 1, 19, 'orange'); } },
  } });
// weather vane with a rooster
D('o_vindfloy', { size: [20, 42, 20], scale: 1 / 12,
  build(v) { v.cyl(9.5, 0, 9.5, 3, 2, 'stone2'); v.box(9, 2, 9, 10, 30, 10, 'navySoft'); v.box(4, 26, 9, 15, 26, 10, 'gold'); v.box(9, 26, 4, 10, 26, 15, 'gold'); v.sphere(9.5, 26.5, 9.5, 1.3, 'gold');
    for (const [x, z] of [[3, 9], [16, 9], [9, 3], [9, 16]]) v.set(x, 26, z, 'roofRed'); },
  parts: { rooster: { pivot: [9.5, 31, 9.5], build(v) {
    v.line(3, 31, 9, 17, 31, 9, 'gold'); v.box(16, 30, 9, 16, 32, 9, 'gold'); v.set(17, 31, 9, 'gold'); v.box(3, 30, 9, 4, 32, 9, 'gold');
    v.ellipsoid(9.5, 35, 9.5, 3.4, 2.4, 1, 'red'); v.sphere(12.5, 38, 9.5, 1.6, 'red'); v.box(12, 40, 9, 13, 41, 10, 'roofRed'); v.set(14, 38, 9, 'orange'); v.set(14, 38, 10, 'orange'); v.set(13, 38.5, 10.5, 'black');
    for (let i = 0; i < 4; i++) v.line(7, 35, 9, 4 - i * 0.3, 37 + i, 9, i % 2 ? 'gold' : 'orange'); v.box(9, 32, 9, 9, 33, 9, 'gold'); v.box(10, 32, 10, 10, 33, 10, 'gold'); } } } });
// scarecrow made of flowers (friendly; birds sit on it)
D('o_blomsterskremsel', { size: [24, 36, 10], scale: 1 / 12,
  build(v) { v.box(11, 0, 4, 12, 26, 5, 'wood'); v.ellipsoid(11.5, 0, 4.5, 4, 0.8, 3, 'grassDark');
    v.ellipsoid(11.5, 16, 4.5, 4.2, 5.5, 2.4, 'leaf'); v.paint((x, y, z, c) => (y > 10 && y < 22 && H3(x, y, z, 4) < 0.45) ? ['pink', 'butter', 'lilac', 'white', 'coral'][Math.floor(H3(x, y, z, 5) * 5)] : null);
    v.box(9, 10, 3, 14, 10, 6, 'hay'); for (const x of [9, 11, 13]) v.box(x, 8, 4, x, 9, 4, 'hay'); },
  parts: {
    head: { pivot: [11.5, 23, 4.5], build(v) { v.sphere(11.5, 26, 4.5, 3.1, 'cream2'); front(v, 10, 27, 'black'); front(v, 13, 27, 'black'); front(v, 11, 25, 'coral'); front(v, 12, 25, 'coral'); front(v, 10, 26, 'pink'); front(v, 13, 26, 'pink');
      v.cyl(11.5, 28, 4.5, 4.6, 1, 'hay'); v.cyl(11.5, 29, 4.5, 2.8, 3, 'hay'); v.cyl(11.5, 29, 4.5, 2.9, 1, 'pink'); v.set(14, 30, 6, 'butter'); v.set(9, 30, 6, 'lilac'); } },
    arms: { pivot: [11.5, 20, 4.5], build(v) { v.box(1, 20, 4, 22, 21, 5, 'wood'); v.ellipsoid(1.5, 20.5, 4.5, 1.6, 1.6, 1.6, 'pink'); v.ellipsoid(21.5, 20.5, 4.5, 1.6, 1.6, 1.6, 'butter'); v.set(1, 22, 4, 'white'); v.set(22, 22, 5, 'white'); v.box(4, 19, 4, 8, 19, 5, 'leaf'); v.box(15, 19, 4, 19, 19, 5, 'leaf'); } },
  } });
// toy train track (oval) with a little station; the train parts are placed along the oval in code
D('o_togbane', { size: [40, 12, 27], scale: 1 / 12,
  build(v) { for (let x = 0; x < 40; x++) for (let z = 0; z < 27; z++) { const q = ((x - 20) / 19.5) ** 2 + ((z - 13) / 13) ** 2; if (q <= 1) v.set(x, 0, z, 'grass'); }
    for (let a = 0; a < Math.PI * 2; a += 0.02) { v.set(Math.round(20 + Math.cos(a) * 17), 1, Math.round(13 + Math.sin(a) * 10.4), 'steel'); v.set(Math.round(20 + Math.cos(a) * 15), 1, Math.round(13 + Math.sin(a) * 8.6), 'steel'); }
    for (let a = 0; a < Math.PI * 2; a += 0.3) v.line(Math.round(20 + Math.cos(a) * 14.4), 0, Math.round(13 + Math.sin(a) * 8.1), Math.round(20 + Math.cos(a) * 17.6), 0, Math.round(13 + Math.sin(a) * 10.9), 'woodDark');
    v.box(16, 1, 10, 24, 5, 15, 'butter'); v.box(18, 1, 15, 19, 3, 15, 'woodRed'); v.box(21, 3, 15, 23, 4, 15, 'sky'); for (let i = 0; i < 4; i++) v.box(15 + i, 6 + i, 9 + i, 25 - i, 6 + i, 16 - i, i % 2 ? 'roofRed' : 'coral');
    [[8, 13, 'pink'], [32, 13, 'butter'], [20, 4, 'lilac'], [12, 20, 'sky']].forEach(([x, z, c]) => { v.box(x, 1, z, x, 2, z, 'leaf'); v.set(x, 3, z, c); }); },
  parts: {
    loco: { pivot: [20, 1, 13], build(v) { v.box(19, 2, 11, 21, 4, 15, 'red'); v.box(19, 5, 11, 21, 7, 12, 'navySoft'); v.box(18, 8, 10, 22, 8, 13, 'red'); v.cyl(20, 5, 14, 0.8, 3, 'black'); v.set(20, 8, 14, 'grey');
      v.box(19, 3, 16, 21, 3, 16, 'gold'); for (const z of [12, 14]) { v.set(18, 2, z, 'black'); v.set(22, 2, z, 'black'); } v.box(19, 5, 15, 21, 5, 15, 'butter'); } },
    w1: { pivot: [20, 1, 13], build(v) { v.box(19, 2, 11, 21, 3, 15, 'sky'); v.box(19, 4, 11, 21, 4, 15, 'white'); v.sphere(20, 5, 12, 0.9, 'red'); v.sphere(20, 5, 14, 0.9, 'orange'); for (const z of [12, 14]) { v.set(18, 2, z, 'black'); v.set(22, 2, z, 'black'); } } },
    w2: { pivot: [20, 1, 13], build(v) { v.box(19, 2, 11, 21, 3, 15, 'mint'); v.box(19, 4, 11, 21, 4, 15, 'white'); v.box(20, 5, 12, 20, 6, 12, 'pink'); v.box(20, 5, 14, 20, 5, 14, 'butter'); for (const z of [12, 14]) { v.set(18, 2, z, 'black'); v.set(22, 2, z, 'black'); } } },
  } });
// puppet theatre (curtains open, a bunny and a cat puppet pop up)
D('o_dukketeater', { size: [24, 30, 10], scale: 1 / 12,
  build(v) { for (const x0 of [1, 20]) v.box(x0, 0, 3, x0 + 2, 27, 7, 'woodRed'); v.box(1, 23, 3, 22, 28, 7, 'butter'); for (let x = 1; x <= 22; x++) v.set(x, 22, 7, x % 3 === 0 ? 'pink' : 'butter'); v.box(3, 28, 5, 20, 29, 5, 'pink');
    v.box(3, 0, 5, 19, 9, 7, 'woodRed'); v.box(4, 2, 7, 18, 8, 7, 'peach'); for (let x = 5; x <= 17; x += 3) v.set(x, 5, 7, 'pink');
    v.box(3, 10, 3, 19, 22, 3, 'sky'); [[7, 18], [14, 16]].forEach(([x, y]) => v.box(x, y, 3, x + 3, y + 1, 3, 'white')); v.box(3, 10, 4, 19, 10, 4, 'leaf');
  },
  parts: {
    curtL: { pivot: [3, 22, 7], build(v) { v.box(3, 10, 7, 10, 22, 7, 'red'); for (let x = 4; x <= 10; x += 2) v.box(x, 10, 7, x, 22, 7, 'rose'); v.set(10, 16, 8, 'gold'); } },
    curtR: { pivot: [20, 22, 7], build(v) { v.box(11, 10, 7, 19, 22, 7, 'red'); for (let x = 12; x <= 19; x += 2) v.box(x, 10, 7, x, 22, 7, 'rose'); v.set(11, 16, 8, 'gold'); } },
    p1: { pivot: [8, 6, 5], build(v) { v.box(7, 5, 5, 9, 11, 6, 'pink'); v.sphere(8, 13, 5.5, 2, 'white'); v.box(7, 15, 5, 7, 18, 5, 'white'); v.box(9, 15, 5, 9, 18, 5, 'white'); v.set(7, 16, 6, 'pink'); v.set(9, 16, 6, 'pink'); front(v, 7, 13, 'black'); front(v, 9, 13, 'black'); front(v, 8, 12, 'pink'); } },
    p2: { pivot: [15, 6, 5], build(v) { v.box(14, 5, 5, 16, 11, 6, 'sky'); v.sphere(15, 13, 5.5, 2, 'orange'); v.set(13, 15, 5, 'orange'); v.set(17, 15, 5, 'orange'); front(v, 14, 13, 'black'); front(v, 16, 13, 'black'); front(v, 15, 12, 'pink'); v.box(14, 11, 6, 16, 11, 6, 'butter'); } },
  } });
// sandpit with a bucket, a spade and sand towers
const sandTower = (v, x, z, h) => { v.cyl(x, 2, z, 2.2, h, 'sand'); for (let a = 0; a < 6.28; a += 1.05) v.set(Math.round(x + Math.cos(a) * 2), 2 + h, Math.round(z + Math.sin(a) * 2), 'sand'); v.paint((X, Y, Z, c) => (c === F.PAL.sand && Y > 2 && (X + Y * 2 + Z) % 5 === 0) ? 'cream2' : null); };
D('o_sandkasse', { size: [28, 12, 28], scale: 1 / 12,
  build(v) { v.box(0, 0, 0, 27, 3, 27, 'woodLight'); v.box(1, 1, 1, 26, 3, 26, 0); v.box(1, 0, 1, 26, 2, 26, 'sand'); v.paint((x, y, z, c) => (y === 2 && c === F.PAL.sand && H3(x, y, z, 7) < 0.15) ? 'cream2' : null);
    for (const [x, z] of [[0, 0], [27, 0], [0, 27], [27, 27]]) v.box(x, 3, z, x, 4, z, 'woodRed'); v.box(22, 3, 4, 24, 4, 6, 'sky'); v.set(23, 4, 5, 0); },
  parts: {
    bucket: { pivot: [7, 3, 7], build(v) { v.cyl(7, 3, 7, 2.4, 4, 'red'); v.cyl(7, 4, 7, 1.6, 3, 0); v.cyl(7, 6, 7, 2.6, 1, 'butter'); v.line(5, 7, 7, 7, 9, 7, 'grey'); v.line(9, 7, 7, 7, 9, 7, 'grey'); } },
    spade: { pivot: [20, 3, 20], build(v) { v.line(20, 3, 20, 20, 9, 16, 'woodLight'); v.box(19, 9, 15, 21, 9, 16, 'woodRed'); v.box(19, 2, 20, 21, 4, 22, 'sky'); } },
    t1: { pivot: [19, 2, 9], build(v) { sandTower(v, 19, 9, 5); v.box(19, 8, 9, 19, 10, 9, 'woodDark'); v.box(20, 9, 9, 21, 10, 9, 'pink'); } },
    t2: { pivot: [9, 2, 19], build(v) { sandTower(v, 9, 19, 4); } },
    t3: { pivot: [14, 2, 14], build(v) { sandTower(v, 14, 14, 6); v.box(14, 9, 14, 14, 11, 14, 'woodDark'); v.box(15, 10, 14, 16, 11, 14, 'sky'); } },
  } });
// music-box tree (blossoms; a crank and a little dancer)
D('o_spilledasetre', { size: [26, 38, 26], scale: 1 / 12,
  build(v) { v.cyl(13, 0, 13, 2.2, 18, 'wood'); v.box(10, 0, 12, 16, 1, 14, 'wood');
    v.ellipsoid(13, 26, 13, 11, 8, 11, 'blossom'); v.ellipsoid(7, 24, 15, 5, 4, 5, 'pink'); v.ellipsoid(19, 28, 11, 5, 4, 5, 'pink'); v.ellipsoid(13, 32, 13, 6, 4, 6, 'blossom');
    v.paint((x, y, z, c) => (y > 18 && surface(v, x, y, z) && H3(x, y, z, 2) < 0.12) ? 'white' : (y > 18 && H3(x, y, z, 3) < 0.04 ? 'leaf' : null));
    v.box(9, 6, 15, 17, 10, 18, 'lilac'); v.box(9, 10, 15, 17, 10, 18, 'gold'); v.box(9, 6, 18, 17, 6, 18, 'gold'); front(v, 13, 8, 'gold'); },
  parts: {
    crank: { pivot: [18, 8, 16.5], build(v) { v.box(18, 8, 16, 19, 8, 17, 'gold'); v.box(19, 8, 16, 19, 11, 16, 'gold'); v.box(19, 11, 16, 20, 11, 16, 'woodRed'); } },
    dancer: { pivot: [13, 11, 16.5], build(v) { v.box(13, 11, 16, 13, 12, 16, 'skin'); v.cyl(13, 13, 16.5, 1.6, 1, 'pink'); v.box(13, 14, 16, 13, 15, 16, 'pink'); v.set(13, 16, 16, 'skin'); v.set(13, 17, 16, 'hairBrown'); v.box(12, 15, 16, 14, 15, 16, 'skin'); } },
  } });
// bubble fountain
D('o_boblefontene', { size: [20, 18, 20], scale: 1 / 12,
  build(v) { v.cyl(10, 0, 10, 9, 3, 'pathStone'); v.paint((x, y, z) => ((x + z * 3 + y) % 7 === 0) ? 'stone2' : null); v.cyl(10, 1, 10, 7.6, 2, 0); v.cyl(10, 2, 10, 7.6, 1, 'water'); v.set(5, 2, 9, 'sky'); v.set(13, 2, 13, 'sky');
    v.cyl(10, 2, 10, 1.5, 7, 'pathStone'); v.cyl(10, 9, 10, 4, 1, 'stone2'); v.cyl(10, 10, 10, 4, 1, 'stone2'); v.cyl(10, 10, 10, 3, 1, 'water');
    for (let a = 0; a < 6.28; a += 0.9) v.set(Math.round(10 + Math.cos(a) * 8.5), 3, Math.round(10 + Math.sin(a) * 8.5), ['pink', 'lilac', 'sky'][Math.floor(a) % 3]); },
  parts: { jet: { pivot: [10, 11, 10], build(v) { v.sphere(10, 12.5, 10, 1.4, 'glass'); v.sphere(9, 15, 10, 1.1, 'glass'); v.sphere(11.5, 16.5, 10, 0.9, 'lilac'); v.set(9, 13, 9, 'white'); } } } });
// hot-cocoa stand (snow biome)
D('o_kakaobod', { size: [24, 30, 14], scale: 1 / 12,
  build(v) { v.box(2, 0, 4, 21, 9, 12, 'woodLight'); for (let x = 2; x <= 21; x++) if (Math.floor(x / 2) % 2) v.box(x, 1, 12, x, 8, 12, 'sky'); v.box(2, 10, 4, 21, 10, 12, 'white');
    v.box(2, 0, 3, 3, 22, 3, 'woodDark'); v.box(20, 0, 3, 21, 22, 3, 'woodDark'); for (let i = 0; i < 4; i++) v.box(0, 22 + i, 1 + i, 23, 22 + i, 13 - i, i % 2 ? 'roofRed' : 'red'); v.box(1, 26, 4, 22, 27, 10, 'snow'); v.box(4, 28, 6, 19, 28, 8, 'snow');
    v.cyl(15, 11, 8, 1.3, 3, 'red'); v.cyl(15, 13, 8, 0.9, 1, 'brown'); v.set(15, 14, 8, 'white'); v.cyl(18.5, 11, 8, 1.3, 3, 'sky'); v.cyl(18.5, 13, 8, 0.9, 1, 'brown'); v.set(18, 14, 8, 'white');
    v.box(7, 16, 12, 16, 20, 12, 'cream'); v.box(8, 21, 12, 8, 21, 12, 'woodDark'); v.box(15, 21, 12, 15, 21, 12, 'woodDark'); v.cyl(11.5, 17, 13, 1.6, 3, 'red'); v.box(9, 0, 12, 14, 0, 13, 'snow'); },
  parts: { pot: { pivot: [7, 11, 8], build(v) { v.cyl(7, 11, 8, 2.8, 5, 'steel'); v.cyl(7, 15, 8, 2.2, 1, 'brown'); v.box(10, 14, 8, 11, 14, 8, 'steel'); v.box(3, 14, 8, 4, 14, 8, 'steel'); } } } });
// ice swan sculpture (glassy)
D('o_isskulptur', { size: [20, 26, 18], scale: 1 / 12,
  build(v) { v.box(3, 0, 3, 16, 3, 14, 'snow'); v.box(4, 3, 4, 15, 3, 13, 'ice'); },
  parts: { swan: { pivot: [9.5, 4, 8.5], build(v) { v.ellipsoid(9.5, 7, 8, 4, 3, 5.5, 'crystal'); v.ellipsoid(5.5, 8.5, 7, 1.4, 2.4, 4.5, 'ice'); v.ellipsoid(13.5, 8.5, 7, 1.4, 2.4, 4.5, 'ice');
    for (let i = 0; i <= 10; i++) { const y = 9 + i, z = 12 + Math.round(Math.sin(i / 10 * Math.PI) * 1.8); v.sphere(9.5, y, z, 1.2, 'crystal'); } v.sphere(9.5, 20, 12.5, 1.7, 'crystal'); v.box(9, 20, 14, 10, 20, 16, 'gem2'); v.set(8, 21, 13, 'navySoft'); v.set(11, 21, 13, 'navySoft'); } } } });
// rock pool with a starfish and a little fish
D('o_fjaerepytt', { size: [28, 8, 22], scale: 1 / 12,
  build(v) { for (let x = 0; x < 28; x++) for (let z = 0; z < 22; z++) { const q = ((x - 13.5) / 13.5) ** 2 + ((z - 10.5) / 10.5) ** 2; if (q > 1) continue; if (q > 0.62) v.box(x, 0, z, x, 1 + Math.floor(H3(x, 0, z) * 3), z, H3(x, 1, z) < 0.35 ? 'stone2' : (H3(x, 2, z) < 0.5 ? 'stone' : 'stoneDark')); else v.set(x, 0, z, (x + z) % 6 === 0 ? 'teal' : 'water'); }
    for (const [x, z] of [[8, 6], [19, 15], [6, 13]]) { v.box(x, 1, z, x, 3, z, 'leafDark'); v.set(x + 1, 4, z, 'leaf'); } v.set(16, 1, 6, 'peach'); v.set(10, 1, 15, 'pink'); v.set(17, 1, 7, 'peach'); },
  parts: {
    star: { pivot: [12, 1, 10], build(v) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; v.line(12, 1, 10, Math.round(12 + Math.cos(a) * 3.4), 1, Math.round(10 + Math.sin(a) * 3.4), 'coral'); } v.set(12, 1, 10, 'orange'); v.set(12, 2, 10, 'peach'); } },
    fish: { pivot: [18, 1, 11], build(v) { v.ellipsoid(18, 1, 11, 0.8, 0.6, 1.8, 'butter'); v.box(18, 1, 9, 18, 1, 9, 'orange'); v.set(17, 1, 8, 'orange'); v.set(19, 1, 8, 'orange'); v.set(18, 2, 12, 'black'); } },
  } });
// beach umbrella with a towel and a ball
D('o_parasoll', { size: [26, 32, 26], scale: 1 / 12,
  build(v) { for (let x = 3; x <= 13; x++) for (let z = 8; z <= 24; z++) v.set(x, 0, z, Math.floor(x / 2) % 2 ? 'pink' : 'white'); v.box(17, 0, 18, 19, 3, 20, 'red'); v.box(18, 1, 19, 18, 3, 19, 'sand'); v.line(20, 0, 17, 22, 5, 15, 'sky');
    v.box(12, 0, 12, 13, 2, 13, 'sand'); },
  parts: {
    umb: { pivot: [12.5, 2, 12.5], build(v) { v.box(12, 2, 12, 13, 24, 13, 'white'); for (let y = 23; y <= 28; y++) { const r = (29 - y) * 2.0; for (let x = 0; x < 26; x++) for (let z = 0; z < 26; z++) { const d = Math.hypot(x - 12.5, z - 12.5); if (d <= r && d > r - 2.4) v.set(x, y, z, ['sky', 'white', 'butter', 'white'][Math.floor((Math.atan2(z - 12.5, x - 12.5) + Math.PI) / (Math.PI / 4)) % 4]); } } v.set(12, 29, 12, 'red'); } },
    ball: { pivot: [21, 0, 6], build(v) { v.sphere(21, 2.5, 6, 2.6, 'white'); v.paint((x, y, z) => ['red', 'white', 'sky', 'yellow'][Math.floor((Math.atan2(z - 6, x - 21) + Math.PI) / (Math.PI / 2)) % 4]); } },
  } });
// friendly little tractor
D('o_traktor', { size: [20, 20, 28], scale: 1 / 12,
  build(v) { v.box(6, 4, 14, 13, 9, 25, 'red'); v.box(6, 9, 14, 13, 9, 25, 'roofRed'); v.box(7, 5, 26, 12, 8, 26, 'grey'); v.set(7, 8, 26, 'butter'); v.set(12, 8, 26, 'butter');
    v.box(5, 4, 4, 14, 16, 13, 'red'); v.box(6, 10, 4, 13, 15, 13, 0); v.box(5, 10, 13, 14, 15, 13, 'glass'); v.box(5, 10, 4, 5, 15, 12, 'glass'); v.box(14, 10, 4, 14, 15, 12, 'glass'); v.box(4, 16, 3, 15, 17, 14, 'white');
    v.box(8, 5, 7, 11, 7, 10, 'woodDark'); v.box(9, 8, 9, 10, 9, 10, 'black'); v.cyl(11, 10, 21, 0.9, 5, 'steel');
    for (const x of [5, 14]) { v.box(x, 2, 18, x, 3, 23, 'red'); } },
  parts: {
    wheelL: { pivot: [2.5, 6, 8], build(v) { disc(v, 2, 6, 8, 6, (a, b) => { const d = Math.hypot(a, b); return d > 4.6 ? 'black' : d > 2 ? 'grey' : 'butter'; }, 'x'); disc(v, 3, 6, 8, 5, (a, b) => Math.hypot(a, b) > 4.5 ? 'black' : ((Math.abs(a) < 1 || Math.abs(b) < 1) ? 'butter' : 'grey'), 'x'); } },
    wheelR: { pivot: [16.5, 6, 8], build(v) { disc(v, 17, 6, 8, 6, (a, b) => { const d = Math.hypot(a, b); return d > 4.6 ? 'black' : d > 2 ? 'grey' : 'butter'; }, 'x'); disc(v, 16, 6, 8, 5, (a, b) => Math.hypot(a, b) > 4.5 ? 'black' : ((Math.abs(a) < 1 || Math.abs(b) < 1) ? 'butter' : 'grey'), 'x'); } },
    fwL: { pivot: [4.5, 3, 21], build(v) { disc(v, 4, 3, 21, 3, (a, b) => Math.hypot(a, b) > 2 ? 'black' : 'butter', 'x'); } },
    fwR: { pivot: [15.5, 3, 21], build(v) { disc(v, 15, 3, 21, 3, (a, b) => Math.hypot(a, b) > 2 ? 'black' : 'butter', 'x'); } },
  } });
// swan pedal boat (lake)
D('o_svanebat', { size: [18, 24, 28], scale: 1 / 12,
  build(v) { v.ellipsoid(9, 3, 13, 7.5, 3.2, 11, 'white'); v.box(0, 0, 0, 17, 1, 27, 0); v.ellipsoid(9, 6, 12, 5.5, 3.2, 8, 0); v.ellipsoid(9, 1, 13, 7, 1, 10.5, 'white');
    v.box(5, 3, 8, 12, 4, 11, 'pink'); v.box(5, 5, 7, 12, 8, 7, 'pink');
    for (const x of [1, 16]) for (let z = 6; z <= 18; z++) { const y = 5 + Math.round(Math.sin((z - 6) / 12 * Math.PI) * 3); v.box(x, 3, z, x, y, z, z % 3 ? 'white' : 'cream2'); }
    v.paint((x, y, z, c) => (y === 2 && c === F.PAL.white) ? 'sky' : null); },
  parts: { head: { pivot: [9, 7, 21], build(v) { for (let i = 0; i <= 12; i++) { const y = 6 + i, z = 22 + Math.round(Math.sin(i / 12 * Math.PI) * 2.5) - (i > 9 ? i - 9 : 0); v.sphere(9, y, z, 1.4, 'white'); }
    v.sphere(9, 19, 20, 2, 'white'); v.box(9, 18, 22, 9, 18, 24, 'orange'); v.set(8, 18, 22, 'orange'); v.set(10, 18, 22, 'orange'); v.set(7, 20, 21, 'black'); v.set(11, 20, 21, 'black'); v.set(9, 21, 19, 'pink'); } } } });
// viewing telescope on a stand
D('o_utkikk', { size: [12, 22, 14], scale: 1 / 12,
  build(v) { v.cyl(6, 0, 7, 3.4, 2, 'stone2'); v.box(5, 2, 6, 6, 14, 7, 'navySoft'); v.box(4, 14, 5, 7, 15, 8, 'navySoft'); },
  parts: { scope: { pivot: [5.5, 16, 6.5], build(v) { for (let z = 1; z <= 12; z++) v.cyl(5.5, 15, z, z > 9 ? 1.9 : 1.4, 3, (z === 4 || z === 9) ? 'gold' : 'navySoft'); v.box(5, 15, 13, 6, 17, 13, 'glass'); v.box(5, 16, 0, 6, 16, 0, 'black'); } } } });
D('o_kirsebaer', { size: [6, 8, 4], scale: 1 / 16, build(v) { v.sphere(1.5, 1.5, 1.5, 1.6, 'cherry'); v.sphere(4.5, 1.8, 1.5, 1.6, 'cherry'); v.line(1, 3, 1, 3, 7, 1, 'leafDark'); v.line(4, 3, 1, 3, 7, 1, 'leafDark'); v.box(3, 7, 1, 4, 7, 2, 'leaf'); } });
D('o_skjell2', { size: [7, 3, 6], scale: 1 / 16, build(v, o) { for (let x = 0; x < 7; x++) for (let z = 0; z < 6; z++) { const d = Math.hypot(x - 3, z); if (d > 5.6) continue; v.set(x, 0, z, Math.floor(Math.atan2(z, x - 3) * 4) % 2 ? (o.c || 'peach') : 'coral'); if (d < 4) v.set(x, 1, z, o.c || 'peach'); } v.box(2, 0, 0, 4, 0, 0, 'coral'); },
  meta: { group: 'effekt', variants: { c: ['peach', 'pink', 'white'] } } });
D('o_boble', { size: [10, 10, 10], scale: 1 / 12, build(v) { v.sphere(4.5, 4.5, 4.5, 4.6, 'glass'); v.set(2, 7, 7, 'white'); v.set(3, 8, 7, 'white'); v.clear(2, 2, 2, 7, 7, 7); } });

/* ---- wave-2 types */
const V3w = (x, y, z) => new THREE.Vector3(x, y, z);
T('v_teppebamse', { name: 'bamsepikniken', models: ['o_teppebamse'], needs: ['teddy'], radius: 1.1, solid: false, ext: true, biomes: { Blomstereng: 2, Innsjø: 1, Frukthage: 1, Lavendelåker: 1 },
  play: [
    [['wobble', { part: 'teddy', axis: 'z', amp: 0.3, n: 4, sound: 'squeak' }], ['hearts'], say('obj_teppebamse')],
    [['dance', { part: 'teddy', ms: 2200 }], say('obj_teppebamse_2')],
    [['bounce', { part: 'teddy', h: 0.2, sound: 'squeak' }], ['pop', { model: ['kjeks', 'o_kjeks'], n: 3, size: 0.16, from: 'base' }], say('obj_teppebamse_3')],
  ] });
T('v_hengekoye', { name: 'hengekøya', models: ['o_hengekoye'], needs: ['seat'], radius: 1.4, reach: 2.6, ext: true, biomes: { Frukthage: 2, Strand: 1.5, Blomstereng: 1, Innsjø: 1 },
  tick(th, dt, t) { const s = th.parts.seat; if (s && !s.userData._an) s.rotation.x = Math.sin(t * 1.2 + th.t0) * 0.06; },
  play: [
    [['ride', { mode: 'part', part: 'seat', ms: 3800, dy: -0.45, with: ['swing', { part: 'seat', axis: 'x', amp: 0.4, n: 4 }] }], say('obj_hengekoye')],
    [['swing', { part: 'seat', axis: 'x', amp: 0.5, n: 3, ms: 1800, sound: 'swish' }], ['fly', { model: 'o_sommerfugl', birds: 3, size: 0.18, from: 0.4 }], say('obj_hengekoye_2')],
  ] });
T('v_isvogn', { name: 'isvogna', models: ['o_isvogn'], needs: ['umbrella'], radius: 1.0, ext: true, biomes: { Strand: 3, Landsby: 2, Blomstereng: 1, Innsjø: 1 },
  init(th) { readSign(th, 'is'); }, dispose: dropSign,
  play: [
    [['ring', { n: 2, f: 1568, part: 'bell' }], ['spin', { part: 'umbrella', turns: 1, ms: 1200, sound: 'whoosh' }], ['pop', { model: ['iskrem', 'o_iskule'], size: 0.3, opts: { c: 'pink' } }], say('obj_isvogn')],
    [['ring', { n: 1, f: 1568, part: 'bell' }], countNat('count', { model: 'o_iskule', size: 0.22, opts: { c: 'butter' }, lo: 2, hi: 6, fixed: true })],
  ] });
// snail race: three numbered snails; the winner's number is said
T('n_sneglelop', { name: 'sneglerace', models: ['o_sneglelop'], needs: ['sn0'], radius: 1.9, solid: false, reach: 2.6, ext: true, biomes: { Blomstereng: 1.5, Frukthage: 1.5, Innsjø: 1, Gårdsland: 1, Landsby: 1 },
  // v5 WP-W #28: unsigned shifts (a hash ≥ 2³¹ made d ≤ 0 → «16/16/16»); natural race bibs 1–20, always three different numbers
  init(th) { const h = hashOf(th) >>> 0, d = 1 + (h >>> 4) % 3, base = 1 + (h >>> 7) % (20 - 2 * d); th._nums = [base, base + d, base + d * 2]; if (h % 2) th._nums.reverse(); try { snailTally(th); } catch (e) { console.error('[snail] tally', e); }
    th._nums.forEach((n, i) => { const s = th.parts['sn' + i]; if (!s) return; const a = new THREE.Object3D(); a.position.set(0, 0.62, -0.06); s.add(a); label(th, a, String(n), { kind: 'num', maxDist: 18, size: 26 }); }); },
  tick(th, dt, t) { labelsByZoom(th); if (th.busy) return; for (let i = 0; i < 3; i++) { const s = th.parts['sn' + i]; if (s && !s.userData._an) s.position.y = (s.userData.y0 != null ? s.userData.y0 : (s.userData.y0 = s.position.y)) + Math.max(0, Math.sin(t * 2 + i * 2)) * 0.015; } },
  hook: th => OBJ.wordHook(th, 'snegl', { key: 'n_sneglelop' }),     // v5c WP-W2 (ORD Or-U): «Vi sier: treg som en snegle!» + its meaning
  press: th => F.BEH.react(th, [snailRace]) });
// v5c WP-W2 (longevity hook #19, DATA pre-teach): a tally board – each snail's wins over the days as tally marks at its lane start
// («||||| ||»), saved in th.state.wins; after 20 wins in all a new season starts. Visual only (no question, no new speech).
const tallyText = n => { let t = ''; for (let i = 0; i < n; i++) t += (i && i % 5 === 0 ? ' ' : '') + '|'; return t; };
function snailTally(th) {
  const W = th.state.wins; if (!W || !W.some(x => x > 0)) return;
  th._tally = th._tally || [];
  [0, 1, 2].forEach(i => {
    const s = th.parts['sn' + i]; if (!s || !s.parent) return;
    if (!th._tally[i]) {     // anchored on the thing (metres), above the snail's start – the label stays at the lane start while it races
      th.obj.updateMatrixWorld(true); const wp = s.getWorldPosition(new THREE.Vector3()), lp = th.obj.worldToLocal(wp.clone());
      const sc = th.obj.scale.x || 1, a = new THREE.Object3D(); a.position.set(lp.x, lp.y + 1.45 / sc, lp.z - 0.3 / sc); th.obj.add(a);
      th._tally[i] = label(th, a, tallyText(W[i] || 0) || ' ', { kind: 'num', maxDist: 16, size: 18 }); }
    else if (th._tally[i].set) th._tally[i].set(tallyText(W[i] || 0) || ' ');
  });
}
async function snailRace(th) {
  const sn = [0, 1, 2].map(i => th.parts['sn' + i]).filter(Boolean); if (sn.length < 3) return F.BEH.run(th, 'wobble', {});
  const U2 = F.BEH.util; const win = Math.floor(Math.random() * 3), len = 15 / 12, ms = 4200;
  th._race = (th._race || 0) + 1;
  await F.BEH.run(th, 'ring', { n: 1, f: 1320 });
  F.SAYF('obj_sneglelop');
  const sp = sn.map((s, i) => i === win ? 1 : 0.7 + Math.random() * 0.22), z0 = sn.map(s => s.position.z);
  await F.T.tween(ms, k => { sn.forEach((s, i) => { const f = Math.min(1, k * sp[i]); s.position.z = z0[i] + len * (f + Math.sin(k * 40 + i) * 0.006); s.scale.z = 1 + Math.sin(k * 30 + i * 2) * 0.06; }); if ((k * 20 | 0) !== th._rk) { th._rk = k * 20 | 0; U2.snd('squeak'); } });
  const w = sn[win]; U2.snd('tada'); F.FX.burst(U2.wpos(w).add(V3w(0, 0.6, 0)), { n: 30, colors: [0xffd166, 0xff8fab, 0x9fe6c4, 0xb9a5f0], speed: 2, up: 3 });
  const h = U2.halo(w, 'butter', 1.1, V3w(0, 0.45, 0));
  await U2.anim(w, 700, (k, b) => { w.position.y = b.p.y + Math.sin(k * Math.PI * 2) * 0.12; });
  await F.SAY('obj_sneglelop_vinner', { n: (th._nums || [1, 2, 3])[win] });
  await F.T.sleep(600); U2.killHalo(h);
  const zEnd = sn.map(s => s.position.z);
  await F.T.tween(1600, k => sn.forEach((s, i) => { s.position.z = zEnd[i] + (z0[i] - zEnd[i]) * U2.ease.inOut(k); s.scale.z = 1; }));
  // back at the start: one more mark on the winner's tally (a new season after 20 races)
  try { let Wn = (th.state.wins || [0, 0, 0]).slice(); if (Wn.reduce((a, b) => a + b, 0) >= 20) Wn = [0, 0, 0]; Wn[win]++; F.Things.setState(th, { wins: Wn }); snailTally(th); } catch (e) { console.error('[snail] tally', e); }
}
T('v_bjellebro', { home: ['F44'], homePlace: 'bro', name: 'bjellebroen', models: ['o_bjellebro'], needs: ['bell'], radius: 1.4, solid: false, reach: 3, ext: true, biomes: { Innsjø: 2, Gårdsland: 1, Landsby: 1, Blomstereng: 1, Frukthage: 0.6 },
  play: [
    [['ring', { n: 3, part: 'bell', f: 1175, rise: true }], crossBridge, say('obj_bjellebro')],
    [['ring', { n: 1, part: 'bell', f: 1397 }], ['pop', { model: ['fisk', 'o_fisk'], size: 0.3, life: 2200, sound: 'splash' }], ['splash', { n: 18 }], say('obj_bjellebro_2')],
  ] });
async function crossBridge(th) {
  if (th.space !== F.Space.cur) return F.T.sleep(1500);
  const U2 = F.BEH.util, c = Math.cos(th.ry), s = Math.sin(th.ry), L = 1.6, base = th.obj.position;
  let lastStep = -1;
  await U2.carry(k => { const x = (k - 0.5) * 2 * L, y = 0.18 + Math.sin(k * Math.PI) * 0.42; const st = Math.floor(k * 8); if (st !== lastStep) { lastStep = st; U2.snd('pluck', F.note([0, 2, 4, 5, 7, 9, 11, 12][Math.min(7, st)] + 12)); }
    return V3w(base.x + x * c, base.y + y, base.z - x * s); }, 2600, { face: th.ry + Math.PI / 2 });
}
T('v_onskebronn', { name: 'ønskebrønnen', models: ['o_onskebronn'], radius: 0.9, ext: true, biomes: { Blomstereng: 1.5, Landsby: 1.5, Lavendelåker: 1, Snøhaugen: 0.6, Frukthage: 0.6 },
  play: [
    [wishToss, ['glow', { color: 'gem2', y: 0.25 }], ['surprise', { kind: 'rainbow' }], say('obj_onskebronn')],
    [['steam', { fx: 'heart', n: 5 }], ['note', { scale: 'penta', inst: 'bell', n: 4, oct: 24 }], say('obj_onskebronn_2')],
  ] });
async function wishToss(th) {
  const U2 = F.BEH.util, f = U2.spawnModel(th, 'o_blomst', { size: 0.3, opts: { c: U.pick(Math.random, ['pink', 'butter', 'lilac']) } });
  const P = F.Player.obj.position, from = V3w(P.x, P.y + 1, P.z), to = U2.baseOf(th).add(V3w(0, 0.3, 0));
  U2.snd('whoosh');
  await F.T.tween(800, k => { f.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 1.2, from.z + (to.z - from.z) * k); f.rotation.z = k * 6; });
  if (f.parent) f.parent.remove(f);
  U2.snd('splash'); F.FX.ring(to, 0xffffff); U2.burst(to, 'water', { n: 16, up: 2 }); U2.burst(to.clone().add(V3w(0, 0.4, 0)), 'star', { n: 20, up: 3 });
}
T('n_solsikkering', { name: 'solsikkeringen', models: ['o_solsikkering'], needs: ['f0'], radius: 1.4, solid: false, reach: 2.8, ext: true, biomes: { Lavendelåker: 3, Gårdsland: 1, Blomstereng: 1.5 },
  tick(th, dt, t) { for (let i = 0; i < 5; i++) { const f = th.parts['f' + i]; if (f && !f.userData._an) f.rotation.z = Math.sin(t * 0.8 + i * 1.3) * 0.06; } },
  play: [
    [['note', { parts: ['f0', 'f1', 'f2', 'f3', 'f4'], scale: 'major', inst: 'piano', n: 5, gap: 130 }], say('obj_solsikkering')],
    [['spin', { part: 'f0', axis: 'z', turns: 1, ms: 1000, bg: true }], ['spin', { part: 'f2', axis: 'z', turns: -1, ms: 1000, bg: true }], ['spin', { part: 'f4', axis: 'z', turns: 1, ms: 1000, bg: true }],
      ['spin', { part: 'f1', axis: 'z', turns: -1, ms: 1000, bg: true }], ['spin', { part: 'f3', axis: 'z', turns: 1, ms: 1000 }], ['fx', { kind: 'petal', n: 30 }], say('obj_solsikkering_2')],
  ] });
T('v_dragefest', { name: 'dragene', models: ['o_dragefest'], needs: ['k0'], radius: 0.6, solid: false, ext: true, biomes: { Vindmølleåsene: 3, Strand: 2, Blomstereng: 0.6 },
  tick(th, dt, t) { for (let i = 0; i < 3; i++) { const k = th.parts['k' + i]; if (k && !k.userData._an) { k.rotation.z = Math.sin(t * 0.7 + i * 2.1 + th.t0) * 0.06; k.rotation.x = Math.sin(t * 0.5 + i) * 0.04; } } },
  play: [
    [['swing', { part: 'k0', axis: 'z', amp: 0.22, n: 3, ms: 2400, bg: true, sound: 'whoosh' }], ['swing', { part: 'k1', axis: 'z', amp: -0.18, n: 3, ms: 2400, bg: true }], ['swing', { part: 'k2', axis: 'z', amp: 0.2, n: 3, ms: 2400 }], ['fx', { kind: 'confetti', y: 1, n: 24 }], say('obj_dragefest')],
    [['swing', { part: 'k1', axis: 'x', amp: 0.25, n: 2, ms: 1800, bg: true, sound: 'whoosh' }], ['fly', { birds: 3, from: 0.95 }], say('obj_dragefest_2')],
  ] });
T('n_liljedam', { hook: th => OBJ.firstHook(() => OBJ.vitAsk(th, 'frosk', { kinds: ['mat', 'unge'], after: happy('ribbit') }), () => OBJ.animalX(th, 'frosk', { vis: { '*': [['splash', { n: 12 }]] } })), home: ['F52', 'F44'], homePlace: 'pond', name: 'liljedammen', models: ['o_liljedam'], needs: ['s0'], radius: 1.5, solid: false, reach: 2.8, ext: true, biomes: { Blomstereng: 1.5, Innsjø: 1, Lavendelåker: 1, Frukthage: 1 },
  play: [
    [th => hopAcross(th, ['s0', 's1', 's2', 's3']), ['splash', { n: 16 }], say('obj_liljedam')],
    [['bounce', { part: 'frog', h: 0.45, n: 2, sound: 'ribbit' }], ['splash', { n: 20 }], say('obj_liljedam_2')],
  ] });
async function hopAcross(th, names) {
  const U2 = F.BEH.util, stones = names.map(n => th.parts[n]).filter(Boolean);
  if (!stones.length) return F.BEH.run(th, 'bounce', {});
  const per = 650;
  stones.forEach((s, i) => F.T.timeout(() => { U2.snd('boing'); U2.snd('pling', i * 2); U2.anim(s, 300, (k, b) => { s.position.y = b.p.y - Math.sin(k * Math.PI) * 0.05; }); }, i * per + per * 0.5));
  if (th.space === F.Space.cur) await U2.carry(k => { const idx = Math.min(stones.length - 1, Math.floor(k * stones.length)); const f = k * stones.length - idx; return U2.wpos(stones[idx]).add(V3w(0, 0.12 + Math.sin(f * Math.PI) * 0.5, 0)); }, stones.length * per);
  else await F.T.sleep(stones.length * per);
}
T('v_telt', { home: ['F78'], homePlace: 'leir', name: 'teltet', models: ['o_telt'], needs: ['door'], radius: 1.1, ext: true, biomes: { Innsjø: 1.5, Vindmølleåsene: 1, Strand: 1, Blomstereng: 1 },
  init(th) { const c = th.parts.cat; if (c) c.visible = true; },
  tick(th, dt, t) { const c = th.parts.cat; if (c && !c.userData._an) c.scale.y = 1 + Math.sin(t * 1.6) * 0.05; },
  play: [
    [['open', { part: 'door', axis: 'y', angle: -1.5, hold: 2400, bg: true }], ['open', { part: 'door2', axis: 'y', angle: 1.5, hold: 2400, bg: true }], ['wait', { ms: 500 }], ['squash', { part: 'cat', amt: 0.3, ms: 900 }], ['sound', { name: 'meow' }], say('obj_telt')],
    [snore, say('obj_telt_2')],
  ] });
async function snore(th) {
  const U2 = F.BEH.util;
  for (let i = 0; i < 3; i++) { F.FX.float('z', U2.topOf(th, 0.6).add(V3w(0.2 + i * 0.15, i * 0.2, 0.5))); U2.snd('purr'); await U2.anim(th.parts.cat || th.obj, 600, (k, b) => { const o = th.parts.cat || th.obj; o.scale.y = b.s.y * (1 + Math.sin(k * Math.PI) * 0.12); }); }
}
T('v_vindfloy', { name: 'vindfløya', models: ['o_vindfloy'], needs: ['rooster'], radius: 0.4, ext: true, biomes: { Gårdsland: 2, Vindmølleåsene: 2, Landsby: 1 },
  tick(th, dt, t) { const r = th.parts.rooster; if (r && !r.userData._an) r.rotation.y = Math.sin(t * 0.25 + th.t0) * 0.8; },
  play: [
    [['spin', { part: 'rooster', turns: 2, ms: 1700, sound: 'whoosh' }], ['fx', { kind: 'leaf', n: 22 }], say('obj_vindfloy')],
    [['sound', { name: 'kykeliky' }], ['wobble', { part: 'rooster', axis: 'z', amp: 0.25, n: 5 }], say('obj_vindfloy_2')],
  ] });
T('n_blomsterskremsel', { name: 'fugleskremselet', models: ['o_blomsterskremsel'], needs: ['arms'], radius: 0.6, ext: true, biomes: { Gårdsland: 2, Frukthage: 1, Lavendelåker: 1, Blomstereng: 1 },
  play: [
    [['swing', { part: 'arms', axis: 'z', amp: 0.25, n: 4, ms: 1600, sound: 'rustle' }], ['fly', { birds: 3, from: 0.65 }], say('obj_blomsterskremsel')],
    [['dance', { ms: 2000 }], ['fx', { kind: 'petal', n: 30 }], say('obj_blomsterskremsel_2')],
    [['wobble', { part: 'head', axis: 'z', amp: 0.3, n: 4, sound: 'giggle' }], ['pop', { model: 'o_blomst', n: 2, size: 0.35 }], say('obj_blomsterskremsel_3')],
  ] });
// toy train: loco + 2 wagons run on the oval (a = 16, b = 9.5 voxels at 1/12 m)
const TRAIN = { a: 16 / 12, b: 9.5 / 12, gap: 0.62 };
function placeTrain(th, th0) {
  const cars = ['loco', 'w1', 'w2'].map(n => th.parts[n]); if (!cars[0]) return;
  cars.forEach((c, i) => { if (!c) return; const a = th0 - i * TRAIN.gap; c.position.x = Math.cos(a) * TRAIN.a; c.position.z = Math.sin(a) * TRAIN.b; c.rotation.y = Math.atan2(-Math.sin(a) * TRAIN.a, Math.cos(a) * TRAIN.b); });
}
T('v_togbane', { name: 'togbanen', models: ['o_togbane'], needs: ['loco'], radius: 1.6, solid: false, reach: 3, ext: true, biomes: { Landsby: 2, Gårdsland: 1, Blomstereng: 1 },
  init(th) { th._tt = 0.6; placeTrain(th, th._tt); },
  play: [
    [['sound', { name: 'toot' }], th => driveTrain(th, 1, 4200), say('obj_togbane')],
    [['sound', { name: 'toot' }], th => driveTrain(th, 2, 4600, true), say('obj_togbane_2')],
  ] });
async function driveTrain(th, laps, ms, puff) {
  const U2 = F.BEH.util, a0 = th._tt || 0; let n = 0;
  await F.T.tween(ms, k => { th._tt = a0 + U2.ease.inOut(k) * laps * Math.PI * 2; placeTrain(th, th._tt); if (puff && (n++ % 6 === 0) && th.parts.loco) U2.burst(U2.wpos(th.parts.loco).add(V3w(0, 0.6, 0)), 'smoke', { n: 3, speed: 0.3, up: 1.2, gravity: -0.5, size: 0.08 }); if ((k * 16 | 0) !== th._tk) { th._tk = k * 16 | 0; U2.snd('step'); } });
  U2.snd('toot');
}
T('v_dukketeater', { home: ['F55'], homePlace: 'teater', name: 'dukketeateret', models: ['o_dukketeater'], needs: ['curtL'], radius: 1.0, ext: true, biomes: { Landsby: 2, Blomstereng: 1, Innsjø: 0.6 },
  init(th) { ['p1', 'p2'].forEach(n => { const p = th.parts[n]; if (p) p.visible = false; }); },
  play: [
    [['open', { part: 'curtL', axis: 'y', angle: -1.35, hold: 3200, bg: true }], ['open', { part: 'curtR', axis: 'y', angle: 1.35, hold: 3200, bg: true, sound: 'swish' }], ['wait', { ms: 450 }],
      ['emerge', { part: 'p1', h: 0.42, hold: 1500, sound: 'boing', hide: true, bg: true }], ['wait', { ms: 500 }], ['emerge', { part: 'p2', h: 0.42, hold: 1100, sound: 'boing', hide: true }], ['sound', { name: 'clap' }], say('obj_dukketeater')],
    [['open', { part: 'curtL', axis: 'y', angle: -1.35, hold: 2600, bg: true }], ['open', { part: 'curtR', axis: 'y', angle: 1.35, hold: 2600, bg: true, sound: 'swish' }], ['wait', { ms: 400 }],
      ['emerge', { part: 'p1', h: 0.42, hold: 1800, hide: true, bg: true }], ['emerge', { part: 'p2', h: 0.42, hold: 1800, hide: true, bg: true }], ['sound', { name: 'tune' }], ['fx', { kind: 'note', y: 1, n: 16 }], say('obj_dukketeater_2')],
  ] });
T('v_sandkasse', { home: ['F59', 'F60'], homePlace: 'mason', name: 'sandkassa', models: ['o_sandkasse'], needs: ['bucket'], radius: 1.2, solid: false, ext: true, biomes: { Strand: 2, Landsby: 1.5, Innsjø: 1 },
  play: [
    [['pour', { part: 'bucket', axis: 'z', angle: -2.4, ms: 1100, fx: 'sand' }], ['cycle', { parts: ['t1', 't2', 't3'], fx: 'sand', wrapFx: 'water', sound: 'pop' }], say('obj_sandkasse')],
    [['swing', { part: 'spade', axis: 'x', amp: 0.6, n: 3, ms: 1200, sound: 'swish' }], ['fx', { kind: 'sand', at: 'base', n: 24 }], ['pop', { model: 'o_skjell2', size: 0.18, opts: { c: 'pink' } }], say('obj_sandkasse_2')],
  ] });
T('n_spilledasetre', { name: 'spilledåsetreet', models: ['o_spilledasetre'], needs: ['crank'], radius: 0.9, reach: 2.4, ext: true, biomes: { Blomstereng: 1.5, Lavendelåker: 1, Frukthage: 1, Landsby: 0.5 },
  play: [
    [['spin', { part: 'crank', axis: 'x', turns: 3, ms: 2200, bg: true, sound: 'creak' }], ['sound', { name: 'musicbox' }], ['spin', { part: 'dancer', turns: 3, ms: 2200 }], ['fx', { kind: 'note', y: 0.6, n: 18 }], say('obj_spilledasetre')],
    [['shake', { fx: 'petal', n: 26 }], ['fly', { birds: 3, from: 0.8 }], ['note', { scale: 'penta', inst: 'pluck', n: 4, oct: 24 }], say('obj_spilledasetre_2')],
  ] });
T('v_boblefontene', { name: 'boblefontenen', models: ['o_boblefontene'], needs: ['jet'], radius: 1.1, ext: true, biomes: { Landsby: 2, Blomstereng: 1, Lavendelåker: 1, Snøhaugen: 0.5 },
  tick(th, dt, t) { const j = th.parts.jet; if (j && !j.userData._an) j.position.y = (j.userData.y0 != null ? j.userData.y0 : (j.userData.y0 = j.position.y)) + Math.sin(t * 2.2) * 0.04;
    if (th.space === F.Space.cur && (th._bt = (th._bt || 0) + dt) > 1.6 && Math.hypot(th.x - F.Player.pos.x, th.z - F.Player.pos.z) < 22) { th._bt = 0; F.BEH.util.burst(F.BEH.util.topOf(th, 0.85), 'bubble', { n: 2, speed: 0.3, up: 1, gravity: -0.6, life: 2, size: 0.12 }); } },
  play: [
    [['fx', { kind: 'bubble', n: 34, up: 2.6, gravity: -1, speed: 1.2 }], ['note', { scale: 'penta', inst: 'pluck', n: 4, oct: 24 }], say('obj_boblefontene')],
    [bigBubble, say('obj_boblefontene_2')],
  ] });
async function bigBubble(th) {
  const U2 = F.BEH.util, b = U2.spawnModel(th, 'o_boble', { size: 0.9 }), p0 = U2.topOf(th, 0.9), s = b.scale.x;
  U2.snd('grow'); b.position.copy(p0);
  await F.T.tween(2400, k => { b.position.set(p0.x + Math.sin(k * 6) * 0.3, p0.y + k * 2.4, p0.z); b.scale.setScalar(s * (0.2 + 0.8 * Math.min(1, k * 2))); b.rotation.y = k * 3; });
  U2.snd('pop'); U2.burst(b.position.clone(), 'bubble', { n: 30, speed: 2, up: 1, gravity: 0.5, size: 0.1 }); if (b.parent) b.parent.remove(b);
}
T('v_kakaobod', { name: 'kakaoboden', models: ['o_kakaobod'], needs: ['pot'], radius: 1.1, ext: true, biomes: { Snøhaugen: 3 },
  init(th) { readSign(th, 'kakao'); }, dispose: dropSign,
  play: [
    [['steam', { fx: 'smoke', n: 5 }], ['pour', { part: 'pot', axis: 'z', angle: -0.8, ms: 1300, fx: 'honey' }], ['hearts'], say('obj_kakaobod')],
    [['ring', { n: 2, f: 1320 }], ['steam', { fx: 'heart', n: 4 }], say('obj_kakaobod_2')],
  ] });
T('n_isskulptur', { name: 'isvanen', models: ['o_isskulptur'], needs: ['swan'], radius: 0.9, ext: true, biomes: { Snøhaugen: 2 },
  play: [
    [['glow', { color: 'ice' }], ['note', { scale: 'penta', inst: 'crystal', n: 4, oct: 24 }], say('obj_isskulptur')],
    [['spin', { part: 'swan', turns: 1, ms: 1600, sound: 'chime' }], ['fx', { kind: 'snow', n: 30 }], say('obj_isskulptur_2')],
  ] });
T('n_fjaerepytt', { name: 'fjærepytten', models: ['o_fjaerepytt'], needs: ['star'], radius: 1.2, solid: false, ext: true, biomes: { Strand: 3 },
  tick(th, dt, t) { const f = th.parts.fish; if (f && !f.userData._an) { f.rotation.y = Math.sin(t * 0.8 + th.t0) * 0.9; } },
  play: [
    [['spin', { part: 'star', turns: 1, ms: 1200, sound: 'squeak' }], ['wobble', { part: 'star', axis: 'x', amp: 0.3 }], say('obj_fjaerepytt')],
    [['swing', { part: 'fish', axis: 'y', amp: 1.4, n: 4, ms: 1600, sound: 'splash' }], ['splash', { n: 18 }]],
    [['sound', { name: 'splash' }], countNat('count', { model: 'o_skjell2', size: 0.16, opts: { c: 'peach' }, lo: 4, hi: 9 })],
  ] });
T('v_parasoll', { name: 'parasollen', models: ['o_parasoll'], needs: ['umb'], radius: 1.0, solid: false, ext: true, biomes: { Strand: 3, Innsjø: 0.6 },
  play: [
    [['spin', { part: 'umb', turns: 2, ms: 1600, sound: 'whoosh' }], ['bounce', { part: 'ball', h: 0.5, n: 2 }], say('obj_parasoll')],
    [['bounce', { part: 'ball', h: 0.7, n: 3, grow: true }], ['fx', { kind: 'sand', at: 'base', n: 20 }], say('obj_parasoll_2')],
  ] });
T('v_traktor', { name: 'traktoren', models: ['o_traktor'], needs: ['wheelL'], radius: 1.0, ext: true, biomes: { Gårdsland: 2.5, Frukthage: 0.6 },
  play: [
    [['sound', { name: 'toot' }], ['spin', { part: 'wheelL', axis: 'x', turns: 3, ms: 4200, bg: true }], ['spin', { part: 'wheelR', axis: 'x', turns: 3, ms: 4200, bg: true }],
      ['ride', { mode: 'circle', r: 1.8, ms: 4200, terrain: true, seatY: 0.62, jiggle: 0.02, sound: 'step' }], say('obj_traktor')],
    [['sound', { name: 'toot' }], ['steam', { fx: 'smoke', n: 4 }], ['bounce', { h: 0.15, n: 2 }], say('obj_traktor_2')],
  ] });
T('v_svanebat', { name: 'svanebåten', models: ['o_svanebat'], needs: ['head'], radius: 1.0, reach: 3, ext: true, water: true, biomes: { Innsjø: 2 },
  tick(th, dt, t) { if (!th.obj.userData._an) th.obj.rotation.z = Math.sin(t * 1.1 + th.t0) * 0.03; },
  play: [
    [['bob', { ms: 900 }], ['ride', { mode: 'circle', r: 2.2, ms: 5200, wake: true, sound: 'splash', seatY: 0.25 }], say('obj_svanebat')],
    [['wobble', { part: 'head', axis: 'x', amp: 0.3, n: 4, sound: 'honk' }], ['bob']],
  ] });
T('v_utkikk', { home: ['F65'], homePlace: 'window', name: 'kikkerten', models: ['o_utkikk'], needs: ['scope'], radius: 0.4, ext: true, biomes: { Vindmølleåsene: 2, Strand: 1.5, Innsjø: 1 },
  init(th) { const s = th.parts.scope; if (s) s.rotation.x = -0.28; },
  play: [
    [['spin', { part: 'scope', turns: 1, ms: 1400, sound: 'creak' }], ['view', { dist: 60, ms: 3500 }], say('obj_utkikk')],
    [['wobble', { part: 'scope', axis: 'x', amp: 0.3 }], ['fly', { birds: 2 }], say('obj_utkikk_2')],
  ] });
T('n_kirsebaertre', { name: 'kirsebærtreet', models: ['o_epletre'], needs: ['crown'], modelOpts: { crown: 'blossom', c: 'cherry' }, radius: 0.9, reach: 2.6, ext: true, biomes: { Frukthage: 3, Blomstereng: 1, Landsby: 0.5 },
  // v5c WP-W2 (plants deck): the blossom with a bee – «Blomsten lager frø.»
  hook: th => OBJ.trueLine(th, 'hk_blomst_fro', { vis: [['shake', { part: 'crown', fx: 'petal', n: 20 }], ['fly', { model: 'o_bie', birds: 2, ms: 2000, size: 0.12 }]] }),
  play: [
    [['shake', { part: 'crown', fx: 'petal', n: 30 }], ['fx', { kind: 'petal', n: 40, y: 1.05, gravity: 0.5, speed: 1.4, up: 0.4 }], say('obj_kirsebaertre')],
    [['shake', { part: 'crown', fx: 'petal' }], ['drop', { model: 'o_kirsebaer', n: 5, size: 0.2, life: 3000 }], ['fly', { birds: 2 }], say('obj_kirsebaertre_2')],
  ] });

/* =================================================================== extras in the world (additive chunk generator)
   WORLD's biome tables place the DESIGN types; this adds ~1–2 of the invented extras per chunk (butterflies, frogs, ducks,
   swings, benches, lamp posts …) on free cells. Deterministic per chunk. Tune / disable: F.OBJ.extrasPerChunk (0 = off). */
const BIOME_KEY = { blomstereng: 'Blomstereng', gardsland: 'Gårdsland', frukthage: 'Frukthage', innsjo: 'Innsjø', strand: 'Strand', vindmolle: 'Vindmølleåsene', lavendel: 'Lavendelåker', snohaugen: 'Snøhaugen' };
OBJ.extrasPerChunk = 2.2;
OBJ.noAuto = { v_brygge: 1 };
if (F.W && F.W.chunkGens) F.W.chunkGens.push(ctx => {
  if (!(OBJ.extrasPerChunk > 0) || !F.W.biomeAt || F.W.objTables) return;
  const r = U.rng(U.hashStr('objx' + ctx.key + ':' + F.W.seed));
  const want = Math.floor(OBJ.extrasPerChunk) + (r() < OBJ.extrasPerChunk % 1 ? 1 : 0);
  let placed = 0;
  for (let tries = 0; tries < 22 && placed < want; tries++) {
    const x = ctx.x0 + 2 + r() * (ctx.S - 4), z = ctx.z0 + 2 + r() * (ctx.S - 4), pick = r(), rot = r();
    const b = F.W.biomeAt(x, z); if (!BIOME_KEY[b]) continue;
    let key = BIOME_KEY[b];
    try { const reg = F.W.region && F.W.region(x, z); if (reg && reg.kind === 'village' && reg.center && Math.hypot(x - reg.center.x, z - reg.center.z) < 40) key = 'Landsby'; } catch (e) {}
    const wet = !!(F.W.water && F.W.water(x, z));
    // water extras (frog, ducks, rowing boat) float near a shore she can stand on (reach ≈ 2 m)
    if (wet) { let shore = false; for (let a = 0; a < 8 && !shore; a++) { const sx = x + Math.cos(a * 0.785) * 2.2, sz = z + Math.sin(a * 0.785) * 2.2; if (!F.W.water(sx, sz)) shore = true; } if (!shore) continue; }
    const cand = OBJ.list.filter(t => OBJ.types[t].ext && !OBJ.noAuto[t] && OBJ.types[t].biomes[key] && !!OBJ.types[t].water === wet);
    if (!cand.length) continue;
    let tot = 0; cand.forEach(t => { tot += OBJ.types[t].biomes[key]; });
    let acc = 0, type = cand[cand.length - 1]; for (const t of cand) { acc += OBJ.types[t].biomes[key]; if (pick * tot <= acc) { type = t; break; } }
    const rad = OBJ.types[type].radius * 1.4 + 0.5;
    if (!ctx.free(x, z, rad)) continue;
    ctx.claim(x, z, rad);
    ctx.spawn(type, x, z, { id: 'ox' + ctx.key + ':' + placed, ry: (rot - 0.5) * 0.9, data: OBJ.dataFor(type, r) });
    placed++;
  }
  // lakes are small: a dedicated pass looks for lake water near a shore and floats one water extra there
  const rw = U.rng(U.hashStr('objw' + ctx.key + ':' + F.W.seed));
  const lake = F.W.biomeAt(ctx.x0 + ctx.S / 2, ctx.z0 + ctx.S / 2) === 'innsjo';
  for (let tries = 0; tries < (lake ? 60 : 12); tries++) {
    const x = ctx.x0 + 1 + rw() * (ctx.S - 2), z = ctx.z0 + 1 + rw() * (ctx.S - 2), pick = rw();
    if (!F.W.water || !F.W.water(x, z) || F.W.biomeAt(x, z) === 'hav') continue;
    let shore = false; for (let a = 0; a < 8 && !shore; a++) if (!F.W.water(x + Math.cos(a * 0.785) * 2.2, z + Math.sin(a * 0.785) * 2.2)) shore = true;
    if (!shore || !ctx.free(x, z, 1)) continue;
    const cand = OBJ.list.filter(t => OBJ.types[t].ext && OBJ.types[t].water && !OBJ.noAuto[t]);
    let tot = 0; cand.forEach(t => { tot += OBJ.types[t].biomes['Innsjø'] || 1; });
    let acc = 0, type = cand[0]; for (const t of cand) { acc += OBJ.types[t].biomes['Innsjø'] || 1; if (pick * tot <= acc) { type = t; break; } }
    ctx.claim(x, z, 1);
    ctx.spawn(type, x, z, { id: 'ow' + ctx.key, ry: (pick - 0.5) * 1.2 });
    break;
  }
});

/* =================================================================== helpers for WORLD */
const bkey = b => BIOME_KEY[b] || b; // accepts WORLD's ascii biome ids ('gardsland') or the DESIGN names ('Gårdsland')
OBJ.forBiome = biome => { const k = bkey(biome); return OBJ.list.filter(t => OBJ.types[t].biomes[k]).map(t => [t, OBJ.types[t].biomes[k]]); };
OBJ.spots = biome => { const k = biome && bkey(biome); return OBJ.list.filter(t => OBJ.types[t].spot && (!k || OBJ.types[t].biomes[k] != null)); };
OBJ.dataFor = (type, rng) => {
  const r = rng || Math.random;
  switch (type) {
    case 'v_tallstolpe': return {};                       // v5 WP-W: the post takes a free number of its street at init (postNum)
    case 'v_skattkiste': return { lock: r() < 0.5 ? 'num' : 'word' };
    case 'n_trappesteiner': return {};                    // v5 WP-W: start follows her number band at init
    case 'n_bokstavsteiner': return { letters: LETTERSETS[Math.floor(r() * LETTERSETS.length)] };
    case 'n_taptting': { const c = LOST[Math.floor(r() * LOST.length)]; return { item: c.find(x => F.VOX.has(x)) || 'o_nokkel' }; }
    default: return {};
  }
};
})();
