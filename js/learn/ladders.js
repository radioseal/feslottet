/* Feslottet – F.LADDERS: the strand/rung registry (DESIGN4 §2.1, SYNTHESIS §2) + the generator registry F.BANKS.reg (DESIGN4 §2.10).
   Owner: WP-E.  Pure JS (no THREE/DOM) – runs in the browser and in Node.  Best loaded FIRST in js/learn (build_html), but any order
   works: generators that load earlier queue on F.REGQ (drained here), and the engine reads F.LADDERS lazily (without this file it runs
   today's 6 strands).  Verified 2026-10-10 with the alphabetical order banks, banks_regn, engine, gen_reason, ladders.

   F.LADDERS = { <strandId>: { domain: 'TALL'|'PROBLEM'|'FORM'|'SPRÅK'|'VERDEN', name, think: [types], max: <phase-1 top rung>,
                 locked?: true, start: <placement start rung>, retire?: true (T-NAVN/T-SKRIV: review-only after their tops; the
                 engine lets ANY strand rest at 2 % while its open top rung is passed and the next rung waits for a gate / formats),
                 rungs: { <n>: { band:'A'|'B'|'C'|'★', code:'Std'|'Gold'|'Flu'|'2T'|'Set'|'★', prereq:['STRAND:rung', …]|null,
                                 think:'REGNE'|…, can:'…', pre?: true (the 10–20 foundation rungs of v1–v3),
                                 teach?: true (v5: a teach-before-test deck – VIT V1–V2, ORD Or-T/Or-U: never a placement or test-out
                                 target; its generator answers only for keys she was taught) } } } }
   (rungs also lists the later-phase rungs of SYNTHESIS §2 with ph ≥ 2 – iterate a strand with F.LADDERS.list(strand), not rungs)
   Only the enumerable keys of F.LADDERS are strand ids (Object.keys(F.LADDERS) = the 19 strands).
   v5 (WP-E2): VIT V1–V2 unlocked (max 2) and ORD Or-T / Or-U as rungs 8 / 9 (list('ORD') = [1, 8, 9]) – WP-A's gen_vit.js patch folded
   in; gen_vit.js may still patch (same values), so either load order works.  Helpers are non-enumerable:
     F.LADDERS.list(strand)        ordered rung numbers of the strand (FORM Phase 1 = [1, 4, 5, 6] – rungs need not be contiguous)
     F.LADDERS.rung(strand, n)     the rung record or null          F.LADDERS.domainOf(strand)
     F.LADDERS.THINK               the 12 thinking types (SYNTHESIS §3.2)        F.LADDERS.DOMAINS  domain → strand ids
     F.LADDERS.MIX                 domain/strand targets by stage (SYNTHESIS §4.1)  F.LADDERS.MODES  answer modes + default g
     F.LADDERS.gOf(item, spec)     the guess probability of an item (item.g → spec.g → mode/choices → 0.2)
     F.LADDERS.credit(g)           credit per A (SYNTHESIS §2.1: 1.0 / 0.75 / 0.5 / 0.25 / 0)

   GENERATOR REGISTRY (DESIGN4 §2.10) – lives on F.BANKS and survives banks.js re-assigning F.BANKS:
     F.BANKS.reg(strandId, fn, opts?)   fn(rung, sup, rng, o) -> item | null      (o = {kind, key, format, tag, avoid, conf, sub, nChoices,
                                        think, mode, …}; return null when that rung/format cannot be served → the engine tries others)
        opts (optional): { rungs:[…] served rungs, fits(rung, key) -> bool (Leitner key fits a rung), facts(rung) -> [keys] (Set mastery) }
        Several fns may register for one strand (e.g. WP-B1 + a format WP) – they are tried in registration order.
     F.BANKS.regGen(strand, rung, sup, rng, o) -> item | null        F.BANKS.hasReg(strand[, rung])      F.BANKS.regs  (read-only view)
     F.BANKS.regFits(strand, rung, key) -> true|false|null          F.BANKS.regFacts(strand, rung) -> [keys] | null
     F.BANKS.regReady(strand, rung) -> true|false|null  (v5: opts.ready(rung) of teach-before-test generators – false = nothing due)
   ITEM CONTRACT (DESIGN4 §2.9; today's fields stay: strand, rung, sup, target/answer, choices, distractors [{v, tag}], params, key):
     g       guess probability of the answer mode (chips 1/k, order 1/n!, subset 1/(2^n−1), line tol/len, two-step product, production 0.01)
     mode    'chips'|'keypad'|'tiles'|'build'|'order'|'subset'|'line'|'scene'|'grid'|'balance'|'ribbon'|'twostep'
     think   thinking type (F.LADDERS.THINK)      secret  [strings the subtitle must mask]      twin  production twin format id (optional)
     distractors[i].tag   misconception tag (SYNTHESIS §5.L)      key  Leitner key 'STRAND:…' (stable per fact/item family)
   The engine fills g/mode/think when a generator leaves them out (F.LADDERS.gOf, spec.mode, the rung's think). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

const THINK = ['REGNE', 'MODELL', 'MØNSTER', 'ROM', 'MÅLE', 'DEDUKSJON', 'ALGORITME', 'KLASSIFISERE', 'AVKODE', 'FORSTÅ', 'STAVE', 'HUSKE'];
// answer modes → default g (n = number of options / items; see gOf)
const MODES = {
  chips: { g: n => 1 / Math.max(1, n || 3) }, keypad: { g: () => 0.01 }, tiles: { g: () => 0.01 }, build: { g: () => 0.01 },
  order: { g: n => { let f = 1; for (let i = 2; i <= (n || 3); i++) f *= i; return 1 / f; } },
  subset: { g: n => 1 / (Math.pow(2, n || 4) - 1) }, line: { g: () => 0.1 }, scene: { g: n => 1 / Math.max(1, n || 8) },
  grid: { g: () => 0.01 }, balance: { g: () => 0.01 }, ribbon: { g: () => 0.01 }, twostep: { g: () => 0.05 },
};
const PRODUCTION_MODES = ['keypad', 'tiles', 'build', 'grid', 'balance', 'ribbon'];

// r(band, code, think, can, prereq)
const r = (band, code, think, can, prereq, extra) => Object.assign({ band, code, prereq: prereq || null, think, can }, extra || {});
const pre = (think, can) => r('A', 'Std', think, can, null, { pre: true });

const L = {};
/* ---------------------------------------------------------------- TALL */
L['T-NAVN'] = { domain: 'TALL', name: 'Tallnavn', think: ['HUSKE', 'AVKODE'], max: 12, start: 3, retire: true, rungs: {
  1: pre('HUSKE', '10–12, 2 choices far apart'), 2: pre('HUSKE', '10–15, 3 choices far apart'), 3: pre('HUSKE', '10–20, 3 choices'),
  4: pre('HUSKE', '10–20 with ±1 neighbours'), 5: pre('HUSKE', 'teen vs -ty (13/30)'), 6: pre('HUSKE', 'teen / -ty / reversal (15 50 51 5)'),
  7: pre('AVKODE', 'read a number word → numeral'), 8: pre('AVKODE', 'number-word contrast tretten/tretti'), 9: pre('HUSKE', 'fluency: moving targets'),
  10: r('A', 'Std', 'HUSKE', 'Hear 20–50 and find it on the hundred board (1 of 50) or the lift'),
  11: r('A', 'Std', 'HUSKE', 'Hear 0–100 with the whole contrast family present (68/86/18)'),
  12: r('A', 'Std', 'AVKODE', 'Read a written number word 20–100 and give the numeral'),
} };
L['T-MENGDE'] = { domain: 'TALL', name: 'Mengde og plassverdi', think: ['REGNE', 'MÅLE'], max: 15, start: 3, rungs: {
  1: pre('REGNE', 'count 10–12 structured'), 2: pre('REGNE', 'count 10–15 structured'), 3: pre('REGNE', 'count 10–20 structured'),
  4: pre('REGNE', 'build N from a ten-rod + ones'), 5: pre('REGNE', 'count unstructured 10–15'), 6: pre('REGNE', 'count unstructured 10–20'),
  7: pre('REGNE', 'count out N into the ten-tray'), 8: pre('REGNE', '17 er 10 og …'), 9: pre('MÅLE', 'pay N with tens + ones'),
  10: pre('REGNE', 'crossing ten n+m ≤ 20, missing addend, change from 20'),
  11: r('A', 'Std', 'REGNE', 'Count bundled sets 20–100 without counting ones'),
  12: r('A', 'Gold', 'REGNE', 'Build any 2-digit number (rods and ones, or 10-kr and 1-kr)', null, { gold2: true }),
  13: r('A', 'Std', 'REGNE', 'Tens and ones, both directions'),
  14: r('A', 'Std', 'REGNE', 'Rename non-standard groupings (4 tiere og 13 enere)'),
  15: r('A', 'Std', 'MÅLE', 'Count coins and notes ≤ 100 kr; pay with the fewest'),
} };
L['T-SKRIV'] = { domain: 'TALL', name: 'Skrive tall', think: ['STAVE'], max: 9, start: 3, retire: true, rungs: {
  1: pre('STAVE', 'ones digit after a given 1'), 2: pre('STAVE', 'two digit tiles in order'), 3: pre('STAVE', 'type 10–15'),
  4: pre('STAVE', 'type 10–20'), 5: pre('STAVE', 'type with teen/-ty contrast'), 6: pre('STAVE', 'build a number word with letter tiles'),
  7: pre('STAVE', 'type the number word'),
  8: r('A', 'Std', 'STAVE', 'Write dictated 2-digit numbers (3-slot keypad)'),
  9: r('A', 'Std', 'STAVE', 'Write the numeral shown by another representation'),
} };
L['T-ORDEN'] = { domain: 'TALL', name: 'Tallinje og rekkefølge', think: ['MØNSTER', 'REGNE', 'ROM'], max: 14, start: 3, rungs: {
  1: pre('MØNSTER', 'next after N'), 2: pre('MØNSTER', 'before/after 10–20'), 3: pre('MØNSTER', 'between (missing in 4)'),
  4: pre('REGNE', 'more/less, far apart'), 5: pre('REGNE', 'compare close numerals'), 6: pre('REGNE', 'compare reversal contrasts'),
  7: pre('MØNSTER', 'order 3 numbers'), 8: pre('MØNSTER', 'order 5 / count backwards'),
  9: r('A', 'Std', 'ROM', 'Place a number on a 0–20 line with only the ends marked (±1)'),
  10: r('A', 'Std', 'REGNE', 'Neighbours and between, up to 100 across tens'),
  11: r('A', 'Std', 'ROM', 'Moves of ±1 and ±10 on the hundred board'),
  12: r('A', 'Std', 'REGNE', 'Compare and order 2-digit numbers'),
  13: r('A', 'Std', 'ROM', '0–100 line with tens marked (±3); midpoints'),
  14: r('A', 'Std', 'ROM', 'Ordinals 1.–10., from the front and from the back'),
} };
L.REGN = { domain: 'TALL', name: 'Regnestrategier', think: ['REGNE', 'HUSKE'], max: 12, start: 1, rungs: {   // v5r fix1: 11–12 open (below)
  1: r('A', 'Flu', 'REGNE', 'Bonds to 10 (tiervenner): find the part under the cloth'),
  2: r('A', 'Std', 'REGNE', 'Every split of 5–10, as a systematic list'),
  3: r('A', 'Flu', 'REGNE', 'Doubles and halves to 20; near doubles'),
  4: r('A', '2T', 'REGNE', 'Bridge through ten: show the split, then the sum'),
  5: r('A', '2T', 'REGNE', 'Subtract within 20 by strategy (2T at s1, Flu at s2)', null, { fluS2: true }),
  6: r('A', 'Std', 'REGNE', 'Fact families; the unknown in any position'),
  7: r('A', 'Std', 'REGNE', '3–4 addends in a smart order'),
  8: r('A', 'Set', 'HUSKE', 'All 121 + and − facts within 20 (Leitner per fact)', null, { flu: true, setFrac: 0.9 }),
  9: r('A', 'Flu', 'REGNE', '2-digit ± 1-digit without crossing; ± whole tens'),
  10: r('B', 'Std', 'REGNE', '2-digit ± 1-digit across a ten'),
} };
L.LIKHET = { domain: 'TALL', name: 'Likhetstegnet', think: ['DEDUKSJON', 'REGNE'], max: 3, start: 1, rungs: {
  1: r('A', 'Std', 'DEDUKSJON', 'Level a balance with objects'),
  2: r('A', '2T', 'REGNE', 'Tap every false equation in a bundle of 4, then fix one'),
  3: r('A', 'Std', 'REGNE', 'Missing number on either side of = (9 + 5 = ? + 6)'),
} };
/* ---------------------------------------------------------------- PROBLEM og LOGIKK */
L.PROBLEM = { domain: 'PROBLEM', name: 'Tekstoppgaver', think: ['MODELL'], max: 5, start: 1, rungs: {
  1: r('A', '2T', 'MODELL', 'Join/separate, result unknown; equation tiles, then answer'),
  2: r('A', 'Std', 'MODELL', 'Part-whole with a part unknown'),
  3: r('A', 'Std', 'MODELL', 'Change unknown'),
  4: r('A', '2T', 'MODELL', 'Compare, difference unknown (bars + ?)'),
  5: r('A', '2T', 'MODELL', 'Start unknown', ['REGN:6']),
} };
L['MØNSTER'] = { domain: 'PROBLEM', name: 'Mønster og froskesteiner', think: ['MØNSTER'], max: 5, start: 1, rungs: {
  1: r('A', 'Std', 'MØNSTER', 'Extend AB / AAB / ABC by building the next 3'),
  2: r('A', 'Std', 'MØNSTER', 'Unit, error, abstraction'),
  3: r('A', 'Std', 'MØNSTER', 'Missing stones with steps ±1, ±2, ±10 (tap every gap)'),
  4: r('A', 'Std', 'MØNSTER', 'Skip-count by 2/5/10 from any start; find the wrong stone'),
  5: r('A', 'Std', 'MØNSTER', 'Build the next term of a growing voxel pattern'),
} };
L.LOGIKK = { domain: 'PROBLEM', name: 'Logikk', think: ['DEDUKSJON', 'KLASSIFISERE'], max: 3, start: 1, rungs: {
  1: r('A', '2T', 'DEDUKSJON', 'Odd one out + reason card; elimination riddles over 8+ candidates'),
  2: r('A', 'Std', 'DEDUKSJON', '4×4 picture sudoku, 1 → 6 empty cells'),
  3: r('A', 'Std', 'DEDUKSJON', 'Order 3, then 4, by clues'),
} };
L.KODE = { domain: 'PROBLEM', name: 'Programmer feen', think: ['ALGORITME'], max: 0, start: 1, locked: true, rungs: {} };
/* ---------------------------------------------------------------- FORM og MÅL */
L.FORM = { domain: 'FORM', name: 'Former og rom', think: ['ROM', 'KLASSIFISERE'], max: 6, start: 1, rungs: {
  1: r('A', 'Std', 'ROM', '2D shapes including atypical ones (tap all)'),
  4: r('A', 'Std', 'ROM', 'Build from position words; find the wrong word'),
  5: r('A', 'Std', 'ROM', 'Count the cubes; the view can be rotated'),
  6: r('A', 'Std', 'ROM', 'Copy a structure of up to 10 cubes by tapping cells'),
} };
L.DATA = { domain: 'FORM', name: 'Sortering og data', think: ['KLASSIFISERE'], max: 1, start: 1, rungs: {
  1: r('A', '2T', 'KLASSIFISERE', 'Sort by one property, then find a second valid way'),
} };
L['MÅL'] = { domain: 'FORM', name: 'Måling', think: ['MÅLE'], max: 0, start: 1, locked: true, rungs: {} };
L.TID = { domain: 'FORM', name: 'Klokke og kalender', think: ['MÅLE'], max: 0, start: 1, locked: true, rungs: {} };
/* ---------------------------------------------------------------- SPRÅK */
L.LES = { domain: 'SPRÅK', name: 'Lese', think: ['AVKODE', 'FORSTÅ'], max: 11, start: 3, rungs: {
  1: pre('AVKODE', '3-letter, 2 very different pictures'), 2: pre('AVKODE', '3-letter, 3 choices'), 3: pre('AVKODE', 'minimal pairs'),
  4: pre('AVKODE', '4-letter regular'), 5: pre('AVKODE', 'consonant clusters'), 6: pre('AVKODE', 'double consonant'),
  7: pre('AVKODE', 'diphthong and ng'), 8: pre('AVKODE', 'kj/skj/sj/hj, silent letters'), 9: pre('AVKODE', '5–6 letters mixed'),
  10: pre('FORSTÅ', 'two-word phrases to act on'), 11: pre('FORSTÅ', 'short sentences: commands, yes/no, riddles'),
} };
L.SKRIV = { domain: 'SPRÅK', name: 'Skrive', think: ['STAVE'], max: 11, start: 3, rungs: {
  1: pre('STAVE', 'first letter from sound'), 2: pre('STAVE', '3-letter regular'), 3: pre('STAVE', '4-letter regular'),
  4: pre('STAVE', 'consonant clusters'), 5: pre('STAVE', 'double consonants'), 6: pre('STAVE', '5–6-letter two-syllable'),
  7: pre('STAVE', 'diphthong / ng'), 8: pre('STAVE', 'kj/skj/sj/hj / silent letters'), 9: pre('STAVE', '6-letter mixed'),
  10: pre('STAVE', 'letter swap'), 11: pre('STAVE', 'fix a misspelling / category words'),
} };
// v5 (WP-L request): LF3 and LF4 swapped – the story cards (listening only) no longer wait behind the LES:9 reading gate of the read
// + evidence rung (a perfect listener stood at LF2 for 194 of 200 tasks). f_lesf.js reads each rung's kind from these records.
L['LES-F'] = { domain: 'SPRÅK', name: 'Forstå', think: ['FORSTÅ'], max: 4, start: 1, rungs: {
  1: r('A', 'Std', 'FORSTÅ', '2-sentence spoken micro-story; tap who/what/where among 8+'),
  2: r('A', 'Std', 'FORSTÅ', 'Carry out instructions with negation or quantifiers'),
  3: r('A', 'Std', 'FORSTÅ', 'Order 3–4 story cards (1 distractor card)'),
  4: r('A', '2T', 'FORSTÅ', 'Retrieve from 2–3 read sentences, plus the evidence word', ['LES:9']),
} };
// v5 (DESIGN4 §10, DESIGN5 §2.3 – folded in from WP-A's gen_vit.js patch): Or-T tier-2 words and Or-U expressions are rungs 8 and 9 –
// after the Phase-2 rungs 2–7 (ph 2, not in play), so list('ORD') = [1, 8, 9]. Both are TEACH-BEFORE-TEST decks («Set»: Gold when
// ≥ 85 % of the taught keys are in Leitner box ≥ 3): their generator (gen_vit.js) returns an item only for a key that was taught ≥ 3
// times and first on an earlier day; nothing due → null (the engine rests the strand a few tasks). The encounter's V slot asks a due
// key directly (force, kind 'review'), whatever her ORD rung is.
L.ORD = { domain: 'SPRÅK', name: 'Ord og begreper', think: ['KLASSIFISERE', 'FORSTÅ'], max: 9, start: 1, rungs: {
  1: r('A', 'Std', 'KLASSIFISERE', 'Superordinate categories: tap all that belong, or the odd one out'),
  8: r('A', 'Set', 'FORSTÅ', 'Or-T: tier-2 words acted out by animals (nysgjerrig, sta, flittig …) – asked only after ≥ 3 exposures', null, { tag: 'Or-T', teach: true }),
  9: r('A', 'Set', 'FORSTÅ', 'Or-U: expressions (stille som en mus, sta som et esel …) – asked only after ≥ 3 exposures', null, { tag: 'Or-U', teach: true }),
} };
/* ---------------------------------------------------------------- VERDEN */
// v5 (DESIGN4 §9, DESIGN5 §2.3; WP-A gen_vit.js + F82 Faktakortet): VIT V1–V2 unlocked – active only where gen_vit.js registers its
// generator and F82 serves it (without them the strand stays inactive, as before). Teach-before-test like Or-T/Or-U (≥ 2 exposures,
// first on an earlier day; ≤ 3 new facts a day; Gold after correct recall on 3 different days – kept by gen_vit.js / F.VIT).
L.VIT = { domain: 'VERDEN', name: 'Verden', think: ['HUSKE'], max: 2, start: 1, rungs: {
  1: r('A', 'Set', 'HUSKE', 'Animal names and their babies (taught on the album / befriend card first)', null, { teach: true }),
  2: r('A', 'Set', 'HUSKE', 'Diet and home (taught first; 3–6 food models)', null, { teach: true }),
} };

/* ---------------------------------------------------------------- later phases (SYNTHESIS §2.2–§2.6; NOT in play: list() stops at max)
   Declared so the parent page / later waves see the whole ladder; ph = build phase (§6). A later wave raises `max` (and unlocks a strand)
   when its formats exist – the engine also needs a registered format + generator per rung. ★ rungs sit beside the path (never block). */
function later(s, ph, rows) {
  for (const n in rows) { const x = rows[n]; L[s].rungs[n] = r(x[0], x[1], x[2], x[3], x[4] || null, { ph }); }
}
later('T-NAVN', 3, { 13: ['B', 'Std', 'HUSKE', 'Hear 3-digit numbers with zeros; 4-slot keypad'], 14: ['C', 'Std', 'HUSKE', 'Hear or read 4-digit numbers with inner zeros'] });
later('T-MENGDE', 3, { 16: ['B', 'Std', 'REGNE', 'Hundred-plates: build and read 3-digit numbers'], 17: ['B', 'Std', 'REGNE', '3-digit renaming and exchange'],
  18: ['C', 'Std', 'REGNE', '4-digit place value'], 19: ['★', '★', 'DEDUKSJON', 'Digit riddles, systematic counting', ['T-MENGDE:16']] });
later('T-SKRIV', 3, { 10: ['B', 'Std', 'STAVE', 'Write 3-digit dictation with zeros (4 slots)'], 11: ['C', 'Std', 'STAVE', 'Write 4-digit dictation'] });
later('T-ORDEN', 3, { 15: ['B', 'Std', 'KLASSIFISERE', 'Odd and even'], 16: ['B', 'Std', 'REGNE', 'Compare and order 3-digit numbers; digit cards'],
  17: ['B', 'Std', 'REGNE', '1, 10 or 100 more or less across boundaries'], 18: ['B', 'Std', 'ROM', 'Number line 0–1000 (±50)', ['T-MENGDE:16']],
  19: ['C', 'Std', 'REGNE', 'Round to 10 or 100; estimate sums'], 20: ['★', '★', 'DEDUKSJON', 'Between and queue puzzles', ['T-ORDEN:14']] });
later('REGN', 3, { 11: ['B', 'Std', 'REGNE', '2-digit ± 2-digit with regrouping', ['REGN:8', 'T-MENGDE:14']], 12: ['B', 'Flu', 'REGNE', 'Complements to 100'],
  13: ['B', '2T', 'REGNE', 'Compensation (+29 = +30 − 1)'], 14: ['B', 'Std', 'REGNE', '3-digit ± with regrouping, across zeros'],
  15: ['B', 'Std', 'MODELL', 'Equal groups, arrays, «ganger så mange»'], 16: ['B', 'Set', 'HUSKE', 'Tables of 2, 5 and 10'],
  17: ['B', 'Set', 'HUSKE', 'Tables of 3 and 4; division as sharing and grouping'], 18: ['B', 'Std', 'MODELL', 'Fractions as fair shares'],
  19: ['C', 'Set', 'HUSKE', 'Tables of 6–9 through derived facts', ['REGN:11', 'REGN:16', 'REGN:17']], 20: ['C', 'Std', 'REGNE', 'Division with remainder'],
  21: ['C', 'Std', 'MODELL', 'Like fractions; equivalent fractions by folding'], 22: ['C', 'Std', 'REGNE', '2–3-digit × 1-digit; 4-digit ±'],
  23: ['★', '★', 'DEDUKSJON', 'Smart sums and missing digits', ['REGN:11']] });
later('LIKHET', 3, { 4: ['B', 'Std', 'REGNE', 'Compare expressions with < = > without computing', ['LIKHET:3', 'REGN:6']], 5: ['B', 'Std', 'DEDUKSJON', 'A shape stands for the unknown'],
  6: ['B', 'Std', 'DEDUKSJON', 'Substitution across two equations or balances'], 7: ['B', 'Std', 'REGNE', 'Number walls, upward and downward'],
  8: ['C', 'Std', 'REGNE', 'Equivalence by compensation'], 9: ['★', '★', 'DEDUKSJON', 'Systems of symbols and balances', ['LIKHET:6']] });
later('PROBLEM', 3, { 6: ['B', '2T', 'MODELL', "Compare with misleading wording ('flere' that means subtract)", ['PROBLEM:5', 'REGN:9']],
  7: ['B', '2T', 'MODELL', 'Irrelevant information; choosing the operation'], 8: ['B', '2T', 'MODELL', 'Two steps (a bar with 2 unknowns)'],
  9: ['B', 'Std', 'MODELL', 'Multiplication and division stories'], 10: ['B', '2T', 'MODELL', 'Equalising (internal transfer)'],
  11: ['C', '2T', 'MODELL', 'Sum and difference'], 12: ['C', '2T', 'MODELL', "'Times as many' with unit bars", ['REGN:15']],
  13: ['C', '2T', 'MODELL', 'Before–after with units; fractions of a set'], 14: ['★', '★', 'DEDUKSJON', 'Constant difference, mistake problems', ['PROBLEM:11']] });
later('MØNSTER', 3, { 6: ['B', 'Std', 'MØNSTER', 'Predict a position; count one kind', ['MØNSTER:4', 'T-ORDEN:13']], 7: ['B', 'Std', 'MØNSTER', 'Two attributes; rotation rules'],
  8: ['B', 'Std', 'MØNSTER', 'Sequences whose step changes'], 9: ['B', 'Std', 'MØNSTER', 'Frogs forward and back; will it land on N?'],
  10: ['B', 'Std', 'MØNSTER', 'Two frogs: common landings, untouched stones'], 11: ['C', 'Std', 'MØNSTER', 'Generalise a growing pattern (n-th term)'],
  12: ['C', 'Std', 'MØNSTER', 'Periods: weekday cycles and long patterns'], 13: ['★', '★', 'DEDUKSJON', 'Counting patterns and simulations', ['MØNSTER:8']] });
later('LOGIKK', 3, { 4: ['B', 'Std', 'DEDUKSJON', '3×3 logic grid with negative clues; seating', ['LOGIKK:3']], 5: ['B', 'Std', 'DEDUKSJON', 'Sudoku down to 4 givens; KenKen-lite'],
  6: ['B', 'Std', 'DEDUKSJON', 'Code chest (Mastermind)'], 7: ['B', '2T', 'DEDUKSJON', 'Systematic lists'], 8: ['B', 'Std', 'DEDUKSJON', 'Truth/lie and seating logic'],
  9: ['C', 'Std', 'DEDUKSJON', 'Magic triangle and square'], 10: ['C', '2T', 'DEDUKSJON', 'Guess and check with a table'],
  11: ['C', 'Std', 'DEDUKSJON', 'Work backwards; pigeonhole'], 12: ['★', '★', 'DEDUKSJON', 'Mixed olympiad items', ['LOGIKK:10']] });
later('KODE', 2, { 1: ['A', 'Std', 'ALGORITME', '2–4 absolute arrow cards to the star'], 2: ['A', 'Std', 'ALGORITME', 'Predict where a program ends'],
  3: ['A', '2T', 'ALGORITME', 'Debug: tap the wrong card and replace it'], 4: ['B', 'Std', 'ALGORITME', 'Relative turns', ['KODE:3']],
  5: ['B', 'Std', 'ALGORITME', 'gjenta (repeat): the shortest program'], 6: ['C', 'Std', 'ALGORITME', 'hvis (if) cards'],
  7: ['C', 'Std', 'ALGORITME', 'Coordinates; planning with several objects', ['FORM:6']], 8: ['★', '★', 'ALGORITME', 'Optimisation and bug hunts', ['KODE:7']] });
later('FORM', 2, { 2: ['A', 'Std', 'ROM', 'Compose and decompose shapes; tangram'], 3: ['A', 'Std', 'ROM', '3D solids and their properties'],
  7: ['B', 'Std', 'ROM', 'Mirror image; stamps', ['FORM:5']], 8: ['B', 'Std', 'ROM', 'One fixed view; infer the hidden cubes'],
  9: ['B', 'Std', 'ROM', 'Paint the top/front/side view; match a view'], 10: ['B', 'Std', 'ROM', 'Count every shape in a figure'],
  11: ['C', '2T', 'ROM', 'Build from views; fewest and most cubes', ['FORM:9']], 12: ['C', 'Std', 'ROM', 'Fold and punch; cube nets; dice'],
  13: ['C', 'Std', 'ROM', 'Right angles; parallel and perpendicular'], 14: ['C', 'Std', 'MÅLE', 'Area and perimeter'], 15: ['★', '★', 'ROM', 'Spatial challenge', ['FORM:11']] });
later('MÅL', 2, { 1: ['A', 'Std', 'MÅLE', 'Compare and order directly'], 2: ['A', '2T', 'MÅLE', 'Non-standard units, and why counts differ'],
  3: ['A', 'Std', 'DEDUKSJON', 'Indirect comparison; transitive order'], 4: ['B', 'Std', 'MÅLE', 'Read a ruler in cm', ['MÅL:3', 'T-ORDEN:13']],
  5: ['B', 'Std', 'MÅLE', 'Mass: balance reasoning, reading a kg dial'], 6: ['B', 'Std', 'MÅLE', 'Capacity'], 7: ['B', 'Std', 'MÅLE', 'Choose sensible units'],
  8: ['B', 'Std', 'MÅLE', 'm and cm (105-not-15)', ['T-MENGDE:16']], 9: ['C', 'Std', 'MÅLE', 'Conversions km/m/cm, kg/g, l/ml'],
  10: ['C', '2T', 'MÅLE', 'Intervals and units'], 11: ['★', '★', 'DEDUKSJON', 'Measurement puzzles', ['MÅL:10']] });
later('TID', 2, { 1: ['A', 'Std', 'MÅLE', 'Weekdays in order; i går, i morgen'], 2: ['A', 'Std', 'MÅLE', 'Set and read whole hours'], 3: ['A', 'Std', 'MÅLE', 'Months and seasons'],
  4: ['B', 'Std', 'MÅLE', "Half hours, including the 'halv' trap", ['TID:2', 'T-ORDEN:13']], 5: ['B', 'Std', 'MÅLE', 'Kvart over / kvart på'],
  6: ['B', 'Std', 'MÅLE', '5-minute steps'], 7: ['B', 'Std', 'MÅLE', 'One hour or half an hour later or earlier'], 8: ['B', 'Std', 'MÅLE', 'Calendar forward and back'],
  9: ['C', 'Std', 'MÅLE', 'Time to the minute; elapsed time'], 10: ['C', 'Std', 'MÅLE', 'Calendar arithmetic; tricky clocks'] });
later('DATA', 2, { 2: ['A', 'Std', 'KLASSIFISERE', "2×2 table with 'ikke'"], 3: ['A', 'Std', 'KLASSIFISERE', 'Read a 1:1 picture graph'],
  4: ['A', 'Std', 'KLASSIFISERE', 'Tally a jumbled scene, then build the graph'], 5: ['B', 'Std', 'DEDUKSJON', 'Hidden rule: the bridge', ['DATA:3', 'REGN:9']],
  6: ['B', 'Std', 'KLASSIFISERE', 'Picture graphs with a scale'], 7: ['B', 'Std', 'KLASSIFISERE', 'What-if questions about a graph'],
  8: ['C', 'Std', 'KLASSIFISERE', 'Bar graphs with a scale of 5; chance words'], 9: ['★', '★', 'DEDUKSJON', 'Hidden rules with numbers; Venn', ['DATA:5']] });
later('LES', 2, { 12: ['A', 'Std', 'AVKODE', 'Read 3–4-syllable words by syllable'], 13: ['A', 'Std', 'AVKODE', 'Compounds, with the parts as lures'],
  14: ['A', 'Std', 'FORSTÅ', 'Irregular high-frequency words in phrases'], 15: ['B', 'Std', 'AVKODE', 'Endings decide which scene fits'],
  16: ['B', 'Std', 'AVKODE', 'Made-up names and lookalikes'], 17: ['B', 'Std', 'FORSTÅ', 'Sentence → 1 of 4 pictures'], 18: ['C', 'Std', 'AVKODE', 'Complex graphemes; word-chain boundaries'] });
later('SKRIV', 2, { 12: ['A', 'Std', 'STAVE', 'Tap where the spaces go in a glued sentence'], 13: ['A', 'Std', 'STAVE', 'Build a sentence from tiles to match a scene'],
  14: ['B', 'Std', 'STAVE', 'Capitals, and . ? ! from the intonation'], 15: ['B', 'Std', 'STAVE', 'Double consonants; no mm at the end'],
  16: ['B', 'Std', 'STAVE', 'Silent letters and hv/kj/skj/gj/hj in a sentence'], 17: ['B', 'Std', 'STAVE', 'Plural and definite endings'],
  18: ['C', 'Std', 'STAVE', 'Compounds; shelving by 1st, then 2nd letter'], 19: ['C', 'Std', 'STAVE', 'Dictation of a 5–7-word sentence'] });
later('LES-F', 2, { 5: ['B', '2T', 'FORSTÅ', 'Infer a feeling, cause, season or place, with evidence', ['LES:11']], 6: ['B', 'Std', 'FORSTÅ', 'Pronouns'],
  7: ['B', 'Std', 'FORSTÅ', 'Work out a made-up word from context'], 8: ['B', 'Std', 'FORSTÅ', 'Tap the sentence that does not make sense'],
  9: ['B', 'Std', 'FORSTÅ', 'Maze cloze'], 10: ['C', 'Std', 'FORSTÅ', 'før/etter vs order of mention'], 11: ['C', 'Std', 'FORSTÅ', 'Conditional multi-step written orders'],
  12: ['C', '2T', 'FORSTÅ', 'Combine two fact cards; fact versus opinion'], 13: ['★', '★', 'FORSTÅ', 'Inference across 3 sentences, plus evidence', ['LES-F:12']] });
later('ORD', 2, { 2: ['A', 'Std', 'KLASSIFISERE', 'Opposites with the wand'], 3: ['A', 'Std', 'KLASSIFISERE', 'Make a compound from 2 of 6 parts'],
  4: ['B', 'Std', 'FORSTÅ', 'Synonyms in a sentence'], 5: ['B', 'Std', 'KLASSIFISERE', 'Words with two meanings'], 6: ['B', 'Std', 'DEDUKSJON', 'Analogies with associative lures'],
  7: ['C', 'Std', 'KLASSIFISERE', 'Morphology'] });
later('VIT', 2, { 3: ['A', 'Std', 'KLASSIFISERE', 'Sort by a feature'],
  4: ['A', 'Std', 'FORSTÅ', '3-stage life cycle; 2–3-link food chain'], 5: ['B', 'Set', 'HUSKE', 'Body and senses'], 6: ['B', 'Std', 'KLASSIFISERE', 'Two attributes with negation'],
  7: ['B', 'Std', 'HUSKE', 'Winter strategies; real or fairy tale; seasons'], 8: ['C', '2T', 'DEDUKSJON', 'Category beats appearance'],
  9: ['C', 'Std', 'DEDUKSJON', 'Food-web consequences; map and compass'], 10: ['★', '★', 'DEDUKSJON', 'Build a classification key', ['VIT:8']] });

// v5r fix1 (review #6/#7 «no cap at 100 / end of grade 1»): the first Phase-2 band whose surface exists is in play – REGN 11 (2-digit ±
// 2-digit with regrouping) and REGN 12 (complements to 100), both on F47's keypad gates (banks_regn.js R[11]/R[12]). Further bands
// open the same way: a generator + a format that serves the rung, then drop ph here and raise max.
for (const n of [11, 12]) delete L.REGN.rungs[n].ph;
// v5r2: 2-digit sums are worked, not recalled – the engine's «slow A → B» limit follows F47's own (plan.fluMs 12 s) on these rungs, and
// R12's Flu goal (Gold) is a median of 8 s, not the 3 s of the facts within 20 (else Gold on R12 was out of reach)
Object.assign(L.REGN.rungs[11], { slowMs: 12000 }); Object.assign(L.REGN.rungs[12], { slowMs: 12000, fluMs: 8000 });

/* ---------------------------------------------------------------- mix targets (SYNTHESIS §4.1; percent; T-* split by today's W0) */
const MIX = {
  0: { 'SPRÅK': { LES: 13, SKRIV: 13, 'LES-F': 9, ORD: 5 }, TALL: { 'T-*': 18, REGN: 11, LIKHET: 3 },
    PROBLEM: { PROBLEM: 3, 'MØNSTER': 5, LOGIKK: 3, KODE: 2 }, FORM: { FORM: 4, TID: 3, 'MÅL': 1.5, DATA: 1.5 }, VERDEN: { VIT: 5 } },
  A: { 'SPRÅK': { LES: 9, SKRIV: 11, 'LES-F': 11, ORD: 5 }, TALL: { 'T-*': 7, REGN: 15, LIKHET: 4 },
    PROBLEM: { PROBLEM: 6, 'MØNSTER': 4, LOGIKK: 4, KODE: 3 }, FORM: { FORM: 5, TID: 3, 'MÅL': 3, DATA: 3 }, VERDEN: { VIT: 7 } },
  B: { 'SPRÅK': { LES: 5, SKRIV: 10, 'LES-F': 12, ORD: 5 }, TALL: { 'T-*': 3, REGN: 16, LIKHET: 5 },
    PROBLEM: { PROBLEM: 9, 'MØNSTER': 4, LOGIKK: 5, KODE: 3 }, FORM: { FORM: 6, TID: 3, 'MÅL': 3, DATA: 3 }, VERDEN: { VIT: 8 } },
  C: { 'SPRÅK': { LES: 2, SKRIV: 10, 'LES-F': 13, ORD: 5 }, TALL: { 'T-*': 1, REGN: 17, LIKHET: 4 },
    PROBLEM: { PROBLEM: 11, 'MØNSTER': 3, LOGIKK: 7, KODE: 3 }, FORM: { FORM: 7, 'MÅL': 4, TID: 3, DATA: 2 }, VERDEN: { VIT: 8 } },
  // the four T-* strands share 'T-*' in today's W0 proportions (14/14/12/10)
  T: { 'T-NAVN': 14, 'T-MENGDE': 14, 'T-SKRIV': 12, 'T-ORDEN': 10 },
  // «Matte-andel» (parent slider): setNumWeight(30|50|70) → math share (TALL + PROBLEM + FORM) 40 / 55 / 70 %; VERDEN is fixed
  matte: { 30: 40, 50: 55, 70: 70 },
};
const DOMAINS = {};
for (const s of Object.keys(L)) (DOMAINS[L[s].domain] = DOMAINS[L[s].domain] || []).push(s);

const listCache = {};
function list(s) {
  const l = L[s]; if (!l) return [];
  return listCache[s] || (listCache[s] = Object.keys(l.rungs).map(Number).filter(n => n <= l.max && !(l.rungs[n].ph > 1)).sort((a, b) => a - b));
}
function gOf(item, spec) {
  if (item && typeof item.g === 'number') return item.g;
  if (spec) {
    if (typeof spec.g === 'number') return spec.g;
    if (typeof spec.g === 'function') { try { const v = spec.g(item); if (typeof v === 'number') return v; } catch (e) { /* fall through */ } }
  }
  const mode = (item && item.mode) || (spec && spec.mode);
  const n = item ? (Array.isArray(item.choices) ? item.choices.length : Array.isArray(item.target) ? item.target.length : 0) : 0;
  if (mode && MODES[mode]) return MODES[mode].g(n || undefined);
  if (item && Array.isArray(item.target) && Array.isArray(item.choices)) return MODES.order.g(item.target.length);
  if (item && Array.isArray(item.choices) && item.choices.length) return 1 / item.choices.length;
  if (item && (item.tiles || item.slots || (item.params && (item.params.keypad || item.params.build || item.params.keyboard)))) return 0.01;
  return 0.2;
}
const credit = g => g <= 0.05 ? 1 : g <= 0.15 ? 0.75 : g <= 0.34 ? 0.5 : g <= 0.5 ? 0.25 : 0;
const def = (k, v) => Object.defineProperty(L, k, { value: v, enumerable: false, configurable: true, writable: true });
def('list', list);
def('rung', (s, n) => (L[s] && L[s].rungs[n]) || null);
def('domainOf', s => (L[s] && L[s].domain) || null);
def('THINK', THINK); def('MODES', MODES); def('PRODUCTION_MODES', PRODUCTION_MODES); def('DOMAINS', DOMAINS); def('MIX', MIX);
def('gOf', gOf); def('credit', credit);
def('phase', 1);
F.LADDERS = L;

/* ---------------------------------------------------------------- generator registry on F.BANKS (DESIGN4 §2.10) */
const REG = F.__genReg = F.__genReg || { fns: {}, opts: {} };
function reg(strand, fn, opts) {
  if (typeof strand !== 'string' || typeof fn !== 'function') return false;
  (REG.fns[strand] = REG.fns[strand] || []).push(fn);
  (REG.opts[strand] = REG.opts[strand] || []).push(opts || fn.opts || {});
  return true;
}
function hasReg(strand, rung) {
  const fs = REG.fns[strand]; if (!fs || !fs.length) return false;
  if (rung == null) return true;
  return REG.opts[strand].some(o => !o || !Array.isArray(o.rungs) || o.rungs.includes(rung));
}
function regGen(strand, rung, sup, rng, o) {
  const fs = REG.fns[strand] || [];
  for (let i = 0; i < fs.length; i++) {
    const op = REG.opts[strand][i] || {};
    if (Array.isArray(op.rungs) && !op.rungs.includes(rung)) continue;
    let it = null;
    try { it = fs[i](rung, sup, rng || Math.random, o || {}); } catch (e) { if (typeof console !== 'undefined') console.error('BANKS.reg', strand, rung, e); it = null; }
    if (it) return it;
  }
  return null;
}
function regFits(strand, rung, key) {
  const ops = REG.opts[strand] || [];
  for (const op of ops) if (op && typeof op.fits === 'function') { try { if (op.fits(rung, key)) return true; } catch (e) { /* ignore */ } }
  return ops.some(op => op && typeof op.fits === 'function') ? false : null;
}
// v5 (WP-A request): opts.ready(rung) – a teach-before-test generator (gen_vit.js: VIT, ORD Or-T / Or-U) says whether anything taught is
// due. regReady → false only when EVERY generator serving the rung has ready() and none is ready (the engine then skips the strand:
// no try, no fallback, no share debt); true when one can generate; null when nobody serves the rung
function regReady(strand, rung) {
  const fs = REG.fns[strand] || []; let any = false;
  for (let i = 0; i < fs.length; i++) {
    const op = REG.opts[strand][i] || {};
    if (rung != null && Array.isArray(op.rungs) && !op.rungs.includes(rung)) continue;
    any = true;
    if (typeof op.ready !== 'function') return true;
    try { if (op.ready(rung)) return true; } catch (e) { return true; }
  }
  return any ? false : null;
}
function regFacts(strand, rung) {
  for (const op of REG.opts[strand] || []) if (op && typeof op.facts === 'function') { try { const f = op.facts(rung); if (Array.isArray(f) && f.length) return f; } catch (e) { /* ignore */ } }
  return null;
}
function attach(b) {
  if (!b || typeof b !== 'object') return b;
  if (b.reg !== reg) { b.reg = reg; b.regGen = regGen; b.hasReg = hasReg; b.regFits = regFits; b.regFacts = regFacts; b.regReady = regReady; b.regs = REG.fns; }
  return b;
}
// F.BANKS may be (re)assigned later by banks.js (`F.BANKS = {…}`): an accessor keeps the registry attached to whatever object it is
let cur = attach(F.BANKS || {});
try {
  const d = Object.getOwnPropertyDescriptor(F, 'BANKS');
  if (!d || d.configurable !== false) Object.defineProperty(F, 'BANKS', { configurable: true, enumerable: true, get() { return cur; }, set(v) { cur = attach(v); } });
  else F.BANKS = cur;
} catch (e) { F.BANKS = cur; }
// a file that loaded before this one may have queued registrations: (F.REGQ = F.REGQ || []).push([strand, fn, opts])
if (Array.isArray(F.REGQ)) { F.REGQ.forEach(a => reg(a[0], a[1], a[2])); F.REGQ.length = 0; }
F.REGQ = { push: a => reg(a[0], a[1], a[2]) };
})();
