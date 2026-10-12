/* Feslottet – park + forecourt interactables (WP CASTLE+PARK). DESIGN §7 #86–#123.
   Every type reacts with a visible change (part transforms, spawned props, persisted state) and a 1-in-10 surprise (castle kit).
   Models: MODELS-3 ids (p_*) when they exist, else the tmp_p_* voxel models defined here. Placement: park.js. */
(function () {
'use strict';
const F = window.F, U = F.U;
const K = F.Castle.kit;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const has = id => F.VOX.has(id);
function vdef(id, d) { if (!has(id)) F.VOX.def(id, d); }
const R = () => F.rand();
const say = (id, slots, voice) => K.say(id, slots, voice);
const SFX = (n, ...a) => K.sfx(n, ...a);
// model with named parts: real MODELS-3 id if present, else tmp
function M(th, id, opts) { const real = has(id) ? id : 'tmp_' + id; const o = K.model(real, Object.assign({}, opts || {}, th.data.opts || {})); return o; }
// v5 WP-W (DESIGN5 §3.1): d.home = the formats this park thing is the WORLD HOME of (F.OBJ.home: registered + her level + not in the
// play break). natural 11.10. (audit D3): her tap always PLAYS the thing; a due home shows the gold ★ invite note above it (F.OBJ.invite)
// and only a tap on that note opens the task – F.OBJ.home returns null on a tap, so homeTry is false and the thing plays.
// v5c WP-W2: the default payoff of a home task she solved herself – the thing glows and hearts rise (d.homeAfter overrides)
const homeHearts = th => { SFX('chime'); K.sparkle(K.wpos(th, 1.2), 0xfff2a8); K.burst(K.wpos(th, 1.2), { n: 16, colors: [0xff7fb0, 0xff5d8f, 0xffc8a8], speed: 1.1, up: 2.6, gravity: 1, life: 1.4, size: 0.11 }); return K.wobble(th.obj, 0.06, 600); };
const homeTry = async (th, d) => {
  if (!d.home || !(F.OBJ && F.OBJ.home)) return false;
  const h = F.OBJ.home(th, d.home, { place: d.homePlace, after: d.homeAfter || homeHearts }); if (!h) return false;
  let res = null; try { res = await h; } catch (e) { console.error('[park] home', th.type, e); }
  return !!res;
};
// v5c WP-W2 (DESIGN5 §10): d.hook(th) -> Promise | null = an interaction hook (once a day; F.OBJ.hook / ask / trueLine / factHook /
// vitAsk). It replaces this tap's reaction; a question hook that found no task (null) lets the thing play.
const hookTry = async (th, d) => {
  if (!d.hook || !F.OBJ || !F.OBJ.hook) return false;
  let h = null; try { h = d.hook(th); } catch (e) { console.error('[park] hook', th.type, e); }
  if (!h) return false;
  let r; try { r = await h; } catch (e) { console.error('[park] hook', th.type, e); }
  return r !== null;
};
// park animals: a due recall about THIS animal (F82, taught first), else one true sentence about it (F.VIT.sayFact)
const animalHook = (sp, snd, kinds) => th => F.OBJ.firstHook(
  () => F.OBJ.vitAsk && F.OBJ.vitAsk(th, sp, { kinds, after: t => { SFX(snd); K.burst(K.wpos(t, 1.2), { n: 18, colors: [0xff7fb0, 0xff5d8f, 0xffc8a8], speed: 1.2, up: 3, gravity: 1, life: 1.4, size: 0.11 }); return K.sleep(600); } }),
  () => F.OBJ.animalX && F.OBJ.animalX(th, sp, { vis: { '*': [t => { SFX(snd); K.sparkle(K.wpos(t, 1.0), 0xfff2a8); return K.wobble(t.obj, 0.04, 600); }] }, act: [t => { SFX(snd); K.sparkle(K.wpos(t, 1.0), 0xfff2a8); return K.wobble(t.obj, 0.05, 900); }] }));
// define a park thing; press(th) gets the squash + surprise wrapper
function T(type, d) {
  const press = d.press;
  F.Things.def(type, Object.assign({ radius: 0.8, solid: true, surprise: true }, d, {
    build: d.build || (th => M(th, d.model || type, d.opts)),
    press: press ? async th => { th.reactedVisibly = true; if (!d.noPop) K.squash(th.obj); try { if (await hookTry(th, d)) return; if (await homeTry(th, d)) return; await press(th); } catch (e) { console.error(type, e); } if (d.surprise !== false) K.maybeSurprise(th); } : undefined,
  }));
}
// v5 WP-W (DESIGN4 §8): number props follow her band (F.OBJ.numBand: 1–20 → 20–50 → 1–100); a number > 20 is the narrator's whole clip
const band = () => (F.OBJ && F.OBJ.numBand ? F.OBJ.numBand() : { lo: 1, hi: 20 });
const sayN = n => (n >= 1 && n <= 20 ? say('castle_n', { n }) : F.OBJ && F.OBJ.sayNum ? F.OBJ.sayNum(n) : Promise.resolve());
const tween = (ms, fn) => F.T.tween(ms, fn);
const part = (th, n) => (th.parts && th.parts[n]) || null;

/* ====================================================================== tmp models */
vdef('tmp_p_bod', {
  size: [40, 34, 22], scale: 1 / 10,
  build(v, o) {
    v.box(2, 0, 10, 37, 9, 19, 'woodLight'); v.box(2, 10, 9, 37, 10, 20, 'wood'); v.box(4, 2, 19, 35, 7, 19, 'butter');
    for (let x = 6; x < 34; x += 6) { v.box(x, 3, 20, x + 2, 6, 20, 'pink'); }
    v.box(2, 0, 2, 3, 26, 3, 'woodDark'); v.box(36, 0, 2, 37, 26, 3, 'woodDark'); v.box(2, 11, 18, 3, 26, 19, 'woodDark'); v.box(36, 11, 18, 37, 26, 19, 'woodDark');
    v.box(3, 0, 2, 36, 22, 2, 'cream2'); for (const y of [12, 17]) v.box(4, y, 3, 35, y, 6, 'wood');
    v.box(15, 27, 9, 24, 32, 9, 'white'); v.box(16, 28, 9, 23, 31, 9, 'lilac'); v.set(19, 30, 9, 'gold'); v.set(20, 30, 9, 'gold'); v.set(19, 29, 9, 'gold'); v.set(20, 29, 9, 'gold');
  },
  parts: { awning: { pivot: [20, 26, 20], build(v) { for (let z = 0; z < 22; z++) { const y = 26 - Math.floor(z / 4); v.box(1, y, z, 38, y, z, 'white'); for (let x = 1; x < 39; x++) if (((x >> 2) & 1)) v.set(x, y, z, 'pink'); } for (let x = 1; x < 39; x += 2) v.set(x, 20, 21, x % 4 === 1 ? 'pink' : 'white'); } } },
});
vdef('tmp_p_bronn', {
  size: [24, 34, 24], scale: 1 / 10,
  build(v) {
    v.cyl(12, 0, 12, 9, 7, 'stone'); v.cyl(12, 1, 12, 7, 7, 0); v.cyl(12, 0, 12, 7, 2, 'water');
    v.paint((x, y, z, c) => c === F.PAL.stone && F.U.hash2(x * 5 + z, y, 4) < 0.25 ? F.PAL.stone2 : null);
    v.box(3, 7, 11, 4, 24, 13, 'woodDark'); v.box(20, 7, 11, 21, 24, 13, 'woodDark');
    for (let k = 0; k < 7; k++) v.box(1 + k, 24 + k, 4, 23 - k, 24 + k, 20, k % 2 ? 'roofRed' : 'coral');
  },
  parts: {
    crank: { pivot: [12, 20, 12], build(v) { v.box(4, 20, 12, 19, 20, 12, 'wood'); v.box(19, 17, 12, 19, 20, 12, 'woodDark'); v.box(19, 17, 13, 19, 17, 15, 'woodDark'); } },
    bucket: { pivot: [12, 19, 12], build(v) { v.box(12, 14, 12, 12, 19, 12, 'woodLight'); v.box(10, 10, 10, 14, 13, 14, 'wood'); v.box(11, 11, 11, 13, 13, 13, 'water'); v.box(10, 13, 10, 14, 13, 10, 'steel'); } },
  },
});
vdef('tmp_p_flagg', {
  size: [16, 60, 4], scale: 1 / 10,
  build(v) { v.box(1, 0, 1, 3, 1, 3, 'stone2'); v.box(2, 2, 2, 2, 57, 2, 'white'); v.set(2, 58, 2, 'gold'); v.set(2, 59, 2, 'gold'); },
  parts: { flag: { pivot: [3, 10, 2], build(v, o) { const c = o.c || 'pink'; for (let x = 3; x < 15; x++) for (let y = 10; y < 18; y++) v.set(x, y, 2, ((x + y) % 4 === 0) ? 'white' : c); v.set(8, 14, 2, 'gold'); v.set(9, 14, 2, 'gold'); v.set(8, 13, 2, 'gold'); v.set(9, 13, 2, 'gold'); } } },
});
vdef('tmp_p_klokketarn', {
  size: [24, 70, 24], scale: 1 / 10,
  build(v) {
    v.box(4, 0, 4, 19, 44, 19, 'stone'); v.paint((x, y, z, c) => c === F.PAL.stone && (y % 6 === 0 || F.U.hash2(x + z * 3, y, 2) < 0.15) ? F.PAL.stone2 : null);
    v.cyl(11.5, 30, 20, 5, 1, 0); for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; v.set(Math.round(11.5 + Math.cos(an) * 4.5), Math.round(36 + Math.sin(an) * 4.5), 20, a % 3 === 0 ? 'navySoft' : 'gold'); }
    v.box(5, 31, 20, 18, 41, 20, 'white'); v.set(11, 36, 21, 'navySoft'); v.set(12, 36, 21, 'navySoft'); v.box(11, 36, 21, 11, 39, 21, 'navySoft'); v.box(12, 36, 21, 14, 36, 21, 'navySoft');
    v.box(3, 45, 3, 20, 46, 20, 'stone2'); v.box(4, 47, 4, 5, 54, 5, 'stone'); v.box(18, 47, 4, 19, 54, 5, 'stone'); v.box(4, 47, 18, 5, 54, 19, 'stone'); v.box(18, 47, 18, 19, 54, 19, 'stone');
    v.cone(11.5, 55, 11.5, 10, 13, 'roofBlue'); v.box(11, 68, 11, 12, 69, 12, 'gold');
  },
  parts: { bell: { pivot: [12, 54, 12], build(v) { v.cone(11.5, 48, 11.5, 4, 6, 'gold'); v.box(11, 47, 11, 12, 47, 12, 'honey'); v.box(11, 54, 11, 12, 54, 12, 'woodDark'); } } },
});
vdef('tmp_p_tavle', {
  size: [24, 28, 4], scale: 1 / 10,
  build(v) { v.box(1, 0, 1, 2, 22, 2, 'woodDark'); v.box(21, 0, 1, 22, 22, 2, 'woodDark'); v.box(0, 8, 1, 23, 24, 1, 'woodLight'); v.box(1, 9, 2, 22, 23, 2, 'cork' in F.PAL ? 'cork' : 'woodRed'); for (let k = 0; k < 6; k++) v.box(0 + k * 2, 25 + (k < 3 ? k : 5 - k), 1, 23 - k * 2, 25 + (k < 3 ? k : 5 - k), 2, 'roofMint'); },
  parts: {
    note1: { pivot: [6, 18, 3], build(v) { v.box(3, 15, 3, 9, 21, 3, 'white'); v.box(4, 19, 3, 8, 19, 3, 'sky'); v.box(4, 17, 3, 7, 17, 3, 'sky'); v.set(6, 21, 3, 'red'); } },
    note2: { pivot: [16, 17, 3], build(v) { v.box(13, 12, 3, 19, 19, 3, 'butter'); v.box(14, 17, 3, 18, 17, 3, 'coral'); v.box(14, 15, 3, 17, 15, 3, 'coral'); v.set(16, 19, 3, 'green'); } },
    note3: { pivot: [10, 12, 3], build(v) { v.box(8, 10, 3, 12, 14, 3, 'blossom'); v.set(10, 14, 3, 'blue'); } },
  },
});
vdef('tmp_p_butikk', {
  size: [40, 36, 26], scale: 1 / 10,
  build(v, o) {
    const A = o.a || 'pink', B = o.b || 'white';
    v.box(2, 0, 12, 37, 10, 22, 'woodLight'); v.box(2, 11, 11, 37, 11, 23, 'wood'); v.box(4, 2, 23, 35, 8, 23, B);
    for (let x = 5; x < 35; x += 5) v.box(x, 3, 23, x + 2, 7, 23, A);
    v.box(2, 0, 2, 3, 28, 3, 'woodDark'); v.box(36, 0, 2, 37, 28, 3, 'woodDark'); v.box(2, 12, 21, 3, 28, 22, 'woodDark'); v.box(36, 12, 21, 37, 28, 22, 'woodDark');
    v.box(3, 0, 2, 36, 26, 2, 'cream2'); for (const y of [13, 19]) v.box(4, y, 3, 35, y, 7, 'wood');
    for (let z = 0; z < 24; z++) { const y = 28 - Math.floor(z / 4); v.box(1, y, z, 38, y, z, B); for (let x = 1; x < 39; x++) if ((x >> 2) & 1) v.set(x, y, z, A); }
    for (let x = 1; x < 39; x += 2) { v.set(x, 22, 23, x % 4 === 1 ? A : B); v.set(x, 21, 23, x % 4 === 1 ? A : B); }
    v.box(12, 29, 10, 27, 34, 10, 'white'); v.box(13, 30, 10, 26, 33, 10, B === 'white' ? 'cream' : B);
  },
});
vdef('tmp_p_fontene', {
  size: [44, 26, 44], scale: 1 / 10,
  build(v) {
    v.cyl(22, 0, 22, 20, 4, 'stone'); v.cyl(22, 1, 22, 18, 4, 0); v.cyl(22, 0, 22, 18, 3, 'water'); v.cyl(22, 4, 22, 20, 1, 'stone2');
    v.cyl(22, 3, 22, 3, 10, 'stone'); v.cyl(22, 13, 22, 8, 2, 'stone2'); v.cyl(22, 14, 22, 6.5, 1, 'water'); v.cyl(22, 15, 22, 2, 3, 'stone');
    v.paint((x, y, z, c) => c === F.PAL.stone && F.U.hash2(x * 3 + z, y, 6) < 0.2 ? F.PAL.cream2 : null);
  },
  parts: { jet: { pivot: [22, 18, 22], build(v) { v.cyl(22, 18, 22, 1, 7, 'sky'); v.cyl(22, 25, 22, 2, 1, 'water'); for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; v.set(Math.round(22 + Math.cos(an) * 3), 24, Math.round(22 + Math.sin(an) * 3), 'sky'); } } } },
});
vdef('tmp_p_paviljong', {
  size: [60, 56, 60], scale: 1 / 10,
  build(v) {
    v.cyl(30, 0, 30, 28, 3, 'stone2'); v.cyl(30, 3, 30, 27, 1, 'woodLight');
    for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + 0.2; const x = Math.round(30 + Math.cos(an) * 25), z = Math.round(30 + Math.sin(an) * 25); v.box(x, 4, z, x + 1, 34, z + 1, 'white'); }
    for (let k = 0; k < 14; k++) v.cyl(30, 35 + k, 30, 29 - k * 2, 1, k % 2 ? 'roofMint' : 'white');
    v.box(30, 49, 30, 30, 53, 30, 'gold'); v.box(31, 51, 30, 33, 53, 30, 'pink');
    for (let a = 0; a < 24; a++) { const an = a / 24 * Math.PI * 2; v.set(Math.round(30 + Math.cos(an) * 28), 34, Math.round(30 + Math.sin(an) * 28), a % 2 ? 'pink' : 'butter'); }
  },
});
vdef('tmp_p_iskiosk', {
  size: [30, 44, 22], scale: 1 / 10,
  build(v) {
    v.box(2, 4, 4, 27, 16, 17, 'sky'); v.box(2, 16, 4, 27, 17, 17, 'white'); v.box(4, 6, 17, 25, 14, 17, 'white');
    for (let x = 5; x < 25; x += 4) v.box(x, 8, 18, x + 2, 12, 18, x % 8 === 5 ? 'pink' : 'butter');
    for (const [x, z] of [[5, 2], [24, 2]]) { v.cyl(x, 0, z + 9, 3, 1, 'grey'); v.box(x - 1, 0, z + 8, x + 1, 3, z + 10, 'navySoft'); }
    v.box(14, 17, 10, 15, 34, 11, 'white'); v.cone(14.5, 34, 10.5, 13, 6, 'pink'); v.paint((x, y, z, c) => (c === F.PAL.pink && y >= 34 && ((Math.atan2(z - 10.5, x - 14.5) * 4 / Math.PI + 8) | 0) % 2) ? F.PAL.white : null);
  },
});
vdef('tmp_p_ballongselger', {
  size: [24, 64, 16], scale: 1 / 16 * 1.6,
  build(v) {
    v.box(8, 0, 6, 10, 10, 9, 'jeansBlue'); v.box(13, 0, 6, 15, 10, 9, 'jeansBlue'); v.box(7, 11, 5, 16, 22, 10, 'coral'); v.box(9, 23, 6, 14, 29, 9, 'skin'); v.box(8, 29, 5, 15, 31, 10, 'hairBrown');
    v.set(10, 26, 10, 'black'); v.set(13, 26, 10, 'black'); v.box(7, 32, 5, 16, 33, 10, 'navySoft'); v.box(9, 34, 6, 14, 36, 9, 'navySoft');
    v.box(17, 12, 7, 17, 40, 7, 'white');
  },
  parts: { balloons: { pivot: [17, 40, 7], build(v) { const C = ['red', 'butter', 'sky', 'pink', 'mint']; [[17, 50, 7], [12, 47, 7], [21, 46, 8], [15, 56, 6], [20, 54, 9]].forEach(([x, y, z], i) => { v.ellipsoid(x, y, z, 3, 3.6, 3, C[i]); v.line(17, 40, 7, x, y - 3, z, 'white'); }); } } },
});
vdef('tmp_p_stein', { size: [20, 3, 20], scale: 1 / 10, build(v, o) { v.cyl(10, 0, 10, 9.5, 2, 'stone2'); v.cyl(10, 2, 10, 8.5, 1, o.c || 'pathStone'); v.paint((x, y, z, c) => (y === 2 && F.U.hash2(x * 3, z * 5, 8) < 0.2) ? F.PAL.cream2 : null); } });
vdef('tmp_p_hinke', {
  size: [40, 2, 56], scale: 1 / 10,
  build(v) {
    const sq = (x0, z0, c) => { v.box(x0, 0, z0, x0 + 11, 0, z0 + 7, 'white'); v.box(x0 + 1, 0, z0 + 1, x0 + 10, 0, z0 + 6, c); };
    const C = ['butter', 'mint', 'blossom', 'sky', 'lavender', 'peach'];
    const L = [[14, 48], [8, 40], [20, 40], [14, 32], [8, 24], [20, 24], [14, 16], [8, 8], [20, 8], [14, 0], [26, 0]];
    L.forEach(([x, z], i) => sq(x - 6 + 6, 48 - z, C[i % C.length]));
  },
});
vdef('tmp_p_tallhage', {
  size: [18, 6, 22], scale: 1 / 4,
  build(v, o) {
    const n = String(o.n || 10);
    v.box(0, 0, 0, 17, 0, 21, 'soil');
    for (let x = 0; x < 18; x++) { v.set(x, 1, 0, 'stone2'); v.set(x, 1, 21, 'stone2'); } for (let z = 0; z < 22; z++) { v.set(0, 1, z, 'stone2'); v.set(17, 1, z, 'stone2'); }
    // numeral in 3×5 pixels (each pixel 2×4 cells), two digits: a raised green cushion
    const G = F.VOX.FONT;
    [...n].forEach((ch, d) => {
      const g = G[ch]; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') {
        const x = 1 + d * 8 + q * 2, z = 1 + r * 4;
        v.box(x, 1, z, x + 1, 2, z + 3, 'leaf');
      }
    });
    v.paint((x, y, z, c) => (y === 2 && c === F.PAL.leaf && F.U.hash2(x * 3, z * 7, 4) < 0.3) ? F.PAL.leaf2 : null);
  },
});
vdef('tmp_p_bud', { size: [3, 4, 3], scale: 1 / 8, build(v, o) { v.box(1, 0, 1, 1, 1, 1, 'leaf'); v.box(0, 2, 0, 2, 2, 2, o.c || 'pink'); v.set(1, 3, 1, o.c || 'pink'); v.set(1, 2, 1, 'yellow'); } });
vdef('tmp_p_bloom', { size: [5, 3, 5], scale: 1 / 10, build(v, o) { const c = o.c || 'pink'; v.box(1, 0, 1, 3, 0, 3, 'leaf'); v.box(0, 1, 1, 4, 1, 3, c); v.box(1, 1, 0, 3, 1, 4, c); v.box(1, 2, 1, 3, 2, 3, c); v.set(2, 2, 2, 'yellow'); } });
vdef('tmp_p_drage', {
  size: [10, 4, 10], scale: 1 / 8,
  build(v) { v.box(3, 0, 3, 6, 3, 6, 'woodDark'); },
  parts: { kite: { pivot: [5, 3, 5], build(v) { for (let y = 0; y < 9; y++) { const w = 4 - Math.abs(y - 4); for (let x = -w; x <= w; x++) v.set(5 + x, 30 + y, 5, (x * y) % 3 === 0 ? 'red' : 'butter'); } v.line(5, 3, 5, 5, 30, 5, 'white'); for (let k = 0; k < 6; k++) v.set(5 + (k % 2), 29 - k * 2, 5, k % 2 ? 'sky' : 'pink'); } } },
});
vdef('tmp_p_statue', {
  size: [16, 40, 16], scale: 1 / 10,
  build(v) { v.box(1, 0, 1, 14, 9, 14, 'stone2'); v.box(2, 9, 2, 13, 10, 13, 'stone'); v.cone(8, 11, 8, 5, 12, 'stone'); v.sphere(8, 25, 8, 3.2, 'stone'); v.box(6, 28, 6, 10, 29, 10, 'stone2'); v.set(7, 30, 8, 'stone2'); v.set(9, 30, 8, 'stone2'); },
  parts: {
    arm: { pivot: [12, 20, 8], build(v) { v.box(12, 20, 7, 13, 21, 8, 'stone'); v.box(13, 21, 7, 13, 27, 8, 'stone'); v.box(12, 28, 7, 14, 30, 8, 'stone2'); } },
    bird: { pivot: [8, 30, 8], build(v) { v.box(7, 30, 7, 9, 32, 9, 'grey'); v.set(8, 33, 8, 'grey'); v.set(8, 33, 9, 'orange'); v.set(7, 31, 6, 'silver'); } },
  },
});
vdef('tmp_p_benk', { size: [24, 12, 10], scale: 1 / 10, build(v) { for (const x of [2, 20]) { v.box(x, 0, 2, x + 1, 4, 7, 'navySoft'); v.box(x, 5, 7, x + 1, 11, 8, 'navySoft'); } v.box(0, 5, 1, 23, 5, 7, 'woodLight'); v.box(0, 7, 8, 23, 7, 8, 'woodLight'); v.box(0, 10, 8, 23, 10, 8, 'woodLight'); } });
vdef('tmp_p_huske', {
  size: [36, 30, 16], scale: 1 / 10,
  build(v) { for (const x of [1, 33]) { v.line(x, 0, 1, x + 1, 28, 8, 'red'); v.line(x, 0, 15, x + 1, 28, 8, 'red'); } v.box(1, 28, 7, 34, 29, 9, 'butter'); },
  parts: {
    seat: { pivot: [12, 28, 8], build(v) { v.box(12, 6, 8, 12, 27, 8, 'grey'); v.box(17, 6, 8, 17, 27, 8, 'grey'); v.box(11, 5, 6, 18, 5, 10, 'sky'); } },
    seat2: { pivot: [24, 28, 8], build(v) { v.box(21, 6, 8, 21, 27, 8, 'grey'); v.box(26, 6, 8, 26, 27, 8, 'grey'); v.box(20, 5, 6, 27, 5, 10, 'pink'); } },
  },
});
vdef('tmp_p_sklie', {
  size: [14, 32, 40], scale: 1 / 10,
  build(v) {
    v.box(1, 0, 1, 2, 22, 2, 'red'); v.box(11, 0, 1, 12, 22, 2, 'red'); v.box(1, 0, 10, 2, 22, 11, 'red'); v.box(11, 0, 10, 12, 22, 11, 'red');
    v.box(1, 22, 1, 12, 22, 11, 'woodLight'); v.box(1, 23, 1, 1, 26, 11, 'red'); v.box(12, 23, 1, 12, 26, 11, 'red'); v.cone(6.5, 27, 6, 7, 4, 'butter');
    for (let z = 12; z < 40; z++) { const y = Math.max(1, Math.round(22 - (z - 12) * 0.78)); v.box(3, y, z, 10, y, z, 'sky'); v.set(2, y + 1, z, 'blue'); v.set(11, y + 1, z, 'blue'); }
    for (let k = 0; k < 7; k++) v.box(3, k * 3, 0, 10, k * 3, 0, 'butter');
  },
});
vdef('tmp_p_vippe', {
  size: [44, 12, 8], scale: 1 / 10,
  build(v) { v.box(19, 0, 2, 24, 4, 5, 'red'); },
  parts: { plank: { pivot: [22, 5, 4], build(v) { v.box(1, 5, 3, 42, 5, 4, 'woodLight'); for (const x of [4, 38]) { v.box(x, 6, 3, x, 9, 4, 'butter'); v.box(x - 1, 9, 2, x + 1, 9, 5, 'butter'); } v.box(1, 6, 3, 3, 7, 4, 'pink'); v.box(40, 6, 3, 42, 7, 4, 'sky'); } } },
});
vdef('tmp_p_sandkasse', { size: [36, 4, 36], scale: 1 / 10, build(v) { v.box(0, 0, 0, 35, 3, 35, 'woodLight'); v.box(2, 0, 2, 33, 2, 33, 'sand'); v.box(26, 3, 26, 29, 4, 28, 'red'); v.box(6, 3, 26, 8, 4, 30, 'sky'); } });
vdef('tmp_p_sandtarn', { size: [6, 8, 6], scale: 1 / 10, build(v) { v.box(0, 0, 0, 5, 4, 5, 'sand'); v.box(1, 5, 1, 4, 6, 4, 'sand'); for (const [x, z] of [[1, 1], [4, 1], [1, 4], [4, 4]]) v.set(x, 7, z, 'sand'); v.set(2, 1, 5, 'woodDark'); } });
vdef('tmp_p_trampoline', { size: [34, 8, 34], scale: 1 / 10, build(v) { v.cyl(17, 0, 17, 15, 5, 0); for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; v.box(Math.round(17 + Math.cos(an) * 14), 0, Math.round(17 + Math.sin(an) * 14), Math.round(17 + Math.cos(an) * 14), 4, Math.round(17 + Math.sin(an) * 14), 'navySoft'); } v.cyl(17, 5, 17, 16, 1, 'sky'); v.cyl(17, 5, 17, 13, 1, 'navySoft'); }, parts: { mat: { pivot: [17, 6, 17], build(v) { v.cyl(17, 6, 17, 12.5, 1, 'lilac'); } } } });
vdef('tmp_p_karusell', {
  size: [50, 44, 50], scale: 1 / 10,
  build(v) { v.cyl(25, 0, 25, 24, 3, 'white'); v.cyl(25, 3, 25, 23, 1, 'woodLight'); v.cyl(25, 4, 25, 3, 30, 'gold'); },
  parts: { top: { pivot: [25, 4, 25], build(v) {
    for (let k = 0; k < 10; k++) v.cyl(25, 32 + k, 25, 24 - k * 2.3, 1, k % 2 ? 'pink' : 'butter'); v.box(25, 42, 25, 25, 43, 25, 'gold');
    for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; const x = Math.round(25 + Math.cos(an) * 17), z = Math.round(25 + Math.sin(an) * 17); v.box(x, 4, z, x, 31, z, 'gold');
      const c = ['white', 'pink', 'sky', 'butter', 'mint', 'lilac'][a]; v.box(x - 3, 12, z - 1, x + 3, 16, z + 1, c); v.box(x + 3, 16, z - 1, x + 5, 20, z + 1, c); v.box(x - 2, 8, z, x - 2, 11, z, c); v.box(x + 2, 8, z, x + 2, 11, z, c); v.set(x + 5, 20, z, 'black'); }
  } } },
});
vdef('tmp_p_sjakk', {
  size: [36, 2, 36], scale: 1 / 8,
  build(v) { for (let z = 0; z < 36; z++) for (let x = 0; x < 36; x++) v.set(x, 0, z, ((x >> 2) + (z >> 2)) & 1 ? 'woodDark' : 'cream'); },
  parts: {
    p1: { pivot: [6, 1, 6], build(v) { v.cyl(6, 1, 6, 2.5, 2, 'white'); v.cyl(6, 3, 6, 1.5, 7, 'white'); v.sphere(6, 11, 6, 2, 'white'); v.set(6, 14, 6, 'gold'); } },
    p2: { pivot: [18, 1, 14], build(v) { v.cyl(18, 1, 14, 2.5, 2, 'navySoft'); v.cyl(18, 3, 14, 1.5, 9, 'navySoft'); v.box(16, 12, 12, 20, 13, 16, 'navySoft'); v.box(17, 14, 13, 19, 15, 15, 'gold'); } },
    p3: { pivot: [26, 1, 26], build(v) { v.cyl(26, 1, 26, 2.5, 2, 'white'); v.cyl(26, 3, 26, 1.5, 5, 'white'); v.box(24, 8, 25, 28, 11, 27, 'white'); v.set(28, 11, 26, 'black'); } },
    p4: { pivot: [10, 1, 26], build(v) { v.cyl(10, 1, 26, 2.5, 2, 'navySoft'); v.cyl(10, 3, 26, 1.2, 4, 'navySoft'); v.sphere(10, 8, 26, 1.8, 'navySoft'); } },
  },
});
vdef('tmp_p_boblemaskin', { size: [14, 14, 12], scale: 1 / 10, build(v) { v.box(1, 0, 1, 12, 8, 10, 'teal'); v.box(2, 9, 2, 11, 9, 9, 'mint'); v.cyl(6.5, 10, 5.5, 2, 3, 'sky'); v.box(4, 3, 11, 9, 6, 11, 'white'); v.set(6, 4, 11, 'pink'); v.set(7, 4, 11, 'pink'); }, parts: { fan: { pivot: [6.5, 4.5, 11], build(v) { v.box(6, 2, 11, 7, 7, 11, 'butter'); v.box(4, 4, 11, 9, 5, 11, 'butter'); } } } });
vdef('tmp_p_andedam', { size: [14, 20, 12], scale: 1 / 10, build(v) { v.box(6, 0, 5, 7, 10, 6, 'woodDark'); v.box(2, 10, 2, 11, 16, 9, 'butter'); v.box(4, 11, 9, 9, 14, 9, 'woodDark'); for (let k = 0; k < 5; k++) v.box(1 + k, 17 + k, 1, 12 - k, 17 + k, 10, 'roofRed'); } });
vdef('tmp_p_and', { size: [8, 8, 10], scale: 1 / 16 * 1.4, build(v, o) { const c = o.c || 'butter'; v.ellipsoid(4, 2.5, 5, 3, 2.2, 4, c); v.sphere(4, 5.5, 8, 2, c); v.box(3, 4, 9, 5, 5, 10, 'orange'); v.set(3, 6, 9, 'black'); v.set(5, 6, 9, 'black'); } });
vdef('tmp_p_robat', {
  size: [16, 10, 30], scale: 1 / 10,
  build(v) { for (let z = 0; z < 30; z++) { const w = Math.round(7 * Math.sin((z + 1) / 31 * Math.PI)); v.box(8 - w, 1, z, 7 + w, 4, z, 'woodRed'); if (w > 1) v.box(9 - w, 2, z, 6 + w, 4, z, 0); v.box(8 - Math.max(1, w - 1), 0, z, 7 + Math.max(1, w - 1), 0, z, 'woodDark'); } v.box(2, 3, 14, 13, 3, 16, 'woodLight'); v.box(4, 5, 4, 11, 5, 4, 'white'); },
  parts: { oars: { pivot: [8, 4, 15], build(v) { v.box(-0, 4, 15, 15, 4, 15, 'wood'); v.box(0, 3, 13, 1, 3, 17, 'wood'); v.box(14, 3, 13, 15, 3, 17, 'wood'); } } },
});
vdef('tmp_p_svane', { size: [10, 16, 18], scale: 1 / 16 * 1.8, build(v) { v.ellipsoid(5, 3, 7, 4, 3, 6.5, 'white'); v.box(4, 5, 12, 5, 12, 13, 'white'); v.box(4, 12, 13, 5, 13, 16, 'white'); v.box(4, 12, 17, 5, 12, 17, 'orange'); v.set(3, 13, 15, 'black'); v.set(6, 13, 15, 'black'); v.ellipsoid(5, 5, 4, 3, 2, 3, 'white'); } });
vdef('tmp_p_fuglebad', { size: [16, 14, 16], scale: 1 / 10, build(v) { v.cyl(8, 0, 8, 4, 2, 'stone2'); v.cyl(8, 2, 8, 2, 8, 'stone'); v.cyl(8, 10, 8, 7, 2, 'stone2'); v.cyl(8, 11, 8, 5.5, 1, 'water'); } });
vdef('tmp_p_fugl', { size: [6, 5, 7], scale: 1 / 16, build(v, o) { const c = o.c || 'sky'; v.ellipsoid(3, 2, 3, 2.2, 2, 3, c); v.set(3, 3, 6, 'orange'); v.set(2, 3, 5, 'black'); v.set(4, 3, 5, 'black'); v.box(1, 2, 2, 1, 3, 4, 'white'); v.box(5, 2, 2, 5, 3, 4, 'white'); } });
vdef('tmp_p_rosebed', {
  size: [24, 3, 16], scale: 1 / 10,
  build(v) { v.box(0, 0, 0, 23, 1, 15, 'woodLight'); v.box(1, 1, 1, 22, 1, 14, 'soil'); },
  parts: { roses: { pivot: [12, 2, 8], build(v, o) { const c = o.c || 'red'; for (let i = 0; i < 12; i++) { const x = 3 + (i % 6) * 3.5, z = 4 + Math.floor(i / 6) * 7; v.box(Math.round(x), 2, z, Math.round(x), 6, z, 'leafDark'); v.set(Math.round(x) - 1, 4, z, 'leaf'); v.box(Math.round(x) - 1, 7, z - 1, Math.round(x) + 1, 8, z + 1, c); v.set(Math.round(x), 9, z, c); } } } },
});
vdef('tmp_p_hekkdyr', {
  size: [16, 22, 16], scale: 1 / 10,
  build(v) { v.box(4, 0, 4, 11, 3, 11, 'woodRed'); v.box(5, 3, 5, 10, 3, 10, 'soil'); },
  parts: {
    blob: { pivot: [8, 4, 8], build(v) { v.ellipsoid(8, 11, 8, 6, 7, 6, 'leafDark'); } },
    rabbit: { pivot: [8, 4, 8], build(v) { v.ellipsoid(8, 9, 8, 5, 5, 5, 'leafDark'); v.sphere(8, 15, 10, 3, 'leafDark'); v.box(6, 17, 10, 7, 21, 10, 'leafDark'); v.box(9, 17, 10, 10, 21, 10, 'leafDark'); v.set(7, 15, 13, 'black'); v.set(9, 15, 13, 'black'); } },
    heart: { pivot: [8, 4, 8], build(v) { for (let y = 0; y < 14; y++) for (let x = -7; x <= 7; x++) { const X = x / 7, Y = (13 - y) / 13 * 1.3 - 0.2; if ((X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0) v.box(8 + x, 4 + y, 7, 8 + x, 4 + y, 9, 'leafDark'); } } },
    swan: { pivot: [8, 4, 8], build(v) { v.ellipsoid(8, 8, 7, 4, 4, 6, 'leafDark'); v.box(7, 10, 11, 9, 18, 12, 'leafDark'); v.box(7, 17, 12, 9, 18, 14, 'leafDark'); } },
  },
});
vdef('tmp_p_labyrint', { size: [12, 4, 12], scale: 1 / 10, build(v) { v.cyl(6, 0, 6, 5.5, 2, 'gold'); v.cyl(6, 2, 6, 4.5, 1, 'butter'); }, parts: { letter: { pivot: [6, 3, 6], build(v) { v.text('A', 5, 4, 6, 'gold'); v.text('A', 5, 4, 7, 'gold'); } } } });
vdef('tmp_p_drivhus', {
  size: [40, 32, 30], scale: 1 / 10,
  build(v) {
    v.box(0, 0, 0, 39, 1, 29, 'stone2'); v.box(0, 2, 0, 39, 18, 29, 'glass'); v.box(1, 2, 1, 38, 18, 28, 0);
    for (let k = 0; k < 12; k++) v.box(k, 19 + k, 0, 39 - k, 19 + k, 29, 'glass'); for (let k = 0; k < 12; k++) v.box(k + 1, 19 + k, 1, 38 - k, 19 + k, 28, 0);
    for (let x = 0; x < 40; x += 8) { v.box(x, 2, 0, x, 18, 0, 'white'); v.box(x, 2, 29, x, 18, 29, 'white'); } v.box(0, 18, 0, 39, 18, 0, 'white'); v.box(0, 18, 29, 39, 18, 29, 'white');
    v.box(16, 2, 29, 23, 14, 29, 0);
    for (let z = 4; z < 26; z += 10) v.box(3, 2, z, 36, 4, z + 3, 'woodRed');
  },
  parts: { plants: { pivot: [20, 5, 15], build(v) { for (let z = 4; z < 26; z += 10) for (let x = 5; x < 36; x += 6) { v.box(x, 5, z + 1, x, 12, z + 1, 'leafDark'); v.set(x - 1, 9, z + 1, 'leaf'); v.set(x + 1, 11, z + 1, 'leaf'); } } } },
});
vdef('tmp_p_tomat', { size: [3, 3, 3], scale: 1 / 10, build(v, o) { v.box(0, 0, 0, 2, 2, 2, o.c || 'red'); v.set(1, 2, 1, 'leaf'); } });
vdef('tmp_p_kjokkenhage', { size: [30, 3, 22], scale: 1 / 10, build(v) { v.box(0, 0, 0, 29, 1, 21, 'woodLight'); v.box(1, 1, 1, 28, 1, 20, 'soil'); for (let z = 3; z < 20; z += 5) for (let x = 3; x < 28; x += 3) { v.set(x, 2, z, 'leaf'); v.set(x, 2, z + 1, 'leaf2'); } } });
vdef('tmp_p_gulrot', { size: [3, 8, 3], scale: 1 / 12, build(v) { v.box(1, 0, 1, 1, 4, 1, 'orange'); v.box(0, 3, 0, 2, 4, 2, 'orange'); v.box(1, 5, 1, 1, 7, 1, 'leaf'); v.set(0, 6, 1, 'leaf2'); v.set(2, 7, 1, 'leaf2'); } });
vdef('tmp_p_stall', {
  size: [50, 34, 30], scale: 1 / 10,
  build(v) {
    v.box(0, 0, 0, 49, 0, 29, 'hay'); v.box(0, 1, 0, 49, 16, 1, 'woodRed'); v.box(0, 1, 0, 1, 16, 12, 'woodRed'); v.box(48, 1, 0, 49, 16, 12, 'woodRed');
    for (let x = 4; x < 48; x += 7) v.box(x, 1, 1, x, 16, 1, 'white');
    for (let k = 0; k < 10; k++) v.box(0, 17 + k, -0 + k, 49, 17 + k, 13 - k, k % 2 ? 'roofRed' : 'coral');
    for (let x = 0; x < 50; x += 4) v.box(x, 0, 29, x + 1, 6, 29, 'white'); v.box(0, 3, 29, 49, 3, 29, 'white'); v.box(0, 6, 29, 49, 6, 29, 'white');
    for (let z = 2; z < 29; z += 4) { v.box(0, 0, z, 0, 6, z, 'white'); v.box(49, 0, z, 49, 6, z, 'white'); }
    v.box(35, 1, 3, 44, 4, 7, 'hay');
  },
  parts: { pony: { pivot: [24, 1, 18], build(v) { const c = 'peach'; v.box(19, 7, 15, 29, 13, 21, c); for (const [x, z] of [[20, 16], [27, 16], [20, 20], [27, 20]]) v.box(x, 1, z, x + 1, 6, z, c); v.box(28, 12, 16, 31, 19, 20, c); v.box(30, 16, 16, 33, 19, 20, c); v.set(32, 18, 16, 'black'); v.set(32, 18, 20, 'black'); v.box(26, 13, 17, 28, 20, 19, 'pink'); v.box(17, 9, 17, 18, 13, 19, 'pink'); v.box(31, 19, 17, 31, 20, 17, 'peach'); v.box(31, 19, 19, 31, 20, 19, 'peach'); } } },
});
vdef('tmp_p_honsehus', {
  size: [30, 30, 24], scale: 1 / 10,
  build(v) { for (const [x, z] of [[2, 2], [26, 2], [2, 20], [26, 20]]) v.box(x, 0, z, x + 1, 8, z + 1, 'woodDark'); v.box(1, 8, 1, 28, 20, 22, 'butter'); v.box(11, 9, 22, 17, 15, 22, 'woodDark'); for (let k = 0; k < 8; k++) v.box(0 + k, 21 + k, 0, 29 - k, 21 + k, 23, k % 2 ? 'roofRed' : 'coral'); v.line(14, 0, 30, 14, 8, 22, 'woodLight'); },
  parts: { hen: { pivot: [8, 0, 26], build(v) { v.ellipsoid(8, 3, 26, 3, 2.5, 3.5, 'white'); v.sphere(8, 6, 28, 2, 'white'); v.box(8, 8, 28, 8, 9, 28, 'red'); v.set(8, 6, 30, 'orange'); v.set(7, 7, 29, 'black'); v.set(9, 7, 29, 'black'); } } },
});
vdef('tmp_p_egg', { size: [3, 4, 3], scale: 1 / 16, build(v) { v.ellipsoid(1, 1.6, 1, 1.4, 1.9, 1.4, 'cream'); } });
vdef('tmp_p_spreder', { size: [8, 8, 8], scale: 1 / 10, build(v) { v.box(3, 0, 3, 4, 4, 4, 'steel'); v.box(1, 5, 3, 6, 5, 4, 'teal'); v.box(3, 5, 1, 4, 5, 6, 'teal'); v.set(3, 6, 3, 'gold'); } });
vdef('tmp_p_lykt', { size: [8, 46, 8], scale: 1 / 16, build(v) { v.box(2, 0, 2, 5, 2, 5, 'navySoft'); v.box(3, 3, 3, 4, 36, 4, 'navySoft'); v.box(1, 37, 1, 6, 37, 6, 'gold'); v.box(1, 43, 1, 6, 43, 6, 'gold'); v.set(3, 44, 3, 'gold'); v.set(4, 45, 4, 'gold'); }, parts: { lamp: { pivot: [4, 38, 4], build(v, o) { v.box(2, 38, 2, 5, 42, 5, o.on ? 'lamp' : 'glass'); } } } });
vdef('tmp_p_tomt', { size: [24, 2, 24], scale: 1 / 8, build(v) { for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) { const e = x < 2 || z < 2 || x > 21 || z > 21; v.set(x, 0, z, e ? (((x + z) >> 1) & 1 ? 'gold' : 'white') : ((x + z) % 7 === 0 ? 'grass' : 'soil')); } for (const [x, z] of [[0, 0], [23, 0], [0, 23], [23, 23]]) v.box(x, 0, z, x, 1, z, 'pink'); } });
vdef('tmp_p_tre', {
  size: [26, 44, 26], scale: 1 / 8,
  build(v) { v.cyl(13, 0, 13, 1.6, 22, 'woodDark'); v.box(12, 0, 12, 14, 2, 14, 'wood'); },
  parts: { crown: { pivot: [13, 20, 13], build(v, o) { const k = o.kind || 'rund', L1 = k === 'kirsebær' ? 'blossom' : 'leaf', L2 = k === 'kirsebær' ? 'pink' : 'leaf2'; v.ellipsoid(13, 29, 13, 11, 10, 11, L1); v.ellipsoid(13, 37, 13, 7, 6, 7, L1); v.paint((x, y, z, c) => (c === F.PAL[L1] && F.U.hash2(x * 3 + z, y, 7) < 0.28) ? F.PAL[L2] : null); if (k === 'eple') v.paint((x, y, z, c) => (c === F.PAL.leaf && F.U.hash2(x + z * 5, y * 3, 3) < 0.06) ? F.PAL.red : null); } } },
});
vdef('tmp_p_blomster', { size: [24, 6, 24], scale: 1 / 12, build(v) { for (let i = 0; i < 20; i++) { const x = 2 + (i * 7) % 20, z = 2 + ((i * 11) % 20), h = 2 + (i % 3); v.box(x, 0, z, x, h, z, 'leaf'); const c = ['pink', 'yellow', 'lilac', 'white', 'red'][i % 5]; v.box(x - 1, h + 1, z, x + 1, h + 1, z, c); v.box(x, h + 1, z - 1, x, h + 1, z + 1, c); v.set(x, h + 2, z, 'yellow'); } } });
vdef('tmp_p_sommerfugl', { size: [7, 3, 5], scale: 1 / 16, build(v, o) { const c = o.c || 'pink'; v.box(3, 0, 1, 3, 1, 3, 'black'); v.box(0, 1, 0, 2, 2, 2, c); v.box(4, 1, 0, 6, 2, 2, c); v.box(1, 0, 3, 2, 1, 4, c); v.box(4, 0, 3, 5, 1, 4, c); } });
vdef('tmp_p_ballong', { size: [7, 16, 7], scale: 1 / 12, build(v, o) { v.ellipsoid(3, 11, 3, 3, 4, 3, o.c || 'red'); v.set(3, 6, 3, o.c || 'red'); v.line(3, 0, 3, 3, 6, 3, 'white'); } });
vdef('tmp_p_isk', { size: [5, 5, 5], scale: 1 / 16, build(v, o) { v.sphere(2, 2, 2, 2.2, o.c || 'pink'); } });
vdef('tmp_p_kjeks', { size: [5, 2, 5], scale: 1 / 16, build(v) { v.cyl(2, 0, 2, 2.2, 1, 'honey'); v.set(1, 1, 2, 'woodDark'); v.set(3, 1, 1, 'woodDark'); } });
vdef('tmp_p_bobble', { size: [5, 5, 5], scale: 1 / 10, build(v) { v.sphere(2, 2, 2, 2.2, 'glass'); v.set(1, 3, 1, 'white'); } });
vdef('tmp_p_mus', { size: [8, 6, 10], scale: 1 / 16, build(v) { v.ellipsoid(4, 2, 4, 3, 2, 3.5, 'grey'); v.sphere(4, 3, 8, 1.6, 'grey'); v.set(3, 5, 8, 'pink'); v.set(5, 5, 8, 'pink'); v.set(4, 3, 9, 'pink'); v.box(4, 1, 0, 4, 1, 0, 'pink'); } });
vdef('tmp_p_note', { size: [5, 8, 2], scale: 1 / 12, build(v, o) { const c = o.c || 'navySoft'; v.box(3, 2, 0, 3, 7, 0, c); v.box(1, 0, 0, 3, 2, 0, c); v.box(3, 7, 0, 4, 6, 0, c); } });
vdef('tmp_p_musikant', { size: [10, 14, 8], scale: 1 / 16 * 1.6, build(v, o) { const c = o.c || 'peach'; v.ellipsoid(5, 4, 4, 3.5, 4, 3, c); v.sphere(5, 10, 4, 3, c); v.box(2, 12, 3, 3, 14, 4, c); v.box(7, 12, 3, 8, 14, 4, c); v.set(4, 10, 7, 'black'); v.set(6, 10, 7, 'black'); v.set(5, 9, 7, 'pink'); v.box(3, 4, 7, 7, 6, 7, o.i || 'gold'); } });

/* ====================================================================== helpers */
const scn = th => F.Space.scene(th.space || 'out');
// v3 WP3 §8.6: world words are «try first, then hear it» (WP5 F.UI.tryRead); without it the label stays silent (never read aloud first)
function wordTpl(w) {
  w = String(w || '').toLowerCase();
  if (F.TPL.has('word_' + w)) return { tpl: 'word_' + w, slots: {} };
  if (F.TPL.has('rw_word') && F.SETS.get && F.SETS.get('WORDS').includes(w)) return { tpl: 'rw_word', slots: { w } };
  return { tpl: null, slots: {} };
}
function tryWord(lab, w, o) {
  if (!lab || !F.UI.tryRead) return null;
  const t = (o && o.tpl) ? o : wordTpl(w);
  try { return F.UI.tryRead(lab, w, Object.assign({ maxDist: 10 }, o || {}, { tpl: t.tpl, slots: t.slots })); } catch (e) { console.error('[park] tryRead', e); return null; }
}
function tempWorld(th, obj, pos, ttl) { obj.position.copy(pos); scn(th).add(obj); F.T.timeout(() => { const s0 = obj.scale.x; tween(300, k => obj.scale.setScalar(Math.max(0.001, s0 * (1 - k)))).then(() => obj.parent && obj.parent.remove(obj)); }, ttl || 3000); return obj; }
function birds(th, n, o) {
  o = o || {}; const out = [];
  for (let i = 0; i < n; i++) {
    const b = K.model('tmp_p_fugl', { c: U.pick(R, ['sky', 'butter', 'coral', 'lilac', 'mint']) });
    const a = R() * Math.PI * 2, r = o.r || 1.2;
    const end = V3(Math.cos(a) * r * 0.6, (o.y || 0.5), Math.sin(a) * r * 0.6), start = V3(Math.cos(a) * 6, 5, Math.sin(a) * 6);
    K.temp(th, b, start.x, start.y, start.z, o.ttl || 3800);
    const d = i * 220; F.T.timeout(() => { SFX('chirp'); tween(700, k => { b.position.set(U.lerp(start.x, end.x, k), U.lerp(start.y, end.y, k) + Math.sin(k * Math.PI) * 0.8, U.lerp(start.z, end.z, k)); b.rotation.y = -a + Math.PI / 2; }); }, d);
    out.push(b);
  }
  return out;
}
const counter = (th, key, max) => { const n = ((th.state[key] || 0) % max) + 1; F.Things.setState(th, { [key]: n }); return n; };

/* ====================================================================== forecourt */
T('p_bod', {
  name: 'boden', radius: 2.0, reach: 3.4,
  init(th) { th.labelY = 3.6; if (F.Stall && F.Stall.attach) try { F.Stall.attach(th); } catch (e) { console.error(e); } },
  async press(th) {
    const aw = part(th, 'awning');
    if (aw) K.swing(aw, 0.12, 1200, 'x', 3);
    K.sparkle(K.wpos(th, 2.4), 0xffd84a); SFX('chime');
    if (F.Stall && F.Stall.open) { try { await F.Stall.open(); } catch (e) { console.error(e); } }
    else say('park_bod');
    F.Things.setState(th, { visits: (th.state.visits || 0) + 1 });
  },
});
T('p_bronn', {
  name: 'brønnen', radius: 1.3,
  async press(th) {
    const cr = part(th, 'crank'), bu = part(th, 'bucket');
    SFX('creak');
    if (cr) K.spin(cr, 2, 1400, 'x');
    if (bu) await tween(700, k => { bu.position.y = -1.1 * k; }).then(() => { SFX('splash'); K.burst(K.wpos(th, 0.6), { n: 14, colors: [0x6fcaf0, 0xffffff], speed: 1.2, up: 2.5, life: 0.8 }); return K.sleep(250); }).then(() => tween(700, k => { bu.position.y = -1.1 * (1 - k); }));
    say('park_bronn');
    const day = F.save.day || 1;
    if (th.state.coinDay !== day) {
      F.Things.setState(th, { coinDay: day });
      const c = K.model('tmp_p_isk', { c: 'gold' }); K.temp(th, c, 0, 2.2, 0, 1800); K.hop(c, 0.8, 600);
      if (F.Eco && F.Eco.add) F.Eco.add(1, { from: th, reason: 'well' }); SFX('coin'); say('park_onskemynt');   // v5 WP-W #42: shows 1 = adds 1
    } else F.Things.setState(th, { splashes: (th.state.splashes || 0) + 1 });
  },
});
T('p_flagg', {
  name: 'flaggstanga', radius: 0.4, solid: true,
  init(th) { const f = part(th, 'flag'); if (f && th.state.up) f.position.y = 4.4; },
  tick(th, dt, t) { const f = part(th, 'flag'); if (!f || th.busy) return; const ph = th.x * 0.7; f.rotation.y = Math.sin(t * 2.6 + ph) * 0.22 + Math.sin(t * 6.1 + ph) * 0.06; f.scale.x = 1 + Math.sin(t * 4.3 + ph) * 0.05; },
  async press(th) {
    const f = part(th, 'flag'); const up = !th.state.up;
    F.Things.setState(th, { up });
    SFX('swish');
    if (f) { const y0 = f.position.y, y1 = up ? 4.4 : 0; await tween(1400, k => { f.position.y = U.lerp(y0, y1, K.ease.inOut(k)); f.rotation.y = Math.sin(k * Math.PI * 4) * 0.15; }); f.rotation.y = 0; }
    if (up) {
      say('park_flagg');
      const made = (F.save.words && F.save.words.made) || {}; const words = Object.keys(made);
      const w = words.length ? words[words.length - 1] : null;
      if (w && F.UI.label) {
        if (th._wl) { if (th._wtr) th._wtr.remove(); th._wl.remove(); }
        const wl = th._wl = F.UI.label(V3(th.x + 0.8, th.y + 6.7, th.z), w, { kind: 'word' }); th._wtr = tryWord(wl, w, { maxDist: 14 });
        F.T.timeout(() => { if (th._wl === wl) { if (th._wtr) th._wtr.remove(); wl.remove(); th._wl = null; th._wtr = null; } }, 9000);
      }
    }
  },
});
T('p_klokketarn', {
  name: 'klokketårnet', radius: 1.4,
  async press(th) {
    const bell = part(th, 'bell');
    // v5 WP-W (DESIGN4 §8): a clock tower strikes 1–12, like hours; v5c WP-W2: the Feslandet hour (F.OBJ.strokes), the same as the cuckoo's
    const n = F.OBJ && F.OBJ.strokes ? F.OBJ.strokes() : 1 + ((th.state.rings || 0) % 12);
    F.Things.setState(th, { rings: (th.state.rings || 0) + 1 });
    const lab = F.UI.label(V3(th.x, th.y + 7.6, th.z), '1', { kind: 'num' });
    for (let i = 1; i <= n; i++) {
      lab.set(String(i)); SFX('bell', 660 + (i % 2) * 40);
      if (bell) K.swing(bell, 0.35, 380, 'z', 1);
      await K.sleep(330);
    }
    await K.say('castle_n', { n }, '', th);
    F.T.timeout(() => lab.remove(), 1600);
  },
});
// v5c WP-W2 (longevity hook #15, WP-T's F.Book): once a day the notice board carries «Dagens tryllegåte» – a dark SILHOUETTE of the
// word's thing above a fluttering note and the spoken riddle (F.Book.sayRiddle: cues, never the spelling). Conjuring the word with the
// wand is what solves it (WP-T credits it as her own SKRIV production). No riddle / already solved → the board plays as before.
function riddleNote(th) {
  const B = F.Book; if (!B || typeof B.riddle !== 'function' || typeof B.sayRiddle !== 'function') return null;
  let r = null; try { r = B.riddle(); } catch (e) { r = null; }
  if (!r || r.done || !r.word) return null;
  return F.OBJ.hook(th, 'tavle_gate', async t => {
    SFX('rustle');
    const ns = ['note1', 'note2', 'note3'].map(n => part(t, n)).filter(Boolean); ns.forEach((n, i) => K.swing(n, 0.35, 1600 + i * 300, 'z', 3));
    try {
      if (r.model && has(r.model)) {
        const m = F.VOX.make(r.model, {}); const bb = new THREE.Box3().setFromObject(m), d = Math.max(0.05, bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        m.scale.multiplyScalar(0.8 / d); m.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0x2b2340 }); o.castShadow = false; } });
        K.temp(t, m, 0, 2.6, 0.45, 9000); K.sparkle(K.wpos(t, 2.8), 0xb197fc);
      }
    } catch (e) { console.error('[park] riddle silhouette', e); }
    await B.sayRiddle();
  });
}
T('p_tavle', {
  name: 'oppslagstavla', radius: 1.0,
  hook: th => F.OBJ.hook ? riddleNote(th) : null,
  async press(th) {
    SFX('rustle');
    const ns = ['note1', 'note2', 'note3'].map(n => part(th, n)).filter(Boolean);
    ns.forEach((n, i) => K.swing(n, 0.35, 1600 + i * 300, 'z', 3));
    const n = ns[(th.state.k || 0) % Math.max(1, ns.length)];
    F.Things.setState(th, { k: (th.state.k || 0) + 1 });
    if (n) { const y0 = n.position.y, z0 = n.position.z; await tween(900, k => { n.position.z = z0 + Math.sin(k * Math.PI) * 0.8; n.position.y = y0 + Math.sin(k * Math.PI) * 0.6; n.rotation.y = k * Math.PI * 2; }); n.rotation.y = 0; n.position.set(n.position.x, y0, z0); }
  },
});
T('p_laeretarn', {
  name: 'læretårnet', radius: 2.2, reach: 3.6, noPop: true,
  build(th) {
    const g = new THREE.Group();
    const pick = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 4.2), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 3; g.add(pick); th._pick = pick;
    return g;
  },
  init(th) {
    const T = F.Castle.towers[th.data.tower]; if (!T) return;
    th.tower = T; T.thing = th;
    th.x = T.group.position.x; th.z = T.group.position.z; th.obj.position.set(th.x, T.group.position.y, th.z);
    th.labelY = 2.6;                     // a plaque at door height: at the flag tip it read as the castle's corner tower label (review)
    th.label = F.UI.label(th, T.def.word, { kind: 'plaque', maxDist: 40 });
    th._tr = tryWord(th.label, T.def.word, { maxDist: 12 });   // v3 §8.6: «tall» is read by her first (1st tap sounds out, 2nd tap the word)
    const fit = () => { const h = T.height(); th._pick.scale.y = h; th._pick.position.y = h / 2; th.labelY = 2.6; th.bboxDirty = true; };
    fit();
    F.on('towerChanged', key => { if (key === th.data.tower) fit(); });
  },
  async press(th) {
    const T = th.tower; if (!T) return;
    SFX('chime');
    const top = V3(th.x, T.group.position.y + T.height() - 1, th.z);
    K.burst(top, { n: 30, colors: [0xffd84a, 0xffffff, 0xff7fb0], speed: 1.6, up: 3, life: 1.2 });
    T.floors.children.forEach((f, i) => F.T.timeout(() => K.hop(f, 0.12, 260), i * 60));
    K.hop(T.roof, 0.3, 500);
    T.wave();
    F.Things.setState(th, { taps: (th.state.taps || 0) + 1 });
    // v3 §8.6 + language audit: no immediate «{t}.» (that read the plaque out); the floors line, the «grows» hint only on the 1st tap a visit
    const first = !(th._visitT > 0 && F.T.now - th._visitT < 120); th._visitT = F.T.now;
    if (F.Prog && F.Prog.sayFloors) await F.Prog.sayFloors(th.data.tower);
    else if (T.n === 1) await say('castle_etasje1'); else if (T.n >= 2) await say('castle_etasjer', { n: T.n });
    void first;      // natural 11.10.: no «Tårnet vokser når du øver!» – the chime, the burst and the hopping floors say it
  },
});
// the 11 shops (LIFE: F.Shop.open)
const SHOP_LOOK = {
  feboden: ['pink', 'white', 'w_ballkjole', 'kjole'], dyrebutikken: ['butter', 'white', 'kanin', 'katt'], mobelbua: ['woodRed', 'cream', 'stol', 'lampe'], hagesenteret: ['leaf', 'white', 'rose', 'blomst'],
  bakeriet: ['coral', 'cream', 'kake', 'bolle'], lekebutikken: ['sky', 'white', 'ball', 'bamse'], musikkbua: ['lilac', 'white', 'tromme', 'gitar'], reisebua: ['teal', 'white', 'robåt', 'bil'],
  gavebua: ['rose', 'butter', 'life_gaveeske', 'gave'], tryllebua: ['purple', 'butter', 'mag_bok', 'stav'], byggebua: ['orange', 'white', 'hus', 'b_lekehus'],
};
T('p_butikk', {
  name: 'butikken', radius: 2.0, reach: 3.4,
  build(th) {
    const L = SHOP_LOOK[th.data.shop] || ['pink', 'white'];
    const g = M(th, 'p_butikk', { a: L[0], b: L[1] });
    // the shop's goods on the counter: real catalogue models (first 3 with a model), else the look model
    const items = (F.CAT && F.CAT.ofShop ? F.CAT.ofShop(th.data.shop) : []).map(c => F.CAT.mid ? F.CAT.mid(c) : (has(c.model) ? c.model : null)).filter(Boolean);
    // the 3 lightest of the first 8 (triangle budget: the market shows 11 shops at once)
    const tris = id => { try { const gg = F.VOX.geometry(id, {}); let n = 0; for (const c in gg.body) n += gg.body[c].index.count / 3; for (const pn in gg.parts) for (const c in gg.parts[pn].geo) n += gg.parts[pn].geo[c].index.count / 3; return n; } catch (e) { return 1e9; } };
    const light = items.slice(0, 8).map((id, i) => ({ id, i, n: tris(id) })).filter(o => o.n < 6000).sort((a, b) => a.n - b.n).slice(0, 3).sort((a, b) => a.i - b.i).map(o => o.id);
    const cand = light.length ? light : (items.length ? items.slice(0, 2) : [L[2], L[3]].filter(id => id && has(id)));
    cand.forEach((id, i) => { try { const m = F.VOX.make(id, {}); const b = new THREE.Box3().setFromObject(m); const s = b.isEmpty() ? 1 : Math.min(1, 0.7 / Math.max(0.05, b.max.y - b.min.y), 0.8 / Math.max(0.05, b.max.x - b.min.x)); m.scale.setScalar(s); m.position.set(-1.1 + i * 1.1, 1.15, 0.9); m.rotation.y = 0.3; g.add(m); } catch (e) { /* model failed: skip */ } });
    return g;
  },
  init(th) {
    th.labelY = 3.7;
    const sh = F.SHOPS && F.SHOPS[th.data.shop];
    const word = (sh && sh.what) || th.data.shop;
    th.label = F.UI.label(th, word, { kind: 'plaque', maxDist: 30 });
    th.label.el.classList.add('shop');
    th._tr = tryWord(th.label, word);   // v3 §8.6: the shop word is hers to read first
  },
  async press(th) {
    SFX('bell', 1318);
    K.sparkle(K.wpos(th, 2.8), 0xffd84a);
    F.Things.setState(th, { visits: (th.state.visits || 0) + 1 });
    if (F.Shop && F.Shop.open) { await F.Shop.open(th.data.shop, {}); return; }
    th.obj.children.slice(1).forEach((m, i) => F.T.timeout(() => K.hop(m, 0.25, 400), i * 120));
    await say('park_butikk_stengt');
  },
});

/* ====================================================================== south park */
const DROPS = 72;
T('p_fontene', {
  name: 'fontena', radius: 2.3, pickIgnore: ['jet'],      // natural 11.10. (audit D10): the spray is not the fountain (input.js pick box)
  init(th) {
    th.t0 = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DROPS * 3), 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8eeff, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
    pts.frustumCulled = false; th.obj.add(pts); th._drops = pts;
    th._dseed = []; for (let i = 0; i < DROPS; i++) th._dseed.push([Math.random() * Math.PI * 2, Math.random(), i % 3]);
  },
  tick(th, dt, t) {
    const j = part(th, 'jet'); const m = th.state.mode || 0;
    if (j) { j.scale.y = 1 + Math.sin(t * 6) * 0.08 + m * 0.5; j.scale.x = j.scale.z = m === 2 ? 1.8 + Math.sin(t * 3) * 0.3 : 1; j.rotation.y = m === 1 ? t * 2 : 0; }
    if (!th._drops) return;
    // three streams: a tall centre plume, a ring falling into the middle bowl, a ring into the big basin
    const P = th._drops.geometry.attributes.position, H = 2.3 + m * 0.35;
    for (let i = 0; i < DROPS; i++) {
      const [a0, ph, kind] = th._dseed[i]; const k = (t * (kind === 0 ? 0.7 : 0.55) + ph) % 1;
      let x, y, z;
      if (kind === 0) { const a = a0 + (m === 1 ? t * 2 : 0), r = k * 0.45; x = Math.cos(a) * r; z = Math.sin(a) * r; y = H + 0.4 + k * 1.3 - k * k * 1.6; }
      else if (kind === 1) { const r = 0.35 + k * 0.45; x = Math.cos(a0) * r; z = Math.sin(a0) * r; y = H + 0.25 - k * k * 0.75; }
      else { const r = 0.8 + k * (0.9 + m * 0.2); x = Math.cos(a0) * r; z = Math.sin(a0) * r; y = 1.55 + Math.sin(k * Math.PI) * 0.25 - k * 1.1; }
      P.setXYZ(i, x, y, z);
    }
    P.needsUpdate = true;
  },
  async press(th) {
    const m = ((th.state.mode || 0) + 1) % 3; F.Things.setState(th, { mode: m });
    SFX('splash');
    const top = K.wpos(th, 2.4 + m * 0.4);
    K.burst(top, { n: 40, colors: [0x6fcaf0, 0xffffff, 0x9ad6ff], speed: 2 + m, up: 4 + m, life: 1.2, gravity: 7 });
    say('park_fontene');
    await K.sleep(600);
  },
});
T('p_paviljong', {
  name: 'musikkpaviljongen', radius: 3.4, reach: 4.6, home: ['F55'], homePlace: 'park',
  async press(th) {
    const n = counter(th, 'band', 5);       // 1..5 musicians, then a new song
    const INS = ['gold', 'red', 'sky', 'pink', 'mint'];
    if (!th._band) th._band = [];
    if (n === 1) { th._band.forEach(b => b.parent && b.parent.remove(b)); th._band = []; }
    const a = (n - 1) / 5 * Math.PI * 2 + 0.6;
    const mu = K.model('tmp_p_musikant', { c: U.pick(R, ['peach', 'butter', 'wool', 'hairBrown', 'grey']), i: INS[n - 1] });
    mu.position.set(Math.cos(a) * 1.6, 0.42, Math.sin(a) * 1.6); mu.rotation.y = -a - Math.PI / 2; th.obj.add(mu); th._band.push(mu);
    K.hop(mu, 0.5, 400);
    const scale = [0, 2, 4, 7, 9, 12, 9, 7];
    for (let i = 0; i < 8; i++) { th._band.forEach((b, k) => { if (i % (k + 1) === 0) { SFX('tone', F.note(scale[(i + k * 2) % 8] + k * 2), 0.3, k % 2 ? 'triangle' : 'sine', 0.07); } K.hop(b, 0.12, 200); }); await K.sleep(240); }
    const note = K.model('tmp_p_note', { c: INS[n - 1] }); K.temp(th, note, 0, 3, 0.5, 1800); tween(1800, k => { note.position.y = 3 + k * 2; note.rotation.y = k * 4; });
    say(n === 1 ? 'park_band' : 'castle_musikk');
  },
});
T('p_iskiosk', {
  name: 'iskiosken', radius: 1.6,
  async press(th) {
    const n = (th.state.scoops || 0) + 1;
    if (!th._cone) { th._cone = new THREE.Group(); th._cone.position.set(0, 1.75, 1.0); th.obj.add(th._cone); const cone = K.model('tmp_p_isk', { c: 'honey' }); cone.scale.set(0.8, 1.1, 0.8); th._cone.add(cone); }
    if (n > 12) {
      SFX('tada'); K.burst(K.wpos(th, 3), { n: 30, colors: [0xff7fb0, 0xfff0a0, 0xffffff, 0xa6efcd], speed: 2, up: 4 });
      await K.spin(th._cone, 1, 700); while (th._cone.children.length > 1) th._cone.remove(th._cone.children[1]);
      F.Things.setState(th, { scoops: 0 }); say('castle_nam'); return;
    }
    F.Things.setState(th, { scoops: n });
    const s = K.model('tmp_p_isk', { c: ['pink', 'butter', 'mint', 'cherry', 'lilac', 'cream'][n % 6] });
    s.position.y = 0.22 + n * 0.22; th._cone.add(s); K.hop(s, 0.4, 350); SFX('pop');
    // v5c WP-W2 (review X: only 10–12 were counted aloud): the tower is counted as it grows, scoop by scoop (1–12, natural)
    if (n === 1) await say('park_is');     // natural 11.10.: the growing cone is the count – no number aloud on a free tap
  },
  init(th) { if (F.OBJ && F.OBJ.readSign) F.OBJ.readSign(th, 'is', 3.3); const n = th.state.scoops || 0; if (n) { th._cone = new THREE.Group(); th._cone.position.set(0, 1.75, 1.0); th.obj.add(th._cone); const cone = K.model('tmp_p_isk', { c: 'honey' }); th._cone.add(cone); for (let i = 1; i <= n; i++) { const s = K.model('tmp_p_isk', { c: ['pink', 'butter', 'mint', 'cherry', 'lilac', 'cream'][i % 6] }); s.position.y = 0.22 + i * 0.22; th._cone.add(s); } } },
});
T('p_ballongselger', {
  name: 'ballongselgeren', radius: 0.9,
  async press(th) {
    const bs = part(th, 'balloons'); if (bs) K.swing(bs, 0.2, 1400, 'z', 2);
    const c = U.pick(R, ['red', 'butter', 'sky', 'pink', 'mint', 'lilac']);
    const b = K.model('tmp_p_ballong', { c });
    const p = K.wpos(th, 3.2);
    tempWorld(th, b, p, 4200);
    SFX('whoosh');
    F.Things.setState(th, { sold: (th.state.sold || 0) + 1 });
    await tween(4000, k => { b.position.y = p.y + k * 9; b.position.x = p.x + Math.sin(k * 6) * 0.6; b.rotation.z = Math.sin(k * 8) * 0.2; });
  },
});
// natural 11.10. (audit #23/#18): Tallveien's 11 stones are permanently 1–11 (a real road of numbers, not her school level, never
// renumbered in the morning); data.n (10–20, park.js) stays the stone's index for park.js / tests (Park.tallvei.get(n)).
// Each stone says its number the first time a session, then only its pling (sayOnce).
const tallShown = th => 1 + (th.data.n - 10);
const ONCE = new Set();
const sayOnce = (key, n) => { if (ONCE.has(key)) return Promise.resolve(false); ONCE.add(key); return sayN(n); };
T('p_tallvei', {
  name: 'steinen', radius: 1.0, solid: false, reach: 2.0, home: ['F52', 'F44'], homePlace: 'tallveien',
  build(th) { return M(th, 'p_stein', { c: ['butter', 'mint', 'blossom', 'sky', 'lavender', 'peach'][th.data.n % 6] }); },
  init(th) { th.labelY = 0.9; th.label = F.UI.label(th, String(tallShown(th)), { kind: 'num', maxDist: 30 }); th.label.el.classList.add('stone'); },
  highlight(th, on) { th.label && th.label.el.classList.toggle('glow', !!on); th.obj.scale.setScalar(on ? 1.15 : 1); },
  async press(th) {
    const n = tallShown(th);
    SFX('pling', th.data.n - 10);
    K.burst(K.wpos(th, 0.4), { n: 14, colors: [0xffd84a, 0xffffff], speed: 1.2, up: 2, life: 0.8 });
    F.Things.setState(th, { steps: (th.state.steps || 0) + 1 });
    await Promise.all([K.hop(th.obj, 0.35, 420), sayOnce('tv' + th.data.n, n)]);
  },
});
T('p_hinkerute', {
  name: 'hinkeruta', radius: 2.2, solid: false, reach: 3.2,
  build(th) { return K.model('tmp_p_hinke', {}); },
  init(th) {
    th.labelY = 0.5; th.labels = [];
    const L = [[14, 48], [8, 40], [20, 40], [14, 32], [8, 24], [20, 24], [14, 16], [8, 8], [20, 8], [14, 0], [26, 0]];
    const sc = 0.1 * (th.scale || 1);
    th.cellPos = L.map(([x, z]) => V3(th.x + (x + 5.5 - 20) * sc, th.y + 0.2, th.z + (48 - z + 3.5 - 28) * sc));
    // natural 11.10. (audit #23): a hopscotch is 1–10, always (the 11th square is the turn-around square, no number)
    th.hb = 1;
    th.cellPos.forEach((p, i) => th.labels.push(F.UI.label(p, i < 10 ? String(th.hb + i) : '', { kind: 'num', maxDist: 26, size: 24 })));
    if (th.labels[10]) th.labels[10].show(false);
    th.cells = L;
  },
  async press(th) {
    // natural 11.10. (audit #61, «No voice»): square by square with a rising pling and a glowing plaque – no «Hink og tell!», no numbers aloud
    for (let i = 0; i < 10; i++) {
      const lab = th.labels[i]; lab.el.classList.add('glow');
      SFX('pling', i % 8);
      K.burst(th.cellPos[i].clone().add(V3(0, 0.1, 0)), { n: 8, colors: [0xffd84a, 0xff7fb0], speed: 0.8, up: 1.5, life: 0.6 });
      await K.sleep(420);
    }
    F.Things.setState(th, { hops: (th.state.hops || 0) + 1 });
    F.T.timeout(() => th.labels.forEach(l => l.el.classList.remove('glow')), 1500);
  },
});
// Tallhagen: numeral beds 10–20 with 4 strand colours that bloom with mastery (F.Park.setBloom from progress.js)
const STRAND_C = ['pink', 'butter', 'sky', 'lilac'];   // T-NAVN, T-MENGDE, T-SKRIV, T-ORDEN
const STRANDS = ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN'];
T('p_tallhage', {
  name: 'tallbedet', radius: 2.4, solid: false, reach: 3.4, home: ['F42'], homePlace: 'tallhage',
  build(th) {
    const g = new THREE.Group();
    const bed = K.model('tmp_p_tallhage', { n: th.data.n }); g.add(bed);
    // flower buds on every numeral pixel; quadrant → strand colour. One InstancedMesh per strand colour (4 draw calls per bed,
    // not one per flower); th.flowers are plain Object3Ds whose scale drives the instance matrices (th.syncFlowers()).
    const G = F.VOX.FONT, s = String(th.data.n), flowers = [], ims = [];
    [...s].forEach((ch, d) => { const gl = G[ch]; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (gl[r * 3 + q] === '1') for (const dz of [0.25, 0.75]) {
      const x = (1 + d * 8 + q * 2 + 1 - 9) * 0.25, z = (1 + r * 4 + 1 - 11) * 0.25 + dz;
      const si = (d * 2 + (r > 2 ? 1 : 0)) % 4;
      const f = new THREE.Object3D(); f.position.set(x, 0.75, z); f.userData.si = si; flowers.push(f);
    } });
    for (let si = 0; si < 4; si++) {
      const mine = flowers.filter(f => f.userData.si === si); if (!mine.length) continue;
      let geo = null; try { geo = F.VOX.geometry('tmp_p_bloom', { c: STRAND_C[si] }).body.opaque; } catch (e) { geo = null; }
      if (!geo) { mine.forEach(f => { const m = K.model('tmp_p_bloom', { c: STRAND_C[si] }); f.add(m); g.add(f); }); continue; }
      const im = new THREE.InstancedMesh(geo, F.VOX.material('opaque'), mine.length); im.castShadow = true; im.receiveShadow = true;
      mine.forEach((f, i) => { f.userData.im = im; f.userData.ii = i; }); g.add(im); ims.push(im);
    }
    th.flowers = flowers;
    th.syncFlowers = () => { for (const f of flowers) { if (!f.userData.im) continue; f.updateMatrix(); f.userData.im.setMatrixAt(f.userData.ii, f.matrix); } ims.forEach(im => { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere && im.computeBoundingSphere(); }); };
    th.syncFlowers();
    return g;
  },
  setBloom(th, lv, animate) {   // lv: number 0..4  or {strand: 0..5}; animate: grow when she is near (else waits for her)
    let grew = false;
    th.flowers.forEach(f => {
      const l = typeof lv === 'number' ? lv / 4 : U.clamp(((lv && lv[STRANDS[f.userData.si]]) || 0) / 5, 0, 1);
      const to = [0.5 + l * 0.75, 0.38 + l * 0.9, 0.5 + l * 0.75];
      if (animate && f.userData.to && to[1] > f.userData.to[1] + 0.01) grew = true;
      f.userData.from = [f.scale.x, f.scale.y, f.scale.z]; f.userData.to = to;
      if (!animate) f.scale.set(to[0], to[1], to[2]);
    });
    if (!animate && th.syncFlowers) th.syncFlowers();
    if (animate) { th._grow = true; th._growK = 0; th._grewFx = !grew; }
    th.bloom = lv;
  },
  tick(th, dt) {
    if (!th._grow) return;
    const P = F.Player.pos; if (F.Space.cur !== 'out' || Math.hypot(P.x - th.x, P.z - th.z) > 28) return;
    if (!th._grewFx) { th._grewFx = true; SFX('grow'); K.burst(K.wpos(th, 1.0), { n: 26, colors: [0xff7fb0, 0xffd84a, 0x9ad6ff, 0xc6a8ff, 0x7fd36b], speed: 1.4, up: 2.6, gravity: 1.2, life: 1.5, size: 0.09 }); }
    th._growK = Math.min(1, th._growK + dt / 1.8);
    const k = K.ease.back(th._growK);
    th.flowers.forEach((f, i) => { const a = f.userData.from, b = f.userData.to; if (!a || !b) return; const kk = U.clamp(k * 1.15 - (i % 7) * 0.02, 0, 1.1); f.scale.set(U.lerp(a[0], b[0], kk), U.lerp(a[1], b[1], kk), U.lerp(a[2], b[2], kk)); });
    if (th._growK >= 1) { th._grow = false; th.flowers.forEach(f => { const b = f.userData.to; if (b) f.scale.set(b[0], b[1], b[2]); }); }
    if (th.syncFlowers) th.syncFlowers();
  },
  init(th) {
    th.labelY = 0.9;
    th.label = F.UI.label(V3(th.x, th.y + 0.6, th.z + 3.4), String(th.data.n), { kind: 'num', maxDist: 30 });
    th.def.setBloom(th, (F.Park.bloomData && F.Park.bloomData[th.data.n]) || 1);
  },
  async press(th) {
    const n = th.data.n;
    sayOnce('th' + n, n);              // natural 11.10.: the bed's number once a session, then the flowers only
    SFX('grow');
    // flowers swirl up into a ten-frame (row of ten + the rest), then settle back
    const g = new THREE.Group(); g.position.set(0, 1.6, 0); th.obj.add(g);
    for (let i = 0; i < n; i++) {
      const f = K.model('tmp_p_bud', { c: STRAND_C[i % 4] }); f.scale.setScalar(1.6);
      const row = Math.floor(i / 10), col = i % 10;
      const tx = (col - 4.5) * 0.42 + (col >= 5 ? 0.18 : 0), ty = -row * 0.55;
      f.position.set(0, -1.4, 0); g.add(f);
      F.T.timeout(() => { SFX('pling', i % 10); tween(500, k => { const e = K.ease.out(k); f.position.set(tx * e + Math.sin(k * 7) * 0.4 * (1 - k), -1.4 + (ty + 1.4) * e, Math.cos(k * 7) * 0.4 * (1 - k)); }); }, i * 110);
    }
    F.Things.setState(th, { taps: (th.state.taps || 0) + 1 });
    await K.sleep(n * 110 + 1800);
    await tween(400, k => g.scale.setScalar(1 - k)); th.obj.remove(g);
  },
});
F.Park = F.Park || {};
// progress.js calls this with {10:{'T-NAVN':box,…},…,20:{…}} at 'ready' and after tasks. The first call sets the beds instantly;
// later rises grow with a sparkle the next time she walks by Tallhagen.
let bloomFirst = true;
F.Park.setBloom = function (b) {
  F.Park.bloomData = b;
  const beds = (F.Park.tallhage && F.Park.tallhage.beds) || {};
  const anim = !bloomFirst && !!F.booted;
  for (const n in beds) { const th = beds[n]; if (th && th.def.setBloom) th.def.setBloom(th, b && b[n] != null ? b[n] : 0, anim); }
  if (Object.keys(beds).length) bloomFirst = false;
};
T('p_drage', {
  name: 'dragen', radius: 0.6,
  tick(th, dt, t) { const k = part(th, 'kite'); if (k && !th.busy) { k.rotation.z = Math.sin(t * 1.3) * 0.12; k.rotation.x = Math.sin(t * 0.9) * 0.05; } },
  async press(th) {
    const k = part(th, 'kite'); SFX('whoosh');
    F.Things.setState(th, { flights: (th.state.flights || 0) + 1 });
    if (k) { const s0 = k.scale.y; await tween(2600, q => { k.scale.y = s0 * (1 + Math.sin(q * Math.PI) * 0.5); k.rotation.z = Math.sin(q * Math.PI * 2) * 0.9; k.rotation.y = q * Math.PI * 2; }); k.rotation.y = 0; k.scale.y = s0; }
  },
});
T('p_statue', {
  name: 'statuen', radius: 0.9,
  async press(th) {
    const a = part(th, 'arm'), b = part(th, 'bird');
    const pose = ((th.state.pose || 0) + 1) % 3; F.Things.setState(th, { pose });
    if (a) K.rotTo(a, 'z', [0, 0.9, -0.6][pose], 600);
    if (b) { SFX('chirp'); const y0 = b.position.y; await tween(1600, k => { b.position.y = y0 + Math.sin(k * Math.PI) * 2.5; b.position.x = Math.sin(k * Math.PI * 2) * 1.5; b.rotation.y = k * Math.PI * 2; }); b.position.set(0, y0, 0); b.rotation.y = 0; }
    say('park_statue');
  },
});
T('p_benk', {
  name: 'benken', radius: 1.1,
  async press(th) {
    const n = 2 + ((th.state.sits || 0) % 4); F.Things.setState(th, { sits: (th.state.sits || 0) + 1 });
    birds(th, n, { y: 0.75, r: 1.6, ttl: 4200 });
    await K.sleep(n * 220 + 900);
  },
});

/* ====================================================================== west: Lekeplassen */
T('p_huske', {
  name: 'huska', radius: 1.6,
  async press(th) {
    const s = part(th, 'seat'), s2 = part(th, 'seat2');
    th._amp = Math.min(0.95, (th._amp || 0.25) + 0.25);
    F.Things.setState(th, { swings: (th.state.swings || 0) + 1 });
    SFX('whoosh'); say('park_huske');
    const amp = th._amp; th._swingId = (th._swingId || 0) + 1; const id = th._swingId;
    tween(5200, k => { if (th._swingId !== id) return; const a = Math.sin(k * Math.PI * 7) * amp * (1 - k * 0.8); if (s) s.rotation.x = a; if (s2) s2.rotation.x = -a * 0.8; }).then(() => { if (th._swingId === id) { th._amp = 0.25; if (s) s.rotation.x = 0; if (s2) s2.rotation.x = 0; } });
    await K.sleep(900);
  },
});
T('p_sklie', {
  name: 'sklia', radius: 1.8,
  async press(th) {
    SFX('whoosh'); say('park_sklie');
    F.Things.setState(th, { slides: (th.state.slides || 0) + 1 });
    const b = K.model('tmp_p_bobble', {}); b.scale.setScalar(2.4);
    K.temp(th, b, 0, 2.4, -1.4, 2600);
    await tween(1300, k => { b.position.set(0, 2.4 - k * 2.2 + 0.2, -1.4 + k * 4.0); b.rotation.x = k * 8; });
    K.burst(K.wpos(th, 0.3).add(V3(0, 0, 2.5)), { n: 16, speed: 1.6, up: 2.5 });
  },
});
T('p_vippe', {
  name: 'vippehuska', radius: 2.2, home: ['F53'], homePlace: 'vippe',
  init(th) { const p = part(th, 'plank'); th.vax = has('p_vippe') ? 'x' : 'z'; if (p) p.rotation[th.vax] = th.state.side ? 0.32 : -0.32; },
  async press(th) {
    const p = part(th, 'plank'); const side = !th.state.side; F.Things.setState(th, { side });
    SFX('creak'); say('park_vippe');
    if (p) await K.rotTo(p, th.vax || 'z', side ? 0.32 : -0.32, 700);
    SFX('thud');
  },
});
T('p_sandkasse', {
  name: 'sandkassa', radius: 1.8, solid: false, home: ['F59', 'F60'], homePlace: 'mason',
  init(th) { th._towers = []; for (let i = 0; i < (th.state.towers || 0); i++) addSand(th, i, false); },
  async press(th) {
    let n = (th.state.towers || 0) + 1;
    if (n > 6) { th._towers.forEach(t => t.parent && t.parent.remove(t)); th._towers = []; n = 1; SFX('whoosh'); }
    F.Things.setState(th, { towers: n });
    addSand(th, n - 1, true); SFX('pop'); say('park_sand');
    if (R() < 0.12 && F.Eco && F.Eco.add) { F.Eco.add(1, { from: th, reason: 'sand' }); SFX('coin'); }
    await K.sleep(500);
  },
});
function addSand(th, i, anim) {
  const t = K.model('tmp_p_sandtarn', {}); const a = i / 6 * Math.PI * 2;
  t.position.set(Math.cos(a) * 0.9, 0.25, Math.sin(a) * 0.9); th.obj.add(t); th._towers.push(t);
  if (anim) { t.scale.setScalar(0.01); tween(400, k => t.scale.setScalar(Math.max(0.01, K.ease.back(k)))); }
}
T('p_trampoline', {
  name: 'trampolinen', radius: 1.7, solid: false,
  async press(th) {
    const m = part(th, 'mat'); const av = F.Player.avatar;
    th._h = Math.min(3.2, (th._h || 0.8) + 0.6);
    F.Things.setState(th, { bounces: (th.state.bounces || 0) + 1 });
    SFX('boing'); say('park_trampoline');
    for (let i = 0; i < 3; i++) {
      const h = th._h * (1 - i * 0.25);
      if (m) K.hop(m, -0.12, 200);
      await tween(650, k => { if (av) av.position.y = Math.sin(k * Math.PI) * h; });
      SFX('boing');
    }
    if (av) av.position.y = 0;
    F.T.timeout(() => { th._h = 0.8; }, 6000);
  },
});
T('p_karusell', {
  name: 'karusellen', radius: 2.6, reach: 3.8,
  async press(th) {
    const top = part(th, 'top');
    F.Things.setState(th, { rides: (th.state.rides || 0) + 1 });
    SFX('tune');
    if (top) { const a0 = top.rotation.y; await tween(4000, k => { top.rotation.y = a0 + K.ease.inOut(k) * Math.PI * 3; top.position.y = Math.sin(k * Math.PI * 12) * 0.05; }); top.position.y = 0; }
  },
});
T('p_sjakk', {
  name: 'sjakkbrettet', radius: 2.2, solid: false,
  build(th) {
    const m = M(th, 'p_sjakk', {});
    if (has('p_sjakkbrikke') && !(m.userData.parts && m.userData.parts.p1)) {
      m.userData.parts = m.userData.parts || {};
      [['konge', 'lys', -1.2, -1.2], ['dronning', 'mork', 0.4, -0.8], ['hest', 'lys', 1.2, 1.0], ['tarn', 'mork', -0.8, 1.2]].forEach(([piece, side, x, z], i) => {
        const pc = new THREE.Group(); pc.position.set(x, 0.15, z); pc.add(F.VOX.make('p_sjakkbrikke', { piece, side })); m.add(pc); m.userData.parts['p' + (i + 1)] = pc; });
    }
    return m;
  },
  async press(th) {
    SFX('pluck', 440);
    F.Things.setState(th, { moves: (th.state.moves || 0) + 1 });
    const ps = ['p1', 'p2', 'p3', 'p4'].map(n => part(th, n)).filter(Boolean);
    for (let i = 0; i < ps.length; i++) { const p = ps[i]; const dx = (R() - 0.5) * 0.6, dz = (R() - 0.5) * 0.6; K.hop(p, 0.6, 450).then(() => { p.position.x += dx; p.position.z += dz; if (Math.abs(p.position.x) > 1 || Math.abs(p.position.z) > 1) { p.position.x = 0; p.position.z = 0; } }); SFX('pop'); await K.sleep(200); }
    await K.sleep(500);
  },
});
// v3 WP3 §8.5: «Trykk på boblene!» is true – while bubbles float, a tap on one pops it (pick hook) and counts on from a teen (castle_n)
const BUB = { live: [], n: 0, hook: null };
function bubbleHook(sx, sy) {
  if (!BUB.live.length) return null;
  const r = F.R.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector3();
  let best = null, bd = 46;
  for (const b of BUB.live) {
    if (!b.parent || b.userData.popped) continue;
    v.copy(b.position).project(F.R.camera); if (v.z > 1) continue;
    const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height, d = Math.hypot(x - sx, y - sy);
    if (d < bd) { bd = d; best = b; }
  }
  return best ? { kind: 'bubble', rec: best, point: best.position.clone(), press: h => popBubble(h.rec) } : null;
}
function popBubble(b) {
  if (!b || b.userData.popped) return;
  b.userData.popped = true; BUB.live = BUB.live.filter(x => x !== b);
  SFX('pop'); K.sparkle(b.position.clone(), 0x9ad6ff);
  K.burst(b.position.clone(), { n: 12, colors: [0x9ad6ff, 0xffffff, 0xc6a8ff], speed: 1.4, up: 0.6, life: 0.6, size: 0.06 });
  if (b.parent) b.parent.remove(b);
  BUB.n = Math.min(20, BUB.n + 1);
  const lab = F.UI.label(b.position.clone().add(V3(0, 0.4, 0)), String(BUB.n), { kind: 'num' }); lab.el.classList.add('glow'); F.T.timeout(() => lab.remove(), 1400);
  F.emit('bubblePop', BUB.n);        // natural 11.10.: the label is the count (no number aloud on a free tap)
  if (!BUB.live.length) unhookBubbles();
}
function unhookBubbles() { if (BUB.hook) { const i = F.Input.pickHooks.indexOf(BUB.hook); if (i >= 0) F.Input.pickHooks.splice(i, 1); BUB.hook = null; } }
T('p_boblemaskin', {
  name: 'boblemaskinen', radius: 0.8,
  async press(th) {
    const fan = part(th, 'fan'); if (fan) K.spin(fan, 4, 2400, 'z');
    F.Things.setState(th, { bubbles: (th.state.bubbles || 0) + 1 });
    if (!BUB.live.length) BUB.n = 0;                                 // v5 WP-W: natural counting – the first pop says 1, then on up (max 20)
    if (!BUB.hook && F.Input && F.Input.pickHooks) { BUB.hook = bubbleHook; F.Input.pickHooks.push(bubbleHook); }
    for (let i = 0; i < 9; i++) {
      const b = K.model('tmp_p_bobble', {}); const s = 0.8 + R() * 0.8; b.scale.setScalar(s);
      const p = K.wpos(th, 0.6); p.z += 0.6; tempWorld(th, b, p, 5600 + i * 50); BUB.live.push(b);
      const vx = (R() - 0.5) * 1.6, vz = 0.6 + R(); tween(5400, k => { if (!b.userData.popped) b.position.set(p.x + vx * k * 2, p.y + k * 3 + Math.sin(k * 9 + i) * 0.2, p.z + vz * k * 2); });
      F.T.timeout(() => { BUB.live = BUB.live.filter(x => x !== b); if (!b.userData.popped) { SFX('pop'); K.sparkle(b.position.clone(), 0x9ad6ff); } if (!BUB.live.length) unhookBubbles(); }, 5500);
      await K.sleep(120);
    }
  },
});
F.on('spaceChanged', () => { BUB.live = []; unhookBubbles(); });

/* ====================================================================== east: Andedammen */
T('p_andedam', {
  name: 'andedammen', radius: 1.0, home: ['F52', 'F44'], homePlace: 'pond',
  hook: animalHook('and', 'quack', ['mat', 'unge']),        // v5c WP-W2 (hook #2): no «Hvor bor anda?» at the pond
  init(th) {
    th._ducks = [];
    for (let i = 0; i < 4; i++) { const d = K.model('tmp_p_and', { c: i === 0 ? 'white' : 'butter' }); d.scale.setScalar(i === 0 ? 1.6 : 1.1); th.obj.add(d); th._ducks.push(d); }
  },
  tick(th, dt, t) {
    if (!th._ducks) return;
    const wy = (F.W.WATER != null ? F.W.WATER : -0.15) - th.y + 0.02;
    th._ducks.forEach((d, i) => { const a = t * 0.25 + i * 0.5; d.position.set(Math.sin(a) * 2.5 - 6, wy + Math.sin(t * 3 + i) * 0.02, Math.cos(a) * 3.5 - 8 + i * 0.6); d.rotation.y = a + Math.PI / 2; });
  },
  async press(th) {
    const n = 5 + ((th.state.feeds || 0) % 8);       // v5 WP-W (DESIGN4 §8): a real brood – 5–12 ducklings, counted
    F.Things.setState(th, { feeds: (th.state.feeds || 0) + 1 });
    SFX('quack');
    const g = new THREE.Group(); const p0 = V3(th.x + 2.5, (F.W.WATER != null ? F.W.WATER : -0.15) + 0.05, th.z - 3.5);
    tempWorld(th, g, p0, 4200 + n * 160);
    const mama = K.model('tmp_p_and', { c: 'white' }); mama.scale.setScalar(1.5); g.add(mama); mama.rotation.y = Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const d = K.model('tmp_p_and', { c: 'butter' }); const row = Math.floor(i / 10), col = i % 10;
      d.rotation.y = Math.PI / 2; d.position.set(-0.7 - col * 0.45 - (col >= 5 ? 0.2 : 0), 0, row * 0.6); d.scale.setScalar(0.01); g.add(d);
      F.T.timeout(() => { SFX('pling', col); tween(250, k => d.scale.setScalar(Math.max(0.01, K.ease.back(k)))); }, 200 + i * 150);
    }
    await K.sleep(200 + n * 150 + 400);      // natural 11.10.: a pling per duckling, no number aloud
    await tween(1500, k => { g.position.x = p0.x + k * 3; });
  },
});
T('p_robat', {
  name: 'robåten', radius: 1.2, solid: false, reach: 5.0,
  init(th) { th.obj.position.y = (F.W.WATER != null ? F.W.WATER : -0.15) - 0.05; },
  tick(th, dt, t) { if (!th.busy) { th.obj.rotation.z = Math.sin(t * 1.4) * 0.04; th.obj.position.y = (F.W.WATER != null ? F.W.WATER : -0.15) - 0.05 + Math.sin(t * 1.1) * 0.03; } },
  async press(th) {
    const o = part(th, 'oars'); SFX('splash'); say('park_robat');
    F.Things.setState(th, { trips: (th.state.trips || 0) + 1 });
    const cx = 72, cz = 6, x0 = th.x, z0 = th.z, a0 = Math.atan2(z0 - cz, x0 - cx), r = Math.hypot(x0 - cx, z0 - cz);
    await tween(6000, k => {
      const a = a0 + k * Math.PI * 2; const rr = r * (1 - Math.sin(k * Math.PI) * 0.35);
      th.obj.position.x = cx + Math.cos(a) * rr * 1.0; th.obj.position.z = cz + Math.sin(a) * rr * 0.7; th.obj.rotation.y = -a;
      if (o) o.rotation.x = Math.sin(k * Math.PI * 16) * 0.5;
    });
    th.obj.position.set(x0, th.obj.position.y, z0); th.obj.rotation.y = th.ry; if (o) o.rotation.x = 0;
  },
});
T('p_svaner', {
  hook: animalHook('svane', 'honk', ['mat']),
  name: 'svanene', radius: 1.2, solid: false, reach: 22,     // they glide on the water: a tap from anywhere on the bank reaches them
  build(th) {
    if (has('p_svaner')) { const m = F.VOX.make('p_svaner', {}); const P = m.userData.parts || {}; th._sw = { a: P.swan1, b: P.swan2, real: true }; return m; }
    const g = new THREE.Group(); const a = K.model('tmp_p_svane', {}), b = K.model('tmp_p_svane', {}); a.position.set(-1.2, 0, 0); b.position.set(1.2, 0, 0); a.rotation.y = Math.PI / 2; b.rotation.y = -Math.PI / 2; g.add(a); g.add(b); th._sw = { a, b }; return g;
  },
  init(th) { th.obj.position.y = (F.W.WATER != null ? F.W.WATER : -0.15) - 0.05; th._glide = 0; },
  tick(th, dt, t) {
    if (th.busy) return;
    // slow glide back and forth along the east shore of Andedammen (always within press range of the bank), gently bobbing
    const cx = 72, cz = 6, rx = 12.5, rz = 8.6, a = 0.35 + Math.sin(t * 0.035) * 1.25;
    const x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz, dir = Math.cos(t * 0.035) >= 0 ? 1 : -1;
    const vx = -Math.sin(a) * rx * dir, vz = Math.cos(a) * rz * dir;
    th.obj.position.x = th.x = x; th.obj.position.z = th.z = z;
    const want = Math.atan2(-vz, vx); let d = want - th.obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    th.obj.rotation.y += d * Math.min(1, dt * 1.2);
    th.obj.position.y = (F.W.WATER != null ? F.W.WATER : -0.15) - 0.05 + Math.sin(t * 1.3) * 0.02;
    const { b, real } = th._sw || {}; if (b && real && th._glide < 1) { th._glide = Math.min(1, th._glide + dt * 0.8); b.rotation.y = Math.PI * K.ease.inOut(th._glide); }
  },
  async press(th) {
    const { a, b } = th._sw || {}; SFX('honk');
    F.Things.setState(th, { hearts: (th.state.hearts || 0) + 1 });
    if (b && b.rotation.y) { const r0 = b.rotation.y; await tween(500, k => { b.rotation.y = r0 * (1 - K.ease.inOut(k)); }); th._glide = 0; }
    if (a && b) {
      const ax = a.position.x, bx = b.position.x, d = (bx - ax) * 0.3;
      await tween(1000, k => { a.position.x = ax + k * d; b.position.x = bx - k * d; a.rotation.x = b.rotation.x = Math.sin(k * Math.PI) * 0.4; });
      K.burst(K.wpos(th, 1.2), { n: 22, colors: [0xff7fb0, 0xff5d8f, 0xffffff], speed: 1, up: 2.5, gravity: 1, life: 1.6 });
      await K.sleep(1200);
      await tween(900, k => { a.position.x = ax + d * (1 - k); b.position.x = bx - d * (1 - k); });
    }
  },
});
T('p_fuglebad', {
  name: 'fuglebadet', radius: 0.8,
  hook: animalHook('spurv', 'chirp', ['mat']),       // v5c WP-W2 (hook #2): «Spurven spiser frø og korn.» – asked back once taught
  async press(th) {
    SFX('splash'); F.Things.setState(th, { baths: (th.state.baths || 0) + 1 });
    birds(th, 3, { y: 1.2, r: 0.9, ttl: 3600 });
    for (let i = 0; i < 4; i++) { await K.sleep(500); K.burst(K.wpos(th, 1.25), { n: 10, colors: [0x6fcaf0, 0xffffff], speed: 1, up: 2, life: 0.6 }); SFX('drip'); }
  },
});

/* ====================================================================== north */
T('p_rosebed', {
  name: 'rosebedet', radius: 1.3, solid: false, home: ['F74', 'F47'], homePlace: 'rosehagen',
  build(th) { return M(th, 'p_rosebed', { c: th.data.c || 'red' }); },
  init(th) { const r = part(th, 'roses'); if (r) r.scale.y = th.state.bloom ? 1 : 0.55; },
  async press(th) {
    const r = part(th, 'roses'); const bloom = !th.state.bloom; F.Things.setState(th, { bloom });
    SFX('grow');
    if (r) await tween(700, k => { r.scale.y = bloom ? 0.55 + 0.45 * K.ease.back(k) : 1 - 0.45 * k; });
    if (bloom) K.burst(K.wpos(th, 0.9), { n: 20, colors: [F.PAL[th.data.c || 'red'], 0xffffff, 0xff7fb0], speed: 1, up: 2, gravity: 1.5, life: 1.4, size: 0.07 });
  },
});
const HEKK = ['blob', 'rabbit', 'heart', 'swan'], HEKK3 = ['klump', 'kanin', 'hjerte', 'svane'];
T('p_hekkdyr', {
  name: 'hekkdyret', radius: 0.9, home: ['F47'], homePlace: 'hage',
  build(th) {
    const g = new THREE.Group(); const s0 = th.state.shape != null ? th.state.shape : (th.data.start || 0);
    if (has('p_hekkdyr')) { const m = F.VOX.make('p_hekkdyr', { shape: HEKK3[s0] }); g.add(m); th._hm = m; }
    else { const m = K.model('tmp_p_hekkdyr', {}); g.add(m); g.userData.parts = m.userData.parts; }
    return g;
  },
  init(th) { if (th._hm) return; const s = th.state.shape != null ? th.state.shape : (th.data.start || 0); HEKK.forEach((n, i) => { const p = part(th, n); if (p) p.visible = i === s; }); },
  async press(th) {
    const cur = th.state.shape != null ? th.state.shape : (th.data.start || 0), nx = (cur + 1) % 4;
    F.Things.setState(th, { shape: nx });
    SFX('swish'); K.burst(K.wpos(th, 1.2), { n: 26, colors: [0x5ec05c, 0x7fd36b, 0x4aa84e], speed: 1.6, up: 2.2, life: 1 });
    if (th._hm) {
      const old = th._hm; await tween(250, k => old.scale.setScalar(Math.max(0.05, 1 - k * 0.9)));
      th.obj.remove(old); const m = F.VOX.make('p_hekkdyr', { shape: HEKK3[nx] }); m.traverse(o => { o.userData.thing = th; }); th.obj.add(m); th._hm = m;
      m.scale.setScalar(0.1); await tween(350, k => m.scale.setScalar(0.1 + 0.9 * K.ease.back(k))); th.bboxDirty = true; return;
    }
    const a = part(th, HEKK[cur]), b = part(th, HEKK[nx]);
    if (a) await tween(250, k => a.scale.setScalar(1 - k * 0.9)); if (a) { a.visible = false; a.scale.setScalar(1); }
    if (b) { b.visible = true; b.scale.setScalar(0.1); await tween(350, k => b.scale.setScalar(0.1 + 0.9 * K.ease.back(k))); }
  },
});
T('p_labyrint', {
  name: 'den gylne bokstaven', radius: 0.7, solid: false,
  // v3 §8.5: the letter comes from the letters she meets in her words (no q/w/x/z/c); shown on a label and sounded by its SOUND (F.LYD)
  init(th) { const L = 'abdefghijklmnoprstuvyæøå'; th.letter = L[U.hashStr('lab' + (F.save.day || 1)) % L.length]; },
  tick(th, dt, t) { const l = part(th, 'letter'); if (l && !th.busy) l.rotation.y = t * 1.2; },
  async press(th) {
    const l = part(th, 'letter'); SFX('crystal'); say('park_labyrint');
    if (l) await tween(900, k => { l.position.y = Math.sin(k * Math.PI) * 0.8; l.rotation.y = k * Math.PI * 4; });
    K.burst(K.wpos(th, 1), { n: 40, colors: [0xf5c542, 0xfff0a0, 0xffffff], speed: 2, up: 4, life: 1.4 });
    const ch = th.letter, glyph = F.UI.caseText ? F.UI.caseText(ch) : ch;
    const lab = F.UI.label(K.wpos(th, 2.1), glyph, { kind: 'word', size: 30 }); lab.el.classList.add('glow'); F.T.timeout(() => lab.remove(), 4500);
    await K.sleep(500);
    if (F.LYD && F.LYD.letter) { try { await F.LYD.letter(ch); } catch (e) { /* no clip */ } }
    const day = F.save.day || 1;
    if (th.state.day !== day) { F.Things.setState(th, { day }); F.save.golden = F.save.golden || []; if (!F.save.golden.includes(th.letter)) { F.save.golden.push(th.letter); F.store(); F.emit('goldenLetter', th.letter); } }
    else F.Things.setState(th, { visits: (th.state.visits || 0) + 1 });
  },
});
// v5c WP-W2 (hook #25, LOGIKK): the greenhouse is a home of F74 «Dronningens blomsterbed» once a day; payoff when she worked it out
// herself: three more tomatoes ripen. Otherwise the first tap of the day says «Et frø kan bli en ny plante.»
async function ripen(th, k) {
  const left = 9 - (th.state.ripe || 0); if (left > 0) k = Math.min(k, left);      // never past a full greenhouse (a full one is harvested first)
  for (let j = 0; j < k; j++) { await th.def.ripeOne(th); await K.sleep(160); }
  if (F.TPL.has('park_drivhus_moden')) await say('park_drivhus_moden');
}
T('p_drivhus', {
  name: 'drivhuset', radius: 2.4, reach: 3.6,
  hook: th => F.OBJ.firstHook(() => F.OBJ.ask(th, 'drivhus', ['F74'], { place: 'garden', after: t => ripen(t, 3) }), () => F.OBJ.trueLine(th, 'hk_fro_plante', { vis: [t => t.def.ripeOne(t)] })),
  async ripeOne(th) {
    const n = ((th.state.ripe || 0) % 9) + 1; F.Things.setState(th, { ripe: n });
    if (n === 1) th._tom.forEach(t => th.obj.remove(t));
    if (n === 1) { th._tom = []; for (let i = 0; i < 9; i++) { const t = K.model('tmp_p_tomat', { c: 'leaf2' }); t.position.set(-1.5 + (i % 3) * 1.4 + 0.3, 0.9 + (i % 2) * 0.25, -1.0 + Math.floor(i / 3) * 1.0); th.obj.add(t); th._tom.push(t); } }
    const old = th._tom[n - 1]; const t = K.model('tmp_p_tomat', { c: 'red' }); t.position.copy(old.position); th.obj.remove(old); th.obj.add(t); th._tom[n - 1] = t;
    t.scale.setScalar(0.3); await tween(400, k => t.scale.setScalar(0.3 + 0.9 * K.ease.back(k))); t.scale.setScalar(1.2);
    SFX('pop');
  },
  init(th) { th._tom = []; const n = th.state.ripe || 0; for (let i = 0; i < 9; i++) { const t = K.model('tmp_p_tomat', { c: i < n ? 'red' : 'leaf2' }); t.position.set(-1.5 + (i % 3) * 1.4 + 0.3, 0.9 + (i % 2) * 0.25, -1.0 + Math.floor(i / 3) * 1.0); th.obj.add(t); th._tom.push(t); } },
  async press(th) { await th.def.ripeOne(th); },
});
T('p_kjokkenhage', {
  name: 'kjøkkenhagen', radius: 1.6, solid: false, home: ['F71'], homePlace: 'farm',
  hook: th => F.OBJ.trueLine && F.OBJ.trueLine(th, ['hk_fro_plante', 'hk_planter'], { key: 'kjokkenhage', vis: [t => { SFX('grow'); K.sparkle(K.wpos(t, 0.5), 0x8ce99a); return K.sleep(500); }] }),   // v5c WP-W2
  async press(th) {
    SFX('grow');
    F.Things.setState(th, { pulls: (th.state.pulls || 0) + 1 });
    for (let i = 0; i < 6; i++) {
      const c = K.model('tmp_p_gulrot', {}); const x = -1.1 + (i % 3) * 1.1, z = -0.6 + Math.floor(i / 3) * 1.0;
      K.temp(th, c, x, -0.1, z, 3400); K.hop(c, 0.7, 500).then(() => { c.position.y = 0.3; c.rotation.z = (R() - 0.5) * 0.6; });
      SFX('pop'); await K.sleep(160);
    }
  },
});
T('p_stall', {
  name: 'stallen', radius: 2.8, reach: 4.0, home: ['F71'], homePlace: 'farm',
  hook: animalHook('hest', 'neigh', ['mat', 'unge']),
  async press(th) {
    const p = part(th, 'pony'); SFX('neigh'); say('park_bris');
    F.Things.setState(th, { laps: (th.state.laps || 0) + 1 });
    if (p) { const x0 = p.position.x, z0 = p.position.z; await tween(3600, k => { const a = k * Math.PI * 2; p.position.x = x0 + Math.sin(a) * 1.4; p.position.z = z0 + (1 - Math.cos(a)) * 0.6; p.rotation.y = -a; p.position.y = Math.abs(Math.sin(k * Math.PI * 14)) * 0.08; }); p.position.set(x0, 0, z0); p.rotation.y = 0; }
    K.sparkle(K.wpos(th, 1.6), 0xff7fb0);
  },
});
T('p_honsehus', {
  name: 'hønsehuset', radius: 1.7, home: ['F71'], homePlace: 'farm',
  hook: animalHook('høne', 'cluck', ['mat', 'unge']),
  async press(th) {
    const h = part(th, 'hen'); SFX('cluck');
    if (h) await K.hop(h, 0.3, 300).then(() => K.hop(h, 0.3, 300));
    const n = (th.state.eggs || 0) + 1; F.Things.setState(th, { eggs: n });
    const e = K.model('tmp_p_egg', {}); e.scale.setScalar(1.6); K.temp(th, e, -0.6, 0.05, 2.4, 3200); K.hop(e, 0.3, 400);
    if (F.Stall && F.Stall.stock) try { F.Stall.stock('egg', 1); } catch (err) { /* stall not ready */ }
    say('park_egg');
  },
});
// v5c WP-W2 (hook #12, weather deck): the first rainbow of the day comes with «Regnbuen kommer når sola skinner og det regner.»
T('p_spreder', {
  name: 'sprederen', radius: 0.4, solid: false,
  hook: th => F.OBJ.trueLine(th, 'hk_regnbue', { vis: [t => t.def.rainbow(t)] }),
  async press(th) { say('park_spreder'); return th.def.rainbow(th); },
  async rainbow(th) {
    SFX('splash'); F.Things.setState(th, { runs: (th.state.runs || 0) + 1 });
    const arc = new THREE.Group(); const cols = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc];
    cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.6 - i * 0.12, 0.06, 6, 24, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 })); arc.add(m); });
    K.temp(th, arc, 0, 0.3, 0, 3200);
    for (let i = 0; i < 6; i++) { K.burst(K.wpos(th, 0.6), { n: 16, colors: [0x6fcaf0, 0xffffff], speed: 3, up: 3, life: 1, gravity: 6 }); await K.sleep(300); }
  },
});
T('p_lykt', {
  name: 'lykta', radius: 0.35,
  build(th) { return M(th, 'p_lykt', { on: !!th.state.on }); },
  init(th) { if (th.state.on) lampHalo(th, true); else { const lp = part(th, 'lamp'); if (lp && has('p_lykt')) lp.scale.setScalar(0.85); } },
  async press(th) {
    const on = !th.state.on; F.Things.setState(th, { on });
    swapLamp(th, on); SFX(on ? 'pling' : 'click');
    // Stjernefeen lights the next lamps too, one by one
    if (on && F.save.fairy === 'stjerne') {
      const near = F.Things.list.filter(t => t.type === 'p_lykt' && t !== th && !t.state.on && Math.hypot(t.x - th.x, t.z - th.z) < 45).sort((a, b) => Math.hypot(a.x - th.x, a.z - th.z) - Math.hypot(b.x - th.x, b.z - th.z)).slice(0, 3);
      for (const t of near) { await K.sleep(400); F.Things.setState(t, { on: true }); swapLamp(t, true); K.sparkle(K.wpos(t, 2.6), 0xfff6b0); SFX('pling', 4); }
    }
    await K.sleep(400);
  },
});
let haloTex = null;
function lampHalo(th, on) {
  if (!haloTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,246,190,1)'); gr.addColorStop(0.4, 'rgba(255,236,150,.5)'); gr.addColorStop(1, 'rgba(255,236,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c); }
  if (!th._halo) { th._halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); th._halo.scale.setScalar(2.2); const lp = part(th, 'lamp'); const y = lp ? lp.position.y + 0.1 : 2.5; th._halo.position.set(0, y, 0); th.obj.add(th._halo); }
  th._halo.visible = !!on;
}
function swapLamp(th, on) {
  lampHalo(th, on);
  const lp = part(th, 'lamp'); if (!lp) return;
  if (has('p_lykt')) { lp.scale.setScalar(on ? 1.15 : 0.85); return; }
  const fresh = K.model(has('p_lykt') ? 'p_lykt' : 'tmp_p_lykt', { on }); const np = fresh.userData.parts && fresh.userData.parts.lamp;
  if (!np) return;
  while (lp.children.length) lp.remove(lp.children[0]);
  np.children.slice().forEach(c => { lp.add(c); c.userData.thing = th; });
  K.burst(K.wpos(th, 2.5), { n: 10, colors: on ? [0xfff6b0, 0xffffff] : [0xc6a8ff], speed: 0.8, up: 1.2, life: 0.6 });
}
T('p_tomt', {
  name: 'byggetomta', radius: 1.4, solid: false, reach: 2.6,
  init(th) { if (F.Eco && F.Eco.decoratePlot) try { F.Eco.decoratePlot(th); } catch (e) { console.error(e); } },
  tick(th, dt, t) { if (!th._glow) { th._glow = true; } th.obj.children[0] && (th.obj.children[0].position.y = Math.sin(t * 2 + th.x) * 0.02); },
  async press(th) {
    K.sparkle(K.wpos(th, 0.4), 0xffd84a); SFX('sparkle');
    F.Things.setState(th, { taps: (th.state.taps || 0) + 1 });
    if (F.Eco && F.Eco.plotPress) { await F.Eco.plotPress(th); return; }
    say('park_tomt');
  },
});
T('p_tre', {
  name: 'treet', radius: 0.9,
  // v5c WP-W2 (plants deck): the first shake of the day – leaves drift down with «Løvtrær mister bladene om høsten.»
  hook: th => F.OBJ.trueLine && F.OBJ.trueLine(th, (th.data.kind || 'rund') === 'eple' ? ['hk_eple_fro', 'hk_lov_hosten'] : 'hk_lov_hosten', { key: 'p_tre', vis: [t => { const c = part(t, 'crown'); SFX('rustle'); if (c) K.swing(c, 0.08, 900, 'z', 4); K.burst(K.wpos(t, 3.6), { n: 30, colors: [0xe8a33a, 0xd9682b, 0xf2c94c, 0x5ec05c], speed: 1.2, up: 0.5, gravity: 1, life: 2.6, size: 0.09 }); return K.sleep(700); }] }),
  build(th) { return M(th, 'p_tre', { kind: th.data.kind || 'rund' }); },
  async press(th) {
    const c = part(th, 'crown'); SFX('rustle');
    F.Things.setState(th, { shakes: (th.state.shakes || 0) + 1 });
    if (c) K.swing(c, 0.08, 900, 'z', 4);
    const kind = th.data.kind || 'rund';
    if (kind === 'eple') for (let i = 0; i < 4; i++) { const a = K.model('tmp_p_tomat', { c: 'red' }); a.scale.setScalar(1.6); const x = (R() - 0.5) * 2.2, z = (R() - 0.5) * 2.2 + 1; K.temp(th, a, x, 3.4, z, 3600); tween(600 + i * 80, k => { a.position.y = 3.4 - k * k * 3.25; }).then(() => SFX('thud')); }
    else K.burst(K.wpos(th, 3.6), { n: 34, colors: kind === 'kirsebær' ? [0xf6a9c8, 0xffffff, 0xff7fb0] : [0x5ec05c, 0x7fd36b, 0xf6a9c8], speed: 1.4, up: 0.6, gravity: 1.2, life: 2.2, size: 0.08 });
    await K.sleep(900);
  },
});
T('p_blomster', {
  name: 'blomstene', radius: 1.0, solid: false,
  // v5c WP-W2 (hook #2): the butterflies' true sentences («En larve blir til en sommerfugl.» / «Sommerfuglen har seks bein.»)
  hook: th => F.OBJ.animalX && F.OBJ.animalX(th, 'sommerfugl', { vis: { '*': [t => { SFX('chime'); for (let i = 0; i < 3; i++) { const b = K.model('tmp_p_sommerfugl', { c: ['pink', 'butter', 'sky'][i] }); b.scale.setScalar(1.8); K.temp(t, b, 0, 0.4, 0, 3200); const ph = i * 2; tween(3000, k => { b.position.set(Math.cos(k * 8 + ph) * (0.5 + k), 0.4 + k * 2.4, Math.sin(k * 8 + ph) * (0.5 + k)); }); } return K.sleep(600); }] } }),
  async press(th) {
    SFX('chime'); say('park_sommerfugl');
    F.Things.setState(th, { visits: (th.state.visits || 0) + 1 });
    for (let i = 0; i < 5; i++) {
      const b = K.model('tmp_p_sommerfugl', { c: U.pick(R, ['pink', 'butter', 'sky', 'lilac', 'coral']) }); b.scale.setScalar(1.8);
      K.temp(th, b, 0, 0.4, 0, 3600);
      const ph = i * 1.3; tween(3400, k => { b.position.set(Math.cos(k * 9 + ph) * (0.6 + k), 0.4 + k * 3, Math.sin(k * 9 + ph) * (0.6 + k)); b.rotation.z = Math.sin(k * 40) * 0.6; });
    }
    await K.sleep(1200);
  },
});
})();
