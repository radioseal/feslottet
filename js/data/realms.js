/* Feslottet – the ten kingdoms (DESIGN2 §3.1, data contract; owner WP7). Pure data + tiny lookups, no runtime work.
   F.REALMS = [row × 10] in k order.  Lookups: F.REALMS.byId[id], F.REALMS.get(id), F.REALMS.royal(actorId) -> {realm, who:'k'|'q'|'c', r}
   Row: { id, k, castle, biome, minRing, size, pal{wall,wall2,roof,trim,flag}, roof, roof2, finial, emblem, style?, rainbow?,
          king|queen|child: { id:'r_<id>_k|q|c', name, short, title, voice, cvoice:null, role, look (ch_person opts, see m_people.js) },
          quirk:{ who, anim, lines:[2 own-voice line ids], child:'roy_c_<id>' }, goods, words[5] (RQ4 sign words, lexicon-checked),
          creature, shop, shopName, gift{id,name,spot}, rooms[], props[2] }
   Look opts are ch_person options; hat 'litenkrone' = a small adult crown (m_people.js). look.emblem = emblem on the cape back.
   Sign-word check (WP7, 2026-10-10, _dev/lexicon_3to6.json ∪ F.WORDS, 3–6 letters): swapped stall→føll, tone→dans, glans→natt,
   is→kald, glimt→glass. Name swap: Prins Bo → Prins Brage (reserve list; «Bo» reads as the verb or Swedish).
   Sets: F.SETS.REALMS (castle names), F.SETS.FAMILIES («Kong Ask og Dronning Rosa»), F.SETS.REALM_GOODS. */
(function () {
'use strict';
const F = window.F = window.F || {};

const R = (o) => o;
const K = (realm, name, voice, look) => ({ id: 'r_' + realm + '_k', name: 'Kong ' + name, short: name, title: 'Kong', voice, cvoice: null, role: 'rkonge',
  look: Object.assign({ outfit: 'kappe', hat: 'krone', shoeCol: 'woodDark' }, look) });
const Q = (realm, name, voice, look) => ({ id: 'r_' + realm + '_q', name: 'Dronning ' + name, short: name, title: 'Dronning', voice, cvoice: null, role: 'rdronning',
  look: Object.assign({ outfit: 'kjole', hat: 'krone', lashes: true }, look) });
const C = (realm, title, name, look) => ({ id: 'r_' + realm + '_c', name: title + ' ' + name, short: name, title, voice: 'barn', cvoice: null, role: 'rbarn',
  look: Object.assign({ age: 'barn', hat: title === 'Prinsesse' ? 'tiara' : 'krone' }, title === 'Prinsesse' ? { lashes: true } : {}, look) });
const QL = id => ['roy_q_' + id + '_1', 'roy_q_' + id + '_2'];

const REALMS = [
  R({ id: 'blomst', k: 1, castle: 'Blomsterslottet', biome: 'blomstereng', minRing: 1, size: 'middels',
    pal: { wall: 'blossom', wall2: 'white', roof: 'roofPink', trim: 'rose', flag: 'pink' }, roof: 'cone', roof2: 'spire', finial: 'flower', emblem: 'flower',
    king: K('blomst', 'Ask', 'rk1', { skin: 'skin', hair: 'kort', hairCol: 'hairBrown', acc: ['skjegg'], beardCol: 'hairBrown', outfitCol: 'green', sleeveCol: 'green', capeCol: 'pink', pantsCol: 'white', emblem: 'flower' }),
    queen: Q('blomst', 'Rosa', 'rd1', { skin: 'skin', hair: 'krøller', hairCol: 'hairRed', outfitCol: 'rose', skirtCol: 'blossom', trimCol: 'white', sleeveCol: 'rose', shoeCol: 'rose', emblem: 'flower' }),
    child: C('blomst', 'Prinsesse', 'Fia', { skin: 'skin', hair: 'hestehale', hairCol: 'hairBrown', outfit: 'kjole', outfitCol: 'blossom', skirtCol: 'pink', trimCol: 'white', sleeveCol: 'blossom', ribbonCol: 'leaf2', shoeCol: 'pink' }),
    quirk: { who: 'q', anim: 'flowerTalk', lines: QL('blomst'), child: 'roy_c_blomst' },
    goods: 'roser', words: ['rose', 'blad', 'vase', 'frø', 'bie'], creature: 'rådyr', shop: 'blomsterbua', shopName: 'Blomsterbua',
    gift: { id: 'g_rosebusk', name: 'rosebusk', spot: 'court_bed' }, rooms: ['ballsal', 'inngang', 'tronsal', 'spisesal'], props: ['rosebue', 'blomsterbed'] }),

  R({ id: 'hest', k: 2, castle: 'Hesteslottet', biome: 'gardsland', minRing: 1, size: 'middels',
    pal: { wall: 'cream', wall2: 'woodRed', roof: 'roofRed', trim: 'honey', flag: 'red' }, roof: 'stepped', roof2: 'cone', finial: 'horse', emblem: 'horseshoe',
    king: K('hest', 'Trym', 'rk2', { skin: 'skin2', hair: 'kort', hairCol: 'hairBlond', acc: ['bart'], beardCol: 'hairBlond', outfitCol: 'honey', sleeveCol: 'honey', capeCol: 'woodRed', pantsCol: 'brown', crownTilt: 1, emblem: 'horseshoe' }),
    queen: Q('hest', 'Hedda', 'rd2', { skin: 'skin2', hair: 'hestehale', hairCol: 'hairBlond', outfitCol: 'honey', skirtCol: 'cream', trimCol: 'woodRed', sleeveCol: 'honey', hat: 'litenkrone', shoeCol: 'woodRed', emblem: 'horseshoe' }),
    child: C('hest', 'Prins', 'Sander', { skin: 'skin2', hair: 'kort', hairCol: 'hairBlond', outfit: 'bukse', outfitCol: 'red', pantsCol: 'cream', sleeveCol: 'red', shoeCol: 'woodDark' }),
    quirk: { who: 'c', anim: 'pony', lines: QL('hest'), child: 'roy_c_hest', pony: true },
    goods: 'gulrøtter', words: ['hest', 'sal', 'høy', 'eple', 'føll'], creature: 'kalv', shop: 'stallen', shopName: 'Stallen',
    gift: { id: 'g_hestesko', name: 'gullhestesko', spot: 'keep_door' }, rooms: ['kjokken', 'inngang', 'tronsal', 'spisesal'], props: ['hesteskobue', 'stall'] }),

  R({ id: 'boble', k: 3, castle: 'Bobleslottet', biome: 'innsjo', minRing: 2, size: 'liten',
    pal: { wall: 'white', wall2: 'sky', roof: 'teal', trim: 'ice', flag: 'sky' }, roof: 'dome', roof2: 'cone', finial: 'bubble', emblem: 'bubble', glassRoof: true,
    king: K('boble', 'Bjørn', 'rk1', { skin: 'skin3', round: true, hair: 'krøller', hairCol: 'hairBlack', acc: ['skjegg'], beardCol: 'hairBlack', outfitCol: 'teal', sleeveCol: 'teal', capeCol: 'sky', pantsCol: 'white', emblem: 'bubble' }),
    queen: Q('boble', 'Tiril', 'rd1', { skin: 'skin3', hair: 'krøller', hairCol: 'hairBlack', outfitCol: 'sky', skirtCol: 'ice', trimCol: 'white', sleeveCol: 'sky', hat: 'tiara', acc: ['halskjede'], shoeCol: 'teal', emblem: 'bubble' }),
    child: C('boble', 'Prins', 'Otto', { skin: 'skin3', hair: 'krøller', hairCol: 'hairBlack', outfit: 'bukse', outfitCol: 'teal', pantsCol: 'white', sleeveCol: 'teal', acc: ['briller'], glassCol: 'sky', shoeCol: 'navySoft' }),
    quirk: { who: 'k', anim: 'bubbles', lines: QL('boble'), child: 'roy_c_boble' },
    goods: 'bobler', words: ['boble', 'såpe', 'and', 'båt', 'vann'], creature: 'oter', shop: 'boblebua', shopName: 'Boblebua',
    gift: { id: 'g_boblefontene', name: 'boblefontene', spot: 'court' }, rooms: ['bad', 'inngang', 'tronsal', 'ballsal'], props: ['boblefontene', 'båt'] }),

  R({ id: 'skjell', k: 4, castle: 'Skjellslottet', biome: 'strand', minRing: 2, size: 'middels',
    pal: { wall: 'white', wall2: 'cream2', roof: 'teal', trim: 'sand', flag: 'teal' }, roof: 'dome', roof2: 'cone', finial: 'shell', emblem: 'shell', pier: true,
    king: K('skjell', 'Vidar', 'rk2', { skin: 'skin4', hair: 'skallet', hairCol: 'hairGrey', acc: ['skjegg'], beardCol: 'hairGrey', outfitCol: 'navySoft', sleeveCol: 'navySoft', capeCol: 'teal', pantsCol: 'sand', emblem: 'shell' }),
    queen: Q('skjell', 'Perle', 'rd2', { skin: 'skin4', hair: 'lang', hairCol: 'hairBlack', outfitCol: 'white', skirtCol: 'teal', trimCol: 'sand', sleeveCol: 'white', hat: 'tiara', acc: ['halskjede'], shoeCol: 'teal', emblem: 'shell' }),
    child: C('skjell', 'Prins', 'Jo', { skin: 'skin4', hair: 'kort', hairCol: 'hairBlack', outfit: 'sjø', outfitCol: 'sky', pantsCol: 'white', sleeveCol: 'sky', shoeCol: 'white' }),
    quirk: { who: 'k', anim: 'shellCount', lines: QL('skjell'), child: 'roy_c_skjell' },
    goods: 'skjell', words: ['skjell', 'sand', 'krabbe', 'båt', 'hav'], creature: 'sel', shop: 'skjellbua', shopName: 'Skjellbua',
    gift: { id: 'g_storskjell', name: 'stort skjell', spot: 'bad' }, rooms: ['bad', 'inngang', 'tronsal', 'spisesal'], props: ['brygge', 'skjellhaug'] }),

  R({ id: 'kake', k: 5, castle: 'Kakeslottet', biome: 'frukthage', minRing: 2, size: 'liten',
    pal: { wall: 'peach', wall2: 'cream', roof: 'roofPink', trim: 'cherry', flag: 'orange' }, roof: 'stepped', roof2: 'cone', finial: 'cherry', emblem: 'cake',
    king: K('kake', 'Kanel', 'rk1', { skin: 'skin2', round: true, hair: 'kort', hairCol: 'hairBrown', acc: ['skjegg'], beardCol: 'woodLight', outfitCol: 'cherry', sleeveCol: 'cherry', capeCol: 'cream', pantsCol: 'brown', emblem: 'cake' }),
    queen: Q('kake', 'Mandel', 'rd1', { skin: 'skin2', hair: 'bob', hairCol: 'hairBrown', outfitCol: 'peach', skirtCol: 'cream', trimCol: 'cherry', sleeveCol: 'peach', pattern: 'prikker', patternCol: 'cherry', shoeCol: 'cherry', emblem: 'cake' }),
    child: C('kake', 'Prinsesse', 'Muffi', { skin: 'skin2', hair: 'bob', hairCol: 'hairRed', outfit: 'kjole', outfitCol: 'cherry', skirtCol: 'peach', trimCol: 'cream', sleeveCol: 'cherry', pattern: 'hjerte', patternCol: 'cream', shoeCol: 'orange' }),
    quirk: { who: 'k', anim: 'crumbs', lines: QL('kake'), child: 'roy_c_kake' },
    goods: 'kaker', words: ['kake', 'eple', 'bolle', 'deig', 'mel'], creature: 'hakkespett', shop: 'kakebua', shopName: 'Kakebua',
    gift: { id: 'g_kakefat', name: 'kakefat', spot: 'spisesal' }, rooms: ['kjokken', 'spisesal', 'inngang', 'tronsal'], props: ['kakefontene', 'epletre-rad'] }),

  R({ id: 'musikk', k: 6, castle: 'Musikkslottet', biome: 'vindmolle', minRing: 2, size: 'middels',
    pal: { wall: 'white', wall2: 'navySoft', roof: 'roofBlue', trim: 'gold', flag: 'blue' }, roof: 'sail', roof2: 'cone', finial: 'note', emblem: 'note',
    king: K('musikk', 'Pål', 'rk2', { skin: 'skin', hair: 'kort', hairCol: 'hairRed', acc: ['bart', 'fløyte'], beardCol: 'hairRed', outfitCol: 'navySoft', sleeveCol: 'navySoft', capeCol: 'blue', pantsCol: 'white', crownTilt: -1, emblem: 'note' }),
    queen: Q('musikk', 'Åse', 'rd2', { skin: 'skin', hair: 'flette', hairCol: 'hairRed', outfitCol: 'roofBlue', skirtCol: 'navySoft', trimCol: 'gold', sleeveCol: 'roofBlue', shoeCol: 'gold', emblem: 'note' }),
    child: C('musikk', 'Prinsesse', 'Tone', { skin: 'skin', hair: 'fletter', hairCol: 'hairRed', outfit: 'kjole', outfitCol: 'blue', skirtCol: 'white', trimCol: 'gold', sleeveCol: 'blue', pattern: 'striper', patternCol: 'white', ribbonCol: 'gold', shoeCol: 'navySoft' }),
    quirk: { who: 'k', anim: 'tralala', lines: QL('musikk'), child: 'roy_c_musikk' },
    goods: 'bjeller', words: ['bjelle', 'dans', 'sang', 'fløyte', 'tromme'], creature: 'lama', shop: 'notebua', shopName: 'Notebua',
    gift: { id: 'g_spilledase', name: 'spilledåse', spot: 'mia' }, rooms: ['musikkrom', 'inngang', 'tronsal', 'ballsal'], props: ['vindmølletårn-seil', 'klokketårn'] }),

  R({ id: 'stjerne', k: 7, castle: 'Stjerneslottet', biome: 'lavendel', minRing: 3, size: 'stor',
    pal: { wall: 'lavender', wall2: 'butter', roof: 'roofLilac', trim: 'gold', flag: 'purple' }, roof: 'spire', roof2: 'cone', finial: 'star', emblem: 'star',
    king: K('stjerne', 'Arne', 'rk1', { skin: 'skin4', hair: 'kort', hairCol: 'hairBlack', acc: ['briller'], glassCol: 'gold', outfitCol: 'navySoft', sleeveCol: 'navySoft', capeCol: 'butter', pantsCol: 'lavender', emblem: 'star' }),
    queen: Q('stjerne', 'Ylva', 'rd1', { skin: 'skin4', hair: 'knute', hairCol: 'hairBlack', outfitCol: 'lavender', skirtCol: 'roofLilac', trimCol: 'gold', sleeveCol: 'lavender', hat: 'tiara', shoeCol: 'gold', emblem: 'star' }),
    child: C('stjerne', 'Prinsesse', 'Tuva', { skin: 'skin4', hair: 'hestehale', hairCol: 'hairBlack', outfit: 'kjole', outfitCol: 'butter', skirtCol: 'lavender', trimCol: 'gold', sleeveCol: 'butter', pattern: 'prikker', patternCol: 'gold', shoeCol: 'lavender' }),
    quirk: { who: 'k', anim: 'starGaze', lines: QL('stjerne'), child: 'roy_c_stjerne' },
    goods: 'stjerner', words: ['måne', 'lys', 'sol', 'sky', 'natt'], creature: 'ugle', shop: 'stjernebua', shopName: 'Stjernebua',
    gift: { id: 'g_stjerneglobus', name: 'stjerneglobus', spot: 'bibliotek' }, rooms: ['bibliotek', 'ballsal', 'inngang', 'tronsal', 'soverom'], props: ['stjerneglobus', 'lavendelrad'] }),

  R({ id: 'sno', k: 8, castle: 'Snøslottet', biome: 'snohaugen', minRing: 3, size: 'stor',
    pal: { wall: 'snow', wall2: 'ice', roof: 'sky', trim: 'white', flag: 'ice' }, roof: 'onion', roof2: 'spire', finial: 'snowflake', emblem: 'snowflake',
    king: K('sno', 'Snorre', 'rk2', { skin: 'skin', round: true, hair: 'kort', hairCol: 'hairGrey', acc: ['skjegg', 'skjerf'], beardCol: 'hairGrey', scarfCol: 'red', outfitCol: 'sky', sleeveCol: 'sky', capeCol: 'white', pantsCol: 'navySoft', emblem: 'snowflake' }),
    queen: Q('sno', 'Isa', 'rd2', { skin: 'skin', hair: 'lang', hairCol: 'butter', outfitCol: 'ice', skirtCol: 'snow', trimCol: 'sky', sleeveCol: 'ice', hatCol: 'silver', shoeCol: 'sky', emblem: 'snowflake' }),
    child: C('sno', 'Prins', 'Brage', { skin: 'skin', hair: 'kort', hairCol: 'hairBlond', outfit: 'genser', outfitCol: 'sky', pantsCol: 'navySoft', sleeveCol: 'sky', acc: ['skjerf'], scarfCol: 'white', shoeCol: 'navySoft' }),
    quirk: { who: 'k', anim: 'snore', lines: QL('sno'), child: 'roy_c_sno' },
    goods: 'snøballer', words: ['snø', 'kald', 'ski', 'lue', 'vott'], creature: 'fjellrev', shop: 'vinterbua', shopName: 'Vinterbua',
    gift: { id: 'g_snokule', name: 'snøkule', spot: 'tronsal' }, rooms: ['garderobe', 'inngang', 'tronsal', 'spisesal', 'kjokken'], props: ['snømann', 'isspir'] }),

  R({ id: 'krystall', k: 9, castle: 'Krystallslottet', biome: null, minRing: 4, size: 'stor', style: 'crystal',
    pal: { wall: 'crystal', wall2: 'ice', roof: 'lavender', trim: 'silver', flag: 'crystal' }, roof: 'spire', roof2: 'spire', finial: 'crystal', emblem: 'crystal',
    king: K('krystall', 'Glimt', 'rk1', { skin: 'skin3', hair: 'pigger', hairCol: 'hairBlack', acc: ['bart'], beardCol: 'hairBlack', outfitCol: 'silver', sleeveCol: 'silver', capeCol: 'crystal', pantsCol: 'lavender', hatCol: 'silver', emblem: 'crystal' }),
    queen: Q('krystall', 'Krista', 'rd1', { skin: 'skin3', hair: 'hestehale', hairCol: 'hairBlack', outfitCol: 'crystal', skirtCol: 'lavender', trimCol: 'silver', sleeveCol: 'crystal', hat: 'tiara', hatCol: 'silver', acc: ['halskjede'], shoeCol: 'silver', emblem: 'crystal' }),
    child: C('krystall', 'Prinsesse', 'Gry', { skin: 'skin3', hair: 'fletter', hairCol: 'hairBlack', outfit: 'kjole', outfitCol: 'lavender', skirtCol: 'crystal', trimCol: 'silver', sleeveCol: 'lavender', ribbonCol: 'crystal', hatCol: 'silver', shoeCol: 'crystal' }),
    quirk: { who: 'q', anim: 'polish', lines: QL('krystall'), child: 'roy_c_krystall' },
    goods: 'krystaller', words: ['glass', 'stein', 'lys', 'gull', 'perle'], creature: 'krystallfrosk', shop: 'krystallbua', shopName: 'Krystallbua',
    gift: { id: 'g_krystallkrone', name: 'krystallkrone', spot: 'skattkammer' }, rooms: ['skattkammer', 'ballsal', 'inngang', 'tronsal', 'bibliotek'], props: ['krystallspir', 'krystallhaug'],
    gate: 'found6' }),

  R({ id: 'regnbue', k: 10, castle: 'Regnbueslottet', biome: null, minRing: 5, size: 'stor', rainbow: true,
    pal: { wall: 'white', wall2: 'blossom', roof: 'roofMint', trim: 'gold', flag: 'yellow' }, roof: 'cone', roof2: 'cone', finial: 'rainbow', emblem: 'rainbow',
    king: K('regnbue', 'Sol', 'rk2', { skin: 'skin2', hair: 'krøller', hairCol: 'honey', acc: ['skjegg'], beardCol: 'honey', outfitCol: 'yellow', sleeveCol: 'yellow', capeCol: 'blossom', pantsCol: 'white', emblem: 'rainbow' }),
    queen: Q('regnbue', 'Vår', 'rd2', { skin: 'skin2', hair: 'lang', hairCol: 'hairBrown', outfitCol: 'mint', skirtCol: 'blossom', trimCol: 'gold', sleeveCol: 'mint', pattern: 'striper', patternCol: 'yellow', hat: 'litenkrone', shoeCol: 'gold', emblem: 'rainbow' }),
    child: C('regnbue', 'Prinsesse', 'Lys', { skin: 'skin2', hair: 'lang', hairCol: 'hairBlond', outfit: 'kjole', outfitCol: 'white', skirtCol: 'sky', trimCol: 'gold', sleeveCol: 'white', pattern: 'striper', patternCol: 'rose', shoeCol: 'mint' }),
    quirk: { who: 'c', anim: 'rainbow', lines: QL('regnbue'), child: 'roy_c_regnbue' },
    goods: 'farger', words: ['rød', 'blå', 'gul', 'grønn', 'lilla'], creature: 'enhjørning', shop: 'tryllebua', shopName: 'Tryllebua',
    gift: { id: 'g_regnbue', name: 'regnbue', spot: 'sky' }, rooms: ['ballsal', 'musikkrom', 'inngang', 'tronsal', 'skattkammer'], props: ['regnbuebue', 'fargebed'],
    gate: 'friends9' }),
];

const byId = {};
const royalIx = {};
for (const r of REALMS) {
  byId[r.id] = r;
  for (const who of ['k', 'q', 'c']) {
    const p = r[{ k: 'king', q: 'queen', c: 'child' }[who]];
    p.look.capeEmblem = r.emblem;
    royalIx[p.id] = { realm: r, who, r: p };
  }
  r.family = r.king.name + ' og ' + r.queen.name;
}
Object.defineProperty(REALMS, 'byId', { value: byId, enumerable: false });
Object.defineProperty(REALMS, 'get', { value: id => byId[id] || null, enumerable: false });
Object.defineProperty(REALMS, 'royal', { value: aid => royalIx[aid] || null, enumerable: false });
Object.defineProperty(REALMS, 'royals', { value: () => Object.keys(royalIx).map(k => royalIx[k]), enumerable: false });
F.REALMS = REALMS;

F.SETS = F.SETS || {};
F.SETS.REALMS = REALMS.map(r => r.castle);
F.SETS.FAMILIES = REALMS.map(r => r.family);
F.SETS.REALM_GOODS = REALMS.map(r => r.goods);
})();
