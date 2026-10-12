/* Feslottet – TRYLLEBOKA (the spellbook) + the wand POWERS + credit for free casts. Owner: WP-T (DESIGN5 §9, §10).
   «Alt du kan trylle fram står i Trylleboka.» A book with one tab per word family (dyr, mat, leker, klær, møbler, natur, kjøretøy, hus,
   ting, musikk, eventyr – js/data/words.js castables, 258 words). Every castable word is a card:
     • not conjured yet: its SILHOUETTE (the real model, blacked out) – tap = a spoken riddle (F.TB_HINTS, lines_trylle.js) that never
       says the word; a word of a closed Tryllebua pack also says «Den finnes i Tryllebua.»;
     • conjured (F.save.words.made[w] > 0): the coloured model + the written word – tap = «try first, then hear it» (F.UI.tryRead:
       1st tap sounds the word out, 2nd tap says it).
   Progress per page (bar + «12 / 45» on the page, a mini bar on each tab); a full page is celebrated once (+10 coins: every word of
   the family was spelled by her).
   SESONG page (2nd tab): 16 castable words of the season (høst / jul / vinter / vår / sommer – F.Cal.now().m when it exists, else the
   device month); every other day the daily riddle is drawn from it when it has a word at her level.
   KREFTER page (3rd tab): one panel per power – a picture of what it does, its words written in their colours (tap = try to read it,
   then hear it: F.UI.tryRead + wand_mod) or a lock («Den trylleformelen lærer du snart!» + what to learn: tall / lese).
   FORSIDE (cover): «Dagens tryllegåte» – ONE riddle a day toward a word she has NOT conjured yet, at her SKRIV level (rung.SKRIV = her
   rung, then +1, then −1, then ±2, then any), from a word family other than yesterday's; every other day from the season's page, on
   the other days preferring a spelling pattern she has been missing in her SKRIV tasks (engine Leitner entries with errors). Spelling it with the wand (free mode) solves it:
   sparkles + «Du løste dagens tryllegåte!» + coins only for a first-try A: 3 (economy §2, 12.10: «3 on a first-try A, otherwise 0» –
   after the rhyme / first-sound cue or the wand's near-miss ghost (H) the joy and the sparkles stay, no coins). Cues, never the spelling: the 3rd hearing that day adds a RHYME with the same
   spelled rime («Hør hva det rimer på.» + rw_word «hatt» → katt – spelling by analogy), the 4th (or the 3rd without a rhyme) its
   FIRST SOUND («Hør den første lyden.» + F.Wand.sayLetter). The four wand powers (gems) with their state.
   WAND POWERS (gems on the spell bar + the cover): unlocked by learning milestones read from the engine (F.LEARN.strand(s): a passed
   rung or a higher best rung):  tall      T-MENGDE M5 or REGN R2     (a number before the word: «14 kaker»)
                                  farge     LES L4                      (rød blå gul grønn rosa lilla hvit brun)
                                  storrelse ORD Or1 or LES L5           (stor / liten)
                                  humor     LES L6                      (glad sove danse hoppe våken)
   Until then the wand casts the plain thing and Puff says once per spell-bar session «Den trylleformelen lærer du snart!» (wand.js).
   A new power is announced the next time she opens the wand (once). Old saves keep powers she already used (no toy is taken away).
   In #test mode every power is open unless F.Book.gating = true (or #powers in the hash) – other WPs' wand tests keep working.
   FREE-CAST CREDIT: a free cast of a real castable word at her SKRIV level (rung.SKRIV ≥ her SKRIV rung − 1) that she typed herself
   (not the near-miss ghost retype, not a Bokstavbytte swap, not a word shown written in the book in the last 10 min) is reported to
   F.LEARN as a SKRIV production item (key 'SKRIV:<word>', g 0.01, mode 'wand', format 'TRYLL', kind 'preview' + offLevel: Leitner
   evidence + the production twin of that rung, but NO acc20 / mastery-window / rung move – self-chosen words are biased toward what she
   knows). At most CAP (3) a day – every report also enters the engine's 40-task share window as a SPRÅK item (≈ 3 of 28 a day), so
   the cap stays low until the engine offers a «spontaneous» report option (REQUEST WP-E) – each word at most once in 7 days, no coins
   (the wand stays a toy). Three different credited words
   ≥ 2 rungs above her SKRIV rung within 7 days arm the engine's «hopp over» test-out (F.LEARN.testOut('SKRIV'), at most once a week).
   API (F.Book; F.Trylleboka is the same object):
     open(tab?) -> bool  ('forside' | a cat id)     close()   isOpen()   tab()
     riddle() -> {word, hint, model, cat, done, how} | null   (the daily riddle; also for p_tavle – WP-W2/H: show the silhouette only)
     sayRiddle() -> Promise          has(powerId) -> bool        powers() -> [{id, on, day, seen}]      syncPowers() -> [newly unlocked]
     gating (bool)                    POWERS  MOD_POW {size:'storrelse', col:'farge', mood:'humor'}     sayPower(id) -> Promise
     announce(speller?) -> Promise    (wand.js calls it when the free bar opens: a new power's line once + its gem pops)
     progress() -> {got, total, cats: {cat: {got, total}}}   got(w) -> bool   credits() -> today's credited words   CAP
     shown(w) – a word was shown written (copy guard)     history() -> {riddles: [[day, word, 'A'|'H', cue]], credits: [...]} (parent page)
   Events: 'bookOpened' 'bookClosed' 'bookNew' (word – a new card filled) 'bookGate' (word, outcome) 'wandPower' (id) 'spontCredit' (word)
   Save: F.save.book = {v, first, pow:{id:{day, seen, old?}}, gate:{day, w, cat, done, how}, gates:[recent words], cr:{day, n, w:{word: day}},
         full:{cat: 1|'new'}, days} – all small. Debug: F.dbg.book = {open, card(i), state()}. */
(function () {
'use strict';
const F = window.F, U = F.U, UI = F.UI;
const CATS = ['dyr', 'mat', 'leker', 'klær', 'møbler', 'natur', 'kjøretøy', 'hus', 'ting', 'musikk', 'eventyr'];
const ICON_W = { dyr: 'katt', mat: 'kake', leker: 'ball', 'møbler': 'stol', natur: 'blomst', 'kjøretøy': 'bil', 'klær': 'kjole', hus: 'hus', ting: 'kopp',
  musikk: 'gitar', eventyr: 'krone' };
const PER = 12, CAP = 3, CREDIT_GAP = 7, SHOWN_MS = 10 * 60e3, FULL_COINS = 10;
const POWERS = [
  { id: 'tall', need: [['T-MENGDE', 5], ['REGN', 2]], laer: 'tb_laer_tall', col: '#ffd84a', ex: null },
  // ex: the example that waits as ghost letters when the power is announced (or its gem tapped) – a whole phrase, so «rød» never
  // stands alone with nothing to colour (natural audit #40; wand.js swaps the noun for her own thing in view: «rød katt»)
  { id: 'farge', need: [['LES', 4]], laer: 'tb_laer_les', col: '#ff6f9f', ex: 'rød ball' },
  { id: 'storrelse', need: [['ORD', 1], ['LES', 5]], laer: 'tb_laer_les', col: '#5fc0ff', ex: 'stor ball' },
  { id: 'humor', need: [['LES', 6]], laer: 'tb_laer_les', col: '#7ad66a', ex: 'glad katt' },
];
const MOD_POW = { size: 'storrelse', col: 'farge', mood: 'humor' };
// the words each power makes (written on its page – tap = try to read it, then hear it)
const POW_WORDS = { tall: [], farge: ['rød', 'blå', 'gul', 'grønn', 'rosa', 'lilla', 'hvit', 'brun'], storrelse: ['stor', 'liten'], humor: ['glad', 'sove', 'danse', 'hoppe', 'våken'] };
const POW_COLS = { rød: '#e8394f', blå: '#2f7fe0', gul: '#e0a91e', grønn: '#2f9e55', rosa: '#ff6fae', lilla: '#9b5de5', hvit: '#8a8a9a', brun: '#9a5b2e' };
// the seasonal page: castable words that belong to the season (device month, or F.Cal when it exists); the daily riddle prefers them
const SEASON = {
  'høst': 'blad kongle sopp eple pære plomme nøtt potet gulrot gås ekorn ugle lykt støvel skjerf lue',
  jul: 'gave pakke lys kjelke slede rein grøt bjelle hjerte snø vott peis kakao lykt krans kjeks',
  vinter: 'snø ski kjelke slede vott lue skjerf genser kakao peis dyne teppe rein elg støvel suppe',
  'vår': 'blomst frø plante kløver lilje larve humle bie egg lam føll kalv spade kanne rose busk',
  sommer: 'sol sand skjell båt iskrem saft krabbe måke telt robåt kano ball melon bær flåte drage',
};
const SEASON_ICON = { 'høst': 'kongle', jul: 'gave', vinter: 'kjelke', 'vår': 'blomst', sommer: 'sol' };
function season() {
  let m = null;
  try { const c = F.Cal && F.Cal.now && F.Cal.now(); if (c && c.m) m = c.m; } catch (e) { /* no calendar yet */ }
  if (!m) m = new Date().getMonth() + 1;
  return m === 12 ? 'jul' : m <= 2 ? 'vinter' : m <= 5 ? 'vår' : m <= 8 ? 'sommer' : 'høst';
}
const POW_SVG = {
  tall: '<svg viewBox="0 0 40 40"><text x="20" y="28" text-anchor="middle" font-size="22" font-weight="700" fill="#fff" font-family="Andika, sans-serif">12</text></svg>',
  farge: '<svg viewBox="0 0 40 40"><circle cx="14" cy="16" r="7" fill="#ff5f7a"/><circle cx="26" cy="16" r="7" fill="#5fb8ff"/><circle cx="20" cy="26" r="7" fill="#ffe14a"/></svg>',
  storrelse: '<svg viewBox="0 0 40 40"><rect x="5" y="12" width="20" height="20" rx="4" fill="#fff"/><rect x="28" y="22" width="9" height="10" rx="2" fill="#fff"/></svg>',
  humor: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#fff"/><circle cx="15" cy="17" r="2.2" fill="#3b2f5c"/><circle cx="25" cy="17" r="2.2" fill="#3b2f5c"/><path d="M13 23 Q20 30 27 23" fill="none" stroke="#3b2f5c" stroke-width="2.6" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 40 40"><rect x="11" y="18" width="18" height="14" rx="3" fill="#fff"/><path d="M14 18 v-4 a6 6 0 0 1 12 0 v4" fill="none" stroke="#fff" stroke-width="3"/></svg>',
};
const SVG = {
  star: '<svg viewBox="0 0 40 40"><path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z" fill="#ffd84a" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 40 40"><path d="M25 8 L12 20 L25 32" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 40 40"><path d="M15 8 L28 20 L15 32" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 40 40"><path d="M8 16 h6 l8 -7 v22 l-8 -7 h-6 z" fill="currentColor"/><path d="M27 14 q4 6 0 12 M31 10 q7 10 0 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  wand: '<svg viewBox="0 0 40 40"><g transform="rotate(38 20 22)"><rect x="17.5" y="15" width="5" height="24" rx="2.5" fill="#fff" stroke="#7d5fd0" stroke-width="1.6"/></g><path d="M26 4 L28.5 9.5 L34.5 10 L30 14 L31.5 20 L26 17 L20.5 20 L22 14 L17.5 10 L23.5 9.5 Z" fill="#ffd84a" stroke="#fff" stroke-width="1.6"/></svg>',
};

/* ---------------------------------------------------------------- state */
const day = () => F.save.day || 1;
function book() {
  const b = F.save.book = F.save.book || {};
  if (!b.v) { b.v = 1; b.pow = b.pow || {}; grandfather(b); }
  b.pow = b.pow || {}; b.cr = b.cr || { day: 0, n: 0, w: {} }; b.cr.w = b.cr.w || {}; b.full = b.full || {}; b.gates = b.gates || [];
  return b;
}
// an old save keeps every power she has already used (Scribblenauts words / Tallmagi rows) – no toy is taken away
function grandfather(b) {
  try {
    const sp = (F.save.words && F.save.words.spont) || {};
    const MODS = (F.Wand && F.Wand.MODS) || {};
    for (const w in sp) { const m = F.Wand && F.Wand.modOf ? F.Wand.modOf(w) : (MODS[w] ? MODS[w] : null); if (m && MOD_POW[m.t] && !b.pow[MOD_POW[m.t]]) b.pow[MOD_POW[m.t]] = { day: day(), seen: true, old: true }; }
    const ml = (F.save.magic && F.save.magic.list) || [];
    if (ml.some(x => (x.n || 1) > 1) && !b.pow.tall) b.pow.tall = { day: day(), seen: true, old: true };
  } catch (e) { console.warn('[Book] grandfather', e); }
}
const H = () => F.TB_HINTS || {};
const words = () => (F.WORDS && F.WORDS.list ? F.WORDS.list.filter(e => e.castable) : []);
const entry = w => (F.WORDS && F.WORDS.get ? F.WORDS.get(w) : null);
const made = () => (F.save.words && F.save.words.made) || {};
const got = w => (made()[w] || 0) > 0;
const modelOf = e => (F.Wand && F.Wand.modelOf ? F.Wand.modelOf(e.w) : e.model) || e.model || e.w;
const packLocked = e => { try { return !!(F.Wand && F.Wand.resolve && F.Wand.resolve(e.w).kind === 'locked'); } catch (x) { return false; } };
const byCat = cat => words().filter(e => e.cat === cat);
const seasonList = () => SEASON[season()].split(' ').map(w => entry(w)).filter(e => e && e.castable);
const listOf = tab => (tab === 'sesong' ? seasonList() : byCat(tab));
function skrivLvl() {
  try { const st = F.LEARN && F.LEARN.strand && F.LEARN.strand('SKRIV'); if (st && st.rung) return st.rung; } catch (e) { /* engine missing */ }
  return 3;
}

/* ---------------------------------------------------------------- powers */
function reached(s, r) {
  try {
    const st = F.LEARN && F.LEARN.strand && F.LEARN.strand(s); if (!st) return false;
    return !!(st.passed && st.passed[r]) || (st.best || 0) > r || (st.rung || 0) > r;
  } catch (e) { return false; }
}
function syncPowers() {
  const b = book(), out = [];
  for (const p of POWERS) {
    if (b.pow[p.id]) continue;
    if (p.need.some(([s, r]) => reached(s, r))) { b.pow[p.id] = { day: day(), seen: false }; out.push(p.id); }
  }
  if (out.length) { F.store(); out.forEach(id => F.emit('wandPower', id)); }
  return out;
}
const Book = F.Book = F.Trylleboka = {
  POWERS, MOD_POW, CAP, CATS,
  gating: !(F.flags && F.flags.test) || /powers/.test(location.hash || ''),
};
Book.has = id => !Book.gating || !!book().pow[id];
Book.powers = () => { syncPowers(); const b = book(); return POWERS.map(p => ({ id: p.id, on: Book.has(p.id), day: b.pow[p.id] ? b.pow[p.id].day : null, seen: b.pow[p.id] ? !!b.pow[p.id].seen : false })); };
Book.syncPowers = syncPowers;
Book.sayPower = async function (id) {
  const p = POWERS.find(x => x.id === id); if (!p) return;
  if (F.Speech) F.Speech.clearQueue();
  if (Book.has(id)) await F.SAY('tb_pow_' + id);
  else { await F.SAY('tb_snart'); await F.SAY(p.laer); }
};
// the free spell bar opened: a power she has newly earned is announced once (its gem pops); returns the example word for the ghost
Book.announce = async function () {
  syncPowers();
  const b = book(); if (!Book.gating) return null;
  const nu = POWERS.filter(p => b.pow[p.id] && !b.pow[p.id].seen);
  if (!nu.length) return null;
  const p = nu[0]; b.pow[p.id].seen = true; F.store();
  F.emit('wandPowerShown', p.id);
  hudSync();
  try { F.sfx.levelup(); } catch (e) { /* audio */ }
  await F.SAY('tb_pow_ny');
  await F.SAY('tb_pow_' + p.id);
  return p.ex;
};

/* ---------------------------------------------------------------- the daily riddle */
function pickGate() {
  const b = book(), d = day(), lvl = skrivLvl(), hints = H();
  const recent = new Set(b.gates.slice(-30));
  const cands = words().filter(e => !got(e.w) && hints[e.w] && !packLocked(e) && !recent.has(e.w));
  const lastCat = b.gate && b.gate.cat;
  const R = e => (e.rung && e.rung.SKRIV) || 5;
  const tiers = [x => x === lvl, x => x === lvl + 1, x => x === lvl - 1, x => x >= lvl - 2 && x <= lvl + 2, () => true];
  for (const t of tiers) {
    let pool = cands.filter(e => t(R(e)));
    if (!pool.length) continue;
    const other = pool.filter(e => e.cat !== lastCat); if (other.length) pool = other;
    // every other day the riddle comes from the season's page when it has a word at this level (autumn: kongle, sopp, nøtt …);
    // on the other days it prefers a spelling pattern she has been missing in her tasks (dobbel_konsonant, kj, stum_d … from the
    // engine's SKRIV Leitner entries with errors) – targeted practice inside a riddle she chose to solve
    const sw = new Set(SEASON[season()].split(' ')), sp = pool.filter(e => sw.has(e.w));
    if (sp.length && U.hashStr('season' + d) % 2 === 0) pool = sp;
    else { const wp = weakPatterns(), tp = pool.filter(e => (e.patterns || []).some(p => wp[p])); if (tp.length) pool = tp; }
    pool.sort((a, b2) => (a.w < b2.w ? -1 : 1));
    const e = pool[U.hashStr('gate' + d + ':' + (F.save.created || 0)) % pool.length];
    return { day: d, w: e.w, cat: e.cat, done: false, how: null };
  }
  return null;
}
// spelling patterns of the SKRIV words she has missed and not yet re-learned (Leitner err > 0, box ≤ 1)
function weakPatterns() {
  const out = {};
  try {
    const its = (F.LEARN && F.LEARN.state && F.LEARN.state.items) || {};
    for (const k in its) { if (k.slice(0, 6) !== 'SKRIV:') continue; const it = its[k]; if (!(it.err > 0 && it.box <= 1)) continue; const we = entry(k.slice(6)); ((we && we.patterns) || []).forEach(p => { out[p] = (out[p] || 0) + 1; }); }
  } catch (e) { /* engine */ }
  return out;
}
Book._weak = weakPatterns;
function gate() {
  const b = book(), d = day();
  if (b.gate && b.gate.day === d) return b.gate.w ? b.gate : null;
  const g = pickGate();
  b.gate = g || { day: d, w: null };
  if (g) { b.gates.push(g.w); if (b.gates.length > 60) b.gates.shift(); }
  F.store();
  return g;
}
Book.riddle = function () {
  const g = gate(); if (!g) return null;
  const e = entry(g.w);
  return { word: g.w, hint: H()[g.w] || null, model: e ? modelOf(e) : g.w, cat: g.cat, done: !!g.done, how: g.how || null };
};
Book.sayRiddle = async function (o) {
  const g = gate(); o = o || {};
  if (F.Speech) F.Speech.clearQueue();
  if (!g) { await F.SAY('tb_gate_none'); return; }
  if (g.done) { await F.SAY('tb_gate_solved'); return; }
  await F.SAY('tb_gate_head');
  await F.SAY('tb_gate', { g: H()[g.w] });
  const b = book(); if (o.how !== false && b.howDay !== day()) { b.howDay = day(); F.store(); await F.SAY('tb_gate_how'); }
  // cues, never the spelling (she still produces the word; economy §2: a riddle solved after a cue pays 0): the 3rd hearing of the day adds a RHYME
  // whose rime is spelled the same («Hør hva det rimer på.» + «hatt» → katt: spelling by analogy), the 4th (or the 3rd without a
  // rhyme) its FIRST SOUND
  g.heard = (g.heard || 0) + 1; F.store(); hudSync();
  const rp = rhymeOf(g.w);
  if (g.heard === 3 && rp && F.TPL.has('rw_word')) { g.cue = true; F.store(); await F.SAY('tb_rim'); await F.SAY('rw_word', { w: rp }); }
  else if (g.heard >= 3 && F.Wand && F.Wand.sayLetter) { g.cue = true; F.store(); await F.SAY('tb_lyd'); await F.Wand.sayLetter(g.w[0]); }
};
// a rhyme partner with the SAME spelled rime (hatt → katt, not hund → munn), a word she knows if possible
function rhymeOf(w) {
  const W = F.WORDS; if (!W || !W.rhymes || !W.rimeOf) return null;
  const A = W.rimeOf(w); if (!A) return null;
  const c = W.list.filter(x => x.w !== w && W.rhymes(w, x.w) && (W.rimeOf(x.w) || {}).spelled === A.spelled && !x.w.includes(w) && !w.includes(x.w));
  if (!c.length) return null;
  const m = made(), sc = x => (m[x.w] ? 0 : 10) + (x.castable ? 0 : 3) + ((x.rung && x.rung.LES) || 9);
  c.sort((a, b) => sc(a) - sc(b) || (a.w < b.w ? -1 : 1));
  return c[0].w;
}
Book._rhymeOf = rhymeOf;
function report(w, outcome, why) {
  const e = entry(w);
  if (!e || !F.LEARN || !F.LEARN.report || !e.rung || !e.rung.SKRIV) return null;
  const item = { id: 'tb_' + why + '_' + Date.now(), strand: 'SKRIV', key: 'SKRIV:' + w, rung: e.rung.SKRIV, sup: 2, kind: 'preview', offLevel: true,
    format: 'TRYLL', mode: 'wand', g: 0.01, think: 'STAVE', target: w, word: w, spont: true, why, params: {} };
  try { return F.LEARN.report(item, { outcome, tries: 1, ms: 0, chosen: [w], g: 0.01, usedHelp: outcome === 'H' }, { emit: true }); }
  catch (err) { console.error('[Book] report', err); return null; }
}
async function solveGate(ev) {
  const b = book(), g = b.gate;
  g.done = true; g.how = ev.helped ? 'H' : 'A'; F.store();
  // only her own spelling is evidence: after the near-miss ghost nothing is reported (no Leitner, no wall / safety side effects)
  const rep = g.how === 'A' ? report(g.w, 'A', 'gate') : null;
  // economy §2 (honest coins, verify 2nd round – the plan's rule): 3 on a first-try A (her own spelling before any cue), otherwise 0
  // (after the rhyme / first-sound cue: a helped answer; after the wand's near-miss ghost, H: the word was shown)
  const coins = g.how === 'A' && !g.cue ? 3 : 0;
  F.emit('bookGate', g.w, g.how);
  // a small history for the parent page: [day, word, A|H, cue?]
  b.hist = b.hist || []; b.hist.push([g.day, g.w, g.how, g.cue ? 1 : 0]); if (b.hist.length > 60) b.hist.shift();
  hudSync();
  await F.T.sleep(1600);
  const th = ev.thing && F.Things && F.Things.byId ? F.Things.byId(ev.thing) : null;
  try {
    if (th && th.obj) { const p = th.obj.position.clone(); p.y += 0.8; F.FX.burst(p, { kind: 'confetti', n: 40 }); F.FX.burst(p, { kind: 'star', n: 18 }); }
    F.sfx.chime();
  } catch (e) { /* fx */ }
  await F.SAY('tb_gate_done');
  try { if (coins > 0 && F.Eco && F.Eco.add) F.Eco.add(coins, { from: th || (F.Quest && F.Quest.herPoint ? F.Quest.herPoint() : null), reason: 'tryllegåte' }); } catch (e) { console.error('[Book] coins', e); }
}
Book._gate = gate;

/* ---------------------------------------------------------------- free-cast credit (spontaneous production) */
const shownAt = new Map();
Book.shown = w => { shownAt.set(w, Date.now()); };
function credit(ev) {
  const w = ev.word, e = entry(w), b = book(), d = day();
  if (!e || !e.castable || !e.rung || !e.rung.SKRIV) return false;
  if (ev.helped || ev.swap || ev.kind === 'lex') return false;
  if (b.cr.day !== d) { b.cr.day = d; b.cr.n = 0; }
  if (b.cr.n >= CAP) return false;
  if (b.cr.w[w] && d - b.cr.w[w] < CREDIT_GAP) return false;
  if (e.rung.SKRIV < skrivLvl() - 1) return false;
  const t = shownAt.get(w); if (t && Date.now() - t < SHOWN_MS) return false;
  const rep = report(w, 'A', 'spont');
  if (!rep) return false;
  b.cr.n++; b.cr.w[w] = d;
  for (const k in b.cr.w) if (d - b.cr.w[k] > 60) delete b.cr.w[k];
  // spelling words ≥ 2 rungs ABOVE her SKRIV rung by herself (3 different words within 7 days) arms the engine's own «hopp over»
  // test-out (F.LEARN.testOut: 3 golden production items at rung + 2; a miss is free) – she should not redo what she already knows
  const lvl = skrivLvl();
  b.up = b.up || {}; for (const k in b.up) if (d - b.up[k] > 7) delete b.up[k];
  if (e.rung.SKRIV >= lvl + 2) b.up[w] = d;
  if (Object.keys(b.up).length >= 3 && !(b.toDay && d - b.toDay < 7) && F.LEARN.testOut) {
    let armed = false; try { armed = F.LEARN.testOut('SKRIV'); } catch (err) { /* engine */ }
    b.toDay = d; b.up = {};
    if (armed) F.emit('spontTestOut', 'SKRIV');
  }
  F.store();
  F.emit('spontCredit', w);
  return true;
}
Book.history = () => { const b = book(); return { riddles: (b.hist || []).slice(), credits: Book.credits(), got: Book.progress().got }; };
Book.credits = () => { const b = book(); return b.cr.day === day() ? Object.keys(b.cr.w).filter(k => b.cr.w[k] === day()) : []; };
Book._credit = credit;

F.on('cast', ev => {
  try {
    if (!ev || !ev.word || !F.save) return;
    const w = ev.word, e = entry(w);
    // a new card in the book (wand.js counts made[] before it emits 'cast')
    if (e && e.castable && (made()[w] || 0) === 1) {
      F.emit('bookNew', w); checkFull(e.cat);
      // the very first card she fills herself: once ever, Puff links the wand to the book (later cards only bump the button)
      const bk = book();
      if (ev.free && !bk.firstCard && F.TPL.has('tb_ny')) { bk.firstCard = 1; F.store(); F.T.timeout(() => { if (!(F.Task && F.Task.current)) F.SAYF('tb_ny'); }, 2500); }
    }
    if (!ev.free || ev.swap) return;
    const g = book().gate;
    if (g && g.day === day() && g.w === w && !g.done && e && e.castable) { solveGate(ev); return; }
    credit(ev);
  } catch (err) { console.error('[Book] cast', err); }
});
function checkFull(cat) {
  const b = book(); if (!cat || b.full[cat]) return;
  const all = byCat(cat); if (all.length && all.every(e => got(e.w))) { b.full[cat] = 'new'; F.store(); }
}

/* ---------------------------------------------------------------- progress */
Book.got = got;
Book.progress = function () {
  const cats = {}; let gotN = 0, total = 0;
  for (const c of CATS) { const l = byCat(c), g = l.filter(e => got(e.w)).length; cats[c] = { got: g, total: l.length }; gotN += g; total += l.length; }
  return { got: gotN, total, cats };
};

/* ---------------------------------------------------------------- the book UI */
let panel = null, root = null, cur = { tab: 'forside', page: 0 }, reads = [], thumbQ = [], thumbT = null;
const el = (t, c, h) => UI.el(t, c, h);
function thumb(img, model, size) {
  // thumbnails render one per frame-ish (setTimeout) so opening the book never stalls the game
  thumbQ.push([img, model, size || 128]);
  if (!thumbT) thumbT = setTimeout(pump, 0);
}
function pump() {
  thumbT = null;
  const t0 = performance.now();
  while (thumbQ.length && performance.now() - t0 < 24) { const [img, m, sz] = thumbQ.shift(); if (!img.isConnected) continue; try { const u = F.Thumb.url(m, {}, { size: sz }); if (u) img.src = u; } catch (e) { /* model missing */ } }
  if (thumbQ.length) thumbT = setTimeout(pump, 16);
}
const clearReads = () => { reads.forEach(h => { try { h.remove(); } catch (e) { /* gone */ } }); reads = []; };
function say(id, slots) { if (F.Speech) F.Speech.clearQueue(); return F.SAY(id, slots || {}); }
function tapFx(e) { e.classList.remove('tb-tap'); void e.offsetWidth; e.classList.add('tb-tap'); try { F.sfx.click(); } catch (x) { /* audio */ } }

function render() {
  if (!root) return;
  clearReads(); thumbQ.length = 0;
  root.innerHTML = '';
  const P = Book.progress();
  // tabs: the cover (a star) + one per word family (a real model + a mini bar)
  const tabs = el('div', 'tb-tabs');
  const t0 = el('button', 'tb-tab tb-tab-cover' + (cur.tab === 'forside' ? ' on' : ''), SVG.star);
  t0.addEventListener('click', ev => { ev.stopPropagation(); tapFx(t0); go('forside'); });
  tabs.appendChild(t0);
  const sn = season(), sl = seasonList();
  if (sl.length) {
    const ts = el('button', 'tb-tab tb-tab-season' + (cur.tab === 'sesong' ? ' on' : '')); ts.dataset.cat = 'sesong';
    const im = el('img', 'tb-tab-img'); im.alt = ''; im.draggable = false; ts.appendChild(im); thumb(im, SEASON_ICON[sn]);
    const bar = el('div', 'tb-mini'); const fill = el('div', 'tb-mini-f'); fill.style.width = Math.round(100 * sl.filter(e => got(e.w)).length / sl.length) + '%'; bar.appendChild(fill); ts.appendChild(bar);
    ts.addEventListener('click', ev => { ev.stopPropagation(); tapFx(ts); go('sesong'); say('tb_kat', { k: F.TB_SESONG[sn] }); });
    tabs.appendChild(ts);
  }
  const tk = el('button', 'tb-tab tb-tab-pow' + (cur.tab === 'krefter' ? ' on' : ''), '<span class="tb-tab-gem"></span>'); tk.dataset.cat = 'krefter';
  tk.addEventListener('click', ev => { ev.stopPropagation(); tapFx(tk); go('krefter'); say('tb_kat', { k: 'Krefter' }); });
  tabs.appendChild(tk);
  for (const c of CATS) {
    const pc = P.cats[c]; if (!pc.total) continue;
    const t = el('button', 'tb-tab' + (cur.tab === c ? ' on' : '') + (pc.got === pc.total ? ' full' : ''));
    t.dataset.cat = c;
    const im = el('img', 'tb-tab-img'); im.alt = ''; im.draggable = false; t.appendChild(im); thumb(im, ICON_W[c]);
    const bar = el('div', 'tb-mini'); const fill = el('div', 'tb-mini-f'); fill.style.width = Math.round(100 * pc.got / pc.total) + '%'; bar.appendChild(fill); t.appendChild(bar);
    t.addEventListener('click', ev => { ev.stopPropagation(); tapFx(t); go(c); say('tb_kat', { k: F.TB_KATS[c] }); });
    tabs.appendChild(t);
  }
  root.appendChild(tabs);
  const page = el('div', 'tb-page'); root.appendChild(page);
  if (cur.tab === 'forside') cover(page, P);
  else if (cur.tab === 'krefter') powPage(page);
  else if (cur.tab === 'sesong') { const l = seasonList(); catPage(page, 'sesong', { got: l.filter(e => got(e.w)).length, total: l.length }); }
  else catPage(page, cur.tab, P.cats[cur.tab]);
}
function go(tab, pg) { cur.tab = tab; cur.page = pg || 0; render(); }

function cover(page, P) {
  page.classList.add('tb-cover');
  const left = el('div', 'tb-cover-l'), right = el('div', 'tb-cover-r');
  page.append(left, right);
  // Dagens tryllegåte
  const r = Book.riddle();
  const gc = el('div', 'tb-gate' + (r && r.done ? ' done' : '') + (!r ? ' none' : ''));
  gc.appendChild(el('div', 'tb-gate-title', 'Dagens tryllegåte'));
  const pic = el('div', 'tb-gate-pic');
  if (r) {
    const im = el('img', 'tb-img' + (r.done ? '' : ' sil')); im.alt = ''; im.draggable = false; pic.appendChild(im); thumb(im, r.model, 256);
    if (!r.done) pic.appendChild(el('div', 'tb-q', '?'));
    else { const wl = el('div', 'tb-word big'); wl.textContent = UI.caseText(r.word); pic.appendChild(wl); Book.shown(r.word); pic.appendChild(el('div', 'tb-gate-star', SVG.star)); }
  } else pic.appendChild(el('div', 'tb-gate-star', SVG.star));
  gc.appendChild(pic);
  const row = el('div', 'tb-gate-row');
  const hear = el('button', 'tb-btn tb-hear', SVG.speaker);
  hear.addEventListener('click', ev => { ev.stopPropagation(); tapFx(hear); Book.sayRiddle(); });
  row.appendChild(hear);
  if (r && !r.done) {
    const tr = el('button', 'tb-btn tb-tryll', SVG.wand);
    tr.addEventListener('click', ev => { ev.stopPropagation(); tapFx(tr); Book.close(); F.T.timeout(() => { if (!(F.Task && F.Task.current) && F.Wand && F.Wand.open) { try { F.sfx.magic(); } catch (e) { /* audio */ } F.Wand.open({ mode: 'free' }); } }, 250); });
    row.appendChild(tr);
  }
  gc.appendChild(row);
  pic.addEventListener('click', ev => { ev.stopPropagation(); tapFx(pic); Book.sayRiddle(); });
  left.appendChild(gc);
  // powers
  const pw = el('div', 'tb-powers');
  for (const p of Book.powers()) {
    const g = el('button', 'tb-pow ' + p.id + (p.on ? ' on' : ' off'));
    g.dataset.pow = p.id;
    g.style.setProperty('--pc', POWERS.find(x => x.id === p.id).col);
    g.innerHTML = '<span class="tb-gem"></span><span class="tb-pow-ico">' + (p.on ? POW_SVG[p.id] : POW_SVG.lock) + '</span>';
    g.addEventListener('click', ev => { ev.stopPropagation(); tapFx(g); Book.sayPower(p.id); });
    pw.appendChild(g);
  }
  right.appendChild(pw);
  // all words: a bar + the count
  const tot = el('div', 'tb-total');
  const bar = el('div', 'tb-bar'); const f = el('div', 'tb-bar-f'); f.style.width = Math.round(100 * P.got / Math.max(1, P.total)) + '%'; bar.appendChild(f);
  tot.append(bar, el('div', 'tb-count', `<b>${P.got}</b> / ${P.total}`));
  right.appendChild(tot);
  // the families as small progress plates (tap = the page)
  const fam = el('div', 'tb-fams');
  for (const c of CATS) {
    const pc = P.cats[c]; if (!pc.total) continue;
    const it = el('button', 'tb-fam' + (pc.got === pc.total ? ' full' : '')); it.dataset.cat = c;
    const im = el('img', 'tb-fam-img'); im.alt = ''; im.draggable = false; it.appendChild(im); thumb(im, ICON_W[c]);
    it.appendChild(el('div', 'tb-fam-n', `${pc.got}/${pc.total}`));
    it.addEventListener('click', ev => { ev.stopPropagation(); tapFx(it); go(c); say('tb_kat', { k: F.TB_KATS[c] }); });
    fam.appendChild(it);
  }
  right.appendChild(fam);
}

function catPage(page, cat, pc) {
  const list = listOf(cat), pages = Math.max(1, Math.ceil(list.length / PER));
  cur.page = U.clamp(cur.page, 0, pages - 1);
  const head = el('div', 'tb-head');
  const sn = season(), nm = cat === 'sesong' ? F.TB_SESONG[sn] : F.TB_KATS[cat];
  const hi = el('img', 'tb-head-img'); hi.alt = ''; hi.draggable = false; thumb(hi, cat === 'sesong' ? SEASON_ICON[sn] : ICON_W[cat]);
  const name = el('button', 'tb-head-name'); name.textContent = UI.caseText(nm || cat);
  name.addEventListener('click', ev => { ev.stopPropagation(); tapFx(name); say('tb_kat', { k: nm }); });
  const bar = el('div', 'tb-bar'); const f = el('div', 'tb-bar-f'); f.style.width = Math.round(100 * pc.got / Math.max(1, pc.total)) + '%'; bar.appendChild(f);
  const cnt = el('div', 'tb-count', `<b>${pc.got}</b> / ${pc.total}`);
  head.append(hi, name, bar, cnt);
  page.appendChild(head);
  const grid = el('div', 'tb-grid');
  const g = gate();
  for (const e of list.slice(cur.page * PER, cur.page * PER + PER)) grid.appendChild(card(e, g));
  page.appendChild(grid);
  if (pages > 1) {
    const nav = el('div', 'tb-nav');
    const prev = el('button', 'tb-btn tb-prev', SVG.left), next = el('button', 'tb-btn tb-next', SVG.right);
    prev.disabled = cur.page === 0; next.disabled = cur.page >= pages - 1;
    prev.addEventListener('click', ev => { ev.stopPropagation(); if (cur.page > 0) { tapFx(prev); try { F.sfx.whoosh(); } catch (x) { /* audio */ } go(cat, cur.page - 1); } });
    next.addEventListener('click', ev => { ev.stopPropagation(); if (cur.page < pages - 1) { tapFx(next); try { F.sfx.whoosh(); } catch (x) { /* audio */ } go(cat, cur.page + 1); } });
    const dots = el('div', 'tb-dots');
    for (let i = 0; i < pages; i++) { const d = el('span', 'tb-dot' + (i === cur.page ? ' on' : '')); dots.appendChild(d); }
    nav.append(prev, dots, next);
    page.appendChild(nav);
  }
  const b = book();
  // a full page (every word of the family conjured = spelled by her): celebrated once, with FULL_COINS
  if (cat !== 'sesong' && b.full[cat] === 'new') {
    b.full[cat] = 1; F.store();
    F.T.timeout(() => { if (!panel) return; try { F.sfx.levelup(); } catch (x) { /* audio */ } say('tb_side_full'); root.classList.add('tb-fullfx');
      try { if (F.Eco && F.Eco.add) F.Eco.add(FULL_COINS, { reason: 'trylleboka-side' }); } catch (x) { console.error('[Book] coins', x); } }, 400);
  }
}
// the powers page: one panel per gem – what it does (a picture), its words written in their colours (tap = read, then hear) or a lock
function powPage(page) {
  page.classList.add('tb-powpage');
  const grid = el('div', 'tb-powgrid');
  for (const p of Book.powers()) {
    const def = POWERS.find(x => x.id === p.id);
    const pn = el('div', 'tb-powcard ' + p.id + (p.on ? ' on' : ' off')); pn.style.setProperty('--pc', def.col); pn.dataset.pow = p.id;
    const gem = el('button', 'tb-pow ' + p.id + (p.on ? ' on' : ' off'));
    gem.innerHTML = '<span class="tb-gem"></span><span class="tb-pow-ico">' + (p.on ? POW_SVG[p.id] : POW_SVG.lock) + '</span>';
    gem.addEventListener('click', ev => { ev.stopPropagation(); tapFx(gem); Book.sayPower(p.id); });
    const ex = el('div', 'tb-powex');
    const pic = (m, o, cls) => { const im = el('img', 'tb-powimg ' + (cls || '')); im.alt = ''; im.draggable = false; ex.appendChild(im); try { im.src = F.Thumb.url(m, o || {}, { size: 128 }); } catch (e) { /* model */ } };
    if (p.id === 'tall') { ex.appendChild(el('div', 'tb-pownum', '3')); pic('eple', {}, 's'); pic('eple', {}, 's'); pic('eple', {}, 's'); }
    else if (p.id === 'farge') { pic('kake', { c: 'red' }); pic('kake', { c: 'blue' }); pic('kake', { c: 'yellow' }); }
    else if (p.id === 'storrelse') { pic('ball', {}, 'big'); pic('ball', {}, 'small'); }
    else { pic('katt', {}); ex.appendChild(el('div', 'tb-powsmile', POW_SVG.humor)); }
    pn.append(gem, ex);
    const ws = el('div', 'tb-powwords');
    if (p.on) for (const w of POW_WORDS[p.id]) {
      const wl = el('button', 'tb-powword'); if (POW_COLS[w]) wl.style.color = POW_COLS[w];
      ws.appendChild(wl);
      const h = UI.tryRead && F.TPL.has('wand_mod') ? UI.tryRead(wl, w, { tpl: 'wand_mod', slots: { m: w } }) : null;
      if (h) { reads.push(h); h.clickable = false; wl.addEventListener('click', ev => { ev.stopPropagation(); Book.shown(w); h.press(); }); } else wl.textContent = UI.caseText(w);
    }
    pn.appendChild(ws);
    if (!p.on) pn.addEventListener('click', ev => { ev.stopPropagation(); tapFx(pn); Book.sayPower(p.id); });
    grid.appendChild(pn);
  }
  page.appendChild(grid);
}
function card(e, g) {
  const has = got(e.w), lockP = !has && packLocked(e), isGate = g && g.w === e.w && !g.done;
  const c = el('button', 'tb-card' + (has ? ' got' : ' sil') + (lockP ? ' lockp' : '') + (isGate ? ' gate' : ''));
  c.dataset.w = e.w;
  const im = el('img', 'tb-img' + (has ? '' : ' sil')); im.alt = ''; im.draggable = false; c.appendChild(im); thumb(im, modelOf(e));
  if (has) {
    const wl = el('div', 'tb-word'); c.appendChild(wl);
    const h = UI.tryRead ? UI.tryRead(wl, e.w, { tpl: 'rw_word', slots: { w: e.w } }) : null;
    if (h) { reads.push(h); h.clickable = false; }
    else wl.textContent = UI.caseText(e.w);
    c.addEventListener('click', ev => { ev.stopPropagation(); Book.shown(e.w); if (h && h.press) h.press(); else tapFx(c); });
  } else {
    c.appendChild(el('div', 'tb-q', '?'));
    if (isGate) c.appendChild(el('div', 'tb-card-star', SVG.star));
    c.addEventListener('click', async ev => {
      ev.stopPropagation(); tapFx(c);
      await say('tb_gate', { g: H()[e.w] });
      if (lockP && F.TPL.has('tb_bua')) await F.SAY('tb_bua');
    });
  }
  return c;
}

Book.open = function (tab) {
  if (panel) { if (tab) go(tab); return true; }
  if ((F.Task && F.Task.current) || (F.HUD && F.HUD.scene && F.HUD.scene())) return false;
  if (F.Wand && F.Wand.isOpen && F.Wand.isOpen()) F.Wand.close();
  if (F.Map && F.Map.isOpen) { try { F.Map.close(); } catch (e) { /* map */ } }
  syncPowers();
  root = el('div', 'tb-book');
  cur = { tab: tab && (['forside', 'sesong', 'krefter'].includes(tab) || CATS.includes(tab)) ? tab : 'forside', page: 0 };
  // a power she has just earned (not yet announced): the book opens on the powers page and Puff announces it (its gem pops)
  const bk = book(), fresh = Book.gating && !tab ? POWERS.find(p => bk.pow[p.id] && !bk.pow[p.id].seen) : null;
  if (fresh) cur.tab = 'krefter';
  root.addEventListener('pointerdown', ev => ev.stopPropagation());
  panel = UI.open(root, { cls: 'tb-wrap', onClose() { clearReads(); thumbQ.length = 0; panel = null; root = null; document.body.classList.remove('book-open'); F.emit('bookClosed'); hudSync(); } });
  document.body.classList.add('book-open');
  render();
  const b = book();
  if (fresh) {
    Book.announce().then(() => { const g = root && root.querySelector('.tb-powcard.' + fresh.id + ' .tb-pow'); if (g) { g.classList.remove('tb-new'); void g.offsetWidth; g.classList.add('tb-new'); } }).catch(e => console.error('[Book] announce', e));
  } else if (!b.first) { b.first = 1; F.store(); F.T.timeout(() => { if (panel) F.SAY('tb_first'); }, 300); }
  F.emit('bookOpened');
  return true;
};
Book.close = function () { if (panel) panel.close(); };
// arrow keys flip the pages of a word family while the book is open (parent's laptop / keyboard play)
if (typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (!panel || !root || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const btn = root.querySelector(e.key === 'ArrowLeft' ? '.tb-prev' : '.tb-next');
  if (btn && !btn.disabled) { e.preventDefault(); e.stopPropagation(); btn.click(); }
}, true);
Book.isOpen = () => !!panel;
Book.tab = () => (panel ? cur.tab : null);

/* ---------------------------------------------------------------- HUD dot: a quiet sign (never a sound) */
function hudSync() {
  if (!F.HUD || !F.HUD.bookDot) return;
  const b = F.save && F.save.book; if (!b) { F.HUD.bookDot(false); return; }
  let on = false;
  // «something new for you»: today's riddle not heard yet, or a power not announced yet – once heard, the dot goes (nothing nags)
  try { const g = b.gate; on = !!(g && g.day === day() && g.w && !g.done && !g.heard); if (Book.gating && POWERS.some(p => b.pow[p.id] && !b.pow[p.id].seen)) on = true; } catch (e) { /* partial */ }
  F.HUD.bookDot(on);
}
Book.hudSync = hudSync;
['ready', 'dayStart'].forEach(evn => F.on(evn, () => { try { book(); syncPowers(); gate(); hudSync(); } catch (e) { console.error('[Book]', e); } }));
['rungUp', 'floorAdded', 'placed', 'challenge', 'mastered'].forEach(evn => F.on(evn, () => { try { if (syncPowers().length) hudSync(); } catch (e) { /* engine */ } }));
F.on('bookNew', w => { try { if (F.HUD && F.HUD.bookBump) F.HUD.bookBump(w); } catch (e) { /* hud */ } });
// loaded after the HUD was built (tests inject this file): add the HUD button now
try { if (F.HUD && F.HUD.built && F.HUD.addBook) F.HUD.addBook(); } catch (e) { console.error('[Book] hud', e); }

/* ---------------------------------------------------------------- debug */
F.dbg = F.dbg || {};
F.dbg.book = {
  open: tab => Book.open(tab),
  close: () => { Book.close(); return !panel; },
  cards: () => (root ? [...root.querySelectorAll('.tb-card')].map(c => ({ w: c.dataset.w, got: c.classList.contains('got') })) : []),
  tap: sel => { const e = root && root.querySelector(sel); if (!e) return false; e.click(); return true; },
  state: () => { const b = book(); return JSON.parse(JSON.stringify({ open: !!panel, tab: panel ? cur.tab : null, page: cur.page, pow: b.pow, gate: b.gate, cr: b.cr, full: b.full })); },
  setPowers: on => { const b = book(); for (const p of POWERS) { if (on) b.pow[p.id] = b.pow[p.id] || { day: day(), seen: true }; else delete b.pow[p.id]; } F.store(); return Book.powers(); },
};
})();
