/* Feslottet – F.THEMES: what each album animal eats, where it lives, its babies, body, size, season, sound, words and expressions
   (DESIGN5 §2.1, DESIGN4 §9–§10). Owner: WP-A. Pure data + tiny lookups (no THREE/DOM; runs in Node too).
   Sources: _dev/curriculum/knowledge_seed.json (facts checked there) + js/data/fauna.js (species, models, sounds).
   Rules: correct, child-appropriate, never scary – no predation is ever shown or asked (food = plants, fruit, seeds, nectar, fish and
   shellfish only; hunters simply get no «mat» question); legends get fairy-tale facts, marked fairy:true («I eventyret …»).

   F.THEMES.of(spId) -> theme | null   merged theme for any album species: glitter variants (krystallkatt …) use their base species'
       real-world theme (variant:true – facts speak about the base, e.g. «Katten ser godt i mørket.»); legends their own fairy theme.
       theme = { id, base, kl, dekke, bein, type, mat:[food model ids], spiser:'fact sentence about food'|null, hjem:'word', hjemM:model|null,
                 unge:{id, word, model}|null (its baby), mor:<mother species id>|null (for a baby species), str:'s'|'m'|'l',
                 vinter, aktiv, lyd (sfx id = F.FAUNA sound), ord:[tier-2 words], uttrykk:{text, stem, svar}|null, fakta:[sentences], fairy }
   F.THEMES.FOOD      food model id → {word (plural/mass noun as spoken), w1 (one)}       F.THEMES.foodModels() → all food model ids
   F.THEMES.WORDS     tier-2 words (ORD Or-T; v5c WP-A2: 33, each friend teaches all of its words over the days)    F.THEMES.EXPR  expressions (Or-U)
   F.THEMES.season(date) / migrant(sp) / sleeper(sp) / awayKind(sp, date) → 'reise' | 'dvale' | null   (v5c WP-A2: the real seasons)
   F.THEMES.NEAR      word → species that ALSO fit it without teaching it (never a distractor of «Hvem av dyrene er …?»; v5c WP-A2)
   F.THEMES.withFood() / withBaby() / withWord(w) / withExpr() / withHome()  → species ids (base species only, for distractors and decks)
   F.THEMES.HOME  species → [home model, home fact] (V2 «Hvor bor den?»: only homes that have a 3D model)
   F.THEMES.thingsFor(spId) → [model ids] the animal's own things for counting/building in encounters (food first, then home things). */
(function () {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const F = G.F = G.F || {};

/* ---------------------------------------------------------- foods with a 3D model (m_food.js / m_nature.js / m_animals.js) */
const FOOD = {
  'nøtt': { word: 'nøtter', w1: 'en nøtt' }, gulrot: { word: 'gulrøtter', w1: 'en gulrot' }, n_gress: { word: 'gress', w1: 'gress' },
  'kål': { word: 'kål', w1: 'et kålhode' }, salat: { word: 'salat', w1: 'salat' }, eple: { word: 'epler', w1: 'et eple' },
  banan: { word: 'bananer', w1: 'en banan' }, drue: { word: 'druer', w1: 'en drue' }, 'bær': { word: 'bær', w1: 'et bær' },
  'blåbær': { word: 'blåbær', w1: 'et blåbær' }, mais: { word: 'korn', w1: 'et maiskorn' }, fisk: { word: 'fisk', w1: 'en fisk' },
  n_klover: { word: 'kløver', w1: 'kløver' }, n_blomst: { word: 'blomster', w1: 'en blomst' }, n_hoyball: { word: 'høy', w1: 'høy' },
  n_skjell: { word: 'skjell', w1: 'et skjell' }, n_nokkerose: { word: 'vannplanter', w1: 'en vannplante' }, 'pære': { word: 'pærer', w1: 'en pære' },
};
// (the food words are never put into speech slots here: a fact sentence is one whole clip, the question is deictic «Hva spiser den?»)

/* ---------------------------------------------------------- tier-2 words (ORD Or-T) and expressions (ORD Or-U) */
const WORDS = ['nysgjerrig', 'forsiktig', 'modig', 'sjenert', 'glupsk', 'sta', 'flittig', 'stolt', 'lur', 'rolig', 'ivrig', 'trøtt', 'blid',
  'leken', 'tålmodig', 'sterk', 'klok', 'rask',
  // v5c WP-A2: 15 more (the deck lasted ≈ 16 days – longevity_plan §1.1); each friend now teaches all its words over the days
  'kjælen', 'pratsom', 'skvetten', 'travel', 'vennlig', 'smidig', 'rampete', 'grasiøs', 'klumsete', 'hjelpsom', 'lydløs', 'staselig', 'kvikk',
  'bråkete', 'lodden'];
// v5c WP-A2: animals that ALSO fit a word without teaching it (a cat is quiet too, every kitten is cuddly): never a distractor of
// «Hvem av dyrene er …?» – a distractor must be clearly wrong
const NEAR = {
  kjælen: ['kattunge', 'hund', 'valp', 'kanin', 'ponni', 'papegøye', 'hest', 'lam'],
  pratsom: ['kråke', 'måke', 'spurv', 'meis', 'trost', 'lerke', 'høne', 'and', 'gås', 'delfin', 'andunge'],
  skvetten: ['kanin', 'snøhare', 'mus', 'ekorn', 'lemen', 'rype', 'marsvin', 'sau', 'fisk', 'gullfisk', 'krabbe', 'lam', 'gresshoppe'],
  travel: ['humle', 'ekorn', 'bever', 'hakkespett', 'meis', 'spurv', 'høne'],
  vennlig: ['hund', 'valp', 'katt', 'kattunge', 'ku', 'sau', 'kanin', 'marsvin', 'hest', 'esel', 'lam', 'kalv', 'føll', 'lama', 'and', 'andunge'],
  smidig: ['kattunge', 'ekorn', 'rev', 'fjellrev', 'sel', 'mus', 'geit'],
  rampete: ['skjære', 'kråke', 'ekorn', 'oter', 'papegøye', 'geit', 'lam', 'føll', 'kalv', 'måke'],
  'grasiøs': ['rådyr', 'delfin', 'sommerfugl', 'hest', 'ponni', 'katt', 'hegre'],
  klumsete: ['andunge', 'and', 'gås', 'sel', 'føll', 'kalv', 'lam', 'valp'],
  hjelpsom: ['hest', 'esel', 'ponni', 'rein', 'bie', 'ku'],
  'lydløs': ['katt', 'kattunge', 'mus', 'rev', 'fjellrev', 'sommerfugl', 'snegl', 'fisk', 'gullfisk', 'sjøhest', 'manet', 'larve'],
  staselig: ['hest', 'rein', 'svane', 'moskus', 'rådyr'],
  kvikk: ['spurv', 'mus', 'hare', 'snøhare', 'kanin', 'gresshoppe', 'svale', 'øyenstikker', 'lemen', 'rev'],
  'bråkete': ['skjære', 'gås', 'and', 'papegøye', 'høne', 'gris', 'esel', 'hund', 'valp', 'gresshoppe', 'lunde', 'tjeld'],
  lodden: ['sau', 'lam', 'lama', 'kanin', 'marsvin', 'katt', 'hund', 'valp', 'kattunge', 'rev', 'fjellrev', 'grevling', 'ekorn', 'bever', 'oter',
    'rein', 'larve', 'ku', 'kalv', 'hest', 'føll', 'ponni', 'esel', 'geit', 'gris', 'mus', 'hare', 'snøhare', 'lemen', 'elg', 'rådyr', 'pinnsvin'],
};
// stem = the expression with the animal left out (cloze); svar = species ids that complete it
const EXPR = [
  { id: 'mus', text: 'stille som en mus', stem: 'Stille som en …', svar: ['mus'] },
  { id: 'esel', text: 'sta som et esel', stem: 'Sta som et …', svar: ['esel'] },
  { id: 'rev', text: 'lur som en rev', stem: 'Lur som en …', svar: ['rev', 'fjellrev'] },
  { id: 'maur', text: 'flittig som en maur', stem: 'Flittig som en …', svar: ['maur', 'bie'] },
  { id: 'bie', text: 'flittig som en bie', stem: 'Flittig som en …', svar: ['bie', 'maur'] },
  { id: 'lerke', text: 'glad som en lerke', stem: 'Glad som en …', svar: ['lerke'] },
  { id: 'snegl', text: 'treg som en snegle', stem: 'Treg som en …', svar: ['snegl'] },
  { id: 'hare', text: 'rask som en hare', stem: 'Rask som en …', svar: ['hare', 'snøhare'] },
  { id: 'ugle', text: 'klok som en ugle', stem: 'Klok som en …', svar: ['ugle'] },
  { id: 'hest', text: 'sterk som en hest', stem: 'Sterk som en …', svar: ['hest'] },
  { id: 'fisk', text: 'frisk som en fisk', stem: 'Frisk som en …', svar: ['fisk', 'gullfisk', 'torsk', 'makrell'] },
  { id: 'hund', text: 'trofast som en hund', stem: 'Trofast som en …', svar: ['hund'] },
  { id: 'skjære', text: 'skravler som en skjære', stem: 'Skravler som en …', svar: ['skjære'] },
  { id: 'kattunge', text: 'leken som en kattunge', stem: 'Leken som en …', svar: ['kattunge'] },
];

/* ---------------------------------------------------------- the base species (real animals) */
// kl class · dekke cover · bein legs · type diet · mat food models · spiser food fact · hjem home word (hjemM model) · str size s/m/l ·
// vinter · aktiv · ord tier-2 words · ux expression id · fakta (≤ 3, the first two are taught first)
const P = 'pattedyr', FU = 'fugl', IN = 'insekt', FI = 'fisk';
const T = {
  due: { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['mais'], spiser: 'Duen spiser frø og korn.', hjem: 'rede', str: 's', vinter: 'som vanlig', ord: ['rolig'], fakta: ['Duer finner veien hjem over lange avstander.'] },
  and: { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['n_nokkerose'], spiser: 'Anda spiser vannplanter og småkryp.', hjem: 'dam', hjemM: 'p_andedam', unge: 'andunge', str: 's', ord: ['blid'], fakta: ['Anda har svømmehud mellom tærne.', 'Andungene går på rad etter mor.'] },
  ekorn: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['nøtt'], spiser: 'Ekornet spiser nøtter og kongler.', hjem: 'tre', str: 's', vinter: 'samler mat', ord: ['nysgjerrig', 'flittig', 'kvikk'], fakta: ['Ekornet samler nøtter til vinteren.', 'Ekornet gjemmer nøtter, og noen blir til nye trær.'] },
  kanin: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['gulrot', 'n_gress', 'kål'], spiser: 'Kaninen spiser gress og grønnsaker.', hjem: 'hule', str: 's', ord: ['forsiktig'], fakta: ['Kaninungene blir født nakne og blinde.', 'Kaninen har lange ører.'] },
  sommerfugl: { kl: IN, dekke: 'skall', bein: 6, type: 'planteeter', mat: ['n_blomst'], spiser: 'Sommerfuglen drikker nektar fra blomster.', hjem: 'eng', str: 's', unge: 'larve', fakta: ['En larve blir til en sommerfugl.', 'Sommerfuglen har seks bein.'] },
  svane: { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['n_nokkerose'], spiser: 'Svanen spiser vannplanter.', hjem: 'innsjø', str: 'l', ord: ['stolt', 'grasiøs'], fakta: ['Svaneungene er grå.', 'Svanen har en lang hals.'] },
  pinnsvin: { kl: P, dekke: 'pigger', bein: 4, type: 'insektspiser', mat: [], spiser: null, hjem: 'busk', str: 's', vinter: 'dvale', aktiv: 'natt', ord: ['forsiktig'], fakta: ['Pinnsvinet sover hele vinteren.', 'Pinnsvinet ruller seg sammen til en ball.', 'Pinnsvinet er ute om natta.'] },
  katt: { kl: P, dekke: 'pels', bein: 4, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hus', unge: 'kattunge', str: 's', ord: ['nysgjerrig', 'kjælen', 'smidig'], fakta: ['Katten ser godt i mørket.', 'Katten har værhår som kjenner.'] },
  hund: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: [], spiser: null, hjem: 'hus', unge: 'valp', str: 'm', ord: ['ivrig', 'hjelpsom'], ux: 'hund', fakta: ['Hunden lukter mye bedre enn oss.', 'Hunden logrer med halen når den er glad.'] },
  mus: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: ['mais'], spiser: 'Musa spiser frø og korn.', hjem: 'hull', str: 's', aktiv: 'natt', ord: ['sjenert'], ux: 'mus', fakta: ['Musa har lang hale og store ører.'] },
  spurv: { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['mais'], spiser: 'Spurven spiser frø og korn.', hjem: 'rede', str: 's', vinter: 'som vanlig', ord: ['ivrig'], fakta: ['Spurven bor nær folk.'] },
  papegøye: { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['eple', 'banan', 'drue'], spiser: 'Papegøyen spiser frø og frukt.', hjem: 'tre', str: 'm', ord: ['nysgjerrig', 'pratsom'], fakta: ['Papegøyen kan herme etter ord.', 'Papegøyer kommer fra varme land.'] },
  marsvin: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['gulrot', 'n_gress', 'salat'], spiser: 'Marsvinet spiser høy og grønnsaker.', hjem: 'bur', str: 's', ord: ['sjenert', 'kjælen'], fakta: ['Marsvinet kommer fra Sør-Amerika.'] },
  ku: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_hoyball'], spiser: 'Kua spiser gress og høy.', hjem: 'fjøs', unge: 'kalv', str: 'l', ord: ['rolig'], fakta: ['Kua gir oss melk.', 'Kua tygger maten mange ganger.'] },
  sau: { kl: P, dekke: 'ull', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Sauen spiser gress.', hjem: 'fjøs', unge: 'lam', str: 'm', ord: ['forsiktig'], fakta: ['Sauen gir oss ull.', 'Av ull kan vi strikke gensere.'] },
  gris: { kl: P, dekke: 'hud', bein: 4, type: 'altspiser', mat: ['eple', 'gulrot', 'mais'], spiser: 'Grisen spiser nesten alt.', hjem: 'binge', str: 'm', ord: ['glupsk'], fakta: ['Grisen ruller seg i gjørme for å holde seg kjølig.', 'Grisen er et smart dyr.'] },
  'høne': { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['mais'], spiser: 'Høna spiser korn og småkryp.', hjem: 'hønsehus', hjemM: 'p_honsehus', unge: 'kylling', str: 's', ord: ['ivrig'], fakta: ['Høna legger egg.', 'Kyllingen kommer ut av egget.'] },
  hest: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_hoyball', 'gulrot', 'eple'], spiser: 'Hesten spiser gress og høy.', hjem: 'stall', hjemM: 'p_stall', unge: 'føll', str: 'l', ord: ['sterk', 'modig'], ux: 'hest', fakta: ['Hesten kan sove stående.'] },
  geit: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'kål'], spiser: 'Geita spiser gress, blader og kvister.', hjem: 'fjøs', unge: 'kje', str: 'm', ord: ['sta', 'modig'], fakta: ['Geita er flink til å klatre.', 'Brunost lages av melk fra geit og ku.'] },
  bie: { kl: IN, dekke: 'skall', bein: 6, type: 'planteeter', mat: ['n_blomst'], spiser: 'Bia henter nektar fra blomster.', hjem: 'bikube', hjemM: 'n_bikube', unge: 'larve', str: 's', ord: ['flittig', 'travel'], ux: 'bie', fakta: ['Bia lager honning av nektar.', 'Bia hjelper blomstene å lage frø.', 'I bikuben bor det en dronning.'] },
  humle: { kl: IN, dekke: 'skall', bein: 6, type: 'planteeter', mat: ['n_blomst', 'n_klover'], spiser: 'Humla henter nektar fra blomster.', hjem: 'eng', str: 's', ord: ['rolig', 'lodden'], fakta: ['Humla er tykk og lodden.', 'Bare humledronninga sover gjennom vinteren.'] },
  larve: { kl: IN, dekke: 'hud', bein: 6, type: 'planteeter', mat: ['salat', 'kål'], spiser: 'Larven spiser blader.', hjem: 'blad', str: 's', mor: 'sommerfugl', ord: ['glupsk'], fakta: ['Larven blir til en sommerfugl.', 'Larven spiser og spiser og vokser.'] },
  'marihøne': { kl: IN, dekke: 'skall', bein: 6, type: 'insektspiser', mat: [], spiser: null, hjem: 'blad', str: 's', ord: ['blid', 'hjelpsom'], fakta: ['Marihøna hjelper gartneren.', 'Marihøna er rød med svarte prikker.'] },
  gresshoppe: { kl: IN, dekke: 'skall', bein: 6, type: 'planteeter', mat: ['n_gress'], spiser: 'Gresshoppa spiser gress.', hjem: 'eng', str: 's', ord: ['rask'], fakta: ['Gresshoppa synger med beina og vingene.', 'Gresshoppa kan hoppe veldig langt.'] },
  'rådyr': { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_klover', 'n_gress'], spiser: 'Rådyret spiser blader, urter og kløver.', hjem: 'skog', str: 'm', ord: ['forsiktig', 'sjenert', 'skvetten'], fakta: ['Bare bukken har gevir.', 'Rådyrkalven har hvite prikker.'] },
  lerke: { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['mais'], spiser: 'Lerka spiser frø og småkryp.', hjem: 'eng', str: 's', vinter: 'trekker sørover', ord: ['blid'], ux: 'lerke', fakta: ['Lerka synger mens den flyr høyt opp.', 'Lerka kommer tidlig om våren.'] },
  vipe: { kl: FU, dekke: 'fjær', bein: 2, type: 'insektspiser', mat: [], spiser: null, hjem: 'eng', str: 's', vinter: 'trekker sørover', ord: ['modig'], fakta: ['Vipa legger eggene på bakken.', 'Vipa har en liten fjærtopp på hodet.'] },
  meis: { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['nøtt'], spiser: 'Meisen spiser frø, nøtter og larver.', hjem: 'fuglekasse', str: 's', vinter: 'som vanlig', ord: ['modig', 'kvikk'], fakta: ['Om vinteren liker meisen meisebollen.'] },
  trost: { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['bær', 'blåbær'], spiser: 'Trosten spiser bær og meitemark.', hjem: 'rede', str: 's', ord: ['blid'], fakta: ['Trosten synger fint om våren.'] },
  snegl: { kl: 'bløtdyr', dekke: 'skall', bein: 0, type: 'planteeter', mat: ['salat', 'kål'], spiser: 'Sneglen spiser blader og salat.', hjem: 'sneglehus', str: 's', ord: ['tålmodig'], ux: 'snegl', fakta: ['Sneglen bærer huset sitt på ryggen.', 'Sneglen har ingen bein, bare en fot.'] },
  maur: { kl: IN, dekke: 'skall', bein: 6, type: 'altspiser', mat: [], spiser: null, hjem: 'maurtue', str: 's', ord: ['flittig', 'sterk', 'travel'], ux: 'maur', fakta: ['Mauren kan bære mye mer enn seg selv.', 'I maurtua bor det en dronning.'] },
  'kråke': { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['nøtt'], spiser: 'Kråka spiser nesten alt.', hjem: 'rede', str: 'm', vinter: 'som vanlig', ord: ['lur', 'bråkete'], fakta: ['Kråka er en veldig smart fugl.'] },
  hakkespett: { kl: FU, dekke: 'fjær', bein: 2, type: 'insektspiser', mat: [], spiser: null, hjem: 'trehull', str: 's', ord: ['flittig'], fakta: ['Hakkespetten hakker hull i trær for å finne insekter.'] },
  grevling: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: ['bær'], spiser: 'Grevlingen spiser mark, bær og røtter.', hjem: 'hi', str: 'm', vinter: 'dvale', aktiv: 'natt', ord: ['trøtt'], fakta: ['Grevlingen sover det meste av vinteren i hiet.', 'Grevlingen har svarte og hvite striper på hodet.'] },
  ugle: { kl: FU, dekke: 'fjær', bein: 2, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'trehull', str: 'm', aktiv: 'natt', ord: ['klok', 'lydløs'], ux: 'ugle', fakta: ['Ugla er våken om natta.', 'Ugla flyr helt stille.', 'Ugla kan snu hodet nesten helt rundt.'] },
  frosk: { kl: 'amfibium', dekke: 'hud', bein: 4, type: 'insektspiser', mat: [], spiser: null, hjem: 'dam', unge: 'rumpetroll', str: 's', vinter: 'dvale', ord: ['ivrig'], fakta: ['Rumpetrollet blir til en frosk.', 'Frosken fanger insekter med tunga.'] },
  'gås': { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['n_gress'], spiser: 'Gåsa spiser gress.', hjem: 'innsjø', unge: 'gåsunge', str: 'm', vinter: 'trekker sørover', ord: ['stolt'], fakta: ['Gjessene flyr i V-form sørover om høsten.'] },
  fisk: { kl: FI, dekke: 'skjell', bein: 0, type: 'altspiser', mat: [], spiser: null, hjem: 'innsjø', str: 's', puster: 'gjeller', ord: ['rolig'], ux: 'fisk', fakta: ['Fisken puster med gjeller.', 'Fisken bruker finnene til å svømme.'] },
  'øyenstikker': { kl: IN, dekke: 'skall', bein: 6, type: 'insektspiser', mat: [], spiser: null, hjem: 'dam', str: 's', ord: ['rask'], fakta: ['Øyenstikkeren har fire vinger.', 'Øyenstikkerungen bor i vannet.'] },
  andunge: { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['n_nokkerose'], spiser: 'Andungen spiser vannplanter og småkryp.', hjem: 'dam', str: 's', mor: 'and', ord: ['nysgjerrig'], fakta: ['Andungen er ungen til anda.', 'Andungene går på rad etter mor.'] },
  bever: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: [], spiser: 'Beveren spiser bark og kvister.', hjem: 'beverhytte', str: 'm', ord: ['flittig'], fakta: ['Beveren feller trær med tennene.', 'Beveren bygger hytte av kvister.'] },
  oter: { kl: P, dekke: 'pels', bein: 4, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Oteren spiser fisk.', hjem: 'elv', str: 'm', ord: ['leken', 'smidig'], fakta: ['Oteren har tett pels som holder den varm i vannet.', 'Oteren liker å leke og skli.'] },
  hegre: { kl: FU, dekke: 'fjær', bein: 2, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Hegren spiser fisk.', hjem: 'innsjø', str: 'l', ord: ['tålmodig'], fakta: ['Hegren står helt stille og venter.', 'Hegren har lange bein.'] },
  hare: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_klover'], spiser: 'Haren spiser gress og kvister.', hjem: 'skog', str: 's', ord: ['rask', 'forsiktig', 'skvetten'], ux: 'hare', fakta: ['Hareungene blir født med pels og åpne øyne.', 'Haren har lange bakbein.'] },
  esel: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_hoyball', 'gulrot'], spiser: 'Eselet spiser gress og høy.', hjem: 'stall', hjemM: 'p_stall', unge: 'føll', str: 'm', ord: ['sta'], ux: 'esel', fakta: ['Eselet har lange ører.'] },
  ponni: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_hoyball', 'gulrot', 'eple'], spiser: 'Ponnien spiser gress og høy.', hjem: 'stall', hjemM: 'p_stall', unge: 'føll', str: 'm', ord: ['blid', 'vennlig'], fakta: ['En ponni er en liten hest.'] },
  'skjære': { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: [], spiser: 'Skjæra spiser nesten alt.', hjem: 'rede', str: 'm', vinter: 'som vanlig', ord: ['lur', 'nysgjerrig', 'pratsom'], ux: 'skjære', fakta: ['Skjæra kan kjenne seg selv igjen i et speil.', 'Skjæra er svart og hvit.'] },
  svale: { kl: FU, dekke: 'fjær', bein: 2, type: 'insektspiser', mat: [], spiser: null, hjem: 'rede', str: 's', vinter: 'trekker sørover', ord: ['rask'], fakta: ['Svala flyr helt til Afrika om høsten.', 'Svala fanger insekter mens den flyr.'] },
  'føll': { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Føllet drikker melk og spiser gress.', hjem: 'stall', str: 'm', mor: 'hest', ord: ['leken'], fakta: ['Føllet er ungen til hesten.', 'Føllet kan stå like etter at det er født.'] },
  rev: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: ['bær'], spiser: 'Reven spiser mye forskjellig, også bær.', hjem: 'hi', unge: 'revevalp', str: 'm', ord: ['lur'], ux: 'rev', fakta: ['Reveungene heter valper.', 'Reven har en lang og tykk hale.'] },
  lama: { kl: P, dekke: 'ull', bein: 4, type: 'planteeter', mat: ['n_gress', 'n_hoyball'], spiser: 'Lamaen spiser gress og høy.', hjem: 'fjell', str: 'l', ord: ['rolig'], fakta: ['Lamaen kommer fra fjellene i Sør-Amerika.'] },
  krabbe: { kl: 'krepsdyr', dekke: 'skall', bein: 10, type: 'altspiser', mat: [], spiser: null, hjem: 'strand', str: 's', ord: ['forsiktig'], fakta: ['Krabben går sidelengs.', 'Krabben har ti bein, og to av dem er klør.'] },
  'måke': { kl: FU, dekke: 'fjær', bein: 2, type: 'altspiser', mat: ['fisk'], spiser: 'Måka spiser fisk og nesten alt annet.', hjem: 'strand', str: 'm', ord: ['glupsk', 'bråkete'], fakta: ['Måka kan drikke saltvann.'] },
  'sjøstjerne': { kl: 'pigghud', dekke: 'skall', bein: 0, type: 'kjøttspiser', mat: ['n_skjell'], spiser: 'Sjøstjerna spiser skjell.', hjem: 'hav', str: 's', ord: ['rolig'], fakta: ['Sjøstjerna er ikke en fisk.', 'Sjøstjerna kan få en ny arm.'] },
  tjeld: { kl: FU, dekke: 'fjær', bein: 2, type: 'kjøttspiser', mat: ['n_skjell'], spiser: 'Tjelden spiser skjell og mark.', hjem: 'strand', str: 's', vinter: 'trekker sørover', ord: ['ivrig'], fakta: ['Tjelden kommer tidlig om våren.', 'Tjelden har et langt, rødt nebb.'] },
  eremittkreps: { kl: 'krepsdyr', dekke: 'skall', bein: 10, type: 'altspiser', mat: [], spiser: null, hjem: 'sneglehus', str: 's', ord: ['sjenert'], fakta: ['Eremittkrepsen bor i et tomt sneglehus.', 'Når den vokser, bytter den hus.'] },
  sel: { kl: P, dekke: 'pels', bein: 0, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Selen spiser fisk.', hjem: 'hav', unge: 'selunge', str: 'l', ord: ['leken'], fakta: ['Selen puster luft, selv om den bor i havet.', 'Selen har luffer i stedet for bein.'] },
  lunde: { kl: FU, dekke: 'fjær', bein: 2, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Lunden spiser små fisker.', hjem: 'fuglefjell', str: 's', ord: ['blid'], fakta: ['Lunden kan bære mange små fisker i nebbet.', 'Lunden har et nebb i mange farger.'] },
  skilpadde: { kl: 'krypdyr', dekke: 'skall', bein: 4, type: 'planteeter', mat: ['salat', 'n_klover'], spiser: 'Skilpadda spiser blader og salat.', hjem: 'strand', str: 'm', vinter: 'dvale', ord: ['tålmodig', 'rolig'], fakta: ['Skilpadda har huset sitt på ryggen.', 'Skilpadda kan bli veldig gammel.'] },
  makrell: { kl: FI, dekke: 'skjell', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', str: 's', puster: 'gjeller', ord: ['rask'], fakta: ['Makrellen svømmer i stim.', 'Makrellen har striper på ryggen.'] },
  torsk: { kl: FI, dekke: 'skjell', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', str: 'm', puster: 'gjeller', ord: ['rolig'], fakta: ['Tørrfisk er torsk som har tørket i vinden.', 'Fisken puster med gjeller.'] },
  manet: { kl: 'nesledyr', dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', str: 's', ord: ['rolig'], fakta: ['Maneten har ingen hjerne.', 'Maneten er nesten bare vann.'] },
  blekksprut: { kl: 'bløtdyr', dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', str: 'm', ord: ['lur'], fakta: ['Blekkspruten har åtte armer.', 'Blekkspruten kan skifte farge.'] },
  reke: { kl: 'krepsdyr', dekke: 'skall', bein: 10, type: 'altspiser', mat: [], spiser: null, hjem: 'hav', str: 's', ord: ['rask'], fakta: ['Reka har ti bein.'] },
  delfin: { kl: P, dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Delfinen spiser fisk.', hjem: 'hav', unge: 'delfinkalv', str: 'l', puster: 'lunger', ord: ['leken', 'blid', 'vennlig'], fakta: ['Delfinen puster gjennom et hull på toppen av hodet.', 'Delfinen er ikke en fisk.'] },
  hval: { kl: P, dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', unge: 'hvalkalv', str: 'l', puster: 'lunger', ord: ['rolig'], fakta: ['Hvalen er ikke en fisk, den puster luft.', 'Blåhvalen er det største dyret i verden.'] },
  'sjøhest': { kl: FI, dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hav', str: 's', puster: 'gjeller', ord: ['rolig'], fakta: ['Sjøhesten er en fisk.', 'Hos sjøhesten er det pappa som bærer eggene.'] },
  pingvin: { kl: FU, dekke: 'fjær', bein: 2, type: 'kjøttspiser', mat: ['fisk'], spiser: 'Pingvinen spiser fisk.', hjem: 'is', str: 'm', ord: ['modig', 'klumsete'], fakta: ['Pingvinen er en fugl som ikke kan fly.', 'Pingvinen svømmer med vingene.', 'Pingviner bor langt sør, ved Sydpolen.'] },
  rype: { kl: FU, dekke: 'fjær', bein: 2, type: 'planteeter', mat: ['bær', 'blåbær'], spiser: 'Rypa spiser knopper og bær.', hjem: 'fjell', str: 's', vinter: 'blir hvit', ord: ['forsiktig'], fakta: ['Rypa blir hvit om vinteren.', 'Rypa har fjær under føttene.'] },
  'snøhare': { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Snøharen spiser gress og kvister.', hjem: 'fjell', str: 's', vinter: 'blir hvit', ord: ['forsiktig', 'rask'], fakta: ['Snøharen blir hvit om vinteren, så den er vanskelig å se.'] },
  rein: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: [], spiser: 'Reinen spiser reinlav.', hjem: 'fjell', unge: 'reinkalv', str: 'l', ord: ['sterk'], fakta: ['Både reinoksen og simla har gevir.', 'Samene har lang tradisjon med reindrift.'] },
  lemen: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Lemenet spiser gress og mose.', hjem: 'fjell', str: 's', ord: ['modig'], fakta: ['Lemenet lager ganger under snøen.'] },
  fjellrev: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: ['bær'], spiser: 'Fjellreven spiser mye forskjellig, også bær.', hjem: 'fjell', unge: 'revevalp', str: 'm', vinter: 'blir hvit', ord: ['lur'], fakta: ['Fjellreven er hvit om vinteren.', 'Det er få fjellrever igjen i Norge.'] },
  moskus: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Moskusen spiser gress og urter.', hjem: 'fjell', str: 'l', ord: ['sterk', 'lodden'], fakta: ['Moskusen har så tykk pels at den tåler sterk kulde.', 'Moskusen bor på Dovrefjell.'] },
  elg: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: [], spiser: 'Elgen spiser kvister og blader.', hjem: 'skog', unge: 'elgkalv', str: 'l', ord: ['sterk', 'staselig'], fakta: ['Elgen er det største dyret på land i Norge.'] },
  // babies that are album species of their own (a V1 «Hvem er mamma til …?» item shows the baby)
  kattunge: { kl: P, dekke: 'pels', bein: 4, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'hus', str: 's', mor: 'katt', ord: ['leken', 'rampete'], ux: 'kattunge', fakta: ['Kattungen er ungen til katten.', 'Kattungen leker hele dagen.'] },
  valp: { kl: P, dekke: 'pels', bein: 4, type: 'altspiser', mat: [], spiser: null, hjem: 'hus', str: 's', mor: 'hund', ord: ['leken', 'ivrig', 'rampete'], fakta: ['Valpen er ungen til hunden.', 'Valpen tygger på alt den finner.'] },
  kalv: { kl: P, dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Kalven drikker melk og spiser gress.', hjem: 'fjøs', str: 'm', mor: 'ku', ord: ['leken'], fakta: ['Kalven er ungen til kua.'] },
  lam: { kl: P, dekke: 'ull', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: 'Lammet drikker melk og spiser gress.', hjem: 'fjøs', str: 's', mor: 'sau', ord: ['leken'], fakta: ['Lammet er ungen til sauen.', 'Lammene kommer om våren.'] },
  gullfisk: { kl: FI, dekke: 'skjell', bein: 0, type: 'altspiser', mat: [], spiser: null, hjem: 'dam', str: 's', puster: 'gjeller', ord: ['rolig'], fakta: ['Gullfisken puster med gjeller.', 'Gullfisken er gul og oransje.'] },
};
// babies with no album species of their own: spoken word only (V1 «Hva heter ungen til …?» needs a model → only album babies are asked)
const BABY = { andunge: 'andunge', larve: 'larve', kattunge: 'kattunge', valp: 'valp', kalv: 'kalv', lam: 'lam', 'føll': 'føll' };

/* ---------------------------------------------------------- legends (page «Eventyrdyra»): fairy-tale facts, marked fairy */
const L = {
  'enhjørning': { kl: 'eventyrdyr', dekke: 'pels', bein: 4, type: 'planteeter', mat: ['eple', 'n_blomst'], spiser: null, hjem: 'regnbuebroen', str: 'l', ord: ['modig'], fakta: ['I eventyrene har enhjørningen ett horn midt på panna.'] },
  vingehest: { kl: 'eventyrdyr', dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_gress', 'eple'], spiser: null, hjem: 'kjempemølla', str: 'l', ord: ['modig'], fakta: ['I eventyrene kan vingehesten fly over skyene.'] },
  skylam: { kl: 'eventyrdyr', dekke: 'ull', bein: 4, type: 'planteeter', mat: ['n_gress'], spiser: null, hjem: 'ballongplassen', str: 's', ord: ['blid'], fakta: ['I eventyret er skylammet mykt som en sky.'] },
  'isbjørnunge': { kl: P, dekke: 'pels', bein: 4, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'isen', str: 'm', ord: ['leken'], real: true, fakta: ['Isbjørnen bor i Arktis, blant annet på Svalbard.', 'Isbjørnungen blir født i en hule i snøen.'] },
  krystallhjort: { kl: 'eventyrdyr', dekke: 'pels', bein: 4, type: 'planteeter', mat: ['n_klover'], spiser: null, hjem: 'krystallhøyden', str: 'l', ord: ['stolt'], fakta: ['I eventyret har krystallhjorten horn av krystall.'] },
  solhare: { kl: 'eventyrdyr', dekke: 'pels', bein: 4, type: 'planteeter', mat: ['gulrot', 'n_gress'], spiser: null, hjem: 'kjempesolsikken', str: 's', ord: ['blid', 'rask'], fakta: ['I eventyret skinner solharen som sola.'] },
  perlehval: { kl: 'eventyrdyr', dekke: 'hud', bein: 0, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'havet', str: 'l', ord: ['rolig'], fakta: ['I eventyret glitrer perlehvalen som en perle.'] },
  kjempeskilpadde: { kl: 'krypdyr', dekke: 'skall', bein: 4, type: 'planteeter', mat: ['salat', 'n_blomst'], spiser: null, hjem: 'sandslottet', str: 'l', ord: ['tålmodig'], real: true, fakta: ['Kjempeskilpadder kan bli mer enn hundre år gamle.'] },
  'månekatt': { kl: 'eventyrdyr', dekke: 'pels', bein: 4, type: 'kjøttspiser', mat: [], spiser: null, hjem: 'pariserhjulet', str: 's', ord: ['trøtt'], fakta: ['I eventyret lyser månekatten som månen.'] },
  elefantunge: { kl: P, dekke: 'hud', bein: 4, type: 'planteeter', mat: ['n_gress', 'banan'], spiser: 'Elefanten spiser gress, blader og frukt.', hjem: 'dyreparken', str: 'l', ord: ['sterk', 'leken'], real: true, fakta: ['Elefanten er det største dyret på land.', 'Elefanten bruker snabelen som en hånd.'] },
};
for (const id in L) { if (!L[id].real) L[id].fairy = true; }

/* ---------------------------------------------------------- homes with a 3D model (V2 «Hvor bor den?»): model + the fact clip */
const HOME = {
  bie: ['n_bikube', 'Bia bor i en bikube.'], 'høne': ['p_honsehus', 'Høna bor i hønsehuset.'], hest: ['p_stall', 'Hesten bor i stallen.'],
  ponni: ['p_stall', 'Ponnien bor i stallen.'], esel: ['p_stall', 'Eselet bor i stallen.'], and: ['p_andedam', 'Anda bor ved dammen.'],
  andunge: ['p_andedam', 'Andungen bor ved dammen.'], svane: ['p_andedam', 'Svanen bor ved vannet.'], ekorn: ['g_epletre', 'Ekornet bor i et tre.'],
  ugle: ['g_epletre', 'Ugla bor i et hull i et tre.'], hakkespett: ['g_epletre', 'Hakkespetten bor i et hull i et tre.'],
  pingvin: ['n_snohaug', 'Pingvinen bor langt sør, der det er is og snø.'],
};
for (const id in HOME) { if (T[id]) { T[id].hjemM = HOME[id][0]; T[id].hjemF = HOME[id][1]; } }

/* ---------------------------------------------------------- lookups */
const FAUNA = () => (F.FAUNA && F.FAUNA.byId ? F.FAUNA : null);
const BASE_OF = { blomsterkanin: 'kanin', stjerneekorn: 'ekorn', krystallkatt: 'katt', boblevalp: 'valp', blomsterku: 'ku', stjernegris: 'gris',
  krystallsommerfugl: 'sommerfugl', blomsterhumle: 'humle', blomstersnegl: 'snegl', krystallmeis: 'meis', boblefisk: 'fisk', krystallfrosk: 'frosk',
  stjernerev: 'rev', bobleesel: 'esel', boblekrabbe: 'krabbe', 'stjernemåke': 'måke', 'krystallsjøhest': 'sjøhest', stjernedelfin: 'delfin',
  blomsterrein: 'rein', boblepingvin: 'pingvin' };
const baseOf = id => BASE_OF[id] || (FAUNA() && FAUNA().byId(id) && !L[id] && FAUNA().byId(id).base) || id;
const exprById = {}; EXPR.forEach(e => { exprById[e.id] = e; });
const cache = {};
function of(spId) {
  if (!spId) return null;
  if (cache[spId]) return cache[spId];
  const b = baseOf(spId), src = L[spId] || T[b];
  if (!src) return null;
  const fs = FAUNA() && FAUNA().byId(spId);
  const out = Object.assign({ id: spId, base: L[spId] ? spId : b, variant: !L[spId] && b !== spId, fairy: !!src.fairy }, src);
  out.mat = (src.mat || []).slice(); out.ord = (src.ord || []).slice(); out.fakta = (src.fakta || []).slice();
  const own = src.unge && T[src.unge] && T[src.unge].mor === (L[spId] ? spId : b);      // the album baby is THIS animal's baby (føll → hest only)
  out.unge = own ? { id: src.unge, word: src.unge, model: (FAUNA() && FAUNA().byId(src.unge) ? FAUNA().byId(src.unge).model : src.unge) } :
    src.unge ? { id: null, word: src.unge, model: null } : null;
  out.mor = src.mor || null;
  out.uttrykk = src.ux ? exprById[src.ux] || null : null;
  out.lyd = fs ? fs.sound : null;
  out.model = fs ? fs.model : (src.model || b);
  return (cache[spId] = out);
}
const baseIds = () => Object.keys(T);
const TH = F.THEMES = {
  T, L, FOOD, WORDS, NEAR, EXPR, BABY, BASE_OF, HOME, homeModels: () => [...new Set(Object.values(HOME).map(h => h[0]))],
  of, baseOf,
  foodModels: () => Object.keys(FOOD),
  withFood: () => baseIds().filter(id => T[id].mat && T[id].mat.length && T[id].spiser),
  withBaby: () => baseIds().filter(id => T[id].unge && T[T[id].unge] && T[T[id].unge].mor === id),          // mother species whose baby is an album species (V1)
  withWord: w => baseIds().filter(id => (T[id].ord || []).includes(w)),
  withExpr: () => baseIds().filter(id => T[id].ux),
  withHome: () => baseIds().filter(id => T[id].hjemF),
  // the animal's own things for counting / building in its Venneprøven (food first, then home things); only models that exist
  thingsFor(spId) {
    const t = of(spId); if (!t) return [];
    const has = m => !(G.F && F.VOX && F.VOX.has) || F.VOX.has(m);
    const out = t.mat.filter(has);
    if (t.hjemM && has(t.hjemM)) out.push(t.hjemM);
    return out;
  },
  // a short sentence about the food (the fact clip) – null for animals with no food fact
  foodFact: spId => { const t = of(spId); return t && t.spiser ? t.spiser : null; },
};
/* v5c WP-A2 (longevity_plan §2 #6, VIT V7 «animals follow the seasons»): the real calendar decides who is away.
   season(date) -> {away, sleep, flock, back}   migrants (vinter 'trekker sørover': lerke, vipe, gås, svale, tjeld) gather 15 Oct – 9 Nov
   (flock), are away 10 Nov – 14 Mar, are back from 15 Mar (back until 14 Apr); hibernators (vinter 'dvale': pinnsvin, grevling, frosk,
   skilpadde and their glitter variants) sleep 20 Nov – 19 Mar. awayKind(spId, date) -> 'reise' | 'dvale' | null. Pure (Node-testable). */
function season(d) {
  d = d || new Date();
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return { away: md >= 1110 || md < 315, sleep: md >= 1120 || md < 320, flock: md >= 1015 && md < 1110, back: md >= 315 && md < 415, md };
}
const migrant = spId => { const t = of(spId); return !!(t && !t.fairy && t.vinter === 'trekker sørover'); };
const sleeper = spId => { const t = of(spId); return !!(t && !t.fairy && t.vinter === 'dvale'); };
function awayKind(spId, d) { const S = season(d); return migrant(spId) && S.away ? 'reise' : sleeper(spId) && S.sleep ? 'dvale' : null; }
Object.assign(TH, { season, migrant, sleeper, awayKind });
// self-check (console only): every food model is in FOOD, every word in WORDS, every ux in EXPR
try {
  for (const id in Object.assign({}, T, L)) {
    const t = T[id] || L[id];
    (t.mat || []).forEach(m => { if (!FOOD[m]) console.warn('[THEMES] unknown food model', id, m); });
    (t.ord || []).forEach(w => { if (!WORDS.includes(w)) console.warn('[THEMES] unknown word', id, w); });
    if (t.ux && !exprById[t.ux]) console.warn('[THEMES] unknown expression', id, t.ux);
  }
} catch (e) { /* data only */ }
TH.version = 2;      // v5c WP-A2: +15 words, NEAR
})();
