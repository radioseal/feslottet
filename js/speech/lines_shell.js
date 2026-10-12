/* Feslottet – SHELL speech templates (HUD, title, fairy select, day frame, bedtime, map, progress).
   Prefixes: hud_ (shell/HUD/title/bedtime/map), prog_ (towers, gems, garden), trav_ + map_ (DESIGN2 WP10). Registered at load time (pure data).
   Voices: '' = Puff/narrator; 'barn' = the four fairies introducing themselves on the cloud stage. */
(function () {
'use strict';
const F = window.F = window.F || {};
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
F.SETS = F.SETS || {};
// tower floors spoken when a tower is tapped (Talltårnet max 34 floors)
F.SETS.PROG_FLOORS = range(2, 34);
F.SETS.PROG_TENS = range(2, 12);   // bedtime summary: «{t} tiere»
F.SETS.PROG_ONES = range(2, 9);    // bedtime summary: «{e} enere»
F.SETS.ONB_WORDS = ['sol', 'bil', 'hus', 'ost'];   // onboarding: the first word she writes with Staven (ghost letters)

F.TPL.addAll({
  // ---- numbers and purse
  hud_num: { text: '{n}', slots: { n: 'NUM_0_100' } },
  hud_purse_many: 'Så mange mynter!',
  hud_word: { text: '{w}', slots: { w: 'WORDS' } },
  hud_purse_zero: 'Pungen er tom. Hjelp noen, så får du mynter!',
  hud_bundle: ['Ti mynter blir én tier!', 'Klink! Ti enere blir én tier!'],   // economy §1 row 1: once EVER (hud.js, F.save.hud.bundleSaid)
  hud_tens: { text: '{t} tiere.', slots: { t: 'PROG_TENS' } },
  hud_tens1: 'Én tier.',
  hud_ones: { text: 'Og {e} enere.', slots: { e: 'PROG_ONES' } },
  hud_ones1: 'Og én ener.',

  // ---- Puff (helper cloud)
  hud_idle_offer: 'Skal jeg vise vei?',
  // clarity §7: Puff's way is a trail of little clouds (was «Følg glitteret!» / «Se, en glittersti!»); hud_puff_free is retired –
  // every Puff answer has a destination (the new hud_ride / hud_sug_* live in lines_clarity.js)
  hud_trail_go: 'Følg skyene mine!',

  // ---- the savings goal on the goal card (economy plan §4; js/ui/goal.js): once per goal / once a session, never a nag
  goal_nok: 'Nå har du nok!',
  goal_hvor: { text: 'Det finner du i {shop}.', slots: { shop: 'SHOPNAMES' } },

  // ---- title + fairy select
  hud_title_hello: 'Velkommen til Feslottet!',
  hud_continue: ['Hei igjen!', 'Så fint at du er her!'],
  hud_pick_fairy: 'Hvilken fe vil du være? Trykk på en fe.',
  hud_pick_ok: ['Så fint!', 'Flott valg!'],
  hud_new_game: 'Et helt nytt eventyr!',

  // ---- day frame
  hud_morning: ['God morgen!', 'God morgen, lille fe!', 'En ny dag i Feslottet!'],
  hud_home: 'Hjem!',
  hud_fly: ['Vi flyr!', 'Nå flyr vi!'],
  hud_map_cloud: 'Dit har du ikke vært ennå.',
  hud_welcome_place: { text: 'Velkommen til {place}!', slots: { place: 'PLACES' } },
  hud_place: { text: '{place}', slots: { place: 'PLACES' } },
  // v3 WP5 §9.2: the welcome invites her to read the name on the banner first (the name line follows after 6 s without a tap)
  hud_welcome_les: ['Velkommen! Kan du lese navnet?', 'Hei! Hva heter dette stedet?'],

  // ---- bedtime
  hud_bed_soon: 'Snart er det leggetid.',
  hud_bed_golden: 'Se så gyllent lyset er!',
  hud_bed_summary: 'Se hva du klarte i dag!',
  hud_bed_coins: 'Mynter i dag:',
  hud_bed_words: 'Disse tingene tryllet du fram!',
  hud_bed_floors: 'Tårnene ble høyere!',
  hud_bed_night: 'God natt!',
  hud_bed_tomorrow: ['Ny dag i morgen!', 'Vi sees i morgen!'],
  hud_bed_extend: 'Litt mer tid! Hurra!',

  // ---- progress (towers, gems, garden)
  prog_floor_new: ['Tårnet vokser!', 'Ny etasje i tårnet!', 'Tårnet ble høyere!'],
  prog_floor_gold: 'En gulletasje! Nå kan du dette!',
  prog_floors: { text: '{n} etasjer!', slots: { n: 'PROG_FLOORS' } },
  prog_floors1: 'Én etasje!',
  prog_gem: 'Staven fikk en ny edelstein!',
  prog_bloom: 'Det blomstrer i Tallhagen!',

  // ---- first-run onboarding (onboard.js): Puff shows how everything works (WP2 moved fly/press/purse outdoors: home_onb_*; their old ids are deleted)
  onb_hello: 'Hei! Jeg er Puff, skyen din.',
  onb_hello2: 'Jeg skal vise deg Feslottet.',
  onb_doit: ['Jeg viser deg!', 'Se her!'],
  onb_fly_again: 'Trykk på døra!',
  onb_press_ok: 'Alt du trykker på gjør noe morsomt!',
  onb_wand: 'Nå skal du få se magi! Trykk på staven.',
  onb_wand_again: 'Trykk på staven der nede!',
  onb_write: { text: 'Skriv {w}! Trykk på bokstaven som lyser.', slots: { w: 'ONB_WORDS' } },
  onb_write_again: 'Trykk på bokstaven som lyser.',
  onb_write_no: 'Nesten! Prøv den som lyser.',
  onb_wand_ok: 'Se! Ordet ble til en ting!',
  onb_env: 'Trykk på brevet!',                                   // clarity §7: day 1 has ONE letter
  onb_env_again: 'Brevene er til deg. Trykk på ett av dem!',
  // clarity §7 retired: onb_fly_ok, onb_wand_more, onb_env_ok, onb_done, onb_purse_tap / _again / _ok (no callers left)

  // ---- DESIGN2 WP10: travel (trav_) and map / HUD (map_). Sets: REALMS (js/data/realms.js, the 10 castle names). 24 clips (cap 30).
  trav_reiser: { text: 'Vi reiser til {slott}!', slots: { slott: 'REALMS' } },   // map: fast travel to a found kingdom (cloud ride)
  trav_hjem: 'Vi flyr hjem!',                                                      // map: Fetårnet (home)
  trav_selv: 'Fly mot lyset, så finner du det!',                                  // map: a kingdom she has not found yet (clarity §7)
  map_navn: { text: '{slott}', slots: { slott: 'REALMS' } },                       // crest taps + region banner taps
  // clarity §7 retired: map_trykk («Trykk på kartet!», the far-goal map glow is gone) and map_vei_hjem (Puff's clouds show the way)
});

// the four fairies introduce themselves (DESIGN §5). fairy.js owns fairy_intro_<kind>; these are only a fallback if it is absent.
if (!F.TPL.has('fairy_intro_krystall')) {
  F.TPL.addAll({
    hud_fe_krystall: 'Jeg er Krystallfeen! Jeg lager krystaller.',
    hud_fe_blomst: 'Jeg er Blomsterfeen! Jeg får blomster til å gro.',
    hud_fe_boble: 'Jeg er Boblefeen! Jeg lager bobler.',
    hud_fe_stjerne: 'Jeg er Stjernefeen! Jeg tenner stjerner.',
  });
}
})();
