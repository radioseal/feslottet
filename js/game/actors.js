/* Feslottet – LIFE: characters (royals, staff, animals, villagers, customers). Owner: LIFE.
   F.Act.spawn(id, {name, role, voice, look, home:{space, room?, x, z}, posts, repertoire, kind:'person'|'animal', scale}) -> actor
   actor:
     .id .name .role .voice .cvoice (counting voice) .space .x .z .th (the pressable Thing 'life_actor') .model (People group)
     .walkTo(x, z) -> Promise<bool>      (A* outdoors via F.Space.impl, straight line indoors; off-screen = teleport)
     .place(space, x, z)                 instant move (also between castle and outdoors)
     .say(tplId, slots) -> Promise       F.SAY in the actor's voice + speech bubble above the head
     .count(n) -> Promise                says a number in the actor's own counting voice
     .react(tag, itemId) -> Promise      tag: eat|wear|play|pet|sit|smell|warm|light|music|place|ride|cheer
     .wear(itemOrModelId, n=1)           head items stack (14 hats = wobbly tower); dresses recolour the outfit; wings on the back …
     .setWish({kind:'quest'|'task'|'need'|'item'|'gift'|'stall', model, itemId, price, gold, onPress}) / .clearWish() / .wish
     .gesture(name, sec)                 People gestures: wave cheer dance nod shiver yawn hop eat
     .face(x, z)
   F.Act.byId(id)  F.Act.near(x, z, r, space)  F.Act.list  F.Act.press(actor)  F.Act.roomPos(numOrName, planId='slott')  F.Act.parkPos(name)
   Buildings (DESIGN2 §2.2, WP7): indoor actors carry .bld (plan id: 'slott' | 'tarn' | 'rk_<realm>') and .f (floor). They are shown only
     while F.Bld.cur === a.bld and their floor is the visible floor (F.Bld.visF). Positions come from F.Bld.room/toWorld/spot when the
     real F.Bld is loaded, else from the legacy F.Castle rooms. place(space, x, z, room, {bld, f}) / F.Act.placeAt(a, pos).
   Royals of the kingdoms (WP7 royals.js): spawn option royal:<realmId>; press, reactions and their speech go through F.Royals
     (they never use the life_* repertoire and never count: cvoice null).
   Wish bubbles: at most 3 visible within 40 m (gold first), real 3D thumbnails + price chips; tapping a bubble = tapping the actor.
     Clarity §3.2 (one signal, one meaning): GOLD only when w.gold (a goal she took on: an opened letter, an accepted offer, the
     bedtime story); every offer is WHITE until she takes it (kind 'quest' no longer implies gold). w.done → a green ✓ chip (.lw-done).
     A person with a white bubble on screen waves once per approach when she comes within 12 m (no line; event 'actorWave').
   Villagers: spawned from WORLD wish spots (event 'wishSpot' or F.W.wishSpots), removed on 'chunkUnloaded'.
   Life feel (Wave 2): F.Act.ACTS – idle royals/staff do their own thing (king naps on c_trone, queen/Tor water flowers, Kari
   stirs the gryte, Mia plays ball with Pus, Rolf knits, Siv reads, Per sorts letters) + a short ambient line when she is close
   and nothing else speaks. Off in #test unless F.Act.actsInTest = true. Pets use F.Rig.tick (MODELS-2). No wish bubbles during
   a task. Plain words are worn sensibly (F.Act.WORD_SLOT: skjerf → neck, vott → hand, jakke/teppe → shoulders). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Act = F.Act = { all: {}, list: [], speakQ: [] };
const THANKS = new Set(['life_takk', 'life_h_ferdig', 'roy_g_takk', 'rq_g_takk', 'st_takk', 'q3_done', 'q13_done', 'q2_found']);
Act.THANKS = THANKS;

/* ---------------------------------------------------------- cast table (DESIGN §6.1) */
const CAST = {
  // v5 WP-W: posts name rooms by id, not by number (WP-X renumbers rooms naturally per floor – DESIGN4 §8, logic #46)
  konge:    { name: 'Kong Leo', voice: 'konge', cvoice: 'konge', posts: [{ room: 'spisesal' }, { room: 'tronsal' }, { park: 'slottsplassen' }], speed: 2.0 },
  dronning: { name: 'Dronning Ada', voice: 'dronning', cvoice: 'dronning', posts: [{ room: 'spisesal' }, { room: 'bibliotek' }, { park: 'rosehagen' }], speed: 2.2 },
  mia:      { name: 'Mia', voice: 'mia', cvoice: 'mia', posts: [{ room: 'spisesal' }, { room: 'mia' }, { park: 'lekeplassen' }], speed: 2.6 },
  ole:      { name: 'Ole', voice: 'barn', cvoice: null, posts: [{ room: 'spisesal' }, { room: 'mia' }, { park: 'lekeplassen' }], speed: 1.1, noTasks: true },
  kokk:     { name: 'Kokk Kari', voice: 'kokk', cvoice: 'kokk', posts: [{ room: 'kjokken' }] },
  tor:      { name: 'Gartner Tor', voice: 'tor', cvoice: 'tor', posts: [{ park: 'rosehagen' }, { park: 'drivhuset' }] },
  per:      { name: 'Postbud Per', voice: 'per', cvoice: 'per', posts: [{ park: 'slottsplassen' }, { park: 'markedsplassen' }] },
  siv:      { name: 'Bibliotekar Siv', voice: 'siv', cvoice: 'siv', posts: [{ room: 'bibliotek' }] },
  rolf:     { name: 'Ridder Rolf', voice: 'rolf', cvoice: 'rolf', posts: [{ room: 'Hallen' }, { park: 'slottsplassen' }, { park: 'parken' }] },
  pus:      { name: 'Pus', kind: 'animal', posts: [{ room: 'tronsal' }, { room: 'mia' }] },
  tass:     { name: 'Tass', kind: 'animal', posts: [{ park: 'lekeplassen' }, { park: 'slottsplassen' }], speed: 3 },
  bris:     { name: 'Bris', kind: 'animal', posts: [{ park: 'stallen' }] },
};
Act.CAST = CAST;
// fallback park spots (used when F.Park does not publish named spots): castle 56×40 at 0,0 + moat → park beyond |x|>34, |z|>26
const PARK_FALLBACK = {
  slottsplassen: [6, 36], markedsplassen: [-14, 44], rosehagen: [-14, -42], drivhuset: [16, -50], lekeplassen: [-56, 8],
  stallen: [34, -52], parken: [10, 60], andedammen: [58, 6], fehagen: [52, -40],
};
const ZONE_ALIAS = { slottsplassen: 'plaza', markedsplassen: 'market', rosehagen: 'rosehage', drivhuset: 'drivhus', lekeplassen: 'lekeplass',
  stallen: 'stall', parken: 'sorpark', andedammen: 'dam', fehagen: 'fehage', tallhagen: 'tallhage', dragebakken: 'drage' };
const FEMALE = new Set(['Ane', 'Eli', 'Eva', 'Ida', 'Lea', 'Liv', 'Mona', 'Nora', 'Pia', 'Rut', 'Sara', 'Siri', 'Una', 'Vera', 'Anna', 'Mari', 'Iris', 'Ella', 'Sofie', 'Hege', 'Ulla', 'Lise', 'Kaja', 'Nina']);
// villager jobs → formats they like to ask for (the engine still picks by learning debt)
const JOB_FORMATS = {
  baker: ['F10', 'F09', 'F24', 'F33', 'F06'], bonde: ['F08', 'F19', 'F09', 'F23'], fisker: ['F04', 'F18', 'F06', 'F33'],
  maler: ['F28', 'F35', 'F36', 'F15'], musikant: ['F21', 'F29', 'F20', 'F03'], isselger: ['F12', 'F16', 'F09', 'F33'],
  blomsterselger: ['F07', 'F09', 'F23', 'F28'], leketoysmaker: ['F14', 'F33', 'F36', 'F06'], batmann: ['F18', 'F02', 'F23'],
  fyrvokter: ['F01', 'F18', 'F20', 'F26'], gjeter: ['F08', 'F19', 'F06', 'F11'], bestemor: ['F23', 'F34', 'F31', 'F13'],
  bestefar: ['F30', 'F26', 'F14', 'F17'],
  bygger: ['F08', 'F09', 'F07'],   // builders at kingdom building sites (DESIGN2 §3.4: block counting)
};
Act.JOB_FORMATS = JOB_FORMATS;
const ROLE_FORMATS = {
  konge: ['F33', 'F39', 'F06', 'F07', 'F23', 'F30', 'F19'], dronning: ['F34', 'F28', 'F23', 'F25', 'F07', 'F12'],
  mia: ['F37', 'F06', 'F13', 'F33', 'F40', 'F41', 'F35'], kokk: ['F24', 'F09', 'F10', 'F05'], tor: ['F07', 'F08', 'F28', 'F19'],
  per: ['F02', 'F23', 'F27', 'F15'], siv: ['F25', 'F20', 'F29', 'F31'], rolf: ['F20', 'F18', 'F31', 'F21'],
};
// kingdom royals (DESIGN2 §3.9) inherit the formats of the home royals
ROLE_FORMATS.rkonge = ROLE_FORMATS.konge; ROLE_FORMATS.rdronning = ROLE_FORMATS.dronning; ROLE_FORMATS.rbarn = ROLE_FORMATS.mia;
Act.ROLE_FORMATS = ROLE_FORMATS;

/* ---------------------------------------------------------- the pressable thing that carries an actor */
F.Things.def('life_actor', {
  name: null, radius: 0.45, solid: false, reach: 2.1, hoverable: true,
  build() { return new THREE.Group(); },
  press(th) { return th.actor ? Act.press(th.actor) : null; },
});

function buildModel(a) {
  let g = null;
  try {
    if (a.kind === 'animal' && F.People && F.People.animal) g = F.People.animal(a.role);
    else if (F.People && F.People.make) g = F.People.make(a.look || a.role);
  } catch (e) { console.warn('[Act] model failed for', a.id, e); g = null; }
  if (!g) { // placeholder: simple toy figure
    const b = F.M.builder(), c = a.kind === 'animal' ? 'orange' : (a.lookCol || 'lilac');
    if (a.kind === 'animal') { b.box(0.5, 0.35, 0.8, c, 0, 0.3, 0); b.box(0.35, 0.35, 0.35, c, 0, 0.55, 0.45); }
    else { b.cyl(0.25, 0.38, 0.9, c, 0, 0.45, 0); b.sphere(0.3, 'skin', 0, 1.2, 0); }
    g = b.group; g.userData.parts = {}; g.userData.anchors = {};
    const head = new THREE.Object3D(); head.position.set(0, a.kind === 'animal' ? 0.75 : 1.5, 0); g.add(head); g.userData.anchors.head = head;
    const hand = new THREE.Object3D(); hand.position.set(-0.35, 0.8, 0.15); g.add(hand); g.userData.anchors.hand = hand;
    const back = new THREE.Object3D(); back.position.set(0, 0.9, -0.3); g.add(back); g.userData.anchors.back = back;
    const body = new THREE.Object3D(); body.position.set(0, 0.8, 0.3); g.add(body); g.userData.anchors.body = body;
    g.userData.animate = (dt, t, moving) => { g.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0; };
    g.userData.play = () => {};
  }
  if (a.scale && a.scale !== 1) g.scale.multiplyScalar(a.scale);
  return g;
}

/* ---------------------------------------------------------- spawn */
Act.spawn = function (id, o) {
  o = o || {};
  if (Act.all[id]) Act.remove(Act.all[id]);
  const cast = CAST[id] || {};
  const a = Object.assign({
    id, name: o.name || cast.name || id, role: o.role || id, voice: o.voice || cast.voice || 'vm', kind: o.kind || cast.kind || 'person',
    speed: o.speed || cast.speed || 2.3, posts: o.posts || cast.posts || null, noTasks: !!(o.noTasks || cast.noTasks),
    look: o.look || null, scale: o.scale || 1, job: o.job || null, repertoire: o.repertoire || ROLE_FORMATS[o.role || id] || JOB_FORMATS[o.job] || ['F06', 'F23', 'F33'],
    space: 'out', x: 0, z: 0, heading: 0, path: null, moving: false, busy: false, wish: null, hats: [], worn: {}, temp: !!o.temp,
    royal: o.royal || null, noEco: !!(o.noEco || o.royal), bld: null, f: 0,
  }, {});
  a.cvoice = o.cvoice !== undefined ? o.cvoice : (cast.cvoice !== undefined ? cast.cvoice : a.voice);
  const home = o.home || { space: 'out', x: 0, z: 0 };
  a.home = home;
  a.th = F.Things.spawn('life_actor', home.x, home.z, { id: 'a_' + id, space: home.space || 'out', data: { actor: id }, ry: o.ry || 0 });
  a.th.actor = a; a.th.def = Object.assign({}, a.th.def, { name: a.name });
  a.th.labelY = 2.2;
  a.model = buildModel(a);
  a.th.obj.add(a.model);
  a.parts = a.model.userData.parts || {};
  a.anchors = a.model.userData.anchors || {};
  a.space = a.th.space; a.x = home.x; a.z = home.z; a.heading = o.ry || 0;
  a.th.bboxDirty = true;
  Object.setPrototypeOf(a, proto);
  a.place(a.space, a.x, a.z, home.room, home);
  Act.all[id] = a; Act.list.push(a);
  // persisted wear (what she gave them stays on)
  const st = F.Eco && F.Eco.npc && !a.temp && !a.noEco && a.kind === 'person' ? F.Eco.npc(id) : null;
  if (st && st.wearing) for (const w of st.wearing) try { a.wear(w, 1, { silent: true }); } catch (e) {}
  // their own pet follows them again
  const myPet = st && st.owned ? st.owned.filter(i => { const c = F.CAT.byId(i); return c && c.kind === 'pet' && !c.ride; }).pop() : null;
  if (myPet) try { a.adoptPet(myPet); } catch (e) {}
  F.emit('actorSpawned', a);
  return a;
};
Act.remove = function (a) {
  if (!a) return;
  a.clearWish(); if (a.bubbleEl) a.bubbleEl.remove();
  if (a.pet) { F.Things.remove(a.pet.th); a.pet = null; }
  F.Things.remove(a.th);
  delete Act.all[a.id]; const i = Act.list.indexOf(a); if (i >= 0) Act.list.splice(i, 1);
};
Act.byId = id => Act.all[id] || null;
Act.near = (x, z, r, space) => Act.list.filter(a => a.space === (space || F.Space.cur) && (a.space !== 'in' || a.here()) && Math.hypot(a.x - x, a.z - z) <= r);
Act.player = () => F.Player.pos;

/* ---------------------------------------------------------- actor methods */
const proto = {
  get obj() { return this.th.obj; },
  get pos() { return V3(this.x, this.th.obj.position.y, this.z); },
  headPos() { const v = V3(); if (this.anchors.head) { this.th.obj.updateMatrixWorld(true); this.anchors.head.getWorldPosition(v); } else v.set(this.x, this.th.obj.position.y + 1.8, this.z); return v; },
  // same space and (indoors) the same building and visible floor as the camera
  here() {
    if (this.space !== F.Space.cur) return false; if (this.space !== 'in') return true;
    const cur = curBld(); if (cur && this.bld && this.bld !== cur) return false;
    const vf = visFloor(); return vf == null || this.f == null || this.f === vf;
  },
  visible() { return this.here() && Math.hypot(this.x - F.Player.pos.x, this.z - F.Player.pos.z) < 42; },
  groundY(x, z) {
    if (this.space === 'in') { if (bldReal()) return (this.f || 0) * FLOOR_H; const r = roomOf(this.room); if (r && r.bounds) return r.bounds.y || 0; return (this.f || 0) * FLOOR_H; }
    return F.Space.impl[this.space].heightAt(x, z);
  },
  // o: {bld, f} (a pos from roomPos / postPos / F.Realm.spot); without it the building and floor are looked up from x, z, room
  place(space, x, z, room, o) {
    const th = this.th;
    if (this.act && !this._actPlace && Act.stopAct) Act.stopAct(this, true);
    if (space === 'in') {
      const sameRoom = room == null && !(o && (o.bld || o.f != null)) && this.space === 'in';
      const loc = sameRoom ? { room: this.room, bld: this.bld, f: this.f } : locate(x, z, room, o);
      this.room = loc.room; this.bld = loc.bld; this.f = loc.f;
    } else { this.room = null; this.bld = null; this.f = 0; }
    if (space !== th.space) { th.obj.parent && th.obj.parent.remove(th.obj); F.Space.scene(space).add(th.obj); th.space = space; this.space = space; if (this.pet) this.pet.place(space, x + 0.8, z + 0.6); }
    this.x = th.x = x; this.z = th.z = z; this.path = null;
    th.y = this.groundY(x, z); th.obj.position.set(x, th.y, z);
    if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(true); }
  },
  face(x, z) { this.heading = Math.atan2(x - this.x, z - this.z); this.th.obj.rotation.y = this.heading; },
  facePlayer() { this.face(F.Player.pos.x, F.Player.pos.z); },
  gesture(name, sec) {
    const p = this.model.userData.play; if (!p) return;
    // a wave asked for while one is still in the air (the approach wave, then a greeting line) carries on – the arm does not drop
    // and rise again
    const g = this.model.userData.gesture;
    if (name === 'wave' && g && g() === 'wave' && this._waveGT != null && F.T.now - this._waveGT < 1.1) return;
    if (name === 'wave') this._waveGT = F.T.now;
    p(name, sec);
  },
  walkTo(x, z, o) {
    o = o || {};
    if (this.act && !(this.act.walking && !this.act.walkStarted) && Act.stopAct) Act.stopAct(this, true);
    if (this.act) this.act.walkStarted = true;
    if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(false); }
    if (!this.visible() && !o.always) { this.place(this.space, x, z); return Promise.resolve(true); }
    let path = null;
    try { path = F.Space.impl[this.space].findPath(this.x, this.z, x, z, 0.3, this.th); } catch (e) { path = null; }
    this.path = (path && path.length ? path : [[x, z]]).map(p => [p[0], p[1]]);
    this.stopDist = o.stopDist || 0.2;
    return new Promise(res => { this.onArrive = res; });
  },
  say(id, slots, o) {
    o = o || {};
    if (this.royal && /^life_/.test(id) && o.voice == null) return this.lifeSay(id);   // safety net: kingdom royals never use life_*
    // v3 WP6 (DESIGN3 §6.7): one thanks is enough – a thanks line from the same character within 3 s of the last one is skipped
    const prev = this.lastSay;
    if (THANKS.has(id) && prev && THANKS.has(prev.id) && F.T.now - (prev.tEnd != null ? prev.tEnd : prev.t) < 3) { Act.thanksSkipped = (Act.thanksSkipped || 0) + 1; return Promise.resolve(); }
    const rec = this.lastSay = { id, t: F.T.now, tEnd: null };
    const voice = o.voice != null ? o.voice : this.voice;
    const entry = { actor: this, voice, el: null };
    Act.speakQ.push(entry);
    if (!o.still) this.gesture('nod', 0.8);
    return F.SAY(id, slots, voice).then(() => {
      rec.tEnd = F.T.now;
      const i = Act.speakQ.indexOf(entry); if (i >= 0) Act.speakQ.splice(i, 1);
      if (entry.el) {   // fades out where the speaker is (it keeps following), then goes; a new bubble drops it at once (fadeQ)
        const el = entry.el; el.classList.add('out'); fadeQ.push(entry);
        setTimeout(() => { el.remove(); const k = fadeQ.indexOf(entry); if (k >= 0) fadeQ.splice(k, 1); }, 300);
      }
    });
  },
  // says number n in the actor's counting voice (falls back to the narrator for numbers without a clip)
  count(n) {
    const v = this.cvoice;
    if (v && n >= 1 && n <= 20) return this.say('life_n', { n }, { voice: v, still: true });
    if (v && F.SETS.TENS_30_100.includes(n) && ['konge', 'dronning', 'mia'].includes(v)) return this.say('life_n10', { n }, { voice: v, still: true });
    // v5 WP-W (logic #6 / §3-B): a number is never silent – the narrator's whole clip 0–100, else a non-numeric line
    n = Math.round(+n);
    const nid = F.TPL.has('core_num') ? 'core_num' : F.TPL.has('hud_num') ? 'hud_num' : null;
    if (nid && n >= 0 && n <= 100) return F.SAY(nid, { n }, '');
    if (n > 100 && F.TPL.has('life_mange')) return this.say('life_mange', null, { still: true });
    return F.T.sleep(350);
  },
  setWish(w) { this.wish = w ? Object.assign({ kind: 'task' }, w) : null; this.wishChanged = true; return this.wish; },
  clearWish() { this.wish = null; this.wishChanged = true; },
};
// the life_* repertoire; kingdom royals say their own roy_* lines instead (F.Royals.sayLife maps them)
proto.lifeSay = function (id) {
  if (this.royal) return F.Royals && F.Royals.sayLife ? F.Royals.sayLife(this, id) : F.T.sleep(300);
  return this.say(id);
};
Act.proto = proto;

/* ---------------------------------------------------------- speech bubbles follow whoever is talking */
// fading bubbles (said, 300 ms fade): they still follow their speaker; any new bubble removes them at once, so one line never
// shows twice (review WP7 #1: «Velkommen til Blomsterslottet!» once, not twice)
const fadeQ = [];
F.on('subtitle', (text, voice) => {
  if (!text) return;
  // v5 WP-W (DESIGN4 §5 v3 leftover): bubbles follow the parent's subtitle setting (av / korte / alle) like the subtitle line
  if (F.UI.subShows && !F.UI.subShows(text)) return;
  const e = Act.speakQ.find(q => q.voice === (voice || '') && q.actor && Act.all[q.actor.id]);
  if (!e) return;
  for (const q of fadeQ.splice(0)) if (q.el) q.el.remove();     // a new line: the fading ones go at once (no stacked half-faded copies)
  for (const q of Act.speakQ) if (q !== e && q.el && q.el.textContent === text) q.el.style.visibility = 'hidden';
  if (!e.el) { e.el = F.UI.el('div', 'wbubble abubble'); document.getElementById('bubbles').appendChild(e.el); }
  e.el.textContent = text; e.el.style.visibility = '';
});
F.on('preRender', () => {
  const r = F.R.renderer.domElement.getBoundingClientRect();
  for (const e of Act.speakQ.concat(fadeQ)) {
    if (!e.el) continue;
    const a = e.actor;
    if (!a.here()) { e.el.style.display = 'none'; continue; }
    const v = a.headPos(); v.y += 0.35; v.project(F.R.camera);
    e.el.style.display = v.z < 1 ? '' : 'none';
    e.el.style.left = (r.left + (v.x + 1) / 2 * r.width) + 'px'; e.el.style.top = (r.top + (1 - v.y) / 2 * r.height) + 'px';
  }
});

/* ---------------------------------------------------------- movement + animation loop */
F.on('tick', (dt, t) => {
  const P = F.Player.pos;
  for (let i = 0; i < Act.list.length; i++) {
    const a = Act.list[i], th = a.th;
    let moving = false;
    if (a.path && a.path.length) {
      if (!a.visible() && !a.followMode) { const end = a.path[a.path.length - 1]; a.place(a.space, end[0], end[1]); }
      else {
        const [tx, tz] = a.path[0], dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz), last = a.path.length === 1;
        if (d < (last ? a.stopDist : 0.3)) {
          a.path.shift();
          if (!a.path.length) { a.path = null; if (a.onArrive) { const f = a.onArrive; a.onArrive = null; f(true); } }
        } else {
          const sp = Math.min(d, a.speed * (a.speedMul || 1) * dt);
          a.x += dx / d * sp; a.z += dz / d * sp; th.x = a.x; th.z = a.z; moving = true;
          const want = Math.atan2(dx, dz); let dh = want - a.heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
          a.heading += dh * Math.min(1, dt * 10);
        }
      }
    }
    a.moving = moving;
    if (a.space !== F.Space.cur) continue;
    const c = F.R.cam.target, far = Math.abs(a.x - c.x) > 52 || Math.abs(a.z - c.z) > 52;
    const here = a.here() && !far; if (th.obj.visible !== here) th.obj.visible = here;
    if (!here) continue;
    const gy = a.groundY(a.x, a.z);
    th.y += (gy - th.y) * Math.min(1, dt * 10);
    th.obj.position.set(a.x, th.y + (a.lift || 0), a.z);
    th.obj.rotation.y = a.heading;
    if (a.model.userData.animate) a.model.userData.animate(dt, t, moving);
    if (a.act && !(a._wavedT != null && F.T.now - a._wavedT < 1.4 && !a.act.sit)) actPose(a, t, dt, moving);   // a wave shows over the act's arms
    if (a.hats.length > 1) wobbleStack(a, t);
    if (a.shiver) a.model.rotation.z = Math.sin(t * 50) * 0.03;
  }
});

/* ---------------------------------------------------------- wearing things */
const DRESS_COL = { sommerkjole: 'butter', ballkjole: 'pink', stjernekjole: 'navySoft', regnbuekjole: 'lilac', blomsterkjole: 'mint', boblekjole: 'sky' };
function modelFor(idOrModel) {
  const c = F.CAT && F.CAT.byId ? F.CAT.byId(idOrModel) : null;
  if (c) return { mid: F.CAT.mid(c), opts: c.opts || {}, cat: c };
  return { mid: F.VOX.has(idOrModel) ? idOrModel : null, opts: {}, cat: null };
}
Act.modelFor = modelFor;
function fitModel(mid, opts, width) {
  const m = mid ? F.VOX.make(mid, opts || {}) : giftBox();
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(V3());
  const k = width / Math.max(0.05, Math.max(s.x, s.z));
  m.scale.multiplyScalar(k);
  m.userData.h = s.y * k;
  return m;
}
function giftBox() { const b = F.M.builder(); b.box(0.5, 0.4, 0.5, 'rose', 0, 0.2, 0); b.box(0.52, 0.42, 0.1, 'gold', 0, 0.21, 0); b.box(0.1, 0.42, 0.52, 'gold', 0, 0.21, 0); return b.group; }
Act.fitModel = fitModel;
// where a plain (non-catalogue) word is worn: lue → head, skjerf → neck, vott → hand, jakke/teppe → over the shoulders.
// Anything else (peis, sol, sokk …) is not put on at all.
const WORD_SLOT = { lue: 'hode', hatt: 'hode', krone: 'hode', tiara: 'hode', hjelm: 'hode', caps: 'hode', luer: 'hode', hatter: 'hode', sløyfe: 'hode',
  skjerf: 'hals', kjede: 'hals', smykke: 'hals', slips: 'hals', perle: 'hals', vott: 'hender', hanske: 'hender', ring: 'hender', stav: 'stav',
  jakke: 'rygg', genser: 'rygg', kåpe: 'rygg', vest: 'rygg', kappe: 'rygg', teppe: 'rygg', dyne: 'rygg', pledd: 'rygg' };
Act.WORD_SLOT = WORD_SLOT;
Act.wearable = id => { const c = F.CAT && F.CAT.byId ? F.CAT.byId(id) : null; return c ? (c.kind === 'wear' || c.use === 'wear') : !!WORD_SLOT[id]; };
proto.wear = function (idOrModel, n, o) {
  n = Math.max(1, n || 1); o = o || {};
  this._justWore = idOrModel; this._justWoreT = F.T.now;
  const { mid, opts, cat } = modelFor(idOrModel);
  const slot = cat ? cat.slot : (WORD_SLOT[idOrModel] || 'hode');
  const st = F.Eco && F.Eco.npc && !this.temp && this.kind === 'person' ? F.Eco.npc(this.id) : null;
  if (!o.silent && st) { st.wearing = st.wearing || []; if (!st.wearing.includes(idOrModel) && (slot !== 'hode' || n === 1)) st.wearing.push(idOrModel); F.store(); }
  if (!cat && this.kind === 'person' && F.People) {
    // plain words: a dress / skirt changes the outfit, shoes change colour, socks and trousers just make them happy
    if (idOrModel === 'kjole' || idOrModel === 'skjørt') return this.restyle({ outfit: 'kjole', outfitCol: 'pink', skirtCol: 'pink' });
    if (['sko', 'støvel', 'tøffel'].includes(idOrModel)) return this.restyle({ shoeCol: 'red' });
    if (!WORD_SLOT[idOrModel]) return;
  }
  if (slot === 'kjole' && F.People && this.kind === 'person') return this.restyle({ outfit: 'kjole', outfitCol: DRESS_COL[cat.id] || 'pink', skirtCol: DRESS_COL[cat.id] || 'pink' });
  if (slot === 'sko' && F.People && this.kind === 'person') return this.restyle({ shoeCol: cat.id === 'tøfler' ? 'red' : cat.id === 'rosasko' ? 'pink' : 'gold' });
  if (slot === 'ansikt' && F.People && this.kind === 'person') { const L = this.lookOpts(); return this.restyle({ acc: [...new Set([...(L.acc || []), 'briller'])] }); }
  const anchor = (slot === 'vinger' || slot === 'rygg') ? this.anchors.back : (slot === 'stav' || slot === 'hender') ? this.anchors.hand : slot === 'hals' ? this.anchors.body : this.anchors.head;
  if (!anchor) return;
  const sc = this.model.scale.x || 1;
  for (let i = 0; i < n; i++) {
    const width = (slot === 'vinger' ? 0.9 : slot === 'rygg' ? 0.55 : slot === 'stav' ? 0.25 : slot === 'hals' ? 0.42 : slot === 'hender' ? 0.2 : 0.62) / sc;
    const m = fitModel(mid, opts, width);
    if (slot === 'hode' || !slot) {
      let y = 0; for (const h of this.hats) y += h.userData.h * 0.82;
      m.position.set(0, y - (this.hats.length ? 0 : 0.12 / sc), 0); m.rotation.y = (Math.random() - 0.5) * 0.5;
      m.userData.baseX = 0; this.hats.push(m);
    } else if (slot === 'vinger') { m.rotation.y = Math.PI; m.position.set(0, -0.2 / sc, -0.05 / sc); }
    else if (slot === 'rygg') { m.rotation.y = Math.PI; m.position.set(0, -0.35 / sc, 0); }
    else if (slot === 'hals') { m.position.set(0, 0.12 / sc, -0.05 / sc); }
    else if (slot === 'stav') { m.rotation.x = -0.6; }
    anchor.add(m);
    if (!o.silent) { const d = i * 110; F.T.timeout(() => { F.FX.pop(m); F.sfx.pop(); }, d); }
  }
  this.th.bboxDirty = true;
};
proto.lookOpts = function () {
  if (this.look && typeof this.look === 'object') return Object.assign({}, this.look);
  return F.People ? F.People.preset(this.role) : {};
};
// rebuild the People model with changed options (dress colour, shoes, glasses) keeping hats/anchors
proto.restyle = function (patch) {
  if (!F.People) return;
  const look = Object.assign(this.lookOpts(), patch);
  this.look = look;
  const hats = this.hats.slice(); this.hats = [];
  this.th.obj.remove(this.model);
  this.model = buildModel(this);
  this.parts = this.model.userData.parts || {}; this.anchors = this.model.userData.anchors || {};
  this.th.obj.add(this.model);
  for (const h of hats) { this.anchors.head && this.anchors.head.add(h); this.hats.push(h); }
  F.FX.sparkle(V3(this.x, this.th.obj.position.y + 1, this.z), 0xffd6f0);
  this.th.bboxDirty = true;
};
function wobbleStack(a, t) {
  const n = a.hats.length;
  a.hats.forEach((h, i) => { const k = i / Math.max(1, n - 1); h.position.x = Math.sin(t * 2.3 + i * 0.35) * 0.012 * i * (n > 6 ? 1.6 : 1); h.rotation.z = Math.sin(t * 2.3 + i * 0.35 + 0.6) * 0.05 * k; });
}
proto.unwearHats = function () { for (const h of this.hats) h.parent && h.parent.remove(h); this.hats = []; };

/* ---------------------------------------------------------- reactions by affordance tag */
const heartsAt = p => F.FX.burst(p, { n: 14, colors: [0xff7fb0, 0xff5d8f, 0xffc0dc], speed: 1.2, up: 2.2, life: 1.1, size: 0.09, gravity: 0.6 });
Act.hearts = heartsAt;
proto.holdItem = function (idOrModel, width) {
  const { mid, opts } = modelFor(idOrModel);
  const m = fitModel(mid, opts, (width || 0.35) / (this.model.scale.x || 1));
  (this.anchors.hand || this.th.obj).add(m);
  return m;
};
const TAG_ALIAS = { drink: 'eat', cuddle: 'pet', sleep: 'sit', grow: 'place', fly: 'play', blocks: 'cheer', none: 'cheer' };
proto.react = async function (tag, itemId) {
  tag = TAG_ALIAS[tag] || tag;
  const a = this, top = () => V3(a.x, a.th.obj.position.y + 1.9 * (a.model.scale.x || 1), a.z);
  a.lastReact = tag; a._reactT = F.T.now;
  // v3 WP6: inside a helping mission the cheer after each step is a gesture (the giver's praise follows; one thanks at the end)
  if (tag === 'cheer' && a._chainQuiet && !itemId) { a.gesture('cheer', 1.2); heartsAt(top()); return F.T.sleep(300); }
  if (a.kind === 'animal') { a.gesture('hop', 1.2); heartsAt(top()); F.sfx.squeak(); return F.T.sleep(900); }
  const lines = { eat: 'life_nam', wear: 'life_fin', play: 'life_gøy', pet: 'life_søt', sit: 'life_sitte', smell: 'life_lukt', warm: 'life_varm', light: 'life_lys', music: 'life_gøy', place: 'life_takk', ride: 'life_gøy', cheer: 'life_takk', read: 'life_takk' };
  const say = () => a.voice === 'barn' && a.role === 'ole' ? a.say('life_ole') : a.lifeSay(lines[tag] || 'life_takk');
  if (tag === 'eat' && itemId) {
    const m = a.holdItem(itemId, 0.32);
    a.gesture('eat', 2.2);
    const sp = say();
    for (let i = 0; i < 4; i++) { await F.T.sleep(420); m.scale.multiplyScalar(0.78); F.FX.burst(a.headPos(), { n: 6, colors: [0xf3dfae, 0xd6a86a, 0xffffff], speed: 0.8, up: 1, life: 0.6, size: 0.05 }); F.sfx.pop(); }
    m.parent && m.parent.remove(m); heartsAt(top()); a.shiver = false;
    return sp;
  }
  if (tag === 'wear' && itemId) { if (!(a._justWore === itemId && F.T.now - a._justWoreT < 3) ) a.wear(itemId); a.gesture('hop', 1.2); heartsAt(top()); a.shiver = false; return say(); }
  if (tag === 'warm') { if (itemId && modelFor(itemId).mid && Act.wearable(itemId) && !(a._justWore === itemId && F.T.now - a._justWoreT < 3)) a.wear(itemId); a.shiver = false; a.gesture('cheer', 1.4); heartsAt(top()); return say(); }
  if (tag === 'smell' && itemId) { const m = a.holdItem(itemId, 0.3); a.gesture('nod', 1.5); heartsAt(top()); await say(); m.parent && m.parent.remove(m); return; }
  if ((tag === 'play' || tag === 'music') && itemId) {
    const m = a.holdItem(itemId, 0.4); a.gesture(tag === 'music' ? 'dance' : 'cheer', 2.4);
    if (tag === 'music') for (let i = 0; i < 6; i++) F.T.timeout(() => F.sfx.pluck(F.note([0, 4, 7, 12, 7, 4][i])), i * 260);
    else F.T.tween(1200, k => { m.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * 0.6; m.rotation.y = k * 8; });
    heartsAt(top()); await say(); await F.T.sleep(600); m.parent && m.parent.remove(m); return;
  }
  if (tag === 'pet' && itemId) { a.adoptPet(itemId); a.gesture('hop', 1.4); heartsAt(top()); return say(); }
  if (tag === 'ride' && itemId) return a.ride(itemId);
  if (tag === 'place' && itemId) {
    const { mid, opts } = modelFor(itemId);
    const g = new THREE.Group(), ang = a.heading + 0.9, x = a.x + Math.sin(ang) * 1.3, z = a.z + Math.cos(ang) * 1.3;
    const m = fitModel(mid, opts, 0.9); g.add(m); g.position.set(x, F.Space.impl[a.space].heightAt(x, z), z); F.Space.scene(a.space).add(g);
    if (mid) await F.FX.assemble(mid, opts, m, g.position, { ms: 900 }); heartsAt(top());
    a.placed = a.placed || []; a.placed.push(g); if (a.placed.length > 3) { const old = a.placed.shift(); old.parent && old.parent.remove(old); }
    return say();
  }
  a.gesture(tag === 'sit' ? 'nod' : 'cheer', 1.4); heartsAt(top()); a.shiver = false;
  return say();
};
// a pet that follows its owner (NPC pets; her own pet is handled by F.Eco)
proto.adoptPet = function (itemId) {
  if (this.pet) { Act.remove(this.pet); this.pet = null; }
  const { mid, opts } = modelFor(itemId);
  const id = this.id + '_pet';
  const p = Act.spawn(id, { name: itemId, kind: 'animal', role: 'pet', home: { space: this.space, x: this.x + 0.8, z: this.z + 0.6 }, speed: this.speed * 1.4, temp: true });
  p.th.obj.remove(p.model);
  p.model = fitModel(mid, opts, 0.55);
  const m = p.model, rigged = !!(F.Rig && m.userData && m.userData.parts && Object.keys(m.userData.parts).length);
  // MODELS-2 rig (legs walk, tail wags, wings flap); unrigged things just bounce along
  m.userData.animate = (dt, t, moving) => {
    if (rigged) { try { const st = { moving, happy: p.happyT > F.T.now }; F.Rig.tick(m, t, st); m.position.y = F.Rig.kind(m) !== 'none' ? F.Rig.bob(m, t, st) : (moving ? Math.abs(Math.sin(t * 12)) * 0.05 : 0); return; } catch (e) { /* fall through */ } }
    m.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.08 : Math.abs(Math.sin(t * 2)) * 0.02;
  };
  p.model.userData.play = () => {};
  p.th.obj.add(p.model); p.owner = this; p.followMode = true; this.pet = p;
  return p;
};
// ride: the item appears under the actor and they do a happy lap
proto.ride = async function (itemId) {
  const { mid, opts } = modelFor(itemId);
  const m = fitModel(mid, opts, 0.9 / (this.model.scale.x || 1));
  this.th.obj.add(m); m.position.set(0, 0, 0);
  this.lift = 0.25; const sm = this.speedMul; this.speedMul = 1.8;
  const cx = this.x, cz = this.z;
  this.lifeSay('life_gøy');
  for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2; await this.walkTo(cx + Math.sin(ang) * 2.5, cz + Math.cos(ang) * 2.5); }
  await this.walkTo(cx, cz);
  this.lift = 0; this.speedMul = sm; this.th.obj.remove(m);
  heartsAt(this.headPos());
};
// pets follow their owner
F.on('tick', () => {
  for (const a of Act.list) {
    if (!a.owner) continue;
    const o = a.owner; if (!Act.all[o.id]) { Act.remove(a); continue; }
    if (a.space !== o.space) { a.place(o.space, o.x + 0.8, o.z + 0.6); continue; }
    const d = Math.hypot(o.x - a.x, o.z - a.z);
    if (d > 1.6 && !a.path) { const ang = Math.atan2(a.x - o.x, a.z - o.z); a.path = [[o.x + Math.sin(ang) * 1.1, o.z + Math.cos(ang) * 1.1]]; a.stopDist = 0.2; }
  }
});

/* ---------------------------------------------------------- pressing a character */
Act.press = async function (a) {
  if (a.royal) {   // kingdom royals: quest → free task → royal line (WP7 F.Royals.press)
    if (F.Royals && F.Royals.press && F.Royals.real) return F.Royals.press(a);
    if (a.busy) return; a.gesture('wave', 1.2); return;
  }
  if (a.busy) return;
  if (a.act) stopAct(a);
  a.busy = true;
  try {
    a.facePlayer(); F.FX.pop(a.model);
    if (a.owner) { a.gesture('hop', 1); heartsAt(a.headPos()); F.sfx.squeak(); return; }
    if (a.kind === 'animal') {
      a.gesture('hop', 1.2); heartsAt(a.headPos());
      const tpl = { pus: 'life_an_pus', tass: 'life_an_tass', bris: 'life_an_bris', pip: 'life_an_pip' }[a.role] || 'life_an_dyr';
      F.sfx[a.role === 'tass' ? 'boing' : 'squeak'](); await F.SAY(tpl); return;
    }
    if (a.role === 'ole') { a.gesture('hop', 1.4); heartsAt(a.headPos()); await a.say('life_ole'); return; }
    const w = a.wish;
    // natural audit D5: a white / item bubble is an invitation only while she can SEE it (a 4th bubble, one off screen or resting in the
    // play break is not drawn) – a tap on that person is a hello, never a task or a money ask she did not choose
    // (verify 2nd round) judged at the moment of HER tap, not on arrival: the fairy flies to him first, and on the way his bubble may
    // come into the nearest three – a bubble she never saw is no invitation (a press from code, with no tap, uses the bubble's state now)
    const tap = a._tap && F.T.now - a._tap.t < 20 ? a._tap : null; a._tap = null;
    const seen = !!w && (w.kind === 'quest' || w.kind === 'stall' || (tap ? tap.seen : bubbleShown(a)));
    const allowed = w && seen && (w.kind === 'quest' || w.kind === 'item' || w.kind === 'gift' || w.kind === 'stall' || !F.Quest.canOfferTask || F.Quest.canOfferTask());
    if (w && w.onPress && allowed) { await w.onPress(a); return; }
    // natural audit D5 (#25) / §3 #24: a hello – no bubble, or a bubble resting in the play break (hidden) – is a wave and ONE line
    // in their own voice: never coins, never a task, no «Nå kan du leke litt!»
    if (F.Eco && F.Eco.hello) await F.Eco.hello(a);
    else { a.gesture('wave', 1.2); await a.say('life_hei'); }
  } catch (e) { console.error('[Act.press]', a.id, e); }
  finally { a.busy = false; }
};

/* ---------------------------------------------------------- wish bubbles (max 3 within 40 m, gold first) */
const MAXB = 3;
// a bubble is on screen now (drawn this frame or the last few)
function bubbleShown(a) { return !!(a && a.wish && a.bubbleEl && a.bubbleEl.style.display !== 'none' && a._bubT != null && F.T.now - a._bubT < 0.5); }
// her tap on a person: remember whether she could SEE their bubble at that moment (Act.press runs when the fairy gets there)
F.on('worldClick', hit => { const a = hit && hit.thing && hit.thing.actor; if (a) a._tap = { t: F.T.now, seen: bubbleShown(a) }; });
// clarity §3.2-1/2: what the bubble's look depends on besides the picture – a wish whose gold / done flag is changed in place
// (F.Quest.accept sets wish.gold = true on the same object) is redrawn on the next frame even without wishChanged
const bubbleSig = w => (w.gold ? 'g' : 'w') + (w.done ? 'd' : '');
function bubbleFor(a) {
  const w = a.wish;
  const el = a.bubbleEl || (a.bubbleEl = F.UI.el('div', 'lifewish'));
  el.innerHTML = '';
  // clarity §3.2-1 (R3): gold = «your goal continues here» – only a goal she took on (w.gold); an offer, a royal invitation, a wish
  // and a customer are white («I wish for this – will you help?»)
  el.className = 'lifewish' + (w.gold ? ' gold' : '') + (w.kind === 'item' ? ' item' : '') + (w.kind === 'gift' ? ' gift' : '');
  a._bubSig = bubbleSig(w);
  const mid = w.itemId ? F.CAT.mid(w.itemId) : (w.model && F.VOX.has(w.model) ? w.model : null);
  const opts = w.itemId && F.CAT.byId(w.itemId) ? F.CAT.byId(w.itemId).opts : (w.opts || {});
  // natural audit D5 (#27): the bubble shows only the real want – the item, the thing they need, the quest's thing (no «123» plaque)
  if (mid) { const im = F.Thumb.img(mid, opts || {}, { size: 112 }); el.appendChild(im); }
  else el.appendChild(F.UI.el('div', 'lw-dot', w.kind === 'quest' ? '★' : '!'));
  if (w.kind === 'item' && w.price) el.appendChild(F.UI.el('div', 'lw-price', String(w.price)));
  // D5 (verify 2nd round): a gift she carries for them – the thing and a heart (no price, no words): a visible invite she may tap
  if (w.kind === 'gift') {
    el.appendChild(F.UI.el('div', 'lw-heart', '\u2665'));
    if (!document.getElementById('lw-gift-css')) { const cs = document.createElement('style'); cs.id = 'lw-gift-css';
      cs.textContent = '.lifewish.gift{border-color:#f3a6c4}.lifewish.gift::after{border-top-color:#fff}.lw-heart{font-size:30px;line-height:30px;color:#e8508a;margin-top:2px}'; document.head.appendChild(cs); }
  }
  // clarity §3.2-2: the goal's work is done – a green ✓ on the giver's gold bubble («come back here»; arriving is enough)
  if (w.done) el.appendChild(F.UI.el('div', 'lw-done', '✓'));
  el.onclick = e => { e.stopPropagation(); if (F.Input.enabled && !F.Player.frozen) { a._tap = { t: F.T.now, seen: true }; F.Things.press(a.th); } };
  if (!el.parentNode) document.getElementById('bubbles').appendChild(el);
  a.wishChanged = false;
  return el;
}
/* clarity (any zoom, any screen): a bubble is never cut by the screen edge, never under the HUD (buttons, the goal card, the place
   banner, the subtitle line, the kingdom light) and never on another bubble. The anchor is above the head (x, y = the bubble's bottom
   centre); it moves the least it can: inside the screen, then off the HUD (down from a top button, up from a bottom one), then off a
   bubble already placed (up when there is room, else beside it). */
const TAIL = 12, GAP = 6;
const HUD_SEL = '#hud .hud-btn, .hud-goal, .hud-place, .realm-edge, #hchain, #sub.on';
let hudT = -1, hudCache = [];
function hudRects() {
  if (F.T.now - hudT < 0.4 && hudT >= 0) return hudCache;
  hudT = F.T.now; hudCache = [];
  let els = []; try { els = document.querySelectorAll(HUD_SEL); } catch (e) { els = []; }
  for (const e of els) {
    const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || b.bottom <= 0 || b.top >= innerHeight) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.15) continue;
    hudCache.push({ l: b.left, t: b.top, r: b.right, b: b.bottom, top: (b.top + b.bottom) / 2 < innerHeight / 2 });
  }
  return hudCache;
}
Act.hudRects = hudRects;
const hits = (q, p) => q.l < p.r + GAP && q.r > p.l - GAP && q.t < p.b + GAP && q.b > p.t - GAP;
function placeBubble(x, y, w, h, chip, sr, placed, hud) {
  const minY = sr.top + h + chip + 4, maxY = sr.bottom - 4, minX = sr.left + w / 2 + 4, maxX = sr.right - w / 2 - chip - 4;
  const box = (px, py) => ({ l: px - w / 2, t: py - h - chip, r: px + w / 2 + chip, b: py + TAIL });
  const inScr = (px, py) => py >= minY && py <= maxY && px >= minX && px <= maxX;
  const clampS = () => { x = Math.min(Math.max(x, minX), Math.max(minX, maxX)); y = Math.min(Math.max(y, minY), Math.max(minY, maxY)); };
  clampS();
  for (let k = 0; k < 8; k++) {
    const q = box(x, y);
    const hb = hud.find(p => hits(q, p));
    if (hb) {
      const ny = hb.top ? hb.b + GAP + h + chip : hb.t - GAP - TAIL;
      if (inScr(x, ny) && !hud.some(p => p !== hb && hits(box(x, ny), p))) { y = ny; continue; }
      // no room above / below it: beside it, toward the middle of the screen
      x = (hb.l + hb.r) / 2 > (sr.left + sr.right) / 2 ? hb.l - GAP - w / 2 - chip : hb.r + GAP + w / 2; clampS(); continue;
    }
    const pb = placed.find(p => hits(q, p));
    if (!pb) break;
    const ny = pb.t - GAP - TAIL;                                   // the later (farther / lower-ranked) bubble moves up …
    if (inScr(x, ny) && !hud.some(p => hits(box(x, ny), p)) && !placed.some(p => p !== pb && hits(box(x, ny), p))) { y = ny; continue; }
    x = x >= (pb.l + pb.r) / 2 ? pb.r + GAP + w / 2 : pb.l - GAP - w / 2 - chip;   // … or, with no room above, goes beside it
    clampS();
  }
  return { x, y };
}
const tmp = V3();
F.on('preRender', () => {
  // v3: white wish bubbles are unsolicited offers → quiet during the play break (a direct tap still gets its task)
  const P = F.Player.pos, can = F.Quest.quiet ? !F.Quest.quiet() : (!F.Quest.canOfferTask || F.Quest.canOfferTask());
  const cands = [];
  for (const a of Act.list) {
    const w = a.wish;
    if (!w || !a.here()) { if (a.bubbleEl) a.bubbleEl.style.display = 'none'; continue; }
    const d = Math.hypot(a.x - P.x, a.z - P.z);
    const dormant = !can && (w.kind === 'task' || w.kind === 'need');
    // no bubbles while a task runs (her own NPC's wish bubble would sit on top of the task stage)
    const ov = (F.Castle && F.Castle.ov) || (F.R.cam && F.R.cam.mode === 'overview');   // no bubbles over the dollhouse overview (room plaques)
    if (d > 40 || dormant || a.busy || F.Task.current || ov) { if (a.bubbleEl) a.bubbleEl.style.display = 'none'; continue; }
    // clarity §3.2-1: gold (her goal) first, then her stall's customers, then offers of a quest / royal invitation (white now, but
    // they must not drop out of the three for a nearer everyday wish), then the nearest
    cands.push([a, (w.gold ? -1000 : 0) + (w.kind === 'stall' ? -500 : 0) + (w.kind === 'quest' && !w.gold ? -250 : 0) + d]);
  }
  cands.sort((x, y) => x[1] - y[1]);
  const r = F.R.renderer.domElement.getBoundingClientRect();
  const placed = [], hud = cands.length ? hudRects() : [];
  // clarity §3.2-6 (Q's thing bubble): the gold bubble over the thing her goal continues at keeps its place – a person's bubble that
  // would cover it moves instead (its rect from the last frame; F.Quest draws it after this handler)
  const mk = cands.length && F.Quest && F.Quest.markShown && F.Quest.markShown() && F.Quest.markEl ? F.Quest.markEl() : null;
  if (mk) { const mr = mk.getBoundingClientRect(); if (mr.width > 0) placed.push({ l: mr.left, t: mr.top, r: mr.right, b: mr.bottom }); }
  let shown = 0;
  for (const [a] of cands) {
    const el = (a.wishChanged || !a.bubbleEl || a._bubSig !== bubbleSig(a.wish)) ? bubbleFor(a) : a.bubbleEl;
    // at most three bubbles ON SCREEN (one off screen does not take a place from one she can see)
    if (shown >= MAXB) { el.style.display = 'none'; continue; }
    tmp.copy(a.headPos()); tmp.y += 0.55; tmp.project(F.R.camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { el.style.display = 'none'; continue; }
    el.style.display = ''; a._bubT = F.T.now; shown++;
    const bob = Math.sin(F.T.now * 2.2 + a.x) * 4;
    const w = el.offsetWidth || 90, h = el.offsetHeight || 110, chip = a.wish.done ? 12 : 0;
    const pos = placeBubble(r.left + (tmp.x + 1) / 2 * r.width, r.top + (1 - tmp.y) / 2 * r.height + bob, w, h, chip, r, placed, hud);
    placed.push({ l: pos.x - w / 2, t: pos.y - h - chip, r: pos.x + w / 2 + chip, b: pos.y + TAIL });
    el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) translate(-50%, -100%)`;
  }
  for (const a of Act.list) if (a.bubbleEl && a.wish && !cands.find(c => c[0] === a)) a.bubbleEl.style.display = 'none';
});
F.on('spaceChanged', () => { for (const a of Act.list) if (a.bubbleEl) a.bubbleEl.style.display = 'none'; });

/* clarity §3.2-3: a white bubble greets her. When she comes within 12 m of a person whose WHITE bubble is on screen (an offer, a
   wish – not her stall's queue, not a gold goal), that person turns to her and waves: once per approach (re-armed when she is more
   than 16 m away or in another space), on every approach, with no line (the once-ever «Hei! Kan du hjelpe meg?» is F.First's).
   A royal's own close-up wave (royals.js, 4.5 m) is held for a minute after this one, so an approach gets one wave, not two. */
const WAVE_R = 12, WAVE_REARM = 16;
Act.WAVE_R = WAVE_R;
let waveAcc = 0;
const isWhite = w => !!w && !w.gold && w.kind !== 'stall';
Act.whiteBubble = a => !!(a && isWhite(a.wish) && bubbleShown(a));
F.on('tick', dt => {
  waveAcc += dt; if (waveAcc < 0.25) return; waveAcc = 0;
  if (!F.booted || !F.Player || !F.Player.pos) return;
  const P = F.Player.pos;
  for (const a of Act.list) {
    if (a.kind !== 'person' || a.owner || a.temp) continue;
    const d = a.here() ? Math.hypot(a.x - P.x, a.z - P.z) : Infinity;
    if (d > WAVE_REARM) { a._waveArm = true; continue; }
    if (a._waveArm === false || d > WAVE_R || !isWhite(a.wish)) continue;
    if (a.busy || a.tapQueued || F.Task.current || !bubbleShown(a) || Act.speakQ.some(q => q.actor === a)) continue;
    if (a.act && a.act.kind === 'nap') continue;                                        // a napping king does not wave
    a._waveArm = false; a._wavedT = F.T.now;
    if (a.royal) { a._waveT = Math.max(a._waveT || 0, F.T.now + 60); a.quirkPause = Math.max(a.quirkPause || 0, F.T.now + 2); }
    // turns to her when standing free; busy with something (watering, stirring, on a throne) – the wave only (the act's pose rests)
    if (!a.path && !a.act) a.facePlayer();
    a.gesture('wave', 1.4);
    F.emit('actorWave', a);
  }
});
F.on('spaceChanged', () => { for (const a of Act.list) a._waveArm = true; });

/* ---------------------------------------------------------- where things are (buildings / castle rooms / park spots)
   F.Bld (WP1) when the real engine is loaded, else the legacy F.Castle rooms. Plans: 'slott' (origin 0,0), 'tarn' (−400,0),
   'rk_<realm>' (400 + 100·(k−1), 0); a cell (c, f) covers x0 = ox + 15c … x0 + 14, z oz … oz + 10, floor y = 6f. */
const FLOOR_H = 6;
// the real engine is loaded once F.Bld knows the home castle's rooms (the WP0 stub's room() always returns null)
let bldOk = null;
function bldReal() {
  const B = F.Bld; if (!B || typeof B.room !== 'function') return false;
  if (bldOk === B) return true;
  let r = null; try { r = B.room('slott', 11); } catch (e) { r = null; }
  if (r) { bldOk = B; return true; }
  return false;
}
Act.bldReal = bldReal;
function curBld() { if (bldReal()) return F.Bld.cur || (F.Space.cur === 'in' ? 'slott' : null); return F.Space.cur === 'in' ? 'slott' : null; }
function visFloor() {
  if (bldReal()) return F.Bld.visF != null ? F.Bld.visF : (F.Bld.f != null ? F.Bld.f : null);
  return F.Castle && F.Castle.floor != null ? F.Castle.floor : null;
}
Act.curBld = curBld; Act.visFloor = visFloor;
// plan id from an inScene x (the origins never overlap)
function planOfX(x) {
  if (x < -200) return 'tarn';
  if (x >= 350) { const k = Math.floor((x - 400) / 100) + 1, r = F.REALMS && F.REALMS[k - 1]; return r ? 'rk_' + r.id : 'slott'; }
  return 'slott';
}
Act.planOfX = planOfX;
// normalised room record {key, f, x0, x1, z0, z1, spawn:{x,z}, bld, num} from either engine
function roomInfo(planId, key) {
  planId = planId || 'slott';
  if (key == null) return null;
  if (bldReal()) {
    let r = null; try { r = F.Bld.room(planId, key); } catch (e) { r = null; }
    if (r) {
      const k = r.key || r.id || key, b = r.bounds || r;
      const f = r.f != null ? r.f : (r.floor != null ? r.floor : 0);
      let x0 = b.x0, x1 = b.x1, z0 = b.z0, z1 = b.z1;
      if (x0 == null) { let w = null; try { w = F.Bld.toWorld(planId, k, 0, 0); } catch (e) { w = null; } if (w) { x0 = w.x; z0 = w.z; } }
      if (x0 == null) return null;
      if (x1 == null) x1 = x0 + 14; if (z0 == null) z0 = 0; if (z1 == null) z1 = z0 + 10;
      const sp = r.spawn && r.spawn.x != null ? r.spawn : { x: x0 + 7, z: z0 + 8.4 };
      return { key: k, f, x0, x1, z0, z1, spawn: sp, bld: planId, num: r.num, raw: r };
    }
    if (planId !== 'slott') return null;
  }
  let r = null;
  if (F.Castle && F.Castle.room) { try { r = F.Castle.room(key); } catch (e) { r = null; } }
  if (!r) {
    const rooms = (F.Castle && F.Castle.rooms) || {};
    for (const id in rooms) { const x = rooms[id]; if (x && (x.num === key || id === key || (x.name && String(x.name).toLowerCase() === String(key).toLowerCase()))) { r = x; break; } }
  }
  if (!r) return null;
  const b = r.bounds || null;
  const sp = r.spawn || (b ? { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 } : null);
  if (!sp) return null;
  return { key: r.id || r.key, f: r.floor != null ? r.floor : (r.f != null ? r.f : (b && b.y != null ? Math.round(b.y / FLOOR_H) : 0)), x0: b ? b.x0 : sp.x - 7, x1: b ? b.x1 : sp.x + 7,
    z0: b ? b.z0 : 0, z1: b ? b.z1 : 10, spawn: sp, bld: planOfX(sp.x), num: r.num, raw: r };
}
Act.roomInfo = roomInfo;
// which building / room / floor an indoor point belongs to
function locate(x, z, room, o) {
  o = o || {};
  const bld = o.bld || planOfX(x);
  let ri = room != null ? roomInfo(bld, room) : null;
  if (!ri && bldReal() && F.Bld.roomAt) {
    let r = null; try { r = F.Bld.roomAt(x, z, o.f != null ? o.f : undefined); } catch (e) { r = null; }
    if (r) ri = { key: r.key || r.id, f: r.f != null ? r.f : (o.f != null ? o.f : 0) };
  }
  if (!ri && !bldReal() && F.Castle && F.Castle.roomAt) { try { const r = F.Castle.roomAt(x); if (r) ri = { key: r.id, f: r.floor || 0 }; } catch (e) { ri = null; } }
  return { room: ri ? ri.key : (room != null ? room : null), bld, f: o.f != null ? o.f : (ri && ri.f != null ? ri.f : 0) };
}
Act.locate = locate;
Act.placeAt = (a, p) => { if (a && p) a.place(p.space || 'out', p.x, p.z, p.room, p); return a; };
Act.roomPos = function (key, planId) {
  planId = planId || 'slott';
  const r = roomInfo(planId, key);
  if (!r) return null;
  if (bldReal() && F.Bld.toWorld) {
    let w = null; try { w = F.Bld.toWorld(planId, r.key, 8.5, 7.2); } catch (e) { w = null; }
    if (w && w.x != null) return { space: 'in', x: w.x, z: w.z, room: r.key, bld: planId, f: w.f != null ? w.f : r.f };
  }
  return { space: 'in', x: r.spawn.x + 1.5, z: r.spawn.z - 1.2, room: r.key, bld: r.bld || planId, f: r.f };
};
const roomOf = id => (id && F.Castle && F.Castle.rooms && F.Castle.rooms[id]) || null;
Act.roomOf = roomOf;
Act.parkPos = function (name) {
  let p = null;
  try {
    const P = F.Park || {};
    const zn = ZONE_ALIAS[name] || name;
    const s = (P.spots && P.spots[name]) || (P.zones && (P.zones[zn] || P.zones[name])) || (P.spot && P.spot(name));
    if (s) p = { x: s.x != null ? s.x : s[0], z: s.z != null ? s.z : s[1] };
  } catch (e) { p = null; }
  if (!p) { const f = PARK_FALLBACK[name] || PARK_FALLBACK.slottsplassen; p = { x: f[0], z: f[1] }; }
  return Object.assign({ space: 'out' }, freeSpot(p.x, p.z, 'out'));
};
function freeSpot(x, z, space) {
  const imp = F.Space.impl[space || 'out'];
  for (let r = 0; r < 12; r += 1.5) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    try { if (!imp.blocked(px, pz, 0.45)) return { x: px, z: pz }; } catch (e) { return { x, z }; }
    if (r === 0) break;
  }
  return { x, z };
}
Act.freeSpot = freeSpot;
function npcSpot(planId, room, i) {
  if (bldReal() && F.Bld.spot) { const s = F.Bld.spot(planId, room, i); if (s && s.x != null) return s; if (planId !== 'slott') return null; }
  return F.Castle && F.Castle.npcSpot ? F.Castle.npcSpot(room, i) : null;
}
function postPos(post, idx) {
  let p = null;
  if (post.realm) return F.Royals && F.Royals.postPos ? F.Royals.postPos(post, idx) : null;
  if (post.room != null) p = Act.roomPos(post.room, post.bld);
  // indoors: each actor gets its own stand spot in the room (the castle's npcSpots skip spots other actors stand on)
  if (p && p.space === 'in') {
    try {
      for (let k = 0; k < 4; k++) {
        const s = npcSpot(p.bld || 'slott', p.room, (idx || 0) + k);
        if (s && Math.hypot(s.x - (p.x - 1.5), s.z - (p.z + 1.2)) >= 1.5) return { space: 'in', x: s.x, z: s.z, room: p.room, bld: p.bld, f: s.f != null ? s.f : p.f };
      }
    } catch (e) { /* fall back to the room spot */ }
  }
  if (!p && post.park) p = Act.parkPos(post.park);
  if (!p && post.room != null) p = Act.parkPos('slottsplassen');
  if (p) { const j = (idx || 0) * 1.3; p.x += Math.sin(j * 2.1) * j * 0.5; p.z += Math.cos(j * 2.1) * j * 0.3; }
  return p;
}
Act.postPos = postPos;

/* ---------------------------------------------------------- placing the cast + simple day schedules */
const ORDER = Object.keys(CAST);
Act.placeCast = function () {
  ORDER.forEach((id, i) => {
    const c = CAST[id];
    const post = (c.posts || [{ park: 'slottsplassen' }])[c.posts.length > 1 ? 1 : 0];
    const p = postPos(post, i % 3) || Act.parkPos('slottsplassen');
    const a = Act.all[id] || Act.spawn(id, { home: p });
    a.place(p.space, p.x, p.z, p.room, p);
    a.postI = c.posts.length > 1 ? 1 : 0;
    a.nextMove = 60 * (3 + (i % 4)) + i * 7;
  });
};
F.on('tick', (dt) => {
  if (!F.booted || F.flags.test) return;   // tests drive positions themselves
  for (const a of Act.list) {
    if (!a.posts || a.posts.length < 2 || a.busy || a.owner || a.temp || a.royal) continue;   // royals: F.Royals schedule
    if (a.wish && (a.wish.kind === 'quest' || a.wish.kind === 'stall')) continue;
    a.nextMove -= dt;
    if (a.nextMove > 0) continue;
    if (a.visible() && Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) < 12) { a.nextMove = 30; continue; }
    a.postI = (a.postI + 1) % a.posts.length; if (a.postI === 0 && a.posts.length > 2) a.postI = 1;
    const p = postPos(a.posts[a.postI], ORDER.indexOf(a.id) % 3);
    a.nextMove = 200 + Math.random() * 160;
    if (!p) continue;
    if (p.space !== a.space || p.room !== a.room || (p.bld || null) !== (a.bld || null) && p.space === 'in') a.place(p.space, p.x, p.z, p.room, p); else a.walkTo(p.x, p.z);
  }
});

/* ---------------------------------------------------------- bought things get used: rides, toys, music (when she is near) */
let funAcc = 0;
F.on('tick', dt => {
  funAcc += dt; if (funAcc < 28) return; funAcc = 0;
  if (!F.booted || F.flags.test || F.Task.current || F.UI.isOpen() || !F.Eco || !F.Eco.npc) return;
  const P = F.Player.pos;
  const cand = U.shuffle(F.rand, Act.near(P.x, P.z, 22).filter(a => a.kind === 'person' && !a.busy && !a.temp && !a.path && !a.owner));
  for (const a of cand) {
    const own = (F.Eco.npc(a.id).owned || []).map(id => F.CAT.byId(id)).filter(c => c && (c.ride || c.kind === 'toy' || c.use === 'music') && c.kind !== 'pet');
    if (!own.length) continue;
    const c = U.pick(F.rand, own);
    a.busy = true;
    (c.ride && a.space === 'out' ? a.ride(c.id) : a.react(c.use === 'music' ? 'music' : 'play', c.id)).catch(() => {}).then(() => { a.busy = false; });
    break;
  }
});

/* ---------------------------------------------------------- life feel: royals and staff busy with their own things
   (only while idle: no wish to show, not walking, not talking to her). The king naps on his throne, the queen and Tor water
   the flowers, Kari stirs the pot, Mia plays ball (and Pus hops around her), Rolf knits, Siv reads, Per sorts letters.
   A short ambient line only when the fairy is close and nothing else is speaking. Pose = part rotations applied after the
   People idle animation each frame; props are real models held in the hand. */
const ACTS = {
  konge: { kind: 'nap', near: 'c_trone', r: 12 },
  dronning: { kind: 'water', prop: ['gift_vannkanne', 'kanne'], near: /rosebed|blomst|p_bed|rose/, r: 14 },
  tor: { kind: 'water', prop: ['gift_vannkanne', 'kanne'], near: /rosebed|blomst|p_bed|rose|drivhus/, r: 14 },
  kokk: { kind: 'stir', prop: ['skje', 'sleiv'], near: /^gryte$|kjele/, r: 8 },
  mia: { kind: 'play', prop: ['ball'] },
  rolf: { kind: 'knit' },
  siv: { kind: 'read', prop: ['bok'] },
  per: { kind: 'sort', prop: ['brev', 'life_konvolutt'] },
  r_sno_k: { kind: 'nap', near: 'c_trone', r: 12 },   // WP7: Kong Snorre snores on his throne (in his keep's throne room)
  // the other kingdom kings sit awake on their thrones ('throne': F.Royals adds r_<realm>_k entries when a family spawns)
};
Act.ACTS = ACTS;
let ambT = -60;
function findNear(a, test, r) {
  let best = null, bd = r || 10;
  for (const t of F.Things.list) {
    if (t.space !== a.space || t.type === 'life_actor') continue;
    if (typeof test === 'string' ? t.type !== test : !test.test(t.type)) continue;
    const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function actOk(a) {
  if (!a.here() || a.busy || a.owner || a.temp || a.kind !== 'person' || F.Task.current) return false;
  if (a.wish && a.wish.kind !== 'item' && !(ACTS[a.id] && ACTS[a.id].kind === 'throne')) return false;   // a king keeps his throne with a quest bubble
  if (Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) > 32) return false;
  return true;
}
function startAct(a) {
  const A = ACTS[a.id]; if (!A) return;
  const tgt = A.near ? findNear(a, A.near, A.r) : null;
  if (A.near && !tgt) return;                                   // nothing to do here (the king has no throne in the park)
  const act = a.act = { kind: A.kind, t0: F.T.now, tgt, nextFx: 0 };
  if (A.prop) { const mid = A.prop.find(m => F.VOX.has(m)); if (mid) { act.prop = a.holdItem(mid, A.kind === 'stir' ? 0.32 : A.kind === 'play' ? 0.26 : 0.34); act.prop0 = act.prop.position.clone(); } }
  if (A.kind === 'nap' || A.kind === 'throne') {
    // walk to the throne, then sit on the seat (c_trone meta.seat = [0, 0.95, 0.15] in metres)
    const T = tgt, ry = T.ry || T.obj.rotation.y || 0, fx = T.x + Math.sin(ry) * 1.3, fz = T.z + Math.cos(ry) * 1.3;
    act.walking = true;
    a.walkTo(fx, fz).then(okk => {
      if (a.act !== act) return;
      act.walking = false;
      if (!okk) { stopAct(a, true); return; }
      const meta = (F.VOX.defs && F.VOX.defs.c_trone && F.VOX.defs.c_trone.meta) || {}, seat = meta.seat || [0, 0.95, 0.15];
      const sc = T.obj.scale.y || 1, sy = T.obj.position.y + seat[1] * sc;
      act.back = { x: fx, z: fz };
      a.x = a.th.x = T.x + Math.sin(ry) * seat[2] * sc; a.z = a.th.z = T.z + Math.cos(ry) * seat[2] * sc; a.heading = ry;
      const hip = 7 / 16 * (a.model.scale.y || 1);
      a.lift = Math.max(0, sy - a.groundY(a.x, a.z) - hip); act.sit = true;
    });
  } else if (tgt && (A.kind === 'stir' || A.kind === 'water')) {
    // go and stand beside it (seen from the side by the camera), then face it
    const ry = tgt.ry || (tgt.obj && tgt.obj.rotation.y) || 0, side = A.kind === 'stir' ? 0.95 : 1.5;
    let px = tgt.x + Math.cos(ry) * side + Math.sin(ry) * 0.45, pz = tgt.z - Math.sin(ry) * side + Math.cos(ry) * 0.45;
    if (A.kind === 'water') { const ang = Math.atan2(a.x - tgt.x, a.z - tgt.z); px = tgt.x + Math.sin(ang) * side; pz = tgt.z + Math.cos(ang) * side; }
    if (Math.hypot(px - a.x, pz - a.z) > 0.4) {
      act.walking = true;
      a.walkTo(px, pz).then(okk => { if (a.act !== act) return; act.walking = false; if (!okk) { stopAct(a, true); return; } a.face(tgt.x, tgt.z); });
    } else a.face(tgt.x, tgt.z);
  } else if (tgt) a.face(tgt.x, tgt.z);
}
function stopAct(a, noRestore) {
  const act = a.act; if (!act) return;
  a.act = null; a._actStop = F.T.now;
  if (act.prop && act.prop.parent) act.prop.parent.remove(act.prop);
  if (act.sit) { a.lift = 0; if (act.back && !noRestore) { a._actPlace = true; try { a.place(a.space, act.back.x, act.back.z); } finally { a._actPlace = false; } } }
}
Act.startAct = startAct; Act.stopAct = stopAct;
const tmpV = V3();
function actPose(a, t, dt, moving) {
  const act = a.act, P = a.parts;
  if (!P || moving || act.walking) return;
  const S = Math.sin;
  switch (act.kind) {
    case 'nap':
      if (!act.sit) return;
      if (P.legL) { P.legL.rotation.x = -1.45; P.legR.rotation.x = -1.45; }
      if (P.armL) { P.armL.rotation.x = -0.45; P.armR.rotation.x = -0.45; P.armL.rotation.z = 0.15; P.armR.rotation.z = -0.15; }
      if (P.head) P.head.rotation.x = (act.awake > F.T.now ? -0.05 : 0.42) + S(t * 1.2) * 0.04;
      if (act.nextFx < F.T.now && act.awake < F.T.now) { act.nextFx = F.T.now + 2.6; tmpV.copy(a.headPos()); tmpV.y += 0.3; F.FX.float('Zzz', tmpV, 'life-zzz'); }
      break;
    case 'throne':   // a kingdom king sits awake on his throne: legs only, so his quirk idle and waves still play
      if (!act.sit) return;
      if (P.legL) { P.legL.rotation.x = -1.45; P.legR.rotation.x = -1.45; }
      break;
    case 'water':
      if (P.armR) { P.armR.rotation.x = -1.15 + S(t * 1.4) * 0.12; P.armR.rotation.z = -0.1; }
      if (act.prop) act.prop.rotation.x = 0.55 + S(t * 1.4) * 0.15;
      if (P.head) P.head.rotation.x = 0.22;
      if (act.nextFx < F.T.now) { act.nextFx = F.T.now + 0.3; const h = act.prop || a.anchors.hand; if (h) { h.getWorldPosition(tmpV); tmpV.x += S(a.heading) * 0.25; tmpV.z += Math.cos(a.heading) * 0.25; F.FX.burst(tmpV, { kind: 'water', n: 3, speed: 0.3, up: 0.2, life: 0.55, size: 0.045 }); } }
      if (act.tgt && !(act.nextSp > F.T.now)) { act.nextSp = F.T.now + 3.5; F.FX.sparkle(V3(act.tgt.x, (act.tgt.y || 0) + 0.6, act.tgt.z), 0xfff2a8); }
      break;
    case 'stir':
      if (P.armR) { P.armR.rotation.x = -1.25 + S(t * 4) * 0.12; P.armR.rotation.z = Math.cos(t * 4) * 0.3; }
      if (P.head) P.head.rotation.x = 0.28;
      if (act.nextFx < F.T.now && act.tgt) { act.nextFx = F.T.now + 0.7; F.FX.burst(V3(act.tgt.x, (act.tgt.obj ? act.tgt.obj.position.y : 0) + 1.25, act.tgt.z), { kind: 'flour', n: 2, speed: 0.15, up: 0.7, gravity: -0.4, life: 1.6, size: 0.1 }); }
      break;
    case 'play': {
      const k = (t * 1.6) % 1, up = S(k * Math.PI);
      if (P.armR) { P.armR.rotation.x = -1.4 - up * 0.5; P.armL.rotation.x = -1.4 - up * 0.5; P.armL.rotation.z = 0.2; P.armR.rotation.z = -0.2; }
      if (P.head) P.head.rotation.x = -0.25 * up;
      if (act.prop && act.prop0) act.prop.position.set(act.prop0.x, act.prop0.y - up * 0.9, act.prop0.z);
      // Pus (or her own pet) hops around her
      const pet = a.pet || ((Act.all.pus && Act.all.pus.space === a.space && Act.all.pus.room === a.room) ? Act.all.pus : null);
      if (pet && !pet.busy && (!act.pusT || act.pusT < F.T.now)) { act.pusT = F.T.now + 2.8; const ang = t * 0.9; pet.walkTo(a.x + S(ang) * 1.4, a.z + Math.cos(ang) * 1.4); pet.happyT = F.T.now + 2; if (pet.gesture) pet.gesture('hop', 1); }
      break;
    }
    case 'knit':
      if (P.armL) { P.armL.rotation.x = -1.05 + S(t * 7) * 0.09; P.armR.rotation.x = -1.05 - S(t * 7) * 0.09; P.armL.rotation.z = -0.35; P.armR.rotation.z = 0.35; }
      if (P.head) P.head.rotation.x = 0.3;
      break;
    case 'read':
      if (P.armL) { P.armL.rotation.x = -1.1; P.armR.rotation.x = -1.1; P.armL.rotation.z = -0.3; P.armR.rotation.z = 0.3; }
      if (P.head) P.head.rotation.x = 0.32 + S(t * 0.7) * 0.03;
      break;
    case 'sort':
      if (P.armR) { P.armR.rotation.x = -1.1 + S(t * 3) * 0.25; P.armL.rotation.x = -0.9; P.armL.rotation.z = -0.3; }
      if (P.head) P.head.rotation.x = 0.25;
      break;
  }
}
let actAcc = 0;
F.on('tick', dt => {
  actAcc += dt; if (actAcc < 0.8) return; actAcc = 0;
  if (!F.booted || (F.flags.test && !Act.actsInTest)) return;   // other packages' tests place the cast themselves
  for (const id in ACTS) {
    const a = Act.all[id]; if (!a) continue;
    const ok = actOk(a) && (!a.path || (a.act && a.act.walking));
    if (!ok && a.act) stopAct(a);
    else if (ok && !a.act && !a.path && F.T.now - (a._actStop || 0) > 4) startAct(a);
  }
  // one short ambient line: she is close, nothing else is speaking, not too often
  if (F.T.now - ambT < 40 || F.Task.current || F.UI.isOpen() || (F.Speech.busy && F.Speech.busy()) || (F.Shell && F.Shell.screen) || (F.Onboard && F.Onboard.active)) return;
  // v5 WP-W (logic #24 / §3-I): no ambient chatter inside someone's chain, quest step, encounter, ceremony or royal greeting
  if ((F.Quest && F.Quest.stepRunning && F.Quest.stepRunning()) || (F.Befriend && F.Befriend.busy) || (F.Throne && F.Throne.busy) || (F.RQuest && F.RQuest.busy) ||
    (F.Royals && F.Royals.greeting && Object.keys(F.Royals.greeting).length) || F.T.now - (Act.lastTaskEnd || -1e9) < 6) return;
  const P = F.Player.pos;
  const cand = Act.list.filter(a => a.act && !a.act.walking && a.visible() && Math.hypot(a.x - P.x, a.z - P.z) < 6.5 && F.T.now - (a._ambT || -999) > 100);
  if (!cand.length) return;
  const a = cand[0]; ambT = F.T.now; a._ambT = F.T.now;
  if (a.act.kind === 'nap') a.act.awake = F.T.now + 3;
  if (F.TPL.has && F.TPL.has('life_amb_' + a.id)) a.say('life_amb_' + a.id, null, { still: true });
});
F.on('spaceChanged', () => { for (const id in ACTS) { const a = Act.all[id]; if (a && a.act) stopAct(a); } });

/* ---------------------------------------------------------- villagers at WORLD's wish spots */
const JOBS = () => (F.People && F.People.JOBS ? F.People.JOBS.map(j => j.id) : Object.keys(JOB_FORMATS));
Act.FEMALE = FEMALE;
F.on('taskEnd', () => { Act.lastTaskEnd = F.T.now; });
Act.villagerFor = function (spot) {
  const seed = F.U.hashStr(String(spot.id));
  const r = F.U.rng(seed);
  const name = spot.name && F.SETS.NAMES.includes(spot.name) ? spot.name : F.SETS.NAMES[seed % F.SETS.NAMES.length];
  // builders at WP3's building sites wear the 'bygger' look (hard hat, hammer) once m_people.js has it
  let job = spot.builder && F.People && F.People.SITE_JOBS && F.People.SITE_JOBS.some(j => j.id === 'bygger') ? 'bygger' : (spot.job || U.pick(r, JOBS()));
  const kid = spot.kid != null ? !!spot.kid : r() < 0.18;
  const female = FEMALE.has(name);
  // v5 WP-W (logic #5 / §3-E): ONE gender source – the name → voice + look (+ gendered jobs follow the name)
  if (job === 'bestemor' && !female) job = 'bestefar'; else if (job === 'bestefar' && female) job = 'bestemor';
  let look = F.People ? F.People.villager(job, seed, { female, kid }) : null;
  if (look && kid) look = Object.assign(look, { age: 'barn', hat: r() < 0.5 ? null : look.hat, acc: [] });
  const voice = kid ? 'barn' : female ? 'vk' : 'vm';
  return { name, job, kid, female, voice, look };
};
Act.spawnVillager = function (spot) {
  if (!spot || spot.id == null) return null;
  const id = 'v_' + spot.id;
  if (Act.all[id]) return Act.all[id];
  const v = Act.villagerFor(spot);
  const a = Act.spawn(id, { name: v.name, role: v.kid ? 'barn' : 'by', job: v.job, voice: v.voice, look: v.look, home: { space: 'out', x: spot.x, z: spot.z },
    repertoire: JOB_FORMATS[v.job] || ['F06', 'F23', 'F33'], ry: spot.ry || 0, speed: v.kid ? 2.6 : 2.0 });
  a.spot = spot; a.village = spot.villageId || spot.regionId || null;
  if (spot.wish !== false && F.Quest && F.Quest.smallWish) F.Quest.smallWish(a);
  return a;
};
F.on('wishSpot', spot => { try { Act.spawnVillager(spot); } catch (e) { console.error('[Act] wishSpot', e); } });
function scanSpots() {
  const ws = F.W && F.W.wishSpots;
  if (!ws) return;
  let arr = [];
  if (typeof ws === 'function') { if (F.W.chunks) F.W.chunks.forEach((ch, key) => { const [cx, cz] = String(key).split(',').map(Number); try { arr = arr.concat(ws(cx, cz) || []); } catch (e) {} }); }
  else arr = ws instanceof Map ? [...ws.values()] : Array.isArray(ws) ? ws : Object.values(ws);
  for (const s of arr) if (s && s.id != null && !Act.all['v_' + s.id]) Act.spawnVillager(s);
}
F.on('chunkUnloaded', (ch) => {
  const key = ch && (ch.key || (ch.cx + ',' + ch.cz));
  for (const a of Act.list.slice()) {
    if (!a.spot) continue;
    const ck = a.spot.chunk || (Math.floor(a.spot.x / 32) + ',' + Math.floor(a.spot.z / 32));
    if (ck === key && !a.busy) Act.remove(a);
  }
});
F.on('ready', () => { try { Act.placeCast(); scanSpots(); } catch (e) { console.error('[Act] placeCast', e); } });
// morning: everybody to breakfast (post 0); bedtime: royals to their bedrooms
F.on('dayStart', () => { if (!F.booted) return; for (const id of ORDER) { const a = Act.all[id], c = CAST[id]; if (!a || a.busy || !c.posts) continue; const p = postPos(c.posts[0], ORDER.indexOf(id) % 3); if (p) a.place(p.space, p.x, p.z, p.room, p); a.postI = 0; a.nextMove = 240 + ORDER.indexOf(id) * 9; } });
F.on('bedtime', () => {
  const BED = { konge: 'soverom', dronning: 'soverom', mia: 'mia', ole: 'mia', pus: 'mia' };
  for (const id in BED) { const a = Act.all[id]; if (!a) continue; const p = Act.roomPos(BED[id]); if (p) { a.place('in', p.x + (id === 'dronning' || id === 'ole' ? 1.6 : 0), p.z, p.room, p); a.clearWish(); a.gesture('yawn', 2); } }
});
// Mia's piggy bank stands in her room (room 18): her coins as a ten-frame on top, the number on a plaque
F.Things.def('life_miagris', {
  radius: 0.35, solid: true, reach: 1.8, name: 'sparegrisen',
  build() { const g = new THREE.Group(); const m = F.VOX.has('life_sparegris') ? F.VOX.make('life_sparegris') : new THREE.Group(); m.scale.setScalar(0.8); g.add(m); return g; },
  init(th) { const a = new THREE.Object3D(); a.position.set(0, 0.8, 0); th.obj.add(a); th.plaque = F.UI.label(a, '0', { kind: 'num', space: 'in', size: 26, maxDist: 16 }); th.upd = () => { const st = F.Eco && F.Eco.npc ? F.Eco.npc('mia') : null; th.plaque.set(String(st ? st.coins : 0)); }; th.upd(); },
  dispose(th) { if (th.plaque) th.plaque.remove(); },
  // the plaque hides while a task runs (it would float over the task's choices in her room)
  tick(th, dt) {
    const on = !F.Task.current; if (th._pOn !== on && th.plaque && th.plaque.el) { th._pOn = on; th.plaque.el.style.visibility = on ? '' : 'hidden'; }
    // v5 WP-W (logic #22): the allowance and market day emit no event – the plaque re-reads Mia's purse every 2 s
    if ((th._updT = (th._updT || 0) + (dt || 0)) > 2 && th.upd) { th._updT = 0; th.upd(); }
  },
  async press(th) {
    th.upd(); F.FX.pop(th.obj); F.sfx.coins(6);
    const n = (F.Eco.npc('mia') || {}).coins || 0;
    if (n === 1) await F.SAY('kp_gris1'); else if (n >= 2 && n <= 20) await F.SAY('kp_gris', { n }); else if (n > 20 && F.TPL.has('kp_grismange')) await F.SAY('kp_grismange'); else F.sfx.chime();
  },
});
F.on('npcCoins', id => { if (id !== 'mia') return; const t = F.Things.byId('life_miagris'); if (t && t.upd) t.upd(); });
F.on('npcBought', id => { if (id !== 'mia') return; const t = F.Things.byId('life_miagris'); if (t && t.upd) t.upd(); });
F.on('ready', () => F.T.timeout(() => {
  const p = Act.roomPos('mia'); if (!p || F.Things.byId('life_miagris')) return;
  if (bldReal() && F.Bld.spawnIn) { try { const r = roomInfo('slott', 'mia'); if (r && F.Bld.spawnIn('slott', r.key, 'life_miagris', 4, 4.6, { id: 'life_miagris' })) return; } catch (e) { console.warn('[Act] miagris', e); } }
  F.Things.spawn('life_miagris', p.x - 4.5, p.z - 2.6, { id: 'life_miagris', space: 'in' });
}, 600));
F.on('castleReady', () => { try { Act.placeCast(); } catch (e) { console.error(e); } });
})();
