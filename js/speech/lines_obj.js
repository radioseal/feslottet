/* Feslottet – speech templates for interactable objects + behaviours (WP OBJECTS+BEHAVIOURS). Prefix obj_.
   Narrator voice '' (Puff) unless noted. Short, funny, bokmål for a 6-year-old. Registered at load time.
   Convention: obj_<type> = line for play variant 1, obj_<type>_2 / _3 = variants 2 / 3 (each line matches what happens). */
(function () {
'use strict';
const F = window.F;
const A = (map, d) => F.TPL.addAll(map, d);

/* ---- shared by behaviours.js */
F.TPL.add('obj_num', { text: '{n}', slots: { n: 'NUM_1_20' } });
F.TPL.add('obj_num_x', { text: '{n}!', slots: { n: 'NUM_1_20' } });
A({
  obj_coin: ['Du fant en mynt!', 'Oi, en mynt!'],
  obj_flower: ['Se, en blomst!', 'Det vokste en blomst!'],
  obj_puff_giggle: ['Hi hi, det kilte!', 'Hi hi hi!', 'Det var morsomt!'],
});

/* ---- kingdom objects (reactions use F.SAYF, so they never interrupt other speech) */
A({
  obj_molle: ['Se, en sekk med mel!', 'Vingene snurrer!'], obj_molle_2: ['Wiii, så fort!'],
  obj_bronn: ['Plask! Friskt vann!'], obj_bronn_2: ['Hallo! Hallo! Hallo!', 'Ekkoet svarer deg!'], obj_bronn_3: ['Plopp! En frosk!'],
  obj_epletre_2: ['Dunk, dunk, dunk!', 'Epler i gresset!'],
  obj_bikube: ['Honning, så godt!'],   // v5 WP-W: no vowel-less «Bzzz» (TTS read it as letter names); the buzz is a soft SFX
  obj_postkasse: ['Det er post!', 'Se, et brev!'], obj_postkasse_2: ['En fugl i postkassa!'],
  obj_hoyball: ['Mjau! En kattunge!', 'Hei, lille kattunge!'], obj_hoyball_2: ['Høy overalt!'],
  obj_trillebar_2: ['Et gresskar trillet ut!'],   // (round 2: no «Trillebåra triller.» – the wheel turns)
  // natural 11.10. (audit #17): the farm animals (sau / ku / gris / høne) have no narrator lines – their own sound + the egg / milk / wool
  obj_solsikke: ['Solsikken snur seg mot sola!', 'Så stor og gul!'], obj_solsikke_2: ['Den vokser!', 'Solsikken blir stor!'],   // v5c WP-W2 (#12): towards the sun, not her obj_solsikke_2: ['Den vokser!', 'Solsikken blir stor!'],
  obj_lavendel: ['Sommerfugler!', 'Se, sommerfuglene flyr!'], obj_lavendel_2: ['Å, det lukter godt.'],
  obj_krystaller: ['Pling! Krystallene synger.', 'Så fine krystaller!'],
  obj_krystaller_hoste: ['Du fikk en krystall til boden din!'],
  obj_snomann: ['Vi bygger en snømann!', 'Snømannen har fått hatt!'],
  obj_akebakke: ['Wiii! Nedover bakken!', 'Så fort det går!'], obj_akebakke_2: ['Så fort det går!'],
  obj_skoytedam: ['Du går på skøyter!', 'Rundt og rundt!'], obj_skoytedam_2: ['Rundt og rundt!'],
  obj_fyrtarn: ['Herfra ser du langt!'], obj_fyrtarn_2: ['Herfra ser du langt!'],
  obj_seilbat: ['Båten seiler en runde!'],
  obj_krabbe: ['Krabben danser!', 'Krabben vinker til deg!'], obj_krabbe_2: ['Krabben vinker til deg!'],
  obj_skjell: ['Skjellet synger!', 'Hør, havet synger!'], obj_skjell_2: ['En perle!'],
  obj_sandslott: ['Et nytt tårn!', 'Sandslottet vokser!'],
  obj_pariserhjul: ['Opp, opp, opp!', 'Se så høyt!'],
  obj_vannhjul: ['Plask! Hjulet går rundt.', 'Vannet spruter!'], obj_vannhjul_2: ['Vannet spruter!'],
  obj_bokstavsteiner: ['Steinene synger!'],
  // natural 11.10. (audit D4): no descriptive lines (the signpost, the notice board, the gate, the lantern, the washing line just move;
  // round 2: no flat «X does Y.» variants – bees, mill birds, bucket, lighthouse, boat, wind chime, glass, igloo, weathervane, crab pool …)
  obj_markedsbod: ['Pling pling! Boden er åpen.', 'Så mye fint!'],
  obj_bro: ['Pinnen flyter under broen!', 'En fisk hoppet!'],
  obj_vindspill: ['Så fin lyd!'], obj_vindspill_2: ['Så fin lyd!'],
  obj_piknik: ['Kling, kling! Skål!'], obj_piknik_2: ['Tid for te!'],
  obj_luftballong: ['Opp i lufta!', 'Se hele riket!'], obj_luftballong_2: ['Ballongen vil fly!'],
  obj_tryllepunkt: ['Her kan du trylle!', 'Det glitrer!'],
  obj_skattkiste: ['Kista er åpen!', 'Så mye gull!'],
  obj_skattkiste_lukket: ['Kista har en lås.'],
  obj_taptting: ['Hvem har mistet denne?', 'Noe som glitrer!'],
  obj_tallstolpe: ['Et husnummer har falt ned.'],

  obj_tregynge: ['Høyere og høyere!', 'Wiii!'],
  obj_vaskesnor_2: ['Oi, sokken fløy!'],
  obj_fuglekasse: ['Pip pip! Fuglene flyr ut.'], obj_fuglekasse_2: ['Pip pip! Hei, fugl!'],
  obj_sopp: ['Boing! Soppen spretter.'], obj_sopp_2: ['Soppene synger!'],
  obj_benk: ['Ah, en liten pause.', 'Godt å sitte litt.'], obj_benk_2: ['Pip pip! Fuglene kommer.'],
  obj_vannpytt: ['Plask! Det spruter!', 'Plask, plask!'], obj_vannpytt_2: ['For en sølepytt!'],

  obj_syngeblomster: ['Blomstene synger!', 'La la la!'],
  obj_drage: ['Dragen flyr høyt!'], obj_drage_2: ['Den lager en sløyfe!'],
  obj_saftbod: ['Eplesaft, så godt!'],
  obj_brygge: ['Napp! En fisk!'], obj_brygge_2: ['Plask! Fisken stakk av.'],
  obj_robat: ['Ro, ro, ro!'],
  obj_badehytte: ['En badeball!'], obj_badehytte_2: ['Døra går opp!'],
  
  obj_snoballer: ['Snøballer!', 'Det snør!'], obj_snoballer_2: ['Snøballen blir større!'],
});
// wave 2: more things to press
A({
  obj_teppebamse: ['Bamsen vil ha en klem!', 'Klem! Bamsen er glad.'], obj_teppebamse_2: ['Bamsen danser!'], obj_teppebamse_3: ['Bamsen deler kjeks med deg.'],
  obj_hengekoye: ['Ahh, så deilig å gynge!', 'Gynge, gynge, hvile litt.'], obj_hengekoye_2: ['Sommerfuglene vil også gynge.'],
  obj_isvogn: ['Pling pling! Is til deg!', 'Jordbæris, så godt!'],
  obj_sneglelop: ['Klar, ferdig, gå!'],
  obj_bjellebro: ['Pling! Over broen!', 'Hver planke synger.'], obj_bjellebro_2: ['En fisk sier hei!'],
  obj_onskebronn: ['Du ønsket deg noe fint!', 'Ønsket ble til en regnbue!'], obj_onskebronn_2: ['Hjerter fra ønskebrønnen!'],
  obj_solsikkering: ['Solsikkene synger!'], obj_solsikkering_2: ['Solsikkene snurrer rundt!'],
  obj_dragefest: ['Dragene danser i vinden!'], obj_dragefest_2: ['Fuglene flyr med dragene!'],
  obj_liljedam: ['Hopp, hopp! Over dammen!', 'Fra stein til stein!'], obj_liljedam_2: ['Kvekk! Frosken hopper.'],
  obj_telt: ['Mjau! Katten har sovet så godt.', 'Katten strekker seg. Hei, katt!'], obj_telt_2: ['Hysj! Katten sover.'],
  obj_vindfloy: ['Vinden snur hanen!'], obj_vindfloy_2: ['Kykeliky!'],
  obj_blomsterskremsel: ['Fuglene er venner med fugleskremselet!'], obj_blomsterskremsel_2: ['Fugleskremselet danser!'], obj_blomsterskremsel_3: ['Det vokser blomster!'],
  obj_togbane: ['Tut tut! Toget kjører rundt.'], obj_togbane_2: ['Fort, fort, lille tog!'],
  obj_dukketeater: ['Ta-da! Takk for i dag!', 'Kaninen og katten bukker!'], obj_dukketeater_2: ['Kaninen og katten danser!'],
  obj_sandkasse: ['Et nytt sandtårn!'], obj_sandkasse_2: ['Du fant et skjell i sanden!'],
  obj_spilledasetre: ['Treet spiller en sang!', 'Se, hun danser!'], obj_spilledasetre_2: ['Fuglene synger med!'],
  obj_boblefontene: ['Så mange bobler!', 'Bobler, bobler!'], obj_boblefontene_2: ['En kjempeboble! Pop!'],
  obj_kakaobod: ['Varm kakao! Nam.', 'Kakao med krem!'], obj_kakaobod_2: ['Kakaoen er klar!'],
  obj_isskulptur: ['Svanen av is glitrer!'], obj_isskulptur_2: ['Svanen av is snurrer rundt!'],
  obj_fjaerepytt: ['Sjøstjerna vinker!'],
  obj_parasoll: ['Parasollen snurrer!'], obj_parasoll_2: ['Hopp, ball, hopp!'],
  obj_traktor: ['Tut tut! Traktoren kjører en runde.'], obj_traktor_2: ['Traktoren sier tut!'],
  obj_svanebat: ['Svanebåten tar deg en tur!'],
  obj_utkikk: ['Se så langt du kan se!'], obj_utkikk_2: ['Hei, fugler!'],
  obj_kirsebaertre: ['Det snør blomster!', 'Så mange rosa blomster!'], obj_kirsebaertre_2: ['Søte kirsebær!'],
});
F.TPL.add('obj_sneglelop_vinner', { text: ['Nummer {n} vant!', 'Sneglen med nummer {n} vant!'], slots: { n: 'NUM_1_20' } });   // v5 WP-W: natural bibs 1–20
// v3 WP5: the letter stones sound their letters out by SOUND (F.LYD, recorded letter sounds) – obj_bokstav (letter names) is retired
// v3 WP5 §9.9: a learning spot during the play break: no task now, the hourglass sparkles (WP3 may already declare it for c_kiste)
if (!F.TPL.has('obj_las_senere')) F.TPL.add('obj_las_senere', { text: 'Vi prøver låsen etter en liten pause!' });
F.TPL.add('obj_tall_senere', { text: 'Tallet venter til etter pausen!' });

// door knock: the villager answers (villager voices)
A({
  obj_dor_hei: ['Hei! Så hyggelig!', 'Hei, lille fe!', 'Hei hei!'],
  obj_dor_kjeks: ['Vil du ha en kjeks?', 'Her er en kjeks til deg!'],
  obj_dor_vink: ['Ha det bra!', 'Kom igjen snart!'],
  // natural 11.10. (audit D3 #13): sometimes the villager has a wish that fits the house – she may tap the gold ★ note to help
  obj_dor_onske_post: 'Posten min kom til feil hus. Kan du hjelpe meg?',      // F02 Postrunden (this street's doors)
  obj_dor_onske_tall: 'Vinduene i huset mitt mangler tall. Kan du hjelpe meg?', // F49 Faktafamiliehuset (the windows of the roof family)
}, { voices: ['vm', 'vk', 'barn'] });
// house number plate (said only AFTER it hangs on the post, and – v3 WP5 – only after her answer to the post's number task)
// v5 WP-W (DESIGN4 §8): natural street numbers 1–60 (odd one side, even the other)
F.SETS.HOUSE_NUMS = F.SETS.HOUSE_NUMS || Array.from({ length: 60 }, (_, i) => i + 1);
F.TPL.add('obj_tallstolpe_nr', { text: 'Dette er nummer {n}.', slots: { n: 'HOUSE_NUMS' } });

/* ---- v5c WP-W2 (DESIGN5 §10, longevity_plan §3): interaction hooks – TRUE sentences, word for word from
   _dev/curriculum/knowledge_seed.json conceptDecks (planter, stoffer_og_materialer, årstider_og_vær, mat_og_opphav, norge_og_verden,
   kropp_og_sanser). Said by F.OBJ.trueLine at most once a day per thing (exposure key 'K:<id>'); animal facts use vit_fakta instead. */
A({
  hk_brod_korn: 'Brød lages av korn.',
  hk_egg: 'Egg kommer fra høna.',
  hk_eple_fro: 'Eplet har frø inni.',
  hk_planter: 'Planter trenger vann, lys og jord.',
  hk_blomst_fro: 'Blomsten lager frø.',
  hk_fro_plante: 'Et frø kan bli en ny plante.',
  hk_lov_hosten: 'Løvtrær mister bladene om høsten.',
  hk_tre_flyter: 'Tre flyter.',
  hk_stein_synker: 'Stein synker.',
  hk_vann_is: 'Når vann fryser, blir det til is.',
  hk_damp: 'Is, vann og damp er det samme stoffet.',
  hk_regnbue: 'Regnbuen kommer når sola skinner og det regner.',
  hk_jorda_rund: 'Jorda er rund som en ball.',
  hk_jorda_hav: 'Det meste av jorda er dekket av hav.',
  hk_vaske: 'Vi vasker hendene så vi ikke blir syke.',
  hk_tenner: 'Tennene trenger puss to ganger om dagen.',
  hk_sovn: 'Søvn hjelper kroppen å vokse.',
  hk_verdensdeler: 'Det finnes sju verdensdeler.',
  // payoffs of the question hooks (what she made stays in the world)
  obj_vaskesnor_monster: 'Se, klærne henger i mønsteret ditt!',
});
// the globe's labels (c_globus): Norway and the seven continents, read by her first (F.UI.tryRead), the whole name on the 2nd tap
F.SETS.HK_LAND = ['Norge', 'Europa', 'Afrika', 'Asia', 'Nord-Amerika', 'Sør-Amerika', 'Australia', 'Antarktis'];
F.TPL.add('hk_land', { text: '{l}', slots: { l: 'HK_LAND' } });
})();
