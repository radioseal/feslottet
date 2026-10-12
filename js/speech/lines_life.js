/* Feslottet – LIFE speech templates (actors, economy, shops, stall, quests, envelopes, Kongeposten). Registered at load time.
   Voices: royals konge/dronning/mia, staff kokk/tor/per/siv/rolf, villagers vm/vk/barn, narrator/Puff ''.
   Number speech in a character's own voice: 'life_n' (1–20) and 'life_n10' (30–100, royals) – used for counting coins aloud.
   Carriers for chaining («Jeg har» + 14, «Den koster» + 17): 'life_c_har', 'life_c_koster'. */
(function () {
'use strict';
const F = window.F;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
F.SETS.TENS_30_100 = [30, 40, 50, 60, 70, 80, 90, 100];
F.SETS.LIFE_ENVWORDS = ['kake', 'krone', 'brev', 'fest', 'liste', 'rose', 'gris', 'egg', 'bok', 'feil', 'ball', 'hus', 'lys', 'sau', 'bro', 'nabo', 'hatt', 'lue', 'avis', 'flagg'];
const ROY = ['konge', 'dronning', 'mia'], STAFF = ['kokk', 'tor', 'per', 'siv', 'rolf'], VIL = ['vm', 'vk', 'barn'];
const ALL = ROY.concat(STAFF, VIL);
F.LIFE_VOICES = { ROY, STAFF, VIL, ALL };
const A = (map, voices) => F.TPL.addAll(map, { voices });

/* ---------------------------------------------------------- characters (every NPC voice) */
A({
  life_hei: ['Hei!', 'Hei, lille fe!', 'Så fint å se deg!'],
  life_takk: ['Tusen takk!', 'Å, takk skal du ha!'],
  life_nam: ['Så godt!', 'Nydelig!'],
  life_fin: ['Se på meg! Er jeg fin?', 'Det passer perfekt!'],   // v5 WP-W (logic #38): «Den» was wrong for plural things (sko, vinger)
  life_gøy: ['Så gøy!', 'Hurra, la oss leke!'],
  life_søt: ['Så søt den er!', 'Se, den liker meg!'],
  life_sitte: 'Ah, så deilig å sitte.',
  life_lukt: 'Å, det lukter godt!',
  life_varm: 'Ah, nå er jeg varm!',
  life_lys: 'Så fint lys!',
  life_ønske_den: 'Det ønsker jeg meg!',
  life_nok: 'Nå har jeg nok!',
  life_kjøper_den: 'Jeg går og kjøper det!',
  life_se: 'Se hva jeg kjøpte!',
  life_sparer: 'Takk! Jeg sparer videre.',
  life_ble: 'Ble det riktig?',
  life_feil: 'Oi, jeg telte feil! Jeg teller en gang til.',
  life_riktig: 'Ja, det ble riktig!',
  life_igår_gen: 'Takk for i går!',
  life_c_har: 'Jeg har',
  life_c_koster: 'Det koster',
  life_tom: 'Jeg har ingen mynter ennå.',
  life_kald: 'Huff, jeg fryser!',
  life_sulten: 'Jeg er så sulten!',
  life_trøtt: 'Jeg er så trøtt.',
  life_kjedelig: 'Jeg kjeder meg.',
}, ALL);
F.TPL.add('life_n', { text: '{n}', slots: { n: 'NUM_1_20' }, voices: ALL });
F.TPL.add('life_n10', { text: '{n}', slots: { n: 'TENS_30_100' }, voices: ROY });
// royals name the item (GIFTS = 30 wishable items)
F.TPL.add('life_ønske', { text: 'Jeg ønsker meg {item}.', slots: { item: 'GIFTS' }, voices: ROY });
F.TPL.add('life_kjøper', { text: 'Jeg går og kjøper {item}.', slots: { item: 'GIFTS' }, voices: ROY });
F.TPL.add('life_igår', { text: 'Jeg fikk {item} i går!', slots: { item: 'GIFTS' }, voices: ROY });
A({ life_ole: ['Hihi!', 'Ba-ba!'] }, ['barn']);

/* ---------------------------------------------------------- narrator / Puff */
A({
  life_an_pus: 'Pus maler. Purr, purr!',
  life_an_tass: 'Tass logrer med halen!',
  life_an_bris: 'Bris vrinsker glad!',
  life_an_pip: 'Pip, pip!',
  life_an_dyr: 'Den liker deg!',
  // natural audit D5: no narrator orders in the money ask / gift panel (life_gi_mynt, life_gi_gave, life_ingen_mynt are gone)
  eco_ikkenok: 'Du har ikke nok mynter ennå.',
  eco_spar: 'Nå sparer du til det!',
  eco_kurv: 'Puff legger det i kurven.',
  eco_garderobe: 'Se i garderoben din!',
  eco_tomt: 'Velg en plass, så bygger vi det!',
  eco_rom: 'Se i rommet ditt!',
  eco_kjæledyr: 'Nå har du et nytt kjæledyr!',
  eco_magi: 'Nye trylleord i staven!',
  eco_velg: 'Hva vil du sette her?',
  eco_slottom: 'Her er det plass til noe fint fra butikken!',
}, ['']);
F.TPL.add('eco_duhar', { text: 'Du har {n}.', slots: { n: 'NUM_0_100' }, voices: [''] });
F.TPL.add('eco_kjøpt', { text: 'Du kjøpte {item}!', slots: { item: 'ITEMS' }, voices: [''] });
// shopkeepers (vm / vk) + narrator
F.TPL.add('eco_koster', { text: 'Det koster {n}.', slots: { n: 'PRICE' }, voices: ['', 'vm', 'vk'] });
F.TPL.add('eco_velkommen', { text: 'Velkommen til {shop}!', slots: { shop: 'SHOPNAMES' }, voices: ['vm', 'vk'] });
A({ eco_vsg: ['Vær så god!', 'Takk for handelen!'] }, ['vm', 'vk']);

/* ---------------------------------------------------------- her stall «Feens bod» */
F.TPL.add('st_order', { text: 'Kan jeg få {n} {goods}?', slots: { n: 'NUM_10_20', goods: 'GOODS_PL' }, voices: VIL });
A({ st_takk: 'Takk! Her er myntene.', st_hei: 'Hei! Hva selger du i dag?' }, VIL);
// economy §2 (12.10): magic is not for sale – the empty stall points at what really stocks it (the hens' eggs)
A({ st_open: 'Kundene kommer til boden din!', st_tom: 'Boden er tom. Hent egg hos hønene!', st_nok: 'Boden er utsolgt. Så flink du er!' }, ['']);
// economy §1 row 24 / §7.3: a customer after an answer that was not first-try right buys nothing and comes back another time
for (const v of [['st_senere', 'Jeg kommer tilbake senere!']]) if (!F.TPL.has(v[0])) F.TPL.add(v[0], { text: v[1], voices: VIL });

/* ---------------------------------------------------------- quests, play rhythm, envelopes */
A({
  // natural audit §3 #24 / D5: the play break is silent (q_playbreak gone), the frustration rain has no «Prøv staven!» order (q_staven gone)
  q_post: 'Pip har med post til deg!',
  q_hva_står: 'Hva står det?',
  q_fra_konge: 'Et brev fra kongen!',
  q_fra_dronning: 'Et brev fra dronningen!',
  q_fra_mia: 'Et brev fra Mia!',
  q_fly_konge: 'Fly til kongen!',
  q_fly_dronning: 'Fly til dronningen!',
  q_fly_mia: 'Fly til Mia!',
  q_markedsdag: 'I dag er det markedsdag! Alle skal handle.',
  q_godnatt: 'Nå skal alle i slottet sove.',
  q_senere: 'Vi kan fortsette senere.',
  q_bra: ['Så bra!', 'Du er flink!'],
  q2_bad0: 'Lappen sier bad. Finn badet!',
  q2_seng0: 'Lappen sier seng. Finn kongens seng!',
  q3_landsby: 'Fly til landsbyen med brevet!',
  q5_marked: 'Fly til markedet!',
}, ['']);
// economy §1 row 8: q_coins «Du får {n} mynter!» is retired (the coins fly from the giver); clarity §7: q_stjerne is retired (the thing
// wears a gold bubble)
// v5 WP-W (logic #46/#48): the real room number of the plan (WP-X renumbers rooms per floor); «Kongens seng står i …» (he is not asleep)
if (!F.SETS.ROOM_NUMS) F.SETS.ROOM_NUMS = Array.from({ length: 30 }, (_, i) => i + 1);
F.TPL.add('q2_bad', { text: 'Badet er rom {n}. Ta heisen!', slots: { n: 'ROOM_NUMS' }, voices: [''] });
F.TPL.add('q2_seng', { text: 'Kongens seng står i rom {n}.', slots: { n: 'ROOM_NUMS' }, voices: [''] });
F.TPL.add('q_word', { text: '{w}', slots: { w: 'LIFE_ENVWORDS' }, voices: [''] });

A({
  q1_intro: 'Å, jeg er så sulten! Kan du trylle noe å spise?',
  q1_s2: 'Nå kommer gjestene! Kan du hjelpe meg?',
  q1_s3: 'Trykk på bordet, så spiser vi!',
  q1_done: 'Så godt! Takk, lille fe!',
  q2_intro: 'Å nei! Krona mi er borte! Kan du hjelpe meg?',
  q2_lapp: 'Her er en lapp. Hva står det?',
  q2_found: 'Krona mi! Tusen takk!',
  q2_done: 'Oi, nå glir den igjen!',
}, ['konge']);
A({
  q3_intro: 'Jeg har brev til landsbyen. Vil du hjelpe meg?',
  q3_done: 'Tusen takk for hjelpen!',
}, ['per']);
A({
  q4_intro: 'I dag har jeg bursdag! Vil du hjelpe meg med festen?',
  q4_s1: 'Kan du hjelpe meg med kaka?',
  q4_s2: 'Kan du skrive fest?',
  q4_s2b: 'Kan du skrive et ord på banneret?',
  q4_s3: 'Trykk på kaka!',
  q4_done: 'Hurra! Takk for den fine festen!',
  q7_intro: 'Jeg sparer! Hjelper du meg?',
  q7_s2: 'Kan du hjelpe meg litt til?',
  // natural audit D5: Mia saves her own money – q7_s3 «Vil du gi meg litt lommepenger?» is gone
  q7_done: 'Jeg skal spare enda mer!',
}, ['mia']);
A({
  q5_intro: 'Jeg skal ha teselskap. Vil du skrive handlelista mi?',
  q5_done: 'For et fint teselskap! Takk!',
  q6_intro: 'Rosehagen min trenger nye roser. Vil du hjelpe meg?',
  q6_s2: 'Kan du hjelpe meg litt til?',
  q6_done: 'Så vakkert! Takk, lille fe!',
}, ['dronning']);
A({
  q8_intro: 'Jeg skal lage pannekaker! Hjelper du meg?',
  q8_s1: 'Hent krukka jeg trenger!',
  q8_s2: 'Nå trenger jeg egg!',
  q8_done: 'Se, et pannekaketårn! Takk!',
}, ['kokk']);
A({ q6_tor: 'Rosene trenger vann og sol.' }, ['tor']);
A({ q_rolf: 'Jeg strikker et skjerf. Det blir langt!' }, ['rolf']);
A({ q_siv: 'Hysj! I biblioteket er vi stille.' }, ['siv']);

/* ---------------------------------------------------------- clarity P1 (12.10, owner «quests»): the letter asks, the giver greets
   Guarded (add only when missing): lines_clarity.js may carry the same ids with the same texts. */
const A1 = (map, voices) => { for (const id in map) if (!F.TPL.has(id)) F.TPL.add(id, { text: map[id], voices }); };
// in person, after a letter: the premise was in the letter, so the giver greets and asks (step.sayL)
A1({ q_hei: 'Der er du!' }, ROY);
// (verify 2nd round) no q1_ask / q19_ask / q5_ask / q10_ask: the step's task asks by itself («Jeg er så sulten!» + «Skriv noe som kan
// hjelpe!», «Skriv handlelista mi!», «Jeg skrev et ord. Er det riktig?») – the giver only greets
// the letter itself, in the giver's own voice (after the card word): brev_<quest>
A1({ brev_Q1: 'Jeg er så sulten! Kom til slottet, er du snill.', brev_Q2: 'Krona mi er borte! Kan du hjelpe meg å finne den?',
  brev_Q12: 'Kongeposten har kommet! Vil du lese den for meg?', brev_Q19: 'Jeg vil ha noe nytt på hodet! Kom til slottet.' }, ['konge']);
A1({ brev_Q5: 'Jeg skal ha teselskap! Hjelper du meg med handlelista?', brev_Q6: 'Rosene mine visner! Kom til slottet, er du snill.',
  brev_Q11: 'Snart er det ball på slottet! Hjelper du meg å pynte?' }, ['dronning']);
A1({ brev_Q4: 'Det er bursdagen min! Kommer du på festen?', brev_Q7: 'Jeg sparer til noe fint. Kom og se!',
  brev_Q10: 'Blyanten min skriver feil ord! Kom og hjelp meg.' }, ['mia']);
// Puff: the work is done, the giver is waiting (the goal card's ✓ – Puff's answer and the once-ever cue)
A1({ q_tilbake_konge: 'Fly tilbake til kongen!', q_tilbake_dronning: 'Fly tilbake til dronningen!', q_tilbake_mia: 'Fly tilbake til Mia!',
  q_tilbake: 'Fly tilbake og fortell det!' }, ['']);
// the first customer ever at her stall (the once-ever cue «bod»)
A1({ st_forst: 'Hei! Er dette boden din? Jeg vil gjerne kjøpe noe!' }, VIL);

/* ---------------------------------------------------------- Kongeposten headlines (reading targets; narrator) */
F.TPL.add('kp_kjøpte', { text: '{royal} kjøpte {item}.', slots: { royal: 'ROYALS', item: 'GIFTS' }, voices: [''] });
F.TPL.add('kp_trylla', { text: 'Feen tryllet {n} {goods}.', slots: { n: 'NUM_10_20', goods: 'GOODS_PL' }, voices: [''] });
F.SETS.NUM_2_20 = F.SETS.NUM_2_20 || F.SETS.NUM_1_20.filter(n => n >= 2);
F.TPL.add('kp_gris', { text: 'Mia har {n} mynter i grisen.', slots: { n: 'NUM_2_20' }, voices: [''] });
A({ kp_gris1: 'Mia har 1 mynt i grisen.', kp_grismange: 'Mia har mange mynter i grisen!' }, ['']);
// v5 WP-W (logic #6): a character never goes silent on a number above its clips
A({ life_mange: 'Jeg har mange!' }, ALL);
F.TPL.add('kp_olefikk', { text: 'Ole fikk {item}.', slots: { item: 'GIFTS' }, voices: [''] });
F.TPL.add('kp_nabo', { text: 'Ny nabo: {name}!', slots: { name: 'NAMES' }, voices: [''] });
A({
  kp_q1: 'Kongen fikk kake.', kp_q2: 'Kongen fant krona si.', kp_q3: 'Posten kom fram.', kp_q4: 'Mia hadde bursdag.',
  kp_q5: 'Dronningen hadde teselskap.', kp_q6: 'Rosehagen fikk nye roser.', kp_q7: 'Mia sparer mynter.', kp_q8: 'Kokken laget pannekaker.',
  kp_solgte: 'Feen solgte ting i boden.', kp_handlet: 'Feen handlet på markedet.', kp_gave: 'Feen ga bort en gave.',
  kp_m1: 'Kongen mistet krona igjen.', kp_m2: 'Pus sov hele dagen.', kp_m3: 'Tass gravde i hagen.', kp_m4: 'Dronningen drakk te.',
  kp_m5: 'Ridder Rolf strikket et skjerf.', kp_m6: 'Ole sa et nytt ord.', kp_m7: 'Sola skinte over slottet.',
  kp_f1: 'Kongen kunne fly.', kp_f2: 'Det regnet sjokolade.', kp_f3: 'Bris spiste en sko.', kp_f4: 'Pus kjørte buss.',
  kp_f5: 'Slottet ble blått.', kp_f6: 'Dronningen bodde i et tre.', kp_f7: 'Tass leste en bok.', kp_f8: 'Mia var hundre år.',
}, ['']);
/* ---------------------------------------------------------- more quests (Q9–Q19) */
A({ q9_intro: 'Å nei, bøkene har falt ned! Hjelper du meg?', q9_s2: 'Kan du hjelpe meg litt til?', q9_done: 'Takk! Nå er biblioteket fint igjen.' }, ['siv']);
A({ q10_intro: 'Jeg skrev et ord, men noe ble feil. Hjelper du meg?', q10_s2: 'Her er ett ord til!', q10_done: 'Nå kan jeg skrive det riktig! Takk!' }, ['mia']);
A({ q11_intro: 'Snart er det ball! Vil du hjelpe meg?', q11_s2: 'Lysekrona trenger lys.', q11_s3: 'Kan du hjelpe meg litt til?', q11_done: 'For et vakkert ball!' }, ['dronning']);
A({ q12_intro: 'Les Kongeposten for meg!', q12_s2: 'Les en til!', q12_done: 'Ha ha! For en avis!',
  q19_intro: 'Jeg vil ha noe nytt å ha på meg!', q19_s2: 'Kan du trylle mange hatter til meg?', q19_done: 'Se på meg! Et hattetårn!' }, ['konge']);
A({ q18_intro: 'Vaktene skal gå i parade! Hjelper du meg?', q18_s2: 'Kan du hjelpe meg litt til?', q18_done: 'Bra! Nå marsjerer vi!' }, ['rolf']);
A({
  q13_intro: 'Jeg har mistet noe! Kan du hjelpe meg å finne det?', q13_done: 'Der var den! Tusen takk!',
  q14_intro: 'Jeg skal bake mange boller. Hjelper du meg?', q14_s2: 'Nå skal bollene ut til husene.', q14_done: 'Takk! Nå er bakeriet fullt!',
  q15_intro: 'Sauene mine har rømt! Kan du telle dem?', q15_s2: 'Kan du hjelpe meg litt til?', q15_done: 'Takk! Nå er alle sauene hjemme.',
  q16_intro: 'Jeg kommer ikke over vannet. Kan du hjelpe meg?', q16_done: 'Så flott! Nå kommer jeg over!',
}, VIL);
A({
  kp_q9: 'Biblioteket ble ryddig.', kp_q10: 'Mia lærte å skrive et ord.', kp_q11: 'Det var ball i slottet.', kp_q12: 'Kongen leste avisen.',
  kp_q13: 'En nabo fant noe som var borte.', kp_q14: 'Bakeren bakte mange boller.', kp_q15: 'Sauene kom hjem.', kp_q16: 'Naboen kom over vannet.',
  kp_q18: 'Vaktene gikk i parade.', kp_q19: 'Kongen fikk et hattetårn.',
}, ['']);
})();
