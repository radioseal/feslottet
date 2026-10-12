/* Feslottet – speech templates of the clarity plan (12.10.2026, _dev/reports/clarity_plan.md §7). Owner: firsts (FI).
   Only NEW ids live here: the lines of the first-time cues (js/game/firsts.js) and the new lines of owners that have no lines file of
   their own tonight. Rewrites of existing ids (trav_selv, onb_fly_again, onb_env, hud_trail_go, kit_gate_intro) are made IN PLACE by
   the owner of their lines file – never re-added here (a second F.TPL.add of an id overwrites it and warns).
   Who calls what (§3.0 owners; every id below is free for the named owner to call – nobody else needs to):
     firsts.js (FI)   first_kart, first_funnet, life_first_hjelp (the villager's own voice), st_forst (the customer's own voice),
                      q_tilbake_konge / q_tilbake_dronning / q_tilbake_mia / q_tilbake (the 'tilbake' cue; Puff)
     hud.js (H)       hud_ride, hud_sug_hjelp, hud_sug_glitter, hud_sug_lys, hud_sug_stav, q_tilbake_<giver> / q_tilbake (Puff's answer
                      in the goal's 'back' state)
     tower.js (O)     realm_lyset_forst (the day-1 look at the light; guard with F.First.seen('beam') / F.First.mark('beam'))
     onboard.js (O)   onb_puff
     quests.js (Q)    q_hei (konge / dronning / mia), q1_ask, q5_ask, q10_ask, q19_ask (the giver's voice), brev_<qid> (the giver's voice
                      when the letter is read: F.SAY('brev_' + qid, {}, who))
   Once-ever bookkeeping: hearing realm_lyset_forst, life_first_hjelp, hud_sug_hjelp, fa_new, q_tilbake*, first_kart, first_funnet or
   st_forst from ANY caller marks its first-time key as seen (firsts.js reads F.TPL.log), so a signal is never explained twice.
   Voices: '' = Puff (narrator). Character lines are first person and are only ever said in the voices declared here. */
(function () {
'use strict';
const F = window.F;
const add = (map, voices) => { for (const id in map) if (!F.TPL.has(id)) F.TPL.add(id, { text: map[id], voices }); };
const L = F.LIFE_VOICES || {};
const STAFF = L.STAFF || ['kokk', 'tor', 'per', 'siv', 'rolf'], VIL = L.VIL || ['vm', 'vk', 'barn'];

/* ---------------------------------------------------------- Puff (narrator) */
add({
  // first-time cues (firsts.js §6) and the day-1 look (tower.js)
  realm_lyset_forst: 'Se lyset! Der borte ligger et slott du ikke har funnet ennå.',
  first_funnet: 'Nå kan jeg fly deg hit. Bare trykk på kartet!',
  first_kart: 'Her er du!',
  q_tilbake_konge: 'Fly tilbake til kongen!',
  q_tilbake_dronning: 'Fly tilbake til dronningen!',
  q_tilbake_mia: 'Fly tilbake til Mia!',
  q_tilbake: 'Fly tilbake og fortell det!',
  // onboarding: the Puff step (§4 step 10)
  onb_puff: 'Trykk på meg, så viser jeg vei!',
  // Puff's answers outside tasks (§5): every answer has a destination
  hud_ride: 'Hopp på, så flyr vi!',
  hud_sug_hjelp: 'Se, der er noen som trenger hjelp!',
  hud_sug_glitter: 'Se, det glitrer der borte!',
  hud_sug_lys: 'Fly mot lyset, så finner du et nytt slott!',
  hud_sug_stav: 'Prøv staven!',
}, ['']);

/* ---------------------------------------------------------- characters (first person, their own voices) */
// a white bubble, the first time ever: the villager / staff member says it as she comes near (firsts.js 'hjelp_boble')
add({ life_first_hjelp: 'Hei! Kan du hjelpe meg?' }, VIL.concat(STAFF.filter(v => !VIL.includes(v))));
// the first customer at her stall ever (firsts.js 'bod')
add({ st_forst: 'Hei! Er dette boden din? Jeg vil gjerne kjøpe noe!' }, VIL.slice());
// a letter quest's giver when she arrives (step 0's sayL, §3.1.4): the premise was already said by the letter
add({ q_hei: 'Der er du!' }, ['konge', 'dronning', 'mia']);
add({ q1_ask: 'Kan du trylle noe å spise?', q19_ask: 'Kan du trylle noe fint til meg?' }, ['konge']);
add({ q5_ask: 'Kan du skrive handlelista mi?' }, ['dronning']);
add({ q10_ask: 'Kan du rette ordet mitt?' }, ['mia']);
// the letter itself, in the giver's voice when the card is read (§3.1.3)
add({
  brev_Q1: 'Jeg er så sulten! Kom til slottet, er du snill.',
  brev_Q2: 'Krona mi er borte! Kan du hjelpe meg å finne den?',
  brev_Q12: 'Kongeposten har kommet! Vil du lese den for meg?',
  brev_Q19: 'Jeg vil ha noe nytt på hodet! Kom til slottet.',
}, ['konge']);
add({
  brev_Q5: 'Jeg skal ha teselskap! Hjelper du meg med handlelista?',
  brev_Q6: 'Rosene mine visner! Kom til slottet, er du snill.',
  brev_Q11: 'Snart er det ball på slottet! Hjelper du meg å pynte?',
}, ['dronning']);
add({
  brev_Q4: 'Det er bursdagen min! Kommer du på festen?',
  brev_Q7: 'Jeg sparer til noe fint. Kom og se!',
  brev_Q10: 'Blyanten min skriver feil ord! Kom og hjelp meg.',
}, ['mia']);
})();
