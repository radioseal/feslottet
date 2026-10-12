/* Feslottet – speech templates. EVERY spoken line goes through F.SAY (DESIGN §10.1).
   F.TPL.add(id, { text: 'Kan du ta heisen til rom {n}?' | [variants...], slots: {n: 'NUM_10_20'}, voices: ['konge', ''] })
     - at most 2 slots, each a NAMED set from F.SETS (js/data/sets.js) – finite and small
     - voices: the character voices that may say it ('' = narrator/Puff). Each voice × variant × slot combo becomes one mp3.
   F.SAY(id, slots, voice) -> Promise (speaks; validates slot values are in the set; picks a random variant)
   F.SAYF(id, slots, voice) -> like F.sayFree (only if nothing else is speaking)
   F.TPL.text(id, slots, variantIndex?) -> the string (for subtitles / labels). v3 (DESIGN3 §10.5): without an explicit index the
     variant is picked with a memory – never the same variant twice in a row (n > 1), never one of the last two (n ≥ 5), and templates
     of one FAMILY (all praise pools: core_praise*, …) never say the same text back-to-back. F.TPL.family(id, fam) joins a family.
   F.TPL.expandAll() -> [[voice, text], ...]  (used by tools/collect_speech.js)
   v5: F.TPL.twin(id, twinId) / spec.twin – the narrator twin of a first-person character line (see F.SAY); F.TPL.twinOf(id);
     v5 WP-K3: the twin is spoken only when it has a clip (else the original line, when that one has a clip);
     F.TPL.log / F.TPL.logN – the last spoken templates (stage.js action-phase instruction).
   Rules: keep sentences short; one sentence per clip is best (multi-sentence texts are split on . ! ? and each part becomes a clip). */
(function () {
'use strict';
const F = window.F = window.F || {};
const T = {};
const fill = (text, slots) => text.replace(/\{(\w+)\}/g, (m, k) => (slots && slots[k] != null) ? String(slots[k]) : m);
// v3 no-repeat memory: per template the last picked indexes; per family the last spoken texts (any template of the family)
const HIST = {}, FAM = {}, FAMH = {};
const PRAISE = ['core_praise', 'core_praise2', 'core_praise_les', 'core_praise_tall', 'core_praise_skriv', 'core_praise_npc', 'roy_g_riktig', 'roy_g_klok',
  'learn_utfordring_ok', 'bf_next_ok', 'bf_perfect', 'ser_alle'];
PRAISE.forEach(id => { FAM[id] = 'praise'; });
const rnd = () => Math.random();        // presentation only: never consumes the seeded game RNG (F.rand)
function pickVariant(id, s, slots) {
  const n = s.text.length; if (n <= 1) return 0;
  const h = HIST[id] || (HIST[id] = []);
  const fam = FAM[id], fh = fam ? (FAMH[fam] || (FAMH[fam] = [])) : null;
  const avoidN = n >= 5 ? 2 : 1;
  const all = s.text.map((_, i) => i);
  const steps = [
    i => !h.slice(-avoidN).includes(i) && !(fh && fh.slice(-2).includes(fill(s.text[i], slots))),
    i => !h.slice(-avoidN).includes(i) && !(fh && fh.slice(-1).includes(fill(s.text[i], slots))),
    i => !h.slice(-1).includes(i),
  ];
  let c = all;
  for (const f of steps) { const y = all.filter(f); if (y.length) { c = y; break; } }
  const v = c[Math.floor(rnd() * c.length)];
  h.push(v); if (h.length > 3) h.shift();
  if (fh) { fh.push(fill(s.text[v], slots)); if (fh.length > 4) fh.shift(); }
  return v;
}
F.TPL = {
  all: T,
  add(id, spec) {
    if (T[id]) console.warn('TPL duplicate id', id);
    const s = Object.assign({ voices: [''], slots: {} }, spec);
    s.text = Array.isArray(s.text) ? s.text : [s.text];
    const names = Object.keys(s.slots);
    if (names.length > 2) throw new Error('TPL ' + id + ': more than 2 slots');
    T[id] = s;
    return s;
  },
  // many at once: F.TPL.addAll({id: spec, ...}) or {id: 'plain text'} with default voices
  addAll(map, defaults) { for (const id in map) F.TPL.add(id, Object.assign({}, defaults || {}, typeof map[id] === 'string' || Array.isArray(map[id]) ? { text: map[id] } : map[id])); },
  has: id => !!T[id],
  text(id, slots, vi) {
    const s = T[id]; if (!s) { console.error('UNKNOWN TPL', id); return ''; }
    const v = vi != null ? vi : pickVariant(id, s, slots);
    return fill(s.text[v % s.text.length], slots);
  },
  // join a no-repeat family (e.g. another WP's praise pool): F.TPL.family('roy_g_klok', 'praise'); returns the family name
  family(id, fam) { if (fam !== undefined) { if (fam) FAM[id] = fam; else delete FAM[id]; } return FAM[id] || null; },
  _hist: HIST, _famHist: FAMH,
  validate(id, slots, voice) {
    const s = T[id]; if (!s) return 'unknown template ' + id;
    if (!s.voices.includes(voice || '')) return `voice '${voice}' not declared for ${id}`;
    for (const k in s.slots) {
      const set = F.SETS.get(s.slots[k]);
      const val = slots ? slots[k] : undefined;
      if (!set.some(x => String(x) === String(val))) return `slot ${k}=${val} not in set ${s.slots[k]} (${id})`;
    }
    return null;
  },
  expandAll() {
    const out = [];
    for (const id in T) {
      const s = T[id], names = Object.keys(s.slots);
      const sets = names.map(n => F.SETS.get(s.slots[n]));
      const combos = [];
      if (!names.length) combos.push({});
      else if (names.length === 1) sets[0].forEach(a => combos.push({ [names[0]]: a }));
      else sets[0].forEach(a => sets[1].forEach(b => combos.push({ [names[0]]: a, [names[1]]: b })));
      for (const voice of s.voices) for (const t of s.text) for (const c of combos) out.push([voice, fill(t, c)]);
    }
    return out;
  },
};
/* v5 WP-K2 (logic #12, §3-E persona contract): NARRATOR TWINS. A first-person character line («Her er lappen min», «Jeg er så
   sulten!», «Nå teller jeg.») may declare a third-person narrator twin: F.TPL.twin(id, twinId) or spec.twin. When such a line is
   asked for in the narrator's voice ('') or in a voice it does not declare (a host without that voice), F.SAY speaks the twin in the
   narrator's voice instead – Puff never says another character's «jeg», and no character gets someone else's voice. Both ids are
   stamped (F.Speech.recent(original) stays true). The twin must use the same slot names (or none). */
const TWIN = {};
F.TPL.twin = function (id, twinId) { if (twinId) TWIN[id] = twinId; else delete TWIN[id]; return TWIN[id] || null; };
F.TPL.twinOf = function (id) { const s = T[id]; const tw = (s && s.twin) || TWIN[id] || null; return tw && T[tw] ? tw : null; };
// the twin's text to speak, or null when the twin has no clip at all but the original line has one in the asked-for voice (then the
// original is spoken). Without a clip map (Node, collect) or with clips for neither, the twin's text is used (the subtitle wording).
const hasClip = (text, voice) => !!(F.Speech && F.Speech.has && F.Speech.has(text, voice));
function twinText(tw, slots, tv, id0, voice0) {
  const t0 = F.TPL.text(tw, slots);
  if (typeof window === 'undefined' || !window.SPEECH || hasClip(t0, tv)) return t0;
  const s = T[tw];
  for (let i = 0; i < s.text.length; i++) { const t = fill(s.text[i], slots); if (hasClip(t, tv)) return t; }
  const o = id0 && T[id0];
  if (o && o.text.some(t => hasClip(fill(t, slots), voice0 || ''))) return null;
  return t0;
}
F.TPL._twinText = twinText;
/* v5: the log of spoken templates (stage.js reads it: the instruction of an action phase = the last format line spoken in it).
   F.TPL.log = [{n, id, slots, voice, t}] (last 40), F.TPL.logN = running count. */
F.TPL.log = []; F.TPL.logN = 0;
F.SAY = function (id, slots, voice) {
  voice = voice || '';
  const s0 = T[id];
  if (s0) {
    const tw = F.TPL.twinOf(id);
    if (tw && (voice === '' || !s0.voices.includes(voice))) {
      const tv = T[tw].voices.includes('') ? '' : T[tw].voices[0];
      // v5 WP-K3 (WP-R2 request): the twin is spoken only when it has a clip (another variant of the twin with a clip is fine); a twin
      // without any clip while the original line has one (audio not regenerated yet) → the original line as before the twins
      const twText = twinText(tw, slots, tv, id, voice);
      if (twText != null) {
        if (F.Speech && F.Speech.stamp) F.Speech.stamp(id);
        F.TPL.logN++; F.TPL.log.push({ n: F.TPL.logN, id, slots: slots || {}, voice: '', t: F.T && F.T.now }); if (F.TPL.log.length > 40) F.TPL.log.shift();
        const terr = F.TPL.validate(tw, slots, tv); if (terr) console.error('BAD SAY: ' + terr);
        if (F.Speech && F.Speech.stamp) F.Speech.stamp(tw);
        return F.say(twText, tv);
      }
    }
  }
  const err = F.TPL.validate(id, slots, voice);
  if (err) { console.error('BAD SAY: ' + err); if (!F.TPL.has(id)) return Promise.resolve(); }
  if (F.Speech && F.Speech.stamp) F.Speech.stamp(id);
  F.TPL.logN++; F.TPL.log.push({ n: F.TPL.logN, id, slots: slots || {}, voice, t: F.T && F.T.now }); if (F.TPL.log.length > 40) F.TPL.log.shift();
  return F.say(F.TPL.text(id, slots), voice);
};
F.SAYF = function (id, slots, voice) {
  if (F.Speech && F.Speech.busy()) return Promise.resolve(false);
  return F.SAY(id, slots, voice).then(() => true);
};
// collectSpeech picks up all templates
(F.speechEnum = F.speechEnum || []).push(S => { for (const [v, t] of F.TPL.expandAll()) S(v, t); });
})();
