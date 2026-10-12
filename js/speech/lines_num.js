/* Feslottet – speech templates for the number task formats F01–F22 (WP FORMATS-N). Pure data, registered at load time.
   Rules: one sentence per clip, ≤2 slots, every slot is a named finite set, voices kept tight
   ('' = Puff/narrator; NPC voices only where the NPC really says the line: royals, vm/vk, kokk, per).
   Game code: F.NUM.say(id, slots, voice) – falls back to '' when the voice is not declared for that template. */
(function () {
'use strict';
const F = window.F = window.F || {};
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const SETS = F.SETS = F.SETS || {};

/* ---------------------------------------------------------- bounded sets (owned by FORMATS-N) */
// countable things (plural, indefinite) – only things with a voxel model are used at runtime
SETS.NUM_PL = ['epler', 'egg', 'boller', 'roser', 'ender', 'sauer', 'kaker', 'baller', 'jordbær', 'blomster', 'krystaller', 'stjerner', 'kyllinger',
  // v5 WP-R2 (playtest2 V7): the animals' food / things for themed encounters (F.WORDS plurals of castable models)
  'nøtter', 'kongler', 'gulrøtter', 'skjell', 'steiner', 'fisker', 'blader', 'sopper', 'frø', 'bær',
  // v5 WP-R2 (logic #4): what the counting quests count (Q19 hatter, Q11 lys, party gaver)
  'hatter', 'lys', 'gaver'];
// the fairy manipulative skins (F07)
SETS.NUM_SKIN_PL = ['krystaller', 'blomster', 'bobler', 'stjerner'];
SETS.NUM_BUNDLE = ['Ti krystaller blir én stav', 'Ti blomster blir ett bed', 'Ti bobler blir én ring', 'Ti stjerner blir én ramme', 'Ti boller blir ett brett'];
SETS.NUM_0_40 = range(0, 40);
SETS.NUM_9_21 = range(9, 21);
// targets that can be heard in code/lift/post prompts: teens + decades (teen/-ty contrast)
SETS.NUM_CODE = [...range(10, 20), 30, 40, 50, 60, 70, 80, 90];
// decomposition sentences (one clip each)
SETS.NUM_TEEN_SPLIT = range(11, 19).map(n => `${n} er ti og ${n - 10}`).concat(['20 er to tiere']);
SETS.NUM_DEC_SPLIT = range(3, 9).map(k => `${k * 10} er ${['', '', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni'][k]} tiere`);
SETS.NUM_TEEN_TY = range(3, 9).flatMap(k => [`${10 + k}, ikke ${k * 10}`, `${k * 10}, ikke ${10 + k}`]);
// v4 (WP-R): heard numbers 10–100 as WHOLE clips (SYNTHESIS §6.6 rule 2) – «Trykk på N!» (T-NAVN N10–N11) and «Skriv N.» (T-SKRIV W8)
SETS.NUM_10_100 = SETS.NUM_10_100 || range(10, 100);
SETS.NUM_21_100 = SETS.NUM_21_100 || range(21, 100);

// voices: '' (Puff) everywhere; an NPC voice only on lines that NPC really says in the formats its role/job offers
// (actors.js ROLE_FORMATS / JOB_FORMATS). F.NUM.say falls back to '' (or the first declared voice) for anyone else.

/* ---------------------------------------------------------- templates */
F.TPL.addAll({
  // generic: counting clips, totals, praise, hints
  num_det_ble: { text: 'Det ble {n}.', slots: { n: 'NUM_0_40' } },
  num_vi_trenger: { text: 'Vi trenger {n}.', slots: { n: 'NUM_10_20' } },
  num_split: { text: '{s}.', slots: { s: 'NUM_TEEN_SPLIT' } },
  num_dec: { text: '{s}.', slots: { s: 'NUM_DEC_SPLIT' } },
  num_teen_ty: { text: '{s}.', slots: { s: 'NUM_TEEN_TY' } },
  num_hor_godt: 'Hør godt!',
  num_tier_forst: 'Tieren kommer først.',
  num_full_rad: 'Se: en full rad er ti.',
  num_full_ramme: 'Se: en full ramme er ti.',
  num_tell_videre: 'Vi teller videre fra ti.',
  num_prov_igjen: ['Prøv en gang til!', 'Nesten! Prøv igjen.'],
  num_se_her: 'Se her!',
  num_din_tur: 'Nå er det din tur.',
  num_for_mange: 'Det ble for mange.',
  num_for_fa: 'Det ble for få.',
  num_bra: ['Riktig!', 'Ja, helt riktig!', 'Flott!', 'Supert!'],

  // F01 Heisen
  num_f01_q: { text: 'Til rom {n}, takk!', slots: { n: 'NUM_10_20' } },
  num_f01_q2: { text: 'Trykk på {n}!', slots: { n: 'NUM_10_100' } },   // v4: 10–100 (N10–N11 lift / balloons / fish)
  num_f01_ok: 'Pling! Heisen kommer.',

  // F02 Postrunden
  num_f02_q: { text: 'Brevet skal til nummer {n}.', slots: { n: 'NUM_CODE' }, voices: ['', 'per'] },
  num_f02_etter: { text: 'Brevet skal til huset etter {n}.', slots: { n: 'NUM_9_21' }, voices: ['', 'per'] },
  num_f02_for: { text: 'Brevet skal til huset før {n}.', slots: { n: 'NUM_9_21' }, voices: ['', 'per'] },
  num_f02_hull: { text: 'Ett hus har mistet nummeret sitt.', voices: ['', 'per'] },
  num_f02_hvilket: { text: 'Hvilket nummer mangler?', voices: ['', 'per'] },
  num_f02_ok: { text: 'Takk! Brevet kom fram.', voices: ['', 'per', 'vm', 'vk'] },
  // a real village door (the resident opens)
  num_f02_bor: { text: 'Her bor nummer {n}.', slots: { n: 'NUM_10_20' }, voices: ['vm', 'vk'] },
  num_f02_feil: { text: 'Her bor nummer {n}.', slots: { n: 'NUM_CODE' } },

  // F06 Telle-brettet
  num_f06_q: { text: 'Hvor mange {pl} er det?', slots: { pl: 'NUM_PL' }, voices: ['', 'konge', 'mia'] },

  // F07 Tryllebygg
  num_f07_q: { text: 'Vi trenger {n} {pl}.', slots: { n: 'NUM_10_20', pl: 'NUM_SKIN_PL' } },
  num_f07_how: 'Den store er ti. Den lille er én.',
  num_f07_bundle: { text: '{s}!', slots: { s: 'NUM_BUNDLE' } },
  num_f07_ok: 'Trylleriet er klart!',
  num_trykk_hake: 'Trykk på haken når du er ferdig.',

  // F08 Tell-og-trykk
  num_f08_tap: 'Trykk på hver, så teller vi.',
  num_f08_q: 'Hvor mange ble det?',
  // v5 WP-R2 phase hints (playtest2): the tap phase shows what to DO; counting nudges never say the count
  num_f08_tap_hint: 'Trykk på hver av dem én gang.',
  num_f08_lyser: 'Den som lyser, har du ikke trykket på ennå.',
  num_tell_selv: 'Tell videre fra ti selv.',
  num_tell_alle: 'Pek på hver og tell selv.',

  // F09 Plukk opp
  num_f09_q: { text: 'Kan du hente {n} {pl}?', slots: { n: 'NUM_10_20', pl: 'NUM_PL' } },   // «hente» fits animals and things alike (review: «plukke 13 sauer»)
  num_f09_q0: { text: 'Kan du hente {n}?', slots: { n: 'NUM_10_20' } },
  num_f09_q2: { text: 'Kan jeg få {n}?', slots: { n: 'NUM_10_20' }, voices: ['vk', 'vm'] },
  num_f09_ok: { text: 'Takk! Det var akkurat riktig.', voices: ['', 'vk', 'vm'] },

  // F10 Bakebrett
  num_f10_q: { text: 'Kan du bake {n} boller?', slots: { n: 'NUM_10_20' }, voices: ['', 'kokk'] },
  num_f10_m8: { text: '{n} er ti og hvor mange?', slots: { n: 'NUM_10_20' }, voices: ['', 'kokk'] },
  num_f10_brett: { text: 'Et brett har ti boller.', voices: ['', 'kokk'] },
  num_f10_ok: { text: 'Se! Bollene er ferdige.', voices: ['', 'kokk'] },   // v5: no «Nam» (playtest2 A1)

  // F12 Betal riktig
  num_f12_koster: { text: 'Det koster {n}.', slots: { n: 'PRICE' }, voices: ['', 'vm', 'vk'] },   // v5 (#38): «Det», also for sko / jordbær
  // (the recorded v4 wording – f_num uses it only while «Det koster …» has no clip yet; same clips as before, nothing new to record)
  num_f12_koster_den: { text: 'Den koster {n}.', slots: { n: 'PRICE' }, voices: ['', 'vm', 'vk'] },
  num_f12_pung: 'Trykk på pungen.',
  num_f12_lag: 'Legg på tiere og enere.',
  num_f12_ok: { text: 'Takk! Det ble riktig.', voices: ['', 'vm', 'vk'] },
  num_f12_rad: 'Ti mynter blir én tier!',
  num_f12_rakk: 'Du har ikke nok mynter ennå.',
  // num_f12_spar «Du kan spare litt først.» retired (economy §1 row 18, 12.10): the shop shows the numbers and the savings goal
  // v5 WP-R2 (#2) F12 rest mode: the character's coins already lie on the counter; she lays on the rest (the missing amount is never said)
  num_f12_rest: 'Noen mynter ligger allerede på disken.',
  num_f12_resten: 'Legg på resten, så det blir nok!',

  // F14 Kodelåsen
  num_f14_q: { text: 'Koden er {n}.', slots: { n: 'NUM_CODE' } },
  num_f14_skriv: 'Skriv koden på låsen.',
  num_f14_ok: 'Klikk! Kista gikk opp.',
  // v4 W8: dictated 2-digit numbers above 20 (the code / the price is masked in the subtitle)
  num_skriv_n: { text: 'Skriv {n}.', slots: { n: 'NUM_21_100' } },

  // F15 Husnummeret
  num_f15_w1: { text: 'Skiltet skal vise {n}.', slots: { n: 'NUM_10_20' } },
  num_f15_w1b: 'Hvilket tall mangler på skiltet?',
  num_f15_w2: { text: 'Lag nummer {n} på skiltet!', slots: { n: 'NUM_10_20' } },
  num_f15_ok: 'Nå er skiltet helt igjen!',

  // F18 Trappesteinene
  num_f18_next: { text: 'Hvilken stein kommer etter {n}?', slots: { n: 'NUM_9_21' } },
  num_f18_before: { text: 'Hvilken stein kommer før {n}?', slots: { n: 'NUM_9_21' } },
  num_f18_miss: 'Hvilken stein mangler?',
  num_f18_miss2: 'Noen steiner mangler. Finn alle!',   // v4: 2–3 gaps in a longer row
  num_f18_down: 'Nå hopper vi baklengs.',
  num_f18_hopp: 'Hopp!',

  // F19 Hvem har mest?
  num_f19_more: { text: 'Hvem har flest {pl}?', slots: { pl: 'NUM_PL' } },
  num_f19_less: { text: 'Hvem har færrest {pl}?', slots: { pl: 'NUM_PL' } },
  num_f19_more2: 'Hvem har flest?',
  num_f19_less2: 'Hvem har færrest?',
  num_f19_big: 'Hvilket tall er størst?',
  num_f19_small: 'Hvilket tall er minst?',
  num_f19_ok: 'Ja! Der er det flest.',
  num_f19_ok2: 'Ja! Der er det færrest.',
  // v4 F19 ordering 3–4 baskets (quantities; numerals reuse num_f20_asc / num_f20_desc)
  num_f19_ord_more: 'Trykk fra den med flest til den med færrest.',
  num_f19_ord_less: 'Trykk fra den med færrest til den med flest.',
  // ---------------------------------------------------------------- P1 formats
  // F03 Ballongene
  num_f03_q: { text: 'Ta ballongen med {n}!', slots: { n: 'NUM_CODE' } },
  // N9: the gentle time bubble (no fail; a quick answer gets a cheer)
  num_kjapt: ['Så kjapt!', 'Lynrask!'],
  num_f03_ok: 'Pang! Der fikk du den.',
  // F04 Fiskedammen
  num_f04_q: { text: 'Fang fisken med {n}!', slots: { n: 'NUM_CODE' } },
  num_f04_ok: 'Plask! Fisken hopper av glede.',
  // F05 Trylledrikkene
  num_f05_n7: { text: 'Les ordet på flaska. Hvilket tall er det?', voices: ['', 'kokk'] },
  num_f05_n8: { text: 'Hvilket ord passer til tallet på flaska?', voices: ['', 'kokk'] },
  num_f05_ok: 'Blobb! Trylledrikken bobler.',
  // F11 Ti-og-litt
  num_f11_q: { text: 'Hvor mange er gjemt under kluten?', voices: [''] },
  num_f11_ok: 'Tada! Se hva som var under.',
  // F13 Sparegrisen
  num_f13_har: { text: 'Grisen har {n} mynter.', slots: { n: 'NUM_0_20' } },
  num_f13_har1: { text: 'Grisen har 1 mynt.' },   // singular (review: «1 mynter»)
  num_f13_trenger: { text: 'Vi trenger {n}.', slots: { n: 'NUM_0_20' } },
  num_f13_mangler: 'Hvor mange mangler?',
  num_f13_sammen: 'Hvor mange blir det til sammen?',
  num_f13_tjue: 'Du betaler med 20.',
  num_f13_tilbake: 'Hvor mange får du tilbake?',
  num_f13_ok: 'Pling! Nå er grisen fornøyd.',
  // v5 WP-R2 (#23): pocket money is someone's own purse, not the piggy bank
  num_f13p_har: { text: 'Pungen har {n} mynter.', slots: { n: 'NUM_0_20' } },
  num_f13p_har1: 'Pungen har 1 mynt.',
  num_f13p_tom: 'Pungen er tom.',
  num_f13p_ok: 'Pling! Nå er det nok.',
  // F16 Prislappen
  num_f16_q: { text: 'Den skal koste {n}.', slots: { n: 'NUM_CODE' }, voices: ['vk', 'vm'] },
  num_f16_skriv: 'Skriv prisen på lappen.',
  num_f16_ok: 'Fin prislapp!',
  // F17 Tallordet
  num_f17_q: { text: 'Skriv {n} med bokstaver.', slots: { n: 'NUM_10_20' } },
  num_f17_q0: 'Skriv tallet på tavla med bokstaver.',             // v5: any number outside 10–20 (it is on the board)
  num_f17_ok: 'Så fint skrevet!',
  // F20 Paraden / F21 Klokkespillet
  num_f20_tog: 'Hjelp dem med å gå i tog.',
  num_f20_asc: 'Trykk fra minst til størst.',
  num_f20_desc: 'Trykk fra størst til minst.',
  num_f20_minst: 'Finn det minste tallet.',
  num_f20_storst: 'Finn det største tallet.',
  num_f20_ok: { text: 'Se så fint toget går!', voices: ['', 'rolf', 'siv'] },
  num_f21_q: 'Spill klokkespillet fra 10 til 20.',
  num_f21_back: 'Spill fra 20 ned til 10.',
  num_f21_ok: 'For en vakker melodi!',
  // F22 Ble det riktig?
  num_f22_tell: { text: 'Nå teller jeg.', voices: ['', 'konge', 'dronning', 'mia', 'vm', 'vk'] },
  num_f22_q: { text: 'Ble det riktig?', voices: ['', 'konge', 'dronning', 'mia', 'vm', 'vk'] },
  num_f22_ja: { text: 'Ja, det ble riktig!', voices: ['', 'konge', 'dronning', 'mia', 'vm', 'vk'] },
  num_f22_nei: { text: 'Oi! Jeg telte feil.', voices: ['', 'konge', 'dronning', 'mia', 'vm', 'vk'] },
  num_f22_hint: 'Se på hver ting mens vi teller.',
  // v5d WP-R3: the hint REPLAYS the counter's own (maybe slipped) count – «vi teller» promised a correct count together (f_num.js
  // speaks this one once its clip exists, else num_f22_hint)
  num_f22_hint_n: 'Se på hver ting mens det blir telt.',
  // F22 at O1–O2: someone guesses the stone after / before N (the guess is a separate number clip)
  num_f22_etter: { text: 'Etter {n} kommer …', slots: { n: 'NUM_9_21' } },
  num_f22_for: { text: 'Før {n} kommer …', slots: { n: 'NUM_9_21' } },
  num_f22_hint2: 'Vi teller sammen.',
  // v4 F22 bundle (s1/s2): she taps every count that went wrong, then fixes one
  num_f22_alle: 'Noen ble feil. Trykk på alle som ble feil, og så på haken.',
  num_f22_fix: 'Hvor mange er det egentlig her?',
  // v5 WP-R2 (logic #12): narrator twins of the counter's first-person lines (tpl.js speaks them when the host has no such voice)
  num_f22_tell_n: 'Nå blir det telt.',
  num_f22_nei_n: 'Oi! Det ble telt feil.',
  // v5d WP-R3 (WP-K2 request): own twin of «Kan jeg få {n}?» (vk / vm) – same text as num_f09_q0, so it shares those clips
  num_f09_q2_n: { text: 'Kan du hente {n}?', slots: { n: 'NUM_10_20' } },

});
if (typeof F.TPL.twin === 'function') { F.TPL.twin('num_f22_tell', 'num_f22_tell_n'); F.TPL.twin('num_f22_nei', 'num_f22_nei_n'); F.TPL.twin('num_f09_q2', 'num_f09_q2_n'); }
})();
