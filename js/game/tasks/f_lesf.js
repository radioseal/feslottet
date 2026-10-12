/* Feslottet – WP-L comprehension (DESIGN5 §1 WP-L, DESIGN4 §4.3, SYNTHESIS §2.5 LES-F + §3.2 F78/F79). Owner: WP-L.
   Story bank text: js/speech/lines_lesf.js (F.LESF_BANK + templates). This file = the LES-F generator (pure JS, Node-testable:
   tests/v4_wpl.js --node) + the two formats (browser only).

   GENERATOR  F.LESF.gen(rung, sup, rng, o) -> item   (registered: F.BANKS.reg('LES-F', fn, {rungs:[1,2,3,4], fits}))
     LF1 'story'  2-sentence spoken micro-story; question who / what / where; tap the answer among 6 (s0) / 8 (s1) / 9 (s2) things of
                  the answer's own class (people, animals, things, places). The other story entity of that class is always on the board
                  (tag ORDER-OF-MENTION / NEAREST-NOUN); the rest are unmentioned (tag UNMENTIONED).         target = index, g = 1/n
     LF2 'instr'  one instruction with negation / quantifiers (to, ikke tre · alle, men ikke · hver · bare · både … og · den største)
                  carried out in the scene: tap every thing that should get / go + Ferdig.  target = sorted indices
                  (count items: any n of the right kind – params.ans {key, n}; target = one canonical choice), g = subset / 1/k
     LF3 'story'  the LF1 text is READ (shown, not spoken) + the evidence word: step 1 tap the answer, step 2 tap the word in the text
                  that shows it (params.ev: what/where → the answer word; who → the words linking the sentence to the question, never
                  the answer's own name).  2T, g = 1/n · |ev|/words                                       target = index (step 1)
     LF4 'cards'  3–4 story cards (s0: logical stories, no extra card; s1/s2: 1 extra card that was not in the story stays out).
                  target = [card keys in story order], g = 1/P(n+e, n)
     Every item: strand 'LES-F', rung, sup, key 'LES-F:<rung>:<story>[:<q>]', target/answer, distractors [{v, tag}], params, g, mode,
     think 'FORSTÅ', secret [] (nothing spoken is the answer; LF3 text is the stimulus).
     Stories are spoken while LES < L9 and read after (F78 decides at run time from F.LEARN.strand('LES').rung; LF3 is always read).
     The rung → kind map follows the ladder's rung records (kindOf: 'can' text / LES prereq), so WP-E2 may re-order LF3/LF4 freely;
     F78/F79 compute their served rungs from it at load.  F.LESF.about(species|model) → review keys of the stories about it (WP-A
     encounters: F.Task.offer({strands:['LES-F'], prefer: F.LESF.about('ekorn')})).
   FORMATS
     F78 Fortellerstolen (LES-F 1–3): a floating story diorama (F.NUM.Board): Puff tells the story from the library armchair (indoors)
         or the campfire (outdoors); the things to tap stand in two rows. A wrong tap is acted out (look-back: HER choice moves / wobbles),
         the hint replays the story (listening stimulus); after the answer the scene acts the story out (the mover hops to the place).
         Re-deal after the 1st error (the wrongly tapped unmentioned thing is replaced, the answer swaps places); «Hjelp meg» = one
         unmentioned thing leaves + the story again (LF1) / one right thing chosen or a wrong one taken back (LF2). People wear a
         name plaque (Mia and Ole look alike). Puff's replay of a READ story counts as reading help (B). LF2 selection taps are never
         refused (playtest «early taps»); Ferdig goes through the think-gate.
         Fallback without F.NUM.Board: S.objects (single tap) / S.tapAll (LF2).
     F79 Bildehylla (LES-F 4 + LOGIKK 3 via F.REASON.gen('LOGIKK', 3, …)): kit ordering shelf S.order (one extra card stays out);
         after the answer the story is retold card by card. Lo3: clues spoken (lines_reason lo3_*), ask 'line' → S.order of the
         children / pets (names on the cards), ask first/last → tap one (S.objects thumbs).
   Public (tests): F.LESF.{ENT, POOL, LOOK, gen, check, selfTest, keysOf, kindOf, rungOfKind, about, storyOfKey, cur {format, item, K, Sc, w}}. */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};
const LS = F.LESF = F.LESF || {};

/* =====================================================================================================================
   1. entities: key → [VOX model, class, sub, size]   class: who | what | where   (sub: person | animal for 'who')
   ===================================================================================================================== */
const ENT = {
  // people (the game's cast)
  mia: ['ch_mia', 'who', 'person'], ole: ['ch_ole', 'who', 'person'], konge: ['ch_konge', 'who', 'person'], dronning: ['ch_dronning', 'who', 'person'],
  kokk: ['ch_kokk', 'who', 'person'], tor: ['ch_tor', 'who', 'person'], per: ['ch_per', 'who', 'person'], siv: ['ch_siv', 'who', 'person'],
  rolf: ['ch_rolf', 'who', 'person'],
  // animals
  pus: ['ch_pus', 'who', 'animal'], tass: ['ch_tass', 'who', 'animal'], katt: ['katt', 'who', 'animal'], hund: ['hund', 'who', 'animal'],
  hest: ['hest', 'who', 'animal'], sau: ['sau', 'who', 'animal'], ku: ['ku', 'who', 'animal'], geit: ['geit', 'who', 'animal'], gris: ['gris', 'who', 'animal'],
  hone: ['høne', 'who', 'animal'], hane: ['hane', 'who', 'animal'], and: ['and', 'who', 'animal'], svane: ['svane', 'who', 'animal'],
  ekorn: ['ekorn', 'who', 'animal'], mus: ['mus', 'who', 'animal'], frosk: ['frosk', 'who', 'animal'], ugle: ['ugle', 'who', 'animal'],
  pinnsvin: ['pinnsvin', 'who', 'animal'], kanin: ['kanin', 'who', 'animal'], bie: ['bie', 'who', 'animal'], sommerfugl: ['sommerfugl', 'who', 'animal'],
  kylling: ['tmp_chick', 'who', 'animal'], snegl: ['snegl', 'who', 'animal'], marihone: ['marihøne', 'who', 'animal'], rev: ['rev', 'who', 'animal'],
  hare: ['hare', 'who', 'animal'], radyr: ['rådyr', 'who', 'animal'], lam: ['lam', 'who', 'animal'], kalv: ['kalv', 'who', 'animal'], larve: ['larve', 'who', 'animal'],
  // things
  ball: ['ball', 'what'], bamse: ['bamse', 'what'], skjold: ['skjold', 'what'], pinne: ['pinne', 'what'], gulrot: ['gulrot', 'what'], gress: ['gress', 'what'],
  'nøtt': ['nøtt', 'what'], nott: ['nøtt', 'what'], eple: ['eple', 'what'], paere: ['pære', 'what'], potet: ['potet', 'what'], hatt: ['hatt', 'what'], lue: ['w_vinterlue', 'what'],
  kopp: ['kopp', 'what'], bok: ['bok', 'what'], fjaer: ['fjær', 'what'], kake: ['kake', 'what'], vase: ['vase', 'what'], kjelke: ['kjelke', 'what'],
  snomann: ['n_snomann', 'what'], gitar: ['gitar', 'what'], tromme: ['tromme', 'what'], gave: ['gave', 'what'], drage: ['drage', 'what'], vott: ['vott', 'what'],
  egg: ['egg', 'what'], bolle: ['bolle', 'what'], kjeks: ['kjeks', 'what'], blomst: ['blomst', 'what'], fisk: ['o_fisk', 'what'], is: ['is', 'what'],
  bein: ['gift_bein', 'what'], brod: ['brød', 'what'], korn: ['o_melsekk', 'what'], fro: ['frø', 'what'], vannkanne: ['gift_vannkanne', 'what'],
  bukett: ['ch_prop_bukett', 'what'], melsekk: ['tmp_c_melsekk', 'what'], ovn: ['ovn', 'what'], skal: ['skål', 'what'], melk: ['melk', 'what'],
  garn: ['gift_garnnøste', 'what'], pute: ['pute', 'what'], grot: ['grøt', 'what'], jakke: ['jakke', 'what'], snoball: ['o_snoball', 'what'],
  brev: ['brev', 'what'], sykkel: ['sykkel', 'what'], suppe: ['suppe', 'what'], sky: ['sky', 'what'], stovel: ['støvel', 'what'],
  pytt: ['o_vannpytt', 'what'], handkle: ['cz_handkle', 'what'], sol: ['sol', 'what'], sno: ['n_snohaug', 'what'], stige: ['stige', 'what'],
  lampe: ['lampe', 'what'], lys: ['lys', 'what'], ballong: ['ch_prop_ballong', 'what'], gryte: ['gryte', 'what'], blyant: ['blyant', 'what'],
  saks: ['saks', 'what'],
  // places / containers
  kurv: ['kurv', 'where'], bord: ['bord', 'where'], eske: ['eske', 'where'], seng: ['seng', 'where'], benk: ['benk', 'where'], stein: ['stein', 'where'],
  busk: ['busk', 'where'], tre: ['tre', 'where'], hylle: ['hylle', 'where'], sofa: ['sofa', 'where'], bronn: ['brønn', 'where'], lave: ['låve', 'where'],
  bat: ['båt', 'where'], bro: ['bro', 'where'], telt: ['telt', 'where'], hytte: ['hytte', 'where'], skap: ['skap', 'where'], botte: ['bøtte', 'where'],
  hoy: ['n_hoyball', 'where'], stol: ['stol', 'where'], fat: ['tmp_c_fruktfat', 'where'], sivet: ['n_siv', 'where'], blad: ['blad', 'where'],
};
// look-alikes that never stand together unless both are in the story (Pus is a cat, Tass a dog …)
const LOOK = [['pus', 'katt'], ['tass', 'hund'], ['hone', 'hane', 'kylling'], ['and', 'svane'], ['nøtt', 'nott'], ['kurv', 'botte'], ['sau', 'geit', 'lam'], ['ku', 'kalv'], ['kanin', 'hare'], ['bie', 'marihone']];
const lookOf = k => LOOK.find(g => g.includes(k)) || [k];
// the classes the distractors come from (people mostly with people, animals with animals)
const POOL = {
  person: ['mia', 'ole', 'konge', 'dronning', 'kokk', 'tor', 'per', 'siv', 'rolf'],
  animal: ['pus', 'tass', 'hest', 'sau', 'ku', 'geit', 'gris', 'hone', 'and', 'ekorn', 'mus', 'frosk', 'ugle', 'pinnsvin', 'kanin', 'bie', 'sommerfugl', 'snegl',
    'marihone', 'rev', 'hare', 'radyr', 'lam', 'kalv'],
  what: ['ball', 'bamse', 'skjold', 'pinne', 'gulrot', 'nøtt', 'eple', 'hatt', 'lue', 'kopp', 'bok', 'fjaer', 'kake', 'vase', 'kjelke', 'snomann', 'gitar', 'tromme',
    'gave', 'drage', 'vott', 'egg', 'bolle', 'fisk', 'blomst'],
  where: ['kurv', 'bord', 'eske', 'seng', 'benk', 'stein', 'busk', 'tre', 'hylle', 'sofa', 'bronn', 'lave', 'bat', 'bro', 'telt', 'hytte', 'skap', 'botte', 'stol', 'blad'],
};
// people wear a small name plaque on the board (Mia and Ole look alike; the plaque is identification, not the tested skill)
const NAME = { mia: 'Mia', ole: 'Ole', konge: 'Kongen', dronning: 'Dronningen', kokk: 'Kokken', tor: 'Tor', per: 'Per', siv: 'Siv', rolf: 'Rolf' };
const classOf = k => { const e = ENT[k]; if (!e) return null; return e[1] === 'who' ? e[2] : e[1]; };
const hasModel = m => { const V = F.VOX; return !V || typeof V.has !== 'function' || V.has(m); };
const entOk = k => !!ENT[k] && hasModel(ENT[k][0]);
const obj = (k, extra) => Object.assign({ key: k, model: ENT[k][0] }, extra || {});

/* =====================================================================================================================
   2. the generator (pure, rng-driven)
   ===================================================================================================================== */
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const perm = (n, k) => { let f = 1; for (let i = 0; i < k; i++) f *= (n - i); return f; };
const choose = (n, k) => { let f = 1; for (let i = 0; i < k; i++) f = f * (n - i) / (i + 1); return Math.round(f); };
const bank = () => F.LESF_BANK || null;
// the story part of a key ('LES-F:1:kurv:2' → 'kurv') – recently used stories are avoided
const storyOfKey = k => { const m = /^LES-F:\d:([^:]+)/.exec(String(k || '')); return m ? m[1] : null; };
function avoidSet(o) { const s = new Set(); (o && Array.isArray(o.avoid) ? o.avoid : []).forEach(k => { const st = storyOfKey(k); if (st) s.add(st); }); return s; }
function keyWanted(o, rung) { const k = o && typeof o.key === 'string' ? o.key : null; if (!k || k.indexOf('LES-F:' + rung + ':') !== 0) return null; const p = k.split(':'); return { story: p[2] || null, q: p[3] != null ? +p[3] : null }; }
const THINK = 'FORSTÅ';
function item(rung, sup, f) {
  const it = Object.assign({ strand: 'LES-F', rung, sup, choices: null, distractors: [], secret: [], think: THINK, word: null, text: null, say: null, twin: null }, f);
  if (it.answer === undefined) it.answer = it.target;
  if (it.accept === undefined) it.accept = Array.isArray(it.target) ? null : [it.target];
  it.params = it.params || {};
  it.g = Math.max(0.0001, Math.min(1, it.g == null ? 0.1 : it.g));
  return it;
}
// distractors for LF1/LF3: the story lure + unmentioned things of the answer's class (never a look-alike of a story entity)
function sceneFor(st, q, n, r) {
  const cls = classOf(q.a), mentioned = new Set(st.q.flatMap(x => [x.a, x.lure]));
  const block = new Set(); [q.a, q.lure].forEach(k => lookOf(k).forEach(x => block.add(x)));
  let pool = (cls === 'person' || cls === 'animal') ? POOL[cls].slice() : POOL[cls] ? POOL[cls].slice() : [];
  if (cls === 'person') pool = pool.concat(shuffle(r, POOL.animal).slice(0, 2));           // a couple of animals among the people
  if (cls === 'animal') pool = pool.concat(shuffle(r, POOL.person).slice(0, 2));
  pool = shuffle(r, pool.filter(k => entOk(k) && !block.has(k) && !mentioned.has(k) && classOf(k) != null));
  const used = new Set([q.a, q.lure]); const out = [q.a, q.lure];
  for (const k of pool) { if (out.length >= n) break; if (used.has(k) || lookOf(k).some(x => used.has(x) && x !== k)) continue; out.push(k); used.add(k); }
  return out.length >= Math.min(n, 6) ? shuffle(r, out) : null;
}
function genStory(rung, sup, r, o, readRung) {
  const B = bank(); if (!B) return null;
  const want = keyWanted(o, rung), av = avoidSet(o);
  const read = !!readRung;
  // candidates: (story, question) with models; LF3 needs evidence words
  let cands = [];
  B.LF1.forEach(st => st.q.forEach((q, qi) => { if (entOk(q.a) && entOk(q.lure) && (!read || (q.ev && q.ev.length))) cands.push([st, qi]); }));
  if (want && want.story) { const c = cands.filter(([st, qi]) => st.id === want.story && (want.q == null || qi === want.q)); if (c.length) cands = c; }
  else { const fresh = cands.filter(([st]) => !av.has(st.id)); if (fresh.length) cands = fresh; }
  for (let t = 0; t < 12 && cands.length; t++) {
    const [st, qi] = pick(r, cands), q = st.q[qi];
    const n = sup <= 0 ? 6 : sup === 1 ? 8 : 9;
    const keys = sceneFor(st, q, n, r); if (!keys) continue;
    const target = keys.indexOf(q.a), lureI = keys.indexOf(q.lure);
    const lureLast = st.s.length > 1 && st.s[st.s.length - 1] && q.si !== st.s.length - 1;   // the lure's sentence came last (recency)
    const distractors = keys.map((k, i) => i === target ? null : { v: i, tag: i === lureI ? (lureLast ? 'ORDER-OF-MENTION' : 'NEAREST-NOUN') : 'UNMENTIONED' }).filter(Boolean);
    const props = (q.act || []).filter(k => entOk(k) && !keys.includes(k));
    const words = st.s.join(' ').split(/\s+/).filter(Boolean);
    const evIdx = read ? evidenceOf(st, q) : [];
    if (read && !evIdx.length) continue;
    const g = read ? (1 / keys.length) * (evIdx.length / words.length) : 1 / keys.length;
    return item(rung, sup, { key: 'LES-F:' + rung + ':' + st.id + ':' + qi, target, mode: read ? 'twostep' : 'scene', g, distractors,
      params: { kind: 'story', story: st.id, qi, k: q.k, sents: st.s.map((_, i) => 'lf1_' + st.id + '_' + i), qTpl: 'lf1_' + st.id + '_q' + qi, si: q.si,
        objs: keys.map(k => obj(k)), act: q.act ? q.act.slice() : null, props: props.map(k => obj(k)), answerKey: q.a, lure: q.lure,
        read, text: read ? st.s.slice() : null, words: read ? words : null, ev: read ? evIdx : null } });
  }
  return null;
}
const norm = w => String(w).toLowerCase().replace(/[.,!?:;«»"]/g, '');
// LF3 evidence: the words of the answer sentence that link it to the question («Hvem sov i kurven?» → sov, kurven) + the bank's ev list;
// never the answer's own name (that is step 1 again) and never small function words. Indices into the whole text.
const STOP = new Set(['i', 'på', 'en', 'et', 'ei', 'av', 'med', 'til', 'og', 'sin', 'sitt', 'seg', 'den', 'det', 'de', 'som', 'fra', 'hvem', 'hva', 'hvor', 'opp']);
const stem = w => norm(w).slice(0, 4);
function evidenceOf(st, q) {
  const words = st.s.join(' ').split(/\s+/).filter(Boolean);
  let off = 0; for (let k = 0; k < q.si; k++) off += st.s[k].split(/\s+/).filter(Boolean).length;
  const sent = st.s[q.si].split(/\s+/).filter(Boolean);
  const qw = q.q.split(/\s+/).map(norm).filter(w => w.length >= 3 && !STOP.has(w));
  const ansWords = new Set([q.a, (NAME[q.a] || '')].map(x => norm(x)).concat((NAME[q.a] || '').split(' ').map(norm)));
  const out = [];
  sent.forEach((w, j) => {
    const n = norm(w); if (!n || STOP.has(n) || (ansWords.has(n) && !(q.ev || []).some(e => norm(e) === n))) return;
    // what / where: the answer word itself is the evidence (the bank's ev); who: also the words that link the sentence to the question
    if ((q.ev || []).some(e => norm(e) === n) || (q.k === 'who' && qw.some(x => stem(x) === stem(n) && n.length >= 3))) out.push(off + j);
  });
  return out.filter(i => words[i] != null);
}
// LF2: expand the scene; the answer set from the rule; sizes for 'sizes' groups (all different)
const SIZES = [0.62, 0.78, 0.94, 1.1];
function genInstr(rung, sup, r, o) {
  const B = bank(); if (!B) return null;
  const want = keyWanted(o, rung), av = avoidSet(o);
  let cands = B.LF2.filter(it => it.scene.every(([k]) => entOk(k)) && (!it.target || entOk(it.target)));
  // s0: counts, each / only, both; s1: + except; s2: except, size words, «to, ikke tre» (fewest counts – they are the most guessable)
  const lvl = { count: [0, 1], each: [0, 1, 2], only: [0, 1, 2], both: [0, 1, 2], except: [1, 2], size: [1, 2] };
  if (want && want.story) { const c = cands.filter(x => x.id === want.story); if (c.length) cands = c; }
  else {
    let c = cands.filter(x => (lvl[x.kind] || [0, 1, 2]).includes(sup)); if (c.length) cands = c;
    const fresh = cands.filter(x => !av.has(x.id)); if (fresh.length) cands = fresh;
  }
  if (!cands.length) return null;
  const it = pick(r, cands);
  let objs = [];
  it.scene.forEach(([k, n, sz]) => { const sizes = sz === 'sizes' ? shuffle(r, SIZES.slice(0, n)) : null; for (let i = 0; i < n; i++) objs.push(obj(k, { sc: sizes ? sizes[i] : 1 })); });
  objs = shuffle(r, objs);
  const a = it.ans, idxOf = keys => objs.map((x, i) => keys.includes(x.key) ? i : -1).filter(i => i >= 0);
  let target, g;
  if (it.kind === 'count') {
    const ks = idxOf([a.key]); target = ks.slice(0, a.n).sort((x, y) => x - y);
    g = 1 / Math.max(2, ks.length);                                          // the count is the decision (the kind is easy)
  } else {
    let ks = idxOf(a.keys);
    const scs = ks.map(i => objs[i].sc);
    if (a.notSmallest) ks = ks.filter(i => objs[i].sc !== Math.min(...scs));
    if (a.notLargest) ks = ks.filter(i => objs[i].sc !== Math.max(...scs));
    if (a.onlyLargest) ks = ks.filter(i => objs[i].sc === Math.max(...scs));
    if (a.onlySmallest) ks = ks.filter(i => objs[i].sc === Math.min(...scs));
    if (a.smallestN) { const srt = ks.slice().sort((x, y) => objs[x].sc - objs[y].sc); ks = srt.slice(0, a.smallestN); }
    target = ks.sort((x, y) => x - y);
    g = 1 / (Math.pow(2, objs.length) - 1);
  }
  const distractors = objs.map((x, i) => target.includes(i) ? null : { v: i, tag: (a.keys || [a.key]).includes(x.key) ? (it.kind === 'count' ? 'COUNT' : 'NEGATION') : 'UNMENTIONED' }).filter(Boolean);
  return item(rung, sup, { key: 'LES-F:' + rung + ':' + it.id, target, mode: 'subset', g, distractors,
    params: { kind: 'instr', id: it.id, ikind: it.kind, tpl: 'lf2_' + it.id, objs, recv: it.target ? obj(it.target) : null, ans: Object.assign({}, a) } });
}
// LF4: story cards
function genCards(rung, sup, r, o) {
  const B = bank(); if (!B) return null;
  const want = keyWanted(o, rung), av = avoidSet(o);
  let cands = B.LF4.filter(st => st.cards.every(entOk) && entOk(st.extra));
  if (want && want.story) { const c = cands.filter(x => x.id === want.story); if (c.length) cands = c; }
  else {
    let c = sup <= 0 ? cands.filter(x => x.logical && x.cards.length === 3) : sup === 1 ? cands.filter(x => x.cards.length <= 4) : cands.filter(x => x.cards.length === 4 || !x.logical);
    if (c.length) cands = c;
    const fresh = cands.filter(x => !av.has(x.id)); if (fresh.length) cands = fresh;
  }
  if (!cands.length) return null;
  const st = pick(r, cands), n = st.cards.length, e = sup <= 0 ? 0 : 1;
  return item(rung, sup, { key: 'LES-F:' + rung + ':' + st.id, target: st.cards.slice(), mode: 'order', g: 1 / perm(n + e, n),
    distractors: e ? [{ v: st.extra, tag: 'UNMENTIONED' }] : [],
    params: { kind: 'cards', story: st.id, sents: st.s.map((_, i) => 'lf4_' + st.id + '_' + i), cards: st.cards.map(k => obj(k)), extra: e ? obj(st.extra) : null, logical: !!st.logical } });
}
// which item family a LES-F rung is: read from the ladder (F.LADDERS['LES-F'].rungs[n].can) so a re-ordered ladder keeps working
// (REQUEST WP-E2: LF4 story cards – listening only – should not wait behind the LES:9 reading gate of LF3); default LF1–LF4 = 1–4
const KIND_DEF = { 1: 'story', 2: 'instr', 3: 'read', 4: 'cards' };
function kindOf(rung) {
  try {
    const L = F.LADDERS && F.LADDERS['LES-F'], rr = L && L.rungs && L.rungs[rung], can = rr && String(rr.can || '');
    if (can) {
      if (/order|card/i.test(can)) return 'cards';
      if (/read|evidence/i.test(can) || (rr.prereq || []).some(x => /^LES:/.test(x))) return 'read';
      if (/instruction|negation|quantif/i.test(can)) return 'instr';
      if (/micro-story|who|what|where/i.test(can)) return 'story';
    }
  } catch (e) { /* default */ }
  return KIND_DEF[rung] || null;
}
// v5d WP-R3 (WP-E2 / WP-A request): an encounter's animal theme (o.theme = species id or F.LEARN.themeOf object) picks a story ABOUT
// that animal (F.LESF.about) – 80 % when one exists for the rung and was not told recently; a review key (o.key) always wins
function themedKey(rung, k, o, r) {
  const th = o.theme; if (!th || (typeof o.key === 'string' && o.key)) return null;
  const sps = typeof th === 'string' ? [th] : [th.sp, th.animal, th.model].filter(x => typeof x === 'string');
  let ks = []; for (const sp of sps) { ks = about(sp); if (ks.length) break; }
  if (!ks.length) return null;
  const base = k === 'read' ? rungOfKind('story') : rung;
  const av = avoidSet(o);
  ks = ks.filter(x => x.indexOf('LES-F:' + base + ':') === 0).map(x => k === 'read' ? x.replace('LES-F:' + base + ':', 'LES-F:' + rung + ':') : x)
    .filter(x => !av.has(x.split(':')[2]));
  return ks.length && r() < 0.8 ? pick(r, ks) : null;
}
function gen(rung, sup, rng, o) {
  o = o || {}; const r = rng || Math.random; sup = Math.max(0, Math.min(2, sup == null ? 1 : sup | 0));
  let it = null;
  const k = kindOf(rung);
  const tk = themedKey(rung, k, o, r);
  if (tk) {
    const o2 = Object.assign({}, o, { key: tk });
    it = k === 'story' || k === 'read' ? genStory(rung, sup, r, o2, k === 'read') : k === 'instr' ? genInstr(rung, sup, r, o2) : k === 'cards' ? genCards(rung, sup, r, o2) : null;
    if (it && it.key === tk) { it.params.themed = typeof o.theme === 'string' ? o.theme : (o.theme.sp || o.theme.animal || true); if (o.format) it.format = o.format; return it; }
    it = null;
  }
  if (k === 'story' || k === 'read') it = genStory(rung, sup, r, o, k === 'read');
  else if (k === 'instr') it = genInstr(rung, sup, r, o);
  else if (k === 'cards') it = genCards(rung, sup, r, o);
  if (it && o.format) it.format = o.format;
  return it;
}
// independent recomputation of every answer (selfTest / tests)
function check(it) {
  const p = it.params, bad = m => 'BAD LES-F ' + it.rung + ' s' + it.sup + ' ' + (p && p.kind) + ' ' + it.key + ': ' + m;
  const B = bank(); if (!B) return bad('no bank');
  if (!(it.g > 0 && it.g <= 1) || !it.mode || it.think !== THINK || !Array.isArray(it.secret)) return bad('contract');
  if (p.kind === 'story') {
    const st = B.LF1.find(s => s.id === p.story), q = st && st.q[p.qi]; if (!q) return bad('story');
    if (p.objs[it.target].key !== q.a) return bad('target');
    const keys = p.objs.map(x => x.key);
    if (new Set(keys).size !== keys.length) return bad('duplicate thing');
    if (!keys.includes(q.lure)) return bad('lure missing');
    if (keys.filter(k => k !== q.a && k !== q.lure).some(k => st.q.some(x => x.a === k || x.lure === k))) return bad('a mentioned thing as a plain distractor');
    if (keys.some(k => k !== q.a && k !== q.lure && (lookOf(q.a).includes(k) || lookOf(q.lure).includes(k)))) return bad('look-alike');
    // every unmentioned thing is of the answer's class (the story lure may be of another class: «Hvor satt sommerfuglen?» – blomsten)
    if (keys.some(k => k !== q.lure && classOf(k) !== classOf(q.a) && !((classOf(q.a) === 'person' || classOf(q.a) === 'animal') && (classOf(k) === 'person' || classOf(k) === 'animal')))) return bad('class');
    if (keys.length < (it.sup <= 0 ? 6 : 8)) return bad('too few things ' + keys.length);
    // the answer is in the sentence si, and the question names something of that sentence
    const sent = norm(st.s[q.si]);
    if (p.read) {
      if (!p.ev.length || p.ev.some(i => p.words[i] == null)) return bad('evidence index');
      // every evidence word sits in the answer sentence, is no function word, and is never the answer's own name (unless the bank says so)
      const sw = sent.split(' ');
      if (p.ev.some(i => !sw.includes(norm(p.words[i])) || STOP.has(norm(p.words[i])))) return bad('evidence not in the answer sentence');
      if (p.ev.some(i => norm(p.words[i]) === norm(NAME[q.a] || q.a) && !(q.ev || []).some(e => norm(e) === norm(p.words[i])))) return bad('evidence = the answer name');
      if (!(q.ev || []).every(e => p.ev.some(i => norm(p.words[i]) === norm(e)) || !sw.includes(norm(e)))) return bad('a bank evidence word is not accepted');
    }
    if (Math.abs(it.g - (p.read ? (1 / keys.length) * (p.ev.length / p.words.length) : 1 / keys.length)) > 1e-9) return bad('g');
    return null;
  }
  if (p.kind === 'instr') {
    const d = B.LF2.find(x => x.id === p.id); if (!d) return bad('instr');
    const n = d.scene.reduce((s, x) => s + x[1], 0); if (p.objs.length !== n) return bad('scene size');
    const a = d.ans, of = k => p.objs.map((x, i) => x.key === k ? i : -1).filter(i => i >= 0);
    if (d.kind === 'count') {
      if (it.target.length !== a.n || it.target.some(i => p.objs[i].key !== a.key)) return bad('count target');
      if (of(a.key).length <= a.n) return bad('count: not enough to choose from');
      return null;
    }
    let want = [].concat(...a.keys.map(of));
    const sc = i => p.objs[i].sc, srt = want.slice().sort((x, y) => sc(x) - sc(y));
    if (a.notSmallest) want = srt.slice(1);
    if (a.notLargest) want = srt.slice(0, -1);
    if (a.onlyLargest) want = srt.slice(-1);
    if (a.onlySmallest) want = srt.slice(0, 1);
    if (a.smallestN) want = srt.slice(0, a.smallestN);
    if ((a.notSmallest || a.notLargest || a.onlyLargest || a.onlySmallest || a.smallestN) && new Set(want.concat(srt).map(sc)).size !== srt.length) return bad('sizes not distinct');
    if (JSON.stringify(want.sort((x, y) => x - y)) !== JSON.stringify(it.target)) return bad('target ' + JSON.stringify(it.target) + ' vs ' + JSON.stringify(want));
    if (!it.target.length || it.target.length === p.objs.length) return bad('trivial subset');
    return null;
  }
  if (p.kind === 'cards') {
    const st = B.LF4.find(x => x.id === p.story); if (!st) return bad('cards');
    if (JSON.stringify(it.target) !== JSON.stringify(st.cards)) return bad('order');
    if (p.extra && st.cards.includes(p.extra.key)) return bad('extra is in the story');
    if (new Set(st.cards).size !== st.cards.length) return bad('duplicate card');
    if (p.sents.length !== st.s.length) return bad('sentences');
    return null;
  }
  return bad('kind');
}
function selfTest(n, seed) {
  let s = (seed || 4242) >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = { n: 0, bad: [], nulls: 0, per: {}, g: {} };
  for (const rung of [1, 2, 3, 4]) for (let sup = 0; sup <= 2; sup++) {
    let gs = 0, k = 0;
    for (let i = 0; i < (n || 300); i++) {
      const it = gen(rung, sup, rng, {}); out.n++;
      if (!it) { out.nulls++; continue; }
      const e = check(it); if (e) out.bad.push(e);
      k++; gs += it.g;
    }
    out.per[rung + ':' + sup] = k; out.g[rung + ':' + sup] = k ? +(gs / k).toPrecision(2) : null;
  }
  return out;
}
const keysOf = rung => { const B = bank(), k = kindOf(rung); if (!B) return []; if (k === 'story' || k === 'read') return B.LF1.flatMap(st => st.q.map((_, qi) => 'LES-F:' + rung + ':' + st.id + ':' + qi)); if (k === 'instr') return B.LF2.map(x => 'LES-F:' + rung + ':' + x.id); if (k === 'cards') return B.LF4.map(x => 'LES-F:' + rung + ':' + x.id); return []; };
const rungOfKind = k => [1, 2, 3, 4, 5, 6].find(r => kindOf(r) === k) || null;
// review / theme keys of the stories about a thing or animal (entity key or VOX model id): WP-A's encounters can pass them as
// F.Task.offer({prefer: F.LESF.about('ekorn')}) so the listening story is about the animal she meets
function about(x) {
  const B = bank(); if (!B) return [];
  const ks = Object.keys(ENT).filter(k => k === x || ENT[k][0] === x);
  if (!ks.length) return [];
  const out = [];
  const r1 = rungOfKind('story'), r2 = rungOfKind('instr'), r4 = rungOfKind('cards');
  B.LF1.forEach(st => st.q.forEach((q, qi) => { if (ks.some(k => q.a === k || q.lure === k || (q.act || []).includes(k))) out.push('LES-F:' + r1 + ':' + st.id + ':' + qi); }));
  B.LF2.forEach(it => { if (it.scene.some(sc => ks.includes(sc[0]))) out.push('LES-F:' + r2 + ':' + it.id); });
  B.LF4.forEach(st => { if (st.cards.some(c => ks.includes(c))) out.push('LES-F:' + r4 + ':' + st.id); });
  return out;
}
Object.assign(LS, { ENT, POOL, LOOK, gen, check, selfTest, keysOf, storyOfKey, about, kindOf, rungOfKind });
// registry (ladders.js, WP-E): queued in F.REGQ when the registry is not there yet
const regFn = (rung, sup, rng, o) => gen(rung, sup, rng, o);
const regOpts = { rungs: [1, 2, 3, 4], fits: (rung, key) => typeof key === 'string' && key.indexOf('LES-F:' + rung + ':') === 0 };
if (F.BANKS && typeof F.BANKS.reg === 'function') F.BANKS.reg('LES-F', regFn, regOpts);
else (F.REGQ = F.REGQ || []).push(['LES-F', regFn, regOpts]);

/* =====================================================================================================================
   3. formats (browser only)
   ===================================================================================================================== */
if (typeof window === 'undefined' || typeof document === 'undefined' || typeof THREE === 'undefined') return;
const U = F.U, V3 = THREE.Vector3;
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);
const say = (id, slots) => (F.TPL && F.TPL.has(id)) ? F.SAY(id, slots || {}, '') : Promise.resolve();
const setEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.slice().map(Number).sort((x, y) => x - y).join() === b.slice().map(Number).sort((x, y) => x - y).join();
const tdef = (id, spec) => { if (F.Task && typeof F.Task.def === 'function') return F.Task.def(id, spec); spec.id = id; ((F.Task = F.Task || {}).defs = F.Task.defs || {})[id] = spec; return spec; };

// a little campfire for outdoor story time (voxel, prefix fx_l_)
if (F.VOX && F.VOX.def && !F.VOX.has('fx_l_baal')) {
  F.VOX.def('fx_l_baal', { size: [11, 10, 11], scale: 1 / 16, build(v) {
    for (let a = 0; a < 8; a++) { const x = Math.round(5 + Math.cos(a * Math.PI / 4) * 4.5), z = Math.round(5 + Math.sin(a * Math.PI / 4) * 4.5); v.box(x, 0, z, x, 1, z, a % 2 ? 'stone2' : 'pathStone'); }
    v.box(2, 1, 4, 8, 1, 6, 'woodDark'); v.box(4, 1, 2, 6, 2, 8, 'wood');
    v.cone(5, 2, 5, 2.6, 5, 'red'); v.cone(5, 3, 5, 1.8, 5, 'coral'); v.cone(5, 4, 5, 1.1, 5, 'yellow'); v.set(5, 8, 5, 'butter');
  } });
}
const indoors = ctx => (F.Space && F.Space.cur === 'in') || /bibliotek|library|lesesal|les/.test(String((ctx && ctx.place && (ctx.place.id || ctx.place)) || ''));
function lesRung() { try { const s = F.LEARN && F.LEARN.strand && F.LEARN.strand('LES'); return s && s.rung ? s.rung : 0; } catch (e) { return 0; } }
// make sure the format has an item of its own kind (debug / demo items, another format's shape)
function ensure(item, kinds, rungs) {
  if (item.params && kinds.includes(item.params.kind)) return item;
  const rung = rungs.includes(item.rung) ? item.rung : rungs[0];
  const rng = U.rng(((U.hashStr ? U.hashStr(String(item.id || 'x')) : 7) ^ (F.T.now * 1000 | 0)) >>> 0);
  let it = null;
  for (let t = 0; t < 4 && !it; t++) it = gen(rung, item.sup == null ? 1 : item.sup, rng, {});
  if (!it) return item;
  const keep = { id: item.id, format: item.format, kind: item.kind, golden: item.golden };
  for (const k in item) if (!(k in keep)) delete item[k];
  Object.assign(item, it, keep);
  return item;
}
// no story bank / generator loaded (a broken build): leave cleanly – no outcome, no coins, no learning report
function noItem(S, what) { console.warn('[f_lesf] no item for ' + what + ' (lines_lesf.js / F.LESF_BANK missing?)'); if (S.abort) S.abort('lesf-no-item'); return { outcome: null, aborted: 'lesf-no-item' }; }
// CSS (injected once)
let cssDone = false;
function css() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style'); st.id = 'lesfCss';
  st.textContent = [
    '.lf-note { position: fixed; left: 50%; top: calc(64px * var(--u,1)); transform: translateX(-50%) translateY(-12px); z-index: 30; max-width: min(92vw, 860px);',
    '  background: #fff8e6; border: 4px solid #e6c98a; border-radius: 18px; padding: 14px 22px; box-shadow: 0 6px 18px rgba(80,50,10,.25);',
    '  font-family: Andika, sans-serif; font-size: calc(30px * var(--u,1)); line-height: 1.5; color: #4a3520; opacity: 0; transition: opacity .3s, transform .3s; }',
    '.lf-note.on { opacity: 1; transform: translateX(-50%) translateY(0); }',
    '.lf-sent { display: inline; padding: 2px 3px; border-radius: 8px; transition: background .3s; }',
    '.lf-sent.lf-lit { background: rgba(255, 224, 102, .55); }',
    '.lf-w { display: inline-block; padding: 0 4px; margin: 0 1px; border-radius: 8px; cursor: default; }',
    '.lf-note.lf-pick .lf-w { cursor: pointer; border-bottom: 3px dotted #d9b56a; }',
    '.lf-note.lf-pick .lf-w:hover { background: rgba(255, 236, 170, .7); }',
    '.lf-w.lf-sel { background: #ffe58a; }',
    '.lf-w.lf-glow { background: #ffe066; box-shadow: 0 0 0 3px #f2c14e; animation: lfPulse 1s ease-in-out infinite; }',
    '.lf-w.lf-bad { animation: lfShake .4s; }',
    '@keyframes lfPulse { 50% { box-shadow: 0 0 0 6px rgba(242,193,78,.4); } }',
    '@keyframes lfShake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }',
    '.nlabel.lf-tag { font-family: Andika, sans-serif; font-size: calc(17px * var(--u,1)); padding: 1px 9px; border-radius: 10px; background: rgba(255,250,236,.92); color: #5a3d1e; border: 2px solid #e6c98a; pointer-events: none; }',
    '.korder .kslot.lf-tell { box-shadow: 0 0 0 5px #ffe066, 0 0 24px rgba(242,193,78,.7); transform: scale(1.06); transition: transform .2s; }',
  ].join('\n');
  document.head.appendChild(st);
}
// a thin format kit over the stage S (same protocol as every widget: S.arm / S.use / S.submit)
function Kit(item, S, spec) {
  css();
  const K = { item, S, spec, p: item.params || {}, sup: item.sup == null ? 1 : item.sup, own: [] };
  K.gateOk = () => { if (S.gateOpen && !S.gateOpen()) { if (S.submitEarly) S.submitEarly(); return false; } return true; };
  K.widget = o => {
    const w = { kind: o.kind, values: o.values || [], dead: false, locked: false };
    w.feed = v => o.feed(v);
    w.mark = (v, cls) => { try { o.mark && o.mark(v, cls); } catch (e) { console.error(e); } };
    w.solution = v => { try { o.solution && o.solution(v); } catch (e) { console.error(e); } };
    w.lock = on => { w.locked = !!on; if (K.B) K.B.locked = !!on; };
    w.destroy = () => { w.dead = true; if (o.destroy) o.destroy(); };
    if (o.rightValue) w.rightValue = o.rightValue;
    if (o.wrongValue) w.wrongValue = o.wrongValue;
    if (o.hint) w.hint = o.hint;
    if (o.helpStep) w.helpStep = o.helpStep;
    if (o.redeal) w.redeal = o.redeal;
    LS.cur && (LS.cur.w = w);
    return S.use(w);
  };
  K.lookBack = fn => { K._lb = fn; if (S.lookBack) S.lookBack(fn); };
  // hint: the kit look-back runs first (stage), then ours; without S.lookBack ours plays the look-back itself
  K.hint = fn => { S.hint = async (tag, v) => { try { if (S.clearHint) S.clearHint(); if (K._lb && !S.lookBack) await K._lb(v); if (!S.solved && !S.ended) await fn(tag, v); } catch (e) { console.error('[f_lesf hint]', e); } }; };
  K.sol = fn => { S._solFn = async () => { try { await fn(); } catch (e) { console.error('[f_lesf solution]', e); } }; };
  // the story is «the prompt»: a tap while it plays is an early tap (nothing judged)
  K.talk = async fn => { S.speaking = true; try { await fn(); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); } };
  K.end = () => { K.own.splice(0).forEach(x => { try { x.dispose(); } catch (e) {} }); if (LS.cur && LS.cur.K === K) LS.cur = null; };
  S.widgets.push({ kind: 'lesf-end', dead: false, lock() {}, destroy() { K.end(); } });
  LS.cur = { format: spec.id, item, K };
  return K;
}
function mesh(K, geo, mat) { const m = new THREE.Mesh(geo, mat); K.own.push(geo, mat); return m; }
function hopTo(o, to, ms, h) { const a = o.position.clone(), b = to.clone(); return tween(ms || 360, k => { const e = ease(k); o.position.lerpVectors(a, b, e); o.position.y += Math.sin(k * Math.PI) * (h != null ? h : 0.5); }); }
function bounce(o, amp) { const y0 = o.position.y; return tween(420, k => { o.position.y = y0 + Math.sin(k * Math.PI) * (amp || 0.3); }).then(() => { o.position.y = y0; }); }
function wobble(o) { const r0 = o.rotation.z; return tween(500, k => { o.rotation.z = r0 + Math.sin(k * Math.PI * 4) * 0.25 * (1 - k); }).then(() => { o.rotation.z = r0; }); }
function popIn(o, ms) { const s = o.scale.clone(); o.scale.setScalar(0.01); return tween(ms || 260, k => o.scale.copy(s).multiplyScalar(Math.max(0.01, ease(k)))); }
function glow(o, on, hex) {
  o.traverse(m => {
    if (!m.isMesh || !m.material) return;
    if (on) { if (!m.userData.lfMat) { m.userData.lfMat = m.material; const c = m.material.clone(); if (c.emissive) { c.emissive = new THREE.Color(hex || 0xfff0a0); c.emissiveIntensity = 0.4; } m.material = c; } }
    else if (m.userData.lfMat) { m.material.dispose && m.material.dispose(); m.material = m.userData.lfMat; m.userData.lfMat = null; }
  });
}
function sparkle(o, kind) { try { const p = new V3(); o.getWorldPosition(p); p.y += 0.4; F.FX.burst(p, { kind: kind || 'star', n: 18 }); F.sfx.sparkle(); } catch (e) {} }
// people stand tall: their height counts half when fitting (like F71's children); animals and things fill their size
const sizeOf = k => { const c = classOf(k); return c === 'person' ? [0.74, 0.62] : c === 'animal' ? [0.98, 0.85] : c === 'where' ? [1.0, 0.85] : [0.86, 0.85]; };

/* ---------------------------------------------------------- the story diorama (F.NUM.Board) */
function storyScene(K, objs, o) {
  o = o || {};
  const S = K.S, inside = indoors(S.ctx || K.ctx);
  const n = objs.length, perRow = Math.ceil(n / 2), gap = n > 8 ? 1.08 : 1.18;
  const w = Math.max(5.6, perRow * gap + 1.4), d = 3.6;          // (a board deeper than 3.6 m loses its top in the voxel mesher)
  const B = K.B = F.NUM.Board({ style: inside ? 'wood' : 'grass', w, d, h: 1.5, tilt: 0.82, scale: 0.95, avoid: S.has3D && S.base ? S.base.clone().add(new V3(0, 1.3, 0)) : null });
  S.widgets.push({ kind: 'lesf-board', dead: false, lock() {}, destroy() { B.dispose(); } });
  // the storyteller: Puff in the reading chair (indoors) or by the campfire (outdoors) – back left, not tappable
  const tx = -w / 2 + 0.75, tz = -d / 2 + 0.36;
  const seat = F.VOX.has(inside ? 'tmp_c_lesestol' : 'fx_l_baal') ? (inside ? 'tmp_c_lesestol' : 'fx_l_baal') : (F.VOX.has('stol') ? 'stol' : null);
  if (seat) { const c = F.NUM.piece(seat, {}, inside ? 0.9 : 0.85, { hk: 0.8 }); B.add(c, tx + (inside ? 0 : 0.6), tz); c.rotation.y = inside ? 0.5 : 0; }
  const teller = F.VOX.has('ch_puff') ? F.NUM.piece('ch_puff', {}, 0.72, { hk: 0.8 }) : null;
  if (teller) { B.add(teller, tx, tz + (inside ? 0.05 : 0.02)); if (inside) teller.position.y += 0.3; teller.rotation.y = 0.4; }
  K.teller = teller;
  // props (the story's other things, not to tap): back row, right of the storyteller
  const props = {};
  (o.props || []).forEach((pr, i) => { const [sz, hk] = sizeOf(pr.key); const pc = F.NUM.piece(pr.model, pr.opts || {}, sz * 0.9, { hk }); B.add(pc, tx + 1.3 + i * 1.0, tz); props[pr.key] = pc; });
  // the things to tap: two rows
  const pcs = objs.map((ob, i) => {
    const row = i < perRow ? 0 : 1, j = row ? i - perRow : i, cnt = row ? n - perRow : perRow;
    const x = (j - (cnt - 1) / 2) * gap + (row ? gap * 0.25 : -gap * 0.15), z = row ? 1.08 : -0.36;
    const [sz, hk] = sizeOf(ob.key);
    const pc = F.NUM.piece(ob.model, ob.opts || {}, sz * (ob.sc || 1), { hk });
    B.add(pc, x, z); pc.userData.home = pc.position.clone(); pc.userData.i = i;
    popIn(pc, 260 + i * 60);
    if (NAME[ob.key]) pc.userData.tag = B.label(pc, NAME[ob.key], { cls: 'lf-tag', dy: -0.06 });
    return pc;
  });
  const Sc = { B, pcs, props, teller }; if (LS.cur && LS.cur.K === K) LS.cur.Sc = Sc;
  return Sc;
}
async function tellStory(K, sents, o) {
  o = o || {};
  for (let i = 0; i < sents.length; i++) {
    if (K.S.ended) return;
    if (o.lit) o.lit(i, true);
    if (K.teller) bounce(K.teller, 0.12);
    await say(sents[i]);
    if (o.lit) o.lit(i, false);
    await sleep(160);
  }
}
// LF3 / read mode: the story as a note; words are tappable in the evidence step
function storyNote(K, p) {
  const el = document.createElement('div'); el.className = 'lf-note';
  const words = []; const sents = [];
  p.text.forEach((s, si) => {
    const span = document.createElement('span'); span.className = 'lf-sent';
    s.split(/\s+/).filter(Boolean).forEach(wd => { const b = document.createElement('span'); b.className = 'lf-w'; b.textContent = F.UI && F.UI.caseText ? F.UI.caseText(wd) : wd; b.dataset.i = words.length; words.push(b); span.appendChild(b); span.appendChild(document.createTextNode(' ')); });
    el.appendChild(span); sents.push(span);
  });
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  K.S.kitEls = K.S.kitEls || []; K.S.kitEls.push(el);
  return { el, words, sents, lit(i, on) { if (sents[i]) sents[i].classList.toggle('lf-lit', !!on); }, remove() { el.remove(); } };
}

/* ---------------------------------------------------------- F78 Fortellerstolen */
// the rungs each format serves follow the ladder (F78: story / instructions / read; F79: story cards) – fallback LF1–3 / LF4
function rungsFor(kinds, def) {
  // v5d: only the ladder's current-phase rungs (F.LADDERS.list – rung 5 «infer … with evidence» is Phase 2, not a read rung of F78)
  let ph = null; try { ph = F.LADDERS && typeof F.LADDERS.list === 'function' ? F.LADDERS.list('LES-F') : null; } catch (e) { ph = null; }
  const rs = [1, 2, 3, 4, 5, 6].filter(r => (!ph || !ph.length || ph.includes(r)) && kinds.includes(kindOf(r))); if (!rs.length) return def.length === 1 ? def[0] : def;
  const out = []; rs.forEach(r => { const l = out[out.length - 1]; if (l && l[1] === r - 1) l[1] = r; else out.push([r, r]); });
  return out.length === 1 ? out[0] : out;                       // one range stays flat ([1, 3]) like every other format
}
tdef('F78', {
  // mode 'scene' (engine fmtG 0.12): LF1 tap-in-scene is the format's default; LF2/LF3 items carry their own g (subset / two-step)
  name: 'Fortellerstolen', strands: { 'LES-F': rungsFor(['story', 'instr', 'read'], [[1, 3]]) }, places: ['bibliotek', 'library', 'lesesal', 'leir', 'any'], family: 'forstaa', think: 'FORSTÅ', portable: true, mode: 'scene',
  tpl: ['lf_intro', 'lf_trykk', 'lf2_intro', 'lf3_bevis'],
  g: it => it.g,
  async run(item, S) {
    ensure(item, ['story', 'instr'], [1, 2, 3, 4, 5, 6].filter(r => ['story', 'instr', 'read'].includes(kindOf(r))));
    if (!(item.params && ['story', 'instr'].includes(item.params.kind))) return noItem(S, 'F78');
    const K = Kit(item, S, this); K.ctx = S.ctx;
    item.think = THINK;
    if (!(F.NUM && F.NUM.Board && F.NUM.piece)) return fallback78(K, item, S);
    if (K.p.kind === 'instr') return runInstr(K, item, S);
    return runStory(K, item, S);
  },
});
async function runStory(K, item, S) {
  const p = K.p, rung = item.rung;
  // read mode: LF3 always; LF1 once she reads well (LES ≥ L9) – at s0 the story is also told
  const readMode = !!p.read || lesRung() >= 9;
  if (readMode && !p.text) { const st = (bank().LF1 || []).find(s => s.id === p.story); p.text = st ? st.s.slice() : []; }
  const spoken = !readMode || K.sup <= 0;
  const Sc = storyScene(K, p.objs, { props: p.props });
  const note = readMode ? storyNote(K, p) : null;
  const lit = note ? note.lit : null;
  const pieceOf = key => { const i = p.objs.findIndex(o => o.key === key); return i >= 0 ? Sc.pcs[i] : Sc.props[key] || null; };
  // story time: «Kom og hør!» → the sentences (or «Les historien») → the question
  const story = async () => { if (spoken) await tellStory(K, p.sents, { lit }); };
  // Puff's replay: a listening story is replayed for free; a READ story read aloud is help (hint policy: reading audio → B)
  S.replay = async () => { if (readMode && !spoken) { S.usedAudio = true; await tellStory(K, p.sents, { lit }); } else await story(); await say(p.qTpl); };
  await K.talk(async () => {
    // the long invitation the first times of a session, then a short cue (the story itself is the long part)
    const nIntro = F.Task._lfIntro = (F.Task._lfIntro || 0) + 1;
    await say(readMode && !spoken ? 'lf_intro_les' : nIntro <= 2 ? 'lf_intro' : 'lf_kort');
    await story();
    // (read mode: the question follows at once – she reads the text at her own pace while she looks for the answer; no forced wait)
    const ps = item.sup <= 0 && (F.Task._lfTrykk || 0) < 2; if (ps) F.Task._lfTrykk = (F.Task._lfTrykk || 0) + 1;
    await say(p.qTpl);
    if (ps) await say('lf_trykk');
  });
  S.lastPrompt = { id: p.qTpl, slots: {}, voice: '' };
  // step 1: tap the answer in the scene (arm first, then the widget joins it – S.custom order, WP-K2 phase contract)
  const armP = S.arm({ answer: item.target });
  const w = K.widget({ kind: 'lesf-scene', values: p.objs.map((_, i) => i),
    feed: v => S.submit(+v, S.active),
    mark: (v, cls) => { const pc = Sc.pcs[v]; if (!pc) return; if (cls === 'right') { sparkle(pc); bounce(pc, 0.4); } else wobble(pc); },
    solution: () => { const pc = Sc.pcs[item.target]; glow(pc, true, 0xffe066); bounce(pc, 0.35); },
    rightValue: () => item.target, wrongValue: () => (item.target + 1) % p.objs.length,
    redeal: v => redealScene(K, Sc, p, v, onPick),
    // «Hjelp meg»: the story is told again and one thing that was NOT in the story leaves the board (H = B for the engine)
    helpStep: async () => {
      const gone = Sc.pcs.map((pc, i) => i).filter(i => i !== item.target && p.objs[i].key !== p.lure && Sc.pcs[i].visible);
      if (gone.length > 1) { const i = gone[Math.floor(Math.random() * gone.length)], pc = Sc.pcs[i]; await say('lf_h_ikke_med'); await tween(350, k => pc.scale.setScalar(Math.max(0.01, 1 - k))); pc.visible = false; if (pc.userData.tag) pc.userData.tag.show(false); }
      await say('lf_igjen'); await tellStory(K, p.sents, { lit }); await say(p.qTpl); return true;
    } });
  function onPick(i) { const pc = Sc.pcs[i]; if (w.locked || S.solved || !K.gateOk()) return; F.FX && F.FX.pop && F.FX.pop(pc.children[0] || pc); S.submit(i, w); }
  Sc.pcs.forEach((pc, i) => Sc.B.pick(pc, () => onPick(i)));
  // look-back: HER choice is acted out (it hops forward to the storyteller and back / the mover goes to HER place)
  K.lookBack(async v => {
    const pc = Sc.pcs[v]; if (!pc) return;
    const mover = p.act && pieceOf(p.act[0]);
    if (p.k === 'where' && mover && mover !== pc) { const home = mover.position.clone(); await hopTo(mover, pc.position.clone().add(new V3(0, 0.35, 0)), 420, 0.7); await sleep(500); await hopTo(mover, home, 380, 0.5); }
    else { await bounce(pc, 0.35); await wobble(pc); }
  });
  K.hint(async (tag, v) => {
    const vv = typeof v === 'number' ? v : -1, k = vv >= 0 && p.objs[vv] ? p.objs[vv].key : null;
    await say(k && k === p.lure ? 'lf_h_lure' : k ? 'lf_h_ikke_med' : 'lf_h_hor');
    if (lit && p.si != null) lit(p.si, true);              // read mode: the sentence with the answer lights up (structure, not the answer)
    if (!readMode || spoken) { await say('lf_igjen'); await tellStory(K, p.sents, { lit }); }
    await say(p.qTpl);
  });
  K.sol(async () => { w.solution(); await say('lf_sol'); });
  await armP;
  glow(Sc.pcs[item.target], false);
  // step 2 (LF3): the evidence word in the text
  if (p.read && note && Array.isArray(p.ev) && p.ev.length) await evidenceStep(K, item, S, note);
  // payoff: the scene acts the story out while the sentence is said again
  await actOut(K, Sc, p, pieceOf, lit);
  return finish(K, item, S, readMode ? 'lf_ok_les' : 'lf_ok');
}
// re-deal after the 1st error (SYNTHESIS §5.2 F): the wrongly tapped unmentioned thing becomes a fresh one of the same class, and the
// answer swaps places with another thing – tapping through the rest never works (the story lure stays: it is the real decision)
function redealScene(K, Sc, p, v, onPick) {
  const item = K.item; if (typeof v !== 'number' || v === item.target || !Sc.pcs[v]) return false;
  const st = (bank().LF1 || []).find(x => x.id === p.story); if (!st) return false;
  const mentioned = new Set(st.q.flatMap(q => [q.a, q.lure].concat(q.act || [])));
  const inScene = new Set(p.objs.map(o => o.key)), cls = classOf(p.answerKey);
  if (p.objs[v].key !== p.lure) {
    const near = new Set(lookOf(p.answerKey).concat(lookOf(p.lure)));
    const pool = (POOL[cls] || []).filter(k => entOk(k) && !inScene.has(k) && !mentioned.has(k) && !near.has(k));
    if (pool.length) {
      const k = pool[Math.floor(Math.random() * pool.length)], old = Sc.pcs[v], [sz, hk] = sizeOf(k);
      const pc = F.NUM.piece(ENT[k][0], {}, sz, { hk }); Sc.B.add(pc, old.userData.home.x, old.userData.home.z); pc.userData.home = old.userData.home.clone(); pc.userData.i = v;
      Sc.B.unpick(old); if (old.parent) old.parent.remove(old); if (old.userData.tag) old.userData.tag.remove();
      if (NAME[k]) pc.userData.tag = Sc.B.label(pc, NAME[k], { cls: 'lf-tag', dy: -0.06 });
      Sc.pcs[v] = pc; p.objs[v] = obj(k); Sc.B.pick(pc, () => onPick(v)); popIn(pc, 300);
    }
  }
  const others = Sc.pcs.map((_, i) => i).filter(i => i !== item.target && i !== v);
  if (others.length) {
    const j = others[Math.floor(Math.random() * others.length)], a = Sc.pcs[item.target], b = Sc.pcs[j];
    const ha = a.userData.home.clone(), hb = b.userData.home.clone();
    a.userData.home = hb; b.userData.home = ha; hopTo(a, hb, 420, 0.6); hopTo(b, ha, 420, 0.6);
  }
  return true;
}
async function evidenceStep(K, item, S, note) {
  const p = K.p;
  note.el.classList.add('lf-pick');
  if (note.sents[p.si]) note.sents.forEach(s => s.classList.remove('lf-lit'));
  const armP = S.arm({ answer: p.ev[0], check: v => p.ev.includes(+v) });
  const w = K.widget({ kind: 'lesf-words', values: note.words.map((_, i) => i),
    feed: v => S.submit(+v, S.active),
    mark: (v, cls) => { const b = note.words[v]; if (!b) return; b.classList.remove('lf-bad'); void b.offsetWidth; b.classList.add(cls === 'right' ? 'lf-glow' : 'lf-bad'); },
    solution: () => { const b = note.words[p.ev[0]]; if (b) b.classList.add('lf-glow'); },
    rightValue: () => p.ev[0], wrongValue: () => note.words.findIndex((_, i) => !p.ev.includes(i)) });
  const offs = note.words.map((b, i) => { const fn = e => { e.stopPropagation(); if (w.locked || S.solved || !K.gateOk()) return; F.sfx.click(); note.words.forEach(x => x.classList.remove('lf-sel')); b.classList.add('lf-sel'); S.submit(i, w); }; b.addEventListener('click', fn); return () => b.removeEventListener('click', fn); });
  K.lookBack(null);
  K.hint(async () => { note.lit(p.si, true); await say('lf3_h_setning'); });
  K.sol(async () => { note.lit(p.si, true); w.solution(); await say('lf3_sol'); });
  S.lastPrompt = { id: 'lf3_bevis', slots: {}, voice: '' };
  S.replay = async () => { await say('lf3_bevis'); };
  await K.talk(async () => { await say('lf3_bevis'); });
  await armP;
  offs.forEach(f => f());
  note.el.classList.remove('lf-pick');
}
async function actOut(K, Sc, p, pieceOf, lit) {
  const S = K.S; if (S.ended) return;
  const ans = Sc.pcs[K.item.target];
  const said = p.si != null ? say(p.sents[p.si]) : Promise.resolve();
  if (lit && p.si != null) lit(p.si, true);
  if (p.act) {
    const mover = pieceOf(p.act[0]), place = pieceOf(p.act[1]);
    if (mover && place && mover !== place) { await hopTo(mover, place.position.clone().add(new V3(0, (place.userData.h || 0.4) * 0.6, 0.05)), 520, 0.8); sparkle(mover); }
    else if (ans) { sparkle(ans); await bounce(ans, 0.45); }
  } else if (ans) { sparkle(ans); await bounce(ans, 0.45); }
  await said;
  await sleep(250);
}
// one reaction per task end (logic §3-H): our own line on A (the stage's praise is skipped), the stage's S.ok otherwise
async function finish(K, item, S, okTpl) {
  const res = S.result();
  if (res.outcome === 'A' && !item.golden && F.TPL.has(okTpl)) {
    S.okDone = true;
    try { if (K.B && K.B.top) F.sfx.sparkle(); } catch (e) {}
    await say(okTpl);
  }
  return S.result();
}

/* ---------------------------------------------------------- LF2: instructions acted out in the scene */
async function runInstr(K, item, S) {
  const p = K.p, a = p.ans, n = p.objs.length;
  const props = p.recv ? [p.recv] : [];
  const Sc = storyScene(K, p.objs, { props });
  const recv = p.recv ? Sc.props[p.recv.key] : null;
  const basket = p.recv && classOf(p.recv.key) === 'where';
  const sel = new Set();
  // her selection: a soft gold ring under the thing (no right/wrong before Ferdig – C4)
  const rings = Sc.pcs.map(pc => { const r = mesh(K, new THREE.TorusGeometry(0.42, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d })); r.rotation.x = Math.PI / 2; r.position.copy(pc.userData.home).add(new V3(0, 0.04, 0)); r.visible = false; Sc.B.top.add(r); return r; });
  const setSel = (i, on) => { if (on) sel.add(i); else sel.delete(i); rings[i].visible = !!on; const pc = Sc.pcs[i]; if (on) bounce(pc, 0.2); };
  const value = () => [...sel].sort((x, y) => x - y);
  const check = v => a.n != null && p.ikind === 'count' ? (v.length === a.n && v.every(i => p.objs[i] && p.objs[i].key === a.key)) : setEq(v, item.target);
  const instr = async () => { if (Sc.teller) bounce(Sc.teller, 0.12); await say(p.tpl); };
  S.replay = instr;
  await K.talk(async () => { await say('lf2_intro'); await instr(); if (item.sup <= 0 || (F.Task._lf2Trykk || 0) < 2) { F.Task._lf2Trykk = (F.Task._lf2Trykk || 0) + 1; await say('lf2_trykk'); } });
  S.lastPrompt = { id: p.tpl, slots: {}, voice: '' };
  let solNow = null;
  const armP = S.arm({ answer: item.target, check });
  const w = K.widget({ kind: 'lesf-select', values: p.objs.map((_, i) => i),
    feed: v => { [...sel].forEach(i => setSel(i, false)); (v || []).forEach(i => setSel(+i, true)); return S.submit(value(), S.active); },
    solution: () => { solNow = item.target.slice(); [...sel].forEach(i => { if (!solNow.includes(i)) setSel(i, false); }); solNow.forEach(i => { if (!sel.has(i)) glow(Sc.pcs[i], true, 0xffe066); }); },
    rightValue: () => item.target.slice(), wrongValue: () => item.target.length > 1 ? item.target.slice(1) : item.target.concat([p.objs.findIndex((_, i) => !item.target.includes(i))]).sort((x, y) => x - y),
    // «Hjelp meg»: a wrong selection is taken back, else one right thing is chosen for her (backward-faded worked step)
    helpStep: async () => {
      const okI = i => p.ikind === 'count' ? p.objs[i].key === a.key : item.target.includes(i);
      const bad = [...sel].find(i => !okI(i)); if (bad != null) { setSel(bad, false); await wobble(Sc.pcs[bad]); return true; }
      const want = p.ikind === 'count' ? (sel.size < a.n ? p.objs.map((_, i) => i).find(i => okI(i) && !sel.has(i)) : null) : item.target.find(i => !sel.has(i));
      if (want == null) return false;
      setSel(want, true); await say(p.tpl); return true;
    } });
  // selecting is not answering: allowed once the instruction has been said (no early-tap lock); Ferdig goes through the gate
  // (playtest «early taps»: a selection tap is never refused – she may start while the instruction is still being said)
  Sc.pcs.forEach((pc, i) => Sc.B.pick(pc, () => { if (w.locked || S.locked || S.solved) return; setSel(i, !sel.has(i)); if (solNow && sel.has(i)) glow(pc, false); }));
  const onDone = b => { if (S.locked || w.locked || S.solved) return; if (!K.gateOk()) return; if (!sel.size) { if (b) { b.classList.remove('kshake'); void b.offsetWidth; b.classList.add('kshake'); } return; } S.submit(value(), w); };
  const done = S.kitButton ? S.kitButton('✓ ' + (F.UI.caseText ? F.UI.caseText('ferdig') : 'ferdig'), () => onDone(done), 'kdone') : (() => {
    const b = F.UI.el('button', 'kbtn kdone lf-done', '✓ ' + (F.UI.caseText ? F.UI.caseText('ferdig') : 'ferdig'));
    b.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); onDone(b); });
    S.tray().appendChild(b); if (F.UI._trayUpd) F.UI._trayUpd(); return b;
  })();
  // look-back: what HER choice means in the scene – the ones that should not get anything wobble, then go back
  K.lookBack(async v => {
    const vv = Array.isArray(v) ? v : value();
    const extra = vv.filter(i => p.ikind === 'count' ? p.objs[i].key !== a.key : !item.target.includes(i));
    await Promise.all(extra.slice(0, 4).map(i => wobble(Sc.pcs[i])));
  });
  K.hint(async (tag, v) => {
    const vv = Array.isArray(v) ? v : value();
    if (p.ikind === 'count') await say(vv.some(i => p.objs[i].key !== a.key) ? 'lf2_h_feil' : 'lf2_h_tell');
    else if (/ikke/.test(F.TPL.text(p.tpl, {}, 0)) && vv.some(i => !item.target.includes(i))) await say('lf2_h_ikke');
    else if (p.ikind === 'size') await say('lf2_h_storrelse');
    else if (vv.some(i => !item.target.includes(i))) await say('lf2_h_feil');
    else await say('lf2_h_alle');
    await instr();
  });
  K.sol(async () => { w.solution(); await say('lf2_sol'); });
  await armP;
  Sc.pcs.forEach(pc => glow(pc, false));
  done.remove();
  // payoff: the chosen things go into the basket / each chosen animal gets its food
  const chosen = value();
  if (basket && recv) { for (const i of chosen) { if (S.ended) break; await hopTo(Sc.pcs[i], recv.position.clone().add(new V3(0, 0.35, 0)), 380, 0.7); Sc.pcs[i].scale.multiplyScalar(0.7); } sparkle(recv); }
  else if (p.recv) {
    for (const i of chosen) { if (S.ended) break; const f = F.NUM.piece(p.recv.model, {}, 0.32, { hk: 0.85 }); Sc.B.add(f, Sc.pcs[i].position.x, Sc.pcs[i].position.z + 0.25, 0.9); popIn(f); try { F.FX.burst(Sc.pcs[i].getWorldPosition(new V3()).add(new V3(0, 0.6, 0)), { kind: 'heart', n: 8 }); } catch (e) {} F.sfx.pling && F.sfx.pling(chosen.indexOf(i)); await sleep(240); }
  } else { chosen.forEach(i => sparkle(Sc.pcs[i])); }
  await sleep(300);
  return finish(K, item, S, 'lf2_ok');
}
// without the diorama board (should not happen in the game): the stage's own widgets
async function fallback78(K, item, S) {
  const p = K.p;
  if (p.kind === 'instr') {
    await S.prompt(p.tpl, {}, { voice: '' }); S.replay = () => say(p.tpl);
    const check = v => p.ikind === 'count' ? (v.length === p.ans.n && v.every(i => p.objs[i].key === p.ans.key)) : setEq(v, item.target);
    if (S.tapAll) await S.tapAll(p.objs.map((o, i) => ({ v: i, model: o.model })), { answer: item.target, check });
    else await S.custom({ kind: 'none', values: [], feed: v => S.submit(v, S.active), mark() {}, solution() {}, lock() {}, destroy() {} }, { answer: item.target, check });
    return S.result();
  }
  S.replay = async () => { await tellStory(K, p.sents); await say(p.qTpl); };
  await K.talk(async () => { await say('lf_intro'); await tellStory(K, p.sents); });
  await S.prompt(p.qTpl, {}, { voice: '' });
  await S.objects(p.objs.map(o => ({ model: o.model, word: o.key })), { answer: item.target, hintTarget: null, valueMap: i => i });
  return S.result();
}

/* ---------------------------------------------------------- F79 Bildehylla (LF4 story cards; Lo3 line-ups) */
tdef('F79', {
  name: 'Bildehylla', strands: { 'LES-F': rungsFor(['cards'], [[4, 4]]), LOGIKK: [3, 3] }, places: ['bibliotek', 'library', 'fortellerrom', 'any'], family: 'rekkefolge', think: 'FORSTÅ', portable: true, mode: 'order',
  tpl: ['lf4_intro', 'lf4_legg', 'lo3_hor'],
  g: it => it.g,
  async run(item, S) {
    if (item.strand === 'LOGIKK' || (item.params && item.params.kind === 'lineup')) return runLo3(item, S, this);
    ensure(item, ['cards'], [1, 2, 3, 4, 5, 6].filter(r => kindOf(r) === 'cards'));
    if (!(item.params && item.params.kind === 'cards')) return noItem(S, 'F79');
    const K = Kit(item, S, this);
    item.think = THINK;
    return runCards(K, item, S);
  },
});
function shelfScene(K) {
  const S = K.S; if (!S.has3D || !S.model) return;
  try {
    const shelf = ['f_bokhylle', 'tmp_c_bokhylle', 'hylle'].find(m => F.VOX.has(m));
    if (shelf) S.model(shelf, { size: 1.7, pos: S.anchor.clone().addScaledVector(S.right, -1.1) });
    if (F.VOX.has('ch_puff')) { const pf = S.model('ch_puff', { size: 0.8, pos: S.anchor.clone().addScaledVector(S.right, 0.9).add(new V3(0, 0.4, 0)) }); K.teller = pf; }
  } catch (e) { console.warn('[f_lesf] shelf scene', e); }
}
async function runCards(K, item, S) {
  const p = K.p, n = p.cards.length;
  shelfScene(K);
  const story = async () => { await tellStory(K, p.sents); };
  S.replay = async () => { await story(); await say('lf4_legg'); };
  await K.talk(async () => { const nI = F.Task._lf4Intro = (F.Task._lf4Intro || 0) + 1; await say(nI <= 2 ? 'lf4_intro' : 'lf_kort'); await story(); });
  await S.prompt('lf4_legg', {}, { voice: '' });
  if (p.extra) await K.talk(async () => { await say('lf4_ekstra'); });
  const items = p.cards.map(c => ({ v: c.key, model: c.model, opts: c.opts || {} }));
  const extra = p.extra ? [{ v: p.extra.key, model: p.extra.model, opts: p.extra.opts || {} }] : [];
  const hint = async (tag, v) => {
    const vv = Array.isArray(v) ? v : [];
    if (p.extra && vv.includes(p.extra.key)) await say('lf4_h_ekstra'); else await say('lf4_h_forst');
    await say('lf_igjen'); await story();
  };
  if (S.order) await S.order(items, { answer: item.target.slice(), extra, hint });
  else await S.chips(item.target.map((_, i) => i), { answer: 0 });               // (kit missing: never in the game)
  // payoff: after a miss (or at s0) the story is told once more, card by card – a first-try A at s1/s2 just gets the praise (pace)
  if (!S.ended && (S.result().outcome !== 'A' || K.sup <= 0)) {
    const slots = [...document.querySelectorAll('.korder .kshelf .kslot')];
    await say('lf4_retell');
    for (let i = 0; i < n && !S.ended; i++) {
      const sl = slots[i]; if (sl) sl.classList.add('lf-tell');
      if (K.teller) bounce(K.teller, 0.12);
      await say(p.sents[i]);
      if (sl) sl.classList.remove('lf-tell');
      await sleep(120);
    }
  }
  return finish(K, item, S, 'lf4_ok');
}
// LOGIKK Lo3 (gen_reason.js, WP-M): clues spoken, then the line-up on the shelf (or tap who is first / last)
async function runLo3(item, S, spec) {
  if (!(item.params && item.params.kind === 'lineup') && F.REASON && F.REASON.gen) {
    const rng = U.rng(((U.hashStr ? U.hashStr(String(item.id || 'x')) : 9) ^ (F.T.now * 1000 | 0)) >>> 0);
    let it = null; for (let t = 0; t < 6 && !it; t++) { it = F.REASON.gen('LOGIKK', 3, item.sup == null ? 1 : item.sup, rng, { format: 'F79' }); if (it && it.params.kind !== 'lineup') it = null; }
    if (it) { const keep = { id: item.id, format: item.format, kind: item.kind, golden: item.golden }; for (const k in item) if (!(k in keep)) delete item[k]; Object.assign(item, it, keep); }
  }
  const p = item.params || {};
  if (p.kind !== 'lineup') return noItem(S, 'F79 Lo3 (gen_reason.js)');
  const K = Kit(item, S, spec);
  item.think = 'DEDUKSJON';
  shelfScene(K);
  const ids = p.ents.map(e => e.id), line = p.ask === 'line';
  const sayClues = async () => { for (const c of p.clues) { if (S.ended) return; await say(c.tpl, F.LO3say ? F.LO3say(c) : {}); await sleep(180); } };
  S.replay = async () => { await sayClues(); await say(p.askTpl); };
  const brokenClue = v => p.clues.find((c, k) => {
    const r = p.rel[k];
    if (line) { if (!Array.isArray(v)) return false; if (r.pos) return r.pos === 'first' ? v[0] !== r.a : v[v.length - 1] !== r.a; return v.indexOf(r.a) > v.indexOf(r.b); }
    if (r.pos) return (p.ask === 'last' && r.pos === 'last' && r.a !== v) || (p.ask === 'first' && r.pos === 'first' && r.a !== v);
    return p.ask === 'first' ? r.b === v : r.a === v;
  });
  const hint = async (tag, v) => { const vv = line ? v : (typeof v === 'number' ? ids[v] : v); const b = brokenClue(vv); if (b) await say(b.tpl, F.LO3say ? F.LO3say(b) : {}); else { await say('lo3_hor'); await sayClues(); } };
  const cards = p.ents.map(e => ({ v: e.id, label: F.LO3name ? F.LO3name(e.id) : e.id, model: e.model, opts: e.opts || {} }));   // v5d (#57)
  // the children / pets are on the shelf while the clues are said (like F71's yard): the clues are «the prompt» (gate closed)
  let ansP = null;
  await K.talk(async () => {
    if (line && S.order) ansP = S.order(cards, { answer: item.target.slice(), withLabel: true, hint });
    else {
      S.hint = async (tag, v) => { try { await hint(tag, v); } catch (e) { console.error(e); } };
      ansP = S.objects(p.ents.map(e => ({ model: e.model, opts: e.opts || {}, word: e.id })), { thumbs: true, answer: ids.indexOf(item.target), labels: ids, hintTarget: null, valueMap: i => i });
    }
    await say('lf_lo3_intro'); await say('lo3_hor'); await sayClues(); await say(p.askTpl);
  });
  S.lastPrompt = { id: p.askTpl, slots: {}, voice: '' };
  await ansP;
  return finish(K, item, S, 'rs_f71_ok');
}
// v5d WP-R3: the formats' LES-F rung ranges follow the ladder even when ladders.js loads after this file (re-derived on boot)
const reRung = () => { try { const d = F.Task && F.Task.defs; if (!d) return;
  if (d.F78 && d.F78.strands) d.F78.strands['LES-F'] = rungsFor(['story', 'instr', 'read'], [[1, 3]]);
  if (d.F79 && d.F79.strands) d.F79.strands['LES-F'] = rungsFor(['cards'], [[4, 4]]); } catch (e) { /* keep the load-time ranges */ } };
if (typeof F.on === 'function') F.on('boot', reRung);
})();
