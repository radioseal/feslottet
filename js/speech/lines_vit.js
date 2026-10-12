/* Feslottet – speech for world knowledge (VIT V1–V2) and words / expressions (ORD Or-T «ord», Or-U «uttrykk») – DESIGN5 §2.3,
   DESIGN4 §9–§10. Owner: WP-A. Narrator voice '' (Puff). Data: js/data/animal_themes.js (F.THEMES), js/data/fauna.js (F.FAUNA).
   Rules: a fact is ONE whole clip (the same clip teaches at the befriend moment / on the album card and is the feedback after a
   recall); questions are short and name the animal by its definite form (finite sets below); answers are objects (3D models), never
   false sentences; no vowel-less words.
   Sets: VIT_FAKTA (every fact sentence of F.THEMES), VIT_NAVN_DEF (definite forms of the album animals asked by name), VIT_MAT_DEF
   (animals with a food fact), ORD_WORDS (33 tier-2 words; v5c WP-A2 +15), ORD_UX (14 expressions), ORD_STEM (13 cloze stems). */
(function () {
'use strict';
const F = window.F;
const TH = () => F.THEMES || null;
const FA = () => (F.FAUNA && F.FAUNA.species) || [];
const uniq = a => [...new Set(a)];
// which album species are asked by name / food (the generator in js/learn/gen_vit.js uses the same rules)
const navnOK = s => !s.glitter && s.tier <= 2;
F.SETS.VIT_FAKTA = () => { const T = TH(); if (!T) return []; const out = []; for (const s of FA()) { const t = T.of(s.id); if (!t) continue; out.push(...t.fakta); if (t.spiser) out.push(t.spiser); if (t.hjemF) out.push(t.hjemF); } return uniq(out); };
F.SETS.VIT_HJEM_DEF = () => { const T = TH(); if (!T) return []; return FA().filter(s => navnOK(s) && T.of(s.id) && T.of(s.id).hjemF).map(s => s.def); };
F.SETS.VIT_NAVN_DEF = () => FA().filter(navnOK).map(s => s.def);
F.SETS.VIT_MAT_DEF = () => { const T = TH(); if (!T) return []; return FA().filter(s => navnOK(s) && T.of(s.id) && T.of(s.id).spiser && T.of(s.id).mat.length).map(s => s.def); };
F.SETS.VIT_MAT_ALL_DEF = () => { const T = TH(); if (!T) return []; return FA().filter(s => navnOK(s) && T.of(s.id) && T.of(s.id).spiser && T.of(s.id).mat.length >= 2 && !/nesten alt|mye forskjellig/.test(T.of(s.id).spiser)).map(s => s.def); };
F.SETS.ORD_WORDS = () => (TH() ? TH().WORDS.slice() : []);
F.SETS.ORD_UX = () => (TH() ? uniq(TH().EXPR.map(e => e.text)) : []);
F.SETS.ORD_STEM = () => (TH() ? uniq(TH().EXPR.map(e => e.stem)) : []);

F.TPL.addAll({
  vit_visste: ['Visste du det?', 'Hør her!', 'Vet du hva?'],
  // V1: babies and mothers (album babies only: the baby and the mother both have a model)
  vit_mor_kalv: 'Hvem er mammaen til kalven?', vit_mor_lam: 'Hvem er mammaen til lammet?', 'vit_mor_føll': 'Hvem er mammaen til føllet?',
  vit_mor_kattunge: 'Hvem er mammaen til kattungen?', vit_mor_valp: 'Hvem er mammaen til valpen?', vit_mor_andunge: 'Hvem er mammaen til andungen?',
  vit_mor_larve: 'Hva blir larven til?',
  vit_unge_ku: 'Hvem er ungen til kua?', vit_unge_sau: 'Hvem er ungen til sauen?', vit_unge_hest: 'Hvem er ungen til hesten?',
  vit_unge_katt: 'Hvem er ungen til katten?', vit_unge_hund: 'Hvem er ungen til hunden?', vit_unge_and: 'Hvem er ungen til anda?',
  vit_unge_sommerfugl: 'Hva var sommerfuglen før?',
  // word meanings (Or-T): said right after «Se, den er …!» while the animal acts it out
  vit_ordb_nysgjerrig: 'Den vil se og vite alt.', vit_ordb_forsiktig: 'Den passer godt på og går sakte fram.', vit_ordb_modig: 'Den tør å prøve noe nytt.',
  vit_ordb_sjenert: 'Den gjemmer seg litt når noen kommer.', vit_ordb_glupsk: 'Den spiser fort og vil ha mye.', vit_ordb_sta: 'Den vil bare gjøre det den selv vil.',
  vit_ordb_flittig: 'Den jobber og jobber hele dagen.', vit_ordb_stolt: 'Den holder hodet høyt og er glad for seg selv.', vit_ordb_lur: 'Den finner smarte måter å gjøre ting på.',
  vit_ordb_rolig: 'Den tar det med ro.', vit_ordb_ivrig: 'Den gleder seg og vil gjøre alt med en gang.', 'vit_ordb_trøtt': 'Den gjesper og vil sove.',
  vit_ordb_blid: 'Den er glad og smiler.', vit_ordb_leken: 'Den vil leke hele tiden.', 'vit_ordb_tålmodig': 'Den kan vente lenge uten å mase.',
  vit_ordb_sterk: 'Den kan bære og dra tunge ting.', vit_ordb_klok: 'Den vet mye og tenker seg om.', vit_ordb_rask: 'Den løper eller flyr veldig fort.',
  // v5c WP-A2: 15 more words (each friend teaches all its words over the days)
  'vit_ordb_kjælen': 'Den liker å bli kost med.', vit_ordb_pratsom: 'Den lager lyder og prater nesten hele tiden.',
  vit_ordb_skvetten: 'Den blir lett redd og hopper unna.', vit_ordb_travel: 'Den har mye å gjøre hele dagen.',
  vit_ordb_vennlig: 'Den er snill mot alle den møter.', vit_ordb_smidig: 'Den kan bøye seg og hoppe lett.',
  vit_ordb_rampete: 'Den finner på mye tull.', 'vit_ordb_grasiøs': 'Den beveger seg vakkert og lett.',
  vit_ordb_klumsete: 'Den vagger og snubler litt.', vit_ordb_hjelpsom: 'Den hjelper gjerne andre.',
  'vit_ordb_lydløs': 'Den lager ingen lyd når den beveger seg.', vit_ordb_staselig: 'Den er stor og ser flott ut.',
  vit_ordb_kvikk: 'Den er rask og lett på foten.', 'vit_ordb_bråkete': 'Den lager mye lyd.',
  vit_ordb_lodden: 'Den har myk og tykk pels eller hår.',
  // expression meanings (Or-U)
  vit_uxb_mus: 'Det betyr å være helt stille.', vit_uxb_esel: 'Det betyr å ikke ville gi seg.', vit_uxb_rev: 'Det betyr å være smart og lur.',
  vit_uxb_maur: 'Det betyr å jobbe mye.', vit_uxb_bie: 'Det betyr å jobbe mye.', vit_uxb_lerke: 'Det betyr å være veldig glad.',
  vit_uxb_snegl: 'Det betyr å gå veldig sakte.', vit_uxb_hare: 'Det betyr å være veldig rask.', vit_uxb_ugle: 'Det betyr å vite mye.',
  vit_uxb_hest: 'Det betyr å være veldig sterk.', vit_uxb_fisk: 'Det betyr å være helt frisk.', vit_uxb_hund: 'Det betyr å alltid være en god venn.',
  'vit_uxb_skjære': 'Det betyr å snakke og snakke.', vit_uxb_kattunge: 'Det betyr å ville leke hele tiden.',
  // F82 hints after the 1st error (a cue, never the answer – hint policy Table B)
  vit_h_plante: 'Tenk deg om: den spiser noe som vokser.', vit_h_fisk: 'Tenk deg om: den finner maten sin i vannet.',
  vit_h_ligner: 'Ungen ligner ofte på mammaen sin.', vit_h_larve: 'Larven forandrer seg helt når den blir stor.', vit_h_hjem: 'Tenk på hvor du så den.', vit_h_navn: 'Se godt på ørene, beina og halen.',
  vit_h_ord: 'Tenk på dyrene du har blitt venn med.',
  // album fact card
  al_fakta_ny: 'Trykk på et kort, så hører du hva du vet om dyret!',   // the first two fact cards she opens
}, { voices: [''] });
F.TPL.add('vit_fakta', { text: '{f}', slots: { f: 'VIT_FAKTA' } });                 // one clip per fact sentence (teach = feedback)
F.TPL.add('vit_hvor', { text: 'Hvor er {dyr}?', slots: { dyr: 'VIT_NAVN_DEF' } });   // V1 name recognition among 3–6 models
F.TPL.add('vit_spiser', { text: 'Hva spiser {dyr}?', slots: { dyr: 'VIT_MAT_DEF' } }); // V2 diet among 3–6 food models
F.TPL.add('vit_alt', { text: 'Trykk på alt {dyr} spiser.', slots: { dyr: 'VIT_MAT_ALL_DEF' } });   // V2 select-all (≥ 2 food models)
F.TPL.add('vit_bor', { text: 'Hvor bor {dyr}?', slots: { dyr: 'VIT_HJEM_DEF' } });          // V2 home among 3–6 home models
F.TPL.add('vit_ord', { text: 'Se, den er {w}!', slots: { w: 'ORD_WORDS' } });          // Or-T exposure (the animal acts it out)
F.TPL.add('vit_ux', { text: 'Vi sier: {u}!', slots: { u: 'ORD_UX' } });                // Or-U exposure
F.TPL.add('ord_t_q', { text: 'Hvem av dyrene er {w}?', slots: { w: 'ORD_WORDS' } });   // Or-T recall (a later day; v5r: «hvem» keeps the
// adjective's own form – «Hvilket dyr er klok?» broke the neuter agreement for 15 of the 33 words)
F.TPL.add('ord_u_q', { text: '{s} Hvilket dyr passer?', slots: { s: 'ORD_STEM' } });   // Or-U recall: complete the expression
})();
