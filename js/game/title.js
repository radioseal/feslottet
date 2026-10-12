/* Feslottet – full-screen shell screens (SHELL WP, DESIGN §5, §9.10).
   F.Title.show() -> Promise<'continue'|'new'>    big SPILL over a gentle live 3D view of the castle (slow orbit), sound hint
   F.Title.fairySelect(pre) -> Promise<kind>      the cloud stage: 4 fairies (F.Fairy.buildAvatar | ch_fairy_<kind> | placeholder),
                                                  tap = twirl + power + intro line, big glowing ✓ confirms
   F.Title.bedtime(sum) -> Promise                summary (coins today as tens+ones, words made, new floors) → «God natt!» → «Ny dag i morgen»
   F.Title.pause() / resume() / isPaused()        Esc: big continue + sound + music + «til tittelskjermen» (game clock stopped)
   F.Shell.screen   'title' | 'fairy' | 'bed' | 'pause' | null   (HUD and idle logic stay quiet while a screen is up) */
(function () {
'use strict';
const F = window.F;
const U = F.U;
const Shell = F.Shell = F.Shell || { screen: null };
const T = F.Title = {};
const KINDS = ['krystall', 'blomst', 'boble', 'stjerne'];
const NAMES = { krystall: 'Krystallfeen', blomst: 'Blomsterfeen', boble: 'Boblefeen', stjerne: 'Stjernefeen' };
T.KINDS = KINDS; T.NAMES = NAMES;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const scr = () => document.getElementById('screens');
function openScreen(cls, name) {
  const s = el('div', 'scr ' + cls);
  scr().appendChild(s);
  const on = () => { if (!s.classList.contains('closing')) s.classList.add('on'); };
  requestAnimationFrame(on);
  F.T.timeout(on, 30);
  Shell.screen = name;
  document.body.classList.add('screen-on');
  return s;
}
function closeScreen(s) {
  s.classList.remove('on'); s.classList.add('closing');          // closing screens never catch taps
  const rm = () => { if (s.isConnected) s.remove(); };
  setTimeout(rm, 520); F.T.timeout(rm, 560);
  Shell.screen = null;
  document.body.classList.remove('screen-on');
}
function lockWorld(on) {
  F.Input.enabled = !on; F.Player.frozen = !!on; if (on) F.Player.stop();
  if (F.HUD.show) F.HUD.show(!on);
}
const sp = (cx, cy, R, r, n) => F.HUD.starPath(cx, cy, R, r, n);

/* ================================================================== title */
let orbitOff = null;
// title orbit: load a wider chunk ring and pull the fog in, so the slow orbit never looks past the terrain (no bare water sheet)
let titleSaved = null;
function titleView(on) {
  const W = F.W, fog = F.R.scene && F.R.scene.fog;
  if (on) {
    if (titleSaved) return;
    titleSaved = { L: W && W.R_LOAD, K: W && W.R_KEEP, near: fog && fog.near, far: fog && fog.far };
    if (fog) { fog.near = 45; fog.far = 112; }
    if (W && !F.inside && typeof W.update === 'function') {
      W.R_LOAD = Math.max(titleSaved.L, 3); W.R_KEEP = Math.max(titleSaved.K, W.R_LOAD + 1);
      try { W.update(F.Player.pos.x, F.Player.pos.z, true); } catch (e) { console.error(e); }
    }
  } else if (titleSaved) {
    if (W) { W.R_LOAD = titleSaved.L; W.R_KEEP = titleSaved.K; }
    if (fog && titleSaved.far) { fog.near = titleSaved.near; fog.far = titleSaved.far; }
    titleSaved = null;
  }
}
T.titleView = titleView;
function fairyThumb(kind) {
  const id = F.VOX.has('ch_fairy_' + kind) ? 'ch_fairy_' + kind : (F.VOX.has('ch_fairy') ? 'ch_fairy' : null);
  if (!id) return '';
  try { return F.Thumb.url(id, { kind }, { size: 192, angle: 0.35 }); } catch (e) { return ''; }
}
T.show = function () {
  return new Promise(resolve => {
    lockWorld(true);
    F.Player.obj.visible = false;
    // the title looks at the castle: bring the (hidden) fairy home so the chunks around the castle are loaded
    // (a saved outdoor position is restored by F.Day.begin when she continues)
    if (F.Space.cur !== 'out') F.Space.set('out');
    const sp0 = { x: 0, z: 36 };                         // the forecourt (F.spawnPoint is Fetårnet's doorstep since DESIGN2)
    if (Math.hypot(F.Player.pos.x, F.Player.pos.z) > 60) F.Player.teleport(sp0.x, sp0.z);
    F.R.useScene('out');
    titleView(true);
    F.R.setCam({ mode: 'title', target: new THREE.Vector3(0, 9, 4), dist: 74, pitch: 0.3, yaw: 0.55, snap: true });
    orbitOff = F.on('tick', dt => { F.R.cam.yawGoal += dt * 0.045; });
    const s = openScreen('ts', 'title');
    const has = !!(F.save.intro && F.save.fairy);
    const thumb = has ? fairyThumb(F.save.fairy) : '';
    const crown = `<svg class="ts-crown" viewBox="0 0 150 70">
      <path d="M18 62 L10 18 L44 40 L75 6 L106 40 L140 18 L132 62 Z" fill="#ffd84a" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
      <rect x="18" y="54" width="114" height="12" rx="6" fill="#f5b82e" stroke="#fff" stroke-width="4"/>
      <circle cx="75" cy="36" r="8" fill="#ff7fb0" stroke="#fff" stroke-width="3"/><circle cx="40" cy="47" r="6" fill="#5fd0ff" stroke="#fff" stroke-width="3"/><circle cx="110" cy="47" r="6" fill="#8cff7a" stroke="#fff" stroke-width="3"/>
      <circle cx="10" cy="18" r="5" fill="#fff6c0"/><circle cx="75" cy="6" r="5" fill="#fff6c0"/><circle cx="140" cy="18" r="5" fill="#fff6c0"/></svg>`;
    s.innerHTML = `<div class="ts-logo">${crown}<h1 class="ts-title">Feslottet</h1><div class="ts-tag">der ord blir til ting</div></div>
      <div class="ts-bottom">
        <div class="ts-sound"><svg viewBox="0 0 60 60" width="100%" height="100%"><path d="M8 22 H20 L34 10 V50 L20 38 H8 Z" fill="#8a5ad6" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
          <path class="w" d="M41 22 Q47 30 41 38" fill="none" stroke="#ff7fb0" stroke-width="4.5" stroke-linecap="round"/><path class="w w2" d="M47 15 Q57 30 47 45" fill="none" stroke="#ff7fb0" stroke-width="4.5" stroke-linecap="round"/></svg></div>
        <button class="ts-play">${has ? `<span class="me">${thumb ? `<img src="${thumb}" alt="">` : ''}</span>` : ''}<span class="tri"></span>SPILL</button>
      </div>`;
    for (let i = 0; i < 9; i++) {
      const k = el('div', 'ts-spark', `<svg viewBox="0 0 22 22" width="100%" height="100%"><path d="${sp(11, 11, 11, 3, 4)}" fill="#fff"/></svg>`);
      k.style.left = (8 + U.hash2(i, 1, 5) * 84) + '%'; k.style.top = (6 + U.hash2(i, 2, 5) * 60) + '%'; k.style.animationDelay = (U.hash2(i, 3, 5) * 2).toFixed(2) + 's';
      s.appendChild(k);
    }
    if (has) {
      // a new game is parent-only: gate (a×b) first, then the save is reset
      const nw = el('button', 'ts-new', `<svg viewBox="0 0 40 40" width="100%" height="100%"><circle cx="20" cy="20" r="17" fill="none" stroke="#8a5ad6" stroke-width="3"/><path d="M20 11 V29 M11 20 H29" stroke="#8a5ad6" stroke-width="4" stroke-linecap="round"/></svg>`);
      nw.setAttribute('aria-label', 'Nytt spill');
      nw.addEventListener('click', e => { e.stopPropagation(); F.Prog.gate(() => { done('new'); }); });
      s.appendChild(nw);
    }
    const play = s.querySelector('.ts-play');
    let finished = false;
    function done(how) {
      if (finished) return; finished = true;
      if (F.audio && F.audio.ensure) F.audio.ensure();
      F.sfx.chime();
      if (orbitOff) { orbitOff(); orbitOff = null; }
      titleView(false);
      closeScreen(s);
      resolve(how);
    }
    play.addEventListener('click', e => { e.stopPropagation(); done(has ? 'continue' : 'first'); });
    T._titleDone = done;
  });
};

/* ================================================================== fairy select: the cloud stage */
let stage = null;
function buildStage() {
  if (stage) return stage;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0xf4e9ff);
  // gradient sky dome
  const g = new THREE.SphereGeometry(140, 24, 14), top = new THREE.Color(0x9fd2ff), mid = new THREE.Color(0xf1e6ff), bot = new THREE.Color(0xffd9ec), c = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 140; const cc = y > 0 ? mid.clone().lerp(top, Math.pow(y, 0.7)) : mid.clone().lerp(bot, Math.min(1, -y * 2.5)); c.push(cc.r, cc.g, cc.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));
  sc.add(new THREE.HemisphereLight(0xffffff, 0xf2d8ff, 0.9));
  const d = new THREE.DirectionalLight(0xfff2e0, 0.65); d.position.set(5, 12, 10); sc.add(d);
  // rainbow arc far behind
  const rb = new THREE.Group();
  [0xff8a9c, 0xffb14a, 0xffe066, 0x8fdc7a, 0x7cc4f5, 0xb79cff].forEach((col, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 1.1, 0.55, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false }));
    rb.add(m);
  });
  rb.position.set(0, -6, -34); sc.add(rb);
  // clouds (voxel)
  const clouds = [];
  const mk = (x, y, z, s, ry) => { const m = F.VOX.make('ui_cloud', {}); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = ry || 0; sc.add(m); return m; };
  const xs = [-4.6, -1.55, 1.55, 4.6];
  const pads = xs.map((x, i) => mk(x, -0.15 + (i % 2) * 0.12, 0, 1, (i - 1.5) * 0.15));
  [[-11, 4.5, -14, 1.6], [9, 6, -16, 2], [-3, 8.5, -22, 1.8], [14, 1.5, -10, 1.3], [-15, 0.5, -9, 1.4], [3, -2.6, -6, 1.2]].forEach(([x, y, z, s], i) => clouds.push(mk(x, y, z, s, i)));
  // sparkles
  const twk = [];
  const sg = new THREE.OctahedronGeometry(0.09, 0);
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: [0xffffff, 0xfff6b0, 0xffd1e6, 0xc8f0ff][i % 4], transparent: true }));
    m.position.set(U.hash2(i, 1, 9) * 30 - 15, U.hash2(i, 2, 9) * 10 - 1, -4 - U.hash2(i, 3, 9) * 14); m.userData.ph = U.hash2(i, 4, 9) * 6; sc.add(m); twk.push(m);
  }
  // the fairies
  const fairies = KINDS.map((kind, i) => {
    let a = null;
    try { a = F.Fairy && typeof F.Fairy.buildAvatar === 'function' ? F.Fairy.buildAvatar(kind) : null; } catch (e) { a = null; }
    if (!a && F.VOX.has('ch_fairy_' + kind)) a = F.VOX.make('ch_fairy_' + kind, { kind });
    if (!a) a = F.VOX.make('ui_fairy', { kind });
    const holder = new THREE.Group(); holder.add(a);
    const baseY = 0.62 + (i % 2) * 0.12;
    holder.position.set(xs[i], baseY, 0.35); holder.rotation.y = -xs[i] * 0.05;
    holder.scale.setScalar(1.75);
    sc.add(holder);
    // selection ring on the cloud
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(xs[i], baseY + 0.02, 0.35); sc.add(ring);
    return { kind, i, avatar: a, holder, baseY, ring, x: xs[i], spin: null, ph: i * 1.3 };
  });
  stage = { scene: sc, fairies, clouds, pads, twk, parts: [] };
  return stage;
}
// voxel cloud for the stage (prefix ui_ = SHELL's own models)
F.VOX.def('ui_cloud', {
  size: [44, 14, 26], scale: 1 / 14,
  build(v) {
    v.ellipsoid(22, 5, 13, 20, 5, 11, 'white');
    v.ellipsoid(14, 8, 13, 9, 6, 9, 'white'); v.ellipsoid(27, 9, 12, 10, 5, 9, 'white'); v.ellipsoid(34, 6, 14, 8, 5, 8, 'white'); v.ellipsoid(8, 5, 13, 7, 4, 7, 'white');
    v.paint((x, y, z) => (y <= 2 ? 'snow' : (y <= 3 && (x + z) % 3 === 0 ? 'ice' : null)));
  },
});
// placeholder fairy (used only if MODELS-3's ch_fairy_<kind> is missing)
const FCOL = { krystall: ['crystal', 'lavender', 'glass', 'crystal'], blomst: ['blossom', 'mint', 'pink', 'leaf2'], boble: ['sky', 'teal', 'glass', 'sky'], stjerne: ['butter', 'peach', 'yellow', 'gold'] };
F.VOX.def('ui_fairy', {
  size: [24, 22, 10], scale: 1 / 16,
  build(v, o) {
    const [dress, dress2, wing, crown] = FCOL[o.kind] || FCOL.krystall;
    for (let y = 0; y < 10; y++) { const r = 4.5 - y * 0.25; v.cyl(12, y, 5, r, 1, y % 3 === 0 ? dress2 : dress); }
    v.box(10, 10, 4, 13, 12, 6, dress);
    v.sphere(11.5, 15.5, 5, 3.6, 'skin');
    v.ellipsoid(11.5, 17.5, 4.6, 3.9, 2.4, 3.6, 'hairBlond'); v.box(8, 13, 3, 8, 16, 5, 'hairBlond'); v.box(15, 13, 3, 15, 16, 5, 'hairBlond');
    v.set(10, 15, 8, 'black'); v.set(13, 15, 8, 'black'); v.set(9, 14, 8, 'pink'); v.set(14, 14, 8, 'pink'); v.set(11, 13, 8, 'rose'); v.set(12, 13, 8, 'rose');
    v.box(9, 20, 4, 14, 20, 6, crown); v.set(11, 21, 5, crown); v.set(12, 21, 5, crown);
    v.ellipsoid(6, 13, 1, 5, 4, 0.8, wing); v.ellipsoid(17, 13, 1, 5, 4, 0.8, wing);
  },
});
const easeIO = k => k * k * (3 - 2 * k);
function stageTick(dt) {
  const S = stage; if (!S) return;
  const t = F.T.now;
  S.fairies.forEach(f => {
    const sel = f.kind === S.sel;
    if (!f.spin) f.holder.position.y = f.baseY + Math.sin(t * 1.6 + f.ph) * (sel ? 0.12 : 0.06) + (sel ? 0.15 : 0);
    if (f.avatar.userData.animate) { try { f.avatar.userData.animate(dt, t, false); } catch (e) { /* model anim optional */ } }
    const P = f.avatar.userData.parts || {};
    if (P.wingL) P.wingL.rotation.y = Math.sin(t * (sel ? 9 : 4) + f.ph) * 0.35;
    if (P.wingR) P.wingR.rotation.y = -Math.sin(t * (sel ? 9 : 4) + f.ph) * 0.35;
    f.ring.material.opacity += ((sel ? 0.9 : 0) - f.ring.material.opacity) * Math.min(1, dt * 6);
    f.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
  });
  S.clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.1 + i) * dt * 0.15; });
  S.twk.forEach(m => { const k = (Math.sin(t * 2 + m.userData.ph) + 1) / 2; m.material.opacity = 0.2 + k * 0.8; m.scale.setScalar(0.6 + k * 0.8); m.rotation.y += dt; });
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const q = S.parts[i]; q.t += dt;
    const k = q.t / q.life;
    if (k >= 1) { S.scene.remove(q.m); S.parts.splice(i, 1); continue; }
    q.v.y -= (q.g || 0) * dt;
    q.m.position.addScaledVector(q.v, dt);
    if (q.wob) q.m.position.x += Math.sin(q.t * 5 + q.ph) * dt * 0.4;
    q.m.rotation.y += (q.spin || 0) * dt; q.m.rotation.x += (q.spin || 0) * 0.6 * dt;
    const grow = Math.min(1, q.t / 0.25), fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    q.m.scale.setScalar(q.s * grow * (q.pulse ? (0.8 + Math.sin(q.t * 12) * 0.25) : 1));
    if (q.m.material.transparent) q.m.material.opacity = (q.op || 1) * fade;
  }
}
const GEO = {};
function geo(kind) {
  if (GEO[kind]) return GEO[kind];
  if (kind === 'crystal') GEO[kind] = new THREE.OctahedronGeometry(0.2, 0).scale(0.7, 1.6, 0.7);
  else if (kind === 'petal') GEO[kind] = new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.5, 1.4);
  else if (kind === 'bloom') GEO[kind] = new THREE.SphereGeometry(0.13, 10, 8);
  else if (kind === 'bubble') GEO[kind] = new THREE.SphereGeometry(0.22, 16, 12);
  else if (kind === 'star') { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.09 : 0.22; i ? s.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, -Math.sin(a) * r); } GEO[kind] = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); }
  return GEO[kind];
}
function power(f) {
  const S = stage, P = f.holder.position, R = Math.random;
  const add = (g, mat, o) => { const m = new THREE.Mesh(g, mat); m.position.set(P.x + (o.dx || 0), (o.y != null ? o.y : P.y + 0.3), P.z + (o.dz || 0)); S.scene.add(m); S.parts.push(Object.assign({ m, t: 0, ph: R() * 6 }, o)); };
  if (f.kind === 'krystall') {
    F.sfx.crystal();
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; add(geo('crystal'), new THREE.MeshPhongMaterial({ color: [0x9fe8ff, 0xc6a8ff, 0xd8f2ff][i % 3], transparent: true, opacity: 0.85, shininess: 90, specular: 0x99ccff }),
      { dx: Math.cos(a) * 0.9, dz: Math.sin(a) * 0.5 + 0.2, y: P.y + 0.1, v: new THREE.Vector3(Math.cos(a) * 0.6, 1.6 + R(), Math.sin(a) * 0.3), g: 1.2, life: 1.8, s: 0.8 + R() * 0.8, spin: 2, op: 0.85 }); }
  } else if (f.kind === 'blomst') {
    F.sfx.grow();
    for (let i = 0; i < 22; i++) { const a = R() * Math.PI * 2; add(geo(i < 8 ? 'bloom' : 'petal'), new THREE.MeshLambertMaterial({ color: [0xff7fb0, 0xffd84a, 0xffffff, 0xf6a9c8, 0xc6a8ff][i % 5], transparent: true }),
      { dx: Math.cos(a) * 0.3, dz: Math.sin(a) * 0.3, v: new THREE.Vector3(Math.cos(a) * (1 + R()), 2 + R() * 2, Math.sin(a) * 0.8), g: 3, life: 1.9, s: 1, spin: 3 }); }
  } else if (f.kind === 'boble') {
    for (let i = 0; i < 12; i++) { add(geo('bubble'), new THREE.MeshPhongMaterial({ color: [0xcfefff, 0xffd1e6, 0xd8f2ff][i % 3], transparent: true, opacity: 0.45, shininess: 120, specular: 0xffffff }),
      { dx: (R() - .5) * 1.4, dz: (R() - .5) * 0.6, v: new THREE.Vector3((R() - .5) * 0.4, 0.8 + R() * 0.9, 0), life: 2.2 + R(), s: 0.6 + R() * 0.9, wob: true, op: 0.45 }); }
    for (let i = 0; i < 5; i++) F.T.timeout(() => F.sfx.pop(), 200 + i * 260);
  } else {
    F.sfx.chime(); F.T.timeout(() => F.sfx.sparkle(), 300);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; add(geo('star'), new THREE.MeshBasicMaterial({ color: [0xffd84a, 0xfff6b0, 0xffb14a][i % 3], transparent: true, side: THREE.DoubleSide }),
      { dx: Math.cos(a) * 0.4, dz: 0.2, y: P.y + 0.9, v: new THREE.Vector3(Math.cos(a) * 1.4, Math.sin(a) * 1.4 + 0.6, 0.2), life: 1.6, s: 1, spin: 4, pulse: true }); }
  }
}
function twirl(f) {
  if (f.spin) return;
  const r0 = f.holder.rotation.y;
  f.spin = F.T.tween(950, k => { const e = easeIO(k); f.holder.rotation.y = r0 + e * Math.PI * 2; f.holder.position.y = f.baseY + 0.15 + Math.sin(k * Math.PI) * 0.7; })
    .then(() => { f.holder.rotation.y = r0; f.spin = null; });
}
T.fairySelect = function (pre) {
  return new Promise(resolve => {
    const S = buildStage();
    lockWorld(true);
    F.Player.obj.visible = false;
    const prevScene = F.R.cur;
    F.R.cur = S.scene;
    F.R.setCam({ mode: 'stage', target: new THREE.Vector3(0, 0.95, 0), dist: 13.2, pitch: 0.17, yaw: 0, snap: true });
    const offT = F.on('tick', stageTick);
    const s = openScreen('fsel', 'fairy');
    S.sel = KINDS.includes(pre) ? pre : null;
    const hits = {}, names = {};
    const ok = el('button', 'fs-ok', `<svg viewBox="0 0 80 80"><path d="M16 42 L33 59 L64 22" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    ok.setAttribute('aria-label', 'OK');
    S.fairies.forEach(f => {
      const h = el('button', 'fs-hit'); h.setAttribute('aria-label', NAMES[f.kind]); h.dataset.kind = f.kind;
      const n = el('div', 'fs-name', F.UI.caseText ? F.UI.caseText(NAMES[f.kind]) : NAMES[f.kind]); n.dataset.kind = f.kind;
      const pick = e => { e.stopPropagation(); choose(f); };
      h.addEventListener('click', pick); n.addEventListener('click', pick);
      s.append(h, n); hits[f.kind] = h; names[f.kind] = n;
    });
    s.appendChild(ok);
    const v = new THREE.Vector3();
    const layout = () => {
      const r = F.R.renderer.domElement.getBoundingClientRect(), u = F.HUD.u || 1;
      const proj = (x, y, z) => { v.set(x, y, z).project(F.R.camera); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
      S.fairies.forEach(f => {
        const [hx, hy] = proj(f.x, f.baseY + 2.35, 0.35), [, fy] = proj(f.x, f.baseY - 0.25, 0.35);
        const w = Math.max(150 * u, (fy - hy) * 0.62);
        const h = hits[f.kind]; h.style.left = hx + 'px'; h.style.top = hy + 'px'; h.style.width = w + 'px'; h.style.height = (fy - hy) + 'px';
        const n = names[f.kind]; n.style.left = hx + 'px'; n.style.top = (fy + 8 * u) + 'px'; n.classList.toggle('sel', S.sel === f.kind);
        if (S.sel === f.kind) { ok.style.left = hx + 'px'; ok.style.top = (fy + 62 * u) + 'px'; }
      });
      ok.classList.toggle('on', !!S.sel);
    };
    const offL = F.on('preRender', layout);
    layout();
    let taps = 0;
    function choose(f) {
      F.sfx.click();
      taps = S.sel === f.kind ? taps + 1 : 0;
      S.sel = f.kind;
      twirl(f); power(f);
      if (f.avatar.userData.play) { try { f.avatar.userData.play('cheer', 1.2); } catch (e) { /* optional */ } }
      F.Speech.clearQueue();
      if (F.TPL.has('fairy_intro_' + f.kind)) F.SAY(taps % 2 && F.TPL.has('fairy_power_' + f.kind) ? 'fairy_power_' + f.kind : 'fairy_intro_' + f.kind);
      else F.SAY('hud_fe_' + f.kind);
      layout();
    }
    ok.addEventListener('click', e => {
      e.stopPropagation(); if (!S.sel) return;
      F.sfx.levelup();
      const kind = S.sel;
      const fe = NAMES[kind], set = F.SETS.FAIRIES ? F.SETS.get('FAIRIES') : [];
      F.Speech.clearQueue();
      if (F.TPL.has('fairy_chosen') && set.includes(fe)) F.SAY('fairy_chosen', { fe }); else F.SAY('hud_pick_ok');
      offL(); offT();
      closeScreen(s);
      F.R.cur = prevScene === S.scene ? F.R.scene : prevScene;
      F.R.useScene(F.Space.cur);
      F.Player.obj.visible = true;
      resolve(kind);
    });
    T._fairyPick = k => { const f = S.fairies.find(x => x.kind === k); if (f) choose(f); };
    T._fairyOk = () => ok.click();
    F.T.timeout(() => { if (Shell.screen === 'fairy') F.SAY('hud_pick_fairy'); }, 500);
  });
};

/* ================================================================== bedtime summary + «Ny dag i morgen» */
function towerSvg(color, roof, n) {
  const fl = Math.max(1, Math.min(6, n));
  let floors = '';
  for (let i = 0; i < fl; i++) floors += `<rect x="16" y="${92 - (i + 1) * 12}" width="38" height="11" rx="2" fill="${i % 2 ? color : '#fff'}" stroke="#b98a45" stroke-width="1.5"/>`;
  const top = 92 - fl * 12;
  return `<svg viewBox="0 0 70 110"><rect x="12" y="92" width="46" height="12" rx="3" fill="#e8dcc4" stroke="#b98a45" stroke-width="1.5"/>${floors}
    <path d="M12 ${top} L35 ${top - 22} L58 ${top} Z" fill="${roof}" stroke="#b98a45" stroke-width="1.5" stroke-linejoin="round"/><circle cx="35" cy="${top - 24}" r="3" fill="#ffd84a"/></svg>`;
}
const SUN = `<svg viewBox="0 0 70 70"><g stroke="#ffb14a" stroke-width="5" stroke-linecap="round">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return `<path d="M${(35 + Math.cos(a) * 24).toFixed(1)} ${(35 + Math.sin(a) * 24).toFixed(1)} L${(35 + Math.cos(a) * 32).toFixed(1)} ${(35 + Math.sin(a) * 32).toFixed(1)}"/>`; }).join('')}</g>
  <circle cx="35" cy="35" r="17" fill="#ffd84a" stroke="#fff" stroke-width="3"/><circle cx="29" cy="33" r="2.2" fill="#6a4aa8"/><circle cx="41" cy="33" r="2.2" fill="#6a4aa8"/><path d="M29 40 Q35 45 41 40" fill="none" stroke="#6a4aa8" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const MOON = `<svg viewBox="0 0 150 150" width="100%" height="100%"><defs><radialGradient id="bsMoonG" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#ffe27a"/></radialGradient></defs>
  <path d="M95 18 A58 58 0 1 0 132 98 A46 46 0 1 1 95 18 Z" fill="url(#bsMoonG)" stroke="#fff" stroke-width="4"/>
  <path d="M60 78 Q66 84 72 78" fill="none" stroke="#c48a2a" stroke-width="3.5" stroke-linecap="round"/><path d="M44 92 Q55 104 70 98" fill="none" stroke="#c48a2a" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="46" cy="104" rx="7" ry="4" fill="#ffb3cf" opacity=".8"/></svg>`;
const SLEEPY = `<svg viewBox="0 0 300 270"><defs><radialGradient id="bsPuffG" gradientUnits="userSpaceOnUse" cx="120" cy="90" r="200"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e4ecfb"/></radialGradient></defs>
  <g fill="url(#bsPuffG)"><circle cx="85" cy="160" r="58"/><circle cx="140" cy="110" r="66"/><circle cx="205" cy="120" r="58"/><circle cx="245" cy="170" r="45"/><circle cx="55" cy="190" r="38"/><rect x="55" y="150" width="200" height="75" rx="37"/></g>
  <path d="M104 150 Q116 160 128 150" fill="none" stroke="#3b2f5c" stroke-width="7" stroke-linecap="round"/><path d="M172 150 Q184 160 196 150" fill="none" stroke="#3b2f5c" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="88" cy="178" rx="18" ry="10" fill="#ffb3cf" opacity=".85"/><ellipse cx="212" cy="178" rx="18" ry="10" fill="#ffb3cf" opacity=".85"/>
  <path d="M138 182 Q150 190 162 182" fill="none" stroke="#3b2f5c" stroke-width="5" stroke-linecap="round"/></svg>`;
T.bedtime = function (sum) {
  sum = sum || {};
  return new Promise(resolve => {
    lockWorld(true);
    const s = openScreen('bs', 'bed');
    s.innerHTML = `<div class="bs-moon">${MOON}</div>`;
    for (let i = 0; i < 14; i++) {
      const k = el('div', 'bs-star', `<svg viewBox="0 0 22 22" width="100%" height="100%"><path d="${sp(11, 11, 11, 3.2, 4)}" fill="#fff"/></svg>`);
      k.style.left = (4 + U.hash2(i, 7, 3) * 92) + '%'; k.style.top = (3 + U.hash2(i, 8, 3) * 40) + '%'; k.style.animationDelay = (U.hash2(i, 9, 3) * 3).toFixed(2) + 's';
      s.appendChild(k);
    }
    const card = el('div', 'bs-card');
    const coins = Math.max(0, sum.coins | 0), tens = Math.floor(coins / 10), ones = coins % 10;
    const words = (sum.words || []).slice(0, 12);
    const fl = sum.floors || {};
    const anyFloors = (fl.tall || 0) + (fl.les || 0) + (fl.skriv || 0) > 0;
    const me = fairyThumb(F.save.fairy || 'krystall');
    card.innerHTML = `<div class="bs-head">${me ? `<img src="${me}" alt="">` : ''}<h1>God natt!</h1></div>
      ${coins > 0 ? `<div class="bs-row r-coins"><div class="bs-coins">
        ${tens ? `<div class="grp">${'<div class="coin10">10</div>'.repeat(Math.min(tens, 20))}</div>` : ''}
        ${tens && ones ? '<span class="plus">+</span>' : ''}
        ${ones ? `<div class="grp">${'<div class="coin1"></div>'.repeat(ones)}</div>` : ''}
        <div class="hud-chip">${coins}</div></div></div>` : ''}
      ${words.length ? `<div class="bs-row r-words"><div class="bs-words">${words.map(w => `<div class="bs-word" data-w="${w}"><div class="im">${F.VOX.has(w) ? `<img src="${F.Thumb.url(w, {}, { size: 160 })}" alt="">` : ''}</div><div class="w">${F.UI.caseText(w)}</div></div>`).join('')}</div></div>` : ''}
      ${anyFloors ? `<div class="bs-row r-floors"><div class="bs-towers">${[['tall', '#9ad6ff', '#6fa8ec'], ['les', '#9fe6c4', '#7fd1b0'], ['skriv', '#f6a9c8', '#ec7aa8']].filter(([k]) => fl[k] > 0)
        .map(([k, c1, c2]) => `<div class="bs-tower">${towerSvg(c1, c2, (sum.towerN || {})[k] || fl[k])}<div class="n">+${fl[k]}</div></div>`).join('')}</div></div>` : ''}
      <button class="bs-next">${SUN}<span>Ny dag i morgen</span></button>`;
    s.appendChild(card);
    card.querySelectorAll('.bs-word').forEach(w => w.addEventListener('click', e => { e.stopPropagation(); const word = w.dataset.w; if (F.TPL.has('hud_word') && F.SETS.get('WORDS').includes(word)) F.SAYF('hud_word', { w: word }); }));
    const gear = F.HUD.makeGear(() => F.Prog.gate());
    s.appendChild(gear);
    const sleep = el('div', 'bs-sleep', SLEEPY + '<div class="bs-z" style="left:66%;top:8%">z</div><div class="bs-z b" style="left:72%;top:2%">z</div><div class="bs-z c" style="left:78%;top:-4%">z</div>');
    s.appendChild(sleep);
    const lit = cls => { card.querySelectorAll('.bs-row').forEach(r => r.classList.toggle('lit', r.classList.contains(cls))); };
    // narrated summary (each part is its own clip: carrier + one number clip)
    (async () => {
      await F.T.sleep(600);
      await F.SAY('hud_bed_summary');
      if (coins > 0) {                     // no coins today: no empty coin row and no «0» (the card just says God natt)
        lit('r-coins'); F.sfx.coins(Math.min(10, tens + ones));
        await F.SAY('hud_bed_coins');
        if (coins <= 100) await F.SAY('hud_num', { n: coins }); else await F.SAY('hud_purse_many');
      }
      if (coins >= 10 && coins <= 129) {
        if (tens === 1) await F.SAY('hud_tens1'); else if (tens >= 2) await F.SAY('hud_tens', { t: tens });
        if (ones === 1) await F.SAY('hud_ones1'); else if (ones >= 2) await F.SAY('hud_ones', { e: ones });
      }
      if (words.length) { lit('r-words'); await F.SAY('hud_bed_words'); }
      if (anyFloors) { lit('r-floors'); F.sfx.levelup(); await F.SAY('hud_bed_floors'); }
      lit('none');
      await F.SAY('hud_bed_night');
    })();
    const next = card.querySelector('.bs-next');
    next.addEventListener('click', e => {
      e.stopPropagation();
      F.sfx.chime();
      F.Speech.clearQueue();
      F.SAY('hud_bed_tomorrow');
      card.classList.add('out');
      sleep.classList.add('on');
      F.emit('bedtimeDone');
    });
    T._bedNext = () => next.click();
    T._bedClose = () => { closeScreen(s); lockWorld(false); resolve(); };
  });
};
T.closeBedtime = () => { if (T._bedClose) { const f = T._bedClose; T._bedClose = null; f(); } };

/* ================================================================== pause (Esc): continue, sound, music, «til tittelskjermen» */
const PICO = {
  play: `<svg viewBox="0 0 80 80"><path d="M28 18 L62 40 L28 62 Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></svg>`,
  sound: `<svg viewBox="0 0 60 60"><path d="M8 22 H19 L32 11 V49 L19 38 H8 Z" fill="#8a5ad6" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    <g class="on-only" fill="none" stroke="#ff7fb0" stroke-width="4.5" stroke-linecap="round"><path d="M39 22 Q45 30 39 38"/><path d="M45 15 Q55 30 45 45"/></g>
    <g class="off-only" stroke="#e05a6e" stroke-width="5" stroke-linecap="round"><path d="M40 21 L54 39 M54 21 L40 39"/></g></svg>`,
  music: `<svg viewBox="0 0 60 60"><path d="M24 44 V14 L48 9 V39" fill="none" stroke="#8a5ad6" stroke-width="4.5" stroke-linejoin="round"/>
    <ellipse cx="18" cy="45" rx="8" ry="6" fill="#8a5ad6"/><ellipse cx="42" cy="40" rx="8" ry="6" fill="#8a5ad6"/><path d="M24 20 L48 15" stroke="#ff7fb0" stroke-width="4"/>
    <g class="off-only" stroke="#e05a6e" stroke-width="5" stroke-linecap="round"><path d="M10 10 L52 52"/></g></svg>`,
  home: `<svg viewBox="0 0 60 60"><path d="M10 52 V26 H16 V20 H22 V26 H27 V18 L30 10 L33 18 V26 H38 V20 H44 V26 H50 V52 Z" fill="#fff3dc" stroke="#b98a45" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M25 52 V42 A5 5 0 0 1 35 42 V52 Z" fill="#c99a5a"/><path d="M8 26 L13 17 L18 26 Z M42 26 L47 17 L52 26 Z" fill="#ec7aa8"/><path d="M26 18 L30 6 L34 18 Z" fill="#9d8cf0"/>
    <rect x="14" y="32" width="5" height="6" rx="2.5" fill="#9fd3f4"/><rect x="41" y="32" width="5" height="6" rx="2.5" fill="#9fd3f4"/></svg>`,
};
let pauseState = null;
T.pause = function () {
  if (Shell.screen || pauseState) return false;
  pauseState = { inp: F.Input.enabled, fr: F.Player.frozen, hud: !F.HUD.hidden };
  F.Input.enabled = false; F.Player.frozen = true; F.Player.stop();
  if (F.R.pause) F.R.pause(true);
  document.body.classList.add('pause-on');
  const s = openScreen('ps', 'pause');
  const set = F.save.settings = F.save.settings || {};
  s.innerHTML = `<div class="ps-card">
      <button class="ps-go" aria-label="Fortsett">${PICO.play}</button>
      <div class="ps-row">
        <button class="ps-t ps-sound" aria-label="Lyd">${PICO.sound}<span>Lyd</span></button>
        <button class="ps-t ps-music" aria-label="Musikk">${PICO.music}<span>Musikk</span></button>
        ${F.Task.current ? '' : `<button class="ps-t ps-home" aria-label="Til tittelskjermen">${PICO.home}<span>Til tittelskjermen</span></button>`}
      </div></div>`;
  const sync = () => { s.querySelector('.ps-sound').classList.toggle('off', set.sound === false); s.querySelector('.ps-music').classList.toggle('off', set.music === false); };
  const toggle = key => {
    set[key] = set[key] === false;
    if (F.audioSettings) F.audioSettings[key] = set[key] !== false;
    if (F.audio && F.audio.apply) F.audio.apply();
    F.store(); F.emit('settings', key, set[key]); sync();
    if (set.sound !== false) F.sfx.click();
  };
  s.querySelector('.ps-go').addEventListener('click', e => { e.stopPropagation(); T.resume(); });
  s.querySelector('.ps-sound').addEventListener('click', e => { e.stopPropagation(); toggle('sound'); });
  s.querySelector('.ps-music').addEventListener('click', e => { e.stopPropagation(); toggle('music'); });
  const home = s.querySelector('.ps-home');
  if (home) home.addEventListener('click', e => { e.stopPropagation(); T.resume(true); if (F.Shell.toTitle) F.Shell.toTitle(); });
  sync();
  pauseState.s = s;
  F.sfx.click();
  F.emit('paused', true);
  return true;
};
T.resume = function (quiet) {
  const p = pauseState; if (!p) return false;
  pauseState = null;
  closeScreen(p.s);
  document.body.classList.remove('pause-on');
  if (F.R.pause) F.R.pause(false);
  F.Input.enabled = p.inp; F.Player.frozen = p.fr;
  if (!quiet) F.sfx.chime();
  F.emit('paused', false);
  return true;
};
T.isPaused = () => !!pauseState;
})();
