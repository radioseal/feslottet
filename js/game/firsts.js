/* Feslottet – F.First: first-time explanations, exactly once in the life of a save (clarity plan 12.10.2026 §3.8 FI + §6). Owner: firsts.
   The world shows its signals by itself; words come only the FIRST time a signal is on screen, once ever, and only when it is calm.
   The seven cues (§6) – at most 7 first-time lines over a whole save:
     beam         the day-1 look turns to the light – tower.js says realm_lyset_forst itself (guard: F.First.seen('beam') / mark('beam'))
     hjelp_boble  a WHITE bubble (task / need / quest offer) is on screen within 12 m, no task → that villager / staff member waves and
                  says life_first_hjelp «Hei! Kan du hjelpe meg?» in their own voice
     dyr          a «?» disc (an animal she has not met) is on screen within 10 m → it looks up, sounds, hops (F.Fauna.greet, else
                  F.Fauna.react) and Puff says fa_new «Se, et nytt dyr!»
     tilbake      'questBack'(id, giver): every step is done and the giver is far → the goal card's ✓ pops (F.Goal.pop) and Puff says
                  q_tilbake_<konge|dronning|mia> («Fly tilbake til kongen!»), q_tilbake for anyone else
     kart         the outdoor map is open → her face pulses there (F.Map.pulseMe) and Puff says first_kart «Her er du!»
     funnet       a found kingdom, after its arrival ceremony, while she is still there → first_funnet «Nå kan jeg fly deg hit. Bare
                  trykk på kartet!» (the crest flying into Kart is R's, every time)
     bod          the first customer at her stall is on screen within 12 m → the customer waves and says st_forst
   Calm (every cue): a game day is running; no title / bedtime screen, no onboarding, no task, no panel (the map is allowed for 'kart'),
     no scripted scene (F.HUD.scene()), no camera look, no cloud ride, no open wand, no golden bedtime light; nothing spoken now nor in
     the last 0.8 s; > 45 s since the last first-time line (any caller). Polled every 0.5 s of game time. On screen = inside the canvas
     AND not under the HUD (the place banner, a HUD button, the goal card, the edge light, the chain strip: F.First.covered(rect)).
   A signal that leaves the screen before it is calm is NOT marked: the cue waits for its next appearance.
   Heard elsewhere = seen: when any module speaks a cue's line (Puff's suggestion fa_new / hud_sug_hjelp, H's q_tilbake_*, tower's
     realm_lyset_forst …), the key is marked (F.TPL.log), so a signal is never explained twice – not while the day-1 onboarding runs
     (a line that slips out then is no explanation), except the light's own line.
   Old saves (the daughter's) are seeded on 'ready' (F.First.seed()): ≥ 1 animal friend → dyr · a found kingdom → beam, funnet · a
     finished quest → tilbake · the outdoor map opened before → kart · a finished wish → hjelp_boble · a stall sale → bod. During play,
     friendMade → dyr, wishDone / chainDone → hjelp_boble, stallSale → bod, realmFound → beam (the funnet cue itself follows the find).
   API (clarity §3.0):
     F.First.seen(k) -> bool             F.First.mark(k) -> bool (true when newly marked; F.save.firsts[k] = day)
     F.First.cue(k, {line, slots, voice, who, when, show, lead, ttl, panelOK, anyTime}) -> Promise<bool>
         an extra once-ever cue from another module: plays when calm while when() holds (dropped, NOT marked, as soon as when() is
         false or after ttl s, default 30); who = an actor (it says the line with its own voice + speech bubble); show() runs first,
         the line follows after lead s (default 0.4). anyTime: skip the calm rule except speech (a scripted moment that owns its timing).
     F.First.KEYS (the 7 keys + 'hjelp_oppg', reserved for the P2 help merge, §9), F.First.seed(), F.First.enabled, F.First.log
     (this session's cues: {k, t, line, voice, who}), F.First.why() (why nothing plays right now – tests), events firstCue(k, info) and
     firstSeen(k, why).
   #test: the cue engine is OFF unless the hash has &firsts or a test sets F.First.enabled = true (seen / mark / seed always work), so
     older #test speech assertions keep their exact lines. Save: F.save.firsts = {key: day}. */
(function () {
'use strict';
const F = window.F;
const KEYS = ['beam', 'hjelp_boble', 'dyr', 'tilbake', 'kart', 'funnet', 'bod', 'hjelp_oppg'];
const GAP = 45, POLL = 0.5, QUIET = 0.8, HJELP_R = 12, DYR_R = 10, BOD_R = 12, FOUND_R = 90;
const ROYAL_LINE = { konge: 'q_tilbake_konge', dronning: 'q_tilbake_dronning', mia: 'q_tilbake_mia' };
// a cue's line heard from ANY caller marks the key (Puff's answers and suggestions explain the same signal)
const HEARD = {
  realm_lyset_forst: 'beam', life_first_hjelp: 'hjelp_boble', hud_sug_hjelp: 'hjelp_boble', fa_new: 'dyr',
  q_tilbake_konge: 'tilbake', q_tilbake_dronning: 'tilbake', q_tilbake_mia: 'tilbake', q_tilbake: 'tilbake',
  first_kart: 'kart', first_funnet: 'funnet', st_forst: 'bod',
};
const store = () => { let s = F.save.firsts; if (!s || typeof s !== 'object' || Array.isArray(s)) s = F.save.firsts = {}; return s; };
const day = () => (F.save && F.save.day) || 1;
const tryv = (fn, d) => { try { return fn(); } catch (e) { return d; } };
const First = F.First = {
  KEYS, GAP,
  enabled: !(F.flags && F.flags.test) || /(^|[#&])firsts\b/.test(location.hash || ''),
  log: [], lastT: -1e9, playing: null,
};
First.seen = k => store()[k] != null;
First.mark = function (k, why) {
  if (!k) return false;
  const s = store(); if (s[k] != null) return false;
  s[k] = day(); if (F.store) F.store();
  F.emit('firstSeen', k, why || 'mark');
  return true;
};

/* ---------------------------------------------------------- calm */
let quietSince = 0;
function calm(o) {
  o = o || {};
  if (!F.booted) return 'boot';
  if (F.Speech && F.Speech.busy && F.Speech.busy()) return 'speech';
  if (F.T.now - quietSince < QUIET) return 'speech';
  if (First.playing) return 'playing';
  if (o.anyTime) return null;
  if (!F.Day || !F.Day.active || F.Day.golden || F.Day.inBed) return 'day';
  if (F.Shell && F.Shell.screen) return 'screen';
  if (F.Onboard && F.Onboard.active) return 'onboard';
  if (F.Task && F.Task.current) return 'task';
  if (!o.panelOK && F.UI && F.UI.isOpen && F.UI.isOpen()) return 'panel';
  if (F.HUD && F.HUD.scene && tryv(() => F.HUD.scene(), null)) return 'scene';
  if (F.HUD && F.HUD.hidden) return 'hud';
  if (F.R && F.R.cam && F.R.cam.look) return 'look';
  if (F.Travel && F.Travel.busy) return 'travel';
  if (F.Wand && F.Wand.isOpen && tryv(() => F.Wand.isOpen(), false)) return 'wand';
  if (F.T.now - First.lastT < GAP) return 'gap';
  return null;
}
First.why = o => calm(o);

/* ---------------------------------------------------------- on screen (and not under the HUD: the place banner, a button, the goal card) */
const V = () => (window.THREE ? new THREE.Vector3() : null);
let _v = null;
const COVER_SEL = '#hud .hud-btn, .hud-place, .hud-goal, .realm-edge, #hchain';
// a screen rect more than a quarter under a visible HUD element: she cannot really see it there (wait until it is clear)
function covered(r) {
  const area = Math.max(1, (r.right - r.left) * (r.bottom - r.top));
  for (const e of document.querySelectorAll(COVER_SEL)) {
    const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue;
    const ix = Math.min(r.right, q.right) - Math.max(r.left, q.left), iy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
    if (ix <= 0 || iy <= 0 || ix * iy <= area * 0.25) continue;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.2) continue;
    return true;
  }
  return false;
}
// a world point inside the visible canvas (3 % margin: a half-cut disc at the very edge does not count) and clear of the HUD
function onScreen(x, y, z) {
  if (!F.R || !F.R.camera || !F.R.renderer) return false;
  _v = _v || V(); if (!_v) return false;
  _v.set(x, y, z).project(F.R.camera);
  if (!(_v.z < 1 && _v.z > -1 && Math.abs(_v.x) < 0.94 && Math.abs(_v.y) < 0.94)) return false;
  const R = F.R.renderer.domElement.getBoundingClientRect(), sx = R.left + (_v.x + 1) / 2 * R.width, sy = R.top + (1 - _v.y) / 2 * R.height;
  return !covered({ left: sx - 18, right: sx + 18, top: sy - 18, bottom: sy + 18 });
}
// a person's wish bubble drawn right now (actors.js shows it only when projected on screen, ≤ 3 within 40 m), not under the HUD
function bubbleOn(a) {
  const el = a && a.bubbleEl;
  if (!el || !el.isConnected || el.style.display === 'none') return false;
  if (a._bubT != null && F.T.now - a._bubT > 0.6) return false;
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth)) return false;
  return !covered(r);
}
First.covered = covered;
const voiceOK = (id, v) => !!(F.TPL && F.TPL.has(id) && F.TPL.all[id].voices.includes(v || ''));
const near = (a, r) => { const P = F.Player.pos; return Math.hypot(a.x - P.x, a.z - P.z) <= r; };
const wave = a => () => { tryv(() => { if (a.facePlayer) a.facePlayer(); if (a.gesture) a.gesture('wave', 1.4); }); };

/* ---------------------------------------------------------- the built-in cues: each returns a play spec or null */
let back = null;                 // the last 'questBack' {id, giver, t}
const foundT = {};               // realmFound time per kingdom (this session)
const DET = {};

// a white bubble (an invitation: task / need / a quest offer) on screen within 12 m
DET.hjelp_boble = function () {
  if (!F.Act || !F.Act.list) return null;
  for (const a of F.Act.list) {
    const w = a && a.wish;
    if (!w || a.royal || a.kind === 'animal' || a.busy || a.temp || a.job === 'kunde') continue;
    if (w.gold || !['task', 'need', 'quest'].includes(w.kind)) continue;
    if (!a.here || !a.here() || !near(a, HJELP_R) || !bubbleOn(a)) continue;
    const cl = a.bubbleEl.classList; if (cl.contains('gold') || cl.contains('thing')) continue;      // only a white bubble
    if (!voiceOK('life_first_hjelp', a.voice)) continue;
    return { line: 'life_first_hjelp', who: a, show: wave(a), lead: 0.5 };
  }
  return null;
};

// a «?» animal on screen within 10 m (FA's unknownNear when it lands, else the same rule fauna.js draws the disc by)
function unknownNear(x, z, r) {
  const FA = F.Fauna; if (!FA) return [];
  if (typeof FA.unknownNear === 'function') return tryv(() => FA.unknownNear(x, z, r) || [], []);
  if (typeof FA.near !== 'function') return [];
  const has = sp => tryv(() => !!(F.Album && F.Album.has && F.Album.has(sp)), false);
  return tryv(() => FA.near(x, z, r).filter(q => q && !q.dead && q.sp && !q.sp.zoo && (q.pop == null || q.pop > 0.5) && (q.i === 0 || !q.g || q.g.n <= 3) && !has(q.sp.id)), []);
}
function greet(rec) {
  const FA = F.Fauna; if (!FA || !rec) return;
  if (typeof FA.greet === 'function') { tryv(() => FA.greet(rec)); return; }
  if (typeof FA.react === 'function') { tryv(() => FA.react(rec, 'tilt')); F.T.timeout(() => tryv(() => FA.react(rec, 'happy')), 450); }
}
DET.dyr = function () {
  if (!F.Space || F.Space.cur !== 'out' || !F.Fauna || !F.Player) return null;
  if (F.Fauna.invite && tryv(() => F.Fauna.invite(), null)) return null;     // she is already with one (its heart invite)
  const P = F.Player.pos;
  for (const r of unknownNear(P.x, P.z, DYR_R)) {
    const y = (r.y || 0) + 0.9;                    // about where the disc floats over a small animal
    if (!onScreen(r.x, y, r.z) && !onScreen(r.x, (r.y || 0) + 0.3, r.z)) continue;
    return { line: 'fa_new', voice: '', show: () => greet(r), lead: 0.7, rec: r };
  }
  return null;
};

// every step of a goal is done and the giver is far: the ✓ on the goal card, «Fly tilbake til …!»
const running = id => {
  const q = F.save.quests; if (q && q.list && q.list[id]) return true;
  const rq = F.save.rq; if (rq && rq.active) for (const k in rq.active) if (rq.active[k] === id || k === id) return true;
  return false;
};
DET.tilbake = function () {
  if (!back) return null;
  const b = back;
  if (F.Quest && typeof F.Quest.goal === 'function') {
    const g = tryv(() => F.Quest.goal(), null);
    if (!g || g.state !== 'back' || (g.id != null && b.id != null && g.id !== b.id)) { if (!running(b.id) && F.T.now - b.t > 2) back = null; return null; }
  } else if (b.id != null && !running(b.id) && F.T.now - b.t > 2) { back = null; return null; }
  const giver = F.Act && F.Act.byId ? F.Act.byId(b.giver) : null;
  if (giver && giver.space === (F.Space && F.Space.cur) && near(giver, 12)) return null;     // she is there already
  if (F.Goal && F.Goal.el) { const el = F.Goal.el; if (!el.isConnected || !el.classList.contains('on')) return null; }   // the card shows it
  const line = ROYAL_LINE[b.giver] || 'q_tilbake';
  return { line, voice: '', show: () => { if (F.Goal && typeof F.Goal.pop === 'function') tryv(() => F.Goal.pop()); }, lead: 0.35 };
};

// the outdoor map is open: «Her er du!» while her face pulses there
DET.kart = function () {
  const M = F.Map;
  if (!M || !M.isOpen || M.overview || (F.Space && F.Space.cur !== 'out')) return null;
  return { line: 'first_kart', voice: '', panelOK: true, show: () => { if (typeof M.pulseMe === 'function') tryv(() => M.pulseMe()); }, lead: 0.3 };
};

// a found kingdom, after the arrival ceremony (the glance, the royals' greeting), while she is still there
DET.funnet = function () {
  const s = F.save.realm; if (!s || !s.found || !F.Realm || !F.Realm.gate || F.Space.cur !== 'out') return null;
  const P = F.Player.pos;
  for (const id in s.found) {
    if (foundT[id] != null && F.T.now - foundT[id] < 4.5) return null;
    const g = tryv(() => F.Realm.gate(id), null);
    if (!g || Math.hypot(g.x - P.x, g.z - P.z) > FOUND_R) continue;
    if (F.Map && typeof F.Map.canRide === 'function' && !tryv(() => F.Map.canRide({ realm: id }), true)) continue;
    return { line: 'first_funnet', voice: '', lead: 0 };
  }
  return null;
};

// the first customer at her stall on screen within 12 m
DET.bod = function () {
  const S = F.Stall; if (!S || !S.queue || !S.queue.length) return null;
  for (const a of S.queue) {
    if (!a || a.busy || a._leaving || !a.wish || a.wish.kind !== 'stall') continue;
    if (!a.here || !a.here() || !near(a, BOD_R) || !bubbleOn(a)) continue;
    if (!voiceOK('st_forst', a.voice)) continue;
    return { line: 'st_forst', who: a, show: wave(a), lead: 0.5 };
  }
  return null;
};
const ORDER = ['tilbake', 'kart', 'funnet', 'bod', 'hjelp_boble', 'dyr'];

/* ---------------------------------------------------------- play */
async function play(k, c) {
  if (!First.mark(k, 'cue')) return false;
  const who = c.who || null;
  First.lastT = F.T.now; First.playing = k;
  const info = { k, t: +F.T.now.toFixed(2), line: c.line || null, voice: who ? who.voice : (c.voice || ''), who: who ? who.id : null };
  First.log.push(info);
  F.emit('firstCue', k, info);
  if (who) who._first = k;                       // stall.js may skip its own «Hei!» for this customer
  try {
    if (c.show) { try { c.show(); } catch (e) { console.warn('[First] show', k, e); } }
    const lead = c.lead != null ? c.lead : 0.4;
    if (lead > 0) await F.T.sleep(lead * 1000);
    if (c.line && F.TPL && F.TPL.has(c.line)) {
      if (who && typeof who.say === 'function') await who.say(c.line, c.slots || {});
      else await F.SAY(c.line, c.slots || {}, c.voice || '');
    }
  } catch (e) { console.error('[First] play', k, e); }
  finally { First.playing = null; First.lastT = Math.max(First.lastT, F.T.now - 0.001); }
  return true;
}

/* ---------------------------------------------------------- extra cues from other modules */
const pending = new Map();
First.cue = function (k, o) {
  o = o || {};
  if (!k || First.seen(k)) return Promise.resolve(false);
  if (!KEYS.includes(k)) console.warn('[First] cue for an unknown key (the once-ever budget is §6):', k);
  const old = pending.get(k); if (old) old.res(false);
  return new Promise(res => pending.set(k, { k, o, t0: F.T.now, res }));
};
function pollPending() {
  for (const [k, p] of pending) {
    const o = p.o;
    if (First.seen(k)) { pending.delete(k); p.res(false); continue; }
    const live = typeof o.when === 'function' ? tryv(() => !!o.when(), false) : true;
    if (!live || F.T.now - p.t0 > (o.ttl != null ? o.ttl : 30)) { pending.delete(k); p.res(false); continue; }
    if (calm(o)) continue;
    pending.delete(k);
    play(k, o).then(p.res, () => p.res(false));
    return true;
  }
  return false;
}

/* ---------------------------------------------------------- heard elsewhere = seen */
let logN = 0;
function readLog() {
  const L = F.TPL && F.TPL.log; if (!L || !L.length) return;
  for (const e of L) {
    if (!e || e.n <= logN) continue;
    logN = e.n;
    const k = HEARD[e.id];
    // a line that slips out during the day-1 onboarding (not calm, often off screen) is no explanation – except the light's own line
    if (!k || (k !== 'beam' && F.Onboard && F.Onboard.active)) continue;
    if (First.mark(k, 'heard:' + e.id)) First.lastT = F.T.now;
  }
}

/* ---------------------------------------------------------- old saves: what she has already done */
const nonEmpty = o => !!o && typeof o === 'object' && Object.keys(o).length > 0;
function evidence() {
  const S = F.save, ev = Array.isArray(S.events) ? S.events : [];
  const friends = tryv(() => (F.Album && F.Album.count ? F.Album.count() : 0), 0) ||
    tryv(() => Object.keys((S.album && S.album.friends) || (S.befriend && S.befriend.friends) || {}).length, 0);
  const found = tryv(() => Object.keys((S.realm && S.realm.found) || {}).length, 0);
  const qd = (S.quests && S.quests.done) || {};
  const doneQ = Object.keys(qd).some(id => /^Q\d+/.test(id) && Array.isArray(qd[id]) && qd[id].length) ||
    nonEmpty(S.rq && S.rq.done) || ev.some(e => e && e.type === 'questDone' && !e.chain);
  const sat = (S.life && S.life.sat && S.life.sat.ids) || {};
  const wish = ev.some(e => e && (e.type === 'wish' || (e.type === 'questDone' && e.chain))) ||
    Object.keys(qd).some(id => !/^Q\d+/.test(id) && Array.isArray(qd[id]) && qd[id].length) ||
    Object.keys(sat).some(id => sat[id] === 'wish' || sat[id] === 'chain');
  const map = nonEmpty(S.map && S.map.seen);
  const sold = ((S.stall && +S.stall.sold) || 0) > 0 || ev.some(e => e && e.type === 'stallSale');
  return { dyr: friends > 0, beam: found > 0, funnet: found > 0, tilbake: doneQ, kart: map, hjelp_boble: wish, bod: sold };
}
First.evidence = evidence;
First.seed = function () {
  const e = tryv(evidence, {}), out = [];
  for (const k in e) if (e[k] && First.mark(k, 'save')) out.push(k);
  return out;
};

/* ---------------------------------------------------------- wiring */
F.on('ready', () => {
  try { store(); First.seed(); } catch (e) { console.error('[First] seed', e); }
  logN = (F.TPL && F.TPL.logN) || 0;
  if (F.dbg) F.dbg.firsts = () => ({ seen: Object.assign({}, store()), log: First.log.slice(), why: calm(), enabled: First.enabled, back, pending: [...pending.keys()] });
});
F.on('friendMade', () => First.mark('dyr', 'friendMade'));
F.on('wishDone', () => First.mark('hjelp_boble', 'wishDone'));
F.on('chainDone', () => First.mark('hjelp_boble', 'chainDone'));
F.on('stallSale', () => First.mark('bod', 'stallSale'));
F.on('realmFound', id => { foundT[id] = F.T.now; First.mark('beam', 'realmFound'); });
F.on('questBack', (id, giver) => { if (!First.seen('tilbake')) back = { id: id != null ? id : null, giver: giver || null, t: F.T.now }; });
F.on('questDone', id => { if (back && (back.id == null || back.id === id)) back = null; });

let acc = 0;
F.on('tick', dt => {
  if (!F.booted) return;
  if (F.Speech && F.Speech.busy && F.Speech.busy()) quietSince = F.T.now;
  acc += dt || 0; if (acc < POLL) return; acc = 0;
  try {
    readLog();
    if (pending.size && pollPending()) return;
    if (!First.enabled || First.playing) return;
    const base = calm({ panelOK: true });
    if (base) return;
    const panel = F.UI && F.UI.isOpen && F.UI.isOpen();
    for (const k of ORDER) {
      if (First.seen(k)) continue;
      const c = tryv(() => DET[k](), null);
      if (!c) continue;
      if (panel && !c.panelOK) continue;
      play(k, c);
      return;
    }
  } catch (e) { console.error('[First] tick', e); }
});
})();
