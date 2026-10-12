/* Feslottet – WP2 HOME speech (DESIGN2 §8.2, prefix home_, cap 30 new clips): Fetårnet, the morning, the post, bedtime,
   tower things and the onboarding steps that moved outdoors. Puff/narrator voice only. Registered at load time (pure data). */
(function () {
'use strict';
const F = window.F = window.F || {};
F.TPL.addAll({
  // ---- the day in Fetårnet (§2.8)
  home_morgen: ['God morgen!', 'God morgen, lille fe!', 'God morgen! Har du sovet godt?'],
  home_gaut: 'Gå ut døra!',
  home_slottet: 'Se, slottet!',
  home_post: 'Du har post!',
  home_postkasse: ['Trykk på postkassa!', 'Se, postkassa blinker!'],
  home_tom: 'I morgen kommer det mer post!',
  home_seng: ['Senga di er en sky!', 'Så myk den er!', 'Hopp, hopp i skysenga!'],
  home_leggetid: 'Nå er det leggetid. Vi flyr hjem!',
  // ---- tower things
  home_tarn: 'Det er Fetårnet. Der bor du!',
  home_hjem: 'Velkommen hjem!',
  home_stjerne: 'Stjerna på tårnet viser vei hjem.',
  home_hylle: 'Her bor eventyrdyra du er venn med!',
  home_hylle0: 'Bli venn med et eventyrdyr, så får det plass her!',
  // ---- onboarding steps that moved out of the tower (onboard.js)
  home_onb_dor: 'Trykk på døra, så flyr du ut!',
  home_onb_blomst: 'Se på blomstene! Trykk på dem!',
  home_onb_blomst_again: 'Trykk på blomstene som lyser!',
  home_onb_post: 'Du har post! Trykk på postkassa.',
  home_onb_post_again: 'Postkassa er her. Trykk på den!',
  home_onb_brev_again: 'Brevet er til deg. Trykk på det!',      // day 1 has one letter (clarity §4 step 7: the repeat at 20 s)
});
// clarity plan 12.10. §7: Puff's day-1 lines that the speech owner registers in lines_clarity.js (loaded before this file). Registered
// here only when that file has not (so the day-1 flow never goes quiet); the same text, so it is the same clip either way.
const late = {
  onb_puff: 'Trykk på meg, så viser jeg vei!',
  realm_lyset_forst: 'Se lyset! Der borte ligger et slott du ikke har funnet ennå.',
};
for (const id in late) if (!F.TPL.has(id)) F.TPL.add(id, { text: late[id] });
})();
