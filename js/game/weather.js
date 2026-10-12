/* Feslottet – F.Weather: day phase + deterministic weather per region (DESIGN2 §4.6). Owner: WP4 FAUNA.
   F.Weather.phase() -> 'morgen' | 'dag' | 'kveld'   (dayK < 0.25 / > 0.7; bedtime off: the phases cycle every 20 min of play)
   F.Weather.phaseIdx() -> 0 | 1 | 2
   F.Weather.at(regionId | {x,z}) -> 'sol' | 'vind' | 'regn'   hash(regionId, F.save.day, phaseIdx): sol 65 %, vind 20 % (40 % in vindmolle/strand), regn 15 %
   F.Weather.here() -> weather where she is (indoors: 'sol')     F.Weather.windK -> 1 (calm) .. 2.4 (vind): others may read it (windmills, flags)
   Visuals (never grey, never dark, light unchanged): regnbuevær = a rainbow arc in the northern sky + light sparkly drizzle near the camera;
   vind = grass sways faster, petals and leaves drift, windmill sails turn faster (things_world n_molle reads windK).
   Events: weatherChanged(regionId, w)  phaseChanged(phase).
   Clarity 12.10. (§3.9 FA, R16): NO weather or phase lines any more – the weather shows itself (the rainbow, the drizzle, the drifting
   petals, the gust you hear: fauna.js) and the album hints keep the "rare animals in rain / wind" knowledge. (fa_w_regn, fa_w_vind,
   fa_w_regn2, fa_w_vind2 retired; this also ends the wind line spoken in the castle kitchen.)
   Nothing of the weather covers a task: while a task or an animal trial runs, the rainbow (drawn on top of everything) fades out and the
   drizzle / petals near the camera are not drawn.
   Debug (on ready): F.dbg.weather('sol'|'vind'|'regn'|null)  F.dbg.phase('morgen'|'dag'|'kveld'|null) */
(function () {
'use strict';
const F = window.F, U = F.U;
const PH = ['morgen', 'dag', 'kveld'];
let forcedW = null, forcedP = null;
const WX = F.Weather = {
  windK: 1,
  phaseIdx() {
    if (forcedP) return PH.indexOf(forcedP);
    let k = F.R ? F.R.dayK : 0.4;
    const lim = F.Day && F.Day.limitSec ? F.Day.limitSec() : 1500;
    if (!lim) {   // bedtime off: cycle morgen → dag → kveld every 20 minutes of play
      const ps = (F.save && F.save.today && F.save.today.playSec != null) ? F.save.today.playSec : F.T.now;
      k = (ps % 1200) / 1200;
    }
    return k < 0.25 ? 0 : k > 0.7 ? 2 : 1;
  },
  phase() { return PH[WX.phaseIdx()]; },
  regionOf(r) {
    if (r && typeof r === 'object') { const g = F.W && F.W.region ? F.W.region(r.x, r.z) : null; return g ? g : null; }
    if (typeof r === 'string' && F.W && F.W.regionById) return F.W.regionById(r) || { id: r, biome: null };
    return null;
  },
  at(r) {
    if (forcedW) return forcedW;
    const g = WX.regionOf(r); if (!g) return 'sol';
    const id = g.id || String(r);
    const h = U.rng(U.hashStr('vaer|' + id + '|' + ((F.save && F.save.day) || 1) + '|' + WX.phaseIdx() + '|' + ((F.W && F.W.seed) || 0)))();
    const windy = g.biome === 'vindmolle' || g.biome === 'strand';
    const pV = windy ? 0.40 : 0.20, pR = 0.15;
    if (h < pR) return 'regn';
    if (h < pR + pV) return 'vind';
    return 'sol';
  },
  here() {
    if (!F.Space || F.Space.cur !== 'out' || !F.Player) return 'sol';
    return WX.at({ x: F.Player.pos.x, z: F.Player.pos.z });
  },
  regionHere() { if (!F.W || !F.W.region || !F.Player) return null; const g = F.W.region(F.Player.pos.x, F.Player.pos.z); return g ? g.id : null; },
  force(w) { forcedW = w || null; lastKey = ''; },
  forcePhase(p) { forcedP = PH.includes(p) ? p : null; lastKey = ''; },
};

/* ---------------------------------------------------------- visuals */
let arc = null, drizzle = null, drift = null;
const _off = new THREE.Vector3();
const DRZ = 420, DRF = 90;
function makeArc() {
  const cols = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa];
  const g = new THREE.Group();
  cols.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(5.2 - i * 0.16, 0.08, 4, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false, fog: false }));
    m.renderOrder = 50; m.frustumCulled = false; m.raycast = () => {}; g.add(m);
  });
  g.visible = false; g.userData.noPick = true;
  return g;
}
function pointsMat(size, colA, colB) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 15);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv);
  return new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true, fog: false });
}
function makePts(n, size, cols) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), C = new Float32Array(n * 3), c = new THREE.Color();
  const r = U.rng(4711 + n);
  for (let i = 0; i < n; i++) { P[i * 3] = (r() - 0.5) * 40; P[i * 3 + 1] = r() * 14; P[i * 3 + 2] = (r() - 0.5) * 40; c.setHex(cols[i % cols.length]); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const p = new THREE.Points(g, pointsMat(size)); p.frustumCulled = false; p.visible = false; p.renderOrder = 4; p.raycast = () => {};
  p.userData.vel = Float32Array.from({ length: n }, () => 0.6 + r() * 0.8);
  return p;
}
function ensureVis() {
  if (arc || !F.R || !F.R.scene) return;
  arc = makeArc(); F.R.scene.add(arc);
  drizzle = makePts(DRZ, 0.24, [0xffffff, 0xd8f1ff, 0xbfe6ff, 0xfff6c8]); F.R.scene.add(drizzle);
  drift = makePts(DRF, 0.32, [0xffb3d1, 0xfff0a0, 0xa8e6a1, 0xffd6a5]); F.R.scene.add(drift);
}
let swayPh = 0, cur = 'sol', lastKey = '', lastPhase = null, acc = 0;
F.on('tick', (dt, t) => {
  if (!F.booted) return;
  ensureVis(); if (!arc) return;
  acc += dt;
  if (acc > 0.5) {
    acc = 0;
    const ph = WX.phase();
    if (ph !== lastPhase) { const was = lastPhase; lastPhase = ph; if (was) F.emit('phaseChanged', ph); }
    const out = F.Space && F.Space.cur === 'out';
    const rid = out ? WX.regionHere() : null;
    const w = out ? WX.here() : 'sol';
    const key = rid + '|' + w + '|' + ph;
    if (key !== lastKey) {
      lastKey = key;
      if (w !== cur || rid) F.emit('weatherChanged', rid, w);
      cur = w;
    }
  }
  const out = F.Space && F.Space.cur === 'out' && F.R.cur === F.R.scene;
  const w = out ? cur : 'sol';
  const busy = !!((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy));   // a task on screen: nothing of ours in front of it
  // wind: faster sway phase (integrated, so there is no jump), windmills read windK
  const wantK = w === 'vind' ? 2.4 : 1;
  WX.windK += (wantK - WX.windK) * Math.min(1, dt * 0.8);
  if (F.W && F.W.swayU) { swayPh += dt * (F.W.WIND != null ? F.W.WIND : 1) * WX.windK; F.W.swayU.value = swayPh; }
  const tg = F.R.cam && F.R.cam.target ? F.R.cam.target : F.Player.pos;
  // rainbow: always toward the north of the camera, fog-free, gently fades in
  // the arch is strong for the first seconds of regnbuevær, then stays as a faint hint (never covers the play area for long)
  if (out && w === 'regn') arc.userData.on = (arc.userData.on || 0) + dt; else arc.userData.on = 0;
  const wantA = out && w === 'regn' && !busy ? (arc.userData.on < 14 ? 1 : 0.35) : 0;
  arc.userData.k = (arc.userData.k || 0) + (wantA - (arc.userData.k || 0)) * Math.min(1, dt * (busy ? 4 : 0.7));
  arc.visible = arc.userData.k > 0.02;
  if (arc.visible) {   // a soft rainbow arch across the upper view (camera-anchored: the default pitch never shows the sky)
    const cam = F.R.camera;
    _off.set(1.4, -1.4, -12).applyQuaternion(cam.quaternion);
    arc.position.copy(cam.position).add(_off); arc.quaternion.copy(cam.quaternion);
    const asp = cam.aspect || 1.6; arc.scale.set(Math.max(1, asp / 1.6), 1, 1);
    arc.children.forEach(m => { m.material.opacity = 0.2 * arc.userData.k; });
  }
  // drizzle: sparkly light drops within 20 m of the camera target
  drizzle.visible = out && w === 'regn' && !busy;
  if (drizzle.visible) {
    const P = drizzle.geometry.attributes.position, A = P.array, V = drizzle.userData.vel;
    for (let i = 0; i < DRZ; i++) {
      A[i * 3 + 1] -= dt * 3.2 * V[i];
      if (A[i * 3 + 1] < 0) { A[i * 3 + 1] += 14; A[i * 3] = (Math.random() - 0.5) * 40; A[i * 3 + 2] = (Math.random() - 0.5) * 40; }
    }
    P.needsUpdate = true; drizzle.position.set(tg.x, (tg.y || 0) - 1, tg.z);
  }
  // wind: petals + leaves drift sideways
  drift.visible = out && w === 'vind' && !busy;
  if (drift.visible) {
    const P = drift.geometry.attributes.position, A = P.array, V = drift.userData.vel;
    for (let i = 0; i < DRF; i++) {
      A[i * 3] += dt * 2.6 * V[i]; A[i * 3 + 1] += Math.sin(t * 2 + i) * dt * 0.5 - dt * 0.25 * V[i]; A[i * 3 + 2] += Math.cos(t * 0.7 + i) * dt * 0.4;
      if (A[i * 3] > 20 || A[i * 3 + 1] < 0) { A[i * 3] = -20; A[i * 3 + 1] = 1 + Math.random() * 7; A[i * 3 + 2] = (Math.random() - 0.5) * 40; }
    }
    P.needsUpdate = true; drift.position.set(tg.x, tg.y || 0, tg.z);
  }
});
F.on('spaceChanged', () => { lastKey = ''; });

F.on('ready', () => {
  if (!F.dbg) return;
  F.dbg.weather = w => { WX.force(['sol', 'vind', 'regn'].includes(w) ? w : null); return WX.here(); };
  F.dbg.phase = p => { WX.forcePhase(p); if (F.R && F.R.setDay) F.R.setDay(p === 'morgen' ? 0.1 : p === 'kveld' ? 0.85 : p === 'dag' ? 0.45 : null); return WX.phase(); };
});
})();
