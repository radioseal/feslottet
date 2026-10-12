/* Feslottet – WP9 SHOPS: which shops a village or a kingdom market has (DESIGN2 §6.1, §3.8). Owner: WP9.
   F.Towns = {
     shopsFor(regionIdOrRealmId) -> [shopId, shopId(, shopId)]
        kingdom (realm id, or a region whose cell is a kingdom site): [realm.shop, generic, generic]   (Regnbue: tryllebua + 2 generic)
        village region ('r_i_j'):                                     2 distinct generic shops picked by region hash (deterministic)
     realmShop(realmId) -> themed shop id | null      realmOf(shopId) -> realm id | null   (tryllebua -> 'regnbue')
     stallShop(thing) -> the shop id a market stall opens (data.shop string, or legacy data.shop:true resolved by region/idx)
     theme(shopId, ctx) -> panel skin ('blomst' … 'krystall', 'regnbue' for Tryllebua in Regnbueslottet, else null)
        ctx = {thing, realm}; Tryllebua gets the rainbow skin only in the Regnbue kingdom.
     GENERIC: the 11 generic shop ids (F.SHOP_ORDER) }
   Pure lookups – no state, no save key. WP3 sets data.shop = F.Towns.shopsFor(region)[k] on every vs:/market stall. */
(function () {
'use strict';
const F = window.F, U = F.U;
const REALM_SHOP = { blomst: 'blomsterbua', hest: 'stallen', boble: 'boblebua', skjell: 'skjellbua', kake: 'kakebua', musikk: 'notebua',
  stjerne: 'stjernebua', sno: 'vinterbua', krystall: 'krystallbua', regnbue: 'tryllebua' };
const generic = () => (F.SHOP_ORDER || ['bakeriet', 'lekebutikken']).slice();
const realmRow = id => (F.REALMS && F.REALMS.find) ? F.REALMS.find(r => r.id === id) || null : null;
const isRealm = id => !!(REALM_SHOP[id] || realmRow(id));
function realmShop(id) {
  const r = realmRow(id);
  const s = (r && r.shop) || REALM_SHOP[id] || null;
  return s && F.SHOPS && F.SHOPS[s] ? s : null;
}
// two distinct generic shops from a string seed (never `not`)
function twoGeneric(seed, not) {
  const G = generic().filter(s => s !== not);
  if (G.length < 2) return G;
  const h = U.hashStr(String(seed));
  const a = h % G.length, b = (a + 1 + (Math.floor(h / G.length) % (G.length - 1))) % G.length;
  return [G[a], G[b]];
}
// the realm whose site is this region cell (guarded: F.Realm may still be the stub)
function realmOfRegion(rid) {
  const m = /^r_(-?\d+)_(-?\d+)$/.exec(String(rid));
  if (!m) return null;
  try { if (F.Realm && F.Realm.siteAt) { const r = F.Realm.siteAt(+m[1], +m[2]); if (r) return r; } } catch (e) { /* stub */ }
  try { if (F.Realm && F.Realm.list) { const hit = F.Realm.list().find(x => x.regionId === rid); if (hit) return hit.id; } } catch (e) { /* stub */ }
  return null;
}
function shopsFor(id) {
  if (id == null) return twoGeneric('none');
  if (isRealm(id)) {
    const t = realmShop(id);
    return t ? [t].concat(twoGeneric('realm|' + id, t)) : twoGeneric('realm|' + id);
  }
  const rk = realmOfRegion(id);
  if (rk) return shopsFor(rk);
  return twoGeneric(id);
}
function realmOf(shopId) {
  const S = F.SHOPS && F.SHOPS[shopId];
  if (S && S.realm) return S.realm;
  for (const k in REALM_SHOP) if (REALM_SHOP[k] === shopId) return k;
  return null;
}
function stallShop(th) {
  const d = (th && th.data) || {};
  if (typeof d.shop === 'string' && d.shop !== 'true' && F.SHOPS[d.shop]) return d.shop;
  const L = shopsFor(d.realm || d.region || null);
  return L[(d.k != null ? d.k : (d.idx || 0)) % L.length] || L[0];
}
// which kingdom the player (or a thing) is in right now – for the Tryllebua rainbow skin
function realmHere(ctx) {
  ctx = ctx || {};
  if (ctx.realm) return ctx.realm;
  const th = ctx.thing, d = (th && th.data) || {};
  if (d.realm) return d.realm;
  if (d.region) { const r = realmOfRegion(d.region); if (r) return r; }
  try {
    if (F.Realm && F.Realm.at) { const p = th ? th : (F.Player && F.Player.pos); if (p && F.Space && F.Space.cur === 'out') { const r = F.Realm.at(p.x, p.z); if (r) return r; } }
  } catch (e) { /* stub */ }
  return null;
}
function theme(shopId, ctx) {
  const S = F.SHOPS && F.SHOPS[shopId]; if (!S) return null;
  if (S.theme) return S.theme;
  if (shopId === 'tryllebua' && realmHere(ctx) === 'regnbue') return 'regnbue';
  return null;
}
F.Towns = { GENERIC: generic(), REALM_SHOP, shopsFor, realmShop, realmOf, stallShop, theme, realmHere };
})();
