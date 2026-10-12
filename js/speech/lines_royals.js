/* Feslottet – WP7 royal speech (DESIGN2 §8.2, prefix roy_). Royals have their own voices rk1 rk2 (kings), rd1 rd2 (queens), barn (children)
   and never use the life_* repertoire or voice task prompts. Budget ≈ 156 clips (cap 160):
     roy_jeg_<royalId>    «Jeg er Kong Ask!»            30 single-voice templates (own voice)
     roy_velk_<realm>     «Velkommen til Blomsterslottet!»  10 (the king's voice)
     roy_q_<realm>_1|2    quirk lines                     20 (voice of the quirk owner)
     roy_c_<realm>        one line per child              10 (barn)
     roy_g_*              generic royal lines             15 × [rk1 rk2 rd1 rd2 barn] = 75
     roy_her_bor          «Her bor {familie}.»            FAMILIES 10 (narrator)
     roy_tralala          «Tra-la-la!»                    1 (Kong Pål, before he talks)
   v3 (DESIGN3 §7.10, WP4): roy_g_oppgave/lek/riktig 3×5, roy_g_igjen 2×5, roy_g_hjelp +2×5, roy_g_tre/klok/ove 3×4 (kings+queens),
     roy_o_<realm>_k|q own lines 20, roy_a_<realm>_k|q|c ask lines 30; roy_g_pause dropped (−5) → +102 clips */
(function () {
'use strict';
const F = window.F;
const RV = ['rk1', 'rk2', 'rd1', 'rd2', 'barn'];

// generic royal lines (one sentence each)
F.TPL.addAll({
  roy_g_hei: 'Hei, lille fe!',
  roy_g_velkommen: 'Velkommen til slottet vårt!',
  roy_g_fint: 'Så fint at du kom!',
  roy_g_hjelp: ['Vil du hjelpe meg?', 'Jeg har en oppgave til deg!', 'Kan du løse noe for meg?'],   // v3: a pool
  roy_g_takk: 'Tusen takk!',
  roy_g_flink: 'Du er så flink!',
  roy_g_hurra: 'Hurra!',
  roy_g_senere: 'Kom tilbake senere!',
  roy_g_hade: 'Ha det bra!',
  roy_g_nam: 'Så godt!',
  roy_g_pen: 'Så pent!',
  roy_g_gøy: 'Så gøy!',
  roy_g_glad: 'Jeg blir så glad!',
  roy_g_leo: 'Hils Kong Leo fra oss!',
  // v3 (DESIGN3 §7.10)
  roy_g_oppgave: 'Jeg har en oppgave til deg!',                       // the royal calls her (once per 90 s)
  roy_g_lek: 'Lek litt først, så kan du hjelpe meg etterpå!',          // play break (replaces roy_g_pause)
  roy_g_igjen: ['Hei igjen, lille fe!', 'Så fint at du kom tilbake!'], // first tap per visit
  roy_g_riktig: 'Det var helt riktig!',                               // after a single task (A) when the stage gave no praise in his voice
}, { voices: RV });
// v3 §7.4 the audience (kings and queens)
F.TPL.addAll({
  roy_g_tre: 'Jeg har tre oppgaver til deg!',
  roy_g_klok: 'Så klok du er!',
  roy_g_ove: 'Vi øver mer neste gang!',
}, { voices: ['rk1', 'rk2', 'rd1', 'rd2'] });

// v3 §7.8 the king calls her to a numbered room of his castle (narrator). v5 WP-X (DESIGN4 §8): natural room numbers – a kingdom keep
// numbers its rooms 1–4 along the floor (realm.js), so n ∈ RK_ROOMS 1–6 (6 clips instead of 11).
F.SETS.RK_ROOMS = [1, 2, 3, 4, 5, 6];
F.TPL.add('rk_rom_kom', { text: 'Kongen venter i rom {n}!', slots: { n: 'RK_ROOMS' }, voices: [''] });

// v5 WP-X: the castle lift panel now shows the floors (castle.js owns the lift; lines_castle.js is WP-W's): narrator, 1 clip
F.TPL.add('bld_heis_etasje', { text: 'Hvilken etasje skal vi til?', voices: [''] });
// narrator at the first arrival
F.TPL.add('roy_her_bor', { text: 'Her bor {familie}.', slots: { familie: 'FAMILIES' }, voices: [''] });

// quirk lines: [realm] -> [line 1, line 2, child line]
const QUIRK = {
  blomst: ['Hei, lille rose, du er så fin i dag!', 'Blomstene mine liker at jeg synger for dem.', 'Mamma snakker med blomstene sine!'],
  hest: ['Se, jeg rir på ponnien min!', 'Ponnien min heter Kløver.', 'Ponnien min liker gulrøtter!'],
  boble: ['Ho ho ho, se på boblene!', 'Når jeg ler, kommer det bobler!', 'Pappa blåser bobler når han ler!'],
  skjell: ['Jeg teller skjellene mine hver morgen.', 'Dette skjellet er det fineste!', 'Pappa har så mange skjell!'],
  kake: ['Hvor er kaka mi?', 'Oi, jeg har smuler i skjegget!', 'Pappa har kake i skjegget!'],
  musikk: ['Tra-la-la, god dag!', 'Tra-la-la, jeg synger alt jeg sier!', 'Pappa synger alltid tra-la-la!'],
  stjerne: ['Jeg teller stjerner, også om dagen.', 'Se opp, der er en stjerne!', 'Pappa teller stjerner hele tiden!'],
  sno: ['Jeg tok bare en liten lur.', 'Snøen gjør meg så trøtt.', 'Pappa sover på tronen igjen!'],
  krystall: ['Se så det glitrer!', 'Jeg pusser krystallene mine hver dag.', 'Mamma pusser alt som glitrer!'],
  regnbue: ['Regnbuen min følger meg overalt!', 'Se, den har alle farger!', 'Vil du se regnbuen min?'],
};

// v3 §7.5 every king and queen has an own line (own voice), used in a tap, ambient and after an audience: [king, queen]
const OWN = {
  blomst: ['Jeg plukker blomster til Dronning Rosa hver dag.', 'Rosene mine dufter best når sola skinner.'],
  hest: ['Hestene mine er de raskeste i hele landet.', 'Jeg børster hestene hver morgen.'],
  boble: ['Jeg elsker å bade med masse bobler!', 'Vi seiler på innsjøen om sommeren.'],
  skjell: ['Havet synger for meg hver natt.', 'Jeg lager halskjeder av små skjell.'],
  kake: ['Ingenting er bedre enn varm kake!', 'I dag baker jeg en stor jordbærkake.'],
  musikk: ['Jeg spiller fløyte hver eneste dag.', 'Jeg danser når kongen spiller.'],
  stjerne: ['Om natten ser jeg på månen.', 'Jeg synger for stjernene før jeg sovner.'],
  sno: ['Jeg drømmer om varm kakao.', 'Jeg bygger snømenn med Prins Brage.'],
  krystall: ['Krystallene våre lyser i mørket.', 'Jeg liker alt som glitrer og skinner.'],
  regnbue: ['Etter regnet kommer alltid regnbuen.', 'Jeg maler blomster i alle farger.'],
};
// v3 §7.4/§7.10 per-realm ask lines (own voice) for one realm-flavoured task: [king (counts the realm thing, F.Royals.KING_COUNT),
// queen (any reading task), child (any writing task)]. No task answer in the line (a counted number / word never appears).
const ASK = {
  blomst: ['Kan du telle rosene i hagen min?', 'Vil du lese for meg mens jeg vanner rosene?', 'Kan du skrive et ord til blomsterbedet mitt?'],
  hest: ['Kan du telle eplene til hestene mine?', 'Vil du lese for meg mens hestene spiser?', 'Kan du skrive et ord til ponnien min?'],
  boble: ['Kan du telle endene på innsjøen?', 'Vil du lese for meg mens boblene flyr?', 'Kan du skrive et ord på båten min?'],
  skjell: ['Kan du telle skjellene mine?', 'Vil du lese for meg mens bølgene suser?', 'Kan du skrive et ord i sanden?'],
  kake: ['Kan du telle kakene mine?', 'Vil du lese for meg mens kaka står i ovnen?', 'Kan du skrive et ord på kaka mi?'],
  musikk: ['Kan du telle bjellene mine?', 'Vil du lese for meg før konserten?', 'Kan du skrive et ord til sangen min?'],
  stjerne: ['Kan du telle stjernene?', 'Vil du lese for meg før stjernene kommer fram?', 'Kan du skrive et ord på himmelen?'],
  sno: ['Kan du telle luene våre?', 'Vil du lese for meg mens snøen faller?', 'Kan du skrive et ord i snøen?'],
  krystall: ['Kan du telle krystallene mine?', 'Vil du lese for meg mens krystallene glitrer?', 'Kan du skrive et ord på glasset mitt?'],
  regnbue: ['Kan du telle blomstene i regnbuehagen?', 'Vil du lese for meg under regnbuen?', 'Kan du skrive et ord i alle regnbuens farger?'],
};

function addRealm(r) {
  const who = r.quirk && r.quirk.who, owner = who === 'k' ? r.king : who === 'q' ? r.queen : r.child;
  for (const p of [r.king, r.queen, r.child]) F.TPL.add('roy_jeg_' + p.id, { text: 'Jeg er ' + p.name + '!', voices: [p.voice] });
  F.TPL.add('roy_velk_' + r.id, { text: 'Velkommen til ' + r.castle + '!', voices: [r.king.voice] });
  const q = QUIRK[r.id];
  if (q && owner) {
    F.TPL.add('roy_q_' + r.id + '_1', { text: q[0], voices: [owner.voice] });
    F.TPL.add('roy_q_' + r.id + '_2', { text: q[1], voices: [owner.voice] });
    F.TPL.add('roy_c_' + r.id, { text: q[2], voices: [r.child.voice] });
  }
  const o = OWN[r.id];
  if (o) { F.TPL.add('roy_o_' + r.id + '_k', { text: o[0], voices: [r.king.voice] }); F.TPL.add('roy_o_' + r.id + '_q', { text: o[1], voices: [r.queen.voice] }); }
  const k = ASK[r.id];
  if (k) [r.king, r.queen, r.child].forEach((p, i) => F.TPL.add('roy_a_' + r.id + '_' + 'kqc'[i], { text: k[i], voices: [p.voice] }));
}
(F.REALMS || []).forEach(addRealm);
// Kong Pål says «Tra-la-la!» before he talks (musikk quirk; 1 clip in his voice)
{ const m = F.REALMS && F.REALMS.get ? F.REALMS.get('musikk') : null; if (m) F.TPL.add('roy_tralala', { text: 'Tra-la-la!', voices: [m.king.voice] }); }
F.ROY_LINES = { QUIRK, RV, OWN, ASK };
})();
