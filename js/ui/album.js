/* Feslottet – Vennealbumet (WP6 CATCH, DESIGN2 §5.1, §5.5, §5.7). The friend book: 110 cards on 11 pages (ids 10–20, shown and spoken as
   «Side 1» … «Side 11» since v5 – F.Album.side(id)), ten cards per page
   as a 2 × 5 ten-frame. Everything is spoken; nothing has to be read.
   F.Album.open(page?) – no page: the cover (friends as ten-rods + cubes, «Dagens dyr», the companion); 10–20: that page
   F.Album.close()  isOpen()  has(sp)  friends() -> [sp]  count()  pageOf(sp)  today() -> sp|null  page (current page or 0 = cover)
   Book: number tabs 10 … 20 as separate tiles with gaps (a number line along the top edge: 11 tabs down the side would be < 64 px at
   700–773 px screens); tap a tab → «Side 13.» and the page flips. Page: big number, name (tap → spoken), a little habitat picture,
   found dots in a ten-frame, 10 cards.
   Found card: thumbnail, name in big lowercase, tier gems → tap: its own voice (SFX) + the name, big card with «Følg meg!» for land animals.
   Unfound card: silhouette + up to 3 hint icons (habitat, condition, «langt borte») → tap: Puff says the hint chain.
   Page complete: gold edge (the reward itself is given by F.Befriend when the 10th friend arrives).
   v3: friend stars (Vennestjerne, 0–3) on found cards and on the big card (gold frame at 3); a card whose name she wrote/read herself
   (Navnelappen) carries .named.
   v5c WP-A2: ONE star row per card (friendship × knowledge: a star = a Vennestjerne won by remembering what the friend taught her, on a
   later day); found cards always show the 3 slots; the big card's fact panel shows the facts / word it taught (ear / tick / gold tick)
   and «?» rows that teach the next one (daily caps); tapping the star row tells how a star is won; in winter migrants / hibernators show
   a «på reise» / «vintersøvn» badge and their line (F.Fauna.awayKind).
   Debug: F.dbg.album(page) -> {page, cards, found}. */
(function () {
'use strict';
const F = window.F, U = F.U;
const UI = F.UI;
const B = () => F.Befriend;
const svg = (body, vb) => `<svg viewBox="${vb || '0 0 32 32'}" aria-hidden="true">${body}</svg>`;

/* ---------------------------------------------------------- icons (inline SVG, readable without words) */
const IC = {
  10: svg('<rect x="14" y="17" width="4" height="11" rx="1" fill="#9a6a3f"/><circle cx="16" cy="12" r="9" fill="#5cc46b"/><circle cx="11" cy="10" r="3" fill="#7fd98b"/><path d="M3 29h26" stroke="#5cc46b" stroke-width="3" stroke-linecap="round"/>'),
  11: svg('<path d="M5 15L16 5l11 10v13H5z" fill="#ffd9a8"/><path d="M3 16L16 4l13 12" fill="none" stroke="#e8735a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="19" width="6" height="9" rx="1" fill="#a86b3c"/>'),
  12: svg('<path d="M4 14L16 5l12 9v14H4z" fill="#e45b5b"/><rect x="11" y="17" width="10" height="11" fill="#fff"/><path d="M11 17l10 11M21 17L11 28" stroke="#e45b5b" stroke-width="2"/><path d="M2 29h28" stroke="#6cc070" stroke-width="3" stroke-linecap="round"/>'),
  13: svg('<path d="M16 30V17" stroke="#4caf50" stroke-width="3"/><path d="M16 23c-4 0-6-3-6-5 3 0 6 2 6 5z" fill="#6cc070"/><circle cx="16" cy="7" r="4" fill="#ff8fc0"/><circle cx="10" cy="12" r="4" fill="#ff8fc0"/><circle cx="22" cy="12" r="4" fill="#ff8fc0"/><circle cx="12" cy="18" r="0" fill="#ff8fc0"/><circle cx="16" cy="12" r="3.6" fill="#ffd34d"/>'),
  14: svg('<path d="M16 9c-2-5 1-7 4-7" fill="none" stroke="#7a4a2a" stroke-width="2.5" stroke-linecap="round"/><path d="M17 8c3-3 7-2 8 0-3 2-6 2-8 0z" fill="#5cc46b"/><path d="M16 10c-5-3-12 0-12 8 0 6 5 11 9 11 2 0 2-1 3-1s1 1 3 1c4 0 9-5 9-11 0-8-7-11-12-8z" fill="#ef4d5a"/><circle cx="11" cy="15" r="2" fill="#ff9aa2"/>'),
  15: svg('<path d="M16 3C11 11 8 15 8 19a8 8 0 0016 0c0-4-3-8-8-16z" fill="#56b6f0"/><path d="M12 20a4 4 0 004 4" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>'),
  16: svg('<path d="M12 30l2-14h4l2 14z" fill="#f2e2c4"/><g transform="translate(16 14)"><path d="M0 0L-2-12h4z" fill="#c9905a"/><path d="M0 0L12-2v4z" fill="#c9905a"/><path d="M0 0L2 12h-4z" fill="#c9905a"/><path d="M0 0L-12 2v-4z" fill="#c9905a"/><circle r="2.4" fill="#7a4a2a"/></g>'),
  17: svg('<circle cx="24" cy="8" r="4.5" fill="#ffd34d"/><path d="M2 22c5-3 9-3 14 0s9 3 14 0v8H2z" fill="#56b6f0"/><path d="M2 27c6-4 22-4 28 0v3H2z" fill="#f3d58c"/><path d="M8 25l3-5 3 5z" fill="#ff9a7a"/>'),
  18: svg('<path d="M2 12c3-3 6-3 9 0s6 3 9 0 6-3 9 0" fill="none" stroke="#3d8fe0" stroke-width="3" stroke-linecap="round"/><path d="M2 19c3-3 6-3 9 0s6 3 9 0 6-3 9 0" fill="none" stroke="#56b6f0" stroke-width="3" stroke-linecap="round"/><path d="M2 26c3-3 6-3 9 0s6 3 9 0 6-3 9 0" fill="none" stroke="#8fd0ff" stroke-width="3" stroke-linecap="round"/>'),
  19: svg('<g stroke="#7cc4f5" stroke-width="3" stroke-linecap="round"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13"/><path d="M12 5l4 4 4-4M12 27l4-4 4 4" fill="none"/></g>'),
  20: svg('<path d="M3 24a13 13 0 0126 0" fill="none" stroke="#ef4d5a" stroke-width="3"/><path d="M6.5 24a9.5 9.5 0 0119 0" fill="none" stroke="#ffd34d" stroke-width="3"/><path d="M10 24a6 6 0 0112 0" fill="none" stroke="#5cc46b" stroke-width="3"/><path d="M13.5 24a2.5 2.5 0 015 0" fill="none" stroke="#56b6f0" stroke-width="3"/>'),
  morgen: svg('<path d="M3 24h26" stroke="#e8a0c0" stroke-width="3" stroke-linecap="round"/><path d="M8 24a8 8 0 0116 0z" fill="#ffb3c8"/><g stroke="#ffb3c8" stroke-width="2.5" stroke-linecap="round"><path d="M16 7v4M6 12l3 3M26 12l-3 3"/></g>'),
  kveld: svg('<circle cx="16" cy="18" r="8" fill="#ff9c4a"/><path d="M2 24h28" stroke="#c96a2a" stroke-width="3" stroke-linecap="round"/><path d="M4 28h24" stroke="#f0b880" stroke-width="2" stroke-linecap="round"/>'),
  regn: svg('<path d="M3 20a13 13 0 0126 0" fill="none" stroke="#ef4d5a" stroke-width="2.6"/><path d="M6.5 20a9.5 9.5 0 0119 0" fill="none" stroke="#ffd34d" stroke-width="2.6"/><path d="M10 20a6 6 0 0112 0" fill="none" stroke="#56b6f0" stroke-width="2.6"/><g fill="#7cc4f5"><circle cx="8" cy="26" r="1.8"/><circle cx="16" cy="28" r="1.8"/><circle cx="24" cy="26" r="1.8"/></g>'),
  vind: svg('<g fill="none" stroke="#7cc4f5" stroke-width="3" stroke-linecap="round"><path d="M3 11h17a4 4 0 10-4-4"/><path d="M3 18h23a4 4 0 11-4 4"/><path d="M3 25h11"/></g>'),
  kikkert: svg('<g fill="#6b5d8f"><rect x="5" y="9" width="8" height="10" rx="3"/><rect x="19" y="9" width="8" height="10" rx="3"/><rect x="12" y="11" width="8" height="4"/></g><circle cx="9" cy="22" r="5.5" fill="#3b2f5c"/><circle cx="23" cy="22" r="5.5" fill="#3b2f5c"/><circle cx="9" cy="22" r="3" fill="#9fd8ff"/><circle cx="23" cy="22" r="3" fill="#9fd8ff"/>'),
  sted: svg('<path d="M10 30V14l6-6 6 6v16z" fill="#c9b8ff"/><path d="M16 1l1.6 3.6 3.9.4-2.9 2.6.8 3.9L16 9.6l-3.4 1.9.8-3.9-2.9-2.6 3.9-.4z" fill="#ffd34d"/><rect x="14" y="21" width="4" height="9" rx="2" fill="#7a5cc7"/>'),
  venner: svg('<path d="M10 25C4 20 2 17 2 13.5 2 11 4 9 6.5 9c1.5 0 2.7.8 3.5 2 .8-1.2 2-2 3.5-2C16 9 18 11 18 13.5 18 17 16 20 10 25z" fill="#ff7fb0"/><path d="M22 21c-4.5-3.8-6-6-6-8.6C16 10.6 17.4 9 19.3 9c1.1 0 2 .6 2.7 1.5.7-.9 1.6-1.5 2.7-1.5 1.9 0 3.3 1.6 3.3 3.4 0 2.6-1.5 4.8-6 8.6z" fill="#ffb3d1" transform="translate(2 4)"/>'),
  langt: svg('<path d="M1 28l9-14 6 8 5-6 10 12z" fill="#a9c8e8"/><path d="M8 17l2-3 2 3" fill="#fff"/><path d="M19 8h10M25 4l4 4-4 4" fill="none" stroke="#6b5d8f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  paw: svg('<ellipse cx="16" cy="21" rx="7" ry="6" fill="currentColor"/><ellipse cx="8" cy="13" rx="3" ry="3.6" fill="currentColor"/><ellipse cx="13" cy="8" rx="3" ry="3.8" fill="currentColor"/><ellipse cx="19" cy="8" rx="3" ry="3.8" fill="currentColor"/><ellipse cx="24" cy="13" rx="3" ry="3.6" fill="currentColor"/>'),
  home: svg('<path d="M4 15L16 5l12 10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14v14h7v-8h4v8h7V14" fill="currentColor"/>'),
  book: svg('<path d="M4 6c4-2 8-2 12 1v21c-4-3-8-3-12-1z" fill="#ff9cc8"/><path d="M28 6c-4-2-8-2-12 1v21c4-3 8-3 12-1z" fill="#c9b8ff"/><g transform="translate(16 16) scale(.38)" fill="#fff"><ellipse cx="0" cy="5" rx="7" ry="6"/><ellipse cx="-8" cy="-3" rx="3" ry="3.6"/><ellipse cx="-3" cy="-8" rx="3" ry="3.8"/><ellipse cx="3" cy="-8" rx="3" ry="3.8"/><ellipse cx="8" cy="-3" rx="3" ry="3.6"/></g>'),
  speak: svg('<path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11a6 6 0 010 10M24 7a11 11 0 010 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  // v5c WP-A2: fact marks (heard = an ear, remembered = a tick, gold = a gold tick) – the stars belong to the card only
  ear: svg('<path d="M10 13a7 7 0 0114 0c0 4-3 5-4 8s-2 6-6 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M14 13a3 3 0 016 0c0 2-2 2-2 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  tick: svg('<path d="M7 17l6 6L25 9" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  // natural audit: a fact she SAW (the friend munched its food at the win) but never heard – an eye, not the ear
  eye: svg('<path d="M3 16c4-6 8.5-9 13-9s9 3 13 9c-4 6-8.5 9-13 9S7 22 3 16z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.2" fill="currentColor"/>'),
  dots: svg('<circle cx="7" cy="16" r="3" fill="currentColor"/><circle cx="16" cy="16" r="3" fill="currentColor"/><circle cx="25" cy="16" r="3" fill="currentColor"/>'),
  // v5c WP-A2 seasons: «på reise» (a bird flying toward the sun) and «vintersøvn» (a moon with z z)
  reise: svg('<circle cx="25" cy="8" r="5" fill="#ffd34d"/><path d="M3 20c4-4 8-4 11 0 3-4 7-4 11 0" fill="none" stroke="#6b5d8f" stroke-width="3" stroke-linecap="round"/><path d="M6 27h14M16 23l4 4-4 4" fill="none" stroke="#56b6f0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  dvale: svg('<path d="M20 5a11 11 0 100 22A9 9 0 0120 5z" fill="#c9b8ff"/><path d="M21 9h6l-6 7h6M14 17h4l-4 5h4" fill="none" stroke="#6b5d8f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
};
const awayOf = id => { try { return F.Fauna && F.Fauna.awayKind ? F.Fauna.awayKind(id) : null; } catch (e) { return null; } };
const starReadyOf = id => { try { return !awayOf(id) && !!(F.Befriend && F.Befriend.starReady && F.Befriend.starReady(id)); } catch (e) { return false; } };

/* ---------------------------------------------------------- state */
const save = () => (B() && B().save ? B().save() : (F.save.album = F.save.album || { friends: {} }));
const species = () => (B() && B().species ? B().species() : []);
const pageList = () => (B() && B().pages ? B().pages() : []);
const spOf = id => (B() && B().byId ? B().byId(id) : null);
const tp = id => (B() && B().thumb ? B().thumb(id, 160) : '');
const silOf = id => { try { return (B() && B().thumb ? B().thumb(id, 160, true) : '') || ''; } catch (e) { return ''; } };   // lilac side profile (WP5)
const day = () => F.save.day || 1;
let panel = null, cur = 0, root = null, body = null, tabsEl = null, big = null, localComp, saidOpen = false;

function friends() { return Object.keys(save().friends || {}); }
// v5 WP-A (DESIGN4 §8, DESIGN5 §2.4): the book counts naturally – «Side 1» … «Side 11». Page ids stay 10–20 in data and saves
// (F.FAUNA pages, s.page, A.pages{}); only the shown / spoken number changes: side(10) = 1 … side(20) = 11.
function side(n) { const L = pageList(); const i = L.findIndex(p => p.n === +n); return i >= 0 ? i + 1 : Math.max(1, (+n || 10) - 9); }
function companion() {
  let c = null; try { c = F.Fauna && F.Fauna.companion ? F.Fauna.companion() : null; } catch (e) { c = null; }
  if (localComp !== undefined && c == null) return localComp;     // WP4 stub: remember what she chose this session
  return c || null;
}
// «Dagens dyr»: WP4's pick (F.Fauna.today), else one un-befriended vanlig/sjelden species from pages she can reach (stable all day)
function today() {
  const A = save();
  let sp = null; try { sp = F.Fauna && F.Fauna.today ? F.Fauna.today() : null; } catch (e) { sp = null; }
  if (sp && spOf(sp) && !A.friends[sp]) return sp;
  if (A.todayPick && A.todayPick.day === day() && spOf(A.todayPick.sp) && !A.friends[A.todayPick.sp]) return A.todayPick.sp;
  const pagesHad = new Set([10, 11]); for (const id in A.friends) { const s = spOf(id); if (s) pagesHad.add(s.page); }
  const pool = species().filter(s => !A.friends[s.id] && s.tier <= 2 && pagesHad.has(s.page) && !s.when.weather);
  const pool2 = pool.length ? pool : species().filter(s => !A.friends[s.id] && s.tier <= 3);
  if (!pool2.length) return null;
  const pick = pool2[U.hashStr ? (U.hashStr('dagens' + day() + ':' + (F.save.created || 0)) >>> 0) % pool2.length : day() % pool2.length];
  A.todayPick = { day: day(), sp: pick.id }; F.store();
  return pick.id;
}

/* ---------------------------------------------------------- speech chains */
// the page hint id (album pages 10–20 = habitats): «Den bor i slottsparken.» … «Den bor ved noe stort og spesielt.»
const hintId = n => { n = Math.max(10, Math.min(20, +n || 10)); return F.TPL.has('al_h_' + n) ? 'al_h_' + n : 'al_h_10'; };
function hintIds(s) {
  const ids = [];
  const aw = awayOf(s.id); if (aw && F.TPL.has('al_' + aw)) ids.push('al_' + aw);   // v5c: «Den er på reise …» / «Den sover vintersøvn …» first
  ids.push(s.page === 20 && s.landmark && F.TPL.has('al_lm_' + s.landmark) ? 'al_lm_' + s.landmark : hintId(s.page));
  const w = s.when || {};
  if (w.phase === 'morgen') ids.push('al_c_morgen'); else if (w.phase === 'kveld') ids.push('al_c_kveld');
  if (w.weather === 'regn') ids.push('al_c_regn'); else if (w.weather === 'vind') ids.push('al_c_vind');
  if (w.needs === 'kikkert') ids.push('al_c_kikkert');
  else if (w.needs && w.needs.friends) ids.push('al_c_friends');
  else if (w.needs && w.needs.pages) ids.push('al_c_sea');
  if (isFar(s) && ids.length < 3) ids.push('al_c_far');
  ids.push('al_t_' + s.tier);
  return ids;
}
const PAGE_RING = { 10: 0, 11: 0, 12: 1, 13: 1, 14: 2, 15: 1, 16: 2, 17: 2, 18: 2, 19: 2, 20: 2 };
const isFar = s => Math.max((s.when && s.when.ring) || 0, PAGE_RING[s.page] || 0) >= 2;
function hintIcons(s) {
  const aw = awayOf(s.id);
  const out = [aw ? IC[aw] : s.page === 20 ? IC.sted : (IC[s.page] || IC[10])];          // legends: the landmark instead of the (same) page icon; v5c: away
  const w = s.when || {};
  if (w.phase === 'morgen') out.push(IC.morgen); else if (w.phase === 'kveld') out.push(IC.kveld);
  else if (w.weather === 'regn') out.push(IC.regn); else if (w.weather === 'vind') out.push(IC.vind);
  else if (w.needs === 'kikkert') out.push(IC.kikkert); else if (w.needs) out.push(IC.venner);
  if (out.length < 3 && w.needs === 'kikkert' && !out.includes(IC.kikkert)) out.push(IC.kikkert);
  else if (out.length < 3 && isFar(s)) out.push(IC.langt);
  return out.slice(0, 3);
}
let chainTok = 0;
async function sayChain(list) {               // [[id, slots], …] – a new chain cuts the old one
  const tok = ++chainTok;
  F.Speech.clearQueue();
  for (const [id, slots] of list) { if (tok !== chainTok || !panel) return; if (F.TPL.has(id)) await F.SAY(id, slots || {}); }
}
// a found card: the animal's own voice (its synthesized SFX – natural audit D2: no narrated «Den sier mø!») + the bare name
function sayFound(s) {
  try { if (F.VIT && F.VIT.heardName) F.VIT.heardName(s.id); } catch (e) { /* knowledge state */ }   // v5: the name heard again
  const list = [];
  list.push(['bf_name', { dyr: s.word }]);
  const aw = awayOf(s.id); if (aw && F.TPL.has('al_' + aw)) list.push(['al_' + aw]);       // v5c: where the friend is this winter
  sayChain(list);
  try { if (F.sfx && !(F.sfx.animal && s.sound && F.sfx.animal(s.sound))) (s.cat === 'fugl' && F.sfx.squeak ? F.sfx.squeak : F.sfx.pop)(); } catch (e) { /* sound only */ }   // v5: its own voice
}
const sayHints = s => sayChain(hintIds(s).map(id => [id]));
const sayToday = sp => { const s = spOf(sp); if (!s) return; sayChain([['al_today'], ['bf_name', { dyr: s.word }], [hintIds(s)[0]]]); };

/* ---------------------------------------------------------- habitat picture (small canvas) */
const HAB = {
  10: ['#bfe8ff', '#8fd67a', 'tree'], 11: ['#cfeaff', '#d9c8a8', 'house'], 12: ['#cfeaff', '#9bd36b', 'barn'], 13: ['#d9f1ff', '#a6e07a', 'flowers'],
  14: ['#d4efff', '#8fd06f', 'apples'], 15: ['#cdeeff', '#8fd06f', 'lake'], 16: ['#d9f1ff', '#b6dc7a', 'mill'], 17: ['#bfe8ff', '#f3d98c', 'beach'],
  18: ['#bfe8ff', '#4aa8e8', 'sea'], 19: ['#e3f3ff', '#ffffff', 'snow'], 20: ['#e9dcff', '#c7f0d0', 'rainbow'],
};
function paintHab(cv, n) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, [sky, ground, motif] = HAB[n] || HAB[10];
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  g.fillStyle = ground; g.beginPath(); g.moveTo(0, H * 0.62); g.quadraticCurveTo(W * 0.5, H * 0.48, W, H * 0.64); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  circ(W * 0.86, H * 0.2, H * 0.11, '#ffe066');
  if (motif === 'tree' || motif === 'apples') { for (const x of [0.22, 0.5, 0.75]) { g.fillStyle = '#9a6a3f'; g.fillRect(W * x - 3, H * 0.42, 6, H * 0.2); circ(W * x, H * 0.36, H * 0.16, '#5cc46b'); if (motif === 'apples') { circ(W * x - 6, H * 0.34, 3.5, '#ef4d5a'); circ(W * x + 7, H * 0.4, 3.5, '#ef4d5a'); } } }
  if (motif === 'house' || motif === 'barn') { for (const [x, c] of [[0.3, motif === 'barn' ? '#e45b5b' : '#ffd9a8'], [0.62, '#fff1d6']]) { g.fillStyle = c; g.fillRect(W * x - 14, H * 0.42, 28, 22); g.fillStyle = '#e8735a'; g.beginPath(); g.moveTo(W * x - 18, H * 0.43); g.lineTo(W * x, H * 0.26); g.lineTo(W * x + 18, H * 0.43); g.fill(); } }
  if (motif === 'flowers') { for (let i = 0; i < 14; i++) circ(W * (0.06 + i * 0.066), H * (0.7 + (i % 3) * 0.08), 3.6, ['#ff8fc0', '#ffd34d', '#c9b8ff', '#ffffff'][i % 4]); }
  if (motif === 'lake' || motif === 'sea' || motif === 'beach') {
    g.fillStyle = motif === 'beach' ? '#56b6f0' : '#7cc4f5';
    if (motif === 'lake') { g.beginPath(); g.ellipse(W * 0.5, H * 0.78, W * 0.3, H * 0.12, 0, 0, Math.PI * 2); g.fill(); }
    else { g.fillRect(0, H * (motif === 'sea' ? 0.5 : 0.56), W, H * (motif === 'sea' ? 0.5 : 0.18)); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(W * (0.2 + i * 0.2), H * 0.7, 6, Math.PI, 0); g.stroke(); }
  }
  if (motif === 'mill') { g.fillStyle = '#f2e2c4'; g.fillRect(W * 0.45, H * 0.3, 14, H * 0.32); g.strokeStyle = '#c9905a'; g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.45 + 7 - 20, H * 0.3 - 14); g.lineTo(W * 0.45 + 7 + 20, H * 0.3 + 14); g.moveTo(W * 0.45 + 7 + 20, H * 0.3 - 14); g.lineTo(W * 0.45 + 7 - 20, H * 0.3 + 14); g.stroke(); }
  if (motif === 'snow') { g.fillStyle = '#eaf6ff'; g.beginPath(); g.moveTo(0, H * 0.7); g.lineTo(W * 0.3, H * 0.3); g.lineTo(W * 0.55, H * 0.7); g.fill(); for (let i = 0; i < 12; i++) circ(W * Math.random(), H * Math.random() * 0.6, 1.8, '#ffffff'); }
  if (motif === 'rainbow') { ['#ef4d5a', '#ffb347', '#ffd34d', '#5cc46b', '#56b6f0', '#b79cff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(W * 0.5, H * 0.8, H * 0.55 - i * 4.5, Math.PI, 0); g.stroke(); }); }
}

/* ---------------------------------------------------------- building the book */
function el(tag, cls, html) { return UI.el(tag, cls, html); }
function tapEl(node, fn) { node.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); fn(e); }); return node; }
function buildTabs() {
  tabsEl.innerHTML = '';
  const A = save();
  const cover = tapEl(el('button', 'al-tab al-tab-cover' + (cur === 0 ? ' on' : ''), IC.book), () => show(0, true));
  cover.setAttribute('aria-label', 'Forside'); tabsEl.appendChild(cover);
  for (const p of pageList()) {
    const full = !!A.pages[p.n] || species().filter(s => s.page === p.n).every(s => A.friends[s.id]);
    const k = species().filter(s => s.page === p.n && A.friends[s.id]).length;
    const dots = '<span class="al-dots tab">' + Array.from({ length: 10 }, (_, i) => `<i${i < k ? ' class="on"' : ''}></i>`).join('') + '</span>';
    const t = tapEl(el('button', 'al-tab' + (cur === p.n ? ' on' : '') + (full ? ' full' : ''), `<span class="al-tab-n">${side(p.n)}</span>${dots}`), () => show(p.n, true));
    t.dataset.page = p.n; tabsEl.appendChild(t);
  }
}
function card(s, o) {
  o = o || {};
  const A = save(), found = !!A.friends[s.id], todaySp = o.today;
  const aw = awayOf(s.id);
  const c = el('div', 'al-card t' + s.tier + (found ? ' found' : ' unfound') + (s.id === todaySp ? ' today' : '') + (s.id === companion() ? ' comp' : '') + (aw ? ' away ' + aw : ''));
  c.dataset.sp = s.id;
  if (aw && found) c.appendChild(el('div', 'al-away', IC[aw]));                       // v5c: a found friend away for the winter
  // unfound: WP5's flat lilac side profile; the big «Dagens dyr» card (its name is spoken) a shaded lilac 3/4 view, so it reads at a glance
  const sil = found || o.shade ? '' : silOf(s.id), im = sil || tp(s.id);
  const pic = el('div', 'al-pic' + (sil ? ' sil' : !found && o.shade ? ' shade' : ''), im ? `<img src="${im}" alt="" draggable="false">` : '');
  c.appendChild(pic);
  if (s.tier >= 2 && found) c.appendChild(el('div', 'al-gems', B().gemsHTML(s.tier)));
  if (found) c.appendChild(el('div', 'al-name' + lenCls(s.word), UI.caseText(s.word)));
  else { const h = el('div', 'al-hints'); hintIcons(s).forEach(ic => h.appendChild(el('span', 'al-hint', ic))); c.appendChild(h); c.appendChild(el('div', 'al-q', '?')); }
  if (s.id === todaySp) c.appendChild(el('div', 'al-ribbon', IC.paw));
  const fr = A.friends[s.id];
  // v3 Vennestjerne: up to 3 friend stars on the card (gold frame at 3); Navnelappen: her own name tag (a little pencil / eye)
  if (fr && found) {
    // v5c WP-A2: ONE star row per card (friendship × knowledge) – three slots, so she sees what there is to win
    const st = Math.max(0, Math.min(3, +fr.stars || 0));
    // (v5c: a friend with a question ready for her today – its next star slot pulses: go and play with it)
    const asks = st < 3 && starReadyOf(s.id);
    c.appendChild(el('div', 'al-stars' + (st ? '' : ' none') + (asks ? ' asks' : ''), Array.from({ length: 3 }, (_, i) => `<span class="${i < st ? 'on' : i === st && asks ? 'off next' : 'off'}">${B().STAR}</span>`).join('')));
    if (st >= 3) c.classList.add('gold');
    if (fr.named) { c.classList.add('named'); c.dataset.named = fr.named; }
  }
  if (fr && !fr.seen && !o.noNew) { c.classList.add('new'); c.appendChild(el('div', 'al-newstar', B().STAR)); fr.seen = true; F.store(); }   // a brand-new sticker sparkles once
  if (s.id === companion()) c.appendChild(el('div', 'al-compbadge', IC.paw));
  tapEl(c, () => { c.classList.remove('tap'); void c.offsetWidth; c.classList.add('tap'); if (o.onTap) o.onTap(); else if (found) { sayFound(s); openBig(s); } else sayHints(s); });
  return c;
}
const lenCls = w => { const n = [...String(w)].length; return n >= 15 ? ' l4' : n >= 12 ? ' l3' : n >= 9 ? ' l2' : ''; };
function rodsCubes(n) {
  const w = el('div', 'al-rods');
  const tens = Math.floor(n / 10), ones = n % 10;
  for (let t = 0; t < tens; t++) { const r = el('div', 'al-rod'); for (let i = 0; i < 10; i++) r.appendChild(el('i')); w.appendChild(r); }
  if (ones) { const cubes = el('div', 'al-cubes'); for (let i = 0; i < ones; i++) cubes.appendChild(el('i')); w.appendChild(cubes); }
  if (!n) { const g = el('div', 'al-rod ghost'); for (let i = 0; i < 10; i++) g.appendChild(el('i')); w.appendChild(g); w.appendChild(el('div', 'al-zero', IC.paw)); }   // an empty rod waits for her first ten
  return w;
}
function buildCover() {
  const A = save(), n = friends().length, wrap = el('div', 'al-cover');
  const left = el('div', 'al-cover-l');
  left.appendChild(el('div', 'al-title', IC.book + '<span>Vennealbumet</span>'));
  const cnt = el('div', 'al-count');
  cnt.appendChild(rodsCubes(n));
  cnt.appendChild(el('div', 'al-count-n', String(n)));
  // tap: the rods light ten by ten, then the cubes one by one (quiet counting); a round number is also spoken
  let counting = false;
  tapEl(cnt, async () => {
    if (!n) { sayChain([['al_none']]); return; }
    if (n % 10 === 0 && n <= 110) sayChain([['al_ms', { n }]]);
    if (counting) return; counting = true;
    const parts = [...cnt.querySelectorAll('.al-rod'), ...cnt.querySelectorAll('.al-cubes i')];
    parts.forEach(p => p.classList.remove('hi'));
    for (let i = 0; i < parts.length && panel; i++) { parts[i].classList.add('hi'); F.sfx.pling(Math.min(11, i)); await F.T.sleep(parts[i].classList.contains('al-rod') ? 380 : 220); }
    await F.T.sleep(600); parts.forEach(p => p.classList.remove('hi')); counting = false;
  });
  left.appendChild(cnt);
  wrap.appendChild(left);
  const right = el('div', 'al-cover-r');
  const td = today();
  if (td && spOf(td)) {
    const box = el('div', 'al-today');
    box.appendChild(el('div', 'al-today-h', IC.speak + '<span>Dagens dyr</span>'));
    const c = card(spOf(td), { today: td, onTap: () => sayToday(td), noNew: true, shade: true }); c.classList.add('big');
    box.appendChild(c); right.appendChild(box);
  }
  // the friend who follows her (or an empty paw slot: tap → how to choose one)
  const cp = companion();
  const box = el('div', 'al-compbox');
  box.appendChild(el('div', 'al-today-h', IC.paw + '<span>Følger deg</span>'));
  if (cp && spOf(cp)) box.appendChild(card(spOf(cp), { noNew: true }));
  else box.appendChild(tapEl(el('div', 'al-card al-compslot', IC.paw), () => sayChain([[n ? 'al_pick' : 'al_none']])));
  right.appendChild(box);
  wrap.appendChild(right);
  return wrap;
}
function buildPage(n) {
  const A = save(), p = pageList().find(x => x.n === n) || { n, name: '' };
  const list = species().filter(s => s.page === n).sort((a, b) => a.tier - b.tier);
  const k = list.filter(s => A.friends[s.id]).length, full = list.length > 0 && k === list.length;
  const wrap = el('div', 'al-page' + (full ? ' full' : ''));
  const head = el('div', 'al-head');
  head.appendChild(tapEl(el('div', 'al-num', String(side(n))), () => sayChain([['al_side', { n: side(n) }]])));
  const nm = tapEl(el('button', 'al-pname', IC.speak + `<span>${p.name}</span>`), () => sayChain([['al_pagename', { p: p.name }]]));
  head.appendChild(nm);
  const cv = document.createElement('canvas'); cv.className = 'al-hab'; cv.width = 168; cv.height = 84;
  try { paintHab(cv, n); } catch (e) { /* decor only */ }
  head.appendChild(cv);
  const dots = el('div', 'al-dots'); for (let i = 0; i < 10; i++) dots.appendChild(el('i', i < k ? 'on' : '')); head.appendChild(dots);
  wrap.appendChild(head);
  const grid = el('div', 'al-grid');
  const td = today();
  list.slice(0, 10).forEach(s => grid.appendChild(card(s, { today: td })));
  wrap.appendChild(grid);
  return wrap;
}
function openBig(s) {
  closeBig();
  const cp = companion() === s.id;
  big = el('div', 'al-bigwrap');
  const bc = el('div', 'al-bigcard t' + s.tier);
  const im = B().thumb(s.id, 256);
  bc.appendChild(el('div', 'al-bigpic', im ? `<img src="${im}" alt="" draggable="false">` : ''));
  if (s.tier >= 2) bc.appendChild(el('div', 'al-gems', B().gemsHTML(s.tier)));
  const fr = save().friends[s.id], st = fr ? Math.max(0, Math.min(3, +fr.stars || 0)) : 0;
  // v5c WP-A2: the card's one star row – tap: how a star is won (a later day's play where she remembers what the friend taught her)
  const asks = st < 3 && starReadyOf(s.id);
  bc.appendChild(tapEl(el('div', 'al-bigstars' + (asks ? ' asks' : ''), Array.from({ length: 3 }, (_, i) => `<span class="${i < st ? 'on' : i === st && asks ? 'next' : ''}">${B().STAR}</span>`).join('')),
    () => sayChain([[st >= 3 && F.TPL.has('al_stjerne_gull') ? 'al_stjerne_gull' : 'al_stjerne']])));
  if (st >= 3) bc.classList.add('gold');
  bc.appendChild(tapEl(el('div', 'al-bigname' + lenCls(s.word), UI.caseText(s.word)), () => sayFound(s)));
  if (s.land && (cp || !awayOf(s.id))) {                        // v5c: a friend away for the winter cannot follow her
    const btn = tapEl(el('button', 'al-follow' + (cp ? ' home' : ''), (cp ? IC.home : IC.paw) + `<span>${cp ? 'Gå hjem' : 'Følg meg!'}</span>`), () => {
      const nowComp = companion() === s.id;
      const want = nowComp ? null : s.id;
      try { if (F.Fauna && F.Fauna.setCompanion) F.Fauna.setCompanion(want, { quiet: true }); } catch (e) { console.error('setCompanion', e); }   // logic #50: one line
      localComp = want;
      F.emit('albumCompanion', want);
      sayChain([[want ? 'al_follow' : 'al_home']]);
      if (want) { F.sfx.magic(); }
      const kept = cur; render(kept); openBig(s);
    });
    bc.appendChild(btn);
  }
  // v5 WP-A (DESIGN5 §2.4): the fact card – 2–3 facts with fact stars (gold after 3 recalls on different days) + its word / expression
  const fc = factCard(s);
  if (fc) {
    const A = save();
    if ((A.factIntro || 0) < 2 && F.T.now - factIntroT > 60) {       // the first two fact cards: how to hear them (once, not on a re-render)
      factIntroT = F.T.now;
      F.T.timeout(() => { if (big && F.TPL.has('al_fakta_ny')) F.SAYF('al_fakta_ny').then(ok => { if (ok) { A.factIntro = (A.factIntro || 0) + 1; F.store(); } }); }, 2600);
    } else if ((A.starIntro || 0) < 2 && st < 3 && F.T.now - factIntroT > 60) {   // v5c: then twice, how the card's stars are won
      factIntroT = F.T.now;
      F.T.timeout(() => { if (big && F.TPL.has('al_stjerne')) F.SAYF('al_stjerne').then(ok => { if (ok) { A.starIntro = (A.starIntro || 0) + 1; F.store(); } }); }, 2600);
    }
    const left = el('div', 'al-bigleft');
    while (bc.firstChild) left.appendChild(bc.firstChild);
    bc.appendChild(left); bc.appendChild(fc); bc.classList.add('facts');
  }
  big.appendChild(bc);
  tapEl(big, () => closeBig());
  tapEl(bc, () => {});
  root.appendChild(big);
  void big.offsetWidth; big.classList.add('on');   // lead: reflow, then the fade-in class (rAF could be throttled → card stayed invisible)
}
let factIntroT = -1e9;
/* v5c WP-A2: the fact card shows what the friend TAUGHT her: heard facts in full (ear = heard, eye = only seen – the win's munch –,
   tick = remembered on a later day, gold tick = remembered on 3 days), the rest as «?» rows – a tap teaches the next one (≤ 3 new facts and ≤ 2 new words a day; over the cap
   «I morgen kan du lære mer om vennen din!»). The word / expression row works the same. No stars here: the card has ONE star row. */
function factCard(s) {
  const V = F.VIT; if (!V || !V.factsFor) return null;
  let facts = [], words = [];
  try {
    if (V.cardFor) { const c = V.cardFor(s.id); facts = c.facts || []; words = c.words || (c.word ? [c.word] : []); }
    else { facts = V.factsFor(s.id); const wd = V.wordFor(s.id); if (wd) words = [Object.assign({}, wd, { heard: V.known(wd.key) })]; }
  } catch (e) { console.warn('album facts', e); return null; }
  if (!facts.length && !words.length) return null;
  const box = el('div', 'al-factcard');
  box.dataset.sp = s.id;
  box.appendChild(el('div', 'al-fhead', IC.book + '<span>' + UI.caseText('visste du?') + '</span>'));
  const mark = f => f.gold ? `<span class="al-fmark gold">${IC.tick}</span>` : f.recalled ? `<span class="al-fmark ok">${IC.tick}</span>`
    : f.seen ? `<span class="al-fmark heard seen">${IC.eye}</span>` : `<span class="al-fmark heard">${IC.ear}</span>`;
  const refresh = () => { if (!box.isConnected) return; const nb = factCard(s); if (nb) box.replaceWith(nb); };
  const tapRow = (row, fn) => tapEl(row, () => { chainTok++; F.Speech.clearQueue(); row.classList.remove('tap'); void row.offsetWidth; row.classList.add('tap'); fn(); });
  const learn = (kind, text) => {
    let p = null; try { p = V.teachOne ? V.teachOne(s.id, kind, text) : (kind === 'word' ? V.sayWord(s.id) : V.sayFact(s.id, text)).then(() => 'taught'); } catch (e) { console.warn(e); return; }
    setTimeout(refresh, 60);                   // the exposure is counted when the clip starts: the row opens at once
    Promise.resolve(p).then(r => { if (r === 'cap') sayChain([['al_fakta_morgen']]); else refresh(); }).catch(e => console.warn(e));
  };
  facts.forEach(f => {
    const known = (f.heard || 0) > 0;
    const row = el('div', 'al-fact' + (known ? '' : ' unknown') + (f.gold ? ' gold' : ''),
      known ? mark(f) + `<span class="al-ftext">${UI.caseText(f.text)}</span><span class="al-fspk">${IC.speak}</span>`
        : `<span class="al-fmark q">?</span><span class="al-ftext q">${IC.dots}</span><span class="al-fspk">${IC.speak}</span>`);
    row.dataset.state = !known ? 'new' : f.gold ? 'gold' : f.recalled ? 'remembered' : f.seen ? 'seen' : 'heard';
    tapRow(row, () => { if (known) { try { V.sayFact(s.id, f.text); } catch (e) { console.warn(e); } setTimeout(refresh, 60); } else learn('fact', f.text); });
    box.appendChild(row);
  });
  for (const wd of words.slice(0, 3)) {
    const known = (wd.heard || 0) > 0;
    const w = el('div', 'al-word ' + wd.kind + (known ? '' : ' unknown') + (wd.gold ? ' gold' : ''),
      known ? `<span class="al-wtext">${UI.caseText(wd.text)}</span>${wd.recalled ? `<span class="al-fmark ${wd.gold ? 'gold' : 'ok'}">${IC.tick}</span>` : ''}<span class="al-fspk">${IC.speak}</span>`
        : `<span class="al-fmark q">?</span><span class="al-wtext q">${IC.dots}</span><span class="al-fspk">${IC.speak}</span>`);
    w.dataset.state = !known ? 'new' : wd.gold ? 'gold' : wd.recalled ? 'remembered' : 'heard';
    tapRow(w, () => { if (known) { try { V.sayWord(s.id, wd); } catch (e) { console.warn(e); } setTimeout(refresh, 60); } else learn('word', wd.key); });
    box.appendChild(w);
  }
  return box;
}
function closeBig() { if (big) { const b = big; big = null; b.classList.remove('on'); setTimeout(() => b.remove(), 180); } }
function render(n) {
  cur = n;
  closeBig();
  buildTabs();
  body.innerHTML = '';
  body.appendChild(n ? buildPage(n) : buildCover());
}
function show(n, spoken) {
  if (!panel) return;
  if (n === cur && body.firstChild) { if (spoken && n) sayChain([['al_side', { n: side(n) }]]); return; }
  body.classList.remove('flip'); void body.offsetWidth; body.classList.add('flip');
  F.sfx.whoosh();
  render(n);
  if (spoken) { if (n) sayChain([['al_side', { n: side(n) }]]); else sayDagens(); }
}
// first cover view of the day: «Dagens dyr:» + the bare name + its habitat line (returns true when it spoke)
function sayDagens(pre) {
  const A = save(), td = today();
  if (A.todaySaid === day() || !td || !spOf(td)) return false;
  A.todaySaid = day(); F.store();
  sayChain([...(pre || []), ['al_today'], ['bf_name', { dyr: spOf(td).word }], [hintIds(spOf(td))[0]]]);
  return true;
}
// the page of the newest friend she has not seen in the album yet (opening the book goes straight to her new sticker)
function newestUnseenPage() {
  const A = save(); let best = null;
  for (const id in A.friends) { const f = A.friends[id], s = spOf(id); if (s && !f.seen && (!best || (f.day || 0) >= (best.f.day || 0))) best = { f, s }; }
  return best ? best.s.page : 0;
}

/* ---------------------------------------------------------- public API */
const Album = F.Album = {
  get page() { return cur; },
  isOpen: () => !!panel,
  has: sp => !!save().friends[sp],
  friends,
  count: () => friends().length,
  pageOf: sp => { const s = spOf(sp); return s ? s.page : null; },
  hintId,                                  // page n (10–20) → its spoken habitat hint template id (al_h_<n>)
  side,                                    // v5: page id (10–20) → the natural page number shown and spoken (1–11)
  today,
  companion,
  open(page) {
    if ((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy)) return null;   // never over a task or an encounter
    if (panel) { show(page >= 10 && page <= 20 ? page : 0, !!page); return panel; }
    root = el('div', 'al-book');
    tabsEl = el('div', 'al-tabs'); root.appendChild(tabsEl);
    body = el('div', 'al-body'); root.appendChild(body);
    panel = UI.open(root, { cls: 'al-wrap', onClose: () => { panel = null; chainTok++; document.body.classList.remove('album-open'); F.emit('albumClosed'); } });
    document.body.classList.add('album-open');   // lead: world speech bubbles / labels never draw over the open book (hud.css)
    F.sfx.whoosh();
    const n = page >= 10 && page <= 20 ? page : (page == null ? newestUnseenPage() : 0);
    render(n);
    F.emit('albumOpened', n);
    // speech: a new sticker → «Side 12.»; the first cover of the day → «Dagens dyr:» + name + habitat; else a short welcome per session
    if (n) sayChain([['al_side', { n: side(n) }]]);
    else if (sayDagens(saidOpen ? [] : [['al_open']])) { /* said */ }
    else if (!friends().length) sayChain([['al_none']]);
    else if (!saidOpen) sayChain([['al_open'], ['al_tap']]);
    saidOpen = true;
    return panel;
  },
  close() { if (panel) panel.close(); },
  show: n => show(n, true),
  _render: n => render(n),
};
F.on('friendMade', () => { if (panel) render(cur); });

/* ---------------------------------------------------------- fallback HUD button (until WP10's .hud-album exists; removes itself then)
   a book with a paw, left of the map button; it bumps when a friend arrives */
let fbBtn = null;
function hudButton() {
  const theirs = document.querySelector('.hud-album');
  if (theirs) { if (fbBtn) { fbBtn.remove(); fbBtn = null; } return; }
  if (fbBtn && fbBtn.isConnected) return;
  if (!document.querySelector('#hud') || F.flags.collect) return;
  fbBtn = el('button', 'hud-btn al-hudbtn', IC.book);
  fbBtn.dataset.album = '1'; fbBtn.setAttribute('aria-label', 'Vennealbumet');
  fbBtn.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); Album.open(); });
  fbBtn.addEventListener('pointerdown', e => e.stopPropagation());
  document.querySelector('#hud').appendChild(fbBtn);
}
let hudAcc = 0;
F.on('ready', () => { hudButton(); F.on('tick', dt => { hudAcc += dt || 0; if (hudAcc > 2) { hudAcc = 0; hudButton(); } }); });
F.on('friendMade', () => { const b = document.querySelector('.hud-album') || fbBtn; if (b) { b.classList.remove('al-new'); void b.offsetWidth; b.classList.add('al-new'); } });
F.on('albumOpened', () => { const b = document.querySelector('.hud-album') || fbBtn; if (b) b.classList.remove('al-new'); });

/* ---------------------------------------------------------- debug */
F.on('ready', () => {
  const dbg = F.dbg = F.dbg || {};
  dbg.album = function (page) {
    if (!panel) Album.open(page); else show(page || 0, true);
    const cards = [...document.querySelectorAll('.al-card')];
    return { page: cur, open: !!panel, cards: cards.length, found: cards.filter(c => c.classList.contains('found')).length,
      thumbs: cards.filter(c => c.querySelector('img')).length, tabs: document.querySelectorAll('.al-tab').length };
  };
  dbg.albumGive = function (ids) { const A = save(); (Array.isArray(ids) ? ids : [ids]).forEach(id => { if (spOf(id)) A.friends[id] = { day: day(), region: null, stars: 0, seen: true }; }); F.store(); if (panel) render(cur); return friends().length; };
});
})();
