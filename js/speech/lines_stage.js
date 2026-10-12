/* Feslottet – speech templates for the task stage (F.Task protocol, hints, praise, counting). Owner: CORE+STAGE.
   Reading targets are NEVER in these lines. Numbers are digits in the text (TTS reads them). */
(function () {
'use strict';
const F = window.F;
const R4 = ['', 'konge', 'dronning', 'mia'];
// letter sounds for «lydering»: every value is a key of tools/static_audio.json (audio/ls/*.mp3 – real recorded, measured letter
// sounds, never TTS). Vowels and continuants are held; the stops b d g k p t are short «bə»-type clips. No letter NAMES.
F.LETTER_SOUND = {   // x is /k/+/s/ (F.LYD.units); sj/skj, kj/tj, ng and ei/øy/au are sound UNITS with their own clips (F.LYD.UNIT_CLIP)
  a: '/a/', b: '/b/', c: '/s/', d: '/d/', e: '/e/', f: '/f/', g: '/g/', h: '/h/', i: '/i/', j: '/j/', k: '/k/', l: '/l/', m: '/m/', n: '/n/', o: '/o/', p: '/p/', q: '/k/', r: '/r/', s: '/s/', t: '/t/', u: '/u/', v: '/v/', w: '/v/', y: '/y/', z: '/s/', æ: '/ae/', ø: '/oe/', å: '/aa/',
};
F.SETS = F.SETS || {};
// v5 WP-K3: + the unit clips the lead installed 11.10. 01:44 (_dev/letter_test/final/picks.json): /sj/ /kj/ /ng/ /ei/ /oey/ /au/ (and /h/)
const UNIT_CLIP = { sj: '/sj/', kj: '/kj/', ng: '/ng/', ei: '/ei/', 'øy': '/oey/', au: '/au/', h: '/h/' };
F.SETS.LETTER_SOUNDS = [...new Set(Object.values(F.LETTER_SOUND).concat(Object.values(UNIT_CLIP)))];
/* «lydering» by SOUND UNIT (grapheme), shared by stage.js wordHint, RW.lydering / RW.noteHint, the F29 rime hint and the wand.
   F.LYD.units(word) -> [{i0, n, s:[clip keys], alt?:[fallback keys], fx:'h'|'sj'|'kj'|null, silent}]   (i0/n = which letters light together)
   F.LYD.play(unit) -> Promise   F.LYD.letter(ch) -> Promise (one letter, e.g. a first-letter hint)
   - digraphs are one unit with ONE recorded clip: skj/sj/sk+i|y|ei|øy → /sj/, kj/tj/k+i|y|ei|øy (word start) → /kj/, ng → /ng/,
     nk → /ng/ + /k/, hv → /v/, hj/gj/dj (word start) → /j/
   - ei/øy/au: one gliding diphthong clip (/ei/ /oey/ /au/); h: its own breathy clip (/h/)
   - a double consonant is ONE held sound (both letters light), silent letters (kald, deilig, fugl) glow without a sound
   - v5 WP-K3: a unit whose clip is missing from the clip map (old audio/speech.js and no static fallback) falls back to u.alt (two vowel
     clips back to back, /n/ for ng) or, for h / sj / kj, to the old soft noise puff – never a letter name */
const LYD_V = 'aeiouyæøå';
const LYD_SILENT_D = /^(blad|rød|god|glad|brød|blod|tid|sted|med|ved|fred|mod|død|sid|rad|lad|gud|bred|vid)$/;
const LYD = F.LYD = {
  UNIT_CLIP,
  units(word) {
    const w = String(word || '').toLowerCase(), out = [], LS = F.LETTER_SOUND;
    let N = w.length; while (N > 0 && !/[a-zæøå]/.test(w[N - 1])) N--;   // trailing punctuation («brun.») does not hide a silent end
    let i = 0;
    while (i < N) {
      const c = w[i], r = w.slice(i);
      if (!/[a-zæøå]/.test(c)) { i++; continue; }
      let u;
      if (/^skj/.test(r)) u = { n: 3, fx: 'sj', s: [UNIT_CLIP.sj] };
      else if (/^sk(i|y|ei|øy)/.test(r)) u = { n: 2, fx: 'sj', s: [UNIT_CLIP.sj] };
      else if (/^sj/.test(r)) u = { n: 2, fx: 'sj', s: [UNIT_CLIP.sj] };
      else if (/^(kj|tj)/.test(r)) u = { n: 2, fx: 'kj', s: [UNIT_CLIP.kj] };
      else if (/^k(i|y|ei|øy)/.test(r) && i === 0) u = { n: 1, fx: 'kj', s: [UNIT_CLIP.kj] };
      else if (/^hv/.test(r)) u = { n: 2, s: ['/v/'] };
      else if (/^(hj|gj|dj)/.test(r) && i === 0) u = { n: 2, s: ['/j/'] };
      else if (/^g(i|y|ei|øy)/.test(r) && i === 0) u = { n: 1, s: ['/j/'] };
      else if (/^ng/.test(r)) u = { n: w[i + 2] === 'g' ? 3 : 2, s: [UNIT_CLIP.ng], alt: ['/n/'] };
      else if (/^nk/.test(r)) u = { n: 2, s: [UNIT_CLIP.ng, '/k/'], alt: ['/n/', '/k/'] };
      else if (/^ei/.test(r)) u = { n: 2, s: [UNIT_CLIP.ei], alt: ['/ae/', '/i/'], glide: true };
      else if (/^øy/.test(r)) u = { n: 2, s: [UNIT_CLIP['øy']], alt: ['/oe/', '/y/'], glide: true };
      else if (/^au/.test(r)) u = { n: 2, s: [UNIT_CLIP.au], alt: ['/ae/', '/u/'], glide: true };
      else if (c === 'h') u = { n: 1, fx: 'h', s: [UNIT_CLIP.h] };
      else if (c === 'x') u = { n: 1, s: ['/k/', '/s/'] };
      else if (!LYD_V.includes(c) && w[i + 1] === c) u = { n: 2, s: LS[c] ? [LS[c]] : [], held: true };
      else if (i === N - 1 && ((c === 'd' && /[lnr]/.test(w[i - 1] || '')) || (c === 'g' && w[i - 1] === 'i' && N > 3))) u = { n: 1, silent: true };
      else if (c === 'g' && i === N - 2 && w[i + 1] === 'l' && N > 3) u = { n: 1, silent: true };   // fugl
      else if (c === 'd' && i === N - 1 && LYD_SILENT_D.test(w.slice(0, N))) u = { n: 1, silent: true };   // blad, rød, god …
      else u = { n: 1, s: LS[c] ? [LS[c]] : [] };
      u.i0 = i; u.ch = w.slice(i, i + u.n); u.s = u.s || []; out.push(u); i += u.n;
    }
    return out;
  },
  // is there a recorded clip for this key (clip map, or audio.js's static letter-sound fallback)? Without a clip map (Node) → yes
  has(k) { try { return !(F.Speech && F.Speech.file) || !!F.Speech.file(k, ''); } catch (e) { return true; } },
  // the clip keys this unit plays: its own clips when all exist, else the fallback keys (null = a noise puff)
  keys(u) {
    if (!u || u.silent) return [];
    if (u.s.length && u.s.every(k => LYD.has(k))) return u.s;
    if (u.alt && u.alt.every(k => LYD.has(k))) return u.alt;
    return u.fx ? null : u.s;
  },
  // a soft noise puff – only when a unit's recorded clip is missing (old clip map)
  puff(fx) {
    const sf = F.sfx && F.sfx.noise; if (!sf) return F.T.sleep(260);
    if (fx === 'h') { sf(0.2, 0.09, 1100, 0.35); return F.T.sleep(260); }
    if (fx === 'kj') { sf(0.36, 0.11, 4300, 1.3); return F.T.sleep(420); }
    sf(0.42, 0.13, 2500, 1.1); return F.T.sleep(480);   // sj
  },
  async play(u) {
    if (!u) return;
    if (u.silent) { await F.T.sleep(380); return; }
    const ks = LYD.keys(u);
    if (ks === null) { await LYD.puff(u.fx); return; }
    if (!ks.length || !F.TPL.has('core_lyd')) { await F.T.sleep(200); return; }
    for (const s of ks) await F.SAY('core_lyd', { s }, '');
  },
  letter(ch) { const u = LYD.units(String(ch || '').toLowerCase())[0]; return u ? LYD.play(u) : F.T.sleep(160); },
};
F.SETS.CONSONANTS = 'bdfgklmnprstv'.split('');
// v3 (DESIGN3 §10.3): villagers, staff and kingdom royals praise in their own voice
const NPCV = ['tor', 'per', 'rolf', 'siv', 'kokk', 'vm', 'vk', 'barn', 'rk1', 'rk2', 'rd1', 'rd2'];
// v3 §10.4: solution openers (multi-sentence texts become one clip per sentence – only the openers are new)
const SOL = (rest) => ['Se her! ' + rest, 'Jeg viser deg! ' + rest, 'Sånn gjør vi det. ' + rest];
const T = {
  // praise after a first-try success (A) – v3: bigger pools (no-repeat picker + shared praise family in tpl.js)
  core_praise: { text: ['Flott!', 'Supert!', 'Så flink du er!', 'Helt riktig!', 'Bra jobba!', 'Hurra!', 'Du klarte det!', 'Ja, det stemmer!',
    'Kjempebra!', 'Det var helt riktig!', 'Du er god på dette!', 'Strålende!'], voices: R4 },
  // praise after a success with help (B / C)
  core_praise2: { text: ['Der ja!', 'Nå ble det riktig!', 'Bra, du fikk det til!', 'Sånn, ja!', 'Du ga deg ikke!', 'Nå fikk du det til!', 'Bra at du prøvde igjen!'], voices: R4 },
  // v3 §10.3: praise for the skill she just used (50 % of A's)
  core_praise_les: { text: ['Du leste det helt selv!', 'For en flink leser!', 'Du leste riktig!'], voices: R4 },
  core_praise_tall: { text: ['Du telte helt riktig!', 'Du kan tallene!', 'Riktig tall!'], voices: R4 },
  core_praise_skriv: { text: ['Du skrev det helt riktig!', 'Så fint du skrev!', 'Alle bokstavene stemte!'], voices: R4 },
  core_praise_npc: { text: ['Så flink du er!', 'Takk, det var helt riktig!', 'Du er kjempeflink!'], voices: NPCV },
  core_les: { text: 'Les lappen!', voices: R4 },
  // v3 §10.4 / §13.3: an impulsive wrong tap (< 1.5 s after the prompt) …
  core_tenk: { text: ['Tenk først, så trykker du.', 'Ikke så fort! Se godt etter først.', 'Rolig, rolig. Tenk først.', 'Ta den tiden du trenger.'] },
  // … and a tap while the prompt is still playing (not counted as a try)
  core_tenk_hor: { text: ['Hør ferdig først, så trykker du.', 'Vent til jeg er ferdig, så kan du trykke.'] },
  core_nesten: { text: ['Nesten!', 'Ikke helt.', 'Oi, nesten!', 'Ikke den. Vi ser en gang til.'] },
  core_sol_chip: { text: SOL('Trykk på den som lyser.') },
  core_sol_tiles: { text: SOL('Skriv bokstavene som lyser.') },
  core_sol_keys: { text: SOL('Trykk på tallene som lyser.') },
  // v3 §11.4 «Oppgaverekke» (F.Task.series)
  ser_en_til: { text: 'En til!' },
  ser_siste: { text: 'Og den siste!' },
  ser_alle: { text: 'Alle riktige! Så flink du er!' },
  ser_fikk: { text: 'Du fikk {n} riktige!', slots: { n: 'NUM_1_10' } },
  core_selv: { text: 'Prøv selv først!' },
  core_puff_hint: { text: 'Jeg hjelper deg litt.' },
  // numbers: every number name 0–100 (narrator) + counting 1–20 in the three royal voices
  core_num: { text: '{n}', slots: { n: 'NUM_0_100' } },
  core_count: { text: '{n}', slots: { n: 'NUM_1_20' }, voices: ['konge', 'dronning', 'mia'] },
  core_tiog: { text: 'Ti og {e}.', slots: { e: 'NUM_1_10' } },
  core_h_forskjell: { text: 'Se forskjellen!' },
  core_h_ten: { text: 'Se, her er ti på en gang.' },
  core_h_tieren: { text: 'Husk tieren!' },
  core_h_videre: { text: 'Vi teller videre fra ti.' },
  core_h_tell: { text: 'Vi teller sammen.' },
  core_h_tiere: { text: 'Det er mange tiere.' },
  // words
  core_h_lyd: { text: ['Hør på lydene.', 'Vi lytter lyd for lyd.', 'Hør hver lyd for seg.'] },
  core_h_first: { text: ['Hør på første lyd.', 'Hva hører du helt først?', 'Lytt til begynnelsen av ordet.', 'Hør godt på starten.'] },
  core_h_vowel: { text: 'Hør godt på denne lyden.' },
  core_h_silent: { text: 'Den hører vi ikke, men den skal være med.' },
  // v3 §10.6: no letter names ('To {l}-er' used them) – the existing rw_short wording
  core_h_double: { text: 'Kort lyd! Da skriver vi to like bokstaver.' },
  core_h_order: { text: 'Se på rekkefølgen.' },
  core_h_length: { text: 'Tell bokstavene.' },
  core_lyd: { text: '{s}', slots: { s: 'LETTER_SOUNDS' } },
  // demo format F06 (Telle-brettet)
  core_f06: { text: ['Hvor mange er det?', 'Tell! Hvor mange er det?'], voices: R4 },

  /* ---------- v4 WP-K «Tenk først» protocol + widget kit (DESIGN4 §3.8). Narrator (Puff). No task answers in any line. */
  // think-gate: how every question works (said for the first gated tasks of a session) – and a nudge for taps while it fills
  kit_gate_intro: { text: ['Når streken er full, kan du svare.'] },          // clarity §3.11: no «glitter» (one meaning per signal)
  kit_tenk_forst: { text: ['Først tenker vi litt.', 'Vi tenker litt før vi svarer.', 'Se på alle før du velger.'] },
  kit_gate: { text: ['Se på alle først.', 'Vent til streken er full.', 'Se godt etter, så kan du trykke.', 'Først tenker vi, så trykker vi.'] },   // (no «glitter»: clarity §2)
  // the MFFT sweep on look-alike options (formats call it before the gate)
  kit_se_alle: { text: ['Se på hver av dem, én for én.', 'Vi ser på alle sammen først.', 'Se nøye på hver av dem.'] },
  // rapid guess R: not judged, «look again» + the stimulus again
  kit_igjen: { text: ['Se en gang til.', 'Se en gang til, og tenk.', 'Hør en gang til.', 'Vi ser på den en gang til.', 'Ikke så fort! Se en gang til.', 'Se godt på alle sammen.'] },
  // re-deal after the first error / switch to the production twin
  kit_redeal: { text: ['Nå har jeg stokket om. Se på alle!', 'Nye valg! Se godt på hver av dem.', 'Jeg bytter litt. Prøv igjen.', 'Se, nå ligger de annerledes.'] },
  kit_twin: { text: ['Nå skal du lage svaret selv.', 'Nå skriver du svaret selv.', 'Prøv å lage det selv.'] },
  // «Hjelp meg»: worked step, then her turn or a sibling item
  kit_hjelp: { text: ['Vi gjør det sammen, steg for steg.', 'Jeg viser deg et lite steg.', 'Godt at du spør! Se her.', 'Vi tar det litt og litt.'] },
  kit_hjelp_igjen: { text: ['Her er ett steg til.', 'Vi tar ett steg til sammen.', 'Se her, ett steg til.'] },
  kit_hjelp_prov: { text: ['Nå prøver du!', 'Nå er det din tur.', 'Prøv du nå.', 'Nå klarer du resten.'] },
  kit_hjelp_ny: { text: ['Nå får du en ny en som ligner.', 'Her er en ny en. Prøv selv!', 'Nå prøver du en lignende.'] },
  // heuristic steps for hard puzzles (S.help steps, Kongens gåte later)
  kit_heur: { text: ['Prøv å tegne det.', 'Lag en tabell.', 'Gå baklengs.', 'Prøv med et lite tall først.', 'Finn et mønster.'] },
  // the big buttons
  kit_ferdig: { text: ['Trykk på Ferdig når du er klar.', 'Når du har alle, trykker du Ferdig.', 'Er du ferdig? Trykk på Ferdig.'] },
  kit_sjekk: { text: ['Trykk på Sjekk når du er klar.', 'Nå kan du sjekke.', 'Vil du sjekke? Trykk på Sjekk.'] },
  // targeted hints of the kit widgets (structure, never the answer)
  kit_h_look: { text: ['Se godt på hver av dem.', 'Se en gang til på alle.', 'Tenk på hva oppgaven spør om.'] },
  kit_h_alle: { text: ['Se på alle en gang til. Har du fått med alle?', 'Sjekk hver av dem.', 'Er det noen for mange, eller noen som mangler?'] },
  kit_h_order: { text: ['Se på rekkefølgen en gang til.', 'Hva kommer først? Og hva kommer etter?', 'Begynn med det første.'] },
  kit_h_sort: { text: ['Se på kurvene. Hva hører sammen?', 'Se på hver ting for seg.', 'Hvilken kurv passer til denne?'] },
  kit_h_stone: { text: ['Se på tallene på steinene.', 'Tell steinene fra et tall du kjenner.', 'Finn et tall du vet først.'] },
  kit_h_line: { text: ['Se på endene av linja.', 'Hvor er midten?', 'Er det nær starten, nær slutten, eller midt på?'] },
  kit_h_grid: { text: ['Se på hver rad og hver kolonne.', 'Finn en rute der bare én kan passe.', 'Se etter det som mangler.'] },
  kit_h_vox: { text: ['Se på tårnet fra alle kanter.', 'Tell klossene i hver søyle.', 'Sammenlign med bildet en gang til.'] },
  kit_h_balance: { text: ['Se hvilken side som er tyngst.', 'Den tunge siden går ned.', 'Hva må til for at de skal veie like mye?'] },
  kit_h_ribbon: { text: ['Hør på spørsmålet en gang til. Hva vil vi finne ut?', 'Er det hele båndet, eller bare en del?'] },
  // bar model (S.ribbons): tag the «?», then the number
  kit_rib_tag: { text: ['Hvor skal spørsmålstegnet være?', 'Sett spørsmålstegnet der vi ikke vet.', 'Trykk der svaret skal stå.'] },
  kit_rib_tall: { text: ['Hvor mange er det?', 'Skriv tallet.', 'Hva blir svaret?'] },
  // solution step (2nd error): she carries it out herself
  kit_sol_tapall: { text: SOL('Trykk på dem som lyser, og så Ferdig.') },
  kit_sol_order: { text: SOL('Legg kortet som lyser.') },
  kit_sol_sort: { text: SOL('Flytt den som lyser til kurven som lyser.') },
  kit_sol_stone: { text: SOL('Trykk på steinen som lyser.') },
  kit_sol_line: { text: SOL('Trykk der det lyser.') },
  kit_sol_grid: { text: SOL('Fyll rutene som lyser.') },
  kit_sol_vox: { text: SOL('Bygg til tallene stemmer.') },
  kit_sol_balance: { text: SOL('Legg på de som lyser.') },
  kit_sol_wheels: { text: SOL('Trykk på pila som lyser.') },
  kit_sol_ribbon: { text: SOL('Trykk på den som lyser.') },
  // look-back cues (the world acts out HER answer)
  kit_lb_se: { text: ['Se hva som skjedde!', 'Se på dette!', 'Se, sånn ble det.'] },
  kit_lb_frosk: { text: ['Se hvor frosken hopper!', 'Se, frosken hopper dit du trykket.', 'Frosken prøver ditt svar.'] },
  kit_lb_line: { text: ['Se, her trykket du.', 'Der satte du den. Se på endene.', 'Se hvor du trykket.'] },
  kit_lb_tarn: { text: ['Se, sånn ble tårnet ditt.', 'Se på hver etasje for seg.', 'Se, nå løfter vi lagene fra hverandre.'] },
  kit_lb_rad: { text: ['Se, sånn ble rekkefølgen din.', 'Se hva som skjer med din rekkefølge.', 'Se, sånn la du dem.'] },
  kit_lb_kurv: { text: ['Se hvor du la dem.', 'Se i kurvene en gang til.', 'Se, sånn sorterte du.'] },
  kit_bal_lik: { text: ['Se, nå er den i balanse!', 'Nå veier de like mye!', 'Helt i balanse!'] },
  kit_bal_tung: { text: ['Se, den tippet ned på denne siden.', 'Den siden var tyngst.', 'Den vippet. Det ble ikke likt.'] },
  // praise for careful thinking (a production / large-space A) – joins the praise family
  kit_bra_tenkt: { text: ['Du tenkte deg godt om!', 'Godt tenkt!', 'Du så nøye etter!', 'Smart tenkt!'], voices: R4 },

  /* ---------- v5 WP-K2 (DESIGN5 §6): hint phase contract, series end, narrator twins. Narrator. No task answers. */
  // an action phase without an answer (tap them all …) when the format left no instruction line to repeat
  kit_h_phase: { text: ['Først gjør vi dette.', 'Se hva du skal gjøre nå.'] },
  kit_h_tapall: { text: ['Trykk på hver av dem, én etter én.', 'Har du trykket på alle? Se etter flere.'] },
  // SKRIV before the first attempt: one sound unit per «Hjelp meg» (the first one uses core_h_first)
  kit_h_neste: { text: ['Hør på neste lyd.', 'Og hva hører du så?'] },
  // «Oppgaverekke» end (#44): one right, all right after a retry, none right
  ser_fikk1: { text: 'Du fikk én riktig!' },
  ser_alle_til: { text: ['Du fikk til alle sammen!', 'Alle ble riktige til slutt!'] },
  ser_prov: { text: ['Godt forsøkt! Vi øver mer en annen gang.', 'Bra at du prøvde! Neste gang går det lettere.'] },
};
/* v5 (logic #12, §3-E): narrator twins (third person) of first-person character lines owned by other speech files. tpl.js F.SAY speaks
   the twin whenever the original is asked for in the narrator's voice or in a voice it does not declare (the host is someone else).
   WP-R2 declares the twins of its own lines (lines_rw.js *_n, lines_num.js num_f22_*_n); these two are fallbacks registered only when
   the owner has not declared one (spec.twin / F.TPL.twin win). Slots are the same as the original's. */
const TWINS = {
  rw_f24_ok: ['Riktig krukke!', 'Den ja!'],                                   // «Takk! Nå kan jeg bake.» (kokk / vk / vm)
  num_f09_q2: { text: 'Kan du hente {n}?', slots: { n: 'NUM_10_20' } },          // «Kan jeg få {n}?» (vk / vm) – shares num_f09_q0's clips
};
for (const id in TWINS) { const v = TWINS[id]; T['tw_' + id] = Array.isArray(v) || typeof v === 'string' ? { text: v } : v; }
const twinJoin = () => { try { for (const id in TWINS) if (F.TPL.twin && !F.TPL.twinOf(id)) F.TPL.twin(id, 'tw_' + id); } catch (e) {} };
// tpl.js normally loads first (build_html sorts it first); be robust if it does not
if (F.TPL) { F.TPL.addAll(T); twinJoin(); } else F.on('boot', () => { F.TPL.addAll(T); twinJoin(); });
// v4: the thinking praise shares the no-repeat praise family (tpl.js)
const famJoin = () => { try { F.TPL.family('kit_bra_tenkt', 'praise'); } catch (e) {} };
if (F.TPL && F.TPL.family) famJoin(); else F.on('boot', famJoin);
})();
