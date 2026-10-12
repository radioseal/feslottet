/* Feslottet – LIFE: her stall «Feens bod» (DESIGN §8.5.4). Owner: LIFE.
   F.Stall.stock(good, n)      add goods (≤20 of each) – called automatically for wand casts of stall goods ('cast' event);
                               OBJ may call it for collected eggs / apples / crystals / flowers.
   F.Stall.open()              customers start coming (also when she taps the stall)
   F.Stall.queue               customers waiting (≤3)
   F.Stall.thing               the stall thing (CASTLE may spawn type 'life_bod' itself, or call F.Stall.attach(thing))
   F.Stall.serve(customer)     the customer's order becomes one task (F09 count out / F23 read the order / F16 price tag / F06 count the payment)
   Shelves show the stock as real models with number plaques. There is no inventory screen.
   Economy §2 / §1 (12.10, honest coins + money talk): a customer pays ONLY for a first-try right answer (A) – on any other outcome the
   customer says «Jeg kommer tilbake senere!» (st_senere), buys nothing and the goods stay on the shelf; no plain sale without a task
   (no task fits → no customer comes); the price-tag order (F16) is goods at one coin each, so the price written IS what the goods cost
   (≤ 20, stock permitting); at most 6 paying customers a play day outside market day (F.Eco.workCap when the café shares the cap);
   wand casts no longer stock the stall (magic is not for sale) – eggs, crystals and the market-day restock do; «Hei! Hva selger du i
   dag?» only for the first customer of a visit; «Takk! Her er myntene.» only when coins come.
   Stall.paidToday() -> n, Stall.CAP = 6, Stall.lastSale = {good, format, sold, paid, outcome, stock0, stock1}. */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const FORMATS = ['F09', 'F23', 'F16', 'F06'];
const S = () => { const s = F.save.stall = F.save.stall || {}; s.stock = s.stock || {}; s.sold = s.sold || 0; return s; };
const goodModel = g => [g, g === 'blomst' ? 'rose' : null, 'life_gaveeske'].find(m => m && F.VOX.has(m));

const Stall = F.Stall = {
  queue: [], thing: null, active: false, nextAt: 0,
  stock(good, n) {
    if (!F.GOODS[good]) return 0;
    const s = S(); s.stock[good] = Math.min(20, (s.stock[good] || 0) + (n || 1)); s.soldOutSaid = false; F.store();
    showStock();
    return s.stock[good];
  },
  stockOf: g => S().stock[g] || 0,
  attach(th) { Stall.thing = th; th.stall = true; showStock(); return th; },
  open() {
    Stall.active = true;
    if (!Object.values(S().stock).some(v => v > 0)) { F.SAY('st_tom'); return false; }
    F.SAY('st_open');
    Stall.nextAt = Math.min(Stall.nextAt, F.T.now + 2);
    return true;
  },
  serve,
};

/* ---------------------------------------------------------- the stall thing */
F.Things.def('life_bod', {
  radius: 1.3, solid: true, reach: 2.4, name: 'Feens bod',
  build() {
    const id = ['b_feensbod', 'stall', 'life_kiosk'].find(m => F.VOX.has(m));
    const g = new THREE.Group(); const m = F.VOX.make(id, id === 'stall' ? { awning: 'pink' } : { c: 'pink' });
    if (id === 'life_kiosk') m.scale.setScalar(1.45);
    g.add(m); return g;
  },
  init(th) { Stall.attach(th); },
  press(th) { F.FX.pop(th.obj); F.sfx.bell(1046); Stall.open(); },
});
// display: a row of little crates in front of the stall (world x = across the screen at the default view),
// each with real models of the good and its number plaque – numbers never overlap
let shelf = null, plaques = [];
function showStock() {
  const th = Stall.thing; if (!th || !th.obj) return;
  if (shelf) { shelf.parent && shelf.parent.remove(shelf); plaques.forEach(p => p.remove()); plaques = []; }
  shelf = new THREE.Group(); F.Space.scene(th.space).add(shelf);
  const s = S(), goods = shown();
  const fx = th.x, fz = th.z + (th.radius || 1.3) + 1.1, y0 = th.y || 0;
  shelf.position.set(fx, y0, fz);
  const crate = F.M.mat('woodLight'), crate2 = F.M.mat('wood');
  goods.forEach((g, i) => {
    const mid = goodModel(g); if (!mid) return;
    const x = (i - (goods.length - 1) / 2) * 2.5;    // wide gaps: the number plaques of neighbouring crates never touch
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.8), crate); box.position.set(x, 0.21, 0); box.castShadow = true; shelf.add(box);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.86), crate2); rim.position.set(x, 0.44, 0); shelf.add(rim);
    const n = Math.min(4, s.stock[g]);
    for (let k = 0; k < n; k++) { const m = F.Act.fitModel(mid, {}, 0.3); m.position.set(x - 0.3 + (k % 2) * 0.6 * (k < 2 ? 1 : 0.5) + (k >= 2 ? 0.15 : 0), 0.46, (k < 2 ? -0.15 : 0.18)); m.rotation.y = k * 0.7; shelf.add(m); }
    const anchor = new THREE.Object3D(); anchor.position.set(x, i % 2 ? 1.25 : 0.85, 0.3); shelf.add(anchor);   // staggered heights
    plaques.push(F.UI.label(anchor, String(s.stock[g]), { kind: 'num', space: th.space, size: 24, maxDist: 20 }));
  });
}
Stall.showStock = showStock;
// the (at most 3) goods on display: the biggest stocks. Customers only ask for what they can see.
function shown() { const st = S().stock; return Object.keys(st).filter(g => st[g] > 0).sort((a, b) => st[b] - st[a] || (a < b ? -1 : 1)).slice(0, 3); }
Stall.shown = shown;
// economy §2: magic is not for sale – a wand cast no longer stocks the stall; collected goods do (eggs, crystals, OBJ 'collect')
F.on('collect', (good, n) => Stall.stock(good, n || 1));
// the day's paying customers (economy §2: ≤ 6 outside market day; the café shares the cap through F.Eco.workCap when it exists)
Stall.CAP = 6;
const today = () => F.save.day || 1;
function payDay() { const s = S(); if (!s.pay || s.pay.day !== today()) s.pay = { day: today(), n: 0, served: 0 }; return s.pay; }
Stall.paidToday = () => payDay().n;
function capLeft() {
  try { if (F.Eco && typeof F.Eco.workCap === 'function') { const v = F.Eco.workCap('stall'); if (typeof v === 'number') return v; } } catch (e) { /* own count */ }
  return Stall.CAP - payDay().n;
}
Stall.capLeft = capLeft;

/* ---------------------------------------------------------- customers */
const QSPOT = [[0.4, 4.7], [-1.3, 5.8], [1.6, 6.6]];
function spotOf(i) { const th = Stall.thing, [dx, dz] = QSPOT[i]; return { x: th.x + dx, z: th.z + dz }; }
let custN = 0;
function spawnCustomer() {
  const th = Stall.thing; const s = S();
  const goods = shown(); if (!goods.length) return null;
  const i = Stall.queue.length; const spot = spotOf(i);
  const seed = (F.save.day || 1) * 100 + (s.sold + custN++);
  const v = F.Act.villagerFor({ id: 'kunde_' + seed });
  const ang = F.rand() * Math.PI * 2, sx = spot.x + Math.cos(ang) * 14, sz = spot.z + Math.sin(ang) * 14;
  const p = F.Act.freeSpot(sx, sz, th.space);
  const a = F.Act.spawn('kunde_' + seed, { name: v.name, role: v.kid ? 'barn' : 'by', job: 'kunde', voice: v.voice, look: v.look, home: { space: th.space, x: p.x, z: p.z }, temp: true, repertoire: FORMATS, speed: 2.4 });
  a.good = U.pick(F.rand, goods);
  Stall.queue.push(a);
  a.setWish({ kind: 'stall', model: goodModel(a.good), onPress: serve });
  a.walkTo(spot.x, spot.z, { always: true }).then(() => a.face(th.x, th.z));
  return a;
}
Stall.spawnCustomer = spawnCustomer;
// the customer's order: the engine picks among the STALL formats only (F09 count out / F23 read the order / F16 price tag /
// F06 count the payment). No npc/npcRole is passed, so the engine never adds its portable NPC formats (F33/F35 …).
// v5 WP-X (#8/#9): F23 «read the order» only once WP-R2's F23 honours params.good (the note names the good the customer buys):
// feature flag F.Task.defs.F23.honours includes 'good' – until then the stall never serves F23 (an egg customer's note read «lys»).
const f23ok = () => { const d = F.Task.defs && F.Task.defs.F23; return !!(d && Array.isArray(d.honours) && d.honours.includes('good')); };
const COUNTS = ['F09', 'F06'];          // «count out N» / «count this»: the number of goods that changes hands
function stallItem(only) {
  const fm = (only || FORMATS).filter(f => (f !== 'F23' || f23ok()) && F.Task.resolveFormat(f) && F.Task.defs[F.Task.resolveFormat(f)] && !/_demo$/.test(F.Task.resolveFormat(f)));
  if (!fm.length || !F.LEARN || !F.LEARN.next) return null;
  const last = (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null;
  let item = null;
  try { item = F.LEARN.next({ formats: fm, strands: ['T-MENGDE', 'LES', 'T-SKRIV'], place: 'stall', rng: F.rand, now: Date.now(), last }); } catch (e) { item = null; }
  if (item && fm.includes(item.format)) return item;
  // nothing at her level here: a practice item in the counting format closest to her T-MENGDE rung (scored as practice)
  try {
    const rung = F.Eco.strandRung('T-MENGDE') || 1;
    const fid = rung >= 7 && fm.includes('F09') ? 'F09' : fm.includes('F06') ? 'F06' : fm[0];
    const spec = F.Task.defs[fid], st = Object.keys(spec.strands || {})[0], [r0, r1] = spec.strands[st];
    return F.LEARN.next({ formats: [fid], force: { strand: st, rung: U.clamp(rung, r0, r1), sup: 1, format: fid, kind: 'practice' }, rng: F.rand, now: Date.now() });
  } catch (e) { return null; }
}
Stall.item = stallItem;
/* v5 WP-X (logic #8): the stall never sells what it does not have, and what changes hands is what was counted.
   - the order fits the shelf: a counting item (F09 count out N / F06 count this) needs stock ≥ N of the good – another shown good with
     enough stock is chosen, else the item is re-drawn with target = stock (≥ 10, the counting range), else a price-tag item (F16);
   - only F09's order is spoken with its number («Kan jeg få 14 egg?» = the instruction); for F06 the number would be the answer;
   - sold = the counted N (F09/F06) → paid N coins; F16 → the counter shows N goods and the tag N: N goods for N coins (economy §2);
   - «Boden er utsolgt» once, when the last good goes; a customer at an empty stall says st_utsolgt and leaves (no task).
   Stall.lastSale = {good, format, sold, paid, stock0, stock1}. */
const visit = { greeted: false };
Stall.visit = visit;
const leave = a => {
  const th = Stall.thing, qi = Stall.queue.indexOf(a); if (qi >= 0) Stall.queue.splice(qi, 1);
  Stall.queue.forEach((c, i) => { const sp = spotOf(i); c.walkTo(sp.x, sp.z, { always: true }).then(() => c.face(th.x, th.z)); });
  const ang = F.rand() * Math.PI * 2;
  F.T.timeout(() => a.walkTo(a.x + Math.cos(ang) * 16, a.z + Math.sin(ang) * 16, { always: true }).then(() => F.Act.remove(a)), 1500);
};
async function soldOut(a) {
  if (a._leaving) return; a._leaving = true;
  a.clearWish();
  // (2nd round) right after the narrator's once-ever «Boden er utsolgt. Så flink du er!» a waiting customer just leaves (one line)
  const nok = Stall._nokT != null && F.T.now - Stall._nokT < 8;
  if (!nok && !Stall.queue.some(c => c !== a && c._toldOut)) { a._toldOut = true; await a.say('st_utsolgt'); }
  leave(a);
}
Stall.soldOut = soldOut;
function fitOrder(a, item) {
  const s = S(); if (!item || !(COUNTS.includes(item.format) || item.format === 'F16') || typeof item.target !== 'number') return item;
  const n = item.target;
  if ((s.stock[a.good] || 0) >= n) return item;
  const g2 = shown().find(g => (s.stock[g] || 0) >= n);
  if (g2) { a.good = g2; a.setWish({ kind: 'stall', model: goodModel(g2), onPress: serve }); return item; }
  const have = s.stock[a.good] || 0;
  if (have >= 10) { try { const it = F.LEARN.next({ formats: [item.format], force: { strand: item.strand, rung: item.rung, sup: item.sup, target: have, format: item.format, kind: 'practice' }, rng: F.rand, now: Date.now() }); if (it && it.format === item.format && it.target <= have) return it; } catch (e) { /* next */ } }
  if (item.format === 'F16') return null;                      // a price tag the shelf cannot fill: no order (never «17 for 3 apples»)
  const it2 = stallItem(['F16']);
  return it2 && it2.format === 'F16' && typeof it2.target === 'number' && it2.target <= Math.min(20, have) ? it2 : null;
}
Stall.fitOrder = fitOrder;
async function serve(a) {
  if (F.Task.current) return;
  const th = Stall.thing, s = S();
  a.face(F.Player.pos.x, F.Player.pos.z);
  if (!((s.stock[a.good] || 0) > 0)) { const g = shown()[0]; if (!g) return soldOut(a); a.good = g; }
  // the engine picks the format/target among the stall formats; the order is fitted to the shelf, then spoken (F09 only) with that number
  const item = fitOrder(a, stallItem());
  const good = a.good, stock0 = s.stock[good] || 0;
  const ctx = { npc: a, thing: th, place: 'stall', good, goodModel: goodModel(good), noteKind: 'order' };   // (review #2) an order note, never a wish
  // economy §2: no plain sale – nothing fits the shelf as a task → the customer looks, says «later» and goes (nothing changes hands)
  if (!item) { if (a._leaving) return; a._leaving = true; a.clearWish(); await a.say('st_senere'); leave(a); return; }
  // (verify 2nd round) F16: the counter shows the goods the tag prices (one coin per good), not one good priced N
  item.params = Object.assign({}, item.params || {}, { model: goodModel(good), good, goods: F.GOODS[good] }, item.format === 'F16' ? { many: true } : {});
  const n = item.target;
  // §1 row 23: «Hei! Hva selger du i dag?» only for the first customer of her visit (market day: only the first of the rush); an F09
  // order is spoken as the instruction itself («Kan jeg få 14 egg?»)
  if (item.format === 'F09' && typeof n === 'number' && n >= 10 && n <= 20) await a.say('st_order', { n, goods: F.GOODS[good] });
  else if (!visit.greeted) { visit.greeted = true; await a.say('st_hei'); }
  // (verify 2nd round, «too much talking») the customer thanks ONCE: the stage's end-of-task cheer is a gesture + hearts (no «Tusen
  // takk!»), its praise stays, then «Takk! Her er myntene.» with the coins (was: Tusen takk + Så flink + Takk! Her er myntene)
  a._chainQuiet = true;
  let res;
  try { res = await F.Task.run(item, ctx); } finally { a._chainQuiet = false; }
  if (!res) return;
  a.clearWish();
  const pd = payDay(); pd.served++;
  // economy §2: only a first-try right answer sells – the goods stay on the shelf otherwise, and the customer will come back later
  if (res.outcome !== 'A' || res.aborted) {
    Stall.lastSale = { good, format: item.format, sold: 0, paid: 0, outcome: res.outcome || null, stock0, stock1: s.stock[good] || 0 };
    F.store();
    await a.say('st_senere');
    F.emit('stallNoSale', good, res.outcome || null);
    leave(a);
    return;
  }
  // sold = what was counted / priced (one coin per good: the price tag is the goods' price); a read order (F23) takes a small bag of 3
  const nn = Number(n), want = Number.isFinite(nn) && nn >= 1 && (COUNTS.includes(item.format) || item.format === 'F16') ? Math.round(nn) : 3;
  const sold = Math.min(want, s.stock[good] || 0), paid = Math.min(20, sold);
  if (sold <= 0) { Stall.lastSale = { good, format: item.format, sold: 0, paid: 0, outcome: 'A', stock0, stock1: s.stock[good] || 0 }; a._leaving = false; return soldOut(a); }
  s.stock[good] = Math.max(0, (s.stock[good] || 0) - sold); s.sold++; pd.n++; F.store();
  showStock();
  Stall.lastSale = { good, format: item.format, sold, paid, outcome: 'A', stock0, stock1: s.stock[good] };
  await a.say('st_takk');
  if (paid > 0) F.Eco.add(paid, { from: a, reason: 'stall' });
  F.emit('stallSale', good, sold, paid);
  a.gesture('cheer', 1.4); try { F.Act.hearts(a.headPos()); } catch (e) { /* no hearts fx */ }   // (no second «Tusen takk!»)
  leave(a);
  const empty = !Object.values(s.stock).some(v => v > 0);
  if (empty && !s.soldOutSaid) { s.soldOutSaid = true; F.store(); Stall._nokT = F.T.now; F.T.timeout(() => F.SAY('st_nok'), 2500); }
}
F.on('tick', () => {
  const th = Stall.thing;
  if (!th || !F.booted || F.Task.current) return;
  const P = F.Player.pos;
  const near = th.space === F.Space.cur && Math.hypot(P.x - th.x, P.z - th.z) < 30;
  if (!near) visit.greeted = false;                       // a new visit: the first customer greets her again
  if (!near) { if (Stall.queue.length && F.T.now > Stall.nextAt + 60) { Stall.queue.forEach(a => F.Act.remove(a)); Stall.queue = []; } return; }
  if (Stall.queue.length && !shown().length && !rushOn()) { const a = Stall.queue.find(c => !c.busy && !c.path && !c._leaving); if (a && !(F.Speech.busy && F.Speech.busy())) soldOut(a); return; }
  if (F.flags.test && !Stall.active) return;
  if (Stall.queue.length >= 3 || F.T.now < Stall.nextAt) return;
  const market = rushOn();
  // economy §2: ≤ 6 paying customers a day outside market day (and at most 12 served in all): then no one comes until tomorrow
  if (!market && (capLeft() <= 0 || payDay().served >= 2 * Stall.CAP)) return;
  // no task fits the shelf at her level: no customer walks up (there is no plain sale)
  if (!market && !stallItem()) { Stall.nextAt = F.T.now + 45; return; }
  // a customer walking up is an unsolicited offer: quiet during the play break (v3: F.Quest.inBreak); the market-day rush (Q21) ignores it
  if (!market && (F.Quest.quiet ? F.Quest.quiet() : (F.Quest.canOfferTask && !F.Quest.canOfferTask()))) return;
  Stall.nextAt = F.T.now + (market ? 12 : 45);
  if (Stall.rush > 0) Stall.rush--;
  if (market && !Object.values(S().stock).some(v => v > 0)) restock();
  spawnCustomer();
});

/* ---------------------------------------------------------- Markedsdagen: every 3rd day, 10 minutes into the session
   – Puff announces it, her stall gets a rush of 5 customers, the royals stroll to the market and buy their wishes */
let marketAcc = 0, marketDay = 0;
F.on('dayStart', () => { marketAcc = 0; });
F.on('tick', dt => {
  marketAcc += dt;
  const day = F.save.day || 1;
  if (F.flags.test || !F.booted || day % 3 !== 0 || marketDay === day || S().marketDay === day || marketAcc < 600 || F.Task.current) return;
  marketDay = day; S().marketDay = day; F.store(); Stall.market(); });
// Q21 «Markedsdagen» is running and still needs customers
function rushOn() { const q = F.Quest && F.Quest.state && F.Quest.state('Q21'); return Stall.rush > 0 || !!(q && (q.served || 0) < 5); }
Stall.rushOn = rushOn;
function restock() { const s = S(); ['eple', 'rose', 'egg', 'kake', 'bolle'].forEach(g => { if ((s.stock[g] || 0) < 12) s.stock[g] = 12 + Math.floor(F.rand() * 6); }); s.soldOutSaid = false; F.store(); showStock(); }
Stall.market = function () {
  F.SAY('q_markedsdag');
  visit.greeted = false;
  Stall.active = true; Stall.rush = 5; Stall.nextAt = F.T.now + 3;
  restock();
  if (F.Quest && F.Quest.start && !F.Quest.state('Q21')) F.Quest.start('Q21');
  // the royals come out to the market and buy what they can afford
  const p = F.Act.parkPos('markedsplassen');
  ['konge', 'dronning', 'mia'].forEach((id, i) => {
    const a = F.Act.byId(id); if (!a || a.busy) return;
    const fs = F.Act.freeSpot(p.x + 3 + i * 2, p.z + 5, 'out'); a.place('out', fs.x, fs.z);
    const st = F.Eco.npc(id); st.coins += 6; F.store(); F.emit('npcCoins', id, st.coins, 6);     // v5 (#22): Mia's piggy plaque
    const top = st.wishes[0], c = top && F.CAT.byId(top);
    // they buy what they can now afford on screen; anything still affordable afterwards is settled by the wallet rule (finish → settle)
    if (c && c.price <= st.coins) F.T.timeout(() => F.Eco.npcBuy(id, top, { quiet: true }), 4000 + i * 9000);
  });
  F.Quest.log('market', {});
};

/* ---------------------------------------------------------- find or place the stall after boot */
function findStall() {
  if (Stall.thing && F.Things.byId(Stall.thing.id)) return Stall.thing;
  const t = F.Things.list.find(x => x.stall || x.type === 'life_bod' || /feensbod|feens_bod|c_bod|p_bod/.test(x.type));
  if (t) return Stall.attach(t);
  return null;
}
F.on('ready', () => F.T.timeout(() => {
  const s = S();
  if (!s.seeded) { s.seeded = true; s.stock.eple = 12; s.stock.rose = 15; s.stock.egg = 10; F.store(); }
  if (findStall()) { showStock(); return; }
  const p = F.Act.parkPos('markedsplassen');
  F.Things.spawn('life_bod', p.x - 6, p.z + 2, { id: 'feens_bod', space: 'out', ry: 0 });
}, 800));
F.dbg = F.dbg || {};
F.dbg.stall = () => ({ thing: Stall.thing && Stall.thing.id, stock: Object.assign({}, S().stock), queue: Stall.queue.map(a => a.id) });
})();
