/* Feslottet – WP9 SHOPS speech (DESIGN2 §8.2: prefix shop_, cap 95 incl. the automatic eco_ growth from ITEMS + SHOPNAMES).
   Narrator only, no slots: 3 clips. The themed shops reuse eco_velkommen {SHOPNAMES} × vm/vk, eco_koster {PRICE}, eco_kjøpt {ITEMS}. */
(function () {
'use strict';
const F = window.F;
// v5 WP-X (DESIGN4 §8 natural prices): PRICE = every catalog price (the finite ladder 2–20, 25 … 100), so «Det koster {n}» /
// «Den koster {n}» are never silent or wrong for a natural price. New values vs v4: 2–9, 25, 35, 45, 70, 90 (13 × eco_koster ×3 +
// num_f12_koster ×3 = 78 clips).
F.SETS.PRICE = [...new Set([...(F.SETS.PRICE || []), ...((F.CAT || []).map(c => c.price))])].sort((a, b) => a - b);
// v5 WP-X stall (#8): a queued customer when the stall has run out (villager voices)
F.TPL.addAll({ st_utsolgt: 'Å, det er tomt! Jeg kommer tilbake en annen dag.' }, { voices: ['vm', 'vk', 'barn'] });
F.TPL.addAll({
  shop_kikkert: 'Nå har du en kikkert!',
  shop_kikkert_se: 'Med kikkerten ser du sjeldne dyr langt borte!',
  shop_har: 'Den har du allerede!',
  // 12.10. economy plan §3.4: a bought instrument stands by Musikkpaviljongen (once ever, then a trail shows the way)
  shop_paviljong: 'Den står ved musikkpaviljongen i parken.',
}, { voices: [''] });
// 12.10. economy plan §1 row 9: a price of 100 or more is shown, never spoken – the keeper points at the tag (once per shop visit)
F.TPL.addAll({ eco_dyr: 'Den koster mye. Se på prislappen.' }, { voices: ['vm', 'vk'] });
})();
