/* Feslottet – HTML overlay UI helpers (kid-simple: big targets, everything spoken, minimal text).
   F.UI.el(tag, cls, html?) -> element          F.UI.btn(label, onClick, {cls, say, voice, big}) -> button
   F.UI.open(contentEl, {cls, onClose, closable:true, freeze:true}) -> panel handle {el, close()}   (modal sheet over the game)
   F.UI.closeAll()   F.UI.isOpen()
   F.UI.toast(html, ms)     F.UI.setCoins(n, animateFrom?)   F.UI.flyCoins(n, fromClientXY)
   F.UI.bubbleAt(worldPos|thing, text, ms)   (small speech bubble above a 3D point)
   Subtitles: listens to F 'subtitle' events -> #sub. */
(function () {
'use strict';
const F = window.F;
const $ = s => document.querySelector(s);
const UI = F.UI = {};
UI.el = function (tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
UI.btn = function (label, onClick, o) {
  o = o || {};
  const b = UI.el('button', 'kbtn ' + (o.cls || '') + (o.big ? ' big' : ''), label);
  b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.disabled) return;
    F.sfx.click();
    if (o.say) F.sayFree(o.say, o.voice || '');
    onClick && onClick(e);
  });
  return b;
};
const stack = [];
UI.isOpen = () => stack.length > 0;
UI.open = function (content, o) {
  o = o || {};
  const root = $('#panels');
  const wrap = UI.el('div', 'panel-wrap ' + (o.cls || ''));
  const card = UI.el('div', 'panel');
  if (o.closable !== false) {
    const x = UI.btn('✕', () => h.close(), { cls: 'panel-x' });
    x.title = 'Lukk';
    card.appendChild(x);
  }
  card.appendChild(content);
  wrap.appendChild(card);
  wrap.addEventListener('pointerdown', e => e.stopPropagation());
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('on'));
  const h = {
    el: card, wrap, closed: false,
    close(result) {
      if (h.closed) return; h.closed = true;
      const i = stack.indexOf(h); if (i >= 0) stack.splice(i, 1);
      wrap.classList.remove('on'); setTimeout(() => wrap.remove(), 200);
      if (!stack.some(s => s.freeze)) { F.Player.frozen = !!(F.Task && F.Task.current); F.Input.enabled = true; }   // a running task keeps her in place
      o.onClose && o.onClose(result);
    },
    freeze: o.freeze !== false,
  };
  stack.push(h);
  if (h.freeze) { F.Player.frozen = true; F.Player.stop(); F.Input.enabled = false; }
  return h;
};
UI.closeAll = () => stack.slice().forEach(h => h.close());
UI.toast = function (html, ms = 2200) {
  const t = UI.el('div', 'toast', html); $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, ms);
};
// coins counter in HUD
UI.setCoins = function (n) { const c = $('#coinN'); if (c) c.textContent = n; };
UI.flyCoins = function (n, from) {
  const target = $('#coins'); if (!target) return;
  const tr = target.getBoundingClientRect();
  const sx = from ? from.x : innerWidth / 2, sy = from ? from.y : innerHeight / 2;
  for (let i = 0; i < Math.min(n, 12); i++) {
    const c = UI.el('div', 'flycoin'); c.style.left = sx + 'px'; c.style.top = sy + 'px';
    document.body.appendChild(c);
    setTimeout(() => { c.style.left = (tr.left + 22) + 'px'; c.style.top = (tr.top + 22) + 'px'; c.style.opacity = '0.3'; }, 30 + i * 70);
    setTimeout(() => { c.remove(); F.sfx.coin(); }, 750 + i * 70);
  }
};
// speech bubble above a 3D point (or thing)
UI.bubbleAt = function (p, text, ms = 2500) {
  const pos = p.isVector3 ? p.clone() : new THREE.Vector3(p.x, (p.y || 0) + (p.h || 2.6), p.z);
  const b = UI.el('div', 'wbubble', text); $('#bubbles').appendChild(b);
  const upd = () => {
    const v = pos.clone().project(F.R.camera);
    const r = F.R.renderer.domElement.getBoundingClientRect();
    b.style.left = (r.left + (v.x + 1) / 2 * r.width) + 'px'; b.style.top = (r.top + (1 - v.y) / 2 * r.height) + 'px';
    b.style.display = v.z < 1 ? '' : 'none';
  };
  upd(); const off = F.on('preRender', upd);
  setTimeout(() => { off(); b.classList.add('out'); setTimeout(() => b.remove(), 300); }, ms);
  return b;
};
// v3 WP5 §9.10 (P3): parent setting F.save.settings.sub = 'alle' (default) | 'korte' (≤ 4 words) | 'av'
UI.subMode = () => { const m = F.save && F.save.settings && F.save.settings.sub; return m === 'korte' || m === 'av' ? m : 'alle'; };
UI.subShows = text => { const m = UI.subMode(); if (!text || m === 'av') return false; if (m === 'korte') return String(text).trim().split(/\s+/).length <= 4; return true; };
F.on('subtitle', (text, voice) => {
  const s = $('#sub'); if (!s) return;
  const show = !!text && UI.subShows(text);
  s.textContent = show ? text : ''; s.classList.toggle('on', show);
  s.dataset.voice = voice || '';
});
/* v3 WP5 (DESIGN3 §3): ambient speech gets a 45 s same-text cooldown – F.UI.sayFree(text, voice) and object reactions spoken through
   F.SAYF (ids obj_* world_* park_* castle_tomt*). The sfx + animation of the reaction still play; only the repeated words are skipped.
   F.UI.recentFree(text, sec) -> bool. */
const freeT = new Map();
UI.FREE_COOLDOWN = 45;
// natural 11.10. (audit D4): castle_, bld_ and home_ reaction lines are free too – but never the ids below (UI.FREE_KEEP): counting,
// the lift / map / way-out guidance, the throne ceremony, onboarding, the morning post, bedtime, try-then-hear names and the payoffs
// of a task she solved (those are said as before)
UI.FREE_IDS = /^(obj_|world_|park_|castle_|bld_|home_)/;
UI.FREE_KEEP = /^(castle_(n|heis_hvor|tarn|etasjer|etasje1|krone_din|dekret|dekret_ferdig|lov|dronning_slutt|trone_hvile|trone_konge|trone|juvel_smykke|dans_form|kiste_rydd|frukt_rydd)|bld_(ut_finn|kart_trykk|kart_dit|her|gave|rom|rom_der|etasje|heis_opp|heis_ned|opp|ned|ut|inn)|home_(onb_[a-z_]+|morgen|gaut|post|postkasse|leggetid|hjem|tom|slottet)|obj_(las_senere|tall_senere|tallstolpe_nr|dor_onske_[a-z]+|vaskesnor_monster|krystaller_hoste|num|num_x)|world_landemerke|park_(sted|drivhus_moden))$/;
UI.recentFree = (text, sec) => { const t = freeT.get(String(text)); return t != null && (F.T.now || 0) - t < (sec != null ? sec : UI.FREE_COOLDOWN); };
const markFree = text => { freeT.set(String(text), F.T.now || 0); if (freeT.size > 300) { const old = [...freeT.entries()].sort((a, b) => a[1] - b[1]).slice(0, 100); old.forEach(([k]) => freeT.delete(k)); } };
/* natural 11.10. (audit D4 #2/#16/#58) – the NARRATOR LIMITER for free play. A narrator ('' voice) object line (UI.FREE_IDS) plays only
   when all three hold: (1) it follows the FIRST tap of that thing type today (a line that follows no tap skips this rule), (2) ≥ 35 s
   (UI.NARR_GAP) since the last narrator object line, (3) that exact text has not been said this session (an unsaid variant is
   preferred). Otherwise only the SFX + animation play. Off while a task / quest step / encounter / ceremony / onboarding runs.
   F.UI.narrOK(text), F.UI.narr.log [{id, text, ok, t}] (tests). Landmark lines (UI.ONCE_IDS) are said once a session (F.SAY too). */
UI.NARR_GAP = 35;
const NARR = UI.narr = { last: -1e9, said: new Set(), typeDay: {}, press: null, log: [] };
F.on('press', th => {
  if (!th || !th.type) return;
  const d = (F.save && F.save.day) || 1, first = NARR.typeDay[th.type] !== d;
  NARR.typeDay[th.type] = d; NARR.press = { type: th.type, t: F.T.now || 0, first };
});
UI.freePlay = () => !((F.Task && F.Task.current) || (F.Quest && F.Quest.stepRunning && F.Quest.stepRunning()) || (F.Befriend && F.Befriend.busy) ||
  (F.Throne && F.Throne.busy) || (F.RQuest && F.RQuest.busy) || (F.Onboard && F.Onboard.active));
UI.narrOK = function (text) {
  if (!UI.freePlay()) return true;
  const now = F.T.now || 0, p = NARR.press;
  if (NARR.said.has(String(text))) return false;
  if (now - NARR.last < UI.NARR_GAP) return false;
  if (p && now - p.t < 12 && !p.first) return false;
  return true;
};
const narrLog = (id, text, ok, voice) => { NARR.log.push({ id, text, ok, voice: voice || '', t: F.T.now || 0 }); if (NARR.log.length > 300) NARR.log.shift(); };
UI.ONCE_IDS = new Set(['bld_benk', 'home_tarn', 'home_stjerne', 'st_open', 'prog_floors1']);
const onceSaid = new Set();
function wrapSAY() {
  if (!F.SAY || F.SAY._once) return;
  const raw = F.SAY;
  const w = function (id) {
    if (typeof id === 'string' && UI.ONCE_IDS.has(id)) { if (onceSaid.has(id)) { F.emit('onceSkipped', id); return Promise.resolve(); } onceSaid.add(id); }
    return raw.apply(this, arguments);
  };
  w._once = true; w.raw = raw;
  F.SAY = w;
}
const rawSayFree = F.sayFree;
UI.sayFree = function (text, voice) {
  if (!text) return Promise.resolve(false);
  if (F.Speech && F.Speech.busy()) return Promise.resolve(false);
  if (UI.recentFree(text)) return Promise.resolve(false);
  markFree(text);
  return rawSayFree ? rawSayFree(text, voice) : F.say(text, voice).then(() => true);
};
F.sayFree = UI.sayFree;
// F.SAYF is defined by tpl.js (loads after this file): wrap it once everything is loaded
function wrapSAYF() {
  if (!F.SAYF || F.SAYF._wp5) return;
  const raw = F.SAYF;
  const w = function (id, slots, voice) {
    try {
      if (typeof id === 'string' && UI.FREE_IDS.test(id) && !UI.FREE_KEEP.test(id) && F.TPL && F.TPL.has(id) && !F.TPL.validate(id, slots, voice || '')) {
        if (UI.ONCE_IDS.has(id) && onceSaid.has(id)) { narrLog(id, '', false); return Promise.resolve(false); }
        if (F.Speech && F.Speech.busy()) return Promise.resolve(false);
        const narr = !voice;
        let text = F.TPL.text(id, slots);
        if (narr && NARR.said.has(text)) { const n = (F.TPL.all[id].text || []).length; for (let i = 0; i < n; i++) { const t = F.TPL.text(id, slots, i); if (!NARR.said.has(t)) { text = t; break; } } }
        if (narr && !UI.narrOK(text)) { narrLog(id, text, false); F.emit('narrSkipped', id, text); return Promise.resolve(false); }
        if (UI.recentFree(text)) { F.emit('freeSkipped', id, text); return Promise.resolve(false); }
        markFree(text);
        if (narr && UI.freePlay()) { NARR.said.add(text); NARR.last = F.T.now || 0; if (NARR.press) NARR.press.first = false; }
        if (UI.ONCE_IDS.has(id)) onceSaid.add(id);
        narrLog(id, text, true, voice);
        return F.say(text, voice || '').then(() => true);
      }
    } catch (e) { /* fall through to the plain call */ }
    return raw.apply(this, arguments);
  };
  w._wp5 = true; w.raw = raw;
  F.SAYF = w;
}
F.on('boot', wrapSAYF); F.on('ready', wrapSAYF); F.on('boot', wrapSAY); F.on('ready', wrapSAY);
})();
/* v3 WP5 – F.UI.tryRead(label, text, o) -> {remove(), state}: «try first, then hear it» for text in the world (DESIGN3 §1.2, §3).
   label: a world label (F.UI.label handle) or a DOM element (the region banner). Tappable only within o.maxDist (10 m) and never while
   a task runs (otherwise the tap passes through to the world). 1st tap: the letters light up and are sounded out BY SOUND UNIT (F.LYD;
   a long compound name sounds out only o.stem, a long name without a stem just lights up). 2nd tap ≥ 1.5 s later: the whole word/name
   via o.tpl + o.slots (rw_word / hud_place / map_navn …) or a sparkle if there is no clip. Later taps within 20 s say it again;
   after 20 s quiet it starts over with sounding out. o.onTap(step) / o.onWhole() callbacks; emits 'tryRead' (text, step).
   o.stem: the picture-word part shown bold (Kake|by). o.glow: pulsing outline (welcome banner). */
(function () {
'use strict';
const F = window.F;
const UI = F.UI;
const handles = new Set();
UI.tryReads = handles;
function sparkleAt(el) {
  try {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const s = UI.el('div', 'tr-spark'); s.style.left = (r.left + Math.random() * r.width) + 'px'; s.style.top = (r.top + Math.random() * r.height) + 'px';
      document.body.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  } catch (e) { /* no sparkle */ }
  F.sfx && F.sfx.sparkle && F.sfx.sparkle();
}
UI.tryRead = function (label, text, o) {
  o = o || {};
  const L = label && label.el && label.pos ? label : null;
  const el = L ? L.el : label;
  const h = { L, el, text: String(text || ''), o, n: 0, busy: false, t1: -1e9, tLast: -1e9, whole: false, dead: false, clickable: !L };
  if (!el || !h.text) { h.remove = () => {}; return h; }
  if (el._tryRead) el._tryRead.remove();
  el._tryRead = h;
  // letters as spans (icons / crests already in the element stay in front)
  const keep = [...el.childNodes].filter(n => n.nodeType === 1 && !n.classList.contains('lch'));
  el.textContent = ''; keep.forEach(n => el.appendChild(n));
  const low = h.text.toLowerCase(), stem = o.stem ? String(o.stem).toLowerCase() : '';
  const s0 = stem ? low.indexOf(stem) : -1;
  const wrap = UI.el('span', 'tr-text'); el.appendChild(wrap);
  h.spans = [...h.text].map((ch, i) => {
    const sp = UI.el('span', 'lch' + (s0 >= 0 && i >= s0 && i < s0 + stem.length ? ' tr-stem' : ''), ch === ' ' ? '&nbsp;' : '');
    if (ch !== ' ') sp.textContent = UI.caseText(ch);
    wrap.appendChild(sp); return sp;
  });
  el.classList.add('tr-read'); if (o.glow) el.classList.add('tr-glow');
  if (!L) el.classList.add('tr-dom');
  const sayUnits = async (word, i0) => {
    const units = F.LYD ? F.LYD.units(word) : [...word].map((c, i) => ({ i0: i, n: 1, s: [], ch: c }));
    for (let k = 0; k < units.length; k++) {
      if (h.dead) return;
      const u = units[k], lit = [];
      for (let j = 0; j < u.n; j++) { const e = h.spans[i0 + u.i0 + j]; if (e) { e.classList.add('hl'); lit.push(e); } }
      if (!u.silent && F.sfx && F.sfx.pling) F.sfx.pling(k);
      if (F.LYD) await F.LYD.play(u); else await F.T.sleep(300);
      await F.T.sleep(u.silent ? 60 : 110); lit.forEach(e => e.classList.remove('hl'));
    }
  };
  const sweep = async () => { for (let i = 0; i < h.spans.length && !h.dead; i++) { const e = h.spans[i]; e.classList.add('hl'); if (F.sfx && F.sfx.pling && i % 2 === 0) F.sfx.pling(i); await F.T.sleep(90); e.classList.remove('hl'); } };
  async function first() {
    // sound out: the stem of a compound name, a short word whole by units, a long name without a stem only lights up
    if (s0 >= 0 && stem.length < low.length) await sayUnits(stem, s0);
    else if (/^[a-zæøå]+$/.test(low) && low.length <= 7) await sayUnits(low, 0);
    else if (stem) await sayUnits(stem, Math.max(0, s0));
    else await sweep();
  }
  async function whole() {
    el.classList.add('tr-said');
    h.spans.forEach(e => e.classList.add('hl2')); F.T.timeout(() => h.spans.forEach(e => e.classList.remove('hl2')), 1600);
    if (o.tpl && F.TPL && F.TPL.has(o.tpl) && !F.TPL.validate(o.tpl, o.slots || {}, o.voice || '')) { if (F.Speech) F.Speech.clearQueue(); await F.SAY(o.tpl, o.slots || {}, o.voice || ''); }
    else sparkleAt(el);
    h.whole = true;
    if (o.onWhole) try { o.onWhole(); } catch (e) { console.error(e); }
  }
  h.press = async function () {
    if (h.dead || h.busy || (F.Task && F.Task.current)) return false;
    const now = F.T.now || 0;
    if (now - h.tLast > 20) { h.n = 0; }               // a fresh try after 20 s quiet
    if (h.n >= 1 && now - h.t1 < 1.5) return false;    // the 2nd tap needs a little reading time
    h.busy = true; h.tLast = now;
    if (F.Speech) F.Speech.clearQueue();               // her tap wins over queued chatter (the line now playing finishes)
    const step = h.n === 0 ? 1 : 2;
    F.emit('tryRead', h.text, step);
    if (o.onTap) try { o.onTap(step); } catch (e) { console.error(e); }
    try {
      if (step === 1) { h.t1 = now; await first(); h.n = 1; }
      else { await whole(); h.n = 2; }
    } catch (e) { console.error('tryRead', e); }
    h.busy = false; h.tLast = F.T.now || 0;
    return true;
  };
  const onDown = e => { if (h.clickable) e.stopPropagation(); };
  const onClick = e => { if (!h.clickable || (F.Task && F.Task.current)) return; e.stopPropagation(); h.press(); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('click', onClick);
  h.remove = () => {
    if (h.dead) return; h.dead = true; handles.delete(h);
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('click', onClick);
    el.classList.remove('tr-read', 'tr-glow', 'tr-dom', 'tr-said', 'tr-on'); if (L) el.classList.remove('click');
    if (el._tryRead === h) el._tryRead = null;
  };
  handles.add(h);
  return h;
};
// world plaques: tappable only near her (≤ maxDist 10 m), shown, same space and no task running – otherwise taps go to the world
F.on('preRender', () => {
  if (!handles.size) return;
  const P = F.Player && F.Player.pos, busy = !!(F.Task && F.Task.current);
  for (const h of handles) {
    if (!h.L) { h.clickable = !busy; continue; }
    const L = h.L;
    if (!UI.labels.has(L) || !L.el.isConnected) { h.remove(); continue; }
    let ok = !busy && !L.taskHide && L.visible && L.el.style.display !== 'none' && L.el.style.visibility !== 'hidden' && P;
    if (ok) { const p = L.pos(); ok = Math.hypot(p.x - P.x, p.z - P.z) <= (h.o.maxDist || 10); }
    if (ok !== h.clickable) { h.clickable = ok; L.el.classList.toggle('click', ok); L.el.classList.toggle('tr-on', ok); }
  }
});
/* v3 WP5 §9.5: during a task, world labels within 10 m of the stage that are not part of the task hide (L.taskHide).
   A format that re-uses a world label as a choice (F26 at a real signpost) calls F.UI.taskKeep(L): it counts as the task's own label. */
let taskHid = null;
UI.taskKeep = function (L) {
  if (!L) return;
  L.taskKeep = true; L.seq = UI._bumpSeq ? UI._bumpSeq() : L.seq; L.taskHide = false;
  if (taskHid) taskHid.delete(L);
};
F.on('taskStart', () => {
  const seq0 = UI.labelSeq ? UI.labelSeq() : 0;
  if (taskHid) { taskHid.forEach(L => { L.taskHide = false; }); }
  const mine = taskHid = new Set();
  Promise.resolve().then(() => {
    const c = F.Task && F.Task.current; if (!c || taskHid !== mine) return;
    const a = (c.S && (c.S.anchor || c.S.base)) || (F.Player && F.Player.pos); if (!a) return;
    for (const L of UI.labels) {
      if (L.seq > seq0 || L.taskKeep || L.taskHide) continue;
      const sp = L.space || (L.anchor && L.anchor.space) || 'out'; if (sp !== F.Space.cur) continue;
      const p = L.pos(); if (Math.hypot(p.x - a.x, p.z - a.z) > 10) continue;
      L.taskHide = true; mine.add(L);
    }
  });
});
F.on('taskEnd', () => { if (taskHid) taskHid.forEach(L => { L.taskHide = false; }); taskHid = null; for (const L of UI.labels) if (L.taskKeep) L.taskKeep = false; });
})();
/* Labels: every word/number she must read in the world = HTML plaque pinned to a 3D point (Andika, legible).
   const L = F.UI.label(anchor, text, {kind:'word'|'num'|'plaque'|'price'|'note', size, dy, space, maxDist})
     anchor: THREE.Vector3 | thing | THREE.Object3D (follows it)
   L.set(text)  L.remove()  L.el  L.show(bool)
   At most 30 visible (nearest to the fairy); hidden off-screen, behind the camera, > maxDist (28 m) or in the other space.
   Letter case: F.UI.caseText(text) applies the parent setting (lowercase default, UPPERCASE option) to words. */
(function () {
'use strict';
const F = window.F;
const UI = F.UI;
const labels = new Set();
let layer = null, labelSeq = 0;
UI.labelSeq = () => labelSeq;          // creation counter: labels made before a task started are "world" labels (L.seq)
UI._bumpSeq = () => ++labelSeq;        // F.UI.taskKeep: a world label the running task re-uses counts as the task's own
const v = new THREE.Vector3();
UI.caseText = t => (F.save && F.save.settings && F.save.settings.upper) ? String(t).toUpperCase() : String(t);
UI.label = function (anchor, text, o) {
  o = o || {};
  if (!layer) { layer = document.createElement('div'); layer.id = 'labels'; document.body.appendChild(layer); }
  const el = document.createElement('div');
  el.className = 'wlabel k-' + (o.kind || 'word');
  if (o.size) el.style.fontSize = o.size + 'px';
  const L = {
    el, anchor, kind: o.kind || 'word', dy: o.dy != null ? o.dy : 0, maxDist: o.maxDist || 28, visible: true, raw: text, seq: ++labelSeq,
    taskHide: false,                    // set by the task stage while this world label would cover the stage
    space: o.space || (anchor && anchor.space) || null,
    set(t) { L.raw = t; L._w = 0; el.textContent = (L.kind === 'word' || L.kind === 'note' || L.kind === 'plaque') ? UI.caseText(t) : String(t); },
    remove() { labels.delete(L); el.remove(); },
    show(b) { L.visible = b; },
    pos() {
      const a = L.anchor;
      if (a.isVector3) return v.copy(a);
      if (a.isObject3D) { a.getWorldPosition(v); return v; }
      if (a.obj) { v.copy(a.obj.position); v.y += (a.labelY != null ? a.labelY : 1.6); return v; }
      return v.set(a.x || 0, a.y || 0, a.z || 0);
    },
  };
  L.set(text);
  if (o.onClick) { el.classList.add('click'); el.addEventListener('click', e => { e.stopPropagation(); o.onClick(e); }); }
  layer.appendChild(el); labels.add(L);
  return L;
};
UI.labels = labels;
F.on('preRender', () => {
  if (!labels.size) return;
  const r = F.R.renderer.domElement.getBoundingClientRect();
  const P = F.Player.pos, cam = F.R.camera, list = [];
  for (const L of labels) {
    const sp = L.space || (L.anchor && L.anchor.space) || 'out';
    if (!L.visible || L.taskHide || sp !== F.Space.cur) { L.el.style.display = 'none'; continue; }
    const p = L.pos(); p.y += L.dy;
    const d = Math.hypot(p.x - P.x, p.z - P.z);
    if (d > L.maxDist) { L.el.style.display = 'none'; continue; }
    p.project(cam);
    if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { L.el.style.display = 'none'; continue; }
    list.push([L, d, r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]);
  }
  list.sort((a, b) => a[1] - b[1]);
  list.forEach(([L, d, x, y], i) => {
    if (i >= 30) { L.el.style.display = 'none'; return; }
    L.el.style.display = ''; L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  });
  // world labels (not the running task's own) that are cut by the screen edge or sit under a HUD button / the subtitle: hidden
  try {
    const S = F.Task && F.Task.current && F.Task.current.S, seq0 = S && S.labelSeq0 != null ? S.labelSeq0 : Infinity;
    const vis = list.slice(0, 30), hud = hudRects(), M = 12;
    vis.forEach(([L]) => { if (!L._w) { L._w = L.el.offsetWidth; L._h = L.el.offsetHeight; } });
    vis.forEach(([L, d, x, y]) => {
      let clip = false;
      if (L.seq <= seq0 && L._w) {
        const x0 = x - L._w / 2, x1 = x + L._w / 2, y0 = y - L._h, y1 = y;
        clip = x0 < r.left + M || x1 > r.right - M || y0 < r.top + M || y1 > r.bottom - M ||
          hud.some(q => x1 > q.left && x0 < q.right && y1 > q.top && y0 < q.bottom);
      }
      const want = clip ? 'hidden' : '';
      if (L.el.style.visibility !== want) L.el.style.visibility = want;
    });
  } catch (e) { /* never break rendering for a label */ }
});
let hudT = -1e9, hudR = [];
function hudRects() {
  const now = performance.now(); if (now - hudT < 400) return hudR; hudT = now; hudR = [];
  document.querySelectorAll('.hud-btn, .hud-map, .hud-wand, .hud-puff, .hud-purse, #sub.on').forEach(e => { const q = e.getBoundingClientRect(); if (q.width > 4 && q.height > 4) hudR.push(q); });
  return hudR;
}
F.on('spaceChanged', () => { for (const L of labels) L.el.style.display = 'none'; });
})();
/* ===================================================================================================================
   Task tray + input widgets (DESIGN §3.2, §11.3). All tap-only, big targets, physical keyboard always works too.
   F.UI.tray(true|false, {keep, skin}) -> the tray content element (.tray-in). Opening clears it unless {keep:true}.
     Bottom tray ≤200 px (≤176 at 700 px); the 3D view stays visible above. Calls F.HUD.showTray(bool); emits 'tray'.
   F.UI.chips(values, {kind:'num'|'word'|'thumb'|'yesno', onPick(v,i), parent, labels, opts}) -> handle
     values: numbers | strings | model ids (thumb) | {value, label, model, opts}. Numbers are always separate tiles.
     Keys: digits type a number (num chips), 1–4 pick by position (word/thumb), Enter = —.
   F.UI.keypad({len=2, auto=false, onSubmit(str), onChange(str), parent}) -> handle   (2×5 digit keys + ⌫ + ✓)
   F.UI.tiles({letters, slots, ghost, given, keyboard, auto, onSubmit(str), onChange(str), parent}) -> handle
     letters: array|string of bank tiles, or 'all' / keyboard:true for the on-screen 3-row keyboard (s2).
     slots: word length (default letters.length).  given: 'k_ke' style fixed letters ('_' = open).  ghost: faint letters.
     Tap a tile -> next empty slot; tap a placed tile -> back. Keys a–å, Backspace, Enter.
   F.UI.keyboard({onKey(ch|'back'|'ok'), parent}) -> {el, glow(ch|null), destroy()}   (qwertyuiopå / asdfghjkløæ / zxcvbnm)
   Common handle API: {el, kind, value(), next() -> Promise<value> (next submit), feed(v) (simulate a submit: tests),
     mark(v,'right'|'wrong'), solution(v) (glow what to do; she executes it), clearMarks(), lock(bool), destroy()}
   F.UI.keyCapture: the widget currently receiving keyboard input (input.js / player.js ignore keys while set).
   Display case: F.UI.caseText() everywhere; values are always lowercase. */
(function () {
'use strict';
const F = window.F;
const UI = F.UI;
const el = (tag, cls, html) => UI.el(tag, cls, html);
let trayEl = null, trayIn = null, ro = null;
function ensureTray() {
  if (trayEl) return;
  trayEl = el('div', 'tray'); trayEl.id = 'tray';
  trayIn = el('div', 'tray-in'); trayEl.appendChild(trayIn);
  trayEl.addEventListener('pointerdown', e => e.stopPropagation());
  trayEl.addEventListener('pointerup', e => e.stopPropagation());
  document.body.appendChild(trayEl);
  const upd = () => document.documentElement.style.setProperty('--tray-h', (trayEl.classList.contains('on') ? trayIn.offsetHeight : 0) + 'px');
  if (window.ResizeObserver) { ro = new ResizeObserver(upd); ro.observe(trayIn); }
  UI._trayUpd = upd;
}
const inTray = () => UI.widgets.filter(w => w.el && trayIn && trayIn.contains(w.el));
UI.trayOpen = false;
UI.tray = function (open, o) {
  ensureTray(); o = o || {};
  if (open) {
    if (!o.keep) { inTray().forEach(w => w.destroy()); trayIn.innerHTML = ''; }
    trayEl.className = 'tray on sk-' + (o.skin || (F.save && F.save.fairy) || 'krystall');
    if (!UI.trayOpen) { UI.trayOpen = true; document.body.classList.add('tray-on'); if (F.HUD && F.HUD.showTray) try { F.HUD.showTray(true); } catch (e) {} F.emit('tray', true); }
  } else if (UI.trayOpen) {
    UI.trayOpen = false;
    trayEl.classList.remove('on', 'locked'); document.body.classList.remove('tray-on');
    if (F.HUD && F.HUD.showTray) try { F.HUD.showTray(false); } catch (e) {}
    F.emit('tray', false);
    inTray().forEach(w => w.destroy());
    setTimeout(() => { if (!UI.trayOpen) trayIn.innerHTML = ''; }, 320);
  }
  UI._trayUpd && UI._trayUpd();
  return trayIn;
};
UI.trayEl = () => { ensureTray(); return trayEl; };
UI.trayLock = function (on) { ensureTray(); trayEl.classList.toggle('locked', !!on); };

/* ---------------------------------------------------------- keyboard routing */
UI.widgets = [];
UI.keyCapture = null;
function capture(w) { UI.widgets.push(w); UI.keyCapture = w; }
function release(w) { const i = UI.widgets.indexOf(w); if (i >= 0) UI.widgets.splice(i, 1); UI.keyCapture = UI.widgets.filter(x => x.onKey).slice(-1)[0] || null; }
document.addEventListener('keydown', e => {
  const w = UI.keyCapture; if (!w || !w.onKey) return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const handled = w.onKey(e.key, e);
  if (handled !== false) { e.preventDefault(); e.stopPropagation(); }
}, true);

/* ---------------------------------------------------------- shared handle plumbing */
function base(kind, o) {
  const h = {
    kind, el: null, locked: false, dead: false, _waits: [], _queue: [],
    next() { if (h._queue.length) return Promise.resolve(h._queue.shift()); return new Promise(r => h._waits.push(r)); },
    _submit(v, i) {
      if (h.locked || h.dead) return false;
      F.emit('uiSubmit', kind, v);
      if (o.onPick) o.onPick(v, i);
      if (o.onSubmit) o.onSubmit(v);
      if (h._waits.length) h._waits.splice(0).forEach(r => r(v)); else if (!o.onPick && !o.onSubmit) h._queue.push(v);
      return true;
    },
    lock(on) { h.locked = !!on; if (h.el) h.el.classList.toggle('locked', h.locked); },
    destroy() { if (h.dead) return; h.dead = true; release(h); if (h.el && h.el.parentNode) h.el.remove(); if (h._extra) h._extra.forEach(x => x.remove && x.remove()); },
  };
  return h;
}
const norm = v => (v && typeof v === 'object' && 'value' in v) ? v.value : v;
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/* ---------------------------------------------------------- choice chips */
UI.chips = function (values, o) {
  o = o || {};
  const kind = o.kind || (typeof norm(values[0]) === 'number' ? 'num' : 'word');
  const h = base('chips', o);
  const wrap = h.el = el('div', 'chips k-' + kind);
  h.values = values.map(norm);
  h.chips = values.map((raw, i) => {
    const v = norm(raw);
    const c = el('button', 'chip k-' + kind);
    c.dataset.i = i; c.dataset.v = String(v); c.style.setProperty('--i', i);
    c.addEventListener('animationend', ev => { if (ev.animationName === 'chipIn') c.dataset.in = '1'; });
    if (kind === 'thumb') {
      const model = (raw && raw.model) || v;
      const img = F.Thumb && F.VOX.has(model) ? F.Thumb.img(model, (raw && raw.opts) || o.opts || {}, { size: 180 }) : null;
      if (img) c.appendChild(img); else c.textContent = UI.caseText((raw && raw.label) || String(v));
    } else {
      const lab = (raw && raw.label != null) ? raw.label : (o.labels ? o.labels[i] : v);
      c.textContent = kind === 'num' ? String(lab) : UI.caseText(lab);
    }
    if (kind !== 'num' && values.length <= 4) { const k = el('span', 'ck', String(i + 1)); c.appendChild(k); }
    c.addEventListener('click', e => { e.stopPropagation(); if (h.locked) return; F.sfx.click(); h._submit(v, i); });
    wrap.appendChild(c);
    return c;
  });
  (o.parent || UI.tray(true, { keep: true })).appendChild(wrap);
  UI._trayUpd && UI._trayUpd();
  // keyboard: digits accumulate for number chips; 1–4 pick by position otherwise
  let buf = '', bufT = 0, bufTimer = null;
  h.onKey = key => {
    if (h.locked) return true;
    if (kind === 'num' && /^[0-9]$/.test(key)) {
      const now = performance.now(); if (now - bufT > 1600) buf = ''; bufT = now; buf += key;
      const vals = h.values.map(String);
      const exact = vals.indexOf(buf), longer = vals.some(x => x !== buf && x.startsWith(buf));
      clearTimeout(bufTimer);
      h.chips.forEach((c, i) => c.classList.toggle('typed', buf && vals[i].startsWith(buf)));
      if (exact >= 0 && !longer) { buf = ''; h.chips.forEach(c => c.classList.remove('typed')); h.chips[exact].click(); }
      else if (exact < 0 && !longer) { buf = ''; h.chips.forEach(c => c.classList.remove('typed')); }
      else if (exact >= 0) bufTimer = setTimeout(() => { const i = vals.indexOf(buf); buf = ''; h.chips.forEach(c => c.classList.remove('typed')); if (i >= 0 && !h.dead && !h.locked) h.chips[i].click(); }, 900);   // «5» when 51 is also there
      return true;
    }
    if (kind !== 'num' && /^[1-9]$/.test(key) && +key <= h.chips.length) { h.chips[+key - 1].click(); return true; }
    return false;
  };
  capture(h);
  h.indexOf = v => h.values.findIndex(x => same(x, v));
  h.mark = (v, cls) => { const i = h.indexOf(v); if (i >= 0) { h.chips[i].classList.remove('right', 'wrong', 'glow'); void h.chips[i].offsetWidth; h.chips[i].classList.add(cls); } };
  h.clearMarks = () => h.chips.forEach(c => c.classList.remove('right', 'wrong', 'glow', 'dim'));
  h.solution = v => { h.chips.forEach((c, i) => { c.classList.remove('wrong'); c.classList.toggle('glow', same(h.values[i], v)); c.classList.toggle('dim', !same(h.values[i], v)); }); };
  h.feed = v => { const i = h.indexOf(v); if (i >= 0) return h._submit(h.values[i], i); return h._submit(v, -1); };
  h.value = () => null;
  h.rect = v => { const i = h.indexOf(v); return i >= 0 ? h.chips[i].getBoundingClientRect() : wrap.getBoundingClientRect(); };
  UI.widgetsChanged && UI.widgetsChanged();
  return h;
};

/* ---------------------------------------------------------- on-screen keyboard */
const ROWS = ['qwertyuiopå', 'asdfghjkløæ', 'zxcvbnm'];
UI.keyboard = function (o) {
  o = o || {};
  const k = el('div', 'kbd'), keys = {};
  ROWS.forEach((row, ri) => {
    const r = el('div', 'kbd-row');
    for (const ch of row) {
      const b = el('button', 'key', UI.caseText(ch)); b.dataset.k = ch; keys[ch] = b;
      b.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); o.onKey && o.onKey(ch); });
      r.appendChild(b);
    }
    if (ri === 2) {
      const bs = el('button', 'key wide', '⌫'); bs.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); o.onKey && o.onKey('back'); }); r.appendChild(bs); keys.back = bs;
    }
    k.appendChild(r);
  });
  if (o.parent) o.parent.appendChild(k);
  return { el: k, keys, glow(ch) { Object.values(keys).forEach(b => b.classList.remove('glow')); if (ch && keys[ch]) keys[ch].classList.add('glow'); }, destroy() { k.remove(); } };
};

/* ---------------------------------------------------------- letter tiles (+ keyboard mode) */
UI.tiles = function (o) {
  o = o || {};
  const h = base('tiles', o);
  const kbMode = o.keyboard || o.letters === 'all';
  const given = o.given ? Array.from(String(o.given)) : null;
  const n = o.slots || (given ? given.length : (kbMode ? 4 : Array.from(o.letters || '').length));
  const ghost = o.ghost ? Array.from(String(o.ghost)) : null;
  const root = h.el = el('div', 'tiles');
  const main = el('div', 'tiles-main'); root.appendChild(main);
  const slotsEl = el('div', 'slots'); main.appendChild(slotsEl);
  const cells = [];
  for (let i = 0; i < n; i++) {
    const g = given && given[i] && given[i] !== '_' ? given[i] : null;
    const s = el('div', 'slot' + (g ? ' given' : ''));
    const gh = el('span', 'gh', ghost && ghost[i] && ghost[i] !== '_' ? UI.caseText(ghost[i]) : '');
    const txt = el('span', 'tx', g ? UI.caseText(g) : '');
    s.appendChild(gh); s.appendChild(txt);
    const cell = { el: s, gh, txt, ch: g, given: !!g, tile: null };
    s.addEventListener('click', e => { e.stopPropagation(); if (h.locked || cell.given || !cell.ch) return; F.sfx.click(); unplace(cell); });
    cells.push(cell); slotsEl.appendChild(s);
  }
  const bank = [];
  let kb = null;
  if (kbMode) {
    kb = UI.keyboard({ onKey: ch => { if (h.locked) return; if (ch === 'back') back(); else placeChar(ch); } });
    root.appendChild(kb.el);
  } else {
    const bankEl = el('div', 'bank'); main.appendChild(bankEl);
    Array.from(o.letters || '').forEach((ch, j) => {
      const t = el('button', 'tile', UI.caseText(ch)); t.dataset.ch = ch; t.style.setProperty('--i', j);
      t.addEventListener('animationend', ev => { if (ev.animationName === 'chipIn') t.dataset.in = '1'; });
      const tile = { el: t, ch, used: false, j };
      t.addEventListener('click', e => { e.stopPropagation(); if (h.locked || tile.used) return; F.sfx.click(); placeTile(tile); });
      bank.push(tile); bankEl.appendChild(t);
    });
  }
  const side = el('div', 'kp-side');
  const ok = el('button', 'okbtn off', '✓');
  ok.addEventListener('click', e => { e.stopPropagation(); if (h.locked) return; submit(); });
  if (!o.auto) { side.appendChild(ok); root.appendChild(side); }
  (o.parent || UI.tray(true, { keep: true })).appendChild(root);
  UI._trayUpd && UI._trayUpd();
  let solWord = null;
  const firstEmpty = () => cells.find(c => !c.ch);
  function refresh() {
    const full = !firstEmpty();
    cells.forEach(c => { c.el.classList.toggle('filled', !!c.ch && !c.given); c.txt.textContent = c.ch ? UI.caseText(c.ch) : ''; c.el.classList.remove('next'); });
    const fe = firstEmpty(); if (fe) fe.el.classList.add('next');
    ok.classList.toggle('off', !full); ok.classList.toggle('ready', full);
    if (solWord) guide();
    o.onChange && o.onChange(h.value());
    if (full && o.auto) F.T.timeout(() => { if (!firstEmpty() && !h.dead) submit(); }, 350);
  }
  function placeTile(tile) {
    const c = firstEmpty(); if (!c) { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); return; }
    c.ch = tile.ch; c.tile = tile; tile.used = true; tile.el.classList.add('used');
    F.sfx.pling && F.sfx.pling(cells.indexOf(c));
    root.classList.remove('wrong', 'right');
    refresh();
  }
  function placeChar(ch) {
    if (kbMode) { const c = firstEmpty(); if (!c) return; c.ch = ch; F.sfx.pling && F.sfx.pling(cells.indexOf(c)); root.classList.remove('wrong', 'right'); refresh(); return; }
    const t = bank.find(b => !b.used && b.ch === ch);
    if (t) placeTile(t); else { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); }
  }
  function unplace(c) { if (c.tile) { c.tile.used = false; c.tile.el.classList.remove('used'); } c.ch = null; c.tile = null; root.classList.remove('wrong', 'right'); refresh(); }
  function back() { const placed = cells.filter(c => c.ch && !c.given); if (placed.length) unplace(placed[placed.length - 1]); }
  function submit() {
    if (firstEmpty()) { const fe = firstEmpty(); fe.el.classList.add('glow'); F.T.timeout(() => fe.el.classList.remove('glow'), 900); return; }
    h._submit(h.value());
  }
  function guide() {
    // solution mode: ghost letters shine; the tile/key for the next needed letter glows
    cells.forEach((c, i) => { c.gh.textContent = c.given ? '' : UI.caseText(solWord[i] || ''); c.gh.classList.add('sol'); });
    const fe = cells.findIndex(c => !c.ch);
    const wrongAt = cells.findIndex((c, i) => c.ch && !c.given && c.ch !== solWord[i]);
    bank.forEach(b => b.el.classList.remove('glow'));
    cells.forEach(c => c.el.classList.remove('glow'));
    if (wrongAt >= 0) { cells[wrongAt].el.classList.add('glow'); if (kb) kb.glow('back'); return; }
    const need = fe >= 0 ? solWord[fe] : null;
    if (kb) kb.glow(need);
    else if (need) { const t = bank.find(b => !b.used && b.ch === need); if (t) t.el.classList.add('glow'); }
    if (fe < 0) ok.classList.add('glow');
  }
  h.onKey = (key) => {
    if (h.locked) return true;
    if (key === 'Backspace') { back(); return true; }
    if (key === 'Enter') { submit(); return true; }
    const ch = key.length === 1 ? key.toLowerCase() : '';
    if (/^[a-zæøå]$/.test(ch)) { placeChar(ch); return true; }
    return false;
  };
  capture(h);
  h.cells = cells; h.bank = bank; h.kb = kb;
  h.value = () => cells.map(c => c.ch || '').join('');
  h.set = str => { cells.forEach(c => { if (!c.given) unplace(c); }); Array.from(str).forEach(ch => placeChar(ch)); };
  h.clear = () => { cells.forEach(c => { if (!c.given) unplace(c); }); };
  h.mark = (v, cls) => { root.classList.remove('wrong', 'right'); void root.offsetWidth; root.classList.add(cls); };
  h.clearMarks = () => { root.classList.remove('wrong', 'right'); };
  h.solution = word => { solWord = Array.from(String(word)); cells.forEach((c, i) => { if (!c.given && c.ch && c.ch !== solWord[i]) unplace(c); }); refresh(); };
  h.setGhost = (i, ch, sol) => { const c = cells[i]; if (!c) return; c.gh.textContent = ch ? UI.caseText(ch) : ''; c.gh.classList.toggle('sol', !!sol); };
  h.slotEl = i => cells[i] && cells[i].el;
  h.feed = v => { h.clear(); const s = Array.from(String(v)); let k = 0; cells.forEach((c, i) => { if (!c.given) { const ch = s[given ? i : k]; if (ch) { if (kbMode) c.ch = ch; else { const t = bank.find(b => !b.used && b.ch === ch); if (t) { c.ch = ch; c.tile = t; t.used = true; t.el.classList.add('used'); } else c.ch = ch; } } } k++; }); refresh(); return h._submit(h.value()); };
  h.rect = () => slotsEl.getBoundingClientRect();
  refresh();
  return h;
};

/* ---------------------------------------------------------- number keypad */
UI.keypad = function (o) {
  o = o || {};
  const len = o.len || o.maxLen || 2;
  const h = base('keypad', o);
  const root = h.el = el('div', 'keypad');
  const disp = el('div', 'kp-display'); root.appendChild(disp);
  const boxes = [];
  for (let i = 0; i < len; i++) { const b = el('div', 'kp-box'); const gh = el('span', 'gh'); const tx = el('span', 'tx'); b.appendChild(gh); b.appendChild(tx); disp.appendChild(b); boxes.push({ el: b, gh, tx }); }
  const keysEl = el('div', 'kp-keys'), keys = {};
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].forEach(d => {
    const b = el('button', 'kp-key', d); keys[d] = b;
    b.addEventListener('click', e => { e.stopPropagation(); if (h.locked) return; F.sfx.click(); type(d); });
    keysEl.appendChild(b);
  });
  root.appendChild(keysEl);
  const side = el('div', 'kp-side');
  const bs = el('button', 'bsbtn', '⌫'); bs.addEventListener('click', e => { e.stopPropagation(); if (h.locked) return; F.sfx.click(); back(); });
  const ok = el('button', 'okbtn off', '✓'); ok.addEventListener('click', e => { e.stopPropagation(); if (h.locked) return; submit(); });
  side.appendChild(bs); if (!o.auto) side.appendChild(ok); root.appendChild(side);
  keys.back = bs;
  (o.parent || UI.tray(true, { keep: true })).appendChild(root);
  UI._trayUpd && UI._trayUpd();
  let val = '', sol = null, stale = false;   // stale: the full entry was just judged wrong → the next digit starts a new entry
  function refresh() {
    boxes.forEach((b, i) => { b.tx.textContent = val[i] || ''; b.el.classList.toggle('filled', !!val[i]); b.gh.textContent = sol ? (sol[i] || '') : ''; });
    ok.classList.toggle('off', !val.length); ok.classList.toggle('ready', val.length === len);
    if (sol) {
      Object.values(keys).forEach(k => k.classList.remove('glow')); ok.classList.remove('glow');
      if (!sol.startsWith(val)) keys.back.classList.add('glow');
      else if (val.length < sol.length) keys[sol[val.length]].classList.add('glow');
      else ok.classList.add('glow');
    } else keys.back.classList.toggle('glow', stale && val.length >= len);
    o.onChange && o.onChange(val);
    if (o.auto && val.length === len) F.T.timeout(() => { if (val.length === len && !h.dead) submit(); }, 350);
  }
  function type(d) { if (stale) { stale = false; if (val.length >= len) val = ''; } if (val.length >= len) { root.classList.remove('wrong'); void root.offsetWidth; root.classList.add('wrong'); return; } val += d; F.sfx.pling && F.sfx.pling(val.length); root.classList.remove('wrong', 'right'); refresh(); }
  function back() { stale = false; val = val.slice(0, -1); root.classList.remove('wrong', 'right'); refresh(); }
  function submit() { if (!val.length) return; h._submit(o.number === false ? val : (+val)); }
  h.onKey = key => {
    if (h.locked) return true;
    if (/^[0-9]$/.test(key)) { type(key); return true; }
    if (key === 'Backspace') { back(); return true; }
    if (key === 'Enter') { submit(); return true; }
    return false;
  };
  capture(h);
  h.value = () => val;
  h.set = s => { val = String(s).slice(0, len); refresh(); };
  h.clear = () => { val = ''; refresh(); };
  h.mark = (v, cls) => { root.classList.remove('wrong', 'right'); void root.offsetWidth; root.classList.add(cls); if (cls === 'wrong') { stale = true; if (!sol && val.length >= len) keys.back.classList.add('glow'); } };
  h.clearMarks = () => root.classList.remove('wrong', 'right');
  h.solution = v => { sol = String(v); stale = false; if (!sol.startsWith(val)) val = ''; refresh(); };
  h.feed = v => { val = String(v).slice(0, len); refresh(); return h._submit(o.number === false ? val : (+val)); };
  h.rect = () => disp.getBoundingClientRect();
  refresh();
  return h;
};
})();
/* UI.seen: counts visible UI reactions (panel, toast, bubble, coins flying, a new label, a tray). The press safety net in things.js
   reads it: a press that opened any of these did visibly react. */
(function () {
'use strict';
const UI = window.F.UI;
UI.seen = 0;
['open', 'toast', 'bubbleAt', 'flyCoins', 'label', 'tray', 'chips', 'tiles', 'keypad'].forEach(k => {
  const f = UI[k]; if (typeof f !== 'function') return;
  UI[k] = function () { UI.seen++; return f.apply(this, arguments); };
});
})();
