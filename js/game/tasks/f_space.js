/* Feslottet – WP-G space formats (DESIGN5 §1 WP-G, DESIGN4 §4.3, SYNTHESIS §2.4 FORM + §3.2 F60/F65). Owner: WP-G.
   Speech: js/speech/lines_space.js.  Part 1 (pure JS, no THREE/DOM – runs in Node: tests/v4_wpg.js) is the FORM generator, registered
   with F.BANKS.reg('FORM', …) (ladders.js; queued on F.REGQ when the registry is not there yet). Part 2 (browser only) = the formats.

   F.SPACE.gen('FORM', rung, sup, rng, o) -> item | null      o = {format, sub (kind), key (Leitner key 'FORM:<rung>:<kind>…'), avoid}
   Every item fills the DESIGN4 §2.9 contract: strand, rung, sup, key, target (= answer), choices null, distractors [{v, tag}], params,
   g, mode, think, secret [], format.  params.kind says which shape it is:
     'hunt'   G1  (F65 Figurjakten) 10–14 shapes in castle windows / on the baker's stall – typical AND atypical members (turned, skinny,
                  obtuse, diamond squares, long thin rectangles) among near-shapes (oval, half circle, arch, a triangle with one round side,
                  pentagon, rhombus …). Step 1: tap ALL of one kind + Ferdig (subset, g = 1/(2^n−1)). Step 2: keypad – how many of
                  {the same kind (s0) | a second kind (s1/s2)}. mode 'twostep'.   params {surface, cls, shapes:[{kind, pts|rx,ry|r, rot, s, col,
                  atyp}], count2:{cls, n}}  target = indices of cls (sorted)
     'place'  G4  (F60) coloured cubes on a 3×3 plate; «Legg den røde klossen oppå / foran / bak / til venstre for / til høyre for den blå.»
                  1 instruction at s0, 2 at s1/s2 (s2 may chain: the 2nd refers to the 1st new cube); she taps a palette cube, then a
                  column (gravity). Solver-checked: exactly ONE final placement satisfies every instruction.  g = 1/#placements.
                  params {base:[3,3], given:[{c,x,y,z}], add:[c…], instr:[{c, rel, ref}]}   target = [{c,x,y,z}…] (instruction order)
     'row'    G4  (F60, s2) «Sett tre klosser ved siden av hverandre. Legg én kloss oppå den til høyre.» – build it (any row, any x
                  offset; left/right from her view).   params {base:[4,2], k, top:'venstre'|'hoyre'|'midten'}   target = row heights
     'count'  G5  (F60) a cube building on a plate; «Hvor mange klosser er det?» keypad; ⟲ ⟳ turn it 90°. s0: every cube visible;
                  s1: one cube hidden from the front (visible after a turn); s2: 1–2 hidden (visible after a turn or holding up another).
                  params {base:[W,D], heights, fam, hidden, visible, tops}   target = total cubes.  Tags: VISIBLE-ONLY, TOP-ONLY, NEAR
     'copy'   G6  (F60) «Bygg samme tårn» – a model (≤ 10 cubes) beside her empty 3×3 plate; tap a cell to add a cube. Any turn and
                  offset of the same building counts (never a mirror image – tag MIRROR). s2 shows the model turned («sett fra andre
                  siden»).   params {base:[W,D] (model), heights, plate:[3,3], maxH, view:0–3, fam}   target = model heights
   Self-test: F.SPACE.selfTest(n) recomputes every answer independently (shape classes from the geometry, counts from heights,
   visibility, placement uniqueness by enumeration, copy canonical forms). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

/* =====================================================================================================================
   PART 1 – the FORM generator (pure)
   ===================================================================================================================== */
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const sum = a => a.reduce((s, x) => s + (+x || 0), 0);
const RUNGS = { FORM: [1, 4, 5, 6] };
const KINDS = { 1: ['hunt'], 4: ['place', 'row', 'feil'], 5: ['count'], 6: ['copy'] };
const FORMAT_OF = { hunt: 'F65', place: 'F60', row: 'F60', feil: 'F60', count: 'F60', copy: 'F60' };
function item(rung, sup, f) {
  const it = Object.assign({ strand: 'FORM', rung, sup, choices: null, distractors: [], secret: [], think: rung === 1 ? 'KLASSIFISERE' : 'ROM', word: null, text: null, say: null }, f);
  if (it.answer === undefined) it.answer = it.target;
  if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
  it.params = it.params || {};
  it.g = Math.max(0.0001, Math.min(1, it.g == null ? 0.01 : it.g));
  it.format = FORMAT_OF[it.params.kind];
  return it;
}

/* ---------------------------------------------------------------- G1 shapes: geometry + classification from the geometry */
// a shape: {kind:'poly', pts:[[x,y]…]} | {kind:'ell', rx, ry} | {kind:'semi', r} | {kind:'arch', w, h} (rectangle + half circle top)
//          | {kind:'curvy', pts, edge} (polygon whose edge `edge` bulges out as an arc) ; + rot (radians), s (size 0–1), col, atyp
const rotP = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
function center(pts) { const n = pts.length; const c = pts.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]); return pts.map(p => [p[0] - c[0], p[1] - c[1]]); }
function fit(pts) {   // scale so the shape spans 1 in its larger extent (before rotation)
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const k = 1 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6);
  return center(pts.map(p => [p[0] * k, p[1] * k]));
}
const r3 = x => Math.round(x * 1000) / 1000;
const rnd3 = pts => pts.map(p => [r3(p[0]), r3(p[1])]);
// classification from geometry (independent of how the generator labelled it)
function geoClass(sh) {
  if (sh.kind === 'ell') return Math.abs(sh.rx - sh.ry) < 1e-6 ? 'sirkel' : 'oval';
  if (sh.kind === 'semi') return 'halvsirkel';
  if (sh.kind === 'arch') return 'bue';
  if (sh.kind === 'curvy') return 'buet';
  if (sh.kind !== 'poly') return 'annet';
  const p = sh.pts, n = p.length;
  if (n === 3) return 'trekant';
  if (n === 5) return 'femkant';
  if (n === 6) return 'sekskant';
  if (n !== 4) return 'annet';
  const L = [], right = [];
  for (let i = 0; i < 4; i++) {
    const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
    L.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
    const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
    right.push(Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)) < 0.02);
  }
  const eq = Math.max(...L) - Math.min(...L) < 0.02 * Math.max(...L);
  if (right.every(Boolean)) return eq ? 'kvadrat' : 'rektangel';
  return 'firkant';
}
// which geometric classes belong to an asked class (a square is never shown in a «rektangel» hunt – see gen)
const MEMBER = { trekant: ['trekant'], firkant: ['kvadrat', 'rektangel', 'firkant'], sirkel: ['sirkel'], kvadrat: ['kvadrat'], rektangel: ['rektangel'] };
const inCls = (cls, g) => (MEMBER[cls] || []).includes(g);
// shape makers (unit size, centred)
const TRI = {
  likesidet: () => fit([[0, 0.866], [-0.5, 0], [0.5, 0]]),
  spiss: r => { const h = 1, w = 0.32 + r() * 0.12; return fit([[0, h], [-w / 2, 0], [w / 2, 0]]); },              // tall & skinny
  rett: r => { const w = 0.6 + r() * 0.4; return fit([[0, 0], [w, 0], [0, 1]]); },                                       // right angle
  stump: r => { const t = 0.8 + r() * 0.2; return fit([[0, 0], [1, 0], [t + 0.3, 0.48]]); },                         // obtuse, lying
  skjev: r => fit([[0, 0], [1, 0], [0.15 + r() * 0.2, 0.7 + r() * 0.2]]),
};
const QUAD = {
  kvadrat: () => fit([[0, 0], [1, 0], [1, 1], [0, 1]]),
  rektangel: r => { const a = 1.5 + r() * 0.5; return fit([[0, 0], [a, 0], [a, 1], [0, 1]]); },
  lang: r => { const a = 2.4 + r() * 0.6; return fit([[0, 0], [a, 0], [a, 1], [0, 1]]); },                                  // long thin
  trapes: r => { const t = 0.2 + r() * 0.15; return fit([[0, 0], [1, 0], [1 - t, 0.6], [t, 0.6]]); },
  skjev: r => { const t = 0.3 + r() * 0.2; return fit([[0, 0], [1, 0], [1 + t, 0.8], [t, 0.8]]); },                         // parallelogram
  rombe: r => { const a = 0.65 + r() * 0.1; return fit([[0, -a], [0.5, 0], [0, a], [-0.5, 0]]); },                          // rhombus (no right angles)
  drage: r => fit([[0, 0.9], [-0.4, 0.25], [0, -0.6], [0.4, 0.25]]),
  nesten: r => { const a = 1.18 + r() * 0.12; return fit([[0, 0], [a, 0], [a, 1], [0, 1]]); },                               // almost square (rectangle)
};
const regular = (n, a0) => fit(Array.from({ length: n }, (_, i) => [Math.cos(a0 + i * 2 * Math.PI / n), Math.sin(a0 + i * 2 * Math.PI / n)]));
const COLS = ['sky', 'mint', 'butter', 'peach', 'lilac', 'pink', 'coral', 'crystal', 'lavender'];
// one shape of a geometric class: {sh, atyp}
function makeShape(r, g, sup, wantAtyp) {
  const rot0 = r() < 0.5 ? 0 : (r() < 0.5 ? Math.PI : Math.PI / 2);
  let sh, atyp = false;
  switch (g) {
    case 'trekant': {
      const k = wantAtyp ? pick(r, ['spiss', 'rett', 'stump', 'skjev']) : (sup === 0 ? 'likesidet' : pick(r, ['likesidet', 'likesidet', 'rett']));
      const turn = wantAtyp && (k === 'likesidet' || r() < 0.6);
      sh = { kind: 'poly', pts: TRI[k](r), rot: turn ? pick(r, [Math.PI, Math.PI / 2, -Math.PI / 2, 0.6, -0.7, 2.4]) : 0 };
      atyp = wantAtyp; break;
    }
    case 'kvadrat': { sh = { kind: 'poly', pts: QUAD.kvadrat(r), rot: wantAtyp ? Math.PI / 4 : (r() < 0.3 ? 0.25 : 0) }; atyp = wantAtyp; break; }
    case 'rektangel': case 'nesten': {
      // 'nesten' = an almost-square rectangle (the lure in a s2 «kvadrat» hunt: are all four sides equally long?)
      const k = g === 'nesten' ? 'nesten' : wantAtyp ? 'lang' : pick(r, ['rektangel', 'rektangel', 'lang']);
      sh = { kind: 'poly', pts: QUAD[k](r), rot: wantAtyp ? pick(r, [Math.PI / 2, 0.5, -0.6]) : (r() < 0.3 ? Math.PI / 2 : 0) }; atyp = wantAtyp || k === 'lang'; break;
    }
    case 'firkant': {   // a quadrilateral that is neither a square nor a rectangle
      const k = pick(r, ['trapes', 'skjev', 'rombe', 'drage']);
      sh = { kind: 'poly', pts: QUAD[k](r), rot: r() < 0.4 ? pick(r, [0.4, -0.5, Math.PI]) : 0 }; atyp = true; break;
    }
    case 'sirkel': { const s0 = 0.66 + r() * 0.34; sh = { kind: 'ell', rx: 0.5, ry: 0.5, rot: 0, sz: s0 }; atyp = false; break; }
    case 'oval': { sh = { kind: 'ell', rx: 0.5, ry: r3(0.3 + r() * 0.08), rot: pick(r, [0, Math.PI / 2, 0.5]) }; break; }
    case 'halvsirkel': { sh = { kind: 'semi', r: 0.5, rot: pick(r, [0, Math.PI, Math.PI / 2]) }; break; }
    case 'bue': { sh = { kind: 'arch', w: 0.6, h: 1, rot: 0 }; break; }
    case 'buet': {   // a triangle (or square) with one round side – not a triangle
      const base = r() < 0.65 ? TRI.likesidet(r) : QUAD.kvadrat(r);
      sh = { kind: 'curvy', pts: base, edge: int(r, 0, base.length - 1), rot: pick(r, [0, Math.PI, 0.5]) }; break;
    }
    case 'femkant': { sh = { kind: 'poly', pts: regular(5, Math.PI / 2), rot: pick(r, [0, Math.PI]) }; break; }
    case 'sekskant': { sh = { kind: 'poly', pts: regular(6, 0), rot: pick(r, [0, Math.PI / 6]) }; break; }
    default: return null;
  }
  sh.pts && (sh.pts = rnd3(sh.pts));
  sh.rot = r3(sh.rot || 0);
  sh.s = r3(sh.sz || (0.74 + r() * 0.26)); delete sh.sz;
  sh.col = pick(r, COLS);
  sh.atyp = !!atyp;
  return sh;
}
// near-shapes (look-alikes) and other shapes per asked class
const NEAR = { trekant: ['buet', 'firkant', 'halvsirkel'], firkant: ['bue', 'femkant', 'buet', 'trekant'], sirkel: ['oval', 'halvsirkel', 'sekskant'],
  kvadrat: ['rektangel', 'firkant', 'rektangel'], rektangel: ['firkant', 'firkant', 'bue'] };
const OTHER = { trekant: ['sirkel', 'kvadrat', 'rektangel', 'femkant'], firkant: ['sirkel', 'trekant', 'sekskant', 'oval'], sirkel: ['trekant', 'kvadrat', 'rektangel', 'femkant'],
  kvadrat: ['sirkel', 'trekant', 'femkant', 'oval'], rektangel: ['sirkel', 'trekant', 'sekskant', 'oval'] };
const HUNT_CLS = { 0: ['trekant', 'firkant', 'sirkel'], 1: ['trekant', 'firkant', 'sirkel', 'kvadrat'], 2: ['trekant', 'firkant', 'sirkel', 'kvadrat', 'rektangel'] };
// the geometric class that makes a shape a member of cls (for generating members)
const MEM_GEO = { trekant: ['trekant'], firkant: ['kvadrat', 'rektangel', 'firkant'], sirkel: ['sirkel'], kvadrat: ['kvadrat'], rektangel: ['rektangel'] };
function genHunt(sup, r, o) {
  const keyCls = o.key && /^FORM:1:hunt:(\w+)/.exec(o.key);
  const cls = keyCls && HUNT_CLS[2].includes(keyCls[1]) ? keyCls[1] : pick(r, HUNT_CLS[Math.min(2, sup)]);
  const n = sup === 0 ? 10 : sup === 1 ? 12 : 14;
  const nMem = sup === 0 ? int(r, 3, 4) : sup === 1 ? int(r, 4, 5) : int(r, 4, 6);
  const nAtyp = sup === 0 ? (cls === 'firkant' ? 1 : 0) : sup === 1 ? 1 : 2;
  const nNear = sup === 0 ? 1 : sup === 1 ? 2 : 3;
  const shapes = [];
  for (let i = 0; i < nMem; i++) {
    const g = cls === 'firkant' ? (i === 0 ? 'kvadrat' : i === 1 ? 'rektangel' : (i < 2 + nAtyp ? 'firkant' : pick(r, ['kvadrat', 'rektangel', 'firkant']))) : MEM_GEO[cls][0];
    shapes.push(makeShape(r, g, sup, cls !== 'firkant' && i < nAtyp && cls !== 'sirkel'));
  }
  for (let i = 0; i < nNear; i++) shapes.push(makeShape(r, cls === 'kvadrat' && sup === 2 && i === 0 ? 'nesten' : NEAR[cls][i % NEAR[cls].length], sup, false));
  while (shapes.length < n) {
    let g = pick(r, OTHER[cls]);
    if (cls === 'rektangel' && g === 'kvadrat') g = 'sirkel';
    shapes.push(makeShape(r, g, sup, r() < 0.4));
  }
  // a «rektangel» hunt never shows a square (a square is a special rectangle – that question is not band A)
  if (cls === 'rektangel' && shapes.some(s => geoClass(s) === 'kvadrat')) return null;
  const sh = shuffle(r, shapes);
  const target = sh.map((s, i) => inCls(cls, geoClass(s)) ? i : -1).filter(i => i >= 0);
  // step 2: count the same kind (s0, her found ones stay lit) or a second kind she has not tapped (s1/s2)
  let c2 = cls;
  if (sup >= 1) {
    const opts = HUNT_CLS[2].filter(c => c !== cls && !(cls === 'firkant' && (c === 'kvadrat' || c === 'rektangel')) && !(c === 'firkant' && (cls === 'kvadrat' || cls === 'rektangel')))
      .filter(c => !(cls === 'rektangel' && c === 'kvadrat') && !(c === 'rektangel' && sh.some(s => geoClass(s) === 'kvadrat')))
      .filter(c => { const k = sh.filter(s => inCls(c, geoClass(s))).length; return k >= 2 && k <= 6; });
    if (!opts.length) return null;
    c2 = pick(r, opts);
  }
  const n2 = sh.filter(s => inCls(c2, geoClass(s))).length;
  const surface = o.surface || pick(r, ['slott', 'slott', 'marked']);
  const nT = target.length;
  // misconception distractors: the near-shapes (NEAR-SHAPE), the atypical members left out (PROTOTYPE)
  const dis = [];
  const nearIdx = sh.map((s, i) => (!inCls(cls, geoClass(s)) && NEAR[cls].includes(geoClass(s))) ? i : -1).filter(i => i >= 0);
  if (nearIdx.length) dis.push({ v: target.concat([nearIdx[0]]).sort((a, b) => a - b), tag: 'NEAR-SHAPE' });
  const typ = target.filter(i => !sh[i].atyp);
  if (typ.length && typ.length < nT) dis.push({ v: typ, tag: 'PROTOTYPE' });
  dis.push({ v: n2 + 1, tag: 'NEAR' });
  return item(1, sup, {
    key: 'FORM:1:hunt:' + cls, target, answer: target,
    params: { kind: 'hunt', cls, surface, shapes: sh, count2: { cls: c2, n: n2, same: c2 === cls } },
    distractors: dis, mode: 'twostep', g: (1 / (Math.pow(2, n) - 1)) * 0.01, think: 'KLASSIFISERE', secret: [],
  });
}

/* ---------------------------------------------------------------- voxel helpers (heights row-major: i = y·W + x, y = 0 back row) */
const H = (h, W, D, x, y) => (x < 0 || y < 0 || x >= W || y >= D) ? 0 : (+h[y * W + x] || 0);
// a cube (x, y, z) is visible from the front-above view (≈45°): its top face, or its front face, not blocked by columns in front
function visFront(h, W, D, x, y, z) {
  const top = H(h, W, D, x, y) === z + 1;
  let topVis = top;
  for (let k = 1; topVis && y + k < D; k++) if (H(h, W, D, x, y + k) >= z + 1 + k) topVis = false;
  let frontVis = H(h, W, D, x, y + 1) <= z;
  for (let k = 2; frontVis && y + k < D; k++) if (H(h, W, D, x, y + k) >= z + k) frontVis = false;
  return topVis || frontVis;
}
// turn a heights grid a quarter (her view after ⟳): (x, y) → (D−1−y, x), new W = D, D = W
function rotGrid(h, W, D) { const o = new Array(W * D).fill(0); for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) o[x * D + (D - 1 - y)] = H(h, W, D, x, y); return { h: o, W: D, D: W }; }
function visCount(h, W, D) { let n = 0; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) for (let z = 0; z < H(h, W, D, x, y); z++) if (visFront(h, W, D, x, y, z)) n++; return n; }
// cubes hidden in the default view; for each: visible after some quarter turn? holding up a cube above it?
function hiddenInfo(h, W, D) {
  const out = [];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) for (let z = 0; z < H(h, W, D, x, y); z++) {
    if (visFront(h, W, D, x, y, z)) continue;
    let g = { h, W, D }, px = x, py = y, seen = false;
    for (let t = 1; t < 4 && !seen; t++) { const nx = g.D - 1 - py, ny = px; g = rotGrid(g.h, g.W, g.D); px = nx; py = ny; if (visFront(g.h, g.W, g.D, px, py, z)) seen = true; }
    out.push({ x, y, z, seen, holds: H(h, W, D, x, y) > z + 1 });
  }
  return out;
}
// canonical form of a building up to offset (and quarter turns / mirror): sorted list of x,y,h after moving to the origin
function canon(h, W, D) {
  const c = []; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (H(h, W, D, x, y)) c.push([x, y, H(h, W, D, x, y)]);
  if (!c.length) return '';
  const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1]));
  return c.map(p => [p[0] - mx, p[1] - my, p[2]]).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(p => p.join(':')).join(',');
}
function turns(h, W, D) { const out = [{ h, W, D }]; let g = { h, W, D }; for (let t = 1; t < 4; t++) { g = rotGrid(g.h, g.W, g.D); out.push(g); } return out; }
function mirror(h, W, D) { const o = new Array(W * D).fill(0); for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) o[y * W + (W - 1 - x)] = H(h, W, D, x, y); return o; }
const sameBuilding = (a, aW, aD, b, bW, bD) => { const cb = canon(b, bW, bD); return !!cb && turns(a, aW, aD).some(g => canon(g.h, g.W, g.D) === cb); };
const isMirror = (a, aW, aD, b, bW, bD) => !sameBuilding(a, aW, aD, b, bW, bD) && sameBuilding(mirror(a, aW, aD), aW, aD, b, bW, bD);

/* ---------------------------------------------------------------- G5 count */
const FAMS5 = {
  // fixed families from SYNTHESIS (trapp 1+2+3(+4), L in 2 layers, wall, pyramid) + free buildings
  trapp3: () => ({ W: 3, D: 1, h: [1, 2, 3] }), trapp4: () => ({ W: 4, D: 1, h: [1, 2, 3, 4] }),
  trappDyp: () => ({ W: 3, D: 2, h: [1, 2, 3, 1, 2, 3] }),
  mur: r => { const W = int(r, 3, 4); return { W, D: 1, h: new Array(W).fill(2) }; },
  L2: () => ({ W: 3, D: 2, h: [2, 0, 0, 2, 2, 2] }), L2b: () => ({ W: 2, D: 3, h: [2, 2, 2, 0, 2, 0] }),
  pyr: () => ({ W: 2, D: 2, h: [2, 1, 1, 1] }), pyr3: () => ({ W: 3, D: 3, h: [1, 1, 1, 1, 2, 1, 1, 1, 1] }),
  fri: (r, sup) => {
    const W = sup === 0 ? int(r, 2, 3) : 3, D = sup === 0 ? int(r, 1, 2) : int(r, 2, 3), mh = sup === 0 ? 3 : 4;
    const h = []; for (let i = 0; i < W * D; i++) h.push(r() < 0.18 ? 0 : int(r, 1, mh));
    return { W, D, h };
  },
};
function genCount(sup, r, o) {
  const want = sup === 0 ? [4, 7] : sup === 1 ? [6, 10] : [8, 13];
  const fams = sup === 0 ? ['trapp3', 'mur', 'pyr', 'fri', 'fri'] : sup === 1 ? ['trappDyp', 'L2', 'pyr', 'fri', 'fri', 'trapp4'] : ['trappDyp', 'L2', 'pyr3', 'fri', 'fri', 'fri'];
  const keyF = o.key && /^FORM:5:count:(\w+)/.exec(o.key);
  for (let t = 0; t < 200; t++) {
    const fam = keyF && FAMS5[keyF[1]] && t < 60 ? keyF[1] : pick(r, fams);
    let { W, D, h } = FAMS5[fam](r, sup);
    // a random quarter turn of the fixed families (variety; the front view is what she sees first)
    if (fam !== 'fri' && r() < 0.5) { const g = rotGrid(h, W, D); if (g.W <= 4 && g.D <= 3) ({ W, D, h } = g); }
    const tot = sum(h); if (tot < want[0] || tot > want[1]) continue;
    if (h.every(x => !x)) continue;
    const hid = hiddenInfo(h, W, D), nh = hid.length;
    if (sup === 0 && nh !== 0) continue;
    if (sup === 1 && !(nh === 1 && hid[0].seen)) continue;
    if (sup === 2 && !(nh >= 1 && nh <= 2 && hid.every(c => c.seen || c.holds))) continue;
    const vis = tot - nh, tops = h.filter(Boolean).length;
    const dis = [];
    if (vis !== tot) dis.push({ v: vis, tag: 'VISIBLE-ONLY' });
    if (tops !== tot && tops !== vis) dis.push({ v: tops, tag: 'TOP-ONLY' });
    dis.push({ v: tot + 1, tag: 'NEAR' }, { v: tot - 1, tag: 'NEAR' });
    return item(5, sup, { key: 'FORM:5:count:' + fam, target: tot, params: { kind: 'count', base: [W, D], heights: h.slice(), fam, hidden: nh, visible: vis, tops, maxH: Math.max(...h) },
      distractors: dis, mode: 'keypad', g: 0.01, think: 'ROM', secret: [] });
  }
  return null;
}

/* ---------------------------------------------------------------- G6 copy */
const FAMS6 = {
  tarn: r => ({ W: 1, D: 1, h: [int(r, 3, 5)] }),
  rad: r => { const W = int(r, 2, 3); return { W, D: 1, h: Array.from({ length: W }, () => int(r, 1, 3)) }; },
  mur2: r => { const W = 3; return { W, D: 1, h: new Array(W).fill(2) }; },
  trapp: () => ({ W: 3, D: 1, h: [1, 2, 3] }),
  L: r => ({ W: 2, D: 2, h: r() < 0.5 ? [2, 0, 2, 2] : [1, 0, 3, 1] }),
  hjorne: r => ({ W: 3, D: 2, h: [int(r, 1, 3), 0, 0, int(r, 1, 2), int(r, 1, 2), int(r, 1, 3)] }),
  fri: (r, sup) => { const W = 3, D = sup === 2 ? int(r, 2, 3) : 2, mh = 3; const h = []; for (let i = 0; i < W * D; i++) h.push(r() < 0.3 ? 0 : int(r, 1, mh)); return { W, D, h }; },
};
function genCopy(sup, r, o) {
  const want = sup === 0 ? [3, 6] : sup === 1 ? [5, 8] : [7, 10];
  const fams = sup === 0 ? ['tarn', 'rad', 'rad', 'trapp'] : sup === 1 ? ['mur2', 'trapp', 'L', 'hjorne', 'fri'] : ['hjorne', 'fri', 'fri', 'L'];
  const keyF = o.key && /^FORM:6:copy:(\w+)/.exec(o.key);
  for (let t = 0; t < 200; t++) {
    const fam = keyF && FAMS6[keyF[1]] && t < 60 ? keyF[1] : pick(r, fams);
    const m = FAMS6[fam](r, sup);
    const tot = sum(m.h); if (tot < want[0] || tot > want[1]) continue;
    // trim empty border rows/columns, extents ≤ 3 (fits her 3×3 plate in any turn)
    const cs = []; for (let y = 0; y < m.D; y++) for (let x = 0; x < m.W; x++) if (H(m.h, m.W, m.D, x, y)) cs.push([x, y]);
    const x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1]));
    const W = x1 - x0 + 1, D = y1 - y0 + 1; if (W > 3 || D > 3) continue;
    const h = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) h.push(H(m.h, m.W, m.D, x, y));
    // the cubes of a 2-row model that hide behind the front: allowed at s2 only (she may turn the model)
    const nh = hiddenInfo(h, W, D).length;
    if (sup < 2 && nh) continue;
    const maxH = Math.max(...h); if (maxH > 5) continue;
    const view = sup === 2 ? pick(r, [1, 2, 3]) : 0;
    const mir = mirror(h, W, D), dis = [];
    if (!sameBuilding(h, W, D, mir, W, D)) dis.push({ v: mir, tag: 'MIRROR' });
    return item(6, sup, { key: 'FORM:6:copy:' + fam, target: h.slice(), params: { kind: 'copy', base: [W, D], heights: h.slice(), plate: [3, 3], maxH: Math.max(4, maxH), view, fam, total: tot, hidden: nh },
      distractors: dis, mode: 'build', g: 0.001, think: 'ROM', secret: [] });
  }
  return null;
}

/* ---------------------------------------------------------------- G4 place by position words */
const PCOL = ['rød', 'blå', 'gul', 'grønn'];
const REL = { oppaa: [0, 0, 1], foran: [0, 1, 0], bak: [0, -1, 0], venstre: [-1, 0, 0], hoyre: [1, 0, 0] };
const REL_IDS = Object.keys(REL);
// stacks: {'x,y': [colour bottom→top]} → positions
function posOf(stacks, c) { for (const k in stacks) { const i = stacks[k].indexOf(c); if (i >= 0) { const [x, y] = k.split(',').map(Number); return { x, y, z: i }; } } return null; }
function relHolds(stacks, ins) { const a = posOf(stacks, ins.c), b = posOf(stacks, ins.ref); if (!a || !b) return false; const d = REL[ins.rel]; return a.x === b.x + d[0] && a.y === b.y + d[1] && a.z === b.z + d[2]; }
const cloneSt = s => { const o = {}; for (const k in s) o[k] = s[k].slice(); return o; };
// every final placement of the new cubes (any order, gravity) → those that satisfy all instructions
function placements(W, D, given, add) {
  const base = {}; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) base[x + ',' + y] = [];
  given.slice().sort((a, b) => a.z - b.z).forEach(g => base[g.x + ',' + g.y].push(g.c));
  const out = new Map();
  const rec = (st, left) => {
    if (!left.length) { const sig = add.map(c => { const p = posOf(st, c); return c + '@' + p.x + ',' + p.y + ',' + p.z; }).join('|'); if (!out.has(sig)) out.set(sig, cloneSt(st)); return; }
    for (let i = 0; i < left.length; i++) for (const k in st) { if (st[k].length >= 4) continue; const s2 = cloneSt(st); s2[k].push(left[i]); rec(s2, left.slice(0, i).concat(left.slice(i + 1))); }
  };
  rec(base, add.slice());
  return [...out.values()];
}
function genPlace(sup, r, o) {
  const W = 3, D = 3;
  const nAdd = sup === 0 ? 1 : 2;
  const rels0 = sup === 0 ? ['oppaa', 'venstre', 'hoyre'] : REL_IDS;
  for (let t = 0; t < 300; t++) {
    const cols = shuffle(r, PCOL);
    const nGiven = sup === 0 ? int(r, 2, 3) : 2;
    if (nGiven + nAdd > 4) continue;
    const given = [];
    const used = new Set();
    for (let i = 0; i < nGiven; i++) {
      // ground cubes on distinct cells; at s2 sometimes one given cube stands on another
      if (sup === 2 && i === nGiven - 1 && given.length && r() < 0.4) { const b = pick(r, given.filter(g => g.z === 0)); given.push({ c: cols[i], x: b.x, y: b.y, z: 1 }); continue; }
      let x, y, k = 0; do { x = int(r, 0, W - 1); y = int(r, 0, D - 1); k++; } while (used.has(x + ',' + y) && k < 30);
      if (used.has(x + ',' + y)) break;
      used.add(x + ',' + y); given.push({ c: cols[i], x, y, z: 0 });
    }
    if (given.length !== nGiven) continue;
    const add = cols.slice(nGiven, nGiven + nAdd);
    // build the instructions from a planned final position (so a solution exists), then demand uniqueness
    const st = {}; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) st[x + ',' + y] = [];
    given.slice().sort((a, b) => a.z - b.z).forEach(g => st[g.x + ',' + g.y].push(g.c));
    const instr = []; let ok = true;
    for (let i = 0; i < nAdd && ok; i++) {
      const refs = given.map(g => g.c).concat(sup === 2 && i > 0 && r() < 0.6 ? [add[0]] : []);
      const ref = sup === 2 && i > 0 && refs.includes(add[0]) && r() < 0.7 ? add[0] : pick(r, refs.filter(c => c !== add[0] || i > 0));
      const rel = pick(r, rels0);
      const rp = posOf(st, ref); if (!rp) { ok = false; break; }
      const d = REL[rel], x = rp.x + d[0], y = rp.y + d[1], z = rp.z + d[2];
      if (x < 0 || y < 0 || x >= W || y >= D || z > 3) { ok = false; break; }
      if (st[x + ',' + y].length !== z) { ok = false; break; }      // gravity: it must land exactly at that level
      st[x + ',' + y].push(add[i]);
      instr.push({ c: add[i], rel, ref });
    }
    if (!ok) continue;
    const sols = placements(W, D, given, add).filter(s => instr.every(ins => relHolds(s, ins)));
    if (sols.length !== 1) continue;
    const target = add.map(c => Object.assign({ c }, posOf(sols[0], c)));
    const nPl = placements(W, D, given, add).length;
    // misconception: left/right swapped, front/back swapped
    const dis = [];
    const swap = { venstre: 'hoyre', hoyre: 'venstre', foran: 'bak', bak: 'foran' };
    const sw = instr.find(ins => swap[ins.rel]);
    if (sw) { const rp = posOf(sols[0], sw.ref), d = REL[swap[sw.rel]]; dis.push({ v: { c: sw.c, x: rp.x + d[0], y: rp.y + d[1], z: rp.z + d[2] }, tag: sw.rel === 'venstre' || sw.rel === 'hoyre' ? 'LEFT-RIGHT' : 'FRONT-BACK' }); }
    return item(4, sup, { key: 'FORM:4:place:' + nAdd, target, params: { kind: 'place', base: [W, D], given, add, instr },
      distractors: dis, mode: 'build', g: +(1 / nPl).toPrecision(3), think: 'ROM', secret: [] });
  }
  return null;
}
// «Finn feil ord»: Puff describes a coloured building in 3 sentences, one has a wrong position word (the opposite word – the
// misconception: left/right, front/back, on top/under swapped). Step 1 tap the wrong sentence (1/3), step 2 the right word (1/6).
const SAY_REL = { oppaa: [0, 0, 1], under: [0, 0, -1], foran: [0, 1, 0], bak: [0, -1, 0], venstre: [-1, 0, 0], hoyre: [1, 0, 0] };
const OPP = { oppaa: 'under', under: 'oppaa', foran: 'bak', bak: 'foran', venstre: 'hoyre', hoyre: 'venstre' };
const ORD_IDS = ['oppaa', 'under', 'foran', 'bak', 'venstre', 'hoyre'];
// true when a stands in relation rel to b – everyday reading: on top / under = directly; left/right = same row and level, anywhere to
// that side; in front / behind = same column and level, anywhere in front / behind (so a «wrong» sentence is wrong in every reading)
function sayTrue(cubes, s) {
  const a = cubes.find(c => c.c === s.a), b = cubes.find(c => c.c === s.b); if (!a || !b) return false;
  switch (s.rel) {
    case 'oppaa': return a.x === b.x && a.y === b.y && a.z === b.z + 1;
    case 'under': return a.x === b.x && a.y === b.y && a.z === b.z - 1;
    case 'venstre': return a.y === b.y && a.z === b.z && a.x < b.x;
    case 'hoyre': return a.y === b.y && a.z === b.z && a.x > b.x;
    case 'foran': return a.x === b.x && a.z === b.z && a.y > b.y;
    case 'bak': return a.x === b.x && a.z === b.z && a.y < b.y;
  }
  return false;
}
// adjacent pairs (the sentences Puff can say truly): a is rel of b, one step away
function adjSays(cubes) {
  const out = [];
  for (const a of cubes) for (const b of cubes) { if (a === b) continue; for (const rel of ORD_IDS) { const d = SAY_REL[rel]; if (a.x === b.x + d[0] && a.y === b.y + d[1] && a.z === b.z + d[2]) out.push({ a: a.c, rel, b: b.c }); } }
  return out;
}
function genFeil(sup, r) {
  for (let t = 0; t < 300; t++) {
    const cols = shuffle(r, PCOL), n = sup === 2 ? 4 : int(r, 3, 4);
    // a small building: start with one cube, every next cube touches the building (beside it, or on top at s2 / sometimes s1)
    const cubes = [{ c: cols[0], x: 1, y: 1, z: 0 }];
    for (let i = 1; i < n; i++) {
      const base = pick(r, cubes);
      const opts = ['venstre', 'hoyre', 'foran', 'bak'].concat(r() < (sup === 2 ? 0.5 : 0.25) ? ['oppaa'] : []);
      const rel = pick(r, opts), d = SAY_REL[rel];
      const q = { c: cols[i], x: base.x + d[0], y: base.y + d[1], z: base.z + d[2] };
      if (q.x < 0 || q.y < 0 || q.x > 2 || q.y > 2 || q.z > 2) { i--; if (t++ > 290) break; continue; }
      if (cubes.some(c => c.x === q.x && c.y === q.y && c.z === q.z)) { i--; if (t++ > 290) break; continue; }
      if (q.z > 0 && !cubes.some(c => c.x === q.x && c.y === q.y && c.z === q.z - 1)) { i--; if (t++ > 290) break; continue; }
      cubes.push(q);
    }
    if (cubes.length !== n) continue;
    const adj = shuffle(r, adjSays(cubes));
    // 2 true sentences about different pairs, 1 wrong: a true adjacent pair with the opposite word (never the same pair twice)
    const key = s2 => [s2.a, s2.b].sort().join('|');
    const wrongSrc = adj.find(s2 => s2.rel !== 'under' || sup === 2);
    if (!wrongSrc) continue;
    const trues = adj.filter(s2 => key(s2) !== key(wrongSrc));
    const tset = []; for (const s2 of trues) if (!tset.some(x => key(x) === key(s2))) tset.push(s2);
    if (tset.length < 2) continue;
    const wrong = { a: wrongSrc.a, rel: OPP[wrongSrc.rel], b: wrongSrc.b };
    if (sayTrue(cubes, wrong)) continue;
    const says = shuffle(r, [tset[0], tset[1], wrong]);
    const wi = says.indexOf(wrong);
    // every other word is wrong for that pair (the right word is unique)
    if (ORD_IDS.filter(rel => sayTrue(cubes, { a: wrong.a, rel, b: wrong.b })).length !== 1) continue;
    const tag = /venstre|hoyre/.test(wrongSrc.rel) ? 'LEFT-RIGHT' : /foran|bak/.test(wrongSrc.rel) ? 'FRONT-BACK' : 'ON-UNDER';
    return item(4, sup, { key: 'FORM:4:feil:' + wrongSrc.rel, target: wi, params: { kind: 'feil', base: [3, 3], cubes, says, wrong: wi, fix: wrongSrc.rel, tag },
      distractors: [{ v: (wi + 1) % 3, tag: 'TRUE-SENTENCE' }, { v: wrong.rel, tag }], mode: 'twostep', g: +(1 / 18).toPrecision(3), think: 'ROM', secret: [] });
  }
  return null;
}
// «Sett tre klosser ved siden av hverandre. Legg én kloss oppå den til høyre.»
function genRow(sup, r) {
  const k = pick(r, [3, 3, 4]);
  const top = k === 3 ? pick(r, ['venstre', 'hoyre', 'midten']) : pick(r, ['venstre', 'hoyre']);
  const h = new Array(k).fill(1);
  h[top === 'venstre' ? 0 : top === 'hoyre' ? k - 1 : 1] = 2;
  return item(4, sup, { key: 'FORM:4:row:' + k + top, target: h, params: { kind: 'row', base: [4, 2], k, top, row: h.slice() },
    distractors: [{ v: h.slice().reverse(), tag: 'LEFT-RIGHT' }], mode: 'build', g: 0.002, think: 'ROM', secret: [] });
}
// her row building on the 4×2 plate → equal to the asked row? (any back/front row, any x offset; never turned)
function rowOk(hts, W, D, row) {
  const cells = []; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (H(hts, W, D, x, y)) cells.push([x, y, H(hts, W, D, x, y)]);
  if (!cells.length || new Set(cells.map(c => c[1])).size !== 1) return false;
  cells.sort((a, b) => a[0] - b[0]);
  if (cells.length !== row.length) return false;
  return cells.every((c, i) => c[0] === cells[0][0] + i && c[2] === row[i]);
}

/* ---------------------------------------------------------------- dispatcher, checker, self-test */
function gen(strand, rung, sup, rng, o) {
  if (strand !== 'FORM') return null;
  o = o || {}; sup = sup == null ? 1 : Math.max(0, Math.min(2, +sup));
  const r = rng || Math.random;
  const keyKind = o.key && typeof o.key === 'string' ? (/^FORM:\d+:(\w+)/.exec(o.key) || [])[1] : null;
  let kind = o.sub && (KINDS[rung] || []).includes(o.sub) ? o.sub : keyKind && (KINDS[rung] || []).includes(keyKind) ? keyKind : null;
  if (o.format && FORMAT_OF[kind] && FORMAT_OF[kind] !== o.format) kind = null;
  if (!kind) { const u = r(); kind = rung === 4 ? (sup === 0 ? 'place' : sup === 1 ? (u < 0.3 ? 'feil' : 'place') : (u < 0.3 ? 'row' : u < 0.6 ? 'feil' : 'place')) : (KINDS[rung] || [])[0]; }
  if (!kind) return null;
  if (o.format && FORMAT_OF[kind] !== o.format) return null;
  let it = null;
  for (let t = 0; t < 6 && !it; t++) {
    it = kind === 'hunt' ? genHunt(sup, r, o) : kind === 'place' ? genPlace(sup, r, o) : kind === 'row' ? genRow(sup, r, o) : kind === 'feil' ? genFeil(sup, r, o) : kind === 'count' ? genCount(sup, r, o) : kind === 'copy' ? genCopy(sup, r, o) : null;
    if (it && Array.isArray(o.avoid) && o.avoid.includes(it.key) && t < 3 && kind !== 'row') it = null;
  }
  return it;
}
// independent recomputation of the answer (tests/v4_wpg.js); returns null when the item is right, else a reason
function check(it) {
  const p = it.params || {}, bad = m => 'FORM' + it.rung + ' s' + it.sup + ' ' + p.kind + ': ' + m;
  if (it.strand !== 'FORM' || !RUNGS.FORM.includes(it.rung)) return bad('strand/rung');
  switch (p.kind) {
    case 'hunt': {
      const g = p.shapes.map(geoClass);
      const want = g.map((c, i) => inCls(p.cls, c) ? i : -1).filter(i => i >= 0);
      if (JSON.stringify(want) !== JSON.stringify(it.target)) return bad('targets ' + want + ' vs ' + it.target);
      if (p.shapes.length < 10) return bad('fewer than 10 shapes');
      if (want.length < 3 || want.length === p.shapes.length) return bad('members ' + want.length);
      if (p.cls === 'rektangel' && g.includes('kvadrat')) return bad('square in a rectangle hunt');
      const n2 = g.filter(c => inCls(p.count2.cls, c)).length;
      if (n2 !== p.count2.n || n2 < 1) return bad('count2 ' + n2 + ' vs ' + p.count2.n);
      const atyp = want.filter(i => p.shapes[i].atyp).length;
      if (it.sup >= 1 && p.cls !== 'sirkel' && atyp < 1) return bad('no atypical member');
      if (!g.some((c, i) => !inCls(p.cls, c) && NEAR[p.cls].includes(c))) return bad('no near-shape');
      if (!(it.g > 0 && it.g < 0.01)) return bad('g ' + it.g);
      return null;
    }
    case 'count': {
      const [W, D] = p.base, h = p.heights;
      if (sum(h) !== it.target) return bad('total');
      const hid = hiddenInfo(h, W, D);
      if (hid.length !== p.hidden || sum(h) - visCount(h, W, D) !== hid.length) return bad('hidden');
      if (it.sup === 0 && hid.length) return bad('hidden at s0');
      if (hid.some(c => !c.seen && !c.holds)) return bad('a cube she can never see nor infer');
      return null;
    }
    case 'copy': {
      const [W, D] = p.base;
      if (sum(p.heights) !== sum(it.target) || sum(it.target) > 10) return bad('total');
      if (!sameBuilding(p.heights, W, D, it.target, W, D)) return bad('target');
      // her 3×3 plate fits every quarter turn
      if (W > 3 || D > 3) return bad('extent');
      const mir = mirror(p.heights, W, D);
      const dm = it.distractors.find(d => d.tag === 'MIRROR');
      if (dm && sameBuilding(p.heights, W, D, mir, W, D)) return bad('mirror distractor equals the model');
      return null;
    }
    case 'place': {
      const [W, D] = p.base;
      const sols = placements(W, D, p.given, p.add).filter(s => p.instr.every(ins => relHolds(s, ins)));
      if (sols.length !== 1) return bad('solutions ' + sols.length);
      const t = p.add.map(c => Object.assign({ c }, posOf(sols[0], c)));
      if (JSON.stringify(t) !== JSON.stringify(it.target)) return bad('target');
      if (new Set(p.given.map(g => g.c).concat(p.add)).size !== p.given.length + p.add.length) return bad('colours not unique');
      return null;
    }
    case 'feil': {
      const tr = p.says.map(x => sayTrue(p.cubes, x));
      if (tr.filter(x => !x).length !== 1 || tr.indexOf(false) !== it.target) return bad('wrong sentence ' + tr);
      const w = p.says[it.target];
      const ok = ORD_IDS.filter(rel => sayTrue(p.cubes, { a: w.a, rel, b: w.b }));
      if (ok.length !== 1 || ok[0] !== p.fix) return bad('fix ' + ok);
      if (new Set(p.says.map(x => [x.a, x.b].sort().join())).size !== 3) return bad('same pair twice');
      for (const c of p.cubes) if (c.z > 0 && !p.cubes.some(q => q.x === c.x && q.y === c.y && q.z === c.z - 1)) return bad('floating cube');
      return null;
    }
    case 'row': {
      const h = new Array(8).fill(0); it.target.forEach((x, i) => { h[4 + i] = x; });
      if (!rowOk(h, 4, 2, it.target)) return bad('row');
      const top = it.target.indexOf(2);
      if (it.target.filter(x => x === 2).length !== 1 || (p.top === 'venstre' && top !== 0) || (p.top === 'hoyre' && top !== p.k - 1) || (p.top === 'midten' && top !== 1)) return bad('top');
      return null;
    }
  }
  return bad('unknown kind');
}
function selfTest(N, seed) {
  N = N || 300; let s = (seed || 4242) >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = { n: 0, bad: [], nulls: 0, per: {}, g: {}, kinds: {} };
  for (const rung of RUNGS.FORM) for (let sup = 0; sup <= 2; sup++) {
    const k = 'FORM:' + rung + ':s' + sup; out.per[k] = 0; let gs = 0;
    for (let i = 0; i < N; i++) {
      const it = gen('FORM', rung, sup, rng, {});
      if (!it) { out.nulls++; continue; }
      out.n++; out.per[k]++; gs += it.g; out.kinds[it.params.kind] = (out.kinds[it.params.kind] || 0) + 1;
      const e = check(it); if (e && out.bad.length < 20) out.bad.push(e);
    }
    out.g[k] = +(gs / Math.max(1, out.per[k])).toPrecision(3);
  }
  return out;
}
// spoken whole sentences (lines_space.js declares the same strings as finite sets – tests/v4_wpg.js validates every one)
const TXT = {
  ALLE: { trekant: 'Trykk på alle trekantene', firkant: 'Trykk på alle firkantene', sirkel: 'Trykk på alle sirklene', kvadrat: 'Trykk på alle kvadratene', rektangel: 'Trykk på alle rektanglene' },
  FANT: { trekant: 'Hvor mange trekanter fant du', firkant: 'Hvor mange firkanter fant du', sirkel: 'Hvor mange sirkler fant du', kvadrat: 'Hvor mange kvadrater fant du', rektangel: 'Hvor mange rektangler fant du' },
  SER: { trekant: 'Hvor mange trekanter ser du', firkant: 'Hvor mange firkanter ser du', sirkel: 'Hvor mange sirkler ser du', kvadrat: 'Hvor mange kvadrater ser du', rektangel: 'Hvor mange rektangler ser du' },
  FACT: { trekant: 'En trekant har tre rette sider og tre hjørner', firkant: 'En firkant har fire rette sider og fire hjørner', sirkel: 'En sirkel er helt rund og har ingen hjørner',
    kvadrat: 'Et kvadrat har fire like lange sider og fire rette hjørner', rektangel: 'Et rektangel har fire rette hjørner, og to og to sider er like lange' },
  RAD: { 2: 'Sett to klosser ved siden av hverandre', 3: 'Sett tre klosser ved siden av hverandre', 4: 'Sett fire klosser ved siden av hverandre' },
  TOPP: { venstre: 'Legg én kloss oppå den til venstre', hoyre: 'Legg én kloss oppå den til høyre', midten: 'Legg én kloss oppå den i midten' },
  ORD: { oppaa: 'Oppå', under: 'Under', foran: 'Foran', bak: 'Bak', venstre: 'Til venstre for', hoyre: 'Til høyre for' },
};
// «Den røde klossen er oppå den blå» (template sp_er_<rel>, set SP_ER_<REL>) and the word cards (sp_ord, set SP_ORD)
const ORD_TXT = { oppaa: 'oppå', under: 'under', foran: 'foran', bak: 'bak', venstre: 'til venstre for', hoyre: 'til høyre for' };
function statement(s2) { const def = { 'rød': 'røde', 'blå': 'blå', gul: 'gule', 'grønn': 'grønne' }; return 'Den ' + def[s2.a] + ' klossen er ' + ORD_TXT[s2.rel] + ' den ' + def[s2.b]; }   // v5r: «… den gule», never «den gul»
// «Legg den røde klossen oppå den blå» (template sp_legg_<rel>, set SP_LEGG_<REL>)
function sentence(ins) {
  const def = { 'rød': 'røde', 'blå': 'blå', gul: 'gule', 'grønn': 'grønne' };
  const rel = { oppaa: 'oppå', foran: 'foran', bak: 'bak', venstre: 'til venstre for', hoyre: 'til høyre for' }[ins.rel];
  return 'Legg den ' + def[ins.c] + ' klossen ' + rel + ' den ' + def[ins.ref];
}
const SPACE = F.SPACE = F.SPACE || {};
Object.assign(SPACE, { gen, check, selfTest, RUNGS, KINDS, FORMAT_OF, geoClass, inCls, MEMBER, visFront, visCount, hiddenInfo, rotGrid, canon, sameBuilding, isMirror, mirror,
  placements, relHolds, posOf, rowOk, REL, PCOL, TXT, sentence, sayTrue, adjSays, ORD_IDS, statement });
if (!F.__spaceReg) {
  F.__spaceReg = true;
  const fn = (rung, sup, rng, o) => gen('FORM', rung, sup, rng, o);
  const opts = { rungs: RUNGS.FORM.slice(), fits: (rung, key) => typeof key === 'string' && key.indexOf('FORM:' + rung + ':') === 0 };
  if (F.BANKS && typeof F.BANKS.reg === 'function') F.BANKS.reg('FORM', fn, opts);
  else (F.REGQ = F.REGQ || []).push(['FORM', fn, opts]);
}

/* =====================================================================================================================
   PART 2 – the formats (browser only): F60 Klosstårnet (G4 place / row, G5 count, G6 copy) and F65 Figurjakten (G1 hunt)
   Both run on the f_num.js diorama board (F.NUM.Board – a real 3D board in front of the camera, WP-R keeps that API), so they run
   anywhere (places include 'any'; portable). Protocol (stage.js / kit.js, feature-detected): every answer goes through
   S.arm / S.use / S.submit (think-gate, rapid R, look-back, targeted hint, re-deal/solution → C); follow-up instruction lines are
   «inside the prompt» (K.talk: a tap there is an early tap); no right/wrong per tap before Ferdig (C4); counts are never spoken before
   she answers (her own total in a look-back is fine – hint_leaks Table B); S.replay re-says the stimulus.
   Look-backs (SYNTHESIS §5.2 G): F60 – the builder lifts the layers apart (her count / both buildings side by side) · her placed cubes
   hop; F65 – the shapes she chose pulse one by one. Hints: structure only (layers apart, turn it round, the reference cube glows, corner
   dots on EVERY shape + the shape fact). Solutions (C): the layers apart and counted together · ghost cubes · glowing shapes – she
   carries it out herself.
   Public (tests): F.SPACE.cur → {format, item, K, B, w, st}, F.SPACE.ensure(item, spec).  60 fps: ≤ 14 cubes (1 mesh + 1 edge line
   each, shared geometry/materials), ≤ 14 extruded shapes; everything is disposed when the task ends. */
if (typeof THREE === 'undefined' || typeof document === 'undefined') return;
const V3 = THREE.Vector3;
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);
const say = (id, slots) => F.TPL && F.TPL.has(id) ? F.SAY(id, slots || {}, '') : Promise.resolve();
const sayN = n => (n >= 0 && n <= 100 && F.TPL.has('core_num')) ? F.SAY('core_num', { n }, '') : Promise.resolve();
const sayHer = n => (n >= 0 && n <= 40 && F.TPL.has('num_det_ble')) ? F.SAY('num_det_ble', { n }, '') : sayN(n);
F.Task = F.Task || {}; F.Task.defs = F.Task.defs || {};
const defFmt = (id, spec) => (typeof F.Task.def === 'function') ? F.Task.def(id, spec) : (spec.id = id, F.Task.defs[id] = spec);

/* ---------------------------------------------------------------- CSS (injected once) */
let cssDone = false;
function css() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style'); st.id = 'spCss';
  st.textContent = [
    '.sp-bar { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }',
    '.sp-btn { min-width: 70px; height: 70px; border-radius: 20px; border: 3px solid #c9b6ea; background: #fff; font-size: 32px; cursor: pointer; display: inline-flex;',
    '  align-items: center; justify-content: center; gap: 6px; padding: 0 12px; box-shadow: 0 4px 0 #b9a7d8; font-family: inherit; color: #4a3a6a; }',
    '.sp-btn .sp-lab { font-size: 20px; }',
    '.sp-btn.sp-done { background: #fff6d6; border-color: #e7c35a; box-shadow: 0 4px 0 #c9962b; font-size: 26px; }',
    '.sp-btn.sp-turn { min-width: 64px; height: 64px; font-size: 34px; background: #eef7ff; border-color: #9fc8ee; box-shadow: 0 4px 0 #87b3dd; }',
    '.sp-btn.sp-sel { background: #fff1b8; border-color: #e7b22a; transform: translateY(-4px); box-shadow: 0 8px 0 #c9962b, 0 0 18px rgba(255,200,60,.7); }',
    '.sp-btn.sp-used { opacity: .45; }',
    '.sp-btn.sp-glow { animation: spGlow 1s ease-in-out infinite; }',
    '.sp-btn.sp-shake { animation: spShake .4s; }',
    '.sp-locked .sp-btn { opacity: .6; pointer-events: none; }',
    '.sp-cube.sp-mini { width: 26px; height: 26px; border-radius: 6px; }',
    '.sp-cube { width: 40px; height: 40px; border-radius: 8px; box-shadow: inset -6px -8px 0 rgba(0,0,0,.18), inset 4px 4px 0 rgba(255,255,255,.45); border: 2px solid rgba(60,30,10,.45); }',
    '@keyframes spGlow { 50% { box-shadow: 0 0 0 6px rgba(255,224,102,.7), 0 0 24px rgba(255,200,60,.9); } }',
    '@keyframes spShake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }',
  ].join('\n');
  document.head.appendChild(st);
}

/* ---------------------------------------------------------------- the format kit (thin layer over S and the f_num board) */
const FKINDS = { F60: ['place', 'row', 'feil', 'count', 'copy'], F65: ['hunt'] };
function ensure(item, spec) {
  const kinds = FKINDS[spec.id] || [];
  if (item.params && kinds.includes(item.params.kind) && item.strand === 'FORM') return item;
  const rr = spec.strands.FORM;
  let rung = item.strand === 'FORM' && item.rung >= rr[0] && item.rung <= rr[1] && F.SPACE.RUNGS.FORM.includes(item.rung) ? item.rung : rr[0];
  if (!KINDS[rung] || !KINDS[rung].some(k => kinds.includes(k))) rung = rr[0];
  const sup = item.sup == null ? 1 : item.sup;
  const rng = F.U.rng((F.U.hashStr(String(item.id || 'x') + ':' + spec.id) ^ (F.T.now * 1000 | 0)) >>> 0);
  let it = null;
  for (let t = 0; t < 6 && !it; t++) { it = gen('FORM', rung, sup, rng, { format: spec.id }); if (it && !kinds.includes(it.params.kind)) it = null; }
  if (!it) return item;
  const keep = { id: item.id, format: item.format, kind: item.kind, golden: item.golden };
  for (const k in item) if (!(k in keep)) delete item[k];
  Object.assign(item, it, keep);
  return item;
}
SPACE.ensure = ensure;
function Kit(item, S, spec) {
  css();
  const K = { item, S, spec, p: item.params || {}, sup: item.sup == null ? 1 : item.sup, offs: [], own: [] };
  K.say = say;
  // (S.prompt sets S.speaking = false when its line ends – a spoken block of several lines sets S.speaking itself and uses say())
  K.prompt = (id, slots) => F.TPL.has(id) ? S.prompt(id, slots || {}, { voice: '' }) : Promise.resolve();
  K.board = o => {
    const B = F.NUM.Board(Object.assign({ avoid: S.has3D && S.base ? S.base.clone().add(new V3(0, 1.3, 0)) : null }, o)); K.B = B;
    S.widgets.push({ kind: 'spboard', dead: false, lock() {}, destroy() { B.dispose(); K.end(); } });
    SPACE.cur = { format: spec.id, item, B, K };
    // the building site is drawn ON TOP of the world (a room sign or a tree between the camera and the board never hides a cube):
    // a hook object clears the depth buffer right before the board's meshes (renderOrder), the board keeps its own depth order
    // (two hooks: one in the opaque pass – the board base –, one in the transparent pass – our meshes use transparent materials with
    // opacity 1, so they draw after the faded world objects (Task.run fades what stands between the camera and the stage))
    // v5d WP-R3: F.NUM.Board now does this itself (B.onTop: one transparent-pass hook, so the world's transparent things keep their
    // occlusion) – the own hooks below are only for an older f_num.js
    if (B.onTop) { K.top = () => {}; return B; }
    const hookGeo = new THREE.BufferGeometry(), hookMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const hookMat2 = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });
    const hooks = [hookMat, hookMat2].map(m => { const h = new THREE.Mesh(hookGeo, m); h.frustumCulled = false; h.renderOrder = 900; h.onBeforeRender = r => { try { if (r.state && r.state.buffers && r.state.buffers.depth) r.state.buffers.depth.setMask(true); r.clearDepth(); } catch (e) {} }; B.root.add(h); return h; });
    K.own.push(hookGeo, hookMat, hookMat2);
    K.top = () => B.root.traverse(o => { if (!hooks.includes(o)) o.renderOrder = 901; });
    K.top();
    return B;
  };
  K.meta = (mode, g) => { if (item.g == null || !isFinite(item.g)) item.g = g; if (!item.mode) item.mode = mode; if (!item.think) item.think = spec.think; };
  K.gateOk = () => { if (S.gateOpen && !S.gateOpen()) { if (S.submitEarly) S.submitEarly(); return false; } return true; };
  K.widget = o => {
    const w = { kind: o.kind || 'spboard', values: o.values || [], dead: false, locked: false };
    w.feed = v => o.feed(v);
    w.mark = (v, cls) => { try { o.mark && o.mark(v, cls); } catch (e) { console.error(e); } };
    w.solution = v => { try { o.solution && o.solution(v); } catch (e) { console.error(e); } };
    w.lock = on => { w.locked = !!on; if (K.B) K.B.locked = !!on; if (K.bar) K.bar.classList.toggle('sp-locked', !!on); };
    w.destroy = () => { w.dead = true; if (o.destroy) o.destroy(); };
    if (o.rightValue) w.rightValue = o.rightValue;
    if (o.wrongValue) w.wrongValue = o.wrongValue;
    if (o.helpStep) w.helpStep = o.helpStep;
    if (SPACE.cur) SPACE.cur.w = w;
    S.use(w);
    return w;
  };
  K.submit = v => S.submit(v, S.active);
  K.lookBack = fn => { K._lb = fn; if (S.lookBack) S.lookBack(fn); };
  K.hint = fn => { S.hint = async (tag, v) => { try { if (S.clearHint) S.clearHint(); if (K._lb && !S.lookBack) await K._lb(v); if (!S.solved && !S.ended) await fn(tag, v); } catch (e) { console.error('[f_space hint]', e); } }; };
  K.sol = fn => { S._solFn = async () => { try { await fn(); } catch (e) { console.error('[f_space solution]', e); } }; };
  K.barEl = () => { if (!K.bar || !K.bar.parentNode) { K.bar = F.UI.el('div', 'sp-bar'); S.tray().appendChild(K.bar); if (F.UI._trayUpd) F.UI._trayUpd(); } return K.bar; };
  // a tray button; free:true = works while the gate is closed and while locked (turning the view is looking, not answering)
  K.button = (html, fn, cls, o) => {
    o = o || {};
    const b = F.UI.el('button', 'sp-btn ' + (cls || '')); b.innerHTML = html;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); if (!o.free) { if (S.locked || (S.active && S.active.locked)) return; if (!K.gateOk()) return; } F.sfx.click(); fn(b); });
    if (o.free) b.style.pointerEvents = 'auto';
    K.barEl().appendChild(b); return b;
  };
  K.clearBar = () => { if (K.bar) { K.bar.remove(); K.bar = null; } };
  K.done = fn => K.button('✓ <span class="sp-lab">' + F.UI.caseText('ferdig') + '</span>', fn, 'sp-done');
  K.shake = b => { if (!b) return; b.classList.remove('sp-shake'); void b.offsetWidth; b.classList.add('sp-shake'); };
  // fixed-slot keypad (the length shows only at s0 – hint_leaks C3)
  K.keypad = (answer, o) => {
    const show = K.sup === 0;
    return S.keypad(Object.assign(show ? { answer, len: String(answer).length, showLen: true, auto: true, slots: 3 } : { answer, len: 3, slots: 3, showLen: false, auto: false }, o || {}));
  };
  // follow-up instruction lines: still «the prompt» for the protocol (a tap now is an early tap, nothing judged)
  K.talk = async lines => { S.speaking = true; try { for (const l of lines) { if (S.ended) break; await K.say(l[0], l[1]); } } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); } };
  K.end = () => { K.offs.splice(0).forEach(f => { try { f(); } catch (e) {} }); K.own.splice(0).forEach(x => { try { x.dispose(); } catch (e) {} }); if (SPACE.cur && SPACE.cur.K === K) SPACE.cur = null; };
  K.mesh = (geo, mat) => { K.own.push(geo); if (mat && !mat._shared) K.own.push(mat); return new THREE.Mesh(geo, mat); };
  return K;
}
const pal = c => (F.PAL && F.PAL[c] != null) ? F.PAL[c] : c;
const MATS = new Map();      // shared Lambert materials per colour (never disposed – a handful of colours)
function lam(hex, o) {
  o = o || {};
  const k = hex + '|' + (o.em || 0) + '|' + (o.op || 1);
  let m = MATS.get(k);
  // transparent: true with opacity 1 – drawn in the transparent pass after the world (see K.board), depth-sorted among our meshes
  if (!m) { m = new THREE.MeshLambertMaterial({ color: hex, emissive: o.em || 0x000000, transparent: true, opacity: o.op || 1, depthWrite: !((o.op || 1) < 1) }); m._shared = true; MATS.set(k, m); }
  return m;
}
// one reaction per task end (logic_audit §3-H): after a first-try A the builder / the scene says its own line and the stage's generic
// praise is skipped; after B/C, with an NPC giver (her praise voice) or on a golden item the stage's S.ok speaks instead
async function endLine(S, item, tpl) {
  let r = null; try { r = S.result(); } catch (e) { r = null; }
  if (r && r.outcome === 'A' && !S.voice && !item.golden && F.TPL.has(tpl)) { await say(tpl); S.okDone = true; }
}
function sparkle(obj) { try { const p = new V3(); obj.getWorldPosition(p); p.y += 0.3; F.FX.burst(p, { kind: 'star', n: 16 }); F.sfx.sparkle(); } catch (e) {} }
function bounce(obj, amp) { const y0 = obj.position.y; return tween(380, k => { obj.position.y = y0 + Math.sin(k * Math.PI) * (amp || 0.25); }).then(() => { obj.position.y = y0; }); }

/* ---------------------------------------------------------------- the cube builder (F60): a plate of W×D cells + toy cubes */
// colours: by level (warm wood toys for models / counting, cool for her own building), or named (G4)
const LEVEL_WARM = [0xffd24a, 0xff8a7a, 0x7fc4f2, 0x9fe6a4, 0xc59cf0];
const LEVEL_COOL = LEVEL_WARM;   // her building: the same layer colours as the model (a visible self-check), on a lilac plate
const NAMED = { 'rød': 0xe8484f, 'blå': 0x4a90e2, gul: 0xffd84a, 'grønn': 0x4fbf5a };
function Blocks(K, B, o) {
  const W = o.W, D = o.D, cs = o.cs || 0.5;
  const g = new THREE.Group(); g.position.set(o.x || 0, 0, o.z || 0); B.top.add(g);
  const inner = new THREE.Group(); g.add(inner);
  const plate = K.mesh(new THREE.BoxGeometry(W * cs + 0.18, 0.12, D * cs + 0.18), lam(o.plateCol || 0xc49a6c));
  plate.position.y = -0.02; inner.add(plate);
  const rim = K.mesh(new THREE.BoxGeometry(W * cs + 0.26, 0.06, D * cs + 0.26), lam(o.rimCol || 0x9c6b36)); rim.position.y = -0.07; inner.add(rim);
  const tileGeo = new THREE.BoxGeometry(cs * 0.92, 0.04, cs * 0.92); K.own.push(tileGeo);
  const tiles = [];
  const cellPos = (x, y) => [(x - (W - 1) / 2) * cs, (y - (D - 1) / 2) * cs];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const t = new THREE.Mesh(tileGeo, lam((x + y) % 2 ? (o.tileB || 0xd9ecc9) : (o.tileA || 0xc6e3b5)));
    const [px, pz] = cellPos(x, y); t.position.set(px, 0.06, pz); t.userData.cell = y * W + x; inner.add(t); tiles.push(t);
  }
  const geo = new THREE.BoxGeometry(cs * 0.94, cs * 0.94, cs * 0.94), edges = new THREE.EdgesGeometry(geo); K.own.push(geo, edges);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x6b3f12, transparent: true }), ghostLine = new THREE.LineBasicMaterial({ color: 0xc9962b, transparent: true, opacity: 0.7 }); K.own.push(lineMat, ghostLine);
  const ghostMat = new THREE.MeshLambertMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.4, depthWrite: false, emissive: 0x554400 }); K.own.push(ghostMat);
  let cubes = [], exploded = 0, fan = false, pickFn = null;
  const yOf = z => 0.08 + cs * (z + 0.5) + (fan ? 0 : exploded * z * cs * 1.0);
  // «fan»: the builder lifts every layer off and sets it down beside the others (left → right = bottom → top), so each layer is seen
  // whole from above – hidden cubes included; the group shrinks to fit the board while the layers lie apart
  const fanOff = (z, L) => { const step = W * cs + 0.32, dx = (z - (L - 1) / 2) * step - (fan ? 0 : 0), th = inner.rotation.y; return [dx * Math.cos(th), dx * Math.sin(th), step * L - 0.32]; };
  const lvOf = m => fan && exploded ? m.userData.z : 0;
  const T = {
    g, inner, tiles, cs, W, D, cubes: () => cubes,
    // list: [{x, y, z, col (hex), ghost?, tag?}]
    set(list) {
      cubes.forEach(m => { inner.remove(m); B.unpick(m); }); cubes = [];
      for (const c of list) {
        const m = new THREE.Mesh(geo, c.ghost ? ghostMat : lam(c.col));
        const [px, pz] = cellPos(c.x, c.y); m.position.set(px, fan && exploded ? 0.08 + cs * 0.5 : yOf(c.z), pz);
        if (fan && exploded) { const L = Math.max(...list.map(q => q.z)) + 1, [ox, oz] = fanOff(c.z, L); m.position.x += ox; m.position.z += oz; }
        Object.assign(m.userData, { cell: c.y * W + c.x, x: c.x, y: c.y, z: c.z, ghost: !!c.ghost, tag: c.tag, col: c.col });
        m.add(new THREE.LineSegments(edges, c.ghost ? ghostLine : lineMat));
        inner.add(m); cubes.push(m);
      }
      if (pickFn) T.pickable(pickFn);
      if (K.top) K.top();
      return T;
    },
    heights(h, colFn) {
      const list = [];
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) for (let z = 0; z < (+h[y * W + x] || 0); z++) list.push({ x, y, z, col: colFn ? colFn(x, y, z) : LEVEL_WARM[z % 5] });
      return list;
    },
    // tap a cell or any cube of its column → fn(cell index)
    pickable(fn) {
      pickFn = fn;
      tiles.concat(cubes).forEach(m => B.unpick(m));
      tiles.forEach(t => B.pick(t, () => fn(t.userData.cell), { min: 24 }));
      cubes.filter(m => !m.userData.ghost).forEach(m => B.pick(m, () => fn(m.userData.cell), { min: 20 }));
    },
    explode(on, ms, mode) {
      if (on) fan = mode === 'fan';
      exploded = on ? 1 : 0;
      const L = cubes.length ? Math.max(...cubes.map(m => m.userData.z)) + 1 : 1;
      const tw = cubes.map(m => {
        const p0 = m.position.clone(), [px, pz] = cellPos(m.userData.x, m.userData.y);
        let p1;
        if (fan && on) { const [ox, oz] = fanOff(m.userData.z, L); p1 = new V3(px + ox, 0.08 + cs * 0.5, pz + oz); }
        else p1 = new V3(px, 0.08 + cs * (m.userData.z + 0.5) + (on ? m.userData.z * cs * 1.0 : 0), pz);
        // lifted first (up, then across, then down) so a layer never slides through another
        return k => { m.position.lerpVectors(p0, p1, k); if (fan) m.position.y += Math.sin(k * Math.PI) * (0.5 + m.userData.z * cs * 0.6); };
      });
      const s0 = g.scale.x, s1 = fan && on ? Math.min(1, (o.fitW || 9) / Math.max(1e-3, fanOff(0, L)[2] + 0.3)) : 1;
      if (on) try { F.sfx.whoosh(); } catch (e) {}
      return tween(ms || (fan ? 900 : 520), k => { const e = ease(k); tw.forEach(f => f(e)); g.scale.setScalar(s0 + (s1 - s0) * e); }).then(() => { if (!on) fan = false; });
    },
    turn(dir, ms) { const r0 = inner.rotation.y, r1 = Math.round((r0 + (dir || 1) * Math.PI / 2) / (Math.PI / 2)) * (Math.PI / 2); return tween(ms || 420, k => { inner.rotation.y = r0 + (r1 - r0) * ease(k); }); },
    flash(m, on) { if (!m) return; m.material = on ? lam(0xfff6b0, { em: 0x665500 }) : (m.userData.ghost ? ghostMat : lam(m.userData.col)); },
    glowAll(on) { cubes.forEach(m => { if (!m.userData.ghost) T.flash(m, on); }); },
    remove() { tiles.concat(cubes).forEach(m => B.unpick(m)); if (g.parent) g.parent.remove(g); },
  };
  return T;
}
// turn arrows (big, clear at 6: a curved arrow round a little cube)
const TURN_SVG = flip => '<svg viewBox="0 0 48 48" width="44" height="44"' + (flip ? ' style="transform:scaleX(-1)"' : '') + '><rect x="17" y="18" width="14" height="14" rx="2" fill="#ffd76a" stroke="#6b3f12" stroke-width="2"/>' +
  '<path d="M38 22a15 15 0 1 0-4 14" fill="none" stroke="#3f7fc4" stroke-width="5" stroke-linecap="round"/><path d="M41 12l-2 13-11-6z" fill="#3f7fc4"/></svg>';
const TURN_L = TURN_SVG(true), TURN_R = TURN_SVG(false);
// a small building-site decoration: a crane-like post with a flag, a wheelbarrow of cubes and flowers (not tappable)
// the builder («byggmesteren» the lines talk about): a small toy figure in overalls and a yellow helmet beside the plate.
// builder.lift() – arms up (he lifts the layers apart), builder.cheer() – a happy hop, builder.point() – a nod towards the building
function builder(K, g, x, z) {
  const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
  const box = (w, h, d, col, px, py, pz, par) => { const m = K.mesh(new THREE.BoxGeometry(w, h, d), lam(col)); m.position.set(px, py, pz); (par || b).add(m); return m; };
  box(0.11, 0.3, 0.12, 0x5a6aa8, -0.07, 0.15, 0); box(0.11, 0.3, 0.12, 0x5a6aa8, 0.07, 0.15, 0);             // legs (dungarees)
  box(0.12, 0.05, 0.16, 0x7c5230, -0.07, 0.025, 0.02); box(0.12, 0.05, 0.16, 0x7c5230, 0.07, 0.025, 0.02); // boots
  box(0.3, 0.32, 0.18, 0xff9a3c, 0, 0.46, 0);                                                                // orange jacket
  box(0.31, 0.05, 0.19, 0xfff3dc, 0, 0.52, 0);                                                               // reflective band
  const head = box(0.24, 0.22, 0.22, 0xffd9c0, 0, 0.73, 0);
  box(0.035, 0.035, 0.01, 0x333340, -0.055, 0.02, 0.112, head); box(0.035, 0.035, 0.01, 0x333340, 0.055, 0.02, 0.112, head);   // eyes
  box(0.08, 0.02, 0.01, 0xe8484f, 0, -0.05, 0.112, head);                                                     // smile
  box(0.27, 0.09, 0.26, 0xffd84a, 0, 0.13, 0, head); box(0.3, 0.025, 0.32, 0xffd84a, 0, 0.09, 0.03, head);   // helmet + brim
  const arms = [-1, 1].map(sg => { const pv = new THREE.Group(); pv.position.set(sg * 0.19, 0.6, 0); b.add(pv); box(0.08, 0.26, 0.09, 0xff9a3c, 0, -0.12, 0, pv); box(0.08, 0.07, 0.09, 0xffd9c0, 0, -0.27, 0, pv); return pv; });
  const held = box(0.13, 0.13, 0.13, LEVEL_WARM[0], 0, 0.42, 0.16);                                          // a cube in his hands
  arms.forEach(a => { a.rotation.x = -0.7; });
  b.rotation.y = x < 0 ? 0.5 : -0.5; b.scale.setScalar(1.35);
  const B = {
    g: b,
    lift() { held.visible = false; return tween(380, k => { arms.forEach(a => { a.rotation.x = -0.7 - 2.2 * ease(k); }); b.position.y = Math.sin(k * Math.PI) * 0.08; }).then(() => sleep(900)).then(() => tween(380, k => { arms.forEach(a => { a.rotation.x = -2.9 + 2.2 * ease(k); }); })).then(() => { held.visible = true; }); },
    cheer() { return tween(600, k => { b.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * 0.18; arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * Math.sin(k * Math.PI) * 0.9; }); }).then(() => { b.position.y = 0; arms.forEach(a => { a.rotation.z = 0; }); }); },
    point() { return tween(500, k => { head.rotation.x = Math.sin(k * Math.PI) * 0.35; }); },
  };
  return B;
}
// the building site around the plate: the builder, a little pile of spare cubes and flowers (not tappable)
function siteDeco(K, B, w, d) {
  const g = new THREE.Group(); B.top.add(g);
  const pile = [[0, 0, 0], [0.2, 0, 0.02], [0.1, 0.18, 0]];
  pile.forEach(([x, y, z], i) => { const c = K.mesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), lam(LEVEL_WARM[i])); c.position.set(w / 2 - 0.55 + x, 0.09 + y, -d / 2 + 0.4 + z); c.rotation.y = 0.3 * i; g.add(c); });
  const flower = (x, z, col) => { const s = K.mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), lam(0x5ec05c)); s.position.set(x, 0.09, z); g.add(s); const f = K.mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), lam(col)); f.position.set(x, 0.2, z); g.add(f); };
  flower(w / 2 - 0.3, d / 2 - 0.3, 0xff7fb0); flower(w / 2 - 0.5, d / 2 - 0.22, 0xffd84a); flower(-w / 2 + 0.3, d / 2 - 0.3, 0xc6a8ff);
  K.man = builder(K, g, -w / 2 + 0.42, -d / 2 + 0.55);
  return g;
}
const manDo = (K, what) => { try { return K.man && K.man[what] ? K.man[what]() : Promise.resolve(); } catch (e) { return Promise.resolve(); } };

/* ---------------------------------------------------------------- F60 Klosstårnet */
async function runCount(K, S, item) {
  const p = K.p, [W, D] = p.base, h = p.heights, n = item.target;
  const cs = 0.6, maxH = Math.max(...h);
  const bw = Math.max(3.8, Math.max(W, D) * cs + 1.9), bd = Math.max(2.7, Math.max(W, D) * cs + 1.1);
  const B = K.board({ style: 'grass', w: bw, d: bd, h: maxH * cs + 0.4, tilt: 0.8, scale: 1.2 });
  siteDeco(K, B, bw, bd);
  const T = Blocks(K, B, { W, D, cs, fitW: bw - 0.3 });
  const colFn = K.sup === 2 ? (x, y, z) => [0xffc46b, 0xf2b84b][(x + y + z) % 2] : (x, y, z) => LEVEL_WARM[z % 5];
  T.set(T.heights(h, colFn));
  K.meta('keypad', 0.01);
  // ⟲ ⟳: turn the building (looking is free – also while the prompt plays)
  const turn = async dir => { if (K.turning) return; K.turning = true; try { F.sfx.whoosh && F.sfx.whoosh(); await T.turn(dir); } finally { K.turning = false; } };
  K.button(TURN_L, () => turn(1), 'sp-turn', { free: true });
  K.button(TURN_R, () => turn(-1), 'sp-turn', { free: true });
  SPACE.cur.st = { T, kind: 'count' };
  // look-back: her number, then the builder lifts the layers apart (so every layer – and the hidden cubes – can be seen)
  K.lookBack(async v => { if (v != null && /^\d+$/.test(String(v))) await sayHer(+v); manDo(K, 'lift'); await T.explode(true, 0, 'fan'); await sleep(1400); await T.explode(false); });
  // misconception tags (SYNTHESIS §5.L): she counted only what she sees from the front / only the top cubes / one off
  const tagCount = v => { const x = +v; if (p.hidden && x === p.visible) return 'VISIBLE-ONLY'; if (p.tops !== n && x === p.tops) return 'TOP-ONLY'; if (Math.abs(x - n) === 1) return 'NEAR'; return 'OTHER'; };
  S.tagOf = tagCount;
  // hint: count layer by layer (the layers stay apart a while); hidden cubes: turn it round / a cube cannot float
  K.hint(async (tag, v) => {
    const tg = v != null && /^\d+$/.test(String(v)) ? tagCount(v) : tag;
    await K.say(tg === 'TOP-ONLY' ? 'sp_f60_alle_lag' : 'sp_f60_lag');
    manDo(K, 'lift'); await T.explode(true, 0, 'fan'); await sleep(2200); await T.explode(false);
    if (p.hidden && !S.solved) {
      if (tg === 'VISIBLE-ONLY') await K.say('sp_f60_gjem');
      if (hiddenInfo(h, W, D).some(c => c.seen)) { await K.say('sp_f60_bak'); await T.turn(1); await sleep(700); await T.turn(1); await sleep(900); await T.turn(-1); await T.turn(-1); }
      if (hiddenInfo(h, W, D).some(c => !c.seen && c.holds)) await K.say('sp_f60_under');
    }
    await T.explode(false);
  });
  // solution (C): layers apart, every cube lights up as we count together, then she types it
  K.sol(async () => {
    await T.explode(true, 0, 'fan');
    const cs2 = T.cubes().slice().sort((a, b) => a.userData.z - b.userData.z || a.userData.y - b.userData.y || a.userData.x - b.userData.x);
    for (let i = 0; i < cs2.length && !S.ended; i++) { T.flash(cs2[i], true); try { F.sfx.pling(i % 8); } catch (e) {} await sayN(i + 1); }
    if (S.active && S.active.solution) S.active.solution(n);
    await say('core_sol_keys');
  });
  // «Hjelp meg» / Puff before her first attempt (WP-K2 phase contract, feature-detected): a strategy, never the count
  S.pre = async () => { await K.say('sp_f60_lag'); manDo(K, 'lift'); await T.explode(true, 0, 'fan'); await sleep(1800); await T.explode(false); };
  S.replay = () => say('sp_f60_tell');
  await K.prompt('sp_f60_tell');
  if (K.sup <= 1) await K.talk([['sp_f60_snu']].concat(K.sup === 1 && p.hidden ? [['sp_f60_gjem']] : []));
  await K.keypad(n);
  T.explode(false);
  T.glowAll(false);
  const cs3 = T.cubes().slice().sort((a, b) => a.userData.z - b.userData.z);
  for (const c of cs3) { T.flash(c, true); await sleep(70); }
  sparkle(T.g); manDo(K, 'cheer'); await endLine(S, item, 'sp_f60_okt');
  return S.result();
}
async function runCopy(K, S, item) {
  const p = K.p, [W, D] = p.base, model = p.heights, PW = 3, PD = 3, maxH = p.maxH || 4;
  const cs = 0.48;
  const B = K.board({ style: 'grass', w: 6.4, d: 2.8, h: maxH * cs + 0.3, tilt: 0.82, scale: 1.05 });
  siteDeco(K, B, 6.4, 2.8);
  const M = Blocks(K, B, { W, D, cs, x: -1.6, z: -0.05, plateCol: 0xd8cbb5, rimCol: 0xa89a82, tileA: 0xe8dcc4, tileB: 0xf1e8d6 });
  M.set(M.heights(model, (x, y, z) => LEVEL_WARM[z % 5]));
  M.inner.rotation.y = (p.view || 0) * Math.PI / 2;
  const T = Blocks(K, B, { W: PW, D: PD, cs, x: 1.6, z: -0.05, plateCol: 0xb9a5f0, rimCol: 0x8a72c8, tileA: 0xe4dafc, tileB: 0xd5c8f6 });
  const hts = new Array(PW * PD).fill(0), hist = [];
  let ghost = null;
  const redraw = () => {
    const list = T.heights(hts, (x, y, z) => LEVEL_COOL[z % 5]);
    if (ghost) for (let i = 0; i < hts.length; i++) for (let z = hts[i]; z < ghost[i]; z++) list.push({ x: i % PW, y: Math.floor(i / PW), z, ghost: true });
    T.set(list);
  };
  const tap = i => { if (w.locked || S.solved || !K.gateOk()) return; hist.push([i, hts[i]]); hts[i] = hts[i] >= maxH ? 0 : hts[i] + 1; if (ghost && hts[i] > ghost[i] && S.solShown) hts[i] = ghost[i]; redraw(); try { F.sfx.pop(); } catch (e) {} };
  T.pickable(tap); redraw();
  const check = v => Array.isArray(v) && sameBuilding(model, W, D, v, PW, PD);
  S.tagOf = v => !Array.isArray(v) ? 'OTHER' : isMirror(model, W, D, v, PW, PD) ? 'MIRROR' : sum(v) < sum(model) ? (sum(v) === sum(model) - hiddenInfo(model, W, D).length ? 'VISIBLE-ONLY' : 'MISSING') : 'COPY';
  K.meta('build', 0.001);
  // the model as she sees it (turned by p.view), placed at the back-left of her plate – the ghost of the solution
  const shown = () => { let g = { h: model, W, D }; for (let t = 0; t < ((p.view || 0) % 4 + 4) % 4; t++) g = rotGrid(g.h, g.W, g.D); const o = new Array(PW * PD).fill(0); for (let y = 0; y < g.D; y++) for (let x = 0; x < g.W; x++) o[y * PW + x] = H(g.h, g.W, g.D, x, y); return o; };
  const w = K.widget({ kind: 'vox', values: [],
    feed: v => { (v || []).forEach((x, i) => { hts[i] = +x || 0; }); redraw(); return K.submit(hts.slice()); },
    solution: () => { ghost = shown(); for (let i = 0; i < hts.length; i++) if (hts[i] > ghost[i]) hts[i] = ghost[i]; redraw(); },
    rightValue: () => shown(), wrongValue: () => { const v = shown(); const i = v.findIndex(x => x > 0); v[i] = v[i] + 1 > maxH ? v[i] - 1 : v[i] + 1; return v; },
    helpStep: async () => { const sol = shown(); const i = hts.findIndex((x, k) => x !== sol[k]); if (i < 0) return false; hts[i] = sol[i]; redraw(); return true; } });
  if (K.sup >= 1) { K.button(TURN_L, async () => { await M.turn(1); }, 'sp-turn', { free: true }); }
  K.button('↶', () => { if (w.locked || S.solved) return; const x = hist.pop(); if (x) { hts[x[0]] = x[1]; redraw(); } }, '');
  K.done(b => { if (!hts.some(Boolean)) { K.shake(b); return; } K.submit(hts.slice()); });
  SPACE.cur.st = { M, T, hts, kind: 'copy' };
  // look-back: both buildings lift their layers apart side by side (her building, compared layer by layer)
  K.lookBack(async () => { await say('sp_f60_lb_bygg'); manDo(K, 'lift'); M.explode(true); await T.explode(true); await sleep(1600); M.explode(false); await T.explode(false); });
  // hint: build one layer at a time – the model's bottom layer lights up (the model, never her plate)
  K.hint(async (tag, v) => {
    if (v && isMirror(model, W, D, v, PW, PD)) await say('sp_f60_speil');
    await say('sp_f60_nederst');
    const bot = M.cubes().filter(m => m.userData.z === 0);
    bot.forEach(m => M.flash(m, true)); await sleep(1600); bot.forEach(m => M.flash(m, false));
  });
  K.sol(async () => { w.solution(); await say('sp_sol_bygg'); });
  S.replay = () => say('sp_f60_bygg');
  await K.prompt('sp_f60_bygg');
  const extra = [];
  if (p.view) extra.push(['sp_f60_andre']);
  if (K.sup === 0) extra.push(['sp_f60_trykk']);
  if (extra.length) await K.talk(extra);
  await S.arm({ answer: model, check });
  for (const c of T.cubes()) { T.flash(c, true); await sleep(60); }
  sparkle(T.g); manDo(K, 'cheer'); await endLine(S, item, 'sp_f60_ok');
  return S.result();
}
// G4: coloured cubes – the instructions place the new ones (palette in the tray, then tap a column)
async function runPlace(K, S, item) {
  const p = K.p, [W, D] = p.base, cs = 0.6;
  const B = K.board({ style: 'grass', w: 4.2, d: 3.0, h: 4 * cs, tilt: 0.88, scale: 1.15 });
  siteDeco(K, B, 4.2, 3.0);
  const T = Blocks(K, B, { W, D, cs });
  const placed = {};             // colour → {x, y, z} | null
  p.add.forEach(c => { placed[c] = null; });
  let sel = p.add[0], ghost = null;
  const stacks = () => { const st = {}; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) st[x + ',' + y] = []; p.given.slice().sort((a, b) => a.z - b.z).forEach(g => st[g.x + ',' + g.y].push(g.c)); return st; };
  // rebuild from the given cubes + her placements (in placing order)
  let order = [];
  const build = () => {
    const st = stacks();
    order.forEach(c => { const q = placed[c]; if (q) { q.z = st[q.x + ',' + q.y].length; st[q.x + ',' + q.y].push(c); } });
    const list = [];
    for (const k in st) { const [x, y] = k.split(',').map(Number); st[k].forEach((c, z) => list.push({ x, y, z, col: NAMED[c], tag: c })); }
    if (ghost) ghost.forEach(gq => { if (!(placed[gq.c] && placed[gq.c].x === gq.x && placed[gq.c].y === gq.y && placed[gq.c].z === gq.z)) list.push({ x: gq.x, y: gq.y, z: gq.z, ghost: true }); });
    T.set(list);
    btns.forEach((b, i) => { const c = p.add[i]; b.classList.toggle('sp-sel', c === sel); b.classList.toggle('sp-used', !!placed[c] && c !== sel); });
  };
  const tap = cell => {
    if (w.locked || S.solved || !K.gateOk()) return;
    const x = cell % W, y = Math.floor(cell / W);
    const q = placed[sel];
    if (q && q.x === x && q.y === y) { removeC(sel); }          // tap her cube's column again → take it back
    else {
      if (q) removeC(sel);
      const st = stacks(); order.forEach(c => { const r = placed[c]; if (r) st[r.x + ',' + r.y].push(c); });
      if (st[x + ',' + y].length >= 4) return;
      placed[sel] = { x, y, z: st[x + ',' + y].length }; order.push(sel);
      try { F.sfx.pop(); } catch (e) {}
      const nxt = p.add.find(c => !placed[c]); if (nxt) sel = nxt;
    }
    build();
  };
  // removing a cube also lifts off a new cube that stood on it (it goes back to the tray)
  function removeC(c) {
    const q = placed[c]; if (!q) return;
    placed[c] = null; order = order.filter(x => x !== c);
    order.slice().forEach(o2 => { const r = placed[o2]; if (r && r.x === q.x && r.y === q.y && r.z > q.z) { placed[o2] = null; order = order.filter(x => x !== o2); } });
  }
  const value = () => p.add.map(c => placed[c] ? { c, x: placed[c].x, y: placed[c].y, z: placed[c].z } : null);
  const check = v => Array.isArray(v) && v.length === item.target.length && v.every((q, i) => q && q.c === item.target[i].c && q.x === item.target[i].x && q.y === item.target[i].y && q.z === item.target[i].z);
  K.meta('build', item.g);
  // LEFT-RIGHT / FRONT-BACK: a cube stands where the opposite word would have put it
  const SWAP = { venstre: 'hoyre', hoyre: 'venstre', foran: 'bak', bak: 'foran' };
  S.tagOf = v => {
    if (!Array.isArray(v)) return 'OTHER';
    const st = stacks(); v.filter(Boolean).sort((a, b) => a.z - b.z).forEach(q => st[q.x + ',' + q.y].push(q.c));
    for (const ins of p.instr) { if (!SWAP[ins.rel] || relHolds(st, ins)) continue; if (relHolds(st, Object.assign({}, ins, { rel: SWAP[ins.rel] }))) return /venstre|hoyre/.test(ins.rel) ? 'LEFT-RIGHT' : 'FRONT-BACK'; }
    return 'POSITION';
  };
  const w = K.widget({ kind: 'place', values: [],
    feed: v => { order = []; p.add.forEach(c => { placed[c] = null; }); (v || []).forEach(q => { if (q) { placed[q.c] = { x: q.x, y: q.y, z: q.z }; order.push(q.c); } }); order.sort((a, b) => placed[a].z - placed[b].z); build(); return K.submit(value()); },
    solution: () => { ghost = item.target.map(q => Object.assign({}, q)); sel = p.add.find(c => !(placed[c] && item.target.some(t => t.c === c && t.x === placed[c].x && t.y === placed[c].y && t.z === placed[c].z))) || p.add[0]; build(); },
    rightValue: () => item.target.map(q => Object.assign({}, q)),
    wrongValue: () => { const d = (item.distractors || []).find(x => x.v && x.v.c); const v = item.target.map(q => Object.assign({}, q)); if (d) { const i = v.findIndex(q => q.c === d.v.c); if (i >= 0 && d.v.x >= 0 && d.v.x < W && d.v.y >= 0 && d.v.y < D) { v[i] = Object.assign({}, d.v); return v; } } v[0] = Object.assign({}, v[0], { x: (v[0].x + 1) % W, z: 0 }); return v; },
    // «Hjelp meg»: with two cubes to place the first one is placed for her (worked step); with one cube she hears its instruction
    // again while the reference cube lights up (placing it would be the whole answer)
    helpStep: async () => {
      const okAt = q => placed[q.c] && placed[q.c].x === q.x && placed[q.c].y === q.y && placed[q.c].z === q.z;
      const t = item.target.find(q => !okAt(q)); if (!t) return false;
      if (p.add.length > 1 && !item.target.some(okAt) && item.target[0].z <= (stacks()[item.target[0].x + ',' + item.target[0].y] || []).length) {
        const t0 = item.target[0]; Object.keys(placed).forEach(c => { if (placed[c]) removeC(c); });
        placed[t0.c] = { x: t0.x, y: t0.y, z: t0.z }; order = [t0.c]; sel = p.add.find(c => c !== t0.c) || sel; build(); return true;
      }
      const ins = p.instr.find(i => i.c === t.c); await sayInstr(ins); const rf = T.cubes().find(m => m.userData.tag === ins.ref); T.flash(rf, true); await sleep(900); T.flash(rf, false); return true;
    } });
  // palette: one cube button per new colour (tap it to choose which cube to place)
  const btns = p.add.map(c => K.button('<span class="sp-cube" style="background:#' + NAMED[c].toString(16).padStart(6, '0') + '"></span>', () => { if (w.locked || S.solved) return; sel = c; build(); }, '', { free: false }));
  K.done(b => { if (p.add.some(c => !placed[c])) { K.shake(b); const nb = btns[p.add.findIndex(c => !placed[c])]; K.shake(nb); return; } K.submit(value()); });
  T.pickable(tap); build();
  SPACE.cur.st = { T, placed, kind: 'place' };
  const sayInstr = ins => say('sp_legg_' + ins.rel, { p: sentence(ins) });
  const sayAll = async () => { for (const ins of p.instr) { if (S.ended) break; await sayInstr(ins); } };
  // look-back: her cubes hop where she put them (her answer, acted out)
  K.lookBack(async () => { await say('sp_f60_her_la'); for (const c of p.add) { const m = T.cubes().find(x => x.userData.tag === c && !x.userData.ghost); if (m) { await bounce(m, 0.3); } } });
  // hint: the first instruction she did not follow, again – its reference cube glows (where to look, not where to put)
  K.hint(async () => {
    const bad = p.instr.find(ins => { const q = placed[ins.c], t = item.target.find(x => x.c === ins.c); return !(q && t && q.x === t.x && q.y === t.y && q.z === t.z); }) || p.instr[0];
    const rf = T.cubes().find(m => m.userData.tag === bad.ref && !m.userData.ghost);
    T.flash(rf, true); await say('sp_f60_hor'); await sayInstr(bad); await sleep(500); T.flash(rf, false);
    if (/venstre|hoyre/.test(bad.rel)) await say('sp_f60_hand');
  });
  K.sol(async () => { w.solution(); await say('sp_sol_legg'); });
  S.replay = sayAll;
  S.speaking = true;
  try { await say('sp_f60_legg'); await sayAll(); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
  if (K.sup === 0) await K.talk([['sp_f60_tapp']]);
  await S.arm({ answer: item.target, check });
  for (const c of T.cubes()) { T.flash(c, true); await sleep(60); }
  sparkle(T.g); manDo(K, 'cheer'); await endLine(S, item, 'sp_f60_ok');
  return S.result();
}
// G4 «finn feil ord»: three sentences about a coloured building – tap the wrong one, then the word Puff should have said
const cubeHtml = c => '<span class="sp-cube sp-mini" style="background:#' + NAMED[c].toString(16).padStart(6, '0') + '"></span>';
async function runFeil(K, S, item) {
  const p = K.p, cs = 0.6;
  const B = K.board({ style: 'grass', w: 4.2, d: 3.0, h: 3 * cs, tilt: 0.88, scale: 1.15 });
  siteDeco(K, B, 4.2, 3.0);
  const T = Blocks(K, B, { W: 3, D: 3, cs });
  T.set(p.cubes.map(c => ({ x: c.x, y: c.y, z: c.z, col: NAMED[c.c], tag: c.c })));
  const cubeOf = c => T.cubes().find(m => m.userData.tag === c);
  const glowPair = async (sx, ms) => { const a = cubeOf(sx.a), b = cubeOf(sx.b); T.flash(a, true); T.flash(b, true); await sleep(ms || 700); T.flash(a, false); T.flash(b, false); };
  K.meta('twostep', item.g);
  SPACE.cur.st = { T, kind: 'feil', step: 1 };
  // the sentence cards: number + the two colours it talks about (she does not need to read); each lights while Puff says it
  const readSays = async (btns, withPair) => { for (let i = 0; i < p.says.length && !S.ended && !S.solved; i++) { btns[i].classList.add('sp-sel'); const pr = withPair ? glowPair(p.says[i], 900) : null; await say('sp_er_' + p.says[i].rel, { p: statement(p.says[i]) }); if (pr) await pr; btns[i].classList.remove('sp-sel'); } };
  let btns = [];
  const w1 = K.widget({ kind: 'cards', values: [0, 1, 2], feed: v => K.submit(v),
    solution: () => btns.forEach((b, i) => b.classList.toggle('sp-glow', i === p.wrong)), rightValue: () => p.wrong, wrongValue: () => (p.wrong + 1) % 3 });
  btns = p.says.map((sx, i) => K.button('<span class="sp-lab">' + (i + 1) + '</span>' + cubeHtml(sx.a) + cubeHtml(sx.b), () => { if (w1.locked || S.solved) return; K.submit(i); }));
  S.tagOf = v => typeof v === 'number' ? 'TRUE-SENTENCE' : 'OTHER';
  // look-back: the sentence she picked again, its two cubes light up – it was true
  K.lookBack(async v => { if (typeof v !== 'number' || !p.says[v]) return; btns[v].classList.add('sp-sel'); const pr = glowPair(p.says[v], 1400); await say('sp_er_' + p.says[v].rel, { p: statement(p.says[v]) }); await pr; btns[v].classList.remove('sp-sel'); });
  // hint: all three again, each with its two cubes lit (where to look – never which one is wrong)
  K.hint(async () => { await say('sp_feil_se'); await readSays(btns, true); });
  K.sol(async () => { w1.solution(); await say('core_sol_chip'); });
  S.replay = () => readSays(btns, false);
  S.pre = async () => { await say('sp_feil_se'); await readSays(btns, true); };
  S.speaking = true;
  try { await say('sp_feil_intro'); await readSays(btns, false); await say('sp_feil_hvilken'); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
  await S.arm({ answer: p.wrong, gate: 2000 });   // a 1-of-3 choice: the reasoning gate (2 s) even though the item's g is the product
  // ---- step 2: the right word for that sentence
  K.clearBar();
  SPACE.cur.st.step = 2;
  const ws = p.says[p.wrong];
  let wb = [];
  const w2 = K.widget({ kind: 'cards', values: ORD_IDS.slice(), feed: v => K.submit(v),
    solution: () => wb.forEach((b, i) => b.classList.toggle('sp-glow', ORD_IDS[i] === p.fix)), rightValue: () => p.fix, wrongValue: () => ws.rel });
  wb = ORD_IDS.map(rel => K.button('<span class="sp-lab">' + F.UI.caseText(TXT.ORD[rel].toLowerCase()) + '</span>', () => { if (w2.locked || S.solved) return; K.submit(rel); }));
  const readWords = async () => { for (let i = 0; i < ORD_IDS.length && !S.ended && !S.solved; i++) { wb[i].classList.add('sp-sel'); await say('sp_ord', { s: TXT.ORD[ORD_IDS[i]] }); wb[i].classList.remove('sp-sel'); } };
  S.tagOf = v => v === ws.rel ? 'SAME-WORD' : (v === OPP[p.fix] ? p.tag : 'OTHER');
  K.lookBack(null);
  K.hint(async () => { await glowPair(ws, 1600); if (/venstre|hoyre/.test(p.fix)) await say('sp_f60_hand'); else await say('sp_feil_se'); });
  K.sol(async () => { w2.solution(); await say('core_sol_chip'); });
  S.replay = async () => { await say('sp_er_' + ws.rel, { p: statement(ws) }); await readWords(); };
  S.pre = async () => { await glowPair(ws, 1600); await say('sp_feil_se'); };
  S.speaking = true;
  try { await say('sp_feil_ord'); await glowPair(ws, 900); await readWords(); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
  await S.arm({ answer: p.fix, gate: 1500 });
  manDo(K, 'cheer'); sparkle(T.g); await endLine(S, item, 'sp_feil_ok');
  return S.result();
}
// G4 s2: build a row from words
async function runRow(K, S, item) {
  const p = K.p, PW = 4, PD = 2, cs = 0.55, maxH = 3;
  const B = K.board({ style: 'grass', w: 4.4, d: 2.6, h: 3 * cs, tilt: 0.86, scale: 1.15 });
  siteDeco(K, B, 4.4, 2.6);
  const T = Blocks(K, B, { W: PW, D: PD, cs, plateCol: 0xb9a5f0, rimCol: 0x8a72c8, tileA: 0xe4dafc, tileB: 0xd5c8f6 });
  const hts = new Array(PW * PD).fill(0), hist = [];
  let ghost = null;
  const redraw = () => { const list = T.heights(hts, (x, y, z) => LEVEL_COOL[z % 5]); if (ghost) for (let i = 0; i < hts.length; i++) for (let z = hts[i]; z < ghost[i]; z++) list.push({ x: i % PW, y: Math.floor(i / PW), z, ghost: true }); T.set(list); };
  const tap = i => { if (w.locked || S.solved || !K.gateOk()) return; hist.push([i, hts[i]]); hts[i] = hts[i] >= maxH ? 0 : hts[i] + 1; redraw(); try { F.sfx.pop(); } catch (e) {} };
  const sol = () => { const o = new Array(PW * PD).fill(0); p.row.forEach((x, i) => { o[PW + i] = x; }); return o; };
  const check = v => Array.isArray(v) && rowOk(v, PW, PD, p.row);
  K.meta('build', 0.002);
  const w = K.widget({ kind: 'vox', values: [],
    feed: v => { (v || []).forEach((x, i) => { hts[i] = +x || 0; }); redraw(); return K.submit(hts.slice()); },
    solution: () => { ghost = sol(); for (let i = 0; i < hts.length; i++) if (hts[i] > ghost[i]) hts[i] = ghost[i]; redraw(); },
    rightValue: () => sol(), wrongValue: () => { const o = new Array(PW * PD).fill(0); p.row.slice().reverse().forEach((x, i) => { o[PW + i] = x; }); return rowOk(o, PW, PD, p.row) ? new Array(PW * PD).fill(1) : o; },
    helpStep: async () => { const s2 = sol(); const i = hts.findIndex((x, k) => x !== s2[k]); if (i < 0) return false; hts[i] = s2[i]; redraw(); return true; } });
  T.pickable(tap); redraw();
  K.button('↶', () => { if (w.locked || S.solved) return; const x = hist.pop(); if (x) { hts[x[0]] = x[1]; redraw(); } }, '');
  K.done(b => { if (!hts.some(Boolean)) { K.shake(b); return; } K.submit(hts.slice()); });
  SPACE.cur.st = { T, hts, kind: 'row' };
  const K_TXT = TXT.RAD, TOP_TXT = TXT.TOPP;
  const sayAll = async () => { await say('sp_rad', { s: K_TXT[p.k] }); await say('sp_rad_topp', { s: TOP_TXT[p.top] }); };
  K.lookBack(async () => { await say('sp_f60_her_la'); manDo(K, 'lift'); await T.explode(true); await sleep(1200); await T.explode(false); });
  K.hint(async () => { await say('sp_f60_hor'); await sayAll(); if (p.top !== 'midten') await say('sp_f60_hand'); });
  K.sol(async () => { w.solution(); await say('sp_sol_bygg'); });
  S.replay = sayAll;
  S.speaking = true;
  try { await sayAll(); } finally { S.speaking = false; S.tInput = F.T.now; }
  await S.arm({ answer: sol(), check });
  for (const c of T.cubes()) { T.flash(c, true); await sleep(70); }
  sparkle(T.g); manDo(K, 'cheer'); await endLine(S, item, 'sp_f60_ok');
  return S.result();
}
defFmt('F60', {
  name: 'Klosstårnet', strands: { FORM: [4, 6] }, places: ['building', 'site', 'byggeplass', 'mason', 'any'], family: 'rom', think: 'ROM', portable: true,
  tpl: ['sp_f60_tell', 'sp_f60_bygg', 'sp_f60_legg'],
  g: it => it.g,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this);
    const kind = K.p.kind;
    if (kind === 'count') return runCount(K, S, item);
    if (kind === 'copy') return runCopy(K, S, item);
    if (kind === 'row') return runRow(K, S, item);
    if (kind === 'feil') return runFeil(K, S, item);
    return runPlace(K, S, item);
  },
});

/* ---------------------------------------------------------------- F65 Figurjakten */
// a THREE.Shape from the generator's shape record (unit size, centred; rotated by rot)
function shapeOf(sh, size) {
  const s = new THREE.Shape(), R = p => { const q = rotP(p, sh.rot || 0); return [q[0] * size, q[1] * size]; };
  if (sh.kind === 'poly' || sh.kind === 'curvy') {
    const pts = sh.pts.map(R);
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length];
      if (sh.kind === 'curvy' && i - 1 === sh.edge) {
        // the edge bulges outwards (away from the centre) as an arc
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(mx, my) || 1, bulge = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.55;
        s.quadraticCurveTo(mx + mx / len * bulge, my + my / len * bulge, b[0], b[1]);
      } else s.lineTo(b[0], b[1]);
    }
    return s;
  }
  if (sh.kind === 'ell') { s.absellipse(0, 0, sh.rx * size, sh.ry * size, 0, Math.PI * 2, false, sh.rot || 0); return s; }
  if (sh.kind === 'semi') {   // centred on its middle: the arc bulges towards a0 + 90°, so shift back by 4r/3π the other way
    const r = sh.r * size, a0 = sh.rot || 0, k = -4 * r / (3 * Math.PI) / 2, cx = Math.cos(a0 + Math.PI / 2) * k, cy = Math.sin(a0 + Math.PI / 2) * k;
    s.absarc(cx, cy, r, a0, a0 + Math.PI, false); s.closePath(); return s;
  }
  if (sh.kind === 'arch') { const w = sh.w * size, hh = sh.h * size; s.moveTo(-w / 2, -hh / 2); s.lineTo(w / 2, -hh / 2); s.lineTo(w / 2, hh / 2 - w / 2); s.absarc(0, hh / 2 - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, -hh / 2); return s; }
  return s;
}
const GLASS = { sky: 0x5fb6f0, mint: 0x4fcf98, butter: 0xffd23a, peach: 0xff9f5b, lilac: 0xa070e0, pink: 0xff6fa8, coral: 0xff6f61, crystal: 0x46c8f0, lavender: 0x8c7ae6 };
const COOKIE = { sky: 0xf2b632, mint: 0xe0a050, butter: 0xf5c26b, peach: 0xd9925a, lilac: 0xe8b07a, pink: 0xf0a868, coral: 0xd88a4a, crystal: 0xf2c58a, lavender: 0xe6a35c };
const ICING = { sky: 0x9ad6ff, mint: 0x9fe6c4, butter: 0xfff6d6, peach: 0xffffff, lilac: 0xc6a8ff, pink: 0xff9fc6, coral: 0xffffff, crystal: 0xd8f2ff, lavender: 0xb9a5f0 };
// the castle facade: a stone wall with towers and crenellations; the shapes are its windows
function facade(K, B, n) {
  const g = new THREE.Group(); B.top.add(g);
  const rows = n <= 10 ? 2 : 3, perRow = Math.ceil(n / rows);
  const cell = 0.92, wallW = perRow * cell + 0.6, wallH = rows * cell + 0.55;
  const wall = K.mesh(new THREE.BoxGeometry(wallW, wallH, 0.3), lam(0xf1e8d6)); wall.position.set(0, wallH / 2, -0.35); g.add(wall);
  // stone courses (lighter / darker bands) and crenellations
  // decoration that could itself look like a shape (pointed roofs = triangles, flags / door / crenellations = rectangles and
  // squares) is left out: only the windows have shapes, so «Trykk på alle trekantene» is never ambiguous
  for (let k = 1; k < rows * 2; k++) { const band = K.mesh(new THREE.BoxGeometry(wallW + 0.01, 0.025, 0.31), lam(0xe2d6bf)); band.position.set(0, k * wallH / (rows * 2), -0.35); g.add(band); }
  const cope = K.mesh(new THREE.BoxGeometry(wallW + 0.1, 0.12, 0.38), lam(0xe2d6bf)); cope.position.set(0, wallH + 0.06, -0.35); g.add(cope);
  [-1, 1].forEach(sg => {
    const tw = K.mesh(new THREE.CylinderGeometry(0.42, 0.46, wallH + 0.7, 16), lam(0xe8dcc4)); tw.position.set(sg * (wallW / 2 + 0.25), (wallH + 0.7) / 2, -0.35); g.add(tw);
    const dome = K.mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(sg < 0 ? 0xec7aa8 : 0x9d8cf0)); dome.position.set(sg * (wallW / 2 + 0.25), wallH + 0.7, -0.35); g.add(dome);
    const ball = K.mesh(new THREE.SphereGeometry(0.09, 10, 8), lam(0xffd84a)); ball.position.set(sg * (wallW / 2 + 0.25), wallH + 1.27, -0.35); g.add(ball);
  });
  const slots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, n - r * perRow);
    slots.push({ x: (c - (inRow - 1) / 2) * cell, y: wallH - 0.38 - (r + 0.5) * cell + 0.15, z: -0.19 });
  }
  return { g, slots, cell, wallW, wallH, upright: true };
}
// the baker's stall: a wooden display board under a striped awning; the shapes are biscuits hung up on it (seen face-on, like the
// windows – a shape lying flat would be foreshortened and a square would look like a rectangle)
function stall(K, B, n) {
  const g = new THREE.Group(); B.top.add(g);
  const rows = n <= 10 ? 2 : 3, perRow = Math.ceil(n / rows);
  const cell = 0.92, wallW = perRow * cell + 0.6, wallH = rows * cell + 0.45;
  const panel = K.mesh(new THREE.BoxGeometry(wallW, wallH, 0.16), lam(0xfff3dc)); panel.position.set(0, wallH / 2 + 0.35, -0.35); g.add(panel);
  const frameT = K.mesh(new THREE.BoxGeometry(wallW + 0.24, 0.16, 0.24), lam(0xc0724a)); frameT.position.set(0, wallH + 0.43, -0.35); g.add(frameT);
  [-1, 1].forEach(sg => { const post = K.mesh(new THREE.BoxGeometry(0.16, wallH + 1.2, 0.2), lam(0xc0724a)); post.position.set(sg * (wallW / 2 + 0.1), (wallH + 1.2) / 2, -0.35); g.add(post); });
  // one plain canopy (stripes or scallops would themselves look like rectangles / half circles in the hunt)
  const aw = K.mesh(new THREE.BoxGeometry(wallW + 0.5, 0.5, 0.08), lam(0xff9fc6)); aw.position.set(0, wallH + 0.95, -0.2); aw.rotation.x = -0.5; g.add(aw);
  const pip = K.mesh(new THREE.BoxGeometry(wallW + 0.52, 0.06, 0.1), lam(0xffffff)); pip.position.set(0, wallH + 0.74, -0.08); pip.rotation.x = -0.5; g.add(pip);
  const counter = K.mesh(new THREE.BoxGeometry(wallW + 0.3, 0.36, 0.5), lam(0xc0724a)); counter.position.set(0, 0.18, -0.1); g.add(counter);
  const top = K.mesh(new THREE.BoxGeometry(wallW + 0.4, 0.06, 0.6), lam(0xf7ead0)); top.position.set(0, 0.39, -0.1); g.add(top);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, n - r * perRow);
    slots.push({ x: (c - (inRow - 1) / 2) * cell, y: wallH + 0.35 - 0.3 - (r + 0.5) * cell + 0.12, z: -0.26 });
  }
  return { g, slots, cell, wallW, wallH, upright: true };
}
async function runHunt(K, S, item) {
  const p = K.p, shapes = p.shapes, n = shapes.length, castle = p.surface !== 'marked';
  const rowsN = n <= 10 ? 2 : 3;
  const B = K.board({ style: castle ? 'grass' : 'street', w: 7.4, d: 2.2, h: rowsN * 0.92 + 2.0, tilt: 0.3, scale: 1.1, yNdc: -0.1 });
  const scene = castle ? facade(K, B, n) : stall(K, B, n);
  const size = scene.cell * 0.74;
  // every shape faces her (windows in the wall / biscuits hung on the stall board): a shape lying flat would be foreshortened
  const pieces = shapes.map((sh, i) => {
    const grp = new THREE.Group(), sl = scene.slots[i];
    const shp = shapeOf(sh, size * sh.s);
    const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.05, bevelEnabled: false, curveSegments: 18 }); K.own.push(geo);
    const frameShp = shapeOf(sh, size * sh.s + 0.09);
    const fgeo = new THREE.ExtrudeGeometry(frameShp, { depth: 0.035, bevelEnabled: false, curveSegments: 18 }); K.own.push(fgeo);
    const body = new THREE.Mesh(geo, castle ? lam(GLASS[sh.col] || 0x9ad6ff, { em: 0x101820 }) : lam(COOKIE[sh.col] || 0xf2b632));
    const frame = new THREE.Mesh(fgeo, castle ? lam(0x8a7a62) : lam(ICING[sh.col] || 0xffffff));
    frame.position.z = -0.01; grp.position.set(sl.x, sl.y, sl.z);
    grp.add(frame); grp.add(body); scene.g.add(grp);
    grp.userData = { i, body, frame, sh, base: frame.material };
    return grp;
  });
  if (K.top) K.top();
  const sel = new Set();
  let solSet = null, dots = [];
  const look = () => pieces.forEach((pc, i) => {
    const on = sel.has(i);
    pc.userData.frame.material = on ? lam(0xffc93c, { em: 0x664400 }) : pc.userData.base;
    pc.userData.body.material = (solSet && solSet.has(i) && !on) ? lam(0xffffff, { em: 0x555544 }) : (castle ? lam(GLASS[pc.userData.sh.col] || 0x9ad6ff, { em: on ? 0x332200 : 0x101820 }) : lam(COOKIE[pc.userData.sh.col] || 0xf2b632, { em: on ? 0x332200 : 0 }));
    const s = on ? 1.08 : 1; pc.scale.set(s, s, s);
  });
  let step2 = false;
  // step 1: a tap before the gate opens is an early tap; step 2: she may tap shapes to mark them while she counts (they light up)
  const toggle = i => { if (w.locked || S.solved || (!step2 && !K.gateOk())) return; if (sel.has(i)) sel.delete(i); else sel.add(i); try { F.sfx.pling(sel.size % 8); } catch (e) {} look(); };
  pieces.forEach((pc, i) => B.pick(pc, () => toggle(i), { min: 26 }));
  const value = () => [...sel].sort((a, b) => a - b);
  const check1 = v => Array.isArray(v) && v.length === item.target.length && v.every((x, i) => x === item.target[i]);
  K.meta('twostep', item.g);
  const w = K.widget({ kind: 'shapes', values: pieces.map((_, i) => i),
    feed: v => { sel.clear(); (v || []).forEach(i => sel.add(i)); look(); return K.submit(value()); },
    solution: () => { solSet = new Set(item.target); [...sel].forEach(i => { if (!solSet.has(i)) sel.delete(i); }); look(); },
    rightValue: () => item.target.slice(), wrongValue: () => item.target.slice(1),
    helpStep: async () => { const wrong = [...sel].find(i => !item.target.includes(i)); if (wrong != null) sel.delete(wrong); else { const i = item.target.find(k => !sel.has(k)); if (i == null) return false; sel.add(i); } look(); return true; } });
  const done = K.done(b => { if (!sel.size) { K.shake(b); return; } K.submit(value()); });
  SPACE.cur.st = { pieces, sel, kind: 'hunt' };
  // corner dots on EVERY shape (structure, never which ones belong) – the hint for both steps
  const cornerDots = on => {
    dots.forEach(d => d.parent && d.parent.remove(d)); dots = [];
    if (!on) return;
    const dg = new THREE.SphereGeometry(0.045, 8, 6); K.own.push(dg);
    pieces.forEach(pc => {
      const sh = pc.userData.sh; if (!sh.pts) return;
      sh.pts.forEach(q => { const r = rotP(q, sh.rot || 0), sz = size * sh.s; const d = new THREE.Mesh(dg, lam(0xff5d8f, { em: 0x551020 }));
        d.position.set(r[0] * sz, r[1] * sz, 0.08);
        pc.add(d); dots.push(d); });
    });
    if (K.top) K.top();
  };
  const { FACT, ALLE, FANT, SER } = TXT;
  // step 1 look-back: the shapes she chose pulse one by one (her answer acted out)
  K.lookBack(async () => { await say('sp_f65_lb'); for (const i of value()) { if (S.ended) break; await bounce(pieces[i], 0.12); } });
  // misconception tags (SYNTHESIS §5.L): a look-alike chosen (NEAR-SHAPE), only the turned / skinny members missed (PROTOTYPE)
  const tagHunt = v => {
    const set = new Set(Array.isArray(v) ? v : []), extra = [...set].filter(i => !item.target.includes(i)), miss = item.target.filter(i => !set.has(i));
    if (extra.some(i => NEAR[p.cls].includes(geoClass(shapes[i])))) return 'NEAR-SHAPE';
    if (miss.length && miss.every(i => shapes[i].atyp)) return 'PROTOTYPE';
    return extra.length ? 'EXTRA' : 'MISSING';
  };
  S.tagOf = v => Array.isArray(v) ? tagHunt(v) : (Math.abs(+v - p.count2.n) === 1 ? 'NEAR' : 'OTHER');
  // hint (targeted by her error, never which ones): the shape fact, a question about the sides / corners, corner dots on EVERY shape
  const CHECK = { trekant: 'sp_f65_rette', firkant: 'sp_f65_rette', sirkel: null, kvadrat: 'sp_f65_like', rektangel: 'sp_f65_hj_rette' };
  K.hint(async (tag, v) => {
    const tg = Array.isArray(v) ? tagHunt(v) : tag;
    await say('sp_fakta', { s: FACT[p.cls] });
    if (tg === 'NEAR-SHAPE' && CHECK[p.cls]) await say(CHECK[p.cls]);
    cornerDots(true);
    if (tg === 'PROTOTYPE' || (K.sup >= 1 && p.cls !== 'sirkel' && tg !== 'NEAR-SHAPE')) await say('sp_f65_snudd');
    else await say('sp_f65_hjorner');
  });
  K.sol(async () => { cornerDots(false); w.solution(); await say('kit_sol_tapall'); });
  S.pre = async () => { await say('sp_fakta', { s: FACT[p.cls] }); cornerDots(true); await say('sp_f65_hjorner'); };
  S.replay = () => say('sp_alle', { s: ALLE[p.cls] });
  await K.prompt(castle ? 'sp_f65_slott' : 'sp_f65_marked');
  S.speaking = true;
  try { await say('sp_alle', { s: ALLE[p.cls] }); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
  if (K.sup === 0) await K.talk([['kit_ferdig']]);
  await S.arm({ answer: item.target, check: check1 });
  // ---- step 2: count (the same kind she found – they stay lit – or a second kind)
  cornerDots(false); solSet = null;
  done.remove();
  const c2 = p.count2;
  if (!c2.same) { sel.clear(); }
  look();
  const mem2 = pieces.map((pc, i) => inCls(c2.cls, geoClass(pc.userData.sh)) ? i : -1).filter(i => i >= 0);
  SPACE.cur.st.step = 2; step2 = true;
  K.lookBack(async v => { if (v != null && /^\d+$/.test(String(v))) await sayHer(+v); });
  // step-2 hint: a counting strategy (one at a time; she may tap the shapes to mark them) – no fact sentence here: «fire hjørner»
  // must never sound like the count she is asked for
  K.hint(async () => { if (!c2.same && c2.cls !== 'sirkel') cornerDots(true); await say('sp_f65_en_og_en'); if (!c2.same) await say('sp_f65_merk'); });
  K.sol(async () => {
    cornerDots(false);
    for (let k = 0; k < mem2.length && !S.ended; k++) { const pc = pieces[mem2[k]]; pc.userData.body.material = lam(0xffffff, { em: 0x555544 }); try { F.sfx.pling(k % 8); } catch (e) {} await sayN(k + 1); }
    if (S.active && S.active.solution) S.active.solution(c2.n);
    await say('core_sol_keys');
  });
  S.pre = async () => { await say('sp_f65_en_og_en'); if (!c2.same) await say('sp_f65_merk'); };
  S.replay = () => say(c2.same ? 'sp_f65_fant' : 'sp_f65_ser', { s: (c2.same ? FANT : SER)[c2.cls] });
  S.speaking = true;
  try { await say(c2.same ? 'sp_f65_fant' : 'sp_f65_ser', { s: (c2.same ? FANT : SER)[c2.cls] }); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
  await K.keypad(c2.n);
  cornerDots(false);
  for (const i of mem2) { sel.add(i); look(); try { F.sfx.pling(sel.size % 8); } catch (e) {} await sleep(110); }
  sparkle(scene.g); await endLine(S, item, 'sp_f65_ok');
  return S.result();
}
defFmt('F65', {
  name: 'Figurjakten', strands: { FORM: [1, 1] }, places: ['castle', 'window', 'market', 'stall', 'bakery', 'any'], family: 'form', think: 'KLASSIFISERE', portable: true,
  tpl: ['sp_alle', 'sp_f65_slott', 'sp_f65_marked'],
  g: it => it.g,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this);
    return runHunt(K, S, item);
  },
});
})();
