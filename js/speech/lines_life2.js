/* Feslottet – LIFE speech templates, Wave 2: Q17 Ny nabo, Q20 Jeg fryser!, Q21 Markedsdagen, Mia's bedtime story,
   ambient «life feel» lines (royals and staff busy with their own things). Registered at load time. Owner: LIFE. */
(function () {
'use strict';
const F = window.F;
const VIL = ['vm', 'vk', 'barn'];
const A = (map, voices) => F.TPL.addAll(map, { voices });

/* Q17 «Ny nabo» (villager voices) */
A({
  q17_intro: 'Her er det plass til et hus. Kan du trylle et hus?',
  q17_s2: 'Hvem skal bo i huset? Skriv navnet!',
  q17_done: 'Velkommen, ny nabo! Tusen takk!',
}, VIL);
/* narrator */
A({
  q17_flytt: 'En ny nabo flytter inn!',
  q21_done: 'For en markedsdag! Alle fikk handle.',
  q_story_puff: 'Mia vil høre en godnatthistorie. Fly til Mia!',
  kp_q17: 'En ny nabo flyttet inn.',
  kp_q20: 'Feen hjalp en som frøs.',
  kp_q21: 'Det var markedsdag ved slottet.',
}, ['']);
/* Mia's bedtime story */
A({
  q_story_ask: 'Kan du lese en godnatthistorie for meg?',
  q_story_mer: 'Les mer!',
  q_story_takk: 'For en fin historie. God natt!',
  // v5c WP-Q: one listening story (F78) or story-picture order (F79) may come into the bedtime story
  q_story_hor: 'Nå forteller jeg en historie. Hør godt etter!',
  q_story_bilder: 'Se på bildene fra historien!',
}, ['mia']);

/* ambient lines – only when the fairy is close and nothing else is speaking */
A({ life_amb_konge: ['Snork … Hva? Jeg sov ikke!', 'Snork … kake … snork.'] }, ['konge']);
A({ life_amb_dronning: ['Rosene mine trenger vann.', 'Så fint de blomstrer!'] }, ['dronning']);
A({ life_amb_kokk: ['Suppa er snart ferdig!', 'Litt salt, litt kjærlighet.'] }, ['kokk']);
A({ life_amb_mia: ['Se, så høyt den hopper!', 'Vi leker sammen!'] }, ['mia']);
A({ life_amb_rolf: ['Én maske, to masker …', 'Skjerfet blir langt!'] }, ['rolf']);
A({ life_amb_siv: ['Hysj! Jeg leser en god bok.'] }, ['siv']);
A({ life_amb_tor: ['Blomstene vokser så fint.'] }, ['tor']);
A({ life_amb_per: ['Brev, brev og enda flere brev!'] }, ['per']);
/* ---------------------------------------------------------- v3 WP6 (DESIGN3 §6): helping missions, pocket money, villager talk
   11 home voices (konge dronning mia kokk tor per siv rolf vm vk barn); kingdom royals use WP4's own ids. No slots, never the answer. */
const HOME = (F.LIFE_VOICES && F.LIFE_VOICES.ALL) || ['konge', 'dronning', 'mia', 'kokk', 'tor', 'per', 'siv', 'rolf', 'vm', 'vk', 'barn'];
A({
  life_h_lapp: ['Her er ønskelappen min. Hva står det?', 'Kan du lese lappen min?'],
  life_h_tell: ['Kan du telle opp til meg?', 'Nå skal vi telle!'],
  life_h_skriv: ['Kan du skrive navnet på pakken?', 'Skriv det på lappen, så husker jeg det.'],
  life_h_tall: ['Kan du finne riktig tall?', 'Hvilket tall er det?'],
  life_h_ferdig: ['Nå har jeg alt jeg trenger!', 'Du hjalp meg med alt!'],
  life_h_gave: 'Den skal du få av meg!',
  life_h_annet: 'Det fikk jeg i stad! Kan du trylle noe annet?',
  life_c_resten: ['Hvor mange mynter mangler jeg?', 'Kan du gi meg resten?'],
  // v5 WP-W (logic #3 / §3-C): the step line follows the format actually served (no slots, never the answer)
  life_h_skilt: 'Kan du lese skiltet for meg?',
  life_h_krukke: 'Hvilken krukke er det?',
  life_h_les: 'Kan du lese dette for meg?',
  life_h_tallapp: 'Kan du skrive tallet på lappen?',
  life_h_pris: 'Kan du lage prislappen?',
  life_h_dor: 'Kan du finne huset?',
}, HOME);
/* v5c WP-Q (DESIGN5 §10): story slots – a quest step may be served by any story-compatible format across strands; when the served
   format is not the one the written step line describes, the giver says a generic line (no slots, never the answer) */
A({ life_h_hjelp: ['Kan du hjelpe meg med dette?', 'Se her! Kan du hjelpe meg?'] }, HOME);
A({ q15_intro2: 'Sauene mine har rømt! Kan du hjelpe meg?' }, VIL);
A({ q19_s2b: 'Kan du hjelpe meg med tårnet?' }, ['konge']);
/* narrator: Q3 – Per's letter at the mailbox is a story to listen to (F78) or a set of pictures to put in order (F79) */
A({ q_brev_hor: 'Brevet forteller en historie. Hør godt etter!', q_brev_bilder: 'Det er bilder i brevet!' }, ['']);
/* narrator: steps of a helping mission */
A({ h_steg: 'Neste steg!', h_to: 'To steg til!', h_siste: 'Nå er det siste steg!' }, ['']);   // v5 WP-W #20: «Ett steg til» was said with 2+ left
/* personal lines (own voice; a hello = ONE of these, no-repeat pool; Rolf's q_rolf, Siv's q_siv, Tor's q6_tor join their pools)
   natural audit D5 / §3 #36: characters talk like characters – no counting quirks («Jeg teller … hver morgen», «… ti masker til»,
   «Jeg kan telle til tjue!»), no reading lessons («Når du kan lese …», «… bøker med korte ord», «Husnumrene hjelper meg …»), no
   «Vil du leke med meg?» without a real game. New lines from the audit's proposals (audio: lead). */
A({ life_p_tor: ['Se, tomatene mine blir røde!', 'Sneglene har spist av salaten min igjen!'] }, ['tor']);
A({ life_p_per: ['Jeg har brev til hele landsbyen!', 'Uff, sekken er så tung i dag!'] }, ['per']);
A({ life_p_siv: ['Hysj! Jeg er på det mest spennende stedet i boka.', 'Denne boka handler om en drage som er redd for mus!'] }, ['siv']);
A({ life_p_rolf: ['En ridder kan også strikke!', 'Nå er skjerfet lengre enn meg!'] }, ['rolf']);
A({ life_p_kokk: ['Jeg baker boller hver morgen.', 'Smak, smak! Mangler det salt?'] }, ['kokk']);
A({ life_p_vm: ['For en fin dag!', 'Jeg skal på markedet i dag.'] }, ['vm']);
A({ life_p_vk: ['Så fin staven din er!', 'Har du sett dyrene i parken?'] }, ['vk']);
A({ life_p_barn: ['Se hvor høyt jeg kan hoppe!', 'Jeg mistet tanna mi i dag!'] }, ['barn']);
})();
