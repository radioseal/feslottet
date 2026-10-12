/* Feslottet – item generators for REGN R1–R10, LIKHET E1–E3, PROBLEM P1–P5 (DESIGN4 §4.1, SYNTHESIS §2.2/§2.3).  Owner: WP-B1.
   Pure JS (no THREE/DOM) – runs in the browser and in Node (tests/banks_check.js recomputes every answer).
   Registered with F.BANKS.reg(strand, fn, {rungs, fits, facts}) (ladders.js, WP-E); if the registry is not there yet the
   registration is queued on F.REGQ.  Also exposed directly:
     F.BANKS_REGN.gen(strand, rung, sup, rng, o) -> item | null      (o: {key, target, sub, format, avoid, conf, kind, theme})
     v5 (WP-E2): o.theme (F.LEARN.themeOf) – in an encounter the counted / moved things (REGN surfaces, E1 balance pans) are the
     animal's own food (surface {id, sg, pl, model, themed}); params.themed = 'surface'.
     F.BANKS_REGN.fits(strand, rung, key)  F.BANKS_REGN.facts(strand, rung) -> [keys]   F.BANKS_REGN.MAX {REGN:10, LIKHET:3, PROBLEM:5}
   F.BANKS.gen('REGN', 4, 1, {rng}) works too (banks.js forwards strands it does not own to the registry).
   Keys (Leitner, fits): R1 'REGN:10=7+3' · R2 'REGN:R2:all|hidden|pairs:n' · R3 'REGN:7+7' / 'REGN:half16' / 'REGN:6+7' · R4 'REGN:8+5' ·
     R5 'REGN:14-6' · R6 'REGN:8+?=15' / 'REGN:fam6,9' · R7 'REGN:7+6+3' · R8 'REGN:a+b' (ONE key per fact a, b = 0..10: 121 facts, asked as
     a + b or as one of its subtractions; facts('REGN', 8) lists them for Set mastery) · R9/R10 'REGN:46+3' · LIKHET 'LIKHET:9+5=?+6' ·
     PROBLEM 'PROBLEM:P5:went_fly:6,9'.  o.key forces the fact when it fits the rung; o.target regenerates until the answer matches;
     o.kind 'contrast' + o.tag steers to the structure of that misconception (CONTRAST_TAGS per strand; params.contrast = tag).

   ITEM (all rungs; the shared contract of banks.js plus DESIGN4 §2.9):
     strand, rung, sup, key ('REGN:8+5', 'LIKHET:9+5=?+6', 'PROBLEM:P5:sep_fly:6,9' – stable per fact), target (= answer)
     g        guess probability of the DEFAULT presentation: s0 = chips (k = 3, g = 1/3); s1/s2 = production (keypad/build/tiles 0.01).
              gBy {chips, keypad, …} gives g per mode – a format that presents the item differently sets item.g = item.gBy[mode]
              (or its own value) and item.mode.
     mode     'chips' (s0) | 'keypad' | 'build' | 'tiles' | 'subset' | 'balance' | 'twostep'      think 'REGNE' | 'HUSKE' | 'DEDUKSJON' | 'MODELL'
     secret   [answer strings] the subtitle must mask (never a number that is also a given)      twin  production twin format id
     flu, fluency  true on Flu rungs (R1, R3, R5 at s2, R8, R9): fast correct answers are the goal – exempt from rapid-guess R
     choices  only at s0 (3 values) or where the answer IS a choice (R2 'pairs' cards, E2 bundle); null = production
     distractors [{v, tag}] the anticipated wrong answers with misconception tags (SYNTHESIS §5.L + the old number tags):
              OFF-BY-ONE COUNT-ONES (±10) DIGIT-ONLY ECHO (answers a given number) ADD-ALL (adds every given number) OPERATIONAL
              (= means «the answer comes next»: 9 + 5 = ? + 6 → 14) SMALLER-FROM-LARGER (14 − 6 → 12) NO-CARRY (47 + 8 → 45,
              62 − 5 → 67) PV-PLACE (46 + 3 → 76 / 46 + 30 → 49) SKIP-TERM (R7 one addend left out) KEYWORD (word problems: the
              operation the keyword suggests – «fløy bort» → minus in a start-unknown story) WRONG-SIDE (E1 adds to the heavy pan)
     parts    two-part items (2T): [{id, ask, target, accept?, mode, choices?}] – A needs every part; target = the last part's answer
     params   per strand (numbers are SHOWN on objects; speech stays deictic – SYNTHESIS §6.6):
       REGN    {sub, a, b, c, op, eq:'6 + □ = 10' (display; □ = the unknown), terms[], surface:{id, sg, pl, model}, structure (s0:
               ten-frame/tray visible), whole/shown/hidden (R1/R2 cloth), pairs (R2 all), cards (R2 pairs), bridge {toTen, rest, ten}
               (R4/R10), first (R5), pair [i, j] (R7 the two that make 10), nums (R6), family[] (R6 'family': the 4 equations)}
       LIKHET  {sub, eq (display), left:[…], right:[…], addTo:'left'|'right' (E1), bundle:[{t, ok, tag}] + falseIdx + fix {i, t, answer}
               (E2), surface}
       PROBLEM {schema:'change'|'part-whole'|'compare', unknown:'result'|'change'|'start'|'part'|'difference', frame (story id),
               rel (number-free relation id), ask (question id), lines:[…] (the story to SHOW, numbers on signs), text (lines joined),
               speak:[{id, slots, text}] (number-free sentences = templates of F.BANKS_REGN.SPEECH over F.BANKS_REGN.SETS – the only
               story speech; WP-P declares them), speakText:[…], names {who, who2}, surface, nums {a, b, c},
               eq (display equation with the answer), eqAccept:[…] (normalised '15-6=9' forms accepted as the model), bars:[{name,
               value, known}] + barAsk (P4 ribbons)}
   Surfaces vary (≥ 3 per rung: eggs, crystals, apples, marbles, shells, buns, coins …) and the structure varies on one surface. */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const wpick = (r, pairs) => { let s = 0; for (const p of pairs) s += p[1]; let x = r() * s; for (const p of pairs) { if ((x -= p[1]) < 0) return p[0]; } return pairs[pairs.length - 1][0]; };
const MINUS = '−', BOX = '□';
const norm = s => String(s).replace(/−/g, '-').replace(/□/g, '?').replace(/\s+/g, '');
const keyVal = key => key == null ? null : String(key).slice(String(key).indexOf(':') + 1);
const MAX = { REGN: 12, LIKHET: 3, PROBLEM: 5 };     // v5r fix1 (review #6/#7): REGN 11–12 – the first Phase-2 band (2-digit ± 2-digit, to 100)
const THINK = { REGN: r => r === 8 ? 'HUSKE' : 'REGNE', LIKHET: r => r === 1 ? 'DEDUKSJON' : 'REGNE', PROBLEM: () => 'MODELL' };
const thinkOf = (s, rung) => { const L = F.LADDERS; const x = L && L.rung && L.rung(s, rung); return (x && x.think) || THINK[s](rung); };

// surfaces: things to count / move (model ids are castable F.WORDS words; crystals are drawn by the formats themselves)
const SURF = {
  krystall: { id: 'krystall', sg: 'krystall', pl: 'krystaller', model: null },
  egg: { id: 'egg', sg: 'egg', pl: 'egg', model: 'egg' },
  eple: { id: 'eple', sg: 'eple', pl: 'epler', model: 'eple' },
  kule: { id: 'kule', sg: 'kule', pl: 'kuler', model: 'kule' },
  perle: { id: 'perle', sg: 'perle', pl: 'perler', model: 'perle' },
  stein: { id: 'stein', sg: 'stein', pl: 'steiner', model: 'stein' },
  bolle: { id: 'bolle', sg: 'bolle', pl: 'boller', model: 'bolle' },
  blomst: { id: 'blomst', sg: 'blomst', pl: 'blomster', model: 'blomst' },
  krone: { id: 'krone', sg: 'krone', pl: 'kroner', model: 'krone' },
  kloss: { id: 'kloss', sg: 'kloss', pl: 'klosser', model: 'kloss' },
  kake: { id: 'kake', sg: 'kake', pl: 'kaker', model: 'kake' },
  ball: { id: 'ball', sg: 'ball', pl: 'baller', model: 'ball' },
};
const SURF_REGN = ['krystall', 'egg', 'eple', 'kule', 'perle', 'stein', 'bolle', 'blomst', 'kloss', 'ball'];
const SURF_BAL = ['eple', 'kule', 'stein', 'kloss', 'egg', 'ball'];      // things that sit on a balance pan
// v5 (WP-E2, DESIGN5 §2.2): in an animal's encounter (o.theme from F.LEARN.themeOf) the things counted / moved are ITS things (ekorn →
// nøtter, høne → maiskorn, bie → blomster) – set by gen() for one call; item.params.themed = 'surface' when used
let CUR_TH = null, TH_USED = false;
const themeSurf = th => th && th.count && th.countPl ? { id: th.count, sg: th.countSg || th.count, pl: th.countPl, model: th.count, themed: true } : null;
const surf = (r, list) => { const t = themeSurf(CUR_TH); if (t && r() < 0.8) { TH_USED = true; return t; } return SURF[pick(r, list || SURF_REGN)]; };

/* ---------------------------------------------------------------- item assembly */
// x: {key, target, ds:[{v,tag}], params, mode (production mode at s1/s2), sub, parts, choices?, flu, twin, givens[], k}
function mk(strand, rung, sup, r, o, x) {
  const ds = [], seen = new Set([String(x.target)]);
  for (const d of x.ds || []) {
    if (!d || d.v == null) continue;
    if (typeof d.v === 'number' && (!isFinite(d.v) || d.v < 0 || d.v !== Math.round(d.v))) continue;
    const k = String(d.v); if (seen.has(k)) continue; seen.add(k); ds.push(d);
  }
  const prodMode = x.mode || 'keypad', prodG = x.g != null ? x.g : 0.01;
  let choices = null, distractors = ds, mode = prodMode, g = prodG;
  const gBy = { [prodMode]: prodG };
  if (x.choices) choices = x.choices;
  else if (typeof x.target === 'number') {
    const k = x.k || 3; gBy.chips = 1 / k;
    if (sup === 0 && !x.noChips) {      // s0: chips (target + the two strongest anticipated errors)
      const use = ds.filter(d => typeof d.v === 'number' && d.v <= 100).slice(0, k - 1);
      if (use.length === k - 1) { choices = shuffle(r, [x.target].concat(use.map(d => d.v))); distractors = use; mode = 'chips'; g = 1 / k; }
    }
  }
  const givens = new Set((x.givens || []).map(String));
  const secret = x.secret || (Array.isArray(x.target) ? [] : [String(x.target)].filter(s => !givens.has(s)));
  const it = {
    strand, rung, sup, key: x.key, target: x.target, answer: x.target, word: null, text: x.text || null, choices, distractors,
    tiles: null, slots: x.slots || null, structure: sup === 0, accept: Array.isArray(x.target) ? null : [x.target], say: null,
    params: Object.assign({ sub: x.sub || null }, x.params || {}),
    g, gBy, mode, think: thinkOf(strand, rung), secret, twin: x.twin || null,
  };
  if (mode === 'chips') { it._gAuto = true; it._modeAuto = true; }     // presentation-dependent: the running widget may refine g / mode
  if (x.parts) it.parts = x.parts;
  if (x.flu) { it.flu = true; it.fluency = true; }      // stage.js S.isFluency() reads item.fluency (rapid-guess R exempt)
  if (Array.isArray(choices)) it.nChoices = choices.length;
  return it;
}
// the anticipated error set for a one-step answer (ordered: strongest misconception first)
const near = (t, extra) => (extra || []).concat([{ v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: t + 2, tag: 'OFF-BY-ONE' }]);

/* ---------------------------------------------------------------- key parsing ('8+5', '15-7', '10=7+3', '8+?=15') */
function parseFact(kv) {
  const m = /^(\d+)([+-])(\d+)$/.exec(kv || ''); if (!m) return null;
  return { a: +m[1], op: m[2], b: +m[3], c: m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3] };
}

/* ================================================================ REGN */
const R = {};
// R1 bonds to 10: cloth / missing addend / 10 − a
R[1] = function (sup, r, o) {
  const kv = keyVal(o.key); let shown = null, hidden = null;
  const km = /^10=(\d)\+(\d)$/.exec(kv || ''); if (km && +km[1] + +km[2] === 10) { shown = +km[1]; hidden = +km[2]; }
  if (hidden == null && o.target != null && +o.target >= 1 && +o.target <= 9) { hidden = +o.target; shown = 10 - hidden; }
  if (hidden == null) { hidden = int(r, 1, 9); shown = 10 - hidden; }
  const sub = o.sub || wpick(r, [['cloth', 5], ['missing', 3], ['minus', 2]]);
  const s = surf(r);
  let eq, ds;
  if (sub === 'cloth') { eq = shown + ' + ' + BOX + ' = 10'; ds = [{ v: shown, tag: 'ECHO' }, { v: hidden + 1, tag: 'OFF-BY-ONE' }, { v: hidden - 1, tag: 'OFF-BY-ONE' }, { v: 10, tag: 'ECHO' }]; }
  else if (sub === 'missing') { const first = r() < 0.7; eq = first ? shown + ' + ' + BOX + ' = 10' : BOX + ' + ' + shown + ' = 10';
    ds = [{ v: 10 + shown, tag: 'ADD-ALL' }, { v: hidden + 1, tag: 'OFF-BY-ONE' }, { v: hidden - 1, tag: 'OFF-BY-ONE' }, { v: shown, tag: 'ECHO' }]; }
  else { eq = '10 ' + MINUS + ' ' + shown + ' = ' + BOX; ds = [{ v: hidden + 1, tag: 'OFF-BY-ONE' }, { v: hidden - 1, tag: 'OFF-BY-ONE' }, { v: 10 + shown, tag: 'OPERATIONAL' }, { v: shown, tag: 'ECHO' }]; }
  return { key: 'REGN:10=' + shown + '+' + hidden, target: hidden, ds, sub, flu: true, twin: 'F47', givens: [10, shown],
    params: { whole: 10, shown, hidden, op: sub === 'minus' ? '-' : '+', a: sub === 'minus' ? 10 : shown, b: sub === 'minus' ? shown : null, c: sub === 'minus' ? null : 10,
      eq, surface: s, cover: sub === 'cloth', structure: sup === 0 } };
};
// R2 every split of n (5–10): the full list / hidden part / tap every card that makes n
R[2] = function (sup, r, o) {
  const kv = keyVal(o.key); const km = /^R2:(all|hidden|pairs):(\d+)(?::(\d+))?$/.exec(kv || '');
  const n = km ? Math.max(5, Math.min(10, +km[2])) : sup === 0 ? int(r, 5, 6) : sup === 1 ? int(r, 5, 8) : int(r, 6, 10);
  const sub = o.sub || (km ? km[1] : wpick(r, [['all', 4], ['hidden', 3], ['pairs', 3]]));
  const s = surf(r);
  if (sub === 'all') {
    const zero = sup >= 1, pairs = [];
    for (let a = zero ? 0 : 1; a <= (zero ? n : n - 1); a++) pairs.push(a + '+' + (n - a));
    return { key: 'REGN:R2:all:' + n, target: pairs, ds: [], sub, mode: 'build', g: 0.01, noChips: true, twin: null, givens: [n],
      secret: [], params: { whole: n, zero, pairs, count: pairs.length, surface: s, baskets: 2, structure: sup === 0 } };
  }
  if (sub === 'hidden') {
    const shown = km && km[3] != null && +km[3] < n ? +km[3] : int(r, 1, n - 1), hidden = n - shown;
    return { key: 'REGN:R2:hidden:' + n + ':' + shown, target: hidden, sub, twin: 'F46', givens: [n, shown],
      ds: [{ v: shown, tag: 'ECHO' }, { v: n + shown, tag: 'ADD-ALL' }, { v: hidden + 1, tag: 'OFF-BY-ONE' }, { v: hidden - 1, tag: 'OFF-BY-ONE' }],
      params: { whole: n, shown, hidden, eq: shown + ' + ' + BOX + ' = ' + n, op: '+', a: shown, c: n, surface: s, cover: true, structure: sup === 0 } };
  }
  // 'pairs': cards «a+b»; tap all that make n (2–3 right, the rest n±1)
  const nCards = sup === 0 ? 4 : sup === 1 ? 5 : 6, nRight = sup === 0 ? 2 : int(r, 2, 3);
  const right = shuffle(r, Array.from({ length: n - 1 }, (_, i) => i + 1)).slice(0, nRight).map(a => a + '+' + (n - a));
  const wrong = []; let guard = 0;
  while (wrong.length < nCards - nRight && guard++ < 200) {
    const d = r() < 0.5 ? 1 : -1, a = int(r, 1, n - 1), b = n - a + d;
    if (b < 1 || b > 10) continue; const c = a + '+' + b;
    if (!right.includes(c) && !wrong.includes(c)) wrong.push(c);
  }
  const cards = shuffle(r, right.concat(wrong));
  return { key: 'REGN:R2:pairs:' + n, target: right.slice().sort(), ds: wrong.map(v => ({ v, tag: 'OFF-BY-ONE' })), sub, mode: 'subset',
    choices: cards, g: 1 / (Math.pow(2, cards.length) - 1), twin: null, givens: [n], secret: [],
    params: { whole: n, cards, surface: s, structure: sup === 0 } };
};
// R3 doubles, halves, near doubles
R[3] = function (sup, r, o) {
  const kv = keyVal(o.key); let sub = o.sub, n;
  const f = parseFact(kv), hm = /^half(\d+)$/.exec(kv || '');
  if (f && f.op === '+' && f.a === f.b && f.a >= 1 && f.a <= 10) { sub = 'double'; n = f.a; }
  else if (f && f.op === '+' && Math.abs(f.a - f.b) === 1 && Math.min(f.a, f.b) >= 2) { sub = 'near'; n = Math.min(f.a, f.b); }
  else if (hm && +hm[1] % 2 === 0 && +hm[1] >= 2 && +hm[1] <= 20) { sub = 'half'; n = +hm[1]; }
  sub = sub || (sup === 0 ? wpick(r, [['double', 6], ['half', 4]]) : wpick(r, [['double', 4], ['half', 3], ['near', 3]]));
  const s = surf(r);
  if (sub === 'double') {
    n = n || (sup === 0 ? int(r, 2, 5) : int(r, 3, 10)); const t = 2 * n;
    return { key: 'REGN:' + n + '+' + n, target: t, sub, flu: true, twin: 'F47', givens: [n],
      ds: [{ v: n + 1, tag: 'ADD-ONE' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: n, tag: 'ECHO' }, { v: t + 2, tag: 'OFF-BY-ONE' }],
      params: { a: n, b: n, op: '+', eq: n + ' + ' + n + ' = ' + BOX, double: n, surface: s, mirror: true, structure: sup === 0 } };
  }
  if (sub === 'half') {
    n = n || 2 * (sup === 0 ? int(r, 2, 5) : int(r, 3, 10)); const t = n / 2;
    return { key: 'REGN:half' + n, target: t, sub, flu: true, twin: 'F47', givens: [n],
      ds: [{ v: 2 * n, tag: 'OPERATIONAL' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: n - 2, tag: 'OTHER' }],
      params: { whole: n, op: 'half', eq: BOX + ' + ' + BOX + ' = ' + n, surface: s, structure: sup === 0 } };
  }
  n = n || int(r, 3, 9); const up = f && sub === 'near' ? f.a < f.b : r() < 0.5, a = up ? n : n + 1, b = up ? n + 1 : n, t = a + b;
  return { key: 'REGN:' + a + '+' + b, target: t, sub: 'near', flu: true, twin: 'F47', givens: [a, b],
    ds: [{ v: 2 * n, tag: 'OFF-BY-ONE' }, { v: 2 * n + 2, tag: 'OFF-BY-ONE' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: t - 10, tag: 'COUNT-ONES' }],
    params: { a, b, op: '+', eq: a + ' + ' + b + ' = ' + BOX, double: n, surface: s, structure: sup === 0 } };
};
// R4 bridge through ten (2T: how many move to the ten, then the sum)
R[4] = function (sup, r, o) {
  const f = parseFact(keyVal(o.key)); let a, b;
  if (f && f.op === '+' && f.c > 10 && f.c <= 18 && Math.max(f.a, f.b) >= 6 && f.a <= 9 && f.b <= 9) { a = f.a; b = f.b; }
  else {
    let g2 = 0; do { const big = sup === 0 ? int(r, 8, 9) : int(r, 6, 9); const small = int(r, Math.max(2, 11 - big), sup === 0 ? Math.min(9, 13 - big) : 9);
      const swap = sup === 2 && r() < 0.35; a = swap ? small : big; b = swap ? big : small; } while ((a + b <= 10 || a + b > 18) && g2++ < 50);
  }
  const big = Math.max(a, b), small = Math.min(a, b), toTen = 10 - big, sum = a + b, rest = small - toTen;
  const sumDs = [{ v: sum - 10, tag: 'DIGIT-ONLY' }, { v: sum + 1, tag: 'OFF-BY-ONE' }, { v: sum - 1, tag: 'OFF-BY-ONE' }, { v: sum + 10, tag: 'COUNT-ONES' }];
  const movDs = [{ v: small, tag: 'ECHO' }, { v: 10 - small, tag: 'OTHER' }, { v: toTen + 1, tag: 'OFF-BY-ONE' }].filter(d => d.v !== toTen && d.v >= 0);
  const p0 = sup === 0 ? shuffle(r, [toTen].concat(movDs.slice(0, 2).map(d => d.v))) : null;
  const p1 = sup === 0 ? shuffle(r, [sum].concat(sumDs.slice(0, 2).map(d => d.v))) : null;
  const parts = [{ id: 'move', ask: 'flytt', target: toTen, mode: sup === 0 ? 'chips' : 'keypad', choices: p0, ds: movDs },
    { id: 'sum', ask: 'sum', target: sum, mode: sup === 0 ? 'chips' : 'keypad', choices: p1, ds: sumDs }];
  return { key: 'REGN:' + a + '+' + b, target: sum, ds: sumDs, sub: 'bridge', parts, mode: 'twostep', g: sup === 0 ? 1 / 9 : 0.0001, noChips: true,
    twin: 'F48', givens: [a, b],
    params: { a, b, op: '+', eq: a + ' + ' + b + ' = ' + BOX, bridge: { big: big === a ? 'a' : 'b', toTen, rest, ten: 10 }, surface: surf(r), tray: true, structure: sup === 0 } };
};
// R5 subtract within 20 across ten (2T at s0/s1: first down to ten; Flu at s2)
R[5] = function (sup, r, o) {
  const f = parseFact(keyVal(o.key)); let a, b;
  if (f && f.op === '-' && f.a >= 11 && f.a <= 18 && f.b >= 2 && f.b <= 9 && f.b > f.a - 10) { a = f.a; b = f.b; }
  else { a = int(r, 11, sup === 0 ? 14 : 18); b = int(r, a - 9, 9); if (b <= a - 10) b = a - 10 + 1; if (b < 2) b = 2; if (b > 9) { a = 13; b = 6; } }
  const t = a - b, first = a - 10, rest = b - first;
  const sfl = 10 + Math.abs((a % 10) - b);       // 14 − 6 → «6 − 4 = 2» → 12
  const ds = [{ v: sfl, tag: 'SMALLER-FROM-LARGER' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: a + b, tag: 'OPERATIONAL' }];
  const two = sup < 2;
  const strategy = r() < 0.5 ? 'down' : 'fromTen';         // 15 − 5 − 2 | 10 − 7 + 5
  const parts = two ? (strategy === 'down'
    ? [{ id: 'first', ask: 'enerne_forst', target: first, mode: sup === 0 ? 'chips' : 'keypad', choices: sup === 0 ? shuffle(r, [first, b, first + 1].filter((v, i, x) => x.indexOf(v) === i)) : null, ds: [{ v: b, tag: 'ECHO' }, { v: first + 1, tag: 'OFF-BY-ONE' }] },
      { id: 'answer', ask: 'svar', target: t, mode: 'keypad', ds }]
    : [{ id: 'fromTen', ask: 'fra_tieren', target: 10 - b, mode: sup === 0 ? 'chips' : 'keypad', choices: sup === 0 ? shuffle(r, [10 - b, b, 10 - b + 1].filter((v, i, x) => x.indexOf(v) === i)) : null, ds: [{ v: b, tag: 'ECHO' }] },
      { id: 'answer', ask: 'svar', target: t, mode: 'keypad', ds }]) : null;
  return { key: 'REGN:' + a + '-' + b, target: t, ds, sub: two ? 'strategy' : 'fluent', parts, flu: !two, mode: two ? 'twostep' : 'keypad', g: two ? (sup === 0 ? 0.0033 : 0.0001) : 0.01,
    noChips: two, twin: 'F48', givens: [a, b],
    params: { a, b, op: '-', eq: a + ' ' + MINUS + ' ' + b + ' = ' + BOX, first, rest, strategy, surface: surf(r), tray: true, structure: sup === 0 } };
};
// R6 fact families: all four equations / the unknown in any position
R[6] = function (sup, r, o) {
  const kv = keyVal(o.key);
  let a, b, form = null;
  const km = /^(\d+|\?)([+-])(\d+|\?)=(\d+|\?)$/.exec(kv || '');
  if (km && (km[1] + km[3] + km[4]).split('?').length === 2) {
    const A = km[1], B = km[3], C = km[4];
    if (km[2] === '+') { if (A === '?') { b = +B; a = +C - b; form = '?+b=c'; } else if (B === '?') { a = +A; b = +C - a; form = 'a+?=c'; } else { a = +A; b = +B; form = 'a+b=?'; } }
    else if (A === '?') { a = +B; b = +C; form = '?-a=b'; }          // ? − a = b  → ? = a + b
    else if (B === '?') { b = +C; a = +A - b; form = 'c-?=b'; }      // c − ? = b  → ? = c − b
    else { a = +B; b = +A - a; form = 'c-a=?'; }                     // c − a = ?
    if (!(a >= 1 && b >= 1 && a + b <= 20)) { a = null; form = null; }
  }
  if (a == null) { let g2 = 0; do { a = int(r, 2, sup === 0 ? 6 : 9); b = int(r, 2, sup === 0 ? 6 : 9); } while ((a === b || (sup >= 1 && a + b <= 10 && r() < 0.6)) && g2++ < 40); }
  const c = a + b;
  const sub = o.sub || (form ? 'missing' : sup === 0 ? 'missing' : wpick(r, [['family', 4], ['missing', 6]]));
  const s = surf(r);
  if (sub === 'family') {
    const fam = [a + '+' + b + '=' + c, b + '+' + a + '=' + c, c + '-' + a + '=' + b, c + '-' + b + '=' + a];
    return { key: 'REGN:fam' + Math.min(a, b) + ',' + Math.max(a, b), target: fam, sub, mode: 'tiles', g: 0.0001, noChips: true, twin: 'F49', secret: [],
      ds: [{ v: a + '-' + c + '=' + b, tag: 'SMALLER-FROM-LARGER' }], givens: [a, b, c],
      params: { nums: shuffle(r, [a, b, c]), a, b, c, family: fam, surface: s, structure: sup === 0 } };
  }
  form = form || (sup === 0 ? pick(r, ['a+?=c', 'c-a=?', 'a+?=c']) : pick(r, ['a+?=c', '?+b=c', 'c-?=b', '?-a=b', 'a+?=c']));
  let eq, t, key, ds;
  if (form === 'a+?=c') { eq = a + ' + ' + BOX + ' = ' + c; t = b; key = a + '+?=' + c; ds = [{ v: a + c, tag: 'ADD-ALL' }, { v: c, tag: 'ECHO' }]; }
  else if (form === '?+b=c') { eq = BOX + ' + ' + b + ' = ' + c; t = a; key = '?+' + b + '=' + c; ds = [{ v: b + c, tag: 'ADD-ALL' }, { v: c, tag: 'ECHO' }]; }
  else if (form === 'c-?=b') { eq = c + ' ' + MINUS + ' ' + BOX + ' = ' + b; t = a; key = c + '-?=' + b; ds = [{ v: c + b, tag: 'ADD-ALL' }, { v: b, tag: 'ECHO' }]; }
  else if (form === '?-a=b') { eq = BOX + ' ' + MINUS + ' ' + a + ' = ' + b; t = c; key = '?-' + a + '=' + b; ds = [{ v: Math.abs(b - a), tag: 'OPERATIONAL' }, { v: b, tag: 'ECHO' }]; }
  else if (form === 'c-a=?') { eq = c + ' ' + MINUS + ' ' + a + ' = ' + BOX; t = b; key = c + '-' + a + '=?'; ds = [{ v: c + a, tag: 'OPERATIONAL' }, { v: a, tag: 'ECHO' }]; }
  else { eq = a + ' + ' + b + ' = ' + BOX; t = c; key = a + '+' + b + '=?'; ds = [{ v: Math.abs(a - b), tag: 'OPERATIONAL' }, { v: a, tag: 'ECHO' }]; }
  return { key: 'REGN:' + key, target: t, ds: near(t, ds), sub: 'missing', twin: 'F47', givens: [a, b, c].filter(v => eq.includes(String(v))),
    params: { form, eq, a, b, c, surface: s, structure: sup === 0 } };
};
// R7 3–4 addends with a hidden bond-to-10 pair (smart order)
R[7] = function (sup, r, o) {
  const kv = keyVal(o.key); let terms = null;
  if (kv && /^\d+(\+\d+){2,3}$/.test(kv)) { const ts = kv.split('+').map(Number); const tot = ts.reduce((s, v) => s + v, 0);
    if (tot <= 20 && ts.every(v => v >= 1 && v <= 9)) terms = ts; }
  let pair;
  if (!terms) {
    const n = sup === 2 && r() < 0.6 ? 4 : 3;
    let g2 = 0;
    do {
      const x = int(r, 1, 9), y = 10 - x;
      const rest = []; for (let i = 0; i < n - 2; i++) rest.push(int(r, 1, 9));
      const tot = 10 + rest.reduce((s, v) => s + v, 0);
      if (tot > 20) continue;
      // positions: s0 the pair first and adjacent; s1/s2 the pair apart (7 + 6 + 3)
      const arr = new Array(n);
      let i, j;
      if (sup === 0) { i = 0; j = 1; } else { const ps = []; for (let p = 0; p < n; p++) for (let q = p + 2; q < n; q++) ps.push([p, q]); [i, j] = pick(r, ps); }
      arr[i] = x; arr[j] = y; let k = 0; for (let p = 0; p < n; p++) if (arr[p] == null) arr[p] = rest[k++];
      // no second bond-to-10 pair (the smart pair must be unique)
      let bonds = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) if (arr[p] + arr[q] === 10) bonds++;
      if (bonds !== 1) continue;
      terms = arr; pair = [i, j]; break;
    } while (g2++ < 200);
    if (!terms) { terms = [7, 6, 3]; pair = [0, 2]; }
  }
  if (!pair) { pair = null; for (let p = 0; p < terms.length && !pair; p++) for (let q = p + 1; q < terms.length; q++) if (terms[p] + terms[q] === 10) { pair = [p, q]; break; } }
  const t = terms.reduce((s, v) => s + v, 0);
  const ds = [{ v: t - terms[terms.length - 1], tag: 'SKIP-TERM' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: t - terms[0], tag: 'SKIP-TERM' }];
  const parts = pair ? [{ id: 'pair', ask: 'tiervenner', target: pair.slice(), mode: 'subset', choices: terms.map((_, i) => i) }, { id: 'sum', ask: 'sum', target: t, mode: 'keypad' }] : null;
  return { key: 'REGN:' + terms.join('+'), target: t, ds, sub: terms.length + 'add', twin: 'F48', givens: terms,
    params: { terms, pair, eq: terms.join(' + ') + ' = ' + BOX, partsOptional: true, surface: surf(r), structure: sup === 0 }, parts };
};
// R8 all 121 + and − facts within 20 (SYNTHESIS: Set ≥ 90 % + Flu). ONE Leitner key per fact a+b (a, b = 0..10) – the item asks it as
// a + b = ? or as one of its subtractions (a+b) − b = ? / (a+b) − a = ?, so a fact is known in both directions (121 keys, not 242)
const R8FACTS = (() => { const f = []; for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) f.push(a + '+' + b); return f; })();
R[8] = function (sup, r, o) {
  let f = parseFact(keyVal(o.key)), a = null, b = null, op = null;
  if (f && f.op === '+' && f.a <= 10 && f.b <= 10) { a = f.a; b = f.b; }
  else if (f && f.op === '-' && f.a <= 20 && f.b <= 10 && f.c >= 0 && f.c <= 10) { a = f.c; b = f.b; op = '-'; }   // c − b = a
  if (a == null) {
    const pool = R8FACTS.map(k => { const x = parseFact(k); const hard = x.c > 10 && x.a < 10 && x.b < 10;
      const triv = x.a <= 1 || x.b <= 1; return [k, hard ? 3 : triv ? 0.3 : 1]; });
    const avoid = new Set(o.avoid || []);
    for (let i = 0; i < 6 && a == null; i++) { const k = wpick(r, pool); if (!avoid.has('REGN:' + k)) { const x = parseFact(k); a = x.a; b = x.b; } }
    if (a == null) { const x = parseFact(wpick(r, pool)); a = x.a; b = x.b; }
  }
  const c = a + b;
  if (!op) op = o.sub === 'add' ? '+' : o.sub === 'sub' ? '-' : (r() < (sup === 2 ? 0.55 : 0.4) ? '-' : '+');
  let x, y, t;
  if (op === '+') { x = a; y = b; t = c; } else if (r() < 0.5 || (f && f.op === '-')) { x = c; y = b; t = a; } else { x = c; y = a; t = b; }
  const ds = op === '+' ? [{ v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: t > 10 ? t - 10 : t + 10, tag: t > 10 ? 'DIGIT-ONLY' : 'COUNT-ONES' }, { v: Math.abs(x - y), tag: 'OPERATIONAL' }]
    : [{ v: x >= 10 ? 10 + Math.abs((x % 10) - y) : -1, tag: 'SMALLER-FROM-LARGER' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: x + y, tag: 'OPERATIONAL' }, { v: t + 10, tag: 'COUNT-ONES' }];
  return { key: 'REGN:' + a + '+' + b, target: t, ds, sub: op === '+' ? 'add' : 'sub', flu: true, twin: 'F47', givens: [x, y],
    params: { a: x, b: y, op, eq: x + ' ' + (op === '+' ? '+' : MINUS) + ' ' + y + ' = ' + BOX, fact: a + '+' + b, structure: sup === 0 } };
};
// R9 2-digit ± 1-digit without crossing; ± whole tens
R[9] = function (sup, r, o) {
  let f = parseFact(keyVal(o.key)), sub = null;
  if (f) {
    const ok = f.a >= 11 && f.a <= 99 && f.c >= 1 && f.c <= 99 &&
      ((f.b >= 1 && f.b <= 9 && (f.op === '+' ? (f.a % 10) + f.b <= 9 : (f.a % 10) >= f.b)) || (f.b % 10 === 0 && f.b >= 10 && f.b <= 80));
    if (!ok) f = null; else sub = (f.b >= 10 ? 'tens' : 'ones') + f.op;
  }
  if (!f) {
    sub = o.sub || (sup === 0 ? pick(r, ['ones+', 'tens+']) : pick(r, ['ones+', 'ones-', 'tens+', 'tens-']));
    const hiA = sup === 0 ? 50 : 98; let a, b, g2 = 0;
    do {
      a = int(r, 21, hiA);
      if (sub === 'ones+') b = int(r, 1, 9 - (a % 10));
      else if (sub === 'ones-') b = int(r, 1, Math.max(1, a % 10));
      else if (sub === 'tens+') b = 10 * int(r, 1, Math.max(1, 9 - Math.floor(a / 10)));
      else b = 10 * int(r, 1, Math.max(1, Math.floor(a / 10) - 1));
      const c = sub.endsWith('+') ? a + b : a - b;
      const okk = c >= 1 && c <= 99 && (sub === 'ones+' ? (a % 10) + b <= 9 : sub === 'ones-' ? (a % 10) >= b && b >= 1 : true);
      if (okk) { f = { a, b, op: sub.endsWith('+') ? '+' : '-', c }; break; }
    } while (g2++ < 100);
    if (!f) f = { a: 46, b: 3, op: '+', c: 49 };
  }
  const t = f.c, tens = f.b >= 10;
  const pv = tens ? (f.op === '+' ? f.a + f.b / 10 : f.a - f.b / 10) : (f.op === '+' ? f.a + 10 * f.b : f.a - 10 * f.b);   // the digit added to the wrong place
  const ds = [{ v: pv, tag: 'PV-PLACE' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: f.op === '+' ? t + 10 : t - 10, tag: 'COUNT-ONES' }];
  return { key: 'REGN:' + f.a + f.op + f.b, target: t, ds, sub: (tens ? 'tens' : 'ones') + f.op, flu: true, twin: 'F47', givens: [f.a, f.b],
    params: { a: f.a, b: f.b, op: f.op, eq: f.a + ' ' + (f.op === '+' ? '+' : MINUS) + ' ' + f.b + ' = ' + BOX, structure: sup === 0 } };
};
// R10 2-digit ± 1-digit across a ten
R[10] = function (sup, r, o) {
  let f = parseFact(keyVal(o.key));
  if (f) { const ok = f.a >= 11 && f.a <= 98 && f.b >= 2 && f.b <= 9 && f.c >= 10 && f.c <= 99 && (f.op === '+' ? (f.a % 10) + f.b >= 10 : (f.a % 10) < f.b); if (!ok) f = null; }
  if (!f) {
    const op = o.sub === 'add' ? '+' : o.sub === 'sub' ? '-' : (sup === 0 ? '+' : (r() < 0.5 ? '+' : '-'));
    let g2 = 0;
    do {
      const a = int(r, sup === 0 ? 12 : 21, sup === 0 ? 48 : 95), b = int(r, 2, 9);
      const c = op === '+' ? a + b : a - b;
      if (op === '+' ? ((a % 10) + b >= 10 && c <= 99 && a % 10 !== 0) : ((a % 10) < b && c >= 10)) { f = { a, b, op, c }; break; }
    } while (g2++ < 200);
    if (!f) f = { a: 47, b: 8, op: '+', c: 55 };
  }
  const t = f.c, ao = f.a % 10, tensA = f.a - ao;
  const ds = f.op === '+'
    ? [{ v: tensA + ((ao + f.b) % 10), tag: 'NO-CARRY' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: t + 10, tag: 'COUNT-ONES' }]
    : [{ v: tensA + (f.b - ao), tag: 'SMALLER-FROM-LARGER' }, { v: tensA + (10 + ao - f.b), tag: 'NO-CARRY' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const bridge = f.op === '+' ? { toTen: 10 - ao, ten: tensA + 10, rest: f.b - (10 - ao) } : { first: ao, ten: tensA, rest: f.b - ao };
  const parts = [{ id: 'toTen', ask: f.op === '+' ? 'til_tieren' : 'ned_til_tieren', target: f.op === '+' ? bridge.toTen : bridge.first, mode: 'keypad' },
    { id: 'answer', ask: 'svar', target: t, mode: 'keypad' }];
  return { key: 'REGN:' + f.a + f.op + f.b, target: t, ds, sub: f.op === '+' ? 'add' : 'sub', twin: 'F48', givens: [f.a, f.b],
    params: { a: f.a, b: f.b, op: f.op, eq: f.a + ' ' + (f.op === '+' ? '+' : MINUS) + ' ' + f.b + ' = ' + BOX, bridge, partsOptional: true, structure: sup === 0 }, parts };
};

// v5r fix1 (review #6/#7, the parent's «no cap»): REGN 11 2-digit ± 2-digit WITH regrouping (keys 'REGN:47+38' / 'REGN:82-47');
// production (keypad, F47 gates); s0 plus only with a ≤ 59, s1 + and −, s2 + and − to 99
R[11] = function (sup, r, o) {
  let f = parseFact(keyVal(o.key));
  const ok11 = x => !!x && x.a >= 11 && x.a <= 98 && x.b >= 11 && x.b <= 89 && x.c >= 10 && x.c <= 99 &&
    (x.op === '+' ? (x.a % 10) + (x.b % 10) >= 10 : (x.a % 10) < (x.b % 10) && x.a > x.b);
  // v5r2b: a review / Øvebank key that breaks the support level (s0 is plus with a ≤ 59, b ≤ 39) is not asked at that level
  if (!ok11(f) || (sup === 0 && !(f.op === '+' && f.a <= 59 && f.b <= 39))) f = null;
  if (!f) {
    const op = o.sub === 'add' ? '+' : o.sub === 'sub' ? '-' : (sup === 0 ? '+' : (r() < 0.5 ? '+' : '-'));
    for (let g2 = 0; g2 < 300 && !f; g2++) {
      const a = int(r, sup === 0 ? 13 : 21, sup === 0 ? 59 : 97), b = int(r, 11, sup === 0 ? 39 : 79);
      const x = { a, b, op, c: op === '+' ? a + b : a - b };
      if (ok11(x)) f = x;
    }
    if (!f) f = { a: 47, b: 38, op: '+', c: 85 };
  }
  const t = f.c, at = Math.floor(f.a / 10), ao = f.a % 10, bt = Math.floor(f.b / 10), bo = f.b % 10;
  const ds = f.op === '+'
    ? [{ v: (at + bt) * 10 + ((ao + bo) % 10), tag: 'NO-CARRY' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: t - 10, tag: 'COUNT-ONES' }, { v: t + 1, tag: 'OFF-BY-ONE' }]
    : [{ v: (at - bt) * 10 + (bo - ao), tag: 'SMALLER-FROM-LARGER' }, { v: t + 10, tag: 'NO-CARRY' }, { v: t - 10, tag: 'COUNT-ONES' }, { v: t + 1, tag: 'OFF-BY-ONE' }];
  return { key: 'REGN:' + f.a + f.op + f.b, target: t, ds: ds.filter(d => d.v >= 0 && d.v !== t), sub: f.op === '+' ? 'add' : 'sub', twin: 'F47', givens: [f.a, f.b],
    mode: 'keypad', g: 0.01, noChips: true,
    params: { a: f.a, b: f.b, op: f.op, eq: f.a + ' ' + (f.op === '+' ? '+' : MINUS) + ' ' + f.b + ' = ' + BOX, structure: sup === 0 } };
};
// REGN 12 complements to 100 (tiervenner til hundre): s0 whole tens (30 + □ = 100), s1 tens and fives, s2 any 2-digit (37 + □ = 100);
// key 'REGN:100=37+63'. The classic error «73» (each digit to ten) is the NO-CARRY distractor
R[12] = function (sup, r, o) {
  const m = /^100=(\d+)\+(\d+)$/.exec(keyVal(o.key) || '');
  let a = m && +m[1] + +m[2] === 100 && +m[1] >= 1 && +m[1] <= 99 ? +m[1] : null;
  if (a != null && ((sup === 0 && a % 10) || (sup === 1 && a % 5))) a = null;   // v5r2b: a key that breaks the support level (s0 whole tens, s1 fives)
  if (a == null) {
    if (sup === 0) a = 10 * int(r, 1, 9);
    else if (sup === 1) a = r() < 0.5 ? 10 * int(r, 1, 9) : 10 * int(r, 1, 9) - 5;
    else { do { a = int(r, 11, 89); } while (a % 10 === 0); }
  }
  const t = 100 - a, ao = a % 10, at = Math.floor(a / 10);
  const ds = [{ v: (10 - at) * 10 + (10 - ao) <= 99 && ao ? (10 - at) * 10 + (10 - ao) : t + 10, tag: 'NO-CARRY' }, { v: t + 10, tag: 'COUNT-ONES' }, { v: t - 10, tag: 'COUNT-ONES' }, { v: t + 1, tag: 'OFF-BY-ONE' }];
  return { key: 'REGN:100=' + a + '+' + t, target: t, ds: ds.filter(d => d.v > 0 && d.v !== t), sub: 'hundred', flu: sup === 2, twin: 'F47', givens: [a, 100],
    mode: 'keypad', g: 0.01, noChips: true,
    params: { a, b: t, op: '+', whole: 100, eq: a + ' + ' + BOX + ' = 100', structure: sup === 0 } };
};

/* ================================================================ LIKHET */
const E = {};
// E1 level a balance: add to the lighter pan
E[1] = function (sup, r, o) {
  const max = sup === 0 ? 10 : sup === 1 ? 15 : 20;
  let left, right, addTo, t, g2 = 0;
  const forms = sup === 0 ? ['a|b+?', 'a+b|c+?'] : ['a+b|c+?', 'a+b|c', 'a|b+?', 'a+b|c+d+?'];
  do {
    const form = pick(r, forms);
    if (form === 'a|b+?') { const a = int(r, sup === 0 ? 3 : 6, max), b = int(r, 1, a - 1); left = [a]; right = [b]; }
    else if (form === 'a+b|c+?') { const a = int(r, 2, 9), b = int(r, 2, Math.min(9, max - a)), c = int(r, 1, a + b - 1); left = [a, b]; right = [c]; }
    else if (form === 'a+b|c') { const a = int(r, 2, 9), b = int(r, 2, Math.min(9, max - a)), c = int(r, 2, a + b - 1); left = [a, b]; right = [c]; }
    else { const a = int(r, 3, 9), b = int(r, 3, Math.min(9, max - a)), c = int(r, 1, 5), d = int(r, 1, 5); left = [a, b]; right = [c, d]; }
    const L = left.reduce((s, v) => s + v, 0), Rr = right.reduce((s, v) => s + v, 0);
    t = L - Rr;
    if (t >= 1 && t <= 10 && L <= max) break;
  } while (g2++ < 200);
  if (r() < 0.5) { const tmp = left; left = right; right = tmp; addTo = 'left'; } else addTo = 'right';
  const L = left.reduce((s, v) => s + v, 0), Rr = right.reduce((s, v) => s + v, 0), heavy = Math.max(L, Rr);
  const eq = addTo === 'right' ? left.join(' + ') + ' = ' + right.join(' + ') + ' + ' + BOX : left.join(' + ') + ' + ' + BOX + ' = ' + right.join(' + ');
  const ds = [{ v: heavy, tag: 'OPERATIONAL' }, { v: L + Rr, tag: 'ADD-ALL' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const s = surf(r, SURF_BAL);       // v5: the animal's food on the pans in an encounter (themeSurf), else a balance surface
  return { key: 'LIKHET:' + norm(eq), target: t, ds, sub: 'balance', mode: 'balance', g: 0.01, noChips: sup > 0, twin: 'F53', givens: left.concat(right),
    params: { left, right, addTo, eq, surface: s, unit: 1, structure: sup === 0 } };
};
// E2 a bundle of 3–4 equations: tap every false one, then fix one (2T)
function e2Eq(r, ok, max) {
  // returns {t, ok, tag, fix:{t, answer}} ; fix only for false ones
  const kinds = ok ? ['same', 'c=a+b', 'a+b=b+a', 'a+b=c+d', 'a+b=c', 'c-a=b'] : ['oper', 'oper', 'off', 'offc', 'wrongsum'];
  for (let g = 0; g < 100; g++) {
    const k = pick(r, kinds);
    const a = int(r, 1, 9), b = int(r, 1, 9), c = a + b; if (c > max) continue;
    if (k === 'same') return { t: a + ' = ' + a, ok: true };
    if (k === 'c=a+b') return { t: c + ' = ' + a + ' + ' + b, ok: true };
    if (k === 'a+b=b+a') { if (a === b) continue; return { t: a + ' + ' + b + ' = ' + b + ' + ' + a, ok: true }; }
    if (k === 'a+b=c+d') { const x = int(r, 1, c - 1); if (x === a || x === b) continue; return { t: a + ' + ' + b + ' = ' + x + ' + ' + (c - x), ok: true }; }
    if (k === 'a+b=c') return { t: a + ' + ' + b + ' = ' + c, ok: true };
    if (k === 'c-a=b') return { t: c + ' ' + MINUS + ' ' + a + ' = ' + b, ok: true };
    if (k === 'oper') { const d = int(r, 1, 4); if (c + d > max) continue;     // 6 + 3 = 9 + 1 (true for an «answer comes next» reader)
      const blankLeft = r() < 0.35;
      return { t: a + ' + ' + b + ' = ' + c + ' + ' + d, ok: false, tag: 'OPERATIONAL',
        fix: blankLeft ? { t: a + ' + ' + BOX + ' = ' + c + ' + ' + d, answer: b + d, oper: b } : { t: a + ' + ' + b + ' = ' + c + ' + ' + BOX, answer: 0, oper: c } }; }
    if (k === 'off') { const x = int(r, 1, c - 1), y = c - x + (r() < 0.5 ? 1 : -1); if (y < 1 || x === a) continue;
      return { t: a + ' + ' + b + ' = ' + x + ' + ' + y, ok: false, tag: 'OFF-BY-ONE', fix: { t: a + ' + ' + b + ' = ' + x + ' + ' + BOX, answer: c - x } }; }
    if (k === 'offc') { const w = c + (r() < 0.5 ? 1 : -1); if (w <= a) continue;
      return { t: w + ' = ' + a + ' + ' + b, ok: false, tag: 'OFF-BY-ONE', fix: { t: w + ' = ' + a + ' + ' + BOX, answer: w - a } }; }
    const w = c + (r() < 0.5 ? 1 : 2) * (r() < 0.5 ? 1 : -1); if (w <= a || w === c) continue;
    return { t: a + ' + ' + b + ' = ' + w, ok: false, tag: 'OFF-BY-ONE', fix: { t: a + ' + ' + BOX + ' = ' + w, answer: w - a } };
  }
  return ok ? { t: '7 = 7', ok: true } : { t: '6 + 3 = 9 + 1', ok: false, tag: 'OPERATIONAL', fix: { t: '6 + 3 = 9 + ' + BOX, answer: 0, oper: 9 } };
}
E[2] = function (sup, r, o) {
  const n = sup === 0 ? 3 : 4, nFalse = sup === 0 ? 1 : int(r, 1, 2), max = sup === 0 ? 10 : 20;
  const eqs = []; const seen = new Set();
  // the OPERATIONAL trap appears in most bundles (it is the misconception this rung exists for)
  let needOper = sup > 0 && r() < 0.75;
  while (eqs.length < n) {
    const wantFalse = eqs.filter(e => !e.ok).length < nFalse && (eqs.length >= n - (nFalse - eqs.filter(e => !e.ok).length) || r() < 0.4);
    let e = e2Eq(r, !wantFalse, max);
    if (wantFalse && needOper && e.tag !== 'OPERATIONAL') { for (let i = 0; i < 20 && e.tag !== 'OPERATIONAL'; i++) e = e2Eq(r, false, max); }
    if (e.tag === 'OPERATIONAL') needOper = false;
    // v5 (WP-P request): at most one trivial «7 = 7» scroll per bundle
    const triv = x => /^(\d+) = \1$/.test(x.t);
    if (triv(e) && eqs.some(triv)) continue;
    if (seen.has(e.t)) continue; seen.add(e.t); eqs.push(e);
  }
  const bundle = shuffle(r, eqs);
  const falseIdx = bundle.map((e, i) => e.ok ? -1 : i).filter(i => i >= 0);
  const fi = pick(r, falseIdx), fix = Object.assign({ i: fi }, bundle[fi].fix);
  const parts = [{ id: 'false', ask: 'finn_feil', target: falseIdx.slice(), mode: 'subset', choices: bundle.map((_, i) => i), g: 1 / (Math.pow(2, n) - 1) },
    { id: 'fix', ask: 'rett', target: fix.answer, mode: 'keypad' }];
  const ds = [{ v: fix.answer + 1, tag: 'OFF-BY-ONE' }, { v: Math.max(0, fix.answer - 1), tag: 'OFF-BY-ONE' }];
  if (fix.oper != null) ds.unshift({ v: fix.oper, tag: 'OPERATIONAL' });
  return { key: 'LIKHET:' + norm(fix.t), target: fix.answer, ds, sub: 'bundle', parts, mode: 'twostep', g: (1 / (Math.pow(2, n) - 1)) * 0.01, noChips: true, twin: 'F54',
    secret: [], params: { bundle: bundle.map(e => ({ t: e.t, ok: e.ok, tag: e.tag || null })), falseIdx, fix, eq: fix.t, structure: sup === 0 } };
};
// E3 missing number on either side of =
E[3] = function (sup, r, o) {
  const forms = sup === 0 ? ['a+b=?+c', 'a+?=b+c', '?=a-b'] : ['a+b=?+c', 'a+?=b+c', '?=a-b', 'a+b=c+?', '?+a=b+c', 'a-b=?-c'];
  const max = sup === 0 ? 12 : 20;
  for (let g2 = 0; g2 < 300; g2++) {
    const form = o.sub || pick(r, forms);
    let a = int(r, 2, 9), b = int(r, 2, 9), c = int(r, 2, 9), t, eq, L;
    if (form === 'a+b=?+c') { L = a + b; t = L - c; eq = a + ' + ' + b + ' = ' + BOX + ' + ' + c; }
    else if (form === 'a+b=c+?') { L = a + b; t = L - c; eq = a + ' + ' + b + ' = ' + c + ' + ' + BOX; }
    else if (form === 'a+?=b+c') { L = b + c; t = L - a; eq = a + ' + ' + BOX + ' = ' + b + ' + ' + c; }
    else if (form === '?+a=b+c') { L = b + c; t = L - a; eq = BOX + ' + ' + a + ' = ' + b + ' + ' + c; }
    else if (form === '?=a-b') { a = int(r, 8, max); b = int(r, 2, a - 2); L = a; t = a - b; eq = BOX + ' = ' + a + ' ' + MINUS + ' ' + b; }
    else { a = int(r, 8, max); b = int(r, 2, a - 3); c = int(r, 1, 6); L = a; t = a - b + c; eq = a + ' ' + MINUS + ' ' + b + ' = ' + BOX + ' ' + MINUS + ' ' + c; }
    if (!(t >= 1 && t <= 20 && L <= max)) continue;
    const giv = eq.match(/\d+/g).map(Number);
    if (giv.includes(t) && g2 < 250) continue;              // the answer is not one of the shown numbers (keeps the tag clean)
    const key = 'LIKHET:' + norm(eq);
    const oper = { 'a+b=?+c': a + b, 'a+b=c+?': a + b, 'a+?=b+c': b + c, '?+a=b+c': b + c, '?=a-b': null, 'a-b=?-c': a - b }[form];
    const ds = [];
    if (oper != null) ds.push({ v: oper, tag: 'OPERATIONAL' });
    if (form === '?=a-b') ds.push({ v: a + b, tag: 'OTHER' }, { v: a, tag: 'ECHO' });
    else if (form === 'a-b=?-c') ds.push({ v: a - b - c, tag: 'OTHER' });
    else ds.push({ v: giv.reduce((s, v) => s + v, 0), tag: 'ADD-ALL' });
    return { key, target: t, ds: near(t, ds), sub: form, twin: 'F54', givens: giv, params: { form, eq, structure: sup === 0 } };
  }
  return { key: 'LIKHET:9+5=?+6', target: 8, ds: near(8, [{ v: 14, tag: 'OPERATIONAL' }, { v: 20, tag: 'ADD-ALL' }]), sub: 'a+b=?+c', twin: 'F54', givens: [9, 5, 6],
    params: { form: 'a+b=?+c', eq: '9 + 5 = ' + BOX + ' + 6', structure: sup === 0 } };
}
// E1–E3 honour a forced key ('LIKHET:9+5=?+6', '?=12-4'): solve it (one unknown, 0..40)
function evalSide(side, t) {
  const toks = side.match(/[+-]|\d+|\?/g); if (!toks) return NaN;
  let v = 0, sign = 1, want = true;
  for (const k of toks) { if (k === '+' || k === '-') { if (want) return NaN; sign = k === '+' ? 1 : -1; want = true; } else { if (!want) return NaN; v += sign * (k === '?' ? t : +k); want = false; } }
  return want ? NaN : v;
}
function e3FromKey(kv) {
  if (!kv || !/^[\d+\-?]+=[\d+\-?]+$/.test(kv) || kv.split('?').length !== 2) return null;
  const [L, Rr] = kv.split('='); let sol = null;
  for (let t = 0; t <= 40; t++) { const a = evalSide(L, t), b = evalSide(Rr, t); if (isNaN(a) || isNaN(b)) return null; if (a === b) { if (sol != null) return null; sol = t; } }
  return sol;
}

/* ================================================================ PROBLEM (CGI order; model method) */
// Speech (SYNTHESIS §6.6): the story is SHOWN (numbers on signs); only number-free relation sentences are spoken – each one a template of
// PB_TPL below with ≤ 2 slots over the small sets PB_SETS (WP-P declares them in lines_prob.js; F.BANKS_REGN.SPEECH / .SETS list them).
// v5d WP-K3 (logic #57), agreed with WP-R3: the story children are ONE shared list – F.PROB_LINES.NAVN / SETS.BARN_NAVN (lines_prob.js):
// Mia, Ida, Emma, Ola, Ali. Ole is the 2-year-old prince, Kari the castle cook, Per the postman – never word-problem children. The
// generator takes the list from lines_prob.js when it is loaded (speech files load before js/learn), else this copy (Node tests).
// In the page only the names whose clips exist are used (see pbNames).
// f_prob.js's NAME_MAP (Ole → Ola, Kari → Emma) is then a no-op. The old names stay in the PB_NAVN slot set (old saves / presenters).
const PB_NAVN_OLD = [['Mia', 'hun'], ['Kari', 'hun'], ['Ole', 'han'], ['Ali', 'han']];
const PB_NAVN = [['Mia', 'hun'], ['Ida', 'hun'], ['Emma', 'hun'], ['Ola', 'han'], ['Ali', 'han']];
// in the page a name is used only once its story clips exist («Ida har noen kuler.») – until the lead regenerates speech the stories use
// Mia and Ali (never a silent story); Node / no clip map: the whole list
function pbNames() {
  let L = PB_NAVN;
  try { const P = F.PROB_LINES && F.PROB_LINES.NAVN; if (Array.isArray(P) && P.length >= 2 && P.every(x => Array.isArray(x) && x[0] && x[1])) L = P; } catch (e) { /* the copy */ }
  const M = typeof window !== 'undefined' ? window.SPEECH : null;
  if (!M) return L;
  const ok = L.filter(x => !!M[x[0] + ' har noen kuler.']);
  return ok.length >= 2 ? ok : L;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const POSS = [   // things a person has, gets, gives away
  { id: 'kuler', pl: 'kuler', model: 'kule' }, { id: 'kort', pl: 'kort', model: null },
  { id: 'perler', pl: 'perler', model: 'perle' }, { id: 'kroner', pl: 'kroner', model: 'krone' },
];
const PLACE = [  // animals at a place: fly / swim / hop away, come
  { id: 'fugler', pl: 'fugler', model: 'fugl', where: 'i treet', sitP: 'sitter', sit: 'satt', go: 'flyr bort', went: 'fløy bort', come: 'kommer flygende', came: 'kom flygende', rel: 'fly', forst: 'Hvor mange satt der først?' },
  { id: 'ender', pl: 'ender', model: 'and', where: 'i dammen', sitP: 'svømmer', sit: 'svømte', go: 'svømmer bort', went: 'svømte bort', come: 'kommer svømmende', came: 'kom svømmende', rel: 'swim', forst: 'Hvor mange svømte der først?' },
  { id: 'sauer', pl: 'sauer', model: 'sau', where: 'på enga', sitP: 'går', sit: 'gikk', go: 'går inn i fjøset', went: 'gikk inn i fjøset', come: 'kommer løpende', came: 'kom løpende', rel: 'walk', forst: 'Hvor mange var der først?' },
  { id: 'frosker', pl: 'frosker', model: 'frosk', where: 'på steinen', sitP: 'sitter', sit: 'satt', go: 'hopper i vannet', went: 'hoppet i vannet', come: 'kommer hoppende', came: 'kom hoppende', rel: 'hop', forst: 'Hvor mange satt der først?' },
];
// v5 (WP-E2, encounters): the story's animals are the animal she is meeting when a frame fits it (frog → frosker on the stone, duck →
// ender in the pond, sheep → sauer, a small tree bird → fugler in the tree) – the same templates and clips, the theme picks the frame
// v5d WP-K3 (playtest2 V5 / WP-E2 «not done»): story frames for more encounter animals – only in an encounter with that animal, and in
// the page only once their clips exist (the lead regenerates speech; until then the story uses the frames above, never silence)
const PLACE_THEMED = [
  { id: 'ekorn', pl: 'ekorn', model: 'ekorn', where: 'i treet', sitP: 'sitter', sit: 'satt', go: 'klatrer ned', went: 'klatret ned', come: 'kommer klatrende', came: 'kom klatrende', rel: 'climb', forst: 'Hvor mange satt der først?' },
  { id: 'kaniner', pl: 'kaniner', model: 'kanin', where: 'på enga', sitP: 'sitter', sit: 'satt', go: 'hopper bort', went: 'hoppet bort', come: 'kommer hoppende', came: 'kom hoppende', rel: 'hop', forst: 'Hvor mange satt der først?' },
  { id: 'honer', pl: 'høner', model: 'høne', where: 'i hønsegården', sitP: 'går', sit: 'gikk', go: 'går inn i hønsehuset', went: 'gikk inn i hønsehuset', come: 'kommer løpende', came: 'kom løpende', rel: 'walk', forst: 'Hvor mange var der først?' },
  { id: 'fisker', pl: 'fisker', model: 'fisk', where: 'i dammen', sitP: 'svømmer', sit: 'svømte', go: 'svømmer bort', went: 'svømte bort', come: 'kommer svømmende', came: 'kom svømmende', rel: 'swim', forst: 'Hvor mange svømte der først?' },
];
const PLACE_OF = { and: 'ender', andunge: 'ender', sau: 'sauer', lam: 'sauer', frosk: 'frosker', krystallfrosk: 'frosker',
  ekorn: 'ekorn', kanin: 'kaniner', blomsterkanin: 'kaniner', 'høne': 'honer', hane: 'honer', kylling: 'honer', fisk: 'fisker', gullfisk: 'fisker' };
const NOT_TREE = { and: 1, andunge: 1, 'gås': 1, svane: 1, 'måke': 1, 'høne': 1, hane: 1, kylling: 1, pingvin: 1, ugle: 0 };
const frameClipOk = f => { try { const M = typeof window !== 'undefined' ? window.SPEECH : null; return !M || !!M['Noen ' + f.pl + ' ' + f.sitP + ' ' + f.where + '.']; } catch (e) { return false; } };
function placeFor(r) {
  const th = CUR_TH, a = th && (th.animal || th.sp);
  const id = a && (PLACE_OF[a] || PLACE_OF[th.sp] || (th.kl === 'fugl' && !NOT_TREE[a] && !th.fairy ? 'fugler' : null));
  const f = id && (PLACE.find(x => x.id === id) || PLACE_THEMED.find(x => x.id === id && frameClipOk(x)));
  if (f && r() < 0.8) { TH_USED = true; return f; }
  return pick(r, PLACE);
}
const EAT = [    // food: eaten
  { id: 'boller', pl: 'boller', model: 'bolle', where: 'på brettet' }, { id: 'kaker', pl: 'kaker', model: 'kake', where: 'på fatet' },
  { id: 'epler', pl: 'epler', model: 'eple', where: 'i kurven' },
];
const PARTS = [  // part-whole: a whole of things with two kinds
  { id: 'epler', model: 'eple', where: 'ligger i kurven', kinds: ['røde', 'grønne'] }, { id: 'kuler', model: 'kule', where: 'ligger i posen', kinds: ['blå', 'gule'] },
  { id: 'sauer', model: 'sau', where: 'står på enga', kinds: ['svarte', 'hvite'] }, { id: 'blomster', model: 'blomst', where: 'står i vasen', kinds: ['roser', 'tulipaner'] },
  { id: 'barn', model: null, kinds: ['gutter', 'jenter'] }, { id: 'lommer', model: 'krone', kinds: ['den ene', 'den andre'] },
];
const PB_SETS = { PB_NAVN: [...new Set(PB_NAVN.concat(PB_NAVN_OLD).map(x => x[0]))], PB_TING: POSS.map(x => x.pl), PB_PRON: ['hun', 'han'], PB_PRON_CAP: ['Hun', 'Han'] };
const PB_TPL = {};
const tp = (id, text, slots) => { PB_TPL[id] = slots ? { text, slots } : { text }; };
const NT = { navn: 'PB_NAVN', ting: 'PB_TING' }, PC = { pron: 'PB_PRON_CAP' }, PL = { pron: 'PB_PRON' };
tp('pb_har_noen', '{navn} har noen {ting}.', NT); tp('pb_hadde_noen', '{navn} hadde noen {ting}.', NT); tp('pb_ga_bort_noen', '{navn} ga bort noen {ting}.', NT);
tp('pb_far_til', '{pron} får noen til.', PC); tp('pb_gir_bort', '{pron} gir bort noen.', PC); tp('pb_fikk_til', '{pron} fikk noen til.', PC); tp('pb_ga_bort', '{pron} ga bort noen.', PC);
tp('pb_q_har_naa', 'Hvor mange har {pron} nå?', PL); tp('pb_q_har_igjen', 'Hvor mange har {pron} igjen?', PL); tp('pb_q_fikk', 'Hvor mange fikk {pron}?', PL);
tp('pb_q_ga_bort', 'Hvor mange ga {pron} bort?', PL); tp('pb_q_hadde_forst', 'Hvor mange hadde {pron} først?', PL);
tp('pb_q_igjen', 'Hvor mange er igjen?'); tp('pb_q_det_naa', 'Hvor mange er det nå?');
for (const a of PLACE.concat(PLACE_THEMED)) {
  tp('pb_' + a.id + '_er', 'Noen ' + a.pl + ' ' + a.sitP + ' ' + a.where + '.'); tp('pb_' + a.id + '_var', 'Noen ' + a.pl + ' ' + a.sit + ' ' + a.where + '.');
  tp('pb_' + a.id + '_gaar', 'Noen ' + a.go + '.'); tp('pb_' + a.id + '_gikk', 'Noen ' + a.went + '.');
  tp('pb_' + a.id + '_kommer', 'Noen til ' + a.come + '.'); tp('pb_' + a.id + '_kom', 'Noen til ' + a.came + '.');
  tp('pb_' + a.id + '_q_gikk', 'Hvor mange ' + a.went + '?'); tp('pb_' + a.id + '_q_kom', 'Hvor mange ' + a.came + '?'); tp('pb_' + a.id + '_q_forst', a.forst);
}
for (const m of EAT) tp('pb_' + m.id + '_ligger', 'Noen ' + m.pl + ' ligger ' + m.where + '.');
tp('pb_blir_spist', 'Noen blir spist.');
for (const w of PARTS) if (w.id !== 'lommer') { tp('pb_pw_' + w.id + '_1', 'Noen er ' + w.kinds[0] + '.'); tp('pb_pw_' + w.id + '_2', 'Resten er ' + w.kinds[1] + '.'); tp('pb_pw_' + w.id + '_q', 'Hvor mange er ' + w.kinds[1] + '?'); }
tp('pb_lommer', '{navn} har noen kroner i to lommer.', { navn: 'PB_NAVN' }); tp('pb_lommer_2', 'Vi vet hvor mange det er i den ene.'); tp('pb_lommer_q', 'Hvor mange er det i den andre?');
tp('pb_q_flere', 'Hvor mange flere har {navn}?', { navn: 'PB_NAVN' }); tp('pb_q_faerre', 'Hvor mange færre har {navn}?', { navn: 'PB_NAVN' });
tp('pb_tarn', 'Tårnet er høyere enn muren.'); tp('pb_q_tarn', 'Hvor mange klosser høyere er tårnet?');
const say = (id, slots) => ({ id, slots: slots || {}, text: PB_TPL[id].text.replace(/\{(\w+)\}/g, (m, k) => (slots || {})[k]) });
function names2(r) { const NAMES = pbNames(); const a = pick(r, NAMES); let b = pick(r, NAMES); let g = 0; while (b[0] === a[0] && g++ < 20) b = pick(r, NAMES); return [a, b]; }
const pNums = sup => sup === 0 ? 10 : sup === 1 ? 15 : 20;
function eqAccept(list) { return list.map(norm); }
const spk = list => ({ speak: list, speakText: list.map(x => x.text) });

const P = {};
P[1] = function (sup, r, o) {     // result unknown: join / separate (2T: equation tiles, then the answer)
  const max = pNums(sup);
  const frame = o.sub || pick(r, ['poss_get', 'poss_give', 'place_go', 'place_come', 'eat']);
  const op = (frame === 'poss_get' || frame === 'place_come') ? '+' : '-';
  let a, b, t, ok = false;
  for (let g = 0; g < 300 && !ok; g++) {
    a = int(r, op === '+' ? 2 : 4, op === '+' ? max - 2 : max); b = int(r, 2, Math.max(2, op === '+' ? max - a : a - 2));
    t = op === '+' ? a + b : a - b;
    ok = b >= 2 && t >= 2 && t <= max && t !== a && t !== b;
  }
  if (!ok) { a = op === '+' ? 4 : 9; b = op === '+' ? 3 : 4; t = op === '+' ? 7 : 5; }
  const nm = pick(r, pbNames()), N = nm[0], pr = nm[1];
  let lines, speak, rel, ask, model;
  if (frame === 'poss_get' || frame === 'poss_give') {
    const th = pick(r, POSS); model = th.model;
    lines = op === '+' ? [N + ' har ' + a + ' ' + th.pl + '.', cap(pr) + ' får ' + b + ' til.', 'Hvor mange ' + th.pl + ' har ' + pr + ' nå?']
      : [N + ' har ' + a + ' ' + th.pl + '.', cap(pr) + ' gir bort ' + b + '.', 'Hvor mange ' + th.pl + ' har ' + pr + ' igjen?'];
    speak = [say('pb_har_noen', { navn: N, ting: th.pl }), say(op === '+' ? 'pb_far_til' : 'pb_gir_bort', { pron: cap(pr) }), say(op === '+' ? 'pb_q_har_naa' : 'pb_q_har_igjen', { pron: pr })];
    rel = frame; ask = op === '+' ? 'naa' : 'igjen';
  } else if (frame === 'eat') {
    const th = pick(r, EAT); model = th.model;
    lines = [a + ' ' + th.pl + ' ligger ' + th.where + '.', b + ' blir spist.', 'Hvor mange ' + th.pl + ' er igjen?'];
    speak = [say('pb_' + th.id + '_ligger'), say('pb_blir_spist'), say('pb_q_igjen')]; rel = 'eat'; ask = 'igjen';
  } else {
    const th = placeFor(r); model = th.model;
    lines = op === '+' ? [a + ' ' + th.pl + ' ' + th.sitP + ' ' + th.where + '.', b + ' til ' + th.come + '.', 'Hvor mange ' + th.pl + ' er det nå?']
      : [a + ' ' + th.pl + ' ' + th.sitP + ' ' + th.where + '.', b + ' ' + th.go + '.', 'Hvor mange ' + th.pl + ' er igjen?'];
    speak = [say('pb_' + th.id + '_er'), say('pb_' + th.id + (op === '+' ? '_kommer' : '_gaar')), say(op === '+' ? 'pb_q_det_naa' : 'pb_q_igjen')];
    rel = (op === '+' ? 'come_' : 'go_') + th.rel; ask = op === '+' ? 'naa' : 'igjen';
  }
  const eq = a + ' ' + (op === '+' ? '+' : MINUS) + ' ' + b + ' = ' + t;
  const acc = op === '+' ? [a + '+' + b + '=' + t, b + '+' + a + '=' + t] : [a + '-' + b + '=' + t];
  const ds = [{ v: op === '+' ? a - b : a + b, tag: 'KEYWORD' }, { v: a, tag: 'ECHO' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const parts = [{ id: 'eq', ask: 'regnestykke', target: eq, accept: eqAccept(acc), mode: 'tiles', tiles: shuffle(r, [a, b, t, op === '+' ? '+' : MINUS, '=', op === '+' ? MINUS : '+']) },
    { id: 'answer', ask: 'svar', target: t, mode: 'keypad' }];
  return { key: 'PROBLEM:P1:' + rel + ':' + a + ',' + b, target: t, ds, sub: rel, parts, mode: 'twostep', g: 0.0001, noChips: true, twin: 'F55', givens: [a, b],
    params: Object.assign({ schema: 'change', unknown: 'result', frame, rel, ask, lines, text: lines.join(' '), names: { who: N },
      surface: model, nums: { a, b, c: t }, op, eq, eqAccept: eqAccept(acc), structure: sup === 0 }, spk(speak)) };
};
P[2] = function (sup, r, o) {     // part-whole, a part unknown
  const max = pNums(sup);
  const fr = (o.sub && PARTS.find(x => x.id === o.sub)) || pick(r, PARTS);
  let c, a, t;
  for (let g = 0; g < 200; g++) { c = int(r, 5, max); a = int(r, 2, c - 2); t = c - a; if (t >= 2 && t !== a && t !== c) break; }
  const nm = pick(r, pbNames());
  let lines, speak;
  if (fr.id === 'lommer') {
    lines = [nm[0] + ' har ' + c + ' kroner i to lommer.', 'I den ene lomma er det ' + a + ' kroner.', 'Hvor mange kroner er det i den andre?'];
    speak = [say('pb_lommer', { navn: nm[0] }), say('pb_lommer_2'), say('pb_lommer_q')];
  } else {
    lines = fr.id === 'barn' ? ['Det er ' + c + ' barn i parken.', a + ' er gutter.', 'Hvor mange er jenter?']
      : [c + ' ' + fr.id + ' ' + fr.where + '.', a + ' er ' + fr.kinds[0] + ', resten er ' + fr.kinds[1] + '.', 'Hvor mange er ' + fr.kinds[1] + '?'];
    speak = [say('pb_pw_' + fr.id + '_1'), say('pb_pw_' + fr.id + '_2'), say('pb_pw_' + fr.id + '_q')];
  }
  const ds = [{ v: c + a, tag: 'KEYWORD' }, { v: a, tag: 'ECHO' }, { v: c, tag: 'ECHO' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const eq = c + ' ' + MINUS + ' ' + a + ' = ' + t;
  return { key: 'PROBLEM:P2:' + fr.id + ':' + c + ',' + a, target: t, ds, sub: fr.id, twin: 'F55', givens: [c, a],
    params: Object.assign({ schema: 'part-whole', unknown: 'part', frame: fr.id, rel: 'part_' + fr.id, ask: 'resten', lines, text: lines.join(' '),
      names: { who: nm[0] }, surface: fr.model, nums: { whole: c, part: a, other: t }, eq, eqAccept: eqAccept([c + '-' + a + '=' + t, a + '+' + t + '=' + c, t + '+' + a + '=' + c]),
      bars: [{ name: fr.kinds[0], value: a, known: true }, { name: fr.kinds[1], value: t, known: false }], whole: c, structure: sup === 0 }, spk(speak)) };
};
P[3] = function (sup, r, o) {     // change unknown
  const max = pNums(sup);
  const frame = o.sub || pick(r, ['poss_get', 'poss_give', 'place_go', 'place_come']);
  const join = frame === 'poss_get' || frame === 'place_come';
  let a, c, t;
  for (let g = 0; g < 200; g++) {
    if (join) { a = int(r, 2, max - 2); c = int(r, a + 2, max); t = c - a; } else { a = int(r, 5, max); c = int(r, 2, a - 2); t = a - c; }
    if (t >= 2 && t !== a && t !== c) break;
  }
  const nm = pick(r, pbNames()), N = nm[0], pr = nm[1];
  let lines, speak, rel, model;
  if (frame === 'poss_get' || frame === 'poss_give') {
    const th = pick(r, POSS); model = th.model;
    lines = join ? [N + ' hadde ' + a + ' ' + th.pl + '.', cap(pr) + ' fikk noen til.', 'Nå har ' + pr + ' ' + c + '.', 'Hvor mange fikk ' + pr + '?']
      : [N + ' hadde ' + a + ' ' + th.pl + '.', cap(pr) + ' ga bort noen.', 'Nå har ' + pr + ' ' + c + ' igjen.', 'Hvor mange ga ' + pr + ' bort?'];
    speak = [say('pb_hadde_noen', { navn: N, ting: th.pl }), say(join ? 'pb_fikk_til' : 'pb_ga_bort', { pron: cap(pr) }), say(join ? 'pb_q_fikk' : 'pb_q_ga_bort', { pron: pr })];
    rel = join ? 'poss_got' : 'poss_gave';
  } else {
    const th = placeFor(r); model = th.model;
    lines = join ? [a + ' ' + th.pl + ' ' + th.sit + ' ' + th.where + '.', 'Noen til ' + th.came + '.', 'Nå er det ' + c + '.', 'Hvor mange ' + th.came + '?']
      : [a + ' ' + th.pl + ' ' + th.sit + ' ' + th.where + '.', 'Noen ' + th.went + '.', 'Nå er det ' + c + ' igjen.', 'Hvor mange ' + th.went + '?'];
    speak = [say('pb_' + th.id + '_var'), say('pb_' + th.id + (join ? '_kom' : '_gikk')), say('pb_' + th.id + (join ? '_q_kom' : '_q_gikk'))];
    rel = (join ? 'came_' : 'went_') + th.rel;
  }
  const ds = [{ v: a + c, tag: 'KEYWORD' }, { v: c, tag: 'ECHO' }, { v: a, tag: 'ECHO' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const eq = join ? a + ' + ' + t + ' = ' + c : a + ' ' + MINUS + ' ' + t + ' = ' + c;
  const acc = join ? [a + '+' + t + '=' + c, c + '-' + a + '=' + t] : [a + '-' + t + '=' + c, a + '-' + c + '=' + t];
  return { key: 'PROBLEM:P3:' + rel + ':' + a + ',' + c, target: t, ds, sub: rel, twin: 'F55', givens: [a, c],
    params: Object.assign({ schema: 'change', unknown: 'change', frame, rel, ask: join ? 'fikk' : 'bort', lines, text: lines.join(' '), names: { who: N },
      surface: model, nums: { start: a, end: c, change: t }, op: join ? '+' : '-', eq, eqAccept: eqAccept(acc), structure: sup === 0 }, spk(speak)) };
};
P[4] = function (sup, r, o) {     // compare, difference unknown (2T: bars + «?», then the answer)
  const max = pNums(sup);
  let a, b, t;
  for (let g = 0; g < 200; g++) { a = int(r, 5, max); b = int(r, 2, a - 2); t = a - b; if (t >= 2 && t !== b && t !== a) break; }
  const tower = o.sub === 'tårn' || (o.sub !== 'har' && r() < 0.25);
  const nm = names2(r), th = tower ? { pl: 'klosser', model: 'kloss' } : pick(r, POSS);
  const ask = tower ? 'hoyere' : (r() < 0.6 ? 'flere' : 'faerre');
  const N1 = nm[0][0], N2 = nm[1][0];
  const lines = tower ? ['Tårnet er ' + a + ' klosser høyt.', 'Muren er ' + b + ' klosser høy.', 'Hvor mange klosser høyere er tårnet?']
    : [N1 + ' har ' + a + ' ' + th.pl + '.', N2 + ' har ' + b + ' ' + th.pl + '.', ask === 'flere' ? 'Hvor mange flere har ' + N1 + '?' : 'Hvor mange færre har ' + N2 + '?'];
  // v5 (WP-P request): the «har» story is spoken whole (who has some of what – numbers stay on the signs), not only its question
  const speak = tower ? [say('pb_tarn'), say('pb_q_tarn')] : [say('pb_har_noen', { navn: N1, ting: th.pl }), say('pb_har_noen', { navn: N2, ting: th.pl }),
    ask === 'flere' ? say('pb_q_flere', { navn: N1 }) : say('pb_q_faerre', { navn: N2 })];
  const ds = [{ v: a + b, tag: 'KEYWORD' }, { v: a, tag: 'ECHO' }, { v: b, tag: 'ECHO' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const n1 = tower ? 'tårnet' : N1, n2 = tower ? 'muren' : N2, frame = tower ? 'tårn' : 'har';
  const bars = [{ name: n1, value: a, known: true }, { name: n2, value: b, known: true }];
  const parts = [{ id: 'model', ask: 'merk_sporsmal', target: 'diff', mode: 'ribbon', bars, choices: ['diff', 'total', n1, n2] },
    { id: 'answer', ask: 'svar', target: t, mode: 'keypad' }];
  return { key: 'PROBLEM:P4:' + frame + ':' + a + ',' + b, target: t, ds, sub: frame + '_' + ask, parts, mode: 'twostep', g: 0.0025, noChips: true, twin: 'F56', givens: [a, b],
    params: Object.assign({ schema: 'compare', unknown: 'difference', frame, rel: 'cmp_' + frame, ask, lines, text: lines.join(' '),
      names: { who: N1, who2: N2 }, surface: th.model, nums: { big: a, small: b, diff: t }, bars, barAsk: 'diff',
      eq: a + ' ' + MINUS + ' ' + b + ' = ' + t, eqAccept: eqAccept([a + '-' + b + '=' + t, b + '+' + t + '=' + a, t + '+' + b + '=' + a]), structure: sup === 0 }, spk(speak)) };
};
P[5] = function (sup, r, o) {     // start unknown (2T: equation/model, then the answer)
  const max = pNums(sup);
  const frame = o.sub || pick(r, ['place_go', 'poss_get', 'poss_give', 'place_come']);
  const join = frame === 'poss_get' || frame === 'place_come';
  let b, c, t;
  for (let g = 0; g < 200; g++) {
    if (join) { c = int(r, 6, max); b = int(r, 2, c - 3); t = c - b; } else { t = int(r, 5, max); b = int(r, 2, t - 2); c = t - b; }
    if (t >= 2 && c >= 2 && t !== b && t !== c && b !== c) break;
  }
  const nm = pick(r, pbNames()), N = nm[0], pr = nm[1];
  let lines, speak, rel, model;
  if (frame === 'place_go' || frame === 'place_come') {
    const th = placeFor(r); model = th.model;
    lines = join ? ['Noen ' + th.pl + ' ' + th.sit + ' ' + th.where + '.', b + ' til ' + th.came + '.', 'Nå er det ' + c + '.', th.forst]
      : ['Noen ' + th.pl + ' ' + th.sit + ' ' + th.where + '.', b + ' ' + th.went + '.', 'Nå er det ' + c + ' igjen.', th.forst];
    speak = [say('pb_' + th.id + '_var'), say('pb_' + th.id + (join ? '_kom' : '_gikk')), say('pb_' + th.id + '_q_forst')];
    rel = (join ? 'came_' : 'went_') + th.rel;
  } else {
    const th = pick(r, POSS); model = th.model;
    lines = join ? [N + ' hadde noen ' + th.pl + '.', cap(pr) + ' fikk ' + b + ' til.', 'Nå har ' + pr + ' ' + c + '.', 'Hvor mange hadde ' + pr + ' først?']
      : [N + ' ga bort ' + b + ' ' + th.pl + '.', 'Nå har ' + pr + ' ' + c + ' igjen.', 'Hvor mange hadde ' + pr + ' først?'];
    speak = join ? [say('pb_hadde_noen', { navn: N, ting: th.pl }), say('pb_fikk_til', { pron: cap(pr) }), say('pb_q_hadde_forst', { pron: pr })]
      : [say('pb_ga_bort_noen', { navn: N, ting: th.pl }), say('pb_q_hadde_forst', { pron: pr })];
    rel = join ? 'poss_got' : 'poss_gave';
  }
  // the keyword trap: «fikk … til» → plus, «fløy bort / ga bort» → minus – both wrong for a start-unknown story
  const kw = join ? b + c : Math.abs(c - b);
  const ds = [{ v: kw, tag: 'KEYWORD' }, { v: c, tag: 'ECHO' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
  const eq = join ? t + ' + ' + b + ' = ' + c : t + ' ' + MINUS + ' ' + b + ' = ' + c;
  const acc = join ? [t + '+' + b + '=' + c, c + '-' + b + '=' + t] : [t + '-' + b + '=' + c, c + '+' + b + '=' + t, b + '+' + c + '=' + t];
  const parts = [{ id: 'eq', ask: 'regnestykke', target: eq, accept: eqAccept(acc), mode: 'tiles', model: join ? '?+b=c' : '?-b=c', tiles: shuffle(r, [b, c, t, '+', MINUS, '=']) },
    { id: 'answer', ask: 'svar', target: t, mode: 'keypad' }];
  return { key: 'PROBLEM:P5:' + rel + ':' + b + ',' + c, target: t, ds, sub: rel, parts, mode: 'twostep', g: 0.0001, noChips: true, twin: 'F55', givens: [b, c],
    params: Object.assign({ schema: 'change', unknown: 'start', frame, rel, ask: 'forst', lines, text: lines.join(' '), names: { who: N },
      surface: model, nums: { start: t, change: b, end: c }, op: join ? '+' : '-', eq, eqAccept: eqAccept(acc),
      bars: [{ name: 'først', value: t, known: false }, { name: join ? 'fikk' : 'bort', value: b, known: true }, { name: 'nå', value: c, known: true }], structure: sup === 0 }, spk(speak)) };
};
// clip count of the PROBLEM speech (every template × its slot sets)
function pbClips() { let n = 0; for (const id in PB_TPL) { let k = 1; for (const s of Object.values(PB_TPL[id].slots || {})) k *= PB_SETS[s].length; n += k; } return n; }

/* ================================================================ public */
const GENS = { REGN: R, LIKHET: E, PROBLEM: P };
// contrast items (the engine's «3 hits on one tag» trigger): steer the rung's generator to the structure that tag is about
const CONTRAST_SUB = { 'REGN:10:SMALLER-FROM-LARGER': 'sub', 'REGN:10:NO-CARRY': 'add', 'REGN:9:PV-PLACE': null, 'LIKHET:3:OPERATIONAL': 'a+b=?+c',
  'LIKHET:3:ADD-ALL': 'a+?=b+c', 'PROBLEM:5:KEYWORD': 'place_go', 'PROBLEM:4:KEYWORD': 'har', 'PROBLEM:1:KEYWORD': 'place_go' };
const CONTRAST_TAGS = { REGN: ['NO-CARRY', 'SMALLER-FROM-LARGER', 'PV-PLACE', 'ADD-ALL', 'OPERATIONAL'], LIKHET: ['OPERATIONAL', 'ADD-ALL'], PROBLEM: ['KEYWORD'] };
// o.target (debug / scripted: F.dbg.forceTask(fmt, {target})) – regenerate until the answer is that target (≤ 400 tries)
// v5r2: formats that always draw their own things (F48 the bakery's buns, F46 crystals, F47 gates, F49 the fact house, F42 / F44 cards
// and the line) never take the encounter's theme – the item would be marked «themed: surface» (the animal's food, a food line before it,
// the friend's-world star kind) while the board shows buns
const OWN_SURF = { F42: 1, F44: 1, F46: 1, F47: 1, F48: 1, F49: 1 };
function gen(strand, rung, sup, rng, o) {
  o = o || {};
  const prev = CUR_TH; CUR_TH = o.theme && typeof o.theme === 'object' && !OWN_SURF[o.format] ? o.theme : null; TH_USED = false;
  try {
    let it = null;
    if (o.target == null || o.key || Array.isArray(o.target)) it = gen1(strand, rung, sup, rng, o);
    else for (let i = 0; i < 400; i++) { it = gen1(strand, rung, sup, rng, o); if (!it || String(it.target) === String(o.target)) break; }
    if (it && TH_USED && it.params) it.params.themed = 'surface';
    return it;
  } finally { CUR_TH = prev; }
}
function gen1(strand, rung, sup, rng, o) {
  const T = GENS[strand]; if (!T) return null;
  rung = Math.max(1, Math.min(MAX[strand], rung | 0 || 1)); sup = Math.max(0, Math.min(2, sup == null ? 1 : sup | 0));
  const r = rng || Math.random; o = o || {};
  if (o.kind === 'contrast' && o.tag && !o.sub && CONTRAST_SUB[strand + ':' + rung + ':' + o.tag]) o = Object.assign({}, o, { sub: CONTRAST_SUB[strand + ':' + rung + ':' + o.tag] });
  let x;
  if (strand === 'LIKHET' && rung === 3 && o.key) {    // honour a forced E3 key
    const kv = keyVal(o.key), t = e3FromKey(kv);
    if (t != null && kv.includes('?')) {
      const eq = kv.replace(/-/g, ' ' + MINUS + ' ').replace(/\+/g, ' + ').replace(/=/g, ' = ').replace('?', BOX);
      const giv = (kv.match(/\d+/g) || []).map(Number);
      x = { key: 'LIKHET:' + norm(eq), target: t, ds: near(t, [{ v: giv[0] + (giv[1] || 0), tag: 'OPERATIONAL' }, { v: giv.reduce((s, v) => s + v, 0), tag: 'ADD-ALL' }]),
        sub: 'key', twin: 'F54', givens: giv, params: { form: 'key', eq, structure: sup === 0 } };
    }
  }
  if (!x) x = T[rung](sup, r, o);
  if (!x) return null;
  const it = mk(strand, rung, sup, r, o, x);
  if (o.kind === 'contrast' && o.tag) it.params.contrast = o.tag;
  return it;
}
// Leitner key → rung fit
function fits(strand, rung, key) {
  if (!GENS[strand] || key == null || String(key).indexOf(strand + ':') !== 0) return false;
  const kv = keyVal(key), f = parseFact(kv);
  if (strand === 'REGN') {
    if (rung === 1) { const m = /^10=(\d)\+(\d)$/.exec(kv); return !!m && +m[1] + +m[2] === 10 && +m[1] >= 1 && +m[2] >= 1; }
    if (rung === 2) return /^R2:(all|hidden|pairs):(\d+)/.test(kv) && +kv.split(':')[2] >= 5 && +kv.split(':')[2] <= 10;
    if (rung === 3) return (!!f && f.op === '+' && (f.a === f.b || Math.abs(f.a - f.b) === 1) && f.a >= 1 && f.a <= 10 && f.b <= 10) || /^half(\d+)$/.test(kv) && +kv.slice(4) % 2 === 0 && +kv.slice(4) <= 20;
    if (rung === 4) return !!f && f.op === '+' && f.c > 10 && f.c <= 18 && f.a <= 9 && f.b <= 9 && Math.max(f.a, f.b) >= 6;
    if (rung === 5) return !!f && f.op === '-' && f.a >= 11 && f.a <= 18 && f.b >= 2 && f.b <= 9 && f.b > f.a - 10;
    if (rung === 6) return /^fam\d+,\d+$/.test(kv) || /^(\d+|\?)[+-](\d+|\?)=(\d+|\?)$/.test(kv) && kv.split('?').length === 2;
    if (rung === 7) return /^\d+(\+\d+){2,3}$/.test(kv) && kv.split('+').reduce((s, v) => s + +v, 0) <= 20;
    if (rung === 8) return !!f && (f.op === '+' ? f.a <= 10 && f.b <= 10 : f.a <= 20 && f.b <= 10 && f.c >= 0 && f.c <= 10);
    if (rung === 9) return !!f && f.a >= 11 && f.c >= 1 && f.c <= 99 && ((f.b >= 1 && f.b <= 9 && (f.op === '+' ? (f.a % 10) + f.b <= 9 : (f.a % 10) >= f.b)) || (f.b % 10 === 0 && f.b >= 10));
    if (rung === 10) return !!f && f.a >= 11 && f.b >= 2 && f.b <= 9 && f.c >= 10 && f.c <= 99 && (f.op === '+' ? (f.a % 10) + f.b >= 10 : (f.a % 10) < f.b);
    if (rung === 11) return !!f && f.a >= 11 && f.b >= 11 && f.c >= 10 && f.c <= 99 && (f.op === '+' ? (f.a % 10) + (f.b % 10) >= 10 : (f.a % 10) < (f.b % 10));
    if (rung === 12) { const m = /^100=(\d+)\+(\d+)$/.exec(kv); return !!m && +m[1] + +m[2] === 100; }
    return false;
  }
  if (strand === 'LIKHET') {
    if (rung === 3) return e3FromKey(kv) != null;
    if (rung === 1) return /^[\d+]+=[\d+?]+$/.test(kv) || /^[\d+?]+=[\d+]+$/.test(kv);
    return rung === 2 && kv.includes('?');
  }
  if (strand === 'PROBLEM') { const m = /^P(\d):/.exec(kv); return !!m && +m[1] === rung; }
  return false;
}
function facts(strand, rung) {
  if (strand === 'REGN' && rung === 8) return R8FACTS.map(k => 'REGN:' + k);
  if (strand === 'REGN' && rung === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(h => 'REGN:10=' + (10 - h) + '+' + h);
  if (strand === 'REGN' && rung === 3) { const out = []; for (let n = 1; n <= 10; n++) out.push('REGN:' + n + '+' + n, 'REGN:half' + 2 * n); return out; }
  return null;
}
F.BANKS_REGN = { gen, fits, facts, MAX, parseFact, norm, e3FromKey, SPEECH: PB_TPL, SETS: PB_SETS, clips: pbClips, CONTRAST_TAGS };
for (const s of Object.keys(GENS)) {
  const rungs = []; for (let i = 1; i <= MAX[s]; i++) rungs.push(i);
  const fn = (rung, sup, rng, o) => gen(s, rung, sup, rng, o);
  const opts = { rungs, fits: (rung, key) => fits(s, rung, key), facts: rung => facts(s, rung), owner: 'WP-B1' };
  if (F.BANKS && typeof F.BANKS.reg === 'function') F.BANKS.reg(s, fn, opts);
  else (F.REGQ = F.REGQ || []).push([s, fn, opts]);
}
})();
