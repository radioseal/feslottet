/* Feslottet – LIFE: economy (DESIGN §8). Owner: LIFE.
   Her purse:  F.Eco.coins()  F.Eco.add(n, {from: thing|actor|Vector3, reason})  (flying coins; the HUD bundles 10 ones into a tier and
               SHELL speaks the bundling line – LIFE never says it, so it is not heard twice)   F.Eco.spend(n) -> bool   F.Eco.today() -> coins earned today
   Shopping:   F.Eco.buy(itemId, {via:'shop'|'gift'|'dbg', free}) -> Promise<bool>  (spend + grant)   F.Eco.grant(itemId)   F.Eco.owned(itemId) -> n
               F.Eco.basket() -> [itemIds] (Puff's basket, max 12: food/toys/gifts)   F.Eco.takeFromBasket(itemId)
   Placement:  F.Eco.place(itemId, slotOrPlotId)  F.Eco.slotItem(slot)  F.Eco.plotItem(plotId)
               F.Eco.plotPress(thing)  – CASTLE/OBJ/WORLD call this from a build plot's press (p_tomt); also auto-hooked for type /tomt/
               F.Eco.slotPress(thing, slotName) – Fetårnet slot objects (seng/teppe/lampe/gardiner/hylle/vegg/stol/akvarium/pynt1/vindu/kurv)
               F.Eco.decoratePlot(thing) – re-applies the saved item on a (re)spawned plot (call from init; also polled)
   NPCs:       F.Eco.npc(id) -> {coins, wishes:[3 itemIds], owned, piggy:{goal, have}, wearing}   F.Eco.topWish(id)
               F.Eco.giveCoins(npcId, n)   F.Eco.npcBuy(npcId, itemId) -> Promise (walks to a shop, pays counting aloud, F22 Ja/Nei,
               item appears and is used)   F.Eco.hello(actor) – a plain tap on a person: a wave + ONE line, never coins, never a task
               (natural audit D5)   F.Eco.talk(actor, {wish}) – the money ask she chose (item bubble): wish / price / their coins,
               coin buttons, «Nei takk» (F.Eco.restTask is kept for stall / errand maths, no longer run from a talk)
               F.Eco.receive(itemId, {from}) – a thank-you gift into Puff's basket (the giver is remembered: never offered back to them)
               F.Eco.giftOffer(actor) -> [itemIds] she may give them now   F.Eco.giftBubble(actor) – their gift bubble (the thing + ♥), a
               visible invite; a tap on it → F.Eco.offerGift(actor): the small gift panel with «Nei takk» (rests for the day)
   Gear (WP9): F.Eco.gear(id) -> bool (kind 'gear' items, e.g. the Kikkert; event 'gear' (id))
   Her pet:    F.Eco.setPet(itemId) – follows her; Events: 'coins' (total, delta) 'coinBundle' (tiers, total) 'bought' (itemId, by) 'npcBought'
               (npcId, itemId) 'placed' (kind, key, itemId) 'basket' (list) 'gift' (npcId, itemId).
   12.10. economy plan (§1 money talk, §3.4 every purchase does something, §4 savings goal):
               F.Eco.sayOnce(id, scope 'ever'|'session'|'day', slots, voice, key?) -> Promise (null when skipped); F.save.talk = {ever, day};
               F.Eco.talkLog (every call: {id, key, scope, said}).
               F.Eco.goal() -> null | {id, price, have, enough, shop, model, opts, word}   F.Eco.setGoal(id|null) -> bool (changed); event 'goal'.
               F.Eco.has(itemOrId) -> she already owns this one-of (uniq) item   F.Eco.canBuy(itemOrId) -> 'ok'|'owned'|'full'|'poor'
               F.Eco.BASKET_MAX = 12; F.Eco.basketFull(); a full basket: grant/receive put the thing on her tower shelf (F.save.shop.shelf),
               it moves into the basket as soon as there is room.
               F.Eco.use(id) – «Bruk» on an owned one-of item: wear / take off, pet, place in her room, ride, trail on / off.
               Ride toys (sykkel, sparkesykkel, rulleskøyter, skøyter): a 'life_ride' thing parked beside her; a tap = ride (speed × row.ride),
               a tap again = get off (it stays parked there; far away or in another space it goes back to her tower door).
               F.Eco.rideItem() F.Eco.riding2() F.Eco.toggleRide().  Glitter trails: F.Eco.trail() -> id|null (on), sparkles behind her
               while she moves.  Instruments: 'life_instr' things by Musikkpaviljongen, a tap plays them (event 'instrPlay' (id)). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SLOTS = ['seng', 'teppe', 'lampe', 'gardiner', 'hylle', 'vegg', 'stol', 'akvarium', 'pynt1', 'vindu', 'kurv'];
const ROYAL = { konge: 1, dronning: 1, mia: 1, ole: 1 };
// v5r fix1 (review #12, parent rule 4 «a rich NPC never begs coins»): the home king and queen own the castle – they never ask her for
// coins (no item bubble, no «Det koster … Jeg har …» chain, no rest-payment task); their wishes are bought at day start
const RICH = { konge: 1, dronning: 1 };
const shop = () => { const s = F.save.shop = F.save.shop || {}; s.owned = s.owned || {}; s.slots = s.slots || {}; s.plots = s.plots || {}; s.packs = s.packs || []; s.basket = s.basket || []; return s; };
const cat = id => F.CAT.byId(id);
const BASKET_MAX = 12;                                                    // 12.10. (economy plan §3.4): was 6, and the 7th buy vanished
const basketKind = c => !!c && !c.rideToy && (['food', 'toy', 'gift'].includes(c.kind) || (c.kind === 'magic' && !c.slot));
const SESSION_SAID = new Set();                                          // sayOnce: what was said this session (not saved)

// coins fly from a screen point into the purse (HUD's rect if the HUD exists).
// v5 WP-X (logic #42 part, §3-D «what is shown = what is added»): the flying coins show the amount by value – hundreds, tens and
// ones as the real coin faces (13 = one ten-coin + three one-coins), never «12 sprites for 20» or one coin for two
function flyCoins(n, from) {
  const tr = F.HUD && F.HUD.purseRect ? F.HUD.purseRect() : null;
  if (!tr) { if (F.UI.flyCoins) F.UI.flyCoins(n, from); return; }
  const sx = from ? from.x : innerWidth / 2, sy = from ? from.y : innerHeight / 2;
  const vals = [];
  for (let i = 0; i < Math.min(9, Math.floor(n / 100)); i++) vals.push(100);
  for (let i = 0; i < Math.floor((n % 100) / 10); i++) vals.push(10);
  for (let i = 0; i < n % 10; i++) vals.push(1);
  vals.forEach((v, i) => {
    const c = coinEl(v, 'fly'); c.style.left = sx + 'px'; c.style.top = sy + 'px'; document.body.appendChild(c);
    setTimeout(() => { c.style.left = (tr.left + 40) + 'px'; c.style.top = (tr.top + tr.height / 2) + 'px'; c.style.opacity = '0.3'; }, 30 + i * 70);
    setTimeout(() => c.remove(), 750 + i * 70);
  });
}
const Eco = F.Eco = {
  SLOTS, flies: true,
  coins: () => F.save.coins || 0,
  today() { const e = F.save.eco || {}; return e.day === (F.save.day || 1) ? e.earned || 0 : 0; },
  add(n, o) {
    o = o || {}; n = Math.round(n || 0); if (n <= 0) return F.save.coins || 0;
    const before = F.save.coins || 0, after = before + n;
    F.save.coins = after; F.save.totalEarned = (F.save.totalEarned || 0) + n;
    const e = F.save.eco = F.save.eco || {}; if (e.day !== (F.save.day || 1)) { e.day = F.save.day || 1; e.earned = 0; } e.earned += n;
    F.store();
    flyCoins(n, screenOf(o.from || o.pos));
    F.emit('coins', after, n, o.reason || null);       // HUD pumps the purse (and bundles 10 ones into a tier)
    return after;
  },
  spend(n) {
    n = Math.round(n || 0);
    if ((F.save.coins || 0) < n) return false;
    F.save.coins -= n; F.store();
    F.emit('coins', F.save.coins, -n, 'spend');
    return true;
  },
  owned: id => shop().owned[id] || 0,
  // WP9 gear (DESIGN2 §6.2–6.3): F.Eco.gear('kikkert') -> true once bought (save key F.save.shop.gear = {id: day}). Gear changes what she
  // meets and how easily she sees it (WP4 reads it); it never changes the befriend chance.
  gear: id => !!((F.save.shop && F.save.shop.gear) || {})[id],
  basket: () => shop().basket.slice(),
  packs: () => shop().packs.slice(),
  async buy(id, o) {
    o = o || {};
    const c = cat(id); if (!c) return false;
    if (!o.free && !Eco.spend(c.price)) return false;
    Eco.grant(id, o);
    return true;
  },
  // give the item to her and route it to where it lives (§8.6)
  // 12.10. (economy plan §3.4): the basket holds 12 – a thing that does not fit lands on her tower shelf (never lost); ride toys are
  // parked beside her (life_ride), instruments stand by Musikkpaviljongen (life_instr), a glitter trail sparkles behind her
  grant(id, o) {
    o = o || {};
    const c = cat(id), s = shop(); if (!c) return null;
    s.owned[id] = (s.owned[id] || 0) + 1;
    let where = 'owned';
    if (c.rideToy) { where = 'ride'; s.ride = id; F.store(); try { spawnRide(true); } catch (e) { console.error(e); } }
    else if (c.instr) { where = 'music'; F.store(); try { syncInstr(id); } catch (e) { console.error(e); } }
    else if (basketKind(c)) {
      if (s.basket.length < BASKET_MAX) { s.basket.push(id); where = 'basket'; F.emit('basket', s.basket.slice()); }
      else { (s.shelf = s.shelf || []).push(id); where = 'shelf'; }
    } else if (c.kind === 'wear') { where = 'wardrobe'; if (F.Fairy && F.Fairy.wear) try { F.Fairy.wear(id); } catch (e) {} }
    else if (c.kind === 'pet') { where = 'pet'; Eco.setPet(id); }
    else if (c.kind === 'slot') { where = 'room'; if (!s.slots[c.slot]) Eco.place(id, c.slot); }
    else if (c.kind === 'pack') { where = 'wand'; if (!s.packs.includes(c.slot)) s.packs.push(c.slot); F.emit('packs', s.packs.slice()); }
    else if (c.kind === 'magic' && c.slot === 'sti') { where = 'trail'; s.trail = id; s.trailOff = false; F.emit('trail', id); }
    else if (c.kind === 'gear') {
      where = 'gear'; const g = s.gear = s.gear || {}; if (!g[c.gear || id]) g[c.gear || id] = F.save.day || 1; F.emit('gear', c.gear || id);
      if (F.Fairy && F.Fairy.wear && F.Fairy.WEAR && F.Fairy.WEAR[id]) try { F.Fairy.wear(id); } catch (e) {}   // she wears it (the Kikkert on her chest)
    }
    else { where = 'plot'; }
    F.store();
    F.emit('bought', id, o.by || 'feen', where);
    if (F.Quest && F.Quest.log) F.Quest.log('bought', { who: 'feen', item: id });
    return where;
  },
  // v3 WP6: a thank-you gift from a character goes into Puff's basket (12.10.: max 12; a full basket → her tower shelf, returns
  // 'shelf' – an earned gift is never lost) – no purchase, no 'bought' event
  receive(id, o) {
    o = o || {};
    const c = cat(id), s = shop(); if (!c) return false;
    if (s.basket.length >= BASKET_MAX) { s.owned[id] = (s.owned[id] || 0) + 1; (s.shelf = s.shelf || []).push(id); F.store(); F.emit('received', id, o.from || null); return 'shelf'; }
    s.owned[id] = (s.owned[id] || 0) + 1; s.basket.push(id);
    // natural audit D5 (verify): remember who gave it – a character is never offered back the thank-you gift they gave her
    const from = o.from && typeof o.from === 'object' ? o.from.id : o.from;
    if (from) (s.from = s.from || []).push({ id, from });
    F.store();
    F.emit('basket', s.basket.slice()); F.emit('received', id, o.from || null);
    if (F.Quest && F.Quest.log) F.Quest.log('received', { who: o.from || null, item: id });
    return true;
  },
  // to: who gets it (a gift): the giver record that goes with it is one NOT from that person
  takeFromBasket(id, to) {
    const s = shop(), i = s.basket.indexOf(id); if (i < 0) return false;
    s.basket.splice(i, 1);
    if (s.from && s.from.length) {
      const left = s.basket.filter(x => x === id).length;
      let mine = s.from.filter(e => e.id === id);
      while (mine.length > left) { s.from.splice(s.from.indexOf(mine.find(e => e.from !== to) || mine[0]), 1); mine = s.from.filter(e => e.id === id); }
    }
    if (s.shelf && s.shelf.length && s.basket.length < BASKET_MAX) s.basket.push(s.shelf.shift());   // the shelf refills the basket
    F.store(); F.emit('basket', s.basket.slice()); return true;
  },
  BASKET_MAX: 12,
  basketFull: () => shop().basket.length >= BASKET_MAX,
  // a one-of item she already has (12.10. uniq; the Kikkert's gear key too)
  has(it) { const c = typeof it === 'string' ? cat(it) : it; if (!c || !c.uniq) return false; return (shop().owned[c.id] || 0) > 0 || (c.kind === 'gear' && Eco.gear(c.gear || c.id)); },
  // 'ok' | 'owned' (one-of she has: «Bruk») | 'full' (the basket can't take it: the buy button shows the full basket) | 'poor'
  canBuy(it) {
    const c = typeof it === 'string' ? cat(it) : it; if (!c) return 'poor';
    if (Eco.has(c)) return 'owned';
    if (basketKind(c) && Eco.basketFull()) return 'full';
    return Eco.coins() < c.price ? 'poor' : 'ok';
  },
  /* «once» rules for money talk (economy plan §1): scope 'ever' (F.save.talk.ever), 'day' (F.save.talk.day), 'session' (memory).
     key (optional) narrows it, e.g. 'eco_kurv' once per kind ever. Returns the SAY promise, or a resolved null when skipped. */
  sayOnce(id, scope, slots, voice, key) {
    key = key || id;
    const t = F.save.talk = F.save.talk || {}; t.ever = t.ever || {};
    const day = F.save.day || 1; if (!t.day || t.day.d !== day) t.day = { d: day, ids: {} };
    const seen = SESSION_SAID.has(key) || (scope === 'ever' && !!t.ever[key]) || (scope === 'day' && !!t.day.ids[key]);
    Eco.talkLog.push({ id, key, scope: scope || 'session', said: !seen, t: F.T ? +(+F.T.now).toFixed(1) : 0 });
    if (Eco.talkLog.length > 200) Eco.talkLog.shift();
    if (seen || !F.TPL || !F.TPL.has(id)) return Promise.resolve(null);
    SESSION_SAID.add(key);
    if (scope === 'ever') t.ever[key] = day; else if (scope === 'day') t.day.ids[key] = 1;
    F.store();
    return F.SAY(id, slots || null, voice);
  },
  talkLog: [],
  /* §4 savings goal: one goal at a time (F.save.shop.piggyGoal, the existing key; goalDay). A goal she owns (or bought) is cleared. */
  goal() {
    const s = F.save.shop || {}, id = s.piggyGoal, c = id && cat(id);
    if (!c) return null;
    if (c.uniq && (s.owned || {})[id] > 0) return null;
    const have = Eco.coins();
    return { id, price: c.price, have, enough: have >= c.price, shop: c.shop, model: F.CAT.mid(c), opts: c.opts || null, word: c.word, name: c.name };
  },
  setGoal(id) {
    const s = shop(), prev = s.piggyGoal || null, nx = (id && cat(id)) ? id : null;
    if (prev === nx) return false;
    s.piggyGoal = nx; s.goalDay = nx ? (F.save.day || 1) : null; s.goalSaid = false;
    F.store();
    F.emit('piggyGoal', nx); F.emit('goal', Eco.goal());
    return true;
  },

  /* ---------------- placement */
  place(id, key) {
    const s = shop();
    if (SLOTS.includes(key)) { s.slots[key] = id || null; F.store(); F.emit('placed', 'slot', key, id || null); return true; }
    if (id) s.plots[key] = id; else delete s.plots[key];
    F.store(); F.emit('placed', 'plot', key, id || null);
    const th = F.Things.byId(key); if (th) Eco.decoratePlot(th, true);
    return true;
  },
  slotItem: slot => shop().slots[slot] || null,
  plotItem: key => shop().plots[key] || null,
  // how many of an owned plot item are still free to place
  freeCount(id) { const s = shop(); let used = 0; for (const k in s.plots) if (s.plots[k] === id) used++; return (s.owned[id] || 0) - used; },
  async plotPress(th) {
    // the plot is the target of a quest step (Q17: write HUS here) → the quest runs instead of the item chooser
    if (th._quest && F.Quest && F.Quest.onObj) {
      const q = th._quest; th._quest = null;
      th.data = Object.assign(th.data || {}, { quest: q.id, step: q.step });
      await F.Quest.onObj(th, true);
      return;
    }
    const s = shop(), cur = s.plots[th.id] || null;
    const items = F.CAT.filter(c => c.slot === 'tomt' && (Eco.freeCount(c.id) > 0 || c.id === cur));
    if (!items.length) {
      // review fix WP9 #2: nothing she owns fits here → the tap is a ground tap (she flies where she tapped, the plots under
      // Fetårnet sit on her way to the castle) + a rate-limited hint, never the same line on every tap
      const tap = lastTap && lastTap.th === th && F.T.now - lastTap.t < 20 ? lastTap.g : null; lastTap = null;
      if (tap && !F.Player.frozen) F.Player.goTo(tap.x, tap.z);
      F.FX.sparkle(V3(th.x, th.y + 0.5, th.z));
      if (F.T.now - plotHintT > 90 && plotHints < 4 && !(F.Speech.busy && F.Speech.busy())) { plotHintT = F.T.now; plotHints++; F.SAY('eco_slottom'); }   // «Her er det plass til noe fint fra butikken!»
      return;
    }
    const pick = await chooser(items.map(c => c.id), { current: cur, empty: true, say: 'eco_velg' });
    if (pick === undefined) return;
    Eco.place(pick, th.id);
  },
  async slotPress(th, slot) {
    slot = slot || (th.data && th.data.slot) || th.def.slot;
    const s = shop(), cur = s.slots[slot] || null;
    const items = F.CAT.filter(c => c.kind === 'slot' && c.slot === slot && (s.owned[c.id] || 0) > 0);
    if (!items.length) { F.FX.pop(th.obj); F.sfx.sparkle(); if (!F.Speech.busy || !F.Speech.busy()) F.SAY('eco_slottom'); return; }
    // tap cycles through owned items + empty (no panel needed: one tap = one change)
    const seq = items.map(c => c.id).concat([null]);
    const next = seq[(seq.indexOf(cur) + 1) % seq.length];
    Eco.place(next, slot);
    F.FX.sparkle(V3(th.x, (th.y || 0) + 0.8, th.z)); F.sfx.magic();
  },
  decoratePlot(th, animate) {
    if (!th || !th.obj) return;
    const id = shop().plots[th.id] || null;
    if (th._lifeItem === id && th._lifeObj) return;
    if (th._lifeObj) { th._lifeObj.parent && th._lifeObj.parent.remove(th._lifeObj); th._lifeObj = null; }
    th._lifeItem = id;
    if (!id) return;
    const c = cat(id), mid = F.CAT.mid(c);
    const g = mid ? F.VOX.make(mid, c.opts || {}) : F.Act.fitModel(null, null, 1.2);
    const b = new THREE.Box3().setFromObject(g), sz = b.getSize(V3()), w = Math.max(sz.x, sz.z);
    if (w > 4.2) g.scale.multiplyScalar(4.2 / w);
    if (w < 0.6 && mid) g.scale.multiplyScalar(1.4 / Math.max(w, 0.1));
    g.position.y = 0.05;
    th.obj.add(g); th._lifeObj = g; th.bboxDirty = true;
    if (animate && mid) { const wp = V3(th.x, th.obj.position.y + 0.05, th.z); F.FX.assemble(mid, c.opts || {}, g, wp, { ms: 1300 }); }
    th.reactedVisibly = true;
  },

  /* ---------------- NPC wallets & wishes */
  npc(id) {
    const all = F.save.npcs = F.save.npcs || {};
    if (all[id]) return all[id];
    const a = F.Act && F.Act.byId(id);
    const role = a ? a.role : (ROYAL[id] ? id : id.startsWith('v_') ? 'by' : 'stab');
    const r = U.rng(U.hashStr(id + '|w'));
    const st = all[id] = { coins: ROYAL[id] ? U.int(r, 6, 11) : U.int(r, 3, 8), wishes: [], owned: [], piggy: null, wearing: [] };
    st.wishes = pickWishes(id, role, r, 3, st.coins);
    if (id === 'mia') { st.wishes = ['kattunge'].concat(st.wishes.filter(w => w !== 'kattunge')).slice(0, 3); st.piggy = { goal: 'kattunge', have: st.coins }; }
    orderWishes(st);                                                     // v5 wallet rule: the top wish is one they can't afford yet
    if (id === 'konge') st.piggy = { goal: st.wishes[0], have: st.coins };
    F.store();
    return st;
  },
  // v5 WP-X wallet rule (logic §3-A): the wish a character asks her about is always one they cannot afford yet. An affordable top
  // wish is bought first (offscreen; settle), so the item bubble / Q7 / the talk panel never ask for coins nobody needs.
  topWish(id) { if (RICH[id]) return null; const st = Eco.npc(id); settle(id); const c = cat(st.wishes[0]); return c && c.price > st.coins ? c.id : null; },
  // v5r fix1 (review #1): who a quest reward may visibly come from. The home king/queen and the kingdom royals pay from their own
  // purse; anybody who is saving (needs help with a wish) or holds fewer coins than the reward does NOT – the coins come from the
  // castle (null = the middle of the screen), never «pays 8, then begs for pocket money». Returns the actor or null.
  // v5r2 (world review): kingdom royals too – a royal with a wallet (one is made when they wear her gift) pays only what it holds and
  // never while saving; without a wallet only the realm's king / queen pay (from the treasury), never a royal child. A royal who can't:
  // the realm's king or queen standing near pays instead, else the castle (null). Never reads needsHelp() without a wallet (it makes one).
  payer(a, n) {
    if (!a || a.kind === 'animal') return null;
    if (RICH[a.id]) return a;
    const all = F.save.npcs || {};
    const can = x => { const st = x && all[x.id]; if (!st) return !!(x && x.royal && (x.who === 'k' || x.who === 'q')); return (st.coins || 0) >= (n || 0) && !needsHelp(x.id); };
    if (can(a)) return a;
    if (!a.royal) return null;                                           // no wallet / too few coins / saving: the castle pays
    try { const by = F.Act.near(a.x, a.z, 20, a.space).find(x => x !== a && x.royal === a.royal && (x.who === 'k' || x.who === 'q') && can(x)); return by || null; } catch (e) { return null; }
  },
  rich: id => !!RICH[id],
  giveCoins(npcId, n) {
    n = n || 1;
    if (!Eco.spend(n)) return false;
    const st = Eco.npc(npcId); st.coins += n; if (st.piggy) st.piggy.have = st.coins; F.store();
    F.emit('npcCoins', npcId, st.coins, n);
    if (F.Quest && F.Quest.log) F.Quest.log('lommepenger', { who: npcId, n });
    return st.coins;
  },
};

// WISH_MAX: a wish costs at most 20 – every character can say its price and «Jeg har h» in their own voice (life_n 1–20), and the
// pocket-money question «Hvor mange mangler?» stays a number task within 20 (v5: natural catalog prices 2–100 elsewhere).
const WISH_MAX = 20;
const wishRoles = (id, role) => role === 'barn' ? ['barn'] : ROYAL[id] ? [id] : role === 'by' ? ['by'] : ['stab'];
const wishable = (c, id, roles) => !!c && c.price <= WISH_MAX && ((Array.isArray(c.forNpc) && c.forNpc.some(x => roles.includes(x))) || c.forNpc === id);
// coins (optional): prefer wishes they can't afford yet (price > coins, at most 20 missing)
function pickWishes(id, role, r, n, coins) {
  const roles = wishRoles(id, role);
  const pool = F.CAT.filter(c => wishable(c, id, roles));
  const above = c => coins == null || (c.price > coins && c.price - coins <= 20);
  const out = [];
  // gifts made for this exact character come first (tøfler til kongen …)
  F.CAT.filter(c => c.forNpc === id && c.price <= WISH_MAX && above(c)).forEach(c => out.push(c.id));
  for (const c of U.shuffle(r, pool.filter(above))) { if (out.length >= n) break; if (!out.includes(c.id)) out.push(c.id); }
  for (const c of U.shuffle(r, pool)) { if (out.length >= n) break; if (!out.includes(c.id)) out.push(c.id); }
  return U.shuffle(r, out).slice(0, n);
}
Eco.pickWishes = pickWishes;
function refillWishes(id) {
  const st = Eco.npc(id), a = F.Act && F.Act.byId(id);
  const r = U.rng(U.hashStr(id + '|' + (F.save.day || 1) + '|' + st.owned.length));
  const more = pickWishes(id, a ? a.role : roleOf(id), r, 6, st.coins).filter(w => !st.wishes.includes(w) && !st.owned.includes(w));
  while (st.wishes.length < 3 && more.length) st.wishes.push(more.shift());
  orderWishes(st);
}
Eco.refillWishes = refillWishes;
const roleOf = id => ROYAL[id] ? id : id.startsWith('v_') || id.startsWith('nabo_') ? 'by' : 'stab';
// the first wish they can't afford yet (at most 20 missing) moves to the front
function orderWishes(st) {
  const i = st.wishes.findIndex(w => { const c = cat(w); return c && c.price > st.coins && c.price - st.coins <= 20; });
  if (i > 0) st.wishes.unshift(st.wishes.splice(i, 1)[0]);
  if (st.piggy && st.piggy.goal && !st.wishes.includes(st.piggy.goal)) st.piggy.goal = st.wishes[0] || null;
}
/* wallet rule (logic §3-A): Eco.settle(id) – an affordable top wish is bought (offscreen), then the wishes are refilled with things above
   their coins. A wallet richer than every wish it could have (≥ 20) treats itself offscreen (cheapest wishable things first) until it
   is saving again – the ledger stays honest (coins only ever leave for real items). Returns the number of purchases.
   Called at dayStart for every wallet (Mia included), after a purchase, the market top-up and from topWish/talk. */
// an old save (v4 prices) may hold a wish that now costs more than 20: it is dropped and replaced (never «Det koster 60. Jeg har 5.»)
function pruneWishes(id) {
  const st = Eco.npc(id), n0 = st.wishes.length;
  st.wishes = st.wishes.filter(w => { const c = cat(w); return c && c.price <= WISH_MAX; });
  if (st.wishes.length < n0) refillWishes(id);
}
function settle(id) {
  const st = Eco.npc(id); let n = 0;
  pruneWishes(id);
  for (let k = 0; k < 8; k++) {
    if (!st.wishes.length) refillWishes(id);
    orderWishes(st);
    const c = cat(st.wishes[0]);
    if (!c) { if (st.wishes.length) { st.wishes.shift(); continue; } break; }
    if (c.price > st.coins) break;
    buyOffscreen(id, c.id); n++;
  }
  // nothing they could still wish for is above the coins: small treats until a wish needs help again
  for (let k = 0; k < 12 && st.coins >= WISH_MAX && !needsHelp(id); k++) {
    const roles = wishRoles(id, (F.Act && F.Act.byId(id) || {}).role || roleOf(id));
    const pool = F.CAT.filter(c => wishable(c, id, roles) && c.price <= st.coins).sort((x, y) => y.price - x.price);
    if (!pool.length) break;
    buyOffscreen(id, pool[0].id); n++;
    refillWishes(id);
  }
  if (n) F.store();
  return n;
}
Eco.settle = settle;
function buyOffscreen(id, itemId) {
  const c = cat(itemId), st = Eco.npc(id); if (!c || st.coins < c.price) return false;
  st.coins -= c.price; st.owned.push(itemId); if (st.piggy) st.piggy.have = st.coins;
  const wi = st.wishes.indexOf(itemId); if (wi >= 0) st.wishes.splice(wi, 1);
  refillWishes(id); if (st.piggy && st.piggy.goal === itemId) st.piggy = { goal: st.wishes[0], have: st.coins };
  const a = F.Act && F.Act.byId(id);
  if (a && (c.kind === 'wear' || c.use === 'wear') && a.wear) try { a.wear(itemId, 1, { silent: true }); } catch (e) { /* no look */ }
  F.emit('npcBought', id, itemId, { bg: false, visible: false, settle: true });
  if (F.Quest && F.Quest.log) F.Quest.log('npcBought', { who: id, item: itemId });
  return true;
}
// {item, price, have, missing} when the top wish needs her help (1 ≤ missing ≤ 20), else null – Q7 / item bubbles ask this first
function needsHelp(id) {
  if (RICH[id]) return null;                                             // (review #12) the home king/queen never need her coins
  const st = Eco.npc(id), c = cat(st.wishes[0]); if (!c) return null;
  const m = c.price - st.coins;
  return m >= 1 && m <= 20 ? { item: c.id, price: c.price, have: st.coins, missing: m } : null;
}
Eco.needsHelp = needsHelp;
// test builds: any «Det koster … Jeg har … gi meg» flow must need help (logic §3-A); logs 'LOGIC ask' so probes catch a violation
Eco.assertAsk = function (o) {
  const m = o.price - o.have, good = m >= 1 && m <= 20;
  if (!good && F.flags && F.flags.test) console.error('LOGIC ask', JSON.stringify(o));
  return good;
};
// a number in a character's own counting voice; numbers they have no clip for fall back to the narrator (never silence, logic §3-B)
function sayNum(a, n) {
  n = Math.round(+n || 0);
  if (a && a.cvoice && ((n >= 1 && n <= 20) || ((F.SETS.TENS_30_100 || []).includes(n) && ['konge', 'dronning', 'mia'].includes(a.cvoice)))) return a.count(n);
  if (n >= 0 && n <= 100 && F.TPL.has('core_num')) return F.SAY('core_num', { n }, '');
  return F.T.sleep(350);
}
Eco.sayNum = sayNum;

function screenOf(from) {
  if (!from) return null;
  if (typeof from === 'string') { from = F.Things.byId(from) || (F.Act && F.Act.byId(from)); if (!from) return null; }
  if (from.x != null && from.y != null && from.z == null && !from.isVector3) return { x: from.x, y: from.y };   // already a screen point
  let p = null;
  if (from.isVector3) p = from.clone();
  else if (from.headPos) p = from.headPos();
  else if (from.obj) p = V3(from.x, (from.y || 0) + 1, from.z);
  else if (from.x != null && from.z != null) p = V3(from.x, from.y || 1, from.z);
  if (!p) return null;
  p.project(F.R.camera);
  const r = F.R.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
}
Eco.screenOf = screenOf;

/* ---------------------------------------------------------- coin markup (real coins, not icons) */
function coinEl(v, cls) { const c = F.UI.el('div', 'lcoin ' + (v >= 100 ? 'ten hundred' : v >= 10 ? 'ten' : 'one') + ' ' + (cls || '')); c.appendChild(F.UI.el('span', '', String(v >= 100 ? 100 : v >= 10 ? 10 : 1))); return c; }
Eco.coinEl = coinEl;
// her purse (the shop panel): the one purse builder of economy plan §5 (F.Purse.el – the HUD's blue 100-notes fan, tens, ten-frame, chip),
// feature-detected; it stays compact at any sum, so it never runs over the shop's name sign. Without F.Purse: the coin row below.
function purseEl(n) {
  if (F.Purse && typeof F.Purse.el === 'function') { try { return F.Purse.el(n, { cls: 'lpurse-notes' }); } catch (e) { console.error('[Eco] F.Purse.el', e); } }
  return coinPurseEl(n);
}
// a villager's pocket money (and the fallback): hundreds (rose-gold «100») and tens in one row + ones as real coins in a 2×5 ten-frame + numeral chip
// (review fix WP9 #4: 200 coins were 20 ten-coins in rows that overflowed the shop panel)
function coinPurseEl(n) {
  const w = F.UI.el('div', 'lpurse');
  const tiers = F.UI.el('div', 'lp-tiers');
  for (let i = 0; i < Math.min(9, Math.floor(n / 100)); i++) tiers.appendChild(coinEl(100));
  for (let i = 0; i < Math.floor((n % 100) / 10); i++) tiers.appendChild(coinEl(10));
  const frame = F.UI.el('div', 'lp-frame'); for (let i = 0; i < 10; i++) { const cell = F.UI.el('div', 'lp-cell'); if (i < n % 10) cell.appendChild(coinEl(1)); frame.appendChild(cell); }
  w.appendChild(tiers); w.appendChild(frame); w.appendChild(F.UI.el('div', 'lp-num', String(n)));
  return w;
}
Eco.purseEl = purseEl;
const thumb = (id, size) => { const c = cat(id); const mid = c ? F.CAT.mid(c) : (F.VOX.has(id) ? id : null); return mid ? F.Thumb.img(mid, (c && c.opts) || {}, { size: size || 160 }) : F.UI.el('div', 'lthumb-missing', c ? F.UI.caseText(c.word) : id); };
Eco.thumb = thumb;
function portrait(a, size) {
  try {
    if (a.kind === 'animal') return F.Thumb.img({ pus: 'ch_pus', tass: 'ch_tass', bris: 'ch_bris', pip: 'ch_pip' }[a.role] || 'ch_pus', {}, { size });
    if (a.look && typeof a.look === 'object' && F.VOX.has('ch_person')) return F.Thumb.img('ch_person', a.look, { size, angle: 0.25 });
    if (F.VOX.has('ch_' + a.role)) return F.Thumb.img('ch_' + a.role, {}, { size, angle: 0.25 });
  } catch (e) {}
  return F.UI.el('div', 'lthumb-missing', a.name);
}
Eco.portrait = portrait;

/* ---------------------------------------------------------- generic picture chooser (plots) */
function chooser(ids, o) {
  o = o || {};
  return new Promise(res => {
    const box = F.UI.el('div', 'lchooser');
    const row = F.UI.el('div', 'lch-row');
    let done = false;
    const finish = v => { if (done) return; done = true; h.close(); res(v); };
    ids.forEach(id => {
      const b = F.UI.el('button', 'lch-item' + (id === o.current ? ' cur' : ''));
      b.appendChild(thumb(id, 150));
      b.onclick = e => { e.stopPropagation(); F.sfx.click(); finish(id); };
      row.appendChild(b);
    });
    if (o.empty) { const b = F.UI.el('button', 'lch-item empty'); b.appendChild(F.UI.el('div', 'lch-empty')); b.onclick = e => { e.stopPropagation(); F.sfx.click(); finish(null); }; row.appendChild(b); }
    box.appendChild(row);
    const h = F.UI.open(box, { cls: 'life-panel', onClose: () => finish(undefined) });
    if (o.say) F.SAY(o.say);
  });
}
Eco.chooser = chooser;

/* ---------------------------------------------------------- talk / pocket money / gifts
   v3 WP6 (DESIGN3 §6.2, §6.5):
   - The «Det ønsker jeg meg! / Det koster p. / Jeg har h.» chain only on the first tap per character per day (or when she taps the
     item bubble). Then «Hvor mange mynter mangler jeg?» and a task on the missing amount m = p − h:
     m ≥ 10 and T-MENGDE below M10 → F12 «Betal riktig» (she lays out exactly m; support mode below M9);
     otherwise (M10, or a small m) → F13 «Sparegrisen» (missing addend: has h, needs p; the meter shows the gap below M10).
     A/B/C → she gives the m coins (C: after the solution was shown) and the character buys it; F22 «Ble det riktig?» after the
     purchase from T-MENGDE ≥ 5. Not enough coins → she can still give coins with the buttons; the price reached by buttons alone
     does not buy any more by itself: the character asks F22 at the counter first.
   - Later taps the same day: a personal line from a no-repeat pool (2 per character; Rolf's q_rolf, Siv's q_siv, Tor's q6_tor and
     the royals' ambient lines join their pools). The panel only opens again when Puff's basket has a gift to give.
   natural audit 11.10. D5 (#25): A HELLO NEVER COSTS COINS AND NEVER STARTS A TASK. A tap on a person without a bubble is F.Eco.hello:
     a wave (a hop for kids) and ONE line in their own voice – yesterday's thanks once a day, else a personal line (no-repeat pool, no
     counting / reading quirks) – and never a panel after it (a gift she carries for them shows as their gift bubble instead). The talk
     panel (F.Eco.talk) is now only the money ask she CHOSE by tapping an item bubble:
     the wish, its price and their coins in their voice, the coin buttons and a visible «Nei takk» chip; a tap
     beside the panel closes it and the fairy flies there (flying away cancels the ask). No «Hvor mange mynter mangler jeg?» task on
     her coins (that maths moves to the stall / errands where the NPC hands HER the coins – Eco.restTask stays for them), no narrator
     «Trykk på mynten …» orders. Mia saves her own money: she never asks. «Nei takk» lets the item bubble rest for the day. */
const PERSONAL ={ tor: ['life_p_tor', 'q6_tor'], per: ['life_p_per'], siv: ['life_p_siv', 'q_siv'], rolf: ['life_p_rolf', 'q_rolf'], kokk: ['life_p_kokk', 'life_amb_kokk'],
  konge: ['life_amb_konge'], dronning: ['life_amb_dronning'], mia: ['life_amb_mia'] };
const PERSONAL_V = { vm: ['life_p_vm'], vk: ['life_p_vk'], barn: ['life_p_barn'] };
function personalLine(a) {
  const pool = (PERSONAL[a.id] || PERSONAL_V[a.voice] || []).filter(id => F.TPL.has(id) && (F.TPL.all[id].voices || []).includes(a.voice));
  if (!pool.length) return 'life_hei';
  const last = a._pLast; const c = pool.length > 1 ? pool.filter(id => id !== last) : pool;
  const id = c[Math.floor(F.rand() * c.length)]; a._pLast = id; return id;
}
Eco.personalLine = personalLine;
// the items in Puff's basket she may give this character: never one they gave her themselves (a thank-you gift, verify D5)
function offerable(a) {
  const s = shop(), bk = s.basket, fr = s.from || [];
  return [...new Set(bk)].filter(id => bk.filter(x => x === id).length > fr.filter(e => e.id === id && e.from === a.id).length);
}
// … and of those, the ones this character would really like: a gift made for them, or one of their wishes (her own errand)
function giftsFor(a) {
  const st = (F.save.npcs || {})[a.id], wishes = st ? st.wishes : [];          // (a peek: no wallet is made for a passer-by)
  return offerable(a).filter(id => { const c = cat(id); return !!c && (c.forNpc === a.id || c.forNpc === a.role || wishes.includes(id)); });
}
Eco.giftsFor = giftsFor;
Eco.offerable = offerable;
/* natural audit D5 (verify 2nd round): a gift for them is a VISIBLE INVITE she may choose, never a panel after a hello. While Puff's
   basket holds something a character would like (never a thank-you gift they gave her themselves), a bubble with that thing and a heart shows
   over them; a tap on it opens the small gift panel (the gift, «Nei takk», ✕, a tap beside = fly there). Not after «Nei takk» / ✕ /
   flying away (rests for the day), not when they already have all they need today (F.Quest.satisfied), never a kingdom royal (their
   own press). */
function giftOffer(a) {
  if (!a || a.kind !== 'person' || a.royal || a.owner || a.temp || !shop().basket.length) return [];
  const st = (F.save.npcs || {})[a.id], day = F.save.day || 1;
  if ((st && st.giftNoDay === day) || (F.Quest && F.Quest.satisfied && F.Quest.satisfied(a.id))) return [];
  return giftsFor(a);
}
Eco.giftOffer = giftOffer;
Eco.giftBubble = function (a) {
  if (!a || a.wish || a.busy || F.Task.current) return null;
  const g = giftOffer(a); if (!g.length) return null;
  return a.setWish({ kind: 'gift', itemId: g[0], onPress: x => Eco.offerGift(x) });
};
// a panel she can always leave: «Nei takk», the ✕, or a tap beside it – the panel closes and that tap becomes a real world tap
// (she flies there / presses what she tapped), so «flying away» cancels the ask
function leavable(h, acts, onNo) {
  const no = F.UI.btn('Nei takk', () => { onNo && onNo('nei'); h.close('nei'); }, { cls: 'lt-nei' });
  acts.appendChild(no);
  h.wrap.addEventListener('pointerdown', e => {
    if (e.target !== h.wrap || h.closed) return;
    const x = e.clientX, y = e.clientY;
    onNo && onNo('away'); h.close('away');
    setTimeout(() => { try { if (F.Input && F.Input.pressAt) F.Input.pressAt(x, y); } catch (err) { /* no world tap */ } }, 0);
  });
  if (!document.getElementById('lt-nei-css')) {
    const cs = document.createElement('style'); cs.id = 'lt-nei-css';
    cs.textContent = '.ltalk .lt-nei{min-width:132px;min-height:84px;font-size:28px;font-weight:800;border-radius:28px;background:#fff;color:#6b5a7a;border:3px solid #e2d6f0;margin-left:auto}' +
      // the gift-only panel: the gift on the top row (the ✕ sits top right), «Nei takk» on its own row below – never under the ✕
      '.lt-giftonly .lt-mid .lt-gifts{border-left:0;padding-left:0}.lt-giftonly .lt-acts{justify-content:flex-end}';
    document.head.appendChild(cs);
  }
  return no;
}
// the gift-only panel → the gift id she gave, or null (she left it)
async function giftPanel(a, gifts, onNo) {
  const box = F.UI.el('div', 'ltalk lt-giftonly');
  const left = F.UI.el('div', 'lt-left'); left.appendChild(portrait(a, 190)); left.appendChild(F.UI.el('div', 'lt-name', F.UI.caseText(a.name)));
  const mid = F.UI.el('div', 'lt-mid'), row = F.UI.el('div', 'lt-gifts'), acts = F.UI.el('div', 'lt-acts');
  mid.appendChild(row); box.appendChild(left); box.appendChild(mid); box.appendChild(acts);
  let chosen = null;
  return new Promise(res => {
    const h = F.UI.open(box, { cls: 'life-panel', onClose: r => { if (!chosen && r !== 'nei' && r !== 'away' && onNo) onNo('x'); res(chosen); } });
    gifts.forEach(id => {
      const b = F.UI.el('button', 'lt-gift'); b.appendChild(thumb(id, 120));
      b.onclick = e => { e.stopPropagation(); if (h.closed) return; F.sfx.click(); chosen = id; h.close('gift'); };
      row.appendChild(b);
    });
    leavable(h, acts, onNo);
  });
}
// a tap on their gift bubble: the small panel; she gives it (their reaction, «takk») or leaves it (the bubble rests for the day)
Eco.offerGift = async function (a) {
  const gifts = giftOffer(a);
  if (a.wish && a.wish.kind === 'gift') a.clearWish();
  if (!gifts.length) return Eco.hello(a);
  a.facePlayer && a.facePlayer();
  F.emit('giftOffer', a.id, gifts.slice());
  const st = Eco.npc(a.id), day = F.save.day || 1;
  const id = await giftPanel(a, gifts, why => { st.giftNoDay = day; F.store(); F.emit('giftNo', a.id, why); });
  if (id) await Eco.giveGift(a, id);
};
Eco.hello = async function (a) {
  if (!a || a.kind === 'animal') return;
  const st = Eco.npc(a.id), day = F.save.day || 1;
  if (st.talkDay !== day) { st.talkDay = day; F.store(); }
  a.gesture(a.voice === 'barn' ? 'hop' : F.rand() < 0.5 ? 'wave' : 'nod', 1.2);
  const roy = ['konge', 'dronning', 'mia'].includes(a.voice), mem = memoryOf(a.id);
  let line;
  if (mem && a.memDay !== day) {
    a.memDay = day; line = roy && F.GIFT_IDS.includes(mem) ? 'life_igår' : 'life_igår_gen';
    await a.say(line, line === 'life_igår' ? { item: F.giftName(mem) } : null);
  } else { line = personalLine(a); await a.say(line); }
  F.emit('talkLine', a.id, line);
  F.emit('hello', a.id, line);
  // a gift she carries for them: no panel – their gift bubble appears (a visible invite she may tap, or not)
  F.T.timeout(() => { if (F.Act.all[a.id]) Eco.giftBubble(a); }, 600);
};
// the pocket-money question: m missing coins → F12 / F13 at her level. Returns 'A'|'B'|'C'|'poor'|null
// v5 WP-X (#2): always F13 «has h, needs p» – the old F12 route showed the missing amount m as the price tag («Den koster 11» = the
// answer). An F12 «rest» mode (tag = p, h coins on the counter, «Legg på resten») is REQUESTed from WP-R2; until it exists F13 with
// ctx.pocket (neutral framing, WP-R2 #23) carries every pocket-money question. ctx.coins = 0: no task coins inside a payment (#18).
async function restTask(a, top, tc, st) {
  const p = tc.price, h = st.coins, m = p - h;
  if (m <= 0 || m > 20 || F.Task.current) return null;
  if (!Eco.assertAsk({ id: a.id, price: p, have: h })) return null;
  const rung = strandRung('T-MENGDE');
  const rest = F.Task.defs && F.Task.defs.F12 && F.Task.defs.F12.restMode;      // feature-detect WP-R2's F12 rest mode
  F.emit('pocketAsk', a.id, { price: p, have: h, missing: m, format: rest ? 'F12' : 'F13' });
  if (rest && F.Task.pay) {
    const r = await F.Task.pay(p, { rest: h, itemName: tc.name, model: F.CAT.mid(top), modelOpts: tc.opts || null, voice: '', npc: a, place: 'shop', coins: 0 });
    return r || null;
  }
  if (!F.Task.defs || !F.Task.defs.F13) return null;
  const sup = rung >= 10 ? (((F.LEARN.summary() || {}).strands || {})['T-MENGDE'] || {}).sup || 1 : 0;
  const ch = [m, m + 1, m - 1, m + 2, m + 10].filter((v, i, arr) => v >= 0 && v <= 30 && arr.indexOf(v) === i).slice(0, 4);
  const item = { id: 'rest_' + Math.round(F.T.now * 10), strand: 'T-MENGDE', rung: 10, sup, kind: rung >= 10 ? 'normal' : 'practice', format: 'F13',
    key: 'T-MENGDE:' + m, target: m, n: p, choices: U.shuffle(F.rand, ch), distractors: ch.filter(v => v !== m).map(v => ({ v, tag: 'OFF-BY-ONE' })),
    structure: sup < 2, params: { op: 'missing', a: h, b: p, structure: sup < 2 } };
  const res = await F.Task.run(item, { npc: a, thing: a.th, place: 'shop', pocket: true, coins: 0 });
  return res && res.outcome ? res.outcome : null;
}
Eco.restTask = restTask;
Eco.talk = async function (a, o) {
  o = o || {};
  if (!a || a.kind === 'animal') return;
  // D5: Mia saves her own money (she never asks for pocket money); a plain call without a chosen ask is a hello
  if (a.id === 'mia') return Eco.hello(a);
  const st = Eco.npc(a.id), day = F.save.day || 1;
  pruneWishes(a.id);
  if (!st.wishes.length) refillWishes(a.id);
  orderWishes(st);
  const top = st.wishes[0], tc = cat(top);
  const roy = ['konge', 'dronning', 'mia'].includes(a.voice);
  const rich = !!RICH[a.id] || a.id === 'mia';                           // (review #12) no wish chain, no coin buttons
  // D5: F.Eco.talk is only ever the ask she CHOSE (an item bubble) – a hello never comes here – so it is always the full ask
  // (wish, price, their coins, coin buttons, «Nei takk»); a rich royal never asks: a hello – one line, never a panel after it
  const first = !rich;
  // D5 (verify 2nd round): what she may give from Puff's basket – never a thank-you gift this person gave her
  const bk = offerable(a);
  if (!first) return Eco.hello(a);
  st.talkDay = day; F.store();
  // v5 wallet rule (logic §3-A): they can already afford it → «Nå har jeg nok!» and off they go – no coin buttons, no «gi mynt» hint
  if (first && tc && st.coins >= tc.price && !a.busy) {
    a.gesture('wave', 1.2);
    if (roy && F.GIFT_IDS.includes(top)) await a.say('life_ønske', { item: F.giftName(top) }); else await a.say('life_ønske_den');
    await a.say('life_nok');
    if (roy && F.GIFT_IDS.includes(top)) await a.say('life_kjøper', { item: F.giftName(top) }); else await a.say('life_kjøper_den');
    F.emit('talkAfford', a.id, top);
    Eco.npcBuy(a.id, top, {});
    return;
  }
  // greeting: yesterday's thanks (once a day) – no extra «Hei!» before the wish (one line, then the ask)
  const mem = memoryOf(a.id);
  if (first) {
    a.gesture('wave', 1.2);
    if (mem && a.memDay !== day) {
      a.memDay = day;
      if (roy && F.GIFT_IDS.includes(mem)) a.say('life_igår', { item: F.giftName(mem) }); else a.say('life_igår_gen');
    }
  }

  const box = F.UI.el('div', 'ltalk');
  const left = F.UI.el('div', 'lt-left'); left.appendChild(portrait(a, 190)); left.appendChild(F.UI.el('div', 'lt-name', F.UI.caseText(a.name)));
  const mid = F.UI.el('div', 'lt-mid');
  const wish = F.UI.el('div', 'lt-wish');
  if (tc && !rich) { wish.appendChild(thumb(top, 170)); wish.appendChild(F.UI.el('div', 'lt-price', String(tc.price))); }
  const purse = F.UI.el('div', 'lt-purse'); purse.appendChild(coinPurseEl(st.coins));
  if (!rich) { mid.appendChild(wish); mid.appendChild(purse); }
  const acts = F.UI.el('div', 'lt-acts');
  box.appendChild(left); box.appendChild(mid); box.appendChild(acts);
  let closed = false;
  const h = F.UI.open(box, { cls: 'life-panel', onClose: () => { closed = true; } });
  F.emit('moneyAsk', a.id, { item: top, price: tc ? tc.price : null, have: st.coins, gift: !first });

  // v5 (#19): a 10-coin is only offered while 10 or more are missing – she never overpays (no change to give back)
  const missing = () => tc ? tc.price - st.coins : 99;
  const refresh = () => { purse.innerHTML = ''; purse.appendChild(coinPurseEl(st.coins)); b1.disabled = Eco.coins() < 1 || missing() < 1; b10.disabled = Eco.coins() < 10 || missing() < 10; };
  let counting = Promise.resolve(), buying = false;
  const buyNow = async (ask) => {
    await a.say('life_nok');
    if (roy && F.GIFT_IDS.includes(top)) await a.say('life_kjøper', { item: F.giftName(top) }); else await a.say('life_kjøper_den');
    if (F.Quest && F.Quest.satisfy) F.Quest.satisfy(a.id, 'pocket');   // D5 (#27): her help made the wish come true – no new ask today
    Eco.npcBuy(a.id, top, Object.assign({ helped: true }, ask ? { ask: true } : {}));
  };
  const give = (n, btn) => {
    if (buying || closed) return;
    const before = st.coins;
    if (tc && n > tc.price - before) { F.sfx.boing && F.sfx.boing(); return; }   // (the button is disabled; a stale click never overpays)
    if (Eco.giveCoins(a.id, n) === false) { F.sfx.bad(); return; }
    F.sfx.coin();
    flyEl(btn, purse);
    refresh();
    const total = st.coins;
    counting = counting.then(() => sayNum(a, total));
    // v5 wallet rule: the purchase starts only when HER coin crosses the price (never because they already had enough)
    if (tc && before < tc.price && total >= tc.price && !buying) {
      // the price reached by buttons alone: the purchase is checked at the counter (F22 «Ble det riktig?»)
      buying = true;
      counting.then(async () => { await F.T.sleep(250); h.close(); await buyNow(true); });
    }
  };
  const b1 = F.UI.el('button', 'kbtn lt-coin'); b1.appendChild(coinEl(1)); b1.onclick = e => { e.stopPropagation(); give(1, b1); };
  const b10 = F.UI.el('button', 'kbtn lt-coin'); b10.appendChild(coinEl(10)); b10.onclick = e => { e.stopPropagation(); give(10, b10); };
  if (!rich) { acts.appendChild(b1); acts.appendChild(b10); }
  // gifts from Puff's basket
  if (bk.length) {
    const gifts = F.UI.el('div', 'lt-gifts');
    bk.forEach(id => {
      const b = F.UI.el('button', 'lt-gift'); b.appendChild(thumb(id, 120));
      b.onclick = e => { e.stopPropagation(); if (buying) return; F.sfx.click(); h.close(); Eco.giveGift(a, id); };
      gifts.appendChild(b);
    });
    acts.appendChild(gifts);
  }
  // D5: every money ask has a visible way out; declining (or flying away) lets their item bubble rest for the day
  leavable(h, acts, why => {
    if (buying) return;
    if (first) { st.declineDay = day; F.store(); if (a.wish && a.wish.kind === 'item') a.clearWish(); a.gesture('nod', 1); }
    F.emit('moneyAskNo', a.id, why);
  });
  refresh();
  if (!first) return;
  // what they wish for + how much they have, in their own voice (the bubble promised exactly this) – no quiz, no narrator order
  if (tc) {
    await F.T.sleep(100);
    if (roy && F.GIFT_IDS.includes(top)) await a.say('life_ønske', { item: F.giftName(top) }); else await a.say('life_ønske_den');
    if (closed) return;
    await a.say('life_c_koster', null, { still: true }); await sayNum(a, tc.price);
    if (closed) return;
    if (st.coins > 0) { await a.say('life_c_har', null, { still: true }); await sayNum(a, st.coins); } else await a.say('life_tom');
    Eco.assertAsk({ id: a.id, price: tc.price, have: st.coins });
  }
};
function flyEl(from, to) {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const c = coinEl(1, 'fly'); c.style.left = (a.left + a.width / 2) + 'px'; c.style.top = (a.top + a.height / 2) + 'px';
  document.body.appendChild(c);
  requestAnimationFrame(() => { c.style.left = (b.left + b.width / 2) + 'px'; c.style.top = (b.top + b.height / 2) + 'px'; c.style.opacity = '0.4'; });
  setTimeout(() => c.remove(), 650);
}
function memoryOf(id) {
  const day = (F.save.day || 1) - 1; if (day < 1) return null;
  // v5 (#17): «Takk for i går» only for HER help – a gift, or a purchase she paid pocket money for (helped); not their own shopping
  const ev = (F.save.events || []).filter(e => e.day === day && (e.who === id || e.to === id) && (e.type === 'gift' || (e.type === 'npcBought' && e.helped))).pop();
  return ev ? ev.item : null;
}
Eco.giveGift = async function (a, id) {
  const c = cat(id); if (!c || !Eco.takeFromBasket(id, a.id)) return;
  const st = Eco.npc(a.id);
  st.owned.push(id); const wi = st.wishes.indexOf(id); if (wi >= 0) st.wishes.splice(wi, 1); refillWishes(a.id); F.store();
  staleBubble(a);                                                      // v5 (#16): the old item bubble goes with the wish
  F.emit('gift', a.id, id);
  if (F.Quest && F.Quest.log) F.Quest.log('gift', { to: a.id, who: a.id, item: id });
  a.busy = true;
  try {
    const use = c.use === 'place' ? 'place' : c.use;
    await a.react(use === 'read' ? 'cheer' : use, id);
    if (wi >= 0) { F.Act.hearts(a.headPos()); a.gesture('dance', 2); await a.say('life_takk'); if (F.Quest && F.Quest.satisfy) F.Quest.satisfy(a.id, 'gift'); }
  } finally { a.busy = false; }
};

/* ---------------------------------------------------------- NPC buying: walk to a shop, pay counting aloud, F22 */
// v5 (#41): only a counter that really sells the item (its own shop, or a village stall whose region shop is that shop); else the cart
function findShopThing(a, shopId) {
  let best = null, bd = 36;
  for (const t of F.Things.list) {
    if (t.space !== a.space) continue;
    const raw = (t.data && t.data.shop) || (t.def && t.def.shop);
    if (!raw) continue;
    const sid = typeof raw === 'string' && F.SHOPS[raw] && !F.SHOPS[raw].resolve ? raw : (F.Towns && F.Towns.stallShop ? F.Towns.stallShop(t) : null);
    if (sid !== shopId) continue;
    const d = Math.hypot(t.x - a.x, t.z - a.z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// a little market cart that rolls in when no shop is near (castle rooms, far fields)
F.VOX.def('life_kiosk', {
  size: [24, 30, 14], scale: 1 / 16,
  build(v, o) {
    v.box(1, 3, 2, 22, 12, 11, 'woodLight'); v.box(1, 12, 1, 22, 13, 12, 'wood');
    v.box(2, 4, 12, 21, 11, 12, o.c || 'rose'); for (let x = 3; x < 21; x += 4) v.box(x, 4, 12, x + 1, 11, 12, 'white');
    for (const x of [1, 22]) v.box(x, 13, 3, x, 25, 4, 'wood');
    v.box(0, 25, 0, 23, 26, 13, o.c || 'rose'); for (let x = 0; x < 24; x += 4) v.box(x, 25, 0, x + 1, 26, 13, 'white');
    v.box(0, 24, 13, 23, 24, 13, o.c || 'rose');
    for (const [x, z] of [[4, 1], [19, 1], [4, 12], [19, 12]]) { v.cyl(x, 0, z, 2.2, 1, 'woodDark'); v.box(x, 1, z, x, 3, z, 'woodDark'); }
    v.box(5, 13, 4, 7, 15, 6, 'red'); v.box(9, 13, 4, 11, 14, 6, 'butter'); v.box(14, 13, 5, 16, 16, 7, 'mint'); v.box(18, 13, 4, 20, 14, 7, 'peach');
  },
  meta: { group: 'life' },
});
F.Things.def('life_kiosk', { model: 'life_kiosk', radius: 0.9, solid: false, hoverable: false, name: 'butikkvogna' });
function coinMesh(ten) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(ten ? 0.13 : 0.085, ten ? 0.13 : 0.085, ten ? 0.05 : 0.035, 18), F.M.mat(ten ? 'gold' : 'yellow', { metal: 0.4 }));
  if (ten) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 18), F.M.mat('honey')); r.rotation.x = Math.PI / 2; r.position.y = 0.026; g.add(r); }
  return g;
}
// v5 (#27): a planted slip lives in the COINS (one too many or too few laid down) and the count says exactly what lies there, so
// «Ble det riktig?» is judged on the pile (F22 v4 rule). plant: +1 | -1 | true (random) | false
async function payCounting(a, price, counter, plant, quiet) {
  if (plant) { const d = plant === 1 || plant === -1 ? plant : (Math.random() < 0.5 ? 1 : -1); price = Math.max(1, price + d); }
  // counter top position
  const cx = counter.x, cz = counter.z, cy = (counter.obj ? counter.obj.position.y : 0) + 0.9;
  const group = new THREE.Group(); F.Space.scene(a.space).add(group);
  const dir = Math.atan2(a.x - cx, a.z - cz);
  const ox = cx + Math.sin(dir) * 0.55, oz = cz + Math.cos(dir) * 0.55;
  const tens = Math.floor(price / 10), ones = price % 10;
  // spoken sequence: tens «ti, tjue …» then ones counted on
  const seq = [];
  for (let i = 1; i <= tens; i++) seq.push({ ten: true, n: i * 10 });
  for (let i = 1; i <= ones; i++) seq.push({ ten: false, n: tens * 10 + i });
  const said = seq.map(s => s.n);
  const hand = a.anchors.hand ? (() => { const v = V3(); a.th.obj.updateMatrixWorld(true); a.anchors.hand.getWorldPosition(v); return v; })() : V3(a.x, cy, a.z);
  for (let i = 0; i < seq.length; i++) {
    const s = seq[i], m = coinMesh(s.ten);
    const col = s.ten ? i : (i - tens), tx = s.ten ? ox - 0.5 + col * 0.3 : ox - 0.36 + (col % 5) * 0.18, tz = s.ten ? oz - 0.15 : oz + 0.12 + Math.floor(col / 5) * 0.18;
    m.position.copy(hand); group.add(m);
    a.gesture('nod', 0.4); F.sfx.coin();
    F.T.tween(260, k => { m.position.set(U.lerp(hand.x, tx, k), U.lerp(hand.y, cy, k) + Math.sin(k * Math.PI) * 0.25, U.lerp(hand.z, tz, k)); });
    if (quiet) await F.T.sleep(330); else await sayNum(a, said[i]);
  }
  return { group, said, last: said[said.length - 1], laid: price };
}
async function askRiktig(a, correct, price) {
  // F22 «Ble det riktig?» – the format plugin if present, else a local Ja/Nei
  if (F.Task && F.Task.defs && F.Task.defs.F22 && F.Task.run && F.LEARN && F.LEARN.next) {
    try {
      const rung = strandRung('T-MENGDE');
      const item = F.LEARN.next({ formats: ['F22'], force: { strand: 'T-MENGDE', rung: U.clamp(rung, 5, 7), sup: 1, target: price || 10, format: 'F22', kind: rung >= 5 ? 'normal' : 'practice' },
        npc: a.id, rng: F.rand, now: Date.now() });
      if (item && item.format === 'F22') { const r = await F.Task.run(item, { npc: a, place: 'shop', truth: correct, pay: true }); if (r) { r.f22 = true; return r; } }
    } catch (e) { console.error(e); }
  }
  await a.say('life_ble');
  const box = F.UI.el('div', 'lyesno');
  const h0 = F.UI.open(box, { cls: 'life-panel small', closable: false });
  const ch = F.UI.chips([{ value: true, label: 'Ja' }, { value: false, label: 'Nei' }], { kind: 'yesno', parent: box });
  let v = await ch.next(), tries = 1;
  if (v !== correct) { ch.mark(v, 'wrong'); F.sfx.bad(); await F.T.sleep(900); ch.clearMarks(); ch.solution(correct); v = await ch.next(); tries = 2; }
  ch.mark(v, 'right'); F.sfx.ok(); await F.T.sleep(500);
  ch.destroy(); h0.close();
  return { outcome: tries === 1 ? 'A' : 'C', tries };
}
Eco.npcBuy = async function (npcId, itemId, o) {
  o = o || {};
  const c = cat(itemId); if (!c) return false;
  const st = Eco.npc(npcId), a = F.Act.byId(npcId);
  if (st.coins < c.price) return false;
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    st.coins -= c.price; st.owned.push(itemId); if (st.piggy) st.piggy.have = st.coins;
    const wi = st.wishes.indexOf(itemId); if (wi >= 0) st.wishes.splice(wi, 1);
    refillWishes(npcId); if (st.piggy && st.piggy.goal === itemId) st.piggy = { goal: st.wishes[0], have: st.coins };
    F.store();
    const seen = !!(a && a.visible && a.visible() && !o.offscreen && Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) < 22 && a.space === F.Space.cur);
    if (o.bg) { BG.buys++; if (seen) BG.visible++; }
    F.emit('npcBought', npcId, itemId, { bg: !!o.bg, visible: seen, helped: !!o.helped });
    if (F.Quest && F.Quest.log) F.Quest.log('npcBought', o.helped ? { who: npcId, item: itemId, helped: true } : { who: npcId, item: itemId });
    if (a) staleBubble(a);
    settle(npcId);                                                  // wallet rule: never left able to afford the new top wish
    F.emit('npcCoins', npcId, st.coins, -c.price);
  };
  if (!a || !a.visible() || o.offscreen) { finish(); if (a && (c.kind === 'wear' || c.use === 'wear')) a.wear(itemId, 1, { silent: false }); return true; }
  const keptWish = o.keepWish ? a.wish : null;     // a white task / need bubble comes back after the purchase
  a.busy = true; a.clearWish();
  let kiosk = null;
  try {
    let counter = o.counter && F.Things.byId(o.counter.id) ? o.counter : o.bg ? null : findShopThing(a, c.shop);
    if (!counter) {
      const ang = a.heading + 0.8, kx = a.x + Math.sin(ang) * 3.2, kz = a.z + Math.cos(ang) * 3.2;
      const p = F.Act.freeSpot(kx, kz, a.space);
      kiosk = F.Things.spawn('life_kiosk', p.x, p.z, { space: a.space, ry: Math.atan2(a.x - p.x, a.z - p.z), data: { opts: { c: ['rose', 'sky', 'mint', 'lilac'][F.SHOP_ORDER.indexOf(c.shop) % 4] } } });
      F.FX.assemble('life_kiosk', { c: ['rose', 'sky', 'mint', 'lilac'][F.SHOP_ORDER.indexOf(c.shop) % 4] }, kiosk.obj, kiosk.obj.position, { ms: 900 });
      await F.T.sleep(950);
      counter = kiosk;
    }
    const dir = Math.atan2(a.x - counter.x, a.z - counter.z), r = (counter.radius || 0.8) + 0.75;
    await a.walkTo(counter.x + Math.sin(dir) * r, counter.z + Math.cos(dir) * r, { always: true, stopDist: 0.25 });
    a.face(counter.x, counter.z);
    const keeper = (F.SHOPS[c.shop] || {}).voice || 'vk';
    const rung = strandRung('T-MENGDE');
    const plant = o.plant != null ? o.plant : rung >= 5 && Math.random() < 0.25;
    const ask = o.ask != null ? o.ask : plant || (rung >= 5 && Math.random() < 0.15);
    const quiet = !!o.quiet && !ask;
    const pay = await payCounting(a, c.price, counter, plant && c.price >= 2 ? plant : false, quiet);
    if (ask) {
      const correct = pay.laid === c.price;
      const r2 = await askRiktig(a, correct, c.price);
      // v5 (#25): the F22 task already said «Ja, det ble riktig!» / «Oi! Jeg telte feil.» – one reaction per task end
      if (!correct) { if (!(r2 && r2.f22)) await a.say('life_feil'); pay.group.parent && pay.group.parent.remove(pay.group); const p2 = await payCounting(a, c.price, counter, false); pay.group = p2.group; }
      else if (!(r2 && r2.f22)) await a.say('life_riktig');
      F.emit('npcPayAsked', npcId, correct, r2);
    }
    if (!quiet) F.SAY('eco_vsg', null, keeper);
    await F.T.sleep(400);
    F.FX.sparkle(V3(counter.x, (counter.obj ? counter.obj.position.y : 0) + 1, counter.z));
    pay.group.parent && pay.group.parent.remove(pay.group);
    finish();
    // the item appears and gets used
    const use = c.use || 'play';
    a.face(F.Player.pos.x, F.Player.pos.z);
    if (use === 'wear' || c.kind === 'wear') await a.react('wear', itemId);
    else if (use === 'eat') await a.react('eat', itemId);
    else if (use === 'pet' || c.kind === 'pet') await a.react('pet', itemId);
    else if (use === 'ride' || c.ride) { if (!a.royal) await a.say('life_se'); await a.react('ride', itemId); }
    else if (use === 'music') await a.react('music', itemId);
    else if (use === 'place') await a.react('place', itemId);
    else await a.react('play', itemId);
    if (st.piggy && npcId === 'mia') F.emit('piggy', npcId, st.coins);
  } catch (e) { console.error('[npcBuy]', e); finish(); }
  finally {
    if (kiosk) { const k = kiosk; F.T.timeout(() => { F.FX.burst(V3(k.x, k.y + 0.8, k.z), { n: 30 }); F.sfx.pop(); F.Things.remove(k); }, 2500); }
    a.busy = false;
    if (keptWish && !a.wish && F.Act.all[a.id]) a.setWish(keptWish);
  }
  return true;
};
function strandRung(s) { try { const S = F.LEARN.summary(); return (S && S.strands && S.strands[s] && S.strands[s].rung) || 0; } catch (e) { return 0; } }
Eco.strandRung = strandRung;

/* ---------------------------------------------------------- her pet follows her */
F.Things.def('life_pet', {
  radius: 0.35, solid: false, reach: 1.6, name: 'kjæledyret',
  build() { return new THREE.Group(); },
  async press(th) {
    const c = cat(th.data.item);
    F.FX.pop(th.obj); F.Act.hearts(V3(th.x, th.obj.position.y + 0.9, th.z)); F.sfx.squeak();
    th.hop = 1.2;
    if (c && c.ride) { // ponni / føll: tap to ride
      if (!Eco.riding && RIDE.on) rideOff();                             // (12.10.) off the bike first
      Eco.riding = !Eco.riding;
      F.Player.speedMul = Eco.riding ? c.ride : 1;
      F.sfx[Eco.riding ? 'boing' : 'pop']();
    } else if (!F.Speech.busy || !F.Speech.busy()) F.SAY('life_an_dyr');   // «Den liker deg!»
    await F.T.sleep(600);
  },
});
Eco.setPet = function (id) {
  const s = shop(); s.pet = id; F.store();
  if (Eco.petTh) { F.Things.remove(Eco.petTh); Eco.petTh = null; }
  Eco.riding = false; if (!RIDE.on) F.Player.speedMul = 1;
  if (!id) return;
  const c = cat(id); if (!c) return;
  const P = F.Player.pos;
  const th = Eco.petTh = F.Things.spawn('life_pet', P.x + 1, P.z + 1, { id: 'life_pet', space: F.Space.cur, data: { item: id } });
  const mid = F.CAT.mid(c);
  const m = F.Act.fitModel(mid, c.opts, c.ride ? 1.1 : 0.85);
  th.obj.add(m); th.model = m; th.bboxDirty = true;
};
F.on('tick', (dt, t) => {
  const th = Eco.petTh; if (!th) return;
  const P = F.Player.pos;
  if (th.space !== F.Space.cur) { th.obj.parent && th.obj.parent.remove(th.obj); F.Space.scene().add(th.obj); th.space = F.Space.cur; th.x = P.x + 1; th.z = P.z + 1; }
  if (Eco.riding) { th.x = P.x; th.z = P.z; th.obj.position.set(P.x, P.y - 0.05, P.z); th.obj.rotation.y = F.Player.heading; if (F.Player.obj) F.Player.obj.position.y = P.y + 0.75; return; }
  const d = Math.hypot(P.x - th.x, P.z - th.z), x0 = th.x, z0 = th.z;
  if (d > 1.5) { const k = Math.min(1, (d - 1.5) * dt * 3); th.x += (P.x - th.x) * k; th.z += (P.z - th.z) * k; th.obj.rotation.y = Math.atan2(P.x - th.x, P.z - th.z); }
  if (d > 14) { th.x = P.x + 1; th.z = P.z + 1; }
  th.hop = Math.max(0, (th.hop || 0) - dt);
  // walking = really moving (speed), smoothed so the legs don't flicker between frames
  const sp = dt > 0 ? Math.hypot(th.x - x0, th.z - z0) / dt : 0;
  th.walkK = (th.walkK || 0) + ((sp > 0.4 ? 1 : 0) - (th.walkK || 0)) * Math.min(1, dt * 8);
  const gy = F.Space.heightAt(th.x, th.z), moving = th.walkK > 0.5;
  // MODELS-2 rig: legs walk, tails wag (fast when happy), wings flap; hop-rigs (kanin, marsvin) hop along
  let bob = moving ? Math.abs(Math.sin(t * 11)) * 0.12 : 0;
  if (F.Rig && th.model && th.model.userData && th.model.userData.parts) {
    const st = { moving, happy: th.hop > 0 || !moving };
    try { F.Rig.tick(th.model, t, st); if (F.Rig.kind(th.model) !== 'none') bob = F.Rig.bob(th.model, t, st); } catch (e) { /* not a rigged model */ }
  }
  th.obj.position.set(th.x, gy + bob + Math.abs(Math.sin(th.hop * 9)) * 0.25 * (th.hop > 0 ? 1 : 0), th.z);
});

/* ---------------------------------------------------------- 12.10. economy plan §3.4: every purchase does something
   Ride toys: one 'life_ride' thing (her latest / chosen ride toy). Parked: it stands on the ground (twinkling until her first ride).
   A tap: she rides (speed × row.ride, the toy under her). A tap on it again: she gets off and it stays parked there. Far away (> 90 m)
   while she is outdoors, or left in another space: it waits at her tower door (or comes out with her when she leaves a building). */
const RIDE = Eco.rideSt = { th: null, on: false, lift: 0.55 };
Eco.rideItem = () => shop().ride || null;
Eco.riding2 = () => RIDE.on;
function rideHome() { const o = (F.Tower && F.Tower.outside) || { x: 80, z: -85.8 }; return { x: o.x + 2.4, z: o.z + 1.4 }; }
function rideModel(th, c) {
  if (th.model) { th.obj.remove(th.model); th.model = null; }
  const mid = F.CAT.mid(c); if (!mid) return;
  const m = F.Act.fitModel(mid, c.opts || {}, /skøyte/.test(c.id) ? 0.75 : 1.3);
  th.obj.add(m); th.model = m; th.bboxDirty = true;
}
function spawnRide(nearHer) {
  const s = shop(), id = s.ride, c = id && cat(id);
  if (RIDE.on) rideOff();
  if (RIDE.th) { F.Things.remove(RIDE.th); RIDE.th = null; }
  if (!c || !F.Things || !F.Player) return null;
  let p, space;
  if (nearHer && F.Space) {
    const P = F.Player.pos; space = F.Space.cur; p = { x: P.x + Math.sin(F.Player.heading + 1.2) * 1.4, z: P.z + Math.cos(F.Player.heading + 1.2) * 1.4 };
    try { if (F.Act && F.Act.freeSpot) { const q = F.Act.freeSpot(p.x, p.z, space); if (q && q.x != null) p = { x: q.x, z: q.z }; } } catch (e) { /* keep p */ }
  } else { p = rideHome(); space = 'out'; }
  const th = RIDE.th = F.Things.spawn('life_ride', p.x, p.z, { id: 'life_ride', space, data: { item: id } });
  rideModel(th, c);
  return th;
}
Eco.spawnRide = spawnRide;
function rideOn() {
  const s = shop(), c = cat(s.ride); if (!c || !RIDE.th || RIDE.th.space !== F.Space.cur) return false;
  if (Eco.riding) Eco.riding = false;                                  // off the pony first
  RIDE.on = true; F.Player.speedMul = c.ride || 1.3;
  (s.rode = s.rode || {})[c.id] = F.save.day || 1; F.store();
  F.sfx.boing && F.sfx.boing(); F.FX.sparkle(V3(F.Player.pos.x, F.Player.pos.y + 0.6, F.Player.pos.z), 0xfff2a8);
  F.emit('ride', c.id, true);
  return true;
}
function rideOff(stay) {
  if (!RIDE.on) return false;
  RIDE.on = false; if (!Eco.riding) F.Player.speedMul = 1;
  const th = RIDE.th;
  if (th && !stay) { const P = F.Player.pos, h = F.Player.heading + 1.6; th.x = P.x + Math.sin(h) * 0.9; th.z = P.z + Math.cos(h) * 0.9; }
  F.sfx.pop && F.sfx.pop(); F.emit('ride', shop().ride, false);
  return true;
}
Eco.toggleRide = () => RIDE.on ? rideOff() : rideOn();
F.Things.def('life_ride', {
  radius: 0.45, solid: false, reach: 2.6, name: 'sykkelen',
  build() { return new THREE.Group(); },
  async press(th) { F.FX.pop(th.obj); Eco.toggleRide(); await F.T.sleep(250); },
});
function moveThingTo(th, space, x, z) {
  if (th.space !== space) { th.obj.parent && th.obj.parent.remove(th.obj); try { F.Space.scene(space).add(th.obj); } catch (e) { return; } th.space = space; }
  th.x = x; th.z = z;
}
let rideAcc = 0, twinkleT = 0;
F.on('tick', (dt, t) => {
  const th = RIDE.th; if (!th || !th.obj || !F.Player) return;
  const P = F.Player.pos;
  if (RIDE.on) {
    if (th.space !== F.Space.cur) { rideOff(true); return; }          // into a building: it stays parked outside, where she left it
    th.x = P.x; th.z = P.z;
    th.obj.position.set(P.x, F.Space.heightAt(P.x, P.z) + 0.02, P.z); th.obj.rotation.y = F.Player.heading;
    if (F.Player.obj) F.Player.obj.position.y = P.y + RIDE.lift + (F.Player.moving ? Math.abs(Math.sin(t * 9)) * 0.03 : 0);
    return;
  }
  if (th.space === F.Space.cur) th.obj.position.set(th.x, F.Space.heightAt(th.x, th.z) + 0.02, th.z);
  rideAcc += dt; if (rideAcc < 2) return; rideAcc = 0;
  if (F.Space.cur === 'out' && th.space !== 'out') { const q = { x: P.x + 1.2, z: P.z + 1 }; moveThingTo(th, 'out', q.x, q.z); }   // she came out: it comes with her
  else if (F.Space.cur === 'out' && Math.hypot(th.x - P.x, th.z - P.z) > 90) { const h = rideHome(); moveThingTo(th, 'out', h.x, h.z); }
  // never ridden yet: a soft twinkle invites the first tap (the «special thing to tap here» signal)
  const s = shop();
  if (th.space === F.Space.cur && !(s.rode || {})[s.ride] && Math.hypot(th.x - P.x, th.z - P.z) < 18 && (twinkleT = (twinkleT + 1) % 2) === 0)
    F.FX.sparkle(V3(th.x, F.Space.heightAt(th.x, th.z) + 0.9, th.z), 0xfff2a8);
});

/* Glitter trails: while she moves, sparkles in the trail's colours fall behind her (rosa / gull / regnbue). On / off: «Bruk» in
   Tryllebua or the mirror in Garderoben (things_castle.js). */
const TRAIL_COL = { glittersti_rosa: [0xff7fb0, 0xffc1dc, 0xffffff], glittersti_gull: [0xffd84a, 0xfff0a0, 0xffb627],
  glittersti_regnbue: [0xff5a5a, 0xffa94d, 0xffe066, 0x6ee08a, 0x6fcaf0, 0xb57cff] };
Eco.trail = () => { const s = F.save.shop; return s && s.trail && !s.trailOff && (s.owned || {})[s.trail] > 0 ? s.trail : null; };
Eco.setTrail = id => { const s = shop(); if (id) { s.trail = id; s.trailOff = false; } else s.trailOff = true; F.store(); F.emit('trail', Eco.trail()); return Eco.trail(); };
let trailAcc = 0;
F.on('tick', dt => {
  if (!F.Player || !F.Player.moving || F.flags.collect) return;
  const id = Eco.trail(); if (!id) return;
  trailAcc += dt; if (trailAcc < 0.06) return; trailAcc = 0;
  const P = F.Player.pos, h = F.Player.heading;
  F.FX.burst(V3(P.x - Math.sin(h) * 0.35, F.Space.heightAt(P.x, P.z) + 0.25, P.z - Math.cos(h) * 0.35),
    { kind: 'sparkle', n: 3, colors: TRAIL_COL[id] || TRAIL_COL.glittersti_rosa, speed: 0.25, up: 0.35, life: 1.3, size: 0.09, gravity: 0.6, spread: 0.7 });
});

/* Instruments: each one she owns stands in an arc in front of Musikkpaviljongen (park, facing the path); a tap plays it. */
const PAV = { x: 22, z: 76 }, INSTR_ORDER = ['fløyte', 'tromme', 'xylofon', 'gitar', 'harpe'];
function pavPos() { const t = F.Things && F.Things.byId('p_paviljong'); return t ? { x: t.x, z: t.z } : PAV; }
function syncInstr(fresh) {
  if (!F.Things || !F.Act) return 0;
  const p = pavPos(); let n = 0;
  for (const c of F.CAT.filter(c => c.instr && Eco.owned(c.id) > 0)) {
    const tid = 'life_instr_' + c.id; if (F.Things.byId(tid)) continue;
    const k = Math.max(0, INSTR_ORDER.indexOf(c.id)), a = (k - 2) * 0.4, x = p.x + Math.sin(a) * 5.2, z = p.z - Math.cos(a) * 5.2;
    const th = F.Things.spawn('life_instr', x, z, { id: tid, space: 'out', ry: Math.atan2(x - p.x, z - p.z), data: { item: c.id } });
    const mid = F.CAT.mid(c); if (!mid) continue;
    const m = F.Act.fitModel(mid, c.opts || {}, ({ harpe: 1.6, fløyte: 0.95, xylofon: 1.35, gitar: 1.25, tromme: 1.15 })[c.id] || 1.2);
    th.obj.add(m); th.model = m; th.bboxDirty = true; n++;
    if (fresh === c.id && F.Space.cur === 'out') try { F.FX.assemble(mid, c.opts || {}, m, V3(x, th.obj.position.y, z), { ms: 1200 }); } catch (e) { /* plain */ }
  }
  return n;
}
Eco.syncInstr = syncInstr;
const SONG = { fløyte: [7, 9, 11, 12, 11, 9, 7], xylofon: [0, 2, 4, 5, 7], harpe: [7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26] };
async function playInstr(th) {
  if (th._playing) return; th._playing = true;
  const id = th.data.item, m = th.model || th.obj, base = th.obj.position.y || 0;
  const note = i => F.FX.burst(V3(th.x, base + 1.1 + i * 0.05, th.z), { kind: 'star', n: 3, colors: [0xffd84a, 0xff7fb0, 0x9ad6ff], speed: 0.6, up: 1.4, life: 0.9, size: 0.08 });
  const bob = (h, ms) => F.T.tween(ms, k => { m.position.y = Math.sin(k * Math.PI) * h; });
  F.emit('instrPlay', id);
  try {
    if (id === 'tromme') { for (let i = 0; i < 4; i++) { F.sfx.thud(); note(i); await F.T.tween(230, k => { m.scale.y = 1 - 0.12 * Math.sin(k * Math.PI); }); await F.T.sleep(i === 1 ? 160 : 60); } m.scale.y = 1; }
    else if (id === 'gitar') { for (const r of [0, 1]) { for (const s of [0, 4, 7, 12, 16, 19]) { F.sfx.pluck(F.note(s - 5 + r * 5)); await F.T.sleep(45); } note(r); bob(0.06, 300); await F.T.sleep(420); } }
    else { const seq = SONG[id] || SONG.xylofon; for (let i = 0; i < seq.length; i++) { if (id === 'fløyte') F.sfx.tone(F.note(seq[i] + 12), 0.3, 'sine', 0.11); else F.sfx.pluck(F.note(seq[i] + (id === 'xylofon' ? 12 : 0))); if (i % 2 === 0) note(i); if (id !== 'harpe') bob(0.05, 160); await F.T.sleep(id === 'harpe' ? 85 : id === 'fløyte' ? 260 : 190); } }
  } finally { m.position.y = 0; th._playing = false; }
}
F.Things.def('life_instr', {
  radius: 0.5, solid: false, reach: 2.6, name: 'instrumentet',
  build() { return new THREE.Group(); },
  async press(th) { await playInstr(th); },
});

/* «Bruk» on a one-of item she owns (shop panel): what it does → 'worn' | 'off' | 'pet' | 'placed' | 'ride' | 'trail' | 'trailOff' |
   'music' | 'plot' | 'wand' | null */
Eco.use = function (id) {
  const c = cat(id), s = shop(); if (!c || !Eco.has(c)) return null;
  if (c.rideToy) { s.ride = id; F.store(); spawnRide(true); return 'ride'; }
  if (c.kind === 'magic' && c.slot === 'sti') return Eco.trail() === id ? (Eco.setTrail(null), 'trailOff') : (Eco.setTrail(id), 'trail');
  if (c.instr) { syncInstr(); return 'music'; }
  if (c.kind === 'wear' || (c.kind === 'gear' && F.Fairy && F.Fairy.WEAR && F.Fairy.WEAR[id])) {
    if (!F.Fairy || !F.Fairy.wear) return null;
    const worn = Object.values((F.save.wear && !Array.isArray(F.save.wear)) ? F.save.wear : {});
    if (worn.includes(id) && c.kind === 'wear') { F.Fairy.unwear(F.Fairy.slotOf ? F.Fairy.slotOf(id) : c.slot); return 'off'; }
    F.Fairy.wear(id); return 'worn';
  }
  if (c.kind === 'pet') { if (s.pet !== id || !Eco.petTh) Eco.setPet(id); else { F.FX.pop(Eco.petTh.obj); Eco.petTh.hop = 1.2; } return 'pet'; }
  if (c.kind === 'slot') { Eco.place(id, c.slot); return 'placed'; }
  if (c.kind === 'pack') return 'wand';
  if (c.kind === 'ride' || c.slot === 'tomt') return 'plot';
  return null;
};
F.on('ready', () => {
  const s = shop();
  // an older save: a ride toy she bought before 12.10. went into the basket – it is her ride now (parked at her tower door)
  if (!s.ride) { const old = F.CAT.filter(c => c.rideToy && (s.owned[c.id] || 0) > 0).pop(); if (old) { s.ride = old.id; F.store(); } }
  // …and a ride toy is never a basket thing any more (it would show twice: parked at the door and in Puff's basket); the shelf refills
  if (s.basket.some(x => { const c = cat(x); return c && c.rideToy; })) {
    s.basket = s.basket.filter(x => { const c = cat(x); return !(c && c.rideToy); });
    while (s.shelf && s.shelf.length && s.basket.length < BASKET_MAX) s.basket.push(s.shelf.shift());
    F.store(); F.emit('basket', s.basket.slice());
  }
  try { if (s.ride) spawnRide(false); } catch (e) { console.error(e); }
  try { syncInstr(); } catch (e) { console.error(e); }
});
// instruments are spawned outdoors – if the park is not up at 'ready', try again when she is out
let instrAcc = 0;
F.on('tick', dt => { instrAcc += dt; if (instrAcc < 5) return; instrAcc = 0; if (F.booted && F.Space.cur === 'out' && F.CAT.some(c => c.instr && Eco.owned(c.id) > 0 && !F.Things.byId('life_instr_' + c.id))) syncInstr(); });

/* ---------------------------------------------------------- build plots: hook any 'tomt' thing, keep saved items visible */
// the ground point under the last tap on a plot: the same tap picked again with that plot left out (pointer position from a
// capture-phase listener, before input.js handles the tap) – an empty plot with nothing to place turns it into a ground tap
let lastTap = null, lastPtr = null, plotHintT = -1e9, plotHints = 0;
addEventListener('pointerup', e => { lastPtr = { x: e.clientX, y: e.clientY }; }, true);
F.on('worldClick', hit => {
  lastTap = null;
  const th = hit && hit.thing;
  if (!th || !lastPtr || !(th.def && (th.def.plot || /tomt/.test(th.type)))) return;
  const was = th.hidden;
  try {
    th.hidden = true;
    const h = F.Input.pick(lastPtr.x, lastPtr.y);
    if (h && h.point && !h.hook) lastTap = { th, t: F.T.now, g: h.point.clone() };
  } catch (e) { lastTap = null; }
  finally { th.hidden = was; }
});
let plotAcc = 0;
F.on('tick', dt => {
  plotAcc += dt; if (plotAcc < 1.2) return; plotAcc = 0;
  const s = shop();
  for (const th of F.Things.list) {
    const isPlot = th.def && (th.def.plot || /tomt/.test(th.type));
    if (!isPlot) continue;
    if (!th.def.press && !th.def.beh) th.def = Object.assign({}, th.def, { press: t => Eco.plotPress(t) });
    if ((s.plots[th.id] || null) !== (th._lifeItem || null)) Eco.decoratePlot(th);
  }
});

/* ---------------------------------------------------------- background shopping (review fix WP9 #1): every 45–60 s somebody
   within 15 m of her buys something ON SCREEN – walks to a stall near her (or a little cart rolls in next to them), lays the coins
   on the counter one by one, then eats / wears / plays with it. Villagers (also those with a white task/need bubble – the bubble
   comes back after the purchase – also a quest giver's gold one; an 'item' bubble is the thing they buy), staff outdoors and the kingdom royals at their market
   (never counting aloud: they have no counting voice). Home royals keep their piggy bank (they buy at day start). Market keepers
   never buy from themselves. Who can afford their top wish buys it; everybody else buys a small treat with pocket money (their
   savings stay as they are, so her pocket-money help still counts). Counting aloud only when she is close and (12.10.) once a session.
   F.Eco.bg = {tries, buys, visible, last, inTest}  (inTest: also run under #test – the shop2_npcbuy test sets it). */
const BG = Eco.bg = { tries: 0, buys: 0, visible: 0, last: null, inTest: false, aloudT: -1e9 };
let bgAcc = 0, bgNext = 30;
const TREAT_KINDS = ['food', 'toy'], NOT_TREAT = { godbiter: 1, fiskemat: 1, gulrøtter: 1, tassbein: 1 };   // animal food is not a treat
function bgBuyer(a) {
  if (!a || a.kind !== 'person' || a.busy || a.temp || a.owner || a.act || a.path || ROYAL[a.id]) return false;
  if (a.spot && a.spot.shop) return false;                                                     // market keepers
  if (a.wish && !['item', 'task', 'need', 'quest'].includes(a.wish.kind)) return false;       // (a 'stall' bubble: never)
  if (!a.visible()) return false;
  return a.royal ? a.space === 'out' : (a.id.startsWith('v_') || !!CAST_ECO[a.id]);
}
const CAST_ECO = { kokk: 1, tor: 1, per: 1, siv: 1, rolf: 1 };
// a stall near both of them (the NPC walks there on screen); its shop id
function bgStall(a) {
  const P = F.Player.pos; let best = null, bd = 14;
  for (const t of F.Things.list) {
    if (t.space !== a.space || !t.obj) continue;
    const raw = (t.data && t.data.shop) || (t.def && t.def.shop); if (!raw) continue;
    const sid = typeof raw === 'string' && F.SHOPS[raw] ? raw : (F.Towns && F.Towns.stallShop ? F.Towns.stallShop(t) : null);
    if (!sid || !F.SHOPS[sid] || Math.hypot(t.x - P.x, t.z - P.z) > 20) continue;
    const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; best = { th: t, shop: sid }; }
  }
  return best;
}
// v5 (#41): a treat they can pay with their REAL coins (no invented pocket money), preferably from the stall they walk to
function bgTreat(a, shopId, coins) {
  const r = U.rng(U.hashStr(a.id + '|t|' + (F.save.day || 1) + '|' + BG.tries));
  const ok = c => c && c.price <= 20 && (coins == null || c.price <= coins) && TREAT_KINDS.includes(c.kind) && !NOT_TREAT[c.id] && F.CAT.mid(c) && !c.ride && !c.gear;
  let pool = shopId ? F.CAT.filter(c => c.shop === shopId && ok(c)) : [];
  if (!pool.length && a.royal && F.Towns && F.Towns.realmShop) { const rs = F.Towns.realmShop(a.royal); if (rs) pool = F.CAT.filter(c => c.shop === rs && ok(c)); }
  if (!pool.length) pool = F.CAT.filter(c => ok(c) && !c.realm);
  return pool.length ? U.pick(r, pool) : null;
}
F.on('tick', dt => {
  bgAcc += dt; if (bgAcc < bgNext) return;
  if (!F.booted || (F.flags.test && !BG.inTest) || F.Task.current || F.UI.isOpen() || F.Space.cur !== 'out' || F.Player.frozen) { bgAcc = bgNext - 5; return; }   // look again in 5 s
  bgAcc = 0; bgNext = 45 + F.rand() * 15;
  BG.tries++;
  const P = F.Player.pos;
  const cand = F.Act.near(P.x, P.z, 15, 'out').filter(bgBuyer);
  if (!cand.length) { bgNext = 12; return; }                                                   // nobody near: look again soon
  // free hands first (no bubble / an 'item' bubble), then white task / need bubbles, then a quest giver (the bubble comes back)
  const tier = a => !a.wish || a.wish.kind === 'item' ? 0 : a.wish.kind === 'quest' ? 2 : 1, best = Math.min(...cand.map(tier));
  const a = U.pick(F.rand, cand.filter(x => tier(x) === best)), st = Eco.npc(a.id);
  const stall = bgStall(a);
  // what they buy: their top wish when they can afford it (rare under the wallet rule), else a small treat paid with their real coins
  let id = st.wishes[0], c = id && cat(id);
  if (!c || c.price > 20 || st.coins < c.price || a.royal) {
    c = bgTreat(a, stall && stall.shop, st.coins); if (!c) { bgNext = 12; return; }
    id = c.id;
  }
  const near = Math.hypot(a.x - P.x, a.z - P.z) < 12;
  // economy plan §1 row 21 (12.10.): a villager counts aloud at the counter ONCE a session; after that the coins clink silently
  const aloud = near && !a.royal && a.cvoice && !BG.aloudSaid && !(F.Speech && F.Speech.busy && F.Speech.busy());
  if (aloud) { BG.aloudT = F.T.now; BG.aloudSaid = true; }
  BG.last = { who: a.id, item: id, t: +F.T.now.toFixed(1), stall: stall ? stall.th.id : null, aloud: !!aloud, wish: a.wish ? a.wish.kind : null };
  // the counter only when that stall really sells it (a dress is never bought at the bakery stall); else their own shop or the cart
  Eco.npcBuy(a.id, id, { quiet: !aloud, plant: false, ask: false, keepWish: !!a.wish && !(a.wish.kind === 'item' && a.wish.itemId === id), counter: stall && stall.shop === c.shop ? stall.th : null, bg: true });
});

/* ---------------------------------------------------------- villagers' purchases stay at their house (DESIGN §8.5.5)
   A villager who buys a garden / play / ride item keeps it next to their front door: F.save.life.home[houseThingId] = [itemIds]
   (newest 3). The house is the villager's own door thing (WORLD 'v_husdor' via spot.doorThingId), the nearest door to their
   spot, or a Q17 house ('life_nyhus'). Shown again whenever that chunk is loaded. */
const HOME = () => { const l = F.save.life = F.save.life || {}; l.home = l.home || {}; return l.home; };
const homeWorthy = c => !!c && (['plot', 'toy', 'slot', 'ride'].includes(c.kind) || c.use === 'music') && !(c.price > 40);
function houseOf(a) {
  if (!a || a.space !== 'out') return null;
  if (a.house && F.Things.byId(a.house)) return a.house;
  const sp = a.spot || {};
  if (sp.doorThingId) return sp.doorThingId;
  const base = sp.x != null ? sp : a;
  let best = null, bd = 24;
  for (const t of F.Things.list) { if (t.type !== 'v_husdor' && t.type !== 'life_nyhus') continue; const d = Math.hypot(t.x - base.x, t.z - base.z); if (d < bd) { bd = d; best = t; } }
  return best ? best.id : null;
}
Eco.houseOf = houseOf;
Eco.homeItems = key => (HOME()[key] || []).slice();
F.on('npcBought', (npcId, itemId) => {
  const c = cat(itemId); if (!homeWorthy(c) || !(npcId.startsWith('v_') || npcId.startsWith('nabo_'))) return;
  const a = F.Act && F.Act.byId(npcId), key = houseOf(a); if (!key) return;
  const L = HOME()[key] = HOME()[key] || []; L.push(itemId); if (L.length > 3) L.shift();
  F.store();
  const th = F.Things.byId(key); if (th) decorateHome(th, true);
});
const HOME_SPOTS = { v_husdor: [[-1.8, 0.9], [1.8, 0.9], [-3.0, 1.5]], life_nyhus: [[-3.0, 3.0], [3.0, 3.0], [-3.0, 4.4]] };
function decorateHome(th, animate) {
  const items = HOME()[th.id] || [], sig = items.join(',');
  if (th._homeSig === sig) return;
  th._homeSig = sig;
  if (th._homeG) { th._homeG.parent && th._homeG.parent.remove(th._homeG); th._homeG = null; }
  if (!items.length) return;
  const g = new THREE.Group(), sc = th.obj.scale.x || 1; g.scale.setScalar(1 / sc);
  const spots = HOME_SPOTS[th.type] || HOME_SPOTS.v_husdor;
  items.forEach((id, i) => {
    const c = cat(id), mid = F.CAT.mid(c); if (!mid) return;
    const w = c.kind === 'plot' ? 1.3 : c.ride ? 1.1 : c.kind === 'slot' ? 0.8 : 0.6;
    const m = F.Act.fitModel(mid, c.opts || {}, w); const [lx, lz] = spots[i % spots.length];
    m.position.set(lx, 0.02, lz); m.rotation.y = (i % 2 ? -0.4 : 0.4);
    g.add(m);
    if (animate && i === items.length - 1) { const wp = new THREE.Vector3(); th.obj.updateMatrixWorld(true); th.obj.localToWorld(wp.set(lx * sc, 0, lz * sc)); F.T.timeout(() => F.FX.sparkle(wp.setY(wp.y + 0.6), 0xfff2a8), 100); }
  });
  th.obj.add(g); th._homeG = g; th.bboxDirty = true;
}
Eco.decorateHome = decorateHome;
let homeAcc = 0;
F.on('tick', dt => {
  homeAcc += dt; if (homeAcc < 1.5) return; homeAcc = 0;
  const H = HOME(); if (!Object.keys(H).length) return;
  for (const key in H) { const th = F.Things.byId(key); if (th && th.obj && th._homeSig !== (H[key] || []).join(',')) decorateHome(th); }
});

/* ---------------------------------------------------------- day start: allowance, royals buy their top wish */
// v5 wallet rule (logic §3-A): after the allowance EVERY wallet (Mia's too) buys an affordable top wish offscreen and then wishes for
// something above its coins – so nobody asks her for coins they don't need. 'npcCoins' refreshes Mia's piggy plaque (#22).
F.on('dayStart', day => {
  const all = F.save.npcs = F.save.npcs || {};
  ['konge', 'dronning', 'mia', 'kokk', 'tor', 'per', 'siv', 'rolf'].forEach(id => Eco.npc(id));
  for (const id in all) {
    const st = all[id], r = U.rng(U.hashStr(id + '|a|' + day)), add = ROYAL[id] ? U.int(r, 4, 6) : U.int(r, 2, 4);
    st.coins += add;
    if (st.piggy) st.piggy.have = st.coins;
    if (!st.wishes.length) refillWishes(id);
    settle(id);
    F.emit('npcCoins', id, st.coins, add);
  }
  F.store();
});
// a stale item bubble (the wish was bought / given, or they can afford it now) goes – the bubble never shows an old price (#16)
function staleBubble(a) {
  if (!a || !a.wish || a.wish.kind !== 'item') return;
  const st = Eco.npc(a.id), c = cat(st.wishes[0]);
  if (a.wish.itemId !== st.wishes[0] || !c || c.price <= st.coins) a.clearWish();
}
Eco.staleBubble = staleBubble;
let bubAcc = 0, giftAcc = 0;
F.on('tick', dt => {
  bubAcc += dt; giftAcc += dt; if (bubAcc < 2) return; bubAcc = 0;
  if (!F.Act || !F.Act.list) return;
  for (const a of F.Act.list) if (a.wish && a.wish.kind === 'item' && !a.busy) staleBubble(a);
  // D5 (verify 2nd round): a gift bubble goes when the gift is no longer for them (given away, declined, they have all they need)
  for (const a of F.Act.list) if (a.wish && a.wish.kind === 'gift' && !a.busy && !giftOffer(a).includes(a.wish.itemId)) a.clearWish();
  // … and one appears (at most one near her at a time, every ~15 s) over someone she carries a gift for
  if (giftAcc < 15 || !F.booted || F.Task.current || F.UI.isOpen()) return; giftAcc = 0;
  if (!shop().basket.length || !F.Player || !F.Act.near) return;
  const P = F.Player.pos, near = F.Act.near(P.x, P.z, 35, F.Space.cur).filter(a => a.kind === 'person' && !a.royal && !a.owner && !a.temp && a.here());
  if (near.some(a => a.wish && a.wish.kind === 'gift')) return;
  const c = near.filter(a => !a.wish && !a.busy && giftOffer(a).length).sort((x, y) => Math.hypot(x.x - P.x, x.z - P.z) - Math.hypot(y.x - P.x, y.z - P.z))[0];
  if (c) Eco.giftBubble(c);
});
F.on('ready', () => {
  const s = shop();
  if (s.pet) try { Eco.setPet(s.pet); } catch (e) { console.error(e); }
});

/* ---------------------------------------------------------- debug helpers */
F.dbg = F.dbg || {};
F.dbg.buy = (id, free) => Eco.buy(id, { via: 'dbg', free: free !== false });
if (!F.dbg.newDay) F.dbg.newDay = () => { F.save.day = (F.save.day || 1) + 1; F.store(); F.emit('dayStart', F.save.day); return F.save.day; };
F.dbg.npc = id => Eco.npc(id);
})();
