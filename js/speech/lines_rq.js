/* Feslottet – WP8 royal quests speech (DESIGN2 §7, §8.2; prefix rq_). Owner WP8. Registered at load time.
   Royals (rk1 rk2 rd1 rd2 barn) never voice task prompts – the narrator does. Every giver line is declared for all five royal
   voices, so any king, queen or child can say it. Budget (cap 170): giver lines 13 × 5 = 65, narrator steps 18,
   «Gå til {slott}!» 10, «Du er invitert til {slott}!» 10, «Kong Leo har et brev fra {slott}.» 10,
   «Nå er vi venner med {slott}!» narrator 10 + konge 10, «Stjerne {n} av tre!» 3, Kong Leo (konge) 2, Mia «Fortell om {slott}!» 10 (P1), Kongeposten «Feen hjalp {slott}.» 10 (P1)  → 158 (+3 two-sentence lines ≈ 161 clips).
   v3 (DESIGN3 §7, WP4): rq_g_vent_c/q/k + rq_g_les 4×5 = 20 (vent_c two sentences: +5), rq_n_trykk_k/q/p/ps 4, rq_oppg 3;
   rq_g_kode/skilt2/lapp 3×5 (two-sentence kode/lapp: +10), rq_n_lapp_feil 1; rq_g_vakt / rq_n_vakter reworded (regenerate 6). */
(function () {
'use strict';
const F = window.F;
const RV = ['rk1', 'rk2', 'rd1', 'rd2', 'barn'];
F.SETS.RQ_STARS = [1, 2, 3];

/* royal giver lines (one sentence per clip) */
F.TPL.addAll({
  rq_g_porten: 'Kan du lese skiltet på porten vår?',
  rq_g_fest: 'Vil du hjelpe meg med festen?',
  rq_g_rot: 'Å nei, jeg har rotet bort noe!',
  rq_g_skilt: 'Kan du skrive et ord til det nye skiltet?',
  rq_g_vakt: 'Kan du hjelpe vaktene med å stille seg på rekke?',
  rq_g_handle: 'Kan du kjøpe noe fint til meg i butikken?',
  rq_g_mynter: 'Her er noen mynter til deg.',
  rq_g_brev: 'Kan du ta med dette brevet til Kong Leo?',
  rq_g_mer: 'Så flink du er!',
  rq_g_fin: 'Å, så fint!',
  rq_g_funnet: 'Der var den jo!',
  rq_g_takk: 'Tusen takk for hjelpen!',
  rq_g_stjerne: 'Her er en stjerne til deg!',
  // v3 (DESIGN3 §7.3, §7.6, WP4)
  rq_g_vent_c: 'Gå til porten først! Der er det et skilt.',
  rq_g_vent_q: 'Dronningen trenger hjelp nå. Gå til henne!',
  rq_g_vent_k: 'Kongen trenger hjelp nå. Gå til ham!',
  rq_g_les: 'Kan du lese noe for meg?',                                   // RQ1/RQ3 when the sign/note format has nothing at her rung
  // P2 extra steps (§7.6)
  rq_g_kode: 'Slottspasset ligger i kista. Kan du åpne kodelåsen?',          // F14 shows a chest («Kista gikk opp.») → the pass
  rq_g_skilt2: 'Det gamle skiltet mangler noen bokstaver.',
  rq_g_lapp: 'Her er handlelappen min. Hva skal du kjøpe?',
}, { voices: RV });

// v5 WP-X (#57): the kingdom's own child speaks of its parents (barn voice: 2 clips)
F.TPL.addAll({
  rq_g_vent_k_b: 'Pappa trenger hjelp nå. Gå til ham!',
  rq_g_vent_q_b: 'Mamma trenger hjelp nå. Gå til henne!',
}, { voices: ['barn'] });
// v5 WP-X (#10, #25): the giver line follows the format actually served; a forward-looking ask instead of the praise line rq_g_mer
F.TPL.addAll({
  rq_g_tall: 'Kan du hjelpe meg med tallene?',                           // RQ5 F18/F19, RQ1 code-lock alternatives (F15/F16)
  rq_g_enda: 'Har du lyst på en oppgave til?',                           // second task step (was «Så flink du er!» as an ask)
}, { voices: RV });
// v5c WP-Q: the giver names WHAT she helps with when a kingdom specialty / story-slot format is served (chosen after the item, never the
// answer): rq_s_<format>, all five royal voices (13 × 5 = 65 clips). Used by RQ.slotLines and royals.js (single task without an ask line)
F.TPL.addAll({
  rq_s_F74: 'Kan du hjelpe meg med blomsterbedet?',
  rq_s_F71: 'Kan du hjelpe meg å sortere tingene?',
  rq_s_F79: 'Kan du hjelpe meg med bildene?',
  rq_s_F52: 'Kan du hjelpe frosken med steinene?',
  rq_s_F44: 'Kan du hjelpe meg med tallbroen?',
  rq_s_F58: 'Kan du hjelpe meg med perlene?',
  rq_s_F48: 'Kan du hjelpe meg med bollene?',
  rq_s_F56: 'Kan du hjelpe meg med båndene?',
  rq_s_F46: 'Kan du hjelpe meg i krystallhulen?',
  rq_s_F60: 'Kan du hjelpe meg med klossene?',
  rq_s_F65: 'Kan du hjelpe meg å finne figurene?',
  rq_s_F21: 'Kan du hjelpe meg med musikken?',
  rq_s_F54: 'Kan du hjelpe meg med rullene mine?',
}, { voices: RV });
// v5c WP-Q: RQ3 – after the lost thing is found the mess is tidied with one task (sorting / ordering / the kingdom's specialty)
F.TPL.addAll({
  rq_g_rydde: 'Nå må vi rydde litt. Hjelper du meg?',
}, { voices: RV });
// v3 §7.3: a king or queen points her to the child who holds the next step (own voice)
F.TPL.addAll({
  rq_g_vent_p: 'Prinsen trenger hjelp nå. Gå til ham!',
  rq_g_vent_ps: 'Prinsessen trenger hjelp nå. Gå til henne!',
}, { voices: ['rk1', 'rk2', 'rd1', 'rd2'] });

/* narrator step lines */
F.TPL.addAll({
  rq_n_les: 'Les skiltet!',
  rq_n_tell: 'Tell festtingene!',
  rq_n_lapp: 'Kongen har en lapp til deg.',
  rq_n_inn: 'Gå inn i slottet og finn lappen!',
  rq_n_finn: 'Finn tingen med den gule stjernen!',
  rq_n_skriv: 'Skriv et ord til skiltet!',
  rq_n_skiltet: 'Se! Skiltet har ordet ditt!',
  rq_n_vakter: 'Hjelp vaktene med å stille seg på rekke!',
  rq_n_butikk: 'Gå til butikken i markedet!',
  rq_n_kurv: 'Ta det med til dronningen!',
  rq_n_brev: 'Fly hjem til Kong Leo med brevet!',
  rq_n_leo: 'Les brevet sammen med Kong Leo!',
  rq_n_pass: 'Du fikk et slottspass!',
  rq_n_pynt: 'Se, markedet er pyntet til fest!',
  rq_n_merket: 'Trykk på merket!',
  rq_n_kart: 'Der er slottet på kartet!',
  rq_n_fremme: 'Nå er du fremme!',
  rq_n_bruker: 'Dronningen bruker gaven din!',
  // v3 §7.3: the narrator says who to tap (first call per kingdom, or pointing to the family member who holds the step)
  rq_n_trykk_k: 'Trykk på kongen!',
  rq_n_trykk_q: 'Trykk på dronningen!',
  rq_n_trykk_p: 'Trykk på prinsen!',
  rq_n_trykk_ps: 'Trykk på prinsessen!',
  rq_n_lapp_feil: 'Det står noe annet på handlelappen.',                 // RQ6: she bought another thing than the note said
}, { voices: [''] });
// v3 §7.4 the royal audience: «Oppgave {n} av tre!» (n ∈ RQ_STARS 1–3)
F.TPL.add('rq_oppg', { text: 'Oppgave {n} av tre!', slots: { n: 'RQ_STARS' }, voices: [''] });

/* one slot (finite sets) */
F.TPL.add('rq_ga', { text: 'Gå til {slott}!', slots: { slott: 'REALMS' }, voices: [''] });
F.TPL.add('rq_inv', { text: 'Du er invitert til {slott}!', slots: { slott: 'REALMS' }, voices: [''] });
F.TPL.add('rq_leo_brev', { text: 'Kong Leo har et brev fra {slott}.', slots: { slott: 'REALMS' }, voices: [''] });
F.TPL.add('rq_venner', { text: 'Nå er vi venner med {slott}!', slots: { slott: 'REALMS' }, voices: ['', 'konge'] });
F.TPL.add('rq_stjerne', { text: 'Stjerne {n} av 3!', slots: { n: 'RQ_STARS' }, voices: [''] });

/* P1: Kongeposten headline about yesterday's royal quests (read in the F30 yes/no game; a false one uses another castle) */
F.TPL.add('rq_kp', { text: 'Feen hjalp {slott}.', slots: { slott: 'REALMS' }, voices: [''] });

/* P1: Mia at bedtime asks about a kingdom she visited today */
F.TPL.add('rq_mia_fortell', { text: 'Fortell om {slott}!', slots: { slott: 'REALMS' }, voices: ['mia'] });

/* Kong Leo at home (RQ7) */
F.TPL.addAll({
  rq_leo_hei: 'Et brev til meg? La oss lese det sammen!',
  rq_leo_hurra: 'Hurra! Vi har fått nye venner!',
}, { voices: ['konge'] });
})();
