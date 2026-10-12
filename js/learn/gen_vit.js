/* Feslottet – VIT V1–V2 (world knowledge) and ORD Or-T / Or-U (tier-2 words, expressions): teach first, then spaced recall.
   DESIGN5 §2.3, DESIGN4 §9–§10, SYNTHESIS §2.5–§2.6 (F82 Faktakortet). Owner: WP-A. Pure JS at load (no THREE/DOM needed; runs in Node).

   LADDER ADDITIONS (WP-E2 folds these into ladders.js later; until then they are patched in here when F.LADDERS is assigned):
     VIT  unlocked, max 2:  1 = V1 «Animal names and their babies»  (band A, code Set, think HUSKE)
                            2 = V2 «Diet and home»                   (band A, code Set, think HUSKE)
     ORD  max 9 (Phase-2 rungs 2–7 stay out: ph 2):  8 = Or-T «tier-2 words» (band A, code Set, think FORSTÅ, tag 'Or-T')
                                                      9 = Or-U «uttrykk»     (band A/B, code Set, think FORSTÅ, tag 'Or-U')
   GENERATORS (F.BANKS.reg, or queued on F.REGQ until ladders.js loads): VIT rungs 1–2, ORD rungs 8–9; opts.fits / opts.facts.
     Leitner keys: VIT:navn:<sp>  VIT:unge:<mother>  VIT:mat:<sp>  VIT:hjem:<sp>  ORD:ord:<word>  ORD:ux:<exprId>
     A key is generated ONLY when it is due: taught ≥ 2 times (facts, names) / ≥ 3 times (words, expressions) and first taught on an
     earlier day (teach-before-test); review keys the engine hands over (o.key) are always honoured. Nothing due → null (the engine
     takes another strand). Answers are 3D models (animals, food); distractors are objects, never false sentences.
     sup: s0 3 choices, s1 5, s2 6 (o.nChoices raises it).  item.g = 1/n, mode 'scene', secret false; s2 V2 may be select-all (g 1/63).
   FORMAT F82 «Faktakortet» (F.Task.def, places any/dyr/album): prompt → S.objects (tap the model) → the fact clip as feedback.
   TEACHING (F.VIT): exposures are counted per key in F.save.vit {k:{key:{e, d0, dl, days[], rc[], sp[]}}, nd:{day, f, w}}
     F.VIT.teach(spId, {where}) -> Promise   the befriend moment: «Visste du det?» + ONE fact (food, baby, or a fact) + the animal's
                                             word / expression (≤ 3 new facts and ≤ 2 new words/expressions a day; NEW ones only –
                                             natural audit 11.10.; F.Befriend.teachOn is false, so the win no longer calls it)
     F.VIT.expose(key, sp, how)              one exposure (album card tap, a character line, the encounter's food line; how 'seen' =
                                             shown without words, e.g. the win's munch – the album card shows an eye until she hears it)
     F.VIT.factsFor(spId) -> [{text, key|null, stars 0–3, heard, gold}]   the album fact card (2–3 facts)
     F.VIT.wordFor(spId) -> {kind:'ord'|'ux', text, tpl, slots, key} | null
     F.VIT.due(rung, strand) -> [keys]     F.VIT.recall(key, ok)     F.VIT.state()     F.VIT.day()  (real local day, like the engine)
     F.VIT.summary() -> {facts, words, expressions, names, today}   (the parent page: learned words / expressions, recalls, gold)
   Gold after correct recall on 3 different days (rc); v5c: the days spread out (GAP 1 → 2 → 4 → 7 → 14 days after each correct recall). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

/* ---------------------------------------------------------- ladder additions */
function patchLadders(L) {
  if (!L || typeof L !== 'object' || L.__vitPatched) return L;
  const r = (band, code, think, can, extra) => Object.assign({ band, code, prereq: null, think, can }, extra || {});
  if (L.VIT) {
    L.VIT.locked = false; L.VIT.max = Math.max(+L.VIT.max || 0, 2); L.VIT.start = 1;
    L.VIT.think = ['HUSKE'];
    L.VIT.rungs = L.VIT.rungs || {};
    const keep = n => { const o = Object.assign({}, L.VIT.rungs[n] || {}); delete o.ph; return o; };
    L.VIT.rungs[1] = Object.assign(keep(1), r('A', 'Set', 'HUSKE', 'Animal names and their babies (taught on the album / befriend card first)'));
    L.VIT.rungs[2] = Object.assign(keep(2), r('A', 'Set', 'HUSKE', 'Diet and home (taught first; 3–6 food models)'));
  }
  if (L.ORD) {
    L.ORD.rungs = L.ORD.rungs || {};
    if (!L.ORD.rungs[8] || L.ORD.rungs[8].ph) L.ORD.rungs[8] = r('A', 'Set', 'FORSTÅ', 'Or-T: tier-2 words acted out by animals (nysgjerrig, sta, flittig …)', { tag: 'Or-T' });
    if (!L.ORD.rungs[9] || L.ORD.rungs[9].ph) L.ORD.rungs[9] = r('A', 'Set', 'FORSTÅ', 'Or-U: expressions (stille som en mus, sta som et esel …)', { tag: 'Or-U' });
    L.ORD.max = Math.max(+L.ORD.max || 0, 9);
    if (Array.isArray(L.ORD.think) && !L.ORD.think.includes('FORSTÅ')) L.ORD.think = L.ORD.think.concat('FORSTÅ');
  }
  try { Object.defineProperty(L, '__vitPatched', { value: true, enumerable: false }); } catch (e) { /* frozen */ }
  return L;
}
(function hookLadders() {
  if (F.LADDERS) { patchLadders(F.LADDERS); return; }
  const d = Object.getOwnPropertyDescriptor(F, 'LADDERS');
  if (d && d.configurable === false) return;
  let cur;
  try {
    Object.defineProperty(F, 'LADDERS', { configurable: true, enumerable: true, get() { return cur; }, set(v) { cur = v; try { patchLadders(v); } catch (e) { console.error('[VIT] ladder patch', e); } } });
  } catch (e) { /* plain property */ }
})();

/* ---------------------------------------------------------- knowledge state (F.save.vit) */
const dayOf = now => { const d = new Date(now); return Math.floor((now - d.getTimezoneOffset() * 60000) / 864e5); };
const VIT = F.VIT = F.VIT || {};
VIT._now = null;
const nowMs = () => (VIT._now ? VIT._now() : Date.now());
const today = () => dayOf(nowMs());
VIT.day = today;
function st() {
  const sv = F.save || (F.save = {});
  const v = sv.vit = sv.vit || {};
  v.k = v.k || {}; v.nd = v.nd || { day: -1, f: 0, w: 0 };
  if (v.nd.day !== today()) v.nd = { day: today(), f: 0, w: 0 };
  return v;
}
VIT.state = st;
const store = () => { try { if (F.store) F.store(); } catch (e) { /* Node */ } };
const isWordKey = k => /^ORD:/.test(k);
const isFactKey = k => /^VIT:(mat|unge|hjem):/.test(k);
const isNameKey = k => /^VIT:navn:/.test(k);
const NEED = k => isWordKey(k) ? 3 : 2;                 // exposures before the first recall
// one exposure of a key (sp: the animal that taught it). Counts toward the daily «new» cap when it is the first exposure.
// how = 'seen': she SAW it, nothing was said (the befriend win: the animal munches its food) – e.seen stays true while every exposure
// so far was seen only, so the album card shows an eye, not the ear of a fact she heard (natural audit: the words match the world)
VIT.expose = function (key, sp, how) {
  if (!key) return null;
  const v = st(), d = today();
  let e = v.k[key];
  // (v5c WP-A2: a plain fact – 'F:<sentence>', never asked – is a new fact for her too: it counts toward the ≤ 3 a day)
  if (!e) { e = v.k[key] = { e: 0, d0: d, dl: d, days: [], rc: [], sp: [] }; if (isWordKey(key)) v.nd.w++; else if (isFactKey(key) || /^F:/.test(key)) v.nd.f++; }
  if (how === 'seen') { if (!e.e) e.seen = true; } else if (e.seen) delete e.seen;
  e.e++; e.dl = d; e.tl = nowMs();                       // v5c WP-A2: the time of the last exposure (spaced recall: not right after hearing it)
  if (!e.days.includes(d)) { e.days.push(d); if (e.days.length > 6) e.days.shift(); }
  if (sp && !e.sp.includes(sp)) { e.sp.push(sp); if (e.sp.length > 6) e.sp.shift(); }
  store();
  return e;
};
VIT.known = key => { const e = st().k[key]; return e ? e.e : 0; };
// may a new fact / word be taught today? (≤ 3 new facts, ≤ 2 new words or expressions a day)
VIT.canNew = kind => { const v = st(); return kind === 'w' ? v.nd.w < 2 : v.nd.f < 3; };
// v5c WP-A2: a recall is only a recall when she did not just hear it: the last exposure must be ≥ RECENT_MS ago (a session is ≈ 20 min;
// petting a friend, an album tap or the encounter's «Den spiser nøtter!» line right before «Hva spiser den?» would hand her the answer)
const RECENT_MS = 2 * 3600e3;
const fresh = e => (e.tl != null ? nowMs() - e.tl < RECENT_MS : e.dl >= today());
VIT.RECENT_MS = RECENT_MS;
// v5c WP-A2: expanding gaps after each correct recall (retrieval practice that spreads out: 1 → 2 → 4 → 7 → 14 days) – gold (3 recall
// days) comes about a week after teaching instead of on three days in a row; a missed recall is simply due again the next day
const GAP = [1, 2, 4, 7, 14];
VIT.GAP = GAP;
VIT.isDue = function (key) {
  const e = st().k[key]; if (!e) return false;
  // spaced: never on the teaching day, at most one recall of a key a day (the engine's Leitner reviews hand keys over themselves),
  // never within RECENT_MS of hearing it, and not before the gap after its last correct recall
  const last = e.rc.length ? e.rc[e.rc.length - 1] : null;
  if (last != null && today() - last < GAP[Math.min(GAP.length - 1, e.rc.length)]) return false;
  return e.e >= NEED(key) && today() > e.d0 && e.lastAsk !== today() && !fresh(e);
};
VIT.recall = function (key, ok) {
  const e = st().k[key]; if (!e) return null;
  if (ok) { const d = today(); if (!e.rc.includes(d)) e.rc.push(d); if (e.rc.length > 6) e.rc.shift(); }
  e.lastAsk = today(); store();
  return e;
};
VIT.stars = key => { const e = st().k[key]; return e ? Math.min(3, e.rc.length) : 0; };
// v5c WP-A2 (parent page): in how many days a key may be asked again (0 = today; null = not heard often enough yet)
VIT.dueIn = function (key) {
  const e = st().k[key]; if (!e || e.e < NEED(key)) return null;
  const t = today(), last = e.rc.length ? e.rc[e.rc.length - 1] : null;
  let d = Math.max(e.d0 + 1, last != null ? last + GAP[Math.min(GAP.length - 1, e.rc.length)] : 0, e.lastAsk === t ? t + 1 : 0, fresh(e) ? t + (e.tl != null ? 0 : 1) : 0);
  return Math.max(0, d - t);
};
VIT.gold = key => VIT.stars(key) >= 3;

/* ---------------------------------------------------------- species helpers */
const TH = () => F.THEMES || null;
const FA = () => (F.FAUNA && F.FAUNA.species) ? F.FAUNA : null;
const spRow = id => (FA() && FA().byId ? FA().byId(id) : null);
const voxOK = (m) => !(G.F && F.VOX && F.VOX.has) || F.VOX.has(m);
const navnOK = s => s && !s.glitter && s.tier <= 2;          // same rule as lines_vit.js VIT_NAVN_DEF
const modelOf = id => { const s = spRow(id); return s ? { model: s.model, opts: s.opts || null, word: s.word, sp: s.id } : null; };
const mkey = m => m.model + (m.opts ? JSON.stringify(m.opts) : '');
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
// animals that must never stand beside each other as answer and distractor (a kitten IS a cat; a pony is a small horse)
const CONF = [['katt', 'kattunge'], ['hund', 'valp'], ['ku', 'kalv'], ['sau', 'lam'], ['hest', 'føll', 'ponni', 'esel'], ['and', 'andunge'], ['hare', 'snøhare'],
  ['rev', 'fjellrev'], ['gås', 'and', 'svane'], ['elg', 'rådyr', 'rein'], ['bie', 'humle']];
const confusable = (a, b) => CONF.some(g => g.includes(a) && g.includes(b));
// up to n distinct animal models from a candidate id list (no two of the same model – one bird, one fish – and no confusable pair)
function animalChoices(ans, cands, n, rng) {
  const out = [ans], seen = new Set([mkey(ans), ans.model]);
  for (const id of shuffle(cands.slice(), rng)) {
    if (out.length >= n) break;
    if (out.some(x => x.sp && confusable(x.sp, id))) continue;
    const m = modelOf(id); if (!m || !voxOK(m.model)) continue;
    if (seen.has(m.model) || seen.has(mkey(m))) continue;
    seen.add(m.model); seen.add(mkey(m)); out.push(m);
  }
  return out;
}
const nFor = (sup, o) => Math.max(+(o && o.nChoices) || 0, sup <= 0 ? 3 : sup === 1 ? 5 : 6);   // s1: 5 (g = 0.2 < 0.25, outside the guess index)

/* ---------------------------------------------------------- food groups (distractors the animal never eats) */
const GROUP = { n_gress: 'grass', n_hoyball: 'grass', n_klover: 'grass', gulrot: 'veg', 'kål': 'veg', salat: 'veg', eple: 'fruit', 'pære': 'fruit',
  banan: 'fruit', drue: 'fruit', 'bær': 'fruit', 'blåbær': 'fruit', mais: 'seed', 'nøtt': 'seed', n_blomst: 'nectar', n_nokkerose: 'water', fisk: 'fish', n_skjell: 'shell' };
const NEVER = {
  grass: ['fisk', 'n_skjell', 'nøtt', 'banan', 'drue'], veg: ['fisk', 'n_skjell', 'nøtt', 'banan', 'drue'],
  fruit: ['fisk', 'n_skjell', 'n_hoyball', 'n_gress'], seed: ['fisk', 'n_skjell', 'n_hoyball', 'n_nokkerose', 'salat', 'banan'],
  nectar: ['fisk', 'n_skjell', 'nøtt', 'mais', 'n_hoyball', 'gulrot', 'kål'], water: ['n_hoyball', 'nøtt', 'banan', 'drue', 'gulrot', 'n_blomst'],
  fish: ['n_gress', 'n_hoyball', 'gulrot', 'nøtt', 'n_blomst', 'banan', 'kål'], shell: ['n_gress', 'n_hoyball', 'gulrot', 'nøtt', 'n_blomst', 'banan'],
};
// animals asked «Hva spiser den?»: a food fact + ≥ 1 food model, not «spiser nesten alt / mye forskjellig»
function matOK(id) {
  const t = TH() && TH().of(id), s = spRow(id); if (!t || !s || !navnOK(s)) return false;
  return !!(t.spiser && t.mat.length && !/nesten alt|mye forskjellig/.test(t.spiser));
}

/* ---------------------------------------------------------- keys → rung */
const RUNG_OF = k => /^VIT:(navn|unge):/.test(k) ? ['VIT', 1] : /^VIT:(mat|hjem):/.test(k) ? ['VIT', 2] : /^ORD:ord:/.test(k) ? ['ORD', 8] : /^ORD:ux:/.test(k) ? ['ORD', 9] : [null, 0];
function taughtKeys(strand, rung) { const v = st(); return Object.keys(v.k).filter(k => { const [s, r] = RUNG_OF(k); return s === strand && r === rung; }); }
VIT.due = (rung, strand) => taughtKeys(strand || 'VIT', rung).filter(VIT.isDue);
VIT.taught = (rung, strand) => taughtKeys(strand || 'VIT', rung);

/* ---------------------------------------------------------- item builders */
function base(strand, rung, sup, key, models, ans, o) {
  const n = models.length;
  shuffle(models, o.rng);
  const idx = models.findIndex(m => mkey(m) === mkey(ans));
  return {
    strand, rung, sup, key, target: ans.word || ans.model, word: null, answer: ans.word || ans.model,
    choices: models.map(m => m.word || m.model), distractors: models.filter((m, i) => i !== idx).map(m => ({ v: m.word || m.model, tag: o.tag || 'OTHER' })),
    g: 1 / Math.max(1, n), mode: 'scene', think: strand === 'VIT' ? 'HUSKE' : 'FORSTÅ', secret: false,
    params: Object.assign({ models: models.map(m => ({ model: m.model, opts: m.opts || null, word: m.word || m.model })), answer: idx }, o.params || {}),
  };
}
const knownAnimals = () => { try { return Object.keys((F.save && F.save.album && F.save.album.friends) || {}); } catch (e) { return []; } };
function genNavn(key, sup, o) {
  const sp = key.split(':')[2], s = spRow(sp); if (!s || !navnOK(s)) return null;
  const ans = modelOf(sp); if (!ans || !voxOK(ans.model)) return null;
  const n = nFor(sup, o);
  // s2: her other friends are the distractors (harder: she knows them all); s0/s1: any other album animals
  const pool = FA().species.filter(x => navnOK(x) && x.id !== sp && x.model !== s.model).map(x => x.id);
  const fr = knownAnimals().filter(id => pool.includes(id));
  const cands = sup >= 2 && fr.length >= n - 1 ? fr : pool;
  const models = animalChoices(ans, cands, n, o.rng);
  if (models.length < 3) return null;
  return base('VIT', 1, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'navn', sp, tpl: 'vit_hvor', slots: { dyr: s.def }, fact: null } }));
}
const BABIES = ['kalv', 'lam', 'føll', 'kattunge', 'valp', 'andunge', 'larve'];
function genUnge(key, sup, o) {
  const mother = key.split(':')[2], t = TH() && TH().of(mother); if (!t || !t.unge || !t.unge.id) return null;
  const baby = t.unge.id, n = nFor(sup, o), rng = o.rng;
  const bt = TH().of(baby), fact = bt && bt.fakta[0] ? bt.fakta[0] : null;
  // v5c WP-A2: o.sub 'mor' | 'unge' fixes the direction (a friend's own Vennestjerne never asks for the friend itself: the mother's card
  // asks «Hvem er ungen til kua?», the baby's card «Hvem er mammaen til kalven?»)
  const tplOK = id => !(F.TPL && F.TPL.has) || F.TPL.has(id);
  const wantMor = o.sub === 'mor' ? tplOK('vit_mor_' + baby) : o.sub === 'unge' ? !tplOK('vit_unge_' + mother)
    : (rng() < 0.5 && F.TPL && F.TPL.has && F.TPL.has('vit_mor_' + baby) || !(F.TPL && F.TPL.has && F.TPL.has('vit_unge_' + mother)));
  if ((o.sub === 'mor' || o.sub === 'unge') && !(o.sub === 'mor' ? wantMor : !wantMor)) return null;
  if (wantMor) {
    // «Hvem er mammaen til kalven?» → the mother among adult animals (other mothers first: they make it about the link, not the look)
    const ans = modelOf(mother); if (!ans || !voxOK(ans.model)) return null;
    const mothers = TH().withBaby().filter(id => id !== mother);
    // never a distractor whose own baby has the same name (an eselføll, a reinkalv, an elgkalv …)
    const others = FA().species.filter(x => navnOK(x) && !BABIES.includes(x.id) && x.id !== mother && !(TH().of(x.id) && TH().of(x.id).unge && String(TH().of(x.id).unge.word).includes(baby))).map(x => x.id);
    let models = animalChoices(ans, mothers, Math.min(n, 1 + mothers.length), rng);
    if (models.length < n) { const more = animalChoices(ans, others.filter(id => !models.some(m => m.sp === id)), n, rng).slice(1); for (const m of more) { if (models.length >= n) break; if (!models.some(x => x.model === m.model)) models.push(m); } }
    if (models.length < 3) return null;
    return base('VIT', 1, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'mor', sp: mother, baby, tpl: 'vit_mor_' + baby, slots: {}, fact } }));
  }
  // «Hvem er ungen til kua?» → the baby among the album babies
  const ans = modelOf(baby); if (!ans || !voxOK(ans.model)) return null;
  const models = animalChoices(ans, BABIES.filter(b => b !== baby), n, rng);
  if (models.length < 3) return null;
  return base('VIT', 1, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'unge', sp: mother, baby, tpl: 'vit_unge_' + mother, slots: {}, fact } }));
}
const FOODWORD = m => (TH() && TH().FOOD[m] ? TH().FOOD[m].word : m);
function genMat(key, sup, o) {
  const sp = key.split(':')[2], t = TH() && TH().of(sp), s = spRow(sp); if (!t || !s || !matOK(sp)) return null;
  const own = t.mat.filter(voxOK); if (!own.length) return null;
  // s2 with ≥ 2 food models: «Trykk på alt kua spiser» – select-all among 6 (g = 1/63; the kit's S.tapAll, F82 falls back to one tap)
  if (sup >= 2 && own.length >= 2 && o.sub !== 'en' && (o.sub === 'alle' || o.rng() < 0.5)) {
    const nv = own.reduce((acc, m) => acc.filter(x => (NEVER[GROUP[m]] || NEVER.grass).includes(x)), Object.keys(GROUP)).filter(m => !t.mat.includes(m) && voxOK(m));
    const k = Math.min(own.length, 3), mine = shuffle(own.slice(), o.rng).slice(0, k), n = Math.min(6, k + nv.length);
    if (n - k >= 2) {
      const models = mine.concat(shuffle(nv.slice(), o.rng).slice(0, n - k)).map(m => ({ model: m, opts: null, word: FOODWORD(m) }));
      shuffle(models, o.rng);
      const it = base('VIT', 2, sup, key, models, models.find(m => m.model === mine[0]), Object.assign({}, o, { params: { kind: 'matAlle', sp, tpl: 'vit_alt', slots: { dyr: s.def }, fact: t.spiser, all: mine.slice() } }));
      it.target = mine.map(FOODWORD).join(','); it.answer = mine.slice().sort(); it.g = 1 / (Math.pow(2, n) - 1); it.mode = 'subset';
      return it;
    }
  }
  // v5c WP-A2: the answer is one of its foods whose «never» list leaves enough distractors (hest + eple left only 3 choices at s1)
  const neverOf = m => (NEVER[GROUP[m]] || NEVER.grass).filter(x => !t.mat.includes(x) && voxOK(x));
  const want = nFor(sup, o) - 1, rich = own.filter(m => neverOf(m).length >= want);
  const ansM = pick(rich.length ? rich : own.slice().sort((a, b) => neverOf(b).length - neverOf(a).length).slice(0, 1), o.rng), ans = { model: ansM, opts: null, word: FOODWORD(ansM) };
  const never = neverOf(ansM);
  const n = Math.min(nFor(sup, o), 1 + never.length);
  const models = [ans].concat(shuffle(never.slice(), o.rng).slice(0, n - 1).map(m => ({ model: m, opts: null, word: FOODWORD(m) })));
  if (models.length < 3) return null;
  return base('VIT', 2, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'mat', sp, tpl: 'vit_spiser', slots: { dyr: s.def }, fact: t.spiser } }));
}
// «Hvor bor bia?» → the home among the home models (bikube, hønsehus, stall, andedam, tre, snøhaug)
function genHjem(key, sup, o) {
  const sp = key.split(':')[2], t = TH() && TH().of(sp), s = spRow(sp); if (!t || !s || !t.hjemF || !t.hjemM || !navnOK(s)) return null;
  const ans = { model: t.hjemM, opts: null, word: t.hjem };
  const others = TH().homeModels().filter(m => m !== t.hjemM && voxOK(m));
  const n = Math.min(nFor(sup, o), 1 + others.length);
  const models = [ans].concat(shuffle(others.slice(), o.rng).slice(0, n - 1).map(m => ({ model: m, opts: null, word: m })));
  if (models.length < 3 || !voxOK(ans.model)) return null;
  return base('VIT', 2, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'hjem', sp, tpl: 'vit_bor', slots: { dyr: s.def }, fact: t.hjemF } }));
}
function genOrd(key, sup, o) {
  const w = key.split(':')[2], e = st().k[key]; if (!TH() || !TH().WORDS.includes(w)) return null;
  // the answer: an animal that taught her this word (else any with it); distractors: animals that do NOT carry the word
  // v5c WP-A2: o.exclude (a friend's family in its own Vennestjerne): the answer must be ANOTHER animal that taught her the word
  const ex = new Set(o.exclude || []), exM = new Set([...ex].map(id => { const m = modelOf(id); return m ? m.model : null; }).filter(Boolean));
  // (a look-alike counts as the friend: the white snow hare is the hare's model in another colour)
  const taught = ((e && e.sp) || []).filter(id => { const t = TH().of(id), m = modelOf(id); return !ex.has(id) && !(m && exM.has(m.model)) && t && t.ord.includes(w) && navnOK(spRow(id)); });
  const all = FA().species.filter(x => navnOK(x) && TH().of(x.id) && TH().of(x.id).ord.includes(w)).map(x => x.id);
  if (ex.size && !taught.length) return null;
  const aid = taught.length ? pick(taught, o.rng) : (all.length ? pick(all, o.rng) : null); if (!aid) return null;
  const ans = modelOf(aid); if (!ans || !voxOK(ans.model)) return null;
  // v5c WP-A2: animals that also fit the word (THEMES.NEAR: a cat is quiet too) are never distractors – a distractor must be clearly wrong
  const near = new Set((TH().NEAR && TH().NEAR[w]) || []);
  const withW = new Set(all), n = nFor(sup, o);
  const pool = FA().species.filter(x => navnOK(x) && !withW.has(x.id) && !near.has(x.id) && TH().of(x.id)).map(x => x.id);
  const models = animalChoices(ans, pool, n, o.rng);
  if (models.length < 3) return null;
  return base('ORD', 8, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'ord', sp: aid, w, tpl: 'ord_t_q', slots: { w }, fact: null, after: ['vit_ordb_' + w] } }));
}
function genUx(key, sup, o) {
  const id = key.split(':')[2], E = TH() && TH().EXPR.find(x => x.id === id); if (!E) return null;
  const aid = E.svar.find(x => x === id) || E.svar[0], ans = modelOf(aid); if (!ans || !voxOK(ans.model)) return null;
  // distractors: other expression animals first (it is about the expression, not about «any animal»), never another right answer
  const exprAnimals = TH().EXPR.map(x => x.id).filter(x => !E.svar.includes(x));
  const others = FA().species.filter(x => navnOK(x) && !E.svar.includes(x.id)).map(x => x.id);
  const n = nFor(sup, o);
  let models = animalChoices(ans, exprAnimals, n, o.rng);
  if (models.length < n) { const more = animalChoices(ans, others, n, o.rng).slice(1); for (const m of more) { if (models.length >= n) break; if (!models.some(x => x.model === m.model)) models.push(m); } }
  if (models.length < 3) return null;
  return base('ORD', 9, sup, key, models, ans, Object.assign({}, o, { params: { kind: 'ux', sp: aid, ux: id, tpl: 'ord_u_q', slots: { s: E.stem }, fact: null, after: ['vit_ux', { u: E.text }] } }));
}
const BUILD = { navn: genNavn, unge: genUnge, mat: genMat, hjem: genHjem, ord: genOrd, ux: genUx };
function build(key, sup, o) { const kind = String(key).split(':')[1]; const fn = BUILD[kind]; return fn ? fn(key, sup, o) : null; }
function gen(strand) {
  return function (rung, sup, rng, o) {
    // v5c WP-A2: VIT.ctx {sub, exclude} – set by befriend.js around ONE forced engine call (the engine does not forward unknown options)
    o = Object.assign({}, VIT.ctx || {}, o || {}, { rng: rng || Math.random });
    if (VIT.ctx && VIT.ctx.sub && !(o && o.sub)) o.sub = VIT.ctx.sub;
    if (!TH() || !FA()) return null;
    const [ks, kr] = o.key ? RUNG_OF(o.key) : [null, 0];
    if (o.key && ks === strand && kr === rung) { const it = build(o.key, sup, o); if (it) return it; }
    const avoid = new Set(o.avoid || []);
    let due = taughtKeys(strand, rung).filter(VIT.isDue);
    // the trial's animal first (themes: o.prefer keys), then the least-recalled, not asked in the last few tasks
    const pref = (o.prefer || []).filter(k => due.includes(k));
    if (pref.length) due = pref;
    const fresh = due.filter(k => !avoid.has(k));
    const list = (fresh.length ? fresh : due).sort((a, b) => VIT.stars(a) - VIT.stars(b) || (o.rng() - 0.5));
    for (const k of list.slice(0, 4)) { const it = build(k, sup, o); if (it) return it; }
    return null;
  };
}
const fitsFn = strand => (rung, key) => { const [s, r] = RUNG_OF(key); return s === strand && r === rung; };
const factsFn = strand => rung => taughtKeys(strand, rung);
function register() {
  // ready(rung): something taught is due now – a strand that only teaches today can rest without share debt (REQUEST WP-E2)
  const ready = strand => rung => (rung == null ? (strand === 'VIT' ? [1, 2] : [8, 9]) : [rung]).some(r => taughtKeys(strand, r).some(VIT.isDue));
  const a = [['VIT', gen('VIT'), { rungs: [1, 2], fits: fitsFn('VIT'), facts: factsFn('VIT'), ready: ready('VIT'), teachFirst: true }],
    ['ORD', gen('ORD'), { rungs: [8, 9], fits: fitsFn('ORD'), facts: factsFn('ORD'), ready: ready('ORD'), teachFirst: true }]];
  if (F.BANKS && typeof F.BANKS.reg === 'function') a.forEach(x => F.BANKS.reg(x[0], x[1], x[2]));
  else { const q = F.REGQ = F.REGQ || []; a.forEach(x => q.push(x)); }
}
register();
VIT.gen = { VIT: gen('VIT'), ORD: gen('ORD'), build };

/* ---------------------------------------------------------- teaching (befriend moment, album card, character lines) */
const SAY = (id, slots) => (F.SAY && F.TPL && F.TPL.has(id) ? F.SAY(id, slots || {}) : Promise.resolve());
// a glitter variant (krystallkatt …) teaches its base species' facts: the keys are the base's
const kidOf = sp => { const s = spRow(sp), t = TH() && TH().of(sp); return s && navnOK(s) ? sp : (t && !t.fairy && t.base && spRow(t.base) ? t.base : null); };
const factKeyOf = (sp, text) => {
  const t = TH() && TH().of(sp), kid = kidOf(sp); if (!t || !kid) return null;
  if (t.spiser && text === t.spiser && matOK(kid)) return 'VIT:mat:' + kid;
  if (t.hjemF && text === t.hjemF && TH().of(kid).hjemF === text) return 'VIT:hjem:' + kid;
  // the baby fact («Kalven er ungen til kua.») teaches the mother's link (from the baby's card or the mother's card)
  const tk = TH().of(kid);
  if (tk.mor && tk.fakta[0] === text && TH().of(tk.mor) && TH().of(tk.mor).unge && TH().of(tk.mor).unge.id === kid) return 'VIT:unge:' + tk.mor;
  if (tk.unge && tk.unge.id) { const bt = TH().of(tk.unge.id); if (bt && bt.fakta[0] === text) return 'VIT:unge:' + kid; }
  return null;
};
// the album fact card: the food fact (if any), the baby fact (for a mother: her baby's sentence), then plain facts – 2–3 in all
VIT.factsFor = function (sp) {
  const t = TH() && TH().of(sp); if (!t) return [];
  const out = [];
  const add = (text, key) => { if (text && !out.some(f => f.text === text) && out.length < 3) out.push({ text, key, stars: key ? VIT.stars(key) : 0, heard: key ? VIT.known(key) : (st().k['F:' + text] ? st().k['F:' + text].e : 0), gold: key ? VIT.gold(key) : false, seen: !!(key && st().k[key] && st().k[key].seen) }); };
  if (t.spiser) add(t.spiser, factKeyOf(sp, t.spiser));
  if (t.hjemF) add(t.hjemF, factKeyOf(sp, t.hjemF));
  if (t.unge && t.unge.id) { const bt = TH().of(t.unge.id); if (bt && bt.fakta[0]) add(bt.fakta[0], factKeyOf(sp, bt.fakta[0])); }
  for (const f of t.fakta) add(f, factKeyOf(sp, f));
  return out;
};
// the animal's words and expression, in teaching order (expression first when it has one, then its tier-2 words)
VIT.wordsFor = function (sp) {
  const t = TH() && TH().of(sp); if (!t) return [];
  const out = [];
  if (t.uttrykk) out.push({ kind: 'ux', text: t.uttrykk.text, tpl: 'vit_ux', slots: { u: t.uttrykk.text }, mean: 'vit_uxb_' + t.uttrykk.id, key: 'ORD:ux:' + t.uttrykk.id });
  for (const w of t.ord) out.push({ kind: 'ord', text: w, tpl: 'vit_ord', slots: { w }, mean: 'vit_ordb_' + w, key: 'ORD:ord:' + w });
  return out;
};
// v5c WP-A2: the word the friend teaches NOW – the first one still short of its 3 exposures (consolidate before anything new), so a
// friend with an expression and two words teaches all three over the days (WP-A: only the first was ever taught); all learned → the
// least recalled one
VIT.wordFor = function (sp) {
  const ws = VIT.wordsFor(sp); if (!ws.length) return null;
  return ws.find(w => VIT.known(w.key) < NEED(w.key)) || ws.slice().sort((a, b) => VIT.stars(a.key) - VIT.stars(b.key))[0];
};
// hear one fact (album tap / teaching): counts an exposure of its key (plain facts are remembered for the card's «heard» dot)
VIT.sayFact = function (sp, text) {
  let key = factKeyOf(sp, text);
  if (key && !VIT.known(key) && !VIT.canNew('f')) key = null;      // over today's «new facts» cap: heard, but not a quiz key yet
  VIT.expose(key || 'F:' + text, sp);
  return SAY('vit_fakta', { f: text });
};
VIT.sayWord = async function (sp, wd) {
  wd = wd || VIT.wordFor(sp); if (!wd) return;
  if (VIT.known(wd.key) || VIT.canNew('w')) VIT.expose(wd.key, sp);   // ≤ 2 new words / expressions a day become quiz keys
  await SAY(wd.tpl, wd.slots);
  await SAY(wd.mean);
};
// the befriend moment (only when F.Befriend.teachOn – off since the natural audit 11.10.): one NEW fact (+ a new word / expression),
// within the daily caps. Natural audit D1: it never replays something she has already heard (over the cap it says nothing – the album
// card's rows, F.VIT.teachOne, are where she hears a fact again, and that still counts as an exposure). o.newOnly: the same (kept).
VIT.teach = async function (sp, o) {
  o = o || {};
  const t = TH() && TH().of(sp); if (!t) return null;
  const facts = VIT.factsFor(sp);
  const f = facts.find(x => x.key && !VIT.known(x.key) && VIT.canNew('f')) || facts.find(x => !x.key && !x.heard && VIT.canNew('f')) || null;
  const said = { fact: null, word: null };
  if (f) { await SAY('vit_visste'); if (o.onFact) { try { o.onFact(f); } catch (e) { /* decor */ } } await VIT.sayFact(sp, f.text); said.fact = f.text; }
  // the word / expression: only a new one (≤ 2 a day) – a known word is heard again on the album card
  const wd = VIT.wordFor(sp);
  if (wd && !o.noWord && !VIT.known(wd.key) && VIT.canNew('w')) {
    if (o.act) { try { o.act(wd); } catch (e) { /* decor */ } }
    await VIT.sayWord(sp, wd); said.word = wd.text;
  }
  return said;
};
// a name heard (bf_friend line, album card tap)
VIT.heardName = sp => { const s = spRow(sp); if (s && navnOK(s)) VIT.expose('VIT:navn:' + sp, sp); };

/* ---------------------------------------------------------- v5c WP-A2: one star system per friend (friendship × knowledge)
   A Vennestjerne (befriend.js) is won by remembering something the friend taught her, on a later day: the mini-trial's recall slot asks
   one of the FRIEND'S OWN keys that can be asked without the friend itself being the answer (it stands right there – that would hand her
   the answer): its food (VIT:mat), its home (VIT:hjem), its baby / mother link in the direction that names the friend (the mother's card
   asks for the baby, the baby's card for the mother), its tier-2 word only when ANOTHER animal taught her the same word (that animal is
   the answer). Names («Hvor er ekornet?») and expressions («Stille som en …?») of the friend itself are never asked in its own trial.
   A friend with no askable key at all (45 of 110 species: no food / home / baby fact with a model) asks one other due fact instead –
   the star is still knowledge, never a guess.
     F.VIT.family(sp) -> [species ids]      the friend, its base species and the base's glitter variants
     F.VIT.ownKeys(sp) -> [{key, sub, exclude}]   every key of the friend that its own trial may ask (taught or not)
     F.VIT.starKeys(sp) -> [{key, sub, exclude, own}]   what its Vennestjerne may ask NOW (due: taught ≥ 2 / 3 times, ≥ 1 day ago, not
                                         heard in the last 2 h, not asked today) – own keys first (least recalled first), others only when
                                         the friend has no own key at all
     F.VIT.cardFor(sp) -> {facts:[{text, key, heard, recalled, gold}], word:{…wordFor, heard, recalled, gold}|null, words:[…]}   the album
                                         card (words = the ones it taught + the next one as «?»)
     F.VIT.wordsFor(sp) -> all its words / expression in teaching order; F.VIT.wordFor(sp) = the one it teaches now (rotates)
     F.VIT.teachOne(sp, 'fact'|'word', text?) -> Promise<'taught'|'again'|'cap'|'none'>   an album «?» row: teach the next new one
     F.VIT.petPick(sp) -> {kind:'fact', text} | {kind:'word', wd} | null   what petting the friend may say: never a due key (that is kept
                                         for the recall), first a key that still needs exposures, then a new one within today's caps */
const BASE = sp => { try { return (TH() && TH().baseOf) ? TH().baseOf(sp) : sp; } catch (e) { return sp; } };
VIT.family = function (sp) {
  const b = BASE(sp), out = new Set([sp, b]);
  try { const bo = TH().BASE_OF || {}; for (const v in bo) if (bo[v] === b) out.add(v); } catch (e) { /* data */ }
  return [...out];
};
const recalledN = key => { const e = st().k[key]; return e ? e.rc.length : 0; };
VIT.ownKeys = function (sp) {
  const t = TH() && TH().of(sp), kid = kidOf(sp); if (!t || !kid) return [];
  const tk = TH().of(kid), out = [], fam = VIT.family(sp);
  if (matOK(kid)) out.push({ key: 'VIT:mat:' + kid });
  if (tk.hjemF && tk.hjemM && navnOK(spRow(kid))) out.push({ key: 'VIT:hjem:' + kid });
  if (tk.unge && tk.unge.id && (!(F.TPL && F.TPL.has) || F.TPL.has('vit_unge_' + kid))) out.push({ key: 'VIT:unge:' + kid, sub: 'unge' });
  if (tk.mor && TH().of(tk.mor) && TH().of(tk.mor).unge && TH().of(tk.mor).unge.id === kid) out.push({ key: 'VIT:unge:' + tk.mor, sub: 'mor' });
  // its words: askable only through another animal that taught the same word (checked when due: starKeys)
  (t.ord || []).forEach(w => out.push({ key: 'ORD:ord:' + w, exclude: fam, viaOther: true }));
  return out;
};
const otherTeacher = (key, fam) => { const e = st().k[key]; if (!e) return false; const w = key.split(':')[2];
  const fm = new Set(fam.map(id => (modelOf(id) || {}).model).filter(Boolean));         // a look-alike (snow hare / hare) is no «other»
  return (e.sp || []).some(id => !fam.includes(id) && !fm.has((modelOf(id) || {}).model) && TH().of(id) && TH().of(id).ord.includes(w) && navnOK(spRow(id))); };
// can the generator really build this row now? (a star invitation must never lead to a trial without its recall)
const buildable = row => { try { return !!build(row.key, 1, { rng: Math.random, sub: row.sub, exclude: row.exclude }); } catch (e) { return false; } };
VIT.starKeys = function (sp) {
  const own = VIT.ownKeys(sp), fam = VIT.family(sp);
  const askable = own.filter(k => !k.viaOther || otherTeacher(k.key, fam));
  const due = askable.filter(k => VIT.isDue(k.key) && buildable(k)).sort((a, b) => recalledN(a.key) - recalledN(b.key));
  if (due.length) return due.map(k => Object.assign({ own: true }, k));
  if (own.some(k => !k.viaOther)) return [];               // it has facts of its own: they come due on a later day (petting teaches them)
  // no askable key of its own: one other due fact / word (never a name; never one whose answer is this friend)
  const other = [].concat(VIT.due(1, 'VIT'), VIT.due(2, 'VIT'), VIT.due(8, 'ORD'), VIT.due(9, 'ORD')).filter(k => !/^VIT:navn:/.test(k));
  const out = [], famM = new Set(fam.map(id => (modelOf(id) || {}).model).filter(Boolean));
  const like = id => fam.includes(id) || famM.has((modelOf(id) || {}).model);     // the friend, or an animal that looks like it
  for (const key of other) {
    if (/^ORD:ux:/.test(key)) { const E = TH().EXPR.find(x => x.id === key.split(':')[2]); if (!E || E.svar.some(like)) continue; }
    if (/^VIT:unge:/.test(key)) { const m = key.split(':')[2], u = TH().of(m) && TH().of(m).unge; if (like(m) || (u && u.id && like(u.id))) continue; }
    if (/^VIT:(mat|hjem):/.test(key) && fam.includes(key.split(':')[2])) continue;
    const row = { key, exclude: /^ORD:ord:/.test(key) ? fam : undefined, own: false };
    if (buildable(row)) out.push(row);
  }
  return out.sort((a, b) => recalledN(a.key) - recalledN(b.key));
};
VIT.cardFor = function (sp) {
  const facts = VIT.factsFor(sp).map(f => Object.assign({}, f, { recalled: f.key ? recalledN(f.key) : 0 }));
  const row = wd => Object.assign({}, wd, { heard: VIT.known(wd.key), recalled: recalledN(wd.key), gold: VIT.gold(wd.key) });
  // the words / expression it taught her (heard), then the next one as a «?» row
  const ws = VIT.wordsFor(sp), heard = ws.filter(w => VIT.known(w.key) > 0), next = ws.find(w => !VIT.known(w.key));
  const words = heard.concat(next ? [next] : []).map(row);
  const wd = VIT.wordFor(sp);
  return { facts, word: wd ? row(wd) : null, words };
};
// an album «?» row: she asks to hear something new about her friend (within today's caps; a heard one is simply said again)
VIT.teachOne = async function (sp, kind, text) {
  if (kind === 'word') {
    const wd = (text && VIT.wordsFor(sp).find(w => w.key === text || w.text === text)) || VIT.wordFor(sp); if (!wd) return 'none';
    if (!VIT.known(wd.key) && !VIT.canNew('w')) return 'cap';
    const was = VIT.known(wd.key); await VIT.sayWord(sp, wd); return was ? 'again' : 'taught';
  }
  const fs = VIT.factsFor(sp);
  const f = (text && fs.find(x => x.text === text)) || fs.find(x => !x.heard) || null; if (!f) return 'none';
  if (f.heard) { await VIT.sayFact(sp, f.text); return 'again'; }
  if (!VIT.canNew('f')) return 'cap';
  await SAY('vit_visste'); await VIT.sayFact(sp, f.text); return 'taught';
};
VIT.petPick = function (sp) {
  const fs = VIT.factsFor(sp), wd = VIT.wordFor(sp);
  const need = k => { const e = st().k[k]; return e && e.e < NEED(k) && !fresh(e); };            // heard, still short of its exposures
  const f1 = fs.find(f => f.key && need(f.key)); if (f1) return { kind: 'fact', text: f1.text };
  if (wd && need(wd.key)) return { kind: 'word', wd };
  const f2 = fs.find(f => f.key && !VIT.known(f.key) && VIT.canNew('f')); if (f2) return { kind: 'fact', text: f2.text, isNew: true };
  if (wd && !VIT.known(wd.key) && VIT.canNew('w')) return { kind: 'word', wd, isNew: true };
  const f3 = fs.find(f => !f.key && !f.heard); if (f3 && VIT.canNew('f')) return { kind: 'fact', text: f3.text, isNew: true };   // a plain fact (never asked)
  return null;
};

// for the parent page (DESIGN4 §10: «parent page lists learned words/expressions»): what was taught, what she recalls, what is gold
VIT.summary = function () {
  const v = st(), out = { facts: [], words: [], expressions: [], names: 0, today: Object.assign({}, v.nd) };
  for (const k in v.k) {
    const e = v.k[k], row = { key: k, heard: e.e, recalls: e.rc.length, gold: e.rc.length >= 3, due: VIT.isDue(k), inDays: VIT.dueIn(k) };
    if (/^VIT:navn:/.test(k)) out.names++;
    else if (/^VIT:/.test(k)) out.facts.push(row);
    else if (/^ORD:ord:/.test(k)) out.words.push(Object.assign(row, { word: k.split(':')[2] }));
    else if (/^ORD:ux:/.test(k)) { const E = TH() && TH().EXPR.find(x => x.id === k.split(':')[2]); out.expressions.push(Object.assign(row, { text: E ? E.text : k })); }
  }
  return out;
};

/* ---------------------------------------------------------- F82 Faktakortet: tap the right model, the fact clip is the feedback */
const F82 = {
  strands: { VIT: [1, 2], ORD: [8, 9] }, places: ['any', 'dyr', 'album'], family: 'fakta', mode: 'scene', portable: true,
  g: it => (it && typeof it.g === 'number' ? it.g : 0.25), noAutoSecret: true,
  tpl: ['vit_hvor', 'vit_spiser', 'vit_alt', 'vit_bor', 'ord_t_q', 'ord_u_q', 'vit_fakta'],
  async run(item, S) {
    const p = item.params || {}, models = (p.models || []).map(m => ({ model: m.model, opts: m.opts || undefined, word: m.word }));
    item.secret = false;
    // hints: never letter sounds (wordHint) – a look cue after the 1st error; the solution glow after the 2nd (protocol)
    // the cue fits the question kind: food → what kind of food, baby → babies look like their mothers, home / name / word → where to look
    const t = TH() && p.sp ? TH().of(p.sp) : null;
    const hid = (p.kind === 'mat' || p.kind === 'matAlle') ? (t && (t.mat || []).some(m => m === 'fisk' || m === 'n_skjell') ? 'vit_h_fisk' : 'vit_h_plante')
      : p.kind === 'mor' || p.kind === 'unge' ? (p.baby === 'larve' ? 'vit_h_larve' : 'vit_h_ligner') : p.kind === 'hjem' ? 'vit_h_hjem' : p.kind === 'navn' ? 'vit_h_navn' : 'vit_h_ord';
    S.hint = async () => { S.hinting = true; try { await S.say(F.TPL.has(hid) ? hid : 'kit_h_look', {}, ''); } catch (e) { /* speech */ } S.hinting = false; };
    if (p.kind === 'matAlle' && !S.tapAll && F.TPL.has('vit_spiser')) { p.tpl = 'vit_spiser'; item.g = 1 / Math.max(1, models.length); item.mode = 'scene'; }
    if (p.tpl && F.TPL.has(p.tpl)) S.prompt(p.tpl, p.slots || {}, { voice: '' }); else S.prompt(null);
    if (p.kind === 'matAlle' && S.tapAll) await S.tapAll(models.map(m => ({ v: m.model, model: m.model, opts: m.opts, label: m.word })), { answer: p.all.slice().sort() });
    else await S.objects(models, { answer: p.answer, size: 1.1 });
    const res = S.result();
    try { VIT.recall(item.key, res.outcome === 'A'); } catch (e) { /* state */ }
    await S.ok();
    // the fact (or the word's meaning / the whole expression) is the feedback – the same clip that taught it
    try {
      if (p.fact) { VIT.expose(item.key, p.sp); await S.say('vit_fakta', { f: p.fact }, ''); }
      else if (Array.isArray(p.after)) { const [id, sl] = p.after; if (F.TPL.has(id)) await S.say(id, sl || {}, ''); }
    } catch (e) { console.warn('F82 feedback', e); }
    return res;
  },
};
try { if (F.Task && typeof F.Task.def === 'function') F.Task.def('F82', F82); else { F.Task = F.Task || { defs: {} }; (F.Task.defs = F.Task.defs || {}).F82 = F82; } } catch (e) { /* Node */ }
if (F.on) F.on('boot', () => { try { if (F.Task && F.Task.defs && F.Task.defs.F82 !== F82 && F.Task.def) F.Task.def('F82', F82); } catch (e) { /* ignore */ } });
VIT.F82 = F82;
// debug / parent check: F.dbg.vitDay(n = 1) pretends n days have passed for everything taught (taught facts and words become due)
if (F.on) F.on('ready', () => {
  const dbg = F.dbg = F.dbg || {};
  dbg.vitDay = n => { n = n == null ? 1 : +n; const v = st(); for (const k in v.k) { const e = v.k[k]; e.d0 -= n; e.dl -= n; if (e.tl != null) e.tl -= n * 864e5; e.days = e.days.map(d => d - n); e.rc = e.rc.map(d => d - n); if (e.lastAsk != null) e.lastAsk -= n; } store(); return VIT.summary(); };
  dbg.vit = () => VIT.summary();
});
VIT.patchLadders = patchLadders;
})();
