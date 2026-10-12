/* Feslottet – speech templates for the castle + park (WP CASTLE+PARK). Pure data, registered at load time.
   Ids: castle_* (castle, lift, rooms, towers, reactions in rooms) and park_* (park reactions). */
(function () {
'use strict';
const F = window.F = window.F || {};
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
F.SETS = F.SETS || {};
F.SETS.CASTLE_ROOMS = ['Hallen', 'Kjøkkenet', 'Spisesalen', 'Tronsalen', 'Ballsalen', 'Biblioteket', 'Musikkrommet', 'Heisen', 'Skattkammeret',
  'Ordmuseet', 'Prinsessens rom', 'Kongeparets soverom', 'Badet', 'Garderoben', 'Stjernetårnet', 'Fetårnet'];
F.SETS.CASTLE_FLOORS = range(2, 34);
F.SETS.CASTLE_TOWERS = ['Talltårnet', 'Lesetårnet', 'Skrivetårnet'];
F.SETS.PARK_PLACES = ['Slottsparken', 'Lekeplassen', 'Andedammen', 'Rosehagen', 'Tallhagen', 'Markedsplassen', 'Fehagen', 'Tallveien'];

const L = {
  // castle navigation
  castle_heis_hvor: 'Hvilket rom skal vi til?',
  castle_n: { text: '{n}!', slots: { n: 'NUM_1_20' } },
  castle_tarn: { text: '{t}.', slots: { t: 'CASTLE_TOWERS' } },
  castle_etasjer: { text: 'Det er {n} etasjer.', slots: { n: 'CASTLE_FLOORS' } },
  castle_etasje1: 'Det er én etasje.',
  castle_overrask: ['Oi, en overraskelse!', 'Se der!', 'Hurra!'],
  // reactions (narrator). natural 11.10. (audit D4): purely descriptive lines are gone (gryte, kjele, løper, paraply, lys / mørkt,
  // tavle, xylofon count, myntverk lesson, «Tårnet vokser når du øver!»; round 2: every flat «X does Y.» narration – gjøk «sier ko-ko»,
  // ovn, brød, bord, te, frukt, lysekrone, fløyte, noter, juvel, gardin, vindu, klokke, ballerina, globus, sparegris, bamse, fisk, tøfler,
  // vugge, skap, bad, speil, kjoler, sko, sy, stjernebilde, duer, ridder, dyrekurv, lekekiste); what stays is exclamations and surprises,
  // and it is rare (F.UI.narrOK: first tap of a kind a day, ≥ 35 s apart, never the same text twice a session)
  castle_hihi: ['Hihi!', 'Det kilte!'],
  castle_nam: ['Så godt!', 'Det smaker så godt!'],
  castle_atsjo: 'Atsjo!',
  castle_pip: 'Pip pip!',
  castle_fint: ['Så fint!', 'Så vakkert!'],
  castle_ding: 'Ding dong!',
  castle_mus: 'En liten mus sier hei!',
  castle_kakebokse: 'Pus tok en kjeks!',
  castle_kylling: 'En kylling!',
  castle_svaner: 'Servietten ble en svane!',
  castle_bok: 'Boka vil fly!',
  castle_trone: 'Nå er du dronning!',
  castle_krone: 'Krona passer!',
  castle_dans: ['Alle danser!', 'Vi danser!'],
  castle_musikk: 'Litt musikk!',
  castle_tromme: 'Bom bom bom!',
  castle_skatt: 'Gull og glitter!',
  castle_seng: ['Hopp, hopp!', 'Høyere!'],
  castle_dukkehus: 'Et lite slott!',
  castle_gyngehest: 'Ihaa!',
  castle_fjaer: 'Puter og fjær!',
  castle_stjerner: 'Stjerner i taket!',
  castle_tass: 'Tass var i skapet!',
  castle_bobler: 'Bobler!',
  castle_kvakk: 'Kvakk!',
  castle_hatter: 'Hatten hopper på!',
  castle_utsikt: 'For en utsikt!',
  castle_teleskop: 'Jeg ser langt!',
  castle_fanfare: 'Ta-ta-ta-taa!',
  castle_palme: 'Blomsten nyser glitter!',
  castle_rustning: 'Se, en liten mus i rustningen!',
  castle_portrett: 'Kongen blunker!',
  castle_mel: 'Mel overalt!',
  castle_deig: 'Et hjerte av deig!',
  castle_avis: 'Kongeposten!',
  castle_harpe: 'Pling-plong.',
  castle_piano: 'Hør, pianoet spiller en sang!',
  castle_kiste: 'Kista har en kodelås.',
  castle_museum: 'Her står ordene du har tryllet fram.',
  castle_ordbok: 'Ny side!',
  castle_tomt_sokkel: 'Tryll fram et ord, så står det her.',
  castle_ferom: 'Dette er rommet ditt!',
  castle_fespeil: 'Hvilken fe vil du være?',
  castle_rekkverk: 'Wiii!',
  // park (natural 11.10.: no roser / hekk / lykt / tre / tavle descriptions, no «Hink og tell!» / «Trykk på boblene!» instructions,
  // no «Tallhagen blomstrer når du øver.» – the beds bloom; round 2: no karusell / ender / svaner / benk / ballong / drage / fuglebad /
  // tomater / gulrot / sjakk / klokketårn narration – they move, splash and sound)
  park_bronn: 'Plask!',
  park_onskemynt: 'En ønskemynt!',
  park_flagg: 'Flagget går opp!',
  park_fontene: ['Fontenen spruter!', 'Se, vannet danser!'],          // v5 WP-W (DESIGN4 §5 v3 leftover): second wordings
  park_huske: ['Høyere!', 'Wiii!'],
  park_sklie: 'Wiii!',
  park_vippe: 'Opp og ned!',
  park_sand: 'Et sandslott!',
  park_trampoline: 'Hopp, hopp, hopp!',
  park_robat: 'Ro, ro, ro!',
  park_labyrint: 'En gyllen bokstav!',
  park_band: 'Dyrebandet spiller!',
  park_is: 'Is!',
  park_statue: 'Statuen vinker!',
  park_spreder: 'En regnbue!',
  park_bris: 'Bris vrinsker!',
  park_egg: 'Et egg!',
  park_tomt: 'Her kan du bygge.',
  park_butikk_stengt: 'Butikken åpner snart.',
  park_bod: 'Dette er boden din!',
  park_blomst: 'En blomst!',
  park_sommerfugl: 'Sommerfugler!',
  park_sted: { text: '{p}!', slots: { p: 'PARK_PLACES' } },
};
// WP1 BLD (DESIGN2 §8.2, prefix bld_, narrator): stairs, lift, doors, the courtyard, the indoor map, gifts
F.SETS.ETASJE = ['første', 'andre', 'tredje'];
F.SETS.ROOM_NUMS = F.SETS.ROOM_NUMS || Array.from({ length: 30 }, (_, i) => i + 1);
Object.assign(L, {
  bld_opp: 'Opp trappa!',
  bld_ned: 'Ned trappa!',
  bld_etasje: { text: 'Nå er vi i {e} etasje.', slots: { e: 'ETASJE' } },
  bld_heis_opp: 'Heisen går opp!',
  bld_heis_ned: 'Heisen går ned!',
  // v5 WP-W (DESIGN4 §8 natural rooms, #45): room numbers 1–30 (WP-X numbers rooms per floor); «… er der borte» at a lift landing
  bld_rom: { text: 'Her er rom {n}!', slots: { n: 'ROOM_NUMS' } },
  bld_rom_der: { text: 'Rom {n} er der borte!', slots: { n: 'ROOM_NUMS' } },
  bld_ut: ['Her går vi ut.', 'Nå går vi ut.', 'Så flyr vi ut!'],
  bld_ut_finn: 'Se etter ordet ut!',      // v3 WP1 §4.10: indoor way-out hint (lowercase: said as a word, never spelled)
  bld_inn: 'Velkommen inn!',
  bld_bronn: ['Plask! Brønnen er full av vann.', 'Bøtta går ned i brønnen.'],
  bld_benk: 'Ah, en god benk.',
  bld_flagg: 'Flaggene vaier på slottet.',
  bld_kart_trykk: 'Trykk på et rom!',
  bld_kart_dit: 'Dit går vi!',
  bld_her: 'Her er du!',
  bld_gave: { text: 'Gaven står i {rom}!', slots: { rom: 'ROOMS' } },
});
// v3 WP3 (DESIGN3 §8): «Dronning for en dag» – the throne ceremony and the royal decree (narrator, no slots, 1 clip each)
Object.assign(L, {
  castle_krone_din: 'Her er krona di!',
  castle_dekret: 'Hva bestemmer dronningen i dag?',
  castle_dekret_ferdig: 'Alle gjør som dronningen sier!',
  castle_lov: 'Ordet ditt står i kongeloven.',
  castle_dronning_slutt: 'Takk, dronning! Krona hviler til i morgen.',
  castle_trone_hvile: 'Tronen er myk og god.',
  castle_trone_konge: 'Kongen lar deg prøve tronen!',
});
// v5c WP-W2 (DESIGN5 §10): payoffs of the question hooks – what she made stays in the room (narrator, 1 clip each)
Object.assign(L, {
  castle_juvel_smykke: 'Smykket ditt ligger i skrinet!',
  castle_dans_form: 'Gulvet lyser i formen du fant!',
  castle_kiste_rydd: 'Nå er lekekista ryddig!',
  castle_frukt_rydd: 'Nå ligger frukten fint i fatet!',
  park_drivhus_moden: 'Se, tomatene ble modne!',
});
F.TPL.addAll(L);
})();
