/* Feslottet – the four fairies: avatars (voxel model ch_fairy from js/models/m_people.js), looks/wear, power metadata, small power FX.
   F.Fairy = {
     kinds: ['krystall','blomst','boble','stjerne'],
     INFO[kind] -> { name:'Krystallfeen', color, colors[], style:'crystal'|'flower'|'bubble'|'star', skin (manipulative skin id = kind),
                     power:{ id, name, verb, makes, persists }, manip:{ ten, one }, sfx }
     name(kind) -> 'Krystallfeen'      style(kind) -> 'crystal' | 'flower' | 'bubble' | 'star'      cur() -> current kind (F.save.fairy)
     buildAvatar(kind, wearIds?) -> THREE.Group   (player.js calls this; uses F.save.wear when wearIds is omitted)
        .userData.animate(dt, t, moving)   wing flap, lean, sparkle trail in the fairy's colours (F.FX)
        .userData.play('twirl'|'cheer'|'cast'|'nod'|'eat'|'wave'|'bow'|'clap'|'laugh'|'think'|'point'|'yawn'|'surprised'|'hop', sec)   cast = wind-up, swing, flash + ring at the wand tip (≈42 % in)
        .userData.wandTip() -> Vector3 (world position of the wand's glowing tip; use it as the origin of spell effects)
        .userData.wandGlow (THREE.Sprite or null)      idle: wings ease between hover/fly, hair sways, she looks around, floats a little
        .userData.anchors {head, back, body, hand, feet}   (THREE.Object3D empties; extra worn models can be parented here)
        .userData.setLook(lookOpts)  rebuilds the voxel model in place (keeps anchors' children)
        .userData.kind, .userData.look
     look(kind, wearIds) -> ch_fairy options   (wear ids like 'ballkjole', 'w_gullvinger', 'tiara', 'glittersko', 'hjertestav')
     WEAR {itemId: {slot, opt}}  – which catalogue items the built-in model knows (dresses, wings, headwear, shoes, wands)
     applyWear(wearIds, avatar=F.Player.avatar) -> look   (rebuilds the avatar; unknown items with a VOX model are attached at the slot anchor)
     wear(itemId) – put on one owned item (persists F.save.wear[slot]); unwear(slot)
     tempWear(ids) / clearTemp() / hasTemp(id?) – v3: temporary look items (throne crown), never saved; avatar.userData.setPose('sit'|null)
     set(kind) – switch fairy (F.save.fairy, rebuild avatar, emits 'fairyChanged')
     powerFX(kind, pos, {n, big}) – burst of the fairy's particles + sound (use at power spots, casts, celebrations)
     sayIntro(kind) -> Promise  (template fairy_intro_<kind>, see js/speech/lines_fairy.js)
     grow(kind, {from:{x,z}, to:{x,z}, y, space, instant}) -> Promise<{group, walkable, remove()}>  walkable crossing (bridge / lily pads / bubbles)
   } */
(function () {
'use strict';
const F = window.F;
const P = n => F.PAL[n];
const INFO = {
  krystall: { name: 'Krystallfeen', style: 'crystal', colorName: 'crystal', colorsN: ['crystal', 'lavender', 'white', 'ice'], sfx: 'crystal',
    power: { id: 'krystall', name: 'krystallbro', verb: 'lager krystaller', makes: ['bro', 'trapp'], persists: true },
    manip: { ten: 'krystallstav', one: 'krystall' } },
  blomst: { name: 'Blomsterfeen', style: 'flower', colorName: 'pink', colorsN: ['pink', 'blossom', 'mint', 'butter'], sfx: 'grow',
    power: { id: 'blomst', name: 'blomsterstige', verb: 'får blomster til å gro', makes: ['stige', 'liljesti'], persists: true },
    manip: { ten: 'blomsterbed', one: 'potte' } },
  boble: { name: 'Boblefeen', style: 'bubble', colorName: 'sky', colorsN: ['sky', 'white', 'teal', 'lilac'], sfx: 'pop',
    power: { id: 'boble', name: 'boblesti', verb: 'lager bobler', makes: ['boble'], persists: false },
    manip: { ten: 'boblering', one: 'boble' } },
  stjerne: { name: 'Stjernefeen', style: 'star', colorName: 'gold', colorsN: ['gold', 'butter', 'white', 'peach'], sfx: 'chime',
    power: { id: 'stjerne', name: 'stjernebro', verb: 'tenner stjerner', makes: ['bro', 'lys'], persists: true },
    manip: { ten: 'stjerneramme', one: 'stjerne' } },
};
for (const k in INFO) { Object.defineProperty(INFO[k], 'color', { get() { return P(this.colorName); } }); Object.defineProperty(INFO[k], 'colors', { get() { return this.colorsN.map(P); } }); }

// catalogue wear items the fairy model renders natively (ids normalised: lowercase, no prefix, æøå -> ae/o/a, no spaces)
const WEAR = {
  sommerkjole: { slot: 'dress', opt: 'sommer' }, ballkjole: { slot: 'dress', opt: 'ball' }, stjernekjole: { slot: 'dress', opt: 'stjerne' },
  regnbuekjole: { slot: 'dress', opt: 'regnbue' }, blomsterkjole: { slot: 'dress', opt: 'blomst' }, boblekjole: { slot: 'dress', opt: 'boble' },
  krystallkjole: { slot: 'dress', opt: 'krystall' },
  sommerfuglvinger: { slot: 'wings', opt: 'sommerfugl' }, glittervinger: { slot: 'wings', opt: 'glitter' }, regnbuevinger: { slot: 'wings', opt: 'regnbue' },
  krystallvinger: { slot: 'wings', opt: 'krystall' }, gullvinger: { slot: 'wings', opt: 'gull' }, blomstervinger: { slot: 'wings', opt: 'blomst' },
  boblevinger: { slot: 'wings', opt: 'boble' }, stjernevinger: { slot: 'wings', opt: 'stjerne' },
  blomsterkrans: { slot: 'head', opt: 'blomst' }, tiara: { slot: 'head', opt: 'tiara' }, litenkrone: { slot: 'head', opt: 'krone' }, krone: { slot: 'head', opt: 'krone' },
  solhatt: { slot: 'head', opt: 'solhatt' },
  glittersko: { slot: 'shoes', opt: 'glitter' }, rosasko: { slot: 'shoes', opt: 'rosa' },
  stjernestav: { slot: 'wand', opt: 'stjerne' }, hjertestav: { slot: 'wand', opt: 'hjerte' }, manestav: { slot: 'wand', opt: 'maane' }, maanestav: { slot: 'wand', opt: 'maane' },
  /* WP9 themed-shop wear (DESIGN2 §6.2). opt = native ch_fairy option; x:true = also attach the item's own model (m_shop2.js) at anchor `at`
     (default by slot) with offsets dy/dz (m) and scale s. Head pieces set opt 'ingen' so the fairy's own tiara does not poke through. */
  rosekjole: { slot: 'dress', opt: 'ball', want: 'rose' }, kakekjole: { slot: 'dress', opt: 'stjerne', want: 'kake' }, notekjole: { slot: 'dress', opt: 'boble', want: 'note' },
  rosevinger: { slot: 'wings', opt: 'blomst', want: 'rose' }, sjostjernevinger: { slot: 'wings', opt: 'sommerfugl', want: 'sjostjerne' },
  blomsterkrone: { slot: 'head', opt: 'blomst' }, boblekrone: { slot: 'head', opt: 'boble' },
  tulipanhatt: { slot: 'head', opt: 'ingen', x: true, dy: -0.2, dz: -0.06 }, ridehjelm: { slot: 'head', opt: 'ingen', x: true, dy: -0.22, dz: -0.06 },
  ponniflette: { slot: 'head', opt: 'ingen', x: true, dy: -0.02, dz: -0.06 }, perlekrone: { slot: 'head', opt: 'ingen', x: true, dy: -0.06, dz: -0.06 },
  kakehatt: { slot: 'head', opt: 'ingen', x: true, dy: -0.22, dz: -0.06 }, stjernehatt: { slot: 'head', opt: 'ingen', x: true, dy: -0.2, dz: -0.06 },
  vinterlue: { slot: 'head', opt: 'ingen', x: true, dy: -0.24, dz: -0.06 }, krystallhatt: { slot: 'head', opt: 'ingen', x: true, dy: -0.22, dz: -0.06 },
  regnstovler: { slot: 'shoes', opt: 'glitter', want: 'regn' }, manesko: { slot: 'shoes', opt: 'glitter', want: 'mane' }, krystallsko: { slot: 'shoes', opt: 'glitter', want: 'krystall' },
  skjellkjede: { slot: 'neck', x: true, at: 'body', dy: -0.2, dz: 0.06, s: 0.55 }, krystallkjede: { slot: 'neck', x: true, at: 'body', dy: -0.2, dz: 0.06, s: 0.55 },
  skjerf: { slot: 'neck', x: true, at: 'body', dy: -0.29, dz: -0.125, s: 0.8 },
  stjernekappe: { slot: 'cape', x: true, at: 'back', dy: -0.4375, dz: -0.145, s: 0.62 },
  kikkert: { slot: 'gear', x: true, at: 'body', dy: -0.13, dz: 0.09, s: 0.42 },   // the Kikkert (gear) hangs on her chest once bought (economy.js puts it on)
  votter: { slot: 'hands', x: true, model: 'w_vott1', parts: [['armL', 0.0625, -0.25, 0], ['armR', -0.0625, -0.25, 0]] },   // one mitten on each moving arm
};
// does the ch_fairy model (m_people.js, WP7) offer this native option? (optional meta.opts = {dress:[…], wings:[…], shoes:[…], head:[…]})
const fairyHas = (slot, opt) => { try { const m = F.VOX.defs.ch_fairy && F.VOX.defs.ch_fairy.meta; return !!(m && m.opts && m.opts[slot] && m.opts[slot].includes(opt)); } catch (e) { return false; } };
// a WEAR entry that (also) shows the catalogue item's own model
const wearX = id => { const w = WEAR[norm(id)]; return w && w.x ? w : null; };
const SLOT_ANCHOR = { dress: 'body', body: 'body', kjole: 'body', wings: 'back', back: 'back', vinger: 'back', head: 'head', hode: 'head', shoes: 'feet', feet: 'feet', sko: 'feet', wand: 'hand', hand: 'hand', stav: 'hand' };
const norm = id => String(id || '').toLowerCase().replace(/^(w_|wear_|f_)/, '').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z]/g, '');
function catItem(id) { return (F.CAT && F.CAT.find) ? F.CAT.find(c => c.id === id || c.model === id || c.word === id) : null; }

function look(kind, wearIds) {
  const o = { kind: INFO[kind] ? kind : 'krystall' };
  for (const id of wearIds || []) {
    const w = WEAR[norm(id)] || (catItem(id) && WEAR[norm(catItem(id).word || catItem(id).name)]);
    if (w && w.want && fairyHas(w.slot, w.want)) o[w.slot] = w.want;
    else if (w && w.opt != null) o[w.slot] = w.opt;
  }
  // buns poke through hats
  if (o.head === 'solhatt' || o.head === 'krone') o.hair = o.kind === 'boble' ? 'kort' : undefined;
  if (o.head === 'ingen' && o.kind === 'boble' && (wearIds || []).some(id => { const w = wearX(id); return w && w.slot === 'head'; })) o.hair = 'kort';   // WP9 hats
  if (o.hair === undefined) delete o.hair;
  return o;
}
function savedWear() {
  const w = F.save && F.save.wear;
  if (!w) return [];
  return Array.isArray(w) ? w : Object.values(w).filter(Boolean);
}

const S16 = 1 / 16;
// soft additive glow sprite (procedural canvas texture, shared)
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(30, 4, 4, 56); x.fillRect(4, 30, 56, 4); // little star cross
  GLOW_TEX = new THREE.CanvasTexture(c); return GLOW_TEX;
}
const WAND_GLOW = { krystall: 'crystal', blomst: 'rose', boble: 'sky', stjerne: 'glowYellow', hjerte: 'pink', maane: 'glowYellow' };
const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
function buildAvatar(kind, wearIds) {
  kind = INFO[kind] ? kind : 'krystall';
  const root = new THREE.Group(); root.name = 'fairy_' + kind;
  const ud = root.userData;
  ud.kind = kind;
  // anchors live on the root (stable across rebuilds); the head anchor follows the head part each frame
  const anchors = ud.anchors = {};
  for (const [n, x, y, z] of [['head', 0, 20.5 * S16, 0], ['back', 0, 9 * S16, -3 * S16], ['body', 0, 7 * S16, 2 * S16], ['hand', -3.5 * S16, 7 * S16, 4 * S16], ['feet', 0, 0, 0]]) {
    const e = new THREE.Object3D(); e.name = 'anchor_' + n; e.position.set(x, y, z); root.add(e); anchors[n] = e;
  }
  let inner = null, parts = {}, extras = [], glow = null, glowCol = null, faces = {}, curFace = 'normal', blinkT = 2.5, blinkOn = 0;
  const showFace = (f) => {
    if (!parts.head || f === curFace) return;
    if (!faces[f]) { try { const lk2 = Object.assign({}, ud.look, { face: f }); delete lk2._extra; faces[f] = F.VOX.make('ch_fairy', lk2).userData.parts.head.children.filter(c => c.isMesh); } catch (e) { faces[f] = faces.normal; } }
    for (const c of faces[curFace]) parts.head.remove(c);
    for (const c of faces[f]) { parts.head.add(c); silCopy(c); }
    curFace = f;
  };
  // CORE's see-through silhouette (F.FX.silhouette) hangs a mask + lilac mesh under every avatar mesh; swapped-in face meshes need the
  // same pair, or the body behind the head would show through as a lilac ghost.
  let silMask = null, silMat = null;
  const silCopy = (m) => {
    if (m.userData.silDone) return;
    if (!silMask) root.traverse(c => { if (c.userData && c.userData.isSil) { if (c.renderOrder === 49) silMask = c.material; else if (c.renderOrder === 50) silMat = c.material; } });
    if (!silMask || !silMat) return;
    if (m.children.some(c => c.userData.isSil)) { m.userData.silDone = true; return; }
    for (const [mat, ro] of [[silMask, 49], [silMat, 50]]) { const k = new THREE.Mesh(m.geometry, mat); k.userData.isSil = true; k.renderOrder = ro; k.castShadow = false; k.receiveShadow = false; k.raycast = () => {}; m.add(k); }
    m.userData.silDone = true;
  };
  const resil = () => { // after a look rebuild (wear): give the new meshes the silhouette again
    if (!(F.Player && F.Player.avatar === root && F.FX && F.FX.silhouette)) return;
    try { if (F.Player.sil && F.Player.sil.remove) F.Player.sil.remove(); F.Player.sil = F.FX.silhouette(root); } catch (e) { /* optional */ }
    silMask = silMat = null;
  };
  ud.face = showFace;
  ud.setLook = (lk) => {
    if (inner) root.remove(inner);
    ud.look = lk;
    inner = F.VOX.make('ch_fairy', lk);
    parts = inner.userData.parts || {};
    // the swaying hair rides on the head (so nods / looking around carry it)
    if (parts.hair && parts.head) { parts.hair.position.sub(parts.head.position); parts.head.add(parts.hair); }
    root.add(inner);
    ud.inner = inner; ud.parts = parts;
    // facial expressions: swap the head's meshes (hair / anchors stay); built lazily, cached by VOX
    faces = { normal: parts.head ? parts.head.children.filter(c => c.isMesh) : [] }; curFace = 'normal';
    // wand tip glow (child of the wand arm)
    const wk = lk.wand || lk.kind;
    glow = null;
    if (wk !== 'ingen' && parts.armR && typeof document !== 'undefined') {
      glowCol = new THREE.Color(F.PAL[WAND_GLOW[wk] || 'glowYellow']).lerp(new THREE.Color(0xffffff), 0.35);
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: glowCol, transparent: true, depthWrite: false, opacity: 0.6 }));
      glow.position.set(-1.5 * S16, 1.5 * S16, 5.6 * S16); glow.scale.setScalar(0.16); glow.renderOrder = 3; glow.name = 'wandGlow';
      parts.armR.add(glow);
    }
    ud.wandGlow = glow;
    // extra worn models (items the voxel fairy does not render natively)
    extras.forEach(e => e.parent && e.parent.remove(e)); extras = [];
    for (const id of (lk._extra || [])) {
      const it = catItem(id), model = (it && it.model) || id;
      if (!F.VOX.has(model)) continue;
      const wx = wearX(id);
      if (wx && wx.parts) {   // WP9: small models riding on animated parts (mittens on the arms)
        for (const [pn, px, py, pz] of wx.parts) { const pt = parts[pn]; if (!pt || !F.VOX.has(wx.model || model)) continue; const m = F.VOX.make(wx.model || model, {}); m.position.set(px, py, pz); pt.add(m); extras.push(m); }
        continue;
      }
      if (wx) {   // WP9 wear table entry: exact anchor / offsets / scale
        const m = F.VOX.make(model, {}); m.scale.setScalar(wx.s || 1); m.position.set(0, wx.dy || 0, wx.dz || 0);
        (anchors[wx.at || SLOT_ANCHOR[wx.slot] || 'head']).add(m); extras.push(m); continue;
      }
      const slot = (it && (it.slot || it.anchor)) || (F.VOX.defs[model].meta && F.VOX.defs[model].meta.anchor) || 'head';
      const m = F.VOX.make(model, {}); m.scale.setScalar(0.8);
      (anchors[SLOT_ANCHOR[slot] || 'head']).add(m); extras.push(m);
    }
    if (typeof resil === 'function') resil();
  };
  const lk = look(kind, wearIds || savedWear());
  lk._extra = (wearIds || savedWear()).filter(id => wearX(id) || (!WEAR[norm(id)] && !(catItem(id) && WEAR[norm(catItem(id).word || catItem(id).name)])));
  if (!lk._extra.length) delete lk._extra;
  ud.setLook(lk);

  let gest = null, gT = 0, gDur = 0, lean = 0, trailAcc = 0, flapP = 0, flapV = 6.5, flapA = 0.2, open = 0.28, yaw = 0, yawT = 0, yawGoal = 0, hairBack = 0, cast = false, castFx = false;
  const wpos = new THREE.Vector3();
  ud.play = (name, sec) => { gest = name === 'stop' ? null : name; gT = 0; gDur = sec || (name === 'twirl' ? 0.9 : name === 'yawn' ? 2 : 1.2); castFx = false; };
  // v3 WP3: a held pose (not a one-off gesture). 'sit' = on a seat (throne): wings folded, hands on the lap, no float/bob, no looking around
  ud.pose = null;
  ud.setPose = (name) => { ud.pose = name || null; };
  ud.gesture = () => gest;
  const tipWorld = () => { if (glow) { glow.getWorldPosition(wpos); return wpos; } root.updateMatrixWorld(true); anchors.hand.getWorldPosition(wpos); return wpos; };
  ud.wandTip = () => tipWorld().clone();
  ud.animate = (dt, t, moving) => {
    const info = INFO[ud.kind];
    dt = Math.min(dt, 0.1);
    // wings: speed / amplitude / spread ease between idle and flying (no pops), asymmetric stroke (quick down, slow up)
    const kE = Math.min(1, dt * 4), sitP = ud.pose === 'sit';
    flapV += ((moving ? 16 : sitP ? 2.2 : 6) - flapV) * kE; flapA += ((moving ? 0.4 : sitP ? 0.03 : 0.2) - flapA) * kE; open += ((moving ? 0.42 : sitP ? 0.04 : 0.28) - open) * kE;
    flapP += dt * flapV;
    const f = (Math.sin(flapP) + 0.28 * Math.sin(2 * flapP - 0.7)) * flapA;
    if (parts.wingL) { parts.wingL.rotation.y = open + f; parts.wingL.rotation.x = Math.sin(flapP) * 0.04; }
    if (parts.wingR) { parts.wingR.rotation.y = -open - f; parts.wingR.rotation.x = Math.sin(flapP) * 0.04; }
    lean += ((moving ? 0.16 : 0) - lean) * Math.min(1, dt * 6);
    // looking around while standing
    yawT -= dt;
    if (moving || gest || sitP) yawGoal = 0;
    else if (yawT <= 0) { yawT = 2.2 + Math.random() * 3.2; const r = Math.random(); yawGoal = r < 0.4 ? 0 : r < 0.7 ? 0.42 : -0.42; }
    yaw += (yawGoal - yaw) * Math.min(1, dt * 3);
    let spin = 0, aL = moving ? 0.35 : Math.sin(t * 1.4) * 0.08, aR = moving ? 0.35 : -Math.sin(t * 1.4) * 0.08, zL = 0.12, zR = -0.12, hx = Math.sin(t * 1.1) * 0.04, hz = Math.sin(t * 0.8) * 0.06 + yaw * 0.12, by = moving ? 0 : Math.sin(t * 2.1) * 0.025 + 0.025;
    let glowS = 0.2 + Math.sin(t * 3) * 0.025, glowO = 0.55 + Math.sin(t * 2.3) * 0.12;
    if (sitP) { by = 0; aL = -0.85; aR = -0.85; zL = 0.32; zR = -0.32; hx = 0.06 + Math.sin(t * 1.1) * 0.02; }   // hands on the lap, still
    if (gest) {
      gT += dt; const k = Math.min(1, gT / gDur);
      if (gest === 'twirl') { spin = (1 - Math.pow(1 - k, 2)) * Math.PI * 2; zL = 1.2; zR = -1.2; by = Math.sin(k * Math.PI) * 0.15; glowS = 0.25; glowO = 0.8; }
      else if (gest === 'cheer') { zL = 2.6; zR = -2.6; by = Math.abs(Math.sin(gT * 9)) * 0.12; glowS = 0.24; glowO = 0.8; }
      else if (gest === 'cast') {
        // wind up (arm high), swing the wand forward with a flash at the tip, hold, settle
        if (k < 0.35) { const q = sm(k / 0.35); aR = -2.7 * q; zR = -0.1 - 0.25 * q; hx = -0.12 * q; glowS = 0.16 + 0.22 * q; glowO = 0.5 + 0.5 * q; by = 0.04 * q; }
        else if (k < 0.5) { const q = sm((k - 0.35) / 0.15); aR = -2.7 + 1.35 * q; zR = -0.35 + 0.25 * q; hx = -0.12 + 0.2 * q; glowS = 0.38 + 0.25 * q; glowO = 1; lean = 0.12 * q; by = 0.04; }
        else { const q = sm((k - 0.5) / 0.5); aR = -1.35 + 1.35 * q; zR = -0.1 - 0.02 * q; hx = 0.08 * (1 - q); glowS = 0.63 - 0.47 * q; glowO = 1 - 0.5 * q; lean = 0.12 * (1 - q); by = 0.04 * (1 - q); }
        if (!castFx && k >= 0.42) {
          castFx = true;
          if (F.FX && F.FX.burst && root.parent && !F.flags.collect) { inner.updateMatrixWorld(true); const p = tipWorld();
            F.FX.burst(p, { n: 22, colors: info.colors, speed: 1.8, up: 1.2, life: 0.9, size: 0.065, gravity: 0.6, spread: 0.4 });
          }
        }
        // sparkles stream from the wand while it moves
        if (k < 0.55 && F.FX && F.FX.burst && root.parent && !F.flags.collect && Math.random() < dt * 30) F.FX.burst(tipWorld(), { n: 1, colors: info.colors, speed: 0.2, up: 0.1, life: 0.5, size: 0.05, gravity: -0.1, spread: 0.1 });
      }
      else if (gest === 'wave') { zR = -2.5 - Math.sin(gT * 14) * 0.35; aR = 0; }
      else if (gest === 'nod') { hx = Math.sin(gT * 10) * 0.2; }
      else if (gest === 'bow') { lean = Math.sin(k * Math.PI) * 0.5; }
      else if (gest === 'eat') { aR = -1.8 + Math.sin(gT * 12) * 0.2; hx = 0.1; }
      else if (gest === 'clap') { const c = Math.max(0, Math.sin(gT * 16)); aL = -1.3; aR = -1.3; zL = -0.55 + 0.3 * (1 - c); zR = 0.55 - 0.3 * (1 - c); by += Math.abs(Math.sin(gT * 8)) * 0.03; }
      else if (gest === 'laugh') { by += Math.abs(Math.sin(gT * 15)) * 0.04; hx = -0.2 + Math.sin(gT * 15) * 0.05; aL = -0.7; aR = -0.7; zL = -0.45; zR = 0.45; }
      else if (gest === 'think') { aR = -1.6; zR = 0.5; hz = 0.2; hx = -0.06; }
      else if (gest === 'point') { aR = -1.55; zR = 0.08; }
      else if (gest === 'yawn') { const up = sm(Math.min(1, k * 2.2)) * sm(Math.min(1, (1 - k) * 3)); zL = 2.5 * up; zR = -2.5 * up; hx = -0.3 * up; }
      else if (gest === 'surprised') { zL = 0.9; zR = -0.9; aL = -0.4; aR = -0.4; by += Math.sin(Math.min(1, k * 3) * Math.PI) * 0.08; }
      else if (gest === 'hop') { by += Math.abs(Math.sin(k * Math.PI * 3)) * 0.25; }
      if (k >= 1) gest = null;
    }
    // face: joy while twirling / cheering / casting, otherwise blink every few seconds
    const joy = gest === 'twirl' || gest === 'cheer' || gest === 'clap' || gest === 'laugh' || gest === 'hop' || (gest === 'cast' && gT / gDur > 0.4);
    if (joy) { showFace('happy'); blinkOn = 0; }
    else if (gest === 'yawn') { showFace('blink'); blinkOn = 0; }
    else if (blinkOn > 0) { blinkOn -= dt; if (blinkOn <= 0) showFace('normal'); }
    else { if (curFace !== 'normal') showFace('normal'); blinkT -= dt; if (blinkT <= 0) { showFace('blink'); blinkOn = 0.12; blinkT = 2.2 + Math.random() * 3.5; } }
    if (parts.armL) { parts.armL.rotation.x = aL; parts.armL.rotation.z = zL; }
    if (parts.armR) { parts.armR.rotation.x = aR; parts.armR.rotation.z = zR; }
    if (parts.head) { parts.head.rotation.x = hx; parts.head.rotation.z = hz; parts.head.rotation.y = yaw; }
    // hair sways and flows back when flying
    hairBack += ((moving ? 0.32 : 0) + (spin ? 0.25 : 0) - hairBack) * Math.min(1, dt * 5);
    if (parts.hair) { parts.hair.rotation.x = hairBack + Math.sin(t * 1.9) * 0.05 + (moving ? Math.sin(t * 9) * 0.04 : 0) - hx * 0.6; parts.hair.rotation.z = Math.sin(t * 1.3 + 1) * 0.05 - yaw * 0.15; }
    if (glow) { glow.scale.setScalar(glowS); glow.material.opacity = Math.max(0, Math.min(1, glowO)); }
    if (inner) { inner.rotation.x = lean; inner.rotation.y = spin; inner.position.y = by; }
    // sparkle trail
    if (moving && F.FX && F.FX.burst && root.parent && !F.flags.collect) {
      trailAcc += dt;
      if (trailAcc > 0.07) {
        trailAcc = 0;
        root.updateMatrixWorld(true); anchors.back.getWorldPosition(wpos);
        F.FX.burst(wpos, { n: 2, colors: info.colors, speed: 0.35, up: 0.25, life: 0.75, size: 0.05, gravity: -0.15, spread: 0.6 });
      }
    } else if (!moving && F.FX && F.FX.burst && root.parent && Math.random() < dt * 0.6 && !F.flags.collect) {
      root.updateMatrixWorld(true); anchors.head.getWorldPosition(wpos); wpos.y += 0.1;
      F.FX.burst(wpos, { n: 1, colors: info.colors, speed: 0.2, up: 0.4, life: 0.9, size: 0.045, gravity: 0, spread: 0.5 });
    }
  };
  return root;
}

function applyWear(wearIds, avatar) {
  avatar = avatar || (F.Player && F.Player.avatar);
  const kind = (avatar && avatar.userData.kind) || cur();
  const lk = look(kind, wearIds);
  const extra = (wearIds || []).filter(id => wearX(id) || (!WEAR[norm(id)] && !(catItem(id) && WEAR[norm(catItem(id).word || catItem(id).name)])));
  if (extra.length) lk._extra = extra;
  if (avatar && avatar.userData.setLook) avatar.userData.setLook(lk);
  return lk;
}
// v3 WP3: temporary look items (the throne crown, a hat from the hat shelf): shown on the avatar, NEVER written to F.save.wear.
// tempWear(['krone']) puts them over her saved wear; clearTemp() restores the saved look. A fairy switch / wear() drops them.
let tempIds = null;
function tempWear(ids) { tempIds = [].concat(ids || []).filter(Boolean); return applyWear(savedWear().concat(tempIds)); }
function clearTemp() { if (!tempIds) return null; tempIds = null; return applyWear(savedWear()); }
const hasTemp = id => !!(tempIds && (id == null ? tempIds.length : tempIds.includes(id)));
if (F.on) F.on('fairyChanged', () => { tempIds = null; });
function slotOf(id) { const w = WEAR[norm(id)]; if (w) return w.slot; const it = catItem(id); return (it && it.slot) || 'head'; }
function wear(id) {
  F.save.wear = (F.save.wear && !Array.isArray(F.save.wear)) ? F.save.wear : {};
  F.save.wear[slotOf(id)] = id;
  tempIds = null;
  F.store && F.store();
  const lk = applyWear(savedWear());
  F.emit && F.emit('fairyWear', id);
  return lk;
}
function unwear(slot) {
  if (F.save.wear && !Array.isArray(F.save.wear)) { delete F.save.wear[slot]; F.store && F.store(); }
  return applyWear(savedWear());
}
function cur() { return (F.save && F.save.fairy && INFO[F.save.fairy]) ? F.save.fairy : 'krystall'; }
function set(kind) {
  if (!INFO[kind]) return;
  F.save.fairy = kind; F.store && F.store();
  if (F.Player && F.Player.setAvatar) F.Player.setAvatar(kind);
  F.emit && F.emit('fairyChanged', kind);
}
function powerFX(kind, pos, o) {
  o = o || {};
  const info = INFO[kind] || INFO[cur()];
  if (F.FX && F.FX.burst && pos) F.FX.burst(pos, { n: o.n || (o.big ? 40 : 18), colors: info.colors, speed: o.big ? 3 : 1.8, up: o.big ? 3.5 : 2, life: 1, size: o.big ? 0.09 : 0.07, gravity: kind === 'boble' ? -0.5 : 2 });
  const s = F.sfx && (F.sfx[info.sfx] || F.sfx.magic); if (s) try { s(); } catch (e) {}
}
/* Power crossings (DESIGN §5): a real, walkable path from `from` to `to` built from the fairy's pieces.
   grow(kind, {from:{x,z}, to:{x,z}, y, space:'out', instant:false, ms:380}) -> Promise<{group, walkable, segments, remove()}>
     krystall: crystal bridge (n_krystallbro, 2 m wide)  stjerne: star-rainbow bridge (n_stjernebro)
     blomst: lily-pad stepping path (n_liljeblad)        boble: bouncy bubble cushions (n_boblepute); n_storboble = ride bubble model
   Segments assemble cube by cube one after another (F.FX.assemble), then a walkable strip is registered in F.W (outdoors).
   Persist by calling grow(..., {instant:true}) again when the place loads. */
const GROW = { krystall: { model: 'n_krystallbro', step: 1.0, deck: 0.3, w: 1.8 }, stjerne: { model: 'n_stjernebro', step: 1.0, deck: 0.3, w: 1.8 },
  blomst: { model: 'n_liljeblad', step: 1.15, deck: 0.2, w: 1.4, jitter: 0.25 }, boble: { model: 'n_boblepute', step: 1.15, deck: 0.45, w: 1.4, jitter: 0.2 } };
async function grow(kind, o) {
  o = o || {};
  const G = GROW[kind] || GROW.krystall, space = o.space || 'out';
  const fx = o.from.x, fz = o.from.z, tx = o.to.x, tz = o.to.z, L = Math.hypot(tx - fx, tz - fz);
  const ry = Math.atan2(tx - fx, tz - fz), n = Math.max(1, Math.ceil(L / G.step));
  const W = F.W || {}, water = W.WATER != null ? W.WATER : -0.25;
  const hAt = (F.Space.impl && F.Space.impl[space] && F.Space.impl[space].heightAt) ? F.Space.impl[space].heightAt : F.Space.heightAt;
  const y = o.y != null ? o.y : (space === 'out' ? Math.max(water - 0.05, Math.min(hAt(fx, fz), hAt(tx, tz)) - G.deck + 0.05) : 0);
  const group = new THREE.Group(); group.name = 'power_' + kind; group.position.set(fx, y, fz); group.rotation.y = ry;
  (F.Space.scene ? F.Space.scene(space) : F.R.scene).add(group);
  const segs = [];
  for (let i = 0; i < n; i++) {
    if (!F.VOX.has(G.model)) break;
    const m = F.VOX.make(G.model, {});
    const j = G.jitter ? (F.U.hash2(i, n, 5) - 0.5) * 2 * G.jitter : 0;
    m.position.set(j, 0, (i + 0.5) * (L / n)); if (G.scale) m.scale.setScalar(G.scale);
    group.add(m); segs.push(m);
  }
  group.updateMatrixWorld(true);
  if (!o.instant) {
    const info = INFO[kind] || INFO.krystall;
    for (let i = 0; i < segs.length; i++) {
      const wp = segs[i].getWorldPosition(new THREE.Vector3());
      const p = F.FX && F.FX.assemble ? F.FX.assemble(G.model, {}, segs[i], wp, { ms: o.ms || 380, max: 160 }) : Promise.resolve();
      if (i === segs.length - 1) await p; else await F.T.sleep((o.ms || 380) * 0.55);
      if (F.FX && F.FX.burst && i % 2 === 0) F.FX.burst(wp.clone().setY(wp.y + 0.4), { n: 6, colors: info.colors, speed: 0.8, up: 1.2, life: 0.6, size: 0.05 });
    }
  }
  let walk = null;
  if (space === 'out' && W.addWalkable) walk = W.addWalkable({ ax: fx, az: fz, bx: tx, bz: tz, w: G.w, y: y + G.deck, power: kind });
  return { group, walkable: walk, segments: segs, remove() { if (group.parent) group.parent.remove(group); if (walk && W.removeWalkable) W.removeWalkable(walk); } };
}
function sayIntro(kind) { return F.SAY ? F.SAY('fairy_intro_' + (INFO[kind] ? kind : 'krystall'), {}, '') : Promise.resolve(); }

F.Fairy = {
  kinds: ['krystall', 'blomst', 'boble', 'stjerne'],
  INFO, WEAR,
  name: k => (INFO[k] || INFO.krystall).name,
  style: k => (INFO[k] ? INFO[k].style : null),
  color: k => (INFO[k] || INFO.krystall).color,
  cur, set, look, buildAvatar, applyWear, wear, unwear, slotOf, powerFX, sayIntro, grow, GROW,
  tempWear, clearTemp, hasTemp, savedWear,
};
})();
