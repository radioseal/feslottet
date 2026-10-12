/* Feslottet – first-run onboarding: day 1, step by step (clarity plan 12.10. §3.7 O + §4). The first minutes of a brand-new save,
   for a 6-year-old who reads no instructions. The world shows; Puff says one short line per step and nothing to close with.
     hello  a big Puff floats in: «Hei! Jeg er Puff, skyen din.» and settles in its corner
     fly    the hand on the door: «Trykk på døra, så flyr du ut!» (skipped when she is already outside); out → the castle glance and the
            light of a kingdom she has not found (tower.js)
     press  the flower bed by the door glows: «Se på blomstene! Trykk på dem!» → after her first press of anything: «Alt du trykker på
            gjør noe morsomt!» (the open-world message, shown by what just happened; a press in her tower before going out says it
            there, when calm, and the flower step is skipped)
     wand   the hand on Staven → a guided spell bar («Skriv sol!», the next key glows) → a real sun → «Se! Ordet ble til en ting!»
     post   'dayStart' → Pip brings the king's letter to the mailbox → «Du har post! Trykk på postkassa.» → the envelope (its line only
            when she has not gone for it within 4 s of seeing the hand) → the card (the word, then the king's own voice) → after
            that the hand on ✓, silent → the goal card
     puff   the hand on Puff, Puff glows: «Trykk på meg, så viser jeg vei!» → HER tap is Puff's real answer (where to fly + the clouds)
   Not a step: a coin glints on the path in front of the tower. A tap → 12 coins fly from it into the purse; untapped it stays a find.
   Timing: fly, the mailbox and the envelope repeat once at 20 s and Puff does it at 40 s (never blocks; the clock stands still while
   someone talks, a panel is open or she walks). press, wand and puff never repeat by themselves and end quietly after ~30 s. A tap
   on Puff during a step = the step's line once more (her question).
   Doing a thing on her own before she is asked (going out, pressing, casting, opening the mailbox / the letter, tapping Puff) skips it.
   F.save.onb = {done, step: <step name>, post, coin: 'out'|'taken'}. A reload mid-way resumes at the saved step (old saves stored the
   step's index into hello,fly,press,wand,purse,post: mapped by name, purse → post).
   F.Onboard = { needed(), run({dayStart}) -> Promise, active, step, puff() -> bool, wandTap() -> bool, skip() } */
(function () {
'use strict';
const F = window.F;
const U = F.U;
const V3 = THREE.Vector3;
const O = F.Onboard = { active: false, step: null };
const S = () => (F.save.onb = F.save.onb || { done: false, step: 0 });
const WORDS = ['sol', 'bil', 'hus', 'ost'];
const STEPS = ['hello', 'fly', 'press', 'wand', 'post', 'puff'];
const OLD_STEPS = ['hello', 'fly', 'press', 'wand', 'purse', 'post'];      // saves before 12.10. stored an index into this list
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

O.needed = () => !F.flags.skip && !F.flags.collect && !S().done && (F.save.day || 1) <= 1;
// where a save resumes: the step's name (an old numeric step is mapped through OLD_STEPS; the retired purse step → the post)
function startIndex(s) {
  let n = s.step;
  if (typeof n === 'number') n = n >= OLD_STEPS.length ? 'puff' : OLD_STEPS[Math.max(0, n | 0)];
  if (n === 'purse') n = 'post';
  const i = STEPS.indexOf(n);
  return i < 0 ? 0 : i;
}
O._startIndex = startIndex;

/* ------------------------------------------------------------ what she has done on her own since the onboarding began */
const did = { moved: 0, pressed: 0, cast: 0, env: 0, mail: 0, puff: 0 };
let goalOpen = false;       // the letter is read and closed: from now on her tap on Puff is Puff's real answer (the puff step is done)
let pressOk = false;        // «Alt du trykker på gjør noe morsomt!» has been said (once per onboarding)
let pressOkTry = false;     // …an attempt is waiting for a calm moment
let lastTap = null;         // {type, t}: the thing she tapped last (a tap walks her there first; 'press' comes when she arrives)
F.on('goTo', () => { if (O.active) did.moved++; });
F.on('worldClick', hit => { if (O.active && hit && hit.thing) lastTap = { type: hit.thing.type, t: F.T.now }; });
// she tapped a thing of this type a moment ago and is on her way to it (no «tap it» over her own tap)
const goingTo = (type, sec) => !!(lastTap && lastTap.type === type && F.T.now - lastTap.t < (sec || 6) && (F.Player.moving || F.T.now - lastTap.t < 1));
const NOT_PRESS = new Set(['h_tarn', 'h_utdor', 'h_tarndor', 'b_dor', 'b_portal', 'b_utskilt', 'b_utpil', 'h_postkasse', 'h_mynt', 'c_heis']);   // doors (v3 WP1: also the UT sign / way-out signs), the mailbox, the coin: other steps
F.on('press', th => {
  if (!O.active || !th) return;
  if (th.type === 'life_brev') { did.env++; return; }
  if (NOT_PRESS.has(th.type)) return;
  did.pressed++;
  // her first press of anything before the flower step (e.g. a thing in her tower): the open-world message comes with it, so the
  // flower step can be skipped without losing it (clarity §4 step 4: «after her first press of anything»)
  if (!pressOk && (O.step === 'hello' || O.step === 'fly')) earlyPressOk();
});
async function earlyPressOk() {
  if (pressOkTry || pressOk) return;
  pressOkTry = true;
  try {
    const sp = F.Space.cur;
    await F.T.sleep(1600);                                     // the thing she pressed is still reacting
    for (let k = 0; k < 12 && F.Speech.busy(); k++) await F.T.sleep(250);
    // only when calm: no other line, panel, task or camera glance, and she is still where she pressed (a busy moment: the next press tries)
    if (!O.active || pressOk || F.Speech.busy() || mine || F.Space.cur !== sp || TW().looking || F.R.cam.look || F.UI.isOpen() || F.Task.current) return;
    pressOk = true;
    await say('onb_press_ok');
  } finally { pressOkTry = false; }
}
F.on('cast', () => { if (O.active) did.cast++; });
F.on('mailboxOpen', () => { if (O.active) did.mail++; });
F.on('puffTap', () => { if (O.active && goalOpen) did.puff++; });
F.on('puffAnswer', () => { if (O.active && goalOpen) did.puff++; });          // (clarity §3.0: the goal card's tap answers like Puff)

/* ------------------------------------------------------------ the tapping hand (HTML, follows a 3D point or a HUD element) */
const HAND = `<svg viewBox="0 0 80 104" width="100%" height="100%"><defs><linearGradient id="onbHandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f3ecff"/></linearGradient></defs>
  <path d="M24 46 L24 10 C24 3 36 3 36 10 L36 40 C37 35 47 35 48 41 L48 44 C49 39 59 39 60 45 L60 48 C61 43 71 44 71 50 L71 70 C71 86 61 96 46 96 L38 96 C27 96 21 90 16 81 L7 64 C4 58 11 52 17 57 L24 64 Z"
    fill="url(#onbHandG)" stroke="#7d5fd0" stroke-width="4" stroke-linejoin="round"/>
  <path d="M36 40 L36 52 M48 44 L48 54 M60 48 L60 56" stroke="#c9b6f2" stroke-width="3" stroke-linecap="round"/>
  <rect x="29" y="94" width="38" height="9" rx="4.5" fill="#ff8dbd" stroke="#7d5fd0" stroke-width="3"/>
  <circle cx="30" cy="12" r="3.2" fill="#fff6c0"/></svg>`;
let hand = null, ring = null, handTo = null;
function ensureHand() {
  if (hand) return;
  ring = el('div', 'onb-ring'); document.body.appendChild(ring);
  hand = el('div', 'onb-hand', '<div class="tap">' + HAND + '</div>'); document.body.appendChild(hand);
}
// to: {thing} | {pos: Vector3} | {el: Element} | {sel: string} | null
function point(to) {
  ensureHand();
  handTo = to || null;
  hand.classList.toggle('on', !!to); ring.classList.toggle('on', !!to);
  if (to) place();
}
const pv = new V3();
function targetXY() {
  const t = handTo; if (!t) return null;
  if (t.sel || t.el) {
    const e = t.el && t.el.isConnected ? t.el : (t.sel ? document.querySelector(t.sel) : null);
    if (!e) return null;
    const r = e.getBoundingClientRect(); if (!r.width) return null;
    return { x: r.left + r.width * (t.fx != null ? t.fx : 0.5), y: r.top + r.height * (t.fy != null ? t.fy : 0.5) };
  }
  if (t.thing) { if (!t.thing.obj || t.thing.space !== F.Space.cur) return null; const s = F.Input.screenOf(t.thing); return s.onScreen ? s : null; }
  if (t.pos) {
    if (t.space && t.space !== F.Space.cur) return null;
    pv.copy(t.pos).project(F.R.camera);
    if (Math.abs(pv.x) > 1 || Math.abs(pv.y) > 1 || pv.z > 1) return null;
    const r = F.R.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (pv.x + 1) / 2 * r.width, y: r.top + (1 - pv.y) / 2 * r.height };
  }
  return null;
}
function place() {
  if (!hand || !handTo) return;
  const p = targetXY();
  // a panel of someone else's covers the world: a hand on a 3D thing behind it would only confuse
  const covered = (!handTo.sel && !handTo.el && F.UI.isOpen() && !guided) || (!handTo.sel && !handTo.el && F.R.cam.look);   // a panel or the castle glance
  if (!p || covered) { hand.style.visibility = 'hidden'; ring.style.visibility = 'hidden'; return; }
  hand.style.visibility = ''; ring.style.visibility = '';
  const dir = handTo.dir || (p.y > innerHeight * 0.55 ? 'down' : 'up');   // near the bottom: the hand comes from above
  hand.classList.toggle('down', dir === 'down'); hand.classList.toggle('left', dir === 'left');
  hand.style.left = p.x.toFixed(1) + 'px'; hand.style.top = p.y.toFixed(1) + 'px';
  ring.style.left = p.x.toFixed(1) + 'px'; ring.style.top = p.y.toFixed(1) + 'px';
}
F.on('preRender', place);
O._handXY = () => (hand && handTo ? targetXY() : null);
const handShown = () => !!(hand && handTo && hand.classList.contains('on') && hand.style.visibility !== 'hidden');

/* ------------------------------------------------------------ a glowing ring on the floor (fly target) */
function floorMark(x, z) {
  const sc = F.Space.scene(), y = F.Space.heightAt(x, z) + 0.06;
  const g = new THREE.Group(); g.position.set(x, y, z);
  const mk = (geo, col, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.raycast = () => {}; g.add(m); return m; };
  const a = mk(new THREE.RingGeometry(0.5, 0.68, 48), 0xffe066, 0.95), b = mk(new THREE.CircleGeometry(0.5, 40), 0xfff6c0, 0.35), c = mk(new THREE.RingGeometry(0.78, 0.86, 48), 0xff9ccf, 0.7);
  sc.add(g);
  let alive = true, acc = 0;
  const off = F.on('tick', dt => {
    const t = F.T.now; a.scale.setScalar(1 + Math.sin(t * 4) * 0.08); c.scale.setScalar(1 + ((t * 0.8) % 1) * 0.6); c.material.opacity = 0.7 * (1 - ((t * 0.8) % 1));
    acc += dt; if (acc > 0.9) { acc = 0; F.FX.burst(new V3(x, y + 0.2, z), { n: 6, colors: [0xffe066, 0xffffff, 0xff9ccf], speed: 0.5, up: 1.2, life: 1.1, size: 0.08, gravity: 0.5 }); }
  });
  return { pos: new V3(x, y, z), remove() { if (!alive) return; alive = false; off(); if (g.parent) g.parent.remove(g); g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); } };
}

/* ------------------------------------------------------------ the big Puff that says hello and settles in its corner */
async function bigPuff() {
  const H = F.HUD;
  const b = el('div', 'onb-puff', '<div class="glow"></div>' + H.ICON.puff);
  document.body.appendChild(b);
  const talk = F.on('subtitle', (text, voice) => b.classList.toggle('talk', !!text && !voice));
  void b.offsetWidth; b.classList.add('in');
  F.sfx.chime(); F.T.timeout(() => F.sfx.sparkle(), 350);
  await F.T.sleep(700);
  await say('onb_hello');                       // one line only: the first «do this» comes within seconds (review: start flow)
  // fly into the Puff button
  const r = H.puff.getBoundingClientRect(), br = b.getBoundingClientRect();
  b.style.setProperty('--tx', (r.left + r.width / 2 - (br.left + br.width / 2)).toFixed(0) + 'px');
  b.style.setProperty('--ty', (r.top + r.height / 2 - (br.top + br.height / 2)).toFixed(0) + 'px');
  b.style.setProperty('--ts', (r.width / br.width).toFixed(3));
  b.classList.add('home'); F.sfx.whoosh();
  await F.T.sleep(750);
  talk(); b.remove();
  H.puff.classList.remove('onb-pop'); void H.puff.offsetWidth; H.puff.classList.add('onb-pop');
  F.sfx.pop();
}

/* ------------------------------------------------------------ step runner: wait for her, (repeat once, then do it for her) */
let cur = null;           // {again, doIt} of the step that is running (her Puff tap = the step's line once more)
let mine = false;                                   // Puff (the onboarding) is talking right now
const say = async (id, slots) => { if (!F.TPL.has(id)) return; mine = true; try { await F.SAY(id, slots); } finally { mine = false; } };
const T1 = 20, T2 = 40;                             // clarity §3.7: one repeat at 20 s, Puff does it at 40 s (fly, mailbox, envelope only)
async function waitStep(o) {
  // o: {done() -> bool, again() (the step's line once more), repeat (say again() once at t1 by itself), doIt() (Puff does it at t2),
  //     quiet (doIt without «Jeg viser deg!»), t1, t2, max (the step ends quietly), panelOk}
  const t1 = o.t1 || T1, t2 = o.t2 || T2, max = o.max || 90;
  let waited = 0, reminded = false, helped = false;
  cur = o;
  while (O.active) {
    if (o.done()) break;
    await F.T.sleep(250);
    // the clock only runs while she could act (no speech, task, panel or screen in the way)
    // (nor while she walks somewhere: she is doing something – often the very thing, on her way to it)
    const blocked = F.Task.current || (F.Shell && F.Shell.screen) || (!o.panelOk && F.UI.isOpen()) || mine || F.Player.moving;
    if (!blocked) waited += 0.25;
    if (o.done()) break;                                           // she did it during the wait: no late reminder
    if (o.repeat && o.again && !reminded && waited >= t1 && !F.Speech.busy()) { reminded = true; o.again(); }   // (never over someone else's line)
    if (!helped && waited >= t2 && o.doIt) { helped = true; if (!o.quiet) await say('onb_doit'); try { await o.doIt(); } catch (e) { console.error('[onb] doIt', e); } }
    if (waited >= max) break;
  }
  cur = null;
  return o.done();
}
// «Trykk på meg, så viser jeg vei!» gives way to her tap: Puff's real answer (HUD answer(): it speaks only when speech is free).
// Only that sentence itself is cut (the sentence playing now is its text): a real clip through its own end handler (the queue goes
// on), a silent placeholder (no clip yet / sound off) is dropped and the queue goes on. The step stops waiting for it either way.
let puffCut = null;
async function sayCuttable(id) {
  if (!F.TPL.has(id)) return;
  mine = true;
  try { await Promise.race([F.SAY(id), new Promise(r => { puffCut = r; })]); } finally { mine = false; puffCut = null; }
}
function cutPuffLine() {
  const SP = F.Speech, c = SP.cur, last = SP.trace && SP.trace[SP.trace.length - 1];
  const spec = F.TPL.all && F.TPL.all.onb_puff, txt = spec && spec.text ? String(spec.text[0]) : '';
  try {
    if (c && last && txt && last.s && txt.includes(String(last.s).trim())) {
      if (typeof c.pause === 'function' && typeof c.onended === 'function') { c.pause(); c.onended(); }
      else if (c.fake && typeof SP.next === 'function') { SP.cur = null; SP.next(); }   // (its timer then finds itself replaced: no-op)
    }
  } catch (e) { console.error('[onb] cut', e); }
  if (puffCut) puffCut();
}
O.puff = function () {
  if (!O.active) return false;
  if (goalOpen) {
    // the letter is read: her tap is Puff's real answer (where to fly + the clouds). The Puff step's own line gives way to it.
    if (puffCut && O.step === 'puff') cutPuffLine();
    return false;
  }
  if (cur && cur.again) { if (!F.Speech.busy()) cur.again(); return true; }
  return true;                                   // between steps: Puff just pops
};

/* ------------------------------------------------------------ the steps */
const FET = { fly: [7, 9.0], bamse: [4.0, 4.0] };   // local room coords (0..14 × 0..10); fly = in front of the exit
const TW = () => F.Tower || {};
function inTower() { return TW().inside ? TW().inside() : (F.Space.cur === 'in' && F.Castle.cur === 'fetarn'); }
function roomXZ(lx, lz) { if (TW().toWorld) return TW().toWorld('fetarn', lx, lz); const r = F.Castle.rooms && F.Castle.rooms.fetarn; if (!r || !r.bounds) return null; return { x: r.bounds.x0 + lx, z: (r.bounds.z0 || 0) + lz }; }
const near = (th, r) => th && th.space === F.Space.cur && Math.hypot(th.x - F.Player.pos.x, th.z - F.Player.pos.z) < r;

// the teddy in her tower (spawned once per boot; it is also simply a nice thing to hug)
function teddy() { return F.Things.byId('shell_fetarn_bamse'); }
F.on('castleReady', () => {
  try {
    if (!F.Castle.kit || !F.Castle.kit.spawnIn || !F.Things.defs.bamse || teddy() || (TW().real && TW().real())) return;
    F.Castle.kit.spawnIn('fetarn', 'bamse', FET.bamse[0], FET.bamse[1], { id: 'shell_fetarn_bamse', ry: 0.5 });
  } catch (e) { console.error('[onb] teddy', e); }
});

async function stepFly() {
  if (!inTower()) return true;                                  // she is already outside
  // the way out: WP1's exit portal (b_portal) or the legacy arch (h_utdor); the hand points at its top (the floor at the open front
  // is below the screen edge when she stands by the bed)
  const portal = F.Things.list.find(t => t.space === 'in' && ((t.type === 'b_portal' && (!t.data || !t.data.bld || t.data.bld === 'tarn')) || t.type === 'h_utdor'));
  const p = (TW().exitPos && TW().exitPos()) || roomXZ(FET.fly[0], FET.fly[1]); if (!p && !portal) return true;
  const mark = p ? floorMark(p.x, p.z - 0.3) : null;
  const top = portal ? new V3(portal.x, (portal.y || 0) + 2.3, portal.z) : mark.pos.clone();
  // v3 WP1 (DESIGN3 §4.3/4.5): the hand points at the tall UT sign beside the mat while it is on screen (above the bottom HUD),
  // otherwise at the HUD «UT» button (always visible indoors); the old arch-top point is the last fallback
  const sign = F.Things.list.find(t => t.space === 'in' && t.type === 'b_utskilt' && t.data && t.data.bld === 'tarn');
  const doorTo = () => {
    if (sign && sign.obj && sign.space === F.Space.cur) { const s = F.Input.screenOf(sign); if (s.onScreen && s.y < innerHeight - 150 && s.y > 110) return { thing: sign, k: 'sign' }; }
    const btn = document.querySelector('#bldUt.on'); if (btn) return { el: btn, k: 'btn' };
    return { pos: top, space: 'in', k: 'top' };
  };
  let dk = null, dAcc = 0;
  const repoint = () => { if (!inTower()) return; const t = doorTo(); if (t.k !== dk) { dk = t.k; point(t); } };
  repoint();
  const offDoor = F.on('tick', dt => { dAcc += dt; if (dAcc < 0.5) return; dAcc = 0; if (handTo && dk) repoint(); });
  await say('home_onb_dor');
  await waitStep({
    done: () => !inTower() || !O.active,
    again: () => say('onb_fly_again'), repeat: true,
    doIt: async () => { if (portal) await F.Things.press(portal); else { await F.Player.goTo(p.x, p.z - 0.3); if (inTower() && TW().goOut) await TW().goOut(); } },
  });
  if (typeof offDoor === 'function') offDoor();
  point(null); if (mark) mark.remove();
  // the castle glance (F.Tower.firstExitLook: the castle, then a kingdom's light) plays first; it starts when the dip out ends.
  // No praise for walking out (clarity §3.7: onb_fly_ok is gone) – the open sky and the castle are the reward.
  for (let k = 0; k < 12 && O.active && !(F.save.today && F.save.today.towerOut); k++) await F.T.sleep(250);
  for (let k = 0; k < 64 && O.active && (TW().looking || F.R.cam.look || F.Space.cur !== 'out'); k++) await F.T.sleep(250);
  for (let k = 0; k < 16 && F.Speech.busy(); k++) await F.T.sleep(250);
  return true;
}
// the flower bed by the tower door (park.js 'p_blomster_tarn'); inside the tower (no way out) the teddy is the fallback
function pressTarget() {
  const fb = F.Things.byId('p_blomster_tarn');
  if (fb && F.Space.cur === 'out' && near(fb, 30)) return { th: fb, line: 'home_onb_blomst', again: 'home_onb_blomst_again' };
  return null;                                                 // not by the tower: the step is skipped (pressing is shown later anyway)
}
async function stepPress() {
  // she pressed something on her own already and heard what it means: nothing to teach (a press whose line found no calm moment: the
  // flowers still show it)
  for (let k = 0; k < 16 && pressOkTry; k++) await F.T.sleep(250);
  if (did.pressed && pressOk) return true;
  const tg = pressTarget(); if (!tg) return true;
  const th = tg.th;
  const glow = F.FX.glow(th.obj, { color: 0xfff0a0, size: 2.6, ms: 0 });
  const p0 = did.pressed;
  point({ thing: th });
  await say(tg.line);
  // no repeat and no «I'll do it»: pressing is hers to discover; untouched, the glow and the hand go away after ~26 s
  await waitStep({ done: () => did.pressed > p0 || !O.active, again: () => say(tg.again), max: 26 });
  point(null); glow.remove();
  if (!O.active || did.pressed <= p0) return true;
  // after her first press of anything: the open-world message, while the thing she pressed is still reacting
  if (pressOk) return true;                                    // (said with an earlier press of hers)
  await F.T.sleep(1600);                                      // the butterflies fly up
  for (let k = 0; k < 12 && F.Speech.busy(); k++) await F.T.sleep(250);
  pressOk = true;
  await say('onb_press_ok');
  return true;
}
// the guided spell bar: ghost letters, the next key glows, only the right letter sticks
let guided = null;
function word() { return WORDS.find(w => F.Wand.castable && F.Wand.castable(w)) || null; }
async function stepWand() {
  if (did.cast) return true;
  const w = word();
  if (!w || !F.Wand.open) return true;
  document.body.classList.add('onb-wand');
  let opened = false;
  O.wandTap = () => { if (opened || guided) return true; opened = true; point(null); openGuided(w); return true; };
  point({ el: F.HUD.wand, fx: 0.9, fy: 0.5, dir: 'left' });
  await say('onb_wand');
  // no repeat and no «I'll do it» on the wand tap: untouched, the hand and the wand's pulse go away after ~26 s (she finds it later)
  await waitStep({ done: () => opened || did.cast > 0 || !O.active, again: () => say('onb_wand_again'), max: 26 });
  point(null);
  if (!opened) { O.wandTap = () => false; document.body.classList.remove('onb-wand'); return true; }
  // wait until the sun is made (the guided bar helps more and more; Puff finishes it if she gets stuck)
  const t0 = F.T.now;
  while (O.active && guided && F.T.now - t0 < 240) await F.T.sleep(250);
  O.wandTap = () => false;
  document.body.classList.remove('onb-wand');
  return true;
}
function openGuided(w) {
  F.sfx.magic();
  let i = 0, wrong = 0, done = false, idle = 0, lastLen = 0, helpT = null;
  const h = F.Wand.open({
    mode: 'task', slots: w.length, ghost: w, picture: w,
    onPicture: () => say('onb_write', { w }),
    onLetter: ch => {
      idle = 0;
      const sp = h.speller, n = sp.text().length;
      if (ch !== w[n - 1]) {
        // only the glowing letter sticks
        wrong++; F.sfx.boing();
        F.T.timeout(() => { if (!done) { sp.tapSlot(n - 1); sp.glowKey(w[sp.text().length]); } }, 260);
        if (wrong === 2 || wrong % 4 === 0) say('onb_write_no');
        return;
      }
      if (n >= w.length) F.T.timeout(() => sp.submit(), 280); else sp.glowKey(w[n]);
    },
    onSubmit: async text => {
      if (done) return;
      if (text !== w) { h.bad(700); h.clear(); h.speller.glowKey(w[0]); return; }
      done = true;
      h.ok(); await h.fly(); h.close();
      document.body.classList.remove('wand-open');
      try { await F.Wand.cast(w, 1, { free: false }); } catch (e) { console.error('[onb] cast', e); }
      await F.T.sleep(400);
      await say('onb_wand_ok');                     // (no «Med staven kan du trylle fram mange ting» – the sun in front of her says it)
      guided = null;
    },
  });
  guided = h;
  document.body.classList.add('wand-open');
  h.speller.glowKey(w[0]);
  say('onb_write', { w });
  // gentle help: reminder after 12 s idle, the key keeps glowing, Puff writes it after 36 s
  (async () => {
    while (!done && O.active && guided === h) {
      await F.T.sleep(500);
      if (F.Speech.busy()) continue;
      idle += 0.5;
      const len = h.speller.text().length; if (len !== lastLen) { lastLen = len; idle = 0; }
      if (idle === 12) say('onb_write_again');
      if (idle >= 20 && idle < 36 && idle % 4 === 0) { h.speller.glowKey(w[len]); }
      if (idle >= 36) { idle = 0; await say('onb_doit'); h.speller.fill(w); }
    }
  })();
  void helpT;
}
// a small gold coin on the path in front of the tower (not a step: no hand, no line). A tap → 12 coins fly from it into the purse.
// If she never taps it, it stays there as a find (F.save.onb.coin = 'out' → re-placed after a reload, until it is taken).
F.Things.def('h_mynt', {
  name: 'mynten', radius: 0.5, solid: false, reach: 1.8, surprise: false,
  build(th) { const g = new THREE.Group(); const m = F.VOX.has('h_mynt') ? F.VOX.make('h_mynt', {}) : new THREE.Group(); m.scale.setScalar(1.25); m.position.y = 0.2; g.add(m); th.parts = (m.userData && m.userData.parts) || {}; return g; },
  tick(th, dt, t) {
    const c = th.parts.coin; if (c) c.rotation.y = t * 2.2; if (th.obj && th.obj.children[0]) th.obj.children[0].position.y = 0.2 + Math.sin(t * 3) * 0.06;
    // a glint now and then: something shiny lies on the path
    th._gl = (th._gl || 0) + dt; if (th._gl > 2.6 && th.space === F.Space.cur && !th.data.taken) { th._gl = 0; F.FX.sparkle(new V3(th.x, th.y + 0.7, th.z), 0xfff0a0); }
  },
  async press(th) {
    th.reactedVisibly = true;
    if (th.data.taken) return; th.data.taken = true;
    S().coin = 'taken'; F.store();
    F.sfx.coin && F.sfx.coin();
    F.FX.burst(new V3(th.x, th.y + 0.9, th.z), { n: 26, colors: [0xffe066, 0xfff6c0, 0xffffff], speed: 1.6, up: 2.4, life: 1.2, size: 0.1 });
    let from = null; try { const s2 = F.Input.screenOf(th); if (s2 && s2.onScreen) from = { x: s2.x, y: s2.y }; } catch (e) { from = null; }
    F.Eco.add(12, { reason: 'onboard', from: from || { x: innerWidth / 2, y: innerHeight * 0.45 } });   // (a tap needs it on screen: from = the coin)
    F.emit('onbCoin');
    await F.T.tween(350, k => { if (th.obj) th.obj.scale.setScalar(Math.max(0.01, 1 - k)); });
    F.Things.remove(th);
  },
});
const COIN = { x: 80.4, z: -83.0 };
function coinOut() {
  const s = S();
  if (s.coin === 'taken' || !F.Things.defs.h_mynt || F.Things.byId('onb_mynt')) return null;
  s.coin = 'out'; F.store();
  return F.Things.spawn('h_mynt', COIN.x, COIN.z, { id: 'onb_mynt', zone: 'park', space: 'out' });
}
F.on('ready', () => { try { if (S().coin === 'out') coinOut(); } catch (e) { console.error('[onb] coin', e); } });
async function stepPost(o) {
  coinOut();                                                  // it glints on the path while Pip comes
  const m0 = did.mail;
  // the day really starts now: Pip brings the post (LIFE listens to 'dayStart')
  if (!S().post) { S().post = true; F.store(); if (o.dayStart) o.dayStart(); }
  await stepMailbox(m0);
  let env = null;
  for (let k = 0; k < 40 && O.active; k++) {
    await F.T.sleep(250);
    const L = F.Things.list.filter(t => t.type === 'life_brev' && t.space === F.Space.cur);
    if (L.length) { const P = F.Player.pos; env = L.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; break; }
    if (letterOpen()) break;                                  // she found and opened it herself
  }
  if (!env) return finishPost();
  for (let k = 0; k < 4 && !did.env && !letterOpen(); k++) await F.T.sleep(250);     // it hops out of the mailbox and lands
  nudgeEnvelopes();
  if (did.env || letterOpen() || !env.obj || !env.obj.parent) return finishPost();
  // the hand points at the letter at once (silently); «Trykk på brevet!» only when she has not gone for it within 4 s of SEEING the
  // hand (the 4 s count while the hand is on screen, no one talks and she is not on her way to it; at most ~15 s in all)
  const e0 = did.env;
  const opened = () => did.env > e0 || letterOpen() || !O.active;
  const onIt = () => opened() || goingTo('life_brev');
  const glow = F.FX.glow(env.obj, { color: 0xfff0a0, size: 1.6, ms: 0 });
  point({ thing: env });
  let seen = 0;
  for (let k = 0; k < 60 && !onIt() && seen < 4; k++) { await F.T.sleep(250); if (handShown() && !F.Speech.busy() && !F.Player.moving && !onIt()) seen += 0.25; }
  for (let k = 0; k < 40 && goingTo('life_brev') && !opened(); k++) await F.T.sleep(250);      // her walk to it
  if (!opened()) {
    for (let k = 0; k < 12 && F.Speech.busy() && !onIt(); k++) await F.T.sleep(250);
    if (!onIt()) await say('onb_env');
    await waitStep({
      done: opened,
      again: () => say(F.TPL.has('home_onb_brev_again') ? 'home_onb_brev_again' : 'onb_env'), repeat: true,
      doIt: () => { const L = F.Things.list.filter(t => t.type === 'life_brev' && t.space === F.Space.cur); if (L[0]) return F.Things.press(L[0]); },
    });
  }
  point(null); glow.remove();
  return finishPost();
}
const letterOpen = () => !!document.querySelector('.panel-wrap.life-panel');
// envelopes that landed at the very front of the room hide under Staven: lay them out on the rug in front of her (Fetårnet only)
function nudgeEnvelopes() {
  if (!inTower()) return;
  const r = F.Castle.rooms.fetarn, L = F.Things.list.filter(t => t.type === 'life_brev' && t.space === 'in' && t.obj);
  if (!r || !r.bounds || !L.some(t => t.z > 8.2)) return;
  const cx = (r.bounds.x0 + r.bounds.x1) / 2;
  L.forEach((t, i) => {
    const x = cx - 2.2 + i * 2.2, z = 6.5 + (i % 2) * 0.5;
    t.x = x; t.z = z; t.obj.position.x = x; t.obj.position.z = z; t.bboxDirty = true;
    F.FX.sparkle(new V3(x, t.obj.position.y + 0.3, z));
  });
}
// Pip's post goes into the tower's mailbox (F.Tower): the hand points at it until she opens it (skipped when she already did)
async function stepMailbox(m0) {
  const box = TW().mailbox && TW().mailbox();
  if (!box || F.Space.cur !== 'out' || !near(box, 40)) return false;
  const opened = () => did.mail > m0 || !O.active;
  for (let k = 0; k < 40 && !opened() && !(TW().post && TW().post()); k++) await F.T.sleep(250);     // Pip brings the post
  if (opened() || !(TW().post && TW().post())) return false;
  await F.T.sleep(600);
  for (let k = 0; k < 16 && F.Speech.busy() && !opened(); k++) await F.T.sleep(250);
  if (opened()) return false;
  if (TW().pulse) TW().pulse(true);
  point({ thing: box });
  await say('home_onb_post');
  await waitStep({ done: opened, again: () => say('home_onb_post_again'), repeat: true, doIt: () => F.Things.press(box) });
  point(null);
  if (TW().pulse) TW().pulse(false);
  for (let k = 0; k < 12 && O.active && !F.Things.list.some(t => t.type === 'life_brev' && t.space === F.Space.cur); k++) await F.T.sleep(250);
  return did.mail > m0;
}
async function finishPost() {
  // the card: the giver says what the letter is about (LIFE: «Et brev fra kongen!», «Hva står det?», the word, the king's own voice)
  const t0 = F.T.now;
  while (O.active && !letterOpen() && F.T.now - t0 < 6) await F.T.sleep(250);
  if (letterOpen()) {
    // the hand shows the green ✓ only when the letter has had its say – silently: the card's word has been read (quests.js speak():
    // .lenv-word gets 'read' after its 4 s timer or her tap on it), then the king's request in his own voice (brev_<qid>) and 1.2 s
    // of quiet after it. A card without a word: ≥ 4.5 s, then 1.2 s of quiet. At most ~24 s.
    const t1 = F.T.now; let quiet = 0;
    const read = () => { const w = document.querySelector('.panel-wrap.life-panel .lenv-word'); return w ? w.classList.contains('read') : F.T.now - t1 >= 4.5; };
    while (O.active && letterOpen() && F.T.now - t1 < 24) {
      await F.T.sleep(250);
      quiet = (!read() || F.Speech.busy()) ? 0 : quiet + 0.25;
      if (quiet >= 1.2) break;
    }
    const okSel = '.panel-wrap.life-panel .kbtn.mint';
    if (letterOpen() && document.querySelector(okSel)) {
      point({ sel: okSel, dir: 'up' });                 // the hand comes from below: it never covers the word on the card
      // an idle child is never stuck behind the card: Puff presses ✓ for her after ~25 s, without a word
      await waitStep({
        done: () => !O.active || !letterOpen() || !document.querySelector(okSel), panelOk: true,
        doIt: () => { const b = document.querySelector(okSel); if (b) b.click(); }, quiet: true, t2: 25,
      });
      point(null);
    }
  }
  // the letter flies into the goal card (LIFE / HUD: F.Goal.arrive). From now on her tap on Puff is Puff's real answer.
  goalOpen = true;
  return true;
}
// today's goal (clarity §3.0 F.Quest.goal; before it lands: a quest target that is not the post)
function goalNow() {
  try {
    if (F.Quest && typeof F.Quest.goal === 'function') return F.Quest.goal();
    const t = F.Quest && F.Quest.target ? F.Quest.target() : null;
    return t && !t.post ? t : null;
  } catch (e) { return null; }
}
// today's post still waits (in the mailbox or lying somewhere): she was too far from the mailbox for its step (she wandered off, or a
// reload put her there) – Puff's answer then is «Du har post!» + the clouds to it (HUD free answer)
function postWaits() {
  try { const d = F.save.day || 1; return !!((TW().post && TW().post() > 0) || F.Things.list.some(t => t.type === 'life_brev' && t.data && t.data.day === d)); } catch (e) { return false; }
}
// the hand on Puff, Puff glows: «Trykk på meg, så viser jeg vei!» – her tap runs Puff's real answer (O.puff() is false now). Only when
// a goal is open (or today's post still waits) and she has not asked Puff herself yet; ignored for ~30 s, the hand and the glow go away
// quietly.
async function stepPuff() {
  goalOpen = true;
  const H = F.HUD;
  if (!H || !H.puff) return true;
  // the letter's flight into the goal card and the giver's voice first
  for (let k = 0; k < 24 && O.active && (F.Speech.busy() || F.UI.isOpen()); k++) await F.T.sleep(250);
  await F.T.sleep(800);
  const asked = () => did.puff > 0;                            // (counted only since the letter was closed)
  if (!O.active || asked() || !(goalNow() || postWaits()) || F.Task.current) return true;
  F.emit('puffGlow', true);
  point({ el: H.puff, fx: 0.45, fy: 0.3 });
  try {
    await sayCuttable('onb_puff');
    await waitStep({ done: () => asked() || !O.active, max: 30 });
  } finally {
    point(null);
    if (!F.Task.current) F.emit('puffGlow', false);
  }
  return true;
}

/* ------------------------------------------------------------ run */
O.run = async function (o) {
  o = o || {};
  if (O.active) return;
  O.active = true;
  for (const k in did) did[k] = 0;
  goalOpen = false; pressOk = false; lastTap = null;
  F.emit('onboard', 'start');
  const s = S();
  const t0 = F.T.now;
  try {
    for (let i = startIndex(s); i < STEPS.length && O.active; i++) {
      const name = STEPS[i];
      O.step = name; s.step = name; F.store();
      F.emit('onboardStep', name);
      if (name === 'hello') await bigPuff();
      else if (name === 'fly') await stepFly();
      else if (name === 'press') await stepPress();
      else if (name === 'wand') await stepWand();
      else if (name === 'post') await stepPost(o);
      else if (name === 'puff') await stepPuff();
      if (name !== 'puff') await F.T.sleep(500);
      if (F.T.now - t0 > 600) break;                          // a safety net: never longer than 10 minutes
    }
    // no closing line (clarity §3.7: «Nå kan du fly rundt og trykke på alt!» contradicted the goal she had just been given)
  } catch (e) { console.error('[onb]', e); }
  // whatever happened, the day has started and the post has come
  if (!S().post) { S().post = true; if (o.dayStart) try { o.dayStart(); } catch (e) { console.error(e); } }
  s.done = true; s.step = 'done'; O.step = null; O.active = false; O.wandTap = () => false; goalOpen = false;
  point(null);
  document.body.classList.remove('onb-wand');
  F.store();
  F.emit('onboard', 'done');
};
O.wandTap = () => false;
O.skip = () => { O.active = false; };
// debug
F.dbg = F.dbg || {};
const handInfo = () => { const t = handTo; if (!t) return null; return t.thing ? { thing: t.thing.id } : t.sel ? { sel: t.sel } : t.el ? { el: t.el.className } : { pos: true }; };
F.dbg.onboard = () => ({ active: O.active, step: O.step, save: S(), did: Object.assign({}, did), guided: !!guided, goalOpen, hand: O._handXY(),
  to: handInfo(), shown: !!(hand && hand.classList.contains('on') && hand.style.visibility !== 'hidden') });
})();
