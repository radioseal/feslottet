/* Feslottet – MODELS-3: village buildings, street furniture and kingdom landmarks. Front = +z, origin = bottom centre.
   v_hus{style:'a'|'b'|'c'|'d'|'e'|'f', roof, wall, fl (flower-box colour), door:true, flowers:true}  (= house)  1/8 m, footprint ≤ 4.75 × 4 m.
        v_hus_lo = same at 1/4 m (≈5k instead of ≈17k triangles) for dense villages. Part 'door' (hinge on its left edge,
        open = rotation.y −1.6). meta.anchors (metres): door [x,y,z] = door foot centre, plaque = where the HTML house-number plaque goes.
        Styles: a cottage · b tall townhouse · c round tower house · d half-timbered · e red Norwegian wooden house · f mint hip-roof cottage.
   v_husdor  stand-alone door (frame + part 'door') for a house built with {door:false}
   v_markedsbod{awning} (= stall)  market stall, parts 'awning', 'goods'   v_bronn (parts 'bucket', 'crank')   v_fontene (part 'jet')
   v_gjerde (2 m fence)  v_grind (part 'gate')  v_postkasse (parts 'flag', 'door')  v_veiskilt{arms:'NESW'} (post + part 'arms'; HTML plaques
        go at meta.boards)  v_skiltarm (one board pointing +x)  v_benk  v_lyktestolpe (part 'light')  v_oppslagstavle (part 'notes')
   v_trillebar (parts 'wheel', 'load')  v_vindspill (parts t0..t3)  v_piknik (parts pot, cup1..cup3)  v_skattkiste (part 'lid')  v_tallstolpe (part 'plate')
   v_bro (arched bridge 4 m)  v_strandhytte (part 'door')  v_seilbat (part 'sail')  v_vannhjul (part 'wheel')
   Landmarks: n_molle (windmill, part 'sails')  v_fyrtarn (lighthouse, part 'beam')  v_pariserhjul (part 'wheel')  v_luftballong (part 'balloon')
              v_isslott (ice castle)  v_regnbuebro (rainbow bridge)  v_dyrepark (petting-farm gate)  v_karusell (part 'rotor') */
(function () {
'use strict';
const F = window.F, V = F.VOX, K = () => F.M3K;
// a lighter tint of a roof colour for the tile-row highlights (derived from the palette name, registered once; reads softer than white)
function lightOf(name) {
  const key = name + '_L'; if (F.PAL[key] != null) return key;
  const base = F.PAL[name] != null ? F.PAL[name] : F.PAL.roofRed;
  let h = new THREE.Color(base).lerp(new THREE.Color(F.PAL.white), 0.38).getHex(); const used = new Set(Object.values(F.PAL)); while (used.has(h)) h ^= 1;
  F.PAL[key] = h; return key;
}
const H = (x, y, z, s) => F.U.hash2(x * 73 + z * 19, y * 31 + z, s || 1);
const def = (id, d) => { if (!V.has(id)) V.def(id, d); };

/* ------------------------------------------------------------------ houses (1/8) */
const STYLES = {
  a: { wall: 'cream', roof: 'roofRed', W: 36, D: 28, Hw: 20, roofT: 'gx', trim: 'white', door: 'woodRed' },
  b: { wall: 'peach', roof: 'roofLilac', W: 28, D: 26, Hw: 32, roofT: 'gz', trim: 'white', door: 'teal' },
  c: { wall: 'butter', roof: 'roofBlue', W: 32, D: 32, Hw: 24, roofT: 'cone', trim: 'white', door: 'woodRed' },
  d: { wall: 'cream2', roof: 'roofPink', W: 38, D: 28, Hw: 22, roofT: 'gx', trim: 'woodDark', door: 'woodDark', timber: true },
  e: { wall: 'woodRed', roof: 'roofMint', W: 36, D: 28, Hw: 20, roofT: 'gx', trim: 'white', door: 'butter', planks: true },
  f: { wall: 'mint', roof: 'roofPink', W: 34, D: 30, Hw: 20, roofT: 'hip', trim: 'white', door: 'coral' },
};
const HX = 44, HZ = 40, HY = 56;
function houseDims(o) { const S = STYLES[o.style] || STYLES.a; const x0 = Math.floor((HX - S.W) / 2), z0 = Math.floor((HZ - S.D) / 2); return { S, x0, x1: x0 + S.W - 1, z0, z1: z0 + S.D - 1, cx: HX / 2 }; }
let FL = null; // flower-box colour for the current build (o.fl)
function windowAt(v, x, y, z, w, h, trim, box, side) {
  // front window (z = face plane), glass + cross + frame, optional flower box below
  v.box(x - 1, y - 1, z, x + w, y + h, z, trim);
  v.box(x, y, z, x + w - 1, y + h - 1, z, 'glass');
  if (w >= 4) v.box(x + Math.floor(w / 2) - (w % 2 ? 0 : 1), y, z, x + Math.floor(w / 2) - (w % 2 ? 0 : 1), y + h - 1, z, trim);
  if (h >= 5) v.box(x, y + Math.floor(h / 2), z, x + w - 1, y + Math.floor(h / 2), z, trim);
  if (box) {
    const dz = side || 1;
    v.box(x - 1, y - 3, z + dz, x + w, y - 2, z + dz, 'woodRed');
    for (let i = x - 1; i <= x + w; i++) { v.set(i, y - 1, z + dz, H(i, y, z, 4) < 0.5 ? 'leaf' : 'leaf2'); if (H(i, y, z, 2) < 0.55) v.set(i, y, z + dz, (FL ? [FL, 'white', FL, 'butter'] : ['rose', 'butter', 'white', 'pink', 'lilac'])[(i + y) % (FL ? 4 : 5)]); }
  }
}
function sideWindow(v, x, y, z, w, h, trim) { v.box(x, y - 1, z - 1, x, y + h, z + w, trim); v.box(x, y, z, x, y + h - 1, z + w - 1, 'glass'); }
function house(v, o) {
  FL = o.fl && F.PAL[o.fl] != null ? o.fl : null;
  const { S, x0, x1, z0, z1, cx } = houseDims(o);
  const wall = o.wall || S.wall, roof = o.roof || S.roof, trim = S.trim;
  const Hw = S.Hw;
  // foundation + walls
  if (S.roofT === 'cone') {
    const r = S.W / 2 - 0.5, ccx = cx - 0.5, ccz = (z0 + z1) / 2;
    v.cyl(ccx, 0, ccz, r + 0.6, 2, 'stoneDark'); v.cyl(ccx, 2, ccz, r, Hw - 2, wall);
    for (let i = 0; i < 16; i++) { const rr = r + 2.5 - i * (r + 2.5) / 15; v.cyl(ccx, Hw + i, ccz, Math.max(0.4, rr), 1, i % 4 === 0 ? lightOf(roof) : roof); }
    v.cyl(ccx, Hw + 16, ccz, 0.6, 3, 'gold');
    // front windows on the curved wall
    const zf = Math.round(ccz + r);
    windowAt(v, ccx - 9, 12, zf - 2, 4, 5, trim, o.flowers !== false, 1); windowAt(v, ccx + 6, 12, zf - 2, 4, 5, trim, o.flowers !== false, 1);
    for (const wx of [-7, 3]) { const zw = Math.floor(ccz - Math.sqrt(r * r - (wx + 2) ** 2)) - 1; windowAt(v, Math.round(ccx + wx), 12, zw, 4, 5, trim, o.flowers !== false, -1); }
    v.box(ccx - 4, 2, zf, ccx + 3, 18, zf, trim); v.clear(ccx - 3, 2, zf, ccx + 2, 17, zf); v.box(ccx - 3, 2, zf - 1, ccx + 2, 17, zf - 1, 'woodDark');
    v.box(ccx - 4, 0, zf, ccx + 3, 1, zf + 3, 'pathStone');
    return { doorX: ccx - 3, doorZ: zf, doorTop: 17, front: zf };
  }
  v.box(x0 - 1, 0, z0 - 1, x1 + 1, 1, z1 + 1, 'stoneDark');
  v.box(x0, 2, z0, x1, Hw, z1, wall);
  if (S.planks) for (let y = 3; y <= Hw; y += 2) v.paint((x, yy, z, c) => (yy === y && c === F.col(wall) && (z === z1 || z === z0 || x === x0 || x === x1) ? 'roofRed' : null));
  if (S.timber) { for (let x = x0; x <= x1; x += 6) v.box(x, 2, z1, x, Hw, z1, trim); v.box(x0, Hw, z1, x1, Hw, z1, trim); v.box(x0, 12, z1, x1, 12, z1, trim); for (let x = x0; x + 6 <= x1; x += 12) v.line(x, 13, z1, x + 6, Hw - 1, z1, trim); }
  // corner trims
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) v.box(x, 2, z, x, Hw, z, trim);
  // roof
  const ov = 2;
  if (S.roofT === 'gx' || S.roofT === 'hip') {
    const half = Math.ceil(S.D / 2) + ov;
    for (let i = 0; i <= half; i++) {
      const za = z0 - ov + i, zb = z1 + ov - i; if (za > zb) break;
      const xa = S.roofT === 'hip' ? x0 - ov + i : x0 - ov, xb = S.roofT === 'hip' ? x1 + ov - i : x1 + ov;
      if (xa > xb) break;
      const y = Hw + 1 + i;
      v.box(xa, y, za, xb, y, zb, roof);
      if (i >= ov && S.roofT === 'gx') v.box(x0, y, za + 1, x1, y, zb - 1, wall); // gable fill
      if (i >= ov && S.roofT === 'gx') { v.box(x0 - ov, y, za, x0 - ov, y, zb, roof); v.box(x1 + ov, y, za, x1 + ov, y, zb, roof); }
      if (i % 3 === 0) { const lt = lightOf(roof); v.box(xa, y, za, xb, y, za, lt); v.box(xa, y, zb, xb, y, zb, lt); }
    }
    if (S.roofT === 'gx') { // gable end windows
      const gy = Hw + Math.floor(S.D / 4) + 1;
      v.box(x0 - ov, gy, Math.round((z0 + z1) / 2) - 1, x0 - ov, gy + 2, Math.round((z0 + z1) / 2), 'glass'); v.box(x1 + ov, gy, Math.round((z0 + z1) / 2) - 1, x1 + ov, gy + 2, Math.round((z0 + z1) / 2), 'glass');
    }
    // chimney
    v.box(x1 - 8, Hw + 4, z0 + 5, x1 - 5, Hw + Math.ceil(S.D / 2) + 4, z0 + 8, 'brick'); v.box(x1 - 9, Hw + Math.ceil(S.D / 2) + 4, z0 + 4, x1 - 4, Hw + Math.ceil(S.D / 2) + 4, z0 + 9, 'stoneDark');
  } else if (S.roofT === 'gz') {
    const half = Math.ceil(S.W / 2) + ov;
    for (let i = 0; i <= half; i++) {
      const xa = x0 - ov + i, xb = x1 + ov - i; if (xa > xb) break;
      const y = Hw + 1 + i;
      v.box(xa, y, z0 - ov, xb, y, z1 + ov, roof);
      if (i >= ov) v.box(xa + 1, y, z0, xb - 1, y, z1, wall);
      if (i >= ov) v.box(xa + 1, y, z1 + 1, xb - 1, y, z1 + 1, wall);
    }
    v.box(cx - 2, Hw + 6, z1 + 1, cx + 1, Hw + 9, z1 + 1, 'glass'); v.box(cx - 3, Hw + 5, z1 + 1, cx + 2, Hw + 5, z1 + 1, trim);
  }
  // front: door + windows + flower boxes
  const dx = Math.round(cx) - 4, zf = z1;
  v.box(dx - 1, 2, zf + 1, dx + 8, 17, zf + 1, trim); v.clear(dx, 2, zf + 1, dx + 7, 16, zf + 1);
  v.box(dx, 2, zf, dx + 7, 16, zf, 'woodDark');
  v.box(dx - 2, 0, zf + 1, dx + 9, 1, zf + 4, 'pathStone');
  const twoStorey = Hw >= 28;
  const wy = twoStorey ? 6 : 8;
  windowAt(v, x0 + 3, wy, zf + 1, 6, 6, trim, o.flowers !== false); windowAt(v, x1 - 8, wy, zf + 1, 6, 6, trim, o.flowers !== false);
  if (twoStorey) { windowAt(v, x0 + 3, 20, zf + 1, 6, 6, trim, o.flowers !== false); windowAt(v, x1 - 8, 20, zf + 1, 6, 6, trim, o.flowers !== false); windowAt(v, dx + 1, 22, zf + 1, 6, 5, trim, false); }
  // side windows
  sideWindow(v, x0 - 1, 8, Math.round((z0 + z1) / 2) - 3, 6, 6, trim); sideWindow(v, x1 + 1, 8, Math.round((z0 + z1) / 2) - 3, 6, 6, trim);
  // back: windows with flower boxes + a little garden door, so houses look nice from both sides of a street
  const zb = z0 - 1;
  windowAt(v, x0 + 3, wy, zb, 6, 6, trim, o.flowers !== false, -1); windowAt(v, x1 - 8, wy, zb, 6, 6, trim, o.flowers !== false, -1);
  if (twoStorey) { windowAt(v, x0 + 3, 20, zb, 6, 6, trim, o.flowers !== false, -1); windowAt(v, x1 - 8, 20, zb, 6, 6, trim, o.flowers !== false, -1); }
  v.box(dx + 1, 2, zb, dx + 6, 14, zb, trim); v.box(dx + 2, 2, zb, dx + 5, 13, zb, (STYLES[o.style] || STYLES.a).door); v.box(dx + 3, 9, zb, dx + 4, 11, zb, 'glass'); v.set(dx + 5, 7, zb - 1, 'gold');
  v.box(dx, 0, zb - 3, dx + 7, 1, zb - 1, 'pathStone');
  for (const x of [x0 + 1, x1 - 1]) { v.box(x, 2, zb - 2, x + 1, 4, zb - 1, 'leaf'); v.set(x, 5, zb - 1, 'rose'); v.set(x + 1, 5, zb - 2, 'butter'); }
  // lamp by the door
  v.set(dx + 9, 13, zf + 2, 'lamp'); v.set(dx + 9, 14, zf + 2, 'woodDark');
  return { doorX: dx, doorZ: zf + 1, doorTop: 16, front: zf + 1 };
}
function door(v, o, x, zf, top) {
  const dc = o.doorCol || (STYLES[o.style] || STYLES.a).door;
  v.box(x, 2, zf, x + 7, top, zf, dc);
  v.box(x + 1, 3, zf + 1, x + 6, 3, zf + 1, dc); // kick plate
  for (let y = 5; y < top - 1; y += 5) v.box(x + 1, y, zf, x + 6, y, zf, 'white');
  v.box(x + 2, top - 4, zf, x + 5, top - 2, zf, 'glass');
  v.set(x + 6, 9, zf + 1, 'gold');
  v.set(x + 3, top - 6, zf + 1, 'rose'); v.set(x + 4, top - 6, zf + 1, 'rose'); v.set(x + 3, top - 7, zf + 1, 'leaf'); v.set(x + 4, top - 7, zf + 1, 'leaf'); // little wreath
}
let LASTH = null;
function hDef(id) {
  def(id, {
    size: [HX, HY, HZ], scale: 1 / 8,
    build(v, o) { LASTH = house(v, o); },
    parts: { door: { get pivot() { return LASTH ? [LASTH.doorX, 2, LASTH.doorZ] : [18, 2, 35]; }, build(v, o) { if (o.door === false || !LASTH) return; door(v, o, LASTH.doorX, LASTH.doorZ, LASTH.doorTop); } } },
    meta: { group: 'house', gallery: ['a', 'b', 'c', 'd', 'e', 'f'].map(s => ({ style: s })),
      anchorsFor(o) { const g = { x: 0 }; const d = houseDims(o || {}); const dz = (((o && o.style) === 'c') ? (HZ / 2 + (d.S.W / 2 - 0.5) - HZ / 2) : (d.z1 + 1 - HZ / 2)) / 8; return { door: [0, 0, dz + 0.2], plaque: [0.75, 2.3, dz + 0.15] }; } },
  });
}
hDef('v_hus'); hDef('house');
def('v_husdor', {
  size: [12, 20, 4], scale: 1 / 8,
  build(v) { v.box(1, 0, 1, 10, 18, 1, 'white'); v.clear(2, 0, 1, 9, 16, 1); v.box(0, 0, 2, 11, 0, 3, 'pathStone'); },
  parts: { door: { pivot: [2, 0, 1], build(v) { const g = { style: 'a' }; for (let y = 0; y <= 14; y++) v.box(2, y, 1, 9, y, 1, y % 5 === 3 ? 'white' : 'woodRed'); v.box(4, 11, 1, 7, 13, 1, 'glass'); v.set(8, 7, 2, 'gold'); } } },
  meta: { group: 'house' },
});

/* ------------------------------------------------------------------ market stall / well / fountain */
const AWN = { rose: ['rose', 'white'], mint: ['mint', 'white'], sky: ['sky', 'white'], butter: ['butter', 'white'], lilac: ['lilac', 'white'], coral: ['coral', 'cream'] };
function stall(v, o) {
  // counter 2.4 m wide
  v.box(2, 0, 10, 25, 9, 15, 'woodLight'); v.box(1, 9, 9, 26, 10, 16, 'wood');
  for (let x = 3; x <= 24; x += 3) v.box(x, 1, 16, x, 8, 16, 'woodDark');
  for (const x of [2, 25]) { v.box(x, 0, 2, x, 24, 3, 'wood'); v.box(x, 10, 14, x, 24, 15, 'wood'); }
  v.box(2, 0, 2, 25, 8, 3, 'woodLight');
  v.box(4, 10, 11, 23, 10, 14, 'cream'); // display shelf
}
function awning(v, o) {
  const [a, b] = AWN[o.awning] || AWN.rose;
  for (let z = 0; z <= 19; z++) { const y = 25 - Math.floor(z / 2.5); for (let x = 0; x <= 27; x++) v.set(x, y, z, Math.floor(x / 3) % 2 ? a : b); }
  for (let x = 0; x <= 27; x++) if (x % 3 !== 1) v.set(x, 17, 19, Math.floor(x / 3) % 2 ? a : b); // scalloped edge
  v.box(0, 26, 0, 27, 26, 1, a);
}
function goods(v, o) {
  const r = F.U.rng(F.U.hashStr(String(o.awning || 'rose')));
  for (let x = 5; x <= 22; x += 3) { const k = Math.floor(r() * 4); if (k === 0) { v.sphere(x, 12, 12.5, 1.2, 'red'); v.set(x, 13, 12, 'leaf'); } else if (k === 1) { v.box(x - 1, 11, 12, x, 12, 13, 'woodLight'); v.set(x, 13, 12, 'butter'); } else if (k === 2) { v.line(x, 11, 13, x, 13, 13, 'green'); v.set(x, 14, 13, F.U.pick(r, ['rose', 'butter', 'lilac'])); } else { v.box(x - 1, 11, 12, x, 13, 13, 'gGold'); v.box(x - 1, 11, 12, x, 11, 13, 'honey'); } }
}
def('v_markedsbod', { size: [28, 28, 20], scale: 1 / 10, build: stall, parts: { awning: { pivot: [14, 25, 10], build: awning }, goods: { pivot: [14, 11, 12], build: goods } }, meta: { group: 'stall', gallery: Object.keys(AWN).map(k => ({ awning: k })), shelf: [0, 1.1, 0.25] } });
def('stall', { size: [28, 28, 20], scale: 1 / 10, build: stall, parts: { awning: { pivot: [14, 25, 10], build: awning }, goods: { pivot: [14, 11, 12], build: goods } }, meta: { group: 'stall' } });
def('v_bronn', {
  size: [18, 26, 18], scale: 1 / 10,
  build(v) {
    v.cyl(8.5, 0, 8.5, 6.5, 7, 'stone'); v.cyl(8.5, 1, 8.5, 5.2, 7, 0); v.cyl(8.5, 1, 8.5, 5.2, 4, 'water');
    v.paint((x, y, z, c) => (c === F.col('stone') && H(x, y, z, 2) < 0.3 ? 'stone2' : null));
    v.cyl(8.5, 7, 8.5, 6.8, 1, 'stoneDark'); v.cyl(8.5, 7, 8.5, 5.2, 1, 0);
    for (const x of [2, 15]) v.box(x, 8, 8, x, 19, 9, 'wood');
    for (let i = 0; i < 10; i++) { const y = 19 + Math.floor(i * 0.7); v.box(0 + i, y, 3, 17 - i, y, 14, i < 9 ? 'roofRed' : 'woodRed'); if (i > 6) break; }
    v.box(2, 16, 8, 15, 16, 9, 'woodDark');
  },
  parts: {
    bucket: { pivot: [9, 15, 9], build(v) { v.line(8, 15, 8, 8, 12, 8, 'grey'); v.box(7, 9, 7, 10, 11, 10, 'woodLight'); v.box(7, 11, 7, 10, 11, 10, 'woodDark'); v.box(8, 10, 8, 9, 11, 9, 'water'); } },
    crank: { pivot: [16, 16, 9], build(v) { v.box(16, 16, 8, 17, 16, 9, 'grey'); v.box(17, 13, 8, 17, 16, 8, 'grey'); v.set(17, 13, 7, 'woodRed'); } },
  },
  meta: { group: 'village' },
});
def('v_fontene', {
  size: [24, 22, 24], scale: 1 / 10,
  build(v) {
    v.cyl(11.5, 0, 11.5, 11, 4, 'stone'); v.cyl(11.5, 1, 11.5, 9.8, 4, 0); v.cyl(11.5, 1, 11.5, 9.8, 2, 'water');
    v.cyl(11.5, 3, 11.5, 2, 8, 'stone2'); v.cyl(11.5, 10, 11.5, 5.5, 2, 'stone'); v.cyl(11.5, 11, 11.5, 4.5, 1, 'water');
    v.cyl(11.5, 12, 11.5, 1.2, 3, 'stone2');
    K().ring(v, 11.5, 3, 11.5, 10.5, i => (i % 4 === 0 ? 'stone2' : 'stone'));
  },
  parts: { jet: { pivot: [12, 14, 12], build(v) {
    v.cyl(11.5, 15, 11.5, 0.8, 4, 'sky'); v.set(11, 19, 11, 'white');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; for (let k = 0; k < 6; k++) { const r = 1 + k * 1.3, y = 18 - Math.round(k * k * 0.32); v.set(Math.round(11.5 + Math.cos(a) * r), y, Math.round(11.5 + Math.sin(a) * r), k > 3 ? 'gAqua' : 'sky'); } }
  } } },
  meta: { group: 'village' },
});

/* ------------------------------------------------------------------ fences, posts, signs, benches, lamps */
def('v_gjerde', { size: [20, 10, 4], scale: 1 / 10, build(v, o) { const c = o.col || 'white'; for (let x = 1; x < 20; x += 4) { v.box(x, 0, 1, x + 1, 8, 2, c); v.set(x, 9, 1, c); v.set(x + 1, 9, 2, c); } v.box(0, 3, 1, 19, 3, 1, c); v.box(0, 6, 1, 19, 6, 1, c); }, meta: { group: 'village', gallery: [{}, { col: 'woodLight' }] } });
def('v_grind', {
  size: [24, 12, 4], scale: 1 / 10,
  build(v) { for (const x of [0, 22]) { v.box(x, 0, 1, x + 1, 10, 2, 'woodDark'); v.box(x, 11, 1, x + 1, 11, 2, 'butter'); } },
  parts: { gate: { pivot: [2, 0, 1.5], build(v) { for (let x = 3; x < 21; x += 3) v.box(x, 1, 1, x, 8, 1, 'white'); v.box(2, 3, 1, 21, 3, 1, 'white'); v.box(2, 7, 1, 21, 7, 1, 'white'); v.line(3, 3, 1, 20, 7, 1, 'white'); v.set(20, 5, 2, 'grey'); } } },
  meta: { group: 'village' },
});
def('v_postkasse', {
  size: [12, 22, 12], scale: 1 / 16,
  build(v) { v.box(5, 0, 5, 6, 11, 6, 'woodDark'); v.box(1, 12, 2, 10, 19, 10, 'red'); v.box(2, 20, 2, 9, 20, 10, 'red'); v.box(3, 21, 2, 8, 21, 10, 'red'); v.box(4, 15, 10, 7, 15, 10, 'gold'); v.box(3, 17, 10, 8, 17, 10, 'black'); v.box(0, 18, 4, 0, 18, 6, 'white');
    v.box(3, 21, 2, 8, 21, 10, 'roofRed'); v.box(4, 22, 3, 7, 22, 9, 'roofRed'); // little roof
    for (const [x, z, k] of [[3, 7, 'rose'], [8, 6, 'butter'], [4, 4, 'lilac'], [7, 8, 'white'], [2, 5, 'pink']]) { v.set(x, 0, z, 'leaf2'); v.set(x, 1, z, 'leaf'); v.set(x, 2, z, k); } },
  parts: {
    flag: { pivot: [11, 13, 6], build(v) { v.box(11, 13, 6, 11, 21, 6, 'butter'); v.box(11, 19, 7, 11, 21, 9, 'butter'); } },
    door: { pivot: [5, 12, 11], build(v) { v.box(2, 12, 11, 9, 19, 11, 'red'); v.box(4, 15, 11, 7, 16, 11, 'gold'); } },
  },
  meta: { group: 'village' },
});
// signpost: arms 'NESW' subset. Boards point away from the post along ±x / ±z; HTML plaques at meta.boards[dir].
const ARM = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
def('v_veiskilt', {
  size: [40, 34, 40], scale: 1 / 10,
  build(v, o) {
    v.box(19, 0, 19, 20, 30, 20, 'wood'); v.box(18, 31, 18, 21, 31, 21, 'roofRed'); v.box(19, 32, 19, 20, 32, 20, 'gold');
  },
  parts: { arms: { pivot: [20, 20, 20], build(v, o) {
    const arms = (o.arms || 'NESW').split('');
    arms.forEach((d, i) => {
      const [dx, dz] = ARM[d] || ARM.E, y = 26 - i * 4;
      const col = ['butter', 'mint', 'peach', 'sky'][i % 4];
      if (dx) { const xa = dx > 0 ? 21 : 2, xb = dx > 0 ? 37 : 18; v.box(xa, y, 19, xb, y + 2, 20, col); v.set(dx > 0 ? 38 : 1, y + 1, 19, col); v.set(dx > 0 ? 38 : 1, y + 1, 20, col); v.box(xa, y - 1, 19, xb, y - 1, 20, 'woodDark'); }
      else { const za = dz > 0 ? 21 : 2, zb = dz > 0 ? 37 : 18; v.box(19, y, za, 20, y + 2, zb, col); v.set(19, y + 1, dz > 0 ? 38 : 1, col); v.set(20, y + 1, dz > 0 ? 38 : 1, col); v.box(19, y - 1, za, 20, y - 1, zb, 'woodDark'); }
    });
  } } },
  meta: { group: 'sign', boards: { N: [0, 2.7, -1.1], E: [1.1, 2.7, 0], S: [0, 2.7, 1.1], W: [-1.1, 2.7, 0] }, gallery: [{ arms: 'NESW' }, { arms: 'EW' }] },
});
def('v_skiltarm', { size: [20, 4, 3], scale: 1 / 10, build(v, o) { const c = o.col || 'butter'; v.box(0, 0, 1, 17, 2, 1, c); v.set(18, 1, 1, c); v.box(0, 0, 0, 1, 2, 2, 'wood'); }, meta: { group: 'sign' } });
def('v_benk', {
  size: [20, 12, 10], scale: 1 / 10,
  build(v, o) { const c = o.col || 'woodLight'; for (const x of [1, 17]) { v.box(x, 0, 2, x + 1, 4, 3, 'grey'); v.box(x, 0, 6, x + 1, 4, 7, 'grey'); v.box(x, 5, 1, x + 1, 11, 2, 'grey'); } v.box(0, 5, 2, 19, 5, 8, c); v.box(0, 7, 1, 19, 8, 1, c); v.box(0, 10, 1, 19, 11, 1, c); for (let x = 0; x < 20; x += 5) v.set(x, 5, 8, 'wood'); },
  meta: { group: 'village', gallery: [{}, { col: 'mint' }, { col: 'rose' }] },
});
def('v_lyktestolpe', {
  size: [8, 36, 8], scale: 1 / 10,
  build(v, o) { const c = o.col || 'navySoft'; v.box(2, 0, 2, 5, 2, 5, c); v.box(3, 3, 3, 4, 28, 4, c); v.box(2, 12, 2, 5, 12, 5, c); v.box(2, 29, 2, 5, 29, 5, c); v.box(1, 34, 1, 6, 34, 6, c); v.box(2, 35, 2, 5, 35, 5, c); for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6]]) v.box(x, 30, z, x, 33, z, c);
    // a cross-arm with two hanging flower baskets
    v.box(0, 25, 3, 7, 25, 4, c); v.set(0, 26, 3, c); v.set(7, 26, 3, c);
    for (const x of [0, 6]) { v.set(x + (x ? 1 : 0), 24, 3, 'woodDark'); v.box(x, 20, 2, x + 1, 22, 5, 'woodLight'); v.box(x, 23, 2, x + 1, 23, 5, 'leaf2'); v.set(x, 23, 2, 'rose'); v.set(x + 1, 23, 4, 'butter'); v.set(x, 23, 5, 'pink'); v.set(x + 1, 19, 3, 'leaf'); }
    for (const [x, z, k] of [[1, 1, 'rose'], [6, 5, 'butter'], [1, 6, 'lilac']]) { v.set(x, 0, z, 'leaf2'); v.set(x, 1, z, k); } },
  parts: { light: { pivot: [4, 30, 4], build(v) { v.box(2, 30, 2, 5, 33, 5, 'lamp'); } } },
  meta: { group: 'village', glow: true },
});
def('v_oppslagstavle', {
  size: [22, 24, 6], scale: 1 / 10,
  build(v) { for (const x of [1, 19]) v.box(x, 0, 2, x + 1, 20, 3, 'wood'); v.box(1, 6, 2, 20, 19, 2, 'woodLight'); v.box(0, 20, 1, 21, 21, 4, 'roofRed'); v.box(2, 7, 3, 19, 18, 3, 'cream2'); },
  parts: { notes: { pivot: [11, 12, 4], build(v) { for (const [x, y, c] of [[3, 13, 'white'], [9, 14, 'butter'], [14, 12, 'mint'], [4, 8, 'peach'], [11, 8, 'white'], [16, 8, 'sky']]) { v.box(x, y, 4, x + 3, y + 3, 4, c); v.set(x + 1, y + 3, 5, 'red'); } } } },
  meta: { group: 'learn', note: [0, 1.25, 0.45] },
});
def('v_trillebar', {
  size: [12, 12, 22], scale: 1 / 10,
  build(v) { v.box(1, 4, 6, 10, 8, 17, 'red'); v.box(2, 5, 7, 9, 8, 16, 0); v.box(2, 4, 7, 9, 4, 16, 'woodRed'); for (const x of [3, 8]) { v.line(x, 4, 7, x, 0, 6, 'grey'); v.line(x, 6, 17, x, 7, 21, 'woodDark'); } },
  parts: {
    wheel: { pivot: [6, 3, 4], build(v) { for (let y = 0; y < 7; y++) for (let z = 1; z < 8; z++) if (Math.hypot(y - 3, z - 4) <= 3.2) v.box(5, y, z, 6, y, z, Math.hypot(y - 3, z - 4) > 2.2 ? 'black' : 'grey'); } },
    load: { pivot: [6, 8, 12], build(v) { v.sphere(4, 9.5, 10, 2.4, 'orange'); v.sphere(7.5, 9.5, 13.5, 2.6, 'orange'); v.sphere(5, 10, 15, 1.8, 'orange'); for (const [x, z] of [[4, 10], [7, 13], [5, 15]]) v.set(x, 12, z, 'green'); K().speck(v, 'orange', 'honey', 0.15, 3); } },
  },
  meta: { group: 'farm' },
});
def('v_vindspill', {
  size: [16, 30, 12], scale: 1 / 16,
  build(v) { v.box(7, 0, 5, 8, 26, 6, 'wood'); v.box(5, 0, 3, 10, 1, 8, 'stone2'); v.box(1, 26, 4, 14, 26, 7, 'woodRed'); v.box(3, 27, 4, 12, 27, 7, 'woodRed'); v.box(6, 28, 5, 9, 28, 6, 'rose'); v.set(7, 29, 5, 'gold'); },
  parts: Object.fromEntries([2, 5, 10, 13].map((x, i) => ['t' + i, { pivot: [x + 0.5, 25, 5.5], build(v) { const cols = ['sky', 'lilac', 'mint', 'pink']; v.line(x, 25, 5, x, 21, 5, 'white'); v.box(x, 21 - 6 - i * 2, 5, x, 20, 6, cols[i]); v.set(x, 21 - 7 - i * 2, 5, 'gold'); if (i === 1) { v.box(7, 12, 5, 8, 13, 6, 'gold'); v.line(7, 25, 5, 7, 14, 5, 'white'); } } }])),
  meta: { group: 'village' },
});
def('v_piknik', {
  size: [26, 8, 22], scale: 1 / 16,
  build(v) { for (let z = 0; z < 22; z++) for (let x = 0; x < 26; x++) v.set(x, 0, z, (Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? 'red' : 'white'); v.box(17, 1, 3, 23, 4, 8, 'woodLight'); v.box(17, 5, 5, 23, 5, 6, 'woodDark'); v.line(18, 6, 5, 22, 6, 5, 'woodDark'); v.box(4, 1, 14, 9, 1, 19, 'white'); v.sphere(6.5, 2.5, 16.5, 1.6, 'red'); v.box(3, 1, 4, 5, 1, 6, 'butter'); },
  parts: {
    pot: { pivot: [14, 1, 8], build(v) { v.box(13, 1, 7, 15, 3, 9, 'white'); v.set(16, 3, 8, 'white'); v.set(12, 2, 8, 'white'); v.set(14, 4, 8, 'rose'); v.set(14, 2, 10, 'rose'); } },
    cup1: { pivot: [11, 1, 10], build(v) { v.box(11, 1, 10, 12, 2, 11, 'rose'); v.set(13, 2, 10, 'rose'); v.set(11, 2, 10, 'woodRed'); } },
    cup2: { pivot: [14, 1, 13], build(v) { v.box(14, 1, 13, 15, 2, 14, 'sky'); v.set(16, 2, 13, 'sky'); } },
    cup3: { pivot: [10, 1, 15], build(v) { v.box(10, 1, 15, 11, 2, 16, 'mint'); v.set(12, 2, 15, 'mint'); } },
  },
  meta: { group: 'village' },
});
def('v_skattkiste', {
  size: [16, 14, 12], scale: 1 / 16,
  build(v) { v.box(1, 0, 1, 14, 7, 10, 'woodRed'); for (const x of [1, 7, 14]) v.box(x, 0, 1, x, 7, 10, 'gold'); v.box(1, 0, 10, 14, 0, 10, 'gold'); v.box(6, 4, 11, 9, 7, 11, 'gold'); v.box(7, 5, 11, 8, 6, 11, 'woodDark'); },
  parts: { lid: { pivot: [8, 8, 1], build(v) { for (let z = 1; z <= 10; z++) { const h = Math.round(Math.sqrt(Math.max(0, 1 - ((z - 5.5) / 5) ** 2)) * 3); v.box(1, 8, z, 14, 8 + h, z, 'woodRed'); v.set(1, 8 + h, z, 'gold'); v.set(14, 8 + h, z, 'gold'); v.set(7, 8 + h, z, 'gold'); } v.box(6, 8, 11, 9, 9, 11, 'gold'); } } },
  meta: { group: 'learn', lock: [0, 0.4, 0.75] },
});
def('v_tallstolpe', { // a fallen house-number plate leaning on a little post
  size: [14, 16, 8], scale: 1 / 16,
  build(v) { v.box(6, 0, 3, 7, 13, 4, 'wood'); v.box(5, 0, 2, 8, 1, 5, 'grassDark'); },
  parts: { plate: { pivot: [7, 1, 6], build(v) { v.box(1, 1, 6, 12, 9, 6, 'navySoft'); v.box(2, 2, 7, 11, 8, 7, 'white'); v.box(1, 1, 5, 12, 1, 5, 'navySoft'); } } },
  meta: { group: 'learn', plaque: [0, 0.35, 0.5] },
});

/* ------------------------------------------------------------------ water & coast */
def('v_bro', { // arched wooden footbridge, 4 m along z, 2 m wide
  size: [22, 14, 40], scale: 1 / 10,
  build(v) {
    for (let z = 0; z < 40; z++) { const y = Math.round(Math.sin(z / 39 * Math.PI) * 6); v.box(2, y, z, 19, y + 1, z, z % 4 === 0 ? 'wood' : 'woodLight'); if (z % 5 === 0) for (const x of [2, 19]) v.box(x, y + 2, z, x, y + 6, z, 'woodRed'); v.set(2, y + 6, z, 'white'); v.set(19, y + 6, z, 'white'); }
    for (const z of [3, 36]) for (const x of [3, 18]) v.box(x, 0, z, x, 2, z, 'woodDark');
  },
  meta: { group: 'water', walk: 'arch', length: 4, width: 2, peak: 0.8 },
});
def('v_strandhytte', {
  size: [24, 36, 22], scale: 1 / 8,
  build(v, o) {
    const c = o.col || 'sky';
    v.box(1, 0, 1, 22, 2, 20, 'woodLight');
    v.box(3, 3, 3, 20, 22, 18, 'white');
    for (let x = 3; x <= 20; x += 3) v.box(x, 3, 3, x + 1, 22, 18, c);
    v.clear(4, 4, 4, 19, 22, 17);
    for (let i = 0; i < 9; i++) v.box(2 + i, 23 + i, 2, 21 - i, 23 + i, 19, i % 2 ? 'white' : 'roofRed');
    v.box(9, 3, 18, 14, 15, 18, 'woodDark'); v.box(5, 12, 18, 7, 16, 18, 'glass'); v.box(16, 12, 18, 18, 16, 18, 'glass');
    v.box(9, 0, 19, 14, 0, 21, 'woodLight');
  },
  parts: { door: { pivot: [9, 3, 19], build(v) { v.box(9, 3, 19, 14, 15, 19, 'butter'); v.set(13, 9, 20, 'gold'); v.box(10, 12, 19, 13, 14, 19, 'white'); } } },
  meta: { group: 'beach', gallery: [{}, { col: 'pink' }, { col: 'mint' }, { col: 'butter' }] },
});
def('v_seilbat', {
  size: [16, 40, 32], scale: 1 / 10,
  build(v) {
    for (let z = 2; z < 31; z++) { const t = (z - 2) / 28, w = Math.max(1, Math.round(6.5 * Math.pow(Math.sin(Math.PI * Math.min(0.999, t * 0.62 + 0.38 * (t < 0.5 ? t : t))), 0.6) * (t > 0.7 ? (1 - t) / 0.3 : 1))); const lift = t > 0.8 ? 1 : 0;
      v.box(8 - w, lift, z, 7 + w, 4 + lift, z, 'white'); v.box(8 - w, 4 + lift, z, 7 + w, 4 + lift, z, 'navySoft'); if (w > 1) v.box(9 - w, 1 + lift, z, 6 + w, 4 + lift, z, 0); v.box(8 - w, 0 + lift, z, 7 + w, 1 + lift, z, 'coral'); }
    v.box(3, 1, 4, 12, 1, 24, 'woodLight'); v.box(7, 1, 14, 8, 34, 15, 'woodLight'); v.box(4, 2, 8, 11, 2, 9, 'wood');
  },
  parts: { sail: { pivot: [8, 6, 15], build(v) {
    const cols = ['rose', 'white', 'butter', 'white', 'sky', 'white'];
    for (let y = 6; y < 34; y++) { // main sail behind the mast, bellied to +x so it shows from above
      const L = Math.min(12, Math.round((34 - y) * 0.42)), c = cols[Math.floor((y - 6) / 3) % 6];
      for (let k = 0; k <= L; k++) { const b = Math.round(Math.sin(Math.PI * k / Math.max(1, L)) * 3.2 * (0.35 + 0.65 * (34 - y) / 28)); v.box(8 + b - 1, y, 16 + k, 8 + b, y, 16 + k, c); }
      const L2 = Math.min(10, Math.round((34 - y) * 0.3)); // jib in front
      for (let k = 0; k <= L2; k++) { const b = Math.round(Math.sin(Math.PI * k / Math.max(1, L2)) * 2.2 * (34 - y) / 28); v.box(8 + b - 1, y, 13 - k, 8 + b, y, 13 - k, y % 4 < 2 ? 'wool' : 'peach'); }
    }
    v.box(7, 34, 15, 8, 34, 28, 'woodLight'); // boom shadow line on top
    v.box(7, 35, 14, 8, 37, 14, 'rose'); v.box(7, 35, 15, 9, 37, 17, 'rose'); v.box(7, 36, 18, 9, 36, 19, 'butter');
  } } },
  meta: { group: 'water' },
});
def('v_vannhjul', {
  size: [14, 30, 30], scale: 1 / 10,
  build(v) {
    for (const x of [0, 12]) { v.box(x, 0, 12, x + 1, 15, 17, 'stone2'); v.box(x, 0, 11, x + 1, 2, 18, 'stone'); v.set(x, 15, 12, 'stoneDark'); v.set(x + 1, 13, 17, 'grassDark'); }
    v.box(0, 15, 14, 13, 16, 15, 'woodDark');
    // splash where the paddles dip
    for (const [x, z] of [[3, 4], [6, 3], [9, 5], [4, 26], [8, 27], [10, 25]]) { v.set(x, 0, z, 'white'); v.set(x + 1, 1, z, 'ice'); }
  },
  parts: { wheel: { pivot: [7, 15, 15], build(v) {
    for (let y = 0; y < 30; y++) for (let z = 0; z < 30; z++) { const d = Math.hypot(y - 15, z - 15); if (d <= 13.6 && d > 12.2) { v.set(3, y, z, 'woodRed'); v.set(10, y, z, 'woodRed'); } }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, y = Math.round(15 + Math.sin(a) * 13), z = Math.round(15 + Math.cos(a) * 13);
      v.box(3, y, z, 10, y, z, i % 2 ? 'sky' : 'butter'); v.box(3, Math.round(15 + Math.sin(a) * 11.6), Math.round(15 + Math.cos(a) * 11.6), 10, Math.round(15 + Math.sin(a) * 11.6), Math.round(15 + Math.cos(a) * 11.6), i % 2 ? 'sky' : 'butter');
      v.line(3, 15, 15, 3, Math.round(15 + Math.sin(a) * 12), Math.round(15 + Math.cos(a) * 12), 'woodLight'); v.line(10, 15, 15, 10, Math.round(15 + Math.sin(a) * 12), Math.round(15 + Math.cos(a) * 12), 'woodLight'); }
    v.box(2, 14, 14, 11, 16, 16, 'woodDark'); v.box(2, 14, 14, 2, 16, 16, 'gold'); v.box(11, 14, 14, 11, 16, 16, 'gold');
  } } },
  meta: { group: 'water' },
});

/* ------------------------------------------------------------------ landmarks */
def('n_molle', { // windmill (Vindmølleåsene, Kjempemølla = spawn scale 1.6), 1/8 → ~8.5 m
  size: [56, 70, 30], scale: 1 / 8,
  build(v) {
    for (let y = 0; y < 44; y++) { const r = 11 - y * 0.12; v.cyl(27.5, y, 14.5, r, 1, y < 3 ? 'stoneDark' : 'cream'); }
    for (let i = 0; i < 10; i++) v.cyl(27.5, 44 + i, 14.5, Math.max(0.5, 7 - i * 0.7), 1, 'roofRed');
    v.box(24, 0, 24, 31, 13, 25, 'woodRed'); v.clear(25, 0, 25, 30, 12, 25); v.box(25, 13, 25, 30, 13, 25, 'woodRed');
    v.box(25, 0, 24, 30, 12, 24, 'woodDark'); v.set(29, 6, 25, 'gold');
    for (const y of [20, 32]) { v.box(26, y, 24, 29, y + 4, 24, 'glass'); v.box(25, y - 1, 24, 30, y - 1, 24, 'white'); v.box(25, y + 5, 24, 30, y + 5, 24, 'white'); }
    v.box(17, 14, 22, 38, 14, 26, 'wood'); for (let x = 17; x <= 38; x += 3) v.box(x, 15, 26, x, 17, 26, 'woodLight'); v.box(17, 18, 26, 38, 18, 26, 'woodLight');
    v.box(26, 45, 23, 29, 48, 27, 'woodDark');
  },
  parts: { sails: { pivot: [28, 46, 28], build(v) {
    v.box(26, 44, 27, 29, 47, 29, 'woodDark');
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; for (let r = 2; r < 26; r++) { const x = Math.round(27.5 + Math.cos(a) * r), y = Math.round(45.5 + Math.sin(a) * r); v.set(x, y, 28, 'woodDark'); if (r > 6) { const nx = -Math.sin(a), ny = Math.cos(a); for (let w = 1; w <= 5; w++) v.set(Math.round(x + nx * w), Math.round(y + ny * w), 28, (r + w) % 4 === 0 ? 'woodLight' : 'wool'); } } }
  } } },
  meta: { group: 'landmark' },
});
def('v_fyrtarn', { // lighthouse, 1/8 → 9 m
  size: [30, 76, 30], scale: 1 / 8,
  build(v) {
    v.cyl(14.5, 0, 14.5, 13, 3, 'stoneDark'); K().speck(v, 'stoneDark', 'grey', 0.3, 2);
    for (let y = 3; y < 58; y++) { const r = 9 - y * 0.055; v.cyl(14.5, y, 14.5, r, 1, Math.floor((y - 3) / 9) % 2 ? 'white' : 'red'); }
    v.box(12, 3, 22, 17, 12, 24, 'navySoft'); v.set(16, 7, 24, 'gold');
    for (const y of [20, 38]) v.box(13, y, 22, 16, y + 3, 23, 'glass');
    v.cyl(14.5, 58, 14.5, 8, 1, 'navySoft'); K().ring(v, 14.5, 59, 14.5, 7.6, i => (i % 2 ? 'white' : 0)); K().ring(v, 14.5, 60, 14.5, 7.6, 'white');
    v.cyl(14.5, 59, 14.5, 4.5, 1, 'navySoft');
    for (let i = 0; i < 6; i++) v.cyl(14.5, 67 + i, 14.5, Math.max(0.5, 5.5 - i), 1, 'red'); v.set(14, 73, 14, 'gold');
    for (const [x, z] of [[10, 10], [19, 10], [10, 19], [19, 19]]) v.box(x, 60, z, x, 66, z, 'navySoft');
  },
  parts: { beam: { pivot: [15, 63, 15], build(v) { v.cyl(14.5, 60, 14.5, 3.5, 7, 'glowYellow'); v.box(14, 61, 18, 15, 65, 29, 'lamp'); } } },
  meta: { group: 'landmark', glow: true },
});
def('v_pariserhjul', { // ferris wheel, 1/8 → 9 m
  size: [56, 74, 24], scale: 1 / 8,
  build(v) {
    v.box(6, 0, 4, 49, 2, 19, 'pathStone');
    for (const z of [6, 17]) { v.line(10, 2, z, 27, 38, z, 'white'); v.line(45, 2, z, 28, 38, z, 'white'); }
    v.box(23, 3, 18, 32, 9, 21, 'pink'); v.box(22, 10, 17, 33, 10, 22, 'rose'); v.box(26, 3, 21, 29, 7, 21, 'glass');
  },
  parts: { wheel: { pivot: [28, 38, 12], build(v) {
    const cx = 27.5, cy = 38, R = 30;
    for (const z of [8, 9, 14, 15]) for (let i = 0; i < 360; i++) { const a = i / 360 * Math.PI * 2; for (const rr of [R, R - 1]) v.set(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), z, i % 30 < 15 ? 'lilac' : 'sky'); v.set(Math.round(cx + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 18), z, 'white'); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; for (const z of [8, 9, 14, 15]) v.line(Math.round(cx), cy, z, Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), z, 'white'); }
    v.box(26, 36, 7, 29, 40, 16, 'gold');
    const gc = ['rose', 'butter', 'mint', 'sky', 'lilac', 'peach'];
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, gx = Math.round(cx + Math.cos(a) * R), gy = Math.round(cy + Math.sin(a) * R) - 5; v.box(gx - 4, gy - 1, 7, gx + 4, gy + 3, 16, gc[k]); v.box(gx - 4, gy + 4, 7, gx + 4, gy + 4, 16, 'white'); v.box(gx - 3, gy + 5, 8, gx + 3, gy + 6, 15, gc[k]); v.box(gx - 3, gy + 1, 16, gx + 3, gy + 2, 16, 'glass'); v.box(gx - 1, gy + 3, 11, gx + 1, gy + 6, 12, 'white'); }
  } } },
  meta: { group: 'landmark' },
});
def('v_luftballong', { // hot-air balloon, 1/8 → 7 m tall
  size: [36, 58, 36], scale: 1 / 8,
  build(v) { v.box(14, 0, 14, 21, 0, 21, 'woodDark'); },
  parts: { balloon: { pivot: [18, 0, 18], build(v, o) {
    const cols = o.cols || ['rose', 'butter', 'sky', 'mint', 'lilac', 'peach'];
    v.box(14, 0, 14, 21, 5, 21, 'woodLight'); v.box(15, 1, 15, 20, 5, 20, 0); v.box(14, 5, 14, 21, 5, 21, 'woodRed'); v.box(15, 1, 15, 20, 1, 20, 'woodLight');
    for (const [x, z] of [[14, 14], [21, 14], [14, 21], [21, 21]]) v.line(x, 6, z, x < 18 ? 11 : 24, 18, z < 18 ? 11 : 24, 'woodDark');
    for (let y = 16; y < 58; y++) { const t = (y - 16) / 41, r = t < 0.25 ? 6 + t / 0.25 * 9 : 15 * Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.48) ** 2)) + (t < 0.55 ? 2 * (1 - (0.55 - t) / 0.3) : 0); for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; for (let rr = Math.max(0, r - 1.2); rr <= r; rr += 0.6) v.set(Math.round(17.5 + Math.cos(a) * rr), y, Math.round(17.5 + Math.sin(a) * rr), cols[Math.floor(i / (64 / cols.length)) % cols.length]); } }
    v.cyl(17.5, 57, 17.5, 3, 1, 'white');
    // bunting garland round the widest part + sandbags on the basket (reads from the high camera)
    const fl = ['rose', 'butter', 'sky', 'mint', 'white', 'lilac'];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, rr = 17.2, x = Math.round(17.5 + Math.cos(a) * rr), z = Math.round(17.5 + Math.sin(a) * rr), y = 38 + Math.round(Math.abs(Math.sin(a * 5)) * -1.5); v.set(x, y, z, i % 2 ? 'white' : fl[(i >> 1) % 6]); if (i % 2 === 0) v.set(x, y - 1, z, fl[(i >> 1) % 6]); }
    for (const [x, z] of [[13, 16], [22, 19], [16, 22], [19, 13]]) { v.box(x, 3, z, x, 4, z, 'hay'); v.set(x, 5, z, 'woodDark'); }
  } } },
  meta: { group: 'landmark' },
});
def('v_karusell', { // carousel (park, Byggebua) 1/8 → 4.5 m
  size: [40, 36, 40], scale: 1 / 8,
  build(v) { v.cyl(19.5, 0, 19.5, 19, 2, 'pathStone'); v.cyl(19.5, 2, 19.5, 2.2, 22, 'gold'); },
  parts: { rotor: { pivot: [20, 0, 20], build(v) {
    v.cyl(19.5, 2, 19.5, 17, 1, 'cream'); K().ring(v, 19.5, 3, 19.5, 17, i => (i % 6 < 3 ? 'pink' : 'butter'));
    for (let i = 0; i < 12; i++) { const y = 24 + i; v.cyl(19.5, y, 19.5, Math.max(0.6, 19 - i * 1.6), 1, i === 0 ? 'white' : (i % 2 ? 'rose' : 'white')); }
    v.cyl(19.5, 35, 19.5, 1, 1, 'gold');
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = Math.round(19.5 + Math.cos(a) * 13), z = Math.round(19.5 + Math.sin(a) * 13); v.box(x, 3, z, x, 23, z, 'gold'); const c = ['white', 'pink', 'butter', 'sky', 'lilac', 'mint'][k]; const dx = Math.round(-Math.sin(a) * 2), dz = Math.round(Math.cos(a) * 2);
      v.box(x - 1, 9, z - 1, x + 1, 12, z + 1, c); v.box(x + dx - 1, 9, z + dz - 1, x + dx + 1, 12, z + dz + 1, c); v.box(x - dx, 9, z - dz, x - dx, 11, z - dz, c); v.box(x + dx * 2, 11, z + dz * 2, x + dx * 2, 15, z + dz * 2, c); v.set(x + dx * 2, 15, z + dz * 2, 'black'); v.box(x + dx, 6, z + dz, x + dx, 8, z + dz, c); v.box(x - dx, 6, z - dz, x - dx, 8, z - dz, c); v.set(x, 13, z, 'rose'); }
  } } },
  meta: { group: 'landmark' },
});
def('v_isslott', { // Isslottet – a friendly sparkling ice castle, 1/8 → 7 m
  size: [48, 58, 40], scale: 1 / 8,
  build(v) {
    v.box(4, 0, 6, 43, 18, 33, 'ice'); v.clear(5, 1, 7, 42, 18, 32);
    for (let x = 4; x <= 43; x += 2) { v.set(x, 19, 6, 'snow'); v.set(x, 19, 33, 'snow'); }
    for (let z = 6; z <= 33; z += 2) { v.set(4, 19, z, 'snow'); v.set(43, 19, z, 'snow'); }
    for (const [x, z, h] of [[5, 7, 30], [42, 7, 30], [5, 32, 26], [42, 32, 26], [23.5, 18, 42]]) { v.cyl(x, 0, z, x === 23.5 ? 6 : 4, h, 'ice'); for (let i = 0; i < 12; i++) v.cyl(x, h + i, z, Math.max(0.4, (x === 23.5 ? 6.5 : 4.5) - i * 0.5), 1, i % 3 === 0 ? 'gIce' : 'lilac'); }
    v.box(19, 0, 33, 28, 13, 34, 'gAqua'); v.clear(20, 0, 34, 27, 12, 34); v.box(20, 0, 33, 27, 12, 33, 'crystal');
    for (const x of [10, 35]) v.box(x, 8, 33, x + 3, 13, 33, 'gIce');
    K().speck(v, 'ice', 'snow', 0.15, 3); K().speck(v, 'ice', 'white', 0.05, 4, true);
    v.paint((x, y, z, c) => (c === F.col('ice') && !v.get(x, y + 1, z) && H(x, y, z, 5) < 0.7 ? 'snow' : null));
  },
  meta: { group: 'landmark' },
});
def('v_regnbuebro', { // Regnbuebroen – a rainbow arch footbridge, 1/8 → 8 m long (along z), 2.5 m wide
  size: [22, 30, 66], scale: 1 / 8,
  build(v) {
    const band = ['rose', 'coral', 'peach', 'butter', 'mint', 'sky', 'lilac'];
    for (let z = 0; z < 66; z++) { const y = Math.round(Math.sin(z / 65 * Math.PI) * 16); v.box(2, y, z, 19, y + 1, z, 'white'); for (let i = 0; i < 7; i++) { v.set(1, y - i, z, band[i]); v.set(20, y - i, z, band[i]); } if (z % 6 === 0) { v.box(1, y + 2, z, 1, y + 5, z, 'white'); v.box(20, y + 2, z, 20, y + 5, z, 'white'); } v.set(1, y + 5, z, band[z % 7]); v.set(20, y + 5, z, band[(z + 3) % 7]); }
    // the deck itself is a rainbow: 7 lanes along the bridge (reads as a rainbow from the high camera), white sparkles here and there
    for (let z = 0; z < 66; z++) { const y = Math.round(Math.sin(z / 65 * Math.PI) * 16); for (let x = 3; x <= 18; x++) v.set(x, y + 1, z, (x + z * 7) % 23 === 0 ? 'white' : band[Math.min(6, Math.floor((x - 3) / 16 * 7))]); }
  },
  meta: { group: 'landmark', walk: 'arch', length: 8.25, width: 2.5, peak: 2.1 },
});
def('v_dyrepark', { // petting-farm gate arch (Dyreparken), 1/10 → 4 m wide
  size: [44, 34, 8], scale: 1 / 10,
  build(v) {
    for (const x of [2, 39]) { v.box(x, 0, 2, x + 3, 26, 5, 'woodRed'); v.box(x - 1, 27, 1, x + 4, 28, 6, 'white'); }
    v.box(2, 24, 3, 42, 31, 4, 'butter'); v.box(1, 23, 3, 43, 23, 4, 'woodRed'); v.box(1, 32, 3, 43, 32, 4, 'woodRed');
    for (const [x, c] of [[8, 'white'], [16, 'pink'], [24, 'orange'], [32, 'white']]) { v.box(x, 26, 5, x + 4, 29, 5, c); v.set(x + 1, 28, 6, 'black'); v.set(x + 3, 28, 6, 'black'); v.set(x + 2, 26, 6, 'pink'); }
    for (let x = 6; x < 39; x += 4) v.box(x, 0, 3, x, 8, 3, 'white'); v.box(6, 4, 3, 38, 4, 3, 'white'); v.box(6, 7, 3, 38, 7, 3, 'white');
    v.clear(14, 0, 3, 30, 8, 3);
  },
  meta: { group: 'landmark', sign: [0, 2.75, 0.5] },
});
/* low-poly copies (1/4 m voxels, as DESIGN §2.1) for houses seen from afar / dense villages */
if (F.M3K && F.M3K.lod) { F.M3K.lod('v_hus_lo', 'v_hus', 2, 2, { lodPrio: ['glass'], gallery: ['a', 'b', 'c', 'd', 'e', 'f'].map(s => ({ style: s })) }); F.M3K.lodParts('n_molle_lo', 'n_molle', 2, 2); F.M3K.lodParts('v_markedsbod_lo', 'v_markedsbod', 2, 2); F.M3K.lodParts('v_strandhytte_lo', 'v_strandhytte', 2, 2);
  F.M3K.lodParts('v_luftballong_lo', 'v_luftballong', 2, 2); F.M3K.lodParts('v_karusell_lo', 'v_karusell', 2, 2); }
})();
