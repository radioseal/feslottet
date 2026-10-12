/* Feslottet – the shop catalogue (DESIGN §8.3). Owner: LIFE. Pure data + tiny helpers (no THREE/DOM at load time).
   F.CAT = [{id, name, word, shop, price, model, kind, slot, forNpc, stallGood, ride, use, pl, alt}]   (118 legacy + 73 WP9 = 191 items)
     id        unique key (lowercase bokmål, may contain æøå)           e.g. 'solhatt'
     name      speech/display form WITH article ('en solhatt', 'et akvarium', 'glittersko' for plurals)
     word      a simple word for reading tasks / labels (3–6 letters where possible): 'hatt'
     shop      shop id (F.SHOPS)
     price     coins – v5 WP-X (DESIGN4 §8 natural prices): by kind, 2–100 from the finite ladder 2–20, 25, 30, 35, 40, 45, 50, 60, 70, 80,
               90, 100 (= F.SETS.PRICE, extended in lines_shop.js): sweets/food 2–9, small things 10–20, wear 15–60, toys 15–80,
               furniture/garden 40–100, rides/buildings 60–100, each kingdom's dream item 100. NPC wishes use only items ≤ 20 (economy.js
               WISH_MAX: voices + the pocket-money task stay within 20); gifts for one character stay 4–20.
     model     VOX model id. MODEL ID CONTRACT for the model agents:
                 plain castable words keep the word as id (kake, ball, kanin, gitar …);
                 otherwise prefixes: w_ (wear), pet_, toy_, food_, mus_, gift_  → MODELS-2
                                     f_ (Fetårnet slot furniture), g_ (garden/plots), b_ (Byggebua), ride_ (Reisebua) → MODELS-3
                                     mag_ (Tryllebua) → LIFE draws simple fallbacks in js/game/shop.js if nobody else does
     kind      'wear'|'pet'|'slot'|'plot'|'food'|'toy'|'gift'|'ride'|'pack'|'magic'
     slot      wear: kjole|vinger|hode|sko|stav ; slot furniture: seng|teppe|lampe|gardiner|hylle|vegg|stol|akvarium|pynt1|vindu ;
               plot items: 'tomt' (any build plot) | 'paviljong' (instruments go to Musikkpaviljongen) ; pack: the pack name
     forNpc    who may WISH for it: array of roles ('konge','dronning','mia','ole','stab','by','barn') or a single npc id for gifts
     stallGood true if it can be sold at Feens bod
     ride      speed multiplier when ridden (sparkesykkel 1.3, sykkel 1.5, ponni 1.8 …)
     use       how an NPC uses it: 'wear'|'eat'|'play'|'ride'|'pet'|'place'|'read'|'music'
     alt       alternative model ids tried by F.CAT.mid() if `model` has no VOX def yet
     realm/theme/dream (WP9, themed kingdom shops only), gear ('kikkert'), also [extra shop ids that sell the same row]
     kinds (WP9) add 'gear'; wear slots add hals|hender|kappe (fairy.js WEAR maps them)
     uniq      (12.10., economy plan §3.4) true = she owns at most one: wear, pet, slot, gear, pack, ride, the glitter trails and the ride
               toys (rideToy: sykkel, sparkesykkel, rulleskøyter, skøyter). instr: an instrument (stands by Musikkpaviljongen)
   Helpers: F.CAT.byId(id), F.CAT.ofShop(shopId) (incl. `also` rows), F.CAT.themed(), F.CAT.mid(itemOrId) -> a model id that exists (or null), F.CAT.ids()
   Shops: F.SHOP_ORDER (11 generic: park market, villages), F.SHOP_THEMED (9 kingdom shops), F.SHOP_ALL (20).
   F.SHOPS = {id: {id, name, keeper:{voice, look}, kinds}} ;  F.SETS.ITEMS / GIFTS / GOODS / GOODS_PL / SHOPNAMES (finite speech sets) */
(function () {
'use strict';
const F = window.F = window.F || {};

F.SHOPS = {
  feboden:      { id: 'feboden',      name: 'Feboden',      voice: 'vk', what: 'klær' },
  dyrebutikken: { id: 'dyrebutikken', name: 'Dyrebutikken', voice: 'vm', what: 'dyr' },
  mobelbua:     { id: 'mobelbua',     name: 'Møbelbua',     voice: 'vm', what: 'møbler' },
  hagesenteret: { id: 'hagesenteret', name: 'Hagesenteret', voice: 'vk', what: 'hage' },
  bakeriet:     { id: 'bakeriet',     name: 'Bakeriet',     voice: 'vk', what: 'mat' },
  lekebutikken: { id: 'lekebutikken', name: 'Lekebutikken', voice: 'vm', what: 'leker' },
  musikkbua:    { id: 'musikkbua',    name: 'Musikkbua',    voice: 'vm', what: 'musikk' },
  reisebua:     { id: 'reisebua',     name: 'Reisebua',     voice: 'vm', what: 'reise' },
  gavebua:      { id: 'gavebua',      name: 'Gavebua',      voice: 'vk', what: 'gaver' },
  tryllebua:    { id: 'tryllebua',    name: 'Tryllebua',    voice: 'vk', what: 'trylling' },
  byggebua:     { id: 'byggebua',     name: 'Byggebua',     voice: 'vm', what: 'bygg' },
};
F.SHOP_ORDER = ['feboden', 'dyrebutikken', 'mobelbua', 'hagesenteret', 'bakeriet', 'lekebutikken', 'musikkbua', 'reisebua', 'gavebua', 'tryllebua', 'byggebua'];
// WP9 (DESIGN2 §6.2): the 9 themed kingdom shops. NOT in SHOP_ORDER (that list = the 11 generic shops of the park market / villages).
//   realm = F.REALMS id, theme = panel skin (css/shop.css .th-<theme>), job = keeper's villager look (same jobs as WP3's market STALL_JOB)
const THEMED = {
  blomsterbua: { name: 'Blomsterbua', voice: 'vk', what: 'blomster', realm: 'blomst', theme: 'blomst', job: 'blomsterselger' },
  stallen:     { name: 'Stallen',     voice: 'vm', what: 'hest',     realm: 'hest',   theme: 'hest',   job: 'bonde' },
  boblebua:    { name: 'Boblebua',    voice: 'vk', what: 'bobler',   realm: 'boble',  theme: 'boble',  job: 'batmann' },
  skjellbua:   { name: 'Skjellbua',   voice: 'vm', what: 'strand',   realm: 'skjell', theme: 'skjell', job: 'fisker' },
  kakebua:     { name: 'Kakebua',     voice: 'vk', what: 'kaker',    realm: 'kake',   theme: 'kake',   job: 'baker' },
  notebua:     { name: 'Notebua',     voice: 'vm', what: 'musikk',   realm: 'musikk', theme: 'musikk', job: 'musikant' },
  stjernebua:  { name: 'Stjernebua',  voice: 'vk', what: 'stjerner', realm: 'stjerne', theme: 'stjerne', job: 'maler' },
  vinterbua:   { name: 'Vinterbua',   voice: 'vm', what: 'vinter',   realm: 'sno',    theme: 'sno',    job: 'leketoysmaker' },
  krystallbua: { name: 'Krystallbua', voice: 'vk', what: 'krystall', realm: 'krystall', theme: 'krystall', job: 'leketoysmaker' },
};
F.SHOP_THEMED = Object.keys(THEMED);
for (const id of F.SHOP_THEMED) F.SHOPS[id] = Object.assign({ id }, THEMED[id]);
F.SHOPS.tryllebua.realm = 'regnbue';   // Regnbueslottet's market uses Tryllebua with the rainbow skin (shop.js picks the skin by context)
F.SHOP_ALL = F.SHOP_ORDER.concat(F.SHOP_THEMED);
// legacy village stalls carry data.shop:true (not an id). things_world's v_markedsbod looks up F.SHOPS[data.shop] → this hidden entry,
// and F.Shop.open('true', {thing}) resolves the real shop from F.Towns.shopsFor(thing.data.region). Non-enumerable: never listed.
Object.defineProperty(F.SHOPS, 'true', { value: { id: 'true', name: 'Butikken', voice: 'vk', resolve: true }, enumerable: false });

// role shorthands for forNpc
const ALL = ['konge', 'dronning', 'mia', 'stab', 'by', 'barn'];
const KIDS = ['mia', 'barn'];
const GROWN = ['konge', 'dronning', 'stab', 'by'];

// [id, name, word, price, kind, slot, model, forNpc, extra]
const T = {
  feboden: [
    ['sommerkjole', 'en sommerkjole', 'kjole', 30, 'wear', 'kjole', 'w_sommerkjole', ['dronning', 'mia', 'by']],
    ['ballkjole', 'en ballkjole', 'kjole', 60, 'wear', 'kjole', 'w_ballkjole', ['dronning', 'mia']],
    ['stjernekjole', 'en stjernekjole', 'kjole', 50, 'wear', 'kjole', 'w_stjernekjole', ['mia']],
    ['regnbuekjole', 'en regnbuekjole', 'kjole', 45, 'wear', 'kjole', 'w_regnbuekjole', ['mia', 'barn']],
    ['blomsterkjole', 'en blomsterkjole', 'kjole', 35, 'wear', 'kjole', 'w_blomsterkjole', ['dronning', 'by']],
    ['boblekjole', 'en boblekjole', 'kjole', 40, 'wear', 'kjole', 'w_boblekjole', ['mia']],
    ['sommerfuglvinger', 'sommerfuglvinger', 'vinger', 25, 'wear', 'vinger', 'w_sommerfuglvinger', KIDS, { pl: true }],
    ['glittervinger', 'glittervinger', 'vinger', 35, 'wear', 'vinger', 'w_glittervinger', KIDS, { pl: true }],
    ['regnbuevinger', 'regnbuevinger', 'vinger', 45, 'wear', 'vinger', 'w_regnbuevinger', ['mia'], { pl: true }],
    ['krystallvinger', 'krystallvinger', 'vinger', 60, 'wear', 'vinger', 'w_krystallvinger', null, { pl: true }],
    ['gullvinger', 'gullvinger', 'vinger', 100, 'wear', 'vinger', 'w_gullvinger', null, { pl: true }],
    ['blomsterkrans', 'en blomsterkrans', 'krans', 8, 'wear', 'hode', 'w_blomsterkrans', ['dronning', 'mia', 'barn', 'by']],
    ['tiara', 'en tiara', 'tiara', 20, 'wear', 'hode', 'w_tiara', ['mia', 'barn'], { alt: ['tiara'] }],
    ['litenkrone', 'en liten krone', 'krone', 40, 'wear', 'hode', 'w_litenkrone', ['mia'], { alt: ['krone'] }],
    ['solhatt', 'en solhatt', 'hatt', 15, 'wear', 'hode', 'w_solhatt', ['konge', 'dronning', 'stab', 'by'], { alt: ['hatt'] }],
    ['glittersko', 'glittersko', 'sko', 25, 'wear', 'sko', 'w_glittersko', KIDS, { pl: true, alt: ['sko'] }],
    ['rosasko', 'rosa sko', 'sko', 18, 'wear', 'sko', 'w_rosasko', KIDS, { pl: true, alt: ['sko'] }],
    ['stjernestav', 'en stjernestav', 'stav', 20, 'wear', 'stav', 'w_stjernestav', null],
    ['hjertestav', 'en hjertestav', 'stav', 20, 'wear', 'stav', 'w_hjertestav', null],
    ['månestav', 'en månestav', 'stav', 25, 'wear', 'stav', 'w_månestav', null],
  ],
  dyrebutikken: [
    ['andunge', 'en andunge', 'and', 12, 'pet', null, 'pet_andunge', ['mia', 'barn', 'by'], { alt: ['and'] }],
    ['marsvin', 'et marsvin', 'marsvin', 16, 'pet', null, 'pet_marsvin', KIDS],
    ['pinnsvin', 'et pinnsvin', 'pinnsvin', 25, 'pet', null, 'pet_pinnsvin', ['mia', 'by']],
    ['kanin', 'en kanin', 'kanin', 18, 'pet', null, 'kanin', ['mia', 'barn', 'by']],
    ['skilpadde', 'en skilpadde', 'skilpadde', 30, 'pet', null, 'pet_skilpadde', ['konge', 'barn']],
    ['kattunge', 'en kattunge', 'katt', 20, 'pet', null, 'pet_kattunge', ['mia', 'barn', 'by'], { alt: ['katt'] }],
    ['valp', 'en valp', 'valp', 35, 'pet', null, 'valp', ['mia', 'barn', 'by'], { alt: ['hund'] }],
    ['papegøye', 'en papegøye', 'papegøye', 60, 'pet', null, 'pet_papegøye', ['konge', 'by']],
    ['ponni', 'en ponni', 'ponni', 90, 'pet', null, 'ponni', ['mia'], { ride: 1.8, alt: ['hest'] }],
    ['enhjørningføll', 'et enhjørningføll', 'føll', 100, 'pet', null, 'pet_enhjørningføll', null, { ride: 2, alt: ['føll'] }],
    ['dyrekurv', 'en dyrekurv', 'kurv', 15, 'slot', 'kurv', 'pet_dyrekurv', null, { alt: ['kurv'] }],
    ['godbiter', 'godbiter', 'godbit', 3, 'food', null, 'pet_godbiter', ['by'], { pl: true }],
  ],
  mobelbua: [
    ['blomsterteppe', 'et blomsterteppe', 'teppe', 40, 'slot', 'teppe', 'f_blomsterteppe', ['dronning']],
    ['regnbueteppe', 'et regnbueteppe', 'teppe', 45, 'slot', 'teppe', 'f_regnbueteppe', ['mia']],
    ['stjernelampe', 'en stjernelampe', 'lampe', 25, 'slot', 'lampe', 'f_stjernelampe', ['mia']],
    ['sopplampe', 'en sopplampe', 'lampe', 20, 'slot', 'lampe', 'f_sopplampe', ['by']],
    ['rosagardiner', 'rosa gardiner', 'gardin', 30, 'slot', 'gardiner', 'f_rosagardiner', ['dronning', 'mia'], { pl: true }],
    ['stjernegardiner', 'stjernegardiner', 'gardin', 35, 'slot', 'gardiner', 'f_stjernegardiner', ['konge'], { pl: true }],
    ['bokhylle', 'en bokhylle', 'hylle', 50, 'slot', 'hylle', 'f_bokhylle', ['dronning', 'stab']],
    ['lekehylle', 'en lekehylle', 'hylle', 45, 'slot', 'hylle', 'f_lekehylle', ['mia']],
    ['hjerteseng', 'en hjerteseng', 'seng', 80, 'slot', 'seng', 'f_hjerteseng', null],
    ['himmelseng', 'en himmelseng', 'seng', 90, 'slot', 'seng', 'f_himmelseng', null],
    ['skyseng', 'en skyseng', 'seng', 100, 'slot', 'seng', 'f_skyseng', null],
    ['blomstertapet', 'en blomstertapet', 'tapet', 40, 'slot', 'vegg', 'f_blomstertapet', null],
    ['stripetapet', 'en stripetapet', 'tapet', 40, 'slot', 'vegg', 'f_stripetapet', null],
    ['gyngestol', 'en gyngestol', 'stol', 60, 'slot', 'stol', 'f_gyngestol', ['konge', 'by'], { alt: ['stol'] }],
    ['saccosekk', 'en saccosekk', 'sekk', 40, 'slot', 'stol', 'f_saccosekk', ['mia', 'barn']],
    ['akvarium', 'et akvarium', 'fisk', 70, 'slot', 'akvarium', 'f_akvarium', ['konge']],
    ['dukkehus', 'et dukkehus', 'hus', 60, 'slot', 'pynt1', 'f_dukkehus', ['mia']],
    ['litepiano', 'et lite piano', 'piano', 100, 'slot', 'pynt1', 'f_litepiano', null, { alt: ['piano'] }],
  ],
  hagesenteret: [
    ['blomsterbed', 'et blomsterbed', 'bed', 15, 'plot', 'tomt', 'g_blomsterbed', ['dronning', 'stab', 'by']],
    ['solsikker', 'solsikker', 'solsikke', 6, 'plot', 'tomt', 'g_solsikker', ['dronning', 'by'], { pl: true }],
    ['rosebusk', 'en rosebusk', 'rose', 12, 'plot', 'tomt', 'g_rosebusk', ['dronning', 'stab', 'by'], { alt: ['rose'] }],
    ['benk', 'en benk', 'benk', 40, 'plot', 'tomt', 'benk', ['konge', 'by'], { alt: ['g_benk'] }],
    ['lyktestolpe', 'en lyktestolpe', 'lykt', 45, 'plot', 'tomt', 'g_lyktestolpe', ['by']],
    ['fuglebad', 'et fuglebad', 'fugl', 30, 'plot', 'tomt', 'g_fuglebad', ['dronning', 'by']],
    ['epletre', 'et epletre', 'tre', 25, 'plot', 'tomt', 'g_epletre', ['by']],
    ['huske', 'en huske', 'huske', 50, 'plot', 'tomt', 'huske', ['mia', 'barn'], { alt: ['g_huske'] }],
    ['sklie', 'en sklie', 'sklie', 60, 'plot', 'tomt', 'sklie', ['mia', 'barn'], { alt: ['g_sklie'] }],
    ['trampoline', 'en trampoline', 'hopp', 70, 'plot', 'tomt', 'g_trampoline', ['mia', 'barn']],
    ['fontene', 'en fontene', 'vann', 90, 'plot', 'tomt', 'g_fontene', null],
    ['lysthus', 'et lysthus', 'hus', 100, 'plot', 'tomt', 'g_lysthus', null],
  ],
  bakeriet: [
    ['bolle', 'en bolle', 'bolle', 5, 'food', null, 'bolle', ALL, { stall: 1 }],
    ['vaffel', 'en vaffel', 'vaffel', 6, 'food', null, 'vaffel', ALL, { stall: 1 }],
    ['is', 'en is', 'is', 4, 'food', null, 'is', ALL, { stall: 1, alt: ['food_is'] }],
    ['saft', 'en saft', 'saft', 3, 'food', null, 'saft', ALL],
    ['kjeks', 'en kjeks', 'kjeks', 2, 'food', null, 'kjeks', ALL, { stall: 1 }],
    ['kanelbolle', 'en kanelbolle', 'bolle', 7, 'food', null, 'food_kanelbolle', GROWN, { alt: ['bolle'] }],
    ['jordbær', 'jordbær', 'bær', 8, 'food', null, 'food_jordbær', ALL, { pl: true }],
    ['muffins', 'en muffins', 'kake', 7, 'food', null, 'food_muffins', ALL],
    ['kake', 'en kake', 'kake', 9, 'food', null, 'kake', ALL, { stall: 1 }],
    ['bløtkake', 'en bløtkake', 'kake', 20, 'food', null, 'food_bløtkake', ['konge', 'dronning', 'mia'], { alt: ['kake'] }],
  ],
  lekebutikken: [
    ['ball', 'en ball', 'ball', 15, 'toy', null, 'ball', ['mia', 'ole', 'barn', 'by']],
    ['hoppetau', 'et hoppetau', 'tau', 15, 'toy', null, 'toy_hoppetau', KIDS],
    ['såpebobler', 'såpebobler', 'boble', 8, 'toy', null, 'toy_såpebobler', ['mia', 'ole', 'barn'], { pl: true }],
    ['drage', 'en drage', 'drage', 25, 'toy', null, 'drage', ['mia', 'barn', 'by']],
    ['dukke', 'en dukke', 'dukke', 30, 'toy', null, 'dukke', KIDS],
    ['bamse', 'en bamse', 'bamse', 20, 'toy', null, 'bamse', ['mia', 'ole', 'barn']],
    ['sparkesykkel', 'en sparkesykkel', 'sykkel', 50, 'toy', null, 'toy_sparkesykkel', KIDS, { ride: 1.3 }],
    ['rulleskøyter', 'rulleskøyter', 'skøyte', 45, 'toy', null, 'toy_rulleskøyter', KIDS, { pl: true, ride: 1.2 }],
    ['sykkel', 'en sykkel', 'sykkel', 60, 'toy', null, 'sykkel', ['mia', 'barn', 'by'], { ride: 1.5 }],
  ],
  musikkbua: [
    ['fløyte', 'en fløyte', 'fløyte', 15, 'plot', 'paviljong', 'fløyte', ['barn', 'by'], { use: 'music' }],
    ['tromme', 'en tromme', 'tromme', 20, 'plot', 'paviljong', 'tromme', ['ole', 'barn', 'stab'], { use: 'music' }],
    ['xylofon', 'en xylofon', 'xylofon', 30, 'plot', 'paviljong', 'mus_xylofon', ['mia', 'barn'], { use: 'music' }],
    ['gitar', 'en gitar', 'gitar', 60, 'plot', 'paviljong', 'gitar', ['by'], { use: 'music' }],
    ['harpe', 'en harpe', 'harpe', 100, 'plot', 'paviljong', 'harpe', null, { use: 'music' }],
  ],
  reisebua: [
    ['robåt', 'en robåt', 'båt', 80, 'ride', 'tomt', 'ride_robåt', ['by'], { ride: 1.2, alt: ['båt'] }],
    ['hestevogn', 'en hestevogn', 'vogn', 90, 'ride', 'tomt', 'ride_hestevogn', null, { ride: 1.6 }],
    ['luftballong', 'en luftballong', 'ballong', 100, 'ride', 'tomt', 'ride_luftballong', null, { ride: 1 }],
  ],
  gavebua: [
    ['tøfler', 'tøfler til kongen', 'tøfler', 18, 'gift', null, 'gift_tøfler', 'konge', { pl: true, use: 'wear', slot2: 'sko' }],
    ['kongehatt', 'en kongehatt', 'hatt', 20, 'gift', null, 'gift_kongehatt', 'konge', { use: 'wear', slot2: 'hode', alt: ['hatt'] }],
    ['lesebriller', 'lesebriller', 'briller', 15, 'gift', null, 'gift_lesebriller', 'dronning', { pl: true, use: 'wear', slot2: 'ansikt' }],
    ['perlekjede', 'et perlekjede', 'kjede', 20, 'gift', null, 'gift_perlekjede', 'dronning', { use: 'wear', slot2: 'hals', alt: ['kjede'] }],
    ['hagehansker', 'hagehansker', 'hanske', 12, 'gift', null, 'gift_hagehansker', 'dronning', { pl: true, use: 'wear', slot2: 'hender' }],
    ['miatiara', 'en tiara til Mia', 'tiara', 16, 'gift', null, 'w_tiara', 'mia', { use: 'wear', slot2: 'hode', alt: ['tiara', 'gift_tiara'] }],
    ['olebamse', 'en bamse til Ole', 'bamse', 14, 'gift', null, 'bamse', 'ole', { use: 'play' }],
    ['tassbein', 'et hundebein til Tass', 'bein', 4, 'gift', null, 'gift_bein', 'tass', { use: 'eat' }],
    ['garnnøste', 'et garnnøste til Rolf', 'garn', 5, 'gift', null, 'gift_garnnøste', 'rolf', { use: 'play' }],
    ['kokkelue', 'en kokkelue til Kari', 'lue', 13, 'gift', null, 'gift_kokkelue', 'kokk', { use: 'wear', slot2: 'hode', alt: ['lue'] }],
    ['vannkanne', 'en vannkanne til Tor', 'kanne', 17, 'gift', null, 'gift_vannkanne', 'tor', { use: 'play', alt: ['kanne'] }],
  ],
  tryllebua: [
    ['pakke_dyr', 'trylleord om dyr', 'dyr', 30, 'pack', 'dyr', 'mag_bok', null, { opts: { c: 'mint' } }],
    ['pakke_mat', 'trylleord om mat', 'mat', 25, 'pack', 'mat', 'mag_bok', null, { opts: { c: 'butter' } }],
    ['pakke_leker', 'trylleord om leker', 'leke', 25, 'pack', 'leker', 'mag_bok', null, { opts: { c: 'sky' } }],
    ['pakke_klær', 'trylleord om klær', 'klær', 25, 'pack', 'klær', 'mag_bok', null, { opts: { c: 'rose' } }],
    ['pakke_hage', 'trylleord om hagen', 'hage', 20, 'pack', 'hage', 'mag_bok', null, { opts: { c: 'leaf' } }],
    ['pakke_eventyr', 'trylleord fra eventyr', 'eventyr', 35, 'pack', 'eventyr', 'mag_bok', null, { opts: { c: 'lilac' } }],
    ['glittersti_rosa', 'en rosa glittersti', 'sti', 10, 'magic', 'sti', 'mag_glittersti', null, { opts: { c: 'rose' } }],
    ['glittersti_gull', 'en gyllen glittersti', 'sti', 12, 'magic', 'sti', 'mag_glittersti', null, { opts: { c: 'gold' } }],
    ['glittersti_regnbue', 'en regnbuesti', 'sti', 15, 'magic', 'sti', 'mag_glittersti', null, { opts: { c: 'rainbow' } }],
    ['fyrverkeri', 'et fyrverkeri', 'rakett', 20, 'magic', null, 'mag_fyrverkeri', ['konge', 'mia']],
    ['regnbuemaskin', 'en regnbuemaskin', 'regnbue', 60, 'magic', 'tomt', 'mag_regnbuemaskin', null],
    ['snøkule', 'en snøkule', 'snø', 18, 'magic', null, 'mag_snøkule', ['mia', 'barn']],
  ],
  byggebua: [
    ['lekehus', 'et lekehus', 'hus', 70, 'plot', 'tomt', 'b_lekehus', null],
    ['iskiosk', 'en iskiosk', 'is', 80, 'plot', 'tomt', 'b_iskiosk', null],
    ['feensbod', 'en bod', 'bod', 60, 'plot', 'tomt', 'b_feensbod', null],
    ['vindmølle', 'en vindmølle', 'mølle', 90, 'plot', 'tomt', 'b_vindmølle', null],
    ['karusell', 'en karusell', 'karusell', 100, 'plot', 'tomt', 'b_karusell', null],
    ['pariserhjul', 'et pariserhjul', 'hjul', 100, 'plot', 'tomt', 'b_pariserhjul', null],
  ],
  /* ---- WP9: themed kingdom shops (DESIGN2 §6.2). 7 everyday items at 7 different (v5: natural) prices + 1 dream item each (the last row).
     Speech rules (§6.5): forNpc null (never in GIFTS), stallGood false (GOODS_PL unchanged). Models: js/models/m_shop2.js. */
  blomsterbua: [
    ['frøpose', 'en frøpose', 'frø', 3, 'plot', 'tomt', 'g_frøpose', null],
    ['tulipanhatt', 'en tulipanhatt', 'hatt', 18, 'wear', 'hode', 'w_tulipanhatt', null],
    ['blomsterkrone', 'en blomsterkrone', 'krone', 25, 'wear', 'hode', 'w_blomsterkrone', null],
    ['rosekjole', 'en rosekjole', 'kjole', 40, 'wear', 'kjole', 'w_rosekjole', null],
    ['humlehus', 'et humlehus', 'hus', 30, 'plot', 'tomt', 'g_humlehus', null],
    ['blomsterbue', 'en blomsterbue', 'bue', 45, 'plot', 'tomt', 'g_blomsterbue', null],
    ['rosevinger', 'rosevinger', 'vinger', 50, 'wear', 'vinger', 'w_rosevinger', null, { pl: true }],
    ['blomstervogn', 'en blomstervogn', 'vogn', 100, 'ride', 'tomt', 'ride_blomstervogn', null, { ride: 1.4 }],
  ],
  stallen: [
    ['gulrøtter', 'gulrøtter', 'gulrot', 3, 'food', null, 'food_gulrøtter', null, { pl: true, alt: ['gulrot'] }],
    ['hestebørste', 'en hestebørste', 'børste', 12, 'toy', null, 'toy_hestebørste', null, { alt: ['børste'] }],
    ['ridehjelm', 'en ridehjelm', 'hjelm', 30, 'wear', 'hode', 'w_ridehjelm', null, { alt: ['hjelm'] }],
    ['hestesko', 'en hestesko', 'hestesko', 15, 'slot', 'vegg', 'f_hestesko', null],
    ['ponniflette', 'en ponniflette', 'flette', 8, 'wear', 'hode', 'w_ponniflette', null],
    ['stallykt', 'en stallykt', 'lykt', 25, 'slot', 'lampe', 'f_stallykt', null, { alt: ['lykt'] }],
    ['sal', 'en sal', 'sal', 60, 'toy', null, 'toy_sal', null],
    ['gullsal', 'en gullsal', 'sal', 100, 'ride', 'tomt', 'ride_gullsal', null, { ride: 1.5 }],
  ],
  boblebua: [
    ['badeand', 'en badeand', 'and', 6, 'toy', null, 'toy_badeand', null, { alt: ['and'] }],
    ['såpe', 'en såpe', 'såpe', 4, 'toy', null, 'toy_såpe', null, { alt: ['såpe'] }],
    ['regnstøvler', 'regnstøvler', 'støvel', 25, 'wear', 'sko', 'w_regnstøvler', null, { pl: true }],
    ['boblemaskin', 'en boblemaskin', 'boble', 40, 'plot', 'tomt', 'g_boblemaskin', null, { alt: ['p_boblemaskin'] }],
    ['boblekrone', 'en boblekrone', 'krone', 30, 'wear', 'hode', 'w_boblekrone', null],
    ['gullfisk', 'en gullfisk', 'fisk', 18, 'pet', null, 'pet_gullfisk', null, { alt: ['fisk'] }],
    ['bobleseng', 'en bobleseng', 'seng', 80, 'slot', 'seng', 'f_bobleseng', null],
    ['bobleballong', 'en bobleballong', 'ballong', 100, 'ride', 'tomt', 'ride_bobleballong', null, { ride: 1 }],
  ],
  skjellbua: [
    ['sandbøtte', 'en sandbøtte', 'bøtte', 15, 'toy', null, 'toy_sandbøtte', null, { alt: ['bøtte'] }],
    ['skjellkjede', 'et skjellkjede', 'kjede', 20, 'wear', 'hals', 'w_skjellkjede', null],
    ['fiskemat', 'fiskemat', 'mat', 4, 'food', null, 'food_fiskemat', null, { pl: true }],
    ['badering', 'en badering', 'ring', 18, 'toy', null, 'toy_badering', null],
    ['parasoll', 'en parasoll', 'parasoll', 35, 'plot', 'tomt', 'g_parasoll', null],
    ['perlekrone', 'en perlekrone', 'krone', 45, 'wear', 'hode', 'w_perlekrone', null],
    ['sjøstjernevinger', 'sjøstjernevinger', 'vinger', 50, 'wear', 'vinger', 'w_sjøstjernevinger', null, { pl: true }],
    ['glassbunnsbåt', 'en glassbunnsbåt', 'båt', 100, 'ride', 'tomt', 'ride_glassbunnsbåt', null, { ride: 1.2, alt: ['båt'] }],
  ],
  kakebua: [
    ['smultring', 'en smultring', 'smultring', 4, 'food', null, 'food_smultring', null],
    ['karamell', 'en karamell', 'karamell', 2, 'food', null, 'food_karamell', null],
    ['kakehatt', 'en kakehatt', 'hatt', 20, 'wear', 'hode', 'w_kakehatt', null],
    ['nøttepose', 'en nøttepose', 'nøtt', 5, 'food', null, 'food_nøttepose', null, { alt: ['nøtt'] }],
    ['sukkerspinn', 'et sukkerspinn', 'sukkerspinn', 6, 'food', null, 'food_sukkerspinn', null],
    ['kakekjole', 'en kakekjole', 'kjole', 45, 'wear', 'kjole', 'w_kakekjole', null],
    ['pepperkakehus', 'et pepperkakehus', 'hus', 60, 'slot', 'pynt1', 'f_pepperkakehus', null],
    ['sjokoladefontene', 'en sjokoladefontene', 'fontene', 100, 'plot', 'tomt', 'g_sjokoladefontene', null],
  ],
  notebua: [
    ['bjeller', 'bjeller', 'bjelle', 9, 'toy', null, 'toy_bjeller', null, { pl: true, alt: ['bjelle'], use: 'music' }],
    ['sangbok', 'en sangbok', 'bok', 15, 'toy', null, 'toy_sangbok', null, { alt: ['bok'] }],
    ['blokkfløyte', 'en blokkfløyte', 'fløyte', 20, 'toy', null, 'toy_blokkfløyte', null, { alt: ['fløyte'], use: 'music' }],
    ['spilledåse', 'en spilledåse', 'dåse', 35, 'slot', 'pynt1', 'f_spilledåse', null, { alt: ['c_spilledase'] }],
    ['trekkspill', 'et trekkspill', 'trekkspill', 60, 'toy', null, 'toy_trekkspill', null, { use: 'music' }],
    ['fiolin', 'en fiolin', 'fiolin', 70, 'toy', null, 'fiolin', null, { use: 'music' }],
    ['notekjole', 'en notekjole', 'kjole', 45, 'wear', 'kjole', 'w_notekjole', null],
    ['konsertscene', 'en konsertscene', 'scene', 100, 'plot', 'tomt', 'g_konsertscene', null],
  ],
  stjernebua: [
    ['nattlampe', 'en nattlampe', 'lampe', 20, 'slot', 'lampe', 'f_nattlampe', null],
    ['månesko', 'månesko', 'sko', 25, 'wear', 'sko', 'w_månesko', null, { pl: true }],
    ['månelampe', 'en månelampe', 'måne', 35, 'slot', 'lampe', 'f_månelampe', null],
    ['stjernehatt', 'en stjernehatt', 'hatt', 18, 'wear', 'hode', 'w_stjernehatt', null],
    ['stjernekappe', 'en stjernekappe', 'kappe', 45, 'wear', 'kappe', 'w_stjernekappe', null],
    ['stjernekart', 'et stjernekart', 'kart', 15, 'slot', 'vegg', 'f_stjernekart', null],
    ['stjernevinger', 'stjernevinger', 'vinger', 50, 'wear', 'vinger', 'w_stjernevinger', null, { pl: true }],
    ['teleskop', 'et teleskop', 'teleskop', 100, 'slot', 'pynt1', 'f_teleskop', null, { alt: ['c_teleskop'] }],
  ],
  vinterbua: [
    ['vinterlue', 'en lue', 'lue', 15, 'wear', 'hode', 'w_vinterlue', null, { alt: ['lue'] }],
    ['votter', 'votter', 'vott', 12, 'wear', 'hender', 'w_votter', null, { pl: true, alt: ['vott'] }],
    ['skjerf', 'et skjerf', 'skjerf', 18, 'wear', 'hals', 'w_skjerf', null, { alt: ['skjerf'] }],
    ['kakao', 'en kakao', 'kakao', 5, 'food', null, 'food_kakao', null, { alt: ['kakao'] }],
    ['snømannsett', 'et snømannsett', 'snø', 25, 'plot', 'tomt', 'g_snømann', null, { alt: ['n_snomann'] }],
    ['skøyter', 'skøyter', 'skøyte', 45, 'toy', null, 'toy_skøyter', null, { pl: true, ride: 1.2 }],
    ['akebrett', 'et akebrett', 'brett', 35, 'toy', null, 'toy_akebrett', null],
    ['kanefart', 'en kane', 'kane', 100, 'ride', 'tomt', 'ride_kane', null, { ride: 1.5, alt: ['slede'] }],
  ],
  krystallbua: [
    ['krystallhatt', 'en krystallhatt', 'hatt', 25, 'wear', 'hode', 'w_krystallhatt', null],
    ['krystallampe', 'en krystallampe', 'lampe', 40, 'slot', 'lampe', 'f_krystallampe', null],
    ['krystallsko', 'krystallsko', 'sko', 35, 'wear', 'sko', 'w_krystallsko', null, { pl: true }],
    ['krystallkjede', 'et krystallkjede', 'kjede', 30, 'wear', 'hals', 'w_krystallkjede', null],
    ['krystallstav', 'en krystallstav', 'stav', 20, 'toy', null, 'toy_krystallstav', null],
    ['krystallkjole', 'en krystallkjole', 'kjole', 60, 'wear', 'kjole', 'w_krystallkjole', null],
    ['glimtstein', 'en glimtstein', 'stein', 9, 'toy', null, 'toy_glimtstein', null, { alt: ['stein'] }],
    ['krystallslott', 'et lite krystallslott', 'slott', 100, 'slot', 'pynt1', 'f_krystallslott', null],
  ],
};
// WP9 gear (DESIGN2 §6.2/6.3): changes what she meets and how easily she sees it – never catch chance. Reisebua, from day 1.
T.reisebua.push(['kikkert', 'en kikkert', 'kikkert', 30, 'gear', null, 'gear_kikkert', null, { gear: 'kikkert' }]);
// rows also sold in another shop (same item, same price): Tryllebua's rainbow stock (§6.2 row 10)
const ALSO = { regnbuekjole: ['tryllebua'] };
const USE = { wear: 'wear', pet: 'pet', slot: 'place', plot: 'place', food: 'eat', toy: 'play', gift: 'play', ride: 'ride', pack: 'read', magic: 'play' };

USE.gear = 'play';
const UNIQ_KIND = { wear: 1, pet: 1, slot: 1, gear: 1, pack: 1, ride: 1 };
const CAT = F.CAT = [];
for (const shop of F.SHOP_ALL) for (const r of T[shop]) {
  const [id, name, word, price, kind, slot, model, forNpc, x] = r, e = x || {}, S = F.SHOPS[shop], last = r === T[shop][T[shop].length - 1];
  const row = { id, name, word, shop, price, model, kind, slot: slot || e.slot2 || null, forNpc: forNpc || null, stallGood: !!e.stall,
    ride: e.ride || 0, use: e.use || (e.ride && kind !== 'pet' ? 'ride' : USE[kind]), pl: !!e.pl, alt: e.alt || [], opts: e.opts || null };
  if (S.theme) { row.realm = S.realm; row.theme = S.theme; row.dream = last; }   // WP9 fields (§6.2); v5: the dream item = each themed list's last row (prices are natural now)
  if (e.gear) row.gear = e.gear;
  if (ALSO[id]) row.also = ALSO[id];
  // economy plan §3.4 (12.10.): one of each for what she wears, keeps or rides – a second one would do nothing, so the shop
  // shows «Bruk» instead of taking her coins again. Food, toys, gifts, plot items and fireworks stay repeatable.
  row.uniq = UNIQ_KIND[kind] === 1 || (kind === 'magic' && row.slot === 'sti') || (kind === 'toy' && !!row.ride);
  if (kind === 'toy' && row.ride) row.rideToy = true;          // bikes, scooter, skates: she rides them (economy.js life_ride)
  if (kind === 'plot' && row.slot === 'paviljong') { row.instr = true; row.uniq = true; }   // instruments stand by Musikkpaviljongen (economy.js life_instr): one of each
  CAT.push(row);
}
const BY = {}; CAT.forEach(c => { BY[c.id] = c; });
Object.defineProperty(CAT, 'byId', { value: id => BY[id] || null });
Object.defineProperty(CAT, 'ids', { value: () => CAT.map(c => c.id) });
Object.defineProperty(CAT, 'ofShop', { value: shop => CAT.filter(c => c.shop === shop || (c.also && c.also.includes(shop))) });
Object.defineProperty(CAT, 'themed', { value: () => CAT.filter(c => !!c.theme) });
Object.defineProperty(CAT, 'models', { value: () => [...new Set(CAT.map(c => c.model))] });
// model id that exists right now (primary, then alternatives, then the plain word) – null if none (caller draws a fallback)
Object.defineProperty(CAT, 'mid', { value: it => {
  const c = typeof it === 'string' ? BY[it] : it; if (!c) return null;
  const has = F.VOX && F.VOX.has ? F.VOX.has : () => false;
  for (const m of [c.model, ...c.alt, c.word]) if (m && has(m)) return m;
  return null;
} });

/* ---------------------------------------------------------- finite speech sets owned by LIFE */
F.SETS = F.SETS || {};
F.SETS.ITEMS = [...new Set(CAT.map(c => c.name))];                       // 118 + 73 (WP9) «en solhatt» forms (narrator only: eco_kjøpt)
F.SETS.SHOPNAMES = F.SHOP_ALL.map(s => F.SHOPS[s].name);                  // 11 + 9 themed (eco_velkommen × vm/vk)
// 30 wishable items (wish bubbles, NPC buying, Kongeposten «Mia kjøpte en kattunge»)
F.GIFT_IDS = ['tøfler', 'kongehatt', 'lesebriller', 'perlekjede', 'hagehansker', 'miatiara', 'olebamse', 'tassbein', 'garnnøste', 'kokkelue', 'vannkanne',
  'kake', 'bløtkake', 'bolle', 'is', 'vaffel', 'ball', 'drage', 'dukke', 'bamse', 'sparkesykkel', 'sykkel', 'kattunge', 'valp', 'kanin', 'andunge',
  'solhatt', 'blomsterkrans', 'fløyte', 'tromme'];
// spoken short form when a royal talks about the gift («Jeg ønsker meg nye tøfler.», «Kongen kjøpte nye tøfler.»); ITEMS keeps «tøfler til kongen»
F.GIFT_SAY = { 'tøfler': 'nye tøfler', miatiara: 'en ny tiara', olebamse: 'en bamse', tassbein: 'et hundebein', 'garnnøste': 'et garnnøste', kokkelue: 'en kokkelue', vannkanne: 'en vannkanne' };
F.giftName = id => F.GIFT_SAY[id] || (BY[id] ? BY[id].name : String(id));
F.SETS.GIFTS = [...new Set(F.GIFT_IDS.map(F.giftName))];
// 20 stall goods (her stall «Feens bod»): singular word → plural for «Kan jeg få 14 roser?»
F.GOODS = { kake: 'kaker', bolle: 'boller', rose: 'roser', eple: 'epler', egg: 'egg', blomst: 'blomster', is: 'is', kjeks: 'kjeks', vaffel: 'vafler',
  gulrot: 'gulrøtter', skjell: 'skjell', krystall: 'krystaller', pære: 'pærer', banan: 'bananer', perle: 'perler', hjerte: 'hjerter', plomme: 'plommer',
  nøtt: 'nøtter', brød: 'brød', lys: 'lys' };
F.SETS.GOODS = Object.keys(F.GOODS);
F.SETS.GOODS_PL = Object.values(F.GOODS);
})();
