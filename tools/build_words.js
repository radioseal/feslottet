#!/usr/bin/env node
/* Feslottet – builds js/data/words.js (F.WORDS) from the hand-curated CASTABLE table below + _dev/lexicon_3to6.json.
   Owner: LEARN.   Usage: node tools/build_words.js   (idempotent; re-run after editing the tables)

   CAST row: 'word|cat|react|article|plural|needTags|flags'
     cat      mat leker klær dyr møbler ting natur hus kjøretøy musikk eventyr
     react    eat wear play pet sit smell warm light look ride        (what a character does with it)
     article  en | ei | et
     needTags comma list from NEED_TAGS (multi-answer wishes / F39 categories)
     flags    p = P0 (model agents build these first) ; c = colour variants (model honours o.c = PAL name) ;
              m = mass noun (no natural plural count) ; 1 = priority 1 (build right after P0)
   Every castable word gets a VOX model with id === word (lowercase bokmål). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LEX = JSON.parse(fs.readFileSync(path.join(ROOT, '_dev/lexicon_3to6.json'), 'utf8'));

const CAST = `
sol|natur|warm|en|soler|varme,lys|p
hus|hus|look|et|hus||p
mus|dyr|pet|en|mus|kjæledyr|p
lue|klær|wear|en|luer|varme,klær|pc
sko|klær|wear|en|sko|klær|pc
ost|mat|eat|en|oster|spise|p
egg|mat|eat|et|egg|spise|p
bok|ting|look|en|bøker|leke|p
fly|kjøretøy|ride|et|fly|kjøre|p
tog|kjøretøy|ride|et|tog|kjøre,leke|p
båt|kjøretøy|ride|en|båter|kjøre,flyte|pc
bil|kjøretøy|ride|en|biler|kjøre,leke|pc
sau|dyr|pet|en|sauer|kjæledyr|p
and|dyr|pet|en|ender|kjæledyr,flyte|p
due|dyr|pet|en|duer|kjæledyr|p
ski|kjøretøy|ride|en|ski|kjøre|p
sky|natur|look|en|skyer||p
lys|ting|light|et|lys|lys,varme|p
bro|hus|look|en|broer|bygg|p
kake|mat|eat|en|kaker|spise|pc
bolle|mat|eat|en|boller|spise|p
vaffel|mat|eat|en|vafler|spise|p
eple|mat|eat|et|epler|spise|p
banan|mat|eat|en|bananer|spise|p
pære|mat|eat|en|pærer|spise|p
melk|mat|eat|en|melk|drikke|pm
kjeks|mat|eat|en|kjeks|spise|p
saft|mat|eat|en|safter|drikke|pm
hatt|klær|wear|en|hatter|klær,pynt|pc
sokk|klær|wear|en|sokker|varme,klær|pc
vott|klær|wear|en|votter|varme,klær|pc
skjerf|klær|wear|et|skjerf|varme,klær|pc
jakke|klær|wear|en|jakker|varme,klær|pc
kjole|klær|wear|en|kjoler|klær,pynt|pc
krone|eventyr|wear|en|kroner|pynt,klær|p
tiara|eventyr|wear|en|tiaraer|pynt,klær|p
katt|dyr|pet|en|katter|kjæledyr|p
hund|dyr|pet|en|hunder|kjæledyr|p
hest|dyr|ride|en|hester|kjæledyr,kjøre|p
gris|dyr|pet|en|griser|kjæledyr|p
fisk|dyr|pet|en|fisker|kjæledyr,flyte|p
kanin|dyr|pet|en|kaniner|kjæledyr|p
valp|dyr|pet|en|valper|kjæledyr|p
ponni|dyr|ride|en|ponnier|kjæledyr,kjøre|p
stol|møbler|sit|en|stoler|sitte|pc
seng|møbler|sit|en|senger|sove|p
bord|møbler|look|et|bord||p
sofa|møbler|sit|en|sofaer|sitte,sove|pc
benk|møbler|sit|en|benker|sitte|p
teppe|møbler|warm|et|tepper|varme,sove|pc
lampe|møbler|light|en|lamper|lys|pc
peis|møbler|warm|en|peiser|varme,lys|p
rose|natur|smell|en|roser|lukte,pynt|pc
blomst|natur|smell|en|blomster|lukte,pynt|pc
tre|natur|look|et|trær||p
ball|leker|play|en|baller|leke|pc
dukke|leker|play|en|dukker|leke|p
bamse|leker|play|en|bamser|leke,sove|p
kopp|ting|eat|en|kopper|drikke|pc
fest|eventyr|look|en|fester|pynt,leke|p
drage|leker|play|en|drager|leke|1
sykkel|kjøretøy|ride|en|sykler|kjøre,leke|1c
tromme|musikk|play|en|trommer|musikk,leke|1
gitar|musikk|play|en|gitarer|musikk|1
fløyte|musikk|play|en|fløyter|musikk|1
harpe|musikk|play|en|harper|musikk|1
piano|musikk|play|et|pianoer|musikk|1
ring|klær|wear|en|ringer|pynt|1
stein|natur|look|en|steiner||1
tau|leker|play|et|tau|leke|1
lam|dyr|pet|et|lam|kjæledyr|1
dam|natur|look|en|dammer|flyte|1
kam|ting|wear|en|kammer|pynt|1
lim|ting|look|et|lim||1m
sel|dyr|pet|en|seler|kjæledyr,flyte|1
gås|dyr|pet|en|gjess|kjæledyr|1
lås|ting|look|en|låser||1
mur|hus|look|en|murer|bygg|1
tak|hus|look|et|tak|bygg|1
ape|dyr|pet|en|aper|kjæledyr|1
bie|dyr|look|en|bier||1
rev|dyr|pet|en|rever|kjæledyr|1
ris|mat|eat|en|ris|spise|1m
bær|mat|eat|et|bær|spise|1
dør|hus|look|en|dører|bygg|1
gave|eventyr|play|en|gaver|pynt,leke|1c
hjerte|eventyr|look|et|hjerter|pynt|1c
slott|hus|look|et|slott|bygg|1
tårn|hus|look|et|tårn|bygg|1
geit|dyr|pet|en|geiter|kjæledyr|1
føll|dyr|ride|et|føll|kjæledyr,kjøre|1
høne|dyr|pet|en|høner|kjæledyr|1
hane|dyr|pet|en|haner|kjæledyr|
svane|dyr|pet|en|svaner|kjæledyr,flyte|
ugle|dyr|pet|en|ugler|kjæledyr|
fugl|dyr|pet|en|fugler|kjæledyr|1
frosk|dyr|pet|en|frosker|kjæledyr|1
humle|dyr|look|en|humler||
larve|dyr|pet|en|larver|kjæledyr|
snegl|dyr|pet|en|snegler|kjæledyr|
hval|dyr|look|en|hvaler|flyte|
delfin|dyr|pet|en|delfiner|kjæledyr,flyte|
krabbe|dyr|look|en|krabber||
måke|dyr|look|en|måker||
panda|dyr|pet|en|pandaer|kjæledyr|
løve|dyr|look|en|løver||
esel|dyr|ride|et|esler|kjæledyr,kjøre|
lama|dyr|pet|en|lamaer|kjæledyr|
koala|dyr|pet|en|koalaer|kjæledyr|
sebra|dyr|look|en|sebraer||
ekorn|dyr|pet|et|ekorn|kjæledyr|
elg|dyr|look|en|elger||
rein|dyr|ride|en|rein|kjøre|
giraff|dyr|look|en|giraffer||
kamel|dyr|ride|en|kameler|kjøre|
kalv|dyr|pet|en|kalver|kjæledyr|
pølse|mat|eat|en|pølser|spise|
pizza|mat|eat|en|pizzaer|spise|
brød|mat|eat|et|brød|spise|1
gulrot|mat|eat|en|gulrøtter|spise|1
tomat|mat|eat|en|tomater|spise|1
potet|mat|eat|en|poteter|spise|
agurk|mat|eat|en|agurker|spise|
drue|mat|eat|en|druer|spise|1
kiwi|mat|eat|en|kiwier|spise|
melon|mat|eat|en|meloner|spise|
plomme|mat|eat|en|plommer|spise|
sitron|mat|eat|en|sitroner|spise|
mais|mat|eat|en|mais|spise|
ert|mat|eat|en|erter|spise|
nøtt|mat|eat|en|nøtter|spise|
pai|mat|eat|en|paier|spise|
mango|mat|eat|en|mangoer|spise|
ananas|mat|eat|en|ananaser|spise|
iskrem|mat|eat|en|iskremer|spise|1
suppe|mat|eat|en|supper|spise,varme|m
grøt|mat|eat|en|grøter|spise,varme|m
vann|mat|eat|et|vann|drikke|m
kakao|mat|eat|en|kakao|drikke,varme|m
taco|mat|eat|en|tacoer|spise|
løk|mat|eat|en|løker|spise|
robot|leker|play|en|roboter|leke|1
kloss|leker|play|en|klosser|leke|1c
kule|leker|play|en|kuler|leke|c
huske|leker|play|en|husker|leke|1
sklie|leker|play|en|sklier|leke|1
spill|leker|play|et|spill|leke|
boble|leker|play|en|bobler|leke|1
jojo|leker|play|en|jojoer|leke|
perle|eventyr|wear|en|perler|pynt|1
bukse|klær|wear|en|bukser|klær|c
genser|klær|wear|en|gensere|varme,klær|c
skjørt|klær|wear|et|skjørt|klær,pynt|c
støvel|klær|wear|en|støvler|klær|c
tøffel|klær|wear|en|tøfler|varme,klær|c
hanske|klær|wear|en|hansker|varme,klær|c
belte|klær|wear|et|belter|klær|
veske|klær|wear|en|vesker|pynt|c
sekk|klær|wear|en|sekker|klær|c
kappe|klær|wear|en|kapper|varme,klær,pynt|c
smykke|klær|wear|et|smykker|pynt|
sløyfe|klær|wear|en|sløyfer|pynt|c
slips|klær|wear|et|slips|klær|c
hjelm|klær|wear|en|hjelmer|klær|
forkle|klær|wear|et|forklær|klær|c
kåpe|klær|wear|en|kåper|varme,klær|c
vest|klær|wear|en|vester|klær|c
kjede|klær|wear|et|kjeder|pynt|
krans|natur|wear|en|kranser|pynt|
hylle|møbler|look|en|hyller||
skap|møbler|look|et|skap||
pute|møbler|sit|en|puter|sove,sitte|c
dyne|møbler|warm|en|dyner|varme,sove|c
speil|møbler|look|et|speil|pynt|
klokke|ting|look|en|klokker||
vase|ting|smell|en|vaser|pynt|c
trone|møbler|sit|en|troner|sitte|1
krakk|møbler|sit|en|krakker|sitte|
kurv|ting|look|en|kurver||
gardin|møbler|look|en|gardiner|pynt|c
ovn|møbler|warm|en|ovner|varme|
vugge|møbler|sit|en|vugger|sove|
krus|ting|eat|et|krus|drikke|c
skål|ting|eat|en|skåler||c
glass|ting|eat|et|glass|drikke|
flaske|ting|eat|en|flasker|drikke|
kanne|ting|look|en|kanner||
gryte|ting|look|en|gryter||
skje|ting|look|en|skjeer||
gaffel|ting|look|en|gafler||
brev|ting|look|et|brev||
kart|ting|look|et|kart||
globus|ting|look|en|globuser||
nøkkel|ting|look|en|nøkler||
bjelle|musikk|play|en|bjeller|musikk|
lykt|ting|light|en|lykter|lys|
radio|musikk|play|en|radioer|musikk|
kamera|ting|look|et|kameraer||
saks|ting|look|en|sakser||
pensel|ting|look|en|pensler||
blyant|ting|look|en|blyanter||
bøtte|ting|play|en|bøtter|leke|c
spade|ting|play|en|spader|leke|
eske|ting|look|en|esker||c
pose|ting|look|en|poser||
såpe|ting|smell|en|såper|lukte|
børste|ting|look|en|børster|pynt|
telt|hus|look|et|telt|sove|c
stige|ting|look|en|stiger||
bilde|ting|look|et|bilder|pynt|
pakke|eventyr|play|en|pakker|pynt,leke|c
skatt|eventyr|look|en|skatter|pynt|1
gull|eventyr|look|et|gull|pynt|m
stav|eventyr|play|en|staver|pynt|1
flagg|eventyr|look|et|flagg|pynt|c
skjold|eventyr|look|et|skjold||
måne|natur|light|en|måner|lys|1
snø|natur|look|en|snø||m
lilje|natur|smell|en|liljer|lukte,pynt|
busk|natur|look|en|busker||
gress|natur|look|et|gress||m
sopp|natur|look|en|sopper||
palme|natur|look|en|palmer||
kaktus|natur|look|en|kaktuser||
kongle|natur|look|en|kongler||
blad|natur|look|et|blader||
fjær|natur|look|en|fjær|pynt|
skjell|natur|look|et|skjell|pynt|1
sand|natur|play|en|sand|leke|m
frø|natur|look|et|frø||
pinne|natur|play|en|pinner|leke|
kløver|natur|look|en|kløver||
plante|natur|smell|en|planter|pynt|
port|hus|look|en|porter|bygg|
trapp|hus|look|en|trapper|bygg|
vindu|hus|look|et|vinduer|bygg|
hytte|hus|look|en|hytter|bygg,sove|
låve|hus|look|en|låver|bygg|
mølle|hus|look|en|møller|bygg|
brønn|hus|look|en|brønner|bygg|
gjerde|hus|look|et|gjerder|bygg|
skilt|hus|look|et|skilt||
bod|hus|look|en|boder|bygg|
buss|kjøretøy|ride|en|busser|kjøre|c
kano|kjøretøy|ride|en|kanoer|kjøre,flyte|c
vogn|kjøretøy|ride|en|vogner|kjøre|
ferje|kjøretøy|ride|en|ferjer|kjøre,flyte|
trikk|kjøretøy|ride|en|trikker|kjøre|
rakett|kjøretøy|ride|en|raketter|kjøre|
ubåt|kjøretøy|ride|en|ubåter|kjøre,flyte|
kjelke|kjøretøy|ride|en|kjelker|kjøre,leke|c
slede|kjøretøy|ride|en|sleder|kjøre|
robåt|kjøretøy|ride|en|robåter|kjøre,flyte|
flåte|kjøretøy|ride|en|flåter|kjøre,flyte|
skip|kjøretøy|ride|et|skip|kjøre,flyte|
fiolin|musikk|play|en|fioliner|musikk|
tuba|musikk|play|en|tubaer|musikk|
note|musikk|look|en|noter|musikk|
`;

// words that must never appear (DESIGN §9.2 + LEARN judgement: scary, sad, violent, rude, alcohol, body-shaming)
const BLACK = new Set(('død døde dø dør_x kniv gift blod våpen sverd monster spøkelse heks edderkopp slange ulv syk vond vondt mørk mørke ' +
  'troll drap krig skudd pistol skyte bombe brann røyk ild bål lyn torden storm orkan vulkan gruve grotte hule skygge tåke ' +
  'kirke prest kiste grav sår gråte gråt sint sinne redd skrik skrike dum stygg feit tjukk lat tyv ran fengsel politi soldat ' +
  'vin øl sprit sigar rotte mygg veps maur lus flått hai øks sag spiker hammer kamp slå slag sprøyte sykehus lege doktor ' +
  'pirat kjempe dverg nisse alv engel magi tiger ekkel farlig ensom dårlig bjørn øgle padde hjerne lunge blod muskel navle bryst hofte kropp ' +
  'skjegg tunge negl dommer bank kebab biff kjøtt pålegg bensin motor brems sirene skrue plast søppel ' +
  'falsk juks lyve løgn skam tull dust idiot skog fange jungel ørken').split(/\s+/));

// need tags → category phrase (F39 Kategori-staven, multi-answer wishes)
const NEED_TAGS = {
  spise: { cat: 'noe å spise', need: 'sulten' },
  drikke: { cat: 'noe å drikke', need: 'tørst' },
  varme: { cat: 'noe varmt', need: 'kald' },
  sove: { cat: 'noe å sove i', need: 'trøtt' },
  sitte: { cat: 'noe å sitte på', need: 'sliten' },
  leke: { cat: 'noe å leke med', need: 'lei' },
  pynt: { cat: 'noe fint', need: 'fin' },
  kjæledyr: { cat: 'et dyr', need: 'dyr' },
  klær: { cat: 'noe å ha på seg', need: null },
  lys: { cat: 'noe som lyser', need: null },
  musikk: { cat: 'noe som lager musikk', need: null },
  kjøre: { cat: 'noe å reise med', need: null },
  lukte: { cat: 'noe som lukter godt', need: null },
  flyte: { cat: 'noe som er i vannet', need: null },
  bygg: { cat: 'noe å bygge', need: null },
};

// pack each category belongs to (free casting lock, DESIGN §11.3 rule 2). P0 words are never locked.
const PACK = { mat: 'mat', leker: 'leker', klær: 'klær', dyr: 'dyr', natur: 'hage', eventyr: 'eventyr' };

/* ---------------------------------------------------------------- patterns & rungs */
const lexByW = {};
for (const e of LEX) { if (!lexByW[e.w] || (e.pos === 'subst' && lexByW[e.w].pos !== 'subst')) lexByW[e.w] = e; }

const MANUAL_PAT = { // castables missing from the lexicon (hand-checked)
  brønn: ['konsonantgruppe', 'dobbel_konsonant', 'oe'], skjørt: ['skj', 'sj', 'konsonantgruppe', 'oe'], kappe: ['dobbel_konsonant'],
  jojo: [], giraff: ['dobbel_konsonant'], trone: ['konsonantgruppe'], krakk: ['konsonantgruppe', 'dobbel_konsonant'],
  vugge: ['dobbel_konsonant'], sløyfe: ['konsonantgruppe', 'diftong', 'oe'], krans: ['konsonantgruppe'], bod: ['stum_d'],
  forkle: ['konsonantgruppe'], kjede: ['kj'], iskrem: ['konsonantgruppe'], tiara: [], ponni: ['dobbel_konsonant'],
  sklie: ['konsonantgruppe'], boble: ['konsonantgruppe'], skål: ['konsonantgruppe', 'aa'], bjelle: ['konsonantgruppe', 'dobbel_konsonant'],
  stav: ['konsonantgruppe'], mølle: ['dobbel_konsonant', 'oe'], vogn: ['ng'], robåt: ['aa'], ubåt: ['aa'], lilje: ['j_lyd'], kløver: ['konsonantgruppe', 'oe'], fest: ['konsonantgruppe'],
};
const FEAT = {
  CL: ['konsonantgruppe', 'nk'],
  DBL: ['dobbel_konsonant'],
  DIF: ['diftong', 'ng'],
  SIL: ['kj', 'skj', 'sj', 'j_lyd', 'stum_d', 'stum_g', 'stum_h', 'stum_v', 'stum_t'],
};
function feats(p) {
  const f = {}; for (const k in FEAT) f[k] = FEAT[k].some(x => p.includes(x)); f.n = ['CL', 'DBL', 'DIF', 'SIL'].filter(k => f[k]).length; return f;
}
function rungLES(w, p, level) {
  const f = feats(p), L = w.length;
  if (L >= 6 || (L === 5 && f.n === 0) || (L === 5 && f.n >= 2 && f.DBL)) return 9;
  if (f.SIL) return 8; if (f.DIF) return 7; if (f.DBL) return 6; if (f.CL) return 5;
  if (L === 3) return level <= 1 ? 1 : 2;
  return 4;
}
function rungSKRIV(w, p) {
  const f = feats(p), L = w.length;
  if (L === 6) return f.n === 0 ? 6 : 9;
  if (f.SIL) return 8; if (f.DIF) return 7;
  if (L === 5 && f.n >= 2) return 9;
  if (f.DBL) return 5; if (f.CL) return 4;
  return L === 3 ? 2 : L === 4 ? 3 : 6;
}
function estLevel(w, p) { const f = feats(p); return Math.min(6, 1 + (w.length - 3) + f.n + (f.SIL ? 1 : 0)); }

/* ---------------------------------------------------------------- build castables */
const list = [], seen = new Set();
const nP0 = { n: 0 };
for (const line of CAST.trim().split('\n')) {
  const [w, cat, react, n, pl, tags, flags = ''] = line.split('|');
  if (seen.has(w)) throw new Error('duplicate castable ' + w);
  if (w.length < 3 || w.length > 6) throw new Error('length ' + w);
  if (BLACK.has(w)) throw new Error('blacklisted castable ' + w);
  seen.add(w);
  const lx = lexByW[w];
  const patterns = (lx ? lx.patterns : MANUAL_PAT[w]) || [];
  if (!lx && !MANUAL_PAT[w]) console.warn('no lexicon entry / manual patterns for', w);
  const level = lx ? lx.level : estLevel(w, patterns);
  const p0 = flags.includes('p');
  if (p0) nP0.n++;
  const def = lx && lx.forms && lx.forms.b_ent || null;
  list.push({ w, model: w, cat, react, pl, n, def, level, rung: { LES: rungLES(w, patterns, level), SKRIV: rungSKRIV(w, patterns) },
    patterns: patterns.filter(x => !['lang_vokal', 'uregelrett_bøyning', 'sammensatt'].includes(x)), castable: true, p0,
    pr: p0 ? 0 : flags.includes('1') ? 1 : 2, tags: tags ? tags.split(',') : [], colour: flags.includes('c'), mass: flags.includes('m'),
    pack: p0 ? null : (PACK[cat] || null) });
  for (const t of (tags ? tags.split(',') : [])) if (!NEED_TAGS[t]) throw new Error('unknown need tag ' + t + ' on ' + w);
}

/* ---------------------------------------------------------------- non-model reading/writing words from the lexicon */
const FREQ = { 'høy': 3, middels: 2, lav: 1 };
const QUOTA = { 2: 22, 3: 24, 4: 24, 5: 24, 6: 20, 7: 24, 8: 24, 9: 22 };   // per SKRIV rung (bounded speech: WORDS ≤ 450)
const OKPOS = { subst: 1, adj: 1, verb: 1 };
const BADTHEME = { 'småord': 1, 'spørsmål': 1, kropp: 0 };
const cand = LEX.filter(e => OKPOS[e.pos] && !BADTHEME[e.theme] && e.w.length >= 3 && e.w.length <= 6 && /^[a-zæøå]+$/.test(e.w) &&
  !BLACK.has(e.w) && !seen.has(e.w) && e.age <= 7 && e.freq !== 'lav');
const byRung = {};
for (const e of cand) {
  const r = rungSKRIV(e.w, e.patterns);
  (byRung[r] = byRung[r] || []).push(e);
}
const lexWords = [];
for (const r in QUOTA) {
  const arr = (byRung[r] || []).sort((a, b) => (FREQ[b.freq] - FREQ[a.freq]) || (a.age - b.age) || (a.pos === 'subst' ? -1 : 0) - (b.pos === 'subst' ? -1 : 0) || a.w.localeCompare(b.w));
  const seenW = new Set();
  for (const e of arr) { if (seenW.size >= QUOTA[r]) break; if (seenW.has(e.w)) continue; seenW.add(e.w); lexWords.push(e); }
}
for (const e of lexWords) {
  if (seen.has(e.w)) continue; seen.add(e.w);
  const patterns = e.patterns.filter(x => !['lang_vokal', 'uregelrett_bøyning', 'sammensatt'].includes(x));
  list.push({ w: e.w, model: null, cat: e.theme, pos: e.pos, react: null, pl: (e.forms && (e.forms.ub_fl || e.forms.pl)) || null,
    n: e.gender === 'n' ? 'et' : e.gender ? 'en' : null, def: e.forms && e.forms.b_ent || null, level: e.level,
    rung: { LES: rungLES(e.w, e.patterns, e.level), SKRIV: rungSKRIV(e.w, e.patterns) }, patterns, castable: false, p0: false, pr: 3, tags: [] });
}

/* ---------------------------------------------------------------- reading content: phrases, yes/no, commands, riddles */
const COLOURS = { rød: 'red', blå: 'blue', gul: 'yellow', grønn: 'green', lilla: 'purple', rosa: 'pink', hvit: 'white', brun: 'brown' };
const PHRASE_NOUNS = ['ball', 'kake', 'hatt', 'bil', 'båt', 'kopp', 'rose', 'lue', 'sko', 'kjole'];
const PHRASES = [];
for (const c in COLOURS) for (const w of PHRASE_NOUNS) PHRASES.push(c + ' ' + w);
for (const w of ['ball', 'kake', 'hatt', 'båt', 'kopp']) { PHRASES.push('stor ' + w); PHRASES.push('liten ' + w); }
// yes/no: «Ballen er rød.» shown with one coloured model
const YN_NOUNS = ['ball', 'hatt', 'bil', 'båt', 'kopp', 'lue'];
const YN = [];
for (const w of YN_NOUNS) { const e = list.find(x => x.w === w); for (const c in COLOURS) YN.push({ t: `${cap(e.def)} er ${c}.`, w, c }); }
const FACTS = [ // [sentence, answer, model]
  ['Katten sier mjau.', 'ja', 'katt'], ['Hunden sier voff.', 'ja', 'hund'], ['Sauen sier bæ.', 'ja', 'sau'], ['Fisken kan gå.', 'nei', 'fisk'],
  ['Hesten kan fly.', 'nei', 'hest'], ['Sola er gul.', 'ja', 'sol'], ['Snøen er varm.', 'nei', 'snø'], ['Fuglen kan fly.', 'ja', 'fugl'],
  ['Kaka er god.', 'ja', 'kake'], ['Musa er stor.', 'nei', 'mus'], ['Båten er på vannet.', 'ja', 'båt'], ['Katten sier nøff.', 'nei', 'katt'],
  ['Grisen er rosa.', 'ja', 'gris'], ['Eplet er blått.', 'nei', 'eple'], ['Toget har hjul.', 'ja', 'tog'], ['Senga er til å sove i.', 'ja', 'seng'],
  ['Kongen har krone.', 'ja', 'krone'], ['Fisken bor i vann.', 'ja', 'fisk'], ['Sokken er på hodet.', 'nei', 'sokk'], ['Anda kan svømme.', 'ja', 'and'],
];
// commands (F28 Les og gjør): give X a Y
const CMDS = [];
const CMD_PAIRS = { Tass: ['ball', 'pølse', 'bamse'], Pus: ['fisk', 'melk', 'pute'], Mia: ['dukke', 'bamse', 'krone', 'kake', 'ball', 'blomst', 'tiara'],
  kongen: ['kake', 'krone', 'kopp', 'bolle', 'hatt', 'vaffel'], dronningen: ['rose', 'bok', 'kopp', 'blomst', 'eple', 'tiara'] };
for (const who in CMD_PAIRS) for (const w of CMD_PAIRS[who]) {
  const e = list.find(x => x.w === w); const obj = e.mass ? w : e.n + ' ' + w;
  CMDS.push({ t: `Gi ${who} ${obj}.`, who, w });
}
const RIDDLES = [ // [text, answer, distractor1, distractor2] – each distractor matches only ONE clue
  ['Den er gul. Den lyser.', 'sol', 'banan', 'ost'], ['Den er gul. Du kan spise den.', 'banan', 'sol', 'eple'],
  ['Den er rund. Du kan sparke den.', 'ball', 'eple', 'sko'], ['Den sier mjau.', 'katt', 'hund', 'sau'], ['Den sier voff.', 'hund', 'katt', 'and'],
  ['Den sier bæ.', 'sau', 'gris', 'katt'], ['Den sier nøff.', 'gris', 'sau', 'hund'], ['Den sier rapp.', 'and', 'due', 'gris'],
  ['Den svømmer i vannet.', 'fisk', 'katt', 'ball'], ['Den har hjul. Du kan sykle på den.', 'sykkel', 'bil', 'hest'],
  ['Den kjører på skinner.', 'tog', 'bil', 'båt'], ['Den flyr i lufta.', 'fly', 'båt', 'bil'], ['Den flyter på vannet.', 'båt', 'bil', 'stol'],
  ['Du sover i den.', 'seng', 'stol', 'bord'], ['Den har fire bein. Du sitter på den.', 'stol', 'bord', 'ball'],
  ['Kongen har den på hodet.', 'krone', 'sko', 'kopp'], ['Den er varm. Du har den på hånda.', 'vott', 'lue', 'ring'],
  ['Den er varm. Du har den rundt halsen.', 'skjerf', 'lue', 'ring'], ['Du drikker av den.', 'kopp', 'bok', 'sko'],
  ['Du leser i den.', 'bok', 'kopp', 'stol'], ['Den er hvit. Du drikker den.', 'melk', 'saft', 'egg'], ['Den er rød. Den lukter godt.', 'rose', 'bil', 'ball'],
  ['Den er stor. Du kan ri på den.', 'hest', 'mus', 'bil'], ['Den er liten. Den liker ost.', 'mus', 'hest', 'fisk'],
  ['Den har lange ører. Den hopper.', 'kanin', 'gris', 'ball'], ['Den er kald og hvit.', 'snø', 'sol', 'melk'],
  ['Den er på himmelen. Den er hvit og myk.', 'sky', 'sol', 'sau'], ['Den lyser om natta.', 'måne', 'sol', 'stein'],
  ['Den har grønne blader. Den er høy.', 'tre', 'blomst', 'tårn'], ['Den er myk. Du sover med den.', 'bamse', 'stein', 'bok'],
  ['Du leker med den. Den har kjole.', 'dukke', 'ball', 'sko'], ['Den er varm. Den er i stua.', 'peis', 'sol', 'sofa'],
  ['Du har den på fingeren.', 'ring', 'sokk', 'hatt'], ['Du spiller på den. Den er stor og svart.', 'piano', 'bord', 'tromme'],
  ['Du slår på den. Den sier bom.', 'tromme', 'gitar', 'ball'], ['Den har strenger. Den lager musikk.', 'gitar', 'tromme', 'tau'],
  ['Du bor i det.', 'hus', 'bil', 'tre'], ['Du kan gå over vannet på den.', 'bro', 'hus', 'bil'], ['Den har vinger og fjær.', 'fugl', 'fly', 'katt'],
  ['Den hopper. Den er grønn.', 'frosk', 'ball', 'tre'], ['Den har hjerter. Du spiser den.', 'vaffel', 'bok', 'ost'],
];
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
for (const r of RIDDLES) for (const w of r.slice(1)) if (!list.find(x => x.w === w && x.castable)) throw new Error('riddle word not castable ' + w);
for (const f of FACTS) if (!list.find(x => x.w === f[2] && x.castable)) throw new Error('fact word not castable ' + f[2]);
for (const c of CMDS) if (!list.find(x => x.w === c.w && x.castable)) throw new Error('cmd word not castable ' + c.w);

/* ---------------------------------------------------------------- write */
const NUMWORDS = { 0: 'null', 1: 'en', 2: 'to', 3: 'tre', 4: 'fire', 5: 'fem', 6: 'seks', 7: 'sju', 8: 'åtte', 9: 'ni', 10: 'ti', 11: 'elleve', 12: 'tolv',
  13: 'tretten', 14: 'fjorten', 15: 'femten', 16: 'seksten', 17: 'sytten', 18: 'atten', 19: 'nitten', 20: 'tjue',
  30: 'tretti', 40: 'førti', 50: 'femti', 60: 'seksti', 70: 'sytti', 80: 'åtti', 90: 'nitti', 100: 'hundre' };

const castN = list.filter(x => x.castable).length;
const rows = list.map(x => '  ' + JSON.stringify(x)).join(',\n');
const out = `/* Feslottet – F.WORDS: the word library (DESIGN §9.2, ARCHITECTURE §3).  Owner: LEARN.
   GENERATED by tools/build_words.js from its hand-curated CASTABLE table + _dev/lexicon_3to6.json – edit the tool, not this file.
   Pure data + helpers (no THREE/DOM): loads in Node too.

   Entry: {w, model, cat, react, pl, n, def, level, rung:{LES,SKRIV}, patterns, castable, p0, pr, tags, colour, mass, pack}
     w         the word (lowercase bokmål, 3–6 letters)
     model     VOX model id (=== w) for castables, null for reading/writing-only words
     cat       castables: mat leker klær dyr møbler ting natur hus kjøretøy musikk eventyr ; lexicon words: the lexicon theme
     react     what a character does with it: eat wear play pet sit smell warm light look ride
     pl        indefinite plural («14 hatter»)      n  article 'en'|'et' (null for adjectives/verbs)     def  definite singular («kaka»)
     level     lexicon spelling level 1–6            rung  primary ladder rung for LES (1–9) and SKRIV (2–9)
     patterns  spelling patterns (konsonantgruppe dobbel_konsonant diftong ng kj skj sj j_lyd stum_d stum_g stum_h …)
     p0        model agents build these 60 first     pr  0 = P0, 1 = next, 2 = rest, 3 = no model
     tags      need tags: ${Object.keys(NEED_TAGS).join(' ')}
     colour    model honours o.c (a PAL name, see F.WORDS.COLOURS) for its main colour (used by LES L10 phrases «rød ball»)
     mass      mass noun (melk, sand…): count it as «14 glass melk» or not at all
     pack      free-cast lock pack id (dyr mat leker klær hage eventyr) or null (always unlocked).  Tasks may cast locked words.
   Helpers: get(w) castable(opts?) byTag(tag) byCat(cat) byRung(strand, r, {castable}) pairs(w) (castable words at edit distance 1, same length)
            TAGS {tag:{cat, need}}  COLOURS {rød:'red',…}  NUMWORDS {11:'elleve',…}  PHRASES  YN  FACTS  CMDS  RIDDLES
   Speech sets (bounded): F.SETS.WORDS (all words) PLURALS CASTABLES CATS NEEDS PHRASES SENTENCES (YN+FACTS+CMDS+riddle lines) NUMWORDS
   ${castN} castables (${nP0.n} P0), ${list.length - castN} reading/writing-only words. */
(function () {
'use strict';
const F = (typeof window !== 'undefined' ? window : globalThis).F = (typeof window !== 'undefined' ? window : globalThis).F || {};
const LIST = [
${rows}
];
const BY = {}; LIST.forEach(x => { BY[x.w] = x; });
const ed1 = (a, b) => { if (a.length !== b.length || a === b) return false; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false; return d === 1; };
const pairCache = {};
F.WORDS = {
  list: LIST,
  get: w => BY[String(w).toLowerCase()] || null,
  has: w => !!BY[String(w).toLowerCase()],
  castable: o => LIST.filter(x => x.castable && (!o || (o.p0 == null || x.p0 === o.p0) && (o.maxPr == null || x.pr <= o.maxPr))),
  byTag: tag => LIST.filter(x => x.castable && x.tags.includes(tag)),
  byCat: cat => LIST.filter(x => x.castable && x.cat === cat),
  byRung: (strand, r, o) => LIST.filter(x => x.rung[strand] === r && (!o || o.castable == null || x.castable === o.castable)),
  pairs(w) { if (!pairCache[w]) pairCache[w] = LIST.filter(x => x.castable && ed1(x.w, w)).map(x => x.w); return pairCache[w]; },
  TAGS: ${JSON.stringify(NEED_TAGS)},
  COLOURS: ${JSON.stringify(COLOURS)},
  NUMWORDS: ${JSON.stringify(NUMWORDS)},
  PHRASES: ${JSON.stringify(PHRASES)},
  YN: ${JSON.stringify(YN)},
  FACTS: ${JSON.stringify(FACTS)},
  CMDS: ${JSON.stringify(CMDS)},
  RIDDLES: ${JSON.stringify(RIDDLES)},
};
// bounded speech sets (DESIGN §10.2)
const S = F.SETS = F.SETS || {};
S.WORDS = LIST.map(x => x.w);
S.CASTABLES = LIST.filter(x => x.castable).map(x => x.w);
S.PLURALS = LIST.filter(x => x.castable && !x.mass && x.pr <= 1 && x.pl).map(x => x.pl).filter((v, i, a) => a.indexOf(v) === i).slice(0, 120);
S.CATS = Object.keys(F.WORDS.TAGS).map(k => F.WORDS.TAGS[k].cat);
S.NEEDS = Object.keys(F.WORDS.TAGS).filter(k => F.WORDS.TAGS[k].need).map(k => F.WORDS.TAGS[k].need);
S.PHRASES = F.WORDS.PHRASES.slice();
S.SENTENCES = [].concat(F.WORDS.YN.map(x => x.t), F.WORDS.FACTS.map(x => x[0]), F.WORDS.CMDS.map(x => x.t));
S.RIDDLES = F.WORDS.RIDDLES.map(x => x[0]);
S.NUMWORDS = Object.keys(F.WORDS.NUMWORDS).filter(k => k >= 10 && k <= 20 || k % 10 === 0 && k < 100).map(k => F.WORDS.NUMWORDS[k]);
})();
`;
fs.writeFileSync(path.join(ROOT, 'js/data/words.js'), out);
const counts = {}; list.forEach(x => { const k = (x.castable ? 'C' : 'L'); counts[k] = (counts[k] || 0) + 1; });
const rl = {}, rs = {}; list.forEach(x => { const k = (x.castable ? 'c' : 'l'); rl['L' + x.rung.LES + k] = (rl['L' + x.rung.LES + k] || 0) + 1; rs['S' + x.rung.SKRIV + k] = (rs['S' + x.rung.SKRIV + k] || 0) + 1; });
console.log('words.js:', list.length, 'words;', castN, 'castable;', nP0.n, 'P0');
console.log('LES rungs', JSON.stringify(rl)); console.log('SKRIV rungs', JSON.stringify(rs));
console.log('phrases', PHRASES.length, 'yn', YN.length, 'facts', FACTS.length, 'cmds', CMDS.length, 'riddles', RIDDLES.length);
