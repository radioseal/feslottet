/* Feslottet – bounded sets for speech template slots (DESIGN §10.2). Pure data.
   A set is an array of strings/numbers, or a function returning one (evaluated lazily, e.g. sets owned by words.js/catalog.js).
   Owners may add sets: F.SETS.MYSET = [...] (keep them finite and small). */
(function () {
'use strict';
const F = window.F = window.F || {};
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
F.SETS = Object.assign(F.SETS || {}, {
  NUM_0_100: range(0, 100),
  NUM_1_20: range(1, 20),
  NUM_0_20: range(0, 20),
  NUM_10_20: range(10, 20),
  NUM_1_10: range(1, 10),
  PRICE: [...range(10, 20), 30, 40, 50, 60, 80, 100],
  LETTERS: 'abcdefghijklmnopqrstuvwxyzæøå'.split(''),
  ROYALS: ['Kongen', 'Dronningen', 'Mia', 'Ole'],
  NAMES: ['Ali', 'Ane', 'Eli', 'Eva', 'Ida', 'Isak', 'Jon', 'Kim', 'Lea', 'Liv', 'Mona', 'Nils', 'Nora', 'Odd', 'Pia', 'Rut', 'Sara', 'Siri', 'Tom', 'Una',
    'Vera', 'Ola', 'Emil', 'Jens', 'Anna', 'Even', 'Mari', 'Iris', 'Ella', 'Sofie', 'Adam', 'Aron', 'Ivar', 'Hege', 'Eirik', 'Ulla', 'Lise', 'Kaja', 'Nina', 'Atle'],
  PLACES: ['Solvik', 'Rosedal', 'Melkeby', 'Epledal', 'Bølgevik', 'Blåbærli', 'Solbakken', 'Fjærholm', 'Kløverby', 'Honningdal', 'Vaffelvik', 'Glimtby',
    'Perleby', 'Lyngvik', 'Måkeholm', 'Blomsterli', 'Kirsebærby', 'Sommerlyst', 'Regnbuevik', 'Stjerneby', 'Gullbakken', 'Krystallvik', 'Bjelleby', 'Sølvberg',
    'Lerkedal', 'Karamellby', 'Bringebærli', 'Sukkerbakken', 'Ballongby', 'Kakeby', 'Morellvik', 'Plommedal', 'Sølvsand', 'Nøtteby', 'Grønnli', 'Vindby',
    'Musebakken', 'Fuglevik', 'Eplebakken', 'Tulipanvik', 'Sneglevik', 'Smultringby', 'Hestehagen', 'Andeby', 'Sommerfuglli', 'Blåklokkedal', 'Liljevik', 'Kanelby'],
  COLOURS: ['rød', 'blå', 'gul', 'grønn', 'lilla', 'rosa', 'hvit', 'brun'],
  ROOMS: ['Hallen', 'Kjøkkenet', 'Spisesalen', 'Tronsalen', 'Ballsalen', 'Biblioteket', 'Musikkrommet', 'Skattkammeret', 'Ordmuseet',
    'Prinsessens rom', 'Kongeparets soverom', 'Badet', 'Garderoben', 'Fetårnet', 'Stjernetårnet'],
  // filled by owners (lazy): WORDS, PLURALS, ITEMS, GOODS, GIFTS, CATS, NEEDS
  WORDS: () => (F.WORDS && F.WORDS.list ? F.WORDS.list.map(w => w.w) : []),
});
/* v3 WP5 (DESIGN3 §9.3): the picture-word stem of a place name (shown bold on signposts and banners, sounded out on the 1st tap,
   the picture card of the real-signpost F26). Only stems that are LES words with a 3D model. Kingdoms by realm id; home 'slottet' = slott.
   F.placeStem(name, realm?) -> stem | null */
F.PLACE_STEM = {
  Solvik: 'sol', Solbakken: 'sol', Rosedal: 'rose', Melkeby: 'melk', Epledal: 'eple', Eplebakken: 'eple', Fjærholm: 'fjær', Kløverby: 'kløver',
  Vaffelvik: 'vaffel', Perleby: 'perle', Måkeholm: 'måke', Blomsterli: 'blomst', Gullbakken: 'gull', Bjelleby: 'bjelle', Kakeby: 'kake',
  Plommedal: 'plomme', Nøtteby: 'nøtt', Musebakken: 'mus', Fuglevik: 'fugl', Sneglevik: 'snegl', Hestehagen: 'hest', Andeby: 'and', Liljevik: 'lilje',
  Bølgevik: 'bølge',
  slottet: 'slott', Slottet: 'slott',
  // landmark plaques (worldgen LANDMARKS): the picture word inside the name
  Fyrtårnet: 'tårn', Sandslottet: 'sand', Kjempesolsikken: 'sol', Regnbuebroen: 'bro', Dyreparken: 'park',
};
F.REALM_STEM = { blomst: 'blomst', hest: 'hest', boble: 'boble', skjell: 'skjell', kake: 'kake', sno: 'snø' };
F.placeStem = function (name, realm) {
  if (realm && F.REALM_STEM[realm]) return F.REALM_STEM[realm];
  if (name == null) return null;
  if (F.PLACE_STEM[name]) return F.PLACE_STEM[name];
  // a kingdom castle name («Hesteslottet») without its realm id
  const R = Array.isArray(F.REALMS) ? F.REALMS.find(r => r.castle === name) : null;
  if (R && F.REALM_STEM[R.id]) return F.REALM_STEM[R.id];
  return null;
};
F.SETS.get = function (name) {
  const s = F.SETS[name];
  if (!s) throw new Error('unknown speech set ' + name);
  return typeof s === 'function' ? s() : s;
};
})();
