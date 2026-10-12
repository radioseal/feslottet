/* Feslottet – writing formats F33–F41 (SKRIV). Owner: FORMATS-W.   Uses the stage kit S + the wand's spell bar (F.Wand.speller).
   P0: F33 Ordmagi-ønsket (the core: spell the wish → it assembles; needs accept ANY word with the tag), F35 Skiltet som blåste
       (fill the missing letters), F36 Stokket skilt (tap the letters in order), F41 Første lyd (which sound does it start with).
   P1: F34 Handlelista, F37 Mias feil, F38 Bokstavbytte, F39 Kategori-staven, F40 Sandskrift/navnelapp (below).
   SKRIV support: s0 = exactly the right tiles (+ ghost letters the first time a word is written), s1 = tiles + 2 confusable
   distractors, s2 = full keyboard with an OPEN-LENGTH bar (v4 / hint_leaks C3: the slot count no longer reveals the length and
   wrong-length spellings can be submitted, cost a try and get tagged). The physical keyboard always works.
   v4 (WP-R, hint_leaks 1/8/9, C1/C2/C4): every dictated word is a SECRET (S.secret – the subtitle shows 🔊 instead of the word,
   audio unchanged) until the solution step; replays are audio-only via S.replay (the carrier + the word); the per-tile sparkle
   (cfg.isRight) runs at s0 only (s1: after a first miss; F36: never above s0); picture-only items (S9/S11) and F37 make a picture
   tap cost the A (S.usedAudio). Items declare g/mode/think (DESIGN4 §2.9).
   v5 (WP-R2, DESIGN5 §7): RW.skrivHint – help never sounds the whole word before the 2nd error (one sound unit per press before an
   attempt, the FIRST WRONG position after the 1st error; F35 only its gaps, F38 the CHANGED position – tag CHANGED, F41 never the first
   sound alone, F39 the category again). F33 in a story (ctx.chain / quest / step / story) is always the story's picture wish (#3) and
   «14 hatter» is right next to «14 hatt» (#58); F37 speaks as Mia only when Mia hosts (#24 – narrator twins otherwise). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = THREE.Vector3;
const RW = F.RW = F.RW || {};

/* =================================================================== helpers */
const VOW = 'aeiouyæøå';
const CONF = { b: 'dp', d: 'bt', p: 'bq', g: 'kj', k: 'gh', t: 'dk', m: 'n', n: 'm', o: 'øå', ø: 'oe', å: 'oa', e: 'æi', æ: 'ea', i: 'ye', y: 'iø', u: 'oy', a: 'åe',
  s: 'fz', f: 'sv', v: 'fw', l: 'ri', r: 'l', h: 'jk', j: 'hi', c: 'ks', z: 's', q: 'g', w: 'v', x: 'ks' };
RW.confusable = (ch, rng, avoid) => {
  const c = (CONF[ch] || '') + (VOW.includes(ch) ? 'aeiou' : 'bdgklmnprst');
  const opts = [...c].filter(x => x !== ch && !(avoid || []).includes(x));
  return opts.length ? (rng() < 0.7 ? opts[0] : U.pick(rng, opts)) : 'a';
};
// tile bank for a set of letters: s0 exact, s1 + 2 confusables, s2 → null (keyboard)
RW.tiles = function (letters, sup, rng, extra) {
  if (sup >= 2 && extra == null) return null;
  const n = extra != null ? extra : (sup >= 1 ? 2 : 0);
  const out = [...letters];
  for (let k = 0; k < n; k++) out.push(RW.confusable(letters[k % letters.length], rng, out));
  let sh = U.shuffle(rng, out);
  if (sh.join('') === letters.join('') && sh.length > 1) sh = sh.slice(1).concat(sh[0]);
  return sh;
};
RW.made = w => !!(F.save.words && F.save.words.made && F.save.words.made[w]);
// v4 C1: the words she must write are masked in subtitles/bubbles while the task runs (WP-K's F.Speech mask reads S.secret).
// Names are added in both spellings (the mask ignores case, but NAMES are capitalised in the clip set).
RW.secret = function (S, words) {
  const add = (Array.isArray(words) ? words : [words]).filter(x => x != null && String(x).length).map(String);
  const cur = Array.isArray(S.secret) ? S.secret : [];
  S.secret = cur.concat(add.filter(x => !cur.includes(x)));
  if (S.item) S.item.secret = S.secret.slice();
  return S.secret;
};
// v4 C2: Puff replays the dictation (carrier + word), audio-only (the word stays masked by the secret)
RW.replay = (S, fn) => { S.replay = async () => { try { await fn(); } catch (e) { console.warn('[f_write replay]', e); } }; };
// v4 DESIGN4 §2.9: answer mode + guess probability on the item (the engine weights credit by g)
RW.meta = (item, mode, g, think) => { if (item) { item.mode = mode; item.g = +(+g).toFixed(4); item._gAuto = false; item._modeAuto = false; item.think = item.think || think || 'STAVE'; } };
RW.castableWith = tag => (F.WORDS && F.WORDS.byTag ? F.WORDS.byTag(tag) : []).filter(x => F.VOX.has(x.model || x.w)).map(x => x.w);
/* v5d WP-R3 (WP-E2 request, logic #7): an open category accepts EVERY word that fits it – the bank item's accept list ∪ F.WORDS.accept(tag)
   (tag + matching category, drinks never «noe å spise») ∪ the castable words with the tag. Lower-case; a right word without a model is
   still right (it only cannot be conjured). RW.acceptFor(tag, item) → [words] */
RW.acceptFor = function (tag, item) {
  const out = new Set();
  const add = a => (a || []).forEach(x => { if (x != null && x !== '') out.add(String(x).toLowerCase()); });
  if (item && Array.isArray(item.accept)) add(item.accept);
  try { if (F.WORDS && typeof F.WORDS.accept === 'function') add(F.WORDS.accept(tag)); } catch (e) { /* older words.js */ }
  add(RW.castableWith(tag));
  return [...out];
};
const NEED_LINE = { spise: 'sulten', drikke: 'torst', varme: 'kald', sove: 'trott', sitte: 'sitte', leke: 'kjed', pynt: 'fin', kjæledyr: 'dyr', lys: 'lys', lukte: 'lukt' };

// the stage protocol needs an armed answer step + an active widget (same as S.tiles does internally)
function armWidget(S, w, o) {
  if (S.custom) return S.custom(w, o);
  if (o && o.answer !== undefined) S.expected = o.answer;
  S.check = o && o.check ? o.check : null;
  S.solved = false; S.stepTries = 0; S.solShown = false;
  const p = new Promise(r => { S._resolve = r; });
  S.active = w; S.widgets.push(w);
  return p;
}
/* RW.write(S, cfg) – the wand's spell bar as a stage widget. Resolves with the solved (typed) word.
   cfg: {word, accept(v)->bool, sup, slots, given:[ch|null per slot], tiles:[...]|null, ghost, picture, onPicture, autoSubmit} */
RW.write = function (S, cfg) {
  const useTray = !!cfg.tiles;
  let w = null;
  // v4 C4: the per-tile sparkle (right letter in the right slot) is s0 scaffolding only; at s1 it may switch on after a first miss
  // (cfg.sparkle !== false); F36 passes sparkle:false (letter order would become trial and error). Never at s2.
  const sup = cfg.sup == null ? 1 : cfg.sup;
  const sparkleOn = () => sup === 0 || (sup === 1 && cfg.sparkle !== false && S.stepTries > 0);
  const h = F.Wand.open({ mode: 'task', container: useTray ? S.tray() : null, slots: cfg.slots || 0, tiles: cfg.tiles || null, given: cfg.given || null,
    ghost: cfg.ghost || null, picture: cfg.picture || null, onPicture: cfg.onPicture || null, autoSubmit: cfg.autoSubmit !== false && !!cfg.tiles && !!cfg.slots, num: !!cfg.num,
    maxLen: cfg.maxLen || Math.max(8, String(cfg.word || '').length + 3),
    // sparkles on each correct tile (tiles = s0 scaffolding; one known word only)
    isRight: cfg.tiles && cfg.slots && !cfg.accept && !cfg.num ? (i, ch) => sparkleOn() && ch === String(cfg.word)[i] : null,
    onSubmit: (v, n) => { if (w) S.submit(cfg.num ? ((n != null ? n + ' ' : '') + v) : v, w); } });
  const sp = h.speller;
  const word = cfg.word;
  // the keyboard bar is taller than the tray: lift the stage once so the 3D things stay visible above it
  if (!useTray && !S._camLift && F.R.cam.focus && S.toCam) { S._camLift = true; F.R.cam.focus.addScaledVector(S.toCam, 2.4); }
  w = {
    kind: 'tiles', el: sp.el, dead: false, values: null, h, sp,
    feed(v) { v = String(v); const m = v.match(/^(\d+)\s*(.*)$/); if (cfg.num && m) { sp.setNum(m[1]); v = m[2]; } sp.fillWord(v); S.submit(cfg.num ? ((sp.num() != null ? sp.num() + ' ' : '') + sp.text()) : sp.text(), w); return true; },
    mark(v, cls) {
      if (cls === 'right') { sp.flash('ok'); sp.glowSlots(sp.slotsInfo().map((_, i) => i)); return; }
      sp.flash('bad');
      // after the hint: wrong letters go back (right ones stay), so she only fixes what was wrong
      const info = sp.slotsInfo();
      const wrong = cfg.slots && !cfg.accept ? info.map((s, i) => (!s.given && s.ch !== word[i]) ? i : -1).filter(i => i >= 0) : info.map((s, i) => s.given ? -1 : i).filter(i => i >= 0);
      sp.markWrong(wrong);
      S.timeout(() => { if (!w.dead && !S.solved) sp.clearAt(wrong); }, 1150);
    },
    solution(exp) { h.solution(String(exp)); },
    lock(on) { if (on) sp.lock(); else sp.unlock(); },
    slotEl: i => sp.slotEls()[i],
    setGhost(i, ch, sol) { sp.ghostAt(i, ch, sol); },
    destroy() { if (w.dead) return; w.dead = true; h.close(); },
  };
  const p = armWidget(S, w, { answer: word, check: cfg.accept || null });
  S.wordView = { kind: 'tiles', w };
  // tests (dbg.answer(false)): a wrong spelling that differs where she can type (never on a given letter)
  S.wrongValue = () => { const v = [...word]; const g = cfg.given || []; const i = v.findIndex((c, k) => !g[k]); const k = i < 0 ? 0 : i;
    v[k] = RW.confusable(v[k], () => 0.1, [v[k]]); if (cfg.tiles && !cfg.tiles.includes(v[k])) { const alt = cfg.tiles.find(t => t !== word[k]); if (alt) v[k] = alt; } return v.join(''); };
  return p;
};
/* v5 WP-R2 SKRIV hint policy (playtest2 «hints», hint_leaks Tables A/B): the whole word is NEVER sounded letter by letter before the
   2nd error (that is the solution).
     before an attempt – WP-K2's S.preHint (one sound unit per press) when present; o.pre(k) = the format's own pre-attempt nudge (also
       installed as WP-K2's S.pre hook); fallback here: the word again (audio) + ONE sound unit per press (the first, then the next …).
     after the 1st error – the stage's tag hints for DOUBLE-CONS / SILENT / VOWEL / LENGTH (structure, no full spelling); otherwise the
       FIRST WRONG position only: its slot lights and its sound unit plays («Hør godt på denne lyden.»).
   o.holes = F35's gaps (only those count), o.changed = the position F38 changes (tag CHANGED), o.from = F38's old word. */
RW.skrivHint = function (S, word, o) {
  o = o || {};
  word = String(word || '').toLowerCase();
  if (!S._rwBase && typeof S.hint === 'function' && !S.hint._rw) S._rwBase = S.hint;
  const base = S._rwBase || null;                                        // the stage's default (wordHint by tag), kept across words
  let preK = 0;
  const units = () => (F.LYD ? F.LYD.units(word) : [...word].map((c, i) => ({ i0: i, n: 1, ch: c })));
  const slotEl = i => { const v = S.wordView; return v && v.kind === 'tiles' && v.w && v.w.slotEl ? v.w.slotEl(i) : null; };
  const unitAt = i => { const us = units(); return us.find(u => i >= u.i0 && i < u.i0 + u.n) || us[Math.min(us.length - 1, Math.max(0, i))] || null; };
  const playAt = async (i, lead) => {
    const u = unitAt(i); if (!u) return;
    if (lead && F.TPL.has(lead)) await S.say(lead, {}, '');
    const lit = [];
    for (let j = 0; j < u.n; j++) { const e = slotEl(u.i0 + j); if (e) { e.classList.add('hl'); lit.push(e); } }
    try { if (F.LYD) await F.LYD.play(u); else await RW.sound(u.ch); await F.T.sleep(450); } finally { lit.forEach(e => e.classList.remove('hl')); }
  };
  const preFn = async (kind, k) => {
    if (o.pre) return o.pre(k == null ? preK++ : k);
    if (typeof S.replay === 'function') await S.replay();
    const us = units(); if (!us.length) return;
    const starts = o.holes && o.holes.length ? o.holes.map(h => unitAt(h)).filter(Boolean).map(u => u.i0).filter((x, i, a) => a.indexOf(x) === i) : us.map(u => u.i0);
    const kk = Math.min(k == null ? preK++ : k, starts.length - 1);
    await playAt(starts[kk], kk === 0 && starts[kk] === 0 ? 'core_h_first' : 'core_h_vowel');
  };
  if (o.pre || o.holes) S.pre = (kind, k) => preFn(kind, k);            // WP-K2's format hook (feature: S.preHint calls S.pre)
  S.hint = async (tag, v) => {
    try {
      if (S.clearHint) S.clearHint();
      if (v == null && !(S.stepTries > 0)) {
        if (!o.pre && !o.holes && typeof S.preHint === 'function' && !S._rwPre) { S._rwPre = true; try { await S.preHint('hint'); } finally { S._rwPre = false; } return; }
        return await preFn('hint');
      }
      if (v == null && Array.isArray(S.chosen) && S.chosen.length) v = S.chosen[S.chosen.length - 1];
      const typed = String(v == null ? '' : v).toLowerCase().replace(/^\d+\s+/, '');
      if (o.changed != null && (tag === 'CHANGED' || (o.from && typed === o.from))) { await playAt(o.changed, o.changed === 0 ? 'core_h_first' : 'core_h_vowel'); return; }
      if (base && ['DOUBLE-CONS', 'SILENT', 'VOWEL', 'LENGTH'].includes(tag)) { await base(tag, v); return; }
      let i = [...word].findIndex((c, k) => typed[k] !== c);
      if (i < 0) i = Math.min(typed.length, word.length - 1);
      if (o.holes && o.holes.length && !o.holes.includes(i)) { const h = o.holes.find(x => typed[x] !== word[x]); i = h != null ? h : o.holes[0]; }
      await playAt(i, i === 0 ? 'core_h_first' : 'core_h_vowel');
    } catch (e) { console.error('[f_write hint]', e); }
  };
  S.hint._rw = true;
};
// show the thing she writes about as a real 3D model on the stage (for writing tasks it may be named aloud)
RW.showModel = function (S, w, o) {
  const m = RW.model(w); if (!m) return null;
  const obj = S.model(m, Object.assign({ size: 0.9 }, o || {}));
  obj.scale.multiplyScalar(0.01); const s1 = obj.scale.x * 100;
  F.T.tween(380, k => obj.scale.setScalar(Math.max(0.0001, s1 * U.smooth(k) * (1 + Math.sin(k * Math.PI) * 0.15))));
  return obj;
};
RW.hop = (obj, h) => obj ? F.T.tween(450, k => { obj.position.y = obj.userData._y0 != null ? obj.userData._y0 + Math.sin(k * Math.PI) * (h || 0.5) : obj.position.y; }) : Promise.resolve();
const y0 = o => { if (o) o.userData._y0 = o.position.y; return o; };
const sup0 = item => U.clamp(item.sup == null ? 1 : item.sup, 0, 2);

/* =================================================================== F33 Ordmagi-ønsket: spell the wish with the wand → it assembles */
F.Task.def('F33', {
  strands: { SKRIV: [2, 9] }, places: null, roles: null, family: 'ordmagi', portable: true,
  tpl: ['rw_f33_wish', 'rw_f33_cast', 'rw_f33_need_help', 'rw_f33_need_more', 'rw_skriv', 'rw_word', 'rw_need_kald', 'core_sol_tiles', 'wand_npc_thanks'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    let w = RW.ensureModelWord(item, 'SKRIV');
    const e = RW.entry(w) || { tags: [] };
    // what kind of wish: a picture (default), a need (any word with the tag is right), or a spoken word
    let kind = (item.params && item.params.kind) || (S.ctx && S.ctx.kind);
    const needTags = (e.tags || []).filter(t => NEED_LINE[t] && RW.castableWith(t).length >= 2);
    // v5 WP-R2 (logic #3): inside a helping chain / quest step (ctx.chain / ctx.quest / ctx.step) the wish is the story's picture –
    // F33 never switches to a need of its own («Jeg kjeder meg!» to a freezing man)
    const inStory = !!(S.ctx && (S.ctx.chain || S.ctx.quest || S.ctx.step || S.ctx.story));
    if (!kind) kind = inStory ? 'picture' : needTags.length && rng() < 0.35 ? 'need' : rng() < 0.15 ? 'dict' : 'picture';
    if (kind === 'need' && !needTags.length) kind = 'picture';
    if (item.params && item.params.n) kind = 'picture';
    const tag = kind === 'need' ? ((item.params && item.params.needTag) || U.pick(rng, needTags)) : null;
    // v5d WP-R3: every word that fits the need is right (RW.acceptFor: bank accept ∪ F.WORDS.accept(tag) ∪ castables)
    const accept = tag ? RW.acceptFor(tag, item) : null;
    const multi = !!(accept && accept.length > 1);
    // the wish shows up in the world: a real model in a bubble over the NPC (picture), or the NPC acts it out (need)
    const wish = kind === 'picture' ? RW.wish(S, RW.model(w)) : null;
    if (kind === 'need' && S.npc) { const g = tag === 'varme' ? 'shiver' : tag === 'sove' ? 'yawn' : tag === 'spise' ? 'eat' : 'nod';
      try { if (S.npc.gesture) S.npc.gesture(g, 2.5); else if (S.npc.obj && S.npc.obj.userData.play) S.npc.obj.userData.play(g, 2.5); } catch (err) {} }
    const ghost = sup === 0 && !RW.made(w) && !multi ? w : null;
    const tiles = RW.tiles([...w], sup, rng);
    // v4 C3: keyboard (s2) = open-length bar; tiles (s0/s1) keep the slot row
    const slots = tiles ? w.length : 0;
    const sayW = () => RW.sayWord(w);
    // S9/S11 picture-only wish at s2 (or params.noAudio): the word is never spoken, a picture tap costs the A (C2)
    const picOnly = kind === 'picture' && ((item.params && item.params.noAudio) || !(sup < 2 || (item.rung || 2) < 9));
    if (kind !== 'need') RW.secret(S, [w]);           // (a Tallmagi number N is the shown stimulus – its plaque stays)
    RW.meta(item, tiles ? 'tiles' : 'keyboard', multi ? 0.02 : 0.01);
    // Tallmagi wish («14 hatter»): the number goes in the number slot, the word in the letter slots
    const N = item.params && item.params.n ? +item.params.n : null;
    // v5 (logic #58): with N ≥ 2 the plural is right too («14 hatter»; «14 hatt» stays accepted – the spelling of the stem is the skill)
    const pl = N && N >= 2 && e && e.pl && e.pl !== w ? String(e.pl).toLowerCase() : null;
    const okWord = v => multi ? accept.includes(v) : (v === w || (pl && v === pl));
    const check = N ? (v => { const m = String(v).toLowerCase().match(/^(\d+)\s+(.*)$/); return !!m && +m[1] === N && okWord(m[2]); }) : (multi ? (v => accept.includes(String(v).toLowerCase())) : null);
    const writing = RW.write(S, { word: N ? N + ' ' + w : w, accept: check, sup, slots, tiles: N ? null : tiles, ghost, num: !!N,
      // a need with letter tiles (s0/s1) can only spell ONE word: show its picture so it is not guess-the-word
      picture: (kind !== 'need' || tiles) ? RW.model(w) : null, onPicture: picOnly ? () => { S.usedAudio = true; sayW(); } : sayW });
    if (!N && kind !== 'need') RW.skrivHint(S, w);                       // v5: first unit / first wrong position only
    // v5: a need has many right words – help repeats the need (never spells or sounds one particular word)
    if (kind === 'need') { const needAgain = async () => { await RW.sayS(S, 'rw_need_' + NEED_LINE[tag]); await RW.say('rw_f33_need_help', {}, ''); if (multi) await RW.say('rw_f33_need_more', {}, ''); };
      S.pre = needAgain; S.hint = async () => { if (S.clearHint) S.clearHint(); await needAgain(); }; }
    if (N) {
      S.wrongValue = () => (N === 13 ? 31 : N + 1) + ' ' + w;
      S.pre = async () => { if (typeof S.replay === 'function') await S.replay(); };     // (WP-K2 hook) the dictation again, nothing more
      // v5: the number part gets «Husk tieren!» + the number again (it is the given stimulus); the word part only its first wrong sound
      S.hint = async (tag, v) => { const m = String(v || '').match(/^(\d+)/);
        if (v == null && !(S.stepTries > 0)) { if (typeof S.replay === 'function') await S.replay(); return; }
        if (!m || +m[1] !== N) { await S.say('core_h_tieren', {}, ''); await S.sayNum(N); }
        else { const typed = String(v).toLowerCase().replace(/^\d+\s+/, ''); let i = [...w].findIndex((c, k) => typed[k] !== c); if (i < 0) i = Math.min(typed.length, w.length - 1);
          const us = F.LYD ? F.LYD.units(w) : [...w].map((c, k) => ({ i0: k, n: 1, ch: c })); const u = us.find(x => i >= x.i0 && i < x.i0 + x.n) || us[0];
          await S.say(i === 0 ? 'core_h_first' : 'core_h_vowel', {}, ''); if (u) { if (F.LYD) await F.LYD.play(u); else await RW.sound(u.ch); } } };
      S._solFn = async () => { const sp = S.active && S.active.sp; if (sp) { sp.clear(); sp.setGhost(pl || w, true); sp.glowKeys([...String(N), w[0]]); } await S.say('core_sol_tiles', {}, ''); };
      if (wish) S.label(new V3(wish.position.x + 0.9, wish.position.y + 0.2, wish.position.z), String(N), { kind: 'num', maxDist: 60 });
    }
    if (kind === 'picture' && N) { RW.replay(S, async () => { await RW.say('rw_skriv', {}, ''); await S.sayNum(N); await sayW(); }); await S.prompt('rw_f33_wish', {}, {}); await RW.say('rw_skriv', {}, ''); await S.sayNum(N); await sayW(); }
    else if (kind === 'picture') {
      if (!picOnly) RW.replay(S, async () => { await RW.say('rw_skriv', {}, ''); await sayW(); }); else RW.replay(S, () => RW.say('rw_f33_cast', {}, ''));
      await S.prompt('rw_f33_wish', {}, {}); if (!picOnly) { await RW.say('rw_skriv', {}, ''); await sayW(); } else await RW.say('rw_f33_cast', {}, '');
    }
    else if (kind === 'need') { await S.prompt('rw_need_' + NEED_LINE[tag], {}, {}); await RW.say('rw_f33_need_help', {}, ''); if (multi && sup >= 2) await RW.say('rw_f33_need_more', {}, ''); }
    else { RW.replay(S, async () => { await RW.say('rw_skriv', {}, ''); await sayW(); }); await S.prompt('rw_skriv', {}, { voice: '' }); await sayW(); }
    S.lastPrompt = picOnly ? { id: 'rw_f33_cast', slots: {}, voice: '' } : { id: 'rw_skriv', slots: {}, voice: '' };
    let typed = String(await writing).toLowerCase();
    const tm = typed.match(/^(\d+)\s+(.*)$/); if (tm) typed = tm[2];
    if (pl && typed === pl) typed = w;                                      // the wand casts the thing by its singular word
    // payoff: the letters fly into the wand and the thing builds itself next to whoever wished for it
    const h = S.active && S.active.h;
    if (h) await h.fly();
    RW.popWish(wish);
    const np = RW.npcPos(S);
    const at = np ? np.clone().addScaledVector(S.toCam, 1.0).addScaledVector(S.right, 0.8) : S.anchor.clone();
    let things = [];
    if (N) {
      // N things land in rows of ten next to the NPC, counted on from ten; wearables also become the NPC's wobbly tower
      try { things = await F.Wand.cast(typed, N, { at: np ? np.clone().addScaledVector(S.toCam, 2.2) : S.anchor.clone().addScaledVector(S.toCam, -1), forNpc: S.npc ? (S.npc.id || true) : null }); } catch (err) { console.error(err); }
      const a = S.npc; if (a && a.wear && F.Wand.tagOf(typed) === 'wear') { try { a.wear(RW.model(typed) || typed, N); } catch (err) {} }
    } else {
      try { things = await F.Wand.cast(typed, 1, { at, forNpc: S.npc ? (S.npc.id || true) : null, silent: false }); } catch (err) { console.error(err); }
      if (S.npc && things[0]) { try { await F.Wand.reactTo(S.npc, typed, things[0]); } catch (err) { console.error(err); } }
    }
    return S.result({ chosen: [typed] });
  },
});

/* =================================================================== F35 Skiltet som blåste: fill in the letters the wind took */
function holesFor(w, item, rng) {
  const sup = sup0(item), L = w.length;
  const n = item.params && item.params.holes ? item.params.holes : sup === 0 ? 1 : sup === 1 ? 2 : Math.min(3, Math.max(2, L - 2));
  if ((item.rung || 2) <= 1) return [0];
  const e = RW.entry(w) || {}, pat = e.patterns || [];
  const pri = [];
  const dbl = F.Task.doublePos ? F.Task.doublePos(w) : -1;
  if (pat.includes('dobbel_konsonant') && dbl >= 0) pri.push(dbl + 1);
  if (F.Task.silentPos) F.Task.silentPos(w).forEach(p => pri.push(p));
  if (/^(skj|kj|sj|hj|hv|gj)/.test(w)) pri.push(1);
  [...w].forEach((c, i) => { if (VOW.includes(c)) pri.push(i); });
  const rest = U.shuffle(rng, [...Array(L).keys()]);
  const out = [];
  for (const p of [...U.shuffle(rng, pri.slice(0, 2)), ...pri.slice(2), ...rest]) { if (out.length >= Math.min(n, L - 1)) break; if (!out.includes(p)) out.push(p); }
  return out.sort((a, b) => a - b);
}
F.Task.def('F35', {
  strands: { SKRIV: [1, 8] }, places: null, roles: null, family: 'skilt', portable: true,
  tpl: ['rw_f35_prompt', 'rw_f35_ask', 'rw_det_star', 'rw_word'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    const w = String(item.full && String(item.full).length > 1 ? item.full : (item.word && String(item.word).length > 1 ? item.word : RW.ensureModelWord(item, 'SKRIV')));
    const holes = holesFor(w, item, rng);
    const given = [...w].map((c, i) => holes.includes(i) ? null : c);
    const missing = holes.map(i => w[i]);
    const tiles = sup >= 2 ? null : RW.tiles(missing, 0, rng, sup === 0 ? 1 : 2);
    const model = y0(RW.showModel(S, w));
    RW.secret(S, [w]); RW.meta(item, tiles ? 'tiles' : 'keyboard', tiles ? Math.pow(1 / tiles.length, holes.length) : 0.01);
    const writing = RW.write(S, { word: w, sup, slots: w.length, given, tiles, picture: RW.model(w), onPicture: () => RW.sayWord(w) });
    if (String(item.target).length === 1 && holes.length === 1) S.tagOf = v => RW.tag(w, v);
    RW.replay(S, async () => { await RW.say('rw_det_star', {}, ''); await RW.sayWord(w); });
    RW.skrivHint(S, w, { holes });                                           // v5: only the gaps – one sound, never the whole word
    await S.prompt('rw_f35_prompt', {}, { voice: '' });
    await RW.say('rw_det_star', {}, ''); await RW.sayWord(w);
    await RW.say('rw_f35_ask', {}, '');
    S.lastPrompt = { id: 'rw_det_star', slots: {}, voice: '' };
    await writing;
    await RW.sayWord(w);
    if (model) { F.FX.burst(new V3(model.position.x, model.position.y + 0.6, model.position.z), { n: 24, colors: F.Wand.skinCols(), speed: 1.6, up: 2, life: 0.8, size: 0.05 }); await RW.hop(model); }
    return S.result();
  },
});

/* =================================================================== F36 Stokket skilt: the letters fell off the sign – tap them in order */
F.Task.def('F36', {
  strands: { SKRIV: [2, 6] }, places: ['marked', 'stall', 'village'], roles: null, family: 'skilt',
  tpl: ['rw_f36_prompt', 'rw_f36_ask', 'rw_det_star', 'rw_word'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    const w = String(item.full && String(item.full).length > 1 ? item.full : (item.word && String(item.word).length > 2 ? item.word : RW.ensureModelWord(item, 'SKRIV')));
    // v4 C3/C4: s0 exactly the letters; s1 + 2 confusable spares; s2 + 3 (the tiles alone never spell the answer); no sparkle above s0
    const tiles = RW.tiles([...w], 0, rng, sup === 0 ? 0 : sup === 1 ? 2 : 3);
    const model = y0(RW.showModel(S, w));
    RW.secret(S, [w]); RW.meta(item, 'tiles', sup === 0 ? 0.05 : 0.01);
    const writing = RW.write(S, { word: w, sup, slots: w.length, tiles, sparkle: false, picture: RW.model(w), onPicture: () => RW.sayWord(w) });
    RW.replay(S, async () => { await RW.say('rw_det_star', {}, ''); await RW.sayWord(w); });
    RW.skrivHint(S, w);                                                      // v5: first unit / first wrong position only
    S.active && S.active.el && S.active.el.classList.add('blocks');
    await S.prompt('rw_f36_prompt', {}, { voice: '' });
    await RW.say('rw_det_star', {}, ''); await RW.sayWord(w);
    await RW.say('rw_f36_ask', {}, '');
    S.lastPrompt = { id: 'rw_det_star', slots: {}, voice: '' };
    await writing;
    // the sign is whole again: a plaque with the word pops up over the thing
    const at = model ? model.position.clone() : S.anchor.clone();
    const L = S.label(new V3(at.x, at.y + 1.35, at.z), w, { kind: 'plaque', maxDist: 60 });
    if (L && L.el) L.el.classList.add('rw-signpop');
    F.sfx.chime(); F.FX.burst(new V3(at.x, at.y + 1.2, at.z), { n: 26, colors: F.Wand.skinCols(), speed: 1.8, up: 2, life: 0.8, size: 0.05 });
    await RW.sayWord(w);
    if (model) await RW.hop(model);
    return S.result();
  },
});

/* =================================================================== F41 Første lyd: «Hvilken lyd hører du først?» → 3 letter tiles */
F.Task.def('F41', {
  strands: { SKRIV: [1, 1] }, places: null, roles: null, family: 'lyd', portable: true,
  tpl: ['rw_listen', 'rw_f41_ask', 'rw_word', 'core_lyd'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    // BANKS S1 item: target = ONE letter, full = the whole word (picture), choices = letters
    let w = item.full && String(item.full).length > 1 ? String(item.full) : null;
    if (!w) { w = RW.ensureModelWord(item, 'SKRIV'); }
    const first = w[0];
    let letters = Array.isArray(item.choices) && item.choices.length >= 2 && item.choices.includes(first) && item.choices.every(c => String(c).length === 1) ? item.choices.slice(0, 4) : null;
    if (!letters) {
      // distractors: s0 far apart (vowel vs consonant), s1 one confusable, s2 two confusables
      const pool = 'abdefghiklmnoprstuvy'.split('').filter(c => c !== first);
      const ds = [];
      if (sup >= 1) ds.push(RW.confusable(first, rng));
      if (sup >= 2) ds.push(RW.confusable(first, rng, ds.concat([first])));
      const far = pool.filter(c => (VOW.includes(c) !== VOW.includes(first)) && !ds.includes(c));
      while (ds.length < 2) { const c = U.pick(rng, ds.length === 0 && sup === 0 ? far : pool.filter(x => !ds.includes(x))); if (!ds.includes(c) && c !== first) ds.push(c); }
      letters = U.shuffle(rng, [first, ...ds.slice(0, 2)]);
      item.choices = letters; item.distractors = ds.slice(0, 2).map(v => ({ v, tag: 'FIRST-LETTER' }));
    }
    // v4 retrofit (SYNTHESIS §3.3): 6 letter tiles at s1+ (two confusables + far letters); s0 keeps 3 far-apart letters
    if (sup >= 1 && letters.length < 6) {
      const out = letters.slice(), pool = U.shuffle(rng, 'abdefghiklmnoprstuvy'.split(''));
      for (let k = 0; k < 2 && out.length < 6; k++) { const c = RW.confusable(first, rng, out); if (!out.includes(c) && c !== first) out.push(c); }
      for (const c of pool) { if (out.length >= 6) break; if (!out.includes(c)) out.push(c); }
      letters = U.shuffle(rng, out);
      item.choices = letters; item.distractors = letters.filter(c => c !== first).map(v => ({ v, tag: 'FIRST-LETTER' }));
    }
    RW.meta(item, 'chips', 1 / letters.length, 'STAVE');
    const model = y0(RW.showModel(S, w, { size: 1.0 }));
    const note = S.note('_' + w.slice(1));
    if (note.letters[0]) note.letters[0].classList.add('rw-hole');
    // C1: the word in the subtitle next to the «_ojo» plaque would give the first letter away
    RW.secret(S, [w]);
    RW.replay(S, async () => { await RW.say('rw_listen', {}, ''); await RW.sayWord(w); });
    // v5 (playtest2): the answer IS the first sound – help never plays that sound alone (a lydering of «h» was the answer)
    S.pre = async () => { await RW.say('rw_listen', {}, ''); await RW.sayWord(w); };
    S.hint = async (tag, v) => { if (S.clearHint) S.clearHint(); await S.say('core_h_first', {}, ''); await F.T.sleep(150); await RW.sayWord(w); if (model) RW.hop(model, 0.3); };
    await S.prompt('rw_listen', {}, { voice: '' });
    await RW.sayWord(w);
    await RW.say('rw_f41_ask', {}, '');
    S.lastPrompt = { id: 'rw_listen', slots: {}, voice: '' };
    await S.chips(letters, { kind: 'word', answer: first });
    if (note.letters[0]) { note.letters[0].textContent = F.UI.caseText(first); note.letters[0].classList.remove('rw-hole'); note.letters[0].classList.add('hl', 'rw-fillpop'); F.sfx.sparkle(); }
    await RW.sound(first);
    await RW.sayWord(w);
    if (model) await RW.hop(model);
    return S.result();
  },
});

/* =================================================================== P1 writing formats */
const castNear = async (S, word) => {
  const np = RW.npcPos(S);
  const at = np ? np.clone().addScaledVector(S.toCam, 1.0).addScaledVector(S.right, 0.8) : S.anchor.clone();
  let th = [];
  try { th = await F.Wand.cast(word, 1, { at, forNpc: S.npc ? (S.npc.id || true) : null }); } catch (e) { console.error(e); }
  if (S.npc && th[0]) { try { await F.Wand.reactTo(S.npc, word, th[0]); } catch (e) { console.error(e); } }
  return th;
};
const SHOP_TAGS = ['spise', 'drikke', 'klær', 'leke', 'pynt'];
const wordAtRung = (item, rng, not) => {
  const r = item.rung || 3;
  for (let d = 0; d < 6; d++) { const c = RW.list().filter(x => x.castable && F.VOX.has(x.model || x.w) && x.w !== not && Math.abs(((x.rung || {}).SKRIV || 0) - r) === d); if (c.length) return U.pick(rng, c).w; }
  return null;
};

// F34 Handlelista: the queen dictates 1–2 words; each is written with the wand and lands in her basket
F.Task.def('F34', {
  strands: { SKRIV: [2, 9] }, places: null, roles: ['dronning'], family: 'diktat',
  tpl: ['rw_f34_prompt', 'rw_f34_say', 'rw_f34_more', 'rw_skriv', 'rw_word'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    const w1 = RW.ensureModelWord(item, 'SKRIV');
    // only food/drink/clothes/toys belong on a shopping list; other words get the neutral «Kan du skrive det jeg sier?»
    const shop = w => { const e = w && RW.entry(w); return !!e && (e.cat === 'mat' || (e.tags || []).some(t => SHOP_TAGS.includes(t))); };
    let w2 = (item.rung || 2) >= 4 && sup >= 1 ? wordAtRung(item, rng, w1) : null;
    for (let k = 0; k < 6 && w2 && shop(w1) && !shop(w2); k++) w2 = wordAtRung(item, rng, w1);
    const list = S.note(w2 ? '' : '');
    list.el.classList.add('rw-list');
    RW.secret(S, [w1, w2]); RW.meta(item, sup >= 2 ? 'keyboard' : 'tiles', 0.01);
    await S.prompt(shop(w1) && (!w2 || shop(w2)) ? 'rw_f34_prompt' : 'rw_f34_say', {}, {});
    for (const [k, w] of [[0, w1], [1, w2]]) {
      if (!w) continue;
      if (k === 1) { await RW.sayS(S, 'rw_f34_more'); }
      const tiles = RW.tiles([...w], sup, rng);
      const writing = RW.write(S, { word: w, sup, slots: tiles ? w.length : 0, tiles, ghost: sup === 0 && !RW.made(w) ? w : null, onPicture: () => RW.sayWord(w) });
      RW.replay(S, async () => { await RW.say('rw_skriv', {}, ''); await RW.sayWord(w); });
      RW.skrivHint(S, w);                                                    // v5: per word – first unit / first wrong position only
      await RW.say('rw_skriv', {}, ''); await RW.sayWord(w);
      S.lastPrompt = { id: 'rw_skriv', slots: {}, voice: '' };
      await writing;
      // the word goes onto the list
      const line = F.UI.el('div', 'rw-li', F.UI.caseText(w)); list.el.appendChild(line);
      const h = S.active && S.active.h; if (h) await h.fly();
      if (S.active && S.active.destroy) S.active.destroy();
      await castNear(S, w);
    }
    return S.result();
  },
});

// F37 Mias feil: Mia wrote a word wrong – fix it (her spelling is already in the bar)
function miaMistake(w, rng) {
  const d = F.Task.doublePos ? F.Task.doublePos(w) : -1;
  if (d >= 0) return w.slice(0, d) + w.slice(d + 1);                                   // katt → kat
  const sil = F.Task.silentPos ? F.Task.silentPos(w) : [];
  if (sil.length) return w.slice(0, sil[0]) + w.slice(sil[0] + 1);                       // hund → hun
  const V = { o: 'å', å: 'o', e: 'æ', æ: 'e', y: 'i', i: 'y', u: 'o', ø: 'o' };
  const vi = [...w].findIndex((c, i) => i > 0 && V[c]); if (vi > 0) return w.slice(0, vi) + V[w[vi]] + w.slice(vi + 1);
  const F2 = { b: 'd', d: 'b', p: 'b', g: 'k', k: 'g', t: 'd' }; if (F2[w[0]]) return F2[w[0]] + w.slice(1);
  return w.length > 3 ? w[0] + w[2] + w[1] + w.slice(3) : w + 'e';
}
F.Task.def('F37', {
  strands: { SKRIV: [5, 11] }, places: ['prinsesse', 'mia'], roles: ['mia'], family: 'retting',
  tpl: ['rw_f37_prompt', 'rw_f37_ask', 'rw_f37_ok', 'rw_word'],
  async run(item, S) {
    const rng = RW.rng(item);
    const w = RW.ensureModelWord(item, 'SKRIV');
    const bad = item.params && item.params.wrong && item.params.wrong !== w ? item.params.wrong : miaMistake(w, rng);
    item.distractors = [{ v: bad, tag: RW.tag(w, bad) }];
    const wish = RW.wish(S, RW.model(w));
    RW.secret(S, [w]); RW.meta(item, 'keyboard', 0.01);
    // C2: the picture tap speaks the right word – it is help, so it costs the A (and the word stays masked in the subtitle)
    const writing = RW.write(S, { word: w, sup: 2, slots: 0, tiles: null, picture: RW.model(w), onPicture: () => { S.usedAudio = true; RW.sayWord(w); } });
    const sp = S.active && S.active.sp; if (sp) sp.prefill(bad);
    S.active && S.active.el && S.active.el.classList.add('mia');
    // v5: after an error the first wrong position only; before an attempt the right word is HEARD (one sound could be the very fix)
    RW.skrivHint(S, w, { pre: async () => { S.usedAudio = true; await RW.say('rw_listen', {}, ''); await RW.sayWord(w); } });
    // v5 (logic #24): Mia's own voice when Mia hosts the task; anyone else → the narrator twin («Mia skrev et ord …»)
    const miaV = S.voice === 'mia' || !S.npc ? 'mia' : '';
    await S.prompt('rw_f37_prompt', {}, { voice: miaV });
    await RW.say('rw_f37_ask', {}, '');
    S.lastPrompt = { id: 'rw_f37_ask', slots: {}, voice: '' };
    await writing;
    RW.popWish(wish);
    await RW.sayWord(w);
    await F.SAY('rw_f37_ok', {}, miaV);
    return S.result();
  },
});

// F38 Bokstavbytte: change ONE letter so katt becomes hatt – the thing really rebuilds
F.Task.def('F38', {
  strands: { SKRIV: [10, 10] }, places: null, roles: null, family: 'bokstavbytte', portable: true,
  tpl: ['rw_f38_prompt', 'rw_f38_ok', 'rw_word'],
  async run(item, S) {
    const rng = RW.rng(item);
    const has = x => RW.hasModel(x);
    const pairs = x => (F.WORDS && F.WORDS.pairs ? F.WORDS.pairs(x) : []).filter(has);
    let from = item.params && item.params.from && has(item.params.from) ? item.params.from : null;
    let to = item.params && item.params.to && has(item.params.to) ? item.params.to : (item.word && String(item.word).length > 1 && has(item.word) ? item.word : null);
    const banked = !!(from && to);
    if (to && !from) { const p = pairs(to); from = p.length ? U.pick(rng, p) : null; }
    if (!from || !to) { const c = U.shuffle(rng, RW.list().filter(x => x.castable && has(x.w))).find(x => pairs(x.w).length); if (c) { from = c.w; to = U.pick(rng, pairs(c.w)); } }
    if (!from || !to) return F.Task.defs.F33.run(item, S);
    if (!banked) RW.retarget(item, 'SKRIV', to);
    // v5 (playtest2): the tag names the position that CHANGES (måne → måke is the 3rd letter, not the first)
    const chg = Math.max(0, [...to].findIndex((c, i) => c !== from[i]));
    item.distractors = [{ v: from, tag: chg === 0 ? 'FIRST-LETTER' : 'CHANGED' }];
    const old = S.model(RW.model(from), { pos: S.anchor.clone(), size: 0.95 });
    const L = S.label(new V3(old.position.x, old.position.y + 1.3, old.position.z), from, { kind: 'word', maxDist: 60 });
    const wish = RW.wish(S, RW.model(to));
    RW.secret(S, [to]); RW.meta(item, 'keyboard', 0.01);
    const writing = RW.write(S, { word: to, sup: 2, slots: to.length, tiles: null, picture: RW.model(to), onPicture: () => RW.sayWord(to) });
    const sp = S.active && S.active.sp; if (sp) sp.prefill(from);
    RW.replay(S, () => RW.sayWord(to));
    S.tagOf = v => String(v || '').toLowerCase() === from ? (chg === 0 ? 'FIRST-LETTER' : 'CHANGED') : RW.tag(to, v);
    RW.skrivHint(S, to, { changed: chg, from, pre: async () => { await RW.say('rw_listen', {}, ''); await RW.sayWord(to); } });
    await S.prompt('rw_f38_prompt', {}, { voice: '' });
    await RW.sayWord(to);
    S.lastPrompt = { id: 'rw_f38_prompt', slots: {}, voice: '' };
    await writing;
    RW.popWish(wish);
    // the cubes rebuild the old thing as the new word
    F.sfx.whoosh();
    if (F.FX.morph) { try { const nu = await F.FX.morph(old, RW.model(from), RW.model(to), {}, { ms: 1300 }); S.objs.push(nu); } catch (e) { console.warn(e); } }
    else {
      F.FX.burst(new V3(old.position.x, old.position.y + 0.5, old.position.z), { n: 50, colors: F.Wand.skinCols(), speed: 1.6, up: 2.2, life: 0.7, size: 0.06 });
      old.visible = false;
      const nu = S.model(RW.model(to), { pos: old.position.clone(), size: 0.95 }); nu.visible = false;
      try { await F.FX.assemble(RW.model(to), {}, nu, nu.position.clone(), { from: new V3(old.position.x, old.position.y + 1, old.position.z), ms: 900, max: 220 }); } catch (e) { nu.visible = true; }
    }
    L.set(to);
    await RW.say('rw_f38_ok', {}, '');
    await RW.sayWord(to);
    return S.result();
  },
});

// F39 Kategori-staven: «Skriv noe å sitte på!» – ANY right word works (no picture, no audio of a word)
F.Task.def('F39', {
  strands: { SKRIV: [11, 11] }, places: null, roles: null, family: 'ordmagi', portable: true,
  tpl: ['rw_f39_cat', 'rw_f39_prompt', 'rw_f33_need_more'],
  async run(item, S) {
    const rng = RW.rng(item);
    const TAGS = (F.WORDS && F.WORDS.TAGS) || {};
    const okTags = Object.keys(TAGS).filter(t => RW.castableWith(t).length >= 3);
    const tag = (item.params && item.params.tag && TAGS[item.params.tag]) ? item.params.tag : (okTags.length ? U.pick(rng, okTags) : null);
    if (!tag) return F.Task.defs.F33.run(item, S);
    // v5d WP-R3: every word that fits the category is right (RW.acceptFor); the item's own word must be one that can be conjured
    const accept = RW.acceptFor(tag, item);
    const canCast = accept.filter(x => RW.hasModel(x));
    if (!accept.includes(String(item.word || '').toLowerCase()) || !RW.hasModel(item.word)) RW.retarget(item, 'SKRIV', U.pick(rng, canCast.length ? canCast : accept));
    RW.meta(item, 'keyboard', 0.02, 'KLASSIFISERE');
    const writing = RW.write(S, { word: item.word, accept: v => accept.includes(String(v).toLowerCase()), sup: 2, slots: 0, tiles: null });
    const cat = TAGS[tag].cat;
    // v5: many words are right – help repeats the category, it never spells (or sounds) one particular word
    const askCat = async () => { if ((F.SETS.CATS || []).includes(cat)) await RW.say('rw_f39_cat', { c: cat }, ''); else await RW.say('rw_f39_prompt', {}, ''); await RW.say('rw_f33_need_more', {}, ''); };
    S.pre = askCat; S.hint = async () => { if (S.clearHint) S.clearHint(); await askCat(); };
    if ((F.SETS.CATS || []).includes(cat)) await S.prompt('rw_f39_cat', { c: cat }, { voice: '' }); else await S.prompt('rw_f39_prompt', {}, { voice: '' });
    await RW.say('rw_f33_need_more', {}, '');
    const typed = String(await writing).toLowerCase();
    const h = S.active && S.active.h; if (h) await h.fly();
    await castNear(S, typed);
    return S.result({ chosen: [typed] });
  },
});

// F40 Sandskrift / navnelapp: write the word (or the new pet's / neighbour's name) she hears
F.Task.def('F40', {
  strands: { SKRIV: [2, 9] }, places: ['strand', 'beach', 'plot'], roles: null, family: 'diktat',
  tpl: ['rw_f40_sand', 'rw_f40_name', 'rw_skriv', 'rw_word', 'rw_name'],
  async run(item, S) {
    const sup = sup0(item), rng = RW.rng(item);
    const names = (F.SETS.NAMES || []).map(n => n.toLowerCase()).filter(n => n.length >= 3 && n.length <= 5);
    const isName = (item.params && item.params.kind === 'name') || (!(item.params && item.params.kind) && rng() < 0.3 && names.length);
    let w, sayIt;
    if (isName) { w = U.pick(rng, names); const N = (F.SETS.NAMES || []).find(n => n.toLowerCase() === w); RW.retarget(item, 'SKRIV', w); sayIt = () => RW.say('rw_name', { n: N }, ''); }
    else { w = String(item.word || RW.ensureModelWord(item, 'SKRIV')); sayIt = () => RW.sayWord(w); }
    const tiles = RW.tiles([...w], sup, rng);
    RW.secret(S, isName ? [w, F.U.cap(w)] : [w]); RW.meta(item, tiles ? 'tiles' : 'keyboard', 0.01);
    const writing = RW.write(S, { word: w, sup, slots: tiles ? w.length : 0, tiles, ghost: sup === 0 && !RW.made(w) ? w : null, onPicture: sayIt });
    RW.replay(S, async () => { await RW.say('rw_skriv', {}, ''); await sayIt(); });
    RW.skrivHint(S, w);                                                      // v5: first unit / first wrong position only
    await S.prompt(isName ? 'rw_f40_name' : 'rw_f40_sand', {}, { voice: '' });
    await RW.say('rw_skriv', {}, ''); await sayIt();
    S.lastPrompt = { id: 'rw_skriv', slots: {}, voice: '' };
    await writing;
    // the word stays written in the sand / on the tag
    const at = S.anchor.clone();
    const L = S.label(new V3(at.x, at.y + 0.2, at.z), isName ? F.U.cap(w) : w, { kind: isName ? 'plaque' : 'word', maxDist: 60 });
    if (L && L.el) L.el.classList.add(isName ? 'rw-signpop' : 'rw-sand');
    F.FX.burst(new V3(at.x, at.y + 0.3, at.z), { n: 24, colors: [0xf3dfae, 0xfff3dc, 0xffffff], speed: 1.2, up: 1.2, life: 0.8, size: 0.05 });
    await sayIt();
    return S.result();
  },
});
})();
