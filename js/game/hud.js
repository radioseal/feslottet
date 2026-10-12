/* Feslottet – HUD (SHELL WP, DESIGN §3.2). The 4 fixed buttons + gear, subtitle placement, region banner, sparkle fades.
   F.HUD.build()                 create the HUD once (main.js calls it on 'ready')
   F.HUD.show(bool)              hide during title / fairy select / bedtime
   F.HUD.setCoins(n)             render the purse immediately (no animation)
   F.HUD.showTray(open, px?)     a task tray is open (px = its height) → Staven hides, Puff + subtitle move up
   F.HUD.setPrompt(p)            register the repeatable prompt for Puff: fn | {id, slots, voice} | null
   F.HUD.hint(on)                Puff glows = a hint is available (tap = hint; costs the item its A)
   F.HUD.fade(fn) -> Promise     white sparkle fade, runs fn while covered (teleports, space switches)
   F.HUD.banner(name)            region name plaque at the top (tap = name spoken)
   F.HUD.puff / .purse / .wand / .map  elements;  F.HUD.purseRect() for coin fly targets
   Events used: coins(total, delta), subtitle, taskStart/taskEnd, hintAvailable(bool), prompt(id, slots, voice), regionEntered(region)
   Puff idle (90 s without input, no task, only with an open GOAL – natural audit #49; spoken once a session, then Puff only glows)
     → «Skal jeg vise vei?» → tap = Puff's goal answer.
   clarity plan 12.10. (owner «hud»): Puff outside tasks answers «what can I do now?» and EVERY answer points somewhere real (§5):
     onboarding → an open ride offer (F.Travel.offering: the tap rides) → the goal (F.Quest.goal(): far + rideable = «Hopp på, så flyr
     vi!» + F.Travel.offer; an unfound kingdom = «Fly mot lyset …»; back = q_tilbake_<giver>; a thing step = its own line; > 14 m =
     q_fly_<giver>; near = the giver's last request) → today's post («Du har post!») → ONE suggestion nearby (a white bubble, a «?»
     animal, a Tryllepunkt, a twinkling puzzle spot, the way out indoors, an unfound kingdom, a village not visited today / the tower;
     never the same kind twice in a row when another exists). Event 'puffAnswer' {k, line, dest}; H.lastWay = dest.
     The way is a rolling trail of little clouds: H.follow(dest) (a wave at once, then every 2.4 s from where she is; puffs every 1.4 m
     along the next 45 m, A* under 70 m; stops on arrival < 4 m, a new answer, a task / panel, a space change or after 60 s),
     H.trailLive(), H.trailDots(), H.trailSnap(x, z) (a tap within 2 m of a live puff → the farthest one), H.puffDot(pos).
     Indoors F.Bld.guideTo draws the way (stairs / lift first). H.trail(sx, sz, gx, gz) = the same clouds (old callers).
     The far-goal map glow and «Trykk på kartet!» are gone (F.Map.target still marks it); the gold home arrow is hidden (css).
     The goal card is js/ui/goal.js (F.Goal); its tap = H.goalPress() (Puff's goal branch).
     Staven opens only when the press started on it (a ground tap released on the button does nothing).
   Staven hides while a task tray, the spell bar ('wandOpen'/'wandClosed') or the dollhouse overview is open.
   Purse (economy plan §5, js/game/purse.js): 1000-notes (lilac) and 100-notes (sky-blue) in a fan, tens (gold «10»), ones in the
   ten-frame, numeral chip – right up to 9,999. 10 tens → a note and 10 notes → a 1000-note are SILENT merges (paper swish); paying
   breaks a note into ten tens (silent, shown when the purse is visible again). Purse talk (economy §1): hud_bundle once ever; hud_num
   not twice within 10 s; hud_purse_many once a session, then the coin groups light up in turn, silently. H.purseBusy() for tests.
   Keys: M = map; Esc = leave a running task (F.Task.leave, «Fly videre» – where the task may be left, Task.leaveOk), close the top
   panel, otherwise the pause menu (F.Title.pause).
   natural audit: hud_bundle only on the first bundle ever (F.save.hud.bundleSaid); during a task the purse collapses (body.hud-mini).
   During the first-run onboarding Puff/Staven taps
   go to F.Onboard. H.lastWay = the last «show the way» destination (tests).
   DESIGN2 (WP10): .hud-album (a book with a paw, left of the map) → F.Album.open(); it bumps/sparkles on 'friendMade' and shows the friend
   count. H.mapGlow(on, reason): the Kart button glows ('new' = a kingdom appeared; the old 'far' glow is retired). Region banner: kingdoms show their crest + castle name (tap = the name), the narrator welcome comes from here
   (F.Realm.sayWelcome, once a day; F.Realm.autoWelcome = false). Home = Fetårnet's door (H.homePos). Indoors the way out uses
   F.Bld.exitPos()/guideTo (stairs or lift first). Optional: a Kikkert chip once she owns the binoculars (tap = its hint line).
   v5 WP-T: .hud-book (Trylleboka, js/ui/trylleboka.js) left of the album – waits like the album during tasks / scenes; H.bookDot(on)
   (a quiet dot: today's riddle open or a new wand power), H.bookBump() on a new card; ICON.book (also on the spell bar).
   v5 WP-W: H.scene() -> 'befriend'|'throne'|'greeting'|'activity'|null – while a scripted scene owns the camera, Staven, Kart, the
   album and the M key wait (soft boing); Puff's idle «Skal jeg vise vei?» and the far-target «Trykk på kartet!» stay quiet in the play
   break (F.Quest.quiet()). */
(function () {
'use strict';
const F = window.F;
const U = F.U;
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ------------------------------------------------------------ drawn icons (SVG, no emoji) */
function starPath(cx, cy, R, r, n, rot) {
  n = n || 5; rot = rot != null ? rot : -Math.PI / 2; let d = '';
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); }
  return d + 'Z';
}
const ICON = {
  pouch: `<svg class="svgi pouch" viewBox="0 0 40 52"><defs><linearGradient id="hudPouchG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa6c9"/><stop offset="1" stop-color="#e5659c"/></linearGradient></defs>
    <path d="M13 15 C6 22 3 31 4 39 C5 48 12 51 20 51 C28 51 35 48 36 39 C37 31 34 22 27 15 Z" fill="url(#hudPouchG)" stroke="#fff" stroke-width="2.5"/>
    <path d="M10 15.5 C15 12 25 12 30 15.5" fill="none" stroke="#c94f86" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M15 13 L10 4 M25 13 L30 5" stroke="#ffd84a" stroke-width="3.2" stroke-linecap="round"/><circle cx="10" cy="4" r="2.6" fill="#ffd84a"/><circle cx="30" cy="5" r="2.6" fill="#ffd84a"/>
    <circle cx="20" cy="35" r="8" fill="#ffd84a" stroke="#e0a91e" stroke-width="2.2"/><path d="${starPath(20, 35, 4.2, 1.8)}" fill="#fff6c0"/>
    <ellipse cx="12" cy="27" rx="2.5" ry="5" fill="#fff" opacity=".35" transform="rotate(20 12 27)"/></svg>`,
  map: `<svg class="svgi" viewBox="0 0 72 72">
    <path d="M5 14 L24 8 L48 14 L67 8 L67 58 L48 64 L24 58 L5 64 Z" fill="#fdf1d4" stroke="#b98a45" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M24 8 L48 14 L48 64 L24 58 Z" fill="#f1dcae"/><path d="M24 8 L24 58 M48 14 L48 64" stroke="#d7b57a" stroke-width="1.8"/>
    <path d="M7 52 Q13 41 20 52 Z" fill="#9fdc8a"/><path d="M14 54 Q20 45 26 54 Z" fill="#86cf73"/>
    <ellipse cx="55" cy="47" rx="8.5" ry="5.2" fill="#8fd3f4"/><path d="M50 47 q2.5 -2 5 0 q2.5 2 5 0" fill="none" stroke="#fff" stroke-width="1.4"/>
    <path d="M12 44 Q20 30 33 33 T54 24" fill="none" stroke="#e0608c" stroke-width="2.6" stroke-dasharray="0.5 5.2" stroke-linecap="round"/>
    <circle cx="12" cy="44" r="3" fill="#e0608c"/>
    <g transform="translate(52 10)"><rect x="-6" y="8" width="12" height="9" fill="#fff6e6" stroke="#b98a45" stroke-width="1.2"/>
      <rect x="-9" y="5" width="4.5" height="12" fill="#fff6e6" stroke="#b98a45" stroke-width="1.2"/><rect x="4.5" y="5" width="4.5" height="12" fill="#fff6e6" stroke="#b98a45" stroke-width="1.2"/>
      <path d="M-10 5.5 L-6.75 -1 L-3.5 5.5 Z" fill="#ec7aa8"/><path d="M3.5 5.5 L6.75 -1 L10 5.5 Z" fill="#9d8cf0"/><path d="M-4 8.5 L0 1 L4 8.5 Z" fill="#6fa8ec"/>
      <rect x="-1.6" y="12" width="3.2" height="5" rx="1.6" fill="#b98a45"/></g></svg>`,
  wand: `<svg class="svgi" viewBox="0 0 80 80">
    <g transform="rotate(38 40 44)"><rect x="35.5" y="30" width="9" height="46" rx="4.5" fill="#fff" stroke="#7d5fd0" stroke-width="2.4"/>
      <path d="M36 40 L44 35.5 M36 49 L44 44.5 M36 58 L44 53.5 M36 67 L44 62.5" stroke="#ff8dbd" stroke-width="3.4" stroke-linecap="round"/></g>
    <path d="${starPath(50, 26, 19, 8.5)}" fill="#ffd84a" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="${starPath(50, 26, 10, 4.5)}" fill="#fff6c0"/>
    <path class="tw" d="${starPath(20, 22, 7, 1.8, 4)}" fill="#fff"/><path class="tw b" d="${starPath(70, 50, 6, 1.6, 4)}" fill="#fff"/><path class="tw c" d="${starPath(66, 8, 5, 1.4, 4)}" fill="#fff"/></svg>`,
  puff: `<svg class="svgi" viewBox="0 0 100 90"><defs><radialGradient id="hudPuffG" gradientUnits="userSpaceOnUse" cx="40" cy="30" r="70"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#f3f8ff"/><stop offset="1" stop-color="#d4e4fa"/></radialGradient></defs>
    <g fill="url(#hudPuffG)" stroke="#fff" stroke-width="0"><circle cx="27" cy="55" r="19"/><circle cx="45" cy="37" r="22"/><circle cx="68" cy="40" r="19"/><circle cx="80" cy="58" r="15"/><circle cx="17" cy="64" r="12"/>
      <rect x="17" y="52" width="68" height="24" rx="12"/></g>
    <ellipse cx="38" cy="51" rx="4.6" ry="6" fill="#3b2f5c"/><ellipse cx="62" cy="51" rx="4.6" ry="6" fill="#3b2f5c"/>
    <circle cx="39.8" cy="48.6" r="1.8" fill="#fff"/><circle cx="63.8" cy="48.6" r="1.8" fill="#fff"/>
    <ellipse cx="28" cy="61" rx="6.5" ry="3.8" fill="#ffb3cf" opacity=".85"/><ellipse cx="72" cy="61" rx="6.5" ry="3.8" fill="#ffb3cf" opacity=".85"/>
    <path class="mouth-s" d="M44 61 Q50 67 56 61" fill="none" stroke="#3b2f5c" stroke-width="3.2" stroke-linecap="round"/>
    <ellipse class="mouth-o" cx="50" cy="63" rx="5" ry="4.6" fill="#d0587a"/></svg>`,
  gear: `<svg class="svgi" viewBox="0 0 36 36"><circle class="ring" cx="18" cy="18" r="16.5" pathLength="100" fill="none" stroke="#ff7fb0" stroke-width="3" transform="rotate(-90 18 18)"/>
    <circle cx="18" cy="18" r="10.5" fill="none" stroke="#6b5d8f" stroke-width="5" stroke-dasharray="4.1 4.15"/><circle cx="18" cy="18" r="8.2" fill="#6b5d8f"/><circle cx="18" cy="18" r="3.4" fill="#fff"/></svg>`,
  spark: `<svg viewBox="0 0 12 12" width="100%" height="100%"><path d="${starPath(6, 6, 6, 1.6, 4)}" fill="#ffd84a"/></svg>`,
  album: `<svg class="svgi" viewBox="0 0 72 72">
    <path d="M36 16 C27 10 16 9 7 12 L7 58 C16 55 27 56 36 62 Z" fill="#ff9cc8" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M36 16 C45 10 56 9 65 12 L65 58 C56 55 45 56 36 62 Z" fill="#c9b8ff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M36 16 L36 62" stroke="#b07fd8" stroke-width="2.4"/><path d="M11 17 C18 15 26 16 32 20 M11 23 C18 21 26 22 32 26" stroke="#ffd0e6" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g transform="translate(50 37)" fill="#fff"><ellipse cx="0" cy="4" rx="6.2" ry="5.2"/><ellipse cx="-7" cy="-3" rx="2.6" ry="3.1"/><ellipse cx="-2.6" cy="-7.4" rx="2.6" ry="3.3"/><ellipse cx="2.6" cy="-7.4" rx="2.6" ry="3.3"/><ellipse cx="7" cy="-3" rx="2.6" ry="3.1"/></g>
    <path d="${starPath(20, 42, 7, 3)}" fill="#ffd84a" stroke="#fff" stroke-width="1.6"/></svg>`,
  // v5 WP-T: Trylleboka – a closed purple spellbook with gold corners, a gold star and a clasp (the album is an OPEN book with a paw)
  book: `<svg class="svgi" viewBox="0 0 72 72">
    <rect x="50" y="11" width="11" height="52" rx="3" fill="#fff6e6" stroke="#fff" stroke-width="2.4"/>
    <path d="M53 18 H59 M53 25 H59 M53 32 H59 M53 39 H59 M53 46 H59 M53 53 H59" stroke="#e8d9bd" stroke-width="1.6"/>
    <rect x="11" y="7" width="45" height="58" rx="7" fill="#9b7bf0" stroke="#fff" stroke-width="3"/>
    <rect x="11" y="7" width="10" height="58" rx="5" fill="#7b5ad6"/>
    <path d="M24 10 h7 l-7 7 z M53 10 h-7 l7 7 z M24 62 h7 l-7 -7 z M53 62 h-7 l7 -7 z" fill="#ffd84a"/>
    <path d="${starPath(38.5, 35, 13, 5.6)}" fill="#ffd84a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    <rect x="53" y="30" width="9" height="10" rx="2.5" fill="#ffd84a" stroke="#fff" stroke-width="1.6"/>
    <path d="${starPath(63, 9, 5.5, 2.2)}" fill="#fff6c0"/></svg>`,
  kikkert: `<svg class="svgi" viewBox="0 0 60 60"><rect x="8" y="22" width="18" height="26" rx="8" fill="#6b5d8f" stroke="#fff" stroke-width="3"/><rect x="34" y="22" width="18" height="26" rx="8" fill="#6b5d8f" stroke="#fff" stroke-width="3"/>
    <rect x="22" y="26" width="16" height="10" rx="4" fill="#8a7fc0" stroke="#fff" stroke-width="2.4"/><circle cx="17" cy="43" r="6" fill="#9fd3f4" stroke="#fff" stroke-width="2"/><circle cx="43" cy="43" r="6" fill="#9fd3f4" stroke="#fff" stroke-width="2"/>
    <circle cx="15" cy="41" r="2" fill="#fff"/><circle cx="41" cy="41" r="2" fill="#fff"/><path d="${starPath(48, 12, 8, 3.2)}" fill="#ffd84a" stroke="#fff" stroke-width="1.5"/></svg>`,
};
const GEMC = ['#ff5fa2', '#5fd0ff', '#8cff7a', '#ffd84a', '#c6a8ff', '#ff9a3c', '#5cc8c0', '#ff8a7a', '#9fe6c4', '#b9a5f0', '#f2b632', '#ff6f91'];

const H = F.HUD = {
  built: false, hidden: true, trayOpen: false, idleOffered: false, hintOn: false, prompt: null, lastInput: 0,
  ICON, starPath,
};

/* ------------------------------------------------------------ scale */
function scale() {
  const u = U.clamp(Math.min(innerWidth / 1470, innerHeight / 773), 0.72, 1.3);
  document.documentElement.style.setProperty('--u', u.toFixed(4));
  H.u = u;
}
addEventListener('resize', scale);
scale();

/* ------------------------------------------------------------ build */
H.build = function () {
  if (H.built) return; H.built = true;
  const root = H.root = $('#hud');
  root.classList.add('hidden');
  root.innerHTML = '';
  // Pungen
  const purse = H.purse = el('div', 'hud-btn hud-purse');
  purse.setAttribute('role', 'button'); purse.setAttribute('aria-label', 'Pungen');
  purse.innerHTML = ICON.pouch;
  H.notesEl = el('div', 'hud-notes'); H.tiersEl = el('div', 'hud-tiers'); H.frameEl = el('div', 'hud-frame'); H.chipEl = el('div', 'hud-chip', '0');
  for (let i = 0; i < 10; i++) H.frameEl.appendChild(el('div', 'cell'));
  purse.append(H.notesEl, H.tiersEl, H.frameEl, H.chipEl);
  purse.addEventListener('click', e => { e.stopPropagation(); pursePress(); });
  // Kart
  const map = H.map = el('div', 'hud-btn hud-map', ICON.map);
  map.setAttribute('role', 'button'); map.setAttribute('aria-label', 'Kart');
  map.addEventListener('click', e => {
    e.stopPropagation(); if (H.busy() || F.Task.current || sceneRefuse()) return; F.sfx.whoosh();
    if (!F.Map) return;
    const tg = F.Map.target;
    if (!F.Map.isOpen && F.Space.cur === 'out' && tg && tg.realm) F.Map.open({ focus: tg.realm }); else F.Map.toggle();
  });
  // Staven
  const wand = H.wand = el('div', 'hud-btn hud-wand', ICON.wand);
  wand.setAttribute('role', 'button'); wand.setAttribute('aria-label', 'Staven');
  H.gemsEl = el('div', 'hud-gems'); wand.appendChild(H.gemsEl);
  // clarity §3.3.6: Staven opens only when the press STARTED on it – a ground tap (a press on the world) that ends on the button does nothing
  let wandDown = false;
  wand.addEventListener('pointerdown', e => { e.stopPropagation(); wandDown = true; });
  addEventListener('pointerdown', e => { if (!wand.contains(e.target)) wandDown = false; }, { capture: true });
  addEventListener('pointerup', e => { if (!wand.contains(e.target)) wandDown = false; }, { capture: true });
  addEventListener('pointercancel', () => { wandDown = false; }, { capture: true });
  H.wandArmed = () => wandDown;
  wand.addEventListener('click', e => {
    e.stopPropagation();
    const armed = wandDown; wandDown = false;
    if (!armed && e.isTrusted && e.detail > 0) return;            // (keyboard / programmatic clicks have no press to check)
    if (H.busy() || F.Task.current || document.body.classList.contains('wand-open') || sceneRefuse()) return;
    if (F.Onboard && F.Onboard.wandTap && F.Onboard.wandTap()) return;        // first run: Puff's guided first word
    F.sfx.magic(); F.Wand.open({ mode: 'free' });
  });
  // Puff
  const puff = H.puff = el('div', 'hud-btn hud-puff');
  puff.setAttribute('role', 'button'); puff.setAttribute('aria-label', 'Puff');
  puff.innerHTML = '<div class="halo"></div>' + ICON.puff + ['s1', 's2', 's3'].map(c => `<div class="spark ${c}">${ICON.spark}</div>`).join('');
  const sp = puff.querySelectorAll('.spark');
  [[8, 6], [78, 2], [86, 60]].forEach(([x, y], i) => { sp[i].style.left = x + '%'; sp[i].style.top = y + '%'; });
  puff.addEventListener('click', e => { e.stopPropagation(); puffPress(); });
  // Vennealbumet (DESIGN2 §5.5): a book with a paw, left of the map
  const album = H.album = el('div', 'hud-btn hud-album', ICON.album);
  album.setAttribute('role', 'button'); album.setAttribute('aria-label', 'Vennealbumet'); album.dataset.album = '1';
  H.albumN = el('div', 'hud-album-n'); album.appendChild(H.albumN);
  album.addEventListener('click', e => { e.stopPropagation(); if (H.busy() || F.Task.current || sceneRefuse()) return; F.sfx.click && F.sfx.click(); if (F.Map && F.Map.isOpen) F.Map.close(); if (F.Album && F.Album.open) F.Album.open(); });
  album.addEventListener('pointerdown', e => e.stopPropagation());
  if (F.flags && F.flags.collect) album.style.display = 'none';
  // the Kikkert chip (only once she owns the binoculars; tap = its hint)
  const kik = H.kikkert = el('div', 'hud-btn hud-kikkert', ICON.kikkert);
  kik.setAttribute('role', 'button'); kik.setAttribute('aria-label', 'Kikkert');
  kik.addEventListener('click', e => { e.stopPropagation(); if (H.busy() || F.Task.current) return; F.sfx.pop && F.sfx.pop(); kik.classList.remove('bf-bump'); void kik.offsetWidth; kik.classList.add('bf-bump'); if (!F.Speech.busy() && F.TPL.has('shop_kikkert_se')) F.SAY('shop_kikkert_se'); F.emit('kikkertTap'); });
  // gear (parent, hold 3 s)
  const gear = H.gear = H.makeGear(() => F.Prog && F.Prog.gate ? F.Prog.gate() : null);
  root.append(purse, map, album, kik, wand, puff, gear);
  H.addBook();
  // banner + fade + home arrow live outside #hud (own z-index)
  H.placeEl = el('div', 'hud-place'); document.body.appendChild(H.placeEl);
  // v3 WP5: the banner is «try first, then hear it» (F.UI.tryRead, set up by H.banner): 1st tap sounds out the stem, 2nd tap = the name
  H.placeEl.addEventListener('pointerdown', e => e.stopPropagation());
  H.fadeEl = el('div', 'hud-fade'); document.body.appendChild(H.fadeEl);
  H.fadeEl.appendChild(el('div', 'sun', `<svg viewBox="0 0 200 200" width="100%" height="100%"><g stroke="#ffb14a" stroke-width="10" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(100 + Math.cos(a) * 66).toFixed(1)} ${(100 + Math.sin(a) * 66).toFixed(1)} L${(100 + Math.cos(a) * 88).toFixed(1)} ${(100 + Math.sin(a) * 88).toFixed(1)}"/>`; }).join('')}</g>
    <circle cx="100" cy="100" r="52" fill="#ffd84a" stroke="#fff" stroke-width="7"/><path d="M80 96 Q86 90 92 96 M108 96 Q114 90 120 96" fill="none" stroke="#8a5ad6" stroke-width="5" stroke-linecap="round"/>
    <path d="M84 114 Q100 128 116 114" fill="none" stroke="#8a5ad6" stroke-width="5" stroke-linecap="round"/><ellipse cx="74" cy="112" rx="8" ry="5" fill="#ff9cc4"/><ellipse cx="126" cy="112" rx="8" ry="5" fill="#ff9cc4"/></svg>`));
  for (let i = 0; i < 18; i++) { const s = el('div', 'fs'); s.style.left = (5 + Math.random() * 90) + '%'; s.style.top = (5 + Math.random() * 90) + '%'; s.style.animationDelay = (Math.random()).toFixed(2) + 's'; H.fadeEl.appendChild(s); }
  H.setCoins(F.Eco.coins());
  H.setGems(F.Prog && F.Prog.gems ? F.Prog.gems() : 0, false);
  H.albumCount(); H.kikkertSync();
  try { if (F.Book && F.Book.hudSync) F.Book.hudSync(); } catch (e) { /* book loads later */ }
};
/* v5 WP-T: the Trylleboka button (left of the album) – every castable word as a card. Made only when js/ui/trylleboka.js (and with
   it css/trylleboka.css) is in the build: an unstyled button would cover the purse. trylleboka.js calls H.addBook() itself when it
   loads after the HUD was built. A quiet dot (no sound) while today's riddle is not heard yet or a new power waits; a bump + sparkle
   when a new card fills (F.Book emits 'bookNew'). */
H.addBook = function () {
  if (!H.built || H.book || !F.Book) return H.book || null;
  const book = H.book = el('div', 'hud-btn hud-book', ICON.book);
  book.setAttribute('role', 'button'); book.setAttribute('aria-label', 'Trylleboka');
  H.bookDotEl = el('div', 'hud-book-dot'); book.appendChild(H.bookDotEl);
  book.addEventListener('click', e => {
    e.stopPropagation(); if (H.busy() || F.Task.current || sceneRefuse()) return;
    if (F.Onboard && F.Onboard.active) { try { F.sfx.boing(); } catch (x) { /* audio */ } return; }
    try { F.sfx.click(); } catch (x) { /* audio */ }
    if (F.Map && F.Map.isOpen) F.Map.close();
    if (F.Book && F.Book.open) F.Book.open();
  });
  book.addEventListener('pointerdown', e => e.stopPropagation());
  if (F.flags && F.flags.collect) book.style.display = 'none';
  if (H.kikkert && H.kikkert.parentNode === H.root) H.root.insertBefore(book, H.kikkert); else H.root.appendChild(book);
  try { if (F.Book.hudSync) F.Book.hudSync(); } catch (e) { /* partial */ }
  return book;
};
H.bookDot = function (on) { if (H.bookDotEl) H.bookDotEl.classList.toggle('on', !!on); };
H.bookBump = function () {
  if (!H.book) return;
  H.book.classList.remove('bf-bump'); void H.book.offsetWidth; H.book.classList.add('bf-bump');
  try {
    const r = H.book.getBoundingClientRect(); if (!r.width) return;
    for (let i = 0; i < 8; i++) { const sp = el('div', 'tr-spark'); sp.style.left = (r.left + Math.random() * r.width) + 'px'; sp.style.top = (r.top + Math.random() * r.height) + 'px'; document.body.appendChild(sp); setTimeout(() => sp.remove(), 900); }
  } catch (e) { /* optional */ }
};
H.makeGear = function (onDone) {
  const g = el('div', 'hud-btn hud-gear', ICON.gear);
  g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Foreldre');
  let timer = null;
  const cancel = () => { g.classList.remove('hold'); if (timer) clearTimeout(timer); timer = null; };
  g.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault(); cancel();
    void g.offsetWidth; g.classList.add('hold');
    timer = setTimeout(() => { timer = null; g.classList.remove('hold'); F.sfx.chime(); onDone && onDone(); }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => g.addEventListener(ev, cancel));
  g.addEventListener('click', e => e.stopPropagation());
  return g;
};
H.show = function (on) {
  H.hidden = !on;
  if (H.root) H.root.classList.toggle('hidden', !on);
};
H.busy = () => !!(F.Shell && F.Shell.screen) || H.hidden || !!(F.Travel && F.Travel.busy);   // (a cloud ride: HUD taps wait)
// v5 WP-W (playtest camera root cause 3): a scripted scene owns the camera – a friend encounter (F.Befriend.busy), the throne
// ceremony (F.Throne.busy), a kingdom greeting (F.Royals.greeting) or a scripted look (F.R.cam.focus / mode 'show'). Staven, Kart and
// the M key wait (a soft boing, so the tap is never dead); the scene releases the camera itself.
H.scene = () => {
  try {
    if (F.Befriend && F.Befriend.busy) return 'befriend';
    if (F.Throne && F.Throne.busy) return 'throne';
    if (F.Royals && F.Royals.greeting && Object.keys(F.Royals.greeting).length) return 'greeting';
    if (F.Quest && F.Quest.stepRunning && F.Quest.stepRunning() && F.R && F.R.cam && F.R.cam.focus) return 'activity';
  } catch (e) { /* partial boot */ }
  return null;
};
const sceneRefuse = () => { if (!H.scene()) return false; try { (F.sfx.boing || F.sfx.click || (() => {}))(); } catch (e) { /* no audio */ } return true; };
H.sceneRefuse = sceneRefuse;

/* ------------------------------------------------------------ Pungen: notes (1000, 100), tens as big coins, ones in a ten-frame, numeral chip
   economy plan §5: the picture is right for 0–9,999 (F.Purse.parts); 10 tens → a sky-blue 100-note and 10 notes → a lilac 1000-note are
   SILENT merges (a paper swish, never words); paying breaks a note into ten tens (the merge played backwards) – shown when the purse is
   visible again (a shop hides it). §1: hud_bundle once ever; hud_num not twice within 10 s; hud_purse_many once a session, then the
   purse lights its coin groups in turn, silently; no chime after the bundle bell; the per-coin pling 6 dB softer outside tasks. */
let disp = 0, pumping = false, bundles = 0, rendered = 0;
H.purseRect = () => (H.purse ? H.purse.getBoundingClientRect() : { left: 20, top: 20, width: 200, height: 80 });
const partsOf = n => (F.Purse && F.Purse.parts ? F.Purse.parts(n) : (n = Math.max(0, Math.min(9999, n | 0)), { th: Math.floor(n / 1000), h: Math.floor((n % 1000) / 100), t: Math.floor((n % 100) / 10), o: n % 10 }));
const noteEl = v => { if (F.Purse && F.Purse.noteEl) return F.Purse.noteEl(v); const e = el('div', 'pnote ' + (v >= 1000 ? 'n1000' : 'n100')); e.appendChild(el('span', '', String(v))); return e; };
const fanLayout = (th, h) => (F.Purse && F.Purse.fanLayout ? F.Purse.fanLayout(th, h, H.u || 1) : { width: 0, height: 0, pos: () => ({ x: 0, y: 0, rot: 0, v: 100 }) });
const swish = () => { try { if (F.Purse && F.Purse.swish) F.Purse.swish(); else F.sfx.whoosh(); } catch (e) { /* audio */ } };
// the per-coin pling: 6 dB softer in free play (half the amplitude), unchanged in tasks
const plingSoft = i => { try { if (F.Task.current || !F.sfx.tone) F.sfx.pling(i); else F.sfx.tone(880 * Math.pow(1.122, i), 0.25, 'triangle', 0.06); } catch (e) { /* audio */ } };
function tierLayout(n) {
  // never overlap: ≤4 coins = one row of big coins; 5+ = two rows (a tens frame of 5 per row) of smaller coins, ≥5 px gaps
  const u = H.u || 1;
  if (n <= 4) { const cw = 50 * u, gap = 6 * u; return { cs: 1, cf: 1, cw, rows: 1, cols: n, width: n ? n * cw + (n - 1) * gap : 0, height: cw, pos: i => ({ x: i * (cw + gap), y: 0 }) }; }
  const cols = Math.max(5, Math.ceil(n / 2)), cw = 34 * u, gx = 5 * u, gy = 4 * u;
  return { cs: 0.68, cf: 0.8, cw, rows: 2, cols, width: cols * cw + (cols - 1) * gx, height: 2 * cw + gy, pos: i => ({ x: (i % cols) * (cw + gx), y: Math.floor(i / cols) * (cw + gy) }) };
}
H.tierLayout = tierLayout;
// the notes fan (thousands first, then hundreds); o.hideLast = the newest note waits hidden (a merge flies it in)
function renderNotes(p, o) {
  o = o || {};
  const N = H.notesEl; if (!N) return;
  const n = p.th + p.h, L = fanLayout(p.th, p.h);
  while (N.children.length > n) N.lastChild.remove();
  while (N.children.length < n) N.appendChild(noteEl(100));
  [...N.children].forEach((c, i) => {
    const q = L.pos(i), want = q.v >= 1000 ? 'n1000' : 'n100';
    if (!c.classList.contains(want)) { const r = noteEl(q.v); N.replaceChild(r, c); c = r; }
    c.style.left = q.x.toFixed(1) + 'px'; c.style.top = q.y.toFixed(1) + 'px'; c.style.transform = 'rotate(' + q.rot.toFixed(1) + 'deg)'; c.style.zIndex = String(i + 1);
    c.classList.remove('new'); c.style.visibility = '';
  });
  N.style.width = L.width.toFixed(1) + 'px'; N.style.height = n ? L.height.toFixed(1) + 'px' : '0px';
  N.classList.toggle('has', n > 0);
  const last = o.hideLast === 'th' ? N.children[p.th - 1] : o.hideLast === 'h' ? N.children[n - 1] : null;
  if (last) last.style.visibility = 'hidden';
  if (o.newNote) { const c = o.newNote === 'th' ? N.children[p.th - 1] : N.children[n - 1]; if (c) { void c.offsetWidth; c.classList.add('new'); } }
}
function renderPurse(newTier, newOne, o) {
  if (!H.built) return;
  o = o || {};
  const p = o.parts || partsOf(disp), ones = p.o, shownTiers = p.t;
  renderNotes(p, o);
  const L = tierLayout(shownTiers);
  const T = H.tiersEl;
  T.style.visibility = '';
  while (T.children.length > shownTiers) T.lastChild.remove();
  while (T.children.length < shownTiers) T.appendChild(el('div', 'coin10', '10'));
  [...T.children].forEach((c, i) => {
    const pp = L.pos(i); c.style.left = pp.x.toFixed(1) + 'px'; c.style.top = pp.y.toFixed(1) + 'px'; c.style.zIndex = String(i + 1);
    c.style.setProperty('--cs', String(L.cs)); c.style.setProperty('--cf', String(L.cf)); c.classList.remove('new');
  });
  T.style.width = L.width.toFixed(1) + 'px'; T.style.height = L.height.toFixed(1) + 'px';
  if (newTier && T.lastChild) { void T.lastChild.offsetWidth; T.lastChild.classList.add('new'); }
  const cells = H.frameEl.children;
  for (let i = 0; i < 10; i++) { cells[i].classList.toggle('on', i < ones); cells[i].classList.remove('new'); }
  if (newOne && ones > 0) { const c = cells[ones - 1]; void c.offsetWidth; c.classList.add('new'); }
  H.chipEl.textContent = String(disp);
  H.chipEl.classList.remove('bump'); void H.chipEl.offsetWidth; H.chipEl.classList.add('bump');
  rendered = disp;
  if (F.Goal && F.Goal.place) F.Goal.place();          // the goal card sits under the purse
}
H.setCoins = function (n) { disp = Math.max(0, n | 0); renderPurse(); };
H.coinsShown = () => disp;
H.purseBusy = () => !!(pumping || H.merging);           // a count-up / merge / break is still playing (tests)
H.purseParts = () => partsOf(disp);
// the purse is on screen (a shop / the map / a hidden HUD fade it out: a break waits until she can see it)
const purseVisible = () => !!(H.built && !H.hidden && H.purse && !document.body.classList.contains('shop-on') && !document.body.classList.contains('map-open') && !(F.Shell && F.Shell.screen));
H.purseVisible = purseVisible;
// a fixed overlay element at a screen point (merges / breaks fly in screen space)
function flyer(node, x, y) { const f = el('div', 'hud-pfly'); f.appendChild(node); f.style.left = x.toFixed(1) + 'px'; f.style.top = y.toFixed(1) + 'px'; document.body.appendChild(f); return f; }
const T_ = (fn, ms) => F.T.timeout(fn, ms);
// 10 tens → one 100-note, silently: the ten coins slide into a stack (0.35 s), a note slides out and unfolds (0.3 s), it flies into the fan (0.45 s)
function merge100(done) {
  const u = H.u || 1, tr = H.tiersEl.getBoundingClientRect(), fr = H.frameEl.getBoundingClientRect();
  const L = tierLayout(10), ox = tr.width ? tr.left : fr.left, oy = tr.width ? tr.top : fr.top + (fr.height - L.height) / 2;
  H.tiersEl.style.visibility = 'hidden';
  const cx = ox + L.width / 2, cy = oy + L.height / 2, coins = [];
  for (let i = 0; i < 10; i++) {
    const pp = L.pos(i), c = el('div', 'coin10', '10');
    c.style.setProperty('--cs', String(L.cs)); c.style.setProperty('--cf', String(L.cf));
    const f = flyer(c, ox + pp.x + L.cw / 2, oy + pp.y + L.cw / 2); f.classList.add('coin'); coins.push(f);
  }
  H.merging = '100';
  T_(() => coins.forEach((f, i) => { f.style.transition = 'left .35s ease-in, top .35s ease-in'; f.style.left = cx.toFixed(1) + 'px'; f.style.top = (cy - i * 1.6 * u).toFixed(1) + 'px'; }), 30);
  let note = null;
  T_(() => { swish(); note = flyer(noteEl(100), cx, cy); note.classList.add('unfold'); coins.forEach(f => { f.style.transition = 'opacity .25s'; f.style.opacity = '0'; }); }, 400);
  T_(() => {
    coins.forEach(f => f.remove());
    // a full thousand: the fan shows ten hundreds for a moment (the tenth is this note), then merge1000 squares them up
    const p = partsOf(disp), over = disp % 1000 === 0 && p.th > 0 ? { th: p.th - 1, h: 10, t: 0, o: p.o } : null;
    renderPurse(false, false, { hideLast: 'h', parts: over });
    const N = H.notesEl, n = over ? over.th + over.h : p.th + p.h, tgt = N && N.children[n - 1];
    if (note && tgt) { const r = tgt.getBoundingClientRect(); note.style.transition = 'left .45s ease-in-out, top .45s ease-in-out'; note.style.left = (r.left + r.width / 2).toFixed(1) + 'px'; note.style.top = (r.top + r.height / 2).toFixed(1) + 'px'; }
  }, 720);
  T_(() => {
    if (note) note.remove();
    H.merging = null;
    if (disp % 1000 === 0 && partsOf(disp).th > 0) { merge1000(done); return; }
    renderPurse(false, false, { newNote: 'h' });
    done && done();
  }, 1200);
}
// 10 hundred-notes → one 1000-note: the notes square up, a gold paper band wraps them, and they become one lilac note
function merge1000(done) {
  const N = H.notesEl, p = partsOf(disp);
  // the purse shows the 9 old hundreds + the new one: draw ten notes where the hundreds fan is
  const nr = N.getBoundingClientRect(), u = H.u || 1;
  const L = fanLayout(p.th - 1, 10);
  const ox = nr.left, oy = nr.top || (H.purseRect().top + 17 * u);
  N.style.visibility = 'hidden';
  const notes = [];
  for (let i = 0; i < 10; i++) { const q = L.pos(p.th - 1 + i), f = flyer(noteEl(100), ox + q.x + 22 * u, oy + q.y + 12 * u); f.style.transform = 'translate(-50%, -50%) rotate(' + q.rot.toFixed(1) + 'deg)'; notes.push(f); }
  const last = notes[9].getBoundingClientRect(), cx = last.left + last.width / 2, cy = last.top + last.height / 2;
  H.merging = '1000';
  T_(() => notes.forEach((f, i) => { f.style.transition = 'left .35s ease-in, top .35s ease-in, transform .35s'; f.style.left = cx.toFixed(1) + 'px'; f.style.top = (cy - i * 0.8 * u).toFixed(1) + 'px'; f.style.transform = 'translate(-50%, -50%)'; }), 30);
  let band = null;
  T_(() => { band = flyer(el('div', 'pband'), cx, cy); swish(); }, 420);
  let big = null;
  T_(() => { notes.forEach(f => f.remove()); if (band) band.remove(); big = flyer(noteEl(1000), cx, cy); big.classList.add('unfold'); }, 760);
  T_(() => {
    N.style.visibility = '';
    renderPurse(false, false, { hideLast: 'th' });
    const tgt = N.children[partsOf(disp).th - 1];
    if (big && tgt) { const r = tgt.getBoundingClientRect(); big.style.transition = 'left .45s ease-in-out, top .45s ease-in-out'; big.style.left = (r.left + r.width / 2).toFixed(1) + 'px'; big.style.top = (r.top + r.height / 2).toFixed(1) + 'px'; }
  }, 1060);
  T_(() => { if (big) big.remove(); H.merging = null; renderPurse(false, false, { newNote: 'th' }); done && done(); }, 1540);
}
// paying: a note breaks silently into ten tens (the merge played backwards), then the purse shows the new amount
function breakNote(kind, done) {
  const N = H.notesEl, a = partsOf(rendered);
  const idx = kind === '1000' ? a.th - 1 : a.th + a.h - 1, src = N && N.children[idx];
  if (!src || !purseVisible()) { renderPurse(); done && done(); return; }
  const r = src.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  src.style.visibility = 'hidden';
  const note = flyer(noteEl(kind === '1000' ? 1000 : 100), cx, cy); note.classList.add('fold');
  swish(); H.merging = 'break' + kind;
  const tr = H.tiersEl.getBoundingClientRect(), fr = H.frameEl.getBoundingClientRect();
  const L = kind === '1000' ? fanLayout(0, 10) : tierLayout(10);
  const ox = kind === '1000' ? r.left : (tr.width ? tr.left : fr.left), oy = kind === '1000' ? r.top - 13 * (H.u || 1) : (tr.width ? tr.top : fr.top);
  const kids = [];
  T_(() => {
    note.remove();
    for (let i = 0; i < 10; i++) {
      const c = kind === '1000' ? noteEl(100) : el('div', 'coin10', '10');
      if (kind !== '1000') { c.style.setProperty('--cs', String(L.cs)); c.style.setProperty('--cf', String(L.cf)); }
      const f = flyer(c, cx, cy); if (kind !== '1000') f.classList.add('coin'); kids.push(f);
      const pp = L.pos(i), w = kind === '1000' ? 22 * (H.u || 1) : L.cw / 2, h = kind === '1000' ? 12 * (H.u || 1) : L.cw / 2;
      T_(() => { f.style.transition = 'left .4s ease-out, top .4s ease-out'; f.style.left = (ox + pp.x + w).toFixed(1) + 'px'; f.style.top = (oy + pp.y + h).toFixed(1) + 'px'; }, 20 + i * 25);
    }
  }, 300);
  T_(() => { kids.forEach(f => { f.style.transition = 'opacity .2s'; f.style.opacity = '0'; }); }, 980);
  T_(() => { kids.forEach(f => f.remove()); H.merging = null; renderPurse(); done && done(); }, 1180);
}
// the purse went down (she paid): show the break if a note had to be changed, then the new amount
function spendShow() {
  if (pumping) return;
  const a = partsOf(rendered), b = partsOf(disp);
  const kind = (b.h > a.h && b.th < a.th) ? '1000' : (b.t > a.t && (b.h < a.h || b.th < a.th)) ? '100' : null;
  if (!kind || !purseVisible()) { renderPurse(); return; }
  pumping = true;
  breakNote(kind, () => { pumping = false; pump(); });
}
function pump() {
  if (pumping || !H.built) return;
  const tgt = F.Eco.coins();
  if (tgt === disp) { if (rendered !== disp && purseVisible()) spendShow(); return; }
  if (tgt < disp) { disp = tgt; if (purseVisible()) spendShow(); return; }
  if (rendered !== disp) renderPurse();
  pumping = true;
  let d = tgt - disp;
  // big gains: jump in hundreds above 600, in tens above 60 (the last steps still count up coin by coin)
  if (d > 600) { disp += Math.floor((d - 300) / 100) * 100; d = tgt - disp; renderPurse(); }
  if (d > 60) { disp += Math.floor((d - 30) / 10) * 10; d = tgt - disp; renderPurse(); }
  if (d >= 10) {
    disp += 10; F.sfx.coin();
    if (disp % 100 === 0 && purseVisible()) { merge100(() => { pumping = false; pump(); }); return; }
    renderPurse(true, false);
    F.T.timeout(() => { pumping = false; pump(); }, 260);
    return;
  }
  disp += 1;
  if (disp % 10 === 0) { bundle(); return; }
  renderPurse(false, true); plingSoft(disp % 10);
  F.T.timeout(() => { pumping = false; pump(); }, 150);
}
// the 10th one: the ten-frame fills, the ten coins fly together and spin into a tier («klink»); at a full hundred the new ten joins
// the nine others and the ten tens become a note (merge100, silent)
function bundle() {
  const cells = H.frameEl.children;
  for (let i = 0; i < 10; i++) cells[i].classList.add('on');
  F.sfx.pling(10);
  H.chipEl.textContent = String(disp);
  const fr = H.frameEl.getBoundingClientRect();
  const tr = H.tiersEl.getBoundingClientRect();
  const nBig = disp % 100 === 0 ? 10 : partsOf(disp).t, L = tierLayout(nBig);
  const lp = L.pos(Math.max(0, nBig - 1));
  const tx = (H.tiersEl.children.length ? tr.left : fr.left) + lp.x + L.cw / 2;
  const ty = (H.tiersEl.children.length ? tr.top : fr.top) + lp.y + L.cw / 2;
  const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
  F.T.timeout(() => {
    [...cells].forEach(c => { const r = c.getBoundingClientRect(); c.style.setProperty('--bx', (cx - r.left - r.width / 2).toFixed(0) + 'px'); c.style.setProperty('--by', (cy - r.top - r.height / 2).toFixed(0) + 'px'); });
    H.frameEl.classList.add('bundle');
    F.sfx.coins(10);
  }, 260);
  F.T.timeout(() => {
    H.frameEl.classList.remove('bundle');
    const b = el('div', 'hud-bundler', '<div class="coin10">10</div>');
    b.style.left = cx + 'px'; b.style.top = cy + 'px'; document.body.appendChild(b);
    const k = el('div', 'hud-klink'); k.style.left = cx + 'px'; k.style.top = cy + 'px'; document.body.appendChild(k);
    F.sfx.bell(1568);                                   // economy §1: the extra chime after the bell is gone
    bundles++;
    // natural audit §3 #69 / economy §1 row 1: the words only on the very first bundle EVER (saved); after that the klink and the merge say it
    const hs = F.save ? (F.save.hud = (F.save.hud && typeof F.save.hud === 'object') ? F.save.hud : {}) : {};
    if (!hs.bundleSaid) { hs.bundleSaid = 1; try { F.store && F.store(); } catch (e) { /* save later */ } F.SAYF('hud_bundle', null, ''); }
    for (let i = 0; i < 10; i++) cells[i].classList.remove('on');
    F.T.timeout(() => { b.style.transition = 'left .45s ease-in, top .45s ease-in'; b.style.left = tx + 'px'; b.style.top = ty + 'px'; }, 650);
    F.T.timeout(() => {
      b.remove(); k.remove(); F.sfx.coin();
      if (disp % 100 === 0 && purseVisible()) { merge100(() => { pumping = false; pump(); }); return; }
      renderPurse(true, false); pumping = false; pump();
    }, 1150);
  }, 780);
}
H.pump = pump;
F.on('coins', (total, delta) => {
  if (!H.built) return;
  if (H.hidden) { disp = F.Eco.coins(); renderPurse(); return; }
  if (delta < 0) { if (pumping) return; disp = F.Eco.coins(); if (purseVisible()) spendShow(); return; }
  pump();
});
// a purchase in a shop hides the purse: the break plays when she can see it again
let pChk = 0;
F.on('tick', dt => { pChk += dt; if (pChk < 0.25) return; pChk = 0; if (H.built && !pumping && rendered !== disp && purseVisible()) { if (disp < rendered) spendShow(); else pump(); } });
// economy §1 rows 19–20: a number ≤ 100 is said (not twice within 10 s); above 100 «Så mange mynter!» once a session – after that the
// purse lights its coin groups in turn, silently (numbers ≥ 100 are shown, not spoken)
let numSaidT = -1e9, manySaid = false;
function litGroups() {
  const groups = [];
  if (H.notesEl) { const th = [...H.notesEl.querySelectorAll('.n1000')], h = [...H.notesEl.querySelectorAll('.n100')]; if (th.length) groups.push(th); if (h.length) groups.push(h); }
  if (H.tiersEl.children.length) groups.push([...H.tiersEl.children]);
  const on = [...H.frameEl.children].filter(c => c.classList.contains('on')); if (on.length) groups.push(on);
  groups.push([H.chipEl]);
  groups.forEach((g, i) => F.T.timeout(() => { g.forEach(e => { e.classList.remove('lit'); void e.offsetWidth; e.classList.add('lit'); }); F.T.timeout(() => g.forEach(e => e.classList.remove('lit')), 420); }, i * 380));
}
H.litGroups = litGroups;
function pursePress() {
  if (H.busy()) return;
  H.purse.classList.remove('jiggle'); void H.purse.offsetWidth; H.purse.classList.add('jiggle');
  const n = F.Eco.coins();
  F.sfx.coins(Math.min(8, Math.max(2, Math.floor(n / 10))));
  F.emit('purseTap', n);
  if (F.Task.current) { if (typeof F.Task.current.onPurse === 'function') F.Task.current.onPurse(); return; }
  if (F.Speech.busy()) { litGroups(); return; }
  if (n === 0) F.SAY('hud_purse_zero');
  else if (n <= 100) { if (F.T.now - numSaidT >= 10) { numSaidT = F.T.now; F.SAY('hud_num', { n }); } else litGroups(); }
  else if (!manySaid) { manySaid = true; F.SAY('hud_purse_many'); }
  else litGroups();
}

/* ------------------------------------------------------------ Vennealbumet button: friend count, bump + sparkle on a new friend */
H.albumCount = function () {
  if (!H.albumN) return;
  let n = 0; try { n = F.Album && F.Album.count ? F.Album.count() : 0; } catch (e) { n = 0; }
  H.albumN.textContent = n ? String(n) : ''; H.albumN.classList.toggle('on', n > 0);
};
F.on('friendMade', () => {
  if (!H.album) return;
  H.albumCount();
  H.album.classList.remove('bf-bump'); void H.album.offsetWidth; H.album.classList.add('bf-bump');
  try { const r = H.album.getBoundingClientRect(); if (F.UI.sparkle) F.UI.sparkle(r.left + r.width / 2, r.top + r.height / 2); } catch (e) { /* optional */ }
});
['albumOpened', 'albumClosed', 'ready', 'dayStart'].forEach(ev => F.on(ev, () => H.albumCount()));
let albAcc = 0; F.on('tick', dt => { albAcc += dt; if (albAcc > 3) { albAcc = 0; H.albumCount(); } });
H.kikkertSync = function () {
  if (!H.kikkert) return;
  let has = false; try { has = !!(F.Eco && F.Eco.gear && F.Eco.gear('kikkert')); } catch (e) { has = false; }
  H.kikkert.classList.toggle('on', has);
};
['gear', 'shopBuy', 'ready'].forEach(ev => F.on(ev, () => F.T.timeout(() => H.kikkertSync(), 50)));
// the Kart button glows while any reason holds: 'far' (a far quest target) or 'new' (a kingdom appeared, not yet seen on the map)
const glowWhy = new Set();
H.mapGlow = function (on, why) {
  why = why || 'x';
  if (on) glowWhy.add(why); else glowWhy.delete(why);
  if (H.map) H.map.classList.toggle('glow', glowWhy.size > 0);
};
H.mapGlowing = () => glowWhy.size > 0;

/* ------------------------------------------------------------ Staven gems (one per 5 passed rungs; F.Prog owns the count) */
let gemsShown = 0;
H.setGems = function (n, animate) {
  if (!H.built) return;
  n = Math.min(12, Math.max(0, n | 0));
  const G = H.gemsEl, u = H.u || 1;
  while (G.children.length > n) G.lastChild.remove();
  for (let i = G.children.length; i < n; i++) {
    const g = el('div', 'hud-gem');
    // crown arc above the button: centre first, then alternating right/left
    const k = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2);
    const a = (-90 + k * 15) * Math.PI / 180, r = 50;
    g.style.left = (50 + Math.cos(a) * r * 1.02) + '%'; g.style.top = (50 + Math.sin(a) * r * 1.02) + '%';
    g.style.background = `linear-gradient(135deg, #fff 0%, ${GEMC[i % GEMC.length]} 40%, ${GEMC[i % GEMC.length]} 100%)`;
    if (animate && i >= gemsShown) g.classList.add('new');
    G.appendChild(g);
  }
  gemsShown = n;
  void u;
};

/* ------------------------------------------------------------ Puff: «what can I do now?» (clarity §5) + the rolling cloud-puff trail (§3.3.3)
   Outside tasks every answer points somewhere real: onboarding first; an open ride offer → the tap rides; a goal (F.Quest.goal(),
   the contract of clarity §3.0) → far + rideable: «Hopp på, så flyr vi!» + F.Travel.offer · an unfound kingdom: «Fly mot lyset …» +
   clouds · back: q_tilbake_<giver> + clouds · a thing step: the step's own line + clouds · > 14 m from the giver: q_fly_<giver> (villagers
   «Følg skyene mine!») + clouds · near the giver: their last request. No goal: today's post → «Du har post!» + clouds to the mailbox;
   otherwise ONE nearby suggestion with clouds to it (never the same kind twice in a row when another exists). Every answer emits
   'puffAnswer' {k, line, dest} and sets H.lastWay. Puff never speaks unasked (the idle offer once a session, the first-time cues). */
H.setPrompt = p => { H.prompt = p || null; };
// outside tasks, Puff repeats the last QUEST instruction (LIFE's q*_ lines). Never a reading target (q_word = envelope word), never the
// letter's own frame (q_fra_<giver> «Et brev fra kongen!», q_hva_står «Hva står det?»): the request in a letter is brev_<qid> in the
// giver's voice – that one is kept (near the giver Puff repeats it until the giver asks in person).
const PROMPT_SKIP = /^q_(word|coins|bra|senere|godnatt|playbreak|post|fly_|tilbake|hei$|fra_|hva_st)|_done|_found|takk/;
(function () {
  const orig = F.SAY;
  if (!orig || orig._hudWrapped) return;
  const W = function (id, slots, voice) {
    try { if (typeof id === 'string' && !F.Task.current && ((/^q\d*_/.test(id) && !PROMPT_SKIP.test(id)) || (/^brev_/.test(id) && voice))) H.prompt = { id, slots: slots || {}, voice: voice || '' }; } catch (e) { /* never block speech */ }
    return orig.apply(this, arguments);
  };
  W._hudWrapped = true;
  F.SAY = W;
})();
F.on('questDone', () => { H.prompt = null; });
F.on('prompt', (id, slots, voice) => { H.prompt = { id, slots, voice }; });
H.hint = on => { H.hintOn = !!on; glow(); };
F.on('hintAvailable', on => H.hint(on));
F.on('puffGlow', on => H.hint(on));
function glow() { if (H.puff) H.puff.classList.toggle('glow', !!(H.hintOn || H.idleOffered)); }
const has = id => !!(id && F.TPL && F.TPL.has(id));
const ROYAL_GIVERS = { konge: 1, dronning: 1, mia: 1 };
// the open goal (clarity §3.0 F.Quest.goal(); null = free play). Before quests.js has it: Mia's bedtime story only.
function goalNow() {
  try { if (F.Quest && typeof F.Quest.goal === 'function') return F.Quest.goal() || null; } catch (e) { console.error('[HUD] goal', e); return null; }
  try { if (F.Quest && F.Quest.storyPending && F.Act && F.Act.byId('mia')) return { id: 'story', giver: 'mia', face: 'ch_mia', model: 'bok', state: 'story', target: null, far: false }; } catch (e) { /* partial boot */ }
  return null;
}
H.goalNow = goalNow;
function puffPress() {
  if (F.Shell && F.Shell.screen) return;
  H.lastInput = F.T.now;
  F.sfx.pop();
  const T = F.Task;
  F.emit('puffTap', { hint: H.hintOn, task: !!T.current });
  if (F.Onboard && F.Onboard.active && !T.current && F.Onboard.puff()) return;   // first run: Puff repeats what to do now
  if (T.current) {
    // the task stage owns hints + repeats (and the reading-target rule: never the target word before her 1st try)
    try { if (typeof T.puff === 'function' && T.puff()) return; } catch (e) { console.error(e); }
    return;
  }
  // an open ride offer (travel.js: Puff waits under her): this tap rides
  if (F.Travel && F.Travel.offering) {
    try { if (typeof F.Travel.take === 'function') { F.Travel.take(); return; } } catch (e) { console.error(e); }
    F.emit('puffRide'); return;
  }
  if (H.idleOffered) { H.idleOffered = false; glow(); }
  answer();
}
H.puffPress = puffPress;
// the goal card's tap = Puff's goal branch (clarity §3.3.1)
H.goalPress = function () {
  if (H.busy() || F.Task.current) return null;
  H.lastInput = F.T.now;
  const g = goalNow();
  return g ? answer({ goal: g }) : null;
};
let lastKind = null;
function answer(o) {
  o = o || {};
  stopFollow();
  let r = null;
  const g = o.goal || goalNow();
  try { r = g ? goalAnswer(g) : freeAnswer(); } catch (e) { console.error('[HUD] Puff answer', e); r = null; }
  if (!r) r = { k: 'none', line: null, dest: null };
  if (r.dest) H.lastWay = r.dest;
  if (r.line && has(r.line) && !F.Speech.busy()) { if (r.say) r.say(); else F.SAY(r.line, r.slots || {}, r.voice || ''); }
  if (!g) lastKind = r.k;
  F.emit('puffAnswer', { k: r.k, line: r.line, dest: r.dest || null });
  if (F.Space.cur === 'in' && r.dest && r.dest.exit) F.emit('puffOut', r.dest);    // the way out of this room / floor / building
  return r;
}
H.answer = answer;
/* ---- where things are */
function homePos() {
  // DESIGN2 §2.7: home is Fetårnet – the trail and «fly hjem» lead to the tower door
  const g = (F.Tower && F.Tower.outside) || F.spawnPoint || (F.Castle.gatePos && F.Castle.gatePos()) || { x: 80, z: -85.8 };
  return { x: g.x, z: g.z, space: 'out' };
}
H.homePos = homePos;
// which castle floor a quest target is on (things and actors know their room), null = unknown
function floorOf(t) {
  try {
    if (t.f != null) return +t.f;
    if (t.thing) { const th = F.Things.byId(t.thing); if (th && th.f != null) return th.f; if (th && th.floor != null) return th.floor; }
    if (t.actor && F.Act && F.Act.byId) { const a = F.Act.byId(t.actor); if (a && a.f != null) return a.f; if (a && a.floor != null) return a.floor; const r = a && a.room != null && F.Castle.room ? F.Castle.room(a.room) : null; if (r) return r.floor != null ? r.floor : r.f; }
  } catch (e) { /* unknown */ }
  return null;
}
const curFloor = () => (F.Bld && F.Bld.cur ? F.Bld.f : F.Castle.floor);
// which building a target is in (null = unknown/same)
function bldOf(t) {
  try {
    if (t.bld) return t.bld;
    if (t.thing) { const th = F.Things.byId(t.thing); if (th && th.bld) return th.bld; }
    if (t.actor && F.Act && F.Act.byId) { const a = F.Act.byId(t.actor); if (a && a.bld) return a.bld; }
  } catch (e) { /* unknown */ }
  return null;
}
function wayNeeded() {
  let t = null;
  try { t = F.Quest && F.Quest.target ? F.Quest.target() : null; } catch (e) { t = null; }
  if (F.Quest && F.Quest.storyPending) return false;
  if (!t) return false;
  const here = F.Space.cur;
  if ((t.space || 'out') !== here) return true;
  if (here === 'in') { const b = bldOf(t); if (b && F.Bld && F.Bld.cur && b !== F.Bld.cur) return true; const f = floorOf(t), cf = curFloor(); if (f != null && cf != null && f !== cf) return true; }
  if (t.far) return true;
  return t.x != null && t.z != null && Math.hypot(t.x - F.Player.pos.x, t.z - F.Player.pos.z) > 14;
}
H.wayNeeded = wayNeeded;
// indoors: the way out (F.Bld.exitPos: the exit on this floor, else the stairs / lift first); legacy F.Castle.exitPos as a fallback
function exitIn() {
  let ex = null;
  try { ex = F.Bld && F.Bld.cur && F.Bld.exitPos ? F.Bld.exitPos() : null; } catch (e) { ex = null; }
  if (!ex && F.Castle.exitPos) { try { ex = F.Castle.exitPos(); } catch (e) { ex = null; } }
  return ex ? { x: ex.x, z: ex.z, f: ex.f, via: ex.via || null, space: 'in' } : null;
}
H.exitIn = exitIn;
// outdoors: the door of the building a target is in (b_dor_<bld>; royal keeps: F.Realm.door)
function doorOf(b) {
  try {
    const th = F.Things.byId('b_dor_' + b); if (th) return { x: th.x, z: th.z + 0.8 };
    if (/^rk_/.test(b) && F.Realm && F.Realm.door) { const d = F.Realm.door(b.slice(3)); if (d) return { x: d.x, z: d.z + 0.8 }; }
    if (b === 'tarn') return homePos();
    if (b === 'slott') return { x: 0, z: 1.8 };
  } catch (e) { /* unknown */ }
  return null;
}
const exitLine = ex => (ex && ex.via === 'stair' && has('bld_ned') ? 'bld_ned' : ex && ex.via === 'lift' && has('bld_heis_ned') ? 'bld_heis_ned' : 'bld_ut');
// draw the way to a target {space, x, z, bld?, f?, realm?, door?} from where she is; returns the destination (H.lastWay) or null.
// Inside a building F.Bld draws its own trail (stairs / lift first); r.exit = the first leg leaves this room / floor / building.
function wayTo(t) {
  if (!t) return null;
  const here = F.Space.cur, ts = t.space || 'out';
  if (here === 'in' && F.Bld && F.Bld.cur && F.Bld.guideTo) {
    const b = bldOf(t);
    if (ts === 'in' && t.x != null && (!b || b === F.Bld.cur)) {
      const f = floorOf(t); let L = null;
      try { L = F.Bld.guideTo({ x: t.x, z: t.z, f: f != null ? f : F.Bld.f }, { quiet: true }); } catch (e) { L = null; }
      if (L) return { x: t.x, z: t.z, f, space: 'in', bld: F.Bld.cur, via: L.via || null, exit: !!(L.via && f != null && f !== F.Bld.f) };
    }
    const ex = exitIn(); if (!ex) return null;
    let L = null; try { L = F.Bld.guideTo({ x: ex.x, z: ex.z, f: ex.f != null ? ex.f : F.Bld.f }, { quiet: true }); } catch (e) { L = null; }
    if (!L) follow({ x: ex.x, z: ex.z });
    return { x: ex.x, z: ex.z, f: ex.f, space: 'in', bld: F.Bld.cur, exit: true, via: ex.via };
  }
  let dest = null, exit = false;
  if (here === 'in') {
    dest = exitIn(); exit = true;                                      // legacy castle: out of the room (or to the lift)
    if (ts === 'in') { const f = floorOf(t), cf = curFloor(); if (!(f != null && cf != null && f !== cf) && t.x != null) { dest = { x: t.x, z: t.z }; exit = false; } }
  } else if (ts === 'out' && t.x != null) dest = { x: t.x, z: t.z };
  else if (ts === 'in') dest = (t.door && t.door.x != null ? { x: t.door.x, z: t.door.z + 0.8 } : null) || doorOf(bldOf(t) || 'slott') || null;
  if (!dest && t.realm && F.Realm && F.Realm.gate) { const g = F.Realm.gate(t.realm); if (g) dest = { x: g.x, z: g.z }; }
  if (!dest && F.Quest && F.Quest.outdoorOf && here === 'out') { const o = F.Quest.outdoorOf(t); if (o) dest = { x: o.x, z: o.z }; }
  if (!dest) return null;
  follow(dest);
  return { x: dest.x, z: dest.z, space: here, exit, via: dest.via || null };
}
H.wayTo = wayTo;
const P2 = () => F.Player.pos;
const distTo = (t) => { if (!t || t.x == null) return Infinity; if ((t.space || 'out') !== F.Space.cur) return Infinity; return Math.hypot(t.x - P2().x, t.z - P2().z); };
function giverPos(g) {
  const a = g && g.giver && F.Act && F.Act.byId ? F.Act.byId(g.giver) : null;
  return a ? { space: a.space, x: a.x, z: a.z, actor: a.id, bld: a.bld || null, f: a.f, room: a.room } : null;
}
function realmUnfound(id) { try { const s = F.Realm && F.Realm.state ? F.Realm.state(id) : null; return !!s && s !== 'found' && s !== 'friend'; } catch (e) { return false; } }
function canRide(t) {
  try {
    if (F.Map && typeof F.Map.canRide === 'function') return !!F.Map.canRide(t);
    if (t.realm) return !!(F.Travel && F.Travel.canFast && F.Travel.canFast(t.realm));
    return !!t.home;
  } catch (e) { return false; }
}
const promptLine = () => { const p = H.prompt; return p && typeof p === 'object' && p.id && has(p.id) ? p : null; };
// the giver's own last request: H.prompt when this giver said it (its voice), else the letter's request brev_<qid> in their voice
function voiceOf(giver) { try { const a = F.Act && F.Act.byId ? F.Act.byId(giver) : null; return (a && a.voice) || giver || ''; } catch (e) { return giver || ''; } }
function requestOf(g) {
  const p = promptLine(), v = g && g.giver ? voiceOf(g.giver) : '';
  if (p && (!p.voice || !v || p.voice === v || p.voice === g.giver)) return p;
  const b = g && g.id ? 'brev_' + g.id : null;
  if (b && has(b) && g.giver) return { id: b, slots: {}, voice: v };
  return null;
}
H.requestOf = requestOf;
function goalAnswer(g) {
  const t = g.target || (F.Quest && F.Quest.target ? F.Quest.target() : null) || giverPos(g);
  const giver = g.giver || (t && t.actor) || null, royal = !!ROYAL_GIVERS[giver];
  const flyLine = royal && has('q_fly_' + giver) ? 'q_fly_' + giver : 'hud_trail_go';
  // far away (> Quest.FAR) and a place Puff can carry her: Puff settles under her (travel.js); her tap on the cloud rides
  const far = !!(g.far || (t && t.far));
  if (far && t && canRide(t) && !(t.realm && realmUnfound(t.realm))) {
    let offered = false;
    if (F.Travel && typeof F.Travel.offer === 'function' && !F.Travel.busy) { try { const p = F.Travel.offer(t); offered = true; if (p && p.catch) p.catch(e => console.error(e)); } catch (e) { console.error(e); offered = false; } }
    if (offered) return { k: 'ride', line: 'hud_ride', dest: { x: t.x, z: t.z, space: t.space || 'out', ride: true, realm: t.realm || null, home: !!t.home } };
    const d = wayTo(t);                                             // (before travel.js has the offer: the clouds toward it)
    return { k: 'goal_far', line: flyLine, dest: d };
  }
  // the goal lies in a kingdom she has not found: fly toward the light
  if (t && t.realm && realmUnfound(t.realm)) {
    let dest = null; try { const gt = F.Realm.gate(t.realm); if (gt) { follow({ x: gt.x, z: gt.z }); dest = { x: gt.x, z: gt.z, space: 'out', realm: t.realm }; } } catch (e) { dest = null; }
    if (!dest) dest = wayTo(t);
    return { k: 'lys', line: 'hud_sug_lys', dest };
  }
  const gp = giverPos(g);
  // all steps done, the giver is far: back to them
  if (g.state === 'back') {
    const line = has('q_tilbake_' + giver) ? 'q_tilbake_' + giver : has('q_tilbake') && !royal ? 'q_tilbake' : flyLine;
    const d = wayTo(gp || t);
    return { k: 'back', line: d && d.exit ? exitLine(d) : line, dest: d };
  }
  // a thing step (or a delivery to someone): the step's own line + the clouds to it
  if (g.state === 'thing' || g.state === 'deliver') {
    const p = requestOf(g);
    const d = wayTo(t);
    return { k: g.state, line: d && d.exit ? exitLine(d) : p ? p.id : flyLine, slots: p && !(d && d.exit) ? p.slots : null, voice: p && !(d && d.exit) ? p.voice : '', dest: d };
  }
  // the story / the giver: far → where to fly; near → their last request (their gold bubble is right there)
  const who = gp || t;
  if (distTo(who) > 14 || (who && (who.space || 'out') !== F.Space.cur) || (F.Space.cur === 'in' && who && bldOf(who) && F.Bld && F.Bld.cur && bldOf(who) !== F.Bld.cur)) {
    const d = wayTo(who);
    return { k: 'giver', line: d && d.exit ? exitLine(d) : flyLine, dest: d };
  }
  const p = requestOf(g);
  if (p) return { k: 'near', line: p.id, slots: p.slots, voice: p.voice, dest: who ? { x: who.x, z: who.z, space: who.space || F.Space.cur, near: true } : null };
  const d = wayTo(who);                                               // (nothing to repeat: the clouds to the giver right here)
  return { k: 'near', line: 'hud_trail_go', dest: d };
}
/* ---- no goal: the post, then ONE suggestion nearby (clarity §5.4–5.5) */
const visitedToday = () => { const hs = F.save.hud = (F.save.hud && typeof F.save.hud === 'object') ? F.save.hud : {}; const d = F.save.day || 1; if (!hs.vday || hs.vday.d !== d) hs.vday = { d, ids: [] }; return hs.vday; };
F.on('regionEntered', r => { try { const v = visitedToday(), id = r && r.id != null ? String(r.id) : null; if (id && !v.ids.includes(id)) v.ids.push(id); } catch (e) { /* save not ready */ } });
function postDest() {
  try {
    const t = F.Quest && F.Quest.postTarget ? F.Quest.postTarget() : null;
    if (t && t.post) return t;
  } catch (e) { /* no post */ }
  return null;
}
function nearestBy(list, P, r) { let best = null, bd = r; for (const it of list) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d <= bd) { bd = d; best = it; } } return best; }
// every kind of suggestion that exists here right now, in §5's order: [{k, line, t}]
function suggestions() {
  const P = P2(), sp = F.Space.cur, out = [];
  // a white bubble (someone wishes for something) on screen, ≤ 30 m
  try {
    const L = (F.Act && F.Act.list || []).filter(a => a.wish && !a.wish.gold && a.wish.kind !== 'quest' && a.wish.kind !== 'stall' && !a.wish.story && a.space === sp && a.bubbleEl && a.bubbleEl.style.display !== 'none' && a.bubbleEl.isConnected);
    const a = nearestBy(L, P, 30); if (a) out.push({ k: 'hjelp', line: 'hud_sug_hjelp', t: { x: a.x, z: a.z, space: sp, actor: a.id } });
  } catch (e) { /* actors not ready */ }
  // an animal she has not met («?»)
  try {
    if (F.Fauna && typeof F.Fauna.unknownNear === 'function' && sp === 'out') {
      const L = (F.Fauna.unknownNear(P.x, P.z, 30) || []).map(r => { const p = r && (r.x != null ? r : r.pos || (r.obj && r.obj.position)); return p ? { x: p.x, z: p.z, rec: r } : null; }).filter(Boolean);
      const a = nearestBy(L, P, 30); if (a) out.push({ k: 'dyr', line: 'fa_new', t: { x: a.x, z: a.z, space: sp } });
    }
  } catch (e) { /* fauna not ready */ }
  // a Tryllepunkt waiting for a spell; then a puzzle spot that twinkles
  try {
    const things = F.Things.list.filter(th => th.space === sp && th.obj && th._invite && !th.hidden && Math.hypot(th.x - P.x, th.z - P.z) <= 30);
    const tp = nearestBy(things.filter(th => th.type === 'n_tryllepunkt'), P, 30);
    if (tp) out.push({ k: 'stav', line: 'hud_sug_stav', t: { x: tp.x, z: tp.z, space: sp, thing: tp.id } });
    const tw = nearestBy(things.filter(th => th.type !== 'n_tryllepunkt' && !(th.def && th.def.objSpec && th.def.objSpec.twinkle === false) && !/postkasse/.test(th.type)), P, 30);
    if (tw) out.push({ k: 'glitter', line: 'hud_sug_glitter', t: { x: tw.x, z: tw.z, space: sp, thing: tw.id } });
  } catch (e) { /* things not ready */ }
  // indoors and nothing of the above in this room: the way out
  if (sp === 'in') { const ex = exitIn(); if (ex) out.push({ k: 'ut', line: exitLine(ex), t: ex, exit: true }); }
  // a kingdom she has not found: fly toward its light
  if (sp === 'out') {
    try {
      const L = F.Realm && F.Realm.list ? F.Realm.list().filter(r => r.state === 'appeared') : [];
      const r = nearestBy(L, P, Infinity);
      if (r) { const g = F.Realm.gate ? F.Realm.gate(r.id) : null; out.push({ k: 'lys', line: 'hud_sug_lys', t: { x: g ? g.x : r.x, z: g ? g.z : r.z, space: 'out', realm: r.id } }); }
    } catch (e) { /* realms not ready */ }
    // otherwise: the nearest village not visited today, else home to the tower
    try {
      const vis = visitedToday().ids, cur = F.W && F.W.currentRegion ? String(F.W.currentRegion()) : null;
      const L = (F.W && F.W.villages ? F.W.villages({ x: P.x, z: P.z }, 700) : []).filter(v => v && v.x != null && !vis.includes(String(v.regionId)) && String(v.regionId) !== cur);
      const v = nearestBy(L, P, 700);
      const h = homePos(), atHome = Math.hypot(h.x - P.x, h.z - P.z) < 25;
      if (v) out.push({ k: 'tur', line: 'hud_trail_go', t: { x: v.x, z: v.z, space: 'out', village: v.regionId } });
      else if (!atHome) out.push({ k: 'tur', line: 'hud_trail_go', t: Object.assign({}, h) });
      else { const v2 = nearestBy((F.W && F.W.villages ? F.W.villages({ x: P.x, z: P.z }, 700) : []).filter(x => x && x.x != null), P, 700); if (v2) out.push({ k: 'tur', line: 'hud_trail_go', t: { x: v2.x, z: v2.z, space: 'out', village: v2.regionId } }); }
    } catch (e) { /* world not ready */ }
  }
  return out;
}
H.suggestions = suggestions;
function freeAnswer() {
  const post = postDest();
  if (post) { const d = wayTo(post); return { k: 'post', line: d && d.exit ? exitLine(d) : 'home_post', dest: d }; }
  const S = suggestions();
  if (!S.length) { const d = wayTo(homePos()); return { k: 'tur', line: 'hud_trail_go', dest: d }; }
  const pick = S.find(s => s.k !== lastKind) || S[0];
  const d = pick.exit ? wayTo(Object.assign({ space: 'in' }, pick.t)) : wayTo(pick.t);
  if (d && pick.exit) d.exit = true;                                  // (the way out of this room / floor / building)
  return { k: pick.k, line: pick.line, dest: d ? Object.assign(d, { kind: pick.k }) : null };
}
// legacy name (tests, the idle offer): the way to the open goal, else Puff's free answer – quiet = no line
function showWay(quiet) {
  if (quiet) { const g = goalNow(); let t = null; try { t = g ? (g.target || giverPos(g)) : (F.Quest.target ? F.Quest.target() : null); } catch (e) { t = null; } const d = t ? wayTo(t) : null; if (d) H.lastWay = d; return !!d; }
  const r = answer(); return !!(r && r.dest);
}
H.showWay = showWay;

/* ---- the rolling cloud-puff trail (clarity §3.3.3): small soft white puffs every 1.4 m along the next 45 m (A* under 70 m), a wave at
   once and then every 2.4 s from where she is; each puff rises 0.3 m and lives 2.9 s (it fades in its last 1.3 s, so the next wave
   overlaps it: the way never blinks out); 0.62 m near the camera, larger when zoomed out. Stops on arrival (< 4 m), a new answer,
   a task or panel, a space change, or after 60 s. A tap within 2 m of a live puff flies her to the farthest one (input.js: trailSnap). */
let puffTex = null;
function puffTexture() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas'); c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  const blob = (x, y, r) => { const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.62, 'rgba(246,250,255,.96)'); gr.addColorStop(0.86, 'rgba(214,230,252,.75)'); gr.addColorStop(1, 'rgba(200,220,250,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  blob(30, 38, 20); blob(62, 36, 22); blob(46, 26, 20); blob(48, 42, 18);
  puffTex = new THREE.CanvasTexture(c);
  return puffTex;
}
const puffs = [];
function puffDot(pos, o) {
  o = o || {};
  const scn = F.Space && F.Space.scene ? F.Space.scene() : F.R.scene;
  if (!scn || !pos) return null;
  const mat = new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false, opacity: 0, fog: false });
  mat.toneMapped = false;
  const s = new THREE.Sprite(mat);
  // 0.62 m near her; further from the camera (zoomed out) a puff grows so it stays a readable cloud on screen (≈ 3.5 % of the distance)
  let camD = 0; try { camD = F.R.camera.position.distanceTo(new THREE.Vector3(pos.x, pos.y != null ? pos.y : F.Player.pos.y, pos.z)); } catch (e) { camD = 0; }
  const sz = o.size || Math.max(0.62, Math.min(2.2, camD * 0.035));
  s.scale.set(sz, sz * 0.66, 1); s.raycast = () => {}; s.renderOrder = 4; s.name = 'puffDot';
  const y = pos.y != null ? pos.y : F.Space.heightAt(pos.x, pos.z) + 0.28;
  s.position.set(pos.x, y, pos.z); scn.add(s);
  const d = { s, t0: F.T.now, x: pos.x, z: pos.z, y0: y, i: o.i || 0, wave: o.wave || 0, life: o.life || 2.9, space: F.Space.cur, sz };
  puffs.push(d);
  return d;
}
H.puffDot = puffDot;
function killPuff(d) { if (d.s.parent) d.s.parent.remove(d.s); d.s.material.dispose(); }
F.on('tick', () => {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const d = puffs[i], k = (F.T.now - d.t0) / d.life;
    if (k >= 1 || d.space !== F.Space.cur) { killPuff(d); puffs.splice(i, 1); continue; }
    // in quickly, stay a clear cloud, then fade: the next wave (every 2.4 s) arrives before the last one is gone – no gaps in the way
    d.s.material.opacity = k < 0.1 ? k / 0.1 : k < 0.55 ? 1 : Math.max(0, 1 - (k - 0.55) / 0.45);
    d.s.position.y = d.y0 + 0.3 * k;
    const g = 1 + 0.18 * k; d.s.scale.set(d.sz * g, d.sz * 0.66 * g, 1);
  }
});
let fol = null;          // {dest, t0, next, wave, space, timers}
function stopFollow() { if (!fol) return; fol.timers.forEach(t => F.T.clear(t)); fol = null; }
H.stopFollow = stopFollow;
function wavePath(dest) {
  const P = P2(), sx = P.x, sz = P.z, gx = dest.x, gz = dest.z, D = Math.hypot(gx - sx, gz - sz);
  let pts = null;
  if (D < 70) { try { pts = F.Space.findPath(sx, sz, gx, gz, 0.35); } catch (e) { pts = null; } }
  if (!pts || !pts.length) { const L = Math.min(D, 45), n = Math.max(2, Math.ceil(L / 1.4)); pts = []; for (let i = 1; i <= n; i++) pts.push([sx + (gx - sx) * (L / D) * i / n, sz + (gz - sz) * (L / D) * i / n]); }
  const poly = [[sx, sz], ...pts], out = [];
  let acc = 0, next = 1.6;
  for (let i = 1; i < poly.length && next <= 45; i++) {
    const [ax, az] = poly[i - 1], [bx, bz] = poly[i], seg = Math.hypot(bx - ax, bz - az);
    while (next <= acc + seg && next <= 45) { const f = (next - acc) / seg; out.push([ax + (bx - ax) * f, az + (bz - az) * f]); next += 1.4; }
    acc += seg;
  }
  if (!out.length && D > 0.5) out.push([gx, gz]);
  return out;
}
function wave() {
  if (!fol) return;
  const f = fol, w = ++f.wave, list = wavePath(f.dest);
  list.forEach(([x, z], i) => f.timers.push(F.T.timeout(() => { if (fol !== f || F.Space.cur !== f.space) return; puffDot({ x, z }, { i, wave: w }); }, i * 55)));
  f.timers = f.timers.slice(-120);
}
function follow(dest, o) {
  stopFollow();
  if (!dest || dest.x == null) return false;
  fol = { dest: { x: dest.x, z: dest.z }, t0: F.T.now, next: F.T.now + 2.4, wave: 0, space: F.Space.cur, timers: [], o: o || {} };
  wave();
  F.emit('trailStart', { x: dest.x, z: dest.z });
  return true;
}
H.follow = follow;
F.on('tick', () => {
  if (!fol) return;
  const P = P2();
  const end = F.Space.cur !== fol.space || F.Task.current || (F.UI && F.UI.isOpen && F.UI.isOpen()) || F.T.now - fol.t0 > 60 || Math.hypot(fol.dest.x - P.x, fol.dest.z - P.z) < 4 || (F.Shell && F.Shell.screen) || (F.Travel && F.Travel.busy);
  if (end) { stopFollow(); return; }
  if (F.T.now >= fol.next) { fol.next += 2.4; wave(); }
});
['taskStart', 'spaceChanged', 'travelStart'].forEach(ev => F.on(ev, stopFollow));
const livePuffs = () => puffs.filter(d => d.space === F.Space.cur && F.T.now - d.t0 < d.life * 0.92);
H.trailLive = () => !!fol || livePuffs().length > 0;
H.trailDots = () => livePuffs().map(d => ({ x: d.x, z: d.z, i: d.i, wave: d.wave, age: +(F.T.now - d.t0).toFixed(2) }));
// a ground tap near a live puff → the farthest live puff of the newest wave (she flies along the way, not just one step)
H.trailSnap = function (x, z) {
  const L = livePuffs(); if (!L.length) return null;
  if (!L.some(d => Math.hypot(d.x - x, d.z - z) <= 2)) return null;
  const maxW = Math.max(...L.map(d => d.wave)), W = L.filter(d => d.wave === maxW);
  const far = W.reduce((a, d) => (d.i > a.i ? d : a), W[0]);
  return { x: far.x, z: far.z };
};
// legacy: a one-off way from (sx, sz) to (gx, gz) – now the same clouds (shop delivery trails, old callers)
function trail(sx, sz, gx, gz) { void sx; void sz; return follow({ x: gx, z: gz }); }
H.trail = trail;

/* ------------------------------------------------------------ subtitle never covers an open panel (its ✓ and buttons):
   it moves above the top panel, or to the top of the screen when there is no room */
let subMoved = false;
let panelOn = false, shopOn = false;
function subPlace() {
  const po = !!(F.UI && F.UI.isOpen());
  if (po !== panelOn) { panelOn = po; document.body.classList.toggle('panel-on', po); }   // css: the region banner hides under panels/map
  const so = po && !!document.querySelector('#panels .panel-wrap.shop-panel.on');             // a shop shows its own purse: the HUD one steps aside
  if (so !== shopOn) { shopOn = so; document.body.classList.toggle('shop-on', so); }
  const s = document.getElementById('sub'); if (!s) return;
  let pan = null;
  if (F.UI && F.UI.isOpen() && s.classList.contains('on') && !(F.Shell && F.Shell.screen)) {
    const L = document.querySelectorAll('#panels .panel-wrap.on > .panel'); pan = L.length ? L[L.length - 1].getBoundingClientRect() : null;
  }
  if (!pan || !pan.width) { if (subMoved) { subMoved = false; s.style.top = ''; s.style.bottom = ''; } return; }
  const sr = s.getBoundingClientRect();
  if (!subMoved && (sr.bottom < pan.top || sr.top > pan.bottom)) return;     // already clear of the panel
  const top = Math.max(8, pan.top - s.offsetHeight - 10);
  s.style.top = top.toFixed(0) + 'px'; s.style.bottom = 'auto'; subMoved = true;
}
F.on('preRender', subPlace);

/* ------------------------------------------------------------ idle helper: 90 s without input + an open goal → Puff offers the way */
const IDLE_S = 90;
// natural audit §3 #49 / clarity §5: only when there IS a goal to show the way to (an opened letter, an accepted bubble, Mia's story) –
// never for the post or free play
const idleTarget = () => { try { return !!goalNow(); } catch (e) { return false; } };
const markInput = () => { H.lastInput = F.T.now; if (H.idleOffered) { H.idleOffered = false; glow(); } };
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, e => { if (H.puff && H.puff.contains(e.target)) return; markInput(); }, { capture: true }));
F.on('tick', () => {
  if (!H.built || H.hidden || (F.Shell && F.Shell.screen)) { H.lastInput = F.T.now; return; }
  if (F.Task.current || F.UI.isOpen() || F.Player.moving || (F.Onboard && F.Onboard.active) || H.scene()) { H.lastInput = F.T.now; return; }
  // v5 WP-W (DESIGN4 §5): Puff's unsolicited «Skal jeg vise vei?» stays quiet in the play break (F.Quest.quiet)
  if (F.Quest && F.Quest.quiet && F.Quest.quiet() && !(F.Quest.storyPending)) { H.lastInput = F.T.now; return; }
  // idle ≥ 90 s with a goal: spoken once a session – after that Puff only glows (a tap on the glowing Puff still answers)
  if (!H.idleOffered && F.T.now - H.lastInput > IDLE_S && idleTarget()) {
    H.idleOffered = true; glow();
    if (!H.idleSpoken) { H.idleSpoken = true; F.SAYF('hud_idle_offer'); }
  }
});

/* ------------------------------------------------------------ a far goal (> 250 m): F.Map.target marks it on the map. clarity §3.3.4: the
   Kart button no longer glows for it and nobody says «Trykk på kartet!» (Puff answers with the ride); the 'new' kingdom glow stays */
let farAcc = 0;
F.on('tick', dt => {
  farAcc += dt; if (farAcc < 1) return; farAcc = 0;
  if (!H.built || H.hidden || (F.Shell && F.Shell.screen)) return;
  let t = null; try { t = F.Quest && F.Quest.target ? F.Quest.target() : null; } catch (e) { t = null; }
  if (t && !t.far) t = null;
  let o = null; if (t) { try { o = F.Quest.outdoorOf ? F.Quest.outdoorOf(t) : null; } catch (e) { o = null; } if (!o && (t.space || 'out') === 'out' && t.x != null) o = { x: t.x, z: t.z }; }
  if (F.Map) F.Map.target = t ? { realm: t.realm || null, home: !!t.home, x: o ? o.x : null, z: o ? o.z : null } : null;
  if (glowWhy.has('far')) H.mapGlow(false, 'far');
});

/* ------------------------------------------------------------ tasks: hide Staven, raise Puff; tray placement */
// natural audit D11 (#54): during a task the purse collapses to its pouch + the count (body.hud-mini, css/hud.css) – the big coins and
// the ten-frame never sit over a task board's plaques; it opens again when coins arrive (the payoff) or the task ends
F.on('taskStart', () => { document.body.classList.add('hud-task', 'hud-mini'); if (H.map) H.map.style.opacity = '.35'; });
F.on('taskEnd', () => { document.body.classList.remove('hud-task', 'hud-mini'); if (H.map) H.map.style.opacity = ''; H.hint(false); });
F.on('coins', (t, d) => { if (d > 0) document.body.classList.remove('hud-mini'); });
H.showTray = function (open, px) {
  H.trayOpen = !!open;
  document.body.classList.toggle('tray-open', !!open);
  if (open) {
    if (!px) { const t = document.getElementById('tray'); if (t) { const r = t.getBoundingClientRect(); px = Math.max(r.height, innerHeight - r.top); } }
    document.documentElement.style.setProperty('--hud-tray-h', Math.round(px > 20 ? px : 200 * (H.u || 1)) + 'px');
  }
};
// robust tray detection (works with whatever element CORE's F.UI.tray uses)
let trayEl = null, trayChk = 0;
F.on('tick', dt => {
  trayChk += dt; if (trayChk < 0.1) return; trayChk = 0;
  if (!trayEl || !trayEl.isConnected) trayEl = document.querySelector('#tray, .tray, .ktray');
  const open = !!(trayEl && trayEl.isConnected && (trayEl.classList.contains('on') || trayEl.classList.contains('open')) && getComputedStyle(trayEl).display !== 'none');
  if (open) { const h = trayEl.getBoundingClientRect().height; const top = innerHeight - trayEl.getBoundingClientRect().top; H.showTray(true, Math.max(h, top)); }
  else if (H.trayOpen) H.showTray(false);
});

/* ------------------------------------------------------------ the spell bar is open: Staven hides (it would cover the bar's keys) */
F.on('wandOpen', () => document.body.classList.add('wand-open'));
F.on('overview', on => document.body.classList.toggle('overview-on', !!on));        // the dollhouse overview is a map: no Staven there
F.on('spaceChanged', () => { if (F.Space.cur !== 'in') document.body.classList.remove('overview-on'); });
F.on('wandClosed', () => document.body.classList.remove('wand-open'));
F.on('spaceChanged', () => { if (!(F.Wand.isOpen && F.Wand.isOpen())) document.body.classList.remove('wand-open'); });

/* ------------------------------------------------------------ Puff talks while the narrator speaks */
F.on('subtitle', (text, voice) => { if (H.puff) H.puff.classList.toggle('talk', !!text && !voice); });

/* ------------------------------------------------------------ sparkle fade (teleports, space changes) */
H.fade = async function (fn, o) {
  o = o || {};
  if (!H.fadeEl) { if (fn) await fn(); return; }
  const sun = !!o.sunrise;
  H.fadeEl.classList.toggle('sunrise', sun);
  H.fadeEl.classList.add('on'); if (sun) F.sfx.chime(); else F.sfx.magic();
  await F.T.sleep(sun ? 1300 : 420);
  try { if (fn) await fn(); } catch (e) { console.error(e); }
  await F.T.sleep(sun ? 400 : 150);
  H.fadeEl.classList.remove('on');
  if (sun) F.T.timeout(() => H.fadeEl.classList.remove('sunrise'), 500);
};

/* ------------------------------------------------------------ region banner + welcome lines */
/* v3 WP5 (DESIGN3 §9.1/§9.2): the banner text is tryRead (stem bold; 1st tap sounds the stem out by LYD, 2nd tap says the name).
   First visit to a region / the daily kingdom welcome: the banner glows and the narrator invites her to read it (hud_welcome_les);
   if she has not tapped it after 6 s, the old name line plays (hud_welcome_place / F.Realm.sayWelcome), so she always learns where
   she is. Tapped once but not twice: the name line follows 7 s after her sound-out. Read it herself → no extra name line. */
let bannerT = null, bannerTR = null;
H.banner = function (name, o) {
  if (!H.placeEl || !name) return;
  o = o || {};
  H.placeEl.textContent = F.UI.caseText ? F.UI.caseText(name) : name; H.placeEl.dataset.name = name;
  H.placeEl.dataset.realm = o.realm || '';
  H.placeEl.classList.toggle('realm', !!o.realm);
  if (o.realm && F.Realm && F.Realm.emblemIcon) { try { const em = F.Realm.emblemIcon(o.realm, 52); if (em) { em.className = 'hud-crest'; em.style.cssText = ''; H.placeEl.prepend(em); } } catch (e) { /* no crest */ } }
  if (bannerTR) { bannerTR.remove(); bannerTR = null; }
  if (F.UI.tryRead) {
    let realms = []; try { realms = F.SETS.get('REALMS'); } catch (e) { realms = []; }
    const isRealm = !!(o.realm && realms.includes(name));
    const tpl = isRealm ? 'map_navn' : (F.SETS.PLACES.includes(name) ? 'hud_place' : null);
    const slots = isRealm ? { slott: name } : { place: name };
    bannerTR = F.UI.tryRead(H.placeEl, name, { stem: F.placeStem ? F.placeStem(name, o.realm) : null, tpl, slots, glow: !!o.read,
      onTap: step => { H.bannerTaps = (H.bannerTaps || 0) + 1; keepBanner(9); if (o.onTap) o.onTap(step); }, onWhole: () => { keepBanner(3.5); if (o.onWhole) o.onWhole(); } });
  }
  H.placeEl.classList.add('on');
  keepBanner(o.ms != null ? o.ms / 1000 : 4.5);
};
function keepBanner(sec) {
  if (bannerT) F.T.clear(bannerT);
  bannerT = F.T.timeout(() => { H.placeEl.classList.remove('on'); H.placeEl.classList.remove('tr-glow'); }, sec * 1000);
}
H.bannerTryRead = () => bannerTR;
const lastWelcome = {};
// the place welcome never lands inside a task prompt (review WP10 #1): it waits for taskEnd while she is still there
let hereId = null, pendingWelcome = null, welcome = null;
const todayN = () => (F.save && F.save.day) || 0;
function readWelcome(p) {
  // p: {id, name, realm?}  → the glowing banner + «Kan du lese navnet?»; fallback = the old name line
  if (welcome) welcome.cancel();
  const w = welcome = { p, done: false, timer: null, tapped: false };
  const clear = () => { if (w.timer) { F.T.clear(w.timer); w.timer = null; } };
  w.cancel = () => { clear(); w.done = true; if (welcome === w) welcome = null; };
  const finish = () => { if (w.done) return; w.cancel(); if (H.placeEl) H.placeEl.classList.remove('tr-glow'); keepBanner(3); };
  const nameLine = () => {
    if (w.done) return;
    finish();
    if (hereId !== p.id || (F.Task && F.Task.current) || F.Space.cur !== 'out' || (F.Shell && F.Shell.screen)) return;
    if (p.realm) { try { if (F.Realm && F.Realm.sayWelcome) F.Realm.sayWelcome(p.realm); } catch (e) { console.error(e); } }
    else F.SAYF('hud_welcome_place', { place: p.name });
  };
  H.welcomeFlow = w;
  if (p.realm) { const wr = F.save.wread = (F.save.wread && typeof F.save.wread === 'object') ? F.save.wread : {}; wr[p.id] = todayN(); F.store && F.store(); }
  H.banner(p.name, { realm: p.realm, read: true, ms: 16000,
    onTap: step => { w.tapped = true; clear(); if (step === 1 && !w.done) w.timer = F.T.timeout(nameLine, 7000); },
    onWhole: () => { w.read = true; finish(); } });
  const startWait = () => { if (!w.done && !w.tapped) { clear(); w.timer = F.T.timeout(nameLine, 6000); } };
  if (F.TPL.has('hud_welcome_les')) F.SAY('hud_welcome_les').then(startWait); else startWait();
  return w;
}
H.readWelcome = readWelcome;
F.on('taskEnd', () => {
  const p = pendingWelcome; pendingWelcome = null;
  if (p) F.T.timeout(() => {
    if (hereId !== p.id || (F.Task && F.Task.current) || F.Space.cur !== 'out' || (F.Shell && F.Shell.screen)) return;
    readWelcome(p);
  }, 1400);
});
// a task starting while the welcome waits: no name line inside the prompt (the banner stays tappable after the task)
F.on('taskStart', () => { if (welcome) { welcome.cancel(); if (H.placeEl) H.placeEl.classList.remove('tr-glow'); } });
F.on('regionEntered', (r, info) => {
  if (!r || (F.Shell && F.Shell.screen)) return;
  const id = r.id != null ? String(r.id) : String(r.name || r);
  hereId = id;
  const name = r.name || (typeof r === 'string' ? r : null);
  const vis = F.save.visited = Array.isArray(F.save.visited) ? F.save.visited : [];
  const first = info && info.first != null ? !!info.first : !vis.includes(id);
  if (!vis.includes(id)) { vis.push(id); F.store(); }
  if (!name) return;
  if (lastWelcome[id] && F.T.now - lastWelcome[id] < 90) return;
  if (r.realm) {
    // a kingdom (DESIGN2 §3.6): crest + castle name; a building site gets no banner (its name is not known yet)
    let st = null; try { st = F.Realm && F.Realm.state ? F.Realm.state(r.realm) : null; } catch (e) { st = null; }
    if (!st || st === 'site') return;
    lastWelcome[id] = F.T.now;
    F.sfx.chime();
    // found/friend: the daily reading welcome (the first arrival is the king's own «Velkommen til {slott}!», WP7)
    const wr = F.save.wread && typeof F.save.wread === 'object' ? F.save.wread : {};
    if ((st === 'found' || st === 'friend') && wr[id] !== todayN()) {
      if (F.Task && F.Task.current) { H.banner(name, { realm: r.realm }); pendingWelcome = { id, name, realm: r.realm }; }
      else readWelcome({ id, name, realm: r.realm });
      return;
    }
    H.banner(name, { realm: r.realm });
    // v5 WP-W (logic #52): no narrator «Velkommen til …» on top of the king's own greeting (first arrival ceremony, WP-X / realm.js) –
    // wait a moment and stay quiet while / right after a royal greeting runs in this kingdom
    const royalGreets = () => { const R = F.Royals; return !!(R && ((R.greeting && R.greeting[r.realm]) || (R.greetEndT != null && F.T.now - R.greetEndT < 30))); };
    if (!(F.Task && F.Task.current) && !royalGreets()) F.T.timeout(() => {
      if (hereId !== id || (F.Task && F.Task.current) || royalGreets()) return;
      try { if (F.Realm.sayWelcome) F.Realm.sayWelcome(r.realm); } catch (e) { console.error(e); }
    }, 2500);
    return;
  }
  lastWelcome[id] = F.T.now;
  F.sfx.chime();
  if (F.SETS.PLACES.includes(name) && first) {
    if (F.Task && F.Task.current) { H.banner(name); pendingWelcome = { id, name }; }
    else readWelcome({ id, name });
    return;
  }
  H.banner(name);
});
// the banner belongs to the place she is in: a cloud ride or a door into a building takes it away
const bannerOff = () => { if (welcome) welcome.cancel(); if (H.placeEl) H.placeEl.classList.remove('on', 'tr-glow'); };
F.on('travelStart', bannerOff);
F.on('spaceChanged', () => { if (F.Space.cur === 'in') bannerOff(); });
// WP3 hands the kingdom welcome to the banner (DESIGN2 §3.6)
F.on('boot', () => { if (F.Realm && F.Realm.sayWelcome) F.Realm.autoWelcome = false; });
F.on('ready', () => { if (F.Realm && F.Realm.sayWelcome) F.Realm.autoWelcome = false; });

/* ------------------------------------------------------------ keyboard: M = map; Esc = close the top panel, otherwise pause */
function closeTopPanel() {
  const w = [...document.querySelectorAll('#panels .panel-wrap:not(.closing)')].pop();
  const x = w && w.querySelector('.panel-x');
  if (x) { x.click(); return true; }
  return !!w;                                       // a panel without ✕ (a task) stays; Esc does nothing then
}
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (!H.built) return;
  if (e.code === 'Escape') {
    if (F.Shell && F.Shell.screen === 'pause') { e.preventDefault(); F.Title.resume && F.Title.resume(); return; }
    if (H.busy()) return;
    // natural audit D6 (#41): Esc = «Fly videre» – she leaves the running task quietly (the same item waits for next time)
    // verify r2: in a task she may leave, Esc never opens the pause menu – also right after a solved answer (its payoff runs) and while
    // a left task is still clearing away (a 2nd Esc); in a task with no way out (a payment) Esc keeps its old meaning below
    if (F.Task && F.Task.current && typeof F.Task.leave === 'function') {
      const c = F.Task.current;
      if (F.Task.leave() || (c.S && c.S._leaveOk)) { e.preventDefault(); return; }
    }
    if (F.Map && F.Map.isOpen) { F.Map.close(); return; }
    if (F.Castle.ov || (F.BldMap && F.BldMap.isOpen) || (F.Wand.isOpen && F.Wand.isOpen())) return;     // the indoor map and the spell bar close themselves
    if (F.UI.isOpen()) { closeTopPanel(); return; }
    e.preventDefault();
    if (F.Title.pause) F.Title.pause();
    return;
  }
  if (H.busy()) return;
  if (e.code === 'KeyM' && !F.Task.current && !H.scene() && (!F.UI.isOpen() || (F.Map && F.Map.isOpen))) { F.Map && F.Map.toggle(); }
});
})();
