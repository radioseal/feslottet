/* Feslottet – WP2 HOME models (DESIGN2 §2.7): Fetårnet, her own fairy tower, and its home things.
   c_fetarn_ute  the outdoor tower (scale 1/4, grid 42 × 86 × 42, origin = bottom centre = tower centre):
                 round, 8 m across, 15 m of lilac-and-white stone wall, a lavender cone roof to 19 m, butter star windows,
                 a balcony at 9 m, a round door 1.6 × 2.6 m facing +z (front) with a heart doormat.
                 parts: 'star' (the glow star finial, pivot at its centre; tower.js spins it), 'door' (the round door leaf, hinge on its left)
   c_feseng      the cloud bed in Fetårnet where she wakes (scale 1/16, 44 × 26 × 34 → 2.75 × 1.6 × 2.1 m); part 'blanket'
   h_dormatte    a heart doormat (flat, 1/16)
   h_mynt        a big gold coin for the onboarding path (1/16); part 'coin' spins */
(function () {
'use strict';
const F = window.F;
const def = (id, d) => { if (!F.VOX.has(id)) F.VOX.def(id, d); };
const hash = (a, b, c) => F.U.hash2(a * 7 + c * 13, b * 3 + c, 17);
const R = 16;                    // wall radius (voxels) = 4 m
const CX = 21, CZ = 21;          // grid centre
const WALL_TOP = 60;             // 15 m
const ROOF_TOP = 76;             // 19 m
// a 5 × 5 star mask (row 0 = top) for windows
const STAR = ['..#..', '.###.', '#####', '.###.', '#...#'];
const starAt = (u, w) => { const r = STAR[4 - w]; return r && r[u] === '#'; };   // u 0..4 left→right, w 0..4 bottom→top
// windows in cylinder coords: angle (rad, 0 = front +z), y0 (bottom voxel)
const WINDOWS = [[0.0, 22], [1.15, 30], [-1.15, 30], [2.3, 44], [-2.3, 44], [0.55, 48], [-0.6, 48], [Math.PI, 26], [1.7, 14], [-1.7, 14]];

def('c_fetarn_ute', {
  size: [42, 86, 42], scale: 1 / 4,
  build(v) {
    // plinth (0.5 m) and the wall
    v.cyl(CX, 0, CZ, R + 1, 2, 'stone2');
    v.cyl(CX, 2, CZ, R, WALL_TOP - 2, 'lilac');
    // stone courses: lilac, white and lavender blocks (0.75 × 0.5 m), a gold band at 7.5 m and a white cornice at the top
    v.paint((x, y, z, c) => {
      if (c !== F.PAL.lilac || y < 2) return null;
      const dx = x - CX, dz = z - CZ, r = Math.hypot(dx, dz);
      if (r < R - 1.6) return null;
      const a = Math.atan2(dx, dz), course = Math.floor((y - 2) / 2), u = a * R / 3 + (course % 2) * 0.5, blk = Math.floor(u);
      if (y === 30 || y === 31) return F.PAL.gold;
      if (y >= WALL_TOP - 3) return F.PAL.white;
      const h = hash(blk, course, 1);
      return h < 0.13 ? F.PAL.white : h < 0.3 ? F.PAL.lavender : null;
    });
    // cornice ring + little battlement teeth under the roof
    v.cyl(CX, WALL_TOP - 2, CZ, R + 1, 2, 'white');
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const x = Math.round(CX + Math.sin(a) * (R + 0.6)), z = Math.round(CZ + Math.cos(a) * (R + 0.6)); if (i % 2 === 0) v.set(x, WALL_TOP, z, 'white'); }
    // star windows (glow at night: glowYellow is unlit) with a white frame
    for (const [ang, y0] of WINDOWS) {
      const sx = Math.sin(ang), sz = Math.cos(ang), tx = Math.cos(ang), tz = -Math.sin(ang);
      for (let w = -1; w <= 5; w++) for (let u = -1; u <= 5; u++) {
        const inStar = u >= 0 && u <= 4 && w >= 0 && w <= 4 && starAt(u, w);
        const frame = !inStar && u >= -1 && u <= 5 && w >= -1 && w <= 5 && (u === -1 || u === 5 || w === -1 || w === 5);
        if (!inStar && !frame) continue;
        const off = u - 2;
        for (const d of [R - 0.4, R + 0.2]) {
          const x = Math.round(CX + sx * d + tx * off), z = Math.round(CZ + sz * d + tz * off), y = y0 + w;
          if (inStar) { if (v.get(x, y, z)) v.set(x, y, z, 'glowYellow'); }
          else if (d > R && v.get(x, y, z) === 0 && (u === -1 || u === 5) && (w === -1 || w === 5)) v.set(x, y, z, 'white');
        }
      }
      // a butter sill under each window
      for (let u = -2; u <= 6; u++) { const off = u - 2, x = Math.round(CX + sx * (R + 0.6) + tx * off), z = Math.round(CZ + sz * (R + 0.6) + tz * off); v.set(x, y0 - 2, z, 'butter'); }
    }
    // the round door (front): an arched opening 7 × 10 voxels, a white stone arch round it, the leaf is a part
    const DZ = CZ + R;
    for (let y = 2; y <= 13; y++) for (let x = CX - 4; x <= CX + 4; x++) {
      const dx = x - CX, top = y - 9;
      const inside = Math.abs(dx) <= 3 && (y <= 9 || dx * dx + top * top * 1.4 <= 12);
      const ring = !inside && Math.abs(dx) <= 4 && (y <= 10 || dx * dx + top * top * 1.4 <= 22);
      for (let z = DZ - 3; z <= DZ + 1; z++) { if (inside) v.set(x, y, z, 0); else if (ring && z >= DZ - 1 && v.get(x, y, z)) v.set(x, y, z, 'white'); }
      if (inside) v.set(x, y, DZ - 3, 'woodLight');          // the hall behind the open leaf
    }
    // step in front of the door and the heart doormat on the ground
    v.box(CX - 4, 0, DZ + 1, CX + 4, 1, DZ + 1, 'stone');
    for (let z = 0; z < 3; z++) for (let x = -3; x <= 3; x++) v.set(CX + x, 0, DZ + 2 + z, 'peach');
    for (const [x, z] of [[-1, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2]]) v.set(CX + x, 0, DZ + 4 - z, 'rose');
    // climbing roses beside the door
    for (const sx of [-1, 1]) for (let y = 2; y < 18; y++) {
      const x = CX + sx * (6 + (y % 3 === 0 ? 1 : 0)), dx = x - CX, z = Math.round(CZ + Math.sqrt(Math.max(0, (R + 0.5) ** 2 - dx * dx)));
      v.set(x, y, z, hash(x, y, 3) < 0.3 ? 'rose' : hash(x, y, 5) < 0.2 ? 'pink' : 'leaf');
    }
    // balcony at 9 m (front, a half disc on brackets, white railing with a gold top rail) + a little glowing door behind it
    const BY = 36;
    for (let z = CZ; z <= CZ + R + 3; z++) for (let x = CX - 7; x <= CX + 7; x++) {
      const r = Math.hypot(x - CX, z - CZ); if (r < R - 1 || r > R + 3) continue;
      if (Math.abs(x - CX) > 6) continue;
      v.set(x, BY, z, 'stone2');
      const edge = r > R + 2 || Math.abs(x - CX) === 6;
      if (edge) { if ((x + z) % 2 === 0) v.box(x, BY + 1, z, x, BY + 3, z, 'white'); v.set(x, BY + 4, z, 'gold'); }
    }
    for (let x = CX - 5; x <= CX + 5; x += 2) v.set(x, BY - 1, CZ + R + 1, 'stone2');
    for (let y = BY + 1; y <= BY + 7; y++) for (let x = CX - 2; x <= CX + 2; x++) { const top = y - (BY + 5); if (y > BY + 5 && x * 0 + (x - CX) ** 2 + top * top * 2 > 6) continue; v.set(x, y, CZ + R, 'glowYellow'); v.set(x, y, CZ + R - 1, 'glowYellow'); }
    // roof: eaves ring, lavender cone with lilac shingle rows and a gold collar
    v.cyl(CX, WALL_TOP + 1, CZ, R + 2, 1, 'roofLilac');
    v.cone(CX, WALL_TOP + 2, CZ, R + 1.5, ROOF_TOP - WALL_TOP - 2, 'lavender');
    v.paint((x, y, z, c) => (c === F.PAL.lavender && y > WALL_TOP + 1 && (y - WALL_TOP) % 3 === 0) ? F.PAL.roofLilac : null);
    v.paint((x, y, z, c) => (c === F.PAL.lavender && y > WALL_TOP + 1 && hash(x, y, z) < 0.05) ? F.PAL.blossom : null);
    v.box(CX, ROOF_TOP - 1, CZ, CX, ROOF_TOP + 1, CZ, 'gold');
    // a little round dormer window on the roof (front)
    for (let y = WALL_TOP + 4; y <= WALL_TOP + 7; y++) for (let x = CX - 1; x <= CX + 1; x++) { const z = CZ + Math.round((R + 1.5) * (1 - (y - WALL_TOP - 2) / (ROOF_TOP - WALL_TOP - 2))); v.set(x, y, z, 'glowYellow'); v.set(x, y, z + 1, (x === CX || y === WALL_TOP + 5) ? 'white' : 0); }
  },
  parts: {
    // glow star finial on a gold spike (pivot = star centre, at 19.75 m)
    star: { pivot: [CX, 81, CZ], build(v) {
      const M = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'];
      M.forEach((row, i) => [...row].forEach((ch, j) => { if (ch === '#') { v.set(CX - 3 + j, 84 - i, CZ, 'glowYellow'); v.set(CX - 3 + j, 84 - i, CZ - 1, 'glowYellow'); } }));
    } },
    // the door leaf (hinge on the left edge of the opening); tower.js swings it open when she comes or goes
    door: { pivot: [CX - 3, 2, CZ + R - 2], build(v) {
      for (let y = 2; y <= 12; y++) for (let x = CX - 3; x <= CX + 3; x++) {
        const dx = x - CX, top = y - 9;
        if (!(y <= 9 || dx * dx + top * top * 1.4 <= 12)) continue;
        v.set(x, y, CZ + R - 2, (x === CX - 3 || x === CX + 3 || y === 2) ? 'roofPink' : ((x - CX) % 2 === 0 ? 'pink' : 'blossom'));
      }
      v.box(CX + 1, 6, CZ + R - 1, CX + 2, 7, CZ + R - 1, 'gold');            // knob
      for (const [x, y] of [[0, 10], [-1, 9], [1, 9], [-1, 8], [0, 8], [1, 8], [0, 7]]) v.set(CX + x, y, CZ + R - 1, 'glowYellow');   // a little heart window
    } },
  },
  meta: { group: 'home', note: 'Fetårnet exterior, centre (80, −92); door at local +z 4.4 m' },
});

// the cloud bed: puffy white cloud base, a pink pillow, a lilac star blanket; she wakes here
def('c_feseng', {
  size: [44, 30, 34], scale: 1 / 16,
  build(v) {
    // cloud base (several overlapping puffs)
    for (const [x, y, z, rx, ry, rz] of [[12, 7, 17, 11, 7, 13], [24, 7, 17, 12, 7, 14], [34, 7, 17, 9, 6, 12], [17, 9, 7, 7, 5, 6], [30, 9, 27, 8, 5, 6], [6, 6, 26, 6, 5, 6], [38, 6, 8, 5, 5, 5]]) v.ellipsoid(x, y, z, rx, ry, rz, 'white');
    v.paint((x, y, z, c) => (c === F.PAL.white && y < 3) ? F.PAL.ice : (c === F.PAL.white && hash(x, y, z) < 0.08 ? F.PAL.snow : null));
    v.clear(0, 13, 0, 43, 29, 33);
    v.box(4, 12, 6, 39, 12, 28, 'snow');                        // flat mattress top
    // pillow at the head (left, −x)
    v.ellipsoid(8, 15, 17, 4, 2.5, 8, 'blossom');
    v.paint((x, y, z, c) => (c === F.PAL.blossom && y >= 16 && (x + z) % 4 === 0) ? F.PAL.pink : null);
    // headboard: a silver crescent moon with a glow star
    v.box(1, 12, 9, 2, 24, 25, 'lavender');
    for (let i = 0; i < 9; i++) v.set(2, 25 + Math.round(Math.sin(i / 8 * Math.PI) * 3), 9 + i * 2, 'gold');
    for (const [y, z] of [[20, 14], [19, 13], [19, 15], [21, 14], [18, 14]]) v.set(3, y, z, 'glowYellow');
    for (const [y, z] of [[22, 21], [21, 22], [22, 23], [23, 21]]) v.set(3, y, z, 'silver');
  },
  parts: {
    blanket: { pivot: [26, 13, 17], build(v) {
      v.box(14, 13, 5, 40, 13, 29, 'lilac');
      v.box(14, 12, 4, 40, 13, 4, 'lilac'); v.box(14, 12, 30, 40, 13, 30, 'lilac'); v.box(41, 12, 4, 41, 13, 30, 'lilac');
      v.box(14, 14, 6, 15, 14, 28, 'white');                        // folded edge
      for (const [x, z] of [[20, 10], [27, 15], [34, 9], [22, 23], [31, 25], [37, 19], [18, 17]]) { v.set(x, 14, z, 'butter'); v.set(x - 1, 14, z, 'butter'); v.set(x + 1, 14, z, 'butter'); v.set(x, 14, z - 1, 'butter'); v.set(x, 14, z + 1, 'butter'); }
    } },
  },
  meta: { group: 'home', room: 'fetarn' },
});

// Stjernerommet's legend shelf (P1): 2 rows × 5 niches for the sagndyr figurines (tower.js fills them); front +z
def('h_legendehylle', {
  size: [48, 42, 10], scale: 1 / 16,
  build(v) {
    v.box(0, 0, 0, 45, 35, 9, 'white');                              // the cabinet
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
      const x0 = 1 + 9 * i, y0 = 3 + 16 * r;
      v.clear(x0, y0, 2, x0 + 7, y0 + 13, 9);                         // the niche
      v.box(x0, y0, 1, x0 + 7, y0 + 13, 1, 'navySoft');               // night-blue back
      for (const [dx, dy] of [[2, 10], [5, 7], [3, 4], [6, 11]]) v.set(x0 + dx, y0 + dy, 1, 'butter');   // little stars
      v.box(x0, y0 - 1, 2, x0 + 7, y0 - 1, 9, 'lavender');            // niche floor
    }
    v.box(0, 0, 0, 45, 1, 9, 'lavender');
    v.box(0, 34, 0, 45, 35, 9, 'gold');
    for (const x of [5, 22, 40]) { v.box(x, 36, 4, x + 1, 39, 5, 'gold'); v.box(x - 1, 37, 4, x + 2, 38, 5, 'gold'); v.set(x, 40, 4, 'glowYellow'); v.set(x + 1, 40, 4, 'glowYellow'); }
  },
  meta: { group: 'home', room: 'stjernetarn', note: 'niche i (0..9): x = (4.5 + 9·(i % 5) − 24) / 16, y = (3 + 16·⌊i / 5⌋) / 16' },
});

// heart doormat (also a pressable thing beside the door would be too small; it is decor in the tower model and here for galleries)
def('h_dormatte', {
  size: [24, 1, 16], scale: 1 / 16,
  build(v) {
    v.box(0, 0, 0, 23, 0, 15, 'peach');
    const H = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    H.forEach((row, i) => [...row].forEach((ch, j) => { if (ch === '#') { v.set(5 + j * 2, 0, 2 + i * 2, 'rose'); v.set(6 + j * 2, 0, 2 + i * 2, 'rose'); v.set(5 + j * 2, 0, 3 + i * 2, 'rose'); v.set(6 + j * 2, 0, 3 + i * 2, 'rose'); } }));
  },
  meta: { group: 'home' },
});

// a big gold coin standing on its edge (onboarding: «Se, en mynt på stien!»)
def('h_mynt', {
  size: [14, 16, 4], scale: 1 / 16,
  build() {},
  parts: { coin: { pivot: [7, 8, 2], build(v) {
    for (let y = 1; y <= 14; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, y - 7.5); if (d <= 6.6) v.box(x, y, 1, x, y, 2, d > 5.4 ? 'honey' : 'gold'); }
    for (const [x, y] of [[6, 11], [7, 11], [5, 10], [8, 10], [6, 9], [7, 9], [6, 8], [7, 8], [6, 7], [7, 7], [6, 6], [7, 6], [5, 4], [6, 4], [7, 4], [8, 4], [6, 5], [7, 5]]) { v.set(x, y, 0, 'glowYellow'); v.set(x, y, 3, 'glowYellow'); }
  } } },
  meta: { group: 'home' },
});
})();
