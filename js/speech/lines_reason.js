/* Feslottet – speech templates for WP-M: F52 Froskesteinene, F58 Perlemakeren, F59 Voksetårnet, F71 Sorteringskassene, F74 Dronningens
   blomsterbed, and the LOGIKK Lo3 clue lines used by F79 Bildehylla (WP-L renders Lo3 items from js/learn/gen_reason.js).
   Pure data. Rules (SYNTHESIS §6.6): numbers stay on the stones (deictic speech); ≤ 2 slots, each a finite set declared here;
   no task answer in a carrier line (the category / clue IS the stimulus, never the answer); narrator voice '' only. */
(function () {
'use strict';
const F = window.F = window.F || {};
const SETS = F.SETS = F.SETS || {};

/* ---------------------------------------------------------- finite sets (owned by WP-M) */
SETS.RS_STEP = SETS.RS_STEP || [2, 3, 4, 5, 10];
SETS.RS_JUMPS = SETS.RS_JUMPS || [2, 3, 4, 5, 6];
// who hops on the stones (F52 surfaces: the frog on the pond, the rabbit on Tallveien)
SETS.RS_HOPPER = SETS.RS_HOPPER || ['Frosken', 'Kaninen'];
// v5d WP-R3: the encounter's own hopper (params.hopper: hare / snøhare → Haren, gresshoppe → Gresshoppa) hops in the grass
['Haren', 'Gresshoppa'].forEach(x => { if (!SETS.RS_HOPPER.includes(x)) SETS.RS_HOPPER.push(x); });
// Or1 «tap all» prompts: one whole sentence per category (grammar differs per word)
SETS.RS_ALLE = SETS.RS_ALLE || ['Trykk på all frukten', 'Trykk på alle grønnsakene', 'Trykk på alle fuglene', 'Trykk på alle dyrene',
  'Trykk på alle kjøretøyene', 'Trykk på alle klærne', 'Trykk på alle møblene', 'Trykk på alle lekene', 'Trykk på alt vi kan spille musikk på',
  'Trykk på alt vi bruker på kjøkkenet', 'Trykk på alt vi kan spise'];
// Lo1 reason cards / D1 rule cards: «De andre …» (one clip each)
SETS.RS_REASON = SETS.RS_REASON || ['De andre er frukt', 'De andre er grønnsaker', 'De andre er mat', 'De andre er dyr', 'De andre er fugler',
  'De andre er kjøretøy', 'De andre er klær', 'De andre er møbler', 'De andre er leker', 'De andre kan vi spille på', 'De andre hører til på kjøkkenet',
  'De andre har fire bein', 'De andre har to bein', 'De andre kan fly', 'De andre bor på gården', 'De andre bor i havet', 'De andre har pels',
  'De andre har fjær', 'De andre har hjul', 'De andre flyter på vannet', 'De andre er røde', 'De andre er blå', 'De andre er gule', 'De andre er grønne',
  'De andre er partall', 'De andre er oddetall', 'De andre er hele tiere', 'De andre er mindre enn ti', 'De andre har to like sifre'];
// D1 rule cards: «Sorter etter …»
SETS.RS_RULE = SETS.RS_RULE || ['Etter frukt', 'Etter grønnsaker', 'Etter mat', 'Etter dyr', 'Etter fugler', 'Etter kjøretøy', 'Etter klær',
  'Etter møbler', 'Etter leker', 'Etter musikk', 'Etter kjøkkenting', 'Etter fire bein', 'Etter to bein', 'Etter om de kan fly', 'Etter om de bor på gården',
  'Etter om de bor i havet', 'Etter pels', 'Etter fjær', 'Etter hjul', 'Etter om de flyter', 'Etter farge'];
// Lo1 riddle clues
SETS.RS_CLUE = SETS.RS_CLUE || ['Jeg har fire bein', 'Jeg har ikke fire bein', 'Jeg har to bein', 'Jeg har ikke to bein', 'Jeg kan fly',
  'Jeg kan ikke fly', 'Jeg bor på gården', 'Jeg bor ikke på gården', 'Jeg bor i havet', 'Jeg bor ikke i havet', 'Jeg har pels', 'Jeg har ikke pels',
  'Jeg har fjær', 'Jeg har ikke fjær'];
// Lo3 clue pairs (whole sentences, no a = b combos): height (children) and race (pets)
// v5d WP-R3 (logic #57): Per (the postman) and Kari (the cook) are no children – the line-up children are the shared story children
// (SETS.BARN_NAVN, lines_prob.js); gen_reason.js still names them Per / Kari → F.LO3name renames at presentation (REQUEST WP-K3)
const KIDS = ['Ola', 'Ida', 'Ali', 'Emma'], PETS = ['Tass', 'Pus', 'Mus', 'Nøff'];
const LO3_MAP = { Per: 'Ali', Kari: 'Emma', Ole: 'Ola' };
// (only once the new names have clips – until the lead regenerates audio the old names stay, so a clue is never silent; Node / collect:
// no clip map → the map is on)
const clipOk = t => { try { return typeof window === 'undefined' || !window.SPEECH || !F.Speech || !F.Speech.has || F.Speech.has(t, ''); } catch (e) { return true; } };
let lo3On = null;
F.LO3name = id => { if (lo3On == null || lo3On === 'wait') { const ready = typeof window === 'undefined' || !!window.SPEECH || F.booted; lo3On = ready ? (clipOk('Ali er høyere enn Emma.') && clipOk('Emma er lavere enn Ali.')) : 'wait'; }
  return lo3On === true ? (LO3_MAP[id] || id) : id; };
F.LO3name.reset = () => { lo3On = null; };
const pairs = (names, mid) => names.flatMap(a => names.filter(b => b !== a).map(b => `${a} ${mid} ${b}`));
// (the generator's own names stay enumerated – they are spoken until the new names have clips)
const KIDS_OLD = ['Ola', 'Ida', 'Per', 'Kari'];
const pairs2 = mid => [...new Set(pairs(KIDS_OLD, mid).concat(pairs(KIDS, mid)))];
SETS.LO3_HOYERE = SETS.LO3_HOYERE || pairs2('er høyere enn');
SETS.LO3_LAVERE = SETS.LO3_LAVERE || pairs2('er lavere enn');
SETS.LO3_FOR = SETS.LO3_FOR || pairs(PETS, 'kom i mål før');
SETS.LO3_ETTER = SETS.LO3_ETTER || pairs(PETS, 'kom i mål etter');
SETS.LO3_PETS = SETS.LO3_PETS || PETS.slice();

F.TPL.addAll({
  /* ---------------------------------------------------------- F52 Froskesteinene */
  rs_f52_sitter: { text: '{d} sitter her.', slots: { d: 'RS_HOPPER' } },
  rs_f52_hopper: { text: '{d} hopper {k} om gangen.', slots: { d: 'RS_HOPPER', k: 'RS_STEP' } },
  rs_f52_bakover: { text: '{d} hopper bakover, {k} om gangen.', slots: { d: 'RS_HOPPER', k: 'RS_STEP' } },
  rs_f52_alle: ['Trykk på alle steinene den lander på.', 'Hvilke steiner lander den på? Trykk på alle.'],
  rs_f52_ferdig: 'Trykk på Ferdig når du er klar.',
  rs_f52_mangler: ['Noen steiner har mistet tallet sitt.', 'Noen tall har falt av steinene.'],
  rs_f52_hva_her: ['Hvilket tall skal stå her?', 'Hva skal stå på denne steinen?'],
  rs_f52_feil: ['Én stein har feil tall. Finn den!', 'Ett av tallene er feil. Hvilken stein er det?'],
  rs_f52_fiks: 'Hvilket tall skal stå der?',
  rs_f52_plask: ['Plask! Der landet den ikke.', 'Plask! Den steinen hoppet den over.'],
  rs_f52_bom: ['Oi! Der landet den ikke.', 'Bom! Den steinen hoppet den over.'],
  rs_f52_glemt: 'Den landet på en stein til. Ser du hvilken?',
  rs_f52_nabo: ['Se på to steiner ved siden av hverandre.', 'Se på to naboer. Hvor mye forskjell er det?'],
  rs_f52_hopp_tell: { text: 'Tell {k} steiner for hvert hopp.', slots: { k: 'RS_STEP' } },
  rs_f52_ganger: { text: 'Den hopper {j} ganger.', slots: { j: 'RS_JUMPS' } },
  rs_f52_hvor: ['Hvor lander den? Trykk på steinen.', 'Hvilken stein lander den på?'],
  rs_f52_ok: ['Helt fram!', 'Hopp, hopp, helt riktig!', 'Takk for turen!'],

  /* ---------------------------------------------------------- F58 Perlemakeren */
  rs_f58_neste: ['Hva kommer etter? Lag de tre neste.', 'Fortsett mønsteret. Legg på tre til.'],
  rs_f58_slutt: ['Trykk på den siste perlen før mønsteret begynner på nytt.', 'Hvor slutter mønsteret første gang? Trykk der.'],
  rs_f58_feil: ['Én perle er feil. Finn den!', 'Én av perlene passer ikke i mønsteret. Hvilken?'],
  rs_f58_fiks: 'Hvilken perle skal være der?',
  rs_f58_samme: ['Lag det samme mønsteret med disse tingene.', 'Kan du lage samme mønster med de nye tingene?'],
  rs_f58_igjen: 'Se: denne biten kommer igjen og igjen.',
  rs_f58_les: 'Se på perlene, én og én.',
  rs_f58_ditt: 'Se på ditt mønster ved siden av.',
  rs_f58_ok: ['For et fint smykke!', 'Mønsteret stemmer!', 'Så fine perler!'],

  /* ---------------------------------------------------------- F59 Voksetårnet */
  rs_f59_bygg: ['Se hvordan det vokser. Bygg det neste!', 'Det vokser hver gang. Hvordan ser det neste ut?'],
  rs_f59_trykk: 'Trykk på en rute for å legge på en kloss.',
  rs_f59_tell: ['Tell klossene i hvert byggverk.', 'Hvor mange klosser kommer til hver gang?'],
  rs_f59_ok: ['Det vokste helt riktig!', 'Akkurat sånn vokser det!'],

  /* ---------------------------------------------------------- F71 Sorteringskassene (Or1, Lo1, D1) */
  rs_alle: { text: '{s}.', slots: { s: 'RS_ALLE' } },
  rs_f71_ferdig: 'Trykk på Ferdig når du har funnet alle.',
  rs_f71_odd: ['Hvilken passer ikke?', 'Hvilken hører ikke til?'],
  // natural audit D12 (#62): the why-step asks what ALL THE OTHERS share – «fire bein» is right, «fjær» (true of the odd one, not of
  // the others) is honestly wrong. («Hvorfor passer den ikke?» made «fjær» a true answer that was marked wrong.)
  rs_f71_likt: 'Hva er likt for alle de andre?',
  rs_reason: { text: '{s}.', slots: { s: 'RS_REASON' } },
  // D12: the odd one hops out → «Ja!» + the reason card's own clip (rs_reason «De andre har fire bein.») – both clips exist
  rs_f71_ja_ok: 'Ja!',
  rs_f71_gaate: ['Hør på gåten min!', 'Her kommer en gåte.'],
  rs_clue: { text: '{s}.', slots: { s: 'RS_CLUE' } },
  rs_f71_hvem: 'Hvem er jeg?',
  rs_f71_sorter: ['Sorter dem i kassene!', 'Legg hver ting i riktig kasse.'],
  rs_f71_tapp: 'Trykk på en ting, og så på en kasse.',
  rs_f71_annen: ['Finn en annen måte å sortere på!', 'Kan du sortere dem på en ny måte?'],
  rs_f71_hvilken_regel: 'Hvilken regel brukte Puff?',
  rs_f71_velg_regel: 'Hvordan kan vi sortere nå?',
  rs_rule: { text: '{s}.', slots: { s: 'RS_RULE' } },
  rs_f71_passer_ikke: 'Se, denne passer ikke i kassen.',
  rs_f71_samme: 'Det er samme måte som i stad. Prøv en ny.',
  rs_f71_horer: 'Den passer sammen med noen av de andre.',
  rs_f71_de_fleste: ['Hva er nesten alle sammen?', 'Se på alle. Hva har de fleste felles?'],
  rs_f71_mangler: 'Noen hører med som du ikke har trykket på.',
  rs_f71_ikke_alle: 'Se, ikke alle de andre er det.',
  // D12: «Så ryddig!» only where something was tidied (the crates); riddle / tap-all / line-up (and F79's shelf) get a plain «well done»
  rs_f71_ok: ['Godt tenkt!', 'Ja, helt riktig!'],
  rs_f71_ryddig_ok: ['Så ryddig!', 'Alt ligger på riktig plass!'],

  /* ---------------------------------------------------------- F74 Dronningens blomsterbed */
  rs_f74_hjelp: 'Kan du plante resten av blomsterbedet?',
  rs_f74_regel1: 'Hver rad skal ha én av hver blomst.',
  rs_f74_regel2: 'Det samme gjelder hver søyle og hver firkant.',
  rs_f74_trykk: 'Trykk på et tomt bed for å bytte blomst.',
  rs_f74_ferdig: 'Trykk på Ferdig når bedet er fullt.',
  rs_f74_rad: 'Se på denne raden. Hvilken blomst mangler?',
  rs_f74_sole: 'Se på denne søylen. Hvilken blomst mangler?',
  rs_f74_firkant: 'Se på denne firkanten. Hvilken blomst mangler?',
  rs_f74_like: ['Her står to like blomster.', 'Se, to like blomster på samme linje.'],
  rs_f74_tomt: 'Noen bed er fortsatt tomme.',
  rs_f74_ok: ['For et vakkert blomsterbed!', 'Dronningen blir så glad for bedet!'],

  /* ---------------------------------------------------------- solution steps (2nd error: she carries it out) */
  rs_sol_perler: 'Lag det samme som de lyse perlene viser.',
  rs_sol_bygg: 'Bygg der de lyse klossene står.',
  rs_sol_bed: 'Plant de blomstene du ser over bedene.',
  rs_f71_kassene: 'Se på bildene på kassene.',

  /* ---------------------------------------------------------- LOGIKK Lo3 clue lines (F79 Bildehylla, WP-L) */
  lo3_hoyere: { text: '{p}.', slots: { p: 'LO3_HOYERE' } },
  lo3_lavere: { text: '{p}.', slots: { p: 'LO3_LAVERE' } },
  lo3_for: { text: '{p}.', slots: { p: 'LO3_FOR' } },
  lo3_etter: { text: '{p}.', slots: { p: 'LO3_ETTER' } },
  lo3_kom_sist: { text: '{a} kom sist.', slots: { a: 'LO3_PETS' } },
  lo3_kom_forst: { text: '{a} kom først.', slots: { a: 'LO3_PETS' } },
  lo3_ask_hoyest: 'Hvem er høyest?',
  lo3_ask_lavest: 'Hvem er lavest?',
  lo3_ask_forst: 'Hvem kom først i mål?',
  lo3_ask_sist: 'Hvem kom sist i mål?',
  lo3_ask_linje_h: 'Still dem opp fra høyest til lavest.',
  lo3_ask_linje_r: 'Still dem opp i den rekkefølgen de kom i mål.',
  lo3_hor: 'Hør godt på hintene.',
});
// spoken text of a Lo3 clue {tpl, p} as the template expects it (F79 calls F.SAY(c.tpl, F.LO3say(c)))
F.LO3say = c => { const p = String(c.p).split('|').map(F.LO3name).join('|');
  return /^lo3_kom_/.test(c.tpl) ? { a: p } : { p: p.replace('|', { lo3_hoyere: ' er høyere enn ', lo3_lavere: ' er lavere enn ', lo3_for: ' kom i mål før ', lo3_etter: ' kom i mål etter ' }[c.tpl] || ' ') }; };
})();
