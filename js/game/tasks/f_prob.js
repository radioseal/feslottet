/* Feslottet – v4 problem & equality formats F53–F56 (WP-P; DESIGN5 §1, DESIGN4 §4.3, SYNTHESIS §2.2 LIKHET / §2.3 PROBLEM, §3.2 rows,
   §5 «Tenk først», hint_leaks §3).  Items come from WP-B1's generators (js/learn/banks_regn.js: F.BANKS_REGN.gen / the F.BANKS.reg
   registry); prep(fmt, item) re-draws an item whose shape does not fit the format and falls back to canned SYNTHESIS examples when no
   generator is loaded.  Every answer goes through the stage protocol (think-gate, R, look-back, hint, solution → C) via the kit widgets
   (S.balance, S.tapAll, S.twoStep, S.keypad) with local fallbacks; every phase sets its own look-back and its own hint (never the answer).

     F53 Markedsvekta     LIKHET E1, E3   a self-checking 3D balance: tap blocks / fruit (s0) onto the light pan, «Sjekk» tips the beam
                                          (E1); E3: the equation scroll above the balance – level it, then type the □ (s0/s1); s2 types the
                                          □ directly (E1 every other time: «Hvor mange må på?») and the balance acts out HER number
     F54 Likningsrullene  LIKHET E2, E3   the king's table + scrolls: tap every false scroll + Ferdig, then fix one (keypad in the □) (2T);
                          REGN R6         E3 / R6: one scroll «9 + 5 = □ + 6» → keypad (s1/s2: every other time the unknown is a shape –
                                          «Hva er trekanten verdt?»); R6 fact families become a bundle of the 4 family scrolls with 1–2
                                          wrong results (tap the false ones, fix one); look-back = her number in the □ and both sides' sums
     F55 Dukketeateret    PROBLEM P1–P5   a 6–10 s 3D puppet scene acted out with the numbers on signs and number-free relation sentences
                                          (params.speak); then equation tiles with «?» (2T: any TRUE relation of the givens and «?»), then
                                          the keypad.  Reverse mode (P1, s0/s1): the equation is given – she acts it out (Hent en til /
                                          Send en bort + Ferdig), then the keypad.  Look-back: the stage acts out HER equation / number.
     F56 Båndveven        PROBLEM P1–P5   basic two-ribbon bar model on the queen's loom (part-whole or compare): tag the «?» on the
                                          ribbon the question asks about, THEN the keypad opens (method mark).  Look-back: her number
                                          re-sizes the «?» ribbon, so the bars visibly stop fitting.

   Strong readers (LES ≥ L11, SYNTHESIS §2.3) also see the story text (numbers included) on a scroll at the top in F55.
   Public: F.PROB = { prep, okFor, gen, canned, ribbonModel, eqTruth, solveEq, MINE }; F.dbg.prob = { force(fmt, {strand, rung, sup, sub,
   reverse}) }.  Lines: js/speech/lines_prob.js (pr*_ ids + the pb_* story sentences of banks_regn.js). */
(function () {
'use strict';
const F = window.F;
const PB = F.PROB = F.PROB || {};
const V3 = THREE.Vector3;
const MINUS = '−', BOX = '□';
const MINE = ['F53', 'F54', 'F55', 'F56'];
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);
const sfx = (n, ...a) => { try { if (F.sfx && F.sfx[n]) F.sfx[n](...a); } catch (e) { /* sound optional */ } };
const has = id => !!(F.TPL && F.TPL.has && F.TPL.has(id));
const say = (S, id, slots) => (has(id) && !S.ended) ? S.say(id, slots || {}, '') : Promise.resolve();
const norm = s => String(s).replace(/−/g, '-').replace(/□/g, '?').replace(/\s+/g, '');
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const sum = a => a.reduce((s, v) => s + (+v || 0), 0);
const same = (a, b) => String(a) === String(b);
// v5r2 (animals: «Kongen har skrevet noen ruller.» / «Dronningen vever …» in a squirrel meeting): in an animal meeting (befriend.js:
// ctx.place 'dyr') F54 / F56 wear a neutral skin – no king's table with the crown, no king / queen line (the neutral variant's clip)
const inMeeting = S => !!(S && S.ctx && (S.ctx.place === 'dyr' || S.ctx.npcRole === 'dyr'));
if (F.PROB_LINES && F.PROB_LINES.declare) { try { F.PROB_LINES.declare(); } catch (e) { /* lines file later */ } }

/* =====================================================================================================================
   0. css (own classes pb-*; injected once)
   ===================================================================================================================== */
let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style'); st.id = 'pbcss';
  st.textContent = [
    '.pb-card { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 30; background: #fffdf2; border: 4px solid #e2b04a; border-radius: 20px;',
    '  padding: 4px 26px; font: 700 46px Andika, sans-serif; color: #3b2f5c; box-shadow: 0 6px 18px rgba(60,40,110,.22); pointer-events: none; white-space: nowrap; text-align: center; }',
    '.pb-card.scroll { background: linear-gradient(#fff8e6, #f3e0b5); border-color: #b9863a; border-radius: 12px 12px 26px 26px; }',
    '.pb-card .bx { display: inline-block; min-width: 1.1em; border: 3px dashed #b9a7d8; border-radius: 12px; padding: 0 10px; color: #8a6fd1; line-height: 1.15; }',
    '.pb-card .bx.shp { border-style: solid; border-color: transparent; padding: 0 4px; }',
    '.pb-card .bx.her { border-style: solid; border-color: #e0a91e; color: #8a5a00; }',
    '.pb-card .sides { display: block; font-size: 30px; color: #7a6a9a; letter-spacing: .04em; }',
    '.pb-card.wob, .pb-wob { animation: pbwob .55s; }',
    '@keyframes pbwob { 25% { rotate: -3deg; } 75% { rotate: 3deg; } }',
    '.pb-eq { display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 8px; }',
    '.pb-slot { width: 84px; height: 76px; border-radius: 14px; border: 3px dashed #cdbfe6; background: rgba(255,255,255,.85); display: flex; align-items: center;',
    '  justify-content: center; font: 700 40px Andika, sans-serif; color: #3b2f5c; cursor: pointer; }',
    '.pb-slot.op { width: 64px; } .pb-slot.filled { border-style: solid; border-color: #b9a7d8; background: #fff; }',
    '.pb-slot.ghost { color: rgba(138,111,209,.6); border-color: #f2c14e; } .pb-slot.q, .pb-tile.q { color: #8a6fd1; }',
    '.pb-eqs { font: 700 40px Andika, sans-serif; color: #3b2f5c; padding: 0 4px; }',
    '.pb-eq.wrong { animation: pbshake .35s; } @keyframes pbshake { 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }',
    '.pb-tiles { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }',
    '.pb-tile, .pb-btn { min-width: 76px; height: 70px; font: 700 38px Andika, sans-serif; border-radius: 14px; border: 3px solid #d9cdf2; background: linear-gradient(#fff, #f6f0ff);',
    '  color: #3b2f5c; cursor: pointer; box-shadow: 0 4px 0 rgba(60,40,110,.16); padding: 0 14px; }',
    '.pb-btn { font-size: 28px; min-width: 150px; height: 80px; } .pb-btn .ic { font-size: 34px; margin-right: 6px; }',
    '.pb-tile.glow, .pb-btn.glow, .pb-rib.glow, .pb-scroll.glow { animation: pbglow .9s ease-in-out infinite alternate; border-color: #c9962b; }',
    '@keyframes pbglow { to { box-shadow: 0 0 0 5px rgba(242,193,78,.75), 0 0 22px rgba(242,193,78,.6); } }',
    '.pb-locked { opacity: .6; } .pb-row2 { display: flex; gap: 14px; justify-content: center; align-items: center; }',
    '.ktapall.pb-scrolls { gap: 14px; } .ktapall.pb-scrolls .kcard { min-width: 250px; height: 92px; border-radius: 10px 10px 24px 24px;',
    '  background: linear-gradient(#fff8e6, #f3e0b5); border-color: #c9a46a; } .ktapall.pb-scrolls .kcard .kface { font-size: 36px; white-space: nowrap; }',
    '.pb-seal { position: absolute; right: -10px; top: -14px; font-size: 34px; pointer-events: none; }',
    '.pb-loom { position: fixed; left: 50%; top: 84px; transform: translateX(-50%); z-index: 29; width: min(880px, 92vw); box-sizing: border-box;',
    '  background: linear-gradient(#fbf3e2, #f1e2c4); border: 5px solid #b07a3c; border-radius: 22px; padding: 14px 22px 10px; box-shadow: 0 8px 22px rgba(60,40,20,.25); }',
    '.pb-lrow { display: flex; align-items: center; gap: 12px; margin: 10px 0; min-height: 64px; }',
    '.pb-name { width: 130px; flex: none; font: 700 28px Andika, sans-serif; color: #5b3e1e; text-align: right; }',
    '.pb-track { position: relative; flex: 1; height: 62px; }',
    '.pb-rib { position: absolute; top: 0; height: 62px; border-radius: 10px; border: 3px solid rgba(60,40,20,.35); display: flex; align-items: center; justify-content: center;',
    '  font: 700 34px Andika, sans-serif; color: #3b2f5c; cursor: pointer; box-sizing: border-box; transition: width .6s, left .6s; overflow: hidden; padding: 0; }',
    '.pb-rib.unit { background-image: repeating-linear-gradient(90deg, transparent 0 calc(var(--u) - 2px), rgba(60,40,20,.28) calc(var(--u) - 2px) var(--u)); }',
    '.pb-rib.unk { background: #fffdf8 !important; border-style: dashed; color: #8a6fd1; }',
    '.pb-rib.diffseg { background: repeating-linear-gradient(45deg, #fffdf8 0 10px, #efe6ff 10px 20px) !important; border-style: dashed; color: #8a6fd1; }',
    '.pb-rib.tag { box-shadow: 0 0 0 5px #f2c14e; } .pb-rib.her { color: #8a5a00; border-color: #e0a91e; }',
    '.pb-rib.wrong { animation: pbshake .35s; }',
  ].join('\n');
  document.head.appendChild(st);
}
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const caseT = t => (F.UI && F.UI.caseText) ? F.UI.caseText(String(t)) : String(t);
function keepEl(S, e) { (S.kitEls || (S.kitEls = [])).push(e); return e; }
// a card at the top of the screen (equation / scroll); html with .bx for the box
function card(S, html, cls) { css(); const c = el('div', 'pb-card ' + (cls || ''), html); if (S.ended) return c; document.body.appendChild(c); return keepEl(S, c); }
// a task aborted while a scene / animation was running: the format stops quietly (no widget, label or card after the stage cleanup)
const NEVER = () => new Promise(() => {});
const eqHtml = (t, her, shape) => String(t).replace(BOX, her != null ? `<span class="bx her">${her}</span>` : shape ? `<span class="bx shp" style="color:${shape.col}">${shape.sym}</span>` : `<span class="bx">&nbsp;</span>`).replace(/-/g, MINUS);
// F54 «shape values»: the unknown is a shape instead of a box («Hva er trekanten verdt?») – any symbol can stand for a number
const SHAPES = [{ id: 'trekant', sym: '▲', col: '#e0463c' }, { id: 'sirkel', sym: '●', col: '#4f8fd8' }, { id: 'firkant', sym: '■', col: '#3aa88a' }, { id: 'stjerne', sym: '★', col: '#e0a91e' }];
// the format decides the presentation: g / mode of what she really answers (banks_regn gives s0 items chips g 1/3 – we never show chips)
function setG(item, g, mode) { item.g = g; item.mode = mode; item._gAuto = false; item._modeAuto = false; item.choices = null; }
// SYNTHESIS §2.3: «From LES L11 the text is also shown to read» – the story lines (numbers included) as a small parchment
function storyText(S, item) {
  try {
    const les = F.LEARN && F.LEARN.strand && F.LEARN.strand('LES'), p = item.params;
    if (!les || (les.rung | 0) < 11 || !p || !p.text || S.ended) return null;
    const c = card(S, '', 'scroll'); c.style.cssText += 'font-size:26px;line-height:1.3;white-space:normal;width:max-content;max-width:min(760px, 60vw);text-align:left;padding:6px 18px;';
    c.textContent = caseT(p.text); return c;
  } catch (e) { return null; }
}
function wob(e) { if (!e) return; e.classList.remove('wob'); void e.offsetWidth; e.classList.add('wob'); }

/* =====================================================================================================================
   1. items: shape check, re-draw from WP-B1's generators, canned fallback
   ===================================================================================================================== */
const PLUS_E3 = ['a+b=?+c', 'a+?=b+c', 'a+b=c+?', '?+a=b+c'];
const STRAND = { F53: 'LIKHET', F54: 'LIKHET', F55: 'PROBLEM', F56: 'PROBLEM' };
function okFor(fmt, it) {
  if (!it || !it.params || it.target == null) return false;
  const p = it.params;
  if (fmt === 'F53') return it.strand === 'LIKHET' && ((it.rung === 1 && Array.isArray(p.left) && Array.isArray(p.right)) ||
    (it.rung === 3 && typeof p.eq === 'string' && p.eq.includes(BOX) && !/[−-]/.test(p.eq) && !!sidesOf(p.eq)));
  if (fmt === 'F54') return (it.strand === 'LIKHET' && ((it.rung === 2 && Array.isArray(p.bundle) && p.fix && p.fix.t) ||
    (it.rung === 3 && typeof p.eq === 'string' && p.eq.includes(BOX)))) ||
    (it.strand === 'REGN' && it.rung === 6 && typeof p.eq === 'string' && p.eq.includes(BOX) && !Array.isArray(it.target));     // R6 «8 + □ = 15» scroll / family bundle
  return it.strand === 'PROBLEM' && !!p.nums && !!p.schema && it.rung >= 1 && it.rung <= 5;
}
function gen(strand, rung, sup, o) {
  const r = Math.random;
  try { if (F.BANKS_REGN && F.BANKS_REGN.gen) { const it = F.BANKS_REGN.gen(strand, rung, sup, r, o || {}); if (it) return it; } } catch (e) { console.warn('[f_prob] gen', e); }
  try { if (F.BANKS && F.BANKS.regGen) { const it = F.BANKS.regGen(strand, rung, sup, r, o || {}); if (it) return it; } } catch (e) { /* registry absent */ }
  return null;
}
// canned SYNTHESIS §2 examples – used only when no generator is loaded (never a dead end)
function canned(fmt, strand, rung, sup) {
  const base = (target, params, ds, x) => Object.assign({ strand, rung, sup, key: strand + ':canned:' + fmt + ':' + rung, target, answer: target, choices: null,
    distractors: ds || [], params: Object.assign({ structure: sup === 0 }, params), g: 0.01, mode: 'keypad', think: strand === 'PROBLEM' ? 'MODELL' : rung === 1 ? 'DEDUKSJON' : 'REGNE',
    secret: [String(target)], twin: null }, x || {});
  if (strand === 'LIKHET') {
    if (rung === 1) return base(3, { left: [8, 5], right: [10], addTo: 'right', eq: '8 + 5 = 10 + ' + BOX, surface: { model: 'eple', pl: 'epler' } }, [{ v: 13, tag: 'OPERATIONAL' }, { v: 23, tag: 'ADD-ALL' }], { mode: 'balance' });
    if (rung === 2) {
      const bundle = [{ t: '7 = 7', ok: true }, { t: '8 = 3 + 5', ok: true }, { t: '6 + 3 = 9 + 1', ok: false, tag: 'OPERATIONAL' }, { t: '5 + 2 = 2 + 5', ok: true }];
      return base(0, { bundle, falseIdx: [2], fix: { i: 2, t: '6 + 3 = 9 + ' + BOX, answer: 0, oper: 9 }, eq: '6 + 3 = 9 + ' + BOX }, [{ v: 9, tag: 'OPERATIONAL' }, { v: 1, tag: 'OFF-BY-ONE' }],
        { mode: 'twostep', g: 0.0007, secret: [], parts: [{ id: 'false', target: [2], mode: 'subset' }, { id: 'fix', target: 0, mode: 'keypad' }] });
    }
    return base(8, { form: 'a+b=?+c', eq: '9 + 5 = ' + BOX + ' + 6' }, [{ v: 14, tag: 'OPERATIONAL' }, { v: 20, tag: 'ADD-ALL' }, { v: 9, tag: 'OFF-BY-ONE' }]);
  }
  const P = {
    1: [2, { schema: 'change', unknown: 'result', frame: 'place_go', op: '-', nums: { a: 7, b: 5, c: 2 }, surface: 'and', names: { who: 'Mia' }, eq: '7 − 5 = 2', ask: 'igjen' }, [{ v: 12, tag: 'KEYWORD' }]],
    2: [9, { schema: 'part-whole', unknown: 'part', frame: 'epler', nums: { whole: 15, part: 6, other: 9 }, surface: 'eple', bars: [{ name: 'røde', value: 6, known: true }, { name: 'grønne', value: 9, known: false }], whole: 15, eq: '15 − 6 = 9' }, [{ v: 21, tag: 'KEYWORD' }]],
    3: [5, { schema: 'change', unknown: 'change', frame: 'poss_get', op: '+', nums: { start: 8, end: 13, change: 5 }, surface: 'kule', names: { who: 'Mia' }, eq: '8 + 5 = 13' }, [{ v: 21, tag: 'KEYWORD' }]],
    4: [5, { schema: 'compare', unknown: 'difference', frame: 'har', nums: { big: 12, small: 7, diff: 5 }, surface: 'kule', names: { who: 'Ali', who2: 'Ole' }, ask: 'flere',
      bars: [{ name: 'Ali', value: 12, known: true }, { name: 'Ole', value: 7, known: true }], barAsk: 'diff', eq: '12 − 7 = 5' }, [{ v: 19, tag: 'KEYWORD' }]],
    5: [15, { schema: 'change', unknown: 'start', frame: 'place_go', op: '-', nums: { start: 15, change: 6, end: 9 }, surface: 'fugl', names: { who: 'Mia' }, eq: '15 − 6 = 9' }, [{ v: 3, tag: 'KEYWORD' }]],
  }[rung] || null;
  if (!P) return null;
  return base(P[0], Object.assign({ speak: [], speakText: [], lines: [] }, P[1]), P[2], { mode: 'twostep', g: 0.0001 });
}
// R6 fact family (banks_regn 'family': the 4 equations of a, b, c) → a bundle of scrolls for F54: 1–2 of them carry a wrong result;
// she taps every false scroll, then fixes one (the □ on its result) – the family stays the item (same Leitner key)
function familyBundle(item) {
  const p = item.params, a = +p.a, b = +p.b, c = +p.c, sup = item.sup | 0;
  let fam = [`${a} + ${b} = ${c}`, `${b} + ${a} = ${c}`, `${c} ${MINUS} ${a} = ${b}`, `${c} ${MINUS} ${b} = ${a}`];
  if (sup === 0) fam = shuffle(fam).slice(0, 3);
  const nFalse = sup === 0 ? 1 : (Math.random() < 0.5 ? 1 : 2);
  const bad = shuffle(fam.map((_, i) => i)).slice(0, nFalse);
  const bundle = shuffle(fam.map((t, i) => {
    if (!bad.includes(i)) return { t, ok: true };
    const k = t.lastIndexOf(' = '), L = t.slice(0, k), v = +t.slice(k + 3);
    let w = v + pick([1, -1, 2, -2]); if (w < 0 || w === v) w = v + 1;
    return { t: `${L} = ${w}`, ok: false, tag: 'OFF-BY-ONE', fix: { t: `${L} = ${BOX}`, answer: v } };
  }));
  const falseIdx = bundle.map((e, i) => e.ok ? -1 : i).filter(i => i >= 0);
  const fi = pick(falseIdx), fix = Object.assign({ i: fi }, bundle[fi].fix);
  Object.assign(item, { target: fix.answer, answer: fix.answer, choices: null, secret: [], mode: 'twostep',
    distractors: [{ v: fix.answer + 1, tag: 'OFF-BY-ONE' }, { v: Math.max(0, fix.answer - 1), tag: 'OFF-BY-ONE' }],
    params: Object.assign({}, p, { bundle: bundle.map(e => ({ t: e.t, ok: e.ok, tag: e.tag || null })), falseIdx, fix, eq: fix.t, family3: [a, b, c] }) });
  return item;
}
/* v5d WP-R3 (logic #57): the generators' cast names (Ole = the royal baby, Kari = the cook, Per = the postman) become the shared story
   children (F.PROB_LINES.NAME_MAP: Ole → Ola, Kari → Emma, Per → Ali) in every name a PROBLEM item shows or speaks – names, speak
   slots, lines, text, bar names. The Leitner key holds no name, so LEARN is unchanged. */
function fixNames(item) {
  const p = item && item.params; if (!p || p._names) return item;
  const M0 = (F.PROB_LINES && F.PROB_LINES.NAME_MAP) || { Ole: 'Ola', Kari: 'Emma', Per: 'Ali' };
  // a new name is used only when its story clips exist (until the lead regenerates audio the old name stays – never a silent story)
  const clip = t => { try { return !window.SPEECH || !F.Speech || !F.Speech.has || F.Speech.has(t, ''); } catch (e) { return true; } };
  const M = {}; for (const k in M0) if (clip(M0[k] + ' har noen kuler.') && clip('Hvor mange flere har ' + M0[k] + '?')) M[k] = M0[k];
  const keys = Object.keys(M); if (!keys.length) { p._names = true; return item; }
  const re = new RegExp('(^|[^A-Za-zÆØÅæøå])(' + keys.join('|') + ')(?=$|[^A-Za-zÆØÅæøå])', 'g');
  const tx = v => typeof v === 'string' ? v.replace(re, (m, a, n) => a + M[n]) : v;
  if (p.names) for (const k in p.names) if (M[p.names[k]]) p.names[k] = M[p.names[k]];
  (p.speak || []).forEach(x => { if (!x) return; if (x.slots) for (const k in x.slots) if (typeof x.slots[k] === 'string' && M[x.slots[k]]) x.slots[k] = M[x.slots[k]]; if (x.text) x.text = tx(x.text); });
  ['lines', 'speakText'].forEach(k => { if (Array.isArray(p[k])) p[k] = p[k].map(tx); });
  if (typeof p.text === 'string') p.text = tx(p.text);
  if (Array.isArray(p.bars)) p.bars.forEach(b => { if (b && M[b.name]) b.name = M[b.name]; });
  if (typeof item.text === 'string') item.text = tx(item.text);
  p._names = true;
  return item;
}
function prep(fmt, item) { return fixNames(prep0(fmt, item)); }
function prep0(fmt, item) {
  if (item._prepped === fmt || okFor(fmt, item)) { item._prepped = fmt; return item; }
  if (fmt === 'F54' && item.strand === 'REGN' && (item.rung | 0) === 6 && item.params && Array.isArray(item.params.family) && item.params.c != null) {
    familyBundle(item); item._prepped = fmt; return item;
  }
  const strand = fmt === 'F54' && item.strand === 'REGN' ? 'REGN' : STRAND[fmt];
  let rung = item.strand === strand ? (item.rung | 0) : (fmt === 'F54' ? 2 : 1);
  if (strand === 'REGN') rung = 6;
  if (fmt === 'F53' && rung !== 1 && rung !== 3) rung = rung === 2 ? 1 : 3;
  if (fmt === 'F54' && strand === 'LIKHET' && rung !== 2 && rung !== 3) rung = 2;
  if (strand === 'PROBLEM') rung = Math.max(1, Math.min(5, rung || 1));
  const sup = item.sup == null ? 1 : Math.max(0, Math.min(2, item.sup | 0));
  let fresh = null;
  for (let i = 0; i < 8 && !okFor(fmt, fresh); i++) fresh = gen(strand, rung, sup, { format: fmt, sub: fmt === 'F53' && rung === 3 ? pick(PLUS_E3) : strand === 'REGN' ? 'missing' : undefined });
  if (!okFor(fmt, fresh)) fresh = strand === 'REGN' ? canned(fmt, 'LIKHET', 3, sup) : canned(fmt, strand, rung, sup);
  if (strand === 'REGN' && fresh.strand === 'LIKHET') { Object.assign(item, fresh, { id: item.id, format: item.format, kind: item.kind, _prepped: fmt }); return item; }
  const keep = { id: item.id, format: item.format, kind: item.kind, golden: item.golden, place: item.place };
  for (const k of Object.keys(item)) if (!(k in keep)) delete item[k];
  Object.assign(item, fresh, keep, { strand, rung, sup, _prepped: fmt });
  return item;
}

/* =====================================================================================================================
   2. equations: sides, truth, solving (the F55 builder accepts ANY true relation of the givens and «?»)
   ===================================================================================================================== */
// '8 + 5 = 10 + □' → {left:[8,5], right:[10], box:'right'} (plus only; null otherwise)
function sidesOf(eq) {
  const parts = String(eq).split('='); if (parts.length !== 2) return null;
  const side = s => { const toks = s.split('+').map(x => x.trim()); if (toks.some(x => !(x === BOX || /^\d+$/.test(x)))) return null; return toks; };
  const L = side(parts[0]), R = side(parts[1]); if (!L || !R) return null;
  const box = L.includes(BOX) ? 'left' : R.includes(BOX) ? 'right' : null; if (!box) return null;
  return { left: L.filter(x => x !== BOX).map(Number), right: R.filter(x => x !== BOX).map(Number), box };
}
// value of one side of a display equation with the □ = x ('9 + 5', '12 − 4')
function sideVal(s, x) {
  const toks = String(s).replace(/−/g, '-').replace(BOX, String(x)).match(/[+-]|\d+/g) || [];
  let v = 0, sg = 1;
  for (const t of toks) { if (t === '+') sg = 1; else if (t === '-') sg = -1; else v += sg * +t; }
  return v;
}
const sidesWith = (eq, x) => { const [L, R] = String(eq).split('='); return [sideVal(L, x), sideVal(R, x)]; };
// vals: [n|'?', '+'|'−', n|'?', n|'?'] (n op n = n)
function eqTruth(vals, t) {
  const v = x => x === '?' ? t : +x;
  if (vals.some(x => x == null)) return false;
  const L = vals[1] === '+' ? v(vals[0]) + v(vals[2]) : v(vals[0]) - v(vals[2]);
  return L === v(vals[3]);
}
// solve her equation for «?» (one «?») → the number her model implies (null when it has none / several)
function solveEq(vals) {
  const q = vals.map((x, i) => x === '?' ? i : -1).filter(i => i >= 0); if (q.length !== 1) return null;
  const [a, op, b, c] = vals, plus = op === '+';
  if (q[0] === 3) return plus ? +a + +b : +a - +b;
  if (q[0] === 0) return plus ? +c - +b : +c + +b;
  return plus ? +c - +a : +a - +c;
}
const eqTxt = v => `${v[0]} ${v[1]} ${v[2]} = ${v[3]}`;
const eqStr = vals => `${vals[0]}${vals[1] === '−' ? '-' : '+'}${vals[2]}=${vals[3]}`;
const eqParse = s => { const m = /^(\d+|\?)([+-])(\d+|\?)=(\d+|\?)$/.exec(norm(s)); return m ? [m[1], m[2] === '-' ? MINUS : '+', m[3], m[4]] : null; };

/* =====================================================================================================================
   3. shared widgets: equation builder (tiles), act-out buttons, ribbon tag – all run through S.arm / S.use / S.submit
   ===================================================================================================================== */
function baseW(S, kind) {
  const w = { kind, kit: true, dead: false, locked: false, values: [], parts: [],
    lock(on) { w.locked = !!on; w.parts.forEach(p => p.classList && p.classList.toggle('pb-locked', w.locked)); },
    destroy() { if (w.dead) return; w.dead = true; try { w.onDestroy && w.onDestroy(); } catch (e) {} w.parts.forEach(p => { try { p.remove(); } catch (e) {} }); } };
  return w;
}
const gateShut = S => S.gateOpen && !S.gateOpen();
// the equation builder: [n][op][n] = [n] + ✓; tiles = the givens, «?», + and −.  o: {nums, t, givens, answer (canonical vals), hint, tag}
function eqBuilder(S, o) {
  if (S.ended) return NEVER();
  css();
  const tray = S.tray();
  const w = baseW(S, 'pb-eq');
  const row = el('div', 'pb-eq'), tilesEl = el('div', 'pb-tiles');
  const vals = [null, null, null, null];
  let ghost = null;
  // s0 scaffold: the «?» already sits where the story's unknown is (o.preset = {i, v}); it cannot be taken out
  const pre = o.preset || null;
  if (pre) vals[pre.i] = pre.v;
  const slots = [0, 1, 2, 3].map(i => { const d = el('div', 'pb-slot' + (i === 1 ? ' op' : '')); d.addEventListener('click', e => { e.stopPropagation(); if (w.locked || S.solved || (pre && pre.i === i)) return; vals[i] = null; draw(); }); return d; });
  row.append(slots[0], slots[1], slots[2], el('span', 'pb-eqs', '='), slots[3]);
  const ok = el('button', 'kbtn okbtn pb-ok', '✓'); row.appendChild(ok);
  const tileVals = shuffle(o.nums.map(String)).concat(['?', '+', MINUS]);
  const btn = {};
  tileVals.forEach(v => { const b = el('button', 'pb-tile' + (v === '?' ? ' q' : ''), v); b.addEventListener('click', e => { e.stopPropagation(); put(v); }); tilesEl.appendChild(b); btn[v] = b; });
  tray.append(row, tilesEl); if (F.UI._trayUpd) F.UI._trayUpd();
  w.parts.push(row, tilesEl);
  function draw() {
    slots.forEach((d, i) => { const v = vals[i]; d.textContent = v != null ? v : ghost ? ghost[i] : ''; d.classList.toggle('filled', v != null); d.classList.toggle('ghost', v == null && !!ghost); d.classList.toggle('q', (v != null ? v : ghost && ghost[i]) === '?'); });
    ok.classList.toggle('off', vals.some(v => v == null)); ok.classList.toggle('ready', vals.every(v => v != null));
  }
  function put(v) {
    if (w.locked || S.solved || S.locked || w.dead) return;
    sfx('click');
    if (v === '+' || v === MINUS) vals[1] = v;
    else { if (pre && v === pre.v) { wob(row); return; } const i = [0, 2, 3].find(k => vals[k] == null); if (i == null) { wob(row); return; } vals[i] = v; }
    draw();
  }
  const value = () => eqStr(vals.map(x => x == null ? '' : x));
  ok.addEventListener('click', e => {
    e.stopPropagation(); if (w.locked || S.solved || w.dead) return;
    if (vals.some(v => v == null)) { row.classList.remove('wrong'); void row.offsetWidth; row.classList.add('wrong'); sfx('boing'); return; }
    S.submit(value(), w);
  });
  w.value = value; w.vals = vals;
  w.feed = v => { const p = eqParse(v); for (let i = 0; i < 4; i++) vals[i] = p ? p[i] : null; draw(); return S.submit(value(), w); };
  w.mark = (v, cls) => { if (cls === 'wrong') { row.classList.remove('wrong'); void row.offsetWidth; row.classList.add('wrong'); } };
  w.rightValue = () => eqStr(o.answer);
  w.wrongValue = () => { const a = o.answer.slice(); a[1] = a[1] === '+' ? MINUS : '+'; if (o.check(eqStr(a))) a[3] = a[3] === '?' ? a[0] : '?'; return eqStr(a); };
  w.solution = () => { ghost = o.answer.slice(); for (let i = 0; i < 4; i++) vals[i] = pre && pre.i === i ? pre.v : null; draw(); o.answer.forEach(x => btn[x] && btn[x].classList.add('glow')); };
  w.helpStep = async () => { const i = [0, 1, 2, 3].find(k => !same(vals[k], o.answer[k])); if (i == null) return false; vals[i] = o.answer[i]; draw(); return true; };
  w.solTpl = has('pr55_sol') ? 'pr55_sol' : 'kit_sol_tiles';
  w.hint = o.hint;
  w.onDestroy = () => {};
  draw();
  const p = S.arm({ answer: eqStr(o.answer), check: o.check }); S.use(w);
  return p;
}
// the keypad with this phase's own hint (and look-back set by the caller)
function keypad(S, answer, o) {
  o = o || {};
  if (S.ended) return NEVER();
  const p = S.keypad(Object.assign({ answer }, o.showLen ? { showLen: true } : {}));
  if (S.active && o.hint) S.active.hint = o.hint;
  return p;
}
async function chain(S, a, b) {
  if (S.twoStep) return S.twoStep(a, b);
  const r1 = await a(S);
  (S.widgets || []).forEach(w => { if (w && w.kit && !w.dead) w.destroy(); });
  const r2 = await b(S, r1);
  return [r1, r2];
}

/* =====================================================================================================================
   4. 3D props: tokens, puppets, theatre, cloth, signs, a mini balance (display / look-back / fallback)
   ===================================================================================================================== */
const MAT = {}, GEO = {};
const mat = c => MAT[c] || (MAT[c] = new THREE.MeshLambertMaterial({ color: c }));
const geo = (k, mk) => GEO[k] || (GEO[k] = mk());
const mesh = (g, m) => new THREE.Mesh(g, m);
function fitModel(id, size) {
  if (!id || !(F.VOX && F.VOX.has && F.VOX.has(id))) return null;
  try {
    const m = F.VOX.make(id, {}); const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new V3());
    m.scale.multiplyScalar(size / Math.max(sz.x, sz.y, sz.z, 0.05));
    const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.min.y;
    const g = new THREE.Group(); g.add(m); return g;
  } catch (e) { return null; }
}
function tint(obj, k) { obj.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(k); } }); return obj; }
function ballTok(color, r) { r = (r || 0.13) * 1.2; const g = new THREE.Group(); const m = mesh(geo('ball' + r, () => new THREE.SphereGeometry(r, 14, 10)), mat(color)); m.position.y = r; g.add(m); return g; }
function flowerTok(color) { const g = new THREE.Group(); const s = mesh(geo('stem', () => new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6)), mat(0x4f9a3a)); s.position.y = 0.16; g.add(s); const h = mesh(geo('fhead', () => new THREE.SphereGeometry(0.09, 12, 8)), mat(color)); h.position.y = 0.36; g.add(h); return g; }
function cardTok() { const g = new THREE.Group(); const m = mesh(geo('card', () => new THREE.BoxGeometry(0.26, 0.36, 0.04)), mat(0xfff3d6)); m.position.y = 0.2; g.add(m); const s = mesh(geo('cardstar', () => new THREE.BoxGeometry(0.13, 0.13, 0.045)), mat(0xe86a8a)); s.position.y = 0.2; g.add(s); return g; }
function coinTok() { const g = new THREE.Group(); const m = mesh(geo('coin', () => new THREE.CylinderGeometry(0.14, 0.14, 0.04, 18)), mat(0xf2c14e)); m.rotation.x = Math.PI / 2; m.position.y = 0.15; g.add(m); return g; }
function cubeTok(color) { const g = new THREE.Group(); const m = mesh(geo('cube', () => new THREE.BoxGeometry(0.2, 0.2, 0.2)), mat(color || 0xb9a5f0)); m.position.y = 0.1; g.add(m); return g; }
// a hand puppet: cone body, head, hair (kid-sized for «barn»)
function puppet(shirt, hair, small) {
  const g = new THREE.Group(), k = small ? 0.55 : 1;
  const body = mesh(geo('pbody', () => new THREE.ConeGeometry(0.2, 0.55, 14)), mat(shirt)); body.position.y = 0.28; g.add(body);
  const head = mesh(geo('phead', () => new THREE.SphereGeometry(0.14, 14, 10)), mat(0xf6d2b4)); head.position.y = 0.66; g.add(head);
  const hr = mesh(geo('phair', () => new THREE.SphereGeometry(0.148, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(hair)); hr.position.y = 0.68; g.add(hr);
  [-1, 1].forEach(sg => { const e = mesh(geo('peye', () => new THREE.SphereGeometry(0.02, 6, 4)), mat(0x2b2140)); e.position.set(0.05 * sg, 0.68, 0.13); g.add(e); });
  g.scale.setScalar(k);
  return g;
}
const PERSON = { Mia: [0xe86a8a, 0x6b3e1e], Kari: [0x8a6fd1, 0xe0b44a], Ole: [0x4f8fd8, 0x3b2a1a], Ali: [0x3aa88a, 0x1e1410],
  Emma: [0x8a6fd1, 0xe0b44a], Ola: [0x4f8fd8, 0x3b2a1a], Ida: [0xf0a23c, 0xe8c96a] };     // v5d (#57): the story children
// what a token of this story looks like (VOX model when it exists; simple shapes otherwise); kind 0/1 = the two kinds of a part-whole
function tokenMaker(p) {
  const fr = p.frame, s = p.surface;
  if (p.schema === 'part-whole') {
    if (fr === 'epler') return k => fitModel('eple', 0.26) ? (k ? tint(fitModel('eple', 0.26), 0.55) : fitModel('eple', 0.26)) : ballTok(k ? 0x7cc04a : 0xe0463c, 0.12);
    if (fr === 'kuler') return k => ballTok(k ? 0xf2c14e : 0x4f8fd8, 0.11);
    if (fr === 'sauer') return k => { const m = fitModel('sau', 0.34); return m ? (k ? m : tint(m, 0.28)) : ballTok(k ? 0xffffff : 0x333333, 0.13); };
    if (fr === 'blomster') return k => flowerTok(k ? 0xf2c14e : 0xe0463c);
    if (fr === 'barn') return k => puppet(k ? 0xe86a8a : 0x4f8fd8, k ? 0xe0b44a : 0x3b2a1a, true);
    return () => coinTok();
  }
  if (s === 'kort' || (p.frame && /^poss/.test(p.frame) && !s)) return () => cardTok();
  if (s === 'krone') return () => coinTok();          // «kroner» are coins (the VOX 'krone' is a crown)
  if (s === 'kloss') return () => cubeTok();
  const m = s && fitModel(s, s === 'sau' ? 0.44 : 0.4);
  if (m) return () => fitModel(s, s === 'sau' ? 0.44 : 0.4);
  const col = { kule: 0x4f8fd8, perle: 0xe86a8a, eple: 0xe0463c, bolle: 0xd9a35b, kake: 0xf3c9d6, fugl: 0x6aa6e8, and: 0xf4f0e0, frosk: 0x5cb85c, sau: 0xf8f8f0 }[s] || 0xb9a5f0;
  return () => ballTok(col, 0.12);
}
// the puppet theatre (local frame: +x screen right, +z towards the camera)
function theatre(S, o) {
  o = o || {};
  const g = new THREE.Group();
  const floor = mesh(new THREE.BoxGeometry(4.8, 0.3, 2.0), mat(0xb07a3c)); floor.position.y = 0.15; g.add(floor);
  const back = mesh(new THREE.BoxGeometry(4.8, 2.4, 0.08), mat(o.back || 0x3d4f8a)); back.position.set(0, 1.5, -1.0); g.add(back);
  [-1, 1].forEach(sg => { const c = mesh(new THREE.BoxGeometry(0.5, 2.7, 0.18), mat(0xc0392b)); c.position.set(2.55 * sg, 1.35, -0.5); g.add(c); });
  const top = mesh(new THREE.BoxGeometry(5.6, 0.42, 0.22), mat(0xc0392b)); top.position.set(0, 2.85, -0.5); g.add(top);
  const trim = mesh(new THREE.BoxGeometry(5.6, 0.08, 0.24), mat(0xf2c14e)); trim.position.set(0, 2.62, -0.5); g.add(trim);
  if (o.prop === 'tree') { const tr = mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.3, 8), mat(0x7a5230)); tr.position.set(-0.6, 0.95, -0.75); g.add(tr); const cr = mesh(new THREE.SphereGeometry(0.75, 14, 10), mat(0x5aa04a)); cr.scale.y = 0.7; cr.position.set(-0.6, 1.75, -0.75); g.add(cr); }
  if (o.prop === 'pond') { const pd = mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.04, 28), mat(0x5fa8e0)); pd.position.set(-0.55, 0.31, 0.0); g.add(pd); }
  if (o.prop === 'grass') { const gr = mesh(new THREE.BoxGeometry(2.6, 0.04, 1.7), mat(0x8cc56a)); gr.position.set(-0.55, 0.31, 0.0); g.add(gr); }
  if (o.prop === 'stone') { const st = mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.12, 12), mat(0x9a9aa6)); st.position.set(-0.55, 0.36, 0.0); g.add(st); }
  if (o.prop === 'tray') { const tb = mesh(new THREE.BoxGeometry(2.1, 0.05, 1.6), mat(0xe8d5b0)); tb.position.set(-0.55, 0.32, 0.0); g.add(tb); }
  const sc = o.scale || 1.18;
  g.scale.setScalar(sc);
  S.place(g, { pos: S.anchor.clone().addScaledVector(S.toCam, -0.3) });
  const Y = o.prop === 'stone' ? 0.42 : o.prop ? 0.34 : 0.3;
  const T = { g, Y, sc, toks: [], signs: [] };
  T.add = (obj, x, z, y) => { obj.position.set(x, y != null ? y : Y, z); g.add(obj); return obj; };
  // a numbered / «?» sign that follows a local point (an invisible marker in the group)
  T.sign = (x, y, z, text) => { const mk = new THREE.Object3D(); mk.position.set(x, y, z); g.add(mk);
    const L = S.ended ? { set() {}, remove() {}, el: null } : S.label(mk, String(text), { kind: 'num' }); L.mk = mk; T.signs.push(L); return L; };
  T.moveSign = (L, x, y, z, ms) => { const p0 = L.mk.position.clone(), p1 = new V3(x, y, z); return tween(ms || 600, k => L.mk.position.lerpVectors(p0, p1, ease(k))); };
  return T;
}
// n slots in rows of `per` around cx (front row first)
function slotsAt(n, cx, o) {
  o = o || {};
  const per = o.per || 5, dx = o.dx || 0.38, dz = o.dz || 0.36, z0 = o.z0 != null ? o.z0 : 0.5, out = [];
  for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per; out.push(new V3(cx + (c - (per - 1) / 2) * dx + (r % 2 ? dx * 0.18 : 0), 0, z0 - r * dz)); }
  return out;
}
async function popIn(T, objs, pos, ms) {
  objs.forEach((o, i) => { o.position.set(pos[i].x, T.Y, pos[i].z); o.scale.setScalar(0.001); T.g.add(o); });
  const per = Math.max(40, (ms || 1200) / Math.max(1, objs.length));
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; sfx('pling', i % 10); tween(220, k => o.scale.setScalar(Math.max(0.001, ease(k)))); await sleep(per); }
  await sleep(200);
}
function moveTo(T, objs, pos, ms, hop) {
  return Promise.all(objs.map((o, i) => { const p0 = o.position.clone(), p1 = new V3(pos[i].x, pos[i].y != null && pos[i].y !== 0 ? pos[i].y : T.Y, pos[i].z);
    return tween((ms || 900) + i * 25, k => { const e = ease(k); o.position.lerpVectors(p0, p1, e); if (hop) o.position.y += Math.sin(Math.PI * e) * hop; }); }));
}
function hide(objs) { objs.forEach(o => { o.visible = false; }); }
function show(objs) { objs.forEach(o => { o.visible = true; o.scale.setScalar(1); }); }
// the velvet cloth that hides a group («we do not know how many are under it»)
function cloth(T, cx, w) {
  const m = mesh(new THREE.BoxGeometry(w || 2.1, 0.62, 1.75), mat(0x7b4bb3)); m.position.set(cx, 3.2, -0.05); m.visible = false; T.g.add(m);
  const trim = mesh(new THREE.BoxGeometry((w || 2.1) + 0.04, 0.07, 1.79), mat(0xf2c14e)); trim.position.y = -0.27; m.add(trim);
  const C = { m, down: false };
  C.drop = async ms => { m.visible = true; C.down = true; const y0 = m.position.y; sfx('whoosh'); await tween(ms || 700, k => { m.position.y = y0 + (T.Y + 0.33 - y0) * ease(k); }); };
  C.set = () => { m.visible = true; C.down = true; m.position.y = T.Y + 0.33; };
  C.lift = async ms => { const y0 = m.position.y; sfx('whoosh'); await tween(ms || 700, k => { m.position.y = y0 + (3.2 - y0) * ease(k); }); m.visible = false; C.down = false; };
  C.wiggle = async () => { const x0 = m.position.x; await tween(500, k => { m.position.x = x0 + Math.sin(k * Math.PI * 4) * 0.05; }); m.position.x = x0; };
  return C;
}
// a number sprite for blocks on the mini balance
function numSprite(text, gold) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = gold ? '#fff3b0' : '#ffffff'; x.beginPath(); x.arc(64, 64, 56, 0, Math.PI * 2); x.fill(); x.lineWidth = 8; x.strokeStyle = gold ? '#c9962b' : '#8a6fd1'; x.stroke();
  x.fillStyle = '#3b2f5c'; x.font = '700 ' + (String(text).length > 1 ? 62 : 74) + 'px Andika, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(text), 64, 68);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.scale.set(0.42, 0.42, 1); sp.renderOrder = 5; return sp;
}
// display-only 3D balance (F53 s2 look-back, and the fallback when the kit's S.balance is missing)
function miniBalance(S, left, right) {
  const g = new THREE.Group();
  const wood = mat(0x9c6b36), brass = mat(0xe0b44a), panM = mat(0xf2d38a);
  const base = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.16, 20), wood); base.position.y = 0.08; g.add(base);
  const post = mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.75, 12), wood); post.position.y = 0.95; g.add(post);
  const pivot = new THREE.Group(); pivot.position.y = 1.85; g.add(pivot);
  const L = 1.65; pivot.add(mesh(new THREE.BoxGeometry(2 * L + 0.2, 0.12, 0.16), brass));
  const pans = [-1, 1].map(sg => { const hang = new THREE.Group(); g.add(hang); const rope = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), mat(0x6b4a2a)); rope.position.y = -0.42; hang.add(rope);
    const pan = mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.12, 24), panM); pan.position.y = -0.86; hang.add(pan); const load = new THREE.Group(); load.position.y = -0.8; hang.add(load); return { sg, hang, load }; });
  let ang = 0;
  const place = () => pans.forEach(p => p.hang.position.set(Math.cos(ang) * L * p.sg, 1.85 + Math.sin(ang) * L * p.sg, 0));
  const st = { left: left.map(v => ({ v, fixed: true })), right: right.map(v => ({ v, fixed: true })) };
  function draw() {
    pans.forEach((p, k) => { while (p.load.children.length) p.load.remove(p.load.children[0]);
      st[k ? 'right' : 'left'].forEach((it, i) => { const m = mesh(geo('mbcube', () => new THREE.BoxGeometry(0.36, 0.36, 0.36)), mat(it.fixed ? 0xd9a35b : 0xb9a5f0)); m.position.set(((i % 3) - 1) * 0.38, 0.19 + Math.floor(i / 3) * 0.37, 0);
        const sp = numSprite(it.v, !it.fixed); sp.position.set(0, 0.03, 0.24); m.add(sp); p.load.add(m); }); });
  }
  place(); draw();
  S.place(g, { pos: S.anchor.clone() }); g.scale.setScalar(1.3);
  const B = { g, st,
    weights: () => [sum(st.left.map(x => x.v)), sum(st.right.map(x => x.v))],
    put(side, v) { st[side] = st[side].filter(x => x.fixed); if (v != null) st[side].push({ v, fixed: false }); draw(); },
    tilt(ms) { const [lw, rw] = B.weights(), d = lw - rw, a = d === 0 ? 0 : Math.max(-0.32, Math.min(0.32, Math.sign(d) * (0.12 + Math.min(0.2, Math.abs(d) * 0.03)))), a0 = ang;
      sfx('thud'); return tween(ms || 900, k => { const e = k < 1 ? 1 - Math.pow(1 - k, 3) * Math.cos(k * 9) : 1; ang = a0 + (a - a0) * Math.min(1.15, e); place(); pivot.rotation.z = ang; }); },
    level(ms) { const a0 = ang; return tween(ms || 500, k => { ang = a0 * (1 - ease(k)); place(); pivot.rotation.z = ang; }); },
  };
  return B;
}

/* =====================================================================================================================
   5. F53 Markedsvekta – LIKHET E1 (level the balance), E3 (the □ of an equation, checked by the balance)
   ===================================================================================================================== */
const decompose = (t, pal) => { const out = []; let r = t; for (const v of pal.slice().sort((a, b) => b - a)) while (r >= v) { out.push(v); r -= v; } return out; };
async function runF53(item, S) {
  css();
  const p = item.params, sup = item.sup | 0, t = +item.target;
  let left, right, side, eq = p.eq || null;
  if (item.rung === 3) { const sd = sidesOf(p.eq); left = sd.left; right = sd.right; side = sd.box; }
  else { left = p.left.slice(); right = p.right.slice(); side = p.addTo === 'left' ? 'left' : 'right'; }
  const lw = sum(left), rw = sum(right);
  const oper = Math.max(lw, rw);                     // OPERATIONAL: «the answer comes next» → the heavy side's sum
  const scroll = eq ? card(S, eqHtml(eq), 'scroll') : null;
  // s2: the □ is typed and the balance checks HER number (E3 always; E1 every other time – «Hvor mange må på?»); no kit → the same
  const mini = (item.rung === 3 && sup >= 2) || (item.rung === 1 && sup >= 2 && (p.keypad != null ? !!p.keypad : Math.random() < 0.5)) || !S.balance;
  setG(item, item.rung === 1 && !mini ? 0.01 : mini ? 0.01 : 0.0001, item.rung === 1 && !mini ? 'balance' : mini ? 'keypad' : 'twostep');
  const tagOf = v => v === oper ? 'OPERATIONAL' : v === lw + rw ? 'ADD-ALL' : Math.abs(v - t) === 1 ? 'OFF-BY-ONE' : 'OTHER';
  const hintBal = async tag => { await say(S, tag === 'OPERATIONAL' || tag === 'HELP' ? 'pr53_h_lik' : 'pr53_h_tung'); if (sup === 0 && tag !== 'HELP') await say(S, 'pr53_h_tell'); };
  // s2 E3 (or no kit balance): a display balance; she types the □; the balance acts out HER number
  if (mini) {
    const MB = miniBalance(S, left, right);
    await sleep(400); await MB.tilt(700);         // the □ is still empty: the heavy side is down
    if (S.ended) return S.result();
    await say(S, item.rung === 3 ? 'pr53_ruta_vekt' : 'pr53_lik');
    S.prompt(item.rung === 3 ? 'pr53_skriv' : 'pr53_vekt', {});
    S.lookBack(async v => { MB.put(side, +v); if (scroll) scroll.innerHTML = eqHtml(eq, v); await MB.tilt(900); await say(S, 'kit_bal_tung'); await sleep(500); MB.put(side, null); await MB.level(400); if (scroll) scroll.innerHTML = eqHtml(eq); });
    await keypad(S, t, { showLen: sup === 0, hint: async (tag) => hintBal(tag || 'OTHER') });
    MB.put(side, t); if (scroll) scroll.innerHTML = eqHtml(eq, t); await MB.tilt(700); await say(S, 'pr53_ok');
    return S.result();
  }
  // s0/s1 E3 and E1: the kit's 3D balance – tap blocks / fruit onto the light pan, «Sjekk» tips the beam
  const objMode = item.rung === 1 && sup === 0;
  // v5d WP-R3 (WP-E2 / WP-A request): any small food model sits on the pans – the item's surface (the engine's theme food: nøtt, mais,
  // n_blomst …), else the encounter's food (ctx.theme.model / things from befriend.js), else apples; the line says «frukt» only for fruit
  const has = m => !!m && !!(F.VOX && F.VOX.has && F.VOX.has(m));
  const th = S.ctx && S.ctx.theme && typeof S.ctx.theme === 'object' ? S.ctx.theme : null;
  const thFood = th ? [th.model].concat(th.things || [], th.food || []).find(has) || null : null;
  const fruit = [p.surface && p.surface.model, thFood, 'eple'].find(has) || 'eple';
  const FRUKT = ['eple', 'pære', 'banan', 'plomme', 'appelsin', 'sitron', 'jordbær', 'druer', 'drue', 'kirsebær', 'bær', 'blåbær', 'melon', 'kiwi', 'mango', 'ananas'];
  const mkObj = () => ({ v: 'u', w: 1, model: has(fruit) ? fruit : null, label: has(fruit) ? null : '1' });
  let fixedL, fixedR, palette, solution;
  if (objMode) {
    fixedL = Array.from({ length: lw }, () => Object.assign(mkObj(), { v: 'f' })); fixedR = Array.from({ length: rw }, () => Object.assign(mkObj(), { v: 'f' }));
    palette = [mkObj()]; solution = { [side]: Array(t).fill('u') };
  } else {
    fixedL = left.map(v => ({ v: 'f' + v, w: v, label: String(v) })); fixedR = right.map(v => ({ v: 'f' + v, w: v, label: String(v) }));
    const pal = sup === 0 ? [1] : [1, 2, 5];
    palette = pal.map(v => ({ v: 'p' + v, w: v, label: String(v) }));
    solution = { [side]: decompose(t, pal).map(v => 'p' + v) };
  }
  await sleep(300);
  if (item.rung === 3) await say(S, 'pr53_ruta_vekt');
  if (S.ended) return S.result();
  S.prompt(objMode ? (FRUKT.includes(fruit) || !F.TPL.has('pr53_like') ? 'pr53_frukt' : 'pr53_like') : 'pr53_legg', {});
  S.lookBack(async () => { await sleep(700); });       // the beam already tipped on «Sjekk» (kit) – that IS the look-back; a beat to see it
  const bp = S.balance({ left: fixedL, right: fixedR, palette, pan: side, solution, max: 26,
    check: st => st.rw === st.lw });
  if (S.active) S.active.wrongValue = () => ({ [side]: Array(t + 1).fill(objMode ? 'u' : 'p1') });
  // after the 2nd error (C) the solution may show the number: the □ on the scroll gets it, the palette card glows
  const balW = S.active;
  S._solFn = async () => { if (balW && balW.solution) balW.solution(); if (scroll) scroll.innerHTML = eqHtml(eq, t); await say(S, 'kit_sol_balance'); };
  if (S.active) S.active.hint = async (tag, v) => { const her = v && v.lw != null ? (side === 'left' ? v.lw - lw : v.rw - rw) : null; await hintBal(her != null && tag !== 'HELP' ? tagOf(her) : tag); };
  await bp;
  S._solFn = null;
  if (scroll) scroll.innerHTML = eqHtml(eq);
  if (item.rung === 1) { setG(item, 0.01, 'balance'); return S.result(); }
  if (balW && balW.destroy) balW.destroy();          // the palette + «Sjekk» leave the tray; her blocks stay on the 3D pan
  // E3: the □ is what she put on the balance – type it
  await say(S, 'pr53_ruta');
  S.lookBack(async v => { if (scroll) { scroll.innerHTML = eqHtml(eq, v); wob(scroll); } await sleep(1200); if (scroll) scroll.innerHTML = eqHtml(eq); });
  await keypad(S, t, { showLen: sup === 0, hint: async tag => { await say(S, tag === 'OPERATIONAL' ? 'pr53_h_lik' : 'pr53_h_ruta'); } });
  if (scroll) scroll.innerHTML = eqHtml(eq, t);
  setG(item, 0.0001, 'twostep');
  return S.result();
}

/* =====================================================================================================================
   6. F54 Likningsrullene – LIKHET E2 (tap every false scroll, then fix one) and E3 (one scroll with a □)
   ===================================================================================================================== */
// the king's table with the scrolls (the world the scroll cards come from); n scrolls, the crown beside them
function kingsTable(S, n) {
  const g = new THREE.Group();
  const wood = mat(0x8a5a2b);
  const top = mesh(new THREE.BoxGeometry(3.0, 0.12, 1.3), wood); top.position.y = 0.82; g.add(top);
  const cloth = mesh(new THREE.BoxGeometry(3.04, 0.02, 0.7), mat(0xc0392b)); cloth.position.y = 0.89; g.add(cloth);
  [[-1.35, -0.5], [1.35, -0.5], [-1.35, 0.5], [1.35, 0.5]].forEach(([x, z]) => { const l = mesh(geo('tleg', () => new THREE.BoxGeometry(0.12, 0.8, 0.12)), wood); l.position.set(x, 0.4, z); g.add(l); });
  const scrolls = [];
  for (let i = 0; i < n; i++) {
    const sc = new THREE.Group();
    const roll = mesh(geo('scroll', () => new THREE.CylinderGeometry(0.075, 0.075, 0.62, 12)), mat(0xf3e0b5)); roll.rotation.z = Math.PI / 2; sc.add(roll);
    const band = mesh(geo('sband', () => new THREE.CylinderGeometry(0.08, 0.08, 0.07, 12)), mat(0xc0392b)); band.rotation.z = Math.PI / 2; sc.add(band);
    sc.position.set((i - (n - 1) / 2) * 0.72, 0.97, (i % 2 ? -0.18 : 0.12)); sc.rotation.y = (i % 2 ? 0.25 : -0.2); g.add(sc); scrolls.push(sc);
  }
  const crown = fitModel('gl_crown', 0.32); if (crown) { crown.position.set(1.15, 0.89, -0.35); g.add(crown); }
  g.scale.setScalar(1.25);
  S.place(g, { pos: S.anchor.clone().addScaledVector(S.toCam, -0.4) });
  return { g, scrolls };
}
function sidesHtml(eq, x) { const [a, b] = sidesWith(eq, x); return `<span class="sides">${a}  ${a === b ? '=' : '≠'}  ${b}</span>`; }
async function fixScroll(S, item, eq, t, o) {
  o = o || {};
  const sup = item.sup | 0;
  const shp = o.shape || null;
  const scroll = card(S, eqHtml(eq, null, shp), 'scroll');
  const giv = (String(eq).match(/\d+/g) || []).map(Number);
  const [Lx] = String(eq).split('=');
  const operV = !Lx.includes(BOX) ? sideVal(Lx, 0) : null;
  S.lookBack(async v => { scroll.innerHTML = eqHtml(eq, v) + sidesHtml(eq, v); wob(scroll); await sleep(2200); scroll.innerHTML = eqHtml(eq, null, shp); });
  const p = keypad(S, t, { showLen: sup === 0, hint: async (tag, v) => {
    const oper = tag === 'OPERATIONAL' || (v != null && operV != null && +v === operV);
    await say(S, oper ? 'pr54_h_oper' : 'pr54_h_ruta'); } });
  void giv;
  await p;
  scroll.innerHTML = eqHtml(eq, t) + sidesHtml(eq, t);
  sfx('chime');
  return scroll;
}
async function runF54(item, S) {
  css();
  const p = item.params, sup = item.sup | 0;
  const scrollOnly = !Array.isArray(p.bundle);
  const gE2 = scrollOnly ? 0.01 : (1 / (Math.pow(2, p.bundle.length) - 1)) * 0.01;
  if (scrollOnly) setG(item, 0.01, 'keypad'); else setG(item, gE2, 'twostep');
  const dyr = inMeeting(S);                       // v5r2: an animal meeting – the scroll cards only, no king
  if (!dyr) { try { kingsTable(S, scrollOnly ? 1 : p.bundle.length); } catch (e) { /* decoration only */ } }
  const okLine = dyr ? 'pr54_ok_n' : 'pr54_ok';
  await sleep(300);
  if (S.ended) return S.result();
  if (scrollOnly) {
    if (!dyr) await say(S, 'pr54_kongen');
    // s1/s2: every other scroll uses a shape for the unknown («Hva er trekanten verdt?»)
    const shape = sup >= 1 && (p.shape != null ? !!p.shape : Math.random() < 0.5) ? pick(SHAPES) : null;
    S.prompt(shape ? 'pr54_verdt_' + shape.id : 'pr54_ruta', {});
    await fixScroll(S, item, p.eq, +item.target, { shape });
    await say(S, okLine);
    return S.result();
  }
  // E2 (and R6 fact families): the bundle
  if (p.family3) await say(S, 'pr54_familie');
  const bundle = p.bundle, falseIdx = p.falseIdx.slice().sort((a, b) => a - b), fix = p.fix;
  const items = bundle.map((e, i) => ({ v: i, label: String(e.t).replace(/-/g, MINUS) }));
  const operIdx = bundle.map((e, i) => e.tag === 'OPERATIONAL' ? i : -1).filter(i => i >= 0);
  const stepA = async S2 => {
    S2.prompt('pr54_feil', {});
    S2.lookBack(async v => {   // her verdict: a seal on every scroll she called false, they wobble (the truth is NOT shown)
      const B = S2.active && S2.active.el; if (!B) return;
      const cards = [...B.querySelectorAll('.kcard')];
      (v || []).forEach(i => { const c = cards[i]; if (!c) return; c.style.position = 'relative'; const s = el('span', 'pb-seal', '🔖'); c.appendChild(s); c.classList.add('pb-wob'); setTimeout(() => { s.remove(); c.classList.remove('pb-wob'); }, 1800); });
      await sleep(1900);
    });
    let pr;
    if (S2.tapAll) {
      pr = S2.tapAll(items, { answer: falseIdx });
      if (S2.active && S2.active.el) S2.active.el.classList.add('pb-scrolls');
    } else pr = tapAllLite(S2, items, falseIdx);
    if (S2.active) S2.active.hint = async (tag, v) => {
      const missedOper = operIdx.some(i => !(v || []).includes(i));
      await say(S2, missedOper && tag !== 'HELP' ? 'pr54_h_oper' : 'pr54_h_sider');
      if (tag !== 'HELP') await say(S2, 'pr54_h_alle');
    };
    return pr;
  };
  const stepB = async S2 => {
    await say(S2, 'pr54_rett');
    S2.prompt('pr54_ruta', {});
    await fixScroll(S2, item, fix.t, +fix.answer);
    return +fix.answer;
  };
  await chain(S, stepA, stepB);
  setG(item, gE2, 'twostep');
  await say(S, okLine);
  return S.result();
}
// fallback select-all (no kit): cards + Ferdig
function tapAllLite(S, items, answer) {
  css();
  const w = baseW(S, 'pb-tapall');
  const box = el('div', 'pb-row2'); const sel = new Set();
  const cards = items.map((it, i) => { const b = el('button', 'pb-btn', caseT(it.label)); b.addEventListener('click', e => { e.stopPropagation(); if (w.locked) return; if (sel.has(i)) sel.delete(i); else sel.add(i); b.classList.toggle('glow', sel.has(i)); }); box.appendChild(b); return b; });
  const done = el('button', 'pb-btn', 'Ferdig'); done.addEventListener('click', e => { e.stopPropagation(); if (w.locked || !sel.size) return; S.submit([...sel].sort((a, b) => a - b), w); });
  box.appendChild(done); S.tray().appendChild(box); w.parts.push(box); w.el = box;
  const key = a => (a || []).slice().sort((x, y) => x - y).join(',');
  w.feed = v => { sel.clear(); (v || []).forEach(i => sel.add(i)); cards.forEach((c, i) => c.classList.toggle('glow', sel.has(i))); return S.submit([...sel].sort((a, b) => a - b), w); };
  w.rightValue = () => answer.slice(); w.wrongValue = () => answer.length > 1 ? answer.slice(1) : answer.concat([items.findIndex((_, i) => !answer.includes(i))]).sort((a, b) => a - b);
  w.solution = () => cards.forEach((c, i) => c.classList.toggle('glow', answer.includes(i)));
  const p = S.arm({ answer: answer.slice(), check: v => key(v) === key(answer) }); S.use(w);
  if (S.setDefaults) S.setDefaults(1 / (Math.pow(2, items.length) - 1), 'subset');
  return p;
}

/* =====================================================================================================================
   7. F55 Dukketeateret – P1–P5 acted out; equation tiles with «?», then the keypad; reverse mode for P1
   ===================================================================================================================== */
const PROP = { fugl: 'tree', and: 'pond', sau: 'grass', frosk: 'stone', bolle: 'tray', kake: 'tray', eple: 'tray' };
// the story's numbers in one shape: start / change / end (change stories), whole / part / rest (part-whole), big / small (compare)
function storyOf(item) {
  const p = item.params, N = p.nums || {}, t = +item.target;
  if (p.schema === 'part-whole') return { kind: 'pw', whole: N.whole, part: N.part, rest: N.other != null ? N.other : t, unk: 'rest', givens: [N.whole, N.part] };
  if (p.schema === 'compare') return { kind: 'cmp', big: N.big, small: N.small, diff: N.diff != null ? N.diff : t, unk: 'diff', givens: [N.big, N.small] };
  const join = p.op ? p.op === '+' : /get|come|got|came/.test(String(p.frame || p.rel || ''));
  if (p.unknown === 'result') return { kind: 'chg', join, start: N.a, change: N.b, end: N.c != null ? N.c : t, unk: 'end', givens: [N.a, N.b] };
  if (p.unknown === 'change') return { kind: 'chg', join, start: N.start, change: N.change != null ? N.change : t, end: N.end, unk: 'change', givens: [N.start, N.end] };
  return { kind: 'chg', join, start: N.start != null ? N.start : t, change: N.change, end: N.end, unk: 'start', givens: [N.change, N.end] };
}
// the canonical model of the story (the solution ghost)
function canonEq(st) {
  if (st.kind === 'pw') return [String(st.whole), MINUS, String(st.part), '?'];
  if (st.kind === 'cmp') return [String(st.big), MINUS, String(st.small), '?'];
  const op = st.join ? '+' : MINUS;
  if (st.unk === 'end') return [String(st.start), op, String(st.change), '?'];
  if (st.unk === 'change') return [String(st.start), op, '?', String(st.end)];
  return ['?', op, String(st.change), String(st.end)];
}
// the 3D scene (6–10 s): numbers on signs, number-free relation sentences; returns the props for look-backs
async function playScene(S, item, T, st) {
  const p = item.params, sup = item.sup | 0, sp = (p.speak || []).filter(x => x && has(x.id));
  // the story sentences: all but the last narrate (start, change …), the last one is the question
  const narr = sp.slice(0, Math.max(0, sp.length - 1)), qLine = sp.length ? sp[sp.length - 1] : null;
  const sayL = x => (x && !S.ended ? S.say(x.id, x.slots || {}, '') : Promise.resolve());
  const line = i => sayL(narr[i]);
  const nNarr = narr.length;
  const startLine = nNarr >= 2 ? narr[0] : null, changeLine = nNarr >= 2 ? narr[1] : narr[0] || null;
  S.replay = () => sayL(qLine);
  const mk = tokenMaker(p);
  const poss = /^poss/.test(String(p.frame || '')) || /^poss/.test(String(p.rel || ''));
  const who = p.names && p.names.who;
  const CX = poss ? -0.15 : -0.55, WING = 3.3;
  const R = { T, groups: {}, cover: null };
  if (poss && who) { const c = PERSON[who] || [0xe86a8a, 0x6b3e1e]; const pu = T.add(puppet(c[0], c[1]), -1.85, 0.1); S.label(pu, who, { kind: 'word', dy: 1.0 }); R.person = pu; }
  const flyUp = p.surface === 'fugl';
  const outPos = (n, z0) => Array.from({ length: n }, (_, i) => ({ x: WING + (i % 5) * 0.3, y: flyUp ? 2.0 + (i % 3) * 0.2 : 0, z: z0 - Math.floor(i / 5) * 0.3 }));
  await say(S, 'pr55_se');
  if (st.kind === 'pw') {
    // the whole under the cloth (sign = whole); the known part comes out to the left; the rest stays under the cloth («?»)
    const all = slotsAt(st.whole, 0.55, { per: 5 });
    const rest = Array.from({ length: st.rest }, () => mk(1)), part = Array.from({ length: st.part }, () => mk(0));
    const C = cloth(T, 0.55, 2.1); C.set(); R.cover = C;
    const sW = T.sign(0.55, 1.25, 0, st.whole);
    rest.forEach((o, i) => T.add(o, all[i].x, all[i].z));
    part.forEach((o, i) => T.add(o, all[st.rest + i].x, all[st.rest + i].z)); hide(part);
    await sleep(500);
    await say(S, 'pr_pw_' + p.frame);           // «Det ligger noen epler i kurven.» (the story's whole – number-free; lommer has its own)
    await sleep(400);
    const l0 = line(0);
    const out = slotsAt(st.part, -1.45, { per: 3, dx: 0.34 });
    show(part); await moveTo(T, part, out, 1300, 0.35);
    const sP = T.sign(-1.45, 1.25, 0, st.part); void sP;
    await l0; await line(1);
    await T.moveSign(sW, 0.55, 1.7, -0.3, 400); T.sign(0.55, 0.95, 0.95, '?');
    if (sup === 0) { await C.lift(800); }
    R.groups = { part, rest };
  } else if (st.kind === 'cmp') {
    const tower = p.frame === 'tårn';
    const rows = [[st.big, 0.6, (p.names && p.names.who) || ''], [st.small, -0.5, (p.names && p.names.who2) || '']];
    const objsA = [], objsB = [];
    for (const [n, z, nm] of rows) {
      const list = z > 0 ? objsA : objsB;
      if (tower) {
        const x = z > 0 ? -0.9 : 0.9;
        const cs = Math.min(1, 2.3 / (0.2 * Math.max(st.big, 1))), h = 0.2 * cs;      // the taller tower stays under the valance
        for (let i = 0; i < n; i++) {
          const c = cubeTok(z > 0 ? (i % 2 ? 0xc98f45 : 0xe8b46a) : (i % 2 ? 0x9f8be0 : 0xc4b5f5)); list.push(c); T.add(c, x, 0, T.Y + i * h); c.scale.setScalar(0.001);
          sfx('pling', i % 10); tween(180, k => { const e = Math.max(0.001, ease(k)); c.scale.set(2.2 * e, cs * e * 0.96, 2.2 * e); }); await sleep(70);
        }
        await sleep(250);
        T.sign(x, T.Y + n * h + 0.35, 0, n);
        S.label(T.add(new THREE.Object3D(), x, 0.7, T.Y - 0.1), z > 0 ? 'tårnet' : 'muren', { kind: 'word' });
      } else {
        const dx = sup === 0 ? Math.min(0.3, 3.7 / Math.max(1, st.big - 1)) : Math.min(z > 0 ? 0.27 : 0.36, 3.7 / Math.max(1, n - 1));
        const pos = Array.from({ length: n }, (_, i) => ({ x: -1.55 + i * dx, z }));
        for (let i = 0; i < n; i++) list.push(mk(0));
        if (nm) { const c = PERSON[nm] || [0x8a6fd1, 0x3b2a1a]; const pu = T.add(puppet(c[0], c[1], true), -2.0, z); S.label(pu, nm, { kind: 'word', dy: 0.7 }); }
        await popIn(T, list, pos, 900);
        T.sign(Math.max(...pos.map(q => q.x)) + 0.5, z > 0 ? 0.7 : 1.0, z, n);
      }
    }
    await Promise.all(sp.slice(0, nNarr).map((x, i) => sleep(i * 1600).then(() => line(i))));
    await sleep(900);
    R.groups = { a: objsA, b: objsB };
  } else {
    // change stories (join / separate) – start, change, end
    const joinGrid = slotsAt(Math.max(st.start, st.end, st.start + (st.join ? st.change : 0)), CX, { per: 5 });
    const startObjs = Array.from({ length: st.start }, () => mk(0));
    const C = cloth(T, CX, 2.1); R.cover = C;
    let sS;
    if (st.unk === 'start') {          // nobody knows how many were there first: under the cloth
      C.set(); startObjs.forEach((o, i) => T.add(o, joinGrid[i].x, joinGrid[i].z));
      sS = T.sign(CX, 1.25, 0, '?');
      await sleep(700); await sayL(startLine);
    } else {
      const l0 = sayL(startLine);
      await popIn(T, startObjs, joinGrid, 1300);
      sS = T.sign(CX, 1.25, 0, st.start);
      await l0; await sleep(600);                 // a beat to see the group and its number
    }
    const lc = sayL(changeLine);
    if (st.join) {
      const newObjs = Array.from({ length: st.change }, () => mk(0));
      const dest = joinGrid.slice(st.start, st.start + st.change);
      newObjs.forEach((o, i) => T.add(o, WING + (i % 5) * 0.3, 0.4 - Math.floor(i / 5) * 0.3, flyUp ? 1.6 : null));
      if (st.unk === 'change') { await C.drop(600); hide(newObjs); newObjs.forEach((o, i) => o.position.set(dest[i].x, T.Y, dest[i].z)); const sQ = T.sign(WING - 0.4, 1.2, 0, '?'); await T.moveSign(sQ, CX + 0.6, 1.0, 0.6, 1300); await C.wiggle(); sQ.remove(); T.sign(CX + 1.3, 1.0, 0.6, '?'); }
      else {
        const sC = T.sign(WING - 0.4, 1.2, 0, st.change);
        await moveTo(T, newObjs, dest.map(d => ({ x: d.x, y: 0, z: d.z })), 1500, flyUp ? 0.6 : 0.25);
        sC.remove(); T.sign(CX + 1.3, 1.0, 0.6, st.change);
        if (st.unk === 'start') { hide(newObjs); await C.wiggle(); }
      }
      R.groups = { start: startObjs, change: newObjs };
    } else {
      const goN = st.change, stay = startObjs.slice(0, startObjs.length - goN), go = startObjs.slice(startObjs.length - goN);
      if (st.unk === 'change') {           // they leave under the cloth: a «?» sign goes, the rest is seen when the cloth lifts
        await C.drop(600); hide(go); const sQ = T.sign(CX, 1.0, 0.6, '?'); await T.moveSign(sQ, WING, 1.3, 0.3, 1300); sQ.remove(); T.sign(CX + 1.4, 1.0, 0.7, '?');
      } else {
        if (st.unk === 'start') { await C.wiggle(); show(go); go.forEach(o => { o.position.z = 0.85; }); }
        const sC = T.sign(CX + 0.9, 1.1, 0.7, st.change);
        if (p.frame === 'eat') {          // «… blir spist»: they are eaten where they lie (one by one, a soft munch), not walked away
          go.forEach(o => { o.position.y += 0.08; });
          for (const o of go) { if (S.ended) break; sfx('pop'); const s0 = o.scale.x; await tween(260, k => o.scale.setScalar(Math.max(0.001, s0 * (1 - ease(k))))); }
          await sleep(300);
        } else await moveTo(T, go, outPos(goN, 0.4), 1500, flyUp ? 0.8 : 0.3);
        hide(go); await T.moveSign(sC, WING - 0.6, 1.1, 0.5, 400);
      }
      R.groups = { start: startObjs, stay, go };
    }
    await lc;
    // the end state: the start number stays as a record on the left, the group gets its own sign («?» or the number now)
    await T.moveSign(sS, -1.75, 2.3, -0.5, 500);
    if (st.unk === 'end') { if (sup >= 1) await C.drop(700); }
    else if (C.down && (st.unk !== 'start' || sup === 0 || !st.join)) { show(st.join ? startObjs.concat(R.groups.change || []) : R.groups.stay); await C.lift(700); }
    R.endSign = T.sign(CX, 1.25, 0.2, st.unk === 'end' ? '?' : st.end);
  }
  await sleep(300);
  await sayL(qLine);                 // the question («Hvor mange er igjen?») – number-free, after the scene
  return R;
}
// look-back for the tiles: her equation goes on the theatre sign; her operation is acted out by a ghost group (2–3 s)
async function actHerEq(S, T, st, v, sign) {
  const vals = eqParse(v);
  if (sign) { sign.set(String(v).replace(/-/g, ' − ').replace(/\+/g, ' + ').replace('=', ' = ')); }
  if (!vals) { await sleep(1500); return; }
  const plus = vals[1] === '+';
  const n = Math.min(10, Math.max(1, +(vals[2] === '?' ? vals[0] : vals[2]) || 3));
  const ghosts = Array.from({ length: n }, () => ballTok(plus ? 0x9be08a : 0xd9cdf2, 0.1));
  const from = plus ? 3.2 : 0.2, to = plus ? 0.6 : 3.2;
  ghosts.forEach((o, i) => T.add(o, from + (i % 5) * 0.25, 0.8 - Math.floor(i / 5) * 0.25));
  sfx(plus ? 'pop' : 'whoosh');
  await moveTo(T, ghosts, ghosts.map((o, i) => ({ x: to + (i % 5) * 0.25, y: 0, z: o.position.z })), 1500, 0.3);
  await say(S, 'pr_din');
  ghosts.forEach(o => T.g.remove(o));
  void st;
}
async function runF55(item, S) {
  css();
  const p = item.params, sup = item.sup | 0, t = +item.target;
  const st = storyOf(item);
  const T = theatre(S, { prop: PROP[p.surface] || null });
  const reverse = item.rung === 1 && sup <= 1 && (p.reverse != null ? !!p.reverse : Math.random() < 0.35) && st.kind === 'chg';
  setG(item, reverse ? 0.0005 : 0.0015, 'twostep');     // tiles (≈ 1/6 true arrangements) × keypad; reverse: act-out (≈ 1/20) × keypad
  if (reverse) return runReverse(item, S, T, st);
  const R = await playScene(S, item, T, st);
  if (S.ended) return S.result();
  storyText(S, item);
  let topL = null;
  const top = { set(x) { if (!topL) topL = T.sign(0.3, 2.35, -0.5, x); else topL.set(x); } };
  const answer = canonEq(st);
  const nums = st.givens.map(String);
  const kw = (item.distractors || []).find(d => d.tag === 'KEYWORD');
  const tagOf = v => { const vals = eqParse(v); if (!vals) return 'OTHER'; if (vals.filter(x => x === '?').length !== 1) return 'NOQ'; const nset = vals.filter(x => x !== '?' && x !== '+' && x !== MINUS).sort().join(',');
    if (nset !== nums.slice().sort().join(',')) return 'ECHO'; const x = solveEq(vals); if (kw && x === kw.v) return 'KEYWORD'; return 'OTHER'; };
  const checkEq = v => { const vals = eqParse(v); if (!vals) return false; const qs = vals.filter(x => x === '?').length; if (qs !== 1) return false;
    const ns = vals.filter(x => x !== '?' && x !== '+' && x !== MINUS).map(String).sort(); if (ns.join(',') !== nums.slice().sort().join(',')) return false; return eqTruth(vals, t); };
  const tag0 = S.tagOf;
  const stepTiles = async S2 => {
    S2.prompt('pr55_lag', {});
    S2.lookBack(async v => { await actHerEq(S2, T, st, v, top); if (topL) { topL.remove(); topL = null; } });
    const qi = answer.indexOf('?');
    const pr = eqBuilder(S2, { nums, t, answer, check: checkEq, preset: sup === 0 ? { i: qi, v: '?' } : null,
      hint: async (tag) => {
        if (tag === 'NOQ') { await say(S2, 'pr55_lag_sp'); return; }
        if (tag === 'KEYWORD' || tag === 'HELP') await say(S2, st.kind === 'chg' && st.unk === 'start' ? 'pr55_h_forst' : st.kind === 'pw' ? 'pr55_h_del' : st.kind === 'cmp' ? 'pr55_h_cmp' : 'pr55_h_flere');
        else await say(S2, 'pr55_h_tall');
        await say(S2, 'pr_sporsmal');
      } });
    S2.tagOf = tagOf;
    return pr;
  };
  const stepKeys = async (S2, got) => {
    const her = eqParse(got) || answer;
    top.set(eqTxt(her));
    S2.tagOf = tag0;
    S2.prompt('pr55_svar', {});
    S2.lookBack(async v => { const shown = her.map(x => x === '?' ? String(v) : x); top.set(eqTxt(shown)); sfx('boing'); await sleep(1600); top.set(eqTxt(her)); });
    return keypad(S2, t, { showLen: sup === 0, hint: async () => { await say(S2, sup === 0 && R.cover && !R.cover.down ? 'pr55_h_tell' : 'pr55_h_regn'); } });
  };
  await chain(S, stepTiles, stepKeys);
  setG(item, 0.0015, 'twostep');
  // payoff: the hidden group is shown, the sign gets the number
  if (R.cover && R.cover.down) { const g = R.groups; show(st.kind === 'pw' ? (g.rest || []) : st.join ? (g.start || []).concat(g.change || []) : (g.stay || [])); await R.cover.lift(700); }
  top.set(eqTxt(answer.map(x => x === '?' ? String(t) : x)));
  sfx('sparkle'); await say(S, 'pr55_ok');
  return S.result();
}
// reverse mode: the equation is given; she acts it out (Hent en til / Send en bort + Ferdig), then types the result
async function runReverse(item, S, T, st) {
  const sup = item.sup | 0, t = +item.target, a = st.start, b = st.change, plus = st.join;
  const mk = tokenMaker(item.params);
  const eqTxt = `${a} ${plus ? '+' : MINUS} ${b} = ${BOX}`;
  const sc = card(S, eqHtml(eqTxt), 'scroll');
  const grid = slotsAt(a + (plus ? b + 6 : 0), -0.55, { per: 5 });
  let objs = Array.from({ length: a }, () => mk(0));
  await popIn(T, objs, grid, 1200);
  const sS = T.sign(-0.55, 1.25, 0, a);
  await say(S, 'pr55_spill');
  await say(S, plus ? 'pr55_spill_pluss' : 'pr55_spill_minus');
  if (S.ended) return S.result();
  let moved = 0;
  const gone = [];
  const reset = () => { objs.forEach(o => { if (o.parent) o.parent.remove(o); }); objs = Array.from({ length: a }, () => mk(0)); objs.forEach((o, i) => T.add(o, grid[i].x, grid[i].z)); moved = 0; gone.length = 0; };
  // act step: a custom widget; value = the signed change she made
  const w = baseW(S, 'pb-act');
  const row = el('div', 'pb-row2');
  const bIn = el('button', 'pb-btn', '<span class="ic">➕</span>1'), bOut = el('button', 'pb-btn', '<span class="ic">➖</span>1'), done = el('button', 'kbtn pb-btn', '✓');
  row.append(bIn, bOut, done); S.tray().appendChild(row); w.parts.push(row);
  const busy = { on: false };
  const doIn = async () => { const o = mk(0); const k = objs.length; const d = grid[Math.min(k, grid.length - 1)]; T.add(o, 3.2, d.z); objs.push(o); moved++; sfx('pop'); await moveTo(T, [o], [{ x: d.x, y: 0, z: d.z }], 450, 0.2); };
  const doOut = async () => { if (!objs.length) return; const o = objs.pop(); gone.push(o); moved--; sfx('whoosh'); await moveTo(T, [o], [{ x: 3.4, y: item.params.surface === 'fugl' ? 2 : 0, z: o.position.z }], 450, 0.3); o.visible = false; };
  const press = fn => async e => { e.stopPropagation(); if (w.locked || w.dead || busy.on || S.solved) return; if (gateShut(S)) { S.submitEarly && S.submitEarly(); return; } busy.on = true; try { await fn(); } finally { busy.on = false; } };
  bIn.addEventListener('click', press(doIn)); bOut.addEventListener('click', press(doOut));
  done.addEventListener('click', e => { e.stopPropagation(); if (w.locked || w.dead || busy.on) return; if (!moved) { wob(row); return; } S.submit(moved, w); });
  const want = plus ? b : -b;
  w.feed = v => { reset(); const n = +v || 0; for (let i = 0; i < Math.abs(n); i++) { if (n > 0) { const o = mk(0); const d = grid[Math.min(objs.length, grid.length - 1)]; T.add(o, d.x, d.z); objs.push(o); } else { const o = objs.pop(); if (o) o.visible = false; } } moved = n; return S.submit(moved, w); };
  w.rightValue = () => want; w.wrongValue = () => -want;
  w.solution = () => { reset(); (plus ? bIn : bOut).classList.add('glow'); sS.set(String(a)); };
  w.helpStep = async () => false;
  w.hint = async () => { await say(S, 'pr55_h_spill'); await say(S, plus ? 'pr55_spill_pluss' : 'pr55_spill_minus'); };
  S.lookBack(async v => { sS.set(String(objs.length)); sc.innerHTML = eqHtml(eqTxt); wob(sc); await say(S, 'pr_din'); await sleep(600); reset(); sS.set(String(a)); });
  S.prompt(null);
  const pA = S.arm({ answer: want, check: v => +v === want }); S.use(w);
  if (S.setDefaults) S.setDefaults(0.05, 'build');
  await pA;
  w.destroy();
  // the result
  if (sup >= 1) { const C = cloth(T, -0.55, 2.1); await C.drop(600); }
  sS.set('?');
  S.prompt('pr55_svar', {});
  S.lookBack(async v => { sc.innerHTML = eqHtml(eqTxt, v); wob(sc); await sleep(1500); sc.innerHTML = eqHtml(eqTxt); });
  await keypad(S, t, { showLen: sup === 0, hint: async () => { await say(S, sup === 0 ? 'pr55_h_tell' : 'pr55_h_regn'); } });
  sc.innerHTML = eqHtml(eqTxt, t); sS.set(String(t));
  sfx('sparkle'); await say(S, 'pr55_ok');
  setG(item, 0.0005, 'twostep');
  return S.result();
}

/* =====================================================================================================================
   8. F56 Båndveven – the basic two-ribbon bar model: tag the «?», then the keypad
   ===================================================================================================================== */
// item → {layout:'pw'|'cmp', segs:[{id, row, x0, x1, value, known, name}], rows:[name…], unk: id, max}
function ribbonModel(item) {
  const st = storyOf(item), p = item.params;
  const fr = p.frame, kinds = { epler: ['røde', 'grønne'], kuler: ['blå', 'gule'], sauer: ['svarte', 'hvite'], blomster: ['roser', 'tulipaner'], barn: ['gutter', 'jenter'], lommer: ['den ene', 'den andre'] }[fr];
  if (st.kind === 'cmp') {
    const n1 = fr === 'tårn' ? 'tårnet' : (p.names && p.names.who) || 'den ene', n2 = fr === 'tårn' ? 'muren' : (p.names && p.names.who2) || 'den andre';
    return { layout: 'cmp', st, unk: 'diff', max: st.big, rows: [n1, n2],
      segs: [{ id: 'a', row: 0, x0: 0, x1: st.big, value: st.big, known: true }, { id: 'b', row: 1, x0: 0, x1: st.small, value: st.small, known: true },
        { id: 'diff', row: 1, x0: st.small, x1: st.big, value: st.diff, known: false, diff: true }] };
  }
  let whole, w, a, an, b, bn, unk;
  if (st.kind === 'pw') { whole = 'alle'; w = st.whole; a = st.part; an = kinds ? kinds[0] : 'del'; b = st.rest; bn = kinds ? kinds[1] : 'resten'; unk = 'p2'; }
  else if (st.join) { whole = 'nå'; w = st.end; a = st.start; an = 'først'; b = st.change; bn = 'fikk'; unk = st.unk === 'end' ? 'whole' : st.unk === 'start' ? 'p1' : 'p2'; }
  else { whole = 'først'; w = st.start; a = st.change; an = 'bort'; b = st.end; bn = 'igjen'; unk = st.unk === 'start' ? 'whole' : st.unk === 'change' ? 'p1' : 'p2'; }
  if (!st.join && st.kind === 'chg' && /place/.test(String(p.frame || ''))) an = { fugl: 'fløy', and: 'svømte', frosk: 'hoppet', sau: 'gikk' }[p.surface] || 'gikk';
  if (!st.join && p.frame === 'eat') an = 'spist';
  if (st.join && /place/.test(String(p.frame || ''))) { bn = 'kom'; }
  return { layout: 'pw', st, unk, max: w, rows: [whole, ''],
    segs: [{ id: 'whole', row: 0, x0: 0, x1: w, value: w, known: unk !== 'whole', name: whole },
      { id: 'p1', row: 1, x0: 0, x1: a, value: a, known: unk !== 'p1', name: an }, { id: 'p2', row: 1, x0: a, x1: w, value: b, known: unk !== 'p2', name: bn }] };
}
async function runF56(item, S) {
  css();
  const sup = item.sup | 0, t = +item.target, p = item.params;
  const M = ribbonModel(item);
  setG(item, 0.0025, 'twostep');                          // tag the «?» (1 of 4) × keypad
  const loom = keepEl(S, el('div', 'pb-loom')); document.body.appendChild(loom);
  const scale = 100 / (M.max * 1.35);
  const COL = ['#f6b3c8', '#b3d4f6', '#f7d98b'];
  const tracks = [0, 1].map(r => { const row = el('div', 'pb-lrow'); const nm = el('div', 'pb-name', ''); const tr = el('div', 'pb-track'); row.append(nm, tr); loom.appendChild(row); return { row, nm, tr }; });
  if (M.layout === 'cmp') { tracks[0].nm.textContent = caseT(M.rows[0]); tracks[1].nm.textContent = caseT(M.rows[1]); }
  else { tracks[0].nm.textContent = caseT(M.rows[0]); }
  const segEl = {};
  M.segs.forEach((s, i) => {
    const b = el('button', 'pb-rib' + (s.known ? '' : ' unk') + (s.diff ? ' diffseg' : ''));
    b.style.left = (s.x0 * scale) + '%'; b.style.width = '0%';
    if (s.known) b.style.backgroundColor = COL[i % 3];
    b.innerHTML = s.known ? `<span>${s.value}</span>` : '<span></span>';
    if (M.layout === 'pw' && s.row === 1 && s.name) b.title = s.name;
    tracks[s.row].tr.appendChild(b); segEl[s.id] = b;
  });
  // part names under the parts (pw)
  if (M.layout === 'pw') { const lab = el('div', 'pb-lrow'); lab.style.minHeight = '30px'; const sp = el('div', 'pb-name', ''); const tr = el('div', 'pb-track'); tr.style.height = '30px'; lab.append(sp, tr); loom.appendChild(lab);
    M.segs.filter(s => s.row === 1).forEach(s => { const n = el('div', '', caseT(s.name || '')); n.style.cssText = `position:absolute;left:${s.x0 * scale}%;width:${(s.x1 - s.x0) * scale}%;text-align:center;font:700 24px Andika,sans-serif;color:#5b3e1e;`; tr.appendChild(n); }); }
  // the story: number-free sentences while the ribbons are woven one by one
  const sp = (p.speak || []).filter(x => x && has(x.id));
  await say(S, inMeeting(S) ? 'pr56_vev_n' : 'pr56_vev');           // v5r2: no queen in an animal meeting
  if (M.st.kind === 'pw') await say(S, 'pr_pw_' + p.frame);
  // story order: start → change → end (join: p1 → p2 → whole; separate: whole → p1 → p2), whole → part → rest, a → b → difference
  const order = M.layout === 'cmp' ? ['a', 'b', 'diff'] : (M.st.kind === 'chg' && M.st.join) ? ['p1', 'p2', 'whole'] : ['whole', 'p1', 'p2'];
  for (let i = 0; i < order.length; i++) {
    const s = M.segs.find(x => x.id === order[i]); const b = segEl[s.id];
    const narr = sp.length > 1 && i < sp.length - 1 ? S.say(sp[i].id, sp[i].slots || {}, '') : sleep(500);
    b.style.width = ((s.x1 - s.x0) * scale) + '%'; sfx('pling', i);
    if (sup === 0 && s.known && !s.diff) { b.classList.add('unit'); b.style.setProperty('--u', (100 / Math.max(1, s.value)) + '%'); }
    await narr; await sleep(250);
  }
  if (sp.length) await S.say(sp[sp.length - 1].id, sp[sp.length - 1].slots || {}, '');
  S.replay = () => (sp.length ? S.say(sp[sp.length - 1].id, sp[sp.length - 1].slots || {}, '') : say(S, 'pr_hor_igjen'));
  // one more place the «?» could go: «til sammen» beside a compare model, «forskjell» beside a part-whole model – the KEYWORD
  // choice («flere» → add?) is the decision, not «find the empty ribbon»
  const xtra = M.layout === 'cmp' ? { id: 'total', html: '<b>{ }</b> til sammen' } : { id: 'forskj', html: '<b>↔</b> forskjell' };
  { const r = el('div', 'pb-lrow'); r.style.justifyContent = 'flex-end'; r.style.minHeight = '54px';
    const xb = el('button', 'pb-rib unk', caseT(xtra.html)); xb.style.cssText = 'position:relative;height:52px;padding:0 18px;font-size:26px;';
    xb.innerHTML = `<span>${xtra.html}</span>`; r.appendChild(xb); loom.appendChild(r); segEl[xtra.id] = xb; }
  const ids = M.segs.map(s => s.id).concat([xtra.id]);
  // step 1: tag the «?»
  const stepTag = async S2 => {
    if (S2.ended) return NEVER();
    S2.prompt('pr56_merk', {});
    const w = baseW(S2, 'pb-ribtag');
    const handlers = ids.map(id => { const f = e => { e.stopPropagation(); if (w.locked || w.dead) return; if (gateShut(S2)) { S2.submitEarly && S2.submitEarly(); return; } sfx('click'); ids.forEach(k => segEl[k].classList.toggle('tag', k === id)); S2.submit(id, w); }; segEl[id].addEventListener('click', f); return [id, f]; });
    w.onDestroy = () => handlers.forEach(([id, f]) => segEl[id].removeEventListener('click', f));
    w.feed = v => { ids.forEach(k => segEl[k].classList.toggle('tag', k === v)); return S2.submit(v, w); };
    w.mark = (v, cls) => { const b = segEl[v]; if (b && cls === 'wrong') { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); } };
    w.rightValue = () => M.unk; w.wrongValue = () => ids.find(k => k !== M.unk);
    w.solution = () => { ids.forEach(k => segEl[k].classList.toggle('glow', k === M.unk)); };
    w.solTpl = 'kit_sol_ribbon';
    w.hint = async () => { await say(S2, 'pr56_h_tag'); };
    w.helpStep = async () => false;
    S2.lookBack(async v => { const b = segEl[v]; if (b) { b.querySelector('span').textContent = '?'; } await say(S2, 'pr_hor_igjen'); await S2.replayPrompt(); if (b) { const s = M.segs.find(x => x.id === v); if (v === xtra.id) b.querySelector('span').innerHTML = xtra.html; else b.querySelector('span').textContent = s && s.known ? String(s.value) : ''; b.classList.remove('tag'); } });
    const pr = S2.arm({ answer: M.unk, check: v => v === M.unk }); S2.use(w);
    if (S2.setDefaults) S2.setDefaults(1 / ids.length, 'ribbon');
    w.values = ids.slice();
    return pr;
  };
  // step 2: the keypad – look-back: HER number re-sizes the «?» ribbon, the bars stop fitting
  const stepKeys = async S2 => {
    ids.forEach(k => segEl[k].classList.remove('glow'));
    const u = segEl[M.unk]; u.classList.add('tag'); u.querySelector('span').textContent = '?';
    S2.prompt('pr56_svar', {});
    const s = M.segs.find(x => x.id === M.unk);
    S2.lookBack(async v => {
      v = +v; const w0 = u.style.width, l0 = u.style.left;
      u.classList.add('her'); u.querySelector('span').textContent = String(v);
      const wv = x => Math.max(1, Math.min(100 - s.x0 * scale, x * scale)) + '%';
      u.style.width = wv(v);
      if (M.unk === 'p1') segEl.p2.style.left = wv(v);
      await sleep(900); await say(S2, 'pr56_lb'); await sleep(500);
      u.style.width = w0; u.style.left = l0; if (M.unk === 'p1') segEl.p2.style.left = (s.x1 * scale) + '%';
      u.classList.remove('her'); u.querySelector('span').textContent = '?';
    });
    return keypad(S2, t, { showLen: sup === 0, hint: async () => { await say(S2, M.layout === 'cmp' ? 'pr56_h_diff' : M.unk === 'whole' ? 'pr56_h_hel' : 'pr56_h_del'); } });
  };
  await chain(S, stepTag, stepKeys);
  setG(item, 0.0025, 'twostep');
  const u = segEl[M.unk]; u.classList.remove('unk', 'tag', 'diffseg'); u.style.backgroundColor = '#c9f0b5'; u.style.backgroundImage = 'none'; u.querySelector('span').textContent = String(t);
  sfx('sparkle'); await say(S, 'pr56_ok');
  return S.result();
}

/* =====================================================================================================================
   9. registration
   ===================================================================================================================== */
const SPECS = {
  F53: { name: 'Markedsvekta', strands: { LIKHET: [[1, 1], [3, 3]] }, places: ['marked', 'torg', 'vippe', 'any'], family: 'vekt', think: 'DEDUKSJON', portable: true,
    tpl: ['pr53_lik', 'pr53_legg', 'pr53_like', 'pr53_ruta'], run: runF53 },
  F54: { name: 'Likningsrullene', strands: { LIKHET: [2, 3], REGN: [6, 6] }, places: ['konge', 'tronsal', 'slott', 'any'], family: 'likning', think: 'REGNE', portable: true,
    tpl: ['pr54_feil', 'pr54_ruta'], run: runF54 },
  F55: { name: 'Dukketeateret', strands: { PROBLEM: [1, 5] }, places: ['park', 'teater', 'ballsal', 'any'], family: 'teater', think: 'MODELL', portable: true,
    tpl: ['pr55_se', 'pr55_lag', 'pr55_svar'], run: runF55 },
  F56: { name: 'Båndveven', strands: { PROBLEM: [1, 5] }, places: ['vevrom', 'dronning', 'slott', 'any'], family: 'baand', think: 'MODELL', portable: true,
    tpl: ['pr56_vev', 'pr56_merk', 'pr56_svar'], run: runF56 },
};
function register() {
  if (!F.Task || !F.Task.def) return;
  for (const id of MINE) {
    const s = SPECS[id];
    const spec = s._wrapped || (s._wrapped = Object.assign({}, s, {
      g: it => (it && it.g != null ? it.g : 0.01),
      async run(item, S) {
        prep(id, item);
        if (S) { S.expected = item.target; if (Array.isArray(item.secret)) S.secret = item.secret.slice(); }
        if (F.PROB_LINES && F.PROB_LINES.declare) F.PROB_LINES.declare();
        return s.run(item, S);
      },
    }));
    if (F.Task.defs && F.Task.defs[id] === spec) continue;
    try { F.Task.def(id, spec); } catch (e) { console.error('[f_prob] def ' + id, e); }
  }
}
register();
if (F.on) F.on('boot', register);
Object.assign(PB, { prep, okFor, gen, canned, ribbonModel, storyOf, canonEq, eqTruth, solveEq, eqParse, sidesOf, sideVal, MINE, SPECS });
F.dbg = F.dbg || {};
// F.dbg.prob.force('F55', {strand, rung, sup, sub, reverse}) – runs a generated item (tests/v4_wpp.js)
F.dbg.prob = {
  force(fmt, o) {
    o = o || {};
    const strand = o.strand || STRAND[fmt], rung = o.rung || (fmt === 'F54' ? 2 : 1), sup = o.sup != null ? o.sup : 1;
    let it = null;
    for (let i = 0; i < 40; i++) {
      it = gen(strand, rung, sup, { format: fmt, sub: o.sub || (strand === 'REGN' ? 'missing' : undefined) });
      if (it && fmt === 'F54' && strand === 'REGN' && it.params && Array.isArray(it.params.family)) familyBundle(it);
      if (it && okFor(fmt, it)) break;
    }
    if (!it || !okFor(fmt, it)) it = canned(fmt, strand === 'REGN' ? 'LIKHET' : strand, strand === 'REGN' ? 3 : rung, sup);
    if (o.reverse != null) it.params.reverse = !!o.reverse;
    if (o.params) Object.assign(it.params, o.params);
    const P = F.Player.pos;
    Object.assign(it, { id: 'wpp_' + Math.floor(F.T.now * 1000), format: fmt, kind: 'normal' });
    window._pbRes = null;
    void F.Task.run(it, o.ctx || { place: { x: P.x, z: P.z - 3, id: 'here' } }).then(r => { window._pbRes = r; });
    return { strand: it.strand, rung: it.rung, sup: it.sup, target: it.target, g: it.g, mode: it.mode, schema: it.params.schema || null, unknown: it.params.unknown || null, frame: it.params.frame || null, eq: it.params.eq || null };
  },
};
})();
