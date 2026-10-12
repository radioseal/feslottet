/* Feslottet – shared behaviour library F.BEH (DESIGN §7). Owner: OBJECTS+BEHAVIOURS WP.
   Every behaviour = async (thing, params) => {...}; each one causes a VISIBLE change and a SOUND.
     F.BEH.add(name, fn)                 register (others may add their own)
     F.BEH.run(th, name, params)         -> Promise   (sets th.lastReactAt, th.reactedVisibly, emits 'react')
     F.BEH.runList(th, [[name, params], ...])   sequential; params.bg:true = start it and go on without waiting;
                                         after the list a 1-in-10 'surprise' (unless def.surprise === false or params-list ends with ['nosurprise'])
     F.BEH.react(th, list)               = runList (alias used by custom press() functions)
     F.BEH.init(th)                      re-apply persisted states (toggle / open{stay} / grow / cycle) without animation.
                                         Things.def(...{init: F.BEH.init}) – things_world does it for all its types.
     F.BEH.learnOrPlay(th, formats, playList)  learning spot: F.Task.offer if F.Quest.canOfferTask(), else the play reaction.
   Parts: params.part = 'door' | ['door','lid'] → thing.parts[name] (aliases below); missing part → the whole model.
   Helpers for other WPs: F.BEH.util = {part, anim, setRest, halo, spawnModel, topOf, heightOf, snd, model, ease, carry, seat}.
     util.seat(th, {pos, face, stand, ms}) -> {ready, active, release()}  (v3: she sits until release – the throne ceremony)

   Behaviour catalogue (params in braces, all optional):
   motion   open{part,axis,angle,hold,stay}  toggle{part,key,mode:'light'|'rot'|'show'|'scale',axis,angle,color}
            spin{part,axis,turns,ms}  wobble{part,amp,n,ms}  bounce{part,h,n}  swing{part,axis,amp,n,ms}
            rise{part,h,hold | model,n}  topple{part,axis,hold}  shake{part,fx}  hop{dist,n}  walk{r}  bob{ms}
            face{part}  emerge{part,h,hold}  cycle{parts:[...],key}  squash{}
   sound/light  ring{n,part,f,count}  note{scale,inst,part}  light{seq|n,color,hold,stay}  sparkle{color}  glow{color,ms}  beam{part,turns}
   water/growth pour{part,axis,angle,color,ms,spout}  splash{color}  grow{stages,part,s0,harvest}  steam{color,n}
   spawning pop{model,n,dist,life,from,color,scale}  drop{model,n,r,count}  fly{birds,model,color}  follow{secs,sound}
   riding   sit{part,ms,dy}  ride{mode:'part'|'circle'|'line',part,r,dx,dz,dy,ms,with:[name,params]}  dance{ms}
   counting count{n,model,scale,say}  say{tpl,voice,slots}
   fx       fx{kind,n}  hearts{}  sound{name}  coin{}  wait{ms}  surprise{kind}
*/
(function () {
'use strict';
const F = window.F, U = F.U;
const defs = {};
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const R = () => Math.random();
const ease = { out: k => 1 - Math.pow(1 - k, 3), inOut: k => k * k * (3 - 2 * k), back: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, lin: k => k };

/* ------------------------------------------------------------------ extra sounds (added only if missing) */
const S = F.sfx, tone = (...a) => S.tone(...a), noise = (...a) => S.noise(...a);
const addSfx = (name, fn) => { if (!S[name]) S[name] = fn; };
addSfx('baa', () => { tone(420, .16, 'sawtooth', .05, 0, 380); tone(410, .16, 'sawtooth', .05, .14, 370); tone(400, .3, 'sawtooth', .045, .28, 340); });
addSfx('moo', () => { tone(150, .9, 'sawtooth', .06, 0, 110); tone(300, .9, 'sine', .03, 0, 220); });
addSfx('oink', () => { tone(320, .09, 'square', .05, 0, 210); tone(300, .1, 'square', .05, .14, 190); });
addSfx('cluck', () => { for (let i = 0; i < 3; i++) tone(720 - i * 40, .06, 'square', .04, i * .11, 480); });
addSfx('quack', () => { tone(520, .13, 'square', .05, 0, 330); tone(500, .13, 'square', .045, .17, 320); });
addSfx('ribbit', () => { tone(230, .07, 'square', .06, 0, 180); tone(260, .09, 'square', .06, .1, 200); });
addSfx('chirp', () => { tone(2500, .07, 'sine', .06, 0, 3300); tone(2700, .08, 'sine', .05, .1, 3600); });
addSfx('buzz', () => { tone(210, .5, 'sawtooth', .025, 0, 240); tone(215, .5, 'sawtooth', .02, .05, 205); });
addSfx('neigh', () => { tone(900, .5, 'sawtooth', .04, 0, 600); tone(700, .3, 'sawtooth', .03, .35, 500); });
addSfx('meow', () => { tone(700, .35, 'triangle', .07, 0, 950); tone(950, .25, 'triangle', .05, .3, 600); });
addSfx('creak', () => { tone(260, .35, 'sawtooth', .025, 0, 340); });
addSfx('rustle', () => { noise(.5, .12, 3500, .8); });
addSfx('pour', () => { noise(1.2, .1, 1600, .7); });
addSfx('drip', () => { tone(1400, .08, 'sine', .07, 0, 700); });
addSfx('snow', () => { noise(.35, .1, 6000, .5); });
addSfx('swish', () => { noise(.3, .12, 2400, .6); });
addSfx('honk', () => { tone(330, .18, 'square', .05); tone(330, .25, 'square', .05, .22); });
addSfx('tada', () => { [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .12, i * .07)); tone(1046, .6, 'triangle', .13, .22); });
addSfx('giggle', () => { for (let i = 0; i < 5; i++) tone(900 + i * 60 + R() * 40, .07, 'sine', .07, i * .09, 1200); });
addSfx('tune', () => { [0, 4, 7, 12, 7, 4, 9, 7].forEach((s, i) => tone(F.note(s + 12), .22, 'triangle', .09, i * .17)); });
addSfx('toot', () => { tone(392, .22, 'square', .05, 0); tone(330, .32, 'square', .05, .24); tone(784, .22, 'triangle', .03, 0); });
addSfx('clap', () => { for (let i = 0; i < 7; i++) noise(.06, .14, 2200 + R() * 1500, .5, i * .11 + R() * .03); });
addSfx('kykeliky', () => { tone(620, .12, 'sawtooth', .04, 0, 760); tone(760, .12, 'sawtooth', .04, .13, 900); tone(900, .45, 'sawtooth', .045, .27, 640); });
addSfx('purr', () => { for (let i = 0; i < 6; i++) tone(70 + R() * 8, .08, 'sawtooth', .04, i * .09); });
addSfx('musicbox', () => { [12, 16, 19, 24, 19, 16, 21, 19, 16, 12].forEach((s, i) => { tone(F.note(s + 12), .5, 'sine', .07, i * .2); tone(F.note(s + 24), .25, 'sine', .02, i * .2); }); });
addSfx('waltz', () => { [0, 4, 7, 7, 5, 4, 2, 4, 7].forEach((s, i) => tone(F.note(s + 12), .28, 'triangle', .08, i * .22)); });

const stats = { runs: 0, sounds: 0, byName: {} };
function snd(name, ...a) { stats.sounds++; try { if (typeof name === 'function') name(); else if (S[name]) S[name](...a); } catch (e) {} }

/* ------------------------------------------------------------------ helpers */
const ALIAS = {
  door: ['dor', 'lid', 'lokk', 'hatch', 'luke', 'flap'], lid: ['lokk', 'door', 'dor', 'top'],
  sails: ['vinger', 'blades', 'rotor', 'wheel', 'hjul'], wheel: ['hjul', 'rotor', 'sails', 'ring'],
  flag: ['flagg', 'banner'], head: ['hode'], tail: ['hale'], body: ['kropp', 'torso'], beam: ['lys', 'light', 'lamp', 'top'],
  seat: ['sete', 'swing', 'huske', 'board'], bell: ['bjelle', 'klokke'], arm: ['arms', 'armR', 'armL', 'pumpe'],
  bucket: ['botte', 'spann', 'pail'], crank: ['sveiv', 'handle'], cabin: ['gondol', 'kurv', 'basket'], light: ['lamp', 'flame', 'lys', 'glow'],
  load: ['last', 'cargo'], b2: ['mid'], b3: ['head'], sail: ['seil'], bees: ['bier'], kitten: ['kattunge'], crown: ['krone', 'leaves'], fruit: ['frukt', 'apples'],
};
const LEGS = ['legFL', 'legFR', 'legBL', 'legBR', 'legL', 'legR'];
// walking legs for rigged animals (MODELS-2 animal4/bird rigs): call each frame with a phase; restore with phase null
function legs(th, ph) {
  for (let i = 0; i < LEGS.length; i++) { const L = th.parts && th.parts[LEGS[i]]; if (!L) continue;
    if (L.userData._lr0 == null) L.userData._lr0 = L.rotation.x;
    L.rotation.x = ph == null ? L.userData._lr0 : L.userData._lr0 + Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 && i < 4 ? Math.PI : 0)) * 0.5; }
}
function part(th, name) {
  if (!name || !th.parts) return null;
  const names = Array.isArray(name) ? name : [name];
  for (const n of names) {
    if (th.parts[n]) return th.parts[n];
    for (const a of (ALIAS[n] || [])) if (th.parts[a]) return th.parts[a];
  }
  return null;
}
const tgt = (th, p) => (p && p.part && part(th, p.part)) || th.obj;
function heightOf(th) {
  if (th._h == null || th.bboxDirty) {
    try { th.obj.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(th.obj); th._h = b.isEmpty() ? 1 : U.clamp(b.max.y - th.obj.position.y, 0.3, 30); }
    catch (e) { th._h = 1; }
  }
  return th._h;
}
const topOf = (th, f = 1) => V3(th.obj.position.x, th.obj.position.y + heightOf(th) * f, th.obj.position.z);
const baseOf = th => V3(th.obj.position.x, th.obj.position.y, th.obj.position.z);
const wpos = o => { o.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()); };
const scn = th => F.Space.scene(th.space || 'out');
// transient animation with a captured rest pose (restored when the last anim on that object ends)
function anim(o, ms, fn) {
  const u = o.userData;
  if (!u._an) { u._an = 0; u._b = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() }; }
  u._an++; const b = u._b;
  return F.T.tween(ms, k => fn(k, b)).then(() => {
    if (--u._an <= 0) { u._an = 0; o.position.copy(b.p); o.rotation.copy(b.r); o.scale.copy(b.s); u._b = null; }
  });
}
// persistent change that survives a running transient anim: key 'position'|'rotation'|'scale', axis 'x'|'y'|'z'
function setRest(o, key, axis, val) {
  o[key][axis] = val;
  const b = o.userData._b; if (b) b[key[0]][axis] = val;
}
const restOf = (o, key, axis) => { const b = o.userData._b; return b ? b[key[0]][axis] : o[key][axis]; };
function tweenRest(o, key, axis, to, ms, e) {
  const from = restOf(o, key, axis); e = e || ease.inOut;
  return F.T.tween(ms, k => setRest(o, key, axis, from + (to - from) * e(k)));
}
// glow halo sprite (additive radial gradient; generated once)
let haloTex = null;
function halo(parent, color, size, at) {
  if (!haloTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.SpriteMaterial({ map: haloTex, color: F.col(color || 'glowYellow'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
  const s = new THREE.Sprite(m); s.scale.setScalar(size || 1); s.name = 'halo'; s.raycast = () => {};   // never a pick/occlusion target (camera-less raycasts would throw)
  if (at) s.position.copy(at);
  parent.add(s);
  return s;
}
function killHalo(s) { if (s && s.parent) { s.parent.remove(s); s.material.dispose(); } }
// first existing VOX model of a list, else null
function model(ids) { for (const id of [].concat(ids || [])) if (id && F.VOX.has(id)) return id; return null; }
// spawn a small loose model (not a Thing) in the thing's scene; returns Object3D. size = target height in metres
function spawnModel(th, ids, o) {
  o = o || {};
  const id = model(ids);
  let obj;
  if (id) {
    obj = F.VOX.make(id, o.opts || {});
    if (o.size) { const b = new THREE.Box3().setFromObject(obj); const h = Math.max(b.max.y - b.min.y, b.max.x - b.min.x, b.max.z - b.min.z) || 1; obj.scale.setScalar(o.size / h); }
    else if (o.scale) obj.scale.setScalar(o.scale);
  } else {
    const b = F.M.builder(); const sz = o.size || 0.25;
    b.box(sz, sz, sz, o.color || 'pink', 0, sz / 2, 0); obj = b.group;
  }
  obj.userData.loose = true;
  scn(th).add(obj);
  return obj;
}
function removeLater(obj, ms, fx) {
  return F.T.sleep(ms).then(() => {
    const s0 = obj.scale.x;
    return F.T.tween(300, k => obj.scale.setScalar(Math.max(0.001, s0 * (1 - k)))).then(() => {
      if (fx && F.Space.cur) F.FX.sparkle(obj.position.clone().add(V3(0, 0.2, 0)));
      if (obj.parent) obj.parent.remove(obj);
    });
  });
}
const toward = (th, d) => { // a point d metres from the thing towards the fairy (or south / camera side)
  const P = F.Player.pos; let dx = P.x - th.x, dz = P.z - th.z; const L = Math.hypot(dx, dz);
  if (L < 0.2 || th.space !== F.Space.cur) { dx = 0; dz = 1; } else { dx /= L; dz /= L; }
  return { x: th.x + dx * d, z: th.z + dz * d, dx, dz };
};
const groundY = (th, x, z) => { try { return F.Space.impl[th.space || 'out'].heightAt(x, z); } catch (e) { return th.obj.position.y; } };
const COL = n => F.col(n);
const FXK = { // particle colour sets for fx kinds
  confetti: ['pink', 'butter', 'sky', 'mint', 'lilac', 'coral'], petal: ['blossom', 'pink', 'white', 'cherry'], leaf: ['leaf', 'leaf2', 'leafDark'],
  water: ['water', 'sky', 'white'], snow: ['snow', 'white', 'ice'], star: ['butter', 'glowYellow', 'white'], heart: ['rose', 'pink', 'cherry'],
  flour: ['white', 'cream', 'milk'], hay: ['hay', 'butter', 'woodLight'], sand: ['sand', 'cream2', 'woodLight'], bubble: ['glass', 'sky', 'white', 'lilac'],
  crystal: ['crystal', 'gem2', 'lilac', 'white'], honey: ['honey', 'gold', 'butter'], smoke: ['white', 'cream', 'grey'], note: ['pink', 'sky', 'butter', 'mint', 'lilac'],
  lav: ['lavField', 'lilac', 'purple'], gold: ['gold', 'butter', 'glowYellow'],
};
function burst(pos, kind, o) {
  o = o || {};
  const cols = (FXK[kind] || FXK.confetti).map(COL);
  F.FX.burst(pos, Object.assign({ colors: cols, n: 22 }, o));
}

/* ------------------------------------------------------------------ registry */
const BEH = F.BEH = {
  defs, stats, ALIAS,
  add(name, fn) { defs[name] = fn; return fn; },
  has: name => !!defs[name],
  async run(th, name, params) {
    if (!th || !th.obj) return;
    let fn = defs[name];
    if (!fn) { if (!BEH._warned[name]) { BEH._warned[name] = 1; console.warn('F.BEH: unknown behaviour', name); } fn = defs.wobble; }
    th.lastReactAt = F.T.now || 1e-6;
    if (params && params.byModel && th.modelId && params.byModel[th.modelId]) params = Object.assign({}, params, params.byModel[th.modelId]);
    stats.runs++; stats.byName[name] = (stats.byName[name] || 0) + 1;
    // every behaviour makes a visible change (verified per behaviour by tests/press_world.js); flag it synchronously so
    // F.dbg.click's synchronous stepping sees it even when the change is a transient animation
    th.reactedVisibly = true;
    F.emit('react', th, name);
    try { await fn(th, params || {}); } catch (e) { console.error('[BEH ' + name + '] ' + th.type, e); }
    th.reactedVisibly = true;
  },
  _warned: {},
  async runList(th, list, o) {
    if (!th) return;
    if (!list || !list.length) list = [['wobble']];
    th.lastReactAt = F.T.now || 1e-6;
    const bg = [];
    let noSurprise = false;
    if (BEH.fairyTouch && !(o && o.noTouch)) fairyTouch(th);
    for (const it of list) {
      if (typeof it === 'function') { await it(th); continue; }
      const [name, params] = Array.isArray(it) ? it : [it, {}];
      if (name === 'nosurprise') { noSurprise = true; continue; }
      if (params && params.chance != null && R() > params.chance) continue;
      if (params && params.bg) bg.push(BEH.run(th, name, params)); else await BEH.run(th, name, params);
    }
    const surpriseOK = !noSurprise && th.def && th.def.surprise !== false && !(o && o.noSurprise);
    if (surpriseOK && (F.rand ? F.rand() : R()) < (BEH.surpriseRate != null ? BEH.surpriseRate : 0.1)) bg.push(BEH.run(th, 'surprise', {}));
    await Promise.all(bg);
  },
  react(th, list, o) { return BEH.runList(th, list, o); },
  // re-apply persisted visual state (no animation)
  init(th) {
    const list = (th.def && th.def.beh) || [];
    for (const it of list) {
      if (!Array.isArray(it)) continue;
      const [name, p] = it; const ap = APPLY[name]; if (ap) try { ap(th, p || {}); } catch (e) { console.error('BEH.init', name, e); }
    }
    if (th.def && th.def.play) for (const it of th.def.play) { if (Array.isArray(it) && APPLY[it[0]]) try { APPLY[it[0]](th, it[1] || {}); } catch (e) {} }
  },
  // learning spot: offer a task if allowed, else play
  // returns the task Result (or null when it played instead). after(th, result) = payoff in the world after a task.
  async learnOrPlay(th, formats, playList, after) {
    let res = null;
    try {
      if (F.Quest && F.Quest.canOfferTask && F.Quest.canOfferTask() && F.Task && F.Task.offer && !F.Task.current && formats && formats.length) {
        th.lastReactAt = F.T.now || 1e-6;
        F.FX.sparkle(topOf(th, 1)); snd('magic');
        BEH.offers = (BEH.offers || 0) + 1;
        res = await F.Task.offer({ formats, ctx: { thing: th, place: th.data && th.data.place } });
        th.reactedVisibly = true;
      }
    } catch (e) { console.error('learnOrPlay offer failed', th.type, e); }
    if (res) { if (after) try { await after(th, res); } catch (e) { console.error('learn payoff', th.type, e); } }
    else await BEH.runList(th, playList || [['sparkle']]);
    return res;
  },
  util: { legs, part, anim, setRest, tweenRest, halo, killHalo, spawnModel, removeLater, topOf, baseOf, heightOf, snd, model, ease, burst, toward, wpos, carry: (...a) => carryPlayer(...a), seat: (...a) => seat(...a) },
};
const add = BEH.add;
const APPLY = BEH.APPLY = {}; // name -> (th, params) applies persisted state instantly

/* ================================================================== MOTION */
// open: swing a part open (door, lid, hatch). stay:true → persistent toggle (state['open_'+part])
add('open', async (th, p) => {
  const o = part(th, p.part || 'door');
  const axis = p.axis || 'y', ang = p.angle != null ? p.angle : (axis === 'x' ? -1.6 : -1.9), ms = p.ms || 450;
  if (!o) { snd(p.sound || 'door'); burst(topOf(th, 0.8), 'star', { n: 12 }); await BEH.run(th, 'squash', {}); return; }
  if (o.userData._r0 == null) o.userData._r0 = restOf(o, 'rotation', axis);
  const r0 = o.userData._r0;
  snd(p.sound || 'door');
  if (p.stay) {
    const key = 'open_' + (Array.isArray(p.part) ? p.part[0] : (p.part || 'door'));
    const on = !th.state[key]; F.Things.setState(th, { [key]: on });
    await tweenRest(o, 'rotation', axis, on ? r0 + ang : r0, ms, ease.out);
    return;
  }
  await tweenRest(o, 'rotation', axis, r0 + ang, ms, ease.back);
  if (p.fx) burst(wpos(o).add(V3(0, 0.3, 0)), p.fx, { n: 16 });
  await F.T.sleep(p.hold != null ? p.hold : 1300);
  await tweenRest(o, 'rotation', axis, r0, ms * 1.2, ease.inOut);
  snd('click');
});
APPLY.open = (th, p) => {
  if (!p.stay) return; const o = part(th, p.part || 'door'); if (!o) return;
  const axis = p.axis || 'y', ang = p.angle != null ? p.angle : (axis === 'x' ? -1.6 : -1.9);
  if (o.userData._r0 == null) o.userData._r0 = o.rotation[axis];
  const key = 'open_' + (Array.isArray(p.part) ? p.part[0] : (p.part || 'door'));
  o.rotation[axis] = o.userData._r0 + (th.state[key] ? ang : 0);
};

// toggle: persistent on/off. mode light (halo + part visible), rot (rotate part), show (part visible), scale
function applyToggle(th, p, animate) {
  const key = p.key || 'on', on = !!th.state[key], mode = p.mode || 'light';
  const o = part(th, p.part || (mode === 'light' ? 'light' : null));
  if (mode === 'light') {
    if (o) o.visible = p.invert ? !on : (p.hidePart ? on : true);
    th._halos = th._halos || {};
    if (on && !th._halos[key]) {
      const host = o || th.obj; const at = o ? V3(0, 0.05, 0) : V3(0, heightOf(th) * (p.y != null ? p.y : 0.92), 0);
      th._halos[key] = halo(host, p.color || 'glowYellow', p.size || (o ? 0.9 : Math.max(0.8, heightOf(th) * 0.5)), at);
      if (animate) { const h = th._halos[key], s = h.scale.x; F.T.tween(350, k => h.scale.setScalar(s * (0.3 + 0.7 * ease.back(k)))); }
    } else if (!on && th._halos[key]) { killHalo(th._halos[key]); th._halos[key] = null; }
  } else if (mode === 'show') { if (o) o.visible = p.invert ? !on : on; }
  else if (mode === 'rot' && o) {
    const axis = p.axis || 'y'; if (o.userData._r0 == null) o.userData._r0 = o.rotation[axis];
    const to = o.userData._r0 + (on ? (p.angle != null ? p.angle : Math.PI / 2) : 0);
    if (animate) return tweenRest(o, 'rotation', axis, to, p.ms || 400, ease.back); else o.rotation[axis] = to;
  } else if (mode === 'scale' && o) {
    const to = on ? (p.s || 1.6) : 1;
    if (animate) return F.T.tween(350, k => { const s = restOf(o, 'scale', 'x'); const v = s + (to - s) * ease.back(k); setRest(o, 'scale', 'x', v); setRest(o, 'scale', 'y', v); setRest(o, 'scale', 'z', v); });
    o.scale.setScalar(to);
  }
  return Promise.resolve();
}
add('toggle', async (th, p) => {
  const key = p.key || 'on'; const on = !th.state[key];
  F.Things.setState(th, { [key]: on });
  snd(on ? (p.soundOn || 'pling') : (p.soundOff || 'click'), on ? 4 : 0);
  if ((p.mode || 'light') === 'light') burst(topOf(th, 0.95), on ? 'star' : 'smoke', { n: on ? 14 : 6, speed: 1.2, up: 1.5, gravity: 0.5, size: 0.06 });
  await applyToggle(th, p, true);
  await BEH.run(th, 'squash', { amt: 0.08 });
});
APPLY.toggle = (th, p) => { applyToggle(th, p, false); };

add('squash', async (th, p) => {
  const o = tgt(th, p), a0 = p.amt || 0.14;
  if (!p.silent) snd('pop');
  await anim(o, p.ms || 360, (k, b) => { const a = Math.sin(k * Math.PI) * a0 * (1 - k * 0.4); o.scale.set(b.s.x * (1 + a * 0.6), b.s.y * (1 - a), b.s.z * (1 + a * 0.6)); });
});
add('spin', async (th, p) => {
  const o = part(th, p.part) || null, axis = p.axis || 'y', turns = p.turns != null ? p.turns : 1, ms = p.ms || 1200;
  snd(p.sound || 'whoosh');
  if (p.fx) burst(topOf(th, 0.8), p.fx, { n: 14 });
  if (o) { const r0 = restOf(o, 'rotation', axis); await tweenRest(o, 'rotation', axis, r0 + turns * Math.PI * 2 * (p.dir || 1), ms, p.ease ? ease[p.ease] : ease.inOut); return; }
  const w = th.obj; await anim(w, ms, (k, b) => { w.rotation[axis] = b.r[axis] + turns * Math.PI * 2 * ease.inOut(k) * (p.dir || 1); w.position.y = b.p.y + Math.sin(k * Math.PI) * 0.15; });
});
add('wobble', async (th, p) => {
  const o = tgt(th, p), amp = p.amp || 0.16, n = p.n || 4, axis = p.axis || 'z';
  snd(p.sound || 'boing');
  await anim(o, p.ms || 750, (k, b) => { o.rotation[axis] = b.r[axis] + Math.sin(k * Math.PI * n) * amp * (1 - k); });
});
add('bounce', async (th, p) => {
  const o = tgt(th, p), n = p.n || 1, h = p.h || 0.35, per = p.ms || 440;
  for (let i = 0; i < n; i++) {
    snd(p.sound || 'boing');
    const hh = h * (p.grow ? (1 + i * 0.5) : 1);
    await anim(o, per, (k, b) => {
      const y = Math.sin(k * Math.PI) * hh; o.position.y = b.p.y + y;
      const sq = k < 0.15 ? (0.15 - k) * 1.2 : k > 0.85 ? (k - 0.85) * 1.2 : -0.06 * Math.sin(k * Math.PI);
      o.scale.set(b.s.x * (1 + sq), b.s.y * (1 - sq), b.s.z * (1 + sq));
    });
  }
  if (p.fx) burst(baseOf(th), p.fx, { n: 10, speed: 1.5, up: 1.2 });
});
add('swing', async (th, p) => {
  const o = tgt(th, p), axis = p.axis || 'x', amp = p.amp || 0.7, n = p.n || 3, ms = p.ms || 2000;
  snd(p.sound || 'whoosh');
  F.T.timeout(() => snd(p.sound || 'whoosh'), ms * 0.45);
  await anim(o, ms, (k, b) => { o.rotation[axis] = b.r[axis] + Math.sin(k * Math.PI * 2 * n / 2) * amp * (1 - k * 0.85); });
});
add('rise', async (th, p) => {
  snd(p.sound || 'grow');
  if (p.model) { // things rise out of the top (buns from oven, honey, bubbles)
    const n = p.n || 3, items = [];
    for (let i = 0; i < n; i++) {
      const it = spawnModel(th, p.model, { size: p.size || 0.3, color: p.color });
      const t0 = topOf(th, p.from != null ? p.from : 0.9); it.position.copy(t0); items.push(it);
      const dx = (i - (n - 1) / 2) * 0.35, rise = p.h || 1.2, s = it.scale.x;
      F.T.tween(900, k => { it.position.set(t0.x + dx * ease.out(k), t0.y + rise * ease.out(k), t0.z); it.scale.setScalar(s * Math.min(1, k * 3)); it.rotation.y = k * 3; });
      await F.T.sleep(160);
    }
    await F.T.sleep(900);
    burst(topOf(th, 1).add(V3(0, p.h || 1.2, 0)), p.fx || 'star', { n: 16 });
    items.forEach(it => removeLater(it, p.life || 1500, false));
    return;
  }
  const o = tgt(th, p), h = p.h || 0.6, ms = p.ms || 600;
  await anim(o, ms * 2 + (p.hold != null ? p.hold : 1000), (k, b) => {
    const T = ms * 2 + (p.hold != null ? p.hold : 1000), t = k * T;
    const e = t < ms ? ease.back(t / ms) : t > T - ms ? 1 - ease.inOut((t - (T - ms)) / ms) : 1;
    o.position.y = b.p.y + h * e;
  });
});
add('topple', async (th, p) => {
  const o = tgt(th, p), axis = p.axis || 'x', ang = p.angle || 1.35, hold = p.hold != null ? p.hold : 900;
  snd('whoosh');
  await anim(o, 500 + hold + 600, (k, b) => {
    const T = 1100 + hold, t = k * T;
    let a;
    if (t < 500) { const q = t / 500; a = ang * q * q; }
    else if (t < 500 + hold) { const q = (t - 500) / hold; a = ang - Math.abs(Math.sin(q * Math.PI * 3)) * 0.12 * (1 - q); if (!o.userData._thud) { o.userData._thud = 1; snd('thud'); } }
    else { const q = (t - 500 - hold) / 600; a = ang * (1 - ease.back(q)); if (o.userData._thud === 1) { o.userData._thud = 2; snd('boing'); } }
    o.rotation[axis] = b.r[axis] + a;
  });
  o.userData._thud = 0;
});
add('shake', async (th, p) => {
  const o = tgt(th, p);
  snd(p.sound || 'rustle');
  burst(topOf(th, 0.85), p.fx || 'leaf', { n: p.n || 16, speed: 1.6, up: 0.6, gravity: 2.2, size: 0.07 });
  await anim(o, p.ms || 700, (k, b) => { o.rotation.z = b.r.z + Math.sin(k * Math.PI * 10) * 0.07 * (1 - k); o.rotation.x = b.r.x + Math.cos(k * Math.PI * 9) * 0.05 * (1 - k); });
});
add('hop', async (th, p) => { // hop to a nearby spot and back (animals)
  const o = th.obj, n = p.n || 2, d = p.dist || 0.7;
  const a = R() * Math.PI * 2, dx = Math.cos(a) * d, dz = Math.sin(a) * d;
  await anim(o, 380 * n * 2, (k, b) => {
    const seg = k * n * 2, i = Math.floor(seg), f = seg - i, out = i < n;
    const frac = out ? (i + f) / n : (2 * n - (i + f)) / n;
    o.position.x = b.p.x + dx * frac; o.position.z = b.p.z + dz * frac;
    o.position.y = b.p.y + Math.sin(f * Math.PI) * (p.h || 0.25); legs(th, k < 0.98 ? k * 40 : null);
    o.rotation.y = b.r.y + (out ? Math.atan2(dx, dz) - b.r.y : Math.atan2(-dx, -dz) - b.r.y) * Math.min(1, k * 6);
    if (f < 0.05 && !o.userData._hs) { o.userData._hs = 1; snd(p.sound || 'step'); } if (f > 0.5) o.userData._hs = 0;
  });
  snd(p.sound2 || 'boing');
});
add('walk', async (th, p) => { // wander a little and come back
  const o = th.obj, r = p.r || 1.5, a = R() * Math.PI * 2, dx = Math.cos(a) * r, dz = Math.sin(a) * r, ms = p.ms || 2400;
  snd(p.sound || 'step');
  await anim(o, ms, (k, b) => {
    const f = k < 0.5 ? ease.inOut(k * 2) : 1 - ease.inOut((k - 0.5) * 2);
    o.position.x = b.p.x + dx * f; o.position.z = b.p.z + dz * f;
    o.position.y = b.p.y + Math.abs(Math.sin(k * Math.PI * 10)) * 0.06;
    o.rotation.y = k < 0.5 ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
    legs(th, k < 0.98 ? k * 50 : null);
  });
  legs(th, null);
});
add('bob', async (th, p) => { // floating bob + roll (boats, ducks)
  const o = tgt(th, p);
  snd(p.sound || 'splash');
  burst(baseOf(th).add(V3(0, 0.1, 0)), 'water', { n: 10, speed: 1.4, up: 1.2, size: 0.06 });
  await anim(o, p.ms || 1600, (k, b) => { o.position.y = b.p.y + Math.sin(k * Math.PI * 4) * 0.12 * (1 - k * 0.5); o.rotation.z = b.r.z + Math.sin(k * Math.PI * 3) * 0.12 * (1 - k); });
});
add('face', async (th, p) => { // turn a part (or the whole thing) towards the fairy (sunflower)
  const o = tgt(th, p); const P = F.Player.pos;
  const ang = Math.atan2(P.x - th.x, P.z - th.z) - th.ry; const from = restOf(o, 'rotation', 'y');
  let d = ang - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(d) < 0.25) d += 0.9 * (R() < 0.5 ? -1 : 1); // always a visible turn
  snd(p.sound || 'grow');
  await tweenRest(o, 'rotation', 'y', from + d, p.ms || 700, ease.back);
  burst(wpos(o).add(V3(0, 0.3, 0)), p.fx || 'petal', { n: 10, speed: 1, up: 1.5, gravity: 1 });
});
add('emerge', async (th, p) => { // a hidden part pops up and goes back (frog from well, kitten from hay)
  const o = part(th, p.part);
  if (!o) { await BEH.run(th, 'pop', { model: p.model || 'o_frosk', n: 1, life: 2500, sound: p.sound }); return; }
  const h = p.h || 0.5; o.visible = true;
  snd(p.sound || 'pop');
  await anim(o, (p.hold || 1400) + 700, (k, b) => {
    const T = (p.hold || 1400) + 700, t = k * T;
    const e = t < 350 ? ease.back(t / 350) : t > T - 350 ? 1 - (t - (T - 350)) / 350 : 1;
    o.position.y = b.p.y + h * e; o.rotation.z = b.r.z + Math.sin(t / 120) * 0.1 * e;
  });
  if (p.hide) o.visible = false;
});
// cycle: show exactly one of several parts in turn (hedge shapes, snowman stages); persisted index
function applyCycle(th, p) {
  const parts = (p.parts || []).map(n => part(th, n)).filter(Boolean); const st = th.state[p.key || 'cyc'];
  const i = st == null ? (p.only ? 0 : parts.length - 1) : st % Math.max(1, parts.length);
  parts.forEach((o, j) => { if (o) o.visible = p.only ? j === i : j <= i; });
  return parts[i];
}
add('cycle', async (th, p) => {
  const parts = (p.parts || []).filter(n => part(th, n)); const key = p.key || 'cyc';
  p = Object.assign({}, p, { parts });
  const cur = th.state[key] == null ? (p.only ? 0 : parts.length - 1) : th.state[key];
  const i = (cur + 1) % Math.max(1, parts.length);
  if (i === 0 && p.wrapFx) burst(topOf(th, 0.5), p.wrapFx, { n: 30, speed: 2.5, up: 2.5 });
  F.Things.setState(th, { [key]: i });
  const o = applyCycle(th, p);
  snd(p.sound || 'pop');
  burst(o ? wpos(o).add(V3(0, 0.2, 0)) : topOf(th), p.fx || 'star', { n: 14 });
  if (o) { const s = o.scale.x || 1; await anim(o, 380, (k, b) => o.scale.setScalar(b.s.x * (0.4 + 0.6 * ease.back(k)))); }
  else await BEH.run(th, 'squash', { silent: true });
});
APPLY.cycle = (th, p) => { applyCycle(th, p); };

/* ================================================================== SOUND & LIGHT */
add('ring', async (th, p) => {
  const n = p.n || 1, o = part(th, p.part || 'bell'), f = p.f || 880, gap = p.gap || (p.count ? 520 : 380);
  for (let i = 0; i < n; i++) {
    snd('bell', f * (p.rise ? Math.pow(1.06, i) : 1));
    const at = o ? wpos(o) : topOf(th, 0.9);
    F.FX.ring(at, COL(p.color || 'gold'));
    if (o) anim(o, gap * 0.9, (k, b) => { o.rotation.z = b.r.z + Math.sin(k * Math.PI * 2) * 0.35 * (1 - k); });
    else anim(th.obj, gap * 0.9, (k, b) => { th.obj.rotation.z = b.r.z + Math.sin(k * Math.PI * 2) * 0.05 * (1 - k); });
    if (p.count) { F.FX.float(String(i + 1), at); F.SAY('obj_num', { n: i + 1 }); }
    await F.T.sleep(gap);
  }
  if (p.count) { await F.Speech.idle(); }
});
const SCALES = { penta: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], major: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17], minor: [0, 3, 7, 10, 12], low: [-12, -10, -8, -5, -3, 0] };
add('note', async (th, p) => {
  const sc = SCALES[p.scale || 'penta'] || SCALES.penta; th._ni = (th._ni || 0);
  const n = p.n || 1;
  if (p.parts) { const ex = p.parts.filter(nm => part(th, nm)); p = Object.assign({}, p, { parts: ex.length ? ex : null }); }
  for (let j = 0; j < n; j++) {
    const i = th._ni++ % sc.length; const f = F.note(sc[i] + (p.oct || 12));
    snd(p.inst || 'pluck', f);
    const at = topOf(th, 0.95); const c = FXK.note[i % FXK.note.length];
    F.FX.burst(at, { n: 8, colors: [COL(c), COL('white')], speed: 0.6, up: 2.2, gravity: -0.4, life: 1.1, size: 0.07 });
    const o = (p.parts && part(th, p.parts[i % p.parts.length])) || tgt(th, p);
    const hop = p.parts ? 0.1 : 0.06;
    await anim(o, 220, (k, b) => { o.position.y = b.p.y + Math.sin(k * Math.PI) * hop; o.scale.y = b.s.y * (1 - Math.sin(k * Math.PI) * 0.06); });
    if (j < n - 1) await F.T.sleep(p.gap || 80);
  }
});
// light: parts light up one by one (halo + visible), counted plings; off again after hold (unless stay)
add('light', async (th, p) => {
  const ms = p.ms || 280, hold = p.hold != null ? p.hold : 1800;
  let targets = [];
  if (Array.isArray(p.seq)) targets = p.seq.map(n => part(th, n)).filter(Boolean);
  if (!targets.length) { // n halos around the top
    const n = p.n || (typeof p.seq === 'number' ? p.seq : 5), h = heightOf(th);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const g = new THREE.Group(); g.position.set(Math.cos(a) * 0.5, h * 0.9 + 0.2, Math.sin(a) * 0.5); th.obj.add(g); g.userData.tmp = true; targets.push(g); }
  }
  const halos = [];
  for (let i = 0; i < targets.length; i++) {
    const o = targets[i]; o.visible = true;
    halos.push(halo(o, p.color || 'glowYellow', p.size || 0.8));
    snd('pling', i % 12);
    F.FX.sparkle(wpos(o), COL(p.color || 'butter'));
    await F.T.sleep(ms);
  }
  if (p.stay) return;
  await F.T.sleep(hold);
  for (let i = halos.length - 1; i >= 0; i--) { killHalo(halos[i]); const o = targets[i]; if (o.userData.tmp && o.parent) o.parent.remove(o); }
  snd('click');
});
add('glow', async (th, p) => {
  const h = halo(th.obj, p.color || 'glowYellow', 0.1, V3(0, heightOf(th) * (p.y || 0.6), 0));
  snd(p.sound || 'chime');
  const size = p.size || Math.max(1.2, heightOf(th) * 1.4);
  await F.T.tween(p.ms || 1400, k => { h.scale.setScalar(0.1 + size * Math.sin(k * Math.PI)); h.material.opacity = 0.9 * Math.sin(k * Math.PI); });
  killHalo(h);
});
add('sparkle', async (th, p) => {
  snd('sparkle');
  const n = p.n || 3;
  for (let i = 0; i < n; i++) {
    const t = topOf(th, 0.4 + 0.6 * R()); t.x += (R() - 0.5) * 0.8; t.z += (R() - 0.5) * 0.8;
    F.FX.sparkle(t, COL(p.color || 'butter'));
    if (i === 0) BEH.run(th, 'squash', { amt: 0.1, silent: true });
    await F.T.sleep(150);
  }
});
add('beam', async (th, p) => { // lighthouse: rotating light beam
  const o = part(th, p.part || 'beam') || th.obj;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: COL('glowYellow'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.geometry.translate(0, -4.5, 0); beam.rotation.z = Math.PI / 2;
  const pivot = new THREE.Group(); pivot.position.set(0, o === th.obj ? heightOf(th) * 0.85 : 0, 0); pivot.add(beam); o.add(pivot);
  const hl = halo(pivot, 'glowYellow', 2.2);
  snd('chime'); snd('magic');
  const turns = p.turns || 2;
  await F.T.tween(p.ms || 3200, k => { pivot.rotation.y = k * turns * Math.PI * 2; beam.material.opacity = 0.35 * Math.min(1, Math.sin(k * Math.PI) * 3); });
  o.remove(pivot); killHalo(hl); beam.geometry.dispose(); beam.material.dispose();
});

/* ================================================================== WATER & GROWTH */
add('pour', async (th, p) => {
  const o = tgt(th, p), axis = p.axis || 'z', ang = p.angle != null ? p.angle : -0.9, ms = p.ms || 1700;
  snd(p.sound || 'pour');
  let acc = 0;
  await anim(o, ms, (k, b) => {
    const e = k < 0.25 ? ease.out(k / 0.25) : k > 0.8 ? 1 - ease.inOut((k - 0.8) / 0.2) : 1;
    o.rotation[axis] = b.r[axis] + ang * e;
    acc++;
    if (e > 0.7 && acc % 2 === 0) {
      const sp = p.spout ? o.localToWorld(V3(...p.spout)) : topOf(th, 0.8).add(V3(axis === 'z' ? 0.35 * Math.sign(-ang) : 0, 0, axis === 'x' ? 0.35 : 0));
      F.FX.burst(sp, { n: 3, colors: (FXK[p.fx || 'water'] || FXK.water).map(COL), speed: 0.4, up: 0.2, gravity: 9, life: 0.7, size: 0.06 });
    }
  });
  if (p.fill) await BEH.run(th, p.fill[0], p.fill[1] || {});
});
add('splash', async (th, p) => {
  const at = p.at ? V3(p.at.x, p.at.y, p.at.z) : baseOf(th).add(V3(0, 0.15, 0));
  snd('splash');
  burst(at, p.fx || 'water', { n: p.n || 30, speed: 2.2, up: 3.2, gravity: 9, size: 0.08 });
  F.FX.ring(at, COL('white'));
  const o = tgt(th, p);
  await anim(o, 600, (k, b) => { o.position.y = b.p.y - Math.sin(k * Math.PI) * 0.12; o.scale.y = b.s.y * (1 + Math.sin(k * Math.PI * 2) * 0.06); });
});
add('steam', async (th, p) => {
  snd(p.sound || 'whoosh');
  const n = p.n || 4;
  for (let i = 0; i < n; i++) {
    const at = topOf(th, 1); F.FX.burst(at, { n: 6, colors: (FXK[p.fx || 'smoke'] || FXK.smoke).map(COL), speed: 0.3, up: 1.4, gravity: -0.6, life: 1.4, size: 0.12 });
    await F.T.sleep(160);
  }
  await BEH.run(th, 'wobble', { amp: 0.05, n: 6, ms: 500, sound: 'drip' });
});
// grow: part scales up by stages (persisted); after the last stage it is "harvested" and starts small again
function growScale(p, st) { const n = Math.max(2, p.stages || 3), s0 = p.s0 != null ? p.s0 : 0.35; return s0 + (1 - s0) * Math.min(st, n - 1) / (n - 1); }
add('grow', async (th, p) => {
  const o = tgt(th, p), key = p.key || 'stage', n = Math.max(2, p.stages || 3);
  let st = (th.state[key] != null ? th.state[key] : n - 1) + 1;
  if (st >= n) { // harvest
    st = 0;
    burst(wpos(o).add(V3(0, heightOf(th) * 0.6, 0)), p.fx || 'petal', { n: 26 });
    if (p.harvest) BEH.run(th, 'pop', { model: p.harvest, n: p.hn || 1, life: 3500 });
    snd('tada');
  } else snd('grow');
  F.Things.setState(th, { [key]: st });
  const to = growScale(p, st), from = restOf(o, 'scale', 'y');
  await F.T.tween(p.ms || 650, k => { const v = from + (to - from) * ease.back(k); setRest(o, 'scale', 'x', v); setRest(o, 'scale', 'y', v); setRest(o, 'scale', 'z', v); });
  if (o === th.obj) th.bboxDirty = true;
  F.FX.sparkle(wpos(o).add(V3(0, 0.3, 0)), COL('butter'));
});
APPLY.grow = (th, p) => {
  const o = tgt(th, p), key = p.key || 'stage';
  if (th.state[key] == null) return; o.scale.setScalar(growScale(p, th.state[key]));
};

/* ================================================================== SPAWNING & ANIMALS */
// pop: a little model pops out with an arc, lands nearby, stays, then shrinks away
add('pop', async (th, p) => {
  const n = p.n || 1, life = p.life || 4000, items = [];
  snd(p.sound || 'pop');
  for (let i = 0; i < n; i++) {
    const it = spawnModel(th, p.model || 'o_blomst', { size: p.size || 0.35, color: p.color, opts: p.opts });
    const from = p.from === 'base' ? baseOf(th).add(V3(0, 0.2, 0)) : topOf(th, p.from != null && typeof p.from === 'number' ? p.from : 0.85);
    const tw = toward(th, (th.radius || 0.6) + (p.dist || 0.8) + R() * 0.4);
    const a = Math.atan2(tw.dx, tw.dz) + (i - (n - 1) / 2) * 0.5 + (R() - 0.5) * 0.4;
    const L = (th.radius || 0.6) + (p.dist || 0.8) + R() * 0.3;
    const tx = th.x + Math.sin(a) * L, tz = th.z + Math.cos(a) * L, ty = groundY(th, tx, tz);
    const s = it.scale.x; it.position.copy(from); it.scale.setScalar(s * 0.2);
    items.push(it);
    F.T.tween(650, k => {
      it.position.set(from.x + (tx - from.x) * k, from.y + (ty - from.y) * k + Math.sin(k * Math.PI) * 1.0, from.z + (tz - from.z) * k);
      it.scale.setScalar(s * (0.2 + 0.8 * Math.min(1, k * 2))); it.rotation.y = k * Math.PI * 2;
    }).then(() => { snd('thud'); F.FX.sparkle(it.position.clone().add(V3(0, 0.1, 0))); anim(it, 300, (k, b) => { it.scale.y = b.s.y * (1 - Math.sin(k * Math.PI) * 0.3); }); });
    await F.T.sleep(140);
  }
  await F.T.sleep(700);
  if (p.keep) return items;
  items.forEach(it => removeLater(it, life, true));
  return items;
});
// drop: items fall from the top (apple tree) around the thing; with count:true they hop into a ten-tray and are counted
add('drop', async (th, p) => {
  const n = p.n === 'teen' ? 10 + Math.floor(R() * 11) : (p.n || 5), r = p.r || 1.4, items = [];
  snd('rustle');
  const h = heightOf(th) * (p.from || 0.75);
  for (let i = 0; i < n; i++) {
    const it = spawnModel(th, p.model || 'o_eple', { size: p.size || 0.3, color: p.color });
    const a = R() * Math.PI * 2, d = 0.4 + R() * r, sx = th.x + Math.cos(a) * d * 0.6, sz = th.z + Math.sin(a) * d * 0.6;
    const tx = th.x + Math.cos(a) * (d + (th.radius || 0.5) * 0.5), tz = th.z + Math.sin(a) * (d + (th.radius || 0.5) * 0.5), ty = groundY(th, tx, tz);
    const y0 = th.obj.position.y + h;
    it.position.set(sx, y0, sz); items.push(it);
    F.T.tween(520 + R() * 200, k => { it.position.set(sx + (tx - sx) * k, y0 + (ty - y0) * k * k, sz + (tz - sz) * k); }).then(() => { snd('thud'); anim(it, 320, (k, b) => { it.position.y = b.p.y + Math.sin(k * Math.PI) * 0.15; }); });
    await F.T.sleep(110);
  }
  await F.T.sleep(900);
  if (p.count) {
    await countItems(th, items, p);
  } else items.forEach(it => removeLater(it, p.life || 4000, true));
});
// fly: tiny birds take off from the thing and fly away in a spiral
add('fly', async (th, p) => {
  const n = p.birds || p.n || 3, ms = p.ms || 2600, start = topOf(th, p.from || 0.9);
  const list = [];
  for (let i = 0; i < n; i++) {
    const b = spawnModel(th, p.model || 'o_fugl', { size: p.size || 0.22, opts: { c: p.color || U.pick(R, ['sky', 'butter', 'coral', 'lilac', 'mint']) } });
    b.position.copy(start); list.push(b);
    const a0 = R() * Math.PI * 2, dir = R() < 0.5 ? 1 : -1, rad = 0.8 + R() * 1.2, up = 4 + R() * 3, away = 6 + R() * 4;
    const wl = b.userData.parts && b.userData.parts.wingL, wr = b.userData.parts && b.userData.parts.wingR;
    F.T.timeout(() => snd('chirp'), i * 180);
    F.T.tween(ms + i * 150, k => {
      const a = a0 + dir * k * Math.PI * 3;
      const rr = rad + away * k * k;
      b.position.set(start.x + Math.cos(a) * rr, start.y + up * k + Math.sin(k * Math.PI * 6) * 0.15, start.z + Math.sin(a) * rr);
      b.rotation.y = -a + (dir > 0 ? 0 : Math.PI);
      const fl = Math.sin(k * 90) * 0.9; if (wl) wl.rotation.z = fl; if (wr) wr.rotation.z = -fl;
      if (k > 0.8) b.scale.setScalar(Math.max(0.001, b.userData.s0 * (1 - (k - 0.8) / 0.2)));
    }).then(() => { if (b.parent) b.parent.remove(b); });
    b.userData.s0 = b.scale.x;
    await F.T.sleep(120);
  }
  await BEH.run(th, 'squash', { amt: 0.08, silent: true });
  await F.T.sleep(ms * 0.5);
});
// follow: the (animal) thing follows the fairy for a few seconds, then trots home
add('follow', async (th, p) => {
  if (th.space !== F.Space.cur || th._following) { await BEH.run(th, 'hop', {}); return; }
  th._following = true;
  const o = th.obj, home = o.position.clone(), r0 = o.rotation.y, secs = p.secs || 5, keep = p.dist || 1.5;
  snd(p.sound || 'boing');
  burst(topOf(th, 1), 'heart', { n: 8, up: 2, speed: 0.8, gravity: 1 });
  let t = 0, hopT = 0;
  await new Promise(res => {
    const off = F.on('tick', dt => {
      t += dt; hopT += dt;
      const P = F.Player.pos, back = t > secs;
      const gx = back ? home.x : P.x, gz = back ? home.z : P.z;
      const dx = gx - o.position.x, dz = gz - o.position.z, d = Math.hypot(dx, dz);
      const want = back ? 0.05 : keep;
      if (d > want) { const sp = Math.min(d - want, dt * (back ? 2.6 : 3.2)); o.position.x += dx / d * sp; o.position.z += dz / d * sp; o.rotation.y = Math.atan2(dx, dz); legs(th, hopT * 12); } else legs(th, null);
      o.position.y = groundY(th, o.position.x, o.position.z) + Math.abs(Math.sin(hopT * 9)) * 0.12;
      if ((back && d <= 0.06) || t > secs + 12) { o.position.copy(home); o.rotation.y = r0; legs(th, null); off(); res(); }
    });
  });
  th._following = false;
  snd(p.sound || 'boing');
});

/* ================================================================== RIDING & CHARACTERS */
// attach the fairy's avatar to a moving point (preRender override) for ms; restores her afterwards
function carryPlayer(getPos, ms, o) {
  o = o || {};
  const P = F.Player, wasFrozen = P.frozen; P.frozen = true; P.stop && P.stop();
  const start = P.obj.position.clone(), startPos = P.pos.clone();
  let t = 0; const T = ms / 1000, ramp = 0.3, t0 = F.T.now;
  return new Promise(res => {
    const off = F.on('preRender', dt => {
      t = F.T.now - t0; // game clock: a paused game pauses the ride too
      const g = getPos(Math.min(1, t / T));
      const inK = Math.min(1, t / ramp), outK = Math.max(0, (t - T) / ramp);
      if (outK > 0) { P.obj.position.lerpVectors(g, start, Math.min(1, outK)); }
      else P.obj.position.lerpVectors(start, g, ease.inOut(inK));
      if (o.face != null) P.obj.rotation.y = o.face;
      // the camera follows the ride (P.pos drives the camera target); she is put back where she started at the end
      if (o.follow !== false && F.R.cam.mode === 'out') { P.pos.x = P.obj.position.x; P.pos.z = P.obj.position.z; F.R.cam.target.y = P.pos.y + (P.obj.position.y - P.pos.y) * 0.55; }
      if (t > T + ramp) { off(); P.frozen = wasFrozen || !!(F.UI.isOpen && F.UI.isOpen()); P.pos.copy(startPos); res(); }
    });
  });
}
// v3 WP3: an open-ended seat (the throne ceremony). seat(th, {pos: () => Vector3 (where her root goes), face, stand: {x, z}, ms})
//   -> handle { ready: Promise (she has landed), active, release({instant}) -> Promise }.
// She hops onto the seat, sits (avatar pose 'sit': wings folded, no bob) and stays – P.frozen is held every frame (a task panel opening
// and closing in between cannot let her walk off the throne). release() hops her down to `stand` (default 1.3 m in front of the seat)
// and gives control back. A space change (she is moved out of the building) releases at once.
function seat(th, o) {
  o = o || {};
  const P = F.Player, av = () => P.avatar && P.avatar.userData;
  const ry = th.ry != null ? th.ry : (th.obj ? th.obj.rotation.y : 0);
  const seatPos = o.pos || (() => { const s = topOf(th, 0.5); s.y -= 0.25; return s; });
  const stand = o.stand || { x: th.x + Math.sin(ry) * 1.3, z: th.z + Math.cos(ry) * 1.3 };
  const ms = (o.ms || 650) / 1000, face = o.face != null ? o.face : ry;
  P.stop && P.stop(); P.frozen = true;
  const from = P.obj.position.clone();
  let phase = 'in', tPh = F.T.now, outFrom = null, resIn, resOut;
  const h = { active: true, ready: new Promise(r => { resIn = r; }) };
  const hopTo = (a, b, k) => { const e = ease.inOut(k); P.obj.position.lerpVectors(a, b, e); P.obj.position.y += Math.sin(k * Math.PI) * 0.55; };
  const finish = () => {
    if (!h.active) return; h.active = false; off(); offSp();
    const u = av(); if (u && u.setPose) u.setPose(null);
    P.pos.x = stand.x; P.pos.z = stand.z;
    if (F.Space.heightAt) P.pos.y = F.Space.heightAt(P.pos.x, P.pos.z);
    P.heading = face;
    P.frozen = !!(F.Task && F.Task.current) || !!(F.UI.isOpen && F.UI.isOpen());
    if (resIn) resIn(); if (resOut) resOut();
  };
  const off = F.on('preRender', () => {
    if (!h.active) return;
    P.frozen = true;
    const g = seatPos(), k = Math.min(1, (F.T.now - tPh) / ms);
    if (phase === 'in') { hopTo(from, g, k); if (k >= 1) { phase = 'hold'; const u = av(); if (u && u.setPose) u.setPose('sit'); snd('squeak'); resIn(); } }
    else if (phase === 'hold') {
      // her logical spot is the seat (the camera frames the throne); a task stage in front must not «step her out» (stage.js stageFit
      // moves P.pos when it stands inside the stage rect – she is seated, so its timer is held; REQUEST WP7: honour ctx.keepPlayer there)
      P.obj.position.copy(g); P.pos.x = g.x; P.pos.z = g.z;
      const tc = F.Task && F.Task.current; if (tc && tc.S) tc.S._fairyMoveT = F.T.now;
    }
    else if (phase === 'out') { const to = V3(stand.x, (F.Space.heightAt ? F.Space.heightAt(stand.x, stand.z) : g.y) + 0.35, stand.z); hopTo(outFrom, to, k); if (k >= 1) finish(); }
    P.obj.rotation.y = face;
  });
  const offSp = F.on('spaceChanged', () => finish());
  h.release = (ro) => {
    if (!h.active) return Promise.resolve();
    if ((ro && ro.instant) || phase === 'in') { finish(); return Promise.resolve(); }
    const u = av(); if (u && u.setPose) u.setPose(null);
    outFrom = P.obj.position.clone(); phase = 'out'; tPh = F.T.now; snd('whoosh');
    return new Promise(r => { resOut = r; });
  };
  return h;
}
add('sit', async (th, p) => {
  const o = part(th, p.part || 'seat');
  const seat = () => (o ? wpos(o) : topOf(th, p.top != null ? p.top : 0.55)).add(V3(0, (p.dy || 0) - 0.25, 0));
  snd(p.sound || 'squeak');
  BEH.run(th, 'squash', { amt: 0.1, silent: true });
  if (th.space !== F.Space.cur) { await F.T.sleep(p.ms || 2200); return; }
  burst(seat().add(V3(0, 0.6, 0)), 'heart', { n: 8, up: 1.5, speed: 0.7, gravity: 0.6 });
  await carryPlayer(k => seat().add(V3(0, Math.sin(k * Math.PI * 4) * 0.03, 0)), p.ms || 2400, { face: th.ry + (p.faceY || 0) });
});
add('ride', async (th, p) => {
  const mode = p.mode || (p.part ? 'part' : 'circle'), ms = p.ms || 4000;
  snd(p.sound || 'whoosh');
  if (p.music) snd(p.music);
  const o = part(th, p.part) || th.obj;
  let inner = null;
  if (p.with) inner = BEH.run(th, p.with[0], Object.assign({ ms }, p.with[1] || {}));
  const here = th.space === F.Space.cur;
  if (mode === 'part') {
    if (here) await carryPlayer(() => wpos(o).add(V3(0, (p.dy || 0) - 0.3, 0)), ms);
    else await F.T.sleep(ms);
  } else if (mode === 'orbit') { // the fairy circles around the thing (skating pond, carousel)
    const c = baseOf(th), r = p.r || 2.5, turns = p.turns || 1;
    if (p.fx) { setIntervalT(() => burst(F.Player.obj.position.clone(), p.fx, { n: 3, speed: 0.6, up: 0.6, size: 0.05 }), 120, ms); }
    if (here) await carryPlayer(k => V3(c.x + Math.sin(k * Math.PI * 2 * turns) * r, c.y + (p.dy || 0.1), c.z + Math.cos(k * Math.PI * 2 * turns) * r), ms);
    else await F.T.sleep(ms);
  } else if (mode === 'circle' || mode === 'line') {
    const w = th.obj, r = p.r || 3, dy = p.dy || 0;
    const path = k => mode === 'circle'
      ? V3(Math.sin(k * Math.PI * 2) * r, Math.sin(k * Math.PI) * (p.up || 0), (1 - Math.cos(k * Math.PI * 2)) * r * (p.flip ? -1 : 1))
      : (() => { const f = k < 0.6 ? ease.inOut(k / 0.6) : 1 - ease.inOut((k - 0.6) / 0.4); return V3((p.dx || 0) * f, (p.dyLine || 0) * f, (p.dz != null ? p.dz : 4) * f); })();
    const mv = anim(w, ms, (k, b) => {
      const d = path(k); w.position.set(b.p.x + d.x, b.p.y + d.y + Math.sin(k * Math.PI * 12) * (p.jiggle != null ? p.jiggle : 0.04), b.p.z + d.z);
      if (p.terrain) w.position.y = groundY(th, w.position.x, w.position.z) + d.y;
      const d2 = path(Math.min(1, k + 0.01)); if (mode === 'circle' || k < 0.6) w.rotation.y = Math.atan2(d2.x - d.x, d2.z - d.z) || w.rotation.y;
      if (p.wake && (k * 100 | 0) % 6 === 0) F.FX.burst(w.position.clone(), { n: 2, colors: [COL('white'), COL('water')], speed: 0.6, up: 0.6, gravity: 4, life: 0.6, size: 0.06 });
    });
    if (here) await carryPlayer(() => th.obj.position.clone().add(V3(0, heightOf(th) * (p.seatY || 0.5) + dy - 0.2, 0)), ms);
    await mv;
  }
  if (inner) await inner;
  snd('tada');
});
// view: the camera pulls back for a wide look over the kingdom (lighthouse, balloon), then returns
add('view', async (th, p) => {
  if (th.space !== F.Space.cur || F.R.cam.mode !== 'out') { await BEH.run(th, 'sparkle', {}); return; }
  const c = F.R.cam, d0 = c.distGoal, pitch0 = c.pitchGoal;
  snd('magic');
  F.R.setCam({ dist: p.dist || 55, pitch: p.pitch || 1.0 });
  await F.T.sleep(p.ms || 3500);
  F.R.setCam({ dist: d0, pitch: pitch0 });
  snd('whoosh');
});
add('dance', async (th, p) => {
  const o = tgt(th, p), ms = p.ms || 2400;
  snd(p.music || 'tune');
  const notes = setIntervalT(() => F.FX.burst(topOf(th, 1), { n: 4, colors: FXK.note.map(COL), speed: 0.6, up: 2, gravity: -0.3, life: 1, size: 0.07 }), 400, ms);
  await anim(o, ms, (k, b) => {
    const t = k * ms / 1000;
    o.position.y = b.p.y + Math.abs(Math.sin(t * Math.PI * 2.5)) * 0.18;
    o.rotation.y = b.r.y + Math.sin(t * Math.PI * 1.25) * 0.6 + (k > 0.7 ? (k - 0.7) / 0.3 * Math.PI * 2 : 0);
    o.rotation.z = b.r.z + Math.sin(t * Math.PI * 2.5) * 0.12;
  });
  await notes;
});
function setIntervalT(fn, every, total) { let n = Math.floor(total / every); const go = () => { if (n-- <= 0) return Promise.resolve(); fn(); return F.T.sleep(every).then(go); }; return go(); }

/* ================================================================== COUNTING & SPEECH */
// ten-tray: row of ten (back) + the rest (front), each item lands with a rising pling and the total chip shows at the end. natural
// 11.10. (audit #18): a free tap never counts aloud – the tray and the numeral are the count (no obj_num per item)
function trayLayout(th, n, sp) {
  // rows run along the screen x-axis (camera yaw) so the row of ten reads left→right; the tray sits on the camera side of
  // the thing, shifted sideways away from the fairy so she never hides it
  const yaw = F.R.cam.yaw || 0, ax = Math.cos(yaw), az = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
  const P = F.Player.pos, side = ((P.x - th.x) * ax + (P.z - th.z) * az) >= 0 ? -1 : 1, front = (th.radius || 0.6) + 0.9, shift = side * (sp * 5 + 0.8);
  let cx = th.x + fx * front + ax * shift, cz = th.z + fz * front + az * shift;
  // indoors: keep the whole tray inside the current room (the sideways shift pushed it into a wall)
  if (th.space === 'in' && F.Castle && F.Castle.roomAt) try {
    const rm = F.Castle.roomAt(th.x, th.y), bd = rm && rm.bounds;
    if (bd) { const hw = Math.abs(ax) * sp * 5.3 + Math.abs(fx) * sp * 1.2 + 0.45, hd = Math.abs(az) * sp * 5.3 + Math.abs(fz) * sp * 1.2 + 0.45;
      if (bd.x1 - bd.x0 > 2 * hw) cx = U.clamp(cx, bd.x0 + hw, bd.x1 - hw); if (bd.z1 - bd.z0 > 2 * hd) cz = U.clamp(cz, bd.z0 + hd, bd.z1 - hd); }
  } catch (e) {}
  const pos = [];
  for (let i = 0; i < n; i++) {
    const row = i < 10 ? 0 : 1, col = i < 10 ? i : i - 10;
    const off = (col - 4.5) * sp, back = row === 0 ? -sp * 0.6 : sp * 0.6;
    const x = cx + ax * off + fx * back, z = cz + az * off + fz * back;
    pos.push([x, groundY(th, x, z) + 0.06, z]);
  }
  return { pos, ax, az, fx, fz, cx, cz };
}
function trayPlate(th, L, sp, n) {
  const b = F.M.builder();
  const rows = n > 10 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    const w = r === 0 ? 10 : Math.min(10, n - 10);
    for (let c = 0; c < w; c++) b.box(sp * 0.86, 0.05, sp * 0.86, r === 0 ? 'cream' : 'cream2', (c - 4.5) * sp, 0.02, (r === 0 ? -sp * 0.6 : sp * 0.6));
  }
  b.box(sp * 10.4, 0.04, sp * 0.06, 'gold', 0, 0.03, 0); // divider between the ten-row and the rest
  const g = b.group; g.position.set(L.cx, groundY(th, L.cx, L.cz) + 0.01, L.cz); g.rotation.y = F.R.cam.yaw || 0;
  scn(th).add(g);
  return g;
}
async function countItems(th, items, p) {
  const n = items.length, sp = p.sp || 0.52;
  const L = trayLayout(th, n, sp); const plate = trayPlate(th, L, sp, n);
  for (let i = 0; i < n; i++) {
    const it = items[i], [x, y, z] = L.pos[i], s = it.position.clone();
    const fast = n >= 10 && i < 10;
    F.T.tween(fast ? 300 : 420, k => it.position.set(s.x + (x - s.x) * k, s.y + (y - s.y) * k + Math.sin(k * Math.PI) * 0.7, s.z + (z - s.z) * k));
    snd('pling', Math.min(i, 14));
    if (fast) { await F.T.sleep(90); if (i === 9) await F.T.sleep(260); }
    else await F.T.sleep(330);
  }
  const lab = F.UI.label(V3(L.cx, groundY(th, L.cx, L.cz) + 0.9, L.cz), String(n), { kind: 'num', space: th.space || 'out' });
  F.FX.sparkle(V3(L.cx, groundY(th, L.cx, L.cz) + 0.6, L.cz));
  snd('tada');
  await F.T.sleep(p.show || 2600);
  lab.remove();
  items.forEach((it, i) => removeLater(it, i * 40, i % 3 === 0));
  await F.T.sleep(n * 40 + 350);
  if (plate.parent) plate.parent.remove(plate);
}
add('count', async (th, p) => {
  const n = U.clamp(p.n === 'teen' || !p.n ? 10 + Math.floor(R() * 11) : p.n, 1, 20);
  if (F.FX.tenTray && p.useCore) { // CORE renderer if present (skins)
    try {
      const tr = F.FX.tenTray(n, { model: model([].concat(p.model || [])), skin: p.skin || 'plain', pos: V3(th.x, th.obj.position.y, th.z + 1.5), parent: scn(th) });
      if (tr && tr.setCount) {
        for (let k = 1; k <= n; k++) { tr.setCount(k); snd('pling', Math.min(k, 14)); await F.T.sleep(k >= 10 || n < 10 ? 330 : 90); }   // silent count (natural 11.10.)
        await F.T.sleep(2000); if (tr.group && tr.group.parent) tr.group.parent.remove(tr.group); return;
      }
    } catch (e) { console.warn('tenTray failed, using fallback', e); }
  }
  const items = [];
  const start = topOf(th, 0.8);
  for (let i = 0; i < n; i++) { const it = spawnModel(th, p.model || 'o_eple', { size: p.size || 0.34, color: p.color, opts: p.opts }); it.position.copy(start); items.push(it); }
  await countItems(th, items, p);
});
// natural 11.10. (audit D4 #2/#16/#58): a narrator object line is RARE – F.UI.narrOK (ui.js, the limiter shared with the castle / park
// things): only after the first tap of that thing type today, ≥ 35 s after the last narrator object line, and never the same text twice
// in a session. Otherwise the squash + click (and the thing's own SFX / animation around it) play without words.
add('say', async (th, p) => {
  BEH.run(th, 'squash', { amt: 0.07, silent: true });
  snd('click');
  if (p.tpl && F.TPL.has(p.tpl)) {
    const ids = [].concat(p.tpl), id = U.pick(R, ids), voice = p.voice || '';
    if (p.queue) await F.SAY(id, p.slots, voice);
    else await F.SAYF(id, p.slots, voice);           // the F.SAYF wrapper (ui.js) applies the limiter to narrator object lines
  } else await F.T.sleep(300);
});

/* ================================================================== FX & MISC */
add('fx', async (th, p) => {
  const at = p.at === 'base' ? baseOf(th).add(V3(0, 0.2, 0)) : topOf(th, p.y != null ? p.y : 0.9);
  burst(at, p.kind || 'confetti', { n: p.n || 28, speed: p.speed || 2.4, up: p.up || 3, gravity: p.gravity, size: p.size });
  snd(p.sound || (p.kind === 'water' ? 'splash' : p.kind === 'snow' ? 'snow' : p.kind === 'leaf' || p.kind === 'hay' ? 'rustle' : 'sparkle'));
  await BEH.run(th, 'squash', { amt: 0.1, silent: true });
});
add('hearts', async (th, p) => { burst(topOf(th, 1), 'heart', { n: p.n || 14, speed: 1, up: 2.4, gravity: 0.8 }); snd('chime'); await BEH.run(th, 'bounce', { h: 0.15, sound: 'squeak' }); });
add('sound', async (th, p) => { snd(p.name || 'pop'); await BEH.run(th, 'squash', { amt: 0.1, silent: true }); });
add('wait', async (th, p) => { await F.T.sleep(p.ms || 400); });
// one coin from a lucky find (daily cap 20 shared with world finds; never negative)
function canFind() {
  const s = F.save.objFinds = F.save.objFinds || { day: F.save.day || 1, n: 0 };
  if (s.day !== (F.save.day || 1)) { s.day = F.save.day || 1; s.n = 0; }
  return s.n < 20;
}
add('coin', async (th, p) => {
  const it = spawnModel(th, 'o_mynt', { size: 0.3 });
  const from = topOf(th, 0.9); it.position.copy(from);
  snd('coin');
  await F.T.tween(700, k => { it.position.set(from.x, from.y + Math.sin(k * Math.PI) * 0.8 + k * 0.2, from.z + k * 0.4); it.rotation.y = k * Math.PI * 4; });
  F.FX.sparkle(it.position.clone(), COL('gold'));
  if (canFind()) {
    F.save.objFinds.n++;
    try { const v = it.position.clone().project(F.R.camera); const r = F.R.renderer.domElement.getBoundingClientRect(); F.UI.flyCoins(1, { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }); } catch (e) {}
    if (F.Eco && F.Eco.add) F.Eco.add(1, { from: th.type, reason: 'find' });
    F.SAYF('obj_coin');
  }
  await F.T.sleep(150); if (it.parent) it.parent.remove(it);
});

/* ------------------------------------------------------------------ fairy touch: every press shows her kind of magic
   krystall → glassy crystal cubes, blomst → petals, boble → floating bubbles, stjerne → golden star twinkles */
BEH.fairyTouch = true;
const TOUCH = { krystall: ['crystal', 'crystal'], blomst: ['petal', 'grow'], boble: ['bubble', 'pop'], stjerne: ['star', 'chime'] };
function fairyTouch(th) {
  const k = TOUCH[F.save.fairy] || TOUCH.krystall, at = topOf(th, 0.75);
  const float = F.save.fairy === 'boble';
  F.FX.burst(at, { n: 12, colors: FXK[k[0]].map(COL), speed: 1.1, up: float ? 1.2 : 2, gravity: float ? -0.8 : 2.5, life: float ? 1.6 : 0.9, size: float ? 0.1 : 0.07, spread: 0.8 });
  try { if (k[1] === 'crystal') S.tone(2093 + R() * 400, 0.35, 'sine', 0.035); else if (k[1] === 'pop') S.pop(); else if (k[1] === 'grow') S.tone(660, 0.25, 'triangle', 0.04, 0, 990); else S.tone(1568, 0.4, 'sine', 0.035); } catch (e) {}
}
BEH.touch = fairyTouch;

/* ------------------------------------------------------------------ surprise (1 in 10) */
function rainbow(th) {
  const g = new THREE.Group(); const cols = ['red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple'];
  const R0 = Math.max(1.4, heightOf(th) * 0.9 + 0.8);
  cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R0 - i * 0.13, 0.065, 6, 28, Math.PI), new THREE.MeshBasicMaterial({ color: COL(c), transparent: true, opacity: 0 })); g.add(m); });
  const at = baseOf(th); g.position.copy(at); g.rotation.y = F.R.cam.yaw || 0; g.scale.setScalar(0.01);
  scn(th).add(g);
  snd('chime'); snd('magic');
  return F.T.tween(3200, k => {
    const op = k < 0.15 ? k / 0.15 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    g.scale.setScalar(Math.max(0.01, ease.out(Math.min(1, k * 3))));
    g.children.forEach(m => { m.material.opacity = 0.85 * op; });
  }).then(() => { g.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); scn(th).remove(g); });
}
const SURPRISES = {
  rainbow: th => rainbow(th),
  confetti: th => { burst(topOf(th, 1), 'confetti', { n: 60, speed: 3, up: 4.5 }); snd('tada'); return F.T.sleep(500).then(() => burst(topOf(th, 1), 'confetti', { n: 40, speed: 2.5, up: 4 })); },
  bird: th => BEH.run(th, 'fly', { birds: 1, ms: 3000 }),
  giggle: th => { snd('giggle'); F.SAYF('obj_puff_giggle'); const a = F.Player.obj; F.FX.sparkle(a.position.clone().add(V3(0, 1.6, 0))); return anim(a.children[0] || a, 900, (k, b) => { const o = a.children[0] || a; o.rotation.z = b.r.z + Math.sin(k * Math.PI * 6) * 0.15 * (1 - k); }); },
  coin: th => BEH.run(th, 'coin', {}),
  flower: th => {
    const tw = toward(th, (th.radius || 0.6) + 0.7 + R() * 0.4); const it = spawnModel(th, ['o_blomst'], { size: 0.5, opts: { c: U.pick(R, ['pink', 'butter', 'lilac', 'coral', 'sky']) } });
    const y = groundY(th, tw.x, tw.z); it.position.set(tw.x + (R() - .5) * 0.5, y, tw.z); const s = it.scale.x; it.scale.setScalar(0.001);
    snd('grow'); F.SAYF('obj_flower');
    return F.T.tween(800, k => it.scale.set(s * ease.back(k), s * ease.back(k), s * ease.back(k))).then(() => { F.FX.sparkle(it.position.clone().add(V3(0, 0.4, 0)), COL('pink')); removeLater(it, 20000, true); });
  },
};
add('surprise', async (th, p) => {
  let kind = p.kind;
  if (!kind || !SURPRISES[kind]) { const ks = Object.keys(SURPRISES).filter(k => k !== 'coin' || canFind()); kind = U.pick(R, ks); }
  th.lastSurprise = kind;
  await SURPRISES[kind](th);
});
BEH.SURPRISES = SURPRISES;

/* ------------------------------------------------------------------ small shared models used by behaviours (o_ prefix) */
F.VOX.def('o_fugl', { size: [8, 7, 10], scale: 1 / 16,
  build(v, o) { const c = o.c || 'sky'; v.ellipsoid(3.5, 3, 5, 2.2, 2, 3, c); v.sphere(3.5, 4.5, 7.5, 1.7, c); v.set(3, 5, 9, 'black'); v.set(4, 5, 9, 'black');
    v.box(3, 4, 9, 4, 4, 9, 'orange'); v.set(3, 3.5, 9, 0); v.box(3, 3, 1, 4, 4, 2, c); v.set(3, 1, 5, 'orange'); v.set(4, 1, 5, 'orange'); v.box(2, 2, 4, 5, 2, 6, 'white'); },
  parts: { wingL: { pivot: [1, 4, 5], build(v, o) { v.box(0, 4, 3, 1, 4, 6, o.c2 || 'white'); } }, wingR: { pivot: [6, 4, 5], build(v, o) { v.box(6, 4, 3, 7, 4, 6, o.c2 || 'white'); } } },
  meta: { group: 'effekt' } });
F.VOX.def('o_mynt', { size: [10, 10, 2], scale: 1 / 16,
  build(v) { for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { const d = Math.hypot(x - 4.5, y - 4.5); if (d <= 4.8) { v.set(x, y, 0, d > 3.7 ? 'honey' : 'gold'); v.set(x, y, 1, d > 3.7 ? 'honey' : 'gold'); } }
    v.box(4, 2, 1, 5, 7, 1, 'butter'); },
  meta: { group: 'effekt' } });
F.VOX.def('o_blomst', { size: [9, 14, 9], scale: 1 / 16,
  build(v, o) { const c = o.c || 'pink'; v.box(4, 0, 4, 4, 8, 4, 'leaf'); v.box(5, 3, 4, 6, 3, 4, 'leaf2'); v.box(2, 5, 4, 3, 5, 4, 'leaf2');
    v.ellipsoid(4, 10, 4, 3.4, 1.6, 3.4, c); v.box(4, 10, 4, 4, 11, 4, 'butter'); v.box(3, 11, 3, 5, 11, 5, 'butter'); },
  meta: { group: 'effekt', variants: { c: ['pink', 'butter', 'lilac', 'coral', 'sky'] } } });
F.VOX.def('o_eple', { size: [6, 7, 6], scale: 1 / 16,
  build(v, o) { v.ellipsoid(2.5, 2.6, 2.5, 2.6, 2.4, 2.6, o.c || 'red'); v.box(2, 5, 2, 3, 5, 3, 'red'); v.set(2, 6, 2, 'woodDark'); v.set(3, 6, 3, 'leaf'); v.set(1, 3, 4, 'coral'); },
  meta: { group: 'effekt' } });

})();
