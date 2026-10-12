/* Feslottet – number task formats F01–F22 (WP FORMATS-N).
   Every format is tap-only and plays on «brettet»: a small floating voxel diorama that slides up in front of the camera
   (below the NPC, above the task tray), so the real 3D things – apples, crystals, flowers, buns, coins, houses, stepping
   stones, baskets, a xylophone – are big, lit, countable and tappable wherever she is (park, village, castle room).
   Numbers are always separate HTML plaques/chips (Andika, big, gaps ≥14 px). All answers go through the stage kit S
   (js/game/tasks/stage.js): S.chips / S.keypad / S.tiles / S.yesno, or a board widget submitted with S.submit, so the
   §9.6 protocol (lock, targeted hint, solution → C) is the shared one; S.hint / S._solFn are overridden per format so
   hints happen ON the board (count-on from ten, contrast 14 vs 41 as rods + pieces, the fairy hopping the stones …).

   Public:
     F.Task.def('F01'…'F22', spec)     – registered at load AND re-registered on boot
     F.Task.pay(price, {itemName, model, modelOpts, voice, npc, place}) -> Promise<'A'|'B'|'C'|'poor'|null>
                                       (F12 for LIFE's shops; support mode below T-MENGDE M9; does NOT spend coins)
     F01 in the castle lift: v5 – the castle lift buttons are FLOORS (WP-X), so F01 answers on its own lift board («Til rom 11,
                                       takk!» for a real room plate 10–20) and F.NUM.liftOffer then rides to that plate's floor
     F.NUM.liftOffer({thing}) -> Promise<Result|null>  – CASTLE calls it when c_heis is pressed (null → open the free panel)
     F02 outdoors in a village (F.W.villages): the street's real doors are the answer (N2–N4, O1–O2); board elsewhere /
                                       for N5–N6 and O3 (params.board / ctx.board forces the board)
     N9 (F03/F04 rung 9, or params.timed): «tidsboblen» – a filling soap bubble, re-prompts when full, never a fail
     F22 also serves T-ORDEN O1–O2: someone guesses the stone after/before N → Ja/Nei
     F22 after an NPC paid: F.Task.offer({formats:['F22'], ctx:{npc, truth}}) asks «Ble det riktig?» (Ja/Nei = truth)
     item.params.model (a VOX id) makes F06/F08/F09/F12/F16/F19/F20/F22 count/sell that thing (stall goods, wishes)
     F.NUM.say(tplId, slots, voice)    – F.SAY with voice fallback to '' when the voice isn't declared
     F.NUM.cur                         – the running number task {kit, format, item, builder?} (tests)
     F.NUM.mkItem(fmtId, {strand, rung, sup, target, params}) – a bank item for a format (tests)
     F.NUM.Board / TenView / Builder / piece / numberPicture / tenDef – the diorama kit (other WPs may reuse)
     F.dbg.num.run(fmtId, {rung, sup, target, params, ctx}) – start a format through F.Task.run

   v4 (WP-R, DESIGN4 §4.2 / hint_leaks P0 + SYNTHESIS §3.3 retrofits):
     – listening targets are SECRET: K.secret(t) sets S.secret at every T-NAVN / T-SKRIV ask (F01 F02 F03 F04 F14 F15 F16 + the N9
       re-asks); the subtitle shows «…» (WP-K's mask), the audio is unchanged. Hints after the 1st error never print the target's
       digits (numHint masks the ones digit too; contrast pictures give the target a «?» plaque). T-MENGDE/T-ORDEN numerals are
       the given stimulus and stay visible.
     – answers: K.answerNum(values) = s0 chips (2–3), s1 ≥ 5 chips (contrast family), s2 the keypad with 3 neutral boxes + ✓
       (no length leak; showLen only at s0/s1) → item.g / item.mode are set (guess index).
     – counting aloud: K.countMode = 'all' (s0) | 'tens' (s1: only full tens are spoken) | 'none' (s2 / noCounter); the final
       count is never spoken before the question (F08), the F11 cloth has a fixed width, the F13 meter is s0 only, F13 «add» at
       s2 shows plaques only, F19 contrast is a hint (never a pre-play), F22 plants the slip in the pointing, F02 board
       «etter/før» never shows the answer as the labelled neighbour (a «?» house + number answer).
     – retrofits: F01 lift panel with 40 floors for N10–N11, F03/F04 8–12 targets with the whole contrast family, F05 N12
       (number word 20–100 → numeral), F06/F08 keypad at s2, F14/F16 fixed-slot keypad, F18 tap every missing stone (S.stones
       when the kit has it), F19 order 4 baskets, F22 bundle of 3 counts (tap the wrong ones, then fix one).

   v5 (WP-R2, DESIGN5 §7 – playtest2 «hints», logic_audit):
     – HINT PHASES: K.hint(post, pre) + K.phase(name, {answer, nudge, replay}) (WP-K2's S.phase contract, feature-detected; the same
       effect without it). Before any attempt Puff / «Hjelp meg» get the phase's nudge – structure only (tenNudge: the full tens BELOW
       the total glow + «Se: en full rad er ti.», the rest glow without numbers, «Tell videre fra ti selv.»); after an error the targeted
       hint with her answer (tenAfterError: the count along from ten is spoken only at s0). F08 tap phase = «Trykk på hver av dem én
       gang.» + ONE untapped thing glows (free); F12 purse phase = the purse; F07/F09/F10 never «for få» before an attempt; F10 r8 / F11
       never pop or uncover the hidden ones (the peek is the solution step); F22 replays HIS count; F02 reads only visible numbers.
     – F12 REST MODE (#2): spec.restMode; F.Task.pay(p, {rest: h}) – the tag shows p, h coins lie on the counter, she lays on m = p − h,
       m is never spoken. F13 ctx.pocket / params.pocket (#23): «Pungen har …», no piggy lines, no number outside its clip set.
     – F19 / F20 / F21 later steps arm with {cont: true} (one answer, WP-K2); the F20 lead line is part of the prompt.
     – F10 honours params.model (#3/#4; neutral lines), F22 truth from the built plan (#13), thingFor plurals from F.WORDS for theme
       models (nøtter, kongler …), «Det koster» (#38), no hard-coded Per / Kokk voices (#24), F17 never a «15» fallback. */
(function () {
'use strict';
const F = window.F, U = F.U;
const NUM = F.NUM = F.NUM || {};
const V3 = THREE.Vector3;
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);

/* =====================================================================================================================
   0. speech helpers
   ===================================================================================================================== */
// the asker's voice when the template declares it; else Puff ('') – or the template's first voice when it has no narrator version
function vOK(id, voice) { const t = F.TPL.all[id]; if (!t) return ''; if (voice && t.voices.includes(voice)) return voice; return t.voices.includes('') ? '' : t.voices[0]; }
NUM.say = function (id, slots, voice) { return F.SAY(id, slots || {}, vOK(id, voice)); };
const say = NUM.say;
const sayN = n => say('core_num', { n: U.clamp(Math.round(n), 0, 100) });
const sayTotal = n => n >= 0 && n <= 40 ? say('num_det_ble', { n }) : sayN(n);
// v5r2: the narrator's number inside a hint chain – silent once the stage mutes the chain (S.mute: solved / stale / ended)
const sayQ = (S, n) => (S && S.mute && S.mute()) ? Promise.resolve() : sayN(n);
// speak a number now (drops queued, never cuts the current clip)
const inSet = (name, v) => { try { return F.SETS.get(name).some(x => String(x) === String(v)); } catch (e) { return false; } };
// v5: a new line whose clip is not generated yet would be a silent subtitle in real play – fall back to a recorded line until the
// lead's gen_audio run (tests (#test) always take the new line)
const recorded = id => { try { if (F.flags.test || !window.SPEECH || !F.TPL.has(id)) return F.TPL.has(id); return !!F.Speech.file(F.TPL.text(id, {}, 0), ''); } catch (e) { return F.TPL.has(id); } };
const pickRec = (...ids) => ids.find(recorded) || null;
const kosterId = (n, voice) => { try { if (F.flags.test || !window.SPEECH || !F.TPL.has('num_f12_koster_den')) return 'num_f12_koster'; const t = F.TPL.text('num_f12_koster', { n }, 0); return F.Speech.file(t, voice || '') ? 'num_f12_koster' : 'num_f12_koster_den'; } catch (e) { return 'num_f12_koster'; } };

/* =====================================================================================================================
   1. fallback voxel pieces (prefix fx_n_). Real castable models (eple, egg, bolle…) are used when MODELS-2 has them.
   ===================================================================================================================== */
const def = (id, d) => { if (!F.VOX.has(id)) F.VOX.def(id, d); };
def('fx_n_eple', { size: [9, 11, 9], scale: 1 / 16, build(v) {
  v.sphere(4, 4, 4, 3.9, 'red'); v.set(2, 6, 6, 'coral'); v.set(3, 7, 6, 'coral');
  v.set(4, 8, 4, 'woodDark'); v.set(4, 9, 4, 'woodDark'); v.set(5, 9, 4, 'leaf'); v.set(6, 9, 4, 'leaf'); v.set(6, 10, 4, 'leaf2');
} });
def('fx_n_egg', { size: [7, 9, 7], scale: 1 / 16, build(v) { v.ellipsoid(3, 4, 3, 3, 4.4, 3, 'cream'); v.set(2, 6, 5, 'white'); } });
def('fx_n_bolle', { size: [11, 6, 11], scale: 1 / 16, build(v) {
  v.ellipsoid(5, 1, 5, 5.2, 4, 5.2, 'woodLight'); v.paint((x, y, z) => y >= 3 ? 'honey' : null);
  [[3, 4], [6, 3], [5, 6], [7, 6], [4, 7]].forEach(([x, z]) => { for (let y = 5; y >= 0; y--) if (v.get(x, y, z)) { v.set(x, y, z, 'white'); break; } });
} });
def('fx_n_rose', { size: [7, 12, 7], scale: 1 / 16, build(v) {
  v.line(3, 0, 3, 3, 7, 3, 'green'); v.set(4, 3, 3, 'leaf'); v.set(2, 5, 3, 'leaf'); v.sphere(3, 9, 3, 2.6, 'rose'); v.set(3, 11, 3, 'cherry'); v.set(3, 10, 5, 'cherry');
} });
def('fx_n_krystall', { size: [6, 7, 6], scale: 1 / 14, build(v) {
  v.box(1, 0, 1, 4, 6, 4, 'crystal'); v.box(0, 1, 1, 5, 5, 4, 'crystal'); v.box(1, 1, 0, 4, 5, 5, 'crystal'); v.box(2, 2, 2, 3, 4, 3, 'gem2');
} });
def('fx_n_blomst', { size: [7, 11, 7], scale: 1 / 15, build(v) {
  v.cyl(3, 0, 3, 2.6, 3, 'woodRed'); v.cyl(3, 3, 3, 2, 1, 'soil'); v.line(3, 3, 3, 3, 7, 3, 'green'); v.set(4, 5, 3, 'leaf');
  for (const [x, z] of [[2, 3], [4, 3], [3, 2], [3, 4], [2, 2], [4, 4], [2, 4], [4, 2]]) v.set(x, 8, z, 'pink');
  v.set(1, 8, 3, 'pink'); v.set(5, 8, 3, 'pink'); v.set(3, 8, 1, 'pink'); v.set(3, 8, 5, 'pink'); v.set(3, 8, 3, 'yellow'); v.set(3, 9, 3, 'pink');
} });
def('fx_n_boble', { size: [8, 8, 8], scale: 1 / 15, build(v) {
  v.sphere(3.5, 3.5, 3.5, 3.6, 'ice');
  v.paint((x, y, z) => { const a = Math.atan2(z - 3.5, x - 3.5), k = (a + Math.PI) / (2 * Math.PI) * 6 + y * 0.7; const m = Math.floor(k) % 4; return m === 0 ? 'sky' : m === 1 ? 'lavender' : m === 2 ? 'mint' : 'pink'; });
  v.paint((x, y, z) => (y >= 5 && z >= 5 && x <= 3) ? 'white' : null);
} });
def('fx_n_stjerne', { size: [11, 11, 3], scale: 1 / 16, build(v) {
  const cx = 5, cy = 5;
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const dx = x - cx, dy = y - cy + 0.4, r = Math.hypot(dx, dy), a = Math.atan2(dx, dy);
    const k = Math.cos(5 * a) * 0.5 + 0.5, R = 2.4 + 3.1 * Math.pow(k, 2.2);
    if (r <= R) { v.set(x, y, 0, 'gold'); v.set(x, y, 1, r < 2 ? 'butter' : 'yellow'); v.set(x, y, 2, 'gold'); }
  }
} });
function coinDef(id, r, label) {
  def(id, { size: [2 * r + 1, 2 * r + 1, 2], scale: 1 / 16, build(v) {
    for (let y = 0; y <= 2 * r; y++) for (let x = 0; x <= 2 * r; x++) { const d = Math.hypot(x - r, y - r); if (d <= r + 0.3) { v.set(x, y, 0, 'honey'); v.set(x, y, 1, d > r - 0.8 ? 'honey' : 'gold'); } }
    const w = label.length * 4 - 1; v.text(label, r - Math.floor(w / 2), r - 2, 1, 'woodLight');
  } });
}
coinDef('fx_n_mynt1', 4, '1');
coinDef('fx_n_mynt10', 7, '10');
def('fx_n_hus', { size: [14, 16, 12], scale: 1 / 10, build(v, o) {
  const wall = o.wall || 'cream', roof = o.roof || 'roofRed';
  v.box(0, 0, 0, 13, 8, 11, wall);
  for (let i = 0; i <= 5; i++) { const y = 9 + i; v.box(1, y, i + 1, 12, y, 10 - i, wall); v.box(0, y, i, 13, y, i, roof); v.box(0, y, 11 - i, 13, y, 11 - i, roof); }
  v.box(0, 15, 5, 13, 15, 6, roof);
  v.box(5, 0, 11, 8, 5, 11, 'woodRed'); v.set(7, 3, 11, 'gold');
  v.box(1, 3, 11, 3, 5, 11, 'glass'); v.box(10, 3, 11, 12, 5, 11, 'glass');
  v.box(0, 0, 11, 13, 0, 11, 'stoneDark'); v.box(5, 0, 11, 8, 0, 11, 'woodDark');
} });
def('fx_n_kiste', { size: [12, 10, 9], scale: 1 / 11, build(v) {
  v.box(0, 0, 0, 11, 5, 8, 'woodRed'); v.box(0, 1, 0, 11, 1, 8, 'gold'); v.box(1, 5, 1, 10, 5, 7, 'woodDark');
  v.box(5, 3, 8, 6, 5, 8, 'gold');
}, parts: { lid: { pivot: [6, 6, 0], build(v) { v.box(0, 6, 0, 11, 8, 8, 'woodRed'); v.box(0, 9, 1, 11, 9, 7, 'woodRed'); v.box(0, 7, 0, 11, 7, 8, 'gold'); v.box(5, 6, 8, 6, 7, 8, 'gold'); } } } });
def('fx_n_heis', { size: [18, 26, 6], scale: 1 / 12, build(v) {
  v.box(0, 0, 0, 17, 25, 1, 'stone2'); v.box(0, 0, 0, 1, 25, 5, 'gold'); v.box(16, 0, 0, 17, 25, 5, 'gold'); v.box(0, 23, 0, 17, 25, 5, 'gold');
  v.box(2, 0, 2, 15, 0, 5, 'roofLilac'); v.box(7, 24, 5, 10, 24, 5, 'butter');
}, parts: {
  dl: { pivot: [2, 0, 4], build(v) { v.box(2, 1, 3, 8, 22, 4, 'steel'); v.box(3, 9, 4, 3, 12, 4, 'silver'); } },
  dr: { pivot: [15, 0, 4], build(v) { v.box(9, 1, 3, 15, 22, 4, 'steel'); v.box(14, 9, 4, 14, 12, 4, 'silver'); } },
} });
def('fx_n_stein', { size: [10, 3, 8], scale: 1 / 9, build(v) { v.ellipsoid(4.5, 0, 3.5, 4.8, 2.6, 3.8, 'grey'); v.paint((x, y, z) => y >= 2 ? ((x + z) % 5 === 0 ? 'leaf2' : 'silver') : null); } });
def('fx_n_kurv', { size: [16, 8, 10], scale: 1 / 12, build(v) {
  v.hollow(0, 0, 0, 15, 5, 9, 'woodLight'); v.box(0, 5, 0, 15, 5, 0, 'wood'); v.box(0, 5, 9, 15, 5, 9, 'wood'); v.box(1, 0, 1, 14, 0, 8, 'woodLight');
  v.paint((x, y, z, c) => (y % 2 === 1 && (x + z) % 2 === 0 && y < 5) ? 'wood' : null);
} });
def('fx_n_brev', { size: [10, 2, 7], scale: 1 / 16, build(v) { v.box(0, 0, 0, 9, 0, 6, 'white'); v.line(0, 1, 6, 4, 1, 3, 'cream2'); v.line(9, 1, 6, 5, 1, 3, 'cream2'); v.set(4, 1, 3, 'rose'); v.set(5, 1, 3, 'rose'); } });
def('fx_n_pung', { size: [10, 9, 6], scale: 1 / 12, build(v) {
  v.ellipsoid(4.5, 3.5, 2.5, 4.6, 3.8, 2.6, 'roofPink'); v.box(2, 7, 1, 7, 8, 4, 'gold'); v.set(4, 4, 5, 'gold'); v.set(5, 4, 5, 'gold');
} });
// a wee fairy figure that hops on the stepping stones (fairy colour per kind)
def('fx_n_fe', { size: [9, 14, 5], scale: 1 / 16, build(v, o) {
  const dress = o.dress || 'lilac';
  v.cone(4, 0, 2, 3.2, 7, dress); v.sphere(4, 9, 2, 2.4, 'skin'); v.box(2, 11, 1, 6, 12, 3, o.hair || 'hairBlond');
  v.set(3, 9, 4, 'black'); v.set(5, 9, 4, 'black'); v.box(0, 5, 0, 1, 9, 0, 'glass'); v.box(7, 5, 0, 8, 9, 0, 'glass'); v.set(4, 13, 2, 'gold');
} });
const FAIRY_DRESS = { krystall: 'ice', blomst: 'pink', boble: 'sky', stjerne: 'butter' };

/* containers: rows of ten (rail/bed), egg-box / baking-tray frames (2×5), board bases */
function frameDef(kind, cols, rows, cellV, gapV) {
  const id = `fx_n_frame_${kind}_${cols}x${rows}_${cellV}_${gapV}`;
  if (F.VOX.has(id)) return id;
  const W = cols * cellV + gapV + 2, D = rows * cellV + 2;
  const C = { rail: ['crystal', 'ice'], bed: ['woodRed', 'soil'], tray: ['steel', 'silver'], carton: ['cream2', 'peach'], plate: ['white', 'white'],
    rope: ['lavender', 'mint'], star: ['gold', 'butter'], cloth: ['roofPink', 'blossom'], wood: ['wood', 'woodLight'] }[kind] || ['wood', 'woodLight'];
  F.VOX.def(id, { size: [W, 2, D], scale: 1 / 10, build(v) {
    v.box(0, 0, 0, W - 1, 0, D - 1, C[1]);
    v.box(0, 1, 0, W - 1, 1, 0, C[0]); v.box(0, 1, D - 1, W - 1, 1, D - 1, C[0]); v.box(0, 1, 0, 0, 1, D - 1, C[0]); v.box(W - 1, 1, 0, W - 1, 1, D - 1, C[0]);
    if (gapV) { const gx = 1 + 5 * cellV; v.box(gx, 1, 0, gx + gapV - 1, 1, D - 1, C[0]); }
    if (rows > 1) for (let r = 1; r < rows; r++) v.box(0, 1, 1 + r * cellV - 1, W - 1, 1, 1 + r * cellV - 1, C[0]);
  } });
  return id;
}
function boardDef(style, w, d) {
  const nx = Math.round(w * 8), nz = Math.round(d * 8), id = `fx_n_board_${style}_${nx}x${nz}`;
  if (F.VOX.has(id)) return id;
  const S = {
    wood: { top: 'woodLight', rim: 'wood', under: ['woodDark', 'woodDark', 'wood'] },
    grass: { top: 'grass', rim: 'grassDark', under: ['soil', 'soil', 'grassDark'] },
    pond: { top: 'water', rim: 'sand', under: ['soil', 'sand', 'sand'] },
    counter: { top: 'cream2', rim: 'woodRed', under: ['woodRed', 'woodRed', 'woodRed'] },
    street: { top: 'pathStone', rim: 'grass', under: ['soil', 'soil', 'grassDark'] },
    cloud: { top: 'ice', rim: 'sky', under: ['lavender', 'sky', 'ice'] },
    bakery: { top: 'peach', rim: 'woodRed', under: ['woodDark', 'woodDark', 'woodRed'] },
    velvet: { top: 'purple', rim: 'gold', under: ['plum', 'plum', 'plum'] },          // fairy magic: crystals / bubbles / stars pop on it
  }[style] || { top: 'woodLight', rim: 'wood', under: ['woodDark', 'woodDark', 'wood'] };
  F.VOX.def(id, { size: [nx, 5, nz], scale: 1 / 8, build(v) {
    for (let l = 0; l < 3; l++) { const k = 3 - l; v.box(k, l, k, nx - 1 - k, l, nz - 1 - k, S.under[l]); }
    v.box(0, 3, 0, nx - 1, 3, nz - 1, S.rim); v.box(1, 3, 1, nx - 2, 3, nz - 2, S.top);
    if (style === 'pond') { v.box(0, 3, 0, nx - 1, 3, 1, 'sand'); v.box(0, 3, nz - 2, nx - 1, 3, nz - 1, 'sand'); v.box(0, 3, 0, 1, 3, nz - 1, 'grass'); v.box(nx - 2, 3, 0, nx - 1, 3, nz - 1, 'grass'); }
    if (style === 'grass' || style === 'street' || style === 'pond') {
      const r = U.rng(nx * 31 + nz);
      for (let i = 0; i < nx * 0.5; i++) { const x = Math.floor(r() * nx), z = r() < 0.5 ? Math.floor(r() * 2) : nz - 1 - Math.floor(r() * 2); if (v.get(x, 3, z)) v.set(x, 4, z, U.pick(r, ['blossom', 'yellow', 'white', 'leaf2'])); }
    }
    if (style === 'velvet') { const r = U.rng(nx * 5 + nz); for (let i = 0; i < nx * nz * 0.03; i++) { const x = 1 + Math.floor(r() * (nx - 2)), z = 1 + Math.floor(r() * (nz - 2)); v.set(x, 3, z, U.pick(r, ['lilac', 'lavender', 'plum'])); } }
    if (style === 'cloud') { const r = U.rng(nx * 7 + nz); for (let i = 0; i < nx * nz * 0.04; i++) { const x = 1 + Math.floor(r() * (nx - 2)), z = 1 + Math.floor(r() * (nz - 2)); v.set(x, 3, z, U.pick(r, ['white', 'butter', 'lavender'])); } }
    if (style === 'wood' || style === 'bakery' || style === 'counter') v.paint((x, y, z) => (y === 3 && x > 0 && z > 0 && x < nx - 1 && z < nz - 1 && z % 4 === 0) ? S.rim === 'wood' ? 'wood' : null : null);
  } });
  return id;
}

/* =====================================================================================================================
   2. the floating diorama board (3D HUD in front of the camera) + its HTML plaques + screen-space picking
   ===================================================================================================================== */
let labelLayer = null;
function layer() {
  if (!labelLayer) { labelLayer = document.createElement('div'); labelLayer.id = 'nlabels'; document.body.appendChild(labelLayer); }
  return labelLayer;
}
const tmpV = new V3(), fwd = new V3(), upv = new V3(), boxT = new THREE.Box3(), sizeT = new V3();
let activeBoard = null;
function noShadow(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); return o; }

const TOPMAT = new WeakMap();          // v5d: opaque material → its transparent twin (board drawn on top of the world)
function Board(o) {
  o = o || {};
  if (activeBoard) activeBoard.dispose();
  const B = { w: o.w || 6.4, d: o.d || 2.6, tilt: o.tilt != null ? o.tilt : 0.8, yNdc: o.yNdc != null ? o.yNdc : -0.02, scale: o.scale || 1, picks: [], labels: [], locked: false, alive: true, appear: 0 };
  const root = B.root = new THREE.Group(); root.name = 'numBoard';
  const tg = new THREE.Group(); tg.rotation.x = B.tilt; root.add(tg);
  const top = B.top = new THREE.Group(); tg.add(top);
  if (o.style !== 'none') {
    const base = F.VOX.make(boardDef(o.style || 'wood', B.w, B.d));
    base.position.y = -0.5; top.add(base); B.base = base;
  }
  noShadow(root);
  /* v5d WP-R3 (WP-G request; wave-1 WP-M observation): the board is drawn ON TOP of the world – a room prop or a sign between the camera
     and the floating board (castle «UT» sign, trees) never hides it. One hook mesh in the TRANSPARENT pass clears the depth buffer after
     the whole world (opaque + transparent, so the world keeps its own occlusion) and right before the board's meshes, which render in
     that pass too (renderOrder 901 + their own small order; opaque materials get a cached transparent twin with opacity 1 – it looks the
     same and keeps depth writes, so the board keeps its own depth order). Set each frame in place(), so later objects are covered too.
     o.onTop === false keeps the old behaviour. */
  let hooks = null, hookGeo = null, hookMats = null;
  if (o.onTop !== false && NUM.onTop !== false && o.style !== 'none' && THREE.BufferGeometry) {   // (style none = the street itself is the stage: F02 village)
    hookGeo = new THREE.BufferGeometry();
    hookMats = [new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 })];
    hooks = hookMats.map(m => { const h = new THREE.Mesh(hookGeo, m); h.frustumCulled = false; h.renderOrder = 900; h.userData.numHook = true;
      // (the depth mask must be on for the clear: the world object drawn just before may have had depthWrite: false – glass, the fairy's
      // see-through silhouette – and gl.clear honours the mask)
      h.onBeforeRender = r => { try { if (r.state && r.state.buffers && r.state.buffers.depth) r.state.buffers.depth.setMask(true); r.clearDepth(); } catch (e) { /* no depth buffer */ } }; root.add(h); return h; });
  }
  // a material made for this board (id after the board's start: meter segments, rings, glow clones – code may keep a reference and
  // recolour it later) turns transparent IN PLACE; an older, possibly world-shared material (the voxel palette) gets a cached twin
  const mid0 = (() => { try { const m0 = new THREE.MeshBasicMaterial(), id = m0.id; m0.dispose(); return id; } catch (e) { return Infinity; } })();
  const twin = m => { if (!m || m.transparent) return m;
    if (m.id > mid0) { m.transparent = true; m.needsUpdate = true; return m; }
    let t = TOPMAT.get(m); if (!t) { t = m.clone(); t.transparent = true; t.opacity = m.opacity != null ? m.opacity : 1; t.depthWrite = true; TOPMAT.set(m, t); } return t; };
  const onTop = () => { if (!hooks) return; hooks.forEach(h => { h.renderOrder = 900; });
    root.traverse(x => {
      if (x.userData.numHook) return;
      const r = x.renderOrder || 0; if (r < 900) x.renderOrder = 901 + r;
      // every frame: a glow / restore may have put an opaque material back (glowObj keeps the material it found)
      const m = x.material; if (!m) return;
      if (Array.isArray(m)) { if (m.some(q => q && !q.transparent)) x.material = m.map(twin); } else if (!m.transparent) x.material = twin(m);
    }); };
  // the effect particles (F.FX pools: sparkles, bursts, hearts over the board's things) draw after the board while it is up (else the
  // board would cover them); restored on dispose
  const fxBoost = new Map();
  const boostFx = () => { if (!hooks) return; const sc = F.R.cur; if (!sc) return;
    for (const c of sc.children) { if (!c.userData || !c.userData.fxPool) continue; if (!fxBoost.has(c)) fxBoost.set(c, { ro: c.renderOrder, mat: c.material });
      c.renderOrder = 960; if (c.material && !Array.isArray(c.material) && !c.material.transparent) c.material = twin(c.material); } };
  const unboostFx = () => { fxBoost.forEach((v, c) => { c.renderOrder = v.ro; c.material = v.mat; }); fxBoost.clear(); };
  B.onTop = !!hooks;
  let scene = F.R.cur; scene.add(root);
  B.dist = function () {
    const cam = F.R.camera, t = Math.tan(cam.fov * Math.PI / 360);
    const dW = (B.w + 0.5) / (0.82 * 2 * t * cam.aspect);
    const dH = (B.d * Math.sin(B.tilt) + (o.h || 0.9) * Math.cos(B.tilt)) / (0.44 * 2 * t);
    return Math.max(5.5, dW, dH) / B.scale;
  };
  function place() {
    if (!B.alive) return;
    if (F.R.cur !== scene) { scene.remove(root); scene = F.R.cur; scene.add(root); }
    const cam = F.R.camera, D = B.dist();
    cam.getWorldDirection(fwd); upv.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const halfH = Math.tan(cam.fov * Math.PI / 360) * D;
    // keep the person who asks visible: if they stand in the lower half of the view, the board goes up instead
    if (o.avoid && o.avoid.isVector3) { tmpV.copy(o.avoid).project(cam); const want = tmpV.z < 1 && tmpV.y < -0.05 ? 0.3 : (o.yNdc != null ? o.yNdc : -0.02); B.yNdc += (want - B.yNdc) * 0.15; }
    const k = ease(Math.min(1, B.appear));
    root.position.copy(cam.position).addScaledVector(fwd, D).addScaledVector(upv, halfH * (B.yNdc - (1 - k) * 1.4));
    root.quaternion.copy(cam.quaternion);
    root.updateMatrixWorld(true);
    onTop(); boostFx();
    // plaques
    const r = F.R.renderer.domElement.getBoundingClientRect();
    for (const L of B.labels) {
      if (!L.visible || !L.anchor.visible && !L.always) { L.el.style.display = 'none'; continue; }
      L.anchor.getWorldPosition(tmpV); tmpV.addScaledVector(upv, L.dy);
      tmpV.project(cam);
      L.el.style.display = '';
      L.el.style.transform = `translate(${(r.left + (tmpV.x + 1) / 2 * r.width).toFixed(1)}px, ${(r.top + (1 - tmpV.y) / 2 * r.height).toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
  B.place = place;
  const offTick = F.on('tick', dt => { if (B.appear < 1) B.appear = Math.min(1, B.appear + dt / 0.45); });
  const offPre = F.on('preRender', place);
  // add an object onto the board (local board coords: x right, z toward viewer, y up)
  B.add = function (obj, x, z, y) { obj.position.set(x || 0, y || 0, z || 0); top.add(noShadow(obj)); return obj; };
  // HTML plaque pinned to a board object (numbers, words, prices) – big, Andika, separate
  B.label = function (anchor, text, lo) {
    lo = lo || {};
    const el = document.createElement('div');
    el.className = 'nlabel ' + (lo.cls || 'num');
    el.textContent = text;
    if (lo.onClick) { el.classList.add('click'); el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!B.locked) lo.onClick(e); }); }
    layer().appendChild(el);
    const L = { el, anchor, dy: lo.dy != null ? lo.dy : 0.6, visible: true, always: !!lo.always,
      set(t) { el.textContent = t; return L; }, show(b) { L.visible = b; el.style.display = b ? '' : 'none'; return L; },
      cls(c, on) { el.classList.toggle(c, on !== false); return L; }, remove() { el.remove(); const i = B.labels.indexOf(L); if (i >= 0) B.labels.splice(i, 1); } };
    B.labels.push(L);
    return L;
  };
  // tappable objects: nearest projected centre within its projected radius (min 46 px)
  B.pick = function (obj, fn, po) { const p = { obj, fn, min: (po && po.min) || 46, on: true }; B.picks.push(p); return p; };
  B.unpick = obj => { B.picks = B.picks.filter(p => p.obj !== obj); };
  B.screenOf = function (obj) {
    const cam = F.R.camera, r = F.R.renderer.domElement.getBoundingClientRect();
    boxT.setFromObject(obj); boxT.getCenter(tmpV); boxT.getSize(sizeT);
    const dist = tmpV.distanceTo(cam.position), rad = Math.max(sizeT.x, sizeT.y, sizeT.z) * 0.55;
    const pxR = rad / (dist * Math.tan(cam.fov * Math.PI / 360)) * r.height / 2;
    tmpV.project(cam);
    return { x: r.left + (tmpV.x + 1) / 2 * r.width, y: r.top + (1 - tmpV.y) / 2 * r.height, r: pxR };
  };
  B.hit = function (cx, cy) {
    let best = null, bd = Infinity;
    for (const p of B.picks) {
      if (!p.on || !p.obj.visible || !p.obj.parent) continue;
      const s = B.screenOf(p.obj), d = Math.hypot(s.x - cx, s.y - cy), lim = Math.max(p.min, s.r);
      if (d < lim && d / lim < bd) { bd = d / lim; best = p; }
    }
    return best;
  };
  const cv = F.R.renderer.domElement;
  const onDown = e => {
    if (!B.alive) return;
    const p = B.hit(e.clientX, e.clientY);
    e.stopPropagation(); e.preventDefault();
    if (p && !B.locked) { F.sfx.click(); p.fn(p.obj); }
  };
  const onMove = e => { if (B.alive) cv.style.cursor = B.hit(e.clientX, e.clientY) ? 'pointer' : 'default'; };
  cv.addEventListener('pointerdown', onDown, true);
  cv.addEventListener('pointerup', onDown_block, true);
  cv.addEventListener('pointermove', onMove, true);
  function onDown_block(e) { if (B.alive) { e.stopPropagation(); } }
  const prevInput = F.Input.enabled, prevFrozen = F.Player.frozen;
  const uiOpen = () => !!(F.UI && F.UI.isOpen && F.UI.isOpen()), prevOpen = uiOpen();   // a panel froze her when the board came up
  F.Input.enabled = false; F.Player.frozen = true; if (F.Player.stop) F.Player.stop();
  B.tap = obj => { const p = B.picks.find(q => q.obj === obj && q.on); if (p && !B.locked) { p.fn(p.obj); return true; } return false; };
  B.lock = async ms => { B.locked = true; await sleep(ms); B.locked = false; };
  B.dispose = function () {
    if (!B.alive) return; B.alive = false;
    offTick(); offPre();
    cv.removeEventListener('pointerdown', onDown, true); cv.removeEventListener('pointerup', onDown_block, true); cv.removeEventListener('pointermove', onMove, true);
    cv.style.cursor = '';
    B.labels.slice().forEach(L => L.remove());
    if (root.parent) root.parent.remove(root);
    if (hookGeo) { try { hookGeo.dispose(); hookMats.forEach(m => m.dispose()); } catch (e) {} }
    unboostFx();
    if (activeBoard === B) activeBoard = null;
    // the panel that froze her closed while the board ran (shop + Esc): do not restore that stale freeze
    if (prevOpen && !prevInput && !uiOpen()) { F.Input.enabled = true; F.Player.frozen = !!(F.Task && F.Task.current); }
    else { F.Input.enabled = prevInput; F.Player.frozen = prevFrozen; }
  };
  activeBoard = B;
  place();
  return B;
}
NUM.Board = Board;
NUM.board = () => activeBoard;

/* --------------------------------------------------------------------- pieces: real models, normalised to a size */
const sizeCache = new Map();
function piece(model, opts, size, o) {
  o = o || {};
  const m = F.VOX.make(model, Object.assign({}, opts || {}, o.style ? { style: o.style } : {}));
  const key = model + JSON.stringify(opts || {});
  let s = sizeCache.get(key);
  if (!s) { const b = new THREE.Box3().setFromObject(m); const z = b.getSize(new V3()); s = { x: z.x, y: z.y, z: z.z, minY: b.min.y }; sizeCache.set(key, s); }
  const k = size / Math.max(s.x, s.z, s.y * (o.hk || 0.85), 0.01);
  m.scale.setScalar(k); m.position.y = -s.minY * k;
  const g = new THREE.Group(); g.add(m); g.userData.h = s.y * k; g.userData.model = model;
  return noShadow(g);
}
NUM.piece = piece;
// which model to use for a thing name: the real castable if it exists, else our fallback
const modelFor = name => F.VOX.has(name) ? name : F.VOX.has('fx_n_' + name) ? 'fx_n_' + name : 'fx_n_eple';
// countable things for counting tasks: name, plural (NUM_PL), layout preference
const THINGS = [
  { id: 'eple', pl: 'epler', box: 'wood' }, { id: 'egg', pl: 'egg', box: 'carton', frames: true }, { id: 'bolle', pl: 'boller', box: 'tray', frames: true },
  { id: 'rose', pl: 'roser', box: 'bed', thin: true }, { id: 'and', pl: 'ender', box: 'rope', real: true, animal: true }, { id: 'sau', pl: 'sauer', box: 'wood', real: true, animal: true },
  { id: 'kake', pl: 'kaker', box: 'plate', real: true }, { id: 'ball', pl: 'baller', box: 'wood', real: true }, { id: 'jordbær', pl: 'jordbær', box: 'cloth', real: true },
  { id: 'blomst', pl: 'blomster', box: 'bed', thin: true }, { id: 'krystall', pl: 'krystaller', box: 'rail' }, { id: 'stjerne', pl: 'stjerner', box: 'star', frames: true },
  { id: 'boble', pl: 'bobler', box: 'rope', skinOnly: true }, { id: 'kylling', pl: 'kyllinger', box: 'wood', real: true, animal: true },
];
// things available now (real ones only if the model exists; fallbacks always)
// thin things (a rose seen from above is a few pixels) are only used when asked for by name (params.thing / params.model)
function things(filter) { return THINGS.filter(t => !t.skinOnly && !t.thin && (t.real ? F.VOX.has(t.id) : true) && (!filter || filter(t))); }
// a thumbnail-able «ten» of any piece model: 10 copies in a row (rows) or a 2×5 frame (frames) – used on the +10 button
function tenDef(src, layout, opts) {
  const id = 'fx_n_ten_' + src + '_' + layout + (opts && Object.keys(opts).length ? '_' + U.hashStr(JSON.stringify(opts)) : '');
  if (F.VOX.has(id) || !F.VOX.has(src)) return F.VOX.has(id) ? id : src;
  const d = F.VOX.defs[src], [sx, sy, sz] = d.size, g = Math.max(1, Math.round(sx * 0.15));
  const frames = layout === 'frames';
  const W = frames ? 5 * (sx + g) : 10 * (sx + g) + g * 2, D = frames ? 2 * (sz + g) : sz;
  if (W * sy * D > 400000) return src;
  F.VOX.def(id, { size: [W, sy, D], scale: d.scale, build(v) {
    const tg = F.VOX.grid(sx, sy, sz); d.build(tg, opts || {});
    for (let k = 0; k < 10; k++) {
      const ox = frames ? (k % 5) * (sx + g) : k * (sx + g) + (k >= 5 ? g * 2 : 0), oz = frames ? Math.floor(k / 5) * (sz + g) : 0;
      for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) { const c = tg.data[x + sx * (y + sy * z)]; if (c) v.data[(ox + x) + W * (y + sy * (oz + z))] = c; }
    }
  }, meta: { group: 'fx' } });
  return id;
}
NUM.tenDef = tenDef;
NUM.things = things;
const SKIN = {
  krystall: { one: 'krystall', pl: 'krystaller', box: 'rail', board: 'velvet', style: null, bundle: 'Ti krystaller blir én stav' },
  blomst: { one: 'blomst', pl: 'blomster', box: 'bed', board: 'grass', style: null, bundle: 'Ti blomster blir ett bed' },
  boble: { one: 'boble', pl: 'bobler', box: 'rope', board: 'velvet', style: null, bundle: 'Ti bobler blir én ring' },
  stjerne: { one: 'stjerne', pl: 'stjerner', box: 'star', board: 'velvet', style: null, bundle: 'Ti stjerner blir én ramme', frames: true },
};
const fairy = () => (F.save && SKIN[F.save.fairy]) ? F.save.fairy : 'krystall';
// the skin's piece: our chunky fx_n_ version (a potted flower reads as «one» from the camera; a thin stem does not)
const skinModel = sk => F.VOX.has('fx_n_' + sk.one) ? 'fx_n_' + sk.one : modelFor(sk.one);
NUM.skin = k => SKIN[k || fairy()];
// the countable thing for a task: the caller's model (stall goods, NPC wish) > params.thing > a random available thing
/* v5d WP-R3 (WP-A request): an encounter passes ctx.theme = {sp, things, model} (befriend.js) – the counting formats count THE ANIMAL'S
   food when the item has no model / thing of its own (params win). themeModel(K) → a VOX id or null. */
function themeModel(K) {
  if (K.p.model && F.VOX.has(K.p.model)) return K.p.model;
  if (K.p.thing) return null;
  const th = K.ctx && K.ctx.theme; if (!th || typeof th !== 'object') return null;
  return [th.model].concat(th.things || []).find(m => typeof m === 'string' && F.VOX.has(m)) || null;
}
NUM.themeModel = themeModel;
function thingFor(K, filter) {
  const m = themeModel(K);
  // v5 WP-R2 (#4, playtest2 V7): a theme model (the animal's food: nøtt, kongle, skjell …) gets its plural from F.WORDS when the
  // counting prompts have it (SETS.NUM_PL) – «Hvor mange nøtter er det?» – else the generic «Hvor mange er det?»
  if (m) { const k = THINGS.find(x => x.id === m || ('fx_n_' + x.id) === m);
    let pl = k ? k.pl : null; if (!pl) { try { const e = F.WORDS && F.WORDS.get && F.WORDS.get(K.p.thing || m); if (e && e.pl && inSet('NUM_PL', e.pl)) pl = e.pl; } catch (e) {} }
    return Object.assign({ box: 'wood' }, k || { id: m }, { model: m, pl }); }
  if (K.p.thing) { const t = THINGS.find(x => x.id === K.p.thing && !x.skinOnly && (!x.real || F.VOX.has(x.id))); if (t) return Object.assign({ model: modelFor(t.id) }, t); }
  const pool = things(filter); const t = U.pick(K.rng, pool.length ? pool : things());
  return Object.assign({ model: modelFor(t.id) }, t);
}

/* =====================================================================================================================
   3. TenView – the ten-structure on the board: rows of ten (gap after 5) or 2×5 frames (egg boxes, baking trays, star frames)
   ===================================================================================================================== */
function TenView(B, o) {
  o = Object.assign({ max: 20, cell: 0.52, gap: 0.22, x: 0, z: 0, layout: 'rows', box: 'wood', size: 0.42, container: true }, o);
  const T = { o, items: [], slots: [], group: new THREE.Group(), boxes: [] };
  B.add(T.group, o.x, o.z);
  const rowsN = Math.ceil(o.max / 10);
  const cellV = Math.round(o.cell * 10), gapV = Math.round(o.gap * 10);
  if (o.layout === 'frames') {
    const fw = 5 * o.cell, fgap = 0.5;
    for (let i = 0; i < o.max; i++) {
      const f = Math.floor(i / 10), j = i % 10, r = Math.floor(j / 5), c = j % 5;
      const fx = (rowsN > 1 ? (f ? 1 : -1) * (fw / 2 + fgap / 2) : 0);
      T.slots.push(new V3(fx + (c - 2) * o.cell, 0.1, (r - 0.5) * o.cell));
    }
    if (o.container) for (let f = 0; f < rowsN; f++) {
      const bx = F.VOX.make(frameDef(o.box, 5, 2, cellV, 0)); bx.position.set(rowsN > 1 ? (f ? 1 : -1) * (fw / 2 + fgap / 2) : 0, -0.02, 0);
      T.group.add(noShadow(bx)); T.boxes.push(bx);
    }
  } else {
    const rowGap = o.rowGap || 0.62;
    for (let i = 0; i < o.max; i++) {
      const r = Math.floor(i / 10), c = i % 10;
      T.slots.push(new V3((c - 4.5) * o.cell + (c >= 5 ? o.gap / 2 : -o.gap / 2), 0.1, (r - (rowsN - 1) / 2) * rowGap));
    }
    if (o.container) for (let r = 0; r < rowsN; r++) {
      const bx = F.VOX.make(frameDef(o.box, 10, 1, cellV, gapV)); bx.position.set(0, -0.02, (r - (rowsN - 1) / 2) * rowGap);
      T.group.add(noShadow(bx)); T.boxes.push(bx);
    }
  }
  T.mk = () => piece(o.model, o.modelOpts, o.size, { style: o.style });
  T.place = function (i, obj) { obj = obj || T.mk(); obj.position.copy(T.slots[i]); T.group.add(obj); T.items[i] = obj; return obj; };
  T.count = () => T.items.filter(Boolean).length;
  T.set = function (n) { for (let i = 0; i < o.max; i++) { if (i < n && !T.items[i]) T.place(i); if (i >= n && T.items[i]) { T.group.remove(T.items[i]); T.items[i] = null; } } return T; };
  T.slotWorld = i => T.group.localToWorld(T.slots[i].clone());
  T.rowItems = r => T.items.slice(r * 10, r * 10 + 10).filter(Boolean);
  T.labelRow = function (r, text) { const anchor = new THREE.Object3D(); const s = T.slots[r * 10 + (o.layout === 'frames' ? 2 : 0)]; anchor.position.set(o.layout === 'frames' ? s.x : s.x - o.cell * 1.15, 0.2, o.layout === 'frames' ? -o.cell * 1.3 : s.z); T.group.add(anchor); return B.label(anchor, text, { cls: 'num small ten', dy: 0.1 }); };
  if (o.n) T.set(o.n);
  return T;
}
NUM.TenView = TenView;

/* --------------------------------------------------------------------- small motions */
function hopTo(obj, toLocal, ms, h) {
  const a = obj.position.clone(), b = toLocal.clone();
  return tween(ms || 360, k => { const e = ease(k); obj.position.lerpVectors(a, b, e); obj.position.y += Math.sin(k * Math.PI) * (h != null ? h : 0.6); });
}
function popIn(obj, ms) { const s = obj.scale.clone(); obj.scale.setScalar(0.01); return tween(ms || 260, k => { const e = 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k); obj.scale.copy(s).multiplyScalar(Math.max(0.01, ease(k) * e)); }); }
function bounce(obj, amp) { const y0 = obj.position.y; return tween(420, k => { obj.position.y = y0 + Math.sin(k * Math.PI) * (amp || 0.35); }).then(() => { obj.position.y = y0; }); }
function shake(obj) { const x0 = obj.position.x; return tween(380, k => { obj.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.08 * (1 - k); }).then(() => { obj.position.x = x0; }); }
function glowObj(obj, on) {
  obj.traverse(m => {
    if (!m.isMesh || !m.material) return;
    if (on) { if (!m.userData.origMat) { m.userData.origMat = m.material; const c = m.material.clone(); if (c.emissive) { c.emissive = new THREE.Color(0xfff0a0); c.emissiveIntensity = 0.55; } m.material = c; } }
    else if (m.userData.origMat) { m.material.dispose(); m.material = m.userData.origMat; delete m.userData.origMat; }
  });
}
function sparkleAt(obj, c) { if (F.Space.cur !== 'out' || !F.FX) return; const p = new V3(); obj.getWorldPosition(p); F.FX.sparkle(p, c); }
NUM.motion = { hopTo, popIn, bounce, shake, glowObj };

/* =====================================================================================================================
   4. tray extras: action buttons (+10 / +1 / ✓ / purse, with real rendered thumbnails) and the number strip
   ===================================================================================================================== */
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function Actions(host, list) {
  const A = { btns: {}, locked: false, handler: null };
  const row = el('div', 'nrow nacts');
  list.forEach(a => {
    const b = el('button', 'kbtn nact ' + (a.cls || ''));
    if (a.thumb) { const im = F.Thumb.img(a.thumb.model, a.thumb.opts || {}, { size: 128, angle: a.thumb.angle != null ? a.thumb.angle : 0.35 }); im.className = 'nthumb'; b.appendChild(im); }
    if (a.label != null && a.label !== '') b.appendChild(el('span', 'nact-l', a.label));
    b.addEventListener('click', e => { e.stopPropagation(); A.press(a.id); });
    A.btns[a.id] = b; row.appendChild(b);
  });
  host.appendChild(row); A.el = row;
  if (F.UI._trayUpd) F.UI._trayUpd();
  A.press = id => { if (A.locked) return false; F.sfx.click(); const b = A.btns[id]; if (b) { b.classList.remove('nbump'); void b.offsetWidth; b.classList.add('nbump'); } if (A.handler) A.handler(id); return true; };
  A.on = fn => { A.handler = fn; };
  A.glow = (id, on) => { const b = A.btns[id]; if (b) b.classList.toggle('glow', on !== false); };
  A.dim = (id, on) => { const b = A.btns[id]; if (b) b.classList.toggle('dim', on !== false); };
  A.lock = on => { A.locked = !!on; row.classList.toggle('locked', A.locked); };
  A.remove = () => row.remove();
  return A;
}
// number strip 10…20 (support level 0): separate tiles at the top centre; the current count lights up
function Strip(from, to) {
  const s = el('div', 'nstrip'); const tiles = {};
  for (let n = from; n <= to; n++) { const t = el('div', 'nstile', String(n)); tiles[n] = t; s.appendChild(t); }
  document.body.appendChild(s);
  return { el: s, mark(n) { Object.values(tiles).forEach(t => t.classList.remove('on')); if (tiles[n]) tiles[n].classList.add('on'); }, remove() { s.remove(); } };
}
NUM.ui = { Actions, Strip };

/* =====================================================================================================================
   5. the kit each format gets: thin layer over the stage kit S (F.Task, js/game/tasks/stage.js)
      – S.chips / S.keypad / S.tiles run the §9.6 protocol; custom board interactions are widgets submitted via S.submit
      – S.hint / S._solFn are overridden per format so hints happen ON the board (where she is looking)
   ===================================================================================================================== */
function Kit(item, S, spec) {
  const K = { item, S, spec, ctx: S.ctx || {}, offs: [] };
  K.voice = S.voice || '';
  K.rng = U.rng((U.hashStr(String(item.id || '') + ':' + item.target + ':' + (item.rung || 0)) ^ (F.T.now * 1000 | 0)) >>> 0);
  K.p = item.params || {};
  K.quiet = !!K.p.noCounter;              // s2: she counts herself – no running total spoken
  // v5r fix1 (review #10): never after the task ended, never from a hint chain whose step is already solved (S.mute, stage.js)
  K.say = (id, slots, voice) => (S.mute && S.mute()) ? Promise.resolve() : say(id, slots, voice != null ? voice : K.voice);
  K.prompt = (id, slots, o) => S.prompt(id, slots || {}, Object.assign({ voice: vOK(id, K.voice) }, o || {}));
  K.num = n => (S.sayNum ? S.sayNum(n, S.cv) : sayN(n));
  K.numNow = n => { if (F.Speech) F.Speech.clearQueue(); return K.num(n); };
  K.board = o => {
    const B = Board(Object.assign({ avoid: S.has3D && S.base ? S.base.clone().add(new V3(0, 1.3, 0)) : null }, o)); K.B = B;
    S.widgets.push({ kind: 'nboard', dead: false, lock() {}, destroy() { B.dispose(); K.end(); } });
    return B;
  };
  K.tray = () => S.tray();
  K.actions = list => { const A = Actions(K.tray(), list); K.A = A; return A; };
  K.strip = () => { if (!K.stripEl) K.stripEl = Strip(10, 20); return K.stripEl; };
  // arm a custom answer step (stage keeps arm() private; mirror it when not exposed)
  K.arm = o => {
    if (S.arm) return S.arm(o);
    if (o && o.answer !== undefined) S.expected = o.answer;
    S.check = o && o.check ? o.check : null;
    S.solved = false; S.stepTries = 0; S.solShown = false;
    return new Promise(r => { S._resolve = r; });
  };
  K.use = w => { if (S.use) return S.use(w); S.active = w; S.widgets.push(w); return w; };
  // a board widget: {kind, values, feed(v) (tests: do the action for v), mark(v,cls), solution(v), lock(on)}
  K.widget = o => {
    const w = { kind: o.kind || 'board', values: o.values || [], dead: false, locked: false };
    // v5r2: seq = an ordering board (every tap is kept in order by the stage); early(values, pulse) = her kept choice made visible
    if (o.seq) w.seq = true;
    if (o.early) w.early = (vs, pulse) => { try { o.early(vs, pulse); } catch (e) { console.error(e); } };
    w.feed = v => o.feed(v);
    w.mark = (v, cls) => { try { o.mark && o.mark(v, cls); } catch (e) { console.error(e); } };
    w.solution = v => { try { o.solution && o.solution(v); } catch (e) { console.error(e); } };
    w.lock = on => { w.locked = !!on; if (K.B) K.B.locked = !!on; if (o.lock) o.lock(on); };
    w.destroy = () => { w.dead = true; if (o.destroy) o.destroy(); };
    return K.use(w);
  };
  K.submit = (v, w) => S.submit(v, w || S.active);
  /* v5 WP-R2 HINT PHASES (playtest2 «hints»; DESIGN5 §7): every hint is phase-aware.
     K.hint(post, pre) – post(tag, v): the targeted hint AFTER an error in this step (v = her wrong answer; «Hjelp meg» after an error
       gets her last answer). pre(kind): Puff's glow / «Hjelp meg» BEFORE any attempt in this step – structure only, never the count,
       the digits or the spelling she must produce. pre = 'post' re-uses post (formats whose hint is already answer-free, e.g. F18).
       Without pre: the current phase's nudge, else K.preDefault (look again + the prompt replayed, audio only).
     K.phase(name, {answer, nudge, replay}) – declares a phase (WP-K2's S.phase contract when present, feature-detected; else the same
       effect here): stale hint plaques go, Puff replays THIS phase's instruction, the idle glow re-arms. answer:false = a phase with
       no answer to judge (F08 tap-all, F12 purse): help there only shows what to DO and costs nothing.
     K.activity() – she is busy doing the right thing (tapping apples, +10/+1): Puff stops glowing and the idle timer restarts. */
  K.hint = (fn, pre) => {
    K._post = fn;
    // a pre-attempt hint is this step's phase nudge (WP-K2's S.preHint calls the phase nudge; the fallback below does the same)
    if (pre) K.phase(K._ph && K._ph.answer !== false ? K._ph.name : 'answer', { nudge: pre === 'post' ? (() => fn('PRE', null)) : pre });
    else { if (K._ph && typeof S.phase === 'function') { try { S.phase('answer', {}); } catch (e) {} } K._ph = null; }   // no stale nudge of an earlier step
    // v5r2 (verify «hints» #7): the override marks its chain (S.chainOn) like the stage's own hint, so S.mute() covers it after a
    // solve, the payoff waits for it and «Hjelp meg» is not offered while it runs
    S.hint = async (tag, v) => {
      const on = typeof S.chainOn === 'function'; if (on) S.chainOn();
      try {
        if (S.clearHint) S.clearHint();
        const before = v == null && !(S.stepTries > 0);
        if (before) {
          const ph = K._ph;
          await ((ph && ph.nudge) || K.preDefault)(tag || 'PRE');
          // (no WP-K2 phase contract) help in a phase with no answer only shows what to do – it does not cost the A
          if (ph && ph.answer === false && typeof S.phase !== 'function') { S.usedHelp = !!K._uh0; S.usedHint = !!K._ui0; }
          return;
        }
        if (v == null && Array.isArray(S.chosen) && S.chosen.length) v = S.chosen[S.chosen.length - 1];
        await fn(tag, v);
      } catch (e) { console.error('[f_num hint]', e); }
      finally { if (on) S.chainOff(); }
    };
  };
  K.preDefault = async () => { if (F.TPL.has('kit_h_look')) await say('kit_h_look', {}, ''); if (S.replayPrompt) await S.replayPrompt(); };
  K.activity = () => {
    if (typeof S.activity === 'function') { try { S.activity(); return; } catch (e) {} }
    if (S.puffGlow) { S.puffGlow = false; F.emit('puffGlow', false); }
    if (S.armIdle && !S.ended) S.armIdle();
  };
  K.phase = (name, o) => {
    o = o || {};
    const ph = { name, answer: o.answer !== false, nudge: o.nudge || null };
    K._ph = ph; K._uh0 = S.usedHelp; K._ui0 = S.usedHint;
    const rp = o.replay ? Object.assign({ slots: {}, voice: '' }, o.replay) : null;
    if (typeof S.phase === 'function') { try { S.phase(name, { answer: ph.answer, nudge: ph.nudge, replay: rp }); } catch (e) { console.warn('[f_num phase]', e); } }
    else {
      if (S.clearHint) S.clearHint();
      if (rp) { S.lastPrompt = rp; S.replay = null; }
      if (S.puffGlow) { S.puffGlow = false; F.emit('puffGlow', false); }
      if (S.armIdle && !S.ended) S.armIdle();
    }
    return ph;
  };
  K.sol = fn => { S._solFn = async () => { try { await fn(); } catch (e) { console.error('[f_num solution]', e); } }; };
  K.onKey = fn => { const h = e => { if (F.UI.keyCapture) return; if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (fn(e) !== false) e.preventDefault(); }; addEventListener('keydown', h); K.offs.push(() => removeEventListener('keydown', h)); };
  K.end = () => { K.offs.splice(0).forEach(f => f()); if (K.stripEl) { K.stripEl.remove(); K.stripEl = null; } if (NUM.cur && NUM.cur.kit === K) NUM.cur = null; };
  // v4 C1: the number she must find / write is masked in subtitles and bubbles (WP-K's F.Speech mask reads S.secret)
  // (the format runs on a normalised copy of the item; S.item is the stage's / engine's item – both get the fields)
  const both = fn => { fn(item); if (S.item && S.item !== item) fn(S.item); };
  K.secret = (...vals) => { const add = vals.filter(v => v != null && v !== '').map(String); const cur = Array.isArray(S.secret) ? S.secret : [];
    S.secret = cur.concat(add.filter(x => !cur.includes(x))); both(x => { x.secret = S.secret.slice(); }); return S.secret; };
  // v4 DESIGN4 §2.9: answer mode / guess probability / thinking type on the item
  K.meta = (mode, g, think) => both(x => { x.mode = mode; x.g = +(+g).toFixed(4); x._gAuto = false; x._modeAuto = false; if (think || spec.think) x.think = x.think || think || spec.think; });
  // s0: count every piece aloud (scaffold); s1: only the full tens («ti», «tjue»); s2 / bank noCounter: silent (pling only)
  K.countMode = K.p.noCounter || (item.sup || 0) >= 2 ? 'none' : (item.sup || 0) === 1 ? 'tens' : 'all';
  if (['all', 'tens', 'none'].includes(K.p.counter) && !K.p.noCounter) K.countMode = K.p.counter;     // v5: WP-B1's params.counter (C5)
  K.quiet = K.countMode === 'none';
  K.countSay = n => { if (K.countMode === 'all' || (K.countMode === 'tens' && n > 0 && n % 10 === 0)) return K.numNow(n); return null; };
  // the answer step for a number (SYNTHESIS §5.2 A): chips with 2–4 options only at s0, ≥ 5 at s1, the keypad at s2
  K.answerNum = (values, o) => {
    o = o || {};
    const ans = o.answer !== undefined ? +o.answer : +item.target;
    const sup = item.sup == null ? 1 : item.sup;
    if (sup >= 2 && !o.noKeypad) {
      K.meta('keypad', 0.01);
      return S.keypad(Object.assign({ answer: ans }, keypadOpts(item, ans, o)));
    }
    let vals = (values || item.choices || []).map(Number).filter(v => isFinite(v));
    if (!vals.includes(ans)) vals = [ans].concat(vals);
    // (v4 banks mark their own contrast-family choice sets params.noWiden – kept as they are when they already hold ≥ 5)
    if (sup >= 1 && !(K.p.noWiden && vals.length >= 5)) vals = widen(K.rng, ans, vals, o.n || 5, o.min, o.max);
    vals = [...new Set(vals)];
    if (sup >= 1 || !vals.length) vals = U.shuffle(K.rng, vals);
    K.meta('chips', 1 / Math.max(1, vals.length));
    both(x => { x.choices = vals.slice(); });
    return S.chips(vals, Object.assign({ kind: 'num' }, o.chips || {}, { answer: ans }));
  };
  NUM.cur = { kit: K, format: item.format, item };
  return K;
}
// v4 hint_leaks C3 / SYNTHESIS §5.M: the keypad never reveals the length above s1 – 3 neutral boxes (4 from 3-digit targets) + ✓;
// at s0/s1 the exact box count may show (showLen, auto-submit). WP-K's fixed-slot keypad reads showLen/slots; today's keypad reads len.
function keypadOpts(item, ans, o) {
  o = o || {};
  const L = String(Math.abs(Math.round(ans))).length, sup = item.sup == null ? 1 : item.sup;
  const show = o.showLen != null ? !!o.showLen : ((item.params || {}).showLen != null ? !!item.params.showLen : sup < 2);
  const slots = Math.max(3, L <= 2 ? 3 : 4);
  return show ? { len: L, showLen: true, auto: true, slots } : { len: slots, slots, showLen: false, auto: false };
}
NUM.keypadOpts = keypadOpts;
// widen a chip set to n values with the target's confusion family (teen/-ty, reversal, ±1, ±10, digit-only), never duplicates
function widen(rng, t, vals, n, lo, hi) {
  lo = lo != null ? lo : 0; hi = hi != null ? hi : 100;
  const out = vals.slice(0, Math.max(n, vals.length));
  const fam = contrastFamily(t, lo, hi);
  for (const v of fam) { if (out.length >= n) break; if (!out.includes(v)) out.push(v); }
  for (let g = 0; out.length < n && g < 200; g++) { const v = U.clamp(t + U.int(rng, -12, 12), lo, hi); if (!out.includes(v)) out.push(v); }
  return out;
}
// the whole contrast family of a number (SYNTHESIS N11: «sekstiåtte» → 68 with 86, 18; «nitten» among 9, 19, 90, 91)
function contrastFamily(t, lo, hi) {
  lo = lo != null ? lo : 0; hi = hi != null ? hi : 100;
  const tt = Math.floor(t / 10), o = t % 10, out = [];
  const add = v => { v = Math.round(v); if (v >= lo && v <= hi && v !== t && !out.includes(v)) out.push(v); };
  if (t < 100) {
    if (o && t >= 10) add(o * 10 + tt);                   // reversal 68 → 86
    if (t > 10 && t < 20) { add(o * 10); add(o * 10 + 1); add(o); }   // 17 → 70, 71, 7
    if (t >= 20 && o === 0) { add(10 + tt); add(tt); add(t + 1); }    // 70 → 17, 7, 71
    if (t >= 20 && o) { add(10 + o); add(o * 10); add(tt * 10); }      // 68 → 18, 80, 60
    if (t < 10) { add(t * 10); add(10 + t); }
  }
  add(t + 1); add(t - 1); add(t + 10); add(t - 10); add(t + 2);
  return out;
}
NUM.contrastFamily = contrastFamily;
// number words 0–100 (bokmål, sju/tjue) – F05 N12 when the bank item carries no text
const NW1 = ['null', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten'];
const NW10 = ['', '', 'tjue', 'tretti', 'førti', 'femti', 'seksti', 'sytti', 'åtti', 'nitti'];
const numWord = n => { n = Math.round(+n); if (n < 20) return NW1[n] || String(n); if (n === 100) return 'hundre'; const t = Math.floor(n / 10), o = n % 10; return NW10[t] + (o ? (o === 1 ? 'en' : NW1[o]) : ''); };
NUM.numWord = numWord;

/* =====================================================================================================================
   6. items: normalise what F.BANKS gives (target = the expected answer); a local generator for tests
   ===================================================================================================================== */
const rangeOf = (strand, rung) => {
  if (strand === 'T-NAVN') return rung <= 1 ? [10, 12] : rung === 2 ? [10, 15] : [10, 20];
  if (strand === 'T-MENGDE') return rung <= 1 ? [10, 12] : rung === 2 || rung === 5 ? [10, 15] : [10, 20];
  if (strand === 'T-SKRIV') return rung <= 3 ? [11, 15] : [10, 20];
  if (strand === 'T-ORDEN') return rung <= 1 ? [11, 15] : [11, 19];
  return [10, 20];
};
const rev = n => +String(n).split('').reverse().join('');
function numChoices(rng, t, nCh) {
  const cand = [];
  const add = (v, tag) => { if (v >= 0 && v <= 99 && v !== t && !cand.some(c => c.v === v)) cand.push({ v, tag }); };
  add(t + 1, 'OFF-BY-ONE'); add(t - 1, 'OFF-BY-ONE'); if (t > 10 && t < 20) add(rev(t), 'REVERSAL'); add(t + 2, 'OFF-BY-ONE');
  const d = cand.slice(0, Math.max(1, nCh - 1));
  return { choices: U.shuffle(rng, [t, ...d.map(x => x.v)]), distractors: d };
}
NUM.mkItem = function (fmt, o) {
  o = o || {};
  const spec = SPECS[fmt]; const strand = o.strand || Object.keys(spec.strands)[0];
  const rung = o.rung != null ? o.rung : spec.strands[strand][0], sup = o.sup != null ? o.sup : 1;
  const rng = o.rng || U.rng(o.seed || 7);
  let item = null;
  try { if (F.BANKS && F.BANKS.gen) { const g = F.BANKS.gen(strand, rung, sup, { kind: 'normal', target: o.target, key: o.target != null ? strand + ':' + o.target : undefined, rng, conf: {}, format: fmt }); if (g && g.target != null) item = g; } } catch (e) { }
  if (!item) { const [a, b] = rangeOf(strand, rung); const t = o.target != null ? o.target : U.int(rng, a, b); item = Object.assign({ target: t, n: t, params: {} }, numChoices(rng, t, sup === 0 ? 2 : sup === 1 ? 3 : 4)); }
  return Object.assign({ id: 'nit_' + fmt + '_' + rung + '_' + sup + '_' + Math.floor(rng() * 1e6), strand, rung, sup, format: fmt, kind: 'normal' }, item, o.extra || {});
};
function norm(item, spec, needChoices) {
  const it = Object.assign({ sup: 1, params: {}, distractors: [] }, item);
  it.params = Object.assign({}, it.params || {});
  if (!it.strand || !spec.strands[it.strand]) it.strand = Object.keys(spec.strands)[0];
  if (it.rung == null) it.rung = spec.strands[it.strand][0];
  if (spec.wordTarget && typeof it.target === 'string' && isNaN(+it.target)) return it;     // number words (F05 N8, F17)
  if (Array.isArray(it.target)) { it.params.fromArray = it.target.slice(); it.target = it.n != null ? +it.n : it.target[Math.floor(it.target.length / 2)]; it.choices = null; }
  if (it.target == null || isNaN(+it.target)) { const r = rangeOf(it.strand, it.rung); it.target = r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1)); }
  it.target = +it.target;
  if (needChoices !== false) {
    let ch = Array.isArray(it.choices) ? it.choices.map(Number).filter(v => !isNaN(v)) : [];
    if (ch.length < 2) { const g = numChoices(U.rng(it.target * 7 + it.rung), it.target, it.sup === 0 ? 2 : 3); ch = g.choices; if (!it.distractors || !it.distractors.length) it.distractors = g.distractors; }
    if (!ch.includes(it.target)) ch[0] = it.target;
    it.choices = [...new Set(ch)];
  }
  return it;
}

/* =====================================================================================================================
   7. the formats
   ===================================================================================================================== */
const SPECS = {};
function fmt(id, spec) { spec.id = id; SPECS[id] = spec; }
const decSplit = t => `${t} er ${['', '', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni'][t / 10]} tiere`;
// spoken part of a number hint (teen/-ty contrast, reversal, digit-only); true when something fitting was said
async function numHint(K, t, v, tag) {
  // v4 Table B: after the 1st error the target's digits stay masked in text (the decomposition is heard: «seksten er ti og seks»)
  const S = K.S; if (Array.isArray(S.secret) && S.secret.includes(String(t)) && t > 10 && t < 20) K.secret(String(t - 10));
  if (tag === 'DECADE' && inSet('NUM_TEEN_TY', `${t}, ikke ${v}`)) { await K.say('num_hor_godt', {}, ''); await K.say('num_teen_ty', { s: `${t}, ikke ${v}` }, ''); return true; }
  if ((tag === 'REVERSAL' || tag === 'DIGIT-ONLY' || tag === 'COUNT-ONES') && t > 10 && t < 20) { await K.say('num_split', { s: `${t} er ti og ${t - 10}` }, ''); if (tag === 'REVERSAL') await K.say('num_tier_forst', {}, ''); return true; }
  if (t % 10 === 0 && t >= 30 && t <= 90) { await K.say('num_dec', { s: decSplit(t) }, ''); return true; }
  return false;
}
// v4 Table B (T-NAVN 21–100, a miss that is not a teen/-ty or reversal confusion): «Hør godt!», the number again (audio) and its
// rods + pieces with a «?» plaque – the structure, never the digits
async function rodHint(K, t, o) {
  o = o || {};
  const B = K.B; if (!B || !(t >= 0 && t <= 99)) return false;
  const g = numberPicture(B, t, o.x || 0, o.z != null ? o.z : 0.9, { cell: t > 20 ? 0.15 : 0.21 }); popIn(g);
  const L = B.label(g, '?', { cls: 'num small hintn', dy: 0.55, always: true });
  await K.say('num_hor_godt', {}, '');
  for (const row of g.userData.rows) { if (chainStop(K.S)) break; row.forEach(p => glowObj(p, true)); await sleep(220); row.forEach(p => glowObj(p, false)); }
  await K.num(t);
  await hSleep(K.S, o.hold || 1200);                       // v5r2 r2: solved meanwhile – the picture goes at once
  L.remove(); if (g.parent) g.parent.remove(g);
  return true;
}
// v5r2: a hint chain stops once its step is solved, a later part is armed (S._chainStale) or the task ended (S.mute when present)
const chainStop = S => !!(S.ended || S.solved || (S.mute && S.mute()));
// v5r2 r2 (verify «hints» regression): a hint's pause that ends the moment its step is solved / the task ends – a chain never
// outlives its solve by a long hold (the payoff waits for the chain, stage.js S.submit)
async function hSleep(S, ms) { const t1 = F.T.now + ms / 1000; while (!chainStop(S) && F.T.now < t1 - 1e-6) await sleep(Math.max(16, Math.min(100, 1000 * (t1 - F.T.now)))); }
// a little 3D picture of a number on the board: rods (rows of ten) + single pieces, in the fairy's skin
function numberPicture(B, n, x, z, o) {
  o = o || {};
  const sk = SKIN[o.skin || fairy()];
  const g = new THREE.Group(); B.add(g, x, z);
  n = Math.max(0, Math.min(99, Math.round(n)));
  const tens = Math.floor(n / 10), ones = n % 10, cell = o.cell || 0.24, size = cell * 0.92;
  const model = skinModel(sk);
  const rows = tens + (ones ? 1 : 0), rz = r => (r - (rows - 1) / 2) * cell * 1.5, cx = i => (i - 4.5) * cell + (i >= 5 ? 0.05 : -0.05);
  g.userData.rows = [];
  for (let t = 0; t < tens; t++) { const row = []; for (let i = 0; i < 10; i++) { const p = piece(model, {}, size); p.position.set(cx(i), 0, rz(t)); g.add(p); row.push(p); } g.userData.rows.push(row); }
  const or = []; for (let i = 0; i < ones; i++) { const p = piece(model, {}, size); p.position.set(cx(i), 0, rz(tens)); g.add(p); or.push(p); }
  g.userData.ones = or;
  return g;
}
NUM.numberPicture = numberPicture;
// contrast hint (REVERSAL / DECADE): the right number and the confused one side by side as rods + pieces with plaques
async function contrastHint(K, t, v, o) {
  o = o || {};
  const B = K.B; if (!B || !(v >= 0 && v <= 99)) return;
  const made = [];
  const z = o.z != null ? o.z : 0.9;
  const xs = o.xs || [-1.75, 1.75];          // v4 (hint_leaks 11): F19 draws each picture under its own basket
  // v4 Table B: when the target is a secret (T-NAVN / T-SKRIV) its picture gets a «?» plaque; the chosen number shows its digits
  const maskT = o.maskT != null ? !!o.maskT : (Array.isArray(K.S.secret) && K.S.secret.includes(String(t)));
  for (const [n, x] of [[t, xs[0]], [v, xs[1]]]) {
    const g = numberPicture(B, n, x, z, { cell: n > 20 ? 0.15 : 0.21 }); made.push(g); popIn(g);
    if (!o.compare) made.push(B.label(g, n === t && maskT ? '?' : String(n), { cls: 'num small hintn', dy: 0.55, always: true }));
  }
  await K.say('core_h_forskjell', {}, '');
  // v5r fix1 (review #9): o.compare (F19 «størst / minst» – the answer is WHICH basket): both pictures, no plaques, no number spoken –
  // the ten-rows of both light up side by side, row by row (pling), then the ones: she sees which one runs out first and compares
  if (o.compare) {
    const [pa, pb] = [made[0], made[1]], ra = pa.userData.rows, rb = pb.userData.rows;
    for (let r = 0; r < Math.max(ra.length, rb.length); r++) {
      if (chainStop(K.S)) break;
      const lit = (ra[r] || []).concat(rb[r] || []); lit.forEach(p => glowObj(p, true)); F.sfx.pling(r % 10); await sleep(420); lit.forEach(p => glowObj(p, false));
    }
    const ones = (pa.userData.ones || []).concat(pb.userData.ones || []);
    if (!chainStop(K.S)) { ones.forEach(p => glowObj(p, true)); await hSleep(K.S, 500); ones.forEach(p => glowObj(p, false)); }
    await hSleep(K.S, o.hold || 1500);                          // v5r2: solved meanwhile – the pictures go at once, the payoff comes
    made.forEach(m => m.el ? m.remove() : (m.parent && m.parent.remove(m)));
    return;
  }
  const right = made[0];
  // v5r2 r2 (verify «hints» regression, F16): every pause stops with its step – the chain never holds the praise back past the cap
  for (const row of right.userData.rows) { if (chainStop(K.S)) break; row.forEach(p => glowObj(p, true)); await K.num(10 * (right.userData.rows.indexOf(row) + 1)); row.forEach(p => glowObj(p, false)); }
  await hSleep(K.S, 250);
  if (!chainStop(K.S)) await K.num(t);
  await hSleep(K.S, o.hold || 1500);
  made.forEach(m => m.el ? m.remove() : (m.parent && m.parent.remove(m)));
}
// count along objects: each hops + its number (royal voice when a royal asks); stopBefore leaves the last one for her
async function countAlong(K, objs, from, o) {
  o = o || {};
  for (let i = 0; i < objs.length; i++) {
    if (K.S.chainBusy && K.S.chainBusy() && chainStop(K.S)) break;     // v5r2: inside a hint chain it stops with its step (no pling burst)
    if (o.stopBefore && i === objs.length - 1) { glowObj(objs[i], true); bounce(objs[i], 0.3); if (o.strip) o.strip.mark(null); await sleep(500); if (!o.keep) glowObj(objs[i], false); break; }
    glowObj(objs[i], true); bounce(objs[i], 0.25); F.sfx.pling(i % 10);
    if (o.strip) o.strip.mark(from + i);
    await K.num(from + i);
    if (!o.keep) glowObj(objs[i], false);
  }
}
NUM.countAlong = countAlong;
// v5 WP-R2 (playtest2 «hints»): the pre-attempt counting nudge – the structure, never the count. The full tens BELOW the total glow
// («Se: en full rad er ti.»; a ten that IS the total is not named), the rest glow one by one with a soft pling and no numbers, then
// «Tell videre fra ti selv.» (or «Pek på hver og tell selv.» when there is no full ten below the total).
async function tenNudge(K, rows, o) {
  o = o || {};
  rows = rows.map(r => (r || []).filter(Boolean));
  const all = rows.flat(), total = all.length;
  const full = rows.filter(r => r.length === 10);
  const nFull = Math.min(full.length, Math.floor(Math.max(0, total - 1) / 10));
  for (let r = 0; r < nFull; r++) {
    full[r].forEach(x => glowObj(x, true));
    if (r === 0) await K.say(o.frames ? 'num_full_ramme' : 'num_full_rad', {}, ''); else await sleep(600);
    full[r].forEach(x => glowObj(x, false));
  }
  const named = full.slice(0, nFull).flat();
  const rest = all.filter(x => !named.includes(x));
  for (let i = 0; i < rest.length; i++) { if (chainStop(K.S)) return; glowObj(rest[i], true); bounce(rest[i], 0.15); F.sfx.pling(i % 10); await sleep(o.ms || 280); glowObj(rest[i], false); }
  if (chainStop(K.S)) return;                    // (review #10) solved meanwhile: the nudge ends here
  const tl = nFull ? pickRec('num_tell_selv', 'num_tell_videre') : pickRec('num_tell_alle', 'kit_h_look');
  if (tl) await K.say(tl, {}, '');
}
NUM.tenNudge = tenNudge;
// v5 after the 1st error (Table B, T-MENGDE): «full rad er ti» and the count along from ten – spoken only at s0 (countMode 'all');
// above s0 the ones glow with plings and she says the numbers herself (the game never counts to n − 1 for her)
async function tenAfterError(K, tenRow, ones, o) {
  o = o || {};
  const ten = (tenRow || []).filter(Boolean);
  ten.forEach(x => glowObj(x, true)); await K.say(o.frames ? 'num_full_ramme' : 'num_full_rad', {}, ''); ten.forEach(x => glowObj(x, false));
  const rest = (ones || []).filter(Boolean);
  if (!rest.length) return;
  if (K.countMode === 'all') { await K.say('num_tell_videre', {}, ''); await countAlong(K, rest, (o.from || 11), { stopBefore: true, strip: o.strip }); return; }
  for (let i = 0; i < rest.length; i++) { if (chainStop(K.S)) return; glowObj(rest[i], true); bounce(rest[i], 0.15); F.sfx.pling(i % 10); await sleep(300); glowObj(rest[i], false); }
  if (chainStop(K.S)) return;
  const tl = pickRec('num_tell_selv', 'num_tell_videre'); if (tl) await K.say(tl, {}, '');
}
NUM.tenAfterError = tenAfterError;
const wrongOf = item => { const d = (item.choices || []).filter(v => +v !== +item.target); return d.length ? d[0] : item.target + 1; };
// a target plaque at the board's far right corner
function goalPlaque(B, n) { const a = new THREE.Object3D(); a.position.set(B.w / 2 - 0.5, 0.2, -B.d / 2 + 0.4); B.top.add(a); return B.label(a, String(n), { cls: 'num goal', dy: 0.15 }); }

/* --------------------------------------------------------------------- F01 Heisen (lift buttons 10–20) */
// v4 N10–N11 (SYNTHESIS §3.3 F01): the tower lift of Krystallslottet – a panel with 40 floors (g = 1/40) in the tray
let lift40Css = false;
function lift40Style() {
  if (lift40Css || typeof document === 'undefined') return; lift40Css = true;
  const st = document.createElement('style'); st.id = 'nlift40Css';
  st.textContent = '.nlift40 { display: grid; grid-template-columns: repeat(10, 46px); gap: 7px; padding: 10px 14px; background: linear-gradient(#e9e3f7,#d6cdee);' +
    ' border-radius: 18px; box-shadow: inset 0 0 0 3px #b9a5f0; }' +
    '.nlift40 button { width: 46px; height: 40px; border-radius: 50%; border: 3px solid #c9962b; background: radial-gradient(#fff8e1,#f2d98a);' +
    ' font: 600 19px/1 Andika, sans-serif; color: #4a3b1c; cursor: pointer; padding: 0; }' +
    '.nlift40 button.wrong { animation: nl40shake .4s; background: #f4e3e3; } .nlift40 button.right, .nlift40 button.glow { background: radial-gradient(#fffbe8,#ffd84d); box-shadow: 0 0 14px #ffd84d; }' +
    '.nlift40.locked button { opacity: .6; } @keyframes nl40shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }';
  document.head.appendChild(st);
}
function lift40Range(rng, t) {
  const fam = contrastFamily(t, 1, 100);
  let best = null, bs = -1;
  for (let lo = 1; lo <= 61; lo += 10) {
    if (t < lo || t > lo + 39) continue;
    const sc = fam.filter(v => v >= lo && v <= lo + 39).length * 10 + rng();
    if (sc > bs) { bs = sc; best = lo; }
  }
  return best || U.clamp(Math.floor((t - 1) / 10) * 10 - 9, 1, 61);
}
async function lift40(K, disp) {
  const S = K.S, item = K.item, t = item.target;
  lift40Style();
  const lo = lift40Range(K.rng, t), floors = Array.from({ length: 40 }, (_, i) => lo + i);
  const panel = el('div', 'nlift40'); const btns = {};
  // the top floor row first (a real lift panel)
  for (let r = 3; r >= 0; r--) for (let c = 0; c < 10; c++) { const v = lo + r * 10 + c; const b = el('button', '', String(v)); btns[v] = b; panel.appendChild(b); }
  K.tray().appendChild(panel); if (F.UI._trayUpd) F.UI._trayUpd();
  K.meta('board', 1 / 40);
  const done = K.arm({ answer: t });
  const w = K.widget({ kind: 'board', values: floors,
    feed: v => K.submit(btns[+v] ? +v : floors.find(x => x !== t), w),
    mark: (v, cls) => { const b = btns[+v]; if (!b) return; b.classList.remove('wrong', 'right'); void b.offsetWidth; b.classList.add(cls); if (cls === 'wrong') { disp.set(String(v)).cls('wrong'); F.T.timeout(() => { b.classList.remove('wrong'); disp.set('·').cls('wrong', false); }, 1100); } },
    solution: v => { const b = btns[+v]; if (b) b.classList.add('glow'); },
    lock: on => panel.classList.toggle('locked', !!on),
    destroy: () => panel.remove() });
  floors.forEach(v => btns[v].addEventListener('click', e => { e.stopPropagation(); if (w.locked || S.solved) return; F.sfx.click(); K.submit(v, w); }));
  K.offs.push(() => panel.remove());
  return done;
}
fmt('F01', { name: 'Heisen', strands: { 'T-NAVN': [1, 11] }, rungs: [1, 2, 3, 4, 5, 6, 10, 11], places: ['lift', 'tallstolpe', 'any'], family: 'tall-velg', think: 'AVKODE', tpl: ['num_f01_q', 'num_f01_q2', 'num_f01_ok'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    K.secret(t);                                              // v4 C1: «Til rom …, takk!»
    // DESIGN2 §9.2: answer widgets by ctx.place come from F.Pickers (WP1 registers 'lift'); legacy F.Castle.lift kept as fallback
    const L = (F.Pickers && F.Pickers[K.ctx.place]) || (K.ctx.place === 'lift' && F.Castle && F.Castle.lift) || null;
    if (L && L.open && !L.panel && t >= 10 && t <= 20) return liftMode(K, L);
    const big = t > 20 || (item.rung || 1) >= 10;
    const helper = item.sup === 0 || item.structure;
    const B = K.board({ style: 'wood', w: helper ? 6.2 : 4.2, d: 2.2, h: 2.1, scale: 0.85 });
    const lift = piece('fx_n_heis', {}, 1.9, { hk: 0.6 }); B.add(lift, helper ? -1.6 : 0.2, -0.25);
    // a wee fairy (her colours) waits beside the lift and rides it when the right button is pressed
    const fe = piece('fx_n_fe', { dress: FAIRY_DRESS[fairy()] || 'lilac' }, 0.55, { hk: 0.5 }); B.add(fe, helper ? -2.75 : -1.45, 0.45);
    const disp = B.label(lift, '·', { cls: 'num floor', dy: 2.2 });
    if (helper && t <= 99) { const g = numberPicture(B, t, 1.35, 0.05, { cell: 0.26 }); popIn(g); }
    const strip = K.p.strip ? K.strip() : null;
    const ask = () => (t >= 10 && t <= 20) ? K.prompt('num_f01_q', { n: t }) : inSet('NUM_10_100', t) ? K.prompt('num_f01_q2', { n: t }) : K.prompt('core_num', { n: U.clamp(t, 0, 100) });
    K.hint(async (tag, v) => {
      if (v != null) { disp.set(String(v)).cls('wrong'); await sleep(500); disp.set('·').cls('wrong', false); }
      if (tag === 'REVERSAL' || tag === 'DECADE') await contrastHint(K, t, +v);
      else if (!(await numHint(K, t, +v, tag))) { if (t >= 10 && t <= 20 && strip) strip.mark(Math.floor(t / 10) * 10); else if (t > 20) await rodHint(K, t, { x: big && helper ? -1.6 : 1.6, z: 0.6 }); }   // s0: the strip lights the ten
      await ask();
    });
    ask();
    let p;
    if (big && item.sup >= 1) p = lift40(K, disp);
    else { p = K.answerNum(item.choices, { noKeypad: true, n: item.sup >= 2 ? 6 : 5, min: big ? 1 : 0 }); if (S.active && S.active.el) S.active.el.classList.add('nlift'); }
    await p;
    disp.set(String(t)).cls('lit');
    const P = lift.children[0].userData.parts || {};
    F.sfx.bell(1046);
    // doors open, the fairy hops in, doors close, and the floor display counts up 10, 11, … to her room (the number line, ridden)
    await tween(500, k => { if (P.dl) P.dl.position.x = -ease(k) * 0.55; if (P.dr) P.dr.position.x = ease(k) * 0.55; });
    const inLift = lift.position.clone(); inLift.z += 0.15; inLift.y += 0.05;
    await hopTo(fe, inLift, 420, 0.6); F.sfx.boing();
    await tween(420, k => { if (P.dl) P.dl.position.x = -(1 - ease(k)) * 0.55; if (P.dr) P.dr.position.x = (1 - ease(k)) * 0.55; });
    fe.visible = false;
    if (t >= 10 && t <= 20) { disp.cls('lit', false); for (let k = 10; k <= t; k++) { disp.set(String(k)); F.sfx.tone && F.sfx.tone(700 + (k - 10) * 40, 0.06, 'triangle', 0.06); await sleep(150); } disp.cls('lit'); }
    F.sfx.bell(1318); sparkleAt(lift, 0xffe066);
    await tween(400, k => { if (P.dl) P.dl.position.x = -ease(k) * 0.55; if (P.dr) P.dr.position.x = ease(k) * 0.55; });
    await K.say('num_f01_ok', {}, '');
    return S.result();
  } });

// F01 inside the castle: the real lift panel (11 brass buttons + the fairy-wing button) is the answer widget
async function liftMode(K, L) {
  const S = K.S, item = K.item, t = item.target;
  const done = K.arm({ answer: t });
  const w = K.widget({ kind: 'lift', values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    feed: v => { let b = L.buttons[v]; if (!b || b.disabled) b = Object.keys(L.buttons).map(k => L.buttons[k]).find(x => !x.disabled && +x.dataset.n !== t && x.dataset.n !== 'fetarn') || L.buttons[t]; if (b) b.click(); return true; },
    mark: (v, cls) => { if (L.mark) L.mark(v, cls); },
    solution: v => { if (L.highlight) L.highlight(v, 'glow'); },
    // hint_leaks §5: an aborted lift task (bedtime, a stuck format) must not leave the castle lift panel open
    destroy: () => { try { if (!S.solved && L.close) L.close(); } catch (e) {} } });
  const ask = () => K.prompt('num_f01_q', { n: t });
  K.hint(async (tag, v) => { await numHint(K, t, +v, tag); await ask(); });
  ask();
  const opened = L.open({ target: t, pick: async n => (w.locked || S.solved || n === 'fetarn') ? false : !!K.submit(n, w) });
  // the rung decides how many buttons are in play (N1: 2 far apart … N4+: all eleven); the others rest dimmed
  const inPlay = item.rung >= 4 && item.sup >= 1 ? null : item.choices.filter(v => v >= 10 && v <= 20);
  K.meta('board', 1 / Math.max(2, inPlay && inPlay.length >= 2 ? inPlay.length : 11));
  if (inPlay && inPlay.length >= 2) Object.keys(L.buttons || {}).forEach(k => { const b = L.buttons[k]; if (!inPlay.includes(+k)) { b.disabled = true; b.style.opacity = '0.28'; } });
  const how = await Promise.race([done.then(() => 'solved'), opened.then(n => n == null ? 'closed' : 'solved')]);
  if (how === 'closed' && !S.solved) { await S.chips(item.choices, { kind: 'num' }); if (F.Castle.goRoomByNumber) F.Castle.goRoomByNumber(t); }
  else await done;
  K.end();
  return S.result();
}
/* CASTLE calls this when the lift (c_heis) is pressed:  const r = await F.NUM.liftOffer({ thing: heisThing });
   → Promise<Result|null>. It runs F01 «Til rom 16, takk!» with the real lift panel as the answer; a right press makes the
   lift travel to that room (the panel's own pick → travel). null = nothing offered (a task is running, F.Quest.canOfferTask()
   says play, or the engine has no F01 item with a room number 10–20 now, or she is in that room already): then CASTLE opens
   the free lift panel exactly as before. o.force skips the canOfferTask check (tests). */
// v5 WP-R2 (WP-X REQUEST, DESIGN4 §8): the castle plates are natural room numbers (1. etasje 1–4 … 3. etasje 9–12) and the lift buttons
// are the floors. F01 at the lift asks for a REAL room plate in the 10–20 clip set («Til rom 11, takk!» – today 10, 11, 12 on the 3rd
// floor), she answers on F01's own lift board, then the castle lift rides to that room's floor. Only the 10–20 rungs (T-NAVN ≤ 6) –
// a 21–100 item opens the free floor panel instead (null). Without plates (old castle) the legacy 10–20 room numbers are used.
NUM.liftOffer = async function (o) {
  o = o || {};
  const L = F.Castle && F.Castle.lift;
  if (!L || L.panel || F.Task.current) return null;
  if (!o.force && F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask()) return null;
  let item = null;
  try { item = F.LEARN.next({ formats: ['F01'], place: 'lift', rng: F.rand, now: Date.now(), last: ((F.Task.recent || []).slice(-1)[0] || {}).format }); } catch (e) { console.error('[f_num liftOffer]', e); }
  if (!item || item.format !== 'F01' || !(+item.target >= 10 && +item.target <= 20)) return null;
  const byPlate = typeof F.Castle.roomByPlate === 'function' ? F.Castle.roomByPlate : null;
  let t = +item.target;
  if (byPlate) {
    const plates = []; for (let n = 10; n <= 20; n++) { try { if (byPlate(n)) plates.push(n); } catch (e) {} }
    if (!byPlate(t)) {
      if (!plates.length) return null;
      t = plates.slice().sort((x, y) => Math.abs(x - item.target) - Math.abs(y - item.target))[0];
      Object.assign(item, { target: t, n: t, key: (item.strand || 'T-NAVN') + ':' + t, choices: null, distractors: [] });
    }
  }
  const here = F.Castle.rooms && F.Castle.cur && F.Castle.rooms[F.Castle.cur];
  if (here && here.num === t) return null;
  const P = F.Player.pos;
  const th = o.thing || F.Things.list.find(x => x.type === 'c_heis' && x.space === F.Space.cur && Math.hypot(x.x - P.x, x.z - P.z) < 8) || null;
  const res = await F.Task.run(item, Object.assign({ place: 'lift', thing: th }, o.ctx || {}));
  // the ride: to the floor of the room on that plate (the castle's own ride – doors, landing, glitter trail)
  const cell = byPlate ? byPlate(t) : null;
  if (res && !res.aborted && cell && typeof L.travel === 'function' && F.Space.cur === 'in') {
    const f = cell.f != null ? cell.f : cell.floor != null ? cell.floor : 0;
    try {
      for (let i = 0; i < 30 && (F.Task.current || (F.Player && F.Player.frozen)); i++) await F.T.sleep(100);   // the stage lets go of her first
      await F.T.sleep(300);
      let ok = await L.travel(f + 1);
      if (!ok && !F.Task.current && F.Space.cur === 'in') { await F.T.sleep(500); ok = await L.travel(f + 1); }
      NUM._liftRide = { f, ok };
    } catch (e) { console.warn('[f_num liftOffer travel]', e); }
  }
  return res;
};

/* --------------------------------------------------------------------- F02 Postrunden (tap the house with number N / after / before / missing) */
fmt('F02', { name: 'Postrunden', strands: { 'T-NAVN': [2, 6], 'T-ORDEN': [1, 3] }, places: ['village', 'street', 'any'], roles: null, family: 'tall-velg', think: 'AVKODE',
  tpl: ['num_f02_q', 'num_f02_etter', 'num_f02_for', 'num_f02_ok', 'num_f02_feil', 'num_f02_hull', 'num_f02_hvilket'],
  async run(item, S) {
    const K = Kit(item, S, this); const ord = item.strand === 'T-ORDEN';
    let t = item.target;
    let mode = K.p.mode || (ord ? (Array.isArray(K.p.seq) ? 'mangler' : K.p.dir === 'before' ? 'for' : 'etter') : 'nummer');
    if (mode === 'for' && t + 1 > 21) mode = 'etter';
    if (mode === 'etter' && t - 1 < 9) mode = 'for';
    if (mode === 'nummer') K.secret(t);                       // v4 C1: «Brevet skal til nummer …»
    // outdoors in a village: the street's real doors are the answer (N2–N4, O1–O2); the board elsewhere
    if (mode !== 'mangler' && !(item.strand === 'T-NAVN' && item.rung >= 5)) {
      const vil = villageNear(K);
      if (vil) { const r = await villagePost(K, mode, vil); if (r) return r; }
    }
    // the street: houses with number plaques, in order like a real street
    let nums;
    // v4 hint_leaks 15: «huset etter 13» on the board – the answer house carries a «?» plaque and she gives its NUMBER (chips at s0,
    // ≥ 5 chips at s1, keypad at s2); the other houses (except the reference) show «·» above s0, so the labelled neighbour of the
    // reference is never the answer
    const askNum = ord && mode !== 'mangler';
    if (mode === 'mangler') nums = Array.isArray(K.p.seq) ? K.p.seq.map(v => v == null ? t : v) : [t - 1, t, t + 1, t + 2];
    else if (ord) { const ref0 = mode === 'etter' ? t - 1 : t + 1; const lo = U.clamp(Math.min(t, ref0) - Math.floor(K.rng() * 2), 1, 96); nums = [lo, lo + 1, lo + 2, lo + 3]; if (!nums.includes(t) || !nums.includes(ref0)) nums = mode === 'etter' ? [t - 2, t - 1, t, t + 1] : [t - 1, t, t + 1, t + 2]; }
    else nums = (item.sup >= 1 ? widen(K.rng, t, item.choices.map(Number), item.sup >= 2 ? 6 : 5, 1, 99) : item.choices.slice()).sort((a, b) => a - b);
    const refN = mode === 'etter' ? t - 1 : mode === 'for' ? t + 1 : null;
    const n = nums.length, w = Math.max(5.4, n * 1.6 + 0.4);
    const B = K.board({ style: 'street', w, d: 2.4, h: 1.7, tilt: 0.72 });
    const walls = ['cream', 'peach', 'mint', 'butter', 'lavender', 'sky'], roofs = ['roofRed', 'roofMint', 'roofBlue', 'roofPink', 'roofLilac'];
    const houses = [], plaques = [];
    nums.forEach((v, i) => {
      const h = piece('fx_n_hus', { wall: walls[(v * 7 + i) % walls.length], roof: roofs[(v * 3 + i) % roofs.length] }, 1.3, { hk: 0.75 });
      B.add(h, (i - (n - 1) / 2) * (w - 0.6) / n, -0.35); h.userData.num = v; houses.push(h);
      const hidden = (mode === 'mangler' || askNum) && v === t;
      const dot = askNum && !hidden && v !== refN && item.sup >= 1;
      plaques.push(B.label(h, hidden ? '?' : dot ? '·' : String(v), { cls: 'num plaque' + (hidden || dot ? ' blank' : ''), dy: 1.5, onClick: () => B.tap(h) }));
    });
    const brev = piece('fx_n_brev', {}, 0.6); B.add(brev, 0, 0.92, 0.05);
    const houseOf = v => houses.find(h => h.userData.num === +v);
    const ask = () => mode === 'nummer' ? (inSet('NUM_CODE', t) ? K.prompt('num_f02_q', { n: t }) : K.prompt('num_f01_q2', { n: U.clamp(t, 10, 100) }))
      : mode === 'etter' ? K.prompt('num_f02_etter', { n: t - 1 }) : mode === 'for' ? K.prompt('num_f02_for', { n: t + 1 })
      : K.say('num_f02_hull').then(() => K.prompt('num_f02_hvilket', {}));
    K.hint(async (tag, v) => {
      const h = houseOf(v);
      if (h && inSet('NUM_CODE', v)) await K.say('num_f02_feil', { n: +v }, '');
      if (!ord && (tag === 'REVERSAL' || tag === 'DECADE')) await contrastHint(K, t, +v, { z: 0.6 });
      else if (!ord) await numHint(K, t, +v, tag);
      else { // walk the street counting, pause at the right door
        // v5 (playtest2): only numbers she can SEE are read – houses masked «·» (etter/før above s0) are passed in silence, so the
        // walk never reads out the neighbours that make the «?» obvious (hint_leaks 15)
        for (const hh of houses) {
          bounce(hh, 0.15); const hv = hh.userData.num;
          if (hv === t) { await sleep(600); continue; }
          if (askNum && item.sup >= 1 && hv !== refN) { await sleep(350); continue; }
          await K.num(hv);
        }
      }
      await ask();
    }, ord ? 'post' : null);
    let done;
    if (mode === 'mangler' || askNum) {
      if (askNum) { const hq = houseOf(t); if (hq) { glowObj(hq, true); bounce(hq, 0.2); } }
      ask(); done = K.answerNum(item.choices, { min: 0, max: 99 });
    }
    else {
      K.meta('board', 1 / nums.length);
      done = K.arm({ answer: t });
      const wdg = K.widget({ kind: 'board', values: nums,
        feed: v => { const h = houseOf(v) || houses.find(x => x.userData.num !== t); return K.submit(h.userData.num, wdg); },
        mark: (v, cls) => { const h = houseOf(v); if (!h) return; if (cls === 'wrong') shake(h); else { glowObj(h, false); bounce(h, 0.3); } },
        solution: v => { const h = houseOf(v); if (h) { glowObj(h, true); const loop = () => { if (!B.alive || S.solved) return; bounce(h, 0.35).then(loop); }; loop(); } } });
      houses.forEach(h => B.pick(h, () => K.submit(h.userData.num, wdg)));
      ask();
    }
    await done;
    if (mode === 'mangler' || askNum) plaques[nums.indexOf(t)].set(String(t)).cls('blank', false);
    const h = houseOf(t);
    if (h) { glowObj(h, false); const to = h.position.clone(); to.z += 0.62; to.y += 0.3; await hopTo(brev, to, 650, 0.9); F.sfx.door(); bounce(h, 0.12); }
    await K.say('num_f02_ok', {}, vOK('num_f02_ok', K.voice));                 // v5 (#24): the asker's voice or Puff – never a hard-coded Per
    return S.result();
  } });

/* F02 in a real village (WORLD: F.W.villages): odd numbers on the left side of the street, even on the right, like a real street.
   She taps a door (or its number plaque) → the fairy flies there with the letter and knocks → the resident opens.
   Wrong door: the resident says which number lives here (hint), the door closes. Right door: the letter is delivered. */
/* v5d WP-R3 (WP-W request, DESIGN4 §8 natural streets): a street now runs numLo…numHi (base 1 | 9–13 | 21–47, odd west / even east, gaps
   = numbers with no house). F02 reads the street's REAL doors and keeps the ITEM's band (the rung's numbers – its spoken lines have clips
   for them): T-NAVN N2 10–15, N3–N4 10–20; T-ORDEN O1 11–15, O2–O3 11–19 (the reference door ±1 may lie just outside). A street with
   fewer than 3 doors in the band (21–58, 1–12 …) is not used – the letter round runs on the board instead. */
function postBand(item) {
  const ord = item.strand === 'T-ORDEN';
  const b = ord ? (item.rung <= 1 ? [11, 15] : [11, 19]) : (item.rung <= 2 ? [10, 15] : [10, 20]);
  return { lo: b[0], hi: b[1], ord };
}
function villageNear(K) {
  if (F.Space.cur !== 'out' || !F.W || !F.W.villages || K.p.board || K.ctx.board) return null;
  const P = F.Player.pos;
  let vs; try { vs = F.W.villages({ x: P.x, z: P.z }, 90) || []; } catch (e) { return null; }
  const v = vs.find(q => Math.abs(P.x - q.x) < 24 && Math.abs(P.z - q.z) < 54);
  if (!v) return null;
  const bd = postBand(K.item), lo = bd.lo - (bd.ord ? 1 : 0), hi = bd.hi + (bd.ord ? 1 : 0);
  // the street's own range (worldgen numLo / numHi): no overlap with the band → not this street
  if (v.numLo != null && v.numHi != null && (v.numHi < bd.lo || v.numLo > bd.hi)) return null;
  const gaps = new Set(v.gaps || []);
  const houses = v.houses.map(h => Object.assign({}, h, { th: F.Things.byId(h.doorThingId) }))
    .filter(h => h.th && h.th.obj && h.num >= lo && h.num <= hi && !gaps.has(h.num));
  return houses.filter(h => h.num >= bd.lo && h.num <= bd.hi).length >= 1 && houses.length >= 3 ? { v, houses, band: bd } : null;
}
async function villagePost(K, mode, vil) {
  const S = K.S, item = K.item, ord = item.strand === 'T-ORDEN', P = F.Player;
  const byNum = new Map(vil.houses.map(h => [h.num, h]));
  // v3 WP5 §9.4: the door she knocked on (ctx.refHouse) is the house she counts from: «Brevet skal til huset etter 14.» (T-ORDEN items)
  const refH = K.ctx && K.ctx.refHouse != null ? +K.ctx.refHouse : null;
  if (refH != null && ord && mode !== 'mangler' && byNum.has(refH)) {
    const bd2 = vil.band || postBand(item), lo2 = bd2.lo, hi2 = bd2.hi;
    const cands = [['etter', refH + 1], ['for', refH - 1]].filter(([, x]) => byNum.has(x) && x >= lo2 && x <= hi2);
    const pick = cands.find(c => c[0] === mode) || cands[0];
    if (pick) {
      mode = pick[0];
      if (item.target !== pick[1]) { const t2 = pick[1]; item.target = t2; item.n = t2; item.distractors = []; Object.assign(S.item, { target: t2, n: t2, key: item.strand + ':' + t2, distractors: [] }); S.expected = t2; }
      K.refHouse = refH;
    }
  }
  const refOf = x => mode === 'etter' ? x - 1 : mode === 'for' ? x + 1 : null;
  const bd = vil.band || postBand(item), lo = bd.lo, hi = bd.hi;                    // v5d: the item's band (postBand)
  const okT = x => byNum.has(x) && x >= lo && x <= hi && (refOf(x) == null || byNum.has(refOf(x)));
  let t = item.target;
  // v3 WP5: a T-NAVN letter from a door never goes to that same door (she is standing at it)
  const okT2 = x => okT(x) && !(refH != null && !ord && x === refH);
  if (!okT2(t)) {
    // the street hasn't got that house: the letter goes to a house that is here (LEARN records the real item)
    const pool = [...byNum.keys()].filter(okT2);
    if (!pool.length) return null;
    const pref = pool.filter(x => (item.choices || []).includes(x));
    t = U.pick(K.rng, pref.length ? pref : pool);
    item.target = t; item.n = t; item.distractors = [];
    Object.assign(S.item, { target: t, n: t, key: item.strand + ':' + t, distractors: [] });
    S.expected = t;
  }
  if (mode === 'nummer') { S.secret = []; K.secret(t); }      // v4 C1 (the letter may have been re-addressed to a house that is here)
  const ref = refOf(t);
  // the houses in play: that half of the street (north or south of the plaza – v5d: by where the house stands, so any numbering
  // works; + the house she counts from); N2 / s0: just a few far apart
  const vz = vil.v.z != null ? vil.v.z : 0, tH = byNum.get(t);
  const half = h => (h && h.z > vz) ? 0 : 1;
  let play = vil.houses.filter(h => half(h) === half(tH) || h.num === ref);
  // a half with only 1–2 houses borrows the nearest numbers across the plaza (always ≥ 3 doors to choose from)
  if (play.length < 3) vil.houses.slice().sort((p, q) => Math.abs(p.num - t) - Math.abs(q.num - t)).forEach(h => { if (play.length < 3 && !play.includes(h)) play.push(h); });
  if (!ord && (item.rung <= 2 || item.sup === 0)) {
    const set = new Set([t]);
    (item.choices || []).forEach(x => { if (byNum.has(+x) && Math.abs(+x - t) >= 2 && play.some(h => h.num === +x)) set.add(+x); });
    U.shuffle(K.rng, play.filter(h => Math.abs(h.num - t) >= 2).map(h => h.num)).forEach(x => { if (set.size < 3) set.add(x); });
    if (set.size >= 2) play = vil.houses.filter(h => set.has(h.num));
  }
  const inPlay = n => play.some(h => h.num === +n);
  const y0 = vil.v.y != null ? vil.v.y : P.pos.y;
  // camera: along the street, framing the houses in play
  const cam = F.R.cam, keep = { yaw: cam.yawGoal, pitch: cam.pitchGoal };
  const xs = play.map(h => h.door.x), zs = play.map(h => h.door.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, span = Math.max(...zs) - Math.min(...zs);
  cam.yawGoal = Math.round(cam.yawGoal / Math.PI) * Math.PI;
  cam.pitchGoal = 0.86;
  cam.focus = new V3(cx, y0, cz + Math.cos(cam.yawGoal) * 2.5);
  cam.distGoal = U.clamp(span * 0.9 + 12, 18, 40);
  // the stage's glowing floor disc belongs to board tasks – here the street is the stage
  S.objs.forEach(o => { if (o.geometry && o.geometry.type === 'CircleGeometry') o.visible = false; });
  // doors the stage tidied away are put straight back
  (S.cleared || []).slice().forEach(c => { if (play.some(h => h.th.obj === c.o)) { c.o.scale.copy(c.s0); (c.labs || []).forEach(L => L.show(true)); S.cleared.splice(S.cleared.indexOf(c), 1); } });
  const B = K.board({ style: 'none', w: 4, d: 2 });
  const scene = F.R.cur, made = [];
  // number plaques: the street's own plates hide; tappable ones take their place on the houses in play
  const hidden = [];
  const plaques = new Map();
  for (const h of play) {
    const px = h.door.x - h.side * 0.3, pz = h.door.z;
    if (F.UI.labels) for (const L of F.UI.labels) if (L.anchor && L.anchor.isVector3 && L.visible && L.raw === String(h.num) && Math.hypot(L.anchor.x - px, L.anchor.z - pz) < 1.2) { L.show(false); hidden.push(L); }
    const a = new THREE.Object3D(); a.position.set(px, y0 + 2.85, pz); scene.add(a); made.push(a);
    plaques.set(h.num, B.label(a, String(h.num), { cls: 'num plaque vdoor', dy: 0.2, always: true, onClick: () => tapHouse(h) }));
  }
  // the letter rides along with the fairy
  const brev = piece('fx_n_brev', {}, 0.7); scene.add(brev); made.push(brev);
  let carry = true;
  const offCarry = F.on('tick', () => { if (!carry) return; const hd = P.heading; brev.position.set(P.obj.position.x + Math.sin(hd) * 0.5, P.obj.position.y + 1.25, P.obj.position.z + Math.cos(hd) * 0.5); brev.rotation.y = hd; });
  let opened = null;
  const doorPart = h => (h.th.parts || {}).door;
  const openDoor = async h => {
    for (let i = 0; i < 2; i++) { F.sfx.thud(); await sleep(170); }
    const d = doorPart(h);
    if (d) { if (d.userData._r0 == null) d.userData._r0 = d.rotation.y; const r0 = d.userData._r0; F.sfx.door(); tween(380, k => { d.rotation.y = r0 - 1.7 * ease(k); }); }
    let who = null;
    if (F.VOX.has('o_nabo')) { who = F.VOX.make('o_nabo', h.th.modelOpts || {}); who.position.set(0, 0, -0.06); h.th.obj.add(who); popIn(who, 240); }
    opened = { h, who };
    await sleep(380);
  };
  const closeDoor = () => {
    if (!opened) return; const { h, who } = opened; opened = null;
    if (who) tween(220, k => who.scale.setScalar(Math.max(0.01, 1 - k))).then(() => h.th.obj.remove(who));
    const d = doorPart(h); if (d && d.userData._r0 != null) { const r1 = d.rotation.y, r0 = d.userData._r0; tween(380, k => { d.rotation.y = r1 + (r0 - r1) * ease(k); }).then(() => F.sfx.door()); }
  };
  const flyTo = async h => {
    // beside the door on the side away from the camera, so the door and the resident stay in view
    const th = h.th, to = new V3(th.x - h.side * 1.15, 0, th.z - Math.cos(cam.yawGoal) * 1.05), from = P.pos.clone();
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    P.heading = Math.atan2(to.x - from.x, to.z - from.z);
    try { const a = from.clone(); a.y += 1.2; const b2 = to.clone(); b2.y = y0 + 1.2; if (F.FX.trail) F.FX.trail(a, b2, { ms: 500 }); } catch (e) {}
    F.sfx.whoosh && F.sfx.whoosh();
    await tween(U.clamp(dist * 55, 300, 900), k => { const e = U.smooth(k); P.pos.x = from.x + (to.x - from.x) * e; P.pos.z = from.z + (to.z - from.z) * e; });
    P.heading = Math.atan2(th.x - P.pos.x, th.z - P.pos.z);
  };
  let busy = false, queued = null;
  async function tapHouse(h, force) {
    if (!inPlay(h.num)) return;
    if (busy) { if (force) queued = h; return; }
    if (!force && (w.locked || S.solved || S.ended)) return;
    busy = true;
    try {
      closeDoor();
      const L = plaques.get(h.num); if (L) L.cls('pulse');
      await flyTo(h);
      await openDoor(h);
      if (L) L.cls('pulse', false);
      if (!S.ended) K.submit(h.num, w);
    } catch (e) { console.error('[f_num F02 village]', e); }
    busy = false;
    if (queued) { const q = queued; queued = null; F.T.timeout(() => tapHouse(q, true), 50); }
  }
  const done = K.arm({ answer: t });
  K.meta('scene', 1 / Math.max(2, play.length));
  const w = K.widget({ kind: 'doors', values: play.map(h => h.num),
    feed: v => { const h = (inPlay(v) && byNum.get(+v)) || play.find(x => x.num !== t) || byNum.get(t); tapHouse(h, true); return true; },
    mark: (v, cls) => { const L = plaques.get(+v); if (L && cls === 'wrong') { L.cls('wrong'); F.T.timeout(() => L.cls('wrong', false), 1400); } },
    solution: v => { const L = plaques.get(+v); if (L) L.cls('sol'); const h = byNum.get(+v); if (h) { const p = new V3(h.door.x, y0 + 0.2, h.door.z); const ring = () => { if (!B.alive || S.solved) return; if (F.FX.ring) F.FX.ring(p.clone(), 0xffe066); F.T.timeout(ring, 900); }; ring(); } } });
  play.forEach(h => B.pick(h.th.obj, () => tapHouse(h), { min: 56 }));
  const ask = () => mode === 'nummer' ? K.prompt('num_f02_q', { n: t }) : mode === 'etter' ? K.prompt('num_f02_etter', { n: ref }) : K.prompt('num_f02_for', { n: ref });
  K.hint(async (tag, v) => {
    const h = byNum.get(+v);
    if (h && opened && opened.h === h) { if (inSet('NUM_10_20', h.num)) await say('num_f02_bor', { n: h.num }, h.resident && h.resident.voice); else if (inSet('NUM_CODE', h.num)) await K.say('num_f02_feil', { n: h.num }, ''); }
    closeDoor();
    if (ord && ref != null) { const L = plaques.get(ref); if (L) L.cls('pulse'); await K.num(ref); await sleep(300); if (L) L.cls('pulse', false); }
    else if (tag === 'REVERSAL' || tag === 'DECADE' || tag === 'DIGIT-ONLY') await numHint(K, t, +v, tag);
    await ask();
  }, ord ? 'post' : null);
  K.offs.push(() => {
    carry = false; offCarry(); made.forEach(o => o.parent && o.parent.remove(o)); hidden.forEach(L => L.show(true)); closeDoor();
    cam.yawGoal = keep.yaw; cam.pitchGoal = keep.pitch;
  });
  if (NUM.cur && NUM.cur.kit === K) NUM.cur.village = { name: vil.v.name, play: play.map(h => h.num), target: t, mode };
  await sleep(500);
  ask();
  await done;
  // the payoff: the letter flies to the resident, hearts, thanks in the resident's own voice
  const h = byNum.get(t);
  carry = false;
  // close-up of the happy resident at the right door
  const base = cam.yawGoal; cam.yawGoal = base - h.side * 0.65 * Math.cos(base);
  cam.focus = new V3(h.door.x - h.side * 0.9, y0 + 0.6, h.door.z); cam.distGoal = 12;
  await sleep(350);
  const p0 = brev.position.clone(), p1 = new V3(h.door.x - h.side * 0.5, y0 + 1.25, h.door.z);
  await tween(520, k => { brev.position.lerpVectors(p0, p1, ease(k)); brev.position.y += Math.sin(k * Math.PI) * 0.8; brev.rotation.y += 0.2; });
  brev.visible = false; F.sfx.chime && F.sfx.chime();
  try { if (F.FX.burst) F.FX.burst(p1.clone(), { kind: 'heart', n: 14 }); else F.FX.sparkle(p1.clone()); } catch (e) {}
  if (opened && opened.who) bounce(opened.who, 0.25);
  await say('num_f02_ok', {}, (h.resident && h.resident.voice) || vOK('num_f02_ok', K.voice));
  closeDoor();
  return S.result();
}
NUM.villageNear = villageNear;

/* --------------------------------------------------------------------- F06 Telle-brettet (count a ten-structure, choose the number) */
fmt('F06', { name: 'Telle-brettet', strands: { 'T-MENGDE': [1, 3] }, places: null, portable: true, family: 'telle', think: 'REGNE', tpl: ['num_f06_q'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    const th = thingFor(K);
    const B = K.board({ style: th.frames ? 'bakery' : 'wood', w: 6.4, d: 2.5, h: 0.7 });
    const T = TenView(B, { model: th.model, layout: th.frames ? 'frames' : 'rows', box: th.box, max: 20, container: item.sup < 2, size: 0.46 });
    const q = () => th.pl && inSet('NUM_PL', th.pl) ? K.prompt('num_f06_q', { pl: th.pl }) : K.prompt('core_f06', {});
    // items pop in one by one (fast) – the board fills like magic
    for (let i = 0; i < t; i++) { const o = T.place(i); o.visible = false; F.T.timeout(() => { o.visible = true; popIn(o, 180); if (i % 2 === 0) F.sfx.pop(); }, 45 * i); }
    let tenL = item.sup === 0 ? T.labelRow(0, '10') : null;
    const strip = (item.sup === 0 || K.p.strip) ? K.strip() : null;
    const ones = () => T.items.slice(10).filter(Boolean);
    // v5: before an attempt only the structure (the ten glows, the rest glow without numbers); after an error «full rad er ti» and the
    // count along from ten at s0 (silent plings above s0) – never to n − 1 before she has answered
    K.hint(async (tag, v) => { if (!tenL) tenL = T.labelRow(0, '10'); await tenAfterError(K, T.rowItems(0), ones(), { strip, frames: !!th.frames }); await q(); },
      async () => { await tenNudge(K, [T.rowItems(0), T.rowItems(1)], { frames: !!th.frames }); await q(); });
    K.sol(async () => { if (S.active && S.active.solution) S.active.solution(t); await K.num(10); await countAlong(K, ones(), 11, { strip, keep: true }); await K.say('core_sol_chip', {}, ''); });
    await sleep(45 * t + 150);
    q();
    await K.answerNum(item.choices);                       // v4: s0 chips, s1 ≥ 5 chips, s2 keypad (SYNTHESIS §3.3)
    T.items.filter(Boolean).forEach(o => glowObj(o, false));
    T.items.filter(Boolean).forEach((o, i) => F.T.timeout(() => bounce(o, 0.25), i * 35));
    await sleep(350 + t * 35);
    return S.result();
  } });

/* --------------------------------------------------------------------- the builder (F07 / F10 / F12 compose): tens + ones on the board */
function Builder(B, o) {
  // o: {oneModel, oneOpts, style, layout:'rows'|'frames', tenBox, maxTens, size, cell, x, z, onBundle}
  const Bd = { tens: [], ones: [], o };
  const size = o.size || 0.4, cell = o.cell || 0.5;
  const g = new THREE.Group(); B.add(g, o.x || 0, o.z || 0); Bd.group = g;
  const maxT = o.maxTens || 2;
  const frames = o.layout === 'frames';
  const rowGap = o.rowGap || 0.62;
  const fw = 5 * cell + 0.5;
  // where ten-group r sits (rows: stacked rows; frames: two frames side by side, the third below-left)
  const rowPos = r => frames ? new V3(r < 2 ? (r ? 1 : -1) * fw / 2 : -fw / 2, 0, r < 2 ? -0.55 : 0.72) : new V3(0, 0, (r - maxT / 2) * rowGap);
  const localSlot = i => frames ? new V3(((i % 5) - 2) * cell, 0.08, (Math.floor(i / 5) - 0.5) * cell) : new V3((i - 4.5) * cell + (i >= 5 ? 0.11 : -0.11), 0.08, 0);
  const slotOf = (row, i) => rowPos(row).add(localSlot(i));
  Bd.slotOf = slotOf;
  const mkOne = () => piece(o.oneModel, o.oneOpts, size, { style: o.style });
  // empty containers for every row (tens + the ones row) – she sees where things go before she starts
  if (o.tenBox) for (let r = 0; r <= maxT; r++) { const bx = F.VOX.make(frameDef(o.tenBox, frames ? 5 : 10, frames ? 2 : 1, Math.round(cell * 10), frames ? 0 : 2)); bx.position.copy(rowPos(r)); bx.position.y = -0.02; g.add(noShadow(bx)); }
  function mkTen() {
    const tg = new THREE.Group();
    for (let i = 0; i < 10; i++) { const p = mkOne(); p.position.copy(localSlot(i)); tg.add(p); }
    return noShadow(tg);
  }
  const pickT = t => B.pick(t, () => Bd.onTapPiece && Bd.onTapPiece(t, 'ten'));
  const pickO = p => B.pick(p, () => Bd.onTapPiece && Bd.onTapPiece(p, 'one'));
  Bd.total = () => Bd.tens.length * 10 + Bd.ones.length;
  Bd.layout = function () {
    Bd.tens.forEach((t, r) => t.position.copy(rowPos(r)));
    const row = Bd.tens.length;
    Bd.ones.forEach((p, i) => p.position.copy(slotOf(row, i)));
  };
  Bd.addTen = async function () {
    if (Bd.tens.length >= maxT) { F.sfx.boing(); return false; }
    const t = mkTen(); g.add(t); Bd.tens.push(t); pickT(t);
    Bd.layout(); popIn(t, 280); F.sfx.crystal ? F.sfx.crystal() : F.sfx.pop();
    return true;
  };
  Bd.addOne = async function () {
    if (Bd.ones.length >= 9 && Bd.tens.length >= maxT) { F.sfx.boing(); return false; }
    const p = mkOne(); g.add(p); Bd.ones.push(p); pickO(p);
    Bd.layout(); popIn(p, 220); F.sfx.pop();
    if (Bd.ones.length === 10) await Bd.bundle();
    return true;
  };
  Bd.bundle = async function () {
    // ten ones jump together and become one ten (base ten made visible)
    const ones = Bd.ones.splice(0, 10);
    ones.forEach(p => B.unpick(p));
    await tween(380, k => ones.forEach(p => { p.position.y = 0.08 + Math.sin(k * Math.PI) * 0.4; }));
    ones.forEach(p => g.remove(p));
    const t = mkTen(); g.add(t); Bd.tens.push(t); pickT(t);
    Bd.layout(); popIn(t, 300); F.sfx.chime();
    if (o.onBundle) await o.onBundle();
    return true;
  };
  Bd.remove = function (obj, kind) {
    const arr = kind === 'ten' ? Bd.tens : Bd.ones; const i = arr.indexOf(obj); if (i < 0) return false;
    arr.splice(i, 1); B.unpick(obj); g.remove(obj); Bd.layout(); F.sfx.pop(); return true;
  };
  Bd.set = function (n) {
    Bd.tens.splice(0).forEach(t => { B.unpick(t); g.remove(t); }); Bd.ones.splice(0).forEach(p => { B.unpick(p); g.remove(p); });
    for (let i = 0; i < Math.floor(n / 10) && Bd.tens.length < maxT; i++) { const t = mkTen(); g.add(t); Bd.tens.push(t); pickT(t); }
    for (let i = 0; i < n % 10; i++) { const p = mkOne(); g.add(p); Bd.ones.push(p); pickO(p); }
    Bd.layout();
  };
  // translucent pulsing "ghost" of the target structure (the solution she then builds herself)
  Bd.ghost = function (n) {
    Bd.unghost();
    const gg = new THREE.Group(); g.add(gg); Bd.ghostG = gg;
    const tens = Math.floor(n / 10), ones = n % 10;
    const mat = new THREE.MeshBasicMaterial({ color: 0x9b7fd6, transparent: true, opacity: 0.45, depthWrite: false });
    const geo = new THREE.BoxGeometry(size * 0.8, size * 0.8, size * 0.8);
    const mk = pos => { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.position.y += size * 0.4; gg.add(m); };
    for (let r = 0; r < tens; r++) for (let i = 0; i < 10; i++) mk(slotOf(r, i));
    for (let i = 0; i < ones; i++) mk(slotOf(tens, i));
    const t0 = F.T.now; const off = F.on('tick', () => { if (!gg.parent) return off(); mat.opacity = 0.42 + 0.22 * Math.sin((F.T.now - t0) * 5); });
  };
  Bd.unghost = () => { if (Bd.ghostG) { g.remove(Bd.ghostG); Bd.ghostG = null; } };
  return Bd;
}
NUM.Builder = Builder;

/* shared build task (F07 Tryllebygg, F10 Bakebrett M4): +10 / +1 buttons, tap a placed piece to remove it, ✓ */
async function buildTask(K, o) {
  const S = K.S, item = K.item, t = item.target, quiet = K.quiet;
  const B = K.board({ style: o.board, w: 6.6, d: 2.7, h: 0.6 });
  const goal = goalPlaque(B, t);
  const maxT = Math.max(2, Math.min(3, K.p.maxRods || 2));
  const Bd = Builder(B, { oneModel: o.oneModel, oneOpts: o.oneOpts, style: o.style, layout: o.layout, tenBox: o.tenBox, maxTens: o.layout === 'frames' ? 2 : maxT,
    size: o.size || 0.38, cell: 0.46, x: -0.35, z: 0.05, onBundle: () => o.bundle && inSet('NUM_BUNDLE', o.bundle) ? K.say('num_f07_bundle', { s: o.bundle }, '') : null });
  if (o.preTens) Bd.set(o.preTens * 10);
  if (NUM.cur && NUM.cur.kit === K) NUM.cur.builder = Bd;
  if (K.p.ghost) Bd.ghost(t);
  const A = K.actions([
    { id: 'ten', thumb: { model: o.tenThumb || tenDef(o.oneModel, 'frames', o.oneOpts), opts: {}, angle: 0.25 }, label: '10', cls: 'ten' },
    { id: 'one', thumb: { model: o.oneModel, opts: o.oneOpts }, label: '1', cls: 'one' },
    { id: 'ok', label: '✓', cls: 'gold okbtn' },
  ]);
  // v4 hint_leaks 13: s0 counts every piece aloud, s1 only the full tens, s2 is silent (she can't press until she hears the target)
  const speakTotal = () => { K.countSay(Bd.total()); };
  K.meta('build', 0.01);
  const done = K.arm({ answer: t });
  const w = K.widget({ kind: 'build', values: [],
    feed: v => { Bd.set(+v); return K.submit(Bd.total(), w); },
    mark: (v, cls) => { if (cls === 'wrong') { shake(Bd.group); goal.cls('pulse'); F.T.timeout(() => goal.cls('pulse', false), 1200); } else { Bd.unghost(); A.glow('ok', false); } },
    solution: v => { Bd.set(0); Bd.ghost(+v); A.glow(+v >= 10 ? 'ten' : 'one'); A.glow('ok'); },
    lock: on => A.lock(on) });
  A.on(async id => {
    if (w.locked || S.solved) return;
    if (id !== 'ok') K.activity();
    if (id === 'ten') { if (await Bd.addTen()) speakTotal(); }
    else if (id === 'one') { if (await Bd.addOne()) speakTotal(); }
    else if (id === 'ok') K.submit(Bd.total(), w);
  });
  Bd.onTapPiece = (obj, kind) => { if (w.locked || S.solved) return; if (Bd.remove(obj, kind)) speakTotal(); };
  K.onKey(e => { if (e.key === 'Enter') A.press('ok'); else if (e.key === '+') A.press('ten'); else if (e.key === '1') A.press('one'); else return false; });
  // v5 (playtest2): «Det ble for få» only after she has built something and pressed ✓ – before an attempt the goal plaque pulses and
  // the two buttons are shown (the big one is ten, the small one is one); never how many of each
  K.hint(async (tag, v) => {
    goal.cls('pulse');
    if (v != null) await sayTotal(+v);
    if (v != null && +v > t) await K.say('num_for_mange', {}, ''); else if (v != null && +v < t) await K.say('num_for_fa', {}, '');
    if (t >= 10 && t <= 20) await K.say('num_vi_trenger', { n: t }, '');
    goal.cls('pulse', false);
    if ((tag === 'COUNT-ONES' || tag === 'DIGIT-ONLY') && t > 10 && t < 20) { A.glow('ten'); await K.say('num_split', { s: `${t} er ti og ${t - 10}` }, ''); A.glow('ten', false); }
  }, async () => {
    goal.cls('pulse');
    if (t >= 10 && t <= 20) await K.say('num_vi_trenger', { n: t }, '');
    goal.cls('pulse', false);
    A.glow('ten'); await K.say('num_f07_how', {}, ''); A.glow('ten', false);
    if (K.countMode !== 'none' && Bd.total() > 0) await sayTotal(Bd.total());     // her own build so far (s0/s1 count aloud anyway)
    await K.say('num_trykk_hake', {}, '');
  });
  K.sol(async () => { w.solution(t); if (t > 10 && t < 20) await K.say('num_split', { s: `${t} er ti og ${t - 10}` }, ''); await K.say('num_se_her', {}, ''); });
  await o.prompt();
  await done;
  Bd.unghost(); A.glow('ok', false); A.glow('ten', false); A.glow('one', false);
  return { B, Bd, A };
}

/* --------------------------------------------------------------------- F07 Tryllebygg (fairy manipulative at a power spot) */
fmt('F07', { name: 'Tryllebygg', strands: { 'T-MENGDE': [4, 4] }, places: ['tryllepunkt', 'any'], family: 'bygg', tpl: ['num_f07_q', 'num_f07_how', 'num_f07_bundle', 'num_f07_ok'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    const kind = K.p.skin || fairy(); const sk = SKIN[kind];
    // v5d WP-R3 (WP-A request): params.model / ctx.theme (the animal's food) is conjured instead of the fairy skin – neutral line
    // «Vi trenger 14.» (the board shows what), wooden rows, no skin bundle line
    const own = !K.p.skin ? themeModel(K) : null;
    const r = own
      ? await buildTask(K, { board: 'grass', oneModel: own, tenBox: 'wood', layout: 'rows', bundle: null,
        prompt: async () => { await K.prompt(t >= 10 && t <= 20 ? 'num_vi_trenger' : 'num_f07_how', t >= 10 && t <= 20 ? { n: t } : {}); if (item.sup === 0 || !NUM.seenHow) { NUM.seenHow = true; await K.say('num_f07_how', {}, ''); } } })
      : await buildTask(K, { board: sk.board, oneModel: skinModel(sk), tenBox: sk.box, layout: sk.frames ? 'frames' : 'rows', bundle: sk.bundle,
        prompt: async () => { await K.prompt('num_f07_q', { n: U.clamp(t, 10, 20), pl: sk.pl }); if (item.sup === 0 || !NUM.seenHow) { NUM.seenHow = true; await K.say('num_f07_how', {}, ''); } } });
    // the magic: every piece glows, sparkles and lifts off
    const all = [...r.Bd.tens, ...r.Bd.ones];
    F.sfx.magic(); all.forEach((p, i) => F.T.timeout(() => { glowObj(p, true); sparkleAt(p); }, i * 40));
    await Promise.all([tween(900, k => all.forEach(p => { p.position.y = ease(k) * 1.4; p.scale.setScalar(Math.max(0.01, 1 - k * 0.9)); })), K.say('num_f07_ok', {}, '')]);
    return S.result();
  } });

/* --------------------------------------------------------------------- F10 Bakebrett (trays of ten buns + singles; M8 «16 er ti og hvor mange til?») */
fmt('F10', { name: 'Bakebrett', strands: { 'T-MENGDE': [4, 8] }, rungs: [4, 8], places: ['kitchen', 'bakery', 'any'], roles: ['kokk'], family: 'bygg', tpl: ['num_f10_q', 'num_f10_m8', 'num_f10_brett', 'num_f10_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    // v5 WP-R2 (#3/#4): a chain / quest passes params.model (eggs, apples, the animal's food) – F10 builds THAT, with neutral lines
    // («Kan du hente 14 egg?»), and only real buns «bake» (the tray line, «Nam! Bollene er ferdige.»)
    const tm = themeModel(K);                                                      // v5d: params.model, else ctx.theme (WP-A)
    const own = tm && !/bolle/.test(tm) ? thingFor(K) : null;
    const bun = own ? own.model : modelFor('bolle');
    const okLine = () => own ? K.say('num_f09_ok', {}, vOK('num_f09_ok', K.voice)) : K.say('num_f10_ok', {}, vOK('num_f10_ok', K.voice));
    if (item.rung === 8 || K.p.whole != null) {
      // M8: one full tray is baked – how many more for the whole?
      const whole = K.p.whole != null ? +K.p.whole : (item.n != null ? +item.n : item.target + 10);
      const ones = whole - 10;
      const B = K.board({ style: 'bakery', w: 6.4, d: 2.6, h: 0.5 });
      const Bd = Builder(B, { oneModel: bun, layout: 'frames', tenBox: 'tray', maxTens: 2, size: 0.4, cell: 0.48 });
      Bd.set(10);
      if (K.p.showOnes) Bd.ghost(whole);
      const goalL = goalPlaque(B, whole);
      const ask = async () => { if (!own) await K.say('num_f10_brett'); await K.prompt('num_f10_m8', { n: U.clamp(whole, 10, 20) }); };
      const glowTen = async () => { Bd.tens.forEach(tn => glowObj(tn, true)); goalL.cls('pulse'); await K.num(10); await sleep(400); Bd.tens.forEach(tn => glowObj(tn, false)); goalL.cls('pulse', false); };
      // v5 (playtest2): the hint never pops the missing buns in to be counted. Before an attempt: the full tray («ti») and the goal.
      // After an error: HER answer is acted out (her buns pop into the empty row, «Det ble X», too many / too few), then the ten again.
      K.hint(async (tag, v) => {
        const k = Math.round(+v);
        if (v != null && isFinite(k) && k >= 0 && k <= 10 && k !== ones) {
          const tmp = []; for (let i = 0; i < k; i++) { const p = piece(bun, {}, 0.4); p.position.copy(Bd.slotOf(1, i)); Bd.group.add(p); tmp.push(p); popIn(p, 140); }
          await sleep(300 + 60 * k); await sayTotal(10 + k); await K.say(k > ones ? 'num_for_mange' : 'num_for_fa', {}, '');
          tmp.forEach(p => Bd.group.remove(p));
        }
        await glowTen(); await ask();
      }, async () => { await glowTen(); await ask(); });
      K.sol(async () => { if (S.active && S.active.solution) S.active.solution(ones); await K.say('num_split', { s: `${whole} er ti og ${ones}` }, ''); });
      ask();
      await K.answerNum(item.choices, { answer: ones, min: 0, max: 10 });
      Bd.unghost();
      for (let i = 0; i < ones; i++) { await Bd.addOne(); await K.num(11 + i); }
      await okLine();
      return S.result();
    }
    const t = item.target;
    const nn = U.clamp(t, 10, 20);
    await buildTask(K, { board: own ? 'wood' : 'bakery', oneModel: bun, tenBox: own ? (own.box || 'wood') : 'tray', layout: 'frames', bundle: own ? null : 'Ti boller blir ett brett', size: 0.4,
      prompt: async () => {
        if (own) await (own.pl && inSet('NUM_PL', own.pl) ? K.prompt('num_f09_q', { n: nn, pl: own.pl }) : K.prompt('num_f09_q0', { n: nn }));
        else { await K.prompt('num_f10_q', { n: nn }); if (item.sup === 0) await K.say('num_f10_brett'); }
      } });
    await okLine();
    return S.result();
  } });

/* --------------------------------------------------------------------- F08 Tell-og-trykk (tap each scattered thing → it snaps into the ten-tray; choose the total) */
function scatter(rng, n, w, d, minD) {
  const pts = [];
  for (let tries = 0; pts.length < n && tries < 5000; tries++) {
    const x = (rng() - 0.5) * w, z = (rng() - 0.5) * d;
    if (pts.every(p => Math.hypot(p[0] - x, p[1] - z) >= minD)) pts.push([x, z]);
    if (tries > 2500) minD *= 0.97;
  }
  return pts;
}
fmt('F08', { name: 'Tell-og-trykk', strands: { 'T-MENGDE': [5, 6] }, places: ['farm', 'orchard', 'pond', 'any'], family: 'telle', think: 'REGNE', tpl: ['num_f06_q', 'num_f08_tap', 'num_f08_q'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    const th = thingFor(K, x => !x.frames);
    const B = K.board({ style: 'grass', w: 6.6, d: 3.0, h: 0.6 });
    const T = TenView(B, { model: th.model, layout: 'rows', box: th.box, max: 20, x: 0, z: -0.85, container: true, size: 0.38, cell: 0.46, rowGap: 0.5 });
    if (item.sup === 0) T.labelRow(0, '10');
    const pts = scatter(K.rng, t, B.w - 0.8, 1.35, 0.5);
    const loose = pts.map(([x, z]) => { const p = piece(th.model, {}, 0.4); B.add(p, x, z + 0.62); p.rotation.y = (K.rng() - 0.5) * 1.4; return p; });
    const strip = item.sup === 0 ? K.strip() : null;
    K.meta(item.sup >= 2 ? 'keypad' : 'chips', item.sup >= 2 ? 0.01 : item.sup === 1 ? 0.2 : 0.5);   // the answer step's mode (set again there)
    let counted = 0, allDone = null;
    const tapOne = p => {
      if (p.userData.in) { bounce(p, 0.15); return; }
      p.userData.in = true; B.unpick(p);
      const i = counted++;
      p.rotation.y = 0;
      hopTo(p, T.slots[i].clone().add(T.group.position), 330, 0.7); T.items[i] = p; if (strip) strip.mark(i + 1);
      F.sfx.pling(i % 10);
      // v4 hint_leaks 4: the game never counts for her up to the answer. s0: counting aloud is the scaffold, but the last piece is
      // only a pling (the total is never said before the question); s1: only «ti» (the full row); s2: silent taps
      if (counted < t) K.countSay(i + 1);
      if (counted === t && allDone) { const r = allDone; allDone = null; F.T.timeout(r, 450); }
    };
    loose.forEach(p => B.pick(p, () => { tapOne(p); K.activity(); }));
    // phase 1 widget: tap them all (no answer is submitted here)
    const tapW = K.widget({ kind: 'tapall', values: [], feed: () => { loose.filter(p => !p.userData.in).forEach(tapOne); return true; } });
    // v5 WP-R2 (parent's playtest): the choose-phase hint is set NOW, so Puff / «Hjelp meg» in the tap phase never fall back to the
    // stage's count «10, 11, 12, 13, 14» + a «14» plaque. Tap phase: what to DO – one untapped apple glows, «Trykk på hvert … én gang».
    const ones = () => T.rowItems(1);
    K.hint(async () => { await tenAfterError(K, T.rowItems(0), ones(), { strip }); await K.prompt('num_f08_q', {}); },
      async () => { await tenNudge(K, [T.rowItems(0), T.rowItems(1)]); await K.prompt('num_f08_q', {}); });
    const tapNudge = async () => {
      const p = loose.find(q => !q.userData.in);
      if (p) { glowObj(p, true); bounce(p, 0.3); }
      await K.say(pickRec('num_f08_tap_hint', 'num_f08_tap') || 'num_f08_tap', {}, '');
      if (p && recorded('num_f08_lyser')) await K.say('num_f08_lyser', {}, '');
      if (p) F.T.timeout(() => { if (!p.userData.in) glowObj(p, false); }, 1600);
    };
    await (th.pl && inSet('NUM_PL', th.pl) ? K.prompt('num_f06_q', { pl: th.pl }) : K.prompt('core_f06', {}));
    K.phase('tap', { answer: false, replay: { id: 'num_f08_tap' }, nudge: tapNudge });
    K.say('num_f08_tap', {}, '');
    await new Promise(r => { allDone = r; if (counted === t) r(); });
    tapW.dead = true;
    loose.forEach(p => glowObj(p, false));
    // the full tray glides to the front – big and close for the counting question
    { const its = T.items.filter(Boolean), z0 = T.group.position.z, p0 = its.map(o => o.position.z), dz = 0.95;
      await tween(560, k => { const e = ease(k); T.group.position.z = z0 + dz * e; its.forEach((o, i) => { o.position.z = p0[i] + dz * e; }); }); }
    await F.Speech.idle();
    if (strip) strip.mark(null);                            // the strip is not lit on the answer during the choice
    K.phase('choose', { replay: { id: 'num_f08_q' }, nudge: async () => { await tenNudge(K, [T.rowItems(0), T.rowItems(1)]); await K.prompt('num_f08_q', {}); } });
    K.sol(async () => { if (S.active && S.active.solution) S.active.solution(t); await K.num(10); await countAlong(K, ones(), 11, { keep: true, strip }); });
    K.prompt('num_f08_q', {});
    await K.answerNum(item.choices);                       // v4: s0 chips, s1 ≥ 5 chips, s2 keypad (SYNTHESIS §3.3)
    T.items.filter(Boolean).forEach(o => glowObj(o, false));
    T.items.filter(Boolean).forEach((o, i) => F.T.timeout(() => bounce(o, 0.2), i * 30));
    await sleep(400 + t * 30);
    return S.result();
  } });

/* --------------------------------------------------------------------- F09 Plukk opp (count out N from a pile into the tray; ✓) */
fmt('F09', { name: 'Plukk opp', strands: { 'T-MENGDE': [7, 7] }, places: ['stall', 'henhouse', 'roses', 'any'], family: 'bygg', tpl: ['num_f09_q', 'num_f09_q0', 'num_f09_ok'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    const th = thingFor(K, x => !x.frames || x.id === 'egg' || x.id === 'bolle');
    const B = K.board({ style: th.frames ? 'bakery' : 'wood', w: 6.8, d: 3.0, h: 0.6 });
    const T = TenView(B, { model: th.model, layout: 'rows', box: th.box, max: 20, x: 0.75, z: -0.75, container: true, size: 0.36, cell: 0.42, gap: 0.16, rowGap: 0.5 });
    if (item.sup === 0) T.labelRow(0, '10');
    const pileN = Math.max(t + 2, Math.min(28, K.p.pile || (t + 3 + Math.floor(K.rng() * 5))));
    const pts = scatter(K.rng, pileN, 2.1, 1.3, 0.32).map(([x, z]) => [x - 2.2, z + 0.55]);
    const pile = pts.map(([x, z]) => { const p = piece(th.model, {}, 0.36); B.add(p, x, z); p.userData.home = new V3(x, 0, z); p.rotation.y = (K.rng() - 0.5); return p; });
    const inTray = [];
    const strip = item.sup === 0 ? K.strip() : null;
    const say = () => { if (strip) strip.mark(inTray.length); K.countSay(inTray.length); };   // v4: s1 only full tens, s2 silent
    K.meta('build', 0.01);
    const relayout = () => { for (let j = 0; j < 20; j++) T.items[j] = inTray[j] || null; inTray.forEach((p, i) => hopTo(p, T.slots[i].clone().add(T.group.position), 220, 0.15)); };
    const tapP = p => {
      if (p.userData.in) { p.userData.in = false; inTray.splice(inTray.indexOf(p), 1); hopTo(p, p.userData.home, 300, 0.5); relayout(); say(); return; }
      if (inTray.length >= 20) { F.sfx.boing(); return; }
      p.userData.in = true; inTray.push(p); p.rotation.y = 0; hopTo(p, T.slots[inTray.length - 1].clone().add(T.group.position), 320, 0.7); F.sfx.pling(inTray.length % 10); say();
    };
    const A = K.actions([{ id: 'ok', label: '✓', cls: 'gold okbtn big1' }]);
    const done = K.arm({ answer: t });
    const setCount = n => { while (inTray.length > n) tapP(inTray[inTray.length - 1]); for (const p of pile) { if (inTray.length >= n) break; if (!p.userData.in) tapP(p); } };
    const w = K.widget({ kind: 'pick', values: [],
      feed: v => { setCount(+v); return K.submit(inTray.length, w); },
      mark: (v, cls) => { if (cls === 'wrong') shake(T.group); },
      solution: v => { const need = +v; if (inTray.length > need) inTray.slice(need).forEach(p => { glowObj(p, true); bounce(p, 0.3); }); else pile.filter(p => !p.userData.in).slice(0, need - inTray.length).forEach(p => { glowObj(p, true); bounce(p, 0.3); }); A.glow('ok'); },
      lock: on => A.lock(on) });
    pile.forEach(p => B.pick(p, () => { if (!w.locked && !S.solved) { glowObj(p, false); tapP(p); K.activity(); } }));
    A.on(id => { if (id === 'ok' && !w.locked && !S.solved) K.submit(inTray.length, w); });
    K.onKey(e => { if (e.key === 'Enter') A.press('ok'); else return false; });
    const nn = U.clamp(t, 10, 20);
    const cust = K.voice === 'vk' || K.voice === 'vm';
    const ask = () => cust ? K.prompt('num_f09_q2', { n: nn }) : th.pl && inSet('NUM_PL', th.pl) ? K.prompt('num_f09_q', { n: nn, pl: th.pl }) : K.prompt('num_f09_q0', { n: nn });
    // at her stall the customer has already spoken the order: don't repeat it now (Puff still repeats it)
    // v5 (playtest2): «for mange / for få» only about an answer she gave; before an attempt: the full row she has (if any) + the ask
    K.hint(async (tag, v) => {
      if (v != null) { await sayTotal(+v); await K.say(+v > t ? 'num_for_mange' : 'num_for_fa', {}, ''); }
      if (+v >= 10) { const ten = T.rowItems(0); ten.forEach(o => glowObj(o, true)); await K.say('num_full_rad', {}, ''); ten.forEach(o => glowObj(o, false)); }
      await ask();
    }, async () => {
      if (inTray.length >= 10) { const ten = T.rowItems(0); ten.forEach(o => glowObj(o, true)); await K.say('num_full_rad', {}, ''); ten.forEach(o => glowObj(o, false)); }
      await ask(); await K.say('num_trykk_hake', {}, '');
    });
    K.sol(async () => { w.solution(t); await K.say('num_vi_trenger', { n: U.clamp(t, 10, 20) }, ''); });
    if (K.ctx.place === 'stall' && K.p.good) S.lastPrompt = { id: 'num_f09_q2', slots: { n: nn }, voice: vOK('num_f09_q2', K.voice) }; else await ask();
    await done;
    A.glow('ok', false); pile.forEach(p => glowObj(p, false));
    inTray.forEach((p, i) => F.T.timeout(() => bounce(p, 0.2), i * 30));
    await K.say('num_f09_ok', {}, vOK('num_f09_ok', K.voice));
    return S.result();
  } });

/* --------------------------------------------------------------------- F12 Betal riktig (every shop; DESIGN §8.4) */
/* v5 WP-R2 (logic #2, DESIGN5 §7): F12 «rest» mode for pocket money – item.params.rest = h (the coins the character already has),
   params.price = p (the real price on the tag), item.target = m = p − h (what SHE lays on). The h coins already lie on the counter
   (theirs, at the back), the tag shows p, and m is never spoken first: «Det koster p.» + «Noen mynter ligger allerede på disken.» +
   «Legg på resten, så det blir nok!». Support mode (below M9): she taps the purse, the count goes on from h. Feature flag for
   economy.js: F.Task.defs.F12.restMode === true; F.Task.pay(p, {rest: h, …}) runs it. */
/* economy §1 (12.10, money talk) in a real purchase (ctx.payment, F.Task.pay): row 10 – no opening «Det koster N.» when the keeper has
   just said the price (ctx.priceSaid): the tag pulses instead; row 11 – «Trykk på pungen.» / «Legg på tiere og enere.» only for her
   first 3 shop payments ever (F.save.numTalk.payN), then the purse / coins just glow; row 12 – no «Takk! Det ble riktig.» (the keeper's
   «Vær så god!» is the feedback); row 3 – «Ti mynter blir én tier!» on a merge at most once a session and only while T-MENGDE < 10
   (the chime and the merge show it). Help after an error keeps every line. */
const numTalk = () => { const t = F.save.numTalk = F.save.numTalk && typeof F.save.numTalk === 'object' ? F.save.numTalk : {}; t.payN = t.payN || 0; return t; };
let radSaid = false;
const radOK = () => { if (radSaid) return false; let r = 0; try { r = F.Eco && F.Eco.strandRung ? F.Eco.strandRung('T-MENGDE') || 0 : 0; } catch (e) { r = 0; } return r < 10; };
NUM.numTalk = numTalk;
fmt('F12', { name: 'Betal riktig', strands: { 'T-MENGDE': [9, 9] }, places: ['shop'], family: 'bygg', restMode: true,
  tpl: ['num_f12_koster', 'num_f12_pung', 'num_f12_lag', 'num_f12_ok', 'num_f12_rest', 'num_f12_resten'],
  async run(item, S) {
    const K = Kit(item, S, this);
    // a real purchase: F.Task.pay (ctx.payment) or the shop's own payment task (place 'shop' with coins 0 / priceSaid)
    const buying = !!(K.ctx.payment || (K.ctx.place === 'shop' && K.ctx.coins === 0) || K.ctx.priceSaid != null), priceSaid = buying && !!K.ctx.priceSaid;
    let coach = true;
    if (buying) { const T = numTalk(); coach = T.payN < 3; T.payN++; F.store(); }
    const restN = K.p.rest != null && isFinite(+K.p.rest) ? Math.max(0, Math.round(+K.p.rest)) : null;
    const isRest = restN != null && restN > 0;
    const price = isRest ? (K.p.price != null ? Math.round(+K.p.price) : restN + item.target) : item.target;   // the real price (tag)
    const need = isRest ? price - restN : price;                                                                // what SHE lays on
    const support = K.p.support != null ? !!K.p.support : (item.rung || 9) < 9;
    const B = K.board({ style: 'counter', w: 6.6, d: 2.6, h: 0.9 });
    // the thing for sale stands on the counter with its price tag (real 3D model)
    let goods = null;
    const mdl = K.p.model && F.VOX.has(K.p.model) ? K.p.model : thingFor(Object.assign({}, K, { p: {} }), x => !x.animal).model;
    if (mdl) { goods = piece(mdl, mdl === K.p.model ? (K.p.modelOpts || {}) : {}, 1.0, { hk: 0.6 }); B.add(goods, B.w / 2 - 0.8, -0.55); }
    const tagA = new THREE.Object3D(); tagA.position.set(B.w / 2 - 0.55, 0.3, -0.12); B.top.add(tagA);
    const tagL = B.label(tagA, String(price), { cls: 'num price', dy: 0.05 });
    const pulseTag = async ms => { tagL.cls('pulse'); await sleep(ms || 700); tagL.cls('pulse', false); };
    // price meter (support mode / s0): segments of 1 (≤20) or of 10 (bigger prices), grouped by tens
    const showMeter = support || K.p.meter || item.sup === 0;
    const segV = price > 20 ? 10 : 1, segs = Math.max(1, Math.round(price / segV));
    const mats = [];
    if (showMeter) {
      const meter = new THREE.Group(); B.add(meter, -0.6, -0.95);
      const segW = segV === 10 ? 0.42 : 0.2, gapEvery = segV === 10 ? 5 : 10;
      const meterW = segs * segW + Math.floor((segs - 1) / gapEvery) * 0.14;
      const geo = new THREE.BoxGeometry(segW * 0.86, 0.12, 0.32);
      for (let i = 0; i < segs; i++) {
        const m = new THREE.MeshLambertMaterial({ color: 0xf1e6d0 }); mats.push(m);
        const sm = new THREE.Mesh(geo, m); sm.position.set(-meterW / 2 + segW / 2 + i * segW + Math.floor(i / gapEvery) * 0.14, 0.06, 0); meter.add(sm);
      }
    }
    // (rest mode: their coins fill the first segments in a paler gold)
    const fillMeter = paid => mats.forEach((m, i) => m.color.setHex((i + 1) * segV <= (isRest ? restN : 0) ? 0xe8d48a : (i + 1) * segV <= paid ? 0xf5c542 : 0xf1e6d0));
    // coins on the counter: tiers left, ones in a 2×5 frame right
    const coinsG = new THREE.Group(); B.add(coinsG, -0.9, 0.45);
    // where the coins land: a wooden tray for tiers, a soft 2×5 mat for ones (ten-frame inside the money)
    { const t1 = F.VOX.make(frameDef('wood', 5, 2, 6, 0)); t1.position.set(-0.56, -0.02, 0.26); coinsG.add(noShadow(t1));
      const t2 = F.VOX.make(frameDef('cloth', 5, 2, 4, 0)); t2.position.set(2.14, -0.02, 0.02); coinsG.add(noShadow(t2)); }
    const tiers = [], ones = [];
    const layoutCoins = () => {
      tiers.forEach((c, i) => c.position.set(-1.8 + (i % 5) * 0.62, 0.02, -0.05 + Math.floor(i / 5) * 0.62));
      ones.forEach((c, i) => c.position.set(1.42 + (i % 5) * 0.36, 0.02, -0.18 + Math.floor(i / 5) * 0.4));
    };
    const mine = () => tiers.length * 10 + ones.length;            // the coins SHE laid on
    const total = () => mine() + (isRest ? restN : 0);               // everything on the counter
    const mkCoin = ten => { const c = piece(ten ? 'fx_n_mynt10' : 'fx_n_mynt1', {}, ten ? 0.52 : 0.3, { hk: 1 }); c.rotation.x = -0.35; coinsG.add(c); return c; };
    // rest mode: the character's own coins, already on the counter (back row, not tappable)
    const theirs = [];
    if (isRest) {
      const tg = new THREE.Group(); B.add(tg, -1.2, -0.25);
      const t10 = Math.floor(restN / 10), t1 = restN % 10;
      for (let i = 0; i < t10; i++) { const c = piece('fx_n_mynt10', {}, 0.46, { hk: 1 }); c.rotation.x = -0.35; c.position.set(-1.3 + i * 0.52, 0.02, 0); tg.add(c); theirs.push(c); }
      for (let i = 0; i < t1; i++) { const c = piece('fx_n_mynt1', {}, 0.27, { hk: 1 }); c.rotation.x = -0.35; c.position.set(-1.3 + t10 * 0.52 + 0.1 + i * 0.3, 0.02, 0); tg.add(c); theirs.push(c); }
      fillMeter(0);
    }
    const glowTheirs = async () => { if (!theirs.length) return; theirs.forEach(c => glowObj(c, true)); await K.say('num_f12_rest', {}, ''); await sleep(300); theirs.forEach(c => glowObj(c, false)); };
    const fromPurse = new V3(-B.w / 2 - 1.0, 0.6, 1.4);
    const flyIn = async c => { const to = c.position.clone(); c.position.copy(fromPurse).sub(coinsG.position); await hopTo(c, to, 360, 1.0); F.sfx.coin(); };
    // «Det koster p.» only for prices with a clip (never a wrong fallback number); the tag always shows p
    const sayPrice = () => inSet('PRICE', price) ? K.prompt(kosterId(price, K.voice), { n: price }) : (isRest ? Promise.resolve() : K.prompt('num_f12_lag', {}));
    // the opening: the keeper just said the price → the tag pulses (Puff's repeat still says it); otherwise «Det koster N.»
    let opened = false;
    const openPrice = () => { if (opened || !priceSaid || !inSet('PRICE', price)) { opened = true; return sayPrice(); } opened = true; S.lastPrompt = { id: kosterId(price, K.voice), slots: { n: price }, voice: K.voice }; return pulseTag(900); };
    if (support) {
      // tap the purse: one coin per tap (tiers first, counted «ti», then ones counted on); the meter fills; capped – never overpay
      const A = K.actions([{ id: 'purse', thumb: { model: 'fx_n_pung' }, label: '', cls: 'purse big1' }]);
      let busy = false, finished = null;
      const payOne = async () => {
        if (busy || total() >= price) return; busy = true; A.glow('purse', false);
        const ten = price - total() >= 10; const c = mkCoin(ten); (ten ? tiers : ones).push(c); layoutCoins();
        await flyIn(c); fillMeter(total()); K.numNow(total());   // support mode (below M9): practice, the meter + count are the scaffold
        busy = false;
        if (total() >= price && finished) { const f = finished; finished = null; F.T.timeout(f, 450); }
      };
      const w = K.widget({ kind: 'purse', values: [], feed: async () => { for (let g = 0; g < 40 && total() < price; g++) { await payOne(); } return true; }, lock: on => A.lock(on) });
      A.on(() => { if (!w.locked) { payOne(); K.activity(); } });
      K.onKey(e => { if (e.key === 'Enter' || e.key === ' ') A.press('purse'); else return false; });
      // v5 (playtest2): the purse phase has its own hint – the purse glows, «Trykk på pungen.» – never a count to the price
      const purseNudge = async () => { A.glow('purse'); await pulseTag(400); await K.say('num_f12_pung', {}, ''); };
      K.hint(async () => { await purseNudge(); });
      K.phase('pay', { answer: false, replay: { id: 'num_f12_pung' }, nudge: purseNudge });
      await openPrice();
      if (isRest) { await glowTheirs(); await K.num(restN); }
      if (coach) K.say('num_f12_pung', {}, '');
      A.glow('purse');
      await new Promise(r => { finished = r; if (total() >= price) r(); });
      w.dead = true;
      await F.Speech.idle();
    } else {
      // compose tiers + ones, tap a coin to take it back, ✓  (purse limits from the bank: params.purse {tens, ones})
      const lim = K.p.purse || { tens: 10, ones: 10 };
      const A = K.actions([
        { id: 'ten', thumb: { model: 'fx_n_mynt10', angle: 0 }, label: '10', cls: 'ten coin' },
        { id: 'one', thumb: { model: 'fx_n_mynt1', angle: 0 }, label: '1', cls: 'one coin' },
        { id: 'ok', label: '✓', cls: 'gold okbtn' },
      ]);
      const done = K.arm({ answer: need });
      const unCoin = (c, arr) => { const i = arr.indexOf(c); if (i < 0) return; arr.splice(i, 1); B.unpick(c); coinsG.remove(c); };
      const pickCoin = (c, arr) => B.pick(c, () => { if (w.locked || S.solved) return; unCoin(c, arr); layoutCoins(); fillMeter(Math.min(total(), price)); F.sfx.pop(); K.countSay(total()); K.activity(); });
      const setTo = n => { tiers.slice().forEach(c => unCoin(c, tiers)); ones.slice().forEach(c => unCoin(c, ones));
        for (let i = 0; i < Math.floor(n / 10); i++) { const c = mkCoin(true); tiers.push(c); pickCoin(c, tiers); }
        for (let i = 0; i < n % 10; i++) { const c = mkCoin(false); ones.push(c); pickCoin(c, ones); }
        layoutCoins(); fillMeter(Math.min(total(), price)); };
      const add = async ten => {
        if (ten && tiers.length >= Math.min(10, lim.tens != null ? lim.tens : 10)) { F.sfx.boing(); return; }
        if (!ten && ones.length >= Math.min(10, lim.ones != null ? lim.ones : 10)) { F.sfx.boing(); return; }
        const c = mkCoin(ten); (ten ? tiers : ones).push(c); pickCoin(c, ten ? tiers : ones); layoutCoins(); await flyIn(c);
        if (ones.length === 10 && tiers.length < 10) { // ten ones become one tier
          ones.slice().forEach(o => unCoin(o, ones));
          const t1 = mkCoin(true); tiers.push(t1); pickCoin(t1, tiers); layoutCoins(); popIn(t1); F.sfx.chime(); if (radOK()) { radSaid = true; K.say('num_f12_rad', {}, ''); }
        }
        fillMeter(Math.min(total(), price)); K.countSay(total());   // v4 hint_leaks 13: s1 only full tens, s2 silent
      };
      K.meta('build', 0.01);
      const w = K.widget({ kind: 'coins', values: [],
        feed: v => { setTo(+v); return K.submit(mine(), w); },
        mark: (v, cls) => { if (cls === 'wrong') shake(coinsG); },
        solution: v => { setTo(+v); A.glow('ok'); },
        lock: on => A.lock(on) });
      A.on(id => { if (w.locked || S.solved) return; if (id !== 'ok') K.activity(); if (id === 'ten') add(true); else if (id === 'one') add(false); else if (id === 'ok') K.submit(mine(), w); });
      K.onKey(e => { if (e.key === 'Enter') A.press('ok'); else return false; });
      const ask = async () => { await sayPrice(); if (isRest) await K.prompt('num_f12_resten', {}); };
      // v5 (playtest2): «16 er ti og 6» was the exact coin answer before any attempt. Before an attempt: the tag pulses (and in rest mode
      // their coins glow) + what to do. After an error: HER total («Det ble 18»), too many / too few, the tag; a ten-confusion
      // (she paid ones for a ten) gets «Den store er ti. Den lille er én.» – never the split of the price.
      K.hint(async (tag, v) => {
        const hers = Math.round(+v);
        if (v != null && isFinite(hers)) { const tot = hers + (isRest ? restN : 0); if (tot >= 0 && tot <= 40) await sayTotal(tot); await K.say(tot > price ? 'num_for_mange' : 'num_for_fa', {}, ''); }
        await pulseTag();
        if ((tag === 'COUNT-ONES' || tag === 'DIGIT-ONLY') && need >= 10) { A.glow('ten'); await K.say('num_f07_how', {}, ''); A.glow('ten', false); }
        await ask();
      }, async () => {
        await pulseTag(); if (isRest) await glowTheirs();
        await ask(); if (!isRest) await K.say('num_f12_lag', {}, '');
      });
      K.sol(async () => { w.solution(need); await K.say('num_se_her', {}, ''); });
      if (isRest) { await openPrice(); await glowTheirs(); await K.prompt('num_f12_resten', {}); }
      else { await openPrice(); if (inSet('PRICE', price) && coach) K.say('num_f12_lag', {}, ''); else if (!coach) { A.glow('ten'); A.glow('one'); F.T.timeout(() => { A.glow('ten', false); A.glow('one', false); }, 1600); } }
      await done;
      A.glow('ok', false);
    }
    if (goods) { bounce(goods, 0.4); sparkleAt(goods); }
    F.sfx.coins(Math.min(12, tiers.length + ones.length));
    if (!buying) await K.say('num_f12_ok', {}, K.voice);     // (a purchase: the keeper's «Vær så god!» is the feedback)
    return S.result(support ? { practice: true } : null);
  } });

// LIFE's shops call this: F.Task.pay(price, {itemName, model, modelOpts, voice, npc, place}) -> Promise<'A'|'B'|'C'|'poor'|null>
// It does NOT spend coins: the caller spends after a non-'poor' outcome. Support mode below T-MENGDE M9 (§8.4).
// v5 WP-R2 (logic #2): o.rest = h → F12 rest mode (the character has h of the price p; she lays on m = p − h; the tag shows p).
// o.coins (0 for payments, #18) is passed on as ctx.coins. Also F.NUM.pay (the same function without the stage's PRICE guard).
async function pay(price, o) {
  o = o || {};
  price = Math.round(+price);
  const rest = o.rest != null && isFinite(+o.rest) && +o.rest > 0 ? Math.round(+o.rest) : null;
  const need = rest != null ? price - rest : price;
  if (rest != null && (need <= 0 || need > 40)) return null;
  const have = F.Eco && F.Eco.coins ? F.Eco.coins() : (F.save.coins || 0);
  if (have < need) {
    // economy §1 rows 17–18: «Du har ikke nok mynter ennå.» once ever; no price, no «spar litt først» (the shop shows the numbers)
    const T = numTalk(); if (!T.rakk) { T.rakk = F.save.day || 1; F.store(); await say('num_f12_rakk', {}, ''); }
    return 'poor';
  }
  if (F.Task.current) return null;
  let rung = 1, sup = 1;
  try { const st = ((F.LEARN.summary() || {}).strands || {})['T-MENGDE']; if (st && st.rung) rung = st.rung; if (st && st.sup != null) sup = st.sup; } catch (e) {}
  const support = rung < 9;
  let item = null;
  if (!support && rest == null) { try { item = F.BANKS.gen('T-MENGDE', 9, 1, { kind: 'normal', target: price, key: 'T-MENGDE:' + price, rng: F.rand, conf: {}, format: 'F12' }); } catch (e) {} }
  item = Object.assign({ strand: 'T-MENGDE', rung: support ? rung : 9, sup: rest != null ? U.clamp(sup, 0, 2) : 1, choices: null, distractors: [], params: {} }, item || {},
    { id: 'pay_' + price + '_' + Math.round(F.T.now * 10), format: 'F12', kind: support ? 'practice' : 'normal', key: 'T-MENGDE:' + need, target: need });
  if (rest != null) item.n = price;
  item.params = Object.assign({}, item.params || {}, { support, itemName: o.itemName || null, model: o.model || null, modelOpts: o.modelOpts || null },
    rest != null ? { rest, price, pocket: true } : {});
  const ctx = { npc: o.npc || null, thing: o.thing || null, place: o.place || 'shop', voice: o.voice || '', payment: true };   // (#18) no task coins
  if (o.priceSaid) ctx.priceSaid = true;                    // economy §1 row 10: the keeper has just said the price
  if (o.coins != null) ctx.coins = o.coins;
  if (rest != null) ctx.pocket = true;
  const r = await F.Task.run(item, ctx);
  return (r && r.outcome) || 'A';
}

/* --------------------------------------------------------------------- F14 Kodelåsen (hear N → type it on the keypad; 51 is caught) */
// v4: the dictated number (T-SKRIV): whole clips – «Koden er N.» for 10–20 + decades, «Skriv N.» for 21–100 (never a wrong fallback)
const askWrite = (K, tpl, t) => inSet('NUM_CODE', t) && F.TPL.all[tpl] ? K.prompt(tpl, { n: t }) : inSet('NUM_21_100', t) ? K.prompt('num_skriv_n', { n: t }) : K.prompt('core_num', { n: U.clamp(t, 0, 100) });
fmt('F14', { name: 'Kodelåsen', strands: { 'T-SKRIV': [3, 8] }, rungs: [3, 4, 5, 8], places: ['chest', 'any'], family: 'skriv-tall', think: 'AVKODE', tpl: ['num_f14_q', 'num_f14_skriv', 'num_f14_ok', 'num_skriv_n'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    K.secret(t);                                              // v4 C1: «Koden er …»
    const B = K.board({ style: 'wood', w: 4.6, d: 2.3, h: 1.1 });
    const chest = piece(F.VOX.has('c_kiste') ? 'c_kiste' : 'fx_n_kiste', {}, 1.5, { hk: 0.8 }); B.add(chest, 0, -0.25);
    const ask = () => askWrite(K, 'num_f14_q', t);
    K.hint(async (tag, v) => {
      shake(chest);
      if (tag === 'REVERSAL' || tag === 'DECADE') await contrastHint(K, t, +v, { z: 0.8 });
      else if (!(await numHint(K, t, +v, tag))) { const g = numberPicture(B, t, 0, 0.85, { cell: 0.2 }); popIn(g); F.T.timeout(() => g.parent && g.parent.remove(g), 3000); }
      // s0 (Table B): the ghost first digit returns after a miss
      if (K.p.ghost && S.active && S.active.el) { const gh = S.active.el.querySelector('.kp-box .gh'); if (gh && !gh.textContent) gh.textContent = K.p.ghost; }
      await ask();
    });
    S.replay = () => ask();
    await ask(); K.say('num_f14_skriv', {}, '');
    // v4 hint_leaks C3 / SYNTHESIS §3.3: fixed-slot keypad – the box count shows only at s0/s1 (showLen), else 3 boxes + ✓
    K.meta('keypad', 0.01);
    const p = S.keypad(Object.assign({ answer: t }, keypadOpts(item, t, { showLen: K.p.showLen != null ? !!K.p.showLen : item.sup < 2 })));
    // F14 s0: the ghost first digit (hint_leaks 18: optional – kept at s0 only)
    if (K.p.ghost && item.sup === 0 && S.active && S.active.el) { const gh = S.active.el.querySelector('.kp-box .gh'); if (gh) gh.textContent = K.p.ghost; }
    await p;
    const lid = (chest.children[0].userData.parts || {}).lid;
    F.sfx.door(); if (lid) await tween(600, k => { lid.rotation.x = -ease(k) * 1.6; });
    sparkleAt(chest, 0xffe066); F.sfx.sparkle();
    await K.say('num_f14_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F15 Husnummeret (W1: ones digit after the given 1; W2: two digit tiles in order) */
fmt('F15', { name: 'Husnummeret', strands: { 'T-SKRIV': [1, 2] }, places: ['tallstolpe', 'village', 'any'], family: 'skriv-tall', tpl: ['num_f15_w1', 'num_f15_w1b', 'num_f15_w2', 'num_f15_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    const w1 = (item.rung || 1) <= 1;
    // W1: target = the ones digit, item.n = the house number; W2: target = the number
    let n = w1 ? U.clamp(item.n != null ? +item.n : (item.target < 10 ? 10 + item.target : item.target), 10, 19) : U.clamp(item.target, 10, 20);
    // v5d WP-R3 (WP-W request): at a real house / number post (ctx.houseNum) the plate shows THAT number when it is in the item's band
    // (W1: a teen 11–19 – she gives its ones digit; W2: 10–20); the item is re-targeted so LEARN records what she really made
    const hn = K.ctx && K.ctx.houseNum != null ? +K.ctx.houseNum : null;
    if (hn != null && hn !== n && (w1 ? hn >= 11 && hn <= 19 : hn >= 10 && hn <= 20)) {
      n = hn; const t2 = w1 ? hn % 10 : hn;
      item.target = t2; item.n = hn; item.distractors = []; item.tiles = null; if (item.choices && !item.choices.includes(t2)) item.choices = null;
      if (S.item) Object.assign(S.item, { target: t2, n: hn, key: item.strand + ':' + (w1 ? hn : t2), distractors: [] });
      S.expected = t2;
    }
    const ds = String(n).split('');
    K.secret(n, w1 ? ds[1] : null);                           // v4 C1: «Skiltet skal vise …» / «Lag nummer … på skiltet!»
    const B = K.board({ style: 'street', w: 4.4, d: 2.2, h: 1.6, tilt: 0.7 });
    const house = piece('fx_n_hus', { wall: 'peach', roof: 'roofMint' }, 1.7, { hk: 0.75 }); B.add(house, 0, -0.3);
    // the plate: two separate digit plaques on the wall
    const a1 = new THREE.Object3D(), a2 = new THREE.Object3D(); a1.position.set(-0.3, 0.95, 0.66); a2.position.set(0.3, 0.95, 0.66); house.add(a1); house.add(a2);
    const L1 = B.label(a1, '', { cls: 'num plate', dy: 0, always: true }), L2 = B.label(a2, '', { cls: 'num plate', dy: 0, always: true });
    if (w1) {
      const d = +ds[1];
      L1.set(ds[0]); L2.set('?').cls('blank');
      const ask = async () => { await K.prompt('num_f15_w1', { n }); await K.say('num_f15_w1b', {}, ''); };
      K.hint(async (tag, v) => { if (v != null) { L2.set(String(v)).cls('wrong'); await sleep(600); L2.set('?').cls('wrong', false); } await K.say('num_split', { s: `${n} er ti og ${d}` }, ''); await ask(); });
      S.replay = () => ask();
      ask();
      // v4: s0 3 digit chips, s1/s2 all ten digits (g 1/10)
      const digs = item.sup >= 1 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : ((item.choices || []).filter(v => v >= 0 && v <= 9).length >= 2 ? item.choices : [d, (d + 1) % 10, (d + 9) % 10]);
      K.meta('chips', 1 / digs.length);
      await S.chips(digs, { kind: 'num', answer: d });
      L2.set(ds[1]).cls('blank', false);
    } else {
      L1.set('').cls('blank'); L2.set('').cls('blank');
      let tiles = Array.isArray(item.tiles) && item.tiles.length >= 2 ? item.tiles.map(String) : U.shuffle(K.rng, ds);
      // v4 C3: at s1+ two spare digit tiles (the tiles alone never spell the answer; the reversal stays catchable)
      if (item.sup >= 1 && tiles.length <= 2) { const sp = U.shuffle(K.rng, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(c => !ds.includes(c))).slice(0, 2); tiles = U.shuffle(K.rng, tiles.concat(sp)); }
      if (tiles.join('') === ds.join('') && ds[0] !== ds[1]) tiles = tiles.slice().reverse();     // never pre-ordered
      const ask = () => K.prompt('num_f15_w2', { n });
      S.replay = () => ask();
      K.meta('tiles', tiles.length > 2 ? 1 / (tiles.length * (tiles.length - 1)) : 0.5);
      K.hint(async (tag, v) => { L1.cls('wrong'); L2.cls('wrong'); await sleep(500); L1.cls('wrong', false); L2.cls('wrong', false); if (tag === 'REVERSAL') await contrastHint(K, n, +v, { z: 0.75 }); await numHint(K, n, +v, 'REVERSAL'); await ask(); });
      K.sol(async () => { if (S.active && S.active.solution) S.active.solution(String(n)); await K.say('num_tier_forst', {}, ''); });
      ask();
      const show = str => { const a = String(str || ''); L1.set(a[0] || '').cls('blank', !a[0]); L2.set(a[1] || '').cls('blank', !a[1]); };
      await S.tiles({ letters: tiles, slots: 2, auto: true, answer: String(n), ghost: K.p.ghost ? K.p.ghost + '_' : null, onChange: show });
      show(String(n));
    }
    F.sfx.chime(); bounce(house, 0.15); sparkleAt(house);
    await K.say('num_f15_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F18 Trappesteinene (which stone comes next / before / is missing / backwards) */
fmt('F18', { name: 'Trappesteinene', strands: { 'T-ORDEN': [1, 8] }, rungs: [1, 2, 3, 8], places: ['pond', 'tallveien', 'any'], family: 'orden', think: 'MØNSTER', tpl: ['num_f18_next', 'num_f18_before', 'num_f18_miss', 'num_f18_miss2', 'num_f18_down'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target; const rung = item.rung || 1;
    // the visible run: banks give params.seq (with null = the gap) for O3/O8, params.dir for O1/O2
    let seq, qi, mode;
    if (Array.isArray(K.p.seq) && K.p.seq.includes(null)) { seq = K.p.seq.map(v => v == null ? t : v); qi = K.p.seq.indexOf(null); mode = K.p.order === 'desc' || (seq[0] > seq[1]) ? 'back' : 'missing'; }
    else if (K.p.fromArray || rung >= 8) { const st = Math.min(20, t + 1 + Math.floor(K.rng() * 2)); seq = [st, st - 1, st - 2, st - 3, st - 4].filter(v => v >= 0); qi = seq.indexOf(t); mode = 'back'; }
    else if (rung === 3) { const k = 1 + Math.floor(K.rng() * 2); seq = [t - k, t - k + 1, t - k + 2, t - k + 3]; qi = k; mode = 'missing'; }
    else if (K.p.dir === 'before') { seq = [t, t + 1, t + 2, t + 3]; qi = 0; mode = 'before'; }
    else { seq = [t - 3, t - 2, t - 1, t]; qi = 3; mode = 'next'; }
    if (seq.some(v => v < 0)) { seq = [t, t + 1, t + 2, t + 3]; qi = 0; mode = 'before'; }
    // v4 retrofit (SYNTHESIS §3.3 «tap every missing stone»): at s1/s2 the «mangler»/«baklengs» rows are longer (7 / 9 stones) with
    // 2 / 3 gaps; she fills EVERY gap (≥ 5 chips at s1, keypad at s2 – g ≤ 0.2^k), left to right along the row
    let gaps = [qi];
    if ((mode === 'missing' || mode === 'back') && item.sup >= 1) {
      const L = item.sup >= 2 ? 9 : 7, k = item.sup >= 2 ? 3 : 2, dsc = mode === 'back';
      const top = dsc ? Math.min(Math.max(t + 1 + Math.floor(K.rng() * 3), L - 1), 99) : null;
      const bot = dsc ? null : U.clamp(t - 1 - Math.floor(K.rng() * 3), 0, 99 - L + 1);
      seq = Array.from({ length: L }, (_, i) => dsc ? top - i : bot + i);
      qi = seq.indexOf(t);
      const cand = U.shuffle(K.rng, seq.map((_, i) => i).filter(i => i > 0 && i !== qi && Math.abs(i - qi) >= 1));
      gaps = [qi];
      for (const i of cand) { if (gaps.length >= k) break; if (gaps.every(g => Math.abs(g - i) >= 2) || cand.length < 4) gaps.push(i); }
      gaps.sort((a, b) => a - b);
    }
    const n = seq.length, gapX = Math.min(1.45, 6.0 / n);
    const B = K.board({ style: 'pond', w: 6.6, d: 2.4, h: 0.8 });
    const stones = seq.map((v, i) => { const s = piece('fx_n_stein', {}, n > 6 ? 0.66 : 1.0, { hk: 2 }); B.add(s, (i - (n - 1) / 2) * gapX + 0.25, (i % 2 ? 0.16 : -0.16)); s.userData.v = v; return s; });
    const labels = stones.map((s, i) => B.label(s, gaps.includes(i) ? '?' : String(seq[i]), { cls: 'num stone' + (gaps.includes(i) ? ' blank' : '') + (n > 6 ? ' small' : ''), dy: 0.4 }));
    // a wee fairy (her colours) waits on the bank and hops across when the answer is right
    const kind = fairy();
    const fe = piece('fx_n_fe', { dress: FAIRY_DRESS[kind] || 'lilac' }, 0.62, { hk: 0.5 }); const home = new V3(-B.w / 2 + 0.4, 0, 0.6); B.add(fe, home.x, home.z);
    const hopOn = async s => { const to = s.position.clone(); to.y += 0.18; await hopTo(fe, to, 360, 0.7); F.sfx.boing(); };
    let gi = gaps[0];
    const many = gaps.length > 1;
    const ask = async () => {
      if (mode === 'next') return K.prompt('num_f18_next', { n: t - 1 });
      if (mode === 'before') return K.prompt('num_f18_before', { n: t + 1 });
      if (mode === 'back') { await K.say('num_f18_down', {}, vOK('num_f18_down', K.voice)); return K.prompt(many ? 'num_f18_miss2' : 'num_f18_miss', {}); }
      return K.prompt(many ? 'num_f18_miss2' : 'num_f18_miss', {});
    };
    // the fairy hops along the known stones, counting; pauses at the gap she is filling now
    const walk = async () => { for (let i = 0; i < n; i++) { if (i === gi) { labels[i].cls('pulse'); await sleep(700); labels[i].cls('pulse', false); if (mode === 'before') continue; break; } if (gaps.includes(i) && labels[i].el && labels[i].el.textContent === '?') continue; await hopOn(stones[i]); await K.num(seq[i]); } fe.position.copy(home); };
    K.hint(async (tag, v) => { if (v != null) { labels[gi].set(String(v)).cls('wrong'); await sleep(600); labels[gi].set('?').cls('wrong', false); } await walk(); await ask(); }, 'post');
    K.sol(async () => { if (S.active && S.active.solution) S.active.solution(seq[gi]); await walk(); await K.say('core_sol_chip', {}, ''); });
    ask();
    const steps = gaps.length;
    for (let j = 0; j < steps; j++) {
      gi = gaps[j]; const want = seq[gi];
      labels[gi].cls('pulse');
      const vals = (j === 0 && want === t ? item.choices : [want - 1, want + 1, want + 2]).map(Number);
      await K.answerNum(vals, { answer: want, min: 0, max: 100 });
      labels[gi].set(String(want)).cls('blank', false).cls('pulse', false);
      if (j < steps - 1 && S.active && S.active.destroy) { S.active.destroy(); S.active.dead = true; }
    }
    if (steps > 1) K.meta(item.sup >= 2 ? 'keypad' : 'chips', item.sup >= 2 ? 0.01 : Math.pow(0.2, steps));
    for (const s of stones) await hopOn(s);
    sparkleAt(fe); F.sfx.splash(); K.say('num_f18_hopp', {}, '');
    await sleep(450);
    return S.result();
  } });

/* --------------------------------------------------------------------- F19 Hvem har mest? (baskets; v4: order 3–4 baskets) */
// v4 (SYNTHESIS §3.3, hint_leaks 11): s0 = two baskets, tap the one with more/fewer (2 choices are s0-only); s1 = order 3 baskets,
// s2 = order 4 (g 1/6, 1/24). Whether she orders from most or from fewest is random. The contrast (17 vs 71 as rods) is a HINT after
// the first error only – nothing plays before the question – and each picture is drawn under its own basket.
fmt('F19', { name: 'Hvem har mest?', strands: { 'T-ORDEN': [4, 6] }, places: ['market', 'farm', 'any'], family: 'orden', think: 'REGNE',
  tpl: ['num_f19_more', 'num_f19_less', 'num_f19_big', 'num_f19_small', 'num_f19_ok', 'num_f19_ok2', 'num_f19_ord_more', 'num_f19_ord_less', 'num_f20_asc', 'num_f20_desc'],
  async run(item, S) {
    const K = Kit(item, S, this); const rung = item.rung || 4; const t = item.target;
    const nB = item.sup >= 2 ? 4 : item.sup === 1 ? 3 : 2;
    const numerals = rung >= 5;
    let pair = (K.p.a != null && K.p.b != null) ? [+K.p.a, +K.p.b] : (item.choices || []).slice(0, 2).map(Number);
    if (pair.length < 2 || !pair.includes(t) || pair[0] === pair[1]) { const o2 = rung >= 6 && t > 10 && t < 20 ? rev(t) : rung === 5 ? t + 2 : (t > 15 ? t - 6 : t + 6); pair = [t, o2]; }
    const vals = pair.slice();
    const lo = numerals ? 1 : 3, hi = numerals ? 99 : 20;
    if (numerals) for (const v of contrastFamily(t, lo, hi)) { if (vals.length >= nB) break; if (!vals.includes(v)) vals.push(v); }
    for (let g = 0; vals.length < nB && g < 200; g++) { const v = U.int(K.rng, lo, Math.min(hi, numerals ? Math.max(30, t + 15) : 20)); if (!vals.includes(v)) vals.push(v); }
    const shown = U.shuffle(K.rng, vals.slice(0, nB));
    const askMore = K.p.ask ? K.p.ask === 'more' : K.rng() < 0.5;
    const sorted = shown.slice().sort((a, b) => askMore ? b - a : a - b);
    const showQty = !numerals || item.sup === 0 || K.p.structure;
    const th = thingFor(K, x => !x.frames && x.id !== 'boble');
    const W = nB <= 2 ? 6.8 : nB === 3 ? 7.2 : 7.6;
    const B = K.board({ style: 'grass', w: W, d: 2.8, h: 1.0 });
    const sx = i => nB <= 2 ? (i ? 1 : -1) * 1.75 : (i - (nB - 1) / 2) * ((W - 0.8) / nB);
    // each basket: the things in 2×5 frames (a full frame is ten), or a basket with a numeral plaque
    const sides = shown.map((v, si) => {
      const g = new THREE.Group(); B.add(g, sx(si), 0); g.userData.v = v; g.userData.items = []; g.userData.x = sx(si);
      let plaqueAt = null;
      if (showQty && v <= 40) {
        const q = new THREE.Group(); g.add(q);
        const model = numerals ? skinModel(SKIN[fairy()]) : th.model;
        if (item.sup === 2 && !numerals) {
          scatter(U.rng(v * 13 + si), v, nB > 2 ? 1.5 : 2.4, 1.9, nB > 2 ? 0.26 : 0.34).forEach(([x, z]) => { const p = piece(model, {}, nB > 2 ? 0.26 : 0.32); p.position.set(x, 0, z + 0.1); p.rotation.y = x * 3; q.add(p); g.userData.items.push(p); });
        } else {
          const frames = Math.ceil(v / 10), cell = frames > 2 || nB > 2 ? 0.22 : 0.36, fd = 2 * cell + 0.2;
          const zf = f => (f - (frames - 1) / 2) * fd + 0.1;
          for (let f = 0; f < frames; f++) { const bx = F.VOX.make(frameDef(si % 2 ? 'cloth' : 'carton', 5, 2, Math.round(cell * 10), 0)); bx.position.set(0, -0.02, zf(f)); q.add(noShadow(bx)); }
          for (let i = 0; i < v; i++) { const f = Math.floor(i / 10), j = i % 10; const p = piece(model, {}, cell * 0.9); p.position.set(((j % 5) - 2) * cell, 0.06, zf(f) + (Math.floor(j / 5) - 0.5) * cell); q.add(p); g.userData.items.push(p); }
        }
        if (numerals) { plaqueAt = new THREE.Object3D(); plaqueAt.position.set(0, 0.2, -1.2); g.add(plaqueAt); }
      } else {
        const basket = piece('fx_n_kurv', {}, nB > 2 ? 1.05 : 1.25, { hk: 1 }); basket.position.set(0, 0, -0.4); g.add(basket); plaqueAt = basket;
      }
      if (numerals) g.userData.L = B.label(plaqueAt, String(v), { cls: 'num plaque big', dy: plaqueAt.isGroup ? 0.95 : 0.35, onClick: () => B.tap(g) });
      return g;
    });
    const sideOf = v => sides.find(s => s.userData.v === +v && !s.userData.done);
    const ask = () => nB <= 2
      ? (numerals ? K.prompt(askMore ? 'num_f19_big' : 'num_f19_small', {})
        : th.pl && inSet('NUM_PL', th.pl) ? K.prompt(askMore ? 'num_f19_more' : 'num_f19_less', { pl: th.pl }) : K.prompt(askMore ? 'num_f19_more2' : 'num_f19_less2', {}))
      : (numerals ? K.prompt(askMore ? 'num_f20_desc' : 'num_f20_asc', {}) : K.prompt(askMore ? 'num_f19_ord_more' : 'num_f19_ord_less', {}));
    let w = null;
    w = K.widget({ kind: 'board', values: shown, seq: nB > 2,
      // v5r2: her kept choice – the plaque wears the «valgt» ring (stage); baskets without a plaque (quantities) glow instead
      early: sides.some(sd => sd.userData.L) ? null : (vs, pulse) => sides.forEach(sd => { const on = !sd.userData.done && vs.some(x => +x === sd.userData.v); if (on !== !!sd.userData.kv || (on && pulse)) { sd.userData.kv = on; glowObj(sd, on); if (on) bounce(sd, 0.2); } }),
      feed: v => { const g = sideOf(v) || sides.find(s => !s.userData.done && s.userData.v !== S.expected); return g ? K.submit(g.userData.v, w) : false; },
      mark: (v, cls) => { const g = sideOf(v); if (g) cls === 'wrong' ? shake(g) : bounce(g, 0.3); },
      solution: v => { const g = sideOf(v); if (g) { glowObj(g, true); const loop = () => { if (!B.alive || S.solved || g.userData.done) return; bounce(g, 0.35).then(loop); }; loop(); } } });
    sides.forEach(g => B.pick(g, () => { if (!g.userData.done) K.submit(g.userData.v, w); }, { min: 120 }));
    // hint after the 1st error: numerals → the two numbers she confused as rods under their own baskets; quantities → the full tens
    K.hint(async (tag, v) => {
      const want = +S.expected, got = +v;
      if (numerals && isFinite(got) && got !== want) { const gw = sides.find(s => s.userData.v === want), gg = sides.find(s => s.userData.v === got);
        const big = Math.max(want, got), small = Math.min(want, got), xb = (big === want ? gw : gg), xs2 = (big === want ? gg : gw);
        await contrastHint(K, big, small, { z: 0.75, hold: 1200, compare: true, xs: [xb ? xb.userData.x : -1.75, xs2 ? xs2.userData.x : 1.75] }); }   // (review #9) no count to the answer
      else { for (const sd of sides) { if (sd.userData.done || chainStop(S)) continue; const ten = sd.userData.items.slice(0, 10); ten.forEach(o => glowObj(o, true)); bounce(sd, 0.2); await hSleep(S, 350); ten.forEach(o => glowObj(o, false)); } await K.say('num_full_ramme', {}, ''); }
      await ask();
    }, async () => {
      // v5 (playtest2): the contrast pictures are the after-error hint (C8) – before an attempt Puff looks at each basket in turn
      if (!numerals || !sides.some(sd => sd.userData.L)) { for (const sd of sides) { if (sd.userData.done || chainStop(S)) continue; const ten = sd.userData.items.slice(0, 10); ten.forEach(o => glowObj(o, true)); bounce(sd, 0.2); await hSleep(S, 350); ten.forEach(o => glowObj(o, false)); } if (sides.some(sd => sd.userData.items.length >= 10)) await K.say('num_full_ramme', {}, ''); }
      else { await K.say('kit_h_look', {}, ''); for (const sd of sides) { if (sd.userData.done || !sd.userData.L || chainStop(S)) continue; sd.userData.L.cls('pulse'); bounce(sd, 0.2); await hSleep(S, 600); sd.userData.L.cls('pulse', false); } }
      await ask();
    });
    K.meta(nB <= 2 ? 'chips' : 'order', nB <= 2 ? 0.5 : 1 / (nB === 3 ? 6 : 24));
    ask();
    if (nB <= 2) {
      await K.arm({ answer: askMore ? Math.max(...shown) : Math.min(...shown) });
      const g = sideOf(S.expected); if (g) { glowObj(g, false); sparkleAt(g); }
    } else {
      for (let i = 0; i < sorted.length; i++) {
        const g0 = sides.find(s => s.userData.v === sorted[i]);
        // v5 (playtest «early taps»): the later baskets are steps of ONE answer – WP-K2's arm({cont}) keeps the gate open between them
        if (i < sorted.length - 1) await K.arm({ answer: sorted[i], cont: i > 0 });
        g0.userData.done = true; B.unpick(g0); glowObj(g0, false); bounce(g0, 0.25); F.sfx.pling(i);
        if (g0.userData.L) g0.userData.L.cls('done');
        const badge = new THREE.Object3D(); badge.position.set(0, 0.25, 0.95); g0.add(badge); B.label(badge, (i + 1) + '.', { cls: 'num small', dy: 0.05, always: true });
        await sleep(220);
      }
    }
    await K.say(askMore ? 'num_f19_ok' : 'num_f19_ok2', {}, K.voice);
    return S.result();
  } });

/* =====================================================================================================================
   7b. P1 formats: F03 F04 F05 F11 F13 F16 F17 F20 F21 F22
   ===================================================================================================================== */
def('fx_n_ballong', { size: [9, 16, 9], scale: 1 / 14, build(v, o) {
  const c = o.c || 'pink';
  v.ellipsoid(4, 10, 4, 4, 5, 4, c); v.set(4, 4, 4, c); v.set(4, 5, 4, c); v.set(2, 12, 7, 'white'); v.set(3, 13, 7, 'white');
  v.line(4, 0, 4, 4, 3, 4, 'white');
} });
def('fx_n_fisk', { size: [12, 6, 4], scale: 1 / 12, build(v, o) {
  const c = o.c || 'orange';
  v.ellipsoid(5, 3, 1.5, 5, 2.8, 1.6, c); v.box(10, 1, 1, 11, 5, 2, c); v.clear(11, 3, 0, 11, 3, 3);
  v.set(2, 4, 3, 'black'); v.set(2, 4, 0, 'black'); v.set(5, 5, 1, 'white');
} });
def('fx_n_flaske', { size: [8, 16, 8], scale: 1 / 12, build(v, o) {
  const c = o.c || 'gem1';
  v.cyl(3.5, 0, 3.5, 3.6, 8, 'glass'); v.cyl(3.5, 1, 3.5, 2.6, 5, c); v.cyl(3.5, 8, 3.5, 1.6, 4, 'glass'); v.cyl(3.5, 12, 3.5, 1.4, 2, 'woodLight');
  v.set(5, 6, 6, 'white');
} });
def('fx_n_gris', { size: [12, 10, 16], scale: 1 / 14, build(v) {
  v.ellipsoid(5.5, 5, 8, 5.2, 4.6, 7, 'pink'); v.box(4, 3, 15, 7, 6, 15, 'blossom'); v.set(5, 5, 15, 'roofPink'); v.set(6, 5, 15, 'roofPink');
  v.set(3, 7, 14, 'black'); v.set(8, 7, 14, 'black'); v.box(3, 9, 11, 4, 9, 12, 'pink'); v.box(7, 9, 11, 8, 9, 12, 'pink');
  v.box(4, 9, 6, 7, 9, 7, 'woodDark');
  for (const [x, z] of [[2, 3], [9, 3], [2, 12], [9, 12]]) v.box(x, 0, z, x + 1, 1, z + 1, 'pink');
} });
def('fx_n_tavle', { size: [20, 16, 4], scale: 1 / 10, build(v) {
  v.box(0, 3, 1, 19, 15, 2, 'wood'); v.box(1, 4, 2, 18, 14, 2, 'leafDark'); v.box(2, 0, 1, 3, 3, 2, 'wood'); v.box(16, 0, 1, 17, 3, 2, 'wood');
  v.box(3, 4, 3, 6, 4, 3, 'white');
} });
def('fx_n_klut', { size: [16, 4, 10], scale: 1 / 12, build(v) {
  v.ellipsoid(7.5, 0, 5, 7.8, 3.6, 4.8, 'roofPink'); v.paint((x, y, z) => ((x + z) % 4 === 0 && y >= 2) ? 'blossom' : null);
} });
def('fx_n_stav', { size: [26, 3, 5], scale: 1 / 12, build(v, o) {
  v.box(0, 0, 0, 25, 1, 4, o.c || 'butter'); v.box(1, 2, 1, 24, 2, 3, o.c || 'butter'); v.set(2, 2, 2, 'gold'); v.set(23, 2, 2, 'gold');
} });
const BAR_COLS = ['red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'lavender', 'purple', 'pink', 'coral'];
const BALLOON_COLS = ['pink', 'sky', 'yellow', 'mint', 'lavender', 'coral', 'orange'];

/* N9 fluency – «tidsboblen»: a soap bubble at the board's corner slowly fills while she looks (only while nothing is said and
   nothing is locked). Full → it floats up with a soft pop and the question comes again (max 2 times). Never a fail, never a
   lost coin: the outcome is the normal one. A right first answer while the bubble is still there pops it with a cheer. */
function timeBubble(K, ask, o) {
  o = o || {};
  const S = K.S, secs = o.secs || 7;
  // bottom centre, where the answer tray would be: in view, but away from the targets
  const el = document.createElement('div'); el.className = 'ntime';
  el.innerHTML = '<div class="ntime-fill"></div><div class="ntime-shine"></div>';
  layer().appendChild(el);
  const L = { el, show(b) { el.style.display = b ? '' : 'none'; } };
  const fill = el.firstChild;
  let t = 0, pops = 0, alive = true, tries0 = 0, popping = false;
  const set = k => { fill.style.height = Math.round(Math.min(1, k) * 100) + '%'; L.el.classList.toggle('late', k > 0.75); };
  const off = F.on('tick', dt => {
    if (!alive || popping || S.solved || S.ended) return;
    if (S.stepTries !== tries0) { tries0 = S.stepTries; t = 0; }            // after a wrong answer the bubble starts afresh
    if (S.speaking || S.locked || S.hinting || F.Speech.busy()) return;
    t += dt; set(t / secs);
    if (t >= secs) {
      popping = true; pops++;
      L.el.classList.add('pop'); F.sfx.pop();
      F.T.timeout(async () => {
        if (!alive) return;
        L.el.classList.remove('pop'); t = 0; set(0);
        if (pops > 2) { L.show(false); alive = false; return; }
        if (!S.solved && !S.ended) await ask();
        popping = false;
      }, 450);
    }
  });
  K.offs.push(() => { alive = false; off(); el.remove(); });
  set(0);
  return {
    get pops() { return pops; },
    async end() {
      const quick = alive && !popping && S.tries === 0 && t < secs;
      alive = false; off();
      if (quick) { L.el.classList.add('pop', 'won'); F.sfx.sparkle(); await K.say('num_kjapt', {}, ''); }
      L.show(false);
    },
  };
}
NUM.timeBubble = timeBubble;

/* --------------------------------------------------------------------- moving targets (F03 balloons / F04 fish): tap the one with N */
async function movingTask(K, o) {
  const S = K.S, item = K.item, t = item.target;
  K.secret(t);                                              // v4 C1: «Fang fisken med …!» (also the N9 re-asks)
  // v4 retrofit (SYNTHESIS §3.3): s1 8, s2 10–12 targets with the whole contrast family present at once (g ≤ 1/8); s0 keeps 2–3
  const nT = item.sup >= 2 ? 10 : item.sup === 1 ? 8 : 0;
  let base = item.choices.map(Number);
  if (nT && !(K.p.noWiden && base.length >= 5)) base = widen(K.rng, t, base, nT, t >= 20 ? 1 : 0, t >= 20 ? 100 : 99).slice(0, Math.max(nT, base.length));
  item.choices = base.slice();
  const vals = U.shuffle(K.rng, base);
  K.meta('scene', 1 / vals.length);
  const B = K.board({ style: o.board, w: 6.6, d: 2.8, h: o.h || 1.6, tilt: o.tilt });
  const speed = (K.p.moving || item.rung === 9) ? 1.6 : 1;     // N9 fluency moves faster (not the N10–N11 retrofit rungs)
  const objs = vals.map((v, i) => {
    const ob = piece(o.model, { c: o.cols[(v + i) % o.cols.length] }, o.size, { hk: o.hk || 1 }); ob.userData.v = v; ob.userData.ph = i / vals.length;
    B.add(ob, 0, 0); return ob;
  });
  const labels = objs.map(ob => B.label(ob, String(ob.userData.v), { cls: 'num ' + (o.labelCls || 'plaque') + (objs.length > 6 ? ' small' : ''), dy: o.dy || 0.5 }));
  const t0 = F.T.now;
  const off = F.on('tick', () => { if (!B.alive) return off(); const tt = (F.T.now - t0) * speed; objs.forEach((ob, i) => { if (!ob.userData.gone) o.move(ob, i, objs.length, tt); }); });
  K.offs.push(off);
  const objOf = v => objs.find(ob => ob.userData.v === +v && !ob.userData.gone);
  const done = K.arm({ answer: t });
  const w = K.widget({ kind: 'board', values: vals,
    feed: v => { const ob = objOf(v) || objs.find(x => x.userData.v !== t); return K.submit(ob.userData.v, w); },
    mark: (v, cls) => { const ob = objOf(v); if (!ob) return; if (cls === 'wrong') { F.FX.wobble ? F.FX.wobble(ob, 0.4) : shake(ob); } },
    solution: v => { const ob = objOf(v); if (ob) { glowObj(ob, true); const L = labels[objs.indexOf(ob)]; L.cls('pulse'); } } });
  objs.forEach(ob => B.pick(ob, () => K.submit(ob.userData.v, w), { min: 70 }));
  const ask = () => inSet('NUM_CODE', t) ? K.prompt(o.tpl, { n: t }) : inSet('NUM_10_100', t) ? K.prompt('num_f01_q2', { n: t }) : K.prompt('core_num', { n: U.clamp(t, 0, 100) });
  K.hint(async (tag, v) => { if (tag === 'REVERSAL' || tag === 'DECADE') await contrastHint(K, t, +v, { z: 1.0 }); else if (!(await numHint(K, t, +v, tag)) && t > 20) await rodHint(K, t, { z: 1.0 }); await ask(); });
  const tb = (item.rung === 9 || K.p.timed) ? timeBubble(K, ask, { secs: K.p.secs || 7 }) : null;
  ask();
  await done;
  if (tb) await tb.end();
  const ob = objOf(t);
  if (ob) { await o.win(ob, labels[objs.indexOf(ob)]); }
  await K.say(o.okTpl, {}, '');
  return S.result();
}
fmt('F03', { name: 'Ballongene', strands: { 'T-NAVN': [3, 11] }, rungs: [3, 4, 5, 6, 9, 10, 11], places: ['fairground', 'park', 'any'], family: 'tall-velg', think: 'AVKODE', tpl: ['num_f03_q', 'num_f03_ok', 'num_f01_q2'],
  run(item, S) {
    const K = Kit(item, S, this);
    return movingTask(K, { board: 'grass', model: 'fx_n_ballong', cols: BALLOON_COLS, size: (item.sup || 0) >= 1 ? 0.95 : 1.15, hk: 0.75, dy: 0.15, tpl: 'num_f03_q', okTpl: 'num_f03_ok', h: 2.6, tilt: 0.55,
      // many balloons (v4: 8–12) float in two staggered rows
      move(ob, i, n, tt) {
        const two = n > 6, row = two ? i % 2 : 0, col = two ? Math.floor(i / 2) : i, nc = two ? Math.ceil(n / 2) : n, sp = Math.min(1.5, 5.8 / nc);
        const x = (col - (nc - 1) / 2) * sp + (two && row ? sp * 0.45 : 0); const k = (tt * 0.16 + ob.userData.ph) % 1;
        // two rows: the back row floats higher, both bob gently (labels of the two rows never cross)
        if (two) ob.position.set(x + Math.sin(tt * 1.3 + i) * 0.06, (row ? 0.15 : 1.05) + Math.sin(tt * 0.9 + i) * 0.18, row ? 0.5 : -0.45);
        else ob.position.set(x + Math.sin(tt * 1.3 + i) * 0.15, 0.2 + k * 1.3 + Math.sin(k * Math.PI) * 0.15, -0.2 + (i % 2) * 0.4); },
      async win(ob, L) { F.sfx.pop(); sparkleAt(ob, 0xffffff); L.remove(); ob.userData.gone = true; await tween(220, k => ob.scale.setScalar(1 + k * 0.8)); ob.visible = false; if (F.FX.burst && F.Space.cur === 'out') { const p = new V3(); ob.getWorldPosition(p); F.FX.burst(p, { kind: 'confetti', n: 30 }); } } });
  } });
fmt('F04', { name: 'Fiskedammen', strands: { 'T-NAVN': [6, 11] }, rungs: [6, 9, 11], places: ['pond', 'jetty', 'any'], family: 'tall-velg', think: 'AVKODE', tpl: ['num_f04_q', 'num_f04_ok', 'num_f01_q2'],
  run(item, S) {
    const K = Kit(item, S, this);
    return movingTask(K, { board: 'pond', model: 'fx_n_fisk', cols: ['orange', 'gold', 'coral', 'sky', 'pink', 'mint'], size: (item.sup || 0) >= 1 ? 0.72 : 0.85, hk: 2, dy: 0.42, tpl: 'num_f04_q', okTpl: 'num_f04_ok', labelCls: 'stone',
      // two rings; with many fish (v4: 8–12) the rings are wider apart and each ring keeps its own phase spacing
      move(ob, i, n, tt) {
        if (n <= 6) { const a = tt * 0.45 + ob.userData.ph * Math.PI * 2, rx = 2.2 - (i % 2) * 0.5, rz = 0.75 - (i % 2) * 0.25; ob.position.set(Math.cos(a) * rx, 0.05 + Math.abs(Math.sin(a * 3)) * 0.06, Math.sin(a) * rz); ob.rotation.y = -a + Math.PI; return; }
        // many fish (v4: 8–10): one wide ring, evenly spaced, all swimming at the same pace – their plaques never cross
        const a = tt * 0.3 + i / n * Math.PI * 2, rx = 2.55, rz = 0.98;
        ob.position.set(Math.cos(a) * rx, 0.05 + Math.abs(Math.sin(a * 3)) * 0.05, Math.sin(a) * rz); ob.rotation.y = -a + Math.PI; },
      async win(ob) { F.sfx.splash(); ob.userData.gone = true; const y0 = ob.position.y; await tween(700, k => { ob.position.y = y0 + Math.sin(k * Math.PI) * 1.4; ob.rotation.z = k * Math.PI * 2; }); } });
  } });

/* --------------------------------------------------------------------- F05 Trylledrikkene (N7: number word → numeral; N8: numeral → number word) */
fmt('F05', { name: 'Trylledrikkene', strands: { 'T-NAVN': [7, 12] }, rungs: [7, 8, 12], places: ['kitchen', 'any'], roles: ['kokk'], family: 'tall-les', wordTarget: true, think: 'AVKODE', tpl: ['num_f05_n7', 'num_f05_n8', 'num_f05_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    const n8 = item.rung === 8 || typeof item.target === 'string';
    const n = n8 ? (K.p.show != null ? +K.p.show : (item.n != null ? +item.n : 13)) : +item.target;
    // v4 N12: a written number word 20–100 → the numeral («femtini» → 59; «nittien» → 91, not 19). The bank's text, else built here.
    let word = n8 ? String(item.target) : String(item.text || K.p.numWord || (isNaN(+item.word) ? item.word : '') || '');
    if (!n8 && !word) word = numWord(n);
    if (!n8) K.secret(n);                                     // the answer's digits never show in a hint line before the solution
    const B = K.board({ style: 'wood', w: 4.6, d: 2.2, h: 1.4 });
    const bottle = piece('fx_n_flaske', { c: U.pick(K.rng, ['gem1', 'gem2', 'gem3', 'plum']) }, 1.0, { hk: 0.9 }); B.add(bottle, 0, -0.25);
    [[-1.3, -0.35, 'gem3'], [1.3, -0.35, 'plum'], [-1.9, 0.2, 'gem2'], [1.9, 0.2, 'gem1']].forEach(([x, z, c]) => { const b2 = piece('fx_n_flaske', { c }, 0.55, { hk: 0.9 }); B.add(b2, x, z); });
    const L = B.label(bottle, n8 ? String(n) : F.UI.caseText(word), { cls: n8 ? 'num big' : 'word bottle', dy: -0.55 });
    K.hint(async (tag, v) => { const g = numberPicture(B, n, 0, 0.8, { cell: 0.18 }); popIn(g); await hSleep(S, 400); if (n8) await numHint(K, n, n % 10 * 10 === +v ? v : n, 'DECADE'); else if (v != null && !isNaN(+v)) await numHint(K, n, +v, tag); await hSleep(S, 1600); if (g.parent) g.parent.remove(g); });   // v5r2 r2: pauses end with the step
    if (n8) {
      K.prompt('num_f05_n8', {});
      K.meta('chips', 1 / Math.max(2, (item.choices || []).length));
      await S.chips(item.choices.map(String), { kind: 'word', answer: String(item.target) });
    } else {
      K.prompt('num_f05_n7', {}, { readingTarget: true, targetTpl: 'core_num', targetSlots: { n } });
      await K.answerNum(item.choices.map(Number), { answer: n, min: n > 20 ? 1 : 0 });      // v4: ≥ 5 chips at s1, keypad at s2
    }
    L.cls('lit');
    F.sfx.magic(); const y0 = bottle.position.y; await tween(700, k => { bottle.rotation.y = k * Math.PI * 2; bottle.position.y = y0 + Math.sin(k * Math.PI) * 0.4; }); sparkleAt(bottle, 0xff9ad6);
    await K.say('num_f05_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F11 Ti-og-litt (a ten + hidden ones under a cloth: «17 er ti og …?») */
fmt('F11', { name: 'Ti-og-litt', strands: { 'T-MENGDE': [8, 8] }, places: ['myntverket', 'any'], family: 'bygg', tpl: ['num_f10_m8', 'num_f11_q', 'num_f11_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    const whole = K.p.whole != null ? +K.p.whole : (item.n != null ? +item.n : item.target + 10), ones = whole - 10;
    const sk = SKIN[fairy()];
    const own11 = themeModel(K);                                                   // v5d (WP-A): params.model / ctx.theme – its food under the cloth
    const B = K.board({ style: own11 ? 'grass' : sk.board, w: 6.4, d: 2.6, h: 0.6 });
    const Bd = Builder(B, { oneModel: own11 || skinModel(sk), layout: 'rows', tenBox: own11 ? 'wood' : sk.box, maxTens: 2, size: 0.38, cell: 0.46, x: -0.35 });
    Bd.set(whole);
    const goalL = goalPlaque(B, whole);
    // v4 hint_leaks 7: the cloth always covers the WHOLE ones row (fixed width at every level) – its size never shows how many hide
    const cw = 9 * 0.46 + 0.35;
    const cloth = piece('fx_n_klut', {}, cw, { hk: 3 }); { const k = cw / 16; cloth.scale.set(1, 0.58 / (4 * k), 0.62 / (10 * k)); }
    const first = Bd.slotOf(1, 0), last = Bd.slotOf(1, 9);
    cloth.position.set((first.x + last.x) / 2 + Bd.group.position.x, 0.02, first.z + Bd.group.position.z); B.top.add(cloth);
    // the hidden ones really are hidden (tall heads poked out past the cloth): shown only in the hint peek and the payoff
    const showOnes = on => Bd.ones.forEach(p => { p.visible = on; }); showOnes(false);
    // v5 (WP-B1 params.peekOnes, s0 scaffold): a short look under the cloth before the question – nothing is counted
    if (K.p.peekOnes && (item.sup || 0) === 0) { const y0 = cloth.position.y; showOnes(true); await tween(260, k => { cloth.position.y = y0 + k * 0.5; }); await sleep(1100); await tween(260, k => { cloth.position.y = y0 + 0.5 - k * 0.5; }); showOnes(false); }
    const ask = async () => { await K.prompt('num_f10_m8', { n: U.clamp(whole, 10, 20) }); };
    // v5 (playtest2): the cloth never lifts in a hint – before an attempt the ten glows («ti») and the goal pulses; after an error her
    // own total is said («Det ble 17 – for mange») and the ten again; the peek under the cloth (counted on) is the SOLUTION step only
    const glowTen = async () => { Bd.tens.forEach(tn => glowObj(tn, true)); goalL.cls('pulse'); await K.num(10); await sleep(400); Bd.tens.forEach(tn => glowObj(tn, false)); goalL.cls('pulse', false); };
    K.hint(async (tag, v) => {
      const k = Math.round(+v);
      if (v != null && isFinite(k) && k >= 0 && k <= 10 && k !== ones) { await sayTotal(10 + k); await K.say(k > ones ? 'num_for_mange' : 'num_for_fa', {}, ''); }
      await glowTen(); await ask();
    }, async () => { await glowTen(); await ask(); });
    K.sol(async () => {
      if (S.active && S.active.solution) S.active.solution(ones);
      const y0 = cloth.position.y; showOnes(true); await tween(300, k => { cloth.position.y = y0 + k * 0.5; });
      await K.num(10); await countAlong(K, Bd.ones, 11, { keep: true });
      await tween(300, k => { cloth.position.y = y0 + 0.5 - k * 0.5; }); showOnes(false); Bd.ones.forEach(p => glowObj(p, false));
      await K.say(S.active && S.active.kind === 'keypad' ? 'core_sol_keys' : 'core_sol_chip', {}, '');
    });
    K.say('num_f11_q', {}, ''); ask();
    await K.answerNum(item.choices, { answer: ones, min: 0, max: 10 });
    showOnes(true); await tween(500, k => { cloth.position.y += 0.06; cloth.rotation.z = k * 0.6; cloth.scale.y = Math.max(0.05, 1 - k); }); cloth.visible = false;
    await K.num(10); for (let i = 0; i < Bd.ones.length; i++) { bounce(Bd.ones[i], 0.25); await K.num(11 + i); }
    await K.say('num_f11_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F13 Sparegrisen (M10 top: missing addend, crossing ten, change from 20) */
fmt('F13', { name: 'Sparegrisen', strands: { 'T-MENGDE': [10, 10] }, places: ['skattkammer', 'mias rom', 'any'], family: 'regne', tpl: ['num_f13_har', 'num_f13_har1', 'num_f13_trenger', 'num_f13_mangler', 'num_f13_sammen', 'num_f13_tjue', 'num_f13_tilbake'],
  async run(item, S) {
    const K = Kit(item, S, this); const ans = item.target;
    let op = K.p.op || 'missing', a = K.p.a != null ? +K.p.a : null, b = K.p.b != null ? +K.p.b : null;
    if (op === 'missing' && (a == null || b == null)) { b = U.clamp(item.n || 17, 12, 20); a = b - ans; }
    if (op === 'add' && (a == null || b == null)) { a = 8; b = ans - 8; }
    if (op === 'change') { b = 20; if (a == null) a = 20 - ans; }
    const B = K.board({ style: op === 'add' ? 'wood' : 'counter', w: 6.6, d: 2.7, h: 1.0 });
    let ask;
    const meter = (filled, total, x, z) => { // segments grouped in tens (the gap of what is missing is visible)
      const g = new THREE.Group(); B.add(g, x, z); const mats = [];
      for (let i = 0; i < total; i++) { const m = new THREE.MeshLambertMaterial({ color: i < filled ? 0xf5c542 : 0xf1e6d0 }); mats.push(m); const sm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.34), m); sm.position.set((i - (total - 1) / 2) * 0.23 + (i >= 10 ? 0.07 : -0.07), 0.07, 0); g.add(sm); }
      g.userData.mats = mats; return g;
    };
    if (op === 'add') {
      // two ten-frames: a + b; the make-ten hint moves pieces to fill the first frame
      // v4 hint_leaks 13: at s2 only the two plaques show – the countable pieces arrive with the hint
      const model = skinModel(SKIN[fairy()]);
      const piecesNow = item.sup < 2;
      const TA = TenView(B, { model, layout: 'frames', box: SKIN[fairy()].box === 'star' ? 'star' : 'carton', max: 10, x: -1.6, z: -0.1, n: piecesNow ? a : 0, size: 0.4 });
      const TB = TenView(B, { model, layout: 'frames', box: 'carton', max: 10, x: 1.6, z: -0.1, n: piecesNow ? b : 0, size: 0.4 });
      const fillAll = () => { if (TA.items.filter(Boolean).length || TB.items.filter(Boolean).length) return; for (let i = 0; i < a; i++) popIn(TA.place(i), 160); for (let i = 0; i < b; i++) popIn(TB.place(i), 160); };
      B.label(TA.group, String(a), { cls: 'num', dy: 0.9 }); B.label(TB.group, String(b), { cls: 'num', dy: 0.9 });
      ask = () => K.prompt('num_f13_sammen', {});
      // v5: before an attempt only the two amounts (each frame glows in turn) and the question; the make-ten move is the after-error hint
      const preAdd = async () => { fillAll(); await sleep(300); for (const T of [TA, TB]) { const its = T.items.filter(Boolean); its.forEach(o => glowObj(o, true)); await sleep(700); its.forEach(o => glowObj(o, false)); } await ask(); };
      K.hint(async () => { // make ten: pieces hop from the right frame into the left until it is full
        fillAll(); await sleep(400);
        const need = 10 - a; const moved = [];
        for (let i = 0; i < need; i++) { const j = b - 1 - i; const p = TB.items[j]; if (!p) break; TB.items[j] = null; const to = TA.slots[a + i].clone().add(TA.group.position).sub(TB.group.position); await hopTo(p, to, 300, 0.6); moved.push(p); }
        TA.items.filter(Boolean).forEach(o => glowObj(o, true)); moved.forEach(o => glowObj(o, true)); await K.num(10); TA.items.filter(Boolean).forEach(o => glowObj(o, false)); moved.forEach(o => glowObj(o, false));
        await countAlong(K, TB.items.filter(Boolean), 11, { stopBefore: true });
        await ask();
      }, preAdd);
      ask();
    } else {
      // v5 WP-R2 (#23): pocket money (ctx.pocket / params.pocket) is someone's own PURSE at the counter – no piggy-bank lines
      // («Pungen har 9 mynter.», «Det koster 12.», «Pungen er tom.»), and no spoken number outside its clip set (the plaques show it)
      const pocket = !!(K.ctx.pocket || K.p.pocket);
      const pig = piece(pocket ? 'fx_n_pung' : 'fx_n_gris', {}, pocket ? 1.0 : 1.3, { hk: 0.8 }); B.add(pig, -2.4, -0.4);
      const have = op === 'change' ? a : a, total = op === 'change' ? 20 : b;
      const showM = item.sup === 0 || K.p.structure;            // v4 hint_leaks 13: the gap meter is s0 only (the hint draws it)
      const M = showM ? meter(have, total, 0.6, -0.55) : null;
      if (op === 'change') {
        const tagA = new THREE.Object3D(); tagA.position.set(2.6, 0.3, 0.6); B.top.add(tagA); B.label(tagA, String(a), { cls: 'num price', dy: 0.05 });
        const c1 = piece('fx_n_mynt10', {}, 0.55, { hk: 1 }), c2 = piece('fx_n_mynt10', {}, 0.55, { hk: 1 }); B.add(c1, -0.6, 0.6); B.add(c2, 0.1, 0.6);
        ask = async () => { if (inSet('PRICE', a)) await K.say(kosterId(a), { n: a }, ''); await K.say('num_f13_tjue', {}, ''); await K.prompt('num_f13_tilbake', {}); };
      } else {
        B.label(pig, String(a), { cls: 'num', dy: 1.2 });
        const goalA = new THREE.Object3D(); goalA.position.set(2.7, 0.2, 0.55); B.top.add(goalA); B.label(goalA, String(b), { cls: 'num goal', dy: 0.1 });
        const in20 = v => v >= 0 && v <= 20;
        ask = async () => {
          if (pocket) {
            if (a === 0) await K.say('num_f13p_tom', {}, ''); else if (a === 1) await K.say('num_f13p_har1', {}, ''); else if (in20(a)) await K.say('num_f13p_har', { n: a }, '');
            if (inSet('PRICE', b)) await K.say(kosterId(b), { n: b }, ''); else if (in20(b)) await K.say('num_f13_trenger', { n: b }, '');
          } else {
            if (a === 1) await K.say('num_f13_har1', {}, ''); else if (in20(a)) await K.say('num_f13_har', { n: a }, '');
            if (in20(b)) await K.say('num_f13_trenger', { n: b }, '');
          }
          await K.prompt('num_f13_mangler', {});
        };
      }
      // v5: before an attempt the gap is shown as ONE block (have glows, then the whole gap at once) only where the meter is part of
      // the level (s0 / structure); above that the question again. The count-on along the gap is the after-error hint.
      const preGap = async () => {
        if (M && op !== 'change') { const mats = M.userData.mats; for (let i = 0; i < have; i++) mats[i].color.setHex(0xffd95a); await sleep(500);
          for (let i = 0; i < have; i++) mats[i].color.setHex(0xf5c542); for (let i = have; i < total; i++) mats[i].color.setHex(0xb9a5f0); await sleep(900);
          for (let i = have; i < total; i++) mats[i].color.setHex(0xf1e6d0); }
        await ask();
      };
      K.hint(async () => { // count on along the empty segments
        const m = M || meter(have, total, 0.6, -0.55);
        const mats = m.userData.mats; await K.num(have);
        for (let i = have; i < total; i++) { mats[i].color.setHex(0xb9a5f0); F.sfx.pling(i % 10); await sleep(260); }
        await sleep(400); for (let i = have; i < total; i++) mats[i].color.setHex(0xf1e6d0);
        await ask();
      }, preGap);
      ask();
    }
    await K.answerNum(item.choices, { min: 0, max: 40 });
    F.sfx.coins(6);
    await K.say(K.ctx.pocket || K.p.pocket ? 'num_f13p_ok' : 'num_f13_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F16 Prislappen (her stall: write the price the customer says) */
fmt('F16', { name: 'Prislappen', strands: { 'T-SKRIV': [3, 8] }, rungs: [3, 4, 5, 8], places: ['stall', 'any'], family: 'skriv-tall', think: 'AVKODE', tpl: ['num_f16_q', 'num_f16_skriv', 'num_f16_ok', 'num_skriv_n'],
  async run(item, S) {
    const K = Kit(item, S, this); const t = item.target;
    K.secret(t);                                              // v4 C1: «Den skal koste …»
    const th = thingFor(K, x => !x.animal);
    const B = K.board({ style: 'counter', w: 4.8, d: 2.3, h: 1.0 });
    // economy §2 (verify 2nd round): at her stall the tag is the price of what the customer takes, one coin per good (as when she
    // counts out «14 egg» for 14 coins) – so the counter shows THAT many goods (params.many), never one egg priced 14
    const many = K.p.many && t >= 2 && t <= 20 ? t : 0;
    let goods;
    if (many) {
      goods = new THREE.Group(); const cols = 5, rows = Math.ceil(many / cols);
      for (let i = 0; i < many; i++) { const pc = piece(th.model, {}, 0.36, { hk: 0.7 }); pc.position.x = (i % cols - (cols - 1) / 2) * 0.4; pc.position.z = (Math.floor(i / cols) - (rows - 1) / 2) * 0.42; goods.add(pc); }
      B.add(goods, -1.1, -0.1);
    } else { goods = piece(th.model, {}, 0.9, { hk: 0.7 }); B.add(goods, -0.9, -0.2); }
    const tagA = new THREE.Object3D(); tagA.position.set(0.9, 0.3, 0.1); B.top.add(tagA);
    const tag = B.label(tagA, '?', { cls: 'num price blank', dy: 0.05 });
    const ask = () => askWrite(K, 'num_f16_q', t);
    K.hint(async (tag2, v) => { if (tag2 === 'REVERSAL' || tag2 === 'DECADE') await contrastHint(K, t, +v, { z: 0.85 }); else await numHint(K, t, +v, tag2); await ask(); });
    S.replay = () => ask();
    await ask(); K.say('num_f16_skriv', {}, '');
    // v4: fixed-slot keypad (no length leak above s1); s0 gets the ghost first digit like F14 (hint_leaks §5 «F16 ignores the s0 ghost»)
    K.meta('keypad', 0.01);
    const kp = S.keypad(Object.assign({ answer: t, onChange: s => tag.set(s || '?').cls('blank', !s) }, keypadOpts(item, t, { showLen: K.p.showLen != null ? !!K.p.showLen : item.sup < 2 })));
    if (item.sup === 0 && S.active && S.active.el) { const gh = S.active.el.querySelector('.kp-box .gh'); if (gh) gh.textContent = K.p.ghost || String(t)[0]; }
    await kp;
    tag.set(String(t)).cls('blank', false); bounce(goods, 0.3); F.sfx.chime();
    await K.say('num_f16_ok', {}, '');
    return S.result();
  } });

/* --------------------------------------------------------------------- F17 Tallordet (Mia's board: write the number word with tiles / keyboard) */
fmt('F17', { name: 'Tallordet', strands: { 'T-SKRIV': [6, 7] }, places: ['mias rom', 'any'], roles: ['mia'], family: 'skriv-ord', wordTarget: true, tpl: ['num_f17_q', 'num_f17_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    const word = String(item.word || item.target);
    // v5 (wave-1 REQUEST WP-K): the number on the board comes from the item (or its word) – never a «15» fallback
    let n = item.n != null && isFinite(+item.n) ? +item.n : NaN;
    if (!isFinite(n)) { for (let k = 0; k <= 100; k++) if (numWord(k) === word) { n = k; break; } }
    if (!isFinite(n)) n = isFinite(+item.target) ? +item.target : 0;
    const B = K.board({ style: 'wood', w: 4.6, d: 2.0, h: 1.6, tilt: 0.6 });
    const tavle = piece('fx_n_tavle', {}, 2.2, { hk: 0.9 }); B.add(tavle, 0, -0.3);
    B.label(tavle, String(n), { cls: 'num chalk', dy: 1.15, always: true });
    if (n >= 10 && n <= 20) K.prompt('num_f17_q', { n }); else K.prompt('num_f17_q0', {});
    const letters = Array.isArray(item.tiles) && item.tiles.length ? item.tiles.join('') : (K.p.keyboard ? 'all' : U.shuffle(K.rng, word.split('')).join(''));
    // v4 hint_leaks 16: the whole ghost word only while the word is NEW to her (as SKRIV does) – not on every s0 item
    let isNew = true;
    try { const li = F.save && F.save.learn && F.save.learn.items; const rec = li && (li[item.key] || li['T-SKRIV:' + word]); if (rec) isNew = false; } catch (e) {}   // the engine keeps a record per item key once it was practised
    K.meta(K.p.keyboard ? 'keyboard' : 'tiles', 0.01, 'STAVE');
    if (F.RW && F.RW.skrivHint) F.RW.skrivHint(S, word);                 // v5: one sound / the first wrong position – never the whole word
    await S.tiles({ letters, keyboard: !!K.p.keyboard, slots: word.length, ghost: K.p.ghost && item.sup === 0 && isNew ? word : null, answer: word });
    F.sfx.chime(); sparkleAt(tavle);
    await K.say('num_f17_ok', {}, K.voice);
    return S.result();
  } });

/* --------------------------------------------------------------------- order engine (F20 Paraden / F21 Klokkespillet): tap numbered things in order */
async function orderTask(K, o) {
  const S = K.S, item = K.item;
  const arr = Array.isArray(K.p.fromArray) ? K.p.fromArray.map(Number) : (K.p.seqAll || null);
  let order = K.p.order || 'asc';
  let sorted = arr ? arr.slice() : (() => { const n = item.target; const s = new Set([n]); let g = 0; while (s.size < 3 && g++ < 50) s.add(U.int(K.rng, 10, 20)); return [...s].sort((x, y) => x - y); })();
  if (order === 'desc') sorted.sort((x, y) => y - x); else sorted.sort((x, y) => x - y);
  const shuffled = U.shuffle(K.rng, sorted);
  const n = shuffled.length;
  { let f = 1; for (let i = 2; i <= n; i++) f *= i; K.meta('order', 1 / f, 'MØNSTER'); }
  const B = K.board({ style: o.board, w: Math.max(5.6, Math.min(7.4, n * 0.68 + 1.2)), d: 2.6, h: o.h || 1.2 });
  const objs = shuffled.map((v, i) => { const ob = o.make(v, i, n); ob.userData.v = v; B.add(ob, o.x(i, n), o.z(i, n)); return ob; });
  // many plaques in a row: smaller and staggered up/down so the numbers never touch (parent rule: separate tiles)
  const crowded = n > 6;
  const labels = objs.map((ob, i) => B.label(ob, String(ob.userData.v), { cls: 'num ' + (o.labelCls || 'plaque') + (crowded ? ' small' : ''), dy: (o.dy || 0.95) + (crowded && i % 2 ? 0.42 : 0), onClick: () => B.tap(ob) }));
  const objOf = v => objs.find(ob => ob.userData.v === +v && !ob.userData.done);
  let w = null;
  w = K.widget({ kind: 'board', values: sorted, seq: true,                 // v5r2: every tap is kept in order (stage S._tapQ)
    feed: v => { const ob = objOf(v) || objs.find(x => !x.userData.done && x.userData.v !== S.expected); return ob ? K.submit(ob.userData.v, w) : false; },
    mark: (v, cls) => { const ob = objOf(v); if (ob && cls === 'wrong') shake(ob); },
    solution: v => { const ob = objOf(v); if (ob) { glowObj(ob, true); labels[objs.indexOf(ob)].cls('pulse'); } } });
  objs.forEach(ob => B.pick(ob, () => { if (!ob.userData.done) K.submit(ob.userData.v, w); }));
  const strip = item.sup === 0 ? K.strip() : null;
  // (answer-free: «Finn det minste tallet» – also the pre-attempt hint; the s0 strip lights the value only after an error)
  K.hint(async (tag, v) => { await K.say(order === 'desc' ? 'num_f20_storst' : 'num_f20_minst', {}, ''); if (strip && v != null) { const rest = objs.filter(x => !x.userData.done).map(x => x.userData.v); strip.mark(order === 'desc' ? Math.max(...rest) : Math.min(...rest)); } }, 'post');
  K.sol(async () => { K.solEver = true; w.solution(S.expected); await K.say('core_sol_chip', {}, ''); });
  await o.prompt(order);
  for (let i = 0; i < sorted.length; i++) {
    const done = K.arm({ answer: sorted[i], cont: i > 0 });           // v5: one answer in several steps (WP-K2 arm({cont}))
    await done;
    const ob = objs.find(x => x.userData.v === sorted[i]);
    ob.userData.done = true; B.unpick(ob); glowObj(ob, false); labels[objs.indexOf(ob)].cls('pulse', false).cls('done');
    await o.step(ob, i, sorted.length);
  }
  if (strip) strip.mark(null);
  return { sorted, objs };
}
fmt('F20', { name: 'Paraden', strands: { 'T-ORDEN': [7, 8] }, places: ['park', 'library', 'harbour', 'any'], roles: ['rolf'], family: 'orden', tpl: ['num_f20_tog', 'num_f20_asc', 'num_f20_desc', 'num_f20_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    const th = thingFor(K, x => x.animal || x.id === 'stjerne');      // ducks, sheep, chicks marching (stars as the fallback)
    const r = await orderTask(K, { board: 'street', h: 1.0,
      make: () => piece(th.model, {}, 0.8), x: (i, n) => (i - (n - 1) / 2) * Math.min(1.05, 5.6 / n), z: i => (i % 2 ? 0.45 : -0.2), dy: 0.75,
      // v5 (playtest «early taps»): the lead line is part of the prompt (the gate stays closed through both lines)
      prompt: async order => { await K.prompt('num_f20_tog', {}); await K.prompt(order === 'desc' ? 'num_f20_desc' : 'num_f20_asc', {}); },
      async step(ob, i, n) { const to = new V3(-2.7 + i * Math.min(0.62, 5.2 / n), 0, 1.05); F.sfx.pling(i); await hopTo(ob, to, 320, 0.5); ob.rotation.y = Math.PI / 2; } });
    // the parade marches
    // the parade marches: everyone bobs along together to a little tune
    { const objs = r.objs, x0 = objs.map(o => o.position.x), y0 = objs.map(o => o.position.y);
      [0, 4, 7, 12].forEach((n, i) => F.T.timeout(() => (F.sfx.piano ? F.sfx.piano(F.note(n + 12)) : F.sfx.pling(i)), i * 260));
      await tween(1300, k => objs.forEach((o, i) => { o.position.x = x0[i] + k * 1.3; o.position.y = y0[i] + Math.abs(Math.sin(k * Math.PI * 5 + i * 0.6)) * 0.22; }));
      objs.forEach((o, i) => { o.position.y = y0[i]; }); }
    await K.say('num_f20_ok', {}, K.voice);
    return S.result(K.solEver ? { outcome: 'C' } : null);
  } });
fmt('F21', { name: 'Klokkespillet', strands: { 'T-ORDEN': [8, 8] }, places: ['bandstand', 'music', 'any'], family: 'orden', tpl: ['num_f21_q', 'num_f21_back', 'num_f21_ok'],
  async run(item, S) {
    const K = Kit(item, S, this);
    if (!Array.isArray(K.p.fromArray)) K.p.fromArray = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const pitch = v => F.note(Math.round((v - 10) * 12 / 10) + 12);
    const r = await orderTask(K, { board: 'wood', h: 0.6, labelCls: 'stone',
      make: (v, i, n) => { const ob = piece('fx_n_stav', { c: BAR_COLS[i % BAR_COLS.length] }, 0.5 + 0.45 * (1 - i / Math.max(1, n - 1)), { hk: 3 }); ob.rotation.y = Math.PI / 2; return ob; },
      x: (i, n) => (i - (n - 1) / 2) * Math.min(0.62, 6.0 / n), z: () => 0, dy: 0.35,
      prompt: async order => K.prompt(order === 'desc' ? 'num_f21_back' : 'num_f21_q', {}),
      async step(ob) { F.sfx.piano ? F.sfx.piano(pitch(ob.userData.v)) : F.sfx.pling(0); const y0 = ob.position.y; await tween(240, k => { ob.position.y = y0 - Math.sin(k * Math.PI) * 0.08; }); } });
    // play the whole scale once more
    for (const v of r.sorted) { F.sfx.piano ? F.sfx.piano(pitch(v)) : F.sfx.pling(0); await sleep(170); }
    await K.say('num_f21_ok', {}, '');
    return S.result(K.solEver ? { outcome: 'C' } : null);
  } });

/* --------------------------------------------------------------------- F22 Ble det riktig? (someone counts aloud – maybe with a slip – Ja/Nei) */
// F22 at O1–O2: the asker guesses the stone after / before N (sometimes wrong: 16 or 41 for 15) → Ja/Nei
// v5d: the replay hint's wording «mens det blir telt» (his count, maybe slipped) once its clip exists, else the old line
const f22Hint = () => { try { return F.TPL.has('num_f22_hint_n') && (!window.SPEECH || F.Speech.has(F.TPL.all.num_f22_hint_n.text[0], '')) ? 'num_f22_hint_n' : 'num_f22_hint'; } catch (e) { return 'num_f22_hint'; } };
async function ordJudge(K) {
  const S = K.S, item = K.item, t = item.target;
  const dir = K.p.dir === 'before' ? 'before' : 'after';
  const ref = dir === 'after' ? t - 1 : t + 1;
  const correct = K.p.truth != null ? !!K.p.truth : K.rng() < 0.5;
  const wrongs = (item.distractors || []).map(d => +d.v).filter(v => v !== t && v !== ref && v >= 0 && v <= 99);
  const guess = correct ? t : (wrongs.length ? U.pick(K.rng, wrongs) : dir === 'after' ? t + 1 : t - 1);
  let seq = dir === 'after' ? [ref - 2, ref - 1, ref, t] : [t, ref, ref + 1, ref + 2];
  const qi = dir === 'after' ? 3 : 0;
  const B = K.board({ style: 'pond', w: 6.4, d: 2.4, h: 0.8 });
  const n = seq.length, gapX = 1.45;
  const stones = seq.map((v, i) => { const s = piece('fx_n_stein', {}, 1.0, { hk: 2 }); B.add(s, (i - (n - 1) / 2) * gapX + 0.25, (i % 2 ? 0.16 : -0.16)); return s; });
  const labels = stones.map((s, i) => B.label(s, i === qi ? String(guess) : String(seq[i]), { cls: 'num stone' + (i === qi ? ' guess' : ''), dy: 0.4 }));
  const fe = piece('fx_n_fe', { dress: FAIRY_DRESS[fairy()] || 'lilac' }, 0.62, { hk: 0.5 }); const home = new V3(-B.w / 2 + 0.4, 0, 0.6); B.add(fe, home.x, home.z);
  const hopOn = async s => { const to = s.position.clone(); to.y += 0.18; await hopTo(fe, to, 340, 0.7); F.sfx.boing(); };
  const claim = async () => { labels[qi].cls('pulse'); await K.say(dir === 'after' ? 'num_f22_etter' : 'num_f22_for', { n: ref }, ''); await sayN(guess); labels[qi].cls('pulse', false); };
  // hint: the fairy hops along the known stones counting (forwards for «etter», backwards for «før»), pausing at the '?'
  const order = dir === 'after' ? [0, 1, 2] : [3, 2, 1];
  const walk = async () => { for (const i of order) { await hopOn(stones[i]); await K.num(seq[i]); } labels[qi].cls('pulse'); await sleep(700); labels[qi].cls('pulse', false); fe.position.copy(home); };
  K.hint(async () => { await K.say('num_f22_hint2', {}, ''); await walk(); await claim(); await K.prompt('num_f22_q', {}); }, 'post');
  await claim();
  K.prompt('num_f22_q', {});
  await S.yesno({ answer: correct });
  if (!correct) { labels[qi].cls('guess', false).cls('wrong'); await sleep(350); labels[qi].set(String(t)).cls('wrong', false); F.sfx.chime && F.sfx.chime(); }
  else labels[qi].cls('guess', false);
  await Promise.all([(async () => { for (const i of (dir === 'after' ? [0, 1, 2, 3] : [3, 2, 1, 0])) await hopOn(stones[i]); sparkleAt(fe); F.sfx.splash(); })(),
    K.say(correct ? 'num_f22_ja' : 'num_f22_nei', {}, K.voice)]);
  return S.result();
}
/* v4 retrofit «F22 bundles» at O1–O2 (s1/s2): the asker makes 2 / 3 claims «Etter 12 kommer 14» (stone pairs, his guess on a golden
   plaque); she taps EVERY wrong claim + ✓ (subset), then fixes the target one with the number (≥ 5 chips at s1, keypad at s2). */
async function ordBundle(K) {
  const S = K.S, item = K.item, t = item.target;
  const nP = (item.sup || 0) >= 2 ? 3 : 2;
  const dir0 = K.p.dir === 'before' ? 'before' : 'after';
  const [lo, hi] = item.rung <= 1 ? [11, 15] : [11, 19];
  const claims = [{ t, dir: dir0 }];
  for (let g = 0; claims.length < nP && g < 100; g++) { const x = U.int(K.rng, lo, hi), d = K.rng() < 0.5 ? 'after' : 'before'; if (!claims.some(c => c.t === x)) claims.push({ t: x, dir: d }); }
  const wrongOf = c => { const opts = [c.t + 1 + (c.dir === 'after' ? 1 : -1) * 0, c.t + 2, c.t - 2, c.t > 10 && c.t < 20 ? rev(c.t) : c.t + 10].filter(v => v !== c.t && v >= 0 && v <= 99 && v !== (c.dir === 'after' ? c.t - 1 : c.t + 1)); return U.pick(K.rng, opts); };
  claims.forEach((c, i) => { c.ref = c.dir === 'after' ? c.t - 1 : c.t + 1; c.wrong = i === 0 || K.rng() < 0.4; c.guess = c.wrong ? wrongOf(c) : c.t; });
  const order = U.shuffle(K.rng, claims.map((_, i) => i)); const cl = order.map(i => claims[i]);
  const tp = cl.findIndex(c => c === claims[0]);
  const wrong = cl.map((c, i) => c.wrong ? i : -1).filter(i => i >= 0);
  const W = nP === 3 ? 7.4 : 6.4;
  const B = K.board({ style: 'pond', w: W, d: 2.4, h: 0.8 });
  const xs = p => (p - (nP - 1) / 2) * ((W - 0.6) / nP);
  const pairs = cl.map((c, p) => {
    const g = new THREE.Group(); B.add(g, xs(p), 0);
    // each claim is a PAIR of stones side by side on its own lily pad (clearly apart from the other claims)
    const pad = piece('fx_n_klut', {}, 1.7, { hk: 3 }); pad.scale.y *= 0.25; pad.position.set(0, -0.05, 0.05); g.add(pad);
    const mk = (v, dx, guess) => { const st = piece('fx_n_stein', {}, 0.66, { hk: 2 }); st.position.set(dx, 0, 0); g.add(st); return B.label(st, String(v), { cls: 'num stone' + (guess ? ' guess' : ''), dy: 0.4 }); };
    const left = c.dir === 'after' ? c.ref : c.guess, right = c.dir === 'after' ? c.guess : c.ref;
    const Ll = mk(left, -0.36, c.dir !== 'after'), Lr = mk(right, 0.36, c.dir === 'after');
    return { g, c, Lg: c.dir === 'after' ? Lr : Ll, sel: false };
  });
  for (const pr of pairs) { pr.Lg.cls('pulse'); await K.say(pr.c.dir === 'after' ? 'num_f22_etter' : 'num_f22_for', { n: pr.c.ref }, ''); await sayN(pr.c.guess); pr.Lg.cls('pulse', false); await sleep(200); }
  const A = K.actions([{ id: 'ok', label: '✓', cls: 'gold okbtn big1' }]);
  const key = () => pairs.map((pr, p) => pr.sel ? p : -1).filter(p => p >= 0).join(',');
  K.meta('subset', +(1 / (Math.pow(2, nP) - 1) * ((item.sup || 0) >= 2 ? 0.01 : 0.2)).toFixed(4), 'MØNSTER');
  const done = K.arm({ answer: wrong.join(',') });
  const setSel = (p, on) => { const pr = pairs[p]; pr.sel = on; glowObj(pr.g, on); pr.Lg.cls('pulse', on); };
  const w = K.widget({ kind: 'board', values: [],
    feed: v => { const want = String(v).split(',').filter(x => x !== '').map(Number); pairs.forEach((_, p) => setSel(p, want.includes(p))); return K.submit(key(), w); },
    mark: (v, cls) => { if (cls === 'wrong') { pairs.forEach(pr => shake(pr.g)); pairs.forEach((_, p) => setSel(p, false)); } },
    solution: v => { const want = String(v).split(',').map(Number); pairs.forEach((pr, p) => { setSel(p, false); if (want.includes(p)) { pr.Lg.cls('sol'); bounce(pr.g, 0.3); } }); A.glow('ok'); },
    lock: on => A.lock(on) });
  pairs.forEach((pr, p) => B.pick(pr.g, () => { if (w.locked || S.solved) return; F.sfx.click(); setSel(p, !pr.sel); }, { min: 90 }));
  A.on(id => { if (id === 'ok' && !w.locked && !S.solved) K.submit(key(), w); });
  const wv0 = S.wrongValue;
  S.wrongValue = () => wrong.length > 1 ? wrong.slice(1).join(',') : String((wrong[0] + 1) % nP);
  K.hint(async (tag, v) => {
    // count on (forwards for «etter», backwards for «før») from the reference of the first claim she judged wrong
    const said = String(v || '').split(',').filter(x => x !== '').map(Number);
    const p = pairs.findIndex((_, i) => wrong.includes(i) !== said.includes(i));
    // v5 (playtest2): the pair she misjudged pulses and the count starts at its reference – then a pause: the next number is hers
    // (saying ref ± 1 gave away part 1 AND the part-2 fix)
    await K.say('num_f22_hint2', {}, '');
    if (p >= 0) { const c = pairs[p].c; pairs[p].Lg.cls('pulse'); await K.num(c.ref); await sleep(900); pairs[p].Lg.cls('pulse', false); }
    await K.prompt('num_f22_alle', {});
  }, async () => {
    // before an attempt: the claims again, one by one (what he said – nothing about which are wrong)
    for (const pr of pairs) { pr.Lg.cls('pulse'); await K.say(pr.c.dir === 'after' ? 'num_f22_etter' : 'num_f22_for', { n: pr.c.ref }, ''); await sayN(pr.c.guess); pr.Lg.cls('pulse', false); await sleep(200); }
    await K.prompt('num_f22_alle', {});
  });
  await K.prompt('num_f22_alle', {});
  await done;
  A.glow('ok', false); A.remove(); if (w.destroy) w.destroy();
  S.wrongValue = wv0;
  pairs.forEach((pr, p) => { setSel(p, false); if (wrong.includes(p)) pr.Lg.cls('wrong'); });
  // fix the target claim: «Hvilken stein kommer etter 12?»
  const pr = pairs[tp], c = pr.c;
  pr.Lg.set('?').cls('wrong', false).cls('blank');
  const ask = () => K.prompt(c.dir === 'after' ? 'num_f18_next' : 'num_f18_before', { n: c.ref });
  K.hint(async () => { await K.say('num_f22_hint2', {}, ''); await K.num(c.ref); await ask(); }, 'post');
  K.sol(async () => { if (S.active && S.active.solution) S.active.solution(c.t); await K.num(c.ref); await K.say('core_sol_chip', {}, ''); });
  ask();
  await K.answerNum(null, { answer: c.t, min: 0, max: 99 });
  K.meta('twostep', +(1 / (Math.pow(2, nP) - 1) * ((item.sup || 0) >= 2 ? 0.01 : 0.2)).toFixed(4), 'MØNSTER');
  pr.Lg.set(String(c.t)).cls('blank', false).cls('guess', false);
  F.sfx.chime && F.sfx.chime(); bounce(pr.g, 0.25);
  await K.say('num_f22_nei', {}, K.voice);
  return S.result();
}
/* v4 retrofit (SYNTHESIS §3.3 «F22 bundles»): at s1/s2 Rolf counts 2 / 3 piles in a row; each count ends with his number on a plaque
   under the pile. Some counts went wrong (the slip is in his POINTING – a thing pointed at twice or skipped – never in the spoken
   sequence). She taps EVERY pile that is wrong + ✓ (subset, g = 1/(2^n − 1)), then fixes one: «Hvor mange er det egentlig?» (≥ 5 chips
   at s1, keypad at s2). A needs both parts first-try. */
async function countBundle(K) {
  const S = K.S, item = K.item, n = U.clamp(item.target, 4, 20);
  const nP = (item.sup || 0) >= 2 ? 3 : 2;
  const ns = [n];
  for (let g = 0; ns.length < nP && g < 100; g++) { const v = U.int(K.rng, Math.max(5, n - 7), Math.min(20, n + 7)); if (!ns.includes(v)) ns.push(v); }
  while (ns.length < nP) ns.push(Math.max(4, ns[ns.length - 1] - 1));
  const order = U.shuffle(K.rng, ns.map((_, i) => i));
  const vals = order.map(i => ns[i]);
  // a non-empty set of wrong counts (the target pile is always one of them when possible, so the fix step practises item.target)
  let wrong = order.map((_, p) => p).filter(() => K.rng() < 0.45);
  const tp = vals.indexOf(n); if (!wrong.includes(tp)) wrong.push(tp);
  wrong.sort((a, b) => a - b);
  const th = thingFor(K, x => !x.frames);
  const W = nP === 3 ? 7.6 : 6.6;
  const B = K.board({ style: 'grass', w: W, d: 2.7, h: 0.7 });
  const xs = p => (p - (nP - 1) / 2) * ((W - 0.6) / nP);
  const piles = vals.map((v, p) => {
    const T = TenView(B, { model: th.model, layout: 'rows', box: th.box, max: 20, n: v, x: xs(p), z: -0.25, cell: nP === 3 ? 0.21 : 0.27, gap: 0.08, rowGap: nP === 3 ? 0.34 : 0.42, size: nP === 3 ? 0.19 : 0.24 });
    const a = new THREE.Object3D(); a.position.set(xs(p), 0.2, 0.75); B.top.add(a);
    const L = B.label(a, '·', { cls: 'num plaque', dy: 0.05, always: true, onClick: () => B.tap(T.group) });
    return { T, L, v, items: T.items.filter(Boolean), sel: false };
  });
  // Rolf's counts: the pointing plan per pile (skip one / point twice for the wrong ones); the spoken numbers are always 1, 2, 3 …
  const plans = piles.map((pl, p) => {
    const idx = pl.items.map((_, i) => i);
    if (!wrong.includes(p)) return idx;
    const k = 1 + Math.floor(K.rng() * (idx.length - 2));
    return K.rng() < 0.5 ? idx.filter(i => i !== k) : idx.slice(0, k + 1).concat([k], idx.slice(k + 1));
  });
  // v5r2 (verify «hints» #6): a replayed count (voice = false: inside a hint) stops the moment its step is solved, part 2 is armed or
  // the task ended (chainStop) and speaks through the muted narrator – never Rolf's part-1 count over her own counting in part 2
  const countPile = async (p, plan, voice) => {
    const pl = piles[p];
    for (let j = 0; j < plan.length; j++) {
      if (!voice && chainStop(S)) break;
      const o = pl.items[plan[j]]; glowObj(o, true); bounce(o, 0.18); F.sfx.pling(j % 10); await (voice ? K.num(1 + j) : sayQ(S, 1 + j)); glowObj(o, false);
    }
  };
  await K.say('num_f22_tell', {}, K.voice);
  for (let p = 0; p < nP; p++) { await countPile(p, plans[p], true); piles[p].L.set(String(plans[p].length)); await sleep(250); }
  // part 1: tap every pile that was counted wrong, then ✓
  const A = K.actions([{ id: 'ok', label: '✓', cls: 'gold okbtn big1' }]);
  const key = () => piles.map((pl, p) => pl.sel ? p : -1).filter(p => p >= 0).join(',');
  const answer = wrong.join(',');
  K.meta('subset', +(1 / (Math.pow(2, nP) - 1) * ((item.sup || 0) >= 2 ? 0.01 : 0.2)).toFixed(4), 'REGNE');
  const done = K.arm({ answer });
  const setSel = (p, on) => { const pl = piles[p]; pl.sel = on; pl.items.forEach(o => glowObj(o, on)); pl.L.cls('pulse', on); };
  const w = K.widget({ kind: 'board', values: [],
    feed: v => { const want = String(v).split(',').filter(x => x !== '').map(Number); piles.forEach((_, p) => setSel(p, want.includes(p))); return K.submit(key(), w); },
    mark: (v, cls) => { if (cls === 'wrong') { piles.forEach(pl => shake(pl.T.group)); piles.forEach((_, p) => setSel(p, false)); } },
    solution: v => { const want = String(v).split(',').map(Number); piles.forEach((pl, p) => { setSel(p, false); if (want.includes(p)) { pl.L.cls('sol'); bounce(pl.T.group, 0.3); } }); A.glow('ok'); },
    lock: on => A.lock(on) });
  piles.forEach((pl, p) => B.pick(pl.T.group, () => { if (w.locked || S.solved) return; F.sfx.click(); setSel(p, !pl.sel); }, { min: 90 }));
  A.on(id => { if (id === 'ok' && !w.locked && !S.solved) K.submit(key(), w); });
  const wv0 = S.wrongValue;
  S.wrongValue = () => { const a = wrong.slice(); return a.length > 1 ? a.slice(1).join(',') : String((a[0] + 1) % nP); };
  K.hint(async (tag, v) => {
    // recount (correctly) the first pile she judged wrong: «Se på hver ting mens vi teller.»
    // v5 (playtest2): Rolf's OWN count of the first pile she misjudged is replayed slowly (watch his pointing) – a correct recount
    // gave away part 1 and the part-2 answer
    const said = String(v || '').split(',').filter(x => x !== '').map(Number);
    const p = piles.findIndex((_, i) => wrong.includes(i) !== said.includes(i));
    await K.say(f22Hint(), {}, '');
    if (p >= 0) { piles[p].L.cls('pulse'); await countPile(p, plans[p], false); piles[p].L.cls('pulse', false); }
    if (!chainStop(S)) await K.prompt('num_f22_alle', {});
  }, async () => {
    await K.say(f22Hint(), {}, '');
    for (let p = 0; p < nP; p++) { if (chainStop(S)) break; await countPile(p, plans[p], false); await sleep(300); }
    if (!chainStop(S)) await K.prompt('num_f22_alle', {});
  });
  await K.prompt('num_f22_alle', {});
  await done;
  A.glow('ok', false); A.remove();
  piles.forEach((pl, p) => { pl.items.forEach(o => glowObj(o, false)); pl.L.cls('pulse', false).cls('sol', false); if (wrong.includes(p)) pl.L.cls('wrong'); });
  // part 2: fix the target pile
  S.wrongValue = wv0;
  const fp = tp, pl = piles[fp];
  if (w.destroy) w.destroy();
  pl.L.set('?').cls('wrong', false).cls('blank');
  pl.items.forEach(o => glowObj(o, true));
  K.hint(async () => { await tenAfterError(K, pl.T.rowItems(0), pl.v > 10 ? pl.T.rowItems(1) : []); await K.prompt('num_f22_fix', {}); },
    async () => { await tenNudge(K, [pl.T.rowItems(0), pl.T.rowItems(1)]); await K.prompt('num_f22_fix', {}); });
  K.sol(async () => { if (S.active && S.active.solution) S.active.solution(pl.v); await K.num(10); await countAlong(K, pl.T.rowItems(1), 11, { keep: true }); });
  K.prompt('num_f22_fix', {});
  await K.answerNum(null, { answer: pl.v, min: 1, max: 30 });
  K.meta('twostep', +(1 / (Math.pow(2, nP) - 1) * ((item.sup || 0) >= 2 ? 0.01 : 0.2)).toFixed(4), 'REGNE');
  pl.L.set(String(pl.v)).cls('blank', false); pl.items.forEach(o => glowObj(o, false));
  await K.say('num_f22_nei', {}, K.voice);
  return S.result();
}
fmt('F22', { name: 'Ble det riktig?', strands: { 'T-MENGDE': [5, 7], 'T-ORDEN': [1, 2] }, places: ['shop', 'any'], family: 'sjekk',
  tpl: ['num_f22_tell', 'num_f22_q', 'num_f22_ja', 'num_f22_nei', 'num_f22_hint', 'num_f22_etter', 'num_f22_for', 'num_f22_hint2', 'num_f22_alle', 'num_f22_fix'],
  async run(item, S) {
    const K = Kit(item, S, this);
    if (K.ctx.truth != null) {
      // LIFE's NPC has just paid, counting aloud in its own voice (economy.js): she only judges
      K.prompt('num_f22_q', {});
      K.hint(async () => { await K.say(f22Hint(), {}, ''); });
      await S.yesno({ answer: !!K.ctx.truth });
      await K.say(K.ctx.truth ? 'num_f22_ja' : 'num_f22_nei', {}, K.voice);
      return S.result();
    }
    if (item.strand === 'T-ORDEN') return (item.sup || 0) >= 1 && !K.p.single ? ordBundle(K) : ordJudge(K);
    if ((item.sup || 0) >= 1 && !K.p.single) return countBundle(K);
    const n = U.clamp(item.target, 4, 20);
    const correct = K.p.truth != null ? !!K.p.truth : K.rng() < 0.5;
    const th = thingFor(K, x => !x.frames);
    const B = K.board({ style: 'grass', w: 6.4, d: 2.5, h: 0.7 });
    const T = TenView(B, { model: th.model, layout: 'rows', box: th.box, max: 20, n, size: 0.42 });
    const items = T.items.filter(Boolean);
    // v5 (#13): a «wrong» item needs ≥ 3 groups to plant a slip – with 10 + 1 the ones are counted one by one instead
    const onFrom10 = item.rung >= 7 && n > 10 && (correct || n - 10 + 1 >= 3);
    // v4 hint_leaks 14: the spoken sequence is always a correct count (1, 2, 3 … with no repeated or skipped number). The slip is
    // planted in the POINTING: one thing is pointed at twice, or one is skipped – she must watch the things, not listen for a glitch.
    const groups = onFrom10 ? [items.slice(0, 10), ...items.slice(10).map(x => [x])] : items.map(x => [x]);
    const first = onFrom10 ? 10 : 1;
    const idx = groups.map((_, i) => i);
    let plan = idx.slice();
    if (!correct && groups.length >= 3) { const k = 1 + Math.floor(K.rng() * (groups.length - 2)); plan = K.rng() < 0.5 ? idx.filter(i => i !== k) : idx.slice(0, k + 1).concat([k], idx.slice(k + 1)); }
    const count = async (pl, voice) => { for (let j = 0; j < pl.length; j++) { if (!voice && chainStop(S)) break; const gp = groups[pl[j]]; gp.forEach(o => { glowObj(o, true); bounce(o, 0.2); }); F.sfx.pling(j % 10); await (voice ? K.num(first + j) : sayQ(S, first + j)); gp.forEach(o => glowObj(o, false)); } };   // v5r2: the hint's replay stops with its step
    K.meta('chips', 0.5, 'REGNE');
    await K.say('num_f22_tell', {}, K.voice);
    await count(plan, true);
    // v5 (#13): the truth is the plan that was really built (never «Nei» for a count that was right)
    const truth = plan.length === idx.length && plan.every((x, i) => x === idx[i]);
    // v5 (playtest2): before an attempt the hint replays HIS count slowly (watch the pointing) – a correct recount was the solution
    K.hint(async () => { await K.say(f22Hint(), {}, ''); await count(plan, false); await K.prompt('num_f22_q', {}); }, 'post');
    K.prompt('num_f22_q', {});
    await S.yesno({ answer: truth });
    await K.say(truth ? 'num_f22_ja' : 'num_f22_nei', {}, K.voice);
    if (!truth) await count(idx, true);
    return S.result();
  } });

/* =====================================================================================================================
   8. registration (load + boot), test hooks
   ===================================================================================================================== */
function register() {
  if (!F.Task || !F.Task.def) return;
  for (const id in SPECS) {
    const s = SPECS[id];
    const wrapped = s._wrapped || (s._wrapped = Object.assign({}, s, { run(item, S) { const it = norm(item, s, true); Object.assign(item, { target: it.target, choices: it.choices }); if (S && typeof S.expected !== 'number' && typeof it.target === 'number') S.expected = it.target; return s.run.call(s, it, S); } }));
    if (F.Task.defs && F.Task.defs[id] === wrapped) continue;
    try { F.Task.def(id, wrapped); } catch (e) { console.error('[f_num] def ' + id, e); }
  }
  F.Task.pay = pay;
}
register();
F.on('boot', register);
NUM.specs = SPECS;
NUM.norm = norm;
NUM.pay = pay;
F.dbg = F.dbg || {};
F.dbg.num = {
  // run a number format through the real stage with a bank item: F.dbg.num.run('F07', {rung, sup, target, params, ctx})
  run(id, o) {
    o = o || {};
    const item = NUM.mkItem(id, o);
    if (o.params) item.params = Object.assign({}, item.params || {}, o.params);
    NUM.lastResult = null;
    NUM.lastRun = F.Task.run(item, o.ctx || { place: { x: F.Player.pos.x, z: F.Player.pos.z - 3, id: 'here' } }).then(r => (NUM.lastResult = r));
    F.debug.frames(3);
    return JSON.parse(JSON.stringify(item));
  },
  board: () => { const B = activeBoard; if (!B) return null; return { picks: B.picks.length, labels: B.labels.map(L => L.el.textContent), locked: B.locked }; },
  result: () => NUM.lastResult,
};
})();
