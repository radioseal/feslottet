/* Feslottet – v4 widget kit (DESIGN4 §3.7, SYNTHESIS §3.1). Owner: WP-K.
   Installed into every task's stage S by the one-line hook in stage.js: (F.Task.kits || []).forEach(k => k(S, item)).
   Every widget runs the full «Tenk først» protocol of S.submit (think-gate, rapid-guess R, look-back, targeted hint, re-deal, solution
   → C) exactly like S.chips, and returns a Promise that resolves with the right value once solved (also after she executed the shown
   solution). Each takes {answer} or {check(v)}; {hint(tag, v)} / {solution()} / {lookBack(v)} override the defaults.
   Each sets item.mode / item.g if the generator did not (item.g wins). Feature-detect: if (S.tapAll) … else fallback.
   v5 (WP-K2): composing (select / place / sort / build / load / turn) works as soon as the prompt has ended – only the submit waits for
   the think-gate; a tap while the prompt plays is a soft early tap (S.submitEarly: a cue, no lock, no try).
   natural audit D6: composing during the prompt is allowed too, and a single-choice tap / a submit made during the prompt is kept
   (S.submit → S.submitEarly(v)) and judged when the gate opens – never dropped with only a shake.

   S.tapAll(items, {answer:[v…] | check(vs), objs?, done:'Ferdig'})      select-all + «Ferdig»; extra/missing taps = wrong
        items: [{v, label?, icon?, model?, opts?}]  (icon = emoji/short html; model = VOX id → thumbnail). Resolves with [v…] (sorted).
        objs: [Object3D | Thing] same length as items → tap the real 3D objects on the stage instead of cards.     g = 1/(2^n − 1)
   S.order(items, {answer:[v…] | answers:[[v…]…] | check(vs), extra:[items], slots?})   ordering shelf; the extra card must stay out
        tap a card → next empty slot; tap a placed card → back. ✓ when the shelf is full. Resolves with [v…].     g = 1/(n+e)!/(e)!
   S.sortAll(items, bins, {answer:{v: binId} | check(map), partial?})   tap an item, then a basket. bins [{id, label?, icon?, model?}]
        Resolves with {v: binId}.                                                                                   g = 1/b^n
   S.stones({from, to, step=1, labels:'all'|'ends'|'tens'|[v…]|'none', blank:[v…], multi, answer, perRow=10, frog=true, three?, dom?})
        stepping stones. ≤ 12 stones (or three:true): real 3D stones on the stage (F18 art, numbers painted on top, the frog);
        longer rows: a DOM board in rows of perRow (legible to 100). single: tap one stone (answer v). multi: tap all + Ferdig
        (answer [v…]). Look-back: the frog hops to HER stone(s) and back (never to the right one).  g = 1/n | 1/(2^n − 1)
   S.line({min, max, marks:[v…], tol=1, answer, unit?})   unmarked rail scored by distance; tap a spot. Resolves with the value;
        S.lineDist / w.dist = |v − answer|. Look-back: her spot gets her number.                                     g = (2·tol+1)/(max−min+1)
   S.lineShow({min, max, marks, arrow}) → {el, rail, remove()}   the same rail as a picture only (F44 «Hvilket tall viser pila?» +
        S.keypad).
   S.grid({w, h, mode:'cycle'|'paint', symbols:[{icon|label|color}…], given:{'r,c': k} | [[k|null…]…], boxes:[bw, bh], answer|check})
        cycle: tap a cell → next symbol (blank → s0 → s1 … → blank). paint: tap a palette symbol, then cells. Resolves with the
        grid [[k|null…]…] (row-major, h rows × w).                                                                     g ≈ 0
   S.vox({base:[w, d], maxH=4, answer:heights[] | check(heights), given:heights[], rotate, cell, dom?})  cube builder. 3D on the
        stage (a plate of cells, cubes with dark edges): tap a cell/column to add a cube (at maxH the next tap empties it), «−» mode
        removes, ⟲ ⟳ turn it (rotate:true). Look-back: the layers lift apart. DOM fallback (no 3D anchor / dom:true): a plan grid +
        isometric drawing. heights row-major (d rows × w). Resolves with heights[].                                    g ≈ 0
   S.voxShow(heights, {base:[w, d], pos, cell, colorBy:'level'|'column'}) → tower {set(h, {ghost}), explode(on), rotate(±1),
        pick(x, y), remove()}  display-only 3D tower (F60 counting; explode = «the builder lifts the layers apart»).
   S.balance({left:[it…], right:[it…], palette:[it…], pan:'right'|'left'|'both', check(state) | target:0, solution, scale, dom?})
        it = {v, label|icon|model, w}. A 3D two-pan balance on the stage (DOM fallback): tap a palette card (tray) → a block drops
        onto the pan; tap a loose block → back. «Sjekk» tips the beam (that IS the look-back: kit_bal_lik / kit_bal_tung), then
        judges. state = {left:[v…], right:[v…], lw, rw}. Default check: rw − lw === target (0 = balanced).          g ≈ 0
        v5 WP-K3 (WP-P a–d): the beam starts TIPPED to the heavy side and a red lock peg holds it while she loads (no live feedback);
        «Sjekk» pulls the peg, the beam swings; a change re-inserts the peg. o.max counts only HER blocks (never the fixed ones).
        w.wrongValue() is always a wrong load. The solution takes her loose blocks back and shows ghost blocks for every block to add
        plus «×n» on each palette card (she lays them on herself). w.pegged() / w.angle() for tests.
   S.ribbons({bars:[{name, value, known, build?, color?}], ask: barIndex | 'total' | 'diff', answer?, allowDiff, allowTotal, units})
        bar model (2T, F56 basic): [step 0 when a bar has build:true – she builds it with +10 / +1 / −1 + Ferdig], step 1 tag the «?»
        (tap the bar / ↔ difference / { } total the question asks about), step 2 the fixed-slot keypad. Bars are split into units
        (tens above 20). A needs every step first-try. Resolves with the number.                                    g ≈ 0.01
        v5 WP-K3 (WP-P e): {layout:'pw', whole:{name, value, known}} part-whole: the whole bar on top («?» when unknown → ask 'total'),
        the bars = parts side by side under it; braces:[{id, span:[i0, i1], label?}] = extra braces under the parts (distractors unless
        ask = their id; a brace over ALL parts counts as the whole). Tag choices: the parts, the whole, the braces (↔ only with
        allowDiff: true). The build step is for the default ('cmp') layout.
   S.twoStep(a, b)  a, b: (S, prev) => Promise (widget calls). Runs a, clears the tray, runs b; A needs both first-try. g = gA·gB.
        v5 WP-K3 (WP-P f): an explicit item.g / item.mode (set before the call) is kept at the end – each step still gates by its own g.
        v5: step a's hint plaques are cleared too; ribbons' keypad step has its own structural hint (kit_h_ribbon), never a count.
   S.wheels(n, {answer, check, min?})   n digit wheels ▲/▼ + ✓. Resolves with the number.                         g = 10^−n
   Helpers: S.kitBoard(cls) → a DOM board above the tray (removed at cleanup); S.kitButton(label, fn, cls) → a big tray button.
   Lines (lines_stage.js): kit_ferdig, kit_sjekk, kit_h_* (hints), kit_sol_* (solution), kit_lb_* (look-back), kit_bal_*.
   Tests: tests/kit_widgets.js. Styles: css/kit.css (kit.js links it itself if the page does not). */
(function () {
'use strict';
const F = window.F = window.F || {};
F.Task = F.Task || {};
const kits = F.Task.kits = F.Task.kits || [];

/* ---------------------------------------------------------- shared helpers */
const sameV = (a, b) => (typeof a === 'number' || typeof b === 'number') ? Number(a) === Number(b) : String(a).toLowerCase() === String(b).toLowerCase();
const keyOf = v => typeof v === 'number' ? 'n' + v : 's' + String(v).toLowerCase();
const setEq = (a, b) => { if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false; const s = new Set(b.map(keyOf)); return a.every(x => s.has(keyOf(x))); };
const seqEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameV(x, b[i]));
const sortVals = vs => vs.slice().sort((x, y) => (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y)));
const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const perm = (n, k) => { let f = 1; for (let i = 0; i < k; i++) f *= (n - i); return f; };
function cssOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('kitCssLink') || [...document.querySelectorAll('link[rel=stylesheet]')].some(l => /css\/kit\.css$/.test(l.getAttribute('href') || ''))) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/kit.css'; l.id = 'kitCssLink'; document.head.appendChild(l);
}
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const caseT = t => (F.UI && F.UI.caseText) ? F.UI.caseText(String(t)) : String(t);
// the face of an item: thumbnail of a VOX model, an icon (emoji / small html), or its label (number or word)
function face(it, o) {
  o = o || {};
  const f = el('span', 'kface');
  if (it == null) return f;
  if (typeof it !== 'object') { f.textContent = typeof it === 'number' ? String(it) : caseT(it); f.classList.add(typeof it === 'number' ? 'knum' : 'kword'); return f; }
  if (it.model && F.Thumb && F.VOX && F.VOX.has && F.VOX.has(it.model)) {
    try { const img = F.Thumb.img(it.model, it.opts || {}, { size: o.size || 140 }); if (img) { f.appendChild(img); f.classList.add('kthumb'); if (it.label != null && o.withLabel) f.appendChild(el('span', 'klab', caseT(it.label))); return f; } } catch (e) { /* fall through */ }
  }
  if (it.icon != null) { f.innerHTML = String(it.icon); f.classList.add('kicon'); if (it.color) f.style.color = it.color; if (it.label != null && o.withLabel) f.appendChild(el('span', 'klab', caseT(it.label))); return f; }
  if (it.color && it.label == null) { f.classList.add('kswatch'); f.style.background = it.color; return f; }
  const lab = it.label != null ? it.label : it.v;
  f.textContent = typeof lab === 'number' ? String(lab) : caseT(lab);
  f.classList.add(typeof lab === 'number' ? 'knum' : 'kword');
  return f;
}
const say = (S, id, slots) => (F.TPL && F.TPL.has(id)) ? S.say(id, slots || {}, '') : Promise.resolve();
// v5 WP-K2 (playtest BUG 1+2 «multi-tap answers are ONE answer»): composing an answer – selecting cards, placing on the shelf, sorting,
// building cubes, loading the balance, turning wheels – is allowed as soon as the prompt has ended; the think-gate judges the SUBMIT
// (Ferdig / Sjekk / ✓, through S.submit). A tap while the prompt still plays is a soft early tap (no lock, no try).
// natural audit D6 (#39/#56): composing while the question plays is no longer refused – a card / basket / cell placed during the prompt
// stays placed (it is only composing); the submit (✓ / Ferdig / Sjekk) is a kept early choice judged when the gate opens
const composeEarly = S => { if (S.speaking) S.earlyTaps = (S.earlyTaps || 0) + 1; return false; };
// v5r2 (verify «early_tap»): tap-all selections are never lost – a card / object tapped while the prompt plays is selected too (it is only
// a selection; «Ferdig» is still judged after the think-gate). It counts as an early tap, without the «not yet» shake.
const selectEarly = S => { if (S.speaking) S.earlyTaps = (S.earlyTaps || 0) + 1; };
const sleep = ms => (F.T && F.T.sleep) ? F.T.sleep(ms) : new Promise(r => setTimeout(r, ms));
// default guess probability / answer mode (the generator's item.g / item.mode win)
function defaults(S, g, mode) {
  const it = S.item;
  if (it.g == null || it._gAuto) { it.g = Math.max(0, Math.min(1, +g)); it._gAuto = true; }
  if (it.mode == null || it._modeAuto) { it.mode = mode; it._modeAuto = true; }
}
// a widget handle that joins the stage protocol (S.use / S.submit)
function widget(S, kind, o) {
  const w = {
    kind, el: null, dead: false, locked: false, values: null, parts: [], kit: true,
    lock(on) { w.locked = !!on; w.parts.forEach(p => p && p.classList && p.classList.toggle('klocked', w.locked)); },
    destroy() { if (w.dead) return; w.dead = true; try { w.onDestroy && w.onDestroy(); } catch (e) {} w.parts.forEach(p => { try { p.remove(); } catch (e) {} }); },
    mark(v, cls) { w.parts.forEach(p => { if (!p.classList) return; p.classList.remove('kright', 'kwrong'); void p.offsetWidth; p.classList.add(cls === 'right' ? 'kright' : 'kwrong'); }); if (cls === 'wrong') F.T.timeout(() => w.parts.forEach(p => p.classList && p.classList.remove('kwrong')), 700); },
  };
  if (o && o.hint) w.hint = o.hint;
  return w;
}
function arm(S, w, o) {
  const p = S.arm(o); S.use(w);
  if (o.lookBack && S.lookBack) S.lookBack(o.lookBack);
  return p;
}
// a DOM board above the tray (or inside it with {inTray:true}) – removed with the task
function board(S, cls, o) {
  cssOnce();
  o = o || {};
  const b = el('div', 'kboard ' + (cls || ''));
  if (o.inTray) S.tray().appendChild(b);
  else if (!S.ended) { document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on')); }   // (D6: never after the task ended)
  (S.kitEls = S.kitEls || []).push(b);
  return b;
}
function button(S, label, fn, cls) {
  cssOnce();
  // the first «Ferdig» / «Sjekk» of a session is explained once (she may not read the button yet)
  if (/kdone/.test(cls || '')) { const id = label === SJEKK() ? 'kit_sjekk' : 'kit_ferdig'; const said = F.Task._kitSaid = F.Task._kitSaid || {}; if (!said[id]) { said[id] = true; say(S, id); } }
  const b = el('button', 'kbtn ' + (cls || ''), label);
  b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled || S.locked) return; F.sfx.click(); fn(); });
  S.tray().appendChild(b);
  if (F.UI && F.UI._trayUpd) F.UI._trayUpd();
  return b;
}
const FERDIG = () => caseT('ferdig');
const SJEKK = () => caseT('sjekk');

/* ---------------------------------------------------------- S.tapAll */
function tapAll(S, items, o) {
  o = o || {};
  cssOnce();
  const n = items.length;
  const answer = o.answer != null ? o.answer : null;
  const check = o.check || (vs => setEq(vs, answer || []));
  defaults(S, 1 / (Math.pow(2, n) - 1), 'subset');
  const w = widget(S, 'tapall-kit', o);
  w.values = items.map(it => it.v);
  const sel = new Set();
  let sol = null;
  const done = button(S, o.done || FERDIG(), () => submit(), 'kdone');
  w.parts.push(done);
  const refresh = () => {
    cards.forEach((c, i) => { c.classList.toggle('ksel', sel.has(i)); c.classList.toggle('kglow', !!sol && sol.has(i) !== sel.has(i)); });
    done.classList.toggle('kready', sel.size > 0);
    if (sol) done.classList.toggle('kglow', [...cards.keys()].every(i => sol.has(i) === sel.has(i)));
    (o.onChange || (() => {}))(value());
  };
  const value = () => sortVals([...sel].map(i => items[i].v));
  const toggle = i => { if (w.locked || w.dead) return; if (sel.has(i)) sel.delete(i); else sel.add(i); F.sfx.pling && F.sfx.pling(sel.size % 8); refresh(); };
  let cards = [];
  if (o.objs && o.objs.length === n && S.has3D && F.R) {
    // 3D mode: tap the real objects; a ring marks the selection (no right/wrong per object before Ferdig – C4)
    cards = o.objs.map(() => el('span', 'kghost'));
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), cv = F.R.renderer.domElement;
    const objOf = x => (x && x.obj) ? x.obj : x;
    const rings = o.objs.map(x => { const ob = objOf(x); if (!ob) return null; const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd34d })); r.rotation.x = Math.PI / 2; r.position.set(0, 0.08, 0); r.visible = false; ob.add(r); return r; });
    let down = null;
    const pd = e => { down = { x: e.clientX, y: e.clientY }; };
    const pu = e => {
      if (w.dead || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) { down = null; return; }
      down = null;
      const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, F.R.camera);
      let best = -1, bd = Infinity;
      o.objs.forEach((x, i) => { const ob = objOf(x); if (!ob) return; const bx = new THREE.Box3().setFromObject(ob); const hit = ray.ray.intersectBox(bx, new THREE.Vector3()); if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = i; } } });
      if (best >= 0) { e.stopPropagation(); selectEarly(S); toggle(best); }
    };
    cv.addEventListener('pointerdown', pd, true); cv.addEventListener('pointerup', pu, true);
    const tick = F.on('tick', () => rings.forEach((r, i) => { if (r) { r.visible = sel.has(i) || (!!sol && sol.has(i)); r.material.color.setHex(sol && sol.has(i) && !sel.has(i) ? 0xffffff : 0xffd34d); } }));
    w.onDestroy = () => { cv.removeEventListener('pointerdown', pd, true); cv.removeEventListener('pointerup', pu, true); tick(); rings.forEach(r => r && r.parent && r.parent.remove(r)); };
  } else {
    const B = board(S, 'ktapall' + (n > 8 ? ' kmany' : ''), { inTray: !!o.inTray });
    w.parts.push(B); w.el = B;
    cards = items.map((it, i) => {
      const c = el('button', 'kcard'); c.appendChild(face(it, { withLabel: o.withLabel })); c.style.setProperty('--i', i);
      c.addEventListener('click', e => { e.stopPropagation(); selectEarly(S); F.sfx.click(); toggle(i); });
      B.appendChild(c); return c;
    });
  }
  function submit() { if (w.locked || w.dead) return; if (!sel.size && !o.allowEmpty) { done.classList.remove('kshake'); void done.offsetWidth; done.classList.add('kshake'); return; } S.submit(value(), w); }
  w.feed = v => { sel.clear(); (Array.isArray(v) ? v : [v]).forEach(x => { const i = items.findIndex(it => sameV(it.v, x)); if (i >= 0) sel.add(i); }); refresh(); return S.submit(value(), w); };
  w.rightValue = () => answer ? sortVals(answer) : null;
  w.wrongValue = () => { const a = answer || []; if (a.length > 1) return sortVals(a.slice(1)); const extra = items.find(it => !a.some(x => sameV(x, it.v))); return sortVals(a.concat(extra ? [extra.v] : [])); };
  w.solution = () => { if (!answer) return; sol = new Set(items.map((it, i) => answer.some(x => sameV(x, it.v)) ? i : -1).filter(i => i >= 0)); refresh(); };
  w.solTpl = 'kit_sol_tapall';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_alle'); });
  // «Hjelp meg» worked step: one right item is selected for her (a wrong selection is taken back first)
  w.helpStep = async () => {
    if (!answer) return false;
    const isA = i => answer.some(x => sameV(x, items[i].v));
    const wrong = [...sel].find(i => !isA(i));
    if (wrong != null) sel.delete(wrong); else { const i = items.findIndex((it, k) => isA(k) && !sel.has(k)); if (i < 0) return false; sel.add(i); }
    refresh(); return true;
  };
  w.value = value;
  refresh();
  return arm(S, w, Object.assign({}, o, { check }));
}

/* ---------------------------------------------------------- S.order */
function order(S, items, o) {
  o = o || {};
  cssOnce();
  const extra = o.extra || [];
  const answer = o.answer || items.map(it => it.v);
  const nSlots = o.slots || answer.length;
  const check = o.check || (vs => o.answers ? o.answers.some(a => seqEq(vs, a)) : seqEq(vs, answer));
  const pool = (o.noShuffle ? items.concat(extra) : shuffle(items.concat(extra)));
  defaults(S, 1 / perm(pool.length, nSlots), 'order');
  const w = widget(S, 'order-kit', o);
  w.values = pool.map(it => it.v);
  const B = board(S, 'korder', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const shelf = el('div', 'kshelf'), bank = el('div', 'kbank');
  B.appendChild(shelf); B.appendChild(bank);
  const slots = [];
  for (let i = 0; i < nSlots; i++) { const s = el('div', 'kslot'); s.appendChild(el('span', 'kslotn', String(i + 1))); s.addEventListener('click', e => { e.stopPropagation(); if (w.locked) return; if (slots[i].card != null) { F.sfx.click(); unplace(i); } }); shelf.appendChild(s); slots.push({ el: s, card: null }); }
  const cards = pool.map((it, j) => {
    const c = el('button', 'kcard'); c.appendChild(face(it, { withLabel: o.withLabel })); c.style.setProperty('--i', j);
    c.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead) return; F.sfx.click(); const at = slots.findIndex(s => s.card === j); if (at >= 0) unplace(at); else place(j); });
    bank.appendChild(c); return { el: c, it, j, at: -1 };
  });
  let sol = null;
  const ok = button(S, '✓', () => submit(), 'kok'); w.parts.push(ok);
  function place(j) {
    const i = slots.findIndex(s => s.card == null); if (i < 0) { shelf.classList.remove('kshake'); void shelf.offsetWidth; shelf.classList.add('kshake'); return; }
    slots[i].card = j; slots[i].el.appendChild(cards[j].el); cards[j].at = i; F.sfx.pling && F.sfx.pling(i); refresh();
  }
  function unplace(i) { const j = slots[i].card; if (j == null) return; slots[i].card = null; bank.appendChild(cards[j].el); cards[j].at = -1; refresh(); }
  const value = () => slots.map(s => s.card == null ? null : pool[s.card].v);
  function refresh() {
    const full = slots.every(s => s.card != null);
    ok.classList.toggle('koff', !full); ok.classList.toggle('kready', full);
    if (sol) {
      cards.forEach(c => c.el.classList.remove('kglow'));
      const wrongAt = slots.findIndex((s, i) => s.card != null && !sameV(pool[s.card].v, sol[i]));
      if (wrongAt >= 0) { cards[slots[wrongAt].card].el.classList.add('kglow'); return; }
      const next = slots.findIndex(s => s.card == null);
      if (next >= 0) { const j = pool.findIndex((it, jj) => sameV(it.v, sol[next]) && cards[jj].at < 0); if (j >= 0) cards[j].el.classList.add('kglow'); }
      else ok.classList.add('kglow');
    }
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; if (slots.some(s => s.card == null)) { shelf.classList.remove('kshake'); void shelf.offsetWidth; shelf.classList.add('kshake'); return; } S.submit(value(), w); }
  w.feed = v => { slots.forEach((s, i) => unplace(i)); (v || []).forEach(x => { const j = pool.findIndex((it, jj) => sameV(it.v, x) && cards[jj].at < 0); if (j >= 0) place(j); }); return S.submit(value(), w); };
  w.rightValue = () => (o.answers ? o.answers[0] : answer).slice();
  w.wrongValue = () => { const a = w.rightValue(); if (a.length > 1) { const b = a.slice(); [b[0], b[1]] = [b[1], b[0]]; return b; } const x = pool.find(it => !sameV(it.v, a[0])); return x ? [x.v] : a; };
  w.solution = () => { sol = w.rightValue(); slots.forEach((s, i) => { if (s.card != null && !sameV(pool[s.card].v, sol[i])) unplace(i); }); refresh(); };
  // look-back: her order is «played» card by card (each hops), then the hint
  w.lookBack = async () => { say(S, 'kit_lb_rad'); for (const sl of slots) { const c = sl.card != null ? cards[sl.card].el : null; if (!c) continue; c.classList.remove('khop'); void c.offsetWidth; c.classList.add('khop'); F.sfx.pling && F.sfx.pling(slots.indexOf(sl)); await sleep(420); } await sleep(300); };
  w.helpStep = async () => {
    const a = w.rightValue();
    const bad = slots.findIndex((sl, i) => sl.card != null && !sameV(pool[sl.card].v, a[i])); if (bad >= 0) { unplace(bad); return true; }
    const nx = slots.findIndex(sl => sl.card == null); if (nx < 0) return false;
    const j = pool.findIndex((it, jj) => sameV(it.v, a[nx]) && cards[jj].at < 0); if (j < 0) return false;
    place(j); return true;
  };
  w.solTpl = 'kit_sol_order';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_order'); });
  w.value = value;
  refresh();
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack) S.lookBack(w.lookBack);
  return p;
}
function shuffle(a) { const r = (F.U && F.U.shuffle) ? F.U.shuffle(Math.random, a.slice()) : a.slice().sort(() => Math.random() - 0.5); return r; }

/* ---------------------------------------------------------- S.sortAll */
function sortAll(S, items, bins, o) {
  o = o || {};
  cssOnce();
  const answer = o.answer || {};
  const check = o.check || (m => items.every(it => m[keyOf(it.v)] != null && String(m[keyOf(it.v)]) === String(answer[it.v] != null ? answer[it.v] : answer[keyOf(it.v)])));
  defaults(S, 1 / Math.pow(Math.max(2, bins.length), items.length), 'sort');
  const w = widget(S, 'sort-kit', o);
  w.values = items.map(it => it.v);
  const B = board(S, 'ksort', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const pool = el('div', 'kpool'), binRow = el('div', 'kbins');
  B.appendChild(pool); B.appendChild(binRow);
  let picked = -1, sol = null;
  const where = items.map(() => null);
  const cards = items.map((it, i) => {
    const c = el('button', 'kcard ksmall'); c.appendChild(face(it, { size: 110, withLabel: o.withLabel })); c.style.setProperty('--i', i);
    c.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead) return; F.sfx.click(); picked = picked === i ? -1 : i; refresh(); });
    pool.appendChild(c); return c;
  });
  const binEls = bins.map((b, k) => {
    const be = el('div', 'kbin'); const head = el('div', 'kbinhead'); head.appendChild(face(b, { size: 90 })); be.appendChild(head);
    const inner = el('div', 'kbinin'); be.appendChild(inner);
    be.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead || picked < 0) return; F.sfx.pling && F.sfx.pling(k); where[picked] = b.id; inner.appendChild(cards[picked]); picked = -1; refresh(); });
    binRow.appendChild(be); return { be, inner };
  });
  const done = button(S, o.done || FERDIG(), () => submit(), 'kdone'); w.parts.push(done);
  const value = () => { const m = {}; items.forEach((it, i) => { if (where[i] != null) { m[keyOf(it.v)] = where[i]; m[it.v] = where[i]; } }); return m; };
  function refresh() {
    cards.forEach((c, i) => { c.classList.toggle('ksel', picked === i); c.classList.toggle('kglow', !!sol && String(where[i]) !== String(sol[i])); });
    binEls.forEach((b, k) => b.be.classList.toggle('ktarget', picked >= 0));
    if (sol && picked >= 0) binEls.forEach((b, k) => b.be.classList.toggle('kglow', String(bins[k].id) === String(sol[picked])));
    else binEls.forEach(b => b.be.classList.remove('kglow'));
    const full = where.every(x => x != null);
    done.classList.toggle('koff', !full && !o.partial); done.classList.toggle('kready', full);
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; if (!o.partial && where.some(x => x == null)) { pool.classList.remove('kshake'); void pool.offsetWidth; pool.classList.add('kshake'); return; } S.submit(value(), w); }
  const ansOf = it => answer[it.v] != null ? answer[it.v] : answer[keyOf(it.v)];
  w.feed = m => { items.forEach((it, i) => { const b = m && (m[it.v] != null ? m[it.v] : m[keyOf(it.v)]); const k = bins.findIndex(x => String(x.id) === String(b)); if (k >= 0) { where[i] = bins[k].id; binEls[k].inner.appendChild(cards[i]); } }); refresh(); return S.submit(value(), w); };
  w.rightValue = () => { const m = {}; items.forEach(it => { m[it.v] = ansOf(it); }); return m; };
  w.wrongValue = () => { const m = w.rightValue(); const it = items[0]; const other = bins.find(b => String(b.id) !== String(ansOf(it))); if (other) m[it.v] = other.id; return m; };
  w.solution = () => { sol = items.map(it => ansOf(it)); items.forEach((it, i) => { if (where[i] != null && String(where[i]) !== String(sol[i])) { where[i] = null; pool.appendChild(cards[i]); } }); refresh(); };
  w.helpStep = async () => {
    const i = items.findIndex((it, k) => String(where[k]) !== String(ansOf(it))); if (i < 0) return false;
    const k = bins.findIndex(b => String(b.id) === String(ansOf(items[i]))); if (k < 0) return false;
    where[i] = bins[k].id; binEls[k].inner.appendChild(cards[i]); picked = -1; refresh(); return true;
  };
  w.lookBack = async () => { say(S, 'kit_lb_kurv'); for (const b of binEls) { b.be.classList.add('ktarget'); await sleep(600); b.be.classList.remove('ktarget'); } };
  w.solTpl = 'kit_sol_sort';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_sort'); });
  w.value = value;
  refresh();
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack) S.lookBack(w.lookBack);
  return p;
}

/* ---------------------------------------------------------- S.stones */
// numbers painted on the stone tops (world labels are capped at 30 on screen – a 100-stone row needs decals)
const texCache = new Map();
function numDecal(text, gold, size, sprite) {
  const key = text + (gold ? '*' : '');
  let tex = texCache.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 100; const x = c.getContext('2d');
    x.font = 'bold 74px Andika, "Andika New Basic", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 10; x.strokeStyle = gold ? '#8a5a10' : '#3b2f5c'; x.strokeText(text, 80, 54);
    x.fillStyle = gold ? '#ffe68a' : '#ffffff'; x.fillText(text, 80, 54);
    tex = new THREE.CanvasTexture(c); texCache.set(key, tex);
  }
  if (sprite) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(0.5 * (size || 1), 0.31 * (size || 1), 1); sp.renderOrder = 3; return sp; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46 * (size || 1), 0.29 * (size || 1)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 3;
  return m;
}
function stones3d(S, o, vals, blank, multi, answer, labelOf, check) {
  const w = widget(S, 'stones-kit', o);
  w.values = vals;
  const n = vals.length, perRow = o.perRow || (n > 12 ? 10 : n), rows = Math.ceil(n / perRow);
  const gap = n > 40 ? 0.6 : n > 12 ? 0.75 : n > 8 ? 0.95 : 1.1, sz = gap * 0.82;
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(perRow * gap + 0.8, rows * gap * 0.95 + 0.8), new THREE.MeshLambertMaterial({ color: 0x8fd3f0, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.03; g.add(water);
  const ringGeo = new THREE.TorusGeometry(sz * 0.55, 0.035, 8, 28);
  const selMat = new THREE.MeshBasicMaterial({ color: 0xb48cff }), solMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const st = vals.map((v, i) => {
    const r = Math.floor(i / perRow), k = i % perRow, col = (o.snake && r % 2) ? perRow - 1 - k : k;
    const holder = new THREE.Group(); holder.position.set((col - (perRow - 1) / 2) * gap, 0, (r - (rows - 1) / 2) * gap * 0.95);
    let m;
    if (F.VOX && F.VOX.has('fx_n_stein')) { m = F.VOX.make('fx_n_stein', {}); const b = new THREE.Box3().setFromObject(m), s3 = b.getSize(new THREE.Vector3()); m.scale.multiplyScalar(sz / Math.max(s3.x, s3.z, 0.05)); }
    else m = new THREE.Mesh(new THREE.CylinderGeometry(sz * 0.5, sz * 0.55, 0.16, 18), new THREE.MeshLambertMaterial({ color: blank.has(v) ? 0xf2dc94 : 0xc9ccd8 }));
    holder.add(m);
    const top = new THREE.Box3().setFromObject(m).max.y;
    const lab = labelOf(v);
    if (lab) { const d = numDecal(lab, blank.has(v), sz / 0.5); d.position.y = top + 0.02; holder.add(d); }
    const ring = new THREE.Mesh(ringGeo, selMat); ring.rotation.x = Math.PI / 2; ring.position.y = top + 0.03; ring.visible = false; holder.add(ring);
    holder.userData.i = i; g.add(holder);
    return { holder, m, v, ring, top };
  });
  S.place(g, { pos: S.anchor.clone() });
  let frog = null;
  if (o.frog !== false && F.VOX && F.VOX.has('frosk')) {
    frog = F.VOX.make('frosk', {}); const b = new THREE.Box3().setFromObject(frog), s3 = b.getSize(new THREE.Vector3()); frog.scale.multiplyScalar(sz * 0.8 / Math.max(s3.x, s3.y, s3.z, 0.05));
    const s0 = st[0]; frog.position.set(s0.holder.position.x, s0.top, s0.holder.position.z); g.add(frog);
  }
  const sel = new Set(); let sol = null, lastTap = -1;
  const cv = F.R.renderer.domElement; let down = null;
  const pd = e => { down = { x: e.clientX, y: e.clientY }; };
  const pu = e => {
    if (w.dead || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) { down = null; return; }
    down = null;
    const r = cv.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, F.R.camera);
    const hit = ray.intersectObjects(st.map(x => x.holder), true)[0];
    let i = -1;
    if (hit) { let m = hit.object; while (m && m.userData.i == null) m = m.parent; if (m) i = m.userData.i; }
    if (i < 0) return;
    e.stopPropagation();
    // natural audit D6: a stone tapped while the question plays is HER choice – it is selected now and judged when the gate opens
    // (S.submit keeps it: S.submitEarly(v) → judged at the gate); no more «not yet» without a trace
    if (w.locked || w.dead) return;
    F.sfx.click(); tap(i);
  };
  cv.addEventListener('pointerdown', pd, true); cv.addEventListener('pointerup', pu, true);
  let done = null;
  if (multi) { done = button(S, o.done || FERDIG(), () => { if (!w.locked && !w.dead && sel.size) S.submit(value(), w); }, 'kdone'); w.parts.push(done); }
  function tap(i) {
    if (multi) { if (sel.has(i)) sel.delete(i); else sel.add(i); F.sfx.pling && F.sfx.pling(sel.size % 8); refresh(); return; }
    sel.clear(); sel.add(i); lastTap = i; refresh(); S.submit(vals[i], w);
  }
  const value = () => multi ? sortVals([...sel].map(i => vals[i])) : (lastTap >= 0 ? vals[lastTap] : null);
  function refresh() {
    st.forEach((x, i) => { const sh = sol && sol.has(i) && !(multi && sel.has(i)); x.ring.visible = sel.has(i) || !!sh; x.ring.material = sh ? solMat : selMat; });
    if (done) done.classList.toggle('kready', sel.size > 0);
    (o.onChange || (() => {}))(value());
  }
  const pulse = F.on('tick', () => { if (sol) { const k = 1 + Math.sin((F.T.now || 0) * 6) * 0.12; st.forEach((x, i) => { if (sol.has(i)) x.ring.scale.setScalar(k); }); } });
  async function hopTo(i) {
    if (!frog || !st[i]) return;
    const a = frog.position.clone(), b = new THREE.Vector3(st[i].holder.position.x, st[i].top, st[i].holder.position.z);
    frog.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    F.sfx.boing && F.sfx.boing();
    await F.T.tween(380, k => { frog.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 0.55, a.z + (b.z - a.z) * k); });
  }
  // look-back: the frog hops along HER answer, then home – never to the right stone
  w.lookBack = async v => {
    if (!frog) return;
    const tgt = (Array.isArray(v) ? v : [v]).map(x => vals.findIndex(y => sameV(y, x))).filter(i => i >= 0).sort((a, b) => a - b);
    if (!tgt.length) return;
    say(S, 'kit_lb_frosk');
    for (const i of tgt.slice(0, 6)) await hopTo(i);
    await sleep(300); await hopTo(0);
  };
  w.onDestroy = () => { cv.removeEventListener('pointerdown', pd, true); cv.removeEventListener('pointerup', pu, true); pulse(); };
  w.feed = v => { if (multi) { sel.clear(); (v || []).forEach(x => { const i = vals.findIndex(y => sameV(y, x)); if (i >= 0) sel.add(i); }); refresh(); return S.submit(value(), w); } const i = vals.findIndex(y => sameV(y, v)); lastTap = i; sel.clear(); if (i >= 0) sel.add(i); refresh(); return S.submit(i >= 0 ? vals[i] : v, w); };
  w.rightValue = () => multi ? sortVals(answer || []) : answer;
  w.wrongValue = () => { if (multi) { const a = answer || []; if (a.length > 1) return sortVals(a.slice(1)); const x = vals.find(y => !a.some(z => sameV(z, y))); return sortVals(a.concat([x])); } return vals.find(y => !sameV(y, answer)); };
  w.solution = () => { const a = multi ? (answer || []) : [answer]; sol = new Set(a.map(x => vals.findIndex(y => sameV(y, x))).filter(i => i >= 0)); if (!multi) sel.clear(); refresh(); };
  w.solTpl = multi ? 'kit_sol_tapall' : 'kit_sol_stone';
  w.hint = w.hint || (async () => { await say(S, multi ? 'kit_h_alle' : 'kit_h_stone'); });
  w.helpStep = multi ? async () => { const a = answer || []; const isA = i => a.some(x => sameV(x, vals[i])); const bad = [...sel].find(i => !isA(i)); if (bad != null) sel.delete(bad); else { const i = vals.findIndex((v, k) => isA(k) && !sel.has(k)); if (i < 0) return false; sel.add(i); await hopTo(i); } refresh(); return true; } : null;
  w.value = value; w.three = true; w.group = g; w.stoneAt = i => st[i] && st[i].holder; w.hopTo = hopTo;
  refresh();
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack && frog) S.lookBack(w.lookBack);
  return p;
}
function stones(S, o) {
  o = o || {};
  cssOnce();
  const from = o.from != null ? +o.from : 0, to = o.to != null ? +o.to : 20, step = o.step || 1;
  const vals = []; for (let v = from; step > 0 ? v <= to : v >= to; v += step) vals.push(v);
  const blank = new Set((o.blank || []).map(Number));
  const multi = !!o.multi;
  const answer = o.answer != null ? o.answer : (multi ? [...blank] : null);
  const labelOf = v => {
    if (blank.has(v)) return '?';
    const L = o.labels == null ? 'all' : o.labels;
    if (L === 'all') return String(v);
    if (L === 'none') return '';
    if (L === 'ends') return v === vals[0] || v === vals[vals.length - 1] ? String(v) : '';
    if (L === 'tens') return v % 10 === 0 ? String(v) : '';
    if (Array.isArray(L)) return L.some(x => +x === v) ? String(v) : '';
    return String(v);
  };
  const check = o.check || (multi ? (vs => setEq(vs, answer || [])) : (v => sameV(v, answer)));
  defaults(S, multi ? 1 / (Math.pow(2, vals.length) - 1) : 1 / vals.length, multi ? 'subset' : 'scene');
  if (S.has3D && o.dom !== true && (o.three === true || vals.length <= 12) && typeof THREE !== 'undefined' && F.R && F.R.renderer) return stones3d(S, o, vals, blank, multi, answer, labelOf, check);
  const w = widget(S, 'stones-kit', o);
  w.values = vals;
  const perRow = o.perRow || (vals.length > 40 ? 10 : vals.length > 20 ? 10 : Math.min(vals.length, 12));
  const B = board(S, 'kstones' + (vals.length > 30 ? ' kdense' : ''), { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const sel = new Set(); let sol = null;
  const stonesEl = [];
  for (let r = 0; r * perRow < vals.length; r++) {
    const row = el('div', 'kstonerow' + (r % 2 && o.snake ? ' krev' : ''));
    vals.slice(r * perRow, (r + 1) * perRow).forEach((v, k) => {
      const i = r * perRow + k;
      const s = el('button', 'kstone' + (blank.has(v) ? ' kblank' : ''), labelOf(v)); s.dataset.v = v; s.style.setProperty('--i', i);
      s.addEventListener('click', e => { e.stopPropagation(); if (w.locked || w.dead) return; F.sfx.click(); tap(i); });   // (D6: an early tap is kept)
      row.appendChild(s); stonesEl.push(s);
    });
    B.appendChild(row);
  }
  const frog = o.frog === false ? null : el('div', 'kfrog', '🐸');
  if (frog) { B.appendChild(frog); F.T.timeout(() => moveFrog(0, true), 50); }
  let done = null;
  if (multi) { done = button(S, o.done || FERDIG(), () => submit(), 'kdone'); w.parts.push(done); }
  function moveFrog(i, instant) {
    if (!frog || !stonesEl[i]) return;
    const r = stonesEl[i].getBoundingClientRect(), br = B.getBoundingClientRect();
    frog.style.transition = instant ? 'none' : '';
    frog.style.left = (r.left - br.left + r.width / 2) + 'px'; frog.style.top = (r.top - br.top - 6) + 'px';
  }
  function tap(i) {
    if (multi) { if (sel.has(i)) sel.delete(i); else sel.add(i); refresh(); return; }
    stonesEl.forEach(s => s.classList.remove('ksel')); stonesEl[i].classList.add('ksel');
    lastTap = i; S.submit(vals[i], w);
  }
  let lastTap = -1;
  const value = () => multi ? sortVals([...sel].map(i => vals[i])) : (lastTap >= 0 ? vals[lastTap] : null);
  function refresh() {
    stonesEl.forEach((s, i) => { s.classList.toggle('ksel', sel.has(i)); s.classList.toggle('kglow', !!sol && (multi ? sol.has(i) !== sel.has(i) : sol.has(i))); });
    if (done) done.classList.toggle('kready', sel.size > 0);
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; if (multi && !sel.size) return; S.submit(value(), w); }
  // look-back: the frog hops along HER answer and back (2–3 s) – never to the right stone
  w.lookBack = async v => {
    if (!frog) return;
    const tgt = (Array.isArray(v) ? v : [v]).map(x => vals.findIndex(y => sameV(y, x))).filter(i => i >= 0).sort((a, b) => a - b);
    if (!tgt.length) return;
    say(S, 'kit_lb_frosk');
    for (const i of tgt.slice(0, 6)) { moveFrog(i); frog.classList.remove('khop'); void frog.offsetWidth; frog.classList.add('khop'); F.sfx.boing && F.sfx.boing(); await sleep(tgt.length > 3 ? 380 : 650); }
    await sleep(350); moveFrog(0); await sleep(300);
  };
  w.feed = v => { if (multi) { sel.clear(); (v || []).forEach(x => { const i = vals.findIndex(y => sameV(y, x)); if (i >= 0) sel.add(i); }); refresh(); return S.submit(value(), w); } const i = vals.findIndex(y => sameV(y, v)); lastTap = i; return S.submit(i >= 0 ? vals[i] : v, w); };
  w.rightValue = () => multi ? sortVals(answer || []) : answer;
  w.wrongValue = () => { if (multi) { const a = answer || []; if (a.length > 1) return sortVals(a.slice(1)); const x = vals.find(y => !a.some(z => sameV(z, y))); return sortVals(a.concat([x])); } return vals.find(y => !sameV(y, answer)); };
  w.solution = () => { const a = multi ? (answer || []) : [answer]; sol = new Set(a.map(x => vals.findIndex(y => sameV(y, x))).filter(i => i >= 0)); refresh(); };
  w.solTpl = multi ? 'kit_sol_tapall' : 'kit_sol_stone';
  w.hint = w.hint || (async () => { await say(S, multi ? 'kit_h_alle' : 'kit_h_stone'); });
  w.helpStep = multi ? async () => { const a = answer || []; const isA = i => a.some(x => sameV(x, vals[i])); const bad = [...sel].find(i => !isA(i)); if (bad != null) sel.delete(bad); else { const i = vals.findIndex((v, k) => isA(k) && !sel.has(k)); if (i < 0) return false; sel.add(i); } refresh(); return true; } : null;
  w.value = value;
  refresh();
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack && frog) S.lookBack(w.lookBack);
  return p;
}

/* ---------------------------------------------------------- S.line */
function line(S, o) {
  o = o || {};
  cssOnce();
  const min = o.min != null ? +o.min : 0, max = o.max != null ? +o.max : 100, tol = o.tol != null ? +o.tol : 1;
  const answer = o.answer != null ? +o.answer : null;
  const check = o.check || (v => answer != null && Math.abs(+v - answer) <= tol);
  defaults(S, Math.min(1, (2 * tol + 1) / (max - min + 1)), 'line');
  const w = widget(S, 'line-kit', o);
  const B = board(S, 'kline', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const rail = el('div', 'krail'); B.appendChild(rail);
  const marks = o.marks || [min, max];
  marks.forEach(m => { const t = el('div', 'ktick', '<span>' + m + '</span>'); t.style.left = ((m - min) / (max - min) * 100) + '%'; rail.appendChild(t); });
  const pin = el('div', 'kpin', o.pin || '🐸'); rail.appendChild(pin); pin.style.display = 'none';
  // F44 «Hvilket tall viser pila?»: a fixed arrow at o.arrow (the format then asks with S.keypad); S.lineShow(o) = board only
  if (o.arrow != null) { const ar = el('div', 'karrow', '⬇'); ar.style.left = ((+o.arrow - min) / (max - min) * 100) + '%'; rail.appendChild(ar); }
  const ghost = el('div', 'kzone'); rail.appendChild(ghost); ghost.style.display = 'none';
  let last = null;
  const toV = x => { const r = rail.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (x - r.left) / r.width)); return Math.round(min + f * (max - min)); };
  const at = v => ((v - min) / (max - min) * 100) + '%';
  rail.addEventListener('click', e => {
    e.stopPropagation();
    if (w.locked || w.dead) return;              // natural audit D6: a spot tapped while the question plays is kept (judged at the gate)
    const v = toV(e.clientX); place(v); F.sfx.click(); submit(v);
  });
  function place(v) { last = v; pin.style.display = ''; pin.style.left = at(v); pin.classList.remove('khop'); void pin.offsetWidth; pin.classList.add('khop'); }
  function submit(v) { w.dist = answer != null ? Math.abs(v - answer) : null; S.lineDist = w.dist; S.submit(v, w); }
  // look-back: her spot shows her number (what she «said»), then the pin goes home
  w.lookBack = async v => {
    if (v == null) return;
    const tag = el('div', 'kpinlab', String(v)); tag.style.left = at(+v); rail.appendChild(tag);
    say(S, 'kit_lb_line');
    await sleep(1800); tag.remove();
  };
  w.feed = v => { place(+v); submit(+v); return true; };
  w.rightValue = () => answer;
  w.wrongValue = () => { const d = Math.max(tol + 3, Math.round((max - min) * 0.25)); return answer + d <= max ? answer + d : answer - d; };
  w.solution = () => { if (answer == null) return; ghost.style.display = ''; ghost.style.left = at(Math.max(min, answer - tol)); ghost.style.width = (Math.max(1, 2 * tol) / (max - min) * 100) + '%'; ghost.classList.add('kglow'); };
  w.solTpl = 'kit_sol_line';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_line'); });
  w.value = () => last;
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack) S.lookBack(w.lookBack);
  return p;
}

// display-only rail (no answer): marks, an optional arrow – for keypad questions about a position
function lineShow(S, o) {
  o = o || {}; cssOnce();
  const min = o.min != null ? +o.min : 0, max = o.max != null ? +o.max : 100;
  const B = board(S, 'kline', {}); const rail = el('div', 'krail'); B.appendChild(rail);
  (o.marks || [min, max]).forEach(m => { const t = el('div', 'ktick', '<span>' + m + '</span>'); t.style.left = ((m - min) / (max - min) * 100) + '%'; rail.appendChild(t); });
  if (o.arrow != null) { const ar = el('div', 'karrow', '⬇'); ar.style.left = ((+o.arrow - min) / (max - min) * 100) + '%'; rail.appendChild(ar); }
  return { el: B, rail, remove() { B.remove(); } };
}

/* ---------------------------------------------------------- S.grid */
function grid(S, o) {
  o = o || {};
  cssOnce();
  const W = o.w || 4, H = o.h || 4, syms = o.symbols || [{ icon: '🍎' }, { icon: '🍌' }, { icon: '🍇' }, { icon: '🍐' }];   // clearly different colours
  const mode = o.mode || 'cycle';
  const givenAt = (r, c) => { const g = o.given; if (!g) return null; if (Array.isArray(g)) return g[r] && g[r][c] != null ? g[r][c] : null; const x = g[r + ',' + c]; return x != null ? x : null; };
  const cells = []; for (let r = 0; r < H; r++) { cells.push([]); for (let c = 0; c < W; c++) cells[r].push(givenAt(r, c)); }
  const check = o.check || (gr => Array.isArray(o.answer) && gr.every((row, r) => row.every((x, c) => (x == null ? null : +x) === (o.answer[r][c] == null ? null : +o.answer[r][c]))));
  defaults(S, 0.001, 'grid');
  const w = widget(S, 'grid-kit', o);
  const B = board(S, 'kgrid', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const gEl = el('div', 'kgridin'); gEl.style.gridTemplateColumns = `repeat(${W}, var(--kcell))`; B.appendChild(gEl);
  let brush = 0, sol = null;
  const cEls = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const fixed = givenAt(r, c) != null;
    const ce = el('button', 'kcell' + (fixed ? ' kgiven' : ''));
    if (o.boxes) { const [bw, bh] = o.boxes; if (c % bw === 0 && c) ce.classList.add('kbl'); if (r % bh === 0 && r) ce.classList.add('kbt'); }
    ce.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead || fixed) return; F.sfx.click(); tapCell(r, c); });
    gEl.appendChild(ce); cEls.push({ ce, r, c, fixed });
  }
  let pal = null;
  if (mode === 'paint') {
    pal = el('div', 'kpalette'); B.appendChild(pal);
    syms.forEach((s, k) => { const b = el('button', 'kcard ksmall' + (k === 0 ? ' ksel' : '')); b.appendChild(face(s, { size: 70 })); b.addEventListener('click', e => { e.stopPropagation(); if (w.locked) return; F.sfx.click(); brush = k; [...pal.children].forEach((x, j) => x.classList.toggle('ksel', j === k)); }); pal.appendChild(b); });
  }
  function tapCell(r, c) {
    const cur = cells[r][c];
    if (mode === 'paint') cells[r][c] = cur === brush ? null : brush;
    else cells[r][c] = cur == null ? 0 : (cur + 1 >= syms.length ? null : cur + 1);
    refresh();
  }
  const done = button(S, o.done || FERDIG(), () => submit(), 'kdone'); w.parts.push(done);
  const value = () => cells.map(row => row.slice());
  function refresh() {
    cEls.forEach(({ ce, r, c }) => {
      const k = cells[r][c]; ce.innerHTML = ''; if (k != null && syms[k]) ce.appendChild(face(syms[k], { size: 60 }));
      ce.classList.toggle('kglow', !!sol && (sol[r][c] == null ? null : +sol[r][c]) !== (k == null ? null : +k));
      if (sol && k == null && sol[r][c] != null && syms[sol[r][c]]) { const gh = face(syms[sol[r][c]], { size: 60 }); gh.classList.add('kghostsym'); ce.appendChild(gh); }
    });
    const full = cells.every(row => row.every(x => x != null));
    done.classList.toggle('kready', o.needFull === false ? true : full);
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; if (o.needFull !== false && cells.some(row => row.some(x => x == null))) { gEl.classList.remove('kshake'); void gEl.offsetWidth; gEl.classList.add('kshake'); return; } S.submit(value(), w); }
  w.feed = gr => { for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (givenAt(r, c) == null) cells[r][c] = gr && gr[r] && gr[r][c] != null ? +gr[r][c] : null; refresh(); return S.submit(value(), w); };
  w.rightValue = () => o.answer ? o.answer.map(r => r.slice()) : null;
  w.wrongValue = () => { const a = w.rightValue(); if (!a) return value(); for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (givenAt(r, c) == null) { a[r][c] = (a[r][c] + 1) % syms.length; return a; } return a; };
  w.solution = () => { if (!o.answer) return; sol = o.answer; for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (givenAt(r, c) == null && cells[r][c] != null && +cells[r][c] !== +sol[r][c]) cells[r][c] = null; refresh(); };
  w.helpStep = async () => {
    if (!o.answer) return false;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (givenAt(r, c) == null && (cells[r][c] == null ? null : +cells[r][c]) !== +o.answer[r][c]) { cells[r][c] = +o.answer[r][c]; refresh(); const ce = cEls.find(x => x.r === r && x.c === c); if (ce) { ce.ce.classList.add('kglow'); F.T.timeout(() => ce.ce.classList.remove('kglow'), 1400); } return true; }
    return false;
  };
  w.solTpl = 'kit_sol_grid';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_grid'); });
  w.value = value;
  refresh();
  return arm(S, w, Object.assign({}, o, { check }));
}

/* ---------------------------------------------------------- S.vox */
function isoSVG(W, D, hts, o) {
  o = o || {};
  const s = o.s || 22, ox = (D) * s * 0.87 + 8, oy = 8 + (o.maxH || 4) * s;
  const P = (x, y, z) => [ox + (x - y) * s * 0.87, oy + (x + y) * s * 0.5 - z * s];
  let out = '';
  const cube = (x, y, z, ghost) => {
    const pts = a => a.map(p => p.join(',')).join(' ');
    const t = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const l = [P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)];
    const r = [P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)];
    const op = ghost ? ' fill-opacity="0.25" stroke-dasharray="3 2"' : '';
    out += `<polygon points="${pts(t)}" fill="#ffe08a" stroke="#b07a1a" stroke-width="1.5"${op}/><polygon points="${pts(l)}" fill="#f2b84b" stroke="#b07a1a" stroke-width="1.5"${op}/><polygon points="${pts(r)}" fill="#d9952e" stroke="#b07a1a" stroke-width="1.5"${op}/>`;
  };
  // base plate
  const base = [P(0, 0, 0), P(W, 0, 0), P(W, D, 0), P(0, D, 0)].map(p => p.join(',')).join(' ');
  out += `<polygon points="${base}" fill="#cfe8c6" stroke="#8fb488" stroke-width="1.5"/>`;
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) for (let z = 0; z < (hts[y * W + x] || 0); z++) cube(x, y, z, o.ghost && o.ghost[y * W + x] > 0 && z >= (o.real ? o.real[y * W + x] : 0));
  const w = (W + D) * s * 0.87 + 16, h = oy + (W + D) * s * 0.5 + 10;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${out}</svg>`;
}
/* 3D cube tower on the stage (S.vox 3D mode and S.voxShow): a plate of W×D cells, columns of cubes with dark edges (countable),
   ghost cubes for the solution. tower.set(hts, {ghost}) · tower.pick(clientX, clientY) → cell | -1 · tower.explode(on) (layers lift
   apart: the look-back after a miscount) · tower.rotate(±1) (90° steps) · tower.remove() */
const VOX_COL = [0xffd76a, 0xffb84d, 0xff9f6b, 0xf28fb0, 0xc59cf0, 0x8fc4f2];
function tower3D(S, W, D, o) {
  o = o || {};
  const c = o.cell || (Math.max(W, D) > 4 ? 0.62 : 0.85);
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(W * c + 0.24, 0.1, D * c + 0.24), new THREE.MeshLambertMaterial({ color: 0xb98a56 }));
  plate.position.y = 0.05; plate.receiveShadow = true; inner.add(plate);
  const tiles = [];
  const tileMat = [new THREE.MeshLambertMaterial({ color: 0xcfe8c6 }), new THREE.MeshLambertMaterial({ color: 0xb6dbaa })];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(c * 0.94, 0.03, c * 0.94), tileMat[(x + y) % 2]);
    t.position.set((x - (W - 1) / 2) * c, 0.115, (y - (D - 1) / 2) * c); t.userData.cell = y * W + x; inner.add(t); tiles.push(t);
  }
  const geo = new THREE.BoxGeometry(c * 0.96, c * 0.96, c * 0.96), edges = new THREE.EdgesGeometry(geo);
  const mats = VOX_COL.map(col => new THREE.MeshLambertMaterial({ color: col }));
  const ghostMat = new THREE.MeshLambertMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.38, depthWrite: false });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x7a4a10 }), ghostLine = new THREE.LineBasicMaterial({ color: 0xc9962b, transparent: true, opacity: 0.6 });
  let cubes = [], exploded = false;
  const T = {
    group: g, cell: c, tiles,
    set(hts, opt) {
      opt = opt || {};
      cubes.forEach(m => inner.remove(m)); cubes = [];
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, h = +hts[i] || 0, gh = opt.ghost ? Math.max(h, +opt.ghost[i] || 0) : h;
        for (let z = 0; z < gh; z++) {
          const ghost = z >= h;
          const m = new THREE.Mesh(geo, ghost ? ghostMat : mats[(o.colorBy === 'column' ? i : z) % mats.length]);
          m.position.set((x - (W - 1) / 2) * c, 0.13 + c * (z + 0.5), (y - (D - 1) / 2) * c);
          m.userData.cell = i; m.userData.z = z; m.userData.ghost = ghost; m.castShadow = !ghost;
          m.add(new THREE.LineSegments(edges, ghost ? ghostLine : lineMat));
          inner.add(m); cubes.push(m);
        }
      }
      if (exploded) T.explode(true, true);
    },
    pick(cx, cy) {
      const r = F.R.renderer.domElement.getBoundingClientRect(), ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, F.R.camera);
      const hit = ray.intersectObjects(cubes.filter(m => !m.userData.ghost).concat(tiles), false)[0];
      return hit ? hit.object.userData.cell : -1;
    },
    explode(on, instant) {
      exploded = !!on;
      cubes.forEach(m => { const y0 = 0.13 + c * (m.userData.z + 0.5), y1 = y0 + (on ? m.userData.z * c * 0.7 : 0); if (instant) m.position.y = y1; else { const ys = m.position.y; F.T.tween(500, k => { m.position.y = ys + (y1 - ys) * U3.smooth(k); }); } });
    },
    rotate(dir) { const r0 = inner.rotation.y, r1 = r0 + (dir || 1) * Math.PI / 2; F.T.tween(400, k => { inner.rotation.y = r0 + (r1 - r0) * U3.smooth(k); }); },
    remove() { if (g.parent) g.parent.remove(g); },
  };
  S.place(g, { pos: o.pos || S.anchor.clone() });
  if (o.scale) g.scale.setScalar(o.scale);
  return T;
}
const U3 = { smooth: k => k * k * (3 - 2 * k) };
// display only: a tower for counting / comparing (F60). Returns the tower handle (above).
function voxShow(S, hts, o) {
  o = o || {};
  const [W, D] = o.base || [3, 3];
  const T = tower3D(S, W, D, o); T.set(hts || []);
  return T;
}
function vox3d(S, o, W, D, maxH, hts, check) {
  const w = widget(S, 'vox-kit', o);
  const T = tower3D(S, W, D, o);
  let remove = false, sol = null;
  const cv = F.R.renderer.domElement;
  let down = null;
  const pd = e => { down = { x: e.clientX, y: e.clientY }; };
  const pu = e => {
    if (w.dead || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) { down = null; return; }
    down = null;
    const i = T.pick(e.clientX, e.clientY); if (i < 0) return;
    e.stopPropagation();
    if (composeEarly(S)) return;
    if (w.locked) return;
    if (remove) hts[i] = Math.max(0, hts[i] - 1); else hts[i] = hts[i] >= maxH ? 0 : hts[i] + 1;
    F.sfx.pop ? F.sfx.pop() : F.sfx.click(); refresh();
  };
  cv.addEventListener('pointerdown', pd, true); cv.addEventListener('pointerup', pu, true);
  if (o.rotate) { const r1 = button(S, '⟲', () => T.rotate(1), 'ksmallbtn'), r2 = button(S, '⟳', () => T.rotate(-1), 'ksmallbtn'); w.parts.push(r1, r2); }
  const minus = button(S, '−', () => { remove = !remove; minus.classList.toggle('ksel', remove); }, 'ksmallbtn'); w.parts.push(minus);
  const done = button(S, o.done || FERDIG(), () => { if (!w.locked && !w.dead) S.submit(hts.slice(), w); }, 'kdone'); w.parts.push(done);
  const value = () => hts.slice();
  function refresh() { T.set(hts, { ghost: sol }); done.classList.toggle('kready', hts.some(x => x > 0)); (o.onChange || (() => {}))(value()); }
  w.onDestroy = () => { cv.removeEventListener('pointerdown', pd, true); cv.removeEventListener('pointerup', pu, true); };
  w.feed = h => { for (let i = 0; i < W * D; i++) hts[i] = +((h || [])[i]) || 0; refresh(); return S.submit(value(), w); };
  w.rightValue = () => o.answer ? o.answer.slice() : null;
  w.wrongValue = () => { const a = (o.answer || hts).slice(); a[0] = (+a[0] || 0) + 1; return a; };
  w.solution = () => { if (!o.answer) return; sol = o.answer.map(x => +x || 0); for (let i = 0; i < hts.length; i++) if (hts[i] > sol[i]) hts[i] = sol[i]; refresh(); };
  w.lookBack = async () => { say(S, 'kit_lb_tarn'); T.explode(true); await sleep(1600); T.explode(false); await sleep(500); };
  w.solTpl = 'kit_sol_vox';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_vox'); });
  w.helpStep = async () => { if (!o.answer) return false; const i = hts.findIndex((h, k) => h !== (+o.answer[k] || 0)); if (i < 0) return false; hts[i] = +o.answer[i] || 0; refresh(); return true; };
  w.value = value; w.tower = T; w.three = true;
  refresh();
  const p = arm(S, w, Object.assign({}, o, { check }));
  if (!o.lookBack && S.lookBack) S.lookBack(w.lookBack);
  return p;
}
function vox(S, o) {
  o = o || {};
  cssOnce();
  if (S.has3D && o.dom !== true && typeof THREE !== 'undefined' && F.R && F.R.renderer) {
    const [W3, D3] = o.base || [3, 3], maxH3 = o.maxH || 4;
    const h3 = (o.given || []).slice(); for (let i = 0; i < W3 * D3; i++) h3[i] = +h3[i] || 0;
    defaults(S, 0.001, 'build');
    return vox3d(S, o, W3, D3, maxH3, h3, o.check || (h => Array.isArray(o.answer) && h.every((x, i) => +x === +(o.answer[i] || 0))));
  }
  const [W, D] = o.base || [3, 3], maxH = o.maxH || 4;
  const hts = (o.given || []).slice(); for (let i = 0; i < W * D; i++) hts[i] = +hts[i] || 0;
  const check = o.check || (h => Array.isArray(o.answer) && h.every((x, i) => +x === +(o.answer[i] || 0)));
  defaults(S, 0.001, 'build');
  const w = widget(S, 'vox-kit', o);
  const B = board(S, 'kvox', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const plan = el('div', 'kplan'); plan.style.gridTemplateColumns = `repeat(${W}, var(--kcell))`;
  const view = el('div', 'kiso');
  B.appendChild(plan); if (o.view !== false) B.appendChild(view);
  let remove = false, sol = null;
  const cEls = hts.map((_, i) => {
    const ce = el('button', 'kcell kvcell');
    ce.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead) return; F.sfx.click(); tapCell(i); });
    plan.appendChild(ce); return ce;
  });
  const minus = button(S, '−', () => { remove = !remove; minus.classList.toggle('ksel', remove); }, 'ksmallbtn'); w.parts.push(minus);
  const done = button(S, o.done || FERDIG(), () => submit(), 'kdone'); w.parts.push(done);
  function tapCell(i) {
    if (remove) hts[i] = Math.max(0, hts[i] - 1);
    else hts[i] = hts[i] >= maxH ? 0 : hts[i] + 1;
    F.sfx.pling && F.sfx.pling(hts[i]); refresh();
  }
  const value = () => hts.slice();
  function refresh() {
    cEls.forEach((ce, i) => { ce.innerHTML = hts[i] ? '<b>' + hts[i] + '</b>' : ''; ce.classList.toggle('kfilled', hts[i] > 0); ce.classList.toggle('kglow', !!sol && +sol[i] !== hts[i]); if (sol && +sol[i] !== hts[i]) ce.appendChild(el('span', 'kghostn', String(+sol[i] || 0))); });
    if (o.view !== false) view.innerHTML = isoSVG(W, D, sol ? hts.map((h, i) => Math.max(h, +sol[i] || 0)) : hts, { maxH, ghost: sol ? sol.map((s, i) => (+s || 0) > hts[i] ? 1 : 0) : null, real: hts });
    done.classList.toggle('kready', hts.some(x => x > 0));
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; S.submit(value(), w); }
  w.feed = h => { for (let i = 0; i < W * D; i++) hts[i] = +((h || [])[i]) || 0; refresh(); return S.submit(value(), w); };
  w.rightValue = () => o.answer ? o.answer.slice() : null;
  w.wrongValue = () => { const a = (o.answer || hts).slice(); a[0] = (+a[0] || 0) + 1; return a; };
  w.solution = () => { if (!o.answer) return; sol = o.answer.map(x => +x || 0); refresh(); };
  w.solTpl = 'kit_sol_vox';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_vox'); });
  w.helpStep = async () => { if (!o.answer) return false; const i = hts.findIndex((h, k) => h !== (+o.answer[k] || 0)); if (i < 0) return false; hts[i] = +o.answer[i] || 0; refresh(); return true; };
  w.value = value; w.svg = (h, opt) => isoSVG(W, D, h, Object.assign({ maxH }, opt || {}));
  refresh();
  return arm(S, w, Object.assign({}, o, { check }));
}

/* ---------------------------------------------------------- S.balance */
/* 3D two-pan balance on the stage: the beam tips after «Sjekk» (that IS the look-back), pans stay level. Items are labelled blocks
   (numbers) or small VOX models. Palette = tray cards; tap a loose block on a pan to take it off. */
function balance3d(S, o, left, right, palette, wt, target, check) {
  const w = widget(S, 'balance-kit', o);
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x9c6b36 }), brass = new THREE.MeshLambertMaterial({ color: 0xe0b44a }), panM = new THREE.MeshLambertMaterial({ color: 0xf2d38a });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.16, 20), wood); base.position.y = 0.08; g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.75, 12), wood); post.position.y = 0.95; g.add(post);
  const pivot = new THREE.Group(); pivot.position.y = 1.85; g.add(pivot);
  const L = 1.65;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * L + 0.2, 0.12, 0.16), brass); pivot.add(beam);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), brass); pivot.add(knob);
  const pans = [-1, 1].map(sg => {
    const hang = new THREE.Group(); g.add(hang);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a })); rope.position.y = -0.42; hang.add(rope);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.12, 24), panM); pan.position.y = -0.86; hang.add(pan);
    const load = new THREE.Group(); load.position.y = -0.8; hang.add(load);
    return { sg, hang, load, items: [] };
  });
  let ang = 0;
  const place = () => pans.forEach(p => { p.hang.position.set(Math.cos(ang) * L * p.sg, 1.85 + Math.sin(ang) * L * p.sg, 0); });
  place();
  // v5 WP-K3 (WP-P request a): the beam is never level while the pans differ – it starts tipped to the heavy side and a red lock peg
  // through the pivot holds it while she loads (no live feedback = no trial and error); «Sjekk» pulls the peg and the beam swings
  const pegM = new THREE.MeshLambertMaterial({ color: 0xd9534f, transparent: true, opacity: 1 });
  const peg = new THREE.Group();
  const pegRod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 10), pegM); pegRod.rotation.x = Math.PI / 2; peg.add(pegRod);
  const pegKnob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), pegM); pegKnob.position.z = 0.33; peg.add(pegKnob);
  peg.position.set(0, 1.85, 0.05); g.add(peg);
  let pegIn = true;
  const setPeg = (on, ms) => {
    if (on === pegIn && !ms) return Promise.resolve();
    pegIn = on;
    const z0 = peg.position.z, z1 = on ? 0.05 : 0.55, o0 = pegM.opacity, o1 = on ? 1 : 0;
    if (!ms) { peg.position.z = z1; pegM.opacity = o1; peg.visible = on; return Promise.resolve(); }
    peg.visible = true;
    return F.T.tween(ms, k => { peg.position.z = z0 + (z1 - z0) * k; pegM.opacity = o0 + (o1 - o0) * k; }).then(() => { peg.visible = pegIn; });
  };
  const angOf = d => d === 0 ? 0 : Math.max(-0.32, Math.min(0.32, Math.sign(d) * (0.12 + Math.min(0.2, Math.abs(d) * 0.03))));
  S.place(g, { pos: S.anchor.clone() });
  g.scale.setScalar(o.scale || 1.3);
  const st = { left: left.slice(), right: right.slice() };
  const labels = [];
  let ghosts = null;                      // the solution's blocks still to lay on: {left:[v…], right:[v…]} (w.solution)
  const loose = sd => st[sd].filter(it => !it.fixed).length;
  const blockOf = (it, ghost) => {
    let m;
    if (it.model && F.VOX && F.VOX.has(it.model)) { m = F.VOX.make(it.model, it.opts || {}); const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()); m.scale.multiplyScalar(0.34 / Math.max(sz.x, sz.y, sz.z, 0.05)); }
    else { m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshLambertMaterial({ color: it.fixed ? 0xd9a35b : 0xb9a5f0 })); m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x5b3e1e }))); }
    if (ghost) m.traverse(o2 => { if (o2.material) { o2.material = o2.material.clone(); o2.material.transparent = true; o2.material.opacity = 0.32; o2.material.depthWrite = false; } });
    return m;
  };
  // the ghosts still open on a side: the solution's values minus the loose blocks she has laid on that side (by value)
  const ghostLeft = sd => {
    if (!ghosts) return [];
    const have = st[sd].filter(it => !it.fixed).map(it => it.v), out = [];
    ghosts[sd].forEach(v => { const k = have.findIndex(x => sameV(x, v)); if (k >= 0) have.splice(k, 1); else out.push(v); });
    return out;
  };
  function draw() {
    labels.splice(0).forEach(Lb => Lb.remove());
    pans.forEach((p, k) => {
      const sd = k ? 'right' : 'left', list = st[sd];
      while (p.load.children.length) p.load.remove(p.load.children[0]);
      const all = list.map(it => [it, false]).concat(ghostLeft(sd).map(v => [palette.find(q => sameV(q.v, v)) || { v }, true]));
      all.forEach(([it, gh], i) => {
        const m = blockOf(it, gh); const col = i % 3, row = Math.floor(i / 3);
        m.position.set((col - 1) * 0.38, 0.19 + row * 0.37, 0);
        if (!gh) { m.userData.side = sd; m.userData.i = i; m.userData.fixed = !!it.fixed; }
        p.load.add(m);
        const lab = it.label != null ? it.label : (it.icon ? null : it.v);
        if (lab != null && !(it.model && F.VOX && F.VOX.has(it.model))) { const sp = numDecal(String(lab), !!it.fixed, 1.15, true); sp.position.set(0, 0.03, 0.24); m.add(sp); }
      });
    });
    if (ghosts) badges();
  }
  // «×n» on each palette card: how many of it the solution still needs (only after the solution is shown)
  function badges() {
    if (!ghosts || !palEl) return;
    palette.forEach((it, k) => {
      const c = palEl.children[k]; if (!c) return;
      const n = ghostLeft('left').concat(ghostLeft('right')).filter(v => sameV(v, it.v)).length;
      let bd = c.querySelector('.kbadge'); if (!bd) { bd = el('span', 'kbadge'); c.appendChild(bd); }
      bd.textContent = n ? '×' + n : ''; bd.style.display = n ? '' : 'none';
      c.classList.toggle('kglow', n > 0);
    });
  }
  // palette cards in the tray
  const palEl = el('div', 'kpalette ktraypal'); S.tray().appendChild(palEl); w.parts.push(palEl);
  let side = o.pan === 'left' ? 'left' : 'right';
  palette.forEach(it => {
    const b = el('button', 'kcard ksmall'); b.appendChild(face(it, { size: 70 }));
    // v5 WP-K3 (WP-P c): max counts only HER blocks, never the fixed ones; loading re-inserts the peg (the beam stays where it is)
    b.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead) return; if ((o.max || 9) <= loose(side)) return; F.sfx.pop ? F.sfx.pop() : F.sfx.click(); st[side].push(Object.assign({}, it, { fixed: false })); setPeg(true, 250); draw(); });
    palEl.appendChild(b);
  });
  const cv = F.R.renderer.domElement; let down = null;
  const pd = e => { down = { x: e.clientX, y: e.clientY }; };
  const pu = e => {
    if (w.dead || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) { down = null; return; }
    down = null;
    const r = cv.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, F.R.camera);
    const objs = []; pans.forEach(p => p.load.children.forEach(m => objs.push(m)));
    const hit = ray.intersectObjects(objs, true)[0]; if (!hit) return;
    let m = hit.object; while (m && m.userData.side == null) m = m.parent; if (!m) return;
    e.stopPropagation();
    if (o.pan === 'both') { side = m.userData.side; }
    if (w.locked || m.userData.fixed) return;
    if (composeEarly(S)) return;
    F.sfx.click(); st[m.userData.side].splice(m.userData.i, 1); setPeg(true, 250); draw();
  };
  cv.addEventListener('pointerdown', pd, true); cv.addEventListener('pointerup', pu, true);
  const value = () => { const lw = st.left.reduce((a, it) => a + wt(it), 0), rw = st.right.reduce((a, it) => a + wt(it), 0); return { left: st.left.map(it => it.v), right: st.right.map(it => it.v), lw, rw }; };
  function tiltTo(a, ms) { const a0 = ang; if (!ms) { ang = a; place(); pivot.rotation.z = ang; return Promise.resolve(); } return F.T.tween(ms, k => { const e = k < 1 ? 1 - Math.pow(1 - k, 3) * Math.cos(k * 9) : 1; ang = a0 + (a - a0) * Math.min(1.15, e); place(); pivot.rotation.z = ang; }); }
  const sj = button(S, o.done || SJEKK(), () => submit(), 'kdone'); w.parts.push(sj);
  async function submit() {
    if (w.locked || w.dead) return;
    const v = value(); w.lock(true);
    // ang > 0 lowers the LEFT pan (beam turns counter-clockwise in the stage's screen-right frame): the heavier side goes down
    const d = v.lw - v.rw, a = angOf(d);
    await setPeg(false, 220);
    F.sfx.thud && F.sfx.thud();
    await tiltTo(a, 900);
    if (w.dead) return;
    if (check(v)) say(S, 'kit_bal_lik'); else if (d !== 0) say(S, 'kit_bal_tung');
    w.lock(false);
    S.submit(v, w);
  }
  w.onDestroy = () => { cv.removeEventListener('pointerdown', pd, true); cv.removeEventListener('pointerup', pu, true); labels.forEach(Lb => Lb.remove()); };
  w.feed = v => { st.left = left.slice(); st.right = right.slice(); ['left', 'right'].forEach(s2 => (v && v[s2] || []).forEach(x => { if (st[s2].some(it => it.fixed && sameV(it.v, x))) return; const it = palette.find(p => sameV(p.v, x)); if (it) st[s2].push(Object.assign({}, it, { fixed: false })); })); draw(); const vv = value(); setPeg(false); tiltTo(angOf(vv.lw - vv.rw)); return S.submit(vv, w); };
  w.rightValue = () => o.solution || null;
  // v5 WP-K3 (WP-P b): the built-in wrong answer is never right (six 1-blocks WAS the answer when t = 6)
  w.wrongValue = () => balWrong(palette, side, left, right, wt, check);
  // v5 WP-K3 (WP-P d): the solution shows HOW MANY to add – her loose blocks go back, ghost blocks stand on the pan for every block
  // of the solution, each palette card glows with «×n»; every tap fills one ghost (she lays them on herself → C)
  w.solution = () => {
    if (!o.solution) return;
    ['left', 'right'].forEach(s2 => { st[s2] = st[s2].filter(it => it.fixed); });
    ghosts = { left: (o.solution.left || []).slice(), right: (o.solution.right || []).slice() };
    setPeg(true, 200); draw(); badges();
  };
  w.solTpl = 'kit_sol_balance';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_balance'); });
  w.value = value; w.three = true; w.group = g; w.pegged = () => pegIn; w.angle = () => ang;
  draw();
  { const v0 = value(); tiltTo(angOf(v0.lw - v0.rw)); }      // tipped to the heavy side from the start, held by the peg
  return arm(S, w, Object.assign({}, o, { check }));
}
// v5 WP-K3 (WP-P b): a wrong load for F.dbg.answer(false) / tests – n blocks of the first palette card on her pan, the first n (6 first,
// as before) whose state the check rejects
function balWrong(palette, side, left, right, wt, check) {
  const p = palette[0]; if (!p) return { left: [], right: [] };
  for (const n of [6, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 0]) {
    const add = Array.from({ length: n }, () => p);
    const L = left.concat(side === 'left' ? add : []), R = right.concat(side === 'right' ? add : []);
    const st = { left: L.map(it => it.v), right: R.map(it => it.v), lw: L.reduce((a, it) => a + wt(it), 0), rw: R.reduce((a, it) => a + wt(it), 0) };
    let right0 = true; try { right0 = !!check(st); } catch (e) { right0 = true; }
    if (!right0) return { left: side === 'left' ? add.map(it => it.v) : [], right: side === 'right' ? add.map(it => it.v) : [] };
  }
  return { left: [], right: [] };
}
function balance(S, o) {
  o = o || {};
  cssOnce();
  if (S.has3D && o.dom !== true && typeof THREE !== 'undefined' && F.R && F.R.renderer) {
    const l3 = (o.left || []).map(it => Object.assign({ fixed: true }, it)), r3 = (o.right || []).map(it => Object.assign({ fixed: true }, it));
    const wt3 = it => +(it.w != null ? it.w : it.v) || 0, tg3 = o.target != null ? +o.target : 0;
    defaults(S, 0.01, 'balance');
    return balance3d(S, o, l3, r3, o.palette || [], wt3, tg3, o.check || (st => st.rw - st.lw === tg3));
  }
  const left = (o.left || []).map(it => Object.assign({ fixed: true }, it)), right = (o.right || []).map(it => Object.assign({ fixed: true }, it));
  const palette = o.palette || [];
  const wt = it => +(it.w != null ? it.w : it.v) || 0;
  const target = o.target != null ? +o.target : 0;
  const check = o.check || (st => st.rw - st.lw === target);
  defaults(S, 0.01, 'balance');
  const w = widget(S, 'balance-kit', o);
  const B = board(S, 'kbal', { inTray: !!o.inTray }); w.parts.push(B); w.el = B;
  const beam = el('div', 'kbeam'), post = el('div', 'kpost');
  const panL = el('div', 'kpan kpanl'), panR = el('div', 'kpan kpanr');
  beam.appendChild(panL); beam.appendChild(panR); B.appendChild(beam); B.appendChild(post);
  const pal = el('div', 'kpalette'); B.appendChild(pal);
  let side = o.pan === 'left' ? 'left' : 'right';
  const st = { left: left.slice(), right: right.slice() };
  const value = () => { const lw = st.left.reduce((a, it) => a + wt(it), 0), rw = st.right.reduce((a, it) => a + wt(it), 0); return { left: st.left.map(it => it.v), right: st.right.map(it => it.v), lw, rw }; };
  let ghosts = null, held = 0;            // v5 WP-K3: the solution's blocks still to lay on; the beam angle the peg holds
  const loose = sd => st[sd].filter(it => !it.fixed).length;
  const ghostLeft = sd => {
    if (!ghosts) return [];
    const have = st[sd].filter(it => !it.fixed).map(it => it.v), out = [];
    ghosts[sd].forEach(v => { const k = have.findIndex(x => sameV(x, v)); if (k >= 0) have.splice(k, 1); else out.push(v); });
    return out;
  };
  palette.forEach((it, k) => {
    const b = el('button', 'kcard ksmall'); b.appendChild(face(it, { size: 70 }));
    b.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked || w.dead) return; F.sfx.click(); if ((o.max || 12) <= loose(side)) return; st[side].push(Object.assign({}, it, { fixed: false })); refresh(); });
    pal.appendChild(b);
  });
  const peg = el('div', 'kpeg'); B.appendChild(peg);
  if (o.pan === 'both') {
    [panL, panR].forEach((p, k) => p.addEventListener('click', e => { e.stopPropagation(); side = k ? 'right' : 'left'; panL.classList.toggle('kact', !k); panR.classList.toggle('kact', !!k); }));
    panR.classList.add('kact');
  }
  const sj = button(S, o.done || SJEKK(), () => submit(), 'kdone'); w.parts.push(sj);
  function drawPan(p, list, sideId) {
    p.innerHTML = '';
    list.forEach((it, i) => { const c = el('button', 'kweight' + (it.fixed ? ' kfixed' : '')); c.appendChild(face(it, { size: 54 })); c.addEventListener('click', e => { e.stopPropagation(); if (w.locked || it.fixed) return; F.sfx.click(); st[sideId].splice(i, 1); refresh(); }); p.appendChild(c); });
    ghostLeft(sideId).forEach(v => { const it = palette.find(q => sameV(q.v, v)) || { v }; const c = el('span', 'kweight kghost'); c.appendChild(face(it, { size: 54 })); p.appendChild(c); });
  }
  const degOf = d => d === 0 ? 0 : Math.max(-14, Math.min(14, d * 3 + Math.sign(d) * 5));
  function tilt(v) { const d = v.lw - v.rw; held = degOf(d); beam.style.transform = `rotate(${-held}deg)`; peg.classList.add('kpegout'); return d; }
  // v5 WP-K3 (WP-P a): loading never moves the beam – the peg holds it where it was (at the start: tipped to the heavy side)
  function refresh() {
    drawPan(panL, st.left, 'left'); drawPan(panR, st.right, 'right'); beam.style.transform = `rotate(${-held}deg)`; peg.classList.remove('kpegout');
    if (ghosts) palette.forEach((it, k) => { const c = pal.children[k]; if (!c) return; const n = ghostLeft('left').concat(ghostLeft('right')).filter(v => sameV(v, it.v)).length;
      let bd = c.querySelector('.kbadge'); if (!bd) { bd = el('span', 'kbadge'); c.appendChild(bd); } bd.textContent = n ? '×' + n : ''; bd.style.display = n ? '' : 'none'; c.classList.toggle('kglow', n > 0); });
    (o.onChange || (() => {}))(value());
  }
  async function submit() {
    if (w.locked || w.dead) return;
    const v = value(); w.lock(true);
    const d = tilt(v); F.sfx.thud && F.sfx.thud();
    await sleep(900);
    if (w.dead) return;
    w.lock(false);
    if (d === target * -1 && check(v)) say(S, 'kit_bal_lik');
    S.submit(v, w);
  }
  w.feed = v => { st.left = left.slice(); st.right = right.slice(); ['left', 'right'].forEach(s => (v && v[s] || []).forEach(x => { if (st[s].some(it => it.fixed && sameV(it.v, x))) return; const it = palette.find(p => sameV(p.v, x)); if (it) st[s].push(Object.assign({}, it, { fixed: false })); })); refresh(); tilt(value()); return S.submit(value(), w); };
  w.rightValue = () => o.solution || null;
  w.wrongValue = () => balWrong(palette, side, left, right, wt, check);
  w.solution = () => { if (!o.solution) return; ['left', 'right'].forEach(s2 => { st[s2] = st[s2].filter(it => it.fixed); }); ghosts = { left: (o.solution.left || []).slice(), right: (o.solution.right || []).slice() }; refresh(); };
  w.solTpl = 'kit_sol_balance';
  w.hint = w.hint || (async () => { await say(S, 'kit_h_balance'); });
  w.value = value; w.pegged = () => !peg.classList.contains('kpegout'); w.angle = () => held;
  { const v0 = value(); held = degOf(v0.lw - v0.rw); }
  refresh();
  return arm(S, w, Object.assign({}, o, { check }));
}

/* ---------------------------------------------------------- S.wheels */
function wheels(S, n, o) {
  o = o || {};
  cssOnce();
  n = n || 2;
  const answer = o.answer != null ? o.answer : (S.item.target != null ? S.item.target : null);
  const check = o.check || (v => sameV(v, answer));
  defaults(S, Math.pow(10, -n), 'wheels');
  const w = widget(S, 'wheels-kit', o);
  const B = board(S, 'kwheels', { inTray: o.inTray !== false }); w.parts.push(B); w.el = B;
  const digs = new Array(n).fill(0);
  if (o.start) String(o.start).padStart(n, '0').split('').forEach((d, i) => { digs[i] = +d; });
  let sol = null;
  const ws = digs.map((_, i) => {
    const col = el('div', 'kwheel');
    const up = el('button', 'kwbtn', '▲'), dn = el('button', 'kwbtn', '▼'), d = el('div', 'kwdig');
    up.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked) return; F.sfx.click(); digs[i] = (digs[i] + 1) % 10; refresh(); });
    dn.addEventListener('click', e => { e.stopPropagation(); if (composeEarly(S)) return; if (w.locked) return; F.sfx.click(); digs[i] = (digs[i] + 9) % 10; refresh(); });
    col.appendChild(up); col.appendChild(d); col.appendChild(dn); B.appendChild(col);
    return { up, dn, d };
  });
  const ok = button(S, '✓', () => submit(), 'kok'); w.parts.push(ok);
  const value = () => +digs.join('');
  function refresh() {
    ws.forEach((x, i) => { x.d.textContent = String(digs[i]); x.up.classList.remove('kglow'); x.dn.classList.remove('kglow'); });
    if (sol) { const sd = String(sol).padStart(n, '0'); const i = digs.findIndex((d, k) => d !== +sd[k]); if (i >= 0) { const up = (+sd[i] - digs[i] + 10) % 10 <= 5; ws[i][up ? 'up' : 'dn'].classList.add('kglow'); } else ok.classList.add('kglow'); }
    (o.onChange || (() => {}))(value());
  }
  function submit() { if (w.locked || w.dead) return; S.submit(value(), w); }
  w.feed = v => { String(v).padStart(n, '0').slice(-n).split('').forEach((d, i) => { digs[i] = +d; }); refresh(); return S.submit(value(), w); };
  w.rightValue = () => answer;
  w.wrongValue = () => (+answer + 1) % Math.pow(10, n);
  w.solution = () => { sol = answer; refresh(); };
  w.helpStep = async () => { if (answer == null) return false; const sd = String(answer).padStart(n, '0'); const i = digs.findIndex((d, k) => d !== +sd[k]); if (i < 0 || i === n - 1) return false; digs[i] = +sd[i]; refresh(); return true; };   // never the last digit
  w.solTpl = 'kit_sol_wheels';
  w.value = value;
  refresh();
  return arm(S, w, Object.assign({}, o, { check }));
}

/* ---------------------------------------------------------- S.twoStep / S.ribbons */
// v5 WP-K3 (WP-P f): an explicit item.g / item.mode (the generator's, or the format's setG before the call) is never overwritten. While
// the steps run, each step's widget sets its own default g (the think-gate and the rapid-guess check follow the step really shown);
// at the end the explicit g / mode come back – else g = g1·g2 and mode 'twostep' as before.
async function twoStep(S, a, b) {
  const it = S.item;
  const gFix = it.g != null && !it._gAuto ? it.g : null, mFix = it.mode != null && !it._modeAuto ? it.mode : null;
  if (gFix != null) it._gAuto = true;
  let r1, r2, g1 = null, g2 = null;
  try {
    r1 = await a(S);
    g1 = it.g;
    if (S.clearKit) S.clearKit();
    if (S.clearHint) S.clearHint();          // v5 (playtest2): step 1's hint plaques never stay into step 2
    it._gAuto = true;
    r2 = await b(S, r1);
    g2 = it.g;
  } finally {
    if (gFix != null) { it.g = gFix; it._gAuto = false; }
    else if (it._gAuto && g1 != null && g2 != null) it.g = g1 * g2;
    if (mFix != null) { it.mode = mFix; it._modeAuto = false; } else { it.mode = 'twostep'; it._modeAuto = true; }
  }
  return [r1, r2];
}
function ribbons(S, o) {
  o = o || {};
  cssOnce();
  // v5 WP-K3 (WP-P e): layout 'pw' (part-whole, or o.whole given): the whole bar on top (known value or «?»), the parts side by side
  // under it (segments by value); o.braces [{id, span:[i0, i1], label?}] = extra braces under the parts – distractors unless asked
  const pw = o.layout === 'pw' || !!o.whole;
  const bars = o.bars || [];
  const sumOf = list => list.reduce((a, b) => a + (+b.value || 0), 0);
  const whole = pw ? Object.assign({ name: '', known: true }, o.whole || {}) : null;
  if (whole && whole.value == null) whole.value = sumOf(bars);
  const braces = (o.braces || []).map((b, k) => ({ id: String(b.id != null ? b.id : 'br' + k), span: (b.span || [0, bars.length - 1]).map(Number), label: b.label }));
  const braceOf = id => braces.find(b => b.id === String(id));
  const allBr0 = br => !!br && br.span[0] <= 0 && br.span[1] >= bars.length - 1;
  const spanSum = br => sumOf(bars.slice(br.span[0], br.span[1] + 1));
  const ask = o.ask != null ? o.ask : pw && !whole.known ? 'total' : bars.findIndex(b => !b.known);
  const total = pw ? +whole.value : sumOf(bars);
  const diff = bars.length >= 2 ? Math.abs((+bars[0].value || 0) - (+bars[1].value || 0)) : 0;
  const answer = o.answer != null ? o.answer : ask === 'total' ? total : ask === 'diff' ? diff : braceOf(ask) ? spanSum(braceOf(ask)) : (bars[ask] ? bars[ask].value : null);
  const maxV = Math.max(1, ...bars.map(b => +b.value || 0), o.stack ? total : 0);
  const B = board(S, 'kribbons' + (pw ? ' kribpw' : ''), { inTray: false }); (S.kitKeep = S.kitKeep || []).push(B);
  const unitsOf = v => Math.max(1, v <= 20 ? v : Math.round(v / 10));   // the bar is split into units (tens above 20)
  let wbar = null;
  const rows = pw ? (() => {
    const wr = el('div', 'kribrow kribwhole'); wr.appendChild(el('div', 'kribname', caseT(whole.name || '')));
    wbar = el('button', 'kribbon kribtotal'); wbar.style.width = '100%'; if (whole.color) wbar.style.background = whole.color;
    wbar.appendChild(el('span', 'kribv', whole.known ? String(whole.value) : '?'));
    if (o.units !== false) wbar.style.setProperty('--units', unitsOf(+whole.value || 0));
    wr.appendChild(wbar); B.appendChild(wr);
    const pr = el('div', 'kribrow kribparts'); pr.appendChild(el('div', 'kribname', '')); const segs = el('div', 'kribsegs'); pr.appendChild(segs); B.appendChild(pr);
    const out = bars.map((b, i) => {
      const bar = el('button', 'kribbon kribseg'); bar.style.flex = Math.max(0.6, +b.value || 1) + ' 1 0'; if (b.color) bar.style.background = b.color;
      if (b.name) bar.appendChild(el('span', 'kribpn', caseT(b.name)));
      bar.appendChild(el('span', 'kribv', b.known ? String(b.value) : '?'));
      if (o.units !== false) bar.style.setProperty('--units', unitsOf(+b.value || 0));
      segs.appendChild(bar); return { r: pr, bar, b, i, cur: 0 };
    });
    braces.forEach(br => {
      const row = el('div', 'kribrow kribbrace'); row.appendChild(el('div', 'kribname', '')); const sg = el('div', 'kribsegs'); row.appendChild(sg);
      const fl = list => Math.max(0.0001, list.reduce((a, b) => a + Math.max(0.6, +b.value || 1), 0));
      const pre = bars.slice(0, br.span[0]), mid = bars.slice(br.span[0], br.span[1] + 1), post = bars.slice(br.span[1] + 1);
      if (pre.length) { const sp = el('span', 'kribgap'); sp.style.flex = fl(pre) + ' 1 0'; sg.appendChild(sp); }
      const bt = el('button', 'kribbr'); bt.style.flex = fl(mid) + ' 1 0'; bt.appendChild(el('span', 'kribv', br.label != null ? String(br.label) : '?')); sg.appendChild(bt); br.el = bt;
      if (post.length) { const sp = el('span', 'kribgap'); sp.style.flex = fl(post) + ' 1 0'; sg.appendChild(sp); }
      B.appendChild(row);
    });
    return out;
  })() : bars.map((b, i) => {
    const r = el('div', 'kribrow'); r.appendChild(el('div', 'kribname', caseT(b.name || '')));
    const bar = el('button', 'kribbon' + (b.build ? ' kbuild kempty' : '')); bar.style.width = b.build ? '0%' : Math.max(8, (+b.value || 0) / maxV * 100) + '%'; if (b.color) bar.style.background = b.color;
    bar.appendChild(el('span', 'kribv', b.known && !b.build ? String(b.value) : ''));
    if (!b.build && o.units !== false) bar.style.setProperty('--units', unitsOf(+b.value || 0));
    r.appendChild(bar); B.appendChild(r); return { r, bar, b, i, cur: 0 };
  });
  // step 0 (optional, 'cmp' layout): she BUILDS the bars of the story's known quantities (+10 / +1 / −1), then tags the «?», then the keypad
  const builds = pw ? [] : rows.filter(x => x.b.build);
  const buildStep = () => {
    const w = widget(S, 'ribbon-build', o);
    defaults(S, 0.01, 'ribbon');
    let cur = builds[0], sol = false;
    const setW = x => { x.bar.style.width = Math.max(x.cur ? 4 : 0, x.cur / maxV * 100) + '%'; x.bar.style.setProperty('--units', Math.max(1, x.cur <= 20 ? x.cur : Math.round(x.cur / 10))); x.bar.classList.toggle('kempty', !x.cur); x.bar.querySelector('.kribv').textContent = x.cur ? String(x.cur) : ''; };
    const pick = x => { cur = x; builds.forEach(y => y.bar.classList.toggle('ksel', y === x)); };
    builds.forEach(x => x.bar.addEventListener('click', e => { e.stopPropagation(); if (w.dead || w.locked) return; F.sfx.click(); pick(x); }));
    pick(cur);
    const add = d => () => { if (composeEarly(S)) return; if (w.dead || w.locked || !cur) return; cur.cur = Math.max(0, Math.min(maxV * 1.5, cur.cur + d)); F.sfx.pling && F.sfx.pling(cur.cur % 10); setW(cur); };
    w.parts.push(button(S, '+10', add(10), 'ksmallbtn'), button(S, '+1', add(1), 'ksmallbtn'), button(S, '−1', add(-1), 'ksmallbtn'));
    const done = button(S, o.done || FERDIG(), () => { if (!w.dead && !w.locked) S.submit(builds.map(x => x.cur), w); }, 'kdone'); w.parts.push(done);
    w.feed = v => { builds.forEach((x, k) => { x.cur = +((v || [])[k]) || 0; setW(x); }); return S.submit(builds.map(x => x.cur), w); };
    w.rightValue = () => builds.map(x => +x.b.value);
    w.wrongValue = () => builds.map(x => +x.b.value + 1);
    w.solution = () => { sol = true; builds.forEach(x => { x.bar.style.outline = '4px dashed #e0a91e'; x.bar.title = String(x.b.value); }); const x = builds.find(y => y.cur !== +y.b.value); if (x) pick(x); };
    w.mark = (v, cls) => builds.forEach(x => { x.bar.classList.remove('kright', 'kwrong'); void x.bar.offsetWidth; x.bar.classList.add(cls === 'right' ? 'kright' : 'kwrong'); });
    w.onDestroy = () => builds.forEach(x => { x.bar.classList.remove('ksel', 'kright', 'kwrong'); x.bar.style.outline = ''; });
    w.solTpl = 'kit_sol_ribbon';
    w.hint = async () => { await say(S, 'kit_h_ribbon'); };
    void sol;
    return arm(S, w, { check: v => Array.isArray(v) && builds.every((x, k) => +v[k] === +x.b.value) });
  };
  // the brace parts she can tag: each unknown/known bar, the total (stacked), the difference (two bars)
  // pw: the whole bar is the «total» part, the braces join, ↔ only when o.allowDiff === true
  const parts = rows.map(x => ({ id: x.i, el: x.bar }));
  if (pw) { parts.push({ id: 'total', el: wbar }); braces.forEach(br => parts.push({ id: br.id, el: br.el })); }
  const ctl = el('div', 'kribctl'); B.appendChild(ctl);
  if (bars.length >= 2 && (pw ? o.allowDiff === true : o.allowDiff !== false)) { const dEl = el('button', 'kribdiff', '↔'); ctl.appendChild(dEl); parts.push({ id: 'diff', el: dEl }); }
  if (!pw && o.allowTotal !== false) { const tEl = el('button', 'kribtot', '{ }'); ctl.appendChild(tEl); parts.push({ id: 'total', el: tEl }); }
  if (!ctl.children.length) ctl.style.display = 'none';
  if (builds.length) ctl.style.visibility = 'hidden';
  const tagStep = () => {
    ctl.style.visibility = '';
    const w = widget(S, 'ribbon-tag', o);
    defaults(S, 1 / parts.length, 'ribbon');
    let sol = false;
    parts.forEach(p => p.el.addEventListener('click', e => {
      e.stopPropagation();
      if (w.locked || w.dead) return; F.sfx.click();          // natural audit D6: an early tag is kept (judged at the gate)
      parts.forEach(q => q.el.classList.toggle('ktag', q === p));
      S.submit(p.id, w);
    }));
    w.feed = v => S.submit(v, w);
    w.rightValue = () => ask; w.wrongValue = () => parts.find(p => String(p.id) !== String(ask) && !(pw && ((String(ask) === 'total' && allBr0(braceOf(p.id))) || (String(p.id) === 'total' && allBr0(braceOf(ask)))))).id;
    w.solution = () => { sol = true; parts.forEach(p => p.el.classList.toggle('kglow', String(p.id) === String(ask))); };
    w.mark = (v, cls) => { const p = parts.find(q => String(q.id) === String(v)); if (p) { p.el.classList.remove('kright', 'kwrong'); void p.el.offsetWidth; p.el.classList.add(cls === 'right' ? 'kright' : 'kwrong'); } };
    w.solTpl = 'kit_sol_ribbon';
    w.hint = async () => { await say(S, 'kit_h_ribbon'); };
    void sol;
    say(S, 'kit_rib_tag');
    // pw: a brace over ALL the parts IS the whole – it counts as the same answer as the whole bar (and the other way round)
    const sameTag = (v, a) => String(v) === String(a) || (pw && ((String(a) === 'total' && allBr0(braceOf(v))) || (String(v) === 'total' && allBr0(braceOf(a)))));
    return arm(S, w, { answer: ask, check: v => sameTag(v, ask) });
  };
  // v5 (playtest2): the keypad step has its own structural hint – never the stage's number hint (it would count to the answer)
  const keyStep = () => { say(S, 'kit_rib_tall'); const p = S.keypad({ answer }); if (S.active) { S.active.hint = S.active.preHint = async () => { await say(S, 'kit_h_ribbon'); }; } return p; };
  const chain = builds.length ? twoStep(S, buildStep, () => twoStep(S, tagStep, keyStep).then(r => r[1])).then(r => [r[0], r[1]]) : twoStep(S, tagStep, keyStep);
  return chain.then(r => {
    parts.forEach(p => p.el.classList.remove('kglow', 'ktag'));
    rows.forEach(x => { if (!x.b.known && (ask === x.i)) x.bar.querySelector('.kribv').textContent = String(x.b.value); });
    if (pw && ask === 'total' && wbar) wbar.querySelector('.kribv').textContent = String(total);
    const br = braceOf(ask); if (br && br.el) br.el.querySelector('.kribv').textContent = String(spanSum(br));
    return r[1];
  });
}

/* ---------------------------------------------------------- install into S */
function install(S, item) {
  S.kitBoard = (cls, o) => board(S, cls, o);
  S.kitButton = (label, fn, cls) => button(S, label, fn, cls);
  S.kitFace = face;
  // remove the kit widgets of the previous step (a twoStep), keep boards listed in S.kitKeep
  S.clearKit = () => { S.widgets.forEach(w => { if (w && w.kit && !w.dead) w.destroy(); }); };
  S.tapAll = (items, o) => tapAll(S, items, o);
  S.order = (items, o) => order(S, items, o);
  S.sortAll = (items, bins, o) => sortAll(S, items, bins, o);
  S.stones = o => stones(S, o);
  S.line = o => line(S, o);
  S.lineShow = o => lineShow(S, o);
  S.grid = o => grid(S, o);
  S.vox = o => vox(S, o);
  S.voxShow = (hts, o) => voxShow(S, hts, o);
  S.balance = o => balance(S, o);
  S.ribbons = o => ribbons(S, o);
  S.wheels = (n, o) => wheels(S, n, o);
  S.twoStep = (a, b) => twoStep(S, a, b);
  void item;
}
if (!kits.includes(install)) kits.push(install);
F.Kit = { install, face, isoSVG, setEq, seqEq, version: 2,
  widgets: ['tapAll', 'order', 'sortAll', 'stones', 'line', 'lineShow', 'grid', 'vox', 'voxShow', 'balance', 'ribbons', 'twoStep', 'wheels'] };
})();
