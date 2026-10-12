/* Feslottet – fairy lines (MODELS-3). Registered at load time; all spoken via F.SAY (pre-generated mp3).
   fairy_intro_<kind>  – said when she taps a fairy on the selection cloud (narrator voice, as the fairy speaking)
   fairy_power_<kind>  – short description of the power (Fe-speilet / selection, second tap)
   fairy_chosen        – «Nå er du {fe}!» after the ✓ / Fe-speilet switch            slots: fe ∈ FAIRIES
   fairy_wear_new      – after putting on something new                                 (no slots)
   fairy_twirl         – little cheer when she twirls                                    (no slots) */
(function () {
'use strict';
const F = window.F;
F.SETS = F.SETS || {};
F.SETS.FAIRIES = ['Krystallfeen', 'Blomsterfeen', 'Boblefeen', 'Stjernefeen'];
F.TPL.addAll({
  fairy_intro_krystall: 'Jeg er Krystallfeen! Jeg lager krystaller.',
  fairy_intro_blomst: 'Jeg er Blomsterfeen! Jeg får blomster til å gro.',
  fairy_intro_boble: 'Jeg er Boblefeen! Jeg lager bobler.',
  fairy_intro_stjerne: 'Jeg er Stjernefeen! Jeg tenner stjerner.',
  fairy_power_krystall: 'Jeg kan bygge broer av krystall.',
  fairy_power_blomst: 'Jeg kan lage stiger av blomster.',
  fairy_power_boble: 'Jeg kan fly i en stor boble.',
  fairy_power_stjerne: 'Jeg kan lage en bro av stjerner.',
  fairy_wear_new: ['Så fin du er!', 'Den kler deg!'],
  fairy_twirl: ['Hurra!', 'Wiii!'],
}, { voices: [''] });
F.TPL.add('fairy_chosen', { text: 'Nå er du {fe}!', slots: { fe: 'FAIRIES' }, voices: [''] });
})();
