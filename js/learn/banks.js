/* Feslottet – F.BANKS: item generators for the 6 base strands (DESIGN §9.2, §9.5; v4 DESIGN4 §4.1).  Owner: WP-B1 (v4).  Pure JS (no THREE/DOM) – runs in Node.

   F.BANKS.gen(strand, rung, sup, {kind, key, target, rng, conf, format, tag, need, avoid, sub}) -> Item fields
     strand  'T-NAVN'|'T-MENGDE'|'T-SKRIV'|'T-ORDEN'|'LES'|'SKRIV'   rung 1..max (see F.BANKS.MAX)   sup 0|1|2
     key     Leitner key 'T-NAVN:15' / 'LES:katt' – forces that target when it fits the rung
     conf    personal confusion matrix {'15>51':3} – biases ~40% of distractor slots toward her top confusions
     format  the format that will run it (lets the bank honour 'needs a 3D model' etc.)
     tag     contrast tag (kind 'contrast'): REVERSAL | DECADE | DOUBLE-CONS | SILENT | … → a contrast pair item
     need    SKRIV: a need tag ('varme', 'spise', … F.WORDS.TAGS) → several right answers (item.accept)
     avoid   keys seen recently (tries not to repeat them)       sub  force a sub-type (M10 'add'|'missing'|'change', L11 'yn'|'riddle'|'cmd', …)

   ITEM FIELDS (the contract for format authors):
     key, strand, rung, sup
     target   THE EXPECTED ANSWER (what F.Task's widgets compare with by default):
                numbers → a number (T-NAVN, T-MENGDE, T-ORDEN, T-SKRIV W2–W5) or a string (number word for N8/W6/W7, digit for W1)
                words   → the word (L1–L9, S2–S9, S11), the phrase for L10 ('rød ball'), 'ja'/'nei' for L11 yes/no,
                          the answer word for L11 riddle/cmd, ONE letter for S1 (first sound) and S10 (letter swap)
                ordering items (O7, O8 'order5') → an ascending/descending ARRAY: tap them in that order
     answer   === target (alias, explicit)
     word     word strands: === target (F.Task default for LES/SKRIV);  T-SKRIV W6/W7: the number word
     n        T-strands: the focal number 10–20 (the thing being learned; key = strand + ':' + n)
     text     what to SHOW for reading (note/sign/bottle label): the word, phrase, sentence, riddle or number word (N7)
     full     S1/S10: the whole word the letter belongs to (picture/model = full)
     say      what may be spoken as the prompt BEFORE the attempt: {kind:'num', n} | {kind:'word', w} | null (reading: never the target)
     choices  values to choose between (same type as target).  For LES the choices are castable words (each has a VOX model id === word);
              for L10 phrases see params.objs; for ordering items the numbers to tap
     distractors [{v, tag}] every wrong choice with its misconception tag
              numbers: REVERSAL DECADE OFF-BY-ONE COUNT-ONES DIGIT-ONLY (OTHER = a far, neutral distractor)
              words:   ORDER DOUBLE-CONS SILENT VOWEL CLUSTER-DROP FIRST-LETTER LENGTH (+ ADJ / NOUN for L10 phrases, OTHER)
              For keypad/tiles items the list holds the ANTICIPATED wrong answers (51 for 15, 'kat' for katt) – use them for tagging,
              and for F37 «Mias feil» (pick one as Mia's spelling).
     tiles    letters/digits to tap (shuffled; includes distractor tiles at s1) or null = full keyboard (params.keyboard)
     slots    number of answer slots (letters/digits)
     structure  true = show the ten-structure (ten-frame / rod + ones / number strip)
     accept   array of ALL acceptable answers (multi-answer needs: F33/F39) – default [target]
     params   per-rung details, always present:
       T-NAVN   {range:[lo,hi], strip, moving, timeLimit(ms), numWord(N7), show(N8: the numeral shown)}
       T-MENGDE {tens, ones, scatter, tapToTray, build, ghost, maxRods, pile, whole(M8), pay, meter, op/a/b(M10), noCounter}
       T-SKRIV  {given(W1: '1'), keypad, len, ghost, keyboard, contrastWith}
       T-ORDEN  {dir:'after'|'before'(O1/O2), seq(O3, null = gap), a, b, ask:'more'|'less'(O4–O6), order:'asc'|'desc'(O7/O8), type(O8)}
       LES      {lyd:'on'|'late'|'off' (lydering), type(L11: 'yn'|'riddle'|'cmd'), objs(L10/L11: [{model, opts, label}]), adj, noun, who, colour}
       SKRIV    {ghost, keyboard, noAudio(S11 picture), from/to/pos(S10), wrong(S11 fix), need = tag = needTag, kind, cat (S11 category, F33 needs)}
       aliases for FORMATS-W: LES L10 params.phrase ; SKRIV need/category params.tag + params.needTag + params.kind (need|category)
       every item: params.contrast = tag when kind === 'contrast' (play the targeted contrast animation before the prompt)
   Helpers: F.BANKS.MAX {strand: rungs}, F.BANKS.tagNum(t, v), F.BANKS.tagWord(t, v), F.BANKS.rev(n), F.BANKS.misspell(word) ->
            [{v, tag}], F.BANKS.fits(strand, rung, key), F.BANKS.numWord(n), F.BANKS.contrastTags(strand).

   v4 (DESIGN4 §4.1, WP-B1) ------------------------------------------------------------------------------------------------------
   • MAX: T-NAVN 12, T-MENGDE 15, T-SKRIV 9, T-ORDEN 14 (F.BANKS.OLD = the v1–v3 tops 9/10/7/8).  numWord(n) covers 0–100
     (tjueen, trettisju, nittien, hundre).  F.BANKS.family(n) = the contrast family of n (68 → 86 18 60 8 …), F.BANKS.fewest(kr).
   • Strands this file does not own (REGN, LIKHET, PROBLEM, MØNSTER, …) are forwarded to the registry (F.BANKS.regGen, ladders.js) –
     so F.BANKS.gen('REGN', 4, 1, {rng}) and F.dbg.forceTask(fmt, {strand:'REGN', rung:4}) work.  fits() forwards too.
   • Every item carries think + secret (C1 mask list) + twin; the v4 rungs also g (guess probability of the default presentation) +
     mode + gBy – the v1–v3 rungs leave g/mode to their formats (K.meta / RW.meta / kit) and the engine (spec g); secret (C1 mask
     list: heard T-NAVN/T-SKRIV numbers, SKRIV dictation words; the computed answer on v4 rungs; never a T-MENGDE/T-ORDEN stimulus),
     twin (format id | null), gBy {mode: g} (g per presentation – a format that shows the item another way sets item.g = item.gBy[mode]).
     A format that presents an item differently sets item.mode / item.g itself (e.g. F42 shows N10 on the 100-board → g 0.01).
   • New rungs (numbers are SHOWN on objects/labels – params.showNum / label / text; only N10/N11/W8 speak a number: say {kind:'num', n},
     n 0–100 → whole clips «Trykk på {n}!» / «Skriv {n}.»; O14 says {kind:'ord', k, from}).  Keypad items: params {keypad:true, slots:3, showLen:false} – never the length.
       N10  hear 20–50: target n; choices = n + contrast family/near (s0 3, s1 6, s2 8) for target formats (F01 lift, F03/F04 retrofits);
            params {range, board:[1,50] (s2 [1,100]), family:[…]}; mode 'scene', g = 1/k; twin F42 (tap 1 of 50/100 → set g 0.01)
       N11  hear 1–100 with the WHOLE contrast family present (s2: 68 → 86 18 60 8 …; 19 → 9 90 91; 70 → 7 17 71 77): as N10, k 3/5/8
       N12  read a number word → numeral: text = the word (show it; never speak it), target n; s0 chips (3), s1/s2 keypad (choices = the
            contrast family 5/6 for chip formats like F05 at s1); secret [n]
       M11  bundled sets: params {tens, ones, bundle {group, unit, model…}, surface ('egg'|'ved'|'krystall'|'kroner'|'kule'|'blomst' – the
            first four are F43's SURF ids), scatter (s2), groupsFirst}; keypad (s0 chips)
       M12  build n: params {build, tens, ones, bundle, surface ('krystall'|'kroner'|'ved' – Gold on 2 surfaces), ghost (s0), maxOnes (s2 19:
            9 tens + 19 ones lets her build 4 tiere 18 enere and must exchange), counter 'all'|'tens'|'none'}; mode 'build'
       M13  sub 'ones' (74 = 7 tiere og … enere → 4) | 'tens' (tiere i 80 → 8) | 'num' (3 tiere og 9 enere → 39) | 'numRev'
            (9 enere og 3 tiere → 39, s2); params.label = the text to SHOW; keypad (s0 chips)
       M14  sub 'compose' (4 tiere og 13 enere → 53) | 'split' (63 = 5 tiere og … enere → 13) | 'most' (s1/s2: order 3–4 groupings
            {id, tens, ones, value, label} from fewest to most – target = ids ascending, params.best = the «flest» id; mode 'order')
       M15  sub 'count' (params.coins [kr…] → keypad sum) | 'pay' (params {price, coinsAvail, fewest [kr…], fewestN, needFewest (s2)};
            mode 'build': any combination summing to price is right; at s2 only one with fewestN pieces)
       W8   dictation 21–100 on a 3-slot keypad: say {kind:'num', n}; params.ghost (s0 first digit), contrastWith (the reversal)
       W9   params.rep 'rods' | 'coins' | 'line' {from, to, tick, mid} | 'text' {label} → write the numeral (keypad)
       O9   sub 'place' (line 0–20, marks [0,20] (s0 [0,10,20]), tol 1 (s0 2), value; mode 'line', g = 2·tol/20) | 'arrow' (ticks, arrow →
            keypad) | 'nearest' (marks 0,5,…,20 as choices, value; g 1/5)
       O10  sub 'after' | 'before' (params {dir, shown = ref}; crossing tens 60 %) → keypad | 'between' (params {lo = a, hi = b, row}; choices = row,
            target = every number strictly between; mode 'subset')
       O11  sub 'board' (params {start, moves:[{dir:'down'|'up'|'right'|'left', k}], board [1,100]}: rows of ten 1–10, 11–20 …, «ned» = +10;
            mode 'scene', g 0.01 on the 100-board) | 'more' (params {base, delta, label '10 mer enn 90'} → keypad)
       O12  sub 'order' (4 numbers incl. a reversal pair: target sorted asc/desc, mode 'order' 1/24) | 'sign' (params.pairs [[a,b]…]: s0 one
            pair → chips '<','=','>'; s1/s2 3 pairs → target ['<','>','='], mode 'grid' 1/27) | 'range' (params {gt, lt, label}; choices =
            cards, target = the cards strictly between; mode 'subset')
       O13  0–100 line with the tens marked: sub 'place' (tol 3 (s0 5)) | 'mid' (params {a, b} → (a+b)/2, keypad) | 'arrow' ({from, tick})
       O14  queue of 5–10 animals (params.queue[0] = the FRONT): sub 'front'|'back' (k-th → tap the animal; target = model id; mode 'scene',
            g 1/L) | 'same' (odd queue: same place from both ends → keypad) | 'convert' (k-th from the front = ? from the back → keypad)
   • P0 fixes (hint_leaks): C5 counters (params.counter 'all'|'tens'|'none' by sup, noCounter at s2, noFinal; F11 clothFixed + peekOnes;
     F13 meter/structure only at s0, plaquesOnly in «add» at s2), C6 (o.said: lines/words just spoken or shown – and plain words in
     o.avoid – are never the LES/SKRIV target, even for a preferred key; LES targets never in the format's own prompt, keys included),
     v5 (WP-E2): #7 category items accept F.WORDS.accept(tag) (params.acceptAll); #14 riddle lures never fit the riddle (F.WORDS.semOk,
     params.also = other words that fit – formats keep them out of extra choices); #15 semRel also uses F.WORDS.semRel (umbrella
     words, near-synonyms, young-of pairs); #54 F29 rhymes by sound (F.WORDS.rhymes – the rule f_read.js uses); F28 phrases 5 / 6 at
     s1 / s2 (WP-R request).
     C7 (LES s1 rung ≥ 4: one distractor shares the first letter; F32 never offers the source word, 1/2/3 near-spelling distractors;
     F29 only the target rhymes + a look-alike (same final consonants, another vowel) at s1/s2), item 11 (contrast compare asks more
     OR less, params.contrastAfterError), item 16 (F17 ghost only while the word is new). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

// v4 (DESIGN4 §4.1): the T-strands get their Phase-1 extensions N10–N12, M11–M15, W8–W9, O9–O14 (OLD = the v1–v3 tops)
const MAX = { 'T-NAVN': 12, 'T-MENGDE': 15, 'T-SKRIV': 9, 'T-ORDEN': 14, LES: 11, SKRIV: 11 };
const OLD = { 'T-NAVN': 9, 'T-MENGDE': 10, 'T-SKRIV': 7, 'T-ORDEN': 8, LES: 11, SKRIV: 11 };
const VOWELS = 'aeiouyæøå';
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const W = () => F.WORDS || { list: [], get: () => null };
// in the page: prefer words whose VOX model exists right now (models are built in parallel); in Node every castable counts
const hasM = w => { const V = F.VOX; return !V || typeof V.has !== 'function' || V.has(w); };
// colour phrases need a model that really honours o.c (checked once per word in the page by building two variants)
const colCache = {};
function colourOk(w) {
  const V = F.VOX; if (!V || typeof V.make !== 'function') return true;
  if (colCache[w] != null) return colCache[w];
  let ok = false;
  try {
    if (V.has(w)) {
      const sig = g => { let h = 0; g.traverse(o => { if (o.isMesh) { const c = o.geometry && o.geometry.attributes && o.geometry.attributes.color;
        if (c) for (let i = 0; i < c.array.length; i += 37) h = (h * 31 + Math.round(c.array[i] * 255)) | 0;
        if (o.material && o.material.color) h = (h * 31 + o.material.color.getHex()) | 0; } }); return h; };
      ok = sig(V.make(w, { c: 'blue' })) !== sig(V.make(w, { c: 'red' }));
    }
  } catch (e) { ok = false; }
  return (colCache[w] = ok);
}
const withM = (arr, min, f) => { const y = arr.filter(x => hasM(f ? f(x) : x.w != null ? x.w : x)); return y.length >= (min || 1) ? y : arr; };
const NW = { 0: 'null', 1: 'en', 2: 'to', 3: 'tre', 4: 'fire', 5: 'fem', 6: 'seks', 7: 'sju', 8: 'åtte', 9: 'ni', 10: 'ti', 11: 'elleve', 12: 'tolv',
  13: 'tretten', 14: 'fjorten', 15: 'femten', 16: 'seksten', 17: 'sytten', 18: 'atten', 19: 'nitten', 20: 'tjue',
  30: 'tretti', 40: 'førti', 50: 'femti', 60: 'seksti', 70: 'sytti', 80: 'åtti', 90: 'nitti' };
const ONESW = ['', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni'];
// Norwegian number words 0–100 (school standard: sju, tjue; tens before ones: tjueen, trettisju, nittien)
const numWord = n => { n = +n; if (NW[n]) return NW[n]; if (n === 100) return 'hundre'; if (n > 20 && n < 100 && n % 1 === 0) return NW[n - n % 10] + ONESW[n % 10]; return null; };

/* ---------------------------------------------------------------- misconception tagging */
const rev = n => { n = +n; if (n < 10 || n > 99) return n; return (n % 10) * 10 + Math.floor(n / 10); };
function tagNum(t, v) {
  t = +t; v = +v; if (!isFinite(t) || !isFinite(v) || t === v) return null;
  const tt = Math.floor(t / 10), to = t % 10;
  if (t >= 10 && t < 100 && to !== 0 && v === rev(t)) return 'REVERSAL';
  if (t > 10 && t < 20 && v === to * 10) return 'DECADE';
  if (t >= 30 && to === 0 && v === 10 + tt) return 'DECADE';
  if (t > 10 && t < 20 && v === to) return 'DIGIT-ONLY';
  if (Math.abs(v - t) === 10) return 'COUNT-ONES';
  if (Math.abs(v - t) <= 2) return 'OFF-BY-ONE';
  return 'OTHER';
}
function silentPos(w) {
  const out = [];
  if (/^h[vj]/.test(w)) out.push(0);
  if (/^[gd]j/.test(w)) out.push(0);
  if (/[lnr]d$/.test(w) || /[aeiouyæøå]d$/.test(w) && w.length > 3) out.push(w.length - 1);
  if (/ig$/.test(w)) out.push(w.length - 1);
  if (/gl$/.test(w)) out.push(w.length - 2);
  return out;
}
const doublePos = w => { for (let i = 0; i < w.length - 1; i++) if (w[i] === w[i + 1] && !VOWELS.includes(w[i])) return i; return -1; };
function tagWord(t, v) {
  t = String(t || '').toLowerCase(); v = String(v || '').toLowerCase();
  if (!t || t === v) return null;
  if (t.includes(' ') || v.includes(' ')) {           // phrases «rød ball»
    const a = t.split(' '), b = v.split(' ');
    if (a[a.length - 1] === b[b.length - 1]) return 'ADJ';
    if (a[0] === b[0]) return 'NOUN';
    return 'OTHER';
  }
  if (v.length !== t.length) {
    const d = doublePos(t); if (d >= 0 && v === t.slice(0, d) + t.slice(d + 1)) return 'DOUBLE-CONS';
    const dv = doublePos(v); if (dv >= 0 && t === v.slice(0, dv) + v.slice(dv + 1)) return 'DOUBLE-CONS';
    for (const p of silentPos(t)) if (v === t.slice(0, p) + t.slice(p + 1)) return 'SILENT';
    if (v.length === t.length - 1) { for (let i = 0; i < t.length; i++) if (v === t.slice(0, i) + t.slice(i + 1) && !VOWELS.includes(t[i])) return 'CLUSTER-DROP'; }
    return 'LENGTH';
  }
  const diff = []; for (let i = 0; i < t.length; i++) if (t[i] !== v[i]) diff.push(i);
  if (diff.length === 1 && diff[0] === 0) return 'FIRST-LETTER';
  if (diff.every(i => VOWELS.includes(t[i]) && VOWELS.includes(v[i]))) return 'VOWEL';
  if ([...t].sort().join('') === [...v].sort().join('')) return 'ORDER';
  if (diff.length === 1) return VOWELS.includes(t[diff[0]]) ? 'VOWEL' : 'FIRST-LETTER';
  return 'OTHER';
}
// plausible misspellings of a word, each tagged (for keypad/tiles tagging and Mia's mistakes)
const CONFUSE = { b: 'd', d: 'b', p: 'b', m: 'n', n: 'm', o: 'ø', ø: 'o', e: 'æ', æ: 'e', u: 'o', y: 'i', i: 'y', å: 'o', g: 'k', k: 'g', f: 'v', v: 'f', t: 'd', l: 'r', r: 'l', s: 'f', a: 'e', h: 'f', j: 'g' };
const ONSETS = new Set('bl br dr fl fr gl gn gr hj hv kj kl kn kr kv pl pr sj sk skj skr sl sm sn sp spl spr st str sv tj tr tv dj gj'.split(' '));
function legalOnset(v) { const on = (String(v).match(/^[^aeiouyæøå]*/) || [''])[0]; return on.length <= 1 ? on !== v : ONSETS.has(on); }
function misspell(w) {
  const out = [], add = (v, tag) => { if (v && v !== w && v.length >= 2 && !out.some(x => x.v === v)) out.push({ v, tag }); };
  const d = doublePos(w); if (d >= 0) add(w.slice(0, d) + w.slice(d + 1), 'DOUBLE-CONS');
  for (const p of silentPos(w)) add(w.slice(0, p) + w.slice(p + 1), 'SILENT');
  for (let i = 0; i < w.length - 1; i++) if (!VOWELS.includes(w[i]) && !VOWELS.includes(w[i + 1]) && w[i] !== w[i + 1]) { add(w.slice(0, i + 1) + w.slice(i + 2), 'CLUSTER-DROP'); break; }
  if (CONFUSE[w[0]]) add(CONFUSE[w[0]] + w.slice(1), 'FIRST-LETTER');
  for (let i = 1; i < w.length; i++) if (VOWELS.includes(w[i]) && CONFUSE[w[i]]) { add(w.slice(0, i) + CONFUSE[w[i]] + w.slice(i + 1), 'VOWEL'); break; }
  for (let i = 1; i < w.length - 1; i++) if (w[i] !== w[i + 1]) { add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2), 'ORDER'); break; }
  if (d < 0 && w.length <= 5) { for (let i = w.length - 1; i > 0; i--) if (!VOWELS.includes(w[i]) && VOWELS.includes(w[i - 1])) { add(w.slice(0, i) + w[i] + w.slice(i), 'DOUBLE-CONS'); break; } }
  return out;
}
const lev = (a, b) => {
  const m = a.length, n = b.length, d = []; for (let i = 0; i <= m; i++) { d[i] = [i]; } for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
};

/* ---------------------------------------------------------------- number distractors */
// candidates for n, tagged, in rough order of misconception strength
function numCands(n) {
  const c = [], add = (v, tag) => { if (v !== n && v >= 0 && v <= 99 && !c.some(x => x.v === v)) c.push({ v, tag }); };
  const to = n % 10;
  if (n >= 10 && n < 20) {
    if (to >= 2) add(to * 10, 'DECADE');
    if (to !== 0 && to !== 1) add(rev(n), 'REVERSAL');
    else if (n === 10) add(1, 'REVERSAL');
    if (to) add(to, 'DIGIT-ONLY');
  } else if (n >= 30 && to === 0) add(10 + n / 10, 'DECADE');
  else if (n === 20) add(2, 'REVERSAL');
  add(n + 1, 'OFF-BY-ONE'); add(n - 1, 'OFF-BY-ONE');
  add(n + 10, 'COUNT-ONES'); if (n - 10 >= 0) add(n - 10, 'COUNT-ONES');
  return c;
}
// choose k-1 distractors: from `prefer` tags (in order), then confusion-biased, then far ones from [lo,hi]
function numChoices(r, n, k, o) {
  o = o || {};
  const lo = o.lo != null ? o.lo : 10, hi = o.hi != null ? o.hi : 20;
  const out = [], used = new Set([n]);
  const take = d => { if (d && !used.has(d.v) && out.length < k - 1) { used.add(d.v); out.push(d); } };
  const cands = numCands(n);
  // confusion bias: 40% per slot toward her top confusions for this target
  if (o.conf && !o.far) {
    const top = Object.keys(o.conf).filter(x => x.split('>')[0] === String(n)).sort((a, b) => o.conf[b] - o.conf[a]);
    for (const kk of top) { if (out.length >= k - 1) break; if (r() < 0.4) { const v = +kk.split('>')[1]; if (isFinite(v) && v >= 0 && v <= 99) take({ v, tag: tagNum(n, v) }); } }
  }
  for (const tag of (o.prefer || [])) take(cands.find(d => d.tag === tag && !used.has(d.v) && (o.inRange ? d.v >= lo && d.v <= hi : true)));
  // far neutral distractors (mutually ≥ 3 apart when o.far)
  let guard = 0;
  while (out.length < k - 1 && guard++ < 200) {
    const v = int(r, lo, hi);
    if (used.has(v)) continue;
    if (o.far && [...used].some(u => Math.abs(u - v) < 3) && guard < 150) continue;
    take({ v, tag: tagNum(n, v) || 'OTHER' });
  }
  return { choices: shuffle(r, [n].concat(out.map(d => d.v))), distractors: out };
}
const kFor = (base, sup, min) => Math.max(min || 2, sup === 0 ? base - 1 : base);
const COUNTER = ['all', 'tens', 'none'];   // C5: what a counting format may say aloud while she taps (s0 every count, s1 full tens, s2 nothing)

/* ---------------------------------------------------------------- key helpers */
const keyVal = key => key == null ? null : String(key).slice(String(key).indexOf(':') + 1);
function pickNum(r, lo, hi, o, extraOk) {
  const kv = keyVal(o.key);
  if (kv != null && kv !== '' && /^\d+$/.test(kv)) { const v = +kv; if ((v >= lo && v <= hi) || (extraOk && extraOk(v))) return v; }
  if (o.target != null && /^\d+$/.test(String(o.target))) { const v = +o.target; if ((v >= lo && v <= hi) || (extraOk && extraOk(v))) return v; }
  const avoid = new Set(o.avoid || []);
  for (let i = 0; i < 6; i++) { const v = int(r, lo, hi); if (!avoid.has(o.strand + ':' + v)) return v; }
  return int(r, lo, hi);
}
const NUMRANGE = {
  'T-NAVN': [[10, 12], [10, 15], [10, 20], [10, 20], [13, 19], [12, 19], [10, 20], [13, 19], [10, 20]],
  'T-MENGDE': [[10, 12], [10, 15], [10, 20], [10, 20], [10, 15], [10, 20], [10, 20], [11, 19], [10, 20], [11, 20]],
  'T-SKRIV': [[11, 19], [10, 20], [10, 15], [10, 20], [13, 19], [10, 20], [10, 20]],
  'T-ORDEN': [[11, 15], [11, 19], [10, 20], [10, 20], [10, 20], [12, 19], [10, 20], [10, 20]],
};

/* ---------------------------------------------------------------- strand generators */
const GEN = {};

GEN['T-NAVN'] = function (rung, sup, o, r) {
  if (rung > OLD['T-NAVN']) return NEWT['T-NAVN'](rung, sup, o, r);
  const [lo, hi] = NUMRANGE['T-NAVN'][rung - 1];
  const p = { range: [lo, hi], strip: sup === 0 };
  let n, k, pref, far = false, inRange = false;
  if (rung === 5 || rung === 8) {
    // teen vs -ty: target a teen (70%) or its decade (30%)
    const kv = keyVal(o.key); const forced = kv && /^\d+$/.test(kv) ? +kv : (o.target != null ? +o.target : null);
    if (forced != null && ((forced >= 13 && forced <= 19) || (forced >= 30 && forced <= 90 && forced % 10 === 0))) n = forced;
    else { const t = pickNum(r, 13, 19, o); n = r() < 0.3 ? (t % 10) * 10 : t; }
  } else n = pickNum(r, lo, hi, o);
  const base = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 3, 6: 4, 7: 4, 8: 3, 9: 5 }[rung];
  k = kFor(base, sup);
  if (rung <= 3) { far = sup < 2; pref = sup === 2 ? ['REVERSAL', 'OFF-BY-ONE'] : []; inRange = true; }
  else if (rung === 4) pref = sup === 2 ? ['OFF-BY-ONE', 'OFF-BY-ONE', 'REVERSAL'] : ['OFF-BY-ONE', 'OFF-BY-ONE'];
  else if (rung === 5) pref = sup === 2 ? ['DECADE', 'REVERSAL'] : ['DECADE', 'OFF-BY-ONE'];
  else if (rung === 6) pref = ['DECADE', 'REVERSAL', 'DIGIT-ONLY'];
  else if (rung === 7) pref = ['DECADE', 'REVERSAL', 'OFF-BY-ONE'];
  else if (rung === 9) pref = ['OFF-BY-ONE', 'REVERSAL', 'DECADE', 'OFF-BY-ONE'];
  if (rung === 8) {
    // see/hear the numeral → choose the number WORD (tretten / tretti)
    const pairOf = n >= 30 ? 10 + n / 10 : (n % 10) * 10;
    const cands = [{ v: numWord(pairOf), tag: 'DECADE' }];
    const nb = n >= 30 ? [n + 10, n - 10].filter(x => x >= 30 && x <= 90) : [n + 1, n - 1].filter(x => x >= 11 && x <= 19);
    nb.forEach(x => cands.push({ v: numWord(x), tag: 'OFF-BY-ONE' }));
    const ds = cands.slice(0, k - 1);
    return { n, target: numWord(n), word: numWord(n), choices: shuffle(r, [numWord(n)].concat(ds.map(d => d.v))), distractors: ds,
      structure: sup === 0, say: null, params: Object.assign(p, { show: n, choiceKind: 'numword' }) };   // the words are reading targets: show the numeral, do not say it
  }
  const c = numChoices(r, n, k, { prefer: pref, far, conf: o.conf, lo: 10, hi: 20, inRange });
  const it = { n, target: n, choices: c.choices, distractors: c.distractors, structure: sup === 0, say: { kind: 'num', n }, params: p };
  if (rung === 7) { it.text = numWord(n); it.say = null; p.numWord = numWord(n); }
  if (rung === 9) { p.moving = true; p.timeLimit = [20000, 15000, 11000][sup]; }
  return it;
};

GEN['T-MENGDE'] = function (rung, sup, o, r) {
  if (rung > OLD['T-MENGDE']) return NEWT['T-MENGDE'](rung, sup, o, r);
  const [lo, hi] = NUMRANGE['T-MENGDE'][rung - 1];
  const p = {};
  if (rung <= 3 || rung === 5 || rung === 6) {
    const n = pickNum(r, lo, hi, o);
    const structured = rung <= 3;
    Object.assign(p, { tens: Math.floor(n / 10), ones: n % 10, scatter: !structured, tapToTray: !structured });
    // C5 (hint_leaks 4): F08 counts aloud only at s0; s1 = full tens at most; s2 = silent taps; never the final number before the question
    Object.assign(p, { noCounter: sup === 2, counter: COUNTER[sup], noFinal: true, stripOff: true });
    const k = kFor(3, sup);
    const pref = sup === 2 ? ['COUNT-ONES', 'OFF-BY-ONE', 'OFF-BY-ONE'] : ['OFF-BY-ONE', 'OFF-BY-ONE'];
    const c = numChoices(r, n, k, { prefer: pref, conf: o.conf, lo: 0, hi: 20 });
    return { n, target: n, choices: c.choices, distractors: c.distractors, structure: structured || sup === 0, params: p };
  }
  if (rung === 4 || rung === 7) {
    const n = pickNum(r, lo, hi, o);
    if (rung === 4) Object.assign(p, { build: true, rod: 10, unit: 1, ghost: sup === 0, maxRods: sup === 2 ? 3 : 2, noCounter: sup === 2, counter: COUNTER[sup], noFinal: sup > 0 });
    else Object.assign(p, { pile: n + (sup === 0 ? 2 : sup === 1 ? int(r, 3, 6) : int(r, 7, 10)), tapToTray: true, noCounter: sup === 2, counter: COUNTER[sup], noFinal: sup > 0 });
    const ds = numCands(n).filter(d => ['OFF-BY-ONE', 'COUNT-ONES'].includes(d.tag)).slice(0, 3);
    return { n, target: n, choices: null, distractors: ds, structure: true, params: p };
  }
  if (rung === 8) {
    const n = pickNum(r, 11, 19, o);
    const e = n - 10, k = kFor(3, sup) + (sup === 2 ? 1 : 0);
    const cands = [{ v: e + 1, tag: 'OFF-BY-ONE' }, { v: e - 1, tag: 'OFF-BY-ONE' }, { v: n, tag: 'COUNT-ONES' }, { v: 1, tag: 'DIGIT-ONLY' }].filter(d => d.v !== e && d.v >= 0);
    const ds = (sup === 2 ? [cands[2], cands[0], cands[1], cands[3]] : cands).filter(Boolean).slice(0, k - 1);
    // C5 (hint_leaks 7): F11's cloth over the hidden ones has a FIXED width (the whole ones row) at every level; its s0 scaffold is a
    // short peek (peekOnes). showOnes stays the F10 s0 ghost (intended, hint_leaks §4)
    Object.assign(p, { whole: n, tens: 1, showOnes: sup === 0, peekOnes: sup === 0, clothFixed: true });
    return { n, target: e, choices: shuffle(r, [e].concat(ds.map(d => d.v))), distractors: ds, structure: true, say: { kind: 'num', n }, params: p };
  }
  if (rung === 9) {
    const n = pickNum(r, lo, hi, o);
    Object.assign(p, { pay: true, meter: sup === 0, noCounter: sup === 2, counter: COUNTER[sup], noFinal: sup > 0, purse: { tens: 2, ones: sup === 2 ? 10 : 9 } });
    const ds = numCands(n).filter(d => ['OFF-BY-ONE', 'COUNT-ONES', 'REVERSAL'].includes(d.tag)).slice(0, 3);
    return { n, target: n, choices: null, distractors: ds, structure: sup < 2, say: { kind: 'num', n }, params: p };
  }
  // M10 – top: crossing ten, missing addend (piggy), change from 20
  const sub = o.sub || pick(r, ['add', 'missing', 'change']);
  let a, b, ans, n;
  if (sub === 'add') { a = int(r, 6, 9); b = int(r, 11 - a, 9); ans = a + b; n = ans; }
  else if (sub === 'missing') { a = int(r, 10, 16); n = int(r, a + 2, Math.min(20, a + 8)); ans = n - a; b = n; }
  else { b = 20; a = int(r, 11, 19); ans = 20 - a; n = a; }
  const kv = keyVal(o.key); if (kv && /^\d+$/.test(kv) && sub === 'add' && +kv >= 11 && +kv <= 18) { n = +kv; a = Math.min(9, n - 2); b = n - a; ans = n; }
  const k = kFor(3, sup) + (sup === 2 ? 1 : 0);
  const cands = [{ v: ans + 1, tag: 'OFF-BY-ONE' }, { v: ans - 1, tag: 'OFF-BY-ONE' }, { v: sub === 'add' ? ans - 10 : ans + 10, tag: 'COUNT-ONES' }, { v: ans + 2, tag: 'OFF-BY-ONE' }]
    .filter(d => d.v !== ans && d.v >= 0);
  const ds = cands.slice(0, k - 1);
  // C5 (hint_leaks 13): the F13 gap meter only at s0; «add» at s2 shows the plaques only (the countable pieces stay for the hint)
  Object.assign(p, { op: sub, a, b, structure: sup === 0, meter: sup === 0, plaquesOnly: sup === 2 && sub === 'add', noCounter: sup === 2, counter: COUNTER[sup] });
  return { n, target: ans, choices: shuffle(r, [ans].concat(ds.map(d => d.v))), distractors: ds, structure: sup === 0, params: p };
};

GEN['T-SKRIV'] = function (rung, sup, o, r) {
  if (rung > OLD['T-SKRIV']) return NEWT['T-SKRIV'](rung, sup, o, r);
  const [lo, hi] = NUMRANGE['T-SKRIV'][rung - 1];
  const p = {};
  if (rung === 1) {
    const n = pickNum(r, 11, 19, o), e = n % 10;
    const cands = [{ v: e + 1, tag: 'OFF-BY-ONE' }, { v: e - 1, tag: 'OFF-BY-ONE' }, { v: 0, tag: 'DECADE' }].filter(d => d.v !== e && d.v >= 0 && d.v <= 9);
    const ds = (sup === 2 ? [cands[2], cands[0], cands[1]] : cands).filter(Boolean).slice(0, kFor(3, sup) - 1);
    Object.assign(p, { given: '1', digitChips: true });
    return { n, target: e, choices: shuffle(r, [e].concat(ds.map(d => d.v))), distractors: ds, structure: sup === 0, say: { kind: 'num', n }, params: p };
  }
  if (rung === 2) {
    let n = pickNum(r, 10, 20, Object.assign({}, o, { avoid: (o.avoid || []).concat(['T-SKRIV:11']) })); if (n === 11) n = r() < 0.5 ? 12 : 14;   // 11 = [1][1]: no order to find
    const s = String(n), tiles = s.split('');
    if (sup === 2) tiles.push(String(pick(r, [0, 5, 2, 3].filter(d => !s.includes(String(d))))));
    const ds = [{ v: +(s[1] + s[0]), tag: 'REVERSAL' }];
    Object.assign(p, { ghost: sup === 0 ? s[0] : null });
    return { n, target: n, tiles: shuffle(r, tiles), slots: 2, choices: null, distractors: ds, structure: sup === 0, say: { kind: 'num', n }, params: p };
  }
  if (rung <= 5) {
    let n;
    if (rung === 5) { const kv = keyVal(o.key); const f = kv && /^\d+$/.test(kv) ? +kv : null;
      n = f != null && (f >= 13 && f <= 19 || f >= 30 && f <= 90 && f % 10 === 0) ? f : (() => { const t = pickNum(r, 13, 19, o); return r() < 0.4 ? (t % 10) * 10 : t; })(); }
    else n = pickNum(r, lo, hi, o);
    const ds = numCands(n).filter(d => ['REVERSAL', 'DIGIT-ONLY', 'DECADE', 'OFF-BY-ONE'].includes(d.tag)).slice(0, 4);
    Object.assign(p, { keypad: true, len: 2, ghost: sup === 0 ? String(n)[0] : null, showLen: sup < 2 });
    if (rung === 5) p.contrastWith = n >= 30 ? 10 + n / 10 : (n % 10) * 10;
    return { n, target: n, slots: 2, choices: null, distractors: ds, structure: sup === 0, say: { kind: 'num', n }, params: p };
  }
  // W6/W7 number words
  const pool6 = [10, 12, 20, 11, 18, 15, 17, 19, 13, 14, 16];
  let n = pickNum(r, 10, 20, o); if (rung === 6 && sup === 0 && !o.key) n = pick(r, pool6.slice(0, 6));
  const w = numWord(n);
  const ds = [];
  if (n > 12 && n < 20) ds.push({ v: numWord((n % 10) * 10), tag: 'DECADE' });
  misspell(w).slice(0, 3).forEach(d => ds.push(d));
  let tiles = null;
  const keyboard = rung === 7 ? sup === 2 : sup === 2;
  if (!keyboard) tiles = shuffle(r, w.split('').concat(sup >= 1 ? distractorLetters(r, w, rung === 7 ? 3 : 2) : []));
  Object.assign(p, { keyboard, ghost: sup === 0 && !!o.isNew });   // hint_leaks 16: the whole-word ghost only while the word is new
  return { n, target: w, word: w, tiles, slots: w.length, choices: null, distractors: ds, structure: false, say: { kind: 'num', n }, params: p };
};

GEN['T-ORDEN'] = function (rung, sup, o, r) {
  if (rung > OLD['T-ORDEN']) return NEWT['T-ORDEN'](rung, sup, o, r);
  const p = {};
  if (rung <= 2) {
    const dir = rung === 1 ? 'after' : (sup === 0 ? 'after' : pick(r, ['after', 'before']));
    const n = rung === 1 ? pickNum(r, 11, 15, o) : pickNum(r, 11, 19, o);       // n = the answer
    const shown = dir === 'after' ? n - 1 : n + 1;
    const cands = [{ v: dir === 'after' ? n - 2 : n + 2, tag: 'OFF-BY-ONE' }, { v: shown, tag: 'OFF-BY-ONE' }, { v: dir === 'after' ? n + 1 : n - 1, tag: 'OFF-BY-ONE' }];
    if (rev(n) !== n && n !== 10 && n !== 20) cands.push({ v: rev(n), tag: 'REVERSAL' });
    const k = kFor(3, sup) + (sup === 2 ? 1 : 0);
    const ds = (sup === 2 ? [cands[2], cands[3] || cands[0], cands[0]] : [cands[2], cands[0]]).filter((d, i, a) => d && a.findIndex(x => x.v === d.v) === i && d.v !== n).slice(0, k - 1);
    Object.assign(p, { dir, shown, strip: sup === 0 });
    return { n, target: n, choices: shuffle(r, [n].concat(ds.map(d => d.v))), distractors: ds, structure: sup === 0, say: { kind: 'num', n: shown }, params: p };
  }
  if (rung === 3) {
    const n = pickNum(r, 11, 19, o);
    const pos = sup === 0 ? int(r, 1, 2) : int(r, 0, 3);
    const start = Math.max(10, Math.min(17, n - pos));
    const seq = range(start, start + 3); const gap = seq.indexOf(n);
    const sseq = seq.map((v, i) => i === gap ? null : v);
    const cands = [{ v: n + 1 === seq[gap + 1] ? n + 2 : n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1 === seq[gap - 1] ? n - 2 : n - 1, tag: 'OFF-BY-ONE' }];
    if (rev(n) !== n) cands.unshift({ v: rev(n), tag: 'REVERSAL' });
    const ds = (sup === 2 ? cands : cands.slice(1)).filter((d, i, a) => d.v >= 0 && d.v !== n && a.findIndex(x => x.v === d.v) === i).slice(0, kFor(3, sup) - 1);
    Object.assign(p, { seq: sseq });
    return { n, target: n, choices: shuffle(r, [n].concat(ds.map(d => d.v))), distractors: ds, structure: sup === 0, params: p };
  }
  if (rung <= 6) {
    let a, b;
    if (rung === 4) { a = pickNum(r, 10, 20, o); b = pick(r, range(10, 20).filter(x => Math.abs(x - a) >= 4)); }
    else if (rung === 5) { a = pickNum(r, 10, 19, o); b = a + (r() < 0.5 ? 1 : 2) * (a >= 19 ? -1 : 1); if (b > 20) b = a - 1; }
    else { a = pickNum(r, 12, 19, o); b = rev(a); if (a === b) { a = 13; b = 31; } }
    const ask = sup === 0 ? 'more' : pick(r, ['more', 'less']);
    const ans = ask === 'more' ? Math.max(a, b) : Math.min(a, b), other = ans === a ? b : a;
    const n = a;
    const ds = [{ v: other, tag: rung === 6 ? 'REVERSAL' : tagNum(ans, other) || 'OFF-BY-ONE' }];
    Object.assign(p, { a, b, ask, structure: rung === 4 || sup === 0 });
    return { n, target: ans, choices: r() < 0.5 ? [a, b] : [b, a], distractors: ds, structure: rung === 4 || sup === 0, params: p };
  }
  if (rung === 7) {
    const n = pickNum(r, 10, 20, o);
    const set = new Set([n]); let g = 0;
    const gap = sup === 0 ? 3 : sup === 1 ? 2 : 1;
    while (set.size < 3 && g++ < 100) { const v = int(r, 10, 20); if ([...set].every(x => Math.abs(x - v) >= gap)) set.add(v); }
    while (set.size < 3) set.add(int(r, 10, 20));
    const order = sup === 2 && r() < 0.35 ? 'desc' : 'asc';
    const sorted = [...set].sort((x, y) => order === 'asc' ? x - y : y - x);
    Object.assign(p, { order, count: 3 });
    return { n, target: sorted, choices: shuffle(r, sorted), distractors: [], structure: sup === 0, params: p };
  }
  // O8 order 5 / count backwards 20→10.  Per format: F18 stones = the backwards run with a gap; F20 parade = order 5 (or all 11
  // backwards); F21 xylophone = play all bars 20→10 – so no format has to turn the item into another type (and another key)
  const O8 = { F18: 'back', F20: sup === 2 && r() < 0.3 ? 'backAll' : 'order5', F21: 'backAll' };
  const type = o.sub || O8[o.format] || (sup === 0 ? 'back' : pick(r, ['order5', 'back', 'backAll']));
  if (type === 'order5') {
    const set = new Set(); const gap = sup === 2 ? 1 : 2; let g = 0;
    while (set.size < 5 && g++ < 200) { const v = int(r, 10, 20); if ([...set].every(x => Math.abs(x - v) >= gap)) set.add(v); }
    while (set.size < 5) set.add(int(r, 10, 20));
    const order = sup === 2 && r() < 0.4 ? 'desc' : 'asc';
    const sorted = [...set].sort((x, y) => order === 'asc' ? x - y : y - x);
    Object.assign(p, { type, order, count: 5 });
    return { n: sorted[2], target: sorted, choices: shuffle(r, sorted), distractors: [], structure: false, params: p };
  }
  if (type === 'backAll') {
    const seq = range(10, 20).reverse();
    Object.assign(p, { type, order: 'desc', count: 11 });
    return { n: 15, target: seq, choices: shuffle(r, seq), distractors: [], structure: false, params: p };
  }
  // 'back': a descending run with one gap → which is missing?
  const n = pickNum(r, 11, 19, o);
  const start = Math.min(20, n + int(r, 1, 2)); const seq = range(start - 4, start).reverse();
  const sseq = seq.map(v => v === n ? null : v);
  const ds = [{ v: n + 1 <= 20 && !seq.includes(n + 1) ? n + 1 : n - 2, tag: 'OFF-BY-ONE' }, { v: rev(n), tag: 'REVERSAL' }].filter((d, i, a) => d.v !== n && a.findIndex(x => x.v === d.v) === i && !sseq.includes(d.v));
  while (ds.length < 2) { const v = int(r, 10, 20); if (v !== n && !ds.some(d => d.v === v) && !sseq.includes(v)) ds.push({ v, tag: tagNum(n, v) || 'OTHER' }); }
  Object.assign(p, { type, order: 'desc', seq: sseq });
  return { n, target: n, choices: shuffle(r, [n].concat(ds.slice(0, kFor(3, sup) - 1).map(d => d.v))), distractors: ds.slice(0, kFor(3, sup) - 1), structure: false, params: p };
};

/* ---------------------------------------------------------------- v4 Phase-1 rungs: N10–N12, M11–M15, W8–W9, O9–O14 (DESIGN4 §4.1)
   Every item also carries the DESIGN4 §2.9 fields: g (guess probability of the default presentation), mode, think, secret, twin.
   Numbers stay on objects; only T-NAVN N10/N11 and T-SKRIV W8 speak the number (say {kind:'num', n}, 0–100 → whole clips). */
const wpick = (r, pairs) => { let s = 0; for (const p of pairs) s += p[1]; let x = r() * s; for (const p of pairs) { if ((x -= p[1]) < 0) return p[0]; } return pairs[pairs.length - 1][0]; };
const NUMRANGE2 = {
  'T-NAVN': { 10: [20, 50], 11: [1, 100], 12: [20, 100] },    // N11 1–100: the hundred board has no 0
  'T-MENGDE': { 11: [20, 99], 12: [10, 99], 13: [10, 99], 14: [20, 99], 15: [1, 100] },
  'T-SKRIV': { 8: [21, 100], 9: [20, 99] },
  'T-ORDEN': { 9: [0, 20], 10: [1, 100], 11: [1, 100], 12: [1, 99], 13: [0, 100], 14: [1, 10] },
};
// the whole contrast family of n (SYNTHESIS N11: 68 → 86, 18, 60, 8 …; 19 → 9, 90, 91; 70 → 7, 17, 71, 77), strongest first
function family(n) {
  const c = [], add = (v, tag) => { if (v !== n && v >= 0 && v <= 100 && !c.some(x => x.v === v)) c.push({ v, tag }); };
  const t = Math.floor(n / 10), o = n % 10;
  if (n === 100) { add(10, 'PV-ZERO'); add(90, 'COUNT-ONES'); add(99, 'OFF-BY-ONE'); add(1, 'PV-ZERO'); }
  else if (n < 10) { add(10 + n, 'DECADE'); if (n >= 2) add(n * 10, 'DECADE'); add(n + 1, 'OFF-BY-ONE'); if (n) add(n - 1, 'OFF-BY-ONE'); add(n * 11, 'OTHER'); }
  else if (n < 20) {                               // teens: nitten → 9, 90, 91
    if (o >= 2) { add(o * 10, 'DECADE'); add(o * 10 + 1, 'REVERSAL'); } else add(o === 0 ? 1 : 21, 'REVERSAL');
    add(o, 'DIGIT-ONLY'); add(n + 1, 'OFF-BY-ONE'); add(n - 1, 'OFF-BY-ONE'); add(n + 10, 'COUNT-ONES');
  } else if (o === 0) {                             // decades: sytti → 7, 17, 71, 77
    add(10 + t, 'DECADE'); add(t, 'DIGIT-ONLY'); add(n + 1, 'OFF-BY-ONE'); add(t * 11, 'OTHER'); add(n + 10, 'COUNT-ONES'); add(n - 10, 'COUNT-ONES'); add(n - 1, 'OFF-BY-ONE');
  } else {                                          // two digits: sekstiåtte → 86, 18, 60, 8
    if (o !== t) add(o * 10 + t, 'REVERSAL');
    if (o >= 3) add(10 + o, 'DECADE');
    add(t * 10, 'DIGIT-ONLY'); add(o, 'DIGIT-ONLY');
    add(n + 1, 'OFF-BY-ONE'); add(n - 1, 'OFF-BY-ONE'); add(n + 10, 'COUNT-ONES'); add(n - 10, 'COUNT-ONES');
    add(o * 10 + t + 1, 'OTHER');
  }
  return c;
}
// a target for 20–100 rungs, weighted toward contrast-prone numbers (distinct non-zero digits, decades, teens) or forced by key/target
function pickN(r, lo, hi, o, w) {
  const kv = keyVal(o.key);
  if (kv != null && /^\d+$/.test(kv) && +kv >= lo && +kv <= hi) return +kv;
  if (o.target != null && /^\d+$/.test(String(o.target)) && +o.target >= lo && +o.target <= hi) return +o.target;
  const avoid = new Set(o.avoid || []);
  const tag = o.kind === 'contrast' ? o.tag : null;
  for (let i = 0; i < 40; i++) {
    let v;
    const kind = tag === 'REVERSAL' ? 'rev' : tag === 'DECADE' ? 'dec' : tag === 'OFF-BY-ONE' ? 'cross' : wpick(r, w || [['rev', 5], ['dec', 2], ['teen', 1], ['any', 2]]);
    if (kind === 'rev') { const a = int(r, 1, 9), b = int(r, 1, 9); v = a * 10 + b; if (a === b) continue; }
    else if (kind === 'dec') v = 10 * int(r, 2, 10);              // 20 … 100 (ti is a 10–20 number)
    else if (kind === 'teen') v = int(r, 13, 19);
    else if (kind === 'cross') v = 10 * int(r, 2, 9) + (r() < 0.5 ? 9 : 0);
    else v = int(r, lo, hi);
    if (v < lo || v > hi) continue;
    if (avoid.has(o.strand + ':' + v) && i < 30) continue;
    return v;
  }
  return int(r, lo, hi);
}
const uniq = ds => ds.filter((d, i, a) => d && a.findIndex(x => String(x.v) === String(d.v)) === i);
// choices = target + k−1 distractors (strongest first), then near numbers in [lo, hi]
function famChoices(r, n, k, ds, lo, hi) {
  const out = uniq(ds).filter(d => d.v !== n && d.v >= lo && d.v <= hi).slice(0, k - 1);
  let g = 0; while (out.length < k - 1 && g++ < 300) { const v = int(r, lo, hi); if (v !== n && !out.some(d => d.v === v)) out.push({ v, tag: tagNum(n, v) || 'OTHER' }); }
  return { choices: shuffle(r, [n].concat(out.map(d => d.v))), distractors: out };
}
const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const tiere = t => t === 1 ? 'tier' : 'tiere', enere = e => e === 1 ? 'ener' : 'enere';
const COIN = [100, 50, 20, 10, 5, 1];
function fewest(n) { const out = []; for (const c of COIN) while (n >= c) { out.push(c); n -= c; } return out; }
// surfaces for bundles of ten (M11/M12/W9): group = what holds ten, unit = one thing
const BUNDLES = [
  { id: 'egg', group: 'eggekartong', groupPl: 'eggekartonger', unit: 'egg', unitPl: 'egg', model: 'egg' },
  { id: 'ved', group: 'vedbunt', groupPl: 'vedbunter', unit: 'pinne', unitPl: 'pinner', model: 'pinne' },
  { id: 'krystall', group: 'stav', groupPl: 'staver', unit: 'krystall', unitPl: 'krystaller', model: null },     // ids = F43's surfaces (f_num2.js)
  { id: 'kroner', group: 'tikrone', groupPl: 'tikroner', unit: 'krone', unitPl: 'kroner', model: 'krone' },
  { id: 'kule', group: 'pose', groupPl: 'poser', unit: 'kule', unitPl: 'kuler', model: 'kule' },
  { id: 'blomst', group: 'bukett', groupPl: 'buketter', unit: 'blomst', unitPl: 'blomster', model: 'blomst' },
];
const BUILD_SURF = ['krystall', 'kroner', 'ved'];    // M12 build surfaces (Gold on 2 surfaces)
const ANIMALS_Q = ['katt', 'hund', 'gris', 'hest', 'kanin', 'mus', 'høne', 'frosk', 'and', 'sau', 'rev', 'ekorn', 'elg', 'ugle'];
// item.think from the ladder (WP-E) – fallback = the SYNTHESIS row
const THINK_T = { 'T-NAVN': { 12: 'AVKODE' }, 'T-MENGDE': { 15: 'MÅLE' }, 'T-ORDEN': { 9: 'ROM', 11: 'ROM', 13: 'ROM', 14: 'ROM' } };
const THINK_S = { 'T-NAVN': 'HUSKE', 'T-MENGDE': 'REGNE', 'T-SKRIV': 'STAVE', 'T-ORDEN': 'REGNE', LES: 'AVKODE', SKRIV: 'STAVE' };
function thinkOf(strand, rung) {
  const L = F.LADDERS; const x = L && typeof L.rung === 'function' ? L.rung(strand, rung) : null;
  if (x && x.think) return x.think;
  return (THINK_T[strand] && THINK_T[strand][rung]) || THINK_S[strand] || 'REGNE';
}
// s0 chips (k = 3) for a production rung: target + the two strongest anticipated errors
function s0chips(r, it, k) {
  const ds = uniq(it.distractors).filter(d => typeof d.v === 'number' && d.v >= 0 && d.v <= 100 && d.v !== it.target);
  if (ds.length < (k || 3) - 1) return it;
  const use = ds.slice(0, (k || 3) - 1);
  it.choices = shuffle(r, [it.target].concat(use.map(d => d.v))); it.distractors = use; it.mode = 'chips'; it.g = 1 / (k || 3);
  return it;
}
const NEWT = {};

NEWT['T-NAVN'] = function (rung, sup, o, r) {
  if (rung === 12) {
    // read a number word (label) → the numeral; keypad at s1/s2 (3 slots, no length cue), chips at s0
    const n = pickN(r, 20, 100, o, [['rev', 5], ['dec', 2], ['any', 3]]);
    const w = numWord(n), t = Math.floor(n / 10), on = n % 10;
    const ds = [];
    if (on === 1 && t >= 2 && t <= 9) ds.push({ v: 10 + t, tag: 'DECADE' });   // nittien → 19 (nitten)
    if (on && t !== on) ds.push({ v: on * 10 + t, tag: 'REVERSAL' });
    if (on) ds.push({ v: t * 10, tag: 'DIGIT-ONLY' });
    if (on) ds.push({ v: t * 100 + on, tag: 'PV-CONCAT' });                     // femtini → 509
    if (!on && n < 100) ds.push({ v: 10 + t, tag: 'DECADE' });
    if (n === 100) ds.push({ v: 10, tag: 'PV-ZERO' }, { v: 1000, tag: 'PV-ZERO' });
    ds.push({ v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' });
    const it = { n, target: n, text: w, choices: null, distractors: uniq(ds), structure: sup === 0, say: null, slots: 3,
      params: { range: [20, 100], numWord: w, keypad: true, slots: 3, showLen: false, label: true, noWiden: true },
      mode: 'keypad', g: 0.01, twin: null, secret: [String(n)] };
    if (sup === 0) return s0chips(r, it);
    // s1/s2: production by default (keypad); a chip format (F05 at s1) gets the contrast family as choices (5 / 6) – the anticipated
    // keypad errors beyond the choices (509, 1000 …) stay in distractors for tagging
    const c = famChoices(r, n, sup === 1 ? 5 : 6, uniq(ds.filter(d => d.v <= 100).concat(family(n))), 10, 100);
    it.choices = c.choices; it.distractors = uniq(c.distractors.concat(it.distractors));
    return it;
  }
  // N10 hear 20–50 (board 1 of 50 / lift / 6–8 targets) · N11 hear 0–100, the whole contrast family present
  const [lo, hi] = NUMRANGE2['T-NAVN'][rung];
  const n = rung === 10 ? pickN(r, 20, 50, o, [['rev', 4], ['dec', 2], ['any', 4]]) : pickN(r, 1, 100, o, [['rev', 5], ['dec', 2], ['teen', 2], ['any', 1]]);
  const k = rung === 10 ? [3, 6, 8][sup] : [3, 5, 8][sup];
  let fam = family(n);
  if (sup === 0) { const strong = fam.slice(0, 1); fam = strong.concat([]); }       // s0: one contrast + far ones
  const bLo = 1, bHi = rung === 10 ? (sup === 2 ? 99 : 50) : 100;
  const c = sup === 0 ? (() => { const out = fam.filter(d => d.v >= bLo && d.v <= bHi).slice(0, 1); let g = 0;
      while (out.length < k - 1 && g++ < 300) { const v = int(r, Math.max(bLo, lo), hi); if (v !== n && Math.abs(v - n) >= 5 && !out.some(d => d.v === v)) out.push({ v, tag: tagNum(n, v) || 'OTHER' }); }
      return { choices: shuffle(r, [n].concat(out.map(d => d.v))), distractors: out }; })()
    : famChoices(r, n, k, fam, bLo, bHi);
  return { n, target: n, choices: c.choices, distractors: c.distractors, structure: sup === 0, say: { kind: 'num', n },
    params: { range: [lo, hi], board: rung === 10 ? (sup === 2 ? [1, 100] : [1, 50]) : [1, 100], strip: sup === 0, family: family(n).map(d => d.v), noWiden: true },
    mode: 'scene', g: 1 / c.choices.length, twin: 'F42', secret: [String(n), numWord(n)].filter(Boolean) };
};

NEWT['T-MENGDE'] = function (rung, sup, o, r) {
  const P = { noWiden: true };
  if (rung === 11) {
    // bundled sets: 6 egg cartons + 3 eggs → 63 (count the tens as tens)
    const n = pickN(r, sup === 0 ? 20 : 21, sup === 0 ? 59 : 99, o, [['any', 6], ['dec', 1], ['rev', 3]]);
    const tens = Math.floor(n / 10), ones = n % 10, b = pick(r, BUNDLES);
    const ds = [{ v: tens + ones, tag: 'PV-FACE' }, { v: ones * 10 + tens, tag: 'REVERSAL' }, { v: n + 10, tag: 'COUNT-ONES' }, { v: n - 10, tag: 'COUNT-ONES' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: tens * 100 + ones, tag: 'PV-CONCAT' }]
      .filter(d => d.v !== n && d.v >= 0 && (d.tag !== 'REVERSAL' || ones));
    const it = { n, target: n, choices: null, distractors: uniq(ds), structure: sup === 0, say: null,
      params: Object.assign(P, { tens, ones, bundle: b, surface: b.id, model: b.model, scatter: sup === 2, groupsFirst: sup < 2, keypad: true, slots: 3, showLen: false }),
      mode: 'keypad', g: 0.01, twin: 'F43', secret: [String(n)] };
    return sup === 0 ? s0chips(r, it) : it;
  }
  if (rung === 12) {
    // build any 2-digit number with tens and ones (rods, coins, egg cartons) – the numeral is the stimulus («Bygg 58»)
    const n = pickN(r, sup === 0 ? 20 : 11, 99, o, [['any', 6], ['dec', 1], ['rev', 3]]);
    const tens = Math.floor(n / 10), ones = n % 10, bid = pick(r, BUILD_SURF), b = BUNDLES.find(x => x.id === bid);
    const ds = [{ v: ones * 10 + tens, tag: 'REVERSAL' }, { v: n + 10, tag: 'COUNT-ONES' }, { v: n - 10, tag: 'COUNT-ONES' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' }]
      .filter(d => d.v !== n && d.v >= 0 && (d.tag !== 'REVERSAL' || ones));
    // numbers stay on objects (SYNTHESIS §6.6): the numeral is shown on a sign, the speech is deictic («Bygg dette tallet!»)
    return { n, target: n, choices: null, distractors: uniq(ds), structure: sup === 0, say: null,
      params: Object.assign(P, { build: true, showNum: n, tens, ones, bundle: b, surface: b.id, model: b.model, ghost: sup === 0, maxTens: 9, maxOnes: sup === 2 ? 19 : 9, noCounter: sup === 2, counter: ['all', 'tens', 'none'][sup] }),
      mode: 'build', g: 0.01, twin: 'F43', secret: [] };
  }
  if (rung === 13) {
    // tens and ones, both directions: «74 er 7 tiere og … enere» → 4 · «3 tiere og 9 enere» → 39 · «Hvor mange tiere er det i 80?» → 8
    const sub = o.sub || (sup === 0 ? pick(r, ['ones', 'num', 'tens']) : wpick(r, [['ones', 3], ['tens', 2], ['num', 3], ['numRev', sup === 2 ? 2 : 0]]));
    const n = pickN(r, 11, 99, o, [['any', 6], ['rev', 3], ['dec', sup === 0 ? 0 : 1]]);
    const t = Math.floor(n / 10), e = n % 10;
    let target, text, ds;
    if (sub === 'ones') { target = e; text = n + ' = ' + t + ' ' + tiere(t) + ' og … enere'; ds = [{ v: t, tag: 'PV-SWAP' }, { v: n, tag: 'ECHO' }, { v: n - t * 10 + 10, tag: 'COUNT-ONES' }]; }
    else if (sub === 'tens') { target = t; text = 'Hvor mange tiere er det i ' + n + '?'; ds = [{ v: n, tag: 'ECHO' }, { v: e, tag: 'PV-SWAP' }, { v: t * 10, tag: 'PV-ZERO' }, { v: t + 1, tag: 'OFF-BY-ONE' }]; }
    else if (sub === 'num') { target = n; text = t + ' ' + tiere(t) + ' og ' + e + ' ' + enere(e); ds = [{ v: e * 10 + t, tag: 'REVERSAL' }, { v: t + e, tag: 'PV-FACE' }, { v: t * 100 + e, tag: 'PV-CONCAT' }, { v: n + 10, tag: 'COUNT-ONES' }]; }
    else { target = n; text = e + ' ' + enere(e) + ' og ' + t + ' ' + tiere(t); ds = [{ v: e * 10 + t, tag: 'REVERSAL' }, { v: t + e, tag: 'PV-FACE' }, { v: e * 100 + t, tag: 'PV-CONCAT' }, { v: n + 10, tag: 'COUNT-ONES' }]; }
    const it = { n, target, text: null, choices: null, distractors: uniq(ds).filter(d => d.v !== target && d.v >= 0), structure: sup === 0, say: null,
      params: Object.assign(P, { sub, tens: t, ones: e, whole: n, label: text, keypad: true, slots: 3, showLen: false, rods: sup === 0, bundle: pick(r, BUNDLES.slice(0, 4)) }),
      mode: 'keypad', g: 0.01, twin: 'F43', secret: [String(target)].filter(x => !(text.match(/\d+/g) || []).includes(x)) };
    return sup === 0 ? s0chips(r, it) : it;
  }
  if (rung === 14) {
    // rename non-standard groupings: 4 tiere og 13 enere → 53 · 63 = 5 tiere og … enere → 13 · who has most?
    const sub = o.sub && (o.sub !== 'most' || sup > 0) ? o.sub : (sup === 0 ? 'compose' : wpick(r, [['compose', 4], ['split', 4], ['most', 2]]));
    if (sub === 'most') {
      // «Hvem har flest?» as an ordering of non-standard groupings (fewest → most): the trap is that neither the most tens nor the
      // most ones wins. s1: 3 groupings (1/6), s2: 4 (1/24) – a single «who has most» pick would be 1/3 (guessable)
      for (let g = 0; g < 300; g++) {
        const m = sup === 2 ? 4 : 3, gs = [];
        for (let i = 0; i < m; i++) { const t = int(r, 1, 5), e = int(r, 2, 19); gs.push({ id: 'g' + i, tens: t, ones: e, value: t * 10 + e, label: t + ' ' + tiere(t) + ' og ' + e + ' ' + enere(e) }); }
        const vals = gs.map(x => x.value), max = Math.max(...vals);
        if (new Set(vals).size !== m) continue;
        const best = gs.find(x => x.value === max), mostT = Math.max(...gs.map(x => x.tens)), mostE = Math.max(...gs.map(x => x.ones));
        if (best.tens === mostT || best.ones === mostE) continue;   // the trap: neither most tens nor most ones wins
        if (!gs.some(x => x.ones >= 10)) continue;
        const order = gs.slice().sort((a, b) => a.value - b.value).map(x => x.id);
        return { n: best.value, target: order, choices: gs.map(x => x.id), distractors: [], structure: sup === 0, say: null,
          params: Object.assign(P, { sub, groups: gs, ask: 'most', order: 'asc', best: best.id }), mode: 'order', g: 1 / fact(m), twin: null, secret: [] };
      }
    }
    if (sub === 'split') {
      // 63 = 5 tiere og … enere → 13 (s2 also 2 tiere fewer: 63 = 4 tiere og … → 23)
      const n = pickN(r, 21, 99, o, [['any', 1]]);
      const t = Math.floor(n / 10), drop = sup === 2 && t >= 3 && r() < 0.35 ? 2 : 1, tg = t - drop, ans = n - tg * 10;
      const ds = [{ v: n % 10, tag: 'NO-CARRY' }, { v: ans + 10, tag: 'COUNT-ONES' }, { v: ans - 1, tag: 'OFF-BY-ONE' }, { v: t, tag: 'PV-SWAP' }];
      const it = { n, target: ans, choices: null, distractors: uniq(ds).filter(d => d.v !== ans && d.v >= 0), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, whole: n, tensGiven: tg, label: n + ' = ' + tg + ' ' + tiere(tg) + ' og … enere', keypad: true, slots: 3, showLen: false }),
        mode: 'keypad', g: 0.01, twin: 'F43', secret: [String(ans)] };
      return sup === 0 ? s0chips(r, it) : it;
    }
    // rename: t tiere og e enere (e ≥ 10) → n
    let t, e, n;
    const kv = keyVal(o.key); const f = kv && /^\d+$/.test(kv) ? +kv : (o.target != null && /^\d+$/.test(String(o.target)) ? +o.target : null);
    if (f != null && f >= 20 && f <= 99) { n = f; e = 10 + (n % 10); t = Math.floor(n / 10) - 1; }
    else { t = int(r, 1, sup === 0 ? 4 : 7); e = int(r, 10, 19); n = t * 10 + e; if (n > 99) { t = 4; e = 13; n = 53; } }
    const ds = [{ v: t * 100 + e, tag: 'PV-CONCAT' }, { v: t * 10 + (e % 10), tag: 'NO-CARRY' }, { v: t + e, tag: 'PV-FACE' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 10, tag: 'COUNT-ONES' }];
    const it = { n, target: n, choices: null, distractors: uniq(ds).filter(d => d.v !== n && d.v >= 0), structure: sup === 0, say: null,
      params: Object.assign(P, { sub: 'compose', tens: t, ones: e, label: t + ' ' + tiere(t) + ' og ' + e + ' ' + enere(e), keypad: true, slots: 3, showLen: false, veksle: true, bundle: pick(r, BUNDLES.slice(0, 4)) }),
      mode: 'keypad', g: 0.01, twin: 'F43', secret: [String(n)] };
    return sup === 0 ? s0chips(r, it) : it;
  }
  // M15 coins and notes ≤ 100 kr: count a purse / pay a price (s2: with the fewest pieces)
  const sub = o.sub || (sup === 0 ? pick(r, ['count', 'pay']) : pick(r, ['count', 'pay']));
  if (sub === 'count') {
    const kinds = sup === 0 ? [10, 1] : sup === 1 ? [20, 10, 5, 1] : [50, 20, 10, 5, 1];
    const nPieces = sup === 0 ? int(r, 3, 5) : sup === 1 ? int(r, 4, 6) : int(r, 5, 7);
    let coins = []; for (let i = 0; i < nPieces; i++) coins.push(pick(r, kinds));
    coins.sort((a, b) => b - a);
    let n = coins.reduce((s, v) => s + v, 0);
    while (n > 100) { coins.shift(); n = coins.reduce((s, v) => s + v, 0); }
    const ds = [{ v: coins.length, tag: 'PV-FACE' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' }, { v: n + 10, tag: 'COUNT-ONES' }, { v: n - 5, tag: 'OTHER' }];
    const it = { n, target: n, choices: null, distractors: uniq(ds).filter(d => d.v !== n && d.v >= 0), structure: sup === 0, say: null,
      params: Object.assign(P, { sub, coins: shuffle(r, coins), keypad: true, slots: 3, showLen: false, noCounter: sup >= 1 }),
      mode: 'keypad', g: 0.01, twin: null, secret: [String(n)] };
    return sup === 0 ? s0chips(r, it) : it;
  }
  const n = pickN(r, sup === 0 ? 11 : 21, sup === 0 ? 39 : sup === 1 ? 69 : 99, o, [['any', 1]]);
  const few = fewest(n);
  const ds = [{ v: n - 1, tag: 'OFF-BY-ONE' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n + 10, tag: 'COUNT-ONES' }];
  return { n, target: n, choices: null, distractors: ds, structure: sup === 0, say: null,
    params: Object.assign(P, { sub: 'pay', price: n, showNum: n, pay: true, coinsAvail: sup === 0 ? [10, 5, 1] : [50, 20, 10, 5, 1], fewest: few, fewestN: few.length, needFewest: sup === 2,
      meter: false, noCounter: sup >= 1, counter: ['all', 'tens', 'none'][sup] }),
    mode: 'build', g: 0.01, twin: null, secret: [] };
};

NEWT['T-SKRIV'] = function (rung, sup, o, r) {
  if (rung === 8) {
    // write a dictated number 21–100 on a 3-slot keypad (no length cue): «Skriv førtisju» → 47
    const n = pickN(r, 21, 100, o, [['rev', 6], ['dec', 2], ['any', 2], ['h', 0]]);
    const t = Math.floor(n / 10), e = n % 10;
    const ds = [];
    if (e && e !== t && n < 100) ds.push({ v: e * 10 + t, tag: 'REVERSAL' });
    if (e && n < 100) ds.push({ v: t * 100 + e, tag: 'PV-CONCAT' });
    if (!e && n < 100) ds.push({ v: 10 + t, tag: 'DECADE' });
    if (n === 100) ds.push({ v: 10, tag: 'PV-ZERO' }, { v: 1000, tag: 'PV-ZERO' });
    ds.push({ v: t * 10, tag: 'DIGIT-ONLY' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' });
    const it = { n, target: n, slots: 3, choices: null, distractors: uniq(ds).filter(d => d.v !== n), structure: sup === 0, say: { kind: 'num', n },
      params: { keypad: true, slots: 3, len: null, showLen: false, ghost: sup === 0 ? String(n)[0] : null, noWiden: true, contrastWith: e && e !== t && n < 100 ? e * 10 + t : null },
      mode: 'keypad', g: 0.01, twin: null, secret: [String(n), numWord(n)].filter(Boolean) };
    return it;
  }
  // W9 write the numeral shown by another representation: rods / coins / an arrow on a line / a written split
  const rep = o.sub || wpick(r, [['rods', 3], ['coins', 3], ['line', 2], ['text', sup === 2 ? 2 : 0]]);
  if (rep === 'line') {
    const t0 = 10 * int(r, 2, 8), k = sup === 0 ? 5 : pick(r, [5, 5, 2, 3, 4, 6, 7, 8]), n = t0 + k;
    const ds = [{ v: t0 + 10 - k, tag: 'MIRROR' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' }, { v: k * 10 + t0 / 10, tag: 'REVERSAL' }];
    return { n, target: n, slots: 3, choices: null, distractors: uniq(ds).filter(d => d.v !== n), structure: sup === 0, say: null,
      params: { rep, from: t0, to: t0 + 10, tick: k, mid: k === 5, ticks: true, keypad: true, slots: 3, showLen: false, noWiden: true },
      mode: 'keypad', g: 0.01, twin: 'F44', secret: [String(n)] };
  }
  const n = pickN(r, 20, 99, o, [['rev', 5], ['any', 4], ['dec', 1]]);
  const t = Math.floor(n / 10), e = n % 10;
  const ds = [{ v: e * 10 + t, tag: 'REVERSAL' }, { v: t * 100 + e, tag: 'PV-CONCAT' }, { v: t + e, tag: 'PV-FACE' }, { v: n + 10, tag: 'COUNT-ONES' }, { v: n + 1, tag: 'OFF-BY-ONE' }]
    .filter(d => d.v !== n && (d.tag !== 'REVERSAL' || e));
  const bid = rep === 'coins' ? 'kroner' : pick(r, ['krystall', 'egg', 'ved']), b = rep === 'coins' || rep === 'rods' ? BUNDLES.find(x => x.id === bid) : null;
  return { n, target: n, slots: 3, choices: null, distractors: uniq(ds), structure: sup === 0, say: null,
    params: { rep, tens: t, ones: e, bundle: b, surface: b ? b.id : null, label: rep === 'text' ? t + ' ' + tiere(t) + ' og ' + e + ' ' + enere(e) : null,
      scatter: sup === 2 && rep !== 'text', keypad: true, slots: 3, showLen: false, noWiden: true },
    mode: 'keypad', g: 0.01, twin: 'F43', secret: [String(n)] };
};

NEWT['T-ORDEN'] = function (rung, sup, o, r) {
  const P = { noWiden: true };
  if (rung === 9) {
    // 0–20 line, only the ends marked: place (±1) / read the arrow (ticks) / nearest mark
    const sub = o.sub || (sup === 0 ? wpick(r, [['place', 7], ['arrow', 3]]) : wpick(r, [['place', 55], ['arrow', 25], ['nearest', 20]]));
    if (sub === 'nearest') {
      let n; do { n = int(r, 1, 19); } while (n % 5 === 0);
      const marks = [0, 5, 10, 15, 20], t = Math.round(n / 5) * 5;
      const other = n % 5 <= 2 ? t + 5 : t - 5;
      const ds = [{ v: other, tag: 'ROUNDING' }].concat(marks.filter(m => m !== t && m !== other).map(m => ({ v: m, tag: 'OTHER' })));
      return { n, target: t, choices: marks.slice(), distractors: ds, structure: sup === 0, say: null,
        params: Object.assign(P, { sub, min: 0, max: 20, marks, value: n, ask: 'nearest' }), mode: 'chips', g: 1 / 5, twin: 'F44', secret: [] };
    }
    const n = pickN(r, 1, 19, o, [['any', 1]]);
    const tol = sup === 0 ? 2 : 1, marks = sup === 0 ? [0, 10, 20] : [0, 20];
    const ds = [{ v: 20 - n, tag: 'MIRROR' }, { v: n + 2, tag: 'OFF-BY-ONE' }, { v: n - 2, tag: 'OFF-BY-ONE' }].filter(d => d.v !== n && d.v >= 0 && d.v <= 20);
    if (sub === 'arrow') {
      const rds = [{ v: 20 - n, tag: 'MIRROR' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' }].filter(d => d.v !== n && d.v >= 0);
      const it = { n, target: n, choices: null, distractors: uniq(rds), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, min: 0, max: 20, marks, ticks: true, arrow: n, keypad: true, slots: 3, showLen: false }), mode: 'keypad', g: 0.01, twin: 'F44', secret: [String(n)] };
      return sup === 0 ? s0chips(r, it) : it;
    }
    return { n, target: n, choices: null, distractors: uniq(ds), structure: sup === 0, say: null,
      params: Object.assign(P, { sub: 'place', min: 0, max: 20, marks, tol, value: n, ticks: false }), mode: 'line', g: (2 * tol) / 20, twin: 'F44', secret: [] };
  }
  if (rung === 10) {
    // neighbours across tens (after 39 → 40, before 70 → 69) and «tap all between 57 and 61»
    const sub = o.sub || (sup === 0 ? pick(r, ['after', 'before']) : wpick(r, [['after', 35], ['before', 35], ['between', 30]]));
    if (sub === 'between') {
      for (let g = 0; g < 200; g++) {
        const gap = int(r, 3, sup === 2 ? 6 : 5), cross = r() < 0.7;
        const lo = cross ? 10 * int(r, 2, 9) - int(r, 1, gap - 1) : int(r, 21, 90), hi = lo + gap + 1;
        if (lo < 1 || hi > 100) continue;
        const inside = range(lo + 1, hi - 1);
        const rowLo = Math.max(1, lo - int(r, 1, 2)), rowHi = Math.min(100, Math.max(rowLo + 7, hi + int(r, 1, 2)));
        const row = range(rowLo, rowHi);
        if (row.length > 10) continue;
        const ds = [{ v: lo, tag: 'ENDS' }, { v: hi, tag: 'ENDS' }].concat(row.filter(v => v < lo || v > hi).map(v => ({ v, tag: 'OFF-BY-ONE' })));
        return { n: lo + 1, target: inside, choices: row, distractors: ds, structure: sup === 0, say: null,
          params: Object.assign(P, { sub, lo, hi, a: lo, b: hi, between: true, row, stones: true }), mode: 'subset', g: 1 / (Math.pow(2, row.length) - 1), twin: 'F42', secret: [] };
      }
    }
    const after = sub !== 'before';
    let b;
    const kv = keyVal(o.key); const f = kv && /^\d+$/.test(kv) ? +kv : (o.target != null && /^\d+$/.test(String(o.target)) ? +o.target : null);
    if (f != null && f >= 2 && f <= 100) b = after ? f - 1 : f + 1;
    else if (r() < 0.6) b = after ? 10 * int(r, 1, 9) + 9 : 10 * int(r, 2, 10);
    else b = after ? int(r, 21, 98) : int(r, 22, 99);
    if (!after && b > 100) b = 100;
    const t = after ? b + 1 : b - 1;
    const ds = after
      ? [{ v: b % 10 === 9 ? b - 9 : t + 1, tag: b % 10 === 9 ? 'NINES' : 'OFF-BY-ONE' }, { v: b - 1, tag: 'OFF-BY-ONE' }, { v: b % 10 === 9 ? Math.floor(b / 10) * 100 + 10 : t + 10, tag: b % 10 === 9 ? 'PV-CONCAT' : 'COUNT-ONES' }, { v: t + 10, tag: 'COUNT-ONES' }]
      : [{ v: b % 10 === 0 ? b + 9 : t - 1, tag: b % 10 === 0 ? 'NINES' : 'OFF-BY-ONE' }, { v: b + 1, tag: 'OFF-BY-ONE' }, { v: t - 10, tag: 'COUNT-ONES' }, { v: b - 10, tag: 'COUNT-ONES' }];
    const it = { n: t, target: t, choices: null, distractors: uniq(ds).filter(d => d.v !== t && d.v >= 0), structure: sup === 0, say: null,
      params: Object.assign(P, { sub, dir: after ? 'after' : 'before', shown: b, ref: b, keypad: true, slots: 3, showLen: false }), mode: 'keypad', g: 0.01, twin: 'F42', secret: [String(t)] };
    return sup === 0 ? s0chips(r, it) : it;
  }
  if (rung === 11) {
    // ±1 / ±10 moves on the hundred board (rows of ten: 1–10, 11–20 …; «ned» = +10) and «10 mer enn 90»
    const sub = o.sub || wpick(r, [['board', 7], ['more', 3]]);
    if (sub === 'more') {
      const delta = sup === 0 ? pick(r, [10, -10]) : pick(r, [10, -10, 1, -1, 10, -10]);
      let b;
      for (let g = 0; g < 50; g++) {
        b = Math.abs(delta) === 1 ? (delta > 0 ? 10 * int(r, 2, 9) + 9 : 10 * int(r, 2, 10)) : (r() < 0.25 ? (delta > 0 ? 90 : 10 * int(r, 2, 10)) : int(r, 11, 99));
        if (b + delta >= 1 && b + delta <= 100) break;
      }
      const t = b + delta;
      const ds = [{ v: b - delta, tag: 'DIRECTION' }, { v: Math.abs(delta) === 10 ? b + Math.sign(delta) : b + 10 * Math.sign(delta), tag: 'ROW-COL' }, { v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }];
      const it = { n: t, target: t, choices: null, distractors: uniq(ds).filter(d => d.v !== t && d.v >= 0), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, base: b, delta, label: Math.abs(delta) + (delta > 0 ? ' mer enn ' : ' mindre enn ') + b, keypad: true, slots: 3, showLen: false }),
        mode: 'keypad', g: 0.01, twin: 'F42', secret: [String(t)] };
      return sup === 0 ? s0chips(r, it) : it;
    }
    for (let g = 0; g < 300; g++) {
      const start = int(r, 1, 100), row = Math.floor((start - 1) / 10), col = (start - 1) % 10;
      const moves = [];
      const vdir = pick(r, ['down', 'up']), vk = sup === 0 ? 1 : int(r, 1, 3);
      if (sup < 2 && r() < 0.35) { const hdir = pick(r, ['right', 'left']); moves.push({ dir: hdir, k: sup === 0 ? 1 : int(r, 1, 3) }); }
      else moves.push({ dir: vdir, k: vk });
      if (sup === 2 && r() < 0.6) moves.push({ dir: pick(r, ['right', 'left']), k: int(r, 1, 2) });
      let rr = row, cc = col, ok = true;
      for (const m of moves) { if (m.dir === 'down') rr += m.k; else if (m.dir === 'up') rr -= m.k; else if (m.dir === 'right') cc += m.k; else cc -= m.k; if (rr < 0 || rr > 9 || cc < 0 || cc > 9) ok = false; }
      if (!ok) continue;
      const t = rr * 10 + cc + 1;
      const v0 = moves[0], sg = v0.dir === 'down' || v0.dir === 'right' ? 1 : -1, vert = v0.dir === 'down' || v0.dir === 'up';
      const ds = [{ v: t - sg * (vert ? 10 : 1) * v0.k * 2, tag: 'DIRECTION' }, { v: t - sg * (vert ? 10 : 1) * v0.k + sg * (vert ? 1 : 10) * v0.k, tag: 'ROW-COL' }, { v: t + (vert ? 10 : 1), tag: 'OFF-BY-ONE' }, { v: t - (vert ? 10 : 1), tag: 'OFF-BY-ONE' }];
      return { n: t, target: t, choices: null, distractors: uniq(ds).filter(d => d.v !== t && d.v >= 1 && d.v <= 100), structure: sup === 0, say: null,
        params: Object.assign(P, { sub: 'board', start, moves, board: [1, 100], rows: 10 }), mode: 'scene', g: 0.01, twin: 'F42', secret: [String(t)].filter(x => x !== String(start)) };
    }
  }
  if (rung === 12) {
    // compare and order 2-digit numbers: order 4 (1/24) · signs for 3 pairs · tap all > a and < b
    const sub = o.sub || (sup === 0 ? pick(r, ['order', 'sign']) : wpick(r, [['order', 4], ['sign', 3], ['range', 3]]));
    if (sub === 'order') {
      const m = sup === 0 ? 3 : 4;
      for (let g = 0; g < 200; g++) {
        const a = int(r, 1, 9), b = int(r, 1, 9); if (a === b) continue;
        const set = [a * 10 + b, b * 10 + a];                       // 46, 64
        if (m >= 3) set.push(a * 10);                               // 40
        if (m >= 4) set.push(r() < 0.5 ? b : a);                    // 6
        if (new Set(set).size !== m) continue;
        const order = sup === 2 && r() < 0.35 ? 'desc' : 'asc';
        const sorted = set.slice().sort((x, y) => order === 'asc' ? x - y : y - x);
        return { n: sorted[0], target: sorted, choices: shuffle(r, set), distractors: [], structure: sup === 0, say: null,
          params: Object.assign(P, { sub, order, count: m }), mode: 'order', g: 1 / fact(m), twin: null, secret: [] };
      }
    }
    if (sub === 'sign') {
      const np = sup === 0 ? 1 : 3, pairs = [];
      for (let g = 0; pairs.length < np && g < 200; g++) {
        const kind = wpick(r, [['rev', 3], ['tens', 2], ['ones', 2], ['eq', pairs.some(p => p[0] === p[1]) ? 0 : 1]]);
        const a = int(r, 1, 9), b = int(r, 1, 9); let x, y;
        if (kind === 'rev') { if (a === b) continue; x = a * 10 + b; y = b * 10 + a; }
        else if (kind === 'tens') { x = a * 10 + b; y = ((a % 9) + 1) * 10 + b; }
        else if (kind === 'ones') { x = a * 10 + b; y = a * 10 + ((b + int(r, 1, 8)) % 10); }
        else { x = a * 10 + b; y = x; }
        if (x === y && kind !== 'eq') continue;
        if (r() < 0.5) { const tt = x; x = y; y = tt; }
        pairs.push([x, y]);
      }
      const signs = pairs.map(p => p[0] < p[1] ? '<' : p[0] > p[1] ? '>' : '=');
      const n = pairs[0][0];
      if (np === 1) return { n, target: signs[0], choices: ['<', '=', '>'], distractors: ['<', '=', '>'].filter(x => x !== signs[0]).map(v => ({ v, tag: 'COMPARE' })), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, pairs }), mode: 'chips', g: 1 / 3, twin: null, secret: [] };
      return { n, target: signs, choices: ['<', '=', '>'], distractors: [], structure: sup === 0, say: null,
        params: Object.assign(P, { sub, pairs }), mode: 'grid', g: Math.pow(1 / 3, np), twin: null, secret: [] };
    }
    // range: tap all numbers greater than a and less than b
    for (let g = 0; g < 200; g++) {
      const a = int(r, 12, 80), b = a + int(r, 5, 9); if (b > 99) continue;
      const nIn = int(r, 2, sup === 2 ? 4 : 3), nCards = sup === 2 ? 10 : 8;
      const inside = shuffle(r, range(a + 1, b - 1)).slice(0, nIn);
      const traps = [a, b];
      inside.forEach(v => { const rv = rev(v); if (rv !== v && (rv <= a || rv >= b) && rv >= 10) traps.push(rv); });
      traps.push(a - int(r, 1, 3), b + int(r, 1, 3), a - 10 + int(r, 1, 8), b + 10 - int(r, 1, 8));
      const out = []; for (const v of traps) if (v >= 1 && v <= 99 && !inside.includes(v) && !out.includes(v)) out.push(v);
      if (inside.length + out.length < nCards) continue;
      const cards = shuffle(r, inside.concat(out.slice(0, nCards - inside.length)));
      const ds = cards.filter(v => !inside.includes(v)).map(v => ({ v, tag: v === a || v === b ? 'ENDS' : rev(v) !== v && inside.includes(rev(v)) ? 'REVERSAL' : 'OFF-BY-ONE' }));
      return { n: a, target: inside.slice().sort((x, y) => x - y), choices: cards, distractors: ds, structure: sup === 0, say: null,
        params: Object.assign(P, { sub: 'range', gt: a, lt: b, label: 'større enn ' + a + ' og mindre enn ' + b }), mode: 'subset', g: 1 / (Math.pow(2, cards.length) - 1), twin: null, secret: [] };
    }
  }
  if (rung === 13) {
    // 0–100 line with the tens marked: place (±3) / midpoint / read the arrow
    const sub = o.sub || wpick(r, [['place', 5], ['mid', 3], ['arrow', 2]]);
    if (sub === 'mid') {
      let a, b;
      if (sup === 0) { a = 10 * int(r, 0, 9); b = a + 10; }
      else if (sup === 1) { if (r() < 0.5) { a = 10 * int(r, 0, 9); b = a + 10; } else { a = 10 * int(r, 0, 8); b = a + 20; } }
      else { for (let g = 0; g < 100; g++) { a = int(r, 1, 80); b = a + 2 * int(r, 2, 10); if (b <= 100) break; } }
      const t = (a + b) / 2;
      const ds = [{ v: t + 1, tag: 'OFF-BY-ONE' }, { v: t - 1, tag: 'OFF-BY-ONE' }, { v: a + b, tag: 'ADD-ALL' }, { v: b - a, tag: 'OTHER' }, { v: a + 10, tag: 'OTHER' }];
      const it = { n: t, target: t, choices: null, distractors: uniq(ds).filter(d => d.v !== t && d.v >= 0), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, a, b, min: 0, max: 100, marks: range(0, 10).map(x => x * 10), keypad: true, slots: 3, showLen: false }), mode: 'keypad', g: 0.01, twin: 'F44', secret: [String(t)] };
      return sup === 0 ? s0chips(r, it) : it;
    }
    if (sub === 'arrow') {
      const t0 = 10 * int(r, 0, 9), k = int(r, 1, 9), n = t0 + k;
      const ds = [{ v: t0 + 10 - k, tag: 'MIRROR' }, { v: n + 1, tag: 'OFF-BY-ONE' }, { v: n - 1, tag: 'OFF-BY-ONE' }, { v: k * 10 + t0 / 10, tag: 'REVERSAL' }];
      const it = { n, target: n, choices: null, distractors: uniq(ds).filter(d => d.v !== n && d.v >= 0), structure: sup === 0, say: null,
        params: Object.assign(P, { sub, from: t0, tick: k, min: 0, max: 100, marks: range(0, 10).map(x => x * 10), ticks: true, keypad: true, slots: 3, showLen: false }), mode: 'keypad', g: 0.01, twin: 'F44', secret: [String(n)] };
      return sup === 0 ? s0chips(r, it) : it;
    }
    let n; do { n = pickN(r, 1, 99, o, [['any', 1]]); } while (n % 10 === 0 && sup > 0 && !o.key && o.target == null);
    const tol = sup === 0 ? 5 : 3;
    const ds = [{ v: rev(n), tag: 'REVERSAL' }, { v: n + 10, tag: 'COUNT-ONES' }, { v: n - 10, tag: 'COUNT-ONES' }].filter(d => d.v !== n && d.v >= 0 && d.v <= 100);
    return { n, target: n, choices: null, distractors: uniq(ds), structure: sup === 0, say: null,
      params: Object.assign(P, { sub: 'place', min: 0, max: 100, marks: range(0, 10).map(x => x * 10), tol, value: n }), mode: 'line', g: (2 * tol) / 100, twin: 'F44', secret: [] };
  }
  // O14 ordinals 1.–10. in a queue (front = position 1)
  const L = sup === 0 ? int(r, 5, 6) : sup === 1 ? int(r, 6, 8) : int(r, 8, 10);
  const queue = shuffle(r, ANIMALS_Q).slice(0, L);
  const sub = o.sub || (sup === 0 ? wpick(r, [['front', 7], ['back', 3]]) : sup === 1 ? wpick(r, [['front', 4], ['back', 4], ['same', 2]]) : wpick(r, [['front', 25], ['back', 30], ['same', 20], ['convert', 25]]));
  if (sub === 'same' || sub === 'convert') {
    let Lq = L; if (sub === 'same' && Lq % 2 === 0) Lq = Lq + 1 <= 10 ? Lq + 1 : Lq - 1;
    const q = queue.length >= Lq ? queue.slice(0, Lq) : shuffle(r, ANIMALS_Q).slice(0, Lq);
    const k = sub === 'same' ? (Lq + 1) / 2 : int(r, 2, Lq - 1);
    const t = sub === 'same' ? k : Lq - k + 1;
    const ds = sub === 'same' ? [{ v: Math.floor(Lq / 2), tag: 'OFF-BY-ONE' }, { v: Lq, tag: 'ECHO' }, { v: k + 1, tag: 'OFF-BY-ONE' }]
      : [{ v: k, tag: 'FRONT-BACK' }, { v: Lq - k, tag: 'OFF-BY-ONE' }, { v: Lq - k + 2, tag: 'OFF-BY-ONE' }, { v: Lq, tag: 'ECHO' }];
    const who = q[k - 1];
    const it = { n: t, target: t, choices: null, distractors: uniq(ds).filter(d => d.v !== t && d.v >= 1), structure: sup === 0, say: sub === 'convert' ? { kind: 'ord', k, from: 'front' } : null,
      params: Object.assign(P, { sub, queue: q, L: Lq, k, who, from: 'front', ask: sub === 'same' ? 'same' : 'back', keypad: true, slots: 3, showLen: false }),
      mode: 'keypad', g: 0.01, twin: null, secret: [String(t)].filter(x => x !== String(k) && x !== String(Lq)) };
    return it;
  }
  const k = sup === 0 ? int(r, 1, Math.min(4, L)) : int(r, 2, L);
  const from = sub === 'back' ? 'back' : 'front';
  const idx = from === 'front' ? k - 1 : L - k;
  const target = queue[idx];
  const ds = [{ v: queue[from === 'front' ? L - k : k - 1], tag: 'FRONT-BACK' }, { v: queue[idx + 1], tag: 'OFF-BY-ONE' }, { v: queue[idx - 1], tag: 'OFF-BY-ONE' }]
    .filter(d => d.v != null && d.v !== target);
  return { n: k, target, choices: queue.slice(), distractors: uniq(ds), structure: sup === 0, say: { kind: 'ord', k, from },
    params: Object.assign(P, { sub: from, queue, L, k, from, ask: 'who' }), mode: 'scene', g: 1 / L, twin: null, secret: [] };
};

/* ---------------------------------------------------------------- words */
const NOMODEL_LES = { F29: 1 };                         // rhyme bells: words without a 3D model are fine (F26/F27 show the thing as a 3D picture → need models)
const NEEDMODEL_SKRIV = { F33: 1, F34: 1, F37: 1, F38: 1, F39: 1, F41: 1 };   // formats that show the word as a 3D thing
function lesPool(rung, o) {
  const Wd = W(); const model = !(o.format && NOMODEL_LES[o.format]);
  const ok = x => model ? x.castable : (x.castable || x.pos === 'subst');
  let p;
  if (rung === 1) p = Wd.list.filter(x => ok(x) && x.w.length === 3 && x.rung.LES === 1);
  else if (rung === 2) p = Wd.list.filter(x => ok(x) && x.w.length === 3 && x.rung.LES <= 2);
  else if (rung === 3) p = Wd.list.filter(x => x.castable && x.w.length <= 4 && x.rung.LES <= 4 && withM(Wd.pairs(x.w).map(w => ({ w })), 1).some(y => hasM(y.w)));
  else p = Wd.list.filter(x => ok(x) && x.rung.LES === rung);
  return model ? withM(p, 4) : p;
}
function skrivPool(rung, o) {
  const Wd = W(); const model = !!(o.format && NEEDMODEL_SKRIV[o.format]) || o.model;
  const p = Wd.list.filter(x => (model ? x.castable : true) && x.rung.SKRIV === rung);
  return model ? withM(p, 4) : p;
}
// words the format's own spoken prompt contains («Hvilken bok handler om dette?», «Hvilket skilt peker dit?», «Finn døra …»):
// such a word must never be that format's READING target (the prompt would read it aloud). Page only (needs F.TPL + F.Task.defs).
const pwCache = {};
function promptWords(fmt) {
  if (!fmt) return null;
  if (pwCache[fmt]) return pwCache[fmt];
  const spec = F.Task && F.Task.defs && F.Task.defs[fmt], T = F.TPL && F.TPL.all;
  if (!spec || !T || !Array.isArray(spec.tpl)) return null;
  const toks = new Set();
  for (const id of spec.tpl) { const t = T[id]; if (!t) continue; [].concat(t.text || []).forEach(x => String(x).replace(/\{[^}]*\}/g, ' ').toLowerCase().split(/[^a-zæøå]+/).forEach(w => w && toks.add(w))); }
  return (pwCache[fmt] = toks);
}
const inPrompt = (w, toks) => { if (!toks) return false; for (const t of toks) if (t === w || (t.startsWith(w) && t.length - w.length <= 2 && w.length >= 3)) return true; return false; };
// C6 (hint_leaks 10): words just spoken or shown – o.said (lines, words or 'STRAND:word' keys) plus plain words in o.avoid (no ':')
function saidToks(o) {
  const out = new Set();
  const add = x => String(x).toLowerCase().replace(/^[A-ZÆØÅ-]+:/i, m => /^(LES|SKRIV):$/i.test(m) ? '' : m).split(/[^a-zæøåé]+/).forEach(w => w && out.add(w));
  [].concat(o.said || []).forEach(add);
  (o.avoid || []).forEach(x => { if (typeof x === 'string' && x.indexOf(':') < 0) add(x); });
  return out.size ? out : null;
}
function pickWord(r, pool, o, strand) {
  const kv = keyVal(o.key); const tv = o.target != null ? String(o.target) : null;
  const want = kv || tv;
  const said = saidToks(o), toks = (strand === 'LES' || strand === 'SKRIV') && o.format ? promptWords(o.format) : null;
  // LES: a reading target the prompt or a character line just said is no reading; SKRIV: a word just SHOWN would be copying
  const bad = w => (said && inPrompt(w, said)) || (strand === 'LES' && toks && inPrompt(w, toks));
  if (want) { const e = W().get(want); if (e && pool.includes(e) && !bad(e.w)) return e; }
  { const p2 = pool.filter(x => !bad(x.w)); if (p2.length) pool = p2; }
  const avoid = new Set(o.avoid || []);
  // weight castables with model priority (P0 first) a bit higher: more familiar words
  for (let i = 0; i < 8; i++) { const e = pick(r, pool); if (!avoid.has(strand + ':' + e.w)) return e; }
  return pick(r, pool);
}
// distractor words for reading: all castable (they are shown as 3D objects)
// related meanings (hypernym / near-synonym): never target + wrong picture together (an owl IS a bird)
const SEMREL = new Set(['fugl>ugle', 'fugl>måke', 'fugl>and', 'fugl>due', 'fugl>høne', 'fugl>kråke', 'fugl>svane', 'fugl>hane', 'fugl>ravn',
  'hatt>lue', 'dyne>pute', 'blomst>rose', 'blomst>tulipan', 'kopp>krus', 'kake>bolle', 'gave>pakke']);
// v5 (logic #15): + F.WORDS.semRel – umbrella words (dyr, fugl, båt, plante, blomst, frukt, lys …) and near-synonym / young-of pairs
const semRel = (a, b) => SEMREL.has(a + '>' + b) || SEMREL.has(b + '>' + a) || !!(W().semRel && W().semRel(a, b));
function lesDistractors(r, t, k, mode, o) {
  const Wd = W(); const out = []; const used = new Set([t.w]);
  const take = (w, tag) => { if (w && !used.has(w) && !semRel(t.w, w) && out.length < k - 1) { used.add(w); out.push({ v: w, tag: tag || tagWord(t.w, w) || 'OTHER' }); } };
  const model = !(o.format && NOMODEL_LES[o.format]);
  const all = model ? withM(Wd.list.filter(x => x.castable && x.w !== t.w), 12) : Wd.list.filter(x => x.w !== t.w);
  if (o.conf) {
    const top = Object.keys(o.conf).filter(x => x.split('>')[0] === t.w).sort((a, b) => o.conf[b] - o.conf[a]);
    for (const kk of top) { const w = kk.split('>')[1]; if (r() < 0.4 && Wd.get(w) && (Wd.get(w).castable || !model)) take(w); }
  }
  if (mode === 'pairs') shuffle(r, Wd.pairs(t.w)).filter(w => !model || hasM(w)).forEach(w => take(w));
  if (mode === 'near' || mode === 'pairs') {
    const near = all.map(x => ({ x, d: lev(x.w, t.w) - (x.w[0] === t.w[0] ? 0.5 : 0) + (x.w.length === t.w.length ? 0 : 0.6) + r() * 0.4 }))
      .sort((a, b) => a.d - b.d).slice(0, 8);
    near.forEach(n => take(n.x.w));
  }
  if (mode === 'diff') {   // very different: other first letter, other category
    shuffle(r, all.filter(x => x.w[0] !== t.w[0] && x.cat !== t.cat && Math.abs(x.w.length - t.w.length) <= 1)).forEach(x => take(x.w));
  }
  if (mode === 'firstsame1') {   // C7 (hint_leaks 12): one near word with the SAME first letter, so the first sound alone does not pick
    const same = all.filter(x => x.w[0] === t.w[0] && Math.abs(x.w.length - t.w.length) <= 1).map(x => ({ x, d: lev(x.w, t.w) + r() * 0.5 })).sort((a, b) => a.d - b.d);
    if (same.length) take(same[0].x.w);
  }
  if (mode === 'firstdiff' || mode === 'firstsame1') shuffle(r, all.filter(x => x.w[0] !== t.w[0] && !out.some(d => d.v[0] === x.w[0] && d.v[0] !== t.w[0]) && Math.abs(x.w.length - t.w.length) <= 1)).forEach(x => take(x.w));
  shuffle(r, all).forEach(x => take(x.w));
  return out;
}

// F29 Rimklokkene: the format rings a GIVEN word and asks for the bell that rhymes. Its rule (f_read.js): the rhyme is the first
// word of the 3–5-letter list whose tail matches. The bank picks the word to READ (target) and a given word whose first rhyme is
// exactly that target, so the format does not have to retarget (item.word = params.given = the ringing word; target = the rhyme).
const rhymeTail = x => x.slice(Math.max(1, x.length - (x.length > 3 ? 3 : 2)));
// v5 (logic #54): rhyme by SOUND – F.WORDS.rhymes (rime from the first vowel; nd → nn, ld → ll, rd → r), the rule f_read.js F29 uses
const rhymes = (a, b) => W().rhymes ? W().rhymes(a, b) : a !== b && rhymeTail(a) === rhymeTail(b) && a[0] !== b[0];
let rhymeInv = null;
function rhymeGiven() {
  if (rhymeInv) return rhymeInv;
  const L = W().list.filter(x => x.w.length >= 3 && x.w.length <= 5);
  rhymeInv = {};
  for (const x of L) { const p = L.find(y => rhymes(x.w, y.w)); if (p) (rhymeInv[p.w] = rhymeInv[p.w] || []).push(x.w); }
  return rhymeInv;
}
// a word that LOOKS like a rhyme of `given` (same final consonants, another vowel: mus → is, mos) but does not rhyme
const coda = w => (w.match(/[^aeiouyæøå]+$/) || [''])[0];
const nucleus = w => (w.match(/[aeiouyæøå]+(?=[^aeiouyæøå]*$)/) || [''])[0];
function lookAlike(r, given, target, rung) {
  const cd = coda(given); if (!cd) return null;
  const nu = nucleus(given);
  const c = W().list.filter(x => x.w !== given && x.w !== target && x.w.length >= 2 && x.w.length <= 5 && coda(x.w) === cd && nucleus(x.w) && nucleus(x.w) !== nu &&
    !rhymes(given, x.w) && !rhymes(target, x.w) && (x.rung.LES || 9) <= Math.max(rung + 2, 5));
  return c.length ? pick(r, c).w : null;
}
// F32 Hva blir det?: the format turns a source word into one of its one-letter pairs that has a model. The bank picks the new word
// (target) and a source whose only modelled pair is that target where possible (params.from; item.word = from for the format).
function swapFrom(r, to) {
  const Wd = W(); const ps = (Wd.pairs ? Wd.pairs(to) : []).filter(hasM);
  const only = ps.filter(f => (Wd.pairs(f) || []).filter(hasM).length === 1);
  return only.length ? pick(r, only) : ps.length ? pick(r, ps) : null;
}
const SENT_FMT = { F30: 'yn', F31: 'riddle' };     // sentence formats: always a sentence item, whatever LES rung they serve
GEN.LES = function (rung, sup, o, r) {
  const lyd = sup === 0 ? 'on' : sup === 1 ? 'late' : 'off';
  if (rung <= 9 && o.format === 'F29') {
    const inv = rhymeGiven();
    let pool = lesPool(rung, o).filter(x => inv[x.w] && x.w.length <= 5);
    if (!pool.length) pool = W().list.filter(x => inv[x.w] && x.rung.LES <= Math.max(rung, 3));
    const t = pickWord(r, pool, o, 'LES');
    const given = pick(r, inv[t.w]);
    let ds = lesDistractors(r, t, (sup === 0 ? 2 : sup === 1 ? 3 : 4) + 2, 'diff', o).filter(d => !rhymes(given, d.v) && !rhymes(t.w, d.v)).slice(0, sup === 0 ? 1 : sup === 1 ? 2 : 3);
    if (sup >= 1) {
      const la = lookAlike(r, given, t.w, rung);
      if (la && !ds.some(d => d.v === la)) ds = [{ v: la, tag: 'VOWEL' }].concat(ds).slice(0, sup === 1 ? 2 : 3);
    }
    return { target: t.w, word: given, text: t.w, choices: shuffle(r, [t.w].concat(ds.map(d => d.v))), distractors: ds, say: null,
      params: { lyd, given, rhyme: t.w, model: t.castable ? t.w : null } };
  }
  if (rung <= 9 && !SENT_FMT[o.format]) {
    let pool = lesPool(rung, o); if (!pool.length) pool = W().list.filter(x => x.castable);
    if (o.format === 'F32') {
      // prefer targets with a source whose ONLY modelled pair is the target (the format then cannot pick another word)
      const Wd = W(), only = x => (Wd.pairs(x.w) || []).filter(hasM).some(f => (Wd.pairs(f) || []).filter(hasM).length === 1);
      const q1 = pool.filter(only), q = pool.filter(x => swapFrom(r, x.w));
      if (q1.length >= 3) pool = q1; else if (q.length) pool = q;
    }
    const t = pickWord(r, pool, o, 'LES');
    if (o.format === 'F32') {
      const from = swapFrom(r, t.w);
      if (from) {
        // C7 (hint_leaks 5): never offer the source word (she just saw it – «tap the one that wasn't there» solves it unread)
        const k = sup + 2;
        const ds = lesDistractors(r, t, k + 2, 'near', o).filter(d => d.v !== from).slice(0, k - 1);
        return { target: t.w, word: from, text: t.w, choices: shuffle(r, [t.w].concat(ds.map(d => d.v))), distractors: ds, say: null,
          params: { lyd, from, to: t.w, model: t.w } };
      }
    }
    const base = rung === 1 ? 2 : 3;
    const k = sup === 0 ? Math.max(2, base - 1) : sup === 1 ? base : Math.min(4, base + 1);
    const mode = sup === 0 ? 'diff' : rung === 1 ? 'diff' : rung === 2 ? 'firstdiff' : rung === 3 ? 'pairs' : sup === 2 ? 'near' : 'firstsame1';
    const ds = lesDistractors(r, t, k, mode, o);
    return { target: t.w, word: t.w, text: t.w, choices: shuffle(r, [t.w].concat(ds.map(d => d.v))), distractors: ds, say: null,
      params: { lyd, model: t.castable ? t.w : null } };
  }
  const Wd = W(), PAL = Wd.COLOURS || {};
  if (rung === 10 && !SENT_FMT[o.format]) {
    // two-word phrase: «rød ball» → tap the right object among coloured variants
    const want = keyVal(o.key) || (o.target != null ? String(o.target) : null);
    const phrases = Wd.PHRASES || [];
    let ph = want && phrases.includes(want) ? want : null;
    if (!ph) {
      const okP = withM(phrases, 10, x => x.split(' ')[1]);
      const colOk = okP.filter(x => !PAL[x.split(' ')[0]] || colourOk(x.split(' ')[1]));
      const pool = colOk.length >= 10 ? colOk : okP;
      const colourOnly = pool.filter(x => PAL[x.split(' ')[0]]);
      ph = pick(r, sup === 0 && colourOnly.length ? colourOnly : pool);
    }
    const [adj, noun] = ph.split(' ');
    const isCol = !!PAL[adj];
    const cands = [];
    const otherAdj = isCol ? shuffle(r, Object.keys(PAL).filter(c => c !== adj)) : [adj === 'stor' ? 'liten' : 'stor'];
    otherAdj.slice(0, 3).forEach(a => { if (phrases.includes(a + ' ' + noun)) cands.push({ v: a + ' ' + noun, tag: 'ADJ' }); });
    const nouns = shuffle(r, withM([...new Set(phrases.map(x => x.split(' ')[1]))].filter(x => x !== noun), 2, x => x)).filter(nn => !isCol || colourOk(nn));
    nouns.slice(0, 3).forEach(nn => { if (phrases.includes(adj + ' ' + nn)) cands.push({ v: adj + ' ' + nn, tag: 'NOUN' }); });
    // v5 (WP-R request): more phrase choices at s1 / s2 (5 / 6: g .2 / .17) – the extra ones mix both words (another colour, another noun)
    otherAdj.slice(0, 3).forEach((a, i) => { const nn = nouns[i]; if (nn && phrases.includes(a + ' ' + nn)) cands.push({ v: a + ' ' + nn, tag: 'OTHER' }); });
    const k = sup === 0 ? 2 : sup === 1 ? 5 : 6;
    const byT = t => cands.filter(d => d.tag === t);
    const order = sup === 0 ? [cands.find(d => d.tag === 'NOUN') || cands[0]] : byT('ADJ').slice(0, 2).concat(byT('NOUN').slice(0, 2), byT('ADJ').slice(2), byT('NOUN').slice(2), byT('OTHER'));
    const ds = order.filter(Boolean).filter((d, i, a) => a.findIndex(x => x.v === d.v) === i).slice(0, k - 1);
    const obj = s => { const [a, nn] = s.split(' '); return { model: nn, opts: PAL[a] ? { c: PAL[a] } : {}, scale: a === 'stor' ? 1.5 : a === 'liten' ? 0.6 : 1, label: s }; };
    const choices = shuffle(r, [ph].concat(ds.map(d => d.v)));
    return { target: ph, word: ph, text: ph, choices, distractors: ds, say: null,
      params: { lyd, adj, noun, phrase: ph, colour: PAL[adj] || null, objs: choices.map(obj) } };
  }
  // L11 sentences: yes/no, riddle, command (F30 → yn, F31 → riddle, F28 → cmd)
  const type = o.sub || SENT_FMT[o.format] || (o.format === 'F28' ? 'cmd' : pick(r, ['yn', 'yn', 'riddle', 'cmd']));
  if (type === 'riddle') {
    const R = Wd.RIDDLES; const want = keyVal(o.key);
    const rd = R.find(x => x[0] === want) || pick(r, withM(R, 5, x => x.slice(1).every(hasM) ? x[1] : '\u0000'));
    // v5 (logic #14): a lure that also fits the riddle is never offered (F.WORDS.semOk + RIDDLE_ALSO); params.also lists the words a
    // format must keep out of its extra choices
    const okL = w => !Wd.semOk || Wd.semOk(rd[1], w, rd[0]);
    const ds = [{ v: rd[2], tag: 'OTHER' }, { v: rd[3], tag: 'OTHER' }].filter(d => okL(d.v)).slice(0, sup === 0 ? 1 : 2);
    const choices = shuffle(r, [rd[1]].concat(ds.map(d => d.v)));
    return { key: 'LES:' + rd[0], target: rd[1], word: rd[1], text: rd[0], choices, distractors: ds, say: null,
      params: { lyd, type, objs: choices.map(w => ({ model: w, opts: {}, label: w })), also: ((Wd.RIDDLE_ALSO || {})[rd[0]] || []).slice() } };
  }
  if (type === 'cmd') {
    const C = Wd.CMDS; const want = keyVal(o.key);
    const cm = C.find(x => x.t === want) || pick(r, withM(C, 5, x => x.w));
    const k = sup === 0 ? 2 : sup === 1 ? 3 : 4;
    const ds = lesDistractors(r, Wd.get(cm.w), k, sup === 2 ? 'near' : 'diff', {});
    const choices = shuffle(r, [cm.w].concat(ds.map(d => d.v)));
    return { key: 'LES:' + cm.t, target: cm.w, word: cm.w, text: cm.t, choices, distractors: ds, say: null,
      params: { lyd, type, who: cm.who, objs: choices.map(w => ({ model: w, opts: {}, label: w })) } };
  }
  // yes/no: a coloured object + «Ballen er rød.» (or a world fact)
  const want = keyVal(o.key);
  let sent, ans, model, opts = {};
  const fact = Wd.FACTS.find(x => x[0] === want) || (!want && r() < 0.35 ? pick(r, withM(Wd.FACTS, 5, x => x[2])) : null);
  if (fact) { sent = fact[0]; ans = fact[1]; model = fact[2]; }
  else {
    const y = Wd.YN.find(x => x.t === want) || pick(r, withM(Wd.YN.filter(x => colourOk(x.w)), 8, x => x.w).concat([]).length ? withM(Wd.YN.filter(x => colourOk(x.w)), 8, x => x.w) : Wd.YN);
    sent = y.t; model = y.w;
    const truth = r() < 0.5;
    const shownCol = truth ? y.c : pick(r, Object.keys(PAL).filter(c => c !== y.c));
    opts = { c: PAL[shownCol] }; ans = truth ? 'ja' : 'nei';
  }
  return { key: 'LES:' + sent, target: ans, word: ans, text: sent, choices: ['ja', 'nei'], distractors: [{ v: ans === 'ja' ? 'nei' : 'ja', tag: 'OTHER' }], say: null,
    params: { lyd, type: 'yn', objs: [{ model, opts, label: null }], answerBool: ans === 'ja' } };
};

const LETTERS = 'abcdefghijklmnoprstuvyæøå'.split('');
function distractorLetters(r, w, n, single) {
  const out = [];
  const add = c => { if (c && out.length < n && !out.includes(c)) out.push(c); };
  for (const ch of shuffle(r, w.split(''))) add(CONFUSE[ch] && !w.includes(CONFUSE[ch]) ? CONFUSE[ch] : null);
  if (!single && doublePos(w) < 0 && out.length < n) { const cons = w.split('').filter(c => !VOWELS.includes(c)); if (cons.length) add(pick(r, cons)); }   // a «double letter» trap
  let g = 0; while (out.length < n && g++ < 50) { const c = pick(r, LETTERS); if (!w.includes(c)) add(c); }
  return out;
}
GEN.SKRIV = function (rung, sup, o, r) {
  const Wd = W();
  if (rung === 1) {
    const pool = withM(Wd.list.filter(x => x.castable && x.w.length <= 5 && !/^(kj|skj|sj|hj|hv|gj|sk[iy])/.test(x.w) &&
      !(/^(g(ei|i|y)|k(ei|i|y))/.test(x.w) && !/^(gitar|kiwi)$/.test(x.w))), 10);   // soft g/k (geit = /jæit/): the first letter is not the first sound
    const t = pickWord(r, pool, o, 'SKRIV');
    const f = t.w[0]; const n = sup === 0 ? 1 : sup === 1 ? 2 : 3;
    const tl = distractorLetters(r, f, n, true).filter(c => c !== f);
    const ds = tl.map(c => ({ v: c, tag: 'FIRST-LETTER' }));
    return { key: 'SKRIV:' + t.w, target: f, word: f, full: t.w, tiles: shuffle(r, [f].concat(tl)), slots: 1, choices: shuffle(r, [f].concat(tl)),
      distractors: ds, say: { kind: 'word', w: t.w }, params: { model: t.w, firstSound: true } };
  }
  if (rung === 10 && o.format !== 'F37') {
    // letter swap MUS→HUS: castable pairs that differ in one letter
    const cands = withM(Wd.list.filter(x => x.castable && Wd.pairs(x.w).some(hasM)), 6);
    const want = keyVal(o.key);
    const to = (want && Wd.get(want) && Wd.pairs(want).length) ? Wd.get(want) : pick(r, cands);
    const from = pick(r, withM(Wd.pairs(to.w), 1, x => x));
    let pos = 0; for (; pos < to.w.length; pos++) if (to.w[pos] !== from[pos]) break;
    const letter = to.w[pos];
    const tl = distractorLetters(r, letter + from[pos], sup === 0 ? 1 : sup === 1 ? 2 : 3, true).filter(c => c !== letter);
    if (!tl.includes(from[pos]) && sup === 2) tl.push(from[pos]);
    return { key: 'SKRIV:' + to.w, target: letter, word: letter, full: to.w, tiles: shuffle(r, [letter].concat(tl)), slots: 1, choices: shuffle(r, [letter].concat(tl)),
      distractors: tl.map(c => ({ v: c, tag: c === from[pos] ? 'OTHER' : 'FIRST-LETTER' })), say: { kind: 'word', w: to.w },
      params: { from, to: to.w, pos, model: to.w, fromModel: from } };
  }
  if (rung === 11 || o.need || (rung === 10 && o.format === 'F37')) {     // F37 «Mias feil» at S10: a fix item (not a letter swap)
    const sub = o.need ? 'category' : (o.sub || ({ F37: 'fix', F39: 'category', F33: 'picture', F40: 'picture', F34: 'picture' }[o.format]) || pick(r, ['picture', 'category', 'fix']));
    if (sub === 'category') {
      const tags = Object.keys(Wd.TAGS).filter(tg => Wd.byTag(tg).length >= 3);
      const tg = o.need && Wd.TAGS[o.need] ? o.need : pick(r, tags);
      const acc = Wd.byTag(tg);
      const accM = withM(acc, 2);
      // suggested target: the easiest accepted word at or below her writing level
      const avoid = new Set(o.avoid || []);
      let easy = accM.filter(x => x.rung.SKRIV <= Math.max(2, Math.min(rung, 9))).sort((a, b) => a.rung.SKRIV - b.rung.SKRIV || a.pr - b.pr);
      const fresh = easy.filter(x => !avoid.has('SKRIV:' + x.w)); if (fresh.length) easy = fresh;      // not the same suggestion (lue, lue, lue…)
      const t = easy.length ? pick(r, easy.slice(0, 5)) : pick(r, accM);
      const kb = sup === 2 || rung === 11;
      return { key: 'SKRIV:' + t.w, target: t.w, word: t.w, accept: Wd.accept ? Wd.accept(tg) : acc.map(x => x.w), tiles: kb ? null : shuffle(r, t.w.split('').concat(sup === 1 ? distractorLetters(r, t.w, 2) : [])),
        slots: t.w.length, choices: null, distractors: misspell(t.w), say: null,
        params: { need: tg, tag: tg, needTag: tg, kind: o.need ? 'need' : undefined, cat: Wd.TAGS[tg].cat, keyboard: kb, ghost: sup === 0, model: t.w,
          // v5 (logic #7): every word that fits the category is right (tag ∪ matching cat ∪ curated extras – F.WORDS.accept)
          acceptAll: Wd.accept ? Wd.accept(tg) : acc.map(x => x.w) } };
    }
    const pool = withM(Wd.list.filter(x => x.castable && x.rung.SKRIV >= 3 && x.rung.SKRIV <= 9), 10);
    const t = pickWord(r, pool, o, 'SKRIV');
    if (sub === 'fix') {
      const ms = misspell(t.w);
      // Mia's error must be one a child makes: realistic tags first, never an impossible onset (fkip, ptue, kkae, lvøe …)
      const real = ms.filter(d => legalOnset(d.v)), prefT = { 'DOUBLE-CONS': 1, SILENT: 1, VOWEL: 1, 'CLUSTER-DROP': 1 };
      const best = real.filter(d => prefT[d.tag]).concat(real.filter(d => !prefT[d.tag]));
      const wrong = best.length ? pick(r, best.slice(0, 3)) : ms.length ? ms[0] : { v: t.w.slice(0, -1), tag: 'LENGTH' };
      return { key: 'SKRIV:' + t.w, target: t.w, word: t.w, tiles: null, slots: t.w.length, choices: null, distractors: ms, say: { kind: 'word', w: t.w },
        params: { type: 'fix', wrong: wrong.v, wrongTag: wrong.tag, keyboard: true, model: t.w } };
    }
    return { key: 'SKRIV:' + t.w, target: t.w, word: t.w, tiles: sup === 2 ? null : shuffle(r, t.w.split('').concat(sup === 1 ? distractorLetters(r, t.w, 2) : [])), slots: t.w.length,
      choices: null, distractors: misspell(t.w), say: null, params: { type: 'picture', noAudio: true, keyboard: sup === 2, ghost: false, model: t.w } };
  }
  let pool = skrivPool(rung, o); if (!pool.length) pool = skrivPool(Math.max(2, Math.min(9, rung)), {});
  const t = pickWord(r, pool, o, 'SKRIV');
  const tiles = sup === 2 ? null : shuffle(r, t.w.split('').concat(sup === 1 ? distractorLetters(r, t.w, 2) : []));
  // F40 (Sandskrift / navnelapp) otherwise turns 30 % of items into a random NAME (any length, any rung, a key outside the bank);
  // engine items stay the levelled word – a quest that wants a name passes params {kind:'name'} itself (merged after the bank)
  return { target: t.w, word: t.w, tiles, slots: t.w.length, choices: null, distractors: misspell(t.w), say: { kind: 'word', w: t.w },
    params: Object.assign({ keyboard: sup === 2, ghost: sup === 0 && !!o.isNew, model: t.castable ? t.w : null }, o.format === 'F40' ? { kind: 'word' } : {}) };
};

/* ---------------------------------------------------------------- contrast items (DESIGN §9.5 contrast trigger) */
const CONTRAST_STRANDS = { REVERSAL: ['T-NAVN', 'T-SKRIV', 'T-ORDEN', 'T-MENGDE'], DECADE: ['T-NAVN', 'T-SKRIV'], 'DIGIT-ONLY': ['T-NAVN', 'T-SKRIV'],
  'OFF-BY-ONE': ['T-NAVN', 'T-MENGDE', 'T-ORDEN'], 'COUNT-ONES': ['T-MENGDE'],
  'DOUBLE-CONS': ['SKRIV', 'LES'], SILENT: ['SKRIV', 'LES'], VOWEL: ['LES', 'SKRIV'], 'FIRST-LETTER': ['LES', 'SKRIV'], ORDER: ['SKRIV'], 'CLUSTER-DROP': ['SKRIV'] };
function contrastItem(strand, rung, sup, tag, o, r) {
  const Wd = W();
  if (/^T-/.test(strand)) {
    const n = (() => { const kv = keyVal(o.key); if (kv && /^\d+$/.test(kv) && +kv >= 12 && +kv <= 19) return +kv;
      const av = new Set(o.avoid || []); for (let i = 0; i < 8; i++) { const v = int(r, 12, 19); if (!av.has(strand + ':' + v)) return v; } return int(r, 12, 19); })();
    const pair = tag === 'REVERSAL' ? rev(n) : tag === 'DECADE' ? (n % 10) * 10 : tag === 'DIGIT-ONLY' ? n % 10 : tag === 'COUNT-ONES' ? n - 10 : n + 1;
    const p = { contrast: tag, pair: [n, pair], tens: 1, ones: n % 10 };
    if (strand === 'T-SKRIV') return { n, target: n, slots: 2, tiles: null, choices: null, distractors: [{ v: pair, tag }], structure: true, say: { kind: 'num', n }, params: Object.assign(p, { keypad: true, len: 2 }) };
    if (strand === 'T-ORDEN') { const ask = sup === 0 ? 'more' : pick(r, ['more', 'less']); const ans = ask === 'more' ? Math.max(n, pair) : Math.min(n, pair); return { n, target: ans, choices: r() < 0.5 ? [n, pair] : [pair, n], distractors: [{ v: ans === n ? pair : n, tag }], structure: true, params: Object.assign(p, { a: n, b: pair, ask, contrastAfterError: true }) }; }
    if (strand === 'T-MENGDE') return { n, target: n, choices: [n, pair], distractors: [{ v: pair, tag }], structure: true, params: Object.assign(p, { tens: 1, ones: n % 10 }) };
    return { n, target: n, choices: r() < 0.5 ? [n, pair] : [pair, n], distractors: [{ v: pair, tag }], structure: true, say: { kind: 'num', n }, params: p };
  }
  // words: pick a target with the feature
  const feature = { 'DOUBLE-CONS': x => doublePos(x.w) >= 0, SILENT: x => silentPos(x.w).length > 0, VOWEL: x => Wd.pairs(x.w).some(p => tagWord(x.w, p) === 'VOWEL'),
    'FIRST-LETTER': x => Wd.pairs(x.w).some(p => p[0] !== x.w[0]), ORDER: x => x.w.length >= 4, 'CLUSTER-DROP': x => /[^aeiouyæøå]{2}/.test(x.w) }[tag] || (() => true);
  let pool = Wd.list.filter(x => x.castable && feature(x) && x.rung[strand] <= Math.max(rung, 6));
  const av = new Set(o.avoid || []); const fresh = pool.filter(x => !av.has(strand + ':' + x.w)); if (fresh.length) pool = fresh;
  const t = pick(r, pool.length ? pool : Wd.list.filter(x => x.castable));
  if (strand === 'LES') {
    const ds = (Wd.pairs(t.w).length ? Wd.pairs(t.w) : []).slice(0, 1).map(v => ({ v, tag: tagWord(t.w, v) }));
    if (!ds.length) ds.push(...lesDistractors(r, t, 2, 'near', o));
    return { target: t.w, word: t.w, text: t.w, choices: shuffle(r, [t.w].concat(ds.map(d => d.v))), distractors: ds, say: null, params: { lyd: 'on', contrast: tag, model: t.w } };
  }
  const ms = misspell(t.w); const m = ms.find(d => d.tag === tag) || ms[0];
  return { target: t.w, word: t.w, tiles: shuffle(r, t.w.split('')), slots: t.w.length, choices: null, distractors: ms, say: { kind: 'word', w: t.w },
    params: { contrast: tag, pair: [t.w, m ? m.v : null], ghost: false, model: t.w } };
}

/* ---------------------------------------------------------------- v3 §13.1 anti-guessing: more options */
// Chip items get ≥4 options at sup 1 (3 where the rung's own base is 2), 5 at sup 2, and up to 6 under the engine's guess guard
// (o.nChoices). The rung's misconception distractors stay; the extra ones are the next misconception candidates / near numbers
// (numbers) or near words with a model (LES). Not widened: sup 0, contrast pairs, own-shape formats (rhyme, swap, sentences,
// Ja/Nei, ordering, compare-two), phrase/sentence items with object lists, number-word choices.
const WIDE_SKIP = { F18: 1, F20: 1, F21: 1, F22: 1, F28: 1, F29: 1, F30: 1, F31: 1, F32: 1, F38: 1, F39: 1, F41: 1 };
function widen(it, strand, rung, sup, o, r) {
  if (!Array.isArray(it.choices) || Array.isArray(it.target) || it.choices.length < 2 || (sup < 1 && !o.nChoices)) return;
  if (WIDE_SKIP[o.format] || o.kind === 'contrast') return;
  const p = it.params || {};
  if (p.objs || p.ask || p.choiceKind || p.type || p.from || p.rhyme || p.noWiden || it.mode === 'scene') return;
  const cur = it.choices.length;
  let want = sup >= 2 ? Math.max(cur, 5) : sup === 1 ? Math.max(cur, cur <= 2 ? 3 : 4) : cur;
  if (o.nChoices) want = Math.max(want, Math.min(6, o.nChoices));
  if (want <= cur) return;
  const used = new Set(it.choices.map(v => String(v).toLowerCase())), add = [];
  const take = d => { if (!d || add.length >= want - cur) return; const k = String(d.v).toLowerCase(); if (used.has(k)) return; used.add(k); add.push(d); };
  if (typeof it.target === 'number') {
    const t = it.target;
    const lo = t < 10 ? 0 : t <= 20 ? 10 : Math.max(0, t - 6), hi = t < 10 ? 9 : t <= 20 ? 20 : t + 6;
    numCands(t).filter(d => d.v >= lo && d.v <= hi).forEach(take);
    let g = 0; while (add.length < want - cur && g++ < 200) { const v = int(r, lo, hi); if (v !== t) take({ v, tag: tagNum(t, v) || 'OTHER' }); }
  } else if (strand === 'LES' && typeof it.target === 'string' && W().get(it.target)) {
    lesDistractors(r, W().get(it.target), want + 3, sup >= 2 ? 'near' : rung >= 4 ? 'firstsame1' : 'firstdiff', o).forEach(take);
  } else return;
  if (!add.length) return;
  it.distractors = (it.distractors || []).concat(add);
  it.choices = shuffle(r, it.choices.concat(add.map(d => d.v)));
  // the reading formats size their choice set by params.n (RW.nChoices in f_read.js) – a bridge until they read item.nChoices
  if (strand === 'LES' && (!o.format || LES_N[o.format])) p.n = it.choices.length;
  it.params = p;
}
const LES_N = { F23: 1, F24: 1, F25: 1, F27: 1 };

/* ---------------------------------------------------------------- public */
function fits(strand, rung, key) {
  const kv = keyVal(key); if (kv == null) return false;
  if (!GEN[strand]) {        // strands of the generator registry (REGN, LIKHET, PROBLEM, … – ladders.js / banks_regn.js)
    if (F.BANKS && typeof F.BANKS.regFits === 'function') { const v = F.BANKS.regFits(strand, rung, key); if (v != null) return v; }
    return !!(F.BANKS_REGN && F.BANKS_REGN.fits(strand, rung, key));
  }
  if (/^T-/.test(strand) && rung > OLD[strand]) {
    if (!/^\d+$/.test(kv)) return false;
    const rr = NUMRANGE2[strand] && NUMRANGE2[strand][rung]; if (!rr) return false;
    return +kv >= rr[0] && +kv <= rr[1];
  }
  if (/^T-/.test(strand)) {
    if (!/^\d+$/.test(kv)) return false;
    const v = +kv, rr = NUMRANGE[strand] && NUMRANGE[strand][rung - 1];
    if (!rr) return false;
    if ((strand === 'T-NAVN' && (rung === 5 || rung === 8)) || (strand === 'T-SKRIV' && rung === 5)) return (v >= 13 && v <= 19) || (v >= 30 && v <= 90 && v % 10 === 0);
    if (strand === 'T-MENGDE' && rung === 10) return v >= 11 && v <= 18;
    return v >= rr[0] && v <= rr[1];
  }
  const e = W().get(kv); if (!e) return false;
  if (strand === 'LES') { if (rung >= 10) return false; if (rung === 3) return e.castable && W().pairs(e.w).length > 0 && e.w.length <= 4; return e.rung.LES === rung || (rung === 2 && e.rung.LES === 1 && e.w.length === 3); }
  if (rung === 1 || rung === 10 || rung === 11) return e.castable;
  return e.rung.SKRIV === rung;
}

// DESIGN4 §2.9 contract fields for every item (the old rungs too): g, mode, think, secret
const NOSECRET_T = { 'T-MENGDE': 1, 'T-ORDEN': 1 };       // the numeral is the given stimulus there (hint_leaks C1)
// g / mode: the v4 rungs (and the registry strands) carry explicit values from their generators. The v1–v3 rungs do NOT get a bank
// g / mode: their formats present the same item very differently (F22 Ja/Nei, F18 tap-all stones, F09 pick-up …) and set g / mode
// themselves (f_num K.meta, f_read RW.meta, the kit widgets); in Node the engine derives them from the format spec (F.LADDERS.gOf,
// fmtG) – a bank guess here made F22 look like a production format (learn_trial guess-guard gate).  Chip/scene values on the v4
// rungs are tied to one presentation, so they are marked _gAuto/_modeAuto (stage.js / kit.js may refine them).
function contract(it, strand, rung) {
  const old = OLD[strand] && rung <= OLD[strand] && GEN[strand];
  if (!old && (it.mode === 'chips' || it.mode === 'scene')) { it._gAuto = true; it._modeAuto = true; }
  if (!it.think) it.think = thinkOf(strand, rung);
  if (!Array.isArray(it.secret)) {
    // spoken targets are masked in the subtitle (C1 scope = stage.js AUTO_SECRET): T-NAVN / T-SKRIV numbers, SKRIV dictation words.
    // LES targets are never spoken, so nothing to mask (a LES secret would also hide Puff's paid read-aloud after 4 s)
    const sec = [];
    if (strand === 'T-NAVN' && it.say && it.say.kind === 'num') sec.push(String(it.n), numWord(it.n));
    else if (strand === 'T-NAVN' && rung === 8) sec.push(String(it.target));
    else if (strand === 'T-NAVN' && rung === 7) sec.push(String(it.n));            // N7: the word is read, the numeral is the answer
    else if (strand === 'T-SKRIV' && it.say && it.say.kind === 'num') { if (typeof it.target === 'string' && !/^\d+$/.test(it.target)) sec.push(it.target); else sec.push(String(it.n), numWord(it.n)); }
    else if (strand === 'SKRIV' && typeof it.target === 'string' && it.target.length > 1) sec.push(it.target);
    else if (strand === 'SKRIV' && it.full) sec.push(it.full);
    it.secret = NOSECRET_T[strand] ? [] : sec.filter(Boolean);
  }
  if (it.twin === undefined) it.twin = null;
  if (!old && !it.gBy && it.mode) { it.gBy = { [it.mode]: it.g }; if (Array.isArray(it.choices) && it.choices.length && !Array.isArray(it.target)) it.gBy.chips = 1 / it.choices.length; if (!it.gBy.keypad) it.gBy.keypad = 0.01; }
  return it;
}

F.BANKS = {
  MAX, OLD, NUMRANGE, NUMRANGE2, tagNum, tagWord, rev, misspell, numWord, fits, lev, colourOk, family, fewest,
  contrastTags: strand => GEN[strand] ? Object.keys(CONTRAST_STRANDS).filter(t => CONTRAST_STRANDS[t].includes(strand))
    : ((F.BANKS_REGN && F.BANKS_REGN.CONTRAST_TAGS && F.BANKS_REGN.CONTRAST_TAGS[strand]) || []).slice(),
  gen(strand, rung, sup, o) {
    o = Object.assign({}, o || {}); o.strand = strand;
    const r = o.rng || Math.random;
    sup = Math.max(0, Math.min(2, sup == null ? 1 : sup | 0));
    if (!GEN[strand]) {
      // strands of the generator registry (DESIGN4 §2.10): REGN/LIKHET/PROBLEM (banks_regn.js), MØNSTER/LOGIKK/… (gen_reason.js …)
      const L = F.LADDERS && F.LADDERS[strand];
      const mx = (L && L.max) || (F.BANKS_REGN && F.BANKS_REGN.MAX[strand]) || 1;
      rung = Math.max(1, Math.min(mx, rung | 0 || 1));
      let it = null;
      if (F.BANKS && typeof F.BANKS.regGen === 'function') it = F.BANKS.regGen(strand, rung, sup, r, o);
      if (!it && F.BANKS_REGN && F.BANKS_REGN.MAX[strand]) it = F.BANKS_REGN.gen(strand, rung, sup, r, o);
      if (!it) return null;
      it.strand = strand; it.rung = rung; it.sup = sup;
      if (it.key == null) it.key = strand + ':' + (Array.isArray(it.target) ? it.target.join(',') : it.target);
      if (it.answer === undefined) it.answer = it.target;
      ['word', 'text', 'choices', 'tiles', 'slots', 'say'].forEach(k => { if (it[k] === undefined) it[k] = null; });
      if (it.distractors === undefined) it.distractors = [];
      if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
      if (it.structure === undefined) it.structure = sup === 0;
      it.params = it.params || {};
      return contract(it, strand, rung);
    }
    rung = Math.max(1, Math.min(MAX[strand] || 1, rung | 0));
    let it;
    // formats with their own item shape (rhyme pair, letter-swap source, sentences, ordering types) keep it: the contrast is
    // then carried by params.contrast only (the stage plays the targeted hint)
    const ownShape = { F29: 1, F32: 1, F28: 1, F30: 1, F31: 1, F18: 1, F20: 1, F21: 1, F22: 1, F38: 1, F39: 1, F41: 1 };
    // a contrast PAIR item only where its shape (choose / type / compare a number, read / write a word) is what the rung's
    // formats expect; elsewhere (W1 ones digit, N7/N8 number words, M4/M7–M10 build/pick/split, O1–3/O7–8 order, every v4 rung)
    // the rung's own item carries params.contrast (v4 N10–N12/W8 pick a target with that confusion)
    const pairOk = { 'T-NAVN': x => x <= 6 || x === 9, 'T-SKRIV': x => x >= 3 && x <= 5, 'T-ORDEN': x => x >= 4 && x <= 6,
      'T-MENGDE': x => x <= 3 || x === 5 || x === 6, LES: x => x <= 9, SKRIV: x => x >= 2 && x <= 9 }[strand];
    if (o.kind === 'contrast' && o.tag && !ownShape[o.format] && pairOk && pairOk(rung)) it = contrastItem(strand, rung, sup, o.tag, o, r);
    else it = GEN[strand](rung, sup, o, r);
    // v4 rungs: a forced target that is not the focal number (M13 ones, M14 split, O10 …) – regenerate until the answer matches
    if (rung > (OLD[strand] || 99) && o.target != null && !o.key && !Array.isArray(it.target) && String(it.target) !== String(o.target)) {
      for (let i = 0; i < 400; i++) { const x = GEN[strand](rung, sup, o, r); if (String(x.target) === String(o.target)) { it = x; break; } }
    }
    it.strand = strand; it.rung = rung; it.sup = sup;
    if (it.key == null) it.key = strand + ':' + (/^T-/.test(strand) ? it.n : it.target);
    if (it.answer === undefined) it.answer = it.target;
    if (it.word === undefined) it.word = /^T-/.test(strand) ? null : it.target;
    if (it.text === undefined) it.text = null;
    if (it.choices === undefined) it.choices = null;
    if (it.tiles === undefined) it.tiles = null;
    if (it.slots === undefined) it.slots = null;
    if (it.structure === undefined) it.structure = false;
    if (it.distractors === undefined) it.distractors = [];
    if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
    if (it.say === undefined) it.say = null;
    it.params = it.params || {};
    if (o.kind === 'contrast' && o.tag) it.params.contrast = o.tag;
    const nc = Array.isArray(it.choices) ? it.choices.length : 0;
    try { widen(it, strand, rung, sup, o, r); } catch (e) { /* keep the rung's own choices */ }
    if (Array.isArray(it.choices)) {
      it.nChoices = it.choices.length;
      if (it.choices.length !== nc && it.mode === 'chips') it.g = 1 / it.choices.length;
    }
    return contract(it, strand, rung);
  },
};
})();
