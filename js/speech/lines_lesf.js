/* Feslottet – LES-F story bank + speech templates for WP-L: F78 Fortellerstolen (LF1–LF3) and F79 Bildehylla (LF4; Lo3 lines live
   in lines_reason.js, WP-M). Owner: WP-L. Pure data (runs in Node: tests/v4_wpl.js).
   Rules (SYNTHESIS §6.6, DESIGN5): every story sentence is ONE short clip (no slots), narrator voice '' (Puff tells the stories),
   no numbers spoken (LF2 counts are whole sentences), warm everyday stories with the game's own characters (Mia, Ole, Kong Leo,
   Dronning Ada, Kokk Kari, Gartner Tor, Postbud Per, Bibliotekar Siv, Ridder Rolf, Pus, Tass) and farm/forest animals – nothing scary.
   Entities in the bank are keys of F.LESF.ENT (js/game/tasks/f_lesf.js: key → VOX model + kind who|what|where).

   F.LESF_BANK = {
     LF1: [{ id, s:[sentence, sentence], q:[{ k:'who'|'what'|'where', q:'question', a:key, lure:key, si:index of the answer sentence,
             act?:[moverKey, placeKey] (acted out after the answer), ev?:[evidence words for LF3 read mode] }] }],
     LF2: [{ id, s:'instruction', kind:'count'|'except'|'each'|'only'|'both'|'size', scene:[[key, n, size?]…], target:key (basket /
             receiver), ans:{ keys:[…] } | { key, n } | { idx:[…] } }],          (the generator turns scene+ans into indices)
     LF4: [{ id, s:[3–4 sentences], cards:[key per sentence-event in story order], extra:key (stays out), logical?:true }] }
   Template ids: lf1_<id>_<i> (sentence i), lf1_<id>_q<k> (question k), lf2_<id>, lf4_<id>_<i>; + the stems/cues below.
   Size (2026-10-11): 32 LF1 stories (64 sentences, 88 questions), 27 LF2 instructions, 17 LF4 stories (57 sentences), 31 cue ids
   ≈ 291 clips, narrator only. tests/v4_wpl.js checks: every referenced id exists, ≤ 10 words / 64 chars per story clip, no digits,
   no vowel-less sound words, one sentence per story clip. */
(function () {
'use strict';
const F = (typeof window !== 'undefined' ? window : globalThis).F = (typeof window !== 'undefined' ? window : globalThis).F || {};

/* =====================================================================================================================
   LF1 / LF3 – two-sentence micro-stories (who / what / where). LF3 shows the same text to read (LES ≥ L9) + the evidence word.
   ===================================================================================================================== */
const LF1 = [
  { id: 'kurv', s: ['Pus sov i kurven.', 'Tass lå under bordet.'], q: [
    { k: 'who', q: 'Hvem sov i kurven?', a: 'pus', lure: 'tass', si: 0, act: ['pus', 'kurv'], ev: ['sov', 'kurven'] },
    { k: 'where', q: 'Hvor lå Tass?', a: 'bord', lure: 'kurv', si: 1, act: ['tass', 'bord'], ev: ['bordet'] },
    { k: 'where', q: 'Hvor sov Pus?', a: 'kurv', lure: 'bord', si: 0, act: ['pus', 'kurv'], ev: ['kurven'] }] },
  { id: 'esken', s: ['Mia la ballen i esken.', 'Ole la bamsen på senga.'], q: [
    { k: 'who', q: 'Hvem la ballen i esken?', a: 'mia', lure: 'ole', si: 0, ev: ['ballen'] },
    { k: 'what', q: 'Hva la Ole på senga?', a: 'bamse', lure: 'ball', si: 1, act: ['bamse', 'seng'], ev: ['bamsen'] },
    { k: 'where', q: 'Hvor la Mia ballen?', a: 'eske', lure: 'seng', si: 0, act: ['ball', 'eske'], ev: ['esken'] }] },
  { id: 'boller', s: ['Kokken bakte boller.', 'Kongen spiste en bolle på benken.'], q: [
    { k: 'who', q: 'Hvem bakte boller?', a: 'kokk', lure: 'konge', si: 0, ev: ['bakte'] },
    { k: 'who', q: 'Hvem spiste en bolle?', a: 'konge', lure: 'kokk', si: 1, act: ['konge', 'benk'], ev: ['spiste'] },
    { k: 'where', q: 'Hvor spiste kongen bollen?', a: 'benk', lure: 'bord', si: 1, act: ['konge', 'benk'], ev: ['benken'] }] },
  { id: 'roser', s: ['Gartner Tor vannet rosene.', 'Dronningen plukket en blomst.'], q: [
    { k: 'who', q: 'Hvem vannet rosene?', a: 'tor', lure: 'dronning', si: 0, ev: ['vannet'] },
    { k: 'who', q: 'Hvem plukket en blomst?', a: 'dronning', lure: 'tor', si: 1, ev: ['plukket'] }] },
  { id: 'brevet', s: ['Postbud Per kom med et brev.', 'Bibliotekar Siv fikk brevet.'], q: [
    { k: 'who', q: 'Hvem fikk brevet?', a: 'siv', lure: 'per', si: 1, ev: ['fikk'] },
    { k: 'who', q: 'Hvem kom med brevet?', a: 'per', lure: 'siv', si: 0, ev: ['kom'] }] },
  { id: 'skjold', s: ['Ridder Rolf pusset skjoldet sitt.', 'Tass bar på en pinne.'], q: [
    { k: 'what', q: 'Hva pusset Rolf?', a: 'skjold', lure: 'pinne', si: 0, ev: ['skjoldet'] },
    { k: 'who', q: 'Hvem bar på en pinne?', a: 'tass', lure: 'rolf', si: 1, ev: ['bar'] },
    { k: 'what', q: 'Hva bar Tass på?', a: 'pinne', lure: 'skjold', si: 1, ev: ['pinne'] }] },
  { id: 'gulrot', s: ['Hesten spiste en gulrot.', 'Sauen spiste gress.'], q: [
    { k: 'who', q: 'Hvem spiste en gulrot?', a: 'hest', lure: 'sau', si: 0, ev: ['gulrot'] },
    { k: 'what', q: 'Hva spiste hesten?', a: 'gulrot', lure: 'gress', si: 0, act: ['gulrot', 'hest'], ev: ['gulrot'] },
    { k: 'who', q: 'Hvem spiste gress?', a: 'sau', lure: 'hest', si: 1, ev: ['gress'] }] },
  { id: 'notta', s: ['Ekornet gjemte en nøtt under steinen.', 'Musen gjemte et eple i busken.'], q: [
    { k: 'who', q: 'Hvem gjemte nøtta?', a: 'ekorn', lure: 'mus', si: 0, ev: ['nøtt'] },
    { k: 'where', q: 'Hvor gjemte ekornet nøtta?', a: 'stein', lure: 'busk', si: 0, act: ['nøtt', 'stein'], ev: ['steinen'] },
    { k: 'what', q: 'Hva gjemte musen?', a: 'eple', lure: 'nøtt', si: 1, act: ['eple', 'busk'], ev: ['eple'] }] },
  { id: 'dammen', s: ['Anda svømte i dammen.', 'Frosken satt på steinen.'], q: [
    { k: 'who', q: 'Hvem satt på steinen?', a: 'frosk', lure: 'and', si: 1, act: ['frosk', 'stein'], ev: ['satt'] },
    { k: 'who', q: 'Hvem svømte i dammen?', a: 'and', lure: 'frosk', si: 0, ev: ['svømte'] }] },
  { id: 'hatten', s: ['Mia tok på seg en rød hatt.', 'Ole tok på seg ei blå lue.'], q: [
    { k: 'what', q: 'Hva tok Mia på seg?', a: 'hatt', lure: 'lue', si: 0, ev: ['hatt'] },
    { k: 'who', q: 'Hvem tok på seg lua?', a: 'ole', lure: 'mia', si: 1, ev: ['lue'] },
    { k: 'what', q: 'Hva tok Ole på seg?', a: 'lue', lure: 'hatt', si: 1, ev: ['lue'] }] },
  { id: 'treet', s: ['Ugla satt i treet.', 'Pinnsvinet sov under busken.'], q: [
    { k: 'who', q: 'Hvem satt i treet?', a: 'ugle', lure: 'pinnsvin', si: 0, act: ['ugle', 'tre'], ev: ['treet'] },
    { k: 'where', q: 'Hvor sov pinnsvinet?', a: 'busk', lure: 'tre', si: 1, act: ['pinnsvin', 'busk'], ev: ['busken'] },
    { k: 'where', q: 'Hvor satt ugla?', a: 'tre', lure: 'busk', si: 0, act: ['ugle', 'tre'], ev: ['treet'] }] },
  { id: 'boka', s: ['Dronningen leste en bok.', 'Kongen drakk te av en stor kopp.'], q: [
    { k: 'who', q: 'Hvem leste en bok?', a: 'dronning', lure: 'konge', si: 0, ev: ['leste'] },
    { k: 'what', q: 'Hva drakk kongen av?', a: 'kopp', lure: 'bok', si: 1, ev: ['kopp'] },
    { k: 'what', q: 'Hva leste dronningen?', a: 'bok', lure: 'kopp', si: 0, ev: ['bok'] }] },
  { id: 'hylla', s: ['Siv satte boka i hylla.', 'Pus hoppet opp i sofaen.'], q: [
    { k: 'where', q: 'Hvor satte Siv boka?', a: 'hylle', lure: 'sofa', si: 0, act: ['bok', 'hylle'], ev: ['hylla'] },
    { k: 'who', q: 'Hvem hoppet opp i sofaen?', a: 'pus', lure: 'siv', si: 1, act: ['pus', 'sofa'], ev: ['hoppet'] },
    { k: 'where', q: 'Hvor hoppet Pus?', a: 'sofa', lure: 'hylle', si: 1, act: ['pus', 'sofa'], ev: ['sofaen'] }] },
  { id: 'bronnen', s: ['Kaninen hoppet over steinen.', 'Høna gikk rundt brønnen.'], q: [
    { k: 'who', q: 'Hvem gikk rundt brønnen?', a: 'hone', lure: 'kanin', si: 1, ev: ['gikk'] },
    { k: 'what', q: 'Hva hoppet kaninen over?', a: 'stein', lure: 'bronn', si: 0, act: ['kanin', 'stein'], ev: ['steinen'] },
    { k: 'who', q: 'Hvem hoppet over steinen?', a: 'kanin', lure: 'hone', si: 0, act: ['kanin', 'stein'], ev: ['hoppet'] }] },
  { id: 'fjaera', s: ['Tass løp etter ballen.', 'Pus lekte med en fjær.'], q: [
    { k: 'what', q: 'Hva lekte Pus med?', a: 'fjaer', lure: 'ball', si: 1, ev: ['fjær'] },
    { k: 'who', q: 'Hvem løp etter ballen?', a: 'tass', lure: 'pus', si: 0, ev: ['løp'] },
    { k: 'what', q: 'Hva løp Tass etter?', a: 'ball', lure: 'fjaer', si: 0, act: ['tass', 'ball'], ev: ['ballen'] }] },
  { id: 'kaka', s: ['Kokken satte kaka på bordet.', 'Ole satte vasen i hylla.'], q: [
    { k: 'where', q: 'Hvor satte kokken kaka?', a: 'bord', lure: 'hylle', si: 0, act: ['kake', 'bord'], ev: ['bordet'] },
    { k: 'what', q: 'Hva satte Ole i hylla?', a: 'vase', lure: 'kake', si: 1, act: ['vase', 'hylle'], ev: ['vasen'] },
    { k: 'who', q: 'Hvem satte kaka på bordet?', a: 'kokk', lure: 'ole', si: 0, ev: ['kaka'] }] },
  { id: 'laven', s: ['Grisen sov ved låven.', 'Sauen sto ved brønnen.'], q: [
    { k: 'where', q: 'Hvor sov grisen?', a: 'lave', lure: 'bronn', si: 0, act: ['gris', 'lave'], ev: ['låven'] },
    { k: 'who', q: 'Hvem sto ved brønnen?', a: 'sau', lure: 'gris', si: 1, act: ['sau', 'bronn'], ev: ['sto'] }] },
  { id: 'snomann', s: ['Ole bygde en snømann.', 'Mia kjørte kjelke.'], q: [
    { k: 'what', q: 'Hva kjørte Mia?', a: 'kjelke', lure: 'snomann', si: 1, ev: ['kjelke'] },
    { k: 'who', q: 'Hvem bygde en snømann?', a: 'ole', lure: 'mia', si: 0, ev: ['bygde'] },
    { k: 'what', q: 'Hva bygde Ole?', a: 'snomann', lure: 'kjelke', si: 0, ev: ['snømann'] }] },
  { id: 'baten', s: ['Kongen satt i båten.', 'Dronningen sto på brua.'], q: [
    { k: 'where', q: 'Hvor satt kongen?', a: 'bat', lure: 'bro', si: 0, act: ['konge', 'bat'], ev: ['båten'] },
    { k: 'who', q: 'Hvem sto på brua?', a: 'dronning', lure: 'konge', si: 1, act: ['dronning', 'bro'], ev: ['sto'] },
    { k: 'where', q: 'Hvor sto dronningen?', a: 'bro', lure: 'bat', si: 1, act: ['dronning', 'bro'], ev: ['brua'] }] },
  { id: 'teltet', s: ['Mia lå i teltet.', 'Tass satt ved hytta.'], q: [
    { k: 'where', q: 'Hvor lå Mia?', a: 'telt', lure: 'hytte', si: 0, act: ['mia', 'telt'], ev: ['teltet'] },
    { k: 'who', q: 'Hvem satt ved hytta?', a: 'tass', lure: 'mia', si: 1, act: ['tass', 'hytte'], ev: ['satt'] }] },
  { id: 'blomsten', s: ['Bia satt på blomsten.', 'Sommerfuglen satt på steinen.'], q: [
    { k: 'who', q: 'Hvem satt på blomsten?', a: 'bie', lure: 'sommerfugl', si: 0, act: ['bie', 'blomst'], ev: ['blomsten'] },
    { k: 'where', q: 'Hvor satt sommerfuglen?', a: 'stein', lure: 'blomst', si: 1, act: ['sommerfugl', 'stein'], ev: ['steinen'] }] },
  { id: 'tromma', s: ['Ridder Rolf spilte på tromme.', 'Siv spilte på gitar.'], q: [
    { k: 'what', q: 'Hva spilte Siv på?', a: 'gitar', lure: 'tromme', si: 1, ev: ['gitar'] },
    { k: 'who', q: 'Hvem spilte på tromme?', a: 'rolf', lure: 'siv', si: 0, ev: ['tromme'] },
    { k: 'what', q: 'Hva spilte Rolf på?', a: 'tromme', lure: 'gitar', si: 0, ev: ['tromme'] }] },
  { id: 'gaven', s: ['Dronningen ga Mia en gave.', 'Kongen ga Ole en drage.'], q: [
    { k: 'what', q: 'Hva fikk Ole?', a: 'drage', lure: 'gave', si: 1, act: ['drage', 'ole'], ev: ['drage'] },
    { k: 'who', q: 'Hvem fikk en drage?', a: 'ole', lure: 'mia', si: 1, act: ['drage', 'ole'], ev: ['Ole'] },
    { k: 'who', q: 'Hvem fikk Mia gaven av?', a: 'dronning', lure: 'konge', si: 0, ev: ['Dronningen'] }] },
  { id: 'botta', s: ['Kua drakk vann fra bøtta.', 'Geita sto oppå låven.'], q: [
    { k: 'who', q: 'Hvem drakk vann?', a: 'ku', lure: 'geit', si: 0, act: ['ku', 'botte'], ev: ['drakk'] },
    { k: 'who', q: 'Hvem sto oppå låven?', a: 'geit', lure: 'ku', si: 1, act: ['geit', 'lave'], ev: ['sto'] },
    { k: 'what', q: 'Hva drakk kua vann fra?', a: 'botte', lure: 'lave', si: 0, ev: ['bøtta'] }] },
  { id: 'gjemsel', s: ['Ole gjemte seg i skapet.', 'Mia gjemte seg bak sofaen.'], q: [
    { k: 'where', q: 'Hvor gjemte Ole seg?', a: 'skap', lure: 'sofa', si: 0, act: ['ole', 'skap'], ev: ['skapet'] },
    { k: 'who', q: 'Hvem gjemte seg bak sofaen?', a: 'mia', lure: 'ole', si: 1, act: ['mia', 'sofa'], ev: ['bak'] },
    { k: 'where', q: 'Hvor gjemte Mia seg?', a: 'sofa', lure: 'skap', si: 1, act: ['mia', 'sofa'], ev: ['sofaen'] }] },
  { id: 'eplene', s: ['Gartner Tor la eplene i kurven.', 'Kokken la gulrøttene i bøtta.'], q: [
    { k: 'where', q: 'Hvor la Tor eplene?', a: 'kurv', lure: 'botte', si: 0, act: ['eple', 'kurv'], ev: ['kurven'] },
    { k: 'what', q: 'Hva la kokken i bøtta?', a: 'gulrot', lure: 'eple', si: 1, act: ['gulrot', 'botte'], ev: ['gulrøttene'] },
    { k: 'who', q: 'Hvem la eplene i kurven?', a: 'tor', lure: 'kokk', si: 0, ev: ['eplene'] }] },
  { id: 'votten', s: ['Mia mistet votten sin i snøen.', 'Tass fant votten under benken.'], q: [
    { k: 'who', q: 'Hvem fant votten?', a: 'tass', lure: 'mia', si: 1, ev: ['fant'] },
    { k: 'where', q: 'Hvor fant Tass votten?', a: 'benk', lure: 'sno', si: 1, act: ['vott', 'benk'], ev: ['benken'] }] },
  { id: 'egget', s: ['Høna la et egg i høyet.', 'Anda la et egg i sivet.'], q: [
    { k: 'who', q: 'Hvem la et egg i høyet?', a: 'hone', lure: 'and', si: 0, ev: ['høyet'] },
    { k: 'where', q: 'Hvor la høna egget?', a: 'hoy', lure: 'sivet', si: 0, act: ['egg', 'hoy'], ev: ['høyet'] },
    { k: 'where', q: 'Hvor la anda egget?', a: 'sivet', lure: 'hoy', si: 1, act: ['egg', 'sivet'], ev: ['sivet'] }] },
  // animal stories for the encounters (WP-A: F.LESF.about(species) → prefer keys)
  { id: 'bladet', s: ['Sneglen krøp under bladet.', 'Marihøna satt på blomsten.'], q: [
    { k: 'who', q: 'Hvem krøp under bladet?', a: 'snegl', lure: 'marihone', si: 0, act: ['snegl', 'blad'], ev: ['krøp', 'bladet'] },
    { k: 'where', q: 'Hvor krøp sneglen?', a: 'blad', lure: 'blomst', si: 0, act: ['snegl', 'blad'], ev: ['bladet'] },
    { k: 'who', q: 'Hvem satt på blomsten?', a: 'marihone', lure: 'snegl', si: 1, ev: ['blomsten'] }] },
  { id: 'reven', s: ['Reven satt ved treet.', 'Haren gjemte seg i busken.'], q: [
    { k: 'who', q: 'Hvem satt ved treet?', a: 'rev', lure: 'hare', si: 0, act: ['rev', 'tre'], ev: ['satt', 'treet'] },
    { k: 'where', q: 'Hvor gjemte haren seg?', a: 'busk', lure: 'tre', si: 1, act: ['hare', 'busk'], ev: ['busken'] },
    { k: 'who', q: 'Hvem gjemte seg i busken?', a: 'hare', lure: 'rev', si: 1, act: ['hare', 'busk'], ev: ['gjemte'] }] },
  { id: 'radyret', s: ['Rådyret sto ved brua.', 'Ekornet satt på benken.'], q: [
    { k: 'who', q: 'Hvem sto ved brua?', a: 'radyr', lure: 'ekorn', si: 0, act: ['radyr', 'bro'], ev: ['sto', 'brua'] },
    { k: 'where', q: 'Hvor satt ekornet?', a: 'benk', lure: 'bro', si: 1, act: ['ekorn', 'benk'], ev: ['benken'] }] },
  { id: 'lammet', s: ['Lammet sov i høyet.', 'Kalven sto ved låven.'], q: [
    { k: 'who', q: 'Hvem sov i høyet?', a: 'lam', lure: 'kalv', si: 0, act: ['lam', 'hoy'], ev: ['sov', 'høyet'] },
    { k: 'where', q: 'Hvor sto kalven?', a: 'lave', lure: 'hoy', si: 1, act: ['kalv', 'lave'], ev: ['låven'] },
    { k: 'who', q: 'Hvem sto ved låven?', a: 'kalv', lure: 'lam', si: 1, ev: ['sto'] }] },
];

/* =====================================================================================================================
   LF2 – instructions with negation / quantifiers, carried out in the scene (tap all that fit + Ferdig; the things move)
   scene: [[entKey, count, size?]…]; target: the basket / receiver shown at the back (not tappable)
   ===================================================================================================================== */
const LF2 = [
  // exact count into the basket (any N of the right kind; the other kind stays)
  { id: 'to_epler', s: 'Legg to epler i kurven.', kind: 'count', scene: [['eple', 5], ['paere', 3]], target: 'kurv', ans: { key: 'eple', n: 2 } },
  { id: 'tre_epler', s: 'Legg tre epler i kurven.', kind: 'count', scene: [['eple', 5], ['paere', 3]], target: 'kurv', ans: { key: 'eple', n: 3 } },
  { id: 'fire_epler', s: 'Legg fire epler i kurven.', kind: 'count', scene: [['eple', 6], ['paere', 3]], target: 'kurv', ans: { key: 'eple', n: 4 } },
  { id: 'to_gulrotter', s: 'Legg to gulrøtter i bøtta.', kind: 'count', scene: [['gulrot', 5], ['potet', 3]], target: 'botte', ans: { key: 'gulrot', n: 2 } },
  { id: 'tre_gulrotter', s: 'Legg tre gulrøtter i bøtta.', kind: 'count', scene: [['gulrot', 5], ['potet', 3]], target: 'botte', ans: { key: 'gulrot', n: 3 } },
  { id: 'to_egg', s: 'Legg to egg i kurven.', kind: 'count', scene: [['egg', 5], ['bolle', 3]], target: 'kurv', ans: { key: 'egg', n: 2 } },
  { id: 'tre_egg', s: 'Legg tre egg i kurven.', kind: 'count', scene: [['egg', 6], ['bolle', 3]], target: 'kurv', ans: { key: 'egg', n: 3 } },
  { id: 'tre_boller', s: 'Legg tre boller på fatet.', kind: 'count', scene: [['bolle', 5], ['kjeks', 3]], target: 'fat', ans: { key: 'bolle', n: 3 } },
  { id: 'fire_boller', s: 'Legg fire boller på fatet.', kind: 'count', scene: [['bolle', 6], ['kjeks', 3]], target: 'fat', ans: { key: 'bolle', n: 4 } },
  { id: 'to_ikke_tre', s: 'Legg to epler i kurven, ikke tre.', kind: 'count', scene: [['eple', 5], ['paere', 3]], target: 'kurv', ans: { key: 'eple', n: 2 } },
  { id: 'tre_ikke_fire', s: 'Legg tre egg i kurven, ikke fire.', kind: 'count', scene: [['egg', 6], ['bolle', 2]], target: 'kurv', ans: { key: 'egg', n: 3 } },
  // all, but not … (negation)
  { id: 'honer_ikke_hanen', s: 'Gi korn til alle hønene, men ikke til hanen.', kind: 'except', scene: [['hone', 4], ['hane', 1], ['and', 2]], target: 'korn', ans: { keys: ['hone'] } },
  { id: 'dyr_ikke_grisen', s: 'Gi høy til alle dyrene, men ikke til grisen.', kind: 'except', scene: [['ku', 2], ['sau', 3], ['hest', 1], ['gris', 1]], target: 'hoy', ans: { keys: ['ku', 'sau', 'hest'] } },
  { id: 'fugler_ikke_ugla', s: 'Trykk på alle fuglene, men ikke på ugla.', kind: 'except', scene: [['and', 2], ['hone', 2], ['ugle', 1], ['kanin', 2], ['mus', 1]], target: null, ans: { keys: ['and', 'hone'] } },
  { id: 'kaniner_ikke_minste', s: 'Gi alle kaninene en gulrot, men ikke den minste.', kind: 'except', scene: [['kanin', 4, 'sizes'], ['ekorn', 2], ['mus', 2]], target: 'gulrot', ans: { keys: ['kanin'], notSmallest: true } },
  { id: 'sauer_ikke_storste', s: 'Trykk på alle sauene, men ikke på den største.', kind: 'except', scene: [['sau', 4, 'sizes'], ['geit', 2], ['gris', 2]], target: null, ans: { keys: ['sau'], notLargest: true } },
  { id: 'ender_ikke_svanen', s: 'Gi brød til alle endene, men ikke til svanen.', kind: 'except', scene: [['and', 4], ['svane', 1], ['frosk', 2]], target: 'brod', ans: { keys: ['and'] } },
  // each / only / both
  { id: 'hver_gris', s: 'Gi hver gris et eple.', kind: 'each', scene: [['gris', 3], ['sau', 3], ['ku', 2]], target: 'eple', ans: { keys: ['gris'] } },
  { id: 'hver_hest', s: 'Gi hver hest en gulrot.', kind: 'each', scene: [['hest', 3], ['ku', 2], ['geit', 3]], target: 'gulrot', ans: { keys: ['hest'] } },
  { id: 'hver_katt', s: 'Gi hver katt en fisk.', kind: 'each', scene: [['katt', 3], ['hund', 2], ['kanin', 3]], target: 'fisk', ans: { keys: ['katt'] } },
  { id: 'bare_hundene', s: 'Gi bare hundene et bein.', kind: 'only', scene: [['hund', 3], ['katt', 3], ['gris', 2]], target: 'bein', ans: { keys: ['hund'] } },
  { id: 'bare_ekornene', s: 'Gi bare ekornene nøtter.', kind: 'only', scene: [['ekorn', 3], ['mus', 3], ['kanin', 2]], target: 'nott', ans: { keys: ['ekorn'] } },
  { id: 'bade_hest_ku', s: 'Gi høy både til hesten og til kua.', kind: 'both', scene: [['hest', 1], ['ku', 1], ['sau', 2], ['geit', 2], ['gris', 2]], target: 'hoy', ans: { keys: ['hest', 'ku'] } },
  { id: 'bade_katt_hund', s: 'Trykk både på katten og på hunden.', kind: 'both', scene: [['katt', 1], ['hund', 1], ['kanin', 2], ['mus', 2], ['ekorn', 2]], target: null, ans: { keys: ['katt', 'hund'] } },
  // size words
  { id: 'storste_gris', s: 'Gi et eple til den største grisen.', kind: 'size', scene: [['gris', 4, 'sizes'], ['sau', 2], ['ku', 2]], target: 'eple', ans: { keys: ['gris'], onlyLargest: true } },
  { id: 'minste_and', s: 'Gi brød til den minste anda.', kind: 'size', scene: [['and', 4, 'sizes'], ['hone', 2], ['frosk', 2]], target: 'brod', ans: { keys: ['and'], onlySmallest: true } },
  { id: 'to_minste_kaniner', s: 'Gi en gulrot til de to minste kaninene.', kind: 'size', scene: [['kanin', 4, 'sizes'], ['ekorn', 2], ['mus', 2]], target: 'gulrot', ans: { keys: ['kanin'], smallestN: 2 } },
];

/* =====================================================================================================================
   LF4 – order 3–4 story cards (one card was not in the story and stays out). logical: the order also follows from the world
   (seed → flower); the others can only be ordered by listening (what came first in THIS story).
   ===================================================================================================================== */
const LF4 = [
  { id: 'blomst', logical: true, s: ['Gartner Tor la et frø i jorda.', 'Han vannet det hver dag.', 'Snart kom det en blomst.', 'Han ga blomsten til dronningen.'], cards: ['fro', 'vannkanne', 'blomst', 'bukett'], extra: 'eple' },
  { id: 'kylling', logical: true, s: ['Det lå et egg i reiret.', 'Ut av egget kom en kylling.', 'Kyllingen vokste og ble en stor høne.'], cards: ['egg', 'kylling', 'hone'], extra: 'and' },
  { id: 'boller', logical: true, s: ['Kokken hentet mel.', 'Hun stekte boller i ovnen.', 'Kongen spiste en bolle.'], cards: ['melsekk', 'ovn', 'bolle'], extra: 'is' },
  { id: 'tass', s: ['Først spiste Tass maten sin.', 'Så lekte han med ballen.', 'Til slutt sov han i kurven.'], cards: ['skal', 'ball', 'kurv'], extra: 'bok' },
  { id: 'pus', s: ['Først drakk Pus melk.', 'Så lekte hun med garnnøstet.', 'Til slutt sov hun på puta.'], cards: ['melk', 'garn', 'pute'], extra: 'fisk' },
  { id: 'morgen', s: ['Mia våknet i senga.', 'Hun spiste grøt.', 'Så tok hun på seg jakka.', 'Til slutt lekte hun med ballen.'], cards: ['seng', 'grot', 'jakke', 'ball'], extra: 'is' },
  { id: 'snomann', logical: true, s: ['Ole rullet en stor snøball.', 'Så laget han en snømann.', 'Han ga snømannen en gulrot som nese.', 'Til slutt fikk snømannen ei lue.'], cards: ['snoball', 'snomann', 'gulrot', 'lue'], extra: 'vott' },
  { id: 'posten', s: ['Postbud Per fikk et brev.', 'Han syklet til slottet.', 'Kongen leste brevet.'], cards: ['brev', 'sykkel', 'konge'], extra: 'bat' },
  { id: 'rolf', s: ['Ridder Rolf pusset skjoldet.', 'Så red han en tur på hesten.', 'Til slutt spiste han suppe.'], cards: ['skjold', 'hest', 'suppe'], extra: 'kake' },
  { id: 'piknik', s: ['Dronningen pakket en kurv.', 'Hun satte seg på en benk.', 'Så spiste hun et eple.', 'Til slutt leste hun en bok.'], cards: ['kurv', 'benk', 'eple', 'bok'], extra: 'kopp' },
  { id: 'regn', logical: true, s: ['Det begynte å regne.', 'Mia tok på seg støvlene.', 'Hun hoppet i en vannpytt.', 'Etterpå tørket hun seg med et håndkle.'], cards: ['sky', 'stovel', 'pytt', 'handkle'], extra: 'sol' },
  { id: 'ekorn', s: ['Ekornet fant en nøtt.', 'Det gjemte nøtta under et tre.', 'Om vinteren kom snøen.'], cards: ['nott', 'tre', 'sno'], extra: 'eple' },
  { id: 'siv', s: ['Siv hentet stigen.', 'Hun fant en bok øverst i hylla.', 'Så satte hun seg i stolen og leste.'], cards: ['stige', 'bok', 'stol'], extra: 'lampe' },
  { id: 'bursdag', s: ['Kokken bakte en kake.', 'Mia blåste ut lysene.', 'Så åpnet Mia gavene.', 'Til slutt lekte alle med ballongene.'], cards: ['ovn', 'lys', 'gave', 'ballong'], extra: 'bok' },
  { id: 'fisketur', s: ['Kongen satte seg i båten.', 'Han fikk en fisk.', 'Kokken stekte fisken i en gryte.'], cards: ['bat', 'fisk', 'gryte'], extra: 'drage' },
  { id: 'larven', logical: true, s: ['Det var en liten larve.', 'Larven spiste mange blader.', 'Til slutt ble den en sommerfugl.'], cards: ['larve', 'blad', 'sommerfugl'], extra: 'bie' },
  { id: 'drage', s: ['Ole tegnet en drage.', 'Han klippet den ut med saksa.', 'Så fløy dragen høyt i vinden.'], cards: ['blyant', 'saks', 'drage'], extra: 'ball' },
];

F.LESF_BANK = { LF1, LF2, LF4 };

/* =====================================================================================================================
   templates (narrator '' only)
   ===================================================================================================================== */
const T = {};
LF1.forEach(st => { st.s.forEach((s, i) => { T['lf1_' + st.id + '_' + i] = s; }); st.q.forEach((q, k) => { T['lf1_' + st.id + '_q' + k] = q.q; }); });
LF2.forEach(it => { T['lf2_' + it.id] = it.s; });
LF4.forEach(st => { st.s.forEach((s, i) => { T['lf4_' + st.id + '_' + i] = s; }); });
Object.assign(T, {
  /* ---------- F78 Fortellerstolen */
  lf_intro: ['Kom og hør! Nå skal jeg fortelle.', 'Sett deg ned. Her kommer en liten historie.', 'Hør godt etter. Nå forteller jeg.'],
  lf_intro_les: ['Her er en liten historie. Les den godt.', 'Kan du lese historien?'],
  lf_kort: ['Hør her.', 'Her kommer en ny historie.', 'Hør godt etter.'],
  lf_trykk: 'Trykk på svaret i bildet.',
  lf_igjen: 'Hør historien en gang til.',
  lf_h_hor: ['Hør godt etter en gang til.', 'Lytt en gang til. Hvem gjorde hva?'],
  lf_h_lure: 'Den var også med i historien. Hør godt etter hva jeg spør om.',
  lf_h_ikke_med: 'Den var ikke med i historien.',
  lf_sol: 'Se, det er denne. Trykk på den som lyser.',
  lf_ok: ['Du hørte godt etter!', 'Akkurat sånn var det!', 'Du husket det!'],
  lf_ok_les: ['Du leste godt!', 'Akkurat sånn sto det!'],
  /* ---------- LF2 instructions */
  lf2_intro: ['Hør godt. Gjør akkurat det jeg sier.', 'Hør på oppdraget.'],
  lf2_trykk: 'Trykk på dem, og trykk på Ferdig.',
  lf2_h_ikke: 'Hør godt på ordet ikke.',
  lf2_h_tell: 'Hvor mange skulle det være? Hør en gang til.',
  lf2_h_alle: 'Har alle som skal ha, fått noe?',
  lf2_h_feil: 'Noen av dem skulle ikke ha noe.',
  lf2_h_storrelse: 'Se godt på hvor store de er.',
  lf2_sol: 'Trykk på de som lyser.',
  lf2_ok: ['Akkurat som jeg sa!', 'Så fint du hørte etter!', 'Nå fikk alle riktig!'],
  /* ---------- LF3 evidence (read mode) */
  lf3_bevis: 'Hvilket ord i historien viser det? Trykk på ordet.',
  lf3_h_setning: 'Svaret står i denne setningen.',
  lf3_sol: 'Trykk på ordet som lyser.',
  /* ---------- F79 Bildehylla (LF4) */
  lf4_intro: ['Hør på historien. Etterpå skal du legge bildene i rekkefølge.', 'Nå forteller jeg en historie. Husk hva som skjedde først.'],
  lf4_legg: 'Legg bildene i riktig rekkefølge.',
  lf4_ekstra: 'Ett av bildene var ikke med i historien.',
  lf4_h_forst: 'Hva skjedde først i historien?',
  lf4_h_ekstra: 'Var det bildet med i historien?',
  lf4_retell: 'Hør, nå forteller vi den sammen.',
  lf4_ok: ['Nå er historien i riktig rekkefølge!', 'Du husket hele historien!'],
  lf_lo3_intro: 'Se godt på bildene.',
});
if (F.TPL && F.TPL.addAll) F.TPL.addAll(T);
F.LESF_TPL = T;
})();
