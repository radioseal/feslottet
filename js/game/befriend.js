/* Feslottet – «Bli venn»: the befriend encounter «Venneprøven» (WP2 CATCH v3, DESIGN3 §5; was DESIGN2 §5.2–5.4, §5.7).
   F.Befriend.start(rec) -> Promise<{won, H, p, outcomes, roll, items}>   rec = F.Fauna record {sp, x, z, gid, proxy?} (fauna.js calls this on a tap)
   F.Befriend.chance(tier, outcomes, carry) -> {H, p, carry, earned, allA}   the exact §5.4 formula (pure; unit-tested)
   F.Befriend.carryAfter(tier, carry, earned) -> new carry («Den husker deg», §5.5)
   F.Befriend.busy (getter)  F.Befriend.bundle ('bf:<gid>' while an encounter runs)  F.Befriend.friendTap(rec) (fauna.js: a tap on a friend)
   F.Befriend.species() / byId(id) / pages()   normalised F.FAUNA data (built-in §4.2 fallback table until WP4's data is there)
   F.Befriend.isFriend(sp)  cooling(sp)  thumb(sp, px)  make(sp)  save()  starReady(sp)
   Flow (v3): tap → she flies to 2 m → F.Fauna.focus → Vennemåleren (n trial pips above two ten-frames = 20 heart slots) → «Dyret har
   {n} oppgaver til deg!» → carry hearts light first (own colour) → n MIXED tasks (common 3, rare 4, glitter 5, legend 6; NUM and WORD
   groups alternate; at her level via the engine's trial option; stretch items at fixed inner indexes) → hearts fly in (A +GAIN_A,
   B +GAIN_B, C none), the animal hops closer on each A, a short line between tasks → all A: all 20 light, sure friend; H = 0: quiet
   «not now» (no wheel); otherwise the honest Vennehjulet. Win: Navnelappen (she writes / reads the name when it fits her level) →
   vennebånd with the name, «Du ble venn med kua!», sticker, coins. Not now: carry grows (bounded), cooldown (3 tasks or 3 minutes).
   Natural audit 11.10. (D1, parent: «feels so cheesy … doesnt seem natural to a real game»): the first tap on an animal only invites
   (fauna.js: a heart bubble – tapping it starts this trial); no «Dyret har {n} oppgaver», no lines between tasks, no «{n} hjerter!»,
   no «Siste oppgave!»; the rule (bf_intro) and the wheel (bf_wheel + bf_gold) are explained once ever; the win is «Alle hjertene lyser!»
   (all A) → its sound and a hop → it munches its food (shown, not said) → «Du ble venn med kua!» on the ribbon → sticker; no naming
   task, no «Visste du det?» (B.teachOn = false), no «Den står på side 1». A task she leaves (Task.abort, e.g. «Fly videre») ends the
   meeting quietly: no catch, no coins, no line, the carry stays, and the same item waits at the same place next time (resumeAt).
   Friends: 1st tap pets + «Vil du leke med vennen din?», a 2nd tap (or a tap on its ★) within 12 s → Vennestjerne mini-trial (v5c WP-A2: one spaced recall of
   what THIS friend taught her + one task from its own world, a new kind of thinking each visit; both A → star; see «Vennestjerne»).
   Invariants: gear, fairy, companion and coins never enter the formula; hearts are never removed; a non-A never ends a trial early.
   Events: befriendStart({sp, tier, n, kind}) befriendEnd({sp, won, tasks, outcomes, H, kind}) activity('befriend', true|false)
           friendMade(sp) pageComplete(n) friendStar(sp, stars).
   Debug (attached on 'ready'): F.dbg.befriend(sp, 'AAB', {sim, roll, rec}) -> result; F.dbg.bfChance(tier, 'AB', carry); F.dbg.bfStar(sp, 'AA').
   v5 WP-A (DESIGN5 §2): themed trials – groups N (numbers; counting tasks count THE ANIMAL'S food via params.model, «Den spiser
   nøtter!»), R (reasoning strands), W (language), V (one spaced recall of a taught fact / word, F82) – with ≥ 3 thinking types per trial;
   the trial intro says where it lives («Den bor i en bikube.»); the win TEACHES (F.VIT.teach: «Visste du det?» + one fact, the food pops
   up beside it, + its word / expression acted out); the name task is framed as a gift (#43); the camera focus is always released at
   cleanup, whatever cam.mode is (playtest camera); album page numbers are natural (F.Befriend.sideOf: 10–20 → 1–11).
   v5c WP-A2 (DESIGN5 §9): ONE star system per friend – a Vennestjerne is friendship × knowledge (see «Vennestjerne» below: the spaced
   recall of what the friend taught her FIRST, then a play task from its world, a new kind each visit; starReady needs a due key);
   trials pass theme: sp to the engine (WP-E2's generators pattern / sort / sum with the animal's world) and prefer stories about it
   (F.LESF.about); the food line is said only where its food is really shown. Debug: F.dbg.bfStarPlan(sp, {kinds}). */
(function () {
'use strict';
const F = window.F, U = F.U, V3 = THREE.Vector3;

/* ---------------------------------------------------------- Venneprøven: trial size, the exact formula, carry (DESIGN3 §5.1, §5.4, §5.5) */
// trial length by tier; stretch items (one rung above her level, golden) at these 0-based indexes – never first or last
const TRIAL = { 1: { n: 3, stretch: [] }, 2: { n: 4, stretch: [2] }, 3: { n: 5, stretch: [1, 3] }, 4: { n: 6, stretch: [2, 4] } };
const NTASK = { 1: 3, 2: 4, 3: 5, 4: 6 };
const GAIN = { A: { 1: 6, 2: 4, 3: 3, 4: 2 }, B: { 1: 2, 2: 1, 3: 1, 4: 1 }, C: { 1: 0, 2: 0, 3: 0, 4: 0 } };
const CARRY_MAX = { 1: 10, 2: 6, 3: 6, 4: 6 }, CARRY_DIV = 3;
const SLOTS = 20, CAP_ERR = 18;
const COINS = { 1: 3, 2: 6, 3: 10, 4: 20 };                 // the win bonus (unchanged)
const TASK_COINS = { A: 1, B: 0, C: 0 };                    // per-task coins inside a trial: halved (stage.js honours ctx.coins – WP7)
const COOL_MS = 3 * 60 * 1000, COOL_TASKS = 3, PAGE_COINS = 20, STAR_MAX = 3;
const START = { 1: 0, 2: 0, 3: 0, 4: 0 };                   // v3: no start hearts (kept for old callers)
const tierOf = t => (NTASK[t] != null ? t : 1);
function earnedOf(tier, outcomes) { let e = 0; for (const o of outcomes) e += (GAIN[o] || GAIN.C)[tier]; return e; }
// H = all n answers A ? 20 : min(18, carry + Σ gains); p = H / 20. Pure: only tier, outcomes and carry enter it.
function chance(tier, outcomes, carry) {
  tier = tierOf(tier); outcomes = (outcomes || []).map(o => String(o).toUpperCase());
  const c = Math.max(0, Math.min(CARRY_MAX[tier], Math.floor(+carry || 0)));
  const earned = earnedOf(tier, outcomes);
  const allA = outcomes.length >= NTASK[tier] && outcomes.every(o => o === 'A');
  const H = allA ? SLOTS : Math.min(CAP_ERR, c + earned);
  return { H, p: H / SLOTS, H0: c, carry: c, bonus: c, earned, allA };
}
// after a lost wheel or a quiet «not now»: the animal remembers part of her effort (bounded); reset on a win
function carryAfter(tier, carry, earned) {
  tier = tierOf(tier);
  return Math.min(CARRY_MAX[tier], Math.max(0, Math.floor(+carry || 0)) + Math.max(1, Math.floor((+earned || 0) / CARRY_DIV)));
}

/* ---------------------------------------------------------- species data (F.FAUNA, else the §4.2 table) */
const PAGES = [['slottsparken', 'Slottsparken'], ['landsbyen', 'Landsbyen'], ['garden', 'Gården'], ['engen', 'Enga'], ['frukthagen', 'Frukthagen'],
  ['innsjoen', 'Innsjøen'], ['mollehaugene', 'Møllehaugene'], ['stranda', 'Stranda'], ['havet', 'Havet'], ['snohaugen', 'Snøhaugen'], ['legender', 'Eventyrdyra']]
  .map(([id, name], i) => ({ n: 10 + i, id, name }));
const PAGE_RING = { 10: 0, 11: 0, 12: 1, 13: 1, 14: 2, 15: 1, 16: 2, 17: 2, 18: 2, 19: 2, 20: 2 };
// id def tier model where(l land, a air, w lake water, s sea) gates(M K R V rN kik fN p6, '-' none) [landmark]
const FB = {
  10: 'due duen 1 due l -|and anda 1 and w -|ekorn ekornet 1 ekorn l -|kanin kaninen 1 kanin l -|sommerfugl sommerfuglen 1 sommerfugl a -|' +
    'svane svanen 2 svane w -|pinnsvin pinnsvinet 2 pet_pinnsvin l K|gullfisk gullfisken 2 fisk w -|blomsterkanin blomsterkaninen 3 kanin l M|stjerneekorn stjerneekornet 3 ekorn l K',
  11: 'katt katten 1 katt l -|hund hunden 1 hund l -|mus musa 1 mus l -|spurv spurven 1 fugl a -|kattunge kattungen 1 pet_kattunge l -|' +
    'valp valpen 2 valp l -|papegøye papegøyen 2 pet_papegøye a -|marsvin marsvinet 2 pet_marsvin l -|krystallkatt krystallkatten 3 katt l R|boblevalp boblevalpen 3 valp l r2',
  12: 'ku kua 1 ku l -|sau sauen 1 sau l -|gris grisen 1 gris l -|høne høna 1 høne l -|hest hesten 1 hest l -|' +
    'kalv kalven 2 kalv l M|lam lammet 2 lam l -|geit geita 2 geit l -|blomsterku blomsterkua 3 ku l M,r2|stjernegris stjernegrisen 3 gris l K,r2',
  13: 'bie bia 1 bie a -|humle humla 1 humle a -|larve larven 1 larve l -|marihøne marihøna 1 marihøne l -|gresshoppe gresshoppa 1 gresshoppe l -|' +
    'rådyr rådyret 2 rådyr l M|lerke lerka 2 fugl a -|vipe vipa 2 fugl a -|krystallsommerfugl krystallsommerfuglen 3 sommerfugl a R,r2|blomsterhumle blomsterhumla 3 humle a r2',
  14: 'meis meisen 1 fugl a -|trost trosten 1 fugl a -|snegl sneglen 1 snegl l -|maur mauren 1 maur l -|kråke kråka 1 fugl a -|' +
    'hakkespett hakkespetten 2 fugl a -|grevling grevlingen 2 grevling l K|ugle ugla 2 ugle a K|blomstersnegl blomstersneglen 3 snegl l R,r2|krystallmeis krystallmeisen 3 fugl a M,r2',
  15: 'frosk frosken 1 frosk l -|gås gåsa 1 gås l -|fisk fisken 1 fisk w -|øyenstikker øyenstikkeren 1 øyenstikker a -|andunge andungen 1 pet_andunge w -|' +
    'bever beveren 2 bever w -|oter oteren 2 oter w -|hegre hegren 2 hegre l M|boblefisk boblefisken 3 fisk w r2|krystallfrosk krystallfrosken 3 frosk l R,r2',
  16: 'hare haren 1 hare l -|esel eselet 1 esel l -|ponni ponnien 1 ponni l -|skjære skjæra 1 fugl a -|svale svala 1 fugl a -|' +
    'føll føllet 2 føll l M|rev reven 2 rev l r2|lama lamaen 2 lama l -|stjernerev stjernereven 3 rev l K,r3|bobleesel bobleeselet 3 esel l V,r3',
  17: 'krabbe krabben 1 krabbe l -|måke måka 1 måke a -|sjøstjerne sjøstjerna 1 sjøstjerne l -|tjeld tjelden 1 fugl a -|eremittkreps eremittkrepsen 1 eremittkreps l -|' +
    'sel selen 2 sel w -|lunde lunden 2 lunde a M|skilpadde skilpadda 2 pet_skilpadde l -|boblekrabbe boblekrabben 3 krabbe l r3|stjernemåke stjernemåka 3 måke a V,r3',
  18: 'makrell makrellen 1 fisk s -|torsk torsken 1 fisk s -|manet maneten 1 manet s -|blekksprut blekkspruten 1 blekksprut s -|reke reka 1 reke s -|' +
    'delfin delfinen 2 delfin s -|hval hvalen 2 hval s r3|sjøhest sjøhesten 2 sjøhest s -|krystallsjøhest krystallsjøhesten 3 sjøhest s R,r3|stjernedelfin stjernedelfinen 3 delfin s K,r3',
  19: 'pingvin pingvinen 1 pingvin l -|rype rypa 1 fugl a -|snøhare snøharen 1 hare l -|rein reinen 1 rein l -|lemen lemenet 1 lemen l -|' +
    'fjellrev fjellreven 2 rev l -|moskus moskusen 2 moskus l r3|elg elgen 2 elg l -|blomsterrein blomsterreinen 3 rein l M,r3|boblepingvin boblepingvinen 3 pingvin l r3',
  20: 'enhjørning enhjørningen 4 hest l R,r3 regnbuebro|vingehest vingehesten 4 hest a V,kik kjempemolle|skylam skylammet 4 lam l K,r2 ballongplass|' +
    'isbjørnunge isbjørnungen 4 isbjørnunge l M,r3 isslott|krystallhjort krystallhjorten 4 rådyr l R,f20 krystallhoyden|solhare solharen 4 hare l K kjempesolsikke|' +
    'perlehval perlehvalen 4 hval s kik fyrtarn|kjempeskilpadde kjempeskilpadda 4 pet_skilpadde l p6 sandslott|månekatt månekatten 4 katt l K pariserhjul|elefantunge elefantungen 4 elefantunge l f40 dyrepark',
};
const GLIT = ['krystall', 'blomster', 'boble', 'stjerne'];
function fallbackList() {
  const out = [];
  for (const pn in FB) for (const row of FB[pn].split('|')) {
    const [id, def, t, model, wh, gates, landmark] = row.trim().split(/\s+/);
    const when = { phase: null, weather: null, ring: 0, needs: null };
    if (gates && gates !== '-') for (const g of gates.split(',')) {
      if (g === 'M') when.phase = 'morgen'; else if (g === 'K') when.phase = 'kveld';
      else if (g === 'R') when.weather = 'regn'; else if (g === 'V') when.weather = 'vind';
      else if (g === 'kik') when.needs = 'kikkert'; else if (g === 'p6') when.needs = { pages: [17, 18], n: 6 };
      else if (/^r\d$/.test(g)) when.ring = +g[1]; else if (/^f\d+$/.test(g)) when.needs = { friends: +g.slice(1) };
    }
    const where = { l: 'land', a: 'air', w: 'water', s: 'sea' }[wh] || 'land';
    const gl = +t === 3 ? GLIT.find(p => id.startsWith(p)) : null;
    out.push({ id, word: id, def, page: +pn, tier: +t, model, opts: null, where, land: where === 'land' || where === 'air', when, landmark: landmark || null,
      glitter: gl ? (gl === 'blomster' ? 'blomst' : gl) : null });
  }
  return out;
}
let cache = null, cacheKey = '';
function norm(s) {
  const w = s.when || {};
  const where = s.where || 'land';
  return { id: s.id, word: s.word || s.id, def: s.def || s.id, page: +s.page || 10, tier: tierOf(+s.tier || 1), model: s.model || s.id, opts: s.opts || null,
    where, land: s.land != null ? !!s.land : !(where === 'water' || where === 'sea'),
    when: { phase: w.phase || null, weather: w.weather || null, ring: +w.ring || 0, needs: w.needs || null },
    landmark: s.landmark || null, glitter: s.glitter || null, legend: s.legend || null, sound: s.sound || null, cat: s.cat || null };
}
function species() {
  const src = F.FAUNA && Array.isArray(F.FAUNA.species) && F.FAUNA.species.length ? F.FAUNA.species : null;
  const key = src ? 'fa' + src.length : 'fb';
  if (cache && cacheKey === key) return cache;
  cacheKey = key;
  cache = src ? src.map(norm) : fallbackList();
  cache.byId = {}; cache.forEach(s => { cache.byId[s.id] = s; });
  return cache;
}
const byId = id => species().byId[id] || null;
// v5 WP-A: page id (10–20) → the natural album page number 1–11 (DESIGN4 §8)
function sideOf(n) { const i = pages().findIndex(p => p.n === +n); return i >= 0 ? i + 1 : Math.max(1, Math.min(11, (+n || 10) - 9)); }
function pages() {
  const P = F.FAUNA && Array.isArray(F.FAUNA.pages) && F.FAUNA.pages.length >= 11 ? F.FAUNA.pages : PAGES;
  return P.map(p => ({ n: +p.n, id: p.id, name: p.name }));
}

/* ---------------------------------------------------------- save (F.save.album) */
function save() {
  const a = F.save.album = F.save.album || {};
  a.friends = a.friends || {}; a.fails = a.fails || {}; a.cool = a.cool || {}; a.pages = a.pages || {};
  if (a.intro == null) a.intro = 0;
  if (a.todaySaid == null) a.todaySaid = 0;
  if (a.tn == null) a.tn = 0;          // tasks finished anywhere (cooldown counter; v3: also tasks done for other animals)
  if (a.wheels == null) a.wheels = 0;  // wheels seen (the «gullhjerte» explanation runs 3 times)
  if (!a.carry) {                      // v3 «Den husker deg»: carry hearts per species. Migration from the v2 mercy: min(CARRY_MAX, 2·fails)
    a.carry = {};
    for (const sp in a.fails) { const s = byId(sp), f = +a.fails[sp] || 0; if (s && f > 0 && !a.friends[sp]) a.carry[sp] = Math.min(CARRY_MAX[s.tier] || 6, 2 * f); }
  }
  return a;
}
const isFriend = sp => !!save().friends[sp];
const now = () => (B._now ? B._now() : Date.now());
function cooling(sp) {
  const c = save().cool[sp]; if (!c) return false;
  const t = typeof c === 'number' ? c : c.t, n = typeof c === 'number' ? -1e9 : c.n;
  return now() - t < COOL_MS && save().tn - n < COOL_TASKS;
}
F.on('taskEnd', () => { save().tn++; F.store(); });
const carryOf = sp => Math.max(0, +(save().carry[sp] || 0));
const dayNo = () => F.save.day || 1;

/* ---------------------------------------------------------- models and thumbnails (F.Beasts, with a base-model fallback) */
const hasBeast = id => { try { return !!(F.Beasts && F.Beasts.has && F.Beasts.has(id)); } catch (e) { return false; } };
const thumbCache = {};
// sil: a flat side-profile silhouette in that colour (album: unfound cards); '' when WP5's silhouettes are missing (the album then
// darkens the colour thumbnail itself)
const SIL = 0xc3aee8;
function thumb(sp, px, sil) {
  px = px || 128; const k = sp + '@' + px + (sil ? 's' : '');
  if (thumbCache[k] != null) return thumbCache[k];
  let url = '';
  if (sil) { try { if (hasBeast(sp)) url = F.Beasts.thumb(sp, px, { sil: sil === true ? SIL : sil }) || ''; } catch (e) { url = ''; } return (thumbCache[k] = url); }
  try {
    if (hasBeast(sp)) url = F.Beasts.thumb(sp, px) || '';
    if (!url) { const s = byId(sp), m = s && s.model; if (m && F.VOX.has(m)) url = F.Thumb.url(m, s.opts || {}, { size: px }); }
  } catch (e) { console.warn('befriend thumb', sp, e); }
  return (thumbCache[k] = url);
}
function make(sp) {
  let g = null;
  try { if (hasBeast(sp)) g = F.Beasts.make(sp); } catch (e) { console.warn('Beasts.make', sp, e); }
  if (!g || !g.children.length) { const s = byId(sp); if (s && F.VOX.has(s.model)) g = F.VOX.make(s.model, s.opts || {}); }
  return g || new THREE.Group();
}

/* ---------------------------------------------------------- DOM helpers (game-clock driven, so headless stepping works) */
const UI = F.UI;
const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5.6 15.6 1.2 11.6 1.2 6.9 1.2 3.7 3.6 1.4 6.6 1.4c2.1 0 3.9 1.1 5.4 3.1 1.5-2 3.3-3.1 5.4-3.1 3 0 5.4 2.3 5.4 5.5 0 4.7-4.4 8.7-10.8 14.1z"/></svg>';
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l3 7 7.5.6-5.7 4.9 1.8 7.4L12 17.4l-6.6 4 1.8-7.4L1.5 9.1 9 8.5z"/></svg>';
const PAW = '<svg class="bf-paw" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="21" rx="7" ry="6"/><ellipse cx="8" cy="13" rx="3" ry="3.6"/><ellipse cx="13" cy="8" rx="3" ry="3.8"/><ellipse cx="19" cy="8" rx="3" ry="3.8"/><ellipse cx="24" cy="13" rx="3" ry="3.6"/></svg>';
const GEM = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2h10l4 5-9 11L1 7z"/><path d="M1 7h18M7 2l3 5 3-5M10 7v11" fill="none"/></svg>';
const FAIRY_COL = { krystall: ['#bfe4ff', '#8f7bff'], blomst: ['#ffc2dc', '#ff6fa8'], boble: ['#b9f3ee', '#2fb9b0'], stjerne: ['#fff0a8', '#f0b01e'] };
const fairyCol = () => FAIRY_COL[F.save.fairy] || FAIRY_COL.krystall;
const rect = () => F.R.renderer.domElement.getBoundingClientRect();
const _pv = new V3();
function toScreen(p) {
  _pv.copy(p).project(F.R.camera); const r = rect();
  return { x: r.left + (_pv.x + 1) / 2 * r.width, y: r.top + (1 - _pv.y) / 2 * r.height, on: _pv.z < 1 };
}
const center = el => { const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; };
function gemsHTML(tier) {
  if (tier >= 4) return '<span class="bf-gems legend">' + STAR + '</span>';
  return '<span class="bf-gems">' + (tier >= 2 ? GEM : '') + (tier >= 3 ? GEM : '') + '</span>';
}
// a little heart (or any html) flies from a to b along an arc; resolves on arrival
function flyEl(html, cls, a, b, ms, lift) {
  const e = UI.el('div', 'bf-fly ' + (cls || ''), html); document.body.appendChild(e);
  const set = (x, y, s) => { e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`; };
  set(a.x, a.y, 0.4);
  return F.T.tween(ms, k => { const e2 = U.smooth(k); set(a.x + (b.x - a.x) * e2, a.y + (b.y - a.y) * e2 - Math.sin(Math.PI * k) * (lift != null ? lift : 70), 0.4 + 0.8 * Math.min(1, k * 3) - 0.2 * k); })
    .then(() => e.remove());
}

/* ---------------------------------------------------------- Vennemåleren: 20 heart slots = two ten-frames (2 × 5 each) */
// o = {n, stretch: [k…], pipsOnly}: n trial pips (paws) above the ten-frames – gold A, silver B, grey C; the current one pulses;
// stretch pips wear a little gold star. pipsOnly (Vennestjerne mini-trial): just the pips and the picture, no hearts.
function Meter(anchorFn, tier, sp, o) {
  o = o || {};
  const el = UI.el('div', 'bf-meter' + (o.pipsOnly ? ' pips-only' : ''));
  const head = UI.el('div', 'bf-meter-head', gemsHTML(tier));
  const pipRow = UI.el('div', 'bf-pips'), pips = [];
  for (let i = 0; i < (o.n || 0); i++) {
    const p = UI.el('div', 'bf-pip' + ((o.stretch || []).includes(i) ? ' stretch' : ''), PAW + '<span class="bf-pip-star">' + STAR + '</span>');
    pipRow.appendChild(p); pips.push(p);
  }
  const row = UI.el('div', 'bf-frames');
  const im = sp ? thumb(sp, 128) : '';
  if (im) row.appendChild(UI.el('div', 'bf-meter-pic', `<img src="${im}" alt="">`));   // which animal these hearts are for (also when docked)
  const slots = [];
  for (let f = 0; f < 2; f++) {
    const fr = UI.el('div', 'bf-frame');
    for (let i = 0; i < 10; i++) { const s = UI.el('div', 'bf-slot', HEART); fr.appendChild(s); slots.push(s); }
    row.appendChild(fr);
  }
  const nEl = UI.el('div', 'bf-meter-n', '0');                  // the count as a numeral too (quiet number exposure)
  row.appendChild(nEl);
  if (tier >= 2 && !o.pipsOnly) el.appendChild(head);
  if (pips.length) el.appendChild(pipRow);
  el.appendChild(row);
  document.body.appendChild(el);
  const M = { el, slots, pips, lit: 0, docked: false, dead: false };
  // pip k: 'cur' (pulses), 'A' | 'B' | 'C' (done), stretch(true|false) = the star ring (the engine decides if a stretch item was served)
  M.pip = (k, st) => {
    const p = pips[k]; if (!p) return;
    if (st === 'cur') { pips.forEach(q => q.classList.remove('cur')); p.classList.add('cur'); return; }
    p.classList.remove('cur'); p.classList.add('done', 'o' + st); p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  };
  M.pipStretch = (k, on) => { const p = pips[k]; if (p) p.classList.toggle('stretch', !!on); };
  let shown = 0;
  const bumpN = () => { shown++; nEl.textContent = String(shown); nEl.classList.remove('pop'); void nEl.offsetWidth; nEl.classList.add('pop'); };
  let dockK = 0, dockGoal = 0;
  const place = () => {
    if (M.dead) return;
    const w = el.offsetWidth || 360, h = el.offsetHeight || 80;
    let ax = innerWidth / 2 - w / 2, ay = 90;
    try { const p = anchorFn && anchorFn(); if (p) { const s = toScreen(p); if (s.on) { ax = s.x - w / 2; ay = s.y - h - 12; } } } catch (e) { /* keep centre */ }
    ax = U.clamp(ax, 10, innerWidth - w - 10); ay = U.clamp(ay, 104, innerHeight - h - 230);
    const dx = 14, dy = 108;                                   // the dock: top-left, under the purse (never over the task stage)
    const k = U.smooth(dockK);
    el.style.transform = `translate(${(ax + (dx - ax) * k).toFixed(1)}px, ${(ay + (dy - ay) * k).toFixed(1)}px)`;
  };
  const offR = F.on('preRender', place), offT = F.on('tick', dt => { if (dockK !== dockGoal) { dockK = dockGoal > dockK ? Math.min(dockGoal, dockK + dt * 3) : Math.max(dockGoal, dockK - dt * 3); place(); } });
  place(); showNow(el);
  // parent 11.10. («the questions with the numbers are constantly blocked by the animal hearts»): docked during a task the meter is a
  // small chip – the animal, the task paws and the count; the 20-heart frames show only between tasks, when the hearts fly in
  M.dock = on => { dockGoal = on ? 1 : 0; M.docked = !!on; el.classList.toggle('docked', !!on); return F.T.sleep(360); };
  M.setOn = (i, cls) => { const s = slots[i]; if (!s || s.classList.contains('on')) return; s.classList.add('on'); if (cls) s.classList.add(cls); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); bumpN(); };
  // light the next n hearts one by one (start hearts)
  M.light = async (n, cls) => { for (let i = 0; i < n && M.lit < SLOTS; i++) { M.setOn(M.lit, cls); F.sfx.pling(M.lit % 12); M.lit++; await F.T.sleep(110); } };
  // n hearts fly in from a screen point, never above cap (no heart is ever taken back: a capped flight lights fewer)
  M.fly = async (n, from, cap) => {
    const k = Math.max(0, Math.min(n, (cap || SLOTS) - M.lit)); const ps = [];
    for (let j = 0; j < k; j++) {
      const idx = M.lit + j;
      ps.push(F.T.sleep(j * 70).then(() => flyEl(HEART, 'bf-heart', from, center(slots[idx]), 520, 80)).then(() => { M.setOn(idx); F.sfx.pling(idx % 12); }));
    }
    M.lit += k;
    await Promise.all(ps);
    return k;
  };
  M.glowAll = () => { el.classList.add('all'); };
  M.place = place;
  M.remove = () => { if (M.dead) return; M.dead = true; offR(); offT(); el.classList.remove('on'); F.T.sleep(250).then(() => el.remove()); };
  return M;
}

// add 'on' now (a forced style flush starts the CSS transition) instead of on the next animation frame, which a busy or
// test-stepped page can delay past the whole wheel
function showNow(e) { void e.offsetWidth; e.classList.add('on'); }
// which of the 20 ring slots the star stands on, from its on-screen centre (angle around the wheel centre; slot 0 = top, clockwise)
function seenSlot(star, cx, cy) {
  const s = center(star), a = Math.atan2(s.y - cy, s.x - cx) + Math.PI / 2;
  return ((Math.round(a / (2 * Math.PI / SLOTS)) % SLOTS) + SLOTS) % SLOTS;
}

/* ---------------------------------------------------------- Vennehjulet: honest wheel */
async function wheel(M, H, roll, sp) {
  const ov = UI.el('div', 'bf-wheel');
  const R = Math.max(110, Math.min(190, innerHeight * 0.27));
  const cx = innerWidth / 2, cy = Math.min(innerHeight * 0.46, innerHeight - R - 120);
  const mid = UI.el('div', 'bf-wheel-mid'); const im = thumb(sp, 160);
  mid.innerHTML = (im ? `<img src="${im}" alt="">` : '') + `<div class="bf-wheel-n">${H}</div>`;
  mid.style.left = cx + 'px'; mid.style.top = cy + 'px';
  ov.appendChild(mid);
  document.body.appendChild(ov);
  showNow(ov);                                                      // visible at once (not on the next animation frame)
  const ring = [];
  const pos = i => { const a = -Math.PI / 2 + i * 2 * Math.PI / SLOTS; return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }; };
  for (let i = 0; i < SLOTS; i++) {
    const h = UI.el('div', 'bf-ring' + (i < H ? ' gold' : ''), HEART);
    const from = center(M.slots[i]);
    h.style.left = '0px'; h.style.top = '0px';
    h._from = from; h._to = pos(i);
    ov.appendChild(h); ring.push(h);
  }
  M.el.classList.add('gone');
  const setH = (h, x, y, s) => { h.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`; };
  ring.forEach(h => setH(h, h._from.x, h._from.y, 0.8));
  F.sfx.whoosh();
  await F.T.tween(650, k => { const e = U.smooth(k); ring.forEach((h, i) => { const d = Math.min(1, Math.max(0, e * 1.25 - (i / SLOTS) * 0.25)); setH(h, h._from.x + (h._to.x - h._from.x) * d, h._from.y + (h._to.y - h._from.y) * d, 0.8 + 0.5 * d); }); });
  const star = UI.el('div', 'bf-star', STAR); ov.appendChild(star);
  const s0 = Math.floor(Math.random() * SLOTS);
  const total = 2 * SLOTS + ((roll - s0) % SLOTS + SLOTS) % SLOTS;
  let cur = -1;
  const show = i => { const p = pos(((i % SLOTS) + SLOTS) % SLOTS); star.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`; ring.forEach(h => h.classList.remove('hit')); ring[((i % SLOTS) + SLOTS) % SLOTS].classList.add('hit'); };
  show(s0);
  await F.T.tween(2200, k => {
    const e = 1 - Math.pow(1 - k, 3);                              // fast, ticks, slows down
    const i = s0 + Math.round(total * e);
    if (i !== cur) { cur = i; show(i); F.sfx.tone ? F.sfx.tone(1200 + ((i % SLOTS) < H ? 400 : 0), 0.04, 'triangle', 0.05) : F.sfx.click(); }
  });
  show(s0 + total);
  const landed = ring[roll], won = roll < H;
  // the honest-wheel check, read back from the screen: the heart the star really stands on, and the gold hearts she sees
  const seen = seenSlot(star, cx, cy), gold = ring.filter(h => h.classList.contains('gold')).length;
  B.lastWheel = { n: (B.lastWheel ? B.lastWheel.n : 0) + 1, sp, H, roll, landed: seen, gold, landedGold: !!(ring[seen] && ring[seen].classList.contains('gold')), won };
  if (seen !== roll || gold !== H || B.lastWheel.landedGold !== won) console.error('Vennehjulet: shown ≠ roll', JSON.stringify(B.lastWheel));
  // the landed heart grows in front of the star (its true colour stays fully visible); the star becomes a halo behind it
  const lp = pos(roll);
  landed.style.zIndex = '3'; star.style.zIndex = '2'; star.classList.add('land');
  star.style.transform = `translate(${lp.x.toFixed(1)}px, ${lp.y.toFixed(1)}px) translate(-50%, -50%) scale(1.5)`;
  F.T.tween(260, k => setH(landed, lp.x, lp.y, 1.3 + 0.6 * U.smooth(k)));
  landed.classList.add(won ? 'win' : 'miss');
  if (won) { F.sfx.chime(); ov.classList.add('won'); } else F.sfx.boing();
  await F.T.sleep(won ? 1100 : 1300);
  ov.classList.remove('on');
  F.T.sleep(400).then(() => ov.remove());
  return won;
}

/* ---------------------------------------------------------- the encounter */
let enc = null;                     // the running encounter (null when idle)
let fakeN = 0;
const B = F.Befriend = {
  START, NTASK, TRIAL, GAIN, SLOTS, CAP_ERR, CARRY_MAX, CARRY_DIV, COINS, TASK_COINS, COOL_MS, COOL_TASKS, PAGE_COINS, STAR_MAX,
  chance, carryAfter, species, byId, pages, sideOf, save, isFriend, cooling, thumb, make, HEART, STAR, GEM, PAW, gemsHTML,
  get busy() { return !!enc; },
  get bundle() { return enc ? enc.bundle : null; },
  current: () => enc,
  _sim: null, _roll: null, _now: null,
  lastWheel: null,                  // the last wheel as shown on screen: {n, sp, H, roll, landed, gold, landedGold, won} (honesty check)
  lastTrial: null,                  // the last trial's served items [{k, group, strand, format, kind, rung, sup, at, golden, nch, outcome}]
  viewOn: true,                     // kill switch for the W2 framing search (false = the W1 midpoint focus)
  // natural audit 11.10. D1 (#0 / #26 / #43 / #52, parent: «all animals say what they are eating... feels so cheesy»): no «Visste du
  // det?» lecture when she wins a friend or a star. The facts live on the album card (tap to hear, F.VIT.teachOne) and in the later
  // recall tasks; the win SHOWS the food (it pops up and the animal munches it, no words). true = the v5 teaching moment again.
  teachOn: false,
  start, friendTap, starReady,
};
const resumeAt = {};               // sp -> {k: item}: a trial task she left (Task.abort) is served again at the same place next time

function recPos(rec) {
  const pr = rec.proxy;
  const x = pr && pr.obj ? pr.obj.position.x : (pr && pr.x != null ? pr.x : rec.x);
  const z = pr && pr.obj ? pr.obj.position.z : (pr && pr.z != null ? pr.z : rec.z);
  return { x, z };
}
function proxyOf(rec) {
  if (rec.proxy) return rec.proxy;
  const p = recPos(rec);
  return { x: p.x, z: p.z, y: rec.y != null ? rec.y : F.Space.heightAt(p.x, p.z), obj: rec.obj || null, id: 'bf_' + (rec.gid != null ? rec.gid : rec.id) };
}
function isWet(x, z) { try { return !!(F.W && F.W.water && F.W.water(x, z)); } catch (e) { return false; } }

/* ---------------------------------------------------------- encounter framing (W2): her fairy AND the animal stay in view
   The camera looks from the south-ish side at pitch ≈ 0.92, so a house, tower or hill just in front of the animal (camera side) can
   hide both under its roof while the heart meter runs. Like the task stage's fairy-spot check (stage.js pickFairySpot), candidate
   views are tested with rays: from each target point (animal body, animal top, her fairy) OUT toward the would-be camera position, so
   a camera that would sit inside a roof counts as hidden too. Order of preference (first fully clear one wins):
     1. the approach side: 2 m beside the animal, screen-left/right first (both read side by side), then in front, then behind;
     2. the view: today's yaw/pitch at ≤ 15 m, then closer, then steeper (over the roof), then a quarter turn, then a half turn.
   The chosen view is kept for the whole encounter (tasks reuse it) and the old yaw/pitch/zoom come back at the end. */
const _ray = new THREE.Raycaster();
// opaque meshes that could stand between the encounter and the camera: only those within R m of the animal (bounding spheres),
// no fauna, no sprites, no tiny instanced decor (grass, flowers). Raycasting the whole outdoor scene costs ≈ 7 ms a ray; this ≈ 0.1 ms.
const _bs = new THREE.Sphere();
function occluders(a, R) {
  R = R || 17;
  const sc = F.Space.scene(), sky = F.R.skyDome, out = [];
  const skipTop = o => !o.visible || o.isLight || o.isSprite || o === sky || o === F.Player.obj || (o.userData && (o.userData.fauna || o.userData.isSil));
  for (const c of sc.children) {
    if (skipTop(c)) continue;
    c.traverseVisible(m => {
      if (!m.isMesh || m.isSprite || (m.userData && (m.userData.fauna || m.userData.isSil))) return;
      const g = m.geometry; if (!g) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere) return;
      if (m.isInstancedMesh) { if (g.boundingSphere.radius * m.matrixWorld.getMaxScaleOnAxis() < 0.8) return; out.push(m); return; }
      _bs.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
      if (Math.hypot(_bs.center.x - a.x, _bs.center.z - a.z) - _bs.radius < R) out.push(m);
    });
  }
  return out;
}
// is the line from p (a target) to c (a camera position) blocked by an opaque, visible mesh?
function lineHidden(p, c, objs, skip) {
  const dir = c.clone().sub(p), L = dir.length(); if (L < 0.6) return false;
  _ray.set(p, dir.multiplyScalar(1 / L)); _ray.near = 0.2; _ray.far = L; _ray.camera = F.R.camera;
  let hits; try { hits = _ray.intersectObjects(objs, false); } catch (e) { return false; }
  for (const h of hits) {
    const m = h.object, mat = m.material;
    if (!m.isMesh || m.isSprite) continue;
    if (mat && !Array.isArray(mat) && (mat.transparent || mat.visible === false || mat.opacity < 0.5)) continue;
    let o = m, sk = false;
    while (o) { if (!o.visible || skip.has(o) || (o.userData && (o.userData.fauna || o.userData.isSil))) { sk = true; break; } o = o.parent; }
    if (!sk) return true;
  }
  return false;
}
// camera position the renderer would use for a view {yaw, pitch, dist} around a focus point (render.js updateCamera, no landmark framing)
function camPosOf(focus, v) {
  const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  return new V3(focus.x + Math.sin(v.yaw) * cp * v.dist, focus.y + sp * v.dist, focus.z + Math.cos(v.yaw) * cp * v.dist);
}
function focusOf(a, f) {
  const x = (a.x + f.x) / 2, z = (a.z + f.z) / 2;
  return new V3(x, F.Space.heightAt(x, z), z);
}
// weighted hidden score of the three target points for fairy spot f and view v (0 = all visible); stops once it reaches bound
function viewScore(a, hgt, f, v, objs, skip, bound) {
  bound = bound != null ? bound : 99;
  const ay = F.Space.heightAt(a.x, a.z), fy = F.Space.heightAt(f.x, f.z);
  const c = camPosOf(focusOf(a, f), v);
  let s = 0;
  if (lineHidden(new V3(a.x, ay + Math.max(0.35, hgt * 0.55), a.z), c, objs, skip)) s += 2;
  if (s >= bound) return s;
  if (lineHidden(new V3(f.x, fy + 1.0, f.z), c, objs, skip)) s += 1.5;
  if (s >= bound) return s;
  if (lineHidden(new V3(a.x, ay + Math.max(0.6, hgt) + 0.15, a.z), c, objs, skip)) s += 1;
  return s;
}
// the fairy-spot candidates around the animal (land: 2 m ring; water animals: shore points ≤ 6 m), best side first
function spotCands(rec, s, yaw) {
  const P = F.Player.pos, a = recPos(rec);
  const wet = s && (s.where === 'water' || s.where === 'sea');
  const ok = (x, z) => !isWet(x, z) && !(F.Space.blocked && F.Space.blocked(x, z, 0.35));
  const tc = Math.atan2(Math.sin(yaw), Math.cos(yaw));                          // heading from the animal toward the camera
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);                                // screen-right
  const side = ((P.x - a.x) * rx + (P.z - a.z) * rz) >= 0 ? 1 : -1;            // the screen side she is on now
  const out = [];
  if (!wet) {
    const angs = [75, 45, 105, 15, 135, 165].flatMap(g => [side * g, -side * g]).map(g => g * Math.PI / 180);
    for (const r of [2, 2.6, 1.6, 3.2]) for (const g of angs) {
      const ang = tc + g, x = a.x + Math.sin(ang) * r, z = a.z + Math.cos(ang) * r;
      if (ok(x, z)) out.push({ x, z });
    }
  } else {
    for (let r = 1.5; r <= 6; r += 0.5) for (let k = 0; k < 12; k++) {
      const ang = tc + side * (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6 + (k === 0 ? side * Math.PI / 3 : 0);
      const x = a.x + Math.sin(ang) * r, z = a.z + Math.cos(ang) * r; if (ok(x, z)) out.push({ x, z });
    }
  }
  return out;
}
// the whole search: returns {spot:{x,z}|null, view:{yaw,pitch,dist,q}, score, n, ms}. A ray costs up to ≈ 6 ms next to merged
// chunk decor, so the search is staged, sliced (yields to the frame loop every ≈ 20 ms: no hitch) and time-boxed (≈ 320 ms of work,
// once per encounter); the best view found so far wins.
async function planView(rec, s, hgt, hereOnly) {
  const BUDGET = 320; let work = 0, tS = performance.now();
  const cam = F.R.cam, a = recPos(rec);
  const y0 = cam.yawGoal, p0 = cam.pitchGoal != null ? cam.pitchGoal : 0.92, d0 = Math.min(cam.distGoal || 24, 15);
  const V = (q, pitch, dist) => ({ yaw: y0 + q * Math.PI / 2, pitch: Math.max(pitch, p0), dist, q });
  const objs = occluders(a), skip = new Set([F.Player.obj, rec.obj, rec.proxy && rec.proxy.obj].filter(Boolean));
  const P = F.Player.pos, here = { x: P.x, z: P.z, here: true };
  const near = hereOnly || Math.hypot(P.x - a.x, P.z - a.z) <= 2.4;    // already close: where she is counts first (no needless flight)
  const spotsFor = (yaw, k) => (near ? [here] : []).concat(hereOnly ? [] : spotCands(rec, s, yaw).slice(0, k));
  let best = null, n = 0;
  const over = () => work + performance.now() - tS > BUDGET;
  const slice = async () => { const t = performance.now(); if (t - tS > 20) { work += t - tS; await new Promise(r => setTimeout(r, 0)); tS = performance.now(); } };
  const test = (f, v) => { const sc = viewScore(a, hgt, f, v, objs, skip, best ? best.score : 99); n++; if (!best || sc < best.score) best = { spot: f.here ? null : f, view: v, score: sc }; return sc; };
  const done = () => Object.assign(best || { spot: null, view: V(0, p0, d0), score: -1 }, { n, ms: +(work + performance.now() - tS).toFixed(1) });
  // 1. today's view: the spots in order (side first)
  const v0 = V(0, p0, d0), ranked = [];
  for (const f of spotsFor(y0, 8)) { const sc = test(f, v0); if (sc === 0) return done(); ranked.push([sc, ranked.length, f]); if (over()) return done(); await slice(); }
  // 2. the best 3 spots, closer and steeper (over the roof)
  const top = ranked.sort((x, y) => x[0] - y[0] || x[1] - y[1]).slice(0, 3).map(r => r[2]);
  for (const v of [V(0, p0, 12), V(0, 1.08, d0), V(0, 1.08, 12), V(0, 1.22, 12), V(0, 1.22, 10), V(0, 1.36, 10)])
    for (const f of top) { if (test(f, v) === 0 || over()) return done(); await slice(); }
  // 3. a quarter turn either way, then a half turn
  for (const q of [1, -1, 2]) for (const v of [V(q, p0, d0), V(q, 1.15, 12)])
    for (const f of spotsFor(y0 + q * Math.PI / 2, 4)) { if (test(f, v) === 0 || over()) return done(); await slice(); }
  return done();
}
function animalHeight(rec) {
  try { const o = rec.obj || (rec.proxy && rec.proxy.obj); if (o) { const a = recPos(rec), bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) return Math.max(0.3, Math.min(4, bb.max.y - F.Space.heightAt(a.x, a.z))); } } catch (e) {}
  return 1.2;
}
// the spot she flies to: 2 m from the animal, on her side; water animals: the nearest shore point ≤ 6 m (W1 rule, used when the
// framing search is off or finds nothing)
function approachSpot(rec, s) {
  const P = F.Player.pos, a = recPos(rec);
  let dx = P.x - a.x, dz = P.z - a.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  const wet = s && (s.where === 'water' || s.where === 'sea');
  const ok = (x, z) => !isWet(x, z) && !(F.Space.blocked && F.Space.blocked(x, z, 0.35));
  if (!wet) {
    for (const r of [2, 2.6, 1.6, 3.2]) for (const da of [0, 0.5, -0.5, 1, -1]) {
      const c = Math.cos(da), sn = Math.sin(da), ux = dx * c - dz * sn, uz = dx * sn + dz * c;
      const x = a.x + ux * r, z = a.z + uz * r; if (ok(x, z)) return { x, z };
    }
    return null;
  }
  for (let r = 1.5; r <= 6; r += 0.5) for (let k = 0; k < 12; k++) {
    const ang = Math.atan2(dx, dz) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6;
    const x = a.x + Math.sin(ang) * r, z = a.z + Math.cos(ang) * r; if (ok(x, z)) return { x, z };
  }
  return null;
}
async function approach(rec, s) {
  const P = F.Player, a = recPos(rec);
  const d = Math.hypot(P.pos.x - a.x, P.pos.z - a.z);
  let spot = null, plan = null;
  if (B.viewOn && F.R.cam.mode === 'out' && F.Space.cur === 'out') {
    try { plan = await planView(rec, s, animalHeight(rec)); } catch (e) { console.warn('befriend view', e); plan = null; }
  }
  if (plan) { enc.plan = plan; spot = plan.spot; }
  else spot = d > 2.4 ? approachSpot(rec, s) : null;
  if (spot && (d > 2.4 || plan)) {
    // walk (time scales with the distance: a far tap used to stop her half-way, behind a house, with the camera between)
    const L = Math.hypot(P.pos.x - spot.x, P.pos.z - spot.z);
    await Promise.race([P.goTo(spot.x, spot.z), F.T.sleep(1000 * Math.min(10, 2.5 + L / 5))]);
    if (P.path) P.stop();
    // still not there (a fence or hedge in the way): she flutters the last bit straight over it
    const rest = Math.hypot(P.pos.x - spot.x, P.pos.z - spot.z);
    if (rest > 0.9) {
      const x0 = P.pos.x, z0 = P.pos.z;
      P.heading = Math.atan2(spot.x - x0, spot.z - z0);
      await F.T.tween(Math.min(1600, 300 + rest * 140), k => { const e = U.smooth(k); P.pos.x = x0 + (spot.x - x0) * e; P.pos.z = z0 + (spot.z - z0) * e; });
    }
  }
  if (P.path) P.stop();
  P.heading = Math.atan2(a.x - P.pos.x, a.z - P.pos.z);
  // the animal may have stepped while she came: check the view from where she really is, search again if it no longer holds
  if (plan && B.viewOn) {
    try {
      const hgt = animalHeight(rec), objs = occluders(recPos(rec)), skip = new Set([P.obj, rec.obj, rec.proxy && rec.proxy.obj].filter(Boolean));
      if (viewScore(recPos(rec), hgt, P.pos, plan.view, objs, skip) > 0) enc.plan = Object.assign(await planView(rec, s, hgt, true), { again: true });
    } catch (e) { console.warn('befriend view check', e); }
  }
}
// WP4 calls (guarded); debug models made here (rec.fake) are never handed to F.Fauna
const fauna = (fn, ...args) => { if (args[0] && args[0].fake) return undefined; try { if (F.Fauna && typeof F.Fauna[fn] === 'function') return F.Fauna[fn](...args); } catch (e) { console.error('F.Fauna.' + fn, e); } return undefined; };
// a small reaction on the animal: WP4's F.Fauna.react(rec, kind) when there, else a wobble/hop on the debug model
function react(rec, kind) {
  if (fauna('react', rec, kind) !== undefined || !rec.fake) return;      // WP4 records animate themselves while focused
  const o = rec.obj || (rec.proxy && rec.proxy.obj); if (!o) return;
  if (kind === 'tilt') { const z0 = o.rotation.z; F.T.tween(700, k => { o.rotation.z = z0 + Math.sin(k * Math.PI) * 0.35; }); }
  else if (kind === 'happy' || kind === 'won') { const y0 = o.position.y; F.T.tween(500, k => { o.position.y = y0 + Math.sin(k * Math.PI) * 0.6; }); }
}
// the animal hops ~0.3 m closer to her on a first-try answer (stays in its element). The step shrinks as it gets near (never closer
// than 1.1 m), so even a legend's 5th first-try answer still moves it a little – «Se, den kommer nærmere!» stays true.
function hopCloser(rec, s) {
  try {
    const P = (enc && enc.home) || F.Player.pos, a = recPos(rec), dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz);
    const st = Math.min(0.3, (d - 1.1) * 0.35);
    if (st < 0.04) return false;
    const tx = a.x + dx / d * st, tz = a.z + dz / d * st;
    const wet = s && (s.where === 'water' || s.where === 'sea');
    if (wet !== isWet(tx, tz)) return false;
    if (!(s && s.where === 'air') && F.Space.blocked && F.Space.blocked(tx, tz, 0.3)) return false;
    const o = rec.obj || (rec.proxy && rec.proxy.obj), x0 = a.x, z0 = a.z, y0 = o ? o.position.y : 0;
    F.T.tween(380, k => {
      const e = U.smooth(k), x = x0 + (tx - x0) * e, z = z0 + (tz - z0) * e;
      if (rec.fake && o) { o.position.x = x; o.position.z = z; o.position.y = F.Space.heightAt(x, z) + Math.sin(k * Math.PI) * 0.35; if (rec.proxy) { rec.proxy.x = x; rec.proxy.z = z; } }
      else if (rec.proxy && rec.proxy.obj) { rec.proxy.obj.position.x = x; rec.proxy.obj.position.z = z; }
      rec.x = x; rec.z = z;
    }).then(() => { if (rec.fake && o) o.position.y = F.Space.heightAt(o.position.x, o.position.z) || y0; });
    return true;
  } catch (e) { console.warn('hopCloser', e); return false; }
}

/* ---------------------------------------------------------- the trial tasks (DESIGN3 §5.2, §5.3; engine interface §3 WP7)
   Each task asks F.LEARN for an item in the next group (NUM: T-NAVN T-MENGDE T-SKRIV T-ORDEN, WORD: LES SKRIV), restricted to the group's
   strands not used yet in this trial, with trial = {atLevel, stretch, allowWarmup: k === 0, preferFormats: PRODUCE}, and runs it with
   F.Task.run on the encounter's stage. Calling the engine here (instead of Task.offer) lets the trial look at the item first: at most one
   item with ≤ 3 chips per trial. When the engine does not know the trial option yet, refine() emulates the at-level rule and the
   production preference (no stretch emulation: a stretch miss must be free, which only the engine can do). */
// portable formats whose fixed lines belong to another place: the lift («Til rom 14, takk!»), the postman («Brevet skal til nummer 12.»),
// the price tag («Den skal koste 15.») and the piggy bank («Grisen har 12 mynter.»). An encounter only uses the skin-neutral ones.
// v5r2 (animals: «Ferske boller!» beside a squirrel): + F48 Tibrettet (always the bakery's bun tray, «Ferske boller!»; it ignores the
// animal's theme – REGN 4 / 7 are practised in the rest of the game, a meeting asks another strand). F43 stays, without money
// (moneyless() below); F54 / F56 keep a neutral skin of their own in a meeting (f_prob.js).
const OFF_SKIN = new Set(['F01', 'F02', 'F13', 'F16', 'F48']);
// v5r2: the formats that really USE an engine surface (params.surface): F55 acts the story out with its things, F56 tells it (bars,
// no things), F53 puts it on the balance's pans (only with objects: E1 at sup 0). The REGN boards (F44 F46 F47 F49) and F54 ignore
// it – there a «themed» surface is no theme at all: no food line, no friend's-world credit
const usesSurface = it => !!it && (it.format === 'F55' || it.format === 'F56' || (it.format === 'F53' && +it.rung === 1 && (it.sup | 0) === 0));
const drawsSurface = it => usesSurface(it) && it.format !== 'F56';
// an item the engine marked themed by a surface its format never shows: not themed (the flag would say «about the animal» falsely)
function realTheme(it) {
  if (it && it.themed === 'surface' && !usesSurface(it)) it.themed = null;
  return it;
}
const engThemed = r => { if (!r) return false; const th = r.themed || (r.params && r.params.themed); return !!th && (th !== 'surface' || usesSurface(r)); };
/* v5r2 (animals: «Her er maten til dyret!» before «Noen fugler satt i treet.» read as the owl eating birds): the food the task really
   SHOWS, or null – a model format counting it (theme() sets foodModel), the balance / puppet theatre with its food as the surface, a
   bead pattern with its food among the beads. A story frame about the animal itself (fugler, frosker, ekorn) is no food. */
function shownFood(T, it) {
  if (!it || !it.themed) return null;
  if (it.foodModel) return it.foodModel;
  const t = themeOf(T.sp), mat = t ? t.mat : [], p = it.params || {};
  if (p.themed === 'surface' && drawsSurface(it)) { const m = p.surface && typeof p.surface === 'object' ? p.surface.model : p.surface; return mat.includes(m) ? m : null; }
  if (p.themed === 'pattern') return (p.palette || []).find(x => mat.includes(x)) || null;
  return null;
}
// v5r2 (animals: «a giant tortoise does not collect nectar»): the food line is chosen for THE ANIMAL, not only for the model – the
// nectar line only for the pollinators (insects that eat flowers: bie, humle, sommerfugl; humla's clover is nectar too), «Den spiser
// blomster!» for the others (kjempeskilpadde, enhjørning)
function foodLine(sp, m) {
  const t = themeOf(sp); if (!t || !m || !t.mat.includes(m)) return null;
  const pollinator = t.kl === 'insekt' && t.mat.includes('n_blomst');
  if (pollinator && (m === 'n_blomst' || m === 'n_klover')) return 'bf_spiser_n_blomst';
  if (m === 'n_blomst') return 'bf_spiser_blomst';
  return 'bf_spiser_' + m;
}
/* v5 WP-A (DESIGN5 §2.2): themed trials with ≥ 3 kinds of thinking. Groups: N numbers (count / build THE ANIMAL'S things – its food –
   with the formats that honour params.model), R reasoning (MØNSTER LOGIKK DATA FORM LIKHET PROBLEM, when the engine has them active),
   W language (LES SKRIV LES-F ORD; the engine is asked to prefer the animal's food words), V one spaced recall of a taught fact / word
   (F82 Faktakortet: this animal's facts first – «Meeting the animal again asks one spaced question»). The cycle N→R→W (or W→R→N)
   gives every 3-task trial three domains; a pick that would leave fewer than 3 thinking types by the end is re-asked from another
   strand. Counting strands are served only by model formats when the animal has things (never generic apples for a squirrel). */
const NUMS = ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN', 'REGN'], WORDS = ['LES', 'SKRIV', 'LES-F', 'ORD'];
const REAS = ['MØNSTER', 'LOGIKK', 'DATA', 'FORM', 'LIKHET', 'PROBLEM'];
const MODEL_FMTS = ['F06', 'F08', 'F09', 'F19', 'F20', 'F22', 'F07', 'F11'];   // f_num.js: params.model = the thing counted / ordered
// (v5r2: + F07 Tryllebygg and F11 Ti-og-litt – both build / hide params.model since v5d (themeModel), so they count its food too)
const COUNTS = ['T-MENGDE', 'T-ORDEN'];                                   // strands whose tasks show countable things
// v5r2 (verify2: «Den spiser fisk!», then three empty baskets with number plaques): F19 at T-ORDEN 5–6 runs in numeral mode (plaques;
// at sup 0 the fairy's things) and never draws params.model – there it is no model format: no food, no food line, no theme credit
const drawsModel = it => !!it && MODEL_FMTS.includes(it.format) && !(it.format === 'F19' && +it.rung >= 5);
const modelServes = (f, s, rung) => drawsModel({ format: f, rung }) && fmtServes(f, s, rung);
const GROUP_STRANDS = { N: NUMS, W: WORDS, R: REAS };
const themeOf = sp => { try { return F.THEMES && F.THEMES.of ? F.THEMES.of(sp) : null; } catch (e) { return null; } };
// its food (countable models); v5r: an animal with no food model counts its home instead (F.THEMES.thingsFor: ugle / hakkespett → the
// tree it lives in, said at the intro «Den bor i et hull i et tre.») – never another place's things
const thingsOf = sp => { try { const t = themeOf(sp); if (!t) return []; const food = t.mat.filter(m => F.VOX.has(m)); return food.length ? food : (F.THEMES.thingsFor ? F.THEMES.thingsFor(sp) : []); } catch (e) { return []; } };
const activeStrands = () => { try { return F.LEARN && F.LEARN.active ? F.LEARN.active() : null; } catch (e) { return null; } };
const thinkOfItem = it => it ? (it.think || (() => { try { const r = F.LADDERS && F.LADDERS.rung && F.LADDERS.rung(it.strand, it.rung); return r ? r.think : null; } catch (e) { return null; } })() || it.strand) : null;
// due spaced-recall keys for this animal first, then any other due key (VIT V1–V2, ORD Or-T / Or-U)
function vitKeysFor(sp) {
  const V = F.VIT; if (!V || !V.isDue) return [];
  const t = themeOf(sp), own = [];
  if (t) {
    const kid = t.variant ? t.base : sp;
    own.push('VIT:mat:' + kid, 'VIT:hjem:' + kid, 'VIT:unge:' + kid);
    if (!t.variant) own.push('VIT:navn:' + kid);          // a glitter variant never asks «Hvor er kua?» beside its flowery cow
    if (t.mor) own.push('VIT:unge:' + t.mor);
    if (t.uttrykk) own.push('ORD:ux:' + t.uttrykk.id);
    (t.ord || []).forEach(w => own.push('ORD:ord:' + w));
  }
  const mine = own.filter(k => V.isDue(k));
  let other = []; try { other = [].concat(V.due(1, 'VIT'), V.due(2, 'VIT'), V.due(8, 'ORD'), V.due(9, 'ORD')).filter(k => !mine.includes(k) && !/^VIT:navn:/.test(k) || false); } catch (e) { other = []; }
  // (other animals' NAME questions stay out of a trial: «Hvor er kua?» beside a squirrel reads like a mistake; the general mix asks them)
  return mine.concat(other);
}
const PRODUCE = ['F07', 'F14', 'F15', 'F17', 'F33', 'F35', 'F36', 'F09', 'F11'];   // the answer is produced (keypad, tiles, building)
const nChips = it => (it && Array.isArray(it.choices) ? it.choices.length : 0);
const lowChip = it => { const c = nChips(it); return c > 0 && c <= 3; };
// v5r2: an item a guess often wins: ≤ 3 chips, or the engine's own guess chance 1/3 or more (a 2-basket order, g 0.5)
const guessy = it => lowChip(it) || (it && it.g != null && +it.g >= 0.33);
// does the engine know the v3 trial option (WP7)? then the at-level rule, stretch items and the production weight come from F.LEARN
function trialNative() {
  try { const L = F.LEARN; return !!(L && ((L.caps && L.caps.trial) || L.PRODUCE || /stretch/.test(String(L.next)))); } catch (e) { return false; }
}
function fmtServes(id, s, rung) {
  const d = (F.Task && F.Task.defs && F.Task.defs[id] && F.Task.defs[id].strands) ? F.Task.defs[id] : (F.LEARN && F.LEARN.FMT && F.LEARN.FMT[id]);
  if (!d || !d.strands || !d.strands[s]) return false;
  let rr = d.strands[s]; if (!Array.isArray(rr[0])) rr = [rr];
  if (!rr.some(([a, b]) => rung >= a && rung <= (b == null ? a : b))) return false;
  const rs = d.rungs;
  if (rs) { const list = Array.isArray(rs) ? (Object.keys(d.strands)[0] === s ? rs : null) : rs[s]; if (Array.isArray(list) && !list.includes(rung)) return false; }
  return true;
}
function trialPool() {
  const p = (F.LEARN && F.LEARN.portables) ? F.LEARN.portables().filter(f => !OFF_SKIN.has(f)) : [];
  return p.filter(f => F.Task && F.Task.resolveFormat && F.Task.resolveFormat(f));
}
// v5: N, R and W cycle (R only when the engine has a reasoning strand active; else NUM and WORD alternate as in v3); one V slot (a due
// recall) replaces the 2nd task when a taught fact / word is due – the 1st task never is one
function groupsFor(n, rng, sp, stretch) {
  const act = activeStrands(), hasR = !!(act && REAS.some(x => act.includes(x)));
  const cyc = hasR ? (rng() < 0.5 ? ['N', 'R', 'W'] : ['W', 'R', 'N']) : (rng() < 0.5 ? ['N', 'W'] : ['W', 'N']);
  const g = n === 2 ? ['N', hasR && rng() < 0.5 ? 'R' : 'W'] : Array.from({ length: n }, (_, i) => cyc[i % cyc.length]);   // Vennestjerne: a number task first
  if (sp && n >= 2 && vitKeysFor(sp).length) {
    if (n === 2) return ['N', 'V'];                                        // Vennestjerne: one number task + the friend's spaced question
    // never the 1st task, never a stretch slot, never the N slot (counting the animal's food stays in every trial)
    const at = []; for (let i = 1; i < n; i++) if (!(stretch || []).includes(i) && g[i] !== 'N') at.push(i);
    if (at.length) g[at[Math.floor(rng() * at.length)]] = 'V';
  }
  return g;
}
function newTrial(n, stretch, o) {
  o = o || {};
  return Object.assign({ n, stretch: stretch || [], groups: groupsFor(n, F.rand, o.sp, stretch), used: [], fmts: [], low: 0, items: [], pool: trialPool(), noWarmup: false,
    thinks: [], things: o.sp ? thingsOf(o.sp) : [], themeSaid: false }, o);
}
const nextItem = o => { try { return F.LEARN.next(o); } catch (e) { console.error('LEARN.next (Venneprøven)', e); return null; } };
const pickOne = a => a[Math.floor(F.rand() * a.length)];
// the trial's V slot: one due key (this animal's first) through the engine's forced path (Leitner + report stay the engine's)
// a recall key's strand / rung (VIT V1 names + babies, V2 food + homes; ORD 8 words, 9 expressions) and the think type it brings
const vitSR = key => ({ strand: key.startsWith('ORD:') ? 'ORD' : 'VIT', rung: /^VIT:(navn|unge):/.test(key) ? 1 : /^VIT:(mat|hjem):/.test(key) ? 2 : /^ORD:ord:/.test(key) ? 8 : 9 });
function thinkOfKey(key) {
  const { strand, rung } = vitSR(key); let r = null;
  try { r = F.LADDERS && F.LADDERS.rung ? F.LADDERS.rung(strand, rung) : null; } catch (e) { r = null; }
  return (r && r.think) || (strand === 'ORD' ? 'FORSTÅ' : 'HUSKE');
}
// v5c WP-A2: a Vennestjerne asks from F.VIT.starKeys (the friend's own askable keys, with the direction / exclusion that keeps the
// friend itself from being the answer); a Venneprøven from vitKeysFor – minus its own food once its food was shown in this trial
function vitRows(T, shown) {
  const t0 = themeOf(T.sp), mat0 = 'VIT:mat:' + (t0 && t0.variant ? t0.base : T.sp);
  return (T.star ? (T.starKeys || []) : vitKeysFor(T.sp).map(key => trialRow(key, T.sp)).filter(Boolean)).filter(r => !(T.vitTried || []).includes(r.key) && !(shown && r.key === mat0 && !T.star));
}
const shownSoFar = T => !!(T.themeSaid || T.items.some(i => i.themed));
// v5r2 (animals: «≥ 3 thinking types» missed when the recall was a WORD – ORD is FORSTÅ, not the assumed HUSKE): the types a V slot
// still to come may bring – its first row now, and its first row once the food was shown (this slot may show it)
function vThinks(T) {
  const rows = shownSoFar(T) ? [vitRows(T, true)[0]] : [vitRows(T, false)[0], vitRows(T, true)[0]];
  return new Set(rows.filter(Boolean).map(r => thinkOfKey(r.key)));
}
// avoid (v5r2): a Set of think types the recall must not bring (the trial's 3rd type depends on it) – those rows are skipped
function pickVitItem(T, k, avoid) {
  const V = F.VIT; if (!V || !F.Task.resolveFormat || !F.Task.resolveFormat('F82')) return null;
  const rows = vitRows(T, shownSoFar(T)).filter(r => !avoid || !avoid.has(thinkOfKey(r.key)));
  let L = null; try { L = F.LEARN.state; } catch (e) { L = null; }
  for (const row of rows.slice(0, 3)) {
    const key = row.key;
    (T.vitTried = T.vitTried || []).push(key);
    if (T.star && V.isDue && !V.isDue(key)) continue;
    const { strand, rung } = vitSR(key);
    const stS = L && L.strands && L.strands[strand], sup = stS ? Math.max(1, Math.min(2, stS.sup)) : 1;
    V.ctx = (row.sub || row.exclude) ? { sub: row.sub, exclude: row.exclude } : null;
    let it = null;
    try { it = nextItem({ formats: ['F82'], strands: [strand], rng: F.rand, now: Date.now(), place: 'dyr', sub: row.sub, force: { strand, rung, sup, key, kind: 'review', format: 'F82', exact: true } }); }
    finally { V.ctx = null; }
    if (it && it.key === key) { if (!stS || stS.rung !== rung) it.offLevel = true; if (T.star) it.starRecall = { own: row.own !== false, sub: row.sub || null }; return it; }
  }
  return null;
}
// v5c WP-A2: a Venneprøven recall never has the animal in front of her as its answer either: its baby / mother link is asked in the
// direction that names it (the calf's trial: «Hvem er mammaen til kalven?»), a word only through another animal that taught it (look-
// alikes count as the animal: genOrd excludes the family and its models)
function trialRow(key, sp) {
  const fam = F.VIT && F.VIT.family ? F.VIT.family(sp) : [sp];
  if (/^VIT:navn:/.test(key) && fam.includes(key.split(':')[2])) return null;      // «Hvor er kua?» in front of the cow: never
  if (/^VIT:unge:/.test(key)) {
    const m = key.split(':')[2], t = themeOf(m), baby = t && t.unge && t.unge.id;
    if (fam.includes(m)) return { key, sub: 'unge' };
    if (baby && fam.includes(baby)) return { key, sub: 'mor' };
    return { key };
  }
  if (/^ORD:ord:/.test(key)) return { key, exclude: fam };
  if (/^ORD:ux:/.test(key)) {                        // «Lur som en …?» beside a fox (or a star fox): not this animal's own expression
    const E = F.THEMES && F.THEMES.EXPR ? F.THEMES.EXPR.find(x => x.id === key.split(':')[2]) : null, mdl = id => (byId(id) || {}).model;
    const fm = new Set(fam.map(mdl).filter(Boolean));
    if (!E || E.svar.some(x => fam.includes(x) || fm.has(mdl(x)))) return null;
  }
  return { key };
}
/* v5c WP-A2 (DESIGN5 §9): the Vennestjerne's play task is the friend's OWN world, a different kind of thinking each visit (the last 4
   kinds are remembered per friend): count / order its food (model formats, «Den spiser nøtter!»), a pattern with its things (MØNSTER),
   a listening story about it (LES-F F78, F.LESF.about), sums / a balance / a little problem with its food (REGN LIKHET PROBLEM), sorting
   and odd-one-out with it among animals (LOGIKK ORD DATA FORM). A kind counts only when the engine really themed the item (item.themed /
   params.themed, a story key about it, or a model format counting its food); else the next kind; else a plain at-level task. */
const STAR_KINDS = [
  { id: 'mat', strands: ['T-MENGDE', 'T-ORDEN'] },
  { id: 'monster', strands: ['MØNSTER'] },
  { id: 'historie', strands: ['LES-F'] },
  { id: 'regn', strands: ['REGN', 'LIKHET', 'PROBLEM'] },
  { id: 'sortere', strands: ['LOGIKK', 'ORD', 'DATA', 'FORM'] },
];
B.STAR_KINDS = STAR_KINDS;
function storyKeys(sp) {
  try {
    if (!F.LESF || !F.LESF.about) return [];
    const t = themeOf(sp); const ids = [sp, t && t.base, t && t.model].filter(Boolean);
    for (const x of ids) { const ks = F.LESF.about(x); if (ks && ks.length) return ks.slice(); }
  } catch (e) { /* format missing */ }
  return [];
}
function shuffled(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(F.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickStarTask(T, k) {
  const act = activeStrands() || NUMS.concat(WORDS), fr = save().friends[T.sp] || {}, recent = Array.isArray(fr.kinds) ? fr.kinds : [];
  const kinds = shuffled(STAR_KINDS.filter(K => K.strands.some(x => act.includes(x)))).sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
  const trial = { atLevel: true, stretch: false, allowWarmup: false, preferFormats: PRODUCE.slice() };
  const base = { formats: T.pool, place: 'dyr', rng: F.rand, now: Date.now(), avoid: T.fmts.slice(), trial, theme: T.sp, nChoices: 4 };
  let L0 = null; try { L0 = F.LEARN.state; } catch (e) { L0 = null; }
  const rungOf = x => (L0 && L0.strands && L0.strands[x] ? L0.strands[x].rung : 1);
  T.kindTried = [];
  for (const K of kinds) {
    T.kindTried.push(K.id);
    const strands = K.strands.filter(x => act.includes(x));
    if (K.id === 'mat') {
      // its food, counted / ordered in a model format at her rung (the v5 counting theme)
      if (!T.things || !T.things.length) continue;
      const cnt = strands.filter(x => MODEL_FMTS.some(f => T.pool.includes(f) && modelServes(f, x, rungOf(x))));
      if (!cnt.length) continue;
      // v5r2 (animals minor): never a ≤ 3-chip item as the star's play task (a 2-basket F19 is a coin flip, g 0.5 – guessing must not
      // pay): one more draw (theme() picks the model format afresh), else the next kind
      for (let tries = 0; tries < 2; tries++) {
        const r = nextItem(Object.assign({}, base, { strands: cnt }));
        const it = r ? theme(T, r, base) : null;
        if (it && drawsModel(it) && it.themed && !guessy(it)) { it.starKind = K.id; return it; }
      }
      continue;
    }
    const story = K.id === 'historie' ? storyKeys(T.sp) : [];
    if (K.id === 'historie' && !story.length) continue;
    for (let tries = 0; tries < 2; tries++) {
      const r = nextItem(Object.assign({}, base, { strands, prefer: story.length ? story : undefined }));
      if (!r) break;
      const themed = engThemed(r) || (story.length && story.includes(r.key));      // (v5r2: a surface its format never shows is no theme)
      if (themed && !lowChip(r)) { realTheme(r); r.starKind = K.id; if (!r.themed) r.themed = K.id; return r; }
    }
  }
  T.groups[k] = 'N';                        // nothing could be themed: a plain at-level task (the recall still decides the star)
  T.low = Math.max(T.low, 1);               // v5r2: refine() then swaps a ≤ 3-chip item away where it can (krabbe got a 2-chip F18, g 0.5)
  let it = pickTrialItem(T, k);
  // v5r2 (verify2: a mid learner at T-ORDEN 4 still got a 2-basket F19 as the play task in 72 of 216 visits – refine() finds no other
  // format there): a guessy play task is asked again without its format and its strand (twice); the least guessy item wins
  const gOf = r => (r.g != null ? +r.g : nChips(r) ? 1 / nChips(r) : 0);
  const pool0 = T.pool, used0 = T.used.slice();
  try {
    let last = it;
    for (let i = 0; i < 2 && last && guessy(it); i++) {
      T.pool = T.pool.filter(f => f !== last.format); T.used.push(last.strand);
      last = T.pool.length ? pickTrialItem(T, k) : null;
      if (last && gOf(last) < gOf(it)) it = last;
    }
  } finally { T.pool = pool0; T.used = used0; }
  return it;
}
function pickTrialItem(T, k) {
  if (!F.LEARN || !F.LEARN.next || !T.pool.length) return null;
  if (T.groups[k] === 'V') {
    // v5r2: when the slots left can only just reach 3 types, the recall must bring a new one (a Venneprøven; a Vennestjerne's recall
    // decides the star and is never swapped for variety)
    const d0 = new Set(T.thinks.filter(Boolean)), laterV = T.groups.slice(k + 1).filter(g => g === 'V').length;
    const mustNew = !T.star && T.n >= 3 && Math.min(3, T.n) - d0.size >= T.n - k - laterV;
    const v = pickVitItem(T, k, mustNew ? d0 : null); if (v) return v;
    T.groups[k] = T.star ? 'T' : T.groups.includes('R') || (activeStrands() || []).some(x => REAS.includes(x)) ? 'R' : 'W';
  }
  if (T.groups[k] === 'T') return pickStarTask(T, k);
  const act = activeStrands();
  const all0 = GROUP_STRANDS[T.groups[k]] || NUMS;
  const all = act ? (all0.filter(x => act.includes(x)).length ? all0.filter(x => act.includes(x)) : (T.groups[k] === 'W' ? ['LES', 'SKRIV'] : ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN'])) : all0;
  let left = all.filter(s => !T.used.includes(s)); if (!left.length) left = all.slice();
  // the animal's world (DESIGN5 §2.2): the first N task of a trial counts its food when a model format serves her rung (≈ 2 of 3 trials)
  if (T.groups[k] === 'N' && T.things && T.things.length && !T.themeSaid && F.rand() < 0.67) {
    let L0 = null; try { L0 = F.LEARN.state; } catch (e) { L0 = null; }
    const rungOf = x => (L0 && L0.strands && L0.strands[x] ? L0.strands[x].rung : 1);
    const cnt = left.filter(x => COUNTS.includes(x) && MODEL_FMTS.some(f => T.pool.includes(f) && modelServes(f, x, rungOf(x))));
    if (cnt.length) left = cnt.concat(left.filter(x => !cnt.includes(x)));
    if (cnt.length) T.countFirst = cnt;
  }
  // ≥ 3 thinking types per trial: when the slots left can only just reach 3, the next item must bring a new type
  // (lead 11.10.: a V slot still to come brings its own type – count it as had, so an N slot never spends the trial's variety on it:
  //  ekorn got F03 HUSKE · F58 · F82 HUSKE = 2 types. v5r2: the V slot's REAL type – VIT facts HUSKE, ORD words FORSTÅ (vThinks); when
  //  it is not sure yet (its food may be shown first), this item avoids both and the V counts only when neither is had already)
  const futureV = T.groups.slice(k + 1).filter(g => g === 'V').length;
  const distinct = new Set(T.thinks.filter(Boolean)), avoid = new Set(distinct);
  if (futureV) { const vt = [...vThinks(T)]; vt.forEach(x => avoid.add(x)); if (vt.length && vt.every(x => !distinct.has(x))) distinct.add(vt[0]); }
  const needNew = Math.min(3, T.n) - distinct.size >= T.n - k - futureV;
  const trial = { atLevel: true, stretch: T.stretch.includes(k), allowWarmup: k === 0 && !T.noWarmup, preferFormats: PRODUCE.slice() };
  const last = ((F.Task.recent || []).slice(-1)[0] || {}).format;
  // themes (DESIGN5 §2.2): the engine prefers the animal's food words for LES / SKRIV
  // (v5r: its things' words – food, else its home – and its baby's word: «kalv» beside the cow)
  const prefer = [], t0 = themeOf(T.sp), babyW = t0 && t0.unge && t0.unge.word ? [String(t0.unge.word)] : [];
  thingWords(T).concat(babyW).forEach(w => prefer.push('LES:' + w, 'SKRIV:' + w));
  storyKeys(T.sp).forEach(x => prefer.push(x));            // v5c: a LES-F story is one about this animal (F.LESF.about)
  // nChoices: ask the bank for ≥ 4 choices once a ≤ 3-chip item was in this trial (honoured when the engine forwards it – WP7)
  // theme: the engine's generators count / pattern / sort with the animal's world (WP-E2; place 'dyr' also finds it via B.current())
  const base = { formats: T.pool, place: 'dyr', rng: F.rand, now: Date.now(), avoid: T.fmts.slice(), last, trial, nChoices: T.low >= 1 ? 4 : undefined, prefer: prefer.length ? prefer : undefined, theme: T.sp || undefined };
  const newType = it => !needNew || !avoid.has(thinkOfItem(it));
  // v5r (logic: animal meetings were mostly not about the animal): in the R and W slots an item from the animal's world (its things in a
  // pattern / balance / story, sorted or odd-one-out with it, its food or baby word read or written, a story about it, its food counted)
  // wins over an unthemed one – up to 3 of the group's unused strands are asked; the N slot keeps its counting-first rule above
  const canCount = r => !!(T.things && T.things.length && (drawsModel(r) || (COUNTS.includes(r.strand) && MODEL_FMTS.some(f => T.pool.includes(f) && modelServes(f, r.strand, r.rung)))));
  const themedR = r => !!(r && (engThemed(r) || (r.key && prefer.includes(r.key)) || canCount(r)));
  const wantTheme = !!T.sp && (T.groups[k] === 'R' || T.groups[k] === 'W');
  let it = null;
  // counting first: ask the counting strands alone once (the engine would otherwise spread the weight over the whole group)
  if (T.countFirst && T.groups[k] === 'N') {
    const r = nextItem(Object.assign({}, base, { strands: T.countFirst.slice() }));
    T.countFirst = null;
    if (r && newType(r)) it = r;
  }
  // (v5r2, animals: only 15–24 % of meeting tasks were about the animal – the themed search asks EVERY unused strand of the group, each
  //  up to twice (a pattern / sort / story generator themes only part of its items); the engine's next() is pure, so the extra asks
  //  cost nothing but time, and every answer is still an at-level item of the group)
  for (const st of [left, all]) {
    if (it && newType(it) && (!wantTheme || themedR(it) || st === all)) break;     // (the used strands are never re-asked for a theme)
    const pool = st.slice(), asked = {};
    const maxTries = wantTheme && st !== all ? 2 * st.length : 3;
    for (let tries = 0; tries < maxTries && pool.length; tries++) {
      const r = nextItem(Object.assign({}, base, { strands: pool }));
      if (!r) break;
      if (!it) it = r;
      if (newType(r)) {
        if (!newType(it) || (themedR(r) && !themedR(it))) it = r;
        if (!wantTheme || themedR(r)) break;
      }
      // that strand only brings a type the trial has, or (asked twice) no theme: ask another
      if (!newType(r) || !wantTheme || (asked[r.strand] = (asked[r.strand] || 0) + 1) >= 2) { const i = pool.indexOf(r.strand); if (i >= 0) pool.splice(i, 1); else break; }
    }
  }
  if (it && !newType(it)) {                                 // the group cannot bring a new type: any active strand that can
    const others = (act || NUMS.concat(WORDS)).filter(x => !all.includes(x) && x !== 'VIT');
    const r = others.length ? nextItem(Object.assign({}, base, { strands: others })) : null;
    if (r && newType(r)) it = r;
  }
  if (!it) it = nextItem(Object.assign({}, base, { strands: all, trial: undefined }));     // the restricted call found nothing: unrestricted
  if (!it) it = nextItem(Object.assign({}, base, { trial: undefined }));                   // last resort: any strand
  return it ? meetSkin(moneyless(T, realTheme(theme(T, refine(T, k, it, base), base)), base, all, newType)) : null;
}
/* v5r2 (animals: «Hvor mange kroner er det?» / «Betal med færrest mulig mynter.» beside a rabbit): F43 Bunter og plater in a meeting
   counts / builds wood bundles or crystal rods (params.surface – its generator honours it for T-MENGDE 11–14), never coins. Its money
   items (T-MENGDE 15: coins / paying; T-SKRIV 9: kroner every other time) are re-asked from the group's other strands without F43
   (T-MENGDE is the only one F43 serves there – leaving F43 out entirely made the engine fall back to a far-below item, F11 at M8).
   ok: the trial's «brings a new thinking type» test – the replacement must pass it too (else the money task stays: a rare, valid
   at-level item beats a trial with 2 kinds of thinking). */
function moneyless(T, it, base, all, ok) {
  if (!it || it.format !== 'F43') return it;
  if (it.strand === 'T-MENGDE' && +it.rung <= 14) { it.params = Object.assign({}, it.params || {}, { surface: F.rand() < 0.5 ? 'ved' : 'krystall' }); return it; }
  const pool = T.pool.filter(f => f !== 'F43');
  let cand = (it.strand === 'T-SKRIV' ? ['T-SKRIV'] : []).concat((all || []).filter(x => x !== it.strand && x !== 'T-MENGDE'));
  for (let i = 0; i < 4 && cand.length; i++) {
    const r = nextItem(Object.assign({}, base, { formats: pool, strands: cand }));
    if (!r || r.format === 'F43') break;
    if (!ok || ok(r)) return realTheme(theme(T, r, base));
    cand = cand.filter(x => x !== r.strand);
  }
  return it;
}
// v5r2 (verify2: «Bakeren har bakt kaker i mange former.» over a bakery stall beside a squirrel): F65 Figurjakten in a meeting hunts
// the shapes in the castle wall (params.surface 'slott', its generator's usual skin), never at the market stall
function meetSkin(it) {
  if (it && it.format === 'F65' && it.params && it.params.surface === 'marked') it.params = Object.assign({}, it.params, { surface: 'slott' });
  return it;
}
// counting the animal's own things: a counting strand goes to a model format (params.model = its food); another format is kept
// only when no model format serves her rung (then no generic «apples» theme line is said)
function theme(T, it, base) {
  if (!it || !T.things || !T.things.length) return it;
  const s = it.strand, mdl = T.things[Math.floor(F.rand() * T.things.length)];
  const can = f => T.pool.includes(f) && modelServes(f, s, it.rung);
  if (COUNTS.includes(s) && !drawsModel(it)) {
    const fm = MODEL_FMTS.filter(can);
    if (fm.length) {
      const r = nextItem(Object.assign({}, base, { strands: [s], force: { strand: s, rung: it.rung, sup: it.sup, kind: it.kind === 'stretch' ? 'stretch' : 'normal', format: pickOne(fm) } }));
      // (v5r2, verify2: refine() swapped a 2-basket F19 away and this put it back – 72 of 216 mid star plays were a coin flip): once a
      //  trial had its ≤ 3-chip item, or for the star's play task, a guessy model item never replaces one a guess does not win
      const keep = (T.star || T.low >= 1) && r && guessy(r) && !guessy(it);
      if (r && r.strand === s && !keep) { if (it.golden) r.golden = true; it = r; }
    }
  }
  // (v5r: a home model – the owl's tree – is themed but no food: no «Den spiser …» / «Her er maten til dyret!» line for it)
  const t = themeOf(T.sp), food = !!(t && t.mat.includes(mdl));
  if (drawsModel(it)) { it.params = Object.assign({}, it.params || {}, { model: mdl }); it.themed = mdl; if (food) it.foodModel = mdl; }
  return it;
}
// v5r: the words of the animal's own things (its food, else its home model) – the LES / SKRIV keys an encounter prefers
const thingWords = T => (T.things || []).map(m => String(m).replace(/^[ngp]_/, ''));
const wordOfItem = it => String((it && (it.word || (it.key && it.key.slice(it.key.lastIndexOf(':') + 1)))) || '').toLowerCase();
// F33 in an encounter: 'picture' (the animal wishes for it) only when the word is one of its own things, else 'dict' (Puff dictates)
function f33Kind(T, it) { return thingWords(T).includes(wordOfItem(it)) ? 'picture' : 'dict'; }
function refine(T, k, it, base) {
  const native = trialNative(), s = it.strand, at = it.at || { rung: it.rung, sup: it.sup };
  const serving = (rung, excl) => T.pool.filter(f => fmtServes(f, s, rung) && !(excl || []).includes(f));
  const forced = (rung, sup, kind, fmts) => {
    if (!fmts.length) return null;
    const fresh = fmts.filter(x => !T.fmts.includes(x));
    const r = nextItem(Object.assign({}, base, { strands: [s], force: { strand: s, rung, sup, kind, format: pickOne(fresh.length ? fresh : fmts) } }));
    return r && r.strand === s ? r : null;
  };
  const KEEP = { placement: 1, provcheck: 1, contrast: 1, challenge: 1, stretch: 1 };
  const safety = it.kind === 'safe' && (it.why === 'wall' || it.why === 'afterC');
  // a) at her level: no warm-up after the first task, no routine easier item (safe / lower-rung review or øvebank)
  if (!native && it.rung < at.rung && !KEEP[it.kind] && !safety && !it.rungReview && !(it.kind === 'warmup' && k === 0 && !T.noWarmup)) {
    const r = forced(at.rung, at.sup, 'normal', serving(at.rung)); if (r) it = r;
  }
  const plain = it.kind === 'normal' || it.kind === 'placement';
  // b) production first (the engine weights preferFormats itself when it knows the trial option)
  if (!native && plain && nChips(it) > 0 && F.rand() < 0.5) {
    const r = forced(it.rung, it.sup, it.kind, serving(it.rung).filter(f => PRODUCE.includes(f))); if (r) it = r;
  }
  // c) at most one item with ≤ 3 chips per trial (guessing must not pay): another format for the same strand/rung/sup; else, when this
  //    strand was already practised in this trial, another strand of the same group. The first LES / T-NAVN item of a trial stays even
  //    with 3 chips (their formats are choice by nature: 3 choices at every sup until the bank honours nChoices – measured: swapping
  //    them away starved reading to 11 % of trial tasks)
  if (plain && T.low >= 1 && lowChip(it)) {
    const cands = serving(it.rung, [it.format]);
    for (let i = 0; i < 3 && cands.length; i++) {
      const f = cands.splice(Math.floor(F.rand() * cands.length), 1)[0];
      const r = nextItem(Object.assign({}, base, { strands: [s], force: { strand: s, rung: it.rung, sup: it.sup, kind: it.kind, format: f } }));
      if (r && r.strand === s && !lowChip(r)) { it = r; break; }
    }
  }
  if (T.low >= 1 && lowChip(it) && T.used.includes(s) && (plain || it.kind === 'stretch' || it.kind === 'warmup' || ((it.kind === 'review' || it.kind === 'ovebank') && !it.rungReview))) {
    // the group's other strands, those with a production format at her rung first (T-SKRIV → F14/F15/F17, SKRIV → F33/F35/F36)
    let L = null; try { L = F.LEARN.state; } catch (e) { L = null; }
    const rungOf = x => (L && L.strands && L.strands[x] ? L.strands[x].rung : 1);
    const prod = x => T.pool.some(f => PRODUCE.includes(f) && (fmtServes(f, x, rungOf(x)) || (it.kind === 'stretch' && fmtServes(f, x, rungOf(x) + 1))));
    const act = activeStrands();
    const others = (GROUP_STRANDS[T.groups[k]] || NUMS).filter(x => x !== s && (!act || act.includes(x))).sort((a, b) => (prod(b) ? 1 : 0) - (prod(a) ? 1 : 0));
    for (const x of others.slice(0, 3)) {
      const r = nextItem(Object.assign({}, base, { strands: [x] }));
      if (r && !lowChip(r) && !(r.rung < (r.at || r).rung && !KEEP[r.kind] && !(r.kind === 'safe' && (r.why === 'wall' || r.why === 'afterC')))) { it = r; break; }
    }
  }
  return it;
}
// one trial task. null = quiet end (a task already runs, the stage was aborted)
async function trialTask(rec, T, k) {
  if (B._sim) {                                       // tests: simulated outcomes, no task UI ([] = offer → null; a short pattern goes on with A)
    await F.T.sleep(400);
    const o = B._sim.length ? (B._sim[k] || 'A') : null; if (o) T.items.push({ k, group: T.groups[k], sim: true, outcome: o }); return o ? { outcome: o, sim: true } : null;
  }
  if (F.Task.current) return null;
  const ctx = { thing: proxyOf(rec), place: 'dyr', npcRole: 'dyr', portable: true, bundle: enc && enc.bundle, coins: TASK_COINS, trial: { k, n: T.n, sp: enc && enc.sp } };
  // natural audit D1 #41: a task she left last time (Task.abort) comes back at the same place – leaving never fishes for an easier one
  const back = !T.star && T.sp && resumeAt[T.sp] && resumeAt[T.sp][k];
  if (back) { delete resumeAt[T.sp][k]; if (back.group) T.groups[k] = back.group; }
  const it = back ? back.it : pickTrialItem(T, k);
  if (!it) return F.Task.offer({ formats: T.pool.length ? T.pool : undefined, ctx });     // no engine: today's call
  T.used.push(it.strand); T.fmts.push(it.format); if (lowChip(it)) T.low++;
  T.thinks.push(thinkOfItem(it));
  const info = { k, group: T.groups[k], strand: it.strand, format: it.format, kind: it.kind, rung: it.rung, sup: it.sup, at: it.at || null,
    golden: !!it.golden, off: !!it.offLevel, nch: nChips(it), key: it.key || null, why: it.why || null, stretchSlot: T.stretch.includes(k),
    think: thinkOfItem(it), themed: it.themed || null, starKind: it.starKind || null, recall: it.starRecall || null,
    vkind: it.format === 'F82' && it.params ? it.params.kind || null : null,
    vanswer: it.format === 'F82' && it.params && it.params.models ? (it.params.models[it.params.answer] || {}).word || null : null };
  T.items.push(info);
  if (back) info.resumed = true;
  if (enc && enc.meter && info.stretchSlot) enc.meter.pipStretch(k, info.golden);     // the star ring only when a stretch item was served
  // the animal's world: the first task with its food says so (deictic – the animal's name is never said before Navnelappen)
  ctx.theme = { sp: T.sp || null, things: (T.things || []).slice(), model: it.foodModel || null };
  // the food line only where the task really shows its food: a model format counting it (bf), the balance / theatre with its food, a
  // bead pattern of it (v5r2: shownFood – never before a story about the animal itself)
  const food = shownFood(T, it);
  // parent 11.10.: no narrated food fact before the task – the nuts are simply there to count (F.OBJ.animalTalk brings the line back)
  if (food && !T.themeSaid && F.OBJ && F.OBJ.animalTalk) {
    T.themeSaid = true;
    // «Den spiser nøtter!» – a true food line for THIS animal (a teaching exposure of its food fact, within the daily cap)
    // (v5r2: no generic «Her er maten til dyret!» any more – a food the animal has no line for stays unnamed)
    const id = foodLine(T.sp, food);
    if (id && F.TPL.has(id)) {
      await F.SAY(id);
      try { const t = themeOf(T.sp), kid = t && t.variant ? t.base : T.sp, k = 'VIT:mat:' + kid; if (F.VIT && t && t.spiser && (F.VIT.known(k) || F.VIT.canNew('f'))) F.VIT.expose(k, T.sp); } catch (e) { /* knowledge state */ }
    }
  }
  // v5r (logic: animal meetings): F33 never makes the animal wish for someone else's thing («Kan du trylle denne?» → pizza beside an
  // owl) or voice a person's need («Jeg kjeder meg!»): a wish only for its OWN things, else Puff dictates the word
  if (it.format === 'F33') ctx.kind = f33Kind(T, it);
  const res = await F.Task.run(it, ctx);
  if (res && res.aborted && !T.star && T.sp) (resumeAt[T.sp] = resumeAt[T.sp] || {})[k] = { it, group: info.group };
  if (!res || res.aborted || !res.outcome) return null;
  info.outcome = res.outcome;
  return res;
}
// after a task she flutters back to her spot beside the animal (the stage put her 3–8 m away): the meter, the animal and her fairy stay
// one picture for the whole trial, and the next stage is built from there
function backHome() {
  const P = F.Player, h = enc && enc.home; if (!h) return Promise.resolve();
  const d = Math.hypot(P.pos.x - h.x, P.pos.z - h.z); if (d < 0.6) return Promise.resolve();
  const x0 = P.pos.x, z0 = P.pos.z;
  P.heading = Math.atan2(h.x - x0, h.z - z0);
  return F.T.tween(Math.min(800, 260 + d * 70), k => { const e = U.smooth(k); P.pos.x = x0 + (h.x - x0) * e; P.pos.z = z0 + (h.z - z0) * e; })
    .then(() => { if (enc) { const a = recPos(enc.rec); P.heading = Math.atan2(a.x - P.pos.x, a.z - P.pos.z); } });
}
// camera: closer, framing her and the animal together (stays in 'out' mode; tasks set their own focus and restore it)
// v5 WP-A (playtest camera root cause 1): the release branch ALWAYS runs, whatever cam.mode is (Staven / the map / the home button may
// have switched it during the encounter) – the encounter drops the focus it set itself (by identity), or any focus when no task holds one.
function frame(rec, on) {
  const cam = F.R.cam; if (!enc) return;
  if (on) {
    if (cam.mode !== 'out') return;
    if (enc.dist0 == null) { enc.dist0 = cam.distGoal; enc.pitch0 = cam.pitchGoal; enc.yaw0 = cam.yawGoal; }
    const a = recPos(rec), P = F.Player.pos;
    cam.focus = enc.focus = focusOf(a, P);
    const v = enc.plan && enc.plan.view;
    if (v) { cam.distGoal = v.dist; cam.pitchGoal = v.pitch; cam.yawGoal = v.yaw; }
    else cam.distGoal = Math.min(enc.dist0, 15);
  } else {
    if (cam.focus && (cam.focus === enc.focus || !(F.Task && F.Task.current))) cam.focus = null;
    enc.focus = null;
    if (enc.dist0 != null) { if (cam.mode === 'out') cam.distGoal = enc.dist0; cam.pitchGoal = enc.pitch0; cam.yawGoal = enc.yaw0; }
  }
}
function cleanup() {
  if (!enc) return;
  if (enc.meter) enc.meter.remove();
  try { frame(enc.rec, false); } catch (e) { console.error('befriend frame release', e); try { if (F.R.cam.focus === enc.focus) F.R.cam.focus = null; } catch (e2) {} }
  enc = null;
}
// events around every encounter (DESIGN3 §3): befriendStart / befriendEnd + the WP6 pacing signal activity('befriend')
function begin(e) {
  F.emit('befriendStart', { sp: e.sp, tier: e.tier, n: e.n, kind: e.kind });
  F.emit('activity', 'befriend', true);
}
function finish(sp, kind, n, r) {
  r = r || {};
  // 1st argument: the §3 payload; 2nd: the raw result (v2 listeners read (sp, res) → res.won still works)
  F.emit('befriendEnd', { sp, kind, n, won: !!r.won, tasks: (r.outcomes || []).length, outcomes: (r.outcomes || []).slice(), H: r.H || 0, quiet: !!r.quiet, result: r }, r);
  F.emit('activity', 'befriend', false);
}
let breakSaidT = -1e9;
function sayBreak(rec) {           // «Dyra leker nå …» at most once per 30 s (a hop otherwise)
  if (F.T.now - breakSaidT >= 30) { breakSaidT = F.T.now; F.SAYF('bf_break'); } else react(rec, 'happy');
}
const anchorFor = (rec, hgt) => () => { const q = recPos(rec); return new V3(q.x, F.Space.heightAt(q.x, q.z) + Math.max(0.9, Math.min(4, hgt)) + 0.35, q.z); };
// hearts fly in from where she answered; a first-try answer: sparkle, hop closer; B: a few hearts; C: a curious head tilt (no words)
async function payOut(rec, s, M, o, hgt, cap) {
  let from = enc.stageAt ? toScreen(enc.stageAt) : null;
  if (!from || !from.on) from = { x: innerWidth / 2, y: innerHeight * 0.62 };
  from = { x: U.clamp(from.x, 40, innerWidth - 40), y: U.clamp(from.y, 120, innerHeight - 60) };
  const gain = M.pipsOnly ? 0 : (GAIN[o] ? GAIN[o][s.tier] : 0);
  const q = recPos(rec), top = new V3(q.x, F.Space.heightAt(q.x, q.z) + Math.max(0.9, Math.min(4, hgt)), q.z);
  if (o === 'A') { F.sfx.sparkle(); react(rec, 'happy'); hopCloser(rec, s); }
  else if (o === 'B') react(rec, 'happy');
  else {
    react(rec, 'tilt');
    try { UI.bubbleAt(top.clone().setY(top.y + 0.2), '?', 1600); } catch (e) { /* decor */ }
    M.el.classList.remove('shake'); void M.el.offsetWidth; M.el.classList.add('shake');
  }
  try { if (o !== 'C') F.FX.burst(top, { kind: 'heart', n: o === 'A' ? 14 : 6, up: 2, speed: 0.9 }); } catch (e) { /* decor */ }
  if (gain > 0) await M.fly(gain, from, cap); else await F.T.sleep(o === 'C' ? 700 : 400);
  enc.stageAt = null;
}
const heightOf = rec => { try { const a = recPos(rec), o = rec.obj || (rec.proxy && rec.proxy.obj); if (o) { const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) return bb.max.y - F.Space.heightAt(a.x, a.z); } } catch (e) {} return 1.3; };
const gidOf = rec => (rec.gid != null ? rec.gid : rec.id != null ? rec.id : 'x' + (++fakeN));
async function start(rec) {
  const none = why => ({ won: false, H: 0, p: 0, outcomes: [], [why]: true });
  const spId = rec && (typeof rec.sp === 'string' ? rec.sp : rec.sp && rec.sp.id);   // WP4 records carry the species row
  if (!spId) return none('bad');
  const s = byId(spId);
  if (!s) { console.warn('Befriend.start: unknown species', spId); return none('unknown'); }
  if (enc || (F.Task && F.Task.current) || (F.UI.isOpen && F.UI.isOpen())) return none('busy');
  if (isFriend(s.id)) { react(rec, 'happy'); F.SAYF('bf_already'); return Object.assign(none('already'), { won: true }); }
  if (F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask()) { sayBreak(rec); fauna('release', rec, { mode: 'later' }); return none('breakTime'); }
  if (cooling(s.id)) { F.SAY('bf_fail'); react(rec, 'happy'); fauna('release', rec, { mode: 'later' }); return none('cooldown'); }
  const A = save();
  const tier = s.tier, TR = TRIAL[tier], n = TR.n, carry = Math.min(CARRY_MAX[tier], carryOf(s.id));
  enc = { rec, sp: s.id, tier, n, kind: 'trial', bundle: 'bf:' + gidOf(rec), meter: null, outcomes: [], stageAt: null, trial: newTrial(n, TR.stretch, { sp: s.id }) };
  B.lastTrial = enc.trial.items;
  begin(enc);
  let result = null;
  try {
    fauna('focus', rec);                                     // it stops and waits, curious, while she comes (a still target to frame)
    await approach(rec, s);
    F.Player.frozen = true; F.Player.stop();                 // she stays with the animal for the whole encounter (no stray taps)
    enc.home = { x: F.Player.pos.x, z: F.Player.pos.z };
    frame(rec, true);
    const hgt = heightOf(rec);
    const M = enc.meter = Meter(anchorFor(rec, hgt), tier, s.id, { n, stretch: TR.stretch });
    // intro (never the animal's name: it may be a reading target): the tier line; the rule only at her very first encounter.
    // (natural audit D1 #4 / #57: no quiz-show «Dyret har {n} oppgaver til deg!» – the paws on the meter show how many)
    if (tier === 4) { await F.SAY('bf_legend'); if (F.TPL.has('bf_lg_' + s.id)) await F.SAY('bf_lg_' + s.id); }
    else if (tier === 3) await F.SAY('bf_glitter');
    else if (tier === 2) await F.SAY('bf_rare');
    // v5 WP-A: the animal's world – where it lives, said deictically («Den bor i en bikube.»; never its name before Navnelappen)
    try {
      const t = themeOf(s.id), hid = 'bf_bor_' + (t && t.variant ? t.base : s.id);
      if (t && t.hjemF && F.TPL.has(hid) && F.OBJ && F.OBJ.animalTalk) {      // parent 11.10.: no narrated fact at every trial
        await F.SAY(hid);
        const kid = t.variant ? t.base : s.id, key = 'VIT:hjem:' + kid;
        if (F.VIT && (F.VIT.known(key) || F.VIT.canNew('f'))) F.VIT.expose(key, s.id);
      }
    } catch (e) { console.warn('bf home line', e); }
    if (A.intro < 1) await F.SAY('bf_intro');
    A.intro++; F.store();
    // carry hearts («Den husker deg») light first, in their own colour
    if (carry > 0) { const p2 = F.SAY('bf_retry'); await M.light(carry, 'carry'); await p2; }
    // a turned view must have settled before a task stage is built (stage.js reads the current yaw)
    for (let t = 0; t < 2 && Math.abs(F.R.cam.yaw - F.R.cam.yawGoal) > 0.02; t += 0.1) await F.T.sleep(100);
    // the tasks (a non-A never ends the trial early: every task is practice)
    // (no line between tasks: the pips, the flying hearts and the animal hopping one step closer tell the story)
    for (let k = 0; k < n; k++) {
      M.pip(k, 'cur');
      await M.dock(true);
      const r = await trialTask(rec, enc.trial, k);
      F.Player.frozen = true; frame(rec, true);
      if (!r || !r.outcome) {                       // a task already running, or she left it (Task.abort): quiet end – no catch, no
        await M.dock(false);                        // coins, no line; the carry stays and the item waits for her (resumeAt)
        react(rec, 'later');
        fauna('release', rec, { mode: 'later' });
        result = { won: false, H: 0, p: 0, outcomes: enc.outcomes.slice(), quiet: true, carry, items: enc.trial.items.slice() };
        return result;
      }
      const o = r.outcome; enc.outcomes.push(o); M.pip(k, o);
      const back = backHome();
      await payOut(rec, s, M, o, hgt, enc.outcomes.every(x => x === 'A') ? SLOTS : CAP_ERR);
      await back; frame(rec, true);
    }
    // the decision: exact formula; the meter already shows H (capped flights), all-A fills the rest
    const c = chance(tier, enc.outcomes, carry);
    await M.dock(false);
    let won, roll = null;
    if (c.allA) {
      await M.light(SLOTS - M.lit);
      M.glowAll(); F.sfx.levelup();
      await Promise.all([F.SAY('bf_all'), F.T.sleep(1400)]);
      won = true;
    } else if (c.H <= 0) {
      won = false;                                  // no hearts: no wheel, a quiet «not now» (the carry grows)
    } else {
      if (M.lit < c.H) await M.light(c.H - M.lit);    // safety: the meter must show exactly H before the wheel
      roll = B._roll != null ? Math.max(0, Math.min(SLOTS - 1, B._roll | 0)) : Math.floor(Math.random() * SLOTS);
      // the wheel is explained once, the first time she meets it (natural audit D1: no «{n} hjerter!» – the meter shows them)
      if (A.wheels < 1) { await F.SAY('bf_wheel'); await F.SAY('bf_gold'); }
      A.wheels++; F.store();
      won = await wheel(M, c.H, roll, s.id);
    }
    result = { won, H: c.H, p: c.p, outcomes: enc.outcomes.slice(), roll, allA: c.allA, carry: c.carry, bonus: c.carry, earned: c.earned,
      noWheel: !c.allA && c.H <= 0, items: enc.trial.items.slice() };
    if (won) await win(rec, s, M); else await notNow(rec, s, c);
    if (won) result.named = (save().friends[s.id] || {}).named || null;
    return result;
  } catch (e) {
    console.error('Befriend.start failed', e);
    result = result || { won: false, H: 0, p: 0, outcomes: enc ? enc.outcomes.slice() : [], error: String(e) };
    return result;
  } finally {
    const sp = s.id;
    cleanup();
    if (!(F.Task && F.Task.current) && !(F.UI.isOpen && F.UI.isOpen())) F.Player.frozen = false;
    finish(sp, 'trial', n, result);
  }
}
F.on('taskStart', () => { try { if (enc && F.Task.current && F.Task.current.S) enc.stageAt = F.Task.current.S.anchor.clone(); } catch (e) {} });

/* (Navnelappen – «Nå får vennen din et navn!» + write / read the species word as a «name» – was dropped by the natural audit 11.10.
   D1 #57: reading the species word as a name contradicted «words match the world». Reading and writing stay in the trial's W tasks.) */

async function win(rec, s, M) {
  const A = save(), sp = s.id, a = recPos(rec);
  const region = (() => { try { const r = F.Gen && F.Gen.regionAt ? F.Gen.regionAt(a.x, a.z) : null; return (r && r.id) || null; } catch (e) { return null; } })();
  A.friends[sp] = { day: dayNo(), region, stars: 0 };
  delete A.cool[sp]; delete A.carry[sp];
  F.store();
  const at = new V3(a.x, F.Space.heightAt(a.x, a.z) + 1.4, a.z);
  try { F.FX.burst(at, { kind: 'heart', n: 26 }); F.FX.burst(at, { kind: 'confetti', n: 30 }); } catch (e) {}
  react(rec, 'won');                                       // its own sound + hearts + a happy hop
  M.remove();
  F.sfx.magic();
  // natural audit D1: no «Hurra!», no fake naming task (it read the species word as a «name»), no lecture – the animal SHOWS what it
  // eats (its food pops up and it munches it) and acts out its word without saying it; then the name ribbon («Du ble venn med kua!»)
  await F.T.sleep(700);
  try { await munch(rec, s); } catch (e) { console.warn('befriend munch', e); }
  const nm = null;
  // the vennebånd (her fairy's colours) with the name in big lowercase – the name is the reward
  const [c1, c2] = fairyCol();
  const rib = UI.el('div', 'bf-ribbon' + (nm ? ' named' : ''), `<div class="bf-rib-band">${HEART}<span class="bf-rib-name">${F.UI.caseText(s.word)}</span>${HEART}</div>`);
  rib.style.setProperty('--c1', c1); rib.style.setProperty('--c2', c2);
  document.body.appendChild(rib);
  const placeRib = () => { const p = toScreen(at); rib.style.left = U.clamp(p.x, 160, innerWidth - 160) + 'px'; rib.style.top = U.clamp(p.y - 40, 130, innerHeight - 260) + 'px'; };
  placeRib(); const offRib = F.on('preRender', placeRib);
  showNow(rib);
  let ribGone = false;
  const killRib = () => { if (ribGone) return; ribGone = true; offRib(); rib.classList.remove('on'); F.T.sleep(400).then(() => rib.remove()); };
  const from = toScreen(at);
  try {
    await Promise.all([F.SAY('bf_friend', { dyr: s.def }), F.T.sleep(2200)]);   // the ribbon stays ≥ 2.2 s
    try { if (F.VIT && F.VIT.heardName) F.VIT.heardName(sp); } catch (e) { /* knowledge state */ }
    await teachMoment(rec, s);                                                    // (B.teachOn false: nothing said)
    actWord(rec, s);
    // sticker → album button
    const im = thumb(sp, 128);
    const btn = document.querySelector('.hud-album') || document.querySelector('[data-album]') || document.querySelector('.hud-map');
    const to = btn ? center(btn) : { x: innerWidth - 60, y: 60 };
    killRib();
    F.sfx.whoosh();
    await flyEl(`<div class="bf-sticker">${im ? `<img src="${im}" alt="">` : HEART}</div>`, 'bf-stk', { x: from.x, y: from.y }, to, 900, 140);
    if (btn) { btn.classList.remove('bf-bump'); void btn.offsetWidth; btn.classList.add('bf-bump'); }
    F.sfx.pop();
  } catch (e) { console.error('befriend win fx', e); } finally { killRib(); }
  try { F.Eco.add(COINS[s.tier] || 3, { from: { x: from.x, y: from.y }, reason: 'befriend' }); } catch (e) { console.error(e); }
  F.emit('friendMade', sp);
  fauna('release', rec, { mode: 'won' });
  // (natural audit D1: no «Den står på side 1 i albumet.» – the album button bumps and the book opens on her new sticker)
  // milestones and a full page (rare: every 10th friend, a whole page)
  const total = Object.keys(A.friends).length;
  if (total % 10 === 0 && total >= 10 && total <= 110) await F.SAY('al_ms', { n: total });
  const onPage = species().filter(x => x.page === s.page);
  if (onPage.length && onPage.every(x => A.friends[x.id]) && !A.pages[s.page]) {
    A.pages[s.page] = dayNo(); F.store();
    F.sfx.levelup();
    try { F.Eco.add(PAGE_COINS, { reason: 'albumPage' }); } catch (e) { console.error(e); }
    F.emit('pageComplete', s.page);
    await F.SAY('al_full');
  }
}
/* natural audit D1 (the win shows, it does not tell): its food pops up beside it and it munches it – three crunchy bites, the food
   shrinks, no words. Seeing it eat its food is an exposure of the food fact (VIT:mat, within today's «new facts» cap, as the spoken
   line used to be): the later recall «Hva spiser kua?» is a picture choice. An animal with no food model just hops. */
async function munch(rec, s) {
  const t = themeOf(s.id), m = t && t.spiser ? (t.mat || []).find(x => F.VOX.has(x)) : null;
  if (!m) { react(rec, 'happy'); return false; }
  // in front of the animal on the camera's side, away from her fairy (so neither hides it), the size of a big apple
  const a = recPos(rec), P = F.Player.pos, yaw = F.R.cam ? F.R.cam.yaw || 0 : 0, cx = Math.sin(yaw), cz = Math.cos(yaw);
  const sd = ((P.x - a.x) * cz - (P.z - a.z) * cx) > 0 ? -1 : 1;                     // the screen side away from her
  let x = a.x + cx * 0.7 + cz * sd * 0.45, z = a.z + cz * 0.7 - cx * sd * 0.45;
  if (isWet(x, z) !== isWet(a.x, a.z)) { x = a.x + cx * 0.45; z = a.z + cz * 0.45; }
  let food = null;
  try {
    food = F.VOX.make(m, {}); const bb = new THREE.Box3().setFromObject(food), sz = bb.getSize(new V3()), k = 0.72 / Math.max(0.05, sz.x, sz.y, sz.z);
    food.position.set(x, F.Space.heightAt(x, z), z); food.scale.setScalar(0.01); F.Space.scene().add(food);
    F.sfx.pop();
    await F.T.tween(360, q => { food.scale.setScalar(Math.max(0.01, k * U.smooth(q) * (1 + Math.sin(q * Math.PI) * 0.15))); });
    const o = rec.obj || (rec.proxy && rec.proxy.obj);
    if (o && rec.fake) o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z);
    else if (rec.ry != null && !rec.fake) rec.ry = Math.atan2(x - a.x, z - a.z);
    B.lastMunch = { sp: s.id, food: m, at: F.T.now };
    for (let i = 0; i < 3; i++) {
      react(rec, 'tilt');
      try { if (F.sfx.animal) F.sfx.animal('knask'); else F.sfx.pop(); } catch (e) { /* sound only */ }
      const k0 = food.scale.x;
      await F.T.tween(380, q => { food.scale.setScalar(Math.max(0.01, k0 * (1 - 0.3 * U.smooth(q)))); });
      await F.T.sleep(160);
    }
    try { const kid = t.variant ? t.base : s.id, key = 'VIT:mat:' + kid; if (F.VIT && F.VIT.expose && (F.VIT.known(key) || F.VIT.canNew('f'))) F.VIT.expose(key, s.id, 'seen'); } catch (e) { /* knowledge state */ }
    const k1 = food.scale.x;
    await F.T.tween(260, q => { food.scale.setScalar(Math.max(0.005, k1 * (1 - q))); });
    react(rec, 'happy');
  } finally { if (food && food.parent) food.parent.remove(food); }
  return true;
}
// its word acted out, silently (a curious head tilt for «nysgjerrig», a hop for «leken») – the word itself lives on the album card
function actWord(rec, s) {
  try { const wd = F.VIT && F.VIT.wordFor ? F.VIT.wordFor(s.id) : null; if (wd) react(rec, wd.kind === 'ord' && WORD_ACT[wd.text] ? 'tilt' : 'happy'); } catch (e) { /* decor */ }
}
/* v5 WP-A (DESIGN5 §2.3, DESIGN4 §9–§10): the befriend moment TEACHES – one fact (its food first: the food model pops up beside the
   animal while the fact clip plays) and the animal's word or expression, acted out (nysgjerrig → head tilt, leken / blid → a hop).
   F.VIT keeps the exposures; a fact is only ASKED on a later day after ≥ 2 exposures (album card, petting, this moment). */
const WORD_ACT = { nysgjerrig: 'tilt', forsiktig: 'tilt', sjenert: 'tilt', klok: 'tilt', 'tålmodig': 'tilt', rolig: 'tilt', 'trøtt': 'tilt',
  skvetten: 'tilt', 'lydløs': 'tilt', 'grasiøs': 'tilt', staselig: 'tilt' };      // (the others hop: leken, kvikk, rampete, bråkete …)
async function teachMoment(rec, s, o) {
  if (!F.VIT || !F.VIT.teach || B.teachOn === false) return null;
  o = o || {};
  const t = themeOf(s.id); let food = null;
  const showFood = f => {
    if (!t || !t.spiser || f.text !== t.spiser) return;
    const m = (t.mat || []).find(x => F.VOX.has(x)); if (!m) return;
    try {
      const a = recPos(rec), P = F.Player.pos, dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz) || 1;
      const x = a.x + dx / d * 0.9 - dz / d * 0.7, z = a.z + dz / d * 0.9 + dx / d * 0.7;
      food = F.VOX.make(m, {}); const bb = new THREE.Box3().setFromObject(food), sz = bb.getSize(new V3()), k = 0.55 / Math.max(0.05, sz.x, sz.y, sz.z);
      food.position.set(x, F.Space.heightAt(x, z), z); food.scale.setScalar(0.01); F.Space.scene().add(food);
      F.T.tween(380, q => { if (food) food.scale.setScalar(Math.max(0.01, k * U.smooth(q) * (1 + Math.sin(q * Math.PI) * 0.15))); });
      F.sfx.pop();
    } catch (e) { console.warn('teach food', e); food = null; }
  };
  let said = null;
  try {
    said = await F.VIT.teach(s.id, { onFact: showFood, newOnly: !!o.newOnly, act: wd => react(rec, wd.kind === 'ord' && WORD_ACT[wd.text] ? 'tilt' : 'happy') });
  } catch (e) { console.error('VIT.teach', e); }
  if (food) { const f0 = food; food = null; F.T.tween(300, q => f0.scale.multiplyScalar(0.85)).then(() => { if (f0.parent) f0.parent.remove(f0); }); }
  return said;
}
// not now: the animal remembers part of her effort (carry, bounded), a cooldown; fails[] stays for the parent's statistics
async function notNow(rec, s, c) {
  const A = save(), sp = s.id;
  A.fails[sp] = (A.fails[sp] || 0) + 1;
  A.carry[sp] = carryAfter(s.tier, carryOf(sp), c ? c.earned : 0);
  A.cool[sp] = { t: now(), n: A.tn };
  F.store();
  if (enc && enc.meter) enc.meter.remove();
  if (c && c.H > 0 && !A.carrySaid) { A.carrySaid = 1; F.store(); await F.SAY('bf_carry_save'); }   // explained once; then «Den kjenner deg igjen!» + the lit hearts show it
  if (s.tier === 4) await F.SAY('bf_legend_home'); else await F.SAY('bf_fail');
  fauna('release', rec, { mode: 'later', home: s.tier === 4 });     // home: a legend leaves until another day / phase (WP4)
  const o = rec.obj || (rec.proxy && rec.proxy.obj);
  if (o && rec.fake) { const x0 = o.position.x, z0 = o.position.z, P = F.Player.pos, dx = x0 - P.x, dz = z0 - P.z, d = Math.hypot(dx, dz) || 1;
    F.T.tween(1200, k => { o.position.x = x0 + dx / d * 6 * k; o.position.z = z0 + dz / d * 6 * k; o.position.y = F.Space.heightAt(o.position.x, o.position.z) + Math.abs(Math.sin(k * Math.PI * 4)) * 0.4; }); }
}

/* ---------------------------------------------------------- Vennestjerne (DESIGN3 §5.10; v5c WP-A2 DESIGN5 §9): friendship × knowledge
   A tap on one of her friends (outside its cooldown, ≤ 1 star per species per day, < 3 stars, and – v5c – something it taught her is
   due for recall): Puff asks «Vil du leke med vennen din?», the friend stays and looks at her with a tappable ★ over it (it follows the
   friend); a tap on the ★ or a 2nd tap on the friend within 12 s plays the 2-task mini-trial:
     1. «Vennen din har en gåte til deg!» – ONE spaced recall of what THIS friend taught her (F.VIT.starKeys: its food / home / baby link /
        word, taught ≥ 2–3 times, ≥ 1 day ago, not heard in the last 2 h; never a question whose answer is the friend standing there);
        F82 Faktakortet, ≥ 5 choices (s ≥ 1), the fact clip is the feedback. It comes FIRST, so the play task cannot show the answer.
     2. a play task from the friend's own world, a new kind of thinking each visit (STAR_KINDS above).
   Both first-try right → a star (max 3, gold frame at 3 = three different days on which she remembered things about this friend).
   The album card shows ONE star row (friendship + knowledge) and the facts / word it taught. No star: the friend rests, no loss.
   Nothing due (taught today, or not taught yet): no invitation – petting teaches instead (fauna.js → F.VIT.petPick). A friend with no
   askable fact of its own (no food / home / baby fact with a model) asks one other due fact. Without F.VIT: the v3 mini-trial. */
const STAR_TAP_S = 12, STAR_ASK_GAP_S = 120;
let starAsk = null; const starAsked = {};
const unified = () => !!(F.VIT && F.VIT.starKeys);
const starKeysOf = sp => { try { return unified() ? F.VIT.starKeys(sp) : []; } catch (e) { console.warn('VIT.starKeys', e); return []; } };
function starReady(sp) {
  const fr = save().friends[sp]; if (!fr || !F.LEARN || !F.LEARN.next) return false;
  if ((fr.stars || 0) >= STAR_MAX || fr.starDay === dayNo() || cooling(sp)) return false;
  if (F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask()) return false;
  if (unified() && !starKeysOf(sp).length) return false;           // v5c: a star is a recall – nothing due, nothing to win today
  return true;
}
// v5c WP-A2: a friend that taught her something today (nothing due yet) says so once a day after the petting – a reason to come back
// tomorrow, and the parent sees why there is no invitation on the teaching day
const tomorrowSaid = {};
function sayTomorrow(spId) {
  try {
    const fr = save().friends[spId];
    if (!unified() || !fr || (fr.stars || 0) >= STAR_MAX || fr.starDay === dayNo() || tomorrowSaid[spId] === dayNo() || !F.TPL.has('bf_imorgen')) return;
    const own = F.VIT.ownKeys ? F.VIT.ownKeys(spId).filter(k => !k.viaOther) : [];
    // only when it is really true: one of its facts can be asked tomorrow (taught twice today, or its spacing gap ends tomorrow)
    if (!F.VIT.dueIn || !own.some(k => F.VIT.dueIn(k.key) === 1)) return;
    tomorrowSaid[spId] = dayNo();
    F.T.timeout(() => { if (!enc && !(F.Task && F.Task.current)) F.SAYF('bf_imorgen'); }, 3200);
  } catch (e) { /* line only */ }
}
function friendTap(rec) {
  const spId = rec && (typeof rec.sp === 'string' ? rec.sp : rec.sp && rec.sp.id);
  if (spId && !enc && !(F.Task && F.Task.current) && isFriend(spId) && !starReady(spId) && unified() && !starKeysOf(spId).length) sayTomorrow(spId);
  if (!spId || enc || (F.Task && F.Task.current) || !isFriend(spId) || !starReady(spId)) return false;
  if (starAsk && starAsk.sp === spId && F.T.now - starAsk.t < STAR_TAP_S) { starAsk = null; starTrial(rec, byId(spId)); return true; }
  if (starAsked[spId] != null && F.T.now - starAsked[spId] < STAR_ASK_GAP_S) return false;      // she did not want to play: just pet
  starAsk = { sp: spId, t: F.T.now }; starAsked[spId] = F.T.now;
  const ask = starAsk;
  react(rec, 'won');
  // the friend waits for her answer: it stays where it is, turned to her, while the ★ floats over it (like the heart of an animal that is
  // not her friend yet), and goes back to its life when she lets the ★ go (verifier 11.10.: a ★ pinned to the tap spot was left over
  // empty grass while the friend walked off)
  fauna('focus', rec);
  F.T.timeout(() => { if (!rec.fake && !rec.dead && rec.focus && !(enc && enc.rec === rec)) { rec.focus = false; rec.t = 0.5; } }, STAR_TAP_S * 1000);
  // the ★ is tappable too (as the heart bubble: a tap on it plays); it follows the friend and fades once taken or after STAR_TAP_S
  try {
    const up = Math.max(1.2, Math.min(4, heightOf(rec))) + 0.4;
    const top = () => { const a = recPos(rec); return new V3(a.x, F.Space.heightAt(a.x, a.z) + up, a.z); };
    const el = UI.bubbleAt(top(), '★', STAR_TAP_S * 1000);
    if (el) {
      el.classList.add('bf-starask'); el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer';
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('click', e => { e.stopPropagation(); if (starAsk !== ask || enc || (F.Task && F.Task.current)) return; starAsk = null; el.style.pointerEvents = 'none'; F.sfx.click(); starTrial(rec, byId(spId)); });
      // runs after UI.bubbleAt's own fixed-point placement (listeners run in order), so this one wins
      const off = F.on('preRender', () => {
        if (!el.isConnected) { off(); return; }
        if (starAsk !== ask || F.T.now - ask.t > STAR_TAP_S) { off(); el.style.pointerEvents = 'none'; el.classList.remove('bf-starask'); el.classList.add('out'); setTimeout(() => el.remove(), 320); return; }
        const v = top().project(F.R.camera), cv = F.R.renderer.domElement.getBoundingClientRect();
        el.style.left = (cv.left + (v.x + 1) / 2 * cv.width).toFixed(1) + 'px'; el.style.top = (cv.top + (1 - v.y) / 2 * cv.height).toFixed(1) + 'px';
        el.style.display = v.z < 1 ? '' : 'none';
      });
    }
  } catch (e) { /* decor */ }
  F.SAY('bf_play');
  return true;
}
const sayIf = (id, sl) => (F.TPL.has(id) ? F.SAY(id, sl || {}) : Promise.resolve());
async function starTrial(rec, s) {
  if (!s || enc) return null;
  const A = save(), sp = s.id;
  const keys = starKeysOf(sp), uni = unified();
  const T = newTrial(2, [], { noWarmup: true, sp, star: uni, starKeys: keys });
  if (uni) T.groups = keys.length ? ['V', 'T'] : ['T', 'N'];           // v5c: the recall first, then the friend's world
  enc = { rec, sp, tier: s.tier, n: 2, kind: 'star', bundle: 'bf:' + gidOf(rec), meter: null, outcomes: [], stageAt: null, trial: T };
  B.lastTrial = enc.trial.items;
  begin(enc);
  let result = null;
  try {
    fauna('focus', rec);
    await approach(rec, s);
    F.Player.frozen = true; F.Player.stop();
    enc.home = { x: F.Player.pos.x, z: F.Player.pos.z };
    frame(rec, true);
    const hgt = heightOf(rec);
    const M = enc.meter = Meter(anchorFor(rec, hgt), s.tier, sp, { n: 2, pipsOnly: true }); M.pipsOnly = true;
    for (let t = 0; t < 2 && Math.abs(F.R.cam.yaw - F.R.cam.yawGoal) > 0.02; t += 0.1) await F.T.sleep(100);
    for (let k = 0; k < 2; k++) {
      // (natural audit D1: «Vennen din har en gåte til deg!» – the friend asks, not a teacher; no «Siste oppgave!»)
      if (k === 0 && T.groups[0] === 'V') await sayIf('bf_husk_venn');
      M.pip(k, 'cur');
      await M.dock(true);
      const r = await trialTask(rec, enc.trial, k);
      F.Player.frozen = true; frame(rec, true);
      if (!r || !r.outcome) { await M.dock(false); result = { won: false, star: false, outcomes: enc.outcomes.slice(), quiet: true, items: T.items.slice() }; return result; }
      enc.outcomes.push(r.outcome); M.pip(k, r.outcome);
      const back = backHome();
      await payOut(rec, s, M, r.outcome, hgt, SLOTS);
      await back; frame(rec, true);
    }
    await M.dock(false);
    const fr = A.friends[sp], allA = enc.outcomes.length === 2 && enc.outcomes.every(o => o === 'A');
    // v5c: the star needs the recall (a sim run in tests counts its V slot as one)
    const rItem = T.items.find(i => i.group === 'V' && (i.key || i.sim));
    const recallA = !uni || (rItem && rItem.outcome === 'A');
    const both = allA && recallA;
    A.cool[sp] = { t: now(), n: A.tn };               // no farming: the friend rests (3 tasks or 3 minutes) whatever happened
    if (fr) {
      const kind = (T.items.find(i => i.starKind) || {}).starKind;
      if (kind) { fr.kinds = (Array.isArray(fr.kinds) ? fr.kinds : []).filter(x => x !== kind).concat(kind).slice(-4); }
    }
    if (both && fr) {
      fr.stars = Math.min(STAR_MAX, (fr.stars || 0) + 1); fr.starDay = dayNo();
      if (rItem && rItem.key) fr.starKeys = (Array.isArray(fr.starKeys) ? fr.starKeys : []).concat(rItem.key).slice(-6);
      F.store();
      M.el.classList.add('star'); F.sfx.levelup();
      try { const a = recPos(rec); F.FX.burst(new V3(a.x, F.Space.heightAt(a.x, a.z) + 1.4, a.z), { kind: 'confetti', n: fr.stars >= STAR_MAX ? 40 : 24 }); } catch (e) {}
      react(rec, 'won');
      await F.SAY('bf_star');
      if (fr.stars >= STAR_MAX) await sayIf('bf_star_gull');
      F.emit('friendStar', sp, fr.stars);
      await teachMoment(rec, s, { newOnly: true });  // a friend tells something NEW (within today's caps), never the fact just recalled
    } else {
      F.store();
      react(rec, 'won');
      if (uni && rItem && rItem.outcome && rItem.outcome !== 'A') await sayIf('bf_star_snart');          // the fact was just retold
      else if (uni && rItem && rItem.outcome === 'A') await sayIf('bf_star_nesten');
      else await F.SAY('bf_already');
    }
    result = { won: both, star: both, stars: fr ? fr.stars || 0 : 0, recall: rItem ? { key: rItem.key || null, outcome: rItem.outcome || null } : null,
      kind: (T.items.find(i => i.starKind) || {}).starKind || null, outcomes: enc.outcomes.slice(), items: T.items.slice() };
    return result;
  } catch (e) {
    console.error('Vennestjerne failed', e);
    result = result || { won: false, star: false, outcomes: enc ? enc.outcomes.slice() : [], error: String(e) };
    return result;
  } finally {
    cleanup();
    if (!(F.Task && F.Task.current) && !(F.UI.isOpen && F.UI.isOpen())) F.Player.frozen = false;
    fauna('release', rec, { mode: 'won' });
    finish(sp, 'star', 2, result);
  }
}

/* ---------------------------------------------------------- debug + tests (attached on 'ready') */
let fakeRecs = [];
function fakeRec(sp, o) {
  o = o || {};
  const P = F.Player.pos, yaw = F.R.cam.yaw || 0;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);                  // away from the camera
  const x = o.x != null ? o.x : P.x + fx * 4.5 + Math.cos(yaw) * 1.2, z = o.z != null ? o.z : P.z + fz * 4.5 - Math.sin(yaw) * 1.2;
  const obj = make(sp);
  obj.position.set(x, F.Space.heightAt(x, z), z); obj.rotation.y = Math.atan2(P.x - x, P.z - z);
  F.Space.scene().add(obj);
  const rec = { sp, x, z, ry: obj.rotation.y, gid: 'dbg' + (++fakeN), obj, fake: true };
  rec.proxy = { x, y: obj.position.y, z, obj, id: 'bf_' + rec.gid };
  fakeRecs.push(rec);
  return rec;
}
function clearFakes() { fakeRecs.forEach(r => { if (r.obj && r.obj.parent) r.obj.parent.remove(r.obj); }); fakeRecs = []; }
F.on('ready', () => {
  const dbg = F.dbg = F.dbg || {};
  dbg.bfChance = (tier, pattern, carry) => chance(tier, String(pattern || '').split(''), carry || 0);
  dbg.bfFake = (sp, o) => fakeRec(sp, o);
  dbg.bfHop = rec => { const sp = typeof rec.sp === 'string' ? rec.sp : rec.sp.id; return hopCloser(rec, byId(sp)); };
  dbg.bfClear = () => { clearFakes(); return true; };
  // framing check for a live fauna record: W1 rule (her side, today's view) vs the W2 search. score 0 = fairy + animal visible
  dbg.bfView = async id => {
    const rec = F.Fauna && F.Fauna.records ? F.Fauna.records().find(q => q.id === id) : null; if (!rec) return null;
    const s = byId(rec.sp.id || rec.sp), hgt = animalHeight(rec), a = recPos(rec), cam = F.R.cam;
    const objs = occluders(a), skip = new Set([F.Player.obj, rec.obj].filter(Boolean));
    const P = F.Player.pos, d = Math.hypot(P.x - a.x, P.z - a.z);
    const old = (d > 2.4 ? approachSpot(rec, s) : null) || { x: P.x, z: P.z };
    const w1 = viewScore(a, hgt, old, { yaw: cam.yawGoal, pitch: cam.pitchGoal, dist: Math.min(cam.distGoal, 15) }, objs, skip);
    const t0 = performance.now(), pl = await planView(rec, s, hgt), ms = performance.now() - t0;
    return { sp: s.id, w1, w2: pl.score, view: pl.view, spot: pl.spot, tests: pl.n, ms: pl.ms, wall: +ms.toFixed(1) };
  };
  // independent check on the live camera: rays from the real camera position to the animal and to her fairy
  dbg.bfSeen = () => {
    const e = enc; if (!e) return null;
    const a = recPos(e.rec), hgt = animalHeight(e.rec), c = F.R.camera.position.clone(), P = F.Player.pos;
    const objs = occluders(a, 40), skip = new Set([F.Player.obj, e.rec.obj, e.rec.proxy && e.rec.proxy.obj].filter(Boolean));
    const ay = F.Space.heightAt(a.x, a.z);
    const on = p => { const v = p.clone().project(F.R.camera); return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95; };
    const am = new V3(a.x, ay + Math.max(0.35, hgt * 0.55), a.z), fm = new V3(P.x, F.Space.heightAt(P.x, P.z) + 1.0, P.z);
    return { animal: !lineHidden(am, c, objs, skip) && on(am), fairy: !lineHidden(fm, c, objs, skip) && on(fm), view: e.plan ? e.plan.view : null, score: e.plan ? e.plan.score : null };
  };
  // run a whole encounter. pattern 'A' | 'B' | 'CC' | 'AAB' …: real tasks are answered (A right, B one wrong, C two wrong; the k-th
  // letter answers the k-th task, a missing letter = A; the Navnelappen task after a win is answered right);
  // {sim:true} skips the task UI (outcomes injected). {roll:n} forces the wheel. {rec} uses a given record. {star:true}: Vennestjerne.
  // v3 fix: a 'tapall' step (F08 «tap every thing first») is no answer – it is always done, the wrong answer goes to the next widget.
  const drive = async (startP, pattern, o) => {
    let res = null, k = -1, last = null, wrong = 0;
    startP.then(r => { res = r; });
    const t0 = F.T.now;
    while (!res && F.T.now - t0 < (o.maxSec || 300)) {
      const c = F.Task.current;
      if (c && !o.sim) {
        if (c.item !== last) { last = c.item; if (!(c.ctx && c.ctx.name)) k++; wrong = 0; }
        const want = (c.ctx && c.ctx.name) ? (o.name || 'A') : (pattern[k] || 'A'), need = want === 'B' ? 1 : want === 'C' ? 2 : 0;
        const S = c.S;
        if (S.active && !S.active.dead && !S.locked && !S.solved && !S.speaking) {
          if (S.active.kind === 'tapall') await dbg.answer(true);
          else if (wrong < need && !S.solShown) { wrong++; await dbg.answer(false); } else await dbg.answer(true);
        }
      }
      await dbg.stepA(0.25);
    }
    B._sim = null; B._roll = null;
    return res || { timeout: true, busy: B.busy, task: dbg.task && dbg.task() };
  };
  const findRec = async (sp, o) => {
    let rec = o.rec || null;
    if (!rec) { const near = fauna('near', F.Player.pos.x, F.Player.pos.z, 25) || []; rec = near.find(r => r.sp === sp || (r.sp && r.sp.id === sp)) || null; }
    if (!rec && dbg.fauna && !o.fake) { try { await dbg.fauna(sp); } catch (e) {} const near = fauna('near', F.Player.pos.x, F.Player.pos.z, 25) || []; rec = near.find(r => r.sp === sp || (r.sp && r.sp.id === sp)) || null; }
    return rec || fakeRec(sp, o);
  };
  dbg.befriend = async function (sp, pattern, o) {
    o = o || {}; pattern = String(pattern || 'A').toUpperCase();
    const rec = await findRec(sp, o);
    if (o.roll != null) B._roll = o.roll;
    if (o.sim) B._sim = pattern.split('');
    return drive(B.start(rec), pattern, o);
  };
  // v5c WP-A2: what a Vennestjerne on sp would serve now, without running it (no side effects: the engine's next() is pure):
  // {keys:[…], recall:{key, kind, answer, choices}|null, play:{kind, strand, format, themed}|null}. o.kinds: pretend these were the last kinds.
  dbg.bfStarPlan = function (sp, o) {
    o = o || {};
    const fr = save().friends[sp], keep = fr ? fr.kinds : undefined;
    if (fr && o.kinds) fr.kinds = o.kinds.slice();
    try {
      const keys = starKeysOf(sp), T = newTrial(2, [], { noWarmup: true, sp, star: unified(), starKeys: keys });
      T.groups = keys.length ? ['V', 'T'] : ['T', 'N'];
      const r0 = keys.length ? pickTrialItem(T, 0) : null;
      if (r0) { T.items.push({ k: 0, group: 'V', themed: null }); T.fmts.push(r0.format); }
      const r1 = pickTrialItem(T, 1);
      const ans = r0 && r0.params && r0.params.models ? r0.params.models[r0.params.answer] : null;
      return { keys: keys.map(k => k.key), recall: r0 ? { key: r0.key, kind: r0.params && r0.params.kind, answer: ans && (ans.word || ans.model), choices: r0.choices } : null,
        play: r1 ? { kind: r1.starKind || null, strand: r1.strand, format: r1.format, themed: r1.themed || null, rung: r1.rung, at: r1.at && r1.at.rung,
          nch: nChips(r1), g: r1.g != null ? r1.g : null } : null };      // (v5r2: + chips and g – the star's guessing gate)
    } finally { if (fr && o.kinds) fr.kinds = keep; }
  };
  // v5r: what a Venneprøven on sp would serve now, without running it (the engine's next() is pure): the n picked items with their
  // group / strand / format / themed and whether F33 would be a dictation (probe gate: the trial tasks are about the animal)
  dbg.bfTrialPlan = function (sp, n) {
    n = n || 3;
    const T = newTrial(n, [], { sp }), out = [];
    for (let k = 0; k < n; k++) {
      const it = pickTrialItem(T, k); if (!it) { out.push(null); continue; }
      T.used.push(it.strand); T.fmts.push(it.format); if (lowChip(it)) T.low++; T.thinks.push(thinkOfItem(it));
      // v5r2: + the food it shows and the food line said before it (null = none), think type, chips and g (probe gates)
      const fd = shownFood(T, it);
      const info = { k, group: T.groups[k], strand: it.strand, format: it.format, key: it.key || null, themed: it.themed || null, food: fd,
        line: fd && !T.themeSaid ? foodLine(sp, fd) : null, think: thinkOfItem(it), nch: nChips(it), g: it.g != null ? it.g : null, rung: it.rung,
        surface: it.format === 'F43' && it.params ? it.params.surface || null : undefined,
        f33: it.format === 'F33' ? f33Kind(T, it) : null };
      T.items.push(info); if (fd) T.themeSaid = true;
      out.push(info);
    }
    return out;
  };
  // Vennestjerne mini-trial on a friend (the 2-tap ask is skipped): pattern for its 2 tasks
  dbg.bfStar = async function (sp, pattern, o) {
    o = o || {}; pattern = String(pattern || 'AA').toUpperCase();
    const rec = await findRec(sp, Object.assign({ fake: true }, o));
    if (o.sim) B._sim = pattern.split('');
    return drive(starTrial(rec, byId(sp)), pattern, o);
  };
});
})();
