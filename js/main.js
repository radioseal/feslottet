/* Feslottet – boot + session frame (SHELL WP; DESIGN §9.10). Loaded last.
   boot → F.emit('boot') (modules build areas) → avatar → spawn → F.booted → F.emit('ready') → shell:
     #skip: no title / fairy select; day 1 starts in Fetårnet without envelopes.
     else:  title (SPILL) → fairy select (first time, or #fairy=… preselects) → day start.
   F.Day = { begin(o), active, extend(min), bedtime(o), limitSec(), golden(on) }
   New day: the date changed or ≥ 4 h since the last session → wake in Fetårnet, F.Quest.dayStart(day) (Pip + envelopes), 'dayStart'.
   Bedtime (settings.bedtimeMin 15/25/40/0=off, + extendToday): «Snart er det leggetid» → 2 min → golden light + 'bedtime'
     (+ F.Quest.bedtimeStory() if LIFE provides it) → summary screen → «God natt!» → «Ny dag i morgen». The parent can extend.
   First run (brand-new save): Puff's onboarding (js/game/onboard.js) runs after «God morgen!» and starts the day itself
     (emits 'dayStart' → Pip's post) at its last step; a reload mid-way resumes it.
   F.Shell.toTitle(): the pause menu's «til tittelskjermen» (title over the live castle → SPILL resumes the same day and place).
   Debug: F.dbg.newDay(), F.dbg.bedtime(), F.dbg.pause(on), F.dbg.parent(), F.dbg.gate(), F.dbg.onboard().
   DESIGN2 (WP2 HOME, §2.8–2.9): the day starts in Fetårnet (F.Tower.wake: the cloud bed, a hop down, «God morgen!»); the morning post
   (emit 'dayStart' → Pip → the mailbox) waits until she walks out of the tower (the castle glance first), or 45 s, or F.Day.postNow().
   Bedtime: golden light + «Nå er det leggetid. Vi flyr hjem!» → one tap or 8 s → F.Travel.toHome({bedtime}) (fallback: dip to the
   cloud bed) → Mia's story in the tower → summary. F.save.pos = {space:'out', x, z} | {space:'in', b, f, x, z} (F.Bld.pos()); legacy
   {space:'in', room} saves migrate on boot (fetarn → tarn f0 at the bed, stjernetarn → tarn f1, other rooms → slott). */
(function () {
'use strict';
const F = window.F;
const KINDS = ['krystall', 'blomst', 'boble', 'stjerne'];
const Day = F.Day = { active: false, started: false, golden: false, inBed: false };
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------------------------------------------------------- settings (save.settings is the source of truth) */
function syncSettings() {
  const s = F.save.settings = F.save.settings || {};
  if (s.sound == null) s.sound = true;
  if (s.music == null) s.music = true;
  if (s.bedtimeMin == null) s.bedtimeMin = 25;
  if (s.numWeight == null) s.numWeight = 50;
  if (s.upper == null) s.upper = false;
  if (s.extendToday == null) s.extendToday = 0;
  if (F.audioSettings) { F.audioSettings.sound = s.sound !== false; F.audioSettings.music = s.music !== false; }
  if (F.audio && F.audio.apply) F.audio.apply();
}

/* ---------------------------------------------------------- boot */
function boot() {
  F.R.start();
  F.Input.attach();
  F.R.scene.add(F.Player.obj);
  syncSettings();
  if (F.flags.fairy && KINDS.includes(F.flags.fairy)) F.save.fairy = F.flags.fairy;
  F.emit('boot');                       // modules build hand-made areas, register, read save
  F.Player.setAvatar(F.save.fairy || 'krystall');
  try { F.save.pos = migratePos(F.save.pos); } catch (e) { console.error('[shell] migrate pos', e); }
  const p = F.save.pos;
  if (p && F.save.intro && p.space !== 'in') F.Player.teleport(p.x != null ? p.x : p[0], p.z != null ? p.z : p[1]);
  else F.Player.teleport(F.spawnPoint ? F.spawnPoint.x : 0, F.spawnPoint ? F.spawnPoint.z : 6);
  F.booted = true;
  F.emit('ready');                      // title / fairy select / day start (SHELL) take over
  start().catch(e => console.error('[shell] start', e));
}
async function start() {
  F.HUD.build();
  if (F.flags.collect) { F.HUD.show(true); return; }
  if (F.flags.skip) { await Day.begin({ skip: true }); return; }
  const how = await F.Title.show();
  if (how === 'new') { try { localStorage.removeItem('feslottet_v1'); } catch (e) {} F.store = function () {}; location.reload(); return; }
  if (how === 'first' || !F.save.fairy || !F.save.intro) {
    const kind = await F.Title.fairySelect(F.flags.fairy || F.save.fairy || null);
    F.save.fairy = kind; F.Player.setAvatar(kind); F.store();
    F.emit('fairyChosen', kind);
  }
  await Day.begin({});
}
F.Shell = F.Shell || { screen: null };
F.Shell.start = start;
// pause menu → «til tittelskjermen»: the title over the live castle; SPILL comes back to the same place (same day)
F.Shell.toTitle = async function () {
  if (F.Shell.screen || F.Task.current) return;
  F.save.pos = posNow();
  F.save.lastPlayAt = Date.now(); F.store(true);
  Day.active = false;
  F.Speech.clearQueue();
  if (F.Wand.isOpen && F.Wand.isOpen()) F.Wand.close();
  F.UI.closeAll();
  if (F.Map && F.Map.isOpen) F.Map.close();
  const how = await F.Title.show();
  if (how === 'new') { try { localStorage.removeItem('feslottet_v1'); } catch (e) {} F.store = function () {}; location.reload(); return; }
  await Day.begin({ fromTitle: true });
};

/* ---------------------------------------------------------- the day */
function isNewDay(now) {
  const last = F.save.lastPlayAt;
  if (!F.save.day || !last || !F.save.today) return true;
  if (ymd(last) !== ymd(now)) return true;
  return now - last >= 4 * 3600 * 1000;
}
function newDay(now) {
  F.save.day = (F.save.day || 0) + 1;
  F.save.today = { day: F.save.day, date: ymd(now), start: now, playSec: 0, earned: 0, words: {}, floors: {}, bedDone: false, warned: false };
  F.save.settings.extendToday = 0;
  Day.goldenOn(false);
}
function restoreCam() {
  const c = F.R.cam;
  c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw)); c.yawGoal = c.yaw;
  if (F.Space.cur === 'out') { F.Space.set('out'); F.R.cam.target.copy(F.Player.pos); }
}
// she wakes on the cloud bed in Fetårnet (F.Tower, WP2); hop() after the sunrise fade. Falls back to the doorstep outside.
async function wakeInTower() {
  let ok = false;
  try { ok = !!(F.Tower && F.Tower.wake && await F.Tower.wake({ hop: false })); } catch (e) { console.error('[shell] wake', e); }
  if (!ok) {
    try { if (F.Castle && F.Castle.room && F.Castle.room('fetarn') && F.Castle.enter) { F.Castle.enter('fetarn'); ok = F.Space.cur === 'in'; } } catch (e) { console.error('[shell] wake legacy', e); }
  }
  if (!ok) { const s = F.spawnPoint || { x: 0, z: 6 }; if (F.Space.cur !== 'out') F.Space.set('out', { x: s.x, z: s.z }); else F.Player.teleport(s.x, s.z); restoreCam(); }
  return ok;
}
/* ---------------------------------------------------------- position save (DESIGN2 §2.9) */
const bldReal = () => !!(F.Tower && F.Tower.real && F.Tower.real());
function posNow() {
  const P = F.Player.pos, x = +P.x.toFixed(1), z = +P.z.toFixed(1);
  if (F.Space.cur !== 'in') return { space: 'out', x, z };
  if (bldReal() && F.Bld.pos) { try { const b = F.Bld.pos(); if (b && b.b) return Object.assign({ space: 'in' }, b, { space: 'in' }); } catch (e) { console.error('[shell] Bld.pos', e); } }
  // legacy castle rooms (stub engine): keep the old room key (+ the new format where it is known)
  const room = F.Castle && F.Castle.cur || null;
  const o = { space: 'in', x, z, room };
  if (room === 'fetarn' || room === 'stjernetarn') { o.b = 'tarn'; o.f = room === 'fetarn' ? 0 : 1; o.legacy = true; }
  return o;
}
F.Shell.posNow = posNow;
const LEGACY_FLOOR = { hall: 0, kjokken: 0, spisesal: 0, tronsal: 0, ballsal: 0, bibliotek: 1, musikkrom: 1, heis1: 1, skattkammer: 1, ordmuseum: 1, mia: 2, soverom: 2, heis2: 2, bad: 2, garderobe: 2 };
function migratePos(p) {
  if (!p || p.space !== 'in' || p.b) return p;
  const room = p.room || 'fetarn';
  if (room === 'fetarn') return { space: 'in', b: 'tarn', f: 0, at: 'bed', room };
  if (room === 'stjernetarn') return { space: 'in', b: 'tarn', f: 1, room };
  let f = LEGACY_FLOOR[room];
  try { const r = F.Castle && F.Castle.room && F.Castle.room(room); if (r && r.floor != null) f = r.floor; } catch (e) { /* unknown room */ }
  return { space: 'in', b: 'slott', f: f || 0, room, x: p.x, z: p.z, at: { room } };
}
F.Shell.migratePos = migratePos;
// resume indoors: the building engine restores {b, f, x, z}; the tower bed and the legacy castle rooms are handled here
async function resumeIn(p) {
  try {
    if (bldReal()) {
      if (p.b === 'tarn' && (p.at === 'bed' || p.x == null)) { if (await F.Tower.wake({ hop: false })) { await F.Tower.hop(); return true; } }
      else {
        // a royal castle is rebuilt first (WP3); a royal castle never holds earned things, so failing puts her outside its door
        if (p.b && /^rk_/.test(p.b) && F.Realm && F.Realm.ensure) { try { await F.Realm.ensure(p.b.slice(3)); } catch (e) { console.error('[shell] Realm.ensure', e); } }
        if (F.Bld.restore && await F.Bld.restore(p) && F.Space.cur === 'in') return true;
      }
    }
    // stub engine: the old castle rooms (Fetårnet is still floor 3 there)
    const room = p.room || (p.b === 'tarn' ? (p.f === 1 ? 'stjernetarn' : 'fetarn') : null);
    if (room && F.Castle && F.Castle.room && F.Castle.room(room) && F.Castle.enter) { F.Castle.enter(room); if (F.Space.cur === 'in') return true; }
  } catch (e) { console.error('[shell] resume in', e); }
  // a royal castle that cannot be rebuilt (or anything else): outside its door / at the tower door
  let at = null;
  try { if (p.b && /^rk_/.test(p.b) && F.Realm && F.Realm.door) at = F.Realm.door(p.b.slice(3)); } catch (e) { at = null; }
  at = at || F.spawnPoint || { x: 0, z: 6 };
  F.Space.set('out', { x: at.x, z: at.z });
  return false;
}
/* ---------------------------------------------------------- the morning post: 'dayStart' (Pip + envelopes) once she is outside */
Day.postPending = false;
Day.postNow = function (why) {
  if (!Day.postPending) return false;
  Day.postPending = false;
  if (F.save.today) { F.save.today.postDue = false; F.store(); }
  if (F.dbg && F.dbg.events) F.dbg.events.push({ t: +F.T.now.toFixed(2), ev: 'postNow', args: [why || ''] });
  dayStart();
  return true;
};
function dayStart() {
  F.emit('dayStart', F.save.day, { skip: false });
  if (F.Quest && typeof F.Quest.dayStart === 'function') { try { F.Quest.dayStart(F.save.day); } catch (e) { console.error('[shell] Quest.dayStart', e); } }
}
Day.begin = async function (o) {
  o = o || {};
  const now = Date.now();
  if (F.Title.closeBedtime) F.Title.closeBedtime();
  await endTask('newday');
  const fresh = !!o.forceNew || isNewDay(now);
  syncSettings();
  if (fresh) newDay(now);
  F.save.intro = true; F.save.lastPlayAt = now;
  F.save.stats = F.save.stats || {};
  // pause → «til tittelskjermen» → SPILL is the same session (parent stats): count only real starts and new days
  if (!o.fromTitle || fresh) { F.save.stats.sessions = (F.save.stats.sessions || 0) + 1; if (F.Prog.dayRec) F.Prog.dayRec().sessions++; }
  F.save.stats.days = F.save.day;
  F.store();
  Day.started = true; Day.active = true; Day.inBed = false;
  F.Player.obj.visible = true;
  F.HUD.show(true); F.HUD.setCoins(F.Eco.coins());
  F.Input.enabled = true; F.Player.frozen = false;
  const td = F.save.today;
  // a brand-new save: Puff's onboarding runs first and starts the day (Pip's post) at its last step
  const onb = !o.skip && F.Onboard && F.Onboard.needed && F.Onboard.needed();
  if (fresh) {
    Day.postPending = false;
    let inTower = false;
    if (o.skip) inTower = await wakeInTower(); else await F.HUD.fade(async () => { inTower = await wakeInTower(); }, { sunrise: true });
    const morning = F.TPL.has('home_morgen') ? 'home_morgen' : 'hud_morning';
    // #skip = «day 1 in Fetårnet without envelopes»: LIFE delivers the envelopes on 'dayStart', so it is not emitted then
    if (!onb && !o.skip) {
      // the post comes when she walks out (F.Tower: the castle glance, then the mailbox), at the latest after 45 s
      Day.postPending = true; F.save.today.postDue = true; F.store();
      if (o.postNow || !inTower || !(F.Tower && F.Tower.inside && F.Tower.inside())) Day.postNow('begin');
      else F.T.timeout(() => Day.postNow('timeout'), 45000);
    }
    if (F.Tower && F.Tower.hop) await F.Tower.hop();             // the hop down from the cloud bed
    if (onb) { F.SAY(morning); F.Onboard.run({ dayStart }); }   // Puff pops in during «God morgen» (her line queues after it)
    else F.SAY(morning);
  } else {
    const p = F.save.pos;
    const resume = async () => {
      if (p && p.space === 'in') { await resumeIn(p); if (F.Space.cur !== 'in') restoreCam(); return; }
      if (p && p.x != null && Math.hypot(F.Player.pos.x - p.x, F.Player.pos.z - p.z) > 1) F.Player.teleport(p.x, p.z);
      restoreCam();
    };
    if (p && (p.space === 'in' || (p.x != null && Math.hypot(F.Player.pos.x - p.x, F.Player.pos.z - p.z) > 30))) await F.HUD.fade(resume); else resume();
    if (onb) F.SAY('hud_continue').then(() => F.Onboard.run({ dayStart }));     // she left mid-way: Puff picks up where they were
    else F.SAY('hud_continue');
    // a reload before the morning post came: it still comes (on the way out of the tower, or soon)
    if (!onb && td && td.postDue && !Day.postPending) {
      Day.postPending = true;
      if (!(F.Tower && F.Tower.inside && F.Tower.inside())) F.T.timeout(() => Day.postNow('resume'), 3000);
      else F.T.timeout(() => Day.postNow('timeout'), 45000);
    }
  }
  F.emit('sessionStart', F.save.day, fresh);
  if (td.bedDone && Day.limitSec() && td.playSec >= Day.limitSec()) { Day.active = false; F.T.timeout(() => F.Title.bedtime(F.Prog.today()), 300); }
  return F.save.day;
};

// a task still running at bedtime / a new day: end it cleanly (no coins, no report) so its tray never lingers
async function endTask(why) {
  if (!(F.Task && F.Task.current && typeof F.Task.abort === 'function')) return;
  try { await Promise.race([F.Task.abort(why), new Promise(r => setTimeout(r, 4000))]); } catch (e) { console.error('[shell] Task.abort', e); }
}
/* ---------------------------------------------------------- bedtime */
Day.limitSec = () => { const s = F.save.settings || {}; return s.bedtimeMin ? (s.bedtimeMin + (s.extendToday || 0)) * 60 : 0; };
let veil = null;
const LIGHT = {};
Day.goldenOn = function (on) {
  if (on == null) on = true;
  if (!veil) { veil = document.createElement('div'); veil.className = 'golden-veil'; document.body.appendChild(veil); }
  if (!LIGHT.saved && F.R.hemi) { LIGHT.saved = true; LIGHT.hemi = F.R.hemi.color.getHex(); LIGHT.sun = F.R.sun.color.getHex(); LIGHT.inHemi = F.R.inHemi ? F.R.inHemi.color.getHex() : null; }
  Day.golden = !!on;
  veil.classList.toggle('on', !!on);
  if (!F.R.hemi) return;
  const to = on ? { hemi: 0xfff3e0, sun: 0xffe0b4, inHemi: 0xfff2e2 } : { hemi: LIGHT.hemi, sun: LIGHT.sun, inHemi: LIGHT.inHemi };
  const a = { hemi: F.R.hemi.color.clone(), sun: F.R.sun.color.clone(), inHemi: F.R.inHemi ? F.R.inHemi.color.clone() : null };
  F.T.tween(on ? 6000 : 300, k => {
    F.R.hemi.color.copy(a.hemi).lerp(new THREE.Color(to.hemi), k);
    F.R.sun.color.copy(a.sun).lerp(new THREE.Color(to.sun), k);
    if (a.inHemi && to.inHemi != null) F.R.inHemi.color.copy(a.inHemi).lerp(new THREE.Color(to.inHemi), k);
  });
};
let bedTok = 0;
function tapOr(ms) {
  return new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; removeEventListener('pointerdown', fin, true); res(); };
    addEventListener('pointerdown', fin, true);
    F.T.timeout(fin, ms);
  });
}
async function flyHome() {
  if (F.Tower && F.Tower.inside && F.Tower.inside()) { F.emit('dayFlow', 'bed'); return true; }
  let ok = false;
  try { ok = !!(F.Travel && F.Travel.toHome && await F.Travel.toHome({ bedtime: true })); } catch (e) { console.error('[shell] Travel.toHome', e); }
  if (ok && F.Tower && F.Tower.inside && F.Tower.inside()) return true;
  // fallback (no travel module yet): a dip and she is on the cloud bed
  try { await F.HUD.fade(async () => { if (F.Tower && F.Tower.toBed) await F.Tower.toBed(); }); } catch (e) { console.error('[shell] flyHome', e); }
  return !!(F.Tower && F.Tower.inside && F.Tower.inside());
}
Day.flyHome = flyHome;
// bedtime: the saved position is the cloud bed (the 5 s saver stops with Day.active), never her last outdoor spot
function bedPos() {
  try {
    F.save.pos = (F.Tower && F.Tower.inside && F.Tower.inside()) ? { space: 'in', b: 'tarn', f: 0, at: 'bed' } : posNow();
    F.save.lastPlayAt = Date.now(); F.store(true);
  } catch (e) { console.error('[shell] bed pos', e); }
}
// parent 11.10. («we got flown for goodnight story while in a task, the task came along … better to wait until task finishes»):
// calm = no task, no series, no befriend encounter, no throne ceremony, no panel; bedtime waits for it (up to 10 min) and checks
// again right before the ride home
const calm = () => !F.Task.current && !(F.Task && F.Task._series) && !(F.Befriend && F.Befriend.busy) && !(F.Throne && F.Throne.busy)
  && !F.UI.isOpen() && !(F.Shell && F.Shell.screen);
async function waitCalm(maxSec) { const t0 = F.T.now; while (!calm() && F.T.now - t0 < maxSec) await F.T.sleep(500); }
Day.bedtime = async function (o) {
  o = o || {};
  if (Day.inBed) return; Day.inBed = true;
  const tok = ++bedTok, td = F.save.today || (F.save.today = { playSec: 0, earned: 0, words: {}, floors: {} });
  if (!td.warned) { td.warned = true; td.warnAt = td.playSec; if (!o.fast) await F.SAY('hud_bed_soon'); }
  if (!o.fast) { while (td.playSec < (td.warnAt || 0) + 120 && tok === bedTok) await F.T.sleep(1000); }
  if (tok !== bedTok) return;
  if (!Day.golden) Day.goldenOn(true);
  F.emit('bedtime', 'golden');
  // «Nå er det leggetid. Vi flyr hjem!» → one tap or 8 s → the cloud ride home to the cloud bed (DESIGN2 §2.8.6)
  await waitCalm(o.fast ? 0 : 600);
  if (tok !== bedTok) return;
  await F.SAY(F.TPL.has('home_leggetid') ? 'home_leggetid' : 'hud_bed_golden');
  if (!o.fast) await tapOr(8000);
  if (tok !== bedTok) return;
  await waitCalm(o.fast ? 0 : 600);          // a task she started during «Vi flyr hjem!» finishes first
  if (tok !== bedTok) return;
  await flyHome();
  if (tok !== bedTok) return;
  bedPos();                                                   // a tab closed from here on reopens in the tower bed
  F.emit('bedtime', 'home');
  if (!o.fast) {
    if (F.Quest && typeof F.Quest.bedtimeStory === 'function') {
      try { await Promise.race([Promise.resolve(F.Quest.bedtimeStory()), F.T.sleep(6 * 60 * 1000)]); } catch (e) { console.error('[shell] bedtimeStory', e); }
    } else await F.T.sleep(60 * 1000);
    await waitCalm(5 * 60);
  }
  if (tok !== bedTok) return;
  await endTask('bedtime');
  if (tok !== bedTok) return;
  if (F.UI.isOpen()) F.UI.closeAll();
  td.bedDone = true; bedPos();
  Day.active = false;
  F.Speech.clearQueue();
  F.emit('bedtime', 'summary');
  F.Title.bedtime(F.Prog.today());
};
Day.extend = function (min) {
  min = min || 15;
  const s = F.save.settings; s.extendToday = (s.extendToday || 0) + min;
  const td = F.save.today || {};
  bedTok++; Day.inBed = false; td.warned = false; td.bedDone = false;
  if (Day.golden) Day.goldenOn(false);
  if (F.Shell.screen === 'bed') { F.Title.closeBedtime(); Day.active = true; F.HUD.show(true); F.SAY('hud_bed_extend'); }
  F.store();
  F.emit('extend', s.extendToday);
  return s.extendToday;
};
// coins earned today (for the bedtime summary)
F.on('coins', (total, delta) => { if (delta > 0 && F.save.today && Day.started) F.save.today.earned = (F.save.today.earned || 0) + delta; });

/* ---------------------------------------------------------- per-frame: play time, bedtime clock, position save */
let acc = 0;
F.on('tick', dt => {
  if (!Day.active || (F.Shell && F.Shell.screen)) return;
  const td = F.save.today;
  if (td) {
    td.playSec = (td.playSec || 0) + dt;
    const lim = Day.limitSec();
    if (lim && td.playSec >= lim && !Day.inBed && !td.bedDone) Day.bedtime({});
  }
  acc += dt;
  if (acc > 5) {
    acc = 0;
    F.save.pos = posNow();
    F.save.lastPlayAt = Date.now();
    F.save.stats.playSec = (F.save.stats.playSec || 0) + 5;
    F.store();
  }
});

/* ---------------------------------------------------------- debug (F.dbg from js/debug.js; SHELL adds its own) */
const dbg = F.dbg = F.dbg || {};
dbg.newDay = async (o) => { if (F.Shell.screen === 'bed') F.Title.closeBedtime(); F.save.lastPlayAt = 0; const d = await Day.begin(Object.assign({ forceNew: true, postNow: true }, o || {})); F.debug.frames(3); return d; };
dbg.pos = () => ({ now: posNow(), saved: F.save.pos, post: Day.postPending });
dbg.bedtime = async (fast = true) => { Day.inBed = false; await Day.bedtime({ fast }); F.debug.frames(3); return F.Shell.screen; };
dbg.screen = () => F.Shell.screen;
dbg.parent = () => { F.Prog.openParent(); return true; };
dbg.gate = () => { F.Prog.gate(); return true; };
dbg.pause = on => { if (on === false) return F.Title.resume(); return F.Title.pause(); };
dbg.day = () => ({ day: F.save.day, today: F.save.today, limit: Day.limitSec(), active: Day.active, golden: Day.golden });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
