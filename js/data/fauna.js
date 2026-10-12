/* Feslottet – F.FAUNA: the 110 animal species of the Vennealbum (DESIGN2 §4.1–4.2). Owner: WP4 FAUNA. Pure data, no runtime.
   species row: { id (= card word), word, def (definite form, for speech), page 10–20, tier 1 vanlig | 2 sjelden | 3 svært sjelden (glitterdyr) | 4 legendarisk,
     model (F.Beasts / F.VOX id), opts (model opts: {kind}|{c}|{legend}|null), glitter ('krystall'|'blomst'|'boble'|'stjerne'|null), legend (overlay key|null),
     base (the everyday species a glitter/legend variant is built on, or its own id), habitat (spawn area id, see HABS), biomes ([worldgen biomes] it spawns in),
     where 'land'|'water'|'sea'|'air', near (micro-habitat hint for placement), when {phase:'morgen'|'kveld'|null, weather:'regn'|'vind'|null, ring:n,
     needs:null|'kikkert'|{friends:n}|{pages:[..], n}}, landmark (page 20 only), group [min,max], move 'walk'|'hop'|'fly'|'swim'|'crawl',
     social 'solo'|'pair'|'herd'|'flock'|'row', shy 0..2, radius (wander m), speed (m/s), acts [...], sound (fa_snd_<sound> line), cat, land (companion-able) }
   F.FAUNA.byId(id) / ofPage(n) / pageOf(id) / eligibleWhen(sp, ctx{phase, weather, ring, friends, pages, kikkert}) -> bool
   Sets: F.SETS.FAUNA (110 bare words), FAUNA_DEF (110 definite forms), FAUNA_PAGES (11 page names), MS_FRIENDS (10, 20 … 110). */
(function () {
'use strict';
const F = window.F = window.F || {};

/* pages = album pages = habitats (§4.1). hab: hint template id (WP6 registers the hint lines, text below is the suggested line) */
const PAGES = [
  { n: 10, id: 'slottsparken', name: 'Slottsparken', hab: 'fa_hab_10', hint: 'Dette dyret bor i Slottsparken.', habitat: 'park' },
  { n: 11, id: 'landsbyen', name: 'Landsbyen', hab: 'fa_hab_11', hint: 'Dette dyret bor i landsbyen.', habitat: 'landsby' },
  { n: 12, id: 'garden', name: 'Gården', hab: 'fa_hab_12', hint: 'Dette dyret bor på gården.', habitat: 'gardsland' },
  { n: 13, id: 'engen', name: 'Enga', hab: 'fa_hab_13', hint: 'Dette dyret bor på enga.', habitat: 'eng' },
  { n: 14, id: 'frukthagen', name: 'Frukthagen', hab: 'fa_hab_14', hint: 'Dette dyret bor i frukthagen.', habitat: 'frukthage' },
  { n: 15, id: 'innsjoen', name: 'Innsjøen', hab: 'fa_hab_15', hint: 'Dette dyret bor ved vannet.', habitat: 'innsjo' },
  { n: 16, id: 'mollehaugene', name: 'Møllehaugene', hab: 'fa_hab_16', hint: 'Dette dyret bor ved møllene.', habitat: 'vindmolle' },
  { n: 17, id: 'stranda', name: 'Stranda', hab: 'fa_hab_17', hint: 'Dette dyret bor på stranda.', habitat: 'strand' },
  { n: 18, id: 'havet', name: 'Havet', hab: 'fa_hab_18', hint: 'Dette dyret bor i havet.', habitat: 'hav' },
  { n: 19, id: 'snohaugen', name: 'Snøhaugen', hab: 'fa_hab_19', hint: 'Dette dyret bor i snøen.', habitat: 'snohaugen' },
  { n: 20, id: 'legender', name: 'Eventyrdyra', hab: 'fa_hab_20', hint: 'Den bor ved noe stort og spesielt.', habitat: 'landemerke' },
];
/* habitat id -> worldgen biomes that host it (page 11 = village chunks of any biome, page 15 also = lakes/creeks of any biome, 18 = sea by the shore) */
const HABS = {
  park: ['slott'], landsby: ['*village'], gardsland: ['gardsland'], eng: ['blomstereng', 'lavendel'], frukthage: ['frukthage'],
  innsjo: ['innsjo', '*water'], vindmolle: ['vindmolle'], strand: ['strand'], hav: ['hav', '*sea'], snohaugen: ['snohaugen'], landemerke: ['*landmark'],
};
const PAGE_HAB = { 10: 'park', 11: 'landsby', 12: 'gardsland', 13: 'eng', 14: 'frukthage', 15: 'innsjo', 16: 'vindmolle', 17: 'strand', 18: 'hav', 19: 'snohaugen', 20: 'landemerke' };

/* movement defaults by move kind */
const MOVE = {
  walk: { radius: 7, speed: 0.9 }, hop: { radius: 6, speed: 1.2 }, fly: { radius: 8, speed: 1.6 }, swim: { radius: 7, speed: 0.8 }, crawl: { radius: 2.5, speed: 0.18 },
};
const W = { M: 'morgen', K: 'kveld' };
/* compact rows: [page, id, def, tier, model, opts, where, near, gate, group, move, social, shy, acts, sound, cat]
   gate string: 'M' 'K' 'R' 'V' 'r2' 'kikkert' 'f20' (friends) – combined with spaces */
const ROWS = [
  // ---- 10 Slottsparken
  [10, 'due', 'duen', 1, 'due', null, 'land', 'lawn', '', [3, 6], 'walk', 'flock', 0, ['walk', 'peck', 'flock', 'perch'], 'kurr', 'fugl'],
  [10, 'and', 'anda', 1, 'and', null, 'water', 'pond', '', [2, 4], 'swim', 'pair', 0, ['swim', 'dabble'], 'rapp', 'fugl'],
  [10, 'ekorn', 'ekornet', 1, 'ekorn', null, 'land', 'trees', '', [1, 1], 'hop', 'solo', 1, ['hop', 'perch', 'shy'], 'knask', 'smådyr'],
  [10, 'kanin', 'kaninen', 1, 'kanin', null, 'land', 'lawn', '', [1, 3], 'hop', 'pair', 1, ['hop', 'shy', 'play'], 'hopp', 'smådyr'],
  [10, 'sommerfugl', 'sommerfuglen', 1, 'sommerfugl', null, 'air', 'flowers', '', [1, 3], 'fly', 'flock', 0, ['flutter'], 'flagre', 'insekt'],
  [10, 'svane', 'svanen', 2, 'svane', null, 'water', 'pond', '', [1, 2], 'swim', 'pair', 0, ['swim'], 'snadder', 'fugl'],
  [10, 'pinnsvin', 'pinnsvinet', 2, 'pet_pinnsvin', null, 'land', 'bushes', 'K', [1, 1], 'walk', 'solo', 0, ['walk', 'snuffle'], 'snus', 'smådyr'],
  [10, 'gullfisk', 'gullfisken', 2, 'fisk', { kind: 'gull' }, 'water', 'pond', '', [3, 6], 'swim', 'flock', 0, ['swim', 'jump'], 'plask', 'fisk'],
  [10, 'blomsterkanin', 'blomsterkaninen', 3, 'kanin', null, 'land', 'lawn', 'M', [1, 1], 'hop', 'solo', 0, ['hop'], 'hopp', 'glitterdyr', 'blomst'],
  [10, 'stjerneekorn', 'stjerneekornet', 3, 'ekorn', null, 'land', 'trees', 'K', [1, 1], 'hop', 'solo', 0, ['hop'], 'knask', 'glitterdyr', 'stjerne'],
  // ---- 11 Landsbyen
  [11, 'katt', 'katten', 1, 'katt', null, 'land', 'yard', '', [1, 1], 'walk', 'solo', 0, ['curious', 'sleep', 'perch'], 'mjau', 'kjæledyr'],
  [11, 'hund', 'hunden', 1, 'hund', null, 'land', 'street', '', [1, 1], 'walk', 'solo', 0, ['curious', 'play'], 'voff', 'kjæledyr'],
  [11, 'mus', 'musa', 1, 'mus', null, 'land', 'houses', '', [1, 2], 'walk', 'pair', 2, ['popup', 'shy'], 'pip', 'smådyr'],
  [11, 'spurv', 'spurven', 1, 'fugl', { kind: 'spurv' }, 'land', 'street', '', [4, 8], 'hop', 'flock', 0, ['flock', 'peck', 'perch'], 'kvitt', 'fugl'],
  [11, 'kattunge', 'kattungen', 1, 'pet_kattunge', null, 'land', 'yard', '', [1, 3], 'walk', 'pair', 0, ['play'], 'mjau', 'kjæledyr'],
  [11, 'valp', 'valpen', 2, 'valp', null, 'land', 'street', '', [1, 1], 'walk', 'solo', 0, ['play'], 'voff', 'kjæledyr'],
  [11, 'papegøye', 'papegøyen', 2, 'pet_papegøye', null, 'land', 'stall', '', [1, 1], 'walk', 'solo', 0, ['perch'], 'hallo', 'fugl'],
  [11, 'marsvin', 'marsvinet', 2, 'pet_marsvin', null, 'land', 'yard', '', [1, 2], 'walk', 'pair', 0, ['popup'], 'pip', 'kjæledyr'],
  [11, 'krystallkatt', 'krystallkatten', 3, 'katt', null, 'land', 'yard', 'R', [1, 1], 'walk', 'solo', 0, ['curious'], 'mjau', 'glitterdyr', 'krystall'],
  [11, 'boblevalp', 'boblevalpen', 3, 'valp', null, 'land', 'street', 'r2', [1, 1], 'walk', 'solo', 0, ['play'], 'voff', 'glitterdyr', 'boble'],
  // ---- 12 Gården
  [12, 'ku', 'kua', 1, 'ku', null, 'land', 'pasture', '', [3, 8], 'walk', 'herd', 0, ['graze', 'herd', 'sleep'], 'mo', 'gårdsdyr'],
  [12, 'sau', 'sauen', 1, 'sau', null, 'land', 'pasture', '', [10, 16], 'walk', 'herd', 0, ['graze', 'herd'], 'bae', 'gårdsdyr'],
  [12, 'gris', 'grisen', 1, 'gris', null, 'land', 'pen', '', [3, 6], 'walk', 'herd', 0, ['wander', 'mudroll'], 'noff', 'gårdsdyr'],
  [12, 'høne', 'høna', 1, 'høne', { leader: 'hane' }, 'land', 'yard', '', [10, 14], 'walk', 'flock', 0, ['peck'], 'klukk', 'gårdsdyr'],
  [12, 'hest', 'hesten', 1, 'hest', null, 'land', 'paddock', '', [2, 4], 'walk', 'herd', 0, ['graze', 'curious'], 'knegg', 'gårdsdyr'],
  [12, 'kalv', 'kalven', 2, 'kalv', null, 'land', 'pasture', 'M', [1, 2], 'walk', 'herd', 0, ['follow', 'play'], 'gress', 'gårdsdyr'],
  [12, 'lam', 'lammet', 2, 'lam', null, 'land', 'pasture', '', [1, 3], 'hop', 'herd', 0, ['follow', 'play'], 'bae', 'gårdsdyr'],
  [12, 'geit', 'geita', 2, 'geit', null, 'land', 'rocks', '', [2, 5], 'walk', 'herd', 0, ['curious', 'climb', 'graze'], 'mae', 'gårdsdyr'],
  [12, 'blomsterku', 'blomsterkua', 3, 'ku', null, 'land', 'pasture', 'M r2', [1, 1], 'walk', 'solo', 0, ['graze'], 'mo', 'glitterdyr', 'blomst'],
  [12, 'stjernegris', 'stjernegrisen', 3, 'gris', null, 'land', 'pen', 'K r2', [1, 1], 'walk', 'solo', 0, ['wander'], 'noff', 'glitterdyr', 'stjerne'],
  // ---- 13 Enga
  [13, 'bie', 'bia', 1, 'bie', null, 'air', 'flowers', '', [3, 6], 'fly', 'flock', 0, ['fly'], 'bzz', 'insekt'],
  [13, 'humle', 'humla', 1, 'humle', null, 'air', 'flowers', '', [1, 3], 'fly', 'pair', 0, ['fly'], 'bzz', 'insekt'],
  [13, 'larve', 'larven', 1, 'larve', null, 'land', 'leaves', '', [1, 2], 'crawl', 'pair', 0, ['crawl'], 'kryp', 'insekt'],
  [13, 'marihøne', 'marihøna', 1, 'marihøne', null, 'land', 'flowers', '', [1, 3], 'crawl', 'pair', 0, ['crawl'], 'kryp', 'insekt'],
  [13, 'gresshoppe', 'gresshoppa', 1, 'gresshoppe', null, 'land', 'grass', '', [1, 3], 'hop', 'pair', 0, ['hop'], 'hopp', 'insekt'],
  [13, 'rådyr', 'rådyret', 2, 'rådyr', null, 'land', 'meadow', 'M', [1, 2], 'walk', 'pair', 2, ['graze', 'shy'], 'gress', 'vilt'],
  [13, 'lerke', 'lerka', 2, 'fugl', { kind: 'lerke' }, 'land', 'meadow', '', [1, 2], 'hop', 'flock', 1, ['flock', 'sing'], 'kvitt', 'fugl'],
  [13, 'vipe', 'vipa', 2, 'fugl', { kind: 'vipe' }, 'land', 'meadow', '', [2, 4], 'walk', 'flock', 0, ['walk', 'peck'], 'kvitt', 'fugl'],
  [13, 'krystallsommerfugl', 'krystallsommerfuglen', 3, 'sommerfugl', null, 'air', 'flowers', 'R r2', [1, 1], 'fly', 'solo', 0, ['flutter'], 'flagre', 'glitterdyr', 'krystall'],
  [13, 'blomsterhumle', 'blomsterhumla', 3, 'humle', null, 'air', 'flowers', 'r2', [1, 1], 'fly', 'solo', 0, ['fly'], 'bzz', 'glitterdyr', 'blomst', { biomes: ['lavendel'] }],
  // ---- 14 Frukthagen
  [14, 'meis', 'meisen', 1, 'fugl', { kind: 'meis' }, 'land', 'trees', '', [2, 5], 'hop', 'flock', 0, ['perch', 'flock'], 'kvitt', 'fugl'],
  [14, 'trost', 'trosten', 1, 'fugl', { kind: 'trost' }, 'land', 'trees', '', [1, 3], 'hop', 'pair', 0, ['peck'], 'kvitt', 'fugl'],
  [14, 'snegl', 'sneglen', 1, 'snegl', null, 'land', 'leaves', '', [1, 3], 'crawl', 'pair', 0, ['crawl'], 'kryp', 'smådyr'],
  [14, 'maur', 'mauren', 1, 'maur', null, 'land', 'anthill', '', [6, 12], 'crawl', 'row', 0, ['rowfollow'], 'kryp', 'insekt'],
  [14, 'kråke', 'kråka', 1, 'fugl', { kind: 'kråke' }, 'land', 'open', '', [2, 4], 'walk', 'flock', 0, ['walk', 'peck'], 'kra', 'fugl'],
  [14, 'hakkespett', 'hakkespetten', 2, 'fugl', { kind: 'hakkespett' }, 'land', 'trunk', '', [1, 1], 'walk', 'solo', 0, ['perch', 'tap'], 'bank', 'fugl'],
  [14, 'grevling', 'grevlingen', 2, 'grevling', null, 'land', 'bushes', 'K', [1, 1], 'walk', 'solo', 1, ['snuffle', 'shy'], 'snus', 'vilt'],
  [14, 'ugle', 'ugla', 2, 'ugle', null, 'land', 'trees', 'K', [1, 1], 'walk', 'solo', 0, ['perch', 'blink'], 'hoo', 'fugl'],
  [14, 'blomstersnegl', 'blomstersneglen', 3, 'snegl', null, 'land', 'leaves', 'R r2', [1, 1], 'crawl', 'solo', 0, ['crawl'], 'kryp', 'glitterdyr', 'blomst'],
  [14, 'krystallmeis', 'krystallmeisen', 3, 'fugl', { kind: 'meis' }, 'land', 'trees', 'M r2', [1, 1], 'hop', 'solo', 0, ['perch'], 'kvitt', 'glitterdyr', 'krystall'],
  // ---- 15 Innsjøen
  [15, 'frosk', 'frosken', 1, 'frosk', null, 'land', 'shore', '', [1, 4], 'hop', 'pair', 0, ['hop', 'popup'], 'kvekk', 'smådyr'],
  [15, 'gås', 'gåsa', 1, 'gås', null, 'land', 'shore', '', [6, 12], 'walk', 'row', 0, ['graze', 'swim', 'rowfollow'], 'snadder', 'fugl'],
  [15, 'fisk', 'fisken', 1, 'fisk', null, 'water', 'lake', '', [3, 8], 'swim', 'flock', 0, ['swim', 'jump'], 'plask', 'fisk'],
  [15, 'øyenstikker', 'øyenstikkeren', 1, 'øyenstikker', null, 'air', 'water', '', [1, 3], 'fly', 'pair', 0, ['dart'], 'flagre', 'insekt'],
  [15, 'andunge', 'andungen', 1, 'pet_andunge', null, 'water', 'lake', '', [4, 7], 'swim', 'row', 0, ['rowfollow', 'swim'], 'snadder', 'fugl'],
  [15, 'bever', 'beveren', 2, 'bever', null, 'water', 'creek', '', [1, 1], 'swim', 'solo', 0, ['swim', 'gnaw'], 'gnag', 'vilt'],
  [15, 'oter', 'oteren', 2, 'oter', null, 'water', 'lake', '', [1, 2], 'swim', 'pair', 0, ['swim', 'slide', 'play'], 'sel', 'vilt'],
  [15, 'hegre', 'hegren', 2, 'hegre', null, 'land', 'shore', 'M', [1, 1], 'walk', 'solo', 0, ['stand', 'peck'], 'kra', 'fugl'],
  [15, 'boblefisk', 'boblefisken', 3, 'fisk', null, 'water', 'lake', 'r2', [1, 1], 'swim', 'solo', 0, ['swim'], 'plask', 'glitterdyr', 'boble'],
  [15, 'krystallfrosk', 'krystallfrosken', 3, 'frosk', null, 'land', 'shore', 'R r2', [1, 1], 'hop', 'solo', 0, ['hop'], 'kvekk', 'glitterdyr', 'krystall'],
  // ---- 16 Møllehaugene
  [16, 'hare', 'haren', 1, 'hare', null, 'land', 'hill', '', [1, 2], 'hop', 'pair', 2, ['hop', 'shy'], 'hopp', 'vilt'],
  [16, 'esel', 'eselet', 1, 'esel', null, 'land', 'paddock', '', [1, 3], 'walk', 'herd', 0, ['graze', 'curious'], 'ia', 'gårdsdyr'],
  [16, 'ponni', 'ponnien', 1, 'ponni', null, 'land', 'paddock', '', [2, 4], 'walk', 'herd', 0, ['graze', 'curious'], 'knegg', 'gårdsdyr'],
  [16, 'skjære', 'skjæra', 1, 'fugl', { kind: 'skjære' }, 'land', 'fence', '', [1, 3], 'walk', 'pair', 0, ['walk', 'perch'], 'kra', 'fugl'],
  [16, 'svale', 'svala', 1, 'fugl', { kind: 'svale' }, 'air', 'sky', '', [3, 6], 'fly', 'flock', 0, ['circle'], 'kvitt', 'fugl'],
  [16, 'føll', 'føllet', 2, 'føll', null, 'land', 'paddock', 'M', [1, 1], 'walk', 'solo', 0, ['follow', 'play'], 'knegg', 'gårdsdyr'],
  [16, 'rev', 'reven', 2, 'rev', null, 'land', 'hill', 'r2', [1, 1], 'walk', 'solo', 1, ['walk', 'shy', 'play'], 'snus', 'vilt'],
  [16, 'lama', 'lamaen', 2, 'lama', null, 'land', 'paddock', '', [2, 4], 'walk', 'herd', 0, ['graze', 'curious'], 'gress', 'gårdsdyr'],
  [16, 'stjernerev', 'stjernereven', 3, 'rev', null, 'land', 'hill', 'K r3', [1, 1], 'walk', 'solo', 0, ['walk'], 'snus', 'glitterdyr', 'stjerne'],
  [16, 'bobleesel', 'bobleeselet', 3, 'esel', null, 'land', 'paddock', 'V r3', [1, 1], 'walk', 'solo', 0, ['graze'], 'ia', 'glitterdyr', 'boble'],
  // ---- 17 Stranda
  [17, 'krabbe', 'krabben', 1, 'krabbe', null, 'land', 'sand', '', [2, 6], 'walk', 'flock', 0, ['sideways', 'popup'], 'klikk', 'sjødyr'],
  [17, 'måke', 'måka', 1, 'måke', null, 'land', 'sand', '', [6, 12], 'walk', 'flock', 0, ['flock', 'walk'], 'kja', 'fugl'],
  [17, 'sjøstjerne', 'sjøstjerna', 1, 'sjøstjerne', null, 'land', 'wetsand', '', [2, 5], 'crawl', 'flock', 0, ['wiggle'], 'kryp', 'sjødyr'],
  [17, 'tjeld', 'tjelden', 1, 'fugl', { kind: 'tjeld' }, 'land', 'waterline', '', [2, 4], 'walk', 'flock', 0, ['walk', 'peck'], 'kvitt', 'fugl'],
  [17, 'eremittkreps', 'eremittkrepsen', 1, 'eremittkreps', null, 'land', 'sand', '', [1, 3], 'crawl', 'pair', 0, ['popup', 'walk'], 'klikk', 'sjødyr'],
  [17, 'sel', 'selen', 2, 'sel', null, 'land', 'rocks', '', [1, 3], 'crawl', 'pair', 0, ['lie', 'swim'], 'sel', 'sjødyr'],
  [17, 'lunde', 'lunden', 2, 'lunde', null, 'land', 'rocks', 'M', [1, 3], 'walk', 'flock', 0, ['walk', 'perch'], 'kja', 'fugl'],
  [17, 'skilpadde', 'skilpadda', 2, 'pet_skilpadde', null, 'land', 'sand', '', [1, 1], 'crawl', 'solo', 0, ['slowwalk'], 'kryp', 'sjødyr'],
  [17, 'boblekrabbe', 'boblekrabben', 3, 'krabbe', null, 'land', 'sand', 'r3', [1, 1], 'walk', 'solo', 0, ['sideways'], 'klikk', 'glitterdyr', 'boble'],
  [17, 'stjernemåke', 'stjernemåka', 3, 'måke', null, 'land', 'sand', 'V r3', [1, 1], 'walk', 'solo', 0, ['flock'], 'kja', 'glitterdyr', 'stjerne'],
  // ---- 18 Havet
  [18, 'makrell', 'makrellen', 1, 'fisk', { kind: 'makrell' }, 'sea', 'nearshore', '', [10, 20], 'swim', 'flock', 0, ['swim', 'jump'], 'plask', 'fisk'],
  [18, 'torsk', 'torsken', 1, 'fisk', { kind: 'torsk' }, 'sea', 'nearshore', '', [2, 5], 'swim', 'flock', 0, ['swim'], 'plask', 'fisk'],
  [18, 'manet', 'maneten', 1, 'manet', null, 'sea', 'nearshore', '', [2, 6], 'swim', 'flock', 0, ['bob'], 'sel', 'sjødyr'],
  [18, 'blekksprut', 'blekkspruten', 1, 'blekksprut', null, 'sea', 'jetty', '', [1, 1], 'swim', 'solo', 0, ['swim', 'peek'], 'sel', 'sjødyr'],
  [18, 'reke', 'reka', 1, 'reke', null, 'sea', 'shallows', '', [4, 8], 'swim', 'flock', 0, ['dart'], 'sel', 'sjødyr'],
  [18, 'delfin', 'delfinen', 2, 'delfin', null, 'sea', 'out', '', [1, 3], 'swim', 'pair', 0, ['swim', 'jump', 'play'], 'delfin', 'sjødyr'],
  [18, 'hval', 'hvalen', 2, 'hval', null, 'sea', 'far', 'r3', [1, 1], 'swim', 'solo', 0, ['swim', 'spout'], 'hval', 'sjødyr'],
  [18, 'sjøhest', 'sjøhesten', 2, 'sjøhest', null, 'sea', 'jetty', '', [1, 2], 'swim', 'pair', 0, ['float'], 'sel', 'sjødyr'],
  [18, 'krystallsjøhest', 'krystallsjøhesten', 3, 'sjøhest', null, 'sea', 'jetty', 'R r3', [1, 1], 'swim', 'solo', 0, ['float'], 'sel', 'glitterdyr', 'krystall'],
  [18, 'stjernedelfin', 'stjernedelfinen', 3, 'delfin', null, 'sea', 'out', 'K r3', [1, 1], 'swim', 'solo', 0, ['jump'], 'delfin', 'glitterdyr', 'stjerne'],
  // ---- 19 Snøhaugen
  [19, 'pingvin', 'pingvinen', 1, 'pingvin', null, 'land', 'snow', '', [10, 20], 'walk', 'row', 0, ['waddle', 'slide', 'rowfollow'], 'pingvin', 'fugl'],
  [19, 'rype', 'rypa', 1, 'fugl', { kind: 'rype' }, 'land', 'snow', '', [2, 5], 'walk', 'flock', 0, ['walk', 'peck'], 'kvitt', 'fugl'],
  [19, 'snøhare', 'snøharen', 1, 'hare', { c: 'snow' }, 'land', 'snow', '', [1, 2], 'hop', 'pair', 2, ['hop', 'shy'], 'hopp', 'vilt'],
  [19, 'rein', 'reinen', 1, 'rein', null, 'land', 'snowplain', '', [10, 15], 'walk', 'herd', 0, ['graze', 'herd'], 'gress', 'vilt'],
  [19, 'lemen', 'lemenet', 1, 'lemen', null, 'land', 'snowmound', '', [1, 3], 'walk', 'pair', 0, ['popup'], 'pip', 'smådyr'],
  [19, 'fjellrev', 'fjellreven', 2, 'rev', { c: 'snow' }, 'land', 'snow', '', [1, 1], 'walk', 'solo', 1, ['walk', 'shy', 'play'], 'snus', 'vilt'],
  [19, 'moskus', 'moskusen', 2, 'moskus', null, 'land', 'snowplain', 'r3', [2, 5], 'walk', 'herd', 0, ['graze', 'herd'], 'gress', 'vilt'],
  [19, 'elg', 'elgen', 2, 'elg', null, 'land', 'snowedge', '', [1, 1], 'walk', 'solo', 0, ['graze'], 'gress', 'vilt'],
  [19, 'blomsterrein', 'blomsterreinen', 3, 'rein', null, 'land', 'snowplain', 'M r3', [1, 1], 'walk', 'solo', 0, ['graze'], 'gress', 'glitterdyr', 'blomst'],
  [19, 'boblepingvin', 'boblepingvinen', 3, 'pingvin', null, 'land', 'snow', 'r3', [1, 1], 'walk', 'solo', 0, ['slide'], 'pingvin', 'glitterdyr', 'boble'],
];
/* page 20 legends: [id, def, model, opts, landmark, gate, base, move, where, sound] */
const LEGENDS = [
  ['enhjørning', 'enhjørningen', 'hest', { legend: 'horn' }, 'regnbuebro', 'R r3', 'hest', 'walk', 'land', 'knegg'],
  ['vingehest', 'vingehesten', 'hest', { legend: 'wings' }, 'kjempemolle', 'V kikkert', 'hest', 'walk', 'land', 'knegg'],
  ['skylam', 'skylammet', 'lam', { legend: 'cloud' }, 'ballongplass', 'K r2', 'lam', 'hop', 'land', 'bae'],
  ['isbjørnunge', 'isbjørnungen', 'isbjørnunge', null, 'isslott', 'M r3', 'isbjørnunge', 'walk', 'land', 'brumm'],
  ['krystallhjort', 'krystallhjorten', 'rådyr', { legend: 'crystal' }, 'krystallhoyden', 'R f20', 'rådyr', 'walk', 'land', 'gress'],
  ['solhare', 'solharen', 'hare', { legend: 'sun' }, 'kjempesolsikke', 'K', 'hare', 'hop', 'land', 'hopp'],
  ['perlehval', 'perlehvalen', 'hval', { legend: 'pearl' }, 'fyrtarn', 'kikkert', 'hval', 'swim', 'sea', 'hval'],
  ['kjempeskilpadde', 'kjempeskilpadda', 'pet_skilpadde', { legend: 'giant' }, 'sandslott', 'p17_18', 'skilpadde', 'crawl', 'land', 'kryp'],
  ['månekatt', 'månekatten', 'katt', { legend: 'moon' }, 'pariserhjul', 'K', 'katt', 'walk', 'land', 'mjau'],
  ['elefantunge', 'elefantungen', 'elefantunge', null, 'dyrepark', 'f40', 'elefantunge', 'walk', 'land', 'trut'],
];
/* Dyreparken residents (not in the album): petting only («De bor i dyreparken.») */
const RESIDENTS = ['løve', 'giraff', 'sebra', 'ape', 'panda', 'koala', 'kamel'];

function gate(s) {
  const w = { phase: null, weather: null, ring: 0, needs: null };
  for (const g of (s || '').split(' ').filter(Boolean)) {
    if (g === 'M') w.phase = 'morgen'; else if (g === 'K') w.phase = 'kveld';
    else if (g === 'R') w.weather = 'regn'; else if (g === 'V') w.weather = 'vind';
    else if (/^r\d$/.test(g)) w.ring = +g[1];
    else if (g === 'kikkert') w.needs = 'kikkert';
    else if (/^f\d+$/.test(g)) w.needs = { friends: +g.slice(1) };
    else if (g === 'p17_18') w.needs = { pages: [17, 18], n: 6 };
  }
  return w;
}
const LAND_OK = { land: true };
const species = [];
for (const r of ROWS) {
  const [page, id, def, tier, model, opts, where, near, g, group, move, social, shy, acts, sound, cat, glitter, extra] = r;
  const hab = PAGE_HAB[page];
  const base = glitter ? (({ blomsterkanin: 'kanin', stjerneekorn: 'ekorn', krystallkatt: 'katt', boblevalp: 'valp', blomsterku: 'ku', stjernegris: 'gris',
    krystallsommerfugl: 'sommerfugl', blomsterhumle: 'humle', blomstersnegl: 'snegl', krystallmeis: 'meis', boblefisk: 'fisk', krystallfrosk: 'frosk',
    stjernerev: 'rev', bobleesel: 'esel', boblekrabbe: 'krabbe', stjernemåke: 'måke', krystallsjøhest: 'sjøhest', stjernedelfin: 'delfin',
    blomsterrein: 'rein', boblepingvin: 'pingvin' })[id]) : id;
  const mv = MOVE[move] || MOVE.walk;
  species.push(Object.assign({
    id, word: id, def, page, tier, model, opts: opts || null, glitter: glitter || null, legend: null, base,
    habitat: hab, biomes: HABS[hab].slice(), where, near: near || null, when: gate(g), landmark: null,
    group: group.slice(), move, social, shy, radius: mv.radius, speed: mv.speed, acts: acts.slice(), sound, cat,
    land: where === 'land' && move !== 'crawl' && !['insekt'].includes(cat) || ['skilpadde'].includes(id),
  }, extra || {}));
}
for (const r of LEGENDS) {
  const [id, def, model, opts, landmark, g, base, move, where, sound] = r;
  const mv = MOVE[move] || MOVE.walk;
  species.push({
    id, word: id, def, page: 20, tier: 4, model, opts: opts || null, glitter: null, legend: opts && opts.legend || id, base,
    habitat: 'landemerke', biomes: ['*landmark'], where, near: 'landmark', when: gate(g), landmark,
    group: [1, 1], move, social: 'solo', shy: 0, radius: 5, speed: mv.speed * 0.8, acts: ['walk', 'play'], sound, cat: 'eventyrdyr', land: where === 'land',
  });
}
// a few hand tunings
const by = {}; species.forEach(s => { by[s.id] = s; });
by.sau.radius = 9; by.ku.radius = 9; by.rein.radius = 10; by.moskus.radius = 9; by.pingvin.radius = 8; by.gås.radius = 8;
by.hval.radius = 12; by.perlehval.radius = 12; by.delfin.radius = 10; by.makrell.radius = 8;
by.skilpadde.speed = 0.25; by.kjempeskilpadde.speed = 0.25; by.sel.speed = 0.35; by.snegl.speed = 0.12; by.blomstersnegl.speed = 0.12;
by.hund.speed = 1.3; by.valp.speed = 1.3; by.hare.speed = 1.6; by.snøhare.speed = 1.6; by.solhare.speed = 1.4;
// companion-able = befriended land walker/hopper that can follow on foot (§4.8)
species.forEach(s => { s.land = s.where === 'land' && (s.move === 'walk' || s.move === 'hop') && s.cat !== 'insekt' && s.cat !== 'sjødyr' || s.id === 'skilpadde' || s.id === 'kjempeskilpadde'; });

if (species.length !== 110) console.error('[FAUNA] expected 110 species, got ' + species.length);

const TIER = { START: { 1: 6, 2: 4, 3: 2, 4: 2 }, N: { 1: 1, 2: 2, 3: 3, 4: 3 },
  GAIN: { A: { 1: 14, 2: 8, 3: 6, 4: 6 }, B: { 1: 4, 2: 3, 3: 2, 4: 2 }, C: { 1: 0, 2: 0, 3: 0, 4: 0 } } };
const TIER_NAME = { 1: 'vanlig', 2: 'sjelden', 3: 'svært sjelden', 4: 'legendarisk' };
const GLITTER = { krystall: ['krystallkatt', 'krystallsommerfugl', 'krystallmeis', 'krystallfrosk', 'krystallsjøhest'],
  blomst: ['blomsterkanin', 'blomsterku', 'blomsterhumle', 'blomstersnegl', 'blomsterrein'],
  boble: ['boblevalp', 'boblefisk', 'bobleesel', 'boblekrabbe', 'boblepingvin'],
  stjerne: ['stjerneekorn', 'stjernegris', 'stjernerev', 'stjernemåke', 'stjernedelfin'] };

F.FAUNA = {
  species, pages: PAGES, TIER, TIER_NAME, GLITTER, HABS, RESIDENTS, PAGE_HAB,
  /* glimt slot tier weights by ring 0,1,2,≥3: [nothing, vanlig, sjelden, svært sjelden] (§4.5 Layer B; tuned with tools/fauna_sim.js) */
  GLIMT: [[36, 40, 18, 6], [30, 28, 27, 15], [24, 22, 28, 26], [20, 18, 26, 36]],
  byId: id => by[id] || null,
  ofPage: n => species.filter(s => s.page === +n),
  pageOf: id => (by[id] ? by[id].page : null),
  page: n => PAGES.find(p => p.n === +n) || null,
  ofHabitat: h => species.filter(s => s.habitat === h),
  /* gate check: ctx {phase, weather, ring, friends:n, pageFriends:{17:n,…}, kikkert:bool}; missing ctx fields pass */
  eligibleWhen(sp, c) {
    if (typeof sp === 'string') sp = by[sp]; if (!sp) return false;
    c = c || {}; const w = sp.when;
    if (w.phase && c.phase != null && c.phase !== w.phase) return false;
    if (w.weather && c.weather != null && c.weather !== w.weather) return false;
    if (w.ring && c.ring != null && c.ring < w.ring) return false;
    if (w.needs) {
      if (w.needs === 'kikkert') { if (c.kikkert === false) return false; }
      else if (w.needs.friends != null) { if (c.friends != null && c.friends < w.needs.friends) return false; }
      else if (w.needs.pages) { if (c.pageFriends) { let n = 0; w.needs.pages.forEach(p => { n += c.pageFriends[p] || 0; }); if (n < w.needs.n) return false; } }
    }
    return true;
  },
};
F.SETS = F.SETS || {};
F.SETS.FAUNA = species.map(s => s.word);
F.SETS.FAUNA_DEF = species.map(s => s.def);
F.SETS.FAUNA_PAGES = PAGES.map(p => p.name);
F.SETS.MS_FRIENDS = Array.from({ length: 11 }, (_, i) => (i + 1) * 10);
})();
