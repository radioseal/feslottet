/* Feslottet – the goal card (clarity plan §3.3.1 + economy plan §4, owner «hud»). A small card under the purse, top left.
   Quest mode (F.Quest.goal() is open – contract clarity §3.0): the giver's face + the thing it is about (no words, no tabs); a villager's
   goal = the picture only; Mia's bedtime story = Mia + a book; a green ✓ chip in state 'back' (she only has to fly back).
   Savings mode (no goal, a savings goal is set – F.save.shop.piggyGoal): the item's picture + a bar model (whole = the price on its end
   tag, gold = her coins with her number at its edge, the rest hatched with «?»). When she has enough the first time for this goal: one
   gold moment (1.2 s glow, the picture hops, the piggy jingles) + «Nå har du nok!» (goal_nok) – never again for that goal, nothing nags.
   Hidden (opacity 0, no taps) with no goal and no savings goal, and during tasks, panels (letters, shops), the map / album, a scripted
   scene, a cloud ride, the title / bedtime screens. No pulsing; one soft glow on arrival.
   F.Goal = {
     el                      the card element
     arrive(rect)            a 600 ms FLIP from the letter card's / bubble's rect into the card (+ one soft glow)
     pop()                   the ✓ chip pops (questBack)
     setSaving(itemId)       a new savings goal (replaces the old one, no question asked)   clearSaving()
     saving() -> {id, price, have, enough} | null       mode() -> 'quest' | 'save' | null       visible() -> bool
     place()                 re-place under the purse (hud.js calls it when the purse grows)   sync()  refresh now
   }
   Tap: quest mode = Puff's goal branch (F.HUD.goalPress: the line + the way); savings mode with enough coins = the way to the shop that
   sells it + «Den finner du i {shop}.» (goal_hvor, once a session); savings mode, not enough = the bar shimmers (silent).
   On 'questDone' the card shows a ✓ burst and flies into the purse with the coins.
   Events in: goalChanged, questBack, questDone, taskStart/taskEnd, spaceChanged, travelEnd, piggyGoal, coins, bought (+ a 1 s tick).
   Event out: 'goalCard' (mode | null) when the shown mode changes, 'goalTap' (mode). Works in any load order (feature-detects F.HUD). */
(function () {
'use strict';
const F = window.F;
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const has = id => !!(id && F.TPL && F.TPL.has && F.TPL.has(id));
const G = F.Goal = { el: null };
const H = () => F.HUD || {};
const now = () => (F.T ? F.T.now : performance.now() / 1000);
let card = null, faceEl = null, picEl = null, doneEl = null, barEl = null, fillEl = null, haveEl = null, priceEl = null, gapEl = null;
let mode = null, key = '', shownMode = null, vis = false, arriveUntil = -1, leaving = false, pendingArrive = null, hvorSaid = false, lastSpec = null;

function build() {
  if (card || !H().built || !H().root) return card;
  card = G.el = mk('div', 'hud-btn hud-goal');
  card.setAttribute('role', 'button'); card.setAttribute('aria-label', 'Målet');
  faceEl = mk('div', 'hg-face'); picEl = mk('div', 'hg-pic'); doneEl = mk('div', 'hg-done', '<svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  barEl = mk('div', 'hg-bar'); fillEl = mk('div', 'hg-fill'); gapEl = mk('div', 'hg-gap', '?'); haveEl = mk('div', 'hg-have'); priceEl = mk('div', 'hg-price');
  barEl.append(fillEl, gapEl, haveEl);
  card.append(faceEl, picEl, barEl, priceEl, doneEl);
  card.addEventListener('pointerdown', e => e.stopPropagation());
  card.addEventListener('click', e => { e.stopPropagation(); press(); });
  H().root.appendChild(card);
  place();
  return card;
}
/* ---- what the card shows */
function questGoal() {
  try { if (F.Quest && typeof F.Quest.goal === 'function') return F.Quest.goal() || null; } catch (e) { console.error('[Goal] goal()', e); return null; }
  try { if (H().goalNow) return H().goalNow(); } catch (e) { /* hud not ready */ }
  return null;
}
function saving() {
  try {
    if (F.Eco && typeof F.Eco.goal === 'function') { const g = F.Eco.goal(); if (g && g.id) return { id: g.id, price: g.price, have: g.have != null ? g.have : F.Eco.coins(), enough: g.enough != null ? !!g.enough : F.Eco.coins() >= g.price }; if (g === null) return null; }
  } catch (e) { /* fall back to the save */ }
  const s = F.save && F.save.shop, id = s && s.piggyGoal;
  if (!id) return null;
  const c = F.CAT && F.CAT.byId ? F.CAT.byId(id) : null;
  if (!c || !(c.price > 0)) return null;
  const have = F.Eco ? F.Eco.coins() : 0;
  return { id, price: c.price, have, enough: have >= c.price };
}
G.saving = saving;
const thumbOf = (model, size) => {
  try {
    if (!model) return null;
    const c = F.CAT && F.CAT.byId ? F.CAT.byId(model) : null;
    const mid = c && F.CAT.mid ? F.CAT.mid(c) : (F.VOX && F.VOX.has(model) ? model : null);
    return mid && F.Thumb ? F.Thumb.img(mid, (c && c.opts) || {}, { size: size || 128 }) : null;
  } catch (e) { return null; }
};
function spec() {
  const g = questGoal();
  if (g) return { mode: 'quest', g, key: 'q|' + (g.id || '') + '|' + (g.face || '') + '|' + (g.model || '') + '|' + (g.state === 'back' ? 'back' : '') };
  const s = saving();
  if (s) return { mode: 'save', s, key: 's|' + s.id };
  return { mode: null, key: '' };
}
function fill(sp) {
  card.classList.remove('quest', 'save', 'noface', 'enough', 'back');
  faceEl.innerHTML = ''; picEl.innerHTML = '';
  if (sp.mode === 'quest') {
    const g = sp.g;
    card.classList.add('quest');
    const face = g.face && F.VOX && F.VOX.has(g.face) ? F.Thumb.img(g.face, {}, { size: 128 }) : null;
    if (face) faceEl.appendChild(face); else card.classList.add('noface');
    const pic = thumbOf(g.model || (g.state === 'story' ? 'bok' : null), 128);
    if (pic) picEl.appendChild(pic);
    card.classList.toggle('back', g.state === 'back');
  } else if (sp.mode === 'save') {
    card.classList.add('save', 'noface');
    const pic = thumbOf(sp.s.id, 112); if (pic) picEl.appendChild(pic);
    // its word under the picture (economy §4: «SEILBÅT» – a little reading; written, never read aloud)
    try { const c = F.CAT && F.CAT.byId ? F.CAT.byId(sp.s.id) : null, w = c && (c.word || c.id); if (w) picEl.appendChild(mk('div', 'hg-word', null)).textContent = F.UI && F.UI.caseText ? F.UI.caseText(w) : String(w); } catch (e) { /* no label */ }
    bar(sp.s, false);
  }
}
function bar(s, grow) {
  if (!s) return;
  const k = Math.max(0, Math.min(1, s.have / s.price));
  fillEl.style.width = (k * 100).toFixed(1) + '%';
  gapEl.style.display = k >= 1 ? 'none' : '';
  haveEl.textContent = String(s.have); haveEl.style.left = (k * 100).toFixed(1) + '%';
  priceEl.textContent = String(s.price);
  card.classList.toggle('enough', !!s.enough);
  if (grow) { barEl.classList.remove('shim'); void barEl.offsetWidth; barEl.classList.add('shim'); }
}
/* ---- when it shows */
function blocked() {
  const h = H(), b = document.body.classList;
  if (!h.built || h.hidden || (F.Shell && F.Shell.screen)) return true;
  if ((F.Task && F.Task.current) || b.contains('hud-task')) return true;
  if (b.contains('map-open') || b.contains('album-open') || b.contains('overview-on') || (F.Map && F.Map.isOpen) || (F.BldMap && F.BldMap.isOpen)) return true;
  if (F.Travel && F.Travel.busy) return true;
  try { if (h.scene && h.scene()) return true; } catch (e) { /* partial */ }
  if (now() < arriveUntil) return false;                        // the letter flying in: shown while its panel closes
  if (F.UI && F.UI.isOpen && F.UI.isOpen()) return true;
  return false;
}
function applyVis() {
  if (!card) return;
  const on = !!(mode || leaving) && !blocked();
  if (on !== vis) { vis = on; card.classList.toggle('on', on); if (on) place(); }
  const m = on ? (leaving ? 'quest' : mode) : null;
  if (m !== shownMode) { shownMode = m; document.body.classList.toggle('goal-on', !!m); F.emit('goalCard', m); }
}
G.visible = () => vis;
G.mode = () => mode;
function place() {
  if (!card) return;
  const h = H(), u = h.u || 1;
  let top = 108 * u;
  try { if (h.purse && !document.body.classList.contains('hud-mini')) { const r = h.purse.getBoundingClientRect(); if (r.height) top = r.bottom + 10 * u; } } catch (e) { /* default */ }
  card.style.top = top.toFixed(1) + 'px';
}
G.place = place;
// quests.js finish(): the quest is deleted first, then the giver thanks her (lines, a reaction, a party), then 'questDone' – meanwhile the
// card stays with its ✓ (hold) so the burst and the flight into the purse play when the coins come. No questDone (an early return): it
// lets go when the finishing ends (or after 45 s).
let hold = null;
const finishingNow = () => { try { return !!(F.Quest && typeof F.Quest.finishing === 'function' && F.Quest.finishing()); } catch (e) { return false; } };
const questOpen = id => { try { return !!(F.Quest && typeof F.Quest.state === 'function' && F.Quest.state(id)); } catch (e) { return false; } };
const baseId = id => String(id == null ? '' : id).split('~')[0];
function sync(force) {
  if (!build()) return;
  if (leaving) { applyVis(); return; }
  const sp = spec();
  const was = mode === 'quest' && lastSpec && lastSpec.mode === 'quest' && lastSpec.g ? lastSpec.g : null;
  if (!hold && was && was.id && was.id !== 'story' && (sp.mode !== 'quest' || sp.g.id !== was.id) && finishingNow() && !questOpen(was.id)) hold = { id: was.id, t: now() };
  if (hold) {
    if (finishingNow() && now() - hold.t < 45) { card.classList.add('back'); applyVis(); return; }
    hold = null; force = true;
  }
  mode = sp.mode;
  if (force || sp.key !== key) { key = sp.key; lastSpec = sp; fill(sp); }
  else if (sp.mode === 'quest') card.classList.toggle('back', sp.g.state === 'back');
  else if (sp.mode === 'save') { const grew = lastSpec && lastSpec.s && sp.s.have > lastSpec.s.have; bar(sp.s, grew && vis); lastSpec = sp; }
  applyVis();
  if (pendingArrive) tryArrive();
  if (mode === 'save' && vis) enoughMoment(sp.s);
}
G.sync = () => sync(true);
/* ---- animations */
G.arrive = function (rect) {
  if (!rect) return;
  pendingArrive = { rect: { left: rect.left, top: rect.top, width: rect.width || 10, height: rect.height || 10 }, t: now() };
  sync(true);
};
function tryArrive() {
  const pa = pendingArrive; if (!pa || !card) return;
  if (mode !== 'quest') { if (now() - pa.t > 2.5) pendingArrive = null; return; }   // waiting for goalChanged
  pendingArrive = null;
  arriveUntil = now() + 1.0;
  applyVis();
  if (!vis) return;
  const r1 = card.getBoundingClientRect(), r0 = pa.rect;
  if (!r1.width) return;
  const sx = r0.width / r1.width, sy = r0.height / r1.height;
  const dx = (r0.left + r0.width / 2) - (r1.left + r1.width / 2), dy = (r0.top + r0.height / 2) - (r1.top + r1.height / 2);
  card.style.transition = 'none'; card.style.transformOrigin = '50% 50%';
  card.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  void card.offsetWidth;
  card.style.transition = 'transform .6s cubic-bezier(.3, .9, .4, 1)';
  card.style.transform = '';
  card.classList.remove('arrived'); void card.offsetWidth; card.classList.add('arrived');
  try { F.sfx.whoosh && F.sfx.whoosh(); } catch (e) { /* audio */ }
  setTimeout(() => { if (card) { card.style.transition = ''; } }, 650);
}
G.pop = function () {
  if (!card) return;
  sync();
  doneEl.classList.remove('pop'); void doneEl.offsetWidth; doneEl.classList.add('pop');
  try { F.sfx.pop && F.sfx.pop(); } catch (e) { /* audio */ }
};
// the goal is done: a ✓ burst, then the card flies into the purse with the coins
function doneFly(id) {
  // only the card's own quest flies (a villager's chain ending while the king's quest stays open does not take his card away)
  const mine = hold ? baseId(hold.id) === baseId(id) : (mode === 'quest' && lastSpec && lastSpec.g && baseId(lastSpec.g.id) === baseId(id));
  hold = null;
  if (!card || !mine || leaving) { sync(true); return; }
  leaving = true;
  let waited = 0;
  const go = () => {
    if (!card) return;
    if (blocked() && waited < 2) { waited += 0.2; F.T.timeout(go, 200); return; }
    applyVis();
    if (!vis) { leaving = false; sync(true); return; }
    card.classList.add('back');
    doneEl.classList.remove('pop'); void doneEl.offsetWidth; doneEl.classList.add('pop');
    try { const r = card.getBoundingClientRect(); if (F.UI && F.UI.sparkle) F.UI.sparkle(r.left + r.width / 2, r.top + r.height / 2); } catch (e) { /* optional */ }
    F.T.timeout(() => {
      const pr = H().purseRect ? H().purseRect() : null, r = card.getBoundingClientRect();
      if (pr && r.width) {
        const dx = (pr.left + Math.min(pr.width, 120) / 2) - (r.left + r.width / 2), dy = (pr.top + pr.height / 2) - (r.top + r.height / 2);
        card.style.transition = 'transform .6s ease-in, opacity .6s ease-in';
        card.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.18)`; card.style.opacity = '0';
      }
      F.T.timeout(() => {
        leaving = false; key = '';
        if (card) { card.style.transition = 'none'; card.style.transform = ''; card.style.opacity = ''; card.classList.remove('back', 'on'); vis = false; void card.offsetWidth; card.style.transition = ''; }
        sync(true);
      }, 650);
    }, 650);
  };
  go();
}
/* ---- savings: the gold moment, once per goal */
function enoughMoment(s) {
  if (!s || !s.enough) return;
  const sh = F.save.shop = F.save.shop || {};
  if (sh.goalSaid === s.id) return;
  if (F.Speech && F.Speech.busy && F.Speech.busy()) return;          // she hears it in a calm moment
  sh.goalSaid = s.id; try { F.store && F.store(); } catch (e) { /* later */ }
  card.classList.remove('gold'); void card.offsetWidth; card.classList.add('gold');
  picEl.classList.remove('hop'); void picEl.offsetWidth; picEl.classList.add('hop');
  try { F.sfx.coins && F.sfx.coins(6); } catch (e) { /* audio */ }
  if (has('goal_nok')) F.SAYF('goal_nok');
  F.emit('goalEnough', s.id);
}
G.setSaving = function (id) {
  const sh = F.save.shop = F.save.shop || {};
  if (!id) return G.clearSaving();
  if (sh.piggyGoal !== id && F.Eco && typeof F.Eco.setGoal === 'function') F.Eco.setGoal(id);       // economy.js keeps the save
  if (sh.piggyGoal !== id) { sh.piggyGoal = id; sh.goalDay = F.save.day || 1; if (sh.goalSaid !== id) sh.goalSaid = null; try { F.store && F.store(); } catch (e) { /* later */ } F.emit('piggyGoal', id); }
  sync(true);
  return true;
};
G.clearSaving = function () {
  const sh = F.save.shop;
  if (sh && sh.piggyGoal && F.Eco && typeof F.Eco.setGoal === 'function') F.Eco.setGoal(null);
  if (sh && sh.piggyGoal) { sh.piggyGoal = null; sh.goalSaid = null; try { F.store && F.store(); } catch (e) { /* later */ } F.emit('piggyGoal', null); }
  sync(true);
};
/* where she can buy it: the nearest stall of a shop that sells it (c.shop + c.also) that is in the world now – Markedsplassen's p_butikk,
   a village's / a kingdom market's v_markedsbod, a life_shop (data.shop = the shop id) – else the nearest village whose market has that
   shop (worldgen's stall spots), else the kingdom of a themed shop (its gate). -> {space:'out', x, z, shop, thing?|village?|realm?} | null */
const SHOP_TYPES = { p_butikk: 1, v_markedsbod: 1, life_shop: 1 };
function herOut() {
  const P = F.Player.pos;
  if (F.Space.cur === 'out') return { x: P.x, z: P.z };
  try { const B = F.Bld, p = B && B.cur && B.plan ? B.plan(B.cur) : null, ex = p && p.exits && p.exits[0] && p.exits[0].out; if (ex) return { x: ex.x, z: ex.z }; } catch (e) { /* legacy castle */ }
  return { x: 0, z: 26 };
}
function shopWay(item) {
  const ids = [item.shop].concat(Array.isArray(item.also) ? item.also : []).filter(id => id && typeof id === 'string');
  if (!ids.length) return null;
  const me = herOut();
  let best = null, bd = Infinity;
  const take = (w, x, z) => { const d = Math.hypot(x - me.x, z - me.z); if (d < bd) { bd = d; best = Object.assign({ space: 'out', x, z }, w); } };
  try {
    for (const t of F.Things.list) {
      if (!SHOP_TYPES[t.type] || !t.data || !ids.includes(t.data.shop) || (t.space || 'out') !== 'out' || t.x == null) continue;
      const ry = t.obj ? t.obj.rotation.y : (t.ry || 0);                               // in front of its counter
      take({ shop: t.data.shop, thing: t.id }, t.x + Math.sin(ry) * 2, t.z + Math.cos(ry) * 2);
    }
  } catch (e) { /* things not ready */ }
  if (!best) {
    try {
      if (F.W && F.W.villages && F.W.villageShops) for (const v of F.W.villages(me, 900) || []) {
        const sh = F.W.villageShops(v.regionId) || [], k = sh.findIndex(id => ids.includes(id));
        if (k < 0 || k > 1) continue;
        take({ shop: sh[k], village: v.regionId }, v.x + (k === 0 ? 5.8 : -5.8), v.z + (k === 0 ? 3.5 : -1.5));   // worldgen: stalls vs / vs2 at ±8 m
      }
    } catch (e) { /* world not ready */ }
  }
  if (!best) {
    try {
      for (const id of ids) {
        const S = F.SHOPS && F.SHOPS[id], rid = (S && S.realm) || item.realm; if (!rid || !F.Realm) continue;
        const g = F.Realm.gate ? F.Realm.gate(rid) : null, r = g || (F.Realm.get ? F.Realm.get(rid) : null);
        if (r && r.x != null) take({ shop: id, realm: rid }, r.x, r.z);
      }
    } catch (e) { /* realms not ready */ }
  }
  return best;
}
G.shopWay = id => { const c = F.CAT && F.CAT.byId ? F.CAT.byId(id) : null; return c ? shopWay(c) : null; };
function press() {
  const h = H();
  if (!vis || (h.busy && h.busy()) || (F.Task && F.Task.current)) return;
  F.emit('goalTap', mode);
  if (mode === 'quest') { try { F.sfx.pop && F.sfx.pop(); } catch (e) { /* audio */ } if (h.goalPress) h.goalPress(); return; }
  if (mode !== 'save') return;
  const s = saving(); if (!s) return;
  card.classList.remove('tap'); void card.offsetWidth; card.classList.add('tap');
  if (!s.enough) { bar(s, true); try { F.sfx.click && F.sfx.click(); } catch (e) { /* audio */ } return; }
  // enough: the clouds to the nearest shop that sells it (every gold tap draws them again) + its name once a session – only with a way
  const c = F.CAT && F.CAT.byId ? F.CAT.byId(s.id) : null;
  const way = c ? shopWay(c) : null, S = way && F.SHOPS ? F.SHOPS[way.shop] : null;
  let dest = null;
  if (way && h.wayTo) {
    if (h.stopFollow) h.stopFollow();
    try { dest = h.wayTo(way); } catch (e) { console.error('[Goal] wayTo', e); dest = null; }
    if (dest) { dest.kind = 'shop'; dest.shop = way.shop; h.lastWay = dest; }
  }
  F.emit('goalWay', { item: s.id, shop: way ? way.shop : null, dest });
  if (!dest) { bar(s, true); try { F.sfx.click && F.sfx.click(); } catch (e) { /* audio */ } return; }
  try { F.sfx.chime && F.sfx.chime(); } catch (e) { /* audio */ }
  const names = (F.SETS && F.SETS.SHOPNAMES) || [];
  if (!hvorSaid && S && names.includes(S.name) && has('goal_hvor') && !(F.Speech && F.Speech.busy && F.Speech.busy())) { hvorSaid = true; F.SAY('goal_hvor', { shop: S.name }); }
}
G.press = press;
/* ---- wiring */
['goalChanged', 'taskEnd', 'spaceChanged', 'travelEnd', 'piggyGoal', 'goal', 'bought', 'coins', 'ready', 'dayStart'].forEach(ev => F.on(ev, () => { try { sync(); } catch (e) { console.error('[Goal]', e); } }));
F.on('taskStart', () => { if (card) { applyVis(); } });
F.on('questBack', () => { try { sync(); G.pop(); } catch (e) { console.error('[Goal]', e); } });
F.on('questDone', id => { try { doneFly(id); } catch (e) { console.error('[Goal]', e); } });
let acc = 0;
F.on('tick', dt => { acc += dt; if (acc < 1) return; acc = 0; try { sync(); } catch (e) { console.error('[Goal]', e); } });
// visibility follows panels / tasks / rides the same frame they open
F.on('preRender', () => { if (card) applyVis(); });
addEventListener('resize', () => place());
})();
