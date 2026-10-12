/* Feslottet – v4 number formats F42–F49 (WP-N; DESIGN4 §1/§4.3, SYNTHESIS §3.2 rows, §5 «Tenk først», hint_leaks §3).
   Every format plays on F.NUM's floating diorama board (js/game/tasks/f_num.js: F.NUM.Board / piece / TenView / ui.Actions /
   numberPicture / motion) so it runs anywhere (places include 'any' until WP-W builds the world homes) and answers through the
   stage kit S (js/game/tasks/stage.js): S.keypad, or a board widget armed with S.arm + S.use and submitted via S.submit, so the
   shared protocol (think-gate / R / re-deal when WP-K adds them, the 1.2 s lock, targeted hint, solution → C) is the shared one.
   S.hint / S._solFn are replaced per format: the 1st error plays a WORLD LOOK-BACK of her answer (the bee lands on her tile, the frog
   jumps to her plank, her crystals pop out beside the cloth …) and a structural hint that never shows the answer in the form she
   must produce (hint_leaks Table B); the 2nd error shows the solution and she carries it out (C).

   Formats (SYNTHESIS §3.2; Phase-1 rungs):
     F42 Hundretavla      T-NAVN N10–N12 · T-ORDEN O10–O12 · REGN R9      tap 1 of 50/100 tiles, tap-all + Ferdig, foggy board
     F43 Bunter og plater T-MENGDE M11–M15 · T-SKRIV W9                    build +10/+1 (auto «veksle»), keypad, coins with fewest
     F44 Tallinjebroen    T-ORDEN O9, O13 · REGN R10 · T-SKRIV W9          tap a position scored by distance; arrow / midpoint keypad
     F46 Hulen med teppet REGN R1, R2, R6                                  keypad under a FIXED-size cloth; «alle måtene» list
     F47 Tiervenn-portene REGN R1, R3, R5, R8, R9                          5 gates, keypad, silent RT (Flu: slow-correct = B at s2)
     F48 Tibrettet        REGN R4, R5, R7, R10                             2T: how many move / take first (or the 10-pair), then keypad
     F49 Faktafamiliehuset REGN R6                                         build all 4 equations of the roof family in the windows

   All seven are portable (the board runs anywhere; places include 'any' until WP-W's homes exist). The board floats near the camera
   at a reduced scale (never sunk into the ground, never behind a villager). A 2nd wrong answer is acted out via WP-K's S.lookBack
   before the solution (F42 bee, F44 frog); keypads always have 3 fixed slots (hint_leaks C3). F47 is a fluency format (spec.fluency:
   no rapid-guess R) and returns res.facts [{q, a, ms, first}], res.medianMs and res.slow (s2: all right but median RT > 3.5 s → B);
   F44 line items return res.dist.

   Items: whatever F.LEARN / F.BANKS deliver is adapted by N2.prep(fmt, item): a bank item whose numbers fit the format is used as is;
   otherwise a local generator (N2.GEN, also registered with F.BANKS.reg for REGN R1–R10 as a fallback behind WP-B1) builds a plan
   that fills the DESIGN4 §2.9 contract (g, mode, think, secret, twin, distractor tags) and item.params.n2 (the format's plan).
   Public: F.NUM2 = { GEN, prep, numWord, specs, SERVES, cur (running kit) };  F.dbg.num2 = { run(fmt, {strand, rung, sup, params}),
   result(), screenOf('tile'|'line', v) }  (tests/v4_wpn.js). Params a test/quest may force: F43/F44/F46 params.sub, F42 params.between.
   v5 (WP-R2): K.hint is an AFTER-ERROR hint; before any attempt WP-K2's S.preHint calls S.pre = N2.pre – one structure / strategy
   line by format and plan («Tell tierne først.», «Se på endene av broen.», «Fyll opp til ti først.» …) + the question again;
   «1 tier» / «1 ener» on the F43 cards (#39); contract() keeps a kept bank item's secret + misconception tags (merged); production
   formats declare spec.mode + a numeric spec.g (F42 grid 0.02, F43/F46/F47 keypad, F48 twostep, F49 build: 0.01; F44 mode line).
   F42 does not declare MØNSTER (WP-M's Mø3–Mø4 items stay with F52). */
(function () {
'use strict';
const F = window.F, U = F.U;
const N2 = F.NUM2 = F.NUM2 || {};
const V3 = THREE.Vector3;
const sleep = ms => F.T.sleep(ms);
const tween = (ms, fn) => F.T.tween(ms, fn);
const ease = k => 1 - Math.pow(1 - k, 3);
const NUM = () => F.NUM || {};
const MINE = ['F42', 'F43', 'F44', 'F46', 'F47', 'F48', 'F49'];
const STOP = { stop: true };
const sfx = (name, ...a) => { try { if (F.sfx && F.sfx[name]) F.sfx[name](...a); } catch (e) { /* sound is optional */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isNum = v => v != null && v !== '' && !Array.isArray(v) && isFinite(+v);
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

/* =====================================================================================================================
   0. css for the DOM bits (card, tray rows, equation builder, shelf) – injected once, no CSS file of our own
   ===================================================================================================================== */
let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style'); st.id = 'n2css';
  st.textContent = [
    '.n2-card { position: fixed; left: 50%; top: 12px; transform: translateX(-50%) translateY(-10px); opacity: 0; transition: opacity .3s, transform .3s; z-index: 30;',
    '  background: #fffdf2; border: 4px solid #f2c14e; border-radius: 22px; padding: 2px 26px; font: 700 50px Andika, sans-serif; color: #3b2f5c;',
    '  box-shadow: 0 6px 18px rgba(60,40,110,.22); pointer-events: none; white-space: nowrap; letter-spacing: .02em; }',
    '.n2-card.on { opacity: 1; transform: translateX(-50%); }',
    '.n2-card.small { font-size: 38px; padding: 4px 22px; }',
    '.n2-card.side, .n2-card.side.on { left: 24px; top: 104px; transform: none; text-align: center; }',
    '.n2-card .q { display: inline-block; min-width: 1.1em; text-align: center; color: #8a6fd1; border: 3px dashed #b9a7d8; border-radius: 12px; padding: 0 10px; margin: 0 4px; line-height: 1.15; }',
    '.n2-card .ar { color: #c9962b; margin: 0 2px; }',
    '.n2-card .gap { display: inline-block; width: 18px; }',
    '.n2-row { display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: nowrap; }',
    '.n2-btn { min-width: 110px; min-height: 84px; font-size: 32px; padding: 6px 22px; white-space: nowrap; }',
    '.n2-btn.locked, .n2-row.locked .n2-btn { opacity: .55; }',
    '.n2-btn.glow { animation: glowp .9s ease-in-out infinite alternate; border-color: #c9962b; }',
    '.n2-eq { display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 8px; }',
    '.n2-slot { width: 84px; height: 76px; border-radius: 14px; border: 3px dashed #cdbfe6; background: rgba(255,255,255,.8); display: flex; align-items: center;',
    '  justify-content: center; font: 700 40px Andika, sans-serif; color: #3b2f5c; cursor: pointer; }',
    '.n2-slot.op { width: 64px; }',
    '.n2-slot.filled { border-style: solid; border-color: #b9a7d8; background: #fff; }',
    '.n2-slot.ghost { color: rgba(138,111,209,.55); border-color: #f2c14e; animation: glowp .9s ease-in-out infinite alternate; }',
    '.n2-eqs { font: 700 40px Andika, sans-serif; color: #3b2f5c; padding: 0 6px; }',
    '.n2-eq.wrong { animation: shake .35s; }',
    '.n2-tiles { display: flex; gap: 10px; justify-content: center; }',
    '.n2-tile { min-width: 76px; height: 70px; font: 700 38px Andika, sans-serif; border-radius: 14px; border: 3px solid #d9cdf2; background: linear-gradient(#fff, #f6f0ff);',
    '  color: #3b2f5c; cursor: pointer; box-shadow: 0 4px 0 rgba(60,40,110,.16); padding: 0 12px; }',
    '.n2-tile.glow { animation: glowp .9s ease-in-out infinite alternate; border-color: #c9962b; }',
    '.n2-tiles.locked .n2-tile, .n2-eq.locked .n2-slot { opacity: .6; }',
    '.n2-shelf { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 29; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;',
    '  max-width: 92vw; pointer-events: none; }',
    '.n2-split { font: 700 34px Andika, sans-serif; color: #3b2f5c; background: #fffbe8; border: 3px solid #f2c14e; border-radius: 14px; padding: 0 14px; min-width: 96px; text-align: center; }',
    '.n2-split.gap { background: rgba(255,255,255,.6); border-style: dashed; border-color: #b9a7d8; color: transparent; }',
    '.n2-split.ghost { background: #f3ecff; border-style: dashed; border-color: #8a6fd1; color: #8a6fd1; }',
    '.n2-split.new { animation: chipIn .38s cubic-bezier(.2,.9,.3,1.35); }',
  ].join('\n');
  document.head.appendChild(st);
}

/* =====================================================================================================================
   1. small models (prefix fx_n2_): coins 5/20, notes 50/100, firewood stick + bundle
   ===================================================================================================================== */
function defModels() {
  if (!F.VOX || !F.VOX.def || F.VOX.has('fx_n2_pinne')) return;
  const coin = (id, r, label, a, b) => F.VOX.def(id, { size: [2 * r + 1, 2 * r + 1, 2], scale: 1 / 16, build(v) {
    for (let y = 0; y <= 2 * r; y++) for (let x = 0; x <= 2 * r; x++) { const d = Math.hypot(x - r, y - r); if (d <= r + 0.3) { v.set(x, y, 0, a); v.set(x, y, 1, d > r - 0.8 ? a : b); } }
    const w = label.length * 4 - 1; if (v.text) v.text(label, r - Math.floor(w / 2), r - 2, 1, 'woodDark');
  } });
  coin('fx_n2_mynt5', 6, '5', 'silver', 'steel');
  coin('fx_n2_mynt20', 8, '20', 'honey', 'gold');
  const note = (id, label, a, b) => F.VOX.def(id, { size: [22, 12, 1], scale: 1 / 16, build(v) {
    v.box(0, 0, 0, 21, 11, 0, a); v.box(1, 1, 0, 20, 10, 0, b); v.box(0, 0, 0, 21, 0, 0, a);
    const w = label.length * 4 - 1; if (v.text) v.text(label, 11 - Math.floor(w / 2), 4, 0, 'woodDark');
  } });
  note('fx_n2_lapp50', '50', 'peach', 'cream2');
  note('fx_n2_lapp100', '100', 'sky', 'ice');
  F.VOX.def('fx_n2_pinne', { size: [3, 3, 14], scale: 1 / 16, build(v) { v.box(0, 0, 0, 2, 2, 13, 'wood'); v.box(1, 1, 0, 1, 1, 0, 'woodLight'); v.box(1, 1, 13, 1, 1, 13, 'woodLight'); } });
  F.VOX.def('fx_n2_vedbunt', { size: [13, 7, 14], scale: 1 / 16, build(v) {
    for (let i = 0; i < 10; i++) { const x = (i % 5) * 2.5 | 0, y = i < 5 ? 0 : 3; v.box(x, y, 0, x + 2, y + 2, 13, i % 2 ? 'wood' : 'woodDark'); v.set(x + 1, y + 1, 0, 'woodLight'); v.set(x + 1, y + 1, 13, 'woodLight'); }
    v.box(0, 0, 4, 12, 6, 4, 'roofRed'); v.box(0, 0, 9, 12, 6, 9, 'roofRed');
  } });
}

/* =====================================================================================================================
   2. numbers: Norwegian number words 0–100 (sju, tjue), tags
   ===================================================================================================================== */
const ONES = ['null', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni'];
const TEENS = ['ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten'];
const TENS = ['', 'ti', 'tjue', 'tretti', 'førti', 'femti', 'seksti', 'sytti', 'åtti', 'nitti'];
function numWord(n) {
  n = +n; if (!(n >= 0 && n <= 100)) return String(n);
  if (n === 100) return 'hundre';
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ONES[o] : '');
}
N2.numWord = numWord;
const rev = n => (n % 10) * 10 + Math.floor(n / 10);
function tagNum(t, v) {
  if (F.Task && F.Task.tagNum) { try { return F.Task.tagNum(t, v) || 'OTHER'; } catch (e) { /* fall through */ } }
  return +t === +v ? null : 'OTHER';
}

/* =====================================================================================================================
   3. the kit each format gets (a thin layer over S; mirrors f_num's Kit, which is private to that file)
   ===================================================================================================================== */
/* natural audit D11: the HUD band a task board's plaques must stay below (px; 0 = nothing up there). Only the top 30 % of the screen
   counts; hidden / faded-out (opacity < 5 %) elements do not. */
function hudBand() {
  let y = 0; const vh = innerHeight;
  document.querySelectorAll('#hud .hud-btn, #hchain, .ser-strip').forEach(e => {
    const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3 || r.top > vh * 0.3 || r.bottom < 0) return;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    y = Math.max(y, r.bottom);
  });
  return y;
}
function safeArea(B, bo) {
  if (!B.alive || !(B.appear >= 1)) return;
  const band = hudBand(); if (!band) return;
  const minTop = band + 12, vh = innerHeight;
  let worst = 0;
  for (const L of B.labels) {
    if (!L.visible || !L.el || L.el.style.display === 'none') continue;
    const r = L.el.getBoundingClientRect(); if (r.height < 2) continue;
    worst = Math.max(worst, minTop - r.top);
  }
  B._safeDef = worst;
  if (worst <= 0) return;
  if (bo.avoid) bo.avoid = null;                                  // the lift for the asker gives way to the task
  const d = worst / (vh / 2);                                     // px → NDC
  if (B.yNdc > -0.42) { B.yNdc = Math.max(-0.42, B.yNdc - Math.min(0.06, d * 0.6)); return; }
  if (B._far < 1.6) B._far = Math.min(1.6, B._far + Math.min(0.05, d * 0.5));
}
function Kit(item, S) {
  css(); defModels();
  const K = { item, S, offs: [], p: item.params || {}, plan: (item.params && item.params.n2) || {} };
  K.rng = U.rng((U.hashStr(String(item.id || '') + ':' + JSON.stringify(item.target) + ':' + (item.rung || 0)) ^ ((F.T.now * 1000) | 0)) >>> 0);
  // natural audit D6: a format still running after «Fly videre» / an abort says nothing more
  K.say = (id, slots) => S.ended ? Promise.resolve() : F.SAY(id, slots || {}, '');
  K.prompt = (id, slots, o) => S.prompt(id, slots || {}, Object.assign({ voice: '' }, o || {}));
  K.num = n => S.ended ? Promise.resolve() : F.SAY('core_num', { n: clamp(Math.round(+n), 0, 100) }, '');
  K.total = n => (S.ended ? Promise.resolve() : n >= 0 && n <= 40 ? F.SAY('n2_det_ble', { n }, '') : K.num(n));   // (quiet after a leave, like K.say)
  K.live = () => !S.ended && !S.solved;
  K.g = () => { if (S.ended || S.solved) throw STOP; };
  K.sayG = async (id, slots) => { K.g(); await K.say(id, slots); K.g(); };
  K.numG = async n => { K.g(); await K.num(n); K.g(); };
  K.sleepG = async ms => { K.g(); await sleep(ms); K.g(); };
  K.board = o => {
    o = o || {};
    if (S.ended) throw STOP;                                          // (the task was left meanwhile: no board after the end)
    if (!NUM().Board) throw new Error('F.NUM.Board missing (f_num.js)');
    // (bo is kept: the HUD safe area below may switch its avoid off – NUM.Board reads bo.avoid / bo.yNdc every frame)
    const bo = Object.assign({ avoid: o.fit ? null : (S.has3D && S.base ? S.base.clone().add(new V3(0, 1.3, 0)) : null) }, o);
    const B = NUM().Board(bo);
    K.B = B; B._far = 1;
    // the board floats NEAR the camera at a reduced scale (same size on screen): never sunk into the ground, never hidden behind a
    // villager standing between the camera and the stage
    const near = o.near || 0.45, d0 = B.dist;
    B.root.scale.setScalar(near);
    B.dist = function () {
      let D;
      if (o.fit) {   // a tall board (hundred board): the band between the HUD and the tray instead of the default 44 %
        const cam = F.R.camera, t = Math.tan(cam.fov * Math.PI / 360);
        const dW = (B.w + 0.4) / (0.9 * 2 * t * cam.aspect);
        const dH = (B.d * Math.sin(B.tilt) + (o.h || 0.3) * Math.cos(B.tilt)) / (o.fit * 2 * t);
        D = Math.max(4.5, dW, dH) / B.scale;
      } else D = d0.call(B);
      return D * near * (B._far || 1);
    };
    B.place();
    // natural audit D11 (#54: «the queen's gate sum under the coin purse»): the board's plaques stay in the safe area – their top at least
    // 12 px below the HUD band (purse, map / album / book icons, the quest strip, the series dots). The «keep the asker visible» lift
    // (bo.avoid) gives way first, then the board slides down (not below the middle of the lower half), then it floats a little farther
    // away (smaller on screen) until every plaque is clear.
    const offSafe = F.on('preRender', () => { try { safeArea(B, bo); } catch (e) { /* cosmetic */ } });
    K.offs.push(offSafe);
    S.widgets.push({ kind: 'nboard', dead: false, lock() {}, destroy() { try { B.dispose(); } catch (e) {} K.end(); } });
    return B;
  };
  K.arm = o => S.arm(o);
  K.widget = o => {
    const w = { kind: o.kind || 'board', values: o.values || [], dead: false, locked: false };
    w.feed = v => o.feed(v);
    w.mark = (v, cls) => { try { o.mark && o.mark(v, cls); } catch (e) { console.error('[f_num2 mark]', e); } };
    w.solution = v => { try { o.solution && o.solution(v); } catch (e) { console.error('[f_num2 solution]', e); } };
    w.lock = on => { w.locked = !!on; if (K.B) K.B.locked = !!on; if (o.lock) o.lock(on); };
    w.destroy = () => { w.dead = true; if (o.destroy) o.destroy(); };
    return S.use(w);
  };
  K.submit = (v, w) => S.submit(v, w || S.active);
  // the 1st-error hint / 2nd-error solution happen ON the board; STOP ends an animation when she solves meanwhile
  // v5 WP-R2 (playtest2 «hints»): these are AFTER-ERROR hints (her answer is acted out). Before any attempt (Puff / «Hjelp meg») the
  // stage's phase-aware S.preHint runs (WP-K2) – or, without it, «Se godt på hver av dem» + the question again; never «det ble …»
  K.hint = fn => { S.hint = async (tag, v) => {
    try {
      if (S.clearHint) S.clearHint();
      if (v == null && !(S.stepTries > 0)) {
        if (typeof S.preHint === 'function' && !S._n2pre) { S._n2pre = true; try { await S.preHint('hint'); } finally { S._n2pre = false; } }
        else if (typeof S.pre === 'function') await S.pre('hint', 0);
        else { if (F.TPL.has('kit_h_look')) await S.say('kit_h_look', {}, ''); if (S.replayPrompt) await S.replayPrompt(); }
        return;
      }
      if (v == null && Array.isArray(S.chosen) && S.chosen.length) v = S.chosen[S.chosen.length - 1];
      S.hinting = true; await fn(tag, v);
    } catch (e) { if (e !== STOP) console.error('[f_num2 hint]', e); }
    S.hinting = false; }; };
  K.sol = fn => { S._solFn = async () => { try { await fn(); } catch (e) { if (e !== STOP) console.error('[f_num2 solution]', e); } }; };
  K.tag = fn => { S.tagOf = v => { try { return fn(v) || 'OTHER'; } catch (e) { return 'OTHER'; } }; };
  // a card at the top (expression «47 + 8», «74 = 7 tiere og ? enere») – a stage note, so cleanup and stageFit know it
  K.card = (html, o) => {
    o = o || {};
    const el = document.createElement('div'); el.className = 'n2-card' + (o.cls ? ' ' + o.cls : ''); el.innerHTML = html;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    const n = { el, text: el.textContent, set(h) { el.innerHTML = h; n.text = el.textContent; }, remove() { el.remove(); } };
    S.notes.push(n); return n;
  };
  K.row = list => {   // a row of big buttons in the tray: [{id, label, cls}] -> {press(id), on(fn), glow(id,on), lock(on), btns}
    const R = { btns: {}, handler: null, locked: false };
    const row = document.createElement('div'); row.className = 'n2-row';
    list.forEach(a => { const b = document.createElement('button'); b.className = 'kbtn n2-btn ' + (a.cls || ''); b.innerHTML = a.label; b.addEventListener('click', e => { e.stopPropagation(); R.press(a.id); }); R.btns[a.id] = b; row.appendChild(b); });
    S.tray().appendChild(row); if (F.UI._trayUpd) F.UI._trayUpd();
    if (Array.isArray(S.kitEls)) S.kitEls.push(row);     // WP-K think-gate dims it while the prompt plays
    R.el = row;
    R.press = id => { if (R.locked) return false; sfx('click'); if (R.handler) R.handler(id); return true; };
    R.on = fn => { R.handler = fn; };
    R.glow = (id, on) => { const b = R.btns[id]; if (b) b.classList.toggle('glow', on !== false); };
    R.lock = on => { R.locked = !!on; row.classList.toggle('locked', R.locked); };
    R.remove = () => row.remove();
    K.offs.push(() => row.remove());
    return R;
  };
  K.actions = list => NUM().ui.Actions(S.tray(), list);
  K.piece = (model, size, o) => NUM().piece(F.VOX.has(model) ? model : 'fx_n_eple', (o && o.opts) || {}, size, o || {});
  // board plaques: dy is in board units (the board root is scaled down to float near the camera)
  K.label = (obj, text, o) => { o = Object.assign({}, o || {}); o.dy = (o.dy != null ? o.dy : 0.6) * ((K.B.root && K.B.root.scale.x) || 1); return K.B.label(obj, String(text), o); };
  K.anchor = (x, y, z) => { const a = new THREE.Object3D(); a.position.set(x, y, z); K.B.top.add(a); return a; };
  K.onCanvas = (type, fn) => { const cv = F.R.renderer.domElement; cv.addEventListener(type, fn, true); K.offs.push(() => cv.removeEventListener(type, fn, true)); };
  K.end = () => { K.offs.splice(0).forEach(f => { try { f(); } catch (e) {} }); if (N2.cur && N2.cur.kit === K) N2.cur = null; };
  // keypad with fixed slots (3 up to 100; hint_leaks C3 – the box count never reveals the answer's length); s0 may show the length
  K.keypad = (answer, o) => { o = Object.assign({}, o || {}); delete o.showLen; return S.keypad(Object.assign({ answer, len: 3 }, o)); };
  // screen-space raycast onto a board mesh → local point in mesh.parent's frame (or null)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  K.hitLocal = (mesh, cx, cy) => {
    const r = F.R.renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, F.R.camera);
    mesh.updateMatrixWorld(true);
    const h = ray.intersectObject(mesh, false)[0]; if (!h) return null;
    return { local: mesh.parent.worldToLocal(h.point.clone()), uv: h.uv };
  };
  N2.cur = { kit: K, format: item.format, item };
  return K;
}
const M = () => NUM().motion || { hopTo: () => Promise.resolve(), popIn: () => Promise.resolve(), bounce: () => Promise.resolve(), shake: () => Promise.resolve(), glowObj() {} };
const beeModel = () => F.VOX.has('bie') ? 'bie' : F.VOX.has('humle') ? 'humle' : 'fx_n_fe';
const frogModel = () => F.VOX.has('frosk') ? 'frosk' : 'fx_n_fe';
const fairyDress = () => ({ krystall: 'ice', blomst: 'pink', boble: 'sky', stjerne: 'butter' }[(F.save && F.save.fairy) || 'krystall'] || 'lilac');

/* =====================================================================================================================
   4. items: the DESIGN4 §2.9 contract + local generators (fallback behind WP-B1) + prep (adapt any bank item to a plan)
   ===================================================================================================================== */
const THINK_DEF = { F42: 'REGNE', F43: 'REGNE', F44: 'REGNE', F46: 'REGNE', F47: 'HUSKE', F48: 'REGNE', F49: 'REGNE' };
function thinkOf(item, fmt) {
  try { const r = F.LADDERS && F.LADDERS.rung && F.LADDERS.rung(item.strand, item.rung); if (r && r.think) return r.think; } catch (e) {}
  return THINK_DEF[fmt] || 'REGNE';
}
// v5 WP-R2 (wave-1 REQUEST WP-B1 → WP-N): a bank item kept as is keeps its OWN secret words and misconception tags – they are merged
// with the format's (a fresh local item replaces them: o.keep = false)
function contract(item, fmt, c, o) {
  const keep = !!(o && o.keep);
  const bankSecret = keep && Array.isArray(item.secret) ? item.secret.map(String) : [];
  const bankDs = keep && Array.isArray(item.distractors) ? item.distractors.filter(d => d && d.tag) : [];
  item.g = c.g != null ? c.g : 0.01;
  item.mode = c.mode || 'keypad';
  item.think = c.think || thinkOf(item, fmt);
  item.secret = [...new Set(bankSecret.concat((c.secret || []).map(String)))];
  if (c.twin) item.twin = c.twin;
  if (c.distractors) {
    const mine = c.distractors.slice(), seen = new Set(mine.map(d => JSON.stringify(d.v)));
    for (const d of bankDs) if (!seen.has(JSON.stringify(d.v))) { mine.push(d); seen.add(JSON.stringify(d.v)); }
    item.distractors = mine;
  } else if (keep) item.distractors = bankDs;
  // a distractor must never be the answer (tests feed distractors[0] as «a wrong answer»; tags must stay honest)
  const t = item.target;
  if (typeof t === 'number') {
    item.distractors = (item.distractors || []).filter(d => d && isNum(d.v) && +d.v !== t && +d.v >= 0);
    if (!item.distractors.length) item.distractors.push({ v: t + 1, tag: 'OFF-BY-ONE' });
  }
  return item;
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
// the bank's focal number when it is usable (a number in [lo, hi])
const bankNum = (item, lo, hi) => { const t = isNum(item.target) ? +item.target : isNum(item.n) ? +item.n : null; return t != null && t >= lo && t <= hi && Math.round(t) === t ? t : null; };
const P = item => item.params || {};
// a bank display equation ('6 + □ = 10', '? − 7 = 8', '14 − 6') → {x, op, y, z} with null for the unknown (z null when no '=')
function eqOf(eq) {
  if (typeof eq !== 'string') return null;
  const s = eq.replace(/−/g, '-').replace(/[□?]/g, '?').replace(/\s+/g, '');
  const v = x => x === '?' || x === undefined ? null : +x;
  const m2 = /^(\d+|\?)=(\d+|\?)([+-])(\d+|\?)$/.exec(s);          // «10 = 5 + □» → «5 + □ = 10»
  if (m2) return { x: v(m2[2]), op: m2[3], y: v(m2[4]), z: v(m2[1]), hasEq: true };
  const m = /^(\d+|\?)([+-])(\d+|\?)(?:=(\d+|\?))?$/.exec(s); if (!m) return null;
  return { x: v(m[1]), op: m[2], y: v(m[3]), z: v(m[4]), hasEq: m[4] !== undefined };
}

const GEN = N2.GEN = {};
/* ---------- F42 Hundretavla */
GEN.F42 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  if (strand === 'T-NAVN') {
    const win = (t, nRows) => {
      const rt = Math.floor((t - 1) / 10), rv = rev(t), rr = t % 10 && Math.floor(t / 10) && rv >= 1 && rv <= 100 ? Math.floor((rv - 1) / 10) : rt;
      let r0 = clamp(rt - int(r, 0, nRows - 1), 0, 10 - nRows);
      if (Math.abs(rr - rt) < nRows) { const lo = Math.min(rr, rt), hi = Math.max(rr, rt); r0 = clamp(lo - int(r, 0, nRows - 1 - (hi - lo)), 0, 10 - nRows); }
      return { r0, r1: r0 + nRows - 1 };
    };
    if (rung >= 11 && sup === 0) {      // s0: half the board (5 rows), the reversal in reach when it fits
      const t = bankNum(item, 1, 100) || int(r, 11, 99);
      const w = win(t, 5);
      if (rung >= 12) return { target: t, plan: { mode: 'read', r0: w.r0, r1: w.r1, word: numWord(t) }, c: { mode: 'grid', g: 0.02, secret: [] } };
      return { target: t, plan: { mode: 'find', r0: w.r0, r1: w.r1 }, c: { mode: 'grid', g: 0.02, secret: [String(t)] } };
    }
    if (rung >= 12) {        // read a written number word → tap it (reading target: never spoken)
      const tricky = [59, 91, 19, 90, 33, 47, 74, 68, 86, 13, 30, 71, 17, 70, 25, 52, 99, 61, 16, 60, 82, 28, 100, 44];
      const t = bankNum(item, 11, 100) || (r() < 0.75 ? pick(r, tricky) : int(r, 21, 99));
      return { target: t, plan: { mode: 'read', r0: 0, r1: 9, word: numWord(t) }, c: { mode: 'grid', g: 0.01, secret: [] } };
    }
    if (rung >= 11) {        // whole board 1–100, the whole contrast family is always present
      const fam = [68, 86, 18, 19, 90, 91, 9, 70, 17, 71, 77, 13, 30, 31, 14, 40, 41, 15, 50, 51, 16, 60, 61, 37, 73, 46, 64, 29, 92, 100, 12, 21, 24, 42];
      const t = bankNum(item, 1, 100) || (r() < 0.7 ? pick(r, fam) : int(r, 1, 100));
      return { target: t, plan: { mode: 'find', r0: 0, r1: 9 }, c: { mode: 'grid', g: 0.01, secret: [String(t)] } };
    }
    // N10: 20–50 on a 5-row window that also holds the reversal (37 → 73 in reach) when it can
    const t = bankNum(item, 1, 100) || int(r, 20, 50);
    const rt = Math.floor((t - 1) / 10), rr = t % 10 && Math.floor(t / 10) ? Math.floor((rev(t) - 1) / 10) : rt;
    const nRows = sup === 0 ? 3 : 5;
    let r0 = clamp(rt - int(r, 0, nRows - 1), 0, 10 - nRows);
    if (Math.abs(rr - rt) < nRows && rev(t) >= 1 && rev(t) <= 100) { const lo = Math.min(rr, rt), hi = Math.max(rr, rt); r0 = clamp(lo - int(r, 0, nRows - 1 - (hi - lo)), 0, 10 - nRows); }
    return { target: t, plan: { mode: 'find', r0, r1: r0 + nRows - 1 }, c: { mode: 'grid', g: 1 / (nRows * 10), secret: [String(t)] } };
  }
  if (strand === 'REGN') {   // R9: 2-digit ± 1-digit without crossing, ± whole tens – the bee walks it on the board
    let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null, op = pp.op === '-' || pp.op === '−' ? '-' : pp.op === '+' ? '+' : null;
    const ok = a != null && b != null && op && a >= 1 && a <= 100 && (op === '+' ? a + b : a - b) >= 1 && (op === '+' ? a + b : a - b) <= 100 &&
      ((b < 10 && Math.floor(a / 10) === Math.floor((op === '+' ? a + b : a - b) / 10)) || b % 10 === 0) && a % 10 !== 0;
    if (!ok) {
      op = r() < 0.55 ? '+' : '-';
      if (r() < 0.5) { b = int(r, 1, 4) * 10; a = op === '+' ? int(r, 11, 99 - b) : int(r, b + 1, 99); if (a % 10 === 0) a++; }
      else { a = int(r, 2, 9) * 10 + int(r, op === '+' ? 1 : 3, op === '+' ? 6 : 9); b = op === '+' ? int(r, 1, 9 - a % 10) : int(r, 1, a % 10 - 1); }
      if (a % 10 === 0) a += 1;
      if (op === '+' && b < 10 && a % 10 + b > 9) b = 9 - a % 10;
      if (op === '-' && b < 10 && a % 10 - b < 1) b = a % 10 - 1;
      if (b < 1) { op = '+'; b = 10; }
    }
    const t = op === '+' ? a + b : a - b;
    const moves = []; const tens = Math.floor(b / 10), ones = b % 10, sg = op === '+' ? 1 : -1;
    if (tens) moves.push({ d: sg * 10 * tens }); if (ones) moves.push({ d: sg * ones });
    return { target: t, plan: { mode: 'calc', r0: 0, r1: 9, start: a, expr: `${a} ${op === '+' ? '+' : '−'} ${b}`, moves, fog: sup }, c: { mode: 'grid', g: 0.01,
      distractors: [{ v: op === '+' ? t + (b < 10 ? 10 : 1) : t - (b < 10 ? 10 : 1), tag: 'NO-CARRY' }] } };
  }
  // T-ORDEN
  if (rung === 11) {         // moves of ±1 / ±10 from a start tile (foggy board)
    const two = sup >= 2 && r() < 0.6;
    for (let k = 0; k < 60; k++) {
      const s = isNum(pp.start) ? +pp.start : int(r, 1, 100);
      const rowMoves = [['én rad ned', 10], ['to rader ned', 20], ['tre rader ned', 30], ['én rad opp', -10], ['to rader opp', -20], ['tre rader opp', -30]];
      const stepMoves = [['ett steg til høyre', 1], ['to steg til høyre', 2], ['ett steg til venstre', -1], ['to steg til venstre', -2]];
      const merMoves = [['én mer', 1], ['ti mer', 10], ['én mindre', -1], ['ti mindre', -10]];
      let moves;
      if (!two && r() < 0.3) { const m = pick(r, merMoves); moves = [{ mer: m[0], d: m[1], k: 1 }]; }
      else if (two) moves = [pick(r, rowMoves), pick(r, stepMoves)].map(m => ({ m: m[0], d: m[1] }));
      else { const m = r() < 0.7 ? pick(r, rowMoves) : pick(r, stepMoves); moves = [{ m: m[0], d: m[1] }]; }
      let cur = s, ok = true;
      for (const mv of moves) {
        const nx = cur + mv.d;
        if (nx < 1 || nx > 100) { ok = false; break; }
        if (mv.m && Math.abs(mv.d) < 10 && Math.floor((cur - 1) / 10) !== Math.floor((nx - 1) / 10)) { ok = false; break; }   // steps never wrap a row
        cur = nx;
      }
      if (!ok || cur === s) continue;
      return { target: cur, plan: { mode: 'move', r0: 0, r1: 9, start: s, moves, fog: sup }, c: { mode: 'grid', g: 0.01,
        distractors: [{ v: clamp(cur + (Math.abs(moves[0].d) >= 10 ? (moves[0].d > 0 ? -9 : 9) : 9), 1, 100), tag: 'ROW-STEP' }] } };
    }
  }
  if (rung === 10 && r() < 0.5 && !(pp.between)) {      // neighbours across tens
    const dir = pp.dir === 'before' || pp.dir === 'før' ? 'before' : pp.dir === 'after' || pp.dir === 'etter' ? 'after' : (r() < 0.5 ? 'after' : 'before');
    let ref = isNum(pp.ref) ? +pp.ref : bankNum(item, 2, 99);
    if (ref == null || (dir === 'after' && ref >= 100) || (dir === 'before' && ref <= 1)) ref = dir === 'after' ? (r() < 0.6 ? int(r, 1, 9) * 10 + 9 : int(r, 11, 98)) : (r() < 0.6 ? int(r, 2, 10) * 10 : int(r, 12, 99));
    const t = dir === 'after' ? ref + 1 : ref - 1;
    if (t >= 1 && t <= 100) return { target: t, plan: { mode: 'nb', r0: 0, r1: 9, ref, dir, fog: sup }, c: { mode: 'grid', g: 0.01,
      distractors: [{ v: dir === 'after' ? (ref % 10 === 9 ? ref - 8 : ref + 10) : (ref % 10 === 0 ? ref + 9 : ref - 10), tag: 'ROW-END' }] } };
  }
  // between (O10: «mellom 57 og 61» → 58 59 60; O12: «større enn 32 og mindre enn 40» → 33–39)
  const span = rung >= 12 ? int(r, 5, 8) : int(r, 3, 4);
  let lo = isNum(pp.a) && isNum(pp.b) ? Math.min(+pp.a, +pp.b) : null, hi = lo != null ? Math.max(+pp.a, +pp.b) : null;
  if (lo == null || hi - lo < 2 || hi - lo > 9 || lo < 1 || hi > 100) {
    for (let k = 0; k < 40; k++) { lo = int(r, 1, 100 - span); hi = lo + span; const crosses = Math.floor(lo / 10) !== Math.floor((hi - 1) / 10); if (r() < 0.6 ? crosses : true) break; }
  }
  const ans = range(lo + 1, hi - 1);
  return { target: ans, plan: { mode: 'between', r0: 0, r1: 9, lo, hi, fog: sup }, c: { mode: 'subset', g: 0.01,
    distractors: [{ v: [lo].concat(ans), tag: 'INCLUSIVE' }] } };
};

/* ---------- F43 Bunter og plater */
const SURF = {
  egg: { one: 'fx_n_egg', ten: () => NUM().tenDef ? NUM().tenDef('fx_n_egg', 'frames') : 'fx_n_egg', pl: 'egg', is: 'En full eggekartong er ti egg', board: 'wood', tenSize: 1.0, oneSize: 0.26, tenLay: 'grid' },
  ved: { one: 'fx_n2_pinne', ten: () => 'fx_n2_vedbunt', pl: 'pinner', is: 'En vedbunt er ti pinner', board: 'grass', tenSize: 0.62, oneSize: 0.5, tenLay: 'grid', oneRot: true },
  krystall: { one: 'fx_n_krystall', ten: () => NUM().tenDef ? NUM().tenDef('fx_n_krystall', 'rows') : 'fx_n_krystall', pl: 'krystaller', is: 'En stav er ti krystaller', board: 'velvet', tenSize: 2.2, oneSize: 0.24, tenLay: 'rods' },
  kroner: { one: 'fx_n_mynt1', ten: () => 'fx_n_mynt10', pl: 'kroner', is: 'En tikrone er ti kroner', board: 'counter', tenSize: 0.72, oneSize: 0.5, tenLay: 'coins' },
};
GEN.F43 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  const surf = pp.surface && SURF[pp.surface] ? pp.surface : pick(r, ['egg', 'ved', 'krystall', 'kroner']);
  if (strand === 'T-SKRIV') {         // W9: write the numeral shown by another representation
    const t = bankNum(item, 11, 99) || int(r, 2, 9) * 10 + int(r, 0, 9);
    const s = r() < 0.5 ? 'kroner' : (r() < 0.5 ? 'krystall' : 'egg');
    return { target: t, plan: { mode: 'count', surf: s, tens: Math.floor(t / 10), ones: t % 10, ask: s === 'kroner' ? 'kroner' : 'tall' },
      c: { mode: 'keypad', distractors: [{ v: Math.floor(t / 10) + t % 10, tag: 'PV-CONCAT' }, { v: rev(t), tag: 'REVERSAL' }] } };
  }
  if (rung <= 11) {                   // M11: count bundled sets 20–100 without counting ones
    const t = bankNum(item, 20, 100) || int(r, 2, 9) * 10 + int(r, 0, 9);
    return { target: t, plan: { mode: 'count', surf, tens: Math.floor(t / 10), ones: t % 10, ask: surf },
      c: { mode: 'keypad', distractors: [{ v: Math.floor(t / 10) + t % 10, tag: 'PV-CONCAT' }, { v: rev(t), tag: 'REVERSAL' }] } };
  }
  if (rung === 12) {                  // M12: build any 2-digit number
    const t = bankNum(item, 10, 99) || (r() < 0.25 ? int(r, 2, 9) * 10 : int(r, 11, 99));
    const s = surf === 'egg' ? 'krystall' : surf;
    return { target: t, plan: { mode: 'build', surf: s }, c: { mode: 'build', distractors: [{ v: t + 10 <= 99 ? t + 10 : t - 10, tag: 'COUNT-ONES' }, { v: rev(t), tag: 'REVERSAL' }] } };
  }
  if (rung === 13) {                  // M13: tens and ones, both directions
    const sub = pp.sub || pick(r, ['ones', 'num', 'tens']);
    if (sub === 'tens') { const k = int(r, 2, 9); const n = k * 10; return { target: k, plan: { mode: 'pv', sub, n, tens: k, ones: 0, surf: 'krystall' }, c: { mode: 'keypad', distractors: [{ v: n, tag: 'PV-ZERO' }] } }; }
    const tt = int(r, 1, 9), oo = int(r, 1, 9), n = tt * 10 + oo;
    if (sub === 'ones') return { target: oo, plan: { mode: 'pv', sub, n, tens: tt, ones: oo, surf: 'krystall' }, c: { mode: 'keypad', distractors: [{ v: tt, tag: 'REVERSAL' }] } };
    return { target: n, plan: { mode: 'pv', sub: 'num', n, tens: tt, ones: oo, surf: 'krystall' }, c: { mode: 'keypad', distractors: [{ v: oo * 10 + tt, tag: 'REVERSAL' }, { v: tt + oo, tag: 'PV-CONCAT' }] } };
  }
  if (rung === 14) {                  // M14: rename non-standard groupings
    const sub = pp.sub || (r() < 0.55 ? 'compose' : 'split');
    const tt = int(r, 2, 8), extra = int(r, 11, 19);
    if (sub === 'compose') { const t = tt * 10 + extra; return { target: t, plan: { mode: 'rename', sub, tens: tt, ones: extra, surf: 'krystall' },
      c: { mode: 'keypad', distractors: [{ v: Number(String(tt) + String(extra)), tag: 'PV-CONCAT' }, { v: tt * 10 + extra % 10, tag: 'NO-CARRY' }] } }; }
    const n = (tt + 1) * 10 + (extra - 10);     // 63 = 5 tiere og 13 enere
    return { target: extra, plan: { mode: 'rename', sub, n, tens: tt, surf: 'krystall' }, c: { mode: 'keypad', distractors: [{ v: extra - 10, tag: 'NO-CARRY' }] } };
  }
  // M15: coins and notes ≤ 100 kr – count them, or pay with the fewest
  const VAL = [50, 20, 10, 5, 1];
  const greedy = n => { const out = []; for (const v of VAL) while (n >= v) { out.push(v); n -= v; } return out; };
  if ((pp.sub || (sup >= 1 && r() < 0.55 ? 'pay' : 'count')) === 'pay') {
    const t = bankNum(item, 6, 99) || pick(r, [87, 37, 57, 46, 68, 92, 29, 74, 33, 56, 18, 41, 63, 95]);
    const g = greedy(t);
    return { target: t, plan: { mode: 'pay', price: t, fewest: g.length, best: g }, c: { mode: 'build', distractors: [{ v: 'NOT-FEWEST', tag: 'NOT-FEWEST' }] } };
  }
  const coins = [];
  let total = bankNum(item, 8, 100) || int(r, 18, 99);
  const g = greedy(total);
  // not always the greedy set: split one 20 into 10+10 or a 10 into 5+5 sometimes (still easy to read)
  for (const v of g) { if (v === 20 && r() < 0.3) coins.push(10, 10); else if (v === 10 && r() < 0.25) coins.push(5, 5); else coins.push(v); }
  return { target: total, plan: { mode: 'coins', coins: shuffle(r, coins) }, c: { mode: 'keypad', distractors: [{ v: coins.length, tag: 'COUNT-OBJECTS' }] } };
};

/* ---------- F44 Tallinjebroen */
GEN.F44 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  if (strand === 'T-ORDEN' && rung <= 9) {        // O9: 0–20 with only the ends marked, ±1
    const t = bankNum(item, 1, 19) || pick(r, [13, 5, 17, 8, 3, 15, 11, 18, 6, 12, 4, 16, 9, 14, 7, 2, 19]);
    if ((pp.sub === 'arrow' || (!pp.sub && sup >= 1 && r() < 0.35)) && t !== 10)   // the production twin: «Hvilket tall viser pila?»
      return { target: t, plan: { mode: 'arrow', min: 0, max: 20, at: t, ticks: 'units', labels: sup === 2 ? [0, 20] : [0, 10, 20] }, c: { mode: 'keypad', distractors: [{ v: 20 - t, tag: 'MIRROR' }, { v: t + 1, tag: 'OFF-BY-ONE' }] } };
    return { target: t, plan: { mode: 'place', min: 0, max: 20, tol: 1, ticks: sup === 0 ? 'units' : sup === 1 ? 'mid' : 'none', labels: sup === 0 ? [0, 10, 20] : [0, 20] },
      c: { mode: 'line', g: 3 / 21, twin: 'F44', distractors: [{ v: t <= 10 ? t + 6 : t - 6, tag: 'FAR' }] } };
  }
  if (strand === 'T-ORDEN') {                     // O13: 0–100 with the tens marked (±3), midpoints, read a mark
    const sub = pp.sub || pick(r, sup === 0 ? ['place', 'arrow'] : ['place', 'place', 'mid', 'arrow']);
    if (sub === 'mid') {
      const a = int(r, 0, 8) * 10, b = a + (r() < 0.7 ? 10 : 20), t = (a + b) / 2;
      return { target: t, plan: { mode: 'mid', min: 0, max: 100, a, b, ticks: 'tens', labels: [0, 50, 100, a, b] }, c: { mode: 'keypad', distractors: [{ v: t + 1, tag: 'OFF-BY-ONE' }] } };
    }
    if (sub === 'arrow') {
      const d = int(r, 1, 8) * 10, t = d + int(r, 1, 9);
      return { target: t, plan: { mode: 'arrow', min: 0, max: 100, at: t, ticks: 'tens+units:' + d, labels: [0, 50, 100, d, d + 10] }, c: { mode: 'keypad', distractors: [{ v: t + 1, tag: 'OFF-BY-ONE' }, { v: d + 10 - (t - d), tag: 'MIRROR' }] } };
    }
    const t = bankNum(item, 2, 98) || int(r, 3, 97);
    return { target: t, plan: { mode: 'place', min: 0, max: 100, tol: 3, ticks: sup === 2 ? 'tens' : 'tens', labels: sup === 0 ? range(0, 10).map(k => k * 10) : sup === 1 ? [0, 50, 100] : [0, 100] },
      c: { mode: 'line', g: 7 / 101, twin: 'F44', distractors: [{ v: rev(t) !== t && rev(t) <= 100 && Math.abs(rev(t) - t) > 3 ? rev(t) : t > 50 ? t - 20 : t + 20, tag: 'REVERSAL' }] } };
  }
  if (strand === 'T-SKRIV') {                     // W9: «pila midt mellom 30 og 40 → 35» (read the arrow, write it)
    const d = int(r, 1, 8) * 10, t = r() < 0.5 ? d + 5 : d + int(r, 1, 9);
    return { target: t, plan: { mode: 'arrow', min: d, max: d + 10, at: t, ticks: 'units', labels: [d, d + 10] }, c: { mode: 'keypad', distractors: [{ v: t + 1, tag: 'OFF-BY-ONE' }] } };
  }
  // REGN R10: 2-digit ± 1-digit across a ten – the frog hops; she taps the landing tick (exact)
  let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null, op = pp.op === '-' || pp.op === '−' ? '-' : pp.op === '+' ? '+' : null;
  const crosses = (a, b, op) => op === '+' ? (a % 10) + b > 10 - 1 && (a + b) % 10 !== 0 : (a % 10) < b;
  if (!(a != null && b != null && op && b >= 2 && b <= 9 && a >= 11 && a <= 98 && crosses(a, b, op) && (op === '+' ? a + b <= 100 : a - b >= 1))) {
    op = r() < 0.6 ? '+' : '-';
    for (let k = 0; k < 50; k++) {
      a = int(r, 12, 95); b = int(r, 3, 9);
      if (crosses(a, b, op) && (op === '+' ? a + b < 100 : a - b > 0) && a % 10 !== 0) break;
    }
  }
  const t = op === '+' ? a + b : a - b;
  const lo = op === '+' ? Math.floor(a / 10) * 10 : Math.floor(t / 10) * 10;
  return { target: t, plan: { mode: 'jump', min: lo, max: lo + 20, a, b, op, expr: `${a} ${op === '+' ? '+' : '−'} ${b}`, tol: 0, ticks: 'units', labels: [lo, lo + 10, lo + 20] },
    c: { mode: 'line', g: 1 / 21, distractors: [{ v: op === '+' ? t - 10 : t + 10, tag: 'NO-CARRY' }] } };
};

/* ---------- F46 Hulen med teppet */
GEN.F46 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  if (rung === 2) {                     // every split of 5–10 as a systematic list
    const n = isNum(pp.whole) && +pp.whole >= 3 && +pp.whole <= 10 ? +pp.whole : (sup === 0 ? int(r, 4, 5) : sup === 1 ? int(r, 5, 7) : int(r, 6, 9));
    const all = range(0, n).map(k => k + '+' + (n - k));
    return { target: all, plan: { mode: 'list', whole: n }, c: { mode: 'build', g: 0.01, distractors: [{ v: 'missing', tag: 'MISSING' }] } };
  }
  const be = eqOf(pp.eq), bt = isNum(item.target) ? +item.target : null;
  if (be && bt != null && (rung === 1 || rung >= 6)) {   // the bank's own equation, acted out in the cave
    const tk = (pl, c) => ({ target: bt, plan: pl, c: Object.assign({ mode: 'keypad' }, c || {}) });
    if (be.op === '+' && be.hasEq && be.z != null && (be.x == null) !== (be.y == null) && bt === be.z - (be.x != null ? be.x : be.y) && be.z <= 20)
      return tk({ mode: 'cave', whole: be.z, shown: be.x != null ? be.x : be.y, eq: `${be.x != null ? be.x : '<span class="q">?</span>'} + ${be.y != null ? be.y : '<span class="q">?</span>'} = ${be.z}` });
    if (be.op === '-' && be.x != null && be.y != null && (!be.hasEq || be.z == null) && bt === be.x - be.y && be.x <= 20)
      return tk({ mode: 'take', whole: be.x, gone: be.y, eq: `${be.x} − ${be.y} = <span class="q">?</span>` });
    if (be.op === '-' && be.x == null && be.y != null && be.z != null && bt === be.y + be.z && bt <= 20)
      return tk({ mode: 'first', whole: bt, gone: be.y, left: be.z, eq: `<span class="q">?</span> − ${be.y} = ${be.z}` });
    if (be.op === '-' && be.x != null && be.y == null && be.z != null && bt === be.x - be.z && be.x <= 20)
      return tk({ mode: 'flew', whole: be.x, gone: bt, left: be.z, eq: `${be.x} − <span class="q">?</span> = ${be.z}` });
  }
  if (rung >= 6) {                      // fact families, the unknown in any position
    let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null;
    if (!(a > 0 && b > 0 && a + b <= 20)) { a = int(r, 3, 9); b = int(r, Math.max(2, 11 - a), 9); }
    const c = a + b;
    const sub = pp.sub || pick(r, ['part', 'part', 'first', 'flew']);
    if (sub === 'first') return { target: c, plan: { mode: 'first', whole: c, gone: b, left: a, eq: `<span class="q">?</span> − ${b} = ${a}` }, c: { mode: 'keypad', distractors: [{ v: a - b > 0 ? a - b : a + b + 1, tag: 'SMALLER-FROM-LARGER' }, { v: Math.abs(a - b), tag: 'SMALLER-FROM-LARGER' }] } };
    if (sub === 'flew') return { target: b, plan: { mode: 'flew', whole: c, gone: b, left: a, eq: `${c} − <span class="q">?</span> = ${a}` }, c: { mode: 'keypad', distractors: [{ v: c + a <= 40 ? c + a : a, tag: 'ADD-ALL' }] } };
    return { target: b, plan: { mode: 'cave', whole: c, shown: a, eq: `${a} + <span class="q">?</span> = ${c}` }, c: { mode: 'keypad', distractors: [{ v: c + a <= 40 ? c + a : c, tag: 'ADD-ALL' }, { v: c, tag: 'OPERATIONAL' }] } };
  }
  // R1: bonds to 10 – the part under the cloth; «10 − 8»: some fly out of the cloth
  const whole = isNum(pp.whole) && +pp.whole >= 5 && +pp.whole <= 10 ? +pp.whole : 10;
  const t = bankNum(item, 1, whole - 1) || int(r, 1, whole - 1);
  if (sup >= 1 && r() < 0.35) return { target: t, plan: { mode: 'take', whole, gone: whole - t, eq: `${whole} − ${whole - t} = <span class="q">?</span>` }, c: { mode: 'keypad', distractors: [{ v: whole - t, tag: 'OTHER' }] } };
  return { target: t, plan: { mode: 'cave', whole, shown: whole - t, eq: `${whole - t} + <span class="q">?</span> = ${whole}` }, c: { mode: 'keypad', distractors: [{ v: whole - t, tag: 'OTHER' }, { v: whole + (whole - t), tag: 'ADD-ALL' }] } };
};

/* ---------- F47 Tiervenn-portene: 5 facts of one rung */
function fact(rung, r, sup) {
  const q = (s, a, kind) => ({ q: s, a, kind });
  if (rung === 1) { const a = int(r, 1, 9); return r() < 0.6 ? q(`${a} + ? = 10`, 10 - a, 'tiervenn') : q(`10 − ${a}`, 10 - a, 'tiervenn'); }
  if (rung === 3) { const a = int(r, 2, 9); const k = r(); return k < 0.45 ? q(`${a} + ${a}`, 2 * a, 'dobbel') : k < 0.75 ? q(`${a} + ${a + 1}`, 2 * a + 1, 'naer') : q(`${2 * a} − ${a}`, a, 'dobbel'); }
  if (rung === 5) { const b = int(r, 3, 9), a = int(r, 11, 10 + b - 1); return q(`${a} − ${b}`, a - b, 'enere'); }
  if (rung === 9) {
    const k = r();
    if (k < 0.35) { const a = int(r, 2, 8) * 10 + int(r, 1, 5), b = int(r, 1, 9 - a % 10); return q(`${a} + ${b}`, a + b, 'tiere'); }
    if (k < 0.7) { const b = int(r, 1, 5) * 10, a = int(r, 11, 99 - b); return q(`${a} + ${b}`, a + b, 'tiere'); }
    const b = int(r, 1, 6) * 10, a = int(r, b + 11, 99); return q(`${a} − ${b}`, a - b, 'tiere');
  }
  // v5r fix1 (review #6/#7): R11 2-digit ± 2-digit with regrouping; R12 complements to 100
  // v5r2: the support level shapes ALL 5 gates like banks_regn R[11]/R[12] (it shaped only the first): R11 s0 = plus with a ≤ 59,
  // b ≤ 39; R12 s0 = whole tens, s1 + fives, s2 any 2-digit. Kinds 'veksle' / 'veksleM' / 'hundre' pick the rung's own hint
  if (rung === 11) {
    for (let k = 0; k < 200; k++) {
      if (sup === 0) { const a = int(r, 13, 59), b = int(r, 11, 39); if ((a % 10) + (b % 10) >= 10 && a + b <= 99) return q(`${a} + ${b}`, a + b, 'veksle'); continue; }
      if (r() < 0.5) { const a = int(r, 13, 79), b = int(r, 11, 99 - a); if ((a % 10) + (b % 10) >= 10 && a + b <= 99) return q(`${a} + ${b}`, a + b, 'veksle'); }
      else { const b = int(r, 11, 69), a = int(r, b + 10, 98); if ((a % 10) < (b % 10) && a - b >= 10) return q(`${a} − ${b}`, a - b, 'veksleM'); }
    }
    return q('47 + 38', 85, 'veksle');
  }
  if (rung === 12) {
    let a;
    if (sup === 0) a = 10 * int(r, 1, 9);
    else if (sup === 1) a = r() < 0.5 ? 10 * int(r, 1, 9) : 10 * int(r, 1, 9) - 5;
    else do { a = int(r, 11, 89); } while (r() < 0.5 && a % 10 === 0);
    return q(`${a} + ? = 100`, 100 - a, 'hundre');
  }
  // R8: all + and − facts within 20
  if (r() < 0.5) { const a = int(r, 2, 9), b = int(r, 2, 9); return q(`${a} + ${b}`, a + b, a + b > 10 ? 'fyll' : a + b === 10 ? 'tiervenn10' : 'tell'); }
  const b = int(r, 2, 9), a = int(r, b + 1, Math.min(20, b + 9)); return q(`${a} − ${b}`, a - b, a > 10 && a - b < 10 ? 'enere' : a <= 10 ? 'bakover' : 'tiere');
}
GEN.F47 = function (strand, rung, sup, r, item) {
  const rr = [1, 3, 5, 8, 9, 11, 12].includes(rung) ? rung : 8;
  const facts = [], seen = new Set();
  const be = eqOf(P(item || {}).eq), bt = item && isNum(item.target) ? +item.target : null;
  if (be && bt != null && bt >= 0 && bt <= 100) {
    const q = String(P(item).eq).replace(/□/g, '?').replace(/-/g, '−');
    const op = be.op, xs = [be.x, be.y, be.z].filter(v => v != null), big = Math.max(...xs, bt);
    const kind = rr === 1 ? 'tiervenn' : rr === 3 ? 'dobbel' : rr === 5 ? 'enere' : rr === 9 ? 'tiere' : rr === 12 ? 'hundre' : rr === 11 ? (op === '+' ? 'veksle' : 'veksleM')
      : op === '+' ? (big > 10 && Math.min(...xs) < 10 ? 'fyll' : 'tell') : (big > 10 && bt < 10 ? 'enere' : 'bakover');
    facts.push({ q, a: bt, kind }); seen.add(q);
  }
  // v5r2b: the engine's Set check (REGN 8 mastered, fact deck short) names the facts it needs ('REGN:a+b' keys in params.setFacts):
  // they fill the gates – each asked as a + b or as (a+b) − b, so the engine's fact Leitner maps it back to the same key
  if (rr === 8 && Array.isArray(P(item || {}).setFacts)) for (const k of P(item).setFacts) {
    const m = /^REGN:(\d+)\+(\d+)$/.exec(String(k)); if (!m || facts.length >= 5) continue;
    const a = +m[1], b = +m[2], c = a + b; if (a > 10 || b > 10) continue;
    const f = r() < 0.5 ? { q: `${a} + ${b}`, a: c, kind: c > 10 && a < 10 && b < 10 ? 'fyll' : c === 10 ? 'tiervenn10' : 'tell' }
      : { q: `${c} − ${b}`, a, kind: c > 10 && a < 10 ? 'enere' : c <= 10 ? 'bakover' : 'tiere' };
    if (!seen.has(f.q)) { seen.add(f.q); facts.push(f); }
  }
  for (let k = 0; facts.length < 5 && k < 80; k++) { const f = fact(rr, r, sup); if (!seen.has(f.q)) { seen.add(f.q); facts.push(f); } }
  // (R11/R12 are worked sums, not recall: «slow» only after a 12 s median – never B for thinking)
  return { target: facts[0].a, plan: { mode: 'gates', facts, rung: rr, fluMs: rr >= 11 ? 12000 : 3500 }, c: { mode: 'keypad', g: 0.01, think: rr === 8 ? 'HUSKE' : undefined } };
};

/* ---------- F48 Tibrettet (2T) */
GEN.F48 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  if (rung === 7) {
    const tm = Array.isArray(pp.terms) ? pp.terms.map(Number) : null;
    if (tm && tm.length === 3 && tm.every(v => v > 0 && v < 10)) {
      const pr = [[0, 1], [0, 2], [1, 2]].filter(([i, j]) => tm[i] + tm[j] === 10);
      if (pr.length === 1) return { target: tm[0] + tm[1] + tm[2], plan: { mode: 'three', plates: tm, pair: pr[0], expr: tm.join(' + ') }, c: { mode: 'twostep', g: 0.01 / 3, distractors: [{ v: tm[0] + tm[1] + tm[2] + 10, tag: 'OTHER' }] } };
    }
    let p = pick(r, [1, 2, 3, 4, 6, 7, 8, 9]), q = 10 - p, x = pick(r, [2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== p && v !== q));
    const tagged = shuffle(r, [{ v: p, k: 'p' }, { v: x, k: 'x' }, { v: q, k: 'q' }]), order = tagged.map(o => o.v);
    return { target: p + q + x, plan: { mode: 'three', plates: order, pair: [tagged.findIndex(o => o.k === 'p'), tagged.findIndex(o => o.k === 'q')].sort(), expr: order.join(' + ') },
      c: { mode: 'twostep', g: 0.01 / 3, distractors: [{ v: p + q + x + 10, tag: 'OTHER' }] } };
  }
  if (rung === 5) {
    let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null;
    if (!(a > 10 && a < 20 && b > a - 10 && b < 10)) { b = int(r, 3, 9); a = int(r, 11, 10 + b - 1); }
    return { target: a - b, plan: { mode: 'sub', a, b, tens: Math.floor(a / 10), ones: a % 10, step1: a % 10, expr: `${a} − ${b}` },
      c: { mode: 'twostep', g: 0.01, distractors: [{ v: Math.floor(a / 10) * 10 + (b - a % 10), tag: 'SMALLER-FROM-LARGER' }] } };
  }
  if (rung >= 10) {
    const ba = isNum(pp.a) ? +pp.a : null, bb = isNum(pp.b) ? +pp.b : null, bo = pp.op === '-' || pp.op === '−' ? '-' : pp.op === '+' ? '+' : null;
    if (ba != null && bb != null && bo && ba > 10 && ba < 100 && bb >= 2 && bb <= 9) {
      if (bo === '+' && ba % 10 + bb > 10 && ba + bb < 100) return { target: ba + bb, plan: { mode: 'add', a: ba, b: bb, tens: Math.floor(ba / 10), ones: ba % 10, step1: 10 - ba % 10, expr: `${ba} + ${bb}` }, c: { mode: 'twostep', g: 0.01, distractors: [{ v: ba + bb - 10, tag: 'NO-CARRY' }] } };
      if (bo === '-' && ba % 10 < bb && ba % 10 > 0 && ba - bb > 0) return { target: ba - bb, plan: { mode: 'sub', a: ba, b: bb, tens: Math.floor(ba / 10), ones: ba % 10, step1: ba % 10, expr: `${ba} − ${bb}` }, c: { mode: 'twostep', g: 0.01, distractors: [{ v: ba - bb + 10, tag: 'NO-CARRY' }] } };
    }
    const op = r() < 0.6 ? '+' : '-';
    if (op === '+') {
      let a, b; for (let k = 0; k < 40; k++) { a = int(r, 2, 8) * 10 + int(r, 5, 9); b = int(r, 10 - a % 10 + 1, 9); if (a + b < 100) break; }
      return { target: a + b, plan: { mode: 'add', a, b, tens: Math.floor(a / 10), ones: a % 10, step1: 10 - a % 10, expr: `${a} + ${b}` },
        c: { mode: 'twostep', g: 0.01, distractors: [{ v: a + b - 10, tag: 'NO-CARRY' }] } };
    }
    let a, b; for (let k = 0; k < 40; k++) { a = int(r, 2, 9) * 10 + int(r, 1, 5); b = int(r, a % 10 + 1, 9); if (a - b > 0) break; }
    return { target: a - b, plan: { mode: 'sub', a, b, tens: Math.floor(a / 10), ones: a % 10, step1: a % 10, expr: `${a} − ${b}` },
      c: { mode: 'twostep', g: 0.01, distractors: [{ v: a - b + 10, tag: 'NO-CARRY' }, { v: Math.floor(a / 10) * 10 + (b - a % 10), tag: 'SMALLER-FROM-LARGER' }] } };
  }
  // R4: bridge through ten
  let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null;
  if (!(a >= 5 && a <= 9 && b >= 2 && b <= 9 && a + b > 10)) { a = int(r, 6, 9); b = int(r, 11 - a, 9); }
  return { target: a + b, plan: { mode: 'add', a, b, tens: 0, ones: a, step1: 10 - a, expr: `${a} + ${b}` }, c: { mode: 'twostep', g: 0.01, distractors: [{ v: a + b - 1, tag: 'OFF-BY-ONE' }] } };
};

/* ---------- F49 Faktafamiliehuset */
GEN.F49 = function (strand, rung, sup, r, item) {
  item = item || {};
  const pp = P(item);
  let a = isNum(pp.a) ? +pp.a : null, b = isNum(pp.b) ? +pp.b : null;
  if (Array.isArray(pp.nums) && pp.nums.length === 3) { const ns = pp.nums.map(Number).sort((x, y) => x - y); if (ns[0] + ns[1] === ns[2]) { a = ns[0]; b = ns[1]; } }
  if (!(a > 0 && b > 0 && a !== b && a + b <= 20)) { for (let k = 0; k < 30; k++) { a = int(r, 2, 9); b = int(r, 2, 11); if (a !== b && a + b <= 20 && a + b >= 8) break; } }
  if (a > b) { const t = a; a = b; b = t; }
  const c = a + b;
  const eqs = [`${a}+${b}=${c}`, `${b}+${a}=${c}`, `${c}-${a}=${b}`, `${c}-${b}=${a}`];
  const extra = sup >= 2 ? (b - a > 0 && b - a !== a && b - a !== b && b - a !== c ? b - a : c + a <= 30 ? c + a : null) : null;
  return { target: eqs, plan: { mode: 'family', a, b, c, eqs, extra, example: sup === 0 }, c: { mode: 'tiles', g: 0.01, distractors: [{ v: `${a}-${c}=${b}`, tag: 'SMALLER-FROM-LARGER' }] } };
};

// which plan (strand → generator) each format serves; prep() adapts any item to it
const SERVES = {
  F42: { 'T-NAVN': [10, 11, 12], 'T-ORDEN': [10, 11, 12], REGN: [9] },
  F43: { 'T-MENGDE': [11, 12, 13, 14, 15], 'T-SKRIV': [9] },
  F44: { 'T-ORDEN': [9, 13], REGN: [10], 'T-SKRIV': [9] },
  F46: { REGN: [1, 2, 6] },
  F47: { REGN: [1, 3, 5, 8, 9, 11, 12] },
  F48: { REGN: [4, 5, 7, 10] },
  F49: { REGN: [6] },
};
N2.SERVES = SERVES;
function nearestRung(fmt, strand, rung) {
  const s = SERVES[fmt] || {}; let st = s[strand] ? strand : Object.keys(s)[0];
  const list = s[st]; let best = list[0];
  for (const x of list) if (Math.abs(x - rung) < Math.abs(best - rung)) best = x;
  return { strand: st, rung: s[strand] && s[strand].includes(rung) ? rung : best };
}
// adapt the item (from F.LEARN / F.BANKS / a demo) to this format's plan; fills the item contract
N2.prep = function (fmt, item, rng) {
  item.params = Object.assign({}, item.params || {});
  if (item.params.n2 && item.params.n2.fmt === fmt) return item;
  const nr = nearestRung(fmt, item.strand, +item.rung || 1);
  item.strand = nr.strand; item.rung = nr.rung;
  const sup = item.sup == null ? 1 : clamp(+item.sup, 0, 2); item.sup = sup;
  const r = rng || U.rng((U.hashStr(String(item.id || '') + String(item.key || '')) ^ ((F.T.now * 1000) | 0)) >>> 0);
  const g = GEN[fmt](item.strand, item.rung, sup, r, item);
  const same = JSON.stringify(g.target) === JSON.stringify(item.target);
  item.params.n2 = Object.assign({ fmt }, g.plan);
  if (!same) {
    item.target = g.target; item.answer = g.target;
    // a fresh (local) item: a stable Leitner key per fact/family
    const eqKey = e => String(e).replace(/<[^>]+>/g, '').replace(/\s/g, '').replace(/−/g, '-');
    const k = Array.isArray(g.target) ? (g.plan.mode === 'family' ? `${g.plan.a}+${g.plan.b}` : g.plan.mode === 'list' ? 'del' + g.plan.whole : g.plan.lo + '..' + g.plan.hi)
      : g.plan.expr ? eqKey(g.plan.expr) : g.plan.eq ? eqKey(g.plan.eq) : String(g.target);
    item.key = item.strand + ':' + (g.plan.mode === 'gates' ? eqKey(g.plan.facts[0].q) : k);   // gates: the first fact (res.facts has all 5)
    item.params.n2local = true;
  }
  if (typeof item.target === 'number') item.n = item.target;
  item.choices = null;
  contract(item, fmt, g.c || {}, { keep: same });
  return item;
};
/* v5 WP-R2 (playtest2 «hints»): «Hjelp meg» / Puff BEFORE any attempt – the board's STRUCTURE or the strategy as one line (the rows of
   ten, the ends of the bridge, «Fyll opp til ti først» …), then the question again; never a number of the answer. A second press says
   «Se godt på hver av dem». (WP-K2's S.preHint calls S.pre when the phase has no nudge of its own.) */
const PRE = {
  F42: pl => ({ find: 'n2_f42_h_tierne', read: 'n2_f42_h_tierne', move: 'n2_f42_h_rad', calc: 'n2_f42_h_rad', nb: 'n2_f42_h_steg', between: 'n2_f42_h_kant' })[pl.mode],
  F43: pl => ({ count: 'n2_f43_tiere_forst', coins: 'n2_f43_tiere_forst', build: 'n2_f43_h_veksle', pv: 'n2_f43_h_veksle', rename: 'n2_f43_h_veksle', pay: 'n2_f43_h_stor' })[pl.mode],
  F44: pl => ({ place: 'n2_f44_h_endene', mid: 'n2_f44_h_midten', arrow: 'n2_f44_h_streker', jump: 'n2_f44_h_tier' })[pl.mode],
  F46: pl => pl.mode === 'list' ? 'n2_f46_h_orden' : 'n2_f46_h_hele',
  F48: pl => pl.mode === 'add' ? 'n2_f47_h_fyll' : pl.mode === 'sub' ? 'n2_f48_h_enere' : pl.mode === 'three' ? 'n2_f47_h_tiervenn' : null,
  F49: () => 'n2_f49_h_storst',
};
N2.pre = async function (fmt, item, S, k) {
  const pl = (item.params && item.params.n2) || {};
  const id = k ? null : (PRE[fmt] ? PRE[fmt](pl) : null);
  if (id && F.TPL.has(id)) await S.say(id, {}, ''); else if (F.TPL.has('kit_h_look')) await S.say('kit_h_look', {}, '');
  if (S.replayPrompt) await S.replayPrompt();
};
// F.BANKS.reg fallback (behind WP-B1, which loads first): REGN rungs our formats serve, only for our formats or an unnamed format
function regFallback() {
  if (!F.BANKS || typeof F.BANKS.reg !== 'function' || N2._reg) return;
  N2._reg = true;
  const byRung = {};
  for (const f of MINE) for (const r of ((SERVES[f] || {}).REGN || [])) (byRung[r] = byRung[r] || []).push(f);
  F.BANKS.reg('REGN', function (rung, sup, rng, o) {
    o = o || {};
    const fmts = byRung[rung]; if (!fmts) return null;
    const fmt = o.format && MINE.includes(o.format) ? o.format : (!o.format ? fmts[0] : null);
    if (!fmt || !fmts.includes(fmt)) return null;
    return N2.prep(fmt, { strand: 'REGN', rung, sup, params: {} }, rng);
  }, { rungs: Object.keys(byRung).map(Number) });
}

/* =====================================================================================================================
   5. shared helpers for the formats
   ===================================================================================================================== */
const SPECS = {};
function fmt(id, spec) { spec.id = id; SPECS[id] = spec; }
// a prompt made of several lines: the calm lock covers all of them, Puff (S.replay, WP-K C2) replays the whole sequence
async function promptSeq(K, lines) {
  const S = K.S;
  const play = async () => { for (const [id, slots] of lines) { if (S.ended) return; await F.SAY(id, slots || {}, ''); } };
  S.lastPrompt = { id: lines[0][0], slots: lines[0][1] || {}, voice: '' };
  S.replay = () => play();
  S.speaking = true;
  try { await play(); } finally { S.speaking = false; S.tInput = F.T.now; if (S.armIdle) S.armIdle(); }
}
const setSecret = (K, list) => { K.S.secret = list.slice(); K.item.secret = list.slice(); };

/* =====================================================================================================================
   6. F42 Hundretavla – a 10×10 board (canvas texture on the diorama), tap 1 tile / tap all + Ferdig, the bee as look-back
   ===================================================================================================================== */
function Grid(K, o) {
  const B = K.B, rows = o.r1 - o.r0 + 1;
  const cw = o.cw || 0.72, ch = o.ch || 0.56, GW = cw * 10, GH = ch * rows;
  const PX = 1280, cpx = PX / 10, cpy = Math.round(cpx * ch / cw), HPX = cpy * rows;
  const cv = document.createElement('canvas'); cv.width = PX; cv.height = HPX;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace && 'colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2;
  B.add(mesh, 0, 0, 0.04);
  const n0 = o.r0 * 10 + 1, n1 = (o.r1 + 1) * 10;
  const G = { mesh, rows, GW, GH, cw, ch, n0, n1, vis: {}, st: {}, rev: {} };
  G.has = n => n >= n0 && n <= n1;
  for (let n = n0; n <= n1; n++) G.vis[n] = o.vis ? o.vis(n) : 'num';
  G.local = n => { const i = n - n0, r = Math.floor(i / 10), c = i % 10; return new V3(-GW / 2 + (c + 0.5) * cw, 0.05, -GH / 2 + (r + 0.5) * ch); };
  const FILL = { start: ['#ffe27a', '#c9962b'], bound: ['#ffe27a', '#c9962b'], pick: ['#dccbff', '#8a6fd1'], lit: ['#fff3b0', '#e8c25a'], wrong: ['#ffd6de', '#e57a8c'],
    sol: ['#ffe066', '#c9962b'], right: ['#ffe066', '#c9962b'], trail: ['#efe6ff', '#b9a7d8'] };
  const SHOW = { start: 1, bound: 1, wrong: 1, sol: 1, right: 1 };
  G.draw = () => {
    ctx.clearRect(0, 0, PX, HPX);
    ctx.fillStyle = '#d8c9a8'; ctx.fillRect(0, 0, PX, HPX);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(Math.min(cpy * 0.6, cpx * 0.42))}px Andika, sans-serif`;
    for (let n = n0; n <= n1; n++) {
      const i = n - n0, r = Math.floor(i / 10), c = i % 10;
      const x = c * cpx + 5 + (c >= 5 ? 3 : 0), y = r * cpy + 5, w = cpx - 10 - 3, h = cpy - 10;
      const st = G.st[n], vis = G.vis[n];
      let fill = vis === 'fog' ? '#e9e1f7' : vis === 'faint' ? '#fbf8ff' : '#fffdf5', stroke = vis === 'fog' ? '#d6cbec' : '#e3d6b8', lw = 3;
      if (st && FILL[st]) { fill = FILL[st][0]; stroke = FILL[st][1]; lw = st === 'sol' || st === 'start' || st === 'bound' ? 8 : 5; }
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12); else ctx.rect(x, y, w, h);
      ctx.fill(); ctx.stroke();
      const show = vis === 'num' || vis === 'faint' || SHOW[st] || G.rev[n];
      if (show) { ctx.fillStyle = vis === 'faint' && !SHOW[st] && !G.rev[n] ? 'rgba(59,47,92,.30)' : '#3b2f5c'; ctx.fillText(String(n), x + w / 2, y + h / 2 + 2); }
      else if (vis === 'fog') { ctx.fillStyle = 'rgba(160,140,200,.35)'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    // the middle line (5 | 5) helps finding columns
    ctx.fillStyle = '#b9a07a'; ctx.fillRect(5 * cpx - 1, 0, 3, HPX);
    tex.needsUpdate = true;
  };
  G.set = (n, st) => { if (st) G.st[n] = st; else delete G.st[n]; G.draw(); };
  G.setMany = (list, st) => { list.forEach(n => { if (st) G.st[n] = st; else delete G.st[n]; }); G.draw(); };
  G.reveal = (n, on) => { if (on === false) delete G.rev[n]; else G.rev[n] = true; G.draw(); };
  G.row = n => { const r0 = Math.floor((n - 1) / 10) * 10 + 1; return range(r0, r0 + 9); };
  G.at = (cx, cy) => {
    const h = K.hitLocal(mesh, cx, cy); if (!h || !h.uv) return null;
    const c = Math.floor(h.uv.x * 10), r = Math.floor((1 - h.uv.y) * rows);
    if (c < 0 || c > 9 || r < 0 || r >= rows) return null;
    return n0 + r * 10 + c;
  };
  G.dispose = () => { try { tex.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); } catch (e) {} };
  G.draw();
  return G;
}

fmt('F42', { name: 'Hundretavla', g: 0.02, strands: { 'T-NAVN': [10, 12], 'T-ORDEN': [10, 12], REGN: [9, 9] }, places: ['hundretavle', 'hall', 'tallhage', 'any'], family: 'tavle', portable: true,
  think: 'REGNE', mode: 'grid', tpl: ['n2_f42_trykk', 'n2_f42_les', 'n2_f42_start', 'n2_f42_gaa', 'n2_f42_hvor', 'n2_f42_mer', 'n2_f42_etter', 'n2_f42_for', 'n2_f42_mellom', 'n2_f42_regn'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, t = item.target;
    const rows = pl.r1 - pl.r0 + 1;
    // the reading note (N12) sits at the top: the board then uses a slightly lower, smaller band
    const cw = rows > 5 ? 0.8 : 0.72;      // a full board is height-limited: wider tiles give bigger numbers
    const B = K.board({ style: 'wood', w: cw * 10 + 0.5, d: rows * 0.56 + 0.45, tilt: 1.22, h: 0.25, yNdc: pl.mode === 'read' ? -0.09 : rows > 5 ? 0.1 : 0.12, fit: pl.mode === 'read' ? 0.48 : rows > 5 ? 0.6 : 0.5 });
    const fog = pl.fog != null ? pl.fog : item.sup;
    const listen = pl.mode === 'find' || pl.mode === 'read';
    const visOf = n => listen ? 'num' : fog === 0 ? 'faint' : (fog === 1 && n % 10 === 0) ? 'num' : 'fog';
    const Gd = Grid(K, { r0: pl.r0, r1: pl.r1, vis: visOf, cw }); K.grid = Gd;
    K.offs.push(() => Gd.dispose());
    // the bee: waits at the top-left corner, flies the row/column path (look-back, solution, payoff)
    const bee = K.piece(beeModel(), 0.42, { hk: 0.7 }); B.add(bee, -Gd.GW / 2 - 0.35, -Gd.GH / 2 + 0.2, 0.35);
    const beeAt = n => { const p = Gd.local(n); p.y = 0.42; return p; };
    const fly = async (n, ms) => { if (!Gd.has(n)) return; const a = bee.position.clone(), b = beeAt(n); await tween(ms || 420, k => { const e = ease(k); bee.position.lerpVectors(a, b, e); bee.position.y += Math.sin(k * Math.PI) * 0.35; }); };
    const walk = async (from, path, o) => {      // path of single ±1 / ±10 steps; each tile on the way shows its number
      let cur = from; await fly(from, 300);
      for (const d of path) { cur += d; if (o && o.trail) { Gd.st[cur] = 'trail'; Gd.rev[cur] = true; Gd.draw(); } await fly(cur, 260); if (o && o.g) o.g(); }
      return cur;
    };
    const stepsOf = moves => { const out = []; for (const mv of moves) { const big = Math.abs(mv.d) >= 10, unit = big ? Math.sign(mv.d) * 10 : Math.sign(mv.d), k = big ? Math.abs(mv.d) / 10 : Math.abs(mv.d); for (let i = 0; i < k; i++) out.push(unit); } return out; };
    let card = null;
    const start = pl.mode === 'between' ? null : pl.mode === 'nb' ? pl.ref : pl.start;
    if (start != null) Gd.set(start, 'start');
    if (pl.mode === 'between') { Gd.st[pl.lo] = 'bound'; Gd.st[pl.hi] = 'bound'; Gd.draw(); }
    if (pl.mode === 'calc') card = K.card(pl.expr.replace(/−/g, '<span class="ar">−</span>').replace(/\+/g, '<span class="ar">+</span>') + ' = <span class="q">?</span>');
    if (pl.mode === 'move' && pl.moves[0].m) card = K.card(pl.moves.map(mv => { const k = Math.abs(mv.d) >= 10 ? Math.abs(mv.d) / 10 : Math.abs(mv.d); const a = mv.d >= 10 ? '↓' : mv.d <= -10 ? '↑' : mv.d > 0 ? '→' : '←'; return '<span class="ar">' + a.repeat(k) + '</span>'; }).join('<span class="gap"></span>'), { cls: 'small' });
    if (pl.mode === 'find') setSecret(K, [String(t)]);
    // prompts. «Trykk på N!» is one whole clip per number; until the lead has generated it, the number's own clip (core_num, exists
    // for 0–100) follows the carrier line so the task stays playable (the digits stay masked in the subtitle either way)
    const hasClip = txt => { try { const SP = window.SPEECH || {}; return !!(SP['|' + txt] || SP[txt]); } catch (e) { return true; } };
    const findLines = () => hasClip(F.TPL.text('n2_f42_trykk', { n: t }, 0)) ? [['n2_f42_trykk', { n: t }]] : [['n2_f42_trykk', { n: t }], ['core_num', { n: t }]];
    const sayFind = async () => { for (const [id, sl] of findLines()) await F.SAY(id, sl, ''); };
    const ask = () => {
      if (pl.mode === 'find') return promptSeq(K, findLines());
      if (pl.mode === 'read') return K.prompt('n2_f42_les', {}, { readingTarget: true, text: pl.word, targetTpl: 'core_num', targetSlots: { n: t } });
      if (pl.mode === 'nb') return K.prompt(pl.dir === 'after' ? 'n2_f42_etter' : 'n2_f42_for');
      if (pl.mode === 'between') return promptSeq(K, [['n2_f42_mellom'], ['n2_ferdig']]);
      if (pl.mode === 'calc') return promptSeq(K, [['n2_f42_start'], ['n2_f42_regn']]);
      if (pl.moves[0].mer) return K.prompt('n2_f42_mer', { d: pl.moves[0].mer });
      return promptSeq(K, [['n2_f42_start']].concat(pl.moves.map(mv => ['n2_f42_gaa', { m: mv.m }])).concat([['n2_f42_hvor']]));
    };
    const ask2 = () => pl.mode === 'read' ? K.say('core_les') : pl.mode === 'find' ? sayFind() : (S.replay ? S.replay() : ask());
    // the answer widget
    let row = null;
    const picks = new Set();
    let last = null;
    const ansArr = Array.isArray(t) ? t.slice().sort((a, b) => a - b) : null;
    const done = pl.mode === 'between'
      ? K.arm({ answer: ansArr, check: v => Array.isArray(v) && v.length === ansArr.length && v.slice().sort((a, b) => a - b).every((x, i) => +x === ansArr[i]) })
      : K.arm({ answer: t });
    const w = K.widget({ kind: pl.mode === 'between' ? 'subset' : 'grid', values: range(Gd.n0, Gd.n1),
      feed: v => {
        if (pl.mode === 'between') {
          picks.clear();
          const arr = Array.isArray(v) ? v : ansArr.slice(0, -1).concat(ansArr.length > 1 ? [] : [pl.hi]);
          arr.forEach(n => picks.add(+n)); syncPicks();
          return submitPicks();
        }
        const n = Gd.has(+v) ? +v : (Gd.has(t + 11) ? t + 11 : t - 11);
        last = n; return K.submit(n, w);
      },
      mark: (v, cls) => {
        if (pl.mode === 'between') { if (cls === 'right') { ansArr.forEach(n => { Gd.st[n] = 'right'; }); Gd.draw(); } return; }
        if (cls === 'wrong' && Gd.has(+v)) { Gd.set(+v, 'wrong'); S.timeout(() => { if (Gd.st[+v] === 'wrong') Gd.set(+v, Gd.rev[+v] ? 'trail' : null); }, 2400); }
        if (cls === 'right') Gd.set(+v, 'right');
      },
      solution: () => {},
      lock: on => { if (row) row.lock(on); } });
    const syncPicks = () => { for (let n = Gd.n0; n <= Gd.n1; n++) if (Gd.st[n] === 'pick') delete Gd.st[n]; picks.forEach(n => { if (Gd.st[n] !== 'bound') Gd.st[n] = 'pick'; if (fog === 0) Gd.rev[n] = true; }); Gd.draw(); };
    const submitPicks = () => { if (!picks.size) { sfx('boing'); return false; } return K.submit([...picks].sort((a, b) => a - b), w); };
    // tray: Ferdig (tap-all) / 🔊 (listening: free audio replay of the number, digits stay masked)
    if (pl.mode === 'between') { row = K.row([{ id: 'ok', label: 'Ferdig ✓', cls: 'gold okbtn' }]); row.on(id => { if (!w.locked && !S.solved && !S.locked) submitPicks(); }); }
    else if (pl.mode === 'find') { row = K.row([{ id: 'hor', label: '🔊' }]); row.on(() => { if (!S.solved && !S.speaking) sayFind(); }); }
    K.onCanvas('pointerdown', e => {
      if (!B.alive || w.locked || w.dead || S.solved || S.ended) return;
      const n = Gd.at(e.clientX, e.clientY); if (n == null) return;
      sfx('click');
      if (pl.mode === 'between') {
        if (n === pl.lo || n === pl.hi) { if (!picks.has(n)) { picks.add(n); } else picks.delete(n); }
        else if (picks.has(n)) picks.delete(n); else picks.add(n);
        syncPicks(); return;
      }
      last = n; K.submit(n, w);
    });
    K.tag(v => {
      if (pl.mode === 'between') {
        const a = Array.isArray(v) ? v.map(Number) : [];
        if (a.includes(pl.lo) || a.includes(pl.hi)) return 'INCLUSIVE';
        if (ansArr.some(n => !a.includes(n))) return 'MISSING';
        return 'EXTRA';
      }
      if (pl.mode === 'find' || pl.mode === 'read') return tagNum(t, +v);
      if (Math.abs(+v - t) === 9 || Math.abs(+v - t) === 11) return 'ROW-STEP';
      if (start != null && Math.abs(+v - start) % 10 === 0 && Math.abs(t - start) < 10) return 'ROW-STEP';
      return tagNum(t, +v);
    });
    // 1st error: the bee acts out HER answer, then a structural hint (never the target's digits)
    K.hint(async (tag, v) => {
      if (pl.mode === 'between') {
        const mine = [...picks];
        mine.forEach(n => { Gd.rev[n] = true; }); Gd.draw();
        await K.sayG(tag === 'INCLUSIVE' ? 'n2_f42_h_kantene' : tag === 'MISSING' ? 'n2_f42_h_glemt' : 'n2_f42_h_ekstra');
        if (item.sup <= 1) { await fly(pl.lo, 400); await K.numG(pl.lo); await fly(pl.hi, 500); await K.numG(pl.hi); }
        await K.sleepG(400);
        if (fog > 0) { mine.forEach(n => { if (!ansArr.includes(n) || fog === 2) delete Gd.rev[n]; }); Gd.draw(); }
        return;
      }
      if (v != null && Gd.has(+v)) {
        Gd.rev[+v] = true; Gd.set(+v, 'wrong');
        if (start != null) await fly(start, 300);
        await fly(+v, 520); await K.sayG('n2_du_valgte'); await K.numG(+v);
      }
      if (pl.mode === 'find' || pl.mode === 'read') {
        if (item.sup <= 1) { Gd.setMany(Gd.row(t).filter(n => Gd.has(n) && n !== +v), 'lit'); await K.sayG('n2_f42_h_raden'); await K.sleepG(900); Gd.setMany(Gd.row(t).filter(n => Gd.st[n] === 'lit'), null); }
        else if (pl.mode === 'read' && S.wordView && S.wordView.n && S.wordView.n.letters) {
          const tw = TENS[Math.floor(t / 10)] || ''; const L = S.wordView.n.letters;
          if (t > 20 && pl.word.startsWith(tw)) { for (let i = 0; i < tw.length && i < L.length; i++) L[i].classList.add('hl'); await K.sayG('core_les'); await K.sleepG(700); for (let i = 0; i < L.length; i++) L[i].classList.remove('hl'); }
        }
        await K.sayG('n2_hor'); await ask2(); return;
      }
      if (pl.mode === 'nb') {
        const cross = (pl.dir === 'after' && pl.ref % 10 === 0) || (pl.dir === 'before' && pl.ref % 10 === 1);
        await K.sayG(cross ? 'n2_f42_h_kant' : pl.dir === 'after' ? 'n2_f42_h_steg' : 'n2_f42_h_venstre');
        await fly(pl.ref, 400); return;
      }
      // moves / calc: the rule of the first move; at s0/s1 the bee shows ONE step of it (never the whole path)
      const mv = pl.moves[0], unit = Math.abs(mv.d) >= 10 ? Math.sign(mv.d) * 10 : Math.sign(mv.d);
      await K.sayG(unit === 10 ? 'n2_f42_h_rad' : unit === -10 ? 'n2_f42_h_radopp' : unit > 0 ? 'n2_f42_h_steg' : 'n2_f42_h_venstre');
      if (item.sup <= 1 && Gd.has(start + unit)) { await fly(start, 300); Gd.rev[start + unit] = true; Gd.set(start + unit, 'trail'); await fly(start + unit, 420); await K.sleepG(700); }
      if (fog === 1) await K.sayG('n2_f42_h_tierne');
      await fly(start, 350);
    });
    // a 2nd wrong answer is acted out too (WP-K S.lookBack runs before the solution); the 1st one plays inside the hint
    if (S.lookBack) S.lookBack(async v => { if (S.stepTries < 2 || pl.mode === 'between' || !Gd.has(+v)) return; Gd.rev[+v] = true; Gd.set(+v, 'wrong'); await fly(+v, 420); await sleep(450); });
    // 2nd error: the bee walks the true path (or lights the tiles); she taps it herself
    K.sol(async () => {
      if (pl.mode === 'between') { picks.clear(); syncPicks(); ansArr.forEach(n => { Gd.st[n] = 'sol'; }); Gd.draw(); if (row) row.glow('ok'); await K.say('core_sol_chip'); return; }
      if (pl.mode === 'find' || pl.mode === 'read') { await fly(t, 520); }
      else if (pl.mode === 'nb') { await fly(pl.ref, 300); await fly(t, 400); }
      else { await walk(start, stepsOf(pl.moves), { trail: true }); }
      Gd.set(t, 'sol'); await K.num(t); await K.say('core_sol_chip');
    });
    // go: a short look at the board, then the question
    await sleep(350);
    ask();
    await done;
    // payoff: the bee flies (the path) to the tile; numbers on the way show
    try {
      if (pl.mode === 'between') { ansArr.forEach(n => { Gd.rev[n] = true; Gd.st[n] = 'right'; }); Gd.draw(); for (const n of ansArr) { await fly(n, 260); } }
      else if (pl.mode === 'move' || pl.mode === 'calc') { await walk(start, stepsOf(pl.moves), { trail: true }); Gd.rev[t] = true; Gd.set(t, 'right'); }
      else { Gd.rev[t] = true; Gd.set(t, 'right'); await fly(t, 450); }
      sfx('sparkle'); M().bounce(bee, 0.3);
      await K.say('n2_f42_ok');
    } catch (e) { /* payoff never blocks the result */ }
    if (row) row.glow('ok', false);
    return S.result();
  } });

/* =====================================================================================================================
   7. F43 Bunter og plater (Myntverket) – count bundles, build with +10/+1 (ten ones become one bundle), place value,
      renaming with «Veksle», coins: count them / pay with the fewest
   ===================================================================================================================== */
const COIN = { 1: ['fx_n_mynt1', 0.5], 5: ['fx_n2_mynt5', 0.6], 10: ['fx_n_mynt10', 0.72], 20: ['fx_n2_mynt20', 0.82], 50: ['fx_n2_lapp50', 1.3], 100: ['fx_n2_lapp100', 1.35] };
function Bundles(K, surfId, o) {
  o = o || {};
  const sf = SURF[surfId] || SURF.krystall, B = K.B, M_ = M();
  const tenModel = sf.ten(), oneModel = sf.one;
  const g = new THREE.Group(); B.add(g, 0, 0, 0);
  const X = { tens: [], ones: [], sf, tenModel, oneModel, g };
  const ox = o.x || 0;
  X.tenPos = i => {
    if (sf.tenLay === 'rods') return new V3(ox - 1.75, 0, -1.3 + i * 0.27 + (i >= 5 ? 0.16 : 0));
    if (sf.tenLay === 'coins') return new V3(ox - 2.9 + (i % 4) * 0.84, 0, -1.0 + Math.floor(i / 4) * 0.84);
    const step = surfId === 'egg' ? 1.08 : 0.7, cols = surfId === 'egg' ? 3 : 4;
    return new V3(ox - 2.9 + (i % cols) * step + (surfId === 'egg' ? 0.5 : 0.3), 0, -1.0 + Math.floor(i / cols) * (surfId === 'egg' ? 0.62 : 0.66));
  };
  X.onePos = j => new V3(ox + 0.55 + (j % 5) * (sf.oneSize + (surfId === 'kroner' ? 0.1 : 0.2)), 0, -0.85 + Math.floor(j / 5) * (sf.oneSize + 0.28));
  const mkTen = () => K.piece(tenModel, sf.tenSize, { hk: 0.7 });
  const mkOne = () => K.piece(oneModel, sf.oneSize, { hk: 0.8 });
  X.layout = () => { X.tens.forEach((t, i) => t.position.copy(X.tenPos(i))); X.ones.forEach((p, j) => p.position.copy(X.onePos(j))); };
  X.total = () => X.tens.length * 10 + X.ones.length;
  X.addTen = (pop) => { const t = mkTen(); g.add(t); X.tens.push(t); t.position.copy(X.tenPos(X.tens.length - 1)); if (o.tap) B.pick(t, () => o.tap(t, 'ten')); if (pop !== false) M_.popIn(t, 240); return t; };
  X.addOne = (pop) => { const p = mkOne(); g.add(p); X.ones.push(p); p.position.copy(X.onePos(X.ones.length - 1)); if (o.tap) B.pick(p, () => o.tap(p, 'one')); if (pop !== false) M_.popIn(p, 200); return p; };
  X.remove = (obj, kind) => { const arr = kind === 'ten' ? X.tens : X.ones; const i = arr.indexOf(obj); if (i < 0) return false; arr.splice(i, 1); B.unpick(obj); g.remove(obj); X.layout(); return true; };
  X.set = (tens, ones) => { X.tens.splice(0).forEach(t => { B.unpick(t); g.remove(t); }); X.ones.splice(0).forEach(p => { B.unpick(p); g.remove(p); }); for (let i = 0; i < tens; i++) X.addTen(false); for (let j = 0; j < ones; j++) X.addOne(false); };
  // ten ones jump together and become one bundle («veksle»), or one bundle breaks into ten ones
  X.bundle = async () => {
    if (X.ones.length < 10) return false;
    const ten = X.ones.splice(X.ones.length - 10, 10); ten.forEach(p => B.unpick(p));
    const c = X.tenPos(X.tens.length);
    await tween(420, k => ten.forEach(p => { p.position.lerp(c, 0.18); p.position.y = Math.sin(k * Math.PI) * 0.4; }));
    ten.forEach(p => g.remove(p)); const t = X.addTen(); sfx('chime'); X.layout(); return t;
  };
  X.unbundle = async () => {
    if (!X.tens.length) return false;
    const t = X.tens.pop(); B.unpick(t); g.remove(t);
    for (let j = 0; j < 10; j++) X.addOne();
    sfx('chime'); X.layout(); return true;
  };
  X.glowAll = on => [...X.tens, ...X.ones].forEach(p => M_.glowObj(p, on));
  X.ghost = (tens, ones) => {
    X.unghost();
    const gg = new THREE.Group(); g.add(gg); X.ghostG = gg;
    const mat = new THREE.MeshBasicMaterial({ color: 0x8a6fd1, transparent: true, opacity: 0.7, depthWrite: false });
    const box = (p, sx, sz) => { const m = sf.tenLay === 'coins' ? new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2, 0.18, 20), mat) : new THREE.Mesh(new THREE.BoxGeometry(sx, 0.18, sz), mat); m.position.copy(p); m.position.y = 0.1; gg.add(m); };
    const tw = sf.tenLay === 'rods' ? 2.2 : sf.tenLay === 'coins' ? sf.tenSize : sf.tenSize, td = sf.tenLay === 'rods' ? 0.2 : sf.tenLay === 'coins' ? sf.tenSize : sf.tenSize * 0.5;
    for (let i = 0; i < tens; i++) box(X.tenPos(i), tw, td);
    for (let j = 0; j < ones; j++) box(X.onePos(j), sf.oneSize * 0.8, sf.oneSize * 0.8);
    const t0 = F.T.now; const off = F.on('tick', () => { if (!gg.parent) return off(); mat.opacity = 0.62 + 0.2 * Math.sin((F.T.now - t0) * 5); });
  };
  X.unghost = () => { if (X.ghostG) { g.remove(X.ghostG); X.ghostG = null; } };
  return X;
}
function coinRow(K, values, o) {
  o = o || {};
  const B = K.B, out = [];
  const n = values.length, gap = 0.12;
  const widths = values.map(v => COIN[v][1]);
  const W = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
  let x = -W / 2 + (o.x || 0);
  values.forEach((v, i) => {
    const p = K.piece(COIN[v][0], COIN[v][1], { hk: 1 }); p.userData.v = v;
    B.add(p, x + widths[i] / 2, o.z || 0, 0); x += widths[i] + gap;
    out.push(p); if (o.tap) B.pick(p, () => o.tap(p, i));
  });
  return out;
}

fmt('F43', { name: 'Bunter og plater', mode: 'keypad', g: 0.01, strands: { 'T-MENGDE': [11, 15], 'T-SKRIV': [9, 9] }, places: ['myntverket', 'tryllepunkt', 'bakery', 'any'], family: 'bygg', portable: true,
  think: 'REGNE', tpl: ['n2_f43_hvormange', 'n2_f43_bygg', 'n2_f43_tall', 'n2_f43_enere', 'n2_f43_tiere', 'n2_f43_betal'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, t = item.target, sup = item.sup, M_ = M();
    const surfId = pl.surf || 'krystall';
    const sf = SURF[surfId] || SURF.krystall;
    const B = K.board({ style: pl.mode === 'coins' || pl.mode === 'pay' ? 'counter' : sf.board, w: 6.8, d: 3.0, h: 0.6 });
    if (pl.mode === 'build') return f43build(K, B, pl, t);
    if (pl.mode === 'pay') return f43pay(K, B, pl, t);
    // ---------- keypad modes: count / pv / rename / coins
    let X = null, coins = null, card = null, pic = false;
    const showPic = () => {
      if (pic) return; pic = true;
      if (pl.mode === 'coins') return;
      X = Bundles(K, surfId, {});
      const tens = pl.mode === 'pv' ? (pl.sub === 'tens' ? pl.n / 10 : pl.tens) : pl.mode === 'rename' ? (pl.sub === 'split' ? Math.floor(pl.n / 10) : pl.tens) : pl.tens;
      const ones = pl.mode === 'pv' ? (pl.sub === 'tens' ? 0 : pl.ones) : pl.mode === 'rename' ? (pl.sub === 'split' ? pl.n % 10 : pl.ones) : pl.ones;
      for (let i = 0; i < tens; i++) F.T.timeout(() => { if (!S.ended) X.addTen(); }, 60 * i);
      for (let j = 0; j < ones; j++) F.T.timeout(() => { if (!S.ended) X.addOne(); }, 60 * tens + 40 * j);
      if (sup === 0 && pl.mode === 'count') F.T.timeout(() => { if (!S.ended) X.tens.forEach(tn => K.label(tn, '10', { cls: 'num small ten', dy: 0.35 })); }, 60 * tens + 200);
      if (pl.mode === 'rename' && sup <= 1) {
        const a = K.anchor(2.2, 0.2, 1.05);
        K.label(a, 'Veksle ⇄', { cls: 'num plaque click', dy: 0.1, onClick: () => { if (!S.solved && !S.locked) veksle(); } });
      }
    };
    const veksle = async () => { if (!X) return; sfx('click'); K.say('n2_f43_veksle'); if (pl.sub === 'split' && X.ones.length < 10) await X.unbundle(); else if (X.ones.length >= 10) await X.bundle(); else await X.unbundle(); };
    if (pl.mode === 'coins') coins = coinRow(K, pl.coins, { z: 0.1 });
    else if (pl.mode === 'count' || sup === 0 || (sup === 1 && pl.mode === 'pv' && pl.sub !== 'tens') || (sup <= 1 && pl.mode === 'rename')) showPic();
    // v5 WP-R2 (logic #39): «1 tier», «1 ener» – singular for one (never «1 tiere og ? enere», «4 tiere og 1 enere»)
    const tier = k => `${k} ${+k === 1 ? 'tier' : 'tiere'}`, ener = k => `${k} ${+k === 1 ? 'ener' : 'enere'}`;
    if (pl.mode === 'pv') card = K.card(pl.sub === 'ones' ? `${pl.n} = ${tier(pl.tens)} og <span class="q">?</span> enere` : pl.sub === 'tens' ? `${pl.n} = <span class="q">?</span> tiere` : `${tier(pl.tens)} og ${ener(pl.ones)} = <span class="q">?</span>`, { cls: 'small' });
    if (pl.mode === 'rename') card = K.card(pl.sub === 'split' ? `${pl.n} = ${tier(pl.tens)} og <span class="q">?</span> enere` : `${tier(pl.tens)} og ${ener(pl.ones)} = <span class="q">?</span>`, { cls: 'small' });
    const ask = () => {
      if (pl.mode === 'coins') return K.prompt('n2_f43_hvormange', { pl: 'kroner' });
      if (pl.mode === 'pv') return K.prompt(pl.sub === 'ones' ? 'n2_f43_enere' : pl.sub === 'tens' ? 'n2_f43_tiere' : 'n2_f43_tall');
      if (pl.mode === 'rename') return K.prompt(pl.sub === 'split' ? 'n2_f43_enere' : 'n2_f43_tall');
      if (pl.ask === 'tall') return K.prompt('n2_f43_tall');
      return K.prompt('n2_f43_hvormange', { pl: SETS_PL(sf.pl) });
    };
    let lb = null;
    const clearLb = () => { if (lb) { lb.forEach(x => x.remove ? x.remove() : (x.parent && x.parent.remove(x))); lb = null; } };
    K.hint(async (tag, v) => {
      clearLb();
      // look-back: HER number as a little picture (rods + pieces) with its plaque, beside the real thing
      if (pl.mode !== 'coins' && pl.mode !== 'pv' && v != null && +v >= 1 && +v <= 99 && NUM().numberPicture) {
        const gp = NUM().numberPicture(B, +v, 1.9, 0.55, { cell: 0.085 }); M_.popIn(gp);
        lb = [gp, K.label(gp, String(+v), { cls: 'num small guess', dy: 0.55 })];
        await K.sayG('n2_du_valgte'); await K.sleepG(500);
      }
      if (pl.mode === 'coins') {
        // sort the coins, biggest first, and count along – stopping before the last one
        const order = coins.slice().sort((a, b) => b.userData.v - a.userData.v);
        await K.sayG('n2_f43_tiere_forst');
        if (sup <= 1) { let s = 0; for (let i = 0; i < order.length - 1; i++) { s += order[i].userData.v; M_.glowObj(order[i], true); M_.bounce(order[i], 0.2); await K.numG(s); } await K.sleepG(500); order.forEach(c => M_.glowObj(c, false)); }
        return;
      }
      if (!pic) { showPic(); await K.sleepG(900); }
      if (pl.mode === 'rename') { await K.sayG('n2_f43_h_veksle'); if (sup <= 1) { await veksle(); await K.sleepG(600); } return; }
      await K.sayG('n2_f43_ten', { s: sf.is });
      if (sup <= 1 && X) {   // count the bundles in tens, never the last step to the total
        await K.sayG('n2_f43_tiere_forst');
        for (let i = 0; i < X.tens.length; i++) { M_.glowObj(X.tens[i], true); M_.bounce(X.tens[i], 0.2); await K.numG(10 * (i + 1)); }
        await K.sleepG(400); X.tens.forEach(p => M_.glowObj(p, false));
      }
    });
    K.sol(async () => {
      clearLb();
      if (!pic) showPic();
      if (X && pl.mode === 'count') { let s = 0; for (const p of X.tens) { s += 10; M_.glowObj(p, true); await K.num(s); } for (const p of X.ones) { s += 1; M_.glowObj(p, true); await K.num(s); } }
      if (coins) { let s = 0; for (const c of coins.slice().sort((a, b) => b.userData.v - a.userData.v)) { s += c.userData.v; M_.glowObj(c, true); await K.num(s); } }
      if (S.active && S.active.solution) S.active.solution(t);
      await K.say('core_sol_keys');
    });
    await sleep(pl.mode === 'count' ? 700 : 350);
    ask();
    await K.keypad(t, { showLen: sup === 0 });
    clearLb();
    if (X) { X.glowAll(true); sfx('sparkle'); }
    if (coins) coins.forEach((c, i) => F.T.timeout(() => M_.bounce(c, 0.25), i * 60));
    await K.say('n2_f43_ok');
    return S.result();
  } });
const SETS_PL = pl => { try { return F.SETS.get('N2_PL').includes(pl) ? pl : 'krystaller'; } catch (e) { return 'krystaller'; } };

async function f43build(K, B, pl, t) {
  const S = K.S, sup = K.item.sup, M_ = M();
  const sf = SURF[pl.surf] || SURF.krystall;
  let X = null;
  const goal = K.label(K.anchor(2.6, 0.2, -1.25), String(t), { cls: 'num goal', dy: 0.15 });
  const speak = () => { if (sup === 0) { if (F.Speech) F.Speech.clearQueue(); K.num(X.total()); } };
  X = Bundles(K, pl.surf, { tap: (obj, kind) => { if (w.locked || S.solved || S.locked) return; if (X.remove(obj, kind)) { sfx('pop'); speak(); } } });
  if (sup === 0) X.ghost(Math.floor(t / 10), t % 10);
  const A = K.actions([
    { id: 'ten', thumb: { model: X.tenModel, opts: {}, angle: 0.25 }, label: '10', cls: 'ten' },
    { id: 'one', thumb: { model: X.oneModel, opts: {} }, label: '1', cls: 'one' },
    { id: 'ok', label: '✓', cls: 'gold okbtn' },
  ]);
  const done = K.arm({ answer: t });
  const w = K.widget({ kind: 'build', values: [],
    feed: v => { X.set(Math.floor(+v / 10), +v % 10); return K.submit(X.total(), w); },
    mark: (v, cls) => { if (cls === 'wrong') { M_.shake(X.g); goal.cls('pulse'); F.T.timeout(() => goal.cls('pulse', false), 1200); } else { X.unghost(); A.glow('ok', false); } },
    solution: () => {},
    lock: on => A.lock(on) });
  // WP-K «Hjelp meg»: a backward-faded worked step – the tens are laid for her (with the bundle line); the ones are hers
  w.helpStep = async () => { const tt = Math.floor(t / 10); if (X.tens.length === tt) return false; const ones = Math.min(X.ones.length, 9); X.set(tt, ones); sfx('chime'); await K.say('n2_f43_ten', { s: sf.is }); return true; };
  let busy = false;
  A.on(async id => {
    if (w.locked || S.solved || busy) return;
    if (id === 'ok') return K.submit(X.total(), w);
    busy = true;
    try {
      if (id === 'ten') { if (X.tens.length >= 9) sfx('boing'); else { X.addTen(); sfx('pop'); speak(); if (sup === 1 && !X.ones.length) { if (F.Speech) F.Speech.clearQueue(); K.num(X.total()); } } }
      else if (id === 'one') {
        if (X.tens.length >= 9 && X.ones.length >= 9) sfx('boing');
        else { X.addOne(); sfx('pop'); if (X.ones.length >= 10) { await X.bundle(); if (sup <= 1) K.say('n2_f43_ten', { s: sf.is }); } speak(); }
      }
    } finally { busy = false; }
  });
  K.hint(async (tag, v) => {
    goal.cls('pulse');
    if (v != null) await K.total(+v);
    await K.sayG(+v > t ? 'n2_for_mange' : 'n2_for_fa');
    if (tag === 'COUNT-ONES') await K.sayG('n2_f43_tiere_forst');
    else if (tag === 'REVERSAL') await K.sayG('n2_f43_tiere');
    else await K.sayG('n2_f43_ten', { s: sf.is });
    goal.cls('pulse', false);
  });
  K.sol(async () => { X.set(0, 0); X.ghost(Math.floor(t / 10), t % 10); if (t >= 10) A.glow('ten'); if (t % 10) A.glow('one'); A.glow('ok'); await K.say('n2_se'); });
  await sleep(300);
  await K.prompt('n2_f43_bygg');
  await done;
  X.unghost(); ['ok', 'ten', 'one'].forEach(id => A.glow(id, false));
  X.glowAll(true); sfx('sparkle');
  await K.say('n2_f43_ok');
  return S.result();
}

async function f43pay(K, B, pl, t) {
  const S = K.S, sup = K.item.sup, M_ = M();
  const VALS = [50, 20, 10, 5, 1];
  const price = K.label(K.anchor(0, 0.2, -1.15), t + ' kr', { cls: 'num price', dy: 0.15 });
  const paid = [];   // {v, obj}
  const sumOf = () => paid.reduce((a, p) => a + p.v, 0);
  const meter = sup === 0 ? K.label(K.anchor(2.4, 0.2, 1.1), '0', { cls: 'num small', dy: 0.1 }) : null;
  const layout = () => {
    const widths = paid.map(p => COIN[p.v][1]), gap = 0.1, W = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, paid.length - 1);
    let x = -W / 2; paid.forEach((p, i) => { p.obj.position.set(x + widths[i] / 2, 0, 0.35); x += widths[i] + gap; });
    if (meter) meter.set(String(sumOf()));
  };
  const add = v => { if (paid.length >= 14) { sfx('boing'); return; } const obj = K.piece(COIN[v][0], COIN[v][1], { hk: 1 }); B.add(obj, 0, 0.35, 0); const p = { v, obj }; paid.push(p); B.pick(obj, () => { if (w.locked || S.solved) return; const i = paid.indexOf(p); if (i >= 0) { paid.splice(i, 1); B.unpick(obj); obj.parent && obj.parent.remove(obj); sfx('pop'); layout(); } }); layout(); M_.popIn(obj, 200); sfx('coins', 1); };
  const set = list => { paid.splice(0).forEach(p => { B.unpick(p.obj); p.obj.parent && p.obj.parent.remove(p.obj); }); list.forEach(add); };
  const A = K.actions(VALS.map(v => ({ id: 'c' + v, thumb: { model: COIN[v][0], opts: {}, angle: 0.1 }, label: String(v), cls: 'coin' })).concat([{ id: 'ok', label: '✓', cls: 'gold okbtn' }]));
  const done = K.arm({ answer: t, check: v => +v === t && paid.length === pl.fewest });
  K.tag(v => +v === t ? 'NOT-FEWEST' : tagNum(t, +v));
  const w = K.widget({ kind: 'build', values: [],
    feed: v => {
      if (+v === t) set(pl.best);
      else { const alt = pl.best.slice(); const i = alt.indexOf(10) >= 0 ? alt.indexOf(10) : alt.indexOf(5); if (i >= 0) alt.splice(i, 1, ...(alt[i] === 10 ? [5, 5] : [1, 1, 1, 1, 1])); else alt.push(1); set(alt); }
      return K.submit(sumOf(), w);
    },
    mark: (v, cls) => { if (cls === 'wrong') { price.cls('pulse'); F.T.timeout(() => price.cls('pulse', false), 1200); } },
    solution: () => {}, lock: on => A.lock(on) });
  A.on(id => { if (w.locked || S.solved) return; if (id === 'ok') { if (!paid.length) { sfx('boing'); return; } K.submit(sumOf(), w); } else add(+id.slice(1)); });
  K.hint(async (tag, v) => {
    if (v != null) await K.total(+v);
    if (tag === 'NOT-FEWEST') { await K.sayG('n2_f43_h_faerre'); }
    else await K.sayG(+v > t ? 'n2_for_mange' : 'n2_for_fa');
    await K.sayG('n2_f43_h_stor');
  });
  K.sol(async () => {
    set([]);
    price.set(t + ' kr = ' + pl.best.join(' + '));
    [...new Set(pl.best)].forEach(v => A.glow('c' + v)); A.glow('ok');
    await K.say('n2_se');
  });
  await sleep(300);
  await promptSeq(K, [['n2_f43_betal']]);
  await done;
  VALS.forEach(v => A.glow('c' + v, false)); A.glow('ok', false);
  paid.forEach((p, i) => F.T.timeout(() => M_.bounce(p.obj, 0.25), i * 60)); sfx('sparkle');
  await K.say('n2_f43_ok');
  return S.result();
}

/* =====================================================================================================================
   8. F44 Tallinjebroen – a plank bridge over the pond with only the ends (or the tens) signed; tap scored by distance;
      the frog jumps to HER plank (look-back) and then shows the true spot; arrow / midpoint → keypad; R10 hops across a ten
   ===================================================================================================================== */
function Bridge(K, pl) {
  const B = K.B, L = 6.0, min = pl.min, max = pl.max;
  const g = new THREE.Group(); B.add(g, 0, 0.15, 0);
  const X = { L, min, max, g };
  X.pos = v => -L / 2 + (v - min) / (max - min) * L;
  X.val = x => min + (x + L / 2) / L * (max - min);
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L + 0.36, 0.12, 0.72), mat(0xc08a55)); deck.position.y = 0.16; g.add(deck);
  for (const z of [-0.36, 0.36]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(L + 0.36, 0.06, 0.06), mat(0x8a5a32)); rail.position.set(0, 0.42, z); g.add(rail); }
  for (const x of [-L / 2 - 0.12, L / 2 + 0.12]) for (const z of [-0.36, 0.36]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), mat(0x8a5a32)); post.position.set(x, 0.3, z); g.add(post); }
  const tick = (v, big) => { const m = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.06 : 0.035, 0.03, big ? 0.62 : 0.34), mat(big ? 0x5a3a1e : 0x6b4a2a)); m.position.set(X.pos(v), 0.235, big ? 0 : 0.12); g.add(m); };
  const tk = String(pl.ticks || 'none');
  if (tk === 'units') for (let v = min; v <= max; v++) tick(v, (v - min) % 10 === 0 && max - min > 10);
  if (tk === 'mid') tick((min + max) / 2, true);
  if (tk.startsWith('tens')) { for (let v = Math.ceil(min / 10) * 10; v <= max; v += 10) tick(v, true); const m = /units:(\d+)/.exec(tk); if (m) for (let v = +m[1] + 1; v < +m[1] + 10; v++) tick(v, false); }
  tick(min, true); tick(max, true);
  X.labels = {};
  (pl.labels || [min, max]).forEach(v => { if (X.labels[v]) return; const a = new THREE.Object3D(); a.position.set(X.pos(v), 0.25, 0.55); g.add(a); X.labels[v] = K.label(a, String(v), { cls: 'num small', dy: 0.12 }); });
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  pick.rotation.x = -Math.PI / 2; pick.position.y = 0.24; g.add(pick); X.pickMesh = pick;
  X.at = (cx, cy) => { const h = K.hitLocal(pick, cx, cy); if (!h) return null; const x = h.local.x; if (x < -L / 2 - 0.3 || x > L / 2 + 0.3) return null; return clamp(Math.round(X.val(clamp(x, -L / 2, L / 2))), min, max); };
  X.local = v => new V3(X.pos(v), 0.24, 0);
  // her marker (a little stone) / the true spot (a glowing lily pad)
  X.mark = (v, kind) => {
    const key = kind === 'sol' ? '_sol' : '_m';
    if (X[key]) { g.remove(X[key]); X[key] = null; }
    if (v == null) return null;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20), new THREE.MeshLambertMaterial({ color: kind === 'sol' ? 0xffe066 : 0xb9a7d8, emissive: kind === 'sol' ? 0x8a6a10 : 0x000000 }));
    m.position.set(X.pos(v), 0.25, -0.12); g.add(m); X[key] = m; return m;
  };
  X.arrow = v => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 16), new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x5a4008 }));
    cone.rotation.x = Math.PI; cone.position.set(X.pos(v), 0.62, -0.05); g.add(cone);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), new THREE.MeshLambertMaterial({ color: 0xc9962b })); stick.position.set(X.pos(v), 1.05, -0.05); g.add(stick);
    return cone;
  };
  X.flag = v => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.02), new THREE.MeshLambertMaterial({ color: 0xff7aa8 })); f.position.set(X.pos(v) + 0.13, 0.78, -0.3); g.add(f);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), new THREE.MeshLambertMaterial({ color: 0x8a5a32 })); pole.position.set(X.pos(v), 0.55, -0.3); g.add(pole); };
  X.dispose = () => { g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); if (m.material.dispose) m.material.dispose(); } }); };
  return X;
}

fmt('F44', { name: 'Tallinjebroen', mode: 'line', strands: { 'T-ORDEN': [[9, 9], [13, 13]], REGN: [10, 10], 'T-SKRIV': [9, 9] }, rungs: { 'T-ORDEN': [9, 13] }, places: ['bro', 'dam', 'tallveien', 'any'], family: 'tallinje', portable: true,
  think: 'REGNE', tpl: ['n2_f44_hvor', 'n2_f44_pil', 'n2_f44_midt', 'n2_f44_hopp'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, t = item.target, sup = item.sup, M_ = M();
    const B = K.board({ style: 'pond', w: 7.4, d: 2.6, h: 1.0 });
    const X = Bridge(K, pl); K.offs.push(() => X.dispose()); K.bridge = X;
    const frog = K.piece(frogModel(), 0.5, { hk: 0.8 });
    const bank = new V3(-X.L / 2 - 0.4, 0.2, 0.75);
    if (pl.mode === 'jump') { B.add(frog, 0, 0, 0); frog.position.copy(X.local(pl.a).add(X.g.position)); }
    else { B.add(frog, bank.x, bank.z, bank.y); }
    const frogTo = async (v, h) => { const p = v == null ? bank.clone() : X.local(v).add(new V3(0, 0.02, 0)); p.add(X.g.position); await M_.hopTo(frog, p, 460, h || 0.7); sfx('boing'); };
    let sign = null, card = null;
    if (pl.mode === 'place') sign = K.label(frog, String(t), { cls: 'num goal', dy: 0.9 });
    if (pl.mode === 'arrow') X.arrow(pl.at);
    if (pl.mode === 'mid') { X.flag(pl.a); X.flag(pl.b); }
    if (pl.mode === 'jump') card = K.card(pl.expr.replace(/([+−])/, '<span class="ar">$1</span>') + ' = <span class="q">?</span>');
    const keypadMode = pl.mode === 'arrow' || pl.mode === 'mid';
    const ask = () => K.prompt(pl.mode === 'place' ? 'n2_f44_hvor' : pl.mode === 'arrow' ? 'n2_f44_pil' : pl.mode === 'mid' ? 'n2_f44_midt' : 'n2_f44_hopp');
    let herL = null, lastDist = null;
    const herLabel = v => { if (herL) herL.remove(); if (v == null || v < X.min || v > X.max) return; const a = new THREE.Object3D(); a.position.copy(X.local(v)); a.position.z = -0.45; X.g.add(a); herL = K.label(a, String(v), { cls: 'num small guess', dy: 0.15 }); };
    K.hint(async (tag, v) => {
      // look-back: the frog jumps to HER spot; the number that really lives there shows
      if (v != null && +v >= X.min && +v <= X.max) {
        const start = pl.mode === 'jump' ? pl.a : null;
        await frogTo(+v); herLabel(+v); await K.sayG('n2_f44_h_her'); await K.numG(+v);
        if (pl.mode === 'place') await K.sayG(+v > t ? 'n2_f44_h_langt' : 'n2_f44_h_kort');
        await K.sleepG(300); await frogTo(start);
      }
      if (pl.mode === 'place') {
        if (sup <= 1) { await K.sayG('n2_f44_h_endene'); Object.values(X.labels).forEach(L => L.cls('pulse')); await K.sleepG(900); Object.values(X.labels).forEach(L => L.cls('pulse', false)); }
        if (sup === 0 || pl.max - pl.min <= 20) await K.sayG('n2_f44_h_midten');
      } else if (pl.mode === 'jump') {
        await K.sayG('n2_f44_h_tier');
        if (sup <= 1) {   // the first part of the hop (to the ten) – never the rest
          const ten = pl.op === '+' ? Math.ceil(pl.a / 10) * 10 : Math.floor(pl.a / 10) * 10;
          const st = pl.op === '+' ? 1 : -1;
          for (let x = pl.a + st; st > 0 ? x <= ten : x >= ten; x += st) { K.g(); await M_.hopTo(frog, X.local(x).add(X.g.position), 200, 0.3); }
          await K.sleepG(500); await frogTo(pl.a);
        }
      } else if (pl.mode === 'arrow') {
        await K.sayG('n2_f44_h_streker');
      } else await K.sayG('n2_f44_h_midten');
    });
    if (S.lookBack) S.lookBack(async v => { if (S.stepTries < 2 || !(+v >= X.min && +v <= X.max)) return; await frogTo(+v); herLabel(+v); await sleep(450); await frogTo(pl.mode === 'jump' ? pl.a : null); });
    K.sol(async () => {
      if (keypadMode) {
        if (pl.mode === 'arrow') { const d = Math.floor(pl.at / 10) * 10; await frogTo(d); for (let x = d + 1; x <= pl.at; x++) { await M_.hopTo(frog, X.local(x).add(X.g.position), 220, 0.3); } }
        else await frogTo(t);
        if (S.active && S.active.solution) S.active.solution(t); await K.say('core_sol_keys'); return;
      }
      if (pl.mode === 'jump') { for (let x = pl.a; x !== t;) { x += pl.op === '+' ? 1 : -1; await M_.hopTo(frog, X.local(x).add(X.g.position), 200, 0.3); } await frogTo(pl.a); }
      X.mark(t, 'sol'); await K.say('core_sol_chip');
    });
    await sleep(300);
    ask();
    if (keypadMode) await K.keypad(t, { showLen: sup === 0 });
    else {
      const tol = pl.tol || 0;
      const done = K.arm({ answer: t, check: v => isNum(v) && Math.abs(+v - t) <= tol });
      const w = K.widget({ kind: 'line', values: range(X.min, X.max),
        feed: v => { const n = isNum(v) ? clamp(Math.round(+v), X.min, X.max) : clamp(t + tol + 4, X.min, X.max); X.mark(n); lastDist = Math.abs(n - t); return K.submit(n, w); },
        mark: () => {}, solution: () => {} });
      K.tag(v => { const d = Math.abs(+v - t); return pl.mode === 'jump' && d === 10 ? 'NO-CARRY' : d >= 15 ? 'FAR' : 'NEAR'; });
      K.onCanvas('pointerdown', e => {
        if (!B.alive || w.locked || w.dead || S.solved || S.ended || S.locked) return;
        const v = X.at(e.clientX, e.clientY); if (v == null) return;
        sfx('click'); X.mark(v); lastDist = Math.abs(v - t); K.submit(v, w);
      });
      await done;
    }
    // payoff: the frog lands on the true spot; its number shows
    try {
      if (herL) herL.remove();
      X.mark(null); X.mark(null, 'sol');
      await frogTo(t, 0.9);
      const a = new THREE.Object3D(); a.position.copy(X.local(t)); a.position.z = -0.45; X.g.add(a); K.label(a, String(t), { cls: 'num small', dy: 0.15 });
      if (sign) sign.cls('done');
      sfx('sparkle'); await K.say('n2_f44_ok');
    } catch (e) {}
    return S.result(lastDist != null ? { dist: lastDist } : null);
  } });

/* =====================================================================================================================
   9. F46 Hulen med teppet – crystals in the cave, a velvet cloth of FIXED size (hint_leaks #7: its width never shows how many);
      «alle måtene»: move crystals between two baskets, keep each split on the shelf, Ferdig when the list is complete
   ===================================================================================================================== */
const CRY = () => F.VOX.has('fx_n_krystall') ? 'fx_n_krystall' : 'fx_n_eple';
fmt('F46', { name: 'Hulen med teppet', mode: 'keypad', g: 0.01, strands: { REGN: [[1, 2], [6, 6]] }, places: ['krystallhule', 'hule', 'any'], family: 'teppe', portable: true,
  think: 'REGNE', tpl: ['n2_f46_under', 'n2_f46_forst', 'n2_f46_flaug', 'n2_f46_alle'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, t = item.target, sup = item.sup, M_ = M();
    const B = K.board({ style: 'velvet', w: 6.8, d: 3.0, h: 0.9 });
    if (F.VOX.has('n_krystaller')) { const d1 = K.piece('n_krystaller', 0.9); B.add(d1, -3.0, -1.2, 0); const d2 = K.piece('n_krystaller', 0.7); B.add(d2, 3.05, -1.25, 0); }
    if (pl.mode === 'list') return f46list(K, B, pl, t);
    const size = 0.3;
    const mk = () => K.piece(CRY(), size, { hk: 0.9 });
    // the left group (visible crystals): a ten-frame at s0 for wholes ≤ 10 (the structure is the s0 scaffold), else a loose cluster
    const vis = [];
    let frame = null;
    const clusterPos = i => new V3(-2.6 + (i % 5) * 0.42 + (Math.floor(i / 5) % 2) * 0.2, 0, -0.5 + Math.floor(i / 5) * 0.48);
    const addVis = (n, o) => {
      if (sup === 0 && pl.whole <= 10 && pl.mode === 'cave' && NUM().TenView) {
        frame = NUM().TenView(B, { model: CRY(), layout: 'frames', box: 'rail', max: 10, size: size * 0.95, x: -1.75, z: -0.1, container: true });
        for (let i = 0; i < n; i++) { const p = frame.place(i); vis.push(p); M_.popIn(p, 200); }
        return;
      }
      for (let i = 0; i < n; i++) { const p = mk(); B.add(p, clusterPos(i).x, clusterPos(i).z, 0); vis.push(p); if (!o || o.pop !== false) M_.popIn(p, 200); }
    };
    // the cloth: always the same size, over a fixed spot
    const cloth = K.piece('fx_n_klut', 2.2, { hk: 1 }); B.add(cloth, 1.55, 0.05, 0);
    const clothY0 = cloth.position.y;
    const hidden = [];
    const under = n => { for (let i = 0; i < n; i++) { const p = mk(); const x = 0.95 + (i % 4) * 0.38, z = -0.45 + Math.floor(i / 4) * 0.42; B.add(p, x, z, 0); p.visible = false; hidden.push(p); } };
    const wholeSign = K.label(K.anchor(-2.7, 0.3, -1.25), pl.mode === 'first' ? '?' : String(pl.whole), { cls: pl.mode === 'first' ? 'num goal blank' : 'num goal', dy: 0.2 });
    let card = null;
    const flyOut = async (n, o) => {    // n crystals pop out of the cloth; to the shelf on the left (countable) or away (a burst)
      const out = [];
      for (let i = 0; i < n; i++) {
        const p = mk(); B.add(p, 1.55, 0.05, 0.25); out.push(p);
        if (o.away) { const to = new V3(1.0 + (i % 3) * 0.5, 2.6, -1.4); M_.hopTo(p, to, 520, 0.8).then(() => { p.visible = false; }); }
        else { const to = new V3(-2.6 + (i % 5) * 0.42, 0, 0.75 + Math.floor(i / 5) * 0.4); await M_.hopTo(p, to, 380, 0.9); sfx('pop'); }
      }
      if (o.away) { sfx('magic'); await sleep(700); }
      return out;
    };
    let gone = [];
    if (pl.mode === 'cave') { addVis(pl.shown); under(pl.whole - pl.shown); }
    if (pl.mode === 'take') { under(pl.whole - pl.gone); }
    if (pl.mode === 'flew') { addVis(pl.left); cloth.visible = false; }
    if (pl.mode === 'first') { under(pl.left); }
    if (pl.mode === 'flew' || pl.mode === 'first' || sup === 2) card = K.card(pl.eq, { cls: 'small' });
    if (pl.mode === 'first') K.label(cloth, String(pl.left), { cls: 'num small', dy: 0.75 });
    await sleep(500);
    if (pl.mode === 'take' || pl.mode === 'first' || pl.mode === 'flew') {
      const say = K.say('n2_f46_fly');
      gone = await flyOut(pl.mode === 'flew' ? pl.gone : pl.mode === 'take' ? pl.gone : pl.gone, { away: pl.mode === 'flew' });
      await say;
      if (pl.mode === 'first') K.label(K.anchor(-1.8, 0.2, 1.2), String(pl.gone), { cls: 'num small', dy: 0.1 });
    }
    const ask = () => K.prompt(pl.mode === 'first' ? 'n2_f46_forst' : pl.mode === 'flew' ? 'n2_f46_flaug' : 'n2_f46_under');
    let lb = [];
    const clearLb = () => { lb.forEach(p => p.parent && p.parent.remove(p)); lb = []; };
    K.hint(async (tag, v) => {
      clearLb();
      v = +v;
      if (isFinite(v) && v >= 0 && v <= 20) {
        // look-back: HER number acted out – her crystals pop out beside the cloth, and what that would make
        for (let i = 0; i < v; i++) { const p = mk(); B.add(p, 2.95 - Math.floor(i / 5) * 0.36, -0.85 + (i % 5) * 0.4, 0); p.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.75; } }); lb.push(p); M_.popIn(p, 160); }
        await K.sleepG(300);
        const her = pl.mode === 'cave' ? pl.shown + v : pl.mode === 'take' ? pl.gone + v : pl.mode === 'flew' ? pl.whole - v : v - pl.gone;
        if (her >= 0 && her <= 40) { await K.sayG('n2_det_ble', { n: her }); }
      }
      await K.sleepG(300); clearLb();
      if (pl.mode === 'cave' || pl.mode === 'take') {
        if (sup <= 1) { await K.sayG('n2_f46_h_synes'); (pl.mode === 'cave' ? vis : gone).forEach(p => M_.glowObj(p, true)); await K.sleepG(700); (pl.mode === 'cave' ? vis : gone).forEach(p => M_.glowObj(p, false)); }
        wholeSign.cls('pulse'); await K.sayG('n2_f46_h_hele'); await K.sleepG(500); wholeSign.cls('pulse', false);
      } else if (pl.mode === 'first') { wholeSign.cls('pulse'); await K.sayG('n2_f46_h_hele'); wholeSign.cls('pulse', false); }
      else { wholeSign.cls('pulse'); await K.sayG('n2_f46_h_hele'); wholeSign.cls('pulse', false); await K.sayG('n2_f46_h_synes'); }
    });
    const lift = async (h) => { await tween(500, k => { cloth.position.y = clothY0 + ease(k) * h; cloth.rotation.z = ease(k) * 0.25; }); hidden.forEach(p => { p.visible = true; M_.popIn(p, 200); }); };
    K.sol(async () => {
      clearLb();
      if (pl.mode === 'cave' || pl.mode === 'take' || pl.mode === 'first') {
        await lift(0.9);
        let s = pl.mode === 'cave' ? pl.shown : 0;
        if (pl.mode !== 'first') for (const p of hidden) { s++; M_.glowObj(p, true); await K.num(pl.mode === 'take' ? s : s); }
        await tween(400, k => { cloth.position.y = clothY0 + (1 - ease(k)) * 0.9; cloth.rotation.z = (1 - ease(k)) * 0.25; }); hidden.forEach(p => { p.visible = false; M_.glowObj(p, false); });
      }
      if (S.active && S.active.solution) S.active.solution(t);
      await K.say('core_sol_keys');
    });
    ask();
    await K.keypad(t, { showLen: sup === 0 });
    clearLb();
    // payoff: the cloth lifts – what was hidden shows; the whole is counted on
    try {
      sfx('magic');
      await lift(1.4);
      if (pl.mode === 'cave') { let s = pl.shown; for (const p of hidden) { s++; M_.glowObj(p, true); M_.bounce(p, 0.25); await K.num(s); } }
      else hidden.forEach(p => M_.bounce(p, 0.25));
      await K.say('n2_f46_ok');
    } catch (e) {}
    return S.result();
  } });

async function f46list(K, B, pl, t) {
  const S = K.S, sup = K.item.sup, M_ = M(), n = pl.whole;
  const all = t.slice();
  const bL = K.piece('fx_n_kurv', 1.9, { hk: 1 }); B.add(bL, -1.75, 0.15, 0);
  const bR = K.piece('fx_n_kurv', 1.9, { hk: 1 }); B.add(bR, 1.75, 0.15, 0);
  const cry = [];   // {obj, side}
  const slot = (side, j) => new V3((side ? 1.75 : -1.75) + ((j % 4) - 1.5) * 0.36, 0.28, -0.12 + Math.floor(j / 4) * 0.3);
  const layout = () => { let l = 0, r = 0; cry.forEach(c => { const p = slot(c.side, c.side ? r++ : l++); c.obj.position.copy(p); }); cntL.set(String(cry.filter(c => !c.side).length)); cntR.set(String(cry.filter(c => c.side).length)); };
  const cntL = K.label(bL, '0', { cls: 'num small', dy: 0.9 }), cntR = K.label(bR, String(n), { cls: 'num small', dy: 0.9 });
  let w = null;
  for (let i = 0; i < n; i++) {
    const obj = K.piece(CRY(), 0.28, { hk: 0.9 }); B.add(obj, 0, 0, 0); const c = { obj, side: 1 }; cry.push(c);
    B.pick(obj, () => { if (!w || w.locked || S.solved || S.locked) return; c.side = 1 - c.side; sfx('pop'); const to = slot(c.side, cry.filter(x => x.side === c.side && x !== c).length); M_.hopTo(obj, to, 260, 0.5).then(layout); });
  }
  layout();
  // the shelf: kept splits «3 | 4»; after an error they sort themselves into the systematic order (gaps shown at s0/s1)
  const shelfEl = document.createElement('div'); shelfEl.className = 'n2-shelf'; document.body.appendChild(shelfEl);
  S.notes.push({ el: shelfEl, text: '', remove() { shelfEl.remove(); } });
  const kept = [];
  let showGaps = false, ghosts = false;
  const keyOf = (l, r) => l + '+' + r;
  const drawShelf = (fresh) => {
    shelfEl.innerHTML = '';
    const list = showGaps || ghosts ? all : kept;
    list.forEach(k => {
      const has = kept.includes(k);
      if (!has && !showGaps && !ghosts) return;
      const d = document.createElement('div'); const [l, r] = k.split('+');
      d.className = 'n2-split' + (has ? '' : ghosts ? ' ghost' : ' gap') + (k === fresh ? ' new' : '');
      d.textContent = l + ' | ' + r; shelfEl.appendChild(d);
    });
  };
  const row = K.row([{ id: 'save', label: 'Husk ＋' }, { id: 'ok', label: 'Ferdig ✓', cls: 'gold okbtn' }]);
  const done = K.arm({ answer: all, check: v => Array.isArray(v) && v.length === all.length && all.every(k => v.includes(k)) });
  K.tag(() => 'MISSING');
  w = K.widget({ kind: 'list', values: all,
    feed: v => { kept.splice(0); (Array.isArray(v) ? v : all.slice(0, -1)).forEach(k => { if (all.includes(k) && !kept.includes(k)) kept.push(k); }); drawShelf(); return K.submit(kept.slice(), w); },
    mark: () => {}, solution: () => {}, lock: on => row.lock(on) });
  w.helpStep = async () => { const k = all.find(x => !kept.includes(x)); if (!k) return false; kept.push(k); kept.sort((a, b) => +a.split('+')[0] - +b.split('+')[0]); drawShelf(k); sfx('chime'); await K.say('n2_f46_h_orden'); return true; };
  const save = () => {
    const l = cry.filter(c => !c.side).length, k = keyOf(l, n - l);
    if (kept.includes(k)) { K.say('n2_f46_denharvi'); return; }
    kept.push(k); sfx('chime'); drawShelf(k);
    if (ghosts && all.every(x => kept.includes(x))) row.glow('ok');
  };
  row.on(id => { if (w.locked || S.solved || S.locked) return; if (id === 'save') save(); else { if (!kept.length) { sfx('boing'); return; } K.submit(kept.slice(), w); } });
  K.hint(async () => {
    kept.sort((a, b) => +a.split('+')[0] - +b.split('+')[0]);
    showGaps = sup <= 1; drawShelf();
    await K.sayG('n2_f46_h_mangler');
    if (!kept.includes(keyOf(0, n)) || !kept.includes(keyOf(n, 0))) await K.sayG('n2_f46_h_orden');
  });
  K.sol(async () => { ghosts = true; drawShelf(); await K.say('n2_se'); });
  await promptSeq(K, [['n2_f46_del'], ['n2_f46_alle'], ['n2_f46_lagre']]);
  await done;
  row.glow('ok', false); ghosts = false; showGaps = false; kept.sort((a, b) => +a.split('+')[0] - +b.split('+')[0]); drawShelf();
  cry.forEach((c, i) => F.T.timeout(() => M_.bounce(c.obj, 0.25), i * 50)); sfx('sparkle');
  await K.say('n2_f46_alleok');
  return S.result();
}

/* =====================================================================================================================
   10. F47 Tiervenn-portene – a corridor of 5 garden gates; the fact glows on the gate, the keypad opens it; no numbers are
       spoken; response time is logged silently (Flu: at s2 a slow but right run counts B, res.slow → the engine routes to strategy)
   ===================================================================================================================== */
function gateMesh() {
  const g = new THREE.Group(), mat = c => new THREE.MeshLambertMaterial({ color: c });
  const post = x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), mat(0xf4efe6)); m.position.set(x, 0.52, 0); g.add(m); };
  post(-0.46); post(0.46);
  const arch = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.12, 0.16), mat(0xf4efe6)); arch.position.set(0, 1.08, 0); g.add(arch);
  const roses = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.2), mat(0xff8fb8)); roses.position.set(0, 1.18, 0); g.add(roses);
  const leaf = side => { const p = new THREE.Group(); p.position.set(side * 0.4, 0, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.78, 0.05), mat(0x9ad27a)); m.position.set(-side * 0.2, 0.45, 0); p.add(m);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.07), mat(0x5f9a48)); bar.position.set(-side * 0.2, 0.62, 0); p.add(bar); g.add(p); return p; };
  g.userData.l = leaf(-1); g.userData.r = leaf(1);
  return g;
}
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
fmt('F47', { name: 'Tiervenn-portene', mode: 'keypad', g: 0.01, strands: { REGN: [[1, 1], [3, 3], [5, 5], [8, 9], [11, 12]] }, places: ['rosehagen', 'hage', 'any'], family: 'porter', portable: true,
  think: 'HUSKE', fluency: true, tpl: ['n2_f47_start', 'n2_f47_port', 'n2_f47_ok', 'n2_f47_alle'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, sup = item.sup, M_ = M();
    const B = K.board({ style: 'grass', w: 7.4, d: 2.4, h: 1.4 });
    const gates = [], xs = [-2.7, -1.35, 0, 1.35, 2.7];
    xs.forEach((x, i) => { const g = gateMesh(); B.add(g, x, -0.2, 0); g.traverse(m => { if (m.isMesh) { m.castShadow = false; } }); gates.push(g); });
    K.offs.push(() => gates.forEach(g => g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } })));
    const fe = K.piece('fx_n_fe', 0.5, { opts: { dress: fairyDress() }, hk: 0.5 }); B.add(fe, xs[0] - 0.75, 0.55, 0);
    const plaques = gates.map(g => K.label(g, '', { cls: 'num big', dy: 1.6 }).show(false));
    const open = async i => { const g = gates[i]; sfx('chime'); await tween(420, k => { g.userData.l.rotation.y = -ease(k) * 1.5; g.userData.r.rotation.y = ease(k) * 1.5; }); };
    const show = f => f.q.includes('?') ? f.q : f.q + ' = ?';
    const facts = pl.facts, log = [];
    let curFact = null, curI = 0;
    K.tag(v => {
      const f = curFact; if (!f) return 'OTHER';
      const t = f.a; v = +v;
      if (f.kind === 'tiervenn' && v === 10 + (10 - t)) return 'ADD-ALL';
      if (Math.abs(v - t) === 10) return 'NO-CARRY';
      if (Math.abs(v - t) === 1) return 'OFF-BY-ONE';
      return tagNum(t, v);
    });
    K.hint(async (tag, v) => {
      const f = curFact; if (!f) return;
      // look-back: her answer stands in the fact; the gate shakes and stays shut
      const L = plaques[curI];
      if (v != null && isFinite(+v)) { L.set(f.q.includes('?') ? f.q.replace('?', String(+v)) : f.q + ' = ' + (+v)).cls('wrong'); M_.shake(gates[curI]); await K.sleepG(1100); L.set(show(f)).cls('wrong', false); }
      // v5r2: R11 / R12 have their own strategy lines; a 2nd hint on the same gate («Hjelp meg» after a miss) says the next step of
      // that strategy instead of repeating the first line – neither ever names the answer
      const nh = f.nh = (f.nh || 0) + 1;
      // (v5r2b: a whole ten to 100 – «60 + ? = 100», R12 s0 – has no «next ten» step: it gets the count-by-tens line first)
      const wholeT = f.kind === 'hundre' && +((/^\d+/.exec(String(f.q)) || ['1'])[0]) % 10 === 0;
      const line = nh > 1 && (f.kind === 'veksle' || f.kind === 'veksleM') ? 'n2_f47_h_veksle2' : (nh > 1 || wholeT) && f.kind === 'hundre' ? 'n2_f47_h_hundre2'
        : { tiervenn: 'n2_f47_h_tiervenn', tiervenn10: 'n2_f47_h_tiervenn', dobbel: 'n2_f47_h_dobbel', naer: 'n2_f47_h_naer', fyll: 'n2_f47_h_fyll', enere: 'n2_f47_h_enere', tiere: 'n2_f47_h_tiere', tell: 'n2_f47_h_tell', bakover: 'n2_f47_h_bakover',
          veksle: 'n2_f47_h_veksle', veksleM: 'n2_f47_h_veksle_m', hundre: 'n2_f47_h_hundre' }[f.kind] || 'n2_f47_h_fyll';
      // s0/s1, bonds to ten: the known part in a ten-frame in front of the gate (the empty cells are the model, not a digit)
      let frame = null;
      if (sup <= 1 && f.kind === 'tiervenn' && f.a >= 0 && f.a <= 10 && NUM().TenView) {
        frame = NUM().TenView(B, { model: CRY(), layout: 'frames', box: 'rail', max: 10, size: 0.3, x: xs[curI], z: 0.75, container: true });
        for (let i = 0; i < 10 - f.a; i++) M_.popIn(frame.place(i), 160);
      }
      try { await K.sayG(line); if (frame) await K.sleepG(1800); }
      finally { if (frame && frame.group.parent) frame.group.parent.remove(frame.group); }
    });
    K.sol(async () => { if (S.active && S.active.solution) S.active.solution(curFact.a); await K.say('core_sol_keys'); });
    await sleep(300);
    await K.prompt('n2_f47_start');
    for (let i = 0; i < facts.length && !S.ended; i++) {
      curI = i; curFact = facts[i];
      if (i > 0) await K.say('n2_f47_port');
      plaques[i].set(show(facts[i])).show(true).cls('pulse');
      F.T.timeout(() => plaques[i].cls('pulse', false), 700);
      const t0 = F.T.now, tries0 = S.tries;
      if (S.active && S.active.kind === 'keypad' && S.active.destroy) S.active.destroy();
      await K.keypad(facts[i].a, { showLen: sup === 0 });
      log.push({ q: facts[i].q, a: facts[i].a, ms: Math.round((F.T.now - t0) * 1000), first: S.tries === tries0 && !S.solShown });
      plaques[i].set(facts[i].q.includes('?') ? facts[i].q.replace('?', String(facts[i].a)) : facts[i].q + ' = ' + facts[i].a).cls('done');
      await open(i);
      await M_.hopTo(fe, new V3(xs[i] + 0.55, 0, 0.55), 420, 0.5);
      plaques[i].show(false);
      if (i < facts.length - 1) K.say('n2_f47_ok');
    }
    if (S.active && S.active.destroy) S.active.destroy();
    sfx('sparkle'); await K.say('n2_f47_alle');
    const firstMs = log.filter(x => x.first).map(x => x.ms);
    const med = median(firstMs);
    const extra = { facts: log, medianMs: Math.round(med) };
    const base = S.result();
    if (sup === 2 && base.outcome === 'A' && med > (pl.fluMs || 3500)) { extra.outcome = 'B'; extra.slow = true; }
    return S.result(extra);
  } });

/* =====================================================================================================================
   11. F48 Tibrettet – the bakery ten-tray. 2T: step 1 = the strategy (how many move to fill the tray / take from the ones first /
       which two plates make ten), step 2 = the answer on the keypad. A needs both first-try.
   ===================================================================================================================== */
const BUN = () => F.VOX.has('bolle') ? 'bolle' : 'fx_n_bolle';
fmt('F48', { name: 'Tibrettet', mode: 'twostep', g: 0.01, strands: { REGN: [[4, 5], [7, 7], [10, 10]] }, places: ['bakeri', 'bakery', 'kitchen', 'any'], roles: ['kokk'], family: 'brett', portable: true,
  think: 'REGNE', tpl: ['n2_f48_fyll', 'n2_f48_flytt', 'n2_f48_tar', 'n2_f48_par', 'n2_f48_blir', 'n2_f48_igjen'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, t = item.target, sup = item.sup, M_ = M();
    const B = K.board({ style: 'bakery', w: 6.8, d: 3.0, h: 0.6 });
    const card = K.card(pl.expr.replace(/([+−])/g, '<span class="ar">$1</span>') + ' = <span class="q">?</span>');
    const bsz = 0.38, mkBun = () => K.piece(BUN(), bsz, { hk: 0.8 });
    const plateMesh = (x, z, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.85, (r || 0.85) * 0.92, 0.06, 28), new THREE.MeshLambertMaterial({ color: 0xffffff })); m.position.set(x, 0.03, z); B.top.add(m); K.offs.push(() => { m.geometry.dispose(); m.material.dispose(); }); return m; };
    if (pl.mode === 'three') return f48three(K, B, pl, t, mkBun, plateMesh);
    // stack of full trays (the tens), the working tray (TenView 2×5), the plate with loose buns
    const tensFull = pl.mode === 'add' ? pl.tens : pl.tens - 1;
    const stack = [];
    for (let i = 0; i < tensFull; i++) { const p = K.piece(NUM().tenDef ? NUM().tenDef(BUN(), 'frames') : BUN(), 1.25, { hk: 1.2 }); B.add(p, -2.55, -0.55, 0.02 + i * 0.13); stack.push(p); }
    if (tensFull > 0) K.label(stack[stack.length - 1], String(tensFull * 10), { cls: 'num small ten', dy: 0.45 });
    const T = NUM().TenView(B, { model: BUN(), layout: 'frames', box: 'tray', max: 10, size: bsz, x: -0.35, z: 0.1, container: true });
    const inTray = pl.mode === 'add' ? pl.ones : 10;
    for (let i = 0; i < inTray; i++) T.place(i);
    // s2 «fill the tray first»: the buns lie in a heap and the tray frame shows only after step 1 – the empty cells would otherwise
    // show how many must move; at s2 that must come from the bond to ten
    const heap = pl.mode === 'add' && sup === 2;
    if (heap) {
      T.boxes.forEach(bx => { bx.visible = false; });
      T.items.forEach((o, i) => { if (!o) return; const a = i * 2.4, rr = 0.12 + 0.11 * Math.sqrt(i); o.position.set(Math.cos(a) * rr, 0.1 + (i % 3) * 0.04, Math.sin(a) * rr * 0.8); });
    }
    const unheap = () => { if (!heap) return; T.boxes.forEach(bx => { bx.visible = true; }); T.items.forEach((o, i) => { if (o) o.position.copy(T.slots[i]); }); };
    plateMesh(2.05, 0.15);
    const loose = [];
    const looseN = pl.mode === 'add' ? pl.b : pl.ones;
    const platePos = j => new V3(1.7 + (j % 3) * 0.36, 0.06, -0.25 + Math.floor(j / 3) * 0.36);
    for (let j = 0; j < looseN; j++) { const p = mkBun(); B.add(p, platePos(j).x, platePos(j).z, 0.06); loose.push(p); }
    const traySlotLocal = i => { const w = T.slotWorld(i); return B.top.worldToLocal(w); };
    const free = () => { const out = []; for (let i = 0; i < 10; i++) if (!T.items[i]) out.push(i); return out; };
    // move k loose buns into the tray (add) or away (sub); returns the buns moved
    const moveIn = async (k, o) => {
      const moved = [];
      for (let i = 0; i < k && loose.length; i++) {
        const p = loose.pop(); const fr = free();
        if (!fr.length) {   // no room: it bounces back
          await M_.hopTo(p, traySlotLocal(9).add(new V3(0.2, 0.4, 0)), 260, 0.6); sfx('boing'); await M_.hopTo(p, platePos(loose.length), 260, 0.4); loose.push(p); break;
        }
        await M_.hopTo(p, traySlotLocal(fr[0]), 300, 0.6); sfx('pop'); B.top.remove(p); T.place(fr[0]); moved.push(fr[0]);
      }
      return moved;
    };
    const moveBack = async slots => { for (const i of slots) { const o = T.items[i]; if (!o) continue; T.group.remove(o); T.items[i] = null; const p = mkBun(); B.add(p, platePos(loose.length).x, platePos(loose.length).z, 0.06); loose.push(p); } };
    const takeAway = async k => { for (let i = 0; i < k && loose.length; i++) { const p = loose.pop(); await tween(260, q => { p.position.y = 0.06 + q * 1.2; p.scale.setScalar(Math.max(0.01, 1 - q)); }); B.top.remove(p); sfx('pop'); } };
    const ask1 = () => K.prompt(pl.mode === 'add' ? 'n2_f48_flytt' : 'n2_f48_tar');
    // ---------- step 1: the strategy
    let step = 1;
    K.hint(async (tag, v) => {
      v = +v;
      if (step === 1) {
        unheap();                                                           // after an error the tray (the model) shows
        if (pl.mode === 'add' && isFinite(v) && v > 0 && v <= 9) {           // look-back: HER number of buns moves
          const moved = await moveIn(v);
          await K.sayG(free().length ? 'n2_f48_h_plass' : 'n2_f48_h_ikkeplass');
          await K.sleepG(500); await moveBack(moved);
        } else if (pl.mode === 'sub') {
          await K.sayG('n2_f48_h_enere'); loose.forEach(p => M_.glowObj(p, true)); await K.sleepG(900); loose.forEach(p => M_.glowObj(p, false));
        }
        if (pl.mode === 'add') await K.sayG('n2_f48_fyll');
        return;
      }
      if (isFinite(v) && v >= 0 && v <= 40) await K.sayG('n2_det_ble', { n: v });
      if (Math.abs(v - t) === 10) await K.sayG('n2_f43_ten', { s: 'Et fullt brett er ti boller' });
      if (sup <= 1) { T.items.filter(Boolean).forEach(o => M_.glowObj(o, true)); await K.sayG('n2_f43_ten', { s: 'Et fullt brett er ti boller' }); await K.sleepG(500); T.items.filter(Boolean).forEach(o => M_.glowObj(o, false)); }
    });
    K.sol(async () => { if (S.active && S.active.solution) S.active.solution(S.expected); await K.say('core_sol_keys'); });
    await sleep(400);
    if (pl.mode === 'add') await K.say('n2_f48_fyll');
    if (sup === 0) {
      // s0: tap the buns that move (add) / the buns taken from the ones (sub) – the structure does the checking
      const done = K.arm({ answer: pl.step1 });
      let n = 0;
      const w = K.widget({ kind: 'taps', values: [], feed: v => {
        if (w._busy) return true;
        if (+v !== pl.step1) return K.submit(isFinite(+v) ? +v : pl.step1 + 1, w);
        w._busy = true;
        (async () => { if (pl.mode === 'add') await moveIn(pl.step1 - n); else await takeAway(pl.step1 - n); n = pl.step1; if (S.active === w && !S.solved) K.submit(pl.step1, w); w._busy = false; })();
        return true; }, mark() {}, solution() {} });
      loose.forEach(p => B.pick(p, async () => {
        if (w.locked || S.solved) return;
        B.unpick(p);
        if (pl.mode === 'add') { const i = loose.indexOf(p); if (i >= 0) { loose.splice(i, 1); loose.push(p); } const m = await moveIn(1); if (m.length) n++; if (!free().length) { await K.say('n2_f48_fullt'); K.submit(n, w); } }
        else { const i = loose.indexOf(p); if (i >= 0) { loose.splice(i, 1); loose.push(p); } await takeAway(1); n++; if (!loose.length) K.submit(n, w); }
      }));
      K.prompt(pl.mode === 'add' ? 'n2_f48_tap' : 'n2_f48_tar');
      await done;
    } else {
      ask1();
      await K.keypad(pl.step1, { showLen: false });
      unheap();
      if (pl.mode === 'add') await moveIn(pl.step1); else await takeAway(pl.step1);
      if (S.active && S.active.destroy) S.active.destroy();
      if (pl.mode === 'add' && !free().length) await K.say('n2_f48_fullt');
    }
    // ---------- step 2: the answer
    step = 2;
    if (pl.mode === 'sub' && sup <= 1) {     // the rest comes from the full tray (shown at s0/s1)
      const rest = pl.b - pl.step1;
      card.set(`${pl.a - pl.step1} <span class="ar">−</span> ${rest} = <span class="q">?</span>`);
      for (let i = 0; i < rest; i++) { const o = T.items[9 - i]; if (o) { await tween(220, q => { o.position.y = 0.1 + q; o.scale.setScalar(Math.max(0.01, 1 - q)); }); T.group.remove(o); T.items[9 - i] = null; } }
    }
    K.prompt(pl.mode === 'add' ? 'n2_f48_blir' : 'n2_f48_igjen');
    await K.keypad(t, { showLen: sup === 0 });
    card.set(pl.expr.replace(/([+−])/g, '<span class="ar">$1</span>') + ' = ' + t);
    T.items.filter(Boolean).forEach((o, i) => F.T.timeout(() => M_.bounce(o, 0.2), i * 40)); sfx('sparkle');
    await K.say('n2_f48_ok');
    return S.result();
  } });

async function f48three(K, B, pl, t, mkBun, plateMesh) {
  const S = K.S, sup = K.item.sup, M_ = M();
  const xs = [-2.2, 0, 2.2], plates = [];
  pl.plates.forEach((n, i) => {
    const pm = plateMesh(xs[i], 0.0, 0.95);
    const buns = []; for (let j = 0; j < n; j++) { const p = mkBun(); B.add(p, xs[i] - 0.5 + (j % 3) * 0.34, -0.35 + Math.floor(j / 3) * 0.34, 0.06); buns.push(p); }
    const L = K.label(pm, String(n), { cls: 'num small', dy: 0.9 });
    plates.push({ pm, buns, L, n, sel: false });
  });
  const key = () => plates.map((p, i) => p.sel ? i : -1).filter(i => i >= 0).join(',');
  const right = pl.pair.join(',');
  const done = K.arm({ answer: right });
  K.tag(v => 'PAIR');
  const syncSel = () => plates.forEach(p => { p.buns.forEach(b => M_.glowObj(b, p.sel)); p.L.cls('pulse', p.sel); });
  const w = K.widget({ kind: 'pair', values: ['0,1', '0,2', '1,2'],
    feed: v => { const ok = ['0,1', '0,2', '1,2'].includes(String(v)) ? String(v) : ['0,1', '0,2', '1,2'].find(x => x !== right); plates.forEach((p, i) => { p.sel = ok.split(',').map(Number).includes(i); }); syncSel(); return K.submit(ok, w); },
    mark: () => {}, solution: () => {} });
  plates.forEach(p => p.buns.concat([p.pm]).forEach(o => B.pick(o, () => {
    if (w.locked || S.solved || S.locked) return;
    p.sel = !p.sel; syncSel(); sfx('click');
    if (plates.filter(x => x.sel).length === 2) { const k = key(); F.T.timeout(() => { K.submit(k, w); plates.forEach(x => { x.sel = false; }); syncSel(); }, 250); }
  })));
  let step = 1;
  K.hint(async (tag, v) => {
    if (step === 1 && typeof v === 'string') { const [i, j] = v.split(',').map(Number); const s = plates[i].n + plates[j].n; if (s <= 40) await K.sayG('n2_det_ble', { n: s }); }
    if (step === 1) { await K.sayG('n2_f47_h_tiervenn'); return; }
    if (+v >= 0 && +v <= 40) await K.sayG('n2_det_ble', { n: +v });
    await K.sayG('n2_f43_ten', { s: 'Et fullt brett er ti boller' });
  });
  K.sol(async () => {
    if (step === 1) { pl.pair.forEach(i => { plates[i].buns.forEach(b => M_.glowObj(b, true)); plates[i].L.cls('sol'); }); await K.say('core_sol_chip'); return; }
    if (S.active && S.active.solution) S.active.solution(t); await K.say('core_sol_keys');
  });
  await sleep(400);
  K.prompt('n2_f48_par');
  await done;
  plates.forEach(p => { p.sel = false; p.L.cls('sol', false); }); syncSel();
  // the two plates go into one full tray
  const T = NUM().TenView(B, { model: BUN(), layout: 'frames', box: 'tray', max: 10, size: 0.36, x: 0, z: 1.05, container: true });
  let k = 0;
  for (const i of pl.pair) { for (const b of plates[i].buns) { const to = B.top.worldToLocal(T.slotWorld(k)); await M_.hopTo(b, to, 160, 0.4); B.top.remove(b); T.place(k++); } plates[i].L.show(false); }
  sfx('chime'); await K.say('n2_f48_fullt');
  step = 2;
  K.prompt('n2_f48_blir');
  await K.keypad(t, { showLen: sup === 0 });
  sfx('sparkle'); await K.say('n2_f48_ok');
  return S.result();
}

/* =====================================================================================================================
   12. F49 Faktafamiliehuset – three numbers on the roof, four windows; she builds all four equations with tiles
   ===================================================================================================================== */
const canon = (n1, op, n2, n3) => op === '+' ? `${Math.min(n1, n2)}+${Math.max(n1, n2)}=${n3}|${n1}` : `${n1}-${n2}=${n3}`;
function parseEq(v) { const m = /^(\d+)([+\-])(\d+)=(\d+)$/.exec(String(v).replace(/\s/g, '').replace('−', '-')); return m ? { n1: +m[1], op: m[2], n2: +m[3], n3: +m[4] } : null; }
fmt('F49', { name: 'Faktafamiliehuset', mode: 'build', g: 0.01, strands: { REGN: [6, 6] }, places: ['landsby', 'hus', 'any'], family: 'familie', portable: true,
  think: 'REGNE', tpl: ['n2_f49_lag', 'n2_f49_tak'],
  async run(item, S) {
    const K = Kit(item, S), pl = item.params.n2, sup = item.sup, M_ = M();
    const B = K.board({ style: 'grass', w: 6.8, d: 2.8, h: 1.8, yNdc: -0.06 });
    const house = K.piece('fx_n_hus', 2.0, { opts: { wall: 'cream', roof: 'roofRed' } }); B.add(house, 0, -0.35, 0);
    K.label(house, `${pl.a}   ${pl.b}   ${pl.c}`, { cls: 'num big', dy: 2.25 });
    const winPos = [[-2.4, -0.75], [-2.4, 0.55], [2.4, -0.75], [2.4, 0.55]];
    const wins = winPos.map(([x, z]) => K.label(K.anchor(x, 0.2, z), '?', { cls: 'num plaque', dy: 0.1 }));
    const made = [];      // canonical keys
    const madeEq = [];
    const all = pl.eqs.slice();
    const keyOf = s => { const e = parseEq(s); return e ? canon(e.n1, e.op, e.n2, e.n3) : null; };
    const fill = (eq) => { const i = madeEq.length; madeEq.push(eq); made.push(keyOf(eq)); const e = parseEq(eq); wins[i].set(`${e.n1} ${e.op === '+' ? '+' : '−'} ${e.n2} = ${e.n3}`).cls('done', false); sfx('chime'); };
    if (pl.example) fill(all[0]);
    const isTrue = e => e && (e.op === '+' ? e.n1 + e.n2 === e.n3 : e.n1 - e.n2 === e.n3) && [e.n1, e.n2, e.n3].sort((x, y) => x - y).join() === [pl.a, pl.b, pl.c].sort((x, y) => x - y).join();
    const nextMissing = () => all.find(q => !made.includes(keyOf(q)));
    // the tray: 4 slots (number, sign, number, = number) + ✓, and the tiles
    const tray = S.tray();
    const eqEl = document.createElement('div'); eqEl.className = 'n2-eq';
    const slots = [0, 1, 2, 3].map(i => { const d = document.createElement('div'); d.className = 'n2-slot' + (i === 1 ? ' op' : ''); d.addEventListener('click', e => { e.stopPropagation(); if (locked || S.solved) return; vals[i] = null; draw(); }); return d; });
    const eqs = document.createElement('span'); eqs.className = 'n2-eqs'; eqs.textContent = '=';
    eqEl.append(slots[0], slots[1], slots[2], eqs, slots[3]);
    const ok = document.createElement('button'); ok.className = 'kbtn n2-btn gold okbtn'; ok.textContent = '✓'; eqEl.appendChild(ok);
    const tilesEl = document.createElement('div'); tilesEl.className = 'n2-tiles';
    const nums = [pl.a, pl.b, pl.c].concat(pl.extra != null ? [pl.extra] : []).sort((x, y) => x - y);
    const tileBtns = {};
    nums.concat(['+', '−']).forEach(v => { const b = document.createElement('button'); b.className = 'n2-tile'; b.textContent = String(v); b.addEventListener('click', e => { e.stopPropagation(); put(v); }); tilesEl.appendChild(b); tileBtns[v] = b; });
    tray.append(eqEl, tilesEl); if (F.UI._trayUpd) F.UI._trayUpd();
    const vals = [null, null, null, null];
    let locked = false, ghost = null;
    const draw = () => slots.forEach((d, i) => { const v = vals[i]; d.textContent = v != null ? String(v) : ghost ? String(ghost[i]) : ''; d.classList.toggle('filled', v != null); d.classList.toggle('ghost', v == null && !!ghost); });
    const put = v => {
      if (locked || S.solved || S.locked) return;
      sfx('click');
      if (v === '+' || v === '−') vals[1] = v;
      else { const i = [0, 2, 3].find(k => vals[k] == null); if (i == null) return; vals[i] = v; }
      draw();
    };
    const value = () => `${vals[0]}${vals[1] === '−' ? '-' : '+'}${vals[2]}=${vals[3]}`;
    const clear = () => { vals.fill(null); draw(); };
    const submit = () => {
      if (locked || S.solved || S.locked) return;
      if (vals.some(v => v == null)) { eqEl.classList.remove('wrong'); void eqEl.offsetWidth; eqEl.classList.add('wrong'); sfx('boing'); return; }
      const v = value();
      if (made.includes(keyOf(v)) && isTrue(parseEq(v))) { K.say('n2_f49_harvi'); clear(); return; }   // a repeat is no error
      K.submit(v, w);
    };
    ok.addEventListener('click', e => { e.stopPropagation(); submit(); });
    const w = { kind: 'eq', values: all, dead: false, locked: false,
      feed: v => { const e = parseEq(v); if (!e) { vals[0] = pl.c; vals[1] = '+'; vals[2] = pl.a; vals[3] = pl.b; } else { vals[0] = e.n1; vals[1] = e.op === '-' ? '−' : '+'; vals[2] = e.n2; vals[3] = e.n3; } draw(); return K.submit(value(), w); },
      mark: (v, cls) => { if (cls === 'wrong') { eqEl.classList.remove('wrong'); void eqEl.offsetWidth; eqEl.classList.add('wrong'); } },
      solution: v => { const e = parseEq(v); if (e) { ghost = [e.n1, e.op === '-' ? '−' : '+', e.n2, e.n3]; clear(); [e.n1, e.n2, e.n3].forEach(n => tileBtns[n] && tileBtns[n].classList.add('glow')); (tileBtns[e.op === '-' ? '−' : '+'] || {}).classList && tileBtns[e.op === '-' ? '−' : '+'].classList.add('glow'); } },
      lock: on => { locked = !!on; eqEl.classList.toggle('locked', locked); tilesEl.classList.toggle('locked', locked); },
      destroy: () => { w.dead = true; eqEl.remove(); tilesEl.remove(); } };
    w.helpStep = async () => { const e = parseEq(nextMissing()); if (!e) return false; ghost = [e.n1, e.op === '-' ? '−' : '+', e.n2, e.n3]; clear(); await K.say('n2_f49_h_storst'); return true; };
    S.use(w);
    K.tag(v => { const e = parseEq(v); if (!e) return 'OTHER'; if (e.op === '-' && e.n1 < e.n2) return 'SMALLER-FROM-LARGER'; if (e.op === '+' && e.n3 !== pl.c) return 'OPERATIONAL'; if (e.op === '-' && e.n1 !== pl.c) return 'OPERATIONAL'; return 'OTHER'; });
    let bar = null;
    K.hint(async (tag, v) => {
      // look-back: her equation on the door – the house does not light up
      const e = parseEq(v);
      const door = K.label(house, e ? `${e.n1} ${e.op === '-' ? '−' : '+'} ${e.n2} = ${e.n3}` : '?', { cls: 'num small wrong', dy: 0.6 });
      M_.shake(house); await K.sleepG(1400); door.remove();
      if (sup <= 1 && !bar) bar = K.card(`<span style="display:inline-block;border:3px solid #c9962b;border-radius:10px;padding:0 70px;background:#fff3b0">${pl.c}</span><br><span style="display:inline-block;border:3px solid #b9a7d8;border-radius:10px;padding:0 ${18 + pl.a * 3}px;background:#f3ecff">${pl.a}</span><span style="display:inline-block;border:3px solid #b9a7d8;border-radius:10px;padding:0 ${18 + pl.b * 3}px;background:#f3ecff">${pl.b}</span>`, { cls: 'small side' });
      await K.sayG('n2_f49_h_storst');
      await K.sayG(e && e.op === '-' ? 'n2_f49_h_minus' : 'n2_f49_h_pluss');
    });
    K.sol(async () => { w.solution(S.expected); await K.say('core_sol_tiles'); });
    await sleep(300);
    promptSeq(K, [['n2_f49_tak'], ['n2_f49_lag']]);
    while (made.length < 4 && !S.ended) {
      const exp = nextMissing();
      ghost = null; Object.values(tileBtns).forEach(b => b.classList.remove('glow'));
      const p = K.arm({ answer: exp, check: v => { const e = parseEq(v); return isTrue(e) && !made.includes(keyOf(v)); } });
      S.active = w;
      const got = await p;
      fill(String(got).replace('−', '-'));
      ghost = null; clear(); Object.values(tileBtns).forEach(b => b.classList.remove('glow'));
    }
    wins.forEach((L, i) => F.T.timeout(() => L.cls('pulse'), i * 150));
    sfx('sparkle'); M_.bounce(house, 0.2);
    await K.say('n2_f49_ok');
    return S.result();
  } });

/* =====================================================================================================================
   13. registration (load + boot), test hook
   ===================================================================================================================== */
function register() {
  if (!F.Task || !F.Task.def) return;
  for (const id in SPECS) {
    const s = SPECS[id];
    const wrapped = s._wrapped || (s._wrapped = Object.assign({}, s, {
      run(item, S) {
        N2.prep(id, item);
        if (S) { S.expected = item.target; if (item.secret && item.secret.length) S.secret = item.secret.slice(); }
        if (S && !S.pre) S.pre = (kind, k) => N2.pre(id, item, S, k);    // v5 WP-R2: WP-K2's pre-attempt hook (structure, never the answer)
        return s.run.call(s, item, S);
      },
      // v5 WP-R2: a numeric spec.g (production formats, wave-1 REQUEST WP-E) stays numeric for the engine; the stage still reads item.g first
      g: typeof s.g === 'number' ? s.g : (item => (item && item.g != null ? item.g : 0.01)),
    }));
    if (F.Task.defs && F.Task.defs[id] === wrapped) continue;
    try { F.Task.def(id, wrapped); } catch (e) { console.error('[f_num2] def ' + id, e); }
  }
  regFallback();
}
register();
if (F.on) F.on('boot', register);
N2.specs = SPECS;
F.dbg = F.dbg || {};
F.dbg.num2 = {
  // F.dbg.num2.run('F42', {strand, rung, sup, params}) – a local item through the real stage (tests)
  run(id, o) {
    o = o || {};
    const spec = SPECS[id]; const strand = o.strand || Object.keys(spec.strands)[0];
    const item = N2.prep(id, { id: 'n2_' + id + '_' + Date.now(), strand, rung: o.rung || (SERVES[id][strand] || [1])[0], sup: o.sup != null ? o.sup : 1, kind: 'normal', format: id, params: Object.assign({}, o.params || {}) });
    item.format = id;
    N2.lastResult = null;
    N2.lastRun = F.Task.run(item, o.ctx || { place: { x: F.Player.pos.x, z: F.Player.pos.z - 3, id: 'here' } }).then(r => (N2.lastResult = r));
    F.debug.frames(3);
    return JSON.parse(JSON.stringify(item));
  },
  result: () => N2.lastResult,
  // screen point of a hundred-board tile / a bridge value (tests click there for real)
  screenOf(what, v) {
    const K = N2.cur && N2.cur.kit; if (!K || !K.B) return null;
    const p = what === 'tile' && K.grid ? K.grid.local(v) : what === 'line' && K.bridge ? K.bridge.local(v).add(K.bridge.g.position) : null; if (!p) return null;
    K.B.place(); const w = K.B.top.localToWorld(p.clone()); w.project(F.R.camera);
    const r = F.R.renderer.domElement.getBoundingClientRect();
    return { x: Math.round(r.left + (w.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - w.y) / 2 * r.height) };
  },
};
})();
