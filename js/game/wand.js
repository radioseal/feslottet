/* Feslottet – ORDSTAVEN (the wand). Owner: FORMATS-W.  «Der ord blir til ting.»
   She spells a word → cubes stream from the tip of her wand and build the real thing. A number before the word
   («14 kake») brings exactly that many, laid out as a full row of ten + the rest, counted on from ten.

   API (DESIGN §11.3 + this WP):
     F.Wand.open({mode:'free'})                         -> Promise (resolves when the spell bar closes)
     F.Wand.open({mode:'task', item, accept:[words], needTag, n, slots, tiles, given, ghost, picture, container})
                                                        -> handle {next():Promise<{text,n,res}>, bad(), ok(), lock(ms), ghost(word),
                                                                   solution(word), speller, close()}
     F.Wand.cast(word, n=1, {at, style, forNpc, from, free, persist, silent}) -> Promise<things[]>
     F.Wand.resolve(text) -> {kind:'model'|'locked'|'lex'|'near'|'unknown'|'empty', word, model, near, n, entry}
     F.Wand.swap(thing, newWord) -> Promise<bool>      (Bokstavbytte: the cubes rebuild the thing as another word)
     F.Wand.reactTo(npcThing, word, itemThing?) -> Promise<tag>   (an NPC receives / uses a summoned thing; used by LIFE)
     F.Wand.speller(cfg) -> spell-bar component (used by the writing formats in f_write.js)
     F.Wand.tagOf(word) -> affordance tag ('eat','drink','wear','play','cuddle','sit','sleep','smell','warm','light','ride','music','grow','fly','none')
     F.Wand.isOpen()
     F.Wand.modify(thing, 'stor' | ['rød','glad'] | mods) -> Promise<thing>   (Scribblenauts modifiers; the thing may be rebuilt → use the result)
     F.Wand.modOf(word) -> {t:'size'|'col'|'mood', base, k|c|m} | null          F.Wand.MODS (the table)
   Modifier words (Wave 2): written alone in free mode, «stor/liten», «rød/blå/gul/grønn/rosa/lilla/hvit/brun», «glad/sove/danse/
   hoppe/våken» (+ inflected forms) change the last cast (or the picked / nearest) thing; written before a noun («stor rød kake»,
   «14 røde epler») the thing is born that way (the bar has a space key in free mode). Persisted per thing (c, sc, md).
   Wand ↔ world: a free cast (or a tapped summoned thing) that fits a nearby character's need/wish flies to them, they use it
   (actor.react), and F.Quest.fulfil(a, word) completes the wish; emits 'wishFulfilled' {npc, word, need, kind, by:'wand'}.
   Summoned things are world things of type 'summoned' (persisted in F.save.magic.list; free casts capped at 300).
   Free casts are logged in F.save.words.spont / F.save.words.made (parent page; modifier words too, F.save.words.modUsed).
   Emits 'cast' {word, n, free, at, thing, mods, kind, typed, helped}, 'wandMod' {word, mods, thing}, 'wandGive', 'wishFulfilled', 'wandOpen',
   'wandClosed'.
   v5 WP-T (DESIGN5 §9/§10): wand POWERS – a number before the word (tall), colour / size / mood words (farge / storrelse / humor) work
   once F.Book.has(power) (js/ui/trylleboka.js: learning milestones); until then gatePow() strips them, the plain thing is made (a
   modifier word alone: its letters fly into the wand and a puff of its colour fizzles – no letter blocks) and Puff says «Den
   trylleformelen lærer du snart!» once per bar session (the gem wiggles and glows every time).
   The free bar carries a Trylleboka cluster (floating above its top-left corner): the book button, «Dagens tryllegåte» (a silhouette chip – tap = the riddle) and
   four power gems (tap = what the power does / «lærer du snart»; an earned one's example waits as ghost letters); a newly earned power
   is announced once when the bar opens (F.Book.announce) and its example phrase («rød ball») waits as ghost letters.
   Natural audit 11.10. (D7): Puff never suggests words by himself (no wand_mod_tip); a modifier word changes only the thing she picked or
   made in this bar session and only when she can see it (reveal + camera framing like a new thing), else «rød » stays + wand_mod_hva;
   the bar docks at the bottom indoors too (camera mode 'wandin'); new things stand where she sees them, above the bar, off the props;
   letter blocks sound by sound unit (F.LYD.units: silent letters stay silent).
   'cast' carries helped = she retyped the near-miss ghost (Trylleboka then gives no free-cast credit).
   Clarity 12.10. (§3.10): a tap on a spell bar counts only when pressed on it ≥ 400 ms after it appeared and (for 1.2 s) not on the spot
   of the tap that opened it (emits 'wandTapDropped' {why, ch, ms} otherwise); a tap on the world above an EMPTY free bar closes it and
   goes on to the world (emits 'wandAway'). Real keyboard keys are never dropped. */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = THREE.Vector3;

/* =================================================================== lexicon (words the wand recognises without a model)
   generated from _dev/lexicon_3to6.json (blacklist removed). LEXPL = plural:singular for nouns. */
const LEXW = "dyp dyr fin gul hel het kul lat lav lik lun lys myk pen rar ren rik sen sur tam tom blek bra brun ekte fast flat fri jevn klar klok kort oval rask rosa salt smal sort stor svak treg ulik varm diger ekstra enorm ensom falsk fersk fjern frisk gratis liten magisk moden morsom munter neste norsk privat rotete rutete sakte siste skarp sliten smart spent sterk stolt sulten super svart travel trist turkis voksen berømt bitter blank blå bratt dobbel enkel feil flau flink flott full gammel glatt grunn grå grønn gøy høy høyre lang lei lett lilla lodden lojal lukket løs mett nervøs nær redd rett råtten sann seig sikker slank snill spiss sprø stille stygg sunn svær søt tett trygg trøtt tung tykk tynn tåkete tøff tørr tørst ung usunn vakker vill våken våt åpen billig blid blond bred deilig dyktig dårlig enig farlig fattig ferdig fuktig giftig glad god grådig gyllen halv hard heldig hellig herlig hvit høflig iskald ivrig kald kjapp kjent kjær kjølig ledig lystig mektig mild modig mulig pinlig riktig rolig rund ryddig rød saftig sjalu skjev skjør synlig søvnig tidlig uenig ukjent umulig vanlig viktig ærlig beige glupsk der dit her hit mer nok ute vel bare bort enda fort fram helt mest nede ofte sent sist aldri alene borte ganske nesten også senere snart straks ellers ennå først heller ikke ille inn inne langt lenge litt opp oppe sammen alltid derfor gjerne hjem hjemme hvor igjen liksom ned veldig alt din min mye sin dine hans mine sine slik deres flere flest all annen begge denne dette disse ditt hennes mange mitt samme sitt sånn vår våre hver hvert nam pip morn hallo hei heia hurra jippi kvakk mjau nei takk uff voff hysj men enten verken både eller bak for fra hos mot til over uten blant foran forbi under etter før inni langs mellom oppå med rundt ved dem den ham han hun man noe dere noen alle henne ingen oss deg det hva hvem jeg meg seg selv som mens fordi enn når dersom hvis siden alv ape ark arm bie bil bok bro bue bur dag dal dam due duk elg elv emu ert far fat fly fot fyr hav hus jul kam klo kne kos lag lam lek lim lue lyn mat mel mor mur mus myr orm osp ost ovn pil rev ris rom rot sag sal sel sko sol sti tak tre tur avis bark barn boks brev bror brus bukt busk dame dans dato dikt drue dyne elev eple esel eske falk fest film fisk flue furu gate gave golf gran gren gris grus gulv hage hagl hake hale hals hane hare havn helg hest horn hule jern juli juni kafe kake kalv kamp kano kart klem kone korn kost kran krok krus kule kurv laks lama lege loft luft lykt mage magi mark mars melk mose mynt nabo navn nese note okse oter park pels pike plen port pose post pote pult puma pute ravn reke rive rose rype saft saks side skap skog smil sofa stol stue svar tare telt time tog tuba tube ugle uke valp vase vask veps vest vits agurk albue ananas ansikt apotek april baker bakeri bamse banan belte bensin bever bilde blomst blyant brems bryst bukse danser delfin doktor drage dverg ekorn farge ferie ferje fiolin fisker flaske frosk frost frukt gardin genser glede globus gruve gryte hanske harpe hofte humle huske januar jente kakao kaktus kalkun kamel kamera kanel kanin karate kebab koala komet komfyr korps krater krone kusine kvist lakris lampe larve lekse linjal maler mandel manet melon meteor moped motor museum muskel navle nudel orkan palme panda papir pasta pedal pensel perle piano pilot planet plante plast pokal politi potet prest prins radio rektor robot rosin salat sandal sebra sekund sirene sirkel sirkus sitron sklie skole skrue skuter slede slips snute soldat spade spiker spurv statue stige stork storm struts svale svane taco tante tavle teater tiger tivoli tomat torden torsk trener trost varme veske vindu vinter vulkan ankel anker august bakke ball bank bein bekk benk biff bille bjørk bjørn bolle bonde brille brygge bukk buss butikk bål båt bær bølge bønne bøtte datter dekk dommer dress dukke dykker dør egg eik eng engel fetter finger fjell fjær flagg flåte fløte fløyte foss frakk frisør frø føll gaffel gang gaupe geit gitar glass gress grotte grøt gull gutt gås gåte hai hakke hammer hatt hauk heis himmel hotell hummer hylle hytte hår høne høst jakke jungel kajakk kanne kasse katt kiwi klasse klippe klokke kloss klovn kløver knapp kokk konge kongle kopp korall krabbe kropp kråke kål kåpe latter legg leire leppe lomme lunge lår lås låve lærer løk løp løv løve mai mais maling mamma mango mann maur minutt munn musikk mygg måke måne nakke natt nisse nål nøkkel nøtt onkel padde pai pakke panne pappa pause peis pennal pepper pinne planke plomme ponni prøve pålegg påske pære pølse rakett ratt regn rein reise ridder ring rotte rygg røyk sang sanger sau seier seil sekk seng skatt skuff slott sludd smykke smør snø sokk sommer sopp speil spill stang stein stokk strå stråle støvel sukker suppe sykkel såpe søppel søsken søster tall tann tau tennis teppe ting tommel trapp trikk tromme trøst trøye tunge tunnel tåke tårn tøffel unge vaffel vann vegg vei venn verden vott vær åker åre øgle øks ønske øre ørken ørn øye and bad blad blåbær bord brød deig dusj etasje fjord fortau fred fredag fugl gjedde gjerde gjest gjøk gjørme gulrot gymsal gård hjelm hjelp hjerne hjerte hjort hjul hjørne hode hud hund hval hånd ild isbit iskrem jord kinn kino kiosk kirke kje kjeks kjelke kjempe kjole kjøtt kveld kyss kyst land lunsj lyd lørdag mandag middag morgen måned negl nyttår onsdag ord pizza sand sild sjakk sjanse sjef sjåfør sjø ski skilt skinke skip skje skjegg skjell skjerf skjerm skjære sky skygge skøyte snegl sted strand sølv søndag tid ubåt vind årstid juice fem fire seks andre femte femten femti hundre niende seksti tiende tredje tusen atten elleve første førti nitten nitti null sytten sytti tretti åtte åtti fjerde sjette sju tjue tjueen tolv tolvte ake bade bake bety bite bli dele dra gli gni gre gro grue hete heve hyle jage kle koke kose lage leke lene lese lete leve like lime love lure lyne lyse lyve male mase mate mene nyse orke peke pipe rime rope rote sage skli skru snu sope sove tape tro tute vise vite betale bevege bremse bruke bryte burde danse elske fikse fiske flyte fryse furte glitre grave gripe gruble hamre haste hente herme hilse hoste jakte juble jukse kaste klage klatre kludre klype knuse knyte koste krype kvitre lukte merke miste mumle padle pirke plaske prate puste pynte samle savne sikte skrape skrike skrive skryte slite sluke smake smelte smile snike snorke snuse somle spare sparke spikre spise sprute starte stave steke stole streke stryke stupe sulte surfe sutre svare svelge sveve sykle trene turne tusle tvile vandre vaske velge vente vifte virke visne vokse vokte banke bestå besøke bjeffe blinke blunke blåse brenne brette brøle bygge bytte bære børste bøye dekke drikke dryppe drømme dykke dytte eie falle fange feie finne flytte forstå fylle føle gange glemme gråte heie helle henge hikke hinke hoppe håpe høre høste jobbe kalle klappe klekke klemme klinke klø knekke knurre komme krølle kunne kvekke legge leie lekke ligge ligne lukke lytte låne låse lære løfte løpe mangle mjaue måle måtte møte nikke nynne nøle passe pleie plukke pugge pusse redde regne rekke renne rette ringe rulle rydde rygge rømme røre seile senke sette sitte skamme skulle slappe slenge slikke slippe slukke slutte slå smatte smøre snakke spille spørre stelle stemme stenge stikke stirre stoppe stå sukke sulle summe surre svette svinge svømme synes synge synke søle takke tegne telle tenke tenne titte tralle treffe trekke trenge trille trylle trøste tulle tygge tåle tømme tørke tørre tøyse vanne vasse veie vekke ville vinke vinne vippe våge våkne være åle åpne øke øse øve bevise binde blande delta dusje følge gidde gjemme gjenta gjespe gjette gjøre gynge handle hende hjelpe holde hvile hvine hviske kikke kile kjede kjenne kjøpe kjøre kysse lande levere ordne påstå score selge sende sjekke skifte skinne skjule skynde skyve tilgi tjene tordne";
const LEXPL = "alver:alv aper:ape armer:arm bier:bie biler:bil bøker:bok broer:bro buer:bue dager:dag daler:dal dammer:dam duer:due duker:duk elger:elg elver:elv emuer:emu erter:ert fedre:far føtter:fot juler:jul kammer:kam klør:klo knær:kne leker:lek luer:lue mødre:mor murer:mur myrer:myr ormer:orm osper:osp oster:ost ovner:ovn piler:pil rever:rev røtter:rot sager:sag saler:sal seler:sel soler:sol stier:sti trær:tre turer:tur aviser:avis barker:bark bokser:boks brødre:bror bukter:bukt busker:busk damer:dame danser:dans datoer:dato druer:drue dyner:dyne elever:elev epler:eple esler:esel esker:eske falker:falk fester:fest filmer:film fisker:fisk fluer:flue furuer:furu gater:gate gaver:gave graner:gran grener:gren griser:gris hager:hage haker:hake haler:hale halser:hals haner:hane harer:hare havner:havn helger:helg hester:hest huler:hule kafeer:kafe kaker:kake kalver:kalv kamper:kamp kanoer:kano klemmer:klem koner:kone koster:kost kraner:kran kroker:krok kuler:kule kurver:kurv lakser:laks lamaer:lama leger:lege lykter:lykt mager:mage marker:mark mynter:mynt naboer:nabo neser:nese noter:note okser:okse otere:oter parker:park pelser:pels piker:pike plener:plen porter:port poser:pose poster:post poter:pote pulter:pult pumaer:puma puter:pute ravner:ravn reker:reke river:rive roser:rose ryper:rype sakser:saks sider:side skoger:skog sofaer:sofa stoler:stol stuer:stue timer:time tubaer:tuba tuber:tube ugler:ugle uker:uke valper:valp vaser:vase vasker:vask vepser:veps vester:vest vitser:vits agurker:agurk albuer:albue ananaser:ananas ansikter:ansikt apoteker:apotek bakere:baker bakerier:bakeri bamser:bamse bananer:banan belter:belte bevere:bever bilder:bilde blomster:blomst blyanter:blyant bremser:brems bukser:bukse dansere:danser delfiner:delfin doktorer:doktor drager:drage dverger:dverg farger:farge ferier:ferie ferjer:ferje fioliner:fiolin fiskere:fisker flasker:flaske frosker:frosk frukter:frukt gardiner:gardin gensere:genser gleder:glede globuser:globus gruver:gruve gryter:gryte hansker:hanske harper:harpe hofter:hofte humler:humle husker:huske jenter:jente kaktuser:kaktus kalkuner:kalkun kameler:kamel kameraer:kamera kaniner:kanin kebaber:kebab koalaer:koala kometer:komet komfyrer:komfyr kroner:krone kusiner:kusine kvister:kvist lamper:lampe larver:larve lekser:lekse linjaler:linjal malere:maler mandler:mandel maneter:manet meloner:melon meteorer:meteor mopeder:moped motorer:motor museer:museum muskler:muskel navler:navle nudler:nudel orkaner:orkan palmer:palme pandaer:panda pastaer:pasta pedaler:pedal pensler:pensel perler:perle pianoer:piano piloter:pilot planeter:planet planter:plante pokaler:pokal poteter:potet prester:prest prinser:prins radioer:radio rektorer:rektor roboter:robot rosiner:rosin salater:salat sandaler:sandal sebraer:sebra sekunder:sekund sirener:sirene sirkler:sirkel sirkuser:sirkus sitroner:sitron sklier:sklie skoler:skole skruer:skrue skutere:skuter sleder:slede snuter:snute soldater:soldat spader:spade spikere:spiker spurver:spurv statuer:statue stiger:stige storker:stork stormer:storm strutser:struts svaler:svale svaner:svane tacoer:taco tanter:tante tavler:tavle teatre:teater tigrer:tiger tivolier:tivoli tomater:tomat torsker:torsk trenere:trener troster:trost vesker:veske vinduer:vindu vintrer:vinter vulkaner:vulkan ankler:ankel ankere:anker bakker:bakke baller:ball banker:bank bekker:bekk benker:benk biffer:biff biller:bille bjørker:bjørk bjørner:bjørn boller:bolle bønder:bonde briller:brille brygger:brygge bukker:bukk busser:buss butikker:butikk båter:båt bølger:bølge bønner:bønne bøtter:bøtte døtre:datter dommere:dommer dresser:dress dukker:dukke dykkere:dykker dører:dør eiker:eik enger:eng engler:engel fettere:fetter fingrer:finger flåter:flåte fløyter:fløyte fosser:foss frakker:frakk frisører:frisør gafler:gaffel ganger:gang gauper:gaupe geiter:geit gitarer:gitar grotter:grotte grøter:grøt gutter:gutt gjess:gås gåter:gåte haier:hai hakker:hakke hamrer:hammer hatter:hatt hauker:hauk heiser:heis himler:himmel hoteller:hotell hummere:hummer hyller:hylle hytter:hytte høner:høne høster:høst jakker:jakke jungler:jungel kajakker:kajakk kanner:kanne kasser:kasse katter:katt kiwier:kiwi klasser:klasse klipper:klippe klokker:klokke klosser:kloss klovner:klovn kløvere:kløver knapper:knapp kokker:kokk konger:konge kongler:kongle kopper:kopp koraller:korall krabber:krabbe kropper:kropp kråker:kråke kåper:kåpe legger:legg lepper:leppe lommer:lomme lunger:lunge låser:lås låver:låve lærere:lærer løker:løk løver:løve maiser:mais malinger:maling mammaer:mamma mangoer:mango menn:mann minutter:minutt munner:munn måker:måke måner:måne nakker:nakke netter:natt nisser:nisse nåler:nål nøkler:nøkkel nøtter:nøtt onkler:onkel padder:padde paier:pai pakker:pakke panner:panne pappaer:pappa pauser:pause peiser:peis pennaler:pennal pinner:pinne planker:planke plommer:plomme ponnier:ponni prøver:prøve påsker:påske pærer:pære pølser:pølse raketter:rakett reiner:rein reiser:reise riddere:ridder ringer:ring rotter:rotte rygger:rygg sanger:sang sangere:sanger sauer:sau seirer:seier sekker:sekk senger:seng skatter:skatt skuffer:skuff smykker:smykke snøer:snø sokker:sokk somrer:sommer sopper:sopp stenger:stang steiner:stein stokker:stokk stråler:stråle støvler:støvel supper:suppe sykler:sykkel såper:såpe søstre:søster tenner:tann tepper:teppe tomler:tommel trapper:trapp trikker:trikk trommer:tromme trøyer:trøye tunger:tunge tunneler:tunnel tåker:tåke tøfler:tøffel unger:unge vafler:vaffel vegger:vegg veier:vei venner:venn votter:vott åkrer:åker årer:åre øgler:øgle økser:øks ønsker:ønske ører:øre ørkener:ørken ørner:ørn øyne:øye ender:and deiger:deig dusjer:dusj etasjer:etasje fjorder:fjord fredager:fredag fugler:fugl gjedder:gjedde gjerder:gjerde gjester:gjest gjøker:gjøk gulrøtter:gulrot gymsaler:gymsal gårder:gård hjelmer:hjelm hjerner:hjerne hjerter:hjerte hjorter:hjort hjørner:hjørne hoder:hode huder:hud hunder:hund hvaler:hval hender:hånd isbiter:isbit iskremer:iskrem kinoer:kino kiosker:kiosk kirker:kirke kjelker:kjelke kjemper:kjempe kjoler:kjole kvelder:kveld kyster:kyst lunsjer:lunsj lyder:lyd lørdager:lørdag mandager:mandag middager:middag morgener:morgen måneder:måned negler:negl onsdager:onsdag pizzaer:pizza silder:sild sjanser:sjanse sjefer:sjef sjåfører:sjåfør sjøer:sjø skier:ski skinker:skinke skjeer:skje skjermer:skjerm skjærer:skjære skyer:sky skygger:skygge skøyter:skøyte snegler:snegl steder:sted strender:strand søndager:søndag tider:tid ubåter:ubåt vinder:vind årstider:årstid juicer:juice";

const LEX = new Set(LEXW.split(' '));
const LEXPLM = new Map(LEXPL.split(' ').map(s => s.split(':')));
const BLACK = new Set('død dø døde kniv gift blod våpen sverd monster spøkelse heks edderkopp slange ulv syk vond mørk mørke troll hat drepe skyte'.split(' '));

/* =================================================================== word data */
const FALLBACK_EXCLUDE = /^(proto_|ch_|c_|r_|p_|v_|n_|fx_|f_|g_|b_|w_|pet_|toy_|food_|mus_|gift_|ride_|mag_)/;
let fbCache = null, fbN = -1;
function lib() {
  const L = F.WORDS && F.WORDS.list;
  if (L && L.length) return L;
  // before words.js exists: every plain-word VOX def is a castable library word
  const ids = Object.keys(F.VOX.defs);
  if (!fbCache || fbN !== ids.length) { fbN = ids.length; fbCache = ids.filter(id => /^[a-zæøå]{2,8}$/.test(id) && !FALLBACK_EXCLUDE.test(id)).map(id => ({ w: id, model: id, castable: true })); }
  return fbCache;
}
function entry(w) {
  if (!w) return null;
  const W = F.WORDS;
  let e = W && W.list && W.list.length && W.get ? W.get(w) : null;
  if (!e) e = lib().find(x => x.w === w) || null;
  return e;
}
function modelOf(e) {
  if (!e) return null;
  if (e.model && F.VOX.has(e.model)) return e.model;
  if (F.VOX.has(e.w)) return e.w;
  return null;
}
function castable(e) { return !!(e && e.castable !== false && modelOf(e)); }
function locked(e) {
  if (!e || !e.pack) return false;
  const packs = (F.save.shop && F.save.shop.packs) || [];
  if (packs.includes(e.pack)) return false;
  if (F.Eco && F.Eco.owned && (F.Eco.owned('pakke_' + e.pack) > 0)) return false;
  return true;
}
function baseEntry(w) {
  let e = entry(w); if (e) return { e, plural: false };
  e = lib().find(x => x.pl === w); if (e) return { e, plural: true };
  const s = LEXPLM.get(w); if (s) { e = entry(s); if (e) return { e, plural: true }; }
  // simple bokmål plural endings as a last resort (-er, -r, -ene)
  for (const suf of ['er', 'r', 'e']) if (w.length > suf.length + 2 && w.endsWith(suf)) { e = entry(w.slice(0, -suf.length)); if (e && castable(e)) return { e, plural: true }; }
  return null;
}
// edit distance ≤ 1 (insert / delete / substitute / adjacent transposition)
function ed1(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0; while (i < la && a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return true;                                 // substitution
    return i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // transposition
  }
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0; while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
}
const CAT_TAG = { mat: 'eat', frukt: 'eat', bær: 'eat', grønnsak: 'eat', bakst: 'eat', drikke: 'drink', dyr: 'cuddle', fugl: 'fly', leke: 'play', leker: 'play',
  sport: 'play', klær: 'wear', smykke: 'wear', møbel: 'sit', møbler: 'sit', blomst: 'smell', plante: 'grow', hage: 'grow', lys: 'light', musikk: 'music',
  kjøretøy: 'ride', transport: 'ride', vær: 'warm', hjem: 'none' };
function tagOfEntry(e) {
  if (!e) return 'none';
  let r = e.react; if (Array.isArray(r)) r = r[0];
  if (r === 'eat' && (e.tags || []).includes('drikke')) return 'drink';
  if (r === 'pet') return (e.tags || []).includes('flyte') && /and|due|fugl/.test(e.w) ? 'fly' : 'cuddle';
  if (r === 'look') return (e.tags || []).includes('lukte') ? 'smell' : (e.tags || []).includes('lys') ? 'light' : (e.tags || []).includes('musikk') ? 'music' : 'none';
  if (r) return ({ spise: 'eat', eat: 'eat', drikke: 'drink', drink: 'drink', ha_på: 'wear', wear: 'wear', leke: 'play', play: 'play', kose: 'cuddle', cuddle: 'cuddle',
    sitte: 'sit', sit: 'sit', sove: 'sleep', sleep: 'sleep', lukte: 'smell', smell: 'smell', varme: 'warm', warm: 'warm', lyse: 'light', light: 'light',
    kjøre: 'ride', ride: 'ride', spille: 'music', music: 'music', vokse: 'grow', grow: 'grow', fly: 'fly' })[r] || r;
  return CAT_TAG[e.cat] || 'none';
}

/* =================================================================== modifier words («Scribblenauts»): size / colour / mood
   Written alone in free mode they change the last (or nearest) summoned thing; written before a noun («stor rød kake»)
   the thing is born that way. Every one is a real reading/writing word; spoken via wand_mod {m} (set WAND_MODS). */
const MODS = {
  stor: { t: 'size', k: 1.6 }, liten: { t: 'size', k: 0.6 },
  rød: { t: 'col', c: 'red' }, blå: { t: 'col', c: 'blue' }, gul: { t: 'col', c: 'yellow' }, grønn: { t: 'col', c: 'green' },
  rosa: { t: 'col', c: 'pink' }, lilla: { t: 'col', c: 'purple' }, hvit: { t: 'col', c: 'white' }, brun: { t: 'col', c: 'brown' },
  glad: { t: 'mood', m: 'glad' }, sove: { t: 'mood', m: 'sove' }, danse: { t: 'mood', m: 'danse' }, hoppe: { t: 'mood', m: 'hoppe' },
  våken: { t: 'mood', m: null },
};
const MOD_ALIAS = { store: 'stor', stort: 'stor', små: 'liten', lita: 'liten', lite: 'liten', lille: 'liten', røde: 'rød', rødt: 'rød', blått: 'blå',
  gule: 'gul', gult: 'gul', grønne: 'grønn', grønt: 'grønn', hvite: 'hvit', hvitt: 'hvit', brune: 'brun', brunt: 'brun', glade: 'glad',
  sov: 'sove', sover: 'sove', dans: 'danse', danser: 'danse', hopp: 'hoppe', hopper: 'hoppe', våkne: 'våken', våkn: 'våken' };
const modOf = w => { const b = MODS[w] ? w : MOD_ALIAS[w]; return b ? Object.assign({ w, base: b }, MODS[b]) : null; };
F.SETS = F.SETS || {};
F.SETS.WAND_MODS = Object.keys(MODS).concat(Object.keys(MOD_ALIAS));
/* v5 WP-T: wand POWERS (DESIGN5 §9) – a number before the word (tall), colour (farge), size (storrelse) and mood (humor) words are
   earned by learning milestones (F.Book, js/ui/trylleboka.js). Until then the wand makes the plain thing; Puff says once per bar
   session «Den trylleformelen lærer du snart!» and the power's gem on the bar wiggles. Without F.Book every power is open. */
const MOD_POW = { size: 'storrelse', col: 'farge', mood: 'humor' };
const hasPow = id => { try { return !(F.Book && F.Book.has) || F.Book.has(id); } catch (e) { return true; } };
function gatePow(r, n) {
  const lockedP = [];
  if (n != null && n > 1 && !hasPow('tall')) { lockedP.push('tall'); n = null; if (r && r.n != null) r = Object.assign({}, r, { n: null }); }
  if (r && r.mods) {
    const keep = r.mods.filter(m => { const p = MOD_POW[m.t]; if (!p || hasPow(p)) return true; if (!lockedP.includes(p)) lockedP.push(p); return false; });
    if (keep.length !== r.mods.length) {
      // «rød» alone before Fargekraft: no letter blocks (natural audit #65) – the free bar shows a splash of the colour, the gem wiggles
      if (r.kind === 'mod' && !keep.length) r = { kind: 'lex', word: r.mods[0].w, n: null, powLocked: true, lockedMods: r.mods };
      else r = Object.assign({}, r, { mods: keep.length ? keep : null });
      // a near miss («stor kakke»): the ghost letters never suggest a power she has not earned yet
      if (r.kind === 'near' && r.ghostText) r.ghostText = keep.length ? keep.map(m => m.w).join(' ') + ' ' + r.near : null;
    }
  }
  return { r, n, lockedP };
}
const PALC = c => { try { return F.col ? F.col(c) : (F.PAL && F.PAL[c]) || 0xffffff; } catch (e) { return 0xffffff; } };
// does the model honour o.c (its main colour)? (LEARN's check; cached there) – otherwise a per-instance tint is used
const colourable = m => { try { return !!(F.BANKS && F.BANKS.colourOk && F.BANKS.colourOk(m)); } catch (e) { return false; } };

/* =================================================================== resolve */
function resolve(text) {
  let t = String(text == null ? '' : text).toLowerCase().replace(/\s+/g, ' ').trim();
  let n = null;
  const m = t.match(/^(\d{1,3})\s*(.*)$/); if (m) { n = +m[1]; t = m[2].trim(); }
  if (!t) return { kind: 'empty', word: '', n };
  if (t.includes(' ')) {
    // «stor rød kake», «14 røde epler»: modifiers before a noun; only modifiers → apply them to the last thing
    const toks = t.split(' '), mods = [];
    let i = 0; while (i < toks.length && modOf(toks[i])) { mods.push(modOf(toks[i])); i++; }
    if (i === toks.length) return { kind: 'mod', word: t, mods, n };
    if (mods.length && i === toks.length - 1) {
      const r = resolve1(toks[i], n);
      if (r.kind === 'model') return Object.assign(r, { mods, phrase: t });
      if (r.kind === 'near') return Object.assign(r, { mods, ghostText: toks.slice(0, i).join(' ') + ' ' + r.near });
      return r;
    }
    return resolve1(toks.join(''), n);   // a stray space («is krem») – read it as one word
  }
  // parent 11.10. (play test: «rød», then «bil» typed straight after = «rødbil» → nothing): a colour / size / mood word glued to a
  // thing she can conjure is read as «rød bil» – only when the whole word is not a real word («gulrot», «blåbær» stay themselves)
  const r1 = resolve1(t, n);
  if (r1.kind === 'model' || r1.kind === 'lex' || r1.kind === 'mod' || r1.kind === 'locked') return r1;
  const glued = splitMods(t);
  return glued ? resolve((n != null ? n + ' ' : '') + glued) : r1;
}
const MOD_KEYS = () => Object.keys(MODS).concat(Object.keys(MOD_ALIAS)).sort((a, b) => b.length - a.length);
function splitMods(t) {
  const out = []; let rest = t;
  for (let g = 0; g < 3; g++) {
    const k = MOD_KEYS().find(m => rest.startsWith(m) && rest.length - m.length >= 2);
    if (!k) return null;
    out.push(k); rest = rest.slice(k.length);
    const b = baseEntry(rest); if (b && castable(b.e)) return out.join(' ') + ' ' + rest;
  }
  return null;
}
function resolve1(t, n) {
  if (BLACK.has(t)) return { kind: 'unknown', word: t, n };
  const b = baseEntry(t);
  if (b && castable(b.e)) {
    if (locked(b.e)) return { kind: 'locked', word: b.e.w, pack: b.e.pack, n, entry: b.e };
    return { kind: 'model', word: b.e.w, model: modelOf(b.e), n, entry: b.e, plural: b.plural, typed: t };
  }
  const md = modOf(t); if (md) return { kind: 'mod', word: t, mods: [md], n };
  if ((b && b.e) || LEX.has(t) || LEXPLM.has(t)) return { kind: 'lex', word: t, n, entry: b ? b.e : null };
  let best = null;
  for (const x of lib()) {
    if (!castable(x) || locked(x)) continue;
    if (ed1(t, x.w) || (x.pl && ed1(t, x.pl))) {
      const sc = (x.w[0] === t[0] ? 4 : 0) + (x.w.length === t.length ? 1 : 0) + (x.p0 ? 1 : 0);
      if (!best || sc > best.sc) best = { e: x, sc };
    }
  }
  if (best) return { kind: 'near', word: t, near: best.e.w, model: modelOf(best.e), n, entry: best.e };
  return { kind: 'unknown', word: t, n };
}

/* =================================================================== fairy skin / positions */
const SKIN_COL = {
  krystall: [0x9fe8ff, 0xffffff, 0xc6a8ff, 0xd8f2ff], blomst: [0xff7fb0, 0xffffff, 0x9fe6c4, 0xfff0a0, 0xf6a9c8],
  boble: [0x9ad6ff, 0xcfefff, 0xffffff, 0x5cc8c0], stjerne: [0xffd84a, 0xfff6b0, 0xffffff, 0xffc8a8],
};
const fairyKind = () => (F.save.fairy && SKIN_COL[F.save.fairy]) ? F.save.fairy : 'krystall';
const fairyStyle = () => { try { return (F.Fairy && F.Fairy.style && F.Fairy.style(fairyKind())) || null; } catch (e) { return null; } };
// summoned things must read as REAL objects: the all-glass 'crystal' transform makes them look like ghosts at play distance,
// so the crystal fairy's magic shows in the sparkles/shards around the thing instead (flower/bubble/star styles keep colours).
const summonStyle = () => { const s = fairyStyle(); return s === 'crystal' ? null : s; };
const skinCols = k => SKIN_COL[k || fairyKind()];
function camDir() {   // unit vector (xz) from the fairy towards the camera
  const P = F.Player.pos, c = F.R.camera.position;
  let dx = c.x - P.x, dz = c.z - P.z; const L = Math.hypot(dx, dz);
  if (L < 1e-3) { const y = F.R.cam.yaw || 0; return { x: Math.sin(y), z: Math.cos(y) }; }
  return { x: dx / L, z: dz / L };
}
function wandTip() {
  const P = F.Player, a = P.avatar, v = new V3();
  const anc = a && a.userData && (a.userData.wandTip || (a.userData.anchors && (a.userData.anchors.wand || a.userData.anchors.hand)));
  if (anc && anc.getWorldPosition) { P.obj.updateMatrixWorld(true); anc.getWorldPosition(v); v.y += 0.12; return v; }
  const d = camDir(), rx = d.z, rz = -d.x;   // screen-right
  return v.set(P.pos.x + rx * 0.45 + d.x * 0.2, P.pos.y + 1.35, P.pos.z + rz * 0.45 + d.z * 0.2);
}
const hAt = (x, z, sp) => { try { return F.Space.impl[sp || F.Space.cur].heightAt(x, z); } catch (e) { return 0; } };
function screenOf(v, camera) {
  const cm = camera || F.R.camera;
  if (!camera) cm.updateMatrixWorld();   // tests may skip rendering: never project with a stale view
  const p = v.clone().project(cm), r = F.R.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, on: p.z < 1 && p.z > -1 };
}
/* natural audit #40 (parent 11.10.: «rød» indoors landed on a thing hidden behind the spell bar): what the child can SEE while the free
   bar is open. barRects() = the bar and its Trylleboka cluster where they REST (the reveal strip and the slide-in transition ignored),
   onView(v) = a world point on the canvas and not under them, inView(thing) = a summoned thing she can see (near, shown, not hidden by
   a wall, its middle above the bar). Things are made and changed only where she sees them. */
function barRects() {
  const out = [];
  try {
    const sp = cur && cur.mode === 'free' && cur.sp; if (!sp || !sp.el.isConnected) return out;
    const r = sp.el.getBoundingClientRect(), h = sp.el.offsetHeight, H = innerHeight;
    const top = H - 10 - h;
    out.push({ l: r.left, r: r.right, t: top, b: H });
    const c = cur.tbc && cur.tbc.el;
    if (c && c.isConnected) { const cr = c.getBoundingClientRect(); out.push({ l: cr.left, r: cr.right, t: top - 4 - c.offsetHeight, b: top }); }
  } catch (e) { /* no layout */ }
  return out;
}
function onView(v, rects, pad, camera) {
  const s = screenOf(v, camera || restCam()), R = F.R.renderer.domElement.getBoundingClientRect(), m = pad == null ? 18 : pad;
  if (!s.on || s.x < R.left + m || s.x > R.right - m || s.y < R.top + m || s.y > R.bottom - m) return false;
  return !(rects || barRects()).some(b => s.x > b.l - m && s.x < b.r + m && s.y > b.t - m && s.y < b.b + m);
}
// nothing solid (wall, house, stall) on the line from (x,z) toward the camera
// (indoors the dollhouse view looks down through the cut-away front: only furniture right in front of the spot hides it – the edge
// collider of the open front never does; other rooms/floors are hidden by Fetårnet itself: thing.hidden)
function losClear(x, z) {
  if (F.Space.cur === 'in') return inLos(x, z);
  try {
    const c = restCam().position, dx = c.x - x, dz = c.z - z, L = Math.hypot(dx, dz);
    for (let t = 0.8; t < Math.min(L - 0.5, 9); t += 0.4) if (F.Space.blocked(x + dx / L * t, z + dz / L * t, 0.15)) return false;
    return true;
  } catch (e) { return true; }
}
function inLos(x, z) {
  try {
    const c = restCam().position, dx = c.x - x, dz = c.z - z, L = Math.hypot(dx, dz) || 1;
    const pl = F.Bld && F.Bld.curPlan && F.Bld.curPlan(), front = pl ? pl.oz + 9.3 : 1e9;
    for (let t = 0.7; t <= 1.71; t += 0.25) { const px = x + dx / L * t, pz = z + dz / L * t; if (pz > front) break; if (F.Space.blocked(px, pz, 0.15)) return false; }
    return true;
  } catch (e) { return true; }
}
function inView(t, rects) {
  if (!t || !t.obj || !t.obj.parent || t.space !== F.Space.cur || t.hidden || !t.obj.visible) return false;
  if (Math.hypot(t.x - F.Player.pos.x, t.z - F.Player.pos.z) > 14) return false;
  const h = Math.max(0.4, Math.min(3, (t.labelY || 1.2) - 0.35));
  return onView(new V3(t.x, t.y + h * 0.5, t.z), rects) && losClear(t.x, t.z);
}
// a non-summoned prop (stall, bench, mat, chest …) stands on or right next to (x,z); her stall keeps the whole front clear too – the
// crates of goods (stall.js shelf: x ±2.5 m, ≈ r + 1.1 m in front) and the customers' queue (QSPOT, up to ≈ 6.6 m in front)
function nearProp(x, z, sp) {
  return F.Things.list.some(t => {
    if (t.space !== sp || t.type === 'summoned' || t.hidden || !t.obj || !t.obj.visible || (t.radius || 0) >= 6) return false;
    const r = t.radius || 0.5;
    if (t.stall || t.type === 'life_bod') return Math.abs(x - t.x) < 3.7 && z > t.z - r - 0.6 && z < t.z + r + 7.4;
    return Math.hypot(t.x - x, t.z - z) < r + 0.6;
  });
}
// a new thing standing at (x,z) can be seen above the bar (with the camera of the open bar)
function spotSeen(x, z, big) {
  const y = hAt(x, z) + 0.45 * Math.max(1, big || 1);
  return onView(new V3(x, y, z), null, 30) && losClear(x, z);
}
// is (x,z) on/near a summoned thing? (rows of ten are rectangles in their own frame)
function occupies(t, x, z, pad) {
  const M = t.obj && t.obj.userData && t.obj.userData.multi;
  if (!M) return Math.hypot(t.x - x, t.z - z) < Math.max(0.7, t.radius) * Math.max(1, (t.data && t.data.sc) || 1) + (pad || 0) * 0.3;
  const c = Math.cos(t.ry || 0), s = Math.sin(t.ry || 0), dx = x - t.x, dz = z - t.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;   // world → local (rotation about y by -ry)
  const hw = 5 * M.L.sp + M.L.gap / 2 + (pad || 0), z0 = -M.L.sp / 2 - (pad || 0), z1 = (M.L.rows - 1) * M.L.sp * RZ + M.L.sp / 2 + (pad || 0);
  return Math.abs(lx) < hw && lz > z0 && lz < z1;
}
let slotI = 0;
const SLOTS = [[1.5, -0.9], [-1.5, -0.9], [0.9, -1.9], [-0.9, -1.9], [0, -2.4], [2.3, -1.9], [-2.3, -1.9], [1.6, -3.0], [-1.6, -3.0], [0, -3.4]];
// front slots (towards the camera, beside her) – used when everything behind her is inside a building / hidden
const SLOTS_FRONT = [[1.7, 0.9], [-1.7, 0.9], [2.4, 0.2], [-2.4, 0.2], [1.2, 1.8], [-1.2, 1.8]];
// can the camera see a thing standing at (x,z)? not inside a wall/house, and no wall/house on the line towards the camera
function spotClear(x, z) {
  try {
    if (F.Space.blocked(x, z, 0.45)) return false;
    if (F.Space.cur === 'in') return inLos(x, z);   // natural audit #40: the cut-away front of a room never hides a spot (it rejected every one)
    const c = restCam().position, dx = c.x - x, dz = c.z - z, L = Math.hypot(dx, dz);
    for (let t = 0.6; t < Math.min(L - 0.5, 9); t += 0.4) if (F.Space.blocked(x + dx / L * t, z + dz / L * t, 0.15)) return false;
    return true;
  } catch (e) { return true; }
}
function freeSpot(big) {   // a spot near the fairy, beside/behind her (so it shows above the spell bar); big = scale of the new thing
  const P = F.Player.pos, d = camDir(), rx = d.z, rz = -d.x, sp = F.Space.cur, pad = 0.5 + Math.max(0, (big || 1) - 1) * 1.6;
  const cands = [];
  for (let k = 0; k < SLOTS.length; k++) cands.push([SLOTS[(slotI + k) % SLOTS.length], k]);
  SLOTS_FRONT.forEach(f => cands.push([f, -1]));
  // pass 0: free + visible from the camera, above the open bar, off the props (stalls, mats …); pass 1: the same on wider rings around
  // her (she stands in a crowded spot – right at her stall); pass 2: free and not inside anything solid (old rule + no walls)
  const ring = [];
  for (const R of [2.6, 3.4, 4.3]) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ring.push([[Math.sin(a) * R, -Math.cos(a) * R], -2]); }
  for (let pass = 0; pass < 3; pass++) for (const [[sx, sb], k] of (pass === 1 ? ring : cands)) {
    if (pass === 2 && k < 0) continue;
    const x = P.x + rx * sx + d.x * sb, z = P.z + rz * sx + d.z * sb;
    if (F.Space.cur === 'out' && F.W.water && F.W.water(x, z)) continue;
    const busy = F.Things.list.some(t => t.space === sp && t.type === 'summoned' && occupies(t, x, z, pad));
    if (busy) continue;
    if (pass < 2 && (!spotClear(x, z) || nearProp(x, z, sp) || !spotSeen(x, z, big))) continue;
    if (pass === 2) { try { if (F.Space.blocked(x, z, 0.4)) continue; } catch (e) { /* space */ } }
    if (k >= 0) slotI = (slotI + k + 1) % SLOTS.length;
    return { x, z };
  }
  slotI = (slotI + 1) % SLOTS.length;
  const [sx, sb] = SLOTS[slotI];
  return { x: P.x + rx * sx + d.x * sb + (F.rand() - .5) * 0.6, z: P.z + rz * sx + d.z * sb + (F.rand() - .5) * 0.6 };
}
// «der ord blir til ting» reveal: the new thing stands IN FRONT of the fairy (towards the camera), a little to the side so she stays visible
// – and (natural audit #65) only where it stays in sight once the bar is back: above the bar, off the stalls and props
const SLOTS_REVEAL = [[1.25, 1.45], [-1.25, 1.45], [1.6, 0.9], [-1.6, 0.9], [2.0, 0.6], [-2.0, 0.6], [0, 2.5], [2.7, 1.7], [-2.7, 1.7], [1.4, 2.9], [-1.4, 2.9], [2.3, -0.2], [-2.3, -0.2]];
function frontSpot(big) {
  const P = F.Player.pos, d = camDir(), rx = d.z, rz = -d.x, sp = F.Space.cur, pad = 0.6 + Math.max(0, (big || 1) - 1) * 1.6;
  for (const [sx, sb] of SLOTS_REVEAL) {
    const x = P.x + rx * sx + d.x * sb, z = P.z + rz * sx + d.z * sb;
    if (sp === 'out' && F.W.water && F.W.water(x, z)) continue;
    if (F.Things.list.some(t => t.space === sp && t.type === 'summoned' && occupies(t, x, z, pad))) continue;
    if (!spotClear(x, z) || nearProp(x, z, sp) || !spotSeen(x, z, big)) continue;
    return { x, z };
  }
  return null;
}
let revealCam = null;   // camera state saved while a reveal push-in runs (camShift reads the real distance from it)

/* =================================================================== letter blocks (lexicon words without a model) */
const texCache = new Map();
const BLOCK_COLS = ['#ffb3d1', '#a6efcd', '#fff0a0', '#9ad6ff', '#c6a8ff', '#ffc8a8'];
function letterTex(ch, ci) {
  const key = ch + '|' + ci + '|' + (F.UI.caseText('a'));
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = BLOCK_COLS[ci % BLOCK_COLS.length]; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,.55)'; roundRect(g, 10, 10, 108, 108, 18); g.fill();
  g.fillStyle = '#3b2f5c'; g.font = '700 86px Andika, "Avenir Next Rounded", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(F.UI.caseText(ch), 64, 70);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  texCache.set(key, t); return t;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
if (document.fonts && document.fonts.load) document.fonts.load('700 86px Andika').then(() => { texCache.forEach(t => t.dispose()); texCache.clear(); }).catch(() => {});
const BLOCK = 0.8;
let blockGeo = null;
function buildBlocks(word) {
  const g = new THREE.Group(); g.userData.blocks = [];
  if (!blockGeo) blockGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
  const chars = [...word], n = chars.length, gap = BLOCK * 1.08;
  chars.forEach((ch, i) => {
    const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(BLOCK_COLS[i % BLOCK_COLS.length]).multiplyScalar(0.9) });
    const face = new THREE.MeshLambertMaterial({ map: letterTex(ch, i) });
    // +x -x +y -y +z -z : the letter on the front (+z) and the back (-z) only (top plain, so the word reads once)
    const top = new THREE.MeshLambertMaterial({ color: new THREE.Color(BLOCK_COLS[i % BLOCK_COLS.length]) });
    const m = new THREE.Mesh(blockGeo, [side, side, top, side, face, face]);
    m.castShadow = true; m.receiveShadow = true;
    const home = new V3((i - (n - 1) / 2) * gap, BLOCK / 2, 0);
    m.position.copy(home); m.userData.home = home.clone(); m.userData.ch = ch;
    g.add(m); g.userData.blocks.push(m);
  });
  return g;
}

/* =================================================================== multi (Tallmagi): N copies as instanced meshes, rows of ten */
function itemSize(model, o) {
  const d = F.VOX.defs[model]; if (!d) return { w: 0.5, h: 0.5, d: 0.5 };
  return { w: d.size[0] * d.scale, h: d.size[1] * d.scale, d: d.size[2] * d.scale };
}
const RZ = 1.6;   // row spacing (× item spacing): rows clearly apart
function rowLayout(n, model) {
  const s = itemSize(model), foot = Math.max(s.w, s.d);
  const sc = foot > 0.75 ? 0.75 / foot : 1;
  const sp = U.clamp(foot * sc * 1.18, 0.34, 0.95), gap = sp * 0.45;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 10), col = i % 10;
    const x = (col - 4.5) * sp + (col >= 5 ? gap / 2 : -gap / 2);
    const z = row * sp * RZ;          // row 0 = the full ten (furthest from the camera), loose ones in front of it
    pos.push(new V3(x, 0, z));
  }
  return { pos, sc, sp, gap, rows: Math.ceil(n / 10) };
}
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new V3(), tmpP = new V3(), offM = new THREE.Matrix4();
function buildMulti(model, opts, n, skin) {
  const g = new THREE.Group();
  const L = rowLayout(n, model);
  const geo = F.VOX.geometry(model, opts);
  const subs = [];
  for (const cls in geo.body) subs.push({ g: geo.body[cls], cls, off: [0, 0, 0] });
  for (const pn in geo.parts) { const p = geo.parts[pn]; for (const cls in p.geo) subs.push({ g: p.geo[cls], cls, off: p.pos }); }
  const meshes = subs.map(s => {
    const k = s.cls === 'opaque' ? (opts.style === 'crystal' ? 'crystal' : 'opaque') : s.cls;
    const m = new THREE.InstancedMesh(s.g, F.VOX.material(k), n);
    m.castShadow = s.cls === 'opaque'; m.frustumCulled = false; if (s.cls === 'glass') m.renderOrder = 2;
    g.add(m); return { m, off: new V3(...s.off) };
  });
  // ten-structure: a glowing tray under every full row of ten, a smaller one under the loose ones
  const cols = skinCols(skin), trays = [];
  for (let r = 0; r < L.rows; r++) {
    const cnt = Math.min(10, n - r * 10), full = cnt === 10;
    const w = full ? 10 * L.sp + L.gap + 0.1 : 10 * L.sp + L.gap + 0.1;
    const tray = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, L.sp * 0.95),
      new THREE.MeshLambertMaterial({ color: cols[0], emissive: cols[0], emissiveIntensity: full ? 0.35 : 0.12, transparent: true, opacity: full ? 0.85 : 0.45 }));
    tray.position.set(0, 0.03, r * L.sp * RZ); tray.receiveShadow = true;
    g.add(tray); trays.push(tray);
    // little dividers so every cell of the ten is visible (5 + 5)
    for (let c = 0; c < 10; c++) {
      const x = (c - 4.5) * L.sp + (c >= 5 ? L.gap / 2 : -L.gap / 2);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(L.sp * 0.36, L.sp * 0.36, 0.02, 14), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      dot.position.set(x, 0.07, r * L.sp * RZ); g.add(dot);
    }
  }
  // invisible pick proxy (instanced meshes have no useful bbox)
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(10 * L.sp + L.gap, Math.max(0.5, itemSize(model).h * L.sc), L.rows * L.sp * RZ), new THREE.MeshBasicMaterial());
  proxy.position.set(0, Math.max(0.5, itemSize(model).h * L.sc) / 2, (L.rows - 1) * L.sp * RZ / 2); proxy.visible = false; g.add(proxy);
  const M = g.userData.multi = { n, L, meshes, trays, shown: 0, hop: new Float32Array(n), anim: null };
  M.set = (i, p, scale, ry) => {
    tmpQ.setFromAxisAngle(new V3(0, 1, 0), ry || 0); tmpS.setScalar(Math.max(1e-4, scale));
    for (const mm of meshes) { offM.makeTranslation(mm.off.x, mm.off.y, mm.off.z); tmpM.compose(p, tmpQ, tmpS).multiply(offM); mm.m.setMatrixAt(i, tmpM); mm.m.instanceMatrix.needsUpdate = true; }
  };
  M.kk = 1; M.spin = null;
  M.place = (i, k) => { const p = L.pos[i]; tmpP.set(p.x, p.y + (M.hop[i] || 0), p.z); M.set(i, tmpP, L.sc * M.kk * (k == null ? 1 : k), (i * 0.37) % 0.5 - 0.25 + (M.spin ? M.spin[i] : 0)); };
  M.showAll = () => { for (let i = 0; i < n; i++) M.place(i, 1); M.shown = n; };
  M.hideAll = () => { for (let i = 0; i < n; i++) M.set(i, L.pos[i], 0, 0); M.shown = 0; };
  M.hideAll();
  return g;
}

/* =================================================================== summoned things */
// model options for a summoned thing: fairy style + its colour word (when the model honours o.c)
function makeOpts(d) { const o = {}; if (d.st) o.style = d.st; if (d.c && colourable(d.m || d.w)) o.c = d.c; return o; }
function buildSummoned(th) {
  const d = th.data, style = d.st || null;
  let obj;
  if (d.k === 'lex') obj = buildBlocks(d.w);
  else if (!F.VOX.has(d.m || d.w)) obj = buildBlocks(d.w);
  else if ((d.n || 1) > 1) {
    obj = buildMulti(d.m || d.w, makeOpts(d), d.n, d.sk);
    obj.userData.multi.kk = U.clamp(d.sc || 1, 0.5, 1.35); obj.userData.multi.showAll();
  } else {
    obj = F.VOX.make(d.m || d.w, makeOpts(d));
    const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new V3());
    const big = Math.max(s.x, s.y, s.z);
    if (big > 4.5) obj.scale.setScalar(4.5 / big);
    obj.userData.baseScale = obj.scale.x;
    if (d.sc) obj.scale.multiplyScalar(d.sc);
    th.labelY = Math.min(6, s.y * obj.scale.y) + 0.35;
  }
  if (d.c && (d.k === 'lex' || !colourable(d.m || d.w))) tintObj(obj, d.c);
  if (d.k === 'lex' && d.sc) obj.scale.multiplyScalar(d.sc);
  if (th.labelY == null) th.labelY = 1.4 * (d.k === 'lex' && d.sc ? d.sc : 1);
  return obj;
}
// cheap per-instance colour: clone the (shared) vertex-colour materials; the shader turns the vertex colours into light/dark
// (keeping a hint of the original) and multiplies by the colour, so a red apple really becomes yellow (white: washed out)
const TINT_CHUNK = `#if defined( USE_COLOR )
  float wtl = dot( vColor, vec3( 0.299, 0.587, 0.114 ) );
  diffuseColor.rgb *= mix( vec3( 0.56 + 0.6 * wtl ), vColor, 0.12 );
#endif`;
const tintCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', TINT_CHUNK); };
function tintObj(obj, c) {
  const col = new THREE.Color(PALC(c)), white = c === 'white';
  if (!white) { const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.1 + 0.08), U.clamp(hsl.l * 1.1 + 0.08, 0.4, 0.85)); }
  obj.traverse(m => {
    if (!m.isMesh || !m.material) return;
    const tint = mt => {
      if (!mt || mt.type === 'MeshBasicMaterial') return mt;
      const base = mt.userData && mt.userData.tint0 ? mt.userData.tint0 : mt;
      const nm = base.clone(); nm.userData = { tint0: base };
      nm.onBeforeCompile = tintCompile; nm.customProgramCacheKey = () => 'wandTint';
      if (white) { nm.color = new THREE.Color(1.12, 1.12, 1.12); if (nm.emissive) nm.emissive = new THREE.Color(0x3a3a3a); }
      else nm.color = col.clone();
      return nm;
    };
    m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material);
  });
}
F.Things.def('summoned', { name: 'trylleting', radius: 0.45, solid: false, reach: 2.2, build: buildSummoned, press: pressSummoned, tick: tickSummoned });

function magic() { const m = F.save.magic = F.save.magic || { list: [], seq: 0 }; m.list = m.list || []; return m; }
function wordsLog() { const w = F.save.words = F.save.words || {}; w.made = w.made || {}; w.spont = w.spont || {}; return w; }
function record(th) {
  const M = magic();
  const r = { id: th.id, w: th.data.w, m: th.data.m || null, k: th.data.k || 'model', n: th.data.n || 1, x: +th.x.toFixed(2), z: +th.z.toFixed(2),
    ry: +(th.ry || 0).toFixed(2), sp: th.space, st: th.data.st || null, sk: th.data.sk || null, f: th.data.free ? 1 : 0, b: th.data.b || 0, t: Date.now() };
  if (th.data.c) r.c = th.data.c;
  if (th.data.sc && th.data.sc !== 1) r.sc = +th.data.sc.toFixed(3);
  if (th.data.md) r.md = th.data.md;
  const i = M.list.findIndex(x => x.id === th.id);
  if (i >= 0) M.list[i] = r; else M.list.push(r);
  // cap: at most 300 free casts stay in the world (oldest go with a puff)
  const free = M.list.filter(x => x.f);
  const drop = free.length > 300 ? free[0] : (M.list.length > 420 ? M.list[0] : null);
  if (drop && drop.id !== th.id) {
    M.list.splice(M.list.indexOf(drop), 1);
    const t = F.Things.byId(drop.id); if (t) poofAway(t, true);
  }
  F.store();
}
function unrecord(th) { const M = magic(), i = M.list.findIndex(x => x.id === th.id); if (i >= 0) { M.list.splice(i, 1); F.store(); } }
function spawnSummoned(data, x, z, o) {
  o = o || {};
  const M = magic();
  const id = o.id || ('mg_' + (M.seq = (M.seq || 0) + 1));
  const sp = o.space || F.Space.cur;
  const th = F.Things.spawn('summoned', x, z, { id, ry: o.ry || 0, data, space: sp, zone: sp === 'out' ? 'chunk' : null, y: o.y });
  if (th && (data.n || 1) > 1) th.radius = 1.4;
  return th;
}
function restore() {
  const M = magic();
  for (const r of M.list.slice()) {
    if (F.Things.byId(r.id)) continue;
    if (r.k !== 'lex' && !F.VOX.has(r.m || r.w)) continue;   // model not (yet) defined – keep the record
    try { spawnSummoned({ w: r.w, m: r.m, k: r.k, n: r.n, st: r.st, sk: r.sk, free: !!r.f, b: r.b || 0, c: r.c || null, sc: r.sc || null, md: r.md || null }, r.x, r.z, { id: r.id, ry: r.ry, space: r.sp }); }
    catch (e) { console.warn('wand restore failed', r.id, e); }
  }
}

/* =================================================================== cast effects */
function trail(from, to, cols, ms) {
  if (F.FX.trail) { try { F.FX.trail(from, to, { ms, color: cols[0], n: 18 }); return; } catch (e) {} }
  const n = 14;
  for (let i = 0; i < n; i++) F.T.timeout(() => {
    const k = i / (n - 1), p = new V3().lerpVectors(from, to, k); p.y += Math.sin(k * Math.PI) * 1.1;
    F.FX.burst(p, { n: 3, colors: cols, speed: 0.4, up: 0.4, life: 0.5, size: 0.06, gravity: 0.3 });
  }, i * (ms / n));
}
function styleBurst(pos, kind, big) {
  const cols = skinCols(kind);
  F.FX.burst(pos, { kind: { krystall: 'cube', blomst: 'petal', boble: 'bubble', stjerne: 'star' }[kind], n: big ? 40 : 24, colors: cols, speed: kind === 'boble' ? 1.6 : 2.6, up: kind === 'blomst' ? 2 : 3, life: kind === 'blomst' ? 1.3 : 0.9,
    size: kind === 'blomst' ? 0.07 : 0.06, gravity: kind === 'blomst' ? 1.2 : 4 });
  if (F.FX.ring) F.FX.ring(new V3(pos.x, pos.y - 0.3, pos.z), cols[0]);
  if (kind === 'krystall') { if (F.sfx.crystal) F.sfx.crystal(); shards(pos); }
  else if (kind === 'stjerne') F.sfx.sparkle();
  else if (kind === 'boble') F.sfx.pop();
  else F.sfx.chime();
}
// crystal fairy: little glass crystals sprout around the new thing, glitter, and melt away again
let shardGeo = null, shardMat = null;
function shards(pos) {
  if (!shardGeo) { shardGeo = new THREE.OctahedronGeometry(0.12, 0); shardGeo.scale(1, 2.2, 1); shardMat = new THREE.MeshPhongMaterial({ color: 0xbfefff, emissive: 0x3a6a8a, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.85 }); }
  const sc = F.Space.scene(), list = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + F.rand() * 0.4, r = 0.45 + F.rand() * 0.25;
    const m = new THREE.Mesh(shardGeo, shardMat); m.position.set(pos.x + Math.cos(a) * r, pos.y - 0.45, pos.z + Math.sin(a) * r);
    m.rotation.set((F.rand() - .5) * 0.6, F.rand() * 3, (F.rand() - .5) * 0.6); m.scale.setScalar(0.01); sc.add(m); list.push(m);
  }
  F.T.tween(350, k => list.forEach((m, i) => m.scale.setScalar(Math.max(0.01, U.smooth(k) * (0.7 + (i % 3) * 0.25)))))
    .then(() => F.T.sleep(1700))
    .then(() => F.T.tween(500, k => list.forEach(m => { m.scale.multiplyScalar(0.9); m.position.y -= 0.004; })))
    .then(() => list.forEach(m => sc.remove(m)));
}
// bubble fairy: the new thing arrives inside a soap bubble that pops
function bubbleShell(obj, pos) {
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new V3()), r = Math.max(0.35, Math.max(s.x, s.y, s.z) * 0.65);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshPhongMaterial({ color: 0xcfefff, transparent: true, opacity: 0.32, shininess: 120, specular: 0xffffff, depthWrite: false }));
  m.position.set(pos.x, pos.y + s.y / 2, pos.z); F.Space.scene().add(m);
  return F.T.tween(800, k => { m.scale.setScalar(0.9 + Math.sin(k * Math.PI * 3) * 0.04 + k * 0.1); }).then(() => {
    F.Space.scene().remove(m); m.geometry.dispose(); m.material.dispose();
    F.FX.burst(m.position, { n: 22, colors: [0xcfefff, 0xffffff, 0x9ad6ff], speed: 2.2, up: 1, life: 0.6, size: 0.05, gravity: 1 }); F.sfx.pop();
  });
}
function wordLabel(th, ms) {
  if (!F.UI.label) return;
  const L = F.UI.label(th, th.data.w, { kind: 'word', space: th.space });
  F.T.timeout(() => L.remove(), ms || 2600);
  return L;
}
function sayWord(w) { return F.RW && F.RW.say ? F.RW.say('rw_word', { w }) : Promise.resolve(); }
function sayNum(n) {
  if (F.TPL.has('core_num')) return F.SAY('core_num', { n });
  return F.RW.say('wand_num', { n });
}
function poofAway(th, silent) {
  const p = new V3(th.x, th.y + 0.4, th.z);
  F.FX.burst(p, { n: 26, colors: [0xffffff, 0xe8dcff, 0xffe6f2], speed: 2, up: 2, life: 0.8, size: 0.08, gravity: 1 });
  if (!silent) F.sfx.pop();
  return F.T.tween(260, k => th.obj.scale.setScalar(Math.max(0.001, 1 - k))).then(() => { F.Things.remove(th); });
}

/* single cast: cubes stream from the wand tip into the model */
async function castOne(r, o) {
  const kind = fairyKind(), style = o.style !== undefined ? o.style : summonStyle();
  const md0 = modsData(r.mods, 1);
  const isLex = r.kind === 'lex' || !r.model;
  // the big moment (free casts and the first onboarding cast; never inside a task stage or for an NPC): in front, big, camera push-in
  const reveal = !o.at && !o.forNpc && !(F.Task && F.Task.current) && !isLex;
  const M0 = magic(), first = reveal && !M0.revealed && !(M0.list || []).length;
  const spot = o.at ? { x: o.at.x, z: o.at.z } : ((reveal && frontSpot(md0.sc)) || freeSpot(md0.sc));
  const sp = F.Space.cur;
  const data = Object.assign({ w: r.word, m: isLex ? null : r.model, k: isLex ? 'lex' : 'model', n: 1, st: isLex ? null : (style || null), sk: kind, free: !!o.free }, modsData(r.mods, 1));
  // face the camera
  const d = camDir(); const ry = Math.atan2(d.x, d.z);
  const th = spawnSummoned(data, spot.x, spot.z, { ry, space: sp });
  if (!th) return null;
  const pos = new V3(th.x, th.y, th.z), from = o.from || wandTip();
  F.Player.heading = Math.atan2(spot.x - F.Player.pos.x, spot.z - F.Player.pos.z);
  if (F.Player.avatar && F.Player.avatar.userData.play) F.Player.avatar.userData.play('cast', 1.2);
  F.FX.burst(from, { n: 18, colors: skinCols(kind), speed: 1.5, up: 1.5, life: 0.6, size: 0.05, gravity: 0.5 });
  trail(from, pos, skinCols(kind), 700);
  // a tiny cinematic push-in while the thing builds itself (free-cast camera only)
  const cam = F.R.cam, push = cam.mode === 'wand' && !reveal;
  if (push) cam.distGoal = 13;
  // reveal: small things grow to a readable size (≥ ~1.6 m; the very first cast ×2–3) and settle back afterwards
  let revK = 1, revTok = null;
  if (reveal) {
    try {
      const h0 = new THREE.Box3().setFromObject(th.obj).getSize(new V3()).y;
      revK = first ? U.clamp(Math.max(2, 2.1 / Math.max(0.1, h0)), 1, 3) : U.clamp(1.6 / Math.max(0.1, h0), 1, 2.8);
    } catch (e) { revK = 1; }
    if (first) { M0.revealed = 1; F.store(); }
    if (revK > 1.01) { th.obj.scale.multiplyScalar(revK); th.labelY = (th.labelY || 1.4) * revK; }
    revTok = frameReveal(spot);
  }
  if (isLex) {
    await dropBlocks(th, from);
  } else {
    th.obj.visible = false;
    const sc = th.obj.scale.x;
    try { await F.FX.assemble(r.model, makeOpts(data), th.obj, pos, { from, ms: 1150, max: 320 }); }
    catch (e) { console.warn('assemble failed', e); th.obj.visible = true; }
    th.obj.scale.setScalar(sc);
    if (kind === 'boble') bubbleShell(th.obj, pos);
    F.FX.pop(th.obj);
  }
  styleBurst(new V3(pos.x, pos.y + 0.5, pos.z), kind, reveal);
  if (reveal) {
    // a sparkle ring around the new thing, and the fairy turns to the camera (she shows it to the child)
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = 0.9 * Math.max(1, revK * 0.7); F.FX.burst(new V3(pos.x + Math.cos(a) * rr, pos.y + 0.15, pos.z + Math.sin(a) * rr), { n: 4, colors: skinCols(kind), speed: 0.7, up: 1.4, life: 0.8, size: 0.06 }); }
    const dc = camDir(); F.Player.heading = Math.atan2(dc.x, dc.z);
  }
  if (F.Player.avatar && F.Player.avatar.userData.play && o.free) F.Player.avatar.userData.play('twirl', 0.9);
  if (push && cam.mode === 'wand') cam.distGoal = 15;
  th.bboxDirty = true;
  if (o.persist !== false) record(th);
  wordLabel(th, reveal ? 3400 : 2800);
  if (reveal) F.T.timeout(() => endReveal(th, revK, revTok), first ? 4200 : 3300);
  return th;
}
// the reveal push-in: the camera frames the fairy and the spot (a new thing, or the thing a modifier word changes) – outdoors and
// indoors (natural audit #40); the bar is a strip meanwhile, so the view is centred between them
let frameTok = 0;
function frameReveal(spot) {
  const cam = F.R.cam, P = F.Player.pos;
  const outOk = F.Space.cur === 'out' && (cam.mode === 'wand' || cam.mode === 'out'), inOk = F.Space.cur === 'in' && cam.mode === 'wandin';
  if (!outOk && !inOk) return 0;
  if (!revealCam) revealCam = { mode: cam.mode, dist: cam.distGoal };
  cam.distGoal = inOk ? 11 : 10;
  if (cam.mode === 'wand' || inOk) cam.target.set(P.x + (spot.x - P.x) * 0.55, P.y + (inOk ? 1 : 0), P.z + (spot.z - P.z) * 0.55);
  return ++frameTok;
}
// back to the bar framing – only for the latest reveal (a newer one keeps the camera until its own end)
function endFrame(tok) {
  if (tok != null && tok !== frameTok) return;
  const cam = F.R.cam, rc = revealCam;
  revealCam = null;
  if (rc && cam.mode === rc.mode && (cam.mode === 'wand' || cam.mode === 'wandin' || (cam.mode === 'out' && F.Space.cur === 'out'))) {
    cam.distGoal = rc.dist;
    if ((cam.mode === 'wand' || cam.mode === 'wandin') && cur && cur.mode === 'free') barFrame();
    else if (cam.mode === 'wand') { const P = F.Player.pos, d = camDir(); cam.target.set(P.x + d.x * 2.1, P.y, P.z + d.z * 2.1); }
  }
}
// after the reveal: the thing settles to its normal size and the camera eases back (only if nothing else took the camera meanwhile)
function endReveal(th, k, tok) {
  endFrame(tok);
  if (k > 1.01 && alive(th) && th.obj && !th._anim) {
    const o = th.obj, s0 = o.scale.x, s1 = s0 / k;
    th.labelY = (th.labelY || 1.4) / k;
    F.T.tween(700, e => { if (th.obj === o) o.scale.setScalar(U.lerp(s0, s1, U.smooth(e))); }).then(() => { th.bboxDirty = true; });
  }
}
// the word's sound units (F.LYD.units: sj/kj/ng/ei … one sound; a double consonant one held sound; silent letters – the d in «rød»,
// «god», «glad» – glow without a sound); without F.LYD one unit per letter
function soundUnits(word) {
  const w = String(word || '').toLowerCase();
  try { if (F.LYD && F.LYD.units) { const u = F.LYD.units(w); if (u.length) return u; } } catch (e) { /* lyd */ }
  return [...w].map((ch, i) => ({ i0: i, n: 1, ch }));
}
function playUnit(u) {
  if (u.silent) return F.T.sleep(380);
  if (F.LYD && F.LYD.play && u.s) return F.LYD.play(u);
  return sayLetter(u.ch);
}
async function dropBlocks(th, from) {
  const B = th.obj.userData.blocks || [];
  B.forEach(b => { b.visible = false; });
  // natural audit #65: lydering by sound unit – the silent d of «rød» / «god» lands without a sound
  for (const u of soundUnits(th.data.w)) {
    for (let i = u.i0; i < u.i0 + u.n && i < B.length; i++) {
      const b = B[i], h = b.userData.home.clone();
      b.visible = true;
      const start = new V3(h.x, h.y + 3.2, h.z);
      await F.T.tween(260, k => { const e = k * k; b.position.set(h.x, U.lerp(start.y, h.y, e), h.z); b.rotation.z = (1 - k) * 0.8; });
      F.sfx.thud(); F.FX.pop(b);
      F.FX.burst(new V3(th.x, th.y + 0.1, th.z), { n: 6, colors: [0xfff3dc, 0xffffff], speed: 1.2, up: 1, life: 0.4, size: 0.05 });
    }
    await playUnit(u);
  }
  B.forEach(b => { b.visible = true; });
}
// letter sound (lydering) – CORE's core_lyd template (F.LETTER_SOUND) if present; never the whole word
function sayLetter(ch) {
  if (F.LYD) return F.LYD.letter(ch);   // by sound (h = a breath, never a letter name)
  const LS = F.LETTER_SOUND;
  if (LS && LS[ch] && F.TPL.has('core_lyd')) return F.SAY('core_lyd', { s: LS[ch] });
  return F.T.sleep(160);
}
// the sound of the unit that letter i belongs to in word (a silent letter: no sound)
function sayUnitAt(word, i) {
  const s = String(word || ''), a = s.lastIndexOf(' ', i - 1) + 1, e = s.indexOf(' ', i), w = s.slice(a, e < 0 ? s.length : e);   // «rød ball»: per word
  if (s[i] === ' ' || !w) return F.T.sleep(160);
  const u = soundUnits(w).find(x => i - a >= x.i0 && i - a < x.i0 + x.n);
  return u ? playUnit(u) : sayLetter(s[i]);
}

/* Tallmagi: N things land one by one in rows of ten, counted on from ten */
async function castMany(r, n, o) {
  const kind = fairyKind(), style = o.style !== undefined ? o.style : summonStyle();
  const st = style || null;
  const P = F.Player.pos, d = camDir();
  const L = rowLayout(n, r.model);
  // rows centred behind the fairy (seen above the spell bar); local +z faces the camera
  // a free rectangle for the rows: behind the fairy first, then left/right/further back (never on top of other summons)
  const W = 10 * L.sp + L.gap + 0.6, Dp = L.rows * L.sp * RZ + 0.6, rx = d.z, rz = -d.x;
  const freeRect = (x, z) => !F.Things.list.some(t => t.type === 'summoned' && t.space === F.Space.cur && (() => {
    const dx = t.x - x, dz = t.z - z, u = dx * rx + dz * rz, v = dx * d.x + dz * d.z; return Math.abs(u) < W / 2 + 0.4 && Math.abs(v) < Dp / 2 + 0.6; })());
  let cx = o.at ? o.at.x : null, cz = o.at ? o.at.z : null;
  if (!o.at) {
    const back0 = 1.4 + Dp / 2;
    const cands = [[0, back0], [0, back0 + Dp + 0.4], [-(W + 0.5), back0], [W + 0.5, back0], [0, back0 + 2 * (Dp + 0.4)], [-(W + 0.5), back0 + Dp + 0.4], [W + 0.5, back0 + Dp + 0.4]];
    // natural audit #65 (child-path test: «12 epler» in Fetårnet landed in the back wall): the rows stand where she sees them – their
    // whole footprint (origin = the full ten, the loose row toward the camera) off walls and furniture, all of it above the open bar.
    // The fixed spots first, then a scan of the floor around her (nearest to «behind her» first), then the old rule.
    const hw = 5 * L.sp + L.gap / 2, z1 = (L.rows - 1) * L.sp * RZ + L.sp / 2;
    const foot = (x, z) => { try { for (const u of [-hw, 0, hw]) for (const v of [-L.sp / 2, z1 / 2, z1]) if (F.Space.blocked(x + rx * u + d.x * v, z + rz * u + d.z * v, 0.2)) return false; return true; } catch (e) { return true; } };
    const seen = (x, z) => spotSeen(x, z) && spotSeen(x + d.x * z1, z + d.z * z1) && spotSeen(x + rx * hw * 0.9, z + rz * hw * 0.9) && spotSeen(x - rx * hw * 0.9, z - rz * hw * 0.9);
    const grid = [];
    for (let u = -4.5; u <= 4.51; u += 0.5) for (let bb = back0 + 2; bb >= -1.5; bb -= 0.5) {
      if (Math.abs(u) < hw + 0.4 && bb > -L.sp / 2 - 0.4 && bb < z1 + 0.5) continue;   // never on top of her
      grid.push([u, bb, Math.abs(u) + Math.abs(bb - back0) * 0.8]);
    }
    grid.sort((p1, p2) => p1[2] - p2[2]);
    for (let pass = 0; pass < 2 && cx == null; pass++) for (const [u, b] of (pass === 1 ? grid : cands)) {
      const x = P.x + rx * u - d.x * b, z = P.z + rz * u - d.z * b;
      if (!freeRect(x, z) || (F.Space.cur === 'out' && F.W.water && F.W.water(x, z))) continue;
      if (!foot(x, z) || !seen(x, z)) continue;
      cx = x; cz = z; break;
    }
    // a crowded room: the least bad spot (a wall or furniture in the footprint is worst, then rows she cannot see, then rows that
    // touch her other things) – never simply «behind her» into the back wall
    if (cx == null) {
      let best = null;
      for (const [u, b] of cands.concat(grid)) {
        const x = P.x + rx * u - d.x * b, z = P.z + rz * u - d.z * b;
        if (F.Space.cur === 'out' && F.W.water && F.W.water(x, z)) continue;
        let pen = 0;
        try { for (const uu of [-hw, 0, hw]) for (const v of [-L.sp / 2, z1 / 2, z1]) if (F.Space.blocked(x + rx * uu + d.x * v, z + rz * uu + d.z * v, 0.2)) pen += 10; } catch (e) { /* space */ }
        for (const [px, pz] of [[x, z], [x + d.x * z1, z + d.z * z1], [x + rx * hw * 0.9, z + rz * hw * 0.9], [x - rx * hw * 0.9, z - rz * hw * 0.9]]) if (!spotSeen(px, pz)) pen += 4;
        if (!freeRect(x, z)) pen += 3;
        pen += Math.abs(u) * 0.05 + Math.abs(b - back0) * 0.04;
        if (!best || pen < best.pen) best = { x, z, pen };
      }
      if (best) { cx = best.x; cz = best.z; }
    }
    if (cx == null) { cx = P.x - d.x * (back0 + 3 * (Dp + 0.4)); cz = P.z - d.z * (back0 + 3 * (Dp + 0.4)); }
  }
  const ry = Math.atan2(d.x, d.z);
  const data = Object.assign({ w: r.word, m: r.model, k: 'model', n, st, sk: kind, free: !!o.free }, modsData(r.mods, n));
  const th = spawnSummoned(data, cx, cz, { ry, space: F.Space.cur });
  // free-cast camera: look at the rows while they fill (the counting show), then back to the fairy
  const cam = F.R.cam, look = cam.mode === 'wand' || cam.mode === 'wandin';
  if (look) { if (cur) cur.looking = true; cam.target.set(cx + d.x * (Dp / 2 + 2.2), F.Player.pos.y + (cam.mode === 'wandin' ? 1 : 0), cz + d.z * (Dp / 2 + 2.2)); cam.distGoal = 16; }
  if (!th) return null;
  const M = th.obj.userData.multi; M.hideAll();
  th.obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(th.obj.matrixWorld).invert();
  const from = (o.from || wandTip()).clone();
  const fromL = from.clone().applyMatrix4(inv);
  F.Player.heading = Math.atan2(cx - P.x, cz - P.z);
  if (F.Player.avatar && F.Player.avatar.userData.play) F.Player.avatar.userData.play('cast', 1.4);
  F.sfx.magic();
  F.FX.burst(from, { n: 30, colors: skinCols(kind), speed: 1.8, up: 1.8, life: 0.8, size: 0.06, gravity: 0.4 });
  const worldOf = i => { const p = L.pos[i].clone(); return p.applyMatrix4(th.obj.matrixWorld); };
  const fly = (i, ms) => {
    const to = L.pos[i];
    return F.T.tween(ms, k => {
      const e = 1 - Math.pow(1 - k, 2);
      tmpP.set(U.lerp(fromL.x, to.x, e), U.lerp(fromL.y, to.y, e) + Math.sin(k * Math.PI) * 1.0, U.lerp(fromL.z, to.z, e));
      M.set(i, tmpP, L.sc * (0.25 + 0.75 * e), k * 6);
    }).then(() => {
      M.place(i, 1); M.shown = Math.max(M.shown, i + 1);
      const wp = worldOf(i);
      F.FX.burst(new V3(wp.x, wp.y + 0.15, wp.z), { n: 5, colors: skinCols(kind), speed: 0.8, up: 1, life: 0.4, size: 0.04 });
    });
  };
  const labels = [];
  const lab = (pos, text, ms) => { if (!F.UI.label) return; const l = F.UI.label(pos, text, { kind: 'num', space: th.space }); labels.push(l); if (ms) F.T.timeout(() => l.remove(), ms); return l; };
  const rowPos = (row, y, x) => new V3(x || 0, y, row * L.sp * RZ).applyMatrix4(th.obj.matrixWorld);
  const rightEnd = 5 * L.sp + L.gap / 2 + 0.75, leftEnd = 5 * L.sp + L.gap / 2 + 0.55;
  const itemH = Math.max(0.35, itemSize(r.model).h * L.sc);
  if (n >= 10) {
    // the full ten arrives in one swoosh
    const ps = [];
    for (let i = 0; i < 10; i++) { ps.push(F.T.sleep(i * 85).then(() => { F.sfx.pling(i * 0.5); return fly(i, 420); })); }
    await Promise.all(ps);
    M.trays[0].material.emissiveIntensity = 0.6; F.FX.burst(rowPos(0, 0.2), { n: 30, colors: skinCols(kind), speed: 2.4, up: 1.6, life: 0.7, size: 0.05 });
    F.sfx.chime();
    lab(rowPos(0, itemH * 0.5, -leftEnd), '10');
    await sayNum(10);
    for (let i = 10; i < n; i++) {
      F.sfx.pling(4 + (i - 10) * 0.7);
      await fly(i, 380);
      if (i === 19) { M.trays[1].material.emissiveIntensity = 0.6; M.trays[1].material.opacity = 0.85; }
      await sayNum(i + 1);
    }
    // the second row's count sits at the RIGHT end of its row (the '10' is at the left of row 1) – never stacked on each other
    if (n > 10 && n < 20) lab(rowPos(1, -itemH * 0.15, rightEnd + 0.2), String(n - 10));
    if (n === 20) lab(rowPos(1, -itemH * 0.15, rightEnd + 0.2), '10');
  } else {
    for (let i = 0; i < n; i++) { F.sfx.pling(i * 0.6); await fly(i, 380); await sayNum(i + 1); }
  }
  // the total, big, and a happy burst
  const tot = lab(rowPos(0, itemH + 0.75), String(n));   // the total floats centred above the first row
  if (tot) tot.el.classList.add('wand-total');
  styleBurst(rowPos(0, 0.6), kind, true);
  F.T.timeout(() => labels.forEach(l => l.remove()), 4200);
  if (look) F.T.timeout(() => {
    if (cur) cur.looking = false;
    if (cam.mode === 'wand' || cam.mode === 'wandin') { cam.distGoal = 15; if (cur && cur.mode === 'free') barFrame(); else { const P2 = F.Player.pos, d2 = camDir(); cam.target.set(P2.x + d2.x * 2.1, P2.y, P2.z + d2.z * 2.1); } }
  }, 2600);
  th.bboxDirty = true;
  if (o.persist !== false) record(th);
  return th;
}

/* =================================================================== public: cast */
async function cast(word, n, o) {
  o = o || {};
  n = Math.max(1, Math.min(20, n | 0 || 1));
  let r = o.res || resolve(word);
  if (r.kind === 'near' || r.kind === 'locked' || r.kind === 'unknown' || r.kind === 'empty') {
    // a direct cast of a known model id that is not in the word list (e.g. task layouts): still allowed
    if (F.VOX.has(word)) r = { kind: 'model', word, model: word };
    else if (r.kind !== 'locked') r = { kind: 'lex', word: String(word || '').toLowerCase() };
  }
  if (!r.word) return [];
  const free = !!o.free;
  const log = wordsLog();
  log.made[r.word] = (log.made[r.word] || 0) + 1;
  if (free) log.spont[r.word] = (log.spont[r.word] || 0) + 1;
  if (r.mods) for (const md of r.mods) { log.made[md.w] = (log.made[md.w] || 0) + 1; if (free) log.spont[md.w] = (log.spont[md.w] || 0) + 1; }
  F.store();
  const th = (n > 1 && r.kind === 'model') ? await castMany(r, n, o) : await castOne(r, o);
  // wand ↔ world: a free cast that fits a nearby character's wish flies to them (food → eat, warm → stop shivering, toy → play).
  // The character is reserved (busy) BEFORE 'cast' is emitted, so LIFE's own cast listener leaves it to us.
  const giveTo = (th && free && n === 1 && r.kind === 'model' && !o.forNpc) ? needyNear(th, r.word) : null;
  if (giveTo) giveTo.busy = true;
  // v5 WP-T: kind / typed / helped (she retyped the near-miss ghost) – Trylleboka credits only what she spelled herself
  F.emit('cast', { word: r.word, n, free, at: th ? { x: th.x, z: th.z } : null, forNpc: o.forNpc || null, thing: th ? th.id : null, mods: r.mods ? r.mods.map(m => m.base) : null,
    kind: r.kind || null, typed: r.typed || null, helped: !!o.helped });
  if (th && !o.silent && n === 1) { if (r.mods) for (const md of r.mods) await sayMod(md.w); await sayWord(r.word); }
  if (giveTo) {
    if (alive(th)) { try { await giveCast(giveTo, r.word, th); } catch (e) { console.error('wand give', e); giveTo.busy = false; } }
    else giveTo.busy = false;
  }
  return th ? [th] : [];
}

/* =================================================================== modifiers: apply «stor / rød / glad / sove …» to a thing */
function modsData(mods, n) {
  const d = {}; if (!mods) return d;
  for (const m of mods) {
    if (m.t === 'col') d.c = m.c;
    else if (m.t === 'size') d.sc = U.clamp((d.sc || 1) * m.k, n > 1 ? 0.5 : 0.3, n > 1 ? 1.35 : 2.6);
    else if (m.t === 'mood') d.md = m.m || null;
  }
  return d;
}
function sayMod(w) { return F.RW.say('wand_mod', { m: w }); }
const alive = t => !!(t && t.obj && t.obj.parent && F.Things.byId(t.id) === t);
// the thing a modifier word changes: the one she picked (picture button), else the last thing she made in THIS bar session – and with
// {view:true} only when she can see it (on screen, not behind the bar or a wall). Natural audit #40: no more «nearest old thing» – an
// old cast (maybe hidden behind the bar) silently took the colour; now «rød» with nothing in sight stays «rød » + «Hva skal det være?»
function modTarget(o) {
  const ok = t => alive(t) && (!o || !o.view || inView(t));
  if (cur && cur.swapT && ok(cur.swapT)) return cur.swapT;
  if (cur && ok(cur.last)) return cur.last;
  return null;
}
// rebuild a summoned thing with new data (same id/spot); colourable models morph cube-by-cube into the new colour
async function rebuild(th, patch, fx) {
  const old = Object.assign({}, th.data), data = Object.assign({}, old, patch);
  const id = th.id, sp = th.space, ry = th.ry, x = th.x, z = th.z, model = old.m || old.w;
  th.busy = true;
  let nu = null;
  if (fx === 'morph' && F.FX.morph && old.k === 'model' && (old.n || 1) === 1 && F.VOX.has(model)) {
    try { nu = await F.FX.morph(th.obj, model, model, makeOpts(data), { ms: 900, fromOpts: makeOpts(old) }); } catch (e) { console.warn('morph', e); }
  }
  F.Things.remove(th);
  const nt = spawnSummoned(data, x, z, { id, ry, space: sp });
  if (nu && nu.parent) nu.parent.remove(nu);
  if (nt) { nt.bboxDirty = true; record(nt); }
  return nt;
}
async function applyMods(th, mods, o) {
  o = o || {};
  let t = th;
  for (const md of mods) {
    if (!alive(t)) break;
    const p = new V3(t.x, t.y + 0.6, t.z), cols = skinCols();
    if (o.from) trail(o.from, p, cols, 450);
    await F.T.sleep(o.from ? 380 : 0);
    if (!o.quiet) sayMod(md.w);
    if (md.t === 'size') t = await applySize(t, md.k);
    else if (md.t === 'col') t = await applyColour(t, md.c);
    else t = await applyMood(t, md.m);
    log1(md.w);
  }
  return t;
}
function log1(w) { const L = wordsLog(); L.made[w] = (L.made[w] || 0) + 1; L.spont[w] = (L.spont[w] || 0) + 1; F.store(); }
const elastic = k => k >= 1 ? 1 : 1 - Math.pow(2, -9 * k) * Math.cos(k * Math.PI * 3.2);
async function applySize(th, k) {
  const d = th.data, multi = (d.n || 1) > 1, o = th.obj;
  const lo = multi ? 0.5 : 0.3, hi = multi ? 1.35 : 2.6;
  const s0 = d.sc || 1, s1 = U.clamp(s0 * k, lo, hi);
  if (Math.abs(s1 - s0) < 0.01) { F.sfx.boing(); await F.FX.wobble(o, 0.12); await F.RW.say(k > 1 ? 'wand_mod_maxbig' : 'wand_mod_maxsmall'); return th; }
  d.sc = s1; th._anim = true; th._hw = null;   // a sleeping thing re-measures how it lies
  F.sfx[k > 1 ? 'grow' : 'whoosh']();
  F.FX.burst(new V3(th.x, th.y + 0.5, th.z), { kind: 'sparkle', n: 22, colors: skinCols(), speed: 1.8, up: 1.8, life: 0.7 });
  if (multi) {
    const M = o.userData.multi;
    await F.T.tween(700, e => { M.kk = s0 + (s1 - s0) * elastic(e); for (let i = 0; i < M.n; i++) M.place(i, 1); });
    M.kk = s1;
  } else {
    const b0 = o.scale.x;
    await F.T.tween(700, e => o.scale.setScalar(Math.max(0.01, b0 * (1 + (s1 / s0 - 1) * elastic(e)))));
    o.scale.setScalar(b0 * s1 / s0);
    th.labelY = (th.labelY || 1.4) * s1 / s0;
  }
  th._anim = false; th.bboxDirty = true; record(th);
  F.RW.say(k > 1 ? 'wand_mod_big' : 'wand_mod_small');
  return th;
}
async function applyColour(th, c) {
  const d = th.data;
  if (d.c === c) { F.FX.wobble(th.obj, 0.1); return th; }
  F.sfx.magic();
  const pos = new V3(th.x, th.y + 0.5, th.z), col = PALC(c);
  F.FX.burst(pos, { n: 30, colors: [col, col, 0xffffff], speed: 2, up: 2, life: 0.8, size: 0.07, gravity: 1.2 });
  let nt;
  if (d.k === 'model' && (d.n || 1) === 1 && colourable(d.m || d.w)) nt = await rebuild(th, { c }, 'morph');
  else {
    // a paint swirl, then the new colour (multi rows re-tint all their instances; letter blocks too)
    await F.T.tween(260, k => th.obj.scale.setScalar(Math.max(0.01, (th.obj.userData.s0 || (th.obj.userData.s0 = th.obj.scale.x)) * (1 - 0.15 * Math.sin(k * Math.PI)))));
    if (th.obj.userData.s0) { th.obj.scale.setScalar(th.obj.userData.s0); th.obj.userData.s0 = null; }
    if ((d.n || 1) > 1 && colourable(d.m || d.w)) nt = await rebuild(th, { c });
    else { d.c = c; tintObj(th.obj, c); record(th); nt = th; }
  }
  if (nt) { F.FX.burst(new V3(nt.x, nt.y + 0.6, nt.z), { kind: 'sparkle', n: 18, colors: [col, 0xffffff], speed: 1.4, up: 1.6 }); F.sfx.chime(); }
  F.RW.say('wand_mod_col');
  return nt || th;
}
async function applyMood(th, m) {
  const d = th.data, o = th.obj;
  // reset any pose from the old mood
  d.md = m || null; th._mt = 0; o.rotation.set(0, th.ry || 0, 0); o.position.set(th.x, th.y, th.z);
  const M = o.userData.multi; if (M) { M.spin = null; M.hop.fill(0); for (let i = 0; i < M.n; i++) M.place(i, 1); }
  record(th);
  const top = new V3(th.x, th.y + (th.labelY || 1.2), th.z);
  if (m === 'glad') { F.FX.burst(top, { kind: 'heart', n: 10 }); F.sfx.squeak(); F.RW.say('wand_mod_glad'); }
  else if (m === 'sove') { F.sfx.tone(260, 0.5, 'sine', 0.06, 0, 180); F.RW.say('wand_mod_sove'); }
  else if (m === 'danse') { const sc = [0, 4, 7, 12, 7, 4, 0]; sc.forEach((s, i) => F.T.timeout(() => F.sfx.piano(F.note(s)), i * 170)); F.RW.say('wand_mod_danse'); }
  else if (m === 'hoppe') { F.sfx.boing(); F.RW.say('wand_mod_hoppe'); }
  else { F.sfx.chime(); F.FX.burst(top, { kind: 'sparkle', n: 12 }); F.RW.say('wand_mod_vaken'); }
  await F.T.sleep(900);
  return th;
}
// moods live on: glad bounces with hearts, hoppe hops, danse sways to music notes, sove lies down with «z z z»
const tmpBox = new THREE.Box3();
function moodTick(th, md, dt, t) {
  const o = th.obj, ph = t + (th.t0 || 0) * 3;
  th._mt = (th._mt || 0) + dt;
  const near = th.space === F.Space.cur && Math.hypot(th.x - F.Player.pos.x, th.z - F.Player.pos.z) < 22;
  const M = o.userData.multi;
  if (M) {
    if (md === 'sove') { if (near && th._mt > 2.4) { th._mt = 0; F.FX.float('z', new V3(th.x, th.y + 0.6, th.z), 'wand-zzz'); } return; }
    if (!M.spin) M.spin = new Float32Array(M.n);
    for (let i = 0; i < M.n; i++) {
      const w = ph * (md === 'hoppe' ? 4 : 5) - i * 0.55;
      M.hop[i] = md === 'danse' ? Math.abs(Math.sin(w)) * 0.12 : Math.max(0, Math.sin(w)) * (md === 'hoppe' ? 0.45 : 0.22);
      M.spin[i] = md === 'danse' ? Math.sin(w * 0.5) * 0.7 : 0;
      M.place(i, 1);
    }
    if (md === 'glad' && near && th._mt > 3) { th._mt = 0; F.FX.burst(new V3(th.x, th.y + 0.5, th.z), { kind: 'heart', n: 3 }); }
    return;
  }
  if (md === 'sove') {
    if (th._hw == null) { const r0 = o.rotation.z; o.rotation.z = 0; o.updateMatrixWorld(true); tmpBox.setFromObject(o); th._hw = Math.max(0.1, (tmpBox.max.x - tmpBox.min.x) / 2); o.rotation.z = r0; }
    o.rotation.z += (1.45 - o.rotation.z) * Math.min(1, dt * 4);
    o.position.y = th.y + th._hw * Math.sin(o.rotation.z) * 0.95;
    if (near && th._mt > 2.2) { th._mt = 0; F.FX.float('z', new V3(th.x, th.y + th._hw * 2 + 0.3, th.z), 'wand-zzz'); }
    return;
  }
  if (md === 'glad') {
    o.position.y = th.y + Math.abs(Math.sin(ph * 4)) * 0.16;
    if (near && th._mt > 3) { th._mt = 0; F.FX.burst(new V3(th.x, th.y + (th.labelY || 1.2), th.z), { kind: 'heart', n: 3 }); }
  } else if (md === 'hoppe') {
    const k = (ph % 1.3) / 1.3;
    o.position.y = th.y + (k < 0.45 ? Math.sin(k / 0.45 * Math.PI) * 0.7 : 0);
  } else if (md === 'danse') {
    o.rotation.y = (th.ry || 0) + Math.sin(ph * 2.6) * 0.7;
    o.rotation.z = Math.sin(ph * 5.2) * 0.12;
    o.position.y = th.y + Math.abs(Math.sin(ph * 5.2)) * 0.1;
    if (near && th._mt > 1.6) { th._mt = 0; F.FX.float(th._note = th._note === '♪' ? '♫' : '♪', new V3(th.x, th.y + (th.labelY || 1.2), th.z), 'wand-note'); }
  }
}

/* =================================================================== wand ↔ world: who near her needs this? */
const NEED_TAG_FB = { sulten: 'spise', tørst: 'drikke', kald: 'varme', trøtt: 'sove', sitte: 'sitte', kjed: 'leke', fin: 'pynt', dyr: 'kjæledyr', sliten: 'sitte', lei: 'leke' };
const NEED_REACT = { sulten: 'eat', tørst: 'drink', kald: 'warm', trøtt: 'sleep', sitte: 'sit', sliten: 'sit', kjed: 'play', lei: 'play', fin: 'wear', dyr: 'cuddle' };
const OLD_WANT = { eat: ['sulten'], drink: ['tørst', 'torst'], warm: ['kald'], cuddle: ['dyr'], wear: ['fin'], sit: ['sitte', 'sliten'], sleep: ['trøtt', 'trott'], play: ['kjed', 'lei'] };
function wishFits(a, e) {
  const w = a.wish; if (!w || !e) return null;
  if (w.kind === 'need' && w.need) {
    const NT = Object.assign({}, NEED_TAG_FB, (F.Quest && F.Quest.NEED_TAG) || {});
    const nt = NT[w.need], tags = e.tags || [];
    if ((nt && tags.includes(nt)) || (OLD_WANT[tagOfEntry(e)] || []).includes(w.need)) return { kind: 'need', need: w.need, tag: NEED_REACT[w.need] || tagOfEntry(e) };
    return null;
  }
  if (w.kind === 'task' && w.model && w.model === (e.model || e.w)) return { kind: 'task', tag: tagOfEntry(e) };
  return null;
}
function needyNear(th, word, r) {
  if (!F.Act || !F.Act.near) return null;
  const e = entry(word); if (!e) return null;
  let list = []; try { list = F.Act.near(th.x, th.z, r || 9, th.space) || []; } catch (err) { return null; }
  const busyNpc = F.Task.current && (F.Task.current.npc || (F.Task.current.ctx && F.Task.current.ctx.npc));
  const c = list.filter(a => a && a.wish && !a.busy && a.kind !== 'animal' && !a.owner && a !== busyNpc)
    .map(a => ({ a, f: wishFits(a, e), d: Math.hypot(a.x - th.x, a.z - th.z) })).filter(x => x.f).sort((p, q) => p.d - q.d)[0];
  if (!c) return null;
  c.a._fit = c.f; return c.a;
}
async function giveCast(a, word, th) {
  const f = a._fit || wishFits(a, entry(word)); a._fit = null;
  if (!f) { a.busy = false; return false; }
  a.busy = true;
  try {
    if (a.face) a.face(th.x, th.z);
    F.FX.burst(new V3(a.x, (a.th && a.th.obj ? a.th.obj.position.y : th.y) + 2.1, a.z), { kind: 'sparkle', n: 14, colors: [0xfff2a8, 0xffffff] });
    F.sfx.pling(7);
    await F.RW.say('wand_wish_give');
    await reactTo(a, word, th, { tag: f.tag });   // its 'wandGive' is ignored by LIFE while the character is busy
  } finally { a.busy = false; }
  // the wish is fulfilled: LIFE's API (coins, thanks, the wish returns later); fallbacks when LIFE has no such API
  let done = false;
  if (f.kind === 'need' && F.Quest && F.Quest.fulfil) { try { done = await F.Quest.fulfil(a, word, { reacted: true }); } catch (e) { console.warn(e); } }
  if (!done && a.wish && (f.kind === 'task' || f.kind === 'need')) {
    a.clearWish(); a.shiver = false;
    if (F.Eco && F.Eco.add) { try { F.Eco.add(3, { from: a, reason: 'wish' }); } catch (e) {} }
    F.sfx.chime();
  }
  F.emit('wishFulfilled', { npc: a.id, word, need: f.need || null, kind: f.kind, by: 'wand' });
  return true;
}

/* =================================================================== tapping a summoned thing */
function npcVoice(npc) { if (!npc) return ''; return npc.voice || (npc.actor && npc.actor.voice) || (npc.data && npc.data.voice) || ''; }
function actorOf(npc) {
  if (!npc) return null;
  if (npc.walkTo || npc.setWish) return npc;
  if (npc.actor) return npc.actor;
  return (F.Act && F.Act.byId && (F.Act.byId(npc.id) || (npc.data && F.Act.byId(npc.data.actor)))) || null;
}
async function pressSummoned(th) {
  const d = th.data, e = entry(d.w), tag = d.k === 'lex' ? 'blocks' : tagOfEntry(e);
  th.reactedVisibly = true;
  if (d.md === 'sove') { await applyMood(th, null); return; }   // tapping a sleeping thing wakes it up
  F.FX.pop(th.obj);
  th._anim = true;
  try {
    if (d.k === 'lex' || !th.obj.userData || th.obj.userData.blocks) { await tumbleBlocks(th); return; }
    if ((d.n || 1) > 1) { await recount(th); return; }
    wordLabel(th, 2400);
    const npc = needyNear(th, d.w, 6);
    if (npc) { await giveCast(npc, d.w, th); return; }
    sayWord(d.w);
    await localReact(th, tag);
  } finally { th._anim = false; }
  th.reactedVisibly = true;
}
async function localReact(th, tag) {
  const o = th.obj, p = new V3(th.x, th.y + 0.4, th.z), kind = fairyKind(), cols = skinCols(kind);
  const say = id => F.Speech.busy() ? F.Speech.idle().then(() => F.RW.say(id)) : F.RW.say(id);
  switch (tag) {
    case 'eat': case 'drink': {
      th.data.b = (th.data.b || 0) + 1;
      F.FX.burst(p, { n: 14, colors: [0xfff3dc, 0xf3dfae, 0xffffff], speed: 1.4, up: 1.6, life: 0.6, size: 0.05 });
      F.sfx.pop(); say(tag === 'eat' ? 'wand_react_eat' : 'wand_react_drink');
      if (th.data.b >= 3) { await F.T.sleep(300); unrecord(th); await poofAway(th); return; }
      const s = o.scale.x;
      await F.T.tween(260, k => o.scale.setScalar(s * (1 - 0.18 * k)));
      th.bboxDirty = true; record(th); break;
    }
    case 'cuddle': {
      say('wand_react_cuddle'); F.sfx.squeak();
      for (let i = 0; i < 2; i++) await F.T.tween(300, k => { o.position.y = th.y + Math.sin(k * Math.PI) * 0.4; });
      F.FX.burst(new V3(th.x, th.y + 0.9, th.z), { n: 12, colors: [0xff7fb0, 0xff5d8f, 0xffb3d1], speed: 0.8, up: 1.6, life: 1, size: 0.07, gravity: -0.4 });
      break;
    }
    case 'play': case 'ride': {
      say(tag === 'play' ? 'wand_react_play' : 'wand_react_ride'); F.sfx.boing();
      const a = F.rand() * Math.PI * 2, R = 1.6;
      let nx = th.x + Math.cos(a) * R, nz = th.z + Math.sin(a) * R;
      if (th.space === 'out' && F.W.water && F.W.water(nx, nz)) { nx = th.x - Math.cos(a) * R; nz = th.z - Math.sin(a) * R; }
      const x0 = th.x, z0 = th.z, y0 = th.y, y1 = hAt(nx, nz, th.space);
      await F.T.tween(700, k => { o.position.set(U.lerp(x0, nx, k), U.lerp(y0, y1, k) + Math.sin(k * Math.PI) * 1.1, U.lerp(z0, nz, k)); o.rotation.x = k * Math.PI * 2; });
      o.rotation.x = 0; th.x = nx; th.z = nz; th.y = y1; th.bboxDirty = true; F.sfx.thud(); record(th); break;
    }
    case 'sit': case 'sleep': {
      say(tag === 'sit' ? 'wand_react_sit' : 'wand_react_sleep');
      F.FX.burst(new V3(th.x, th.y + 0.8, th.z), { n: 10, colors: [0xffffff, 0xc6a8ff], speed: 0.6, up: 1, life: 1, size: 0.06, gravity: -0.3 });
      await F.FX.wobble(o, 0.08); break;
    }
    case 'smell': case 'grow': {
      say(tag === 'smell' ? 'wand_react_smell' : 'wand_react_grow'); F.sfx.grow();
      const s = o.scale.x; await F.T.tween(500, k => o.scale.setScalar(s * (1 + Math.sin(k * Math.PI) * 0.25)));
      F.FX.burst(new V3(th.x, th.y + 0.7, th.z), { n: 16, colors: [0xf6a9c8, 0xffffff, 0xfff0a0], speed: 1, up: 1.4, life: 1.3, size: 0.06, gravity: 0.6 });
      break;
    }
    case 'warm': case 'light': {
      say(tag === 'warm' ? 'wand_react_warm' : 'wand_react_light'); F.sfx.chime();
      for (let i = 0; i < 3; i++) F.FX.burst(new V3(th.x, th.y + 0.6 + i * 0.3, th.z), { n: 8, colors: tag === 'warm' ? [0xff9a3c, 0xffd84a, 0xffc8a8] : [0xfff6b0, 0xffffff], speed: 0.8, up: 1.2, life: 0.9, size: 0.06, gravity: -0.2 });
      await F.FX.wobble(o, 0.1); break;
    }
    case 'wear': {
      say('wand_react_wear'); F.sfx.sparkle();
      // hop onto the fairy's head for a few seconds
      const av = F.Player.avatar, head = av && av.userData.anchors && av.userData.anchors.head;
      if (head) {
        const copy = F.VOX.make(th.data.m || th.data.w, th.data.st ? { style: th.data.st } : {}); copy.scale.setScalar(0.6 / Math.max(0.3, (new THREE.Box3().setFromObject(copy)).getSize(new V3()).x));
        head.add(copy); F.T.timeout(() => { head.remove(copy); }, 6000);
      }
      await F.FX.wobble(o, 0.15); break;
    }
    case 'fly': {
      say('wand_react_fly'); F.sfx.whoosh();
      await F.T.tween(1400, k => { o.position.set(th.x + Math.sin(k * Math.PI * 2) * 1.2, th.y + Math.sin(k * Math.PI) * 2.2, th.z + Math.cos(k * Math.PI * 2) * 1.2 - 1.2 + (1 - Math.cos(k * Math.PI * 2)) * 0); o.rotation.y = th.ry + k * Math.PI * 2; });
      o.position.set(th.x, th.y, th.z); o.rotation.y = th.ry; break;
    }
    case 'music': {
      say('wand_react_music');
      const sc = [0, 2, 4, 7, 9, 12];
      for (let i = 0; i < 5; i++) { F.sfx.piano(F.note(sc[(i * 3 + 1) % sc.length])); await F.T.tween(200, k => { o.rotation.z = Math.sin(k * Math.PI) * 0.12 * (i % 2 ? 1 : -1); }); }
      o.rotation.z = 0; break;
    }
    default: {
      if (F.rand() < 0.5) say('wand_react_none');
      F.sfx.sparkle();
      await F.T.tween(600, k => { o.rotation.y = th.ry + k * Math.PI * 2; });
      o.rotation.y = th.ry;
      F.FX.burst(p, { n: 14, colors: cols, speed: 1, up: 1.4, life: 0.7, size: 0.05, gravity: 0.6 });
    }
  }
}
async function recount(th) {
  const M = th.obj.userData.multi; if (!M) return;
  const n = M.n, kind = fairyKind();
  const hopOne = async (i, h) => { await F.T.tween(220, k => { M.hop[i] = Math.sin(k * Math.PI) * (h || 0.35); M.place(i, 1); }); M.hop[i] = 0; M.place(i, 1); };
  if (n >= 10) {
    const ps = []; for (let i = 0; i < 10; i++) ps.push(hopOne(i, 0.3));
    M.trays[0].material.emissiveIntensity = 0.8; await Promise.all(ps); M.trays[0].material.emissiveIntensity = 0.6;
    await sayNum(10);
    for (let i = 10; i < n; i++) { F.sfx.pling(4 + (i - 10) * 0.7); await hopOne(i, 0.45); await sayNum(i + 1); }
  } else {
    for (let i = 0; i < n; i++) { F.sfx.pling(i * 0.6); await hopOne(i, 0.4); await sayNum(i + 1); }
  }
  F.FX.burst(new V3(th.x, th.y + 0.6, th.z), { n: 18, colors: skinCols(kind), speed: 1.4, up: 1.6, life: 0.7, size: 0.05 });
  th.reactedVisibly = true;
}
async function tumbleBlocks(th) {
  const B = th.obj.userData.blocks || []; if (!B.length) return;
  th.reactedVisibly = true;
  if (!th.data.down) {
    // knock them over: each block tumbles away
    th.data.down = 1; F.sfx.thud(); F.sfx.boing();
    await Promise.all(B.map((b, i) => {
      const a = (i - (B.length - 1) / 2) * 0.5 + (F.rand() - .5) * 0.6, dist = 0.5 + F.rand() * 0.8;
      const h = b.userData.home, tx = h.x + Math.sin(a) * dist, tz = h.z + Math.cos(a) * dist * 0.8 + 0.3;
      const rx = (F.rand() < .5 ? 1 : -1) * Math.PI / 2, rz = (F.rand() - .5) * 1.2;
      b.userData.down = { x: tx, z: tz, rx, rz };
      return F.T.tween(520 + i * 60, k => { b.position.set(U.lerp(h.x, tx, k), h.y + Math.sin(k * Math.PI) * 0.5, U.lerp(h.z, tz, k)); b.rotation.set(rx * k, 0, rz * k); });
    }));
  } else {
    // hop back into the word, in order, sounding each sound unit (lydering, never the whole word first; silent letters stay silent)
    th.data.down = 0;
    for (const u of soundUnits(th.data.w)) {
      for (let i = u.i0; i < u.i0 + u.n && i < B.length; i++) {
        const b = B[i], h = b.userData.home, dn = b.userData.down || { x: h.x, z: h.z, rx: 0, rz: 0 };
        await F.T.tween(260, k => { b.position.set(U.lerp(dn.x, h.x, k), h.y + Math.sin(k * Math.PI) * 0.7, U.lerp(dn.z, h.z, k)); b.rotation.set(dn.rx * (1 - k), 0, dn.rz * (1 - k)); });
        F.sfx.pling(i); F.FX.pop(b);
      }
      await playUnit(u);
    }
    wordLabel(th, 2400);
    sayWord(th.data.w);
  }
}
function tickSummoned(th, dt, t) {
  if (th.data.md && !th._anim && !th.busy && th.obj.visible) moodTick(th, th.data.md, dt, t);
  // tiny idle life: animals breathe, everything else is still (things are real, not floating icons)
  if (th.data.k !== 'model' || (th.data.n || 1) > 1) return;
  const tag = th._tag || (th._tag = tagOfEntry(entry(th.data.w)));
  if (tag === 'cuddle' && !th.obj.userData._popping && !th._anim) th.obj.scale.y = th.obj.scale.x * (1 + Math.sin(t * 2.4 + th.t0) * 0.025);
}

/* =================================================================== NPC receives a thing (LIFE calls this) */
async function reactTo(npc, word, item, o) {
  o = o || {};
  const e = entry(word), own = tagOfEntry(e), tag = o.tag || own, voice = npcVoice(npc), actor = actorOf(npc);
  const nobj = npc.obj || (npc.th && npc.th.obj) || (actor && (actor.obj || (actor.th && actor.th.obj))) || null, np = new V3();
  if (nobj) nobj.getWorldPosition(np); else np.set(npc.x || 0, npc.y || 0, npc.z || 0);
  const gesture = (g, sec) => { try { if (actor && actor.gesture) actor.gesture(g, sec); else if (nobj && nobj.userData && nobj.userData.play) nobj.userData.play(g, sec); } catch (e2) {} };
  // these stay in the world next to the NPC (a fire warms, a bed is slept in); everything else is taken / used by the NPC
  const KEEP = { sit: 1, sleep: 1, light: 1, none: 1, warm: 1, smell: 1, grow: 1 };
  const viaActor = !!(actor && actor.react);
  // a warm thing that is not a wearable (sol, peis, teppe …) just warms them – nothing goes on their head
  const useId = (tag === 'warm' && own !== 'wear') || (tag === 'sleep' && own !== 'sleep') ? null : ((item && item.data && item.data.m) || word);
  if (item && item.obj) {
    const o = item.obj, x0 = o.position.x, y0 = o.position.y, z0 = o.position.z;
    item._anim = true;
    const take = !KEEP[own] && !(tag === 'warm' && own !== 'wear');
    const to = take ? new V3(np.x, np.y + (tag === 'wear' ? 1.7 : 1.15), np.z) : new V3(np.x + 0.8, hAt(np.x + 0.8, np.z + 0.5, item.space), np.z + 0.5);
    await F.T.tween(650, k => { o.position.set(U.lerp(x0, to.x, k), U.lerp(y0, to.y, k) + Math.sin(k * Math.PI) * 0.8, U.lerp(z0, to.z, k)); });
    if (take) {
      if (!viaActor) {
        if (tag === 'wear') { const head = nobj && nobj.userData.anchors && nobj.userData.anchors.head; if (head) { const c = F.VOX.make(item.data.m || word, {}); head.add(c); } }
        else F.FX.burst(to, { n: 16, colors: [0xfff3dc, 0xf3dfae, 0xffffff], speed: 1.2, up: 1.2, life: 0.6, size: 0.05 });
      }
      unrecord(item);
      await F.T.tween(200, k => o.scale.setScalar(Math.max(0.001, 1 - k)));
      F.Things.remove(item);
    } else { item.x = to.x; item.z = to.z; item.y = to.y; o.position.set(item.x, item.y, item.z); item.bboxDirty = true; item._anim = false; record(item); }
  }
  if (viaActor) {
    // LIFE's actor really uses it: eats it, wears it (hat towers!), adopts the pet, plays …
    try { await actor.react(tag, useId); } catch (e2) { console.warn(e2); }
  } else {
    gesture(tag === 'wear' ? 'dance' : tag === 'cuddle' ? 'hop' : 'cheer', 1.6);
    F.FX.burst(new V3(np.x, np.y + 1.9, np.z), { n: 14, colors: [0xff7fb0, 0xff5d8f, 0xffd84a], speed: 0.8, up: 1.6, life: 1, size: 0.07, gravity: -0.3 });
    const line = { eat: 'wand_npc_eat', drink: 'wand_npc_eat', cuddle: 'wand_npc_cuddle', wear: 'wand_npc_wear', warm: 'wand_npc_warm' }[tag] || 'wand_npc_thanks';
    await F.RW.say(line, null, voice);
  }
  F.emit('wandGive', { npc: npc.id || null, word, tag });
  return tag;
}

/* =================================================================== Bokstavbytte: rebuild a thing as another word */
async function swap(th, newWord) {
  if (!th || th.type !== 'summoned') return false;
  const r = resolve(newWord);
  if (r.kind !== 'model' && r.kind !== 'lex') return false;
  const old = th.data, pos = new V3(th.x, th.y, th.z);
  // real cube morph (CORE F.FX.morph): the old thing's own cubes fly into the new word's voxels
  if (F.FX.morph && old.k !== 'lex' && r.kind === 'model' && F.VOX.has(old.m || old.w)) {
    const id = th.id, sp = th.space, ry = th.ry, free = old.free;
    const st = old.st ? { style: old.st } : {};
    th.busy = true;
    let nu = null;
    try { nu = await F.FX.morph(th.obj, old.m || old.w, r.model, st, { ms: 1300 }); } catch (e) { console.warn('morph', e); }
    const data = { w: r.word, m: r.model, k: 'model', n: 1, st: old.st, sk: old.sk, free };
    F.Things.remove(th);
    const nt = spawnSummoned(data, pos.x, pos.z, { id, ry, space: sp });
    if (nu && nu.parent) nu.parent.remove(nu);
    if (!nt) return false;
    styleBurst(new V3(pos.x, pos.y + 0.5, pos.z), fairyKind());
    record(nt); wordLabel(nt, 2600);
    const log = wordsLog(); log.made[r.word] = (log.made[r.word] || 0) + 1; F.store();
    F.emit('cast', { word: r.word, n: 1, free: true, swap: old.w, at: { x: pos.x, z: pos.z } });
    await sayWord(r.word);
    return true;
  }
  const oldPts = old.k !== 'lex' && F.VOX.has(old.m || old.w) ? F.VOX.points(old.m || old.w, old.st ? { style: old.st } : {}, 160) : null;
  // the old thing falls apart into its own coloured cubes …
  if (oldPts) F.FX.burst(new V3(pos.x, pos.y + 0.4, pos.z), { n: 60, colors: [...new Set(oldPts.map(p => p[3]))].slice(0, 6), speed: 1.4, up: 2.4, life: 0.7, size: 0.07, gravity: 3 });
  F.sfx.whoosh();
  await F.T.tween(300, k => th.obj.scale.setScalar(Math.max(0.001, 1 - k)));
  const id = th.id, sp = th.space, ry = th.ry, free = old.free;
  F.Things.remove(th);
  // … and the new word assembles in the same spot
  const data = { w: r.word, m: r.kind === 'model' ? r.model : null, k: r.kind === 'model' ? 'model' : 'lex', n: 1, st: old.st, sk: old.sk, free };
  const nt = spawnSummoned(data, pos.x, pos.z, { id, ry, space: sp });
  if (!nt) return false;
  if (data.k === 'model') {
    nt.obj.visible = false;
    await F.FX.assemble(data.m, data.st ? { style: data.st } : {}, nt.obj, pos, { from: new V3(pos.x, pos.y + 1.2, pos.z), ms: 900, max: 260 });
  } else await dropBlocks(nt, pos);
  styleBurst(new V3(pos.x, pos.y + 0.5, pos.z), fairyKind());
  record(nt); wordLabel(nt, 2600);
  const log = wordsLog(); log.made[r.word] = (log.made[r.word] || 0) + 1; F.store();
  F.emit('cast', { word: r.word, n: 1, free: true, swap: old.w, at: { x: pos.x, z: pos.z } });
  await sayWord(r.word);
  return true;
}

/* =================================================================== the spell bar (speller) */
const KB = ['1234567890', 'qwertyuiopå', 'asdfghjkløæ', 'zxcvbnm'];
const isLetter = ch => /^[a-zæøå]$/.test(ch);
/* clarity §3.10 (12.10., walk 112: a tap at the bottom centre meant for the ground opened Staven, and her next tap typed «b»): a tap on a
   spell bar counts only when it was PRESSED on the bar at least 400 ms after the bar appeared, and – for 1.2 s – not on the very spot of
   the tap that opened it (that is the same tap again, not a letter she chose). Keys on a real keyboard are never dropped (she means
   them), and neither are clicks with no press behind them (keyboard activation, tests). Wall clock or game clock, whichever ran longer. */
const TAP_GUARD = 400, SPOT_GUARD = 1200, SPOT_R = 48;
let lastUp = null;
addEventListener('pointerup', e => { lastUp = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
function tapGuard(root) {
  const born = performance.now(), bornG = F.T.now, openPt = lastUp && born - lastUp.t < 500 ? { x: lastUp.x, y: lastUp.y } : null;
  const age = () => Math.max(performance.now() - born, (F.T.now - bornG) * 1000);
  let pressOk = false, pressWhy = '';
  root.addEventListener('pointerdown', e => {
    const a = age(), spot = !!(openPt && a < SPOT_GUARD && Math.hypot(e.clientX - openPt.x, e.clientY - openPt.y) < SPOT_R);
    pressOk = a >= TAP_GUARD && !spot; pressWhy = pressOk ? '' : (a < TAP_GUARD ? 'early' : 'spot');
  }, true);
  root.addEventListener('click', e => {
    if (!e.isTrusted || !(e.detail > 0)) return;
    const ok = pressOk; pressOk = false;
    if (ok) return;
    e.stopPropagation(); e.preventDefault();
    const k = e.target && e.target.closest ? e.target.closest('[data-ch]') : null;
    F.emit('wandTapDropped', { why: pressWhy || 'nopress', ch: k ? k.dataset.ch : null, ms: Math.round(age()) });
  }, true);
}
function speller(cfg) {
  cfg = Object.assign({ mode: 'free', slots: 0, given: null, tiles: null, ghost: null, num: false, maxLen: 10, autoSubmit: false, picture: null, skin: fairyKind() }, cfg || {});
  const UI = F.UI, el = (t, c, h) => UI.el(t, c, h);
  const root = el('div', 'wand-bar skin-' + cfg.skin + ' mode-' + cfg.mode + (cfg.tiles ? ' has-tiles' : ' has-keys'));
  tapGuard(root);
  if (cfg.queue) root.style.pointerEvents = 'auto';   // .wand-bar.locked drops taps; the free bar keeps them (see queue below)
  const top = el('div', 'wb-top'); root.appendChild(top);
  const fixed = cfg.slots > 0;
  const slots = fixed ? Array.from({ length: cfg.slots }, (_, i) => ({ ch: (cfg.given && cfg.given[i]) || null, given: !!(cfg.given && cfg.given[i]), tile: null })) : [];
  let num = '', ghost = cfg.ghost ? [...cfg.ghost] : [], ghostSol = false, locked = false, order = [], built = false;
  // cfg.queue (the free bar): no letter she types right after a word is lost (verifier 11.10: «rød» Enter then «ball» lost its b).
  // While a word is handled, keys, rub-outs and Enter are kept in order; once the word has flown into the wand (soften) the letters
  // go straight into the bar again and only Enter waits; when the word is done (unlock) what waited is replayed in order.
  // The bar stays tappable meanwhile (a tap on a key is kept like a key press).
  const queue = cfg.queue ? [] : null;
  let soft = false;
  const waits = () => locked && !(soft && queue && !queue.length);
  const hold = (op, a) => {
    if (!queue) return;
    if (op === 'submit' && queue.length && queue[queue.length - 1][0] === 'submit') return;   // Enter Enter Enter = one Enter
    if (queue.length < 24) queue.push([op, a]);
  };
  function drain() {
    if (!queue || !queue.length) return;
    // replayed in order; a replayed Enter that starts a new word locks the bar again and the rest waits in the queue once more;
    // an Enter on an empty bar (she pressed it twice for one word) is dropped quietly
    for (const [op, a] of queue.splice(0)) {
      if (op === 'key') api.key(a); else if (op === 'back') api.backspace();
      else if (locked || letters() || num) api.submit();
    }
  }
  function release() {
    const was = locked;
    locked = false; soft = false; root.classList.remove('locked');
    if (!queue) return;
    // letters she typed while the word was finishing: the bar's preview (and the end of a reveal) catch up now
    if (was && built && cfg.onChange && (letters() || num)) cfg.onChange(letters(), num ? +num : null);
    drain();
  }
  // picture of the wish (writing tasks): tap = hear the word again
  let pic = null;
  if (cfg.picture) {
    pic = el('button', 'wb-pic');
    pic.appendChild(F.Thumb.img(cfg.picture, {}, { size: 160 }));
    pic.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); if (cfg.onPicture) cfg.onPicture(); });
    top.appendChild(pic);
  }
  let numEl = null;
  if (cfg.num) { numEl = el('div', 'wb-num'); numEl.addEventListener('click', e => { e.stopPropagation(); }); top.appendChild(numEl); }
  const slotRow = el('div', 'wb-slots'); top.appendChild(slotRow);
  const side = el('div', 'wb-side'); top.appendChild(side);
  const back = UI.btn('', () => api.backspace(), { cls: 'wb-back' }); back.innerHTML = '<span class="wb-back-ico"></span>'; back.title = 'Visk ut';
  const go = el('button', 'wb-go'); go.innerHTML = '<span class="wb-star"></span><span class="wb-prev"></span>';
  go.addEventListener('click', e => { e.stopPropagation(); api.submit(); });
  side.appendChild(back); if (!cfg.autoSubmit || cfg.mode === 'free') side.appendChild(go);
  // bank: tiles or keyboard
  const bank = el('div', 'wb-bank'); root.appendChild(bank);
  let tiles = null;
  if (cfg.tiles) {
    tiles = cfg.tiles.map((ch, i) => {
      const t = el('button', 'wb-tile'); t.textContent = UI.caseText(ch); t.dataset.ch = ch;
      t.addEventListener('click', e => { e.stopPropagation(); api.tapTile(i); });
      bank.appendChild(t); return { ch, used: false, el: t };
    });
  } else {
    KB.forEach((row, ri) => {
      if (ri === 0 && !cfg.num) return;
      const r = el('div', 'wb-krow' + (ri === 0 ? ' digits' : ''));
      for (const ch of row) {
        const k = el('button', 'wb-key' + (ri === 0 ? ' dig' : '')); k.textContent = ri === 0 ? ch : UI.caseText(ch); k.dataset.ch = ch;
        k.addEventListener('click', e => { e.stopPropagation(); api.key(ch); k.classList.remove('hit'); void k.offsetWidth; k.classList.add('hit'); });
        r.appendChild(k);
      }
      if (ri === 3 && cfg.space) {   // free mode: a wide space bar for «stor rød kake»
        const k = el('button', 'wb-key wb-space'); k.dataset.ch = ' '; k.title = 'Mellomrom';
        k.addEventListener('click', e => { e.stopPropagation(); api.key(' '); k.classList.remove('hit'); void k.offsetWidth; k.classList.add('hit'); });
        r.appendChild(k);
      }
      bank.appendChild(r);
    });
  }
  function letters() { return slots.map(s => s.ch || '').join(''); }
  function render() {
    slotRow.innerHTML = '';
    const nShow = fixed ? slots.length : Math.max(3, slots.length + (slots.length < cfg.maxLen ? 1 : 0), ghost.length);
    const hole = slots.findIndex(s => !s.ch);
    const nextEmpty = fixed ? hole : (hole >= 0 ? hole : slots.length);
    for (let i = 0; i < nShow; i++) {
      const s = slots[i];
      const d = el('div', 'wb-slot');
      if (s && s.ch === ' ') { d.classList.add('sp', 'full'); }
      else if (s && s.ch) { d.textContent = UI.caseText(s.ch); d.classList.add('full'); if (s.given) d.classList.add('given'); if (s.fresh) { d.classList.add('pop'); s.fresh = false; } if (s.spark) { d.classList.add('spark'); s.spark = false; } }
      else {
        if (ghost[i]) { d.classList.add('ghost'); if (ghostSol) d.classList.add('gsol'); d.dataset.g = UI.caseText(ghost[i]); }
        if (i === nextEmpty) d.classList.add('caret');
        if (!fixed && i > slots.length) d.classList.add('dim');
      }
      if (s && s.glow) d.classList.add('glowing');
      if (s && s.wrong) d.classList.add('wrongslot');
      if (!fixed && ghost[i] === ' ' && !(s && s.ch)) { d.classList.add('sp'); d.classList.remove('ghost', 'caret'); }
      d.addEventListener('click', e => { e.stopPropagation(); if ((!s || !s.ch) && ghost[i] && ghost[i] !== ' ') { api.pulseGhost(i); sayUnitAt(ghost.join(''), i); return; } api.tapSlot(i); });
      slotRow.appendChild(d);
    }
    slotRow.classList.toggle('many', nShow > 9);
    slotRow.classList.toggle('lots', nShow > 12);
    if (numEl) { numEl.textContent = num; numEl.classList.toggle('full', !!num); }
    const full = fixed ? slots.every(s => s.ch) : slots.some(s => s.ch);
    go.classList.toggle('can', full || (!fixed && !!num));
    if (cfg.onChange && built) cfg.onChange(letters(), num ? +num : null);
  }
  function place(ch, tileI) {
    if (fixed) {
      const i = slots.findIndex(s => !s.ch); if (i < 0) return false;
      slots[i].ch = ch; slots[i].tile = tileI != null ? tileI : null; slots[i].fresh = true; order.push(['s', i]);
      F.sfx.pling(Math.min(8, i));
      // tile scaffolding: a letter in its right place sparkles (s0/s1 only – the keyboard stays neutral)
      if (cfg.isRight && cfg.isRight(i, ch)) { slots[i].spark = true; F.T.timeout(() => F.sfx.pling(10 + Math.min(6, i)), 90); }
    } else {
      const hole = slots.findIndex(s => !s.ch);
      if (hole < 0 && slots.length >= cfg.maxLen) { shake(slotRow); return false; }
      if (hole >= 0) { slots[hole].ch = ch; slots[hole].fresh = true; order.push(['s', hole]); F.sfx.pling(Math.min(8, hole)); }
      else { slots.push({ ch, fresh: true }); order.push(['s', slots.length - 1]); F.sfx.pling(Math.min(8, slots.length - 1)); }
    }
    if (cfg.onLetter) cfg.onLetter(ch);
    render();
    if (fixed && cfg.autoSubmit && slots.every(s => s.ch)) F.T.timeout(() => { if (slots.every(s => s.ch)) api.submit(); }, 380);
    return true;
  }
  function shake(e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  const api = {
    el: root, cfg,
    text: letters,
    num: () => (num ? +num : null),
    key(ch) {
      if (waits()) { hold('key', ch); return; }
      if (/^\d$/.test(ch)) {
        if (!cfg.num) return;
        if (num.length >= 2 || (num === '0')) { shake(numEl); return; }
        num += ch; order.push(['n']); F.sfx.pling(9); render(); if (numEl) { numEl.classList.remove('pop'); void numEl.offsetWidth; numEl.classList.add('pop'); }
        return;
      }
      if (ch === ' ') {
        if (!cfg.space || fixed) return;
        const t = letters();
        if (!t || t.endsWith(' ')) { shake(slotRow); return; }
        place(' '); return;
      }
      if (!isLetter(ch)) return;
      if (tiles) {   // physical keyboard while tiles are shown: pick a matching free tile
        const i = tiles.findIndex(t => !t.used && t.ch === ch);
        if (i >= 0) api.tapTile(i); else shake(bank);
        return;
      }
      place(ch);
    },
    tapTile(i) {
      if (locked) return;
      const t = tiles[i]; if (!t || t.used) return;
      if (place(t.ch, i)) { t.used = true; t.el.classList.add('used'); }
    },
    tapSlot(i) {
      if (waits()) return;
      const s = slots[i]; if (!s || !s.ch || s.given) return;
      if (fixed) {
        if (s.tile != null && tiles) { tiles[s.tile].used = false; tiles[s.tile].el.classList.remove('used'); }
        s.ch = null; s.tile = null; s.wrong = false;
      } else if (i === slots.length - 1) { slots.pop(); while (slots.length && !slots[slots.length - 1].ch) slots.pop(); } else { s.ch = null; }
      F.sfx.click(); render();
    },
    backspace() {
      if (waits()) { hold('back'); return; }
      for (let k = order.length - 1; k >= 0; k--) {
        const o = order[k]; order.splice(k, 1);
        if (o[0] === 'n') { if (num) { num = num.slice(0, -1); render(); return; } continue; }
        if (fixed) { const s = slots[o[1]]; if (s && s.ch && !s.given) { api.tapSlot(o[1]); return; } }
        else if (slots[o[1]] && slots[o[1]].ch) { api.tapSlot(o[1]); return; }
      }
      if (fixed) { for (let i = slots.length - 1; i >= 0; i--) if (slots[i].ch && !slots[i].given) { api.tapSlot(i); return; } }
      if (!fixed && slots.length) { slots.pop(); while (slots.length && !slots[slots.length - 1].ch) slots.pop(); render(); }
      else if (num) { num = num.slice(0, -1); render(); }
    },
    submit() {
      if (locked) { hold('submit'); return; }
      if (fixed && !slots.every(s => s.ch)) { slotRow.querySelectorAll('.wb-slot:not(.full)').forEach(shake); F.sfx.bad(); return; }
      if (!fixed && !slots.length && !num) { shake(slotRow); return; }
      if (cfg.onSubmit) cfg.onSubmit(letters(), num ? +num : null);
    },
    clear(keepNum) {
      if (fixed) slots.forEach(s => { if (!s.given) { s.ch = null; s.tile = null; s.wrong = false; } });
      else slots.length = 0;
      if (tiles) tiles.forEach(t => { t.used = false; t.el.classList.remove('used'); });
      if (!keepNum) num = '';
      order = []; render();
    },
    setGhost(w, sol) { ghost = w ? [...w] : []; ghostSol = !!sol; render(); },
    ghostAt(i, ch, sol) { ghost[i] = ch || ''; if (sol) ghostSol = true; render(); },
    slotsInfo: () => slots.map(s => ({ ch: s.ch, given: !!s.given })),
    prefill(word) { if (fixed) slots.forEach((s, i) => { s.ch = word[i] || null; s.tile = null; s.given = false; }); else { slots.length = 0; [...word].forEach(ch => slots.push({ ch, fresh: false })); } order = []; render(); },
    setReady(modelId, opts, cls) {
      const prev = go.querySelector('.wb-prev');
      go.classList.toggle('modp', !!(modelId && cls === 'mod'));
      if (modelId) { const key = modelId + JSON.stringify(opts || {}); go.classList.add('ready'); if (prev.dataset.m !== key) { prev.dataset.m = key; prev.style.backgroundImage = 'url(' + F.Thumb.url(modelId, opts || {}, { size: 128 }) + ')'; } }
      else { go.classList.remove('ready'); prev.dataset.m = ''; prev.style.backgroundImage = ''; }
    },
    pulseGhost(i) { const e = slotRow.children[i]; if (!e) return; e.classList.remove('gpulse'); void e.offsetWidth; e.classList.add('gpulse'); },
    lock(ms) { locked = true; soft = false; root.classList.add('locked'); const done = () => release(); if (ms) F.T.timeout(done, ms); return done; },
    unlock() { release(); },
    // (cfg.queue) the word in hand has flown into the wand and the bar is empty: letters go straight in again (the ones that waited
    // land now, up to an Enter – what came after that Enter waits for this word); Enter still waits until unlock
    soften() {
      if (!queue || !locked || soft) return;
      soft = true; root.classList.remove('locked');
      const k = queue.findIndex(q => q[0] === 'submit');
      const pre = queue.splice(0, k < 0 ? queue.length : k), rest = queue.splice(0);
      for (const [op, a] of pre) { if (op === 'key') api.key(a); else api.backspace(); }
      queue.push(...rest);
    },
    isLocked: () => locked,
    dropQueue() { if (queue) queue.length = 0; },   // the bar closes: what waited is not replayed into a closed bar
    flash(kind) { root.classList.remove('ok', 'bad'); void root.offsetWidth; root.classList.add(kind); if (kind === 'bad') shake(slotRow); },
    fillWord(v) {
      v = String(v || '');
      if (fixed) {
        slots.forEach((s, i) => { if (s.given) return; if (s.tile != null && tiles) { tiles[s.tile].used = false; tiles[s.tile].el.classList.remove('used'); } s.ch = null; s.tile = null; s.wrong = false; });
        slots.forEach((s, i) => { if (s.given || !v[i]) return; s.ch = v[i]; if (tiles) { const j = tiles.findIndex(t => !t.used && t.ch === v[i]); if (j >= 0) { tiles[j].used = true; tiles[j].el.classList.add('used'); s.tile = j; } } });
      } else { slots.length = 0; for (const ch of v) slots.push({ ch }); }
      order = []; render();
    },
    clearAt(idxs) {
      (idxs || []).forEach(i => { const s = slots[i]; if (!s || s.given) return; if (fixed) { if (s.tile != null && tiles) { tiles[s.tile].used = false; tiles[s.tile].el.classList.remove('used'); } s.ch = null; s.tile = null; } s.wrong = false; });
      if (!fixed) slots.length = 0;
      slots.forEach(s => { s.wrong = false; });
      render();
    },
    markWrong(idxs) { (idxs || []).forEach(i => { if (slots[i]) slots[i].wrong = true; }); render(); },
    glowSlots(idxs) { slots.forEach((s, i) => { s.glow = !!(idxs && idxs.includes(i)); }); render(); },
    glowTiles(chs) { if (!tiles) { glowKeys(chs); return; } const want = (chs || []).slice(); tiles.forEach(t => { const j = want.indexOf(t.ch); const on = j >= 0 && !t.used; if (on) want.splice(j, 1); t.el.classList.toggle('glow', on); }); },
    glowKey(ch) { glowKeys(ch ? [ch] : []); },
    glowKeys(list) { glowKeys(list || []); },
    shakeNum() { if (numEl) shake(numEl); },
    setNum(v) { num = String(v || '').slice(0, 2); render(); },
    slotEls: () => [...slotRow.children],
    numEl: () => numEl,
    fill(word) { api.clear(true); for (const ch of word) { if (tiles) { const i = tiles.findIndex(t => !t.used && t.ch === ch); if (i >= 0) api.tapTile(i); else place(ch); } else place(ch); } },
    // the letters lift off the bar and fly into the wand tip (screen space), then vanish in sparkles
    flyToWand() {
      // game-clock driven (F.T) so it plays the same in the real loop and in stepped tests
      const tipS = screenOf(wandTip());
      const els = [...slotRow.querySelectorAll('.wb-slot.full')];
      if (numEl && num) els.unshift(numEl);
      els.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const f = el('div', 'wb-fly'); f.textContent = s.textContent;
        f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
        document.body.appendChild(f);
        const dx = tipS.x - r.left - r.width / 2, dy = tipS.y - r.top - r.height / 2, rot = (i % 2 ? 1 : -1) * 160;
        F.T.sleep(i * 55).then(() => F.T.tween(560, k => {
          const e = k < 0.25 ? -0.35 * Math.sin(k / 0.25 * Math.PI) * 0.25 : (k - 0.25) / 0.75;   // a little wind-up, then whoosh
          const ee = U.clamp(e, -0.1, 1), arc = Math.sin(U.clamp(e, 0, 1) * Math.PI) * -60;
          f.style.transform = `translate(${(dx * ee).toFixed(1)}px, ${(dy * ee + arc).toFixed(1)}px) scale(${(1 - 0.82 * U.clamp(e, 0, 1)).toFixed(3)}) rotate(${(rot * U.clamp(e, 0, 1)).toFixed(0)}deg)`;
          f.style.opacity = String(1 - Math.pow(U.clamp(e, 0, 1), 3));
        })).then(() => { f.remove(); F.sfx.pling(4 + i); });
      });
      // the wand tip charges up while the letters arrive
      try { if (F.FX.glow) F.FX.glow(wandTip(), { color: SKIN_COL[fairyKind()][0], size: 1.4, ms: 900 + els.length * 60 }); } catch (e) {}
      return F.T.sleep(560 + els.length * 55);
    },
    puff() { slotRow.querySelectorAll('.wb-slot.full').forEach((e, i) => { e.style.transitionDelay = (i * 40) + 'ms'; e.classList.add('poof'); }); },
    destroy() { root.remove(); },
  };
  function glowKeys(chs) { bank.querySelectorAll('.wb-key').forEach(k => k.classList.toggle('glow', !!(chs && chs.includes(k.dataset.ch)))); }
  render(); built = true;
  return api;
}

/* physical keyboard → the top-most open speller */
const active = [];
addEventListener('keydown', e => {
  const sp = active[active.length - 1];
  if (!sp) {
    if (e.key === 'Enter' && F.booted && !e.repeat && !(F.UI.isOpen && F.UI.isOpen()) && !F.Task.current && !F.Player.frozen && !document.querySelector('#screens > *') && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) {
      e.preventDefault(); W.open({ mode: 'free' });
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'Escape') { if (cur && cur.mode === 'free' && cur.sp === sp) { e.preventDefault(); e.stopPropagation(); W.close(); } return; }
  if (k === 'Backspace') { e.preventDefault(); e.stopPropagation(); sp.backspace(); }
  else if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) sp.submit(); }
  else if (k === ' ') { e.preventDefault(); e.stopPropagation(); if (sp.cfg.space) sp.key(' '); }
  else if (k && k.length === 1) {
    const ch = k.toLowerCase();
    if (isLetter(ch) || /^\d$/.test(ch)) { e.preventDefault(); e.stopPropagation(); sp.key(ch); }
  }
}, true);
function pushActive(s) { active.push(s); }
function popActive(s) { const i = active.indexOf(s); if (i >= 0) active.splice(i, 1); }

/* camera: while the free bar is open, look a bit closer and lift the fairy into the upper part of the screen, above the bar.
   Outdoors mode 'wand'; indoors (natural audit #40: the bar now docks at the bottom there too) mode 'wandin' – Fetårnet's own camera
   follow (buildings.js camFollow, mode 'in') pauses and the view leans toward the camera so the fairy and her things sit above the bar.
   barFrame() solves the lean with the same pose the renderer builds (render.js updateCamera), so it fits any screen size. */
let camSaved = null, framedAt = null;
const vcam = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
function poseCam(tx, ty, tz, dist, pitch, yaw) {
  vcam.fov = F.R.camera.fov; vcam.aspect = F.R.camera.aspect; vcam.near = F.R.camera.near; vcam.far = F.R.camera.far; vcam.updateProjectionMatrix();
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  vcam.position.set(tx + Math.sin(yaw) * cp * dist, ty + sp * dist, tz + Math.cos(yaw) * cp * dist);
  vcam.lookAt(tx, ty + 1, tz); vcam.updateMatrixWorld(true);
  return vcam;
}
// the camera target that puts the fairy at about 58 % of the free space above the bar (the lean runs toward the camera)
function barFrame() {
  const c = F.R.cam, P = F.Player.pos, inside = F.Space.cur === 'in', yaw = c.yawGoal != null ? c.yawGoal : c.yaw;
  const dx = Math.sin(yaw), dz = Math.cos(yaw), ty = inside ? P.y + 1 : P.y;
  const R = F.R.renderer.domElement.getBoundingClientRect(), bars = barRects();
  const top = bars.length ? bars[0].t : R.top + R.height * 0.52, goal = R.top + (top - R.top) * 0.58;
  let lo = 0, hi = inside ? 7 : 6;
  for (let i = 0; i < 14; i++) {
    const k = (lo + hi) / 2, cam = poseCam(P.x + dx * k, ty, P.z + dz * k, c.distGoal, c.pitchGoal, yaw);
    const s = screenOf(new V3(P.x, P.y + 0.9, P.z), cam);
    if (s.y > goal) lo = k; else hi = k;
  }
  const k = (lo + hi) / 2;
  c.target.set(P.x + dx * k, ty, P.z + dz * k);
  framedAt = { x: P.x, z: P.z, k, tx: c.target.x, ty, tz: c.target.z, dist: c.distGoal, pitch: c.pitchGoal, yaw };
  return k;
}
// the view she types in (the bar framing at rest – also while a reveal push-in or the counting show has the camera): what she can see
// is judged with this pose, so a quick second word never misses the thing she has just made
function restCam() {
  const f = framedAt;
  if (f && cur && cur.mode === 'free') return poseCam(f.tx, f.ty, f.tz, f.dist, f.pitch, f.yaw);
  F.R.camera.updateMatrixWorld();
  return F.R.camera;
}
function camShift(on, free) {
  const c = F.R.cam;
  if (on) {
    if (camSaved) return;
    if (F.Space.cur === 'in') {
      if (!free || c.mode !== 'in') return;
      camSaved = { mode: 'in', dist: c.distGoal, pitch: c.pitchGoal, inside: true }; revealCam = null;
      c.mode = 'wandin'; c.distGoal = 15; c.pitchGoal = 0.8;
      barFrame();
      return;
    }
    if (F.Space.cur !== 'out') return;
    camSaved = { mode: c.mode, dist: revealCam && revealCam.mode === c.mode ? revealCam.dist : c.distGoal }; revealCam = null;
    c.mode = 'wand'; c.distGoal = 15;
    if (free) barFrame();
    else { const P = F.Player.pos, d = camDir(); c.target.set(P.x + d.x * 2.1, P.y, P.z + d.z * 2.1); }
  } else if (camSaved) {
    framedAt = null; revealCam = null;
    if (camSaved.inside) {
      if (c.mode === 'wandin') { c.mode = 'in'; c.distGoal = camSaved.dist; c.pitchGoal = camSaved.pitch; }
      camSaved = null; return;
    }
    c.mode = camSaved.mode === 'wand' ? 'out' : camSaved.mode; c.distGoal = camSaved.dist; camSaved = null;
    // v5 WP-X (playtest camera): never hand back a focus nobody holds any more (an encounter that ended while the bar was open)
    if (c.focus && !(F.Task && F.Task.current) && !(F.Befriend && F.Befriend.busy) && !(F.Travel && F.Travel.busy)) c.focus = null;
    if (c.mode === 'out') c.target.copy(F.Player.pos);
  }
}
F.on('spaceChanged', cur2 => {
  const c = F.R.cam;
  if (camSaved && camSaved.inside && c.mode === 'wandin') { c.mode = cur2 === 'in' ? 'in' : 'out'; c.distGoal = camSaved.dist; c.pitchGoal = camSaved.pitch; }
  else if (c.mode === 'wandin') c.mode = cur2 === 'in' ? 'in' : 'out';
  camSaved = null; framedAt = null; revealCam = null;
});
// the fairy moved while the bar is open (arrow keys): the framing follows her (never during a reveal / a counting show)
F.on('tick', () => {
  // orphan guard: the indoor wand view never outlives the bar (Fetårnet's own camera follow takes over again)
  if (F.R.cam.mode === 'wandin' && !(cur && cur.mode === 'free')) { const c = F.R.cam; c.mode = F.Space.cur === 'in' ? 'in' : 'out'; if (camSaved && camSaved.inside) { c.distGoal = camSaved.dist; c.pitchGoal = camSaved.pitch; } camSaved = null; framedAt = null; revealCam = null; return; }
  if (!framedAt || revealCam || !cur || cur.mode !== 'free') return;
  const c = F.R.cam; if (c.mode !== 'wand' && c.mode !== 'wandin') return;
  if (cur.looking) return;
  const P = F.Player.pos; if (Math.hypot(P.x - framedAt.x, P.z - framedAt.z) > 0.5) barFrame();
});

/* =================================================================== open: free mode */
let cur = null, helloDone = false;
// natural audit (parent 11.10.: «random stuff are being said for her to do»): Puff never suggests a modifier word by himself any more –
// the words live in Trylleboka (Krefter page) and on the gems of the bar (tap a shining gem = what it does + its example as ghost letters)
const TIP_MODS = ['stor', 'rød', 'glad', 'blå', 'liten', 'hoppe', 'gul', 'danse'];
F.SETS.WAND_TIPS = TIP_MODS;
// a power's example as a full phrase («rød ball»); with a thing of hers in view, that thing («rød katt»). Only en-nouns take the bare
// adjective (rød katt, stor ball, glad hund) – an et-noun would need «rødt» – so other things keep the book's own example.
function exPhrase(ex) {
  if (!ex) return null;
  const parts = String(ex).split(' '), adj = parts[0];
  try {
    const P = F.Player.pos, rects = barRects();
    let best = null, bd = 1e9;
    for (const t of F.Things.list) {
      if (t.type !== 'summoned' || t.data.k !== 'model' || (t.data.n || 1) > 1 || !inView(t, rects)) continue;
      const e = entry(t.data.w); if (!e || e.n !== 'en' || !castable(e) || locked(e)) continue;
      const d = Math.hypot(t.x - P.x, t.z - P.z); if (d < bd) { bd = d; best = t; }
    }
    if (best) return adj + ' ' + best.data.w;
  } catch (e) { /* no view */ }
  return parts.length > 1 ? ex : null;
}
function openFree(o) {
  let resolveClose;
  const promise = new Promise(r => { resolveClose = r; });
  const casts = [];
  let busy = false, ghostObj = null, ghostLab = null;
  let revealTok = 0, wrapEl = null;
  let ghostFor = null, tbc = null;              // v5 WP-T: the word the near-miss ghost showed; the Trylleboka cluster on the bar
  const snartSaid = new Set();
  // «Den trylleformelen lærer du snart!» ONCE per bar session (whatever power); the power's gem wiggles and glows every time (nothing nags)
  async function powSnart(ids) {
    if (tbc) tbc.wiggle(ids);
    if (snartSaid.size || !F.TPL.has('tb_snart')) { try { F.sfx.boing(); } catch (e) { /* audio */ } return; }
    ids.forEach(id => snartSaid.add(id));
    await F.SAY('tb_snart');
  }
  // natural audit #65: a modifier word written alone before she has its power – no letter blocks (they took 13 s and voiced the silent d
  // of «rød»): the letters fly into the wand, a puff of that colour bursts from the tip and fizzles, the power's gem wiggles and glows,
  // «Den trylleformelen lærer du snart!» (once per bar session). The bar is free again at once.
  async function lockedSplash(r, lockedP) {
    sp.flash('ok');
    await sp.flyToWand();
    sp.clear(); sp.setReady(null); sp.setGhost(null); sp.soften();
    const tip = wandTip(), mods = r.lockedMods || [];
    const col = mods.find(m => m.t === 'col'), cols = col ? [PALC(col.c), PALC(col.c), 0xffffff] : skinCols();
    if (F.Player.avatar && F.Player.avatar.userData.play) F.Player.avatar.userData.play('cast', 0.8);
    F.FX.burst(tip, { n: 34, colors: cols, speed: 2.2, up: 1.6, life: 0.9, size: 0.09, gravity: 1.4 });
    F.T.timeout(() => F.FX.burst(new V3(tip.x, tip.y + 0.3, tip.z), { kind: 'sparkle', n: 14, colors: cols, speed: 1, up: 1.2, life: 0.7 }), 220);
    try { F.sfx.magic(); F.T.timeout(() => F.sfx.tone(320, 0.3, 'sine', 0.06, 0, 200), 260); } catch (e) { /* audio */ }
    F.emit('wandPowSoon', { word: r.word, powers: lockedP.slice() });
    powSnart(lockedP);
  }
  const setReveal = on => {
    revealTok++;
    wrapEl = wrapEl || (sp && sp.el.closest('.panel-wrap'));
    if (wrapEl) wrapEl.classList.toggle('reveal', !!on);
  };
  const clearGhost = () => { if (ghostObj) { F.Space.scene().remove(ghostObj); ghostObj = null; } if (ghostLab) { ghostLab.remove(); ghostLab = null; } };
  let hvaP = null;                               // «Hva skal det være?» in flight (an extra Enter does not repeat it)
  const sp = speller({
    mode: 'free', num: true, maxLen: 16, space: true, queue: true,
    onChange(text, n) {
      // she writes on during a reveal: the bar comes back and so does its view (the thing she made stays in sight above the bar) –
      // also while the thing is still being made (the bar takes letters again as soon as the word has flown into the wand)
      if (wrapEl && wrapEl.classList.contains('reveal') && text) { setReveal(false); endFrame(); }
      if (busy) return;
      const r = text ? gatePow(resolve(text), null).r : null;   // v5 WP-T: the preview shows what she can make now
      if (!sp) return;
      if (r && r.kind === 'model') sp.setReady(r.model, makeOpts(Object.assign({ m: r.model, st: null }, modsData(r.mods, 1))));
      else if (r && r.kind === 'mod') {
        // preview: the thing it will change (in its new colour when it is a colour word) – only one she can see
        const t = modTarget({ view: true }), d = t && t.data;
        if (d && d.k === 'model' && F.VOX.has(d.m || d.w)) sp.setReady(d.m || d.w, makeOpts(Object.assign({}, d, { st: null }, modsData(r.mods, d.n || 1))), 'mod');
        else sp.setReady(null);
      } else sp.setReady(null);
    },
    async onSubmit(text, n) {
      if (busy) return;
      // v5 WP-T: powers she has not earned yet are stripped (the plain thing is made; a gentle line once per bar session)
      const gp = gatePow(resolve((n ? n + ' ' : '') + text), n);
      const r = gp.r; n = gp.n;
      const lockedP = gp.lockedP;
      if (n === 0) { sp.shakeNum(); return; }
      if (n != null && n > 20) { sp.shakeNum(); await F.RW.say('wand_toomany'); return; }
      if (r.kind === 'empty') { if (lockedP.length) { sp.clear(); await powSnart(lockedP); } else if (n) await F.RW.say('wand_number_only'); return; }
      busy = true; const unlock = sp.lock();
      clearGhost();
      try {
        if (r.powLocked) {
          await lockedSplash(r, lockedP);
        } else if (swapT && swapT.obj && swapT.obj.parent && (r.kind === 'model' || r.kind === 'lex') && n == null) {
          // Bokstavbytte: the thing she picked rebuilds itself as the new word
          if (r.word === swapT.data.w) { sp.flash('bad'); await F.RW.say('wand_swap_same'); }
          else { sp.flash('ok'); await sp.flyToWand(); sp.clear(); sp.setReady(null); sp.soften(); const t = swapT; setSwap(null); await swap(t, r.word); casts.push(r.word); }
        } else if (r.kind === 'mod') {
          // Scribblenauts: «stor», «rød», «glad», «sove» … change the thing she picked or made in this bar session – one she can SEE
          // (natural audit #40: indoors «rød» used to land on an old thing hidden behind the bar, so nothing seemed to happen)
          const t = modTarget({ view: true });
          // nothing to change yet: keep the word, add the space for her and ask for the thing («rød» → «rød ball»). The bar is hers
          // again BEFORE Puff asks, and the question is not waited for: «ball» typed straight after Enter lands as «rød ball»
          // (verifier 11.10: the bar stayed locked ~2.6 s while the line played and every letter typed then was lost)
          if (!t) {
            F.sfx.boing();
            busy = false; unlock();
            if (!/ $/.test(sp.text())) sp.key(' ');
            if (!hvaP) hvaP = Promise.resolve(F.RW.say(F.TPL.has('wand_mod_hva') ? 'wand_mod_hva' : 'wand_mod_none')).catch(() => {}).then(() => { hvaP = null; });
            return;
          }
          else {
            sp.flash('ok'); await sp.flyToWand(); sp.clear(); sp.setReady(null); sp.setGhost(null); sp.soften();
            const wl = wordsLog(); if (!wl.modUsed) { wl.modUsed = 1; F.store(); }
            // the same reveal as a new thing: the bar slides down to a strip and the camera frames the thing while it changes
            setReveal(true); const tok = revealTok, tRev = F.T.now;
            const ft = frameReveal({ x: t.x, z: t.z });
            const nt = await applyMods(t, r.mods, { from: wandTip() });
            F.T.timeout(() => { if (tok === revealTok) setReveal(false); endFrame(ft); }, Math.max(1200, 3000 - (F.T.now - tRev) * 1000));
            casts.push(r.word);
            F.emit('wandMod', { word: r.word, mods: r.mods.map(m => m.base), thing: nt ? nt.id : null });
            if (nt && cur) cur.last = nt;
            if (swapT) setSwap(null);
            refreshSwap(nt && nt.id);
            if (lockedP.length) await powSnart(lockedP);
          }
        } else if (r.kind === 'model' || r.kind === 'lex') {
          sp.flash('ok');
          await sp.flyToWand();
          sp.clear(); sp.setReady(null); sp.setGhost(null);
          // the bar slides down to a small strip so she sees the thing being made (it comes back by itself, or on a key/tap)
          if (r.kind === 'model') setReveal(true);
          sp.soften();                    // letters she types now go straight in (and bring the bar back); Enter waits for this word
          const tRev = F.T.now;
          const helped = !!(ghostFor && r.word === ghostFor); ghostFor = null;      // v5 WP-T: a retype of the near-miss ghost
          const th = await cast(r.word, r.kind === 'model' ? (n || 1) : 1, { free: true, res: r, helped });
          // back when the reveal is over (≈ 3.4 s after the cast started, at least 1.2 s after it finished)
          // the bar and its view come back TOGETHER (child-path test: the camera used to stay pushed in ~1.3 s longer than the strip,
          // so the new thing sat under the returning bar)
          if (r.kind === 'model') { const tok = revealTok; F.T.timeout(() => { if (tok === revealTok) { setReveal(false); endFrame(); } }, Math.max(1200, 3400 - (F.T.now - tRev) * 1000)); }
          casts.push(r.word);
          if (lockedP.length) await powSnart(lockedP);
          else if (r.kind === 'lex' && !magic().lexSaid) { magic().lexSaid = 1; F.store(); await F.RW.say('wand_lex'); }   // once ever: the blocks speak for themselves
          if (th && th[0] && cur) cur.last = th[0];
          if (r.mods) { const wl = wordsLog(); if (!wl.modUsed) { wl.modUsed = 1; F.store(); } }
          // (no unsolicited «Prøv å skrive …» tip any more: the words wait in Trylleboka and on the gems – natural audit, parent 11.10.)
        } else if (r.kind === 'locked') {
          sp.flash('bad'); F.sfx.bad();
          await F.RW.say('wand_locked');
          sp.clear();
        } else if (r.kind === 'near') {
          sp.flash('bad'); F.sfx.boing();
          // the parent page can show her spontaneous near-spellings (typed → meant), bounded
          const lg = wordsLog(); lg.near = lg.near || {}; if (Object.keys(lg.near).length < 150 || lg.near[r.word]) { lg.near[r.word] = r.near; F.store(); }
          // a see-through ghost of what she probably meant, with its spelling, then she retypes
          const p = freeSpot();
          ghostObj = F.VOX.make(r.model, { style: 'crystal' });
          ghostObj.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.38; m.material.depthWrite = false; m.castShadow = false; } });
          ghostObj.position.set(p.x, hAt(p.x, p.z) + 0.15, p.z); F.Space.scene().add(ghostObj);
          const g0 = ghostObj; F.T.tween(9000, k => { if (g0.parent) { g0.rotation.y = k * Math.PI * 2.5; g0.position.y = hAt(p.x, p.z) + 0.15 + Math.sin(k * 20) * 0.06; } });
          if (F.UI.label) ghostLab = F.UI.label(new V3(p.x, hAt(p.x, p.z) + 1.4, p.z), r.near, { kind: 'word' });
          const gt = r.ghostText || r.near, off = gt.length - r.near.length;
          ghostFor = r.near;
          sp.clear(true); sp.setGhost(gt); sp.soften();
          await F.RW.say('wand_near');
          // ghost help for a non-reader: the first letter that was different glows and plays its SOUND
          const typed = r.word || '', k = [...r.near].findIndex((ch, i) => ch !== typed[i]);
          if (k >= 0) { sp.pulseGhost(off + k); await sayUnitAt(r.near, k); }
          F.T.timeout(() => { if (ghostObj === g0) clearGhost(); }, 9000);
        } else {
          sp.flash('bad');
          const tip = wandTip();
          F.FX.burst(tip, { n: 16, colors: [0xe8e4f0, 0xd8d8e8, 0xffffff], speed: 0.9, up: 0.6, life: 0.9, size: 0.09, gravity: -0.3 });
          F.sfx.tone(320, 0.35, 'sine', 0.08, 0, 180);
          sp.puff();
          await F.RW.say('wand_unknown');
          sp.clear();
        }
      } catch (e) { console.error('wand cast', e); }
      // free first, then let go of the bar: the keys she typed meanwhile replay now (onChange sees them: preview, the reveal ends)
      busy = false;
      sp.setReady(null);
      unlock();
    },
  });
  sp.el.classList.add('wand-free');
  // Bokstavbytte from free play: a picture-button of the thing she made last (or the nearest one) loads its word for changing
  let swapT = null, swapBtn = null;
  const setSwap = t => { swapT = t; if (cur) cur.swapT = t; if (swapBtn) swapBtn.classList.toggle('on', !!t); sp.el.classList.toggle('swapping', !!t); };
  // (natural audit #40: only a thing she can see – an old cast hidden behind the bar is never offered)
  const near = () => { const P = F.Player.pos, rects = barRects(); let best = null, bd = 5; for (const t of F.Things.list) { if (t.type !== 'summoned' || t.space !== F.Space.cur || (t.data.n || 1) > 1 || t.data.k !== 'model' || !inView(t, rects)) continue; const d = Math.hypot(t.x - P.x, t.z - P.z); if (d < bd) { bd = d; best = t; } } return best; };
  const refreshSwap = id => {
    const single = t => alive(t) && t.data.k === 'model' && (t.data.n || 1) === 1;
    const byEv = id ? F.Things.byId(id) : null;
    const t = single(byEv) ? byEv : single(cur && cur.last) ? cur.last : near();
    if (!t) { if (swapBtn) swapBtn.style.display = 'none'; return; }
    if (!swapBtn) {
      swapBtn = F.UI.el('button', 'wb-swap'); sp.el.querySelector('.wb-top').prepend(swapBtn);
      swapBtn.addEventListener('click', e => { e.stopPropagation(); const tt = swapBtn._t; if (!tt || busy) return; if (!alive(tt)) { refreshSwap(); return; } F.sfx.click(); F.FX.pop(tt.obj); sp.clear(); sp.prefill(tt.data.w); setSwap(tt); F.RW.say('wand_swap_ask'); });
    }
    swapBtn._t = t; swapBtn.style.display = '';
    swapBtn.style.backgroundImage = 'url(' + F.Thumb.url(t.data.m || t.data.w, makeOpts(Object.assign({}, t.data, { st: null })), { size: 128 }) + ')';
  };
  // v5 WP-T: Trylleboka on the bar – the book (opens it), «Dagens tryllegåte» (tap = the riddle again) and the four power gems
  tbc = tbCluster(sp, () => busy);
  const offCast = F.on('cast', e => F.T.timeout(() => { refreshSwap(e && e.thing); if (tbc) tbc.sync(); }, 50));
  const offWish = F.on('wishFulfilled', () => F.T.timeout(() => refreshSwap(), 50));
  // natural audit #40: the free bar docks at the bottom indoors too (it used to hang from the top in Fetårnet and hid the fairy and
  // everything behind her); the camera leans so she and her things sit above it (camShift → barFrame)
  const h = F.UI.open(sp.el, {
    cls: 'wand-wrap', onClose() {
      sp.dropQueue(); popActive(sp); clearGhost(); camShift(false); cur = null; offCast(); offWish();
      F.emit('wandClosed', casts);
      resolveClose(casts);
    },
  });
  pushActive(sp);
  // clarity §3.10: a tap on the world above the open bar (not on the bar, its book cluster or ✕) – an EMPTY bar closes and the tap goes
  // on to the world (she flies there, or taps that thing). Staven opened by a tap meant for the ground never traps her behind a
  // backdrop that swallows every tap. A bar with letters in it, or a word still being made, stays (nothing she typed is lost).
  if (h && h.wrap) {
    let bd = null;
    h.wrap.addEventListener('pointerdown', e => { bd = e.target === h.wrap && e.button === 0 ? { x: e.clientX, y: e.clientY } : null; });
    h.wrap.addEventListener('pointerup', e => {
      const d = bd; bd = null;
      if (!d || e.target !== h.wrap || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 30) return;
      if (!cur || cur.sp !== sp || busy || sp.text() || sp.num() != null || sp.isLocked()) return;
      W.close();
      F.emit('wandAway', { x: e.clientX, y: e.clientY });
      if (F.Input && F.Input.pressAt) { try { F.Input.pressAt(e.clientX, e.clientY); } catch (x) { console.error('[wand] world tap', x); } }
    });
  }
  // the Trylleboka cluster floats just above the bar's top-left corner (outside the bar: the slots keep all their room)
  if (tbc && sp.el.parentElement) sp.el.parentElement.appendChild(tbc.el);
  cur = { mode: 'free', h, sp, promise, last: null, tbc };
  camShift(true, true);
  refreshSwap();
  F.emit('wandOpen', 'free');
  // the hello is for a beginner only (fewer than 3 words ever conjured by herself): later the open bar speaks for itself
  if (!helloDone && Object.keys(wordsLog().spont).length < 3) { helloDone = true; F.RW.say('wand_hello'); }
  // v5 WP-T: a power she has newly earned is announced once (its gem pops, its example waits as ghost letters – a full phrase such as
  // «rød ball», or «rød katt» when her katt is in view: natural audit #40)
  if (F.Book && F.Book.announce) {
    F.Book.announce().then(ex => { if (!cur || cur.sp !== sp) return; if (tbc) tbc.sync(true); const g = exPhrase(ex) || ex; if (g && !sp.text()) sp.setGhost(g); }).catch(e => console.error('[wand] announce', e));
  }
  return promise;
}
/* v5 WP-T: the Trylleboka cluster in the free spell bar (top left): book button, today's riddle chip (a silhouette), power gems */
const BOOK_SVG = '<svg viewBox="0 0 48 48"><path d="M24 10 C18 6 11 6 5 8 L5 40 C11 38 18 38 24 42 Z" fill="#b48cff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M24 10 C30 6 37 6 43 8 L43 40 C37 38 30 38 24 42 Z" fill="#ff9cc8" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M33 14 L35 19 L40 19.5 L36 23 L37.3 28 L33 25.3 L28.7 28 L30 23 L26 19.5 L31 19 Z" fill="#ffd84a" stroke="#fff" stroke-width="1.2"/></svg>';
function tbCluster(sp, isBusy) {
  const B = F.Book;
  if (!B || !B.POWERS) return null;
  const el = (t, c, h) => F.UI.el(t, c, h);
  const box = el('div', 'tb-wb'), top = el('div', 'tb-wb-row');
  const bk = el('button', 'tb-wb-book', (F.HUD && F.HUD.ICON && F.HUD.ICON.book) || BOOK_SVG); bk.title = 'Trylleboka';
  bk.addEventListener('click', e => { e.stopPropagation(); if (isBusy()) return; try { F.sfx.click(); } catch (x) { /* audio */ } W.close(); F.T.timeout(() => B.open(), 120); });
  const rd = el('button', 'tb-wb-gate'); rd.title = 'Dagens tryllegåte';
  const rim = el('img', 'tb-img sil'); rim.alt = ''; rim.draggable = false; rd.append(rim, el('span', 'tb-q', '?'));
  rd.addEventListener('click', e => { e.stopPropagation(); rd.classList.remove('tb-tap'); void rd.offsetWidth; rd.classList.add('tb-tap'); B.sayRiddle({ how: true }); });
  top.append(bk, rd);
  const gems = el('div', 'tb-wb-gems');
  for (const p of B.POWERS) {
    const g = el('button', 'tb-wb-gem ' + p.id); g.dataset.pow = p.id; g.style.setProperty('--pc', p.col);
    // a tap = she asks: what the power does (Trylleboka's line); an earned power's example waits as ghost letters in an empty bar
    g.addEventListener('click', e => {
      e.stopPropagation(); B.sayPower(p.id);
      try { if (!isBusy() && !sp.text() && B.has(p.id)) { const ph = exPhrase(p.ex); if (ph) sp.setGhost(ph); } } catch (x) { /* ghost */ }
    });
    gems.appendChild(g);
  }
  box.append(top, gems);
  const api = {
    el: box,
    sync(pop) {
      let r = null; try { r = B.riddle(); } catch (e) { /* no riddle */ }
      rd.style.display = r && !r.done ? '' : 'none';
      if (r && !r.done && rim.dataset.m !== r.model) { rim.dataset.m = r.model; try { rim.src = F.Thumb.url(r.model, {}, { size: 96 }); } catch (e) { /* model */ } }
      // a gem shines once the power is earned AND announced (an unannounced one pops when Puff announces it)
      let P = []; try { P = B.powers(); } catch (e) { /* engine */ }
      [...gems.children].forEach(g => {
        const p = P.find(x => x.id === g.dataset.pow);
        const on = !!(p && p.on && (p.seen || !B.gating)); const was = g.classList.contains('on');
        g.classList.toggle('on', on);
        if (pop && on && !was) { g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
      });
    },
    // a power she has not earned yet: its gem wiggles and glows in the power's colour for a moment (natural audit #65)
    wiggle(ids) {
      (ids || []).forEach(id => {
        const g = gems.querySelector('[data-pow="' + id + '"]'); if (!g) return;
        g.classList.remove('wig'); void g.offsetWidth; g.classList.add('wig');
        const p = B.POWERS.find(x => x.id === id), col = (p && p.col) || '#fff';
        g.style.boxShadow = `0 0 10px 4px ${col}, 0 0 22px 6px ${col}`; g.style.background = `linear-gradient(135deg, #fff 0%, ${col} 60%)`;
        g.dataset.glow = '1';
        F.T.timeout(() => { g.style.boxShadow = ''; g.style.background = ''; delete g.dataset.glow; }, 1800);
      });
    },
  };
  api.sync();
  return api;
}

/* =================================================================== open: task mode (used by F33/F34/F39/F40 and others) */
function openTask(o) {
  o = o || {};
  const waiters = [];
  const sp = speller({
    mode: 'task', slots: o.slots || 0, tiles: o.tiles || null, given: o.given || null, ghost: o.ghost || null, num: !!o.num,
    maxLen: o.maxLen || 10, autoSubmit: !!o.tiles && o.autoSubmit !== false, picture: o.picture || null, onPicture: o.onPicture || null, isRight: o.isRight || null,
    onSubmit(text, n) { if (o.onSubmit) return o.onSubmit(text, n); const w = waiters.shift(); if (w) w({ text, n, res: resolve((n ? n + ' ' : '') + text) }); },
    onChange: o.onChange || null, onLetter: o.onLetter || null,
  });
  sp.el.classList.add('wand-task');
  let panel = null;
  if (o.container) { sp.el.classList.add('in-tray'); o.container.appendChild(sp.el); }
  else panel = F.UI.open(sp.el, { cls: 'wand-wrap task' + (F.Space.cur === 'in' ? ' top' : ''), closable: false, freeze: false });
  pushActive(sp);
  if (!o.container && !F.Task.current) camShift(true);
  const h = {
    speller: sp, el: sp.el,
    next() { return new Promise(r => waiters.push(r)); },
    ok() { sp.flash('ok'); },
    bad(lockMs) { sp.flash('bad'); F.sfx.bad(); return sp.lock(lockMs == null ? 1200 : lockMs); },
    lock: ms => sp.lock(ms),
    clear: keepNum => sp.clear(keepNum),
    ghost: w => sp.setGhost(w),
    solution(word) { sp.clear(true); sp.setGhost(word, true); sp.glowTiles([...word]); if (!o.tiles) sp.glowKey(word[0]); },
    fly: () => sp.flyToWand(),
    close() {
      popActive(sp);
      waiters.splice(0).forEach(w => w(null));
      if (panel) panel.close(); else sp.destroy();
      camShift(false);
      if (cur === h) cur = null;
    },
  };
  return h;
}

/* =================================================================== public object (replaces the stub) */
const W = F.Wand = {
  open(o) {
    o = o || {};
    if (o.mode === 'task') return openTask(o);
    if (cur && cur.mode === 'free') return cur.promise;
    return openFree(o);
  },
  close() { if (cur && cur.h) cur.h.close(); },
  isOpen: () => !!cur,
  cast, resolve, swap, reactTo, speller,
  tagOf: w => tagOfEntry(entry(w)),
  entry, castable: w => castable(entry(w)), modelOf: w => modelOf(entry(w)),
  lexHas: w => LEX.has(w) || LEXPLM.has(w),
  ed1, sayLetter, wandTip, camDir, fairyKind, skinCols,
  MODS, modOf,
  modify(th, words) {
    const list = Array.isArray(words) ? words : [words];
    const mods = list.map(w => (w && w.t) ? w : modOf(String(w || '').toLowerCase())).filter(Boolean);
    return mods.length && alive(th) ? applyMods(th, mods, {}) : Promise.resolve(th);
  },
  summoned: () => F.Things.list.filter(t => t.type === 'summoned'),
  _magic: magic,
};
F.on('ready', () => { try { restore(); } catch (e) { console.error('wand restore', e); } });
// debug / test hooks
F.dbg = F.dbg || {};
F.dbg.wand = {
  open: () => { W.open({ mode: 'free' }); return !!cur; },
  type(text) { const s = active[active.length - 1]; if (!s) return false; for (const ch of String(text)) { if (ch === ' ' && !s.cfg.space) continue; s.key(ch.toLowerCase()); } return s.text(); },
  target: () => { const t = modTarget(); return t ? { id: t.id, w: t.data.w, c: t.data.c || null, sc: t.data.sc || 1, md: t.data.md || null, n: t.data.n || 1 } : null; },
  submit() { const s = active[active.length - 1]; if (s) s.submit(); return !!s; },
  clear() { const s = active[active.length - 1]; if (s) s.clear(); return !!s; },
  back() { const s = active[active.length - 1]; if (s) s.backspace(); },
  text() { const s = active[active.length - 1]; return s ? s.text() : null; },
  close() { W.close(); return !cur; },
  state() { return { open: !!cur, mode: cur && cur.mode, text: this.text(), summoned: W.summoned().length, magic: magic().list.length, last: cur && cur.last && cur.last.id }; },
};
})();
