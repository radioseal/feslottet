/* Feslottet – speech templates for WP-G: F60 Klosstårnet (FORM G4–G6) and F65 Figurjakten (FORM G1). Owner: WP-G.
   Pure data. Rules (SYNTHESIS §6.6): numbers stay on the objects (deictic speech; a count is never said before she answers – her own
   total in a look-back reuses num_det_ble, counting together in a solution reuses core_num); ≤ 2 slots, each a finite set declared
   here as whole sentences (no chained colour words); no task answer in a carrier line (the shape name / instruction IS the stimulus);
   narrator voice '' only. Sentences for the position words come from F.SPACE.sentence(ins) – keep the two in step. */
(function () {
'use strict';
const F = window.F = window.F || {};
const SETS = F.SETS = F.SETS || {};

/* ---------------------------------------------------------- finite sets (owned by WP-G) */
// F65: one whole sentence per shape kind (grammar differs per word)
SETS.SP_ALLE = SETS.SP_ALLE || ['Trykk på alle trekantene', 'Trykk på alle firkantene', 'Trykk på alle sirklene', 'Trykk på alle kvadratene', 'Trykk på alle rektanglene'];
SETS.SP_FANT = SETS.SP_FANT || ['Hvor mange trekanter fant du', 'Hvor mange firkanter fant du', 'Hvor mange sirkler fant du', 'Hvor mange kvadrater fant du', 'Hvor mange rektangler fant du'];
SETS.SP_SER = SETS.SP_SER || ['Hvor mange trekanter ser du', 'Hvor mange firkanter ser du', 'Hvor mange sirkler ser du', 'Hvor mange kvadrater ser du', 'Hvor mange rektangler ser du'];
SETS.SP_FAKTA = SETS.SP_FAKTA || ['En trekant har tre rette sider og tre hjørner', 'En firkant har fire rette sider og fire hjørner',
  'En sirkel er helt rund og har ingen hjørner', 'Et kvadrat har fire like lange sider og fire rette hjørner',
  'Et rektangel har fire rette hjørner, og to og to sider er like lange'];
// F60 G4: «Legg den røde klossen oppå den blå» – every ordered colour pair per position word (4 colours → 12 sentences each); v5r: the
// second colour is definite too («oppå den gule», never «den gul») – f_space.js sentence() / statement() must build the same strings
const COL = ['rød', 'blå', 'gul', 'grønn'], DEF = { 'rød': 'røde', 'blå': 'blå', gul: 'gule', 'grønn': 'grønne' };
const REL = { OPPAA: 'oppå', FORAN: 'foran', BAK: 'bak', VENSTRE: 'til venstre for', HOYRE: 'til høyre for' };
for (const k in REL) {
  const name = 'SP_LEGG_' + k;
  SETS[name] = SETS[name] || COL.flatMap(a => COL.filter(b => b !== a).map(b => `Legg den ${DEF[a]} klossen ${REL[k]} den ${DEF[b]}`));
}
// F60 G4 «finn feil ord»: «Den røde klossen er oppå den blå» – every ordered colour pair per position word (6 × 12 sentences)
const ER = { OPPAA: 'oppå', UNDER: 'under', FORAN: 'foran', BAK: 'bak', VENSTRE: 'til venstre for', HOYRE: 'til høyre for' };
for (const k in ER) {
  const name = 'SP_ER_' + k;
  SETS[name] = SETS[name] || COL.flatMap(a => COL.filter(b => b !== a).map(b => `Den ${DEF[a]} klossen er ${ER[k]} den ${DEF[b]}`));
}
SETS.SP_ORD = SETS.SP_ORD || ['Oppå', 'Under', 'Foran', 'Bak', 'Til venstre for', 'Til høyre for'];
SETS.SP_RAD = SETS.SP_RAD || ['Sett to klosser ved siden av hverandre', 'Sett tre klosser ved siden av hverandre', 'Sett fire klosser ved siden av hverandre'];
SETS.SP_RAD_TOPP = SETS.SP_RAD_TOPP || ['Legg én kloss oppå den til venstre', 'Legg én kloss oppå den til høyre', 'Legg én kloss oppå den i midten'];

F.TPL.addAll({
  /* ---------------------------------------------------------- F65 Figurjakten (G1) */
  sp_f65_slott: ['Slottet har vinduer i mange former.', 'Se på alle vinduene i slottet!'],
  sp_f65_marked: ['Bakeren har bakt kaker i mange former.', 'Se på alle kakene på disken!'],
  sp_alle: { text: '{s}.', slots: { s: 'SP_ALLE' } },
  sp_f65_fant: { text: '{s}?', slots: { s: 'SP_FANT' } },
  sp_f65_ser: { text: '{s}?', slots: { s: 'SP_SER' } },
  sp_fakta: { text: '{s}.', slots: { s: 'SP_FAKTA' } },
  sp_f65_hjorner: ['Se på hjørnene til hver form.', 'Tell hjørnene på hver form.'],
  sp_f65_snudd: ['Snudde og smale former teller også!', 'Se godt etter. Noen er snudd, og noen er smale.'],
  sp_f65_rette: 'Se på sidene. Er alle sidene rette?',
  sp_f65_like: 'Se på sidene. Er alle sidene like lange?',
  sp_f65_hj_rette: 'Se på hjørnene. Er alle hjørnene rette?',
  sp_f65_merk: 'Du kan trykke på dem du har talt.',
  sp_f65_en_og_en: ['Se på formene, én og én.', 'Ta én form om gangen.'],
  sp_f65_lb: ['Se på dem du valgte.', 'Se, disse valgte du.'],
  sp_f65_ok: ['For en formjeger!', 'Du har skarpe øyne!', 'Du fant dem!'],

  /* ---------------------------------------------------------- F60 Klosstårnet: count (G5) */
  sp_f60_tell: ['Hvor mange klosser er det?', 'Hvor mange klosser har byggmesteren brukt?'],
  sp_f60_snu: 'Du kan snu byggverket med pilene.',
  sp_f60_gjem: 'Noen klosser kan gjemme seg bak de andre.',
  sp_f60_lag: ['Tell ett lag om gangen.', 'Se på hvert lag for seg.'],
  sp_f60_alle_lag: 'Tell klossene i alle lagene, ikke bare de øverste.',
  sp_f60_bak: 'Snu det rundt, og se bak.',
  sp_f60_under: 'En kloss kan ikke sveve. Den står alltid på noe.',
  sp_f60_okt: ['Riktig telt!', 'Du fant alle klossene!', 'Ingen kloss slapp unna!'],

  /* ---------------------------------------------------------- F60: copy (G6) and build a row (G4) */
  sp_f60_bygg: ['Bygg et byggverk som er helt likt!', 'Kan du bygge det samme?'],
  sp_f60_trykk: 'Trykk på en rute for å legge på en kloss.',
  sp_f60_andre: 'Her ser du det fra en annen side.',
  sp_f60_nederst: ['Begynn med det nederste laget.', 'Bygg ett lag om gangen. Først det nederste.'],
  sp_f60_speil: 'Se godt. Ditt er snudd som i et speil.',
  sp_f60_lb_bygg: ['Se på lagene i begge byggverkene.', 'Se, nå løfter vi lagene fra hverandre.'],
  sp_rad: { text: '{s}.', slots: { s: 'SP_RAD' } },
  sp_rad_topp: { text: '{s}.', slots: { s: 'SP_RAD_TOPP' } },

  /* ---------------------------------------------------------- F60: position words (G4) */
  sp_f60_legg: ['Byggmesteren trenger hjelp!', 'Hør godt etter hvor klossene skal stå.'],
  sp_legg_oppaa: { text: '{p}.', slots: { p: 'SP_LEGG_OPPAA' } },
  sp_legg_foran: { text: '{p}.', slots: { p: 'SP_LEGG_FORAN' } },
  sp_legg_bak: { text: '{p}.', slots: { p: 'SP_LEGG_BAK' } },
  sp_legg_venstre: { text: '{p}.', slots: { p: 'SP_LEGG_VENSTRE' } },
  sp_legg_hoyre: { text: '{p}.', slots: { p: 'SP_LEGG_HOYRE' } },
  sp_f60_tapp: 'Trykk på klossen nede, og så der den skal stå.',
  sp_f60_hor: 'Hør en gang til.',
  sp_f60_hand: 'Venstre og høyre er som dine egne hender.',
  sp_f60_her_la: ['Se hvor du la klossene.', 'Se, sånn bygde du.'],
  sp_f60_ok: ['For et flott byggverk!', 'Byggmesteren er fornøyd!', 'Akkurat riktig bygget!'],

  /* ---------------------------------------------------------- F60: «finn feil ord» (G4) */
  sp_feil_intro: ['Puff forteller om byggverket. Men én setning er feil!', 'Hør godt etter. Én av setningene stemmer ikke.'],
  sp_feil_hvilken: 'Hvilken setning er feil? Trykk på den.',
  sp_er_oppaa: { text: '{p}.', slots: { p: 'SP_ER_OPPAA' } },
  sp_er_under: { text: '{p}.', slots: { p: 'SP_ER_UNDER' } },
  sp_er_foran: { text: '{p}.', slots: { p: 'SP_ER_FORAN' } },
  sp_er_bak: { text: '{p}.', slots: { p: 'SP_ER_BAK' } },
  sp_er_venstre: { text: '{p}.', slots: { p: 'SP_ER_VENSTRE' } },
  sp_er_hoyre: { text: '{p}.', slots: { p: 'SP_ER_HOYRE' } },
  sp_feil_ord: 'Hvilket ord skulle Puff ha sagt?',
  sp_ord: { text: '{s}.', slots: { s: 'SP_ORD' } },
  sp_feil_se: ['Se på klossene som setningen snakker om.', 'Se godt på klossene som lyser.'],
  sp_feil_ok: ['Nå stemmer det!', 'Riktig ord!', 'Du fant feilen!'],

  /* ---------------------------------------------------------- solution steps (2nd error: she carries it out) */
  sp_sol_bygg: 'Bygg der de lyse klossene står.',
  sp_sol_legg: 'Legg klossen der det lyser.',
});
})();
