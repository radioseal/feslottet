/* Feslottet – speech for the v4 problem & equality formats F53–F56 (WP-P; DESIGN5 §1, DESIGN4 §4.3, SYNTHESIS §3.2 rows + §6.6).
   Pure data.  Rules (SYNTHESIS §6.6): numbers stay ON objects (blocks, scrolls, signs, ribbons); the speech is deictic and story speech
   is number-free relation sentences only («Noen fugler fløy bort.»).  No carrier line contains a task answer.  Narrator/Puff voice ('').
   Two groups:
   1. our own lines pr53_* (Markedsvekta) pr54_* (Likningsrullene) pr55_* (Dukketeateret) pr56_* (Båndveven) pr_* (shared) – static.
   2. the PROBLEM story sentences pb_* that WP-B1's banks_regn.js builds into every PROBLEM item (params.speak) – their templates live in
      F.BANKS_REGN.SPEECH over the slot sets F.BANKS_REGN.SETS (PB_NAVN, PB_TING, PB_PRON, PB_PRON_CAP).  banks_regn.js says «WP-P declares
      them»: F.PROB_LINES.declare() copies every template + set into F.TPL / F.SETS.  It runs here (when banks_regn.js is already loaded),
      from f_prob.js at load (js/game/tasks loads after js/learn) and on 'boot' – so the templates follow banks_regn.js automatically
      (no stale copy).  Clip count: F.PROB_LINES.clips() → {own, pb, total}. */
(function () {
'use strict';
const F = window.F = window.F || {};
const SETS = F.SETS = F.SETS || {};

/* ---------------------------------------------------------- 0. v5d WP-R3 (logic #57): the children of the stories – ONE shared list
   Ole is the royal baby and Per / Kari are the postman and the cook, so they are never the children of a word problem («Ole har noen
   kroner …») or of a height line-up. SETS.BARN_NAVN = the story children (PROBLEM stories + Lo3 line-ups); F.PROB_LINES.NAVN = [name,
   pronoun]; F.PROB_LINES.NAME_MAP renames the cast names the generators still use (banks_regn PB_NAVN, gen_reason Lo3 KIDS) at
   presentation (f_prob.js, lines_reason.js F.LO3say, f_reason.js / f_lesf.js plaques) – REQUEST WP-K3: let banks_regn.js / gen_reason.js
   take their names from F.SETS.BARN_NAVN / F.PROB_LINES.NAVN, then the map is a no-op. */
SETS.BARN_NAVN = SETS.BARN_NAVN || ['Mia', 'Ida', 'Emma', 'Ola', 'Ali'];
const NAVN = [['Mia', 'hun'], ['Ida', 'hun'], ['Emma', 'hun'], ['Ola', 'han'], ['Ali', 'han']];
const NAME_MAP = { Ole: 'Ola', Kari: 'Emma', Per: 'Ali' };

/* ---------------------------------------------------------- 1. our own lines (narrator) */
const OWN = {
  // shared by the four formats
  pr_hor_igjen: 'Hør på spørsmålet en gang til.',
  pr_sporsmal: ['Spørsmålstegnet er det vi ikke vet.', 'Der vi ikke vet, setter vi et spørsmålstegn.'],
  pr_din: ['Se, sånn ble det med ditt svar.', 'Sånn ble det med ditt tall.'],

  // part-whole stories (PROBLEM P2): the whole, number-free, before «Noen er røde.» (banks_regn's sentences start with the parts)
  pr_pw_epler: 'Det ligger noen epler i kurven.',
  pr_pw_kuler: 'Det ligger noen kuler i posen.',
  pr_pw_sauer: 'Noen sauer står på enga.',
  pr_pw_blomster: 'Noen blomster står i vasen.',
  pr_pw_barn: 'Noen barn leker i parken.',

  // F53 Markedsvekta (balance; E1, E3)
  pr53_lik: ['Gjør vekta lik!', 'Kan du få vekta i balanse?'],
  pr53_legg: ['Legg på klosser til begge sidene veier like mye.', 'Legg på til den ikke vipper lenger.'],
  pr53_frukt: ['Legg på frukt til begge sidene veier like mye.'],
  // v5d WP-R3: the pans hold nuts, corn, eggs, marbles … (not fruit) – a line without the thing's name
  pr53_like: ['Legg på til den ikke vipper lenger.'],          // (the clip exists – pr53_legg's 2nd text)
  pr53_vekt: ['Hvor mange må på for at vekta skal bli lik?', 'Hvor mange må på?'],
  pr53_ruta: ['Hvilket tall står i ruta?', 'Hva må stå i ruta?'],
  pr53_ruta_vekt: ['Vekta viser det samme som regnestykket.', 'Regnestykket er som vekta.'],
  pr53_skriv: ['Skriv tallet i ruta. Vekta sjekker.', 'Skriv tallet, så sjekker vekta det.'],
  pr53_h_lik: ['Likhetstegnet betyr at begge sidene er like mye.', 'Begge sidene skal veie like mye.'],
  pr53_h_tung: ['Den tunge siden går ned. Hvor mye mangler den lette siden?', 'Hvor mye tyngre er den tunge siden?'],
  pr53_h_ruta: ['Tallet i ruta er det du la på vekta.', 'Tell det du la på vekta.'],
  pr53_h_tell: ['Tell hvor mye det er på hver side.', 'Hvor mye er det på den tunge siden?'],
  pr53_ok: ['Se, nå er den i balanse!', 'Nå veier de helt likt!'],

  // F54 Likningsrullene (E2 bundle + fix, E3 scroll)
  pr54_kongen: ['Kongen har skrevet noen ruller.', 'Her er kongens ruller.'],
  pr54_familie: ['Alle rullene bruker de samme tre tallene.', 'Rullene er en tallfamilie: de samme tre tallene.'],
  pr54_feil: ['Noen av rullene er feil. Trykk på alle som er feil.', 'Trykk på alle rullene som er feil, og så Ferdig.'],
  pr54_rett: ['Gjør denne rullen riktig.', 'Nå skal vi rette denne rullen.'],
  pr54_ruta: ['Hvilket tall må stå i ruta?', 'Hva må stå i ruta for at det skal bli riktig?'],
  pr54_verdt_trekant: ['Hva er trekanten verdt?'],
  pr54_verdt_sirkel: ['Hva er sirkelen verdt?'],
  pr54_verdt_firkant: ['Hva er firkanten verdt?'],
  pr54_verdt_stjerne: ['Hva er stjernen verdt?'],
  pr54_h_sider: ['Regn ut begge sidene av likhetstegnet. Er de like?', 'En rull er riktig når begge sidene er like mye.'],
  pr54_h_oper: ['Likhetstegnet betyr ikke at svaret kommer. Begge sidene skal være like mye.', 'Begge sidene av likhetstegnet skal bli like mye.'],
  pr54_h_ruta: ['Prøv tallet ditt i ruta. Blir begge sidene like?', 'Regn ut den siden der alt er kjent først.'],
  pr54_h_alle: ['Sjekk hver rull for seg.', 'Har du funnet alle som er feil?'],
  pr54_ok: ['Nå er alle rullene riktige!', 'Kongen blir glad for riktige ruller.'],
  pr54_ok_n: ['Nå er alle rullene riktige!'],              // v5r2: an animal meeting (no king) – the clip exists (pr54_ok's 1st text)

  // F55 Dukketeateret (P1–P5 scenes, reverse mode)
  pr55_se: ['Se på dukketeateret!', 'Nå begynner teateret!'],
  pr55_lag: ['Lag regnestykket med brikkene.', 'Hvilket regnestykke passer til historien?'],
  pr55_lag_sp: ['Bruk spørsmålstegnet én gang, der vi ikke vet.'],
  pr55_sol: ['Se, sånn blir regnestykket. Legg brikkene som lyser.', 'Legg brikkene som lyser.'],
  pr55_svar: ['Hva er spørsmålstegnet? Skriv svaret.', 'Skriv svaret.'],
  pr55_h_flere: ['Ble det flere eller færre til slutt?', 'Kom det noen, eller gikk det noen?'],
  pr55_h_forst: ['Var det flere eller færre før det skjedde?', 'Tenk på hvordan det var før.'],
  pr55_h_cmp: ['Sammenlign de to radene. Hvor langt rekker den korte raden?', 'Se på begge to. Hvem har flest?'],
  pr55_h_del: ['Alle sammen er begge delene til sammen.', 'Hvilken del vet vi ikke?'],
  pr55_h_tall: ['Hvilke tall vet vi? Og hva vet vi ikke?', 'Se på skiltene i teateret.'],
  pr55_h_regn: ['Se på regnestykket ditt og regn det ut.', 'Regnestykket ditt hjelper deg.'],
  pr55_h_tell: ['Tell dem på scenen.', 'Du kan telle dem.'],
  pr55_spill: ['Nå skal du spille regnestykket!', 'Kan du spille dette regnestykket?'],
  pr55_spill_pluss: ['Pluss betyr at flere kommer.'],
  pr55_spill_minus: ['Minus betyr at noen går bort.'],
  pr55_h_spill: ['Se på tegnet og det andre tallet en gang til.', 'Hvor mange skal komme eller gå?'],
  pr55_ok: ['Sånn gikk det!', 'Teateret er ferdig. Bravo!'],

  // F56 Båndveven (basic two-ribbon bar model)
  pr56_vev: ['Her er båndene til historien.', 'Dronningen vever historien som bånd.'],
  pr56_vev_n: ['Her er båndene til historien.'],            // v5r2: an animal meeting (no queen) – the clip exists (pr56_vev's 1st text)
  pr56_merk: ['Hvor hører spørsmålet hjemme? Trykk der.', 'Sett spørsmålstegnet der vi ikke vet.'],
  pr56_svar: ['Skriv tallet som skal stå der.', 'Hva er spørsmålstegnet verdt?'],
  pr56_h_tag: ['Spør vi om hele båndet, en del av det, eller forskjellen?', 'Hva vet vi allerede? Det som er igjen, er spørsmålet.'],
  pr56_h_hel: ['Hele båndet er begge delene til sammen.'],
  pr56_h_del: ['Den ene delen og spørsmålet er til sammen like lange som hele båndet.'],
  pr56_h_diff: ['Forskjellen er det stykket som stikker ut.', 'Hvor mye lengre er det lange båndet?'],
  pr56_lb: ['Se, da passer ikke båndene sammen.', 'Med det tallet blir båndet for langt eller for kort.'],
  pr56_ok: ['Nå passer båndene!', 'Se, båndene passer sammen.'],
};
if (F.TPL && F.TPL.addAll) F.TPL.addAll(OWN);

/* ---------------------------------------------------------- 2. the PROBLEM story sentences of banks_regn.js */
function declare() {
  const B = F.BANKS_REGN;
  if (!F.TPL || !B || !B.SPEECH) return 0;
  let n = 0;
  for (const s in (B.SETS || {})) if (!SETS[s]) SETS[s] = B.SETS[s].slice();
  // v5d (#57): the story children are spoken in PB_NAVN lines too (the cast names stay enumerated for any other presenter)
  if (Array.isArray(SETS.PB_NAVN)) Object.values(NAME_MAP).forEach(nm => { if (!SETS.PB_NAVN.includes(nm)) SETS.PB_NAVN.push(nm); });
  for (const id in B.SPEECH) {
    if (F.TPL.has(id)) continue;
    const t = B.SPEECH[id];
    F.TPL.add(id, t.slots ? { text: t.text, slots: Object.assign({}, t.slots) } : { text: t.text });
    n++;
  }
  return n;
}
function clips() {
  const cnt = ids => { let k = 0; for (const id of ids) { const s = F.TPL.all[id]; if (!s) continue; let c = s.text.length * s.voices.length;
    for (const nm of Object.keys(s.slots || {})) { const set = F.SETS.get ? F.SETS.get(s.slots[nm]) : SETS[s.slots[nm]]; c *= (set || []).length; } k += c; } return k; };
  const own = cnt(Object.keys(OWN)), pb = cnt(Object.keys((F.BANKS_REGN && F.BANKS_REGN.SPEECH) || {}));
  return { own, pb, total: own + pb };
}
F.PROB_LINES = { declare, clips, own: Object.keys(OWN), NAVN, NAME_MAP };
declare();
if (F.on) F.on('boot', declare);
})();
