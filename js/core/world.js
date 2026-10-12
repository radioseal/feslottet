/* Feslottet – WORLD engine (WP WORLD owns this file): endless deterministic chunks, voxel-column terrain, global water,
   build queue, colliders, walkables (bridges), chunk diffs (removed / regrowing / added things), navigation (A*).

   Terrain: 0.5 m cells (W.CELL), heights quantised to 0.25 m (W.STEP). Top quads + side quads towards lower neighbours,
   biome vertex colours (darker sides, 0.85 AO at the foot of each step, ±3 % jitter per cell). One mesh per 32 m chunk.
   Water: ONE transparent plane at y = W.WATER that follows the camera; columns below it render as sand/teal.
   Water deeper than W.DEEP blocks walking unless a walkable rect (bridge) covers it.

   Content hooks (worldgen.js registers the main ones):
     W.sampleFn = (x,z,out) => { out.h = height; out.col = 0xRRGGBB; out.surf = code }   // preferred
     W.heightFn = (x,z) => y                         legacy alternative (used only when no sampleFn)
     W.groundColorFn = (x,z,y) => hex | null         colour override (return null to keep the biome colour)
     W.heightMods.push((x,z,h) => h2)                carve / raise (e.g. a moat); applied last
     W.genFn = ctx => {...}                          main chunk generator (worldgen); then every W.chunkGens[i](ctx)
     W.reserve({name, x0,z0,x1,z1, y:0, blend:10, noGen:true, height(x,z)?, color(x,z,y)?})  hand-built area (park)
     W.addWall(x1,z1,x2,z2,thick) -> wall ; W.removeWall(wall)          static segment colliders
     W.addBox(x0,z0,x1,z1) -> box ; W.removeBox(box)                     axis-aligned colliders (houses)
     W.addWalkable({x0,z0,x1,z1,y} | {ax,az,bx,bz,w,y}) -> rect ; W.removeWalkable(rect)   bridges over water
     W.blockers.push((x,z,r) => bool)                extra blocking rules
     W.freeFn = (x,z,r,ctx) => bool                  worldgen's veto for ctx.free (roads, streets, plazas, deep water)
   ctx (per chunk) = { cx, cz, x0, z0, S, key, plan:boolean, rng (layout/things), drng (pure decor),
     statics (F.M.builder, merged), h(x,z) continuous height, y(x,z) column top, gy(x,z) walk surface,
     inReserved, free(x,z,r), claim(x,z,r), spawn(type,x,z,{id,ry,data,scale,kind,skip}) -> thing|null,
     decor(modelId, x, z, {y, ry, s, opts, big, claim, fine, sway}), dot(x,y,z,col,r), label(anchor,text,o), walkable(rect), box(x0,z0,x1,z1), records:[] }
     decor batches per chunk: big (4 quadrants, cast shadows) · small (4 quadrants) · glass · glow ·
       sway  (o.sway = k: wind-bent plants; vertex weight = height above the model base × k; one shared shader material, W.WIND, W.swayU) ·
       fine  (o.fine: tiny ground decor – tufts, clover, pebbles, shells – shown only within W.FINE_DIST of the camera target) ·
       far   (ctx.dot: a flat coloured square standing in for fine flowers where the fine batch is hidden; 2 triangles)
     In plan mode (W.plan(cx,cz) – density tests) nothing is built: spawn/decor only record, so generators must draw
     layout randomness from ctx.rng and purely visual scatter from ctx.drng.
   Queries: W.heightAt(x,z) W.floorY(x,z) W.groundY(x,z) W.water(x,z) W.deep(x,z) W.colHeight(ix,iz) W.sample(x,z)
            W.blocked(x,z,r,ignore) W.findPath(sx,sz,gx,gz,r,ignore) W.raycastGround(ray) -> {point, distance}|null
   Streaming: W.update(x,z,force) – chunks are built in stages, time-sliced (≈W.SLICE_MS per frame, nearest first):
              terrain → generators (things queued) → things spawned a few per frame → decor scatter (W.decorFn) → merge → 'chunkLoaded'.
              force = build the whole R_LOAD ring synchronously (teleports, tests).  W.pending() W.isBuilt(ch)
              W.reloadAll()  W.plan(cx,cz,{fresh}) -> {records, info}  W.chunkOf(x,z) -> loaded chunk | null
   ctx.block(x0,y0,z0,x1,y1,z1, 0xRRGGBB, {top, big, sway}) adds a merged box (crop rows, towels, bunting …); ctx.wg = worldgen's per-chunk data.
   Terrain sample out.sk > 0.95 = 'soft' steps (snow): lifted side colours + faint foot shade, so hills don't read as grey contour stripes.
   Water shimmer: W.shimmer (one Points object, sparkles twinkle on nearby water).
   Persistence (F.save.chunks[key] = {rm:[id], st:{}, add:[{uid,type,x,z,ry,data,kind,walk}], regrow:{id: clockSec}}):
     W.removeThing(thing, {regrowMin})   W.addThing(type, x, z, {ry, data, kind:'buy'|'cast'|'build', walk}) -> thing
     W.clock() -> persistent game seconds (advances while playing).  Free casts ('cast') capped at 300 (oldest sparkle away).
   Events: chunkLoaded(ch), chunkUnloaded(ch). */
(function () {
'use strict';
const F = window.F, U = F.U;

const W = F.W = {
  CHUNK: 32, CELL: 0.5, STEP: 0.25, WATER: -0.15, DEEP: 0.3, R_LOAD: 2, R_KEEP: 3,
  seed: 20261009,
  chunkGens: [], reserved: [], walls: [], walkables: [], blockers: [], heightMods: [],
  chunks: new Map(), queue: [],
  heightFn: null, sampleFn: null, groundColorFn: null, genFn: null,
  placeholders: !!(F.flags && F.flags.test),
  stats: { built: 0, ms: 0, last: 0, maxMs: 0 },
};
const NC = W.CHUNK / W.CELL;      // cells per chunk side (64)

/* ------------------------------------------------ seed + save keys */
(function initSave() {
  const s = F.save;
  if (F.flags.seed != null) W.seed = F.flags.seed;
  else { if (!s.worldSeed) { s.worldSeed = 1 + Math.floor(Math.random() * 2e9); F.store(); } W.seed = s.worldSeed; }
  s.chunks = s.chunks || {};
  s.visited = s.visited || [];
  s.wclock = s.wclock || 0;
  s.castList = s.castList || [];
})();

/* ------------------------------------------------ reserved areas */
W.reserve = function (z) {
  const r = Object.assign({ y: 0, pad: 0, blend: 10 }, z);
  if (r.name) { const i = W.reserved.findIndex(q => q.name === r.name); if (i >= 0) { W.reserved[i] = r; return r; } }
  W.reserved.push(r); return r;
};
W.inReserved = function (x, z, pad = 0) {
  for (const r of W.reserved) if (x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad) return r;
  return null;
};

/* ------------------------------------------------ sampling: height + colour */
const SMP = { h: 0, col: 0, surf: 0, res: null };
const PARK_COL = 0x8ed36c;   // park lawn default (scaled by W.TERRAIN_K like the rest of the ground)
function rawSample(x, z, S) {
  S.col = 0; S.surf = 0; S.res = null; S.bio = 0; S.fk = 0; S.sk = 0;
  if (W.sampleFn) W.sampleFn(x, z, S);
  else { S.h = W.heightFn ? W.heightFn(x, z) : (U.fbm(x * 0.02, z * 0.02, W.seed, 3) - 0.5) * 3.0; S.col = 0x8ed36c; }
}
// full pipeline: reserved (flat inside, blend ring outside) -> raw (worldgen) -> heightMods -> colour override
W.sample = function (x, z) {
  const S = SMP;
  let inside = null;
  for (let i = 0; i < W.reserved.length; i++) { const r = W.reserved[i]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) { inside = r; break; } }
  if (inside) {
    S.h = inside.height ? inside.height(x, z) : inside.y; S.surf = 0; S.res = inside; S.bio = 0; S.fk = 0; S.sk = 0;
    S.col = (inside.color && inside.color(x, z, S.h)) || PARK_COL;
    // same ground brightness as the kingdom (worldgen W.TERRAIN_K) so there is no seam at the park edge; opt out: reserve({rawColor:true})
    const K = W.TERRAIN_K || 1;
    if (K !== 1 && !inside.rawColor) S.col = (Math.min(255, Math.round((S.col >> 16 & 255) * K)) << 16) | (Math.min(255, Math.round((S.col >> 8 & 255) * K)) << 8) | Math.min(255, Math.round((S.col & 255) * K));
  } else {
    rawSample(x, z, S);
    for (let i = 0; i < W.reserved.length; i++) {
      const r = W.reserved[i];
      const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
      if (dx < r.blend && dz < r.blend) { const d = Math.hypot(dx, dz); if (d < r.blend) S.h = U.lerp(r.y, S.h, U.smooth(d / r.blend)); }
    }
  }
  for (let i = 0; i < W.heightMods.length; i++) S.h = W.heightMods[i](x, z, S.h);
  if (W.groundColorFn) { const c = W.groundColorFn(x, z, S.h); if (c != null) S.col = c; }
  if (!S.col) S.col = PARK_COL;
  return S;
};
W.heightAt = (x, z) => W.sample(x, z).h;
const q = h => Math.round(h / W.STEP) * W.STEP;
W.quant = q;
// column height of cell (ix,iz) – cell units of W.CELL (0.5 m)
W.colHeight = (ix, iz) => q(W.heightAt((ix + 0.5) * W.CELL, (iz + 0.5) * W.CELL));

/* height cache of loaded chunks: (NC+2)^2 with a 1-cell border */
const HC = new Map();
const nk = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
let lastK = null, lastH = null;
W.floorY = function (x, z) {
  const ix = Math.floor(x / W.CELL), iz = Math.floor(z / W.CELL);
  const cx = Math.floor(ix / NC), cz = Math.floor(iz / NC);
  const k = nk(cx, cz);
  let H = (k === lastK) ? lastH : HC.get(k);
  if (H) { lastK = k; lastH = H; return H[(iz - cz * NC + 1) * (NC + 2) + (ix - cx * NC + 1)]; }
  return W.colHeight(ix, iz);
};
W.walkableAt = function (x, z) {
  for (let i = 0; i < W.walkables.length; i++) {
    const w = W.walkables[i];
    if (w.ax != null) { if (segPt(x, z, w.ax, w.az, w.bx, w.bz) <= w.w / 2) return w; }
    else if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) return w;
  }
  return null;
};
W.groundY = function (x, z) {
  const f = W.floorY(x, z);
  if (W.walkables.length) { const w = W.walkableAt(x, z); if (w) return Math.max(f, w.y != null ? w.y : W.WATER + 0.1); }
  return Math.max(f, W.WATER + 0.05);
};
W.water = (x, z) => W.floorY(x, z) < W.WATER;
W.deep = (x, z) => W.floorY(x, z) < W.WATER - W.DEEP;

/* ------------------------------------------------ colliders */
W.addWall = function (x1, z1, x2, z2, thick = 0.6) { const w = { x1, z1, x2, z2, t: thick / 2 }; W.walls.push(w); return w; };
W.removeWall = function (w) { const i = W.walls.indexOf(w); if (i >= 0) W.walls.splice(i, 1); };
const BOXG = new Map();   // 8 m grid -> boxes
const bk = (i, j) => (i + 32768) * 65536 + (j + 32768);
W.addBox = function (x0, z0, x1, z1) {
  const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), keys: [] };
  for (let i = Math.floor((b.x0 - 1) / 8); i <= Math.floor((b.x1 + 1) / 8); i++) for (let j = Math.floor((b.z0 - 1) / 8); j <= Math.floor((b.z1 + 1) / 8); j++) {
    const k = bk(i, j); let a = BOXG.get(k); if (!a) BOXG.set(k, a = []); a.push(b); b.keys.push(k);
  }
  return b;
};
W.removeBox = function (b) { for (const k of b.keys) { const a = BOXG.get(k); if (!a) continue; const i = a.indexOf(b); if (i >= 0) a.splice(i, 1); if (!a.length) BOXG.delete(k); } b.keys = []; };
W.addWalkable = function (r) { W.walkables.push(r); return r; };
W.removeWalkable = function (r) { const i = W.walkables.indexOf(r); if (i >= 0) W.walkables.splice(i, 1); };
function segPt(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1;
  let t = ((px - ax) * vx + (pz - az) * vz) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}
W.segDist = segPt;
// solid outdoor things bucketed on an 8 m grid (rebuilt lazily once per frame)
const TG = new Map(); let tgT = -1, tgN = -1, tgBig = [];
function thingGrid() {
  const L = F.Things.list;
  if (tgT === F.T.now && tgN === L.length) return TG;
  tgT = F.T.now; tgN = L.length; TG.clear(); tgBig = [];
  for (let i = 0; i < L.length; i++) {
    const t = L[i]; if (!t.solid || t.space !== 'out') continue;
    const R = t.radius + 1.0;
    if (R > 12) { tgBig.push(t); continue; }
    for (let a = Math.floor((t.x - R) / 8); a <= Math.floor((t.x + R) / 8); a++) for (let b = Math.floor((t.z - R) / 8); b <= Math.floor((t.z + R) / 8); b++) {
      const k = bk(a, b); let arr = TG.get(k); if (!arr) TG.set(k, arr = []); arr.push(t);
    }
  }
  return TG;
}
function thingBlocks(x, z, r, ignore) {
  if (r > 1) {
    const L = F.Things.list;
    for (let i = 0; i < L.length; i++) { const t = L[i]; if (!t.solid || t === ignore || t.space !== 'out') continue; const dx = t.x - x, dz = t.z - z, rr = t.radius + r; if (dx * dx + dz * dz < rr * rr) return true; }
    return false;
  }
  const arr = thingGrid().get(bk(Math.floor(x / 8), Math.floor(z / 8)));
  if (arr) for (let i = 0; i < arr.length; i++) { const t = arr[i]; if (t === ignore) continue; const dx = t.x - x, dz = t.z - z, rr = t.radius + r; if (dx * dx + dz * dz < rr * rr) return true; }
  for (let i = 0; i < tgBig.length; i++) { const t = tgBig[i]; if (t === ignore) continue; const dx = t.x - x, dz = t.z - z, rr = t.radius + r; if (dx * dx + dz * dz < rr * rr) return true; }
  return false;
}
// default water rule (replaceable): deep water blocks unless a walkable covers it
W.blockFn = function (x, z) {
  if (W.floorY(x, z) < W.WATER - W.DEEP && !W.walkableAt(x, z)) return true;
  return false;
};
// is a circle at (x,z) with radius r free of walls, boxes, solid things, deep water?
W.blocked = function (x, z, r = 0.35, ignore = null) {
  for (let i = 0; i < W.walls.length; i++) { const w = W.walls[i]; if (segPt(x, z, w.x1, w.z1, w.x2, w.z2) < r + w.t) return true; }
  const boxes = BOXG.get(bk(Math.floor(x / 8), Math.floor(z / 8)));
  if (boxes) for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true; }
  if (thingBlocks(x, z, r, ignore)) return true;
  if (W.blockFn && W.blockFn(x, z, r)) return true;
  for (let i = 0; i < W.blockers.length; i++) if (W.blockers[i](x, z, r)) return true;
  return false;
};

/* ------------------------------------------------ terrain mesher */
const keyOf = (cx, cz) => cx + ',' + cz;
W.key = keyOf;
W.chunkKeyAt = (x, z) => keyOf(Math.floor(x / W.CHUNK), Math.floor(z / W.CHUNK));
W.chunkOf = (x, z) => W.chunks.get(W.chunkKeyAt(x, z)) || null;
const MAXQ = NC * NC * 5;
const BP = new Float32Array(MAXQ * 12), BN = new Float32Array(MAXQ * 12), BC = new Float32Array(MAXQ * 12);
function buildTerrain(ch) {
  const C = W.CELL, x0 = ch.cx * W.CHUNK, z0 = ch.cz * W.CHUNK, N2 = NC + 2;
  const H = new Float32Array(N2 * N2), COL = new Uint32Array(NC * NC), SK = new Float32Array(NC * NC);
  const SURF = ch.SURF = new Uint8Array(NC * NC), BIOA = ch.BIO = new Uint8Array(NC * NC), FKA = ch.FKA = new Uint8Array(NC * NC);
  let minH = Infinity, maxH = -Infinity, wet = false;
  for (let j = -1; j <= NC; j++) for (let i = -1; i <= NC; i++) {
    const S = W.sample(x0 + (i + 0.5) * C, z0 + (j + 0.5) * C);
    const h = q(S.h);
    H[(j + 1) * N2 + (i + 1)] = h;
    if (i >= 0 && j >= 0 && i < NC && j < NC) {
      const k = j * NC + i;
      COL[k] = S.col; SURF[k] = S.res ? 99 : (S.surf || 0); BIOA[k] = S.bio || 0; FKA[k] = S.fk || 0; SK[k] = S.sk || 0.8;
      if (h < minH) minH = h; if (h > maxH) maxH = h; if (h < W.WATER) wet = true;
    }
  }
  ch.H = H; ch.minH = minH; ch.maxH = maxH; ch.wet = wet;
  HC.set(nk(ch.cx, ch.cz), H); lastK = null;
  const hh = (i, j) => H[(j + 1) * N2 + (i + 1)];
  let nv = 0;
  const put = (x, y, z, nx, ny, nz, r, g, b) => { const o = nv * 3; BP[o] = x; BP[o + 1] = y; BP[o + 2] = z; BN[o] = nx; BN[o + 1] = ny; BN[o + 2] = nz; BC[o] = r; BC[o + 1] = g; BC[o + 2] = b; nv++; };
  for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
    const X = x0 + i * C, Z = z0 + j * C, y = hh(i, j);
    const col = COL[j * NC + i];
    const jit = 1 + (U.hash2(X * 2 | 0, Z * 2 | 0, 11) - 0.5) * 0.06;
    const r = ((col >> 16) & 255) / 255 * jit, g = ((col >> 8) & 255) / 255 * jit, b = (col & 255) / 255 * jit;
    // top: AO 0.85 at corners next to a higher neighbour column (foot of a step)
    const soft = SK[j * NC + i] > 0.95;   // snow: soft steps (light sides, faint foot shade) instead of grey contour stripes
    const aok = soft ? 0.94 : 0.85;
    const ao = (di, dj) => (hh(i + di, j) > y || hh(i, j + dj) > y || hh(i + di, j + dj) > y) ? aok : 1;
    const a00 = ao(-1, -1), a10 = ao(1, -1), a11 = ao(1, 1), a01 = ao(-1, 1);
    put(X, y, Z + C, 0, 1, 0, r * a01, g * a01, b * a01);
    put(X + C, y, Z + C, 0, 1, 0, r * a11, g * a11, b * a11);
    put(X + C, y, Z, 0, 1, 0, r * a10, g * a10, b * a10);
    put(X, y, Z, 0, 1, 0, r * a00, g * a00, b * a00);
    // sides towards lower neighbours: darker, extra dark at the bottom edge
    // soft (snow): vertical faces only get ~half the light of top faces, so their vertex colour is lifted (> 1 is fine in the shader)
    const skk = soft ? 1.5 : SK[j * NC + i], sr = r * skk, sg = g * skk, sb = b * (skk + 0.02), lo = soft ? 0.9 : 0.82;
    const side = (yn, nx, nz, ax, az, bx, bz) => {
      if (yn >= y) return;
      put(ax, yn, az, nx, 0, nz, sr * lo, sg * lo, sb * (lo + 0.02));
      put(bx, yn, bz, nx, 0, nz, sr * lo, sg * lo, sb * (lo + 0.02));
      put(bx, y, bz, nx, 0, nz, sr, sg, sb);
      put(ax, y, az, nx, 0, nz, sr, sg, sb);
    };
    side(hh(i + 1, j), 1, 0, X + C, Z + C, X + C, Z);
    side(hh(i - 1, j), -1, 0, X, Z, X, Z + C);
    side(hh(i, j + 1), 0, 1, X, Z + C, X + C, Z + C);
    side(hh(i, j - 1), 0, -1, X + C, Z, X, Z);
  }
  const nq = nv / 4;
  const idx = nv > 65535 ? new Uint32Array(nq * 6) : new Uint16Array(nq * 6);
  for (let k = 0; k < nq; k++) { const v = k * 4, o = k * 6; idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2; idx[o + 3] = v; idx[o + 4] = v + 2; idx[o + 5] = v + 3; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(BP.slice(0, nv * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(BN.slice(0, nv * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(BC.slice(0, nv * 3), 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingBox = new THREE.Box3(new THREE.Vector3(x0, minH - 2, z0), new THREE.Vector3(x0 + W.CHUNK, maxH, z0 + W.CHUNK));
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  const m = new THREE.Mesh(g, W.groundMat || (W.groundMat = new THREE.MeshLambertMaterial({ vertexColors: true })));
  m.receiveShadow = true; m.castShadow = false; m.userData.ground = true; m.userData.chunk = ch.key; m.userData.own = true;
  m.matrixAutoUpdate = false; m.updateMatrix();
  m.raycast = groundRaycast;
  return m;
}
/* fast heightfield ray-march (replaces triangle raycasting for ground picking) */
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
function marchChunk(ray, ch) {
  const x0 = ch.cx * W.CHUNK, z0 = ch.cz * W.CHUNK, x1 = x0 + W.CHUNK, z1 = z0 + W.CHUNK;
  const o = ray.origin, d = ray.direction;
  let t0 = 0, t1 = 1e4;
  const slab = (oo, dd, a, b) => { if (Math.abs(dd) < 1e-9) return oo >= a && oo <= b; let ta = (a - oo) / dd, tb = (b - oo) / dd; if (ta > tb) { const s = ta; ta = tb; tb = s; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); return t0 <= t1; };
  if (!slab(o.x, d.x, x0, x1) || !slab(o.z, d.z, z0, z1) || !slab(o.y, d.y, Math.min(ch.minH, W.WATER) - 0.01, ch.maxH + 0.01)) return null;
  const N2 = NC + 2, H = ch.H;
  const top = (x, z) => { const i = Math.min(NC - 1, Math.max(0, Math.floor((x - x0) / W.CELL))), j = Math.min(NC - 1, Math.max(0, Math.floor((z - z0) / W.CELL))); return Math.max(H[(j + 1) * N2 + (i + 1)], W.WATER); };
  let prev = t0;
  for (let t = t0; t <= t1 + 0.2; t += 0.2) {
    const tt = Math.min(t, t1);
    const x = o.x + d.x * tt, y = o.y + d.y * tt, z = o.z + d.z * tt;
    if (y <= top(x, z)) {
      let a = prev, b = tt;
      for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (o.y + d.y * m <= top(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
      return b;
    }
    prev = tt;
    if (tt >= t1) break;
  }
  return null;
}
function groundRaycast(raycaster, intersects) {
  const ch = W.chunks.get(this.userData.chunk); if (!ch || !ch.H) return;
  const t = marchChunk(raycaster.ray, ch);
  if (t == null || t < raycaster.near || t > raycaster.far) return;
  const p = raycaster.ray.at(t, new THREE.Vector3());
  intersects.push({ distance: t, point: p, object: this, face: null });
}
W.raycastGround = function (ray) {
  let best = null;
  W.chunks.forEach(ch => { if (!ch.H) return; const t = marchChunk(ray, ch); if (t != null && (!best || t < best.distance)) best = { distance: t, point: ray.at(t, new THREE.Vector3()) }; });
  return best;
};

/* ------------------------------------------------ water plane (one, follows the camera) */
(function makeWater() {
  const g = new THREE.PlaneGeometry(420, 420, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: F.PAL.water, transparent: true, opacity: 0.78, shininess: 70, specular: 0x9fd8ff, depthWrite: false }));
  m.renderOrder = 1; m.position.y = W.WATER; m.name = 'water'; m.receiveShadow = false; m.castShadow = false;
  W.waterMesh = m; F.R.scene.add(m);
  F.on('preRender', () => { const c = F.R.cam.smooth || F.R.cam.target; m.position.x = Math.round(c.x); m.position.z = Math.round(c.z); m.position.y = W.WATER; });
})();

/* ------------------------------------------------ water shimmer: twinkling additive sparkles on nearby water (one Points draw) */
(function shimmer() {
  const N = 70, cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
  // a little 4-point star on top
  g2.fillStyle = 'rgba(255,255,255,0.9)'; g2.fillRect(15, 2, 2, 28); g2.fillRect(2, 15, 28, 2);
  const tex = new THREE.CanvasTexture(cv);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), ph = new Float32Array(N), sp = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false; pts.renderOrder = 3; pts.name = 'shimmer';
  F.R.scene.add(pts); W.shimmer = pts;
  let seeded = 0, acc = 0;
  const reseed = (i, c) => {
    for (let t = 0; t < 6; t++) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 30, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r * 0.8 - 4;
      const H = HC.get(nk(Math.floor(x / W.CHUNK), Math.floor(z / W.CHUNK)));
      if (H && W.floorY(x, z) < W.WATER - 0.05) { pos[i * 3] = x; pos[i * 3 + 1] = W.WATER + 0.04; pos[i * 3 + 2] = z; ph[i] = Math.random() * 6.28; sp[i] = 1.5 + Math.random() * 2.5; return; }
    }
    pos[i * 3 + 1] = -99;
  };
  F.on('tick', (dt, t) => {
    if (F.Space && F.Space.cur !== 'out') return;
    const c = F.R.cam.target;
    acc += dt;
    if (seeded < N) { for (let i = 0; i < 6 && seeded < N; i++) reseed(seeded++, c); }
    else if (acc > 0.12) { acc = 0; for (let k = 0; k < 4; k++) { const i = Math.floor(Math.random() * N); const s2 = Math.sin(t * sp[i] + ph[i]); if (s2 < 0 || Math.hypot(pos[i * 3] - c.x, pos[i * 3 + 2] - c.z) > 36) reseed(i, c); } }
    for (let i = 0; i < N; i++) { const s2 = Math.max(0, Math.sin(t * sp[i] + ph[i])); const k = s2 * s2 * s2 * 0.9; col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k; }
    geo.attributes.color.needsUpdate = true; geo.attributes.position.needsUpdate = true;
  });
  F.on('spaceChanged', () => { seeded = 0; });
})();

/* ------------------------------------------------ decor batches (merged per chunk; growable typed arrays) */
// sway batches carry B.w (per-vertex wind weight = height above the model base × k); the sway material bends them in the vertex shader
function Batch(sway) { const B = { p: new Float32Array(3072), n: new Float32Array(3072), c: new Float32Array(3072), i: new Uint32Array(3072), vc: 0, ic: 0 }; if (sway) B.w = new Float32Array(1024); return B; }
function reserveB(B, nv, ni) {
  if ((B.vc + nv) * 3 > B.p.length) { let L = B.p.length; while ((B.vc + nv) * 3 > L) L *= 2; for (const k of ['p', 'n', 'c']) { const a = new Float32Array(L); a.set(B[k].subarray(0, B.vc * 3)); B[k] = a; } }
  if (B.w && B.vc + nv > B.w.length) { let L = B.w.length; while (B.vc + nv > L) L *= 2; const a = new Float32Array(L); a.set(B.w.subarray(0, B.vc)); B.w = a; }
  if (B.ic + ni > B.i.length) { let L = B.i.length; while (B.ic + ni > L) L *= 2; const a = new Uint32Array(L); a.set(B.i.subarray(0, B.ic)); B.i = a; }
}
/* wind sway: one shared Lambert material; vertices move by sin(time + position) × their weight (0 at the ground) */
W.swayU = { value: 0 };
W.WIND = 1;   // global wind strength (0 = still)
function swayMat() {
  if (W._swayMat) return W._swayMat;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uWindT = W.swayU;
    sh.vertexShader = 'attribute float swayW;\nuniform float uWindT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  float wph = uWindT * 1.9 + position.x * 0.43 + position.z * 0.29;\n' +
      '  float gust = 0.65 + 0.35 * sin(uWindT * 0.37 + position.x * 0.021 + position.z * 0.017);\n' +
      '  transformed.x += sin(wph) * swayW * gust;\n  transformed.z += cos(wph * 0.83 + 1.3) * swayW * gust * 0.55;');
  };
  m.customProgramCacheKey = () => 'feslottet-sway';
  return (W._swayMat = m);
}
F.on('tick', (dt, t) => { W.swayU.value = (t || 0) * W.WIND; });
function appendGeo(B, g, cs, sn, s, tx, ty, tz, tint, sw, yb) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, Ca = g.attributes.color ? g.attributes.color.array : null;
  const cnt = P.length / 3, base = B.vc, I = g.index ? g.index.array : null;
  reserveB(B, cnt, I ? I.length : cnt);
  const tr = tint ? tint[0] : 1, tg = tint ? tint[1] : 1, tb = tint ? tint[2] : 1;
  const bp = B.p, bn = B.n, bc = B.c;
  for (let k = 0, o = 0, w = base * 3; k < cnt; k++, o += 3, w += 3) {
    const x = P[o] * s, y = P[o + 1] * s, z = P[o + 2] * s;
    bp[w] = tx + x * cs + z * sn; bp[w + 1] = ty + y; bp[w + 2] = tz - x * sn + z * cs;
    const nx = N[o], nz = N[o + 2];
    bn[w] = nx * cs + nz * sn; bn[w + 1] = N[o + 1]; bn[w + 2] = -nx * sn + nz * cs;
    if (Ca) { bc[w] = Ca[o] * tr; bc[w + 1] = Ca[o + 1] * tg; bc[w + 2] = Ca[o + 2] * tb; } else { bc[w] = tr; bc[w + 1] = tg; bc[w + 2] = tb; }
  }
  if (B.w) { const bw = B.w, k2 = sw || 0; for (let k = 0, o = 1; k < cnt; k++, o += 3) bw[base + k] = k2 ? Math.max(0, P[o] * s + ty - yb) * k2 : 0; }
  const bi = B.i; let ic = B.ic;
  // downward faces are never seen from the camera: skip them
  if (I) { for (let k = 0; k < I.length; k += 6) { if (N[I[k] * 3 + 1] < -0.5) continue; bi[ic] = base + I[k]; bi[ic + 1] = base + I[k + 1]; bi[ic + 2] = base + I[k + 2]; bi[ic + 3] = base + I[k + 3]; bi[ic + 4] = base + I[k + 4]; bi[ic + 5] = base + I[k + 5]; ic += 6; } }
  else for (let k = 0; k < cnt; k++) bi[ic++] = base + k;
  B.ic = ic; B.vc += cnt;
}
// an axis-aligned block (5 faces, no bottom): side faces darker with an AO gradient towards the ground. col/top = 0xRRGGBB
function appendBox(B, x0, y0, z0, x1, y1, z1, col, top, sw) {
  reserveB(B, 20, 30);
  const r = (col >> 16 & 255) / 255, g = (col >> 8 & 255) / 255, b = (col & 255) / 255;
  const tc = top != null ? top : col, tr = (tc >> 16 & 255) / 255, tg = (tc >> 8 & 255) / 255, tb = (tc & 255) / 255;
  const P = B.p, N = B.n, C = B.c, I = B.i;
  let v = B.vc, ic = B.ic;
  const quad = (ax, ay, az, bx, by, bz, cx2, cy, cz2, dx, dy, dz, nx, ny, nz, k0, k1, cr, cg, cb) => {
    const w = v * 3;
    P[w] = ax; P[w + 1] = ay; P[w + 2] = az; P[w + 3] = bx; P[w + 4] = by; P[w + 5] = bz; P[w + 6] = cx2; P[w + 7] = cy; P[w + 8] = cz2; P[w + 9] = dx; P[w + 10] = dy; P[w + 11] = dz;
    for (let q2 = 0; q2 < 4; q2++) { N[w + q2 * 3] = nx; N[w + q2 * 3 + 1] = ny; N[w + q2 * 3 + 2] = nz; const k = q2 < 2 ? k0 : k1; C[w + q2 * 3] = cr * k; C[w + q2 * 3 + 1] = cg * k; C[w + q2 * 3 + 2] = cb * k; }
    I[ic] = v; I[ic + 1] = v + 1; I[ic + 2] = v + 2; I[ic + 3] = v; I[ic + 4] = v + 2; I[ic + 5] = v + 3; ic += 6; v += 4;
  };
  const sd = 0.86, lo = 0.62;
  quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, 0, 1, 0, 1, 1, tr, tg, tb);                       // top
  quad(x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1, 0, 0, 1, lo * sd, sd, r, g, b);                   // +z
  quad(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, 0, 0, -1, lo * sd, sd, r, g, b);                  // -z
  quad(x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0, 1, 0, 0, lo * sd, sd, r, g, b);                   // +x
  quad(x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1, -1, 0, 0, lo * sd, sd, r, g, b);                  // -x
  if (B.w) { reserveB(B, 0, 0); for (let k = B.vc; k < v; k++) B.w[k] = sw ? Math.max(0, P[k * 3 + 1] - y0) * sw : 0; }
  B.vc = v; B.ic = ic;
}
W.appendBox = appendBox;
const _m4 = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3();
function appendMesh(B, mesh, inv) {
  const g = mesh.geometry;
  _m4.multiplyMatrices(inv, mesh.matrixWorld); _nm.getNormalMatrix(_m4);
  const P = g.attributes.position, N = g.attributes.normal, Ca = g.attributes.color, mc = mesh.material.color || { r: 1, g: 1, b: 1 };
  const base = B.vc, I = g.index ? g.index.array : null;
  reserveB(B, P.count, I ? I.length : P.count);
  for (let k = 0; k < P.count; k++) {
    const w = (base + k) * 3;
    _v.fromBufferAttribute(P, k).applyMatrix4(_m4); B.p[w] = _v.x; B.p[w + 1] = _v.y; B.p[w + 2] = _v.z;
    if (N) _v.fromBufferAttribute(N, k).applyMatrix3(_nm).normalize(); else _v.set(0, 1, 0);
    B.n[w] = _v.x; B.n[w + 1] = _v.y; B.n[w + 2] = _v.z;
    if (Ca && mesh.material.vertexColors) { B.c[w] = Ca.getX(k) * mc.r; B.c[w + 1] = Ca.getY(k) * mc.g; B.c[w + 2] = Ca.getZ(k) * mc.b; } else { B.c[w] = mc.r; B.c[w + 1] = mc.g; B.c[w + 2] = mc.b; }
  }
  if (I) for (let k = 0; k < I.length; k++) B.i[B.ic++] = base + I[k];
  else for (let k = 0; k < P.count; k++) B.i[B.ic++] = base + k;
  B.vc += P.count;
}
function batchMesh(B, mat, shadow) {
  if (!B.vc || !B.ic) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(B.p.slice(0, B.vc * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(B.n.slice(0, B.vc * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(B.c.slice(0, B.vc * 3), 3));
  if (B.w) { g.setAttribute('swayW', new THREE.BufferAttribute(B.w.slice(0, B.vc), 1)); mat = swayMat(); }
  g.setIndex(new THREE.BufferAttribute(B.vc > 65535 ? B.i.slice(0, B.ic) : Uint16Array.from(B.i.subarray(0, B.ic)), 1));
  g.computeBoundingSphere();
  if (B.w) g.boundingSphere.radius += 0.5;
  const m = new THREE.Mesh(g, mat);
  m.castShadow = !!shadow; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); m.userData.own = true;
  return m;
}
const vmat = k => F.VOX.material(k);

/* ------------------------------------------------ chunk persistence (diffs) */
W.diff = function (key, create) {
  const s = F.save.chunks;
  let d = s[key];
  if (!d && create !== false) d = s[key] = { rm: [], st: {}, add: [], regrow: {} };
  return d || null;
};
W.clock = () => F.save.wclock || 0;
F.on('tick', dt => { if (!F.R.isPaused || !F.R.isPaused()) F.save.wclock = (F.save.wclock || 0) + dt; });

/* ------------------------------------------------ chunk context */
const LEARN_TYPES = new Set(['n_bokstavsteiner', 'v_tallstolpe', 'n_taptting', 'v_skattkiste', 'v_veiskilt', 'v_oppslagstavle', 'v_postkasse', 'n_tryllepunkt']);
W.LEARN_TYPES = LEARN_TYPES;
function makeCtx(ch, plan) {
  const S = W.CHUNK, x0 = ch.cx * S, z0 = ch.cz * S, k = ch.key;
  let n = 0;
  const occ = new Uint8Array(NC * NC);
  const claims = [];
  const recs = ch.records = [];
  ch.planById = {};
  const diff = plan ? null : W.diff(k, false);
  const now = W.clock();
  // small/big: 4 quadrant batches (big casts shadows); fine: tiny ground decor hidden beyond W.FINE_DIST; sway: wind-bent plants (always shown)
  const B = plan ? null : { small: [Batch(), Batch(), Batch(), Batch()], big: [Batch(), Batch(), Batch(), Batch()], glass: Batch(), glow: Batch(), fine: Batch(true), sway: Batch(true), far: Batch() };
  const quad = (x, z) => (x - x0 < S / 2 ? 0 : 1) + (z - z0 < S / 2 ? 0 : 2);
  ch.batches = B;
  const markOcc = (x, z, r, v) => {
    const i0 = Math.max(0, Math.floor((x - r - x0) / W.CELL)), i1 = Math.min(NC - 1, Math.floor((x + r - x0) / W.CELL));
    const j0 = Math.max(0, Math.floor((z - r - z0) / W.CELL)), j1 = Math.min(NC - 1, Math.floor((z + r - z0) / W.CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cxp = x0 + (i + 0.5) * W.CELL - x, czp = z0 + (j + 0.5) * W.CELL - z;
      if (cxp * cxp + czp * czp <= (r + 0.36) * (r + 0.36)) { if (v == null) { if (occ[j * NC + i]) return true; } else occ[j * NC + i] = v; }
    }
    return false;
  };
  const ctx = {
    cx: ch.cx, cz: ch.cz, x0, z0, S, key: k, plan: !!plan, chunk: ch,
    rng: U.rng(U.hashStr('chunk' + k + ':' + W.seed)),
    drng: U.rng(U.hashStr('decor' + k + ':' + W.seed)),
    statics: F.M.builder(),
    h: W.heightAt, y: W.floorY, gy: W.groundY,
    inReserved: W.inReserved,
    occ, claims, records: recs,
    free(x, z, r) {
      r = r || 0.5;
      if (W.inReserved(x, z, r + 1)) return false;
      if (W.freeFn && !W.freeFn(x, z, r, ctx)) return false;
      if (x - r >= x0 && x + r <= x0 + S && z - r >= z0 && z + r <= z0 + S) { if (markOcc(x, z, r, null)) return false; }
      for (let i = 0; i < claims.length; i++) { const c = claims[i]; if (!c.big) continue; const dx = c.x - x, dz = c.z - z, rr = c.r + r; if (dx * dx + dz * dz < rr * rr) return false; }
      return true;
    },
    claim(x, z, r) { markOcc(x, z, r, 1); claims.push({ x, z, r, big: r > 3 || x - r < x0 || x + r > x0 + S || z - r < z0 || z + r > z0 + S }); },
    // records always; builds only in build mode (skips removed / regrowing things)
    spawn(type, x, z, o) {
      o = Object.assign({}, o);
      const id = o.id || ('c' + k + ':' + (n++));
      const rec = { id, type, x, z, ry: o.ry || 0, data: o.data || {}, kind: o.kind || (type === 'w_coin' ? 'coin' : 'thing'), learn: LEARN_TYPES.has(type) || !!o.learn || !!(F.OBJ && F.OBJ.types && F.OBJ.types[type] && F.OBJ.types[type].spot) };
      recs.push(rec); ch.planById[id] = { type, x, z, o };
      if (plan || o.skip) return null;
      if (diff) {
        if (diff.rm.indexOf(id) >= 0) return null;
        const rg = diff.regrow[id];
        if (rg != null) { if (rg > now) return null; delete diff.regrow[id]; }
      }
      if (ctx.defer) { ch.pending.push([type, x, z, Object.assign(o, { id })]); return null; }
      return spawnThing(ch, type, x, z, Object.assign(o, { id }));
    },
    decor(id, x, z, o) {
      o = o || {};
      if (o.claim) ctx.claim(x, z, o.claim);
      if (plan) return;
      if (!F.VOX.has(id)) return;
      const e = F.VOX.geometry(id, o.opts || {});
      const y = o.y != null ? o.y : W.floorY(x, z);
      const ry = o.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), s = o.s || 1;
      const tgt = o.fine ? B.fine : (o.sway ? B.sway : null), swk = o.sway || 0;
      const add = (geos, px, py, pz) => {
        const ox = px * cs + pz * sn, oz = -px * sn + pz * cs;
        if (geos.opaque) appendGeo(tgt || (o.big ? B.big : B.small)[quad(x, z)], geos.opaque, cs, sn, s, x + ox * s, y + py * s, z + oz * s, o.tint, swk, y);
        if (geos.glass) appendGeo(B.glass, geos.glass, cs, sn, s, x + ox * s, y + py * s, z + oz * s, o.tint);
        if (geos.glow) appendGeo(B.glow, geos.glow, cs, sn, s, x + ox * s, y + py * s, z + oz * s, null);
      };
      add(e.body, 0, 0, 0);
      for (const pn in e.parts) { const p = e.parts[pn]; add(p.geo, p.pos[0], p.pos[1], p.pos[2]); }
    },
    // a merged decor block (cheap crop rows, kerbs, platforms). o: {top: colour of the top face, big: casts shadow}
    block(ax, ay, az, bx, by, bz, col, o) {
      if (plan) return;
      o = o || {};
      appendBox(o.sway ? B.sway : (o.big ? B.big : B.small)[quad((ax + bx) / 2, (az + bz) / 2)], ax, ay, az, bx, by, bz, col, o.top, o.sway || 0);
    },
    // far stand-in for fine decor: a flat coloured square (2 triangles), shown only where the fine batch is hidden
    dot(x, y, z, col, r) {
      if (plan) return;
      const F2 = B.far; reserveB(F2, 4, 6);
      const cr = (col >> 16 & 255) / 255, cg = (col >> 8 & 255) / 255, cb = (col & 255) / 255, v = F2.vc, w = v * 3;
      const P = [x - r, y, z + r, x + r, y, z + r, x + r, y, z - r, x - r, y, z - r];
      for (let k = 0; k < 12; k++) { F2.p[w + k] = P[k]; F2.n[w + k] = (k % 3 === 1) ? 1 : 0; F2.c[w + k] = k % 3 === 0 ? cr : (k % 3 === 1 ? cg : cb); }
      F2.i[F2.ic++] = v; F2.i[F2.ic++] = v + 1; F2.i[F2.ic++] = v + 2; F2.i[F2.ic++] = v; F2.i[F2.ic++] = v + 2; F2.i[F2.ic++] = v + 3; F2.vc += 4;
    },
    label(anchor, text, o) {
      if (plan || !F.UI || !F.UI.label) return null;
      const L = F.UI.label(anchor, text, Object.assign({ space: 'out' }, o || {}));
      ch.labels.push(L); return L;
    },
    walkable(r) { if (plan) return r; W.addWalkable(r); ch.walk.push(r); return r; },
    box(ax, az, bx, bz) { if (plan) return null; const b = W.addBox(ax, az, bx, bz); ch.boxes.push(b); return b; },
  };
  return ctx;
}
function spawnThing(ch, type, x, z, o) {
  let t = type;
  if (!F.Things.defs[t]) {
    if (!W.placeholders || !F.Things.defs.world_placeholder) return null;
    o = Object.assign({}, o, { data: Object.assign({}, o.data, { want: type }) }); t = 'world_placeholder';
  }
  const ts = performance.now();
  const th = F.Things.spawn(t, x, z, { id: o.id, ry: o.ry || 0, data: o.data || {}, scale: o.scale, zone: 'chunk', y: o.y, radius: o.radius, solid: o.solid });
  W.stats.spawnMs = (W.stats.spawnMs || 0) + performance.now() - ts; W.stats.spawned = (W.stats.spawned || 0) + 1;
  if (th) { th.chunk = ch.key; ch.things.push(th); }
  return th;
}
function runGens(ch, ctx) {
  ctx.defer = !ctx.plan;
  if (W.genFn) { try { W.genFn(ctx); } catch (e) { console.error('worldgen failed', ch.key, e); } }
  ctx.defer = false;
  for (const gen of W.chunkGens) { try { gen(ctx); } catch (e) { console.error('chunk gen failed', ch.key, e); } }
}

/* ------------------------------------------------ load / unload: staged so streaming never stalls a frame
   stage 0 terrain mesh → 1 generators (things queued) → 2 spawn queued things (time-sliced) → 3 decor scatter → 4 merge → DONE */
const DONE = 5;
function startChunk(cx, cz) {
  const k = keyOf(cx, cz);
  const ch = { cx, cz, key: k, things: [], objs: [], labels: [], walk: [], boxes: [], records: [], pending: [], stage: 0, ms: 0 };
  W.chunks.set(k, ch);
  return ch;
}
function stepChunk(ch) {
  const t0 = performance.now();
  switch (ch.stage) {
    case 0: {
      const ground = buildTerrain(ch); F.R.scene.add(ground); ch.objs.push(ground); ch.ground = ground;
      W.stats.terrain = (W.stats.terrain || 0) + performance.now() - t0;
      ch.stage = 1; break;
    }
    case 1: {
      ch.ctx = makeCtx(ch, false);
      runGens(ch, ch.ctx);
      const d = W.diff(ch.key, false);
      if (d && d.add.length) for (const a of d.add) ch.pending.push(['__add', a]);
      W.stats.gen = (W.stats.gen || 0) + performance.now() - t0;
      ch.stage = 2; break;
    }
    case 2: {
      while (ch.pending.length) {
        const p = ch.pending.shift();
        if (p[0] === '__add') spawnAdded(ch, p[1]); else spawnThing(ch, p[0], p[1], p[2], p[3]);
        if (performance.now() - t0 > W.SLICE_MS) break;
      }
      if (!ch.pending.length) ch.stage = 3;
      break;
    }
    case 3: {
      if (W.decorFn) { try { W.decorFn(ch.ctx); } catch (e) { console.error('decor failed', ch.key, e); } }
      W.stats.decor = (W.stats.decor || 0) + performance.now() - t0;
      ch.stage = 4; break;
    }
    case 4: {
      const ctx = ch.ctx;
      const B = ch.batches;
      const st = ctx.statics.group;
      if (st.children.length) {
        st.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(st.matrixWorld).invert();
        st.traverse(o => {
          if (!o.isMesh) return;
          if (o.material.transparent) { o.updateMatrixWorld(true); o.matrixWorld.decompose(o.position, o.quaternion, o.scale); F.R.scene.add(o); ch.objs.push(o); return; }
          appendMesh(B.big[0], o, inv);
        });
      }
      const meshes = [];
      for (let k = 0; k < 4; k++) { meshes.push(batchMesh(B.big[k], vmat('opaque'), true)); meshes.push(batchMesh(B.small[k], vmat('opaque'), false)); }
      const gm = batchMesh(B.glass, vmat('glass'), false); if (gm) gm.renderOrder = 2;
      meshes.push(gm, batchMesh(B.glow, vmat('glow'), false), batchMesh(B.sway, null, false));
      const fm = batchMesh(B.fine, null, false), fa = batchMesh(B.far, vmat('opaque'), false);
      if (fm) { meshes.push(fm); ch.fine = fm; }
      if (fa) { meshes.push(fa); ch.far = fa; }
      setFine(ch);
      meshes.forEach(m => { if (!m) return; F.R.scene.add(m); ch.objs.push(m); });
      ch.batches = null; ch.ctx = null;
      W.stats.merge = (W.stats.merge || 0) + performance.now() - t0;
      ch.stage = DONE;
      break;
    }
  }
  const ms = performance.now() - t0; ch.ms += ms;
  if (ms > (W.stats.stepMax || 0)) { W.stats.stepMax = ms; W.stats.stepMaxAt = { stage: ch.stage - (ch.stage === DONE ? 1 : 0), key: ch.key }; }   // longest single build step (frame spike source)
  if (ch.stage === DONE) {
    const WS = W.stats; WS.built++; WS.ms += ch.ms; WS.last = ch.ms; WS.maxMs = Math.max(WS.maxMs, ch.ms);
    F.emit('chunkLoaded', ch);
    return true;
  }
  return false;
}
function loadChunk(cx, cz) {
  const ch = W.chunks.get(keyOf(cx, cz)) || startChunk(cx, cz);
  while (!stepChunk(ch)) { /* all stages now */ }
  return ch;
}
W.SLICE_MS = 7;
function spawnAdded(ch, a) {
  const th = spawnThing(ch, a.type, a.x, a.z, { id: 'a:' + a.uid, ry: a.ry || 0, data: a.data || {}, scale: a.scale });
  if (th) th.addUid = a.uid;
  if (a.walk) { const r = W.addWalkable(Object.assign({}, a.walk)); ch.walk.push(r); if (th) th.walk = r; }
  return th;
}
function unloadChunk(ch) {
  ch.stage = -1; ch.pending = []; ch.batches = null; ch.ctx = null;
  ch.things.slice().forEach(t => F.Things.remove(t));
  ch.objs.forEach(o => { if (o.parent) o.parent.remove(o); if (o.userData.own && o.geometry) o.geometry.dispose(); });
  ch.labels.forEach(L => L.remove());
  ch.walk.forEach(r => W.removeWalkable(r));
  ch.boxes.forEach(b => W.removeBox(b));
  HC.delete(nk(ch.cx, ch.cz)); lastK = null;
  W.chunks.delete(ch.key);
  F.emit('chunkUnloaded', ch);
}
// plan only (no meshes / things): used by density tests and map queries. Cached.
const planCache = new Map();
W.plan = function (cx, cz, o) {
  const k = keyOf(cx, cz);
  if (planCache.has(k) && !(o && o.fresh)) return planCache.get(k);
  const ch = { cx, cz, key: k, things: [], objs: [], labels: [], walk: [], boxes: [], records: [], plan: true };
  const ctx = makeCtx(ch, true);
  runGens(ch, ctx);
  const out = { key: k, records: ch.records, info: ch.info || null };
  if (planCache.size > 600) planCache.clear();
  planCache.set(k, out);
  return out;
};

/* fine decor (tufts, clover, pebbles …) only near the camera target: far chunks keep their bigger decor only (triangle budget) */
W.FINE_DIST = 26;
function fineVisible(ch) {
  const c = F.R.cam.target, x0 = ch.cx * W.CHUNK, z0 = ch.cz * W.CHUNK;
  const dx = Math.max(x0 - c.x, 0, c.x - x0 - W.CHUNK), dz = Math.max(z0 - c.z, 0, c.z - z0 - W.CHUNK);
  return dx * dx + dz * dz < W.FINE_DIST * W.FINE_DIST;
}
function setFine(ch) { const v = fineVisible(ch); if (ch.fine) ch.fine.visible = v; if (ch.far) ch.far.visible = !v; }
let fineAcc = 0;
F.on('tick', dt => { fineAcc += dt; if (fineAcc < 0.2) return; fineAcc = 0; W.chunks.forEach(setFine); });

/* ------------------------------------------------ streaming queue */
let lastCx = null, lastCz = null;
W.update = function (x, z, force) {
  const S = W.CHUNK, cx = Math.floor(x / S), cz = Math.floor(z / S);
  if (force || cx !== lastCx || cz !== lastCz) {
    lastCx = cx; lastCz = cz;
    for (const ch of [...W.chunks.values()]) if (Math.abs(ch.cx - cx) > W.R_KEEP || Math.abs(ch.cz - cz) > W.R_KEEP) unloadChunk(ch);
    W.queue = [];
    for (let dz = -W.R_LOAD; dz <= W.R_LOAD; dz++) for (let dx = -W.R_LOAD; dx <= W.R_LOAD; dx++) if (!W.chunks.has(keyOf(cx + dx, cz + dz))) W.queue.push([cx + dx, cz + dz]);
  }
  if (force) {
    // finish everything in progress, then build the whole ring now (teleports, tests)
    for (const ch of W.chunks.values()) if (ch.stage >= 0 && ch.stage < DONE) while (!stepChunk(ch)) { /* finish */ }
    const d2 = c => { const ax = (c[0] + 0.5) * S - x, az = (c[1] + 0.5) * S - z; return ax * ax + az * az; };
    W.queue.sort((a, b) => d2(a) - d2(b));
    while (W.queue.length) { const [a, b] = W.queue.shift(); if (!W.chunks.has(keyOf(a, b))) loadChunk(a, b); }
    building = null; return;
  }
  // time-sliced streaming: advance the chunk in progress (nearest first), ≤ ~W.SLICE_MS of work per frame
  const t0 = performance.now();
  let guard = 0;
  while (guard++ < 8) {
    if (!building || building.stage < 0 || building.stage >= DONE) {
      building = null;
      if (!W.queue.length) return;
      const d2 = c => { const ax = (c[0] + 0.5) * S - x, az = (c[1] + 0.5) * S - z; return ax * ax + az * az; };
      W.queue.sort((a, b) => d2(a) - d2(b));
      const [a, b] = W.queue.shift();
      if (W.chunks.has(keyOf(a, b))) continue;
      building = startChunk(a, b);
    }
    if (stepChunk(building)) building = null;
    if (performance.now() - t0 > W.SLICE_MS) return;
  }
};
let building = null;
W.pending = () => W.queue.length + (building ? 1 : 0);
W.isBuilt = ch => !!ch && ch.stage === DONE;
W.reloadAll = function () { for (const ch of [...W.chunks.values()]) unloadChunk(ch); lastCx = null; W.queue = []; building = null; planCache.clear(); };
W.loadChunk = (cx, cz) => W.chunks.get(keyOf(cx, cz)) || loadChunk(cx, cz);
// rebuild the loaded chunks overlapping a rect (a kingdom's building site turns into its castle): they unload now and the
// streaming queue builds them again (time-sliced) on the next W.update; cached plans are dropped
W.reloadRect = function (x0, z0, x1, z1) {
  let n = 0;
  for (const ch of [...W.chunks.values()]) {
    const ax = ch.cx * W.CHUNK, az = ch.cz * W.CHUNK;
    if (ax + W.CHUNK < x0 || ax > x1 || az + W.CHUNK < z0 || az > z1) continue;
    if (building === ch) building = null;
    unloadChunk(ch); n++;
  }
  planCache.clear(); lastCx = null;
  return n;
};
W.unloadChunk = ch => unloadChunk(ch);

/* ------------------------------------------------ removing / regrowing / adding things */
W.removeThing = function (th, o) {
  o = o || {};
  const key = th.chunk || W.chunkKeyAt(th.x, th.z);
  const d = W.diff(key);
  if (th.addUid != null) {
    const i = d.add.findIndex(a => a.uid === th.addUid); if (i >= 0) d.add.splice(i, 1);
    const ci = F.save.castList.findIndex(c => c[1] === th.addUid); if (ci >= 0) F.save.castList.splice(ci, 1);
    if (th.walk) W.removeWalkable(th.walk);
  } else if (o.regrowMin) d.regrow[th.id] = W.clock() + o.regrowMin * 60;
  else if (d.rm.indexOf(th.id) < 0) d.rm.push(th.id);
  const ch = W.chunks.get(key);
  if (ch) { const i = ch.things.indexOf(th); if (i >= 0) ch.things.splice(i, 1); }
  F.Things.remove(th);
  F.store();
};
let uidN = 0;
W.addThing = function (type, x, z, o) {
  o = o || {};
  const key = W.chunkKeyAt(x, z), d = W.diff(key);
  const uid = Date.now().toString(36) + (uidN++).toString(36);
  const a = { uid, type, x: +x.toFixed(2), z: +z.toFixed(2), ry: o.ry || 0, data: o.data || {}, kind: o.kind || 'build', t: Date.now() };
  if (o.scale) a.scale = o.scale;
  if (o.walk) a.walk = o.walk;
  d.add.push(a);
  if (a.kind === 'cast') {
    F.save.castList.push([key, uid]);
    while (F.save.castList.length > 300) {
      const [k2, u2] = F.save.castList.shift();
      const d2 = W.diff(k2, false); if (!d2) continue;
      const i = d2.add.findIndex(r => r.uid === u2); if (i >= 0) d2.add.splice(i, 1);
      const ch2 = W.chunks.get(k2), th2 = ch2 && ch2.things.find(t => t.addUid === u2);
      if (th2) { if (F.FX && F.FX.sparkle) F.FX.sparkle(th2.obj.position.clone()); const i2 = ch2.things.indexOf(th2); ch2.things.splice(i2, 1); F.Things.remove(th2); }
    }
  }
  F.store();
  const ch = W.chunks.get(key);
  return ch ? spawnAdded(ch, a) : null;
};
// regrowth: every second, respawn due things in loaded chunks (they grow from scale 0)
let regrowAcc = 0;
F.on('tick', dt => {
  regrowAcc += dt; if (regrowAcc < 1) return; regrowAcc = 0;
  if (F.Space && F.Space.cur !== 'out') return;
  const now = W.clock();
  W.chunks.forEach(ch => {
    if (ch.stage !== DONE) return;
    const d = F.save.chunks[ch.key]; if (!d) return;
    for (const id in d.regrow) {
      if (d.regrow[id] > now) continue;
      delete d.regrow[id];
      const p = ch.planById && ch.planById[id]; if (!p || F.Things.byId(id)) continue;
      const th = spawnThing(ch, p.type, p.x, p.z, Object.assign({}, p.o, { id }));
      if (th && th.obj) { const s0 = th.obj.scale.x; th.obj.scale.setScalar(0.01); F.T.tween(700, k => th.obj.scale.setScalar(Math.max(0.01, s0 * U.smooth(k)))); }
      F.store();
    }
  });
});

/* ------------------------------------------------ navigation: A* on a 0.5 m grid around start/goal */
W.findPath = function (sx, sz, gx, gz, r = 0.35, ignore = null) {
  const cell = 0.5, pad = 14;
  const minX = Math.min(sx, gx) - pad, minZ = Math.min(sz, gz) - pad;
  const w = Math.ceil((Math.abs(gx - sx) + pad * 2) / cell), h = Math.ceil((Math.abs(gz - sz) + pad * 2) / cell);
  if (w * h > 200000) return null;
  const idx = (i, j) => j * w + i;
  const toI = x => Math.round((x - minX) / cell), toJ = z => Math.round((z - minZ) / cell);
  const blockedCache = new Int8Array(w * h); // 0 unknown, 1 free, 2 blocked
  const isFree = (i, j) => {
    if (i < 0 || j < 0 || i >= w || j >= h) return false;
    const k = idx(i, j);
    if (!blockedCache[k]) blockedCache[k] = W.blocked(minX + i * cell, minZ + j * cell, r, ignore) ? 2 : 1;
    return blockedCache[k] === 1;
  };
  const si = toI(sx), sj = toJ(sz); let gi = toI(gx), gj = toJ(gz);
  if (!isFree(gi, gj)) { // nearest free cell to goal
    let best = null;
    for (let rr = 1; rr < 10 && !best; rr++) for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) if (!best && isFree(gi + di, gj + dj)) best = [gi + di, gj + dj];
    if (!best) return null; [gi, gj] = best;
  }
  const g = new Float32Array(w * h).fill(Infinity), came = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
  const heap = []; const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const hfn = (i, j) => Math.hypot(i - gi, j - gj);
  const s = idx(si, sj); g[s] = 0; push(s, hfn(si, sj));
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let found = false, iter = 0;
  while (heap.length && iter++ < 60000) {
    const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
    const i = k % w, j = (k - i) / w;
    if (i === gi && j === gj) { found = true; break; }
    for (const [di, dj, c] of D) {
      const ni = i + di, nj = j + dj; if (!isFree(ni, nj)) continue;
      if (di && dj && (!isFree(i + di, j) || !isFree(i, j + dj))) continue;
      const nk2 = idx(ni, nj), ng = g[k] + c;
      if (ng < g[nk2]) { g[nk2] = ng; came[nk2] = k; push(nk2, ng + hfn(ni, nj)); }
    }
  }
  if (!found) return null;
  const pts = []; let k = idx(gi, gj);
  while (k !== -1 && k !== s) { const i = k % w, j = (k - i) / w; pts.push([minX + i * cell, minZ + j * cell]); k = came[k]; }
  pts.reverse();
  // string-pull: drop points with clear line of sight
  const clear = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25); for (let q2 = 1; q2 < n; q2++) { const t = q2 / n; if (W.blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, ignore)) return false; } return true; };
  const out = []; let cur = [sx, sz];
  for (let q2 = 0; q2 < pts.length; q2++) { if (q2 === pts.length - 1 || !clear(cur, pts[q2 + 1])) { out.push(pts[q2]); cur = pts[q2]; } }
  return out;
};
})();
