/* Feslottet – renderer, two scenes (outdoor F.R.scene, interior F.R.inScene), lights, sky, camera modes, main loop.
   F.R.scene (outdoor), F.R.inScene (castle dollhouse), F.R.cur (scene being rendered), F.R.useScene('out'|'in')
   F.R.cam = { target, dist, yaw, pitch, mode:'out'|'room'|'overview', ... } – smooth follow
   F.R.setCam({mode, target, dist, pitch, yaw})  F.R.zoomStep(+1|-1)  F.R.rotateStep(+1|-1)  (90°, eased)
   Loop: each frame -> F.T.step(dt); F.emit('tick', dt, t); render.  Tests: F.debug.frames(n, dt) / F.dbg.step(sec). */
(function () {
'use strict';
const F = window.F;
const R = F.R = {};
const renderer = R.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!(F.flags.debug || F.flags.silent) });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // R.perf may step it down (adaptPR)
renderer.shadowMap.enabled = !F.flags.noshadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ---------------------------------------------------------- outdoor scene */
const scene = R.scene = new THREE.Scene();
const SKY = new THREE.Color(0xbfe8ff);
scene.background = SKY.clone();
scene.fog = new THREE.Fog(SKY.getHex(), 70, 150);
const hemi = R.hemi = new THREE.HemisphereLight(0xfff8ee, 0x88b878, 0.58); scene.add(hemi);
const sun = R.sun = new THREE.DirectionalLight(0xfff1d6, 0.72);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
scene.add(sun); scene.add(sun.target);
const amb = R.amb = new THREE.AmbientLight(0xffffff, 0.05); scene.add(amb);
(function sky() {
  const g = new THREE.SphereGeometry(400, 24, 12), top = new THREE.Color(0x7cc4f5), bot = new THREE.Color(0xe6f6ff), c = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = Math.max(0, p.getY(i) / 400); const cc = bot.clone().lerp(top, Math.pow(k, 0.6)); c.push(cc.r, cc.g, cc.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; R.skyDome = m; scene.add(m);
  R.skyColors = (topC, botC) => {
    const col = g.attributes.color;
    for (let i = 0; i < p.count; i++) { const k = Math.max(0, p.getY(i) / 400); const cc = botC.clone().lerp(topC, Math.pow(k, 0.6)); col.setXYZ(i, cc.r, cc.g, cc.b); }
    col.needsUpdate = true;
  };
})();

/* ---------------------------------------------------------- day tint: morning → day → warm afternoon over the session (never dark).
   k = today's play time / bedtime limit. SHELL's bedtime golden light (F.Day.golden) takes over the light colours when it starts.
   F.R.dayK (current), F.R.setDay(k|null) forces a value (null = automatic). */
const DAY = [   // k, hemi sky, hemi ground, sun, sky top, sky bottom/fog
  [0.00, 0xfff0ee, 0x90bc88, 0xffe0c4, 0x8fc8f2, 0xfde6ec],
  [0.30, 0xfff8ee, 0x88b878, 0xfff1d6, 0x7cc4f5, 0xe6f6ff],
  [0.75, 0xfff8ee, 0x88b878, 0xfff1d6, 0x7cc4f5, 0xe6f6ff],
  [1.00, 0xfff0dc, 0x96b474, 0xffdcac, 0x88bcef, 0xfde8d0],
];
const _c = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()], _d = new THREE.Color();
let dayForced = null, dayAcc = 99;
R.dayK = 0;
R.setDay = k => { dayForced = k; dayAcc = 99; };
function dayTint(dt) {
  dayAcc += dt; if (dayAcc < 1.5) return; dayAcc = 0;
  let k = dayForced;
  if (k == null) {
    const lim = (F.Day && F.Day.limitSec && F.Day.limitSec()) || 1500;
    const ps = (F.save && F.save.today && F.save.today.playSec != null) ? F.save.today.playSec : F.T.now;
    k = F.U.clamp(ps / lim, 0, 1);
  }
  R.dayK = k;
  let i = 0; while (i < DAY.length - 2 && k > DAY[i + 1][0]) i++;
  const a = DAY[i], b = DAY[i + 1], t = F.U.smooth(F.U.clamp((k - a[0]) / (b[0] - a[0] || 1), 0, 1));
  for (let j = 0; j < 5; j++) _c[j].setHex(a[j + 1]).lerp(_d.setHex(b[j + 1]), t);
  if (!(F.Day && F.Day.golden)) { hemi.color.copy(_c[0]); hemi.groundColor.copy(_c[1]); sun.color.copy(_c[2]); }
  R.skyColors(_c[3], _c[4]);
  scene.fog.color.copy(_c[4]); scene.background.copy(_c[4]);
}

/* ---------------------------------------------------------- drifting voxel clouds (y 45–60; visible in the castle overview / low-pitch views) */
const clouds = [];
function makeClouds() {
  if (!F.VOX || !F.VOX.has('fx_cloud')) return;
  const r = F.U.rng(77);
  for (let i = 0; i < 10; i++) {
    const c = F.VOX.make('fx_cloud', { v: i % 3 });
    c.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });   // no cloud shadows: the ground never darkens
    c.position.set((r() - 0.5) * 300, 45 + r() * 15, (r() - 0.5) * 300); c.rotation.y = r() * Math.PI;
    c.userData.sp = 0.5 + r() * 0.6;
    scene.add(c); clouds.push(c);
  }
}
function driftClouds(dt) {
  if (!clouds.length) return;
  const cx = R.cam.smooth.x, cz = R.cam.smooth.z;
  for (const c of clouds) {
    c.position.x += c.userData.sp * dt; c.position.z += c.userData.sp * 0.35 * dt;
    if (c.position.x - cx > 150) c.position.x -= 300; if (c.position.x - cx < -150) c.position.x += 300;
    if (c.position.z - cz > 150) c.position.z -= 300; if (c.position.z - cz < -150) c.position.z += 300;
  }
}
F.on('boot', makeClouds);

/* ---------------------------------------------------------- interior scene (dollhouse rooms; never dark) */
const inScene = R.inScene = new THREE.Scene();
inScene.background = new THREE.Color(0xffe9dc);
const inHemi = R.inHemi = new THREE.HemisphereLight(0xfff3e0, 0xd8c0a0, 0.85); inScene.add(inHemi);
const inSun = R.inSun = new THREE.DirectionalLight(0xfff4e4, 0.55);
inSun.castShadow = true; inSun.shadow.mapSize.set(2048, 2048); inSun.shadow.bias = -0.0006; inSun.shadow.normalBias = 0.02;
Object.assign(inSun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
inScene.add(inSun); inScene.add(inSun.target);

R.cur = scene;
R.useScene = function (name) {
  R.cur = name === 'in' ? inScene : scene;
  R.cam.init = false;
};

/* ---------------------------------------------------------- camera */
const camera = R.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
const ZOOM = [16, 24, 36];
const ZOOM_IN = [11, 15, 20];   // DESIGN2 §2.5: indoor ('in') zoom steps, pitch 0.66, yaw fixed 0
R.cam = { target: new THREE.Vector3(), dist: 24, yaw: 0, pitch: 0.92, mode: 'out', zoomI: 1, smooth: new THREE.Vector3(), init: false, shake: 0,
  yawGoal: 0, distGoal: 24, pitchGoal: 0.92, minDist: 12, maxDist: 70 };
R.setCam = function (o) {
  const c = R.cam;
  if (o.mode) c.mode = o.mode;
  if (o.target) c.target.copy(o.target);
  if (o.dist != null) c.distGoal = o.dist;
  if (o.pitch != null) c.pitchGoal = o.pitch;
  if (o.yaw != null) c.yawGoal = o.yaw;
  if (o.snap) { c.dist = c.distGoal; c.pitch = c.pitchGoal; c.yaw = c.yawGoal; c.init = false; }
};
R.ZOOM = ZOOM; R.ZOOM_IN = ZOOM_IN;
R.zoomStep = function (d) {
  const c = R.cam;
  if (c.mode === 'in') { c.zoomInI = F.U.clamp((c.zoomInI != null ? c.zoomInI : 1) + d, 0, ZOOM_IN.length - 1); c.distGoal = ZOOM_IN[c.zoomInI]; return; }
  if (c.mode !== 'out') return;
  c.zoomI = F.U.clamp(c.zoomI + d, 0, ZOOM.length - 1); c.distGoal = ZOOM[c.zoomI];
};
R.rotateStep = function (d) {
  const c = R.cam;
  if (c.mode === 'in') { if (F.sfx && F.sfx.boing) F.sfx.boing(); return; }   // indoors the view never turns (dollhouse rows face the camera)
  if (c.mode !== 'out') return; c.yawGoal += d * Math.PI / 2;
};
// scripted glance (DESIGN2 §2.5 'look'): the view leans 70 % from the fairy toward a point, then back; any tap cancels.
// F.R.look({x,y,z}, {ms=3200, dist=46, pitch=0.55}) -> Promise
// a glance never survives a space change (door crossing / fast travel)
F.on('spaceChanged', () => { const L = R.cam.look; if (L && L.done) L.done(); });
R.look = function (target, o) {
  o = o || {};
  const c = R.cam;
  if (c.look && c.look.done) c.look.done();
  return new Promise(res => {
    const L = c.look = { tx: target.x, ty: target.y || 0, tz: target.z, ms: o.ms || 3200, dist: o.dist || 46, pitch: o.pitch != null ? o.pitch : 0.55, t: 0, e: 0, cancel: false };
    const off = () => { removeEventListener('pointerdown', cancel, true); removeEventListener('keydown', cancel, true); };
    const cancel = () => { L.cancel = true; };
    L.done = () => { off(); if (c.look === L) c.look = null; res(!L.cancel); };
    addEventListener('pointerdown', cancel, true); addEventListener('keydown', cancel, true);
  });
};
R.setSize = function () {
  const host = document.getElementById('view');
  const w = host ? host.clientWidth : innerWidth, h = host ? host.clientHeight : innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
};
addEventListener('resize', R.setSize);

/* ---------------------------------------------------------- landmark framing (outdoors, no task focus)
   When the fairy stands in front of a big landmark (the castle face that looks at the camera), the camera smoothly pulls back and
   flattens so the whole landmark reads, while the fairy stays in the lower part of the view (above the Staven button). Never changes yaw.
   R.frameSpots: [{id, x, z, hx, hz (half extents), range (m in front of the face), D (min camera distance), elev (rad, fairy→camera),
   off (rad, how far below the view centre the fairy sits)}].  R.cam.frameK = current blend 0..1 (smoothed). Modules may push spots. */
R.frameSpots = [{ id: 'castle', x: 0, z: 0, hx: 24, hz: 16, range: 40, D: 38, elev: 0.63, off: 0.19 }];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function frameGoal(c) {
  if (c.mode !== 'out' || c.focus || R.cur !== scene || !R.frameSpots.length) return null;
  const vx = Math.sin(c.yawGoal), vz = Math.cos(c.yawGoal);    // unit vector from the fairy toward the camera (ground plane)
  let best = null, bk = 0;
  for (const s of R.frameSpots) {
    const px = c.target.x - s.x, pz = c.target.z - s.z;
    const along = px * vx + pz * vz, lat = Math.abs(px * vz - pz * vx);
    const edge = Math.abs(vx) * s.hx + Math.abs(vz) * s.hz, halfW = Math.abs(vz) * s.hx + Math.abs(vx) * s.hz;
    const d = along - edge;                                     // metres in front of the face that looks at the camera
    if (d < -3 || d > s.range + 12 || lat > halfW + 22) continue;
    const k = sstep(-3, 3, d) * (1 - sstep(s.range - 8, s.range + 12, d)) * (1 - sstep(halfW + 4, halfW + 22, lat));
    if (k > bk) { bk = k; best = s; }
  }
  return best ? { s: best, k: bk } : null;
}
let frameS = null;
const _fp = new THREE.Vector3(), _fl = new THREE.Vector3();
function updateCamera(dt) {
  const c = R.cam;
  const k = 1 - Math.exp(-dt * 6);
  c.dist += (c.distGoal - c.dist) * k; c.pitch += (c.pitchGoal - c.pitch) * k; c.yaw += (c.yawGoal - c.yaw) * k;
  const fg = frameGoal(c);
  if (fg) frameS = fg.s;
  const fk = fg ? fg.k * (c.zoomI === 0 ? 0.55 : 1) : 0;
  if (!c.init) { c.smooth.copy(c.target); c.dist = c.distGoal; c.pitch = c.pitchGoal; c.yaw = c.yawGoal; c.frameK = fk; c.init = true; }
  c.frameK = (c.frameK || 0) + (fk - (c.frameK || 0)) * (1 - Math.exp(-dt * 1.6));
  c.smooth.lerp(c.target, 1 - Math.exp(-dt * 5));
  let d = c.dist, pitchNow = c.pitch;
  let bx = c.smooth.x, by = c.smooth.y, bz = c.smooth.z;
  const LK = c.look;
  if (LK) {   // scripted glance: envelope up (25 %), hold, down (25 %); a tap shortens it to a quick return
    LK.t += dt * 1000;
    if (LK.cancel && LK.t < LK.ms * 0.75) LK.t = Math.max(LK.t, LK.ms * 0.75);
    const u = LK.t / LK.ms; const e = u < 0.25 ? F.U.smooth(u / 0.25) : u < 0.75 ? 1 : F.U.smooth(Math.max(0, 1 - (u - 0.75) / 0.25));
    LK.e = e;
    bx += (LK.tx - bx) * 0.7 * e; by += (LK.ty - by) * 0.7 * e * 0.3; bz += (LK.tz - bz) * 0.7 * e;
    d += (LK.dist - d) * e; pitchNow += (LK.pitch - pitchNow) * e;
    if (u >= 1) LK.done();
  }
  const cp = Math.cos(pitchNow), sp = Math.sin(pitchNow), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
  camera.position.set(bx + sy * cp * d, by + sp * d, bz + cy * cp * d);
  let lx = bx, ly = by + 1, lz = bz;
  const FK = frameS && c.frameK > 0.002 && !LK ? c.frameK : 0;
  if (FK) {   // framed pose: camera at distance D, elevation elev from the fairy; view centre tilted up by off
    const fs = frameS, D = Math.max(fs.D, d * 1.15), ce = Math.cos(fs.elev), se = Math.sin(fs.elev), pc = fs.elev - fs.off;
    _fp.set(c.smooth.x + sy * ce * D, c.smooth.y + 0.6 + se * D, c.smooth.z + cy * ce * D);
    _fl.set(_fp.x - sy * Math.cos(pc) * D, _fp.y - Math.sin(pc) * D, _fp.z - cy * Math.cos(pc) * D);
    camera.position.lerp(_fp, FK);
    lx += (_fl.x - lx) * FK; ly += (_fl.y - ly) * FK; lz += (_fl.z - lz) * FK;
  }
  if (c.shake > 0) { camera.position.x += (Math.random() - .5) * c.shake; camera.position.y += (Math.random() - .5) * c.shake; c.shake = Math.max(0, c.shake - dt); }
  camera.lookAt(lx, ly, lz);
  if (R.cur === scene) {
    const shx = c.smooth.x + (lx - c.smooth.x) * 0.5, shz = c.smooth.z + (lz - c.smooth.z) * 0.5;   // shadow box follows the view (framed views look further)
    sun.position.set(shx + 30, c.smooth.y + 55, shz + 22); sun.target.position.set(shx, c.smooth.y, shz);
    R.skyDome.position.copy(camera.position);
  } else {
    inSun.position.set(c.smooth.x + 6, c.smooth.y + 22, c.smooth.z + 16); inSun.target.position.copy(c.smooth);
  }
}

/* ---------------------------------------------------------- cheap performance wins (WP CORE wave 2)
   1. camera.far follows the fog: everything beyond fog.far is pure fog colour, so clipping it there is invisible (and it culls).
   2. shadow box follows the zoom (smaller box = fewer casters + crisper shadows); framed views keep the big box.
   3. tiny meshes (world radius < 0.24 m: legs, ears, coins, flowers) stop casting shadows (re-checked, so a popped-in item that
      grows gets its shadow back). The fairy always casts.
   4. adaptive pixel ratio: if frames stay slow (> 26 ms) the ratio steps down (1.5 → 1.25 → 1); back up when it is fast again. */
const PR_MAX = Math.min(window.devicePixelRatio || 1, 1.5);
R.perf = { prMax: PR_MAX, pr: PR_MAX, ema: 16, shadowR: 0.24, sweeps: 0, shOff: 0 };
function perfFar() {
  const want = R.cur === scene && scene.fog ? scene.fog.far + 6 : 600;
  if (Math.abs(camera.far - want) > 0.5) { camera.far = want; camera.updateProjectionMatrix(); }
  if (R.cur === scene) R.skyDome.scale.setScalar(Math.min(1, (want - 8) / 400));      // the sky dome must stay inside the far plane
}
function perfShadowBox() {
  const c = R.cam; const half = (c.frameK || 0) > 0.05 || c.mode !== 'out' ? 46 : [32, 40, 46][c.zoomI] || 46;
  const sc = sun.shadow.camera;
  if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
}
let sweepAcc = 0;
function shadowSweep(dt) {
  sweepAcc += dt; if (sweepAcc < 0.8) return; sweepAcc = 0; R.perf.sweeps++;
  const lim = R.perf.shadowR, pl = F.Player && F.Player.obj;
  let off = 0;
  const visit = o => {
    if (o === pl) return;
    if (o.isMesh && o.geometry && (o.castShadow || o.userData._shOff)) {
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      const e = o.matrixWorld.elements, ws = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);
      const small = g.boundingSphere.radius * ws < lim;
      if (small && o.castShadow) { o.castShadow = false; o.userData._shOff = true; }
      else if (!small && o.userData._shOff) { o.castShadow = true; o.userData._shOff = false; }
      if (!o.castShadow) off++;
    }
    const ch = o.children; for (let i = 0; i < ch.length; i++) visit(ch[i]);
  };
  visit(R.cur);
  R.perf.shOff = off;
}
// 5. detail cull: merged decoration groups (park flowers/hedges/fences per 32 m cell) are hidden per cell beyond R.perf.detailDist
//    from the camera (normal views never look that far; the castle framing / title do, where those cells are fogged specks).
//    R.detailGroups: extra groups whose children get the same treatment (F.Park.staticRoot is picked up automatically).
R.detailGroups = [];
R.perf.detailDist = 100; R.perf.detailHidden = 0;
let detAcc = 0; const DC_HYS = 6;
const _dc = new THREE.Vector3();
function detailCull(dt) {
  detAcc += dt; if (detAcc < 0.2) return; detAcc = 0;
  const groups = R.detailGroups.slice(); if (F.Park && F.Park.staticRoot && !groups.includes(F.Park.staticRoot)) groups.push(F.Park.staticRoot);
  const lim = R.cam.mode === 'out' ? R.perf.detailDist : 175, cp = camera.position;
  let hid = 0;
  for (const g of groups) {
    if (!g.parent || (g.parent !== R.cur && !R.cur.getObjectById(g.id))) continue;
    for (const m of g.children) {
      const geo = m.geometry; if (!geo) continue;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      if (!m.userData._dc) { m.updateMatrixWorld(); m.userData._dc = geo.boundingSphere.center.clone().applyMatrix4(m.matrixWorld); }
      // v5 WP-X (playtest flicker cause 1): detailCull is the ONLY writer of these cells' .visible. Hysteresis ±DC_HYS m (hide beyond
      // L+6, show again inside L-6), so idle camera micro-motion never toggles a cell; userData.keep = the owning module's own wish
      // (park.js: near the camera target, 75 m ± 6) – nobody else writes .visible.
      const L = (m.userData.lo ? lim * 0.65 : lim) + geo.boundingSphere.radius * 0.5, d = m.userData._dc.distanceTo(cp);   // lo: ground-hugging tufts/flowers
      const far = m.userData._far = m.userData._far ? d > L - DC_HYS : d > L + DC_HYS;
      const on = !far && m.userData.keep !== false;
      if (m.visible !== on) m.visible = on;
      if (!on) hid++;
    }
  }
  R.perf.detailHidden = hid;
}
let prAcc = 0, prUpT = 0;
function adaptPR(rawDt) {
  if (rawDt > 0.2 || F.flags.test) return;              // ignore hitches / background tabs; tests keep a fixed ratio
  const P = R.perf; P.ema += (rawDt * 1000 - P.ema) * 0.05; prAcc += rawDt; prUpT += rawDt;
  if (prAcc < 3) return;
  if (P.ema > 26 && P.pr > 1) { P.pr = Math.max(1, P.pr - 0.25); renderer.setPixelRatio(P.pr); R.setSize(); prAcc = 0; prUpT = 0; }
  else if (P.ema < 13 && P.pr < P.prMax && prUpT > 20) { P.pr = Math.min(P.prMax, P.pr + 0.25); renderer.setPixelRatio(P.pr); R.setSize(); prAcc = 0; prUpT = 0; }
  else prAcc = 0;
}

let last = performance.now(), running = false, paused = false;
R.pause = p => { paused = p; F.emit('pause', p); };
R.isPaused = () => paused;
/* parent 11.10. («some problems seem to be in background of the world stuff»): while a task runs, its stage objects (S.objs and their
   children, re-tagged every frame because formats add pieces later) are drawn a SECOND time on top – depth cleared, only layer 3, the
   lights joined to layer 3, no background, no shadow re-render – so a tree, wall or house between the camera and the board can never
   hide the problem. Objects keep layer 0 too, so raycast picks are unchanged. R.stageOnTop = false switches it off. */
const STAGE_LAYER = 3;
R.stageOnTop = true;
let lightScan = 0;
// -> the visible stage roots (hidden for the world pass, so nothing is drawn twice: a transparent glow drawn twice turns white)
function stageLayer() {
  if (!R.stageOnTop) return null;
  const c = F.Task && F.Task.current, S = c && c.S;
  if (!S || S.ended || !S.objs) return null;
  // the same set the stage fit measures (stage.js stageRect with hud): S.objs, hint objects, camera boards and the shared number board
  const list = S.objs.concat(S.hintObjs || [], S.screenObjs || []);
  try { const nb = F.NUM && F.NUM.board && F.NUM.board(); if (nb && nb.alive && nb.root) list.push(nb.root); } catch (e) { /* no board */ }
  const roots = [];
  for (const o of list) { if (!o || !o.parent || !o.visible || roots.includes(o)) continue; o.traverse(m => m.layers.enable(STAGE_LAYER)); roots.push(o); }
  if (roots.length && F.T.now - lightScan > 2) { lightScan = F.T.now; R.cur.traverse(o => { if (o.isLight) o.layers.enable(STAGE_LAYER); }); }
  return roots.length ? roots : null;
}
function renderStageOnTop() {
  const sc = R.cur, bg = sc.background, au = renderer.autoClear, su = renderer.shadowMap.autoUpdate, lm = camera.layers.mask;
  sc.background = null; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;
  camera.layers.set(STAGE_LAYER);
  try { renderer.clearDepth(); renderer.render(sc, camera); }
  finally { camera.layers.mask = lm; sc.background = bg; renderer.autoClear = au; renderer.shadowMap.autoUpdate = su; }
}
function frame(dt, noRender) {
  if (!paused) { F.T.step(dt); F.emit('tick', dt, F.T.now); }
  if (R.cur === scene) { dayTint(dt); driftClouds(dt); }
  updateCamera(dt);
  perfFar(); if (R.cur === scene) { perfShadowBox(); detailCull(dt); } shadowSweep(dt);
  F.emit('preRender', dt);
  if (noRender) return;
  const roots = stageLayer();
  if (!roots) { renderer.render(R.cur, camera); return; }
  roots.forEach(o => { o.visible = false; });
  try { renderer.render(R.cur, camera); } finally { roots.forEach(o => { o.visible = true; }); }
  renderStageOnTop();
}
function loop(now) {
  requestAnimationFrame(loop);
  if (F.debug.hold) { last = now; return; }      // tests drive time themselves (F.dbg.stepA)
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now;
  adaptPR(raw);
  frame(dt);
}
R.start = function () {
  if (running) return; running = true;
  const host = document.getElementById('view'); (host || document.body).appendChild(renderer.domElement);
  R.setSize();
  last = performance.now(); requestAnimationFrame(loop);
};
F.debug = F.debug || {};
F.debug.frames = function (n = 1, dt = 1 / 30, noRender) { for (let i = 0; i < n; i++) frame(dt, !!noRender); return F.T.now; };   // noRender: step time only (fast tests)
F.debug.seconds = function (sec, dt = 1 / 30) { return F.debug.frames(Math.ceil(sec / dt), dt); };
F.debug.shot = function (q = 0.8) { frame(0); return renderer.domElement.toDataURL('image/jpeg', q); };
})();
