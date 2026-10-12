/* Feslottet – voxel model toolkit (micro-voxels, baked AO, vertex colours, cached geometry).
   Author models in code:
     F.VOX.def('stol', {
       size: [12, 16, 12],            // grid dims x,y,z (voxels). Model origin = bottom centre.
       scale: 1/16,                   // metres per voxel (default 1/16)
       build(v, o) { v.box(1,0,1, 2,7,2, 'wood'); ... },   // o = options passed to make()
       parts: { lid: { pivot:[x,y,z], build(v,o){...} } }   // optional separately-meshed animated parts (own grids, same size)
     })
     const obj = F.VOX.make('stol', {style, ...}) -> THREE.Group (children: body mesh + part pivots in obj.userData.parts[name])
   Builder ops (inclusive integer coords, colours = F.PAL names or hex):
     v.set(x,y,z,c)  v.box(x0,y0,z0,x1,y1,z1,c)  v.hollow(x0,y0,z0,x1,y1,z1,c)  v.sphere(cx,cy,cz,r,c)  v.ellipsoid(cx,cy,cz,rx,ry,rz,c)
     v.cyl(cx,y0,cz,r,h,c)  (vertical)   v.cone(cx,y0,cz,r,h,c)   v.line(x0,y0,z0,x1,y1,z1,c)   v.clear(x0..)= box with 0
     v.mirrorX()  (copies left half to right)   v.paint((x,y,z,c)=>newC)   v.text(str, x, y, z, c, {axis:'x'|'z'}) 3x5 pixel font
     v.get(x,y,z)  v.size
   Styles (o.style, DESIGN §2.6): 'crystal' (glassy, 45% toward crystal, 6 twinkles), 'flower' (blossoms on 12% of top faces, leaves on
     4% of sides; grid padded by 1), 'bubble' (glass shell r = bbox·0.6 that pops into bubble particles ~0.8 s after the model has been
     visible for its assembly; o.keepBubble:true keeps it; g.userData.popBubble()), 'star' (20% toward butter, halo, 4 twinkles).
   Variants: meta.variants {key:[values]} → F.VOX.variants(id) lists every combination; make(id,{variant:i|'rand'}). */
(function () {
'use strict';
const F = window.F;
const defs = {};
const cache = new Map();
const palIdx = new Map(); const palCol = [null];
// colours that render as glass (transparent, shiny) or glow (unlit); extend via F.VOX.GLASS.add(hex) / F.VOX.GLOW.add(hex)
const GLASS = new Set(), GLOW = new Set();
function ci(c) {
  if (c == null || c === 0) return 0;
  const hex = typeof c === 'string' ? (F.PAL[c] != null ? F.PAL[c] : new THREE.Color(c).getHex()) : c;
  let i = palIdx.get(hex);
  if (i == null) { i = palCol.length; palCol.push(new THREE.Color(hex)); palIdx.set(hex, i); }
  return i;
}
// 3x5 pixel font for signs (uppercase + digits + ÆØÅ)
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', Æ: '011110111110111', Ø: '011101111101110', Å: '010000111101101',
  // digits joined orthogonally (no diagonal-only joins) so they stay readable when scaled up (Tallhagen numeral beds)
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
  6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', ' ': '000000000000000', '-': '000000111000000',
};
// models whose build passes fractional coordinates to box() (those voxels land in the wrong place or vanish): F.VOX.fractional
const FRAC = new Set(); let BUILDING = null;
function grid(sx, sy, sz) {
  const d = new Uint8Array(sx * sy * sz);
  const inb = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz;
  const v = {
    size: [sx, sy, sz], data: d,
    get: (x, y, z) => inb(x, y, z) ? d[x + sx * (y + sy * z)] : 0,
    set(x, y, z, c) { x |= 0; y |= 0; z |= 0; if (inb(x, y, z)) d[x + sx * (y + sy * z)] = ci(c); return v; },
    box(x0, y0, z0, x1, y1, z1, c) { const k = ci(c); if ((x0 % 1) || (y0 % 1) || (z0 % 1) || (x1 % 1) || (y1 % 1) || (z1 % 1)) FRAC.add(BUILDING || '?'); for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (inb(x, y, z)) d[x + sx * (y + sy * z)] = k; return v; },
    clear(x0, y0, z0, x1, y1, z1) { return v.box(x0, y0, z0, x1, y1, z1, 0); },
    hollow(x0, y0, z0, x1, y1, z1, c) { v.box(x0, y0, z0, x1, y1, z1, c); if (x1 - x0 > 1 && z1 - z0 > 1) v.clear(x0 + 1, y0, z0 + 1, x1 - 1, y1, z1 - 1); return v; },
    ellipsoid(cx, cy, cz, rx, ry, rz, c) { const k = ci(c); for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2; if (q <= 1.0 && inb(x, y, z)) d[x + sx * (y + sy * z)] = k; } return v; },
    sphere(cx, cy, cz, r, c) { return v.ellipsoid(cx, cy, cz, r, r, r, c); },
    cyl(cx, y0, cz, r, h, c) { const k = ci(c); for (let y = y0; y < y0 + h; y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.25 && inb(x, y, z)) d[x + sx * (y + sy * z)] = k; return v; },
    cone(cx, y0, cz, r, h, c) { for (let i = 0; i < h; i++) { const rr = r * (1 - i / h); if (rr < 0.35) { v.set(Math.round(cx), y0 + i, Math.round(cz), c); continue; } v.cyl(cx, y0 + i, cz, rr, 1, c); } return v; },
    line(x0, y0, z0, x1, y1, z1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1); for (let i = 0; i <= n; i++) v.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), Math.round(z0 + (z1 - z0) * i / n), c); return v; },
    mirrorX() { for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < Math.floor(sx / 2); x++) { const a = d[x + sx * (y + sy * z)]; if (a) d[(sx - 1 - x) + sx * (y + sy * z)] = a; } return v; },
    mirrorZ() { for (let z = 0; z < Math.floor(sz / 2); z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const a = d[x + sx * (y + sy * z)]; if (a) d[x + sx * (y + sy * (sz - 1 - z))] = a; } return v; },
    paint(fn) { for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const i = x + sx * (y + sy * z); if (d[i]) { const r = fn(x, y, z, palCol[d[i]].getHex()); if (r != null) d[i] = ci(r); } } return v; },
    // 3x5 pixel text; axis 'x' writes along +x on the z-plane facing +z (front); 'z' along -z facing +x
    text(str, x, y, z, c, o) {
      const axis = (o && o.axis) || 'x'; let cx = 0;
      for (const ch of String(str).toUpperCase()) {
        const g = FONT[ch] || FONT[' '];
        for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') { if (axis === 'x') v.set(x + cx + q, y + 4 - r, z, c); else v.set(x, y + 4 - r, z - cx - q, c); }
        cx += 4;
      }
      return v;
    },
  };
  return v;
}
// mesher: face culling + per-vertex AO + tiny brightness jitter
function mesh(v, scale, ox, oy, oz, style) {
  const out = {};
  for (const cls of ['opaque', 'glass', 'glow']) { const g = meshClass(v, scale, ox, oy, oz, style, cls); if (g) out[cls] = g; }
  return out;
}
function classOf(k) { const h = palCol[k].getHex(); return GLASS.has(h) ? 'glass' : GLOW.has(h) ? 'glow' : 'opaque'; }
function meshClass(v, scale, ox, oy, oz, style, cls) {
  const [sx, sy, sz] = v.size, d = v.data;
  const P = [], N = [], C = [], I = [];
  // a face is hidden only by a neighbour of the same class (glass next to opaque still shows the opaque face)
  const solidAny = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz && d[x + sx * (y + sy * z)] !== 0;
  const solidCls = (x, y, z) => { if (!solidAny(x, y, z)) return false; const c = classOf(d[x + sx * (y + sy * z)]); return cls === 'opaque' ? c === 'opaque' : (c === cls || c === 'opaque'); };
  const solid = solidAny;
  const FACES = [
    { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] }, { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
  ];
  const col = new THREE.Color();
  const tint = style === 'crystal' ? new THREE.Color(0x9fe8ff) : style === 'star' ? new THREE.Color(0xfff0a0) : null;
  const tintK = style === 'crystal' ? 0.35 : 0.2;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
    const k = d[x + sx * (y + sy * z)]; if (!k || classOf(k) !== cls) continue;
    const base = palCol[k];
    const jit = 1 + ((F.U.hash2(x * 31 + z, y * 17 + z * 7, k) - 0.5) * 0.06);
    for (const f of FACES) {
      const [nx, ny, nz] = f.n;
      if (solidCls(x + nx, y + ny, z + nz)) continue;
      const vi = P.length / 3;
      const ao = [];
      for (const c of f.c) {
        // AO: check the 3 voxels around this corner on the face's outer side
        const dx = c[0] ? 1 : -1, dy = c[1] ? 1 : -1, dz = c[2] ? 1 : -1;
        let s1, s2, cr;
        if (nx) { s1 = solid(x + nx, y + dy, z); s2 = solid(x + nx, y, z + dz); cr = solid(x + nx, y + dy, z + dz); }
        else if (ny) { s1 = solid(x + dx, y + ny, z); s2 = solid(x, y + ny, z + dz); cr = solid(x + dx, y + ny, z + dz); }
        else { s1 = solid(x + dx, y, z + nz); s2 = solid(x, y + dy, z + nz); cr = solid(x + dx, y + dy, z + nz); }
        const a = (s1 && s2) ? 0 : 3 - (s1 + s2 + cr);
        ao.push(a);
        P.push((x + c[0] - ox) * scale, (y + c[1] - oy) * scale, (z + c[2] - oz) * scale);
        N.push(nx, ny, nz);
        const m = cls === 'glow' ? 1 : (0.62 + 0.38 * a / 3) * jit;
        col.copy(base); if (tint) col.lerp(tint, tintK);
        C.push(col.r * m, col.g * m, col.b * m);
      }
      if (ao[0] + ao[2] > ao[1] + ao[3]) I.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      else I.push(vi + 1, vi + 2, vi + 3, vi + 1, vi + 3, vi);
    }
  }
  if (!P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I); g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
const MAT = {};
function material(k) {
  if (!MAT[k]) {
    if (k === 'crystal') MAT[k] = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 110, specular: 0xbfe8ff, transparent: true, opacity: 0.84, emissive: 0x10202c });
    else if (k === 'glass') MAT[k] = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 100, specular: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    else if (k === 'glow') MAT[k] = new THREE.MeshBasicMaterial({ vertexColors: true });
    else MAT[k] = new THREE.MeshLambertMaterial({ vertexColors: true });
  }
  return MAT[k];
}
function addMeshes(parent, geos, style) {
  for (const cls in geos) {
    const k = cls === 'opaque' ? (style === 'crystal' ? 'crystal' : 'opaque') : cls;
    const m = new THREE.Mesh(geos[cls], material(k));
    m.castShadow = cls !== 'glow' && cls !== 'glass'; m.receiveShadow = cls === 'opaque';
    if (cls === 'glass') m.renderOrder = 2;
    parent.add(m);
  }
}
const CRY = new THREE.Color(0x9fe8ff), BUT = new THREE.Color(0xfff0a0);
function resolveVariant(id, o) {
  if (o.variant == null) return o;
  const vs = F.VOX.variants(id); const i = o.variant === 'rand' ? Math.floor(Math.random() * vs.length) : (+o.variant || 0);
  const r = Object.assign({}, vs[((i % vs.length) + vs.length) % vs.length], o); delete r.variant; return r;
}
// build a model's grid; style 'flower' pads the grid by 1 (x/z) and 2 (top) and grows blossoms + leaves on the surface
function buildGrid(def, o, isPart) {
  const [sx, sy, sz] = def.size;
  const v0 = grid(sx, sy, sz); const prevB = BUILDING; BUILDING = def.id || prevB; try { def.build(v0, o); } finally { BUILDING = prevB; }
  if (o.style !== 'flower') return { v: v0, pad: 0 };
  const P = 1, v = grid(sx + 2 * P, sy + 2, sz + 2 * P), d0 = v0.data, d = v.data, SX = sx + 2 * P, SY = sy + 2;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const k = d0[x + sx * (y + sy * z)]; if (k) d[(x + P) + SX * (y + SY * (z + P))] = k; }
  const H = (x, y, z, s) => F.U.hash2(x * 7 + z * 13, y * 3 + s, 4242 + (def.id ? def.id.length : 0));
  const blossom = [ci('blossom'), ci('butter'), ci('white'), ci('pink')], leaf = ci('leaf'), leaf2 = ci('leaf2');
  const solid = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < sz + 2 * P && d[x + SX * (y + SY * z)] !== 0;
  const add = [];
  for (let z = 0; z < sz + 2 * P; z++) for (let y = 0; y < SY; y++) for (let x = 0; x < SX; x++) {
    if (!solid(x, y, z)) continue;
    if (!solid(x, y + 1, z) && y + 1 < SY && H(x, y, z, 1) < 0.12) add.push([x, y + 1, z, blossom[Math.floor(H(x, y, z, 2) * 4)]]);
    else {
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dz] of sides) if (!solid(x + dx, y, z + dz) && x + dx >= 0 && z + dz >= 0 && x + dx < SX && z + dz < sz + 2 * P && H(x + dx, y, z + dz, 3) < 0.08 / 2) { add.push([x + dx, y, z + dz, H(x, y, z, 5) < 0.5 ? leaf : leaf2]); break; }
    }
  }
  add.forEach(([x, y, z, k]) => { d[x + SX * (y + SY * z)] = k; });
  return { v, pad: P };
}
function surfacePoints(v, s, ox, oz) {
  const [sx, sy, sz] = v.size, d = v.data, out = [];
  const at = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz ? d[x + sx * (y + sy * z)] : 0;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) if (at(x, y, z) && (!at(x, y + 1, z) || !at(x, y, z + 1) || !at(x + 1, y, z))) out.push([(x + 0.5 - ox) * s, (y + 1) * s, (z + 0.5 - oz) * s]);
  return out;
}
// per-object style decorations: twinkle sprites (crystal 6, star 4), star halo, bubble shell that pops 0.8 s after it is shown
let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(32, 2); g.lineTo(36, 28); g.lineTo(62, 32); g.lineTo(36, 36); g.lineTo(32, 62); g.lineTo(28, 36); g.lineTo(2, 32); g.lineTo(28, 28); g.closePath(); g.fill();
  starTex = new THREE.CanvasTexture(c); return starTex;
}
const live = new Set();
const twMat = {};
function decorate(g, e, o) {
  const st = o.style;
  if ((st === 'crystal' || st === 'star') && e.twinkles && e.twinkles.length) {
    const col = st === 'crystal' ? 0xdff8ff : 0xfff3b0;
    const mat = twMat[st] || (twMat[st] = new THREE.SpriteMaterial({ map: starTexture(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sz = Math.max(0.12, (e.scale || 0.0625) * 4);
    e.twinkles.forEach((p, i) => { const sp = new THREE.Sprite(mat); sp.position.set(p[0], p[1], p[2]); sp.scale.setScalar(0.0001); sp.userData = { tw: true, ph: i * 1.7 + Math.random() * 3, s: sz }; g.add(sp); });
    live.add(g);
  }
  if (st === 'star' && e.bbox && F.FX && F.FX.haloTexture) {
    const c = e.bbox.getCenter(new THREE.Vector3()), size = e.bbox.getSize(new THREE.Vector3());
    const hm = new THREE.SpriteMaterial({ map: F.FX.haloTexture(), color: 0xfff0a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const h = new THREE.Sprite(hm); h.position.copy(c); h.scale.setScalar(Math.max(size.x, size.y, size.z) * 1.8); h.renderOrder = 3; g.add(h);
  }
  if (st === 'bubble' && e.bbox) {
    const c = e.bbox.getCenter(new THREE.Vector3()), size = e.bbox.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.6 + 0.03;
    const shell = new THREE.Mesh(BUBBLE_GEO || (BUBBLE_GEO = new THREE.IcosahedronGeometry(1, 2)), BUBBLE_MAT || (BUBBLE_MAT = new THREE.MeshPhongMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.32, shininess: 120, specular: 0xffffff, depthWrite: false, emissive: 0x203040 })));
    shell.position.copy(c); shell.scale.setScalar(r); shell.renderOrder = 4; shell.castShadow = false; shell.name = 'bubbleShell';
    g.add(shell); g.userData.bubbleShell = shell; g.userData.bubbleT = 0;
    g.userData.popBubble = () => popBubble(g);
    if (o.keepBubble !== true) live.add(g);
  }
}
let BUBBLE_GEO = null, BUBBLE_MAT = null;
function popBubble(g) {
  const sh = g.userData.bubbleShell; if (!sh || !sh.parent) return;
  const w = new THREE.Vector3(); sh.getWorldPosition(w);
  sh.parent.remove(sh); g.userData.bubbleShell = null;
  if (F.FX && F.FX.burst) F.FX.burst(w, { kind: 'bubble', n: 14, size: Math.min(0.3, sh.scale.x * 0.25) });
  if (F.sfx && F.sfx.pop) F.sfx.pop();
}
const onStage = g => { let o = g; while (o) { if (!o.visible) return false; if (o.isScene) return true; o = o.parent; } return false; };
F.on && F.on('tick', (dt, t) => {
  if (!live.size) return;
  for (const g of live) {
    if (!g.parent) { if (g.userData._seen || (g.userData._orph = (g.userData._orph || 0) + 1) > 300) live.delete(g); continue; }
    if (!onStage(g)) continue;
    g.userData._seen = true;
    if (g.userData.bubbleShell) { g.userData.bubbleT += dt; if (g.userData.bubbleT > 0.8) { popBubble(g); } }
    let any = false;
    for (const c of g.children) if (c.userData && c.userData.tw) { any = true; const k = Math.max(0, Math.sin(t * 2.2 + c.userData.ph)); c.scale.setScalar(0.0001 + c.userData.s * k * k); }
    if (!any && !g.userData.bubbleShell) live.delete(g);
  }
});
F.VOX = {
  fractional: FRAC,
  defs, FONT,
  def(id, d) { if (defs[id]) console.warn('VOX.def duplicate', id); defs[id] = Object.assign({ scale: 1 / 16 }, d, { id }); return defs[id]; },
  has: id => !!defs[id],
  grid,
  // geometry for (id, options) – cached by id + JSON(options). Style transforms (flower blossoms) are applied to the grid.
  geometry(id, o) {
    const def = defs[id]; if (!def) throw new Error('VOX unknown model ' + id);
    o = resolveVariant(id, o || {});
    const key = id + '|' + JSON.stringify(o);
    let e = cache.get(key);
    if (!e) {
      const s = def.scale; BUILDING = id;
      const { v, pad } = buildGrid(def, o);
      const [sx, , sz] = v.size;
      const ox = sx / 2, oy = 0, oz = sz / 2;
      e = { body: mesh(v, s, ox, oy, oz, o.style), parts: {}, size: v.size, scale: s };
      for (const pn in (def.parts || {})) {
        const p = def.parts[pn];
        const pv = buildGrid({ size: def.size, build: p.build, id: id + '.' + pn }, o, true).v;
        const [px, py, pz] = p.pivot ? [p.pivot[0] + pad, p.pivot[1], p.pivot[2] + pad] : [ox, 0, oz];
        e.parts[pn] = { geo: mesh(pv, s, px, py, pz, o.style), pos: [(px - ox) * s, (py - oy) * s, (pz - oz) * s] };
      }
      // twinkle points for crystal/star styles (surface voxels, deterministic)
      if (o.style === 'crystal' || o.style === 'star') {
        const pts = surfacePoints(v, s, ox, oz); const n = o.style === 'crystal' ? 6 : 4; const r = F.U.rng(F.U.hashStr(key));
        e.twinkles = pts.length ? Array.from({ length: n }, () => pts[Math.floor(r() * pts.length)]) : [];
      }
      if (o.style === 'bubble' || o.style === 'star') { const bb = new THREE.Box3(); ['opaque', 'glass', 'glow'].forEach(c => { if (e.body[c]) bb.union(e.body[c].boundingBox); }); e.bbox = bb; }
      cache.set(key, e); BUILDING = null;
    }
    return e;
  },
  // THREE.Group with body + animated part pivots (obj.userData.parts[name]); styles add twinkles / bubble shell / star halo
  make(id, o) {
    o = resolveVariant(id, o || {});
    const e = F.VOX.geometry(id, o);
    const g = new THREE.Group(); g.name = id;
    addMeshes(g, e.body, o.style);
    g.userData.parts = {};
    for (const pn in e.parts) {
      const piv = new THREE.Group(); piv.position.set(...e.parts[pn].pos); piv.name = pn;
      addMeshes(piv, e.parts[pn].geo, o.style);
      g.add(piv); g.userData.parts[pn] = piv;
    }
    if (o.style) decorate(g, e, o);
    return g;
  },
  // all voxel centres of a model in local metres (for cube-by-cube assembly / morph effects); includes style blossoms
  points(id, o, max = 400) {
    const def = defs[id]; o = resolveVariant(id, o || {});
    const { v } = buildGrid(def, o); const [sx, sy, sz] = v.size, s = def.scale;
    const pts = [];
    for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const k = v.data[x + sx * (y + sy * z)]; if (k) { const c = palCol[k].clone(); if (o.style === 'crystal') c.lerp(CRY, 0.35); else if (o.style === 'star') c.lerp(BUT, 0.2); pts.push([(x + 0.5 - sx / 2) * s, (y + 0.5) * s, (z + 0.5 - sz / 2) * s, c.getHex()]); } }
    if (pts.length > max) { const step = pts.length / max; return Array.from({ length: max }, (_, i) => pts[Math.floor(i * step)]); }
    return pts;
  },
  // meta.variants {key:[values…]} → every combination as an options object (gallery / random variety). make(id,{variant:i}) picks one.
  variants(id) {
    const def = defs[id]; const vs = def && def.meta && def.meta.variants; if (!vs) return [{}];
    let out = [{}];
    for (const k in vs) { const nx = []; out.forEach(o => vs[k].forEach(val => nx.push(Object.assign({}, o, { [k]: val })))); out = nx; }
    return out;
  },
  STYLES: ['crystal', 'flower', 'bubble', 'star'],
  // bounding box of a made model, ignoring sprites (twinkles/halo) – use for fitting and thumbnails
  bbox(obj) {
    const box = new THREE.Box3(), b = new THREE.Box3();
    obj.updateMatrixWorld(true);
    obj.traverse(o => { if (o.isMesh && !o.userData.isSil && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(b); } });
    if (box.isEmpty()) box.setFromObject(obj);
    return box;
  },
  material, GLASS, GLOW,
  colorIndex: ci,
};
// default glass/glow colours
[0xcfefff, 0x9fe8ff].forEach(h => GLASS.add(h));      // F.PAL.glass, F.PAL.crystal
[0xfff4a0, 0xffe066, 0xfff6b0].forEach(h => GLOW.add(h));   // F.PAL.flame, lamp, glowYellow
})();
/* Thumbnails: real rendered voxel models as images for HTML panels (tasks, shop, spell book). No emoji anywhere.
   F.Thumb.url(modelId, opts={}, {size=160, angle=0.5, bg=null}) -> dataURL (cached)
   F.Thumb.img(modelId, opts, o) -> <img> element */
(function () {
'use strict';
const F = window.F;
let r = null, scene = null, cam = null;
const cache = new Map();
function init() {
  r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x9bbf86, 0.75));
  const d = new THREE.DirectionalLight(0xfff0d8, 0.75); d.position.set(3, 6, 5); scene.add(d);
  cam = new THREE.PerspectiveCamera(28, 1, 0.01, 200);
}
F.Thumb = {
  url(id, opts, o) {
    o = o || {}; opts = opts || {};
    const size = o.size || 160, angle = o.angle != null ? o.angle : 0.5;
    const key = id + '|' + JSON.stringify(opts) + '|' + size + '|' + angle;
    if (cache.has(key)) return cache.get(key);
    if (!F.VOX.has(id)) return '';
    if (!r) init();
    r.setSize(size, size);
    const obj = F.VOX.make(id, opts); scene.add(obj);
    const box = F.VOX.bbox(obj), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const R = Math.max(Math.max(sz.x, sz.y * 1.1, sz.z) * 1.75, sz.length() * 0.5 * 3.3) + 0.02;   // MODELS-2: bounding-sphere fit so chunky models are not cropped
    cam.position.set(c.x + Math.sin(angle) * R, c.y + R * 0.45, c.z + Math.cos(angle) * R); cam.lookAt(c);
    r.setClearColor(o.bg != null ? o.bg : 0x000000, o.bg != null ? 1 : 0);
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    scene.remove(obj);
    cache.set(key, url);
    return url;
  },
  img(id, opts, o) { const im = new Image(); im.src = F.Thumb.url(id, opts, o); im.className = 'thumb'; im.draggable = false; im.alt = ''; return im; },
};
})();

window.F.VOX.thumb = (id, o, px) => window.F.Thumb.url(id, o, { size: px || 128 });
