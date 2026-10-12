/* Feslottet – speech + riddle data for Trylleboka (the spellbook) and the wand powers (DESIGN5 §9/§10 WP-T). Owner: WP-T.
   Narrator voice '' (Puff). Every line is short; multi-sentence texts are split into one clip per sentence (shared sentences such as
   «Du kan spise den.» become ONE clip).
   F.TB_HINTS {word: riddle}  – a riddle for EVERY castable word of js/data/words.js (258). Rules (tests/v5_trylle.js checks them):
     • never the word itself (nor its plural / definite form) – the riddle points at the thing, she must produce the spelling;
     • «Den …» for en-words, «Det …» for et-words; true, child-sized facts; nothing scary (no predation, no BLACK words).
   Sets: TB_GATER (every riddle text), TB_KATS (the page names). */
(function () {
'use strict';
const F = window.F;
const T = F.TPL;

const H = F.TB_HINTS = {
  // natur
  sol: 'Den er gul og varm. Den lyser på himmelen om dagen.', sky: 'Den er hvit og myk. Den svever på himmelen.',
  rose: 'Den er en blomst med torner. Den lukter godt.', blomst: 'Den vokser i hagen og har fine farger. Biene liker den.',
  tre: 'Det er høyt og har grønne blader. Fuglene bygger reir i det.', stein: 'Den er hard og grå. Den ligger på bakken.',
  dam: 'Den er et lite vann. Ender svømmer i den.', krans: 'Den er rund og laget av blomster. Du kan ha den på hodet.',
  'måne': 'Den lyser på himmelen om natta. Den kan være rund eller smal.', 'snø': 'Den er hvit og kald. Den faller om vinteren.',
  lilje: 'Den er en høy blomst. Den ser ut som en trompet.', busk: 'Den er grønn og ligner et lite tre. Den vokser lavt ved bakken.',
  gress: 'Det er grønt og vokser overalt. Kua spiser det.', sopp: 'Den vokser i skogen om høsten. Den har hatt, men ikke hode.',
  palme: 'Den er et tre der det er varmt. Kokosnøtter henger i den.', kaktus: 'Den vokser i ørkenen. Den har mange stikkende pigger.',
  kongle: 'Den faller ned fra grantreet. Ekornet spiser frøene i den.', blad: 'Det er grønt om sommeren og gult om høsten. Det faller av treet.',
  'fjær': 'Den er lett og myk. Fuglen har mange av dem.', skjell: 'Det ligger på stranda. Et lite dyr bodde inni det.',
  sand: 'Den er gul og ligger på stranda. Du kan bygge slott av den.', 'frø': 'Det er lite. Når du sår det, blir det til en plante.',
  pinne: 'Den er lang og tynn og kommer fra et tre. Hunden liker å hente den.', 'kløver': 'Den er en liten plante med tre blader. Noen ganger har den fire.',
  plante: 'Den er grønn og vokser i en potte. Den trenger vann og lys.',
  // hus
  hus: 'Du bor i det. Det har dør, vinduer og tak.', bro: 'Du kan gå over vannet på den. Den går fra den ene siden til den andre.',
  mur: 'Den er bygget av steiner. Den står rundt slottet.', tak: 'Det er øverst på huset. Det holder regnet ute.',
  'dør': 'Du åpner den for å gå inn. Den har et håndtak.', slott: 'Kongen og dronningen bor i det. Det har tårn.',
  'tårn': 'Det er høyt og smalt. Du ser langt fra toppen av det.', telt: 'Du sover i det når du er på tur. Det er laget av stoff.',
  port: 'Den er en stor dør i en mur eller et gjerde.', trapp: 'Den har mange trinn. Du går opp og ned på den.',
  vindu: 'Det er laget av glass. Du kan se ut gjennom det.', hytte: 'Den er et lite hus i skogen eller på fjellet. Familien drar dit på ferie.',
  'låve': 'Den er et stort hus på gården. Kuene og høyet er der.', 'mølle': 'Den har store vinger som går rundt i vinden. Den maler korn til mel.',
  'brønn': 'Den er et dypt hull med vann. Du heiser opp vannet i en bøtte.', gjerde: 'Det står rundt hagen. Dyrene kan ikke gå ut.',
  skilt: 'Det står ord eller piler på det. Det viser veien.', bod: 'Den er et lite hus der du har sykler og verktøy.',
  // dyr
  mus: 'Den er liten og grå. Den liker ost.', sau: 'Den har tykk, hvit ull. Den sier bæ.', and: 'Den svømmer i dammen. Den sier rapp.',
  due: 'Den er en grå fugl i byen. Den sier kurr.', katt: 'Den har myk pels og lange værhår. Den sier mjau.',
  hund: 'Den logrer med halen. Den sier voff.', hest: 'Den er stor og har man. Du kan ri på den.',
  gris: 'Den er rosa og har krøllete hale. Den sier nøff.', fisk: 'Den svømmer i vannet. Den har finner og skjell.',
  kanin: 'Den har lange ører. Den liker gulrøtter.', valp: 'Den er en hundebaby. Den vil leke hele tiden.',
  ponni: 'Den er en liten hest. Barn kan ri på den.', lam: 'Det er en sauebaby. Det sier bæ.',
  sel: 'Den svømmer i havet og hviler på steinene. Den har glatt pels.', 'gås': 'Den er en stor fugl med lang hals. Den flyr sørover om høsten.',
  ape: 'Den klatrer i trærne i jungelen. Den liker bananer.', bie: 'Den er gul og svart og flyr fra blomst til blomst. Den lager honning.',
  rev: 'Den er rød og har en tykk, lang hale. Den er lur.', geit: 'Den har skjegg og horn. Den klatrer på fjellet.',
  'føll': 'Det er en hestebaby. Det har lange, tynne bein.', 'høne': 'Den bor på gården. Den legger egg.',
  hane: 'Den har rød kam på hodet. Den galer om morgenen.', svane: 'Den er en stor, hvit fugl med lang hals. Den svømmer på vannet.',
  ugle: 'Den har store, runde øyne. Den er våken om natta.', fugl: 'Den har vinger og fjær. Den kan fly.',
  frosk: 'Den er grønn og hopper. Den sier kvekk.', humle: 'Den er tykk og lodden. Den surrer fra blomst til blomst.',
  larve: 'Den kryper på bladene. En dag blir den til en sommerfugl.', snegl: 'Den er glatt og går veldig sakte. Den bærer huset sitt på ryggen.',
  hval: 'Den er det største dyret i havet. Den spruter vann opp i lufta.', delfin: 'Den svømmer fort i havet. Den er lur og liker å hoppe.',
  krabbe: 'Den går sidelengs på stranda. Den har to klør.', 'måke': 'Den er en hvit fugl ved havet. Den skriker høyt.',
  panda: 'Den er svart og hvit. Den spiser bambus.', 'løve': 'Den har stor man. Den kalles kongen av dyrene.',
  esel: 'Det har lange ører og ligner en liten hest. Det kan være sta.', lama: 'Den har lang hals og myk ull. Den bor i fjellene langt borte.',
  koala: 'Den sover nesten hele dagen i et tre. Den spiser blader.', sebra: 'Den ligner en hest. Den har svarte og hvite striper.',
  ekorn: 'Det har en stor, lodden hale. Det samler nøtter og kongler.', elg: 'Den er det største dyret i den norske skogen. Den har store horn.',
  rein: 'Den bor der det er kaldt. Den har horn og trekker sleder.', giraff: 'Den har veldig lang hals. Den spiser blader høyt oppe i trærne.',
  kamel: 'Den bor i ørkenen. Den har pukler på ryggen.', kalv: 'Den er en kubaby. Den drikker melk.',
  // klær
  lue: 'Den er varm. Du har den på hodet om vinteren.', sko: 'Du har den på foten når du går ut.',
  hatt: 'Du har den på hodet. Den har en bred kant.', sokk: 'Du har den på foten inni skoen.',
  vott: 'Den er varm. Du har den på hånda.', skjerf: 'Det er varmt og langt. Du har det rundt halsen.',
  jakke: 'Du har den på deg når du går ut. Den har ermer og glidelås.', kjole: 'Prinsessen har den på seg. Den er fin og svinger når du danser.',
  ring: 'Du har den på fingeren. Den er rund.', bukse: 'Den har to bein. Du har den på deg.',
  genser: 'Den er varm og myk. Du trekker den over hodet.', 'skjørt': 'Det henger fra midjen. Det svinger når du danser.',
  'støvel': 'Den er en høy sko. Du har den på deg når det regner.', 'tøffel': 'Den er myk og varm. Du har den på foten inne.',
  hanske: 'Den har fem fingre. Du har den på hånda.', belte: 'Det holder buksa oppe. Det går rundt magen.',
  veske: 'Du bærer den på armen. Du har lommeboka i den.', sekk: 'Du har den på ryggen. Du har matpakka i den.',
  kappe: 'Den henger fra skuldrene og blafrer i vinden. Ridderen har den.', smykke: 'Det er fint og glitrer. Du har det rundt halsen eller på armen.',
  'sløyfe': 'Den er knyttet av et bånd. Du kan ha den i håret.', slips: 'Det henger fra halsen på skjorta. Pappa har det på seg til fest.',
  hjelm: 'Den er hard. Du har den på hodet når du sykler.', forkle: 'Det henger foran deg når du baker. Det holder klærne rene.',
  'kåpe': 'Den er en lang, fin jakke.', vest: 'Den er som en jakke uten ermer.',
  kjede: 'Det er laget av små ringer eller perler. Du har det rundt halsen.',
  // mat
  ost: 'Den er gul og har hull. Musa liker den.', egg: 'Det kommer fra høna. Det har skall.',
  kake: 'Den er søt. Du får den på bursdagen.', bolle: 'Den er rund og myk. Den er bakt med rosiner.',
  vaffel: 'Den har små firkanter og hjerter. Du spiser den med syltetøy.', eple: 'Det vokser på et tre. Det er rødt eller grønt.',
  banan: 'Den er gul og bøyd. Apen liker den.', 'pære': 'Den er grønn eller gul. Den er smal øverst og tykk nederst.',
  melk: 'Den er hvit. Kua gir oss den.', kjeks: 'Den er tørr og sprø. Du spiser den til kakao.',
  saft: 'Du drikker den. Den er laget av bær.', ris: 'Den består av små, hvite korn. Du koker den i vann.',
  'bær': 'Det er lite og søtt. Du plukker det i skogen.', 'pølse': 'Den er lang. Du spiser den i brød med ketsjup.',
  pizza: 'Den er rund og flat. Den har ost og tomat på toppen.', 'brød': 'Det er bakt i ovnen. Du lager skiver av det.',
  gulrot: 'Den er oransje og lang. Kaninen liker den.', tomat: 'Den er rød og rund. Du har den i salaten.',
  potet: 'Den vokser i jorda. Du koker den til middag.', agurk: 'Den er lang og grønn. Den er nesten bare vann.',
  drue: 'Den er liten og rund. Den vokser i klaser.', kiwi: 'Den er brun og lodden utenpå. Inni er den grønn.',
  melon: 'Den er stor og rund. Inni er den saftig og søt.', plomme: 'Den er lilla og har en stein inni.',
  sitron: 'Den er gul og sur.', mais: 'Den er gul og vokser på en kolbe. Du kan lage popkorn av den.',
  ert: 'Den er liten, rund og grønn. Den ligger i en belg.', 'nøtt': 'Den har hardt skall. Ekornet samler den.',
  pai: 'Den er bakt i en form. Den har eple eller bær inni.', mango: 'Den er en søt, gul frukt. Den vokser der det er varmt.',
  ananas: 'Den er gul inni og har en grønn dusk på toppen.', iskrem: 'Den er kald og søt. Den smelter i sola.',
  suppe: 'Du spiser den med skje. Den er varm.', 'grøt': 'Du spiser den til frokost. Nissen liker den.',
  vann: 'Du drikker det når du er tørst. Det renner i elva.', kakao: 'Den er varm og brun. Du drikker den når du er kald.',
  taco: 'Den er en lefse med kjøtt og grønnsaker. Mange spiser den på fredag.', 'løk': 'Den lukter sterkt. Du kan gråte når du skjærer den.',
  // ting
  bok: 'Du leser i den. Den har mange sider.', lys: 'Det brenner med en liten flamme. Du tenner det på bursdagskaka.',
  kopp: 'Du drikker av den. Den har hank.', kam: 'Du ordner håret med den. Den har mange tenner.',
  lim: 'Det er klissete. Du fester papir med det.', 'lås': 'Du åpner den med en nøkkel.',
  klokke: 'Den viser hva tida er. Den sier tikk takk.', vase: 'Du setter blomster i den. Den har vann inni.',
  kurv: 'Den er flettet. Du bærer epler eller bær i den.', krus: 'Det er en stor kopp. Du drikker kakao av det.',
  'skål': 'Den er rund og dyp. Du spiser frokostblanding i den.', glass: 'Det er gjennomsiktig. Du drikker vann av det.',
  flaske: 'Den har en smal hals og kork. Du heller saft fra den.', kanne: 'Du vanner blomster med den. Den har en lang tut.',
  gryte: 'Du koker suppe i den på komfyren.', skje: 'Du spiser suppe og grøt med den.',
  gaffel: 'Den har tagger. Du stikker den i maten.', brev: 'Det kommer i postkassa. Det ligger i en konvolutt.',
  kart: 'Det viser veien. Du kan se hele landet på det.', globus: 'Den er rund som jorda. Den viser alle landene.',
  'nøkkel': 'Du låser opp døra med den.', lykt: 'Den lyser i mørket. Du bærer den i hånda.',
  kamera: 'Du tar bilder med det.', saks: 'Du klipper papir med den.',
  pensel: 'Du maler med den. Den har hår i enden.', blyant: 'Du skriver og tegner med den. Den har viskelær på toppen.',
  'bøtte': 'Du bærer vann i den. Den har en hank.', spade: 'Du graver med den i sanden eller i hagen.',
  eske: 'Den er en boks av papp. Du kan ha ting i den.', pose: 'Du bærer varer hjem fra butikken i den.',
  'såpe': 'Du vasker hendene med den. Den lager skum.', 'børste': 'Du gjør håret glatt og fint med den.',
  stige: 'Du klatrer opp på den for å nå høyt.', bilde: 'Det henger på veggen i en ramme.',
  // kjøretøy
  fly: 'Det har vinger og tar deg høyt over skyene til andre land.', tog: 'Det kjører på skinner. Det har mange vogner.',
  'båt': 'Den flyter på vannet. Den har seil eller motor.', bil: 'Den har fire hjul og ratt. Du kjører den på veien.',
  ski: 'Du har to av dem på beina. Du går på dem i snøen.', sykkel: 'Den har to hjul og pedaler. Du tråkker for å kjøre.',
  buss: 'Den er stor og tar mange folk. Den stopper på holdeplassen.', kano: 'Den er en smal båt. Du padler med åre.',
  vogn: 'Den har hjul. En hest kan trekke den.', ferje: 'Den er en stor båt. Den tar biler over fjorden.',
  trikk: 'Den kjører på skinner i gatene i byen.', rakett: 'Den flyr ut i verdensrommet. Den har ild under.',
  'ubåt': 'Den kan kjøre under vannet. Den ser ut som en stor fisk av metall.', kjelke: 'Du aker ned bakken på den om vinteren.',
  slede: 'Reinsdyr trekker den. Julenissen kjører i den.', 'robåt': 'Du ror den med to årer.',
  'flåte': 'Den er laget av stokker som er bundet sammen. Den flyter på vannet.', skip: 'Det er en veldig stor båt. Det seiler over havet.',
  // eventyr
  krone: 'Kongen har den på hodet. Den er av gull.', tiara: 'Prinsessen har den i håret. Den glitrer.',
  fest: 'Du får kake og leker der. Alle vennene kommer.', gave: 'Den er pakket inn i papir. Du får den på bursdagen.',
  hjerte: 'Det banker i brystet ditt. Det betyr at du er glad i noen.', perle: 'Den er liten, rund og blank. Den kommer fra et skjell.',
  pakke: 'Den er en gave med papir og bånd rundt.', skatt: 'Den er gjemt i en kiste. Det er gull og smykker i den.',
  gull: 'Det er gult og skinner. Det er veldig dyrt.', stav: 'Feen tryller med den. Den har en stjerne på toppen.',
  flagg: 'Det vaier på en stang. Det har farger fra et land.', skjold: 'Ridderen holder det foran seg.',
  // møbler
  stol: 'Den har fire bein. Du sitter på den.', seng: 'Du sover i den om natta.',
  bord: 'Det har fire bein. Du spiser middag på det.', sofa: 'Den er myk. Hele familien kan sitte i den.',
  benk: 'Den står i parken. Flere kan sitte på den.', teppe: 'Det ligger på gulvet. Det er mykt å gå på.',
  lampe: 'Den lyser i stua. Du skrur den på når det er mørkt.', peis: 'Den varmer stua. Det knitrer når veden brenner i den.',
  hylle: 'Den henger på veggen. Du setter bøker på den.', skap: 'Det har dører. Du henger klærne dine i det.',
  pute: 'Den er myk. Du har hodet på den når du sover.', dyne: 'Den er varm og myk. Du har den over deg i senga.',
  speil: 'Du ser deg selv i det.', trone: 'Kongen sitter på den. Den er stor og fin.',
  krakk: 'Den er en liten stol uten rygg.', gardin: 'Den henger foran vinduet. Du trekker den for om kvelden.',
  ovn: 'Du baker kaker i den. Den er varm inni.', vugge: 'Babyen sover i den. Den gynger.',
  // leker
  ball: 'Den er rund. Du kan sparke den.', dukke: 'Du leker med den. Den har kjole og hår.',
  bamse: 'Den er myk og god. Du sover med den.', drage: 'Du flyr den i vinden. Den har en lang hale.',
  tau: 'Det er langt. Du kan hoppe over det.', robot: 'Den er av metall og kan gå. Den blinker med lys.',
  kloss: 'Den er firkantet. Du bygger tårn med den.', kule: 'Den er liten og rund. Den triller på gulvet.',
  huske: 'Du sitter på den og svinger fram og tilbake.', sklie: 'Du klatrer opp og glir ned.',
  spill: 'Det har brikker og terning. Dere leker med det sammen ved bordet.', boble: 'Den er rund og glitrer. Den sprekker når du tar på den.',
  jojo: 'Den går opp og ned på en snor.',
  // musikk
  tromme: 'Du slår på den. Den sier bom.', gitar: 'Den har strenger. Du spiller på den med fingrene.',
  'fløyte': 'Du blåser i den. Den har små hull.', harpe: 'Den har mange strenger. Engler spiller på den.',
  piano: 'Det har svarte og hvite tangenter.', bjelle: 'Den ringer når du rister den. Kua har den rundt halsen.',
  radio: 'Du hører musikk og nyheter fra den.', fiolin: 'Du spiller på den med en bue.',
  tuba: 'Den er stor og gul, og du blåser i den. Den lager dype toner.', note: 'Den står på et ark og viser hvilken tone du skal spille.',
};
F.SETS.TB_GATER = [...new Set(Object.values(H))];
// page names (spoken when a tab / page title is tapped)
F.TB_KATS = { dyr: 'Dyr', mat: 'Mat', leker: 'Leker', 'møbler': 'Møbler', natur: 'Natur', 'kjøretøy': 'Kjøretøy', 'klær': 'Klær', hus: 'Hus',
  ting: 'Ting', musikk: 'Musikk', eventyr: 'Eventyr' };
// v5 WP-T: the seasonal page (its name follows the month) and the powers page
F.TB_SESONG = { 'høst': 'Høst', jul: 'Jul', vinter: 'Vinter', 'vår': 'Vår', sommer: 'Sommer' };
F.SETS.TB_KATS = Object.values(F.TB_KATS).concat(Object.values(F.TB_SESONG), ['Krefter']);

T.add('tb_gate', { text: '{g}', slots: { g: 'TB_GATER' }, voices: [''] });
T.add('tb_kat', { text: '{k}', slots: { k: 'TB_KATS' }, voices: [''] });
T.addAll({
  tb_first: 'Her er alle tingene du kan trylle fram. Trykk på en skygge, så får du en gåte.',
  tb_gate_head: 'Dagens tryllegåte!',
  tb_gate_how: 'Finn ut hva det er, og skriv det med staven!',   // natural audit #8: «Gjett» invited guessing
  tb_gate_done: ['Du løste dagens tryllegåte!', 'Riktig! Det var dagens tryllegåte!'],
  tb_gate_solved: 'Den har du løst. Ny gåte i morgen!',
  tb_gate_none: 'Du har tryllet fram alt sammen! Så flink du er!',
  tb_side_full: 'Hele siden er full!',
  tb_bua: 'Den finnes i Tryllebua.',
  tb_lyd: 'Hør den første lyden.',
  tb_rim: 'Hør hva det rimer på.',
  tb_ny: 'Se! Den kom med i Trylleboka.',
  // wand powers (gems): unlocked by learning, never bought
  tb_pow_ny: 'Staven har fått en ny kraft!',
  tb_pow_tall: 'Tallkraft! Skriv et tall foran ordet, så kommer det mange.',
  tb_pow_farge: 'Fargekraft! Skriv en farge foran ordet, som rød ball.',
  'tb_pow_storrelse': 'Størrelseskraft! Skriv stor eller liten foran ordet.',
  'tb_pow_humor': 'Humørkraft! Skriv glad, danse eller sove.',
  tb_snart: 'Den trylleformelen lærer du snart!',
  tb_laer_tall: 'Den kommer når du har lært mer om tall.',
  tb_laer_les: 'Den kommer når du har lært å lese flere ord.',
});
})();
