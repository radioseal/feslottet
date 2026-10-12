/* Feslottet – effects. Instanced particle pools (voxel cubes + soft translucent balls) and helpers.
   F.FX.burst(pos, {kind:'cube'|'petal'|'bubble'|'star'|'confetti'|'flour'|'water'|'heart'|'sparkle', n, colors, color, speed, up, life,
                     size, gravity, spread})                           – particles (kind sets colours/physics; any field overrides)
   F.FX.sparkle(pos, color)   F.FX.ring(pos, color)   F.FX.float(text, pos)   F.FX.pop(obj)   F.FX.wobble(obj, amp)
   F.FX.assemble(modelId, opts, targetGroup, worldPos, {from, ms, max}) -> Promise  – cubes fly into the model's voxels, then it shows
   F.FX.morph(obj, fromId, toId, opts, {ms}) -> Promise<Group>  – Bokstavbytte: cubes of the old model re-fly into the new one
   F.FX.tenTray(n, {model, opts, skin:'krystall'|'blomst'|'boble'|'stjerne'|'plain', pos, yaw, parent, max=20, unit, pop=true})
        -> {group, items, count, ready:Promise, setCount(k), highlight(i), highlightTen(t), slotPos(i) (world), dispose()}
        Rows of ten (always-visible frame per ten) + loose; Stjerne uses 2×5 star frames. Items pop in one by one.
   F.FX.numBlocks(n, {skin, pos, yaw, parent}) -> {group, parts:[{obj,kind:'ten'|'one'}], highlight(i), dispose()}  – rods of 10 + cubes (0–99)
   F.FX.glow(objOrPos, {color, size, ms}) -> {sprite, remove()}   (ms 0 = stays and pulses until remove())
   F.FX.trail(fromPos, toPos, {ms, color, n}) -> Promise          (sparkle arc, e.g. wand → thing)
   F.FX.silhouette(obj, {color, opacity}) -> {remove()}           (lilac see-through silhouette where walls hide the object) */
(function () {
'use strict';
const F = window.F;
const R = Math.random;
const V3 = THREE.Vector3;

/* ---------------------------------------------------------- particle pools
   One pool set per scene (outdoor, castle interior, title …): particles are spawned into the scene currently rendered (F.R.cur),
   live and die there, so a burst in a castle room shows in the room and in-flight particles never jump scenes.
   Each pool draws only up to its highest live slot and is hidden when empty (no idle instanced draw). */
const dummy = new THREE.Object3D(), col = new THREE.Color();
let geoCube = null, geoBall = null, matCube = null, matBall = null;
function makePool(geo, mat, max) {
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 5;
  mesh.raycast = () => {}; mesh.visible = false; mesh.count = 0; mesh.userData.fxPool = true;
  const P = [];
  for (let i = 0; i < max; i++) { P.push({ alive: false }); dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
  return { mesh, P, free: Array.from({ length: max }, (_, i) => max - 1 - i), max, any: false, hi: 0 };
}
const poolSets = new Map();     // scene -> {cube, ball}
function curScene() { return (F.R && F.R.cur) || (F.Space ? F.Space.scene() : F.R.scene); }
function poolsFor(sc) {
  sc = sc || curScene();
  let ps = poolSets.get(sc);
  if (!ps) {
    if (!geoCube) {
      geoCube = new THREE.BoxGeometry(1, 1, 1); geoBall = new THREE.IcosahedronGeometry(0.5, 1);
      matCube = new THREE.MeshLambertMaterial({ vertexColors: false });
      matBall = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.55, shininess: 100, specular: 0xffffff, depthWrite: false });
    }
    ps = { cube: makePool(geoCube, matCube, 3000), ball: makePool(geoBall, matBall, 400) };
    for (const k in ps) sc.add(ps[k].mesh);
    poolSets.set(sc, ps);
  }
  return ps;
}
// counts every particle / ring / glow made: the press safety net (things.js) reads it to know something visible happened
F.FX_SEEN = 0;
// where effects happened recently (one entry per effect call, not per particle): the press safety net checks "near the thing"
const fxLog = F.FX_LOG = [];
function note(p) { F.FX_SEEN++; if (!p) return; fxLog.push({ n: F.FX_SEEN, x: p.x, z: p.z, sc: curScene() }); if (fxLog.length > 64) fxLog.shift(); }
F.FX_note = note;
const _np = new THREE.Vector3();
function noteObj(obj) { if (!obj || !obj.getWorldPosition) return note(null); obj.getWorldPosition(_np); note(_np); }
function spawn(o) {
  const pool = poolsFor(o.scene)[o.ball ? 'ball' : 'cube'];
  const i = pool.free.pop(); if (i == null) return null;
  const p = pool.P[i];
  Object.assign(p, { alive: true, x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 1, t: 0, size: o.size || 0.08,
    g: o.g != null ? o.g : 6, spin: o.spin || 0, target: o.target || null, delay: o.delay || 0, sx: o.x, sy: o.y, sz: o.z, dur: o.dur || 1,
    flat: o.flat || 0, drag: o.drag || 0, wob: o.wob || 0, arc: o.arc != null ? o.arc : 1.2, onDone: o.onDone || null });
  col.setHex(o.color != null ? o.color : 0xffffff); pool.mesh.setColorAt(i, col); pool.mesh.instanceColor.needsUpdate = true;
  if (i + 1 > pool.hi) pool.hi = i + 1;
  pool.mesh.count = pool.hi; pool.mesh.visible = true;
  return p;
}
function stepPool(pool, dt) {
  let any = false, hi = 0;
  const { P, mesh } = pool;
  for (let i = 0; i < pool.hi; i++) {
    const p = P[i]; if (!p.alive) continue; any = true;
    p.t += dt;
    if (p.t < p.delay) { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); hi = i + 1; continue; }
    const tt = p.t - p.delay;
    let s = p.size;
    if (p.target) {
      const k = Math.min(1, tt / p.dur), e = 1 - Math.pow(1 - k, 3);
      p.x = p.sx + (p.target[0] - p.sx) * e; p.z = p.sz + (p.target[2] - p.sz) * e;
      p.y = p.sy + (p.target[1] - p.sy) * e + Math.sin(k * Math.PI) * p.arc;
      if (k >= 1) { p.alive = false; pool.free.push(i); s = 0; if (p.onDone) p.onDone(); }
    } else {
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vz *= d; p.vy *= d; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.wob) { p.x += Math.sin(p.t * 5 + p.sx * 9) * p.wob * dt; p.z += Math.cos(p.t * 4 + p.sz * 7) * p.wob * dt; }
      const left = 1 - tt / p.life; s = p.size * Math.max(0, Math.min(1, left * 3));
      if (tt >= p.life) { p.alive = false; pool.free.push(i); s = 0; }
    }
    if (p.alive) hi = i + 1;
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(tt * p.spin, tt * p.spin * 0.7, 0);
    const ss = Math.max(0.0001, s); dummy.scale.set(ss, p.flat ? ss * p.flat : ss, ss); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  if (any || pool.any) mesh.instanceMatrix.needsUpdate = true;
  pool.any = any;
  if (!any) {
    // all dead: hide, and keep the free list ordered low-first so the next burst draws few instances
    if (pool.hi) { pool.hi = 0; pool.free = Array.from({ length: pool.max }, (_, i) => pool.max - 1 - i); }
    mesh.visible = false; mesh.count = 0;
  } else { pool.hi = hi; mesh.count = hi; mesh.visible = hi > 0; }
}
F.on('tick', dt => { poolSets.forEach(ps => { for (const k in ps) stepPool(ps[k], dt); }); });
F.FX_pools = poolSets;

const KIND = {
  cube: { colors: [0x9fe8ff, 0xc6a8ff, 0xffffff, 0xb9e8ff], speed: 3, up: 3, life: 1, size: 0.1, gravity: 6 },
  petal: { colors: [0xf6a9c8, 0xff7fb0, 0xffffff, 0xfff0a0], speed: 1.8, up: 2.2, life: 2.0, size: 0.11, gravity: 0.9, flat: 0.25, drag: 1.2, wob: 1.2 },
  bubble: { colors: [0xcfefff, 0xbff0ff, 0xe8f8ff, 0xd8ccff], speed: 1.2, up: 1.4, life: 2.2, size: 0.22, gravity: -0.6, ball: true, drag: 0.8, wob: 0.8 },
  star: { colors: [0xfff0a0, 0xf5c542, 0xffffff, 0xffe066], speed: 2.4, up: 3.2, life: 1.2, size: 0.09, gravity: 2.5, drag: 0.6 },
  confetti: { colors: [0xff7fb0, 0xffd84a, 0x9ad6ff, 0xa6efcd, 0xc6a8ff, 0xff8a7a], speed: 3.4, up: 4.5, life: 2.2, size: 0.1, gravity: 3.2, flat: 0.2, drag: 0.9, wob: 0.6 },
  flour: { colors: [0xffffff, 0xfdfdf8, 0xf7ead0], speed: 1.0, up: 1.2, life: 1.6, size: 0.07, gravity: 0.4, drag: 1.5, wob: 0.4 },
  water: { colors: [0x6fcaf0, 0x9ad6ff, 0xd8f2ff], speed: 1.8, up: 4.0, life: 1.0, size: 0.08, gravity: 9 },
  heart: { colors: [0xff7fb0, 0xff5d8f, 0xffc8d8], speed: 0.9, up: 1.6, life: 1.8, size: 0.14, gravity: -0.4, drag: 0.8, wob: 0.6 },
  sparkle: { colors: [0xfff2a8, 0xffffff], speed: 1.2, up: 1.5, life: 0.7, size: 0.06, gravity: 0.5 },
};
const FX = F.FX = {
  KIND,
  burst(pos, o) {
    o = o || {};
    const K = KIND[o.kind] || {};
    const n = o.n || 24, colors = o.colors || (o.color != null ? [o.color] : null) || K.colors || [0xff7fb0, 0xffd84a, 0x9ad6ff, 0xa6efcd, 0xc6a8ff];
    const sp = o.speed || K.speed || 3, up = o.up != null ? o.up : (K.up != null ? K.up : 3);
    const life = o.life || K.life || 1, size = o.size || K.size || 0.09, g = o.gravity != null ? o.gravity : (K.gravity != null ? K.gravity : 6);
    note(pos);
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, r = (o.spread || 1) * (0.3 + R() * 0.7);
      spawn({ x: pos.x + (R() - .5) * 0.2, y: pos.y + (R() - .5) * 0.2, z: pos.z + (R() - .5) * 0.2, vx: Math.cos(a) * sp * r, vz: Math.sin(a) * sp * r, vy: up * (0.5 + R()),
        life: life * (0.7 + R() * 0.6), size: size * (0.6 + R() * 0.8), g, spin: K.ball ? 0 : 4 + R() * 6, color: colors[k % colors.length],
        flat: K.flat || 0, drag: K.drag || 0, wob: K.wob || 0, ball: !!K.ball });
    }
  },
  sparkle(pos, color) { FX.burst(pos, { kind: 'sparkle', colors: [color || 0xfff2a8, 0xffffff], n: 10 }); },
  ring(pos, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 32), new THREE.MeshBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + 0.05, pos.z); m.raycast = () => {}; curScene().add(m); note(pos);
    F.T.tween(600, k => { m.scale.setScalar(1 + k * 2.5); m.material.opacity = 0.9 * (1 - k); }).then(() => { if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); });
  },
  float(text, pos, cls) {
    note(pos);
    const el = document.createElement('div'); el.className = 'fxfloat ' + (cls || ''); el.textContent = text; document.body.appendChild(el);
    const p = pos.clone ? pos.clone() : new V3(pos.x, pos.y, pos.z);
    F.T.tween(1200, k => {
      const v = p.clone(); v.y += 0.5 + k * 1.5; v.project(F.R.camera);
      const r = F.R.renderer.domElement.getBoundingClientRect();
      el.style.left = (r.left + (v.x + 1) / 2 * r.width) + 'px'; el.style.top = (r.top + (1 - v.y) / 2 * r.height) + 'px'; el.style.opacity = String(1 - k * k);
    }).then(() => el.remove());
  },
  pop(obj) {
    if (!obj || obj.userData._popping) return Promise.resolve();
    obj.userData._popping = true; noteObj(obj); const s0 = obj.scale.clone();
    return F.T.tween(380, k => { const a = Math.sin(k * Math.PI) * 0.18 * (1 - k * 0.5); obj.scale.set(s0.x * (1 + a * 0.6), s0.y * (1 - a), s0.z * (1 + a * 0.6)); })
      .then(() => { obj.scale.copy(s0); obj.userData._popping = false; });
  },
  wobble(obj, amp = 0.15) {
    if (!obj || obj.userData._wob) return Promise.resolve();
    obj.userData._wob = true; noteObj(obj); const r0 = obj.rotation.z;
    return F.T.tween(700, k => { obj.rotation.z = r0 + Math.sin(k * Math.PI * 4) * amp * (1 - k); }).then(() => { obj.rotation.z = r0; obj.userData._wob = false; });
  },
  hop(obj, h = 0.35, ms = 420) {
    if (!obj || obj.userData._hop) return Promise.resolve();
    obj.userData._hop = true; noteObj(obj); const y0 = obj.position.y;
    return F.T.tween(ms, k => { obj.position.y = y0 + Math.sin(k * Math.PI) * h; }).then(() => { obj.position.y = y0; obj.userData._hop = false; });
  },
  // cubes fly into the model's voxel positions, then the model appears
  assemble(modelId, opts, target, worldPos, o) {
    o = o || {};
    const ms = o.ms || 1200;
    const pts = F.VOX.points(modelId, opts || {}, o.max || 350);
    const def = F.VOX.defs[modelId]; const vs = def.scale * (target.scale ? target.scale.x : 1);
    const from = o.from || new V3(worldPos.x, worldPos.y + 2, worldPos.z);
    target.visible = false; note(worldPos);
    const ry = target.rotation ? target.rotation.y : 0, cs = Math.cos(ry), sn = Math.sin(ry), sc = target.scale ? target.scale.x : 1;
    pts.forEach((p, k) => {
      const lx = p[0] * sc, lz = p[2] * sc;
      spawn({ x: from.x + (R() - .5) * 0.6, y: from.y + (R() - .5) * 0.6, z: from.z + (R() - .5) * 0.6, color: p[3], size: Math.max(vs, 0.04) * 1.05, delay: (k / pts.length) * ms / 1000 * 0.55, dur: ms / 1000 * 0.45,
        target: [worldPos.x + lx * cs + lz * sn, worldPos.y + p[1] * sc, worldPos.z - lx * sn + lz * cs], spin: 0 });
    });
    if (F.sfx.magic) F.sfx.magic();
    return F.T.sleep(ms + 80).then(() => { target.visible = true; FX.sparkle(new V3(worldPos.x, worldPos.y + 0.5, worldPos.z)); if (F.sfx.chime) F.sfx.chime(); });
  },
  // Bokstavbytte: the old model's cubes fly into the new model's voxels (HUS → MUS). Returns the new group (same transform, added to the same parent).
  morph(obj, fromId, toId, opts, o) {
    o = o || {}; opts = opts || {};
    const ms = o.ms || 1300;
    const a = F.VOX.points(fromId, o.fromOpts || opts, 300).slice().sort((p, q) => p[1] - q[1]);
    const b = F.VOX.points(toId, opts, 300).slice().sort((p, q) => p[1] - q[1]);
    obj.updateMatrixWorld(true); noteObj(obj);
    const m = obj.matrixWorld, v = new V3(), w = new V3();
    const sc = obj.getWorldScale(new V3()).x;
    const nu = F.VOX.make(toId, opts);
    nu.position.copy(obj.position); nu.rotation.copy(obj.rotation); nu.scale.copy(obj.scale); nu.visible = false;
    (obj.parent || F.Space.scene()).add(nu);
    obj.visible = false;
    const vs = F.VOX.defs[toId].scale * sc;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const pa = a[Math.floor(i * a.length / n)], pb = b[Math.floor(i * b.length / n)];
      v.set(pa[0], pa[1], pa[2]).applyMatrix4(m); w.set(pb[0], pb[1], pb[2]).applyMatrix4(m);
      spawn({ x: v.x, y: v.y, z: v.z, color: i % 3 ? pb[3] : pa[3], size: Math.max(vs, 0.04) * 1.05, delay: 0.15 + (i / n) * ms / 1000 * 0.35, dur: ms / 1000 * 0.55, target: [w.x, w.y, w.z], spin: 0, arc: 0.8 });
    }
    if (F.sfx.magic) F.sfx.magic();
    return F.T.sleep(ms + 60).then(() => {
      nu.visible = true; if (obj.parent) obj.parent.remove(obj);
      const c = new V3().setFromMatrixPosition(nu.matrixWorld); c.y += 0.4; FX.sparkle(c); if (F.sfx.chime) F.sfx.chime();
      return nu;
    });
  },
};

/* ---------------------------------------------------------- halo sprite (additive radial gradient) */
let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}
FX.haloTexture = halo;
FX.scene = curScene;
FX.glow = function (target, o) {
  o = o || {};
  const mat = new THREE.SpriteMaterial({ map: halo(), color: o.color != null ? o.color : 0xfff0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: o.opacity || 0.9 });
  const sp = new THREE.Sprite(mat); const size = o.size || 1.6; sp.scale.setScalar(size); sp.renderOrder = 6;
  if (target && target.isObject3D) {
    const b = new THREE.Box3().setFromObject(target), c = b.getCenter(new V3());
    target.worldToLocal(c); sp.position.copy(c);
    const ws = target.getWorldScale(new V3()).x || 1; sp.scale.setScalar(size / ws);
    target.add(sp);
  } else { sp.position.copy(target); curScene().add(sp); }
  sp.raycast = () => {}; { const w = new V3(); sp.getWorldPosition(w); note(w); }
  const h = { sprite: sp, dead: false, remove() { if (h.dead) return; h.dead = true; if (sp.parent) sp.parent.remove(sp); mat.dispose(); } };
  const s0 = sp.scale.x;
  if (o.ms > 0) F.T.tween(o.ms, k => { mat.opacity = (o.opacity || 0.9) * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8); }).then(h.remove);
  else (function pulse() { if (h.dead) return; F.T.tween(900, k => { sp.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * 0.18)); }).then(pulse); })();
  return h;
};
FX.trail = function (from, to, o) {
  o = o || {};
  note(to);
  const ms = o.ms || 700, n = o.n || 26, cols = o.colors || [o.color || 0xfff2a8, 0xffffff, 0xc6a8ff];
  for (let i = 0; i < n; i++) {
    spawn({ x: from.x, y: from.y, z: from.z, color: cols[i % cols.length], size: 0.06 + R() * 0.05, delay: (i / n) * ms / 1000 * 0.5, dur: ms / 1000 * 0.5,
      target: [to.x + (R() - .5) * 0.3, to.y + (R() - .5) * 0.3, to.z + (R() - .5) * 0.3], spin: 6, arc: o.arc != null ? o.arc : 0.9 });
  }
  if (F.sfx.sparkle) F.sfx.sparkle();
  return F.T.sleep(ms).then(() => FX.sparkle(to));
};
// see-through silhouette: drawn only where ANOTHER object hides this one.
//   pass 1 (mask): where the object itself is the visible front surface → stencil = 1 (no colour)
//   pass 2 (sil):  depth Greater (something is in front) AND stencil != 1 (not her own front parts) → lilac at 38%
//   Anything else that writes stencil 1 where it is visible is never tinted either: flying fauna do (fauna.js FA.flies, cloned
//   materials, renderOrder 2 – parent 11.10.: «when going under flying birds they become greyed out»); walls and trees still show her.
FX.silhouette = function (obj, o) {
  o = o || {};
  const mask = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, depthFunc: THREE.LessEqualDepth,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp });
  const mat = new THREE.MeshBasicMaterial({ color: o.color || 0xb9a5f0, transparent: true, opacity: o.opacity || 0.38, depthWrite: false, depthFunc: THREE.GreaterDepth,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp });
  const made = [];
  obj.traverse(m => {
    if (!m.isMesh || m.userData.isSil || (m.material && m.material.transparent && m.material.opacity < 0.7)) return;
    const mk = new THREE.Mesh(m.geometry, mask); mk.userData.isSil = true; mk.renderOrder = 49; mk.castShadow = false; mk.receiveShadow = false; mk.raycast = () => {};
    const sl = new THREE.Mesh(m.geometry, mat); sl.userData.isSil = true; sl.renderOrder = 50; sl.castShadow = false; sl.receiveShadow = false; sl.raycast = () => {};
    made.push([m, mk, sl]);
  });
  made.forEach(([m, mk, sl]) => { m.add(mk); m.add(sl); });
  return { material: mat, remove() { made.forEach(([m, mk, sl]) => { m.remove(mk); m.remove(sl); }); mat.dispose(); mask.dispose(); } };
};
})();

/* ===================================================================================================================
   Learning manipulatives: ten-trays (rows of 10 + loose, per fairy skin) and base-ten blocks (rods + cubes).
   All are real voxel models (F.VOX) built here: fx_m_<skin> items, fx_f_<skin> frames, fx_rod / fx_one blocks.        */
(function () {
'use strict';
const F = window.F;
const V3 = THREE.Vector3;
const VS = 1 / 16;         // voxel size
const SLOT = 7;            // voxels per slot  → unit 0.4375 m
const GAP = 2;             // extra gap between 5 and 6 (five-structure)
const ROW_W = 1 + 5 * SLOT + GAP + 5 * SLOT + 1;   // 74
const ROW_D = 9;
// slot centre x (voxels from the frame's left edge) for column j (0–9)
const colX = j => 1 + j * SLOT + (j >= 5 ? GAP : 0) + SLOT / 2;

/* ---------- item models (one counted thing per skin) */
F.VOX.def('fx_m_krystall', { size: [5, 8, 5], scale: VS, build(v, o) {     // a faceted gem crystal
  const c = o.c || 'gem2';
  v.box(1, 0, 1, 3, 0, 3, c); v.box(0, 1, 1, 4, 4, 3, c); v.box(1, 1, 0, 3, 4, 4, c); v.box(1, 5, 1, 3, 6, 3, c); v.set(2, 7, 2, 'white');
  v.box(1, 1, 4, 1, 4, 4, 'white'); v.box(0, 1, 3, 0, 4, 3, 'ice'); v.set(1, 5, 3, 'white'); v.set(1, 6, 3, 'ice'); v.set(3, 2, 4, 'ice');
}, meta: { group: 'fx' } });
F.VOX.def('fx_m_blomst', { size: [7, 11, 7], scale: VS, build(v, o) {
  v.cyl(3, 0, 3, 2.2, 3, 'woodRed'); v.box(1, 3, 1, 5, 3, 5, 'woodRed'); v.box(2, 3, 2, 4, 3, 4, 'soil');
  v.line(3, 4, 3, 3, 7, 3, 'leaf'); v.set(2, 5, 3, 'leaf'); v.set(4, 6, 3, 'leaf');
  const c = o.c || 'blossom';
  v.box(2, 8, 2, 4, 10, 4, c); v.set(3, 9, 1, c); v.set(3, 9, 5, c); v.set(1, 9, 3, c); v.set(5, 9, 3, c); v.set(3, 9, 3, 'yellow'); v.set(3, 9, 5, 'yellow');
  v.clear(2, 10, 2, 2, 10, 2); v.clear(4, 10, 4, 4, 10, 4);
}, meta: { group: 'fx' } });
F.VOX.def('fx_m_boble', { size: [7, 7, 7], scale: VS, build(v, o) {
  v.sphere(3, 3, 3, 3.1, o.c || 'sky'); v.box(1, 0, 1, 5, 1, 5, 0); v.sphere(3, 3, 3, 3.1, 0); v.sphere(3, 3, 3, 3.0, o.c || 'sky');
  v.set(2, 5, 6, 'white'); v.set(1, 4, 6, 'white'); v.set(2, 4, 6, 'white'); v.set(4, 1, 6, 'lavender'); v.set(5, 2, 5, 'lavender');
}, meta: { group: 'fx' } });
F.VOX.def('fx_m_stjerne', { size: [9, 9, 3], scale: VS, build(v) {
  const S = ['000010000', '000111000', '000111000', '111111111', '011111110', '001111100', '011101110', '011000110', '110000011'];
  S.forEach((row, r) => [...row].forEach((ch, x) => { if (ch === '1') { v.set(x, 8 - r, 1, 'butter'); v.set(x, 8 - r, 0, 'gold'); v.set(x, 8 - r, 2, 'gold'); } }));
  v.set(4, 5, 2, 'glowYellow'); v.set(4, 4, 2, 'glowYellow');
}, meta: { group: 'fx' } });
F.VOX.def('fx_m_plain', { size: [5, 5, 5], scale: VS, build(v, o) { v.box(0, 0, 0, 4, 4, 4, o.c || 'pink'); v.box(1, 4, 1, 3, 4, 3, 'white'); }, meta: { group: 'fx' } });

/* ---------- frames (one per ten) */
F.VOX.def('fx_f_krystall', { size: [ROW_W, 7, ROW_D], scale: VS, build(v) {
  v.box(0, 0, 0, ROW_W - 1, 0, ROW_D - 1, 'lavender');
  v.box(0, 1, 0, ROW_W - 1, 6, 0, 'glass'); v.box(0, 1, ROW_D - 1, ROW_W - 1, 6, ROW_D - 1, 'glass');
  v.box(0, 1, 0, 0, 6, ROW_D - 1, 'glass'); v.box(ROW_W - 1, 1, 0, ROW_W - 1, 6, ROW_D - 1, 'glass');
  v.box(0, 6, 0, ROW_W - 1, 6, 0, 'crystal'); v.box(0, 6, ROW_D - 1, ROW_W - 1, 6, ROW_D - 1, 'crystal');
  const mx = 1 + 5 * SLOT; v.box(mx, 0, 0, mx + GAP - 1, 0, ROW_D - 1, 'lilac');
}, meta: { group: 'fx' } });
F.VOX.def('fx_f_blomst', { size: [ROW_W, 4, ROW_D + 2], scale: VS, build(v) {
  v.box(0, 0, 0, ROW_W - 1, 3, ROW_D + 1, 'woodLight'); v.box(1, 1, 1, ROW_W - 2, 3, ROW_D, 'soil'); v.clear(1, 3, 1, ROW_W - 2, 3, ROW_D);
  v.box(0, 3, 0, ROW_W - 1, 3, 0, 'wood'); v.box(0, 3, ROW_D + 1, ROW_W - 1, 3, ROW_D + 1, 'wood');
  for (let x = 3; x < ROW_W; x += 9) v.set(x, 3, 0, 'leaf');
}, meta: { group: 'fx' } });
F.VOX.def('fx_f_boble', { size: [ROW_W, 2, ROW_D], scale: VS, build(v) {
  v.box(0, 0, 0, ROW_W - 1, 0, ROW_D - 1, 'teal'); v.box(1, 1, 1, ROW_W - 2, 1, ROW_D - 2, 'sky'); v.clear(2, 1, 2, ROW_W - 3, 1, ROW_D - 3);
  for (let j = 0; j < 10; j++) v.set(Math.floor(colX(j)), 1, 4, 'white');
}, meta: { group: 'fx' } });
F.VOX.def('fx_f_plain', { size: [ROW_W, 2, ROW_D], scale: VS, build(v) {
  v.box(0, 0, 0, ROW_W - 1, 1, ROW_D - 1, 'woodLight'); v.box(0, 1, 0, ROW_W - 1, 1, ROW_D - 1, 'wood');
  for (let j = 0; j < 10; j++) { const x = Math.floor(colX(j)); v.box(x - 2, 1, 2, x + 2, 1, 6, 'woodLight'); }
}, meta: { group: 'fx' } });
const SF_W = 1 + 5 * SLOT + 1, SF_D = 1 + 2 * SLOT + 1;
F.VOX.def('fx_f_stjerne', { size: [SF_W, 2, SF_D], scale: VS, build(v) {
  v.box(0, 0, 0, SF_W - 1, 1, SF_D - 1, 'gold'); v.box(1, 1, 1, SF_W - 2, 1, SF_D - 2, 'lavender');
  v.box(1, 1, 1 + SLOT, SF_W - 2, 1, 1 + SLOT, 'gold');
  for (let c = 1; c < 5; c++) v.box(1 + c * SLOT, 1, 1, 1 + c * SLOT, 1, SF_D - 2, 'gold');
}, meta: { group: 'fx' } });

/* ---------- sky: soft voxel clouds (3 shapes; render.js drifts 10 of them) */
F.VOX.def('fx_cloud', { size: [26, 9, 16], scale: 1 / 2, build(v, o) {
  const k = o.v || 0;
  if (k === 0) { v.ellipsoid(8, 3, 8, 7, 3.2, 6, 'white'); v.ellipsoid(16, 4, 8, 7, 4.2, 6.5, 'white'); v.ellipsoid(12, 6, 7, 5, 3, 4, 'white'); }
  else if (k === 1) { v.ellipsoid(13, 3, 8, 12, 3, 6, 'white'); v.ellipsoid(10, 5, 8, 5, 3, 4, 'white'); v.ellipsoid(17, 5, 7, 4, 2.5, 3.5, 'white'); }
  else { v.ellipsoid(9, 3, 8, 6, 3, 5, 'white'); v.ellipsoid(15, 3.5, 9, 6, 3.4, 5, 'white'); v.ellipsoid(20, 2.5, 8, 4, 2.4, 4, 'white'); v.ellipsoid(13, 6, 8, 4, 2.5, 3, 'white'); }
  v.paint((x, y, z, c) => y <= 1 ? 0xeef4fb : null);
}, meta: { group: 'fx', variants: { v: [0, 1, 2] } } });

/* ---------- base-ten blocks: a rod of 10 two-tone cubes, and a single cube */
const SKIN_COL = { krystall: ['gem2', 'blue'], blomst: ['rose', 'pink'], boble: ['teal', 'gem2'], stjerne: ['gold', 'honey'], plain: ['coral', 'woodRed'] };
F.VOX.def('fx_rod', { size: [40, 4, 4], scale: VS, build(v, o) { for (let i = 0; i < 10; i++) { v.box(i * 4, 0, 0, i * 4 + 3, 3, 3, i % 2 ? o.c2 || 'blue' : o.c1 || 'gem2'); v.box(i * 4, 3, 0, i * 4 + 3, 3, 0, 'white'); } }, meta: { group: 'fx' } });
F.VOX.def('fx_one', { size: [4, 4, 4], scale: VS, build(v, o) { v.box(0, 0, 0, 3, 3, 3, o.c1 || 'gem2'); v.box(0, 3, 0, 3, 3, 0, 'white'); }, meta: { group: 'fx' } });

const styleOf = skin => null;   // manipulatives stay opaque + saturated (crystal look comes from colour + white facets)
function addTo(o, g) { (o.parent || F.Space.scene()).add(g); }

F.FX.numBlocks = function (n, o) {
  o = o || {};
  n = Math.max(0, Math.min(99, Math.round(n)));
  const skin = SKIN_COL[o.skin] ? o.skin : 'krystall';
  const [c1, c2] = SKIN_COL[skin];
  const st = styleOf(skin);
  const g = new THREE.Group();
  const tens = Math.floor(n / 10), ones = n % 10;
  const rowZ = 0.36, L = 40 * VS;
  const parts = [];
  const totalRows = tens + (ones ? 1 : 0);
  const z0 = -(totalRows - 1) * rowZ / 2;
  for (let t = 0; t < tens; t++) {
    const r = F.VOX.make('fx_rod', st ? { c1, c2, style: st } : { c1, c2 });
    r.position.set(0, 0, z0 + t * rowZ); g.add(r); parts.push({ obj: r, kind: 'ten' });
  }
  for (let i = 0; i < ones; i++) {
    const c = F.VOX.make('fx_one', st ? { c1: i % 2 ? c2 : c1, style: st } : { c1: i % 2 ? c2 : c1 });
    c.position.set(-L / 2 + 4 * VS * (i + 0.5) + (i >= 5 ? 0.08 : 0), 0, z0 + tens * rowZ); g.add(c); parts.push({ obj: c, kind: 'one' });
  }
  if (o.pos) g.position.copy(o.pos);
  g.rotation.y = o.yaw != null ? o.yaw : F.R.cam.yaw;
  if (o.add !== false) addTo(o, g);
  g.scale.setScalar(o.scale || 1.15);
  return {
    group: g, parts, tens, ones,
    highlight(i) { const p = parts[i]; if (!p) return; F.FX.hop(p.obj, p.kind === 'ten' ? 0.25 : 0.3, 380); const w = new V3(); p.obj.getWorldPosition(w); w.y += 0.25; if (p.kind === 'ten') { w.add(new V3(Math.cos(g.rotation.y) * L / 2 * g.scale.x, 0, -Math.sin(g.rotation.y) * L / 2 * g.scale.x)); } F.FX.sparkle(w); },
    dispose() { if (g.parent) g.parent.remove(g); },
  };
};

F.FX.tenTray = function (n, o) {
  o = o || {};
  const skin = ['krystall', 'blomst', 'boble', 'stjerne', 'plain'].includes(o.skin) ? o.skin : 'krystall';
  const max = Math.max(10, Math.min(30, o.max || 20));
  const frameLayout = skin === 'stjerne' && !o.model;
  const g = new THREE.Group();
  if (o.pos) g.position.copy(o.pos);
  g.rotation.y = o.yaw != null ? o.yaw : F.R.cam.yaw;
  const sc = o.scale || 1;
  g.scale.setScalar(sc);
  const U = SLOT * VS;
  const nTens = Math.ceil(max / 10);
  const frameModel = o.model ? 'fx_f_plain' : (frameLayout ? 'fx_f_stjerne' : 'fx_f_' + skin);
  // local slot positions
  const slotLocal = i => {
    const t = Math.floor(i / 10), j = i % 10;
    if (frameLayout) {
      const cx = (t - (Math.min(nTens, 2) - 1) / 2) * (SF_W * VS + 0.45) + (t >= 2 ? 0 : 0);
      const col = j % 5, row = Math.floor(j / 5);
      return new V3(cx + (col - 2) * U, 0.12, (t >= 2 ? (SF_D * VS + 0.3) : 0) + (row - 0.5) * U);
    }
    const x = (colX(j) - ROW_W / 2) * VS;
    const rows = Math.min(nTens, 3);
    const z = (t - (rows - 1) / 2) * (ROW_D * VS + 0.4);
    return new V3(x, 0.07, z);
  };
  // frames: one per ten that will hold items (at least the first)
  const frames = [];
  const needFrames = Math.max(1, Math.ceil(Math.max(n, 1) / 10));
  for (let t = 0; t < nTens; t++) {
    const f = F.VOX.make(frameModel, {});
    const c = frameLayout ? slotLocal(t * 10 + 2).add(new V3(0, 0, 0.5 * U)) : slotLocal(t * 10).setX(0);
    f.position.set(c.x, 0, c.z);
    f.visible = t < needFrames;
    g.add(f); frames.push(f);
  }
  // items
  const items = [];
  const itemOpts = Object.assign({}, o.opts || {});
  const st = !o.model ? styleOf(skin) : null;
  const flowerCols = ['rose', 'pink', 'yellow', 'purple', 'coral'];
  for (let i = 0; i < max; i++) {
    let obj;
    if (o.model && F.VOX.has(o.model)) {
      obj = F.VOX.make(o.model, itemOpts);
      const b = F.VOX.bbox(obj), s = b.getSize(new V3());
      obj.scale.multiplyScalar((U * 0.86) / Math.max(s.x, s.z, s.y * 0.8, 0.05));
    } else {
      const id = 'fx_m_' + (o.model ? 'plain' : skin);
      const op = skin === 'blomst' ? { c: flowerCols[i % flowerCols.length] } : skin === 'krystall' ? { c: (i < 10 ? 'gem2' : 'purple') } : skin === 'boble' ? { c: (i < 10 ? 'sky' : 'lilac') } : {};
      obj = F.VOX.make(id, op);
    }
    const holder = new THREE.Group(); holder.add(obj);
    holder.position.copy(slotLocal(i));
    if (skin === 'boble' && !o.model) holder.position.y += 0.12;
    holder.visible = false;
    g.add(holder); items.push(holder);
  }
  if (o.add !== false) addTo(o, g);
  let count = 0;
  const T = {
    group: g, items, frames, skin, max, unit: U * sc,
    get count() { return count; },
    slotPos(i) { const w = slotLocal(i); return g.localToWorld(w); },
    setCount(k, pop) {
      k = Math.max(0, Math.min(max, k));
      const old = count; count = k;
      frames.forEach((f, t) => { f.visible = t === 0 || t * 10 < Math.max(k, n); });
      const proms = [];
      items.forEach((it, i) => {
        const on = i < k;
        if (on && !it.visible) {
          it.visible = true;
          if (pop !== false) { it.scale.setScalar(0.01); proms.push(F.T.sleep((i - old) * 55).then(() => F.T.tween(260, kk => it.scale.setScalar(Math.max(0.01, kk * (1 + Math.sin(kk * Math.PI) * 0.3))))).then(() => { if (F.sfx.pop && i % 2 === 0) F.sfx.pop(); })); }
          else it.scale.setScalar(1);
        } else if (!on && it.visible) it.visible = false;
      });
      return Promise.all(proms);
    },
    highlight(i) {
      const it = items[i]; if (!it || !it.visible) return;
      F.FX.hop(it, 0.32 * sc, 380);
      F.FX.sparkle(T.slotPos(i).add(new V3(0, 0.35 * sc, 0)));
    },
    // the whole ten glows and does a wave (used when counting «ti»)
    highlightTen(t) {
      const f = frames[t]; if (!f) return;
      const gl = F.FX.glow(f, { color: 0xfff0a0, size: 3.2, ms: 1100 });
      for (let j = 0; j < 10; j++) { const it = items[t * 10 + j]; if (it && it.visible) F.T.sleep(j * 40).then(() => F.FX.hop(it, 0.22 * sc, 320)); }
      return gl;
    },
    dispose() { if (g.parent) g.parent.remove(g); },
  };
  T.ready = o.pop === false ? (T.setCount(n, false), Promise.resolve()) : T.setCount(n, true);
  return T;
};
})();
