/* Feslottet – no-op defaults for cross-module APIs (DESIGN §11.3). Real modules REPLACE these objects
   (F.Eco = {...}) or their functions. Lets every package boot and test before the others land. Do not put logic here. */
(function () {
'use strict';
const F = window.F;
const P = v => Promise.resolve(v);
F.WORDS = F.WORDS || { list: [], get: () => null, castable: () => [] };
F.CAT = F.CAT || [];
F.LEARN = F.LEARN || {
  load() {}, next: () => null, report: () => ({ coins: 0, events: [] }), summary: () => ({ strands: {} }), debt: () => ({}),
};
F.BANKS = F.BANKS || { gen: () => ({}) };
F.Task = F.Task || { defs: {}, def(id, spec) { this.defs[id] = spec; }, run: () => P({ outcome: 'A', tries: 1, ms: 0 }), current: null, offer: () => P(null) };
F.Wand = F.Wand || { open: () => P(null), cast: () => P([]), resolve: () => ({ kind: 'unknown' }), swap: () => P() };
F.Act = F.Act || { all: {}, spawn: () => null, byId: () => null, near: () => [] };
F.Eco = F.Eco || { coins: () => (F.save.coins || 0), add(n) { F.save.coins = (F.save.coins || 0) + n; F.store(); F.emit('coins', F.save.coins, n); }, spend: () => false,
  buy: () => P(false), owned: () => 0, place() {}, giveCoins() {}, npcBuy: () => P(false), npc: () => null };
F.Stall = F.Stall || { stock() {}, open() {}, queue: [] };
F.Quest = F.Quest || { offer: () => null, start() {}, canOfferTask: () => true, log() {}, headlines: () => [] };
F.Castle = F.Castle || { rooms: {}, enter() {}, exit() {}, overview() {}, goRoomByNumber: () => P(), towers: {}, floorAt: () => 0 };
F.Park = F.Park || {};
F.Gen = F.Gen || { mapData: () => [] };
F.BEH = F.BEH || { defs: {}, add(name, fn) { this.defs[name] = fn; }, run: () => P() };
F.Fairy = F.Fairy || { kinds: ['krystall', 'blomst', 'boble', 'stjerne'], buildAvatar: null, style: k => ({ krystall: 'crystal', blomst: 'flower', boble: 'bubble', stjerne: 'star' }[k] || null) };
F.Prog = F.Prog || { addFloor() {}, openParent() {} };
F.HUD = F.HUD || { setCoins(n) { F.UI.setCoins(n); }, showTray() {} };
})();

/* ---- DESIGN2 (open-world update) stubs: owners REPLACE these objects (guard optional calls anyway) ---- */
(function () {
'use strict';
const F = window.F, P = v => Promise.resolve(v);
F.Pickers = F.Pickers || { lift: null, album: null };            // F01 answer widgets by ctx.place (WP1 sets 'lift')
F.Bld = F.Bld || { plans: {}, cur: null, f: 0, visF: 0,           // WP1 building engine
  register(plan) { this.plans[plan.id] = plan; return plan; }, registerSimple(plan) { return this.register(plan); }, plan(id) { return this.plans[id] || null; },
  enter: () => P(false), leave: () => P(false), room: () => null, roomAt: () => null, toWorld: () => null, spot: () => null,
  spawnIn: () => null, furnish: () => null, exitPos: () => null, pathTo: () => [], openMap() {}, closeMap() {}, restore: () => P(false), pos: () => null };
F.Tower = F.Tower || { door: { x: 80, z: -87.6 }, outside: { x: 80, z: -85.8 }, wake: () => P(), bedSpot: () => null, miaSpot: () => null, mailbox: () => null, firstExitLook: () => P() };   // WP2
F.REALMS = F.REALMS || [];                                          // WP7 data (js/data/realms.js)
F.Realm = F.Realm || { list: () => [], get: () => null, siteAt: () => null, at: () => null, state: () => null, canAppear: () => false, next: () => null,
  appear: () => P(), ensure: () => P(), gate: () => null, door: () => null, spot: () => null };   // WP3
F.FAUNA = F.FAUNA || { species: [], pages: [] };                    // WP4 data (js/data/fauna.js)
F.Fauna = F.Fauna || { near: () => [], pick: () => null, focus() {}, release() {}, countIn: () => 0, setCompanion() {}, companion: () => null, today: () => null, eligible: () => false };
F.Weather = F.Weather || { at: () => 'sol', phase: () => 'dag', here: () => 'sol' };
F.Beasts = F.Beasts || { make: id => (F.VOX.has(id) ? F.VOX.make(id) : new THREE.Group()), thumb: (id, px) => (F.VOX.has(id) ? F.Thumb.url(id, {}, { size: px || 128 }) : ''), inst: () => null, has: id => F.VOX.has(id) };   // WP5
F.Glitter = F.Glitter || { apply() {} };
F.Befriend = F.Befriend || { start: () => P({ won: false, H: 0, p: 0, outcomes: [] }), chance: () => ({ H: 0, p: 0 }), busy: false };   // WP6
F.Album = F.Album || { open() {}, close() {}, has: () => false, friends: () => [], count: () => 0, pageOf: () => null };
F.Royals = F.Royals || { spawn() {}, despawn() {}, actor: () => null, all: () => [], press: () => P(), greet: () => P() };   // WP7
F.RQuest = F.RQuest || { offer: () => null, stars: () => 0, friend: () => false, status: () => null };   // WP8
F.Towns = F.Towns || { shopsFor: () => ['bakeriet', 'lekebutikken'] };   // WP9
F.Travel = F.Travel || { toRealm: () => P(false), toHome: () => P(false), toCastle: () => P(false), canFast: () => false };   // WP10
if (F.Eco && !F.Eco.gear) F.Eco.gear = () => false;
})();
