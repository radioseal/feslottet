/* Feslottet – MODELS-3: people, the helper cloud Puff, named animals (Pus, Tass, Bris, Pip).
   Voxel scale 1/16 (adult ≈ 26 voxels to the top of the head = 1.6 m). Front faces +z. Origin = bottom centre.

   ch_person { skin:'skin'|'skin2'|'skin3'|'skin4', age:'voksen'|'barn'|'baby', round:bool, tall:bool, old:bool (grandparent: shorter legs, stoops),
               hair:'kort'|'lang'|'fletter'|'knute'|'krøller'|'hestehale'|'skallet'|'topp'|'bob'|'pigger'|'afro'|'flette', hairCol,
               outfit:'kjole'|'bukse'|'overall'|'kappe'|'rustning'|'forkle'|'sjø'|'genser'|'jakke'|'vest'|'skjørt', outfitCol, pantsCol, sleeveCol, trimCol,
               capeCol, shoeCol, shirtCol, apronCol, skirtCol, pattern:'striper'|'prikker'|'kofte'|'hjerte'|'maling', patternCol,
               hat:null|'krone'|'tiara'|'kokkelue'|'bakerlue'|'caps'|'solhatt'|'lue'|'hjelm'|'skaut'|'baret'|'sydvest'|'sjomann'|'blomst'|'fjærhatt'
                   |'pannebånd'|'sløyfe'|'sixpens'|'blomsterkrans'|'byggehjelm', hatCol, ribbonCol,
               acc:[ 'briller','bart','skjegg','veske','strikk','kurv','gåstol','pensel','fløyte','skjerf','halskjede','sekk' ], scarfCol, bagCol, glassCol,
               crownTilt:-1|0|1, crownBack:bool, face: see FACES, prop: see PROPS (job prop in the left hand, runtime only) }
     parts (pivots): head (neck), armL (+x shoulder, character's left), armR (-x shoulder), legL, legR (hips).
   Named presets (VOX ids, all with the same parts): ch_konge ch_dronning ch_mia ch_ole ch_kokk ch_tor ch_per ch_siv ch_rolf
     + villager jobs ch_v_<job> for F.People.JOBS (baker bonde fisker maler musikant isselger blomsterselger leketoysmaker
       batmann fyrvokter gjeter bestemor bestefar) – each job has 3 looks + a prop; F.People.villager() mixes them by seed.
       + ch_v_bygger (F.People.SITE_JOBS: builders at kingdom building sites; hard hat 'byggehjelm', prop 'hammer'; not in random picks)
   ch_prop_<id> job props: brod gulrot garn pensel fele is bukett leke tau lykt stav strikk stokk (meta.grip = voxel in the hand).
   ch_personhead = head-only def used for facial-expression swaps.
   ch_puff (helper cloud, part 'basket' = hanging basket; anchors.basket/kurv), ch_pus (cat, parts tail/head), ch_tass (dog, parts tail/head),
   ch_bris (pony @1/14, parts head/tail/legF/legB), ch_pip (dove, parts wingL/wingR, post bag).

   Runtime helper (use instead of raw F.VOX.make when you want animation + anchors):
     F.People.make(presetName | opts, {scale}) -> THREE.Group
        .userData.parts {head, armL, armR, legL, legR}
        .userData.anchors {head, face, body, back, hand (right), handL (left; carries the job prop)}
        .userData.animate(dt, t, moving)             // call every frame (idle breathing, blinking, walk cycle, mood gestures)
        .userData.play(name, seconds?, {n}?)         // one-off gesture with a matching face; play('stop') ends it
            needs: shiver (cold) rub (hungry: rubs tummy) yawn (tired) droop (bored) sneeze
            joy:   laugh dance clap hug cheer hop wave (wave hello) nod
            other: point count ({n} taps) eat think surprised sleep (loops until 'stop')
            aliases: cold hungry tired bored hello kald sulten trøtt kjed jubel klapp klem le nys pek tell danse vinke
        .userData.need('kald'|'sulten'|'trøtt'|'kjed'|'tørst'|'glad'|null)   // mood: face + the matching gesture every 4–7 s while standing
        .userData.face('normal'|'happy'|'laugh'|'surprised'|'sleepy'|'blink'|'yawn'|'bored'|'cold'|'sneeze'|'hungry'|'sad')  // base face
        .userData.faceName() / .gesture() / .prop (THREE.Group or null)
     F.People.preset(name) -> opts   F.People.villager(job, seed, {female, kid, old}?) -> opts (seeded look + prop)
     F.People.PRESETS, JOBS [{id, name, voice, prop, looks[], look}], GESTURES, FACES, PROPS, NEEDS
     F.People.animal(name) -> Group with userData.animate / play (Pus, Tass, Bris, Pip, Puff): hop nod wag eat sleep shake stretch spin fly
        (people gesture names map onto these, e.g. cheer→hop, wave→wag, yawn→stretch, shiver→shake). */
(function () {
'use strict';
const F = window.F;
const C = 12, ZC = 8; // grid centre lines (x between 11|12, z between 7|8)
let LAST = null;       // layout of the last body build (used by the part pivot getters)

function layout(o) {
  const age = o.age || 'voksen';
  let legH, torH, headH, headA, torA, torD;
  if (age === 'baby') { legH = 3; torH = 5; headH = 10; headA = 5; torA = 3; torD = 3; }
  else if (age === 'barn') { legH = 4; torH = 6; headH = 11; headA = 6; torA = 4; torD = 3; }
  else { legH = 7; torH = 8; headH = 11; headA = 6; torA = 4; torD = 3; }
  if (age === 'voksen' && o.tall) { legH += 1; torH += 1; }
  if (age === 'voksen' && o.old) { legH -= 1; }
  if (o.round) { torA += 1; torD += 1; }
  const ty0 = legH, ty1 = legH + torH - 1, hy0 = ty1 + 1, hy1 = hy0 + headH - 1;
  return { age, legH, torH, headH, headA, torA, torD, ty0, ty1, hy0, hy1,
    pivHead: [C, hy0, ZC], pivArmL: [C + torA, ty1 + 1, ZC], pivArmR: [C - torA, ty1 + 1, ZC],
    pivLegL: [C + 1.5 + (o.round ? 0.5 : 0), legH, ZC], pivLegR: [C - 1.5 - (o.round ? 0.5 : 0), legH, ZC] };
}
const has = (o, a) => !!(o.acc && o.acc.indexOf(a) >= 0);
const skirted = o => o.outfit === 'kjole' || o.outfit === 'skjørt' || (o.outfit === 'forkle' && o.skirt !== false) || o.skirt === true;

/* ------------------------------------------------------------------ body (torso, skirt, cape, walker) */
function body(v, o, L) {
  const col = o.outfitCol || 'blue', trim = o.trimCol || 'white';
  const x0 = C - L.torA, x1 = C + L.torA - 1, z0 = ZC - L.torD, z1 = ZC + L.torD - 1;
  const outfit = o.outfit || 'bukse';
  // torso with soft shoulders
  v.box(x0, L.ty0, z0, x1, L.ty1, z1, col);
  v.set(x0, L.ty1, z0, 0); v.set(x1, L.ty1, z0, 0); v.set(x0, L.ty1, z1, 0); v.set(x1, L.ty1, z1, 0);
  if (o.round) { v.ellipsoid(C - 0.5, L.ty0 + 3, z1 - 0.5, L.torA - 0.6, 3.2, 1.6, col); }
  // collar / neck shadow ring of the shirt
  v.box(C - 2, L.ty1, z1, C + 1, L.ty1, z1, o.sleeveCol || col);
  // waist belt for trousers
  if (outfit === 'bukse' || outfit === 'kappe' || outfit === 'rustning' || outfit === 'sjø' || outfit === 'genser' || outfit === 'jakke' || outfit === 'vest') v.box(x0, L.ty0, z0, x1, L.ty0, z1, outfit === 'rustning' ? 'woodDark' : (o.pantsCol || 'jeansBlue'));
  if (skirted(o)) {
    const waist = L.ty0 + 1, bottom = L.age === 'voksen' ? 2 : 1;
    for (let y = bottom; y <= waist; y++) {
      const k = waist - y, a = L.torA + Math.round(k * 0.55), d = L.torD + Math.round(k * 0.35);
      v.box(C - a, y, ZC - d, C + a - 1, y, ZC + d - 1, y === bottom ? trim : (o.skirtCol || col));
      if (k > 0) v.clear(C - a + 1, y, ZC - d + 1, C + a - 2, y, ZC + d - 2); // hollow so legs show from below
    }
    // little buttons on the bodice
    v.set(C - 1, L.ty1 - 2, z1, trim); v.set(C, L.ty1 - 2, z1, trim);
  }
  if (outfit === 'forkle') { // apron painted on the front, with a pocket and straps
    const ap = o.apronCol || 'white';
    v.box(C - 3, L.ty0, z1, C + 2, L.ty1 - 2, z1, ap);
    v.set(C - 3, L.ty1 - 1, z1, ap); v.set(C + 2, L.ty1 - 1, z1, ap);
    v.paint((x, y, z, h) => (y >= 2 && y <= L.ty0 + 1 && x >= C - 3 && x <= C + 2 && z >= z1 && v.get(x, y, z + 1) === 0 ? ap : null));
    if (!skirted(o)) { const rows = L.ty0 - 3; v.box(C - 3, rows, z1, C + 2, L.ty0, z1, ap); }
    v.box(C - 1, L.ty0 + 1, z1 + 1, C, L.ty0 + 1, z1 + 1, ap);
  }
  if (outfit === 'overall') {
    v.box(C - 3, L.ty0, z1, C + 2, L.ty1 - 2, z1, o.pantsCol || 'jeansBlue');
    v.box(x0, L.ty0, z0, x1, L.ty0 + 1, z1, o.pantsCol || 'jeansBlue');
    v.box(C - 3, L.ty1 - 1, z1, C - 3, L.ty1, z1, o.pantsCol || 'jeansBlue'); v.box(C + 2, L.ty1 - 1, z1, C + 2, L.ty1, z1, o.pantsCol || 'jeansBlue');
    v.set(C - 3, L.ty1 - 2, z1, 'gold'); v.set(C + 2, L.ty1 - 2, z1, 'gold');
    v.box(C - 1, L.ty0 + 2, z1 + 1, C, L.ty0 + 3, z1 + 1, o.pantsCol || 'jeansBlue');
  }
  if (outfit === 'kappe') { // cape with ermine collar, gold buttons
    const cc = o.capeCol || 'red';
    v.box(x0 - 1, 2, z0 - 1, x1 + 1, L.ty1, z0 - 1, cc);
    v.box(x0 - 1, 2, z0, x0 - 1, L.ty1, z0 + 1, cc); v.box(x1 + 1, 2, z0, x1 + 1, L.ty1, z0 + 1, cc);
    v.box(x0 - 1, 2, z0 - 1, x1 + 1, 2, z0 - 1, 'wool');
    v.box(x0 - 1, L.ty1, z0 - 1, x1 + 1, L.ty1, z1, 'wool');
    v.clear(C - 2, L.ty1, z0 + 1, C + 1, L.ty1, z1 - 1); // keep the head seat open
    for (let x = x0 - 1; x <= x1 + 1; x += 3) v.set(x, L.ty1, z0 - 1, 'black');
    for (let y = L.ty0 + 1; y < L.ty1 - 1; y += 2) v.set(C - 1 + (y % 2), y, z1 + (o.round ? 1 : 0), 'gold');
  }
  if (outfit === 'rustning') { // gentle knight: silver tunic with a pink heart
    v.box(x0 - 1, L.ty1 - 1, z0, x0 - 1, L.ty1, z1, 'silver'); v.box(x1 + 1, L.ty1 - 1, z0, x1 + 1, L.ty1, z1, 'silver');
    const hz = z1 + 1, hy = L.ty0 + 3;
    [[-2, 2], [-1, 2], [1, 2], [2, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 0], [0, 0], [1, 0], [0, -1]].forEach(([dx, dy]) => v.set(C + dx - (dx > 0 ? 1 : 0) + (dx === 0 ? 0 : 0), hy + dy, hz, 'rose'));
  }
  if (outfit === 'sjø') { // sailor stripes
    for (let y = L.ty0 + 1; y <= L.ty1; y += 2) v.box(x0, y, z0, x1, y, z1, 'white');
    v.box(C - 1, L.ty1 - 1, z1, C, L.ty1, z1, 'red');
  }
  if (outfit === 'skjørt') { // blouse (sleeveCol) over a skirt (outfitCol)
    v.box(x0, L.ty0 + 1, z0, x1, L.ty1, z1, o.sleeveCol || 'white'); v.box(x0, L.ty1, z0, x1, L.ty1, z0, 0);
    v.box(C - 1, L.ty1 - 1, z1, C, L.ty1 - 1, z1, o.trimCol || 'rose');
  }
  if (outfit === 'jakke' || outfit === 'vest') { // open front: shirt shows in the middle (vest: shirt sleeves)
    const sh = o.shirtCol || 'white';
    v.box(C - 1, L.ty0 + 1, z1, C, L.ty1, z1, sh);
    for (let y = L.ty0 + 2; y < L.ty1; y += 2) { v.set(C - 2, y, z1, outfit === 'jakke' ? 'gold' : 'woodDark'); }
    if (outfit === 'vest') { v.box(x0, L.ty1 - 1, z0 + 1, x0, L.ty1, z1 - 1, sh); v.box(x1, L.ty1 - 1, z0 + 1, x1, L.ty1, z1 - 1, sh); }
    else { v.box(C - 3, L.ty1, z1, C - 2, L.ty1, z1, o.trimCol || o.outfitCol || 'blue'); v.box(C + 1, L.ty1, z1, C + 2, L.ty1, z1, o.trimCol || o.outfitCol || 'blue'); }
  }
  pattern(v, o, L, x0, x1, z0, z1);
  if (o.capeEmblem) emblem(v, o, L, z1);
  if (has(o, 'skjerf')) { // scarf: ring round the neck + a fringed tail down the front
    const sc = o.scarfCol || 'red';
    v.box(C - 3, L.ty1, z0, C + 2, L.ty1, z1 + 1, sc); v.box(C - 2, L.ty1 + 1, z0 + 1, C + 1, L.ty1 + 1, z1, sc);
    v.box(C + 1, L.ty1 - 4, z1 + 1, C + 2, L.ty1 - 1, z1 + 1, sc); v.set(C + 1, L.ty1 - 5, z1 + 1, 'white'); v.set(C + 2, L.ty1 - 5, z1 + 1, 'white');
    for (let y = L.ty1 - 3; y < L.ty1; y += 2) { v.set(C + 1, y, z1 + 1, 'white'); }
  }
  if (has(o, 'halskjede')) { for (let x = C - 2; x <= C + 1; x++) v.set(x, L.ty1 - 1 - (x === C - 1 || x === C ? 1 : 0), z1 + (o.round ? 1 : 0), 'milk'); v.set(C - 1, L.ty1 - 3, z1, 'gem1'); }
  if (has(o, 'sekk')) { // backpack
    const bc = o.bagCol || 'coral';
    v.box(C - 3, L.ty0 + 1, z0 - 3, C + 2, L.ty1 - 1, z0 - 1, bc); v.box(C - 3, L.ty1 - 2, z0 - 4, C + 2, L.ty1 - 1, z0 - 3, o.trimCol || 'butter');
    v.box(C - 2, L.ty0 + 2, z0 - 4, C + 1, L.ty0 + 3, z0 - 4, bc); v.set(C - 1, L.ty1 - 3, z0 - 4, 'gold');
    v.box(C - 3, L.ty1, z0, C - 3, L.ty1, z1, bc); v.box(C + 2, L.ty1, z0, C + 2, L.ty1, z1, bc);
  }
  if (has(o, 'veske')) { // satchel on the left hip with a strap
    v.box(x1 + 1, L.ty0 - 1, ZC - 1, x1 + 2, L.ty0 + 2, ZC + 1, o.bagCol || 'woodRed');
    v.line(x0, L.ty1, z1, x1, L.ty0 + 2, z1, o.bagCol || 'woodRed');
    v.set(x1 + 2, L.ty0 + 2, ZC + 2, 'gold');
  }
  if (has(o, 'gåstol')) { // toddler walker: ring on 4 little legs with wheels
    const r = L.torA + 2.5, yR = L.ty0;
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; v.box(Math.round(C - 0.5 + Math.cos(t) * r), yR, Math.round(ZC - 0.5 + Math.sin(t) * r), Math.round(C - 0.5 + Math.cos(t) * r), yR + 1, Math.round(ZC - 0.5 + Math.sin(t) * r), a % 10 < 5 ? 'mint' : 'butter'); }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = Math.round(C - 0.5 + dx * (r - 0.6)), z = Math.round(ZC - 0.5 + dz * (r - 0.6));
      v.line(x, 1, z, x, yR - 1, z, 'white'); v.set(x, 0, z, 'pink');
    }
    v.box(Math.round(C - 2), yR + 2, Math.round(ZC + r - 1), Math.round(C + 1), yR + 2, Math.round(ZC + r - 1), 'yellow'); // toy bar
    v.set(C - 2, yR + 3, Math.round(ZC + r - 1), 'red'); v.set(C + 1, yR + 3, Math.round(ZC + r - 1), 'blue');
  }
}

/* WP7 royals: a 3×3 kingdom badge on the left chest (o.capeEmblem = realm emblem). Rows top → bottom; letters → colours. */
const EMBLEMS = {
  flower: ['.p.', 'pyp', '.p.'], horseshoe: ['g.g', 'g.g', 'ggg'], bubble: ['.s.', 'sws', '.s.'], shell: ['sps', 'sss', '.s.'],
  cake: ['.r.', 'ccc', 'ccc'], note: ['.nn', '.n.', 'nn.'], star: ['.g.', 'ggg', 'g.g'], snowflake: ['w.w', '.w.', 'w.w'],
  crystal: ['.c.', 'ccc', '.c.'], rainbow: ['rrr', 'yyy', 'bbb'],
};
const EMB_COL = { p: 'pink', y: 'yellow', g: 'gold', s: 'sky', w: 'white', r: 'cherry', c: 'cream', n: 'navySoft', b: 'blue' };
function emblem(v, o, L, z1) {
  const e = EMBLEMS[o.capeEmblem]; if (!e) return;
  const zf = z1 + 1 + (o.round ? 1 : 0), xs = C + 1, yTop = L.ty1 - 1 - (L.age === 'voksen' ? 0 : 1);
  const crystal = o.capeEmblem === 'crystal';
  e.forEach((row, r) => { for (let i = 0; i < 3; i++) { const ch = row[i]; if (ch === '.') continue; v.set(xs + i, yTop - r, zf, crystal && ch === 'c' ? 'crystal' : (EMB_COL[ch] || 'gold')); } });
  // kings: the same emblem, larger (×2), on the back of the cape (z0 − 1), seen when they walk away
  if (o.outfit === 'kappe') {
    const z0 = ZC - L.torD - 1, yb = L.ty0 + 1;
    e.forEach((row, r) => { for (let i = 0; i < 3; i++) { const ch = row[i]; if (ch === '.') continue; const c = crystal && ch === 'c' ? 'crystal' : (EMB_COL[ch] || 'gold');
      const x = C + 2 - i * 2; v.box(x - 1, yb + (2 - r) * 2, z0 - 1, x, yb + (2 - r) * 2 + 1, z0 - 1, c); } });
  }
}

/* torso pattern on the outfit colour cells only: striper | prikker | kofte (Norwegian sweater yoke) | hjerte | maling (paint splashes) */
function pattern(v, o, L, x0, x1, z0, z1) {
  const pt = o.pattern || (o.outfit === 'genser' ? 'kofte' : null); if (!pt) return;
  const base = F.col(o.outfitCol || 'blue'), pc = o.patternCol || 'white';
  const onBase = (x, y, z) => v.get(x, y, z) && (y >= L.ty0 + 1 && y <= L.ty1 && x >= x0 - 1 && x <= x1 + 1 && z >= z0 - 1 && z <= z1 + 1);
  v.paint((x, y, z, c) => {
    if (c !== base || !onBase(x, y, z)) return null;
    if (pt === 'striper') return (y - L.ty0) % 2 === 0 ? pc : null;
    if (pt === 'prikker') return F.U.hash2(x * 3 + z * 7, y, 17) < 0.16 ? pc : null;
    if (pt === 'maling') { const h = F.U.hash2(x * 5 + z, y * 3, 29); return h < 0.05 ? 'rose' : h < 0.1 ? 'sky' : h < 0.14 ? 'yellow' : h < 0.17 ? 'mint' : null; }
    if (pt === 'kofte') { const yy = L.ty1 - y; if (yy === 0) return pc; if (yy === 1) return (x + z) % 2 ? pc : null; if (yy === 2) return (x + z) % 4 === 1 ? pc : null; if (y === L.ty0 + 1) return pc; return null; }
    return null;
  });
  if (pt === 'hjerte') { const hy = L.ty0 + 3, hc = o.patternCol || 'rose'; v.box(C - 3, hy + 1, z1, C - 2, hy + 1, z1, hc); v.box(C + 1, hy + 1, z1, C + 2, hy + 1, z1, hc); v.box(C - 3, hy, z1, C + 2, hy, z1, hc); v.box(C - 2, hy - 1, z1, C + 1, hy - 1, z1, hc); v.box(C - 1, hy - 2, z1, C, hy - 2, z1, hc); }
}

/* ------------------------------------------------------------------ legs / arms */
function leg(v, o, L, side) {
  const xs = side > 0 ? [C + 1, C + 3] : [C - 4, C - 2];
  if (o.round) { xs[0] += side > 0 ? 1 : -1; xs[1] += side > 0 ? 1 : -1; }
  const pants = skirted(o) ? (o.legCol || o.skin || 'skin') : (o.pantsCol || 'jeansBlue');
  v.box(xs[0], 2, ZC - 2, xs[1], L.legH - 1, ZC + 1, pants);
  v.box(xs[0], 0, ZC - 2, xs[1], 1, ZC + 2, o.shoeCol || 'woodDark');
  if (L.age === 'baby') v.box(xs[0], 0, ZC - 2, xs[1], 0, ZC + 2, o.shoeCol || 'white');
}
function arm(v, o, L, side) {
  const x0 = side > 0 ? C + L.torA : C - L.torA - 2, x1 = x0 + 1;
  const len = L.age === 'voksen' ? 7 : L.age === 'barn' ? 5 : 4;
  const top = L.ty1, bot = top - len + 1;
  const sl = o.sleeveCol || (o.outfit === 'rustning' ? 'silver' : (o.outfitCol || 'blue'));
  v.box(x0, bot + 2, ZC - 1, x1, top, ZC, sl);
  v.box(x0, bot, ZC - 1, x1, bot + 1, ZC, o.skin || 'skin');
  if (side < 0 && has(o, 'strikk')) { // knitting: pink yarn ball + two needles
    v.sphere(x0 + 0.5, bot - 1, ZC + 2.5, 1.6, 'pink'); v.line(x0 - 1, bot + 2, ZC + 1, x0 + 2, bot - 2, ZC + 4, 'steel'); v.line(x0 + 2, bot + 2, ZC + 1, x0 - 1, bot - 2, ZC + 4, 'steel');
    v.box(x0, bot - 3, ZC + 3, x1, bot - 2, ZC + 4, 'mint');
  }
  if (side < 0 && has(o, 'kurv')) { v.box(x0 - 1, bot - 4, ZC - 2, x1 + 1, bot - 2, ZC + 1, 'woodLight'); v.box(x0, bot - 2, ZC - 1, x1, bot - 2, ZC, 'red'); v.line(x0 - 1, bot - 1, ZC - 1, x1 + 1, bot - 1, ZC - 1, 'woodLight'); }
  if (side < 0 && has(o, 'pensel')) { v.line(x0, bot, ZC, x0, bot - 4, ZC + 2, 'woodLight'); v.box(x0, bot - 5, ZC + 2, x0, bot - 4, ZC + 3, 'pink'); }
  if (side < 0 && has(o, 'fløyte')) v.line(x0 + 1, bot, ZC + 1, x0 + 4, bot + 3, ZC + 3, 'silver');
  if (side > 0 && has(o, 'blomsterbukett')) { v.line(x0, bot, ZC, x0, bot - 2, ZC, 'green'); v.set(x0 - 1, bot - 3, ZC, 'rose'); v.set(x0, bot - 3, ZC, 'yellow'); v.set(x0 + 1, bot - 3, ZC, 'pink'); }
}


/* ------------------------------------------------------------------ facial expressions (painted on the head's front plane) */
const FACES = ['normal', 'happy', 'laugh', 'surprised', 'sleepy', 'blink', 'yawn', 'bored', 'cold', 'sneeze', 'hungry', 'sad'];
function faceFeatures(v, o, L, f) {
  const { ey, eh, exL, exR, z1, y0 } = f, e = o.face || 'normal', K = 'black', M = 'cherry';
  const hl = o.eyeHL || 'tall';
  const openEyes = (tall, shine) => { for (const ex of [exL, exR]) {
    v.box(ex, ey, z1, ex + 1, ey + eh - 1, z1, K);
    if (tall) { v.set(ex, ey + eh, z1, K); v.set(ex + 1, ey + eh, z1, K); }
    if (shine !== false) { if (hl === 'tl') v.set(ex, ey + eh - 1, z1, 'white'); else if (hl === 'tr') v.set(ex + 1, ey + eh - 1, z1, 'white'); else if (hl === 'ml') v.set(ex, ey + eh - 2, z1, 'white'); else v.set(ex, ey + eh - 1, z1, 'white'); }
  } };
  const arcEyes = () => { for (const ex of [exL, exR]) { v.set(ex, ey + 1, z1, K); v.set(ex + 1, ey + 1, z1, K); v.set(ex - 1, ey, z1, K); v.set(ex + 2, ey, z1, K); } };      // ^ ^ (happy, eyes closed)
  const cupEyes = () => { for (const ex of [exL, exR]) { v.set(ex, ey, z1, K); v.set(ex + 1, ey, z1, K); v.set(ex - 1, ey + 1, z1, K); v.set(ex + 2, ey + 1, z1, K); } };      // u u (sleepy)
  const lineEyes = () => { for (const ex of [exL, exR]) v.box(ex - 1, ey + 1, z1, ex + 2, ey + 1, z1, K); };
  const halfEyes = () => { for (const ex of [exL, exR]) { v.box(ex, ey, z1, ex + 1, ey + 1, z1, K); v.box(ex - 1, ey + 2, z1, ex + 2, ey + 2, z1, K); } };
  const squeeze = () => { v.set(exL - 1, ey + 2, z1, K); v.set(exL, ey + 1, z1, K); v.set(exL + 1, ey + 1, z1, K); v.set(exL - 1, ey, z1, K);
    v.set(exR + 2, ey + 2, z1, K); v.set(exR + 1, ey + 1, z1, K); v.set(exR, ey + 1, z1, K); v.set(exR + 2, ey, z1, K); };            // > <
  const cheeks = c => { if (!o.noCheeks) { v.box(exL - 1, ey - 1, z1, exL, ey - 1, z1, c || 'blossom'); v.box(exR + 1, ey - 1, z1, exR + 2, ey - 1, z1, c || 'blossom'); } };
  const smile = () => { v.box(C - 1, y0 + 1, z1, C, y0 + 1, z1, M); v.set(C - 2, y0 + 2, z1, M); v.set(C + 1, y0 + 2, z1, M); };
  const grin = () => { v.box(C - 2, y0 + 1, z1, C + 1, y0 + 1, z1, M); v.set(C - 3, y0 + 2, z1, M); v.set(C + 2, y0 + 2, z1, M); };
  const openMouth = (w, h, inner) => { const x0 = C - w, x1 = C + w - 1; v.box(x0, y0 + 1, z1, x1, y0 + h, z1, M); if (inner && w > 1) v.box(x0 + 1, y0 + 1, z1, x1 - 1, y0 + Math.max(1, h - 1), z1, inner); };
  const brows = (dy, tilt) => { for (const ex of [exL, exR]) { const out = ex === exL ? -1 : 1; v.set(ex, ey + eh + dy + (tilt && out < 0 ? tilt : 0), z1, o.hairCol || 'hairBrown'); v.set(ex + 1, ey + eh + dy + (tilt && out > 0 ? tilt : 0), z1, o.hairCol || 'hairBrown'); } };
  switch (e) {
    case 'happy': arcEyes(); cheeks('pink'); grin(); break;
    case 'laugh': arcEyes(); cheeks('pink'); openMouth(2, 2, 'red'); v.set(C - 3, y0 + 2, z1, M); v.set(C + 2, y0 + 2, z1, M); break;
    case 'surprised': openEyes(true); brows(2); cheeks(); openMouth(1, 2); break;
    case 'sleepy': cupEyes(); cheeks(); v.box(C - 1, y0 + 1, z1, C, y0 + 1, z1, M); break;
    case 'blink': lineEyes(); cheeks(); smile(); break;
    case 'yawn': lineEyes(); cheeks(); openMouth(1, 3, null); v.box(C - 1, y0 + 1, z1, C, y0 + 2, z1, 'red'); break;
    case 'bored': halfEyes(); cheeks(); v.box(C - 2, y0 + 1, z1, C + 1, y0 + 1, z1, M); break;
    case 'cold': openEyes(false, true); brows(1, 1); cheeks('coral'); v.set(C - 2, y0 + 1, z1, M); v.set(C - 1, y0 + 2, z1, M); v.set(C, y0 + 1, z1, M); v.set(C + 1, y0 + 2, z1, M); v.box(C - 1, y0 + 3, z1 + 1, C, y0 + 3, z1 + 1, 'coral'); break;
    case 'sneeze': squeeze(); cheeks('pink'); openMouth(1, 2, null); break;
    case 'hungry': openEyes(true); cheeks(); openMouth(1, 2, null); v.set(C, y0 + 1, z1, 'pink'); break;
    case 'sad': openEyes(false); brows(1, -1); cheeks(); v.set(C - 2, y0 + 1, z1, M); v.box(C - 1, y0 + 2, z1, C, y0 + 2, z1, M); v.set(C + 1, y0 + 1, z1, M); break;
    default: openEyes(hl === 'tall'); cheeks(); smile();
  }
}

/* ------------------------------------------------------------------ head: face, hair, hats */
function head(v, o, L) {
  const a = L.headA, x0 = C - a, x1 = C + a - 1, z0 = ZC - 5, z1 = ZC + 4, y0 = L.hy0, y1 = L.hy1;
  const skin = o.skin || 'skin';
  v.box(x0, y0, z0, x1, y1, z1, skin);
  for (let y = y0; y <= y1; y++) { v.set(x0, y, z0, 0); v.set(x1, y, z0, 0); v.set(x0, y, z1, 0); v.set(x1, y, z1, 0); }
  v.box(x0, y1, z0, x1, y1, z0, 0); v.box(x0, y1, z1, x1, y1, z1, 0); v.box(x0, y1, z0, x0, y1, z1, 0); v.box(x1, y1, z0, x1, y1, z1, 0);
  v.box(x0, y0, z0, x1, y0, z0, 0); // soft chin back edge
  // ears
  v.set(x0 - 1, y0 + 4, ZC - 1, skin); v.set(x1 + 1, y0 + 4, ZC - 1, skin);
  // face (front plane z1) – expression o.face: normal|happy|laugh|surprised|sleepy|blink|yawn|bored|cold|sneeze|hungry|sad
  const baby = L.age === 'baby';
  const ey = y0 + 3, eh = baby ? 2 : 3;
  const exL = C - 4, exR = C + 2; // two eyes, 2 wide, 4 apart
  faceFeatures(v, o, L, { ey, eh, exL, exR, z1, y0 });
  if (o.lashes && /^(normal|surprised|cold|hungry|sad)$/.test(o.face || 'normal')) { v.set(exL - 1, ey + eh - 1, z1, 'black'); v.set(exR + 2, ey + eh - 1, z1, 'black'); }
  if (has(o, 'bart')) { v.box(C - 3, y0 + 2, z1 + 1, C + 2, y0 + 2, z1 + 1, o.beardCol || o.hairCol || 'hairBrown'); v.set(C - 4, y0 + 3, z1 + 1, o.beardCol || o.hairCol || 'hairBrown'); v.set(C + 3, y0 + 3, z1 + 1, o.beardCol || o.hairCol || 'hairBrown'); v.box(C - 1, y0 + 1, z1, C, y0 + 1, z1, 'cherry'); v.set(C - 2, y0 + 1, z1, 'cherry'); v.set(C + 1, y0 + 1, z1, 'cherry'); v.box(C - 1, y0, z1, C, y0, z1, 'cherry'); }
  if (has(o, 'skjegg')) { const bc = o.beardCol || o.hairCol || 'hairBrown'; v.box(x0 + 1, y0 - 2, z1 - 3, x1 - 1, y0 + 1, z1, bc); v.box(x0 + 2, y0 - 3, z1 - 2, x1 - 2, y0 - 2, z1 - 1, bc); v.box(C - 1, y0 + 1, z1, C, y0 + 1, z1, 'cherry'); v.set(x0, y0 + 2, z1 - 1, bc); v.set(x1, y0 + 2, z1 - 1, bc); }
  if (has(o, 'briller')) { const g = o.glassCol || 'woodDark'; for (const ex of [exL, exR]) { v.box(ex - 1, ey - 1, z1 + 1, ex + 2, ey - 1, z1 + 1, g); v.box(ex - 1, ey + eh, z1 + 1, ex + 2, ey + eh, z1 + 1, g); v.box(ex - 1, ey, z1 + 1, ex - 1, ey + eh - 1, z1 + 1, g); v.box(ex + 2, ey, z1 + 1, ex + 2, ey + eh - 1, z1 + 1, g); } v.box(C - 1, ey + 1, z1 + 1, C, ey + 1, z1 + 1, g); }
  hair(v, o, L, x0, x1, z0, z1, y0, y1);
  hat(v, o, L, x0, x1, z0, z1, y0, y1);
}
function blob(v, cx, cy, cz, rx, ry, rz, c, skip) { // ellipsoid that leaves cells where skip(x,y,z) is true
  for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1 && !skip(x, y, z)) v.set(x, y, z, c);
}
function hair(v, o, L, x0, x1, z0, z1, y0, y1) {
  const s = o.hair || 'kort', c = o.hairCol || 'hairBrown';
  if (s === 'skallet') { v.box(x0 - 1, y0 + 3, z0 + 1, x0, y0 + 6, z1 - 3, c); v.box(x1, y0 + 3, z0 + 1, x1 + 1, y0 + 6, z1 - 3, c); v.box(x0, y0 + 3, z0 - 1, x1, y0 + 6, z0 - 1, c); return; }
  const top = y1 + 1;
  if (s === 'topp') { v.box(x0 + 1, top, z0 + 1, x1 - 1, top, z1 - 2, c); v.box(x0, y0 + 6, z0 - 1, x1, y1, z0 - 1, c); v.box(C - 1, top + 1, ZC - 1, C, top + 2, ZC, c); v.set(C + 1, top + 3, ZC, c); v.set(C + 1, top + 3, ZC - 1, c); return; }
  // shell: top + back + sides
  v.box(x0, top, z0, x1, top, z1 - 1, c);
  v.box(x0 + 1, top, z1, x1 - 1, top, z1, c);
  v.box(x0 - 1, y0 + 5, z0, x0 - 1, y1, z1 - 2, c); v.box(x1 + 1, y0 + 5, z0, x1 + 1, y1, z1 - 2, c);
  v.box(x0, y0 + 2, z0 - 1, x1, y1, z0 - 1, c);
  v.set(x0 - 1, top - 1, z0, 0); v.set(x1 + 1, top - 1, z0, 0); // round the back corners
  // fringe over the forehead: full row + scalloped row
  v.box(x0 + 1, y1 - 1, z1, x1 - 1, y1, z1, c); v.box(x0, y1 - 1, z1 - 1, x1, y1, z1 - 1, c);
  for (let x = x0 + 1; x <= x1 - 1; x++) if ((x - x0) % 3 !== 1) v.set(x, y1 - 2, z1, c);
  v.box(x0, y0 + 5, z1 - 1, x0, y1, z1 - 1, c); v.box(x1, y0 + 5, z1 - 1, x1, y1, z1 - 1, c);
  // soften the silhouette: round the top edges of the hair cap
  v.box(x0, top, z0, x0, top, z1, 0); v.box(x1, top, z0, x1, top, z1, 0); v.box(x0, top, z0, x1, top, z0, 0);
  v.set(x0 - 1, y1, z0, 0); v.set(x1 + 1, y1, z0, 0); v.set(x0 - 1, y1, z1 - 2, 0); v.set(x1 + 1, y1, z1 - 2, 0);
  if (s === 'lang') {
    v.box(x0 - 1, y0 - 4, z0 - 1, x1 + 1, y0 + 4, z0 + 1, c);
    v.box(x0 - 1, y0 - 3, z0 + 2, x0 - 1, y0 + 4, z1 - 3, c); v.box(x1 + 1, y0 - 3, z0 + 2, x1 + 1, y0 + 4, z1 - 3, c);
    for (let x = x0; x <= x1; x += 2) v.set(x, y0 - 5, z0, c);
  }
  if (s === 'fletter') {
    for (const sd of [-1, 1]) {
      const bx = sd < 0 ? x0 - 2 : x1 + 2;
      v.box(Math.min(bx, bx - sd), y0 + 4, ZC - 2, Math.max(bx, bx - sd), y0 + 6, ZC, c);
      for (let k = 0; k < 4; k++) v.box(bx + sd * (k > 1 ? 1 : 0), y0 + 3 - k, ZC - 2 + (k % 2), bx + sd * (k > 1 ? 1 : 0), y0 + 3 - k, ZC - 1 + (k % 2), c);
      v.set(bx + sd, y0 - 1, ZC - 1, o.ribbonCol || 'pink'); v.set(bx + sd, y0 - 1, ZC - 2, o.ribbonCol || 'pink');
      v.set(bx - sd, y0 + 5, ZC + 1, o.ribbonCol || 'pink');
    }
  }
  if (s === 'knute') { v.sphere(C - 0.5, top + 2.2, ZC - 3, 2.6, c); v.box(C - 2, top, ZC - 4, C + 1, top + 1, ZC - 2, c); }
  if (s === 'hestehale') { v.box(C - 1, y1 - 1, z0 - 2, C, y1 + 1, z0 - 2, c); v.box(C - 1, y0 - 3, z0 - 3, C, y1 - 1, z0 - 2, c); v.set(C - 1, y1, z0 - 2, o.ribbonCol || 'rose'); v.set(C, y1, z0 - 2, o.ribbonCol || 'rose'); }
  if (s === 'bob') { // blunt bob: sides and back down to the chin, straight fringe
    v.box(x0 - 1, y0 + 1, z0 - 1, x1 + 1, y1, z0, c); v.box(x0 - 1, y0 + 1, z0, x0 - 1, y1, z1 - 2, c); v.box(x1 + 1, y0 + 1, z0, x1 + 1, y1, z1 - 2, c);
    v.box(x0, y1 - 2, z1, x1, y1 - 2, z1, c); v.set(x0 - 1, y0 + 1, z1 - 2, o.ribbonCol || c);
  }
  if (s === 'pigger') { // spiky
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1 - 1; z += 3) { v.set(x, top + 1, z, c); if ((x + z) % 4 === 0) v.set(x, top + 2, z, c); }
    v.set(C - 1, top + 2, z1 - 1, c); v.set(C, top + 3, z1 - 1, c); v.set(x1 - 1, top + 2, z1 - 1, c);
  }
  if (s === 'afro') {
    blob(v, C - 0.5, y1, ZC - 1, L.headA + 2.6, 5.6, 6.6, c, (x, y, z) => z > z1 || (z >= z1 - 1 && y <= y1 - 3 && x >= x0 && x <= x1));
  }
  if (s === 'flette') { // one long braid over the left shoulder (+x), with a bow
    for (let k = 0; k < 7; k++) v.box(x1 + 1, y0 + 3 - k, ZC + (k % 2), x1 + 2, y0 + 3 - k, ZC + 1 + (k % 2), c);
    v.box(x1 + 1, y0 - 4, ZC, x1 + 2, y0 - 4, ZC + 1, o.ribbonCol || 'rose');
  }
  if (s === 'krøller') {
    blob(v, C - 0.5, y1 - 1, ZC - 1, L.headA + 1.6, 4.4, 5.6, c, (x, y, z) => z > z1 || (z >= z1 - 1 && y <= y1 - 3 && x >= x0 && x <= x1)); // face stays free
  }
}
function hat(v, o, L, x0, x1, z0, z1, y0, y1) {
  const h = o.hat; if (!h) return;
  const top = y1 + 2; // first free row above hair
  const hc = o.hatCol;
  if (h === 'krone' || h === 'tiara' || h === 'litenkrone') {   // litenkrone = a small adult crown (WP7 royals)
    const small = h !== 'krone' || L.age !== 'voksen';
    const a = small ? 3 : 4, tilt = o.crownTilt || 0, back = o.crownBack ? 3 : 0;
    const cx0 = C - a + (tilt > 0 ? 1 : 0), cx1 = C + a - 1 + (tilt > 0 ? 1 : 0), cz0 = ZC - a - back, cz1 = ZC + a - 1 - back;
    const yb = top - 1 - (o.crownBack ? 1 : 0);
    if (h === 'tiara') {
      v.box(cx0, yb, cz1, cx1, yb, cz1, hc || 'gold'); v.set(C - 1, yb + 1, cz1, hc || 'gold'); v.set(C, yb + 1, cz1, hc || 'gold'); v.set(C - 1, yb + 2, cz1, 'gem1'); v.set(C, yb + 2, cz1, 'gem1');
      v.set(cx0 + 1, yb + 1, cz1, hc || 'gold'); v.set(cx1 - 1, yb + 1, cz1, hc || 'gold');
      return;
    }
    for (let x = cx0; x <= cx1; x++) for (let z = cz0; z <= cz1; z++) {
      if (x !== cx0 && x !== cx1 && z !== cz0 && z !== cz1) continue;
      const dy = tilt ? Math.round((x - cx0) / (cx1 - cx0) * tilt * 1.5 * (tilt > 0 ? 1 : -1)) * (tilt > 0 ? 1 : 0) : 0;
      v.box(x, yb + dy, z, x, yb + 1 + dy, z, hc || 'gold');
      const corner = (x === cx0 || x === cx1) && (z === cz0 || z === cz1), mid = (x === C - 1 || x === C) && (z === cz0 || z === cz1);
      if (corner || mid || ((z === cz0 || z === cz1) && (x - cx0) % 2 === 0 && !small)) v.set(x, yb + 2 + dy, z, hc || 'gold');
      if (corner) v.set(x, yb + 3 + dy, z, 'gold');
    }
    const fz = o.crownBack ? cz0 : cz1;
    v.set(C - 1, yb, fz, 'gem1'); v.set(C, yb, fz, 'gem2'); v.set(cx0 + 1, yb + 1, fz, 'gem3'); v.set(cx1 - 1, yb + 1, fz, 'gem1');
    return;
  }
  if (h === 'kokkelue' || h === 'bakerlue') {
    const tall = h === 'kokkelue' ? 5 : 2;
    v.box(x0, top - 1, z0, x1, top, z1 - 1, 'white');
    v.ellipsoid(C - 0.5, top + tall, ZC - 1, L.headA + 0.6, tall * 0.55 + 1.5, 5, 'white');
    v.box(x0, top - 1, z1 - 1, x1, top - 1, z1 - 1, 'wool');
    return;
  }
  if (h === 'caps') {
    v.box(x0, top - 1, z0, x1, top + 1, z1 - 1, hc || 'red'); v.box(x0 + 1, top + 2, z0 + 1, x1 - 1, top + 2, z1 - 2, hc || 'red');
    v.box(x0 + 1, top - 1, z1, x1 - 1, top - 1, z1 + 3, hc || 'red'); v.set(C - 1, top + 1, z1, 'gold'); v.set(C, top + 1, z1, 'gold');
    return;
  }
  if (h === 'solhatt') {
    v.box(x0 - 3, top - 1, z0 - 3, x1 + 3, top - 1, z1 + 3, hc || 'hay');
    for (const [x, z] of [[x0 - 3, z0 - 3], [x1 + 3, z0 - 3], [x0 - 3, z1 + 3], [x1 + 3, z1 + 3]]) v.set(x, top - 1, z, 0);
    v.box(x0 + 1, top, z0 + 1, x1 - 1, top + 2, z1 - 1, hc || 'hay'); v.box(x0 + 1, top, z0 + 1, x1 - 1, top, z1 - 1, o.ribbonCol || 'rose');
    v.set(x1 - 1, top + 1, z1, 'blossom'); v.set(x1 - 2, top + 1, z1, 'white');
    return;
  }
  if (h === 'lue') { v.ellipsoid(C - 0.5, top - 1, ZC - 1, L.headA + 0.5, 3.2, 5.5, hc || 'mint'); v.box(x0, top - 2, z0, x1, top - 1, z1, hc || 'mint'); v.box(x0 - 1, top - 2, z0, x1 + 1, top - 2, z1, 'white'); v.sphere(C - 0.5, top + 3, ZC - 1, 1.6, 'white'); v.clear(x0 + 1, 0, z1 + 1, x1 - 1, top - 3, z1 + 3); return; }
  if (h === 'hjelm') { v.ellipsoid(C - 0.5, top - 1, ZC - 1, L.headA + 0.8, 3.6, 5.8, 'silver'); v.box(x0 - 1, y0 + 4, z0, x0 - 1, top - 1, z1 - 2, 'silver'); v.box(x1 + 1, y0 + 4, z0, x1 + 1, top - 1, z1 - 2, 'silver'); v.box(C - 1, top + 2, ZC - 4, C, top + 5, ZC + 1, 'rose'); v.box(C - 1, top + 5, ZC - 5, C, top + 6, ZC - 2, 'rose'); return; }
  if (h === 'skaut') { v.box(x0 - 1, y1 - 1, z0 - 1, x1 + 1, top, z1 - 2, hc || 'coral'); v.box(x0, y1 - 1, z1 - 1, x1, y1, z1 - 1, hc || 'coral'); for (let x = x0; x <= x1; x += 3) v.set(x, top, z1 - 2, 'white'); v.box(C - 1, y0 - 1, z0 - 2, C, y0 + 1, z0 - 1, hc || 'coral'); return; }
  if (h === 'byggehjelm') {   // WP7: builder's hard hat (DESIGN2 §3.4): dome, a rim all round, a longer peak and a ridge
    const bc = hc || 'yellow';
    v.ellipsoid(C - 0.5, top - 1, ZC - 1, L.headA + 0.7, 3.4, 5.7, bc);
    v.box(x0 - 1, top - 2, z0 - 1, x1 + 1, top - 2, z1, bc); v.box(x0, top - 2, z1 + 1, x1, top - 2, z1 + 2, bc);
    v.box(C - 1, top + 2, z0 + 1, C, top + 2, z1 - 1, bc === 'yellow' ? 'butter' : 'yellow');
    v.clear(x0 + 1, 0, z1 + 1, x1 - 1, top - 3, z1 + 3);
    return;
  }
  if (h === 'baret') { v.box(x0 - 1, top - 1, z0, x1 + 1, top, z1, hc || 'plum'); v.set(C, top + 1, ZC, hc || 'plum'); return; }
  if (h === 'sydvest') { v.ellipsoid(C - 0.5, top - 1, ZC - 1, L.headA + 0.8, 3, 5.6, 'yellow'); v.box(x0 - 2, top - 2, z0 - 3, x1 + 2, top - 2, z0, 'yellow'); v.box(x0 - 1, top - 2, z1 - 1, x1 + 1, top - 2, z1 + 1, 'yellow'); v.clear(x0 + 1, 0, z1 + 2, x1 - 1, top - 3, z1 + 3); return; }
  if (h === 'sjomann') { v.box(x0, top - 1, z0, x1, top, z1 - 1, 'white'); v.box(x0 + 1, top - 1, z1, x1 - 1, top - 1, z1, 'navySoft'); v.set(C - 1, top + 1, ZC, 'red'); v.set(C, top + 1, ZC, 'red'); return; }
  if (h === 'blomst') { const fx = x1 - 1, fy = y1 - 1, fz = z1; v.set(fx, fy, fz + 1, 'yellow'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(fx + dx, fy + dy, fz + 1, hc || 'rose'); return; }
  if (h === 'pannebånd') { const bc = hc || o.ribbonCol || 'rose'; v.box(x0, top, ZC - 1, x1, top, ZC, bc); v.box(x0 - 1, y1 - 2, ZC - 1, x0 - 1, y1, ZC, bc); v.box(x1 + 1, y1 - 2, ZC - 1, x1 + 1, y1, ZC, bc);
    v.box(x1 - 2, top + 1, ZC - 1, x1 + 1, top + 2, ZC, bc); v.box(x1 - 4, top + 1, ZC - 1, x1 - 3, top + 1, ZC, bc); v.set(x1 - 1, top + 1, ZC + 1, 'white'); return; }
  if (h === 'sløyfe') { const bc = hc || o.ribbonCol || 'pink'; v.box(C - 1, top, ZC - 1, C, top + 1, ZC, bc); v.box(C - 5, top + 1, ZC - 1, C - 2, top + 3, ZC, bc); v.box(C + 1, top + 1, ZC - 1, C + 4, top + 3, ZC, bc); v.set(C - 5, top + 3, ZC - 1, 0); v.set(C + 4, top + 3, ZC - 1, 0); v.set(C - 3, top + 2, ZC + 1, 'white'); v.set(C + 2, top + 2, ZC + 1, 'white'); return; }
  if (h === 'sixpens') { const bc = hc || 'brown'; v.box(x0, top - 1, z0, x1, top, z1 - 1, bc); v.box(x0 + 1, top + 1, z0 + 1, x1 - 1, top + 1, z1 - 1, bc); v.box(x0 + 1, top - 1, z1, x1 - 1, top, z1 + 2, bc); v.set(C - 1, top + 2, ZC, 'woodDark'); for (let x = x0; x <= x1; x += 2) v.set(x, top, z0, 'woodDark'); return; }
  if (h === 'blomsterkrans') { const cols = ['rose', 'butter', 'white', 'lilac', 'peach']; let i = 0; for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue; v.set(x, top, z, (x + z) % 2 ? 'leaf2' : cols[i++ % 5]); } return; }
  if (h === 'fjærhatt') { v.box(x0 - 1, top - 1, z0 - 1, x1 + 1, top - 1, z1, hc || 'teal'); v.box(x0 + 1, top, z0 + 1, x1 - 1, top + 2, z1 - 2, hc || 'teal'); v.line(x1 - 1, top + 1, z0 + 2, x1 + 2, top + 6, z0, 'butter'); v.line(x1 - 1, top + 1, z0 + 3, x1 + 1, top + 6, z0 + 1, 'butter'); return; }
}

/* ------------------------------------------------------------------ definitions */
const PRESETS = {
  konge: { skin: 'skin', round: true, hair: 'kort', hairCol: 'hairBrown', outfit: 'kappe', outfitCol: 'purple', capeCol: 'red', pantsCol: 'navySoft', sleeveCol: 'purple', hat: 'krone', crownTilt: 1, acc: ['bart'], shoeCol: 'woodDark' },
  dronning: { skin: 'skin2', hair: 'knute', hairCol: 'hairBlack', outfit: 'kjole', outfitCol: 'lavender', skirtCol: 'lilac', trimCol: 'white', sleeveCol: 'lavender', hat: 'krone', lashes: true, shoeCol: 'plum' },
  // golden braids + lilac/purple gown with gold trim: must not look like Blomsterfeen (red hair, pink) or Stjernefeen (yellow)
  mia: { skin: 'skin', age: 'barn', hair: 'fletter', hairCol: 'hairBlond', outfit: 'kjole', outfitCol: 'lilac', skirtCol: 'purple', trimCol: 'gold', sleeveCol: 'lilac', hat: 'krone', crownBack: true, lashes: true, shoeCol: 'gold', ribbonCol: 'rose' },
  ole: { skin: 'skin', age: 'baby', hair: 'topp', hairCol: 'hairBlond', outfit: 'bukse', outfitCol: 'sky', pantsCol: 'sky', acc: ['gåstol'], shoeCol: 'white' },
  kokk: { skin: 'skin3', round: true, hair: 'kort', hairCol: 'hairBlack', outfit: 'forkle', outfitCol: 'white', skirtCol: 'white', trimCol: 'red', sleeveCol: 'white', hat: 'kokkelue', lashes: true, shoeCol: 'black' },
  tor: { skin: 'skin2', hair: 'kort', hairCol: 'hairRed', outfit: 'overall', outfitCol: 'green', pantsCol: 'jeansBlue', sleeveCol: 'green', hat: 'solhatt', acc: ['skjegg'], beardCol: 'hairRed', shoeCol: 'woodDark' },
  per: { skin: 'skin4', hair: 'kort', hairCol: 'hairBlack', outfit: 'bukse', outfitCol: 'navySoft', pantsCol: 'navySoft', sleeveCol: 'navySoft', hat: 'caps', hatCol: 'red', acc: ['veske'], bagCol: 'red', shoeCol: 'black' },
  siv: { skin: 'skin', hair: 'knute', hairCol: 'hairBlond', outfit: 'kjole', outfitCol: 'teal', skirtCol: 'mint', trimCol: 'white', acc: ['briller'], glassCol: 'plum', lashes: true, shoeCol: 'woodRed' },
  rolf: { skin: 'skin3', hair: 'kort', hairCol: 'hairBrown', outfit: 'rustning', outfitCol: 'silver', pantsCol: 'grey', sleeveCol: 'silver', hat: 'hjelm', acc: ['bart', 'strikk'], beardCol: 'hairBrown', shoeCol: 'woodDark' },
};
// Villager jobs: several looks each (picked by seed) + a job prop held in the LEFT hand (anchors.handL; the right hand stays free for
// LIFE's held items). `look` = first look (kept for ch_v_<job> thumbnails / old callers).
const JOBS = [
  { id: 'baker', name: 'baker', voice: 'vm', prop: 'brod', looks: [
    { outfit: 'forkle', outfitCol: 'cream', skirtCol: 'cream', hat: 'bakerlue', skirt: false, pantsCol: 'woodLight' },
    { outfit: 'forkle', outfitCol: 'white', apronCol: 'cream', hat: 'bakerlue', pantsCol: 'brown', skirt: false, acc: ['bart'] },
    { outfit: 'forkle', outfitCol: 'peach', apronCol: 'white', skirtCol: 'honey', hat: 'skaut', hatCol: 'white' } ] },
  { id: 'bonde', name: 'bonde', voice: 'vm', prop: 'gulrot', looks: [
    { outfit: 'overall', outfitCol: 'red', pantsCol: 'jeansBlue', hat: 'caps', hatCol: 'green' },
    { outfit: 'overall', outfitCol: 'butter', pattern: 'striper', patternCol: 'white', pantsCol: 'jeansBlue', hat: 'solhatt' },
    { outfit: 'skjørt', outfitCol: 'green', sleeveCol: 'white', hat: 'skaut', hatCol: 'red', acc: ['skjerf'], scarfCol: 'butter' } ] },
  { id: 'fisker', name: 'fisker', voice: 'vm', prop: 'garn', looks: [
    { outfit: 'bukse', outfitCol: 'yellow', pantsCol: 'yellow', hat: 'sydvest' },
    { outfit: 'genser', outfitCol: 'navySoft', pantsCol: 'yellow', hat: 'lue', hatCol: 'red', acc: ['skjegg'] },
    { outfit: 'jakke', outfitCol: 'yellow', shirtCol: 'navySoft', pantsCol: 'navySoft', hat: 'sydvest' } ] },
  { id: 'maler', name: 'maler', voice: 'vk', prop: 'pensel', looks: [
    { outfit: 'overall', outfitCol: 'white', pantsCol: 'white', pattern: 'maling', hat: 'baret', hatCol: 'plum' },
    { outfit: 'skjørt', outfitCol: 'lilac', sleeveCol: 'white', hat: 'baret', hatCol: 'rose', acc: ['skjerf'], scarfCol: 'teal' },
    { outfit: 'forkle', outfitCol: 'teal', apronCol: 'white', skirt: false, pantsCol: 'navySoft', hat: 'baret', hatCol: 'coral' } ] },
  { id: 'musikant', name: 'musikant', voice: 'vm', prop: 'fele', looks: [
    { outfit: 'bukse', outfitCol: 'teal', pantsCol: 'navySoft', hat: 'fjærhatt', hatCol: 'coral' },
    { outfit: 'vest', outfitCol: 'red', shirtCol: 'white', pantsCol: 'black', hat: 'sixpens', hatCol: 'woodDark', acc: ['bart'] },
    { outfit: 'kjole', outfitCol: 'plum', skirtCol: 'lavender', trimCol: 'gold', hat: 'blomsterkrans' } ] },
  { id: 'isselger', name: 'isselger', voice: 'vk', prop: 'is', looks: [
    { outfit: 'sjø', outfitCol: 'pink', pantsCol: 'white', hat: 'solhatt', hatCol: 'butter' },
    { outfit: 'forkle', outfitCol: 'mint', pattern: 'striper', apronCol: 'white', skirtCol: 'mint', hat: 'pannebånd', hatCol: 'pink' },
    { outfit: 'bukse', outfitCol: 'white', pattern: 'striper', patternCol: 'sky', pantsCol: 'sky', hat: 'caps', hatCol: 'pink' } ] },
  { id: 'blomsterselger', name: 'blomsterselger', voice: 'vk', prop: 'bukett', looks: [
    { outfit: 'forkle', outfitCol: 'mint', skirtCol: 'green', hat: 'blomst', hatCol: 'rose' },
    { outfit: 'kjole', outfitCol: 'butter', pattern: 'prikker', patternCol: 'rose', skirtCol: 'butter', hat: 'blomsterkrans' },
    { outfit: 'skjørt', outfitCol: 'rose', sleeveCol: 'white', hat: 'solhatt', ribbonCol: 'mint' } ] },
  { id: 'leketoysmaker', name: 'leketøymaker', voice: 'vm', prop: 'leke', looks: [
    { outfit: 'forkle', outfitCol: 'orange', pantsCol: 'woodDark', acc: ['briller'] },
    { outfit: 'vest', outfitCol: 'green', shirtCol: 'butter', pantsCol: 'brown', hat: 'sixpens', hatCol: 'green', acc: ['briller', 'bart'] },
    { outfit: 'genser', outfitCol: 'red', pantsCol: 'navySoft', hat: 'lue', hatCol: 'butter', acc: ['briller'] } ] },
  { id: 'batmann', name: 'båtmann', voice: 'vm', prop: 'tau', looks: [
    { outfit: 'sjø', outfitCol: 'navySoft', pantsCol: 'navySoft', hat: 'sjomann' },
    { outfit: 'genser', outfitCol: 'teal', patternCol: 'white', pantsCol: 'navySoft', hat: 'sjomann', acc: ['skjegg'] },
    { outfit: 'sjø', outfitCol: 'sky', pantsCol: 'white', hat: 'lue', hatCol: 'navySoft' } ] },
  { id: 'fyrvokter', name: 'fyrvokter', voice: 'vm', prop: 'lykt', looks: [
    { outfit: 'bukse', outfitCol: 'navySoft', pantsCol: 'grey', hat: 'caps', hatCol: 'navySoft', acc: ['skjegg'] },
    { outfit: 'genser', outfitCol: 'red', pantsCol: 'navySoft', hat: 'lue', hatCol: 'navySoft', acc: ['skjegg'] },
    { outfit: 'jakke', outfitCol: 'navySoft', shirtCol: 'white', pantsCol: 'navySoft', hat: 'sixpens', hatCol: 'navySoft', acc: ['bart'] } ] },
  { id: 'gjeter', name: 'gjeter', voice: 'vk', prop: 'stav', looks: [
    { outfit: 'bukse', outfitCol: 'wool', pantsCol: 'woodDark', hat: 'solhatt' },
    { outfit: 'skjørt', outfitCol: 'woodLight', sleeveCol: 'cream', hat: 'skaut', hatCol: 'mint', acc: ['sekk'], bagCol: 'woodRed' },
    { outfit: 'genser', outfitCol: 'cream2', patternCol: 'woodRed', pantsCol: 'brown', hat: 'lue', hatCol: 'woodRed' } ] },
  { id: 'bestemor', name: 'bestemor', voice: 'vk', prop: 'strikk', old: true, looks: [
    { outfit: 'kjole', outfitCol: 'plum', skirtCol: 'lavender', hair: 'knute', acc: ['briller'] },
    { outfit: 'skjørt', outfitCol: 'navySoft', sleeveCol: 'cream', hair: 'krøller', acc: ['briller', 'halskjede'] },
    { outfit: 'genser', outfitCol: 'rose', skirt: true, skirtCol: 'plum', hair: 'knute', hat: 'skaut', hatCol: 'lilac', acc: ['halskjede'] } ] },
  { id: 'bestefar', name: 'bestefar', voice: 'vm', prop: 'stokk', old: true, looks: [
    { outfit: 'bukse', outfitCol: 'woodLight', pantsCol: 'brown', hair: 'skallet', acc: ['briller', 'bart'] },
    { outfit: 'vest', outfitCol: 'woodDark', shirtCol: 'white', pantsCol: 'grey', hair: 'kort', hat: 'sixpens', hatCol: 'grey', acc: ['skjegg'] },
    { outfit: 'genser', outfitCol: 'teal', pantsCol: 'brown', hair: 'skallet', acc: ['briller', 'skjerf'], scarfCol: 'red' } ] },
];
for (const j of JOBS) j.look = j.looks[0];
// WP7 (W2): builders at WP3's building sites (DESIGN2 §3.4, job look 'bygger'). Kept OUT of JOBS so every seeded random job pick
// (villagers without a job, quests) stays exactly as before; F.People.villager('bygger', seed), ch_v_bygger and make('bygger') work.
const SITE_JOBS = [
  { id: 'bygger', name: 'bygger', voice: 'vm', prop: 'hammer', site: true, looks: [
    { outfit: 'overall', outfitCol: 'orange', pantsCol: 'jeansBlue', sleeveCol: 'white', hat: 'byggehjelm', hatCol: 'yellow' },
    { outfit: 'vest', outfitCol: 'orange', pattern: 'striper', patternCol: 'butter', shirtCol: 'sky', pantsCol: 'navySoft', hat: 'byggehjelm', hatCol: 'yellow' },
    { outfit: 'overall', outfitCol: 'yellow', pantsCol: 'woodDark', sleeveCol: 'red', hat: 'byggehjelm', hatCol: 'orange', acc: ['skjegg'] } ] },
];
for (const j of SITE_JOBS) j.look = j.looks[0];
const ALL_JOBS = JOBS.concat(SITE_JOBS);
const SKINS = ['skin', 'skin2', 'skin3', 'skin4'];
const HAIRS = ['kort', 'lang', 'fletter', 'knute', 'krøller', 'hestehale', 'bob', 'pigger', 'afro', 'flette'];
const HAIRS_F = ['lang', 'fletter', 'knute', 'krøller', 'hestehale', 'bob', 'afro', 'flette'], HAIRS_M = ['kort', 'kort', 'krøller', 'pigger', 'afro', 'topp'];
const HAIRCOLS = ['hairBlond', 'hairBrown', 'hairBlack', 'hairRed', 'butter'];

function defPerson(id, preset, gallery) {
  const merged = o => Object.assign({}, preset || {}, o || {}, { acc: (o && o.acc) || (preset && preset.acc) || [] });
  const pv = key => ({ get pivot() { return LAST[key]; } });
  F.VOX.def(id, {
    size: [24, 40, 16], scale: 1 / 16,
    build(v, o) { const m = merged(o); LAST = layout(m); body(v, m, LAST); },
    parts: {
      head: Object.assign(pv('pivHead'), { build(v, o) { const m = merged(o); head(v, m, layout(m)); } }),
      armL: Object.assign(pv('pivArmL'), { build(v, o) { const m = merged(o); arm(v, m, layout(m), 1); } }),
      armR: Object.assign(pv('pivArmR'), { build(v, o) { const m = merged(o); arm(v, m, layout(m), -1); } }),
      legL: Object.assign(pv('pivLegL'), { build(v, o) { const m = merged(o); leg(v, m, layout(m), 1); } }),
      legR: Object.assign(pv('pivLegR'), { build(v, o) { const m = merged(o); leg(v, m, layout(m), -1); } }),
    },
    meta: { group: 'person', gallery: gallery || null, person: true },
  });
}
defPerson('ch_person', null, [{}, { hair: 'lang', hairCol: 'hairBlond', outfit: 'kjole', outfitCol: 'coral', lashes: true }, { hair: 'krøller', skin: 'skin4', hairCol: 'hairBlack', outfit: 'overall' }, { hair: 'hestehale', age: 'barn', outfit: 'kjole', outfitCol: 'mint' }]);
for (const k in PRESETS) defPerson('ch_' + k, PRESETS[k]);
// WP7: ch_royal = the parametric royal look (DESIGN2 §3.9); every look of F.REALMS (js/data/realms.js) is in its gallery
defPerson('ch_royal', { outfit: 'kappe', hat: 'krone', shoeCol: 'woodDark' },
  (F.REALMS && F.REALMS.length ? F.REALMS : []).reduce((acc, r) => acc.concat([r.king.look, r.queen.look, r.child.look]), []));
for (const j of ALL_JOBS) defPerson('ch_v_' + j.id, Object.assign({ skin: 'skin2', hair: 'kort', hairCol: 'hairBrown' }, j.look));
// head-only def: the runtime swaps the head meshes for facial expressions (same layout / pivot as the person's head part)
F.VOX.def('ch_personhead', { size: [24, 40, 16], scale: 1 / 16,
  build(v, o) { LAST = layout(o); },
  parts: { head: { get pivot() { return LAST.pivHead; }, build(v, o) { head(v, o, layout(o)); } } },
  meta: { group: 'person', hidden: true, noGallery: true } });

/* ------------------------------------------------------------------ job props (held in the left hand, anchors.handL)
   ch_prop_<id>, 1/16 m, meta.grip = voxel point that sits in the hand. ids: brod gulrot garn pensel fele is bukett leke tau lykt stav strikk stokk */
const PROP = (id, size, grip, build) => F.VOX.def('ch_prop_' + id, { size, scale: 1 / 16, build, meta: { group: 'person', grip, prop: true } });
PROP('brod', [5, 5, 15], [2.5, 2, 7.5], v => { // baguette, carried forward-tilted
  v.ellipsoid(2, 2, 7, 1.9, 1.7, 7, 'honey'); v.paint((x, y, z) => (y >= 3 && z % 3 === 0 ? 'cream' : null)); v.ellipsoid(2, 1.4, 7, 1.6, 1.0, 6, 'woodLight'); v.ellipsoid(2, 2.2, 7, 1.9, 1.6, 7, 'honey'); v.paint((x, y, z) => (y >= 3 && (z + 1) % 4 === 0 ? 'cream' : null)); });
PROP('gulrot', [9, 11, 7], [4.5, 10, 3.5], v => { // basket of carrots
  v.box(1, 0, 1, 7, 3, 5, 'woodLight'); v.clear(2, 1, 2, 6, 3, 4); v.box(1, 3, 1, 7, 3, 1, 'woodRed'); v.box(1, 3, 5, 7, 3, 5, 'woodRed');
  for (const [x, z] of [[2, 2], [4, 3], [6, 2], [3, 4], [5, 4]]) { v.box(x, 2, z, x, 4, z, 'orange'); v.set(x, 5, z, 'leaf'); v.set(x, 6, z, 'leaf2'); }
  v.line(1, 4, 3, 4, 10, 3, 'woodRed'); v.line(7, 4, 3, 4, 10, 3, 'woodRed'); });
PROP('garn', [10, 12, 4], [5, 11, 2], v => { // fishing net bundle with floats
  for (let y = 1; y <= 10; y++) for (let x = 1; x <= 8; x++) { const w = 4 - Math.round((10 - y) * 0.25); if (Math.abs(x - 4.5) > w + 0.5) continue; if ((x + y) % 2 === 0 || y === 10) v.set(x, y, 1 + (x + y) % 2, 'woodLight'); }
  v.box(3, 10, 1, 6, 11, 2, 'hay'); for (const [x, y, c] of [[1, 3, 'red'], [8, 4, 'white'], [3, 1, 'red'], [6, 1, 'white'], [5, 6, 'red']]) v.set(x, y, 3, c); });
PROP('pensel', [9, 14, 3], [2, 4, 1], v => { // big brush + a little palette
  v.box(2, 0, 1, 2, 8, 1, 'woodLight'); v.box(2, 9, 1, 2, 10, 1, 'silver'); v.box(1, 11, 0, 3, 13, 2, 'wool'); v.box(1, 13, 0, 3, 13, 2, 'rose');
  v.box(4, 1, 1, 8, 1, 2, 'woodLight'); v.set(5, 2, 1, 'sky'); v.set(7, 2, 1, 'yellow'); v.set(6, 2, 2, 'rose'); v.set(8, 2, 2, 'mint'); });
PROP('fele', [7, 15, 3], [3.5, 14, 1.5], v => { // fiddle held by the neck
  v.ellipsoid(3, 2.5, 1, 3, 2.6, 1, 'woodRed'); v.ellipsoid(3, 6.5, 1, 2.4, 2.2, 1, 'woodRed'); v.box(2, 2, 2, 4, 6, 2, 'woodRed');
  v.set(2, 4, 2, 'woodDark'); v.set(4, 4, 2, 'woodDark'); v.box(3, 8, 1, 3, 13, 1, 'woodDark'); v.box(2, 13, 1, 4, 14, 1, 'woodDark'); v.box(3, 2, 2, 3, 12, 2, 'butter'); });
PROP('is', [5, 11, 5], [2.5, 3, 2.5], v => { // ice cream cone, two scoops and a cherry
  v.cone(2, 0, 2, 0.6, 1, 'honey'); for (let y = 0; y < 5; y++) v.cyl(2, y, 2, 0.4 + y * 0.35, 1, (y % 2) ? 'honey' : 'woodLight');
  v.sphere(2, 6, 2, 1.9, 'pink'); v.sphere(2, 8.4, 2, 1.6, 'mint'); v.set(2, 10, 2, 'red'); });
PROP('bukett', [7, 12, 5], [3, 3, 2.5], v => { // bouquet
  for (const [x, z] of [[2, 2], [3, 2], [4, 2], [3, 3], [3, 1]]) v.box(x, 0, z, x, 6, z, 'green'); v.box(2, 3, 1, 4, 4, 3, 'white');
  for (const [x, y, z, c] of [[1, 8, 2, 'rose'], [3, 9, 2, 'yellow'], [5, 8, 2, 'pink'], [2, 10, 1, 'lilac'], [4, 10, 3, 'coral'], [3, 7, 4, 'blossom'], [3, 11, 2, 'white']]) { v.set(x, y, z, c); v.set(x, y - 1, z, 'leaf2'); }
  for (const [x, z] of [[1, 2], [5, 2], [3, 0], [3, 4]]) v.set(x, 7, z, 'leaf'); });
PROP('leke', [5, 10, 10], [2.5, 4, 5], v => { // wooden toy horse on a little cart
  v.box(1, 1, 1, 3, 1, 8, 'woodDark'); for (const z of [2, 7]) { v.set(0, 0, z, 'red'); v.set(4, 0, z, 'red'); }
  v.box(1, 3, 2, 3, 5, 7, 'woodLight'); for (const z of [2, 7]) v.box(1, 2, z, 3, 2, z, 'woodLight'); v.box(1, 5, 7, 3, 8, 8, 'woodLight'); v.box(1, 7, 9, 3, 8, 9, 'woodLight');
  v.box(2, 6, 4, 2, 9, 7, 'red'); v.set(1, 8, 8, 'black'); v.set(3, 8, 8, 'black'); v.box(1, 6, 3, 3, 6, 5, 'sky'); v.box(2, 4, 0, 2, 5, 1, 'red'); });
PROP('tau', [8, 9, 3], [4, 8, 1.5], v => { // coiled rope over the hand
  for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; for (const r of [2.4, 3.3]) v.set(Math.round(3.5 + Math.cos(t) * r), Math.round(4 + Math.sin(t) * r), 1 + (r > 3 ? 0 : 1), a % 6 < 3 ? 'hay' : 'woodLight'); }
  v.box(3, 0, 1, 4, 1, 1, 'hay'); });
PROP('lykt', [6, 11, 6], [3, 10, 3], v => { // lantern with a warm light
  v.box(1, 0, 1, 4, 0, 4, 'woodDark'); v.box(1, 6, 1, 4, 6, 4, 'woodDark'); v.box(2, 7, 2, 3, 7, 3, 'woodDark');
  for (const [x, z] of [[1, 1], [4, 1], [1, 4], [4, 4]]) v.box(x, 1, z, x, 5, z, 'woodDark');
  v.box(2, 1, 2, 3, 5, 3, 'glowYellow'); v.box(2, 1, 1, 3, 5, 1, 'glass'); v.box(2, 1, 4, 3, 5, 4, 'glass'); v.box(1, 1, 2, 1, 5, 3, 'glass'); v.box(4, 1, 2, 4, 5, 3, 'glass');
  v.set(2, 8, 2, 'steel'); v.set(2, 9, 3, 'steel'); v.set(3, 10, 3, 'steel'); v.set(3, 9, 2, 'steel'); });
PROP('stav', [7, 30, 3], [2, 9, 1], v => { // shepherd's crook (touches the ground)
  v.box(2, 0, 1, 2, 25, 1, 'woodLight'); v.box(2, 26, 1, 3, 26, 1, 'woodLight'); v.box(4, 27, 1, 4, 27, 1, 'woodLight'); v.box(5, 25, 1, 5, 26, 1, 'woodLight'); v.set(5, 24, 1, 'woodLight');
  v.box(2, 22, 1, 2, 23, 1, 'red'); v.set(1, 21, 1, 'red'); v.set(3, 21, 1, 'red'); });
PROP('strikk', [7, 7, 5], [3, 3, 1], v => { // knitting: needles, a growing scarf and a yarn ball
  v.box(1, 2, 1, 5, 4, 1, 'mint'); v.box(1, 3, 1, 5, 3, 1, 'white'); v.line(0, 5, 1, 6, 3, 2, 'steel'); v.line(0, 3, 2, 6, 5, 1, 'steel'); v.sphere(3, 1.4, 3.4, 1.4, 'pink'); });
PROP('stokk', [5, 10, 3], [1, 8, 1], v => { // walking cane
  v.box(1, 0, 1, 1, 8, 1, 'woodDark'); v.box(1, 9, 1, 3, 9, 1, 'woodDark'); v.set(3, 8, 1, 'woodDark'); v.set(1, 0, 1, 'black'); });
PROP('ballong', [7, 34, 7], [3, 1, 3], (v, o) => { // a balloon on a string (children): floats above the head, so it reads from the high camera
  const c = o.c || 'rose';
  for (let y = 0; y < 22; y++) v.set(3 + (y > 8 && y < 16 ? 1 : 0), y, 3, 'white');
  v.ellipsoid(3, 27, 3, 3, 3.8, 3, c); v.set(3, 23, 3, c); v.set(3, 22, 3, c); v.set(2, 29, 4, 'white'); v.set(2, 28, 5, 'white'); });
PROP('hammer', [5, 12, 3], [2, 3, 1], v => { // builder's hammer (bygger)
  v.box(2, 0, 1, 2, 8, 1, 'woodLight'); v.box(2, 0, 1, 2, 1, 1, 'red'); v.box(0, 9, 0, 4, 10, 2, 'steel'); v.set(4, 8, 1, 'steel'); v.set(0, 11, 1, 'steel'); });
const PROP_IDS = ['brod', 'gulrot', 'garn', 'pensel', 'fele', 'is', 'bukett', 'leke', 'tau', 'lykt', 'stav', 'strikk', 'stokk', 'ballong', 'hammer'];
const KID_PROP = { stav: 'bukett', garn: 'leke', tau: 'is', stokk: 'leke', strikk: 'is', lykt: 'ballong' };

/* ------------------------------------------------------------------ Puff (helper cloud) */
F.VOX.def('ch_puff', {
  size: [22, 24, 14], scale: 1 / 16,
  build(v) {
    const Y = 6;
    v.ellipsoid(10.5, Y + 8.5, 6.5, 8, 5.2, 5, 'white');
    v.sphere(6, Y + 11, 6, 4.4, 'white'); v.sphere(15, Y + 11, 6, 4.4, 'white'); v.sphere(10.5, Y + 13, 5.5, 4.6, 'white');
    v.sphere(3.2, Y + 7.5, 6.5, 3.2, 'white'); v.sphere(17.8, Y + 7.5, 6.5, 3.2, 'white');
    v.paint((x, y) => (y <= Y + 4 ? 'snow' : null));
    v.box(5, Y + 6, 10, 16, Y + 12, 11, 'white'); v.clear(5, Y + 6, 12, 16, Y + 12, 13);
    for (const ex of [7, 13]) { v.box(ex, Y + 9, 11, ex + 1, Y + 12, 11, 'black'); v.set(ex, Y + 11, 11, 'white'); }
    v.box(6, Y + 8, 11, 7, Y + 8, 11, 'blossom'); v.box(14, Y + 8, 11, 15, Y + 8, 11, 'blossom');
    v.box(10, Y + 7, 11, 11, Y + 7, 11, 'cherry'); v.set(9, Y + 8, 11, 'cherry'); v.set(12, Y + 8, 11, 'cherry');
  },
  parts: {
    basket: { pivot: [10.5, 10, 6.5], build(v) {
      v.box(7, 0, 4, 14, 3, 9, 'woodLight'); v.clear(8, 1, 5, 13, 3, 8); v.box(7, 3, 4, 14, 3, 4, 'woodRed'); v.box(7, 3, 9, 14, 3, 9, 'woodRed');
      v.line(7, 4, 6, 9, 9, 6, 'woodRed'); v.line(14, 4, 6, 12, 9, 6, 'woodRed'); v.box(9, 9, 6, 12, 9, 6, 'woodRed');
    } },
  },
  meta: { group: 'person', anchors: { basket: [0, -0.5, 0] } },
});
/* Puff: the basket hangs below the cloud (origin = basket bottom). Basket items go on anchors.basket (inside the basket). */

/* ------------------------------------------------------------------ named animals */
function face(v, cx, ey, fz, o) { // flat friendly animal face on the plane z = fz: eyes 1×2 (+shine), nose in front, cheeks, muzzle
  const [sx, sy, sz] = v.size;
  v.clear(0, 0, fz + 1, sx - 1, sy - 1, sz - 1);
  for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) if (v.get(x, y, fz - 1) && !v.get(x, y, fz)) v.set(x, y, fz, o.base);
  if (o.muzzle) for (let x = cx - 2; x <= cx + 1; x++) for (let y = ey - 3; y <= ey - 1; y++) if (v.get(x, y, fz)) v.set(x, y, fz, o.muzzle);
  for (const ex of [cx - 2, cx + 1]) { v.set(ex, ey, fz, 'black'); v.set(ex, ey + 1, fz, 'black'); }
  v.set(cx - 1, ey - 1, fz + 1, o.nose || 'pink'); v.set(cx, ey - 1, fz + 1, o.nose || 'pink');
  v.set(cx - 3, ey - 1, fz, 'blossom'); v.set(cx + 2, ey - 1, fz, 'blossom');
  if (o.mouth) { v.set(cx - 1, ey - 3, fz, o.mouth); v.set(cx, ey - 3, fz, o.mouth); }
}
F.VOX.def('ch_pus', { // Pus: round orange tabby with white socks and chest
  size: [12, 16, 20], scale: 1 / 16,
  build(v) {
    v.ellipsoid(5.5, 4.6, 8, 3, 2.8, 5.4, 'orange');
    for (let z = 4; z <= 11; z += 3) v.paint((x, y, zz, c) => (zz === z && y >= 5 && c === F.col('orange') ? 'woodRed' : null));
    v.ellipsoid(5.5, 3.6, 11.5, 2, 2, 1.6, 'white');
    for (const [x, z] of [[3, 4], [7, 4], [3, 11], [7, 11]]) { v.box(x, 0, z, x + 1, 2, z + 1, 'orange'); v.box(x, 0, z, x + 1, 0, z + 1, 'white'); }
  },
  parts: {
    head: { pivot: [6, 6, 13], build(v) {
      v.ellipsoid(5.5, 9, 14.5, 4.2, 3.6, 3.2, 'orange');
      for (const [x, d] of [[2, 1], [8, -1]]) { v.box(x, 12, 14, x + 1, 12, 15, 'orange'); v.set(x + (d > 0 ? 0 : 1), 13, 14, 'orange'); v.set(x + (d > 0 ? 1 : 0), 12, 15, 'pink'); }
      v.paint((x, y, z, c) => (c === F.col('orange') && y >= 11 && (x === 4 || x === 7) ? 'woodRed' : null));
      face(v, 6, 9, 17, { base: 'orange', nose: 'pink', muzzle: 'white' });
      v.set(1, 8, 15, 'white'); v.set(10, 8, 15, 'white'); v.set(0, 8, 15, 'white'); v.set(11, 8, 15, 'white'); // whiskers
    } },
    tail: { pivot: [6, 5, 3], build(v) { v.box(5, 5, 1, 6, 6, 3, 'orange'); v.box(5, 7, 0, 6, 11, 1, 'orange'); v.box(5, 12, 1, 6, 13, 2, 'white'); } },
  },
  meta: { group: 'animal' },
});
F.VOX.def('ch_tass', { // Tass: fluffy cream puppy with a brown eye patch, floppy ears and a red collar
  size: [14, 18, 24], scale: 1 / 16,
  build(v) {
    v.ellipsoid(6.5, 5, 9, 3.4, 3, 5.8, 'cream2'); v.ellipsoid(7.5, 6.5, 7, 2.2, 1.6, 2.2, 'woodLight');
    for (const [x, z] of [[4, 5], [8, 5], [4, 12], [8, 12]]) { v.box(x, 0, z, x + 1, 2, z + 1, 'cream2'); v.box(x, 0, z + 1, x + 1, 0, z + 2, 'cream2'); }
    v.box(3, 7, 13, 10, 8, 14, 'red'); v.set(6, 6, 15, 'gold'); v.set(7, 6, 15, 'gold');
  },
  parts: {
    head: { pivot: [7, 8, 14], build(v) {
      v.ellipsoid(6.5, 11, 16, 4.2, 3.8, 3.4, 'cream2');
      face(v, 7, 12, 19, { base: 'cream2', nose: 'black' });
      v.box(8, 12, 19, 9, 14, 19, 'woodLight'); v.set(8, 12, 19, 'black'); v.set(8, 13, 19, 'black');
      v.box(5, 8, 20, 8, 10, 21, 'cream'); v.box(6, 10, 22, 7, 10, 22, 'black'); v.set(6, 8, 22, 'pink');
      for (const x of [1, 11]) { v.box(x, 8, 15, x + 1, 13, 17, 'woodLight'); v.set(x + (x < 5 ? 1 : 0), 14, 16, 'woodLight'); }
    } },
    tail: { pivot: [7, 7, 3], build(v) { v.box(6, 7, 2, 7, 8, 3, 'cream2'); v.box(6, 9, 1, 7, 12, 2, 'cream2'); v.set(6, 13, 1, 'woodLight'); } },
  },
  meta: { group: 'animal' },
});
F.VOX.def('ch_bris', { // Bris: white pony with a pink mane
  size: [12, 22, 26], scale: 1 / 14,
  build(v) {
    v.box(3, 7, 5, 8, 12, 19, 'wool'); v.ellipsoid(5.5, 10, 12, 3.2, 3.2, 7.8, 'wool');
    v.box(3, 11, 9, 8, 11, 14, 'lavender'); v.box(2, 9, 9, 2, 11, 14, 'lavender'); v.box(9, 9, 9, 9, 11, 14, 'lavender'); v.set(2, 9, 11, 'gold'); v.set(9, 9, 11, 'gold');
  },
  parts: {
    legF: { pivot: [6, 8, 17], build(v) { for (const x of [3, 7]) { v.box(x, 2, 16, x + 1, 8, 17, 'wool'); v.box(x, 0, 16, x + 1, 1, 18, 'woodDark'); } } },
    legB: { pivot: [6, 8, 7], build(v) { for (const x of [3, 7]) { v.box(x, 2, 6, x + 1, 8, 7, 'wool'); v.box(x, 0, 6, x + 1, 1, 8, 'woodDark'); } } },
    head: { pivot: [6, 12, 18], build(v) {
      v.box(4, 12, 17, 7, 17, 20, 'wool'); v.box(3, 15, 19, 8, 20, 24, 'wool'); v.box(4, 15, 24, 7, 17, 25, 'cream2');
      v.set(4, 16, 25, 'black'); v.set(7, 16, 25, 'black');
      v.box(3, 18, 23, 3, 19, 23, 'black'); v.box(8, 18, 23, 8, 19, 23, 'black'); v.set(3, 19, 23, 'white'); v.set(8, 19, 23, 'white');
      v.set(3, 17, 22, 'blossom'); v.set(8, 17, 22, 'blossom');
      v.box(4, 21, 19, 4, 21, 20, 'wool'); v.box(7, 21, 19, 7, 21, 20, 'wool');
      v.box(5, 12, 16, 6, 21, 17, 'pink'); v.box(5, 20, 18, 6, 21, 21, 'pink'); v.box(4, 19, 21, 7, 20, 22, 'rose');
    } },
    tail: { pivot: [6, 11, 5], build(v) { v.box(5, 9, 3, 6, 11, 4, 'pink'); v.box(5, 4, 2, 6, 9, 3, 'pink'); v.set(5, 4, 2, 'rose'); } },
  },
  meta: { group: 'animal' },
});
F.VOX.def('ch_pip', { // Pip: white post dove with a tiny red bag
  size: [14, 12, 14], scale: 1 / 16,
  build(v) {
    v.ellipsoid(6.5, 5, 6, 3, 3, 4.2, 'white'); v.sphere(6.5, 8.5, 9, 2.6, 'white');
    v.box(6, 7, 11, 7, 7, 12, 'orange');
    v.set(5, 9, 11, 'black'); v.set(8, 9, 11, 'black'); v.set(5, 10, 11, 'white'); v.set(8, 10, 11, 'white');
    v.set(4, 8, 11, 'blossom'); v.set(9, 8, 11, 'blossom');
    v.box(5, 3, 1, 8, 5, 2, 'silver');
    v.box(4, 2, 6, 9, 3, 8, 'red'); v.set(6, 3, 9, 'gold');
    v.set(5, 0, 6, 'coral'); v.set(8, 0, 6, 'coral'); v.set(5, 1, 6, 'coral'); v.set(8, 1, 6, 'coral');
  },
  parts: {
    wingL: { pivot: [9, 6, 6], build(v) { v.box(9, 4, 3, 12, 6, 8, 'wool'); v.box(12, 5, 2, 13, 6, 6, 'silver'); } },
    wingR: { pivot: [4, 6, 6], build(v) { v.box(1, 4, 3, 4, 6, 8, 'wool'); v.box(0, 5, 2, 1, 6, 6, 'silver'); } },
  },
  meta: { group: 'animal' },
});

/* ------------------------------------------------------------------ runtime: anchors + animation */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function addAnchor(parent, name, x, y, z) { const e = new THREE.Object3D(); e.name = 'anchor_' + name; e.position.set(x, y, z); parent.add(e); return e; }
function opts(nameOrOpts) {
  if (typeof nameOrOpts === 'string') return { id: PRESETS[nameOrOpts] ? 'ch_' + nameOrOpts : (F.VOX.has('ch_v_' + nameOrOpts) ? 'ch_v_' + nameOrOpts : 'ch_person'), o: {} };
  return { id: nameOrOpts && nameOrOpts.def && F.VOX.has(nameOrOpts.def) ? nameOrOpts.def : 'ch_person', o: nameOrOpts || {} };
}
/* Gestures (play(name, sec, opt)). Each sets a matching face while it runs and then returns to the mood face.
   needs: shiver (cold) · rub (hungry, rubs tummy) · yawn (tired) · droop (bored) · sneeze
   joy:   laugh · dance · clap · hug · cheer · hop · wave (wave hello) · nod
   other: point (right arm forward) · count (counts on fingers; opt {n} = taps) · eat · think · surprised · sleep (loop until stopped)
   aliases: cold→shiver hungry→rub tired→yawn bored→droop hello→wave kald→shiver sulten→rub trøtt→yawn kjed→droop */
const GESTURES = ['wave', 'cheer', 'dance', 'nod', 'hop', 'eat', 'shiver', 'rub', 'yawn', 'droop', 'sneeze', 'laugh', 'clap', 'hug', 'point', 'count', 'think', 'surprised', 'sleep'];
const GALIAS = { cold: 'shiver', hungry: 'rub', tired: 'yawn', bored: 'droop', hello: 'wave', kald: 'shiver', sulten: 'rub', trøtt: 'yawn', kjed: 'droop', jubel: 'cheer', klapp: 'clap', klem: 'hug', le: 'laugh', nys: 'sneeze', pek: 'point', tell: 'count', danse: 'dance', vinke: 'wave' };
const GFACE = { wave: 'happy', cheer: 'laugh', dance: 'happy', hop: 'happy', eat: 'happy', shiver: 'cold', rub: 'hungry', yawn: 'yawn', droop: 'bored', laugh: 'laugh', clap: 'happy', hug: 'happy', surprised: 'surprised', sleep: 'sleepy', think: 'normal', count: 'normal', point: 'normal' };
const GDUR = { wave: 1.4, cheer: 1.4, dance: 2.4, nod: 0.8, hop: 1.2, eat: 2, shiver: 2.2, rub: 2.2, yawn: 2.2, droop: 2.6, sneeze: 1.8, laugh: 1.8, clap: 1.8, hug: 2, point: 1.8, count: 2.5, think: 2.2, surprised: 1.1, sleep: 9999 };
const NEED_MOOD = { kald: ['cold', 'shiver'], sulten: ['hungry', 'rub'], trøtt: ['sleepy', 'yawn'], kjed: ['bored', 'droop'], tørst: ['hungry', 'rub'], sitte: ['sleepy', 'droop'], fin: ['normal', 'think'], dyr: ['normal', 'think'], cold: ['cold', 'shiver'], hungry: ['hungry', 'rub'], tired: ['sleepy', 'yawn'], bored: ['bored', 'droop'], glad: ['happy', 'dance'] };
const TWO_HANDS = { clap: 1, hug: 1, count: 1, cheer: 1, yawn: 1, laugh: 1, shiver: 1 };
const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const _wp = new THREE.Vector3();
// a model's root transform is ours to animate when it hangs under a Thing (LIFE actors) or the caller set userData.baseY
const owned = g => g.userData.baseY != null || g.userData.ownRoot === true || !!(g.parent && g.parent.userData && g.parent.userData.thing) || !g.parent;
function make(nameOrOpts, mo) {
  const { id, o } = opts(nameOrOpts);
  const g = F.VOX.make(id, o);
  const P = g.userData.parts;
  const m = Object.assign({}, id === 'ch_person' ? {} : (PRESETS[id.slice(3)] || (ALL_JOBS.find(j => 'ch_v_' + j.id === id) || {}).look || {}), o);
  if (!m.acc) m.acc = [];
  const L = layout(m), s = 1 / 16;
  const len = L.age === 'voksen' ? 7 : L.age === 'barn' ? 5 : 4;
  // anchors (metres). head anchor = top of hair, inside the head part (moves with nods); hand = right hand tip; handL = left hand (job props)
  const anchors = g.userData.anchors = {
    head: addAnchor(P.head, 'head', 0, (L.headH + 1) * s, -0.5 * s),
    face: addAnchor(P.head, 'face', 0, 4 * s, 5 * s),
    body: addAnchor(g, 'body', 0, (L.ty0 + L.torH / 2) * s, (L.torD + 0.5) * s),
    back: addAnchor(g, 'back', 0, (L.ty0 + L.torH / 2) * s, -(L.torD + 0.5) * s),
    hand: addAnchor(P.armR, 'hand', -1 * s, -len * s, 1 * s),
    handL: addAnchor(P.armL, 'handL', 1 * s, -(len - 1) * s, 0.6 * s),
  };
  if (mo && mo.scale) g.scale.setScalar(mo.scale);
  // job prop in the left hand
  let prop = null;
  let pid = m.prop;
  if (pid && L.age !== 'voksen') { // children carry child-sized things (a balloon now and then)
    const h = F.U.hash2(F.U.hashStr(JSON.stringify(m).slice(0, 80)), 7, 3);
    pid = h < 0.4 ? 'ballong' : (KID_PROP[pid] || pid);
  }
  if (pid && F.VOX.has('ch_prop_' + pid)) {
    const def = F.VOX.defs['ch_prop_' + pid], gr = def.meta.grip, sz = def.size;
    prop = F.VOX.make('ch_prop_' + pid, pid === 'ballong' ? { c: m.propCol || ['rose', 'sky', 'butter', 'mint', 'lilac', 'coral'][Math.floor(F.U.hash2(F.U.hashStr(m.hairCol || 'x'), F.U.hashStr(m.outfitCol || 'y'), 5) * 6)] } : {});
    const k = L.age === 'voksen' ? 1 : 0.8;
    prop.scale.setScalar(k);
    prop.position.set((sz[0] / 2 - gr[0]) * s * k, -gr[1] * s * k, (sz[2] / 2 - gr[2]) * s * k);
    if (pid === 'brod') prop.rotation.x = -0.35;
    prop.userData.kind = pid;
    anchors.handL.add(prop); g.userData.prop = prop;
  }
  // facial expressions: swap the head meshes (keeps anchors / worn hats, which are non-mesh children of the head pivot)
  const faces = { normal: P.head ? P.head.children.filter(c => c.isMesh) : [] };
  let curFace = 'normal', moodFace = 'normal', blinkT = 2 + Math.random() * 3, blinkOn = 0;
  const showFace = (f) => {
    if (!P.head || f === curFace) return;
    if (!faces[f]) {
      try { const hg = F.VOX.make('ch_personhead', Object.assign({}, m, { face: f })); faces[f] = hg.userData.parts.head.children.filter(c => c.isMesh); }
      catch (e) { faces[f] = faces.normal; }
    }
    for (const c of faces[curFace]) P.head.remove(c);
    for (const c of faces[f]) P.head.add(c);
    curFace = f;
  };
  g.userData.face = (f) => { moodFace = FACES.includes(f) ? f : 'normal'; if (!gest) showFace(moodFace); };
  g.userData.faceName = () => curFace;
  let gest = null, gT = 0, gDur = 0, gOpt = {}, walkP = 0, mood = null, moodT = 3 + Math.random() * 3, sneezed = false;
  const nearCam = () => { const cam = F.R && F.R.camera; if (!cam || !g.parent) return true; g.getWorldPosition(_wp); return _wp.distanceToSquared(cam.position) < 40 * 40; };
  g.userData.play = (name, sec, opt) => {
    name = GALIAS[name] || name;
    if (name === 'stop' || name == null) { gest = null; showFace(moodFace); if (prop) prop.visible = true; return; }
    gest = name; gT = 0; gDur = sec || GDUR[name] || 1.6; gOpt = opt || {}; sneezed = false;
    showFace(GFACE[name] || moodFace);
    if (prop) prop.visible = !TWO_HANDS[name] || prop.userData.kind === 'ballong';
  };
  g.userData.gesture = () => gest;
  g.userData.GESTURES = GESTURES;
  // needs/moods: persistent face + an occasional matching gesture while standing (kald/sulten/trøtt/kjed/glad or null)
  const setNeed = (n) => { mood = n && NEED_MOOD[n] ? n : null; moodFace = mood ? NEED_MOOD[mood][0] : 'normal'; if (!gest) showFace(moodFace); moodT = 0.6; };
  g.userData.need = (n) => { g.userData.autoNeed = false; setNeed(n); };   // an explicit caller takes over from the automatic wish mood
  g.userData.mood = g.userData.need;
  // automatic needs: when this model belongs to a LIFE actor (Thing data.actor) with a 'need' wish, show that need's mood.
  // Read-only; a caller that drives need() itself sets g.userData.autoNeed = false.
  let autoT = Math.random();
  const autoNeed = (dt) => {
    if (g.userData.autoNeed === false) return; autoT -= dt; if (autoT > 0) return; autoT = 0.8;
    const th = g.parent && g.parent.userData && g.parent.userData.thing, aid = th && th.data && th.data.actor;
    const act = aid && F.Act && F.Act.all ? F.Act.all[aid] : null; if (!act) return;
    const w = act.wish, n = w && w.kind === 'need' && NEED_MOOD[w.need] ? w.need : null;
    if (n !== mood) setNeed(n);
  };
  g.userData.animate = (dt, t, moving) => {
    autoNeed(dt);
    const ph = (g.userData.phase || (g.userData.phase = Math.random() * 6));
    if (moving) walkP += dt * (m.old ? 7 : 9); else walkP *= Math.max(0, 1 - dt * 8);
    const sw = Math.sin(walkP) * (moving ? (m.old ? 0.35 : 0.55) : 0.0);
    if (P.legL) P.legL.rotation.x = sw; if (P.legR) P.legR.rotation.x = -sw;
    let aL = -sw * 0.8, aR = sw * 0.8, zL = 0, zR = 0, hx = Math.sin(t * 1.3 + ph) * 0.04 + (m.old ? 0.1 : 0), hz = Math.sin(t * 0.9 + ph) * 0.05, hy = 0, by = 0, ry = 0, lx = m.old ? 0.06 : 0;
    if (prop && !gest) aL *= 0.4;   // the hand with the prop swings less
    if (gest) {
      gT += dt; const k = gT / gDur, ease = sm(Math.min(1, gT / 0.25)) * sm(Math.min(1, (gDur - gT) / 0.25));
      if (k >= 1) { gest = null; showFace(moodFace); if (prop) prop.visible = true; }
      else if (gest === 'wave') { zR = -(2.5 + Math.sin(gT * 14) * 0.35) * ease; aR = 0; hz = -0.12 * ease; }
      else if (gest === 'cheer') { zL = 2.7 * ease; zR = -2.7 * ease; by = Math.abs(Math.sin(gT * 9)) * 0.12 * ease; }
      else if (gest === 'dance') { zL = (1.4 + Math.sin(gT * 8) * 0.6) * ease; zR = (-1.4 + Math.sin(gT * 8) * 0.6) * ease; ry = Math.sin(gT * 4) * 0.5 * ease; by = Math.abs(Math.sin(gT * 8)) * 0.08; hz = Math.sin(gT * 8) * 0.12; }
      else if (gest === 'nod') { hx = Math.sin(gT * 10) * 0.18; }
      else if (gest === 'shiver') { ry = Math.sin(gT * 60) * 0.05; by = Math.abs(Math.sin(gT * 45)) * 0.012; aL = -0.95 * ease; aR = -0.95 * ease; zL = -0.6 * ease; zR = 0.6 * ease; hx = 0.12 * ease; hz = Math.sin(gT * 50) * 0.04; }
      else if (gest === 'rub') { const c = gT * 7; aR = (-0.75 + Math.sin(c) * 0.15) * ease; zR = (0.6 + Math.cos(c) * 0.15) * ease; aL = -0.2 * ease; hx = 0.18 * ease; hz = Math.sin(gT * 3) * 0.06; }
      else if (gest === 'yawn') { const up = sm(Math.min(1, k * 2.2)) * sm(Math.min(1, (1 - k) * 3)); zL = 2.6 * up; zR = -2.6 * up; aL = -0.3 * up; aR = -0.3 * up; hx = -0.3 * up; by = 0.03 * up; lx = -0.05 * up; }
      else if (gest === 'droop') { hx = 0.38 * ease; aL = 0.12 * ease; aR = 0.12 * ease; zL = -0.05; zR = 0.05; by = -0.03 * ease; hz = Math.sin(gT * 1.5) * 0.1 * ease; lx = 0.1 * ease; }
      else if (gest === 'sneeze') {
        const kIn = 0.55, kOut = 0.68;
        if (k < kIn) { const q = sm(k / kIn); hx = -0.35 * q; lx = -0.08 * q; zL = 0.25 * q; zR = -0.25 * q; if (curFace !== 'surprised') showFace('surprised'); }
        else if (k < kOut) { const q = (k - kIn) / (kOut - kIn); hx = -0.35 + 0.8 * sm(q); lx = 0.14 * sm(q); by = -0.04 * Math.sin(q * Math.PI); aL = -0.6; aR = -0.6; zL = -0.2; zR = 0.2; if (curFace !== 'sneeze') showFace('sneeze');
          if (!sneezed && q > 0.4) { sneezed = true; try { if (F.FX && F.FX.burst && g.parent && P.head) { const wp = new THREE.Vector3(); anchors.face.getWorldPosition(wp); F.FX.burst(wp, { n: 7, colors: [F.PAL.white, F.PAL.ice], speed: 1.2, up: 0.4, life: 0.5, size: 0.04, gravity: 0, spread: 0.3 }); } } catch (e) { /* fx optional */ } } }
        else { const q = sm((k - kOut) / (1 - kOut)); hx = 0.45 * (1 - q); lx = 0.14 * (1 - q); if (curFace !== 'happy') showFace('happy'); }
      }
      else if (gest === 'laugh') { by = Math.abs(Math.sin(gT * 15)) * 0.035; hx = (-0.22 + Math.sin(gT * 15) * 0.05) * ease; aL = -0.7 * ease; aR = -0.7 * ease; zL = -0.45 * ease; zR = 0.45 * ease; lx = -0.04 * ease; }
      else if (gest === 'clap') { aL = -1.3 * ease; aR = -1.3 * ease; const c = Math.max(0, Math.sin(gT * 16)); zL = (-0.62 + 0.3 * (1 - c)) * ease; zR = (0.62 - 0.3 * (1 - c)) * ease; by = Math.abs(Math.sin(gT * 8)) * 0.03; }
      else if (gest === 'hug') { aL = -1.35 * ease; aR = -1.35 * ease; zL = (-0.55 + Math.sin(gT * 3) * 0.06) * ease; zR = (0.55 - Math.sin(gT * 3) * 0.06) * ease; lx = 0.12 * ease; hz = 0.18 * ease; ry = Math.sin(gT * 3) * 0.12 * ease; }
      else if (gest === 'point') { aR = -1.55 * ease; zR = 0.1 * ease; hx = 0.05; hy = 0; by = 0; if (gT < 0.4) hx = -0.1; }
      else if (gest === 'count') {
        const n = gOpt.n || Math.max(3, Math.round(gDur * 2.2)), per = (gDur - 0.4) / n, i = Math.min(n - 1, Math.floor(Math.max(0, gT - 0.2) / per)), q = ((gT - 0.2) - i * per) / per;
        aL = -1.15 * ease; zL = -0.35 * ease; aR = (-1.05 + (q > 0 && q < 0.5 ? Math.sin(q * 2 * Math.PI) * 0.18 : 0)) * ease; zR = 0.42 * ease; hx = 0.16 + (q > 0 && q < 0.5 ? Math.sin(q * 2 * Math.PI) * 0.1 : 0);
      }
      else if (gest === 'think') { aR = -1.6 * ease; zR = 0.55 * ease; hz = 0.2 * ease; hy = Math.sin(gT * 1.5) * 0.15; hx = -0.08 * ease; }
      else if (gest === 'surprised') { zL = 0.9 * ease; zR = -0.9 * ease; aL = -0.4 * ease; aR = -0.4 * ease; by = Math.sin(Math.min(1, k * 3) * Math.PI) * 0.08; lx = -0.08 * ease; }
      else if (gest === 'sleep') { hx = 0.42 * Math.min(1, gT); hz = 0.15 * Math.min(1, gT); aL = 0; aR = 0; by = Math.sin(gT * 1.6) * 0.008; }
      else if (gest === 'hop') { by = Math.abs(Math.sin(k * Math.PI * 3)) * 0.3; }
      else if (gest === 'eat') { aR = -1.9 + Math.sin(gT * 10) * 0.2; hx = 0.08; }
    } else if (!moving) {
      // idle life: blink, and the mood gesture now and then
      blinkT -= dt;
      if (blinkOn > 0) { blinkOn -= dt; if (blinkOn <= 0) showFace(moodFace); }
      else if (blinkT <= 0 && (curFace === 'normal' || curFace === 'cold' || curFace === 'hungry')) {
        blinkT = 2.5 + Math.random() * 3.5;
        if (nearCam()) { showFace('blink'); blinkOn = 0.13; }    // far-away villagers do not need (or build) a blinking head
      }
      if (mood) { moodT -= dt; if (moodT <= 0) { moodT = 4 + Math.random() * 3; g.userData.play(NEED_MOOD[mood][1]); } }
    }
    if (P.armL) { P.armL.rotation.x = aL; P.armL.rotation.z = zL; }
    if (P.armR) { P.armR.rotation.x = aR; P.armR.rotation.z = zR; }
    if (P.head) { P.head.rotation.x = hx; P.head.rotation.z = hz; P.head.rotation.y = hy; }
    if (prop && prop.userData.kind === 'ballong') { prop.rotation.x = -aL - lx + Math.sin(t * 1.7 + ph) * 0.08; prop.rotation.z = -zL + Math.sin(t * 1.3 + ph) * 0.1; }
    if (owned(g)) {
      const base = g.userData.baseY || 0;
      g.position.y = base + by + (moving ? Math.abs(Math.sin(walkP)) * 0.04 : 0);
      g.rotation.y = (g.userData.baseRY || 0) + ry;
      g.rotation.x = lx;
    }
  };
  return g;
}

/* Animal gestures (play(name, sec)): hop, nod, wag (happy tail), eat (head bobs down), sleep (head down, slow breathing; loops until 'stop'),
   shake (Tass shakes off water), stretch (yawn), spin (a happy turn), fly (Pip flaps). People gesture names map to these:
   cheer/dance/laugh/clap → hop+wag (dance = spin), wave/hello → wag, yawn/tired → stretch, shiver/cold → shake, rub/hungry → eat, hug → wag. */
const ANIMAL_G = { cheer: 'hop', laugh: 'hop', clap: 'hop', dance: 'spin', wave: 'wag', hello: 'wag', hug: 'wag', yawn: 'stretch', tired: 'stretch', trøtt: 'stretch',
  shiver: 'shake', cold: 'shake', kald: 'shake', rub: 'eat', hungry: 'eat', sulten: 'eat', droop: 'sleep', sneeze: 'shake', point: 'nod', count: 'nod', think: 'nod', surprised: 'hop' };
function animalAnim(g, kind) {
  const P = g.userData.parts;
  let gest = null, gT = 0, gDur = 0, walkP = 0;
  g.userData.play = (name, sec) => { name = ANIMAL_G[name] || name; if (name === 'stop') { gest = null; return; } gest = name; gT = 0; gDur = sec || (name === 'sleep' ? 9999 : 1.5); };
  g.userData.gesture = () => gest;
  g.userData.need = () => {}; g.userData.face = () => {};
  g.userData.animate = (dt, t, moving) => {
    if (moving) walkP += dt * 10; else walkP *= Math.max(0, 1 - dt * 6);
    let hop = 0, ry = 0, rz = 0, hx = Math.sin(t * 1.1) * 0.06, tailK = 1, tailF = kind === 'tass' ? 14 : 3;
    if (gest) {
      gT += dt; const k = gT / gDur;
      if (gT > gDur) gest = null;
      else if (gest === 'hop') { hop = Math.abs(Math.sin(gT * 9)) * 0.15; tailK = 1.6; tailF = 18; }
      else if (gest === 'nod') hx += Math.sin(gT * 10) * 0.25;
      else if (gest === 'wag') { tailK = 2; tailF = 22; hx += Math.sin(gT * 6) * 0.08; rz = Math.sin(gT * 11) * 0.04; }
      else if (gest === 'eat') { hx = 0.45 + Math.abs(Math.sin(gT * 8)) * 0.15; }
      else if (gest === 'sleep') { hx = 0.5 * Math.min(1, gT); tailK = 0.1; hop = -0.01 + Math.sin(gT * 1.5) * 0.008; }
      else if (gest === 'shake') { rz = Math.sin(gT * 40) * 0.12 * (1 - k); }
      else if (gest === 'stretch') { hx = -0.35 * Math.sin(Math.min(1, k * 1.5) * Math.PI); }
      else if (gest === 'spin') { ry = k * Math.PI * 2; hop = Math.abs(Math.sin(k * Math.PI * 2)) * 0.12; tailK = 1.6; }
    }
    if (P.tail) P.tail.rotation.y = Math.sin(t * tailF) * (kind === 'tass' ? 0.6 : 0.3) * tailK;
    if (P.tail && kind === 'bris') { P.tail.rotation.y = 0; P.tail.rotation.z = Math.sin(t * (tailK > 1 ? 6 : 2.2)) * 0.2 * tailK; }
    if (P.head) P.head.rotation.x = hx;
    if (P.legF) { P.legF.rotation.x = Math.sin(walkP) * 0.5; P.legB.rotation.x = -Math.sin(walkP) * 0.5; }
    if (P.wingL) { const f = moving || gest === 'fly' || gest === 'hop' ? Math.sin(t * 22) * 0.9 : Math.sin(t * 2) * 0.05; P.wingL.rotation.z = 0.2 + f; P.wingR.rotation.z = -0.2 - f; }
    if (P.basket) P.basket.rotation.z = Math.sin(t * 1.6) * 0.12;
    // the root transform is only driven when the model sits in a Thing / has a baseY (a free-flying model, e.g. Pip in quests, keeps its own)
    if (owned(g)) {
      g.position.y = (g.userData.baseY || 0) + hop + (kind === 'puff' ? Math.sin(t * 1.7) * 0.06 : 0) + (moving && kind !== 'puff' && kind !== 'bris' ? Math.abs(Math.sin(walkP)) * 0.05 : 0);
      g.rotation.y = (g.userData.baseRY || 0) + ry; g.rotation.z = rz;
    }
  };
  return g;
}
function animal(name) {
  const id = { pus: 'ch_pus', tass: 'ch_tass', bris: 'ch_bris', pip: 'ch_pip', puff: 'ch_puff' }[name] || name;
  const g = F.VOX.make(id, {});
  if (id === 'ch_puff') { const k = addAnchor(g.userData.parts.basket, 'basket', 0, -0.5, 0); g.userData.anchors = { basket: k, kurv: k }; }
  return animalAnim(g, name);
}

/* villager(job, seed, hint?) -> ch_person options. hint {female:bool, kid:bool, old:bool} (optional; LIFE knows the name's gender).
   Seeded: one of the job's looks, skin, hair style/colour, body (round/tall), age (≈15 % grandparents), colour and pattern swaps,
   accessories (glasses, scarf, beard, necklace, backpack) and the job prop. Signature job hats (bakerlue, sydvest, sjomann, baret) stay. */
const OUT_PAL = ['coral', 'mint', 'butter', 'lavender', 'peach', 'sky', 'teal', 'pink', 'lilac', 'orange', 'rose', 'green', 'navySoft', 'plum', 'red'];
const SIGNATURE = { bakerlue: 1, sydvest: 1, sjomann: 1, baret: 1, kokkelue: 1, byggehjelm: 1 };
function villager(job, seed, hint) {
  hint = hint || {};
  const r = F.U.rng(typeof seed === 'number' ? seed : F.U.hashStr(String(seed || job)));
  const J = ALL_JOBS.find(j => j.id === job) || F.U.pick(r, JOBS);
  const look = F.U.pick(r, J.looks);
  const female = hint.female != null ? !!hint.female : (look.outfit === 'kjole' || look.outfit === 'skjørt' || J.voice === 'vk') ? r() < 0.85 : r() < 0.3;
  const old = !hint.kid && (J.old || hint.old || r() < 0.14);
  const o = Object.assign({ skin: F.U.pick(r, SKINS), hairCol: F.U.pick(r, HAIRCOLS), lashes: female }, look);
  o.acc = (look.acc || []).slice();
  if (!look.hair) o.hair = F.U.pick(r, female ? HAIRS_F : HAIRS_M);
  if (old) { o.old = true; o.hairCol = F.U.pick(r, ['hairGrey', 'hairGrey', 'white', 'wool']); if (!female && !look.hair && r() < 0.5) o.hair = 'skallet'; if (r() < 0.6 && !o.acc.includes('briller')) o.acc.push('briller'); }
  if (!female) { o.acc = o.acc.filter(a => a !== 'halskjede'); if (r() < (old ? 0.4 : 0.2) && !o.acc.includes('skjegg') && !o.acc.includes('bart')) o.acc.push(r() < 0.5 ? 'bart' : 'skjegg'); o.beardCol = o.hairCol; }
  else { o.acc = o.acc.filter(a => a !== 'skjegg' && a !== 'bart'); if (r() < 0.15) o.acc.push('halskjede'); }
  // body
  if (!hint.kid) { const b = r(); if (b < 0.22) o.round = true; else if (b < 0.45 && !old) o.tall = true; }
  // colour & pattern variety (not for the grandparents' fixed looks)
  if (!J.old) {
    if (r() < 0.45 && o.outfit !== 'sjø') o.outfitCol = F.U.pick(r, OUT_PAL);
    if (skirted(o)) o.skirtCol = r() < 0.5 ? F.U.pick(r, OUT_PAL) : (o.skirtCol || o.outfitCol);
    if (!o.pattern && r() < 0.3 && o.outfit !== 'sjø' && o.outfit !== 'forkle') { o.pattern = F.U.pick(r, ['striper', 'prikker', 'hjerte', 'kofte']); o.patternCol = F.U.pick(r, ['white', 'butter', 'rose', 'sky']); }
  }
  if (r() < 0.12 && !o.acc.includes('skjerf')) { o.acc.push('skjerf'); o.scarfCol = F.U.pick(r, ['red', 'mint', 'butter', 'rose', 'sky']); }
  if (!old && r() < 0.08 && !o.acc.includes('sekk')) { o.acc.push('sekk'); o.bagCol = F.U.pick(r, ['coral', 'teal', 'butter', 'sky']); }
  if (!old && !o.acc.includes('briller') && r() < 0.12) { o.acc.push('briller'); o.glassCol = F.U.pick(r, ['woodDark', 'plum', 'red', 'navySoft']); }
  // hats: keep signature hats; otherwise 25 % bareheaded, 15 % a different hat
  if (o.hat && !SIGNATURE[o.hat]) { const h = r(); if (h < 0.25) o.hat = null; else if (h < 0.4) o.hat = F.U.pick(r, female ? ['pannebånd', 'sløyfe', 'blomsterkrans', 'solhatt', 'lue'] : ['sixpens', 'caps', 'lue', 'solhatt']); }
  else if (!o.hat && female && r() < 0.3) o.hat = F.U.pick(r, ['pannebånd', 'sløyfe', 'blomst']);
  if (o.hat) o.hatCol = o.hatCol && r() < 0.5 ? o.hatCol : (SIGNATURE[o.hat] ? o.hatCol : F.U.pick(r, OUT_PAL));
  o.ribbonCol = F.U.pick(r, ['rose', 'mint', 'butter', 'sky', 'lilac']);
  if ((o.hair === 'lang' || o.hair === 'fletter' || o.hair === 'krøller' || o.hair === 'afro' || o.hair === 'pigger') && (o.hat === 'sydvest' || o.hat === 'kokkelue' || o.hat === 'bakerlue')) o.hair = 'kort';
  if (o.hair === 'afro' && o.hat && o.hat !== 'pannebånd' && o.hat !== 'sløyfe' && o.hat !== 'blomst') o.hat = null;
  o.prop = J.prop;
  if (hint.kid) { o.age = 'barn'; o.old = false; o.round = false; o.tall = false; o.acc = o.acc.filter(a => a === 'briller' || a === 'sekk' || a === 'skjerf'); }
  return o;
}

F.People = {
  PRESETS, JOBS, SITE_JOBS, SKINS, HAIRS, HAIRCOLS, GESTURES, GESTURE_ALIAS: GALIAS, FACES, PROPS: PROP_IDS, NEEDS: Object.keys(NEED_MOOD),
  preset: name => Object.assign({}, PRESETS[name] || {}),
  villager, make, animal, layout,
  /* anchor offsets in metres from the model origin (adult, before any scale): head top ≈ 1.69 m, body ≈ 0.69 m, hand ≈ (−0.31, 0.5, 0) */
};
})();

/* ==================================================================================================
   ch_fairy { kind:'krystall'|'blomst'|'boble'|'stjerne', dress, wings, head, shoes, wand, hair, hairCol, skin }
     dress: 'krystall'|'blomst'|'boble'|'stjerne'|'sommer'|'ball'|'regnbue'|'rose'|'kake'|'note'      (default = kind)
     wings: 'krystall'|'blomst'|'boble'|'stjerne'|'sommerfugl'|'glitter'|'regnbue'|'gull'|'rose'|'sjostjerne'  (default = kind)
     head:  'krystall'|'blomst'|'boble'|'stjerne'|'tiara'|'krone'|'solhatt'|'ingen'     (default = kind)
     shoes: 'glitter'|'rosa'|'regn'|'mane'|'krystall'|null   wand: 'krystall'|'blomst'|'boble'|'stjerne'|'hjerte'|'maane'|'ingen'
   1/16 scale, 20 voxels to the top of the head (1.25 m). Parts: wingL (+x), wingR (−x) [flap = rotation.y],
   head (neck pivot), armL, armR (wand hand = armR).  Anchors (metres from the foot origin, model space):
     head top (0, 1.28, 0) · back/wing root (0, 0.56, −0.19) · body (0, 0.45, 0.12) · hand = armR pivot + (0, −0.25, 0.06) · feet (0, 0, 0)
   meta.opts = {dress, wings, shoes, head, wand}: every native option (WP9's wear table reads it).
   ================================================================================================== */
(function () {
'use strict';
const F = window.F;
// glass tints for wings (derived from palette names; registered as glass colours)
const tint = (name, base, k, mix) => { // same as F.M3K tints in m_nature.js (guarded: defined once)
  if (F.PAL[name] != null) return;
  const c = new THREE.Color(F.PAL[base]).lerp(new THREE.Color(F.PAL[mix || 'white']), k);
  let h = c.getHex(); const used = new Set(Object.values(F.PAL)); while (used.has(h)) h += 1;
  F.PAL[name] = h; F.VOX.GLASS.add(h);
};
tint('gRose', 'pink', 0.38); tint('gMint', 'mint', 0.25); tint('gAqua', 'sky', 0.2); tint('gGold', 'yellow', 0.35); tint('gLilac', 'lilac', 0.3);
tint('gPeach', 'peach', 0.15); tint('gIce', 'crystal', 0.1, 'lilac'); tint('gSky', 'blue', 0.5);
const C = 16, ZC = 8;
const KIND = {
  krystall: { skin: 'skin', hair: 'lang', hairCol: 'lilac', body: 'ice', skirt: ['lavender', 'ice'], hem: 'crystal', shoes: 'ice', glow: 'crystal' },
  blomst: { skin: 'skin2', hair: 'lang', hairCol: 'hairRed', body: 'mint', skirt: ['pink', 'blossom'], hem: 'leaf2', shoes: 'mint' },
  boble: { skin: 'skin3', hair: 'knuter', hairCol: 'hairBlack', body: 'teal', skirt: ['sky', 'gAqua'], hem: 'white', shoes: 'sky' },
  stjerne: { skin: 'skin', hair: 'hestehale', hairCol: 'hairBrown', body: 'butter', skirt: ['peach', 'butter'], hem: 'gold', shoes: 'gold' },
};
const DRESS = {
  krystall: { body: 'ice', rows: ['lavender', 'ice', 'lavender', 'ice', 'lilac', 'lavender'], dots: 'crystal', a: 6 },
  blomst: { body: 'mint', rows: ['pink', 'pink', 'blossom', 'pink', 'blossom', 'pink'], dots: 'white', petals: true, a: 6 },
  boble: { body: 'teal', rows: ['sky', 'sky', 'teal', 'sky', 'sky', 'teal'], dots: 'white', a: 6 },
  stjerne: { body: 'butter', rows: ['peach', 'butter', 'coral', 'butter', 'peach', 'butter'], dots: 'gold', a: 6 },
  sommer: { body: 'yellow', rows: ['butter', 'butter', 'butter', 'butter', 'butter', 'butter'], dots: 'rose', a: 5 },
  ball: { body: 'rose', rows: ['pink', 'pink', 'blossom', 'pink', 'pink', 'blossom'], dots: 'white', a: 8, long: true },
  regnbue: { body: 'white', rows: ['lilac', 'sky', 'mint', 'butter', 'peach', 'pink'], dots: null, a: 7 },
  // WP9 themed-shop dresses (DESIGN2 §6.2): Rosekjole (Blomsterbua), Kakekjole (Kakebua), Notekjole (Notebua)
  rose: { body: 'rose', rows: ['red', 'rose', 'red', 'rose', 'red', 'rose'], dots: 'blossom', petals: true, a: 7, long: true, motif: 'rose' },
  kake: { body: 'pink', rows: ['white', 'cream', 'peach', 'cream', 'pink', 'cream'], dots: 'cherry', a: 6, motif: 'kake' },
  note: { body: 'navySoft', rows: ['white', 'navySoft', 'sky', 'navySoft', 'white', 'navySoft'], dots: 'gold', a: 6, motif: 'note' },
};
// shoes: native options (default = the kind's own colour). regn = rain boots, mane = moon shoes, krystall = crystal shoes
const SHOE = { glitter: 'gold', rosa: 'pink', regn: 'yellow', mane: 'silver', krystall: 'crystal' };
function fbody(v, o) {
  const K = KIND[o.kind] || KIND.krystall, D = DRESS[o.dress || o.kind] || DRESS.krystall;
  // legs + shoes
  const shoe = SHOE[o.shoes] || K.shoes;
  for (const x of [C - 3, C + 1]) {
    v.box(x, 1, 7, x + 1, 3, 8, o.skin || K.skin); v.box(x, 0, 7, x + 1, 0, 9, shoe);
    if (o.shoes === 'glitter') v.set(x, 0, 9, 'glowYellow');
    else if (o.shoes === 'regn') { v.box(x, 1, 7, x + 1, 2, 8, 'yellow'); v.box(x, 2, 8, x + 1, 2, 8, 'butter'); v.set(x + 1, 0, 9, 'butter'); }   // tall rain boots
    else if (o.shoes === 'mane') { v.set(x, 0, 9, 'glowYellow'); v.set(x + 1, 1, 8, 'butter'); }                                                       // moon toe + a little moon
    else if (o.shoes === 'krystall') { v.set(x, 0, 9, 'gIce'); v.set(x + 1, 0, 9, 'crystal'); v.set(x, 1, 8, 'crystal'); }                             // glassy crystal shoes
  }
  // skirt bell: rows from waist (y=7) down to y=2 (ball gown to y=0)
  const bottom = D.long ? 0 : 2;
  for (let y = bottom; y <= 7; y++) {
    const k = 7 - y, a = 3 + Math.round(k * (D.a - 3) / (7 - bottom)), d = 2 + Math.round(k * (D.a - 3) / (7 - bottom) * 0.75);
    v.box(C - a, y, ZC - d, C + a - 1, y, ZC + d - 1, D.rows[Math.min(D.rows.length - 1, k)]);
    if (k > 0) v.clear(C - a + 1, y, ZC - d + 1, C + a - 2, y, ZC + d - 2);
    if (y === bottom) for (let x = C - a; x <= C + a - 1; x++) for (let z = ZC - d; z <= ZC + d - 1; z++) if (v.get(x, y, z) && (x + z) % 2 === 0) v.set(x, y, z, D.petals ? 'leaf2' : (o.dress ? D.rows[0] : K.hem));
  }
  if (D.dots) v.paint((x, y, z) => (y > bottom && y < 7 && F.U.hash2(x * 5 + z, y * 11, 3) < 0.12 && (z >= ZC + 2 || z <= ZC - 3 || x <= C - 4 || x >= C + 3) ? D.dots : null));
  if (D.petals) for (let x = C - 6; x <= C + 5; x += 2) { v.set(x, bottom, ZC + 4, 'leaf2'); v.set(x, bottom, ZC - 5, 'leaf2'); }
  // themed motifs on the skirt's front surface (z of the bell's front row at height y)
  const fz = y => ZC + 1 + Math.round((7 - y) * (D.a - 3) / (7 - bottom) * 0.75);
  const ps = (x, y, c, out) => { if (y >= bottom && y <= 7 && v.get(x, y, fz(y))) v.set(x, y, fz(y) + (out || 0), c); };   // only on the skirt
  if (D.motif === 'rose') for (const [x, y] of [[C - 4, 4], [C + 2, 3], [C - 1, 1]]) { ps(x, y, 'red'); ps(x + 1, y, 'cherry'); ps(x, y + 1, 'cherry'); ps(x + 1, y + 1, 'red'); }   // big roses on the front
  if (D.motif === 'kake') { for (let x = C - 5; x <= C + 4; x++) { ps(x, 5, 'white'); if (x & 1) ps(x, 4, 'white'); } for (const x of [C - 3, C - 1, C + 1]) ps(x, 6, 'cherry', 1); }   // icing drips + cherries
  if (D.motif === 'note') for (const [x, y] of [[C - 4, 3], [C + 1, 4], [C - 2, 5]]) { ps(x, y, 'gold'); ps(x + 1, y, 'gold'); ps(x + 1, y + 1, 'gold'); ps(x + 1, y + 2, 'gold'); }   // golden notes
  // kind motif on the hem ring (only with the fairy's own dress): crystal shards, petal tips, bubbles, little stars
  if (!o.dress || o.dress === o.kind) {
    const ring = [];
    for (let z = 0; z < 16; z++) for (let x = 0; x < 32; x++) if (v.get(x, bottom, z) && (!v.get(x + 1, bottom, z) || !v.get(x - 1, bottom, z) || !v.get(x, bottom, z + 1) || !v.get(x, bottom, z - 1))) ring.push([x, z]);
    ring.forEach(([x, z], i) => {
      const ox = x < C - 2 ? -1 : x > C + 1 ? 1 : 0, oz = z < ZC - 2 ? -1 : z > ZC + 1 ? 1 : 0;
      if (o.kind === 'krystall' && i % 4 === 0) { v.set(x + ox, bottom, z + oz, 'crystal'); v.set(x, bottom + 1, z, 'crystal'); }
      else if (o.kind === 'blomst' && i % 3 === 0) { v.set(x + ox, bottom, z + oz, 'blossom'); }
      else if (o.kind === 'boble' && i % 5 === 0) { v.set(x + ox, bottom + 1 + (i % 2), z + oz, 'gAqua'); }
      else if (o.kind === 'stjerne' && i % 4 === 0) { v.set(x + ox, bottom, z + oz, 'glowYellow'); }
    });
    v.box(C - 3, 7, 10, C + 2, 7, 10, o.kind === 'krystall' ? 'lavender' : o.kind === 'blomst' ? 'leaf2' : o.kind === 'boble' ? 'white' : 'gold'); // sash
  }
  // bodice
  v.box(C - 3, 7, 6, C + 2, 10, 9, D.body); v.set(C - 3, 10, 6, 0); v.set(C + 2, 10, 6, 0); v.set(C - 3, 10, 9, 0); v.set(C + 2, 10, 9, 0);
  v.box(C - 1, 8, 10, C, 8, 10, o.kind === 'krystall' ? 'crystal' : o.kind === 'stjerne' ? 'glowYellow' : o.kind === 'boble' ? 'white' : 'rose'); // brooch
  v.box(C - 3, 7, 6, C + 2, 7, 9, D.rows[1]);
  // wing root between the shoulders
  v.box(C - 1, 8, 4, C, 10, 5, D.body);
}
function fhead(v, o) {
  const K = KIND[o.kind] || KIND.krystall;
  const x0 = C - 5, x1 = C + 4, z0 = 3, z1 = 11, y0 = 11, y1 = 19, skin = o.skin || K.skin;
  v.box(x0, y0, z0, x1, y1, z1, skin);
  for (let y = y0; y <= y1; y++) { v.set(x0, y, z0, 0); v.set(x1, y, z0, 0); v.set(x0, y, z1, 0); v.set(x1, y, z1, 0); }
  v.box(x0, y1, z0, x1, y1, z0, 0); v.box(x0, y1, z1, x1, y1, z1, 0); v.box(x0, y1, z0, x0, y1, z1, 0); v.box(x1, y1, z0, x1, y1, z1, 0);
  // eyes: tall with highlight, lashes
  const fe = o.face || 'normal'; // normal | blink | happy (used by the avatar: blinking, joy while twirling/cheering)
  if (fe === 'blink') for (const ex of [C - 4, C + 2]) { v.box(ex - 1, 14, z1, ex + 2, 14, z1, 'black'); }
  else if (fe === 'happy') for (const ex of [C - 4, C + 2]) { v.set(ex, 15, z1, 'black'); v.set(ex + 1, 15, z1, 'black'); v.set(ex - 1, 14, z1, 'black'); v.set(ex + 2, 14, z1, 'black'); }
  else {
    for (const ex of [C - 4, C + 2]) { v.box(ex, 13, z1, ex + 1, 16, z1, 'black'); v.set(ex, 15, z1, 'white'); }
    v.set(C - 5 + 1, 16, z1, 'black'); v.set(C + 4 - 1 + 1, 16, z1, 0); v.set(C + 4, 16, z1 - 1, 'black'); v.set(C - 5, 16, z1 - 1, 'black');
  }
  v.set(C - 4, 12, z1, 'blossom'); v.set(C - 5 + 1 - 1, 12, z1 - 1, 'blossom'); v.set(C + 3, 12, z1, 'blossom'); v.set(C + 4, 12, z1 - 1, 'blossom');
  v.box(C - 1, 12, z1, C, 12, z1, 'cherry'); v.set(C - 2, 13, z1, 'cherry'); v.set(C + 1, 13, z1, 'cherry');
  // hair
  const hc = o.hairCol || K.hairCol, hs = o.hair || K.hair, top = y1 + 1;
  v.box(x0, top, z0, x1, top, z1 - 1, hc); v.box(x0 + 1, top, z1, x1 - 1, top, z1, hc);
  v.box(x0 - 1, y0 + 4, z0, x0 - 1, y1, z1 - 2, hc); v.box(x1 + 1, y0 + 4, z0, x1 + 1, y1, z1 - 2, hc);
  v.box(x0, y0 + 1, z0 - 1, x1, y1, z0 - 1, hc);
  v.box(x0 + 1, y1 - 1, z1, x1 - 1, y1, z1, hc); v.box(x0, y1 - 1, z1 - 1, x1, y1, z1 - 1, hc);
  for (let x = x0 + 1; x <= x1 - 1; x++) if ((x - x0) % 3 === 0) v.set(x, y1 - 2, z1, hc);
  v.box(x0, y0 + 4, z1 - 1, x0, y1, z1 - 1, hc); v.box(x1, y0 + 4, z1 - 1, x1, y1, z1 - 1, hc);
  v.box(x0, top, z0, x0, top, z1, 0); v.box(x1, top, z0, x1, top, z1, 0); v.box(x0, top, z0, x1, top, z0, 0);
  v.set(x0 - 1, y1, z0, 0); v.set(x1 + 1, y1, z0, 0);
  if (hs === 'lang') { v.box(x0 - 1, y0 + 3, z0 - 1, x1 + 1, y0 + 4, z0 + 1, hc); v.box(x0 - 1, y0 + 3, z0 + 2, x0 - 1, y0 + 4, z1 - 3, hc); v.box(x1 + 1, y0 + 3, z0 + 2, x1 + 1, y0 + 4, z1 - 3, hc); }
  if (hs === 'hestehale') { v.box(C - 1, y1 - 1, z0 - 2, C, y1 + 1, z0 - 2, hc); v.box(C - 1, y1 - 2, z0 - 3, C, y1 - 1, z0 - 2, 'rose'); }
  if (hs === 'knuter') { v.sphere(x0 + 0.5, top + 1, ZC - 1, 2.2, hc); v.sphere(x1 - 0.5, top + 1, ZC - 1, 2.2, hc); }
  // headwear
  const hw = o.head || o.kind;
  if (hw === 'krystall') { v.box(C - 4, top + 1, z1 - 2, C + 3, top + 1, z1 - 2, 'silver'); v.box(C - 1, top + 2, z1 - 2, C, top + 5, z1 - 2, 'crystal'); v.box(C - 3, top + 2, z1 - 2, C - 3, top + 3, z1 - 2, 'crystal'); v.box(C + 2, top + 2, z1 - 2, C + 2, top + 3, z1 - 2, 'crystal'); v.set(C - 4, top + 2, z1 - 2, 'gIce'); v.set(C + 3, top + 2, z1 - 2, 'gIce'); v.set(C - 1, top + 6, z1 - 2, 'crystal'); v.set(C - 1, top + 1, z1 - 1, 'gem2'); v.set(C, top + 1, z1 - 1, 'gem2'); }
  if (hw === 'blomst') { const cols = ['rose', 'butter', 'white', 'pink', 'lilac']; let i = 0; for (let x = x0; x <= x1; x += 2) { v.set(x, top + 1, z1 - 1, cols[i++ % 5]); v.set(x, top + 1, z0, cols[(i + 2) % 5]); } for (let z = z0; z <= z1 - 1; z += 2) { v.set(x0, top + 1, z, cols[i++ % 5]); v.set(x1, top + 1, z, cols[(i + 1) % 5]); } v.box(x0 + 1, top + 1, z1 - 1, x1 - 1, top + 1, z1 - 1, 'leaf2'); for (let x = x0 + 1; x <= x1; x += 3) v.set(x, top + 1, z1 - 1, cols[x % 5]); }
  if (hw === 'boble') { v.box(x0, top, ZC - 1, x1, top, ZC, 'sky'); v.box(x0 - 1, y1 - 2, ZC - 1, x0 - 1, top, ZC, 'sky'); v.box(x1 + 1, y1 - 2, ZC - 1, x1 + 1, top, ZC, 'sky'); v.sphere(C + 3, top + 2, ZC, 1.5, 'gAqua'); v.sphere(C - 3, top + 1.5, ZC - 1, 1.2, 'gAqua'); }
  if (hw === 'stjerne') { const sx = C - 1, sy = top + 2, sz = z1 - 2; v.box(C - 3, top + 1, sz, C + 2, top + 1, sz, 'gold'); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1], [2, 1], [0, 2], [1, 2], [0, 3], [1, 3], [-1, 0], [2, 0]]) v.set(sx + dx, sy + dy - (dx === -1 || dx === 2 ? (dy === 0 ? -1 : 0) : 0), sz, 'glowYellow'); }
  if (hw === 'tiara') { v.box(C - 3, top + 1, z1 - 2, C + 2, top + 1, z1 - 2, 'gold'); v.box(C - 1, top + 2, z1 - 2, C, top + 2, z1 - 2, 'gold'); v.box(C - 1, top + 3, z1 - 2, C, top + 3, z1 - 2, 'gem1'); }
  if (hw === 'krone') { for (let x = C - 3; x <= C + 2; x++) for (let z = ZC - 3; z <= ZC + 2; z++) if (x === C - 3 || x === C + 2 || z === ZC - 3 || z === ZC + 2) { v.box(x, top + 1, z, x, top + 2, z, 'gold'); if ((x + z) % 2 === 0) v.set(x, top + 3, z, 'gold'); } v.set(C - 1, top + 1, ZC + 2, 'gem1'); v.set(C, top + 1, ZC + 2, 'gem2'); }
  if (hw === 'solhatt') { v.box(x0 - 3, top + 1, z0 - 2, x1 + 3, top + 1, z1 + 1, 'hay'); v.box(x0 + 1, top + 2, z0 + 1, x1 - 1, top + 3, z1 - 2, 'hay'); v.box(x0 + 1, top + 2, z0 + 1, x1 - 1, top + 2, z1 - 2, 'rose'); v.set(x1 - 1, top + 3, z1 - 1, 'blossom'); }
}
/* the swaying part of the hair (long curtain / ponytail); pivot at the back of the head (C, 16, 3) – buildAvatar parents it to the head */
function fhair(v, o) {
  const K = KIND[o.kind] || KIND.krystall, hc = o.hairCol || K.hairCol, hs = o.hair || K.hair;
  const x0 = C - 5, x1 = C + 4, z0 = 3, z1 = 11, y0 = 11, y1 = 19;
  if (hs === 'lang') {
    v.box(x0 - 1, y0 - 4, z0 - 1, x1 + 1, y0 + 2, z0 + 1, hc); v.box(x0 - 1, y0 - 3, z0 + 2, x0 - 1, y0 + 2, z1 - 3, hc); v.box(x1 + 1, y0 - 3, z0 + 2, x1 + 1, y0 + 2, z1 - 3, hc);
    for (let x = x0; x <= x1; x += 2) v.set(x, y0 - 5, z0, hc);
    for (let x = x0; x <= x1; x += 3) v.set(x, y0 - 1, z0 - 1, o.kind === 'krystall' ? 'lavender' : 'hairBrown' === hc ? 'woodLight' : hc); // a few lighter strands
    if (o.kind === 'krystall') { v.set(x0 + 1, y0 - 2, z0 - 1, 'crystal'); v.set(x1 - 2, y0, z0 - 1, 'crystal'); }
    if (o.kind === 'blomst') { v.set(x0, y0 - 2, z0 - 1, 'butter'); v.set(x1 - 1, y0 + 1, z0 - 1, 'white'); v.set(C - 1, y0 - 3, z0 - 1, 'rose'); }
  }
  if (hs === 'hestehale') { v.box(C - 1, y0 - 3, z0 - 3, C, y1 - 3, z0 - 2, hc); v.box(C - 2, y0 - 1, z0 - 3, C + 1, y0 + 3, z0 - 2, hc); v.set(C - 1, y0 - 4, z0 - 3, hc); v.set(C, y0 - 4, z0 - 2, 'gold'); }
}
function farm(v, o, side) {
  const K = KIND[o.kind] || KIND.krystall, D = DRESS[o.dress || o.kind] || DRESS.krystall;
  const x0 = side > 0 ? C + 3 : C - 5;
  v.box(x0, 8, 7, x0 + 1, 10, 8, D.body); v.box(x0, 7, 7, x0 + 1, 7, 8, o.skin || K.skin);
  if (side < 0 && o.wand !== 'ingen') { // wand in the right hand, tip forward-up
    const w = o.wand || o.kind;
    v.line(x0, 7, 9, x0, 9, 12, 'white');
    const tx = x0, ty = 10, tz = 13;
    if (w === 'krystall') { v.box(tx, ty, tz, tx, ty + 2, tz, 'crystal'); v.set(tx - 1, ty + 1, tz, 'crystal'); v.set(tx + 1, ty + 1, tz, 'crystal'); }
    else if (w === 'blomst') { v.set(tx, ty + 1, tz, 'butter'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(tx + dx, ty + 1 + dy, tz, 'rose'); }
    else if (w === 'boble') { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (Math.abs(dx) + Math.abs(dy) === 1) v.set(tx + dx, ty + 1 + dy, tz, 'gAqua'); v.set(tx, ty + 1, tz, 0); v.set(tx + 1, ty + 2, tz, 'gAqua'); }
    else if (w === 'hjerte') { for (const [dx, dy] of [[-1, 2], [1, 2], [-1, 1], [0, 1], [1, 1], [0, 0]]) v.set(tx + dx, ty + dy, tz, 'rose'); }
    else if (w === 'maane') { for (const [dx, dy] of [[0, 2], [-1, 1], [-1, 0], [0, -0], [1, 2]]) v.set(tx + dx, ty + dy, tz, 'glowYellow'); }
    else { for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [-1, 1], [1, 1], [-1, -1 + 1 - 1], [1, -1 + 1 - 1]]) v.set(tx + dx, ty + dy, tz, 'glowYellow'); }
  }
}
/* wing cell masks for the +x wing (dx>=1 from the centre line, dy from y=9); returns colour or null */
function wingCell(kind, dx0, dy0) {
  const dx = dx0 * 0.62, dy = dy0 * 0.85;   // wide, low wings so they read beside the big head from the high camera
  const up = ((dx - 5.2) / 4.6) ** 2 + ((dy - 3.6) / 4.4) ** 2, lo = ((dx - 3.6) / 3) ** 2 + ((dy + 2.6) / 3.1) ** 2;
  const inUp = up <= 1, inLo = lo <= 1, edge = (up <= 1 && up > 0.6) || (lo <= 1 && lo > 0.45);
  switch (kind) {
    case 'krystall': {
      const a = Math.abs(dx - 5) / 4.8 + Math.abs(dy - 3.8) / 4.8, b = Math.abs(dx - 3.5) / 3 + Math.abs(dy + 2.5) / 3.2;
      if (a > 1 && b > 1) return null; const e = (a <= 1 && a > 0.7) || (b <= 1 && b > 0.55);
      return e ? 'lavender' : ((dx0 + dy0) % 3 === 0 ? 'crystal' : 'gIce');
    }
    case 'blomst': {
      const p1 = ((dx - 4.8) * 0.85 + (dy - 3.5) * 0.53) ** 2 / 24 + ((dx - 4.8) * -0.53 + (dy - 3.5) * 0.85) ** 2 / 8, p2 = ((dx - 3.5) ** 2) / 7 + ((dy + 2.5) ** 2) / 9;
      if (p1 > 1 && p2 > 1) return null; return (p1 <= 1 && p1 > 0.55) || (p2 <= 1 && p2 > 0.45) ? 'pink' : 'gRose';
    }
    case 'boble': {
      const c1 = (dx - 5) ** 2 + (dy - 3.5) ** 2, c2 = (dx - 3.5) ** 2 + (dy + 2.5) ** 2, c3 = (dx - 9.2) ** 2 + (dy - 7.5) ** 2;
      if (c1 > 20 && c2 > 8 && c3 > 2) return null; if (c1 > 20 && c2 > 8) return 'gSky';
      return (c1 <= 20 && c1 > 12) || (c2 <= 8 && c2 > 4) ? 'gSky' : ((dx0 + 2 * dy0) % 7 === 0 ? 'white' : 'gAqua');
    }
    case 'stjerne': {
      const cx = dx - 5, cy = dy - 3, r = Math.hypot(cx, cy), ang = Math.atan2(cy, cx) + 0.3;
      const R = 2.6 + 2.6 * Math.pow(Math.abs(Math.cos(ang * 2.5)), 3);
      if (r > R && !inLo) return null; if (r > R) return lo > 0.45 ? 'gold' : 'gGold';
      return r > R - 1.1 ? 'gold' : 'gGold';
    }
    case 'sommerfugl': if (!inUp && !inLo) return null; if (edge) return 'coral'; if (Math.abs(dx - 5.5) < 1 && Math.abs(dy - 4) < 1) return 'plum'; if (Math.abs(dx - 3.5) < 0.8 && Math.abs(dy + 2.5) < 0.8) return 'white'; return inUp ? 'gPeach' : 'gGold';
    case 'glitter': if (!inUp && !inLo) return null; if (edge) return 'lilac'; return F.U.hash2(dx0, dy0, 9) < 0.16 ? 'glowYellow' : 'gLilac';
    case 'regnbue': { if (!inUp && !inLo) return null; if (edge) return 'white'; const band = ['gLilac', 'gSky', 'gMint', 'gGold', 'gPeach', 'gRose']; return band[Math.max(0, Math.min(5, Math.floor((dy + 5) / 2.2)))]; }
    case 'gull': if (!inUp && !inLo) return null; if (edge) return 'gold'; return F.U.hash2(dx0, dy0, 4) < 0.12 ? 'glowYellow' : 'gGold';
    case 'rose': {   // WP9 Rosevinger: two big rose petals, deep red rim, rosy glass, a curled petal line
      const p1 = ((dx - 5) ** 2) / 22 + ((dy - 3.4) ** 2) / 18, p2 = ((dx - 3.6) ** 2) / 8 + ((dy + 2.6) ** 2) / 9;
      if (p1 > 1 && p2 > 1) return null;
      if ((p1 <= 1 && p1 > 0.62) || (p2 <= 1 && p2 > 0.5)) return 'red';
      if (Math.abs(Math.hypot(dx - 4.2, dy - 2.6) - 2.6) < 0.5 && p1 <= 1) return 'rose';
      return 'gRose';
    }
    case 'sjostjerne': {   // WP9 Sjøstjernevinger: a five-armed starfish (upper) and a small one (lower), coral with white dots
      const star = (cx, cy, r0, r1) => { const ax = dx - cx, ay = dy - cy, r = Math.hypot(ax, ay), ang = Math.atan2(ay, ax) + 0.31; return r / (r0 + r1 * Math.pow(Math.abs(Math.cos(ang * 2.5)), 1.3)); };
      const s1 = star(5.2, 3.6, 2.5, 2.9), s2 = star(3.4, -2.8, 1.6, 1.7);
      if (s1 > 1 && s2 > 1) return null;
      if ((s1 <= 1 && s1 > 0.8) || (s2 <= 1 && s2 > 0.72)) return 'coral';
      return F.U.hash2(dx0, dy0, 6) < 0.16 ? 'white' : (s1 < 0.35 || s2 < 0.3 ? 'coral' : 'peach');
    }
  }
  return null;
}
function fwing(v, o, side) {
  const kind = o.wings || o.kind || 'krystall';
  for (let dx = 1; dx <= 16; dx++) for (let dy = -8; dy <= 10; dy++) {
    const c = wingCell(kind, dx, dy); if (!c) continue;
    const x = side > 0 ? C - 1 + dx : C - dx;
    v.set(x, 9 + dy, 2, c);
  }
  v.box(side > 0 ? C : C - 2, 8, 2, side > 0 ? C + 1 : C - 1, 10, 4, (DRESS[o.dress || o.kind] || DRESS.krystall).body);
}
const fo = o => Object.assign({ kind: 'krystall' }, o || {});
F.VOX.def('ch_fairy', {
  size: [32, 26, 16], scale: 1 / 16,
  build(v, o) { fbody(v, fo(o)); },
  parts: {
    head: { pivot: [C, 11, ZC], build(v, o) { fhead(v, fo(o)); } },
    hair: { pivot: [C, 16, 3], build(v, o) { fhair(v, fo(o)); } },
    armL: { pivot: [C + 3, 10, ZC], build(v, o) { farm(v, fo(o), 1); } },
    armR: { pivot: [C - 3, 10, ZC], build(v, o) { farm(v, fo(o), -1); } },
    wingL: { pivot: [C, 9, 2.5], build(v, o) { fwing(v, fo(o), 1); } },
    wingR: { pivot: [C, 9, 2.5], build(v, o) { fwing(v, fo(o), -1); } },
  },
  meta: { group: 'fairy', gallery: [{ kind: 'krystall' }, { kind: 'blomst' }, { kind: 'boble' }, { kind: 'stjerne' },
    { kind: 'krystall', dress: 'ball', wings: 'gull', head: 'krone' }, { kind: 'blomst', dress: 'regnbue', wings: 'regnbue', head: 'tiara', shoes: 'glitter', wand: 'hjerte' },
    { kind: 'boble', dress: 'sommer', wings: 'sommerfugl', head: 'solhatt' }, { kind: 'stjerne', dress: 'stjerne', wings: 'glitter', wand: 'maane', shoes: 'rosa' },
    { kind: 'blomst', dress: 'rose', wings: 'rose', shoes: 'regn' }, { kind: 'stjerne', dress: 'kake', wings: 'sjostjerne', shoes: 'mane' },
    { kind: 'boble', dress: 'note', wings: 'sjostjerne', shoes: 'krystall' }, { kind: 'krystall', dress: 'rose', wings: 'rose', shoes: 'krystall' }] },
});
for (const k of ['krystall', 'blomst', 'boble', 'stjerne']) {
  F.VOX.def('ch_fairy_' + k, { size: [32, 26, 16], scale: 1 / 16, build(v, o) { fbody(v, fo(Object.assign({ kind: k }, o))); },
    parts: F.VOX.defs.ch_fairy.parts && Object.fromEntries(Object.entries(F.VOX.defs.ch_fairy.parts).map(([n, p]) => [n, { pivot: p.pivot, build(v, o) { p.build(v, Object.assign({ kind: k }, o)); } }])),
    meta: { group: 'fairy' } });
}
F.FAIRY_LOOK = { KIND, DRESS, SHOE, wingKinds: ['krystall', 'blomst', 'boble', 'stjerne', 'sommerfugl', 'glitter', 'regnbue', 'gull', 'rose', 'sjostjerne'], shoeKinds: Object.keys(SHOE),
  headKinds: ['krystall', 'blomst', 'boble', 'stjerne', 'tiara', 'krone', 'solhatt', 'ingen'], wandKinds: ['krystall', 'blomst', 'boble', 'stjerne', 'hjerte', 'maane', 'ingen'] };
// WP9 request (v2_w1b): the native options, so F.Fairy.look (fairy.js) can switch themed-shop wear to them (fairyHas)
F.VOX.defs.ch_fairy.meta.opts = { dress: Object.keys(DRESS), wings: F.FAIRY_LOOK.wingKinds.slice(), shoes: Object.keys(SHOE), head: F.FAIRY_LOOK.headKinds.slice(), wand: F.FAIRY_LOOK.wandKinds.slice() };
})();
