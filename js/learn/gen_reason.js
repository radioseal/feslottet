/* Feslottet – F.REASON: item generators for MØNSTER Mø1–Mø5, LOGIKK Lo1–Lo3, ORD Or1 and DATA D1 (DESIGN4 §4.3, SYNTHESIS §2.3/2.4/2.5).
   Owner: WP-M.  Pure JS (no THREE/DOM) – runs in the browser and in Node (tests/v4_wpm.js --node runs F.REASON.selfTest()).
   Registered with F.BANKS.reg(strand, fn, {rungs}) (ladders.js, WP-E); queued in F.REGQ when the registry is not there yet.

   F.REASON.gen(strand, rung, sup, rng, o) -> item | null      o = {format, sub, key, avoid, theme}  (format picks a shape the format can run)
     v5 (WP-E2): o.avoid (recent Leitner keys) is honoured for Lo1 / Or1 / D1 (up to 5 fresh draws); o.theme (F.LEARN.themeOf: the animal
     of an encounter) puts the animal among «the many» in odd-one-out, into riddles / sorting sets / tap-all (its category or its food),
     its things into Mø1 bead patterns (surface 'tema': model tokens), and params.hopper on Mø3/Mø4 for hoppers – params.themed says
     which ('odd'|'riddle'|'sort'|'tapall'|'pattern'|'hopper').
   Every item fills the DESIGN4 §2.9 contract: strand, rung, sup, key, target (=answer), choices (null), distractors [{v, tag}], params,
   g (guess probability), mode, think, secret ([]), twin (optional), format (the format it was made for).
   params.kind says which shape it is (formats switch on it):
     'beads'    Mø1 next-3 build   {surface, unit, shown, palette, n}                                   target = [tok, tok, tok]
     'unit'     Mø2 tap where the core ends {surface, unit, shown}                                       target = index of the core's last bead
     'error'    Mø2 find the wrong bead {surface, unit, shown, wrong, fix}                              target = wrong index (fix = right token)
     'abstract' Mø2 same pattern, new things {surface, unit, shown, surface2, palette, len}             target = canonical [0,1,1…] (any bijection)
     'gaps'     Mø3 missing stones {seq (null = gap), full, blanks, step}                               target = [missing values in order]
     'land'     Mø4 tap every landing {lo, hi, start, step, landings}                                  target = landings (sorted asc)
     'where'    Mø4 «Hvor lander den?» {lo, hi, start, step, jumps, land}                                target = land (one stone of 30)
     'wrongst'  Mø4 the wrong stone {seq (shown), full, wrong, step}                                     target = wrong index (fix = full[wrong])
     'grow'     Mø5 next term of a growing voxel pattern {fam, base:[w,d], terms:[heights[]], next, maxH, mirror}  target = next (heights)
     'odd'      Lo1/Or1 odd one out {objs, odd, cat?, reasons?: [{id, ok, icon, label, tag}], valid:[feat], numeric?}
                (numeric: objs are number stones {id:'n57', num:57}; reasons partall/oddetall/tier/under10/likesifre)  target = odd index
     'riddle'   Lo1 elimination riddle {objs, clues:[{f, neg}], answer}                                  target = answer index
     'sudoku'   Lo2 4×4 picture sudoku {grid (−1 = empty), sol, blanks, symbols}                         target = sol string '0123…'
     'lineup'   Lo3 order by clues {kind:'height'|'race', ents:[{id,name,model}], order:[ids], clues:[{tpl, p}], ask}
                                                                                                        target = id (ask first/last) or order[] (line)
     'tapall'   Or1 tap all that belong {objs, cat, answer:[indices]}                                    target = indices (sorted asc)
     'sort'     D1 sort + a second way {objs, rule1:{f, a, b}, ways:[{f, part}], sub:'sort2'|'which'}  target = rule1 partition [0|1 per obj]
   Objects ({id, model, opts?, f:{…features}}) are VOX model ids (castables); colours as opts.c (PAL names).
   Self-test: F.REASON.selfTest(n) recomputes every answer independently and checks every puzzle with a solver (sudoku unique,
   riddles single, odd-one-out unique, line-ups unique, partitions valid). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

/* ---------------------------------------------------------------- small helpers (own copies: pure, rng-driven) */
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const hasModel = id => { const V = F.VOX; return !V || typeof V.has !== 'function' || V.has(id); };
const THINK = { 'MØNSTER': 'MØNSTER', LOGIKK: 'DEDUKSJON', ORD: 'KLASSIFISERE', DATA: 'KLASSIFISERE' };
function item(strand, rung, sup, f) {
  const it = Object.assign({ strand, rung, sup, choices: null, distractors: [], secret: [], think: THINK[strand], word: null, text: null, say: null }, f);
  if (it.answer === undefined) it.answer = it.target;
  if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
  it.params = it.params || {};
  it.g = Math.max(0.0001, Math.min(1, it.g == null ? 0.01 : it.g));
  return it;
}

/* =====================================================================================================================
   1. object table (castable VOX models) with features. null = not clear-cut for a 6-year-old → never used as a clue/reason
   ===================================================================================================================== */
// animal features: cls (fugl|pattedyr|fisk|insekt|annet), legs, fly, farm, sea, pels, fjær
const ANIMALS = {
  and: ['fugl', 2, 1, null, 0, 0, 1], due: ['fugl', 2, 1, 0, 0, 0, 1], 'gås': ['fugl', 2, 1, null, 0, 0, 1], 'høne': ['fugl', 2, null, 1, 0, 0, 1],
  hane: ['fugl', 2, null, 1, 0, 0, 1], svane: ['fugl', 2, 1, 0, 0, 0, 1], ugle: ['fugl', 2, 1, 0, 0, 0, 1], fugl: ['fugl', 2, 1, 0, 0, 0, 1],
  'måke': ['fugl', 2, 1, 0, null, 0, 1],
  mus: ['pattedyr', 4, 0, null, 0, 1, 0], sau: ['pattedyr', 4, 0, 1, 0, 1, 0], katt: ['pattedyr', 4, 0, null, 0, 1, 0], hund: ['pattedyr', 4, 0, null, 0, 1, 0],
  hest: ['pattedyr', 4, 0, 1, 0, 1, 0], gris: ['pattedyr', 4, 0, 1, 0, null, 0], kanin: ['pattedyr', 4, 0, null, 0, 1, 0], ponni: ['pattedyr', 4, 0, 1, 0, 1, 0],
  lam: ['pattedyr', 4, 0, 1, 0, 1, 0], rev: ['pattedyr', 4, 0, 0, 0, 1, 0], geit: ['pattedyr', 4, 0, 1, 0, 1, 0], 'føll': ['pattedyr', 4, 0, 1, 0, 1, 0],
  kalv: ['pattedyr', 4, 0, 1, 0, 1, 0], ekorn: ['pattedyr', 4, 0, 0, 0, 1, 0], elg: ['pattedyr', 4, 0, 0, 0, 1, 0], 'løve': ['pattedyr', 4, 0, 0, 0, 1, 0],
  sebra: ['pattedyr', 4, 0, 0, 0, 1, 0], giraff: ['pattedyr', 4, 0, 0, 0, 1, 0], panda: ['pattedyr', 4, 0, 0, 0, 1, 0], kamel: ['pattedyr', 4, 0, 0, 0, 1, 0],
  koala: ['pattedyr', 4, 0, 0, 0, 1, 0], hval: ['pattedyr', 0, 0, 0, 1, 0, 0], delfin: ['pattedyr', 0, 0, 0, 1, 0, 0], sel: ['pattedyr', null, 0, 0, 1, 1, 0],
  fisk: ['fisk', 0, 0, 0, null, 0, 0], krabbe: ['annet', null, 0, 0, 1, 0, 0], bie: ['insekt', 6, 1, null, 0, null, 0], humle: ['insekt', 6, 1, 0, 0, null, 0],
  frosk: ['annet', 4, 0, 0, 0, 0, 0], snegl: ['annet', 0, 0, null, 0, 0, 0],
};
const CATS = {
  frukt: ['eple', 'pære', 'banan', 'drue', 'kiwi', 'melon', 'plomme', 'sitron', 'mango', 'ananas'],
  'grønnsak': ['gulrot', 'potet', 'agurk', 'løk', 'ert', 'mais'],
  bakst: ['kake', 'bolle', 'vaffel', 'kjeks', 'brød', 'pai'],
  'kjøretøy': ['bil', 'buss', 'sykkel', 'tog', 'båt', 'fly', 'kano', 'trikk', 'skip', 'ferje'],
  'klær': ['lue', 'sko', 'hatt', 'sokk', 'vott', 'skjerf', 'jakke', 'kjole', 'bukse', 'genser'],
  'møbler': ['stol', 'seng', 'bord', 'sofa', 'benk', 'hylle', 'skap', 'krakk'],
  leker: ['ball', 'dukke', 'bamse', 'drage', 'robot', 'kloss', 'jojo'],
  musikk: ['tromme', 'gitar', 'fløyte', 'harpe', 'piano', 'bjelle', 'fiolin', 'tuba'],
  'kjøkken': ['kopp', 'krus', 'skål', 'glass', 'kanne', 'gryte', 'skje', 'gaffel'],
};
// vehicles: hjul / flyter (fly: wheels for landing → null; ferje carries cars, floats)
const VEH = { bil: [1, 0], buss: [1, 0], sykkel: [1, 0], tog: [1, 0], trikk: [1, 0], 'båt': [0, 1], kano: [0, 1], skip: [0, 1], ferje: [0, 1], fly: [null, 0] };
const OBJ = {};
for (const id in ANIMALS) { const a = ANIMALS[id]; OBJ[id] = { id, model: id, cat: 'dyr', cls: a[0], legs: a[1], fly: a[2], farm: a[3], sea: a[4], pels: a[5], 'fjær': a[6] }; }
for (const c in CATS) for (const id of CATS[c]) OBJ[id] = Object.assign({ id, model: id, cat: c }, VEH[id] ? { hjul: VEH[id][0], flyter: VEH[id][1] } : {});
const MAT = { frukt: 1, 'grønnsak': 1, bakst: 1 };
// predicates: feature id -> obj -> true | false | null. Category membership is crisp (null only for unknown animal facts)
const FEAT = {
  frukt: o => o.cat === 'frukt', 'grønnsak': o => o.cat === 'grønnsak', mat: o => !!MAT[o.cat], dyr: o => o.cat === 'dyr',
  fugl: o => o.cat === 'dyr' ? o.cls === 'fugl' : false, 'kjøretøy': o => o.cat === 'kjøretøy', 'klær': o => o.cat === 'klær',
  'møbler': o => o.cat === 'møbler', leker: o => o.cat === 'leker', musikk: o => o.cat === 'musikk', 'kjøkken': o => o.cat === 'kjøkken',
  bein4: o => o.cat !== 'dyr' ? null : o.legs == null ? null : o.legs === 4, bein2: o => o.cat !== 'dyr' ? null : o.legs == null ? null : o.legs === 2,
  fly: o => o.cat !== 'dyr' ? null : o.fly == null ? null : !!o.fly, farm: o => o.cat !== 'dyr' ? null : o.farm == null ? null : !!o.farm,
  sea: o => o.cat !== 'dyr' ? null : o.sea == null ? null : !!o.sea, pels: o => o.cat !== 'dyr' ? null : o.pels == null ? null : !!o.pels,
  'fjær': o => o.cat !== 'dyr' ? null : o['fjær'] == null ? null : !!o['fjær'],
  hjul: o => o.cat !== 'kjøretøy' ? null : o.hjul == null ? null : !!o.hjul, flyter: o => o.cat !== 'kjøretøy' ? null : o.flyter == null ? null : !!o.flyter,
  'rød': o => o.col == null ? null : o.col === 'red', 'blå': o => o.col == null ? null : o.col === 'blue',
  gul: o => o.col == null ? null : o.col === 'yellow', 'grønn': o => o.col == null ? null : o.col === 'green',
};
const CAT_FEATS = ['frukt', 'grønnsak', 'mat', 'dyr', 'fugl', 'kjøretøy', 'klær', 'møbler', 'leker', 'musikk', 'kjøkken'];
const ANIMAL_FEATS = ['bein4', 'bein2', 'fly', 'farm', 'sea', 'pels', 'fjær'];
const COL_FEATS = ['rød', 'blå', 'gul', 'grønn'];
const COLS = { 'rød': 'red', 'blå': 'blue', gul: 'yellow', 'grønn': 'green' };
// reason cards (Lo1) and sort labels (D1): icon + short label; speech id 'rs_r_<feat>' («De andre …»)
const CARD = {
  frukt: ['🍎', 'frukt'], 'grønnsak': ['🥕', 'grønnsaker'], mat: ['🍽️', 'mat'], dyr: ['🐾', 'dyr'], fugl: ['🐦', 'fugler'],
  'kjøretøy': ['🚗', 'kjøretøy'], 'klær': ['👕', 'klær'], 'møbler': ['🪑', 'møbler'], leker: ['🧸', 'leker'], musikk: ['🎵', 'musikk'],
  'kjøkken': ['🥄', 'kjøkken'], bein4: ['🐾', '4 bein'], bein2: ['🐔', '2 bein'], fly: ['🕊️', 'flyr'], farm: ['🚜', 'gården'],
  sea: ['🌊', 'havet'], pels: ['🐻', 'pels'], 'fjær': ['🪶', 'fjær'], hjul: ['🛞', 'hjul'], flyter: ['⛵', 'flyter'],
  'rød': ['🔴', 'rød'], 'blå': ['🔵', 'blå'], gul: ['🟡', 'gul'], 'grønn': ['🟢', 'grønn'],
};
const REASON_FEATS = Object.keys(CARD);
function obj(id, col) { const o = Object.assign({}, OBJ[id]); if (col) { o.col = COLS[col] || col; o.opts = { c: o.col }; } return o; }
const pub = o => { const p = { id: o.id, model: o.model }; if (o.opts) p.opts = o.opts; if (o.col) p.col = o.col; return p; };
const available = ids => ids.filter(id => OBJ[id] && hasModel(OBJ[id].model));
// v5 (WP-E2, DESIGN5 §2.2 / playtest2 V5): the animal of an encounter (o.theme, resolved by F.LEARN.themeOf) – set by gen() for one call
let TH = null;
const OBJ_MODEL_R = { stjerne: 'fx_r_stjerne' };      // f_reason.js draws a «stjerne» token with its own star model
const thAnimal = () => TH && TH.animal && OBJ[TH.animal] && OBJ[TH.animal].cat === 'dyr' && hasModel(OBJ[TH.animal].model) ? TH.animal : null;
const thFood = () => TH && Array.isArray(TH.food) ? TH.food.filter(id => OBJ[id] && hasModel(OBJ[id].model)) : [];
function featVals(objs, f) { return objs.map(o => FEAT[f](o)); }
// which items are singled out by feature f (exactly one differs from the rest; every value known)
function singled(objs, f) {
  const v = featVals(objs, f); if (v.some(x => x == null)) return null;
  const t = v.filter(Boolean).length, n = v.length;
  if (t === n - 1) return v.indexOf(false);
  if (t === 1 && n > 2) return v.indexOf(true);
  return null;
}
// every feature that singles out SOME item → the set of possible odd ones (must be exactly {odd})
function oddSet(objs) {
  const s = new Set();
  for (const f of Object.keys(FEAT)) { const i = singled(objs, f); if (i != null) s.add(i); }
  // two items of the same kind (sel/sel) also single nothing out; identical models never appear together (enforced by callers)
  return s;
}

/* =====================================================================================================================
   2. MØNSTER
   ===================================================================================================================== */
const SURF = {
  perler: ['rød', 'blå', 'gul', 'grønn', 'lilla', 'rosa'],      // coloured beads (F58 draws them)
  former: ['kule', 'kube', 'stjerne', 'hjerte', 'trekant'],      // shaped beads
  himmel: ['sol', 'måne', 'stjerne', 'sky'],                    // sun / moon / star / cloud models
  musikk: ['bjelle', 'tromme', 'fløyte', 'gitar'],              // instruments (abstraction: «gjør det samme med bjellene»)
  frukt: ['eple', 'pære', 'banan', 'plomme', 'sitron'],
};
const UNITS = { 1: [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1]], 2: [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1], [0, 1, 0, 2]] };
const unitName = u => u.map(x => 'ABCD'[x]).join('');
// smallest period of a token sequence
function period(seq) { for (let p = 1; p <= seq.length; p++) { let ok = true; for (let i = p; i < seq.length; i++) if (seq[i] !== seq[i - p]) { ok = false; break; } if (ok) return p; } return seq.length; }
function surfFor(r, sup, avoid) {
  const s = ['perler', 'perler', 'former', 'himmel', 'frukt'].filter(x => x !== avoid);
  return pick(r, sup === 0 ? ['perler', 'himmel'].filter(x => x !== avoid) : s);
}
function tokensFor(r, surface, k) { return shuffle(r, SURF[surface]).slice(0, k); }
function genBeads(rung, sup, r, o) {
  const units = UNITS[1].concat(sup >= 2 ? [[0, 0, 1, 1], [0, 1, 1, 2]] : []);
  const u = pick(r, units), k = Math.max(...u) + 1;
  // theme: the animal's own things (its food, itself) make the pattern; the palette is filled up with sky things
  const tp = TH && Array.isArray(TH.pattern) ? TH.pattern.filter((x, i, a) => x && a.indexOf(x) === i && hasModel(x)) : [];
  const themed = tp.length >= Math.min(2, k) && r() < 0.75;
  const surface = themed ? 'tema' : surfFor(r, sup);
  // (filled with sky things, never with other food: no bananas in a squirrel's pattern – playtest2 «never apples for an animal …»)
  const fill = themed ? shuffle(r, SURF.himmel).filter(x => !tp.includes(x) && hasModel(OBJ_MODEL_R[x] || x)) : [];
  const avail = themed ? shuffle(r, tp).concat(fill) : SURF[surface];
  const pal = Math.min(avail.length, sup === 0 ? Math.max(3, k) : sup === 1 ? Math.max(4, k) : Math.max(5, k + 2));
  const toks = themed ? avail.slice(0, pal) : tokensFor(r, surface, pal);
  const unit = u.map(i => toks[i]);
  // shown: s0 three full units, s1 two units + a bit, s2 two units (or 1.5 for long units) – may stop mid-unit
  const reps = sup === 0 ? 3 : 2;
  const extra = sup === 0 ? 0 : int(r, 0, unit.length - 1);
  const shown = []; for (let i = 0; i < unit.length * reps + extra; i++) shown.push(unit[i % unit.length]);
  const n = 3, target = []; for (let i = 0; i < n; i++) target.push(unit[(shown.length + i) % unit.length]);
  return item('MØNSTER', 1, sup, { key: 'MØNSTER:1:' + unitName(u) + ':' + surface, target, mode: 'build', g: Math.pow(1 / pal, n),
    params: { kind: 'beads', surface, unit, shown, palette: shuffle(r, toks), n, unitName: unitName(u), themed: themed ? 'pattern' : undefined },
    distractors: [{ v: shown.slice(shown.length - n), tag: 'COPY-LAST' }, { v: unit.slice(0, n), tag: 'RESTART-UNIT' }] });
}
function genUnit(sup, r) {
  const u = pick(r, [[0, 1, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1, 2], [0, 0, 1, 1], [0, 1, 2, 2], [0, 1, 0, 2]].slice(0, sup === 0 ? 3 : 7));
  const surface = surfFor(r, sup), toks = tokensFor(r, surface, Math.max(...u) + 1), unit = u.map(i => toks[i]);
  const reps = 3, shown = []; for (let i = 0; i < unit.length * reps; i++) shown.push(unit[i % unit.length]);
  return item('MØNSTER', 2, sup, { key: 'MØNSTER:2:unit:' + unitName(u), target: unit.length - 1, mode: 'scene', g: 1 / shown.length,
    params: { kind: 'unit', surface, unit, shown, unitName: unitName(u) },
    distractors: [{ v: unit.length - 2, tag: 'SHORT-UNIT' }, { v: 2 * unit.length - 1, tag: 'DOUBLE-UNIT' }] });
}
function genError(sup, r) {
  const u = pick(r, [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 0, 1, 1]]);
  const surface = surfFor(r, sup), k = Math.max(...u) + 1, toks = tokensFor(r, surface, Math.min(SURF[surface].length, k + 1)), unit = u.map(i => toks[i]);
  const len = sup === 0 ? unit.length * 3 : unit.length * 3 + int(r, 0, 2);
  const full = []; for (let i = 0; i < Math.max(8, len); i++) full.push(unit[i % unit.length]);
  for (let tries = 0; tries < 40; tries++) {
    const w = int(r, unit.length + 1, full.length - 1);          // never inside the first unit: the core is shown clean
    const alt = toks.filter(t => t !== full[w]);
    const shown = full.slice(); shown[w] = pick(r, alt);
    // the single wrong bead must be the only explanation: no other single change makes it periodic with a period ≤ unit length
    if (!errorUnique(shown, w, unit.length)) continue;
    const fix = sup >= 2;
    return item('MØNSTER', 2, sup, { key: 'MØNSTER:2:error:' + unitName(u), target: w, mode: fix ? 'twostep' : 'scene',
      g: (1 / shown.length) * (fix ? 1 / toks.length : 1),
      params: { kind: 'error', surface, unit, shown, wrong: w, fix: full[w], palette: shuffle(r, toks), twoStep: fix, unitName: unitName(u) },
      distractors: [] });
  }
  return null;
}
// is index w the only bead whose change yields a sequence periodic with period ≤ maxP?
function errorUnique(seq, w, maxP) {
  const toks = Array.from(new Set(seq));
  let hits = 0, hitW = -1;
  for (let i = 0; i < seq.length; i++) for (const t of toks) {
    if (t === seq[i]) continue;
    const s2 = seq.slice(); s2[i] = t;
    if (period(s2) <= maxP && period(s2) < s2.length / 2) { if (hitW !== i) { hits++; hitW = i; } }
  }
  return hits === 1 && hitW === w && period(seq) > maxP;
}
function canon(seq) { const m = new Map(); return seq.map(t => { if (!m.has(t)) m.set(t, m.size); return m.get(t); }); }
function genAbstract(sup, r) {
  const u = pick(r, [[0, 1, 1], [0, 0, 1], [0, 1, 2], [0, 1], [0, 0, 1, 1]].slice(0, sup === 0 ? 3 : 5));
  const surface = pick(r, ['perler', 'former']), toks = tokensFor(r, surface, Math.max(...u) + 1), unit = u.map(i => toks[i]);
  const shown = []; for (let i = 0; i < unit.length * 2; i++) shown.push(unit[i % unit.length]);
  const surface2 = pick(r, ['musikk', 'himmel', 'frukt']), k = Math.max(...u) + 1;
  const pal = Math.min(SURF[surface2].length, k + (sup === 0 ? 0 : 1));
  const palette = tokensFor(r, surface2, pal), len = sup === 0 ? unit.length : unit.length * 2;
  const target = []; for (let i = 0; i < len; i++) target.push(u[i % u.length]);
  // g: share of the pal^len sequences that are isomorphic (bijection of k symbols chosen from pal)
  let iso = 1; for (let i = 0; i < k; i++) iso *= (pal - i);
  return item('MØNSTER', 2, sup, { key: 'MØNSTER:2:abstract:' + unitName(u), target: canon(target), mode: 'build', g: iso / Math.pow(pal, len),
    params: { kind: 'abstract', surface, unit, shown, surface2, palette, len, unitName: unitName(u) }, distractors: [] });
}
function genGaps(sup, r) {
  const steps = sup === 0 ? [1, 2, 10] : sup === 1 ? [1, 2, 10, -1, -10, 5] : [2, 10, -2, -10, 5, -5];
  for (let t = 0; t < 50; t++) {
    const step = pick(r, steps), n = sup === 0 ? 5 : 6;
    const span = Math.abs(step) * (n - 1);
    const lo = 0, hi = 100 - span; if (hi < lo) continue;
    let a = int(r, lo, hi); if (sup === 0 && Math.abs(step) !== 10) a = int(r, 0, Math.min(hi, 30));
    if (Math.abs(step) === 10 && sup >= 1 && a % 10 === 0) a += int(r, 1, 9);   // 93, 83, … not only round tens
    const full = range(0, n - 1).map(i => step > 0 ? a + i * step : a + span + i * step);   // descending rows start high
    if (full.some(v => v < 0 || v > 100)) continue;
    const nb = sup === 0 ? 1 : sup === 1 ? int(r, 1, 2) : 2;
    // blanks never at index 0 and never both adjacent at s1 (two given neighbours somewhere → the step is findable)
    const cand = range(1, n - 1); let blanks = shuffle(r, cand).slice(0, nb).sort((x, y) => x - y);
    if (nb === 2 && (blanks[1] - blanks[0] === 1) && sup < 2) blanks = [blanks[0], Math.min(n - 1, blanks[0] + 2)];
    if (blanks.length === 2 && blanks[0] === blanks[1]) continue;
    const seq = full.map((v, i) => blanks.includes(i) ? null : v);
    // the step must be readable from two given neighbours
    let ok = false; for (let i = 0; i + 1 < n; i++) if (seq[i] != null && seq[i + 1] != null) ok = true;
    if (!ok) continue;
    const target = blanks.map(i => full[i]);
    return item('MØNSTER', 3, sup, { key: 'MØNSTER:3:' + step, target, mode: 'keypad', g: 0.01, twin: 'F52',
      params: { kind: 'gaps', seq, full, blanks, step },
      distractors: target.map(v => ({ v: v + (step > 0 ? 1 : -1), tag: 'STEP-ONE' })) });
  }
  return null;
}
function genLand(sup, r) {
  // (jumps of 10 live in «gaps», «where» and «wrongst»: on a 30-stone path they would land only twice)
  const steps = sup === 0 ? [2, 5] : sup === 1 ? [2, 5, 3] : [2, 5, 3, 4];
  for (let t = 0; t < 40; t++) {
    const step = pick(r, steps), back = sup >= 1 && r() < (sup === 2 ? 0.45 : 0.25);
    const lo = sup === 0 ? 0 : int(r, 0, 7) * 10, hi = lo + 29;
    if (hi > 100) continue;
    let start = back ? hi - int(r, 0, Math.min(step - 1, 6)) : lo + int(r, 0, Math.min(step - 1, sup === 0 ? 2 : 6));   // (shifted below when the path is long)
    if (sup === 0 && !back) start = lo;
    const run = st => { const L = []; for (let v = st + (back ? -step : step); v >= lo && v <= hi; v += back ? -step : step) L.push(v); return L; };
    let landings = run(start);
    // not too many taps: s0 ≤ 7, s1 ≤ 10, s2 ≤ 14 landings – the frog then starts further along the path
    const cap = [7, 10, 14][sup];
    if (landings.length > cap) { start += (back ? -1 : 1) * (landings.length - cap) * step; landings = run(start); }
    if (landings.length < 3 || landings.length > cap) continue;
    const n = hi - lo + 1;
    return item('MØNSTER', 4, sup, { key: 'MØNSTER:4:land:' + (back ? '-' : '+') + step, target: landings.slice().sort((a, b) => a - b), mode: 'subset',
      g: 1 / (Math.pow(2, n - 1) - 1), twin: 'F52',
      params: { kind: 'land', lo, hi, start, step: back ? -step : step, landings, back },
      distractors: [{ v: landings.map(x => x + (back ? -1 : 1)), tag: 'OFF-BY-ONE' }] });
  }
  return null;
}
// Mø4 «Hvor lander den?»: start + j jumps of k → tap ONE stone among 30 (repeated addition, the seed of multiplication)
function genWhere(sup, r) {
  const steps = sup === 0 ? [2, 5, 10] : sup === 1 ? [2, 3, 4, 5, 10] : [3, 4, 5, 10];
  for (let t = 0; t < 60; t++) {
    const step = pick(r, steps), j = int(r, 2, sup === 0 ? 3 : sup === 1 ? 4 : 6), back = sup >= 1 && r() < (sup === 2 ? 0.4 : 0.2);
    const lo = step === 10 ? int(r, 0, 4) * 10 : int(r, 0, 7) * 10, hi = lo + 29;
    if (hi > 100) continue;
    const start = back ? hi - int(r, 0, 4) : lo + int(r, 0, sup === 0 ? 2 : 6);
    const land = start + (back ? -1 : 1) * j * step;
    if (land < lo || land > hi) continue;
    const ds = [[start + (back ? -1 : 1) * (j + 1) * step, 'JUMP-COUNT'], [start + (back ? -1 : 1) * (j - 1) * step, 'JUMP-COUNT'],
      [start + (back ? -1 : 1) * (j + step), 'ADD-NOT-JUMP'], [start + (back ? -1 : 1) * j * (step + 1), 'STEP-SIZE']].filter(d => d[0] >= lo && d[0] <= hi && d[0] !== land);
    return item('MØNSTER', 4, sup, { key: 'MØNSTER:4:where:' + (back ? '-' : '+') + step, target: land, mode: 'scene', g: 1 / 29, twin: 'F52',
      params: { kind: 'where', lo, hi, start, step: back ? -step : step, jumps: j, land, back },
      distractors: ds.map(d => ({ v: d[0], tag: d[1] })).filter((d, i, a) => a.findIndex(x => x.v === d.v) === i) });
  }
  return null;
}
function genWrongStone(sup, r) {
  for (let t = 0; t < 40; t++) {
    const step = pick(r, sup === 0 ? [1, 2, 10] : [2, 5, 10, -5, -10, 3]);
    const n = sup === 0 ? 5 : 6, span = Math.abs(step) * (n - 1);
    const a = int(r, 0, 100 - span), full = range(0, n - 1).map(i => step > 0 ? a + i * step : a + span + i * step);
    const w = int(r, 2, n - 2);               // never the first two: the step must be visible
    const bad = pick(r, [full[w] + 1, full[w] - 1, full[w] + 2, full[w] - 2, full[w] + (Math.abs(step) === 10 ? 1 : 10)].filter(v => v >= 0 && v <= 100 && !full.includes(v)));
    if (bad == null) continue;
    const seq = full.slice(); seq[w] = bad;
    const fix = sup >= 1;
    return item('MØNSTER', 4, sup, { key: 'MØNSTER:4:wrong:' + step, target: w, mode: fix ? 'twostep' : 'scene', g: (1 / n) * (fix ? 0.01 : 1), twin: 'F52',
      params: { kind: 'wrongst', seq, full, wrong: w, step, fix: full[w], twoStep: fix }, distractors: [] });
  }
  return null;
}
// Mø5 growing voxel patterns: heights on a w×d base (row-major, d rows of w); term(n) for n = 1, 2, …
const GROW = {
  tarn2: { name: 'tårn +2', base: [1, 1], term: n => [2 * n - 1], maxN: 4 },                      // 1, 3, 5 → 7
  tarn3: { name: 'tårn +3', base: [1, 1], term: n => [3 * n - 1], maxN: 3 },                      // 2, 5, 8 → 11
  trapp: { name: 'trapp', base: [5, 1], term: n => range(1, 5).map(i => i <= n ? i : 0), maxN: 4, mirror: true },   // 1, 3, 6 → 10
  kvadrat: { name: 'kvadrat', base: [4, 4], term: n => range(0, 15).map(i => (i % 4) < n && Math.floor(i / 4) < n ? 1 : 0), maxN: 3 },   // 1, 4, 9 → 16
  vinkel: { name: 'vinkel', base: [4, 4], term: n => range(0, 15).map(i => ((i % 4) === 0 && Math.floor(i / 4) < n) || (Math.floor(i / 4) === 0 && (i % 4) < n) ? 1 : 0), maxN: 3 },  // 1, 3, 5 → 7
  tvilling: { name: 'to tårn', base: [2, 1], term: n => [n, n], maxN: 4 },                        // 2, 4, 6 → 8
  mur: { name: 'mur', base: [4, 1], term: n => range(1, 4).map(i => i <= n ? 2 : 0), maxN: 3, mirror: true },     // 2, 4, 6 → 8
};
const GROW_SUP = { 0: ['tarn2', 'tvilling', 'mur'], 1: ['tarn2', 'tvilling', 'trapp', 'vinkel', 'mur'], 2: ['trapp', 'kvadrat', 'vinkel', 'tarn3', 'tvilling'] };
const sum = a => a.reduce((s, x) => s + x, 0);
function genGrow(sup, r) {
  const fam = pick(r, GROW_SUP[sup] || GROW_SUP[1]), G0 = GROW[fam];
  const shownN = sup === 0 ? 3 : Math.min(G0.maxN, 3);
  const terms = range(1, shownN).map(G0.term), next = G0.term(shownN + 1);
  return item('MØNSTER', 5, sup, { key: 'MØNSTER:5:' + fam, target: next, mode: 'build', g: 0.01,
    params: { kind: 'grow', fam, base: G0.base, terms, next, counts: terms.map(sum), nextCount: sum(next), maxH: Math.max(4, Math.max(...next) + 2), mirror: !!G0.mirror },
    distractors: [{ v: sum(next) - 1, tag: 'OFF-BY-ONE' }, { v: sum(terms[terms.length - 1]) + 1, tag: 'ADD-ONE' }] });
}

/* =====================================================================================================================
   3. LOGIKK
   ===================================================================================================================== */
// Lo1 odd one out with a reason card (2T); Or1 odd one out (category only, no reason)
const ODD_PLANS = [
  // [shared feature, pool of the many, pool of the odd one]
  ['fugl', () => available(Object.keys(ANIMALS).filter(id => ANIMALS[id][0] === 'fugl')), () => available(['katt', 'hund', 'gris', 'sau', 'hest', 'kanin', 'mus', 'rev', 'geit', 'bie', 'humle'])],
  ['frukt', () => available(CATS.frukt), () => available(CATS['grønnsak'])],
  ['grønnsak', () => available(CATS['grønnsak']), () => available(CATS.frukt)],
  ['bein4', () => available(['katt', 'hund', 'hest', 'sau', 'gris', 'kanin', 'rev', 'geit', 'elg', 'løve', 'sebra', 'ekorn', 'kalv']), () => available(['and', 'høne', 'ugle', 'svane', 'due', 'fisk', 'snegl', 'bie', 'hval'])],
  ['farm', () => available(['sau', 'gris', 'hest', 'geit', 'høne', 'kalv', 'lam', 'føll', 'hane']), () => available(['rev', 'elg', 'ekorn', 'løve', 'giraff', 'sebra', 'ugle', 'hval', 'panda', 'koala'])],
  ['sea', () => available(['hval', 'delfin', 'sel', 'krabbe']), () => available(['hest', 'katt', 'ekorn', 'rev', 'ugle', 'sau'])],
  ['fly', () => available(['ugle', 'svane', 'due', 'måke', 'bie', 'humle', 'fugl']), () => available(['katt', 'hund', 'gris', 'frosk', 'snegl', 'fisk', 'mus', 'hest'])],
  ['kjøretøy', () => available(CATS['kjøretøy']), () => available(CATS.leker.concat(CATS['møbler']))],
  ['klær', () => available(CATS['klær']), () => available(CATS['kjøkken'].concat(CATS.leker))],
  ['møbler', () => available(CATS['møbler']), () => available(CATS['klær'].concat(CATS.musikk))],
  ['leker', () => available(CATS.leker), () => available(CATS['kjøkken'].concat(CATS['klær']))],
  ['musikk', () => available(CATS.musikk), () => available(CATS.leker.concat(CATS['kjøkken']))],
  ['kjøkken', () => available(CATS['kjøkken']), () => available(CATS.musikk.concat(CATS['møbler']))],
  ['hjul', () => available(['bil', 'buss', 'sykkel', 'tog', 'trikk']), () => available(['båt', 'kano', 'skip', 'ferje'])],
  ['mat', () => available(CATS.frukt.concat(CATS.bakst, CATS['grønnsak'])), () => available(CATS.leker.concat(CATS['klær']))],
];
const OR1_CATS = ['frukt', 'grønnsak', 'fugl', 'kjøretøy', 'klær', 'møbler', 'leker', 'musikk', 'kjøkken', 'mat', 'dyr'];
function genOdd(strand, rung, sup, r, o) {
  const withReason = strand === 'LOGIKK';
  const plans = ODD_PLANS.filter(p => withReason || OR1_CATS.includes(p[0]));
  // theme: the animal (else its food) stands among «the many» – the odd one is never the animal she is meeting
  const an = thAnimal(), fd = thFood(), tid = an || fd[0] || null;
  const tPlans = tid ? plans.filter(p => p[1]().includes(tid) && !p[2]().includes(tid)) : [];
  const useT = tPlans.length && r() < 0.75;
  for (let t = 0; t < 80; t++) {
    const [f, many, odd] = pick(r, useT && t < 40 ? tPlans : plans);
    let M = shuffle(r, many()); const Od = shuffle(r, odd()).filter(id => id !== tid);
    if (useT && t < 40 && M.includes(tid)) M = [tid].concat(M.filter(id => id !== tid));
    const n = sup === 0 ? 4 : sup === 1 ? 5 : 6;
    if (M.length < n - 1 || !Od.length) continue;
    const ids = M.slice(0, n - 1).concat([Od[0]]);
    const objs = shuffle(r, ids).map(id => obj(id));
    const oi = objs.findIndex(x => x.id === Od[0]);
    const os = oddSet(objs);
    if (os.size !== 1 || !os.has(oi)) continue;
    // reasons that are TRUE: every other object has the feature and the odd one does not
    const valid = REASON_FEATS.filter(g => { const v = featVals(objs, g); return v.every(x => x != null) && v.every((x, i) => i === oi ? !x : x); });
    if (!valid.includes(f)) continue;
    let reasons = null, g = 1 / n;
    if (withReason) {
      // false reasons: known for every object, some of the others have it, not all → «De andre …» is false
      // «De andre …» is false when it is known for every OTHER object and some – not all – of them have it (plausible, not silly)
      const falseR = shuffle(r, REASON_FEATS.filter(h => !valid.includes(h) && !(f === 'fugl' && h === 'dyr')).filter(h => {
        const others = featVals(objs, h).filter((_, i) => i !== oi); if (others.some(x => x == null)) return false;
        return others.some(Boolean) && !others.every(Boolean);
      }));
      const k = sup === 0 ? 2 : sup === 1 ? 3 : 4;
      // plausible false cards first; fill with crisp category cards that none of the others has
      // the trap card: it describes the ODD one («De andre er fugler» when the odd one is the bird) – the classic mix-up
      const trapR = shuffle(r, REASON_FEATS.filter(h => !valid.includes(h) && !falseR.includes(h)).filter(h => {
        const v = featVals(objs, h); return v[oi] === true && v.every((x, i) => i === oi || x === false);
      }));
      const fill = shuffle(r, CAT_FEATS.filter(h => !valid.includes(h) && featVals(objs, h).filter((_, i) => i !== oi).every(x => x === false)));
      const mix = []; for (let q = 0; q < 4; q++) { if (falseR[q]) mix.push(falseR[q]); if (trapR[q]) mix.push(trapR[q]); }
      const fl = mix.concat(fill).filter((h, i, a) => a.indexOf(h) === i).slice(0, k - 1);
      if (fl.length < k - 1) continue;
      reasons = shuffle(r, [f].concat(fl)).map(id => ({ id, ok: valid.includes(id), icon: CARD[id][0], label: CARD[id][1],
        tag: valid.includes(id) ? null : trapR.includes(id) ? 'DESCRIBES-ODD' : falseR.includes(id) ? 'NOT-ALL' : 'OTHER' }));
      g = (1 / n) * (1 / reasons.length);
    }
    return item(strand, rung, sup, { key: strand + ':' + rung + ':odd:' + f, target: oi, mode: withReason ? 'twostep' : 'scene', g,
      params: { kind: 'odd', objs: objs.map(pub), odd: oi, cat: f, reasons, valid, twoStep: withReason, themed: tid && ids.includes(tid) ? 'odd' : undefined },
      distractors: objs.map((x, i) => i === oi ? null : { v: i, tag: 'NOT-ODD' }).filter(Boolean).concat((reasons || []).filter(c => !c.ok).map(c => ({ v: c.id, tag: c.tag }))) });
  }
  return null;
}
// Lo1 with numbers («2, 4, 7, 8 → 7»): number stones; the reason is a number property
const NUMF = { partall: v => v % 2 === 0, oddetall: v => v % 2 === 1, tier: v => v % 10 === 0, under10: v => v < 10, likesifre: v => v >= 11 && v < 100 && v % 11 === 0 };
const NUMCARD = { partall: ['2·4·6', 'partall'], oddetall: ['1·3·5', 'oddetall'], tier: ['🔟', 'hele tiere'], under10: ['✋', 'under ti'], likesifre: ['👯', 'like sifre'] };
const numVals = (vals, f) => vals.map(NUMF[f]);
function numSingled(vals, f) { const v = numVals(vals, f), t = v.filter(Boolean).length; if (t === v.length - 1) return v.indexOf(false); if (t === 1 && v.length > 2) return v.indexOf(true); return null; }
const NUM_FAM = { 0: ['tier', 'under10'], 1: ['tier', 'under10', 'partall', 'likesifre'], 2: ['partall', 'likesifre', 'tier'] };
function genOddNum(sup, r) {
  for (let t = 0; t < 80; t++) {
    const fam = pick(r, NUM_FAM[sup]), n = sup === 0 ? 4 : 5, hi = sup === 2 ? 98 : 40;
    let many = [], odd = [];
    if (fam === 'tier') { many = range(1, 9).map(k => k * 10); odd = range(11, 99).filter(v => v % 10); }
    else if (fam === 'under10') { many = range(1, 9); odd = range(11, sup === 0 ? 19 : 30); }
    else if (fam === 'partall') { many = range(2, hi).filter(v => v % 2 === 0); odd = range(3, hi).filter(v => v % 2 === 1); }
    else { many = range(1, 9).map(k => k * 11); odd = range(12, 98).filter(v => v % 11 && Math.abs(Math.floor(v / 10) - v % 10) === 1); }
    const vals = shuffle(r, many).slice(0, n - 1).concat([pick(r, odd)]);
    const order = shuffle(r, vals), oi = order.indexOf(vals[n - 1]);
    const sing = new Set(Object.keys(NUMF).map(f => numSingled(order, f)).filter(i => i != null));
    if (sing.size !== 1 || !sing.has(oi)) continue;
    const valid = Object.keys(NUMF).filter(f => numVals(order, f).every((x, i) => i === oi ? !x : x));
    if (!valid.includes(fam)) continue;
    const others = f => numVals(order, f).filter((_, i) => i !== oi);
    const plaus = shuffle(r, Object.keys(NUMF).filter(f => !valid.includes(f) && others(f).some(Boolean) && !others(f).every(Boolean)));
    const trap = shuffle(r, Object.keys(NUMF).filter(f => !valid.includes(f) && NUMF[f](order[oi]) && others(f).every(x => !x)));
    const fill = shuffle(r, Object.keys(NUMF).filter(f => !valid.includes(f) && !plaus.includes(f) && !trap.includes(f)));
    const k = sup === 0 ? 2 : 3;
    const fl = plaus.slice(0, 1).concat(trap.slice(0, 1), plaus.slice(1), fill).filter((h, i, a) => a.indexOf(h) === i).slice(0, k - 1);
    if (fl.length < k - 1) continue;
    const reasons = shuffle(r, [fam].concat(fl)).map(id => ({ id, ok: valid.includes(id), icon: NUMCARD[id][0], label: NUMCARD[id][1], num: true,
      tag: valid.includes(id) ? null : trap.includes(id) ? 'DESCRIBES-ODD' : plaus.includes(id) ? 'NOT-ALL' : 'OTHER' }));
    return item('LOGIKK', 1, sup, { key: 'LOGIKK:1:oddnum:' + fam, target: oi, mode: 'twostep', g: (1 / n) * (1 / reasons.length),
      params: { kind: 'odd', numeric: true, objs: order.map(v => ({ id: 'n' + v, num: v, model: 'fx_n_stein' })), odd: oi, cat: fam, reasons, valid, twoStep: true },
      distractors: order.map((v, i) => i === oi ? null : { v: i, tag: 'NOT-ODD' }).filter(Boolean).concat(reasons.filter(c => !c.ok).map(c => ({ v: c.id, tag: c.tag }))) });
  }
  return null;
}
// Lo1 elimination riddle «Jeg er … Jeg har … Hvem er jeg?» over 6–8 animals
const CLUE_FEATS = ['bein4', 'bein2', 'fly', 'farm', 'sea', 'pels', 'fjær'];
const RIDDLE_POOL = ['and', 'due', 'svane', 'ugle', 'høne', 'sau', 'katt', 'hund', 'hest', 'gris', 'kanin', 'rev', 'geit', 'ekorn', 'elg', 'løve', 'sebra',
  'giraff', 'hval', 'delfin', 'sel', 'fisk', 'bie', 'frosk', 'snegl', 'kalv', 'lam', 'måke', 'krabbe'];
const clueOk = (o, c) => { const v = FEAT[c.f](o); return v == null ? null : (c.neg ? !v : !!v); };
function riddleSolve(objs, clues) { return objs.map((o, i) => clues.every(c => clueOk(o, c) === true) ? i : -1).filter(i => i >= 0); }
function genRiddle(sup, r) {
  const n = sup === 0 ? 6 : 8, want = sup === 0 ? 2 : sup === 1 ? [2, 3] : [3, 3];
  const an = thAnimal();
  for (let t = 0; t < 120; t++) {
    let ids = shuffle(r, available(RIDDLE_POOL)).slice(0, n);
    if (an && t < 80 && !ids.includes(an)) ids = [an].concat(ids.slice(0, n - 1));
    ids = shuffle(r, ids);
    if (ids.length < n) return null;
    const objs = ids.map(id => obj(id));
    // (the animal she is meeting is one of the animals, never the answer – its name is kept for Navnelappen, playtest2 R4)
    let ai = int(r, 0, n - 1); if (an && objs[ai].id === an) ai = (ai + 1 + int(r, 0, n - 2)) % n;
    const a = objs[ai];
    let left = objs.map((_, i) => i).filter(i => i !== ai);
    const clues = [];
    const feats = shuffle(r, CLUE_FEATS);
    for (const f of feats) {
      if (!left.length) break;
      // the clue must be known for every candidate and true for the answer
      if (objs.some(x => FEAT[f](x) == null)) continue;
      const av = FEAT[f](a);
      // prefer negative clues at s2 («Jeg kan ikke fly») – they train elimination
      const neg = sup >= 1 ? (av === false) : av === false && r() < 0.3;
      if (sup === 0 && av === false && !neg) continue;
      const c = { f, neg };
      const rem = left.filter(i => clueOk(objs[i], c) === true);
      if (rem.length === left.length) continue;              // eliminates nobody: useless
      clues.push(c); left = rem;
    }
    if (left.length) continue;
    const lo = Array.isArray(want) ? want[0] : want, hi = Array.isArray(want) ? want[1] : want;
    if (clues.length < lo || clues.length > hi) continue;
    // every clue must be needed (drop-one still single → redundant)
    if (clues.some((_, k) => riddleSolve(objs, clues.filter((__, j) => j !== k)).length === 1)) continue;
    if (riddleSolve(objs, clues).length !== 1) continue;
    return item('LOGIKK', 1, sup, { key: 'LOGIKK:1:riddle:' + a.id, target: ai, mode: 'scene', g: 1 / n,
      params: { kind: 'riddle', objs: objs.map(pub), clues, answer: ai, themed: an && ids.includes(an) ? 'riddle' : undefined },
      distractors: objs.map((x, i) => i === ai ? null : { v: i, tag: clues.every(c => clueOk(x, c)) ? 'OTHER' : 'MISSED-CLUE' }).filter(Boolean) });
  }
  return null;
}
// Lo2 4×4 picture sudoku with a uniqueness solver
const BOX = i => (Math.floor(Math.floor(i / 4) / 2) * 2) + Math.floor((i % 4) / 2);
function sudokuOk(g) {
  for (let i = 0; i < 16; i++) { if (g[i] < 0) continue; for (let j = i + 1; j < 16; j++) { if (g[j] !== g[i]) continue;
    if (Math.floor(i / 4) === Math.floor(j / 4) || i % 4 === j % 4 || BOX(i) === BOX(j)) return false; } }
  return true;
}
function sudokuCount(g, limit) {
  g = g.slice(); let n = 0; limit = limit || 2;
  const rec = () => {
    const i = g.indexOf(-1); if (i < 0) { n++; return; }
    for (let v = 0; v < 4 && n < limit; v++) {
      let ok = true;
      for (let j = 0; j < 16; j++) if (g[j] === v && (Math.floor(i / 4) === Math.floor(j / 4) || i % 4 === j % 4 || BOX(i) === BOX(j))) { ok = false; break; }
      if (ok) { g[i] = v; rec(); g[i] = -1; }
    }
  };
  rec(); return n;
}
function sudokuFull(r) {
  const g = new Array(16).fill(-1);
  const rec = i => {
    if (i === 16) return true;
    for (const v of shuffle(r, [0, 1, 2, 3])) { g[i] = v; if (sudokuOk(g) && rec(i + 1)) return true; }
    g[i] = -1; return false;
  };
  rec(0); return g;
}
function genSudoku(sup, r) {
  const k = sup === 0 ? int(r, 1, 2) : sup === 1 ? int(r, 3, 4) : int(r, 5, 6);
  for (let t = 0; t < 30; t++) {
    const sol = sudokuFull(r), grid = sol.slice();
    const order = shuffle(r, range(0, 15)); let removed = 0;
    for (const i of order) {
      if (removed >= k) break;
      const v = grid[i]; grid[i] = -1;
      if (sudokuCount(grid, 2) !== 1) { grid[i] = v; continue; }
      removed++;
    }
    if (removed !== k) continue;
    // s1: «3 tomme i 2 bokser» – the blanks spread over ≥ 2 boxes; s0: 1 per row (easiest scan)
    const blanks = range(0, 15).filter(i => grid[i] < 0);
    if (sup >= 1 && new Set(blanks.map(BOX)).size < 2) continue;
    return item('LOGIKK', 2, sup, { key: 'LOGIKK:2:' + k, target: sol.join(''), mode: 'grid', g: Math.pow(0.25, k),
      params: { kind: 'sudoku', grid, sol, blanks, symbols: ['tulipan', 'rose', 'solsikke', 'lilje'] }, distractors: [] });
  }
  return null;
}
// Lo3 order by clues (transitive); F71 «Rekka» line-up mode, and F79 Bildehylla (WP-L) – the item carries everything it needs
// v5d WP-K3 (logic #57, agreed with WP-R3's SETS.BARN_NAVN in lines_prob.js): the line-up children are the shared story children
// Ola, Ida, Ali, Emma (Per is the postman, Kari the cook) – lines_reason.js KIDS / F.LO3name already speak these names
const LO3 = {
  height: { ents: [{ id: 'Ola', model: 'ch_person', opts: { age: 'barn', hair: 'kort', hairCol: 'hairBrown', outfit: 'bukse', outfitCol: 'sky', pantsCol: 'jeansBlue' } },
      { id: 'Ida', model: 'ch_person', opts: { age: 'barn', hair: 'fletter', hairCol: 'hairBlond', outfit: 'kjole', outfitCol: 'coral', lashes: true } },
      { id: 'Ali', model: 'ch_person', opts: { age: 'barn', hair: 'pigger', hairCol: 'hairRed', outfit: 'bukse', outfitCol: 'green', pantsCol: 'navySoft' } },
      { id: 'Emma', model: 'ch_person', opts: { age: 'barn', hair: 'hestehale', hairCol: 'hairBlack', outfit: 'kjole', outfitCol: 'lilac', lashes: true } }],
    more: 'lo3_hoyere', less: 'lo3_lavere', first: 'lo3_ask_hoyest', last: 'lo3_ask_lavest', line: 'lo3_ask_linje_h', abs: null },
  race: { ents: [{ id: 'Tass', model: 'hund' }, { id: 'Pus', model: 'katt' }, { id: 'Mus', model: 'mus' }, { id: 'Nøff', model: 'gris' }],
    more: 'lo3_for', less: 'lo3_etter', first: 'lo3_ask_forst', last: 'lo3_ask_sist', line: 'lo3_ask_linje_r', abs: { first: 'lo3_kom_forst', last: 'lo3_kom_sist' } },
};
// clue {a, b, rel:'>'} means a before b in the answer order (taller / earlier). abs {a, pos:'first'|'last'}
function lineupSolve(ids, clues) {
  const out = [];
  const perm = (a, k) => {
    if (k === a.length) {
      const pos = {}; a.forEach((x, i) => { pos[x] = i; });
      if (clues.every(c => c.pos ? (c.pos === 'first' ? pos[c.a] === 0 : pos[c.a] === a.length - 1) : pos[c.a] < pos[c.b])) out.push(a.slice());
      return;
    }
    for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  };
  perm(ids.slice(), 0); return out;
}
function genLineup(sup, r) {
  const kind = pick(r, ['height', 'race']), L = LO3[kind];
  // v5 (WP-L request): «who is first / last?» among 3 is a 1-in-3 guess – first/last is asked among 4 only (s1, g .25); s0 and the
  // rest of s1 line up the whole row (3: g 1/6, 4: g 1/24)
  const ask0 = sup === 0 ? 'line' : sup === 1 ? pick(r, ['first', 'last', 'line', 'line']) : 'line';
  const n = sup === 0 ? 3 : sup === 1 ? (ask0 === 'line' ? pick(r, [3, 4]) : 4) : 4;
  for (let t = 0; t < 60; t++) {
    const ents = shuffle(r, L.ents).slice(0, n), order = ents.map(e => e.id);
    // adjacent clues (n-1), stated with «more» or «less» wording, in shuffled order; at s2 one absolute clue may replace a pair
    let clues = [];
    for (let i = 0; i + 1 < n; i++) clues.push({ a: order[i], b: order[i + 1] });
    if (sup >= 2 && L.abs && r() < 0.5) { clues.pop(); clues.push({ a: order[n - 1], pos: 'last' }); }
    clues = shuffle(r, clues);
    const ask = ask0;
    const sols = lineupSolve(order, clues);
    if (ask === 'line' && sols.length !== 1) continue;
    if (ask !== 'line' && new Set(sols.map(s => ask === 'first' ? s[0] : s[n - 1])).size !== 1) continue;
    const said = clues.map(c => {
      if (c.pos) return { tpl: L.abs[c.pos], p: c.a };
      const useLess = sup >= 1 && r() < 0.5;          // «Mus er lavere enn Pus» – the reversed wording is the trap
      return useLess ? { tpl: L.less, p: c.b + '|' + c.a } : { tpl: L.more, p: c.a + '|' + c.b };
    });
    const target = ask === 'line' ? order.slice() : ask === 'first' ? order[0] : order[n - 1];
    return item('LOGIKK', 3, sup, { key: 'LOGIKK:3:' + kind + ':' + n + ':' + ask, target, mode: ask === 'line' ? 'order' : 'chips',
      g: ask === 'line' ? 1 / (n === 3 ? 6 : 24) : 1 / n, twin: 'F79',
      params: { kind: 'lineup', lineup: kind, ents, order, clues: said, rel: clues, ask, askTpl: L[ask] }, distractors: [] });
  }
  return null;
}

/* =====================================================================================================================
   4. ORD Or1 (tap all that belong / odd one out) and DATA D1 (sort, then a second way)
   ===================================================================================================================== */
const NEAR = {   // near categories → the distractors that make tap-all a real decision (tag NEAR-CAT)
  frukt: ['grønnsak', 'bakst'], 'grønnsak': ['frukt'], fugl: ['dyrx'], 'kjøretøy': ['leker'], 'klær': ['møbler', 'kjøkken'], 'møbler': ['klær', 'kjøkken'],
  leker: ['musikk', 'kjøkken'], musikk: ['leker'], 'kjøkken': ['møbler', 'leker'], mat: ['kjøkken', 'leker'], dyr: ['leker', 'kjøretøy'],
};
function members(cat) {
  if (cat === 'fugl') return available(Object.keys(ANIMALS).filter(id => ANIMALS[id][0] === 'fugl'));
  if (cat === 'dyrx') return available(['katt', 'hund', 'bie', 'humle', 'mus', 'kanin', 'gris', 'frosk', 'ekorn']);   // non-birds; bie/humle fly
  if (cat === 'dyr') return available(Object.keys(ANIMALS));
  if (cat === 'mat') return available(CATS.frukt.concat(CATS['grønnsak'], CATS.bakst));
  return available(CATS[cat] || []);
}
function genTapAll(sup, r) {
  const an = thAnimal(), fd = thFood();
  const tCats = OR1_CATS.filter(c => (an && members(c).includes(an)) || fd.some(x => members(c).includes(x)));
  const useT = tCats.length && r() < 0.7;
  for (let t = 0; t < 40; t++) {
    const cat = pick(r, useT && t < 20 ? tCats : OR1_CATS), n = sup === 0 ? 6 : 8;
    let yes = shuffle(r, members(cat)); const k = sup === 0 ? int(r, 2, 3) : int(r, 3, 5);
    const own = [an].concat(fd).filter(x => x && yes.includes(x));
    if (useT && own.length) yes = own.concat(yes.filter(x => !own.includes(x)));
    if (yes.length < k) continue;
    const nearPool = shuffle(r, (NEAR[cat] || []).flatMap(members)).filter(id => !yes.includes(id) && FEAT[cat === 'dyrx' ? 'dyr' : cat](OBJ[id]) === false);
    const farPool = shuffle(r, Object.keys(OBJ).filter(id => hasModel(OBJ[id].model) && FEAT[cat](OBJ[id]) === false && !nearPool.includes(id)));
    const nNear = sup === 0 ? 1 : sup === 1 ? 2 : Math.min(n - k, 3);
    const no = nearPool.slice(0, nNear).concat(farPool).filter((x, i, a) => a.indexOf(x) === i).slice(0, n - k);
    if (no.length < n - k) continue;
    const objs = shuffle(r, yes.slice(0, k).concat(no)).map(id => obj(id));
    const answer = objs.map((o, i) => FEAT[cat](o) ? i : -1).filter(i => i >= 0);
    if (answer.length !== k || objs.some(o => FEAT[cat](o) == null)) continue;
    return item('ORD', 1, sup, { key: 'ORD:1:' + cat, target: answer, mode: 'subset', g: 1 / (Math.pow(2, n) - 1),
      params: { kind: 'tapall', objs: objs.map(pub), cat, answer, themed: objs.some(o => o.id === an || fd.includes(o.id)) ? 'tapall' : undefined },
      distractors: objs.map((o, i) => answer.includes(i) ? null : { v: i, tag: nearPool.includes(o.id) ? 'NEAR-CAT' : 'OTHER' }).filter(Boolean) });
  }
  return null;
}
// D1: two attributes (kind × colour) so two valid sortings exist; or an animal set with two crisp features
const COL_GROUPS = { leker: ['ball', 'kloss', 'kule'], 'klær': ['lue', 'sko', 'hatt', 'sokk', 'vott', 'genser', 'skjerf'], 'kjøretøy': ['bil', 'båt', 'buss', 'sykkel', 'kano'],
  'møbler': ['stol', 'sofa', 'lampe', 'pute'], 'kjøkken': ['kopp', 'krus', 'skål'] };
const partOf = (objs, f) => objs.map(o => FEAT[f](o)).map(v => v == null ? null : v ? 1 : 0);
const samePart = (a, b) => a.length === b.length && (a.every((x, i) => x === b[i]) || a.every((x, i) => x === 1 - b[i]));
function sortWays(objs) {
  // every crisp feature that splits the set into two groups of ≥ 2 → a valid sorting (deduplicated by partition)
  const ways = [];
  for (const f of Object.keys(FEAT)) {
    const p = partOf(objs, f); if (p.some(x => x == null)) continue;
    const ones = p.filter(Boolean).length; if (ones < 2 || ones > p.length - 2) continue;
    if (!ways.some(w => samePart(w.part, p))) ways.push({ f, part: p });
  }
  return ways;
}
function genSort(sup, r, o) {
  const n = sup === 2 ? 8 : 6;
  for (let t = 0; t < 60; t++) {
    let objs;
    if (!(thAnimal() && r() < 0.6) && (r() < 0.7 || sup === 0)) {
      const [c1, c2] = shuffle(r, Object.keys(COL_GROUPS)).slice(0, 2), [k1, k2] = shuffle(r, Object.keys(COLS)).slice(0, 2);
      const p1 = shuffle(r, available(COL_GROUPS[c1])), p2 = shuffle(r, available(COL_GROUPS[c2]));
      if (p1.length < n / 2 || p2.length < n / 2) continue;
      // each kind gets both colours (≥ 1 each), distinct models within a kind
      const half = n / 2, a1 = int(r, 1, half - 1), a2 = int(r, 1, half - 1);
      objs = p1.slice(0, half).map((id, i) => obj(id, i < a1 ? k1 : k2)).concat(p2.slice(0, half).map((id, i) => obj(id, i < a2 ? k1 : k2)));
    } else {
      let ids = shuffle(r, available(['and', 'svane', 'due', 'ugle', 'høne', 'sau', 'katt', 'hest', 'gris', 'rev', 'ekorn', 'elg', 'hval', 'delfin', 'fisk', 'bie', 'kalv', 'geit'])).slice(0, n);
      const an = thAnimal(); if (an && !ids.includes(an)) ids = shuffle(r, [an].concat(ids.slice(0, n - 1)));
      objs = ids.map(id => obj(id));
    }
    objs = shuffle(r, objs);
    const ways = sortWays(objs);
    // the shown rule: a kind/class feature or a colour; there must be ≥ 1 OTHER valid way
    const shownable = ways.filter(w => CARD[w.f]);
    if (shownable.length < 2) continue;
    const rule1 = pick(r, shownable);
    const yesF = rule1.f;
    const sub = o && (o.sub === 'which' || o.sub === 'sort2') ? o.sub : sup >= 1 && r() < 0.25 ? 'which' : 'sort2';
    let cards = null;
    if (sub === 'which' || sup === 0) {
      // rule cards (pairs of crate icons): the true one(s) + a false one
      const others = shuffle(r, Object.keys(CARD).filter(f => !ways.some(w => w.f === f) && partOf(objs, f).every(x => x != null)));
      const truth = sub === 'which' ? rule1.f : pick(r, ways.filter(w => w.f !== rule1.f && CARD[w.f])).f;
      const fl = others.slice(0, sup === 0 ? 1 : 2);
      if (fl.length < (sup === 0 ? 1 : 2)) continue;
      // a colour rule card reads «farge» (the crates hold two colours), every other rule its own picture
      const rc = id => COLS[id] ? ['🎨', 'farge'] : CARD[id];
      cards = shuffle(r, [truth].concat(fl)).map(id => ({ id, ok: ways.some(w => w.f === id && samePart(w.part, partOf(objs, truth))), icon: rc(id)[0], label: rc(id)[1] }));
    }
    // chance to hit SOME other valid sorting by tapping at random (crates may swap): (ways − 1) · 2 / 2^n
    const secondP = Math.min(1, Math.max(1, ways.length - 1) * 2 / Math.pow(2, n));
    const g = sub === 'which' ? secondP / cards.length : Math.pow(0.5, n) * secondP;
    return item('DATA', 1, sup, { key: 'DATA:1:' + sub + ':' + yesF, target: rule1.part, mode: sub === 'which' ? 'twostep' : 'build', g: Math.max(0.0005, g),
      params: { kind: 'sort', sub, objs: objs.map(pub), rule1: { f: rule1.f, icon: CARD[rule1.f], not: true }, ways, cards, twoStep: true,
        themed: thAnimal() && objs.some(x => x.id === thAnimal()) ? 'sort' : undefined }, distractors: [] });
  }
  return null;
}

/* =====================================================================================================================
   5. dispatch per strand / rung / format
   ===================================================================================================================== */
// v5 (WP-E2): o.theme (F.LEARN.themeOf: {animal, food, pattern, hopper …}) themes one call; o.avoid (the engine's recent Leitner keys)
// is honoured for LOGIKK Lo1, ORD Or1 and DATA D1 – up to 5 fresh draws before a recent key may repeat (WP-E request: keys like
// 'DATA:1:sort2:blå' came back within 10 tasks)
function gen(strand, rung, sup, rng, o) {
  o = o || {};
  const prevTH = TH; TH = o.theme && typeof o.theme === 'object' ? o.theme : null;
  try {
    const avoid = new Set(Array.isArray(o.avoid) ? o.avoid : []);
    const fam = rung === 1 && (strand === 'LOGIKK' || strand === 'ORD' || strand === 'DATA') && !o.key && avoid.size;
    let it = gen1(strand, rung, sup, rng, o);
    for (let i = 0; fam && it && avoid.has(it.key) && i < 5; i++) { const x = gen1(strand, rung, sup, rng, o); if (x) it = x; }
    if (it && TH && TH.hopper && (it.params.kind === 'gaps' || it.params.kind === 'land' || it.params.kind === 'where' || it.params.kind === 'wrongst')) {
      it.params.hopper = TH.hopper; it.params.themed = it.params.themed || 'hopper';
    }
    if (it && it.params && it.params.themed === undefined) delete it.params.themed;
    return it;
  } finally { TH = prevTH; }
}
function gen1(strand, rung, sup, rng, o) {
  const r = rng || Math.random; sup = Math.max(0, Math.min(2, sup == null ? 1 : sup | 0));
  const fmt = o.format || null;
  // a review / Leitner key names the item family ('MØNSTER:4:wrong:5', 'LOGIKK:1:riddle:ugle', 'ORD:1:odd:frukt') → same sub-type
  let sub = o.sub || null;
  if (!sub && typeof o.key === 'string') { const m = /:(unit|error|abstract|land|where|wrong|oddnum|odd|riddle|which|sort2)(:|$)/.exec(o.key); if (m) sub = m[1]; }
  let it = null;
  if (strand === 'MØNSTER') {
    if (rung === 1) it = genBeads(1, sup, r, o);
    else if (rung === 2) { const s = sub || pick(r, ['unit', 'error', 'error', 'abstract']); it = s === 'unit' ? genUnit(sup, r) : s === 'abstract' ? genAbstract(sup, r) : genError(sup, r); }
    else if (rung === 3) it = genGaps(sup, r);
    else if (rung === 4) { const u = r(), s = sub || (u < 0.45 ? 'land' : u < 0.75 ? 'where' : 'wrong'); it = s === 'wrong' ? genWrongStone(sup, r) : s === 'where' ? genWhere(sup, r) : genLand(sup, r); }
    else if (rung === 5) it = genGrow(sup, r);
  } else if (strand === 'LOGIKK') {
    if (rung === 1) {
      const u = r(), s = sub || (u < 0.42 ? 'odd' : u < 0.8 ? 'riddle' : 'oddnum');
      it = s === 'riddle' ? genRiddle(sup, r) || genOdd('LOGIKK', 1, sup, r, o) : s === 'oddnum' ? genOddNum(sup, r) || genOdd('LOGIKK', 1, sup, r, o) : genOdd('LOGIKK', 1, sup, r, o);
    }
    else if (rung === 2) it = genSudoku(sup, r);
    else if (rung === 3) it = genLineup(sup, r);
  } else if (strand === 'ORD') {
    if (rung === 1) { const s = sub || (sup === 2 || r() < 0.7 ? 'tapall' : 'odd'); it = s === 'odd' ? genOdd('ORD', 1, sup, r, o) : genTapAll(sup, r); }
  } else if (strand === 'DATA') {
    if (rung === 1) it = genSort(sup, r, Object.assign({}, o, { sub }));
  }
  if (!it) return null;
  if (fmt) it.format = fmt;
  return it;
}
// which format runs which rung (the formats' spec.strands say the same; F79 is WP-L's)
const FORMAT_OF = { 'MØNSTER': { 1: 'F58', 2: 'F58', 3: 'F52', 4: 'F52', 5: 'F59' }, LOGIKK: { 1: 'F71', 2: 'F74', 3: 'F71' /* + F79 (WP-L) */ }, ORD: { 1: 'F71' }, DATA: { 1: 'F71' } };
const RUNGS = { 'MØNSTER': [1, 2, 3, 4, 5], LOGIKK: [1, 2, 3], ORD: [1], DATA: [1] };

/* =====================================================================================================================
   6. self-test: independent recomputation + solvers (Node: tests/v4_wpm.js --node)
   ===================================================================================================================== */
function check(it) {
  const p = it.params, bad = m => 'BAD ' + it.strand + ' ' + it.rung + ' s' + it.sup + ' ' + p.kind + ': ' + m;
  if (!(it.g > 0 && it.g <= 1)) return bad('g ' + it.g);
  if (!it.mode || !it.think || !Array.isArray(it.secret)) return bad('contract fields');
  switch (p.kind) {
    case 'beads': {
      const L = p.unit.length; for (let i = 0; i < p.shown.length; i++) if (p.shown[i] !== p.unit[i % L]) return bad('shown');
      for (let i = 0; i < 3; i++) if (it.target[i] !== p.unit[(p.shown.length + i) % L]) return bad('target');
      if (period(p.unit) !== L) return bad('unit not minimal');
      if (!p.unit.every(t => p.palette.includes(t))) return bad('palette');
      if (p.shown.length < 2 * L) return bad('too short');
      return null;
    }
    case 'unit': { if (period(p.shown) !== p.unit.length || it.target !== p.unit.length - 1) return bad('unit'); return null; }
    case 'error': {
      const L = p.unit.length; const diffs = p.shown.map((t, i) => t !== p.unit[i % L] ? i : -1).filter(i => i >= 0);
      if (diffs.length !== 1 || diffs[0] !== it.target || p.fix !== p.unit[it.target % L]) return bad('error index');
      if (!errorUnique(p.shown, it.target, L)) return bad('error not unique'); return null;
    }
    case 'abstract': {
      const c = canon(p.unit); for (let i = 0; i < p.len; i++) if (it.target[i] !== c[i % c.length]) return bad('abstract');
      if (new Set(p.unit).size > p.palette.length) return bad('palette too small'); return null;
    }
    case 'gaps': {
      for (let i = 1; i < p.full.length; i++) if (p.full[i] - p.full[i - 1] !== p.step) return bad('not arithmetic');
      if (p.blanks.some((b, k) => p.full[b] !== it.target[k] || p.seq[b] !== null)) return bad('blanks');
      if (p.full.some(v => v < 0 || v > 100)) return bad('range'); return null;
    }
    case 'land': {
      const L = []; for (let v = p.start + p.step; v >= p.lo && v <= p.hi; v += p.step) L.push(v);
      if (JSON.stringify(L.slice().sort((a, b) => a - b)) !== JSON.stringify(it.target)) return bad('landings');
      if (p.hi - p.lo !== 29 || p.lo < 0 || p.hi > 100) return bad('row'); return null;
    }
    case 'where': {
      if (p.land !== p.start + p.jumps * p.step || it.target !== p.land || p.land < p.lo || p.land > p.hi || p.hi - p.lo !== 29) return bad('where');
      if (it.distractors.some(d => d.v === it.target)) return bad('where distractor');
      return null;
    }
    case 'wrongst': {
      const d = p.seq.map((v, i) => v !== p.full[i] ? i : -1).filter(i => i >= 0);
      if (d.length !== 1 || d[0] !== it.target || p.full[it.target] !== p.fix) return bad('wrong stone');
      for (let i = 1; i < p.full.length; i++) if (p.full[i] - p.full[i - 1] !== p.step) return bad('full');
      // no other single stone could be «the wrong one»: changing any other stone never makes the row arithmetic
      for (let i = 0; i < p.seq.length; i++) { if (i === it.target) continue; const s = p.seq.filter((_, j) => j !== i); const st = s[1] - s[0];
        const idx = p.seq.map((_, j) => j).filter(j => j !== i); if (idx.every((j, k) => k === 0 || (p.seq[j] - p.seq[idx[k - 1]]) === st * (j - idx[k - 1]))) return bad('ambiguous ' + i); }
      return null;
    }
    case 'grow': {
      const G0 = GROW[p.fam]; for (let n = 1; n <= p.terms.length; n++) if (JSON.stringify(G0.term(n)) !== JSON.stringify(p.terms[n - 1])) return bad('terms');
      if (JSON.stringify(G0.term(p.terms.length + 1)) !== JSON.stringify(it.target)) return bad('next');
      if (it.target.length !== p.base[0] * p.base[1]) return bad('base');
      if (sum(it.target) !== p.nextCount) return bad('count');
      // the counts must grow by a rule a child can see: constant difference or a growing difference
      const c = p.counts.concat([p.nextCount]), d = c.slice(1).map((x, i) => x - c[i]);
      if (!(d.every(x => x === d[0]) || d.every((x, i) => i === 0 || x === d[i - 1] + (d[1] - d[0])))) return bad('counts rule');
      return null;
    }
    case 'odd': {
      if (p.numeric) {
        const vals = p.objs.map(x => x.num);
        const sing = new Set(Object.keys(NUMF).map(f => numSingled(vals, f)).filter(i => i != null));
        if (sing.size !== 1 || !sing.has(it.target)) return bad('numeric odd not unique');
        for (const rc of p.reasons) { const tru = numVals(vals, rc.id).every((x, i) => i === it.target ? !x : x); if (tru !== rc.ok) return bad('num reason ' + rc.id); }
        if (!p.reasons.some(c => c.ok)) return bad('no true num reason');
        return null;
      }
      const objs = p.objs.map(x => obj(x.id, Object.keys(COLS).find(k => COLS[k] === x.col)));
      const os = oddSet(objs); if (os.size !== 1 || !os.has(it.target)) return bad('odd not unique ' + [...os]);
      if (p.reasons) {
        const okIds = p.reasons.filter(x => x.ok).map(x => x.id); if (!okIds.length) return bad('no true reason');
        for (const rc of p.reasons) { const v = featVals(objs, rc.id); const tru = v.every((x, i) => i === it.target ? x === false : x === true);
          if (tru !== rc.ok) return bad('reason ' + rc.id + ' ok=' + rc.ok);
          // a false card must be clearly false: known for every other object and not all of them have it
          if (!rc.ok) { const others = v.filter((_, i) => i !== it.target); if (others.some(x => x == null) || others.every(x => x === true)) return bad('unclear false reason ' + rc.id); } }
      }
      return null;
    }
    case 'riddle': {
      const objs = p.objs.map(x => obj(x.id)); const s = riddleSolve(objs, p.clues);
      if (s.length !== 1 || s[0] !== it.target) return bad('riddle ' + s);
      if (p.clues.some(c => objs.some(o => clueOk(o, c) == null))) return bad('null clue'); return null;
    }
    case 'sudoku': {
      if (!sudokuOk(p.sol) || p.sol.some(v => v < 0)) return bad('solution invalid');
      if (sudokuCount(p.grid, 3) !== 1) return bad('not unique');
      if (p.grid.some((v, i) => v >= 0 && v !== p.sol[i])) return bad('givens');
      const k = p.grid.filter(v => v < 0).length, want = it.sup === 0 ? [1, 2] : it.sup === 1 ? [3, 4] : [5, 6];
      if (k < want[0] || k > want[1]) return bad('blanks ' + k); return null;
    }
    case 'lineup': {
      const s = lineupSolve(p.order, p.rel);
      if (p.ask === 'line') { if (s.length !== 1 || JSON.stringify(s[0]) !== JSON.stringify(it.target)) return bad('lineup'); }
      else if (s.some(x => (p.ask === 'first' ? x[0] : x[x.length - 1]) !== it.target)) return bad('lineup ask');
      // the spoken clues say the same thing as the relations
      for (let i = 0; i < p.clues.length; i++) { const c = p.clues[i], rel = p.rel[i];
        if (rel.pos) { if (c.p !== rel.a) return bad('abs clue'); continue; }
        const [a, b] = c.p.split('|'); const more = /hoyere|_for$/.test(c.tpl);
        if (more ? (a !== rel.a || b !== rel.b) : (a !== rel.b || b !== rel.a)) return bad('clue words'); }
      return null;
    }
    case 'tapall': {
      const objs = p.objs.map(x => obj(x.id)); const a = objs.map((o, i) => FEAT[p.cat](o) ? i : -1).filter(i => i >= 0);
      if (JSON.stringify(a) !== JSON.stringify(it.target) || objs.some(o => FEAT[p.cat](o) == null)) return bad('tapall');
      if (new Set(p.objs.map(x => x.id)).size !== p.objs.length) return bad('duplicate objs'); return null;
    }
    case 'sort': {
      const objs = p.objs.map(x => obj(x.id, Object.keys(COLS).find(k => COLS[k] === x.col)));
      const p1 = partOf(objs, p.rule1.f); if (!samePart(p1, it.target)) return bad('rule1');
      const w = sortWays(objs); if (w.filter(x => !samePart(x.part, p1)).length < 1) return bad('no second way');
      if (p.cards && !p.cards.some(c => c.ok)) return bad('no true card');
      return null;
    }
  }
  return bad('unknown kind');
}
function selfTest(N, seed) {
  N = N || 300; let s = (seed || 12345) >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = { n: 0, bad: [], nulls: 0, per: {}, g: {} };
  for (const strand in RUNGS) for (const rung of RUNGS[strand]) for (let sup = 0; sup <= 2; sup++) {
    const k = strand + ':' + rung + ':s' + sup; out.per[k] = 0; let gsum = 0;
    for (let i = 0; i < N; i++) {
      const it = gen(strand, rung, sup, rng, {});
      if (!it) { out.nulls++; continue; }
      out.n++; out.per[k]++; gsum += it.g;
      const e = check(it); if (e && out.bad.length < 20) out.bad.push(e + ' ' + JSON.stringify(it.params).slice(0, 300));
      else if (e) out.bad.push('…');
    }
    out.g[k] = +(gsum / Math.max(1, out.per[k])).toFixed(4);
  }
  return out;
}

F.REASON = { gen, check, selfTest, FORMAT_OF, RUNGS, OBJ, FEAT, CARD, NUMF, NUMCARD, CATS, SURF, GROW, LO3, sudokuCount, sudokuOk, lineupSolve, riddleSolve, oddSet, sortWays, partOf, samePart, canon, period, BOX };

/* ---------------------------------------------------------------- registration with the engine's generator registry */
function regAll() {
  for (const strand in RUNGS) {
    const fn = (rung, sup, rng, o) => gen(strand, rung, sup, rng, o);
    const opts = { rungs: RUNGS[strand].slice(), fits: (rung, key) => typeof key === 'string' && key.indexOf(strand + ':' + rung + ':') === 0 };
    if (F.BANKS && typeof F.BANKS.reg === 'function') F.BANKS.reg(strand, fn, opts);
    else (F.REGQ = F.REGQ || []).push([strand, fn, opts]);
  }
}
if (!F.__reasonReg) { F.__reasonReg = true; regAll(); }
})();
