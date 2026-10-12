/* Feslottet – speech templates for Ordstaven (wand_*) and the reading/writing formats F23–F41 (rw_*). Owner: FORMATS-W.
   Pure data at load time (registered with F.TPL). Rules: ≤2 slots, slots = named finite sets, short bokmål lines,
   voices kept tight (NPC voices only where the NPC really says it; everything else is Puff/narrator '').
   Reading targets are NEVER in a prompt: prompts are carriers; the word clip ('rw_word') is only chained AFTER a first attempt
   or for writing (dictation) tasks.
   Helper used by wand.js / f_read.js / f_write.js:  F.RW.say(id, slots, voice) – falls back to the narrator voice when the
   template does not declare that voice (so any NPC can host any format without UNENUMERATED SPEECH). */
(function () {
'use strict';
const F = window.F = window.F || {};
const T = F.TPL;
// NPC voices that host wishes/notes. Staff with their own place get their own line where the format lives with them.
const NPC = ['', 'konge', 'dronning', 'mia', 'vm', 'vk', 'barn'];
const ROY = ['', 'konge', 'dronning', 'mia'];

/* ------------------------------------------------------------------ Ordstaven (free casting) */
T.addAll({
  wand_hello: ['Skriv et ord, så tryller staven!', 'Hva skal vi trylle?'],
  wand_near: 'Nesten! Se her.',
  wand_retype: 'Skriv det en gang til!',
  wand_unknown: 'Staven kjenner ikke det ordet.',
  wand_locked: 'Den trylleformelen finnes i Tryllebua!',
  wand_lex: ['Se, ordet ble til klosser!', 'Ordet ble til store bokstaver!'],
  wand_blocks_tap: 'Trykk på klossene!',
  wand_toomany: 'Staven kan trylle 20 ting på en gang.',
  wand_number_only: 'Skriv et ord etter tallet!',
  wand_count_tens: 'Ti på rad.',
  wand_swap_ask: 'Bytt en bokstav, så skjer det noe!',
  wand_swap_same: 'Prøv å bytte en bokstav.',
  wand_react_eat: ['Så godt!', 'Det smakte godt!'],          // v5: no «Nam» / «Mmm» (playtest2 A1, DESIGN5 §2.6)
  wand_react_drink: 'Glugg, glugg, glugg!',
  wand_react_cuddle: ['Så søt!', 'Den vil kose!'],
  wand_react_play: ['Hopp og sprett!', 'Hurra, lek!'],
  wand_react_sit: 'Ahh, så godt å sitte!',
  wand_react_sleep: 'Sov godt!',
  wand_react_smell: 'Så godt det lukter!',
  wand_react_warm: 'Så varmt og godt!',
  wand_react_light: 'Så fint lys!',
  wand_react_wear: 'Så fin du ble!',
  wand_react_ride: 'Brumm, brumm!',            // v5 (playtest2 A3): «Brrrum!» was read «Berrum?»
  wand_react_music: 'Hør, så fint!',
  wand_react_grow: 'Se, den vokser!',
  wand_react_fly: 'Den flyr!',
  wand_react_none: ['Hei hei!', 'Så morsomt!'],
  wand_gone: 'Puff, borte vekk!',
  wand_full: 'Nå er det mange ting her!',
}, { voices: [''] });
// modifier words written with the wand («stor», «rød», «glad», «sove» …): the word she wrote, then what happened.
// Lines avoid gender agreement (den/det, stor/stort): comparatives and exclamations only. Set WAND_MODS lives in wand.js.
T.add('wand_mod', { text: '{m}', slots: { m: 'WAND_MODS' }, voices: [''] });
T.add('wand_mod_tip', { text: 'Prøv å skrive {m}!', slots: { m: 'WAND_TIPS' }, voices: [''] });
T.addAll({
  wand_mod_none: 'Tryll fram en ting først!',
  wand_mod_hva: 'Hva skal det være? Skriv en ting også!',     // parent 11.10.: «rød» alone with nothing to colour
  wand_mod_big: ['Svisj! Større!', 'Større og større!'],
  wand_mod_small: ['Svisj! Mindre!', 'Mindre og mindre!'],
  wand_mod_maxbig: 'Større går ikke!',
  wand_mod_maxsmall: 'Mindre går ikke!',
  wand_mod_col: ['Ny farge!', 'Se, en ny farge!'],
  wand_mod_glad: ['Hurra!', 'Så glad!'],
  wand_mod_sove: ['Snork, snork.', 'God natt!'],
  wand_mod_danse: ['Dansefest!', 'Dans, dans, dans!'],
  wand_mod_hoppe: ['Hopp, hopp, hopp!', 'Boing, boing!'],
  wand_mod_vaken: 'God morgen!',
  wand_wish_give: ['Det passer perfekt!', 'Akkurat det som manglet!'],
}, { voices: [''] });
// the word itself (narrator, single-word prosody) – spoken after a cast, after a first reading attempt, or as dictation
T.add('rw_word', { text: '{w}', slots: { w: 'WORDS' }, voices: [''] });
// counting for Tallmagi (narrator number clips; same texts as the core number clips)
T.add('wand_num', { text: '{n}', slots: { n: 'NUM_1_20' }, voices: [''] });
// NPC reaction when it receives a summoned thing (wish solved)
T.add('wand_npc_thanks', { text: ['Tusen takk!', 'Akkurat det jeg ville ha!', 'Å, så fint!'], voices: NPC });
T.add('wand_npc_eat', { text: ['Så godt!', 'Det smaker godt!'], voices: NPC });
T.add('wand_npc_cuddle', { text: 'Så søt den er!', voices: NPC });
T.add('wand_npc_wear', { text: 'Ser jeg fin ut?', voices: NPC });
T.add('wand_npc_warm', { text: 'Nå er jeg varm igjen!', voices: NPC });

/* ------------------------------------------------------------------ shared feedback (formats) */
T.addAll({
  rw_try: ['Prøv igjen!', 'Nesten! Prøv en gang til.'],
  rw_look_first: 'Se på den første bokstaven.',
  rw_look_letters: 'Se på bokstavene en gang til.',
  rw_tap_note: 'Trykk på lappen, så hjelper jeg deg.',
  rw_here: 'Den er her!',
  rw_show: 'Se her! Nå kan du gjøre det.',
  rw_first_is: 'Den første bokstaven er',
  rw_listen: 'Hør på ordet:',
  rw_skriv: 'Skriv:',
  rw_det_star: 'Det skal stå:',
  rw_great: ['Riktig!', 'Ja! Så flink du er!', 'Supert!'],
  rw_short: 'Kort lyd! Da skriver vi to like bokstaver.',
  rw_silent: 'Den hører vi ikke, men den skal være med.',
  rw_missing_one: 'Det mangler en bokstav.',
  rw_too_many: 'Det er en bokstav for mye.',
}, { voices: [''] });

/* ------------------------------------------------------------------ reading formats */
// F23 Ønskelappen – the NPC holds a note; she reads it and taps the right 3D thing
T.add('rw_f23_prompt', { text: ['Les lappen! Hva ønsker jeg meg?', 'Her er lappen min. Kan du lese den?'], voices: NPC });
T.add('rw_f23_ok', { text: ['Ja, det står det!', 'Riktig ting!'], voices: [''] });
// v5 WP-R2 (logic #9): what kind of note it is (ctx.noteKind / params.noteKind) – only a wish is handed over and used by the reader
T.add('rw_f23_brev', { text: ['Hva står det i brevet?', 'Kan du lese brevet?'], voices: NPC });
T.add('rw_f23_spor', { text: ['Les lappen, så finner vi det!', 'Hva står det på sporlappen?'], voices: NPC });
T.add('rw_f23_bestill', { text: 'Les lappen min, så ser du hva jeg vil kjøpe!', voices: NPC });
T.add('rw_f23_liste', { text: ['Hva står det på lista?', 'Les lista!'], voices: NPC });
T.add('rw_f23_funnet', { text: ['Der er det!', 'Ja, det var det!'], voices: [''] });
// F24 Krukkehylla – Kokk Kari shows a picture; she finds the jar with the right label
T.add('rw_f24_prompt', { text: ['Kan du finne riktig krukke?', 'Hvilken krukke passer til bildet?'], voices: ['', 'kokk', 'vk', 'vm'] });
T.add('rw_f24_ok', { text: ['Takk! Nå kan jeg bake.', 'Den ja! Takk!'], voices: ['', 'kokk', 'vk', 'vm'] });
// v5 WP-R2 (logic #53): the bake line only in a kitchen / bakery – anywhere else a neutral thanks
T.add('rw_f24_ok2', { text: ['Den ja! Takk!', 'Akkurat den!'], voices: ['', 'kokk', 'vk', 'vm'] });
// F25 Boktittelen – library: give the book whose title matches the picture
T.add('rw_f25_prompt', { text: ['Finn boka om dette!', 'Hvilken bok handler om dette?'], voices: ['', 'siv', 'dronning', 'mia', 'barn'] });
T.add('rw_f25_ok', { text: 'Se, boka blir levende!', voices: [''] });
// F26 Veiskiltet (P1)
T.add('rw_f26_prompt', { text: 'Hvilket skilt peker dit?', voices: ['', 'vm', 'vk', 'per'] });
// v3 WP5 Veiviser: at a REAL signpost the arm plaques are the choices; when she is right the narrator names where that road goes.
// Generic F26 (a picture of a thing, no real post): its own carrier line.
T.add('rw_f26_vei', { text: 'Den veien går til {place}!', slots: { place: 'PLACES' }, voices: [''] });
T.add('rw_f26_vei_slott', { text: 'Den veien går til {slott}!', slots: { slott: 'REALMS' }, voices: [''] });
T.add('rw_f26_vei_hjem', { text: 'Den veien går hjem til slottet!', voices: [''] });
T.add('rw_f26_ting', { text: 'Feen vil hit. Hvilket skilt peker dit?', voices: ['', 'vm', 'vk', 'per'] });
// F27 Dørskiltene – which door has the right plaque
T.add('rw_f27_prompt', { text: ['Hvilken dør passer til bildet?', 'Finn døra med riktig skilt!'], voices: ['', 'konge', 'dronning', 'mia', 'rolf'] });
T.add('rw_f27_ok', { text: 'Døra går opp!', voices: [''] });
// F28 Les og gjør (P1)
T.add('rw_f28_prompt', { text: 'Les og gjør det!', voices: ['', 'mia'] });
// F29 Rimklokkene (P1)
// v3 WP5: no dangling «på» fragment any more – 'Hør på ordet:' (rw_listen) + the ringing word, then the question
T.add('rw_f29_ask', { text: ['Hva rimer på det?', 'Finn klokka som rimer!'], voices: [''] });
// F30 Avisa / Kongeposten-style headline: read → Ja / Nei
T.add('rw_f30_prompt', { text: ['Les det som står. Stemmer det?', 'Er det sant?'], voices: ['', 'konge'] });
// v4 F30 evidence tap (2T): after Ja/Nei she taps the word that shows it
T.add('rw_f30_bevis', { text: 'Trykk på ordet som viser det.', voices: [''] });
// F31 Gåta (P1)
T.add('rw_f31_prompt', { text: ['Her er en gåte. Les den!', 'Kan du løse gåta?'], voices: ['', 'rolf'] });
// spoken AFTER the attempt (reinforcement) and for Puff after 4 s: phrases, sentences, riddles (finite sets from words.js)
T.add('rw_phrase', { text: '{p}', slots: { p: 'PHRASES' }, voices: [''] });
T.add('rw_sentence', { text: '{s}', slots: { s: 'SENTENCES' }, voices: [''] });
T.add('rw_riddle', { text: '{r}', slots: { r: 'RIDDLES' }, voices: [''] });
// F32 Hva blir det? (P1)
T.add('rw_f32_prompt', { text: 'Én bokstav er ny. Hva står det nå?', voices: [''] });

/* ------------------------------------------------------------------ writing formats */
// F33 Ordmagi-ønsket – picture wish / need wish / dictation
T.add('rw_f33_wish', { text: ['Kan du trylle denne til meg?', 'Jeg ønsker meg denne! Kan du trylle den?'], voices: NPC });
T.add('rw_f33_cast', { text: ['Skriv ordet med staven!', 'Skriv det, så tryller staven!'], voices: [''] });
T.add('rw_f33_need_help', { text: 'Skriv noe som kan hjelpe!', voices: [''] });
T.add('rw_f33_need_more', { text: 'Det finnes mange riktige ord!', voices: [''] });
const NEEDS = {
  // v5 (playtest2 A2): «Brr, jeg fryser!» was read «B er her» → «Huff»
  kald: 'Huff, jeg fryser!', sulten: 'Jeg er så sulten!', torst: 'Jeg er så tørst!', trott: 'Jeg er så trøtt!',
  kjed: 'Jeg kjeder meg!', fin: 'Jeg vil være fin i dag!', sitte: 'Jeg vil gjerne sitte!', dyr: 'Jeg vil ha et dyr!',
  lys: 'Jeg vil ha mer lys!', lukt: 'Jeg vil ha noe som lukter godt!',
};
for (const k in NEEDS) T.add('rw_need_' + k, { text: NEEDS[k], voices: NPC });
// F34 Handlelista (P1)
T.add('rw_f34_prompt', { text: ['Skriv handlelista mi!', 'Kan du skrive det jeg sier?'], voices: ['', 'dronning'] });
T.add('rw_f34_say', { text: 'Kan du skrive det jeg sier?', voices: ['', 'dronning'] });
T.add('rw_f34_more', { text: 'Og så en ting til.', voices: ['', 'dronning'] });
// F35 Skiltet som blåste
T.add('rw_f35_prompt', { text: ['Vinden blåste bort en bokstav!', 'Oi, det mangler bokstaver!'], voices: [''] });
T.add('rw_f35_ask', { text: 'Hvilken bokstav mangler?', voices: [''] });
// F36 Stokket skilt
T.add('rw_f36_prompt', { text: ['Skiltet ramlet ned!', 'Bokstavene ble blandet!'], voices: [''] });
T.add('rw_f36_ask', { text: 'Trykk på bokstavene i riktig rekkefølge.', voices: [''] });
// F37 Mias feil (P1)
T.add('rw_f37_prompt', { text: ['Jeg skrev et ord. Er det riktig?', 'Hjelp meg å skrive riktig!'], voices: ['mia'] });
T.add('rw_f37_ask', { text: 'Trykk der det er feil.', voices: [''] });
T.add('rw_f37_ok', { text: 'Takk! Nå er det riktig!', voices: ['mia'] });
// F38 Bokstavbytte (P1)
T.add('rw_f38_prompt', { text: ['Bytt en bokstav, så blir det noe nytt!', 'Hvilken bokstav må byttes?'], voices: [''] });
T.add('rw_f38_ok', { text: 'Bokstavbytte!', voices: [''] });
// F39 Kategori-staven (P1)
T.add('rw_f39_prompt', { text: 'Skriv noe som passer!', voices: [''] });
T.add('rw_f39_cat', { text: 'Skriv {c}!', slots: { c: 'CATS' }, voices: [''] });
// F40 Sandskrift / navnelapp (P1)
T.add('rw_f40_sand', { text: 'Skriv det i sanden!', voices: [''] });
T.add('rw_f40_name', { text: ['Skriv navnet på lappen!', 'Hva skal den hete? Skriv navnet!'], voices: [''] });
T.add('rw_name', { text: '{n}', slots: { n: 'NAMES' }, voices: [''] });
// F41 Første lyd
T.add('rw_f41_ask', { text: ['Hvilken lyd hører du først?', 'Hvilken bokstav begynner ordet med?'], voices: [''] });
// v3 WP5: world words that are shown on labels but are not LES words (shop plaques, jars): a clip for the 2nd tap of F.UI.tryRead.
// Label-only: no model, never in a LES bank.
F.SETS.LABEL_WORDS = ['klær', 'møbler', 'leker', 'gaver', 'trylling', 'bygg', 'mel', 'salt', 'te', 'les', 'skriv'];
T.add('rw_label', { text: '{w}', slots: { w: 'LABEL_WORDS' }, voices: [''] });

/* ------------------------------------------------------------------ v5 WP-R2 (logic #12, §3-E): narrator twins of first-person lines
   When a host cannot voice a «jeg» line (or Puff would say it), tpl.js (WP-K2) speaks the third-person twin instead. */
T.addAll({
  wand_npc_thanks_n: ['Tusen takk!', 'Akkurat det som manglet!', 'Å, så fint!'],
  wand_npc_wear_n: 'Så fin!',
  wand_npc_warm_n: 'Nå er det varmt og godt!',
  rw_f23_prompt_n: ['Les lappen! Hva står det på den?', 'Her er en lapp. Kan du lese den?'],
  rw_f23_bestill_n: 'Les lappen, så ser du hva som skal kjøpes!',
  rw_f33_wish_n: ['Kan du trylle denne?', 'Se, et ønske! Kan du trylle det?'],
  rw_f34_prompt_n: ['Skriv handlelista!', 'Kan du skrive det du hører?'],
  rw_f34_say_n: 'Kan du skrive det du hører?',
  rw_f37_prompt_n: ['Mia skrev et ord. Er det riktig?', 'Hjelp Mia å skrive riktig!'],
  rw_f37_ok_n: 'Takk! Nå er det riktig!',
  // v5d WP-R3 (WP-K2 request): own twin of «Takk! Nå kan jeg bake.» – same texts as WP-K2's fallback (clips exist)
  rw_f24_ok_n: ['Riktig krukke!', 'Den ja!'],
}, { voices: [''] });
const NEEDS_N = {
  kald: 'Huff, så kaldt det er!', sulten: 'Noen er sulten!', torst: 'Noen er tørst!', trott: 'Noen er trøtt!',
  kjed: 'Noen kjeder seg!', fin: 'Noen vil være fin i dag!', sitte: 'Noen vil gjerne sitte!', dyr: 'Noen vil ha et dyr!',
  lys: 'Her trengs mer lys!', lukt: 'Noen vil ha noe som lukter godt!',
};
for (const k in NEEDS_N) T.add('rw_need_' + k + '_n', { text: NEEDS_N[k], voices: [''] });
if (typeof T.twin === 'function') {
  [['wand_npc_thanks', 'wand_npc_thanks_n'], ['wand_npc_wear', 'wand_npc_wear_n'], ['wand_npc_warm', 'wand_npc_warm_n'],
   ['rw_f23_prompt', 'rw_f23_prompt_n'], ['rw_f23_bestill', 'rw_f23_bestill_n'], ['rw_f33_wish', 'rw_f33_wish_n'],
   ['rw_f34_prompt', 'rw_f34_prompt_n'], ['rw_f34_say', 'rw_f34_say_n'], ['rw_f37_prompt', 'rw_f37_prompt_n'], ['rw_f37_ok', 'rw_f37_ok_n'],
   ['rw_f24_ok', 'rw_f24_ok_n']]
    .forEach(([a, b]) => T.twin(a, b));
  for (const k in NEEDS_N) T.twin('rw_need_' + k, 'rw_need_' + k + '_n');
}

/* ------------------------------------------------------------------ runtime helper (safe voice fallback) */
F.RW = F.RW || {};
F.RW.say = function (id, slots, voice) {
  const s = T.all[id];
  if (!s) { console.error('rw: unknown template ' + id); return Promise.resolve(); }
  const v = voice && s.voices.includes(voice) ? voice : (s.voices.includes('') ? '' : s.voices[0]);
  // slot values must be in their set; otherwise stay silent (text-only) instead of producing unenumerated speech
  for (const k in s.slots) {
    let set; try { set = F.SETS.get(s.slots[k]); } catch (e) { set = []; }
    if (!slots || !set.some(x => String(x) === String(slots[k]))) return Promise.resolve(false);
  }
  return F.SAY(id, slots, v);
};
F.RW.text = (id, slots) => T.text(id, slots, 0);
})();
