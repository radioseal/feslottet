/* Feslottet – F.LEARN: the adaptive learning engine (DESIGN §9.1, §9.3–9.5; v4: DESIGN4 §2, SYNTHESIS §2.1, §4, §5.2, §8).  Owner: WP-E.
   Pure JS (no THREE/DOM): runs in the browser and in Node (tests/learn_sim.js).  State lives in F.save.learn (§11.5).

   v4 (Phase 1 «Tenk først + Tall til 100 + første smak av alt»):
     • STRANDS/W0/MAX come from the registry F.LADDERS (js/learn/ladders.js; 19 strands, 5 domains) – read lazily, so the load order of
       ladders.js does not matter; without it the engine runs today's 6 strands (legacy tables below).
     • A strand (and each rung) is ACTIVE only when a generator can make it (F.BANKS.gen for the 6 old strands up to F.BANKS.MAX, else the
       registry F.BANKS.reg) AND ≥1 registered format serves it (F.Task.defs; Node: the FMT table) – the build order can never offer a
       missing format. Rungs are walked along the ladder list (FORM Phase 1 = G1, G4, G5, G6), up to the first rung that is not available
       or whose gate (prereq at Gold, SYNTHESIS §2.7) is closed: the strand then waits and its weight flows to open strands.
     • Mix (SYNTHESIS §4.1): domain targets by stage (0/A/B/C), strand shares renormalised over active strands, floor 3 % per active strand
       after intro, intro dose 5 %, retired strands 2 %, learning-debt multipliers INSIDE a domain, a share controller that keeps realised
       domain shares on target, «Matte-andel» setNumWeight(30|50|70) → 40/55/70 % for TALL + PROBLEM + FORM (VERDEN fixed).
     • Sequencing (§4.2): no same domain twice in a row when ≥3 domains can serve (soft with 2), never the same strand 3× or thinking
       type 3× in a row, ≥5 thinking types per 10 (missing types are boosted) incl. number / language / {ROM MØNSTER DEDUKSJON MÅLE},
       ≤2 of the same answer mode in a row, ≤1 long format (F50 F55 F56 F63 F77 / spec.long) in any 4, ≤2 brand-new rungs a session
       for a learner who is not clearly strong (acc20 < .85; strong learners test out instead).
     • Item kinds (§4.4): current rung 55 %, spaced review 20 % (Leitner days 1/3/7/21/60/120), interleaved 10 % (Øvebank, «øv igjen»,
       a passed rung of the strand), next-rung preview at s0 10 % (only while acc20 ≥ .8; else today's routine safe item), ★ 5 % (none yet).
     • Mastery codes (§2.1, §5.2 C): rung-up needs credit ≥ 3.0 over the last 4 on-level s2 items, credit per A by g (1 / .75 / .5 / .25 / 0)
       + the TWIN (≥1 A at the rung with g ≤ .05) wherever a production format serves the rung (else today's 3-of-4 rule); a chip A that
       the next production item at the rung does not confirm turns into B; Flu = median RT of the rung's last 5 A ≤ TH.fluMs (valve after
       TH.fluWaitN slow passes: pass, Gold waits for fluency); Set = ≥ setFrac of the rung's facts (registry opts.facts) in Leitner box ≥ 3
       before Gold; Gold = mastered (5 of the last 6 at s2 across ≥2 formats) + the delayed check passed on a later day; gates need Gold.
     • Outcomes: 'R' rapid guess (no evidence, no coins, guess guard; 2 R in a strand → 8 production-only items), 'H' solved after
       «Hjelp meg» (= B for the engine, 1 coin; 3 helps in a row on one rung → bridge item). res.usedHelp with 'A' counts as H.
     • Test-out (§8): every new strand starts with an unscored intro item and a placement probe; the fast track arms a «hopp over»: 3 golden
       items at rung+2 (production formats preferred), all first try → jump (jumped rungs provisional + spaced checks); a miss is free.
       F.LEARN.testOut(strand) arms it on request.
     • Wheel-spinning guard (§4.6): 12 on-level items at a rung across ≥2 sessions without passing → a contrast/bridge block from her dominant
       error tag, else the strand is parked for 3 days (weight ×0.15); flagged in summary().strands[s].spin. Struggle valve: 2 collapses in
       7 days → weight ×0.5 for 3 days. Lifecycle: T-NAVN / T-SKRIV retire to review (2 %) once their top rung is Gold.
     • Item contract (DESIGN4 §2.9): next() fills item.g / mode / think / secret when the generator did not; coins follow g (a chip A with
       g > 0.2 pays one less, min 1).

   API (unchanged; v4 additions marked +)
     F.LEARN.load(learnObj?)            bind to a save object (mutated in place; default F.save.learn) and migrate/initialise it
     F.LEARN.next({formats, strands, place, npcRole, npc, rng, now, avoid, last, force, need, portable, trial, prefer, levelFill, nChoices})
         -> Item | null   (v3, DESIGN3 §3: trial {atLevel, stretch, allowWarmup, preferFormats}, prefer ['LES:rose' …], levelFill, nChoices ≥)
         formats   format ids available here (default: every registered format). A free NPC offer (npcRole/npc/portable, no
                   strands/need) always also gets the portable formats (F.LEARN.portables(): DESIGN's F06 F23 F33 F35 + one number chain
                   per number strand + every spec with portable:true + v4: every format of a NEW strand whose places include 'any');
                   its own formats are preferred ×3. A scripted call (strands/need given) gets portables only for strands its own formats
                   cannot serve at her level.  serves() honours a spec's explicit rung list (spec.rungs).
         strands   restrict to these strands      avoid  formats this NPC used in its last 3 tasks      last  the previous format
         force     {strand, rung, sup, key|target, format, kind, exact}  (debug / scripted quest steps)
         need      SKRIV need tag ('varme'…) → multi-answer item (item.accept)
       next() has NO side effects on the learning state (safe to call for previews); all state changes happen in report() – v5: except
       the idempotent «grow» migration (a child standing on a passed best rung after her ladder grew moves to the next open rung).
         + v5 (DESIGN5 §5): said      lines / words / 'STRAND:word' keys just spoken or shown (C6) – never the LES/SKRIV target, never a
                                       preferred key; forwarded to F.BANKS.gen and the registry generators as o.said
                           theme     the animal of an encounter: a species id ('ekorn') or an object (F.LEARN.themeOf(id) shows the
                                     shape) – the generators count / pattern / sort with its world and mark item.themed (place 'dyr'
                                     without theme: the species of F.Befriend.current() is used)
                           avoidThink [thinking types] / avoidDomains [domains] the trial already has (soft ×0.05 / ×0.1)
                           preferStrands [strand ids] (soft ×3, e.g. the animal family's lead strands)   avoidKeys [Leitner keys]
     F.LEARN.peek(opts) -> {strand, format, kind, rung, sup} | null
     F.LEARN.report(item, result) -> {coins, bonus, events:[{type, strand, rung, …}], outcome}
         result = {outcome:'A'|'B'|'C'|'R'|'H', tries, ms, chosen:[…], tags:[…], usedAudio, usedHint, usedHelp, fastWrong, rapid}
           v5: + wrongFast (fast taps on WRONG values – only these feed the guess guard; a right early / rapid tap never does),
               rtFirst (s, gate → first answer: Flu), facts [{q, a, ms, first}] (F47: one Leitner entry per fact), medianMs, dist (F44)
         Event types: rungUp rungDown supUp supDown mastered gold floorAdded placed challenge contrast provFail reviewFail spin
     F.LEARN.summary()  F.LEARN.debt()  F.LEARN.floors()  F.LEARN.newSession(now)  F.LEARN.setNumWeight(30|50|70)  F.LEARN.replace()
     + F.LEARN.active() -> [strand ids that can be offered now]   + F.LEARN.targets() -> {strand: share}   + F.LEARN.testOut(strand)
     + F.LEARN.ladder(strand) -> [rungs open to her]               + F.LEARN.STRANDS / MAX / W0 are live views of the registry */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

/* ---------------------------------------------------------------- legacy tables (no F.LADDERS) */
const LEG_STRANDS = ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN', 'LES', 'SKRIV'];
const OLD = { 'T-NAVN': 1, 'T-MENGDE': 1, 'T-SKRIV': 1, 'T-ORDEN': 1, LES: 1, SKRIV: 1 };   // served by F.BANKS.gen
const NUMS = { 'T-NAVN': 1, 'T-MENGDE': 1, 'T-SKRIV': 1, 'T-ORDEN': 1 };
const LEG_W0 = { 'T-NAVN': 14, 'T-MENGDE': 14, 'T-SKRIV': 12, 'T-ORDEN': 10, LES: 25, SKRIV: 25 };
const LEG_MAX = { 'T-NAVN': 9, 'T-MENGDE': 10, 'T-SKRIV': 7, 'T-ORDEN': 8, LES: 11, SKRIV: 11 };
const LEG_THINK = { 'T-NAVN': 'HUSKE', 'T-MENGDE': 'REGNE', 'T-SKRIV': 'STAVE', 'T-ORDEN': 'MØNSTER', LES: 'AVKODE', SKRIV: 'STAVE' };
const LEG_MIX = { 'SPRÅK': { LES: 25, SKRIV: 25 }, TALL: { 'T-*': 50 } };
const MATH_DOMS = ['TALL', 'PROBLEM', 'FORM'];
const DOMS = ['TALL', 'PROBLEM', 'FORM', 'SPRÅK', 'VERDEN'];
// tunable thresholds (DESIGN §9.4 says: tune only the "3 of 4" rung-up and "2 of 4" support-down thresholds)
const TH = {
  supUpRun: 2,              // rule 1: 2 A in a row → sup++
  rungUpA: 3, rungUpWin: 4, // rule 2: at s2, 3 A in the last 4 at this rung → rung++  (v4: credit ≥ rungUpCredit over the window)
  rungUpCredit: 3.0,        // v4 SYNTHESIS §2.1: credit per A by g; production items = today's 3 of the last 4
  rungUpS2: true,           //   … counting only the items she did AT s2 (full difficulty) – keeps the equilibrium at 75–85% A
  supDownN: 1, supDownWin: 4, // rule 4: DESIGN default «2 non-A in the last 4» → sup--; TUNED to 1 (any miss since the last change)
  rungDownWin: 3,           // rule 5: at s0, 2 non-A in the last 3 → rung--  (v5r fix1 review #4: was «any non-A» – see dropKeep)
  rungDownN: 2,             //   v5r fix1: a single miss among two A no longer throws the rung away (weak learners see-sawed 3↔4)
  supDownWeakN: 2, supDownWeakAcc: 0.7,   // v5r fix1: a learner with acc20 < .7 steps support down on the DESIGN default 2 misses of 4
  keepPassAcc: 0.75, keepWin: 8,          // v5r fix1: a rung she PASSED (at s2) with ≥ 75 % A over its last 8 is kept – a bridge instead
                                          //   (v5r2: her s2 record at the rung, st.m2 – ≤ 6 kept, ≥ 4 needed; once a session per rung)
  collapseWin: 6, collapseRate: 0.5, collapseDrop: 2, famSwitchN: 5,
  fastRun: 3, fastMs: 8000, fastMult: 1.2,   // v3 (edu audit): 4 → 3
  masteryWin: 6, masteryA: 5,
  wallRun: 2, wallDrop: 2,
  placementN: 4, placementStart: 3, placementUp: 2, placementDown: 1,
  placementUp2: 1, placementCap: { LES: 8, SKRIV: 8, 'T-NAVN': 7, 'T-MENGDE': 7, 'T-SKRIV': 7, 'T-ORDEN': 7 },
  probationN: 5,            // after placement: the next 5 on-level items refine it – a miss drops one rung at once
  warmupN: 1, provSpacing: 5, warmupMax: 2,   // v3: session warm-up 2 → 1 item per strand at rung−1
  warmupSkipAcc: 0.65,        // v3: no warm-up at all for a strand whose acc20 ≥ 0.85 (v5 parent rule «not redoing what she knows»: 0.65)
  strongAcc: 0.85,            // v5: a strand she does well in (acc20 ≥ .85) gets no lower-rung Leitner review of keys she never missed,
                              //     no interleaved passed-rung item, no routine easier item after one miss, no safety item after one C
  youngP: 0.4,                // v5: … and 40 % of the due lower-rung Leitner reviews of keys she never missed (spaced consolidation)
  spinAcc: 0.75,              // v5: the wheel-spinning guard counts only while she gets < 75 % of the rung's items right (else she climbs)
  safeAcc: 0.8,               // v3: routine 'safe' rung−1 items only while acc20 < 0.8
  supStartAcc: 0.9,           // v3: after a rung-up with acc20 ≥ 0.85 the new rung starts at sup 2 (v5: 0.9 – a new rung is met with support first)
  preferP: 0.7,              // v3 §3 o.prefer: chance a 'normal' item takes a preferred (story) key
  fastAcc: 0.85,             // v3: the fast track (golden challenge) arms only while acc20 ≥ 0.85
  fwWin: 6, fwN: 2,           // v3 §13.4 guess guard: ≥2 fast-wrong items in the strand's last 6 → production formats / max choices
  contrastWin: 10, contrastN: 3, recentKeys: 10,
  reviewDays: [1, 3, 7, 21, 60, 120],   // v4 §4.4 (was 1/3/7/21)
  teenBoost: 1.7, teenBoostStart: 2.5, teenGap: 5, teenUntil: { 'T-NAVN': 6, 'T-SKRIV': 5, 'T-MENGDE': 5 },
  numStarve: 8,
  // ---- v4
  kinds: [0.55, 0.20, 0.10, 0.10, 0.05],   // §4.4 current / review / interleaved / preview / ★
  previewAcc: 0.8,
  testOutN: 3,               // «hopp over»: 3 first-try items at rung+2
  testOutAcc: 0.9,           // the fast track arms a test-out only while acc20 ≥ .9 (v3's golden challenge: .85)
  introN: 6, introDose: 0.05, floor: 0.03, retireW: 0.02, restFrac: 0.35,
  langCap: 0.4,             // v5r fix1 (review #5): the freed share of resting math domains never lifts SPRÅK above 40 % (or its own share)
  stage0Tasks: 500,          // ≈ 4 weeks at 25 tasks × 5 days: Stage 0 targets while the new strands unlock
  shareWin: 40, shareGain: 0.8, shareMin: 0.4, shareMax: 2.5,
  sameDom3: 0.05, sameDom2: 0.5, sameThink: 0.02, thinkMin: 5, thinkBoost: 4, catBoost: 3,
  modeRun: 2, modePen: 0.05, longWin: 3, longPen: 0.02,
  newRungsPerSession: 2,
  fluMs: 3000, fluN: 5, fluWaitN: 6, fluSlowMs: 6000,
  setMinMet: 60,             // v5r2b: a non-teach «Set» deck (REGN 8) is judged over the facts she has met – at least 60 of them (half of 121)
  setChkN: 2, setChkGap: 10, //   … and its fact check comes up to twice a session, ≥ 10 tasks apart (the Leitner box 1 → 2 → 3 spacing)
  rapidProdN: 8, helpBridgeN: 3,
  dryTasks: 3,               // v5: a strand whose generator returned nothing rests for 3 tasks (VIT / Or-T / Or-U before teaching)
  spinN: 12, spinSess: 2, parkDays: 3, parkW: 0.15,
  valveN: 2, valveDays: 7, valveFor: 3, valveW: 0.5,
  twinG: 0.05, chipG: 0.25,
};
const COINS = { A: 3, B: 0, C: 0, H: 0, R: 0 };   // economy §2 (12.10, honest coins): only a first-try right answer (A) pays
const COIN_A = { easy: 1, s1: 2, s2: 3, check: 3, gold: 6 };   // v3 §11.5
const PORTABLE = ['F06', 'F23', 'F33', 'F35',
  'F25',                          // LES L2–9 (a book with a title – anyone can hold one; with F23 + F32 keeps any LES format ≲ 15 %)
  'F36',                          // SKRIV S2–6 (a scrambled sign; with F33 + F35 keeps any SKRIV format ≲ 15 %)
  'F01', 'F02', 'F03', 'F05',     // T-NAVN  N1–6, N2–6 (+O1–3), N3–6+N9, N7–8
  'F15', 'F14', 'F16', 'F17',     // T-SKRIV W1–2, W3–5, W3–5, W6–7
  'F18', 'F19', 'F20', 'F21',     // T-ORDEN O1–3+O8, O4–6, O7–8, O8
  'F07', 'F08', 'F09', 'F11', 'F13'];   // T-MENGDE M4, M5–6, M7, M8, M10 (M9 = paying, shops only)
// v3 §13.2 production formats (keypad, tiles, building, writing): the answer is produced, not picked – guessing does not pay.
const PRODUCE = ['F07', 'F09', 'F11', 'F14', 'F15', 'F17', 'F33', 'F34', 'F35', 'F36', 'F40'];
const LONG = ['F50', 'F55', 'F56', 'F63', 'F77'];   // §4.2 load limit: ≤1 in any 4
const R = (a, b) => [a, b];
const FMT = {
  // v5 (WP-R request): the fallback table follows the retrofitted declarations of f_num.js (F01/F03/F04 N10–N11, F05 N12, F14/F16 W8)
  F01: { strands: { 'T-NAVN': [R(1, 6), R(10, 11)] }, family: 'tall-velg' }, F02: { strands: { 'T-NAVN': R(2, 6), 'T-ORDEN': R(1, 3) }, family: 'post' },
  F03: { strands: { 'T-NAVN': [R(3, 6), R(9, 11)] }, family: 'ballong' }, F04: { strands: { 'T-NAVN': [R(6, 6), R(9, 9), R(11, 11)] }, family: 'fisk' },
  F05: { strands: { 'T-NAVN': [R(7, 8), R(12, 12)] }, family: 'drikk' }, F06: { strands: { 'T-MENGDE': R(1, 3) }, family: 'telle' },
  F07: { strands: { 'T-MENGDE': R(4, 4) }, family: 'bygg' }, F08: { strands: { 'T-MENGDE': R(5, 6) }, family: 'telle-trykk' },
  F09: { strands: { 'T-MENGDE': R(7, 7) }, family: 'plukk' }, F10: { strands: { 'T-MENGDE': [R(4, 4), R(8, 8)] }, family: 'bake' },
  F11: { strands: { 'T-MENGDE': R(8, 8) }, family: 'tiogl' }, F12: { strands: { 'T-MENGDE': R(9, 9) }, family: 'betal' },
  F13: { strands: { 'T-MENGDE': R(10, 10) }, family: 'spare' }, F14: { strands: { 'T-SKRIV': [R(3, 5), R(8, 8)] }, family: 'kode' },
  F15: { strands: { 'T-SKRIV': R(1, 2) }, family: 'husnr' }, F16: { strands: { 'T-SKRIV': [R(3, 5), R(8, 8)] }, family: 'pris' },
  F17: { strands: { 'T-SKRIV': R(6, 7) }, family: 'tallord' }, F18: { strands: { 'T-ORDEN': [R(1, 3), R(8, 8)] }, family: 'stein' },
  F19: { strands: { 'T-ORDEN': R(4, 6) }, family: 'mest' }, F20: { strands: { 'T-ORDEN': R(7, 8) }, family: 'parade' },
  F21: { strands: { 'T-ORDEN': R(8, 8) }, family: 'klokke' }, F22: { strands: { 'T-MENGDE': R(5, 7), 'T-ORDEN': R(1, 2) }, family: 'janei' },
  F23: { strands: { LES: R(1, 9) }, family: 'lapp' }, F24: { strands: { LES: R(2, 8) }, family: 'krukke' }, F25: { strands: { LES: R(2, 9) }, family: 'bok' },
  F26: { strands: { LES: R(3, 9) }, family: 'skilt' }, F27: { strands: { LES: R(2, 8) }, family: 'dor' }, F28: { strands: { LES: R(10, 11) }, family: 'gjor' },
  F29: { strands: { LES: R(2, 5) }, family: 'rim' }, F30: { strands: { LES: R(9, 11) }, family: 'avis' }, F31: { strands: { LES: R(10, 11) }, family: 'gate' },
  F32: { strands: { LES: R(3, 7) }, family: 'bytte-les' }, F33: { strands: { SKRIV: R(1, 9) }, family: 'ordmagi' }, F34: { strands: { SKRIV: R(2, 9) }, family: 'diktat' },
  F35: { strands: { SKRIV: R(1, 8) }, family: 'hull' }, F36: { strands: { SKRIV: R(2, 6) }, family: 'stokk' }, F37: { strands: { SKRIV: R(5, 11) }, family: 'feil' },
  F38: { strands: { SKRIV: R(10, 10) }, family: 'bytte' }, F39: { strands: { SKRIV: R(11, 11) }, family: 'kategori' }, F40: { strands: { SKRIV: R(2, 9) }, family: 'diktat2' },
  F41: { strands: { SKRIV: R(1, 1) }, family: 'forstelyd' },
};

/* ---------------------------------------------------------------- registry access (lazy: ladders.js may load after this file) */
const LAD = () => (F.LADDERS && F.LADDERS['T-NAVN'] && typeof F.LADDERS.list === 'function' ? F.LADDERS : null);
const strandIds = () => { const l = LAD(); return l ? Object.keys(l) : LEG_STRANDS; };
const domainOf = s => { const l = LAD(); return (l && l[s] && l[s].domain) || (NUMS[s] ? 'TALL' : 'SPRÅK'); };
const rungRec = (s, r) => { const l = LAD(); return l ? l.rung(s, r) : null; };
function thinkOf(s, r) { const rr = rungRec(s, r); if (rr && rr.think) return rr.think; const l = LAD(); return (l && l[s] && l[s].think && l[s].think[0]) || LEG_THINK[s] || 'REGNE'; }
function ladderList(s) { const l = LAD(); if (l) return l.list(s); const m = LEG_MAX[s]; const o = []; for (let i = 1; i <= (m || 0); i++) o.push(i); return o; }
function ladderMax(s) { const l = ladderList(s); return l.length ? l[l.length - 1] : 0; }
const gOfItem = (it, sp) => { const l = LAD(); if (l) return l.gOf(it, sp); if (it && typeof it.g === 'number') return it.g; if (it && Array.isArray(it.choices) && it.choices.length) return 1 / it.choices.length; return 0.2; };
const creditOf = g => g <= 0.05 ? 1 : g <= 0.15 ? 0.75 : g <= 0.34 ? 0.5 : g <= 0.5 ? 0.25 : 0;

/* ---------------------------------------------------------------- state */
let S = null;     // bound learn object
const mem = { fmtLast: null, dry: {} };
const dayOf = now => { const d = new Date(now); return Math.floor((now - d.getTimezoneOffset() * 60000) / 864e5); };
function freshStrand(id) {
  const l = LAD(), lst = ladderList(id);
  let start = OLD[id] ? TH.placementStart : (l && l[id] && l[id].start) || 1;
  if (lst.length && !lst.includes(start)) start = lst.filter(x => x <= start).pop() || lst[0];
  return { rung: start, sup: 1, hist: [], sw: [], rw: [], streak: [], prov: [], passed: {}, mastered: {}, provisional: {},
    formatsA: {}, m2: {}, rev: {}, ovIgjen: {}, placed: 0, challenge: false, contrast: null, famAvoid: null, tagLog: [], n: 0, nA: 0,
    h20: [], lastTask: -1e9, sess: 0, tl: [], best: 0, probation: 0,
    // v4
    cw: [], twin: {}, twinOpp: {}, gold: {}, mDay: {}, fluPend: {}, setPend: {}, fluWait: 0, rtA: {}, spinC: {}, spinFlags: {},
    park: 0, valve: 0, collapses: [], helpRun: 0, bridge: 0, prodOnly: 0, rapidRun: 0, introDone: !!OLD[id], newSess: -1, newN: 0 };
}
function ensureStrand(o, id) {
  const f = freshStrand(id);
  const st = o.strands[id] = Object.assign(f, o.strands[id] || {});
  for (const k of ['cw', 'collapses']) if (!Array.isArray(st[k])) st[k] = [];
  for (const k of ['twin', 'twinOpp', 'gold', 'mDay', 'fluPend', 'setPend', 'rtA', 'spinFlags', 'spinC']) if (!st[k] || typeof st[k] !== 'object') st[k] = {};
  if (st.challenge === true) st.challenge = { to: null, n: 0 };     // v3 save: armed fast track → v4 test-out
  return st;
}
function init(o) {
  o.v = 2;
  o.strands = o.strands || {};
  for (const id of strandIds()) ensureStrand(o, id);
  o.items = o.items || {}; o.conf = o.conf || {}; o.tags = o.tags || {}; o.ovebank = o.ovebank || [];
  o.taskNo = o.taskNo || 0; o.log = o.log || []; o.sessions = o.sessions || []; o.recent = o.recent || [];
  o.fmtRT = o.fmtRT || {}; o.fmtG = o.fmtG || {}; o.fmtMode = o.fmtMode || {}; o.wall = !!o.wall; o.safeC = !!o.safeC; o.lastAt = o.lastAt || 0;
  o.numWeight = o.numWeight || null; o.spont = o.spont || {};
  if (LAD() && o.v4Start == null) o.v4Start = o.taskNo;     // Stage 0 (§4.1) counts from the day the v4 strands arrived
  return o;
}
function bound() {
  if (!S) { const sv = F.save || (F.save = {}); sv.learn = sv.learn || {}; S = init(sv.learn); }
  else if (LAD() && !S.strands.REGN) { for (const id of strandIds()) ensureStrand(S, id); if (S.v4Start == null) S.v4Start = S.taskNo; }   // the registry arrived after load()
  return S;
}
const stOf = s => S.strands[s] || ensureStrand(S, s);
const persist = () => { try { if (F.store) F.store(); } catch (e) { /* node */ } };

/* ---------------------------------------------------------------- helpers */
const last = (a, n) => a.slice(Math.max(0, a.length - n));
const countA = a => a.filter(x => x === 'A').length;
const push = (a, v, cap) => { a.push(v); if (a.length > cap) a.splice(0, a.length - cap); };
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const keyStrand = k => k.slice(0, k.indexOf(':'));
function fmtSpec(id) {
  const d = F.Task && F.Task.defs && F.Task.defs[id];
  if (d && d.strands) return d;
  return FMT[id] || null;
}
function allFormats() {
  // in the page: only formats that are really registered (F.Task.defs); in Node / before any registration: the DESIGN table
  const reg = F.Task && F.Task.defs ? Object.keys(F.Task.defs).filter(id => F.Task.defs[id] && F.Task.defs[id].strands && !/_demo$/.test(id)) : [];
  return reg.length ? reg : Object.keys(FMT);
}
function serves(id, strand, rung) {
  const sp = fmtSpec(id); if (!sp || !sp.strands || !sp.strands[strand]) return false;
  let rr = sp.strands[strand];
  if (!Array.isArray(rr)) return false;
  if (!Array.isArray(rr[0])) rr = [rr];
  if (!rr.some(([a, b]) => rung >= a && rung <= (b == null ? a : b))) return false;
  const rs = sp.rungs;
  if (rs) {
    const list = Array.isArray(rs) ? (Object.keys(sp.strands)[0] === strand ? rs : null) : rs[strand];
    if (Array.isArray(list) && !list.includes(rung)) return false;
  }
  return true;
}
const family = id => { const sp = fmtSpec(id); return (sp && sp.family) || id; };
const placesAny = sp => Array.isArray(sp.places) && sp.places.includes('any');
// the portable list + every registered format whose spec says portable:true + (v4) formats of new strands that run on the floating stage
function portables() {
  const out = PORTABLE.filter(f => fmtSpec(f));
  for (const f of allFormats()) {
    const sp = fmtSpec(f); if (!sp || out.includes(f)) continue;
    if (sp.portable || (placesAny(sp) && Object.keys(sp.strands || {}).some(s => !OLD[s]))) out.push(f);
  }
  return out;
}
// v4: answer mode and guess probability of a format (spec.mode / spec.g; old formats: production list or chips)
const PROD_MODES = { keypad: 1, tiles: 1, build: 1, grid: 1, balance: 1, ribbon: 1 };
// (a spec with g as a function of the item – e.g. F52 g: it => it.g – is learned from the items she meets: the lowest g reported per format)
function fmtMode(f) { const sp = fmtSpec(f) || {}; return sp.mode || (!FMT[f] && S && S.fmtMode && S.fmtMode[f]) || (PRODUCE.includes(f) ? 'keypad' : 'chips'); }
function fmtG(f) {
  const sp = fmtSpec(f) || {};
  if (typeof sp.g === 'number') return sp.g;
  if (sp.produce || PROD_MODES[sp.mode] || PRODUCE.includes(f)) return 0.01;
  if (!FMT[f] && S && S.fmtG && S.fmtG[f] != null) return S.fmtG[f];
  if (sp.mode === 'order' || sp.mode === 'subset' || sp.mode === 'twostep') return 0.04;
  return sp.mode === 'line' ? 0.1 : sp.mode === 'scene' ? 0.12 : 0.25;
}
const isLong = f => { const sp = fmtSpec(f) || {}; return !!sp.long || LONG.includes(f); };
// today's formats that present an item their own way (the bank's g describes its default presentation, e.g. a keypad): until a
// format declares spec.g / spec.mode (WP-R retrofits) the engine uses what the format really shows (SYNTHESIS §5.2 B)
const LEG_G = { F19: 0.5, F22: 0.5, F30: 0.5, F20: 1 / 6, F21: 1 / 6, F29: 1 / 3, F37: 0.2, F41: 1 / 3 };
function gFor(it, sp) {
  const f = it.format;
  if (sp && typeof sp.g === 'number') return sp.g;
  if (sp && typeof sp.g === 'function') { try { const v = sp.g(it); if (typeof v === 'number' && isFinite(v)) return v; } catch (e) { /* item-level */ } }
  if (FMT[f] && !(sp && sp.mode)) {
    if (PRODUCE.includes(f)) return 0.01;
    if (LEG_G[f] != null) return LEG_G[f];
    if (Array.isArray(it.choices) && it.choices.length) { if (Array.isArray(it.target)) { let k = 1; for (let i = 2; i <= it.target.length; i++) k *= i; return 1 / k; } return 1 / it.choices.length; }
    return 0.25;
  }
  return gOfItem(it, sp);
}

/* ---------------------------------------------------------------- availability (unlock by registered formats + generators) */
let avC = null, avSig = '';
function regCount() { const r = F.__genReg; if (!r) return 0; let n = 0; for (const k in r.fns) n += r.fns[k].length; return n; }
function genOk(s, r) {
  const B = F.BANKS || {};
  if (OLD[s] && B.gen && B.MAX && r <= (B.MAX[s] || 0)) return true;
  return !!(B.hasReg && B.hasReg(s, r));
}
// the availability table is recomputed only at API entry points (touch) – formats/generators register at load time
let avDirty = true;
function touch() { avDirty = true; ladMemo = {}; }
let ladMemo = {};
function avail() {
  if (avC && !avDirty) return avC;
  avDirty = false;
  const B = F.BANKS || {};
  const sg = (F.Task && F.Task.defs ? Object.keys(F.Task.defs).length : 0) + '|' + regCount() + '|' + (B.MAX ? JSON.stringify(B.MAX) : '') + '|' + (LAD() ? 1 : 0) + '|' + (B.gen ? 1 : 0);
  if (avC && sg === avSig) return avC;
  avSig = sg; avC = {};
  const fm = allFormats(), l = LAD();
  for (const s of strandIds()) {
    const out = [];
    if (!(l && l[s] && l[s].locked)) for (const r of ladderList(s)) { if (genOk(s, r) && fm.some(f => serves(f, s, r))) out.push(r); else break; }
    avC[s] = out;
  }
  return avC;
}
const isActive = s => (avail()[s] || []).length > 0;
// v5r2: how many registered formats serve a rung (memo per availability signature) – a rung that only ONE format serves (REGN 8: F47,
// T-MENGDE 14: F43) is mastered on that format alone; «A on 2 formats» there could never be met, so Gold – and the REGN 11 gate – never came
let nfC = {}, nfSig = null;
function fmtsAt(s, r) {
  avail(); if (nfSig !== avSig) { nfC = {}; nfSig = avSig; }
  const k = s + ':' + r; return nfC[k] != null ? nfC[k] : (nfC[k] = allFormats().filter(f => serves(f, s, r)).length);
}
const isGold = (s, r) => !!(S && S.strands[s] && S.strands[s].gold && S.strands[s].gold[r]);
// rungs that some gate needs at Gold, per strand (from the registry's prereq lists)
let gnC = null;
function gateNeeds(s) {
  const l = LAD(); if (!l) return [];
  // (only gates of rungs in play – later-phase rungs in the registry carry ph ≥ 2 and stay out of list())
  if (!gnC) { gnC = {}; for (const x of Object.keys(l)) for (const n of l.list(x)) for (const p of (l[x].rungs[n].prereq || [])) { const i = p.lastIndexOf(':'); (gnC[p.slice(0, i)] = gnC[p.slice(0, i)] || []).push(+p.slice(i + 1)); } }
  return gnC[s] || [];
}
function prereqOk(s, r) {
  const rr = rungRec(s, r); if (!rr || !rr.prereq) return true;
  return rr.prereq.every(p => { const i = p.lastIndexOf(':'); return isGold(p.slice(0, i), +p.slice(i + 1)); });
}
// the rungs open to her: available rungs up to the first closed gate (rungs she already reached stay open – nothing is taken away)
function lad(s) {
  const a = avail()[s] || [], st = S && S.strands[s], best = st ? Math.max(st.best || 0, st.rung || 0) : 0;
  const mk = s + '|' + best, m = ladMemo[mk]; if (m) return m;
  const out = [];
  for (const r of a) { if (r > best && !prereqOk(s, r)) break; out.push(r); }
  return (ladMemo[mk] = out);
}
function idxOf(l, r) { let i = l.indexOf(r); if (i >= 0) return i; for (i = l.length - 1; i >= 0; i--) if (l[i] <= r) return i; return 0; }
function step(s, r, k) { const l = lad(s); if (!l.length) return r; return l[Math.max(0, Math.min(l.length - 1, idxOf(l, r) + k))]; }
const topR = s => { const l = lad(s); return l.length ? l[l.length - 1] : 1; };
// v5: teach-before-test rungs (ladders.js rung.teach: VIT V1–V2, ORD Or-T / Or-U) are decks she is TAUGHT first – nobody can be placed
// into them or test out over them: placement and «hopp over» stop at the last ordinary rung below the first teach rung
const isTeach = (s, r) => !!(rungRec(s, r) || {}).teach;
function jumpTop(s) { const l = lad(s); let t = l.length ? l[0] : 1; for (const r of l) { if (isTeach(s, r)) break; t = r; } return t; }
function challengeTo(s, st) { const to = Math.min(step(s, st.rung, 2), jumpTop(s)); return to > st.rung ? to : null; }
const firstR = s => { const l = lad(s); return l.length ? l[0] : 1; };
const belowR = (s, r) => lad(s).filter(x => x < r).reverse();       // descending
const dist = (s, a, b) => { const l = lad(s); return idxOf(l, a) - idxOf(l, b); };
const plN = s => OLD[s] ? TH.placementN : (n => n >= 4 ? TH.placementN : n >= 3 ? 2 : 0)((avail()[s] || []).length);
const placedDone = (s, st) => st.placed >= plN(s);
// Leitner keys that fit a rung: old strands → F.BANKS.fits, new strands → registry opts.fits, else the rung the key was last seen at
function fitsKey(s, rung, k) {
  const B = F.BANKS || {};
  if (OLD[s] && B.fits && B.MAX && rung <= (B.MAX[s] || 0)) { try { return B.fits(s, rung, k); } catch (e) { return false; } }
  const rf = B.regFits ? B.regFits(s, rung, k) : null;
  if (rf != null) return rf;
  const e = S.items[k]; return !!(e && e.r === rung);
}
function numWeight() { return S.numWeight || (F.save && F.save.settings && F.save.settings.numWeight) || 50; }
function matteShare(nw) {
  const l = LAD(); if (!l) return nw / 100;
  const m = l.MIX.matte; if (m[nw] != null) return m[nw] / 100;
  const pts = [[0, 25], [30, 40], [50, 55], [70, 70], [100, 85]];
  for (let i = 1; i < pts.length; i++) if (nw <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return (va + (vb - va) * (nw - a) / (b - a)) / 100; }
  return 0.85;
}
function leitnerDue(e, taskNo, today) { return e.box <= 2 ? taskNo >= e.due : today >= e.dueDay; }
function dueKeys(strand, today) {
  const out = [];
  for (const k in S.items) if (keyStrand(k) === strand && leitnerDue(S.items[k], S.taskNo, today)) out.push(k);
  return out.sort((a, b) => (S.items[a].box - S.items[b].box) || (S.items[a].last - S.items[b].last));
}
function recentKeys(n) { return S.log.slice(-n).map(x => x[3]); }
function provDue(st) { return st.prov.find(p => S.taskNo >= p.dueTask) || null; }
function revDue(st, today) { for (const r in st.rev) if (st.rev[r].dueDay <= today) return +r; return null; }
const acc20 = st => st.h20.length >= 5 ? countA(st.h20) / st.h20.length : null;
const guarded = st => (st.fw || []).filter(Boolean).length >= TH.fwN;
const inIntro = (s, st) => !OLD[s] && st.n < TH.introN;
// lifecycle (SYNTHESIS §4.6): a strand that has passed the top rung open to her rests at review-only weight (2 %) – T-NAVN / T-SKRIV
// for good after their Phase-1 tops, any other strand while it waits for a gate or for the formats of its next rung (a closed rung
// never shows up as a failure: «the strand simply waits and its weight flows to open strands»)
function retired(s, st) {
  if (!LAD() || !st.introDone) return false;
  const top = topR(s); return st.rung >= top && !!st.passed[top] && placedDone(s, st);
}
// a rung with a production format (g ≤ .05) somewhere: the twin rule applies there (else today's 3-of-4 rule)
const declaredProd = f => { const sp = fmtSpec(f) || {}; return (typeof sp.g === 'number' && sp.g <= TH.twinG) || !!sp.produce || !!PROD_MODES[sp.mode] || PRODUCE.includes(f); };
function twinPossible(s, r) { return allFormats().some(f => serves(f, s, r) && fmtG(f) <= TH.twinG); }
// the twin rule applies where a format DECLARED as production serves the rung, or where she has met a production item there
// (formats whose g depends on the item: F.Task.def(…, {g: it => …}) – learned per format)
function twinRule(s, st, r) { return allFormats().some(f => serves(f, s, r) && declaredProd(f)) || (twinPossible(s, r) && (st.twinOpp[r] || 0) > 0); }

/* ---------------------------------------------------------------- mix (SYNTHESIS §4.1) */
function stageOf(dom, act) {
  if (!LAD()) return 'A';
  if (S.taskNo - (S.v4Start || 0) < TH.stage0Tasks) return '0';
  if (act.some(s => inIntro(s, stOf(s)))) return '0';
  const bands = act.map(s => { const rr = rungRec(s, stOf(s).rung); return rr && !rr.pre ? (rr.band === 'C' ? 3 : rr.band === 'B' ? 2 : 1) : 1; }).sort((a, b) => a - b);
  const b = bands.length ? bands[bands.length >> 1] : 1;
  return b >= 3 ? 'C' : b === 2 ? 'B' : 'A';
}
// absolute target share per active strand (sums to 1)
function targets(now) {
  bound();
  const l = LAD(), act = strandIds().filter(isActive), out = {}, today = dayOf(now || Date.now());
  if (!act.length) return out;
  const byDom = {}; for (const s of act) (byDom[domainOf(s)] = byDom[domainOf(s)] || []).push(s);
  // domain shares: math = «Matte-andel», VERDEN fixed when active, SPRÅK the rest
  const stage = {}; for (const d in byDom) stage[d] = stageOf(d, byDom[d]);
  const mixOf = d => (l ? l.MIX[stage[d]] : LEG_MIX)[d] || {};
  const domT = {}; for (const d in byDom) domT[d] = Object.values(mixOf(d)).reduce((a, b) => a + b, 0);
  const ver = byDom.VERDEN ? domT.VERDEN / 100 : 0;
  const mathDoms = MATH_DOMS.filter(d => byDom[d]);
  let math = matteShare(numWeight()), lang = byDom['SPRÅK'] ? 1 - math - ver : 0;
  if (!mathDoms.length) { lang = 1 - ver; math = 0; } else if (!byDom['SPRÅK']) math = 1 - ver;
  const domS = {};
  const mt = mathDoms.reduce((a, d) => a + domT[d], 0);
  for (const d of mathDoms) domS[d] = math * domT[d] / mt;
  if (byDom['SPRÅK']) domS['SPRÅK'] = lang;
  if (byDom.VERDEN) domS.VERDEN = ver;
  // strand bases inside each domain (T-* split by today's W0) and the plain shares before the lifecycle
  const base = {}, plain = {};
  for (const d in byDom) {
    const mx = mixOf(d), ss = byDom[d];
    const tAct = ss.filter(s => /^T-/.test(s)), tW = l ? l.MIX.T : LEG_W0, tSum = tAct.reduce((a, s) => a + (tW[s] || 0), 0);
    for (const s of ss) base[s] = /^T-/.test(s) ? (mx['T-*'] || 0) * (tW[s] || 0) / (tSum || 1) : (mx[s] || 1);
    const sa = ss.reduce((a, s) => a + base[s], 0) || 1;
    for (const s of ss) plain[s] = domS[d] * base[s] / sa;
  }
  // lifecycle (§4.6): a resting strand keeps a review share – T-NAVN / T-SKRIV 2 % once their top is Gold; a strand that waits for a
  // gate or for the formats of its next rung keeps max(2 %, 35 % of its share) for maintenance; the rest flows to open siblings
  // v5r fix1 (review #7): a strand whose every open rung is Gold has nothing left to consolidate – it gets the retire weight too
  // (v5r2: over the rungs OPEN to her – lad(s) – not every served rung: a strand that waits at a gate has its open rungs all Gold too)
  const allGold = s => { const st = stOf(s), ls = lad(s); return ls.length > 0 && !!st.gold && ls.every(r => st.gold[r]); };
  const restW = s => { const st = stOf(s); return (l && l[s] && l[s].retire && st.gold[ladderMax(s)]) || allGold(s) ? TH.retireW : Math.max(TH.retireW, TH.restFrac * plain[s]); };
  const resting = {}; for (const s of act) resting[s] = retired(s, stOf(s));
  // a domain whose strands all rest keeps only their review shares; the rest flows to the other domains
  const allRest = {}; for (const d in byDom) allRest[d] = byDom[d].every(s => resting[s]);
  const openD = Object.keys(byDom).filter(d => !allRest[d]);
  if (openD.length && openD.length < Object.keys(byDom).length) {
    const lang0 = domS['SPRÅK'] || 0;
    let freed = 0; for (const d in byDom) if (allRest[d]) { const keep = Math.min(domS[d], byDom[d].reduce((a, s) => a + restW(s), 0)); freed += domS[d] - keep; domS[d] = keep; }
    const so = openD.reduce((a, d) => a + domS[d], 0) || 1; for (const d of openD) domS[d] += freed * domS[d] / so;
    // v5r fix1 (review #5): kinds of thinking stay varied – SPRÅK (STAVE / AVKODE / FORSTÅ) takes at most max(40 %, its own share) of
    // the freed math share while another non-language domain still has an open strand; the excess goes there
    const capL = Math.max(TH.langCap, lang0), openO = openD.filter(d => d !== 'SPRÅK' && d !== 'VERDEN');
    if (domS['SPRÅK'] > capL && openO.length) {
      const ex = domS['SPRÅK'] - capL, so2 = openO.reduce((a, d) => a + domS[d], 0) || 1; domS['SPRÅK'] = capL;
      for (const d of openO) domS[d] += ex * domS[d] / so2;
    }
  }
  for (const d in byDom) {
    const ss = byDom[d];
    const ret = ss.filter(s => resting[s]), open = ss.filter(s => !resting[s]);
    if (!open.length) { const t = ret.reduce((a, s) => a + restW(s), 0) || 1; for (const s of ss) out[s] = domS[d] * restW(s) / t; continue; }
    const rw = Math.min(domS[d] * 0.8, ret.reduce((a, s) => a + restW(s), 0)), sum = open.reduce((a, s) => a + base[s], 0) || 1;
    for (const s of ret) out[s] = rw * restW(s) / (ret.reduce((a, x) => a + restW(x), 0) || 1);
    for (const s of open) out[s] = (domS[d] - rw) * base[s] / sum;
  }
  // intro dose 5 %; then the 3 % floor for active strands past intro, taken from the largest strand in the same domain
  for (const s of act) { const st = stOf(s); if (inIntro(s, st)) out[s] = Math.min(out[s], TH.introDose); }
  if (l) for (const s of act) {
    const st = stOf(s); if (inIntro(s, st) || retired(s, st) || out[s] >= TH.floor) continue;
    const sib = byDom[domainOf(s)].filter(x => x !== s).sort((a, b) => out[b] - out[a])[0];
    const need = TH.floor - out[s];
    if (sib && out[sib] - need >= TH.floor) { out[sib] -= need; out[s] = TH.floor; }
  }
  const tot = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const s in out) out[s] /= tot;
  void today;
  return out;
}
// learning debt (DESIGN §9.1) – v4: the multipliers act INSIDE a domain (renormalised per domain)
function debt(now) {
  bound(); const today = dayOf(now || Date.now()), T = targets(now);
  const act = Object.keys(T);
  const lowIn = {};
  for (const s of act) { const h = stOf(s).h20; if (h.length >= 5) { const d = domainOf(s), r = countA(h) / h.length; if (!lowIn[d] || r < lowIn[d][1]) lowIn[d] = [s, r]; } }
  const tN = S.strands['T-NAVN'], tS = S.strands['T-SKRIV'];
  const cdd = {}; for (const k in S.items) { const e = S.items[k]; if (e.box >= 3 && today >= e.dueDay) cdd[keyStrand(k)] = 1; }
  const out = {};
  for (const s of act) {
    const st = stOf(s); let d = 1;
    // v4: «not practised lately» and the starvation floor are relative to the strand's share (with 15 strands every strand would
    // otherwise be «not practised in 12» and the T-strands «starved after 8»)
    const gap = S.taskNo - st.lastTask, exp = 1 / Math.max(0.01, T[s]);
    if (gap > Math.max(12, 1.5 * exp)) d *= 1.5;
    if (provDue(st) || revDue(st, today) != null || cdd[s]) d *= 2;
    if (lowIn[domainOf(s)] && lowIn[domainOf(s)][0] === s) d *= 1.3;
    if (st.contrast || st.challenge) d *= 2;
    if (st.park > today) d *= TH.parkW;
    if (st.valve > today) d *= TH.valveW;
    if (guarded(st)) d *= 0.6;
    if (gap > Math.max(TH.numStarve, 2.5 * exp)) d *= 2;
    let tm = 1;
    if (TH.teenUntil[s] && !st.passed[TH.teenUntil[s]]) {
      tm *= st.n < 2 ? TH.teenBoostStart : TH.teenBoost;
      if (tN && tS && S.taskNo - Math.max(tN.lastTask, tS.lastTask) > TH.teenGap) tm *= 2;
    }
    out[s] = { w: T[s], debt: d, eff: T[s] * d, base: T[s] * d, tm };
  }
  // the multipliers move weight inside a domain only (the domain's share stays its target)
  const byDom = {}; for (const s of act) (byDom[domainOf(s)] = byDom[domainOf(s)] || []).push(s);
  for (const dm in byDom) {
    const tw = byDom[dm].reduce((a, s) => a + out[s].w, 0), te = byDom[dm].reduce((a, s) => a + out[s].eff, 0);
    if (tw > 0 && te > 0) for (const s of byDom[dm]) { out[s].eff *= tw / te; out[s].debt *= tw / te; }
  }
  // the teen boost (Wave 2: «she struggles with 10–20») moves weight inside the four T-strands only
  const T4 = act.filter(s => /^T-/.test(s));
  const b4 = T4.reduce((a, s) => a + out[s].eff, 0), e4 = T4.reduce((a, s) => a + out[s].eff * out[s].tm, 0);
  if (b4 > 0 && e4 > 0) for (const s of T4) { const k = out[s].tm * b4 / e4; out[s].eff *= k; out[s].debt *= k; }
  // the 3 % floor also holds after the multipliers (a parked / valved / intro / retired strand may stay below it)
  if (LAD()) for (const s of act) {
    const st = stOf(s); if (out[s].eff >= TH.floor || inIntro(s, st) || retired(s, st) || st.park > today || st.valve > today) continue;
    const sib = byDom[domainOf(s)].filter(x => x !== s).sort((a, b) => out[b].eff - out[a].eff)[0];
    const need = TH.floor - out[s].eff;
    if (sib && out[sib].eff - need >= TH.floor) { out[sib].eff -= need; out[s].eff = TH.floor; }
  }
  return out;
}
// share controller: realised domain shares over the last TH.shareWin tasks vs target → multiplier (keeps §4.1 under the sequencing rules)
function shareCtl(T) {
  const lg = S.log.slice(-TH.shareWin).filter(x => x[9]); if (lg.length < 10) return {};
  const dt = {}, dr = {}; for (const s in T) dt[domainOf(s)] = (dt[domainOf(s)] || 0) + T[s];
  for (const x of lg) dr[domainOf(x[9])] = (dr[domainOf(x[9])] || 0) + 1 / lg.length;
  const m = {}; for (const d in dt) m[d] = Math.max(TH.shareMin, Math.min(TH.shareMax, Math.pow(dt[d] / Math.max(0.02, dr[d] || 0), TH.shareGain)));
  return m;
}

/* ---------------------------------------------------------------- planning: what item should strand s get? */
function plans(s, today, now, tr) {
  const st = stOf(s), out = [];
  // a strand she has never met is no «easier item» – during a safety item it waits (its first item stays the unscored intro)
  if ((S.wall || S.safeC) && !st.introDone && !OLD[s]) return out;
  if (S.wall) { const r = step(s, st.rung, -TH.wallDrop); out.push({ kind: 'safe', rung: r, sup: dist(s, st.rung, r) >= TH.wallDrop ? 1 : 0, why: 'wall' }); return out; }
  if (S.safeC) { const r = step(s, st.rung, -1); out.push({ kind: 'safe', rung: r, sup: dist(s, st.rung, r) >= 1 ? 1 : 0, why: 'afterC' }); return out; }
  // v4: the first item of a new strand is an unscored intro at s0
  // (v5: a teach-before-test deck – VIT – needs no unscored intro: she was taught every key it can ask; its first recall counts)
  if (!st.introDone && !OLD[s] && isTeach(s, firstR(s))) st.introDone = true;
  if (!st.introDone && !OLD[s]) { out.push({ kind: 'intro', rung: firstR(s), sup: 0 }); return out; }
  if (!placedDone(s, st)) out.push({ kind: 'placement', rung: st.rung, sup: 1 });
  else if (tr && tr.stretch) {
    if (st.rung < topR(s)) out.push({ kind: 'stretch', rung: step(s, st.rung, 1), sup: 1 });
    out.push({ kind: 'normal', rung: st.rung, sup: 2, stretchFb: true });
    return out;
  }
  if (st.bridge > 0 && st.rung > firstR(s) && !(tr && tr.atLevel)) out.push({ kind: 'safe', rung: step(s, st.rung, -1), sup: 1, why: 'bridge' });
  if (st.contrast && st.contrast.left > 0) out.push({ kind: 'contrast', rung: st.rung, sup: st.sup, tag: st.contrast.tag });
  if (st.challenge && st.rung < topR(s)) {
    const to = st.challenge.to != null && st.challenge.to > st.rung ? Math.min(st.challenge.to, topR(s), Math.max(st.rung, jumpTop(s))) : Math.min(step(s, st.rung, 2), Math.max(st.rung, jumpTop(s)));
    out.push({ kind: 'challenge', rung: to, sup: st.challenge.n ? 2 : 1 });
  }
  const pd = provDue(st); if (pd) out.push({ kind: 'provcheck', rung: pd.rung, sup: 1, prov: pd.rung });
  // gate checks (SYNTHESIS §2.7): a rung another strand's gate needs at Gold, which she climbed past before its mastery window filled,
  // gets one full-difficulty check per session until it is mastered (then the delayed check on a later day makes it Gold)
  // v5r2b: a mastered Set rung (REGN 8) whose fact check is short keeps its once-a-session check, aimed at a fact she has not met or
  // has not yet got right 3 times – after REGN 10 she met R8 about 1.5 times per 100 tasks and Gold (the REGN 11 gate) never came
  for (const r of gateNeeds(s)) if (st.passed[r] && !st.provisional[r] && st.rung > r && !(tr && tr.atLevel)) {
    const fresh = (st.gateSess || {})[r] !== curSess(), c = (st.setChk || {})[r];     // c = [session, checks in it, taskNo]
    if (!st.mastered[r]) { if (fresh) out.push({ kind: 'review', rung: r, sup: 2, why: 'gate' }); }
    else if (!st.gold[r] && setShort(s, st, r) && (fresh || (c && c[0] === curSess() && c[1] < TH.setChkN && S.taskNo - c[2] >= TH.setChkGap))) {
      const ks = setKeys(s, r, 5); out.push(Object.assign({ kind: 'review', rung: r, sup: 2, why: 'gate' }, ks.length ? { key: ks[0], setFacts: ks.slice(1) } : {}));
    }
  }
  const rd = revDue(st, today); if (rd != null) out.push({ kind: 'review', rung: rd, sup: 2, rungReview: true });
  const a = acc20(st);
  // v4: with 13–15 active strands the per-strand warm-up would fill half a session – at most TH.warmupMax warm-ups per session
  const ses = S.sessions[S.sessions.length - 1];
  if (placedDone(s, st) && st.sess < TH.warmupN && st.rung > firstR(s) && !(a != null && a >= TH.warmupSkipAcc) && !(ses && (ses.warm || 0) >= TH.warmupMax) &&
    !(tr && tr.atLevel && !tr.allowWarmup)) out.push({ kind: 'warmup', rung: step(s, st.rung, -1), sup: 1 });
  return out;
}
// v4 §4.4 item kinds: current 55 / review 20 / interleaved 10 / preview 10 / ★ 5.  tr.atLevel (v3 trials): no lower-rung review /
// Øvebank / interleaved / routine safe / preview – a normal item at her rung/sup instead (wall/afterC safety in plans() still applies)
function routinePlan(s, today, r, tr) {
  const st = stOf(s);
  const atL = !!(tr && tr.atLevel);
  const norm = { kind: 'normal', rung: st.rung, sup: st.sup };
  const K = TH.kinds, u = r();
  if (u < K[0]) return norm;
  if (u < K[0] + K[1]) {
    const dk = dueKeys(s, today);
    // v5 (parent rule: a strong learner gets ≤ 20 % items below her level): in a strand she does well in (acc20 ≥ .85) a lower-rung
    // Leitner review only for a key she once missed, or 40 % of the time (spaced consolidation) – the delayed Gold check stays
    const a = acc20(st), strong = a != null && a >= TH.strongAcc, youngOk = r() < TH.youngP;
    for (const k of dk) {
      if (fitsKey(s, st.rung, k)) return { kind: 'review', rung: st.rung, sup: st.sup, key: k };
      // (a «Set» rung – R8 facts, VIT facts, Or-T words, Or-U expressions – keeps every spaced review: the deck IS the learning)
      if (!atL) for (const rr of belowR(s, st.rung)) if (st.passed[rr] && fitsKey(s, rr, k) && (!strong || (S.items[k] && S.items[k].err > 0) || youngOk || (rungRec(s, rr) || {}).code === 'Set')) return { kind: 'review', rung: rr, sup: 2, key: k };
    }
    return norm;
  }
  if (u < K[0] + K[1] + K[2]) {
    // interleaved: Øvebank keys first (she got them wrong), then «øv igjen» rungs, then a random passed rung of the strand
    const ks = S.ovebank.filter(k => keyStrand(k) === s);
    for (const k of ks) {
      if (fitsKey(s, st.rung, k)) return { kind: 'ovebank', rung: st.rung, sup: st.sup, key: k };
      if (!atL) for (const rr of belowR(s, st.rung)) if (fitsKey(s, rr, k)) return { kind: 'ovebank', rung: rr, sup: 1, key: k };
    }
    if (atL) return norm;
    const oi = Object.keys(st.ovIgjen).map(Number).filter(x => x < st.rung);
    const a2 = acc20(st); if (a2 != null && a2 >= TH.strongAcc && !oi.length) return norm;    // v5: nothing to interleave below for a strong strand
    if (oi.length) return { kind: 'safe', rung: oi[Math.floor(r() * oi.length)], sup: 1, why: 'ovIgjen' };
    const ps = belowR(s, st.rung).filter(x => st.passed[x]).slice(0, 2);    // the two most recent passed rungs: choose the strategy
    if (ps.length && placedDone(s, st)) return { kind: 'mix', rung: ps[Math.floor(r() * ps.length)], sup: 2 };
    return norm;
  }
  if (atL) return norm;
  if (u < K[0] + K[1] + K[2] + K[3]) {
    const a = acc20(st);
    // v3: the routine rung−1 item only while she is not doing well (acc20 < 0.8, or a miss among her last 3 in this strand)
    if (st.rung > firstR(s) && (a == null || a < TH.safeAcc || (a < TH.strongAcc && last(st.h20, 3).some(x => x !== 'A')))) return { kind: 'safe', rung: step(s, st.rung, -1), sup: 1, why: 'routine' };
    // v4: next-rung preview at s0 (only while acc20 ≥ .8; no ladder effect)
    if (a != null && a >= TH.previewAcc && st.rung < topR(s) && placedDone(s, st)) return { kind: 'preview', rung: step(s, st.rung, 1), sup: 0 };
    return norm;
  }
  return norm;   // ★ (Kongens gåte) – no ★ rungs in Phase 1
}
// v5: a ladder that grew (the Phase-1 tops above the v1–v3 tops, a gate that opened, a format that arrived): a child who stands on a
// rung she already PASSED – her best, nothing passed above it – moves on to the next open rung; she never re-earns a rung she has.
// (the one state change next() makes: a migration, idempotent – placement, test-outs and collapses never leave her on a passed best rung)
function grow(s, st, today) {
  if (!st.passed[st.rung] || st.rung < (st.best || 0) || st.challenge || !placedDone(s, st)) return;
  if (Object.keys(st.passed).some(r => +r > st.rung)) return;
  const nx = step(s, st.rung, 1); if (!(nx > st.rung)) return;
  st.rung = nx; st.sup = 1; st.sw = []; st.rw = []; st.streak = []; st.cw = []; st.fluWait = 0; st.best = Math.max(st.best || 0, nx);
  tl(st, today);
}
// formats from `fmts` serving (s, rung), honouring repetition rules; null if none serve
function chooseFormat(fmts, s, rung, o, r, own, plan) {
  const st = stOf(s);
  let c = fmts.filter(f => serves(f, s, rung));
  if (!c.length) return null;
  const lastF = o.last || mem.fmtLast;
  const steps = [
    x => x.filter(f => f !== lastF && !(o.avoid || []).includes(f) && !(st.famAvoid && st.famAvoid.left > 0 && family(f) === st.famAvoid.fam)),
    x => x.filter(f => f !== lastF && !(o.avoid || []).includes(f)),
    x => x.filter(f => f !== lastF),
    x => x,
  ];
  for (const st2 of steps) { const y = st2(c); if (y.length) { c = y; break; } }
  // v4: test-out items, the production-only period after rapid guesses, and the twin check want production formats (g ≤ .05)
  const kind = plan && plan.kind;
  const wantProd = kind === 'challenge' || st.prodOnly > 0;
  if (wantProd) { const p = c.filter(f => fmtG(f) <= TH.twinG); if (p.length) c = p; }
  if (c.length === 1) return c[0];
  const recent = S.log.slice(-10).map(x => x[2]);
  const pf = (o.trial && o.trial.preferFormats) || null, gd = guarded(st);
  const twinNeed = (kind === 'normal' || kind === 'contrast') && st.sup === 2 && rung === st.rung && !st.twin[rung] && twinPossible(s, rung);
  // §4.2 rule 4: ≤ 2 of the same answer mode in a row; rule 5: ≤ 1 long format in any 4
  const lm = S.log.slice(-TH.modeRun).map(x => x[11] || null);
  const modeRun = lm.length === TH.modeRun && lm.every(m => m && m === lm[0]) ? lm[0] : null;
  const longRecent = S.log.slice(-TH.longWin).some(x => x[2] && isLong(x[2]));
  const w = c.map(f => {
    const prod = fmtG(f) <= TH.twinG;
    let x = (own && own.includes(f) ? 3 : 1) * (prod ? (gd ? 4 : twinNeed ? 3 : 2) : 1) * (pf && pf.includes(f) ? 3 : 1) / (1 + 2 * recent.filter(y => y === f).length);
    if (modeRun && fmtMode(f) === modeRun) x *= TH.modePen;
    if (longRecent && isLong(f)) x *= TH.longPen;
    if (st.stratN > 0 && (fmtSpec(f) || {}).fluency) x *= 0.1;
    return x;
  });
  let u = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) { u -= w[i]; if (u <= 0) return c[i]; }
  return c[c.length - 1];
}
// the rung actually servable here for a plan: exact, else (for easy kinds) the highest served rung ≤ plan.rung
function servable(fmts, s, plan) {
  if (fmts.some(f => serves(f, s, plan.rung))) return plan.rung;
  const easyKinds = { safe: 1, warmup: 1, review: 1, ovebank: 1, mix: 1 };
  if (!easyKinds[plan.kind]) return null;
  for (const rr of belowR(s, plan.rung)) if (fmts.some(f => serves(f, s, rr))) return rr;
  return null;
}

/* ---------------------------------------------------------------- next */
function decide(o, excl) {
  bound(); o = o || {}; if (!excl || !excl.length) touch();
  const r = o.rng || Math.random, now = o.now || Date.now(), today = dayOf(now);
  if (!F.BANKS || (!F.BANKS.gen && !F.BANKS.regGen)) return null;
  if (S.lastAt && (now - S.lastAt > 30 * 60000 || dayOf(S.lastAt) !== today)) newSession(now);
  let fmts = (o.formats && o.formats.length ? o.formats : allFormats()).filter(f => fmtSpec(f));
  const isNpc = !!(o.npc || o.npcRole || o.portable);
  const ids = strandIds();
  let strands = (o.strands || ids).filter(s => ids.includes(s));
  if (o.force && o.force.strand) strands = [o.force.strand];
  // forced (debug / scripted)
  if (o.force && o.force.strand && o.force.rung) {
    const f = o.force, s = f.strand, st = stOf(s);
    const pool = f.format ? [f.format] : fmts.concat(isNpc ? portables() : []);
    const plan = { kind: f.kind || 'normal', rung: f.rung, sup: f.sup != null ? f.sup : st.sup, key: f.key || (f.target != null ? s + ':' + f.target : null), tag: f.tag };
    const fm = f.format || chooseFormat(pool, s, f.rung, o, r, null, plan) || pool[0];
    // the wall rule also holds for scripted items: while a safety item is pending, a forced item becomes that safe item (force.exact skips)
    if ((S.wall || S.safeC) && !f.exact && plan.kind !== 'challenge' && placedDone(s, st)) {
      const want = step(s, st.rung, S.wall ? -TH.wallDrop : -1);
      let rr = null; for (const x of [Math.min(want, plan.rung)].concat(belowR(s, Math.min(want, plan.rung)))) if (rr == null && serves(fm, s, x)) rr = x;
      if (rr != null) {
        if (rr !== plan.rung) plan.key = null;
        Object.assign(plan, { kind: 'safe', why: S.wall ? 'wall' : 'afterC', rung: rr, sup: Math.min(plan.sup, 1) });
      }
    }
    return { s, plan, fm };
  }
  strands = strands.filter(s => isActive(s) && !(excl && excl.includes(s)));
  // v5: a strand whose generator had nothing to give lately (VIT / ORD Or-T / Or-U: teach-before-test – nothing due yet) rests for a
  // few tasks, so the share controller does not keep picking it only to fall back (its share flows to the other candidates)
  { const dr = strands.filter(s => { const d = mem.dry[s] || 0; return !(d > S.taskNo && d - S.taskNo <= TH.dryTasks); }); if (dr.length) strands = dr; }
  // (WP-A request) a teach-before-test strand with nothing due at any rung up to hers (F.BANKS.regReady → false) is skipped outright
  { const B = F.BANKS || {};
    if (B.regReady) strands = strands.filter(s => { if (OLD[s]) return true; const st = stOf(s); return lad(s).filter(r => r <= st.rung).some(r => B.regReady(s, r) !== false); }); }
  const D = debt(now);
  const recent10 = S.log.slice(-10).map(x => x[2]);
  const cands = [];
  for (const s of strands) {
    if (!D[s]) continue;
    const st = stOf(s);
    grow(s, st, today);
    let pool = fmts;
    const tr = o.trial || null;
    const pl = plans(s, today, now, tr);
    const safety = S.wall || S.safeC;
    const plan0 = pl[0] || routinePlan(s, today, r, tr);
    if (isNpc && !o.need && (!o.strands || servable(pool, s, plan0) == null)) pool = fmts.concat(portables().filter(p => !fmts.includes(p)));
    const list = safety ? pl : pl.length ? (pl.some(p => p.stretchFb) ? pl : pl.concat([routinePlan(s, today, r, tr)])) : [plan0];
    const pickPlan = pool2 => {
      for (const p of list) {
        const rr = servable(pool2, s, p);
        if (rr == null) continue;
        const c = Object.assign({}, p);
        if (rr !== p.rung) { c.rung = rr; c.offLevel = true; if (c.kind === 'normal') c.sup = 1; if (c.kind === 'safe') c.sup = Math.min(c.sup, 1); }
        return c;
      }
      return null;
    };
    let chosen = pickPlan(pool);
    if (o.levelFill && !safety && (!chosen || (chosen.offLevel && (dist(s, plan0.rung, chosen.rung) > 1 || dist(s, st.rung, chosen.rung) > 1)))) {
      const own = lad(s).some(rr => pool.some(f => serves(f, s, rr)));
      if (own) {
        const fams = new Set(pool.map(family));
        const extra = (o.fill || portables()).concat(allFormats().filter(f => fams.has(family(f)))).filter((f, i, a) => a.indexOf(f) === i && !pool.includes(f) && fmtSpec(f));
        const pool2 = pool.concat(extra), c2 = extra.length ? pickPlan(pool2) : null;
        if (c2 && !c2.offLevel) { chosen = c2; pool = pool2; }
      }
    }
    if (!chosen) {
      if (safety) continue;
      const L = lad(s);
      let hi = null; for (const rr of [Math.min(st.rung, plan0.rung)].concat(belowR(s, Math.min(st.rung, plan0.rung)))) if (hi == null && pool.some(f => serves(f, s, rr))) hi = rr;
      let lo = null; for (const rr of L) if (lo == null && pool.some(f => serves(f, s, rr))) lo = rr;
      if (hi != null) chosen = { kind: 'normal', rung: hi, sup: 1, offLevel: true };
      else if (lo != null && dist(s, lo, st.rung) <= 2) chosen = { kind: 'normal', rung: lo, sup: 1, offLevel: true };
      else continue;
      if (chosen.kind === 'normal' && plan0.kind === 'intro') chosen = Object.assign({}, chosen, { kind: 'intro', sup: 0 });
    }
    let w = D[s].eff;
    if (chosen.offLevel) w *= 0.3;
    const lastF = o.last || mem.fmtLast;
    if (lastF && !pool.some(f => f !== lastF && serves(f, s, chosen.rung))) w *= 0.01;
    // v4: one format may serve several strands (F71: DATA D1, ORD Or1, LOGIKK Lo1) – a strand whose formats were all used lately
    // waits a little, so no format dominates a session (≲ 15 %)
    const servF = pool.filter(f => serves(f, s, chosen.rung));
    const prio = { contrast: 1, provcheck: 1, challenge: 1, placement: 1 }[chosen.kind] || chosen.rungReview;
    if (servF.length && !prio) { const minC = Math.min(...servF.map(f => recent10.filter(x => x === f).length)); if (minC >= 2) w /= 1 + 1.5 * (minC - 1); }
    if (chosen.kind === 'provcheck' || chosen.kind === 'challenge' || chosen.kind === 'contrast' || chosen.kind === 'stretch') w *= 1.5;
    cands.push({ s, plan: chosen, pool, w, dom: domainOf(s), think: thinkOf(s, chosen.rung) });
  }
  if (!cands.length) return null;
  // domain shares among the candidates (the parent's «Matte-andel» holds even when a strand of a domain cannot be served here)
  const T = targets(now), ctl = shareCtl(T), domT = {};
  for (const s in T) domT[domainOf(s)] = (domT[domainOf(s)] || 0) + T[s];
  const doms = [...new Set(cands.map(c => c.dom))];
  if (doms.length > 1) for (const d of doms) {
    const cs = cands.filter(c => c.dom === d), sm = cs.reduce((a, c) => a + c.w, 0);
    if (sm > 0) cs.forEach(c => { c.w = c.w / sm * (domT[d] || 0.01) * (ctl[d] || 1); });
  }
  // §4.2 sequencing (soft where the place cannot serve otherwise)
  const lg = S.log.slice(-9), lastS = lg.slice(-2).map(x => x[9]), lastT = lg.slice(-2).map(x => x[10]);
  const lastDom = lg.length && lg[lg.length - 1][9] ? domainOf(lg[lg.length - 1][9]) : null;
  const nDom = new Set(strandIds().filter(isActive).map(domainOf)).size;
  const mult = (pred, f) => { if (cands.some(c => !pred(c) && c.w > 0)) cands.forEach(c => { if (pred(c)) c.w *= f; }); };
  // with only 2 active domains a strict alternation would force 50/50 against «Matte-andel» – the rule needs ≥ 3 domains
  if (lastDom && doms.length > 1 && nDom >= 3) mult(c => c.dom === lastDom, doms.length >= 3 ? TH.sameDom3 : TH.sameDom2);
  if (lastS.length === 2 && lastS[0] && lastS[0] === lastS[1]) mult(c => c.s === lastS[0], 0);
  if (lastT.length === 2 && lastT[0] && lastT[0] === lastT[1]) mult(c => c.think === lastT[0], TH.sameThink);
  // v5 encounter options (Venneprøven, DESIGN5 §2.2 / §5): soft – a trial asks for thinking types / domains it does not have yet
  if (Array.isArray(o.avoidThink) && o.avoidThink.length) mult(c => o.avoidThink.includes(c.think), 0.05);
  if (Array.isArray(o.avoidDomains) && o.avoidDomains.length) mult(c => o.avoidDomains.includes(c.dom), 0.1);
  if (Array.isArray(o.preferStrands) && o.preferStrands.length) cands.forEach(c => { if (o.preferStrands.includes(c.s)) c.w *= 3; });
  const seenT = new Set(lg.map(x => x[10]).filter(Boolean));
  if (lg.length >= 5 && seenT.size < TH.thinkMin) cands.forEach(c => { if (!seenT.has(c.think)) c.w *= TH.thinkBoost; });
  // gate (5): every window of 10 has ≥ 4 thinking types – when the last 9 hold ≤ 3, the next task must bring a new one if it can
  if (lg.length >= 9 && seenT.size <= 3) mult(c => seenT.has(c.think), 0.001);
  // §4.3 session shape: no thinking type above 35 % of the session; ≥ 1 MODELL, ROM, FORSTÅ and DEDUKSJON/ALGORITME item per session
  const ses = S.sessions[S.sessions.length - 1], sl = ses ? S.log.filter(x => x[1] > (ses.startTask || 0) && x[10]) : [];
  if (sl.length >= 6 && nDom >= 3) {
    const tc = {}; sl.forEach(x => { tc[x[10]] = (tc[x[10]] || 0) + 1; });
    mult(c => (tc[c.think] || 0) / sl.length > 0.35, 0.1);
    if (sl.length >= 10 && LAD()) for (const g of [['MODELL'], ['ROM'], ['FORSTÅ'], ['DEDUKSJON', 'ALGORITME']]) if (!g.some(t => tc[t])) cands.forEach(c => { if (g.includes(c.think)) c.w *= 3; });
  }
  if (lg.length >= 7 && LAD()) {
    const cat = c => c.dom === 'TALL' ? 'num' : c.dom === 'SPRÅK' ? 'lang' : ['ROM', 'MØNSTER', 'DEDUKSJON', 'MÅLE'].includes(c.think) ? 'reason' : null;
    const seenC = new Set(lg.map(x => x[9] ? cat({ dom: domainOf(x[9]), think: x[10] }) : null));
    cands.forEach(c => { const k = cat(c); if (k && !seenC.has(k)) c.w *= TH.catBoost; });
  }
  let tot = cands.reduce((a, c) => a + c.w, 0), pick = cands[cands.length - 1];
  if (tot <= 0) { cands.forEach(c => { c.w = 1; }); tot = cands.length; }
  let u = r() * tot;
  for (const c of cands) { u -= c.w; if (u <= 0) { pick = c; break; } }
  const fm = chooseFormat(pick.pool, pick.s, pick.plan.rung, o, r, fmts, pick.plan);
  if (!fm) return null;
  return { s: pick.s, plan: pick.plan, fm };
}
// v4: one generator call – the 6 old strands via F.BANKS.gen (up to F.BANKS.MAX), every other rung via the registry F.BANKS.reg
function genItem(s, rung, sup, o) {
  const B = F.BANKS || {};
  let it = null;
  const old = OLD[s] && B.gen && B.MAX && rung <= (B.MAX[s] || 0);
  if (!old && B.regGen) it = B.regGen(s, rung, sup, o.rng, o);
  if (!it && old) it = B.gen(s, rung, sup, o);
  if (!it) return null;
  it.strand = s; it.rung = rung; it.sup = sup;
  if (it.key == null) it.key = s + ':' + (it.n != null ? it.n : Array.isArray(it.target) ? it.target.join(',') : it.target);
  if (it.answer === undefined) it.answer = it.target;
  if (it.choices === undefined) it.choices = null;
  if (!Array.isArray(it.distractors)) it.distractors = [];
  if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
  if (it.say === undefined) it.say = null;
  if (it.text === undefined) it.text = null;
  if (it.word === undefined) it.word = null;
  it.params = it.params || {};
  return it;
}
let idSeq = 0;
// v5 encounter themes (DESIGN5 §2.2, playtest2 V5): o.theme is a species id ('ekorn') – resolved here from WP-A's F.THEMES / F.FAUNA – or
// a ready object. Generators read: animal (species id = the reasoning generators' object id), model, things / food (castable models),
// count + countSg / countPl (the thing to count), pattern (models for a bead pattern), kl / dekke / bein (sorting features), hopper.
const HOPPERS = { frosk: 1, krystallfrosk: 1, kanin: 1, blomsterkanin: 1, hare: 1, 'snøhare': 1, gresshoppe: 1 };
const themeMemo = {};
function themeOf(t) {
  if (!t) return null;
  // v5 WP-K3: a caller's partial object (WP-A's ctx.theme = {sp, things, model}, forwarded by F.Task.offer) is completed from the
  // species' resolved theme – its own non-empty fields win; a full object (has .animal) is used as it is
  if (typeof t === 'object') {
    if (t.animal || !t.sp || typeof t.sp !== 'string') return t;
    const full = themeOf(t.sp), out = Object.assign({}, full);
    for (const k in t) { const v = t[k]; if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) out[k] = v; }
    return out;
  }
  if (themeMemo[t] !== undefined) return themeMemo[t];
  let th = null; try { th = F.THEMES && F.THEMES.of ? F.THEMES.of(t) : null; } catch (e) { th = null; }
  if (!th) return (themeMemo[t] = { sp: t, animal: t, things: [], food: [], pattern: [] });
  const has = m => !!m && (!(F.VOX && F.VOX.has) || F.VOX.has(m));
  let things = []; try { things = (F.THEMES.thingsFor ? F.THEMES.thingsFor(t) : th.mat || []).filter(has); } catch (e) { things = []; }
  const food = (th.mat || []).filter(has), count = food[0] || things[0] || null;
  const fw = count && F.THEMES.FOOD ? F.THEMES.FOOD[count] : null;
  const base = th.base || t;
  return (themeMemo[t] = { sp: t, animal: base, model: th.model || base, things, food, count,
    countSg: fw && fw.w1 ? String(fw.w1).replace(/^(en|et|ei)\s+/, '') : null, countPl: fw ? fw.word : null,
    pattern: food.slice(0, 3).concat(has(th.model || base) ? [th.model || base] : []), kl: th.kl || null, dekke: th.dekke || null, bein: th.bein != null ? th.bein : null,
    hopper: HOPPERS[t] || HOPPERS[base] ? (th.model || base) : null, fairy: !!th.fairy });
}
// an encounter that does not pass o.theme yet: place 'dyr' while F.Befriend runs one → its species (feature-detected, WP-A's file)
function encSp(o) {
  if (o.theme || o.place !== 'dyr') return null;
  try { const B = F.Befriend, e = B && typeof B.current === 'function' ? B.current() : null; return e && e.sp ? e.sp : null; } catch (x) { return null; }
}
// C6: o.said may hold whole lines, words or 'STRAND:word' keys – a key's word counts as said when it occurs as a word in any of them
function saidList(o) {
  const out = [];
  for (const x of [].concat(o.said || [])) { if (typeof x !== 'string' || !x) continue; out.push(x.indexOf(':') > 0 && !/\s/.test(x) ? x.slice(x.lastIndexOf(':') + 1) : x); }
  return out;
}
function saidHas(said, key) {
  if (!said.length) return false;
  const w = String(key).slice(String(key).lastIndexOf(':') + 1).toLowerCase(); if (!w || /^\d+$/.test(w)) return false;
  // the same match as banks.js inPrompt: the word itself or an inflected form (rose → rosene: ≤ 2 letters more, words ≥ 3 letters)
  return said.some(x => String(x).toLowerCase().split(/[^a-zæøåé]+/).some(t => t === w || (w.length >= 3 && t.startsWith(w) && t.length - w.length <= 2)));
}
function next(o) {
  o = o || {};
  const r = o.rng || Math.random;
  const saidW = saidList(o);
  let d = null, it = null; const excl = [];
  for (let tries = 0; tries < 4 && !it; tries++) {
    d = decide(o, excl); if (!d) return null;
    const st = stOf(d.s), p = d.plan;
    let key = p.key || null;
    if (!key && p.kind === 'safe') {
      const ks = Object.keys(S.items).filter(k => keyStrand(k) === d.s && S.items[k].box >= 3 && fitsKey(d.s, p.rung, k));
      if (ks.length) key = ks[Math.floor(r() * ks.length)];
    }
    let preferred = null;
    if (!key && p.kind === 'normal' && Array.isArray(o.prefer) && o.prefer.length) {
      const rk = recentKeys(4);
      // C6: a preferred (story) key whose word was just spoken or shown (o.said) is no reading / writing task
      const ks = o.prefer.filter(k => typeof k === 'string' && keyStrand(k) === d.s && fitsKey(d.s, p.rung, k) && !saidHas(saidW, k));
      const fresh = ks.filter(k => !rk.includes(k));
      const pool = fresh.length ? fresh : ks;
      if (pool.length && r() < TH.preferP) { key = pool[Math.floor(r() * pool.length)]; preferred = key; }
    }
    const gd = guarded(st);
    // v5: o.said (lines / words just spoken or shown – hint_leaks C6, logic C6) and o.theme (the animal's world in an encounter:
    // {sp, count, countSg, countPl, things:[models], pattern, sortFeat, animal, habitat}) reach the generators; o.avoidKeys (keys the
    // caller used lately, e.g. the last encounter) join the engine's recent keys
    const avoidK = recentKeys(TH.recentKeys).concat(Array.isArray(o.avoidKeys) ? o.avoidKeys : []);
    it = genItem(d.s, p.rung, p.sup, { kind: p.kind, key, rng: r, conf: S.conf, format: d.fm, tag: p.tag, need: o.need,
      avoid: avoidK, isNew: false, sub: o.sub, think: thinkOf(d.s, p.rung), nChoices: Math.max(gd ? 6 : 0, +o.nChoices || 0) || undefined,
      said: saidW.length ? saidW : undefined, theme: themeOf(o.theme || encSp(o)) || undefined, place: o.place || undefined });
    if (!it) { if (o.force) return null; mem.dry[d.s] = S.taskNo + TH.dryTasks; excl.push(d.s); continue; }
    delete mem.dry[d.s];
    if (it.params && it.params.themed && !it.themed) it.themed = it.params.themed;
    if (gd) it.guard = true;
    if (preferred && it.key === preferred) it.preferred = true;
  }
  if (!it) return null;
  const st = stOf(d.s), p = d.plan;
  it.id = 'it_' + S.taskNo + '_' + (++idSeq);
  it.format = d.fm; it.kind = p.kind;
  it.family = family(d.fm);
  it.at = { rung: st.rung, sup: st.sup };
  // v4 item contract: g / mode / think / secret
  const sp = fmtSpec(d.fm);
  // the generator's g/mode describe its default presentation; an old format without spec.g/mode shows it its own way (gFor)
  if (FMT[d.fm] && !(sp && (sp.mode || sp.g != null))) { it.gBank = it.g; it.g = gFor(it, sp); it.mode = PRODUCE.includes(d.fm) ? 'keypad' : Array.isArray(it.target) ? 'order' : 'chips'; }
  if (sp && sp.mode && !it.mode) it.mode = sp.mode;
  if (!it.mode) it.mode = Array.isArray(it.choices) ? (Array.isArray(it.target) ? 'order' : 'chips') : PRODUCE.includes(d.fm) ? 'keypad' : null;
  if (typeof it.g !== 'number') it.g = gFor(it, sp);
  if (!it.think) it.think = thinkOf(d.s, p.rung);
  if (it.secret == null) it.secret = [];
  else if (!Array.isArray(it.secret)) it.secret = [it.secret];
  if (p.offLevel) it.offLevel = true;
  if (o.need || (it.params && it.params.kind === 'need')) it.ladderFree = true;
  if (p.kind === 'intro') { it.intro = true; it.ladderFree = true; }
  if (p.kind === 'preview') it.preview = true;      // rung+1 at s0: no ladder effect (not on-level), a miss does not count as evidence
  if (p.prov) it.prov = p.prov;
  if (p.rungReview) it.rungReview = true;
  if (p.why) it.why = p.why;
  if (p.setFacts && p.setFacts.length && it.params) it.params.setFacts = p.setFacts.filter(k => k !== it.key);   // F47 asks them as its other gates
  if (p.kind === 'challenge') { it.golden = true; it.testOut = true; }
  if (p.kind === 'stretch') { it.golden = true; it.offLevel = true; it.stretch = true; }
  if (o.trial) it.trial = true;
  if (d.s === 'SKRIV' && it.sup === 0 && !S.items[it.key]) it.params.ghost = true;
  return it;
}

/* ---------------------------------------------------------------- report */
function ev(events, type, strand, rung, extra) { events.push(Object.assign({ type, strand, rung }, extra || {})); }
function tl(st, today) { push(st.tl, [today, st.rung, st.sup, S.taskNo], 300); }
// v5r2b: a running session number – S.sessions keeps only the last 60, so its length stopped at 60 and after ~60 sessions every
// «once per session» rule (gate checks, the keep rule, single-format mastery «A's in 2 sessions», spin) saw one endless session
function curSess() { return typeof S.sessN === 'number' ? S.sessN : S.sessions.length; }
function setRung(st, s, rung, sup, events, today, why) {
  const old = st.rung;
  const l = lad(s); if (l.length) rung = l[idxOf(l, Math.max(l[0], Math.min(l[l.length - 1], rung)))];
  st.rung = rung; st.sup = sup; st.sw = []; st.rw = []; st.streak = []; st.cw = []; st.fluWait = 0;
  if (rung > old) ev(events, 'rungUp', s, rung, { from: old, why });
  else if (rung < old) ev(events, 'rungDown', s, rung, { from: old, why });
  if (rung > (st.best || 0) && why !== 'challenge' && why !== 'placement') { const ses = S.sessions[S.sessions.length - 1]; if (ses) ses.newRungs = (ses.newRungs || 0) + 1; }
  st.best = Math.max(st.best || 0, rung);
  tl(st, today);
}
function pass(st, s, rung, events, provisional) {
  if (st.passed[rung]) { if (!provisional) delete st.provisional[rung]; return; }
  st.passed[rung] = 1; if (provisional) st.provisional[rung] = 1;
  ev(events, 'floorAdded', s, rung, { provisional: !!provisional });
}
function leitner(key, out, today, rung) {
  const e = S.items[key] || (S.items[key] = { box: 0, due: 0, dueDay: 0, n: 0, err: 0, a: 0, last: 0 });
  e.n++; e.last = S.taskNo; if (rung != null) e.r = rung;
  if (out === 'A') {
    const prev = e.box; e.a++;
    e.box = Math.min(7, e.box + 1);
    // boxes 1–2 within a session (5 / 10 tasks), then days 1 / 3 / 7 / 21 / 60 / 120 (v4 §4.4)
    if (e.box === 1) e.due = S.taskNo + 5;
    else if (e.box === 2) e.due = S.taskNo + 10;
    else e.dueDay = today + TH.reviewDays[Math.min(TH.reviewDays.length - 1, e.box - 3 + (prev === 7 ? 1 : 0))];
    if (e.box >= 2) { const i = S.ovebank.indexOf(key); if (i >= 0) S.ovebank.splice(i, 1); }
  } else {
    e.err++; e.box = 0; e.due = S.taskNo + 2;
    if (!S.ovebank.includes(key)) { S.ovebank.push(key); if (S.ovebank.length > 40) S.ovebank.shift(); }
  }
}
function wrongValues(item, res) {
  const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  const acc = Array.isArray(item.target) ? item.target : item.accept && item.accept.length ? item.accept : [item.target];
  return (res.chosen || []).filter(v => !Array.isArray(v) && !acc.some(a => same(a, v)));
}
function tagOf(item, v) {
  const d = (item.distractors || []).find(x => String(x.v).toLowerCase() === String(v).toLowerCase());
  if (d && d.tag) return d.tag;
  const B = F.BANKS || {};
  if (/^T-/.test(item.strand) && /^\d+$/.test(String(v)) && /^\d+$/.test(String(item.target)) && B.tagNum) return B.tagNum(item.target, v);
  if (typeof item.target === 'string' && B.tagWord && OLD[item.strand]) return B.tagWord(item.target, v);
  return 'OTHER';
}
// v5 (playtest early taps): the number of fast taps on WRONG values. The stage reports res.wrongFast when it knows it (WP-K2);
// otherwise: fastWrong − rapid = the early wrong taps + the fast judged wrong taps (always wrong); the unjudged rapid taps count only when
// the item did not end right on the first judged try. null = no tap data at all (a bare report: counts as before).
function wrongFast(item, res, out) {
  if (typeof res.wrongFast === 'number') return res.wrongFast;
  const has = k => typeof res[k] === 'number';
  if (typeof res.rapidWrong === 'number') return res.rapidWrong + Math.max(0, (+res.fastWrong || 0) - (+res.rapid || 0));
  if (!has('fastWrong') && !has('rapid')) return out === 'R' ? null : 0;
  const fwN = +res.fastWrong || 0, rp = +res.rapid || 0, sure = Math.max(0, fwN - rp);
  if (out === 'A' || out === 'R') return sure;
  return sure + rp;
}
// v5: F47 res.facts [{q, a, ms, first}] → the Leitner key of each fact (the registry's fits() decides which form the rung uses)
function factKeys(s, rung, q, a) {
  const t = String(q).replace(/−/g, '-').replace(/\s+/g, '').replace(/=\?$/, '');
  let m, c = [];
  if ((m = /^(\d+)\+\?=(\d+)$/.exec(t))) c.push('10=' + m[1] + '+' + a, m[1] + '+' + a);
  else if ((m = /^(\d+)\+(\d+)$/.exec(t))) c.push(m[1] + '+' + m[2]);
  else if ((m = /^(\d+)-(\d+)$/.exec(t))) { c.push(a + '+' + m[2], m[1] + '-' + m[2], m[2] + '+' + a); if (+m[1] === 2 * +m[2]) c.push('half' + m[1]); if (+m[1] === 10) c.push('10=' + m[2] + '+' + a); }
  return c.map(x => s + ':' + x);
}
function factLeitner(s, item, facts, today) {
  for (const f of facts) {
    if (!f || f.q == null) continue;
    const k = factKeys(s, item.rung, f.q, f.a).find(x => fitsKey(s, item.rung, x));
    if (!k || k === item.key) continue;
    leitner(k, f.first ? 'A' : 'B', today, item.rung);
  }
}
// v4 mastery code checks for a rung-up (SYNTHESIS §2.1)
// (v5r2: a rung may set its own goal – REGN 12 rr.fluMs, a worked 2-digit complement – else TH.fluMs)
function fluOk(st, rung, s) {
  const a = st.rtA[rung] || [], rr = s ? rungRec(s, rung) : null; if (a.length < Math.min(3, TH.fluN)) return false;
  return median(last(a, TH.fluN)) <= ((rr && rr.fluMs) || TH.fluMs);
}
function setFracOk(s, rung) {
  const rr = rungRec(s, rung); const facts = F.BANKS && F.BANKS.regFacts ? F.BANKS.regFacts(s, rung) : null;
  if (!facts || !facts.length) return true;
  const n = facts.filter(k => S.items[k] && S.items[k].box >= 3).length;
  // v5r2b: REGN 8's 121 facts include ~40 trivial ones (+0, +1, +10) that F47 almost never asks – «90 % of all 121» was out of reach
  // for every child who climbed R8 (REGN 11 never opened). A non-teach deck counts the facts she has MET (≥ setMinMet of them, so
  // a handful of easy facts never makes Gold); a teach deck (VIT, Or-T / Or-U) is taught in full first and keeps the whole deck
  if (rr && !rr.teach) {
    const met = facts.filter(k => S.items[k] && S.items[k].n > 0).length;
    return met >= Math.min(facts.length, TH.setMinMet) && n / met >= (rr.setFrac || 0.85);
  }
  return n / facts.length >= ((rr && rr.setFrac) || 0.85);
}
// v5r2b: a «Set» deck that is no teach deck (REGN 8): its fact check applies however she got past the rung – climbed (setPend), jumped by
// a challenge or placed (before, a jumper got Gold with 5 % of the facts known while a climber waited for 90 %)
const isSetDeck = (s, r) => { const rr = rungRec(s, r); return !!(rr && rr.code === 'Set' && !rr.teach); };
const setShort = (s, st, r) => (st.setPend[r] || isSetDeck(s, r)) && !setFracOk(s, r);
// the facts the Set check asks next (F47: 5 gates – the item's key + params.setFacts): her weakest met facts (lowest box, longest ago),
// and while she has met fewer than setMinMet facts, facts she has not met yet fill the rest (a fact once per item, never a known one)
function setKeys(s, r, n) {
  const facts = F.BANKS && F.BANKS.regFacts ? F.BANKS.regFacts(s, r) : null; if (!facts || !facts.length) return [];
  const met = facts.filter(k => S.items[k] && S.items[k].n > 0);
  const weak = met.filter(k => S.items[k].box < 3).sort((a, b) => (S.items[a].box - S.items[b].box) || (S.items[a].last - S.items[b].last));
  let out = weak.slice(0, n);
  if (met.length < Math.min(facts.length, TH.setMinMet)) {
    const un = facts.filter(k => !(S.items[k] && S.items[k].n > 0)), k0 = S.taskNo % Math.max(1, un.length);
    out = un.slice(k0).concat(un.slice(0, k0)).slice(0, Math.max(1, n - Math.min(2, weak.length))).concat(weak.slice(0, 2)).slice(0, n);
  }
  return out;
}
function rungUpOk(s, st) {
  // the twin rule (and credit by g) – see twinRule(); the engine prefers production formats ×3 while the twin is missing
  const rung = st.rung, tw = twinRule(s, st, rung);
  // the outcome window is today's st.sw (s2 items since the last change); st.cw holds the g of each entry (aligned from the end;
  // an entry without g – e.g. a test that sets st.sw by hand – counts as a production item)
  const win = last(st.sw, TH.rungUpWin), cg = last(st.cw, win.length), off = win.length - cg.length;
  const cred = win.reduce((a, x, i) => a + (x === 'A' ? (tw ? creditOf(i >= off ? cg[i - off] : 0.01) : 1) : 0), 0);
  if (cred < TH.rungUpCredit - 1e-9) return false;
  if (tw && !st.twin[rung]) return false;
  const rr = rungRec(s, rung);
  const needFlu = rr && (rr.code === 'Flu' || rr.flu || (rr.fluS2 && st.sup === 2));
  if (needFlu && !fluOk(st, rung, s)) {
    st.fluWait = (st.fluWait || 0) + 1;
    if (st.fluWait < TH.fluWaitN) return false;
    st.fluPend[rung] = 1;            // valve: she passes; Gold waits for fluency (silent RT – no timer is ever shown)
  }
  if (rr && rr.code === 'Set') st.setPend[rung] = 1;
  return true;
}
function goldCheck(s, st, rung, events, today) {
  if (st.gold[rung] || !st.mastered[rung]) return;
  if (!(st.mDay[rung] != null && today > st.mDay[rung])) return;
  if (st.fluPend[rung] && !fluOk(st, rung, s)) return;
  if ((st.setPend[rung] || isSetDeck(s, rung)) && !setFracOk(s, rung)) return;
  delete st.fluPend[rung]; delete st.setPend[rung];
  st.gold[rung] = 1; ladMemo = {}; ev(events, 'gold', s, rung);
}

function report(item, res, opts) {
  bound(); opts = opts || {}; touch();
  const events = [];
  const OUTS = ['A', 'B', 'C', 'R', 'H'];
  if (!item || !item.strand || !res || !OUTS.includes(res.outcome) || !strandIds().includes(item.strand)) return { coins: 0, bonus: 0, events, outcome: res && res.outcome };
  const now = opts.now || res.now || Date.now(), today = dayOf(now);
  if (!S.lastAt || now - S.lastAt > 30 * 60000 || dayOf(S.lastAt) !== today) newSession(now);
  S.lastAt = now; mem.fmtLast = item.format || null;
  const s = item.strand, st = stOf(s), ms = +res.ms || 0;
  const spec = item.format ? fmtSpec(item.format) : null;
  // the stage reports the g of what it really presented (res.g: a re-deal / production twin / widget default) – it wins over the item's
  const g = typeof res.g === 'number' && isFinite(res.g) ? res.g : typeof item.g === 'number' ? item.g : gFor(item, spec);
  if (res.mode && !item.mode) item.mode = res.mode;
  // v4 rapid guess R: no evidence, no coins – logged for variety, feeds the guess guard; 2 R in a row → production-only items
  if (res.outcome === 'R') {
    S.taskNo++;
    push(S.log, [today, S.taskNo, item.format || null, item.key, 'R', ms, item.rung, item.sup, item.kind, s, item.think || thinkOf(s, item.rung), item.mode || null, g], 200);
    // v5 (playtest early taps): an R whose fast taps were all RIGHT is no guess – no evidence and no coins still, but it never feeds
    // the guess guard or the 2-R production switch (wrongFast() – a bare R without any tap data counts as before)
    const wf = wrongFast(item, res, 'R');
    if (wf == null || wf > 0) {
      push(st.fw = st.fw || [], 1, TH.fwWin);
      st.rapidRun = (st.rapidRun || 0) + 1;
      if (st.rapidRun >= 2) { st.prodOnly = TH.rapidProdN; st.rapidRun = 0; }
    }
    persist();
    return finish(events, 'R', item.kind || 'normal', false, opts, item);
  }
  st.rapidRun = 0;
  // v4 H («Hjelp meg» then solved) = B for the engine; an A with usedHelp is an H
  let out = res.outcome === 'A' && !res.usedHelp ? 'A' : res.outcome === 'C' ? 'C' : 'B';
  const helped = res.outcome === 'H' || !!res.usedHelp;
  // v4 Flu: a slow correct answer on a fluency format counts B (silently) and routes to the strategy formats
  // (only on on-level practice at full difficulty – never on intro / placement / test-out / checks)
  // v5 (WP-K request): response time for Flu = from the gate opening to her first answer (res.rtFirst, seconds) – res.ms includes the
  // prompt and the gate; F47's res.medianMs (first-try facts) wins where a format times several facts itself
  const rt = typeof res.medianMs === 'number' && isFinite(res.medianMs) ? res.medianMs
    : typeof res.rtFirst === 'number' && isFinite(res.rtFirst) ? Math.round(res.rtFirst * 1000) : ms;
  // (v5r2: a rung's own limit wins – REGN 11/12 rr.slowMs = F47's 12 s: a worked 2-digit sum is never B for thinking)
  const slowLim = ((rungRec(s, item.rung) || {}).slowMs) || TH.fluSlowMs;
  if (out === 'A' && (item.fluency || (spec && spec.fluency)) && rt > slowLim && item.sup === 2 && ['normal', 'review', 'contrast', 'ovebank'].includes(item.kind)) { out = 'B'; item.slowA = true; }
  const A = out === 'A';
  // a slow correct fluency answer routes the next items of the strand to the strategy formats (non-fluency formats preferred)
  if (item.slowA || res.slow) st.stratN = 3; else if (st.stratN > 0) st.stratN--;
  if (item.format === 'F12' && item.params && item.params.support) { persist(); return finish(events, out, 'practice', A, opts, item); }
  S.taskNo++;
  if (st.prodOnly > 0) st.prodOnly--;
  const ses = S.sessions[S.sessions.length - 1]; if (ses) { if (item.kind === 'warmup') ses.warm = (ses.warm || 0) + 1; ses.tasks = (ses.tasks || 0) + 1; ses.A = (ses.A || 0) + (A ? 1 : 0); ses.min = Math.round((now - ses.start) / 6000) / 10; }
  st.lastTask = S.taskNo; st.n++; if (A) st.nA++; st.sess++;
  const challengeMiss = (item.kind === 'challenge' || item.kind === 'stretch') && !A;
  // v5: only fast taps on WRONG values feed the guess guard (a right early / rapid tap never does – playtest early taps)
  const fw = (wrongFast(item, res, out) || 0) > 0;
  const wasG = guarded(st);
  push(st.fw = st.fw || [], fw ? 1 : 0, TH.fwWin);
  // SYNTHESIS §5.2 E/N: when the guess guard trips, the strand's next 8 items are production-only and it gives way to other domains
  if (!wasG && guarded(st)) st.prodOnly = Math.max(st.prodOnly || 0, TH.rapidProdN);
  const calmBlock = A && !!st.prevFW;
  st.prevFW = fw;
  const k0 = item.ladderFree ? 'free' : item.kind || 'normal';
  const previewItem = k0 === 'preview';
  if (!challengeMiss) { push(S.recent, out, 6); if (!previewItem && !item.intro) push(st.h20, out, 20); }
  push(S.log, [today, S.taskNo, item.format || null, item.key, out, ms, item.rung, item.sup, item.kind, s, item.think || thinkOf(s, item.rung), item.mode || (item.format ? fmtMode(item.format) : null), g], 200);
  if (A && item.format) push(S.fmtRT[item.format] = S.fmtRT[item.format] || [], ms, 15);
  // v4 formats whose g/mode depend on the item (spec.g a function / no spec.mode): learn them from what she meets
  if (item.format && !FMT[item.format]) { S.fmtG = S.fmtG || {}; S.fmtMode = S.fmtMode || {}; const m0 = S.fmtG[item.format]; S.fmtG[item.format] = m0 == null ? g : Math.min(m0, g); if (item.mode && item.sup > 0) S.fmtMode[item.format] = item.mode; }
  if (item.key && !challengeMiss && !(previewItem && !A) && !item.intro) leitner(item.key, out, today, item.rung);
  // confusion matrix + misconception tags (+ contrast trigger)
  let wrong = wrongValues(item, res);
  const hasTags = Array.isArray(res.tags);
  if (hasTags && wrong.length !== res.tags.length) wrong = [];
  const numT = /^T-/.test(s) && !Array.isArray(item.target) && /^\d+$/.test(String(item.target));
  wrong = wrong.filter(v => (numT ? /^\d+$/.test(String(v)) : typeof v === 'string' && /^[a-zæøå ]+$/i.test(v)));
  const tags = (hasTags ? res.tags : wrong.map(v => tagOf(item, v))).filter(Boolean);
  if (OLD[s]) wrong.forEach(v => { const k = String(Array.isArray(item.target) ? item.n : item.target) + '>' + v; S.conf[k] = (S.conf[k] || 0) + 1; });
  const cTags = F.BANKS && F.BANKS.contrastTags ? F.BANKS.contrastTags(s) : [];
  for (const tg of tags) {
    if (tg === 'OTHER' || tg === 'CHANGED') continue;     // v5 WP-K3: F38's CHANGED (the edited position) is neutral like OTHER
    push(S.tags[tg] = S.tags[tg] || [], S.taskNo, 50);
    push(st.tagLog, [tg, st.n], 30);
    if (cTags.includes(tg) && !(st.contrast && st.contrast.left > 0)) {
      const recent = st.tagLog.filter(x => x[0] === tg && st.n - x[1] < TH.contrastWin);
      if (recent.length >= 2) { st.contrast = { tag: tg, left: TH.contrastN }; st.tagLog = st.tagLog.filter(x => x[0] !== tg); ev(events, 'contrast', s, st.rung, { tag: tg }); }
    }
  }
  // global safety flags
  if (item.why === 'gate') {
    (st.gateSess = st.gateSess || {})[item.rung] = curSess();
    if (st.mastered[item.rung] && isSetDeck(s, item.rung)) { const sc = st.setChk = st.setChk || {}, c = sc[item.rung]; sc[item.rung] = [curSess(), c && c[0] === curSess() ? c[1] + 1 : 1, S.taskNo]; }
  }
  if (item.kind === 'safe') { if (item.why === 'wall') S.wall = false; if (item.why === 'afterC' || item.why === 'wall') S.safeC = false; if (item.why === 'bridge' && st.bridge > 0) st.bridge--; }
  // after a C the next item is an easier one – v5: not after ONE isolated C of a child who is doing well (the 5 items before it were
  // all A); two non-A in a row still bring the wall's safety item (DESIGN4 §2.11 gate 3)
  if (out === 'C' && !challengeMiss && !(S.recent.length >= 6 && countA(S.recent) >= 5)) S.safeC = true;
  const r2 = last(S.recent, TH.wallRun);
  if (!challengeMiss && r2.length === TH.wallRun && r2.every(x => x !== 'A')) S.wall = true;
  // mastery tracking: every s2 item at a rung counts (on-level, reviews, interleaved …)
  if (item.sup === 2 && !challengeMiss && !item.offLevel && !item.ladderFree) {
    const m = st.m2[item.rung] = st.m2[item.rung] || [];
    push(m, [out, item.format || '?', curSess()], TH.masteryWin);
    const win = last(m, TH.masteryWin);
    // varied evidence: A's on ≥ 2 formats – v5r2: where only ONE format serves the rung (REGN 8 / T-MENGDE 14), A's in ≥ 2 sessions instead
    const vA = i => new Set(win.filter(x => x[0] === 'A').map(x => x[i])).size >= 2;
    if (!st.mastered[item.rung] && (st.passed[item.rung] || item.rung === topR(s)) && countA(win.map(x => x[0])) >= TH.masteryA && (fmtsAt(s, item.rung) >= 2 ? vA(1) : vA(2))) {
      st.mastered[item.rung] = 1; st.mDay[item.rung] = today; st.rev[item.rung] = { step: 0, dueDay: today + TH.reviewDays[0] };
      ev(events, 'mastered', s, item.rung);
    }
  }
  if (A && item.format) { const fa = st.formatsA[item.rung] = st.formatsA[item.rung] || []; if (!fa.includes(item.format)) fa.push(item.format); }
  // v4: the twin (an A on a production item at the rung) + response times of A's (Flu)
  if (A && !item.ladderFree && g <= TH.twinG && !calmBlock) st.twin[item.rung] = 1;
  if (g <= TH.twinG && !item.ladderFree) st.twinOpp[item.rung] = (st.twinOpp[item.rung] || 0) + 1;
  if (A && !item.ladderFree) push(st.rtA[item.rung] = st.rtA[item.rung] || [], rt, 8);
  // v5 (WP-N request): F47 times 5 facts in one task – each fact gets its own Leitner entry (R8 «Set»: 121 facts; R1 / R3 sets too)
  if (Array.isArray(res.facts) && res.facts.length && !item.ladderFree && !challengeMiss) factLeitner(s, item, res.facts, today);
  // v5r2b: Gold on a mastered Set rung waits for the fact deck, not for the next rung review (3–60 days later): an A at full difficulty
  // on the rung on a later day, or the delayed rung check already passed (rev.step ≥ 1), lets goldCheck look again once the deck is in
  for (const r of gateNeeds(s)) if (isSetDeck(s, r) && st.mastered[r] && !st.gold[r] && ((item.rung === r && A && item.sup === 2 && !item.ladderFree) || ((st.rev[r] || {}).step || 0) >= 1))
    goldCheck(s, st, r, events, today);
  if (typeof res.dist === 'number' && isFinite(res.dist)) push(st.dist = st.dist || [], [item.rung, Math.round(res.dist * 10) / 10], 20);   // F44 line distance (parent page)
  // help streaks (H) → bridge item (help-abuse guard, SYNTHESIS §5.2 H)
  if (helped) { st.helpRun = (st.helpRun || 0) + 1; if (st.helpRun >= TH.helpBridgeN) { st.bridge = 2; st.helpRun = 0; ev(events, 'bridge', s, st.rung, { why: 'help' }); } }
  else if (A) st.helpRun = 0;

  // ---------------- kind-specific
  const k = k0;
  if (k === 'free' && item.intro) st.introDone = true;
  if (k === 'placement') {
    if (!st.placed) { st.plStart = st.rung; st.plA = 0; st.plOk = {}; }
    st.placed++;
    const L = lad(s);
    const plStart = st.plStart || TH.placementStart;
    let capR = OLD[s] ? Math.max((TH.placementCap && TH.placementCap[s]) || topR(s), plStart > TH.placementStart ? step(s, plStart, TH.placementUp) : plStart)
      : (L2 => L2[Math.max(0, L2.length - 2)])(L.filter(r => r <= jumpTop(s)));
    let nr;
    if (!A) nr = step(s, item.rung, -TH.placementDown);
    else if (item.offLevel && item.rung < st.rung) nr = st.rung;
    else { (st.plOk = st.plOk || {})[item.rung] = 1; nr = Math.min(capR, step(s, item.rung, st.plA ? TH.placementUp2 : TH.placementUp)); st.plA = (st.plA || 0) + 1; }
    st.rung = L.length ? L[idxOf(L, Math.max(L[0], Math.min(topR(s), nr)))] : nr; st.sup = 1;
    if (st.placed >= plN(s)) {
      let pi = 0;
      for (const rr of L) {
        if (rr >= st.rung || st.passed[rr]) continue;
        if (rr < plStart || (st.plOk && st.plOk[rr])) { st.passed[rr] = 1; ev(events, 'floorAdded', s, rr, { placed: true }); }
        else { pass(st, s, rr, events, true); st.prov.push({ rung: rr, dueTask: S.taskNo + 2 + TH.provSpacing * (pi++) }); }
      }
      st.sw = []; st.rw = []; st.hist = []; st.streak = []; st.cw = []; st.probation = TH.probationN; st.probMiss = false;
      st.best = Math.max(st.best || 0, st.rung);
      ev(events, 'placed', s, st.rung);
      tl(st, today);
      // v4 §8: a placement without a single miss → straight into a «hopp over» test-out (she must never climb through rungs she masters)
      if (st.plA >= st.placed && st.rung < topR(s) && challengeTo(s, st) != null) { st.challenge = { to: challengeTo(s, st), n: 0 }; ev(events, 'challengeReady', s, st.rung, { after: 'placement' }); }
    }
  } else if (k === 'challenge') {
    // v4 «hopp over» (test-out): TH.testOutN first-try items at rung+2; a miss is free and ends it
    const ch = st.challenge && typeof st.challenge === 'object' ? st.challenge : { to: item.rung, n: 0 };
    if (A) {
      ch.n = (ch.n || 0) + 1; ch.to = item.rung;
      if (ch.n >= TH.testOutN || item.rung <= st.rung) {
        st.challenge = false; st.streak = [];
        const from = st.rung, to = Math.min(topR(s), item.rung);
        for (const rr of lad(s)) if (rr >= from && rr < to) pass(st, s, rr, events, true);
        st.prov = st.prov.filter(p => p.rung < from);
        let i = 0; for (const rr of lad(s)) if (rr >= from && rr < to) st.prov.push({ rung: rr, dueTask: S.taskNo + 2 + TH.provSpacing * (i++) });
        setRung(st, s, to, 1, events, today, 'challenge');
        st.probation = 0;
        ev(events, 'challenge', s, to, { ok: true });
        push(st.hist, 'A', 8);
        // a passed test-out offers the next one at once (a chain while every item is first-try right; a miss ends it)
        if (st.rung < topR(s) && challengeTo(s, st) != null) st.challenge = { to: challengeTo(s, st), n: 0 };
      } else { st.challenge = ch; ev(events, 'challengeStep', s, item.rung, { n: ch.n }); }
    } else { st.challenge = false; st.streak = []; st.toBlock = st.rung; ev(events, 'challenge', s, item.rung, { ok: false }); }
  } else if (k === 'provcheck') {
    st.prov = st.prov.filter(p => p.rung !== item.prov);
    if (A) delete st.provisional[item.prov];
    else if (out === 'B' && dist(s, st.rung, item.prov) > 1) {
      ev(events, 'provFail', s, item.prov, { soft: true });
      st.prov.push({ rung: item.prov, dueTask: S.taskNo + TH.provSpacing });
      setRung(st, s, step(s, st.rung, -1), 1, events, today, 'provcheck');
    } else {
      st.prov = st.prov.filter(p => p.rung < item.prov);
      for (const r3 in st.provisional) if (+r3 >= item.prov) delete st.provisional[r3];
      ev(events, 'provFail', s, item.prov);
      if (st.rung > item.prov) setRung(st, s, item.prov, 1, events, today, 'provcheck');
    }
  } else if (k === 'review' && item.rungReview) {
    const rv = st.rev[item.rung] || { step: 0 };
    if (A) {
      rv.step = Math.min(TH.reviewDays.length - 1, rv.step + 1); rv.dueDay = today + TH.reviewDays[rv.step]; delete st.ovIgjen[item.rung];
      goldCheck(s, st, item.rung, events, today);
    } else {
      st.ovIgjen[item.rung] = 1; rv.step = 0; rv.dueDay = today + 1; ev(events, 'reviewFail', s, item.rung);
      if (st.gold[item.rung]) { delete st.gold[item.rung]; ladMemo = {}; ev(events, 'goldLost', s, item.rung); }   // «øv igjen»: gates close until Gold again
    }
    st.rev[item.rung] = rv;
  }
  if (k === 'safe' && !A && !placedDone(s, st) && st.rung > firstR(s)) st.rung = step(s, st.rung, -1);
  if (k === 'safe' && !A && placedDone(s, st) && st.rung > item.rung && st.rung > firstR(s)) setRung(st, s, step(s, st.rung, -1), 1, events, today, 'safeFail');
  if (k === 'contrast' && st.contrast) { st.contrast.left--; if (st.contrast.left <= 0) st.contrast = null; }
  if (st.famAvoid && st.famAvoid.left > 0) { st.famAvoid.left--; if (!st.famAvoid.left) st.famAvoid = null; }

  // ---------------- on-level adaptive rules (DESIGN §9.4 rules 1–6)
  const onLevel = !item.offLevel && item.rung === st.rung && item.sup === st.sup && placedDone(s, st) &&
    (k === 'normal' || k === 'contrast' || k === 'review' || k === 'ovebank') && !(k === 'review' && item.rungReview);
  if (onLevel) {
    push(st.hist, out, 8);
    if (!calmBlock) {
      // the twin conversion: a production item that is not A turns the unconfirmed chip A's before it into B (SYNTHESIS §5.2 C)
      if (!A && g <= TH.twinG && st.sup === 2) {
        const off = st.sw.length - st.cw.length;
        for (let i = st.cw.length - 1; i >= 0 && st.cw[i] > TH.twinG; i--) if (st.sw[i + off] === 'A' && st.cw[i] >= TH.chipG) st.sw[i + off] = 'B';
      }
      push(st.sw, out, 8); push(st.cw, g, 8); push(st.rw, out, 8);
    }
    if (A && !calmBlock) {
      const med = median(S.fmtRT[item.format] || []);
      const lim = Math.max(TH.fastMs, TH.fastMult * (med || 0));
      if (ms <= lim) st.streak.push(ms); else st.streak = [];
    } else st.streak = [];
    // wheel-spinning guard bookkeeping (12 on-level items at one rung across ≥ 2 sessions)
    // (counted since her best rung last rose – a child who oscillates R3 ↔ R4 ↔ R5 without a new best is spinning too)
    const sc = st.spinC.b = st.spinC.b && st.spinC.b.best === (st.best || 0) ? st.spinC.b : { best: st.best || 0, n: 0, sess: [] };
    sc.n++; if (A) sc.a = (sc.a || 0) + 1; if (!sc.sess.includes(curSess())) sc.sess.push(curSess());
    if (st.probation > 0) {
      st.probation--;
      if (!A && st.rung > firstR(s)) { const drop = !st.probMiss ? TH.placementUp : 1; st.probMiss = true;
        setRung(st, s, step(s, st.rung, -drop), 1, events, today, 'probation'); persist(); return finish(events, out, k, A, opts, item, g, helped); }
    }
    const h6 = last(st.hist, TH.collapseWin), sw4 = last(st.sw, TH.supDownWin);
    // §4.2 load limit: ≤ 2 brand-new rungs a session (all strands; placement and «hopp over» jumps do not count – she proved those)
    const sesN = S.sessions.length ? S.sessions[S.sessions.length - 1].newRungs || 0 : 0;
    const sessCap = sesN >= TH.newRungsPerSession && step(s, st.rung, 1) > (st.best || 0);
    if (!A && h6.length >= TH.collapseWin && countA(h6) / h6.length < TH.collapseRate) {
      const fam = item.family || family(item.format);
      setRung(st, s, step(s, st.rung, -TH.collapseDrop), 1, events, today, 'collapse');
      st.hist = []; st.famAvoid = { fam, left: TH.famSwitchN };
      // struggle valve: two collapses in 7 days halve the strand's weight for 3 days
      st.collapses = st.collapses.filter(d => today - d < TH.valveDays); st.collapses.push(today);
      if (st.collapses.length >= TH.valveN) { st.valve = today + TH.valveFor; st.collapses = []; ev(events, 'valve', s, st.rung); }
    } else if (!A && st.sup === 0 && last(st.sw, TH.rungDownWin).filter(x => x !== 'A').length >= TH.rungDownN) {
      // v5r fix1 (review #4): a rung she already passed and still mostly gets right is kept – 2 bridge items at rung−1, then back
      // v5r2: «mostly right» is the rung's long-run record at full difficulty (st.m2: her s2 items there – on-level, reviews, gate checks –
      // kept across visits); st.rw always held this slump's own misses (s2 miss → s1 miss → s0 2 of 3), so the rule could never fire.
      // Once a session per rung: missing again after the bridge the same day is no bad moment – the rung goes (collapse still wins above)
      const rk = last((st.m2[st.rung] || []).map(x => x[0]), TH.keepWin), kTag = curSess() + ':' + st.rung;
      const keep = !!(st.passed && st.passed[st.rung]) && rk.length >= 4 && countA(rk) / rk.length >= TH.keepPassAcc && st.keptAt !== kTag;
      if (keep) { st.keptAt = kTag; st.bridge = Math.max(st.bridge || 0, 2); st.sw = []; st.cw = []; ev(events, 'bridge', s, st.rung, { why: 'keep' }); }
      else if (st.rung > firstR(s)) setRung(st, s, step(s, st.rung, -1), 1, events, today, 'down');
      else { st.sw = []; st.cw = []; }
    } else if (!A && st.sup > 0 && sw4.filter(x => x !== 'A').length >= ((acc20(st) != null && acc20(st) < TH.supDownWeakAcc) ? TH.supDownWeakN : TH.supDownN)) {
      st.sup--; st.sw = []; st.cw = []; st.streak = []; ev(events, 'supDown', s, st.rung, { sup: st.sup }); tl(st, today);
    } else if (A && st.sup === 2 && !sessCap && rungUpOk(s, st)) {
      pass(st, s, st.rung, events, false);
      const ua = acc20(st);
      if (st.rung < topR(s)) setRung(st, s, step(s, st.rung, 1), ua != null && ua >= TH.supStartAcc ? 2 : 1, events, today, 'up');
      else { st.sw = []; st.rw = []; st.cw = []; }
    } else if (A && st.sup < 2 && last(st.sw, TH.supUpRun).length === TH.supUpRun && last(st.sw, TH.supUpRun).every(x => x === 'A')) {
      st.sup++; st.sw = []; st.cw = []; ev(events, 'supUp', s, st.rung, { sup: st.sup }); tl(st, today);
    }
    // wheel-spinning guard (SYNTHESIS §4.6)
    const sc2 = st.spinC.b, resting = st.rung >= topR(s) && st.passed[st.rung];
    // v5: a child who gets ≥ 75 % of them right is climbing (credit / twin pending), not spinning – no bridge back down for her; the
    // parent page still sees the rung (spin flag, action 'watch': often a missing production format for the twin)
    if (sc2 && sc2.best === (st.best || 0) && sc2.n >= TH.spinN && sc2.sess.length >= TH.spinSess && !resting && (sc2.a || 0) / sc2.n >= TH.spinAcc) {
      st.spinFlags[st.rung] = (st.spinFlags[st.rung] || 0) + 1; ev(events, 'spin', s, st.rung, { action: 'watch' });
      sc2.n = 0; sc2.a = 0; sc2.sess = [];
    }
    if (sc2 && sc2.best === (st.best || 0) && sc2.n >= TH.spinN && sc2.sess.length >= TH.spinSess && !resting) {
      st.spinFlags[st.rung] = (st.spinFlags[st.rung] || 0) + 1;
      sc2.k = (sc2.k || 0) + 1;
      // 1st time: a bridge (2 easier items at rung−1 + a contrast block from her dominant error tag where the strand has one);
      // again without a new best: park the strand for 3 days (its share flows to the others) – both shown on the parent page
      const cnt = {}; for (const [tg, n] of st.tagLog) if (st.n - n < 30) cnt[tg] = (cnt[tg] || 0) + 1;
      const dom = Object.keys(cnt).filter(t => cTags.includes(t)).sort((a, b) => cnt[b] - cnt[a])[0];
      if (sc2.k === 1) {
        st.bridge = 2;
        if (dom && !(st.contrast && st.contrast.left > 0)) st.contrast = { tag: dom, left: TH.contrastN };
        ev(events, 'spin', s, st.rung, { action: 'bridge', tag: dom || null });
      } else { st.park = today + TH.parkDays; sc2.k = 0; ev(events, 'spin', s, st.rung, { action: 'park' }); }
      sc2.n = 0; sc2.a = 0; sc2.sess = [];
    }
    // rule 3 fast track: 3 fast A in a row → «hopp over» test-out next (v3: only while acc20 ≥ fastAcc)
    const fa = acc20(st);
    // (a failed test-out is not re-armed at the same rung – the next chance comes after a rung change)
    if (st.streak.length >= TH.fastRun && st.rung < topR(s) && !st.challenge && st.toBlock !== st.rung && (fa == null || fa >= TH.testOutAcc) && challengeTo(s, st) != null) {
      st.challenge = { to: challengeTo(s, st), n: 0 }; st.streak = []; ev(events, 'challengeReady', s, st.rung);
    }
  }
  persist();
  return finish(events, out, k, A, opts, item, g, helped);
}
function finish(events, out, k, A, opts, item, g, helped) {
  if (opts.emit && F.emit) events.forEach(e => { try { F.emit(e.type, e.strand, e.rung, e); } catch (x) { /* ignore */ } });
  const o2 = helped && out !== 'C' && out !== 'R' ? 'H' : out;
  const coins = coinsFor(Object.assign({}, item, g != null ? { g } : {}), o2, k), bonus = (k === 'challenge' || k === 'stretch') && A ? coins - COINS.A : 0;
  return { coins, bonus, events, outcome: o2, coinsByG: true };
}
// v3 §11.5 coins follow mastery; v4 §5.2 I: a chip A with g > 0.2 pays one less (min 1); economy §2: B / H / C / R 0
function coinsFor(item, out, k) {
  if (out !== 'A') return COINS[out] || 0;
  if (k === 'challenge' || k === 'stretch') return COIN_A.gold;
  if (k === 'provcheck') return COIN_A.check;
  let c;
  if (k === 'warmup' || k === 'safe' || k === 'review' || k === 'ovebank' || k === 'mix' || (item && item.offLevel && k === 'normal')) c = COIN_A.easy;
  else if (k === 'normal' || k === 'contrast' || k === 'placement') c = item && item.sup >= 2 ? COIN_A.s2 : COIN_A.s1;
  else c = COIN_A.s1;   // free (ladder-free needs, intro), practice (scripted steps), preview, F12 support
  if (item && typeof item.g === 'number' && item.g > 0.2) c = Math.max(1, c - 1);
  return c;
}

function newSession(now) {
  bound(); now = now || Date.now();
  for (const s in S.strands) S.strands[s].sess = 0;
  S.lastAt = now;
  S.sessN = curSess() + 1;      // (an old save starts from its sessions' length – the same numbers its gateSess / m2 entries hold)
  push(S.sessions, { day: dayOf(now), start: now, tasks: 0, A: 0, min: 0, startTask: S.taskNo }, 60);
}

/* ---------------------------------------------------------------- summary / parent page */
function summary() {
  bound(); touch();
  const strands = {}, act = strandIds().filter(isActive), today = dayOf(Date.now());
  for (const s of strandIds()) {
    const st = stOf(s);
    const keys = o => Object.keys(o || {}).map(Number).sort((a, b) => a - b);
    strands[s] = { rung: st.rung, sup: st.sup, max: topR(s), ladderMax: ladderMax(s), best: st.best || st.rung, domain: domainOf(s), active: act.includes(s),
      passed: keys(st.passed), mastered: keys(st.mastered), gold: keys(st.gold), prov: keys(st.provisional), ovIgjen: keys(st.ovIgjen),
      placed: placedDone(s, st), acc20: st.h20.length ? Math.round(100 * countA(st.h20) / st.h20.length) : null,
      n: st.n, nA: st.nA, timeline: st.tl.slice(), contrast: st.contrast ? st.contrast.tag : null, challenge: !!st.challenge,
      spin: Object.assign({}, st.spinFlags), parked: st.park > today, valve: st.valve > today, retired: retired(s, st), intro: !st.introDone && !OLD[s],
      gate: lad(s).length < (avail()[s] || []).length ? (rungRec(s, (avail()[s] || [])[lad(s).length]) || {}).prereq || null : null,
      lineDist: (st.dist || []).slice(-10) };     // v5: F44 number-line distances [rung, dist] (parent page: how close she lands)
  }
  const heat = {};
  for (const s of ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN']) { heat[s] = {}; for (let n = 10; n <= 20; n++) { const e = S.items[s + ':' + n]; heat[s][n] = e ? e.box : null; } }
  const conf = Object.keys(S.conf).map(k => [k, S.conf[k]]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const tags = {}; for (const t in S.tags) tags[t] = S.tags[t].length;
  const words = { mastered: [], struggle: [] };
  for (const k in S.items) {
    const s = keyStrand(k); if (s !== 'LES' && s !== 'SKRIV') continue;
    const e = S.items[k];
    if (e.box >= 3) words.mastered.push(k); else if (e.err >= 2 && e.box <= 1) words.struggle.push(k);
  }
  // v4 parent-page data: guess index (share of tasks with g ≥ 0.25), thinking-type and domain shares of the last 200 tasks vs targets
  const lg = S.log.filter(x => x[9]);
  const share = f => { const m = {}; lg.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); for (const k in m) m[k] = Math.round(1000 * m[k] / lg.length) / 10; return m; };
  const T = targets(), domTarget = {}; for (const s in T) domTarget[domainOf(s)] = (domTarget[domainOf(s)] || 0) + T[s];
  for (const d in domTarget) domTarget[d] = Math.round(1000 * domTarget[d]) / 10;
  return { strands, heat, conf, tags, words, spont: Object.assign({}, S.spont, (F.save && F.save.words && F.save.words.spont) || {}),
    log: S.log.slice(-50), sessions: S.sessions.slice(-30), taskNo: S.taskNo, ovebank: S.ovebank.slice(), numWeight: numWeight(),
    floors: floors(), debt: debt(),
    guessIndex: lg.length ? Math.round(1000 * lg.filter(x => typeof x[12] === 'number' && x[12] >= TH.chipG).length / lg.length) / 10 : null,
    think: share(x => x[10]), domains: share(x => domainOf(x[9])), targets: T, domainTargets: domTarget, active: act };
}
function floors() {
  bound();
  const cnt = ids => ids.reduce((a, s) => a + Object.keys(stOf(s).passed).length, 0);
  const gold = ids => ids.reduce((a, s) => a + Object.keys(stOf(s).mastered).length, 0);
  const at = ids => ids.reduce((a, s) => a + Math.max(0, stOf(s).rung - 1), 0);
  const T4 = ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN'];
  const mx = ids => ids.reduce((a, s) => a + ladderMax(s), 0);
  return { tall: { floors: cnt(T4), gold: gold(T4), at: at(T4), max: mx(T4) }, les: { floors: cnt(['LES']), gold: gold(['LES']), at: at(['LES']), max: ladderMax('LES') },
    skriv: { floors: cnt(['SKRIV']), gold: gold(['SKRIV']), at: at(['SKRIV']), max: ladderMax('SKRIV') } };
}

const live = {};
F.LEARN = {
  TH, FMT, PORTABLE, PRODUCE, LONG, COINS, COIN_A, coinsFor, OLD,
  OUTCOMES: ['A', 'B', 'C', 'R', 'H'],     // v4: report() understands R (rapid guess) and H (solved after «Hjelp meg»); rep.coinsByG = true
  get STRANDS() { return strandIds(); },
  // MAX: the highest rung open to her right now per strand (0 = not active); W0: today's base weights (legacy) / §4.1 targets ×100
  get MAX() { bound(); touch(); const o = {}; for (const s of strandIds()) o[s] = isActive(s) ? topR(s) : 0; return o; },
  get W0() { if (!LAD()) return LEG_W0; const t = targets(); const o = {}; for (const s in t) o[s] = Math.round(1000 * t[s]) / 10; return o; },
  load(o) { S = init(o || (F.save ? (F.save.learn = F.save.learn || {}) : {})); mem.fmtLast = null; mem.dry = {}; return S; },
  get state() { return bound(); },
  next, report, summary, debt, floors, newSession, dayOf,
  peek(o) { const d = decide(o); return d ? { strand: d.s, format: d.fm, kind: d.plan.kind, rung: d.plan.rung, sup: d.plan.sup } : null; },
  setNumWeight(n) { bound().numWeight = n; persist(); },
  replace() { bound(); for (const s of strandIds()) { const st = stOf(s); st.placed = 0; const l = lad(s); if (l.length) st.rung = l[idxOf(l, st.rung)]; } persist(); },
  logSpont(word) { bound(); S.spont[word] = (S.spont[word] || 0) + 1; persist(); },
  strand: s => { bound(); return strandIds().includes(s) ? stOf(s) : undefined; },
  serves, fmtSpec, family, portables, themeOf,
  // v4
  active() { bound(); touch(); return strandIds().filter(isActive); },
  targets(now) { return targets(now); },
  ladder(s) { bound(); touch(); return lad(s); },
  available(s) { bound(); touch(); return (avail()[s] || []).slice(); },     // the strand's available rungs, gates ignored
  placed(s) { bound(); return strandIds().includes(s) ? placedDone(s, stOf(s)) : false; },    // v5: placement finished (learn_sim rules)
  testOut(s) { bound(); touch(); const st = stOf(s); if (!isActive(s) || st.rung >= topR(s) || challengeTo(s, st) == null) return false; st.challenge = { to: challengeTo(s, st), n: 0 }; persist(); return true; },
  fmtG, fmtMode, twinPossible: (s, r) => { bound(); return twinPossible(s, r); }, thinkOf, domainOf,
  _live: live,
};
// browser: bind to the save as soon as it exists (save.js is core and loads first)
if (typeof window !== 'undefined' && F.save) { try { F.LEARN.load(F.save.learn = F.save.learn || {}); } catch (e) { console.error('LEARN load', e); } }
})();
