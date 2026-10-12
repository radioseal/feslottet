/* Feslottet – WP-M reasoning formats (DESIGN4 §4.3, SYNTHESIS §3.2). Owner: WP-M. Items: js/learn/gen_reason.js (F.REASON.gen, registered
   with F.BANKS.reg); speech: js/speech/lines_reason.js. A format that gets an item of another shape (debug / demo item) makes its own
   with F.REASON.gen (ensure()), so every format runs anywhere (places include 'any'; portable: true).
     F52 Froskesteinene 2.0 (MØNSTER Mø3–Mø4) – a pond board with a stone path and a real frog (pond decor, lily markers):
         gaps   (Mø3) numbers fell off some stones (steps ±1 ±2 ±5 ±10) → fixed-slot keypad per gap; the frog hops on
         land   (Mø4) «Frosken hopper k om gangen» from the green start stone, 30 stones (rows of 10, snake path, forward / back)
                → tap EVERY landing + Ferdig (subset, g ≈ 2^-29); look-back: the frog jumps HER stones, a wrong jump ends in «Plask!»
         where  (Mø4) k per jump, j jumps → tap ONE stone of 30 (g 1/29); look-back: the frog jumps towards her stone, counting
         wrongst(Mø4) one stone has a wrong number → tap it (+ type the right number from s1: 2T); two R → production twin
     F58 Perlemakeren (MØNSTER Mø1–Mø2) – the jeweller's velvet board, beads / shapes / sun-moon / fruit / instruments on a gold string:
         beads (Mø1 next 3 from a palette of 3–6, g ≤ 1/27) · unit (tap where the core ends) · error (find the wrong bead; fix it at s2)
         · abstract (the same pattern with new things – any bijection counts)
     F59 Voksetårnet (MØNSTER Mø5) – three terms of a growing cube pattern on plinths (tower +2/+3, staircase, square, L, twin towers,
         wall); she builds the 4th by tapping cells (↶ undo, Ferdig); mirror / rotations accepted where the shape allows
     F71 Sorteringskassene (ORD Or1, LOGIKK Lo1 + Lo3, DATA D1) – farmyard board with real 3D things:
         tapall (Or1 «Trykk på all frukten» among 6–8, subset) · odd (Or1; Lo1 + reason card read aloud = 2T; numbers variant)
         · riddle (Lo1 «Jeg kan ikke fly. Jeg bor på gården.» over 6–8 animals; re-deal swaps the wrongly picked animal)
         · lineup (Lo3 «Rekka»: order 3–4 children / pets from spoken clues onto spots 1–4; who is tallest / first)
         · sort (D1 sort into two crates by a pictured rule, then «Finn en annen måte» – any other valid sorting counts; 'which' =
           «Hvilken regel brukte Puff?» rule cards first)
     F74 Dronningens blomsterbed (LOGIKK Lo2) – 4×4 bed, chunky flowers (red tulip, purple rose, yellow sunflower, white lily),
         tap an empty «?» bed to cycle, Ferdig; solver-unique; look-back rings the two equal flowers on one line
   Protocol (stage.js / kit.js, feature-detected): every step goes through S.arm/S.use/S.submit; K.talk keeps follow-up instruction
   lines «inside the prompt» (a tap there is an early tap); S.lookBack (the world acts out HER answer, ≤ 4 s) → S.hint (targeted, never
   the answer in the form she must produce – hint_leaks Table B) → 2nd error: the solution glows / ghosts and she carries it out (C).
   v5 (WP-R2): K.hint is an AFTER-ERROR hint – before any attempt WP-K2's S.preHint runs (or «Se godt på …» + the question), never a
   look-back of an answer she has not given; the F52 / F58 fix steps have their own phase + replay (not phase 1's question);
   production formats declare spec.mode + a numeric spec.g (F52 keypad, F58 / F59 build 0.01, F74 grid 0.001; F71 learns g).
   No right/wrong feedback before Ferdig (C4). Numbers stay on the stones (SYNTHESIS §6.6). S.replay re-says the stimulus (audio).
   Uses the f_num.js diorama board: F.NUM.Board / F.NUM.piece (WP-R keeps that API).
   Public (tests): F.RS.cur → {format, item, B, K, w}, F.RS.state(), F.RS.KINDS, F.RS.ensure(item, spec). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = THREE.Vector3;
const RS = F.RS = F.RS || {};
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);
const say = (id, slots) => F.TPL.has(id) ? F.SAY(id, slots || {}, '') : Promise.resolve();
const sayN = n => n >= 0 && n <= 100 ? F.SAY('core_num', { n }, '') : Promise.resolve();
const sameArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => String(x) === String(b[i]));
const setEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.slice().map(String).sort().join() === b.slice().map(String).sort().join();

/* =====================================================================================================================
   0. voxel pieces (prefix fx_r_)
   ===================================================================================================================== */
const def = (id, d) => { if (!F.VOX.has(id)) F.VOX.def(id, d); };
def('fx_r_perle', { size: [7, 7, 7], scale: 1 / 14, build(v, o) { v.sphere(3, 3, 3, 3.3, o.c || 'red'); v.set(1, 5, 4, 'white'); v.clear(3, 0, 3, 3, 6, 3); v.set(3, 3, 3, o.c || 'red'); } });
def('fx_r_kube', { size: [6, 6, 6], scale: 1 / 12, build(v, o) { v.box(0, 0, 0, 5, 5, 5, o.c || 'sky'); v.set(1, 5, 1, 'white'); } });
def('fx_r_hjerte', { size: [9, 8, 4], scale: 1 / 14, build(v, o) { const c = o.c || 'rose';
  v.sphere(2.4, 5, 2, 2.4, c); v.sphere(6.6, 5, 2, 2.4, c); v.cone(4.5, 0, 2, 3.6, 5, c); v.box(1, 2, 1, 8, 5, 3, c); for (let y = 0; y < 3; y++) { v.clear(0, y, 0, 2 - y + 1, y, 4); v.clear(7 + y - 1, y, 0, 8, y, 4); } v.set(2, 6, 3, 'white'); } });
def('fx_r_trekant', { size: [9, 8, 9], scale: 1 / 14, build(v, o) { for (let y = 0; y < 8; y++) { const r = 4 - y * 0.55; v.box(Math.round(4 - r), y, Math.round(4 - r), Math.round(4 + r), y, Math.round(4 + r), o.c || 'mint'); } } });
def('fx_r_stjerne', { size: [11, 11, 3], scale: 1 / 14, build(v, o) { const c = o.c || 'butter';
  for (let x = 0; x < 11; x++) for (let y = 0; y < 11; y++) { const dx = x - 5, dy = y - 5, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy); const k = 0.5 + 0.5 * Math.cos(5 * (a - Math.PI / 2));
    if (r <= 2.2 + 3.3 * k) v.box(x, y, 0, x, y, 2, c); } } });
def('fx_r_klosse', { size: [8, 8, 8], scale: 1 / 25, build(v, o) { v.box(0, 0, 0, 7, 7, 7, o.c || 'woodRed'); v.box(0, 7, 0, 7, 7, 7, o.top || 'coral'); v.set(1, 7, 1, 'peach'); } });
def('fx_r_plate', { size: [8, 1, 8], scale: 1 / 25, build(v, o) { v.box(0, 0, 0, 7, 0, 7, o.c || 'stone2'); v.box(1, 0, 1, 6, 0, 6, o.c2 || 'pathStone'); } });
def('fx_r_merke', { size: [7, 2, 7], scale: 1 / 12, build(v) { v.cyl(3, 0, 3, 3.2, 1, 'leaf'); v.set(3, 1, 3, 'pink'); v.set(2, 1, 3, 'blossom'); v.set(4, 1, 3, 'blossom'); v.set(3, 1, 2, 'blossom'); v.set(3, 1, 4, 'blossom'); v.clear(3, 0, 6, 3, 0, 6); } });
def('fx_r_jord', { size: [8, 2, 8], scale: 1 / 16, build(v) { v.box(0, 0, 0, 7, 1, 7, 'soil'); v.box(1, 1, 1, 6, 1, 6, 'woodDark'); v.set(2, 1, 5, 'soil'); v.set(5, 1, 2, 'soil'); } });
def('fx_r_kasse', { size: [16, 5, 12], scale: 1 / 11, build(v, o) { const c = o.c || 'woodLight', c2 = o.c2 || 'wood';
  v.hollow(0, 0, 0, 15, 4, 11, c); v.box(1, 0, 1, 14, 0, 10, c2); v.paint((x, y, z) => (y === 2 || y === 4) && (x === 0 || x === 15 || z === 0 || z === 11) ? c2 : null); } });
const BEAD_COL = { 'rød': 'red', 'blå': 'blue', gul: 'yellow', 'grønn': 'green', lilla: 'purple', rosa: 'pink' };
const SHAPE = { kule: ['fx_r_perle', { c: 'sky' }], kube: ['fx_r_kube', { c: 'sky' }], stjerne: ['fx_r_stjerne', { c: 'sky' }], hjerte: ['fx_r_hjerte', { c: 'sky' }], trekant: ['fx_r_trekant', { c: 'sky' }] };
const OBJ_MODEL = { stjerne: 'fx_r_stjerne' };
// a pattern token → {model, opts, size}
function tokModel(surface, t) {
  if (surface === 'perler') return { model: 'fx_r_perle', opts: { c: BEAD_COL[t] || 'red' }, size: 0.36 };
  if (surface === 'former') return { model: SHAPE[t][0], opts: SHAPE[t][1], size: 0.36 };
  const m = OBJ_MODEL[t] && !F.VOX.has(t) ? OBJ_MODEL[t] : t;
  return { model: F.VOX.has(m) ? m : 'fx_r_perle', opts: m === 'fx_r_stjerne' ? { c: 'butter' } : {}, size: 0.46 };
}
const EMO = { 'rød': '🔴', 'blå': '🔵', gul: '🟡', 'grønn': '🟢', lilla: '🟣', rosa: '🩷', kule: '⚪', kube: '🟦', stjerne: '⭐', hjerte: '💙', trekant: '🔺',
  sol: '☀️', 'måne': '🌙', sky: '☁️', bjelle: '🔔', tromme: '🥁', 'fløyte': '🪈', gitar: '🎸', eple: '🍎', 'pære': '🍐', banan: '🍌', plomme: '🟣', sitron: '🍋' };

/* =====================================================================================================================
   1. CSS (injected once – no css file needed)
   ===================================================================================================================== */
let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style'); st.id = 'rsCss';
  st.textContent = [
    '.nlabel.rs-st { font-size: 19px; min-width: 30px; padding: 2px 6px; border-radius: 10px; background: rgba(255,255,255,.92); color: #4a3a6a; box-shadow: 0 2px 6px rgba(60,40,90,.25); }',
    '.nlabel.rs-st.rs-q { background: #fff3c4; color: #b07a00; font-weight: 700; }',
    '.nlabel.rs-st.rs-glow { background: #ffe066; box-shadow: 0 0 0 4px rgba(255,224,102,.6), 0 0 18px rgba(255,200,60,.8); }',
    '.nlabel.rs-st.rs-her { background: #ffd9e6; color: #a03060; }',
    '.nlabel.rs-st.rs-start { background: #c8f2c0; color: #2f6a2a; box-shadow: 0 0 0 3px rgba(90,180,80,.55); }',
    '.nlabel.rs-tag { font-size: 18px; padding: 2px 8px; border-radius: 12px; background: rgba(255,250,235,.95); color: #5a4630; box-shadow: 0 2px 6px rgba(60,40,20,.25); }',
    '.nlabel.rs-crate { font-size: 22px; padding: 4px 12px; border-radius: 14px; background: rgba(255,255,255,.95); color: #4a3a6a; box-shadow: 0 2px 8px rgba(60,40,90,.3); white-space: nowrap; }',
    '.nlabel.rs-crate.rs-glow { box-shadow: 0 0 0 4px rgba(255,224,102,.7), 0 0 20px rgba(255,200,60,.8); }',
    '.rs-bar { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }',
    '.rs-btn { min-width: 74px; height: 74px; border-radius: 20px; border: 3px solid #c9b6ea; background: #fff; font-size: 34px; cursor: pointer; display: inline-flex;',
    '  align-items: center; justify-content: center; gap: 6px; padding: 0 12px; box-shadow: 0 4px 0 #b9a7d8; font-family: inherit; color: #4a3a6a; }',
    '.rs-btn .rs-lab { font-size: 20px; }',
    '.rs-btn img { width: 56px; height: 56px; }',
    '.rs-btn.rs-done { background: #fff6d6; border-color: #e7c35a; box-shadow: 0 4px 0 #c9962b; font-size: 26px; }',
    '.rs-btn.rs-sel { background: #ffe9a8; border-color: #e7b22a; }',
    '.rs-btn.rs-glow { animation: rsGlow 1s ease-in-out infinite; }',
    '.rs-btn.rs-reading { transform: scale(1.12); background: #eef6ff; border-color: #7fb2ff; }',
    '.rs-btn.rs-off { opacity: .45; }',
    '.rs-btn.rs-shake { animation: rsShake .4s; }',
    '.rs-locked .rs-btn { opacity: .6; pointer-events: none; }',
    '@keyframes rsGlow { 50% { box-shadow: 0 0 0 6px rgba(255,224,102,.7), 0 0 24px rgba(255,200,60,.9); } }',
    '@keyframes rsShake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }',
  ].join('\n');
  document.head.appendChild(st);
}

/* =====================================================================================================================
   2. the format kit (thin layer over the stage S and the f_num board)
   ===================================================================================================================== */
const KINDS = { F52: ['gaps', 'land', 'where', 'wrongst'], F58: ['beads', 'unit', 'error', 'abstract'], F59: ['grow'], F71: ['odd', 'riddle', 'tapall', 'sort', 'lineup'], F74: ['sudoku'] };
// the item this format can run: the engine's item, or a fresh one from F.REASON (debug / demo items / another format's shape)
function ensure(item, spec) {
  const kinds = KINDS[spec.id] || [];
  if (item.params && kinds.includes(item.params.kind)) return item;
  const strands = spec.strands || {};
  let st = strands[item.strand] ? item.strand : Object.keys(strands)[0];
  const rr = Array.isArray(strands[st][0]) ? strands[st] : [strands[st]];          // [a, b] or [[a, b], [c, d]]
  const okR = x => rr.some(([a, b]) => x >= a && x <= (b == null ? a : b));
  let rung = item.rung && okR(item.rung) ? item.rung : rr[0][0];
  const sup = item.sup == null ? 1 : item.sup;
  const rng = U.rng((U.hashStr(String(item.id || 'x') + ':' + spec.id) ^ (F.T.now * 1000 | 0)) >>> 0);
  let it = null;
  for (let t = 0; t < 6 && !it; t++) { try { it = F.REASON && F.REASON.gen(st, rung, sup, rng, { format: spec.id }); } catch (e) { console.error('[f_reason] gen', e); } if (it && !kinds.includes(it.params.kind)) it = null; }
  if (!it) return item;
  const keep = { id: item.id, format: item.format, kind: item.kind, golden: item.golden };
  for (const k in item) if (!(k in keep)) delete item[k];
  Object.assign(item, it, keep);
  return item;
}
function Kit(item, S, spec) {
  css();
  const K = { item, S, spec, p: item.params || {}, sup: item.sup == null ? 1 : item.sup, offs: [] };
  K.rng = U.rng((U.hashStr(String(item.id || '') + ':' + spec.id) ^ (F.T.now * 1000 | 0)) >>> 0);
  K.say = say;
  K.prompt = (id, slots) => F.TPL.has(id) ? S.prompt(id, slots || {}, { voice: '' }) : Promise.resolve();
  K.board = o => {
    const B = F.NUM.Board(Object.assign({ avoid: S.has3D && S.base ? S.base.clone().add(new V3(0, 1.3, 0)) : null }, o)); K.B = B;
    S.widgets.push({ kind: 'rboard', dead: false, lock() {}, destroy() { B.dispose(); K.end(); } });
    RS.cur = { format: spec.id, item, B, K };
    return B;
  };
  K.piece = (model, opts, size, o) => F.NUM.piece(model, opts, size, o);
  K.meta = (mode, g) => { if (item.g == null || !isFinite(item.g)) item.g = g; if (!item.mode) item.mode = mode; if (!item.think) item.think = spec.think; };
  K.arm = o => S.arm(o);
  K.use = w => S.use(w);
  // the think-gate (WP-K): before it opens a tap is an early tap (no try)
  K.gateOk = () => { if (S.gateOpen && !S.gateOpen()) { if (S.submitEarly) S.submitEarly(); return false; } return true; };
  K.widget = o => {
    const w = { kind: o.kind || 'rboard', values: o.values || [], dead: false, locked: false };
    w.feed = v => o.feed(v);
    w.mark = (v, cls) => { try { o.mark && o.mark(v, cls); } catch (e) { console.error(e); } };
    w.solution = v => { try { o.solution && o.solution(v); } catch (e) { console.error(e); } };
    w.lock = on => { w.locked = !!on; if (K.B) K.B.locked = !!on; if (K.bar) K.bar.classList.toggle('rs-locked', !!on); if (o.lock) o.lock(on); };
    w.destroy = () => { w.dead = true; if (o.destroy) o.destroy(); };
    if (o.rightValue) w.rightValue = o.rightValue;
    if (o.wrongValue) w.wrongValue = o.wrongValue;
    RS.cur && (RS.cur.w = w);
    return K.use(w);
  };
  K.submit = v => S.submit(v, S.active);
  // natural audit D12 sweep («tapping around while a task runs»): a board thing answers only while ITS step is the active one – in a
  // two-step task (the odd one → its reason card, the wrong stone → its number, the wrong bead → the right bead) a tap on the board
  // during step 2 used to be judged as a wrong step-2 answer. Now it only gives a little hop.
  K.mine = w => S.active === w && !w.dead;
  // look-back (SYNTHESIS §5.G): the kit's S.lookBack when there, else played at the start of our hint
  K.lookBack = fn => { K._lb = fn; if (S.lookBack) S.lookBack(fn); };
  // v5 WP-R2 (playtest2 «hints»): after-error hints (with her answer acted out); before any attempt the stage's S.preHint (WP-K2) or
  // «Se godt på hver av dem» + the question again – never a look-back of an answer she has not given
  K.hint = fn => { S.hint = async (tag, v) => { try {
    if (S.clearHint) S.clearHint();
    if (v == null && !(S.stepTries > 0)) {
      if (typeof S.preHint === 'function' && !S._rsPre) { S._rsPre = true; try { await S.preHint('hint'); } finally { S._rsPre = false; } }
      else { if (F.TPL.has('kit_h_look')) await S.say('kit_h_look', {}, ''); if (S.replayPrompt) await S.replayPrompt(); }
      return;
    }
    if (v == null && Array.isArray(S.chosen) && S.chosen.length) v = S.chosen[S.chosen.length - 1];
    if (K._lb && !S.lookBack) await K._lb(v); if (!S.solved && !S.ended) await fn(tag, v); } catch (e) { console.error('[f_reason hint]', e); } }; };
  K.sol = fn => { S._solFn = async () => { try { await fn(); } catch (e) { console.error('[f_reason solution]', e); } }; };
  // a row of big buttons in the tray (palette chips, reason cards, Ferdig)
  K.barEl = () => { if (!K.bar) { K.bar = F.UI.el('div', 'rs-bar'); S.tray().appendChild(K.bar); if (F.UI._trayUpd) F.UI._trayUpd(); } return K.bar; };
  K.button = (html, fn, cls) => {
    const b = F.UI.el('button', 'rs-btn ' + (cls || '')); b.innerHTML = html;
    b.addEventListener('click', e => { e.stopPropagation(); if (S.locked || (S.active && S.active.locked)) return; if (!K.gateOk()) return; F.sfx.click(); fn(b); });
    K.barEl().appendChild(b); return b;
  };
  K.clearBar = () => { if (K.bar) { K.bar.innerHTML = ''; } };
  K.faceHtml = (tok, surface) => {
    const m = tokModel(surface, tok);
    try { if (F.Thumb && F.Thumb.img) { const img = F.Thumb.img(m.model, m.opts || {}, { size: 112 }); if (img) { const s = document.createElement('span'); s.appendChild(img); return s.innerHTML; } } } catch (e) { /* emoji */ }
    return EMO[tok] || tok;
  };
  K.done = fn => K.button('✓ <span class="rs-lab">' + F.UI.caseText('ferdig') + '</span>', fn, 'rs-done');
  K.shake = b => { if (!b) return; b.classList.remove('rs-shake'); void b.offsetWidth; b.classList.add('rs-shake'); };
  K.keypad = (answer, o) => {
    const L = String(Math.abs(answer)).length, show = K.sup < 2;
    item.mode = item.mode || 'keypad';
    return S.keypad(Object.assign(show ? { answer, len: L, showLen: true, auto: true, slots: 3 } : { answer, len: 3, slots: 3, showLen: false, auto: false }, o || {}));
  };
  // follow-up instruction lines after the prompt: still «the prompt» for the protocol (a tap now is an early tap, nothing judged)
  K.talk = async lines => { S.speaking = true; try { for (const l of lines) { if (S.ended) break; await K.say(l[0], l[1]); } } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); } };
  K.end = () => { K.offs.splice(0).forEach(f => { try { f(); } catch (e) {} }); disposeOwn(); if (RS.cur && RS.cur.K === K) RS.cur = null; };
  return K;
}
// own meshes (rods, rings, reeds, paths): geometry + material are disposed when the task ends
const OWN = [];
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); OWN.push(geo, mat); return m; }
function disposeOwn() { OWN.splice(0).forEach(x => { try { x.dispose(); } catch (e) {} }); }
// small motions on board objects
function hopTo(obj, to, ms, h) { const a = obj.position.clone(), b = to.clone(); return tween(ms || 360, k => { const e = ease(k); obj.position.lerpVectors(a, b, e); obj.position.y += Math.sin(k * Math.PI) * (h != null ? h : 0.5); }); }
function popIn(obj, ms) { const s = obj.scale.clone(); obj.scale.setScalar(0.01); return tween(ms || 260, k => obj.scale.copy(s).multiplyScalar(Math.max(0.01, ease(k) * (1 + Math.sin(k * Math.PI) * 0.2 * (1 - k))))); }
function bounce(obj, amp) { const y0 = obj.position.y; return tween(420, k => { obj.position.y = y0 + Math.sin(k * Math.PI) * (amp || 0.3); }).then(() => { obj.position.y = y0; }); }
function shake(obj) { const x0 = obj.position.x; return tween(420, k => { obj.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.07 * (1 - k); }).then(() => { obj.position.x = x0; }); }
function glow(obj, on, hex) {
  obj.traverse(m => {
    if (!m.isMesh || !m.material) return;
    if (on) { if (!m.userData.rsMat) { m.userData.rsMat = m.material; const c = m.material.clone(); if (c.emissive) { c.emissive = new THREE.Color(hex || 0xfff0a0); c.emissiveIntensity = 0.38; } m.material = c; } }
    else if (m.userData.rsMat) { m.material.dispose && m.material.dispose(); m.material = m.userData.rsMat; m.userData.rsMat = null; }
  });
}
function ghost(obj, op) { obj.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = op != null ? op : 0.45; m.material.depthWrite = false; } }); return obj; }
function splash(B, obj) { try { const p = new V3(); obj.getWorldPosition(p); F.FX.burst(p, { kind: B && B.rsStreet ? 'star' : 'bubble', n: 16 }); } catch (e) {} try { (B && B.rsStreet) ? F.sfx.boing && F.sfx.boing() : F.sfx.splash ? F.sfx.splash() : F.sfx.bad(); } catch (e) {} }
function sparkle(obj) { try { const p = new V3(); obj.getWorldPosition(p); p.y += 0.3; F.FX.burst(p, { kind: 'star', n: 18 }); F.sfx.sparkle(); } catch (e) {} }

/* =====================================================================================================================
   3. F52 Froskesteinene 2.0 (MØNSTER Mø3–Mø4): a pond with a stone path; the frog jumps HER answer
   ===================================================================================================================== */
// stone layout: rows of ≤ 10, snake order (row 2 runs back), like a path through the pond
function stoneLayout(n, perRow, gapX, gapZ) {
  const rows = Math.ceil(n / perRow), out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow, cc = r % 2 ? perRow - 1 - c : c;
    out.push(new V3((cc - (perRow - 1) / 2) * gapX + (r % 2 ? 0.12 : -0.12), 0, (r - (rows - 1) / 2) * gapZ + ((cc % 2) ? 0.08 : -0.08)));
  }
  return out;
}
// two surfaces (SYNTHESIS §4.4 variation): the frog on the pond (mostly – the parent's favourite) and the rabbit on Tallveien
// v5d WP-R3 (WP-E2 request): params.hopper = the animal met (F.LEARN.themeOf: frosk, krystallfrosk, kanin, blomsterkanin, hare, snøhare,
// gresshoppe) hops itself – its own model, its own name in the lines (SETS.RS_HOPPER), and a home that fits it: frogs on the pond, the
// rabbit on Tallveien, a meadow-rabbit / hare / grasshopper on stepping stones in the grass (dry boards say «Bom!», never «Plask!»)
const HOPPERS = {
  frosk: { d: 'Frosken', board: 'pond', stone: 'fx_n_stein', model: 'frosk' },
  krystallfrosk: { d: 'Frosken', board: 'pond', stone: 'fx_n_stein', model: 'krystallfrosk', alt: 'frosk' },
  kanin: { d: 'Kaninen', board: 'street', stone: 'fx_r_plate', model: 'kanin', k: 1.25 },
  blomsterkanin: { d: 'Kaninen', board: 'grass', stone: 'fx_n_stein', model: 'blomsterkanin', alt: 'kanin', k: 1.25 },
  hare: { d: 'Haren', board: 'grass', stone: 'fx_n_stein', model: 'hare', alt: 'kanin', k: 1.25 },
  'snøhare': { d: 'Haren', board: 'grass', stone: 'fx_n_stein', model: 'hare', opts: { c: 'snow' }, alt: 'kanin', k: 1.25 },
  gresshoppe: { d: 'Gresshoppa', board: 'grass', stone: 'fx_n_stein', model: 'gresshoppe', alt: 'frosk', k: 1.1 },
};
// a named hopper is used only when its name has clips (SETS.RS_HOPPER) and a model exists; else the frog (or the rabbit, 25 %)
// (a new name only once its clips exist – until the lead regenerates audio a hare hops as the rabbit, never with a silent line)
const clipOk = t => { try { return !window.SPEECH || !F.Speech || !F.Speech.has || F.Speech.has(t, ''); } catch (e) { return true; } };
const hopperOk = h => { const H = HOPPERS[h]; if (!H) return false; const names = (F.SETS && F.SETS.RS_HOPPER) || ['Frosken', 'Kaninen'];
  return names.includes(H.d) && clipOk(H.d + ' sitter her.') && clipOk(H.d + ' hopper 2 om gangen.') && (F.VOX.has(H.model) || F.VOX.has(H.alt || '')); };
// a theme hopper whose name has no clip yet: the nearest known hopper (hare / snøhare / blomsterkanin → the rabbit, gresshoppe → the frog)
const HOP_ALT = { hare: 'kanin', 'snøhare': 'kanin', blomsterkanin: 'kanin', gresshoppe: 'frosk', krystallfrosk: 'frosk' };
function hopperOf(K) {
  const it = K.item;
  if (!it.params.hopper) { const th = K.S && K.S.ctx && K.S.ctx.theme; const sp = th && (typeof th === 'string' ? th : th.hopper || th.sp); if (sp && hopperOk(sp)) it.params.hopper = sp; }
  if (it.params.hopper && !hopperOk(it.params.hopper) && HOP_ALT[it.params.hopper] && hopperOk(HOP_ALT[it.params.hopper])) it.params.hopper = HOP_ALT[it.params.hopper];
  if (!it.params.hopper || !hopperOk(it.params.hopper)) it.params.hopper = (K.rng() < 0.75 || !F.VOX.has('kanin')) ? 'frosk' : 'kanin';
  return HOPPERS[it.params.hopper];
}
function frogPond(K, vals, o) {
  o = o || {};
  const H = hopperOf(K);
  const n = vals.length, perRow = n > 10 ? 10 : n, rows = Math.ceil(n / perRow);
  const gapX = n > 10 ? 0.72 : 0.95, gapZ = 1.05;
  const B = K.board({ style: H.board, w: perRow * gapX + 1.3, d: rows * gapZ + 1.0, h: 0.8, tilt: rows > 1 ? 0.95 : 0.85, scale: n > 10 ? 0.95 : 0.9 });
  const pos = stoneLayout(n, perRow, gapX, gapZ);
  B.rsStreet = H.board !== 'pond';                       // dry ground: star burst + «Bom!» (never a splash)
  // pond life (decoration, not tappable): lily pads and reeds along the banks – the frog's home
  const deco = H.board === 'pond' ? [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0.5, 1]] : [];
  deco.forEach(([sx, sz], k) => {
    const x = sx * (perRow * gapX / 2 + 0.25) + (k % 2 ? 0.2 : -0.2), z = sz * (rows * gapZ / 2 + 0.2);
    const pad = K.piece('fx_r_merke', {}, 0.42, { hk: 1 }); B.add(pad, x, z); pad.position.y = -0.02; pad.rotation.y = k * 1.3;
  });
  (H.board === 'pond' ? [[-1, 0], [1, 0]] : []).forEach(([sx]) => { for (let k = 0; k < 3; k++) { const reed = mesh(new THREE.BoxGeometry(0.05, 0.5 + k * 0.12, 0.05), new THREE.MeshLambertMaterial({ color: k % 2 ? 0x5aa64a : 0x77c35c }));
    reed.position.set(sx * (perRow * gapX / 2 + 0.42) + k * 0.07 * sx, 0.25, -0.2 + k * 0.18); B.top.add(reed); } });
  const stones = vals.map((v, i) => { const s = H.stone === 'fx_r_plate' ? K.piece('fx_r_plate', { c: 'stone2', c2: (i % 2 ? 'cream2' : 'pathStone') }, n > 10 ? 0.6 : 0.78, { hk: 0.3 }) : K.piece('fx_n_stein', {}, n > 10 ? 0.62 : 0.8, { hk: 2 });
    B.add(s, pos[i].x, pos[i].z); s.userData.v = v; s.userData.i = i; return s; });
  // dense rows: the plaque sits on the stone and the frog / flower marker stand behind it (both stay visible)
  const dense = n > 10;
  const labels = stones.map((s, i) => B.label(s, o.label ? o.label(i) : String(vals[i]), { cls: 'num rs-st', dy: dense ? 0.0 : 0.28 }));
  const hm = F.VOX.has(H.model) ? H.model : F.VOX.has(H.alt || '') ? H.alt : 'fx_n_fe';
  const frog = K.piece(hm, hm === H.model ? (H.opts || {}) : {}, (n > 10 ? 0.62 : 0.72) * (H.k || 1), { hk: 1 });
  const top = i => stones[i].position.clone().add(new V3(0, 0.16, dense ? -0.26 : 0));
  B.add(frog, 0, 0); frog.position.copy(top(o.start || 0)); frog.rotation.y = Math.PI;
  const P = { B, stones, labels, frog, vals, pos, at: o.start || 0, markers: {} };
  P.face = i => { const d = stones[i].position.clone().sub(frog.position); if (d.lengthSq() > 1e-4) frog.rotation.y = Math.atan2(d.x, d.z); };
  P.hop = async (i, ms) => { P.face(i); await hopTo(frog, top(i), ms || 330, 0.45); P.at = i; try { F.sfx.pop(); } catch (e) {} };
  P.home = async i => { frog.position.copy(top(i)); P.at = i; };
  // a little flower marker on a chosen stone (her selection; never right/wrong before Ferdig)
  P.mark = (i, on, gold) => {
    if (on && !P.markers[i]) { const m = K.piece('fx_r_merke', {}, dense ? 0.4 : 0.46, { hk: 1 }); m.position.copy(top(i)).add(new V3(dense ? 0.16 : -0.22, 0.02, dense ? 0.02 : 0.14)); B.top.add(m); popIn(m); P.markers[i] = m; }
    if (!on && P.markers[i]) { B.top.remove(P.markers[i]); delete P.markers[i]; }
    if (P.markers[i]) glow(P.markers[i], !!gold, 0xffe066);
  };
  P.glowStone = (i, on) => { labels[i].cls('rs-glow', !!on); glow(stones[i], !!on); };
  return P;
}
F.Task.def('F52', {
  name: 'Froskesteinene', strands: { 'MØNSTER': [3, 4] }, places: ['pond', 'tallveien', 'any'], family: 'monster', think: 'MØNSTER', portable: true,
  tpl: ['rs_f52_sitter', 'rs_f52_hopper', 'rs_f52_alle', 'rs_f52_mangler', 'rs_f52_feil'],
  // v5 WP-R2 (wave-1 REQUEST WP-E): a production format declares its mode + a numeric g (the item's own g still wins in the stage)
  mode: 'keypad', g: 0.01,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this), p = K.p;
    if (p.kind === 'land') return f52land(K, item, S);
    if (p.kind === 'wrongst') return f52wrong(K, item, S);
    if (p.kind === 'where') return f52where(K, item, S);
    return f52gaps(K, item, S);
  },
});
async function f52land(K, item, S) {
  const p = K.p, vals = []; for (let v = p.lo; v <= p.hi; v++) vals.push(v);
  const si = vals.indexOf(p.start), k = Math.abs(p.step);
  const P = frogPond(K, vals, { start: si });
  P.labels[si].cls('rs-start', true);
  K.meta('subset', item.g);
  const sel = new Set();
  const rightV = item.target.slice();
  const w = K.widget({ kind: 'stones-subset', values: vals,
    feed: v => { sel.clear(); Object.keys(P.markers).forEach(i => P.mark(+i, false)); (v || []).forEach(x => { const i = vals.indexOf(+x); if (i >= 0 && i !== si) { sel.add(i); P.mark(i, true); } }); return K.submit(value()); },
    solution: () => { rightV.forEach(x => P.glowStone(vals.indexOf(x), true)); done.classList.add('rs-glow'); },
    rightValue: () => rightV.slice(),
    wrongValue: () => rightV.slice(0, -1).concat([rightV[rightV.length - 1] + (p.step > 0 ? 1 : -1)]).filter(x => x >= p.lo && x <= p.hi).sort((a, b) => a - b) });
  const value = () => [...sel].map(i => vals[i]).sort((a, b) => a - b);
  P.stones.forEach((s, i) => P.B.pick(s, () => { if (w.locked || S.solved || i === si || !K.gateOk()) return; if (sel.has(i)) { sel.delete(i); P.mark(i, false); } else { sel.add(i); P.mark(i, true); } }));
  const done = K.done(b => { if (!sel.size) { K.shake(b); return; } K.submit(value()); });
  // look-back: the frog jumps HER stones in order; a jump of the wrong length ends in the water (plask) and it swims home
  // (bounded to ≈ 3.5 s: the stage starts the hint after 4 s)
  K.lookBack(async v => {
    const mine = (v || value()).map(x => vals.indexOf(+x)).filter(i => i >= 0 && i !== si).sort((a, b) => p.step > 0 ? a - b : b - a);
    let cur = si, ok = true, n = 0;
    for (const i of mine) {
      if (S.solved || S.ended) return;
      const d = (vals[i] - vals[cur]) * Math.sign(p.step);
      await P.hop(i, 300);
      if (d !== k) { splash(P.B, P.stones[i]); await K.say(P.B.rsStreet ? 'rs_f52_bom' : 'rs_f52_plask'); ok = false; break; }
      cur = i; if (++n >= 7) break;
    }
    if (ok && mine.length < rightV.length) await K.say('rs_f52_glemt');
    await P.home(si);
  });
  // hint (no answer): «Tell k steiner for hvert hopp» – the frog shows the FIRST jump, counting the stones under it
  K.hint(async () => {
    await K.say('rs_f52_hopp_tell', { k });
    const first = si + Math.sign(p.step) * k;
    // count the stones under the first jump (aloud up to 5, silently glowing for 10)
    for (let j = 1; j <= k && !S.solved; j++) { const i = si + Math.sign(p.step) * j; if (i < 0 || i >= vals.length) break; P.glowStone(i, true); if (k <= 5) await sayN(j); else await sleep(220); P.glowStone(i, false); }
    if (!S.solved && first >= 0 && first < vals.length) { await P.hop(first, 380); await sleep(400); await P.home(si); }
  });
  K.sol(async () => { w.solution(); await K.say('kit_sol_tapall'); });
  bounce(P.frog, 0.35);
  S.replay = async () => { await K.say(p.step > 0 ? 'rs_f52_hopper' : 'rs_f52_bakover', { d: hopperOf(K).d, k }); await K.say('rs_f52_alle'); };
  await K.prompt('rs_f52_sitter', { d: hopperOf(K).d });
  await K.talk([[p.step > 0 ? 'rs_f52_hopper' : 'rs_f52_bakover', { d: hopperOf(K).d, k }], ['rs_f52_alle']].concat(K.sup === 0 ? [['rs_f52_ferdig']] : []));
  const pr = K.arm({ answer: rightV, check: v => setEq(v, rightV) });
  await pr;
  // payoff: the frog jumps the whole path
  for (const x of p.landings) { if (S.ended) break; await P.hop(vals.indexOf(x), 300); P.mark(vals.indexOf(x), true, true); }
  sparkle(P.frog); await K.say('rs_f52_ok');
  return S.result();
}
// «Hvor lander den?»: k per jump, j jumps → tap one stone; the frog then jumps it out
async function f52where(K, item, S) {
  const p = K.p, vals = []; for (let v = p.lo; v <= p.hi; v++) vals.push(v);
  const si = vals.indexOf(p.start), k = Math.abs(p.step), dir = Math.sign(p.step);
  const P = frogPond(K, vals, { start: si });
  P.labels[si].cls('rs-start', true);
  K.meta('scene', item.g);
  const w = K.widget({ kind: 'stones-one', values: vals,
    feed: v => K.submit(+v), solution: v => { P.glowStone(vals.indexOf(+v), true); },
    rightValue: () => p.land, wrongValue: () => { const d = (item.distractors || [])[0]; return d ? d.v : p.land + dir; } });
  P.stones.forEach((st, i) => P.B.pick(st, () => { if (w.locked || S.solved || i === si || !K.gateOk()) return; bounce(st, 0.15); K.submit(vals[i]); }));
  // look-back: the frog jumps k at a time towards HER stone, counting the jumps – it lands on her stone after the wrong number of
  // jumps (or plops into the water next to it)
  K.lookBack(async v => {
    const tgt = vals.indexOf(+v); if (tgt < 0) return;
    P.labels[tgt].cls('rs-her', true);
    let cur = si, m = 0;
    while (!S.solved && !S.ended && m < 7) {
      const nx = cur + dir * k; if (nx < 0 || nx >= vals.length) break;
      if ((tgt - cur) * dir < k) break;
      await P.hop(nx, 300); m++; cur = nx; await sayN(m);
      if (cur === tgt) break;
    }
    if (cur !== tgt) { splash(P.B, P.stones[tgt]); await K.say(P.B.rsStreet ? 'rs_f52_bom' : 'rs_f52_plask'); }
    P.labels[tgt].cls('rs-her', false); await P.home(si);
  });
  K.hint(async () => {
    await K.say('rs_f52_hopp_tell', { k });
    for (let j = 1; j <= k && !S.solved; j++) { const i = si + dir * j; if (i < 0 || i >= vals.length) break; P.glowStone(i, true); if (k <= 5) await sayN(j); else await sleep(220); P.glowStone(i, false); }
    const first = si + dir * k; if (!S.solved && first >= 0 && first < vals.length) { await P.hop(first, 380); await sleep(300); await P.home(si); }
    await K.say('rs_f52_ganger', { j: p.jumps });
  });
  K.sol(async () => { w.solution(p.land); await K.say('kit_sol_stone'); });
  S.replay = async () => { await K.say(p.step > 0 ? 'rs_f52_hopper' : 'rs_f52_bakover', { d: hopperOf(K).d, k }); await K.say('rs_f52_ganger', { j: p.jumps }); await K.say('rs_f52_hvor'); };
  bounce(P.frog, 0.35);
  await K.prompt('rs_f52_sitter', { d: hopperOf(K).d });
  await K.talk([[p.step > 0 ? 'rs_f52_hopper' : 'rs_f52_bakover', { d: hopperOf(K).d, k }], ['rs_f52_ganger', { j: p.jumps }], ['rs_f52_hvor']]);
  await K.arm({ answer: p.land });
  // payoff: the jumps, counted
  for (let m = 1; m <= p.jumps && !S.ended; m++) { await P.hop(si + dir * k * m, 330); sayN(m); }
  sparkle(P.frog); await K.say('rs_f52_ok');
  return S.result();
}
async function f52wrong(K, item, S) {
  const p = K.p, n = p.seq.length;
  const P = frogPond(K, p.seq, { start: 0 });
  K.meta(p.twoStep ? 'twostep' : 'scene', item.g);
  const w = K.widget({ kind: 'stones-one', values: p.seq.map((_, i) => i),
    feed: i => K.submit(+i), solution: i => { P.glowStone(+i, true); },
    rightValue: () => p.wrong, wrongValue: () => (p.wrong + 1) % n });
  P.stones.forEach((s, i) => P.B.pick(s, () => { if (w.locked || S.solved) return; if (!K.mine(w)) { bounce(s, 0.1); return; } if (!K.gateOk()) return; F.FX.pop && F.FX.pop(s); K.submit(i); }));
  // look-back: the frog hops along to her stone – every jump there is the same size, so that stone fits («den stemmer»)
  K.lookBack(async v => {
    const i = +v; if (!(i >= 0)) return;
    P.glowStone(i, true);
    for (let j = 1; j <= i && !S.solved; j++) await P.hop(j, 300);
    await shake(P.stones[i]); P.glowStone(i, false); await sleep(200); await P.home(0);
  });
  K.hint(async () => {
    await K.say('rs_f52_nabo');
    // the step between the first two stones (they are never the wrong one) as a +k plaque
    const a = P.stones[0], b = P.stones[1], mid = new THREE.Object3D(); mid.position.copy(a.position).lerp(b.position, 0.5).add(new V3(0, 0.1, -0.35)); P.B.top.add(mid);
    const L = P.B.label(mid, (p.step > 0 ? '+' : '−') + Math.abs(p.step), { cls: 'num rs-tag', dy: 0.1 });
    P.glowStone(0, true); P.glowStone(1, true); await sleep(1800); P.glowStone(0, false); P.glowStone(1, false);
    K.offs.push(() => L.remove());
  });
  K.sol(async () => { w.solution(p.wrong); await K.say('core_sol_chip'); });
  // two rapid guesses (R) → the production twin: after the tap she must also type the right number
  S.onTwin = () => { if (!p.twoStep) { p.twoStep = true; item.g = +(item.g * 0.01).toFixed(5); item.mode = 'twostep'; } };
  S.replay = () => K.say('rs_f52_feil');
  await K.prompt('rs_f52_feil');
  await K.arm({ answer: p.wrong });
  P.labels[p.wrong].cls('rs-q', true).set('?');
  if (p.twoStep) {
    K.lookBack(null);
    // v5 WP-R2 (playtest2 «hints»): phase 2 has its own replay / help – never the «find the wrong stone» line of phase 1
    S.replay = () => K.say('rs_f52_fiks');
    if (typeof S.phase === 'function') S.phase('fix', { replay: () => K.say('rs_f52_fiks') });
    await K.talk([['rs_f52_fiks']]);
    S.hint = async () => { await K.say('rs_f52_nabo'); P.glowStone(Math.max(0, p.wrong - 1), true); await sleep(1400); P.glowStone(Math.max(0, p.wrong - 1), false); };
    S._solFn = null;
    await K.keypad(p.fix);
  }
  P.labels[p.wrong].cls('rs-q', false).set(String(p.fix));
  for (let j = 1; j < n && !S.ended; j++) await P.hop(j, 280);
  sparkle(P.frog); await K.say('rs_f52_ok');
  return S.result();
}
async function f52gaps(K, item, S) {
  const p = K.p, n = p.seq.length;
  const P = frogPond(K, p.full, { start: 0, label: i => p.seq[i] == null ? '?' : String(p.seq[i]) });
  p.blanks.forEach(i => P.labels[i].cls('rs-q', true));
  K.meta('keypad', item.g);
  S.replay = () => K.say('rs_f52_mangler');
  await K.prompt('rs_f52_mangler');
  for (let k = 0; k < p.blanks.length; k++) {
    const bi = p.blanks[k], ans = p.full[bi];
    P.glowStone(bi, true);
    K.lookBack(async v => {
      // her number on the stone, the frog tries the jump from the stone before: wrong size → plask, back home
      const prev = bi - 1; P.labels[bi].set(String(v)).cls('rs-her', true);
      if (prev >= 0) { await P.home(prev); await P.hop(bi, 420); }
      splash(P.B, P.stones[bi]); await K.say(P.B.rsStreet ? 'rs_f52_bom' : 'rs_f52_plask');
      P.labels[bi].set('?').cls('rs-her', false); await P.home(0);
    });
    K.hint(async () => {
      await K.say('rs_f52_nabo');
      let a = -1; for (let i = 0; i + 1 < n; i++) if (p.seq[i] != null && p.seq[i + 1] != null) { a = i; break; }
      if (a < 0) return;
      const mid = new THREE.Object3D(); mid.position.copy(P.stones[a].position).lerp(P.stones[a + 1].position, 0.5).add(new V3(0, 0.1, -0.35)); P.B.top.add(mid);
      const L = P.B.label(mid, (p.step > 0 ? '+' : '−') + Math.abs(p.step), { cls: 'num rs-tag', dy: 0.1 }); K.offs.push(() => L.remove());
      P.glowStone(a, true); P.glowStone(a + 1, true); await sleep(1600); P.glowStone(a, false); P.glowStone(a + 1, false); P.glowStone(bi, true);
    });
    K.sol(async () => { P.labels[bi].set(String(ans)).cls('rs-glow', true); await K.say('core_sol_keys'); });
    if (k > 0 || K.sup === 0) await K.talk([['rs_f52_hva_her']]);
    await K.keypad(ans);
    P.glowStone(bi, false); P.labels[bi].set(String(ans)).cls('rs-q', false);
    await P.hop(bi, 320);
  }
  for (let j = P.at + 1; j < n && !S.ended; j++) await P.hop(j, 280);
  sparkle(P.frog); await K.say('rs_f52_ok');
  return S.result();
}

/* =====================================================================================================================
   4. F58 Perlemakeren (MØNSTER Mø1–Mø2): the jeweller's bead string – build the next 3, tap where the core ends, find the wrong
      bead (and fix it), the same pattern with new things (abstraction)
   ===================================================================================================================== */
function beadRow(K, B, toks, surface, o) {
  o = o || {};
  const n = toks.length, gap = o.gap || 0.48, z = o.z || 0, x0 = o.x0 != null ? o.x0 : -(n - 1) / 2 * gap;
  const xs = toks.map((_, i) => x0 + i * gap);
  // the string: thin gold rod
  if (o.string !== false) { const len = (n - 1) * gap + 0.6 + (o.extra || 0) * gap; const rod = mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), new THREE.MeshLambertMaterial({ color: 0xe8c25a }));
    rod.rotation.z = Math.PI / 2; rod.position.set(x0 + len / 2 - 0.3, 0.2, z); B.top.add(rod); }
  const beads = toks.map((t, i) => { if (t == null) return null; const m = tokModel(surface, t); const b = K.piece(m.model, m.opts, m.size, { hk: 1 }); B.add(b, xs[i], z); b.position.y = 0.02; b.userData.tok = t; b.userData.i = i; return b; });
  return { beads, xs, z, gap };
}
F.Task.def('F58', {
  name: 'Perlemakeren', strands: { 'MØNSTER': [1, 2] }, places: ['stall', 'market', 'any'], family: 'monster', think: 'MØNSTER', portable: true,
  tpl: ['rs_f58_neste', 'rs_f58_slutt', 'rs_f58_feil', 'rs_f58_samme'],
  // v5 WP-R2 (wave-1 REQUEST WP-E): a production format declares its mode + a numeric g (the item's own g still wins in the stage)
  mode: 'build', g: 0.01,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this), p = K.p;
    if (p.kind === 'unit' || p.kind === 'error') return f58tap(K, item, S);
    return f58build(K, item, S);
  },
});
// build mode (beads: next 3; abstract: the same pattern with new things)
async function f58build(K, item, S) {
  const p = K.p, abs = p.kind === 'abstract';
  const nSlots = abs ? p.len : p.n, gap = 0.5;
  const total = abs ? Math.max(p.shown.length, nSlots) : p.shown.length + nSlots;
  const B = K.board({ style: 'velvet', w: Math.max(4.5, total * gap + 1.4), d: abs ? 2.6 : 1.8, h: 0.9, tilt: 0.85 });
  const x0 = -(total - 1) / 2 * gap;
  const src = beadRow(K, B, p.shown, p.surface, { gap, x0, z: abs ? -0.6 : 0, extra: abs ? 0 : nSlots });
  const sx0 = abs ? -(nSlots - 1) / 2 * gap : x0 + p.shown.length * gap, sz = abs ? 0.6 : 0;
  const surf = abs ? p.surface2 : p.surface;
  if (abs) { const rod = mesh(new THREE.CylinderGeometry(0.025, 0.025, (nSlots - 1) * gap + 0.6, 6), new THREE.MeshLambertMaterial({ color: 0xe8c25a })); rod.rotation.z = Math.PI / 2; rod.position.set(0, 0.2, sz); B.top.add(rod); }
  const slotG = [], placed = new Array(nSlots).fill(null), qLabels = [];
  for (let i = 0; i < nSlots; i++) {
    const g = ghost(K.piece('fx_r_perle', { c: 'white' }, 0.3, { hk: 1 }), 0.35); B.add(g, sx0 + i * gap, sz); g.position.y = 0.06; slotG.push(g);
    qLabels.push(B.label(g, '?', { cls: 'num rs-st rs-q', dy: 0.42 }));
  }
  const putAt = (i, tok) => {
    if (placed[i]) { B.unpick(placed[i]); B.top.remove(placed[i]); placed[i] = null; }
    qLabels[i].show(tok == null);
    if (tok == null) return;
    const m = tokModel(surf, tok); const b = K.piece(m.model, m.opts, m.size, { hk: 1 }); B.add(b, sx0 + i * gap, sz); b.position.y = 0.02; b.userData.tok = tok; placed[i] = b; popIn(b);
    B.pick(b, () => { if (w.locked || S.solved || !K.gateOk()) return; putAt(i, null); });
  };
  const value = () => placed.map(b => b ? b.userData.tok : null);
  const check = abs ? (v => v.every(x => x != null) && sameArr(F.REASON.canon(v), item.target)) : (v => sameArr(v, item.target));
  const right = abs ? item.target.map(k => p.palette[k]) : item.target.slice();
  K.meta('build', item.g);
  const w = K.widget({ kind: 'beads', values: p.palette,
    feed: v => { (v || []).forEach((t, i) => putAt(i, t)); return K.submit(value()); },
    solution: () => { right.forEach((t, i) => { if (placed[i] && placed[i].userData.tok === t) return; const m = tokModel(surf, t); const gb = ghost(K.piece(m.model, m.opts, m.size, { hk: 1 }), 0.4); B.add(gb, sx0 + i * gap, sz); gb.position.y = 0.5; }); },
    rightValue: () => right.slice(), wrongValue: () => abs ? right.map(() => p.palette[0]) : right.slice(0, -1).concat([p.palette.find(t => t !== right[right.length - 1])]) });
  p.palette.forEach(t => K.button(K.faceHtml(t, surf), () => { if (w.locked || S.solved) return; const i = placed.findIndex(x => !x); if (i < 0) { K.shake(K.bar); return; } putAt(i, t); }));
  K.done(b => { if (placed.some(x => !x)) { K.shake(b); return; } K.submit(value()); });
  // look-back: her beads sit beside the pattern; they shake (the pattern does not go on like that)
  K.lookBack(async () => { await K.say('rs_f58_ditt'); for (const b of placed) if (b) { await shake(b); } });
  // hint: the unit lights up, twice («denne biten kommer igjen og igjen») – the structure, not the next beads
  K.hint(async () => {
    await K.say('rs_f58_igjen');
    const L = p.unit.length;
    for (let rep = 0; rep < 2 && !S.solved; rep++) { const bs = src.beads.slice(rep * L, rep * L + L).filter(Boolean); bs.forEach(b => glow(b, true)); await Promise.all(bs.map(b => bounce(b, 0.22))); await sleep(350); bs.forEach(b => glow(b, false)); }
  });
  K.sol(async () => { w.solution(); await K.say('rs_sol_perler'); });
  S.replay = () => K.say(abs ? 'rs_f58_samme' : 'rs_f58_neste');
  await K.prompt(abs ? 'rs_f58_samme' : 'rs_f58_neste');
  await K.arm({ answer: right, check });
  placed.forEach(b => b && glow(b, false));
  for (const b of src.beads.concat(placed)) { if (S.ended) break; if (b) { bounce(b, 0.25); await sleep(90); } }
  sparkle(placed[placed.length - 1] || src.beads[0]); await K.say('rs_f58_ok');
  return S.result();
}
// tap modes (unit: where the core ends; error: the wrong bead, then at s2 the right bead from the palette)
async function f58tap(K, item, S) {
  const p = K.p, n = p.shown.length, gap = 0.48;
  const B = K.board({ style: 'velvet', w: Math.max(4.5, n * gap + 1.2), d: 1.8, h: 0.9, tilt: 0.85 });
  const row = beadRow(K, B, p.shown, p.surface, { gap });
  const L = p.unit.length;
  K.meta(p.kind === 'error' && p.twoStep ? 'twostep' : 'scene', item.g);
  const w = K.widget({ kind: 'beads-tap', values: p.shown.map((_, i) => i),
    feed: i => K.submit(+i), solution: i => { const b = row.beads[+i]; if (b) { glow(b, true, 0xffe066); bounce(b, 0.3); } },
    rightValue: () => item.target, wrongValue: () => (item.target + 1) % n });
  row.beads.forEach((b, i) => B.pick(b, () => { if (w.locked || S.solved) return; if (!K.mine(w)) { bounce(b, 0.12); return; } if (!K.gateOk()) return; bounce(b, 0.2); K.submit(i); }));
  if (p.kind === 'unit') {
    // look-back: her «core» lifts, then the next piece of the same length lifts – they are not the same, so they shake
    K.lookBack(async v => {
      const i = +v; if (!(i >= 0)) return;
      const a = row.beads.slice(0, i + 1), b2 = row.beads.slice(i + 1, 2 * i + 2);
      a.forEach(b => glow(b, true)); await Promise.all(a.map(b => bounce(b, 0.25)));
      b2.forEach(b => glow(b, true, 0xcfe8ff)); await Promise.all(b2.map(b => bounce(b, 0.25)));
      if (!sameArr(a.map(b => b.userData.tok), b2.map(b => b.userData.tok))) await Promise.all(b2.map(b => shake(b)));
      a.concat(b2).forEach(b => glow(b, false));
    });
    K.hint(async () => { await K.say('rs_f58_les'); for (let i = 0; i < Math.min(n, 2 * L + 1) && !S.solved; i++) { glow(row.beads[i], true); await bounce(row.beads[i], 0.2); glow(row.beads[i], false); } });
  } else {
    // look-back: her bead bounces together with the beads in the same place of every other repeat – they match, so it fits
    K.lookBack(async v => {
      const i = +v; if (!(i >= 0)) return;
      const same = row.beads.filter((b, j) => j % L === i % L);
      same.forEach(b => glow(b, true)); await Promise.all(same.map(b => bounce(b, 0.25))); same.forEach(b => glow(b, false));
    });
    K.hint(async () => { await K.say('rs_f58_igjen'); const bs = row.beads.slice(0, L); bs.forEach(b => glow(b, true)); await Promise.all(bs.map(b => bounce(b, 0.25))); await sleep(500); bs.forEach(b => glow(b, false)); });
  }
  K.sol(async () => { w.solution(item.target); await K.say('core_sol_chip'); });
  // two rapid guesses (R) on «find the wrong bead» → the production twin: tap AND rebuild the bead from the palette
  if (p.kind === 'error') S.onTwin = () => { if (!p.twoStep) { p.twoStep = true; item.g = +(item.g / Math.max(2, p.palette.length)).toFixed(5); item.mode = 'twostep'; } };
  const ask = p.kind === 'unit' ? 'rs_f58_slutt' : 'rs_f58_feil';
  S.replay = () => K.say(ask);
  await K.prompt(ask);
  await K.arm({ answer: item.target });
  if (p.kind === 'unit') {
    // payoff: the core lifts and every repeat lifts after it
    for (let r = 0; r * L < n && !S.ended; r++) { const bs = row.beads.slice(r * L, r * L + L); bs.forEach(b => glow(b, true)); await Promise.all(bs.map(b => bounce(b, 0.25))); bs.forEach(b => glow(b, false)); }
  } else {
    const wb = row.beads[p.wrong];
    if (p.twoStep) {
      K.lookBack(null);
      glow(wb, true, 0xffe066);
      // v5 WP-R2: the fix step has its own replay / help (not the «find the wrong bead» question)
      S.replay = () => K.say('rs_f58_fiks');
      if (typeof S.phase === 'function') S.phase('fix', { replay: () => K.say('rs_f58_fiks') });
      await K.talk([['rs_f58_fiks']]);
      const w2 = K.widget({ kind: 'beads-fix', values: p.palette, feed: t => K.submit(t), solution: () => {}, rightValue: () => p.fix, wrongValue: () => p.palette.find(t => t !== p.fix) });
      const btns = p.palette.map(t => K.button(K.faceHtml(t, p.surface), b => { if (w2.locked || S.solved) return; K.submit(t); }));
      K.hint(async () => { await K.say('rs_f58_igjen'); const bs = row.beads.slice(0, L); bs.forEach(b => glow(b, true)); await sleep(1200); bs.forEach(b => glow(b, false)); });
      K.sol(async () => { const i = p.palette.indexOf(p.fix); if (btns[i]) btns[i].classList.add('rs-glow'); await K.say('core_sol_chip'); });
      await K.arm({ answer: p.fix });
    }
    // the wrong bead pops and the right one takes its place
    B.unpick(wb); B.top.remove(wb);
    const m = tokModel(p.surface, p.fix); const nb = K.piece(m.model, m.opts, m.size, { hk: 1 }); B.add(nb, row.xs[p.wrong], row.z); nb.position.y = 0.02; popIn(nb);
  }
  sparkle(row.beads[Math.min(n - 1, L)]); await K.say('rs_f58_ok');
  return S.result();
}

/* =====================================================================================================================
   5. F59 Voksetårnet (MØNSTER Mø5): three terms of a growing cube pattern on plinths; she builds the 4th by tapping cells
   ===================================================================================================================== */
// symmetric variants of a heights grid (w×d): 1-D rows may be mirrored; square bases allow the 8 symmetries
function growVariants(h, w, d, mirror) {
  const at = (g, x, z) => g[z * w + x], out = [h.slice()];
  if (d === 1) { if (mirror) out.push(h.slice().reverse()); return out; }
  if (w !== d) return out;
  const rot = g => { const r = new Array(w * d); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) r[x * w + (w - 1 - z)] = at(g, x, z); return r; };
  const flip = g => { const r = new Array(w * d); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) r[z * w + (w - 1 - x)] = at(g, x, z); return r; };
  let g = h.slice(); for (let k = 0; k < 4; k++) { out.push(g, flip(g)); g = rot(g); }
  return out;
}
function cubeStack(K, B, heights, w, d, cs, x, z, o) {
  o = o || {};
  const grp = new THREE.Group(); grp.position.set(x, 0, z); B.top.add(grp);
  const plate = K.piece('fx_r_plate', { c: 'stone2', c2: o.plate || 'pathStone' }, Math.max(w, d) * cs + 0.12, { hk: 0.2 }); plate.position.y = -0.02; grp.add(plate);
  const cubes = [];
  heights.forEach((hh, i) => { const cx = (i % w - (w - 1) / 2) * cs, cz = (Math.floor(i / w) - (d - 1) / 2) * cs;
    for (let y = 0; y < hh; y++) { const c = K.piece('fx_r_klosse', { c: o.col || 'woodRed', top: o.top || 'coral' }, cs * 0.96, { hk: 1 }); c.position.set(cx, 0.03 + y * cs, cz); grp.add(c); cubes.push(c); } });
  return { grp, cubes };
}
F.Task.def('F59', {
  name: 'Voksetårnet', strands: { 'MØNSTER': [5, 5] }, places: ['mason', 'building', 'any'], family: 'monster', think: 'MØNSTER', portable: true,
  tpl: ['rs_f59_bygg', 'rs_f59_trykk'],
  // v5 WP-R2 (wave-1 REQUEST WP-E): a production format declares its mode + a numeric g (the item's own g still wins in the stage)
  mode: 'build', g: 0.01,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this), p = K.p;
    const [w, d] = p.base, nT = p.terms.length, maxH = p.maxH;
    const cs = Math.min(0.3, 2.0 / Math.max(maxH, 4));
    const span = Math.max(w, d) * cs + 0.55, total = (nT + 1) * span + 0.4;
    const B = K.board({ style: 'wood', w: Math.max(5.6, total + 0.8), d: Math.max(2.2, d * cs + 1.4), h: Math.max(1.2, maxH * cs * 0.9), tilt: d > 1 ? 0.75 : 0.55 });
    const xs = []; for (let k = 0; k <= nT; k++) xs.push(-total / 2 + span * (k + 0.5) + 0.2);
    const stacks = p.terms.map((h, k) => cubeStack(K, B, h, w, d, cs, xs[k], 0, {}));
    stacks.forEach((st, k) => B.label(st.grp, String(k + 1), { cls: 'num rs-tag', dy: -0.05 }));
    // the build plinth: tappable cells (plate tiles); a column grows by tap, at maxH the next tap empties it
    const bg = new THREE.Group(); bg.position.set(xs[nT], 0, 0); B.top.add(bg);
    const nLab = B.label(bg, String(nT + 1), { cls: 'num rs-tag rs-q', dy: -0.05 });
    const heights = new Array(w * d).fill(0), cols = heights.map(() => []), cells = [];
    const hist = [];
    for (let i = 0; i < w * d; i++) {
      const cx = (i % w - (w - 1) / 2) * cs, cz = (Math.floor(i / w) - (d - 1) / 2) * cs;
      const t = K.piece('fx_r_plate', { c: 'lilac', c2: 'lavender' }, cs * 0.94, { hk: 0.2 }); t.position.set(cx, -0.01, cz); bg.add(t); cells.push(t);
      t.userData.i = i; t.userData.cx = cx; t.userData.cz = cz;
      B.pick(t, () => tapCol(i), { min: 26 });
    }
    const setCol = (i, hgt) => {
      while (cols[i].length > hgt) { const c = cols[i].pop(); B.unpick(c); bg.remove(c); }
      while (cols[i].length < hgt) { const y = cols[i].length; const c = K.piece('fx_r_klosse', { c: 'sky', top: 'ice' }, cs * 0.96, { hk: 1 }); c.position.set(cells[i].userData.cx, 0.03 + y * cs, cells[i].userData.cz); bg.add(c); cols[i].push(c); B.pick(c, () => tapCol(i), { min: 22 }); if (y === hgt - 1) popIn(c, 180); }
      heights[i] = hgt;
    };
    function tapCol(i) { if (w0.locked || S.solved || !K.gateOk()) return; hist.push([i, heights[i]]); setCol(i, heights[i] >= maxH ? 0 : heights[i] + 1); try { F.sfx.pling(Math.min(9, heights[i])); } catch (e) {} }
    // (D12 sweep: the shape is matched trimmed to its bounding box – where it stands on the plinth does not matter)
    const variants = growVariants(item.target, w, d, p.mirror).map(v => trimGrid(v, w, d));
    const check = v => Array.isArray(v) && v.length === w * d && variants.includes(trimGrid(v, w, d));
    K.meta('build', item.g);
    const w0 = K.widget({ kind: 'vox', values: [],
      feed: v => { (v || []).forEach((hh, i) => setCol(i, +hh || 0)); return K.submit(heights.slice()); },
      solution: () => { item.target.forEach((hh, i) => { for (let y = 0; y < hh; y++) { const c = ghost(K.piece('fx_r_klosse', { c: 'gold', top: 'butter' }, cs * 0.96, { hk: 1 }), 0.35); c.position.set(cells[i].userData.cx, 0.03 + y * cs, cells[i].userData.cz); bg.add(c); } }); },
      rightValue: () => item.target.slice(), wrongValue: () => { const v = item.target.slice(); const i = v.findIndex(x => x > 0); v[i] = v[i] + 1; return v; } });
    K.button('↶', () => { if (w0.locked || S.solved) return; const h = hist.pop(); if (h) setCol(h[0], h[1]); }, '');
    K.done(b => { if (!heights.some(Boolean)) { K.shake(b); return; } K.submit(heights.slice()); });
    const count = a => a.reduce((s2, x) => s2 + x, 0);
    // look-back: her cubes are counted next to the last term («Det ble …»), then the plinths shake if the shape is off
    K.lookBack(async v => {
      const n = count(v || heights);
      bg.children.forEach(c => glow(c, true, 0xcfe8ff));
      if (n <= 40 && F.TPL.has('num_det_ble')) await F.SAY('num_det_ble', { n }, ''); else await sayN(n);
      bg.children.forEach(c => glow(c, false)); await shake(bg);
    });
    // hint: how much it grows each time – «+k» plaques between the terms (the rule, never the 4th term itself)
    K.hint(async () => {
      await K.say('rs_f59_tell');
      const c = p.counts;
      for (let k = 0; k + 1 < c.length && !S.solved; k++) {
        const a = new THREE.Object3D(); a.position.set((xs[k] + xs[k + 1]) / 2, 0.1, -0.1 - d * cs / 2); B.top.add(a);
        const L = B.label(a, '+' + (c[k + 1] - c[k]), { cls: 'num rs-tag', dy: 0.2 }); K.offs.push(() => L.remove());
        stacks[k + 1].cubes.forEach(cb => glow(cb, true)); await sleep(700); stacks[k + 1].cubes.forEach(cb => glow(cb, false));
      }
    });
    K.sol(async () => { w0.solution(); await K.say('rs_sol_bygg'); });
    S.replay = () => K.say('rs_f59_bygg');
    await K.prompt('rs_f59_bygg');
    if (K.sup === 0) await K.talk([['rs_f59_trykk']]);
    await K.arm({ answer: item.target, check });
    nLab.cls('rs-q', false);
    for (const st of stacks.concat([{ cubes: bg.children.filter(c => !cells.includes(c)) }])) { st.cubes.forEach(c => glow(c, true)); await sleep(260); }
    sparkle(bg); await K.say('rs_f59_ok');
    return S.result();
  },
});

/* =====================================================================================================================
   6. F71 Sorteringskassene (ORD Or1, LOGIKK Lo1, DATA D1): farmyard crates – tap all that belong, the odd one out (+ reason card),
      elimination riddles, sort by a rule and then find a second way
   ===================================================================================================================== */
const ALLE_TXT = { frukt: 'Trykk på all frukten', 'grønnsak': 'Trykk på alle grønnsakene', fugl: 'Trykk på alle fuglene', dyr: 'Trykk på alle dyrene',
  'kjøretøy': 'Trykk på alle kjøretøyene', 'klær': 'Trykk på alle klærne', 'møbler': 'Trykk på alle møblene', leker: 'Trykk på alle lekene',
  musikk: 'Trykk på alt vi kan spille musikk på', 'kjøkken': 'Trykk på alt vi bruker på kjøkkenet', mat: 'Trykk på alt vi kan spise' };
const REASON_TXT = { frukt: 'De andre er frukt', 'grønnsak': 'De andre er grønnsaker', mat: 'De andre er mat', dyr: 'De andre er dyr', fugl: 'De andre er fugler',
  'kjøretøy': 'De andre er kjøretøy', 'klær': 'De andre er klær', 'møbler': 'De andre er møbler', leker: 'De andre er leker', musikk: 'De andre kan vi spille på',
  'kjøkken': 'De andre hører til på kjøkkenet', bein4: 'De andre har fire bein', bein2: 'De andre har to bein', fly: 'De andre kan fly', farm: 'De andre bor på gården',
  sea: 'De andre bor i havet', pels: 'De andre har pels', 'fjær': 'De andre har fjær', hjul: 'De andre har hjul', flyter: 'De andre flyter på vannet',
  'rød': 'De andre er røde', 'blå': 'De andre er blå', gul: 'De andre er gule', 'grønn': 'De andre er grønne',
  partall: 'De andre er partall', oddetall: 'De andre er oddetall', tier: 'De andre er hele tiere', under10: 'De andre er mindre enn ti', likesifre: 'De andre har to like sifre' };
const RULE_TXT = { frukt: 'Etter frukt', 'grønnsak': 'Etter grønnsaker', mat: 'Etter mat', dyr: 'Etter dyr', fugl: 'Etter fugler', 'kjøretøy': 'Etter kjøretøy',
  'klær': 'Etter klær', 'møbler': 'Etter møbler', leker: 'Etter leker', musikk: 'Etter musikk', 'kjøkken': 'Etter kjøkkenting', bein4: 'Etter fire bein',
  bein2: 'Etter to bein', fly: 'Etter om de kan fly', farm: 'Etter om de bor på gården', sea: 'Etter om de bor i havet', pels: 'Etter pels', 'fjær': 'Etter fjær',
  hjul: 'Etter hjul', flyter: 'Etter om de flyter', 'rød': 'Etter farge', 'blå': 'Etter farge', gul: 'Etter farge', 'grønn': 'Etter farge' };
const CLUE_TXT = { bein4: ['Jeg har fire bein', 'Jeg har ikke fire bein'], bein2: ['Jeg har to bein', 'Jeg har ikke to bein'], fly: ['Jeg kan fly', 'Jeg kan ikke fly'],
  farm: ['Jeg bor på gården', 'Jeg bor ikke på gården'], sea: ['Jeg bor i havet', 'Jeg bor ikke i havet'], pels: ['Jeg har pels', 'Jeg har ikke pels'], 'fjær': ['Jeg har fjær', 'Jeg har ikke fjær'] };
const COLNAME = { red: 'rød', blue: 'blå', yellow: 'gul', green: 'grønn' };
const objFull = x => { const o = Object.assign({}, F.REASON.OBJ[x.id] || { id: x.id }); if (x.col) o.col = x.col; return o; };
const featOf = (x, f) => x.num != null ? (F.REASON.NUMF[f] ? F.REASON.NUMF[f](x.num) : null) : F.REASON.FEAT[f](objFull(x));
const cardHtml = c => '<span>' + c.icon + '</span><span class="rs-lab">' + F.UI.caseText(c.label) + '</span>';
// name a thing with its word clip (rw_word, every castable has one) – the hint names what she sees; it never says which belong
const canName = id => { try { return F.TPL.has('rw_word') && F.SETS.get('WORDS').includes(id); } catch (e) { return false; } };
async function nameAll(K, S, Y, objs) { for (let i = 0; i < objs.length && !S.solved && !S.ended; i++) { bounce(Y.pcs[i], 0.25); if (canName(objs[i].id)) await F.SAY('rw_word', { w: objs[i].id }, ''); else await sleep(300); await sleep(120); } }
/* ---- natural audit D12 + its sweep: a true answer is never marked wrong (presentation-side guards; gen_reason.js stays as it is) ----
   1. things whose membership is unclear for a child under the spoken question are swapped for clear ones before the board is built:
      we eat fish and goose («alt vi kan spise»), the kitchen table / stool / cupboard and the food are used in the kitchen («alt vi bruker
      på kjøkkenet»), shoes are «sko» rather than «klær», a canoe / ship / plane is no «kjøretøy» (that word is for driving), pots and
      spoons are a child's first drum, a toy drum / bell is a toy, a teddy bear is an animal to a child, and potatoes are often not
      counted as «grønnsaker» */
const UNCLEAR = {
  mat: o => o.cat === 'dyr',
  'kjøkken': o => ['møbler', 'frukt', 'grønnsak', 'bakst'].includes(o.cat),
  'klær': o => o.id === 'sko',
  'kjøretøy': o => ['båt', 'kano', 'skip', 'ferje', 'fly'].includes(o.id),
  musikk: o => ['gryte', 'skje', 'kanne'].includes(o.id),
  leker: o => ['tromme', 'bjelle'].includes(o.id),
  dyr: o => o.id === 'bamse',
  'grønnsak': o => o.id === 'potet',
};
const unclear = (cat, id) => { const o = F.REASON.OBJ[id]; return !!(o && UNCLEAR[cat] && UNCLEAR[cat](o)); };
// clear stand-ins: members (want true) or non-members (want false) of cat that are not on the board yet
function clearIds(cat, want, have) {
  const FE = F.REASON.FEAT[cat]; if (!FE) return [];
  return Object.keys(F.REASON.OBJ).filter(id => !have.has(id) && F.VOX.has(F.REASON.OBJ[id].model) && FE(F.REASON.OBJ[id]) === want && !unclear(cat, id));
}
// Or1 tap-all: swap the unclear things, then the answer is recomputed from the board as it stands
function tidyTapAll(K, item) {
  const p = K.p, cat = p.cat, FE = F.REASON.FEAT[cat]; if (!FE || !UNCLEAR[cat]) return;
  const have = new Set(p.objs.map(x => x.id));
  p.objs.forEach((x, i) => {
    if (x.num != null || !unclear(cat, x.id)) return;
    const pool = clearIds(cat, FE(objFull(x)) === true, have); if (!pool.length) return;
    const id = pool[Math.floor(K.rng() * pool.length)]; have.delete(x.id); have.add(id);
    p.objs[i] = { id, model: F.REASON.OBJ[id].model };
  });
  const ans = p.objs.map((x, i) => FE(objFull(x)) === true ? i : -1).filter(i => i >= 0);
  if (ans.length) { p.answer = ans; item.target = ans.slice(); item.answer = ans.slice(); }
}
// Lo1 / Or1 odd one out: «the many» must clearly share the category (no canoe among «kjøretøy», no potato among «grønnsaker»); a swap
// is kept only when the odd one is still the ONLY one that is singled out
function tidyOdd(K) {
  const p = K.p, cat = p.cat; if (p.numeric || !UNCLEAR[cat] || !F.REASON.FEAT[cat]) return;
  const have = new Set(p.objs.map(x => x.id));
  p.objs.forEach((x, i) => {
    if (i === p.odd || !unclear(cat, x.id)) return;
    for (const id of U.shuffle(K.rng, clearIds(cat, true, have))) {
      const objs = p.objs.map((y, k) => k === i ? { id, model: F.REASON.OBJ[id].model } : y);
      const os = F.REASON.oddSet(objs.map(objFull));
      if (os.size === 1 && os.has(p.odd)) { have.delete(x.id); have.add(id); p.objs[i] = objs[i]; break; }
    }
  });
}
/* 2. the why-step's cards («Hva er likt for alle de andre?»): a card is right exactly when EVERY other thing has it. A card that is also
      true for the odd one («partall» for 80 10 30 | 34) is true but no reason – it is swapped for an honest false card, and no two cards
      may look the same */
function honestReasons(K) {
  const p = K.p, others = p.objs.map((_, i) => i).filter(i => i !== p.odd);
  const val = (i, f) => { try { return featOf(p.objs[i], f); } catch (e) { return null; } };
  const allOthers = f => others.every(i => val(i, f) === true);
  const known = f => p.objs.every((_, i) => val(i, f) != null);
  const right = f => allOthers(f) && val(p.odd, f) === false;
  const TAB = p.numeric ? F.REASON.NUMCARD : F.REASON.CARD;
  const fuzzy = f => !REASON_TXT[f] || !TAB[f] || others.some(i => val(i, f) == null) || (allOthers(f) && val(p.odd, f) !== false);
  const mk = (c, id) => Object.assign({}, c, { id, ok: right(id), icon: TAB[id][0], label: TAB[id][1] });
  const ids = new Set(p.reasons.map(c => c.id));
  const pool = U.shuffle(K.rng, Object.keys(TAB).filter(f => !ids.has(f) && REASON_TXT[f] && known(f) && !allOthers(f)));
  const out = [], labels = new Set();
  for (const c of p.reasons) {
    let id = c.id;
    if (fuzzy(id) || labels.has(TAB[id] ? TAB[id][1] : id)) { id = pool.find(f => !labels.has(TAB[f][1])); if (!id) continue; pool.splice(pool.indexOf(id), 1); }
    labels.add(TAB[id][1]); out.push(mk(c, id));
  }
  if (out.some(c => c.ok) && out.some(c => !c.ok)) p.reasons = out;
  else p.reasons = p.reasons.map(c => Object.assign({}, c, { ok: right(c.id) || !!c.ok }));
  return p.reasons;
}
/* 3. D1 rule cards: a colour card means «by colour» (whatever two colours are in the crates); two cards with the same rule, or a second
      card that is just as right (birds / feathers, vehicles / clothes) are swapped for an honest false card */
const COL_IDS = ['rød', 'blå', 'gul', 'grønn'];
function honestRuleCards(K, cards, objs, o) {
  const right = o.right, wrongOk = o.wrongOk, prefer = o.prefer || (() => false);
  if (!Array.isArray(cards) || !cards.length) return cards;
  const colsIn = [...new Set(objs.map(o => o.col).filter(Boolean))];
  const colCard = colsIn.length === 2 && objs.every(o => o.col) ? COLNAME[colsIn[0]] : null;
  const norm = id => COL_IDS.includes(id) ? colCard : id;              // a present colour, so partOf / labelsFor work for the picked card
  const key = id => COL_IDS.includes(id) ? 'farge' : id;
  const mk = (c, id) => { const rc = COL_IDS.includes(id) ? ['🎨', 'farge'] : F.REASON.CARD[id]; return Object.assign({}, c, { id, ok: !!right(id), icon: rc[0], label: rc[1] }); };
  const keys0 = new Set(cards.map(c => key(c.id)));
  const pool = U.shuffle(K.rng, Object.keys(F.REASON.CARD).map(norm).filter((id, i, a) => id && a.indexOf(id) === i && !keys0.has(key(id)) && wrongOk(id)));
  // (an honest false card that is another real way to sort makes her think; an empty one («Etter frukt» – no fruit) comes last)
  pool.sort((a, b) => (prefer(b) ? 1 : 0) - (prefer(a) ? 1 : 0));
  const out = [], seen = new Set(); let gotRight = false;
  for (const c of cards) {
    let id = norm(c.id);
    const bad = !id || seen.has(key(id)) || (right(id) && gotRight) || (!right(id) && !wrongOk(id));
    if (bad) { id = pool.find(x => !seen.has(key(x))); if (!id) continue; pool.splice(pool.indexOf(id), 1); }
    seen.add(key(id)); const card = mk(c, id); if (card.ok) gotRight = true; out.push(card);
  }
  return gotRight && out.some(c => !c.ok) ? out : cards;
}
// the partition a rule card stands for (null = unknown for some thing); a colour card means «by colour»
function sortRules(objs) {
  const colsIn = [...new Set(objs.map(o => o.col).filter(Boolean))];
  const rp = id => { if (COL_IDS.includes(id)) return colsIn.length === 2 && objs.every(o => o.col) ? objs.map(o => o.col === colsIn[0] ? 1 : 0) : null;
    const FE = F.REASON.FEAT[id]; if (!FE) return null; const P = F.REASON.partOf(objs, id); return P.some(x => x == null) ? null : P; };
  const realWay = P => { const k = P.filter(Boolean).length; return k >= 2 && k <= P.length - 2; };
  return { colsIn, rp, realWay };
}
// right = the card describes Puff's sorting ('which') / a NEW real way (s0 step 2 «Hvordan kan vi sortere nå?»); a twin of the right card
// or of the old way is swapped for an honest false card
function honestSortCards(K, p, objs, part1) {
  const R = sortRules(objs), rp = R.rp, same = (P, Q) => !!P && F.REASON.samePart(P, Q);
  if (p.cards && p.sub === 'which') p.cards = honestRuleCards(K, p.cards, objs, { right: id => same(rp(id), part1),
    wrongOk: id => !!rp(id) && !same(rp(id), part1), prefer: id => !!rp(id) && R.realWay(rp(id)) });
  else if (p.cards) p.cards = honestRuleCards(K, p.cards, objs, { right: id => !!rp(id) && R.realWay(rp(id)) && !same(rp(id), part1),
    wrongOk: id => !!rp(id) && !R.realWay(rp(id)) });
  return R;
}
/* 4. F59: the shape counts, not where it stands on the plinth – the staircase one cell to the right, or the mirror staircase started at
      the left edge, is the same growing shape (both trimmed to their bounding box before the mirror / rotation match) */
function trimGrid(h, w, d) {
  let x0 = w, x1 = -1, z0 = d, z1 = -1;
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (+h[z * w + x] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  if (x1 < 0) return '';
  const rows = []; for (let z = z0; z <= z1; z++) { const r = []; for (let x = x0; x <= x1; x++) r.push(+h[z * w + x]); rows.push(r.join(',')); }
  return rows.join('/');
}
// objects on the farmyard board: one row (≤ 6) or two rows (8)
function yard(K, objs, o) {
  o = o || {};
  const n = objs.length, rows = n > 6 ? 2 : 1, perRow = Math.ceil(n / rows), gap = n > 6 ? 1.0 : 1.05;
  const B = K.board({ style: 'grass', w: Math.max(5.2, perRow * gap + 1.0), d: (o.crates ? 3.5 : 1.4 + rows * 1.0), h: 1.0, tilt: o.crates ? 0.9 : 0.8 });
  const zBase = o.crates ? -0.95 : 0;
  const pos = objs.map((_, i) => { const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, n - r * perRow);
    return new V3((c - (inRow - 1) / 2) * gap, 0, zBase + (r - (rows - 1) / 2) * (o.crates ? 0.85 : 1.05)); });
  const pcs = objs.map((x, i) => { const pc = K.piece(F.VOX.has(x.model) ? x.model : 'fx_r_perle', x.opts || {}, x.num != null ? 0.9 : n > 6 ? 0.62 : 0.72, { hk: x.num != null ? 2 : 1 }); B.add(pc, pos[i].x, pos[i].z); pc.userData.i = i; pc.userData.home = pos[i].clone();
    if (x.num != null) B.label(pc, String(x.num), { cls: 'num rs-st', dy: 0.3 });
    return pc; });
  const rings = pcs.map(pc => { const r = mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd34d })); r.rotation.x = Math.PI / 2; r.position.set(0, 0.04, 0); r.visible = false; pc.add(r); return r; });
  return { B, pcs, pos, rings, ring: (i, on, hex) => { rings[i].visible = !!on; rings[i].material.color.setHex(hex || 0xffd34d); } };
}
// read a row of cards aloud (each card lights while Puff reads it), then she taps one
// (D12 sweep: stop = the card step's own «answered» flag – S.solved is still true from step 1 when step 2's cards are first read, so
// the reason cards / the s0 rule cards used to come up silent: only the question was heard)
async function readCards(K, S, btns, list, tplId, stop) {
  const over = stop || (() => S.solved);
  for (let i = 0; i < list.length && !S.ended && !over(); i++) { btns[i].classList.add('rs-reading'); await K.say(tplId, { s: list[i] }); btns[i].classList.remove('rs-reading'); }
}
async function cardStep(K, S, cards, tplId, txt, o) {
  o = o || {};
  K.clearBar();
  let answered = false; const stop = () => answered;
  const valid = cards.filter(c => c.ok).map(c => c.id);
  const w = K.widget({ kind: 'cards', values: cards.map(c => c.id), feed: v => K.submit(v),
    solution: () => btns.forEach((b, i) => b.classList.toggle('rs-glow', cards[i].ok)), rightValue: () => valid[0], wrongValue: () => (cards.find(c => !c.ok) || {}).id });
  const btns = cards.map(c => K.button(cardHtml(c), () => { if (w.locked || S.solved) return; K.submit(c.id); }));
  if (o.lookBack) K.lookBack(o.lookBack); else K.lookBack(null);
  K.hint(async () => { if (o.hint) await o.hint(); await readCards(K, S, btns, cards.map(c => txt[c.id]), tplId, stop); });
  K.sol(async () => { w.solution(); await K.say('core_sol_chip'); });
  S.replay = async () => { if (o.ask) await K.say(o.ask); await readCards(K, S, btns, cards.map(c => txt[c.id]), tplId, stop); };
  if (o.ask) await K.prompt(o.ask);
  S.speaking = true;
  try { await readCards(K, S, btns, cards.map(c => txt[c.id]), tplId, stop); } finally { S.speaking = false; S.tInput = F.T.now; }
  const r = await K.arm({ answer: valid[0], check: v => valid.includes(v) });
  answered = true;
  K.clearBar();
  return r;
}
F.Task.def('F71', {
  name: 'Sorteringskassene', strands: { DATA: [1, 1], ORD: [1, 1], LOGIKK: [[1, 1], [3, 3]] }, places: ['farm', 'gard', 'any'], family: 'sortere', think: 'KLASSIFISERE', portable: true,
  tpl: ['rs_alle', 'rs_f71_odd', 'rs_f71_likt', 'rs_f71_gaate', 'rs_f71_sorter', 'rs_f71_annen'],
  g: it => it.g,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this), p = K.p;
    if (item.strand === 'LOGIKK') item.think = 'DEDUKSJON';
    if (p.kind === 'tapall') return f71tapall(K, item, S);
    if (p.kind === 'odd') return f71odd(K, item, S);
    if (p.kind === 'riddle') return f71riddle(K, item, S);
    if (p.kind === 'lineup') return f71lineup(K, item, S);
    return f71sort(K, item, S);
  },
});
async function f71tapall(K, item, S) {
  tidyTapAll(K, item);
  const p = K.p, Y = yard(K, p.objs);
  const sel = new Set(), ans = item.target.slice();
  K.meta('subset', item.g);
  const value = () => [...sel].sort((a, b) => a - b);
  const w = K.widget({ kind: 'tapall-3d', values: p.objs.map((_, i) => i),
    feed: v => { sel.clear(); Y.rings.forEach((_, i) => Y.ring(i, false)); (v || []).forEach(i => { sel.add(+i); Y.ring(+i, true); }); return K.submit(value()); },
    solution: () => ans.forEach(i => { glow(Y.pcs[i], true, 0xffe066); }),
    rightValue: () => ans.slice(), wrongValue: () => ans.slice(1) });
  Y.pcs.forEach((pc, i) => Y.B.pick(pc, () => { if (w.locked || S.solved || !K.gateOk()) return; if (sel.has(i)) { sel.delete(i); Y.ring(i, false); } else { sel.add(i); Y.ring(i, true); bounce(pc, 0.18); } }));
  K.done(b => { if (!sel.size) { K.shake(b); return; } K.submit(value()); });
  // look-back: what she picked that does not belong hops out of the ring («passer ikke»); only missing ones → «noen mangler»
  K.lookBack(async v => {
    const mine = (v || value()).map(Number), extra = mine.filter(i => !ans.includes(i));
    if (extra.length) { await K.say('rs_f71_passer_ikke'); await Promise.all(extra.map(i => shake(Y.pcs[i]))); }
    else await K.say('rs_f71_mangler');
  });
  K.hint(async () => { await nameAll(K, S, Y, p.objs); if (!S.solved) await K.say('rs_alle', { s: ALLE_TXT[p.cat] }); });
  K.sol(async () => { w.solution(); await K.say('kit_sol_tapall'); });
  S.replay = () => K.say('rs_alle', { s: ALLE_TXT[p.cat] });
  await K.prompt('rs_alle', { s: ALLE_TXT[p.cat] });
  if (K.sup === 0) await K.talk([['rs_f71_ferdig']]);
  await K.arm({ answer: ans, check: v => setEq(v, ans) });
  for (const i of ans) { if (S.ended) break; glow(Y.pcs[i], true, 0xffe066); bounce(Y.pcs[i], 0.3); await sleep(160); }
  await K.say('rs_f71_ok');
  return S.result();
}
async function f71odd(K, item, S) {
  tidyOdd(K);
  const p = K.p, Y = yard(K, p.objs), n = p.objs.length;
  K.meta(p.twoStep ? 'twostep' : 'scene', item.g);
  const w = K.widget({ kind: 'odd-3d', values: p.objs.map((_, i) => i),
    feed: i => K.submit(+i), solution: i => { glow(Y.pcs[+i], true, 0xffe066); bounce(Y.pcs[+i], 0.3); },
    rightValue: () => p.odd, wrongValue: () => (p.odd + 1) % n });
  // re-deal after the 1st error (SYNTHESIS §5.2 F): the objects swap places, so tapping through by position never works
  let order = Y.pcs.map((_, i) => i);
  w.redeal = () => { const perm = U.shuffle(Math.random, order.slice()); Y.pcs.forEach((pc, i) => { const to = Y.pos[perm[i]]; hopTo(pc, new V3(to.x, 0, to.z), 420, 0.6); }); order = perm; return true; };
  Y.pcs.forEach((pc, i) => Y.B.pick(pc, () => { if (w.locked || S.solved) return; if (!K.mine(w)) { bounce(pc, 0.15); return; } if (!K.gateOk()) return; bounce(pc, 0.2); K.submit(i); }));
  K.lookBack(async v => { const i = +v; if (!(i >= 0) || !Y.pcs[i]) return; await bounce(Y.pcs[i], 0.45); await K.say('rs_f71_horer'); });
  K.hint(async () => { if (p.numeric) { for (const pc of Y.pcs) { if (S.solved) break; bounce(pc, 0.15); await sleep(160); } } else await nameAll(K, S, Y, p.objs); if (!S.solved) await K.say('rs_f71_de_fleste'); });
  K.sol(async () => { w.solution(p.odd); await K.say('core_sol_chip'); });
  S.replay = () => K.say('rs_f71_odd');
  await K.prompt('rs_f71_odd');
  await K.arm({ answer: p.odd });
  const op = Y.pcs[p.odd]; glow(op, true, 0xffe066); hopTo(op, op.position.clone().add(new V3(0, 0, 0.45)), 400, 0.5);
  let why = p.cat;
  if (p.twoStep && p.reasons) {
    // 2T (natural audit D12): «Hva er likt for alle de andre?» – the reason cards are read aloud (one clip each), then she taps one; a
    // card is right exactly when every other thing has it («fire bein»), so «fjær» (the odd one's own feature) is honestly wrong; a
    // false card → the others that are not like that shake («Se, ikke alle de andre er det»)
    const others = Y.pcs.map((_, i) => i).filter(i => i !== p.odd);
    honestReasons(K);
    const f = await cardStep(K, S, p.reasons, 'rs_reason', REASON_TXT, { ask: 'rs_f71_likt',
      lookBack: async f2 => { const bad = others.filter(i => featOf(p.objs[i], f2) !== true); await K.say('rs_f71_ikke_alle'); await Promise.all(bad.map(i => shake(Y.pcs[i]))); },
      // help: «de andre» hop together (who the question is about) – then the cards are read again
      hint: async () => { await Promise.all(others.map(i => bounce(Y.pcs[i], 0.3))); } });
    if (f != null && REASON_TXT[f] && p.reasons.some(c => c.id === f && c.ok)) why = f;
  }
  // the odd one has hopped out: «Ja! De andre har fire bein.» (her reason, or the shared category when there was no why-step)
  sparkle(op);
  if (REASON_TXT[why]) { await K.say('rs_f71_ja_ok'); await K.say('rs_reason', { s: REASON_TXT[why] }); } else await K.say('rs_f71_ok');
  return S.result();
}
async function f71riddle(K, item, S) {
  const p = K.p, Y = yard(K, p.objs), n = p.objs.length;
  K.meta('scene', item.g);
  const clueTxt = c => CLUE_TXT[c.f][c.neg ? 1 : 0];
  // (the look-back reads p.objs[i] synchronously at its start – the re-deal swaps the animal 650 ms later)
  const sayClues = async () => { for (const c of p.clues) { if (S.ended) return; await K.say('rs_clue', { s: clueTxt(c) }); await sleep(250); } await K.say('rs_f71_hvem'); };
  const w = K.widget({ kind: 'riddle-3d', values: p.objs.map((_, i) => i),
    feed: i => K.submit(+i), solution: i => { glow(Y.pcs[+i], true, 0xffe066); bounce(Y.pcs[+i], 0.3); },
    rightValue: () => p.answer, wrongValue: () => (p.answer + 1) % n });
  // re-deal after the 1st error (SYNTHESIS §5.2 F): the animal she picked leaves; a fresh one that also breaks a clue takes its
  // place, and everybody changes places – tapping through never works
  w.redeal = wrongV => {
    const i = wrongV == null ? -1 : +wrongV;
    const have = new Set(p.objs.map(x => x.id));
    const fresh = U.shuffle(Math.random, Object.keys(F.REASON.OBJ).filter(id => F.REASON.OBJ[id].cat === 'dyr' && !have.has(id) && F.VOX.has(id)
      && p.clues.every(c => F.REASON.FEAT[c.f](F.REASON.OBJ[id]) != null) && p.clues.some(c => { const val = F.REASON.FEAT[c.f](F.REASON.OBJ[id]); return c.neg ? val : !val; })))[0];
    if (fresh && i >= 0 && i !== p.answer && Y.pcs[i]) {
      const old = Y.pcs[i], np = K.piece(fresh, {}, n > 6 ? 0.62 : 0.72, { hk: 1 }); np.position.copy(old.position); np.userData = Object.assign({}, old.userData);
      Y.B.unpick(old); Y.B.top.remove(old); Y.B.add(np, old.position.x, old.position.z); Y.pcs[i] = np; p.objs[i] = { id: fresh, model: fresh };
      const r = Y.rings[i]; if (r && r.parent) r.parent.remove(r); np.add(r);
      Y.B.pick(np, () => { if (w.locked || S.solved || !K.gateOk()) return; bounce(np, 0.2); K.submit(i); }); popIn(np);
    }
    const perm = U.shuffle(Math.random, Y.pcs.map((_, k) => k));
    Y.pcs.forEach((pc, k) => { const to = Y.pos[perm[k]]; hopTo(pc, new V3(to.x, 0, to.z), 420, 0.6); });
    return true;
  };
  Y.pcs.forEach((pc, i) => Y.B.pick(pc, () => { if (w.locked || S.solved || !K.gateOk()) return; bounce(pc, 0.2); K.submit(i); }));
  // look-back: her animal hops, and the clue it does not fit is said again while it shakes
  K.lookBack(async v => {
    const i = +v; if (!(i >= 0) || !Y.pcs[i]) return;
    const o = objFull(p.objs[i]); const c = p.clues.find(c2 => { const val = F.REASON.FEAT[c2.f](o); return val != null && (c2.neg ? val : !val); });
    await bounce(Y.pcs[i], 0.4);
    if (c) { Y.ring(i, true, 0xff9aa2); await K.say('rs_clue', { s: clueTxt(c) }); await shake(Y.pcs[i]); Y.ring(i, false); }
  });
  K.hint(async () => { await K.say('lo3_hor'); await sayClues(); });     // (one «listen to the clues» line for riddles and line-ups)
  K.sol(async () => { w.solution(p.answer); await K.say('core_sol_chip'); });
  S.replay = sayClues;
  await K.prompt('rs_f71_gaate');
  S.speaking = true;
  try { await sayClues(); } finally { S.speaking = false; S.tInput = F.T.now; }
  await K.arm({ answer: p.answer });
  sparkle(Y.pcs[p.answer]); bounce(Y.pcs[p.answer], 0.5);
  await K.say('rs_f71_ok');
  return S.result();
}
// LOGIKK Lo3 «Rekka»: order 3–4 children (who is taller) or pets (who came first) from spoken clues. They all look the same size
// at the start (the heights are hidden: only the clues tell) – after she solves it they grow / run the race in her order.
async function f71lineup(K, item, S) {
  const p = K.p, n = p.ents.length, ids = p.ents.map(e => e.id);
  const B = K.board({ style: 'grass', w: Math.max(5.2, n * 1.25 + 1.2), d: 3.1, h: 1.4, tilt: 0.82 });
  const gap = 1.2, x0 = -(n - 1) / 2 * gap;
  const home = ids.map((_, i) => new V3(x0 + i * gap, 0, -0.85));
  const spot = ids.map((_, i) => new V3(x0 + i * gap, 0, 0.75));
  const kids = p.lineup === 'height';
  const pcs = p.ents.map((e, i) => { const pc = K.piece(F.VOX.has(e.model) ? e.model : 'fx_r_perle', e.opts || {}, kids ? 0.8 : 0.85, { hk: kids ? 0.5 : 1 }); B.add(pc, home[i].x, home[i].z); pc.userData.home = home[i].clone(); return pc; });
  pcs.forEach((pc, i) => B.label(pc, F.LO3name ? F.LO3name(p.ents[i].id) : p.ents[i].id, { cls: 'num rs-tag', dy: kids ? 0.95 : 0.6 }));   // v5d (#57) story children
  const plates = spot.map((q, i) => { const pl = K.piece('fx_r_plate', { c: 'gold', c2: 'butter' }, 0.8, { hk: 0.2 }); B.add(pl, q.x, q.z); return pl; });
  // the spots: 1, 2, 3 (4) – the prompt says what 1 means (tallest / first in the race)
  const lab = plates.map((pl, i) => { const a = new THREE.Object3D(); a.position.set(spot[i].x, 0.05, spot[i].z + 0.48); B.top.add(a); return B.label(a, String(i + 1), { cls: 'num rs-st', dy: 0, always: true }); });
  const line = p.ask === 'line';
  const at = new Array(n).fill(-1);                     // at[spot] = entity index
  const place = i => { const k = at.indexOf(i); if (k >= 0) { at[k] = -1; hopTo(pcs[i], pcs[i].userData.home, 300, 0.5); return; } const f = at.indexOf(-1); if (f < 0) return; at[f] = i; hopTo(pcs[i], spot[f].clone().add(new V3(0, 0.03, 0)), 330, 0.6); };
  const value = () => at.map(i => i < 0 ? null : ids[i]);
  const sayClues = async () => { for (const c of p.clues) { if (S.ended) return; const [a, b2] = c.p.split('|'); const ia = ids.indexOf(a), ib = ids.indexOf(b2);
    if (ia >= 0) bounce(pcs[ia], 0.25); if (ib >= 0) bounce(pcs[ib], 0.25); await K.say(c.tpl, F.LO3say(c)); await sleep(200); } };
  K.meta(line ? 'order' : 'chips', item.g);
  const w = K.widget({ kind: 'lineup', values: ids,
    feed: v => { if (line) { at.fill(-1); pcs.forEach(pc => pc.position.copy(pc.userData.home)); (v || []).forEach(id => place(ids.indexOf(id))); return K.submit(value()); } return K.submit(v); },
    solution: () => { if (line) { at.fill(-1); pcs.forEach(pc => hopTo(pc, pc.userData.home, 250, 0.3)); item.target.forEach((id, k) => lab[k].set((k + 1) + ' ' + id).cls('rs-glow', true)); } else { const i = ids.indexOf(item.target); glow(pcs[i], true, 0xffe066); bounce(pcs[i], 0.4); } },
    rightValue: () => line ? item.target.slice() : item.target,
    wrongValue: () => line ? item.target.slice().reverse() : ids.find(x => x !== item.target) });
  pcs.forEach((pc, i) => B.pick(pc, () => { if (w.locked || S.solved || !K.gateOk()) return; if (line) place(i); else { bounce(pc, 0.25); K.submit(ids[i]); } }));
  if (line) K.done(b => { if (at.some(x => x < 0)) { K.shake(b); return; } K.submit(value()); });
  // look-back: the clue her answer breaks is said again while those two bounce
  K.lookBack(async v => {
    const ord = line ? v : null;
    const broken = p.clues.find((c, k) => { const r = p.rel[k];
      if (line) { if (!Array.isArray(ord)) return false; if (r.pos) return r.pos === 'first' ? ord[0] !== r.a : ord[ord.length - 1] !== r.a; return ord.indexOf(r.a) > ord.indexOf(r.b); }
      // a single pick: a clue that shows someone is before (first) / after (last) her pick
      if (r.pos) return (p.ask === 'last' && r.pos === 'last' && r.a !== v) || (p.ask === 'first' && r.pos === 'first' && r.a !== v);
      return p.ask === 'first' ? r.b === v : r.a === v; });
    if (!broken) return;
    const [a, b2] = broken.p.split('|'); [a, b2].forEach(x => { const i = ids.indexOf(x); if (i >= 0) bounce(pcs[i], 0.4); });
    await K.say(broken.tpl, F.LO3say(broken));
  });
  K.hint(async () => { await K.say('lo3_hor'); await sayClues(); });
  K.sol(async () => { w.solution(); await K.say(line ? 'kit_sol_order' : 'core_sol_chip'); });
  S.replay = async () => { await sayClues(); await K.say(p.askTpl); };
  await K.prompt('lo3_hor');
  S.speaking = true;
  try { await sayClues(); await K.say(p.askTpl); } finally { S.speaking = false; S.tInput = F.T.now; }
  await K.arm(line ? { answer: item.target, check: v => sameArr(v, item.target) } : { answer: item.target });
  // payoff: the children grow to their real heights / the pets run the race in this order
  const ord = line ? item.target : p.order;
  if (kids) { for (let k = 0; k < n && !S.ended; k++) { const pc = pcs[ids.indexOf(ord[k])]; const s0 = pc.scale.y, s1 = s0 * (1.45 - k * 0.18); tween(500, t => { pc.scale.y = s0 + (s1 - s0) * ease(t); }); await sleep(160); } }
  else { for (let k = 0; k < n && !S.ended; k++) { const pc = pcs[ids.indexOf(ord[k])]; hopTo(pc, pc.position.clone().add(new V3(0, 0, 0.9)), 420, 0.5); await sleep(260); } }
  await sleep(500); sparkle(pcs[ids.indexOf(ord[0])]); await K.say('rs_f71_ok');
  return S.result();
}
async function f71sort(K, item, S) {
  const p = K.p, n = p.objs.length, Y = yard(K, p.objs, { crates: true });
  const objs = p.objs.map(objFull);
  const crates = [-1, 1].map(sx => { const c = K.piece('fx_r_kasse', {}, 1.75, { hk: 1 }); Y.B.add(c, sx * 1.55, 0.95); return c; });
  const part1 = item.target.slice();
  // crate labels for a rule: A = the feature, B = its exact complement when one exists (blå / leker …), else «ikke …»
  const labelsFor = f => {
    const P = F.REASON.partOf(objs, f), comp = Object.keys(F.REASON.CARD).find(g => g !== f && sameArr(F.REASON.partOf(objs, g), P.map(x => x == null ? null : 1 - x)));
    const A = F.REASON.CARD[f], Bc = comp ? F.REASON.CARD[comp] : null;
    return [A[0] + ' ' + F.UI.caseText(A[1]), Bc ? Bc[0] + ' ' + F.UI.caseText(Bc[1]) : '✗ ' + F.UI.caseText('ikke ' + A[1])];
  };
  // the crate's sign hangs on its front edge (the things inside stay visible)
  const cl = crates.map(c => { const a = new THREE.Object3D(); a.position.set(c.position.x, 0.2, c.position.z + 0.78); Y.B.top.add(a); return Y.B.label(a, '?', { cls: 'num rs-crate', dy: 0, always: true }); });
  const setLabels = arr => cl.forEach((L, k) => L.set(arr ? arr[k] : '?'));
  const { colsIn, rp } = honestSortCards(K, p, objs, part1);
  const where = new Array(n).fill(null); let picked = -1;
  const slotPos = (k, j) => new V3(crates[k].position.x + ((j % 3) - 1) * 0.5, 0.1, crates[k].position.z + (Math.floor(j / 3) - 0.5) * 0.42);
  const layout = () => { [0, 1].forEach(k => { let j = 0; where.forEach((wk, i) => { if (wk === k) { const to = slotPos(k, j++); hopTo(Y.pcs[i], to, 300, 0.5); } }); }); };
  const home = i => { where[i] = null; hopTo(Y.pcs[i], Y.pcs[i].userData.home, 300, 0.5); };
  const value = () => where.map(k => k == null ? null : (k === 0 ? 1 : 0));
  let solNow = null;   // the solution step: picking a thing lights the crate it belongs in
  const pick = i => { if (picked >= 0) Y.ring(picked, false); picked = picked === i ? -1 : i; if (picked >= 0) { Y.ring(picked, true); bounce(Y.pcs[picked], 0.2); }
    cl.forEach((L, k) => L.cls('rs-glow', !!solNow && picked >= 0 && (solNow[picked] ? 0 : 1) === k)); };
  let wNow = null;
  Y.pcs.forEach((pc, i) => Y.B.pick(pc, () => { if (!wNow || wNow.locked || S.solved) return; if (!K.mine(wNow)) { bounce(pc, 0.12); return; } if (!K.gateOk()) return; pick(i); }));
  crates.forEach((c, k) => Y.B.pick(c, () => { if (!wNow || wNow.locked || S.solved || picked < 0 || !K.mine(wNow) || !K.gateOk()) return; const i = picked; Y.ring(i, false); picked = -1; where[i] = k; glow(Y.pcs[i], false); cl.forEach(L => L.cls('rs-glow', false)); try { F.sfx.pling(k * 4 + 2); } catch (e) {} layout(); }, { min: 70 }));
  const sortStep = async (o) => {
    where.fill(null); Y.pcs.forEach((_, i) => home(i)); picked = -1;
    const w = wNow = K.widget({ kind: 'sort-3d', values: p.objs.map((_, i) => i),
      feed: v => { (v || []).forEach((x, i) => { where[i] = x == null ? null : (x ? 0 : 1); }); layout(); return K.submit(value()); },
      solution: () => { const s = solNow = o.solution; Y.pcs.forEach((pc, i) => { if (where[i] != null && where[i] !== (s[i] ? 0 : 1)) home(i); }); s.forEach((x, i) => { if (where[i] == null) glow(Y.pcs[i], true, 0xffe066); }); },
      rightValue: () => o.solution.slice(), wrongValue: () => o.solution.map((x, i) => i === 0 ? 1 - x : x) });
    K.clearBar();
    K.done(b => { if (where.some(x => x == null)) { K.shake(b); return; } K.submit(value()); });
    // look-back: each thing in the wrong crate for the rule hops out and back («passer ikke i kassen»)
    K.lookBack(async v => {
      const vv = v || value(); const bad = o.badOf(vv);
      if (bad && bad.length) { await K.say(o.same ? 'rs_f71_samme' : 'rs_f71_passer_ikke'); await Promise.all(bad.map(i => bounce(Y.pcs[i], 0.5))); }
    });
    K.hint(async () => { if (o.hintFn) await o.hintFn(); });
    K.sol(async () => { w.solution(); await K.say('kit_sol_sort'); });
    await K.arm({ answer: o.solution, check: o.check });
    solNow = null; cl.forEach(L => L.cls('rs-glow', false));
    Y.pcs.forEach(pc => glow(pc, false));
  };
  // step 0 ('which'): Puff has sorted – which rule did Puff use?
  if (p.sub === 'which') {
    part1.forEach((x, i) => { where[i] = x ? 0 : 1; }); layout();
    await K.prompt('rs_f71_hvilken_regel');
    await cardStep(K, S, p.cards, 'rs_rule', RULE_TXT, {
      lookBack: async f => { const P = rp(f) || F.REASON.partOf(objs, f);
        // (the things that sit in the wrong crate for that rule shake – whichever way round the crates fit it best)
        const badOf = flip => P.map((x, i) => x == null || ((flip ? 1 - x : x) ? 0 : 1) !== where[i] ? i : -1).filter(i => i >= 0);
        const b0 = badOf(false), b1 = badOf(true), bad = b1.length < b0.length ? b1 : b0; await Promise.all(bad.slice(0, 4).map(i => shake(Y.pcs[i]))); },
      hint: async () => { await bounce(crates[0], 0.2); } });
    setLabels(labelsFor(p.rule1.f)); await sleep(500);
  } else {
    // step 1: sort by the shown rule
    setLabels(labelsFor(p.rule1.f));
    K.meta('build', item.g);
    S.replay = () => K.say('rs_f71_sorter');
    await K.prompt('rs_f71_sorter');
    if (K.sup === 0) await K.talk([['rs_f71_tapp']]);
    await sortStep({ solution: part1, check: v => sameArr(v, part1), badOf: v => v.map((x, i) => x !== part1[i] ? i : -1).filter(i => i >= 0),
      hintFn: async () => { await K.say('rs_f71_kassene'); cl.forEach(L => L.cls('rs-glow', true)); await Promise.all(crates.map(c => bounce(c, 0.25))); await K.say('rs_rule', { s: RULE_TXT[p.rule1.f] }); cl.forEach(L => L.cls('rs-glow', false)); } });
    await K.say('rs_f71_ryddig_ok');
  }
  // step 2: a second valid way (labels hidden); at s0 a rule card first, then the crates get that rule's labels
  const ways = F.REASON.sortWays(objs).filter(wy => !F.REASON.samePart(wy.part, part1));
  if (!ways.length) return S.result();
  setLabels(null);
  let fixed = null;
  if (K.sup === 0 && p.cards && p.sub !== 'which') {
    await K.prompt('rs_f71_velg_regel');
    const f0 = await cardStep(K, S, p.cards, 'rs_rule', RULE_TXT, {});
    const f = COL_IDS.includes(f0) && colsIn.length === 2 ? COLNAME[colsIn[0]] : f0;
    fixed = rp(f) || F.REASON.partOf(objs, f); setLabels(labelsFor(f));
  }
  await K.prompt('rs_f71_annen');
  S.replay = () => K.say('rs_f71_annen');
  const okWay = v => v.every(x => x != null) && ways.some(wy => F.REASON.samePart(wy.part, v));
  await sortStep({ solution: fixed || ways[0].part, same: true,
    check: fixed ? (v => sameArr(v, fixed)) : okWay,
    badOf: v => {
      if (F.REASON.samePart(v, part1)) return Y.pcs.map((_, i) => i);
      // the valid way closest to hers (fewest things to move, crates may swap) – those things hop
      let best = null;
      for (const ref of (fixed ? [fixed] : ways.map(x => x.part))) for (const flip of (fixed ? [false] : [false, true])) {
        const bad = v.map((x, i) => (flip ? 1 - x : x) !== ref[i] ? i : -1).filter(i => i >= 0); if (!best || bad.length < best.length) best = bad; }
      return best || [];
    },
    hintFn: async () => { await K.say('rs_f71_annen'); } });
  const v = value(), wy = ways.find(x => F.REASON.samePart(x.part, v)) || ways[0];
  const lab = labelsFor(wy.f); setLabels(v.every((x, i) => x === wy.part[i]) ? lab : [lab[1], lab[0]]);
  sparkle(crates[0]); await K.say('rs_f71_ryddig_ok');
  return S.result();
}

/* =====================================================================================================================
   7. F74 Dronningens blomsterbed (LOGIKK Lo2): the queen's 4×4 flower bed (picture shidoku, solver-unique). Tap an empty bed to
      cycle tulipan → rose → solsikke → lilje → tomt; Ferdig. A wrong bed: the two equal flowers on one line glow (look-back).
   ===================================================================================================================== */
// chunky bed flowers whose heads face up (the bed is seen from above): four shapes AND four colours, so no flower depends on colour
// alone – tulipan (red cup), rose (purple ball), solsikke (yellow disc, brown heart), lilje (white star, yellow heart)
def('fx_r_blomst', { size: [11, 10, 11], scale: 1 / 13, build(v, o) {
  const k = o.k || 0;
  v.box(5, 0, 5, 5, 5, 5, 'leaf'); v.box(3, 2, 5, 4, 2, 5, 'leaf2'); v.box(6, 3, 5, 7, 3, 5, 'leaf2');
  if (k === 0) { v.box(2, 5, 2, 8, 9, 8, 'red'); v.clear(3, 8, 3, 7, 9, 7); v.box(3, 8, 3, 7, 8, 7, 'cherry'); v.clear(5, 9, 2, 5, 9, 2); v.clear(5, 9, 8, 5, 9, 8); v.clear(2, 9, 5, 2, 9, 5); v.clear(8, 9, 5, 8, 9, 5); v.set(3, 7, 2, 'coral'); }
  else if (k === 1) { v.sphere(5, 7, 5, 3.6, 'purple'); [[5, 9, 5], [4, 9, 5], [5, 9, 4], [6, 8, 6], [3, 8, 4], [6, 9, 4], [4, 8, 7]].forEach(q => v.set(q[0], q[1], q[2], 'plum')); v.set(3, 8, 3, 'lilac'); }
  else if (k === 2) { for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) { const r = Math.hypot(x - 5, z - 5); if (r <= 5.2) v.set(x, 7, z, r <= 2.2 ? 'woodDark' : 'yellow'); if (r > 3.2 && r <= 5.2 && (x + z) % 2 === 0) v.set(x, 8, z, 'gold'); } v.box(4, 8, 4, 6, 8, 6, 'brown'); }
  else { for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) { const dx = x - 5, dz = z - 5, a = Math.atan2(dz, dx), r = Math.hypot(dx, dz), kk = 0.5 + 0.5 * Math.cos(3 * a); if (r <= 1.5 + 4 * kk) v.set(x, 7, z, 'white'); } v.box(4, 8, 4, 6, 8, 6, 'butter'); v.set(5, 9, 5, 'orange'); }
} });
const flowerPiece = (K, k, size) => K.piece('fx_r_blomst', { k }, size, { hk: 0.7 });
// conflicts of a full or partial grid: pairs of equal symbols in one row / column / box
function bedConflicts(g) {
  const BOX = F.REASON.BOX, out = [];
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) { if (g[i] < 0 || g[i] !== g[j]) continue;
    if (Math.floor(i / 4) === Math.floor(j / 4) || i % 4 === j % 4 || BOX(i) === BOX(j)) out.push([i, j]); }
  return out;
}
F.Task.def('F74', {
  name: 'Dronningens blomsterbed', strands: { LOGIKK: [2, 2] }, places: ['rosehagen', 'garden', 'any'], family: 'logikk', think: 'DEDUKSJON', portable: true,
  tpl: ['rs_f74_hjelp', 'rs_f74_regel1', 'rs_f74_regel2', 'rs_f74_trykk'],
  // v5 WP-R2 (wave-1 REQUEST WP-E): a production format declares its mode + a numeric g (the item's own g still wins in the stage)
  mode: 'grid', g: 0.001,
  async run(item, S) {
    ensure(item, this);
    const K = Kit(item, S, this), p = K.p;
    const cell = 0.82, gapBox = 0.22;
    const B = K.board({ style: 'grass', w: 4 * cell + gapBox + 1.0, d: 4 * cell + gapBox + 0.9, h: 0.9, tilt: 0.95, scale: 1.12 });
    const at = i => { const r = Math.floor(i / 4), c = i % 4; return new V3((c - 1.5) * cell + (c >= 2 ? gapBox / 2 : -gapBox / 2), 0, (r - 1.5) * cell + (r >= 2 ? gapBox / 2 : -gapBox / 2)); };
    const grid = p.grid.slice(), soil = [], fl = new Array(16).fill(null);
    for (let i = 0; i < 16; i++) {
      const s = K.piece('fx_r_jord', {}, cell * 0.92, { hk: 0.3 }); const q = at(i); B.add(s, q.x, q.z); soil.push(s);
      if (p.grid[i] < 0) { glow(s, true, 0x7a5a3a); B.pick(s, () => tap(i), { min: 34 }); }
    }
    // a small «?» on every empty bed (gone while a flower stands there)
    const qL = {}; for (let i = 0; i < 16; i++) if (p.grid[i] < 0) qL[i] = B.label(soil[i], '?', { cls: 'num rs-st rs-q', dy: 0.05 });
    // the box paths: a light gravel cross between the 2×2 boxes
    const path = mesh(new THREE.BoxGeometry(gapBox * 0.8, 0.04, 4 * cell + gapBox), new THREE.MeshLambertMaterial({ color: 0xe9dcc0 })); path.position.y = 0.02; B.top.add(path);
    const path2 = path.clone(); path2.rotation.y = Math.PI / 2; B.top.add(path2);
    const setF = (i, k) => {
      if (fl[i]) { B.unpick(fl[i]); B.top.remove(fl[i]); fl[i] = null; }
      grid[i] = k;
      if (qL && qL[i]) qL[i].show(k < 0);
      if (k < 0) return;
      const f = flowerPiece(K, k, cell * 0.86); const q = at(i); B.add(f, q.x, q.z); f.position.y = 0.06; fl[i] = f;
      if (p.grid[i] < 0) { popIn(f, 200); B.pick(f, () => tap(i), { min: 34 }); }
    };
    for (let i = 0; i < 16; i++) if (p.grid[i] >= 0) setF(i, p.grid[i]);
    function tap(i) { if (w.locked || S.solved || !K.gateOk()) return; const k = grid[i]; setF(i, k >= 3 ? -1 : k + 1); try { F.sfx.pling(grid[i] + 2); } catch (e) {} }
    const value = () => grid.join('|');
    const sol = p.sol;
    K.meta('grid', item.g);
    const w = K.widget({ kind: 'bed', values: [],
      feed: v => { const arr = Array.isArray(v) ? v : String(v).split(/[|,]/).map(Number); arr.forEach((k, i) => { if (p.grid[i] < 0) setF(i, +k); }); return K.submit(value()); },
      solution: () => { for (let i = 0; i < 16; i++) if (p.grid[i] < 0 && grid[i] !== sol[i]) { const g = ghost(flowerPiece(K, sol[i], cell * 0.7), 0.45); const q = at(i); B.add(g, q.x, q.z); g.position.y = 0.55; } },
      rightValue: () => sol.join('|'), wrongValue: () => { const g = sol.slice(); const i = p.grid.findIndex(x => x < 0); g[i] = (g[i] + 1) % 4; return g.join('|'); } });
    const fullNow = () => grid.every(k => k >= 0);
    K.done(b => { if (!fullNow()) { K.shake(b); K.say('rs_f74_tomt'); return; } K.submit(value()); });
    // look-back: two equal flowers on one line/box glow and shake (if her bed has no clash it differs only where a pair would clash)
    K.lookBack(async v => {
      const g = String(v || value()).split('|').map(Number), cf = bedConflicts(g);
      if (cf.length) {
        const [a, b] = cf[0];
        const rings = [a, b].map(i => { const r = mesh(new THREE.TorusGeometry(cell * 0.5, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff6f91 })); r.rotation.x = Math.PI / 2; const q = at(i); r.position.set(q.x, 0.12, q.z); B.top.add(r); return r; });
        const say0 = K.say('rs_f74_like');
        [a, b].forEach(i => fl[i] && glow(fl[i], true, 0xff9aa2));
        await Promise.all([a, b].map(i => fl[i] ? bounce(fl[i], 0.35) : null)); await Promise.all([a, b].map(i => fl[i] ? shake(fl[i]) : null));
        await say0; await sleep(700);
        [a, b].forEach(i => fl[i] && glow(fl[i], false)); rings.forEach(r => B.top.remove(r));
      }
    });
    // hint: a line with exactly one empty bed (a «naked single») lights up – «Hvilken blomst mangler?»
    K.hint(async () => {
      const lines = [];
      for (let r = 0; r < 4; r++) lines.push({ t: 'rs_f74_rad', c: [0, 1, 2, 3].map(c => r * 4 + c) });
      for (let c = 0; c < 4; c++) lines.push({ t: 'rs_f74_sole', c: [0, 1, 2, 3].map(r => r * 4 + c) });
      for (let b = 0; b < 4; b++) lines.push({ t: 'rs_f74_firkant', c: [0, 1, 4, 5].map(x => x + (b % 2) * 2 + Math.floor(b / 2) * 8) });
      const open = L => L.c.filter(i => p.grid[i] < 0 && grid[i] !== sol[i]);
      const L = lines.find(l => open(l).length === 1 && l.c.filter(i => p.grid[i] < 0).length === 1) || lines.find(l => open(l).length >= 1);
      if (!L) return;
      L.c.forEach(i => glow(soil[i], true, 0xffe066)); await K.say(L.t); await sleep(900);
      L.c.forEach(i => { glow(soil[i], false); if (p.grid[i] < 0) glow(soil[i], true, 0x7a5a3a); });
    });
    K.sol(async () => { w.solution(); await K.say('rs_sol_bed'); });
    S.replay = async () => { await K.say('rs_f74_regel1'); await K.say('rs_f74_regel2'); };
    await K.prompt('rs_f74_hjelp');
    await K.talk([['rs_f74_regel1'], ['rs_f74_regel2']].concat(K.sup === 0 ? [['rs_f74_trykk'], ['rs_f74_ferdig']] : []));
    await K.arm({ answer: sol.join('|'), check: v => String(v) === sol.join('|') });
    for (let i = 0; i < 16; i++) if (fl[i] && !S.ended) { bounce(fl[i], 0.25); if (i % 4 === 3) await sleep(150); }
    sparkle(B.top); await K.say('rs_f74_ok');
    return S.result();
  },
});


/* =====================================================================================================================
   9. tests / debug
   ===================================================================================================================== */
// the value F.dbg.answer(true) should feed for the running step (S.expected is set per step by arm())
RS.state = () => { const c = RS.cur; if (!c) return null; const B = c.B; return { format: c.format, kind: c.item.params.kind, picks: B ? B.picks.length : 0, labels: B ? B.labels.map(L => L.el.textContent) : [], widget: F.Task.current && F.Task.current.S.active ? F.Task.current.S.active.kind : null }; };
RS.KINDS = KINDS; RS.ensure = ensure;
// natural audit D12 logic sweep (tests/natural_reason.js): the presentation-side guards, pure over an item's params
RS.logic = { tidyTapAll, tidyOdd, honestReasons, honestSortCards, sortRules, trimGrid, growVariants, unclear, objFull, featOf, REASON_TXT };
})();
