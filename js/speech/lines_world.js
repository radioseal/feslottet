/* Feslottet – speech templates for the kingdom (WP WORLD / WP3 REALM). Prefixes world_ and realm_. Narrator voice '' (Puff).
   The place welcome is said by the HUD (hud_welcome_place) on 'regionEntered'. Coin lines reuse texts that OBJ also uses (shared mp3s).
   realm_ (DESIGN2 §8.2, cap 35 clips): castle names come from F.SETS.REALMS (js/data/realms.js, WP7) – 10 + 10 + 13 fixed ≈ 33 clips. */
(function () {
'use strict';
const F = window.F;
F.TPL.addAll({
  world_coin: ['Du fant en mynt!', 'Oi, en mynt!'],
  world_coin_cap: 'Du har funnet mange mynter i dag!',
  world_golden: 'Du fant en gullbokstav!',
}, { voices: [''] });
// v3 WP5: the landmark plaque is «try first, then hear it» (F.UI.tryRead): the 2nd tap says its name (worldgen LANDMARKS names)
F.SETS.LANDMARK_NAMES = ['Fyrtårnet', 'Sandslottet', 'Kjempemølla', 'Pariserhjulet', 'Isslottet', 'Krystallhøyden', 'Kjempesolsikken', 'Regnbuebroen', 'Ballongplassen', 'Dyreparken'];
F.TPL.add('world_landemerke', { text: '{lm}', slots: { lm: 'LANDMARK_NAMES' }, voices: [''] });
// a fallback set so the templates expand before realms.js lands (realms.js defines the real one first: data loads before speech)
if (!F.SETS.REALMS) F.SETS.REALMS = () => (F.REALMS || []).map(r => r.castle);
F.TPL.addAll({
  realm_der: { text: 'Der er {slott}!', slots: { slott: 'REALMS' } },                 // the castle comes into view
  realm_velkommen: { text: 'Velkommen til {slott}!', slots: { slott: 'REALMS' } },   // entering a kingdom region (once a day)
  realm_nytt: 'Et nytt slott har dukket opp!',                                        // appearance ceremony
  realm_lyset: 'Se lyset der borte!',                                                // (retired, clarity §7: realm_lyset_forst once)
  realm_bygger: 'Her bygger de et nytt slott!',                  // tap at a building site
  realm_marked: 'Her er markedet.',
  realm_inn: 'Kom, vi går inn i slottet!',                                            // the keep door
  realm_stengt: 'Døra er stengt. Vi prøver igjen senere!',
}, { voices: [''] });
})();
