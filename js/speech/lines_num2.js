/* Feslottet – speech templates for the v4 number formats F42–F49 (WP-N, DESIGN4 §1 / SYNTHESIS §3.2, §6.6). Pure data.
   Rules (SYNTHESIS §6.6): numbers stay ON objects (plaques, signs, the hundred board) and the speech is deictic («Hvor bor dette
   tallet?»). Only F42's T-NAVN prompt «Trykk på N!» hears a number – as ONE whole clip per number (0–100), and its digits are a
   secret the subtitle masks (hint_leaks C1). ≤ 2 slots, every slot a named finite set; narrator/Puff voice ('') only.
   No carrier line contains a task answer. sju / tjue forms. */
(function () {
'use strict';
const F = window.F = window.F || {};
const SETS = F.SETS = F.SETS || {};

/* ---------------------------------------------------------- bounded sets (owned by WP-N) */
// her own total in a look-back («Det ble 12.») – the same sentences as lines_num's num_det_ble (no new clips), our own set
SETS.N2_0_40 = SETS.N2_0_40 || Array.from({ length: 41 }, (_, i) => i);
// F42 moves on the hundred board (one clip each, «Gå én rad ned.»)
SETS.N2_MOVE = SETS.N2_MOVE || ['én rad ned', 'to rader ned', 'tre rader ned', 'én rad opp', 'to rader opp', 'tre rader opp',
  'ett steg til høyre', 'to steg til høyre', 'ett steg til venstre', 'to steg til venstre'];
// F42 «Hvilket tall er ti mer enn dette?»
SETS.N2_MER = SETS.N2_MER || ['én mer', 'ti mer', 'én mindre', 'ti mindre'];
// F43 surfaces: «Hvor mange egg er det?»
SETS.N2_PL = SETS.N2_PL || ['egg', 'pinner', 'krystaller', 'kroner', 'stjerner', 'boller'];
// F43 «what one bundle is» (hint, one clip each)
SETS.N2_TEN_IS = SETS.N2_TEN_IS || ['En full eggekartong er ti egg', 'En vedbunt er ti pinner', 'En stav er ti krystaller',
  'En tikrone er ti kroner', 'Et fullt brett er ti boller', 'En ramme er ti stjerner'];

/* ---------------------------------------------------------- templates */
F.TPL.addAll({
  // shared
  n2_hor: 'Hør en gang til.',
  n2_se: 'Se her!',
  n2_du_valgte: 'Du valgte denne.',
  n2_det_ble: { text: 'Det ble {n}.', slots: { n: 'N2_0_40' } },
  n2_for_mange: 'Det ble for mange.',
  n2_for_fa: 'Det ble for få.',
  n2_ferdig: 'Trykk på Ferdig når du er klar.',

  // F42 Hundretavla
  n2_f42_trykk: { text: 'Trykk på {n}!', slots: { n: 'NUM_0_100' } },          // T-NAVN: whole clip, digits masked (C1)
  n2_f42_les: 'Hvor bor dette tallet på tavla?',                                  // N12: the number word is on the note
  n2_f42_start: 'Start på dette tallet.',
  n2_f42_gaa: { text: 'Gå {m}.', slots: { m: 'N2_MOVE' } },
  n2_f42_hvor: 'Hvor lander bien?',
  n2_f42_mer: { text: 'Hvilket tall er {d} enn dette?', slots: { d: 'N2_MER' } },
  n2_f42_etter: 'Hva kommer etter dette tallet?',
  n2_f42_for: 'Hva kommer før dette tallet?',
  n2_f42_mellom: 'Trykk på alle tallene som bor mellom disse to.',
  n2_f42_regn: 'Regn ut, og trykk der bien lander.',
  n2_f42_h_rad: 'Én rad ned er ti mer.',
  n2_f42_h_radopp: 'Én rad opp er ti mindre.',
  n2_f42_h_steg: 'Ett steg til høyre er én mer.',
  n2_f42_h_venstre: 'Ett steg til venstre er én mindre.',
  n2_f42_h_kant: 'Når raden er slutt, fortsetter tallene på neste rad.',
  n2_f42_h_raden: 'Tallet bor i denne raden.',
  n2_f42_h_tierne: 'Tierne står til høyre i hver rad.',
  n2_f42_h_glemt: 'Det mangler et tall.',
  n2_f42_h_ekstra: 'Ett tall er for mye.',
  n2_f42_h_kantene: 'De to gule tallene er ikke med.',
  n2_f42_ok: 'Bien fant fram!',

  // F43 Bunter og plater (Myntverket)
  n2_f43_hvormange: { text: 'Hvor mange {pl} er det?', slots: { pl: 'N2_PL' } },
  n2_f43_bygg: 'Bygg dette tallet!',
  n2_f43_ten: { text: '{s}.', slots: { s: 'N2_TEN_IS' } },
  n2_f43_tiere_forst: 'Tell tierne først.',
  n2_f43_enere: 'Hvor mange enere?',
  n2_f43_tiere: 'Hvor mange tiere?',
  n2_f43_tall: 'Hvilket tall er det?',
  n2_f43_veksle: 'Veksle!',
  n2_f43_h_veksle: 'Ti enere kan bli én tier.',
  n2_f43_betal: 'Betal med færrest mulig mynter.',
  n2_f43_h_faerre: 'Det går med færre mynter.',
  n2_f43_h_stor: 'Begynn med den største mynten som passer.',
  n2_f43_ok: 'Se, så fint det ble!',

  // F44 Tallinjebroen
  n2_f44_hvor: 'Hvor bor dette tallet?',
  n2_f44_pil: 'Hvilket tall viser pila?',
  n2_f44_midt: 'Hvilket tall er midt mellom disse to?',
  n2_f44_hopp: 'Hvor lander frosken?',
  n2_f44_h_endene: 'Se på endene av broen.',
  n2_f44_h_midten: 'Midt på broen er halvveis.',
  n2_f44_h_her: 'Her bor tallet du valgte.',
  n2_f44_h_langt: 'For langt.',
  n2_f44_h_kort: 'Ikke langt nok.',
  n2_f44_h_tier: 'Hopp til tieren først.',
  n2_f44_h_streker: 'Tell strekene fra tieren.',
  n2_f44_ok: 'Hopp! Frosken fant riktig plass.',

  // F46 Hulen med teppet
  n2_f46_under: 'Hvor mange er under teppet?',
  n2_f46_forst: 'Hvor mange var det først?',
  n2_f46_fly: 'Noen krystaller flyr bort.',
  n2_f46_flaug: 'Hvor mange fløy bort?',
  n2_f46_alleok: 'Der har vi alle måtene!',
  n2_f46_alle: 'Finn alle måtene!',
  n2_f46_del: 'Del krystallene i to kurver.',
  n2_f46_lagre: 'Trykk på Husk for å ta vare på den.',
  n2_f46_denharvi: 'Den har vi allerede.',
  n2_f46_h_mangler: 'Det mangler noen måter.',
  n2_f46_h_orden: 'Begynn med null i den ene kurven.',
  n2_f46_h_hele: 'Alle sammen er så mange.',
  n2_f46_h_synes: 'Så mange synes.',
  n2_f46_ok: 'Teppet løfter seg!',

  // F47 Tiervenn-portene (no numbers spoken)
  n2_f47_start: 'Skriv svaret, så åpner porten seg.',
  n2_f47_port: ['Port!', 'Neste port!', 'En port til!'],
  n2_f47_ok: ['Porten går opp!', 'Den åpnet seg!', 'Fint!'],
  n2_f47_alle: 'Alle portene er åpne!',          // v5r: no «Rosehagen venter.» – F47 is portable (encounters, any spot)
  n2_f47_h_tiervenn: 'Hvor mange mangler på ti?',
  n2_f47_h_dobbel: 'Det er et dobbelt.',
  n2_f47_h_naer: 'Nesten dobbelt!',
  n2_f47_h_fyll: 'Fyll opp til ti først.',
  n2_f47_h_enere: 'Ta fra enerne først.',
  n2_f47_h_tiere: 'Se på tierne.',
  n2_f47_h_tell: 'Start på det største tallet og tell videre.',
  n2_f47_h_bakover: 'Tell bakover.',
  // v5r2: REGN 11 (regrouping) and REGN 12 (complements to 100) – a strategy, then its next step; never the answer
  n2_f47_h_veksle: 'Legg sammen enerne først. Blir det mer enn ti?',
  n2_f47_h_veksle_m: 'Er det nok enere å ta fra? Hvis ikke, veksle en tier.',
  n2_f47_h_veksle2: 'Ti enere er det samme som én tier.',
  n2_f47_h_hundre: 'Hvor mye mangler til neste tier? Og så til hundre?',
  n2_f47_h_hundre2: 'Tell med tiere opp til hundre.',

  // F48 Tibrettet
  n2_f48_fyll: 'Fyll brettet først.',
  n2_f48_flytt: 'Hvor mange flytter du?',
  n2_f48_tap: 'Trykk på bollene som flytter.',
  n2_f48_tar: 'Hvor mange tar du fra enerne først?',
  n2_f48_par: 'Hvilke to fat blir ti sammen?',
  n2_f48_blir: 'Hva blir det?',
  n2_f48_igjen: 'Hvor mange blir igjen?',
  n2_f48_fullt: 'Brettet er fullt!',
  n2_f48_h_plass: 'Det er plass til flere.',
  n2_f48_h_ikkeplass: 'Det er ikke plass til flere.',
  n2_f48_h_enere: 'Ta fra enerne først.',
  n2_f48_ok: 'Ferske boller!',                    // v5: no «Mmm» (DESIGN5 §2.6)

  // F49 Faktafamiliehuset
  n2_f49_lag: 'Lag alle fire regnestykkene.',
  n2_f49_tak: 'Tallene på taket er en familie.',
  n2_f49_harvi: 'Det stykket har vi allerede.',
  n2_f49_h_storst: 'Det største tallet er hele familien.',
  n2_f49_h_pluss: 'Når vi legger sammen, blir svaret det største tallet.',
  n2_f49_h_minus: 'Når vi trekker fra, begynner vi med det største tallet.',
  n2_f49_ok: 'Alle fire vinduene lyser!',
});
})();
