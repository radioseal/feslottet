/* Feslottet – MODELS-2: animals (castable words + Dyrebutikken pets). Owner: MODELS-2.
   Micro-voxels 1/16 m (same voxel size as characters), palette NAMES only, front = +z, origin = bottom centre.
   Chibi look: big head, big eyes (babies get 2×2 sparkly eyes), round bodies, blush.
   IDS (55): katt pet_kattunge hund valp hest ponni føll pet_enhjørningføll ku kalv sau lam geit gris kanin mus pet_marsvin
     pet_pinnsvin pet_skilpadde and pet_andunge gås høne hane svane due pet_papegøye ugle fugl måke esel sebra giraff lama kamel
     elg rein rev løve ape panda koala ekorn fisk frosk bie humle larve snegl krabbe hval delfin sel  + family defs animal4, bird
   PARTS (pivots for animation, all in obj.userData.parts):
     quad rig (meta.rig 'quad'|'hop'): head (neck), tail, legFL legFR legBL legBR (swing = rotation.x)
     bird rig ('bird'): head, wingL (+x) wingR (−x) (flap = rotation.z), legL legR, tail      sitters ('sit'): head, armL, armR, tail
     fish ('fish'): tail (wag = rotation.y)   bie/humle: wingL wingR   frosk: legFL..legBR   krabbe: clawL clawR
   FAMILIES: F.VOX.make('animal4',{kind}) / F.VOX.make('bird',{kind}) = merged static mesh of that kind (meta.variants.kind lists kinds);
     use the word id (e.g. 'hest') when you need the animated parts. o.c recolours (meta.variants c) for katt, hund, hest, gris, kanin, fisk.
   RUNTIME: F.Rig.tick(obj, t, {moving, happy, fly, speed}) – legs walk, tails wag (fast when happy), wings flap, arms wave,
     vehicle wheels/propellers spin, wear-wings flutter. F.Rig.bob(obj, t, st) -> y offset (hop arcs for 'hop', trot bob, hover for fliers).
     F.Rig.kind(obj) -> meta.rig. Pure part transforms; never moves obj itself. Pets with ride: ponni (1.8), pet_enhjørningføll (2). */
(function () {
'use strict';
const F = window.F, V = F.VOX, P = F.PAL, H = F.U.hash2;
const S16 = 1 / 16;

/* ---------------------------------------------------------- helpers */
// colour the front-most voxel at (x,y) (dz=1: add one in front of it)
function front(v, x, y, c, dz) { for (let z = v.size[2] - 1; z >= 0; z--) if (v.get(x, y, z)) { v.set(x, y, z + (dz || 0), c); return z; } return -1; }
function side(v, x, y, z, c, dir) { // first voxel scanning from the +x (dir=1) or −x (dir=-1) side
  if (dir > 0) { for (let xx = v.size[0] - 1; xx >= 0; xx--) if (v.get(xx, y, z)) { v.set(xx, y, z, c); return xx; } }
  else { for (let xx = 0; xx < v.size[0]; xx++) if (v.get(xx, y, z)) { v.set(xx, y, z, c); return xx; } }
  return -1;
}
// cute eye: w×h block painted on the front surface, highlight top-left
function frontZ(v, x, y) { for (let z = v.size[2] - 1; z >= 0; z--) if (v.get(x, y, z)) return z; return -1; }
// cute eye: w×h block on a flattened patch of the front surface, highlight top-left
function eye(v, x, y, w, h, hl) {
  let zm = -1; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) zm = Math.max(zm, frontZ(v, x + i, y + j));
  if (zm < 0) return;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const z0 = frontZ(v, x + i, y + j); if (z0 < 0) continue;
    const hex = v.data[(x + i) + v.size[0] * ((y + j) + v.size[1] * z0)]; // keep surface colour index for the fill
    for (let z = z0 + 1; z < zm; z++) v.data[(x + i) + v.size[0] * ((y + j) + v.size[1] * z)] = hex;
    v.set(x + i, y + j, zm, (hl !== false && w > 1 && h > 1 && i === 0 && j === h - 1) ? 'white' : 'black');
  }
}
function speck(v, from, to, p, seed) { const f = P[from]; v.paint((x, y, z, c) => c === f && H(x * 7 + y * 3, z * 13 + y, seed || 3) < p ? to : null); }
const exposed = (v, x, y, z) => !v.get(x + 1, y, z) || !v.get(x - 1, y, z) || !v.get(x, y + 1, z) || !v.get(x, y, z + 1) || !v.get(x, y, z - 1) || !v.get(x, y - 1, z);
function surfSpeck(v, from, to, p, seed) { const f = P[from]; v.paint((x, y, z, c) => c === f && exposed(v, x, y, z) && H(x * 5 + z, y * 11 + x, seed || 7) < p ? to : null); }
function tube(v, pts, r, c) { // thick polyline (ellipsoid beads)
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2) + 1; for (let k = 0; k <= n; k++) { const t = k / n; v.sphere(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r, c); } }
}
const pick = (o, k, d) => (o && o[k] != null ? o[k] : d);

/* ---------------------------------------------------------- quadruped rig
   S = { size:[W,H,L], col, body:[y,z,rx,ry,rz], legs:{x0,w,d,zF,zB,h,c,foot,footH}, head:[y,z,rx,ry,rz], headPivot:[y,z], neck:[[y,z],[y,z]],neckR,
         tailPivot:[y,z], paintBody(v,o,k), face(v,o,k), tail(v,o,k), extraBody(v,o,k), legPaint(v,o,k,name) } */
function quad(id, S, meta) {
  const [W, Hh, L] = S.size, cx = (W - 1) / 2, k = { W, H: Hh, L, cx, S };
  const col = o => pick(o, 'c', S.col);
  const LG = S.legs, lw = LG.w || 2, ld = LG.d || 2;
  const R = Math.round, legBox = { legFL: [R(LG.x0), R(LG.zF)], legFR: [W - R(LG.x0) - lw, R(LG.zF)], legBL: [R(LG.x0), R(LG.zB)], legBR: [W - R(LG.x0) - lw, R(LG.zB)] };  // integers only: v.box() with fractions corrupts indices
  const parts = {};
  for (const n in legBox) {
    const [x, z] = legBox[n], hh = n[3] === 'B' ? (LG.hB || LG.h) : LG.h;
    parts[n] = { pivot: [x + lw / 2, hh + 1, z + ld / 2], build(v, o) {
      v.box(x, 0, z, x + lw - 1, hh, z + ld - 1, LG.c === 'body' || !LG.c ? col(o) : LG.c);
      if (LG.foot) v.box(x, 0, z, x + lw - 1, (LG.footH || 1) - 1, z + ld - 1, LG.foot);
      if (S.legPaint) S.legPaint(v, o, k, n, x, z);
    } };
  }
  parts.head = { pivot: [W / 2, S.headPivot[0], S.headPivot[1]], build(v, o) {
    const c = pick(o, 'headC', S.headCol || col(o));
    if (S.neck) tube(v, S.neck.map(([y, z]) => [cx, y, z]), S.neckR || 2, S.neckCol || col(o));
    const h = S.head; v.ellipsoid(cx, h[0], h[1], h[2], h[3], h[4], c);
    if (S.face) S.face(v, o, k);
  } };
  if (S.tail) parts.tail = { pivot: [W / 2, S.tailPivot[0], S.tailPivot[1]], build(v, o) { S.tail(v, o, k); } };
  return V.def(id, { size: S.size, scale: S.scale || S16, build(v, o) {
    const b = S.body; v.ellipsoid(cx, b[0], b[1], b[2], b[3], b[4], col(o));
    if (S.paintBody) S.paintBody(v, o, k);
    if (S.extraBody) S.extraBody(v, o, k);
  }, parts, meta: Object.assign({ group: 'dyr', rig: 'quad', react: 'pet', family: 'animal4', by: 'models2' }, meta || {}) });
}

/* ---------------------------------------------------------- bird rig
   B = { size, col, body:[y,z,rx,ry,rz], head:[y,z,r] or [y,z,rx,ry,rz], headPivot, neck, beak(v,o,k), face(v,o,k),
         wing:{x,y0,y1,z0,z1,c,tip}, legs:{xs:[a,b], z, h, c}, tail(v,o,k), tailPivot, paintBody } */
function bird(id, B, meta) {
  const [W, Hh, L] = B.size, cx = (W - 1) / 2, k = { W, H: Hh, L, cx, B };
  const col = o => pick(o, 'c', B.col);
  const parts = {};
  parts.head = { pivot: [W / 2, B.headPivot[0], B.headPivot[1]], build(v, o) {
    if (B.neck) tube(v, B.neck.map(([y, z]) => [cx, y, z]), B.neckR || 1.6, B.neckCol || pick(o, 'headC', B.headCol || col(o)));
    const h = B.head; if (h.length === 3) v.sphere(cx, h[0], h[1], h[2], pick(o, 'headC', B.headCol || col(o))); else v.ellipsoid(cx, h[0], h[1], h[2], h[3], h[4], pick(o, 'headC', B.headCol || col(o)));
    if (B.face) B.face(v, o, k);
  } };
  const Wg = B.wing;
  if (Wg) {
    const wing = (v, o, x, dir) => {
      for (let y = Wg.y0; y <= Wg.y1; y++) for (let z = Wg.z0; z <= Wg.z1; z++) {
        // rounded, tapering to the back
        const t = (z - Wg.z0) / Math.max(1, Wg.z1 - Wg.z0), top = Wg.y1 - Math.round((1 - t) * (Wg.drop || 0));
        if (y > top) continue;
        v.set(x, y, z, Wg.tip && z <= Wg.z0 + (Wg.tipN || 1) ? Wg.tip : pick(o, 'wingC', Wg.c || col(o)));
        if (Wg.thick && y > Wg.y0 && y < top && z > Wg.z0) v.set(x - dir, y, z, pick(o, 'wingC', Wg.c || col(o)));
      }
      if (Wg.paint) Wg.paint(v, o, x, dir);
    };
    parts.wingL = { pivot: [Wg.x, Wg.y1 + 0.5, (Wg.z0 + Wg.z1 + 1) / 2], build(v, o) { wing(v, o, Wg.x, 1); } };
    parts.wingR = { pivot: [W - Wg.x, Wg.y1 + 0.5, (Wg.z0 + Wg.z1 + 1) / 2], build(v, o) { wing(v, o, W - 1 - Wg.x, -1); } };
  }
  const LG = B.legs;
  if (LG) {
    const leg = (v, x) => { v.box(x, 0, LG.z, x, LG.h, LG.z, LG.c || 'orange'); v.box(x - (LG.webW || 0), 0, LG.z, x + (LG.webW || 0), 0, LG.z + (LG.foot || 1), LG.c || 'orange'); };
    parts.legL = { pivot: [LG.xs[1] + 0.5, LG.h + 1, LG.z + 0.5], build(v) { leg(v, LG.xs[1]); } };
    parts.legR = { pivot: [LG.xs[0] + 0.5, LG.h + 1, LG.z + 0.5], build(v) { leg(v, LG.xs[0]); } };
  }
  if (B.tail) parts.tail = { pivot: [W / 2, B.tailPivot[0], B.tailPivot[1]], build(v, o) { B.tail(v, o, k); } };
  return V.def(id, { size: B.size, scale: B.scale || S16, build(v, o) {
    const b = B.body; v.ellipsoid(cx, b[0], b[1], b[2], b[3], b[4], col(o));
    if (B.paintBody) B.paintBody(v, o, k);
  }, parts, meta: Object.assign({ group: 'dyr', rig: 'bird', react: 'pet', family: 'bird', by: 'models2' }, meta || {}) });
}

/* ---------------------------------------------------------- face kits */
const earTri = (v, x, y, z, dir, c, inner) => { // pointy ear, tip over the outer edge
  v.box(x, y, z, x + 2 * dir, y, z + 1, c); v.box(x, y + 1, z, x + dir, y + 1, z + 1, c); v.box(x, y + 2, z, x, y + 2, z + 1, c);
  if (inner) { v.set(x + dir, y, z + 1, inner); v.set(x, y + 1, z + 1, inner); }
};
function catFace(v, o, k, f) { // f = {ey, ex:[l,r], ny, earY, earZ, earC, inner, muzzle}
  const c = pick(o, 'c', k.S.col);
  earTri(v, f.ex[0] - 1, f.earY, f.earZ, 1, f.earC || c, f.inner || 'blossom');
  earTri(v, f.ex[1] + 2, f.earY, f.earZ, -1, f.earC || c, f.inner || 'blossom');
  const ew = f.ew || 2; eye(v, f.ex[0], f.ey, ew, 2); eye(v, f.ex[1] + (ew === 1 ? 1 : 0), f.ey, ew, 2);
  const m = Math.floor(k.cx);
  front(v, m - 1, f.ny - 1, f.muzzle || 'white'); front(v, m + 2, f.ny - 1, f.muzzle || 'white');
  front(v, m, f.ny - 1, f.muzzle || 'white'); front(v, m + 1, f.ny - 1, f.muzzle || 'white');
  front(v, m, f.ny, 'pink'); front(v, m + 1, f.ny, 'pink');
  front(v, f.ex[0] - 1, f.ny, 'blossom'); front(v, f.ex[1] + 2, f.ny, 'blossom');
}
function dogFace(v, o, k, f) { // f = {ey, ex:[l,r], mz:[x0,y0,z0,x1,y1,z1], muzC, ear:[x,y0,y1,z0,z1], earC, tongue}
  const m = f.mz; v.box(m[0], m[1], m[2], m[3], m[4], m[5], f.muzC || 'cream');
  const nx = Math.floor(k.cx); v.box(nx, m[4], m[5] + 1, nx + 1, m[4], m[5] + 1, 'black'); v.box(nx, m[4] - 1, m[5] + 1, nx + 1, m[4] - 1, m[5] + 1, 'black');
  if (f.tongue !== false) { v.box(nx, m[1] - 1, m[5] - 1, nx + 1, m[1] - 1, m[5], 'pink'); }
  const ew = f.ew || 2; eye(v, f.ex[0] + (ew === 1 ? 1 : 0), f.ey, ew, 2); eye(v, f.ex[1], f.ey, ew, 2);
  const e = f.ear; v.box(e[0], e[1], e[3], e[0] + 1, e[2], e[4], f.earC); v.box(k.W - 2 - e[0], e[1], e[3], k.W - 1 - e[0], e[2], e[4], f.earC);
  front(v, f.ex[0] - 1, f.ey - 1, 'blossom'); front(v, f.ex[1] + 2, f.ey - 1, 'blossom');
}

/* ================================================================ CATS */
quad('katt', { size: [10, 15, 17], col: 'orange',
  body: [5.2, 7, 2.9, 2.6, 4.4], legs: { x0: 2, zF: 9, zB: 3, h: 3, foot: 'white' },
  head: [9.6, 12.4, 3.6, 3.1, 3.1], headPivot: [7, 11], tailPivot: [6, 3],
  paintBody(v, o) { const st = pick(o, 'stripe', 'woodRed'); v.paint((x, y, z, c) => y >= 6 && z % 3 === 1 && z < 11 ? P[st] : null); v.paint((x, y, z) => z >= 10 && y <= 5 ? P.white : null); },
  face(v, o, k) { catFace(v, o, k, { ey: 9, ex: [3, 5], ew: 1, ny: 8, earY: 12, earZ: 11 }); const st = pick(o, 'stripe', 'woodRed'); front(v, 4, 12, st); front(v, 5, 12, st); front(v, 4, 11, st); front(v, 5, 11, st); },
  tail(v, o) { const c = pick(o, 'c', 'orange'), st = pick(o, 'stripe', 'woodRed'); // curled «?» tail – reads as a cat from far away
    v.box(4, 5, 2, 5, 6, 2, c); v.box(4, 6, 1, 5, 10, 1, c); v.box(4, 11, 1, 5, 11, 2, c); v.box(4, 12, 2, 5, 12, 3, st); v.box(4, 11, 4, 5, 11, 4, st); v.box(4, 8, 1, 5, 8, 1, st); },
}, { variants: { c: ['orange', 'hairGrey', 'white', 'black'] } });

quad('pet_kattunge', { size: [10, 14, 14], col: 'hairGrey',
  body: [4.4, 5.8, 2.6, 2.2, 3.4], legs: { x0: 2, zF: 7, zB: 3, h: 2, foot: 'white' },
  head: [8.4, 9.8, 3.7, 3.2, 3.1], headPivot: [6, 8], tailPivot: [5, 2],
  paintBody(v) { v.paint((x, y, z) => z >= 8 && y <= 4 ? P.white : y >= 6 && z % 2 === 0 ? P.grey : null); },
  face(v, o, k) { catFace(v, o, k, { ey: 8, ex: [2, 6], ny: 7, earY: 11, earZ: 9 }); front(v, 4, 11, 'white'); front(v, 5, 11, 'white'); front(v, 4, 10, 'white'); front(v, 5, 10, 'white');
    v.set(4, 6, 12, 'pink'); },
  tail(v) { v.box(4, 4, 1, 5, 5, 1, 'hairGrey'); v.box(4, 5, 0, 5, 9, 0, 'hairGrey'); v.box(4, 9, 0, 5, 9, 0, 'white'); },
}, { pet: true });

/* ================================================================ DOGS */
quad('hund', { size: [12, 17, 21], col: 'woodLight',
  body: [6.2, 8.6, 3.3, 3.0, 5.0], legs: { x0: 3, zF: 11, zB: 5, h: 4, foot: 'cream' },
  head: [11.4, 14.6, 3.7, 3.3, 3.1], headPivot: [8.5, 13.5], tailPivot: [8, 4],
  paintBody(v) { v.paint((x, y, z) => z >= 12 && y <= 6 ? P.cream : y >= 8 && z >= 5 && z <= 10 ? P.brown : null); },
  extraBody(v) { v.paint((x, y, z) => z >= 12 && y >= 7 ? P.red : null); v.box(5, 6, 14, 6, 7, 14, 'gold'); },
  face(v, o, k) { dogFace(v, o, k, { ey: 12, ex: [3, 7], ew: 1, mz: [4, 9, 16, 7, 11, 18], ear: [1, 10, 13, 13, 14], earC: 'brown' }); },
  tail(v, o) { const c = pick(o, 'c', 'woodLight'); v.box(5, 8, 3, 6, 9, 3, c); v.box(5, 9, 2, 6, 12, 2, c); v.box(5, 13, 2, 6, 13, 2, 'cream'); },
}, { variants: { c: ['woodLight', 'cream2', 'hairGrey', 'brown'] } });

quad('valp', { size: [10, 14, 17], col: 'honey',
  body: [4.8, 7, 2.7, 2.4, 3.8], legs: { x0: 2, zF: 9, zB: 4, h: 3, foot: 'cream' },
  head: [9, 11.6, 3.6, 3.2, 3.1], headPivot: [7, 10], tailPivot: [6, 3],
  paintBody(v) { v.paint((x, y, z) => z >= 9 && y <= 5 ? P.cream : null); },
  face(v, o, k) { dogFace(v, o, k, { ey: 9, ex: [2, 6], mz: [3, 7, 13, 6, 8, 15], ear: [0, 7, 11, 10, 12], earC: 'woodLight' }); front(v, 4, 12, 'cream'); front(v, 5, 12, 'cream'); },
  tail(v, o) { const c = pick(o, 'c', 'honey'); v.box(4, 6, 2, 5, 7, 2, c); v.box(4, 7, 1, 5, 9, 1, c); },
}, { pet: true });

/* ================================================================ HORSES */
function horse(id, o) {
  const big = o.big;                                  // 1 = horse, 0.8 = pony, foal is leggy
  const W = 12, cx = 5.5, legH = o.legH, by = legH + o.bodyRy - 0.6;
  const bz = o.bodyZ, brz = o.bodyRz, nb = [by + 1.5, bz + brz - 2.5];
  const hy = o.headY, hz = o.headZ;
  return quad(id, { size: [W, o.H, o.L], col: o.col,
    body: [by, bz, o.bodyRx, o.bodyRy, brz], legs: { x0: 3, zF: bz + brz - 4, zB: bz - brz + 2, h: legH, foot: o.hoof || 'woodDark', footH: 2 },
    neck: [[nb[0], nb[1]], [hy - 1, hz - 1.5]], neckR: o.neckR || 2.1,
    head: [hy, hz, o.headR[0], o.headR[1], o.headR[2]], headPivot: [nb[0] - 1, nb[1] - 1], tailPivot: [by + 1.5, bz - brz + 1.5],
    paintBody: o.paintBody, extraBody: o.extraBody,
    legPaint(v, oo, k, n, x, z) { if (o.socks && (n === 'legFL' || n === 'legFR' || o.socks === 4)) v.box(x, 2, z, x + 1, 3, z + 1, 'white'); },
    face(v, oo, k) {
      // muzzle
      v.ellipsoid(cx, hy - 1.8, hz + o.headR[2] - 1.4, o.headR[0] - 0.5, 1.8, 1.8, o.muzzle || o.col);
      const fz = Math.round(hz + o.headR[2] + 0.3);
      v.set(4, Math.round(hy - 2), fz, 'woodDark'); v.set(7, Math.round(hy - 2), fz, 'woodDark');
      // eyes + blaze
      if (o.baby) { eye(v, 3, Math.round(hy), 2, 2); eye(v, 7, Math.round(hy), 2, 2); } else { eye(v, 4, Math.round(hy), 1, 2); eye(v, 7, Math.round(hy), 1, 2); }
      if (o.blaze) for (let y = Math.round(hy) - 1; y <= Math.round(hy) + 2; y++) { front(v, 5, y, 'white'); front(v, 6, y, 'white'); }
      front(v, 3, Math.round(hy) - 1, 'blossom'); front(v, 8, Math.round(hy) - 1, 'blossom');
      // ears
      const ty = Math.round(hy + o.headR[1]) - 1, ez = Math.round(hz - 1), ecol = pick(oo, 'c', o.col);
      if (o.ears === 'long') for (const [x, d] of [[3, -1], [8, 1]]) { v.box(x, ty, ez, x, ty + 3, ez + 1, ecol); v.box(x + d, ty + 3, ez, x + d, ty + 5, ez + 1, ecol); v.set(x, ty + 1, ez + 1, 'blossom'); v.set(x + d, ty + 4, ez + 1, 'blossom'); v.set(x + d, ty + 5, ez + 1, o.earTip || ecol); }
      else for (const x of [3, 8]) { v.box(x, ty, ez, x, ty + 2, ez + 1, ecol); v.set(x, ty, ez + 1, 'blossom'); }
      if (o.faceExtra) o.faceExtra(v, { hy, hz, ty, ez, nb, cx }, oo);
      if (o.noMane) return;
      // mane along the back of the neck + forelock
      const mc = o.mane;
      for (let t = 0; t <= 1.0001; t += 0.06) {
        const y = Math.round(nb[0] + 1.5 + (ty + 1 - nb[0] - 1.5) * t), z = Math.round(nb[1] - 2 + (ez - nb[1] + 1.5) * t);
        const c = Array.isArray(mc) ? mc[Math.floor(t * 5.99) % mc.length] : mc;
        v.box(5, y, z - 1, 6, y + 1, z, c); if (o.longMane) v.box(4, y - 1, z - 2, 4, y, z - 1, c), v.box(7, y - 1, z - 2, 7, y, z - 1, c);
      }
      const fl = Array.isArray(mc) ? mc[0] : mc; v.box(5, ty, ez + 1, 6, ty + 1, ez + 2, fl); v.box(5, ty - 1, ez + 3, 6, ty - 1, ez + 3, fl);
      if (o.horn) { for (let i = 0; i < 4; i++) v.box(5, ty + 1 + i, ez + 2 + (i > 1 ? 1 : 0), i < 2 ? 6 : 5, ty + 1 + i, ez + 2 + (i > 1 ? 1 : 0), i % 2 ? 'butter' : 'gold'); v.set(5, ty + 5, ez + 3, 'glowYellow'); }
    },
    tail(v, oo) {
      if (o.tailFn) return o.tailFn(v, { by, bz, brz }, oo);
      const mc = o.mane, ty0 = Math.round(by + 1), tz = Math.round(bz - brz + 1);
      const cols = Array.isArray(mc) ? mc : [mc];
      for (let i = 0; i < 7; i++) { const c = cols[i % cols.length]; v.box(5, ty0 - i, tz - 1 - (i > 1 ? 1 : 0) - (i > 4 ? 1 : 0), 6, ty0 - i, tz - (i > 1 ? 1 : 0), c); }
      if (o.longMane) v.box(5, ty0 - 8, tz - 3, 6, ty0 - 7, tz - 3, cols[cols.length - 1]);
    },
  }, o.meta);
}
horse('hest', { col: 'woodRed', mane: 'woodDark', muzzle: 'woodLight', blaze: true, socks: 2, H: 26, L: 25, legH: 8, bodyRx: 3.4, bodyRy: 3.5, bodyZ: 10.5, bodyRz: 7,
  headY: 20, headZ: 19.6, headR: [2.9, 2.8, 3.4], meta: { variants: { c: ['woodRed', 'white', 'brown', 'woodLight'] } } });
horse('ponni', { col: 'woodLight', mane: 'hairBlond', muzzle: 'cream2', blaze: true, socks: 4, longMane: true, H: 22, L: 22, legH: 5, bodyRx: 3.5, bodyRy: 3.3, bodyZ: 9.5, bodyRz: 6,
  headY: 15.6, headZ: 17, headR: [3.0, 2.9, 3.2],
  extraBody(v) { v.box(2, 11, 8, 9, 12, 12, 'rose'); v.box(2, 11, 8, 9, 11, 12, 'gold'); v.box(2, 12, 9, 9, 12, 11, 'rose'); v.box(4, 13, 8, 7, 13, 8, 'rose'); v.box(1, 6, 10, 1, 9, 10, 'gold'); v.box(10, 6, 10, 10, 9, 10, 'gold'); },
  meta: { ride: 1.8 } });
horse('føll', { baby: true, col: 'honey', mane: 'cream', muzzle: 'cream2', blaze: true, socks: 4, H: 22, L: 19, legH: 8, bodyRx: 2.8, bodyRy: 2.8, bodyZ: 8.5, bodyRz: 4.8,
  headY: 16.4, headZ: 14.6, headR: [2.8, 2.8, 3], neckR: 1.7 });
horse('pet_enhjørningføll', { baby: true, col: 'white', mane: ['pink', 'butter', 'mint', 'sky', 'lavender'], hoof: 'gold', muzzle: 'milk', blaze: false, socks: 0, longMane: true, horn: true,
  H: 25, L: 19, legH: 8, bodyRx: 2.8, bodyRy: 2.8, bodyZ: 8.5, bodyRz: 4.8, headY: 16.4, headZ: 14.6, headR: [2.9, 2.8, 3], neckR: 1.7,
  paintBody(v) { v.set(9, 12, 7, 'gem1'); v.set(9, 11, 7, 'gem1'); v.set(9, 11, 6, 'gem1'); v.set(9, 12, 6, 'gem1'); v.set(9, 13, 7, 'gem1'); v.set(9, 12, 8, 'gem1'); v.set(9, 12, 5, 'gem1'); },
  meta: { ride: 2, pet: true } });

/* ================================================================ FARM */
quad('ku', { size: [14, 19, 24], col: 'white',
  body: [8.6, 10, 4, 3.8, 6.8], legs: { x0: 3, zF: 13, zB: 5, h: 6, foot: 'woodDark' },
  head: [12, 17.4, 3.3, 3.1, 2.9], headPivot: [11, 15], tailPivot: [11, 3],
  paintBody(v) { v.paint((x, y, z) => F.U.noise2(x * 0.42 + 3, z * 0.36 + y * 0.25, 5) > 0.6 ? P.black : null); },
  extraBody(v) { v.ellipsoid(6.5, 4.4, 6.5, 1.9, 1.2, 1.9, 'blossom'); v.set(6, 3, 6, 'pink'); v.set(7, 3, 7, 'pink'); v.box(6, 6, 17, 7, 7, 17, 'gold'); v.box(5, 9, 16, 8, 9, 16, 'red'); },
  legPaint(v, o, k, n, x, z) { if (n === 'legBL' || n === 'legFR') v.box(x, 4, z, x + 1, 5, z + 1, 'black'); },
  face(v, o, k) {
    v.box(4, 9, 19, 9, 11, 21, 'blossom'); v.set(5, 10, 21, 'rose'); v.set(8, 10, 21, 'rose');
    eye(v, 5, 13, 1, 2); eye(v, 8, 13, 1, 2);
    front(v, 6, 15, 'black'); front(v, 7, 15, 'black'); front(v, 6, 14, 'black');
    v.set(3, 15, 17, 'cream'); v.set(2, 16, 17, 'cream'); v.set(10, 15, 17, 'cream'); v.set(11, 16, 17, 'cream');
    v.box(1, 13, 16, 2, 13, 17, 'white'); v.box(11, 13, 16, 12, 13, 17, 'white'); v.set(2, 13, 17, 'blossom'); v.set(11, 13, 17, 'blossom');
  },
  tail(v) { v.box(6, 6, 2, 6, 11, 2, 'white'); v.box(6, 4, 2, 7, 5, 3, 'black'); },
}, { react: 'pet' });

quad('kalv', { size: [12, 15, 18], col: 'woodLight',
  body: [6.6, 7.6, 3.1, 2.8, 4.8], legs: { x0: 3, zF: 9, zB: 4, h: 5, foot: 'woodDark' },
  head: [10.6, 13, 3.2, 3, 2.8], headPivot: [8.5, 11.5], tailPivot: [8, 3],
  paintBody(v) { v.paint((x, y, z) => F.U.noise2(x * 0.5 + 9, z * 0.45 + y * 0.3, 2) > 0.58 ? P.white : null); },
  face(v, o, k) {
    v.box(3, 8, 15, 8, 9, 16, 'blossom'); v.set(4, 9, 16, 'rose'); v.set(7, 9, 16, 'rose');
    eye(v, 3, 11, 2, 2); eye(v, 7, 11, 2, 2); front(v, 5, 12, 'white'); front(v, 6, 12, 'white'); front(v, 5, 11, 'white'); front(v, 6, 11, 'white');
    v.box(0, 11, 12, 1, 12, 13, 'woodLight'); v.box(10, 11, 12, 11, 12, 13, 'woodLight'); v.set(1, 11, 13, 'blossom'); v.set(10, 11, 13, 'blossom');
  },
  tail(v) { v.box(5, 5, 2, 5, 8, 2, 'woodLight'); v.set(5, 4, 2, 'cream'); },
});

function sheep(id, o) {
  return quad(id, { size: o.size, col: 'wool',
    body: o.body, legs: o.legs, head: o.head, headPivot: o.hp, tailPivot: o.tp, headCol: o.headCol,
    paintBody(v, oo, k) {
      const b = o.body; const r = F.U.rng(F.U.hashStr(id));
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, e = (r() - 0.25) * 1.6; v.sphere(k.cx + Math.cos(a) * b[2] * 0.85 * Math.cos(e), b[0] + Math.sin(e) * b[3] * 0.85, b[1] + Math.sin(a) * b[4] * 0.85 * Math.cos(e), 1.7, 'wool'); }
      surfSpeck(v, 'wool', 'white', 0.25, 4); surfSpeck(v, 'wool', 'cream', 0.12, 8);
    },
    face(v, oo, k) {
      const fc = o.face, cx = k.cx, h = o.head, ey = Math.round(h[0]);
      // eyes: white with a dark pupil (dark face) or plain black (light face)
      for (const x of o.eyes) { if (fc === 'black') { front(v, x, ey, 'black'); front(v, x, ey + 1, 'white'); } else eye(v, x, ey, 2, 2); }
      front(v, Math.floor(cx), ey - 2, 'pink'); front(v, Math.floor(cx) + 1, ey - 2, 'pink');
      if (fc !== 'black') { front(v, o.eyes[0] - 1, ey - 1, 'blossom'); front(v, o.eyes[1] + 2, ey - 1, 'blossom'); }
      const ez = Math.round(h[1] - 1);
      v.box(o.ears[0], ey + 1, ez, o.ears[0] + 1, ey + 1, ez + 1, fc); v.box(k.W - 2 - o.ears[0], ey + 1, ez, k.W - 1 - o.ears[0], ey + 1, ez + 1, fc);
      v.set(o.ears[0] + 1, ey + 1, ez + 1, 'blossom'); v.set(k.W - 2 - o.ears[0], ey + 1, ez + 1, 'blossom');
      v.sphere(cx, h[0] + h[3] - 0.4, h[1] - 0.8, o.tuft || 2, 'wool'); surfSpeck(v, 'wool', 'white', 0.3, 2);
      if (o.horns) { for (const [x, d] of [[Math.round(cx) - 2, -1], [Math.round(cx) + 1, 1]]) { v.set(x, ey + 3, ez, 'cream2'); v.set(x + d, ey + 4, ez - 1, 'cream2'); v.set(x + d, ey + 4, ez - 2, 'cream2'); } }
      if (o.beard) { v.box(Math.floor(cx), ey - 4, Math.round(h[1] + 1), Math.floor(cx) + 1, ey - 3, Math.round(h[1] + 1), 'cream2'); }
    },
    tail(v, oo, k) { v.sphere(k.cx, o.tp[0], o.tp[1] - 0.6, 1.5, 'wool'); },
  }, o.meta);
}
sheep('sau', { size: [14, 15, 19], body: [7.2, 8.5, 4.6, 4.0, 5.8], legs: { x0: 4, zF: 11, zB: 5, h: 4, c: 'black' },
  head: [9.8, 14.4, 2.8, 3.0, 2.6], hp: [9, 12], tp: [8, 3], face: 'black', headCol: 'black', eyes: [5, 8], ears: [2] });
sheep('lam', { size: [12, 13, 16], body: [5.8, 7, 3.6, 3.1, 4.4], legs: { x0: 3, zF: 9, zB: 4, h: 3, c: 'cream2', foot: 'woodLight' },
  head: [8.6, 11.6, 3.0, 3.0, 2.7], hp: [8, 10], tp: [6, 3], face: 'skin', headCol: 'skin', eyes: [3, 7], ears: [1], tuft: 1.8 });
quad('geit', { size: [12, 17, 18], col: 'cream2',
  body: [7.4, 8, 3.0, 2.8, 5], legs: { x0: 3, zF: 10, zB: 4, h: 5, foot: 'woodDark' },
  head: [11.4, 13.4, 2.8, 3.0, 2.7], headPivot: [9.5, 11.5], tailPivot: [9, 3],
  paintBody(v) { v.paint((x, y, z) => y >= 9 && (z === 7 || z === 8) ? P.woodLight : null); },
  face(v, o, k) {
    eye(v, 4, 11, 1, 2); eye(v, 7, 11, 1, 2); front(v, 5, 9, 'pink'); front(v, 6, 9, 'pink');
    v.box(5, 6, 15, 6, 8, 15, 'cream'); // beard
    v.set(3, 14, 12, 'woodDark'); v.set(3, 15, 11, 'woodDark'); v.set(2, 16, 10, 'woodDark'); v.set(8, 14, 12, 'woodDark'); v.set(8, 15, 11, 'woodDark'); v.set(9, 16, 10, 'woodDark');
    v.box(0, 12, 13, 1, 12, 13, 'cream2'); v.box(10, 12, 13, 11, 12, 13, 'cream2'); v.set(1, 12, 14, 'blossom'); v.set(10, 12, 14, 'blossom');
  },
  tail(v) { v.box(5, 9, 2, 6, 11, 2, 'cream2'); },
});

quad('gris', { size: [13, 14, 18], col: 'blossom',
  body: [5.6, 8, 3.9, 3.7, 5.4], legs: { x0: 3, zF: 11, zB: 4, h: 2, foot: 'pink' },
  head: [7.6, 13.4, 3.5, 3.3, 2.9], headPivot: [7, 12], tailPivot: [6, 2],
  face(v) {
    v.box(4, 5, 15, 8, 7, 16, 'pink'); v.set(5, 6, 17, 'rose'); v.set(7, 6, 17, 'rose'); v.box(5, 5, 17, 7, 7, 17, 'pink'); v.set(5, 6, 17, 'rose'); v.set(7, 6, 17, 'rose');
    eye(v, 4, 8, 1, 2); eye(v, 8, 8, 1, 2); front(v, 3, 7, 'rose'); front(v, 9, 7, 'rose');
    v.box(2, 10, 12, 3, 10, 14, 'pink'); v.box(2, 11, 12, 3, 11, 13, 'pink'); v.set(2, 12, 12, 'pink');
    v.box(9, 10, 12, 10, 10, 14, 'pink'); v.box(9, 11, 12, 10, 11, 13, 'pink'); v.set(10, 12, 12, 'pink');
  },
  tail(v) { v.set(6, 6, 2, 'pink'); v.set(6, 7, 1, 'pink'); v.set(7, 8, 1, 'pink'); v.set(7, 8, 0, 'pink'); v.set(6, 9, 0, 'pink'); v.set(6, 9, 1, 'pink'); },
}, { variants: { c: ['blossom', 'peach'] } });

/* ================================================================ SMALL FURRY */
// sitting bunny: parts head (ears), legFL legFR (front paws), legBL legBR (big hind feet), tail
quad('kanin', { size: [10, 18, 13], col: 'wool',
  body: [4.4, 5.4, 3.3, 3.8, 3.8], legs: { x0: 2, zF: 8, zB: 2, h: 1, d: 2, w: 2 },
  head: [9.2, 7.4, 3.4, 3.1, 3.0], headPivot: [7.5, 6.5], tailPivot: [3, 1.5],
  paintBody(v) { v.paint((x, y, z) => z >= 7 && y <= 5 && x >= 3 && x <= 6 ? P.white : null); v.ellipsoid(1.6, 2.4, 4, 1.4, 2.2, 2.6, 'wool'); v.ellipsoid(7.4, 2.4, 4, 1.4, 2.2, 2.6, 'wool'); },
  legPaint(v, o, k, n, x, z) { if (n === 'legBL' || n === 'legBR') { v.box(x, 0, z, x + 1, 0, z + 4, 'wool'); v.set(x, 0, z + 4, 'blossom'); v.set(x + 1, 0, z + 4, 'blossom'); } },
  face(v, o, k) {
    const c = pick(o, 'c', 'wool');
    for (const x0 of [1, 6]) { v.box(x0, 11, 6, x0 + 2, 16, 7, c); v.box(x0 + 1, 12, 7, x0 + 1, 15, 7, 'blossom'); v.set(x0, 16, 6, 0); v.set(x0 + 2, 16, 6, 0); v.set(x0 + 2, 16, 7, 0); v.set(x0, 16, 7, 0); }
    eye(v, 2, 9, 2, 2); eye(v, 6, 9, 2, 2);
    front(v, 4, 8, 'pink'); front(v, 5, 8, 'pink'); front(v, 4, 7, 'white'); front(v, 5, 7, 'white');
    front(v, 1, 8, 'blossom'); front(v, 8, 8, 'blossom');
  },
  tail(v) { v.sphere(4.5, 3, 0.8, 1.3, 'white'); },
}, { rig: 'hop', variants: { c: ['wool', 'woodLight', 'hairGrey'] } });

quad('mus', { size: [9, 9, 15], col: 'grey',
  body: [2.8, 6.4, 2.6, 2.5, 3.6], legs: { x0: 2, zF: 8, zB: 4, h: 0, w: 1, d: 1, foot: 'blossom' },
  head: [3.6, 10.2, 2.5, 2.3, 2.6], headPivot: [3, 9], tailPivot: [2, 3],
  paintBody(v) { v.paint((x, y, z) => y <= 1 && z >= 6 ? P.silver : null); },
  face(v, o, k) {
    v.box(4, 3, 13, 4, 3, 13, 'grey'); v.box(3, 2, 12, 5, 4, 12, 'grey'); v.set(4, 3, 14, 'pink');
    front(v, 2, 4, 'black'); front(v, 6, 4, 'black'); front(v, 2, 5, 'white'); front(v, 6, 5, 'white');
    for (const x0 of [0, 6]) { v.box(x0, 5, 9, x0 + 2, 7, 9, 'grey'); v.set(x0 + 1, 6, 10, 'blossom'); v.set(x0, 7, 9, 0); v.set(x0 + 2, 7, 9, 0); v.set(x0 + 1, 8, 9, 'grey'); }
  },
  tail(v) { v.set(4, 2, 2, 'blossom'); v.set(4, 2, 1, 'blossom'); v.set(4, 3, 0, 'blossom'); v.set(4, 4, 0, 'blossom'); v.set(4, 5, 1, 'blossom'); },
}, { rig: 'quad' });

// marsvin: round loaf, two-tone, tiny feet (rig 'hop')
quad('pet_marsvin', { size: [10, 9, 13], col: 'woodLight',
  body: [3.8, 5.6, 3.6, 3.4, 4.6], legs: { x0: 2, zF: 8, zB: 3, h: 0, w: 1, d: 1, foot: 'blossom' },
  head: [4.6, 9.4, 3.2, 3, 2.6], headPivot: [3, 8], tailPivot: [3, 1],
  paintBody(v) { v.paint((x, y, z) => (z <= 4 && y >= 3) || (x >= 6 && z >= 4 && z <= 6) ? P.white : null); },
  face(v) { eye(v, 2, 5, 2, 2); eye(v, 6, 5, 2, 2); front(v, 4, 4, 'white'); front(v, 5, 4, 'white'); front(v, 4, 3, 'pink'); front(v, 5, 3, 'pink');
    v.box(1, 7, 8, 2, 7, 9, 'peach'); v.box(7, 7, 8, 8, 7, 9, 'peach'); front(v, 1, 4, 'blossom'); front(v, 8, 4, 'blossom'); v.box(3, 7, 10, 6, 8, 11, 'white'); },
}, { rig: 'hop', pet: true });

// pinnsvin: spiky dome + pointy face
quad('pet_pinnsvin', { size: [11, 9, 14], col: 'woodDark',
  body: [3.6, 5.6, 4, 3.6, 4.8], legs: { x0: 2, zF: 8, zB: 3, h: 0, w: 2, d: 1, foot: 'skin2' },
  head: [3.6, 9.6, 2.8, 2.5, 2.4], headCol: 'cream2', headPivot: [3, 8.5], tailPivot: [2, 1],
  paintBody(v, o, k) {
    v.paint((x, y, z, c) => exposed(v, x, y, z) && H(x, y, z) < 0.5 ? P.brown : null);
    for (let i = 0; i < 70; i++) { const x = Math.floor(H(i, 1, 4) * 11), y = 2 + Math.floor(H(i, 2, 4) * 7), z = Math.floor(H(i, 3, 4) * 10); if (!v.get(x, y, z) && (v.get(x, y - 1, z) || v.get(x - 1, y, z) || v.get(x + 1, y, z) || v.get(x, y, z - 1))) v.set(x, y, z, i % 3 ? 'woodDark' : 'cream2'); }
    v.paint((x, y, z) => y <= 1 && z >= 6 ? P.cream2 : null);
  },
  face(v) { v.box(5, 2, 12, 5, 3, 13, 'cream2'); v.box(5, 3, 14, 5, 3, 14, 'black');
    front(v, 3, 4, 'black'); front(v, 7, 4, 'black'); front(v, 3, 5, 'white'); front(v, 7, 5, 'white'); front(v, 2, 3, 'blossom'); front(v, 8, 3, 'blossom');
    v.set(3, 6, 9, 'skin2'); v.set(7, 6, 9, 'skin2'); },
}, { rig: 'quad', pet: true });

// skilpadde: patterned shell, head pokes out at the front
quad('pet_skilpadde', { size: [12, 9, 16], col: 'leaf',
  body: [3, 7.5, 4.6, 3.6, 5.4], legs: { x0: 1, zF: 10, zB: 3, h: 1, w: 2, d: 2, c: 'leaf2' },
  head: [3.8, 13.4, 2.1, 2.1, 2.2], headCol: 'leaf2', headPivot: [3, 11.5], tailPivot: [2, 2],
  paintBody(v) {
    v.paint((x, y, z) => y <= 1 ? P.hay : null);
    v.paint((x, y, z, c) => c === P.leaf && exposed(v, x, y, z) && ((Math.round(x / 2.2) + Math.round(z / 2.6)) % 2 === 0) ? P.leafDark : null);
    v.paint((x, y, z, c) => (c === P.leaf || c === P.leafDark) && y === 2 ? P.honey : null);
  },
  face(v) { front(v, 4, 4, 'black'); front(v, 7, 4, 'black'); front(v, 4, 5, 'white'); front(v, 7, 5, 'white'); front(v, 5, 3, 'coral'); front(v, 6, 3, 'coral'); front(v, 3, 3, 'blossom'); front(v, 8, 3, 'blossom'); },
  tail(v) { v.box(5, 1, 0, 6, 1, 1, 'leaf2'); },
}, { rig: 'quad', pet: true });

/* ================================================================ BIRDS */
bird('and', { size: [11, 13, 14], col: 'white',
  body: [4.6, 6, 3.3, 2.8, 4.6], head: [9.2, 9.4, 2.7], headPivot: [7, 8.5],
  face(v) { v.box(3, 8, 11, 7, 8, 13, 'orange'); v.box(4, 7, 11, 6, 7, 12, 'orange'); eye(v, 3, 9, 1, 2); eye(v, 7, 9, 1, 2); front(v, 2, 8, 'blossom'); front(v, 8, 8, 'blossom'); },
  wing: { x: 8, y0: 3, y1: 6, z0: 2, z1: 8, drop: 1, tip: 'silver' },
  legs: { xs: [3, 7], z: 6, h: 1, c: 'orange', webW: 1, foot: 2 },
  tail(v) { v.box(4, 5, 1, 6, 6, 1, 'white'); v.set(5, 7, 0, 'white'); }, tailPivot: [6, 2],
});
bird('pet_andunge', { size: [9, 10, 10], col: 'yellow',
  body: [3.4, 4.4, 2.8, 2.4, 3.4], head: [7, 6.4, 2.6], headPivot: [5, 5.5],
  face(v) { v.box(3, 6, 8, 5, 6, 9, 'orange'); eye(v, 2, 7, 1, 2); eye(v, 6, 7, 1, 2); front(v, 1, 6, 'blossom'); front(v, 7, 6, 'blossom'); v.set(4, 10 - 1, 6, 'yellow'); },
  wing: { x: 7, y0: 2, y1: 4, z0: 2, z1: 5, tip: 'butter' },
  legs: { xs: [3, 5], z: 4, h: 0, c: 'orange', webW: 1, foot: 1 },
  tail(v) { v.set(4, 4, 0, 'yellow'); }, tailPivot: [4, 1],
}, { pet: true });
bird('gås', { size: [12, 19, 17], col: 'silver',
  body: [6, 6.6, 3.6, 3.2, 5.4], neck: [[8, 10], [12, 11.5], [15, 11.8]], neckR: 1.5, neckCol: 'silver', head: [15.6, 12.4, 2.4, 2.2, 2.5], headPivot: [8, 10],
  paintBody(v) { v.paint((x, y, z) => y <= 4 ? P.white : y >= 7 && z <= 6 && (z % 2 === 0) ? P.grey : null); },
  face(v) { v.box(5, 14, 15, 6, 15, 16, 'orange'); v.set(5, 15, 15, 'orange'); eye(v, 3, 16, 1, 2); eye(v, 8, 16, 1, 2); },
  wing: { x: 9, y0: 4, y1: 8, z0: 2, z1: 9, drop: 2, tip: 'grey', tipN: 2 },
  legs: { xs: [4, 7], z: 7, h: 2, c: 'orange', webW: 1, foot: 2 },
  tail(v) { v.box(5, 6, 0, 6, 7, 1, 'grey'); }, tailPivot: [7, 2],
});
bird('høne', { size: [11, 15, 13], col: 'woodLight',
  body: [5.6, 6, 3.3, 3.4, 4.2], head: [10.4, 8.8, 2.5], headPivot: [8, 7.5],
  paintBody(v) { surfSpeck(v, 'woodLight', 'cream2', 0.12, 5); },
  face(v) { v.box(5, 13, 7, 5, 13, 9, 'red'); v.set(5, 14, 8, 'red'); v.box(5, 7, 10, 5, 8, 10, 'red'); v.box(5, 9, 11, 5, 10, 12, 'yellow'); v.set(5, 10, 11, 'yellow');
    eye(v, 3, 10, 1, 2); eye(v, 7, 10, 1, 2); },
  wing: { x: 8, y0: 4, y1: 7, z0: 3, z1: 8, drop: 1, tip: 'brown' },
  legs: { xs: [4, 6], z: 6, h: 2, c: 'yellow', foot: 1 },
  tail(v) { v.box(4, 7, 1, 6, 10, 1, 'brown'); v.box(4, 9, 0, 6, 11, 0, 'woodDark'); }, tailPivot: [7, 2],
});
bird('hane', { size: [12, 19, 14], col: 'woodRed',
  body: [6.6, 6.4, 3.4, 3.6, 4.2], head: [11.8, 9.2, 2.5], headCol: 'orange', headPivot: [9, 8],
  paintBody(v) { v.paint((x, y, z) => y >= 8 && z >= 8 ? P.orange : y <= 4 ? P.leafDark : null); },
  face(v) { v.box(5, 14, 7, 6, 14, 10, 'red'); v.set(5, 15, 7, 'red'); v.set(6, 15, 9, 'red'); v.set(5, 16, 8, 'red'); v.box(5, 8, 11, 6, 9, 11, 'red'); v.box(5, 10, 12, 6, 11, 12, 'yellow'); v.set(5, 11, 13, 'yellow');
    eye(v, 3, 12, 1, 2); eye(v, 8, 12, 1, 2); },
  wing: { x: 9, y0: 5, y1: 8, z0: 3, z1: 8, drop: 1, tip: 'leafDark' },
  legs: { xs: [4, 7], z: 6, h: 3, c: 'yellow', foot: 1 },
  tail(v) { const c = ['leafDark', 'teal', 'navySoft', 'leafDark']; for (let i = 0; i < 4; i++) { v.box(5, 7 + i * 2, 2 - (i > 1 ? 1 : 0), 6, 9 + i * 2, 2 - (i > 1 ? 1 : 0), c[i]); } v.box(5, 15, 1, 6, 16, 2, 'teal'); v.box(5, 14, 3, 6, 14, 3, 'leafDark'); }, tailPivot: [8, 3],
});
bird('svane', { size: [12, 19, 18], col: 'white',
  body: [5.4, 7, 3.7, 3.0, 5.6], neck: [[7, 11], [10, 12.6], [13, 12], [15.5, 11]], neckR: 1.4, head: [16.2, 12, 1.9, 1.9, 2.4], headPivot: [7, 10.5],
  face(v) { v.box(5, 15, 14, 6, 16, 15, 'orange'); v.box(5, 16, 13, 6, 16, 13, 'black'); eye(v, 4, 16, 1, 2); eye(v, 7, 16, 1, 2); },
  wing: { x: 9, y0: 4, y1: 8, z0: 2, z1: 10, drop: 2, thick: true },
  legs: { xs: [4, 7], z: 7, h: 1, c: 'black', webW: 1, foot: 2 },
  tail(v) { v.box(5, 6, 0, 6, 8, 1, 'white'); }, tailPivot: [7, 2],
});
bird('due', { size: [12, 14, 14], col: 'silver',
  body: [5.4, 6.4, 3.6, 3.2, 4.6], head: [9.8, 9.4, 2.7], headPivot: [7.5, 8.5],
  paintBody(v) { v.paint((x, y, z) => y >= 6 && z >= 8 ? (y >= 8 ? P.mint : P.lavender) : y <= 3 ? P.white : null); },
  face(v) { eye(v, 3, 10, 2, 2); eye(v, 7, 10, 2, 2); v.box(5, 9, 12, 6, 9, 13, 'coral'); v.set(5, 10, 12, 'white'); v.set(6, 10, 12, 'white'); front(v, 3, 9, 'blossom'); front(v, 8, 9, 'blossom'); },
  wing: { x: 9, y0: 3, y1: 7, z0: 2, z1: 9, drop: 1, tip: 'grey', tipN: 2, paint(v, o, x) { for (const z of [4, 5, 6]) v.set(x, 6, z, 'grey'); for (const z of [5, 6, 7]) v.set(x, 4, z, 'grey'); } },
  legs: { xs: [4, 7], z: 6, h: 1, c: 'coral', foot: 1 },
  tail(v) { v.box(4, 4, 0, 7, 5, 1, 'grey'); v.box(4, 4, 0, 7, 4, 0, 'navySoft'); }, tailPivot: [6, 2],
});
bird('pet_papegøye', { size: [11, 19, 11], col: 'red',
  body: [8, 5, 3, 4.4, 3], head: [13.6, 5.6, 2.8, 2.8, 2.8], headPivot: [11.5, 5],
  paintBody(v) { v.paint((x, y, z) => y <= 5 ? P.red : null); },
  face(v) { v.box(4, 12, 8, 6, 14, 9, 'cream'); v.box(4, 11, 9, 6, 12, 9, 'black'); v.set(5, 13, 10, 'cream'); v.set(5, 12, 10, 'cream');
    v.paint((x, y, z, c) => c === P.red && z >= 7 && y >= 13 && (x === 2 || x === 8) ? P.white : null); front(v, 2, 14, 'black'); front(v, 8, 14, 'black'); front(v, 3, 14, 'black'); front(v, 7, 14, 'black'); front(v, 3, 15, 'white'); front(v, 7, 15, 'white'); },
  wing: { x: 8, y0: 4, y1: 11, z0: 2, z1: 7, drop: 3, c: 'blue', tip: 'yellow', tipN: 0, paint(v, o, x) { for (let z = 3; z <= 6; z++) v.set(x, 9, z, 'yellow'); for (let z = 2; z <= 6; z++) v.set(x, 10, z, 'leaf'); } },
  legs: { xs: [4, 6], z: 5, h: 3, c: 'grey', foot: 1 },
  tail(v) { v.box(4, 0, 1, 6, 4, 1, 'blue'); v.box(5, 0, 0, 5, 2, 0, 'red'); }, tailPivot: [5, 2],
}, { pet: true });
bird('ugle', { size: [11, 15, 10], col: 'woodLight',
  body: [6.2, 4.6, 4.2, 5.6, 3.6], head: [11, 5.2, 4, 3.4, 3.2], headPivot: [9, 5],
  paintBody(v) { v.paint((x, y, z) => z >= 6 && y >= 2 && y <= 8 && x >= 3 && x <= 7 ? ((x + y) % 3 === 0 ? P.woodLight : P.cream2) : null); },
  face(v) {
    for (const cxe of [3, 7]) { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) front(v, cxe + dx, 11 + dy, Math.abs(dx) + Math.abs(dy) === 2 ? 'cream2' : 'white'); front(v, cxe, 11, 'black'); front(v, cxe, 12, 'black'); }
    front(v, 5, 10, 'honey'); front(v, 5, 9, 'honey', 0);
    v.box(1, 13, 4, 1, 15, 5, 'brown'); v.box(9, 13, 4, 9, 15, 5, 'brown'); v.set(2, 14, 5, 'brown'); v.set(8, 14, 5, 'brown');
  },
  wing: { x: 9, y0: 3, y1: 8, z0: 2, z1: 6, c: 'brown', tip: 'woodDark' },
  legs: { xs: [3, 7], z: 6, h: 0, c: 'honey', webW: 1, foot: 1 },
}, { rig: 'bird' });
bird('fugl', { size: [12, 13, 13], col: 'blue',
  body: [5, 6, 3.6, 3.3, 4.2], head: [9.4, 8.4, 2.9], headPivot: [7.5, 7.5],
  paintBody(v) { v.paint((x, y, z, c) => c === P.blue && z >= 7 && y <= 6 && Math.abs(x - 5.5) <= 2.6 ? P.butter : null); },
  face(v) { eye(v, 3, 9, 2, 2); eye(v, 7, 9, 2, 2); v.box(5, 8, 11, 6, 8, 12, 'orange'); v.set(5, 7, 11, 'orange'); v.set(6, 7, 11, 'orange');
    front(v, 2, 8, 'blossom'); front(v, 9, 8, 'blossom'); v.set(5, 12, 7, 'blue'); v.set(6, 12, 7, 'sky'); v.set(5, 12, 6, 'sky'); },
  wing: { x: 9, y0: 3, y1: 7, z0: 1, z1: 7, drop: 1, c: 'navySoft', tip: 'sky', tipN: 1 },
  legs: { xs: [4, 7], z: 6, h: 1, c: 'orange', foot: 1 },
  tail(v) { v.box(5, 5, 0, 6, 7, 1, 'navySoft'); v.set(5, 8, 0, 'blue'); v.set(6, 8, 0, 'blue'); }, tailPivot: [6, 2],
});
bird('måke', { size: [13, 14, 17], col: 'white',
  body: [5.4, 7.6, 3.6, 3.2, 5.6], head: [9.8, 11.8, 2.8], headPivot: [8, 10],
  face(v) { v.box(6, 9, 14, 6, 10, 16, 'yellow'); v.set(6, 9, 16, 'red'); eye(v, 4, 10, 1, 2); eye(v, 8, 10, 1, 2); front(v, 4, 9, 'blossom'); front(v, 8, 9, 'blossom'); },
  wing: { x: 10, y0: 4, y1: 8, z0: 1, z1: 10, drop: 1, c: 'silver', tip: 'black', tipN: 2, thick: true, paint(v, o, x) { v.set(x, 6, 1, 'white'); v.set(x, 7, 2, 'white'); } },
  legs: { xs: [4, 8], z: 7, h: 1, c: 'coral', webW: 1, foot: 1 },
  tail(v) { v.box(5, 6, 0, 7, 7, 2, 'white'); v.set(6, 7, 0, 'silver'); }, tailPivot: [6, 2],
});


/* ---------------------------------------------------------- more hoofed friends (horse rig) */
horse('esel', { col: 'silver', mane: 'grey', muzzle: 'white', ears: 'long', earTip: 'grey', H: 23, L: 21, legH: 6, bodyRx: 3.3, bodyRy: 3.2, bodyZ: 9.5, bodyRz: 5.8,
  headY: 16.2, headZ: 16.6, headR: [2.9, 2.8, 3.2], paintBody(v) { v.paint((x, y, z, c) => y <= 7 && c === P.silver ? P.white : null); } });
horse('sebra', { col: 'white', mane: ['black', 'white'], muzzle: 'grey', H: 24, L: 23, legH: 7, bodyRx: 3.3, bodyRy: 3.3, bodyZ: 10, bodyRz: 6.4,
  headY: 18, headZ: 18, headR: [2.9, 2.8, 3.3],
  paintBody(v) { v.paint((x, y, z, c) => c === P.white && ((z + Math.round(y * 0.6)) % 3 === 0) ? P.black : null); },
  legPaint(v) {},
  faceExtra(v) { v.paint((x, y, z, c) => c === P.white && y > 13 && (y + Math.round(z * 0.4)) % 3 === 0 ? P.black : null); } });
horse('giraff', { col: 'honey', mane: 'woodRed', muzzle: 'cream2', H: 40, L: 22, legH: 12, bodyRx: 3.2, bodyRy: 3.4, bodyZ: 9.5, bodyRz: 5.6,
  headY: 34, headZ: 17.6, headR: [2.7, 2.6, 3.1], neckR: 1.9, hoof: 'woodDark',
  paintBody(v) { v.paint((x, y, z, c) => c === P.honey && F.U.noise2(x * 0.7 + z * 0.2, y * 0.6 + z * 0.5, 4) > 0.58 ? P.woodRed : null); },
  faceExtra(v, k) { v.paint((x, y, z, c) => c === P.honey && y < k.hy - 3 && F.U.noise2(x * 0.7 + z * 0.3, y * 0.55, 8) > 0.6 ? P.woodRed : null);
    for (const x of [4, 7]) { v.box(x, k.ty + 1, k.ez - 1, x, k.ty + 3, k.ez - 1, 'honey'); v.set(x, k.ty + 4, k.ez - 1, 'woodDark'); } } });
horse('lama', { col: 'cream', mane: 'cream', muzzle: 'cream2', ears: 'long', earTip: 'pink', noMane: true, H: 28, L: 18, legH: 8, bodyRx: 3.2, bodyRy: 3.2, bodyZ: 8.5, bodyRz: 5,
  headY: 22, headZ: 14.4, headR: [2.5, 2.6, 2.8], neckR: 2.1,
  paintBody(v) { surfSpeck(v, 'cream', 'white', 0.3, 3); },
  extraBody(v) { v.box(2, 11, 6, 9, 12, 11, 'teal'); v.box(2, 11, 6, 9, 11, 11, 'pink'); v.set(1, 9, 8, 'yellow'); v.set(10, 9, 8, 'yellow'); v.set(1, 10, 8, 'pink'); v.set(10, 10, 8, 'pink'); },
  faceExtra(v) { surfSpeck(v, 'cream', 'white', 0.25, 5); },
  tailFn(v, k) { v.sphere(5.5, k.by + 1, k.bz - k.brz + 0.6, 1.6, 'cream'); } });
horse('kamel', { col: 'woodLight', mane: 'wood', muzzle: 'cream2', noMane: true, H: 30, L: 24, legH: 11, bodyRx: 3.3, bodyRy: 3.2, bodyZ: 10, bodyRz: 6,
  headY: 22, headZ: 20.2, headR: [2.4, 2.4, 3.2], neckR: 1.8,
  extraBody(v) { v.ellipsoid(5.5, 17.6, 6.4, 3, 4, 2.8, 'woodLight'); v.ellipsoid(5.5, 17.6, 13.6, 3, 4, 2.8, 'woodLight'); v.paint((x, y, z, c) => c === P.woodLight && y >= 20 ? P.wood : null); v.box(2, 15, 9, 9, 16, 11, 'red'); v.box(2, 15, 9, 9, 15, 11, 'gold'); v.set(1, 12, 10, 'yellow'); v.set(10, 12, 10, 'yellow'); },
  tailFn(v, k) { v.box(5, k.by - 4, k.bz - k.brz, 5, k.by + 1, k.bz - k.brz, 'woodLight'); v.set(5, k.by - 5, k.bz - k.brz, 'woodDark'); } });
horse('elg', { col: 'brown', mane: 'woodDark', muzzle: 'woodDark', noMane: true, H: 30, L: 25, legH: 10, bodyRx: 3.6, bodyRy: 3.8, bodyZ: 10.5, bodyRz: 6.8,
  headY: 21, headZ: 19.6, headR: [2.8, 2.7, 3.5],
  faceExtra(v, k) { // broad friendly antlers + chin bell
    for (const [x0, d] of [[3, -1], [8, 1]]) {
      v.box(x0, k.ty + 1, k.ez, x0, k.ty + 2, k.ez, 'cream2');
      for (let i = 0; i <= 2; i++) { const x = x0 + d * i; v.box(x, k.ty + 3, k.ez - 2, x, k.ty + 4 + (i === 2 ? 1 : 0), k.ez + 1, 'cream2'); }
      for (const z of [k.ez - 2, k.ez + 1]) { v.set(x0 + d * 2, k.ty + 6, z, 'cream2'); v.set(x0 + d, k.ty + 5, z, 'cream2'); }
      v.set(x0 + d * 2, k.ty + 6, k.ez - 1, 'cream'); }
    v.box(5, Math.round(k.hy) - 5, Math.round(k.hz), 6, Math.round(k.hy) - 4, Math.round(k.hz), 'woodDark'); },
  tailFn(v, k) { v.box(5, k.by, k.bz - k.brz, 6, k.by + 1, k.bz - k.brz, 'brown'); } });
horse('rein', { col: 'woodLight', mane: 'cream', muzzle: 'cream2', noMane: true, H: 27, L: 22, legH: 8, bodyRx: 3.2, bodyRy: 3.2, bodyZ: 9.5, bodyRz: 6,
  headY: 18.6, headZ: 17.4, headR: [2.7, 2.6, 3.1],
  paintBody(v, o, k) { v.paint((x, y, z, c) => y <= 9 ? P.cream : null); },
  faceExtra(v, k) {
    const fz = Math.round(k.hz + 3.4); v.box(5, Math.round(k.hy) - 2, fz, 6, Math.round(k.hy) - 1, fz, 'red'); // a shiny red nose
    for (const [x0, d] of [[4, -1], [7, 1]]) { v.box(x0, k.ty + 1, k.ez, x0, k.ty + 3, k.ez, 'cream2'); v.box(x0 + d, k.ty + 3, k.ez - 1, x0 + 2 * d, k.ty + 3, k.ez - 1, 'cream2'); v.box(x0 + 2 * d, k.ty + 4, k.ez - 1, x0 + 2 * d, k.ty + 6, k.ez - 1, 'cream2'); v.box(x0 + d, k.ty + 5, k.ez - 1, x0 + d, k.ty + 5, k.ez, 'cream2'); v.set(x0, k.ty + 4, k.ez, 'cream2'); v.set(x0, k.ty + 5, k.ez, 'cream2'); }
    v.box(4, Math.round(k.nb[0]) + 1, Math.round(k.nb[1]) + 1, 7, Math.round(k.nb[0]) + 3, Math.round(k.nb[1]) + 2, 'cream'); },
  tailFn(v, k) { v.box(5, k.by, k.bz - k.brz, 6, k.by + 1, k.bz - k.brz, 'white'); } });

/* ---------------------------------------------------------- fox & lion (cat rig) */
quad('rev', { size: [10, 15, 20], col: 'orange',
  body: [5.4, 8.4, 2.8, 2.5, 4.6], legs: { x0: 2, zF: 11, zB: 5, h: 3, foot: 'black', footH: 2 },
  head: [9.4, 13.6, 3.5, 3.0, 3.0], headPivot: [7, 12], tailPivot: [6, 4],
  paintBody(v, o) { v.paint((x, y, z) => z >= 11 && y <= 5 ? P.white : null); if (pick(o, 'c', 'orange') === 'snow') v.paint((x, y, z, c) => c === P.snow && y >= 9 && z <= 11 ? P.steel : null); },   // fjellrev: soft grey saddle so she shows on snow
  face(v, o, k) {
    const c = pick(o, 'c', 'orange'), snow = c !== 'orange';   // WP5: c:'snow' = fjellrev (arctic fox)
    v.box(3, 7, 15, 6, 9, 17, snow ? 'white' : 'white'); v.box(4, 9, 17, 5, 9, 18, 'black');
    eye(v, 3, 10, snow ? 2 : 1, 2); eye(v, snow ? 5 : 6, 10, snow ? 2 : 1, 2);
    earTri(v, 1, 12, 12, 1, c, snow ? 'blossom' : 'white'); earTri(v, 8, 12, 12, -1, c, snow ? 'blossom' : 'white'); v.set(1, 14, 12, snow ? 'silver' : 'black'); v.set(8, 14, 12, snow ? 'silver' : 'black');
    front(v, 2, 9, 'white'); front(v, 7, 9, 'white'); front(v, 2, 8, 'blossom'); front(v, 7, 8, 'blossom');
  },
  tail(v, o) { const c0 = pick(o, 'c', 'orange'), c = c0 === 'snow' ? 'steel' : c0; v.ellipsoid(4.5, 6.6, 1.6, 1.8, 2.2, 2.4, c); v.ellipsoid(4.5, 8.4, 0.8, 1.5, 1.8, 1.4, c); v.paint((x, y, z, cc) => cc === P[c] && z <= 3 && y >= 9 ? P.white : null); },
  legPaint(v, o, k, n, x, z) { if (pick(o, 'c', 'orange') !== 'orange') v.box(x, 0, z, x + 1, 1, z + 1, 'silver'); },
}, { variants: { c: ['orange', 'snow'] } });
quad('løve', { size: [14, 17, 21], col: 'honey',
  body: [6, 8.6, 3.4, 3.0, 5.0], legs: { x0: 3, zF: 11, zB: 5, h: 4, foot: 'cream' },
  head: [11, 14.4, 3.4, 3.1, 3.0], headPivot: [9, 12.5], tailPivot: [8, 4],
  face(v, o, k) {
    // mane ring behind the face
    for (let z = 9; z <= 16; z++) for (let y = 5; y < 17; y++) for (let x = 0; x < 14; x++) {
      const q = ((x - k.cx) / 5.9) ** 2 + ((y - 11.2) / 5.4) ** 2 + ((z - 13.2) / 3.6) ** 2;
      if (q <= 1 && !v.get(x, y, z) && !(z >= 15 && y <= 10 && Math.abs(x - k.cx) <= 3)) v.set(x, y, z, H(x, y * 3, z) < 0.3 ? 'woodRed' : 'orange');
    }
    v.box(5, 8, 17, 8, 10, 18, 'cream'); v.box(6, 10, 18, 7, 10, 18, 'woodDark'); v.set(6, 8, 18, 'pink'); v.set(7, 8, 18, 'pink');
    eye(v, 4, 11, 1, 2); eye(v, 9, 11, 1, 2); front(v, 4, 10, 'blossom'); front(v, 9, 10, 'blossom');
    v.box(3, 14, 13, 3, 15, 13, 'honey'); v.box(10, 14, 13, 10, 15, 13, 'honey');
  },
  tail(v) { v.box(6, 7, 3, 7, 7, 3, 'honey'); v.box(6, 7, 2, 7, 11, 2, 'honey'); v.box(6, 12, 1, 7, 13, 2, 'woodRed'); },
});

/* ---------------------------------------------------------- sitting friends: ape, panda, koala, ekorn (parts head, armL, armR, tail) */
function sitter(id, S) {
  const [W, Hh, L] = S.size, cx = (W - 1) / 2, k = { W, H: Hh, L, cx, S };
  const b = S.body, h = S.head, a = S.arms;
  const parts = {
    head: { pivot: [W / 2, S.headPivot[0], S.headPivot[1]], build(v, o) { v.ellipsoid(cx, h[0], h[1], h[2], h[3], h[4], S.headCol || S.col); if (S.face) S.face(v, o, k); } },
    armL: { pivot: [W / 2 + a.dx, a.y, a.z], build(v) { const x = Math.round(cx + a.dx + 0.5); v.box(x, a.y - a.len, a.z - 1, x + 1, a.y, a.z, S.armCol || S.col); if (a.hand) v.box(x, a.y - a.len, a.z - 1, x + 1, a.y - a.len, a.z, a.hand); } },
    armR: { pivot: [W / 2 - a.dx, a.y, a.z], build(v) { const x = Math.round(cx - a.dx - 1.5); v.box(x, a.y - a.len, a.z - 1, x + 1, a.y, a.z, S.armCol || S.col); if (a.hand) v.box(x, a.y - a.len, a.z - 1, x + 1, a.y - a.len, a.z, a.hand); } },
  };
  if (S.tail) parts.tail = { pivot: [W / 2, S.tailPivot[0], S.tailPivot[1]], build(v, o) { S.tail(v, o, k); } };
  return V.def(id, { size: S.size, scale: S16, build(v, o) {
    v.ellipsoid(cx, b[0], b[1], b[2], b[3], b[4], S.col);
    if (S.belly) v.paint((x, y, z, c) => c === P[S.col] && z >= b[1] + b[4] * 0.45 && Math.abs(x - cx) < b[2] * 0.7 ? P[S.belly] : null);
    // feet sticking forward
    for (const x of [Math.round(cx - 2.5), Math.round(cx + 1.5)]) v.box(x, 0, Math.round(b[1] + b[4] - 1), x + 1, 1, Math.round(b[1] + b[4] + 1), S.feet || S.col);
    if (S.extraBody) S.extraBody(v, o, k);
  }, parts, meta: { group: 'dyr', rig: 'sit', react: 'pet', family: 'sitter', by: 'models2' } });
}
sitter('ape', { size: [12, 16, 13], col: 'brown', belly: 'peach', feet: 'peach',
  body: [4.4, 6, 3.2, 4, 3], head: [10.6, 6.8, 3.4, 3.1, 3], headPivot: [8, 6.5],
  arms: { dx: 3.2, y: 7.5, z: 7, len: 5, hand: 'peach' },
  face(v) {
    v.ellipsoid(5.5, 10, 9, 2.6, 2.2, 1, 'peach'); v.box(4, 12, 9, 7, 12, 9, 'peach');
    eye(v, 4, 11, 1, 2, false); eye(v, 7, 11, 1, 2, false); v.set(5, 9, 10, 'woodDark'); v.set(6, 9, 10, 'woodDark'); v.box(5, 8, 10, 6, 8, 10, 'coral');
    for (const x of [1, 10]) { v.box(x, 10, 6, x, 12, 7, 'brown'); v.set(x, 11, 7, 'peach'); }
    v.set(5, 14, 6, 'brown'); v.set(6, 14, 5, 'brown');
  },
  tail(v) { v.box(5, 2, 1, 6, 2, 3, 'brown'); v.box(5, 3, 0, 6, 7, 0, 'brown'); v.box(5, 8, 1, 6, 8, 1, 'brown'); v.set(5, 7, 2, 'brown'); v.set(6, 7, 2, 'brown'); }, tailPivot: [2, 3],
  extraBody(v) { v.box(9, 3, 9, 10, 4, 10, 'yellow'); v.box(10, 5, 9, 10, 6, 9, 'yellow'); v.set(10, 7, 9, 'woodDark'); },
});
sitter('panda', { size: [14, 17, 13], col: 'white', armCol: 'black', feet: 'black',
  body: [5, 6, 4.2, 4.8, 3.8], head: [12, 6.4, 4, 3.6, 3.4], headPivot: [9, 6],
  arms: { dx: 3.8, y: 8, z: 8, len: 5 },
  extraBody(v) { v.paint((x, y, z, c) => c === P.white && y >= 7 && y <= 8 ? P.black : null); v.line(10, 6, 9, 12, 12, 10, 'leaf'); v.set(12, 12, 11, 'leaf2'); v.set(11, 10, 11, 'leaf2'); },
  face(v) {
    for (const [x0, d] of [[3, 0], [8, 0]]) { v.box(x0, 11, 9, x0 + 2, 13, 9, 'black'); }
    for (const x of [4, 9]) { front(v, x, 12, 'black'); } v.set(4, 12, 10, 'white'); v.set(9, 12, 10, 'white'); v.set(4, 13, 10, 'black'); v.set(9, 13, 10, 'black');
    v.box(6, 10, 10, 7, 10, 10, 'black'); v.set(6, 9, 10, 'pink'); v.set(7, 9, 10, 'pink');
    v.sphere(2.4, 15, 5.6, 1.6, 'black'); v.sphere(10.6, 15, 5.6, 1.6, 'black');
  },
});
sitter('koala', { size: [14, 16, 12], col: 'silver', belly: 'white', feet: 'grey',
  body: [4.4, 5.6, 3.6, 4.2, 3.4], head: [11, 6.2, 3.6, 3.2, 3], headPivot: [8, 6],
  arms: { dx: 3.4, y: 7.5, z: 7, len: 4, hand: 'grey' },
  face(v) {
    v.ellipsoid(6.5, 10.6, 9.4, 1.4, 1.8, 1, 'black'); eye(v, 4, 11, 1, 2); eye(v, 9, 11, 1, 2); front(v, 3, 10, 'blossom'); front(v, 10, 10, 'blossom');
    for (const x of [2, 11]) { v.sphere(x, 13, 5.6, 2.2, 'silver'); v.sphere(x, 13, 6.2, 1.3, 'white'); }
  },
});
sitter('ekorn', { size: [10, 15, 12], col: 'orange', belly: 'cream', feet: 'orange',
  body: [4, 6.6, 2.6, 3.6, 2.6], head: [9.4, 7.4, 2.8, 2.6, 2.6], headPivot: [7, 7],
  arms: { dx: 2.2, y: 6.5, z: 8.6, len: 3 },
  face(v) { eye(v, 3, 9, 1, 2); eye(v, 6, 9, 1, 2); v.box(4, 8, 10, 5, 8, 10, 'cream'); v.set(4, 8, 10, 'black'); front(v, 2, 8, 'blossom'); front(v, 7, 8, 'blossom');
    for (const x of [2, 7]) { v.box(x, 11, 6, x, 13, 7, 'orange'); v.set(x, 14, 6, 'woodRed'); } },
  extraBody(v) { v.ellipsoid(4.5, 5.6, 9.6, 1.4, 1.5, 1.2, 'woodLight'); v.set(4, 7, 9, 'brown'); v.set(5, 7, 10, 'brown'); },
  tail(v) { v.ellipsoid(4.5, 5, 2.2, 2.2, 3.4, 2.2, 'orange'); v.ellipsoid(4.5, 10, 1.6, 2.6, 3.4, 1.8, 'orange'); v.ellipsoid(4.5, 12.8, 3, 2, 1.6, 1.6, 'orange'); surfSpeck(v, 'orange', 'woodRed', 0.15, 2); }, tailPivot: [3, 4],
});

/* ================================================================ WATER & SMALL CREATURES */
V.def('fisk', { size: [7, 12, 15], scale: S16, build(v, o) {
  const c = pick(o, 'c', 'orange');
  v.ellipsoid(3, 6, 8.4, 2.3, 3.6, 4.8, c);
  v.paint((x, y, z) => y <= 4 && z >= 6 ? P.honey : (z === 9 || z === 6) && y >= 3 ? P.white : null);
  v.box(3, 10, 6, 3, 10, 9, 'honey'); v.box(3, 11, 7, 3, 11, 8, 'honey');
  for (const x of [0, 6]) { v.set(x, 7, 11, 'black'); v.set(x, 8, 11, 'black'); v.set(x, 8, 10, 'white'); v.set(x, 7, 10, 'black'); }
  v.box(2, 5, 13, 4, 5, 13, 'coral');
  v.box(0, 4, 8, 0, 5, 9, 'honey'); v.box(6, 4, 8, 6, 5, 9, 'honey');
}, parts: { tail: { pivot: [3.5, 6, 4], build(v, o) { const c = pick(o, 'c', 'orange'); for (let z = 0; z <= 3; z++) { const h = 4 - z; v.box(3, 6 - h, z, 3, 6 + h, z, z === 0 ? 'honey' : c); } v.box(2, 5, 3, 4, 7, 3, c); } } },
  meta: { group: 'dyr', rig: 'fish', react: 'pet', by: 'models2', variants: { c: ['orange', 'sky', 'pink', 'yellow'] } } });

V.def('frosk', { size: [12, 9, 11], scale: S16, build(v) {
  v.ellipsoid(5.5, 3.2, 5, 4.4, 3, 4, 'leaf'); v.paint((x, y, z) => y <= 2 && z >= 6 ? P.butter : null);
  // big eyes on top
  for (const x of [3.5, 7.5]) { v.sphere(x, 6.4, 6.6, 1.7, 'leaf'); }
  for (const x of [3, 7]) { v.box(x, 6, 8, x + 1, 7, 8, 'white'); v.set(x + 1, 6, 8, 'black'); v.set(x, 6, 8, 'black'); }
  v.box(3, 3, 9, 8, 3, 9, 'leafDark'); v.set(2, 4, 9, 'blossom'); v.set(9, 4, 9, 'blossom');
  speck(v, 'leaf', 'leaf2', 0.2, 6);
}, parts: {
  legBL: { pivot: [2, 2, 3], build(v) { v.ellipsoid(1.4, 1.6, 3, 1.4, 1.6, 2.4, 'leaf'); v.box(0, 0, 4, 2, 0, 6, 'leaf2'); } },
  legBR: { pivot: [10, 2, 3], build(v) { v.ellipsoid(9.6, 1.6, 3, 1.4, 1.6, 2.4, 'leaf'); v.box(9, 0, 4, 11, 0, 6, 'leaf2'); } },
  legFL: { pivot: [3, 2, 8], build(v) { v.box(3, 0, 8, 3, 2, 8, 'leaf'); v.box(2, 0, 9, 4, 0, 9, 'leaf2'); } },
  legFR: { pivot: [8, 2, 8], build(v) { v.box(8, 0, 8, 8, 2, 8, 'leaf'); v.box(7, 0, 9, 9, 0, 9, 'leaf2'); } },
}, meta: { group: 'dyr', rig: 'hop', react: 'pet', by: 'models2' } });

const glassWing = (v, x0, y0, z0, w, h) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (!(i === w - 1 && j === h - 1)) v.set(x0 + i, y0 + j, z0, 'glass'); };
V.def('bie', { size: [11, 11, 11], scale: S16, build(v) {
  v.ellipsoid(5, 4.5, 5, 3.4, 3.4, 4.2, 'yellow');
  v.paint((x, y, z) => (z === 3 || z === 6) ? P.black : null);
  v.set(5, 4, 0, 'black');
  eye(v, 3, 5, 2, 2); eye(v, 6, 5, 2, 2); front(v, 2, 4, 'blossom'); front(v, 8, 4, 'blossom');
  v.set(4, 8, 8, 'black'); v.set(3, 9, 9, 'black'); v.set(6, 8, 8, 'black'); v.set(7, 9, 9, 'black');
}, parts: {
  wingL: { pivot: [6, 7.5, 5], build(v) { for (let x = 6; x <= 10; x++) for (let z = 3; z <= 6; z++) if (!(x === 10 && (z === 3 || z === 6))) v.set(x, 8, z, 'glass'); } },
  wingR: { pivot: [5, 7.5, 5], build(v) { for (let x = 0; x <= 4; x++) for (let z = 3; z <= 6; z++) if (!(x === 0 && (z === 3 || z === 6))) v.set(x, 8, z, 'glass'); } },
}, meta: { group: 'dyr', rig: 'bird', react: 'pet', by: 'models2', fly: true } });
V.def('humle', { size: [12, 12, 12], scale: S16, build(v) {
  v.ellipsoid(5.5, 5, 5.5, 4, 4, 4.6, 'yellow');
  v.paint((x, y, z) => (z <= 2 ? P.white : (z === 4 || z === 7) ? P.black : null));
  surfSpeck(v, 'yellow', 'butter', 0.2, 3);
  v.paint((x, y, z, c) => c === P.black && z >= 8 && y >= 4 && y <= 6 && (x === 3 || x === 7 || x === 4 || x === 8) ? null : null);
  for (const x of [3, 7]) { front(v, x, 5, 'white'); front(v, x + 1, 5, 'white'); front(v, x + 1, 4, 'black'); front(v, x, 4, 'white'); }
  v.set(4, 9, 9, 'black'); v.set(3, 10, 10, 'black'); v.set(7, 9, 9, 'black'); v.set(8, 10, 10, 'black');
}, parts: {
  wingL: { pivot: [7, 8.5, 5], build(v) { for (let x = 7; x <= 11; x++) for (let z = 3; z <= 6; z++) if (!(x === 11 && (z === 3 || z === 6))) v.set(x, 9, z, 'glass'); } },
  wingR: { pivot: [5, 8.5, 5], build(v) { for (let x = 0; x <= 4; x++) for (let z = 3; z <= 6; z++) if (!(x === 0 && (z === 3 || z === 6))) v.set(x, 9, z, 'glass'); } },
}, meta: { group: 'dyr', rig: 'bird', react: 'pet', by: 'models2', fly: true } });

V.def('larve', { size: [7, 9, 18], scale: S16, build(v) {
  const seg = [[2, 2.2], [5, 2.6], [8, 2.2], [11, 2.6]];
  seg.forEach(([z, y], i) => { v.sphere(3, y, z, 2.2, i % 2 ? 'leafDark' : 'green'); v.set(2, Math.round(y + 2.2), z, 'yellow'); v.set(4, Math.round(y + 2.2), z, 'yellow'); });   // WP5 W2: reads on grass
  v.sphere(3, 4.2, 14.3, 2.9, 'coral');
  eye(v, 1, 4, 2, 2); eye(v, 4, 4, 2, 2); front(v, 3, 3, 'red'); front(v, 1, 3, 'blossom'); front(v, 5, 3, 'blossom');
  v.set(2, 7, 14, 'leafDark'); v.set(1, 8, 15, 'yellow'); v.set(4, 7, 14, 'leafDark'); v.set(5, 8, 15, 'yellow');
  for (const [z] of seg) { v.set(1, 0, z, 'leafDark'); v.set(5, 0, z, 'leafDark'); }
}, meta: { group: 'dyr', rig: 'none', react: 'pet', by: 'models2' } });

V.def('snegl', { size: [18, 14, 9], scale: S16, build(v) {
  // drawn in profile (crawling toward +x) so the big pink spiral shell faces the camera; head + stalk eyes turned to the viewer
  v.box(1, 0, 2, 16, 1, 6, 'butter'); v.box(13, 2, 2, 16, 4, 6, 'butter'); v.ellipsoid(15, 5, 4, 2.2, 2.6, 2.2, 'butter');
  v.line(15, 7, 3, 14, 11, 4, 'butter'); v.line(16, 7, 5, 17, 11, 6, 'butter');
  v.box(13, 11, 4, 14, 12, 5, 'black'); v.box(16, 11, 6, 17, 12, 7, 'black'); v.set(13, 12, 5, 'white'); v.set(16, 12, 7, 'white');
  v.set(15, 4, 6, 'coral'); v.set(16, 4, 6, 'coral'); v.set(14, 5, 6, 'blossom'); v.set(17, 5, 5, 'blossom'); v.set(15, 6, 6, 'black'); v.set(16, 6, 6, 'black');
  v.ellipsoid(7.5, 6.6, 4, 5.8, 5.8, 3.4, 'pink');
  v.paint((x, y, z, c) => { if (c !== P.pink) return null; const d = Math.hypot(x - 7.5, y - 6.6), a = Math.atan2(y - 6.6, x - 7.5) / (Math.PI * 2) + 0.5; const sp = ((d - a * 2.3) % 2.3 + 2.3) % 2.3;
    return sp < 0.95 ? P.cherry : null; });
}, meta: { group: 'dyr', rig: 'none', react: 'pet', by: 'models2' } });

V.def('krabbe', { size: [16, 9, 12], scale: S16, build(v) {
  v.ellipsoid(7.5, 3.4, 5.5, 4.6, 2.4, 3.6, 'red'); v.paint((x, y, z) => y <= 2 ? P.coral : null);
  for (const x of [5, 10]) { v.box(x, 5, 7, x, 6, 7, 'red'); v.set(x, 7, 7, 'white'); v.set(x, 7, 8, 'black'); }
  front(v, 7, 3, 'black'); front(v, 8, 3, 'black'); front(v, 6, 4, 'blossom'); front(v, 9, 4, 'blossom');
  for (let i = 0; i < 3; i++) for (const s of [0, 1]) { const x = s ? 12 + (i === 1 ? 1 : 0) : 3 - (i === 1 ? 1 : 0); v.box(x, 0, 3 + i * 2, s ? x + 1 : x - 1, 1, 3 + i * 2, 'red'); }
}, parts: {
  clawL: { pivot: [12, 3, 8], build(v) { v.box(12, 3, 8, 13, 3, 9, 'red'); v.box(13, 2, 10, 15, 4, 11, 'red'); v.set(14, 3, 11, 0); v.set(15, 3, 11, 0); } },
  clawR: { pivot: [4, 3, 8], build(v) { v.box(2, 3, 8, 3, 3, 9, 'red'); v.box(0, 2, 10, 2, 4, 11, 'red'); v.set(1, 3, 11, 0); v.set(0, 3, 11, 0); } },
}, meta: { group: 'dyr', rig: 'none', react: 'pet', by: 'models2' } });

V.def('hval', { size: [14, 12, 24], scale: S16, build(v) {
  v.ellipsoid(6.5, 5, 13, 5.6, 4.8, 9.4, 'blue');
  v.paint((x, y, z) => y <= 3 && z >= 9 ? P.sky : null);
  v.paint((x, y, z) => y <= 2 && z >= 10 && (z % 2 === 0) ? P.white : null);
  eye(v, 3, 6, 2, 2); eye(v, 9, 6, 2, 2); front(v, 2, 5, 'blossom'); front(v, 11, 5, 'blossom');
  for (let i = 0; i < 6; i++) v.set(4 + i, 4, Math.round(21 - Math.abs(i - 2.5) * 0.6), 'navySoft');
  v.box(0, 3, 13, 0, 3, 16, 'blue'); v.box(13, 3, 13, 13, 3, 16, 'blue');
  v.set(6, 10, 15, 'water'); v.set(7, 10, 15, 'water'); v.set(6, 11, 15, 'sky'); v.set(7, 11, 16, 'sky'); v.set(5, 11, 14, 'sky');
}, parts: { tail: { pivot: [7, 5, 4], build(v) { v.box(6, 5, 1, 7, 6, 4, 'blue'); v.box(2, 6, 0, 11, 7, 1, 'blue'); v.set(2, 7, 1, 0); v.set(11, 7, 1, 0); } } },
  meta: { group: 'dyr', rig: 'fish', react: 'pet', by: 'models2' } });

V.def('delfin', { size: [11, 17, 22], scale: S16, build(v) {
  // leaping out of a little splash: arched body, tall dorsal fin, white belly, smiling beak
  for (let z = 0; z < 22; z++) for (let x = 0; x < 11; x++) { const d = Math.hypot(x - 5, (z - 11) * 0.62); if (d <= 5.2 && d > 3.6) v.set(x, 0, z, H(x, z, 9) < 0.3 ? 'white' : 'water'); }
  tube(v, [[5, 4, 4], [5, 8, 7], [5, 10.4, 11], [5, 10, 15], [5, 8.4, 17.4]], 3, 'sky');
  v.ellipsoid(5, 7.6, 19.6, 1.5, 1.3, 2.2, 'sky');
  v.paint((x, y, z, c) => c === P.sky && y <= Math.round(6 + (z - 4) * 0.25) && z >= 6 ? P.white : null);
  v.paint((x, y, z, c) => c === P.sky && y >= 12 ? P.blue : null);
  for (let i = 0; i < 4; i++) v.box(5, 13 + i, 10 - i, 5, 13 + i, 12 - i, 'blue');
  eye(v, 3, 10, 1, 2); eye(v, 7, 10, 1, 2); front(v, 2, 9, 'blossom'); front(v, 8, 9, 'blossom'); v.box(4, 7, 21, 6, 7, 21, 'navySoft');
  v.box(1, 6, 12, 2, 6, 14, 'blue'); v.box(8, 6, 12, 9, 6, 14, 'blue'); v.set(0, 5, 13, 'blue'); v.set(10, 5, 13, 'blue');
}, parts: { tail: { pivot: [5.5, 3, 3], build(v) { v.box(5, 1, 1, 5, 3, 3, 'sky'); v.box(1, 1, 0, 9, 2, 1, 'blue'); v.set(1, 2, 1, 0); v.set(9, 2, 1, 0); } } },
  meta: { group: 'dyr', rig: 'fish', react: 'pet', by: 'models2' } });

V.def('sel', { size: [16, 15, 18], scale: S16, build(v) {
  // seal pup on a little ice floe: body curves up to a round head, big shiny eyes, whiskers, front flippers
  for (let z = 0; z < 18; z++) for (let x = 0; x < 16; x++) if (((x - 7.5) / 7.8) ** 2 + ((z - 8.5) / 8.6) ** 2 <= 1) v.box(x, 0, z, x, 1, z, H(x, z, 5) < 0.2 ? 'snow' : 'ice');
  tube(v, [[7.5, 4.4, 4], [7.5, 5, 8], [7.5, 7.2, 11.4]], 3.4, 'grey');
  v.sphere(7.5, 10.4, 12.6, 3.6, 'grey');
  v.paint((x, y, z, c) => c === P.grey && z >= 8 && y <= 8 && Math.abs(x - 7.5) <= 2.4 ? P.silver : null);
  surfSpeck(v, 'grey', 'navySoft', 0.08, 4);
  eye(v, 5, 11, 2, 2); eye(v, 9, 11, 2, 2); v.box(7, 9, 16, 8, 9, 16, 'black'); v.set(7, 8, 16, 'white'); v.set(8, 8, 16, 'white');
  for (const [x, d] of [[5, -1], [10, 1]]) { v.set(x, 8, 15, 'white'); v.set(x + d, 8, 15, 'white'); v.set(x + 2 * d, 9, 14, 'white'); }
  front(v, 4, 10, 'blossom'); front(v, 11, 10, 'blossom');
  for (const [x, d] of [[3, -1], [12, 1]]) { v.box(x, 2, 10, x, 3, 13, 'navySoft'); v.box(x + d, 2, 12, x + d, 2, 14, 'navySoft'); }
}, parts: { tail: { pivot: [7.5, 3, 2], build(v) { v.box(5, 2, 0, 6, 3, 1, 'navySoft'); v.box(9, 2, 0, 10, 3, 1, 'navySoft'); v.box(6, 3, 1, 9, 4, 2, 'grey'); } } },
  meta: { group: 'dyr', rig: 'fish', react: 'pet', by: 'models2' } });


/* ---------------------------------------------------------- Wave 2: ids other packages ask for first (OBJ things_world models:[…])
   'pinnsvin' = the rigged pet hedgehog (wild hedgehogs in meadows), 'pingvin' = a new chibi penguin (snowy biome). */
{ const d = V.defs.pet_pinnsvin; V.def('pinnsvin', { size: d.size, scale: d.scale, build: d.build, parts: d.parts, meta: Object.assign({}, d.meta, { pet: false, alias: 'pet_pinnsvin' }) }); }
bird('pingvin', { size: [11, 16, 10], col: 'navySoft',
  body: [6, 4.6, 4, 5.6, 3.6], head: [12, 5, 3.4, 3.1, 3.1], headPivot: [10, 5],
  paintBody(v) { v.paint((x, y, z, c) => c === P.navySoft && z >= 6 && Math.abs(x - 5) <= 2.6 && y >= 1 && y <= 10 ? P.white : null); },
  face(v) {
    v.paint((x, y, z, c) => c === P.navySoft && z >= 6 && y <= 12 && y >= 10 && Math.abs(x - 5) <= 2 ? P.white : null);
    eye(v, 3, 12, 2, 2); eye(v, 6, 12, 2, 2); v.box(4, 10, 8, 6, 10, 9, 'orange'); v.set(5, 9, 9, 'orange');
    front(v, 2, 11, 'blossom'); front(v, 8, 11, 'blossom'); v.set(5, 15, 5, 'navySoft');
  },
  wing: { x: 9, y0: 3, y1: 9, z0: 2, z1: 6, drop: 2, c: 'navySoft', tip: 'navySoft' },
  legs: { xs: [3, 7], z: 5, h: 0, c: 'orange', webW: 1, foot: 2 },
  tail(v) { v.box(4, 1, 0, 6, 2, 1, 'navySoft'); }, tailPivot: [3, 2],
}, { react: 'pet' });

/* ================================================================ FAMILY DISPATCH DEFS
   F.VOX.make('animal4', {kind:'hest'}) / F.VOX.make('bird', {kind:'svane'}) → the whole animal as ONE static mesh (no parts),
   centred in a grid big enough for every kind. For animation use the word id itself (F.VOX.make('hest')) which has parts. */
function familyDef(id, kinds, size) {
  V.def(id, { size, scale: S16, build(v, o) {
    const kind = kinds.includes(o.kind) ? o.kind : kinds[0], kd = V.defs[kind]; if (!kd) return;
    const [kw, kh, kl] = kd.size, sub = V.grid(kw, kh, kl), oo = Object.assign({}, o); delete oo.kind;
    kd.build(sub, oo); for (const pn in (kd.parts || {})) kd.parts[pn].build(sub, oo);
    const ox = Math.floor((size[0] - kw) / 2), oz = Math.floor((size[2] - kl) / 2);
    for (let z = 0; z < kl; z++) for (let y = 0; y < Math.min(kh, size[1]); y++) for (let x = 0; x < kw; x++) { const k = sub.data[x + kw * (y + kh * z)]; if (k) v.data[(x + ox) + size[0] * (y + size[1] * (z + oz))] = k; }
  }, meta: { group: 'dyr', family: id, rig: 'none', react: 'pet', by: 'models2', variants: { kind: kinds } } });
}
familyDef('animal4', ['katt', 'hund', 'hest', 'ku', 'sau', 'gris', 'geit', 'føll', 'valp', 'kanin', 'lam', 'kalv', 'esel', 'sebra', 'rev', 'løve', 'elg', 'rein', 'kamel', 'lama', 'giraff', 'mus', 'ponni'], [14, 40, 25]);
familyDef('bird', ['and', 'gås', 'høne', 'hane', 'svane', 'due', 'pet_papegøye', 'ugle', 'fugl', 'måke', 'pet_andunge', 'pingvin'], [14, 19, 18]);

/* ================================================================ RIG ANIMATION */
const rigOf = obj => { const d = V.defs[obj.name]; return (d && d.meta && d.meta.rig) || 'none'; };
F.Rig = {
  /* animate an animal Group made by F.VOX.make(id) from MODELS-2: st = {moving, happy, fly, speed}. Never moves obj itself. */
  tick(obj, t, st) {
    const p = obj && obj.userData && obj.userData.parts; if (!p) return;
    st = st || {};
    const ph = (obj.userData.rigPh || (obj.userData.rigPh = Math.random() * 6)) + t * 9 * (st.speed || 1);
    const sw = st.moving ? 0.55 : 0;
    if (p.legFL) { p.legFL.rotation.x = Math.sin(ph) * sw; p.legBR.rotation.x = Math.sin(ph) * sw; p.legFR.rotation.x = -Math.sin(ph) * sw; p.legBL.rotation.x = -Math.sin(ph) * sw; }
    if (p.legL) { p.legL.rotation.x = Math.sin(ph) * sw * 1.2; p.legR.rotation.x = -Math.sin(ph) * sw * 1.2; }
    if (p.tail) {
      if (rigOf(obj) === 'fish') p.tail.rotation.y = Math.sin(t * 6 + ph) * 0.45;
      else p.tail.rotation.y = Math.sin(t * (st.happy ? 16 : 3) + ph) * (st.happy ? 0.55 : 0.18);
    }
    if (p.head) p.head.rotation.x = st.moving ? Math.sin(ph * 2) * 0.05 : Math.sin(t * 0.9 + ph) * 0.06 + (st.happy ? Math.sin(t * 10) * 0.08 : 0);
    const d = V.defs[obj.name], wear = d && d.meta && d.meta.wear;
    if (p.earL) { const e = st.happy ? Math.sin(t * 9) * 0.35 : Math.sin(t * 1.6 + ph) * 0.12; p.earL.rotation.y = e; p.earR.rotation.y = -e; }   // WP5: elefantunge ears
    if (p.wingL && d && d.meta && d.meta.rig === 'flutter') {   // WP5: butterflies / dragonflies – wings beat upward, always a little
      const k = st.fly || st.moving ? 1 : 0.4, f = 0.12 + Math.abs(Math.sin(t * (st.fly || st.moving ? 12 : 4) + ph * 0.2)) * 0.95 * k; p.wingL.rotation.z = f; p.wingR.rotation.z = -f;
    } else if (p.wingL && wear) { const f = Math.sin(t * (st.fly ? 14 : 2.4)) * (st.fly ? 0.55 : 0.18); p.wingL.rotation.y = -0.2 - f; p.wingR.rotation.y = 0.2 + f; }
    else if (p.wingL) { const f = st.fly ? Math.sin(t * 24) * 0.8 : (st.happy ? Math.sin(t * 14) * 0.4 : 0); p.wingL.rotation.z = -Math.abs(f); p.wingR.rotation.z = Math.abs(f); }
    if (p.wheelF && st.moving) { const a = t * 8 * (st.speed || 1); p.wheelF.rotation.x = a; p.wheelB.rotation.x = a; }
    if (p.prop) p.prop.rotation.z = t * (st.moving || st.fly ? 30 : 2);
    if (p.armL) { const w = st.happy ? Math.sin(t * 8) * 0.5 - 0.9 : (st.moving ? Math.sin(ph) * 0.4 : 0); p.armL.rotation.z = st.happy ? -w : 0; p.armL.rotation.x = st.happy ? 0 : w; p.armR.rotation.x = st.happy ? 0 : -w; }
    if (p.clawL) { p.clawL.rotation.y = Math.sin(t * 4) * 0.2; p.clawR.rotation.y = -Math.sin(t * 4) * 0.2; }
  },
  /* vertical offset (metres) to ADD to obj.position.y while moving: hop arcs for 'hop' rigs (kanin, frosk, marsvin), a trot bob for
     'quad', a hover bob for flying birds/insects. Callers own obj.position; this only computes the offset. */
  bob(obj, t, st) {
    st = st || {}; const r = rigOf(obj), ph = (obj.userData.rigPh || 0) + t * 9 * (st.speed || 1);
    if (st.fly || (V.defs[obj.name] && V.defs[obj.name].meta && V.defs[obj.name].meta.fly)) return 0.25 + Math.sin(t * 3 + ph) * 0.06;
    if (!st.moving) return 0;
    if (r === 'hop') return Math.abs(Math.sin(ph * 0.5)) * 0.22;
    if (r === 'quad' || r === 'sit') return Math.abs(Math.sin(ph)) * 0.03;
    if (r === 'bird') return Math.abs(Math.sin(ph)) * 0.02;
    return 0;
  },
  kind: obj => rigOf(obj),
};
/* WP5: the builder kit for js/models/m_animals2.js (new chibi models, bird/fish kinds, legends) */
F.AnimKit = { quad, bird, sitter, horse, sheep, familyDef, eye, front, frontZ, side, tube, earTri, catFace, dogFace, speck, surfSpeck, exposed, pick, glassWing, S16 };
(F.__animKitWait || []).splice(0).forEach(fn => fn());   // m_animals2.js waits for the kit when scripts load out of order (gallery)

/* ---------------------------------------------------------- her follow pet walks (Wave 2)
   LIFE's economy.js moves F.Eco.petTh (and th.model = the VOX model). Until economy.js calls F.Rig.tick itself, this tick animates the pet
   from its own motion: legs walk / wings flap / tails wag while it moves, a happy wag after a tap (th.hop). If LIFE adds its own call it
   sets th.rigOwner = true and this hook steps aside. */
F.on && F.on('tick', (dt, t) => {
  const th = F.Eco && F.Eco.petTh; if (!th || th.rigOwner || !th.model || !th.model.userData || !th.model.userData.parts) return;
  const st = th._m2rig || (th._m2rig = { x: th.x, z: th.z, v: 0 });
  const sp = Math.hypot(th.x - st.x, th.z - st.z) / Math.max(dt, 1e-3); st.x = th.x; st.z = th.z;
  st.v += (Math.min(sp, 8) - st.v) * Math.min(1, dt * 8);
  const moving = st.v > 0.35;
  F.Rig.tick(th.model, t, { moving, happy: (th.hop || 0) > 0, speed: Math.max(0.7, Math.min(1.8, st.v / 2.2)), fly: !!(V.defs[th.model.name] && V.defs[th.model.name].meta.fly) });
});
})();
