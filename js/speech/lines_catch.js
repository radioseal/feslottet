/* Feslottet – speech templates for «Bli venn» (befriend encounter) and Vennealbumet (WP6 CATCH, DESIGN2 §5, §8.2).
   Prefixes: bf_ (encounter), al_ (album). Narrator voice '' (Puff). Finite sets only:
     FAUNA (110 bare names), FAUNA_DEF (110), FAUNA_PAGES (11), MS_FRIENDS (10..110) – exported by WP4's fauna.js; the lazy fallbacks
     below are used only if WP4's sets are missing (they read the same species list as js/game/befriend.js).
     BF_HEARTS (2..20) is WP6's own («{n} hjerter!» is never said for 0 or 1). BF_TRIAL (3..6, v3): trial lengths.
   Reading rule (§5.5): the encounter never says the animal's name before its tasks; names are only spoken as rewards (album, win).
   Natural audit 11.10. (D1): RETIRED – kept only so old clips / tests resolve, never said any more: bf_trial, bf_next_ok, bf_next_miss,
   bf_perfect, bf_hearts, bf_last, bf_page, bf_quiet, bf_yay, bf_name_gift, bf_name_skriv, bf_name_les, bf_husk. Rewritten: bf_husk_venn,
   al_stjerne. bf_intro / bf_wheel / bf_gold: the very first time only; bf_carry_save: once ever. */
(function () {
'use strict';
const F = window.F;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sp = () => (F.Befriend && F.Befriend.species ? F.Befriend.species() : []);
const pg = () => (F.Befriend && F.Befriend.pages ? F.Befriend.pages() : []);
if (!F.SETS.FAUNA) F.SETS.FAUNA = () => sp().map(s => s.word);
if (!F.SETS.FAUNA_DEF) F.SETS.FAUNA_DEF = () => sp().map(s => s.def);
if (!F.SETS.FAUNA_PAGES) F.SETS.FAUNA_PAGES = () => pg().map(p => p.name);
if (!F.SETS.MS_FRIENDS) F.SETS.MS_FRIENDS = range(1, 11).map(i => i * 10);
F.SETS.BF_HEARTS = range(2, 20);
F.SETS.BF_TRIAL = [3, 4, 5, 6];                       // v3 Venneprøven: tasks per tier (common 3, rare 4, glitter 5, legend 6)

/* ---- the encounter */
F.TPL.addAll({
  bf_intro: 'Løs oppgavene! Hvert riktig svar gir hjerter.',   // the very first encounter only (natural audit D1)
  bf_go: 'Bli venn!',                                    // (v2; kept for old clips – v3 says bf_trial instead)
  bf_retry: 'Den kjenner deg igjen!',                    // carry hearts light first («Den husker deg», v3)
  bf_quiet: 'Vi prøver snart igjen.',                    // (retired: a left trial ends without a line)
  bf_hmm: 'Oi?',                                         // (v2; v3 no longer speaks it – v5: no vowel-less words for the TTS)
  // v3 Venneprøven (DESIGN3 §5.11, §5.12)
  bf_last: 'Siste oppgave!',                             // (retired, natural audit D1: the pips show it)
  bf_perfect: 'Alt riktig så langt!',                    // (retired)
  bf_carry_save: 'Dyret husker hjertene dine til neste gang.',   // after a lost wheel, before bf_fail – once ever
  bf_next_ok: ['Dyret liker deg!', 'Se, den kommer nærmere!', 'Bra! En til!'],     // (retired: the animal hops closer instead)
  bf_next_miss: ['Det går fint. Neste!', 'Dyret venter på deg.', 'Vi prøver en til.'],   // (retired)
  bf_tema_mat: ['Her er maten til dyret!', 'Se, dette liker dyret å spise!'],   // v5 (v5r2: no longer said – kept for old clips; read as predation)
  // v5 WP-A: the counting task with the animal's own food says what it eats – deictic «Den …» (the name is never said before Navnelappen)
  'bf_spiser_nøtt': 'Den spiser nøtter!', bf_spiser_gulrot: 'Den spiser gulrøtter!', bf_spiser_n_gress: 'Den spiser gress!', 'bf_spiser_kål': 'Den spiser kål!',
  bf_spiser_salat: 'Den spiser blader og salat!', bf_spiser_eple: 'Den spiser epler!', bf_spiser_banan: 'Den spiser bananer!', bf_spiser_drue: 'Den spiser druer!',
  'bf_spiser_bær': 'Den spiser bær!', 'bf_spiser_blåbær': 'Den spiser blåbær!', bf_spiser_mais: 'Den spiser korn!', bf_spiser_fisk: 'Den spiser fisk!',
  bf_spiser_n_klover: 'Den spiser kløver!', bf_spiser_n_blomst: 'Den henter nektar i blomstene!', bf_spiser_n_hoyball: 'Den spiser høy!',
  bf_spiser_n_skjell: 'Den spiser skjell!', bf_spiser_n_nokkerose: 'Den spiser vannplanter!', 'bf_spiser_pære': 'Den spiser pærer!',
  // v5r2: the line follows the ANIMAL (befriend.js foodLine): the nectar line only for bie / humle / sommerfugl (humla's clover too);
  // a giant tortoise or a unicorn that eats flowers gets this one
  bf_spiser_blomst: 'Den spiser blomster!',
  // v5 WP-A: where the animal lives, at the start of its trial (deictic; the same species have a «Hvor bor den?» home model)
  bf_bor_bie: 'Den bor i en bikube.', 'bf_bor_høne': 'Den bor i et hønsehus.', bf_bor_hest: 'Den bor i en stall.', bf_bor_ponni: 'Den bor i en stall.',
  bf_bor_esel: 'Den bor i en stall.', bf_bor_and: 'Den bor ved en dam.', bf_bor_andunge: 'Den bor ved en dam.', bf_bor_svane: 'Den bor ved vannet.',
  bf_bor_ekorn: 'Den bor i et tre.', bf_bor_ugle: 'Den bor i et hull i et tre.', bf_bor_hakkespett: 'Den bor i et hull i et tre.',
  bf_bor_pingvin: 'Den bor langt sør, der det er is og snø.',
  bf_name_gift: 'Nå får vennen din et navn!',           // (retired with the naming step, natural audit D1 #57)
  bf_name_skriv: 'Skriv navnet på vennebåndet!',        // (retired)
  bf_name_les: 'Les navnet på vennebåndet!',            // (retired)
  bf_star: 'Dere ble enda bedre venner! En vennestjerne!',   // Vennestjerne: both mini-trial tasks first-try right
  // v5c WP-A2: the Vennestjerne is friendship × knowledge – it opens with one spaced recall of what the friend taught her
  bf_husk_venn: 'Vennen din har en gåte til deg!',            // before the Vennestjerne's recall (natural audit D1: the friend asks)
  bf_husk: 'Nå skal vi se hva du husker!',                   // (retired: a teacher line – bf_husk_venn for every recall)
  bf_star_gull: 'Tre vennestjerner! Nå har kortet gullramme i albumet.',
  bf_star_nesten: 'Du husket det! Neste gang kan dere få en stjerne.',   // recall right, the play task not first-try
  bf_star_snart: 'Nå vet du det! Dere kan leke igjen en annen dag.',     // recall missed (the fact was just retold as feedback)
  bf_imorgen: 'Kom tilbake i morgen, så kan dere leke!',                // a friend that taught her today (nothing due yet), once a day
  bf_play: 'Vil du leke med vennen din?',                // a tap on a friend (a 2nd tap plays)
  bf_all: 'Alle hjertene lyser!',                        // all first-try answers → sure friend
  bf_wheel: 'Nå snurrer vi vennehjulet!',                // the first wheel ever only
  bf_gold: 'Hvis stjerna stopper på et gullhjerte, blir dere venner!',   // the first wheel ever only
  bf_fail: 'Den vil leke litt til. Prøv igjen senere!',
  bf_legend_home: 'Eventyrdyret går hjem. Det kommer tilbake en annen dag.',
  bf_legend: 'Et eventyrdyr!',
  bf_rare: 'Et sjeldent dyr!',
  bf_glitter: 'Et glitterdyr!',
  bf_yay: 'Hurra!',                                      // (retired: the win's chime, hearts and hop say it)
  bf_break: 'Dyra leker nå. Snart kan du bli venn!',     // same text as WP4's play-break line (shared clip)
  bf_already: 'Dere er venner!',
}, { voices: [''] });
F.TPL.add('bf_hearts', { text: '{n} hjerter!', slots: { n: 'BF_HEARTS' } });                   // (retired: the meter shows them)
F.TPL.add('bf_trial', { text: 'Dyret har {n} oppgaver til deg!', slots: { n: 'BF_TRIAL' } });   // (retired: the paws show them)
F.TPL.add('bf_friend', { text: 'Du ble venn med {dyr}!', slots: { dyr: 'FAUNA_DEF' } });
F.SETS.ALBUM_SIDE = range(1, 11);                    // v5 WP-A: natural album page numbers (page ids 10–20 → «side 1» … «side 11»)
F.TPL.add('bf_page', { text: 'Den står på side {n} i albumet.', slots: { n: 'ALBUM_SIDE' } });   // (retired: the album button bumps)
F.TPL.add('bf_name', { text: '{dyr}', slots: { dyr: 'FAUNA' } });           // bare name (album card tap, «Dagens dyr:» chain)
// legend intros: describe, never name (the name is the reward)
F.TPL.addAll({
  bf_lg_enhjørning: 'Se, et horn som glitrer i alle farger!',
  bf_lg_vingehest: 'Se, den har store vinger!',
  bf_lg_skylam: 'Den er myk som en sky!',
  bf_lg_isbjørnunge: 'Den er hvit som snø!',
  bf_lg_krystallhjort: 'Se, den har horn av krystall!',
  bf_lg_solhare: 'Den skinner som sola!',
  bf_lg_perlehval: 'Den glitrer som en perle!',
  bf_lg_kjempeskilpadde: 'Den har blomster på ryggen!',
  bf_lg_månekatt: 'Den lyser som månen!',
  bf_lg_elefantunge: 'Den har en lang snabel!',
}, { voices: [''] });

/* ---- the album */
F.TPL.addAll({
  al_open: 'Her er vennealbumet ditt!',
  al_tap: 'Trykk på et tall!',
  al_none: 'Trykk på et dyr ute, så kan dere bli venner!',
  al_follow: 'Nå følger den deg!',
  al_pick: 'Trykk på en venn, så kan den følge deg!',    // cover: the empty «Følger deg» slot
  al_home: 'Nå går den hjem.',
  al_full: 'Hele siden er full!',
  al_today: 'Dagens dyr:',
  // hint chain for an unfound card: habitat + condition(s) + tier. al_h_<n> are THE page hint ids (one per album page 10–20; WP4's
  // F.FAUNA.pages[].hab/hint suggestion, worded as the §5.5 chain «Den bor …»); other WPs get the id from F.Album.hintId(n)
  al_h_10: 'Den bor i slottsparken.', al_h_11: 'Den bor i landsbyen.', al_h_12: 'Den bor på gården.', al_h_13: 'Den bor på enga.',
  al_h_14: 'Den bor i frukthagen.', al_h_15: 'Den bor ved innsjøen.', al_h_16: 'Den bor ved møllene.', al_h_17: 'Den bor på stranda.',
  al_h_18: 'Den bor i havet.', al_h_19: 'Den bor i snøen.', al_h_20: 'Den bor ved noe stort og spesielt.',
  al_lm_regnbuebro: 'Den bor ved regnbuebroen.', al_lm_kjempemolle: 'Den bor ved kjempemølla.', al_lm_ballongplass: 'Den bor ved ballongplassen.',
  al_lm_isslott: 'Den bor ved isslottet.', al_lm_krystallhoyden: 'Den bor på krystallhøyden.', al_lm_kjempesolsikke: 'Den bor ved kjempesolsikken.',
  al_lm_fyrtarn: 'Den bor ved fyrtårnet.', al_lm_sandslott: 'Den bor ved sandslottet.', al_lm_pariserhjul: 'Den bor ved pariserhjulet.',
  al_lm_dyrepark: 'Den bor i dyreparken.',
  al_c_morgen: 'Den kommer om morgenen.', al_c_kveld: 'Den kommer i kveldssola.', al_c_regn: 'Den kommer i regnbuevær.',
  al_c_vind: 'Den kommer når det blåser.', al_c_kikkert: 'Du trenger en kikkert.', al_c_far: 'Den bor langt borte.',
  al_c_friends: 'Den kommer når du har mange dyrevenner.', al_c_sea: 'Den kommer når du har mange venner fra havet.',
  al_t_1: 'Den er lett å finne.', al_t_2: 'Den er sjelden.', al_t_3: 'Den er svært sjelden.', al_t_4: 'Det er et eventyrdyr!',
  // v5c WP-A2: one star row per card (friendship × knowledge); «?» rows on the fact card
  al_stjerne: 'Lek med vennen din en annen dag, så kan dere vinne en vennestjerne!',   // natural audit D1 rewrite
  al_stjerne_gull: 'Tre vennestjerner! Dere er bestevenner.',
  al_fakta_morgen: 'I morgen kan du lære mer om vennen din!',
  al_reise: 'Den er på reise til varme land. Den kommer tilbake om våren.',   // v5c: a migrant's card in winter (fauna.js seasons)
  al_dvale: 'Den sover vintersøvn. Den våkner om våren.',                     // a hibernator's card in winter
}, { voices: [''] });
F.TPL.add('al_side', { text: 'Side {n}.', slots: { n: 'ALBUM_SIDE' } });
F.TPL.add('al_pagename', { text: '{p}', slots: { p: 'FAUNA_PAGES' } });
F.TPL.add('al_ms', { text: 'Du har {n} dyrevenner!', slots: { n: 'MS_FRIENDS' } });
})();
