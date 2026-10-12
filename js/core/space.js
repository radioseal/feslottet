/* Feslottet – spaces: 'out' (endless world, F.W) and 'in' (castle dollhouse, implemented by F.Castle).
   F.Space.cur                       'out' | 'in'
   F.Space.set(name, {x, z})         switch scene + place the fairy (emits 'spaceChanged')
   F.Space.heightAt(x,z) / blocked(x,z,r,ignore) / findPath(sx,sz,gx,gz,r,ignore) / scene()  – dispatch to current impl
   F.Space.impl.in = {heightAt, blocked, findPath, scene}  – F.Castle replaces the default (flat floor, walls list) */
(function () {
'use strict';
const F = window.F;
const inWalls = [];
const segDist = (px, pz, w) => { const vx = w.x2 - w.x1, vz = w.z2 - w.z1, L = vx * vx + vz * vz || 1; let t = ((px - w.x1) * vx + (pz - w.z1) * vz) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (w.x1 + t * vx), pz - (w.z1 + t * vz)); };
function thingsBlock(space, x, z, r, ignore) {
  const L = F.Things.list;
  for (let i = 0; i < L.length; i++) { const t = L[i]; if (!t.solid || t === ignore || t.space !== space) continue; const dx = t.x - x, dz = t.z - z, rr = t.radius + r; if (dx * dx + dz * dz < rr * rr) return true; }
  return false;
}
const Space = F.Space = {
  cur: 'out',
  inWalls,
  // walled outdoor areas entered through a gate: [{box:{x0,x1,z0,z1}, via:{x,z}}] (player routes start → via → goal). Modules push more.
  // routes: candidate waypoint chains from outside to the gate (the one whose first point is nearest the start is used)
  vias: [{ id: 'slott', box: { x0: -34, x1: 34, z0: -28, z1: 22 }, via: { x: 0, z: 32 },   // castle + moat; the gate front is just south
    routes: [[{ x: 0, z: 32 }],
      [{ x: 44, z: 32 }, { x: 0, z: 32 }], [{ x: -44, z: 32 }, { x: 0, z: 32 }],                                   // from the east / west side
      [{ x: 44, z: -36 }, { x: 44, z: 32 }, { x: 0, z: 32 }], [{ x: -44, z: -36 }, { x: -44, z: 32 }, { x: 0, z: 32 }]] }],   // from the north
  impl: {
    out: {
      heightAt: (x, z) => F.W.groundY(x, z),
      blocked: (x, z, r, ign) => F.W.blocked(x, z, r, ign),
      findPath: (sx, sz, gx, gz, r, ign) => F.W.findPath(sx, sz, gx, gz, r, ign),
      scene: () => F.R.scene,
    },
    in: {
      floorY: 0,
      heightAt(x, z) { return F.Castle && F.Castle.floorAt ? F.Castle.floorAt(x, z) : 0; },
      blocked(x, z, r, ign) { for (const w of inWalls) if (segDist(x, z, w) < r + w.t) return true; return thingsBlock('in', x, z, r, ign); },
      findPath(sx, sz, gx, gz) { return [[gx, gz]]; },
      scene: () => F.R.inScene,
    },
  },
  thingsBlock,
  addInWall(x1, z1, x2, z2, thick = 0.4) { const w = { x1, z1, x2, z2, t: thick / 2 }; inWalls.push(w); return w; },
  heightAt: (x, z) => Space.impl[Space.cur].heightAt(x, z),
  blocked: (x, z, r, ign) => Space.impl[Space.cur].blocked(x, z, r, ign),
  findPath: (sx, sz, gx, gz, r, ign) => Space.impl[Space.cur].findPath(sx, sz, gx, gz, r, ign),
  scene: name => Space.impl[name || Space.cur].scene(),
  set(name, at) {
    const prev = Space.cur;
    Space.cur = name;
    F.R.useScene(name);
    F.inside = name === 'in';
    if (F.Player && F.Player.obj) { Space.scene().add(F.Player.obj); }
    if (F.Input) F.Input.hover = null;
    if (at && F.Player) F.Player.teleport(at.x, at.z);
    // DESIGN2 §9.2: {cam:false} leaves the camera alone (door crossings keep yaw/zoom); {cam:{…}} passes options to setCam
    if (at && at.cam === false) { /* untouched */ }
    else if (at && at.cam && typeof at.cam === 'object') F.R.setCam(at.cam);
    else F.R.setCam(name === 'out' ? { mode: 'out', pitch: 0.92, yaw: 0, dist: [16, 24, 36][F.R.cam.zoomI] }
                                   : { mode: 'in', pitch: 0.66, yaw: 0, dist: F.R.ZOOM_IN[F.R.cam.zoomInI != null ? F.R.cam.zoomInI : 1] });
    if (prev !== name) F.emit('spaceChanged', name, prev);
  },
};
})();
