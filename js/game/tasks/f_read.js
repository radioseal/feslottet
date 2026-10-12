/* Feslottet – reading formats F23–F32 (LES). Owner: FORMATS-W.   Uses the stage kit S (js/game/tasks/stage.js).
   P0: F23 Ønskelappen (word → real 3D thing), F24 Krukkehylla (picture → jar label), F25 Boktittelen (picture → book title),
       F27 Dørskiltene (picture → door plaque).   P1: F26, F28–F32 (below, when present).
   Reading rule: the target word is NEVER spoken before her first attempt. LES s0 = «lydering»: tapping the note lights its
   letters one by one with their letter SOUNDS (never the whole word); s1 = lydering offered after 6 s; s2 = none.
   Shared helpers live on F.RW (also used by f_write.js): words/distractors/model checks, the wish model, word-object picking.
   v4 (WP-R, hint_leaks 5/6/12, C7; SYNTHESIS §3.3): F23 6 / 8 real objects at s1 / s2, F24 F25 F27 5 / 6 plaques (g ≤ 0.2);
   from rung 4 at s1 at least one distractor shares the target's first letter (the first letter alone never picks the answer);
   F29 look-alike endings that do not rhyme + at s2 BOTH rhymes among 6 bells (g 1/15); F32 never offers the source word (3 / 5 / 6
   objects); F30 Ja/Nei + an evidence tap on the word that shows it (2T, g ≈ 1/8). Items declare g/mode/think.
   v5 (WP-R2, DESIGN5 §7): F23 ctx.noteKind / params.noteKind 'wish' | 'letter' | 'clue' | 'order' | 'list' (#9: only a wish is handed
   to the reader) and ctx.good / params.good (the stall's good is the note's word, #8); RW.semOk – one semantic distractor filter (no
   umbrella / synonym / baby pair, riddles: nothing else that fits the clues; #14 #15) used by RW.distractors and F31; rhymes by sound
   (nd → nn, ld → ll, rd → r; #54); the F24 bake line only in a kitchen (#53). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = THREE.Vector3;
const RW = F.RW = F.RW || {};

/* =================================================================== shared helpers */
const VOW = 'aeiouyæøå';
const CONF = { b: 'dp', d: 'bt', p: 'bt', g: 'kj', k: 'gt', t: 'dk', m: 'n', n: 'm', o: 'øåu', ø: 'oe', å: 'oa', e: 'æi', æ: 'e', i: 'ye', y: 'iø', u: 'oy', a: 'åe',
  s: 'f', f: 'sv', v: 'f', l: 'r', r: 'l', h: 'j', j: 'h' };
RW.list = () => (F.WORDS && F.WORDS.list) || [];
RW.entry = w => (F.WORDS && F.WORDS.get ? F.WORDS.get(w) : null);
RW.model = w => { const e = RW.entry(w); const m = (e && e.model) || w; return F.VOX.has(m) ? m : (F.VOX.has(w) ? w : null); };
RW.hasModel = w => !!RW.model(w);
RW.rng = item => U.rng(U.hashStr(String(item.id || item.key || item.word || 'x') + ':' + (item.format || '')));
RW.tag = (t, v) => (F.Task && F.Task.tagWord ? F.Task.tagWord(t, v) : null) || 'OTHER';
RW.nChoices = (item, def) => item.params && item.params.n ? item.params.n : (def || [2, 3, 4][U.clamp(item.sup == null ? 1 : item.sup, 0, 2)]);
// make sure the target has a model when the format needs a picture; keeps the item's strand/rung
RW.ensureModelWord = function (item, strand) {
  const w = item.word || item.target;
  if (w && RW.hasModel(w)) { item.word = w; return w; }
  const L = RW.list(), r = item.rung || 1, rng = RW.rng(item);
  const ok = x => x.castable && F.VOX.has(x.model || x.w) && x.w.length >= 3 && x.w.length <= 6;
  for (let d = 0; d <= 9; d++) {
    const cand = L.filter(x => ok(x) && x.rung && (Math.abs((x.rung[strand] || 0) - r) === d));
    if (cand.length) { const nw = U.pick(rng, cand).w; RW.retarget(item, strand, nw); return nw; }
  }
  const any = L.filter(ok); const nw = any.length ? U.pick(rng, any).w : (Object.keys(F.VOX.defs).find(k => /^[a-zæøå]{3,6}$/.test(k)) || 'kake');
  RW.retarget(item, strand, nw); return nw;
};
RW.retarget = function (item, strand, w) { item.word = w; item.target = w; item.key = (strand || item.strand || 'LES') + ':' + w; item.choices = null; item.distractors = null; };
/* v5 WP-R2 (logic #14 / #15, §3-G): ONE semantic distractor filter. A distractor must not ALSO be right: no umbrella word with one of its
   members (fugl / and, båt / kano, plante / palme), no near-synonym or baby/grown pair (lam / sau, lykt / lys, kopp / glass, stol /
   trone), and for riddles no thing that also fits the clues (RIDDLE_ALSO: «Den er kald og hvit» → not melk). RW.semOk(answer, x). */
const BIRDS = ['fugl', 'and', 'gås', 'høne', 'due', 'måke', 'ugle', 'svane', 'kylling', 'spurv', 'kråke', 'papegøye', 'pingvin', 'stork', 'hakkespett', 'meis', 'skjære', 'ravn'];
const UMB = {
  fugl: BIRDS.slice(1), plante: ['blomst', 'rose', 'tulipan', 'palme', 'tre', 'busk', 'kaktus', 'solsikke', 'gress'], blomst: ['rose', 'tulipan', 'solsikke', 'lilje', 'plante'],
  båt: ['skip', 'kano', 'robåt', 'ubåt', 'seilbåt', 'ferje', 'flåte'], tre: ['palme', 'gran', 'bjørk', 'eik'],
  frukt: ['eple', 'pære', 'banan', 'appelsin', 'plomme', 'sitron', 'druer', 'kirsebær', 'jordbær', 'bær'], bær: ['jordbær', 'blåbær', 'bringebær', 'kirsebær'],
  dyr: ['katt', 'hund', 'sau', 'gris', 'hest', 'ku', 'mus', 'kanin', 'frosk', 'fisk', 'løve', 'elg', 'bjørn', 'rev', 'ulv', 'hval', 'and', 'gås', 'fugl', 'lam', 'kalv', 'føll', 'valp', 'ponni', 'geit', 'esel', 'hare', 'ekorn', 'pinnsvin', 'sel'],
  fisk: ['laks', 'torsk', 'makrell', 'gullfisk', 'hai'], mat: ['brød', 'kake', 'bolle', 'ost', 'pølse', 'pizza', 'suppe', 'vaffel', 'egg', 'fisk'],
  leke: ['ball', 'bamse', 'dukke', 'drage', 'jojo', 'tog', 'bil', 'kloss'], møbel: ['stol', 'bord', 'seng', 'sofa', 'benk', 'skap', 'trone'],
  sko: ['støvel', 'tøfler', 'sandal'], lys: ['lykt', 'lampe', 'stearinlys'],
};
const SYN = [['lam', 'sau'], ['lykt', 'lys'], ['lykt', 'lampe'], ['lampe', 'lys'], ['kopp', 'glass'], ['stol', 'trone'], ['stol', 'benk'], ['føll', 'hest'], ['ponni', 'hest'],
  ['kalv', 'ku'], ['valp', 'hund'], ['kattunge', 'katt'], ['kylling', 'høne'], ['hare', 'kanin'], ['vott', 'hanske'], ['skjerf', 'sjal'], ['bok', 'avis'],
  ['hus', 'hytte'], ['stein', 'klippe'], ['bamse', 'pute'], ['sky', 'tåke'], ['sofa', 'benk'], ['jakke', 'kåpe'], ['lue', 'hatt'], ['genser', 'trøye'], ['bil', 'buss']];
const SYNK = new Set(SYN.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
// riddles: things that also fit the clues (keyed by the answer)
const RIDDLE_ALSO = {
  snø: ['melk', 'is', 'sukker', 'sky'], melk: ['snø', 'vann'], måne: ['lampe', 'lykt', 'lys', 'stjerne'], sol: ['lampe', 'lykt', 'lys', 'stjerne'],
  stol: ['trone', 'benk', 'sofa', 'hest', 'ponni', 'ku', 'gris', 'sau', 'bord'], kopp: ['glass', 'flaske', 'mugge', 'bolle'], seng: ['telt', 'hytte', 'hus', 'køye', 'sofa'],
  fugl: BIRDS.slice(1).concat(['engel']), tre: ['palme', 'gran', 'bjørk'], fisk: ['and', 'svane', 'gås', 'hval', 'frosk', 'sel', 'delfin', 'hai', 'båt'],
  fly: ['fugl', 'ballong', 'drage', 'helikopter', 'bie', 'sommerfugl', 'and', 'gås', 'måke', 'ugle', 'due', 'svane'],
  båt: ['skip', 'kano', 'robåt', 'ubåt', 'flåte', 'and', 'svane', 'gås', 'ball'], vott: ['hanske'], bok: ['avis', 'blad'],
  banan: ['ost', 'sitron', 'mais', 'smør', 'egg', 'kake', 'bolle'], kanin: ['hare'], bamse: ['pute', 'dyne', 'dukke'], peis: ['ovn', 'lampe'],
  hus: ['hytte', 'slott', 'telt'], frosk: ['gresshoppe'], gitar: ['fiolin', 'harpe'], rose: ['jordbær', 'tulipan', 'blomst', 'eple'],
  krone: ['hatt', 'lue', 'tiara'], hest: ['ponni', 'elefant', 'kamel', 'esel'], sky: ['snø'], dukke: ['bamse'],
};
RW.semOk = function (a, b, o) {
  a = String(a || '').toLowerCase(); b = String(b || '').toLowerCase();
  if (!a || !b || a === b) return a !== b;
  if (SYNK.has(a + '|' + b)) return false;
  if ((UMB[a] && UMB[a].includes(b)) || (UMB[b] && UMB[b].includes(a))) return false;
  if (o && o.riddle && RIDDLE_ALSO[a] && RIDDLE_ALSO[a].includes(b)) return false;
  // v5d WP-R3 (WP-E2 request): ONE source for the word data – words.js semRel (umbrella words, young-of / near-synonym pairs),
  // RIDDLE_ALSO keyed by the riddle TEXT (o.riddle as a string) and the bank item's params.also (other words that fit)
  const Wd = F.WORDS || {};
  if (typeof Wd.semRel === 'function' && Wd.semRel(a, b)) return false;
  if (o && typeof o.riddle === 'string' && Wd.RIDDLE_ALSO && (Wd.RIDDLE_ALSO[o.riddle] || []).map(x => String(x).toLowerCase()).includes(b)) return false;
  if (o && Array.isArray(o.also) && o.also.map(x => String(x).toLowerCase()).includes(b)) return false;
  return true;
};
RW.RIDDLE_ALSO = RIDDLE_ALSO;
// distractor words (all different from w). needModel: only words with a VOX model. Graded by support level.
RW.distractors = function (w, n, sup, o) {
  o = o || {};
  const rng = o.rng || F.rand;
  const sem = x => RW.semOk(w, x, { riddle: o.riddle || false, also: o.also });   // v5: never a second right answer (#14 / #15; v5d: words.js semRel)
  const given = (o.given || []).filter(x => x !== w && (!o.needModel || RW.hasModel(x)) && sem(x));
  if (given.length >= n) return given.slice(0, n);
  const pool = RW.list().filter(x => x.w !== w && x.w.length >= 2 && x.w.length <= 7 && !given.includes(x.w) && (!o.needModel || RW.hasModel(x.w)) && (!o.castable || x.castable) && sem(x.w)).map(x => x.w);
  if (!pool.length && o.needModel) { Object.keys(F.VOX.defs).forEach(k => { if (k !== w && /^[a-zæøå]{3,6}$/.test(k) && F.WORDS.get && F.WORDS.get(k)) pool.push(k); }); }
  const ed = (a, b) => { const m = a.length, n2 = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n2; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n2; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n2]; };
  const score = x => {
    const e = ed(w, x), fl = x[0] === w[0], dl = Math.abs(x.length - w.length);
    if (sup <= 0) return (fl ? -5 : 0) + Math.min(e, 4) + (dl ? 1 : 0) + rng() * 2;               // far apart
    if (sup === 1) return (fl ? -4 : 2) - dl * 1.5 + (e >= 2 ? 1 : 0) + rng() * 2.5;           // different first letters, similar length
    return -e * 2 - dl * 2 + (fl ? 1 : 0) + rng() * 1.5;                                        // near-spelling
  };
  const ranked = U.shuffle(rng, pool).map(x => [x, score(x)]).sort((a, b) => b[1] - a[1]).map(a => a[0]);
  const out = given.slice();
  // v4 hint_leaks 12 / C7: o.sameFirst = how many distractors must share the target's first letter (LES s1 from rung 4)
  const needFL = Math.min(o.sameFirst || 0, n);
  if (needFL && out.filter(x => x[0] === w[0]).length < needFL) {
    const fl = ranked.filter(x => x[0] === w[0] && !out.includes(x));
    while (out.filter(x => x[0] === w[0]).length < needFL && fl.length) { if (out.length >= n) { const k = out.findIndex(x => x[0] !== w[0] && !given.includes(x)); if (k < 0) break; out.splice(k, 1); } out.push(fl.shift()); }
  }
  for (const x of ranked) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }
  return out.slice(0, n);
};
RW.choiceSet = function (item, w, o) {
  o = o || {};
  const sup = item.sup == null ? 1 : item.sup;
  const n = (o.byS ? Math.max(item.params && item.params.n ? +item.params.n : 0, o.byS[U.clamp(sup, 0, 2)]) : RW.nChoices(item, o.n)) - 1;
  const fromItem = Array.isArray(item.choices) ? item.choices.filter(x => typeof x === 'string' && x !== w) : [];
  const sameFirst = sup === 1 && (item.rung || 1) >= 4 ? 1 : 0;
  const ds = RW.distractors(w, n, sup, { needModel: o.needModel, given: fromItem, rng: RW.rng(item), sameFirst, also: item.params && Array.isArray(item.params.also) ? item.params.also : null });
  const all = U.shuffle(RW.rng(item), [w, ...ds]);
  item.choices = all; item.distractors = ds.map(v => ({ v, tag: RW.tag(w, v) }));
  RW.meta(item, o.mode || 'scene', 1 / all.length, o.think || 'AVKODE');
  return all;
};
// v4 DESIGN4 §2.9: answer mode + guess probability + thinking type on the item
RW.meta = RW.meta || ((item, mode, g, think) => { if (item) { item.mode = mode; item.g = +(+g).toFixed(4); item._gAuto = false; item._modeAuto = false; item.think = item.think || think; } });
// objects on the stage get smaller and closer when there are many (6–8 real things in one arc)
RW.crowd = n => n >= 7 ? { size: 0.72, spread: 0.84 } : n >= 5 ? { size: 0.86, spread: 1.04 } : {};
// v5 WP-R2 (wave-1 REQUEST WP-K: plaques overlapped at 5–6 in F24/F25/F27/F29): labelled things stand a little wider apart and smaller
RW.crowdL = n => n >= 7 ? { size: 0.7, spread: 1.05 } : n >= 5 ? { size: 0.78, spread: 1.32 } : {};
RW.say = RW.say || ((id, slots, v) => F.SAY(id, slots, v));
RW.sayWord = w => RW.say('rw_word', { w });
RW.voiceFor = (S, id) => { const t = F.TPL.all[id]; if (!t) return ''; return t.voices.includes(S.voice) ? S.voice : (t.voices.includes('') ? '' : t.voices[0]); };
RW.sayS = (S, id, slots) => F.SAY(id, slots || {}, RW.voiceFor(S, id));
// letter sound for lydering (CORE's core_lyd + F.LETTER_SOUND); never the whole word
RW.sound = ch => F.LYD ? F.LYD.letter(ch) : (F.LETTER_SOUND && F.LETTER_SOUND[ch] && F.TPL.has('core_lyd')) ? F.SAY('core_lyd', { s: F.LETTER_SOUND[ch] }, '') : F.T.sleep(200);
// the words of a note with the index of their first letter in note.letters (letters = the text's characters without spaces)
RW.wordsOf = text => { let at = 0; return String(text || '').split(' ').map(wd => { const o = { chars: [...wd], i0: at, clean: wd.toLowerCase().replace(/[^a-zæøå]/g, '') }; at += o.chars.length; return o; }).filter(o => o.clean); };
// sound one word out BY SOUND UNIT (F.LYD): the letters of a unit (kj, ll, ei …) light together; silent letters light without a sound
RW.sayUnits = async (word, els, stop, from) => {
  const units = (F.LYD ? F.LYD.units(word) : [...String(word)].map((c, i) => ({ i0: i, n: 1, ch: c }))).filter(u => !from || u.i0 >= from);
  for (let k = 0; k < units.length; k++) {
    if (stop && stop()) return;
    const u = units[k], lit = [];
    for (let j = 0; j < u.n; j++) { const e = els(u.i0 + j); if (e) { e.classList.add('hl'); lit.push(e); } }
    if (!u.silent) F.sfx.pling(k);
    if (F.LYD) await F.LYD.play(u); else await RW.sound(u.ch);
    await F.T.sleep(u.silent ? 60 : 110); lit.forEach(e => e.classList.remove('hl'));
  }
};

/* lydering on a note (S.note): tap → its letters light one by one with their sounds. s0: at once; s1: after 6 s; s2: never. */
RW.lydering = function (S, note, word, sup) {
  if (!note || !note.el || sup >= 2) return;
  let busy = false;
  const run = async () => {
    if (busy || S.ended || S.solved) return; busy = true;
    note.el.classList.remove('rw-tap');
    // note letters are the note text's characters without spaces – sounded word by word, by sound unit (punctuation is skipped)
    const ws = note.text ? RW.wordsOf(note.text) : [{ chars: [...word], i0: 0, clean: word }];
    for (const o of ws) {
      if (S.ended) break;
      await RW.sayUnits(o.chars.join(''), j => note.letters[o.i0 + j], () => S.ended);
      if (ws.length > 1) await F.T.sleep(200);
    }
    busy = false;
    if (!S.ended && !S.solved) note.el.classList.add('rw-tap');
  };
  const arm = () => { if (S.ended) return; note.el.classList.add('rw-tap'); note.el.addEventListener('click', e => { e.stopPropagation(); run(); }); };
  if (sup <= 0) arm(); else S.timeout(() => { if (!S.solved && !S.ended) { arm(); if (!S.hinting) RW.say('rw_tap_note', {}, ''); } }, 6000);
  S.lydering = run;
};

/* a hint for sentence/phrase notes (never the answer VALUE): «Hør på lydene» + one word ON the note sounded out letter by letter.
   key: 'all' = every word; a word = that word if it is on the note; otherwise the longest word. */
RW.noteHint = (S, note, key) => async () => {
  if (!note || !note.letters || S.solved || S.ended) return;
  const ws = RW.wordsOf(note.text);
  if (!ws.length) return;
  let pick = ws;
  if (key !== 'all') {
    const k = key ? String(key).toLowerCase() : '';
    const hit = k && ws.find(o => o.clean === k);
    pick = [hit || ws.reduce((a, b) => (b.clean.length > a.clean.length ? b : a))];
  }
  S.hinting = true;
  try {
    await S.say('core_h_lyd', {}, '');
    for (const o of pick) {
      if (S.solved || S.ended) return;
      await RW.sayUnits(o.chars.join(''), j => note.letters[o.i0 + j], () => S.solved || S.ended);
      await F.T.sleep(250);
    }
  } catch (e) { /* stage ended mid-hint */ } finally { S.hinting = false; note.letters.forEach(e => e.classList.remove('hl')); }
};

RW.plaqueLyd = function (S, labels, words) {
  const sup = S.item.sup == null ? 1 : S.item.sup;
  if (sup >= 2) return;
  const arm = () => labels.forEach((L, i) => {
    if (!L || !L.el || S.ended) return;
    const w = words[i]; L.el.textContent = '';
    const spans = [...w].map(ch => { const e = F.UI.el('span', 'lch', F.UI.caseText(ch)); L.el.appendChild(e); return e; });
    L.el.classList.add('rw-plq'); L.el.style.pointerEvents = 'auto';
    let busy = false;
    L.el.addEventListener('pointerdown', e => e.stopPropagation());
    L.el.addEventListener('click', async e => {
      e.stopPropagation(); if (busy || S.ended || S.solved) return; busy = true;
      await RW.sayUnits(w, k => spans[k], () => S.ended);
      busy = false;
    });
  });
  if (sup <= 0) arm(); else S.timeout(() => { if (!S.solved) arm(); }, 6000);
};
/* the wish: a REAL 3D model floating in a soap-bubble above the NPC (or above the stage when there is no NPC) */
RW.wish = function (S, modelId, o) {
  o = o || {};
  if (!modelId || !F.VOX.has(modelId)) return null;
  const g = new THREE.Group();
  const m = F.VOX.make(modelId, o.opts || {});
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(new V3());
  const k = (o.size || 0.8) / Math.max(s.x, s.y, s.z, 0.05); m.scale.setScalar(k); m.position.y = -s.y * k / 2;
  g.add(m);
  const bub = new THREE.Mesh(new THREE.SphereGeometry((o.size || 0.8) * 0.82, 22, 16), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, shininess: 120, specular: 0xffffff, depthWrite: false }));
  g.add(bub);
  // beside the NPC's head (above it would leave the screen at play zoom); without an NPC: floating behind the stage
  const base = S.has3D && S.npc ? S.base.clone().addScaledVector(S.right, 1.25).addScaledVector(S.toCam, 0.3) : S.anchor.clone().addScaledVector(S.toCam, -1.4);
  const h = S.has3D && S.npc ? (o.h || 1.75) : (o.h || 1.5);
  g.position.set(base.x, base.y + h, base.z);
  F.Space.scene().add(g); S.objs.push(g);
  g.scale.setScalar(0.01);
  F.T.tween(420, kk => g.scale.setScalar(Math.max(0.01, U.smooth(kk) * (1 + Math.sin(kk * Math.PI) * 0.15))));
  const t0 = F.T.now, y0 = g.position.y;
  const off = F.on('tick', () => { if (!g.parent) { off(); return; } const t = F.T.now - t0; g.position.y = y0 + Math.sin(t * 2) * 0.08; m.rotation.y = Math.sin(t * 0.9) * 0.6; });
  S.offs.push(off);
  g.userData.model = m;
  return g;
};
// pop the wish bubble (payoff)
RW.popWish = function (g) {
  if (!g || !g.parent) return;
  F.FX.burst(g.position, { n: 22, colors: [0xffffff, 0xcfefff, 0xffb3d1], speed: 2, up: 1, life: 0.6, size: 0.05, gravity: 1 }); F.sfx.pop();
  g.parent.remove(g);
};

/* the wish as a BIG picture card at the bottom (picture → word formats): a non-reader sees at once what is wanted.
   Tap = it wobbles and sparkles (the word is never spoken before her first attempt). */
RW.wishCard = function (S, modelId, o) {
  o = o || {};
  if (!modelId || !F.VOX.has(modelId)) return null;
  // without a 3D stage the answers are thumb chips in the bottom tray → the card goes to the top
  const el = F.UI.el('div', 'rw-wishcard' + (o.cls ? ' ' + o.cls : '') + (S.has3D ? '' : ' top'));
  const ring = F.UI.el('div', 'rw-wc-ring'); el.appendChild(ring);
  const img = F.Thumb.img(modelId, o.opts || {}, { size: 220 }); img.classList.add('rw-wc-img'); el.appendChild(img);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => { e.stopPropagation(); F.sfx.sparkle(); el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); });
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  const card = { el, remove() { el.classList.remove('on'); setTimeout(() => el.remove(), 350); }, done() { el.classList.add('done'); } };
  S.notes.push(card);
  return card;
};
// a word on a golden card at the bottom (F29: the word that rings – not the reading target, so tapping says it)
RW.wordCard = function (S, text, onTap) {
  const el = F.UI.el('div', 'rw-wordcard' + (S.has3D ? '' : ' top'));
  const bell = F.UI.el('div', 'rw-bell'); el.appendChild(bell);
  el.appendChild(F.UI.el('span', 'rw-wc-text', F.UI.caseText(text)));
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => { e.stopPropagation(); if (S.ended) return; el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); if (onTap) onTap(); });
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  const card = { el, remove() { el.classList.remove('on'); setTimeout(() => el.remove(), 350); } };
  S.notes.push(card);
  return card;
};
// bigger plaques for picture → word; the chosen one turns green (right) or shakes (wrong)
RW.bigPlaques = function (S, labels) {
  labels.forEach(L => { if (L && L.el) L.el.classList.add('rw-big'); });
  // crowded (small screens, 4 choices, long words): every other plaque steps up so no two plaques ever cover each other
  const unCrowd = () => {
    const els = labels.map(L => L && L.el).filter(e => e && e.isConnected && e.style.display !== 'none');
    const rs = els.map(e => e.getBoundingClientRect());
    const hit = rs.some((a, i) => rs.some((b, j) => j > i && a.width && b.width && a.left < b.right + 6 && b.left < a.right + 6 && a.top < b.bottom && b.top < a.bottom));
    if (hit) { const order = els.map((e, i) => [e, rs[i].left]).sort((a, b) => a[1] - b[1]); order.forEach(([e], i) => e.classList.toggle('rw-up', i % 2 === 1)); }
  };
  S.timeout(unCrowd, 450); S.timeout(unCrowd, 1300); S.timeout(unCrowd, 2600); S.timeout(unCrowd, 4500);   // (v5: again after the stage fit)
  const w = S.active; if (!w || !w.mark || w._rwMark) return;
  const m0 = w.mark; w._rwMark = true;
  w.mark = (i, cls) => {
    m0(i, cls);
    const L = labels[i]; if (!L || !L.el) return;
    L.el.classList.remove('right', 'wrong'); void L.el.offsetWidth; L.el.classList.add(cls === 'right' ? 'right' : 'wrong');
    if (cls !== 'right') S.timeout(() => L.el.classList.remove('wrong'), 900);
  };
};

/* tap the real 3D thing among words' models (word → object) or tap the object whose plaque has the word (picture → word).
   Resolves with the chosen word when solved; the stage protocol handles errors, hints and the solution. */
RW.pickObject = function (S, words, target, o) {
  o = o || {};
  const idx = words.indexOf(target);
  // no 3D stage (thumb chips in the tray): plaque formats become big WORD chips – the words are what she must read
  if (o.labels && !S.has3D) {
    S.expected = target;
    S.tagOf = v => RW.tag(target, v);
    if (o.hint) S.hint = o.hint;
    return S.chips(words.slice(), { kind: 'word', answer: target });
  }
  const models = words.map((w, i) => o.models ? o.models[i] : { model: RW.model(w) || w, opts: o.opts ? o.opts[i] : undefined });
  const p = S.objects(models, Object.assign({}, o.objects || {}, { answer: idx, labels: o.labels || undefined, labelKind: o.labelKind }));
  // the protocol compares words (so hints/tags are word hints, not number hints)
  S.expected = target;
  S.check = v => words[v] === target || v === target;
  S.tagOf = v => RW.tag(target, typeof v === 'number' ? words[v] : v);
  S._solFn = async () => { if (S.active && S.active.solution) S.active.solution(idx); await S.say('core_sol_chip', {}, ''); };
  if (o.hint) S.hint = o.hint;
  // LES s0 (and s1 after 6 s): every plaque can be tapped to sound it out letter by letter (never the whole word)
  if (o.labels) { RW.plaqueLyd(S, S.labels.slice(-words.length), words); RW.bigPlaques(S, S.labels.slice(-words.length)); }
  return p.then(i => { S._solFn = null; return typeof i === 'number' ? words[i] : i; });
};
// a picture→word hint: «Hør på første lyd» + the first letter's sound, and the first letter of every plaque blinks
RW.firstSoundHint = (S, target, labels) => async (tag, v) => {
  // she chose a word with the same first letter: sound the target up to the first letter where they differ (bl… vs br…)
  let chosen = typeof v === 'string' ? v : (typeof v === 'number' && labels && labels[v] ? labels[v].raw : null);
  chosen = chosen != null ? String(chosen) : '';
  let d = 0; while (chosen && d < target.length && chosen[d] === target[d]) d++;
  if (chosen && chosen !== target && d > 0 && d < target.length) {
    try {
      await S.say('core_h_lyd', {}, '');
      const us = F.LYD ? F.LYD.units(target).filter(u => u.i0 <= d) : [];
      if (us.length) for (const u of us) { if (S.solved || S.ended) break; await F.LYD.play(u); await F.T.sleep(90); }
      else for (let i = 0; i <= d && !S.solved && !S.ended; i++) { await RW.sound(target[i]); await F.T.sleep(90); }
    } catch (e) { /* stage ended */ }
    return;
  }
  await S.say('core_h_first', {}, '');
  if (labels) labels.forEach(L => {
    if (!L || !L.el) return;
    const f = L.el.querySelector('.lch');
    if (f) { f.classList.add('hl'); S.timeout(() => f.classList.remove('hl'), 2200); }
    else { L.el.classList.add('rw-first'); S.timeout(() => L.el.classList.remove('rw-first'), 2200); }
  });
  await RW.sound(target[0]);
};
// where the stage objects are (after S.objects) – for payoffs
RW.items = S => (S.active && S.active.items) || [];
RW.npcPos = S => (S.npc && S.has3D) ? S.base.clone() : null;
RW.fly = function (obj, to, ms, arc) {
  const p0 = obj.position.clone();
  return F.T.tween(ms || 650, k => { obj.position.set(U.lerp(p0.x, to.x, k), U.lerp(p0.y, to.y, k) + Math.sin(k * Math.PI) * (arc == null ? 0.9 : arc), U.lerp(p0.z, to.z, k)); });
};
// the NPC receives the chosen thing (or the fairy keeps it): it flies over, shrinks into the NPC with sparkles
RW.giveToNpc = async function (S, it, word) {
  if (!it) return;
  const np = RW.npcPos(S);
  if (!np) { F.FX.burst(new V3(it.pos.x, it.pos.y + 0.6, it.pos.z), { n: 20, colors: F.Wand.skinCols(), speed: 1.5, up: 2, life: 0.8, size: 0.06 }); return; }
  await RW.fly(it.holder, new V3(np.x, np.y + 1.3, np.z), 700, 1.0);
  F.FX.burst(new V3(np.x, np.y + 1.5, np.z), { n: 18, colors: [0xff7fb0, 0xffd84a, 0xffffff], speed: 1, up: 1.6, life: 0.9, size: 0.06, gravity: -0.2 });
  await F.T.tween(220, k => it.holder.scale.setScalar(Math.max(0.01, 1 - k)));
  const tag = F.Wand.tagOf(word);
  const a = S.npc;
  if (a && a.react) { try { await a.react(tag, RW.model(word) || word); } catch (e) { console.warn(e); } return; }   // LIFE: eats / wears / adopts …
  const line = { eat: 'wand_npc_eat', wear: 'wand_npc_wear', cuddle: 'wand_npc_cuddle', pet: 'wand_npc_cuddle', warm: 'wand_npc_warm' }[tag] || 'wand_npc_thanks';
  if (a && a.obj && a.obj.userData && a.obj.userData.play) a.obj.userData.play(tag === 'wear' ? 'dance' : 'cheer', 1.4);
  await RW.sayS(S, line);
};

/* =================================================================== container models (jars, books, doors) – only if nobody else made them */
const D = (id, spec) => { if (!F.VOX.has(id)) F.VOX.def(id, spec); };
D('fx_krukke', { size: [10, 15, 10], scale: 1 / 16,
  build(v, o) {
    v.cyl(4.5, 1, 4.5, 4.4, 10, 'glass');
    v.cyl(4.5, 1, 4.5, 3.4, 7, o.fill || 'cream');
    v.cyl(4.5, 0, 4.5, 4.4, 1, 'stone2');
    v.cyl(4.5, 11, 4.5, 4.8, 2, o.c || 'woodRed'); v.cyl(4.5, 13, 4.5, 1.6, 2, o.c || 'woodRed');
    v.box(2, 4, 9, 7, 7, 9, 'white');
  }, meta: { group: 'fx', variants: { c: ['woodRed', 'roofMint', 'lavender', 'honey'] } } });
D('fx_bok', { size: [13, 17, 5], scale: 1 / 16,
  build(v, o) {
    const c = o.c || 'rose';
    // an upright picture book showing its cover: spine on the left, page edges on the right
    v.box(0, 0, 0, 12, 16, 4, c);
    v.box(12, 1, 1, 12, 15, 3, 'cream'); v.box(1, 16, 1, 11, 16, 3, 'cream');
    v.box(0, 0, 0, 1, 16, 4, 'woodDark');
    v.box(2, 2, 4, 11, 2, 4, 'gold'); v.box(2, 14, 4, 11, 14, 4, 'gold');
    v.box(4, 6, 4, 9, 11, 4, 'white'); v.box(5, 7, 4, 8, 10, 4, o.c2 || 'butter');
  }, meta: { group: 'fx', variants: { c: ['rose', 'sky', 'mint', 'lilac', 'butter', 'coral'] } } });
D('fx_dor', { size: [14, 24, 4], scale: 1 / 16,
  build(v, o) {
    v.box(0, 0, 0, 13, 21, 3, 'stone'); v.box(1, 22, 0, 12, 22, 3, 'stone'); v.box(3, 23, 0, 10, 23, 3, 'stone');
    v.clear(2, 0, 0, 11, 19, 3); v.clear(3, 20, 0, 10, 20, 3);
    v.box(2, 0, 0, 11, 0, 3, 'stone2');
  },
  parts: { leaf: { pivot: [2, 0, 2], build(v, o) {
    const c = o.c || 'woodRed';
    v.box(2, 1, 1, 11, 19, 2, c); v.box(3, 20, 1, 10, 20, 2, c);
    v.box(4, 3, 2, 9, 3, 2, 'woodDark'); v.box(4, 10, 2, 9, 10, 2, 'woodDark');
    v.box(9, 9, 3, 10, 10, 3, 'gold');
  } } },
  meta: { group: 'fx', variants: { c: ['woodRed', 'roofMint', 'lavender', 'roofBlue'] } } });
const JAR_C = ['woodRed', 'roofMint', 'lavender', 'honey'], BOOK_C = ['rose', 'sky', 'mint', 'lilac', 'butter', 'coral'], DOOR_C = ['woodRed', 'roofMint', 'lavender', 'roofBlue'];

/* =================================================================== F23 Ønskelappen: read the note → tap the right real thing */
F.Task.def('F23', {
  strands: { LES: [1, 9] }, places: null, roles: null, family: 'les-ting', portable: true,
  honours: ['good', 'noteKind'],          // v5 feature flag for stall.js / quests (WP-X / WP-W): params.good + ctx/params.noteKind
  tpl: ['rw_f23_prompt', 'rw_word', 'rw_tap_note', 'core_lyd', 'core_h_lyd', 'wand_npc_thanks', 'rw_f23_brev', 'rw_f23_spor', 'rw_f23_bestill', 'rw_f23_liste', 'rw_f23_funnet'],
  async run(item, S) {
    // v5 WP-R2 (logic #9): the KIND of note – ctx.noteKind / params.noteKind = 'wish' (default) | 'letter' | 'clue' | 'order' | 'list'.
    // Only a wish is handed to the reader (who wears / eats / thanks); a letter, clue, order or list is read and the thing is found.
    const P = item.params || {}, ctx = S.ctx || {};
    // (logic #8) at a stall the order note names the GOOD she sells (when it is a word with a model) – never an unrelated word
    const good = ctx.good || P.good;
    const kind = ['wish', 'letter', 'clue', 'order', 'list'].includes(ctx.noteKind || P.noteKind) ? (ctx.noteKind || P.noteKind) : good ? 'order' : 'wish';
    if (good && typeof good === 'string' && RW.entry(good) && RW.hasModel(good) && good !== item.word) RW.retarget(item, 'LES', good);
    const w = RW.ensureModelWord(item, 'LES');
    const words = RW.choiceSet(item, w, { needModel: true, byS: [2, 6, 8] });     // v4: 6 / 8 real things at s1 / s2
    const note = S.note(w);
    S.reading = true; S.targetSay = { id: 'rw_word', slots: { w }, voice: '' };
    RW.lydering(S, note, w, item.sup == null ? 1 : item.sup);
    const pick = RW.pickObject(S, words, w, { objects: RW.crowd(words.length) });
    S.hint = RW.noteHint(S, note, 'all');   // after an error: lydering on the note (not «Tell bokstavene» – she chooses pictures)
    const promptId = { wish: 'rw_f23_prompt', letter: 'rw_f23_brev', clue: 'rw_f23_spor', order: 'rw_f23_bestill', list: 'rw_f23_liste' }[kind];
    await S.prompt(promptId, {}, { readingTarget: true, targetTpl: 'rw_word', targetSlots: { w }, targetVoice: '' });
    await pick;
    note.letters.forEach((e, i) => S.timeout(() => e.classList.add('hl'), i * 90));
    await RW.sayWord(w);
    const it = RW.items(S)[words.indexOf(w)];
    if (kind === 'wish') await RW.giveToNpc(S, it, w);
    else { if (it && it.holder) { const h = it.holder, y = h.position.y; F.T.tween(450, k => { h.position.y = y + Math.sin(k * Math.PI) * 0.4; }); } await F.SAY('rw_f23_funnet', {}, ''); }
    return S.result({ noteKind: kind, word: w });
  },
});

/* =================================================================== F24 Krukkehylla: a picture of what Kari needs → the jar with that label */
F.Task.def('F24', {
  strands: { LES: [2, 8] }, places: ['kjokken', 'bakeri', 'kitchen'], roles: ['kokk', 'baker'], family: 'les-merkelapp',
  tpl: ['rw_f24_prompt', 'rw_f24_ok', 'rw_f24_ok2', 'rw_word', 'core_h_first', 'core_lyd'],
  async run(item, S) {
    const w = RW.ensureModelWord(item, 'LES');
    const words = RW.choiceSet(item, w, { needModel: false, byS: [2, 5, 6] });    // v4: 5 / 6 jars at s1 / s2
    const wish = RW.wish(S, RW.model(w));
    const card = RW.wishCard(S, RW.model(w));
    S.reading = true;
    const models = words.map((x, i) => ({ model: 'fx_krukke', opts: { c: JAR_C[i % JAR_C.length] } }));
    const labels = words.slice();
    const pick = RW.pickObject(S, words, w, { models, labels, labelKind: 'plaque', hint: null, objects: RW.crowdL(words.length) });
    S.hint = RW.firstSoundHint(S, w, S.labels.slice(-words.length));
    await S.prompt('rw_f24_prompt', {}, {});
    await pick;
    await RW.sayWord(w);
    // the jar lid pops, the thing inside jumps out into the bubble's place
    const it = RW.items(S)[words.indexOf(w)];
    if (it) { F.sfx.pop(); F.FX.burst(new V3(it.pos.x, it.pos.y + 1, it.pos.z), { n: 20, colors: [0xfff3dc, 0xffffff, 0xf3dfae], speed: 1.5, up: 2.5, life: 0.8, size: 0.05 }); }
    RW.popWish(wish); if (card) card.done();
    const pl = S.ctx && S.ctx.place, plId = String((pl && (pl.id || pl.kind)) || pl || '');
    const kitchen = S.voice === 'kokk' || /kj(ø|o)kken|kitchen|bakeri|bakery/.test(plId) || (F.Castle && /kj(ø|o)kken|kitchen/.test(String(F.Castle.cur || '')));
    await RW.sayS(S, kitchen ? 'rw_f24_ok' : 'rw_f24_ok2');
    return S.result();
  },
});

/* =================================================================== F25 Boktittelen: picture → the book whose spine says it → pop-up model */
F.Task.def('F25', {
  strands: { LES: [2, 9] }, places: ['bibliotek', 'library'], roles: ['siv', 'dronning', 'mia'], family: 'les-merkelapp',
  tpl: ['rw_f25_prompt', 'rw_f25_ok', 'rw_word', 'core_h_first', 'core_lyd'],
  async run(item, S) {
    const w = RW.ensureModelWord(item, 'LES');
    const words = RW.choiceSet(item, w, { needModel: false, byS: [2, 5, 6] });    // v4: 5 / 6 books at s1 / s2
    const wish = RW.wish(S, RW.model(w));
    const card = RW.wishCard(S, RW.model(w));
    S.reading = true;
    const models = words.map((x, i) => ({ model: 'fx_bok', opts: { c: BOOK_C[(i + (item.rung || 0)) % BOOK_C.length] } }));
    const pick = RW.pickObject(S, words, w, { models, labels: words.slice(), labelKind: 'plaque', objects: RW.crowdL(words.length) });
    S.hint = RW.firstSoundHint(S, w, S.labels.slice(-words.length));
    await S.prompt('rw_f25_prompt', {}, {});
    await pick;
    await RW.sayWord(w);
    // pop-up book: the thing builds itself out of the pages and does a happy lap
    const it = RW.items(S)[words.indexOf(w)];
    RW.popWish(wish); if (card) card.done();
    if (it) {
      await F.T.tween(300, k => { it.obj.rotation.y = k * Math.PI / 2; });
      const pop = S.model(RW.model(w), { pos: new V3(it.pos.x, it.pos.y + 0.2, it.pos.z), size: 0.9 });
      pop.visible = false;
      try { await F.FX.assemble(RW.model(w), {}, pop, pop.position.clone(), { from: new V3(it.pos.x, it.pos.y + 0.8, it.pos.z), ms: 900, max: 200 }); } catch (e) { pop.visible = true; }
      const c = pop.position.clone();
      await F.T.tween(1400, k => { const a = k * Math.PI * 2; pop.position.set(c.x + Math.sin(a) * 0.9, c.y + Math.abs(Math.sin(a * 3)) * 0.35, c.z + (1 - Math.cos(a)) * 0.5); pop.rotation.y = S.yaw + a + Math.PI / 2; });
    }
    await RW.sayS(S, 'rw_f25_ok');
    return S.result();
  },
});

/* =================================================================== F27 Dørskiltene: picture → the door with the right plaque → it opens */
F.Task.def('F27', {
  strands: { LES: [2, 8] }, places: ['castle', 'hallen', 'ballsal', 'village'], roles: ['konge', 'dronning', 'mia', 'rolf'], family: 'les-merkelapp',
  tpl: ['rw_f27_prompt', 'rw_f27_ok', 'rw_word', 'core_h_first', 'core_lyd'],
  async run(item, S) {
    const w = RW.ensureModelWord(item, 'LES');
    const words = RW.choiceSet(item, w, { needModel: false, byS: [2, 5, 6] });    // v4: 5 / 6 doors at s1 / s2
    const wish = RW.wish(S, RW.model(w));
    const card = RW.wishCard(S, RW.model(w));
    S.reading = true;
    const models = words.map((x, i) => ({ model: 'fx_dor', opts: { c: DOOR_C[i % DOOR_C.length] } }));
    const pick = RW.pickObject(S, words, w, { models, labels: words.slice(), labelKind: 'plaque', objects: Object.assign({ size: 1.25, arc: false }, words.length >= 5 ? { size: 0.88, spread: 1.22 } : {}) });
    S.hint = RW.firstSoundHint(S, w, S.labels.slice(-words.length));
    await S.prompt('rw_f27_prompt', {}, {});
    await pick;
    await RW.sayWord(w);
    const it = RW.items(S)[words.indexOf(w)];
    RW.popWish(wish); if (card) card.done();
    if (it) {
      const leaf = it.obj.userData.parts && it.obj.userData.parts.leaf;
      F.sfx.door();
      if (leaf) await F.T.tween(600, k => { leaf.rotation.y = -k * 1.9; });
      // what was wished for comes out through the open door
      const pos = it.holder.position.clone().addScaledVector(S.toCam, 0.6);
      const thing = S.model(RW.model(w), { pos, size: 0.7 });
      thing.visible = false;
      try { await F.FX.assemble(RW.model(w), {}, thing, pos, { from: new V3(pos.x, pos.y + 0.6, pos.z), ms: 800, max: 180 }); } catch (e) { thing.visible = true; }
      F.FX.pop(thing);
    }
    await RW.sayS(S, 'rw_f27_ok');
    return S.result();
  },
});

/* =================================================================== P1 reading formats */
D('fx_skilt', { size: [16, 24, 4], scale: 1 / 16,
  build(v, o) { v.box(7, 0, 1, 8, 21, 2, 'woodDark'); v.box(1, 15, 0, 13, 20, 3, o.c || 'woodLight'); v.box(14, 16, 0, 14, 19, 3, o.c || 'woodLight'); v.box(15, 17, 0, 15, 18, 3, o.c || 'woodLight');
    v.box(2, 16, 3, 12, 19, 3, 'cream'); }, meta: { group: 'fx', variants: { c: ['woodLight', 'roofMint', 'butter'] } } });
D('fx_klokke', { size: [18, 24, 8], scale: 1 / 16,
  build(v, o) {
    const c = o.c || 'gold';
    // a little wooden bell stand with the bell hanging from the bar
    v.box(1, 0, 3, 2, 21, 4, 'woodDark'); v.box(15, 0, 3, 16, 21, 4, 'woodDark'); v.box(1, 21, 3, 16, 22, 4, 'wood'); v.box(0, 0, 2, 3, 0, 5, 'wood'); v.box(14, 0, 2, 17, 0, 5, 'wood');
    v.box(8, 19, 3, 9, 20, 4, 'woodDark');
    v.ellipsoid(8.5, 16, 3.5, 2.6, 2.4, 2.6, c);                       // dome
    for (let y = 8; y <= 15; y++) { const r = 2.6 + (15 - y) * 0.42; v.cyl(8.5, y, 3.5, Math.min(r, 3.6), 1, c); }   // flared skirt (front–back clipped by depth)
    v.cyl(8.5, 8, 3.5, 2.2, 6, 0);                                     // hollow inside
    v.box(5, 7, 1, 12, 7, 6, c);                                       // lip
    v.sphere(8.5, 6, 3.5, 1.1, 'woodDark');                            // clapper
  }, meta: { group: 'fx', variants: { c: ['gold', 'silver', 'rose', 'sky'] } } });
const SIGN_C = ['woodLight', 'roofMint', 'butter', 'woodLight'], BELL_C = ['gold', 'silver', 'rose', 'sky'];

// F26 Veiskiltet: a picture of where she wants to go → the signpost with that word
/* v3 WP5 «Veiviser» (DESIGN3 §9.3): at a REAL signpost (ctx.signpost + ctx.thing = v_veiskilt) the post's own arm plaques are the
   choices (no fx_skilt boards): the picture card shows the stem model (Kake|by → kake); right → the arm glows, a glitter trail runs
   down that road for ~60 s and the narrator names the destination (rw_f26_vei / _slott / _hjem). Needs ≥ 2 arms with a picture-word
   stem and a target she can decode: the item's own word when it is an arm stem, else the arm stem nearest below her rung (a
   ladder-free review – no rung credit). Placement / challenge / provcheck / stretch items never get swapped → the generic F26.
   Generic F26 (a picture of a thing, 3 boards): prompt rw_f26_ting. */
const NOSWAP = { placement: 1, challenge: 1, provcheck: 1, stretch: 1, contrast: 1 };
RW.signpostReal = function (item, S) {
  const th = S.ctx && S.ctx.signpost && S.ctx.thing;
  const VV = F.OBJ && F.OBJ.veiviser;
  if (!th || !VV || !S.has3D || F.Space.cur !== 'out') return null;
  let arms; try { arms = VV.armPlaques(th).filter(a => a.L && F.UI.labels && F.UI.labels.has(a.L)); } catch (e) { return null; }
  if (!arms || arms.length < 2) return null;
  const stems = arms.filter(a => a.stem && RW.hasModel(a.stem));
  if (stems.length < 2) return null;
  const w0 = String(item.word || item.target || '').toLowerCase();
  let target = stems.find(a => a.stem === w0) || null, swapped = false;
  if (!target) {
    if (NOSWAP[item.kind] || item.golden || item.prov || item.rungReview || item.offLevel) return null;
    const r = item.rung || 1, rOf = a => { const e = RW.entry(a.stem); return e && e.rung && e.rung.LES ? e.rung.LES : 99; };
    const ok = stems.filter(a => rOf(a) <= r).sort((p, q) => rOf(q) - rOf(p));
    if (!ok.length) return null;
    target = ok[0]; swapped = rOf(target) < r;
  }
  return { th, arms, target, swapped };
};
async function runSignpost(item, S, R) {
  const { th, arms, target } = R, w = target.stem;
  if (item.word !== w) RW.retarget(item, 'LES', w);
  if (R.swapped) item.ladderFree = true;            // an easier word than her rung: Leitner + coins only, no ladder credit
  item.signpost = true;
  item.choices = arms.map(a => a.value);
  item.distractors = arms.filter(a => a !== target).map(a => ({ v: a.value, tag: RW.tag(w, a.value) }));
  S.reading = true;
  // the post's own plaques become the task's choices (they stay visible; nothing else near the post does)
  arms.forEach(a => { if (F.UI.taskKeep) F.UI.taskKeep(a.L); a.L.taskHide = false; a.L.show(true); a.L.el.classList.add('vv-choice'); a.L.el.style.pointerEvents = 'auto'; });
  const W2 = { kind: 'signarms', values: item.choices.slice(), locked: false, dead: false,
    feed: v => S.submit(v, W2),
    mark: (v, cls) => { const a = arms.find(x => x.value === v); if (!a) return; const e = a.L.el; e.classList.remove('right', 'wrong', 'glow'); void e.offsetWidth; e.classList.add(cls === 'right' ? 'right' : 'wrong'); if (cls !== 'right') S.timeout(() => e.classList.remove('wrong'), 900); },
    solution: v => arms.forEach(a => a.L.el.classList.toggle('glow', a.value === v)),
    lock: on => { W2.locked = !!on; },
    destroy: () => { W2.dead = true; } };
  const offs = arms.map(a => {
    const down = e => { e.stopPropagation(); e.stopImmediatePropagation(); };
    const click = e => { e.stopPropagation(); e.stopImmediatePropagation(); if (W2.locked || W2.dead || S.ended) return; F.sfx.click(); S.submit(a.value, W2); };
    a.L.el.addEventListener('pointerdown', down, true); a.L.el.addEventListener('click', click, true);
    return () => { a.L.el.removeEventListener('pointerdown', down, true); a.L.el.removeEventListener('click', click, true); };
  });
  const tidy = () => { offs.forEach(f => f()); arms.forEach(a => { a.L.el.style.pointerEvents = ''; a.L.el.classList.remove('vv-choice', 'glow', 'wrong'); }); };
  S.cleanups = S.cleanups || [];
  try {
    const card = RW.wishCard(S, RW.model(w));
    // the camera looks at the real post and its arms
    try { const cam = F.R.cam; cam.focus = new V3(th.x, (th.y || 0) + 1.8, th.z); cam.distGoal = Math.min(cam.distGoal, 12); } catch (e) { /* camera stays */ }
    const done = S.custom(W2, { answer: w });
    S.check = v => v === w;
    S.hint = RW.firstSoundHint(S, w, arms.map(a => a.L));
    S._solFn = async () => { W2.solution(w); await S.say('core_sol_chip', {}, ''); };
    await S.prompt('rw_f26_prompt', {}, {});
    await done;
    S._solFn = null;
    tidy();
    target.L.el.classList.add('right'); F.T.timeout(() => target.L.el.classList.remove('right'), 6000);
    if (card) card.done();
    F.sfx.whoosh && F.sfx.whoosh();
    RW.signTrail(th, target.ang, 60);
    await RW.sayWord(w);
    const d = target.d;
    if (d.castle) await RW.say('rw_f26_vei_hjem', {}, '');
    else if (d.realm && F.SETS.get('REALMS').includes(d.name)) await RW.say('rw_f26_vei_slott', { slott: d.name }, '');
    else if (F.SETS.PLACES.includes(d.name)) await RW.say('rw_f26_vei', { place: d.name }, '');
  } finally { tidy(); }
  return S.result();
}
// a glitter trail from the post down the road (straight, first 45 m), repeated for ~sec seconds while she stays near the post
RW.signTrail = function (th, ang, sec) {
  const sx = Math.sin(ang), sz = Math.cos(ang), t0 = F.T.now, sp = F.Space.cur;
  const run = () => {
    if (F.Space.cur !== sp || F.T.now - t0 > (sec || 60)) return;
    const P = F.Player.pos; if (Math.hypot(P.x - th.x, P.z - th.z) > 70) return;
    if (F.HUD && F.HUD.trail) F.HUD.trail(th.x + sx * 1.6, th.z + sz * 1.6, th.x + sx * 200, th.z + sz * 200);
    F.T.timeout(run, 9000);
  };
  F.T.timeout(run, 400);
  F.emit('signTrail', th, ang);
};
F.Task.def('F26', {
  strands: { LES: [3, 9] }, places: ['crossroad', 'village', 'veikryss'], roles: null, family: 'les-merkelapp',
  tpl: ['rw_f26_prompt', 'rw_f26_ting', 'rw_f26_vei', 'rw_f26_vei_slott', 'rw_f26_vei_hjem', 'rw_word', 'core_h_first', 'core_lyd'],
  async run(item, S) {
    const real = RW.signpostReal(item, S);
    if (real) return runSignpost(item, S, real);
    const w = RW.ensureModelWord(item, 'LES');
    const words = RW.choiceSet(item, w, { needModel: false, byS: [2, 5, 5] });    // v4: 5 signs at s1 / s2 (g 0.2)
    const wish = RW.wish(S, RW.model(w));
    const card = RW.wishCard(S, RW.model(w));
    S.reading = true;
    const models = words.map((x, i) => ({ model: 'fx_skilt', opts: { c: SIGN_C[i % SIGN_C.length] } }));
    const pick = RW.pickObject(S, words, w, { models, labels: words.slice(), labelKind: 'plaque', objects: Object.assign({ size: 1.2 }, words.length >= 5 ? { size: 0.95, spread: 1.04 } : {}) });
    S.hint = RW.firstSoundHint(S, w, S.labels.slice(-words.length));
    await S.prompt('rw_f26_ting', {}, {});
    await pick;
    await RW.sayWord(w);
    RW.popWish(wish); if (card) card.done();
    const it = RW.items(S)[words.indexOf(w)];
    if (it) { F.sfx.whoosh(); await F.T.tween(700, k => { it.obj.rotation.y = k * Math.PI * 2; }); F.FX.burst(new V3(it.pos.x, it.pos.y + 1.2, it.pos.z), { n: 22, colors: F.Wand.skinCols(), speed: 1.6, up: 1.6, life: 0.8, size: 0.05 }); }
    return S.result();
  },
});

// F28 Les og gjør: read a two-word phrase («rød ball», «stor kake») → tap the thing that matches it exactly
const COLW = () => (F.WORDS && F.WORDS.COLOURS) || {};
const PALC = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green', purple: 'purple', pink: 'pink', white: 'white', brown: 'brown' };
function phraseParts(p) { const [a, n] = p.split(' '); return { adj: a, noun: n }; }
// does the noun's model really change colour with o.c? (LEARN's check) – colour phrases must never show two identical-looking things
const colOk = n => { try { return !(F.BANKS && F.BANKS.colourOk) || F.BANKS.colourOk(RW.model(n) || n); } catch (e) { return false; } };
const lookKey = o => { const m = RW.model(o.model) || o.model, c = o.opts && o.opts.c && colOk(m) ? o.opts.c : '-'; return m + '|' + c + '|' + (+(o.scale || 1)).toFixed(2); };
F.Task.def('F28', {
  strands: { LES: [10, 11] }, places: null, roles: null, family: 'les-gjor', portable: true,
  tpl: ['rw_f28_prompt', 'rw_phrase', 'core_lyd', 'core_h_lyd'],
  async run(item, S) {
    const rng = RW.rng(item), sup = U.clamp(item.sup == null ? 1 : item.sup, 0, 2);
    const P = item.params || {};
    // without a 3D stage the answers are same-size thumbnails: size phrases («stor ball») cannot be shown → colour phrases only
    const sizeOk = S.has3D;
    if (Array.isArray(P.objs) && P.objs.length >= 2 && Array.isArray(item.choices) && item.text && P.objs.every(o => RW.hasModel(o.model)) && (sizeOk || P.objs.every(o => !o.scale || o.scale === 1)) && dedupeBanked(item, P)) return runBanked(item, S, P, sup);
    const ok = p => { const { adj, noun } = phraseParts(p); const e = RW.entry(noun); return RW.hasModel(noun) && (((adj === 'stor' || adj === 'liten') && sizeOk) || (e && e.colour && colOk(noun))); };
    let phrases = ((F.WORDS && F.WORDS.PHRASES) || []).filter(ok);
    if (!phrases.length) { const n = RW.ensureModelWord(item, 'LES'); phrases = ['rød ' + n, 'blå ' + n, 'gul ' + n]; }
    const target = (item.params && item.params.phrase && ok(item.params.phrase)) ? item.params.phrase : U.pick(rng, phrases);
    const { adj, noun } = phraseParts(target);
    // distractors: same noun other colour/size (always), + same colour another noun (s1+), + a third (s2)
    const look = (a, n) => { if (a === 'stor') return { model: RW.model(n), opts: {}, scale: 1.25 }; if (a === 'liten') return { model: RW.model(n), opts: {}, scale: 0.6 }; return { model: RW.model(n), opts: { c: PALC[COLW()[a]] || 'red' } }; };
    const isSize = adj === 'stor' || adj === 'liten';
    const otherAdj = isSize ? (adj === 'stor' ? 'liten' : 'stor') : U.pick(rng, Object.keys(COLW()).filter(c => c !== adj));
    const cands = [otherAdj + ' ' + noun];
    const nouns = [...new Set(phrases.map(p => phraseParts(p).noun))].filter(n => n !== noun && (isSize || colOk(n)));
    if (sup >= 1 && nouns.length) cands.push(adj + ' ' + U.pick(rng, nouns));
    if (sup >= 2) { const a3 = isSize ? otherAdj : U.pick(rng, Object.keys(COLW()).filter(c => c !== adj && c !== otherAdj)); cands.push(a3 + ' ' + (nouns.length ? U.pick(rng, nouns) : noun)); }
    // never two identical-looking things (a model that ignores its colour would make «rød kake» = «blå kake»)
    const seen = new Set([lookKey(look(adj, noun))]);
    const all = U.shuffle(rng, [target, ...cands.filter((c, i, a) => { if (c === target || a.indexOf(c) !== i) return false; const k = lookKey(look(phraseParts(c).adj, phraseParts(c).noun)); if (seen.has(k)) return false; seen.add(k); return true; })]);
    item.word = target; item.choices = all; item.distractors = all.filter(x => x !== target).map(v => ({ v, tag: phraseParts(v).noun === noun ? 'ADJ' : 'NOUN' }));
    const looks = all.map(p => look(phraseParts(p).adj, phraseParts(p).noun));
    const note = S.note(target);
    S.reading = true; if ((F.SETS.PHRASES || []).includes(target)) S.targetSay = { id: 'rw_phrase', slots: { p: target }, voice: '' };
    RW.lydering(S, note, target.replace(/ /g, ''), sup);
    // v5d WP-R3 (WP-E2 request «crowding with 6 objects»): two rows of 3 – a smaller base so a «stor» thing (×1.25–1.5) never reaches its neighbour
    const pick = RW.pickObject(S, all, target, { models: looks.map(l => ({ model: l.model, opts: l.opts })), objects: all.length >= 6 ? { size: 0.92 } : undefined });
    S.hint = RW.noteHint(S, note, 'all');
    // size phrases: scale the objects after they are made
    RW.items(S).forEach((it, i) => { if (looks[i].scale) it.obj.scale.multiplyScalar(looks[i].scale); });
    await S.prompt('rw_f28_prompt', {}, { readingTarget: true });
    await pick;
    await RW.say('rw_phrase', { p: target }, '');
    await RW.giveToNpc(S, RW.items(S)[all.indexOf(target)], noun);
    return S.result();
  },
});

// a banked item may still pair look-alikes (colour on a model that ignores o.c): drop such distractors; false = too few left
function dedupeBanked(item, P) {
  const t = item.choices.map(String).indexOf(String(item.target)); if (t < 0) return true;
  const seen = new Set([lookKey(P.objs[t] || {})]), keep = [];
  item.choices.forEach((c, i) => { if (i === t) { keep.push(i); return; } const k = lookKey(P.objs[i] || {}); if (!seen.has(k)) { seen.add(k); keep.push(i); } });
  if (keep.length === item.choices.length) return true;
  if (keep.length < 2) { item.params = Object.assign({}, P, { objs: null }); return false; }
  P.objs = keep.map(i => P.objs[i]); item.choices = keep.map(i => item.choices[i]);
  if (Array.isArray(item.distractors)) item.distractors = item.distractors.filter(d => item.choices.includes(d.v));
  return true;
}
RW.dedupeF28 = dedupeBanked; RW.lookKey = lookKey;
// BANKS L10 phrase («rød ball», objs with colour/scale) or L11 command («Gi Tass en ball.» → give the ball to Tass)
async function runBanked(item, S, P, sup) {
  const text = String(item.text), target = String(item.target), words = item.choices.map(String);
  const isCmd = P.type === 'cmd';
  const note = S.note(text);
  S.reading = true;
  const sayTpl = isCmd ? ((F.SETS.SENTENCES || []).includes(text) ? { id: 'rw_sentence', slots: { s: text } } : null) : ((F.SETS.PHRASES || []).includes(text) ? { id: 'rw_phrase', slots: { p: text } } : null);
  if (sayTpl) S.targetSay = Object.assign({ voice: '' }, sayTpl);
  RW.lydering(S, note, text.replace(/[^a-zæøå]/gi, '').toLowerCase(), sup);
  const pick = RW.pickObject(S, words, target, { models: P.objs.map(o => ({ model: RW.model(o.model) || o.model, opts: o.opts || {} })), objects: words.length >= 6 ? { size: 0.92 } : undefined });   // v5d: crowding
  // hint: a command lights + sounds its key noun on the note; a phrase all of it; a riddle its longest word (never the hidden answer)
  S.hint = RW.noteHint(S, note, isCmd ? target : (text.split(' ').length <= 2 ? 'all' : null));
  RW.items(S).forEach((it, i) => { const sc = P.objs[i] && P.objs[i].scale; if (sc && sc !== 1) it.obj.scale.multiplyScalar(sc); });
  await S.prompt('rw_f28_prompt', {}, { readingTarget: true });
  await pick;
  if (sayTpl) await RW.say(sayTpl.id, sayTpl.slots, '');
  const it = RW.items(S)[words.indexOf(target)];
  // a command goes to whoever it names (Tass, Pus, Mia, the king …) when they are near; otherwise to the asker
  if (isCmd && P.who && F.Act && F.Act.byId) {
    const id = { kongen: 'konge', dronningen: 'dronning' }[String(P.who).toLowerCase()] || String(P.who).toLowerCase();
    const a = F.Act.byId(id);
    if (a && a.space === F.Space.cur && Math.hypot(a.x - it.pos.x, a.z - it.pos.z) < 18) {
      await RW.fly(it.holder, new V3(a.x, (a.th && a.th.obj ? a.th.obj.position.y : it.pos.y) + 0.9, a.z), 900, 1.4);
      it.holder.visible = false;
      if (a.react) { try { await a.react(F.Wand.tagOf(target), RW.model(target) || target); } catch (e) {} }
      return S.result();
    }
  }
  const noun = isCmd ? target : (P.noun || target.split(' ').pop());
  await RW.giveToNpc(S, it, noun);
  return S.result();
}

// F29 Rimklokkene: one bell already rings with its word; tap the bell whose word rhymes with it
// rhyme = the same rime (from the first vowel to the end) after different onsets: katt/hatt, pose/rose – not jakke/dukke
const RIME_V = 'aeiouyæøå';
// v5 WP-R2 (logic #54): rhyme by SOUND – the rime is normalised the way it is spoken: nd → nn (hund / munn, sand / vann), ld → ll
// (kald → kall / fall), rd → r (bord / jord → bor / jor). The onset is compared as written; .spelled keeps the written rime.
const rimeSound = r => String(r).replace(/nd/g, 'nn').replace(/ld/g, 'll').replace(/rd/g, 'r');
// v5d WP-R3 (WP-E2 request): one source for the rule – F.WORDS.rimeOf / rhymes (words.js, identical rule) when loaded; local copy otherwise
function rimeOf(x) { if (F.WORDS && typeof F.WORDS.rimeOf === 'function') return F.WORDS.rimeOf(x);
  x = String(x || ''); const i = [...x].findIndex(c => RIME_V.includes(c)); return i < 0 ? null : { on: x.slice(0, i), rime: rimeSound(x.slice(i)), spelled: x.slice(i) }; }
const RHYME_EXTRA = { 'ubåt|robåt': 1, 'robåt|ubåt': 1 };
function rhymes(a, b) {
  if (F.WORDS && typeof F.WORDS.rhymes === 'function') return F.WORDS.rhymes(a, b);
  if (!a || !b || a === b) return false;
  if (RHYME_EXTRA[a + '|' + b]) return true;
  const A = rimeOf(a), B = rimeOf(b);
  return !!(A && B && A.rime === B.rime && A.on !== B.on);
}
RW.rhymes = rhymes; RW.rimeOf = rimeOf;
F.Task.def('F29', {
  strands: { LES: [2, 5] }, places: ['klokketarn', 'paviljong', 'bandstand'], roles: null, family: 'rim',
  tpl: ['rw_listen', 'rw_f29_ask', 'rw_word', 'core_h_lyd', 'core_lyd'],
  async run(item, S) {
    const rng = RW.rng(item), sup = U.clamp(item.sup == null ? 1 : item.sup, 0, 2);
    const L = RW.list().filter(x => x.w.length >= 3 && x.w.length <= 5);
    let w = item.word, r = null;
    const findPair = x => L.find(y => rhymes(x, y.w));
    if (!w || !findPair(w)) { const c = U.shuffle(rng, L.filter(x => x.castable)).find(x => findPair(x.w)) || U.shuffle(rng, L).find(x => findPair(x.w)); w = c ? c.w : 'katt'; }
    r = (findPair(w) || { w: 'hatt' }).w;
    RW.retarget(item, 'LES', r);
    // v4 (hint_leaks 6, SYNTHESIS §3.3): s0 2 bells; s1 5 bells; s2 6 bells with BOTH rhymes of the ringing word (tap both: g 1/15)
    const n = sup === 0 ? 2 : sup === 1 ? 5 : 6;
    const rw0 = rimeOf(w);
    const r2 = sup >= 2 ? (U.shuffle(rng, L.filter(x => x.w !== r && x.w !== w && rhymes(w, x.w) && rhymes(r, x.w))).map(x => x.w)[0] || null) : null;
    const rightSet = r2 ? [r, r2] : [r];
    // wrong bells must not RHYME (same rime) – but words that merely share the last letters are allowed now (the right bell is no
    // longer «the only one ending in -us»): at s1/s2 at least one look-alike with the same final letter(s) and another vowel
    const nonR = x => !rightSet.includes(x) && x !== w && !rhymes(w, x) && !rhymes(r, x) && !(rw0 && rimeOf(x) && rimeOf(x).rime === rw0.rime);
    const need = n - rightSet.length;
    let others = [];
    if (sup >= 1) {
      const look = U.shuffle(rng, L.map(x => x.w).filter(x => nonR(x) && x.slice(-1) === w.slice(-1)));
      const look2 = look.filter(x => x.slice(-2) === w.slice(-2));
      const pickL = look2[0] || look[0]; if (pickL) others.push(pickL);
      if (sup >= 2) { const pickL2 = look.find(x => x !== pickL); if (pickL2) others.push(pickL2); }
    }
    RW.distractors(r, n + 12, sup, { rng }).filter(nonR).forEach(x => { if (others.length < need && !others.includes(x)) others.push(x); });
    if (others.length < need) U.shuffle(rng, L.map(x => x.w)).forEach(x => { if (others.length < need && nonR(x) && !others.includes(x)) others.push(x); });
    others = others.slice(0, need);
    if (!others.length) others = [['sol', 'bok', 'fisk', 'melk'].find(nonR) || 'sol'];
    const words = U.shuffle(rng, [...rightSet, ...others]);
    item.choices = words; item.distractors = others.map(v => ({ v, tag: 'RHYME' }));
    RW.meta(item, r2 ? 'subset' : 'scene', r2 ? 1 / 15 : 1 / words.length, 'AVKODE');
    // the ringing bell with the given word stands at the back
    const lead = S.model('fx_klokke', { pos: S.anchor.clone().addScaledVector(S.toCam, -1.5), size: 1.0, opts: { c: 'gold' } });
    const ring = () => { F.sfx.bell(F.note(7)); F.T.tween(700, k => { lead.rotation.z = Math.sin(k * Math.PI * 4) * 0.25 * (1 - k); }); };
    // the ringing word sits big on a golden card at the top (tap = the bell rings and says it – it is not the reading target)
    const lnote = RW.wordCard(S, w, () => { ring(); RW.sayWord(w); });
    ring();
    const pick = RW.pickObject(S, words, r, { models: words.map((x, i) => ({ model: 'fx_klokke', opts: { c: BELL_C[(i + 1) % BELL_C.length] } })), labels: words.slice(), labelKind: 'plaque', objects: RW.crowdL(words.length) });
    if (r2) { const ok1 = v => { const x = typeof v === 'number' ? words[v] : v; return x === r || x === r2; }; S.check = ok1; }
    // the rime sounded out by sound unit (h-ytte: /y/ /t/ /e/ – the double t is one sound), its letters light on the card
    S.hint = async () => {
      ring(); await S.say('core_h_lyd', {}, '');
      const ro = rimeOf(w), k0 = ro ? ro.on.length : 1, els = lnote && lnote.letters ? lnote.letters : null;
      if (F.LYD) await RW.sayUnits(w, j => j >= k0 && els ? els[j] : null, () => S.solved || S.ended, k0);
      else for (const ch of ((ro || {}).spelled || w.slice(1))) await RW.sound(ch);
    };
    // v3 WP5: «Hør på ordet:» + the ringing word, then the question (no fragment ending in «på»)
    await RW.say('rw_listen', {}, '');
    await RW.sayWord(w);
    await S.prompt('rw_f29_ask', {}, {});
    // a repeat says the ringing word
    S.lastPrompt = { id: 'rw_word', slots: { w }, voice: '' };
    S.reading = true;
    let found = await pick;
    if (r2) {
      // both rhymes: the first found bell rings; she finds the other one (A needs both first-try)
      const other = found === r2 ? r2 : r;
      const second = found === r2 ? r : r2;
      const iF = words.indexOf(other); const itF = RW.items(S)[iF]; if (itF) { F.sfx.bell(F.note(12)); F.T.tween(700, k => { itF.obj.rotation.z = Math.sin(k * Math.PI * 4) * 0.25 * (1 - k); }); }
      const Lf = S.labels[S.labels.length - words.length + iF]; if (Lf && Lf.el) Lf.el.classList.add('right');
      await RW.sayWord(other);
      const p2 = S.arm({ check: v => { const x = typeof v === 'number' ? words[v] : v; return x === second; } });
      S.expected = second; S.tagOf = v => RW.tag(second, typeof v === 'number' ? words[v] : v);
      S._solFn = async () => { if (S.active && S.active.solution) S.active.solution(words.indexOf(second)); await S.say('core_sol_chip', {}, ''); };
      await RW.say('rw_f29_ask', {}, '');
      await p2; S._solFn = null; found = second;
    }
    const it = RW.items(S)[words.indexOf(found)];
    ring(); if (it) { F.sfx.bell(F.note(12)); F.T.tween(700, k => { it.obj.rotation.z = Math.sin(k * Math.PI * 4) * 0.25 * (1 - k); }); }
    await RW.sayWord(w); await RW.sayWord(found); if (r2) await RW.sayWord(found === r2 ? r : r2);
    return S.result();
  },
});

// F30 Er det sant? – read a short sentence (or a Kongeposten headline) → Ja / Nei
F.Task.def('F30', {
  strands: { LES: [9, 11] }, places: ['spisesal', 'breakfast'], roles: ['konge', 'dronning'], family: 'les-setning', portable: true,
  tpl: ['rw_f30_prompt', 'rw_sentence', 'core_lyd', 'core_h_lyd'],
  async run(item, S) {
    const rng = RW.rng(item);
    const W = F.WORDS || {};
    const facts = (W.FACTS || []).map(f => ({ t: f[0], yes: f[1] === 'ja', w: f[2] }));
    const yn = (W.YN || []).map(x => ({ t: x.t, w: x.w, c: x.c }));
    let q = null;
    const P = item.params || {};
    if (P.type === 'yn' && item.text && Array.isArray(P.objs)) q = { t: String(item.text), yes: P.answerBool != null ? !!P.answerBool : item.target === 'ja', w: P.objs[0] && P.objs[0].model, opts: (P.objs[0] && P.objs[0].opts) || {}, banked: true };
    else if (yn.length && RW.entry && rng() < 0.5) {
      const x = U.pick(rng, yn.filter(y => RW.hasModel(y.w)).concat([]).length ? yn.filter(y => RW.hasModel(y.w)) : yn);
      const cols = Object.keys(W.COLOURS || {}); const truth = rng() < 0.5;
      const shown = truth ? x.c : U.pick(rng, cols.filter(c => c !== x.c));
      q = { t: x.t, yes: truth, w: x.w, opts: { c: PALC[(W.COLOURS || {})[shown]] || 'red' } };
    } else if (facts.length) q = Object.assign({}, U.pick(rng, facts));
    if (!q) q = { t: 'Kaka er god.', yes: true, w: 'kake' };
    if (!q.banked) { item.word = q.t; item.target = q.yes ? 'ja' : 'nei'; item.key = 'LES:' + q.t; }
    const note = S.note(q.t);
    S.reading = true; S.targetSay = { id: 'rw_sentence', slots: { s: q.t }, voice: '' };
    if (q.w && RW.hasModel(q.w)) { const m = S.model(RW.model(q.w), { size: 0.9, opts: q.opts || {} }); F.FX.pop(m); }
    S.hint = RW.noteHint(S, note, null);
    await S.prompt('rw_f30_prompt', {}, { readingTarget: true });
    if ((F.SETS.SENTENCES || []).includes(q.t)) S.targetSay = { id: 'rw_sentence', slots: { s: q.t }, voice: '' }; else S.targetSay = null;
    // v4 retrofit (SYNTHESIS §3.3, 2T): from s1 the Ja/Nei is followed by an EVIDENCE tap – the word in the sentence that shows it
    // (the colour word for «Ballen er rød.», the last word of a fact). A needs both parts first-try: g = 1/2 × 1/words ≈ 1/6–1/8.
    const colourWords = (F.SETS.COLOURS || []).concat(Object.keys((F.WORDS && F.WORDS.COLOURS) || {}));
    const ntxt = String(q.t).split(' ').map(x => x.toLowerCase().replace(/[^a-zæøå]/g, ''));
    // evidence: the bank's word, else the colour word, else the sentence's last word – the word that makes it true or false
    // («Katten sier mjau.» → mjau, «Snøen er varm.» → varm, «Båten er på vannet.» → vannet)
    let ev = P.evidence ? String(P.evidence).toLowerCase() : (q.c && ntxt.includes(q.c) ? q.c : ntxt.find(x => colourWords.includes(x)) || ntxt.filter(Boolean).slice(-1)[0] || null);
    const evi = ev ? ntxt.indexOf(ev) : -1;
    const twoStep = evi >= 0 && (item.sup == null ? 1 : item.sup) >= 1 && ntxt.length >= 3;
    RW.meta(item, twoStep ? 'twostep' : 'chips', twoStep ? 0.5 / ntxt.length : 0.5, 'FORSTÅ');
    await S.yesno({ answer: q.yes });
    if (twoStep && !S.ended) {
      // the Ja/Nei buttons go away (a late tap on them must not count against the evidence step)
      if (S.active && S.active.destroy) { try { S.active.destroy(); S.active.dead = true; } catch (e) {} }
      const els = [...note.el.querySelectorAll('.nword')];
      note.el.style.pointerEvents = 'auto';
      const W2 = { kind: 'notewords', values: els.map((_, i) => i), dead: false, locked: false };
      const offs = els.map((e, i) => { e.style.cursor = 'pointer'; const h = ev2 => { ev2.stopPropagation(); if (W2.locked || W2.dead || S.solved || S.ended) return; F.sfx.click(); S.submit(i, W2); }; e.addEventListener('click', h); return () => e.removeEventListener('click', h); });
      W2.feed = i => S.submit(i, W2);
      W2.mark = (i, cls) => { const e = els[i]; if (!e) return; e.classList.remove('rw-ev-ok', 'rw-ev-bad'); void e.offsetWidth; e.classList.add(cls === 'right' ? 'rw-ev-ok' : 'rw-ev-bad'); e.style.color = cls === 'right' ? '#2f8f46' : '#b04a4a'; if (cls !== 'right') S.timeout(() => { e.style.color = ''; }, 900); };
      W2.solution = i => { const e = els[i]; if (e) { e.style.color = '#c9962b'; e.style.textShadow = '0 0 10px #ffd84d'; } };
      W2.lock = on => { W2.locked = !!on; };
      W2.destroy = () => { W2.dead = true; offs.forEach(f => f()); note.el.style.pointerEvents = ''; };
      S.wrongValue = () => (evi + 1) % els.length;
      const p2 = S.custom(W2, { answer: evi });
      S.tagOf = () => 'EVIDENCE';
      S.hint = RW.noteHint(S, note, 'all');       // re-read the whole sentence by sound (never points at the evidence word)
      // v5 WP-R2 (playtest2): the evidence step is its own phase – Puff replays «Trykk på ordet som viser det.», not the Ja/Nei question
      S.lastPrompt = { id: 'rw_f30_bevis', slots: {}, voice: '' };
      if (typeof S.phase === 'function') S.phase('bevis', { replay: { id: 'rw_f30_bevis', slots: {}, voice: '' } });
      await RW.say('rw_f30_bevis', {}, '');
      await p2;
      W2.destroy();
    }
    note.letters.forEach((e, i) => S.timeout(() => e.classList.add('hl'), i * 40));
    if ((F.SETS.SENTENCES || []).includes(q.t)) await RW.say('rw_sentence', { s: q.t }, '');
    return S.result();
  },
});

// F31 Gåta: read a riddle → tap the real thing it describes
F.Task.def('F31', {
  strands: { LES: [10, 11] }, places: null, roles: ['rolf'], family: 'les-setning', portable: true,
  tpl: ['rw_f31_prompt', 'rw_riddle'],
  async run(item, S) {
    const rng = RW.rng(item);
    const all = ((F.WORDS && F.WORDS.RIDDLES) || []).filter(r => RW.hasModel(r[1]));
    const P = item.params || {};
    const banked = P.type === 'riddle' && item.text && ((F.WORDS && F.WORDS.RIDDLES) || []).find(r => r[0] === item.text && RW.hasModel(r[1]));
    const R = banked ? [banked[0], banked[1]].concat((item.choices || []).filter(x => x !== banked[1])) : all.length ? U.pick(rng, all) : ['Den er gul. Du kan spise den.', RW.ensureModelWord(item, 'LES'), 'eple', 'ost'];
    const ans = R[1];
    // v4 (guess index): 2 things at s0, 5 at s1, 6 at s2 (the riddle's own lures first)
    const sup31 = item.sup == null ? 1 : item.sup, k31 = sup31 >= 2 ? 5 : sup31 === 1 ? 4 : 1;
    // v5 (#14): the riddle's own lures and the extra things never ALSO fit the clues (snø: not melk; måne: not lampe)
    // v5d WP-R3: also F.WORDS.semOk(answer, w, riddleText) + the bank item's params.also (WP-E2) – the extra things too
    const also31 = Array.isArray(P.also) ? P.also : [];
    const ok31 = x => RW.semOk(ans, x, { riddle: R[0], also: also31 }) && (!(F.WORDS && F.WORDS.semOk) || F.WORDS.semOk(ans, x, R[0]));
    let ds = R.slice(2).filter(x => RW.hasModel(x) && x !== ans && ok31(x));
    if (ds.length < k31) ds = ds.concat(RW.distractors(ans, k31 + 4, 0, { needModel: true, rng, riddle: R[0], also: also31 }).filter(x => !ds.includes(x) && x !== ans && ok31(x)));
    const words = U.shuffle(rng, [ans, ...ds.slice(0, k31)]);
    RW.meta(item, 'scene', 1 / words.length, 'FORSTÅ');
    item.word = ans; item.target = ans; item.key = 'LES:' + R[0]; item.choices = words; item.distractors = ds.map(v => ({ v, tag: 'MEANING' }));
    const note = S.note(R[0]);
    S.reading = true; S.targetSay = { id: 'rw_riddle', slots: { r: R[0] }, voice: '' };
    const pick = RW.pickObject(S, words, ans, { objects: RW.crowd(words.length) });
    // hint after an error: the riddle's key clue word (gul, spise, vinger …) sounded out on the note; s0: tap the note to hear it
    const FUNCW = /^(den|det|du|kan|er|har|i|på|en|et|ei|og|som|seg|med|av|til|han|hun|jeg|vi|de|ikke|mange|veldig|bor|der|her)$/;
    const clue = R[0].toLowerCase().replace(/[^a-zæøå ]/g, ' ').split(' ').filter(x => x && !FUNCW.test(x)).sort((a, b) => b.length - a.length)[0] || null;
    S.hint = RW.noteHint(S, note, clue);
    if ((item.sup == null ? 1 : item.sup) <= 0) RW.lydering(S, note, R[0].replace(/[^a-zæøå]/gi, '').toLowerCase(), 0);
    await S.prompt('rw_f31_prompt', {}, { readingTarget: true });
    await pick;
    await RW.say('rw_riddle', { r: R[0] }, '');
    await RW.sayWord(ans);
    await RW.giveToNpc(S, RW.items(S)[words.indexOf(ans)], ans);
    return S.result();
  },
});

// F32 Hva blir det? – a word on a thing changes one letter (mus → hus): which thing will appear?
F.Task.def('F32', {
  strands: { LES: [3, 7] }, places: null, roles: null, family: 'bokstavbytte', portable: true,
  tpl: ['rw_f32_prompt', 'rw_word'],
  async run(item, S) {
    const rng = RW.rng(item);
    const has = x => RW.hasModel(x);
    const pairs = x => (F.WORDS && F.WORDS.pairs ? F.WORDS.pairs(x) : []).filter(has);
    let from = item.word && has(item.word) && pairs(item.word).length ? item.word : null;
    if (!from) { const c = U.shuffle(rng, RW.list().filter(x => x.castable && has(x.w))).find(x => pairs(x.w).length); from = c ? c.w : null; }
    if (!from) { return F.Task.defs.F23.run(item, S); }
    const to = U.pick(rng, pairs(from));
    RW.retarget(item, 'LES', to);
    // v4 hint_leaks 5: never offer the SOURCE word (she just saw it – «tap the one that wasn't there» solved every item). Near-spelling
    // things only: 3 / 5 / 6 objects at s0 / s1 / s2 (g 1/3 → 1/6)
    const sup = item.sup == null ? 1 : item.sup, nW = sup === 0 ? 3 : sup === 1 ? 5 : 6;
    const ds = RW.distractors(to, nW + 2, Math.max(1, sup), { needModel: true, rng }).filter(x => x !== from && x !== to).slice(0, nW - 1);
    const words = U.shuffle(rng, [to, ...ds]);
    item.choices = words; item.distractors = words.filter(x => x !== to).map(v => ({ v, tag: RW.tag(to, v) }));
    RW.meta(item, 'scene', 1 / words.length, 'AVKODE');
    // the old thing with its word
    const old = S.model(RW.model(from), { pos: S.anchor.clone().addScaledVector(S.toCam, -1.6), size: 0.9 });
    const note = S.note(from);
    S.reading = true;
    await F.T.sleep(600);
    // one letter flips: the note now shows the new word
    const i = [...from].findIndex((c, k) => c !== to[k]);
    if (note.letters[i]) { F.sfx.whoosh(); note.letters[i].classList.add('hl'); await F.T.tween(300, k => { note.letters[i].style.transform = `rotateX(${k * 90}deg)`; }); note.letters[i].textContent = F.UI.caseText(to[i]); await F.T.tween(300, k => { note.letters[i].style.transform = `rotateX(${(1 - k) * 90}deg)`; }); }
    const pick = RW.pickObject(S, words, to, { objects: RW.crowd(words.length) });
    await S.prompt('rw_f32_prompt', {}, { readingTarget: true });
    await pick;
    // the old thing really rebuilds as the new one
    if (F.FX.morph) { try { const nu = await F.FX.morph(old, RW.model(from), RW.model(to), {}, { ms: 1200 }); S.objs.push(nu); } catch (e) { console.warn(e); } }
    else {
      F.FX.burst(new V3(old.position.x, old.position.y + 0.4, old.position.z), { n: 40, colors: F.Wand.skinCols(), speed: 1.4, up: 2, life: 0.7, size: 0.06 });
      old.visible = false;
      const nu = S.model(RW.model(to), { pos: old.position.clone(), size: 0.9 }); nu.visible = false;
      try { await F.FX.assemble(RW.model(to), {}, nu, nu.position.clone(), { from: new V3(old.position.x, old.position.y + 0.8, old.position.z), ms: 800, max: 200 }); } catch (e) { nu.visible = true; }
    }
    await RW.sayWord(to);
    return S.result();
  },
});
})();
