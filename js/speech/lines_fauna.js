/* Feslottet – speech templates for animal life + weather (WP4 FAUNA, DESIGN2 §8.2). Prefix fa_. Narrator voice '' (Puff). No slots.
   fa_snd_<sound>: what she hears when she pets an animal (F.FAUNA species .sound). Cap: 55 clips.
   v5 WP-A: every sound line is species-neutral («Den sier mjau!» – one clip fits katt, kattunge, krystallkatt, månekatt; logic #56)
   and no line holds a vowel-less word (Bzzz/Sss are read as letter names by the TTS – playtest «Bzzz»); the real animal sound is a
   synthesized SFX (js/game/sfx_animals.js, F.sfx.animal(sound)) played with the line.
   Natural audit 11.10. (D2): every fa_snd_* line and fa_zoo are RETIRED as narrator lines (petting = the real sound + hearts + a hop;
   the album card tap plays the SFX) – kept only so old clips resolve. fa_pet2 / fa_pet3: one per species per session at most;
   fa_woke, fa_break, fa_comp_cheer: once a session.
   Clarity 12.10. (§3.9 FA): fa_w_regn, fa_w_vind, fa_w_regn2, fa_w_vind2, fa_w_morgen, fa_w_kveld and fa_glimt are RETIRED (no caller;
   kept only so old clips resolve). fa_new is the once-ever «?» explanation (F.First 'dyr'); fa_glitter / fa_legend / fa_flokk /
   fa_tilbake wait for calm and the animal on screen; fa_flokk once a year; fa_zoo_hi once ever. */
(function () {
'use strict';
const F = window.F;
F.TPL.addAll({
  // sounds (36) – shared by every species with that .sound
  fa_snd_kurr: 'Den sier kurr, kurr!',
  fa_snd_rapp: 'Den sier rapp, rapp!',
  fa_snd_knask: 'Knask, knask, en god nøtt!',
  fa_snd_gnag: 'Gnag, gnag, den gnager på en pinne!',
  fa_snd_hopp: 'Hopp, hopp, hopp!',
  fa_snd_flagre: 'Se, den flagrer så fint!',
  fa_snd_snadder: 'Snadder, snadder!',
  fa_snd_snus: 'Snuse, snuse, den lukter på deg!',
  fa_snd_plask: 'Plask, den hoppet i vannet!',
  fa_snd_mjau: 'Den sier mjau!',
  fa_snd_voff: 'Den sier voff, voff!',
  fa_snd_pip: 'Pip, pip!',
  fa_snd_kvitt: 'Den synger kvitt, kvitt!',
  fa_snd_hallo: 'Den sier hallo, hallo!',
  fa_snd_mo: 'Den sier mø!',
  fa_snd_bae: 'Bæ, bæ, bæ!',
  fa_snd_mae: 'Den sier mæ!',
  fa_snd_noff: 'Den sier nøff, nøff!',
  fa_snd_klukk: 'Den sier klukk, klukk!',
  fa_snd_knegg: 'Den knegger ihihi!',
  fa_snd_bzz: 'Den surrer rundt blomstene.',
  fa_snd_kryp: 'Den kryper så sakte.',
  fa_snd_gress: 'Den gresser i ro og fred.',
  fa_snd_kra: 'Kra, kra!',
  fa_snd_bank: 'Bank, bank, den banker på treet!',
  fa_snd_hoo: 'Den sier ho, ho!',
  fa_snd_kvekk: 'Den sier kvekk, kvekk!',
  fa_snd_ia: 'Den sier i-a, i-a!',
  fa_snd_klikk: 'Klikk, klikk, den knipser med klørne!',
  fa_snd_kja: 'Kja, kja, den roper over stranda!',
  fa_snd_sel: 'Plask, plask, den leker i vannet!',
  fa_snd_delfin: 'Den hopper og piper!',
  fa_snd_hval: 'Den puster ut, så det spruter høyt!',
  fa_snd_pingvin: 'Den vagger og sklir!',
  fa_snd_brumm: 'Den sier brumm!',
  fa_snd_trut: 'Den trutter med snabelen!',
  // cues and events
  fa_new: 'Se, et nytt dyr!',
  fa_glitter: 'Se, et glitterdyr!',
  fa_legend: 'Se, et eventyrdyr ved regnbuen!',
  fa_glimt: 'Jeg ser glitterspor!',                   // (retired, clarity R14)
  fa_break: 'Dyra leker nå. Snart kan du bli venn!',
  fa_sleep: 'Hysj, den sover!',
  fa_woke: 'Den våknet!',                              // logic #47: a tap wakes a sleeper
  // weather and phase (all retired, clarity R16: the weather shows itself; «Nå er det kveld» was said in daylight)
  fa_w_regn: 'Regnbuevær! Nå kommer sjeldne dyr.',
  fa_w_vind: 'Hør på vinden! Nå kan det komme sjeldne dyr.',   // logic #48: true again – fauna.js plays a soft wind gust (F.sfx.wind) first
  fa_w_regn2: 'Se, en regnbue!',
  fa_w_vind2: 'Vinden leker med bladene.',
  fa_w_morgen: 'Nå er morgendyra ute!',
  fa_w_kveld: 'Nå er det kveld. Nattdyra våkner!',
  // v5c WP-A2: the seasons (fauna.js: migrants gather 15 Oct – 9 Nov, are away until 14 Mar; the first one back in spring)
  fa_flokk: 'Se, fuglene samler seg! Snart flyr de sørover for vinteren.',
  fa_tilbake: 'Velkommen tilbake! Trekkfuglene er hjemme igjen.',
  // companion
  fa_comp_on: 'Nå følger vennen din deg!',
  fa_comp_off: 'Vennen din går hjem og hviler.',
  fa_comp_cheer: 'Vennen din jubler for deg!',
  fa_comp_pet: 'Kjæledyret ditt venter hjemme.',
  // Dyreparken
  fa_zoo: 'De bor i dyreparken.',                     // (retired: was said on every zoo tap)
  fa_zoo_hi: 'Velkommen til dyreparken!',
  // petting
  fa_pet: 'Den liker å bli klappet!',                  // (retired; fa_pet2 / fa_pet3, once per species per session)
  fa_pet2: 'Så myk den er!',
  fa_pet3: 'Kos, kos, den liker deg!',
}, { voices: [''] });
})();
