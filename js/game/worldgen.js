/* Feslottet – WORLDGEN (WP WORLD): «Riket», the endless kingdom around the castle park.
   Regions: jittered 288 m grid; each cell = a named place (F.SETS.PLACES, never shared with any of its 8 neighbours) with one biome
   and an anchor (village 55 % / landmark 45 %). Roads join every region to its 4 neighbours (park gates for the castle).
   The coast runs along the south (beach z ∈ [420, 520], then sea). Each 32 m chunk is filled from the biome's weighted tables
   (decor merged per chunk, interactables spawned) and topped up until it has ≥ 10 interactables and ≥ 1 learning spot.
   Public API (also see js/core/world.js):
     F.W.region(x,z) -> {id, cellX, cellY, name, biome, biomeName, center:{x,z}, kind:'village'|'landmark'|'castle'|'sea', landmark}
     F.W.biomeAt(x,z) -> 'blomstereng'|'gardsland'|'frukthage'|'innsjo'|'strand'|'vindmolle'|'lavendel'|'snohaugen'|'slott'|'hav'
     F.W.density(cx,cz) -> {interactables, learnSpots, npcs, coins, required, land}
     F.W.villages(near:{x,z}, r) -> [{regionId, name, biome, x, z, y, theme, bend:{A, shape}, street:[[x,z]…] (centre line, 4 m steps),
         houses:[{num, x, z, ry, side, door:{x,z} (at the door), step:{x,z} (doorstep, free to stand on), front:{x,z}, street:{x,z}, doorThingId,
                  resident, model, look}],
         shop:{thingId, x, z, door:{x,z}}, stall:{thingId, x, z, door:{x,z}} (door = where a customer stands), shopThingId, stallThingId,
         fountainThingId, plots:[plotId], plotPos:[{id,x,z}], residents, plaza:{x,z,r}, fair:{x,z,thingId}|null, zone:{x0,z0,x1,z1},
         numLo, numHi, gaps:[numbers of the street with no house]}]   v5 WP-W: natural numbers (odd west / even east, base 1 | 9–13 | 21–47)
     F.W.villageRoute(village|regionId, from, to) -> [[x,z]…]  street-following walk (from/to: house number | 'shop' | 'stall' | 'fountain')
     F.W.creeksNear(x,z,r) -> [{id, pts, bridges:[{x,z}]}]   F.W.streetOff(vx, z)   F.W.VILLAGE_THEMES
     F.W.ambient {butterflies, flocks, meshes}; F.W.AMBIENT = false hides butterflies / birds
     F.W.wishSpots(cx,cz) -> [{id, x, z, ry, kind:'door'|'anchor'|'stall'|'picnic'|'walk', regionId, regionName, villageId?, doorThingId?, num?, name, job, voice, kid, chunk}]
     F.W.regionsNear(x,z,rCells) -> [region...]     F.W.roadsNear(x,z,r) -> [[[x,z],...], ...]   (polylines, for the map)
     F.Gen.mapData(visited:Set|Array) -> [{id, name, biome, x, z, kind, landmark, visited, cellX, cellY}]
     F.W.addBridge({ax,az,bx,bz,w,y}, style 'krystall'|'blomst'|'boble'|'stjerne'|'tre') -> persistent walkable bridge thing
       (n_tryllepunkt at lakes carries data.bridge = the segment to its islet)
     F.W.landmarkHooks[landmarkId] = (ctx, region, {put(type,dx,dz,key,o), deco(model,dx,dz,o), inC(x,z), y}) => {}   extend a landmark
     F.W.lakesNear(x,z,r) / F.W.roadsNear(x,z,r) / F.W.regionsNear(x,z,rings) / F.W.coastZ(x) / F.W.regionById(id)
   Things defined here: w_coin (hidden coin, +1 via F.Eco.add, ≤ 3 found coins a day in all – economy §2), w_gullbokstav (golden letter →
     F.save.golden, event 'goldenLetter'), w_bridge (persistent walkable bridge), world_placeholder (#test only, for undefined types).
   Wave 2: villages get a colour theme (walls / roofs / house styles a–f of MODELS-3 v_hus_lo / flowers / bunting), straight, S- or C-bent
     streets, garden extras behind houses, sometimes a fair with a Ferris wheel; creeks with footbridges (v_bro) in about half the inland
     regions; the coast gets lighthouses, fishing jetties with moored boats and rows of beach huts; lakes get ducks / frogs / rowing boats;
     OBJ's extra types are part of the biome tables (F.OBJ.extrasPerChunk is set to 0); stepping stones are placed ×2 with the row across
     the screen (number plaques ≈ 100 px apart); instanced butterflies / birds and wind sway on plants; far fine decor → flat dots.
   Events: 'wishSpot'(spot) when a chunk with a problem-giver spot is built; 'villageLoaded'(village) when a village centre chunk is built;
           'regionEntered'(region, {first, prev}) when the fairy crosses into another region (the HUD shows the banner + welcome);
           'goldenLetter'(letter). Visited region ids: F.save.visited. */
(function () {
'use strict';
const F = window.F, U = F.U, W = F.W, PAL = F.PAL;

/* =====================================================================================================================
   1. Decor voxel models (world-only, prefix wd_). Palette names only.
   ===================================================================================================================== */
const V = (id, d) => { if (!F.VOX.has(id)) F.VOX.def(id, d); };
const hsh = (x, y, z, s) => U.hash2(x * 73 + y * 7, z * 31 + y * 13, s || 5);
function surfaceOf(v, x, y, z) { return !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1); }

V('wd_tuft', { size: [5, 5, 5], scale: 1 / 11, build(v, o) {
  const c = o.c || 'grass', d = o.d || 'grassDark', k = o.v || 0;
  if (k === 0) { v.box(2, 0, 2, 2, 3, 2, c); v.box(1, 0, 1, 1, 1, 1, d); v.box(3, 0, 3, 3, 2, 3, c); }
  else if (k === 1) { v.box(1, 0, 2, 1, 3, 2, c); v.box(3, 0, 2, 3, 2, 2, d); v.box(2, 0, 3, 2, 1, 3, c); }
  else { v.box(2, 0, 1, 2, 2, 1, d); v.box(1, 0, 3, 1, 3, 3, c); v.box(3, 0, 2, 3, 3, 2, c); }
} });
V('wd_flowers', { size: [11, 7, 11], scale: 1 / 16, build(v, o) {
  const cs = o.cs || ['pink', 'butter', 'white'];
  const spots = o.v === 1 ? [[2, 2], [7, 1], [5, 5], [1, 7], [8, 7], [4, 9]] : [[2, 3], [6, 2], [8, 6], [3, 7], [6, 8]];
  spots.slice(0, 4).forEach(([x, z], i) => {
    const c = cs[i % cs.length], h = 3 + ((x + z + i) % 3);
    v.box(x, 0, z, x, h - 1, z, 'leaf');
    v.box(x, h, z, x + 1, h, z + 1, c); v.set(x, h + 1, z, c === 'butter' || c === 'yellow' ? 'orange' : 'yellow');
  });
} });
V('wd_flower', { size: [5, 8, 5], scale: 1 / 16, build(v, o) {
  const c = o.c || 'rose';
  v.box(2, 0, 2, 2, 5, 2, 'leaf'); v.set(1, 2, 2, 'leaf2'); v.set(3, 3, 2, 'leaf2');
  v.box(1, 6, 2, 3, 6, 2, c); v.box(2, 6, 1, 2, 6, 3, c); v.set(2, 6, 2, 'yellow'); v.set(2, 7, 2, c);
} });
V('wd_clover', { size: [8, 2, 8], scale: 1 / 16, build(v, o) {
  const c = o.c || 'leaf2';
  [[1, 1], [2, 1], [1, 2], [5, 2], [6, 2], [6, 3], [2, 5], [3, 5], [3, 6], [5, 5], [6, 6]].forEach(([x, z], i) => v.set(x, 0, z, i % 3 ? c : 'leaf'));
  if (o.f) { v.set(2, 1, 2, 'white'); v.set(5, 1, 6, 'white'); }
} });
V('wd_daisies', { size: [9, 3, 9], scale: 1 / 16, build(v) {
  [[1, 2], [4, 1], [7, 3], [2, 6], [5, 5], [7, 7], [3, 8]].forEach(([x, z], i) => { v.set(x, 0, z, 'leaf'); v.set(x, 1, z, i % 3 === 2 ? 'butter' : 'white'); if (i % 2) v.set(x + 1, 0, z, 'leaf2'); });
} });
V('wd_mushroom', { size: [5, 5, 5], scale: 1 / 16, build(v) {
  v.box(2, 0, 2, 2, 2, 2, 'cream'); v.box(1, 3, 1, 3, 3, 3, 'red'); v.box(2, 4, 1, 2, 4, 3, 'red'); v.box(1, 4, 2, 3, 4, 2, 'red');
  v.set(1, 3, 1, 'white'); v.set(3, 4, 2, 'white'); v.set(2, 3, 3, 'white');
} });
V('wd_bush', { size: [12, 9, 12], scale: 1 / 10, build(v, o) {
  const c = o.c || 'leaf', b = o.b;
  v.ellipsoid(5.5, 4, 5.5, 5.6, 4.6, 5.4, c); v.ellipsoid(3, 5, 4, 3, 3, 3, c); v.ellipsoid(8, 5.5, 7, 3, 3, 3, c);
  v.box(0, 0, 0, 11, 0, 11, 0);
  v.paint((x, y, z) => (y <= 2 ? 'leafDark' : (y >= 6 && hsh(x, y, z, 3) < 0.25 ? 'leaf2' : null)));
  if (b) v.paint((x, y, z) => (y >= 3 && surfaceOf(v, x, y, z) && hsh(x, y, z, o.s || 7) < 0.11 ? b : null));
} });
V('wd_bush_s', { size: [8, 6, 8], scale: 1 / 10, build(v, o) {
  const c = o.c || 'leaf2', b = o.b;
  v.ellipsoid(3.5, 2.5, 3.5, 3.6, 3, 3.4, c); v.box(0, 0, 0, 7, 0, 7, 0);
  v.paint((x, y, z) => (y <= 1 ? 'leafDark' : null));
  if (b) v.paint((x, y, z) => (y >= 2 && surfaceOf(v, x, y, z) && hsh(x, y, z, 9) < 0.16 ? b : null));
} });
V('wd_rock', { size: [9, 5, 8], scale: 1 / 10, build(v, o) {
  v.ellipsoid(4, 0.5, 3.8, 4.2, 3.6, 3.6, 'grey');
  v.paint((x, y, z) => (y >= 3 ? (o.moss && hsh(x, y, z, 4) < 0.5 ? 'leaf2' : (o.c === 'stone' ? 'silver' : 'steel')) : (y === 0 ? 'stoneDark' : (hsh(x, y, z, 9) < 0.3 ? 'steel' : null))));
} });
V('wd_pebbles', { size: [8, 2, 8], scale: 1 / 16, build(v) {
  v.box(1, 0, 1, 2, 1, 2, 'stone2'); v.box(5, 0, 2, 6, 0, 3, 'grey'); v.box(3, 0, 5, 4, 1, 6, 'stone'); v.set(6, 0, 6, 'stoneDark');
} });
V('wd_tree', { size: [20, 30, 20], scale: 1 / 8, build(v, o) {
  const k = o.k || 'rund';
  const crown = { rund: 'leaf', eple: 'leaf', kirsebaer: 'blossom', blomst: 'blossom', plomme: 'leaf2', paere: 'leaf' }[k] || 'leaf';
  const dot = { eple: 'red', kirsebaer: 'white', blomst: 'white', plomme: 'plum', paere: 'yellow', rund: null }[k];
  v.box(9, 0, 9, 10, 12, 10, 'wood'); v.set(8, 0, 9, 'woodDark'); v.set(11, 0, 10, 'woodDark'); v.set(9, 0, 11, 'woodDark');
  v.line(10, 9, 10, 6, 14, 8, 'wood'); v.line(9, 10, 9, 13, 15, 12, 'wood');
  v.ellipsoid(9.5, 19, 9.5, 8.2, 7, 8.2, crown); v.ellipsoid(5, 16.5, 8, 4.5, 4, 4.5, crown); v.ellipsoid(14, 17, 12, 4.5, 4, 4.5, crown); v.ellipsoid(10, 24.5, 9, 5, 3.5, 5, crown);
  const dark = crown === 'blossom' ? 'pink' : 'leafDark', light = crown === 'blossom' ? 'white' : 'leaf2';
  v.paint((x, y, z, c) => (c === F.PAL[crown] ? (y <= 14 ? dark : (y >= 24 && hsh(x, y, z, 2) < 0.4 ? light : null)) : null));
  if (dot) v.paint((x, y, z, c) => (y > 13 && c !== F.PAL.wood && surfaceOf(v, x, y, z) && hsh(x, y, z, 6) < 0.07 ? dot : null));
} });
V('wd_tree_s', { size: [14, 22, 14], scale: 1 / 8, build(v, o) {
  const crown = o.c || 'leaf', dot = o.d;
  v.box(6, 0, 6, 7, 9, 7, 'wood'); v.set(5, 0, 6, 'woodDark');
  v.ellipsoid(6.5, 14, 6.5, 6, 5.6, 6, crown); v.ellipsoid(6.5, 18.5, 6.5, 3.6, 2.6, 3.6, crown);
  v.paint((x, y, z, c) => (c === F.PAL[crown] && y <= 10 ? (crown === 'blossom' ? 'pink' : 'leafDark') : null));
  if (dot) v.paint((x, y, z, c) => (y > 10 && c !== F.PAL.wood && surfaceOf(v, x, y, z) && hsh(x, y, z, 8) < 0.08 ? dot : null));
} });
V('wd_fence', { size: [20, 8, 2], scale: 1 / 10, build(v, o) {
  const c = o.c || 'woodLight';
  v.box(0, 0, 0, 1, 7, 1, c === 'white' ? 'white' : 'wood'); v.box(18, 0, 0, 19, 7, 1, c === 'white' ? 'white' : 'wood');
  v.box(0, 2, 0, 19, 2, 0, c); v.box(0, 5, 0, 19, 5, 0, c);
} });
V('wd_picket', { size: [20, 8, 2], scale: 1 / 10, build(v, o) {
  const c = o.c || 'white';
  for (let x = 1; x < 20; x += 4) { v.box(x, 0, 1, x + 1, 5, 1, c); v.set(x, 6, 1, c); }
  v.box(0, 1, 0, 19, 1, 0, c); v.box(0, 4, 0, 19, 4, 0, c);
} });
V('wd_hedge', { size: [20, 9, 8], scale: 1 / 10, build(v, o) {
  v.box(0, 0, 1, 19, 7, 6, o.c || 'leaf'); v.box(1, 8, 2, 18, 8, 5, o.c || 'leaf');
  v.paint((x, y, z) => (y <= 1 ? 'leafDark' : (hsh(x, y, z, 12) < 0.18 ? 'leaf2' : (o.b && y > 3 && hsh(x, y, z, 13) < 0.07 ? o.b : null))));
} });
V('wd_hay', { size: [10, 9, 12], scale: 1 / 10, build(v) {
  for (let z = 1; z <= 10; z++) for (let y = 0; y < 9; y++) for (let x = 0; x < 10; x++) {
    const d = Math.hypot(x - 4.5, y - 4.2); if (d <= 4.6) v.set(x, y, z, (z === 1 || z === 10) ? (Math.round(d) % 2 ? 'honey' : 'hay') : (hsh(x, y, z, 1) < 0.15 ? 'honey' : 'hay'));
  }
} });
V('wd_wheat', { size: [6, 10, 6], scale: 1 / 16, build(v) {
  [[1, 1, 7], [3, 2, 8], [2, 4, 6], [4, 4, 7], [1, 3, 5]].forEach(([x, z, h]) => { v.box(x, 0, z, x, h - 2, z, 'hay'); v.box(x, h - 1, z, x, h, z, 'honey'); });
} });
V('wd_cabbage', { size: [6, 4, 6], scale: 1 / 16, build(v) {
  v.ellipsoid(2.5, 1.2, 2.5, 2.6, 2, 2.6, 'leaf2'); v.box(2, 2, 2, 3, 3, 3, 'mint'); v.set(0, 0, 0, 'leaf'); v.set(5, 0, 5, 'leaf');
} });
V('wd_carrots', { size: [7, 4, 3], scale: 1 / 16, build(v) {
  [1, 3, 5].forEach(x => { v.set(x, 0, 1, 'orange'); v.box(x, 1, 1, x, 2, 1, 'leaf'); v.set(x - 1, 3, 1, 'leaf2'); v.set(x + 1, 2, 1, 'leaf2'); });
} });
V('wd_tulips', { size: [9, 7, 3], scale: 1 / 16, build(v, o) {
  const c = o.c || 'rose';
  [1, 4, 7].forEach((x, i) => { const h = 3 + (i % 2); v.box(x, 0, 1, x, h, 1, 'leaf'); v.set(x + (i % 2 ? -1 : 1), 1, 1, 'leaf2'); v.box(x - 1, h + 1, 1, x + 1, h + 2, 1, c); v.set(x, h + 1, 0, c); v.set(x, h + 1, 2, c); });
} });
V('wd_lavender', { size: [7, 7, 7], scale: 1 / 16, build(v) {
  v.box(2, 0, 2, 4, 0, 4, 'leaf2'); v.box(3, 0, 1, 3, 0, 5, 'leaf2'); v.box(1, 0, 3, 5, 0, 3, 'leaf2');
  [[1, 2], [3, 1], [5, 3], [2, 5], [4, 5], [3, 3]].forEach(([x, z], i) => { const h = 3 + (i % 3); v.box(x, 1, z, x, h - 2, z, 'leaf'); v.box(x, h - 1, z, x, h, z, i % 2 ? 'lavField' : 'purple'); });
} });
V('wd_sunflower', { size: [7, 22, 4], scale: 1 / 16, build(v) {
  v.box(3, 0, 1, 3, 16, 1, 'leaf'); v.box(1, 6, 1, 2, 6, 1, 'leaf2'); v.box(4, 10, 1, 5, 10, 1, 'leaf2');
  for (let x = 0; x < 7; x++) for (let y = 15; y < 22; y++) { const d = Math.hypot(x - 3, y - 18); if (d <= 3.3) v.set(x, y, 2, d <= 1.6 ? 'brown' : 'yellow'); }
  v.box(2, 17, 3, 4, 19, 3, 'woodDark');
} });
V('wd_reeds', { size: [6, 14, 6], scale: 1 / 16, build(v) {
  [[1, 1, 11], [3, 2, 13], [4, 4, 10], [2, 4, 12], [5, 1, 8]].forEach(([x, z, h], i) => { v.box(x, 0, z, x, h, z, i % 2 ? 'leaf' : 'leafDark'); if (i < 3) v.box(x, h - 3, z, x, h - 1, z, 'brown'); });
} });
V('wd_lily', { size: [9, 2, 9], scale: 1 / 16, build(v, o) {
  for (let x = 0; x < 9; x++) for (let z = 0; z < 9; z++) { const d = Math.hypot(x - 4, z - 4); if (d <= 4.2 && !(x > 4 && Math.abs(z - 4) <= 0)) v.set(x, 0, z, d < 2 ? 'leaf2' : 'leaf'); }
  if (o.f) { v.set(3, 1, 3, o.f); v.set(4, 1, 3, o.f); v.set(3, 1, 4, o.f); v.set(4, 1, 4, 'yellow'); }
} });
V('wd_shell', { size: [4, 2, 3], scale: 1 / 16, build(v, o) { const c = o.c || 'peach'; v.box(0, 0, 0, 3, 0, 2, c); v.box(1, 1, 0, 2, 1, 2, c); v.set(1, 1, 1, 'white'); } });
V('wd_starfish', { size: [5, 1, 5], scale: 1 / 16, build(v) { v.set(2, 0, 2, 'coral'); v.set(2, 0, 0, 'coral'); v.set(2, 0, 1, 'coral'); v.set(0, 0, 2, 'coral'); v.set(1, 0, 2, 'coral'); v.set(3, 0, 2, 'coral'); v.set(4, 0, 2, 'coral'); v.set(1, 0, 4, 'coral'); v.set(3, 0, 4, 'coral'); v.set(2, 0, 3, 'orange'); } });
V('wd_dunegrass', { size: [6, 7, 6], scale: 1 / 16, build(v) {
  [[1, 1, 5], [3, 2, 6], [4, 4, 4], [2, 4, 5], [5, 2, 3]].forEach(([x, z, h], i) => v.box(x, 0, z, x, h, z, i % 2 ? 'leaf2' : 'hay'));
} });
V('wd_snowlump', { size: [9, 4, 8], scale: 1 / 10, build(v) { v.ellipsoid(4, 0.3, 3.8, 4.3, 3.2, 3.7, 'snow'); v.paint((x, y) => (y === 0 ? 'ice' : null)); } });
V('wd_snowbush', { size: [10, 8, 10], scale: 1 / 10, build(v) {
  v.ellipsoid(4.5, 3.5, 4.5, 4.6, 4, 4.4, 'leafDark'); v.box(0, 0, 0, 9, 0, 9, 0);
  v.paint((x, y, z) => (y >= 5 || (y >= 4 && hsh(x, y, z, 2) < 0.5) ? 'snow' : null));
} });
V('wd_icespike', { size: [6, 10, 6], scale: 1 / 16, build(v) {
  v.box(2, 0, 2, 3, 8, 3, 'crystal'); v.box(1, 0, 3, 1, 5, 3, 'crystal'); v.box(4, 0, 1, 4, 6, 2, 'crystal'); v.set(2, 9, 2, 'crystal'); v.box(0, 0, 0, 5, 0, 5, 'ice');
} });
V('wd_stone', { size: [3, 2, 3], scale: 1 / 16, build(v, o) { v.box(0, 0, 0, 2, 0, 2, o.c || 'stone2'); v.set(1, 1, 1, o.c || 'stone2'); } });
V('wd_lamp', { size: [5, 44, 5], scale: 1 / 16, build(v) {
  v.box(1, 0, 1, 3, 1, 3, 'navySoft'); v.box(2, 2, 2, 2, 36, 2, 'navySoft'); v.box(1, 37, 1, 3, 37, 3, 'navySoft');
  v.box(1, 38, 1, 3, 41, 3, 'lamp'); v.box(0, 42, 0, 4, 42, 4, 'navySoft'); v.set(2, 43, 2, 'gold');
} });
V('wd_bench', { size: [16, 8, 6], scale: 1 / 10, build(v) {
  [[1, 1], [14, 1], [1, 4], [14, 4]].forEach(([x, z]) => v.box(x, 0, z, x, 2, z, 'woodDark'));
  v.box(0, 3, 1, 15, 3, 4, 'woodLight'); v.box(0, 4, 5, 15, 7, 5, 'woodLight'); v.box(1, 4, 5, 1, 7, 5, 'woodDark'); v.box(14, 4, 5, 14, 7, 5, 'woodDark');
} });
V('wd_planter', { size: [10, 5, 4], scale: 1 / 10, build(v, o) {
  v.box(0, 0, 0, 9, 2, 3, o.w || 'woodRed'); v.box(1, 2, 1, 8, 2, 2, 'soil');
  for (let x = 1; x < 9; x++) v.set(x, 3, 1 + (x % 2), x % 3 === 0 ? 'leaf' : (o.c || (x % 2 ? 'rose' : 'butter')));
  v.set(2, 4, 1, o.c || 'pink'); v.set(6, 4, 2, o.c || 'white');
} });
V('wd_hus', { size: [24, 26, 20], scale: 1 / 4, build(v, o) {
  const wall = o.wall || 'cream', roof = o.roof || 'roofRed', trim = o.trim || 'white';
  v.box(1, 0, 2, 22, 0, 17, 'stone2');
  v.box(1, 1, 2, 22, 11, 17, wall);
  v.box(1, 11, 2, 22, 11, 17, trim);
  // recessed door (the door thing stands in front of it)
  v.clear(10, 1, 17, 13, 8, 17); v.box(10, 1, 16, 13, 8, 16, 'woodDark'); v.box(9, 1, 17, 9, 9, 17, trim); v.box(14, 1, 17, 14, 9, 17, trim); v.box(9, 9, 17, 14, 9, 17, trim);
  v.box(9, 0, 18, 14, 0, 18, 'stone');
  // windows front + back + sides, flower boxes
  for (const [x0, x1] of [[3, 7], [16, 20]]) {
    v.box(x0, 4, 17, x1, 8, 17, trim); v.box(x0 + 1, 5, 17, x1 - 1, 7, 17, 'glass'); v.box(x0 + 1, 5, 2, x1 - 1, 7, 2, 'glass');
    v.box(x0, 3, 18, x1, 3, 18, o.box || 'woodRed'); for (let x = x0; x <= x1; x++) v.set(x, 4, 18, x % 2 ? (o.fl || 'rose') : 'leaf');
  }
  v.box(1, 5, 8, 1, 7, 11, 'glass'); v.box(22, 5, 8, 22, 7, 11, 'glass');
  // gable roof along x
  for (let k = 0; k <= 9; k++) {
    const y = 12 + k, zA = 1 + k, zB = 18 - k;
    if (zA > zB) break;
    v.box(0, y, zA, 23, y, Math.min(zA + 1, zB), roof); v.box(0, y, Math.max(zB - 1, zA), 23, y, zB, roof);
    if (zB - zA > 2) v.box(1, y, zA + 2, 22, y, zB - 2, wall);
  }
  v.paint((x, y, z, c) => (c === F.PAL[roof] && (x === 0 || x === 23) ? (o.roof2 || 'roofPink') : null));
  v.box(17, 15, 6, 18, 23, 7, 'brick'); v.box(17, 23, 6, 18, 23, 7, 'stoneDark');
  if (o.round) { v.box(11, 15, 17, 12, 16, 17, 'glass'); }
} });
V('wd_hut', { size: [12, 15, 10], scale: 1 / 4, build(v, o) {
  const a = o.c || 'sky', b = 'white';
  v.box(1, 0, 1, 10, 0, 8, 'woodLight');
  for (let x = 1; x <= 10; x++) v.box(x, 1, 1, x, 8, 8, x % 2 ? a : b);
  v.clear(2, 1, 2, 9, 8, 7);
  v.clear(5, 1, 8, 6, 6, 8); v.box(5, 1, 7, 6, 6, 7, 'woodDark');
  for (let k = 0; k < 6; k++) v.box(0, 9 + k, k, 11, 9 + k, 9 - k, k % 2 ? a : 'white');
  v.box(4, 4, 8, 4, 5, 8, 'glass'); v.box(7, 4, 8, 7, 5, 8, 'glass');
} });
V('wd_parasol', { size: [16, 22, 16], scale: 1 / 10, build(v, o) {
  v.box(7, 0, 7, 8, 18, 8, 'white');
  for (let y = 15; y < 21; y++) { const r = (21 - y) * 1.35; for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { const d = Math.hypot(x - 7.5, z - 7.5); if (d <= r && d > r - 1.6) v.set(x, y, z, (Math.floor(Math.atan2(z - 7.5, x - 7.5) / (Math.PI / 4)) & 1) ? (o.c || 'coral') : 'white'); } }
  v.box(7, 21, 7, 8, 21, 8, o.c || 'coral');
} });
V('wd_jetty', { size: [12, 6, 20], scale: 1 / 10, build(v) {
  for (let z = 0; z < 20; z++) v.box(0, 4, z, 11, 4, z, z % 2 ? 'woodLight' : 'wood');
  for (const z of [1, 9, 18]) { v.box(0, 0, z, 1, 5, z + 1, 'woodDark'); v.box(10, 0, z, 11, 5, z + 1, 'woodDark'); }
} });
V('wd_signpost', { size: [12, 36, 12], scale: 1 / 16, build(v) {
  v.box(5, 0, 5, 6, 33, 6, 'wood'); v.box(4, 34, 4, 7, 35, 7, 'woodDark');
  v.box(0, 26, 5, 11, 29, 6, 'woodLight'); v.box(5, 19, 0, 6, 22, 11, 'woodLight');
} });
V('wd_coin', { size: [6, 6, 2], scale: 1 / 16, build(v) {
  for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) { const d = Math.hypot(x - 2.5, y - 2.5); if (d <= 3) { v.set(x, y, 0, d > 2.1 ? 'honey' : 'gold'); v.set(x, y, 1, d > 2.1 ? 'honey' : 'gold'); } }
  v.set(2, 3, 1, 'glowYellow'); v.set(3, 2, 1, 'glowYellow');
} });
V('wd_placeholder', { size: [8, 9, 8], scale: 1 / 16, build(v) {
  v.box(0, 0, 0, 7, 5, 7, 'lilac'); v.box(3, 0, 0, 4, 6, 7, 'pink'); v.box(0, 0, 3, 7, 6, 4, 'pink'); v.box(2, 7, 3, 5, 8, 4, 'pink');
} });
V('wd_letter', { size: [5, 7, 3], scale: 1 / 9, build(v, o) {
  const g = F.VOX.FONT[(o.l || 'a').toUpperCase()] || F.VOX.FONT.A;
  for (let r = 0; r < 5; r++) for (let q2 = 0; q2 < 3; q2++) if (g[r * 3 + q2] === '1') { v.set(1 + q2, 6 - r, 0, 'gold'); v.set(1 + q2, 6 - r, 1, 'honey'); }
  v.set(2, 0, 1, 'glowYellow'); v.set(1, 1, 1, 'gold'); v.set(3, 1, 1, 'gold');
} });
V('wd_rainbow', { size: [44, 18, 6], scale: 1 / 4, build(v) {
  const cols = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  for (let x = 0; x < 44; x++) for (let y = 0; y < 18; y++) { const d = Math.hypot(x - 21.5, y + 3); for (let k = 0; k < 6; k++) { const r = 24 - k * 1.5; if (d <= r && d > r - 1.5) { v.box(x, y, 1, x, y, 4, cols[k]); } } }
} });
V('wd_isslott', { size: [40, 40, 28], scale: 1 / 4, build(v) {
  v.box(4, 0, 4, 35, 14, 23, 'ice'); v.clear(6, 1, 6, 33, 13, 21);
  for (let x = 4; x <= 35; x += 2) v.set(x, 15, 4, 'ice'), v.set(x, 15, 23, 'ice');
  for (const [x, z] of [[4, 4], [35, 4], [4, 23], [35, 23]]) { v.cyl(x, 0, z, 3.4, 22, 'snow'); v.cone(x, 22, z, 3.6, 10, 'crystal'); }
  v.cyl(20, 0, 14, 5, 28, 'ice'); v.cone(20, 28, 14, 5.5, 12, 'crystal');
  v.clear(17, 1, 23, 22, 9, 23); v.box(17, 1, 22, 22, 9, 22, 'sky');
  v.paint((x, y, z, c) => (c === F.PAL.ice && hsh(x, y, z, 4) < 0.12 ? 'snow' : null));
} });
V('wd_bigsun', { size: [24, 64, 8], scale: 1 / 8, build(v) {
  v.box(11, 0, 3, 12, 48, 4, 'leaf');
  for (const [y, d] of [[14, -1], [24, 1], [34, -1]]) for (let k = 1; k < 8; k++) v.box(11 + d * k, y + Math.floor(k / 3), 3, 11 + d * k, y + Math.floor(k / 3), 4, 'leaf2');
  for (let x = 0; x < 24; x++) for (let y = 40; y < 64; y++) { const d = Math.hypot(x - 11.5, y - 52); if (d <= 11.5) v.box(x, y, 5, x, y, 6, d <= 5.5 ? (hsh(x, y, 5, 3) < 0.3 ? 'woodDark' : 'brown') : (d > 10 && hsh(x, y, 5, 1) < 0.3 ? 'orange' : 'yellow')); }
} });
V('wd_crystalhill', { size: [16, 22, 16], scale: 1 / 8, build(v) {
  v.ellipsoid(7.5, 0, 7.5, 7.8, 5, 7.8, 'stone2'); v.paint((x, y, z) => (y >= 3 && hsh(x, y, z, 5) < 0.4 ? 'lavender' : null));
  for (const [x, z, h] of [[7, 7, 20], [4, 9, 13], [11, 6, 15], [8, 11, 11], [5, 5, 10]]) { v.box(x, 3, z, x + 1, h, z + 1, 'crystal'); v.set(x, h + 1, z, 'crystal'); }
} });

/* =====================================================================================================================
   2. Biomes
   ===================================================================================================================== */
const RS = 288;                     // region grid
const SEED = () => W.seed;
const nz = (x, z, f, k) => U.noise2(x * f, z * f, (SEED() + k * 1013) | 0);
const fb = (x, z, f, k, o) => U.fbm(x * f, z * f, (SEED() + k * 1013) | 0, o || 3);
const BIO = ['slott', 'blomstereng', 'gardsland', 'frukthage', 'innsjo', 'strand', 'vindmolle', 'lavendel', 'snohaugen', 'hav'];
const BIDX = {}; BIO.forEach((b, i) => { BIDX[b] = i; });
const BNAME = { slott: 'Slottsparken', blomstereng: 'Blomstereng', gardsland: 'Gårdsland', frukthage: 'Frukthage', innsjo: 'Innsjø', strand: 'Strand',
  vindmolle: 'Vindmølleåsene', lavendel: 'Lavendelåker', snohaugen: 'Snøhaugen', hav: 'Havet' };
const hills = (x, z, k, top, lo) => { const n = nz(x, z, 1 / 58, k) * 0.7 + nz(x, z, 1 / 23, k + 1) * 0.3; return U.smooth(U.clamp((n - lo) / (1 - lo - 0.12), 0, 1)) * top; };
const BH = {
  slott: (x, z) => 0.25 + 0.7 * fb(x, z, 0.03, 1, 2),
  blomstereng: (x, z) => 0.2 + 1.7 * fb(x, z, 0.022, 2),
  gardsland: (x, z) => 0.25 + 1.0 * fb(x, z, 0.016, 3),
  frukthage: (x, z) => 0.25 + 1.3 * fb(x, z, 0.02, 4),
  innsjo: (x, z) => 0.25 + 0.9 * fb(x, z, 0.02, 5),
  strand: (x, z) => 0.25 + 0.7 * fb(x, z, 0.03, 6),
  vindmolle: (x, z) => 0.3 + hills(x, z, 7, 8, 0.38) + 0.5 * fb(x, z, 0.05, 8, 2),
  lavendel: (x, z) => 0.25 + 0.9 * fb(x, z, 0.018, 9),
  snohaugen: (x, z) => 0.35 + hills(x, z, 10, 6, 0.3) + 0.6 * fb(x, z, 0.04, 11, 2),
  hav: () => -3,
};

/* colours */
const P = n => PAL[n];
const mix = (a, b, t) => {
  if (t <= 0) return a; if (t >= 1) return b;
  const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
const shade = (c, k) => { const r = Math.min(255, Math.round((c >> 16 & 255) * k)), g = Math.min(255, Math.round((c >> 8 & 255) * k)), b = Math.min(255, Math.round((c & 255) * k)); return (r << 16) | (g << 8) | b; };
const GRASS = 0x88d066, GRASS2 = 0x74c25c, MEADOW = 0x92d46c, MINT_G = 0x9cdca8;
// the outdoor lights sum to ~1.35 on top faces (render.js); terrain colours are scaled so the ground reads as soft green, not lime
W.TERRAIN_K = 0.8;

/* =====================================================================================================================
   3. Regions (cells of the jittered grid)
   ===================================================================================================================== */
const cells = new Map();
const ck = (i, j) => (i + 4096) * 8192 + (j + 4096);
const HH = (i, j, salt) => U.hash2(i * 9973 + salt * 7919, j * 6007 - salt * 3001, (SEED() ^ Math.imul(salt + 1, 40503)) | 0);
const pickW = (list, r) => { let t = 0; for (const [, w] of list) t += w; let a = r * t; for (const [k, w] of list) { a -= w; if (a < 0) return k; } return list[list.length - 1][0]; };
let NAMEGROUPS = null;
function nameGroups() {
  if (NAMEGROUPS && NAMEGROUPS.seed === SEED()) return NAMEGROUPS;
  const names = U.shuffle(U.rng(SEED() * 7 + 3), F.SETS.PLACES);
  const g = Array.from({ length: 9 }, () => []);
  names.forEach((n, k) => g[k % 9].push(n));
  NAMEGROUPS = { seed: SEED(), g };
  return NAMEGROUPS;
}
const LANDMARKS = {
  fyrtarn: { name: 'Fyrtårnet', biomes: ['strand'] },
  sandslott: { name: 'Sandslottet', biomes: ['strand'] },
  kjempemolle: { name: 'Kjempemølla', biomes: ['vindmolle', 'gardsland'] },
  pariserhjul: { name: 'Pariserhjulet', biomes: ['blomstereng', 'gardsland', 'frukthage', 'lavendel', 'innsjo', 'vindmolle'] },
  isslott: { name: 'Isslottet', biomes: ['snohaugen'] },
  krystallhoyden: { name: 'Krystallhøyden', biomes: ['snohaugen', 'blomstereng', 'vindmolle', 'lavendel'] },
  kjempesolsikke: { name: 'Kjempesolsikken', biomes: ['lavendel', 'gardsland', 'blomstereng'] },
  regnbuebro: { name: 'Regnbuebroen', biomes: ['innsjo', 'blomstereng'] },
  ballongplass: { name: 'Ballongplassen', biomes: ['blomstereng', 'gardsland', 'frukthage', 'vindmolle', 'lavendel'] },
  dyrepark: { name: 'Dyreparken', biomes: ['gardsland', 'blomstereng', 'frukthage'] },
};
const RING1_LM = ['dyrepark', 'ballongplass', 'pariserhjul', 'regnbuebro'];
function rawBiome(i, j) {
  if (i === 0 && j === 0) return 'slott';
  if (j >= 3) return 'hav';
  if (j === 2) return 'strand';
  const ring = Math.max(Math.abs(i), Math.abs(j));
  if (ring === 1) return pickW([['blomstereng', 1], ['gardsland', 1], ['innsjo', 1]], HH(i, j, 4));
  return pickW(biomeList(j), HH(i, j, 4));
}
function biomeList(j) {
  const snow = j <= -2 ? 3 : j >= 1 ? 0 : 0.5;
  const l = [['blomstereng', 1.2], ['gardsland', 1.2], ['frukthage', 1], ['innsjo', 1], ['vindmolle', 1.1], ['lavendel', 1]];
  if (snow) l.push(['snohaugen', snow]);
  return l;
}
function biomeOf(i, j) {
  let b = rawBiome(i, j);
  if (b === 'slott' || b === 'hav' || b === 'strand') return b;
  const ring = Math.max(Math.abs(i), Math.abs(j));
  const list = ring === 1 ? ['blomstereng', 'gardsland', 'innsjo'] : biomeList(j).map(e => e[0]);
  let k = list.indexOf(b), tries = 0;
  while ((b === rawBiome(i - 1, j) || b === rawBiome(i, j - 1)) && tries < list.length) { k = (k + 1) % list.length; b = list[k]; tries++; }
  return b;
}
function rawLandmark(i, j, biome) {
  const ring = Math.max(Math.abs(i), Math.abs(j));
  let opts = Object.keys(LANDMARKS).filter(k => LANDMARKS[k].biomes.includes(biome));
  if (ring === 1) { const r1 = opts.filter(k => RING1_LM.includes(k)); if (r1.length) opts = r1; }
  if (!opts.length) opts = ['ballongplass'];
  return opts[Math.floor(HH(i, j, 7) * opts.length)];
}
// position + ring + biome of a region cell, without its anchor kind (F.Realm computes the kingdom sites from this – no recursion)
function cellBase(i, j) {
  const ring = Math.max(Math.abs(i), Math.abs(j));
  let x = i * RS, z = j * RS;
  if (!(i === 0 && j === 0)) { x += (HH(i, j, 1) - 0.5) * 0.44 * RS; z += (HH(i, j, 2) - 0.5) * 0.44 * RS; }
  if (j === 2) z = 462 + (HH(i, j, 3) - 0.5) * 12;
  if (ring === 1 && j < 3) { const d = Math.hypot(x, z); if (d < 245) { x *= 245 / d; z *= 245 / d; } }
  return { i, j, id: 'r_' + i + '_' + j, x, z, ring, biome: biomeOf(i, j), sea: j >= 3 };
}
W.cellBase = cellBase;
W.regionHash = (i, j, salt) => HH(i, j, salt);
// flat plaza level of a kingdom site at the region centre (no cell lookups: the site's own biome height + the coast)
W.siteLevel = (i, j, b, biome) => Math.max(0.25, q(coast(b.x, b.z, (BH[biome || b.biome] || BH.blomstereng)(b.x, b.z), {})));
function cell(i, j) {
  const k = ck(i, j);
  let c = cells.get(k); if (c) return c;
  c = cellBase(i, j);
  const biome = c.biome, ring = c.ring;
  const site = (!c.sea && !(i === 0 && j === 0) && F.Realm && F.Realm.siteAt) ? F.Realm.siteAt(i, j) : null;
  if (i === 0 && j === 0) { c.kind = 'castle'; c.name = 'Slottsparken'; }
  else if (c.sea) { c.kind = 'sea'; c.name = null; }
  else if (site && F.Realm.site(site)) {
    // a kingdom (DESIGN2 §3.2): castle (or building site) at the region centre; the region takes the castle's name
    const st = F.Realm.site(site), R = F.REALMS && F.REALMS.get ? F.REALMS.get(site) : null;
    c.kind = 'kongeslott'; c.realm = site; c.name = R ? R.castle : site; c.biome = st.biome; c.forced = !!st.forced;
  }
  else {
    const g = nameGroups().g[(((i % 3) + 3) % 3) + 3 * (((j % 3) + 3) % 3)];
    c.name = g[Math.floor(HH(i, j, 5) * g.length)];
    c.kind = HH(i, j, 6) < (ring === 1 ? 0.7 : 0.55) ? 'village' : 'landmark';
    if (c.kind === 'landmark') {
      let lm = rawLandmark(i, j, biome);
      if (lm === rawLandmark(i - 1, j, biomeOf(i - 1, j)) || lm === rawLandmark(i, j - 1, biomeOf(i, j - 1))) {
        const opts = Object.keys(LANDMARKS).filter(k2 => LANDMARKS[k2].biomes.includes(biome) && k2 !== lm);
        if (opts.length) lm = opts[Math.floor(HH(i, j, 8) * opts.length)];
      }
      c.landmark = lm; c.landmarkName = LANDMARKS[lm].name;
    }
  }
  if (cells.size > 4000) cells.clear();
  cells.set(k, c);
  return c;
}
const cellIndex = (x, z) => [Math.floor(x / RS + 0.5), Math.floor(z / RS + 0.5)];
// two nearest region centres (written into o; re-entrant)
let NB_i = null, NB_j = null, NB_seed = null, NB = null;
function near2(x, z, o) {
  const ci = Math.floor(x / RS + 0.5), cj = Math.floor(z / RS + 0.5);
  if (ci !== NB_i || cj !== NB_j || NB_seed !== SEED() || !cells.has(ck(ci, cj))) {
    const arr = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) arr.push(cell(ci + di, cj + dj));
    NB = arr; NB_i = ci; NB_j = cj; NB_seed = SEED();
  }
  let r1 = null, r2 = null, d1 = Infinity, d2 = Infinity;
  for (let k = 0; k < 9; k++) {
    const c = NB[k], dx = c.x - x, dz = c.z - z, d = Math.sqrt(dx * dx + dz * dz);
    if (d < d1) { d2 = d1; r2 = r1; d1 = d; r1 = c; } else if (d < d2) { d2 = d; r2 = c; }
  }
  o.r1 = r1; o.r2 = r2; o.d1 = d1; o.d2 = d2;
  return o;
}
const wob = (x, z) => [x + (nz(x, z, 0.009, 31) - 0.5) * 46, z + (nz(x, z, 0.009, 32) - 0.5) * 46];
function regionCellAt(x, z) { const [wx, wz] = wob(x, z); return near2(wx, wz, {}).r1; }

/* coast (global, by z) */
function waterline(x) { return 500 + (nz(x, 0, 0.012, 41) - 0.5) * 26; }
function coast(x, z, h, o) {
  o.beach = 0;
  if (z < 384) return h;
  const zw = waterline(x);
  const k = U.smooth(U.clamp((z - 388) / 34, 0, 1));
  let hb;
  if (z < zw) { const a = U.clamp((zw - z) / 70, 0, 1); hb = 0.05 + 0.85 * a + 0.55 * a * nz(x, z, 0.06, 42); }
  else hb = Math.max(-3, -0.2 - (z - zw) * 0.16);
  o.beach = k;
  return U.lerp(h, hb, k);
}
// biome-blended height without any region features (used for zone levels and road grades)
const _n = {};
function hBase(x, z, o) {
  o = o || _n;
  const [wx, wz] = wob(x, z);
  near2(wx, wz, o);
  const t = U.clamp((o.d2 - o.d1) / 64, 0, 1), w1 = 0.5 + 0.5 * U.smooth(t);
  o.t = t;
  let h = BH[o.r1.biome](x, z);
  if (w1 < 0.999 && o.r2.biome !== o.r1.biome) h = h * w1 + BH[o.r2.biome](x, z) * (1 - w1);
  return coast(x, z, h, o);
}

/* =====================================================================================================================
   4. Layouts: zones, ports, villages, landmarks; roads; lakes
   ===================================================================================================================== */
const q = W.quant;
function lay(c) {
  if (c.L) return c.L;
  const L = c.L = { zone: null, ports: {}, paint: [], y: 0.25 };
  if (c.kind === 'sea') return L;
  if (c.kind === 'castle') { L.ports = { N: [0, -118], S: [0, 118], E: [118, 0], W: [-118, 0] }; return L; }
  if (c.kind === 'kongeslott') {
    // the footprint (60 × 50 m) is a W.reserve registered by F.Realm; the zone keeps lakes, creeks and fields away. Roads end at the
    // plaza edges: S at the gate path, N / E / W at the side path (z + 14) just outside the footprint.
    const st = F.Realm.site(c.realm), Fp = (F.CastleGen && F.CastleGen.FOOT) || { x0: -30, z0: -25, x1: 30, z1: 25 }, y = st ? st.y : 0.25;
    L.y = y;
    L.zone = { x0: c.x + Fp.x0, x1: c.x + Fp.x1, z0: c.z + Fp.z0, z1: c.z + Fp.z1, y, blend: 12 };
    L.ports = { N: [c.x + Fp.x1 + 1, c.z + 14], S: [c.x, c.z + Fp.z1 + 1], E: [c.x + Fp.x1 + 1, c.z + 14], W: [c.x + Fp.x0 - 1, c.z + 14] };
    if (c.j === 2) delete L.ports.S;
    return L;
  }
  const y = Math.max(0.25, q(hBase(c.x, c.z, {})));
  L.y = y;
  if (c.kind === 'village') {
    L.zone = { x0: c.x - 22, x1: c.x + 22, z0: c.z - 50, z1: c.z + 50, y, blend: 12 };
    L.ports = { N: [c.x, c.z - 47], S: [c.x, c.z + 47], E: [c.x + 13, c.z], W: [c.x - 13, c.z] };
    L.paint.push({ x0: c.x - 12, x1: c.x + 12, z0: c.z - 8, z1: c.z + 8, s: 3 });
    L.village = planVillage(c, L);
    L.vx = L.village.vx;                                           // the street itself is painted by inStreet() (it may bend)
    const A = Math.abs(L.vx.A); L.zone.x0 -= A; L.zone.x1 += A;
    // a little fair with a Ferris wheel at the south end of some villages (not on the coast / in the snow)
    if (HH(c.i, c.j, 48) < 0.3 && c.j < 2 && c.biome !== 'snohaugen') { const fs = HH(c.i, c.j, 49) < 0.5 ? -1 : 1; L.fair = { x: c.x + fs * 11, z: c.z + 60, side: fs }; L.zone.z1 = c.z + 69; }
  } else {
    L.zone = { x0: c.x - 25, x1: c.x + 25, z0: c.z - 32, z1: c.z + 18, y, blend: 12 };
    L.ports = { N: [c.x, c.z - 4], S: [c.x, c.z + 4], E: [c.x + 4, c.z], W: [c.x - 4, c.z] };
    L.paint.push({ x0: c.x - 5, x1: c.x + 5, z0: c.z - 5, z1: c.z + 5, s: 3 });
    if (c.landmark === 'regnbuebro') {
      // a little creek across the landmark, crossed by the rainbow footbridge (walkable deck)
      const cz = c.z - 16;
      L.feat = { h(x, z, zy) { const dz = Math.abs(z - cz), dx = Math.abs(x - c.x); if (dx > 22) return zy; const end = U.clamp((22 - dx) / 4, 0, 1); const k = U.smooth(U.clamp((dz - 1.4) / 1.6, 0, 1)); return U.lerp(U.lerp(zy, -0.85, end), zy, k); } };
      L.creek = { z: cz, x0: c.x - 22, x1: c.x + 22 };
    }
  }
  if (c.j === 2) delete L.ports.S;
  return L;
}
const JOBS = { blomstereng: ['maler', 'musikant', 'blomsterselger'], gardsland: ['bonde', 'gjeter', 'baker'], frukthage: ['baker', 'bonde', 'bestemor'],
  innsjo: ['fisker', 'batmann', 'maler'], strand: ['fisker', 'isselger', 'fyrvokter'], vindmolle: ['gjeter', 'bonde', 'musikant'],
  lavendel: ['blomsterselger', 'maler', 'bestefar'], snohaugen: ['leketoysmaker', 'bestemor', 'bestefar'], slott: ['musikant'] };
const WALLS = ['cream', 'peach', 'butter', 'mint', 'sky', 'lilac', 'cream2', 'white', 'brick', 'blossom'];
const ROOFS = [['roofRed', 'coral'], ['roofPink', 'blossom'], ['roofMint', 'mint'], ['roofBlue', 'sky'], ['roofLilac', 'lavender']];
const FLOWERS = ['rose', 'butter', 'pink', 'white', 'lilac', 'coral', 'orange'];
/* village looks: a colour theme per village (walls, roofs, house styles, flowers, bunting accents) – region-specific accents */
const THEMES = {
  rosa: { walls: ['blossom', 'cream', 'peach', 'white'], roofs: ['roofPink', 'roofRed'], styles: ['a', 'f', 'c', 'a'], fl: ['rose', 'pink', 'white'], acc: ['pink', 'rose', 'white', 'blossom'], tree: 'blossom' },
  mint: { walls: ['mint', 'cream', 'white', 'sky'], roofs: ['roofMint', 'roofBlue'], styles: ['f', 'a', 'b'], fl: ['white', 'butter', 'sky'], acc: ['mint', 'sky', 'white', 'butter'], tree: 'leaf2' },
  sol: { walls: ['butter', 'cream', 'peach', 'cream2'], roofs: ['roofRed', 'roofLilac'], styles: ['a', 'd', 'c'], fl: ['butter', 'orange', 'rose'], acc: ['butter', 'orange', 'coral', 'white'], tree: 'leaf' },
  lilla: { walls: ['lilac', 'cream2', 'white', 'blossom'], roofs: ['roofLilac', 'roofPink'], styles: ['b', 'c', 'f'], fl: ['lilac', 'white', 'pink'], acc: ['lilac', 'purple', 'white', 'pink'], tree: 'blossom' },
  tre: { walls: ['butter', 'white', 'cream', 'peach'], roofs: ['roofMint', 'roofRed'], styles: ['e', 'e', 'a', 'd'], fl: ['rose', 'white', 'butter'], acc: ['red', 'white', 'butter', 'sky'], tree: 'leaf' },
  hav: { walls: ['sky', 'white', 'mint', 'cream'], roofs: ['roofBlue', 'roofRed'], styles: ['a', 'b', 'f'], fl: ['white', 'sky', 'coral'], acc: ['sky', 'white', 'coral', 'butter'], tree: 'leaf2' },
};
const THEME_BY_BIOME = { strand: ['hav', 'hav', 'mint'], snohaugen: ['tre', 'mint', 'rosa'], lavendel: ['lilla', 'rosa', 'sol'], gardsland: ['tre', 'sol', 'rosa'],
  blomstereng: ['rosa', 'sol', 'lilla', 'mint'], frukthage: ['sol', 'rosa', 'tre'], innsjo: ['hav', 'mint', 'lilla'], vindmolle: ['tre', 'sol', 'mint'] };
W.VILLAGE_THEMES = THEMES;
// MODELS-3 house (v_hus_lo ≈ 5k triangles, styles a–f) when present, else WORLD's own wd_hus cottage
const HSTYLE = { a: [36, 28], b: [28, 26], c: [32, 32], d: [38, 28], e: [36, 28], f: [34, 30] };
function houseSpec(look) {
  const id = pickHouseModel();
  if (id === 'wd_hus') return { id, fd: 2.0, hx: 2.9, hz: 2.1, opts: look };
  const st = HSTYLE[look.style] || HSTYLE.a, meta = F.VOX.defs.v_hus && F.VOX.defs.v_hus.meta;
  let fd = st[1] / 16 + 0.12;
  try { if (meta && meta.anchorsFor) fd = meta.anchorsFor(look).door[2] - 0.2; } catch (e) { /* keep estimate */ }
  return { id, fd, hx: st[0] / 16 + 0.1, hz: st[1] / 16 + 0.1, opts: Object.assign({ door: false }, look) };
}
/* house designs: 6 looks per theme, shared by every village of that theme, so the voxel geometry cache is hit (a new v_hus look costs
   ≈ 15–20 ms to build). Designs of a planned village are pre-built one per idle frame (no streaming) before she gets there. */
const HDESIGN = {}, warmQ = [], warmed = new Set();
function designs(theme) {
  if (HDESIGN[theme]) return HDESIGN[theme];
  const TH = THEMES[theme] || THEMES.rosa, out = [];
  for (let k = 0; k < 6; k++) {
    const style = TH.styles[k % TH.styles.length];
    const look = { style, roof: TH.roofs[(k + (k >> 1)) % TH.roofs.length], fl: TH.fl[k % TH.fl.length], wall: TH.walls[(k * 3 + 1) % TH.walls.length], roof2: 'blossom' };
    if (style === 'e' || style === 'd') delete look.wall;   // red wooden house / half-timbered keep their signature walls
    out.push(look);
  }
  return (HDESIGN[theme] = out);
}
function warmTheme(theme) { if (warmed.has(theme)) return; warmed.add(theme); for (const look of designs(theme)) warmQ.push(look); }
F.on('tick', () => {
  if (!warmQ.length || !F.booted || (W.pending && W.pending() > 0)) return;
  const sp = houseSpec(warmQ.shift());
  try { F.VOX.geometry(sp.id, sp.opts); } catch (e) { /* the build path reports it */ }
});
// street centre-line: x offset at z (0 at the plaza and at both street ends, where the roads join). shape 1 = S-bend, 2 = C-bend
function streetOff(vx, z) {
  if (!vx || !vx.A) return 0;
  const u = U.clamp((z - vx.cz) / 47, -1, 1), sn = Math.sin(Math.PI * u);
  return vx.A * sn * sn * (vx.shape === 1 && u < 0 ? -1 : 1);
}
const inStreet = (vx, x, z, pad) => Math.abs(z - vx.cz) <= 47 + pad && Math.abs(x - (vx.cx + streetOff(vx, z))) <= 2.5 + pad;
W.streetOff = streetOff;
function planVillage(c, L) {
  const r = U.rng(U.hashStr('village' + c.id + ':' + SEED()));
  const n = U.int(r, 6, 10);
  // v5 WP-W (DESIGN4 §8): natural house numbers like a real street – odd on the west side, even on the east, rising along the street
  // (north → south). Each side has 6 house places (slot 0–5, the plaza between slot 2 and 3). The street starts at 1 in half of the
  // villages; others are a later stretch of a long road (e.g. 9–20, 13–24, 31–42 or 47–58), so numbers run 1–58 across the world.
  // Missing places stay gaps (plots / a fallen number post use them). base is odd; slot k → west base + 2k, east base + 1 + 2k.
  const hb = HH(c.i, c.j, 61), hb2 = HH(c.i, c.j, 62);
  // 40 % start at 1, 35 % are the stretch 9/11/13 → 20–24 (F02's real-street mode reads doors 10–20), 25 % start high (21–47)
  const base = hb < 0.4 ? 1 : hb < 0.75 ? 1 + 2 * (4 + Math.floor(hb2 * 3)) : 1 + 2 * (10 + Math.floor(hb2 * 14));
  // the house PLACES are drawn exactly as before v5 (same rng calls: old numbers 10–20 → slot / side), so saved villages keep their
  // layout, residents and looks – only the plates change: old odd 11+2k (west, slot k) → base+2k, old even 10+2k (east) → base+2k+1
  // (kept in the old order, so names / jobs / looks per house stay as they were)
  const old = U.shuffle(r, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).slice(0, n).sort((a, b) => a - b);
  const nums = old.map(o => o % 2 ? base + (o - 11) : base + (o - 10) + 1);
  const names = U.shuffle(r, F.SETS.NAMES);
  const jobs = JOBS[c.biome] || JOBS.blomstereng;
  // layout variety: straight (30 %), S-bend or C-bend street; theme by biome
  const hv = HH(c.i, c.j, 44);
  const vx = { cx: c.x, cz: c.z, A: hv < 0.3 ? 0 : (2.5 + HH(c.i, c.j, 45) * 3) * (HH(c.i, c.j, 46) < 0.5 ? -1 : 1), shape: hv < 0.65 ? 1 : 2 };
  const tl = c.j === 2 ? THEME_BY_BIOME.strand : (THEME_BY_BIOME[c.biome] || Object.keys(THEMES));
  const theme = tl[Math.floor(HH(c.i, c.j, 47) * tl.length)], TH = THEMES[theme];
  const houses = nums.map((num, k) => {
    const slot = Math.floor((num - base) / 2), odd = num % 2 === 1;
    const zz = (slot <= 2 ? c.z + 13 + (2 - slot) * 11 : c.z - 13 - (slot - 3) * 11) + (r() - 0.5) * 2.4;
    const side = odd ? -1 : 1;                       // odd = west (left when walking north), even = east
    const so = streetOff(vx, zz), tilt = Math.atan(streetOff(vx, zz + 0.5) - streetOff(vx, zz - 0.5));
    const set = 9.1 + r() * 1.4;                     // setback from the street centre
    const x = c.x + so + side * set, ry = (odd ? Math.PI / 2 : -Math.PI / 2) + tilt;
    const look = Object.assign({}, designs(theme)[Math.floor(r() * 6)]);
    const sp = houseSpec(look);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    const door = { x: x + fx * (sp.fd + 0.2), z: zz + fz * (sp.fd + 0.2) };   // at the door (as Wave 1: plaques / F02 use it)
    const step = { x: x + fx * (sp.fd + 1.2), z: zz + fz * (sp.fd + 1.2) };   // the doorstep: free to stand on, in front of the door thing
    const resident = { name: names[k], job: jobs[k % jobs.length], voice: r() < 0.5 ? 'vm' : 'vk' };
    return { num, slot, side, x, z: zz, ry, fx, fz, tilt, fd: sp.fd, door, step, doorThing: { x: x + fx * (sp.fd + 0.1), z: zz + fz * (sp.fd + 0.1) }, doorThingId: 'hd:' + c.id + ':' + old[k], oid: old[k],
      look, model: sp.id, opts: sp.opts, bx: sp.hz + Math.abs(tilt) * sp.hx * 0.5, bz: sp.hx + Math.abs(tilt) * sp.hz * 0.5, depth: sp.hz, resident, extra: r() };
  });
  // door paths (door → street edge) and flower beds beside each path
  houses.forEach(hh => {
    const ex = c.x + streetOff(vx, hh.z) + hh.side * 2.5;
    L.paint.push({ x0: Math.min(hh.door.x, ex), x1: Math.max(hh.door.x, ex), z0: hh.z - 0.6, z1: hh.z + 0.6, s: 4 });
    const bx = hh.door.x - hh.side * 1.4;
    L.paint.push({ x0: bx - 0.5, x1: bx + 0.5, z0: hh.z - 2.7, z1: hh.z - 1.1, s: 9 }); L.paint.push({ x0: bx - 0.5, x1: bx + 0.5, z0: hh.z + 1.1, z1: hh.z + 2.7, s: 9 });
  });
  const used = new Set(houses.map(hh => hh.slot * 2 + (hh.side < 0 ? 1 : 0)));
  const plots = [];
  for (const [slot, side] of [[5, -1], [0, -1], [4, 1], [1, 1], [3, -1], [2, 1]]) {
    if (plots.length >= 2) break;
    if (used.has(slot * 2 + (side < 0 ? 1 : 0))) continue;
    const zz = slot <= 2 ? c.z + 13 + (2 - slot) * 11 : c.z - 13 - (slot - 3) * 11;
    plots.push({ id: 'tomt_' + c.id + '_' + (plots.length + 1), x: c.x + streetOff(vx, zz) + side * 9.5, z: zz });
  }
  while (plots.length < 2) { const k = plots.length; plots.push({ id: 'tomt_' + c.id + '_' + (k + 1), x: c.x + (k ? 9 : -9), z: c.z + (k ? -45 : 45) }); }
  warmTheme(theme);
  // the street's natural number range and its gaps (no house there): a fallen number post / a new neighbour's house take these
  const numLo = base, numHi = base + 11, have = new Set(houses.map(hh => hh.num));
  const gaps = []; for (let k = numLo; k <= numHi; k++) if (!have.has(k)) gaps.push(k);
  return { houses, plots, vx, theme, numLo, numHi, gaps, residents: houses.map(hh => Object.assign({ houseNum: hh.num }, hh.resident)) };
}

/* roads: polylines between neighbouring region ports (Catmull-Rom through wobbled control points) */
const roadCache = new Map();
const OPP = { E: 'W', W: 'E', N: 'S', S: 'N' };
function road(a, dir) {
  const b = dir === 'E' ? cell(a.i + 1, a.j) : cell(a.i, a.j + 1);
  const key = a.id + '>' + dir;
  if (roadCache.has(key)) return roadCache.get(key);
  let R = null;
  if (!a.sea && !b.sea) {
    const pa = lay(a).ports[dir], pb = lay(b).ports[OPP[dir]];
    if (pa && pb) R = buildRoad(a, b, pa, pb, dir === 'E' ? [1, 0] : [0, 1]);
  }
  if (roadCache.size > 3000) roadCache.clear();
  roadCache.set(key, R);
  return R;
}
function buildRoad(a, b, pa, pb, dv) {
  const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const px = -dv[1], pz = dv[0];
  const lead = Math.min(22, len * 0.18);
  const P1 = [pa[0] + dv[0] * lead, pa[1] + dv[1] * lead], P4 = [pb[0] - dv[0] * lead, pb[1] - dv[1] * lead];
  const o1 = (HH(a.i * 3 + b.i, a.j * 5 + b.j, 11) - 0.5) * 0.28 * len, o2 = (HH(a.i * 3 + b.i, a.j * 5 + b.j, 12) - 0.5) * 0.28 * len;
  const M1 = [U.lerp(P1[0], P4[0], 0.36) + px * o1, U.lerp(P1[1], P4[1], 0.36) + pz * o1];
  const M2 = [U.lerp(P1[0], P4[0], 0.68) + px * o2, U.lerp(P1[1], P4[1], 0.68) + pz * o2];
  const C = [pa, P1, M1, M2, P4, pb];
  const pts = [];
  for (let k = 0; k < C.length - 1; k++) {
    const p0 = C[Math.max(0, k - 1)], p1 = C[k], p2 = C[k + 1], p3 = C[Math.min(C.length - 1, k + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3));
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      const f = (A, B, Cc, D) => 0.5 * ((2 * B) + (-A + Cc) * t + (2 * A - 5 * B + 4 * Cc - D) * t2 + (-A + 3 * B - 3 * Cc + D) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(pb.slice());
  let hs = pts.map(p => Math.max(0.25, hNoRoad(p[0], p[1])));
  for (let pass = 0; pass < 4; pass++) hs = hs.map((h, i) => (i === 0 || i === hs.length - 1) ? h : 0.25 * hs[i - 1] + 0.5 * h + 0.25 * hs[i + 1]);
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
  return { a: a.id, b: b.id, pts, hs, x0, z0, x1, z1 };
}
function cellRoads(c) {
  if (c.roads) return c.roads;
  const l = [road(c, 'E'), road(c, 'S'), road(cell(c.i - 1, c.j), 'E'), road(cell(c.i, c.j - 1), 'S')];
  c.roads = { E: l[0], S: l[1], W: l[2], N: l[3], list: l.filter(Boolean) };
  return c.roads;
}
// road segments relevant to a chunk (cached): Float64Array [ax,az,bx,bz,ha,hb]*n
const segCache = new Map();
function chunkSegs(cx, cz) {
  const k = (cx + 32768) * 65536 + (cz + 32768);
  let s = segCache.get(k); if (s) return s;
  const X0 = cx * 32 - 7, Z0 = cz * 32 - 7, X1 = cx * 32 + 39, Z1 = cz * 32 + 39;
  const [ci, cj] = cellIndex(cx * 32 + 16, cz * 32 + 16);
  const out = [];
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const c = cell(ci + di, cj + dj); if (c.sea) continue;
    for (const R of [road(c, 'E'), road(c, 'S')]) {
      if (!R || R.x1 < X0 || R.x0 > X1 || R.z1 < Z0 || R.z0 > Z1) continue;
      for (let m = 0; m < R.pts.length - 1; m++) {
        const a = R.pts[m], b = R.pts[m + 1];
        if (Math.max(a[0], b[0]) < X0 || Math.min(a[0], b[0]) > X1 || Math.max(a[1], b[1]) < Z0 || Math.min(a[1], b[1]) > Z1) continue;
        out.push(a[0], a[1], b[0], b[1], R.hs[m], R.hs[m + 1]);
      }
    }
  }
  s = new Float64Array(out);
  if (segCache.size > 1500) segCache.clear();
  segCache.set(k, s);
  return s;
}
let RS_cx = null, RS_cz = null, RS_s = null;
function roadAt(x, z, o) {
  const cx = Math.floor(x / 32), cz = Math.floor(z / 32);
  if (cx !== RS_cx || cz !== RS_cz || !RS_s) { RS_s = chunkSegs(cx, cz); RS_cx = cx; RS_cz = cz; }
  const S = RS_s;
  let best = 1e9, bh = 0;
  for (let i = 0; i < S.length; i += 6) {
    const ax = S[i], az = S[i + 1], vx = S[i + 2] - ax, vz = S[i + 3] - az, L = vx * vx + vz * vz || 1;
    let t = ((x - ax) * vx + (z - az) * vz) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (ax + t * vx), dz = z - (az + t * vz), d = dx * dx + dz * dz;
    if (d < best) { best = d; bh = S[i + 4] + (S[i + 5] - S[i + 4]) * t; }
  }
  o.rd = Math.sqrt(best); o.rh = bh;
  return o;
}
// zones (flat areas of villages / landmarks) of the two nearest regions
function zoneApply(c, x, z, h, o) {
  const L = lay(c); const zn = L.zone; if (!zn) return h;
  const dx = Math.max(zn.x0 - x, 0, x - zn.x1), dz = Math.max(zn.z0 - z, 0, z - zn.z1);
  if (dx === 0 && dz === 0) { o.zone = c; return L.feat && L.feat.h ? L.feat.h(x, z, zn.y) : zn.y; }
  if (dx > zn.blend || dz > zn.blend) return h;
  const d = Math.hypot(dx, dz); if (d >= zn.blend) return h;
  return U.lerp(zn.y, h, U.smooth(d / zn.blend));
}
function hNoRoad(x, z) {
  const o = {};
  let h = hBase(x, z, o);
  h = zoneApply(o.r1, x, z, h, o); if (o.r2) h = zoneApply(o.r2, x, z, h, o);
  return h;
}

/* lakes (after roads, so they can avoid them) */
function lakesOf(c) {
  if (c.lakes) return c.lakes;
  c.lakes = [];
  if (c.kind === 'sea' || c.kind === 'castle' || c.j >= 2) return c.lakes;
  const big = c.biome === 'innsjo';
  const pondBiome = ['blomstereng', 'gardsland', 'frukthage', 'lavendel', 'vindmolle'].includes(c.biome);
  if (!big && !(pondBiome && HH(c.i, c.j, 20) < 0.5)) return c.lakes;
  const roads = cellRoads(c).list, L = lay(c), zn = L.zone;
  const r0 = big ? 22 + HH(c.i, c.j, 21) * 12 : 7 + HH(c.i, c.j, 21) * 4;
  const neigh = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (di || dj) neigh.push(cell(c.i + di, c.j + dj));
  const a0 = HH(c.i, c.j, 22) * Math.PI * 2;
  for (let k = 0; k < 12; k++) {
    const ang = a0 + k * (Math.PI / 6), dist = (big ? 78 : 46) + (k % 3) * 9;
    const lx = c.x + Math.cos(ang) * dist, lz = c.z + Math.sin(ang) * dist;
    if (Math.abs(lx) < 112 + r0 + 26 && Math.abs(lz) < 112 + r0 + 26) continue;
    if (lz + r0 * 1.4 > 384) continue;
    if (zn && lx > zn.x0 - r0 * 1.3 - 8 && lx < zn.x1 + r0 * 1.3 + 8 && lz > zn.z0 - r0 * 1.3 - 8 && lz < zn.z1 + r0 * 1.3 + 8) continue;
    let ok = true;
    for (const R of roads) { for (const p of R.pts) if (Math.hypot(p[0] - lx, p[1] - lz) < r0 * 1.32 + 7) { ok = false; break; } if (!ok) break; }
    if (!ok) continue;
    const dOwn = Math.hypot(lx - c.x, lz - c.z);
    for (const nb of neigh) if (Math.hypot(lx - nb.x, lz - nb.z) < dOwn + r0 * 1.6) { ok = false; break; }
    if (!ok) continue;
    const lake = { x: lx, z: lz, r: r0, depth: big ? -1.25 : -0.95, p1: HH(c.i, c.j, 23) * 6.28, p2: HH(c.i, c.j, 24) * 6.28, big, id: c.id + ':l' };
    if (big && HH(c.i, c.j, 25) < 0.7) { const ia = HH(c.i, c.j, 26) * 6.28; lake.islet = { x: lx + Math.cos(ia) * r0 * 0.35, z: lz + Math.sin(ia) * r0 * 0.35, r: 4.2 }; }
    c.lakes.push(lake);
    break;
  }
  return c.lakes;
}
function lakeApply(c, x, z, h, o) {
  const ls = lakesOf(c);
  for (let i = 0; i < ls.length; i++) {
    const L = ls[i]; const dx = x - L.x, dz = z - L.z;
    if (Math.abs(dx) > L.r * 1.6 + 8 || Math.abs(dz) > L.r * 1.6 + 8) continue;
    const d = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
    const rr = L.r * (1 + 0.16 * Math.sin(3 * ang + L.p1) + 0.09 * Math.sin(5 * ang + L.p2));
    const s = d / rr;
    let p = s < 1 ? L.depth + (0.3 - L.depth) * s * s : 0.3 + (s - 1) * rr * 0.12;
    if (L.islet) { const di = Math.hypot(x - L.islet.x, z - L.islet.z); if (di < L.islet.r * 1.6) p = Math.max(p, U.lerp(0.75, -0.6, U.clamp((di - L.islet.r * 0.55) / (L.islet.r), 0, 1))); }
    if (p < h) { h = p; }
    if (s < o.lakeS) { o.lakeS = s; o.lake = L; }
  }
  return h;
}

/* creeks: a meandering shallow stream in about half of the inland regions (≈ 0.1 m of water over a sand bed – it never blocks
   walking), crossed by arched footbridges (OBJ's v_bro) where roads cross it, or once in the middle. Stays inside its own region. */
const CREEK_BIOMES = { blomstereng: 1, gardsland: 1, frukthage: 1, lavendel: 1, vindmolle: 1, innsjo: 1 };
function creekOf(c) {
  if (c.creek !== undefined) return c.creek;
  c.creek = null;
  if (c.kind === 'sea' || c.kind === 'castle' || c.j >= 2 || !CREEK_BIOMES[c.biome] || HH(c.i, c.j, 60) > 0.55) return null;
  const a = HH(c.i, c.j, 61) * Math.PI * 2, side = HH(c.i, c.j, 63) < 0.5 ? -1 : 1, d0 = 42 + HH(c.i, c.j, 62) * 34;
  const dx = Math.cos(a), dz = Math.sin(a), nx = -dz * side, nzz = dx * side;
  const amp = 5 + HH(c.i, c.j, 64) * 5, ph = HH(c.i, c.j, 65) * 6.28;
  const neigh = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) neigh.push(cell(c.i + di, c.j + dj));
  const ok = (x, z) => {
    if (Math.abs(x) < 136 && Math.abs(z) < 136) return false;
    if (z > 378) return false;
    for (const nb of neigh) { if (nb.sea) continue; const zn = lay(nb).zone; if (zn && x > zn.x0 - 7 && x < zn.x1 + 7 && z > zn.z0 - 7 && z < zn.z1 + 7) return false; }
    return regionCellAt(x, z).id === c.id;
  };
  let best = [], run = [];
  for (let t = -80; t <= 80; t += 2.5) {
    const w = Math.sin(t / 17 + ph) * amp + Math.sin(t / 6.5 + ph * 2) * 1.3;
    const x = c.x + nx * d0 + dx * t + nx * w, z = c.z + nzz * d0 + dz * t + nzz * w;
    if (ok(x, z)) { run.push([x, z]); if (run.length > best.length) best = run; } else run = [];
  }
  if (best.length < 22) return null;
  const pts = best;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
  const K = { id: c.id + ':ck', pts, x0: x0 - 4, z0: z0 - 4, x1: x1 + 4, z1: z1 + 4, bridges: [], grid: new Map() };
  // 4 m lookup grid → segment indices within reach (the terrain sampler then tests 1–3 segments instead of all)
  for (let i = 0; i < pts.length - 1; i++) {
    const a2 = pts[i], b2 = pts[i + 1];
    for (let gx = Math.floor((Math.min(a2[0], b2[0]) - 3.5) / 4); gx <= Math.floor((Math.max(a2[0], b2[0]) + 3.5) / 4); gx++)
      for (let gz = Math.floor((Math.min(a2[1], b2[1]) - 3.5) / 4); gz <= Math.floor((Math.max(a2[1], b2[1]) + 3.5) / 4); gz++) {
        const k = gx * 100003 + gz; let L = K.grid.get(k); if (!L) K.grid.set(k, L = []); L.push(i);
      }
  }
  c.creek = K;
  // bridges: where a road crosses (deck along the road), else one footbridge in the middle (deck across the creek)
  const segX = (p, q, r2, s2) => { const d = (q[0] - p[0]) * (s2[1] - r2[1]) - (q[1] - p[1]) * (s2[0] - r2[0]); if (Math.abs(d) < 1e-9) return null; const t = ((r2[0] - p[0]) * (s2[1] - r2[1]) - (r2[1] - p[1]) * (s2[0] - r2[0])) / d, u = ((r2[0] - p[0]) * (q[1] - p[1]) - (r2[1] - p[1]) * (q[0] - p[0])) / d; return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, u] : null; };
  for (const R of cellRoads(c).list) {
    if (R.x1 < K.x0 || R.x0 > K.x1 || R.z1 < K.z0 || R.z0 > K.z1) continue;
    for (let m = 0; m < R.pts.length - 1 && K.bridges.length < 3; m++) for (let i = 0; i < pts.length - 1; i++) {
      const X = segX(R.pts[m], R.pts[m + 1], pts[i], pts[i + 1]); if (!X) continue;
      const ry = Math.atan2(R.pts[m + 1][0] - R.pts[m][0], R.pts[m + 1][1] - R.pts[m][1]);
      // a slanted crossing makes the water wider along the road: stretch the bridge (thing scale) to span it
      const rl = Math.hypot(R.pts[m + 1][0] - R.pts[m][0], R.pts[m + 1][1] - R.pts[m][1]) || 1, cl = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) || 1;
      const sin = Math.abs(((R.pts[m + 1][0] - R.pts[m][0]) * (pts[i + 1][1] - pts[i][1]) - (R.pts[m + 1][1] - R.pts[m][1]) * (pts[i + 1][0] - pts[i][0])) / (rl * cl));
      const sc = U.clamp(3.3 / Math.max(0.2, sin) / 3.4, 1, 1.7);
      if (!K.bridges.some(b => Math.hypot(b.x - X[0], b.z - X[1]) < 8)) K.bridges.push({ x: X[0], z: X[1], ry, y: R.hs[m] + (R.hs[m + 1] - R.hs[m]) * X[2], road: true, s: sc });
    }
  }
  if (!K.bridges.length) { const m = Math.floor(pts.length / 2), p = pts[m], q = pts[m + 1]; K.bridges.push({ x: (p[0] + q[0]) / 2, z: (p[1] + q[1]) / 2, ry: Math.atan2(q[0] - p[0], q[1] - p[1]) + Math.PI / 2, y: null, road: false }); }
  return K;
}
function creekDist(K, x, z) {
  const P = K.pts, IX = K.grid.get(Math.floor(x / 4) * 100003 + Math.floor(z / 4)); let best = 1e9;
  if (!IX) return 1e9;
  for (let q2 = 0; q2 < IX.length; q2++) {
    const i = IX[q2], a = P[i], b = P[i + 1];
    if (x < Math.min(a[0], b[0]) - 3.5 || x > Math.max(a[0], b[0]) + 3.5 || z < Math.min(a[1], b[1]) - 3.5 || z > Math.max(a[1], b[1]) + 3.5) continue;
    const vx = b[0] - a[0], vz = b[1] - a[1], L = vx * vx + vz * vz || 1;
    let t = ((x - a[0]) * vx + (z - a[1]) * vz) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - (a[0] + t * vx), ez = z - (a[1] + t * vz), d = ex * ex + ez * ez;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
function creekApply(c, x, z, h, o) {
  const K = c && creekOf(c); if (!K || x < K.x0 || x > K.x1 || z < K.z0 || z > K.z1) return h;
  const d = creekDist(K, x, z); if (d >= 3.3) return h;
  if (d < o.creekD) { o.creekD = d; o.creek = K; }
  const bed = -0.32, p = d < 1.15 ? bed : U.lerp(bed, Math.max(h, 0.25), U.smooth((d - 1.15) / 2.1));
  return Math.min(h, p);
}

/* fields (farm / lavender / tulip blocks), decided per block and cached */
const FIELDS = {
  gardsland: { bw: 22, bd: 15, kinds: [['hvete', 3], ['aker', 2], ['tulipan', 1.5], ['beite', 3], [null, 2]] },
  lavendel: { bw: 26, bd: 17, kinds: [['lavendel', 6], ['solsikke', 2], ['tulipan', 1], [null, 1]] },
  blomstereng: { bw: 20, bd: 14, kinds: [['tulipan', 1], [null, 8]] },
  vindmolle: { bw: 22, bd: 16, kinds: [['beite', 2], ['hvete', 1], [null, 5]] },
  frukthage: { bw: 28, bd: 22, kinds: [['frukt', 7], [null, 2]] },
};
const FK = { hvete: 1, aker: 2, tulipan: 3, beite: 4, lavendel: 5, solsikke: 6, frukt: 7 };
const FKN = [null, 'hvete', 'aker', 'tulipan', 'beite', 'lavendel', 'solsikke', 'frukt'];
const blockCache = new Map();
function fieldBlock(biome, bi, bj) {
  const k = BIDX[biome] * 1e10 + (bi + 50000) * 100000 + (bj + 50000);
  if (blockCache.has(k)) return blockCache.get(k);
  const FD = FIELDS[biome]; let res = null;
  const kind = pickW(FD.kinds, U.hash2(bi * 17 + 3, bj * 29 + 7, (SEED() + BIDX[biome] * 977) | 0));
  if (kind) {
    const ox = (SEED() % 97), oz = (SEED() % 89);
    const x0 = ox + bi * FD.bw, z0 = oz + bj * FD.bd, x1 = x0 + FD.bw, z1 = z0 + FD.bd;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    let ok = !(Math.abs(cx) < 112 + FD.bw && Math.abs(cz) < 112 + FD.bd) && cz < 380;
    if (ok) {
      const o = {}; const rc = regionCellAt(cx, cz);
      if (rc.biome !== biome) ok = false;
      // no roads / zones / lakes inside the block (+3 m)
      for (let dj = -1; dj <= 1 && ok; dj++) for (let di = -1; di <= 1 && ok; di++) {
        const c = cell(rc.i + di, rc.j + dj);
        if (c.sea) continue;
        const zn = lay(c).zone; if (zn && zn.x1 + 4 > x0 && zn.x0 - 4 < x1 && zn.z1 + 4 > z0 && zn.z0 - 4 < z1) ok = false;
        for (const R of cellRoads(c).list) { if (R.x1 < x0 - 6 || R.x0 > x1 + 6 || R.z1 < z0 - 6 || R.z0 > z1 + 6) continue; for (const p of R.pts) if (p[0] > x0 - 4 && p[0] < x1 + 4 && p[1] > z0 - 4 && p[1] < z1 + 4) { ok = false; break; } if (!ok) break; }
        for (const L of lakesOf(c)) if (Math.hypot(Math.max(x0 - L.x, 0, L.x - x1), Math.max(z0 - L.z, 0, L.z - z1)) < L.r * 1.4 + 4) ok = false;
      }
      void o;
    }
    if (ok) res = { kind, x0, z0, x1, z1, bi, bj, h: U.hash2(bi, bj, SEED() + 5) };
  }
  if (blockCache.size > 4000) blockCache.clear();
  blockCache.set(k, res);
  return res;
}
function fieldAt(biome, x, z) {
  const FD = FIELDS[biome]; if (!FD) return null;
  const ox = (SEED() % 97), oz = (SEED() % 89);
  const bi = Math.floor((x - ox) / FD.bw), bj = Math.floor((z - oz) / FD.bd);
  const B = fieldBlock(biome, bi, bj); if (!B) return null;
  const lane = B.kind === 'frukt' ? 1 : 1.5;
  if (x < B.x0 + lane || x > B.x1 - lane || z < B.z0 + lane || z > B.z1 - lane) return null;
  return B;
}

/* =====================================================================================================================
   5. The sample function (height + colour + surface code) used by the terrain mesher
   ===================================================================================================================== */
// surface codes stored per cell
const SF = { GRASS: 0, ROAD: 1, EDGE: 2, PLAZA: 3, PATH: 4, SAND: 5, WET: 6, FIELD: 7, FIELD2: 8, BED: 9, SNOW: 10, ICE: 11 };
W.SURF = SF;
const SO = {};
function sampleFn(x, z, out) {
  const o = SO; o.zone = null; o.lakeS = 9; o.lake = null; o.beach = 0;
  let h = hBase(x, z, o);
  const r1 = o.r1, r2 = o.r2, t = o.t;
  h = zoneApply(r1, x, z, h, o); h = zoneApply(r2, x, z, h, o);
  h = lakeApply(r1, x, z, h, o); h = lakeApply(r2, x, z, h, o);
  roadAt(x, z, o);
  const rw = 1.5, sh = 3.2;
  if (o.rd < rw + sh) { const k = o.rd <= rw ? 0 : U.smooth((o.rd - rw) / sh); h = U.lerp(o.rh, h, k); }
  o.creekD = 9; o.creek = null;
  h = creekApply(r1, x, z, h, o); if (r2 !== r1) h = creekApply(r2, x, z, h, o);
  out.h = h;
  // biome used for colour: dithered near borders
  let b = r1.biome;
  if (t < 0.3 && r2 && r2.biome !== b && U.hash2(Math.floor(x * 2), Math.floor(z * 2), 77) < (0.3 - t) * 1.6) b = r2.biome;
  out.bio = BIDX[b]; out.region = r1; out.fk = 0;
  const hq = q(h);
  const ix = Math.floor(x * 2), iz = Math.floor(z * 2);
  const jit = U.hash2(ix, iz, 3);
  let col, s = SF.GRASS;
  // painted surfaces (street, plaza, door paths, beds) of the zone this point is in
  let paint = 0;
  if (o.zone || (o.rd < 60)) {
    for (const c of [r1, r2]) { const L = c && c.L; if (!L || !L.paint.length) continue; if (L.vx && inStreet(L.vx, x, z, 0)) paint = Math.max(paint, 3); for (const p of L.paint) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) { paint = Math.max(paint, p.s); } }
  }
  if (o.creekD < 3.3 && hq < W.WATER) { s = SF.WET; col = mix(mix(P('sand'), 0xe8d29a, jit * 0.5), 0x7cc4b4, 0.35); }
  else if (o.rd < rw) { s = SF.ROAD; col = mix(0xe0c99a, 0xd0b788, jit < 0.18 ? 0.8 : jit * 0.35); if (b === 'snohaugen') col = mix(col, P('snow'), 0.25); }
  else if (o.rd < rw + 0.55 && hq >= W.WATER) { s = SF.EDGE; col = mix(0xc4ae86, 0xb49e78, jit * 0.5); }
  else if (paint === 3) { s = SF.PLAZA; col = ((ix + iz) & 1) ? mix(0xd8ccb4, 0xc4b69c, 0.3 + jit * 0.4) : mix(0xe4dac6, 0xd8ccb4, jit * 0.5); }
  else if (paint === 4) { s = SF.PATH; col = mix(0xe0c896, 0xd2b884, jit * 0.5); }
  else if (paint === 9) { s = SF.BED; col = mix(P('soil'), P('woodDark'), jit * 0.2); }
  else if (hq < W.WATER) { s = SF.WET; const d = U.clamp((W.WATER - hq) / 1.3, 0, 1); col = mix(mix(P('sand'), 0xe8d29a, jit * 0.5), 0x5fae9e, d * 0.75); if (b === 'snohaugen') col = mix(col, P('ice'), 0.5); }
  else if (o.lakeS < 1.13 && hq <= 0.5) { s = SF.SAND; col = mix(P('sand'), 0xf7e8c0, jit * 0.5); }
  else if (o.beach > 0 && jit < o.beach * 1.25 - 0.1) { s = SF.SAND; col = mix(P('sand'), jit < 0.5 ? 0xf8eac4 : 0xead39c, (jit * 7) % 1 * 0.6); if (z > waterline(x) - 6) col = mix(col, 0xd9c08a, 0.4); }
  else col = biomeColour(b, x, z, hq, ix, iz, jit, out);
  if (out.fk && s === SF.GRASS) s = out.fk === FK.frukt ? SF.GRASS : ((out.row & 1) ? SF.FIELD2 : SF.FIELD);
  if (b === 'snohaugen' && s === SF.GRASS) s = SF.SNOW;
  const kk = (b === 'snohaugen' && (s === SF.GRASS || s === SF.SNOW)) ? Math.min(1, W.TERRAIN_K + 0.12) : W.TERRAIN_K;
  out.col = kk !== 1 ? shade(col, kk) : col; out.surf = s;
  out.sk = (s === SF.SNOW || (b === 'snohaugen' && s !== SF.WET)) ? 0.975 : (s === SF.SAND ? 0.86 : 0.8);   // softer step sides on snow (> 0.95 = soft mode) / sand
  out.rd = o.rd;
}
function biomeColour(b, x, z, hq, ix, iz, jit, out) {
  const n = nz(x, z, 1 / 13, 51), n2 = nz(x, z, 1 / 5, 52);
  let g = mix(GRASS, GRASS2, U.smooth(n));
  if (n2 > 0.72) g = mix(g, 0xb2e488, (n2 - 0.72) * 1.4);
  switch (b) {
    case 'slott': return g;
    case 'blomstereng': {
      g = mix(MEADOW, GRASS, n * 0.6);
      if (jit < 0.02) return mix(g, [P('blossom'), P('butter'), P('white'), P('lilac')][Math.floor(jit * 200) % 4], 0.22);
      const F2 = fieldAt('blomstereng', x, z); if (F2) return fieldColour(F2, x, z, g, jit, out);
      return g;
    }
    case 'gardsland': { const F2 = fieldAt('gardsland', x, z); if (F2) return fieldColour(F2, x, z, g, jit, out); return mix(g, 0xa8d870, 0.25); }
    case 'frukthage': { const F2 = fieldAt('frukthage', x, z); if (F2) return fieldColour(F2, x, z, g, jit, out); return mix(g, GRASS2, 0.3); }
    case 'innsjo': return mix(g, 0x86d49a, 0.25);
    case 'strand': return mix(g, P('sand'), 0.25);
    case 'vindmolle': { const F2 = fieldAt('vindmolle', x, z); if (F2) return fieldColour(F2, x, z, g, jit, out); return mix(g, MINT_G, U.clamp(hq / 9, 0, 0.6) + 0.12); }
    case 'lavendel': { const F2 = fieldAt('lavendel', x, z); if (F2) return fieldColour(F2, x, z, g, jit, out); return mix(g, P('lavender'), 0.08); }
    case 'snohaugen': { const s = mix(0xeef4ff, 0xd6e6fb, n * 0.9); return jit < 0.05 ? mix(s, 0xc4e2f8, 0.3) : s; }   // soft sparkle, no tile dots
    case 'hav': return P('sand');
  }
  return g;
}
function fieldColour(B, x, z, g, jit, out) {
  out.fk = FK[B.kind];
  const v = z - B.z0;
  switch (B.kind) {
    case 'hvete': { const row = Math.floor(v); out.row = row; return (row & 1) ? mix(P('hay'), 0xe6c25a, jit * 0.5) : mix(0xf6dc86, P('hay'), jit * 0.5); }
    case 'aker': { const row = Math.floor(v); out.row = row; return (row & 1) ? mix(P('leaf2'), P('leaf'), jit * 0.6) : mix(P('soil'), 0x9c7650, jit * 0.5); }
    case 'tulipan': {
      const row = Math.floor(v / 1.5); out.row = (v % 1.5) < 1 ? 0 : 1;
      if (out.row) return mix(P('leaf2'), P('leaf'), jit * 0.4);
      const cs = ['rose', 'butter', 'coral', 'pink', 'lilac', 'white', 'orange'];
      return mix(P(cs[(row + Math.floor(B.h * 7)) % cs.length]), P('leaf2'), 0.35 + jit * 0.15);
    }
    case 'beite': out.row = 1; return mix(g, 0x9be37c, 0.35);
    case 'lavendel': { out.row = (v % 1.5) < 1 ? 0 : 1; return out.row ? mix(P('soil'), P('leaf2'), 0.35 + jit * 0.2) : mix(P('lavField'), P('lavender'), jit * 0.6); }
    case 'solsikke': { const row = Math.floor(v / 1.5); out.row = row & 1; return out.row ? mix(P('leaf2'), P('soil'), 0.3) : mix(P('soil'), P('leaf'), 0.25 + jit * 0.2); }
    case 'frukt': return mix(g, 0x86cc66, 0.4);
  }
  return g;
}
W.sampleFn = sampleFn;   // the mesher stores out.surf / out.bio / out.fk per cell (ch.SURF / ch.BIO / ch.FKA) for scatter()
// cheap probe for placement decisions (no colour)
function probe(x, z) {
  const o = { zone: null, lakeS: 9, lake: null, beach: 0 };
  let h = hBase(x, z, o);
  h = zoneApply(o.r1, x, z, h, o); h = zoneApply(o.r2, x, z, h, o);
  h = lakeApply(o.r1, x, z, h, o); h = lakeApply(o.r2, x, z, h, o);
  roadAt(x, z, o);
  if (o.rd < 4.7) { const k = o.rd <= 1.5 ? 0 : U.smooth((o.rd - 1.5) / 3.2); h = U.lerp(o.rh, h, k); }
  o.creekD = 9; o.creek = null;
  h = creekApply(o.r1, x, z, h, o); if (o.r2 !== o.r1) h = creekApply(o.r2, x, z, h, o);
  o.h = h; o.hq = q(h);
  o.field = FIELDS[o.r1.biome] ? fieldAt(o.r1.biome, x, z) : null;
  return o;
}

// ctx.free veto used by every generator (also OBJ's extras): keep roads, village streets / plazas and deep water clear
W.freeFn = function (x, z, r) {
  const p = probe(x, z);
  if (p.rd < r + 1.7) return false;
  if (p.hq < W.WATER - W.DEEP) return false;
  for (const c of [p.r1, p.r2]) { const L = c && c.L; if (!L || !L.paint.length) continue; if (L.vx && inStreet(L.vx, x, z, r)) return false; for (const pt of L.paint) if (x > pt.x0 - r && x < pt.x1 + r && z > pt.z0 - r && z < pt.z1 + r) return false; }
  return true;
};
/* park reserve: CASTLE (park.js, loaded earlier) registers 'park' with its own terrain hooks – only add a plain fallback when it has not */
if (!W.reserved.some(r => r.name === 'park')) W.reserve({ name: 'park', x0: -112, z0: -112, x1: 112, z1: 112, y: 0, blend: 10, noGen: true, fallback: true });

/* =====================================================================================================================
   6. Chunk generator
   ===================================================================================================================== */
// interactable tables per biome: [type, weight]
// DESIGN2 §4.5 (WP3): the single-animal entries sau / ku / gris / hone / krabbe are gone from TABLES and FILLER – F.Fauna populates
// the world now (and is counted by topUp). CLUSTERS (herd counting spots) stay: they are learning spots.
const ANIMALS_OUT = { sau: 1, ku: 1, gris: 1, hone: 1, krabbe: 1 };
const TABLES0 = {
  slott: [['v_piknik', 2], ['n_bikube', 1], ['v_vindspill', 1], ['n_solsikke', 1], ['n_bokstavsteiner', 2], ['v_tallstolpe', 1.5], ['v_skattkiste', 1], ['n_taptting', 1]],
  blomstereng: [['n_bikube', 3], ['v_piknik', 2], ['n_solsikke', 2], ['v_vindspill', 1], ['v_grind', 0.6], ['v_trillebar', 0.8], ['n_lavendel', 0.6],
    ['n_bokstavsteiner', 1.6], ['v_skattkiste', 1.2], ['n_taptting', 0.9], ['v_tallstolpe', 0.9], ['n_tryllepunkt', 0.5], ['v_postkasse', 0.4]],
  gardsland: [['n_hoyball', 3], ['v_trillebar', 2], ['v_grind', 1.5], ['n_molle', 0.5], ['v_bronn', 0.7], ['v_postkasse', 0.7],
    ['v_skattkiste', 1], ['v_tallstolpe', 1.4], ['n_bokstavsteiner', 1], ['n_taptting', 0.9]],
  frukthage: [['n_epletre', 5], ['v_trillebar', 2], ['n_bikube', 2], ['v_piknik', 1.5], ['v_grind', 0.8], ['v_skattkiste', 1], ['n_bokstavsteiner', 1.4], ['v_tallstolpe', 1], ['n_taptting', 1]],
  innsjo: [['v_piknik', 2], ['v_vindspill', 1], ['n_solsikke', 0.8], ['v_bronn', 0.8], ['n_bokstavsteiner', 1.6], ['v_skattkiste', 1.2], ['n_taptting', 1], ['v_tallstolpe', 1], ['n_tryllepunkt', 0.4]],
  strand: [['n_skjell', 3], ['n_sandslott', 2], ['v_piknik', 1.5], ['v_vindspill', 1], ['v_skattkiste', 1.5], ['n_bokstavsteiner', 1], ['n_taptting', 1], ['v_tallstolpe', 0.5]],
  vindmolle: [['n_molle', 1.6], ['v_vindspill', 2], ['v_piknik', 1], ['n_hoyball', 1], ['v_grind', 1], ['n_bokstavsteiner', 1.4], ['v_skattkiste', 1], ['v_tallstolpe', 1], ['n_taptting', 1], ['n_tryllepunkt', 0.5]],
  lavendel: [['n_lavendel', 5], ['n_solsikke', 3], ['n_bikube', 3], ['v_trillebar', 1], ['v_piknik', 1], ['v_vindspill', 1], ['n_bokstavsteiner', 1.4], ['v_skattkiste', 1], ['v_tallstolpe', 1], ['n_taptting', 1]],
  snohaugen: [['n_snomann', 4], ['n_akebakke', 1.2], ['n_skoytedam', 0.8], ['n_krystaller', 3], ['v_skattkiste', 1], ['n_bokstavsteiner', 1.4], ['v_tallstolpe', 1], ['n_taptting', 1], ['n_tryllepunkt', 0.5]],
};
const TABLES = {}; for (const b in TABLES0) TABLES[b] = TABLES0[b].filter(e => !ANIMALS_OUT[e[0]]);
const CLUSTERS = {
  slott: [['sauer', 1], ['honer', 1]],
  blomstereng: [['bier', 2], ['sauer', 1.5], ['honer', 1], ['solsikker', 1]],
  gardsland: [['sauer', 2], ['honer', 2], ['kuer', 2], ['griser', 1.5], ['hoy', 1.5]],
  frukthage: [['epler', 3], ['bier', 1], ['honer', 1]],
  innsjo: [['honer', 1], ['sauer', 1], ['bier', 1]],
  strand: [['strand', 3]],
  vindmolle: [['sauer', 3], ['hoy', 1]],
  lavendel: [['lavendel', 2], ['solsikker', 2], ['bier', 2]],
  snohaugen: [['snomenn', 2], ['krystaller', 2]],
};
const CL = {
  sauer: { t: ['sau'], n: [3, 4], sp: 2.4 }, honer: { t: ['hone'], n: [3, 4], sp: 1.6 }, kuer: { t: ['ku'], n: [2, 3], sp: 3 }, griser: { t: ['gris'], n: [2, 3], sp: 2 },
  bier: { t: ['n_bikube'], n: [2, 3], sp: 2.2 }, krystaller: { t: ['n_krystaller'], n: [2, 3], sp: 2 }, strand: { t: ['krabbe', 'n_skjell', 'n_skjell'], n: [3, 3], sp: 2 },
  lavendel: { t: ['n_lavendel'], n: [3, 4], sp: 2 }, solsikker: { t: ['n_solsikke'], n: [3, 4], sp: 1.6 }, snomenn: { t: ['n_snomann'], n: [2, 2], sp: 2.6 },
  hoy: { t: ['n_hoyball', 'v_trillebar', 'n_hoyball'], n: [2, 3], sp: 2.6 }, epler: { t: ['n_epletre'], n: [2, 2], sp: 4 },
};
const RADIUS = { v_robat: 1.3, n_ender: 1, n_frosk: 0.8, v_saftbod: 1.4, v_tregynge: 1.3, v_vaskesnor: 1.4, v_iglo: 1.6, n_trappesteiner: 1.6, n_molle: 2.6, n_epletre: 1.8, n_skoytedam: 4, n_akebakke: 3.5, v_luftballong: 3, v_fyrtarn: 3.5, n_sandslott: 1.4, v_markedsbod: 2.4, p_fontene: 2.6,
  v_pariserhjul: 6, ku: 1.3, v_piknik: 1.6, v_seilbat: 2.2, v_vannhjul: 2, v_bro: 2, n_tryllepunkt: 1.3, v_husdor: 0.8, p_tomt: 2.6, v_oppslagstavle: 1, n_snomann: 1 };
const rad = t => RADIUS[t] || 1.1;
const LEARN_FILL = { strand: ['n_bokstavsteiner', 'v_skattkiste', 'n_taptting'], snohaugen: ['n_bokstavsteiner', 'v_tallstolpe', 'v_skattkiste', 'n_taptting'] };
const LEARN_DEFAULT = ['n_bokstavsteiner', 'v_tallstolpe', 'v_skattkiste', 'n_taptting'];
const FILLER = {
  slott: ['v_piknik', 'n_bikube', 'v_vindspill'], blomstereng: ['n_bikube', 'v_piknik', 'n_solsikke', 'v_vindspill'],
  gardsland: ['n_hoyball', 'v_trillebar'], frukthage: ['n_epletre', 'v_trillebar', 'n_bikube'],
  innsjo: ['v_piknik', 'v_vindspill', 'n_solsikke'], strand: ['n_skjell', 'n_sandslott', 'v_vindspill'],
  vindmolle: ['v_vindspill', 'n_hoyball', 'v_piknik'], lavendel: ['n_lavendel', 'n_solsikke', 'n_bikube'], snohaugen: ['n_snomann', 'n_krystaller'],
};
for (const b in FILLER) FILLER[b] = FILLER[b].filter(t => !ANIMALS_OUT[t]);
const ITEMS_LOST = ['hatt', 'sko', 'ball', 'bok', 'nøkkel', 'kopp', 'vott', 'lue', 'bamse', 'dukke'];
/* OBJ's extra types join the biome tables (weights from F.OBJ.forBiome × EXT_K); OBJ's own extras generator is switched off
   (F.OBJ.extrasPerChunk = 0) so nothing is placed twice. Water extras (ducks, frog, rowing boat) are placed by genLake. */
const EXT_K = 0.3, EXT_SKIP = { v_brygge: 1, v_lyktestolpe: 1, v_badehytte: 1 };
const RARE = { blomstereng: [['v_luftballong', 0.12]], vindmolle: [['v_luftballong', 0.15]], gardsland: [['v_luftballong', 0.08]], lavendel: [['v_luftballong', 0.06]] };
const TBL = {};
function tableFor(biome) {
  if (TBL[biome]) return TBL[biome];
  const t = (TABLES[biome] || TABLES.blomstereng).slice().concat(RARE[biome] || []);
  const O = F.OBJ;
  if (O && O.forBiome && O.types) for (const [ty, w] of O.forBiome(biome)) { const d = O.types[ty]; if (d && d.ext && !d.water && !EXT_SKIP[ty] && F.Things.defs[ty]) t.push([ty, w * EXT_K]); }
  if (F.booted) TBL[biome] = t;
  return t;
}
function offObjExtras() { if (F.OBJ && F.OBJ.extrasPerChunk) F.OBJ.extrasPerChunk = 0; }
offObjExtras(); F.on('boot', offObjExtras);
function dataFor(type, r, c) {
  const mine = dataMine(type, r, c), O = F.OBJ;
  if (!O || !O.dataFor || !O.types || !O.types[type]) return mine;
  const od = O.dataFor(type, r) || {};
  if (type === 'v_skattkiste') return Object.assign(od, mine);
  const out = Object.assign({}, mine, od);
  if (od.letters) delete out.len;
  return out;
}
/* stepping stones (o_trappesteiner: 4 stones 1.2 m apart along x): spawned ×2 and with the row across the screen, so the number
   plaques (≈ 76 px wide; 41 px per metre at the default zoom) stand 2.4 m ≈ 100 px apart and never touch */
const STONE_S = 2;
function placeStones(ctx, regs, main, x, z, r) {
  const pts = [-1.5, -0.5, 0.5, 1.5].map(k => [x + k * 1.2 * STONE_S, z]);
  const h0 = probe(x, z).hq;
  for (const [px, pz] of pts) { const p = usable(ctx, regs, px, pz, 1.0, { margin: 0.5 }); if (!p || Math.abs(p.hq - h0) > 0.01) return false; }
  for (const [px, pz] of pts) ctx.claim(px, pz, 1.0);
  ctx.spawn('n_trappesteiner', x, z, { ry: 0, scale: STONE_S, data: dataFor('n_trappesteiner', r, main) });
  return true;
}
function dataMine(type, r, c) {
  switch (type) {
    case 'v_skattkiste': return { lock: r() < 0.55 ? 'num' : 'word', n: U.int(r, 1, 99) };
    case 'v_tallstolpe': return {};                                                     // v5 WP-W: things_world gives it a gap number of its street
    case 'n_bokstavsteiner': return { len: U.int(r, 3, 5) };
    case 'n_taptting': return { item: ITEMS_LOST[Math.floor(r() * ITEMS_LOST.length)], region: c ? c.id : null };
    case 'n_tryllepunkt': return { power: 'bridge', region: c ? c.id : null };
    case 'v_postkasse': return { letter: true, num: U.int(r, 1, 40) };
    case 'n_epletre': return { kind: ['eple', 'eple', 'kirsebaer', 'plomme', 'paere'][Math.floor(r() * 5)] };
    case 'n_skjell': return { pearl: r() < 0.3 };
    case 'n_molle': return {};
  }
  return {};
}

function chunkRegions(ctx) {
  const [ci, cj] = cellIndex(ctx.x0 + 16, ctx.z0 + 16);
  const out = [];
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) out.push(cell(ci + di, cj + dj));
  return out;
}
const rectHit = (zn, x0, z0, x1, z1, pad) => zn.x1 + pad > x0 && zn.x0 - pad < x1 && zn.z1 + pad > z0 && zn.z0 - pad < z1;
function inAnyZone(regs, x, z, pad) { for (const c of regs) { const zn = c.L && c.L.zone; if (zn && x > zn.x0 - pad && x < zn.x1 + pad && z > zn.z0 - pad && z < zn.z1 + pad) return c; } return null; }

function genChunk(ctx) {
  const { x0, z0, S } = ctx;
  const ch = ctx.chunk;
  // fully inside the park: CASTLE builds it
  if (x0 >= -112 && x0 + S <= 112 && z0 >= -112 && z0 + S <= 112) { ch.info = { park: true, land: 0 }; return; }
  const regs = chunkRegions(ctx);
  regs.forEach(c => lay(c));
  const main = regionCellAt(x0 + 16, z0 + 16);
  const info = ch.info = { region: main.id, biome: main.biome, land: 1, spots: [], props: [], village: null };
  const props = info.props;
  // land fraction (sea / deep water / park excluded)
  let land = 0;
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    const x = x0 + 4 + a * 8, z = z0 + 4 + b * 8;
    if (W.inReserved(x, z, 0)) continue;
    const p = probe(x, z); if (p.hq >= W.WATER) land++;
  }
  info.land = land / 16;

  const PT = W.stats.phase || (W.stats.phase = {}); let tp = performance.now();
  const lap = k => { const t = performance.now(); PT[k] = (PT[k] || 0) + (t - tp); tp = t; };
  // A. anchors (villages / landmarks / castle gates) whose zone touches this chunk
  for (const c of regs) {
    const L = c.L;
    if (c.kind === 'castle') { genGates(ctx, c); continue; }
    if (!L.zone || !rectHit(L.zone, x0, z0, x0 + S, z0 + S, 0)) continue;
    if (c.kind === 'kongeslott') { try { genKingdom(ctx, c, info); } catch (e) { console.error('kingdom gen', c.realm, e); } continue; }
    if (c.kind === 'village') genVillage(ctx, c, info); else genLandmark(ctx, c, info);
  }
  lap('anchors');
  // B. lakes: shore + water things
  for (const c of regs) for (const lk of lakesOf(c)) if (Math.hypot(Math.max(x0 - lk.x, 0, lk.x - x0 - S), Math.max(z0 - lk.z, 0, lk.z - z0 - S)) < lk.r * 1.3 + 2) genLake(ctx, c, lk);
  // B2. creeks: footbridges (walkable arch decks) + a frog
  for (const c of regs) { const K = creekOf(c); if (K && !(K.x1 < x0 || K.x0 > x0 + S || K.z1 < z0 || K.z0 > z0 + S)) genCreek(ctx, c, K); }
  // C. coast things (boats on the sea)
  if (z0 + S > 470 && z0 < 540) genCoast(ctx, main);
  // D. fields
  genFields(ctx, main);
  lap('lakesFields');
  // E. problem-giver (one per 2×2 chunk block) – before the fill so its cottage finds room
  wishSpot(ctx, main, regs, info);
  // F. cell fill
  cellFill(ctx, main, regs, info);
  lap('fill');
  // G. density top-up
  topUp(ctx, main, regs, info);
  // H. hidden coins + rare golden letter
  coins(ctx, main, regs, info);
  lap('topup');
  ctx.wg = { main, regs, info };
}
// I. pure decor scatter (build mode only) – the engine runs it in a later frame (stage 3)
W.decorFn = function (ctx) {
  if (ctx.plan || !ctx.wg) return;
  const t = performance.now();
  scatter(ctx, ctx.wg.main, ctx.wg.regs, ctx.wg.info);
  cropRows(ctx);
  const PT = W.stats.phase || (W.stats.phase = {}); PT.scatter = (PT.scatter || 0) + performance.now() - t;
};
W.genFn = genChunk;

/* ---------------- placement helpers */
function usable(ctx, regs, x, z, r, o) {
  o = o || {};
  const { x0, z0, S } = ctx;
  const m = o.margin != null ? o.margin : 0.8;
  if (x < x0 + m || x > x0 + S - m || z < z0 + m || z > z0 + S - m) return null;
  if (W.inReserved(x, z, r + 3)) return null;
  if (!o.zoneOk && inAnyZone(regs, x, z, r + 1.5)) return null;
  const p = probe(x, z);
  if (p.rd < r + 2.4) return null;
  if (o.water) { if (p.hq > W.WATER - W.DEEP - 0.1) return null; }
  else if (p.hq < W.WATER + 0.05) return null;
  if (!o.water && p.lakeS < 1.05 + r / Math.max(4, (p.lake ? p.lake.r : 10))) return null;
  if (p.field && !o.field) return null;
  if (!ctx.free(x, z, r)) return null;
  if (o.flat) { const hs = [p.hq, q(probe(x + o.flat, z).h), q(probe(x - o.flat, z).h), q(probe(x, z + o.flat).h), q(probe(x, z - o.flat).h)]; if (Math.max(...hs) - Math.min(...hs) > (o.flatTol || 0.25)) return null; }
  return p;
}
function place(ctx, type, x, z, o) {
  o = o || {};
  const r = o.r || rad(type);
  ctx.claim(x, z, r);
  return ctx.spawn(type, x, z, { id: o.id, ry: o.ry != null ? o.ry : 0, data: o.data || {}, scale: o.scale, kind: o.kind });
}
const faceCam = r => (r() - 0.5) * 1.1;

/* ---------------- castle gates: signposts outside the 4 park gates */
function genGates(ctx, c) {
  const { x0, z0, S } = ctx;
  const gates = [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]];
  for (const [dir, gx, gz] of gates) {
    const px = gx * 121 + (gz ? 4 : 0), pz = gz * 121 + (gx ? 4 : 0);
    if (px < x0 || px >= x0 + S || pz < z0 || pz >= z0 + S) continue;
    const nb = dir === 'E' ? cell(1, 0) : dir === 'W' ? cell(-1, 0) : dir === 'N' ? cell(0, -1) : cell(0, 1);
    const dirs = [{ name: nb.name, ang: Math.atan2(nb.x - px, nb.z - pz), region: nb.id }, { name: 'slottet', ang: Math.atan2(-px, -pz), castle: true }];
    if (nb.sea || (nb.realm && !realmAwake(nb.realm))) dirs.shift();   // v5 WP-W #33
    signpost(ctx, px, pz, dirs, 'sign:gate:' + dir);
  }
}
/* fix wave (review:art #3): at most 3 arms per post – home 'slottet', one kingdom (a new one she has not found first, else the nearest),
   the nearest village / region; more only fill up to 3. Kingdom plaques show the crest big and the name small. */
function pickDirs(dirs, x, z) {
  if (dirs.length <= 3) return dirs;
  const dist = d => d.dist != null ? d.dist : 1e6;
  const out = [], take = d => { if (d && out.indexOf(d) < 0 && out.length < 3) out.push(d); };
  take(dirs.find(d => d.castle));
  const kRank = d => { const st = F.Realm && F.Realm.state ? F.Realm.state(d.realm) : null; return (st === 'appeared' ? 0 : st === 'found' || st === 'friend' ? 1 : 2) * 1e6 + dist(d); };
  take(dirs.filter(d => d.realm && !d.castle).sort((a, b) => kRank(a) - kRank(b))[0]);
  take(dirs.filter(d => !d.realm && !d.castle).sort((a, b) => (a.kind === 'village' ? 0 : 1e6) + dist(a) - (b.kind === 'village' ? 0 : 1e6) - dist(b))[0]);
  dirs.filter(d => out.indexOf(d) < 0).sort((a, b) => dist(a) - dist(b)).forEach(take);
  void x; void z;
  return out;
}
// screen-space pass over signpost plaques (after the core label pass): a lower-priority plaque that overlaps a kept one is hidden;
// all of them hide while the region banner is showing
const SIGNL = new Set();
const _sv = new THREE.Vector3();
F.on('preRender', () => {
  if (!SIGNL.size || !F.UI || !F.UI.labels) return;
  const banner = !!(F.HUD && F.HUD.placeEl && F.HUD.placeEl.classList && F.HUD.placeEl.classList.contains('on'));
  const cam = F.R.camera, r = F.R.renderer.domElement.getBoundingClientRect(), vis = [];
  for (const it of SIGNL) {
    const L = it.L;
    if (!F.UI.labels.has(L)) { SIGNL.delete(it); continue; }
    if (L.el.style.display === 'none' || L.el.style.visibility === 'hidden' || !L._w) continue;
    if (banner) { L.el.style.visibility = 'hidden'; continue; }
    _sv.copy(L.pos()); _sv.y += L.dy; _sv.project(cam);
    const sx = r.left + (_sv.x + 1) / 2 * r.width, sy = r.top + (1 - _sv.y) / 2 * r.height;
    vis.push({ L, pr: it.pr, x0: sx - L._w / 2 - 3, x1: sx + L._w / 2 + 3, y0: sy - L._h - 2, y1: sy + 2 });
  }
  if (vis.length < 2) return;
  vis.sort((a, b) => a.pr - b.pr);
  const kept = [];
  for (const v of vis) {
    if (kept.some(k => v.x1 > k.x0 && v.x0 < k.x1 && v.y1 > k.y0 && v.y0 < k.y1)) v.L.el.style.visibility = 'hidden';
    else kept.push(v);
  }
});
function signpost(ctx, x, z, dirs, id) {
  ctx.claim(x, z, 0.9);
  dirs = pickDirs(dirs, x, z);
  const th = ctx.spawn('v_veiskilt', x, z, { id, ry: 0, data: { dirs: dirs.map(d => ({ name: d.name, ang: +d.ang.toFixed(3), region: d.region || null, castle: !!d.castle, realm: d.realm || null })) } });
  if (ctx.plan) return;
  const ownLabels = F.Things.defs.v_veiskilt && F.Things.defs.v_veiskilt.ownLabels;
  void th;
  if (!F.Things.defs.v_veiskilt && !(W.placeholders && F.Things.defs.world_placeholder)) ctx.decor('wd_signpost', x, z, { big: true });
  if (ownLabels) return;
  const y = W.floorY(x, z);
  // plaques around the post in the direction of their destination; pushed apart on the (north-up) screen so none overlap
  const pos = dirs.map(d => { const sx = Math.sin(d.ang), sz = Math.cos(d.ang); const D = (Math.abs(sx) > 0.7 ? 3.4 : 2.6) + (d.castle ? 0.4 : 0); return [sx * D, sz * D]; });
  // screen-ish boxes: x in metres (label ≈ 0.42 m per letter + 1 m), z rows of 1.9 m
  const wOf = d => 1.1 + 0.42 * d.name.length;
  for (let it = 0; it < 30; it++) {
    let moved = false;
    for (let a2 = 0; a2 < pos.length; a2++) for (let b2 = a2 + 1; b2 < pos.length; b2++) {
      const dx = pos[b2][0] - pos[a2][0], dz = pos[b2][1] - pos[a2][1];
      const needX = (wOf(dirs[a2]) + wOf(dirs[b2])) / 2, needZ = 1.9;
      if (Math.abs(dx) < needX && Math.abs(dz) < needZ) {
        const px = needX - Math.abs(dx), pz = needZ - Math.abs(dz);
        if (pz < px) { const s2 = (dz >= 0 ? 1 : -1) * pz / 2 + 0.02; pos[a2][1] -= s2; pos[b2][1] += s2; }
        else { const s2 = (dx >= 0 ? 1 : -1) * px / 2 + 0.02; pos[a2][0] -= s2; pos[b2][0] += s2; }
        moved = true;
      }
    }
    if (!moved) break;
  }
  // staggered heights by arm (the post's own arms step down 0.38 m each); the castle arm first in the overlap pass, then by arm
  dirs.forEach((d, k) => {
    const L = ctx.label(new THREE.Vector3(x + pos[k][0], y + 1.6 + 0.55 * k, z + pos[k][1]), d.name, d.realm ? { kind: 'plaque', maxDist: 24, size: 15 } : { kind: 'plaque', maxDist: 24 });
    if (!L) return;
    if (d.realm) realmIcon(L, d.realm, 30);
    SIGNL.add({ L, pr: (d.castle ? 0 : 1 + k) + (Math.abs(x) + Math.abs(z)) * 1e-6 });
  });
}
const realmAwake = id => { try { return !F.Realm || !F.Realm.awake || !!F.Realm.awake(id); } catch (e) { return true; } };
function neighbourDirs(c, at) {
  const out = [];
  const nb = [['N', cell(c.i, c.j - 1)], ['E', cell(c.i + 1, c.j)], ['S', cell(c.i, c.j + 1)], ['W', cell(c.i - 1, c.j)]];
  let castle = false;
  for (const [, n] of nb) {
    if (n.sea || !lay(c).ports) continue;
    if (n.realm && !realmAwake(n.realm)) continue;                  // v5 WP-W (logic #33): no arm to a kingdom that is not there yet
    const dist = Math.hypot(n.x - at[0], n.z - at[1]);
    if (n.kind === 'castle') { out.push({ name: 'slottet', ang: Math.atan2(n.x - at[0], n.z - at[1]), castle: true, dist }); castle = true; }
    else out.push({ name: n.name, ang: Math.atan2(n.x - at[0], n.z - at[1]), region: n.id, realm: n.realm || null, kind: n.kind, dist });
  }
  if (!castle) out.push({ name: 'slottet', ang: Math.atan2(-at[0], -at[1]), castle: true });
  // DESIGN2 §3.6: kingdoms (awake) within 2 regions that are not direct neighbours get their own plaque
  if (F.Realm && F.Realm.sites) for (const st of F.Realm.sites()) {
    const dd = Math.max(Math.abs(st.i - c.i), Math.abs(st.j - c.j));
    if (dd < 1 || dd > 2 || (dd === 1 && (st.i === c.i || st.j === c.j)) || !F.Realm.awake(st.id)) continue;
    if (out.some(o => o.realm === st.id)) continue;
    const R = F.REALMS.get(st.id); if (R) out.push({ name: R.castle, ang: Math.atan2(st.x - at[0], st.z - at[1]), region: st.regionId, realm: st.id, dist: Math.hypot(st.x - at[0], st.z - at[1]) });
  }
  return out;
}

/* ---------------- villages */
// garden extras behind the houses (OBJ's 'Landsby' extras: washing line, bird box, tree swing, bench, singing flowers, juice stand, puddle)
const GARDEN_EXT = ['v_vaskesnor', 'v_fuglekasse', 'v_tregynge', 'v_benk', 'n_syngeblomster', 'v_saftbod', 'n_vannpytt', 'v_fuglekasse', 'v_vaskesnor'];
function genVillage(ctx, c, info) {
  const { x0, z0, S } = ctx;
  const L = c.L, V2 = L.village, y = L.zone.y, vx = V2.vx, TH = THEMES[V2.theme] || THEMES.rosa;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
  const rr = U.rng(U.hashStr('vdeco' + c.id + ':' + SEED()));
  const regs = chunkRegions(ctx);
  // houses + doors + number plaques + gardens
  for (const hh of V2.houses) {
    if (!inC(hh.x, hh.z)) continue;
    ctx.decor(hh.model, hh.x, hh.z, { y, ry: hh.ry, big: true, opts: hh.opts, claim: 3.2 });
    ctx.box(hh.x - hh.bx, hh.z - hh.bz, hh.x + hh.bx, hh.z + hh.bz);
    ctx.spawn('v_husdor', hh.doorThing.x, hh.doorThing.z, { id: hh.doorThingId, ry: hh.ry, data: { num: hh.num, region: c.id, resident: hh.resident.name, job: hh.resident.job } });
    ctx.label(new THREE.Vector3(hh.x + hh.fx * (hh.fd + 0.35), y + 2.75, hh.z + hh.fz * (hh.fd + 0.35)), String(hh.num), { kind: 'num', maxDist: 26 });
    // every third house: its resident stands outside (ambient villager, no wish) – LIFE spawns it from the 'wishSpot' event
    // ids / hashes use the pre-v5 house key (hh.oid) so saved doors, residents and gardens keep their state
    if ((hh.oid + c.i + c.j) % 3 === 0) (info.residents = info.residents || []).push({ id: 'res:' + c.id + ':' + hh.oid, kind: 'resident', wish: false, x: hh.door.x + hh.fx * 1.7 + hh.fz * 0.8, z: hh.door.z + hh.fz * 1.7 - hh.fx * 0.8, ry: hh.ry,
      regionId: c.id, regionName: c.name, villageId: c.id, chunk: ctx.key, doorThingId: hh.doorThingId, num: hh.num, name: hh.resident.name, job: hh.resident.job, voice: hh.resident.voice, kid: false });
    // a garden extra behind the house (deterministic per house)
    if (hh.extra < 0.6) {
      const t = GARDEN_EXT[Math.floor(hh.extra / 0.6 * GARDEN_EXT.length) % GARDEN_EXT.length];
      if (F.Things.defs[t]) {
        const tx = -hh.fz, tz = hh.fx, k = hh.extra < 0.3 ? -1 : 1;
        const ex = hh.x - hh.fx * (hh.depth + 1.7) + tx * k * 1.3, ez = hh.z - hh.fz * (hh.depth + 1.7) + tz * k * 1.3;
        const gr = U.rng(U.hashStr('vg' + c.id + ':' + hh.oid + ':' + SEED()));
        if (inC(ex, ez) && usable(ctx, regs, ex, ez, 0.9, { zoneOk: true, margin: 0.4 })) place(ctx, t, ex, ez, { id: 'vg:' + c.id + ':' + hh.oid, r: 0.9, ry: faceCam(gr), data: dataFor(t, gr, c) });
      }
    }
    if (!ctx.plan) {
      const bx = hh.door.x - hh.side * 1.4;
      for (let k = -1; k <= 1; k += 2) for (let m = 0; m < 3; m++) ctx.decor('wd_flowers', bx + (m - 1) * 0.22, hh.z + k * (1.3 + m * 0.6), { y, ry: m, sway: 0.18, opts: { cs: [hh.look.fl, TH.fl[(m + 1) % TH.fl.length], 'white'], v: m % 2 } });
      const fxx = hh.door.x - hh.side * 2.3;
      ctx.decor('wd_picket', fxx, hh.z - 2.15, { y, ry: Math.PI / 2, opts: { c: 'white' } });
      ctx.decor('wd_picket', fxx, hh.z + 2.15, { y, ry: Math.PI / 2, opts: { c: 'white' } });
      ctx.decor('wd_bush_s', hh.x + hh.side * 1.0, hh.z + (rr() < 0.5 ? -3.5 : 3.5), { y, opts: { c: 'leaf', b: hh.look.fl }, big: true });
    }
  }
  // plaza
  const P0 = [c.x, c.z];
  if (inC(P0[0], P0[1])) {
    info.village = c.id;
    const fountain = F.Things.defs.v_fontene ? 'v_fontene' : 'p_fontene';
    place(ctx, fountain, c.x, c.z, { id: 'vf:' + c.id, r: 2.6, data: { region: c.id } });
  }
  const vshops = villageShops(c);
  const items = [
    ['v_bronn', c.x - 7.5, c.z + 4.5, 'vb'], ['v_postkasse', c.x + 3.2, c.z - 6.2, 'vp'], ['v_oppslagstavle', c.x - 4, c.z - 6.2, 'vo'],
    ['v_markedsbod', c.x + 8, c.z + 3.5, 'vs', { shop: vshops[0], region: c.id, idx: Math.floor(HH(c.i, c.j, 40) * 99) }],
    ['v_markedsbod', c.x + 8, c.z - 3.5, 'vm', { stall: true, region: c.id }],
    ['v_markedsbod', c.x - 8, c.z - 1.5, 'vs2', { shop: vshops[1], region: c.id, idx: Math.floor(HH(c.i, c.j, 43) * 99) }],
  ];
  for (const [t, x, z, k, data] of items) if (inC(x, z)) place(ctx, t, x, z, { id: k + ':' + c.id, ry: t === 'v_markedsbod' ? (x < c.x ? Math.PI / 2 : -Math.PI / 2) : 0, data: Object.assign({ region: c.id, theme: V2.theme }, data || {}) });
  // signposts: plaza junction + both street ends
  const sp = [c.x - 4.2, c.z + 6.4];
  if (inC(sp[0], sp[1])) signpost(ctx, sp[0], sp[1], neighbourDirs(c, sp), 'sign:' + c.id);
  for (const [dir, zz] of [['N', c.z - 45], ['S', c.z + 45]]) {
    const ex = c.x + 4, ez = zz;
    if (!inC(ex, ez)) continue;
    const nb = dir === 'N' ? cell(c.i, c.j - 1) : cell(c.i, c.j + 1);
    if (nb.sea) continue;
    const dirs = [{ name: nb.kind === 'castle' ? 'slottet' : nb.name, ang: dir === 'N' ? Math.PI : 0, region: nb.id, castle: nb.kind === 'castle' }, { name: c.name, ang: dir === 'N' ? 0 : Math.PI, region: c.id }];
    signpost(ctx, ex, ez, dirs, 'sign:' + c.id + ':' + dir);
  }
  // plots
  for (const p of V2.plots) if (inC(p.x, p.z)) place(ctx, 'p_tomt', p.x, p.z, { id: p.id, r: 2.6, data: { plotId: p.id, region: c.id } });
  // the fair: Ferris wheel + benches + flowers at the south end
  if (L.fair) {
    const f = L.fair;
    if (inC(f.x, f.z)) place(ctx, 'v_pariserhjul', f.x, f.z, { id: 'vfair:' + c.id, r: 5, ry: 0 });
    if (!ctx.plan) {
      for (const [dx, dz, ry] of [[-5, 4.5, 0], [5, 4.5, 0]]) if (inC(f.x + dx, f.z + dz)) ctx.decor('wd_bench', f.x + dx, f.z + dz, { y, ry, big: true });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, px = f.x + Math.cos(a) * 7.5, pz = f.z + Math.sin(a) * 6.5; if (inC(px, pz) && Math.abs(px - c.x) > 3.5) ctx.decor('wd_flowers', px, pz, { y, s: 1.4, sway: 0.15, opts: { cs: [TH.fl[k % TH.fl.length], 'white', 'butter'] } }); }
      if (inC(f.x - f.side * 6, f.z - 6)) ctx.decor('wd_lamp', f.x - f.side * 6, f.z - 6, { y, big: true });
    }
  }
  // lamps along the (maybe bending) street with bunting in the village colours, planters, plaza trees
  if (!ctx.plan) {
    let bi = 0;
    for (let zz = c.z - 44; zz <= c.z + 44; zz += 11) {
      const lz = zz + 5.5; if (Math.abs(lz - c.z) <= 8.5) continue;
      const so = c.x + streetOff(vx, lz);
      for (const side of [-1, 1]) { const lx = so + side * 3.1; if (inC(lx, lz)) ctx.decor('wd_lamp', lx, lz, { y, big: true }); }
      if (inC(so, lz) && (bi++ % 2 === 0)) bunting(ctx, so - 3.0, so + 3.0, lz, y, TH.acc);
    }
    for (const [px, pz, ry] of [[c.x - 11.2, c.z + 2.4, Math.PI / 2]]) if (inC(px, pz)) ctx.decor('wd_bench', px, pz, { y, ry, big: true });
    for (const [px, pz] of [[c.x - 3, c.z + 3], [c.x + 3, c.z + 3], [c.x - 3, c.z - 3], [c.x + 3, c.z - 3]]) if (inC(px, pz)) ctx.decor('wd_planter', px, pz, { y, ry: (px < c.x) ? Math.PI / 2 : -Math.PI / 2, big: true, opts: { c: TH.fl[Math.floor(rr() * TH.fl.length)] } });
    for (const [px, pz] of [[c.x - 11, c.z - 7], [c.x + 11, c.z + 7], [c.x - 11, c.z + 7], [c.x + 11, c.z - 7]]) if (inC(px, pz)) ctx.decor('wd_tree_s', px, pz, { y, big: true, opts: { c: TH.tree, d: TH.tree === 'blossom' ? 'white' : (TH.fl[0] === 'white' ? 'butter' : TH.fl[0]) } });
  }
  if (inC(c.x, c.z)) {
    { const VL = ctx.label(new THREE.Vector3(c.x, y + 4.2, c.z), c.name, { kind: 'plaque', size: 30, maxDist: 30 }); tryReadPlace(VL, c.name, null); }
    info.villageData = villageRecord(c);
  }
}
// a string of little flags across the street (merged blocks, ≈ 300 triangles)
function bunting(ctx, xa, xb, z, y, cols) {
  const n = 9, top = y + 2.62, sag = 0.34;
  const yAt = t => top - sag * (1 - (2 * t - 1) * (2 * t - 1));
  for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8; ctx.block(xa + (xb - xa) * t0, yAt((t0 + t1) / 2) - 0.015, z - 0.015, xa + (xb - xa) * t1, yAt((t0 + t1) / 2) + 0.015, z + 0.015, 0xfff6e8); }
  for (let k = 1; k < n; k++) {
    const t = k / n, x = xa + (xb - xa) * t, yy = yAt(t) - 0.02, col = F.PAL[cols[k % cols.length]] || 0xffffff;
    ctx.block(x - 0.17, yy - 0.17, z - 0.025, x + 0.17, yy, z + 0.025, col);
    ctx.block(x - 0.09, yy - 0.33, z - 0.025, x + 0.09, yy - 0.17, z + 0.025, col);
  }
}
let HOUSE_ID = null;
function pickHouseModel() {
  if (HOUSE_ID && F.VOX.has(HOUSE_ID)) return HOUSE_ID;
  HOUSE_ID = F.VOX.has('v_hus_lo') ? 'v_hus_lo' : (F.VOX.has('v_hus') ? 'v_hus' : 'wd_hus');
  return HOUSE_ID;
}
// the village's two generic shops (F.Towns, WP9; stub-safe fallback by region hash)
const GENERIC = ['bakeriet', 'lekebutikken', 'hagesenteret', 'musikkbua', 'gavebua', 'dyrebutikken', 'feboden', 'mobelbua', 'reisebua', 'byggebua', 'tryllebua'];
function villageShops(c) {
  let sh = null;
  try { sh = F.Towns && F.Towns.shopsFor ? F.Towns.shopsFor(c.id) : null; } catch (e) { sh = null; }
  if (Array.isArray(sh) && sh.length >= 2 && sh[0] && sh[1] && sh[0] !== sh[1]) return sh.slice(0, 2);
  const a = Math.floor(HH(c.i, c.j, 70) * GENERIC.length); let b = Math.floor(HH(c.i, c.j, 71) * (GENERIC.length - 1)); if (b >= a) b++;
  return [GENERIC[a], GENERIC[b]];
}
W.villageShops = id => { const r = W.regionById(id); return r ? villageShops(cell(r.cellX, r.cellY)) : null; };
function villageRecord(c) {
  const L = lay(c), V2 = L.village, vx = V2.vx;
  const street = []; for (let z = c.z - 47; z <= c.z + 47.01; z += 4) street.push([+(c.x + streetOff(vx, z)).toFixed(2), +z.toFixed(2)]);
  const counter = (id, x, z) => ({ thingId: id, x, z, door: { x: x - 2.0, z } });   // stalls face west (−x) towards the plaza; customers stand at door
  return { regionId: c.id, name: c.name, biome: c.biome, x: c.x, z: c.z, y: L.zone.y, theme: V2.theme, bend: { A: +vx.A.toFixed(2), shape: vx.shape },
    houses: V2.houses.map(hh => ({ num: hh.num, x: hh.x, z: hh.z, ry: hh.ry, side: hh.side, door: { x: hh.door.x, z: hh.door.z }, step: { x: +hh.step.x.toFixed(2), z: +hh.step.z.toFixed(2) }, front: { x: +hh.fx.toFixed(3), z: +hh.fz.toFixed(3) },
      street: { x: +(c.x + streetOff(vx, hh.z)).toFixed(2), z: hh.z }, doorThingId: hh.doorThingId, resident: hh.resident, model: hh.model, look: hh.look })),
    shopThingId: 'vs:' + c.id, stallThingId: 'vm:' + c.id, fountainThingId: 'vf:' + c.id,
    shop: counter('vs:' + c.id, c.x + 8, c.z + 3.5), stall: counter('vm:' + c.id, c.x + 8, c.z - 3.5), shopIds: villageShops(c),
    shop2: { thingId: 'vs2:' + c.id, x: c.x - 8, z: c.z - 1.5, door: { x: c.x - 6.0, z: c.z - 1.5 } },
    plots: V2.plots.map(p => p.id), plotPos: V2.plots.map(p => ({ id: p.id, x: p.x, z: p.z })), numLo: V2.numLo, numHi: V2.numHi, gaps: V2.gaps.slice(),
    residents: V2.residents, plaza: { x: c.x, z: c.z, r: 10 }, street, fair: L.fair ? { x: L.fair.x, z: L.fair.z, thingId: 'vfair:' + c.id } : null,
    zone: { x0: L.zone.x0, z0: L.zone.z0, x1: L.zone.x1, z1: L.zone.z1 } };
}

/* ---------------- kingdoms (DESIGN2 §3.4–3.8): castle or building site at the region centre, market at the gate, the keep door.
   All castle parts (merged decor, F.CastleGen) and colliders belong to the chunk holding the centre, so a castle never loads in halves. */
const STALL_JOB = { blomsterbua: 'blomsterselger', stallen: 'bonde', boblebua: 'batmann', skjellbua: 'fisker', kakebua: 'baker', notebua: 'musikant',
  stjernebua: 'maler', vinterbua: 'leketoysmaker', krystallbua: 'leketoysmaker', tryllebua: 'maler', bakeriet: 'baker', lekebutikken: 'leketoysmaker',
  hagesenteret: 'blomsterselger', musikkbua: 'musikant', dyrebutikken: 'gjeter', reisebua: 'fyrvokter', feboden: 'maler', mobelbua: 'bonde', gavebua: 'bestemor', byggebua: 'bonde' };
function kingdomShops(id, R) {
  let sh = null;
  try { sh = F.Towns && F.Towns.shopsFor ? F.Towns.shopsFor(id) : null; } catch (e) { sh = null; }
  sh = Array.isArray(sh) ? sh.slice() : [];
  if (R && R.shop && sh[0] !== R.shop) { sh = sh.filter(x => x !== R.shop); sh.unshift(R.shop); }   // stub fallback: themed shop first
  for (const g of ['bakeriet', 'lekebutikken', 'gavebua']) if (sh.length < 3 && !sh.includes(g)) sh.push(g);
  return sh.slice(0, 3);
}
W.kingdomShops = kingdomShops;
// v3 WP5 (DESIGN3 §9.1): place-name plaques in the world are «try first, then hear it» (F.UI.tryRead): the stem bold, 1st tap sounds the
// stem out, 2nd tap says the name (hud_place / map_navn). The castle plaque sits high on the gate: tappable from a bit further away.
function tryReadPlace(L, name, realm, maxDist) {
  if (!L || !F.UI.tryRead) return null;
  const isRealm = !!(realm && F.SETS.REALMS && F.SETS.get('REALMS').includes(name));
  const lm = !isRealm && F.SETS.LANDMARK_NAMES && F.SETS.LANDMARK_NAMES.includes(name);
  const tpl = isRealm ? 'map_navn' : lm ? 'world_landemerke' : (F.SETS.PLACES.includes(name) ? 'hud_place' : null);
  return F.UI.tryRead(L, name, { stem: F.placeStem ? F.placeStem(name, realm) : null, tpl, slots: isRealm ? { slott: name } : lm ? { lm: name } : { place: name }, maxDist: maxDist || 10 });
}
W.tryReadPlace = tryReadPlace;
function realmIcon(L, id, px) { try { const ic = F.Realm.emblemIcon && F.Realm.emblemIcon(id, px || 22); if (ic && L.el) L.el.insertBefore(ic, L.el.firstChild); } catch (e) { /* text only */ } }
function genKingdom(ctx, c, info) {
  const { x0, z0, S } = ctx;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
  const id = c.realm, G = F.CastleGen, R = F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null;
  if (!G || !R) return;
  const gi = F.Realm.genInfo(id), y = c.L.zone.y, X = c.x, Z = c.z, L = G.layout(R);
  const centre = inC(X, Z);
  if (centre) { info.realm = id; info.realmState = gi.state; }
  if (gi.hold) return;
  const sp = L.sign;
  if (inC(X + sp.x, Z + sp.z)) signpost(ctx, X + sp.x, Z + sp.z, neighbourDirs(c, [X + sp.x, Z + sp.z]), 'sign:' + c.id);
  if (gi.state === 'site') {
    if (centre && !ctx.plan) for (const p of G.siteParts(R)) ctx.decor(p.id, X + p.x, Z + p.z, { y: y + p.y, ry: p.ry, big: true, opts: p.opts });
    G.siteThings().forEach((t, k) => {
      const x = X + t.x, z = Z + t.z; if (!inC(x, z)) return;
      const model = t.kind === 'skilt' ? 'cg_byggeskilt' : t.kind === 'kran' ? 'cg_kran' : 'cg_stillas';
      place(ctx, 'rk_bygg', x, z, { id: 'rkb:' + id + ':' + k, r: t.kind === 'skilt' ? 0.8 : t.kind === 'kran' ? 1.2 : 2.2, ry: t.kind === 'stillas' ? k * 0.4 : 0,
        data: { realm: id, model, opts: model === 'cg_byggeskilt' ? { col: R.pal.flag, emb: R.emblem } : {} } });
    });
    // P1 (§3.4): two builders by the cube piles offer block-counting tasks (F.Realm hooks their wish; each A counts ×3)
    if (F.Realm.P1_BUILDERS !== false) [[-6, 6.5, 0.6], [6.5, 8, -0.5]].forEach(([bx, bz, ry], k) => {
      const x = X + bx, z = Z + bz; if (!inC(x, z)) return;
      const kr = U.rng(U.hashStr('builder' + id + k));
      (info.residents = info.residents || []).push({ id: 'bygg:' + id + ':' + k, kind: 'resident', wish: false, builder: true, realm: id, x, z, ry, regionId: c.id, regionName: c.name,
        chunk: ctx.key, name: F.SETS.NAMES[Math.floor(kr() * F.SETS.NAMES.length)], job: 'bonde', voice: k ? 'vk' : 'vm', kid: false });
    });
    return;
  }
  if (centre) {
    if (!ctx.plan) for (const p of G.parts(R)) ctx.decor(p.id, X + p.x, Z + p.z, { y: y + p.y, ry: p.ry, big: true, opts: p.opts });
    for (const b of G.boxes(R)) ctx.box(X + b.x0, Z + b.z0, X + b.x1, Z + b.z1);
    const PL = ctx.label(new THREE.Vector3(X, y + 9, Z + L.gate.z - 4), R.castle, { kind: 'plaque', size: 30, maxDist: 40 }); if (PL) { realmIcon(PL, id, 30); tryReadPlace(PL, R.castle, id, 16); }
  }
  // the keep door: WP1's b_dor (walk in / tap → F.Bld.enter('rk_<id>')), else REALM's own rk_dor
  const dx = X + L.door.x, dz = Z + L.door.z;
  if (inC(dx, dz)) place(ctx, F.Things.defs.b_dor ? 'b_dor' : 'rk_dor', dx, dz, { id: 'b_dor_rk_' + id, r: 1.2, data: { bld: 'rk_' + id, exit: 'hoved', realm: id } });
  // market: 3 stalls [themed, generic, generic] with keepers (ambient villagers, no wishes)
  const shops = kingdomShops(id, R);
  L.market.forEach((m, k) => {
    const x = X + m.x, z = Z + m.z; if (!inC(x, z)) return;
    const shop = shops[k] || shops[0];
    place(ctx, 'v_markedsbod', x, z, { id: 'mk:' + id + ':' + k, ry: m.ry, r: 2.4, data: { shop, region: c.id, realm: id, themed: k === 0, idx: k } });
    const fx = Math.sin(m.ry), fz = Math.cos(m.ry), kr = U.rng(U.hashStr('keeper' + id + k));
    const voice = (F.SHOPS && F.SHOPS[shop] && F.SHOPS[shop].voice) || (k ? 'vm' : 'vk');
    (info.residents = info.residents || []).push({ id: 'mk:' + id + ':' + k, kind: 'resident', wish: false, x: x - fx * 1.6, z: z - fz * 1.6, ry: m.ry, regionId: c.id, regionName: c.name,
      chunk: ctx.key, name: F.SETS.NAMES[Math.floor(kr() * F.SETS.NAMES.length)], job: STALL_JOB[shop] || 'baker', voice, kid: false, shop, realm: id });
  });
}

/* ---------------- landmarks */
const MOD = (pref, fb) => (F.VOX.has(pref) ? pref : fb);
W.landmarkHooks = W.landmarkHooks || {};
W.LANDMARKS = LANDMARKS;
function genLandmark(ctx, c, info) {
  const { x0, z0, S } = ctx;
  const L = c.L, y = L.zone.y;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
  const X = c.x, Z = c.z, id = k => 'lm:' + c.id + ':' + k;
  const put = (type, dx, dz, k, o) => { const x = X + dx, z = Z + dz; if (inC(x, z)) place(ctx, type, x, z, Object.assign({ id: id(k) }, o || {})); };
  const deco = (m, dx, dz, o) => { const x = X + dx, z = Z + dz; if (inC(x, z)) ctx.decor(m, x, z, Object.assign({ y, big: true }, o || {})); };
  if (inC(X, Z)) { signpost(ctx, X + 3.5, Z + 3.5, neighbourDirs(c, [X + 3.5, Z + 3.5]), 'sign:' + c.id); const LM = ctx.label(new THREE.Vector3(X, y + 3.6, Z - 6), c.landmarkName, { kind: 'plaque', size: 30, maxDist: 30 }); tryReadPlace(LM, c.landmarkName, null); info.landmark = c.landmark; }
  put('n_tryllepunkt', -9, 8, 'tp', { data: { power: 'bridge', landmark: c.landmark, region: c.id } });
  put('v_skattkiste', 12, 9, 'sk', { data: { lock: HH(c.i, c.j, 41) < 0.5 ? 'num' : 'word', n: 10 + Math.floor(HH(c.i, c.j, 42) * 11) } });
  switch (c.landmark) {
    case 'fyrtarn':
      put('v_fyrtarn', 12, -14, 'main', { r: 3.5 }); put('krabbe', -6, -8, 'k1'); put('n_skjell', -12, -2, 's1'); put('n_skjell', 6, 2, 's2'); put('v_piknik', -14, -16, 'pk');
      deco(MOD('v_strandhytte', 'wd_hut'), -16, -24, { opts: { c: 'sky' } }); deco('wd_parasol', 0, -20, { opts: { c: 'coral' } }); break;
    case 'sandslott':
      put('n_sandslott', 0, -14, 'main', { scale: 2.4, r: 3.4 }); put('krabbe', -8, -6, 'k1'); put('krabbe', 9, -5, 'k2'); put('n_skjell', -12, 2, 's1'); put('v_vindspill', 14, -18, 'vs');
      deco('wd_parasol', -14, -20, { opts: { c: 'pink' } }); deco('wd_parasol', 15, -6, { opts: { c: 'sky' } }); deco('wd_hut', 0, -27, { opts: { c: 'pink' } }); break;
    case 'kjempemolle':
      put('n_molle', 0, -16, 'main', { scale: 2.2, r: 5 }); put('n_hoyball', -10, -8, 'h1'); put('n_hoyball', 9, -6, 'h2'); put('sau', -14, -18, 'sa1'); put('sau', -16, -14, 'sa2'); put('v_trillebar', 12, -20, 'tb');
      deco('wd_hay', -8, -22); deco('wd_fence', -18, -24, { ry: 0 }); break;
    case 'pariserhjul':
      put('v_pariserhjul', 0, -18, 'main', { r: 6 }); put('v_piknik', -14, -6, 'pk'); put('v_vindspill', 14, -8, 'vs'); put('n_bikube', -16, -20, 'bk');
      if (F.Things.defs.p_iskiosk) put('p_iskiosk', 13, -20, 'is', { r: 2 });
      for (const dx of [-10, 10]) deco('wd_lamp', dx, -10); deco('wd_bench', -6, -8, { ry: 0 }); break;
    case 'isslott':
      deco(MOD('v_isslott', 'wd_isslott'), 0, -20, { claim: 6 }); put('n_snomann', -12, -6, 'sn1'); put('n_snomann', 13, -7, 'sn2'); put('n_skoytedam', -14, -24, 'sd', { r: 4 }); put('n_krystaller', 14, -22, 'kr1'); put('n_krystaller', 9, -28, 'kr2');
      if (inC(X, Z - 20)) ctx.box(X - 4.8, Z - 24, X + 4.8, Z - 16.5); break;
    case 'krystallhoyden':
      deco(MOD('n_krystallhoyde', 'wd_crystalhill'), 0, -16, { claim: 4 }); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; put('n_krystaller', Math.cos(a) * 9, -16 + Math.sin(a) * 8, 'kr' + k); } break;
    case 'kjempesolsikke':
      deco(MOD('n_kjempesolsikke', 'wd_bigsun'), 0, -18, { claim: 2.5 }); put('n_bikube', -10, -10, 'b1'); put('n_bikube', 10, -12, 'b2'); put('n_lavendel', -14, -20, 'l1'); put('n_lavendel', 14, -22, 'l2'); put('n_solsikke', -6, -24, 'so1'); put('n_solsikke', 6, -25, 'so2');
      if (inC(X, Z - 18)) ctx.box(X - 0.4, Z - 18.4, X + 0.4, Z - 17.6); break;
    case 'regnbuebro': {
      if (F.VOX.has('v_regnbuebro')) deco('v_regnbuebro', 0, -16, { claim: 1.5, y: y });
      else { deco('wd_jetty', 0, -17, { claim: 1.5, y: y + 0.1 }); deco('wd_jetty', 0, -15, { y: y + 0.1 }); deco('wd_rainbow', 0, -16, { ry: Math.PI / 2, y: y }); }
      if (inC(X, Z - 16)) ctx.walkable({ x0: X - 1.2, x1: X + 1.2, z0: Z - 20.5, z1: Z - 11.5, y: y + 0.55 });
      put('v_vannhjul', -12, -14.2, 'vh', { r: 1.6 }); put('v_bro', 12, -16, 'br', { r: 1.5 }); put('v_piknik', 13, -24, 'pk'); put('v_vindspill', -12, -24, 'vs'); break;
    }
    case 'ballongplass':
      put('v_luftballong', -8, -16, 'b1', { r: 3 }); put('v_luftballong', 8, -18, 'b2', { r: 3, data: { c: 'mint', opts: { cols: ['sky', 'white', 'mint', 'butter'] } } }); put('v_luftballong', 0, -27, 'b3', { r: 3, data: { opts: { cols: ['lilac', 'pink', 'white', 'peach'] } } });
      put('v_piknik', -15, -6, 'pk'); put('v_vindspill', 14, -6, 'vs');
      deco('wd_bench', 0, -8, { ry: 0 }); break;
    case 'dyrepark':
      if (F.VOX.has('v_dyrepark')) deco('v_dyrepark', 0, -9.6, { claim: 1 });
      put('v_grind', 4, -9, 'gr'); put('sau', -8, -16, 'sa1'); put('sau', -11, -19, 'sa2'); put('ku', 8, -17, 'ku'); put('gris', 11, -22, 'gr1'); put('gris', 6, -24, 'gr2'); put('hone', -6, -25, 'h1'); put('hone', -3, -23, 'h2'); put('v_bronn', 16, -10, 'bronn');
      for (let k = -9; k <= 9; k += 2) { if (Math.abs(k) > 1) deco('wd_fence', k, -10, { ry: 0 }); deco('wd_fence', k, -29, { ry: 0 }); }
      for (let k = -28; k <= -12; k += 2) { deco('wd_fence', -10.5, k, { ry: Math.PI / 2 }); deco('wd_fence', 10.5, k, { ry: Math.PI / 2 }); } break;
  }
  // extension hook for other WPs: F.W.landmarkHooks[id] = (ctx, region, {put, deco, inC, y}) => {...}
  const hook = W.landmarkHooks[c.landmark];
  if (hook) { try { hook(ctx, regionRecord(c), { put, deco, inC, y }); } catch (e) { console.error('landmark hook', c.landmark, e); } }
  // flowers around the plaza, a ring of bushes + benches + lamps so the landmark park feels cared for
  if (!ctx.plan) {
    const snow = c.biome === 'snohaugen';   // snow landmarks: snow lumps / ice spikes / snowy bushes instead of flowers + blossom trees
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; if (snow) deco(k % 2 ? 'wd_icespike' : 'wd_snowlump', Math.cos(a) * 6.5, Math.sin(a) * 6.5, { big: false, s: k % 2 ? 1 : 0.7 }); else deco('wd_flowers', Math.cos(a) * 6.5, Math.sin(a) * 6.5, { big: false, s: 1.4, opts: { cs: [FLOWERS[k % 7], 'white', 'butter'] } }); }
    const rr = U.rng(U.hashStr('lmd' + c.id));
    for (let k = 0; k < 16; k++) {
      const dx = (rr() - 0.5) * 46, dz = -30 + rr() * 46, x = X + dx, z = Z + dz;
      if (!inC(x, z) || Math.hypot(dx, dz) < 7 || Math.abs(dx) < 3.5 || Math.abs(dz) < 3.5) continue;
      if (!ctx.free(x, z, 1.2)) continue;
      const kind = rr();
      if (snow) { if (kind < 0.45) ctx.decor('wd_snowbush', x, z, { y, big: true, claim: 0.7, ry: rr() * 6 }); else if (kind < 0.6) ctx.decor('wd_snowlump', x, z, { y, big: true, claim: 0.6 }); else ctx.decor('wd_icespike', x, z, { y, claim: 0.4, fine: true }); }
      else if (kind < 0.45) ctx.decor('wd_bush', x, z, { y, big: true, claim: 0.8, ry: rr() * 6, opts: { c: 'leaf', b: FLOWERS[k % 7] } });
      else if (kind < 0.6) ctx.decor('wd_tree', x, z, { y, big: true, claim: 1.4, opts: { k: ['blomst', 'rund', 'kirsebaer'][k % 3] } });
      else ctx.decor('wd_flowers', x, z, { y, s: 1.5, claim: 0.5, opts: { cs: [FLOWERS[k % 7], FLOWERS[(k + 3) % 7], 'white'] } });
    }
    for (const [dx, dz] of [[-6, 4.5], [6, 4.5]]) deco('wd_lamp', dx, dz);
  }
}

/* ---------------- lakes: fishing jetty (walkable) with a boat, waterwheel, power spot facing the islet (+ chest on it) */
function genLake(ctx, c, lk) {
  const { x0, z0, S } = ctx;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;   // exactly one chunk owns each point
  const shoreAt = (ang, k) => { const d = lk.r * (1 + 0.16 * Math.sin(3 * ang + lk.p1) + 0.09 * Math.sin(5 * ang + lk.p2)) * k; return [lk.x + Math.cos(ang) * d, lk.z + Math.sin(ang) * d]; };
  const a0 = HH(c.i, c.j, 50) * 6.28;
  // jetty: from the shore 3.2 m into the lake; boat moored at its tip
  {
    const ang = a0, [sx, sz] = shoreAt(ang, 1.0);
    const ux = (lk.x - sx), uz = (lk.z - sz), ul = Math.hypot(ux, uz) || 1, dx = ux / ul, dz = uz / ul;
    const ry = Math.atan2(dx, dz);
    const mx = sx + dx * 1.6, mz = sz + dz * 1.6;
    if (inC(mx, mz)) {
      ctx.claim(mx, mz, 1.6);
      // OBJ's fishing jetty (v_brygge, 4.4 m, front +z into the lake) when defined, else our plank decor
      if (F.Things.defs.v_brygge) ctx.spawn('v_brygge', mx, mz, { id: 'lk:' + lk.id + ':jetty', ry, y: 0, data: { lake: lk.id } });
      else { ctx.decor('wd_jetty', mx - dx * 0.4, mz - dz * 0.4, { y: 0.0, ry, big: true }); ctx.decor('wd_jetty', mx + dx * 1.6, mz + dz * 1.6, { y: 0.0, ry, big: true }); }
      ctx.walkable({ ax: sx - dx * 0.5, az: sz - dz * 0.5, bx: sx + dx * 3.7, bz: sz + dz * 3.7, w: 1.4, y: 0.5 });
      const bx = sx + dx * 3.6 - dz * 3.0, bz = sz + dz * 3.6 + dx * 3.0;
      place(ctx, 'v_seilbat', bx, bz, { id: 'lk:' + lk.id + ':boat', ry: ry + Math.PI / 2, r: 1.2, data: { lake: lk.id } });
    }
  }
  // water extras near the shore (she can reach them from land): ducks / frog / rowing boat (OBJ types)
  {
    // W2 (WP4 request): ducks and frogs are F.Fauna animals now (n_ender / n_frosk are retired markers) – only the rowing boat stays
    const pool = lk.big ? ['n_ender', 'v_robat', 'n_frosk'] : ['n_frosk', 'n_ender'];
    [a0 + 1.05, a0 + 3.7, a0 + 5.0].slice(0, lk.big ? 3 : 1).forEach((ang, k) => {
      const t = pool[k % pool.length]; if (t !== 'v_robat' || !F.Things.defs[t]) return;
      const [wx, wz] = shoreAt(ang, 1 - Math.min(0.3, (t === 'v_robat' ? 2.6 : 1.7) / lk.r));
      if (!inC(wx, wz) || !ctx.free(wx, wz, 0.9) || W.floorY(wx, wz) >= W.WATER) return;
      ctx.claim(wx, wz, rad(t));
      ctx.spawn(t, wx, wz, { id: 'lk:' + lk.id + ':x' + k, ry: Math.atan2(lk.x - wx, lk.z - wz) + (t === 'v_robat' ? Math.PI / 2 : 0) });
    });
  }
  if (lk.big) {
    const [wx, wz] = shoreAt(a0 + 2.1, 1.1);
    if (inC(wx, wz) && ctx.free(wx, wz, 1.8)) place(ctx, 'v_vannhjul', wx, wz, { id: 'lk:' + lk.id + ':wheel', ry: Math.atan2(lk.x - wx, lk.z - wz), r: 1.8 });
  }
  if (lk.islet) {
    const ang = Math.atan2(lk.islet.z - lk.z, lk.islet.x - lk.x);
    const [px, pz] = shoreAt(ang, 1.14);
    if (inC(px, pz) && ctx.free(px, pz, 1.2)) place(ctx, 'n_tryllepunkt', px, pz, { id: 'lk:' + lk.id + ':tp', data: { power: 'bridge', bridge: { ax: +px.toFixed(2), az: +pz.toFixed(2), bx: +lk.islet.x.toFixed(2), bz: +lk.islet.z.toFixed(2), w: 2.2, y: 0.3 }, region: c.id } });
    if (inC(lk.islet.x, lk.islet.z)) {
      place(ctx, 'v_skattkiste', lk.islet.x + 0.6, lk.islet.z + 0.4, { id: 'lk:' + lk.id + ':islet', data: { lock: 'num', n: 10 + Math.floor(HH(c.i, c.j, 51) * 11), islet: true } });
      ctx.decor('wd_tree_s', lk.islet.x - 1.4, lk.islet.z - 1.2, { y: 0.75, big: true, opts: { c: 'blossom', d: 'white' } });
    }
  }
}
/* coast features per chunk column (deterministic by cx): sailboats on the sea, lighthouses on the beach, fishing jetties with a moored
   boat, rows of colourful beach huts. Each point is placed by the chunk that contains it. */
function genCreek(ctx, c, K) {
  const { x0, z0, S } = ctx;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
  K.bridges.forEach((b, k) => {
    if (!inC(b.x, b.z)) return;
    const sx = Math.sin(b.ry), sz = Math.cos(b.ry);
    const bank = b.y != null ? b.y : Math.max(q(probe(b.x + sx * 2.6, b.z + sz * 2.6).h), q(probe(b.x - sx * 2.6, b.z - sz * 2.6).h), 0.25);
    ctx.claim(b.x, b.z, 1.6);
    const sc = b.s || 1, hl = 2.1 * sc;
    if (F.Things.defs.v_bro) ctx.spawn('v_bro', b.x, b.z, { id: 'cb:' + c.id + ':' + k, ry: b.ry, y: bank - 0.05, scale: sc > 1.01 ? sc : undefined, data: { creek: K.id } });
    ctx.walkable({ ax: b.x - sx * hl, az: b.z - sz * hl, bx: b.x + sx * hl, bz: b.z + sz * hl, w: 1.8, y: bank + 0.4 });
  });
  // W2: the creek frog is an F.Fauna animal now (n_frosk is a retired marker), so nothing is spawned in the creek any more
}
function genCoast(ctx, main) {
  const { x0, z0, S } = ctx;
  const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
  const regs = chunkRegions(ctx);
  const hc = k => U.hash2(ctx.cx, 977 + k, SEED() + 61);
  // sailboat out on the water
  if (hc(0) < 0.5) { const x = x0 + 8 + hc(1) * 16, z = waterline(x) + 3.4 + hc(2) * 4; if (inC(x, z)) place(ctx, 'v_seilbat', x, z, { id: 'sea:' + ctx.key, ry: Math.PI / 2, r: 1.2 }); }
  const kind = hc(3);
  if (kind < 0.16) {
    // lighthouse on the beach near the water, a few rocks around it
    const x = x0 + 10 + hc(4) * 12, z = waterline(x) - 8;
    if (inC(x, z) && usable(ctx, regs, x, z, 3, { margin: 3 })) {
      place(ctx, 'v_fyrtarn', x, z, { id: 'coast:' + ctx.cx + ':lh', r: 3, ry: 0 });
      if (!ctx.plan) for (let k = 0; k < 5; k++) { const a = k * 1.3 + hc(5) * 3, rx = x + Math.cos(a) * 3.4, rz = z + Math.sin(a) * 3; if (inC(rx, rz) && ctx.free(rx, rz, 0.5)) ctx.decor('wd_rock', rx, rz, { big: true, ry: a, claim: 0.5, opts: { c: 'stone' } }); }
    }
  } else if (kind < 0.38 && F.Things.defs.v_brygge) {
    // fishing jetty from the beach into the sea (walkable) with a sailboat moored beside it
    const x = x0 + 8 + hc(6) * 16, sz = waterline(x);
    if (inC(x, sz) && ctx.free(x, sz - 1, 1)) {
      ctx.claim(x, sz, 1.6);
      ctx.spawn('v_brygge', x, sz + 1.6, { id: 'coast:' + ctx.cx + ':jetty', ry: 0, y: 0, data: { sea: true } });
      ctx.walkable({ ax: x, az: sz - 0.5, bx: x, bz: sz + 3.7, w: 1.4, y: 0.5 });
      const bx = x + 2.7, bz = sz + 3.4;
      if (inC(bx, bz)) place(ctx, 'v_seilbat', bx, bz, { id: 'coast:' + ctx.cx + ':boat', ry: 0, r: 1.2 });
    }
  } else if (kind < 0.6) {
    // a row of beach huts parallel to the water: the first one opens (OBJ v_badehytte), the others are decor in a colour run
    const xs = x0 + 4 + hc(7) * 8, z = waterline(xs + 6) - 24 - hc(8) * 6, cols = ['sky', 'pink', 'mint', 'butter', 'lilac', 'coral'];
    const c0 = Math.floor(hc(9) * cols.length);
    for (let k = 0; k < 4; k++) {
      const x = xs + k * 3.4; if (!inC(x, z) || !usable(ctx, regs, x, z, 1.5, { margin: 1.5 })) continue;
      if (k === 1 && F.Things.defs.v_badehytte) { place(ctx, 'v_badehytte', x, z, { id: 'coast:' + ctx.cx + ':hut', r: 1.5, ry: 0 }); continue; }
      const col = cols[(c0 + k) % cols.length];
      ctx.decor(MOD('v_strandhytte', 'wd_hut'), x, z, { big: true, claim: 1.5, ry: 0, opts: { c: col, col } });
      ctx.box(x - 1.3, z - 1.1, x + 1.3, z + 1.1);
    }
  }
}

/* ---------------- fields (fences, scarecrow-free farm decor, pasture animals) */
function genFields(ctx, main) {
  const { x0, z0, S } = ctx;
  const FD = FIELDS[main.biome]; if (!FD) return;
  const ox = (SEED() % 97), oz = (SEED() % 89);
  const bi0 = Math.floor((x0 - ox) / FD.bw) - 1, bi1 = Math.floor((x0 + S - ox) / FD.bw) + 1;
  const bj0 = Math.floor((z0 - oz) / FD.bd) - 1, bj1 = Math.floor((z0 + S - oz) / FD.bd) + 1;
  for (let bj = bj0; bj <= bj1; bj++) for (let bi = bi0; bi <= bi1; bi++) {
    const B = fieldBlock(main.biome, bi, bj); if (!B) continue;
    if (B.x1 < x0 || B.x0 > x0 + S || B.z1 < z0 || B.z0 > z0 + S) continue;
    const inC = (x, z) => x >= x0 && x < x0 + S && z >= z0 && z < z0 + S;
    if (B.kind === 'beite') {
      // fence around (gap = gate on the south side), animals inside
      if (!ctx.plan) {
        for (let x = B.x0 + 1.5; x < B.x1 - 1.5; x += 2) { if (inC(x, B.z0 + 1)) ctx.decor('wd_fence', x + 1, B.z0 + 1, { ry: 0, big: true }); if (inC(x, B.z1 - 1) && Math.abs(x + 1 - (B.x0 + B.x1) / 2) > 1.5) ctx.decor('wd_fence', x + 1, B.z1 - 1, { ry: 0, big: true }); }
        for (let z = B.z0 + 1; z < B.z1 - 1; z += 2) { if (inC(B.x0 + 1.5, z + 1)) ctx.decor('wd_fence', B.x0 + 1.5, z + 1, { ry: Math.PI / 2, big: true }); if (inC(B.x1 - 1.5, z + 1)) ctx.decor('wd_fence', B.x1 - 1.5, z + 1, { ry: Math.PI / 2, big: true }); }
      }
      const gx = (B.x0 + B.x1) / 2, gz = B.z1 - 1;
      if (inC(gx, gz) && F.Things.defs.v_grind) place(ctx, 'v_grind', gx, gz, { id: 'fg:' + main.biome + B.bi + ',' + B.bj, r: 1 });
      const an = main.biome === 'vindmolle' ? 'sau' : (B.h < 0.5 ? 'sau' : 'ku');
      const n = 2 + Math.floor(B.h * 3);
      for (let k = 0; k < n; k++) {
        const ax = B.x0 + 3 + U.hash2(B.bi * 7 + k, B.bj, SEED() + 71) * (B.x1 - B.x0 - 6), az = B.z0 + 3 + U.hash2(B.bi, B.bj * 7 + k, SEED() + 72) * (B.z1 - B.z0 - 6);
        if (!inC(ax, az) || !ctx.free(ax, az, 1)) continue;
        place(ctx, an, ax, az, { id: 'fa:' + main.biome + B.bi + ',' + B.bj + ':' + k, ry: U.hash2(k, B.bi, 3) * 6.28 });
      }
    } else if (B.kind === 'frukt') {
      // orchard rows: decor trees + some shakeable apple trees
      for (let x = B.x0 + 3; x < B.x1 - 2; x += 6) for (let z = B.z0 + 3; z < B.z1 - 2; z += 6.5) {
        if (!inC(x, z)) continue;
        const hk = U.hash2(Math.round(x), Math.round(z), SEED() + 73);
        if (hk < 0.3) { if (ctx.free(x, z, 1.6)) place(ctx, 'n_epletre', x, z, { id: 'ot:' + Math.round(x) + ',' + Math.round(z), data: { kind: B.h < 0.5 ? 'eple' : 'kirsebaer' } }); }
        else { const k = B.h < 0.5 ? 'eple' : (B.h < 0.75 ? 'kirsebaer' : 'plomme'); ctx.decor('wd_tree_s', x, z, { big: true, claim: 1.4, opts: { c: k === 'kirsebaer' ? 'blossom' : 'leaf', d: k === 'eple' ? 'red' : (k === 'plomme' ? 'plum' : 'white') }, ry: hk * 6.28 }); }
      }
    } else if (!ctx.plan) {
      // crops are scattered per cell in scatter(); a low fence on the road-facing sides of some fields
      if (B.h < 0.35) for (let x = B.x0 + 1; x < B.x1 - 1; x += 2) if (inC(x + 1, B.z1 - 0.6)) ctx.decor('wd_fence', x + 1, B.z1 - 0.6, { ry: 0, big: true, opts: { c: 'white' } });
    }
  }
}

/* ---------------- cell fill (8×8 cells of 4 m) */
function cellFill(ctx, main, regs, info) {
  const { x0, z0 } = ctx, r = ctx.rng;
  const table = tableFor(main.biome), clusters = CLUSTERS[main.biome] || [];
  for (let gj = 0; gj < 8; gj++) for (let gi = 0; gi < 8; gi++) {
    const roll = r(), px = x0 + gi * 4 + 0.6 + r() * 2.8, pz = z0 + gj * 4 + 0.6 + r() * 2.8, pick = r(), pick2 = r();
    if (roll < 0.05) continue;
    if (roll < 0.76) { bigDecor(ctx, regs, main, px, pz, pick, pick2, props(info)); continue; }
    if (roll < 0.93) {
      const t = pickW(table, pick);
      if (t === 'n_trappesteiner') { if (!placeStones(ctx, regs, main, px, pz, r)) bigDecor(ctx, regs, main, px, pz, pick, pick2, props(info)); continue; }
      const p = usable(ctx, regs, px, pz, rad(t), typeNeeds(t));
      if (!p || !typeOk(t, p, px, pz)) { bigDecor(ctx, regs, main, px, pz, pick, pick2, props(info)); continue; }
      place(ctx, t, px, pz, { ry: faceCam(r), data: dataFor(t, r, main) });
      continue;
    }
    // cluster
    const cl = CL[pickW(clusters.length ? clusters : [['honer', 1]], pick)];
    const n = U.int(r, cl.n[0], cl.n[1]);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = k ? cl.sp * (0.6 + r() * 0.6) : 0;
      const t = cl.t[k % cl.t.length];
      const x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
      const p = usable(ctx, regs, x, z, rad(t) * 0.8, typeNeeds(t));
      if (!p || !typeOk(t, p, x, z)) continue;
      place(ctx, t, x, z, { ry: faceCam(r), data: dataFor(t, r, main), r: rad(t) * 0.8 });
    }
  }
}
const props = info => info.props;
function typeNeeds(t) {
  if (t === 'n_molle') return { flat: 1.5, flatTol: 0.5 };
  if (t === 'n_skoytedam') return { flat: 3, flatTol: 0.25 };
  if (t === 'n_epletre') return { field: true };
  if (t === 'sau' || t === 'ku' || t === 'n_hoyball') return { field: true };
  return null;
}
function typeOk(t, p, x, z) {
  if (t === 'n_akebakke') { const a = probe(x, z - 4).h, b = probe(x, z + 4).h; return Math.abs(a - b) > 1.2; }
  if (t === 'n_molle' && p.r1 && p.r1.biome === 'vindmolle') return p.h > 3;
  if ((t === 'sau' || t === 'ku') && p.field && p.field.kind !== 'beite') return false;
  if (t === 'n_hoyball' && p.field && p.field.kind !== 'hvete') return false;
  if (t === 'n_epletre' && p.field && p.field.kind !== 'frukt') return false;
  return true;
}
// non-interactive bigger decor of a cell (bush, rock, single tree, hay, flower clump, mushrooms)
function bigDecor(ctx, regs, main, x, z, a, b, propList) {
  const p = usable(ctx, regs, x, z, 0.7, { field: true });
  if (!p) return;
  const biome = main.biome;
  if (p.field) {
    if (p.field.kind === 'hvete' && a < 0.25) { ctx.decor('wd_hay', x, z, { big: true, ry: b * 6.28, claim: 0.7 }); propList.push({ x, z, r: 0.6 }); }
    return;
  }
  const tbl = {
    slott: [['bush', 4], ['rock', 1.5], ['tree', 1], ['flowers', 3]],
    blomstereng: [['bush', 3], ['rock', 1], ['tree', 1.6], ['flowers', 6], ['mush', 0.6]],
    gardsland: [['bush', 2], ['rock', 1.5], ['tree', 0.7], ['hay', 2], ['flowers', 2]],
    frukthage: [['bush', 2], ['tree', 2.5], ['flowers', 3], ['rock', 0.8]],
    innsjo: [['bush', 3], ['rock', 2], ['tree', 1], ['flowers', 2], ['reeds', 1]],
    strand: [['rock', 1.2], ['dune', 4], ['parasol', 1.2], ['towel', 1.2], ['shells', 2], ['hut', 0.5], ['ball', 0.5]],
    vindmolle: [['bush', 2], ['rock', 3], ['flowers', 3], ['tree', 0.4]],
    lavendel: [['bush', 2], ['lav', 4], ['rock', 1], ['flowers', 2], ['tree', 0.5]],
    snohaugen: [['snowbush', 3], ['snowlump', 3], ['rock', 1.5], ['ice', 1.5]],
  }[biome] || [['bush', 1]];
  const kind = pickW(tbl, a);
  const ry = b * 6.28;
  const BL = ['blossom', 'butter', 'white', 'cherry', 'lilac', null, null];
  switch (kind) {
    case 'bush': ctx.decor(b < 0.4 ? 'wd_bush_s' : 'wd_bush', x, z, { big: true, ry, claim: 0.75, opts: { c: b < 0.2 ? 'leaf2' : 'leaf', b: BL[Math.floor(b * 7)] } }); propList.push({ x, z, r: 0.75 }); break;
    case 'rock': ctx.decor('wd_rock', x, z, { big: true, ry, claim: 0.6, opts: { moss: b < 0.5, c: b < 0.3 ? 'stone' : 'stone2' } }); propList.push({ x, z, r: 0.55 }); break;
    case 'tree': {
      const k = ['rund', 'blomst', 'eple', 'kirsebaer', 'rund', 'plomme'][Math.floor(b * 6)];
      if (!ctx.free(x, z, 1.8)) return;
      ctx.decor('wd_tree', x, z, { big: true, ry, claim: 1.4, opts: { k } }); propList.push({ x, z, r: 1.1 }); break;
    }
    case 'hay': ctx.decor('wd_hay', x, z, { big: true, ry, claim: 0.7 }); propList.push({ x, z, r: 0.6 }); break;
    case 'flowers': for (let k = 0; k < 4; k++) ctx.decor('wd_flowers', x + Math.cos(k * 1.7 + b * 6) * 0.7, z + Math.sin(k * 1.7 + b * 6) * 0.7, { s: 1.45, ry: k * 1.3, sway: 0.14, opts: { cs: [FLOWERS[Math.floor(b * 7)], FLOWERS[(Math.floor(b * 7) + 2) % 7], 'white'], v: k % 2 } }); ctx.claim(x, z, 0.6); break;
    case 'mush': for (let k = 0; k < 5; k++) ctx.decor('wd_mushroom', x + Math.cos(k * 1.26) * 0.5, z + Math.sin(k * 1.26) * 0.5, { ry: k, fine: true }); break;
    case 'reeds': ctx.decor('wd_reeds', x, z, { ry, sway: 0.1 }); break;
    case 'dune': ctx.decor('wd_dunegrass', x, z, { ry, sway: 0.2 }); ctx.decor('wd_dunegrass', x + 0.5, z + 0.3, { ry: ry + 1, sway: 0.2 }); break;
    case 'parasol': ctx.decor('wd_parasol', x, z, { big: true, claim: 0.6, opts: { c: b < 0.5 ? 'coral' : 'sky' } }); propList.push({ x, z, r: 0.4 }); break;
    case 'shells': ctx.decor('wd_shell', x, z, { ry, fine: true, opts: { c: b < 0.5 ? 'peach' : 'pink' } }); ctx.decor('wd_starfish', x + 0.4, z - 0.3, { ry, fine: true }); break;
    case 'towel': {
      // a striped beach towel (merged blocks) with a little bucket
      const y0 = W.floorY(x, z), cols = [[0xff8a7a, 0xfff6e8], [0x6fc8f0, 0xfff6e8], [0xffd84a, 0xff7fb0], [0x9fe6c4, 0xfff6e8]][Math.floor(b * 4)];
      const rot = b < 0.5; for (let k = 0; k < 5; k++) { const a0 = -0.9 + k * 0.36; if (rot) ctx.block(x + a0, y0, z - 0.5, x + a0 + 0.36, y0 + 0.04, z + 0.5, cols[k & 1]); else ctx.block(x - 0.5, y0, z + a0, x + 0.5, y0 + 0.04, z + a0 + 0.36, cols[k & 1]); }
      ctx.claim(x, z, 1); break;
    }
    case 'hut': if (ctx.free(x, z, 2)) { const hc = ['sky', 'pink', 'mint', 'butter'][Math.floor(b * 4)]; ctx.decor(MOD('v_strandhytte', 'wd_hut'), x, z, { big: true, claim: 1.8, ry: 0, opts: { c: hc, col: hc } }); propList.push({ x, z, r: 1.5 }); } break;
    case 'ball': if (F.VOX.has('n_strandball')) ctx.decor('n_strandball', x, z, { ry }); break;
    case 'lav': for (let k = 0; k < 2; k++) ctx.decor('wd_lavender', x + k * 0.5 - 0.5, z + (k % 2) * 0.4, { ry: k, sway: 0.16 }); ctx.claim(x, z, 0.5); break;
    case 'snowbush': ctx.decor('wd_snowbush', x, z, { big: true, ry, claim: 0.7 }); propList.push({ x, z, r: 0.6 }); break;
    case 'snowlump': ctx.decor('wd_snowlump', x, z, { big: true, ry, claim: 0.6 }); propList.push({ x, z, r: 0.5 }); break;
    case 'ice': ctx.decor('wd_icespike', x, z, { ry, claim: 0.4, fine: true }); break;
  }
}

/* ---------------- density top-up: ≥10 interactables, ≥1 learning spot (scaled by land fraction) */
function faunaIn(key) { try { return (F.Fauna && F.Fauna.countIn) ? (+F.Fauna.countIn(key) || 0) : 0; } catch (e) { return 0; } }
function countRecs(ctx) {
  let n = ctx.fauna != null ? ctx.fauna : (ctx.fauna = faunaIn(ctx.key)), l = 0;
  for (const r of ctx.records) { if (r.kind === 'coin' || r.kind === 'rare') continue; n++; if (r.learn) l++; }
  return [n, l];
}
function topUp(ctx, main, regs, info) {
  const need = Math.ceil(10 * Math.min(1, info.land * 1.15));
  info.required = need;
  if (need <= 0) return;
  const r = ctx.rng;
  const order = U.shuffle(r, Array.from({ length: 64 }, (_, i) => i));
  const learnList = LEARN_FILL[main.biome] || LEARN_DEFAULT, fill = FILLER[main.biome] || FILLER.blomstereng;
  for (let pass = 0; pass < 3; pass++) {
    let [n, l] = countRecs(ctx);
    if (n >= need && l >= 1) break;
    for (const ci of order) {
      [n, l] = countRecs(ctx);
      if (n >= need && l >= 1) break;
      const t = l < 1 ? learnList[Math.floor(r() * learnList.length)] : fill[Math.floor(r() * fill.length)];
      const x = ctx.x0 + (ci % 8) * 4 + 0.8 + r() * 2.4, z = ctx.z0 + Math.floor(ci / 8) * 4 + 0.8 + r() * 2.4;
      const rr = rad(t) * (pass ? 0.75 : 1);
      const p = usable(ctx, regs, x, z, rr, Object.assign({ field: pass > 0, zoneOk: pass > 1, margin: 0.6 }, typeNeeds(t) || {}));
      if (!p || (pass === 0 && !typeOk(t, p, x, z))) continue;
      place(ctx, t, x, z, { ry: faceCam(r), data: dataFor(t, r, main), r: rr });
    }
  }
}

/* ---------------- problem-giver rule: one wish spot per 2×2 chunk block */
const chunkLandish = (cx, cz) => {
  const x = cx * 32 + 16, z = cz * 32 + 16;
  if (Math.abs(x) < 120 && Math.abs(z) < 120) return false;
  if (z > waterline(x) - 6) return false;
  const p = probe(x, z); return p.hq >= W.WATER;
};
function chosenChunk(bx, bz) {
  const k0 = Math.floor(U.hash2(bx, bz, SEED() + 81) * 4);
  for (let t = 0; t < 4; t++) { const k = (k0 + t) % 4, cx = bx * 2 + (k & 1), cz = bz * 2 + (k >> 1); if (chunkLandish(cx, cz)) return [cx, cz]; }
  return null;
}
function wishSpot(ctx, main, regs, info) {
  const bx = Math.floor(ctx.cx / 2), bz = Math.floor(ctx.cz / 2);
  const ch = chosenChunk(bx, bz);
  if (!ch || ch[0] !== ctx.cx || ch[1] !== ctx.cz) return;
  const rr = U.rng(U.hashStr('wish' + bx + ',' + bz + ':' + SEED()));
  const jobs = JOBS[main.biome] || JOBS.blomstereng;
  const who = { name: F.SETS.NAMES[Math.floor(rr() * F.SETS.NAMES.length)], job: jobs[Math.floor(rr() * jobs.length)], voice: rr() < 0.15 ? 'barn' : (rr() < 0.5 ? 'vm' : 'vk') };
  const base = { id: 'wish:' + bx + ',' + bz, regionId: main.id, regionName: main.name, chunk: ctx.key };
  let spot = null;
  // 1. a village door in this chunk
  const vd = ctx.records.find(r => r.type === 'v_husdor');
  if (vd) { const d = vd.data || {}; spot = Object.assign(base, { kind: 'door', x: vd.x, z: vd.z, doorThingId: vd.id, num: d.num, name: d.resident || who.name, job: d.job || who.job, voice: who.voice }); }
  // 2. a landmark / market stall
  if (!spot) { const st = ctx.records.find(r => r.type === 'v_markedsbod' || (r.id && r.id.indexOf('lm:') === 0 && /:main$/.test(r.id))); if (st) spot = Object.assign(base, who, { kind: st.type === 'v_markedsbod' ? 'stall' : 'anchor', x: st.x, z: st.z + 2.2 }); }
  // 3. a lone cottage
  if (!spot) {
    for (let t = 0; t < 24 && !spot; t++) {
      const x = ctx.x0 + 6 + rr() * 20, z = ctx.z0 + 6 + rr() * 20;
      const p = usable(ctx, regs, x, z, 3.6, { flat: 2.6, flatTol: 0.25, margin: 5 });
      if (!p) continue;
      const tl = THEME_BY_BIOME[main.biome] || Object.keys(THEMES), th0 = tl[Math.floor(rr() * tl.length)];
      const num = 1 + Math.floor(rr() * 40), look = Object.assign({}, designs(th0)[Math.floor(rr() * 6)]);   // v5 WP-W: a lone farmhouse, natural number
      const y = p.hq, hs = houseSpec(look);
      ctx.decor(hs.id, x, z, { y, ry: 0, big: true, opts: hs.opts, claim: 3.6 });
      ctx.box(x - hs.hx, z - hs.hz, x + hs.hx, z + hs.hz);
      const did = 'hd:' + ctx.key + ':lone';
      ctx.spawn('v_husdor', x, z + hs.fd + 0.1, { id: did, ry: 0, data: { num, lone: true, resident: who.name, job: who.job } });
      ctx.label(new THREE.Vector3(x, y + 2.75, z + hs.fd + 0.35), String(num), { kind: 'num', maxDist: 26 });
      place(ctx, 'v_postkasse', x + 3.4, z + 3.6, { id: 'hp:' + ctx.key, data: { letter: true, num } });
      if (!ctx.plan) {
        for (let k = -2; k <= 2; k++) if (k) ctx.decor('wd_picket', x + k * 2, z + 4.6, { y, ry: 0 });
        ctx.decor('wd_flowers', x - 2, z + 3, { y, opts: { cs: [look.fl, 'white', 'butter'] } }); ctx.decor('wd_flowers', x + 2, z + 3, { y, opts: { cs: [look.fl, 'pink', 'white'], v: 1 } });
      }
      spot = Object.assign(base, who, { kind: 'door', x, z: z + hs.fd + 1.3, doorThingId: did, num });
    }
  }
  // 4. picnic (not in the snow: a blanket in a snowfield looks wrong – step 5 gives a wandering villager instead)
  if (!spot && main.biome !== 'snohaugen') {
    for (let t = 0; t < 40 && !spot; t++) {
      const x = ctx.x0 + 3 + rr() * 26, z = ctx.z0 + 3 + rr() * 26;
      const p = usable(ctx, regs, x, z, 1.6, { field: true, zoneOk: true, margin: 2 });
      if (!p) continue;
      place(ctx, 'v_piknik', x, z, { id: 'pk:' + ctx.key });
      spot = Object.assign(base, who, { kind: 'picnic', x: x + 1.6, z: z + 1.2 });
    }
  }
  // 5. any dry free point (a wandering villager)
  if (!spot) {
    for (let t = 0; t < 60 && !spot; t++) {
      const x = ctx.x0 + 2 + rr() * 28, z = ctx.z0 + 2 + rr() * 28;
      if (W.inReserved(x, z, 2)) continue;
      const p = probe(x, z); if (p.hq < W.WATER + 0.05 || p.lakeS < 1.05) continue;
      if (!ctx.free(x, z, 0.8)) continue;
      ctx.claim(x, z, 0.8);
      spot = Object.assign(base, who, { kind: 'walk', x, z });
    }
  }
  if (spot) {
    spot.kid = spot.voice === 'barn';
    if (spot.ry == null) spot.ry = 0;
    if (spot.kind === 'door' && spot.doorThingId && spot.doorThingId.indexOf('hd:r_') === 0) { spot.villageId = spot.regionId; const hh = (lay(main).village || { houses: [] }).houses.find(q2 => q2.doorThingId === spot.doorThingId); if (hh) { spot.x = hh.door.x + hh.fx * 1.5; spot.z = hh.door.z + hh.fz * 1.5; spot.ry = hh.ry; } }
    info.spots.push(spot);
  }
}

/* ---------------- hidden coins (2 per chunk; economy §2: found coins ≤ 3 a play day in all) + rare golden letter (25 %) */
function finds() {
  const day = F.save.day || 1;
  let f = F.save.finds;
  if (!f || f.day !== day) f = F.save.finds = { day, n: 0, ids: {} };
  return f;
}
/* economy §2 / §1 row 7 (12.10): found coins (world coins, objects, the well, sand, surprises) are ≤ 3 a day IN ALL – the shared luck
   count is F.save.eco.luck {day, n} (economy.js) when it exists, else her world coins. At the cap coins stop appearing (new chunks
   spawn none; the ones lying around fade away when they are off screen) and nothing is said – no «Du har funnet mange mynter i dag!». */
const LUCK_CAP = 3;
function luckN() {
  const day = F.save.day || 1, f = finds();
  let e = 0; try { const L = F.save.eco && F.save.eco.luck; if (L && L.day === day) e = +L.n || 0; } catch (err) { e = 0; }
  return Math.max(f.n, e);
}
const luckFull = () => luckN() >= ((F.Eco && F.Eco.LUCK_CAP) || LUCK_CAP);
W.luckFull = luckFull;
const GOLD_LETTERS = 'abcdefghijklmnopstuvæøå'.split('');
function coins(ctx, main, regs, info) {
  const r = ctx.rng, f = finds();
  const pl = info.props;
  for (let k = 0; k < 2; k++) {
    const id = 'coin:' + ctx.key + ':' + k;
    let x = null, z = null;
    for (let t = 0; t < 10 && x == null; t++) {
      if (pl.length && t < 6) { const pr = pl[Math.floor(r() * pl.length)]; const a = r() * Math.PI * 2; const cx2 = pr.x + Math.cos(a) * (pr.r + 0.25), cz2 = pr.z + Math.sin(a) * (pr.r + 0.25); if (usable(ctx, regs, cx2, cz2, 0.2, { field: true })) { x = cx2; z = cz2; } }
      else { const cx2 = ctx.x0 + 1 + r() * 30, cz2 = ctx.z0 + 1 + r() * 30; if (usable(ctx, regs, cx2, cz2, 0.3, { field: true })) { x = cx2; z = cz2; } }
    }
    if (x == null) continue;
    ctx.claim(x, z, 0.25);
    ctx.spawn('w_coin', x, z, { id, ry: r() * 6.28, kind: 'coin', skip: !!f.ids[id] || luckFull() });
  }
  if (r() < 0.25) {
    let l = GOLD_LETTERS[Math.floor(r() * GOLD_LETTERS.length)];
    // v5c WP-W2 (longevity hook #24): r and y were missing from the golden letters – they appear in regions she has not visited yet
    // (a visited region keeps exactly the letter it had: old saves never change)
    try { const h = U.hashStr('gl:' + ctx.key); if (main && main.id != null && !(F.save.visited || []).map(String).includes(String(main.id)) && h % 8 === 0) l = (h >>> 3) % 2 ? 'r' : 'y'; } catch (e) { /* keep l */ }
    const id = 'gold:' + ctx.key;
    for (let t = 0; t < 8; t++) {
      const x = ctx.x0 + 2 + r() * 28, z = ctx.z0 + 2 + r() * 28;
      if (!usable(ctx, regs, x, z, 0.5, { field: true })) continue;
      const have = (F.save.golden || []).includes(l);
      ctx.claim(x, z, 0.5);
      ctx.spawn('w_gullbokstav', x, z, { id, kind: 'rare', data: { l }, skip: have || (W.diff(ctx.key, false) || { rm: [] }).rm.includes(id) });
      break;
    }
  }
}

/* ---------------- pure decor scatter (uses ctx.drng only; build mode only) */
function scatter(ctx, main, regs, info) {
  const ch = ctx.chunk, d = ctx.drng;
  const SURF = ch.SURF, BIOA = ch.BIO, FKA = ch.FKA, H = ch.H; if (!SURF) return;
  const N = 64, N2 = 66;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = d(), b = d();
    const idx = j * N + i;
    if (ctx.occ[idx]) continue;
    const s = SURF[idx], bio = BIO[BIOA[idx]];
    const x = ctx.x0 + (i + 0.15 + b * 0.7) * 0.5, z = ctx.z0 + (j + 0.15 + d() * 0.7) * 0.5;
    const y = H[(j + 1) * N2 + (i + 1)];
    if (y < -50) continue;
    // keep decor off step edges (would float)
    if (s === SF.GRASS || s === SF.SNOW) {
      if (bio === 'slott' && W.inReserved(x, z, 0)) continue;
      if (bio === 'snohaugen' || s === SF.SNOW) { if (a < 0.008) ctx.decor('wd_snowlump', x, z, { y, ry: b * 6, s: 0.6, fine: true }); else if (a < 0.012) ctx.decor('wd_icespike', x, z, { y, ry: b * 6, fine: true }); continue; }
      if (bio === 'strand') { if (a < 0.02) ctx.decor('wd_dunegrass', x, z, { y, ry: b * 6, sway: 0.2 }); continue; }
      const meadow = bio === 'blomstereng';
      const m1 = 0.25 + 1.9 * U.smooth(nz(x, z, 1 / 9, 61)), m2 = 0.1 + 2.6 * Math.pow(nz(x, z, 1 / 7, 62), 2);
      const pt = (meadow ? 0.024 : 0.024) * m1, pf = (meadow ? 0.014 : 0.005) * m2, pc = 0.005 * m1, pd = (meadow ? 0.005 : 0.002) * m2;
      if (a < pt) ctx.decor('wd_tuft', x, z, { y, ry: b * 6.28, fine: true, sway: 0.3, opts: { v: Math.floor(b * 3), c: b < 0.5 ? 'grass' : 'leaf2', d: 'grassDark' } });
      else if (a < pt + pf) { const fc = FLOWERS[Math.floor(b * 7)]; ctx.decor('wd_flowers', x, z, { y, ry: b * 6.28, fine: true, sway: 0.16, opts: { cs: [fc, FLOWERS[Math.floor(b * 49) % 7], 'white'], v: Math.floor(b * 2) } }); ctx.dot(x, y + 0.03, z, shade(PAL[fc], 0.9), 0.17); }
      else if (a < pt + pf + pc) ctx.decor('wd_clover', x, z, { y, ry: Math.floor(b * 4) * 1.57, fine: true, opts: { f: b < 0.3 } });
      else if (a < pt + pf + pc + pd) { ctx.decor('wd_daisies', x, z, { y, ry: b * 6.28, fine: true }); ctx.dot(x, y + 0.03, z, 0xe8e8e0, 0.12); }
      else if (bio === 'lavendel' && a < pt + pf + pc + pd + 0.007) ctx.decor('wd_lavender', x, z, { y, ry: b * 6, sway: 0.16 });
    } else if (s === SF.FIELD || s === SF.FIELD2) {
      const fk = FKN[FKA[idx]];
      if (fk === 'solsikke' && s === SF.FIELD2 && (i % 3 === 0) && (j & 1) && a < 0.5) ctx.decor('wd_sunflower', x, z, { y, ry: (b - 0.5) * 0.6, sway: 0.05 });
      else if (fk === 'beite' && a < 0.03) ctx.decor('wd_tuft', x, z, { y, ry: b * 6, fine: true, sway: 0.3, opts: { v: 1, c: 'leaf2' } });
      else if (fk === 'aker' && s === SF.FIELD2 && (i % 3 === 1) && a < 0.5) ctx.decor('wd_cabbage', x, z, { y, ry: 0, fine: true });
    } else if (s === SF.BED) { if (a < 0.6) ctx.decor('wd_flowers', x, z, { y, ry: b * 6, sway: 0.16, opts: { cs: [FLOWERS[Math.floor(b * 7)], 'white', 'butter'], v: Math.floor(a * 3) % 2 } }); }
    else if (s === SF.WET) {
      if (y >= W.WATER - 0.15 && a < 0.06) ctx.decor('wd_reeds', x, z, { y, ry: b * 6, sway: 0.1 });
      else if (y < W.WATER - 0.4 && y > -1.6 && a < 0.012 && bio !== 'strand' && z < 470) ctx.decor('wd_lily', x, z, { y: W.WATER + 0.02, ry: b * 6, opts: { f: b < 0.4 ? (b < 0.2 ? 'pink' : 'white') : null } });
    } else if (s === SF.SAND) {
      if (a < 0.006) ctx.decor('wd_shell', x, z, { y, ry: b * 6, fine: true, opts: { c: b < 0.5 ? 'peach' : 'pink' } });
      else if (a < 0.009) ctx.decor('wd_starfish', x, z, { y, ry: b * 6, fine: true });
      else if (a < 0.02 && main.biome === 'strand' && z < waterline(x) - 10) ctx.decor('wd_dunegrass', x, z, { y, ry: b * 6, sway: 0.2 });
    } else if (s === SF.EDGE) { if (a < 0.03) ctx.decor('wd_stone', x, z, { y, ry: b * 6, fine: true, opts: { c: b < 0.5 ? 'stone2' : 'stone' } }); }
  }
}
/* crop rows as long merged blocks: one box per 1.2–2.4 m segment (cheap, crisp diorama look) */
const KC = c => shade(c, 0.92);
function cropRows(ctx) {
  const ch = ctx.chunk, SURF = ch.SURF, FKA = ch.FKA, H = ch.H; if (!SURF) return;
  const N = 64, N2 = 66, d = ctx.drng;
  const at = (x, z) => { const i = Math.floor((x - ctx.x0) * 2), j = Math.floor((z - ctx.z0) * 2); if (i < 0 || j < 0 || i >= N || j >= N) return null; const k = j * N + i; return { k, s: SURF[k], fk: FKN[FKA[k]], y: H[(j + 1) * N2 + (i + 1)], occ: ctx.occ[k] }; };
  for (let j = 0; j < N; j++) {
    const zc = ctx.z0 + (j + 0.5) * 0.5;
    let i = 0;
    while (i < N) {
      const c0 = at(ctx.x0 + (i + 0.5) * 0.5, zc);
      if (!c0 || !c0.fk || c0.fk === 'beite' || c0.fk === 'frukt' || c0.fk === 'solsikke' || c0.occ || (c0.s !== SF.FIELD && c0.s !== SF.FIELD2)) { i++; continue; }
      // segment: same surf + same height, 2–5 cells
      const len = c0.fk === 'tulipan' ? 2 + Math.floor(d() * 3) : (c0.fk === 'lavendel' ? 3 + Math.floor(d() * 5) : 6 + Math.floor(d() * 10));   // tulips clumpy, lavender bushy runs, wheat long rows
      let n = 1;
      while (n < len && i + n < N) { const c = at(ctx.x0 + (i + n + 0.5) * 0.5, zc); if (!c || c.s !== c0.s || c.fk !== c0.fk || c.y !== c0.y || c.occ) break; n++; }
      const x0 = ctx.x0 + i * 0.5 + 0.04, x1 = ctx.x0 + (i + n) * 0.5 - 0.04, z0 = ctx.z0 + j * 0.5, z1 = z0 + 0.5, y = c0.y;
      const jit = d();
      switch (c0.fk) {
        case 'hvete': {
          const h = 0.42 + jit * 0.16;
          if (c0.s === SF.FIELD2) ctx.block(x0, y, z0 + 0.04, x1, y + h, z1 - 0.04, KC(0xf0d070), { top: KC(jit < 0.5 ? 0xf6dc86 : 0xe9c45c), sway: 0.22 });
          else if (jit < 0.35) ctx.block(x0 + 0.1, y, z0 + 0.12, x1 - 0.1, y + h * 0.7, z1 - 0.12, KC(0xe6c25a), { top: KC(0xf2d27a), sway: 0.22 });
          break;
        }
        case 'aker': if (c0.s === SF.FIELD2) ctx.block(x0, y, z0 + 0.08, x1, y + 0.22 + jit * 0.08, z1 - 0.08, KC(F.PAL.leaf), { top: KC(jit < 0.5 ? F.PAL.leaf2 : 0x9be37c) }); break;
        case 'tulipan': if (c0.s === SF.FIELD) { const hh = 0.28 + jit * 0.06; ctx.block(x0, y, z0 + 0.1, x1, y + hh, z1 - 0.1, KC(F.PAL.leaf)); ctx.block(x0 + 0.03, y + hh, z0 + 0.06, x1 - 0.03, y + hh + 0.16, z1 - 0.06, KC(F.PAL[tulipColour(x0, z0)]), { big: false }); } break;
        case 'lavendel': if (c0.s === SF.FIELD) ctx.block(x0 + 0.03, y, z0 + 0.05, x1 - 0.03, y + 0.4 + jit * 0.14, z1 - 0.05, KC(jit < 0.5 ? F.PAL.lavField : F.PAL.purple), { top: KC(mix(F.PAL.lavender, jit < 0.5 ? F.PAL.lavField : 0xf0e4ff, 0.15 + jit * 0.3)), sway: 0.16 }); break;
      }
      i += n + (d() < 0.3 ? 1 : 0);
    }
  }
}
function tulipColour(x, z) { const cs = ['rose', 'butter', 'coral', 'pink', 'lilac', 'white', 'orange']; return cs[((Math.floor(z / 1.5) % cs.length) + cs.length) % cs.length]; }   // (negative z: no black rows)

/* =====================================================================================================================
   7. Things defined by WORLD: hidden coin, golden letter, placeholder (tests only)
   ===================================================================================================================== */
F.Things.def('w_coin', {
  name: 'mynten', radius: 0.3, solid: false, reach: 1.6,
  build() { const g = F.VOX.make('wd_coin'); g.position.y = 0.06; g.rotation.x = -0.25; const w = new THREE.Group(); w.add(g); return w; },
  tick(th, dt, t) { if (th.obj && !th.taken) { th.obj.children[0].rotation.y = Math.sin(t * 1.3 + th.t0) * 0.5; } },
  async press(th) {
    if (th.taken) return;
    const f = finds();
    const o = th.obj, c = o.children[0];
    if (luckFull()) {      // (a coin still lying in view when the day's luck ran out: it twirls and fades – no coin, no line)
      th.taken = true;
      if (F.FX && F.FX.sparkle) F.FX.sparkle(o.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      await F.T.tween(500, k => { c.rotation.y = k * Math.PI * 2; c.scale.setScalar(Math.max(0.01, 1 - k)); });
      o.visible = false; F.Things.remove(th);
      const ch0 = W.chunks.get(th.chunk); if (ch0) { const i = ch0.things.indexOf(th); if (i >= 0) ch0.things.splice(i, 1); }
      return;
    }
    th.taken = true; f.n++; f.ids[th.id] = 1; F.store();
    F.sfx && F.sfx.coin && F.sfx.coin();
    const s = F.Input && F.Input.screenOf ? F.Input.screenOf(th) : null;
    await F.T.tween(650, k => { c.position.y = 0.06 + Math.sin(k * Math.PI) * 1.2 + k * 0.3; c.rotation.y = k * Math.PI * 6; c.scale.setScalar(1 + k * 0.6); });
    if (F.FX && F.FX.sparkle) F.FX.sparkle(o.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    // v5 WP-W (logic #42): one coin found = one coin flying to the purse (Eco.add flies it from the coin's screen spot)
    if (F.Eco && F.Eco.add) F.Eco.add(1, { from: th, reason: 'coin' }); else if (F.UI && F.UI.flyCoins && s) F.UI.flyCoins(1, s);
    if (F.Speech && !F.Speech.busy()) F.SAYF && F.SAYF('world_coin');
    o.visible = false;
    F.Things.remove(th);
    const ch = W.chunks.get(th.chunk); if (ch) { const i = ch.things.indexOf(th); if (i >= 0) ch.things.splice(i, 1); }
  },
});
// economy §2: once the day's luck is used up, the coins still lying around go quietly – only those she cannot see right now
let luckAcc = 0;
const luckTmp = new THREE.Vector3();
F.on('tick', dt => {
  luckAcc += dt; if (luckAcc < 2) return; luckAcc = 0;
  if (!F.booted || !luckFull()) return;
  for (const th of F.Things.list.filter(t => t.type === 'w_coin' && !t.taken && t.obj)) {
    let seen = false;
    try { if (th.space === F.Space.cur) { luckTmp.set(th.x, (th.y || 0) + 0.2, th.z).project(F.R.camera); seen = luckTmp.z < 1 && Math.abs(luckTmp.x) < 1.1 && Math.abs(luckTmp.y) < 1.1; } } catch (e) { seen = false; }
    if (seen) continue;
    th.taken = true; th.obj.visible = false; F.Things.remove(th);
    const ch = W.chunks.get(th.chunk); if (ch) { const i = ch.things.indexOf(th); if (i >= 0) ch.things.splice(i, 1); }
  }
});
F.Things.def('w_gullbokstav', {
  name: 'gullbokstaven', radius: 0.4, solid: false, reach: 1.8,
  build(th) { const g = F.VOX.make('wd_letter', { l: th.data.l || 'a' }); const w = new THREE.Group(); g.position.y = 0.15; w.add(g); th.labelY = 1.2; return w; },
  tick(th, dt, t) { if (th.obj && !th.taken) { const g = th.obj.children[0]; g.position.y = 0.2 + Math.sin(t * 2 + th.t0) * 0.08; g.rotation.y = Math.sin(t * 0.9 + th.t0) * 0.6; } },
  async press(th) {
    if (th.taken) return; th.taken = true;
    const g = th.obj.children[0];
    F.sfx && F.sfx.chime && F.sfx.chime();
    await F.T.tween(900, k => { g.position.y = 0.2 + k * 1.6; g.rotation.y = k * Math.PI * 4; });
    if (F.FX && F.FX.burst) F.FX.burst(th.obj.position.clone().add(new THREE.Vector3(0, 1.8, 0)), { n: 24, colors: [0xf5c542, 0xfff6b0, 0xffffff] });
    F.save.golden = F.save.golden || [];
    if (!F.save.golden.includes(th.data.l)) F.save.golden.push(th.data.l);
    // v5c WP-W2 (hook #24): the letter says its SOUND (recorded letter sounds, F.LYD – never the letter name) after the find line
    if (F.SAY && F.TPL && F.TPL.has('world_golden')) F.SAY('world_golden').then(() => (F.LYD && F.LYD.letter ? F.LYD.letter(th.data.l) : null)).catch(() => {});
    else if (F.LYD && F.LYD.letter) F.LYD.letter(th.data.l);
    F.emit('goldenLetter', th.data.l);
    W.removeThing(th);
  },
});
// a persistent bridge over water (fairy power at a tryllepunkt, quest Q16 BRO …): F.W.addBridge({ax,az,bx,bz,w,y}, style)
const BRIDGE_STYLE = { krystall: ['crystal', 'ice', 'white'], blomst: ['leaf2', 'leaf', 'blossom'], boble: ['sky', 'glass', 'white'], stjerne: ['butter', 'gold', 'glowYellow'], tre: ['woodLight', 'wood', 'woodDark'] };
F.Things.def('w_bridge', {
  name: 'broen', radius: 0.4, solid: false, hoverable: false,
  build(th) {
    const d = th.data, g = new THREE.Group();
    const dx = d.bx - d.ax, dz = d.bz - d.az, L = Math.hypot(dx, dz) || 1, ang = Math.atan2(dx, dz), w = d.w || 2;
    const [c1, c2, c3] = BRIDGE_STYLE[d.style] || BRIDGE_STYLE.krystall;
    const b = F.M.builder(); const inner = b.pivot(0, 0, 0); inner.rotation.y = ang;
    const y0 = (d.y != null ? d.y : 0.3) - th.y;
    const n = Math.max(2, Math.round(L / 0.5));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, zz = (t - 0.5) * L, yy = y0 + Math.sin(Math.PI * t) * 0.22;
      b.box(w, 0.16, L / n - 0.04, i % 2 ? c1 : c2, 0, yy, zz, { parent: inner, opacity: c1 === 'crystal' || c1 === 'sky' ? 0.85 : 1 });
      if (i % 2 === 0) for (const sx of [-1, 1]) { b.box(0.12, 0.5, 0.12, c3, sx * (w / 2 - 0.06), yy + 0.3, zz, { parent: inner }); if (c3 === 'glowYellow' || c1 === 'blossom' || c3 === 'blossom') b.sphere(0.1, c3, sx * (w / 2 - 0.06), yy + 0.6, zz, { parent: inner }); }
    }
    for (const sx of [-1, 1]) b.box(0.08, 0.08, L, c2, sx * (w / 2 - 0.06), y0 + 0.62, 0, { parent: inner });
    g.add(b.group); return g;
  },
});
W.addBridge = function (b, style) {
  const mx = (b.ax + b.bx) / 2, mz = (b.az + b.bz) / 2;
  const walk = { ax: b.ax, az: b.az, bx: b.bx, bz: b.bz, w: b.w || 2, y: (b.y != null ? b.y : 0.3) + 0.15 };
  return W.addThing('w_bridge', mx, mz, { kind: 'build', data: { ax: b.ax, az: b.az, bx: b.bx, bz: b.bz, w: b.w || 2, y: b.y != null ? b.y : 0.3, style: style || 'krystall' }, walk });
};
F.Things.def('world_placeholder', {
  name: 'pakken', radius: 0.5, solid: false,
  build() { return F.VOX.make('wd_placeholder'); },
  async press(th) { const o = th.obj; F.sfx && F.sfx.boing && F.sfx.boing(); await F.T.tween(500, k => { o.scale.y = 1 + Math.sin(k * Math.PI * 2) * 0.25; o.rotation.y = k * Math.PI; }); th.reactedVisibly = true; },
});

/* =====================================================================================================================
   8. Public queries
   ===================================================================================================================== */
function regionRecord(c) {
  if (!c) return null;
  return { id: c.id, cellX: c.i, cellY: c.j, name: c.name, biome: c.biome, biomeName: BNAME[c.biome], center: { x: c.x, z: c.z }, kind: c.kind, landmark: c.landmark || null, landmarkName: c.landmarkName || null, realm: c.realm || null };
}
W.region = (x, z) => regionRecord(regionCellAt(x, z));
W.regionById = id => { const m = /^r_(-?\d+)_(-?\d+)$/.exec(id || ''); return m ? regionRecord(cell(+m[1], +m[2])) : null; };
W.biomeAt = function (x, z) {
  const rv = W.inReserved(x, z, 0);
  if (rv && !rv.realm) return 'slott';
  if (rv && rv.realm && F.Realm && F.Realm.site) { const st = F.Realm.site(rv.realm); if (st) return st.biome; }
  if (z > waterline(x) + 4) return 'hav';
  const o = {}; hBase(x, z, o);
  if (o.beach > 0.5) return 'strand';
  return o.r1.biome;
};
W.BIOMES = BNAME;
W.regionsNear = function (x, z, rc) {
  rc = rc || 4;
  const [ci, cj] = cellIndex(x, z), out = [];
  for (let j = cj - rc; j <= cj + rc; j++) for (let i = ci - rc; i <= ci + rc; i++) { const c = cell(i, j); if (!c.sea) out.push(regionRecord(c)); }
  return out;
};
W.roadsNear = function (x, z, r) {
  const [ci, cj] = cellIndex(x, z), n = Math.ceil(r / RS) + 1, out = [];
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) { const c = cell(i, j); if (c.sea) continue; for (const R of [road(c, 'E'), road(c, 'S')]) if (R) out.push(R.pts.filter((p, k) => k % 3 === 0 || k === R.pts.length - 1)); }
  return out;
};
W.lakesNear = function (x, z, r) {
  const [ci, cj] = cellIndex(x, z), n = Math.ceil(r / RS) + 1, out = [];
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) { const c = cell(i, j); for (const L of lakesOf(c)) out.push({ x: L.x, z: L.z, r: L.r, islet: L.islet || null }); }
  return out;
};
W.coastZ = x => waterline(x);
W.creeksNear = function (x, z, r) {
  const [ci, cj] = cellIndex(x, z), n = Math.ceil(r / RS) + 1, out = [];
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) { const K = creekOf(cell(i, j)); if (K) out.push({ id: K.id, pts: K.pts.filter((p, k) => k % 2 === 0), bridges: K.bridges.map(b => ({ x: b.x, z: b.z })) }); }
  return out;
};
W.density = function (cx, cz) {
  const live = W.chunks.get(W.key(cx, cz));
  const recs = live ? live.records : W.plan(cx, cz).records;
  const info = live ? live.info : (W.plan(cx, cz).info);
  let n = 0, l = 0, coinsN = 0;
  for (const r of recs) { if (r.kind === 'coin') { coinsN++; continue; } if (r.kind === 'rare') continue; n++; if (r.learn) l++; }
  const fa = info && info.park ? 0 : faunaIn(W.key(cx, cz)); n += fa;
  const spots = (info && info.spots) || [];
  return { interactables: n, fauna: fa, learnSpots: l, npcs: spots.length, coins: coinsN, required: info ? (info.required != null ? info.required : 0) : 0, land: info ? info.land : 0, park: !!(info && info.park) };
};
W.wishSpots = function (cx, cz) {
  const live = W.chunks.get(W.key(cx, cz));
  const info = live ? live.info : W.plan(cx, cz).info;
  return (info && info.spots) ? info.spots.slice() : [];
};
W.wishBlock = (bx, bz) => chosenChunk(bx, bz);
/* a natural walking route inside a village (for LIFE's background shopping): doorstep → street → along the (bending) street →
   plaza → counter. from / to: house number | 'shop' | 'stall' | 'fountain'. Returns [[x,z], ...] or null. */
W.villageRoute = function (v, from, to) {
  if (typeof v === 'string') { const c = W.regionById(v); if (!c) return null; v = W.villages({ x: c.center.x, z: c.center.z }, 5)[0]; }
  if (!v || !v.houses) return null;
  const ends = k => {
    if (k === 'shop' || k === 'stall') { const s2 = v[k]; return { pt: [s2.door.x, s2.door.z], st: [v.x + 3.6, s2.door.z] }; }
    if (k === 'fountain') return { pt: [v.x + 3.4, v.z + 0.5], st: [v.x + 3.6, v.z + 0.5] };
    const h = v.houses.find(q => q.num === +k); if (!h) return null;
    return { pt: [h.step.x, h.step.z], st: [h.street.x + (h.side > 0 ? 1.6 : -1.6), h.street.z] };
  };
  const A = ends(from), B = ends(to); if (!A || !B) return null;
  const out = [A.pt, A.st];
  const z0 = A.st[1], z1 = B.st[1], dir = z1 > z0 ? 1 : -1;
  // street points between the two ends, skipping the plaza centre (the fountain): pass it on its east side
  const mid = v.street.filter(p => (p[1] - z0) * dir > 1 && (z1 - p[1]) * dir > 1 && Math.abs(p[1] - v.z) > 4.5);
  if ((z0 - v.z) * (z1 - v.z) < 0) mid.push([v.x + 3.6, v.z]);
  mid.sort((a2, b2) => (a2[1] - b2[1]) * dir);
  for (const p of mid) out.push([p[0], p[1]]);
  out.push(B.st, B.pt);
  return out.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]);
};
W.villages = function (near, r) {
  near = near || F.Player.pos; r = r || 300;
  const [ci, cj] = cellIndex(near.x, near.z), n = Math.ceil(r / RS) + 1, out = [];
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
    const c = cell(i, j); if (c.kind !== 'village') continue;
    if (Math.hypot(c.x - near.x, c.z - near.z) > r) continue;
    lay(c); out.push(villageRecord(c));
  }
  out.sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z));
  return out;
};
F.Gen = F.Gen || {};
// map arrival offset (dz from the region centre) per landmark: ~8 m south of the main model (genLandmark positions)
const LM_ARRIVE = { fyrtarn: -6, sandslott: -6, kjempemolle: -9, pariserhjul: -13, isslott: -12, krystallhoyden: -8, kjempesolsikke: -11, regnbuebro: -8, ballongplass: -10, dyrepark: -6 };
F.Gen.mapData = function (visited, o) {
  o = o || {};
  const vis = visited instanceof Set ? visited : new Set(visited || F.save.visited || []);
  const R = o.rings || 4, out = [];
  for (let j = -R; j <= Math.min(2, R); j++) for (let i = -R; i <= R; i++) {
    const c = cell(i, j); if (c.sea) continue;
    // landmarks: Map.flyTo lands at r.z + 6, so r.z is pulled north until the arrival is ~8 m south of the main model (in view)
    const az = c.kind === 'landmark' ? (LM_ARRIVE[c.landmark] != null ? LM_ARRIVE[c.landmark] : -8) - 6 : 0;
    out.push(mapEntry(c, az, vis));
  }
  // kingdoms beyond the ring window (rings up to 9) are always listed (the map shows crests by state)
  if (F.Realm && F.Realm.sites) for (const st of F.Realm.sites()) if (Math.max(Math.abs(st.i), Math.abs(st.j)) > R || st.j > Math.min(2, R)) out.push(mapEntry(cell(st.i, st.j), 0, vis));
  return out;
};
function mapEntry(c, az, vis) {
  const e = { id: c.id, name: c.name, biome: c.biome, biomeName: BNAME[c.biome], x: c.x, z: c.z + az, kind: c.kind, landmark: c.landmark || null, landmarkName: c.landmarkName || null, visited: vis.has(c.id) || c.kind === 'castle', cellX: c.i, cellY: c.j };
  if (c.kind === 'kongeslott') {
    // Map.flyTo lands at z + 6: arrive just south of the gate, facing the castle
    const g = F.Realm.gate(c.realm);
    e.realm = c.realm; e.state = F.Realm.state(c.realm); e.castle = c.name; e.cx = c.x; e.cz = c.z;
    if (g) { e.x = g.x; e.z = g.z - 3; }
  }
  return e;
}
F.Gen.roads = (x, z, r) => W.roadsNear(x || 0, z || 0, r || 900);
F.Gen.cell = (i, j) => regionRecord(cell(i, j));

/* =====================================================================================================================
   9. Region tracking: F.save.visited + 'regionEntered' (the HUD shows the banner and says the welcome)
   ===================================================================================================================== */
W.autoWelcome = false;   // the HUD shows the place banner + says the welcome line on 'regionEntered'
let curRegion = null, trackAcc = 0;
function track() {
  if (!F.booted || (F.Space && F.Space.cur !== 'out')) return;
  const P = F.Player.pos;
  const rv = W.inReserved(P.x, P.z, 0);
  const c = rv && !rv.realm ? cell(0, 0) : (rv && rv.realm && F.Realm && F.Realm.site && F.Realm.site(rv.realm) ? cell(F.Realm.site(rv.realm).i, F.Realm.site(rv.realm).j) : regionCellAt(P.x, P.z));
  if (c.id !== curRegion) enter(c);
}
function enter(c) {
  const prev = curRegion; curRegion = c.id;
  const vis = F.save.visited = Array.isArray(F.save.visited) ? F.save.visited : [];
  const first = !vis.includes(c.id);
  if (prev != null && !c.sea) F.emit('regionEntered', regionRecord(c), { first, prev });
  if (!vis.includes(c.id)) { vis.push(c.id); F.store(); }
}
F.on('tick', dt => { trackAcc += dt; if (trackAcc < 0.5) return; trackAcc = 0; track(); });
F.on('ready', () => { curRegion = null; track(); });
W.currentRegion = () => curRegion;

// world-side events after a chunk is built
F.on('chunkLoaded', ch => {
  const info = ch.info; if (!info) return;
  for (const s of info.spots || []) F.emit('wishSpot', s);
  for (const s of info.residents || []) F.emit('wishSpot', s);
  if (info.villageData) F.emit('villageLoaded', info.villageData);
});

/* =====================================================================================================================
   10. Ambient life: butterflies over meadows, flowers and fields; little birds gliding in loops (white gulls by the sea).
       Instanced (9 draw calls, < 2k triangles), purely visual: never solid, never pickable. W.AMBIENT = false hides them.
   ===================================================================================================================== */
W.AMBIENT = true;
(function ambient() {
  // w3 review: fewer, bigger voxel butterflies (pixel wings + body + soft shadow, clear flapping) at 0.8–2 m;
  // real voxel birds (body, head, beak, 2 wings) in loose V flocks at >= 8.5 m. While a task runs: no birds, no butterflies near the stage.
  const NB = 9, NG = 9, Q = 0.065;
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const cells = (rows, sx, q) => {          // pixel wing: rows = [[row, [cols]]]; x grows outwards (sx = ±1), row < 0 = forward (+z)
    const shapes = [];
    for (const [r, cs] of rows) for (const c of cs) {
      const x0 = sx > 0 ? c * q : -(c + 1) * q, y0 = r * q, s = new THREE.Shape();
      s.moveTo(x0, y0); s.lineTo(x0 + q, y0); s.lineTo(x0 + q, y0 + q); s.lineTo(x0, y0 + q); s.lineTo(x0, y0); shapes.push(s);
    }
    const g = new THREE.ShapeGeometry(shapes); g.rotateX(-Math.PI / 2); return g;   // (x, y) → (x, 0, -y): forward wing rows face +z
  };
  const BW = [[-3, [1, 2, 3]], [-2, [0, 1, 2, 3, 4]], [-1, [0, 1, 2, 3, 4]], [0, [0, 1, 2]], [1, [0, 1, 2, 3]], [2, [1, 2]]];
  const GW = [[-1, [0, 1, 2, 3]], [0, [0, 1, 2, 3, 4, 5]], [1, [1, 2, 3, 4]]];
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x || 0, y || 0, z || 0); return g; };
  const mk = (geo, n, m) => { const o = new THREE.InstancedMesh(geo, m || mat, n); o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; o.raycast = () => {}; o.name = 'ambient'; F.R.scene.add(o); return o; };
  const bL = mk(cells(BW, -1, Q), NB), bR = mk(cells(BW, 1, Q), NB);
  const bBody = mk(box(0.07, 0.07, 0.34), NB);
  const shMat = new THREE.MeshBasicMaterial({ color: 0x2a2440, transparent: true, opacity: 0.16, depthWrite: false });
  const shGeo = new THREE.CircleGeometry(0.2, 12); shGeo.rotateX(-Math.PI / 2);
  const bShadow = mk(shGeo, NB, shMat); bShadow.renderOrder = 1;
  const gBody = mk(box(0.16, 0.14, 0.36), NG), gHead = mk(box(0.13, 0.13, 0.13, 0, 0.06, 0.22), NG);
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xffa64d });
  const gBeak = mk(box(0.06, 0.05, 0.09, 0, 0.05, 0.32), NG, beakMat);
  const gL = mk(cells(GW, -1, 0.07), NG), gR = mk(cells(GW, 1, 0.07), NG);
  const BCOL = [0xffd84a, 0xff9fc8, 0x8fd3ff, 0xc9a6ff, 0xffa64d, 0xa8f0c0].map(c => new THREE.Color(c));
  const GCOL = [0x6fa8dc, 0xb07a52, 0xe07a6a, 0x7a6ab0].map(c => new THREE.Color(c)), GULL = new THREE.Color(0xf8f8f4);
  const bs = [], gs = [];
  const BODY = new THREE.Color(0x4a3a5a);
  for (let i = 0; i < NB; i++) { bs.push({ x: 0, y: -99, z: 0, a: 0, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 0.5, t: 0, h: 1 }); const c = BCOL[i % BCOL.length]; bL.setColorAt(i, c); bR.setColorAt(i, c); bBody.setColorAt(i, BODY); }
  for (let i = 0; i < NG; i++) gs.push({ flock: Math.floor(i / 3), k: i % 3 });
  const flocks = [0, 1, 2].map(() => ({ x: 0, z: 0, y: -99, r: 10, w: 0.4, a: Math.random() * 6.28, gull: false, t: 0 }));
  const D = new THREE.Object3D();
  const HAB = { blomstereng: 1, lavendel: 1.2, frukthage: 0.8, gardsland: 0.6, innsjo: 0.6, vindmolle: 0.5, slott: 0.8 };
  const habitat = (x, z) => { if (W.water(x, z) || !W.chunkOf(x, z)) return 0; const b = W.biomeAt(x, z); return HAB[b] || 0; };
  const stage = () => { const c = F.Task && F.Task.current; return c && c.S && c.S.anchor ? c.S.anchor : null; };
  const nearStage = (st, x, z) => st && Math.hypot(x - st.x, z - st.z) < 11;
  function spawnB(b, c, st) {
    for (let t = 0; t < 6; t++) {
      const a = Math.random() * 6.28, r = 3 + Math.random() * 18, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r * 0.8 - 3;
      if (nearStage(st, x, z)) continue;
      if (Math.random() < habitat(x, z)) { b.x = x; b.z = z; b.h = 0.9 + Math.random() * 0.9; b.y = W.groundY(x, z) + b.h; b.a = Math.random() * 6.28; b.t = 0; return; }
    }
    b.y = -99;
  }
  function spawnF(f, c) {
    const a = Math.random() * 6.28, r = 8 + Math.random() * 14;
    f.x = c.x + Math.cos(a) * r; f.z = c.z + Math.sin(a) * r - 4; f.r = 8 + Math.random() * 6; f.w = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.15);
    const b = W.chunkOf(f.x, f.z) ? W.biomeAt(f.x, f.z) : 'hav';
    f.gull = b === 'strand' || b === 'hav' || f.z > 430; f.t = 0;
    f.y = (W.chunkOf(f.x, f.z) ? Math.max(W.floorY(f.x, f.z), 0) : 0) + 8.5 + Math.random() * 2;
    if (b === 'snohaugen' && Math.random() < 0.6) f.y = -99;
  }
  const hide = (meshes, i) => { D.position.set(0, -99, 0); D.scale.setScalar(0.001); D.rotation.set(0, 0, 0); D.updateMatrix(); for (const m of meshes) m.setMatrixAt(i, D.matrix); };
  const BM = [bL, bR, bBody, bShadow], GM = [gBody, gHead, gBeak, gL, gR];
  let acc = 0;
  F.on('tick', (dt, t) => {
    if (F.Space && F.Space.cur !== 'out') return;
    const on = W.AMBIENT !== false && F.booted, st = on ? stage() : null;
    for (const m of BM) m.visible = on;
    for (const m of GM) m.visible = on && !st;
    if (!on) return;
    const c = F.R.cam.smooth || F.R.cam.target;
    acc += dt;
    const re = acc > 0.25; if (re) acc = 0;
    for (let i = 0; i < NB; i++) {
      const b = bs[i];
      if (b.y > -50 && nearStage(st, b.x, b.z)) b.y = -99;
      if (re && (b.y < -50 || Math.hypot(b.x - c.x, b.z - c.z) > 26 || (b.t += 0.25) > 40 + i)) spawnB(b, c, st);
      if (b.y < -50) { hide(BM, i); continue; }
      b.a += Math.sin(t * 0.9 + b.ph * 3) * dt * 1.6;
      b.x += Math.sin(b.a) * b.sp * dt; b.z += Math.cos(b.a) * b.sp * dt;
      const gy = Math.max(W.floorY(b.x, b.z), W.WATER);
      b.y += ((gy + b.h + Math.sin(t * 1.7 + b.ph) * 0.3) - b.y) * Math.min(1, dt * 2);
      const flap = 0.75 + Math.sin(t * 13 + b.ph * 5) * 0.65;   // 0.1 … 1.4 rad: clearly flapping
      D.scale.setScalar(1); D.position.set(b.x, b.y, b.z);
      D.rotation.set(0, b.a, 0, 'YXZ'); D.updateMatrix(); bBody.setMatrixAt(i, D.matrix);
      D.rotation.set(0, b.a, flap, 'YXZ'); D.updateMatrix(); bL.setMatrixAt(i, D.matrix);
      D.rotation.set(0, b.a, -flap, 'YXZ'); D.updateMatrix(); bR.setMatrixAt(i, D.matrix);
      const k = 1 - Math.min(0.5, (b.y - gy) * 0.2);
      D.position.set(b.x, gy + 0.04, b.z); D.rotation.set(0, 0, 0); D.scale.set(k, 1, k); D.updateMatrix(); bShadow.setMatrixAt(i, D.matrix);
    }
    for (const f of flocks) { if (re && (f.y < -50 || Math.hypot(f.x - c.x, f.z - c.z) > 36 || (f.t += 0.25) > 50)) spawnF(f, c); f.a += f.w * dt; }
    for (let i = 0; i < NG; i++) {
      const g = gs[i], f = flocks[g.flock];
      if (f.y < -50) { hide(GM, i); continue; }
      // loose V: the leader flies the loop, the two others trail behind on either side
      const lx = f.x + Math.cos(f.a) * f.r, lz = f.z + Math.sin(f.a) * f.r;
      let dx = -Math.sin(f.a) * f.w, dz = Math.cos(f.a) * f.w; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const side = g.k === 0 ? 0 : (g.k === 1 ? -1 : 1), back = g.k === 0 ? 0 : 1.4;
      const x = lx - dx * back + dz * side * 1.2, z = lz - dz * back - dx * side * 1.2, y = f.y + Math.sin(t * 0.8 + g.k) * 0.3 - back * 0.15;
      const head = Math.atan2(dx, dz);
      const fl = (Math.sin(t * 0.7 + g.k * 2 + g.flock) > 0.2) ? Math.sin(t * 10 + g.k) * 0.6 : 0.1;
      const col = f.gull ? GULL : GCOL[((Math.floor(f.x) % GCOL.length) + GCOL.length) % GCOL.length];   // one colour per flock
      gBody.setColorAt(i, col); gHead.setColorAt(i, col); gL.setColorAt(i, col); gR.setColorAt(i, col);
      D.scale.setScalar(f.gull ? 1.0 : 0.8); D.position.set(x, y, z);
      D.rotation.set(0, head, -0.2 * Math.sign(f.w), 'YXZ'); D.updateMatrix(); gBody.setMatrixAt(i, D.matrix); gHead.setMatrixAt(i, D.matrix); gBeak.setMatrixAt(i, D.matrix);
      D.rotation.set(0, head, fl, 'YXZ'); D.updateMatrix(); gL.setMatrixAt(i, D.matrix);
      D.rotation.set(0, head, -fl, 'YXZ'); D.updateMatrix(); gR.setMatrixAt(i, D.matrix);
    }
    for (const m of BM.concat(GM)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  });
  W.ambient = { butterflies: bs, flocks, meshes: BM.concat(GM) };
})();

/* debug helpers */
F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.region = () => W.region(F.Player.pos.x, F.Player.pos.z);
  F.dbg.goRegion = (nameOrKind) => {
    for (let R = 1; R <= 9; R++) for (let j = -R; j <= Math.min(2, R); j++) for (let i = -R; i <= R; i++) {
      const c = cell(i, j); if (c.sea) continue;
      if (c.name === nameOrKind || c.biome === nameOrKind || c.kind === nameOrKind || c.landmark === nameOrKind || c.realm === nameOrKind) { const L = lay(c); const g = c.kind === 'kongeslott' && F.Realm.gate(c.realm); const p = g ? [g.x, g.z + 6] : c.kind === 'village' ? [c.x + 4, c.z + 10] : [c.x + 2, c.z + 8]; void L; F.dbg.teleport(p[0], p[1]); return regionRecord(c); }
    }
    return null;
  };
  F.dbg.worldStats = () => Object.assign({}, W.stats, { loaded: W.chunks.size, queue: W.queue.length });
});
})();
