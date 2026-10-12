/* Feslottet – castle interactables (WP CASTLE+PARK). DESIGN §7 #1–#85, placed per room (local coords lx 0..14, lz 0..10).
   Models: MODELS-1 ids (DESIGN names: ovn, gryte, piano, c_*) when they exist, else the tmp_* voxel models defined here.
   Part names follow MODELS-1's convention (door/doorL/doorR/shutterL/shutterR/lid/keys/pendulum/hand/wheel...) with fallbacks.
   Every press: squash + a real visible change (parts/state/spawned props) + 1-in-10 surprise (F.Castle.kit). */
(function () {
'use strict';
const F = window.F, U = F.U;
const C = F.Castle, K = C.kit;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const has = id => F.VOX.has(id);
function vdef(id, d) { if (!has(id)) F.VOX.def(id, d); }
const R = () => F.rand();
const say = (id, slots, voice) => K.say(id, slots, voice);
const SFX = (n, ...a) => K.sfx(n, ...a);
const tween = (ms, fn) => F.T.tween(ms, fn);
const part = (th, names) => K.part(th, names);
function M(th, id, opts) { return K.model(has(id) ? id : 'tmp_' + id, Object.assign({}, opts || {}, (th.data && th.data.opts) || {})); }
// v5 WP-W (DESIGN5 §3.1): d.home = formats this thing is the WORLD HOME of (d.homePlace = the place key); a learning thing (d.learn)
// prefers its home formats in learnFirst when one fits her level. natural 11.10. (audit D3 #13/#21/#42): her tap ALWAYS plays the thing;
// a due home / learning thing shows the gold ★ invite note above it (F.OBJ.invite) and only a tap on that note opens the task.
// v5c WP-W2: the default payoff of a home task she solved herself – the thing glows and hearts rise (d.homeAfter overrides)
const homeHearts = th => { SFX('chime'); K.sparkle(K.wpos(th, 1.2), 0xfff2a8); K.burst(K.wpos(th, 1.2), { n: 16, colors: [0xff7fb0, 0xff5d8f, 0xffc8a8], speed: 1.1, up: 2.6, gravity: 1, life: 1.4, size: 0.11 }); return K.wobble(th.obj, 0.06, 600); };
const homeTry = async (th, d) => {
  if (!d.home || d.learn || !(F.OBJ && F.OBJ.home) || (F.Throne && F.Throne.busy)) return false;
  const h = F.OBJ.home(th, d.home, { place: d.homePlace, after: d.homeAfter || homeHearts }); if (!h) return false;
  let res = null; try { res = await h; } catch (e) { console.error('[castle] home', th.type, e); }
  return !!res;
};
// v5c WP-W2 (DESIGN5 §10): d.hook(th) -> Promise | null = an interaction hook (F.OBJ.hook / ask / trueLine / factHook: once a day, never
// during a task or ceremony). It replaces this tap's reaction; a question hook that found no task (null) lets the thing play.
const hookTry = async (th, d) => {
  if (!d.hook || !F.OBJ || !F.OBJ.hook || (F.Throne && F.Throne.busy)) return false;
  let h = null; try { h = d.hook(th); } catch (e) { console.error('[castle] hook', th.type, e); }
  if (!h) return false;
  let r; try { r = await h; } catch (e) { console.error('[castle] hook', th.type, e); }
  return r !== null;
};
function T(type, d) {
  const press = d.press;
  F.Things.def(type, Object.assign({ radius: 0.6, solid: true, space: 'in', surprise: true }, d, {
    build: d.build || (th => M(th, d.model || type, d.opts)),
    press: press ? async th => { th.reactedVisibly = true; if (!d.noPop) K.squash(th.obj); try { if (await hookTry(th, d)) return; if (await homeTry(th, d)) return; await press(th); } catch (e) { console.error(type, e); } if (d.surprise !== false) K.maybeSurprise(th); } : undefined,
  }));
}
// v5c WP-W2: natural counts (F.OBJ.natCount: lo–hi in her lowest band, 10–20 once she works past 20)
const natN = (th, lo, hi) => (F.OBJ && F.OBJ.natCount ? F.OBJ.natCount(th, lo, hi) : lo + Math.floor(R() * (hi - lo + 1)));
const toggle = (th, key) => { const v = !th.state[key]; F.Things.setState(th, { [key]: v }); return v; };
const bump = (th, key) => { const v = (th.state[key] || 0) + 1; F.Things.setState(th, { [key]: v }); return v; };
function tmpItem(id, opts, fb, fbOpts) { return has(id) ? F.VOX.make(id, opts || {}) : K.model(fb, fbOpts || {}); }

/* ====================================================================== tmp models (1/10 furniture, 1/16 props) */
const D = (id, size, scale, build, parts) => vdef(id, { size, scale, build, parts });
// Hallen
D('tmp_c_inngangsdor', [36, 34, 4], 1 / 10, v => { v.box(0, 0, 0, 35, 33, 1, 'stone2'); v.box(3, 0, 1, 32, 29, 1, 0); for (let x = 3; x <= 32; x++) { const top = 29 - Math.round((Math.abs(x - 17.5) / 14.5) ** 2 * 6); v.box(x, top + 1, 1, x, 31, 1, 'gold'); } v.box(16, 30, 2, 19, 33, 2, 'gold'); }, {
  doorL: { pivot: [3, 0, 2], build(v) { v.box(3, 0, 2, 17, 25, 3, 'woodRed'); for (const y of [4, 12, 20]) v.box(4, y, 3, 16, y, 3, 'woodDark'); v.box(15, 11, 3, 16, 13, 3, 'gold'); } },
  doorR: { pivot: [32, 0, 2], build(v) { v.box(18, 0, 2, 32, 25, 3, 'woodRed'); for (const y of [4, 12, 20]) v.box(19, y, 3, 31, y, 3, 'woodDark'); v.box(19, 11, 3, 20, 13, 3, 'gold'); } },
});
D('tmp_c_rustning', [12, 30, 10], 1 / 16 * 1.6, v => { v.box(3, 0, 3, 8, 1, 7, 'stone2'); v.box(4, 2, 4, 5, 9, 6, 'steel'); v.box(6, 2, 4, 7, 9, 6, 'steel'); v.box(3, 10, 3, 8, 18, 7, 'silver'); v.box(1, 11, 4, 2, 17, 6, 'steel'); v.box(9, 11, 4, 10, 17, 6, 'steel'); v.box(4, 13, 7, 7, 15, 7, 'roofBlue'); v.box(4, 19, 4, 7, 23, 7, 'silver'); v.box(5, 24, 5, 6, 26, 6, 'red'); v.box(5, 27, 5, 6, 28, 6, 'pink'); }, {
  visor: { pivot: [5.5, 23, 8], build(v) { v.box(4, 20, 8, 7, 23, 8, 'steel'); v.box(4, 21, 8, 7, 21, 8, 'grey'); } },
});
D('tmp_c_gelender', [10, 26, 30], 1 / 10, v => { for (let s = 0; s < 12; s++) v.box(0, 0, s * 2, 9, s * 2 + 1, s * 2 + 1, s % 2 ? 'stone' : 'stone2'); for (let s = 0; s < 12; s += 2) v.box(9, s * 2 + 2, s * 2, 9, s * 2 + 7, s * 2, 'white'); v.line(9, 8, 0, 9, 30, 25, 'gold'); v.box(0, 0, 0, 9, 24, 0, 0); }, {});
D('tmp_c_portrett', [20, 24, 2], 1 / 10, v => { v.box(0, 0, 0, 19, 23, 1, 'gold'); v.box(2, 2, 1, 17, 21, 1, 'sky'); v.box(2, 2, 1, 17, 6, 1, 'leaf2'); v.box(7, 6, 1, 12, 13, 1, 'red'); v.box(8, 13, 1, 11, 17, 1, 'skin'); v.box(7, 18, 1, 12, 19, 1, 'gold'); v.set(7, 20, 1, 'gold'); v.set(12, 20, 1, 'gold'); v.set(9, 15, 1, 'black'); v.box(14, 3, 1, 16, 5, 1, 'orange'); v.set(15, 6, 1, 'orange'); }, {
  eye: { pivot: [10, 15, 2], build(v) { v.set(10, 15, 2, 'black'); } },
});
D('tmp_c_klokkestreng', [8, 30, 4], 1 / 10, v => { v.box(2, 26, 0, 5, 29, 1, 'gold'); }, { rope: { pivot: [3.5, 26, 2], build(v) { v.box(3, 6, 2, 4, 25, 2, 'red'); v.box(2, 2, 2, 5, 5, 3, 'gold'); v.box(3, 0, 2, 4, 1, 3, 'pink'); } } });
D('tmp_c_loper', [12, 1, 32], 1 / 4, v => {}, { rug: { pivot: [6, 0, 0], build(v) { v.box(0, 0, 0, 11, 0, 31, 'red'); v.box(0, 0, 0, 0, 0, 31, 'gold'); v.box(11, 0, 0, 11, 0, 31, 'gold'); for (let z = 3; z < 31; z += 6) v.set(6, 0, z, 'gold'); } } });
D('tmp_c_palme', [16, 40, 16], 1 / 10, v => { v.cyl(8, 0, 8, 4, 6, 'woodRed'); v.cyl(8, 6, 8, 4.5, 1, 'coral'); v.cyl(8, 6, 8, 3, 1, 'soil'); v.box(7, 7, 7, 8, 24, 8, 'woodLight'); for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; for (let r = 1; r < 7; r++) v.set(Math.round(8 + Math.cos(an) * r), 25 - Math.round(r * r * 0.12), Math.round(8 + Math.sin(an) * r), r % 2 ? 'leaf' : 'leafDark'); } }, {
  bloom: { pivot: [8, 26, 8], build(v) { v.sphere(8, 28, 8, 2.4, 'pink'); v.set(8, 30, 8, 'yellow'); } },
});
D('tmp_c_paraply', [12, 24, 12], 1 / 16 * 1.6, v => { v.cyl(6, 0, 6, 3.5, 8, 'brass' in F.PAL ? 'brass' : 'gold'); v.cyl(6, 1, 6, 2.5, 7, 0); }, { umb: { pivot: [6, 6, 6], build(v) { v.box(6, 6, 6, 6, 18, 6, 'woodDark'); v.box(5, 18, 6, 6, 19, 6, 'woodDark'); v.ellipsoid(6, 13, 6, 2, 5, 2, 'pink'); } } });
D('tmp_c_heis', [28, 22, 6], 1 / 8, v => { v.box(0, 0, 0, 27, 21, 2, 'gold'); v.box(2, 0, 1, 25, 17, 3, 'woodRed'); v.box(3, 0, 0, 24, 16, 1, 'cream2'); v.box(9, 18, 3, 18, 20, 3, 'white'); v.box(0, 21, 0, 27, 21, 3, 'butter'); for (let k = 0; k < 6; k++) v.set(2 + k * 5, 21, 3, 'pink'); }, {
  doorL: { pivot: [3, 0, 3], build(v) { v.box(3, 0, 3, 13, 16, 4, 'gold'); v.box(5, 2, 4, 11, 14, 4, 'butter'); } },
  doorR: { pivot: [24, 0, 3], build(v) { v.box(14, 0, 3, 24, 16, 4, 'gold'); v.box(16, 2, 4, 22, 14, 4, 'butter'); } },
});
// Kjøkkenet
D('tmp_ovn', [16, 18, 12], 1 / 10, v => { v.box(0, 0, 0, 15, 15, 11, 'brick'); v.box(0, 16, 0, 15, 17, 11, 'stone2'); v.box(3, 3, 11, 12, 11, 11, 'stoneDark'); v.box(4, 4, 11, 11, 10, 11, 'black'); v.box(11, 17, 3, 13, 18, 5, 'stone2'); v.paint((x, y, z, c) => c === F.PAL.brick && (y % 3 === 0 || (x + (y / 3 | 0) * 2) % 5 === 0) ? F.PAL.coral : null); }, { door: { pivot: [7.5, 3, 12], build(v) { v.box(3, 3, 12, 12, 10, 12, 'steel'); v.box(5, 9, 12, 10, 9, 12, 'gold'); v.box(5, 5, 12, 10, 7, 12, 'glass'); } } });
D('tmp_gryte', [16, 18, 12], 1 / 10, v => { v.box(0, 0, 0, 15, 8, 11, 'white'); v.box(0, 9, 0, 15, 9, 11, 'steel'); for (const x of [3, 12]) v.box(x - 1, 2, 11, x + 1, 6, 11, 'sky'); v.cyl(7.5, 10, 5.5, 4.5, 6, 'navySoft'); v.cyl(7.5, 11, 5.5, 3.5, 5, 0); v.cyl(7.5, 11, 5.5, 3.5, 4, 'orange'); }, { spoon: { pivot: [7.5, 15, 5.5], build(v) { v.box(9, 12, 6, 9, 20, 6, 'woodLight'); v.box(8, 11, 5, 10, 12, 7, 'woodLight'); } } });
D('tmp_c_krukker', [30, 16, 8], 1 / 10, v => { v.box(0, 0, 0, 29, 1, 7, 'wood'); v.box(0, 2, 0, 0, 3, 7, 'woodDark'); v.box(29, 2, 0, 29, 3, 7, 'woodDark'); }, {
  lid0: { pivot: [3, 9, 4], build(v) { v.cyl(3, 2, 4, 2.5, 7, 'glass'); v.cyl(3, 2, 4, 2, 5, 'cream'); v.cyl(3, 9, 4, 2.6, 1, 'red'); } },
  lid1: { pivot: [9, 9, 4], build(v) { v.cyl(9, 2, 4, 2.5, 7, 'glass'); v.cyl(9, 2, 4, 2, 5, 'white'); v.cyl(9, 9, 4, 2.6, 1, 'sky'); } },
  lid2: { pivot: [15, 9, 4], build(v) { v.cyl(15, 2, 4, 2.5, 7, 'glass'); v.cyl(15, 2, 4, 2, 5, 'cream2'); v.cyl(15, 9, 4, 2.6, 1, 'leaf'); } },
  lid3: { pivot: [21, 9, 4], build(v) { v.cyl(21, 2, 4, 2.5, 7, 'glass'); v.cyl(21, 2, 4, 2, 5, 'white'); v.cyl(21, 9, 4, 2.6, 1, 'pink'); } },
  lid4: { pivot: [27, 9, 4], build(v) { v.cyl(27, 2, 4, 2, 7, 'glass'); v.cyl(27, 2, 4, 1.5, 5, 'woodLight'); v.cyl(27, 9, 4, 2.1, 1, 'gold'); } },
});
D('tmp_c_kran', [12, 22, 10], 1 / 10, v => { v.box(0, 0, 0, 11, 8, 9, 'white'); v.box(0, 9, 0, 11, 9, 9, 'steel'); v.box(2, 9, 2, 9, 9, 8, 0); v.box(2, 8, 2, 9, 8, 8, 'sky'); v.box(5, 10, 1, 6, 16, 2, 'silver'); v.box(5, 16, 2, 6, 16, 5, 'silver'); v.box(4, 12, 7, 7, 15, 8, 'glass'); }, { handle: { pivot: [5.5, 17, 1.5], build(v) { v.box(4, 17, 1, 7, 17, 2, 'red'); } } });
D('tmp_kjele', [10, 12, 10], 1 / 16 * 1.4, v => { v.cyl(5, 0, 5, 4, 6, 'red'); v.cyl(5, 6, 5, 3, 1, 'red'); v.box(9, 3, 5, 10, 5, 5, 'red'); v.box(2, 9, 5, 8, 9, 5, 'woodDark'); v.box(2, 7, 5, 2, 9, 5, 'woodDark'); v.box(8, 7, 5, 8, 9, 5, 'woodDark'); }, { lid: { pivot: [5, 7, 5], build(v) { v.cyl(5, 7, 5, 2, 1, 'red'); v.set(5, 8, 5, 'gold'); } } });
D('tmp_c_eggkartong', [18, 6, 8], 1 / 16, v => { v.box(0, 0, 0, 17, 1, 7, 'woodLight'); for (let i = 0; i < 10; i++) { const x = 1 + (i % 5) * 3 + (i % 5 >= 5 ? 1 : 0), z = 1 + Math.floor(i / 5) * 3; v.box(x, 2, z, x + 1, 3, z + 1, 'cream'); v.set(x, 4, z, 'cream'); } }, {});
D('tmp_c_melsekk', [10, 14, 8], 1 / 10, v => { v.box(1, 0, 1, 8, 9, 6, 'cream2'); v.box(2, 10, 2, 7, 11, 5, 'cream2'); v.box(3, 12, 3, 6, 13, 4, 'woodLight'); v.box(3, 4, 7, 6, 6, 7, 'woodLight'); }, {});
D('tmp_c_deig', [14, 4, 10], 1 / 16, v => { v.box(0, 0, 0, 13, 0, 9, 'woodLight'); v.ellipsoid(6.5, 1, 5, 4, 1, 3, 'cream'); }, { pin: { pivot: [7, 2, 5], build(v) { v.box(1, 2, 5, 12, 2, 5, 'wood'); v.box(0, 2, 5, 0, 2, 5, 'woodDark'); v.box(13, 2, 5, 13, 2, 5, 'woodDark'); } } });
D('tmp_c_kakeboks', [10, 10, 10], 1 / 16, v => { v.cyl(5, 0, 5, 4.5, 6, 'sky'); v.cyl(5, 2, 5, 4.6, 1, 'white'); }, { lid: { pivot: [5, 6, 5], build(v) { v.cyl(5, 6, 5, 4.7, 1, 'roofBlue'); v.set(5, 7, 5, 'gold'); } } });
D('tmp_c_brodkurv', [14, 8, 10], 1 / 16, v => { v.box(0, 0, 0, 13, 3, 9, 'woodLight'); v.box(1, 1, 1, 12, 3, 8, 0); v.box(1, 1, 1, 12, 1, 8, 'hay'); }, {
  loaf0: { pivot: [4, 2, 5], build(v) { v.ellipsoid(4, 3, 5, 2.5, 1.6, 3.4, 'honey'); } },
  loaf1: { pivot: [9, 2, 5], build(v) { v.ellipsoid(9, 3, 5, 2.5, 1.6, 3.4, 'woodRed'); } },
});
D('tmp_kbord', [26, 9, 14], 1 / 10, v => { v.box(0, 8, 0, 25, 8, 13, 'woodLight'); for (const [x, z] of [[1, 1], [23, 1], [1, 11], [23, 11]]) v.box(x, 0, z, x + 1, 7, z + 1, 'wood'); v.box(0, 8, 13, 25, 8, 13, 'wood'); }, {});
// Spisesalen
D('tmp_c_langbord', [50, 12, 18], 1 / 10, v => { v.box(0, 7, 2, 49, 7, 15, 'woodRed'); v.box(0, 8, 3, 49, 8, 14, 'white'); v.box(0, 8, 8, 49, 8, 9, 'pink'); for (const x of [2, 46]) for (const z of [3, 13]) v.box(x, 0, z, x + 1, 6, z + 1, 'woodDark'); for (let x = 5; x < 48; x += 8) { v.box(x, 0, 0, x + 3, 4, 1, 'woodRed'); v.box(x, 5, 0, x + 3, 10, 0, 'woodRed'); v.box(x, 0, 16, x + 3, 4, 17, 'woodRed'); v.box(x, 5, 17, x + 3, 10, 17, 'woodRed'); } }, {});
D('tmp_c_lysestake', [10, 14, 4], 1 / 16 * 1.4, v => { v.box(4, 0, 1, 5, 1, 2, 'gold'); v.box(4, 2, 1, 5, 6, 2, 'gold'); v.box(0, 6, 1, 9, 6, 2, 'gold'); for (const x of [0, 3, 6, 9]) v.box(x, 7, 1, x, 10, 1, 'cream'); }, { flames: { pivot: [5, 11, 1], build(v) { for (const x of [0, 3, 6, 9]) { v.set(x, 11, 1, 'flame'); v.set(x, 12, 1, 'lamp'); } } } });
D('tmp_c_avis', [12, 2, 9], 1 / 16, v => { v.box(0, 0, 0, 11, 0, 8, 'white'); v.box(1, 1, 1, 10, 1, 2, 'navySoft'); for (let z = 4; z < 8; z++) v.box(1, 1, z, 5, 1, z, z % 2 ? 'grey' : 'silver'); v.box(7, 1, 4, 10, 1, 7, 'sky'); }, {});
D('tmp_tekanne', [12, 10, 8], 1 / 16, v => { v.ellipsoid(6, 4, 4, 4, 4, 3.5, 'white'); v.paint((x, y, z, c) => (y === 4 || ((x + y) % 4 === 0 && y > 1 && y < 7)) && c === F.PAL.white ? F.PAL.pink : null); v.line(10, 3, 4, 11, 7, 4, 'white'); v.box(1, 3, 4, 1, 6, 4, 'white'); }, { lid: { pivot: [6, 8, 4], build(v) { v.box(4, 8, 3, 8, 8, 5, 'white'); v.set(6, 9, 4, 'gold'); } } });
D('tmp_c_gjokur', [12, 20, 6], 1 / 10, v => { v.box(1, 6, 0, 10, 14, 4, 'woodRed'); for (let k = 0; k < 4; k++) v.box(k, 15 + k, 0, 11 - k, 15 + k, 5, 'woodDark'); v.cyl(5.5, 8, 5, 3, 1, 0); for (let y = 6; y <= 14; y++) for (let x = 2; x <= 9; x++) if (Math.hypot(x - 5.5, y - 9.5) < 3) v.set(x, y, 5, 'cream'); v.set(5, 10, 5, 'black'); v.box(5, 9, 5, 5, 11, 5, 'black'); v.box(4, 13, 5, 7, 13, 5, 'woodDark'); }, {
  bird: { pivot: [5.5, 13, 5], build(v) { v.box(5, 13, 5, 6, 14, 6, 'butter'); v.set(5, 14, 7, 'orange'); } },
  pendulum: { pivot: [5.5, 6, 2], build(v) { v.box(5, 0, 2, 5, 5, 2, 'gold'); v.box(4, 0, 2, 6, 1, 2, 'gold'); } },
});
D('tmp_c_fruktfat', [12, 7, 12], 1 / 16, v => { v.cyl(6, 0, 6, 3, 1, 'silver'); v.cyl(6, 1, 6, 5.5, 1, 'silver'); v.cyl(6, 2, 6, 6, 1, 'silver'); }, { fruit: { pivot: [6, 2, 6], build(v) { v.sphere(4, 4, 5, 2, 'red'); v.sphere(8, 4, 6, 2, 'green'); v.sphere(6, 4, 8, 1.8, 'orange'); v.sphere(6, 6, 6, 1.8, 'red'); v.set(6, 8, 6, 'woodDark'); } } });
D('tmp_c_serviett', [8, 6, 8], 1 / 16, v => { v.box(0, 0, 0, 7, 0, 7, 'white'); }, { nap: { pivot: [4, 1, 4], build(v) { v.box(1, 1, 1, 6, 1, 6, 'pink'); v.box(2, 2, 2, 5, 2, 5, 'pink'); v.box(3, 3, 3, 4, 4, 4, 'blossom'); } } });
// Tronsalen
D('tmp_c_trone', [24, 34, 14], 1 / 10, v => { v.box(0, 0, 0, 23, 2, 13, 'red'); v.box(1, 3, 1, 22, 9, 12, 'gold'); v.box(3, 10, 3, 20, 11, 12, 'roofRed'); v.box(2, 10, 1, 21, 30, 3, 'gold'); v.box(4, 12, 3, 19, 28, 3, 'roofRed'); for (const x of [2, 20]) v.box(x, 10, 3, x + 1, 16, 12, 'gold'); for (let k = 0; k < 3; k++) { v.box(4 + k * 6, 31, 1, 6 + k * 6, 33, 3, 'gold'); v.set(5 + k * 6, 33, 3, k === 1 ? 'gem1' : 'gem2'); } v.box(10, 22, 4, 13, 25, 4, 'gold'); }, {
  cushion: { pivot: [11.5, 12, 7], build(v) { v.box(5, 12, 4, 18, 13, 11, 'pink'); v.set(5, 13, 4, 'gold'); v.set(18, 13, 11, 'gold'); } },
});
D('tmp_krone', [12, 14, 12], 1 / 16 * 1.2, v => { v.box(2, 0, 2, 9, 4, 9, 'stone2'); v.box(1, 5, 1, 10, 6, 10, 'red'); }, { crown: { pivot: [5.5, 7, 5.5], build(v) { v.cyl(5.5, 7, 5.5, 3.5, 2, 'gold'); v.cyl(5.5, 8, 5.5, 2.6, 1, 0); for (let a = 0; a < 5; a++) { const an = a / 5 * Math.PI * 2; v.box(Math.round(5.5 + Math.cos(an) * 3), 9, Math.round(5.5 + Math.sin(an) * 3), Math.round(5.5 + Math.cos(an) * 3), 10, Math.round(5.5 + Math.sin(an) * 3), 'gold'); } v.set(5, 8, 9, 'gem1'); v.set(9, 8, 5, 'gem2'); } } });
D('tmp_c_lysekrone', [20, 14, 20], 1 / 10, v => { v.box(10, 9, 10, 10, 13, 10, 'gold'); }, { body: { pivot: [10, 13, 10], build(v) { v.box(10, 5, 10, 10, 9, 10, 'gold'); for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; const x = Math.round(10 + Math.cos(an) * 7), z = Math.round(10 + Math.sin(an) * 7); v.line(10, 5, 10, x, 4, z, 'gold'); v.set(x, 5, z, 'cream'); v.set(x, 6, z, 'flame'); v.set(Math.round(10 + Math.cos(an) * 4), 3, Math.round(10 + Math.sin(an) * 4), 'crystal'); } v.cyl(10, 4, 10, 2, 1, 'gold'); v.set(10, 2, 10, 'crystal'); v.set(10, 1, 10, 'crystal'); } } });
D('tmp_c_fanfare', [14, 30, 8], 1 / 10, v => { v.box(6, 0, 3, 7, 26, 4, 'woodDark'); v.box(3, 0, 1, 10, 1, 6, 'woodDark'); }, {
  banner: { pivot: [7, 26, 4], build(v) { v.box(1, 13, 4, 12, 25, 4, 'roofLilac'); v.box(2, 14, 4, 11, 14, 4, 'gold'); for (let x = 1; x < 13; x += 2) v.set(x, 12, 4, 'gold'); v.box(6, 18, 4, 7, 21, 4, 'butter'); } },
  horn: { pivot: [7, 24, 5], build(v) { v.box(7, 24, 5, 13, 24, 5, 'gold'); v.box(13, 23, 5, 13, 25, 5, 'gold'); v.box(13, 23, 4, 13, 25, 6, 'gold'); } },
});
D('tmp_c_vindu', [16, 22, 3], 1 / 10, v => { v.box(0, 0, 0, 15, 21, 0, 'white'); v.box(1, 1, 0, 14, 19, 0, 'glass'); }, {
  shutterL: { pivot: [0, 0, 2], build(v) { v.box(0, 0, 2, 7, 20, 2, 'sky'); v.box(1, 2, 2, 6, 3, 2, 'white'); v.box(1, 17, 2, 6, 18, 2, 'white'); } },
  shutterR: { pivot: [15, 0, 2], build(v) { v.box(8, 0, 2, 15, 20, 2, 'sky'); v.box(9, 2, 2, 14, 3, 2, 'white'); v.box(9, 17, 2, 14, 18, 2, 'white'); } },
});
D('tmp_c_gullbjelle', [12, 24, 10], 1 / 10, v => { v.box(1, 0, 3, 10, 1, 6, 'woodDark'); v.box(1, 2, 4, 2, 20, 5, 'woodDark'); v.box(9, 2, 4, 10, 20, 5, 'woodDark'); v.box(1, 21, 4, 10, 22, 5, 'woodRed'); }, { bell: { pivot: [5.5, 20, 4.5], build(v) { v.cone(5.5, 12, 4.5, 4, 8, 'gold'); v.box(5, 11, 4, 6, 11, 5, 'honey'); v.box(5, 20, 4, 6, 20, 5, 'gold'); } } });
// Ballsalen
D('tmp_c_glitterkule', [12, 16, 12], 1 / 10, v => { v.box(6, 12, 6, 6, 15, 6, 'silver'); }, { ball: { pivot: [6, 12, 6], build(v) { v.sphere(6, 6, 6, 5, 'silver'); v.paint((x, y, z, c) => F.U.hash2(x * 3 + z, y, 2) < 0.35 ? F.PAL.crystal : (F.U.hash2(x + z * 7, y, 3) < 0.15 ? F.PAL.pink : null)); } } });
D('tmp_c_grammofon', [14, 22, 14], 1 / 16 * 1.6, v => { v.box(1, 0, 1, 12, 5, 12, 'woodRed'); v.cyl(6.5, 6, 6.5, 5, 1, 'black'); v.set(6, 7, 6, 'red'); v.line(10, 6, 10, 9, 14, 6, 'gold'); }, { horn: { pivot: [9, 14, 6], build(v) { v.cone(9, 14, 6, 2, 6, 'gold'); v.cyl(9, 19, 6, 5, 1, 'gold'); v.cyl(9, 19, 6, 4, 1, 0); } } });
D('tmp_c_dansegulv', [16, 1, 16], 1 / 4, v => {}, { tiles: { pivot: [8, 0, 8], build(v) { for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) v.set(x, 0, z, ((x >> 2) + (z >> 2)) & 1 ? 'pink' : 'white'); } } });
D('tmp_harpe', [10, 30, 16], 1 / 10, v => { v.box(3, 0, 3, 6, 1, 12, 'gold'); v.line(4, 1, 12, 4, 27, 12, 'gold'); v.line(5, 1, 12, 5, 27, 12, 'gold'); v.line(4, 27, 12, 4, 22, 2, 'gold'); v.line(4, 2, 4, 4, 22, 2, 'gold'); for (let z = 4; z < 12; z++) v.line(4, 2 + (z - 4), z, 4, 26 - Math.round(Math.abs(z - 7)), z, 'white'); }, {});
D('tmp_c_spilledase', [10, 6, 8], 1 / 16 * 1.4, v => { v.box(0, 0, 0, 9, 4, 7, 'pink'); v.box(0, 4, 0, 9, 4, 7, 'gold'); }, { lid: { pivot: [5, 5, 0], build(v) { v.box(0, 5, 0, 9, 5, 7, 'blossom'); } }, ballerina: { pivot: [5, 5, 4], build(v) { v.box(5, 5, 4, 5, 8, 4, 'skin'); v.box(3, 7, 3, 7, 7, 5, 'white'); v.set(5, 9, 4, 'hairBlond'); } } });
D('tmp_tromme', [14, 14, 14], 1 / 10, v => { v.cyl(7, 0, 7, 6, 9, 'red'); v.cyl(7, 9, 7, 6, 1, 'white'); v.cyl(7, 0, 7, 6.3, 1, 'gold'); v.cyl(7, 8, 7, 6.3, 1, 'gold'); for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; v.line(Math.round(7 + Math.cos(an) * 6), 1, Math.round(7 + Math.sin(an) * 6), Math.round(7 + Math.cos(an + 0.4) * 6), 7, Math.round(7 + Math.sin(an + 0.4) * 6), 'white'); } }, {});
// Biblioteket
D('tmp_c_bokhylle', [40, 32, 10], 1 / 10, v => { v.box(0, 0, 0, 39, 31, 1, 'woodDark'); v.box(0, 0, 0, 1, 31, 9, 'woodDark'); v.box(38, 0, 0, 39, 31, 9, 'woodDark'); for (const y of [0, 8, 16, 24, 31]) v.box(0, y, 0, 39, y, 9, 'wood'); const BC = ['red', 'sky', 'mint', 'butter', 'lilac', 'coral', 'teal', 'pink', 'navySoft']; for (const y of [1, 9, 17, 25]) for (let x = 2; x < 38;) { const w = 1 + (F.U.hash2(x, y, 1) * 2 | 0), h = 4 + (F.U.hash2(x, y, 2) * 3 | 0); v.box(x, y, 2, x + w - 1, y + h, 8, BC[(x * 7 + y) % BC.length]); x += w + (F.U.hash2(x, y, 5) < 0.12 ? 1 : 0); } v.box(16, 32, 3, 23, 32, 6, 'gold'); }, {
  book: { pivot: [20, 10, 9], build(v) { v.box(19, 9, 3, 21, 14, 9, 'gold'); v.box(20, 10, 9, 20, 13, 9, 'red'); } },
});
D('tmp_c_globus', [12, 20, 12], 1 / 10, v => { v.cyl(6, 0, 6, 4, 1, 'woodDark'); v.box(6, 1, 6, 6, 6, 6, 'woodDark'); v.line(6, 6, 2, 6, 18, 6, 'gold'); }, { globe: { pivot: [6, 12, 6], build(v) { v.sphere(6, 12, 6, 5, 'sky'); v.paint((x, y, z, c) => F.U.noise2(x * 0.5, y * 0.5 + z * 0.3, 4) > 0.55 ? F.PAL.leaf2 : (y > 15 ? F.PAL.white : null)); } } });
D('tmp_c_stige', [10, 32, 6], 1 / 10, v => {}, { ladder: { pivot: [5, 0, 3], build(v) { v.box(1, 0, 3, 1, 31, 3, 'woodLight'); v.box(8, 0, 3, 8, 31, 3, 'woodLight'); for (let y = 3; y < 31; y += 4) v.box(2, y, 3, 7, y, 3, 'wood'); v.box(1, 0, 2, 1, 0, 4, 'grey'); v.box(8, 0, 2, 8, 0, 4, 'grey'); } } });
D('tmp_c_lesestol', [16, 18, 16], 1 / 10, v => { v.box(1, 0, 1, 14, 5, 14, 'teal'); v.box(1, 6, 1, 14, 16, 4, 'teal'); v.box(1, 6, 1, 3, 10, 14, 'teal'); v.box(12, 6, 1, 14, 10, 14, 'teal'); v.box(4, 6, 4, 11, 7, 13, 'mint'); v.box(3, 0, 13, 4, 0, 14, 'woodDark'); }, { book: { pivot: [8, 8, 9], build(v) { v.box(5, 8, 7, 10, 8, 11, 'white'); v.box(5, 8, 7, 5, 9, 11, 'red'); } } });
D('tmp_lampe', [8, 26, 8], 1 / 10, v => { v.cyl(4, 0, 4, 3, 1, 'gold'); v.box(4, 1, 4, 4, 18, 4, 'gold'); }, { shade: { pivot: [4, 19, 4], build(v, o) { v.cone(4, 18, 4, 3.6, 6, o.on ? 'lamp' : 'butter'); v.set(4, 18, 4, 'flame'); } } });
D('tmp_c_skrivepult', [18, 22, 10], 1 / 10, v => { v.box(0, 8, 0, 17, 9, 9, 'woodRed'); for (const [x, z] of [[0, 0], [16, 0], [0, 8], [16, 8]]) v.box(x, 0, z, x + 1, 7, z + 1, 'woodDark'); v.box(0, 10, 0, 17, 15, 1, 'woodRed'); v.box(3, 10, 4, 10, 10, 8, 'white'); v.box(13, 10, 4, 14, 12, 5, 'navySoft'); }, { quill: { pivot: [8, 11, 6], build(v) { v.line(8, 11, 6, 11, 17, 6, 'white'); v.box(11, 15, 6, 12, 18, 6, 'pink'); } } });
// Musikkrommet
D('tmp_piano', [30, 22, 14], 1 / 10, v => { v.box(0, 0, 0, 29, 20, 5, 'navySoft'); v.box(0, 9, 5, 29, 10, 11, 'navySoft'); v.box(1, 0, 6, 2, 8, 9, 'navySoft'); v.box(27, 0, 6, 28, 8, 9, 'navySoft'); v.box(10, 14, 6, 19, 18, 6, 'cream'); v.box(0, 21, 0, 29, 21, 5, 'gold'); }, { keys: { pivot: [15, 11, 9], build(v) { for (let x = 1; x < 29; x++) v.box(x, 11, 7, x, 11, 11, (x % 2) ? 'white' : 'milk'); for (let x = 2; x < 28; x++) if ([0, 1, 3, 4, 5].includes(x % 7)) v.box(x, 12, 7, x, 12, 9, 'black'); } } });
D('tmp_c_xylofon', [28, 10, 12], 1 / 10, v => { v.box(1, 0, 2, 26, 1, 3, 'woodDark'); v.box(1, 0, 8, 26, 1, 9, 'woodDark'); for (const x of [1, 25]) v.box(x, 2, 2, x + 1, 4, 9, 'woodDark'); }, (() => { const p = {}; const CS = ['red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'lilac', 'purple', 'pink', 'rose']; for (let i = 0; i < 11; i++) p['bar' + i] = { pivot: [2 + i * 2.2, 5, 5.5], build(v) { const x = Math.round(2 + i * 2.2), h = 10 - Math.round(i * 0.45); v.box(x, 5, 6 - h / 2 | 0, x + 1, 5, (6 + h / 2) | 0, CS[i]); } }; return p; })());
D('tmp_floyte', [8, 20, 8], 1 / 16 * 1.6, v => { v.box(3, 0, 3, 4, 1, 4, 'woodDark'); v.box(3, 2, 3, 3, 10, 3, 'woodDark'); }, { flute: { pivot: [3, 11, 3], build(v) { v.line(0, 11, 3, 7, 18, 3, 'silver'); for (let k = 1; k < 6; k++) v.set(k + 1, 12 + k, 4, 'navySoft'); } } });
D('tmp_c_trommesett', [24, 18, 16], 1 / 10, v => { v.cyl(12, 0, 8, 6, 8, 'red'); v.cyl(12, 8, 8, 6, 1, 'white'); v.cyl(4, 0, 12, 3, 9, 'navySoft'); v.cyl(4, 9, 12, 3, 1, 'white'); v.box(20, 0, 6, 20, 14, 6, 'silver'); }, {
  cymbal: { pivot: [20, 14, 6], build(v) { v.cyl(20, 14, 6, 4, 1, 'gold'); } },
  tom: { pivot: [12, 10, 8], build(v) { v.cyl(16, 10, 6, 2.5, 4, 'sky'); v.cyl(16, 14, 6, 2.5, 1, 'white'); v.cyl(8, 10, 6, 2.5, 4, 'sky'); v.cyl(8, 14, 6, 2.5, 1, 'white'); } },
});
D('tmp_c_notestativ', [10, 26, 6], 1 / 10, v => { v.box(4, 0, 2, 5, 16, 3, 'silver'); v.box(2, 0, 2, 7, 0, 3, 'silver'); v.box(0, 16, 2, 9, 24, 3, 'woodDark'); v.box(1, 17, 3, 8, 23, 3, 'white'); for (const y of [18, 20, 22]) v.box(1, y, 3, 8, y, 3, 'grey'); }, {});
// Skattkammeret
D('tmp_c_myntverk', [18, 24, 12], 1 / 10, v => { v.box(1, 0, 1, 16, 14, 10, 'teal'); v.box(1, 15, 1, 16, 15, 10, 'gold'); v.box(4, 16, 3, 13, 22, 8, 'glass'); v.box(3, 4, 11, 14, 10, 11, 'navySoft'); v.box(7, 1, 11, 10, 3, 12, 'gold'); for (let k = 0; k < 10; k++) v.set(5 + (k % 5) * 2, 6 + Math.floor(k / 5) * 2, 12, 'gold'); }, { wheel: { pivot: [16.5, 9, 5.5], build(v) { for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; v.line(17, 9, 5, 17, Math.round(9 + Math.cos(an) * 4), Math.round(5.5 + Math.sin(an) * 4), 'gold'); } } } });
D('tmp_c_kiste', [16, 14, 12], 1 / 10, v => { v.box(0, 0, 0, 15, 7, 11, 'woodRed'); for (const x of [1, 14]) v.box(x, 0, 0, x, 7, 11, 'gold'); v.box(6, 3, 11, 9, 6, 12, 'gold'); v.set(7, 4, 12, 'navySoft'); }, { lid: { pivot: [8, 8, 0], build(v) { v.box(0, 8, 0, 15, 11, 11, 'woodRed'); v.box(0, 12, 2, 15, 12, 9, 'woodRed'); for (const x of [1, 14]) v.box(x, 8, 0, x, 12, 11, 'gold'); } } });
D('tmp_c_myntstabel', [16, 12, 12], 1 / 16 * 1.6, v => { v.box(0, 0, 0, 15, 0, 11, 'woodDark'); }, {});
D('tmp_c_sparebosser', [26, 16, 10], 1 / 10, v => { v.box(0, 0, 0, 25, 6, 9, 'woodRed'); v.box(0, 7, 0, 25, 7, 9, 'gold'); for (const [x, c] of [[4, 'pink'], [13, 'sky'], [21, 'butter']]) { v.ellipsoid(x, 11, 5, 3.5, 3.2, 3, c); v.set(x, 14, 5, 'black'); v.box(x - 1, 10, 8, x + 1, 11, 8, c === 'pink' ? 'rose' : 'white'); v.box(x - 2, 8, 4, x - 2, 8, 6, c); v.box(x + 2, 8, 4, x + 2, 8, 6, c); } }, {});
D('tmp_c_juvelskrin', [12, 8, 10], 1 / 16 * 1.6, v => { v.box(0, 0, 0, 11, 4, 9, 'plum'); v.box(0, 4, 0, 11, 4, 9, 'gold'); v.box(2, 5, 2, 9, 5, 7, 'gem1'); v.set(3, 5, 3, 'gem2'); v.set(8, 5, 6, 'gem3'); }, { lid: { pivot: [6, 5, 0], build(v) { v.box(0, 5, 0, 11, 7, 9, 'plum'); v.box(5, 7, 4, 6, 8, 5, 'gem1'); } } });
// Ordmuseet
D('tmp_c_sokkel', [8, 9, 8], 1 / 10, v => { v.box(0, 0, 0, 7, 1, 7, 'stone2'); v.box(1, 2, 1, 6, 7, 6, 'cream2'); v.box(0, 8, 0, 7, 8, 7, 'gold'); }, {});
D('tmp_c_ordbok', [14, 16, 12], 1 / 10, v => { v.box(5, 0, 4, 8, 9, 7, 'woodDark'); v.box(2, 0, 2, 11, 0, 9, 'woodDark'); v.box(1, 10, 2, 12, 11, 10, 'woodRed'); }, { page: { pivot: [6.5, 12, 6], build(v) { v.box(1, 12, 2, 12, 12, 10, 'cream'); v.box(6, 12, 2, 7, 12, 10, 'woodLight'); for (let z = 4; z < 9; z += 2) { v.box(2, 12, z, 5, 12, z, 'grey'); v.box(8, 12, z, 11, 12, z, 'grey'); } } } });
// Prinsessens rom
D('tmp_c_miaseng', [22, 20, 34], 1 / 10, v => { v.box(0, 0, 0, 21, 4, 33, 'white'); v.box(1, 5, 1, 20, 6, 32, 'pink'); v.box(0, 5, 0, 21, 18, 2, 'white'); for (let x = 2; x < 20; x += 4) v.set(x, 17, 2, 'pink'); v.box(9, 15, 2, 12, 18, 2, 'blossom'); v.box(0, 5, 33, 21, 9, 33, 'white'); v.box(1, 7, 14, 20, 7, 32, 'lilac'); }, { pillows: { pivot: [11, 8, 6], build(v) { v.box(3, 7, 3, 9, 9, 8, 'white'); v.box(12, 7, 3, 18, 9, 8, 'blossom'); } } });
D('tmp_c_dukkehus', [20, 22, 12], 1 / 10, v => { v.box(0, 0, 0, 19, 13, 9, 'cream2'); for (let k = 0; k < 7; k++) v.box(k, 14 + k, 0, 19 - k, 14 + k, 10, 'roofPink'); for (const [x, y] of [[2, 2], [11, 2], [2, 8], [11, 8]]) { v.box(x, y, 9, x + 6, y + 4, 9, ['butter', 'mint', 'sky', 'blossom'][(x + y) % 4]); v.box(x + 2, y, 8, x + 4, y + 2, 8, 'woodRed'); } }, {});
D('tmp_c_gyngehest', [8, 18, 22], 1 / 10, v => {}, { horse: { pivot: [4, 0, 11], build(v) { for (let z = 1; z < 21; z++) { const y = Math.round(((z - 11) / 10) ** 2 * 3); v.box(1, y, z, 1, y, z, 'woodRed'); v.box(6, y, z, 6, y, z, 'woodRed'); } v.box(1, 3, 6, 6, 4, 16, 'woodRed'); for (const z of [6, 15]) { v.box(2, 4, z, 2, 8, z, 'woodLight'); v.box(5, 4, z, 5, 8, z, 'woodLight'); } v.box(2, 8, 5, 5, 11, 16, 'white'); v.box(2, 11, 14, 5, 16, 17, 'white'); v.box(2, 14, 17, 5, 16, 20, 'white'); v.box(2, 12, 13, 5, 16, 13, 'pink'); v.box(2, 12, 4, 5, 13, 5, 'pink'); v.set(1, 15, 18, 'black'); v.set(6, 15, 18, 'black'); v.box(2, 12, 9, 5, 12, 11, 'red'); } } });
D('tmp_c_lekekiste', [16, 12, 10], 1 / 10, v => { v.box(0, 0, 0, 15, 7, 9, 'sky'); for (let x = 1; x < 15; x += 3) v.box(x, 2, 9, x + 1, 5, 9, ['pink', 'butter', 'mint', 'lilac', 'coral'][(x / 3) | 0]); }, { lid: { pivot: [8, 8, 0], build(v) { v.box(0, 8, 0, 15, 9, 9, 'roofBlue'); v.box(6, 8, 9, 9, 8, 10, 'gold'); } } });
D('tmp_bamse', [10, 12, 8], 1 / 16 * 1.6, v => { v.ellipsoid(5, 3.5, 4, 3.5, 3.5, 3, 'honey'); v.sphere(5, 8.5, 4, 2.8, 'honey'); v.box(2, 10, 3, 3, 11, 4, 'honey'); v.box(7, 10, 3, 8, 11, 4, 'honey'); v.set(4, 9, 7, 'black'); v.set(6, 9, 7, 'black'); v.box(4, 7, 6, 6, 7, 7, 'woodLight'); v.set(5, 7, 7, 'black'); v.box(3, 5, 7, 7, 5, 7, 'red'); }, {});
D('tmp_c_gardin', [18, 26, 3], 1 / 10, v => { v.box(0, 24, 1, 17, 24, 1, 'gold'); }, { shutterL: { pivot: [0, 24, 2], build(v) { for (let x = 0; x < 8; x++) v.box(x, 2, 2, x, 23, 2, x % 2 ? 'pink' : 'blossom'); } }, shutterR: { pivot: [17, 24, 2], build(v) { for (let x = 10; x < 18; x++) v.box(x, 2, 2, x, 23, 2, x % 2 ? 'pink' : 'blossom'); } } });
D('tmp_c_miatavle', [18, 22, 4], 1 / 10, v => { v.box(1, 0, 1, 2, 20, 2, 'woodLight'); v.box(15, 0, 1, 16, 20, 2, 'woodLight'); v.box(0, 7, 2, 17, 20, 2, 'woodDark'); v.box(1, 8, 3, 16, 19, 3, 'leafDark'); v.box(3, 9, 3, 6, 9, 3, 'white'); v.box(2, 7, 3, 16, 7, 3, 'woodLight'); }, {});
D('tmp_c_akvarium', [18, 16, 10], 1 / 10, v => { v.box(0, 0, 0, 17, 5, 9, 'woodLight'); v.box(0, 6, 0, 17, 15, 9, 'glass'); v.box(1, 6, 1, 16, 13, 8, 'water'); v.box(1, 6, 1, 16, 6, 8, 'sand'); v.box(3, 7, 3, 3, 11, 3, 'leaf'); v.box(14, 7, 6, 14, 10, 6, 'leaf'); }, { fish: { pivot: [9, 10, 5], build(v) { v.box(5, 10, 5, 7, 11, 5, 'orange'); v.set(4, 10, 5, 'orange'); v.box(11, 8, 4, 12, 9, 4, 'gold'); v.set(13, 9, 4, 'gold'); } } });
// Kongeparets soverom
D('tmp_c_himmelseng', [34, 32, 30], 1 / 10, v => { v.box(0, 0, 0, 33, 6, 29, 'woodRed'); v.box(1, 7, 1, 32, 8, 28, 'navySoft'); v.box(1, 8, 12, 32, 9, 28, 'sky'); for (const [x, z] of [[0, 0], [32, 0], [0, 28], [32, 28]]) v.box(x, 0, z, x + 1, 30, z + 1, 'gold'); v.box(0, 31, 0, 33, 31, 29, 'lavender'); for (let x = 0; x < 34; x += 2) { v.box(x, 26, 0, x, 30, 0, 'lavender'); v.box(x, 26, 29, x, 30, 29, 'lavender'); } v.box(0, 7, 0, 33, 20, 1, 'woodRed'); v.box(12, 16, 1, 21, 19, 1, 'gold'); }, { pillows: { pivot: [17, 9, 5], build(v) { v.box(3, 9, 3, 14, 11, 9, 'white'); v.box(19, 9, 3, 30, 11, 9, 'white'); } } });
D('tmp_c_tofler', [10, 4, 8], 1 / 16, v => {}, { left: { pivot: [2.5, 0, 4], build(v) { v.box(1, 0, 1, 3, 2, 7, 'red'); v.set(2, 3, 6, 'white'); } }, right: { pivot: [7.5, 0, 4], build(v) { v.box(6, 0, 1, 8, 2, 7, 'red'); v.set(7, 3, 6, 'white'); } } });
D('tmp_c_vugge', [16, 18, 12], 1 / 10, v => {}, { cradle: { pivot: [8, 0, 6], build(v) { for (let x = 1; x < 15; x++) { const y = Math.round(((x - 8) / 7) ** 2 * 2); v.box(x, y, 2, x, y, 2, 'woodLight'); v.box(x, y, 9, x, y, 9, 'woodLight'); } v.box(2, 2, 2, 13, 8, 9, 'cream'); v.box(3, 4, 3, 12, 8, 8, 0); v.box(3, 4, 3, 12, 5, 8, 'sky'); v.box(3, 6, 4, 6, 7, 7, 'skin'); v.box(7, 6, 3, 12, 6, 8, 'blossom'); v.box(1, 2, 1, 2, 12, 2, 'woodLight'); v.box(1, 10, 2, 2, 12, 9, 'pink'); } } });
D('tmp_c_stjernelampe', [10, 16, 10], 1 / 10, v => { v.cyl(5, 0, 5, 3, 1, 'navySoft'); v.box(5, 1, 5, 5, 8, 5, 'gold'); }, { star: { pivot: [5, 11, 5], build(v) { v.sphere(5, 11, 5, 3.4, 'butter'); for (const [dx, dy] of [[0, 4], [4, 0], [-4, 0], [0, -3], [3, 3], [-3, 3]]) v.set(5 + dx, 11 + dy, 5, 'glowYellow'); } } });
D('tmp_c_kongeskap', [20, 34, 10], 1 / 10, v => { v.box(0, 0, 0, 19, 31, 9, 'woodRed'); v.box(0, 32, 0, 19, 33, 9, 'gold'); v.box(1, 1, 1, 18, 30, 8, 0); v.box(1, 26, 4, 18, 26, 4, 'gold'); for (let x = 2; x < 18; x += 4) v.box(x, 13, 3, x + 2, 25, 6, ['red', 'roofBlue', 'plum', 'gold'][(x / 4) | 0]); }, {
  doorL: { pivot: [0, 0, 9.5], build(v) { v.box(0, 0, 9, 9, 31, 9, 'woodRed'); v.box(2, 3, 10, 7, 28, 10, 'woodDark'); v.set(8, 15, 10, 'gold'); } },
  doorR: { pivot: [20, 0, 9.5], build(v) { v.box(10, 0, 9, 19, 31, 9, 'woodRed'); v.box(12, 3, 10, 17, 28, 10, 'woodDark'); v.set(11, 15, 10, 'gold'); } },
});
// Badet
D('tmp_c_badekar', [34, 12, 18], 1 / 10, v => { v.box(1, 2, 1, 32, 9, 16, 'white'); v.box(3, 3, 3, 30, 9, 14, 0); for (const [x, z] of [[1, 1], [31, 1], [1, 15], [31, 15]]) { v.box(x, 0, z, x + 1, 1, z + 1, 'gold'); } v.box(31, 10, 7, 32, 12, 8, 'silver'); }, { water: { pivot: [17, 3, 9], build(v) { v.box(3, 3, 3, 30, 6, 14, 'water'); v.box(3, 7, 3, 30, 7, 14, 'white'); } } });
D('tmp_c_sape', [10, 8, 8], 1 / 16 * 1.4, v => { v.box(1, 0, 1, 8, 4, 6, 'woodLight'); }, { soap: { pivot: [4.5, 5, 3.5], build(v) { v.box(2, 5, 2, 7, 6, 5, 'pink'); } } });
D('tmp_speil', [14, 22, 2], 1 / 10, v => { for (let y = 0; y < 22; y++) for (let x = 0; x < 14; x++) { const d = ((x - 6.5) / 7) ** 2 + ((y - 10.5) / 11) ** 2; if (d <= 1) v.set(x, y, 0, d > 0.72 ? 'gold' : 'ice'); } }, { fog: { pivot: [7, 11, 1], build(v) { for (let y = 3; y < 19; y++) for (let x = 2; x < 12; x++) if (((x - 6.5) / 5.2) ** 2 + ((y - 10.5) / 8.4) ** 2 <= 1) v.set(x, y, 1, 'white'); for (const [x, y] of [[5, 13], [8, 13], [4, 12], [9, 12], [4, 11], [9, 11], [5, 10], [8, 10], [6, 9], [7, 9], [6, 12], [7, 12]]) v.set(x, y, 1, 'pink'); } } });
D('tmp_c_gummiand', [8, 8, 10], 1 / 16 * 1.6, v => { v.ellipsoid(4, 2.5, 4, 3.5, 2.5, 4, 'yellow'); v.sphere(4, 6, 7, 2.2, 'yellow'); v.box(3, 5, 9, 5, 6, 10, 'orange'); v.set(3, 7, 9, 'black'); v.set(5, 7, 9, 'black'); }, {});
D('tmp_c_vask', [14, 14, 10], 1 / 10, v => { v.box(5, 0, 3, 8, 7, 6, 'white'); v.box(0, 8, 0, 13, 10, 9, 'white'); v.box(2, 9, 2, 11, 10, 8, 0); v.box(2, 9, 2, 11, 9, 8, 'sky'); v.box(6, 11, 0, 7, 13, 1, 'silver'); v.box(6, 13, 1, 7, 13, 3, 'silver'); }, {});
// Garderoben
D('tmp_c_kjolestativ', [34, 30, 8], 1 / 10, v => { v.box(1, 0, 2, 2, 28, 3, 'gold'); v.box(31, 0, 2, 32, 28, 3, 'gold'); v.box(1, 28, 2, 32, 29, 3, 'gold'); v.box(0, 0, 0, 3, 0, 5, 'gold'); v.box(30, 0, 0, 33, 0, 5, 'gold'); }, { dresses: { pivot: [16, 28, 3], build(v) { const C = ['pink', 'sky', 'butter', 'lilac', 'mint', 'coral']; for (let i = 0; i < 6; i++) { const x = 5 + i * 4; v.box(x, 26, 3, x, 27, 3, 'silver'); v.cone(x, 12, 3, 2.6, 14, C[i]); v.box(x - 1, 22, 2, x + 1, 25, 4, C[i]); } } } });
D('tmp_c_hattehylle', [24, 14, 8], 1 / 10, v => { v.box(0, 0, 0, 23, 1, 7, 'woodLight'); v.box(0, 0, 0, 23, 13, 0, 'woodLight'); }, { h0: { pivot: [4, 2, 4], build(v) { v.cyl(4, 2, 4, 3.5, 1, 'pink'); v.cyl(4, 3, 4, 2, 3, 'pink'); v.set(4, 6, 4, 'gold'); } }, h1: { pivot: [12, 2, 4], build(v) { v.cyl(12, 2, 4, 3.6, 1, 'navySoft'); v.cyl(12, 3, 4, 2.2, 5, 'navySoft'); v.cyl(12, 4, 4, 2.3, 1, 'red'); } }, h2: { pivot: [20, 2, 4], build(v) { v.cone(20, 2, 4, 3, 9, 'lilac'); v.set(20, 11, 4, 'butter'); } } });
D('tmp_c_skohylle', [20, 14, 8], 1 / 10, v => { v.box(0, 0, 0, 19, 13, 0, 'woodLight'); for (const y of [0, 7]) v.box(0, y, 0, 19, y, 7, 'woodLight'); v.box(0, 0, 0, 0, 13, 7, 'woodLight'); v.box(19, 0, 0, 19, 13, 7, 'woodLight'); }, { shoes: { pivot: [10, 1, 4], build(v) { for (let i = 0; i < 4; i++) { const x = 2 + i * 4, c = ['red', 'pink', 'sky', 'gold'][i]; v.box(x, 1, 2, x + 2, 2, 6, c); v.box(x, 8, 2, x + 2, 9, 6, ['butter', 'mint', 'lilac', 'white'][i]); } } } });
D('tmp_c_fespeil', [16, 30, 6], 1 / 10, v => { v.box(2, 0, 2, 13, 1, 4, 'gold'); for (let y = 2; y < 30; y++) for (let x = 0; x < 16; x++) { const d = ((x - 7.5) / 8) ** 2 + ((y - 15.5) / 14) ** 2; if (d <= 1) v.set(x, y, 3, d > 0.75 ? 'lilac' : 'crystal'); } for (const [x, y] of [[2, 26], [13, 26], [7, 29], [1, 10], [14, 10]]) v.set(x, y, 4, 'butter'); }, {});
D('tmp_c_symaskin', [14, 12, 8], 1 / 10, v => { v.box(0, 0, 1, 13, 1, 6, 'white'); v.box(1, 2, 2, 3, 9, 5, 'pink'); v.box(1, 9, 2, 11, 10, 5, 'pink'); v.box(10, 5, 3, 11, 8, 4, 'silver'); }, { wheel: { pivot: [2, 6, 0.5], build(v) { v.box(1, 4, 0, 3, 8, 0, 'gold'); v.box(0, 5, 0, 4, 7, 0, 'gold'); } } });
// Fetårnet + Stjernetårnet
D('tmp_c_tarnvindu', [24, 28, 3], 1 / 10, v => { for (let y = 0; y < 28; y++) for (let x = 0; x < 24; x++) { const top = y > 16 ? ((x - 11.5) / 12) ** 2 + ((y - 16) / 11) ** 2 <= 1 : true; if (!top) continue; const edge = x < 1 || x > 22 || y < 1 || (y > 16 && ((x - 11.5) / 11) ** 2 + ((y - 16) / 10) ** 2 > 1); v.set(x, y, 0, edge ? 'gold' : ((x === 11 || x === 12 || y === 14) ? 'white' : 'glass')); } }, {});
D('tmp_c_sparegris', [14, 12, 10], 1 / 10, v => { v.ellipsoid(7, 6, 5, 6, 5, 4.5, 'pink'); for (const [x, z] of [[3, 2], [11, 2], [3, 8], [11, 8]]) v.box(x, 0, z, x, 2, z, 'pink'); v.box(5, 11, 4, 9, 11, 6, 'rose'); v.box(6, 11, 5, 8, 11, 5, 'black'); v.box(12, 5, 4, 13, 7, 6, 'rose'); v.set(13, 6, 4, 'black'); v.set(13, 6, 6, 'black'); v.set(11, 8, 2, 'black'); v.set(11, 8, 8, 'black'); v.box(9, 9, 1, 10, 11, 2, 'rose'); v.box(9, 9, 8, 10, 11, 9, 'rose'); }, {});
D('tmp_c_dyrekurv', [16, 8, 12], 1 / 10, v => { v.box(0, 0, 0, 15, 5, 11, 'woodLight'); v.box(1, 1, 1, 14, 5, 10, 0); v.box(1, 1, 1, 14, 2, 10, 'lilac'); for (let x = 0; x < 16; x += 2) v.set(x, 5, 0, 'wood'); }, {});
D('tmp_c_teleskop', [12, 24, 12], 1 / 10, v => { for (const [x, z] of [[2, 2], [10, 2], [6, 10]]) v.line(x, 0, z, 6, 12, 6, 'woodDark'); }, { tube: { pivot: [6, 13, 6], build(v) { v.line(3, 10, 2, 9, 18, 10, 'gold'); v.line(4, 10, 2, 10, 18, 10, 'gold'); v.line(3, 11, 2, 9, 19, 10, 'navySoft'); v.box(9, 18, 10, 10, 20, 11, 'gold'); } } });
D('tmp_c_kartbord', [24, 12, 16], 1 / 10, v => { v.box(0, 8, 0, 23, 9, 15, 'woodRed'); for (const [x, z] of [[1, 1], [21, 1], [1, 13], [21, 13]]) v.box(x, 0, z, x + 1, 7, z + 1, 'woodDark'); v.box(2, 10, 2, 21, 10, 13, 'cream'); v.box(4, 10, 4, 9, 10, 8, 'leaf2'); v.box(13, 10, 7, 18, 10, 11, 'sky'); v.box(10, 10, 5, 12, 10, 7, 'pink'); }, {});
D('tmp_c_stjernebilde', [26, 20, 2], 1 / 10, v => { v.box(0, 0, 0, 25, 19, 0, 'navySoft'); v.box(0, 0, 0, 25, 0, 0, 'gold'); v.box(0, 19, 0, 25, 19, 0, 'gold'); v.box(0, 0, 0, 0, 19, 0, 'gold'); v.box(25, 0, 0, 25, 19, 0, 'gold'); }, {});
D('tmp_c_slot', [12, 2, 12], 1 / 10, v => { for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) if (x === 0 || z === 0 || x === 11 || z === 11) { if ((x + z) % 3 !== 0) v.set(x, 0, z, 'lilac'); } v.set(5, 0, 5, 'butter'); v.set(6, 0, 6, 'butter'); v.set(5, 0, 6, 'butter'); v.set(6, 0, 5, 'butter'); }, {});
D('tmp_star', [5, 5, 2], 1 / 12, v => { v.box(2, 0, 0, 2, 4, 1, 'glowYellow'); v.box(0, 2, 0, 4, 2, 1, 'glowYellow'); v.set(1, 1, 0, 'butter'); v.set(3, 3, 0, 'butter'); v.set(1, 3, 0, 'butter'); v.set(3, 1, 0, 'butter'); });
D('tmp_coin', [5, 1, 5], 1 / 12, v => { v.cyl(2, 0, 2, 2.2, 1, 'gold'); v.set(2, 0, 2, 'honey'); });
D('tmp_coin10', [7, 2, 7], 1 / 12, v => { v.cyl(3, 0, 3, 3.3, 2, 'gold'); v.set(3, 1, 3, 'honey'); v.set(2, 1, 3, 'honey'); });
D('tmp_bolle', [5, 3, 5], 1 / 12, v => { v.ellipsoid(2, 1, 2, 2.2, 1.6, 2.2, 'honey'); v.set(2, 2, 2, 'cream'); });
D('tmp_kjeks', [5, 2, 5], 1 / 12, v => { v.cyl(2, 0, 2, 2.2, 1, 'honey'); v.set(1, 1, 2, 'woodDark'); v.set(3, 1, 1, 'woodDark'); });
D('tmp_heart', [7, 6, 2], 1 / 12, v => { for (const [x, y] of [[1, 4], [2, 5], [4, 5], [5, 4], [3, 4]]) v.set(x, y, 0, 'pink'); v.box(0, 2, 0, 6, 4, 1, 'pink'); v.box(1, 1, 0, 5, 1, 1, 'pink'); v.set(3, 0, 0, 'pink'); v.set(1, 5, 0, 'pink'); v.set(5, 5, 0, 'pink'); });
D('tmp_feather', [3, 5, 1], 1 / 14, v => { v.box(1, 0, 0, 1, 4, 0, 'white'); v.set(0, 2, 0, 'white'); v.set(2, 3, 0, 'white'); });
D('tmp_note', [5, 8, 2], 1 / 12, (v, o) => { const c = o.c || 'navySoft'; v.box(3, 2, 0, 3, 7, 0, c); v.box(1, 0, 0, 3, 2, 0, c); v.box(3, 7, 0, 4, 6, 0, c); });
D('tmp_bubble', [5, 5, 5], 1 / 10, v => { v.sphere(2, 2, 2, 2.2, 'glass'); v.set(1, 3, 1, 'white'); });
D('tmp_dove', [6, 5, 7], 1 / 12, v => { v.ellipsoid(3, 2, 3, 2.2, 2, 3, 'white'); v.set(3, 3, 6, 'orange'); v.set(2, 3, 5, 'black'); v.set(4, 3, 5, 'black'); v.box(0, 2, 2, 0, 3, 4, 'silver'); v.box(6, 2, 2, 6, 3, 4, 'silver'); });
D('tmp_chick', [5, 5, 5], 1 / 12, v => { v.sphere(2, 2, 2, 2, 'yellow'); v.set(2, 2, 4, 'orange'); v.set(1, 3, 4, 'black'); v.set(3, 3, 4, 'black'); });
D('tmp_letterblk', [4, 4, 4], 1 / 10, (v, o) => { v.box(0, 0, 0, 3, 3, 3, o.c || 'butter'); });
D('tmp_ribbon', [16, 2, 2], 1 / 12, v => { for (let x = 0; x < 16; x++) v.set(x, Math.round(Math.sin(x / 2) * 0.6 + 0.6), 0, x % 4 < 2 ? 'pink' : 'lilac'); });
D('tmp_mouse', [8, 6, 10], 1 / 16, v => { v.ellipsoid(4, 2, 4, 3, 2, 3.5, 'grey'); v.sphere(4, 3, 8, 1.6, 'grey'); v.set(3, 5, 8, 'pink'); v.set(5, 5, 8, 'pink'); v.set(4, 3, 9, 'pink'); });
D('tmp_cat', [8, 8, 12], 1 / 16 * 1.2, v => { v.ellipsoid(4, 3, 5, 3, 2.6, 4.5, 'orange'); v.sphere(4, 5, 10, 2.4, 'orange'); v.set(3, 8, 10, 'orange'); v.set(5, 8, 10, 'orange'); v.set(3, 6, 12, 'black'); v.set(5, 6, 12, 'black'); v.box(4, 3, 0, 4, 6, 0, 'orange'); v.paint((x, y, z, c) => (z % 3 === 0 && c === F.PAL.orange) ? F.PAL.cream : null); });
D('tmp_dog', [8, 9, 12], 1 / 16 * 1.3, v => { v.ellipsoid(4, 3, 5, 3, 2.6, 4.5, 'woodLight'); v.sphere(4, 6, 10, 2.5, 'woodLight'); v.box(1, 6, 9, 1, 8, 11, 'woodDark'); v.box(7, 6, 9, 7, 8, 11, 'woodDark'); v.set(3, 7, 12, 'black'); v.set(5, 7, 12, 'black'); v.set(4, 6, 12, 'black'); });
D('tmp_cloud', [12, 6, 8], 1 / 12, v => { v.ellipsoid(4, 3, 4, 3.5, 2.5, 3, 'white'); v.ellipsoid(8, 3, 4, 3.5, 2.8, 3, 'white'); v.ellipsoid(6, 4, 4, 3, 2, 3, 'white'); });

/* ====================================================================== helpers */
const scn = () => F.R.inScene;
// v3 WP3 §8.6: world words in the castle are «try first, then hear it» (WP5 F.UI.tryRead: 1st tap sounds out, 2nd tap the whole word);
// fallback without tryRead: the label only (never read aloud before she tried)
function wordTpl(w) {
  w = String(w || '').toLowerCase();
  if (F.TPL.has('word_' + w)) return { tpl: 'word_' + w, slots: {} };
  if (F.TPL.has('rw_word') && F.SETS.get && F.SETS.get('WORDS').includes(w)) return { tpl: 'rw_word', slots: { w } };
  // v5 WP-W (DESIGN4 §5 v3 leftover): shelf / box labels (klær, møbler, mel, salt …) use the label clips
  if (F.TPL.has('rw_label') && Array.isArray(F.SETS.LABEL_WORDS) && F.SETS.LABEL_WORDS.includes(w)) return { tpl: 'rw_label', slots: { w } };
  return { tpl: null, slots: {} };
}
function tryWord(lab, w, o) {
  if (!lab || !F.UI.tryRead) return null;
  const t = (o && o.tpl) ? o : wordTpl(w);
  try { return F.UI.tryRead(lab, w, Object.assign({ maxDist: 10 }, o || {}, { tpl: t.tpl, slots: t.slots })); } catch (e) { console.error('[castle] tryRead', e); return null; }
}
// v3 WP3 §8.4 (P2): a learning-tagged castle thing has its real task once a day; the payoff is the thing's own reaction, which now
// comes true because she did the work (the buns rise after she counted the dough balls …). natural 11.10. (audit D3): the tap never
// springs it – learnFirst shows the gold ★ invite note (F.OBJ.invite) and returns false (the thing plays); the note opens the task.
const lastItem = () => (F.Task && F.Task.lastResult && F.Task.lastResult.item) || {};
async function learnFirst(th, payoff) {
  const hm = th.def.home && F.OBJ && F.OBJ.homeFits ? F.OBJ.homeFits(th.def.home, th.def.homePlace) : null;   // v5: its new format when it fits
  const fm = hm || th.def.learn; if (!fm || !fm.length || (th.state.taskDay === (F.save.day || 1))) return false;
  if (!(F.BEH && F.BEH.learnOrPlay && F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask() && F.Task && F.Task.offer && !F.Task.current)) return false;
  if (F.Throne && F.Throne.busy) return false;
  if (!F.OBJ || !F.OBJ.invite) return false;      // (as before: once a day per thing, no 90 s gap – the note only follows her own tap)
  F.OBJ.invite(th, { key: 'learn:' + th.type, open: async t => {
    if (t.state.taskDay === (F.save.day || 1) || !(F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask())) return null;
    F.Things.setState(t, { taskDay: F.save.day || 1 });
    return F.BEH.learnOrPlay(t, fm, [['nosurprise']], payoff ? async u => { await payoff(u, lastItem()); } : null);
  } });
  return false;
}
const placeTpl = p => (F.TPL.has('hud_place') && F.SETS.get && F.SETS.get('PLACES').includes(p)) ? { tpl: 'hud_place', slots: { place: p } } : { tpl: null, slots: {} };
function spawnTemp(th, id, fb, opts, x, y, z, ttl, s) { const m = tmpItem(id, opts, fb, opts); if (s) m.scale.setScalar(s); return K.temp(th, m, x, y, z, ttl || 3000); }
async function rise(th, id, fb, n, o) {        // n items pop up in rows of ten (+rest), counted when n ≥ 10
  o = o || {};
  return K.row(th, () => { const m = tmpItem(id, o.opts || {}, fb, o.opts || {}); if (o.s) m.scale.setScalar(o.s); return m; }, n, { y: o.y || 1.4, z: o.z || 0.4, sp: o.sp || 0.24, count: n >= 10, ms: o.ms || 120, ttl: o.ttl || 3400, s: o.s || 1 });
}
function doorSwing(th, a, b, ang, ms) { const L = part(th, a), Rr = part(th, b); return Promise.all([L ? K.rotTo(L, 'y', -ang, ms) : null, Rr ? K.rotTo(Rr, 'y', ang, ms) : null]); }
const hearts = (th, n, dy) => K.burst(K.wpos(th, dy || 1.2), { n: n || 14, colors: [0xff7fb0, 0xff5d8f, 0xffc8a8], speed: 1, up: 2.6, gravity: 1, life: 1.5, size: 0.11 });
const notes = (th, n, dy) => { for (let i = 0; i < (n || 4); i++) { const m = K.model('tmp_note', { c: U.pick(R, ['navySoft', 'plum', 'roofBlue', 'rose']) }); m.scale.setScalar(1.5); const x = (R() - 0.5) * 0.8; K.temp(th, m, x, dy || 1.2, 0.3, 1900); const ph = R() * 6; F.T.tween(1800, k => { m.position.y = (dy || 1.2) + k * 1.6; m.position.x = x + Math.sin(k * 8 + ph) * 0.25; }); } };

/* ====================================================================== HALLEN */
T('c_inngangsdor', {
  name: 'den store døra', radius: 1.4, reach: 2.6, solid: false, surprise: false,
  async press(th) {
    SFX('door');
    await doorSwing(th, 'doorL', 'doorR', 1.2, 500);
    await C.walkOut();
    const L = part(th, 'doorL'), Rr = part(th, 'doorR'); if (L) L.rotation.y = 0; if (Rr) Rr.rotation.y = 0;
  },
});
T('c_heis', {
  name: 'heisen', radius: 1.4, reach: 2.6, surprise: false, noPop: true,
  init(th) { th.labelY = 2.9; },
  async press(th) {
    SFX('bell', 1318);
    F.Things.setState(th, { rides: (th.state.rides || 0) + 1 });
    await C.lift.open(C.lift.task || undefined);
  },
});
T('c_rustning', {
  name: 'rustningen', radius: 0.5,
  // v5c WP-W2 (ORD Or-U): the little mouse in the armour – «Vi sier: stille som en mus!» + its meaning (once a day)
  hook: th => F.OBJ.wordHook && F.OBJ.wordHook(th, 'mus', { act: [async t => { const v = part(t, ['visor', 'lid']); if (v) await K.rotTo(v, 'x', -1.3, 400);
    const mp = part(t, 'mus'); if (mp) { const z0 = mp.position.z; await tween(300, k => { mp.position.z = z0 + 0.12 * k; }); await K.sleep(2400); mp.position.z = z0; }
    else { const m = spawnTemp(t, 'mus', 'tmp_mouse', {}, 0, 1.55, 0.35, 3000, 1.2); await K.hop(m, 0.1, 300); }
    if (v) K.rotTo(v, 'x', 0, 400); }] }),
  async press(th) {
    const v = part(th, ['visor', 'lid']); SFX('creak'); say('castle_rustning');
    if (v) await K.rotTo(v, 'x', -1.3, 400);
    const mp = part(th, 'mus');
    if (mp) { SFX('squeak'); const z0 = mp.position.z; await tween(300, k => { mp.position.z = z0 + 0.12 * k; }); await tween(900, k => { mp.rotation.z = Math.sin(k * Math.PI * 4) * 0.4; }); mp.position.z = z0; }
    else { const m = spawnTemp(th, 'mus', 'tmp_mouse', {}, 0, 1.55, 0.35, 2600, 1.2); SFX('squeak'); await K.hop(m, 0.18, 300); K.wobble(m, 0.4, 900); }
    bump(th, 'peeks');
    await K.sleep(1400); if (v) K.rotTo(v, 'x', 0, 400);
  },
});
T('c_gelender', {
  name: 'gelenderet', radius: 0.9,
  // tight pick box (input caches th._lb): the default 1.3x rotate-invariant box of the 4 m staircase covered the
  // Spisesalen doorway and floor, so taps meant to walk there slid down the railing instead
  init(th) { th._lb = { c: new THREE.Vector3(0, 1.2, 0), hx: 0.85, hy: 1.2 }; },
  async press(th) {
    SFX('whoosh'); say('castle_rekkverk'); bump(th, 'slides');
    const av = F.Player.avatar; const P = F.Player; const sx = P.pos.x, sz = P.pos.z;
    if (av) await tween(900, k => { av.position.y = Math.sin(k * Math.PI) * 1.4; av.rotation.z = Math.sin(k * Math.PI) * 0.4; });
    if (av) { av.position.y = 0; av.rotation.z = 0; }
    K.burst(K.wpos(th, 0.5), { n: 18, colors: [0xffd84a, 0xffffff], speed: 1.5, up: 2 });
    const kn = part(th, 'knopp'); if (kn) K.spin(kn, 2, 900);
    void sx; void sz;
    // in the stair hall this little staircase looks like «the stairs»: after the slide she takes the real spiral up
    if (F.Bld && F.Bld.canStairs && F.Bld.canStairs('up') && F.Bld.roomKey === th.room) F.T.timeout(() => { if (!F.Player.frozen) F.Bld.stairs('up'); }, 150);
  },
});
T('c_portrett', {
  name: 'portrettet', radius: 0.4, solid: false,
  async press(th) {
    const e = part(th, 'eye'); bump(th, 'winks');
    say('castle_portrett'); SFX('squeak');
    if (e) await tween(600, k => { e.scale.y = 1 - Math.sin(k * Math.PI) * 0.85; });
    const kt = part(th, 'katt'); if (kt && (th.state.winks % 5 === 0)) await tween(900, k => { kt.scale.y = 1 + Math.sin(k * Math.PI) * 0.3; kt.rotation.z = Math.sin(k * Math.PI) * 0.2; });
    await K.wobble(th.obj, 0.06, 600);
  },
});
T('c_klokkestreng', {
  name: 'klokkestrengen', radius: 0.3, solid: false,
  async press(th) {
    const r = part(th, 'rope'); const n = 3 + ((th.state.pulls || 0) % 6); bump(th, 'pulls');   // v5 WP-W (DESIGN4 §8): natural 3–8 rings, not v1's 10–13
    if (r) K.hop(r, -0.15, 400);
    const bl = part(th, 'bell');
    const lab = F.UI.label(V3(th.x, th.y + 3.4, th.z + 0.4), '1', { kind: 'num', space: 'in' });
    for (let i = 1; i <= n; i++) { lab.set(String(i)); SFX('bell', 880 + (i % 3) * 110); if (bl) K.swing(bl, 0.5, 250, 'z', 1); await K.sleep(260); }
    await K.sleep(300); F.T.timeout(() => lab.remove(), 1400);   // natural 11.10.: the label is the count, no number aloud
  },
});
T('c_loper', {
  name: 'løperen', radius: 0.6, solid: false, noPop: true,
  async press(th) {
    const r = part(th, 'rug'); SFX('swish'); bump(th, 'rolls');
    const ru = part(th, 'rull'), L = 6.2;
    const set = s2 => { if (r) r.scale.z = s2; if (ru) { ru.position.z = -(1 - s2) * L; ru.rotation.x = (1 - s2) * 12; } };
    await tween(700, k => set(1 - k * 0.94)); await K.sleep(300); await tween(800, k => set(0.06 + k * 0.94)); set(1);
  },
});
T('c_palme', {
  name: 'palmen', radius: 0.6,
  init(th) { const b = part(th, 'bloom'); if (b) b.scale.setScalar(th.state.big ? 3.5 : 1); },
  async press(th) {
    const b = part(th, 'bloom'); const big = toggle(th, 'big'); SFX('grow');
    const bl = part(th, 'blader'); if (bl) K.swing(bl, 0.15, 1200, 'z', 2);
    if (b) await K.scaleTo(b, big ? 3.5 : 1, 600);
    if (big) { await K.sleep(300); SFX('sparkle'); say('castle_palme'); K.burst(K.wpos(th, 2.8), { n: 30, colors: [0xffd84a, 0xff7fb0, 0xffffff], speed: 2, up: 3, life: 1.2 }); }
  },
});
T('c_paraply', {
  name: 'paraplyen', radius: 0.4,
  async press(th) {
    const u = part(th, 'umb'); SFX('pop'); bump(th, 'spins');
    if (u) { await tween(350, k => u.scale.setScalar(0.4 + 0.75 * K.ease.back(k))); u.scale.setScalar(1); await K.spin(u, 2, 1200); }
    if (R() < 0.3) { const c = K.model('tmp_cloud', {}); c.scale.setScalar(1.4); K.temp(th, c, 0, 2.4, 0, 2400); for (let i = 0; i < 6; i++) F.T.timeout(() => K.burst(K.wpos(th, 2.2), { n: 6, colors: [0x6fcaf0], speed: 0.2, up: -1, life: 0.6 }), i * 250); }
  },
});

/* ====================================================================== KJØKKENET (10) */
T('ovn', {
  name: 'ovnen', radius: 0.9, learn: ['F10'], home: ['F48'], homePlace: 'bakeri',
  async press(th) { if (await learnFirst(th, (t, it) => t.def.playFx(t, it.target))) return; return th.def.playFx(th); },
  async playFx(th, nn) {
    const d = part(th, ['door', 'dor']); SFX('door'); bump(th, 'bakes');
    if (d) await K.rotTo(d, 'x', 1.4, 450);
    const n = (nn >= 1 && nn <= 20) ? nn : natN(th, 4, 12);      // the buns she counted (else a natural tray – v5c WP-W2: not v1's 10–16)
    await rise(th, 'bolle', 'tmp_bolle', n, { y: 1.9, z: 0.9, s: 1.2, sp: 0.2 });
    await K.sleep(900); if (d) K.rotTo(d, 'x', 0, 450);
  },
});
T('gryte', {
  name: 'gryta', radius: 0.9,
  tick(th, dt, t) { if (th.busy) return; },
  async press(th) {
    const s = part(th, ['spoon', 'sleiv']); SFX('pour');
    const cols = [[0xff9a3c, 0xffd84a], [0x9fe6c4, 0x5ec05c], [0xc6a8ff, 0xff7fb0], [0x9ad6ff, 0xffffff]];
    const k = bump(th, 'stirs') % cols.length;
    if (s) K.spin(s, 3, 1800);
    const lid = part(th, 'lid'); if (lid) K.hop(lid, 0.12, 300);
    for (let i = 0; i < 5; i++) { K.burst(K.wpos(th, 1.7), { n: 8, colors: cols[k], speed: 0.4, up: 1.4, gravity: -0.4, life: 1.4, size: 0.1 }); await K.sleep(300); }
    if (R() < 0.15) { const l = K.model('tmp_letterblk', { c: 'butter' }); K.temp(th, l, 0, 1.8, 0, 2000); K.hop(l, 0.8, 700); }
  },
});
T('c_krukker', {
  name: 'krukkene', radius: 1.2, learn: ['F24'],
  // the jar words are reading targets: the tapped jar shows its word (never spoken first)
  async press(th) { if (await learnFirst(th, (t, it) => t.def.playFx(t, it.word))) return; return th.def.playFx(th); },
  async playFx(th, word) {
    const W = ['mel', 'salt', 'ris', 'sukker', 'te'];
    const i = bump(th, 'opens') % 5; const lid = part(th, 'lid' + i);
    if (word) W[i] = String(word);              // after F24: the jar shows the label she just read
    SFX('pop');
    th.obj.updateMatrixWorld(true);
    const lw = lid ? lid.getWorldPosition(new THREE.Vector3()) : V3(th.x - 1.2 + i * 0.6, th.y + 1.9, th.z + 0.3);
    if (lid) K.hop(lid, 0.3, 380);
    K.burst(lw, { n: 16, colors: [[0xfff3dc], [0xffffff], [0xf7ead0], [0xffffff], [0x7c5230]][i], speed: 0.7, up: 1.6, life: 1, size: 0.06 });
    if (th._lab) th._lab.remove();
    const lab = th._lab = F.UI.label(lw.clone().add(V3(0, 0.55, 0.3)), W[i], { kind: 'word', space: 'in' });
    const tr = tryWord(lab, W[i]);
    F.T.timeout(() => { if (th._lab === lab) { if (tr) tr.remove(); lab.remove(); th._lab = null; } }, 8000);
    await K.sleep(500);
  },
});
T('c_kran', {
  name: 'krana', radius: 0.6,
  async press(th) {
    const h = part(th, 'handle'); SFX('pour'); bump(th, 'taps');
    if (h) K.rotTo(h, 'y', 1.4, 300);
    for (let i = 0; i < 8; i++) { K.burst(K.wpos(th, 1.55).add(V3(0, 0, 0.25)), { n: 5, colors: [0x6fcaf0, 0xffffff], speed: 0.1, up: -0.5, gravity: 6, life: 0.5, size: 0.05 }); await K.sleep(150); }
    const va = part(th, 'vann');
    if (va) { await tween(600, k => { va.scale.y = 1 + k; }); await K.sleep(900); await tween(500, k => { va.scale.y = 2 - k; }); }
    else { const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.22), new THREE.MeshLambertMaterial({ color: 0x6fcaf0 })); K.temp(th, w, 0, 1.22, 0.75, 2600); await tween(600, k => { w.scale.y = 1 + k * 18; w.position.y = 1.22 + k * 0.09; }); }
    if (h) K.rotTo(h, 'y', 0, 300);
  },
});
const steam = t => { SFX('tone', 1500, 1.2, 'sine', 0.06, 0, 1900); for (let i = 0; i < 6; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.25); K.temp(t, b, (R() - 0.5) * 0.3, 0.6, 0, 1500); const ph = R() * 6; F.T.tween(1400, k => { b.position.y = 0.6 + k * 1.2; b.position.x = Math.sin(k * 5 + ph) * 0.15; }); } return K.sleep(600); };
T('kjele', {
  name: 'kjelen', radius: 0.4,
  hook: th => F.OBJ.trueLine(th, 'hk_damp', { vis: [steam] }),        // v5c WP-W2 (materials deck): «Is, vann og damp er det samme stoffet.»
  async press(th) {
    const l = part(th, 'lid'); steam(th); bump(th, 'boils');      // natural 11.10.: the whistle + steam are the kettle (no «Kjelen plystrer.»)
    for (let i = 0; i < 6; i++) { if (l) K.hop(l, 0.06, 150); const h = K.model('tmp_heart', {}); h.scale.setScalar(0.9); K.temp(th, h, 0.4, 0.5, 0, 1600); F.T.tween(1500, k => { h.position.y = 0.5 + k * 1.3; h.position.x = 0.4 + Math.sin(k * 6) * 0.15; }); await K.sleep(240); }
  },
});
T('c_eggkartong', {
  name: 'eggekartongen', radius: 0.5, learn: ['F09'],
  // v5c WP-W2 (mat_og_opphav): «Egg kommer fra høna.» – the first wobble of the day (the egg count task stays its learnFirst)
  hook: th => (th.state.taskDay === (F.save.day || 1) ? F.OBJ.trueLine(th, 'hk_egg', { vis: [t => { const l = part(t, 'lid'); SFX('squeak'); return l ? K.swing(l, 0.5, 700, 'x', 1) : K.wobble(t.obj, 0.08, 600); }] }) : null),
  async press(th) { if (await learnFirst(th, t => t.def.playFx(t, true))) return; return th.def.playFx(th); },
  async playFx(th, hatch) {
    SFX('squeak'); bump(th, 'wobbles');
    const lidE = part(th, 'lid'), egg = part(th, 'egg');
    if (lidE) K.swing(lidE, 0.5, 700, 'x', 1);
    await (egg ? K.swing(egg, 0.3, 700, 'z', 2) : K.wobble(th.obj, 0.12, 700));
    if (hatch || (th.state.wobbles % 4) === 0 || R() < 0.15) { const c = spawnTemp(th, 'kylling', 'tmp_chick', {}, 0.2, 0.3, 0.25, 2600, 1.4); SFX('chirp'); say('castle_kylling'); await K.hop(c, 0.3, 400); await K.hop(c, 0.3, 400); }
    else { const e = K.model('tmp_p_egg' in F.VOX.defs ? 'tmp_p_egg' : 'tmp_bolle', {}); e.scale.setScalar(2); K.temp(th, e, 0.6, 0.3, 0.3, 1800); await K.hop(e, 0.3, 400); }
  },
});
T('c_melsekk', {
  name: 'melsekken', radius: 0.5,
  hook: th => F.OBJ.trueLine(th, 'hk_brod_korn', { vis: [t => { K.burst(K.wpos(t, 1.3), { n: 30, colors: [0xffffff, 0xfff3dc], speed: 1.2, up: 1.8, gravity: 0.4, life: 1.6, size: 0.09 }); return K.sleep(400); }] }),   // v5c WP-W2: «Brød lages av korn.»
  async press(th) {
    SFX('noise', 0.4, 0.15, 3000, 0.5); bump(th, 'puffs');
    K.burst(K.wpos(th, 1.3), { n: 40, colors: [0xffffff, 0xfff3dc], speed: 1.4, up: 2, gravity: 0.4, life: 1.8, size: 0.09 });
    const tp = part(th, 'top'); if (tp) K.swing(tp, 0.4, 900, 'z', 2);
    await K.squash(th.obj);
    await K.sleep(300); say(R() < 0.5 ? 'castle_atsjo' : 'castle_mel'); SFX('pop');
  },
});
T('c_deig', {
  name: 'deigen', radius: 0.4,
  async press(th) {
    const p = part(th, 'pin'); SFX('rustle'); bump(th, 'rolls');
    const dg = part(th, 'deig'), fo = part(th, 'form');
    if (p) await tween(900, k => { p.position.x = Math.sin(k * Math.PI * 3) * 0.3; p.rotation.x = k * 12; if (dg) { dg.scale.y = 1 - 0.65 * k; dg.scale.x = dg.scale.z = 1 + 0.3 * k; } });
    if (fo) await K.hop(fo, -0.05, 250);
    if (dg) F.T.timeout(() => tween(400, k => { dg.scale.set(1.3 - 0.3 * k, 0.35 + 0.65 * k, 1.3 - 0.3 * k); }), 2200);
    const shape = (th.state.rolls % 2) ? 'tmp_heart' : 'tmp_star';
    const s = K.model(shape, {}); s.rotation.x = -Math.PI / 2; K.temp(th, s, 0, 0.12, 0, 2600); await K.hop(s, 0.25, 400);
    say('castle_deig');
  },
});
T('c_kakeboks', {
  name: 'kakeboksen', radius: 0.4,
  async press(th) {
    const l = part(th, 'lid'); SFX('pop'); bump(th, 'opens');
    if (l) await K.hop(l, 0.35, 350);
    const cat = spawnTemp(th, 'katt', 'tmp_cat', {}, -0.9, 0, 0.2, 2800, 1);
    await tween(500, k => { cat.position.x = -0.9 + k * 0.6; });
    const c = K.model('tmp_kjeks', {}); c.scale.setScalar(1.4); K.temp(th, c, 0, 0.5, 0, 1600);
    await tween(500, k => { c.position.set(-0.3 * k, 0.5 - k * 0.2, 0.2 * k); });
    SFX('meow'); say('castle_kakebokse');
    await tween(700, k => { cat.position.x = -0.3 - k * 1.4; cat.rotation.y = -Math.PI / 2; });
  },
});
T('c_brodkurv', {
  name: 'brødkurven', radius: 0.4, home: ['F48'], homePlace: 'bakeri',
  hook: th => F.OBJ.trueLine(th, 'hk_brod_korn', { vis: [t => { const ls = ['loaf0', 'loaf1', 'loaf2'].map(n => part(t, n)).filter(Boolean); SFX('boing'); return Promise.all(ls.map(l => K.hop(l, 0.3, 300))); }] }),   // v5c WP-W2: «Brød lages av korn.»
  async press(th) {
    SFX('boing'); bump(th, 'hops');
    const ls = ['loaf0', 'loaf1', 'loaf2'].map(n => part(th, n)).filter(Boolean);
    for (let i = 0; i < 3; i++) for (const l of ls) { K.hop(l, 0.3, 300); await K.sleep(150); }
  },
});

/* ====================================================================== SPISESALEN (11) */
T('c_langbord', {
  name: 'langbordet', radius: 2.2, reach: 3.2,
  async press(th) {
    const setUp = toggle(th, 'set'); SFX('chime');
    const dk = part(th, 'dekk');
    if (dk) { if (setUp) { dk.visible = true; dk.position.y = 0.5; for (let i = 0; i < 6; i++) F.T.timeout(() => SFX('tone', 1800 + i * 80, 0.08, 'triangle', 0.05), i * 120); await tween(600, k => { dk.position.y = 0.5 * (1 - K.ease.out(k)); }); } else { await tween(400, k => { dk.position.y = 0.4 * k; dk.scale.setScalar(Math.max(0.01, 1 - k)); }); dk.visible = false; dk.scale.setScalar(1); dk.position.y = 0; } return; }
    if (!th._dishes) th._dishes = [];
    th._dishes.forEach(d => d.parent && d.parent.remove(d)); th._dishes = [];
    if (setUp) for (let i = 0; i < 10; i++) {
      const plate = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0xffffff })); plate.add(p);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 8), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xff7fb0 : 0x9ad6ff })); cup.position.set(0.18, 0.05, -0.05); plate.add(cup);
      const side = i < 5 ? -1 : 1, k = i % 5;
      plate.position.set(-1.9 + k * 0.95, 0.9, side * 0.42); plate.scale.setScalar(0.01); th.obj.add(plate); th._dishes.push(plate);
      F.T.timeout(() => { SFX('tone', 1800 + i * 60, 0.08, 'triangle', 0.05); tween(250, q => plate.scale.setScalar(Math.max(0.01, K.ease.back(q)))); }, i * 140);
    }
    await K.sleep(1600);
  },
  init(th) { th._dishes = []; const dk = part(th, 'dekk'); if (dk) dk.visible = !!th.state.set; },
});
T('c_lysestake', {
  name: 'lysestaken', radius: 0.3, solid: false,
  init(th) { const f = part(th, 'flames'); if (f) f.visible = !!th.state.lit; },
  async press(th) {
    const f = part(th, 'flames'); const lit = toggle(th, 'lit');
    if (f) f.visible = lit;
    if (lit) { for (let i = 1; i <= 4; i++) { SFX('pling', i + 2); K.sparkle(K.wpos(th, 0.9), 0xfff4a0); await K.sleep(280); } }   // natural 11.10.: silent
    else { SFX('swish'); K.burst(K.wpos(th, 0.9), { n: 8, colors: [0xd8d8d8], speed: 0.3, up: 1, gravity: -0.3, life: 1.2 }); }
  },
});
T('c_avis', {
  name: 'Kongeposten', radius: 0.4, solid: false, learn: ['F30'],
  async press(th) {
    SFX('rustle'); bump(th, 'reads');
    const sd = part(th, 'side'); if (sd) { await K.rotTo(sd, 'y', -2.8, 500); F.T.timeout(() => K.rotTo(sd, 'y', 0, 500), 2500); } else await K.hop(th.obj, 0.25, 400);
    if (F.Quest && F.Quest.openPaper) { await F.Quest.openPaper(); return; }
    say('castle_avis');
  },
});
T('tekanne', {
  name: 'tekanna', radius: 0.3, solid: false,
  hook: th => F.OBJ.trueLine(th, 'hk_damp', { vis: [steam] }),
  async press(th) {
    const l = part(th, 'lid'); SFX('pour'); bump(th, 'pours'); steam(th);
    await K.rotTo(th.obj, 'z', -0.6, 400);
    for (let i = 0; i < 4; i++) { const h = K.model('tmp_heart', {}); h.scale.setScalar(0.7); K.temp(th, h, 0, 0.6, 0, 1500); F.T.tween(1400, k => { h.position.y = 0.6 + k * 1.1; h.position.x = Math.sin(k * 5 + i) * 0.2; }); if (l) K.hop(l, 0.05, 150); await K.sleep(260); }
    await K.rotTo(th.obj, 'z', 0, 400);
  },
});
T('c_gjokur', {
  name: 'gjøkuret', radius: 0.4, solid: false,
  tick(th, dt, t) { const p = part(th, 'pendulum'); if (p) p.rotation.z = Math.sin(t * 3) * 0.35; },
  async press(th) {
    const b = part(th, 'bird'), dr = part(th, 'door'), hd = part(th, 'hand'); bump(th, 'calls');   // (no «Gjøken sier ko-ko.»: it calls)
    if (dr) await K.rotTo(dr, 'y', -1.6, 300);
    if (hd) K.spin(hd, 1, 1800, 'z');
    // v5c WP-W2 (review X): the cuckoo calls the Feslandet hour (F.OBJ.strokes – the clock tower strikes the same), counted 1…n; not v1's 10–12
    const N = F.OBJ && F.OBJ.strokes ? F.OBJ.strokes() : 3;
    const away = () => !!(C.lastPress && C.lastPress() !== th);    // she tapped something else: the count stops
    for (let n = 1; n <= N && !away(); n++) {
      if (b) await tween(220, k => { b.position.z = k * 0.18; });
      SFX('tone', 880, 0.15, 'sine', 0.1); SFX('tone', 700, 0.2, 'sine', 0.1, 0.18);
      if (!away()) await K.say('castle_n', { n }, '', th);
      if (b) await tween(200, k => { b.position.z = (1 - k) * 0.18; });   // the bird always goes back in before the door shuts
    }
    if (dr) K.rotTo(dr, 'y', 0, 300);
  },
});
T('c_fruktfat', {
  name: 'fruktfatet', radius: 0.3, solid: false,
  // v5c WP-W2 (hook #25): a home of F71 (sorting) once a day; payoff: the fruit hops into a neat heap in the bowl
  hook: th => F.OBJ.ask(th, 'fruktfat', ['F71'], { after: async t => { const f = part(t, 'fruit'); for (let i = 1; i <= 4; i++) { if (f) await K.hop(f, 0.15, 220); SFX('pling', i); } K.sparkle(K.wpos(t, 0.6), 0xfff2a8); if (F.TPL.has('castle_frukt_rydd')) await say('castle_frukt_rydd'); } }),
  async press(th) {
    const f = part(th, 'fruit'); SFX('thud'); bump(th, 'rolls');
    if (f) { await tween(500, k => { f.position.x = k * 0.5; f.rotation.z = -k * 3; }); await K.sleep(400); }
    for (let i = 1; i <= 4; i++) { if (f) await K.hop(f, 0.15, 220); SFX('pling', i); }
    if (f) await tween(500, k => { f.position.x = 0.5 * (1 - k); f.rotation.z = -3 * (1 - k); });
  },
});
T('c_serviett', {
  name: 'servietten', radius: 0.3, solid: false,
  async press(th) {
    const n = part(th, 'nap'); SFX('swish'); bump(th, 'folds');
    if (n) await tween(700, k => { n.rotation.y = k * Math.PI * 2; n.scale.set(1 - k * 0.3, 1 + k * 1.5, 1 - k * 0.3); });
    const s = K.model(has('svane') ? 'svane' : 'tmp_p_svane', {}); s.scale.setScalar(0.45); K.temp(th, s, 0, 0.1, 0, 2800); say('castle_svaner');
    await K.sleep(1200); if (n) { n.rotation.y = 0; n.scale.set(1, 1, 1); }
  },
});

/* ====================================================================== TRONSALEN (12) */
/* v3 WP3 (DESIGN3 §8.1–8.3): «Dronning for en dag». The crown really lands on her head (a temporary look, never saved), she really sits
   on the throne, the room bows, and the queen's decree is a real task whose result stays visible (the KONGELOVEN scroll, cakes carried
   in and counted, the read thing on the cushion). Once a day; later presses: a short sit. An occupied throne = tap the sitter. */
const TH = F.Throne = { busy: false, crown: null, DECREE: ['F33', 'F28', 'F09', 'F07', 'F23'], last: null };
const sayQ = (id, slots, voice) => (F.TPL && F.TPL.has(id)) ? F.SAY(id, slots || {}, voice || '') : Promise.resolve();
const dayNo = () => F.save.day || 1;
function headWorld() {
  const av = F.Player.avatar, v = new THREE.Vector3();
  if (av && av.userData.anchors && av.userData.anchors.head) { av.updateMatrixWorld(true); av.userData.anchors.head.getWorldPosition(v); v.y += 0.05; }
  else v.set(F.Player.obj.position.x, F.Player.obj.position.y + 1.35, F.Player.obj.position.z);
  return v;
}
// the room's crown stand ('krone') for a throne (same building + room)
const crownStand = th => F.Things.list.find(t => t.type === 'krone' && t.bld === th.bld && t.room === th.room) || null;
// fly the stand's crown onto her head, then show it as her temporary 'krone' look (F.Fairy.tempWear – never written to F.save.wear)
async function crownOn(k, why) {
  if (TH.crown) return TH.crown;
  const c = k ? part(k, ['crown', 'krone']) : null;
  const o = TH.crown = { k, c, why, p0: c ? c.position.clone() : null, s0: c ? c.scale.clone() : null, t: F.T.now };
  if (c && c.parent) {
    SFX('chime');
    await tween(700, q => {
      if (TH.crown !== o) return;
      const tgt = c.parent.worldToLocal(headWorld());
      c.position.lerpVectors(o.p0, tgt, K.ease.inOut(q)); c.position.y += Math.sin(q * Math.PI) * 0.9;
      c.scale.copy(o.s0).multiplyScalar(1 - 0.45 * q); c.rotation.y = q * Math.PI * 2;
    });
    if (TH.crown !== o) return null;
    c.visible = false; c.rotation.y = 0;
  }
  try { if (F.Fairy && F.Fairy.tempWear) F.Fairy.tempWear(['krone']); } catch (e) { console.error('[throne] tempWear', e); }
  K.sparkle(headWorld(), 0xffd84a); SFX('sparkle');
  return o;
}
async function crownOff(o) {
  o = o || {};
  const cr = TH.crown; if (!cr) return;
  TH.crown = null;
  try { if (F.Fairy && F.Fairy.clearTemp) F.Fairy.clearTemp(); } catch (e) { console.error('[throne] clearTemp', e); }
  const c = cr.c; if (!c) return;
  if (o.instant || !c.parent || !cr.k || !cr.k.obj || F.Space.cur !== cr.k.space) { c.visible = true; c.position.copy(cr.p0); c.scale.copy(cr.s0); c.rotation.y = 0; return; }
  const from = c.parent.worldToLocal(headWorld()); c.visible = true; c.position.copy(from); SFX('whoosh');
  await tween(650, q => { c.position.lerpVectors(from, cr.p0, K.ease.inOut(q)); c.position.y += Math.sin(q * Math.PI) * 0.7; c.scale.copy(cr.s0).multiplyScalar(0.55 + 0.45 * q); });
  c.position.copy(cr.p0); c.scale.copy(cr.s0);
}
// leaving the room (or the building) takes the crown back at once
F.on('roomEntered', () => { if (TH.crown && !TH.busy) crownOff({ instant: true }); });
F.on('spaceChanged', () => { if (TH.crown) crownOff({ instant: true }); });
TH.crownOn = crownOn; TH.crownOff = crownOff;
// the seat: c_trone meta.seat [0, 0.95, 0.15] m × scale (the same math the king uses, actors.js startAct)
function seatOf(th) {
  const meta = (F.VOX.defs && F.VOX.defs.c_trone && F.VOX.defs.c_trone.meta) || {}, s = meta.seat || [0, 0.95, 0.15];
  const sc = th.obj.scale.y || 1, ry = th.obj.rotation.y || 0;
  return () => V3(th.obj.position.x + Math.sin(ry) * (s[2] + 0.12) * sc, th.obj.position.y + s[1] * sc - 0.32, th.obj.position.z + Math.cos(ry) * (s[2] + 0.12) * sc);
}
const sitOn = th => F.BEH && F.BEH.util && F.BEH.util.seat ? F.BEH.util.seat(th, { pos: seatOf(th), face: th.obj.rotation.y || 0 }) : null;
// who is in this throne room (persons, not the fairy): the courtiers
const courtiers = th => (F.Act && F.Act.list ? F.Act.list : []).filter(a => a.kind === 'person' && a.space === th.space && (!a.bld || a.bld === th.bld) && (!a.visible || a.visible()) && Math.hypot(a.x - th.x, a.z - th.z) < 10);
function bow(a, delay) {
  F.T.timeout(() => {
    try { a.facePlayer && a.facePlayer(); a.gesture && a.gesture('nod', 1.2); } catch (e) { /* busy actor */ }
    const m = a.th && a.th.obj; if (!m) return; m.rotation.order = 'YXZ'; const x0 = m.rotation.x;   // the Thing's group (the People model sets its own lean every frame); YXZ = a forward bow whatever way he faces
    tween(1300, q => { m.rotation.x = x0 + Math.sin(q * Math.PI) * 0.42; }).then(() => { m.rotation.x = x0; });
  }, delay || 0);
}
// a kingdom keep: 'rk_<realm>' → realm id; its family's RQ step (giver present here) takes precedence over the ceremony
const keepRealm = th => (typeof th.bld === 'string' && th.bld.indexOf('rk_') === 0) ? th.bld.slice(3) : null;
function rqRoyal(th, id) {
  const RQ = F.RQuest, Roy = F.Royals; if (!RQ || !Roy || !Roy.actor) return null;
  let st = null; try { st = RQ.status ? RQ.status(id) : null; } catch (e) { st = null; }
  for (const who of ['k', 'q', 'c']) {
    const a = Roy.actor(id, who);
    if (!a || a.space !== th.space || (a.bld && a.bld !== th.bld) || Math.hypot(a.x - th.x, a.z - th.z) > 14) continue;
    if (st && st.active) { const q = RQ.defs && RQ.defs[st.active]; if (q && q.who === who) return a; continue; }
    try { if (RQ.offerFor && RQ.offerFor(id, who)) return a; } catch (e) { /* no offer */ }
  }
  return null;
}
// the throne acts (Kong Leo's nap, a realm king's throne) must not walk back onto the seat while she sits there
function holdActs(th, on) {
  const AC = (F.Act && F.Act.ACTS) || {};
  const sitters = F.Act && F.Act.list ? F.Act.list.filter(x => (x.act && x.act.tgt === th) || (AC[x.id] && AC[x.id].near === 'c_trone' && x.space === th.space)) : [];
  for (const a of new Set(courtiers(th).concat(sitters))) {
    if (on) { if (a.act && a.act.tgt === th && F.Act.stopAct) F.Act.stopAct(a, true); a._actStop = F.T.now + 3600; a._throneHold = true; }
    else if (a._throneHold) { a._actStop = F.T.now; a._throneHold = false; }
  }
}
// the courtiers step aside to both sides of the throne (the decree stage in front of it stays free), facing her
function arrange(th) {
  const ry = th.obj.rotation.y || 0, cs = Math.cos(ry), sn = Math.sin(ry);
  courtiers(th).slice(0, 4).forEach((a, i) => {
    const side = i % 2 ? 1 : -1, lx = side * (3.6 + Math.floor(i / 2) * 1.0), lz = 2.1;
    const x = th.x + cs * lx + sn * lz, z = th.z - sn * lx + cs * lz;
    try { const p = a.walkTo && a.walkTo(x, z); if (p && p.then) p.then(() => { try { a.facePlayer && a.facePlayer(); } catch (e) {} }); } catch (e) { /* busy actor */ }
  });
}
function fanfare(th) {
  [0, 4, 7, 12].forEach((s, i) => SFX('tone', F.note(s + 7), 0.22, 'square', 0.04, i * 0.18));
  F.T.timeout(() => [0, 4, 7, 12, 16].forEach((s, i) => SFX('tone', F.note(s + 7), 0.3, 'triangle', 0.05, i * 0.16)), 900);
  const fan = F.Things.list.find(t => t.type === 'c_fanfare' && t.bld === th.bld && t.room === th.room);
  if (fan) { const b = part(fan, 'banner'), h = part(fan, 'horn'); if (h) K.hop(h, 0.15, 300); if (b && !fan.state.up) { F.Things.setState(fan, { up: true }); tween(700, q => { b.scale.y = 0.15 + 0.85 * q; }); } }
  K.burst(K.wpos(th, 3.2), { n: 60, speed: 2.6, up: 4, life: 1.8 });
  K.burst(K.wpos(th, 2.2), { n: 30, colors: [0xf5c542, 0xffffff, 0xff7fb0], speed: 1.6, up: 2.4, life: 1.4 });
}
// the decree payoffs (§8.1): what the queen decided becomes visible
const lawScroll = th => F.Things.list.find(t => t.type === 'c_kongelov' && t.bld === th.bld && t.room === th.room) || null;
async function decreeLaw(th, w) {
  const sc = lawScroll(th); if (!sc || !w) return false;
  if (F.R.look) F.R.look(V3(sc.x, sc.obj.position.y + 1.3, sc.z + 0.6), { ms: 4200, dist: 7, pitch: 0.38 });
  await K.sleep(500);
  const laws = (sc.state.laws || []).filter(x => x !== w).concat([w]).slice(-6);
  F.Things.setState(sc, { laws, fresh: w });
  drawLaws(sc, laws.length - 1);
  K.burst(K.wpos(sc, 1.6), { n: 36, colors: [0xf5c542, 0xfff0a0, 0xffffff], speed: 1.4, up: 2, life: 1.3 });
  SFX('chime'); await K.hop(sc.obj, 0.12, 400);
  await sayQ('castle_lov');
  return true;
}
const CAKE = () => ['kake', 'bolle', 'muffins'].find(id => has(id)) || 'tmp_bolle';
async function decreeCount(th, n) {
  n = Math.max(1, Math.min(20, n | 0)); if (!n) return false;
  const ids = courtiers(th), mid = CAKE(), out = [];
  const ry = th.obj.rotation.y || 0;
  if (F.R.look) F.R.look(V3(th.x + Math.sin(ry) * 2, th.obj.position.y + 0.6, th.z + Math.cos(ry) * 2), { ms: 2400 + n * 900, dist: 8, pitch: 0.5 });
  const lab = F.UI.label(K.wpos(th, 2.9).add(V3(0, 0, 1.4)), '0', { kind: 'num', space: th.space }); lab.el.classList.add('glow');
  const spot = i => { const r = Math.floor(i / 10), c = i % 10; return V3((c - 4.5) * 0.36 + (c >= 5 ? 0.14 : 0) - (c < 5 ? 0.14 : 0), 0.06, 1.8 + r * 0.5); };
  const bring = async i => {
    const m = tmpItem(mid, {}, 'tmp_bolle', {}); const bb = new THREE.Box3().setFromObject(m); m.scale.setScalar(Math.min(2.5, 0.3 / Math.max(0.05, bb.max.y - bb.min.y, (bb.max.x - bb.min.x) * 0.5)));
    const a = ids.length ? ids[i % ids.length] : null;
    const from = a ? th.obj.worldToLocal(V3(a.x, (a.th && a.th.obj ? a.th.obj.position.y : th.obj.position.y) + 1.1, a.z)) : V3(0, 1.2, 5);
    const to = spot(i); K.temp(th, m, from.x, from.y, from.z, 7000 + (n - i) * 60); out.push(m);
    await tween(380, q => { m.position.lerpVectors(from, to, K.ease.inOut(q)); m.position.y += Math.sin(q * Math.PI) * 0.6; });
    m.position.copy(to);
  };
  if (n >= 10) {   // the first ten land as one row (a ten), then she hears the count go on: 10, 11, 12 …
    for (let i = 0; i < 10; i++) { bring(i); SFX('pling', i % 8); lab.set(String(i + 1)); await K.sleep(150); }
    await K.sleep(350); await sayQ('castle_n', { n: 10 });
    for (let i = 10; i < n; i++) { await bring(i); SFX('pling', i % 8); lab.set(String(i + 1)); await sayQ('castle_n', { n: i + 1 }); }
  } else for (let i = 0; i < n; i++) { await bring(i); SFX('pling', i % 8); lab.set(String(i + 1)); await sayQ('castle_n', { n: i + 1 }); }
  ids.forEach(a => { try { a.gesture && a.gesture('cheer', 1.2); } catch (e) {} });
  F.T.timeout(() => lab.remove(), 2600);
  return true;
}
async function decreeShow(th, w) {
  const mid = w && has(w) ? w : null; if (!mid) return false;
  const g = new THREE.Group();
  const cu = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.4), new THREE.MeshLambertMaterial({ color: 0xd84a7e })); cu.position.y = 0.05; g.add(cu);
  const m = F.VOX.make(mid, {}); const bb = new THREE.Box3().setFromObject(m); m.scale.setScalar(Math.min(2.5, 0.5 / Math.max(0.05, bb.max.y - bb.min.y, bb.max.x - bb.min.x))); m.position.y = 0.1; g.add(m);
  K.temp(th, g, 0, 0.9, 1.45, 6500); g.scale.setScalar(0.01);
  const ry = th.obj.rotation.y || 0;
  if (F.R.look) F.R.look(V3(th.x + Math.sin(ry) * 1.4, th.obj.position.y + 1.1, th.z + Math.cos(ry) * 1.4), { ms: 3600, dist: 7, pitch: 0.4 });
  SFX('magic'); await tween(450, q => g.scale.setScalar(Math.max(0.01, K.ease.back(q))));
  K.sparkle(K.wpos(th, 1.3).add(V3(0, 0, 1.4)), 0xffd84a);
  F.T.tween(5800, q => { m.rotation.y = q * Math.PI * 2; });
  return true;
}
async function payoff(th, item, res) {
  if (!item || !res || res.aborted) return false;
  const st = item.strand || '', w = item.word || item.target;
  if (/SKRIV/.test(st) || ['F33', 'F34', 'F35', 'F36'].includes(item.format)) return decreeLaw(th, String(item.word || '').toLowerCase());
  if (typeof item.target === 'number' && (/T-/.test(st) || ['F07', 'F09'].includes(item.format))) return decreeCount(th, item.target);
  return decreeShow(th, typeof w === 'string' ? w.toLowerCase() : null);
}
// a short sit (later presses the same day, or while the play break is on)
async function shortSit(th) {
  const s = sitOn(th); if (!s) { await K.hop(th.obj, 0.1, 300); return; }
  await s.ready; const c = part(th, ['cushion', 'pute']); if (c) tween(500, k => { c.scale.y = 1 - Math.sin(k * Math.PI) * 0.4; });
  hearts(th, 10, 1.6); await sayQ('castle_trone_hvile');
  await K.sleep(1400); await s.release();
}
async function ceremony(th, realm) {
  TH.busy = true; TH.last = { t: F.T.now, realm: realm || null, task: null, res: null, payoff: false };
  F.emit('activity', 'throne', true);
  holdActs(th, true);
  const seat = sitOn(th);
  const alive = () => !seat || seat.active;
  let res = null, item = null, done = false;
  const offS = F.on('taskStart', it => { if (TH.busy && !item) item = it; });
  try {
    arrange(th);
    if (seat) await seat.ready;
    const c = part(th, ['cushion', 'pute']); if (c) tween(500, k => { c.scale.y = 1 - Math.sin(k * Math.PI) * 0.4; });
    // v5c WP-W2 (logic #26): «Kongen lar deg prøve tronen!» only when the realm's king is really here; else the soft throne line
    if (realm) { let kg = null; try { kg = F.Royals && F.Royals.actor ? F.Royals.actor(realm, 'k') : null; } catch (e) { kg = null; }
      const near = !!(kg && kg.space === th.space && (!kg.bld || !th.bld || kg.bld === th.bld) && Math.hypot(kg.x - th.x, kg.z - th.z) < 14);
      await sayQ(near || !F.TPL.has('castle_trone_hvile') ? 'castle_trone_konge' : 'castle_trone_hvile'); }
    if (!alive()) return;
    if (F.R.look) F.R.look(V3(th.x + Math.sin(th.obj.rotation.y || 0) * 0.8, th.obj.position.y + 1.2, th.z + Math.cos(th.obj.rotation.y || 0) * 0.8), { ms: 5200, dist: 7.5, pitch: 0.42 });
    await crownOn(crownStand(th), 'throne');
    await sayQ('castle_krone_din');
    if (!alive()) return;
    fanfare(th); courtiers(th).forEach((a, i) => bow(a, 250 + i * 180));
    await sayQ('castle_trone');
    await K.sleep(500);
    if (!alive()) return;
    await sayQ('castle_dekret');
    if (!alive()) return;
    if (F.Task && F.Task.offer && !F.Task.current) {
      F.FX.sparkle(K.wpos(th, 1.6)); SFX('magic');
      if (F.R.cam && F.R.cam.look) F.R.cam.look.cancel = true;      // the crowning close-up eases back so the task stage is framed
      res = await F.Task.offer({ formats: TH.DECREE, ctx: { thing: th, place: 'tronsal', keepPlayer: true, throne: true } });
      TH.last.task = item ? item.format : null; TH.last.res = res ? (res.outcome || (res.aborted ? 'aborted' : null)) : null;
    }
    if (!alive() || (res && res.aborted)) return;
    if (res) { try { TH.last.payoff = await payoff(th, item, res); } catch (e) { console.error('[throne] payoff', e); } }
    await sayQ('castle_dekret_ferdig');
    courtiers(th).forEach(a => { try { a.gesture && a.gesture('clap', 1.4); } catch (e) {} });
    await sayQ('castle_dronning_slutt');
    done = !!res;
  } catch (e) { console.error('[throne] ceremony', e); }
  finally {
    offS();
    if (done) { F.save.today = F.save.today || {}; F.save.today.throne = dayNo(); F.save.today.throneBld = th.bld; F.store && F.store(); }
    await crownOff(alive() ? {} : { instant: true });
    if (seat) await seat.release(alive() ? {} : { instant: true });
    holdActs(th, false);
    TH.busy = false;
    F.emit('activity', 'throne', false);
    F.emit('throneDone', th.id, done);
  }
}
TH.ceremony = ceremony;
T('c_trone', {
  name: 'tronen', radius: 1.0, reach: 2.2, surprise: false,
  async press(th) {
    const c = part(th, ['cushion', 'pute']); SFX('squeak'); bump(th, 'sits');
    // §3 WP3 → WP4: somebody sits here (Kong Leo napping, a realm king) → the tap is for him
    const sitter = F.Act && F.Act.list ? F.Act.list.find(a => a.act && a.act.sit && a.act.tgt === th) : null;
    if (sitter && F.Act.press) return F.Act.press(sitter);
    if (TH.busy) { K.sparkle(K.wpos(th, 2.4), 0xffd84a); return; }
    if (th.space !== F.Space.cur) return;
    // kingdom keep: the family's quest step comes first
    const realm = keepRealm(th);
    if (realm) { const a = rqRoyal(th, realm); if (a && F.Act.press) return F.Act.press(a); }
    const doneToday = F.save.today && F.save.today.throne === dayNo();
    const canTask = F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask() && F.Task && F.Task.offer && !F.Task.current;
    if (doneToday || !canTask) { if (c) tween(500, k => { c.scale.y = 1 - Math.sin(k * Math.PI) * 0.5; }); return shortSit(th); }
    return ceremony(th, realm);
  },
});
T('krone', {
  name: 'krona', radius: 0.4,
  async press(th) {
    if (TH.busy || TH.crown) { K.sparkle(K.wpos(th, 1), 0xffd84a); return; }   // the crown is already in use (ceremony / on her head)
    // after today's ceremony «Krona hviler til i morgen»: it rests on its cushion and only glitters (the promise stays true)
    if (F.save.today && F.save.today.throne === dayNo() && F.save.today.throneBld === th.bld) { const c = part(th, ['crown', 'krone']); if (c) K.hop(c, 0.12, 400); K.sparkle(K.wpos(th, 1), 0xffd84a); SFX('chime'); say('castle_fint'); return; }
    const o = await crownOn(th, 'press');
    if (!o) return;
    bump(th, 'worn'); say('castle_krone');
    // it stays ~8 s (or until she leaves the room); the sneeze gag is a 1-in-4 surprise
    const sneeze = R() < 0.25;
    await new Promise(r => { const t1 = F.T.now; const off = F.on('tick', () => { if (TH.crown !== o || F.T.now - t1 >= 8) { off(); r(); } }); });
    if (TH.crown !== o) return;
    if (sneeze) { SFX('pop'); say('castle_atsjo'); K.burst(headWorld(), { n: 16, colors: [0xffffff, 0xffd84a], speed: 1.4, up: 1.5, life: 0.8 }); }
    await crownOff();
  },
});
// §8.2: hanging decor never takes a tap meant for the throne or a person (WP4 input.js honours pickLow); moved off the throne's axis
T('c_lysekrone', {
  name: 'lysekrona', radius: 0.5, solid: false, noPop: true, pickLow: true,
  async press(th) {
    const b = part(th, ['body', 'arms']) || th.obj; bump(th, 'spins');
    const sc = [0, 2, 4, 7, 9, 12];
    K.spin(b, 1, 2200);
    for (let i = 0; i < 6; i++) { SFX('tone', F.note(sc[i] + 12), 0.8, 'sine', 0.06); K.sparkle(K.wpos(th, 0.6), 0x9fe8ff); await K.sleep(330); }
  },
});
// the KONGELOVEN scroll beside the throne: the words she wrote as queen (max 6). Tap = try first: the word lights and is sounded out
// by sound unit (F.LYD); a 2nd tap on the same word says it whole (rw_word). Then the next law.
// v5 WP-W (DESIGN5 §3.1): Hundretavla – the hall wall of 100 lit tiles, the castle home of F42 (and Mø3–Mø4 / O10–O11 there)
D('tmp_c_tallvegg', [35, 35, 2], 1 / 16, v => {
  v.box(0, 0, 0, 34, 34, 0, 'woodDark'); v.box(1, 1, 1, 33, 33, 1, 'cream');
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const x = 2 + c * 3 + (c >= 5 ? 1 : 0), y = 31 - r * 3 - (r >= 5 ? 1 : 0); v.box(x, y - 1, 1, x + 1, y, 1, (r + c) % 2 ? 'butter' : 'sky'); }
  v.box(0, 34, 0, 34, 34, 1, 'gold'); v.box(0, 0, 0, 34, 0, 1, 'gold');
}, {});
T('c_tallvegg', {
  name: 'hundretavla', radius: 0.5, solid: false, home: ['F42'], homePlace: 'hall',
  async press(th) {
    SFX('pling', 4); bump(th, 'glows');
    for (let i = 0; i < 6; i++) { K.sparkle(K.wpos(th, 0.3 + Math.random() * 1.4), [0xfff4a0, 0xbfe6ff, 0xffd1e6][i % 3]); await K.sleep(90); }
  },
});
D('tmp_c_kongelov', [12, 24, 3], 1 / 10, v => { v.box(0, 22, 0, 11, 23, 2, 'gold'); v.box(0, 0, 0, 11, 1, 2, 'gold'); v.box(1, 2, 1, 10, 21, 1, 'cream'); v.set(0, 23, 1, 'red'); v.set(11, 23, 1, 'red'); v.set(0, 0, 1, 'red'); v.set(11, 0, 1, 'red'); }, {});
function drawLaws(th, hi) {
  if (!th.obj) return;
  if (!th._lc) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 384;
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(0, 1.18, 0.2); m.renderOrder = 2; m.userData.thing = th; th.obj.add(m); th._lc = { cv, tex, m };
  }
  const { cv, tex } = th._lc, x = cv.getContext('2d'), laws = th.state.laws || [];
  x.clearRect(0, 0, cv.width, cv.height);
  const fam = (getComputedStyle(document.body).fontFamily || 'sans-serif');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#b8860b'; x.font = 'bold 32px ' + fam; x.fillText('KONGELOVEN', 128, 30);
  x.fillStyle = '#d4a017'; x.fillRect(26, 52, 204, 5);
  laws.forEach((w, i) => {
    const y = 92 + i * 50;
    if (i === hi) { x.fillStyle = 'rgba(255,214,74,0.8)'; x.fillRect(16, y - 24, 224, 48); }
    let px = 48; x.font = 'bold ' + px + 'px ' + fam; while (x.measureText(w).width > 216 && px > 22) { px -= 4; x.font = 'bold ' + px + 'px ' + fam; }
    x.fillStyle = '#5a2d82'; x.fillText(w, 128, y);
  });
  tex.needsUpdate = true;
}
T('c_kongelov', {
  name: 'kongeloven', radius: 0.45, solid: false, surprise: false, home: ['F54'], homePlace: 'tronsal',
  init(th) { th.labels = []; drawLaws(th); },
  async press(th) {
    const laws = th.state.laws || [];
    SFX('rustle'); K.wobble(th.obj, 0.04, 500);
    if (!laws.length) { K.sparkle(K.wpos(th, 1.2), 0xffd84a); return; }
    const now = F.T.now, sel = th._sel != null ? th._sel : laws.length - 1, w = laws[sel % laws.length];
    if (th._try && th._try.w === w && now - th._try.t >= 1.5 && now - th._try.t < 12) {   // 2nd tap: the whole word
      th._try = null; drawLaws(th, sel % laws.length);
      if (F.TPL.has('rw_word') && F.SETS.get && F.SETS.get('WORDS').includes(w)) await F.SAY('rw_word', { w }, '');
      else { SFX('sparkle'); K.sparkle(K.wpos(th, 1.4), 0xffd84a); }
      th._sel = (sel + laws.length - 1) % laws.length;    // next tap: the next law (newest first)
      F.T.timeout(() => drawLaws(th), 1600);
      return;
    }
    if (th._try && now - th._try.t < 1.5) return;
    th._try = { w, t: now }; drawLaws(th, sel % laws.length);
    // sound it out by sound unit (never the letter names, never the whole word first)
    if (F.LYD && F.LYD.units && F.LYD.play) { const us = F.LYD.units(w); for (let k = 0; k < us.length; k++) { if (!us[k].silent) SFX('pling', k); await F.LYD.play(us[k]); await K.sleep(110); } }
    else K.sparkle(K.wpos(th, 1.4), 0xffd84a);
  },
});
T('c_fanfare', {
  name: 'fanfaren', radius: 0.5,
  init(th) { const b = part(th, 'banner'); if (b) b.scale.y = th.state.up ? 1 : 0.15; },
  async press(th) {
    const b = part(th, 'banner'), h = part(th, 'horn'); const up = toggle(th, 'up');
    [0, 4, 7, 12].forEach((s, i) => SFX('tone', F.note(s + 7), 0.22, 'square', 0.04, i * 0.18));
    say('castle_fanfare');
    if (h) K.hop(h, 0.15, 300);
    if (b) await tween(700, k => { b.scale.y = up ? 0.15 + 0.85 * k : 1 - 0.85 * k; });
    else K.wobble(th.obj, 0.1, 600);
    if (up) K.burst(K.wpos(th, 2.6), { n: 40, speed: 2.5, up: 4, life: 1.5 });
  },
});
T('c_vindu', {
  name: 'vinduet', radius: 0.4, solid: false, home: ['F65'], homePlace: 'window',
  init(th) { if (th.state.open) { const L = part(th, 'shutterL'), Rr = part(th, 'shutterR'); if (L) L.rotation.y = -1.7; if (Rr) Rr.rotation.y = 1.7; } },
  async press(th) {
    const open = toggle(th, 'open'); SFX('creak');
    await doorSwing(th, 'shutterL', 'shutterR', open ? 1.7 : 0, 600);
    if (open) {
      for (let i = 0; i < 3; i++) {
        const d = K.model(has('due') ? 'due' : 'tmp_dove', {}); d.scale.setScalar(1.5); K.temp(th, d, 0, 1, 0.3, 4200);
        const ph = i * 2.1; F.T.tween(4000, k => { const a = k * Math.PI * 2 + ph; d.position.set(Math.sin(a) * 3, 1 + Math.sin(k * Math.PI) * 1.5, 2.5 - Math.cos(a) * 2.2); d.rotation.y = a + Math.PI / 2; });
        SFX('chirp'); await K.sleep(250);
      }
    }
  },
});
T('c_gullbjelle', {
  name: 'gullbjella', radius: 0.5,
  async press(th) {
    const b = part(th, 'bell'); SFX('bell', 660); bump(th, 'rings');
    if (b) K.swing(b, 0.5, 1400, 'z', 3);
    await K.sleep(500);
    const r = F.Act && F.Act.byId ? F.Act.byId('rolf') : null;
    if (r && r.space === 'in' && r.walkTo) {
      try { const p = r.walkTo(th.x - 1.4, th.z + 1.2); if (p && p.then) p.then(() => bow(r, 0)); else bow(r, 600); } catch (e) { /* actor busy */ }
    }
    else { const k = K.model(has('ch_person') ? 'ch_person' : 'tmp_c_rustning', {}); K.temp(th, k, -1.4, 0, 1.0, 2600); await tween(700, q => { k.rotation.x = Math.sin(q * Math.PI) * 0.5; }); }
  },
});

/* ====================================================================== BALLSALEN (13) */
T('c_glitterkule', {
  name: 'glitterkula', radius: 0.4, solid: false, noPop: true, pickLow: true,
  async press(th) {
    const b = part(th, 'ball') || th.obj; say('castle_dans'); SFX('waltz'); bump(th, 'dances');
    const spin = K.spin(b, 3, 3000);
    for (let i = 0; i < 10; i++) { K.burst(K.wpos(th, -0.2), { n: 10, colors: [0x9fe8ff, 0xff7fb0, 0xffd84a, 0xffffff], speed: 4, up: 0.5, gravity: 0, life: 0.9, size: 0.07 }); await K.sleep(280); }
    const av = F.Player.avatar; if (av && av.userData.play) av.userData.play('twirl', 1.2);
    await spin;
  },
});
T('c_grammofon', {
  name: 'grammofonen', radius: 0.5,
  async press(th) {
    const h = part(th, 'horn'), pl = part(th, 'plate'), ar = part(th, 'arm'); SFX('waltz'); say('castle_musikk'); bump(th, 'plays');
    if (ar) K.rotTo(ar, 'y', 0.25, 300); if (pl) K.spin(pl, 3, 2400);
    F.T.timeout(() => { if (ar) K.rotTo(ar, 'y', 0, 300); }, 2600);
    notes(th, 5, 1.3);
    if (h) K.swing(h, 0.1, 2000, 'y', 4);
    const av = F.Player.avatar; if (av) await tween(1600, k => { av.rotation.y = k * Math.PI * 2; }); if (av) av.rotation.y = 0;
  },
});
/* v5c WP-W2 (hook #25, FORM G1): the dance floor is a home of F65 «Figurjakten» (once a day). Payoff when she found the shapes herself:
   the floor lights up in the shape she hunted (lamps along its outline, one by one) and everybody dances. */
function shapeOutline(cls) {
  const ring = (n, rx, ry) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * rx, Math.sin(i / n * Math.PI * 2) * ry]);
  const poly = (pts, per) => { const out = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; for (let k = 0; k < per; k++) out.push([p[0] + (q[0] - p[0]) * k / per, p[1] + (q[1] - p[1]) * k / per]); }); return out; };
  if (cls === 'trekant') return poly([[0, -1.4], [1.4, 1.1], [-1.4, 1.1]], 5);
  if (cls === 'kvadrat' || cls === 'firkant') return poly([[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]], 4);
  if (cls === 'rektangel') return poly([[-1.6, -0.9], [1.6, -0.9], [1.6, 0.9], [-1.6, 0.9]], 4);
  if (cls === 'oval') return ring(16, 1.6, 0.9);
  return ring(16, 1.3, 1.3);
}
async function shapeLights(th, res, item) {
  const cls = item && item.params && item.params.cls, pts = shapeOutline(cls);
  const cols = [0xff7fb0, 0xffd84a, 0x9ad6ff, 0xa6efcd];
  for (let i = 0; i < pts.length; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true, opacity: 0.9 }));
    K.temp(th, m, pts[i][0], 0.07, pts[i][1], 5200 - i * 60);
    SFX('pling', i % 8); await K.sleep(110);
  }
  if (F.TPL.has('castle_dans_form')) await say('castle_dans_form'); else await say('castle_dans');
  const t = part(th, 'tiles'); if (t) await K.hop(t, 0.06, 300);
}
T('c_dansegulv', {
  name: 'dansegulvet', radius: 1.8, solid: false, noPop: true, reach: 2.0,
  hook: th => F.OBJ.ask(th, 'dansegulv', ['F65'], { place: 'castle', after: shapeLights }),
  async press(th) {
    const t = part(th, 'tiles'); SFX('tune'); say('castle_dans'); bump(th, 'dances');
    const glow = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshBasicMaterial({ color: [0xff7fb0, 0xffd84a, 0x9ad6ff, 0xa6efcd][i % 4], transparent: true, opacity: 0.85 }));
      K.temp(th, m, -1.5 + (i % 4), 0.06, -1.5 + Math.floor(i / 4) * 2 + (i % 2), 600 + i * 120);
      glow.push(m); SFX('pling', i); await K.sleep(160);
    }
    if (t) await K.hop(t, 0.06, 300);
  },
});
T('harpe', {
  name: 'harpa', radius: 0.5,
  async press(th) {
    say('castle_harpe'); bump(th, 'plays');
    const st = part(th, 'strenger'); if (st) tween(1200, k => { st.scale.x = 1 + Math.sin(k * Math.PI * 10) * 0.05 * (1 - k); });
    for (let i = 0; i < 12; i++) { SFX('pluck', F.note(i * 2 + 7)); if (i % 3 === 0) K.sparkle(K.wpos(th, 1 + i * 0.12), 0xfff6b0); await K.sleep(90); }
    await K.wobble(th.obj, 0.05, 600);
  },
});
T('c_spilledase', {
  name: 'spilledåsa', radius: 0.3, solid: false,
  async press(th) {
    const b = part(th, 'ballerina'); SFX('tune'); bump(th, 'plays');
    if (b) await Promise.all([K.spin(b, 3, 2400), K.hop(b, 0.08, 400)]);
  },
});
T('tromme', {
  name: 'tromma', radius: 0.6,
  async press(th) {
    say('castle_tromme'); bump(th, 'booms');
    const sk = part(th, 'skinn'), sti = part(th, 'stikker');
    for (let i = 0; i < 3; i++) { SFX('thud'); if (sti) K.swing(sti, 0.3, 300, 'z', 1); if (sk) await tween(300, k => { sk.scale.y = 0.6 + 0.4 * k; }); else await K.squash(th.obj); K.burst(K.wpos(th, 1.0), { n: 8, colors: [0xffd84a, 0xff7fb0], speed: 1.2, up: 1.5, life: 0.6 }); }
  },
});

/* ====================================================================== BIBLIOTEKET (14) */
const BOOKS = ['hest', 'katt', 'sol', 'båt', 'kake', 'is', 'mus', 'ball'];
T('c_bokhylle', {
  name: 'bokhylla', radius: 1.8, reach: 2.6, learn: ['F25'], home: ['F79'], homePlace: 'bibliotek',
  async press(th) { if (await learnFirst(th, (t, it) => t.def.playFx(t, it.word))) return; return th.def.playFx(th); },
  async playFx(th, word) {
    const b = part(th, 'book'); const i = bump(th, 'books') % BOOKS.length; const w = word ? String(word) : BOOKS[i];   // after F25: the book she found
    SFX('rustle'); say('castle_bok');
    if (b) {
      const p0 = b.position.clone();
      await tween(1600, k => { const a = k * Math.PI * 2; b.position.set(p0.x + Math.sin(a) * 1.4, p0.y + Math.sin(k * Math.PI) * 1.4, p0.z + 1.2 * Math.sin(k * Math.PI) + (1 - Math.cos(a)) * 0.4); b.rotation.y = a; b.rotation.z = Math.sin(k * Math.PI * 6) * 0.3; });
      b.position.copy(p0); b.rotation.set(0, 0, 0);
    }
    // pop-up model + a word plaque (reading; never spoken before she reads it)
    const pop = has(w) ? F.VOX.make(w, {}) : K.model('tmp_letterblk', { c: 'butter' });
    const bb = new THREE.Box3().setFromObject(pop); const s = bb.isEmpty() ? 1 : Math.min(2, 0.9 / Math.max(0.1, bb.max.y - bb.min.y)); pop.scale.setScalar(s);
    K.temp(th, pop, 0, 0.05, 1.6, 3400);
    const lab = F.UI.label(V3(th.x, th.y + 1.6, th.z + 1.6), w, { kind: 'word', space: 'in' }); const tr = tryWord(lab, w); F.T.timeout(() => { if (tr) tr.remove(); lab.remove(); }, 8000);
    await K.hop(pop, 0.6, 600);
  },
});
// v5c WP-W2 (review X «fairy towns on a globe of the Earth»): the globe shows the real world – Norway and the seven continents – as a
// label she reads herself (tryRead: sounded out first, the whole word on the 2nd tap, hk_land clips); Feslandet's towns live on the map
const PLACE_W = ['Norge', 'Europa', 'Afrika', 'Asia', 'Nord-Amerika', 'Sør-Amerika', 'Australia', 'Antarktis'];
const landTpl = w => (F.TPL.has('hk_land') ? { tpl: 'hk_land', slots: { l: w } } : { tpl: null, slots: {} });
T('c_globus', {
  name: 'globusen', radius: 0.5,
  // v5c WP-W2 (hook #20, norge_og_verden): the first spin of the day says a true sentence about the Earth (one a day, in turn)
  hook: th => F.OBJ.trueLine(th, ['hk_jorda_rund', 'hk_jorda_hav', 'hk_verdensdeler'], { key: 'globus', vis: [t => { const g = part(t, 'globe'); SFX('whoosh'); return g ? K.spin(g, 2, 1600) : K.wobble(t.obj, 0.08, 600); }] }),
  async press(th) {
    const g = part(th, 'globe'); SFX('whoosh');
    const i = bump(th, 'spins') % PLACE_W.length;
    if (g) await K.spin(g, 3, 1800);
    const pw = PLACE_W[i], lab = F.UI.label(V3(th.x, th.y + 2.3, th.z), pw, { kind: 'plaque', space: 'in' });
    const tr = tryWord(lab, pw.toLowerCase(), landTpl(pw));
    F.T.timeout(() => { if (tr) tr.remove(); lab.remove(); }, 8000);
  },
});
T('c_stige', {
  name: 'stigen', radius: 0.4, solid: false,
  async press(th) {
    const l = part(th, 'ladder') || th.obj; SFX('creak'); bump(th, 'rolls');
    const x0 = l.position.x; const dir = (th.state.rolls % 2) ? 1 : -1;
    await tween(1200, k => { l.position.x = x0 + dir * Math.sin(k * Math.PI) * 2.2; });
    l.position.x = x0; SFX('thud');
  },
});
T('c_lesestol', {
  name: 'lesestolen', radius: 0.8, home: ['F78'], homePlace: 'bibliotek',
  async press(th) {
    const b = part(th, 'book'); SFX('rustle'); bump(th, 'sits');
    if (b) await tween(700, k => { b.position.y = Math.sin(k * Math.PI) * 0.5; b.rotation.y = k * Math.PI * 2; });
    const av = F.Player.avatar; if (av) await tween(800, k => { av.position.y = -Math.sin(k * Math.PI) * 0.25; });
    say('castle_fint');
  },
});
T('lampe', {
  name: 'lampa', radius: 0.4,
  build(th) { return M(th, 'lampe', { on: !!th.state.on }); },
  init(th) { const g = part(th, 'glow'); if (g) g.visible = !!th.state.on; },
  async press(th) {
    const on = toggle(th, 'on'); SFX(on ? 'pling' : 'click');
    const gl = part(th, 'glow'); if (gl) gl.visible = on;
    const s = part(th, ['shade', 'skjerm']);
    if (s) { const fresh = M(th, 'lampe', { on }); const np = fresh.userData.parts && (fresh.userData.parts.shade || fresh.userData.parts.skjerm); if (np) { while (s.children.length) s.remove(s.children[0]); np.children.slice().forEach(c => { s.add(c); c.userData.thing = th; }); } }
    if (on) K.sparkle(K.wpos(th, 2.2), 0xfff4a0);
    if (R() < 0.12) { const lb = K.model('tmp_letterblk', { c: 'red' }); lb.scale.setScalar(0.5); K.temp(th, lb, 0.2, 2.6, 0.2, 2000); }
    await K.sleep(400);
  },
});
T('c_skrivepult', {
  name: 'skrivepulten', radius: 0.8,
  async press(th) {
    const q = part(th, 'quill'); SFX('rustle'); bump(th, 'writes');
    if (q) await tween(1200, k => { q.rotation.z = Math.sin(k * Math.PI * 8) * 0.3; q.position.x = Math.sin(k * Math.PI * 2) * 0.15; });
    const made = (F.save.words && F.save.words.made) || {}; const words = Object.keys(made);
    const w = words.length ? words[words.length - 1] : null;
    if (w) { const lab = F.UI.label(V3(th.x, th.y + 1.2, th.z + 0.3), w, { kind: 'word', space: 'in' }); const tr = tryWord(lab, w); F.T.timeout(() => { if (tr) tr.remove(); lab.remove(); }, 8000); }
    else K.sparkle(K.wpos(th, 1.1), 0xffd84a);
  },
});

/* ====================================================================== MUSIKKROMMET (15) */
T('piano', {
  name: 'pianoet', radius: 1.2,
  async press(th) {
    const k = part(th, 'keys'); const n = bump(th, 'notes');
    const TUNE = [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0];
    if (n % 5 === 0) { say('castle_piano'); for (let i = 0; i < TUNE.length; i++) { SFX('piano', F.note(TUNE[i] + 12)); if (k) K.hop(k, -0.02, 120); await K.sleep(230); } notes(th, 5, 2); }
    else { SFX('piano', F.note(TUNE[(n * 3) % TUNE.length] + 12)); if (k) await K.hop(k, -0.03, 200); notes(th, 1, 2); }
  },
});
T('c_xylofon', {
  name: 'xylofonen', radius: 1.0, learn: ['F21'],
  async press(th) { if (await learnFirst(th, t => t.def.playFx(t))) return; return th.def.playFx(th); },
  async playFx(th) {
    bump(th, 'plays');                      // natural 11.10.: one note per bar, the label shows the bar – no «Fra 1 til 11!»
    th.obj.updateMatrixWorld(true);
    const lab = F.UI.label(K.wpos(th, 1.2), '1', { kind: 'num', space: 'in' });   // v5 WP-W: the bars count 1–11 (natural), not 10–20
    for (let i = 0; i < 11; i++) {
      const b = part(th, 'bar' + i); SFX('tone', F.note(i * 2 - 3 + 12), 0.4, 'sine', 0.1);
      if (b) { K.hop(b, -0.03, 160); lab.anchor = b.getWorldPosition(new THREE.Vector3()).add(V3(0, 0.55, 0)); }
      lab.set(String(1 + i)); lab.el.classList.add('glow');
      await K.sleep(330);
    }
    F.T.timeout(() => lab.remove(), 700);
  },
});
T('floyte', {
  name: 'fløyta', radius: 0.3, solid: false,
  async press(th) {
    const f = part(th, ['floyte', 'flute']); bump(th, 'trills');
    if (f) await K.hop(f, 0.12, 250);
    for (let i = 0; i < 8; i++) { SFX('tone', F.note(19 + (i % 2) * 2), 0.12, 'sine', 0.07); if (f) f.rotation.z = Math.sin(i) * 0.1; await K.sleep(110); }
    if (f) f.rotation.z = 0; notes(th, 4, 1.1);
  },
});
T('c_trommesett', {
  name: 'trommesettet', radius: 1.0,
  async press(th) {
    const c = part(th, 'cymbal'), t = part(th, 'tom'), sti = part(th, 'stikker'); say('castle_tromme'); bump(th, 'rolls');
    for (let i = 0; i < 10; i++) { SFX('thud'); if (t) K.hop(t, 0.04, 90); if (sti) sti.rotation.z = (i % 2 ? 0.2 : -0.2); await K.sleep(90); }
    if (sti) sti.rotation.z = 0;
    SFX('noise', 0.6, 0.2, 6000, 0.6); if (c) K.swing(c, 0.25, 900, 'x', 3);
  },
});
T('c_notestativ', {
  name: 'notestativet', radius: 0.4,
  async press(th) {
    SFX('tune'); bump(th, 'hops');
    notes(th, 6, 2.0); const sh = part(th, 'sheet'); await (sh ? K.swing(sh, 0.1, 900, 'x', 3) : K.wobble(th.obj, 0.08, 700));
  },
});

/* ====================================================================== SKATTKAMMERET (16) */
T('c_myntverk', {
  name: 'myntverket', radius: 1.0, learn: ['F11'], home: ['F43'], homePlace: 'myntverket',
  async press(th) { if (await learnFirst(th, t => t.def.playFx(t))) return; return th.def.playFx(th); },
  async playFx(th) {
    const w = part(th, 'wheel'), lv = part(th, 'lever'), fl = part(th, 'flap'); bump(th, 'runs');
    if (lv) { await K.rotTo(lv, 'x', -0.8, 250); F.T.timeout(() => K.rotTo(lv, 'x', 0, 300), 600); }
    const g = new THREE.Group(); g.position.set(-0.9, 1.6, 0.6); th.obj.add(g);
    for (let i = 0; i < 10; i++) { const c = K.model('tmp_coin', {}); c.rotation.x = Math.PI / 2; c.position.set(i * 0.2, 0, 0); g.add(c); SFX('coin'); await K.sleep(90); }
    if (w) K.spin(w, 3, 1200, 'x');
    await tween(700, k => { g.children.forEach((c, i) => { c.position.x = i * 0.2 * (1 - k) + 0.9 * k; c.position.y = -k * 0.6; }); });
    th.obj.remove(g); SFX('tone', 300, 0.6, 'sawtooth', 0.03);
    if (fl) { K.rotTo(fl, 'x', 1.2, 250); F.T.timeout(() => K.rotTo(fl, 'x', 0, 300), 1500); }
    const big = K.model('tmp_coin10', {}); big.rotation.x = Math.PI / 2; big.scale.setScalar(1.6); K.temp(th, big, 0, 0.25, 1.0, 2800);
    await tween(700, k => { big.position.z = 1.0 + k * 0.8; big.rotation.y = k * 6; }); SFX('coins', 3);
  },
});
T('c_kiste', {
  name: 'kista', radius: 0.7, learn: ['F14'],
  async press(th) {
    // learning spot: the number lock (F14). natural 11.10. (verify round 2): like every castle learning thing, her tap only rattles the
    // lock – a due lock shows the gold ★ note (learnFirst), and the note opens the task; solving it opens the lid and gives a coin
    await learnFirst(th, async t => {
      bump(t, 'opened');
      await F.BEH.runList(t, [['open', { part: 'lid', axis: 'x', angle: -1.9, hold: 1800, sound: 'creak' }], ['fx', { kind: 'gold', n: 40 }], ['coin']], { noSurprise: true });
    });
    const l = part(th, 'lid'), lk = part(th, 'lock'); SFX('creak'); bump(th, 'tries');
    // v3 §8.7: during the play break the lock is «for later» – said once, with an hourglass sparkle, not as an unsolvable problem
    const brk = F.Quest && F.Quest.canOfferTask && !F.Quest.canOfferTask();
    if (brk) lockLater(th); else say('castle_kiste');
    if (lk) await K.swing(lk, 0.4, 700, 'z', 3);
    if (l) { await K.rotTo(l, 'x', -0.2, 200); await K.rotTo(l, 'x', 0, 200); }
    K.sparkle(K.wpos(th, 0.6), 0xffd84a);
  },
});
// the hourglass: a small gold-and-glass timer that pops up over a locked learning spot during the play break (sand runs, then it fades)
D('tmp_timeglass', [5, 8, 5], 1 / 12, v => { v.box(0, 0, 0, 4, 0, 4, 'gold'); v.box(0, 7, 0, 4, 7, 4, 'gold'); v.box(1, 1, 1, 3, 2, 3, 'glass'); v.box(2, 3, 2, 2, 4, 2, 'glass'); v.box(1, 5, 1, 3, 6, 3, 'glass'); v.box(1, 1, 1, 3, 1, 3, 'sand'); v.box(1, 5, 1, 3, 6, 3, 'sand'); for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]) v.box(x, 1, z, x, 6, z, 'woodDark'); });
function lockLater(th) {
  const said = F.T.now - (lockLater.t || -99) > 30; lockLater.t = said ? F.T.now : lockLater.t;
  if (said) { const id = F.TPL.has('obj_las_senere') ? 'obj_las_senere' : 'castle_kiste'; say(id); }
  const hg = K.model('tmp_timeglass', {}); hg.scale.setScalar(2.2); K.temp(th, hg, 0, 1.6, 0.3, 2600);
  tween(2400, k => { hg.rotation.z = k < 0.15 ? Math.PI * k / 0.15 : Math.PI; hg.position.y = 1.6 + Math.sin(k * Math.PI) * 0.15; });
  for (let i = 0; i < 4; i++) F.T.timeout(() => K.sparkle(K.wpos(th, 1.6), 0xffe9a0), i * 500);
}
TH.lockLater = lockLater;
T('c_myntstabel', {
  name: 'myntstablene', radius: 0.6,
  init(th) { if (!part(th, 'stack0')) stackCoins(th, 0); },
  async press(th) {
    SFX('coins', 6); bump(th, 'topples');
    const s0 = part(th, 'stack0'), s1 = part(th, 'stack1');
    if (s0) {
      await Promise.all([K.rotTo(s0, 'z', 1.4, 400), s1 ? K.rotTo(s1, 'z', -1.4, 450) : null]);
      await K.sleep(400);
      s0.rotation.z = 0; s0.scale.y = 0.1; if (s1) { s1.rotation.z = 0; s1.scale.y = 0.1; }
      for (let i = 1; i <= 10; i++) { s0.scale.y = i / 10; SFX('coin'); await K.sleep(160); }   // natural 11.10.: silent
      if (s1) await tween(500, k => { s1.scale.y = 0.1 + 0.9 * k; });
      return;
    }
    const g = th._stack; if (g) await tween(500, k => { g.children.forEach((c, i) => { c.position.x += (Math.sin(i * 7) * 0.02) * k * 3; c.position.y = Math.max(0.05, c.userData.y0 * (1 - k)); }); });
    const n = natN(th, 3, 12);       // v5c WP-W2 (hook #7): a natural heap, not v1's 10–20
    stackCoins(th, n); SFX('coins', 4);
    await K.sleep(1200);
  },
});
function stackCoins(th, n) {
  if (th._stack) th.obj.remove(th._stack);
  const g = new THREE.Group(); th._stack = g; th.obj.add(g);
  n = n || 13;
  for (let i = 0; i < n; i++) { const t = Math.floor(i / 10), k = i % 10; const c = K.model('tmp_coin', {}); c.scale.setScalar(1.3); c.userData.y0 = 0.1 + k * 0.09; c.position.set(-0.3 + t * 0.6, c.userData.y0, 0); g.add(c); }
  g.children.forEach(c => { c.userData.thing = th; c.traverse(m => m.userData.thing = th); });
  th.bboxDirty = true;
}
T('c_sparebosser', {
  name: 'sparebøssene', radius: 1.1, learn: ['F13'],
  init(th) { const W = [['Kongen', 'sky'], ['Dronningen', 'pink'], ['Mia', 'butter']]; void W; },
  async press(th) { if (await learnFirst(th, (t, it) => t.def.playFx(t, it.target))) return; return th.def.playFx(th); },
  async playFx(th, nn) {
    SFX('coin'); bump(th, 'shakes');
    const pg = part(th, 'pig' + (th.state.shakes % 3)); await (pg ? K.wobble(pg, 0.15, 600) : K.wobble(th.obj, 0.08, 600));
    const r = rise(th, 'mynt', 'tmp_coin', (nn >= 1 && nn <= 20) ? nn : natN(th, 3, 12), { y: 1.9, z: 0.3, s: 1.3, sp: 0.18 });
    await r;
  },
});
/* v5c WP-W2 (longevity hook #25, MØNSTER): the jewel box is a home of F58 «Perlemakeren» – once a day, at her level, never in the play
   break. Payoff when she made the pattern herself: her necklace (the same pattern) lies on the open box and stays (th.state.smykke). */
const BEAD_COLS = [0xff5fa2, 0x5fd0ff, 0xf5c542, 0x8cff7a, 0xb197fc, 0xffffff];
function patternCols(item) {
  const p = (item && item.params) || {}, seq = [].concat(p.shown || [], Array.isArray(item && item.target) ? item.target : []).slice(0, 12);
  const map = new Map(), key = t => (t && typeof t === 'object') ? JSON.stringify(t) : String(t);
  return seq.map(t => { const k = key(t); if (!map.has(k)) map.set(k, map.size % BEAD_COLS.length); return map.get(k); });
}
function drawNecklace(th, idx, animate) {
  if (th._neck) { th.obj.remove(th._neck); th._neck = null; }
  if (!idx || idx.length < 3) return;
  const g = new THREE.Group(); g.name = 'smykke'; th._neck = g; const sy = th.obj.scale.y || 1, n = idx.length;
  idx.forEach((c, i) => {
    const a = Math.PI * (0.15 + 0.7 * i / Math.max(1, n - 1));
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 / sy, 8, 6), new THREE.MeshLambertMaterial({ color: BEAD_COLS[c % BEAD_COLS.length] }));
    m.position.set(-Math.cos(a) * 0.38 / sy, 0.62 / sy - Math.sin(a) * 0.2 / sy, 0.34 / sy); g.add(m);
    if (animate) { m.scale.setScalar(0.01); F.T.timeout(() => { SFX('pling', i % 8); tween(240, k => m.scale.setScalar(Math.max(0.01, K.ease.back(k)))); }, 180 * i); }
  });
  g.traverse(o => { o.userData.thing = th; }); th.obj.add(g); th.bboxDirty = true;
}
async function necklacePayoff(th, res, item) {
  const idx = patternCols(item); if (idx.length < 3) return K.burst(K.wpos(th, 0.7), { n: 30, speed: 1.6, up: 2.4, life: 1.2 });
  const l = part(th, 'lid'); if (l) await K.rotTo(l, 'x', -1.3, 400);
  F.Things.setState(th, { smykke: idx });
  drawNecklace(th, idx, true);
  await K.sleep(180 * idx.length + 300);
  K.burst(K.wpos(th, 0.7), { n: 30, colors: [0xff5fa2, 0x5fd0ff, 0xf5c542, 0xffffff], speed: 1.6, up: 2.4, life: 1.2, size: 0.06 });
  if (F.TPL.has('castle_juvel_smykke')) await say('castle_juvel_smykke');
}
T('c_juvelskrin', {
  name: 'juvelskrinet', radius: 0.4, solid: false,
  init(th) { try { if (th.state.smykke) drawNecklace(th, th.state.smykke, false); } catch (e) { console.error('juvelskrin', e); } },
  hook: th => F.OBJ.ask(th, 'juvelskrin', ['F58'], { after: necklacePayoff }),
  async press(th) {
    const l = part(th, 'lid'); SFX('crystal'); bump(th, 'opens');
    if (l) await K.rotTo(l, 'x', -1.3, 400);
    K.burst(K.wpos(th, 0.7), { n: 40, colors: [0xff5fa2, 0x5fd0ff, 0x8cff7a, 0xf5c542, 0xffffff], speed: 2, up: 3, life: 1.3, size: 0.07 });
    await K.sleep(1200); if (l) K.rotTo(l, 'x', 0, 400);
  },
});

/* ====================================================================== ORDMUSEET (17) */
const PED_ROWS = 3, PED_COLS = 8;
T('c_sokkel', {
  name: 'sokkelen', radius: 0.35, solid: false, surprise: false,
  init(th) { th.labelY = 1.5; },
  tick(th, dt, t) { if (th._star && !th.hidden) { th._star.rotation.y = t * 1.6; th._star.position.y = (th.parts && th.parts.top ? 0.25 : 1.25) + Math.sin(t * 2.2 + th.data.i) * 0.06; } if (th._m && !th.busy && !th.hidden) th._m.rotation.y = Math.sin(t * 0.6 + th.data.i) * 0.35; },
  async press(th) {
    bump(th, 'looks');
    const w = th.word;
    if (!w) {   // the hint line once per visit to Ordmuseet (it played 11× in a row over the empty plinths)
      K.sparkle(K.wpos(th, 1), 0xffd84a); SFX('sparkle');
      if (sokkelSaid !== museumVisit) { sokkelSaid = museumVisit; const v = museumVisit; say('castle_tomt_sokkel').then(okk => { if (!okk && sokkelSaid === v) sokkelSaid = -1; }); }
      await K.sleep(400); return;
    }
    SFX('chime'); const tp = part(th, 'top'); if (tp) K.spin(tp, 1, 1400); else if (th._m) K.spin(th._m, 1, 1400);
    // v3 §8.6 try first: the word is never read aloud before she tried (1st tap sounds it out, 2nd tap says it – WP5 tryRead)
    if (th._tr && th._tr.press) { await th._tr.press(); return; }
    if (th.label) { th.label.el.classList.add('glow'); F.T.timeout(() => th.label && th.label.el.classList.remove('glow'), 3000); }
  },
});
T('c_ordbok', {
  name: 'ordboka', radius: 0.6,
  async press(th) {
    const p = part(th, 'page'); SFX('rustle'); say('castle_ordbok');
    const pages = Math.max(1, Math.ceil(museumWords().length / (PED_ROWS * PED_COLS)));
    const pg = (museumPage + 1) % pages; F.Things.setState(th, { page: pg, turns: (th.state.turns || 0) + 1 });
    if (p) await tween(600, k => { p.rotation.z = k * Math.PI; }); if (p) p.rotation.z = 0;
    fillMuseum(pg);
    // the page number (1, 2, 3 …) floats over the book for a moment
    if (pages > 1) { const lab = F.UI.label(K.wpos(th, 2.2), String(pg + 1), { kind: 'num', space: 'in' }); F.T.timeout(() => lab.remove(), 2200); }
    K.sparkle(K.wpos(th, 1.6), 0xffd84a);
  },
});
// every word she has made real, newest first: progress.js's museum feed (sorted by last cast), then anything else in the wand's log
function museumWords() {
  const out = [], seen = new Set();
  const add = w => { w = w && String(w).toLowerCase(); if (w && !seen.has(w)) { seen.add(w); out.push(w); } };
  try { if (F.Prog && F.Prog.museum) { const m = F.Prog.museum(); if (Array.isArray(m)) m.forEach(x => add(typeof x === 'string' ? x : (x && (x.w || x.word)))); } } catch (e) { /* progress not ready */ }
  const made = (F.save.words && F.save.words.made) || {};
  Object.keys(made).reverse().forEach(add);
  return out;
}
C.museumWords = museumWords;
let museumPage = 0;
function fillMuseum(page) {
  const peds = F.Things.list.filter(t => t.type === 'c_sokkel').sort((a, b) => a.data.i - b.data.i);
  const words = museumWords(), per = PED_ROWS * PED_COLS;
  const pages = Math.max(1, Math.ceil(words.length / per));
  page = museumPage = ((page | 0) % pages + pages) % pages;
  // only the filled pedestals and the next 3 stand in the room (fix_wp1 #6: no field of blank pillars); a gold star waits on each of the
  // next 3 ("your next word goes here"), the first one the biggest
  const nextI = words.length - page * per, shown = Math.min(per, Math.max(0, nextI) + 3);
  let moved = false;
  peds.forEach((th, i) => {
    const off = i >= shown; if (!!th.offStage !== off) { th.offStage = off; moved = true; }
    const want = i >= nextI && i < nextI + 3, sz = i === nextI ? 2.0 : 1.35;
    if (th._star && (!want || th._starS !== sz)) { if (th._star.parent) th._star.parent.remove(th._star); th._star = null; }
    if (want && !th._star) { const st = K.model('tmp_star', { c: 'gold' }); st.scale.setScalar(sz); th._starS = sz; const tp = th.parts && th.parts.top; (tp || th.obj).add(st); st.position.y = (tp ? 0.25 : 1.25); th._star = st; st.traverse(o => { o.userData.thing = th; }); }
  });
  if (moved && F.Bld && F.Bld.updateVis) F.Bld.updateVis(true);
  peds.forEach((th, i) => {
    const w = words[page * per + i] || null;
    if (th.word === w) return;
    th.word = w;
    if (th._m) { if (th._m.parent) th._m.parent.remove(th._m); th._m = null; }
    if (th._tr) { th._tr.remove(); th._tr = null; }
    if (th.label) { th.label.remove(); th.label = null; }
    if (w) {
      const m = has(w) ? F.VOX.make(w, {}) : K.model('tmp_letterblk', { c: 'butter' });
      const bb = new THREE.Box3().setFromObject(m); const s = bb.isEmpty() ? 1 : Math.min(1.5, 0.55 / Math.max(0.05, bb.max.y - bb.min.y), 0.6 / Math.max(0.05, bb.max.x - bb.min.x));
      m.scale.setScalar(s);
      const top = th.parts && th.parts.top; const host = top || th.obj;
      if (th._topY == null) { const b2 = new THREE.Box3().setFromObject(th.obj); th._topY = b2.isEmpty() ? 0.9 : b2.max.y - th.obj.position.y; }
      m.position.y = top ? th._topY - top.position.y : th._topY; host.add(m); th._m = m; m.traverse(o => { o.userData.thing = th; });
      th.label = F.UI.label(V3(th.x, th.y + 0.5, th.z + 0.42), w, { kind: 'word', space: 'in', size: 18, maxDist: 12 });
      th.labels = [th.label];
      if (th._tr) th._tr.remove(); th._tr = tryWord(th.label, w);
    } else th.labels = [];
    th.bboxDirty = true;
  });
}
F.on('cast', () => F.T.timeout(() => fillMuseum(0), 50));
F.on('museumNew', () => F.T.timeout(() => fillMuseum(0), 60));
// golden letters found in the world hang on the museum's back wall
D('tmp_gletter', [5, 7, 2], 1 / 10, (v, o) => { const g = F.VOX.FONT[String(o.ch || 'a').toUpperCase()] || F.VOX.FONT.A; v.box(0, 0, 0, 4, 6, 0, 'honey'); for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') v.set(1 + q, 5 - r, 1, 'gold'); });
let goldGroup = null;
function showGolden() {
  const r = C.rooms.ordmuseum; if (!r || !r.group) return;
  if (goldGroup) r.group.remove(goldGroup);
  goldGroup = new THREE.Group(); r.group.add(goldGroup);
  // between the two windows: 8 per row, 4 rows (the whole alphabet fits), in the order she found them
  const L = (F.save.golden || []).slice(0, 32);
  L.forEach((ch, i) => { const m = K.model('tmp_gletter', { ch }); m.scale.setScalar(0.9); const row = Math.floor(i / 8), col = i % 8; m.position.set(r.col * C.PX + 4.9 + col * 0.6, r.floor * C.FH + 3.9 - row * 0.75, 0.56); goldGroup.add(m); });
}
F.on('goldenLetter', () => { showGolden(); if (goldGroup && goldGroup.children.length && C.cur === 'ordmuseum') { const m = goldGroup.children[goldGroup.children.length - 1]; K.sparkle(m.getWorldPosition(V3(0, 0, 0)), 0xffd84a); } });
F.on('castleReady', () => F.T.timeout(showGolden, 10));
let museumVisit = 0, sokkelSaid = -1;
F.on('roomEntered', id => { if (id === 'ordmuseum') { museumVisit++; fillMuseum(0); } });

/* ====================================================================== PRINSESSENS ROM (18) */
T('c_miaseng', {
  name: 'Mias seng', radius: 1.2,
  hook: th => F.OBJ.trueLine(th, 'hk_sovn', { vis: [t => { const p = part(t, 'pillows'); SFX('boing'); return p ? K.hop(p, 0.2, 500) : K.wobble(t.obj, 0.05, 500); }] }),   // v5c WP-W2: «Søvn hjelper kroppen å vokse.»
  async press(th) {
    const p = part(th, 'pillows'); const n = Math.min(4, bump(th, 'bounces') % 5 + 1); say('castle_seng'); SFX('boing');
    const av = F.Player.avatar; if (av) await tween(600, k => { av.position.y = Math.sin(k * Math.PI) * (0.6 + n * 0.35); });
    if (p) K.hop(p, 0.3 + n * 0.1, 500);
    for (let i = 0; i < n * 2; i++) { const f = K.model('tmp_feather', {}); K.temp(th, f, (R() - 0.5) * 1.2, 1, (R() - 0.5), 2200); const vx = (R() - .5); F.T.tween(2000, k => { f.position.y = 1 + Math.sin(k * Math.PI) * 1.4 - k * 0.6; f.position.x += vx * 0.01; f.rotation.z = Math.sin(k * 10) * 0.6; }); }
  },
});
T('c_dukkehus', {
  name: 'dukkehuset', radius: 1.0,
  async press(th) {
    SFX('magic'); say('castle_dukkehus'); bump(th, 'peeks');
    const fr = part(th, 'front'); if (fr) { await K.rotTo(fr, 'y', -1.8, 600); F.T.timeout(() => { fr.rotation.y = 0; }, 1500); } else await K.hop(th.obj, 0.2, 400);
    K.sparkle(K.wpos(th, 1.6), 0xc6a8ff);
    await K.sleep(500);
    C.overview(true);
  },
});
T('c_gyngehest', {
  name: 'gyngehesten', radius: 0.8,
  async press(th) {
    const h = part(th, 'horse') || th.obj; SFX('neigh'); say('castle_gyngehest'); bump(th, 'rocks');
    await K.swing(h, part(th, 'horse') ? 0.25 : 0.35, 2600, has('c_gyngehest') ? 'z' : 'x', 4);
  },
});
const TOYS = [['ball', 'tmp_bubble'], ['bamse', 'tmp_bamse'], ['dukke', 'tmp_bamse'], ['drage', 'tmp_star'], ['bil', 'tmp_letterblk']];
// v5c WP-W2 (hook #25, LOGIKK / DATA / ORD sorting): the toy chest is a home of F71 «Sorteringskassene» (once a day). Payoff when she
// sorted it herself: the toys hop into the chest one kind at a time and the lid closes on a tidy chest.
async function tidyChest(th) {
  const l = part(th, 'lid'); SFX('creak'); if (l) await K.rotTo(l, 'x', -1.4, 400);
  for (let i = 0; i < TOYS.length; i++) {
    const toy = tmpItem(TOYS[i][0], {}, TOYS[i][1], {}); const bb = new THREE.Box3().setFromObject(toy); toy.scale.setScalar(Math.min(1.4, 0.45 / Math.max(0.05, bb.max.y - bb.min.y)));
    const x0 = -1.2 + i * 0.6; K.temp(th, toy, x0, 0.2, 1.1, 1500);
    await tween(420, k => { toy.position.set(x0 * (1 - k), 0.2 + Math.sin(k * Math.PI) * 0.9, 1.1 * (1 - k) + 0.1 * k); });
    toy.visible = false; SFX('pling', i);
  }
  if (l) await K.rotTo(l, 'x', 0, 400); SFX('thud');
  K.sparkle(K.wpos(th, 1.0), 0xfff2a8);
  if (F.TPL.has('castle_kiste_rydd')) await say('castle_kiste_rydd');
}
T('c_lekekiste', {
  name: 'lekekista', radius: 0.8,
  hook: th => F.OBJ.ask(th, 'lekekiste', ['F71'], { after: tidyChest }),
  async press(th) {
    const l = part(th, 'lid'); SFX('creak');
    const i = bump(th, 'opens') % TOYS.length;
    if (l) await K.rotTo(l, 'x', -1.4, 400);
    const toy = tmpItem(TOYS[i][0], {}, TOYS[i][1], {}); const bb = new THREE.Box3().setFromObject(toy); toy.scale.setScalar(Math.min(1.6, 0.6 / Math.max(0.05, bb.max.y - bb.min.y)));
    K.temp(th, toy, 0, 0.8, 0.2, 3000); SFX('boing');
    await tween(700, k => { toy.position.set(0, 0.8 + Math.sin(k * Math.PI) * 1.1, 0.2 + k * 1.2); toy.rotation.y = k * 6; });
    await K.sleep(600); if (l) K.rotTo(l, 'x', 0, 400);
  },
});
T('bamse', {
  name: 'bamsen', radius: 0.4,
  async press(th) {
    SFX('squeak'); bump(th, 'hugs');
    const aL = part(th, 'armL'), aR = part(th, 'armR'), hd = part(th, 'head');
    if (aL && aR) { await tween(400, k => { aL.rotation.z = -0.6 * k; aR.rotation.z = 0.6 * k; if (hd) hd.rotation.z = 0.2 * Math.sin(k * Math.PI); }); F.T.timeout(() => tween(400, k => { aL.rotation.z = -0.6 * (1 - k); aR.rotation.z = 0.6 * (1 - k); }), 1400); }
    else await tween(600, k => { th.obj.scale.set(1 + Math.sin(k * Math.PI) * 0.25, 1 - Math.sin(k * Math.PI) * 0.12, 1 + Math.sin(k * Math.PI) * 0.25); });
    hearts(th, 16, 0.9);
  },
});
T('c_gardin', {
  name: 'gardinene', radius: 0.4, solid: false,
  init(th) { const o = !!th.state.open; const L = part(th, 'shutterL'), Rr = part(th, 'shutterR'); if (L) L.scale.x = o ? 0.35 : 1; if (Rr) Rr.scale.x = o ? 0.35 : 1; },
  async press(th) {
    const open = toggle(th, 'open'); SFX('swish');
    const L = part(th, 'shutterL'), Rr = part(th, 'shutterR');
    await tween(600, k => { const s = open ? 1 - 0.65 * k : 0.35 + 0.65 * k; if (L) L.scale.x = s; if (Rr) Rr.scale.x = s; });
    if (open) { const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.rotation.x = -0.9; K.temp(th, beam, 0, 0.4, 1.2, 4000); }
  },
});
const MIA_WRONG = [['kat', 'katt'], ['hes', 'hest'], ['sool', 'sol'], ['bal', 'ball']];
// the word is written ON the board (canvas texture at board scale, fix_wp1 #7): the right spelling, and Mia's wrong one only while
// the F37 «Mias feil» task runs
function boardWord(th, w, wrong) {
  if (!th.obj || !w) return;
  if (!th._bc) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(0, 1.28, 0.075); m.renderOrder = 2; m.userData.thing = th; th.obj.add(m); th._bc = { cv, tex, m };
  }
  const { cv, tex } = th._bc, x = cv.getContext('2d');
  x.clearRect(0, 0, cv.width, cv.height);
  const fam = (getComputedStyle(document.body).fontFamily || 'sans-serif');
  let px = 88; x.font = 'bold ' + px + 'px ' + fam; while (x.measureText(w).width > 230 && px > 40) { px -= 6; x.font = 'bold ' + px + 'px ' + fam; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.fillStyle = wrong ? '#d9467e' : '#3d5fb8'; x.fillText(w, 128, 66);
  tex.needsUpdate = true; th._bw = w; th._bwWrong = !!wrong;
}
T('c_miatavle', {
  name: 'Mias tavle', radius: 0.6, learn: ['F37'],
  init(th) { const i = (th.state.k || 0) % MIA_WRONG.length; th.labels = []; boardWord(th, MIA_WRONG[i][1], false); },
  // after F37 (she fixed Mia's spelling) the right word stays on the board, with hearts from Mia
  async press(th) {
    if (await learnFirst(th, async (t, it) => { if (it.word) boardWord(t, String(it.word), false); hearts(t, 16, 1.5); SFX('chime'); K.burst(K.wpos(t, 1.3), { n: 16, colors: [0xffffff, 0xffd84a], speed: 0.8, up: 1.2, life: 0.9, size: 0.05 }); })) return;
    return th.def.playFx(th);
  },
  async playFx(th) {
    SFX('rustle');
    const k = bump(th, 'k'); const i = k % MIA_WRONG.length;
    const ch = part(th, 'chalk'); if (ch) tween(900, q => { ch.position.x = Math.sin(q * Math.PI * 6) * 0.08; }); else await K.wobble(th.obj, 0.05, 500);
    // Mia writes her next word (spelled right); her mistakes only show up in the F37 task (FORMATS-W), where she gets to fix them
    boardWord(th, MIA_WRONG[i][1], false);
    K.burst(K.wpos(th, 1.3), { n: 12, colors: [0xffffff], speed: 0.6, up: 1, life: 0.8, size: 0.05 });
  },
});
// F37 on the board: the wrong spelling while the task runs, the fixed word afterwards
F.on('taskStart', item => {
  if (!item || item.format !== 'F37') return;
  F.T.timeout(() => {
    const th = F.Things.list.find(t => t.type === 'c_miatavle'); if (!th) return;
    const bad = item.distractors && item.distractors[0] && item.distractors[0].v;
    if (bad) { boardWord(th, String(bad), true); th._f37 = item; }
  }, 120);
});
F.on('taskEnd', item => {
  const th = F.Things.list.find(t => t.type === 'c_miatavle'); if (!th || !th._f37) return;
  const w = item && (item.word || item.w || (item.answer && item.answer.v) || item.target);
  th._f37 = null;
  boardWord(th, typeof w === 'string' && w ? w : MIA_WRONG[(th.state.k || 0) % MIA_WRONG.length][1], false);
});
T('c_akvarium', {
  name: 'akvariet', radius: 0.8,
  hook: th => F.OBJ.animalX(th, 'gullfisk', { vis: { '*': [t => { SFX('drip'); for (let i = 0; i < 4; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.3); K.temp(t, b, (R() - 0.5) * 0.8, 0.9, 0.2, 1500); F.T.tween(1400, k => { b.position.y = 0.9 + k * 0.7; }); } return K.sleep(400); }] } }),   // v5c WP-W2 (hook #2)
  tick(th, dt, t) { const f = part(th, 'fish'); if (f && !th.busy) { f.position.x = Math.sin(t * 0.8) * 0.4; f.rotation.y = Math.cos(t * 0.8) > 0 ? 0 : Math.PI; } },
  async press(th) {
    const f = part(th, 'fish'); SFX('drip'); bump(th, 'feeds');
    if (f) await tween(1200, k => { f.position.x = 0.5 * Math.sin(k * Math.PI); f.position.z = 0.25 * Math.sin(k * Math.PI); f.position.y = 0.1 * Math.sin(k * Math.PI * 4); });
    for (let i = 0; i < 4; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.3); K.temp(th, b, (R() - 0.5) * 0.8, 0.9, 0.2, 1500); F.T.tween(1400, k => { b.position.y = 0.9 + k * 0.7; }); }
  },
});

/* ====================================================================== KONGEPARETS SOVEROM (19) */
T('c_himmelseng', {
  name: 'himmelsengen', radius: 1.6, reach: 2.6,
  hook: th => F.OBJ.trueLine(th, 'hk_sovn', { vis: [t => { const p = part(t, 'pillows'); SFX('boing'); return p ? K.hop(p, 0.2, 500) : K.wobble(t.obj, 0.05, 500); }] }),   // v5c WP-W2: «Søvn hjelper kroppen å vokse.»
  async press(th) {
    const p = part(th, 'pillows'); SFX('boing'); say('castle_fjaer'); bump(th, 'fights');
    if (p) K.hop(p, 0.8, 700);
    for (let i = 0; i < 14; i++) { const f = K.model('tmp_feather', {}); K.temp(th, f, (R() - 0.5) * 2.4, 1.2, (R() - 0.5) * 1.6, 3000); const ph = R() * 6; F.T.tween(2900, k => { f.position.y = 1.2 + Math.sin(k * Math.PI) * 1.8 - k * 0.4; f.rotation.z = Math.sin(k * 8 + ph) * 0.8; }); }
    await K.sleep(1200);
  },
});
T('c_tofler', {
  name: 'tøflene', radius: 0.3, solid: false,
  async press(th) {
    const l = part(th, 'left'), r = part(th, 'right'); bump(th, 'walks');
    for (let i = 0; i < 6; i++) { const p = i % 2 ? r : l; if (p) { SFX('step'); await tween(220, k => { p.position.z += 0.025; p.position.y = Math.sin(k * Math.PI) * 0.08; }); } }
    await K.sleep(300); if (l) { l.position.z = 0; } if (r) { r.position.z = 0; }
  },
});
T('c_vugge', {
  name: 'vugga', radius: 0.7,
  async press(th) {
    const c = part(th, ['cradle', 'body']) || th.obj; SFX('tune'); bump(th, 'rocks');
    const mo = part(th, 'mobile'); if (mo) K.spin(mo, 2, 2600);
    const sw = K.swing(c, 0.18, 2600, 'z', 3);
    await K.sleep(800); SFX('giggle');
    await sw;
  },
});
T('c_stjernelampe', {
  name: 'stjernelampa', radius: 0.4,
  async press(th) {
    const s = part(th, 'star'); const on = toggle(th, 'on'); SFX(on ? 'crystal' : 'click');
    if (s) K.spin(s, 1, 900);
    if (on) {
      say('castle_stjerner');
      th._stars = th._stars || [];
      for (let i = 0; i < 12; i++) { const st = K.model('tmp_star', {}); st.position.set((R() - 0.5) * 9, 5.2 - th.y % 6 + (R() - 0.5) * 0.3 + 0, -3.5 + R() * 1.2); st.rotation.x = 0; th.obj.add(st); th._stars.push(st); st.scale.setScalar(0.01); F.T.tween(300, k => st.scale.setScalar(Math.max(0.01, k * 1.6))); await K.sleep(60); }
    } else { (th._stars || []).forEach(s2 => th.obj.remove(s2)); th._stars = []; }
  },
});
T('c_kongeskap', {
  name: 'kongeskapet', radius: 0.9,
  async press(th) {
    SFX('creak'); const k = bump(th, 'opens');
    await doorSwing(th, 'doorL', 'doorR', 1.4, 500);
    if (k % 6 === 0 || R() < 0.12) { const d = spawnTemp(th, 'hund', 'tmp_dog', {}, 0, 0.1, 0.5, 2600, 1.2); SFX('boing'); say('castle_tass'); await K.hop(d, 0.6, 500); }
    else K.burst(K.wpos(th, 1.8), { n: 14, colors: [0xe8484f, 0x6fa8ec, 0xf5c542], speed: 1, up: 1.2, life: 0.8 });
    await K.sleep(900); await doorSwing(th, 'doorL', 'doorR', 0, 500);
  },
});

/* ====================================================================== BADET (20) */
T('c_badekar', {
  name: 'badekaret', radius: 1.6, reach: 2.4,
  init(th) { const w = part(th, 'water'), lo = has('c_badekar') ? 1 : 0.1, hi = has('c_badekar') ? 2.6 : 1; if (w) w.scale.y = th.state.full ? hi : lo; const fo = part(th, 'foam'); if (fo) fo.visible = !!th.state.full; },
  async press(th) {
    const w = part(th, 'water'), fo = part(th, 'foam'); const full = toggle(th, 'full'); SFX(full ? 'pour' : 'drip');
    const lo = has('c_badekar') ? 1 : 0.1, hi = has('c_badekar') ? 2.6 : 1;
    if (fo) fo.visible = true;
    if (w) await tween(900, k => { w.scale.y = full ? lo + (hi - lo) * k : hi - (hi - lo) * k; if (fo) fo.position.y = (w.scale.y - lo) * 0.12; });
    if (fo && !full) fo.visible = false;
    if (full) {
      for (let i = 0; i < 6; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.5 + R() * 0.5); K.temp(th, b, (R() - 0.5) * 2.4, 0.95, (R() - 0.5) * 0.8, 3600); }
      const n = 3 + ((th.state.fills || 0) % 6); F.Things.setState(th, { fills: (th.state.fills || 0) + 1 });   // v5 WP-W: 3–8 rubber ducks
      await K.row(th, () => K.model(has('and') ? 'and' : 'tmp_c_gummiand', {}), n, { y: 1.0, z: 0, sp: 0.24, count: true, ttl: 4200, s: 0.55 });
    }
  },
});
T('c_sape', {
  name: 'såpa', radius: 0.3, solid: false,
  async press(th) {
    const s = part(th, 'soap'); SFX('swish'); say('castle_bobler'); bump(th, 'slides');
    if (s) await tween(700, k => { s.position.x = Math.sin(k * Math.PI) * 0.5; s.rotation.y = k * 3; });
    for (let i = 0; i < 6; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.3 + R() * 0.3); K.temp(th, b, (R() - 0.5) * 0.5, 0.4, 0.1, 1800); F.T.tween(1700, k => { b.position.y = 0.4 + k * 1.2; }); }
  },
});
T('speil', {
  name: 'speilet', radius: 0.3, solid: false,
  init(th) { const f = part(th, 'fog'); if (f) f.visible = !!th.state.fog; },
  async press(th) {
    const f = part(th, 'fog'); const fog = toggle(th, 'fog'); SFX(fog ? 'swish' : 'squeak');
    if (f) { f.visible = true; await tween(600, k => f.scale.setScalar(fog ? Math.max(0.01, k) : 1 - k * 0.99)); f.visible = fog; f.scale.setScalar(1); }
  },
});
T('c_gummiand', {
  name: 'gummianda', radius: 0.3, solid: false,
  async press(th) {
    SFX('squeak'); say('castle_kvakk'); bump(th, 'squeaks');
    const du = part(th, 'duck') || th.obj; await tween(200, k => { du.scale.y = 1 - 0.2 * Math.sin(k * Math.PI); }); await K.hop(du, 0.35, 380); await K.spin(du, 1, 500);
  },
});
T('c_vask', {
  name: 'vasken', radius: 0.6,
  // v5c WP-W2 (body deck): «Vi vasker hendene så vi ikke blir syke.» / «Tennene trenger puss to ganger om dagen.» (one a day)
  hook: th => F.OBJ.trueLine(th, ['hk_vaske', 'hk_tenner'], { key: 'vask', vis: [t => { SFX('pour'); for (let i = 0; i < 6; i++) { const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.3); K.temp(t, b, (R() - .5) * 0.6, 1.2, 0.2, 1400); F.T.tween(1300, k => { b.position.y = 1.2 + k * 0.6; }); } return K.sleep(500); }] }),
  async press(th) {
    SFX('pour'); bump(th, 'washes');
    const hv = part(th, 'handle'), wv = part(th, 'water'); if (hv) { K.rotTo(hv, 'y', 1, 300); F.T.timeout(() => K.rotTo(hv, 'y', 0, 300), 1300); } if (wv) { wv.visible = true; F.T.timeout(() => { wv.visible = !!th.state.keep; }, 1500); }
    for (let i = 0; i < 6; i++) { K.burst(K.wpos(th, 1.25), { n: 6, colors: [0x6fcaf0, 0xffffff], speed: 0.6, up: 1, life: 0.6, size: 0.05 }); const b = K.model('tmp_bubble', {}); b.scale.setScalar(0.3); K.temp(th, b, (R() - .5) * 0.6, 1.1, 0.1, 1500); F.T.tween(1400, k => { b.position.y = 1.1 + k * 0.9; }); await K.sleep(200); }
  },
});

/* ====================================================================== GARDEROBEN */
/* 12.10. economy plan §3.4: what she bought is worn here. The dress rack, the hat shelf and the shoe shelf each cycle their slot through
   what she owns and then back to none (her own look) – she can always change back. The Garderobe mirror: a small look panel for the
   other slots (wings, wand, neck, cape, hands) and her glitter trail. */
function wornNow() { const w = F.save.wear; return (w && !Array.isArray(w)) ? Object.values(w).filter(Boolean) : []; }
function cycleWear(slots) {
  if (!F.Fairy || !F.Fairy.wear || !F.Eco || !F.Eco.owned || !F.CAT) return null;
  const owned = F.CAT.filter(c => c.kind === 'wear' && slots.includes(c.slot) && F.Eco.owned(c.id) > 0).map(c => c.id);
  if (!owned.length) return null;
  const worn = wornNow(), cur = owned.find(id => worn.includes(id)) || null;
  const seq = owned.concat([null]), nx = seq[(seq.indexOf(cur) + 1) % seq.length];
  try { if (nx) F.Fairy.wear(nx); else F.Fairy.unwear(F.Fairy.slotOf ? F.Fairy.slotOf(cur) : slots[0]); } catch (e) { console.error(e); return null; }
  K.sparkle(V3(F.Player.pos.x, F.Player.pos.y + 1, F.Player.pos.z), 0xff7fb0);
  F.emit('wardrobe', slots[0], nx || null);
  return nx || 'none';
}
const LOOK_ROWS = [['vinger'], ['stav'], ['hals', 'kappe', 'hender'], ['sti']];
const lookItems = () => (F.CAT && F.Eco && F.Eco.owned) ? F.CAT.filter(c => F.Eco.owned(c.id) > 0 && ((c.kind === 'wear' && LOOK_ROWS.some(r => r.includes(c.slot))) || (c.kind === 'magic' && c.slot === 'sti'))) : [];
function lookPanel() {
  return new Promise(res => {
    const box = F.UI.el('div', 'lchooser llook');
    const left = F.UI.el('div', 'llook-me');
    const rows = F.UI.el('div', 'llook-rows');
    box.appendChild(left); box.appendChild(rows);
    const me = () => { left.innerHTML = ''; try { const kind = F.Fairy.cur ? F.Fairy.cur() : 'krystall'; left.appendChild(F.Thumb.img('ch_fairy', F.Fairy.look(kind, wornNow()), { size: 220, angle: 0.35 })); } catch (e) { /* no portrait */ } };
    const isOn = c => c.kind === 'magic' ? F.Eco.trail && F.Eco.trail() === c.id : wornNow().includes(c.id);
    const draw = () => {
      rows.innerHTML = '';
      for (const slots of LOOK_ROWS) {
        const own = lookItems().filter(c => slots.includes(c.slot)); if (!own.length) continue;
        const row = F.UI.el('div', 'lch-row');
        for (const c of own) {
          const b = F.UI.el('button', 'lch-item' + (isOn(c) ? ' cur' : '')); b.dataset.id = c.id;
          b.appendChild(F.Eco.thumb ? F.Eco.thumb(c.id, 104) : F.UI.el('div', '', c.word));
          b.onclick = e => { e.stopPropagation(); F.sfx.magic();
            if (c.kind === 'magic') { if (F.Eco.setTrail) F.Eco.setTrail(isOn(c) ? null : c.id); }
            else if (isOn(c)) F.Fairy.unwear(F.Fairy.slotOf ? F.Fairy.slotOf(c.id) : c.slot); else F.Fairy.wear(c.id);
            F.emit('wardrobe', c.slot, c.id); draw(); me(); };
          row.appendChild(b);
        }
        rows.appendChild(row);
      }
    };
    if (!document.getElementById('llook-css')) {
      const cs = document.createElement('style'); cs.id = 'llook-css';
      // one wrapping grid of tiles (slot groups in order), clear of the panel's ✕ (top right)
      cs.textContent = '.llook{display:flex;gap:18px;align-items:center}.llook-me img{width:220px;height:220px;border-radius:26px;background:radial-gradient(circle at 50% 60%,#fff,#efe6fb 72%)}' +
        '.llook-rows{display:flex;flex-wrap:wrap;align-content:flex-start;gap:10px;width:min(416px,46vw);max-height:min(430px,62vh);overflow-y:auto;margin-top:66px;padding:6px}.llook .lch-row{display:contents}' +
        '.llook .lch-item{width:124px;height:124px;padding:6px;min-width:0;min-height:0}.llook .lch-item img,.llook .lch-item .lthumb-missing{width:104px;height:104px}';
      document.head.appendChild(cs);
    }
    draw(); me();
    F.UI.open(box, { cls: 'life-panel', onClose: () => res() });
  });
}

T('c_kjolestativ', {
  name: 'kjolestativet', radius: 1.4, home: ['F56'], homePlace: 'vevrom',
  async press(th) {
    const d = part(th, 'dresses'); SFX('swish'); bump(th, 'slides');
    if (d) await tween(1400, k => { d.position.x = Math.sin(k * Math.PI * 2) * 0.6; d.children.forEach((c, i) => { c.rotation.z = Math.sin(k * Math.PI * 4 + i) * 0.05; }); });
    if (d) d.position.x = 0;
    cycleWear(['kjole']);     // 12.10.: her dresses in turn, then her own dress again (was: always the first dress)
  },
});
T('c_hattehylle', {
  name: 'hattehylla', radius: 0.4, solid: false,
  async press(th) {
    // 12.10. (economy plan §3.4): the hats, crowns and wreaths she bought – one tap = the next one on her head, then none again
    if (cycleWear(['hode'])) { SFX('boing'); const h0 = part(th, ['hat0', 'h0']); if (h0) await K.hop(h0, 0.25, 350); return; }
    const i = bump(th, 'hats') % 3; const h = part(th, ['hat' + i, 'h' + i]); SFX('boing'); say('castle_hatter');
    if (!h) return;
    // v3 §8.5: «Hatten hopper på!» – the hat really lands on her head for 3 s (it follows her), then hops back to the shelf
    const p0 = h.position.clone(), r0 = h.rotation.y;
    const onHead = () => h.parent ? h.parent.worldToLocal(headWorld().add(V3(0, -0.12, 0))) : p0.clone();
    await tween(700, k => { const tg = onHead(); h.position.lerpVectors(p0, tg, K.ease.inOut(k)); h.position.y += Math.sin(k * Math.PI) * 0.8; h.rotation.y = r0 + k * Math.PI * 2; });
    SFX('pop'); K.sparkle(headWorld(), 0xff7fb0);
    const hold = new Promise(res => { const t1 = F.T.now; const off = F.on('preRender', () => { h.position.copy(onHead()); if (F.T.now - t1 >= 3 || F.Space.cur !== th.space) { off(); res(); } }); });
    await hold;
    const from = h.position.clone();
    await tween(550, k => { h.position.lerpVectors(from, p0, K.ease.inOut(k)); h.position.y += Math.sin(k * Math.PI) * 0.5; }); h.position.copy(p0); h.rotation.y = r0;
  },
});
T('c_skohylle', {
  name: 'skohylla', radius: 0.7,
  async press(th) {
    const s = part(th, 'shoes'); SFX('tune'); bump(th, 'taps');
    cycleWear(['sko']);       // 12.10.: the shoes she bought in turn, then her own again
    for (let i = 0; i < 8; i++) { if (s) K.hop(s, 0.06, 120); SFX('step'); await K.sleep(150); }
  },
});
T('c_fespeil', {
  name: 'fespeilet', radius: 0.5, surprise: false,
  async press(th) {
    // 12.10. (economy plan §3.4): in Garderoben the mirror shows what she has for wings, wands, necklaces, capes, mittens and her glitter
    // trail – she picks or takes off each (the tower mirror keeps the fairy stage)
    if (th.room === 'garderobe' && lookItems().length && !F.Task.current) { SFX('magic'); bump(th, 'looks'); K.burst(K.wpos(th, 1.6), { n: 20, colors: [0x9fe8ff, 0xc6a8ff, 0xffffff], speed: 1.2, up: 2, life: 1 }); await lookPanel(); return; }
    SFX('magic'); say('castle_fespeil'); bump(th, 'looks');
    const wl = part(th, 'wingL'), wr = part(th, 'wingR'); if (wl && wr) tween(1200, k => { const a = Math.sin(k * Math.PI * 6) * 0.5; wl.rotation.y = a; wr.rotation.y = -a; });
    K.burst(K.wpos(th, 1.6), { n: 30, colors: [0x9fe8ff, 0xc6a8ff, 0xffffff], speed: 1.4, up: 2, life: 1.2 });
    // lead (v2 review): like her tower mirror – the fairy stage with her own fairy pre-picked (✓ keeps it), never a surprise swap
    const busy = !F.Title || !F.Title.fairySelect || !F.Fairy || !F.Fairy.set || F.Task.current || (F.Shell && F.Shell.screen) || (F.Onboard && F.Onboard.active);
    if (busy) return;
    await K.sleep(1200);
    if (F.Space.cur !== 'in' || F.Task.current || (F.Shell && F.Shell.screen)) return;
    const c = F.R.cam, cam = { mode: c.mode, target: c.target.clone(), dist: c.distGoal, pitch: c.pitchGoal, yaw: c.yawGoal };
    const cur = F.save.fairy || 'krystall';
    let kind = cur;
    try { kind = await F.Title.fairySelect(cur); } catch (e) { console.error('[castle] mirror', e); }
    F.Input.enabled = true; F.Player.frozen = false; F.Player.obj.visible = true;
    if (F.HUD.show) F.HUD.show(true);
    F.R.setCam(Object.assign(cam, { snap: true }));
    if (kind && kind !== cur) { try { F.Fairy.set(kind); if (F.Fairy.sayIntro) F.Fairy.sayIntro(kind); } catch (e) { console.error(e); } }
  },
});
T('c_symaskin', {
  name: 'symaskinen', radius: 0.6, home: ['F56'], homePlace: 'vevrom',
  async press(th) {
    const w = part(th, 'wheel'), nd = part(th, 'needle'); bump(th, 'sews');
    if (w) K.spin(w, 4, 1600, has('c_symaskin') ? 'x' : 'z');
    if (nd) tween(1500, k => { nd.position.y = Math.sin(k * Math.PI * 24) * 0.06; });
    for (let i = 0; i < 10; i++) { SFX('tone', 300 + (i % 2) * 40, 0.05, 'square', 0.03); await K.sleep(80); }
    const r = K.model('tmp_ribbon', {}); r.scale.setScalar(1.4); K.temp(th, r, 0.3, 1.2, 0.2, 2800);
    await tween(1400, k => { r.position.set(0.3 + k * 0.6, 1.2 + k * 1.2, 0.2); r.rotation.z = Math.sin(k * 10) * 0.3; });
  },
});

/* ====================================================================== FETÅRNET + STJERNETÅRNET */
T('c_tarnvindu', {
  name: 'tårnvinduet', radius: 0.5, solid: false, surprise: false, home: ['F65'], homePlace: 'window',
  async press(th) {
    SFX('whoosh'); say('castle_utsikt'); bump(th, 'views');
    const wn = part(th, 'window'); if (wn) { await K.rotTo(wn, 'y', -1.4, 500); F.T.timeout(() => { wn.rotation.y = 0; }, 6000); }
    // a glitter view out of the window (DESIGN2: no fades or teleports inside a building)
    K.burst(K.wpos(th, 1.4), { n: 30, colors: [0x9fdcff, 0xffffff, 0xffe066, 0xff9ccf], speed: 1.6, up: 1.8, life: 1.6, size: 0.12 });
    await K.sleep(600);
    await skyStars(th, 1.6, 1.4);   // v3 §8.5: «For en utsikt!» – stars light up outside the window one by one (counted)
  },
});
// stars light up one by one in an arc (counted with castle_n: the last number said, the running number on a label) – v5c WP-W2:
// a natural 5–12 (10–20 once her number band is past 20), not always v1's 10–20
async function skyStars(th, dy, dz) {
  if (th._stars) return;
  const n = natN(th, 5, 12);
  const g = new THREE.Group(); th._stars = g; g.position.set(0, dy || 2.4, dz != null ? dz : 0.6); th.obj.add(g);
  const lab = F.UI.label(K.wpos(th, (dy || 2.4) + 1.3), '0', { kind: 'num', space: th.space }); lab.el.classList.add('glow');
  try {
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n - 1)) * Math.PI, r = 1.25 + (i % 2) * 0.25;
      const st = K.model('tmp_star', {}); st.scale.setScalar(0.01); st.position.set(-Math.cos(a) * r, Math.sin(a) * r * 0.75, 0.05 * (i % 3)); g.add(st);
      tween(260, k => st.scale.setScalar(Math.max(0.01, K.ease.back(k) * 1.3)));
      SFX('pling', i % 8); lab.set(String(i + 1));
      await K.sleep(230);
    }
    await K.sleep(1900);       // natural 11.10.: the label shows the last number – no number aloud
  } finally {
    F.T.timeout(() => lab.remove(), 400);
    await tween(400, k => g.scale.setScalar(Math.max(0.01, 1 - k)));
    th.obj.remove(g); th._stars = null;
  }
}
function fadeQuick(to, ms) { const el = document.getElementById('castleFade'); if (!el) return F.T.sleep(ms); const from = +el.style.opacity || 0; return F.T.tween(ms, k => { el.style.opacity = String(from + (to - from) * k); }); }
T('c_sparegris', {
  name: 'sparegrisen', radius: 0.6,
  async press(th) {
    SFX('coin'); bump(th, 'shakes');
    const cn = part(th, 'coin'), pgp = part(th, 'pig');
    if (cn) { const y0 = cn.position.y; await tween(400, k => { cn.position.y = y0 - 0.25 * k; }); cn.position.y = y0; SFX('coin'); }
    await K.wobble(pgp || th.obj, 0.15, 700);
    let goal = F.save.shop && F.save.shop.piggyGoal;
    // v5 WP-W (logic #40): a goal she already bought is done – the piggy no longer shows its price
    if (goal && F.Eco && F.Eco.owned && F.Eco.owned(goal) > 0) { delete F.save.shop.piggyGoal; F.store && F.store(); goal = null; }
    const have = F.Eco && F.Eco.coins ? F.Eco.coins() : (F.save.coins || 0);
    const lab = F.UI.label(V3(th.x, th.y + 1.6, th.z), String(have), { kind: 'num', space: 'in' });
    let lab2 = null;
    if (goal && F.CAT && F.CAT.byId) { const c = F.CAT.byId(goal); if (c) lab2 = F.UI.label(V3(th.x + 0.9, th.y + 1.6, th.z), String(c.price), { kind: 'price', space: 'in' }); }
    F.T.timeout(() => { lab.remove(); if (lab2) lab2.remove(); }, 3500);
    K.burst(K.wpos(th, 1.2), { n: 12, colors: [0xf5c542, 0xfff0a0], speed: 1, up: 2, life: 0.8 });
  },
});
// 12.10. (economy plan §3.4): a dyrekurv she bought (Dyrebutikken, slot 'kurv') replaces the look of the tower's basket
function kurvLook(th) {
  if (!th || !th.obj || (th.room && th.room !== 'fetarn')) return;      // her own tower's basket only
  const id = F.Eco && F.Eco.slotItem ? F.Eco.slotItem('kurv') : null;
  if (th._kurvId === id && (th._kurvM || !id)) return;
  th._kurvId = id;
  if (th._kurvM) { th._kurvM.parent && th._kurvM.parent.remove(th._kurvM); th._kurvM = null; }
  const base = th.obj.children.slice();
  const c = id && F.CAT ? F.CAT.byId(id) : null, mid = c ? F.CAT.mid(c) : null;
  base.forEach(o => { if (o.userData) { if (o.userData._kurvVis == null) o.userData._kurvVis = o.visible; o.visible = mid ? false : o.userData._kurvVis; } });
  if (!mid || !F.Act || !F.Act.fitModel) return;
  const m = F.Act.fitModel(mid, c.opts || {}, 1.25); m.position.y = 0.02; th.obj.add(m); th._kurvM = m; th.bboxDirty = true;
}
F.on('placed', (kind, key) => { if (kind === 'slot' && key === 'kurv') F.Things.list.forEach(t => { if (t.type === 'c_dyrekurv') kurvLook(t); }); });
T('c_dyrekurv', {
  name: 'dyrekurven', radius: 0.7,
  init(th) { kurvLook(th); },
  // v5c WP-W2 (hook #2): with no pet of her own the basket's cat says a true thing about cats (or its word, «nysgjerrig»)
  hook: th => { const pets = F.CAT && F.Eco && F.Eco.owned ? F.CAT.filter(c => c.kind === 'pet' && F.Eco.owned(c.id) > 0) : []; if (pets.length || !F.OBJ.animalX) return null;
    const cat = t => { const c = spawnTemp(t, 'katt', 'tmp_cat', {}, 0, 0.3, 0, 3000, 1.1); return K.hop(c, 0.4, 500); };
    return F.OBJ.animalX(th, 'katt', { vis: { '*': [cat] }, act: [cat] }); },
  async press(th) {
    SFX('squeak'); const k = bump(th, 'picks');
    const cu = part(th, 'cushion'); if (cu) tween(600, q => { cu.scale.y = 1 + Math.sin(q * Math.PI) * 0.3; });
    const pets = F.CAT ? F.CAT.filter(c => c.kind === 'pet' && F.Eco && F.Eco.owned(c.id) > 0).map(c => c.id) : [];
    if (pets.length && F.Eco.setPet) { const nx = pets[k % pets.length]; try { F.Eco.setPet(nx); } catch (e) { console.error(e); } K.sparkle(K.wpos(th, 0.8), 0xff7fb0); }
    else { const c = spawnTemp(th, 'katt', 'tmp_cat', {}, 0, 0.3, 0, 2400, 1.1); await K.hop(c, 0.4, 500); }
  },
});
// Fetårnet furniture slots (LIFE: F.Eco.slotPress cycles owned items; rendering here)
const SLOT_POS = { seng: [2.6, 2.2, 0], lampe: [9.3, 1.2, 0], hylle: [5.2, 0.9, 0], stol: [11.4, 6.6, -0.6], akvarium: [12.4, 8.8, Math.PI], pynt1: [2.4, 7.6, 0.5], teppe: [7, 5.6, 0], gardiner: [10.75, 0.7, 0, 2.3], vindu: [3.25, 0.7, 0, 2.3], vegg: [0.8, 8.4, Math.PI / 2, 2.6] };
T('c_slot', {
  name: 'plassen', radius: 0.6, solid: false,
  build(th) {
    const g = new THREE.Group(); const m = th.data.wall ? K.model('tmp_star', {}) : K.model('tmp_c_slot', {}); if (th.data.wall) m.scale.setScalar(2.2); g.add(m);
    // empty floor slots: a faint ghost outline (not a debug-looking marker) – still tappable (pick box ignores opacity)
    if (!th.data.wall) m.traverse(o => { if (o.isMesh && o.material) { const ms = [].concat(o.material).map(mt => { const c = mt.clone(); c.transparent = true; c.opacity = 0.22; c.depthWrite = false; return c; }); o.material = Array.isArray(o.material) ? ms : ms[0]; o.castShadow = false; o.receiveShadow = false; } });
    return g;
  },
  tick(th, dt, t) { const m = th.obj.children[0]; if (m && m.visible && th.data.wall) m.rotation.y = Math.sin(t * 2 + th.x) * 0.5; },
  init(th) { renderSlot(th); },
  async press(th) {
    bump(th, 'taps');
    if (F.Eco && F.Eco.slotPress) await F.Eco.slotPress(th, th.data.slot);
    renderSlot(th, true);
    K.sparkle(K.wpos(th, 0.6), 0xc6a8ff);
  },
});
function renderSlot(th, anim) {
  const item = F.Eco && F.Eco.slotItem ? F.Eco.slotItem(th.data.slot) : null;
  if (th._item === item && th._obj) return;
  if (th._obj) { th.obj.remove(th._obj); th._obj = null; }
  th._item = item;
  th.obj.children[0].visible = !item;
  if (!item) return;
  const mid = F.CAT && F.CAT.mid ? F.CAT.mid(item) : null; if (!mid) return;
  const m = F.VOX.make(mid, {}); th._obj = m; th.obj.add(m); m.traverse(o => { o.userData.thing = th; });
  if (anim && F.FX.assemble) F.FX.assemble(mid, {}, m, V3(th.x, th.y, th.z), { ms: 900 });
  th.bboxDirty = true;
}
F.on('placed', (kind, key) => { if (kind !== 'slot') return; F.Things.list.filter(t => t.type === 'c_slot' && t.data.slot === key).forEach(t => renderSlot(t, true)); });
T('c_teleskop', {
  name: 'teleskopet', radius: 0.6,
  async press(th) {
    const t = part(th, 'tube'); SFX('whoosh'); say('castle_teleskop'); bump(th, 'looks');
    if (t) await K.rotTo(t, 'y', (th.state.looks % 2 ? 0.6 : -0.6), 700);
    K.sparkle(K.wpos(th, 2.1), 0xfff6b0);
    await skyStars(th, 2.6);      // v3 §8.5: «Jeg ser langt!» – she sees the stars come out, and counts them
  },
});
T('c_kartbord', {
  name: 'kartbordet', radius: 1.1,
  async press(th) {
    SFX('rustle'); bump(th, 'opens');
    const nd = part(th, 'needle'), mp = part(th, 'map'); if (nd) K.spin(nd, 2, 900); if (mp) K.swing(mp, 0.1, 600, 'x', 2);
    K.burst(K.wpos(th, 1.1), { n: 16, colors: [0xfff3dc, 0xf5c542], speed: 1, up: 1.4, life: 0.8 });
    await K.sleep(300);
    K.hop(th.obj, 0.2, 400);
    if (F.Bld && F.Bld.openMap && F.Space.cur === 'in') F.Bld.openMap();
  },
});
T('c_stjernebilde', {
  name: 'stjernebildet', radius: 0.4, solid: false, learn: ['F18'],
  init(th) {
    th.stars = [];
    for (let i = 0; i < 11; i++) {
      let s = part(th, 'star' + i);
      if (!s) { const a = i / 10; s = K.model('tmp_star', {}); s.position.set(-1.05 + a * 2.1, 0.95 + Math.sin(a * Math.PI * 2.2) * 0.45, 0.15); s.scale.setScalar(0.8); th.obj.add(s); }
      th.stars.push(s);
    }
    th.s0 = th.stars.map(s => s.scale.x);
  },
  async press(th) { if (await learnFirst(th, t => t.def.playFx(t))) return; return th.def.playFx(th); },
  async playFx(th) {
    bump(th, 'connects');
    const line = []; th.obj.updateMatrixWorld(true);
    const lab = F.UI.label(K.wpos(th, 2), '1', { kind: 'num', space: 'in' }); lab.el.classList.add('glow');   // v5 WP-W: dot-to-dot from 1
    for (let i = 0; i < 11; i++) {
      const s = th.stars[i]; SFX('pling', i % 8); s.scale.setScalar(th.s0[i] * 1.6);
      lab.set(String(1 + i)); lab.anchor = s.getWorldPosition(new THREE.Vector3()).add(V3(0, 0.35, 0.1));
      if (i > 0) { const a = th.stars[i - 1].position, b = s.position; const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff6b0 })); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0.16); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); th.obj.add(m); line.push(m); }
      await K.sleep(320);
    }
    await K.sleep(1500); lab.remove();      // natural 11.10.: no number aloud
    line.forEach(m => th.obj.remove(m)); th.stars.forEach((s, i) => s.scale.setScalar(th.s0[i]));
  },
});

/* ====================================================================== static furniture (non-interactive, per room) */
// rectangular room rugs (1/8 m cells): border c2, field c, pattern c3; w×d cells; fringe on the short ends
D('cz_rug', [64, 1, 64], 1 / 8, (v, o) => {
  const w = o.w || 32, d = o.d || 24, c = o.c || 'roofRed', c2 = o.c2 || 'gold', c3 = o.c3 || 'cream2', pat = o.pat || 'diamond';
  const x0 = Math.floor((64 - w) / 2), z0 = Math.floor((64 - d) / 2);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, z, w - 1 - x, d - 1 - z); let col = c;
    if (e === 0 || e === 2) col = c2; else if (e === 1) col = c3;
    else {
      const cx = x - w / 2 + 0.5, cz = z - d / 2 + 0.5;
      if (pat === 'diamond') { const q = (Math.abs(cx) % 8) + (Math.abs(cz) % 8); if (q === 4 || q === 12) col = c3; if (Math.abs(cx) + Math.abs(cz) < 4) col = c2; }
      else if (pat === 'stripes') { if (Math.floor((z - 3) / 3) % 2 === 0) col = c3; }
      else if (pat === 'dots') { if (x % 5 === 2 && z % 5 === 2) col = c3; else if ((x + z) % 10 === 0 && x % 5 === 0) col = c2; }
      else if (pat === 'runner') { if (Math.abs(cx) < 1.5 && z % 6 < 3) col = c3; if (Math.abs(cx) > w / 2 - 5) col = c3; }
      else if (pat === 'hearts') { const hx = ((x - 3) % 9 + 9) % 9, hz = ((z - 3) % 8 + 8) % 8; if ((hz === 2 && (hx === 2 || hx === 3 || hx === 5 || hx === 6)) || (hz === 3 && hx >= 2 && hx <= 6) || (hz === 4 && hx >= 3 && hx <= 5) || (hz === 5 && hx === 4)) col = c3; }
    }
    v.set(x0 + x, 0, z0 + z, col);
  }
  if (o.fringe !== false) for (let x = 1; x < w - 1; x += 2) { v.set(x0 + x, 0, z0 - 1, 'white'); v.set(x0 + x, 0, z0 + d, 'white'); }
});
// fix_wp1 #5: a towel rack and a rubber-duck shelf for Badet (static decor)
D('cz_handkle', [12, 14, 4], 1 / 10, v => {
  for (const x of [0, 11]) { v.box(x, 0, 1, x, 13, 2, 'gold'); v.box(x - (x ? 0 : 0), 0, 0, x, 0, 3, 'gold'); }
  v.box(0, 13, 1, 11, 13, 2, 'gold'); v.box(0, 8, 1, 11, 8, 2, 'gold');
  v.box(1, 6, 1, 5, 12, 1, 'pink'); v.box(1, 6, 2, 5, 12, 2, 'roofPink'); for (let y = 7; y <= 11; y += 2) v.box(1, y, 1, 5, y, 1, 'white');
  v.box(6, 5, 1, 10, 12, 1, 'mint'); v.box(6, 5, 2, 10, 12, 2, 'teal'); for (let y = 6; y <= 11; y += 2) v.box(6, y, 1, 10, y, 1, 'white');
});
D('cz_andehylle', [16, 6, 3], 1 / 10, v => {
  v.box(0, 0, 0, 15, 0, 2, 'white'); v.box(0, 0, 0, 15, 0, 0, 'mint');
  for (const x0 of [1, 6, 11]) { v.box(x0, 1, 1, x0 + 2, 2, 2, 'yellow'); v.box(x0 + 2, 2, 1, x0 + 3, 3, 2, 'yellow'); v.set(x0 + 3, 4, 1, 'yellow'); v.set(x0 + 3, 3, 2, 'black'); v.set(x0 + 4, 3, 1, 'orange'); v.set(x0 + 3, 5, 1, 'gold'); }
});
const DECOR = {   // [modelId, lx, lz, {ry, dy, s:n|[sx,sy,sz], solid}]  – solid: blocks walking (footprint from the model's box)
  kjokken: [['c_kjokkenbord', 5.35, 6.3, { solid: 1 }], ['c_stol', 3.55, 6.3, { ry: Math.PI / 2, solid: 1 }], ['c_stol', 7.25, 6.3, { ry: -Math.PI / 2, solid: 1 }],
    ['c_tallerkenhylle', 0.7, 2.6, { ry: Math.PI / 2, dy: 1.7 }], ['c_plante', 12.9, 8.9, { solid: 1 }]],
  spisesal: [['cz_rug', 7, 5, { o: { w: 54, d: 32, c: 'roofRed', c2: 'gold', c3: 'peach', pat: 'diamond' } }], ['c_stol', 5.2, 3.4, { solid: 1 }], ['c_stol', 7.0, 3.4, { solid: 1 }], ['c_stol', 8.8, 3.4, { solid: 1 }],
    ['c_stol', 3.75, 5.0, { ry: Math.PI / 2, solid: 1 }], ['c_stol', 10.25, 5.0, { ry: -Math.PI / 2, solid: 1 }],
    ['c_peis', 0.95, 1.9, { ry: Math.PI / 2, solid: 1 }], ['c_maleri', 0.6, 1.9, { ry: Math.PI / 2, dy: 2.55 }], ['c_maleri', 13.4, 1.9, { ry: -Math.PI / 2, dy: 2.0 }],
    ['c_plante', 12.9, 8.9, { solid: 1 }], ['c_vase', 1.1, 8.9, { solid: 1 }]],
  tronsal: [['c_soyle', 1.3, 1.1, { solid: 1 }], ['c_soyle', 12.7, 1.1, { solid: 1 }], ['c_plante', 4.8, 2.6, { solid: 1 }], ['c_plante', 9.2, 2.6, { solid: 1 }]],
  ballsal: [['c_soyle', 4.5, 0.9, { solid: 1 }], ['c_soyle', 9.5, 0.9, { solid: 1 }], ['c_plante', 1.2, 9.0, { solid: 1 }], ['c_vase', 12.9, 9.3, { solid: 1 }],
    ['c_stol', 12.8, 4.3, { ry: -Math.PI / 2, solid: 1 }], ['c_stol', 12.8, 5.7, { ry: -Math.PI / 2, solid: 1 }], ['c_maleri', 13.4, 2.6, { ry: -Math.PI / 2, dy: 2.2, o: { k: 'slott' } }],
    ['c_maleri', 13.4, 7.2, { ry: -Math.PI / 2, dy: 2.2, o: { k: 'hav' } }], ['c_maleri', 7, 0.6, { dy: 2.6, o: { k: 'blomst' } }]],
  bibliotek: [['cz_rug', 7, 5.4, { o: { w: 38, d: 28, c: 'teal', c2: 'butter', c3: 'mint', pat: 'stripes' } }], ['c_plante', 12.9, 9.0, { solid: 1 }], ['c_maleri', 0.6, 2.2, { ry: Math.PI / 2, dy: 2.2 }]],
  musikkrom: [['cz_rug', 7, 4.8, { o: { w: 40, d: 28, c: 'navySoft', c2: 'butter', c3: 'sky', pat: 'dots' } }], ['c_plante', 12.9, 1.1, { solid: 1 }], ['c_vase', 1.1, 9.0, { solid: 1 }], ['c_maleri', 13.4, 2.0, { ry: -Math.PI / 2, dy: 2.2 }]],
  heis1: [['c_benk', 6.6, 0.95, { solid: 1 }], ['cz_rug', 7, 5.5, { o: { w: 20, d: 60, c: 'red', c2: 'gold', c3: 'roofRed', pat: 'runner', fringe: false } }],
    ['c_maleri', 0.6, 8.0, { ry: Math.PI / 2, dy: 2.0 }], ['c_plante', 12.9, 8.9, { solid: 1 }], ['c_vase', 1.1, 9.2, { solid: 1 }],
    ['c_maleri', 6.0, 0.6, { dy: 2.5, o: { k: 'katt' } }], ['c_maleri', 12.3, 0.6, { dy: 2.3, o: { k: 'slott' } }],                      // fix_wp1 #5: a portrait row, a play corner
    ['cz_rug', 3.0, 7.3, { o: { w: 26, d: 18, c: 'lavender', c2: 'white', c3: 'pink', pat: 'hearts' } }], ['c_lekekiste', 2.4, 7.6, { solid: 1 }], ['bamse', 3.9, 7.9, { s: 0.8 }]],
  heis2: [['c_benk', 6.6, 0.95, { solid: 1 }], ['cz_rug', 7, 5.5, { o: { w: 20, d: 60, c: 'red', c2: 'gold', c3: 'roofRed', pat: 'runner', fringe: false } }],
    ['c_maleri', 13.4, 2.0, { ry: -Math.PI / 2, dy: 2.0 }], ['c_plante', 12.9, 8.9, { solid: 1 }], ['c_plante', 1.1, 8.9, { solid: 1 }],
    ['c_maleri', 6.0, 0.6, { dy: 2.5, o: { k: 'hav' } }], ['c_maleri', 12.3, 0.6, { dy: 2.3, o: { k: 'blomst' } }],
    ['cz_rug', 3.0, 7.3, { o: { w: 26, d: 18, c: 'mint', c2: 'white', c3: 'sky', pat: 'stripes' } }], ['c_benk', 3.0, 7.7, { solid: 1 }], ['c_dyrekurv', 5.0, 8.0, { solid: 1 }]],
  ordmuseum: [['c_soyle', 0.95, 0.95, { solid: 1 }], ['c_soyle', 13.05, 0.95, { solid: 1 }]],
  soverom: [['c_peis', 0.95, 1.9, { ry: Math.PI / 2, solid: 1 }], ['c_maleri', 0.6, 1.9, { ry: Math.PI / 2, dy: 2.55 }], ['c_plante', 12.9, 8.9, { solid: 1 }]],
  bad: [['cz_rug', 5.6, 3.6, { o: { w: 22, d: 12, c: 'sky', c2: 'white', c3: 'ice', pat: 'stripes' } }], ['c_plante', 1.2, 1.2, { solid: 1 }], ['c_plante', 12.9, 8.9, { solid: 1 }], ['c_vase', 1.1, 8.9, { solid: 1 }],
    ['c_maleri', 13.4, 2.4, { ry: -Math.PI / 2, dy: 2.0 }],
    ['cz_handkle', 2.4, 7.8, { solid: 1 }], ['cz_andehylle', 8.0, 0.62, { dy: 1.7 }], ['cz_rug', 2.6, 7.2, { o: { w: 20, d: 14, c: 'mint', c2: 'white', c3: 'ice', pat: 'dots' } }],
    ['tmp_bubble', 4.4, 1.5, { dy: 1.5, s: 1.6 }], ['tmp_bubble', 6.5, 1.3, { dy: 2.1, s: 2.2 }], ['tmp_bubble', 5.3, 2.5, { dy: 2.6, s: 1.3 }], ['tmp_bubble', 7.2, 2.2, { dy: 1.2, s: 1.0 }]],
  garderobe: [['c_plante', 12.9, 8.9, { solid: 1 }]],
  stjernetarn: [['c_stol', 5.0, 2.3, { ry: -0.5, solid: 1 }], ['c_plante', 1.2, 8.9, { solid: 1 }]],
};
// LIFE's piggy bank for Mia is spawned without a floor height (it lands in Kjøkkenet on floor 0) – lift it to her room on floor 2
function fixMiaGris() {
  const t = F.Things.byId('life_miagris'), r = C.rooms.mia; if (!t || !r || !t.obj) return;
  // the coin plaque is a DOM label: it must hide with the thing (F.Bld hides t.labels), or it floats over Kjøkkenet on floor 0
  if (t.plaque && !(t.labels || []).includes(t.plaque)) t.labels = (t.labels || []).concat([t.plaque]);
  const y = r.floor * C.FH; if (Math.abs((t.y || 0) - y) < 0.01 && t.room === 'mia') return;
  t.y = y; t.obj.position.y = y; t.room = 'mia'; t.floor = r.floor;
  if (t.plaque && !(t.labels || []).includes(t.plaque)) t.labels = (t.labels || []).concat([t.plaque]);   // shown/hidden with the room
  if (t.x < r.bounds.x0 + 0.8 || t.x > r.bounds.x1 - 0.8) { t.x = r.bounds.x0 + 4; t.obj.position.x = t.x; }
  t.bboxDirty = true;
}
F.on('ready', () => F.T.timeout(fixMiaGris, 900));
F.on('roomEntered', () => fixMiaGris());

/* ====================================================================== placement per room (lx, lz, {dy, ry, data}) */
const PLACE = {
  hall: [['c_rustning', 12.6, 7.6], ['c_gelender', 2.6, 8.7], ['c_portrett', 13.35, 8.4, { dy: 1.9, ry: -Math.PI / 2 }], ['c_tallvegg', 6.75, 0.62, { dy: 1.0, solid: false }],
    ['c_klokkestreng', 12.3, 0.6, { dy: 0.4 }], ['c_loper', 7, 6.3], ['c_palme', 12.8, 2.6], ['c_paraply', 10.6, 9.0]],
  kjokken: [['ovn', 2.6, 1.3], ['gryte', 6.0, 1.3], ['c_krukker', 10.6, 0.8, { dy: 1.2 }], ['c_kran', 12.6, 1.6], ['kjele', 2.25, 1.3, { dy: 1.52, solid: false }],
    ['c_eggkartong', 4.5, 6.3, { dy: 0.9 }], ['c_melsekk', 1.2, 8.6], ['c_deig', 5.45, 6.2, { dy: 0.9 }], ['c_kakeboks', 6.3, 6.45, { dy: 0.9 }], ['c_brodkurv', 9.6, 8.6]],
  spisesal: [['c_langbord', 7, 5, { solid: false, block: [4.45, 4.25, 9.55, 5.75] }], ['c_lysestake', 4.4, 5.0, { dy: 0.9 }], ['c_avis', 9.6, 5.25, { dy: 0.9 }], ['tekanne', 7.1, 4.75, { dy: 0.9 }], ['c_gjokur', 7, 0.6, { dy: 2.2 }],
    ['c_fruktfat', 5.6, 5.25, { dy: 0.9 }], ['c_serviett', 8.5, 5.3, { dy: 0.9 }]],
  // v3 WP3: the KONGELOVEN scroll on the back wall right of the throne; the chandelier hangs off the throne's axis (it covered the throne
  // back and took its taps, DESIGN3 §8.2)
  tronsal: [['c_trone', 7, 1.5], ['krone', 10.5, 2.4], ['c_lysekrone', 10.6, 5.2, { dy: 3.6 }], ['c_fanfare', 5.0, 0.6, { dy: 1.2, solid: false }], ['c_vindu', 3.25, 0.62, { dy: 1.6 }], ['c_gullbjelle', 11.8, 7.8],
    ['c_kongelov', 8.85, 0.62, { dy: 0.35, solid: false }]],
  ballsal: [['c_glitterkule', 7, 4.5, { dy: 3.8 }], ['c_grammofon', 1.8, 2.0], ['c_dansegulv', 7, 5.5], ['harpe', 11.6, 2.0], ['c_spilledase', 3.4, 8.4, { dy: 0 }], ['tromme', 12.2, 8.2]],
  bibliotek: [['c_bokhylle', 7, 0.9], ['c_globus', 11.6, 7.6], ['c_stige', 5.5, 1.5, { ry: 0.17 }], ['c_lesestol', 2.2, 6.4], ['lampe', 3.6, 8.6], ['c_skrivepult', 11.4, 2.0]],
  musikkrom: [['piano', 4.2, 1.5], ['c_xylofon', 10.2, 2.4], ['floyte', 12.4, 7.8], ['c_trommesett', 10.4, 7.3], ['c_notestativ', 2.0, 7.2]],
  heis1: [['c_palme', 12.8, 2.6, { idx: 2 }], ['c_portrett', 13.35, 8.4, { dy: 1.9, ry: -Math.PI / 2, idx: 2 }]],
  skattkammer: [['c_myntverk', 3.0, 1.5], ['c_kiste', 7.2, 1.6], ['c_kiste', 10.4, 1.6, { idx: 2 }], ['c_myntstabel', 11.8, 6.6], ['c_sparebosser', 2.4, 7.2], ['c_juvelskrin', 6.8, 7.4, { dy: 0 }]],
  ordmuseum: [['c_ordbok', 12.3, 8.5, { ry: -0.5 }]],
  mia: [['c_miaseng', 2.6, 2.6], ['c_dukkehus', 8.0, 1.3], ['c_gyngehest', 11.0, 7.8, { ry: -0.6 }], ['c_lekekiste', 12.2, 1.4], ['bamse', 5.2, 7.6], ['c_gardin', 10.75, 0.65, { dy: 1.0 }],
    ['c_miatavle', 5.6, 0.75], ['c_akvarium', 2.4, 8.8]],
  soverom: [['c_himmelseng', 7, 2.2], ['c_tofler', 4.6, 5.2], ['c_vugge', 11.6, 7.2], ['c_stjernelampe', 2.4, 7.8], ['c_kongeskap', 12.4, 1.3]],
  heis2: [['c_paraply', 12.8, 2.6, { idx: 2 }], ['lampe', 12.6, 7.2, { idx: 2 }]],
  bad: [['c_badekar', 5.6, 1.9], ['c_sape', 8.9, 2.2, { dy: 0 }], ['speil', 11.4, 0.6, { dy: 1.2 }], ['c_gummiand', 3.8, 5.2], ['c_vask', 11.4, 1.3]],
  garderobe: [['c_kjolestativ', 4.0, 1.6], ['c_hattehylle', 8.8, 0.6, { dy: 1.1 }], ['c_skohylle', 12.2, 1.3], ['c_fespeil', 2.0, 7.4], ['c_symaskin', 10.6, 7.6]],
  fetarn: [['c_tarnvindu', 7, 0.62, { dy: 1.0 }], ['c_sparegris', 4.4, 8.6], ['c_dyrekurv', 9.6, 8.6], ['c_fespeil', 12.9, 7.0, { idx: 2, ry: -Math.PI / 2 }]],
  stjernetarn: [['c_teleskop', 3.6, 2.0], ['c_kartbord', 9.2, 5.6], ['c_stjernebilde', 7, 0.62, { dy: 1.6 }]],
};
// DESIGN2 §2.2: F.Bld furnishes each cell from these tables when a plan is built (home plans also run the extras)
const BLD = F.Bld;
if (BLD) {
  Object.assign(BLD.PLACE, PLACE); Object.assign(BLD.DECOR, DECOR);
  // Ordmuseet pedestals: 3 gentle arcs of 8, filled from the middle of the back arc outwards (fix_wp1 #6)
  const PED_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
  BLD.extras.ordmuseum = (P, c) => {
    for (let i = 0; i < PED_ROWS * PED_COLS; i++) {
      const r = Math.floor(i / PED_COLS), k = PED_ORDER[i % PED_COLS], x = 1.6 + k * 1.55, z = 2.3 + r * 2.2 + 0.55 * ((x - 7.025) / 5.425) ** 2;
      BLD.spawnIn(P.id, c.key, 'c_sokkel', x, z, { idx: i, data: { i } });
    }
    F.T.timeout(() => fillMuseum(0), 0);
  };
  // Fetårnet slots (only when the tower plan is furnished from these tables, i.e. the fallback tower)
  BLD.extras.fetarn = (P, c) => { for (const sl in SLOT_POS) { const [x, z, ry, dy] = SLOT_POS[sl]; BLD.spawnIn(P.id, c.key, 'c_slot', x, z, { idx: sl, ry, dy: dy || 0, data: { slot: sl, wall: !!dy } }); } };
}
})();
