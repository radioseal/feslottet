/* Feslottet – speech templates owned by LEARN (pure data, registered at load time).
   The engine itself never speaks. These are the reading-content clips the formats chain AFTER a first attempt (reading targets
   are never spoken before it – DESIGN §9.6), the spoken category for F39/F33 needs, and the golden «Utfordring» lines.
     learn_phrase   {p: PHRASES}    L10 two-word phrases  («rød ball»)                       – item.text when item.rung === 10
     learn_sentence {s: SENTENCES}  L11 yes/no sentences, facts and commands («Gi Mia en dukke.») – item.text (params.type yn/cmd)
     learn_riddle   {r: RIDDLES}    L11 riddles («Den er gul. Den lyser.»)                   – item.text (params.type riddle)
     learn_cat      {c: CATS}       «Skriv noe å sitte på!» – item.params.cat (SKRIV S11 category / F33 needs)
     learn_utfordring / _ok / _miss  golden items (item.golden: the engine's challenge, a trial's stretch item – v3: stage.js says
                                     learn_utfordring before the prompt and _ok / _miss instead of the praise; v5: at most every 6 min)
     learn_nytt / learn_hopp         v5: the first unscored item of a new strand (item.intro) / a «hopp over» test-out (item.testOut)
                                     natural audit D6: learn_nytt only when neither the format nor the strand was ever served
   Sets come from js/data/words.js (F.SETS.PHRASES / SENTENCES / RIDDLES / CATS). */
(function () {
'use strict';
const F = window.F = window.F || {};
const T = F.TPL;
if (!T) { console.error('lines_learn: F.TPL missing'); return; }
T.add('learn_phrase', { text: '{p}', slots: { p: 'PHRASES' }, voices: [''] });
T.add('learn_sentence', { text: '{s}', slots: { s: 'SENTENCES' }, voices: [''] });
T.add('learn_riddle', { text: '{r}', slots: { r: 'RIDDLES' }, voices: [''] });
T.add('learn_cat', { text: 'Skriv {c}!', slots: { c: 'CATS' }, voices: [''] });
T.addAll({
  learn_utfordring: ['Gullutfordring! Denne er litt vanskelig.', 'Her kommer en gullutfordring!'],
  // v5 (playtest2 A4): «Wow!» was read as an English «O-a-o» – «Jøss!» reads correctly
  learn_utfordring_ok: ['Jøss! Du klarte gullutfordringen!', 'Den var vanskelig, og du klarte den!'],
  learn_utfordring_miss: ['Den var skikkelig vanskelig. Bra forsøkt!', 'Den var vanskelig. Vi prøver igjen en annen gang!'],
  // v5 (WP-E requests): the first unscored item of a new strand, and a «hopp over» test-out item (stage.js says them before the prompt)
  learn_nytt: ['Nå prøver vi noe nytt!', 'Her kommer noe helt nytt. Bare prøv!'],
  // natural audit D6: no «hoppe-over» explanation – a plain heads-up (stage.js: at most every 6 min)
  learn_hopp: 'Her kommer en litt vanskeligere en!',
}, { voices: [''] });
// helper for formats: speak the reading content of an item after the first attempt (or as the B-audio)
F.LEARN_SAY = function (item, voice) {
  if (!item || !F.SAY) return Promise.resolve();
  const t = item.text != null ? item.text : item.word;
  if (t == null) return Promise.resolve();
  const has = (set, v) => { try { return F.SETS.get(set).some(x => String(x) === String(v)); } catch (e) { return false; } };
  if (has('WORDS', t)) return F.SAY('rw_word', { w: t }, '');
  if (has('PHRASES', t)) return F.SAY('learn_phrase', { p: t }, '');
  if (has('SENTENCES', t)) return F.SAY('learn_sentence', { s: t }, '');
  if (has('RIDDLES', t)) return F.SAY('learn_riddle', { r: t }, '');
  if (/^\d+$/.test(String(t)) && +t <= 100) return F.SAY('core_num', { n: +t }, '');
  return Promise.resolve();
};
})();
