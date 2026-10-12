/* Feslottet – Kart (SHELL; DESIGN §4.5, DESIGN2 WP10 §2.1, §3.6, §4.6, §9.2).
   Outdoors: a hand-drawn parchment map (canvas 1000×600) from F.Gen.mapData(visitedSet) → [{id,name,biome,x,z,kind,landmark?,realm?,state?}].
     Visited regions are coloured with a name plaque; unvisited ones sleep under cream clouds; the home castle glows in the middle and
     Fetårnet (her tower, «hjem») stands at its real spot with a star; the fairy marker shows where she is.
     Kingdoms (DESIGN2 §3.3) are CRESTS by state: appeared = a pale shield with its light beam («Dit må du fly selv!»), found = the full
     crest + name plaque + Slottspass star (tap = cloud ride there), friend = gold rim + heart + the RQ stars. Building sites she has
     seen show a crane. The map FRAME GROWS: its bounds take in every awake kingdom, and the border carries one little flag per kingdom.
     Weather icons (F.Weather.at(regionId), current phase) sit on visited regions, the phase badge in the top-left corner.
     Legend paw marks: F.save.fauna.legendSeen {sp:{x,z}} (gold when befriended).
     A far quest target (HUD: F.Quest.target().far) or a newly appeared kingdom pulses with a gold ring.
     Taps: found crest → F.Travel.toRealm; Fetårnet → F.Travel.toHome; castle → F.Travel.toCastle; visited place → F.Travel.to (all cloud
     rides, ≤ 4 s); unvisited place → «Dit har du ikke vært ennå.».
   Indoors: F.Bld.openMap() (WP1's indoor map: trail, never teleports); F.Castle.overview only as a fallback.
   clarity plan 12.10. §3.6.4 (owner «realm»):
     F.Map.canRide(target) -> bool   the rule the map rides by, for Puff's ride offer too: a FOUND kingdom (state found | friend), the
       home castle, Fetårnet, a place she has visited. target = a quest / goal target {space, x, z, realm?, bld?, home?}, {realm: id},
       a map hit ({crest} | {home} | {castle} | {region}). An unfound kingdom is never rideable («Fly mot lyset …»).
     F.Map.rideOf(target) -> {kind:'realm'|'home'|'castle'|'place', id?, x?, z?} | null    F.Map.rideTo(target) -> Promise<bool> (the same
       cloud rides as the map's taps)
     «You» on the map = her own fairy's face (F.Thumb of her avatar's look) in a white ring; F.Map.pulseMe() = two soft pulses around
       it (each map opening does it once; F.First's «Her er du!» calls it too).
     The gold home arrow is gone (R10): Puff's clouds show the way home. A kingdom she has FOUND since the last map look pulses once.
   F.Map.open({focus:realmId}?) / close() / toggle() / isOpen / flyHome() / flyTo(region) / regions() / crests() / hitAt(px,py) / _hits()
   Save: F.save.map = {seen:{realmId:1}, found:{realmId:1}} (crests she has already seen on the map, as awake / as found; new ones pulse). */
(function () {
'use strict';
const F = window.F;
const U = F.U;
const CELL = 288, W = 1000, Hh = 600;
const M = F.Map = { isOpen: false, overview: false, focus: null, target: null };
const sayF = (id, slots) => (F.TPL && F.TPL.has && F.TPL.has(id) ? F.SAYF(id, slots || {}) : Promise.resolve(false));
const realmOf = id => (F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null);
const mapSave = () => {
  const s = F.save.map = F.save.map || {}; s.seen = s.seen || {};
  // (clarity §3.6) older saves: kingdoms found before this map knew about found crests do not pulse again
  if (!s.found) { s.found = {}; try { const R = F.save.realm || {}, pend = R.crest || {}; for (const id in (R.found || {})) if (!pend[id]) s.found[id] = 1; } catch (e) { /* no realm save */ } }
  return s;
};
const towerPos = () => (F.Tower && F.Tower.C) || { x: 80, z: -92 };
const homeDoor = () => (F.Tower && F.Tower.outside) || F.spawnPoint || { x: 80, z: -85.8 };
M.towerPos = towerPos; M.homeDoor = homeDoor;

/* ------------------------------------------------------------ data */
function realmState(id) { try { return F.Realm && F.Realm.state ? F.Realm.state(id) : null; } catch (e) { return null; } }
M.regions = function () {
  const vis = new Set((F.save.visited || []).map(String));
  let list = [];
  try { list = (F.Gen && F.Gen.mapData ? F.Gen.mapData(vis) : []) || []; } catch (e) { console.error('[map] mapData', e); list = []; }
  if (!list.length && F.W.region) {
    // fallback: sample the region function on a grid around the castle and the fairy
    const seen = new Map(), P = F.Player.pos;
    const pts = [[0, 0], [P.x, P.z]];
    pts.forEach(([ox, oz]) => { for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) {
      try { const r = F.W.region(ox + i * CELL, oz + j * CELL); if (r && !seen.has(String(r.id))) seen.set(String(r.id), r); } catch (e) { /* not ready */ }
    } });
    list = [...seen.values()].map(r => ({ id: r.id, name: r.name, biome: r.biome, x: r.center ? r.center.x : r.x, z: r.center ? r.center.z : r.z, kind: r.kind, landmark: r.landmark, realm: r.realm || null }));
  }
  return list.filter(r => r && isFinite(r.x) && isFinite(r.z) && r.kind !== 'castle' && r.biome !== 'slott').map(r => {
    const o = Object.assign({}, r, { visited: r.visited != null ? !!r.visited : vis.has(String(r.id)) });
    if (o.realm) { o.state = realmState(o.realm) || o.state || 'site'; if (o.cx == null) { o.cx = o.x; o.cz = o.z; } }
    return o;
  });
};
// kingdoms by state (from F.Realm, so far-away ones beyond mapData's window are included too)
M.crests = function () {
  let L = [];
  try { L = F.Realm && F.Realm.list ? F.Realm.list() : []; } catch (e) { L = []; }
  return L.filter(k => k.state === 'appeared' || k.state === 'found' || k.state === 'friend').map(k => {
    const R = realmOf(k.id) || {};
    let stars = 0; try { stars = F.RQuest && F.RQuest.stars ? (+F.RQuest.stars(k.id) || 0) : 0; } catch (e) { stars = 0; }
    return { id: k.id, k: k.k, x: k.x, z: k.z, state: k.state, castle: R.castle || k.castle || k.id, stars: Math.min(3, stars), regionId: k.regionId };
  });
};

/* ------------------------------------------------------------ palette + little drawings */
const BIOME = [
  [/blomst|eng|meadow|flower/i, '#f9d3e3', 'flowers'],
  [/gård|gard|farm/i, '#f1e6a2', 'barn'],
  [/frukt|orchard/i, '#cbeaa9', 'orchard'],
  [/innsj|sjø|lake/i, '#acdff4', 'lake'],
  [/strand|beach|kyst|coast/i, '#f8e8bd', 'beach'],
  [/vind|mølle|mill|ås/i, '#d4ecb2', 'mill'],
  [/lavendel|lavender/i, '#ddcdf6', 'lavender'],
  [/snø|sno|snow/i, '#f3f7ff', 'snow'],
];
const biomeOf = b => BIOME.find(([re]) => re.test(String(b || ''))) || [null, '#d6ecbc', 'flowers'];
const LANDMARK = [[/fyr/i, 'lighthouse'], [/mølle|mill/i, 'mill'], [/pariser|hjul/i, 'wheel'], [/isslott|ice/i, 'icecastle'], [/krystall/i, 'crystal'],
  [/solsikk/i, 'sunflower'], [/regnbue|rainbow/i, 'rainbow'], [/ballong/i, 'balloon'], [/dyrepark|farm|petting/i, 'barn'], [/sandslott/i, 'sandcastle']];

function circle(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function poly(c, pts, fill, stroke, lw) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); } }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const INK = '#7a5a34';
const ICONS = {
  flowers(c, x, y, s) {
    [[-0.45, 0.15, '#ff7fb0'], [0.05, -0.2, '#ffd84a'], [0.45, 0.2, '#b79cff']].forEach(([dx, dy, col]) => {
      const fx = x + dx * s, fy = y + dy * s, r = s * 0.13;
      c.strokeStyle = '#5ea84f'; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + s * 0.42); c.stroke();
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; circle(c, fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.8, col); }
      circle(c, fx, fy, r * 0.6, '#fff6c0');
    });
  },
  barn(c, x, y, s) {
    poly(c, [[x - s * .42, y - s * .05], [x, y - s * .42], [x + s * .42, y - s * .05]], '#e0606a', INK, 1.6);
    c.fillStyle = '#ef7b74'; c.fillRect(x - s * .36, y - s * .05, s * .72, s * .45); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(x - s * .36, y - s * .05, s * .72, s * .45);
    c.fillStyle = '#fff'; c.fillRect(x - s * .12, y + s * .1, s * .24, s * .3);
    c.strokeStyle = '#e0606a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - s * .12, y + s * .1); c.lineTo(x + s * .12, y + s * .4); c.moveTo(x + s * .12, y + s * .1); c.lineTo(x - s * .12, y + s * .4); c.stroke();
  },
  orchard(c, x, y, s) {
    [[-0.28, 0], [0.3, 0.08]].forEach(([dx, dy]) => {
      const tx = x + dx * s, ty = y + dy * s;
      c.fillStyle = '#a8703f'; c.fillRect(tx - s * .05, ty, s * .1, s * .32);
      circle(c, tx, ty - s * .06, s * .24, '#6cc45c', INK, 1.4);
      [[-.1, -.12], [.08, -.02], [-.02, .08], [.12, -.16]].forEach(([a, b]) => circle(c, tx + a * s, ty + b * s, s * .045, '#ff5d6a'));
    });
  },
  lake(c, x, y, s) {
    c.beginPath(); c.ellipse(x, y + s * .05, s * .48, s * .28, 0, 0, Math.PI * 2); c.fillStyle = '#7fcdf0'; c.fill(); c.strokeStyle = '#5aa8cf'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - s * .25, y); c.quadraticCurveTo(x - s * .15, y - s * .07, x - s * .05, y); c.quadraticCurveTo(x + s * .05, y + s * .07, x + s * .15, y); c.stroke();
    circle(c, x + s * .2, y + s * .12, s * .07, '#ffd84a'); circle(c, x + s * .26, y + s * .07, s * .045, '#ffd84a'); poly(c, [[x + s * .3, y + s * .07], [x + s * .36, y + s * .08], [x + s * .3, y + s * .1]], '#ff9a3c');
  },
  beach(c, x, y, s) {
    c.strokeStyle = '#5aa8cf'; c.lineWidth = 2.2; c.beginPath(); for (let i = 0; i < 4; i++) { const xx = x - s * .45 + i * s * .25; c.moveTo(xx, y + s * .3); c.quadraticCurveTo(xx + s * .06, y + s * .22, xx + s * .12, y + s * .3); } c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + s * .25); c.lineTo(x, y - s * .2); c.stroke();
    c.beginPath(); c.arc(x, y - s * .18, s * .32, Math.PI, 0); c.closePath(); c.fillStyle = '#ff8a9c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.arc(x, y - s * .18, s * .32, Math.PI * 1.33, Math.PI * 1.66); c.lineTo(x, y - s * .18); c.closePath(); c.fillStyle = '#fff'; c.fill();
  },
  mill(c, x, y, s) {
    poly(c, [[x - s * .16, y + s * .4], [x - s * .1, y - s * .15], [x + s * .1, y - s * .15], [x + s * .16, y + s * .4]], '#fff3dc', INK, 1.6);
    poly(c, [[x - s * .14, y - s * .15], [x, y - s * .3], [x + s * .14, y - s * .15]], '#e0606a', INK, 1.4);
    c.strokeStyle = '#a8703f'; c.lineWidth = s * .07;
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; c.beginPath(); c.moveTo(x, y - s * .2); c.lineTo(x + Math.cos(a) * s * .42, y - s * .2 + Math.sin(a) * s * .42); c.stroke(); }
    circle(c, x, y - s * .2, s * .05, '#ffd84a');
  },
  lavender(c, x, y, s) {
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { const xx = x - s * .4 + k * s * .2, yy = y - s * .2 + r * s * .2; circle(c, xx, yy, s * .055, '#9b7fd6'); circle(c, xx, yy - s * .06, s * .04, '#b79cff'); }
  },
  snow(c, x, y, s) {
    c.beginPath(); c.moveTo(x - s * .5, y + s * .35); c.quadraticCurveTo(x, y - s * .25, x + s * .5, y + s * .35); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#a9c4e8'; c.lineWidth = 1.6; c.stroke();
    circle(c, x + s * .05, y + s * .02, s * .13, '#fff', '#a9c4e8', 1.4); circle(c, x + s * .05, y - s * .16, s * .09, '#fff', '#a9c4e8', 1.4);
    poly(c, [[x + s * .1, y - s * .17], [x + s * .2, y - s * .15], [x + s * .1, y - s * .13]], '#ff9a3c');
  },
  village(c, x, y, s) {
    [[-0.32, 0.08, '#ec7aa8'], [0.0, -0.12, '#6fa8ec'], [0.32, 0.1, '#7fd1b0']].forEach(([dx, dy, roof]) => {
      const hx = x + dx * s, hy = y + dy * s, w = s * .26;
      c.fillStyle = '#fff6e6'; c.fillRect(hx - w / 2, hy, w, w * .8); c.strokeStyle = INK; c.lineWidth = 1.4; c.strokeRect(hx - w / 2, hy, w, w * .8);
      poly(c, [[hx - w * .65, hy + 1], [hx, hy - w * .6], [hx + w * .65, hy + 1]], roof, INK, 1.4);
      c.fillStyle = '#a8703f'; c.fillRect(hx - w * .12, hy + w * .4, w * .24, w * .4);
    });
  },
  lighthouse(c, x, y, s) {
    poly(c, [[x - s * .16, y + s * .4], [x - s * .1, y - s * .25], [x + s * .1, y - s * .25], [x + s * .16, y + s * .4]], '#fff', INK, 1.6);
    c.fillStyle = '#e0606a'; c.fillRect(x - s * .13, y - s * .02, s * .26, s * .12); c.fillRect(x - s * .15, y + s * .22, s * .3, s * .1);
    c.fillStyle = '#ffe066'; c.fillRect(x - s * .1, y - s * .38, s * .2, s * .13); poly(c, [[x - s * .14, y - s * .38], [x, y - s * .5], [x + s * .14, y - s * .38]], '#e0606a', INK, 1.2);
  },
  wheel(c, x, y, s) {
    circle(c, x, y - s * .05, s * .38, null, '#9d8cf0', 3);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.strokeStyle = '#c6a8ff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - s * .05); c.lineTo(x + Math.cos(a) * s * .38, y - s * .05 + Math.sin(a) * s * .38); c.stroke(); circle(c, x + Math.cos(a) * s * .38, y - s * .05 + Math.sin(a) * s * .38, s * .06, ['#ff7fb0', '#ffd84a', '#7cc4f5', '#6fd6a8'][k % 4]); }
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - s * .22, y + s * .42); c.lineTo(x, y - s * .05); c.lineTo(x + s * .22, y + s * .42); c.stroke();
  },
  icecastle(c, x, y, s) {
    [[-0.25, .3, '#d8f2ff'], [0, .45, '#cfefff'], [0.25, .3, '#d8f2ff']].forEach(([dx, h, col]) => { c.fillStyle = col; c.fillRect(x + dx * s - s * .1, y + s * .35 - h * s, s * .2, h * s); c.strokeStyle = '#7fb6e0'; c.lineWidth = 1.4; c.strokeRect(x + dx * s - s * .1, y + s * .35 - h * s, s * .2, h * s); poly(c, [[x + dx * s - s * .13, y + s * .35 - h * s], [x + dx * s, y + s * .35 - h * s - s * .2], [x + dx * s + s * .13, y + s * .35 - h * s]], '#9fe8ff', '#7fb6e0', 1.2); });
  },
  crystal(c, x, y, s) {
    [[-0.22, .5, '#9fe8ff'], [0.02, .75, '#c6a8ff'], [0.25, .45, '#ff9ccf']].forEach(([dx, h, col]) => poly(c, [[x + dx * s - s * .1, y + s * .35], [x + dx * s - s * .08, y + s * .35 - h * s * .7], [x + dx * s, y + s * .35 - h * s], [x + dx * s + s * .08, y + s * .35 - h * s * .7], [x + dx * s + s * .1, y + s * .35]], col, '#6a7fd0', 1.4));
  },
  sunflower(c, x, y, s) {
    c.strokeStyle = '#5ea84f'; c.lineWidth = s * .07; c.beginPath(); c.moveTo(x, y - s * .1); c.lineTo(x, y + s * .45); c.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.beginPath(); c.ellipse(x + Math.cos(a) * s * .18, y - s * .12 + Math.sin(a) * s * .18, s * .1, s * .05, a, 0, Math.PI * 2); c.fillStyle = '#ffd84a'; c.fill(); }
    circle(c, x, y - s * .12, s * .13, '#a8703f');
  },
  rainbow(c, x, y, s) { ['#ff7a8a', '#ffb14a', '#ffe066', '#7fd67a', '#7cc4f5', '#b79cff'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * .065; c.beginPath(); c.arc(x, y + s * .3, s * (.48 - i * .065), Math.PI, 0); c.stroke(); }); },
  balloon(c, x, y, s) {
    c.beginPath(); c.ellipse(x, y - s * .15, s * .28, s * .32, 0, 0, Math.PI * 2); c.fillStyle = '#ff8dbd'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.ellipse(x, y - s * .15, s * .1, s * .32, 0, 0, Math.PI * 2); c.fillStyle = '#ffd84a'; c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - s * .15, y + s * .1); c.lineTo(x - s * .08, y + s * .28); c.moveTo(x + s * .15, y + s * .1); c.lineTo(x + s * .08, y + s * .28); c.stroke();
    c.fillStyle = '#a8703f'; c.fillRect(x - s * .1, y + s * .28, s * .2, s * .14);
  },
  sandcastle(c, x, y, s) {
    c.fillStyle = '#f0cf86'; c.fillRect(x - s * .32, y, s * .64, s * .32); c.fillRect(x - s * .12, y - s * .22, s * .24, s * .3);
    for (let k = 0; k < 4; k++) c.fillRect(x - s * .32 + k * s * .18, y - s * .07, s * .1, s * .08);
    c.strokeStyle = '#b88a3a'; c.lineWidth = 1.4; c.strokeRect(x - s * .32, y, s * .64, s * .32);
    c.strokeStyle = INK; c.beginPath(); c.moveTo(x, y - s * .22); c.lineTo(x, y - s * .42); c.stroke(); poly(c, [[x, y - s * .42], [x + s * .14, y - s * .36], [x, y - s * .3]], '#ff7fb0');
  },
};
function drawCloud(c, x, y, s, seed, alpha) {
  const r = U.rng(seed || 7);
  const blobs = [[-.38, .1, .3], [-.12, -.12, .38], [.22, -.06, .34], [.42, .14, .26], [.05, .18, .34]];
  // one union path, filled once: a see-through cloud (alpha < 1) stays even, so the region's biome colour shows through (review WP10 #5)
  c.save(); c.shadowColor = 'rgba(160,130,80,.28)'; c.shadowBlur = 10; c.shadowOffsetY = 3; c.globalAlpha = alpha == null ? 1 : alpha;
  c.beginPath(); blobs.forEach(([dx, dy, rr]) => { const cx = x + dx * s * (0.9 + r() * .2), cy = y + dy * s; c.moveTo(cx + rr * s, cy); c.arc(cx, cy, rr * s, 0, Math.PI * 2); });
  c.fillStyle = '#fffaf0'; c.fill();
  c.restore();
  c.save(); c.globalAlpha = alpha == null ? 1 : Math.min(1, alpha + 0.15);
  blobs.forEach(([dx, dy, rr]) => circle(c, x + dx * s, y + dy * s - rr * s * .25, rr * s * .55, 'rgba(255,255,255,.7)'));
  c.restore();
}
function drawCastle(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.ellipse(0, 38, 62, 12, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(120,90,40,.18)'; c.fill();
  // beacon
  const g = c.createLinearGradient(-4, 0, 4, 0); ['#ff7a8a', '#ffb14a', '#ffe066', '#7fd67a', '#7cc4f5', '#b79cff'].forEach((col, i) => g.addColorStop(i / 5, col));
  c.globalAlpha = .55; c.fillStyle = g; c.fillRect(-4, -96, 8, 58); c.globalAlpha = 1;
  const wall = '#fff3dc', st = '#b98a45';
  const tower = (tx, top, w, roof) => { c.fillStyle = wall; c.fillRect(tx - w / 2, top, w, 36 - top); c.strokeStyle = st; c.lineWidth = 2; c.strokeRect(tx - w / 2, top, w, 36 - top); poly(c, [[tx - w / 2 - 4, top], [tx, top - w * 1.25], [tx + w / 2 + 4, top]], roof, st, 2); };
  c.fillStyle = wall; c.fillRect(-44, 0, 88, 36); c.strokeStyle = st; c.lineWidth = 2; c.strokeRect(-44, 0, 88, 36);
  for (let k = 0; k < 8; k++) { c.fillStyle = wall; c.fillRect(-44 + k * 11.5, -6, 7, 7); c.strokeRect(-44 + k * 11.5, -6, 7, 7); }
  tower(-44, -18, 18, '#ec7aa8'); tower(44, -18, 18, '#9d8cf0'); tower(0, -34, 24, '#6fa8ec'); tower(-20, -8, 13, '#ec7aa8'); tower(20, -8, 13, '#9d8cf0');
  c.strokeStyle = st; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -64); c.lineTo(0, -78); c.stroke(); poly(c, [[0, -78], [14, -73], [0, -68]], '#ff7fb0');
  c.beginPath(); c.moveTo(-9, 36); c.lineTo(-9, 22); c.arc(0, 22, 9, Math.PI, 0); c.lineTo(9, 36); c.fillStyle = '#c99a5a'; c.fill();
  [[-28, 10], [28, 10], [-12, -16], [12, -16]].forEach(([wx, wy]) => { c.fillStyle = '#9fd3f4'; c.beginPath(); c.moveTo(wx - 3.5, wy + 8); c.lineTo(wx - 3.5, wy + 2); c.arc(wx, wy + 2, 3.5, Math.PI, 0); c.lineTo(wx + 3.5, wy + 8); c.fill(); });
  c.restore();
}
// «you»: her own fairy's face (a thumbnail of her avatar's look, cropped to the head) in a white ring; pulseMe() = two soft rings
let meImg = null, meKey = '', pulseMeT = -1e9, meCrop = null;
// where her face sits in F.Thumb's picture (normalised square {x, y, s}): the same model, bounding box and camera as vox.js F.Thumb.url,
// the head part's chin and width give a square face (crowns, buns and hats above it are left out). Fairies differ (wings and crowns
// change the framing): a fixed crop showed only the stjerne fairy's crown and hair (12.10. verifier)
const FACE_ANGLE = 0.25;
function faceCrop(lk) {
  try {
    const obj = F.VOX.make('ch_fairy', lk), hd = obj.userData.parts && obj.userData.parts.head; if (!hd) return null;
    const box = F.VOX.bbox(obj), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const hb = new THREE.Box3().setFromObject(hd); if (hb.isEmpty()) return null;
    const R = Math.max(Math.max(sz.x, sz.y * 1.1, sz.z) * 1.75, sz.length() * 0.5 * 3.3) + 0.02;
    const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 200);
    cam.position.set(c.x + Math.sin(FACE_ANGLE) * R, c.y + R * 0.45, c.z + Math.cos(FACE_ANGLE) * R); cam.lookAt(c); cam.updateMatrixWorld(true);
    const hw = (hb.max.x - hb.min.x) / 2, hx = (hb.max.x + hb.min.x) / 2, y0 = hb.min.y - 0.04, y1 = hb.min.y + 2 * hw + 0.04, zf = hb.max.z;
    let u0 = 1, v0 = 1, u1 = 0, v1 = 0; const p = new THREE.Vector3();
    for (const x of [hx - hw, hx + hw]) for (const y of [y0, y1]) for (const z of [zf, hb.min.z]) {
      p.set(x, y, z).project(cam); const u = (p.x + 1) / 2, v = (1 - p.y) / 2;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const s = Math.max(u1 - u0, v1 - v0) * 0.92;
    if (!(s > 0.05 && s < 1)) return null;
    return { x: (u0 + u1) / 2 - s / 2, y: (v0 + v1) / 2 - s / 2 + s * 0.04, s };
  } catch (e) { return null; }
}
function meFace() {
  let lk = null;
  try { const av = F.Player && F.Player.avatar; lk = av && av.userData && av.userData.look ? av.userData.look : (F.Fairy && F.Fairy.look ? F.Fairy.look(F.Fairy.cur ? F.Fairy.cur() : 'krystall') : null); } catch (e) { lk = null; }
  const key = JSON.stringify(lk || {});
  if (meKey === key) return meImg;
  meKey = key; meImg = null; meCrop = null;
  try {
    if (lk && F.Thumb && F.VOX && F.VOX.has && F.VOX.has('ch_fairy')) { const url = F.Thumb.url('ch_fairy', lk, { size: 192, angle: FACE_ANGLE }); if (url) { meImg = new Image(); meImg.src = url; meCrop = faceCrop(lk); } }
  } catch (e) { meImg = null; }
  return meImg;
}
M._meFace = meFace;
M._meCrop = () => (meCrop ? Object.assign({}, meCrop) : null);
M.pulseMe = function () { pulseMeT = F.T.now; return true; };
function drawFairyMarker(c, x, y, t) {
  const R = 24, pk = t - pulseMeT;
  for (const off of [0, 0.75]) { const k = (pk - off) / 1.0; if (k > 0 && k < 1) circle(c, x, y, R + 6 + k * 38, null, `rgba(255,127,176,${(0.85 * (1 - k)).toFixed(3)})`, 2 + 5 * (1 - k)); }
  c.save(); c.shadowColor = 'rgba(110,60,90,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 2; circle(c, x, y, R + 3, '#ff7fb0'); c.restore();
  c.save(); c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.closePath(); c.fillStyle = '#ffeef6'; c.fill(); c.clip();
  const im = meFace();
  if (im && im.complete && im.naturalWidth) {
    // her face square in the full-body thumbnail (faceCrop; a fixed guess without it), a little larger than the ring
    const w = im.naturalWidth, h = im.naturalHeight, q = meCrop;
    const sw = q ? w * q.s : w * 0.36, sx = q ? w * q.x : (w - sw) / 2, sy = q ? h * q.y : h * 0.3;
    c.drawImage(im, sx, sy, sw, sw, x - R * 1.12, y - R * 1.12, R * 2.24, R * 2.24);
  } else { c.fillStyle = '#ff7fb0'; c.fill(new Path2D(F.HUD.starPath(x, y, 12, 5))); }
  c.restore();
  circle(c, x, y, R, null, '#fff', 4);
}

/* ------------------------------------------------------------ kingdom crests, tower, weather, paws (DESIGN2 WP10) */
const hexOf = n => '#' + ('000000' + ((+n) >>> 0).toString(16)).slice(-6);
function flagCol(id) { const R = realmOf(id); const v = R && R.pal && F.PAL ? F.PAL[R.pal.flag] : null; return v != null ? hexOf(v) : '#ff7fb0'; }
const embCache = {};
function emblem(id) {
  if (!(id in embCache)) { let cv = null; try { cv = F.Realm && F.Realm.emblemIcon ? F.Realm.emblemIcon(id, 64) : null; } catch (e) { cv = null; } embCache[id] = cv; }
  return embCache[id];
}
function shieldPath(c, x, y, s) {
  c.beginPath(); c.moveTo(x - s, y - s * 0.9); c.lineTo(x + s, y - s * 0.9); c.lineTo(x + s, y + s * 0.1);
  c.quadraticCurveTo(x + s, y + s * 0.85, x, y + s * 1.18); c.quadraticCurveTo(x - s, y + s * 0.85, x - s, y + s * 0.1); c.closePath();
}
function heart(c, x, y, s, fill) {
  c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
}
const star = (c, x, y, R, r, fill, stroke) => { const p = new Path2D(F.HUD.starPath(x, y, R, r)); c.fillStyle = fill; c.fill(p); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.6; c.stroke(p); } };
function plaque(c, x, y, label, size) {
  c.font = `700 ${size}px Andika, sans-serif`;
  const tw = c.measureText(label).width + 20, th = size + 10;
  c.save(); c.shadowColor = 'rgba(110,80,30,.25)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
  rrect(c, x - tw / 2, y, tw, th, 9); c.fillStyle = '#fffdf6'; c.fill(); c.restore();
  c.strokeStyle = '#e3c890'; c.lineWidth = 1.5; rrect(c, x - tw / 2, y, tw, th, 9); c.stroke();
  c.fillStyle = '#3b2f5c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y + th / 2 + 1);
  return th;
}
let pulseUntil = {};
function drawCrest(c, cr, t) {
  const [x, y0] = toPx(cr.x, cr.z), s = 27, col = flagCol(cr.id), y = y0 - 6;
  const pulsing = (pulseUntil[cr.id] && pulseUntil[cr.id] > t) || M.focus === cr.id || (M.target && M.target.realm === cr.id);
  if (pulsing) {
    const k = (Math.sin(t * 5) + 1) / 2;
    circle(c, x, y + 4, s * (1.75 + k * 0.35), `rgba(255,216,74,${0.22 + k * 0.25})`);
    c.save(); c.setLineDash([6, 7]); c.lineDashOffset = -t * 30; circle(c, x, y + 4, s * 1.85, null, '#e0a91e', 3); c.restore();
  }
  if (cr.state === 'appeared') {
    // the light beam she can see in the world, then a pale shield: she has not found it yet
    const g = c.createLinearGradient(0, y - 90, 0, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col);
    c.save(); c.globalAlpha = 0.45 + Math.sin(t * 2 + cr.k) * 0.1; c.fillStyle = g; c.fillRect(x - 6, y - 90, 12, 90); c.restore();
    c.save(); c.globalAlpha = 0.85; shieldPath(c, x, y, s); c.fillStyle = '#fffaf0'; c.fill(); c.restore();
    c.save(); c.setLineDash([5, 5]); shieldPath(c, x, y, s); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); c.restore();
    const em = emblem(cr.id); if (em) { c.save(); c.globalAlpha = 0.4; c.drawImage(em, x - s * 0.7, y - s * 0.62, s * 1.4, s * 1.4); c.restore(); }
    for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * 2.1; star(c, x + Math.cos(a) * s * 1.25, y + Math.sin(a) * s * 0.9, 5, 2, '#ffe066'); }
    return;
  }
  const friend = cr.state === 'friend';
  c.save(); c.shadowColor = 'rgba(90,60,20,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
  shieldPath(c, x, y, s); c.fillStyle = col; c.fill(); c.restore();
  shieldPath(c, x, y, s); c.strokeStyle = friend ? '#f2b632' : '#fff'; c.lineWidth = friend ? 6 : 4; c.stroke();
  if (friend) { shieldPath(c, x, y, s + 4); c.strokeStyle = '#fff6c0'; c.lineWidth = 1.5; c.stroke(); }
  const em = emblem(cr.id); if (em) c.drawImage(em, x - s * 0.72, y - s * 0.66, s * 1.44, s * 1.44);
  // Slottspass: a gold star on the corner (she found it); friends get a heart on top
  star(c, x + s * 0.95, y - s * 0.85, 11, 4.6, '#ffd84a', '#c48a00');
  if (friend) heart(c, x, y - s * 1.15, 9, '#ff5d8f');
  const label = F.UI.caseText ? F.UI.caseText(cr.castle) : cr.castle;
  const th = plaque(c, x, y + s * 1.3, label, 17);
  if (friend || cr.stars) for (let i = 0; i < 3; i++) star(c, x + (i - 1) * 20, y + s * 1.3 + th + 11, 8.5, 3.6, i < cr.stars ? '#ffd84a' : '#f3e6c4', '#c9a25a');
}
function drawTower(c, x, y, t) {
  const glow = c.createRadialGradient(x, y - 14, 4, x, y - 14, 46); glow.addColorStop(0, 'rgba(230,210,255,.7)'); glow.addColorStop(1, 'rgba(230,210,255,0)');
  c.fillStyle = glow; c.fillRect(x - 48, y - 62, 96, 96);
  c.beginPath(); c.ellipse(x, y + 22, 22, 5, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(120,90,40,.18)'; c.fill();
  c.fillStyle = '#efe3ff'; c.fillRect(x - 13, y - 16, 26, 38); c.strokeStyle = '#9d7fd6'; c.lineWidth = 2; c.strokeRect(x - 13, y - 16, 26, 38);
  c.fillStyle = '#ffffff'; c.fillRect(x - 13, y - 2, 26, 6);
  poly(c, [[x - 17, y - 16], [x, y - 44], [x + 17, y - 16]], '#b79cff', '#8a6fd0', 2);
  c.beginPath(); c.moveTo(x - 6, y + 22); c.lineTo(x - 6, y + 12); c.arc(x, y + 12, 6, Math.PI, 0); c.lineTo(x + 6, y + 22); c.fillStyle = '#ff9ccf'; c.fill();
  circle(c, x - 6, y - 8, 3, '#ffe066'); circle(c, x + 6, y - 8, 3, '#ffe066');
  const k = 1 + Math.sin(t * 3) * 0.12; star(c, x, y - 50, 9 * k, 3.8 * k, '#ffe066', '#e0a91e');
}
function wxIcon(c, x, y, s, w) {
  c.save(); c.translate(x, y);
  circle(c, 0, 0, s * 0.62, 'rgba(255,253,246,.92)', '#e3c890', 1.5);
  if (w === 'sol') {
    c.strokeStyle = '#f0a81e'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3); c.lineTo(Math.cos(a) * s * 0.48, Math.sin(a) * s * 0.48); c.stroke(); }
    circle(c, 0, 0, s * 0.22, '#ffd84a', '#f0a81e', 1.5);
  } else if (w === 'vind') {
    c.strokeStyle = '#6fa8ec'; c.lineWidth = 2.6; c.lineCap = 'round';
    [[-0.22, 0.9], [0, 1.1], [0.22, 0.75]].forEach(([dy, L]) => { c.beginPath(); c.moveTo(-s * 0.4, dy * s); c.lineTo(s * (L * 0.4 - 0.1), dy * s); c.arc(s * (L * 0.4 - 0.1), dy * s - s * 0.1, s * 0.1, Math.PI / 2, -Math.PI, true); c.stroke(); });
  } else {
    ['#ff7a8a', '#ffd84a', '#7fd67a', '#7cc4f5'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * 0.07; c.beginPath(); c.arc(0, s * 0.18, s * (0.4 - i * 0.075), Math.PI, 0); c.stroke(); });
    [[-0.25, 0.28], [0.02, 0.36], [0.27, 0.27]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(dx * s, dy * s, s * 0.04, s * 0.07, 0, 0, Math.PI * 2); c.fillStyle = '#7cc4f5'; c.fill(); });
  }
  c.restore();
}
function phaseBadge(c, x, y, ph) {
  c.save(); c.shadowColor = 'rgba(110,80,30,.25)'; c.shadowBlur = 6; rrect(c, x, y, 74, 54, 12);
  const g = c.createLinearGradient(0, y, 0, y + 54);
  if (ph === 'morgen') { g.addColorStop(0, '#ffe3f0'); g.addColorStop(1, '#fff3d6'); } else if (ph === 'kveld') { g.addColorStop(0, '#ffcf9e'); g.addColorStop(1, '#f6a9c8'); } else { g.addColorStop(0, '#c9ecff'); g.addColorStop(1, '#eaf8ff'); }
  c.fillStyle = g; c.fill(); c.restore();
  c.strokeStyle = '#e3c890'; c.lineWidth = 2; rrect(c, x, y, 74, 54, 12); c.stroke();
  c.save(); rrect(c, x, y, 74, 54, 12); c.clip();
  const sy = ph === 'morgen' ? y + 40 : ph === 'kveld' ? y + 36 : y + 22, sx = ph === 'kveld' ? x + 50 : x + 37;
  circle(c, sx, sy, 12, ph === 'kveld' ? '#ff9a3c' : '#ffd84a', '#f0a81e', 2);
  if (ph === 'kveld') { circle(c, x + 20, y + 16, 7, '#fff6c0'); circle(c, x + 23, y + 14, 6, '#ffcf9e'); }
  if (ph !== 'dag') { c.fillStyle = '#c4e9a6'; c.fillRect(x, y + 42, 74, 12); }
  c.restore();
}
function paw(c, x, y, s, gold) {
  const col = gold ? '#ffd84a' : '#b79cff', st = gold ? '#c48a00' : '#7d5fd0';
  c.save(); if (gold) { c.shadowColor = 'rgba(255,220,90,.9)'; c.shadowBlur = 10; }
  c.beginPath(); c.ellipse(x, y + s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.strokeStyle = st; c.lineWidth = 1.5; c.stroke();
  [[-0.42, -0.2], [-0.15, -0.45], [0.15, -0.45], [0.42, -0.2]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * 0.15, s * 0.19, dx * 0.6, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke(); });
  c.restore();
}
function pawList() {
  const L = (F.save.fauna && F.save.fauna.legendSeen) || {}, out = [];
  for (const sp in L) { const p = L[sp]; if (p && isFinite(p.x) && isFinite(p.z)) out.push({ sp, x: +p.x, z: +p.z, friend: !!(F.Album && F.Album.has && (() => { try { return F.Album.has(sp); } catch (e) { return false; } })()) }); }
  return out;
}
const weatherOf = id => { try { return F.Weather && F.Weather.at ? F.Weather.at(id) : 'sol'; } catch (e) { return 'sol'; } };
const phaseNow = () => { try { return F.Weather && F.Weather.phase ? F.Weather.phase() : 'dag'; } catch (e) { return 'dag'; } };
ICONS.site = function (c, x, y, s) {
  c.strokeStyle = '#e0a91e'; c.lineWidth = s * 0.07; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s * 0.15, y + s * 0.4); c.lineTo(x - s * 0.15, y - s * 0.4); c.lineTo(x + s * 0.45, y - s * 0.4); c.stroke();
  c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(x + s * 0.35, y - s * 0.4); c.lineTo(x + s * 0.35, y - s * 0.05); c.stroke();
  c.fillStyle = '#ff9a3c'; c.fillRect(x + s * 0.27, y - s * 0.05, s * 0.16, s * 0.12);
  [[-0.42, 0.3, '#ff7fb0'], [-0.28, 0.3, '#7cc4f5'], [-0.35, 0.16, '#ffd84a']].forEach(([dx, dy, col]) => { c.fillStyle = col; c.fillRect(x + dx * s, y + dy * s, s * 0.13, s * 0.13); });
};

/* ------------------------------------------------------------ render */
let cv = null, ctx = null, stat = null, view = null, regs = [], crestList = [], paws = [], panel = null, offTick = null;
function computeView() {
  const P = F.Player.pos;
  let minX = -CELL * 2.3, maxX = CELL * 2.3, minZ = -CELL * 1.4, maxZ = CELL * 1.4;
  const inc = (x, z, m) => { m = m == null ? CELL * .6 : m; minX = Math.min(minX, x - m); maxX = Math.max(maxX, x + m); minZ = Math.min(minZ, z - m); maxZ = Math.max(maxZ, z + m); };
  regs.forEach(r => { if (r.visited) inc(r.realm ? r.cx : r.x, r.realm ? r.cz : r.z); });
  crestList.forEach(k => inc(k.x, k.z, CELL * .55));          // the frame grows with every kingdom that has appeared
  paws.forEach(p => inc(p.x, p.z, CELL * .3));
  if (F.Space.cur === 'out') inc(P.x, P.z);
  if (crestList.some(k => k.z - CELL * 0.55 <= minZ + 1)) minZ -= CELL * 0.3;   // room above the northern crests for their beams + the pennant garland
  let w = maxX - minX, h = maxZ - minZ;
  const aspect = W / Hh;
  if (w / h > aspect) { const nh = w / aspect; minZ -= (nh - h) / 2; h = nh; } else { const nw = h * aspect; minX -= (nw - w) / 2; w = nw; }
  const s = (W - 60) / w;
  return { minX, minZ, s, ox: 30, oy: 30 * (Hh / W) + (Hh - 30 * 2 * (Hh / W) - h * s) / 2 };
}
const toPx = (x, z) => [view.ox + (x - view.minX) * view.s, view.oy + (z - view.minZ) * view.s];
// Fetårnet on the map: its true direction from the castle, but never on top of the castle drawing (≥ 116 map px from its centre)
function towerPx() {
  const T0 = towerPos(), [cx, cy] = toPx(0, 0), [tx, ty] = toPx(T0.x, T0.z), d = Math.hypot(tx - cx, ty - cy), MIN = 116;
  if (d >= MIN || d < 1) return [tx, ty];
  return [cx + (tx - cx) / d * MIN, cy + (ty - cy) / d * MIN];
}
M._towerPx = () => (view ? towerPx() : null);
function drawStatic() {
  const c = stat.getContext('2d');
  c.setTransform(stat.width / W, 0, 0, stat.height / Hh, 0, 0);
  c.clearRect(0, 0, W, Hh);
  // torn parchment
  const rnd = U.rng(42);
  c.save();
  c.beginPath();
  const edge = [];
  for (let i = 0; i <= 40; i++) edge.push([8 + i * (W - 16) / 40, 8 + rnd() * 7]);
  for (let i = 0; i <= 24; i++) edge.push([W - 8 - rnd() * 7, 8 + i * (Hh - 16) / 24]);
  for (let i = 40; i >= 0; i--) edge.push([8 + i * (W - 16) / 40, Hh - 8 - rnd() * 7]);
  for (let i = 24; i >= 0; i--) edge.push([8 + rnd() * 7, 8 + i * (Hh - 16) / 24]);
  edge.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.shadowColor = 'rgba(110,80,30,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 4;
  const bg = c.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, '#fcf3dc'); bg.addColorStop(1, '#f4e3b9'); c.fillStyle = bg; c.fill();
  c.shadowColor = 'transparent'; c.clip();
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${150 + rnd() * 60 | 0},${110 + rnd() * 40 | 0},60,${0.04 + rnd() * 0.05})`; c.fillRect(rnd() * W, rnd() * Hh, 1 + rnd() * 3, 1 + rnd() * 3); }
  const vg = c.createRadialGradient(W / 2, Hh / 2, Hh * 0.35, W / 2, Hh / 2, W * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(170,120,50,.22)'); c.fillStyle = vg; c.fillRect(0, 0, W, Hh);
  // sea + beach along the south coast
  const [, yBeach] = toPx(0, 420), [, ySea] = toPx(0, 500);
  if (yBeach < Hh) {
    c.fillStyle = '#f6e3b0'; c.fillRect(0, yBeach, W, Hh - yBeach);
    if (ySea < Hh) {
      c.fillStyle = '#a6dcf3'; c.fillRect(0, ySea, W, Hh - ySea);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2;
      for (let yy = ySea + 14; yy < Hh; yy += 22) for (let xx = (yy * 7) % 60; xx < W; xx += 60) { c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + 8, yy - 6, xx + 16, yy); c.quadraticCurveTo(xx + 24, yy + 6, xx + 32, yy); c.stroke(); }
    }
  }
  // roads between neighbouring places (and to the castle)
  const pos = r => (r.realm ? [r.cx, r.cz] : [r.x, r.z]);
  const nodes = regs.map(pos).concat([[0, 0]]);
  c.strokeStyle = '#d9b98a'; c.lineWidth = 5; c.lineCap = 'round'; c.setLineDash([2, 10]);
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const [ax, az] = nodes[i], [bx, bz] = nodes[j], d = Math.hypot(ax - bx, az - bz);
    if (d > CELL * 1.45 || d < 1) continue;
    const [px1, py1] = toPx(ax, az), [px2, py2] = toPx(bx, bz), wob = (U.hash2(i, j, 3) - 0.5) * 40;
    c.beginPath(); c.moveTo(px1, py1); c.quadraticCurveTo((px1 + px2) / 2 + wob, (py1 + py2) / 2 - wob, px2, py2); c.stroke();
  }
  c.setLineDash([]);
  // the park square (+ the path up to Fetårnet)
  const [pa, pb] = toPx(-112, -112), [pc, pd] = toPx(112, 112);
  c.save(); c.shadowColor = 'rgba(80,120,40,.25)'; c.shadowBlur = 8;
  rrect(c, pa, pb, pc - pa, pd - pb, 18); c.fillStyle = '#c4e9a6'; c.fill(); c.restore();
  c.strokeStyle = '#a3d488'; c.lineWidth = 2; rrect(c, pa, pb, pc - pa, pd - pb, 18); c.stroke();
  c.strokeStyle = '#efe0c0'; c.lineWidth = 5; c.beginPath(); c.moveTo((pa + pc) / 2, pb + 6); c.lineTo((pa + pc) / 2, pd - 6); c.moveTo(pa + 6, (pb + pd) / 2); c.lineTo(pc - 6, (pb + pd) / 2); c.stroke();
  { const [tx, ty] = towerPx(), [ox, oy] = toPx(0, 0); c.save(); c.strokeStyle = '#d9b98a'; c.lineWidth = 5; c.lineCap = 'round'; c.setLineDash([2, 9]); c.beginPath(); c.moveTo(tx, ty + 18); c.quadraticCurveTo((tx + ox) / 2 + 14, (ty + oy) / 2 + 10, ox + 30, oy + 10); c.stroke(); c.restore(); }
  [[.22, .25], [.78, .3], [.2, .78], [.8, .76]].forEach(([fx, fy]) => circle(c, pa + (pc - pa) * fx, pb + (pd - pb) * fy, 5, '#7fcf6a'));
  circle(c, pa + (pc - pa) * .82, pb + (pd - pb) * .5, 7, '#9fd8f2');
  // places
  const icon = Math.max(30, Math.min(70, CELL * view.s * 0.36));
  M._icon = icon;
  regs.forEach((r, i) => {
    const kingdom = !!r.realm, awake = kingdom && r.state !== 'site';
    const [x, y] = kingdom ? toPx(r.cx, r.cz) : toPx(r.x, r.z); const [, col, kind] = biomeOf(r.biome);
    c.save(); c.shadowColor = 'rgba(120,90,40,.18)'; c.shadowBlur = 12;
    c.beginPath(); const rad = icon * 0.95;
    for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2, rr = rad * (0.9 + U.hash2(i, k, 9) * 0.2); const px = x + Math.cos(a) * rr * 1.25, py = y + Math.sin(a) * rr * 0.9; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = col; c.globalAlpha = (r.visited || awake) ? 0.95 : 0.8; c.fill(); c.restore();
    if (awake) return;                                 // the crest is drawn on top (dynamic layer)
    let draw = ICONS[kind];
    if (kingdom) draw = ICONS.site;
    else if (r.kind === 'village') draw = ICONS.village;
    else if (r.kind === 'landmark') { const lm = LANDMARK.find(([re]) => re.test(String(r.landmark || '') + ' ' + String(r.landmarkName || ''))); if (lm) draw = ICONS[lm[1]]; }
    if (r.visited) {
      draw(c, x, y - 4, icon);
      if (!kingdom) plaque(c, x, y + icon * .5, F.UI.caseText ? F.UI.caseText(r.name || '') : (r.name || ''), Math.round(Math.max(17, Math.min(23, icon * .38))));
    } else {
      // asleep under a cloud, but the place peeks out so she wants to go there
      c.save(); c.globalAlpha = 0.6; draw(c, x, y + icon * 0.12, icon * 0.75); c.restore();
      drawCloud(c, x + icon * 0.08, y - icon * 0.22, icon * 0.78, U.hashStr(String(r.id)), 0.62);
    }
  });
  // weather for the visited places in this part of the day (so she can plan: «regnbuevær» brings rare animals)
  const wsz = Math.max(26, Math.min(40, icon * 0.6));
  regs.forEach(r => {
    if (!r.visited) return;
    const [x, y] = r.realm ? toPx(r.cx, r.cz) : toPx(r.x, r.z);
    wxIcon(c, x + icon * 0.95, y - icon * 0.55, wsz, weatherOf(r.id));
  });
  // legend paw marks
  paws.forEach(p => { const [x, y] = toPx(p.x, p.z); paw(c, x, y, 20, p.friend); });
  // compass flower (decoration, no letters)
  const cx0 = W - 62, cy0 = Hh - 62;
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 - Math.PI / 2; poly(c, [[cx0, cy0], [cx0 + Math.cos(a - .35) * 14, cy0 + Math.sin(a - .35) * 14], [cx0 + Math.cos(a) * (k ? 30 : 38), cy0 + Math.sin(a) * (k ? 30 : 38)], [cx0 + Math.cos(a + .35) * 14, cy0 + Math.sin(a + .35) * 14]], k ? '#e9d3a8' : '#ff7fb0', '#b98a45', 1.4); }
  circle(c, cx0, cy0, 5, '#fff', '#b98a45', 1.4);
  phaseBadge(c, 26, Hh - 84, phaseNow());
  c.restore();
  // the growing frame: a garland with one pennant per kingdom (awake = its colour, still asleep = a faint outline)
  const all = (F.REALMS && F.REALMS.length) ? F.REALMS : [];
  if (all.length) {
    const x0 = W / 2 - (all.length - 1) * 21, yT = 14;
    c.strokeStyle = '#b98a45'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - 30, yT); c.quadraticCurveTo(W / 2, yT + 18, x0 + (all.length - 1) * 42 + 30, yT); c.stroke();
    all.forEach((R, i) => {
      const st = realmState(R.id), on = st === 'appeared' || st === 'found' || st === 'friend';
      const px = x0 + i * 42, sag = Math.sin(i / Math.max(1, all.length - 1) * Math.PI) * 9, py = yT + sag;
      poly(c, [[px - 12, py], [px + 12, py], [px, py + 26]], on ? flagCol(R.id) : 'rgba(255,250,235,.7)', on ? '#fff' : '#d9c39a', on ? 2.2 : 1.4);
      if (st === 'friend') heart(c, px, py + 9, 4.5, '#fff');
      else if (st === 'found') star(c, px, py + 9, 5.5, 2.3, '#fff6c0');
    });
  }
}
function drawFrame() {
  if (!ctx) return;
  const t = F.T.now;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(stat, 0, 0);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / Hh, 0, 0);
  const [x, y] = toPx(0, 0);
  const sc = Math.max(0.9, Math.min(1.5, 180 * view.s / 100)) * (1 + Math.sin(t * 3) * 0.04);
  const glow = ctx.createRadialGradient(x, y, 10, x, y, 95 * sc); glow.addColorStop(0, 'rgba(255,240,170,.75)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 100 * sc, y - 100 * sc, 200 * sc, 200 * sc);
  drawCastle(ctx, x, y - 6, sc);
  const [tx, ty] = towerPx();
  drawTower(ctx, tx, ty, t);
  // a far quest target outside the kingdoms (home area, a village): a pulsing gold ring at its outdoor spot (or Fetårnet)
  const tgPt = M.target && !M.target.realm ? (M.target.x != null ? toPx(M.target.x, M.target.z) : (M.target.home ? [tx, ty - 10] : null)) : null;
  if (tgPt) { const k = (Math.sin(t * 5) + 1) / 2; circle(ctx, tgPt[0], tgPt[1], 34 + k * 8, `rgba(255,216,74,${0.15 + k * 0.2})`, `rgba(224,169,30,${0.5 + k * 0.4})`, 4); star(ctx, tgPt[0], tgPt[1], 11, 4.6, '#ffd84a', '#c48a00'); }
  crestList.forEach(cr => drawCrest(ctx, cr, t));
  if (F.Space.cur === 'out') {
    const [fx, fy] = toPx(F.Player.pos.x, F.Player.pos.z);
    // a far quest target: a glitter dotted line from her to it
    const tgt = M.target && M.target.realm ? crestList.find(k => k.id === M.target.realm) : null;
    const gp = tgt ? toPx(tgt.x, tgt.z) : tgPt;
    if (gp) { const [gx, gy] = gp; ctx.save(); ctx.setLineDash([3, 11]); ctx.lineDashOffset = -t * 24; ctx.lineCap = 'round'; ctx.strokeStyle = '#e0608c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(gx, gy); ctx.stroke(); ctx.restore(); }
    // she stands on the castle, the tower or a crest: her marker steps beside it (tethered) so it never hides in the drawing
    let mx = fx, my = fy;
    const cr = crestList.find(k => { const [kx, ky] = toPx(k.x, k.z); return Math.hypot(fx - kx, fy - ky) < 40; });
    if (cr) { const [kx, ky] = toPx(cr.x, cr.z); mx = kx + 58; my = ky + 4; }
    else if (Math.hypot(fx - x, fy - y) <= 30 || Math.hypot(fx - tx, fy - ty) <= 24) { mx = fx + 46; my = fy + 30; }
    if (mx !== fx || my !== fy) { ctx.strokeStyle = '#ff7fb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(mx, my); ctx.stroke(); }
    drawFairyMarker(ctx, mx, my, t);
  }
}
// hits in map units (1000 × 600): crests, then Fetårnet, the castle, a place
function hitAt(px, py) {
  if (!view) return null;
  let best = null, bd = 48;
  crestList.forEach(k => { const [x, y] = toPx(k.x, k.z); const d = Math.hypot(px - x, py - (y - 2)); if (d < bd) { bd = d; best = k; } });
  if (best) return { crest: best };
  const [tx, ty] = towerPx();
  if (Math.hypot(px - tx, py - (ty - 12)) < 40) return { home: true };
  const [cx, cy] = toPx(0, 0);
  if (Math.hypot(px - cx, py - cy) < 64) return { castle: true };
  let rb = null; bd = 75;
  regs.forEach(rg => { if (rg.realm && rg.state !== 'site') return; const [x, y] = rg.realm ? toPx(rg.cx, rg.cz) : toPx(rg.x, rg.z); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; rb = rg; } });
  if (rb && rb.realm) return rb.visited ? { site: rb } : { region: rb };
  return rb ? { region: rb } : null;
}
M.hitAt = hitAt;
// screen positions of everything tappable (tests): [{kind, id, x, y}] in CSS pixels
M._hits = function () {
  if (!cv || !view) return [];
  const r = cv.getBoundingClientRect(), sx = r.width / W, sy = r.height / Hh, out = [];
  const add = (kind, id, x, y) => out.push({ kind, id, x: Math.round(r.left + x * sx), y: Math.round(r.top + y * sy) });
  crestList.forEach(k => { const [x, y] = toPx(k.x, k.z); add('crest', k.id, x, y - 2); });
  const [tx, ty] = towerPx(); add('home', 'tarn', tx, ty - 12);
  const [cx, cy] = toPx(0, 0); add('castle', 'slott', cx, cy);
  regs.forEach(rg => { if (rg.realm) return; const [x, y] = toPx(rg.x, rg.z); add(rg.visited ? 'place' : 'cloud', rg.id, x, y); });
  return out;
};
function act(h) {
  if (!h) return;
  const TV = F.Travel || {};
  if (h.crest) {
    const k = h.crest, R = realmOf(k.id);
    if (TV.canFast && TV.canFast(k.id)) { F.sfx.whoosh && F.sfx.whoosh(); TV.toRealm(k.id); return; }
    F.sfx.boing && F.sfx.boing(); pulseUntil[k.id] = F.T.now + 3;
    if (F.Speech.busy && F.Speech.busy()) return;
    (R && F.TPL.has('map_navn') ? F.SAY('map_navn', { slott: R.castle }) : Promise.resolve()).then(() => sayF('trav_selv'));
    return;
  }
  if (h.home) { M.flyHome(); return; }
  if (h.castle) { if (TV.toCastle) TV.toCastle(); return; }
  if (h.site) { F.sfx.boing && F.sfx.boing(); sayF('realm_bygger'); return; }
  if (h.region.visited) M.flyTo(h.region); else { F.sfx.boing(); F.SAYF('hud_map_cloud'); }
}
M.act = act;

/* ------------------------------------------------------------ open / close */
const bldMapOpen = () => !!(F.BldMap && F.BldMap.isOpen);
function build() {
  crestList = M.crests(); regs = M.regions(); paws = pawList();
  view = computeView();
  const k = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  if (!stat) { stat = document.createElement('canvas'); }
  stat.width = W * k; stat.height = Hh * k;
  drawStatic();
}
M.open = function (o) {
  o = o || {};
  if (F.Travel && F.Travel.busy) return;
  if (M.isOpen) { if (o.focus) { M.focus = o.focus; pulseUntil[o.focus] = F.T.now + 8; } return; }
  if (F.Space.cur === 'in') {
    let ok = false;
    if (F.Bld && F.Bld.cur && F.Bld.openMap) { try { ok = !!F.Bld.openMap(); } catch (e) { console.error(e); } }
    if (!ok && !bldMapOpen()) { try { if (F.Castle && F.Castle.overview) F.Castle.overview(true); } catch (e) { console.error(e); } }
    M.overview = bldMapOpen() || F.R.cam.mode === 'overview' || !!(F.Castle && F.Castle.ov);
    if (F.HUD.map) F.HUD.map.classList.toggle('on', M.overview);
    F.emit('mapOpen', 'in');
    return;
  }
  M.focus = o.focus || null;
  stat = null; build();
  const wrap = document.createElement('div'); wrap.className = 'map-wrap';
  const k = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  cv = document.createElement('canvas'); cv.width = W * k; cv.height = Hh * k; cv.className = 'map-cv';
  wrap.appendChild(cv);
  ctx = cv.getContext('2d');
  cv.addEventListener('click', e => {
    e.stopPropagation();
    const r = cv.getBoundingClientRect();
    act(hitAt((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * Hh / r.height));
  });
  panel = F.UI.open(wrap, { cls: 'map', onClose: () => { M.isOpen = false; M.focus = null; panel = null; document.body.classList.remove('map-open'); if (offTick) { offTick(); offTick = null; } if (F.HUD.map) F.HUD.map.classList.remove('on'); ctx = null; } });
  M.isOpen = true; document.body.classList.add('map-open');      // hud.css fades the purse chip the map frame would cover
  if (F.HUD.map) F.HUD.map.classList.add('on');
  // kingdoms she has not seen on the map yet (new ones) pulse for a while
  const ms = mapSave(); let fresh = false;
  crestList.forEach(c => { if (!ms.seen[c.id]) { pulseUntil[c.id] = F.T.now + 7; ms.seen[c.id] = 1; fresh = true; } });
  // a kingdom she has FOUND since the last look at the map (its crest flew into Kart): it pulses once, now in full colour
  crestList.forEach(c => { if ((c.state === 'found' || c.state === 'friend') && !ms.found[c.id]) { pulseUntil[c.id] = F.T.now + 7; ms.found[c.id] = 1; fresh = true; } });
  if (fresh) F.store();
  M.pulseMe();                                                    // «you are here»: two soft rings around her face
  if (F.HUD.mapGlow) F.HUD.mapGlow(false, 'new');
  if (M.focus) { pulseUntil[M.focus] = F.T.now + 8; const R = realmOf(M.focus); if (R && F.TPL.has('map_navn')) F.SAYF('map_navn', { slott: R.castle }); }
  drawFrame();
  offTick = F.on('preRender', drawFrame);
  F.emit('mapOpen', 'out');
};
M.close = function () {
  if (bldMapOpen()) { try { F.Bld.closeMap(); } catch (e) { console.error(e); } M.overview = false; if (F.HUD.map) F.HUD.map.classList.remove('on'); return; }
  if (M.overview || (F.Space.cur === 'in' && F.Castle && F.Castle.ov)) { M.overview = false; if (F.HUD.map) F.HUD.map.classList.remove('on'); try { F.Castle.overview(false); } catch (e) { console.error(e); } return; }
  if (panel) panel.close();
};
M._view = () => { if (!view) return null; const [x, y] = toPx(0, 0); return [x / W, (y - 6) / Hh]; };
M.toggle = () => ((M.isOpen || M.overview || bldMapOpen() || (F.Space.cur === 'in' && F.Castle && F.Castle.ov)) ? M.close() : M.open());
// keep the Kart button in sync with the indoor map's own state (its ✕, Esc and room taps close it too)
F.on('overview', on => { M.overview = !!on; if (F.HUD.map) F.HUD.map.classList.toggle('on', !!on); });
F.on('spaceChanged', () => { if (M.overview && F.Space.cur !== 'in') { M.overview = false; if (F.HUD.map) F.HUD.map.classList.remove('on'); } });
// a new kingdom: the map button sparkles until she opens the map (its crest pulses there)
F.on('realmAppeared', id => {
  if (F.HUD.mapGlow) F.HUD.mapGlow(true, 'new');
  if (M.isOpen) { pulseUntil[id] = F.T.now + 7; mapSave().seen[id] = 1; build(); }
});
F.on('realmFound', () => { if (M.isOpen) build(); });

/* ------------------------------------------------------------ travel (cloud rides, F.Travel) */
function freeSpot(x, z) { return F.Travel && F.Travel.freeSpot ? F.Travel.freeSpot(x, z) : { x, z }; }
M.freeSpot = freeSpot;
M.flyHome = async function () {
  if (panel) panel.close();
  if (F.Travel && F.Travel.toHome) return F.Travel.toHome();
  return false;
};
M.flyTo = async function (r) {
  if (panel) panel.close();
  if (r && r.realm && F.Travel && F.Travel.canFast && F.Travel.canFast(r.realm)) return F.Travel.toRealm(r.realm);
  const ok = F.Travel && F.Travel.to ? await F.Travel.to({ x: r.x, z: r.z + 6, kind: 'place', id: r.id }) : false;
  F.emit('flewTo', r.id);
  return ok;
};

/* ------------------------------------------------------------ clarity §3.6.4 / §3.0: which places Puff's cloud can carry her to
   The same rule as the map's taps: a FOUND kingdom (found | friend), the home castle, Fetårnet, a place (region) she has visited. */
const rideRealm = id => { try { return F.Travel && F.Travel.canFast ? !!F.Travel.canFast(id) : ['found', 'friend'].includes(realmState(id)); } catch (e) { return false; } };
const visitedSet = () => new Set((F.save.visited || []).map(String));
function rideOf(t) {
  if (!t || typeof t !== 'object') return null;
  if (t.crest) return rideRealm(t.crest.id) ? { kind: 'realm', id: t.crest.id } : null;
  if (t.region) { const r = t.region; if (r.realm) return rideRealm(r.realm) ? { kind: 'realm', id: r.realm } : null; return r.visited || visitedSet().has(String(r.id)) ? { kind: 'place', id: r.id, x: r.x, z: r.z + 6 } : null; }
  if (t.site) return null;
  if (t.realm) return rideRealm(t.realm) ? { kind: 'realm', id: t.realm } : null;
  if (t.castle || t.id === 'slott' || t.bld === 'slott') return { kind: 'castle' };
  if (t.tower || t.id === 'tarn' || t.bld === 'tarn' || (t.home === true && t.x == null && t.bld == null)) return { kind: 'home' };
  // a point (or a building): its outdoor spot, then the place there
  let o = null;
  try { o = F.Quest && F.Quest.outdoorOf && (t.space === 'in' || t.bld) ? F.Quest.outdoorOf(t) : null; } catch (e) { o = null; }
  if (!o && (t.space || 'out') === 'out' && t.x != null) o = { x: t.x, z: t.z };
  if (!o || !isFinite(o.x) || !isFinite(o.z)) return null;
  let rk = null; try { rk = F.Realm && F.Realm.at ? F.Realm.at(o.x, o.z) : null; } catch (e) { rk = null; }
  if (rk) return rideRealm(rk) ? { kind: 'realm', id: rk } : null;
  const hd = homeDoor(), tw = towerPos();
  if (Math.hypot(o.x - hd.x, o.z - hd.z) < 30 || Math.hypot(o.x - tw.x, o.z - tw.z) < 30) return { kind: 'home', x: o.x, z: o.z };
  let rv = null; try { rv = F.W && F.W.inReserved ? F.W.inReserved(o.x, o.z, 0) : null; } catch (e) { rv = null; }
  if (rv && !rv.realm) return { kind: 'castle', x: o.x, z: o.z };
  let rg = null; try { rg = F.W && F.W.region ? F.W.region(o.x, o.z) : null; } catch (e) { rg = null; }
  if (!rg) return null;
  if (rg.kind === 'castle') return { kind: 'castle', x: o.x, z: o.z };
  return visitedSet().has(String(rg.id)) ? { kind: 'place', id: rg.id, x: o.x, z: o.z } : null;
}
M.rideOf = rideOf;
M.canRide = t => { try { return !!rideOf(t); } catch (e) { return false; } };
// the ride itself (the same cloud rides as the map's taps); a place lands at a free spot a few metres short of the point
M.rideTo = async function (t) {
  const r = rideOf(t), TV = F.Travel; if (!r || !TV) return false;
  if (r.kind === 'realm') return TV.toRealm ? TV.toRealm(r.id) : false;
  if (r.kind === 'home' && r.x == null) return TV.toHome ? TV.toHome() : false;
  if (r.kind === 'castle' && r.x == null) return TV.toCastle ? TV.toCastle() : false;
  if (!TV.to) return false;
  const P = F.Player.pos, d = Math.hypot(r.x - P.x, r.z - P.z) || 1, back = Math.min(4, d);
  const f = freeSpot(r.x - (r.x - P.x) / d * back, r.z - (r.z - P.z) / d * back);
  const ok = await TV.to({ x: f.x, z: f.z, kind: 'place', id: r.id || r.kind });
  if (r.kind === 'place' && r.id != null) F.emit('flewTo', r.id);
  return ok;
};
M._arrow = () => null;                                        // (R10: the home arrow is gone; old tests ask)
})();
