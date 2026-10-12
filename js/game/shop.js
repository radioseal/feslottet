/* Feslottet – LIFE: shops (DESIGN §8.3–8.4). Owner: LIFE.
   F.Shop.open(shopId, {keeperVoice}) -> Promise (resolves when the panel closes)
     Panel = wooden shelves with REAL rendered 3D thumbnails and separate gold price chips (numbers never touch).
     Tap an item → it spins (8 rendered angles) and the shopkeeper says «Det koster 15.» (12.10. economy plan §1: once per item per
     visit; a price ≥ 100 is shown, never spoken – «Den koster mye. Se på prislappen.» once per visit).
     Buy → F12 «Betal riktig» at her level, else the purse pays → spend → F.Eco.grant → «Vær så god!» (no «Du kjøpte …»); the
     «where it went» line once per kind ever (F.Eco.sayOnce).
     The button shows what a tap does (12.10. §3.4): coin ✓ = buy; «Bruk» = a one-of item she owns (F.Eco.use: wear / take off,
     ride, pet, room, trail on / off); the full basket, dimmed = Puff's basket (12) is full, nothing is sold into it.
     Can't afford (shown at once when she picks it) → her coins and the price as two number tiles, the bar model (gold = hers,
     hatched «?» = still missing) and «Jeg vil spare til denne!» (F.Eco.setGoal + the clarity goal card F.Goal.setSaving, if present);
     «Du har ikke nok mynter ennå.» once ever.
   Thing type 'life_shop' (data.shop = shop id): a market stall that opens its shop. CASTLE/WORLD may spawn it or call F.Shop.open
   from their own shop things.   F.Shop.buy(itemId) -> Promise<bool> (the paying flow without the panel; tests).
   WP9: open(shopId, {thing, realm, select}) – shopId true/'true' resolves via F.Towns.stallShop(thing); themed shops (and Tryllebua in
   Regnbueslottet) get a skin class th-<theme> (css/shop.css); ≤ 9 items use roomy 2-row shelves; the dream item has a golden card;
   gear is one-of (shop_har); event 'shopBuy' (shopId, itemId, realmId|null) after every purchase (WP8 RQ6 'shop' steps listen).
   Fallback models drawn here (only if nobody else defined them): mag_bok mag_glittersti mag_fyrverkeri mag_regnbuemaskin mag_snøkule
   life_sparegris life_gaveeske. */
(function () {
'use strict';
const F = window.F, U = F.U;
const el = (t, c, h) => F.UI.el(t, c, h);
const def = (id, d) => { if (!F.VOX.has(id)) F.VOX.def(id, Object.assign({ scale: 1 / 16, meta: { group: 'life' } }, d)); };

/* ---------------------------------------------------------- fallback models (Tryllebua, piggy bank, gift box) */
def('mag_bok', { size: [14, 6, 16], build(v, o) {
  const c = o.c || 'lilac';
  v.box(1, 0, 1, 12, 5, 14, c); v.box(2, 1, 1, 12, 4, 13, 'cream'); v.box(1, 0, 1, 1, 5, 14, 'gold');
  v.box(4, 5, 4, 9, 5, 11, 'gold'); v.box(6, 5, 6, 7, 5, 9, 'white');
} });
def('mag_glittersti', { size: [16, 3, 16], build(v, o) {
  const cols = o.c === 'gold' ? ['gold', 'butter', 'honey'] : o.c === 'rainbow' ? ['red', 'orange', 'yellow', 'green', 'sky', 'purple'] : ['pink', 'blossom', 'rose'];
  for (let i = 0; i < 5; i++) { const x = 1 + i * 3, z = 2 + (i % 2) * 6; v.box(x, 0, z, x + 2, 0, z + 4, cols[i % cols.length]); v.set(x + 1, 1, z + 2, 'white'); }
  for (let i = 0; i < 6; i++) v.set(2 + i * 2, 2, 7 + (i % 3) - 1, cols[(i + 1) % cols.length]);
} });
def('mag_fyrverkeri', { size: [12, 22, 12], build(v) {
  v.cyl(6, 0, 6, 3, 12, 'red'); v.cyl(6, 4, 6, 3, 2, 'white'); v.cyl(6, 9, 6, 3, 1, 'gold'); v.cone(6, 12, 6, 3.5, 5, 'gold');
  v.line(6, 17, 6, 6, 20, 6, 'woodDark'); v.set(6, 21, 6, 'flame');
} });
def('mag_regnbuemaskin', { size: [20, 22, 14], build(v) {
  v.box(3, 0, 3, 16, 9, 11, 'sky'); v.box(4, 9, 4, 15, 10, 10, 'white'); v.box(5, 3, 11, 14, 7, 11, 'white');
  v.set(7, 5, 12, 'red'); v.set(9, 5, 12, 'yellow'); v.set(11, 5, 12, 'green');
  const cols = ['red', 'orange', 'yellow', 'green', 'sky', 'purple'];
  cols.forEach((c, i) => { const r = 9 - i; for (let a = 0; a <= 16; a++) { const t = a / 16 * Math.PI; v.set(Math.round(10 - Math.cos(t) * r), Math.round(10 + Math.sin(t) * r * 1.2), 7, c); } });
} });
def('mag_snøkule', { size: [14, 16, 14], build(v) {
  v.box(2, 0, 2, 11, 2, 11, 'woodRed'); v.sphere(6.5, 8.5, 6.5, 6, 'glass');
  v.box(5, 3, 5, 8, 6, 8, 'snow'); v.cone(6.5, 6, 6.5, 2, 4, 'leaf'); v.set(4, 10, 6, 'white'); v.set(9, 12, 7, 'white'); v.set(7, 13, 4, 'white');
} });
def('life_sparegris', { size: [18, 14, 12], build(v) {
  v.ellipsoid(8.5, 7, 6, 7, 5.5, 5, 'pink'); v.box(15, 5, 4, 16, 8, 7, 'rose'); v.set(16, 6, 5, 'woodDark'); v.set(16, 6, 6, 'woodDark');
  for (const [x, z] of [[4, 3], [12, 3], [4, 9], [12, 9]]) v.box(x, 0, z, x + 1, 2, z + 1, 'rose');
  v.box(7, 12, 5, 10, 12, 6, 'black'); v.set(13, 9, 3, 'black'); v.set(13, 9, 9, 'black'); v.box(12, 11, 3, 13, 12, 4, 'rose'); v.box(12, 11, 8, 13, 12, 9, 'rose');
  v.line(1, 7, 6, 0, 9, 6, 'rose');
} });
def('life_gaveeske', { size: [12, 13, 12], build(v) {
  v.box(1, 0, 1, 10, 8, 10, 'rose'); v.box(0, 8, 0, 11, 9, 11, 'pink'); v.box(5, 0, 0, 6, 9, 11, 'gold'); v.box(0, 0, 5, 11, 9, 6, 'gold');
  v.box(3, 10, 5, 4, 11, 6, 'gold'); v.box(7, 10, 5, 8, 11, 6, 'gold'); v.box(5, 10, 5, 6, 12, 6, 'gold');
} });

/* ---------------------------------------------------------- thumbnails (real 3D renders) */
const cat = id => F.CAT.byId(id);
function itemThumb(c, size, angle) {
  const mid = F.CAT.mid(c);
  if (mid) { const im = new Image(); im.src = F.Thumb.url(mid, c.opts || {}, { size, angle: angle != null ? angle : 0.5 }); im.className = 'thumb'; im.draggable = false; im.alt = ''; return im; }
  const w = el('div', 'lshop-missing'); w.appendChild(F.Thumb.img('life_gaveeske', {}, { size: Math.round(size * 0.7) })); w.appendChild(el('div', 'lsm-word', F.UI.caseText(c.word)));
  return w;
}
const KEEPER_LOOK = {
  feboden: { job: 'maler', col: 'pink' }, dyrebutikken: { job: 'gjeter' }, mobelbua: { job: 'leketoysmaker' }, hagesenteret: { job: 'blomsterselger' },
  bakeriet: { job: 'baker' }, lekebutikken: { job: 'leketoysmaker' }, musikkbua: { job: 'musikant' }, reisebua: { job: 'batmann' },
  gavebua: { job: 'bestemor' }, tryllebua: { job: 'isselger' }, byggebua: { job: 'bonde' },
};
function keeperThumb(shopId, voice) {
  try {
    const job = KEEPER_LOOK[shopId] ? KEEPER_LOOK[shopId].job : (F.SHOPS[shopId] && F.SHOPS[shopId].job) || 'baker';
    // v5 (#5): the keeper's look matches the shop voice (vk = a woman, vm = a man). v5c WP-W2: the voice the panel REALLY speaks with
    // (o.keeperVoice, else the shop's, else 'vk') – a shop without a voice no longer gets a random-gender picture with a woman's voice
    const v = voice || (F.SHOPS[shopId] || {}).voice || 'vk';
    if (F.People && F.VOX.has('ch_person')) { const L = F.People.villager(job, U.hashStr(shopId), { female: v === 'vk', kid: v === 'barn' }); return F.Thumb.img('ch_person', L, { size: 150, angle: 0.25 }); }
  } catch (e) {}
  return el('div', 'lshop-keeper-missing');
}

/* ---------------------------------------------------------- paying
   v5 WP-X (DESIGN4 §8 natural prices; logic #18): the paying task fits her level – F12 «Betal riktig» only for 10 ≤ price ≤ fit
   (fit = 20 below T-MENGDE M11 «build any 2-digit number», else 100); a 4-coin bun or a 90-coin bed above her level is paid without a
   task (the purse pays, «Det koster …» was said). The F12 item is built here (same as F.Task.pay in f_num.js) so it can run with
   ctx.coins = 0: paying never earns task coins in the middle of the payment (#18). Shop.fit(price) -> bool. */
const strandRung = s => (F.Eco && F.Eco.strandRung ? F.Eco.strandRung(s) : 0);
function fit(price) { const r = strandRung('T-MENGDE'); return price >= 10 && price <= (r >= 11 ? 100 : 20); }
async function payTask(price, o) {
  o = o || {};
  if (!F.Task || !F.Task.run || !F.Task.defs || !F.Task.defs.F12 || F.Task.current) return null;
  const rung = strandRung('T-MENGDE') || 1, support = rung < 9;
  let item = null;
  if (!support && F.BANKS && F.BANKS.gen) { try { item = F.BANKS.gen('T-MENGDE', 9, 1, { kind: 'normal', target: price, key: 'T-MENGDE:' + price, rng: F.rand, conf: {}, format: 'F12' }); } catch (e) { item = null; } }
  item = Object.assign({ strand: 'T-MENGDE', rung: support ? rung : 9, sup: 1, choices: null, distractors: [], params: {} }, item || {},
    { id: 'pay_' + price + '_' + Math.round(F.T.now * 10), format: 'F12', kind: support ? 'practice' : 'normal', key: 'T-MENGDE:' + price, target: price });
  item.params = Object.assign({}, item.params || {}, { support, itemName: o.itemName || null, model: o.model || null, modelOpts: o.modelOpts || null });
  // priceSaid (economy plan §1 row 10): the keeper already said the price (or it is ≥ 100: shown, never spoken) – the task need not
  const r = await F.Task.run(item, { npc: o.npc || null, thing: o.thing || null, place: o.place || 'shop', voice: o.voice || '', coins: 0, priceSaid: !!o.priceSaid });
  return (r && r.outcome) || 'A';
}
// returns 'A'|'B'|'C' when paid, 'poor' when she can't afford it
async function payFor(c, o) {
  o = o || {};
  if (F.Eco.coins() < c.price) return 'poor';
  let r = 'A';
  if (!o.noTask && fit(c.price)) {
    try { r = await payTask(c.price, { itemName: c.name, model: F.CAT.mid(c), modelOpts: c.opts || null, voice: o.voice || '', place: 'shop', priceSaid: !!o.priceSaid }); }
    catch (e) { console.error('[Shop] pay failed', e); r = 'A'; }
    Shop.lastPay = { price: c.price, task: true, r };
  } else Shop.lastPay = { price: c.price, task: false, r: 'A' };
  if (r === 'poor') return r;
  if (!F.Eco.spend(c.price)) return 'poor';
  return r || 'A';
}
// a bought plot item (robåt, hus …): a glitter trail to the nearest free build plot, so she sees where it goes
// the trail to the nearest empty plot – or, for «Bruk» on a plot item with none left to place (it stands on a plot already: an empty
// plot's chooser cannot offer it), to the nearest plot where it stands
function plotTrail(id) {
  try {
    if (!F.HUD || (!F.HUD.trail && typeof F.HUD.follow !== 'function')) return;
    const P = F.Player.pos, plots = (F.save.shop && F.save.shop.plots) || {};
    const placed = typeof id === 'string' && F.Eco.freeCount && F.Eco.freeCount(id) <= 0;
    let best = null, bd = 1e9;
    for (const th of F.Things.list) {
      if (th.space !== F.Space.cur || !th.def || !(th.def.plot || /tomt/.test(th.type)) || (placed ? plots[th.id] !== id : plots[th.id])) continue;
      const d = Math.hypot(th.x - P.x, th.z - P.z); if (d < bd) { bd = d; best = th; }
    }
    if (best && bd < 200) { if (typeof F.HUD.follow === 'function') F.HUD.follow({ x: best.x, z: best.z }); else F.HUD.trail(P.x, P.z, best.x, best.z); }
  } catch (e) { /* no trail */ }
}
// «where it went» lines (economy plan §1 row 15, 12.10.): once per kind EVER – after that the visible result shows it.
// A glitter trail (row 16) and a ride toy say nothing: the sparkles behind her / the twinkling bike beside her show it.
const WHERE_TPL = { basket: 'eco_kurv', wardrobe: 'eco_garderobe', room: 'eco_rom', plot: 'eco_tomt', pet: 'eco_kjæledyr', wand: 'eco_magi', gear: 'shop_kikkert', music: 'shop_paviljong' };
const sayWhere = where => (WHERE_TPL[where] && F.Eco.sayOnce) ? F.Eco.sayOnce(WHERE_TPL[where], 'ever', null, '', 'where:' + where) : Promise.resolve(null);
// after the «where it went» line: gear explains itself once (WP9)
function afterWhere(where, c) { if (where === 'gear' && c && c.gear === 'kikkert' && F.TPL.has('shop_kikkert_se') && F.Eco.sayOnce) F.Eco.sayOnce('shop_kikkert_se', 'ever'); }
// a one-of item she already has (12.10. uniq, the Kikkert's gear key too): never paid twice – the button becomes «Bruk»
const oneOf = c => !!c && !!(F.Eco.has ? F.Eco.has(c) : (c.kind === 'gear' && F.Eco.gear && F.Eco.gear(c.gear || c.id)));
const canBuy = c => F.Eco.canBuy ? F.Eco.canBuy(c) : (oneOf(c) ? 'owned' : F.Eco.coins() < c.price ? 'poor' : 'ok');
function boughtEvent(shopId, c) { try { F.emit('shopBuy', shopId, c.id, (F.Towns && F.Towns.realmOf) ? F.Towns.realmOf(shopId) : null); } catch (e) { console.error(e); } }
// a glitter trail (or Puff's clouds, when the clarity HUD has them) to a world point – after the panel closed
function trailTo(x, z) {
  try {
    const P = F.Player.pos; if (F.Space.cur !== 'out' || Math.hypot(x - P.x, z - P.z) > 220) return;
    if (F.HUD && typeof F.HUD.follow === 'function') F.HUD.follow({ x, z }); else if (F.HUD && F.HUD.trail) F.HUD.trail(P.x, P.z, x, z);
  } catch (e) { /* no trail */ }
}
// savings goal (economy plan §4): F.Eco.setGoal keeps the save; the clarity goal card (F.Goal.setSaving, owned by HUD) shows it
function setSaving(c) {
  const changed = F.Eco.setGoal ? F.Eco.setGoal(c.id) : (F.save.shop.piggyGoal !== c.id && ((F.save.shop.piggyGoal = c.id), F.store(), F.emit('piggyGoal', c.id), true));
  try { if (F.Goal && typeof F.Goal.setSaving === 'function') F.Goal.setSaving(c.id, { id: c.id, price: c.price, shop: c.shop, model: F.CAT.mid(c), opts: c.opts || null, word: c.word }); } catch (e) { console.error('[Shop] setSaving', e); }
  return changed;
}
let STYLE = false;
function style() {
  if (STYLE || document.getElementById('lshop-econ-css')) return; STYLE = true;
  const cs = document.createElement('style'); cs.id = 'lshop-econ-css';
  cs.textContent = [
    // «Bruk» (an owned one-of item) and the full basket on the buy button
    '.lshop-buy .lb-use{display:none;font-size:30px;font-weight:800;color:#5a3d12;letter-spacing:.5px}',
    '.lshop-buy.use .lb-use{display:inline}.lshop-buy.use .lcoin,.lshop-buy.use .lb-ok{display:none}',
    '.lshop-buy .lb-full{display:none;width:84px;height:72px;object-fit:contain}.lshop-buy.full .lb-full{display:block}.lshop-buy.full .lcoin,.lshop-buy.full .lb-ok{display:none}',
    '.lshop-stage.owned .lshop-bigprice{display:none}',
    '.lshop-buy.full{filter:grayscale(.35);opacity:.72}.lshop-buy.have .lcoin{display:none}.lshop-buy.have{opacity:.7}',
    '.lshop-big.used{animation:lbought .9s ease-out}',
    // her purse's number chip sat under the panel's ✕ in every shop: the purse ends left of the ✕
    '.shop-panel .lshop-purse{padding-right:172px}',
    // her purse is the HUD's (F.Purse.el: notes fan, tens, ten-frame, chip) – compact at any sum, clear of the shop's name sign; a readable chip
    '.shop-panel .lshop-purse.notes{transform:scale(.86);padding-right:152px}',
    // the ones stay big enough to count in the shop (her coins are mostly ones on the first days): 22 px cells in the 2×5 ten-frame
    '.shop-panel .lshop-purse .pp-frame{grid-template-columns:repeat(5,22px);grid-auto-rows:22px}',
    '.shop-panel .lshop-purse .ppurse{gap:10px}.shop-panel .lshop-purse .pp-num{height:52px;min-width:60px;padding:0 10px;font-size:34px;font-weight:800;border-radius:16px}',
    // can't afford: her coins and the price as two tiles, the bar model, «Jeg vil spare til denne!»
    '.lshop-poor{gap:8px}.lshop-stage.poor .lshop-bigprice{display:none}.lshop-stage.poor .lshop-big,.lshop-stage.poor .lshop-big img{width:168px;height:168px}',
    '.lshop-bar{position:relative;width:224px;height:30px;border-radius:15px;border:3px solid var(--gold,#f5c542);background:repeating-linear-gradient(135deg,#fff 0 7px,#f3e6c9 7px 13px);overflow:hidden;box-sizing:border-box}',
    '.lshop-bar .lbar-have{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#ffe27a,#f5c542);border-right:3px solid #d9a520}',
    '.lshop-bar .lbar-q{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#8a6a2a}',
    '.lshop-pig{display:flex;align-items:center;gap:6px;padding:4px 14px 4px 6px!important;min-height:70px;max-width:250px}',
    '.lshop-pig img{width:66px!important;height:58px!important;object-fit:contain}',
    '.lshop-pig .lpig-txt{font-size:19px;font-weight:800;line-height:1.1;text-align:left;color:#6b3a5a}',
    '.lshop-pig.on{box-shadow:0 0 0 6px rgba(255,127,176,.55),var(--shadow,0 4px 0 rgba(0,0,0,.15))}',
    '.lshop-pigfly{position:fixed;z-index:9999;width:66px;height:58px;pointer-events:none;transition:left .7s cubic-bezier(.4,0,.2,1),top .7s cubic-bezier(.4,-.6,.2,1),transform .7s,opacity .7s}',
  ].join('');
  document.head.appendChild(cs);
}

const Shop = F.Shop = {
  cur: null, lastPay: null, visits: 0,
  payFor, payTask, fit,
  // the paying flow without the panel (tests, scripts): never pays for an owned one-of item or into a full basket
  async buy(id, o) {
    o = o || {};
    const c = cat(id); if (!c) return false;
    const can = canBuy(c); if (can === 'owned' || can === 'full') return false;
    const r = await payFor(c, o);
    if (r === 'poor') return false;
    const where = F.Eco.grant(id, { by: 'feen', via: 'shop' });
    boughtEvent(o.shop || c.shop, c);
    await sayWhere(where);
    afterWhere(where, c);
    if (where === 'plot') plotTrail();
    return true;
  },
  open(shopId, o) {
    o = o || {};
    // legacy village stalls (data.shop:true) and stalls without an id: resolve the real shop by region (WP9 §6.1)
    if ((shopId === true || shopId === 'true' || !shopId) && F.Towns && F.Towns.stallShop) shopId = F.Towns.stallShop(o.thing);
    const S = F.SHOPS[shopId]; if (!S || S.resolve) { console.warn('unknown shop', shopId); return Promise.resolve(); }
    style();
    const voice = o.keeperVoice || S.voice || 'vk';
    const items = F.CAT.ofShop(shopId);
    const theme = (F.Towns && F.Towns.theme) ? F.Towns.theme(shopId, { thing: o.thing, realm: o.realm }) : (S.theme || null);
    const roomy = items.length <= 9;
    const visit = ++Shop.visits;
    return new Promise(resolve => {
      const root = el('div', 'lshop sh-' + shopId + (theme ? ' th-' + theme : '') + (roomy ? ' roomy' : ''));
      // --- left: keeper + the selected item on a little stage
      const left = el('div', 'lshop-left');
      const head = el('div', 'lshop-head');
      const sign = el('div', 'lshop-sign', F.UI.caseText(S.name));
      const keeper = el('div', 'lshop-keeper'); keeper.appendChild(keeperThumb(shopId, voice));
      head.appendChild(keeper); head.appendChild(sign);
      const stage = el('div', 'lshop-stage');
      const big = el('div', 'lshop-big');
      const bigPrice = el('div', 'lshop-bigprice');
      const buyBtn = el('button', 'kbtn big gold lshop-buy'); const bc = F.Eco.coinEl(10, 'blank'); bc.textContent = ''; buyBtn.appendChild(bc); buyBtn.appendChild(el('span', 'lb-ok', '✓'));
      buyBtn.appendChild(el('span', 'lb-use', 'Bruk'));
      const fullImg = F.VOX.has('kurv') ? F.Thumb.img('kurv', {}, { size: 96 }) : el('span', 'lb-full-x', '🧺'); fullImg.classList.add('lb-full'); buyBtn.appendChild(fullImg);
      const poor = el('div', 'lshop-poor');
      stage.appendChild(big); stage.appendChild(bigPrice); stage.appendChild(buyBtn); stage.appendChild(poor);
      left.appendChild(head); left.appendChild(stage);
      // --- right: shelves
      const right = el('div', 'lshop-right');
      const purse = el('div', 'lshop-purse');
      const shelves = el('div', 'lshop-shelves');
      right.appendChild(purse); right.appendChild(shelves);
      root.appendChild(left); root.appendChild(right);
      const perRow = items.length > 12 ? 7 : items.length > 8 ? 6 : roomy && items.length > 5 ? Math.ceil(items.length / 2) : Math.max(4, items.length);
      let row = null; const cards = {};
      items.forEach((c, i) => {
        if (i % perRow === 0) { row = el('div', 'lshop-shelf'); shelves.appendChild(row); }
        const card = el('button', 'lshop-item' + (c.dream ? ' dream' : ''));
        card.appendChild(itemThumb(c, roomy ? 150 : 120));
        card.appendChild(el('div', 'lshop-price', String(c.price)));
        if (oneOf(c)) card.appendChild(el('div', 'lshop-owned'));    // the owned mark only where a second one is not sold (one-of)
        card.onclick = e => { e.stopPropagation(); F.sfx.click(); select(c.id); };
        card.dataset.id = c.id;
        row.appendChild(card); cards[c.id] = card;
      });
      const refreshPurse = () => { purse.innerHTML = ''; purse.appendChild(F.Eco.purseEl(F.Eco.coins())); purse.classList.toggle('notes', !!purse.querySelector('.ppurse')); };
      refreshPurse();
      let sel = null, spinT = null, busy = false, closed = false, after = null;
      const h = F.UI.open(root, { cls: 'life-panel shop-panel' + (theme ? ' th-' + theme : ''), onClose: () => { closed = true; if (spinT) clearInterval(spinT); Shop.cur = null; if (after) F.T.timeout(after, 400); resolve(); } });
      Shop.cur = { id: shopId, theme, h, visit, select: id => select(id), buy: () => buyBtn.click(), root, mode: () => buyBtn.dataset.mode || null };
      function spin(c) {
        if (spinT) clearInterval(spinT);
        const mid = F.CAT.mid(c);
        big.innerHTML = ''; big.appendChild(itemThumb(c, 230, 0));
        if (!mid) return;
        let k = 0;
        spinT = setInterval(() => {
          k++; if (k > 16) { clearInterval(spinT); spinT = null; return; }
          const im = big.querySelector('img'); if (im) im.src = F.Thumb.url(mid, c.opts || {}, { size: 230, angle: (k % 8) / 8 * Math.PI * 2 });
        }, 110);
      }
      // the button shows what a tap will do: buy (coin ✓), «Bruk» (she owns this one-of item), the full basket (dim), or dim (poor)
      function mode(c) {
        const m = canBuy(c);
        buyBtn.dataset.mode = m;
        const have = m === 'owned' && c.kind === 'pack';               // trylleord: already in her wand – a plain ✓, nothing to «use»
        buyBtn.classList.toggle('use', m === 'owned' && !have); buyBtn.classList.toggle('have', have); buyBtn.classList.toggle('full', m === 'full');
        buyBtn.classList.toggle('dim', m === 'poor');
        stage.classList.toggle('owned', m === 'owned');                // hers already: no price tile above «Bruk» / ✓
        return m;
      }
      // the price, once per item per visit; a price of 100 or more is shown, never spoken (DESIGN6 §4.1): «Den koster mye. Se på
      // prislappen.» once per visit instead. Nothing for a thing she already owns (one-of)
      function sayPrice(c) {
        if (!F.Eco.sayOnce) { F.Speech.clearQueue(); return F.SAY('eco_koster', { n: c.price }, voice); }
        const key = c.price >= 100 ? 'eco_dyr:' + visit : 'eco_koster:' + visit + ':' + c.id;
        if ((F.Eco.talkLog || []).some(e => e.key === key && e.said)) return null;
        F.Speech.clearQueue();
        const kv = voice === 'vm' || voice === 'vk' ? voice : '';
        return c.price >= 100 ? F.Eco.sayOnce('eco_dyr', 'session', null, kv || 'vk', key) : F.Eco.sayOnce('eco_koster', 'session', { n: c.price }, kv, key);
      }
      function select(id) {
        if (busy) return;
        const c = cat(id); sel = c;
        Object.values(cards).forEach(x => x.classList.toggle('sel', x.dataset.id === id));
        spin(c);
        bigPrice.textContent = String(c.price);
        poor.innerHTML = ''; poor.classList.remove('on'); stage.classList.remove('poor'); buyBtn.style.display = '';
        stage.classList.add('on');
        const m = mode(c);
        if (m === 'owned') return;
        sayPrice(c);
        if (m === 'poor') showPoor(c, true);            // she sees at once that it is not enough – and can choose to save for it
      }
      buyBtn.onclick = async e => {
        e.stopPropagation();
        if (!sel || busy) return;
        const c = sel, m = mode(c);
        if (m === 'owned' && c.kind === 'pack') { F.sfx.pop(); if (F.Eco.sayOnce) F.Eco.sayOnce('shop_har', 'session', null, '', 'shop_har:' + c.id); return; }
        if (m === 'owned') { useIt(c); return; }
        if (m === 'full') { F.sfx.bad(); F.FX.wobble && buyBtn.animate && buyBtn.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 360 }); return; }
        if (m === 'poor') { showPoor(c); return; }
        busy = true; F.sfx.click();
        h.wrap.style.visibility = 'hidden';
        let r = 'poor';
        try { r = await payFor(c, { voice, priceSaid: true }); } catch (err) { console.error(err); }
        if (closed) {
          // the panel was closed while paying (Esc): never keep her coins without giving the thing
          if (r !== 'poor') { const w = F.Eco.grant(c.id, { by: 'feen', via: 'shop' }); boughtEvent(shopId, c); F.sfx.levelup(); await sayWhere(w); afterWhere(w, c); if (w === 'plot') plotTrail(); }
          return;
        }
        h.wrap.style.visibility = '';
        F.Player.frozen = true; F.Input.enabled = false;   // the panel is still open
        if (r === 'poor') { busy = false; showPoor(c); return; }
        const where = F.Eco.grant(c.id, { by: 'feen', via: 'shop' });
        boughtEvent(shopId, c);
        refreshPurse();
        if (oneOf(c) && !cards[c.id].querySelector('.lshop-owned')) cards[c.id].appendChild(el('div', 'lshop-owned'));
        big.classList.remove('bought'); void big.offsetWidth; big.classList.add('bought');
        F.sfx.levelup();
        // §1 rows 13–14: the keeper's «Vær så god!» is the one sentence – she sees the thing spin in her hands (no «Du kjøpte …»)
        await F.SAY('eco_vsg', null, voice);
        if (!closed) sayWhere(where).then(() => { if (!closed) afterWhere(where, c); });
        if (where === 'plot') { if (closed) plotTrail(); else after = plotTrail; }
        if (where === 'music') { const p = instrSpot(c); if (p) after = () => trailTo(p.x, p.z); }
        busy = false;
        mode(c);
      };
      // «Bruk»: an owned one-of item is used, never bought again – wear / take off, her pet, her room, ride, trail on / off
      function useIt(c) {
        const r = F.Eco.use ? F.Eco.use(c.id) : null;
        F.emit('shopUse', shopId, c.id, r);
        F.sfx.magic(); big.classList.remove('used'); void big.offsetWidth; big.classList.add('used');
        if (r === 'worn' || r === 'off') showLook();
        else if (r === 'ride' || r === 'pet') { after = null; F.T.timeout(() => { if (!closed) h.close(); }, 700); }      // she sees it beside her
        else if (r === 'plot') { after = () => plotTrail(c.id); F.T.timeout(() => { if (!closed) h.close(); }, 700); }
        else if (r === 'music') { const p = instrSpot(c); if (p) after = () => trailTo(p.x, p.z); F.T.timeout(() => { if (!closed) h.close(); }, 700); }
        else if (r === 'trail' || r === 'trailOff') { const P = F.Player.pos; F.FX.sparkle(new THREE.Vector3(P.x, P.y + 0.5, P.z)); showLook(); }
      }
      // her fairy in her look now (a real render), for a moment on the stage – then the item again
      function showLook() {
        try {
          if (!F.Fairy || !F.Fairy.look || !F.VOX.has('ch_fairy')) return;
          if (spinT) { clearInterval(spinT); spinT = null; }
          const w = F.save.wear && !Array.isArray(F.save.wear) ? Object.values(F.save.wear).filter(Boolean) : [];
          const kind = F.Fairy.cur ? F.Fairy.cur() : (F.save.fairy || 'krystall');
          big.innerHTML = ''; big.appendChild(F.Thumb.img('ch_fairy', F.Fairy.look(kind, w), { size: 230, angle: 0.35 }));
          const c = sel; F.T.timeout(() => { if (!closed && sel === c && !busy) spin(c); }, 2600);
        } catch (e) { console.error(e); }
      }
      function showPoor(c, quiet) {
        poor.innerHTML = '';
        const have = F.Eco.coins();
        stage.classList.add('poor');
        const nums = el('div', 'numrow lshop-nums');
        const a = el('div', 'numtile lshop-have'); a.appendChild(F.Eco.coinEl(1)); a.appendChild(el('span', '', String(have)));
        const b = el('div', 'numtile lshop-cost'); b.appendChild(el('span', '', String(c.price)));
        nums.appendChild(a); nums.appendChild(b);
        // the bar model: the whole bar is the price, the gold part her coins, the hatched rest the «?» she still needs
        const bar = el('div', 'lshop-bar'), k = Math.max(0, Math.min(1, have / c.price));
        const g = el('div', 'lbar-have'); g.style.width = (k * 100).toFixed(1) + '%'; if (k <= 0) g.style.display = 'none';
        const q = el('div', 'lbar-q', '?'); q.style.left = (k * 100).toFixed(1) + '%'; q.style.right = '0';
        bar.appendChild(g); bar.appendChild(q);
        const pig = el('button', 'kbtn lshop-pig'); pig.appendChild(F.Thumb.img('life_sparegris', {}, { size: 90 })); pig.appendChild(el('span', 'lpig-txt', 'Jeg vil spare til denne!'));
        const goal = (F.save.shop || {}).piggyGoal;
        if (goal === c.id) pig.classList.add('on');
        pig.onclick = ev => {
          ev.stopPropagation(); F.sfx.chime();
          const changed = setSaving(c); pig.classList.add('on');
          if (changed) { flyPig(pig); F.Speech.clearQueue(); F.SAY('eco_spar'); }          // §1 row 27: «Nå sparer du til det!» per goal set
        };
        poor.appendChild(nums); poor.appendChild(bar); poor.appendChild(pig); poor.classList.add('on'); buyBtn.style.display = 'none';
        if (!quiet) F.sfx.bad();
        // §1 rows 17–18: «Du har ikke nok mynter ennå.» ONCE EVER; the tiles, the bar and the piggy show the rest (no «Du har …»)
        if (F.Eco.sayOnce) { if (!quiet) F.Speech.clearQueue(); F.Eco.sayOnce('num_f12_rakk', 'ever'); }
      }
      // the piggy hops from the button into the goal card (or the purse)
      function flyPig(btn) {
        try {
          const from = btn.querySelector('img').getBoundingClientRect();
          const tgEl = (F.Goal && F.Goal.el) || (F.HUD && F.HUD.purse) || null;
          const to = tgEl && tgEl.getBoundingClientRect ? tgEl.getBoundingClientRect() : (F.HUD && F.HUD.purseRect ? F.HUD.purseRect() : { left: 20, top: 20, width: 60, height: 60 });
          const im = F.Thumb.img('life_sparegris', {}, { size: 90 }); im.className = 'lshop-pigfly'; im.style.left = from.left + 'px'; im.style.top = from.top + 'px';
          document.body.appendChild(im);
          requestAnimationFrame(() => requestAnimationFrame(() => { im.style.left = (to.left + to.width / 2 - 33) + 'px'; im.style.top = (to.top + to.height / 2 - 29) + 'px'; im.style.transform = 'scale(.6)'; im.style.opacity = '0.2'; }));
          setTimeout(() => im.remove(), 900);
        } catch (e) { /* no flight */ }
      }
      F.SAY('eco_velkommen', { shop: S.name }, voice);
      if (o.select) select(o.select);
    });
  },
};
// where an instrument stands (economy.js life_instr) – for the trail after a purchase
function instrSpot(c) { const th = F.Things.byId('life_instr_' + c.id); return th ? { x: th.x, z: th.z } : (F.Things.byId('p_paviljong') || null); }

/* ---------------------------------------------------------- a market stall thing that opens a shop */
F.Things.def('life_shop', {
  radius: 1.3, solid: true, reach: 2.6, name: 'butikken',
  build(th) {
    const c = ['rose', 'sky', 'mint', 'lilac', 'butter', 'peach'][F.SHOP_ORDER.indexOf(th.data.shop) % 6] || 'rose';
    const id = F.VOX.has('stall') ? 'stall' : 'life_kiosk';
    const g = F.VOX.make(id, id === 'stall' ? { awning: c } : { c });
    g.scale.setScalar(1.4);
    return g;
  },
  init(th) { const S = F.SHOPS[th.data.shop]; if (S) th.sign = F.UI.label(new THREE.Vector3(th.x, th.y + 3.1, th.z), S.name, { kind: 'plaque', space: th.space }); },
  dispose(th) { if (th.sign) th.sign.remove(); },
  press(th) { F.FX.pop(th.obj); return Shop.open(th.data.shop, { thing: th }); },
});
// v5 (#40): the piggy-bank goal is cleared once she has bought it
F.on('bought', id => { const s = F.save.shop; if (s && s.piggyGoal === id) { if (F.Eco.setGoal) F.Eco.setGoal(null); else { s.piggyGoal = null; F.store(); F.emit('piggyGoal', null); } } });
F.dbg = F.dbg || {};
F.dbg.shop = id => { Shop.open(id); F.debug.frames(3); return !!Shop.cur; };
})();
