/* Feslottet – the player's fairy: movement (click-to-go with A*, arrow keys/WASD), hovering, reach & press.
   F.Player.pos (THREE.Vector3), .heading, .obj (THREE.Group; avatar built by F.Fairy.buildAvatar(kind) if defined)
   F.Player.goTo(x, z) -> Promise<boolean arrived>
   F.Player.goPress(thing) -> walks into reach, faces it, runs F.Things.run(thing)
   F.Player.teleport(x, z)   F.Player.frozen (true while a task panel is open)
   Emits 'playerMoved' (x,z) each frame it moves. */
(function () {
'use strict';
const F = window.F, U = F.U;
const SPEED = 6.5, RAD = 0.35;
const P = F.Player = {
  pos: new THREE.Vector3(0, 0, 0), heading: 0, obj: new THREE.Group(), avatar: null,
  path: null, goal: null, onArrive: null, frozen: false, moving: false, keys: {}, bob: 0, speedMul: 1,
};
P.obj.name = 'player';
P.setAvatar = function (kind) {
  if (P.avatar) P.obj.remove(P.avatar);
  let a = null;
  try { a = F.Fairy && F.Fairy.buildAvatar ? F.Fairy.buildAvatar(kind) : null; } catch (e) { console.error(e); }
  if (!a) { const b = F.M.builder(); b.sphere(0.42, 'skin', 0, 1.55, 0); b.cone(0.62, 1.3, 'lilac', 0, 0.75, 0); a = b.group; }
  P.avatar = a; P.obj.add(a);
  // see-through lilac silhouette when walls/trees hide her (DESIGN §2.5)
  try { if (F.FX && F.FX.silhouette) P.sil = F.FX.silhouette(a); } catch (e) { console.error(e); }
};
P.teleport = function (x, z) {
  P.pos.set(x, F.Space.heightAt(x, z), z); P.path = null; P.goal = null;
  if (F.R.cam.mode === 'out' || F.R.cam.mode === 'in' || F.R.cam.followPlayer) { F.R.cam.target.copy(P.pos); if (F.R.cam.mode === 'in' && F.R.cam.clamp) F.R.cam.clamp(F.R.cam.target); F.R.cam.init = false; }
  if (!F.inside) F.W.update(x, z, true);
};
// chain ~30 m A* legs along the straight line (each intermediate waypoint nudged off obstacles); a failing leg goes straight
function legsTo(x, z, fx, fz, opts) {
  const L = Math.hypot(x - fx, z - fz), n = Math.max(1, Math.ceil(L / 30)), legs = []; let sx = fx, sz = fz;
  for (let i = 1; i <= n; i++) {
    let tx = fx + (x - fx) * i / n, tz = fz + (z - fz) * i / n;
    if (i < n && F.Space.blocked(tx, tz, RAD)) {
      let ok = false; for (let r = 1; r <= 8 && !ok; r++) for (let a = 0; a < 8 && !ok; a++) { const ax = tx + Math.cos(a * Math.PI / 4) * r, az = tz + Math.sin(a * Math.PI / 4) * r; if (!F.Space.blocked(ax, az, RAD)) { tx = ax; tz = az; ok = true; } }
    }
    const leg = F.Space.findPath(sx, sz, tx, tz, RAD, (opts && opts.ignore) || null);
    legs.push(...(leg || [[tx, tz]])); sx = tx; sz = tz;
  }
  return legs;
}
P.goTo = function (x, z, opts) {
  opts = opts || {};
  return new Promise(res => {
    if (P.onArrive) P.onArrive(false);
    // a tap on something solid (moat, wall, building) means "go there": aim for the nearest walkable point instead (lead, v2 review)
    if (F.Space.cur === 'out' && F.Space.blocked(x, z, RAD)) {
      // a tap on the moat / wall / keep of a walled area means "in there": snap to the free point well inside the walls
      // nearest the tap (from outside, the gate routing below takes her round by the bridge; from inside, she never
      // lands on the unreachable strip between wall and moat) – kid review, v2 fix
      const inBox = (b, px, pz, m) => px >= b.x0 - m && px <= b.x1 + m && pz >= b.z0 - m && pz <= b.z1 + m;
      const wall = (F.Space.vias || []).find(w => inBox(w.box, x, z, 8));
      let best = null;
      for (let r = 1; r <= (wall ? 30 : 14) && !best; r += 1) for (let a = 0; a < 16; a++) {
        const ax = x + Math.cos(a * Math.PI / 8) * r, az = z + Math.sin(a * Math.PI / 8) * r;
        if (wall && !inBox(wall.box, ax, az, -4)) continue;
        if (!F.Space.blocked(ax, az, RAD)) { const d = wall ? r : Math.hypot(ax - P.pos.x, az - P.pos.z); if (!best || d < best.d) best = { x: ax, z: az, d }; }
      }
      if (best) { x = best.x; z = best.z; }
    }
    let path = F.Space.findPath(P.pos.x, P.pos.z, x, z, RAD, opts.ignore || null);
    // long trips (e.g. tower → castle courtyard) can exceed the A* budget: split the straight line into ~30 m legs,
    // path each leg and chain them (a leg that still fails goes straight) – lead, DESIGN2 W1 request
    // walled areas (home castle courtyard, royal castles) are entered through their gate: route start → gate → goal
    if (!path && F.Space.cur === 'out') {
      const inBox = (b, px, pz) => px >= b.x0 && px <= b.x1 && pz >= b.z0 && pz <= b.z1;
      const v = (F.Space.vias || []).find(w => inBox(w.box, x, z) !== inBox(w.box, P.pos.x, P.pos.z));
      if (v) {
        // choose the waypoint chain (outside → gate) that suits the outside end; reverse it when leaving
        const leaving = inBox(v.box, P.pos.x, P.pos.z);
        const ox = leaving ? x : P.pos.x, oz = leaving ? z : P.pos.z;
        const routes = v.routes || [[v.via]];
        const cost = r => { let c = Math.hypot(r[0].x - ox, r[0].z - oz); for (let i = 1; i < r.length; i++) c += Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z); return c; };
        let route = routes.slice().sort((r1, r2) => cost(r1) - cost(r2))[0].slice();
        // the straight gate-only route is only valid when the outside end is in front of the gate (south of the box)
        if (route.length === 1 && oz < v.box.z1 + 6 && routes.length > 1) route = routes.slice(1).sort((r1, r2) => cost(r1) - cost(r2))[0].slice();
        if (leaving) route.reverse();
        const pts = [{ x: P.pos.x, z: P.pos.z }, ...route, { x, z }];
        const out = [];
        for (let i = 1; i < pts.length; i++) out.push(...(F.Space.findPath(pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z, RAD, opts.ignore || null) || legsTo(pts[i].x, pts[i].z, pts[i - 1].x, pts[i - 1].z, opts)));
        path = out;
      }
    }
    if (!path && F.Space.cur === 'out') {
      const L = Math.hypot(x - P.pos.x, z - P.pos.z);
      if (L > 35) path = legsTo(x, z, P.pos.x, P.pos.z, opts);
    }
    if (!path) path = [[x, z]];
    P.path = path; P.goal = { x, z, stopDist: opts.stopDist || 0.15 };
    P.onArrive = ok => { P.onArrive = null; res(ok); };
    F.emit('goTo', x, z);
  });
};
P.goPress = async function (th) {
  if (P.frozen) return;
  const reach = th.def.reach != null ? th.def.reach : th.radius + 1.3;
  const d = Math.hypot(th.x - P.pos.x, th.z - P.pos.z);
  if (d > reach) {
    // approach point on the line towards the thing
    const ang = Math.atan2(P.pos.x - th.x, P.pos.z - th.z);
    const tx = th.x + Math.sin(ang) * (reach - 0.4), tz = th.z + Math.cos(ang) * (reach - 0.4);
    const ok = await P.goTo(tx, tz, { ignore: th, stopDist: 0.3 });
    // interrupted by a panel / the wand opening on the way: do not start the thing underneath it
    if (!ok && (P.frozen || (F.UI.isOpen && F.UI.isOpen()) || (F.Wand && F.Wand.isOpen && F.Wand.isOpen()))) return;
    if (!ok && Math.hypot(th.x - P.pos.x, th.z - P.pos.z) > reach + 1.5) {
      // unreachable (e.g. on an islet): never silent – the thing bounces and sparkles so she sees it noticed her (lead w3)
      try { if (th.obj) { F.FX.pop(th.obj); F.FX.sparkle(th.obj.position.clone().add(new THREE.Vector3(0, 1, 0))); } F.sfx.boing && F.sfx.boing(); } catch (e) {}
      return;
    }
  }
  P.heading = Math.atan2(th.x - P.pos.x, th.z - P.pos.z); idleT = -1.2;   // keeps facing the thing a little longer
  return F.Things.run(th);
};
P.stop = function () { P.path = null; if (P.onArrive) P.onArrive(false); };

addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (F.UI && F.UI.keyCapture && /^Key[A-Z]$/.test(e.code)) return;   // letters go to the open writing widget
  P.keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { P.keys[e.code] = false; });
addEventListener('blur', () => { P.keys = {}; });

function tryMove(dx, dz) {
  const nx = P.pos.x + dx, nz = P.pos.z + dz;
  if (!F.Space.blocked(nx, nz, RAD)) { P.pos.x = nx; P.pos.z = nz; return true; }
  if (!F.Space.blocked(nx, P.pos.z, RAD)) { P.pos.x = nx; return true; }
  if (!F.Space.blocked(P.pos.x, nz, RAD)) { P.pos.z = nz; return true; }
  return false;
}
let stuckT = 0, idleT = 0;
const IDLE_FACE_S = 0.6, FACE_MAX = 0.44;   // idle: turn (back) towards the camera so her face shows; up to ~25° off-axis
/* v5 WP-X camera watchdog (parent playtest: «the camera stayed at the ducklings while she flew away»). Outdoors, when nothing that
   may own the camera is running (task, encounter, scripted look, cloud ride, royal chain/audience/ceremony, cinematic freeze, open
   Staven) and cam.focus is set – or the camera target is > 6 m from the fairy, or the mode is still 'wand' with the bar closed – for
   more than 1.5 s, the orphaned focus/mode is released and the camera follows her again. F.Player.camWatch = {fired, last, t}. */
const CW = P.camWatch = { fired: 0, last: null, t: 0 };
function camOwner() {
  const c = F.R.cam;
  return !!((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy) || c.look || (F.Travel && F.Travel.busy) ||
    (F.RQuest && F.RQuest.busy) || (F.Royals && F.Royals.ceremony) || P.frozen || (F.Shell && F.Shell.screen) ||
    (F.Wand && F.Wand.isOpen && F.Wand.isOpen()));
}
function camWatch(dt) {
  const c = F.R.cam;
  if (F.Space.cur !== 'out' || !(c.mode === 'out' || c.mode === 'wand')) { CW.t = 0; return; }
  const far = c.mode === 'out' && Math.hypot(c.target.x - P.pos.x, c.target.z - P.pos.z) > 6;
  const orphan = (c.focus || far || c.mode === 'wand') && !camOwner();
  if (!orphan) { CW.t = 0; return; }
  CW.t += dt; if (CW.t < 1.5) return;
  CW.t = 0; CW.fired++;
  CW.last = { focus: c.focus ? [+c.focus.x.toFixed(1), +c.focus.z.toFixed(1)] : null, mode: c.mode, at: [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1)], t: +F.T.now.toFixed(1) };
  console.warn('[cam] watchdog: orphaned camera released', JSON.stringify(CW.last));
  c.focus = null; c.mode = 'out'; c.target.set(P.pos.x, P.pos.y, P.pos.z);
  F.emit('camFocusOrphan', CW.last);
}
F.on('tick', (dt, t) => {
  let mx = 0, mz = 0;
  const k = P.keys;
  if (!P.frozen) {
    const f = (k.ArrowUp || k.KeyW ? 1 : 0) - (k.ArrowDown || k.KeyS ? 1 : 0);
    const s = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
    if (f || s) {
      if (P.path) P.stop();
      const yaw = F.R.cam.yaw;
      // forward = away from camera
      mx = (-Math.sin(yaw) * f + Math.cos(yaw) * s); mz = (-Math.cos(yaw) * f - Math.sin(yaw) * s);
      const L = Math.hypot(mx, mz); mx /= L; mz /= L;
    } else if (P.path && P.path.length) {
      const [tx, tz] = P.path[0];
      const dx = tx - P.pos.x, dz = tz - P.pos.z, d = Math.hypot(dx, dz);
      const last = P.path.length === 1;
      if (d < (last ? P.goal.stopDist : 0.35)) {
        P.path.shift();
        if (!P.path.length) { P.path = null; if (P.onArrive) P.onArrive(true); }
      } else { mx = dx / d; mz = dz / d; }
    }
  }
  P.moving = !!(mx || mz);
  if (P.moving) {
    const sp = SPEED * P.speedMul * dt;
    const moved = tryMove(mx * sp, mz * sp);
    const target = Math.atan2(mx, mz);
    let dh = target - P.heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    P.heading += dh * Math.min(1, dt * 12);
    if (!moved) { stuckT += dt; if (stuckT > 0.6 && P.path) { stuckT = 0; P.stop(); } } else stuckT = 0;
    F.emit('playerMoved', P.pos.x, P.pos.z);
    idleT = 0;
  } else if (!P.frozen && !(F.UI && F.UI.isOpen && F.UI.isOpen()) && !(F.Wand && F.Wand.isOpen && F.Wand.isOpen()) && !F.R.cam.focus && (F.R.cam.mode === 'out' || F.R.cam.mode === 'room')) {
    idleT += dt;
    if (idleT > IDLE_FACE_S) {
      const yaw = F.R.cam.yaw;   // camera sits at target + (sin yaw, cos yaw) → heading = yaw faces it
      let rel = P.heading - yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
      const goal = U.clamp(rel, -FACE_MAX, FACE_MAX);
      if (Math.abs(rel - goal) > 0.01) P.heading = yaw + rel + (goal - rel) * Math.min(1, dt * 3.5);
    }
  }
  P.pos.y += (F.Space.heightAt(P.pos.x, P.pos.z) - P.pos.y) * Math.min(1, dt * 10);
  P.bob += dt;
  P.obj.position.set(P.pos.x, P.pos.y + 0.35 + Math.sin(P.bob * 2.4) * 0.12, P.pos.z);
  P.obj.rotation.y = P.heading;
  if (P.avatar && P.avatar.userData.animate) P.avatar.userData.animate(dt, t, P.moving);
  camWatch(dt);
  if (F.R.cam.focus && F.R.cam.mode === 'out') F.R.cam.target.copy(F.R.cam.focus);           // task stage framing (F.Task)
  else if (F.R.cam.mode === 'out' || F.R.cam.followPlayer) F.R.cam.target.set(P.pos.x, P.pos.y, P.pos.z);
  if (!F.inside) F.W.update(P.pos.x, P.pos.z);
});
})();
