/* Feslottet – WP8 royal quests RQ1–RQ7 for the kingdoms (DESIGN2 §7). Owner WP8. Speech: js/speech/lines_rq.js (rq_).
   One template per RQ, generated for every kingdom in F.REALMS; content always comes from the learning engine (F.Quest.task).
     RQ1 Porten       child  T read the gate sign (LES F23/F27)                             → star, Slottspass (F.RQuest.pass)
     RQ2 Festen       queen  T count party things (T-MENGDE) → T missing / more (T-ORDEN)   → garlands + lanterns at the market
     RQ3 Rotet        king   T clue note → G note in a castle room (T LES) → G find the item → back  → the king's quirk line
     RQ4 Skiltet      child  T write a word (SKRIV F33/F35/F40)                              → a sign with HER word, for good
     RQ5 Vaktparaden  king   T guards in order (T-ORDEN F20/F18/F19) → T «what comes after»
     RQ6 Handleturen  queen  shop: buy in the kingdom's themed shop (F12 pay in the panel) → deliver it to the queen → she uses it
     RQ7 Brev til Leo king   (3 stars) talk → deliver the letter to Kong Leo at home → T Leo reads it with her (F30/F23) → Vennskap
   Sequencing (§7.3): RQ1 starts by itself on 'royalsGreeted'; then each royal offers its own RQ of RQ2–RQ6 (gold bubble, one
   active per kingdom, any order), each gives a star; at 3 stars the king offers RQ7. After Vennskap RQ2–RQ6 repeat, max 1 per
   kingdom per day, for coins. Rewards: 10–20 coins (+ a star until 3).
   Step types: task | talk | back (at an actor) · obj | go (a thing to tap) · shop {realm shop, event 'shopBuy'} ·
   deliver {to: royal who | 'konge'} (basket on screen; done on reaching / tapping that actor) · travel (invitation → the gate).
   F.RQuest = { offer(actor) -> Promise|null, stars(id), friend(id) -> bool, status(id), pass(id) -> bool, target() -> {…, realm|home},
                invite(id) (start the travel to a kingdom), carry() -> {model, realm}|null, defs, start(id, qid) }
   Save F.save.rq = {stars, done:{id:{RQn:day}}, active:{id:qid}, prog:{id:{step, item, word}}, friend:{id:day}, signs:{id:word},
                     last:{id:day}, pass:{id:day}, invites:{id:{day, sent}}, travel:{realm, day}|null, use:{id:itemId}, focus, focusT}
   Events out: rqStart(qid, id), rqStep(qid, id, step), rqDone(qid, id), friendship(id).  Debug (ready): F.dbg.questRun(qid, id, 'A'|'C'),
   F.dbg.rq(), F.dbg.rqReset(id).
   v3 (DESIGN3 §7, WP4): busy per kingdom (RQ.busyFor(id); RQ.busy = any); RQ.offer returns 'wait' while busy (F.Royals queues the tap);
   RQ.mine(id, who) / RQ.holder(id) (who holds the next step); the item is picked first so the giver line fits it (RQ1 = F27 sign + a
   glance at the gate, F23 + rq_g_les otherwise; RQ3 = F23 note); extra steps RQ1 F14 code lock, RQ4 F35, RQ6 shopping note (only the
   noted shop item counts) + coin counting instead of the free top-up; a following task step of the same giver runs on directly;
   finish = one thanks + one star/coins line; gate steps never start indoors (re-checked right before the task); emits activity 'rq:<id>'.
   v5c WP-Q (DESIGN5 §10): RQ1's code lock, RQ2 (both), RQ3's end («Nå må vi rydde litt» – the 'back' step tidies with one task) and
   RQ5 (both) are story SLOTS across strands (F.Quest.slotItem); RQ2 / RQ3 / RQ5 lean on the kingdom's specialty formats (F.Quest.SPEC,
   SYNTHESIS §4.5: lead p 0.5 ≈ 60–70 % where they fit her level). The line follows the served format (RQ.slotLines: sayBy / fit /
   other; 'num' = rq_s_<format> «Kan du hjelpe meg med blomsterbedet?» / rq_g_tall / roy_g_hjelp; step.named: the generic «Har du
   lyst på en oppgave til?» becomes rq_s_<format>). RQ.slotPick(step, realm, actor), RQ.slotLog, RQ.specLine(format).
   Economy §2 (12.10, honest coins): the finish pays 4 per first-try A only (nothing for other answers, nothing without answers); the
   queen's top-up pays the counted coins only on a first-try right count (one more count later); q_coins is never spoken.
   Clarity §3.1 (12.10): offers are WHITE bubbles (gold = a running RQ / a delivery); no basket chip (the goal card shows the carried
   thing); RQ.goal() feeds F.Quest.goal(). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const realmOf = id => (F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null);
const today = () => F.save.day || 1;
const has = id => !!(id && F.VOX && F.VOX.has(id));
const firstModel = list => list.find(m => has(m)) || null;
function S() {
  const s = F.save.rq = F.save.rq && typeof F.save.rq === 'object' ? F.save.rq : {};
  for (const k of ['stars', 'done', 'active', 'prog', 'friend', 'signs', 'last', 'pass', 'invites', 'use']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  return s;
}
const say = (id, slots) => (F.TPL.has(id) ? F.SAY(id, slots || {}) : Promise.resolve());
const herPoint = () => (F.Quest && F.Quest.herPoint ? F.Quest.herPoint() : null);
// a royal's own voice (F.Royals.say checks the voice is declared); Kong Leo and others: their own say
function sayA(a, id, slots) {
  if (!a || !F.TPL.has(id)) return Promise.resolve();
  if (a.royal && F.Royals && F.Royals.say && !slots) return F.Royals.say(a, id);
  const t = F.TPL.all[id];
  if (!t.voices.includes(a.voice || '')) return say(id, slots);
  return a.say(id, slots || null, { still: true });
}

/* ---------------------------------------------------------- RQ templates */
const Q = {
  // v3 (DESIGN3 §7.6): RQ1 reads the gate sign = F27 (signs/doors) while the camera glances at the gate; when F27 has no item at
  // her rung → F23 (a note) with the neutral line rq_g_les. Outdoors only (gate:true, §7.7).
  RQ1: { who: 'c', name: 'Porten', steps: [
    // v5 (#10): F27 asks its own question («Hvilken dør passer …») – no extra narrator «Les skiltet!» on top of it
    { t: 'task', say: 'rq_g_porten', sayN: 'rq_n_les', formats: ['F27'], strands: ['LES'], gate: true, alt: { formats: ['F23'], say: 'rq_g_les', sayN: null }, sayBy: { F27: ['rq_g_porten', null] } },
    // P2: the gate's code lock (F14 Kodelåsen, T-SKRIV); off her level → a house-number / price-tag number task
    // v5c WP-Q: a story slot across strands (the code lock, the garden gates, the king's scrolls, the cave, the number line …) –
    // F14 keeps the chest line, every other served format the neutral number line
    { t: 'task', say: 'rq_g_kode', formats: ['F14'], strands: ['T-SKRIV'], gate: true, alt: { formats: ['F15', 'F16'], say: 'rq_g_tall', sayN: null },
      slot: 'kode', fit: ['F14'], other: 'num' }], done: { pass: true } },
  // v5 WP-X (#4): the party things are counted as party things – only formats that honour params.model (F09/F06/F08), model = PARTY
  RQ2: { who: 'q', name: 'Festen', steps: [
    { t: 'task', say: 'rq_g_fest', sayN: 'rq_n_tell', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], model: 'party',
      slot: 'fest', spec: true, fit: ['F09', 'F06', 'F08'], other: { say: 'rq_g_fest', sayN: null } },
    { t: 'task', say: 'rq_g_enda', formats: ['F11', 'F13'], strands: ['T-ORDEN', 'T-MENGDE'], slot: 'royal', spec: true, named: true }], done: { deco: true } },
  RQ3: { who: 'k', name: 'Det store rotet', steps: [
    { t: 'task', say: 'rq_g_rot', sayN: 'rq_n_lapp', formats: ['F23'], strands: ['LES'], alt: { formats: ['F27', 'F24', 'F25'], sayN: null }, noteKind: 'clue', lostWord: true },
    { t: 'obj', kind: 'note', hint: 'rq_n_inn', formats: ['F23', 'F27'], strands: ['LES'], noteKind: 'clue', lostWord: true },
    { t: 'go', kind: 'item', hint: 'rq_n_finn' },
    // v5c WP-Q: «Der var den jo! Nå må vi rydde litt.» – the mess is tidied with the kingdom's own kind of thinking (sorting, ordering,
    // its specialty); without a format at her level it stays the old «back» step (the thanks only)
    { t: 'back', say: 'rq_g_funnet', say2: 'rq_g_rydde', slot: ['F71', 'F79', 'F74'], spec: true, tidy: true }], done: { quirk: true } },
  RQ4: { who: 'c', name: 'Skiltet', steps: [
    { t: 'task', say: 'rq_g_skilt', sayN: 'rq_n_skriv', formats: ['F33', 'F35', 'F40'], strands: ['SKRIV'], sign: true },
    // P2: the old sign is missing letters (F35)
    // v5c WP-Q: … or (half of the time, when it fits her level) the kingdom's specialty with its own line (rq_s_<format>)
    { t: 'task', say: 'rq_g_skilt2', formats: ['F35'], strands: ['SKRIV'], alt: { formats: ['F33', 'F36'] },
      slot: ['F35', 'F33', 'F36'], spec: true, leadP: 0.5, fit: ['F35', 'F33', 'F36'], other: 'num' }], done: { sign: true } },
  // v5 WP-X (#10): the guards' line only for F20 Paraden (guards in a row); stepping stones / baskets get the neutral number line
  RQ5: { who: 'k', name: 'Vaktparaden', steps: [
    { t: 'task', say: 'rq_g_vakt', sayN: 'rq_n_vakter', formats: ['F20', 'F18', 'F19'], strands: ['T-ORDEN'], sayBy: { F18: ['rq_g_tall', null], F19: ['rq_g_tall', null] },
      slot: 'parade', spec: true, fit: ['F20'], other: 'num' },
    { t: 'task', say: 'rq_g_enda', formats: ['F19', 'F18', 'F20'], strands: ['T-ORDEN'], slot: 'parade', spec: true, named: true }], done: {} },
  RQ6: { who: 'q', name: 'Handleturen', steps: [
    // P2: first read the queen's shopping note (a shop word preferred); the shop step then counts that item when the word is sold there
    { t: 'task', say: 'rq_g_lapp', formats: ['F23', 'F34'], strands: ['LES'], note: true, noteKind: 'list' },
    { t: 'shop', say: 'rq_g_handle', sayN: 'rq_n_butikk' },
    { t: 'deliver', to: 'q', hint: 'rq_n_kurv' }], done: { use: true } },
  RQ7: { who: 'k', name: 'Brev til Leo', steps: [
    { t: 'talk', say: 'rq_g_brev' },
    { t: 'deliver', to: 'konge', letter: true, hint: 'rq_n_brev' },
    // v5c WP-Q: … or Kong Leo reads it aloud and she shows what happened in it (F78 listening comprehension) – «Hør godt etter!»
    { t: 'task', at: 'konge', sayN: 'rq_n_leo', formats: ['F30', 'F23'], strands: ['LES'], slot: ['F30', 'F23', 'F78'], wide: false, fit: ['F30', 'F23'], other: { say: null, sayN: 'q_brev_hor' }, noteKind: 'letter' }], done: { friend: true } },
};
const BY_WHO = { c: ['RQ4'], q: ['RQ2', 'RQ6'], k: ['RQ3', 'RQ5'] };
// the king's lost thing in RQ3 (per kingdom; the first model that exists)
const LOST = { blomst: ['vase', 'rose'], hest: ['hest', 'eple'], boble: ['såpe', 'glass'], skjell: ['skjell', 'perle'], kake: ['kake', 'skje'],
  musikk: ['fløyte', 'bjelle', 'tromme'], stjerne: ['lykt', 'krone'], sno: ['vott', 'lue'], krystall: ['krone', 'ring'], regnbue: ['pensel', 'blomst'] };

const RQ = F.RQuest = { real: true, defs: Q, BY_WHO };
// v5r fix1 (review #2, logic audit #9): the kind of note a step's F23 reads (step.noteKind; none = a wish, handed to the reader).
// RQ3's clue names the king's lost thing (step.lostWord → ctx.good = the realm's lost model, which F23 retargets to when it can)
function noteCtx(step, id) {
  const o = {}; if (!step || !step.noteKind) return o;
  o.noteKind = step.noteKind;
  if (step.lostWord && LOST[id]) { const w = firstModel(LOST[id]); if (w) o.good = w; }
  return o;
}
RQ.noteCtx = noteCtx;
// v3 (DESIGN3 §7.2): busy per kingdom (a running chain in one kingdom never blocks another kingdom's royals). RQ.busy stays readable
// (true while any kingdom is busy); setting RQ.busy = false clears all (old callers / tests).
const busyMap = {};
const setBusy = (id, v) => { if (v) busyMap[id] = F.T.now; else delete busyMap[id]; };
const busyFor = id => busyMap[id] != null;
RQ.busyFor = busyFor;
Object.defineProperty(RQ, 'busy', { get: () => Object.keys(busyMap).length > 0, set: v => { if (!v) for (const k in busyMap) delete busyMap[k]; }, enumerable: true });
const royal = (id, who) => (F.Royals && F.Royals.actor ? F.Royals.actor(id, who) : null);
const leo = () => (F.Act && F.Act.byId ? F.Act.byId('konge') : null);
const stepOf = id => { const s = S(), q = s.active[id]; if (!q || !Q[q]) return null; const p = s.prog[id] || (s.prog[id] = { step: 0 }); return Q[q].steps[p.step] || null; };
const stepActor = (id, step) => { if (!step) return null; const w = step.t === 'deliver' ? step.to : step.at || Q[S().active[id]].who; return w === 'konge' ? leo() : royal(id, w); };
function touch(id) { const s = S(); s.focus = id; s.focusT = Date.now(); }

/* ---------------------------------------------------------- public state */
RQ.stars = id => S().stars[id] || 0;
RQ.friend = id => !!(F.save.rq && F.save.rq.friend && F.save.rq.friend[id] != null);
RQ.pass = id => !!(S().pass[id] != null || S().friend[id] != null);
RQ.status = id => { const s = S(); return { stars: s.stars[id] || 0, friend: s.friend[id] != null, active: s.active[id] || null, step: s.prog[id] ? s.prog[id].step : null, done: Object.assign({}, s.done[id] || {}), sign: s.signs[id] || null }; };
RQ.carry = () => {
  const s = S();
  for (const id in s.active) {
    const st = stepOf(id); if (!st || st.t !== 'deliver') continue;
    const p = s.prog[id], c = p.item && F.CAT && F.CAT.byId ? F.CAT.byId(p.item) : null;
    return { realm: id, to: st.to, model: st.letter ? firstModel(['brev', 'life_konvolutt']) : (c ? F.CAT.mid(c.id) : firstModel(['life_gaveeske'])), item: p.item || null, letter: !!st.letter };
  }
  return null;
};

/* ---------------------------------------------------------- what a royal offers now */
function offerFor(id, who) {
  const s = S(), done = s.done[id] || {};
  if (!realmOf(id) || s.active[id]) return null;
  if (s.friend[id] == null) {
    if (done.RQ1 == null) return who === 'c' ? 'RQ1' : null;
    if ((s.stars[id] || 0) >= 3) return who === 'k' ? 'RQ7' : null;
    const order = U.shuffle(U.rng(U.hashStr('rq|' + id + '|' + who)), (BY_WHO[who] || []).slice());
    return order.find(q => done[q] == null) || null;
  }
  if (s.last[id] === today()) return null;                       // after Vennskap: at most one a day per kingdom
  const list = (BY_WHO[who] || []).slice().sort((a, b) => (done[a] || 0) - (done[b] || 0));
  return list[0] || null;
}
RQ.offerFor = offerFor;
// v3: does this royal hold something for her now (an offer or the active step)? (F.Royals calls her, §7.3)
RQ.mine = function (id, who) {
  const s = S(), qid = s.active[id];
  if (!qid) return !!offerFor(id, who);
  const st = stepOf(id); if (!st) return false;
  if (st.t === 'deliver') return st.to === who;
  return (st.t === 'task' || st.t === 'talk' || st.t === 'back' || st.t === 'shop') && !st.at && Q[qid].who === who;
};
// v3: who in the family holds the next step → {who, qid, kind:'active'|'offer', step} | null (other royals point her there)
RQ.holder = function (id) {
  const s = S(), qid = s.active[id];
  if (qid) { const st = stepOf(id); if (!st) return null; const who = st.t === 'deliver' ? st.to : st.at || Q[qid].who; return { who, qid, kind: 'active', step: st }; }
  for (const who of ['c', 'q', 'k']) { const o = offerFor(id, who); if (o) return { who, qid: o, kind: 'offer', step: Q[o].steps[0] }; }
  return null;
};

/* ---------------------------------------------------------- tap routing: F.Royals.press → F.RQuest.offer(actor) */
RQ.offer = function (a) {
  if (!a || !a.royal || !realmOf(a.royal)) return null;
  const id = a.royal, s = S();
  if (busyFor(id)) return 'wait';                       // v3: the royal queues the tap (F.Royals.press) instead of ignoring it
  const q = s.active[id];
  if (q) {
    const st = stepOf(id);
    if (!st) return null;
    if (st.t === 'deliver' && st.to === a.who) return deliver(id, a).then(() => true);
    if ((st.t === 'task' || st.t === 'talk' || st.t === 'back') && !st.at && Q[q].who === a.who) return runStep(id, a).then(() => true);
    // the giver reminds her in his/her own voice (v3: every tap answers in the person's voice – the quest's own ask line), then the
    // narrator says where to go (the shop, the note in the castle, the lost thing, the letter for Kong Leo)
    const cur = (s.prog[id] || {}).step || 0;
    const remind = st.t === 'shop' ? st.say : (Q[q].steps.slice(0, cur + 1).reverse().find(x => x.say && !x.note) || {}).say;
    if (st.t === 'shop' && Q[q].who === a.who) return (async () => {
      a.facePlayer(); a.gesture('wave', 1.2);
      // economy §2: a miscounted top-up gets ONE more count (new coins) when she comes back short – never a free top-up
      if (F.Eco && F.Eco.coins && F.Eco.coins() < 20 && ((s.prog[id] || {}).coinTry || 0) < 2 && !busyFor(id) && !F.Task.current) { setBusy(id, true); try { await coinsCheck(id, a); } finally { setBusy(id, false); } return true; }
      if (remind) await sayA(a, remind); await say('rq_n_butikk'); return true; })();
    if (st.hint && Q[q].who === a.who) return (async () => { a.facePlayer(); a.gesture('wave', 1.2); if (remind) await sayA(a, remind); await say(hintOf(id, st)); return true; })();
    return null;
  }
  const o = offerFor(id, a.who);
  if (!o) return null;
  return start(id, o, a).then(() => true);
};

/* ---------------------------------------------------------- runtime */
async function start(id, qid, a, o) {
  o = o || {};
  const s = S(); if (!Q[qid] || s.active[id]) return false;
  s.active[id] = qid; s.prog[id] = { step: 0, outcomes: [] }; touch(id); F.store();
  F.emit('rqStart', qid, id);
  F.Quest && F.Quest.log && F.Quest.log('rqStart', { id: qid, realm: id });
  setup(id);
  const g = a || royal(id, Q[qid].who);
  if (g && !o.idle) await runStep(id, g);
  return true;
}
RQ.start = (id, qid) => start(id, qid, null, { idle: true });
async function runStep(id, a) {
  const s = S(), qid = s.active[id], d = Q[qid]; if (!d) return;
  const p = s.prog[id], step = d.steps[p.step]; if (!step) return finish(id);
  if (busyFor(id) || F.Task.current) return;
  if (!sameSpace(a)) return;
  if (step.gate && F.Space.cur !== 'out') return;                       // §7.7: never an outdoor-gate task indoors
  setBusy(id, true);
  const wasBusy = a.busy; a.busy = true;
  let cont = false;
  if (step.t === 'task') activity(id, true);
  // (the body is its own function: a 'return' inside it must not skip the chain continuation below the try/finally)
  try { await (async () => {
    a.facePlayer(); clearWish(a);
    if ((step.t === 'talk' || step.t === 'back') && !step.tidy) { if (step.say) await sayA(a, step.say); await advance(id); return; }
    if (step.t === 'back') {     // v5c WP-Q: RQ3 «Der var den jo! Nå må vi rydde litt.» → one task from the tidy slot (kingdom specialty first)
      if (step.say) await sayA(a, step.say);
      const it = slotPick(step, id, a);
      if (it && sameSpace(a) && !F.Task.current) {
        // sorting / ordering IS tidying («Nå må vi rydde litt.»); another specialty format gets its own line («… med bollene?»)
        const l2 = ['F71', 'F79'].includes(it.format) ? step.say2 : specLine(it.format) || 'roy_g_hjelp';
        if (l2) await sayA(a, l2);
        const res = await F.Task.run(it, { npc: a, thing: a.th, quest: qid, rq: id });
        if (res && !res.aborted) { p.outcomes = (p.outcomes || []).concat(res.outcome || 'A'); F.store(); }
        else if (res && res.aborted) return;
      }
      await advance(id); return;
    }
    if (step.t === 'shop') {
      if (step.say) await sayA(a, step.say);
      if (F.Eco && F.Eco.coins && F.Eco.coins() < 20) await coinsCheck(id, a);
      if (step.sayN) await say(step.sayN);
      return;
    }
    if (step.t !== 'task') return;
    // v3 (§7.6): pick the item first, so the giver's line matches the task (F27 sign → «skiltet på porten»; else the neutral line)
    // v5 WP-X (#10, logic §3-C): an item outside the step's formats counts as «no item» (the alt or a neutral path) – the line always
    // belongs to the format that is really served; step.sayBy[format] = [giver line, narrator line] overrides per format
    const inStep = (it, fm) => it && (fm || []).includes(it.format) ? it : null;
    // v5c WP-Q: a story slot (across strands, the kingdom's specialty first) – the line follows the served format (slotLines)
    let item = step.slot ? slotPick(step, id, a) : null, lines = item ? slotLines(step, item.format) : step;
    if (!item) item = inStep(pickItem(step, a, id), step.formats);
    if (step.note && !item) { await advance(id); cont = S().active[id] === qid; return; }   // no shop word fits her: straight to the shop
    if (!item || !item.slot) lines = step;
    if (item && item.slot) { /* the slot item is at her level: no alt path */ }
    else if ((!item || item.offLevel) && step.alt) {
      const al = step.alt, it2 = inStep(pickItem(Object.assign({}, step, al), a, id), al.formats);
      if (it2 && (!item || !it2.offLevel)) { item = it2; lines = { say: 'say' in al ? al.say : step.say, sayN: 'sayN' in al ? al.sayN : step.sayN }; }
    }
    if (item && step.sayBy && step.sayBy[item.format]) { const sb = step.sayBy[item.format]; lines = { say: sb[0], sayN: sb[1] }; }
    if (item && step.model === 'party' && (!item.slot || COUNT.includes(item.format))) { const m = partyModel(); if (m) item.params = Object.assign({}, item.params || {}, { model: m }); else item = null; }
    if (!item && step.model === 'party') lines = { say: lines.say, sayN: null };   // «Tell festtingene!» only when party things are counted
    const gate = step.gate && item && item.format === 'F27' ? gateSpot(id) : null;
    const look = gate && F.R && F.R.look ? F.R.look({ x: gate.x, y: 3, z: gate.z }, { ms: 2600, dist: 30, pitch: 0.5 }) : null;
    if (lines.say) await sayA(a, lines.say);
    if (lines.sayN) await say(lines.sayN);
    if (look) await Promise.race([look, F.T.sleep(2800)]);
    // §7.7 the gate-sign race: she may have walked off (into the keep) while the lines played – re-check right before the task
    const P = F.Player.pos, gs = step.gate ? (F.Realm && F.Realm.gate ? F.Realm.gate(id) : null) : null;
    const near = Math.hypot(a.x - P.x, a.z - P.z) < 14 || (gs && Math.hypot(gs.x - P.x, gs.z - P.z) < 16);
    if (!sameSpace(a) || (step.gate && F.Space.cur !== 'out') || !near || F.Task.current) return;
    const ctx = Object.assign({ npc: a, thing: a.th, place: a.role === 'mia' ? 'mia' : undefined, quest: qid, rq: id }, noteCtx(step, id));
    const res = item && F.Task.run && F.Task.resolveFormat && F.Task.resolveFormat(item.format) ? await F.Task.run(item, ctx) : await runTask(step, ctx);
    if (!res) return;
    p.outcomes = (p.outcomes || []).concat(res.outcome || 'A');
    if (step.note) {     // the shopping note: which shop item did she read? (none → any purchase counts, as before)
      const w = String((item && (item.word || item.target)) || '').toLowerCase(), c = shopRows(id).find(r => String(r.word || r.name || '').toLowerCase() === w);
      p.want = c ? c.id : null;
    }
    if (step.sign) {
      const lr = F.Task.lastResult, w = lr && lr.item && lr.item.word ? String(lr.item.word).toLowerCase() : '';
      const R = realmOf(id);
      p.word = /^[a-zæøå]{2,8}$/.test(w) ? w : (R && R.words && R.words[0]) || 'slott';
    }
    F.store();
    await advance(id);
    // v3: a following task step of the same giver runs on directly (more questions, no extra tap) unless a play break is due
    const nx = stepOf(id);
    cont = !!(S().active[id] === qid && nx && (nx.t === 'task' || nx.t === 'shop') && !nx.at && Q[qid].who === a.who && (!F.Quest || !F.Quest.canOfferTask || F.Quest.canOfferTask()));
  })(); } catch (e) { console.error('[RQuest] step', id, qid, e); }
  finally { if (!cont) setBusy(id, false); a.busy = wasBusy; if (!cont) activity(id, false); }
  // (busy stays set in the short gap, so a queued tap on another royal waits until the chain is really over)
  if (cont) { await F.T.sleep(600); setBusy(id, false); if (!F.Task.current) return runStep(id, a); activity(id, false); }
}
// WP6 pacing (§3): an RQ chain is an activity – the play break waits until it is over
const actOn = {};
function activity(id, on) { if (!!actOn[id] === !!on) return; if (on) actOn[id] = true; else delete actOn[id]; F.emit('activity', 'rq:' + id, !!on); }
// v3: «Gå inn i slottet og finn lappen!» only while she is outside the keep; inside: «Finn tingen med den gule stjernen!»
function hintOf(id, st) { return st.hint === 'rq_n_inn' && F.Bld && F.Bld.cur === 'rk_' + id ? 'rq_n_finn' : st.hint; }
function sameSpace(a) { return a.space === F.Space.cur && !(a.space === 'in' && (a.bld || null) !== ((F.Bld && F.Bld.cur) || null)); }
// the kingdom's gate (outdoors) for the RQ1 glance
function gateSpot(id) { const g = F.Realm && F.Realm.gate ? F.Realm.gate(id) : null; return g && g.x != null && Math.hypot(g.x - F.Player.pos.x, g.z - F.Player.pos.z) < 70 ? g : null; }
// one engine item for a step (strands + realm words preferred, WP7 o.prefer – ignored by an engine without it)
function pickItem(step, a, id) {
  if (!F.LEARN || !F.LEARN.next || !F.Task.resolveFormat) return null;
  const avail = (step.formats || []).filter(f => F.Task.resolveFormat(f)); if (!avail.length) return null;
  const R = realmOf(id);
  let prefer = R && R.words ? R.words.map(w => 'LES:' + w).concat(R.words.map(w => 'SKRIV:' + w)) : undefined;
  if (step.note) return noteItem(id);
  try {
    return F.LEARN.next({ formats: avail, strands: step.strands, prefer, place: undefined, npcRole: a && a.role, npc: a ? a.id : undefined, rng: F.rand, now: Date.now(),
      avoid: [], last: (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null });
  } catch (e) { console.warn('[RQuest] LEARN.next', e); return null; }
}
RQ.pickItem = pickItem;
/* v5c WP-Q: story slots for the royal quests (F.Quest.slotItem, quests.js) – RQ2–RQ6 lean on the kingdom's specialty formats
   (SYNTHESIS §4.5, F.Quest.SPEC: Blomsterslottet the flower-bed sudoku + sorting, Bobleslottet the frog stones + the number-line bridge …)
   where they serve her level (lead p = 0.5 → ≈ 60 % with the engine's own specialty picks), the rest follows the engine's mix. RQ.slotLog keeps {qid, realm, format, spec}. */
const COUNT = ['F06', 'F08', 'F09', 'F10'];
const RSLOT = {
  // a royal's «one more task?»: anything that is not tied to a place she is not at (no doors, lifts, shops, signposts)
  royal: ['F48', 'F53', 'F55', 'F56', 'F58', 'F52', 'F71', 'F74', 'F60', 'F65', 'F44', 'F47', 'F46', 'F43', 'F54', 'F79', 'F11', 'F13', 'F21', 'F42', 'F49', 'F59'],
};
RQ.RSLOT = RSLOT; RQ.slotLog = [];
const specOf = id => (F.Quest && F.Quest.SPEC && F.Quest.SPEC[id]) || [];
function slotFormats(step, id) {
  const base = Array.isArray(step.slot) ? step.slot : RSLOT[step.slot] || (F.Quest && F.Quest.SLOT && F.Quest.SLOT[step.slot]) || step.formats || [];
  const sp = step.spec ? specOf(id) : [];
  return base.concat(sp.filter(f => !base.includes(f)));
}
function slotPick(step, id, a) {
  if (!F.Quest || !F.Quest.slotItem) return null;
  const fm = slotFormats(step, id), sp = step.spec ? specOf(id) : [];
  const said = F.Quest.lineTexts ? F.Quest.lineTexts([step.say, step.say2, step.other && step.other.say].filter(x => typeof x === 'string')) : [];
  let it = null;
  try { it = F.Quest.slotItem({ formats: fm, lead: sp.length ? sp : null, leadP: step.leadP != null ? step.leadP : 0.5, model: step.model === 'party' ? partyModel() : null, wide: step.wide }, { npc: a }, { said }); } catch (e) { console.warn('[RQuest] slot', e); it = null; }
  if (it) { RQ.slotLog.push({ qid: S().active[id], realm: id, f: it.format, s: it.strand, spec: sp.includes(it.format) }); if (RQ.slotLog.length > 200) RQ.slotLog.shift(); }
  return it;
}
RQ.slotPick = slotPick;
// the lines for the served format: sayBy[format] = [giver, narrator]; step.fit = the formats the written lines describe; other formats
// get step.other ({say, sayN}) or, for other: 'num', the neutral number line for a number format and the royal's «Vil du hjelpe meg?»
// for anything else (never a line that promises guards when the frog stones come)
const NUMF = ['F18', 'F19', 'F52', 'F44', 'F47', 'F48', 'F46', 'F43', 'F42', 'F49', 'F53', 'F54', 'F11', 'F13', 'F14', 'F15', 'F16', 'F06', 'F08', 'F09', 'F10'];
const specLine = fid => (fid && F.TPL.has('rq_s_' + fid) ? 'rq_s_' + fid : null);   // «Kan du hjelpe meg med blomsterbedet?» (lines_rq.js)
RQ.specLine = specLine;
function slotLines(step, fid) {
  if (step.sayBy && step.sayBy[fid]) { const sb = step.sayBy[fid]; return { say: sb[0], sayN: sb[1] }; }
  if (!step.fit && step.named && specLine(fid)) return { say: specLine(fid), sayN: null };   // «Har du lyst på en oppgave til?» → what
  if (!step.fit || step.fit.includes(fid)) return { say: step.say, sayN: step.sayN };
  if (step.other === 'num') return { say: specLine(fid) || (NUMF.includes(fid) ? 'rq_g_tall' : 'roy_g_hjelp'), sayN: null };
  return step.other || { say: step.say, sayN: null };
}
RQ.slotLines = slotLines;
RQ.armGate = id => { (RQ._gateArm = RQ._gateArm || {})[id] = F.T.now; };
// the queen's shopping note (RQ6): a word the realm shop sells that fits her LES rung (or one below) – a forced F23 item with that
// key; null when no shop word fits (then the note step is skipped, so the note never names a thing the shop does not have)
function noteItem(id) {
  try {
    const L = ((F.LEARN.summary() || {}).strands || {}).LES || {}, r0 = L.rung || 1, B = F.BANKS;
    if (!B || !B.fits || !F.Task.resolveFormat('F23')) return null;
    for (const rr of [r0, r0 - 1]) {
      if (rr < 1) continue;
      // v5 (natural prices): the note names a thing she can pay after the queen's top-up to 20 (never the 60-coin saddle)
      const cap = Math.max(20, F.Eco && F.Eco.coins ? F.Eco.coins() : 0);
      const ws = U.shuffle(F.rand, shopRows(id).filter(c => c.price <= cap).map(c => String(c.word || '').toLowerCase()).filter(w => w && B.fits('LES', rr, 'LES:' + w)));
      for (const w of ws) {
        const it = F.LEARN.next({ formats: ['F23'], force: { strand: 'LES', rung: rr, sup: L.sup != null ? L.sup : 1, format: 'F23', key: 'LES:' + w, kind: 'normal' }, rng: F.rand, now: Date.now() });
        if (it && String(it.word || it.target || '').toLowerCase() === w) return it;
      }
    }
  } catch (e) { console.warn('[RQuest] note', e); }
  return null;
}
// RQ2 party things: the first model that exists (counted as what the queen talks about)
const PARTY = ['ballong', 'flagg', 'lykt', 'gave', 'kake'];
const partyModel = () => firstModel(PARTY.concat(PARTY.map(m => 'fx_n_' + m)));
RQ.partyModel = partyModel;
function shopRows(id) { const shop = F.Towns && F.Towns.realmShop ? F.Towns.realmShop(id) : null; return shop && F.CAT && F.CAT.ofShop ? F.CAT.ofShop(shop).filter(c => !c.dream && !c.gear) : []; }
// v3 (§7.6, replaces the free top-up): the queen gives her coins and she counts them (a T-MENGDE counting task with coins when
// the coin model exists). v5 WP-X (#11, logic §3-D): she gets EXACTLY what she counted – the counting target is the top-up to 20
// (need = 20 − her coins) when that is a counting number (10–20); with a smaller need the engine's own number (≥ need) is counted
// and given; without a counting task the need is given (no number said). RQ.lastCoins = {need, counted, added}.
const COIN_FMTS = [['F06', 1, 3], ['F08', 5, 6], ['F09', 7, 7]];
function coinItem(a, id, need) {
  const r = (F.Eco && F.Eco.strandRung ? F.Eco.strandRung('T-MENGDE') : 0) || 1;
  const fm = COIN_FMTS.filter(([f]) => F.Task.resolveFormat && F.Task.resolveFormat(f));
  if (!fm.length) return null;
  const [f, r0, r1] = fm.find(([, lo, hi]) => r >= lo && r <= hi) || fm.reduce((b, x) => Math.abs(x[1] - r) < Math.abs(b[1] - r) ? x : b, fm[0]);
  try {
    if (need >= 10 && need <= 20) {
      const it = F.LEARN.next({ formats: [f], force: { strand: 'T-MENGDE', rung: U.clamp(r, r0, r1), sup: 1, target: need, format: f, kind: r >= r0 && r <= r1 ? 'normal' : 'practice' }, rng: F.rand, now: Date.now() });
      if (it && it.format === f && it.target === need) return it;
    }
  } catch (e) { /* engine pick below */ }
  const it = pickItem({ formats: ['F06', 'F08', 'F09'], strands: ['T-MENGDE'] }, a, id);
  return it && ['F06', 'F08', 'F09'].includes(it.format) && typeof it.target === 'number' && it.target >= need ? it : null;
}
// economy §2 (honest coins): the queen hands over exactly what she counted – only on a first-try right count (A). Any other count: no
// coins, her normal thanks («Jeg teller selv, takk!» is not said: she just keeps them), and one more count with new coins on a later tap
// at the shop step (p.coinTry ≤ 2). Without a counting task at all (no coin model / nothing at her level) the queen gives her shopping
// money – nothing was guessed. RQ.lastCoins = {need, counted, added, outcome}.
async function coinsCheck(id, a) {
  const p = S().prog[id] || {};
  if ((p.coinTry || 0) >= 2 || F.Task.current) return;
  p.coinTry = (p.coinTry || 0) + 1; F.store();
  await sayA(a, 'rq_g_mynter');
  const model = ['fx_n_mynt1', 'mynt', 'gull_mynt'].find(m => F.VOX && F.VOX.has(m));   // f_num's one-coin piece
  const need = Math.max(0, 20 - F.Eco.coins());
  let counted = null, outcome = null, ran = false;
  if (model && !F.Task.current && need > 0) {
    const it = coinItem(a, id, need);
    if (it) {
      it.params = Object.assign({}, it.params || {}, { model });
      ran = true;                                   // a counting task was offered: only its A pays (an aborted one pays nothing)
      const res = await F.Task.run(it, { npc: a, thing: a.th, quest: S().active[id], rq: id });
      outcome = res ? res.outcome : null;
      if (res && res.outcome === 'A' && !res.aborted) counted = it.target;
    }
  }
  const n = ran ? (counted || 0) : need;
  RQ.lastCoins = { need, counted, added: n, outcome };
  if (n > 0) F.Eco.add(n, { from: a, reason: 'rq' });
}
RQ.coinsCheck = coinsCheck;
async function runTask(step, ctx) {
  if (F.Quest && F.Quest.task) return F.Quest.task(step.formats, ctx, { strands: step.strands });
  return F.Task.offer({ formats: step.formats, ctx });
}
async function advance(id) {
  const s = S(), qid = s.active[id], d = Q[qid], p = s.prog[id]; if (!d || !p) return;
  p.step++; touch(id); F.store();
  F.emit('rqStep', qid, id, p.step);
  F.emit('questStep', qid + ':' + id, p.step);
  removeObjs(id);
  const next = d.steps[p.step];
  if (!next) return finish(id);
  setup(id);
  if (next.hint) F.T.timeout(() => { if (S().active[id] === qid) say(hintOf(id, next)); }, 350);
}
async function finish(id) {
  const s = S(), qid = s.active[id], d = Q[qid]; if (!d) return;
  const p = s.prog[id] || {};
  delete s.active[id]; delete s.prog[id];
  (s.done[id] = s.done[id] || {})[qid] = today(); s.last[id] = today();
  let star = 0;
  if (s.friend[id] == null && qid !== 'RQ7' && (s.stars[id] || 0) < 3) { s.stars[id] = (s.stars[id] || 0) + 1; star = s.stars[id]; }
  F.store();
  removeObjs(id); basket();
  const g = qid === 'RQ7' ? leo() : royal(id, d.who), R = realmOf(id);
  try {
    if (d.done.pass) { s.pass[id] = today(); F.store(); }
    if (d.done.deco) { decorate(id); }
    if (d.done.sign && p.word) { s.signs[id] = p.word; F.store(); const old = F.Things.byId('rq_skilt_' + id); if (old) F.Things.remove(old); placeSign(id, true); }
    if (d.done.use && p.item) { s.use[id] = p.item; F.store(); }
    // v3 (§7.2): one thanks line (skipped when the giver thanked her < 3 s ago), result lines, then ONE line for star + coins
    if (g && qid !== 'RQ7') { g.facePlayer(); g.gesture('cheer', 1.6); if (!(g._takkT > F.T.now - 3)) await sayA(g, 'rq_g_takk'); }
    if (d.done.quirk && g && R && R.quirk && R.quirk.who === 'k') await sayA(g, R.quirk.lines[0]);
    if (d.done.pass) await say('rq_n_pass');
    if (d.done.deco) await say('rq_n_pynt');
    if (d.done.sign && p.word) await say('rq_n_skiltet');
    if (d.done.use && p.item) await say('rq_n_bruker');
    if (d.done.friend) await vennskap(id);
    // v5c WP-Q (standing rule «guessing never pays», DESIGN3 §11.5 like the home quests): the reward follows the answers – 4 per
    // first-try answer + 1 per other answer; a quest without tasks (old saves) keeps the old 10–20
    // economy §2 (honest coins): 4 per first-try answer only – nothing for other answers, nor for a quest without answers
    const outs = p.outcomes || [], nA = outs.filter(o => o === 'A').length;
    const n = ((F.Quest && F.Quest.PER_A) || 4) * nA;
    if (F.sfx && F.sfx.levelup) F.sfx.levelup();
    // (review #1) never from a saver; the coin trace (clarity §3.12): when no royal can pay, they rise from her, never mid-screen
    if (n > 0) F.Eco.add(n, { from: (g && F.Eco.payer ? F.Eco.payer(g, n) : null) || herPoint(), reason: 'quest' });
    if (star) {
      if (F.FX && F.FX.burst) { const P = F.Player.pos; F.FX.burst(V3(P.x, (F.Player.obj ? F.Player.obj.position.y : 0) + 2.2, P.z), { kind: 'star', n: 26, colors: [0xffe066, 0xfff2a8, 0xffffff], speed: 2, up: 3, life: 1.4, size: 0.12 }); }
      await say('rq_stjerne', { n: star });
    }                                                                     // economy §1 row 8: no «Du får N mynter!» – the coins fly
  } catch (e) { console.error('[RQuest] finish', id, qid, e); }
  F.Quest && F.Quest.log && F.Quest.log('rqDone', { id: qid, realm: id, star, A: (p.outcomes || []).filter(o => o === 'A').length });
  F.emit('rqDone', qid, id);
  setup(id);
}
RQ.finish = finish;

/* ---------------------------------------------------------- Vennskap: flag at home, the gift, Leo's line */
async function vennskap(id) {
  const s = S(), R = realmOf(id); if (!R) return;
  const fresh = s.friend[id] == null;
  s.friend[id] = today(); F.store();
  if (!fresh) return;
  F.emit('friendship', id);                                              // WP1 castle.js raises the flag (F.Castle.setFlags)
  try { if (F.Castle && F.Castle.setFlags && !F.save.castleFlags) F.Castle.setFlags(Object.keys(s.friend)); } catch (e) { console.warn('[RQuest] flags', e); }
  const L = leo();
  if (L) { L.facePlayer(); L.gesture('cheer', 2); await sayA(L, 'rq_venner', { slott: R.castle }); await sayA(L, 'rq_leo_hurra'); }
  else await say('rq_venner', { slott: R.castle });
  if (L && F.FX && F.FX.burst) { const P = V3(L.x, (L.th.obj.position.y || 0) + 2.2, L.z); for (let i = 0; i < 3; i++) F.T.timeout(() => { F.FX.burst(P, { n: 36, speed: 3.5, up: 4 }); if (F.sfx.firework) F.sfx.firework(); }, i * 380); }
  try { if (F.Castle && F.Castle.showGift) F.Castle.showGift(id); } catch (e) { console.warn('[RQuest] gift', e); }
  F.Quest && F.Quest.log && F.Quest.log('friendship', { realm: id });
}

/* ---------------------------------------------------------- deliver (RQ6 to the queen, RQ7 the letter to Kong Leo) */
async function deliver(id, a) {
  const s = S(), qid = s.active[id], st = stepOf(id); if (!st || st.t !== 'deliver' || busyFor(id)) return;
  setBusy(id, true);
  const wasBusy = a.busy; a.busy = true;
  try {
    a.facePlayer(); clearWish(a);
    if (st.letter) {
      if (F.sfx.chime) F.sfx.chime();
      await sayA(a, 'rq_leo_hei');
      const R = realmOf(id); if (R) await say('rq_leo_brev', { slott: R.castle });
      setBusy(id, false);
      await advance(id);
      const nx = stepOf(id);
      if (nx && nx.t === 'task' && nx.at === 'konge') { await F.T.sleep(300); await runStep(id, a); }
      return;
    }
    // the queen gets what she bought for her
    const p = s.prog[id] || {};
    if (F.sfx.chime) F.sfx.chime();
    if (F.Act.hearts) F.Act.hearts(a.headPos());
    useItem(a, p.item);
    await sayA(a, 'rq_g_fin');
    setBusy(id, false);
    await advance(id);
  } catch (e) { console.error('[RQuest] deliver', id, qid, e); }
  finally { setBusy(id, false); a.busy = wasBusy; }
}
RQ.deliverTo = a => { for (const id in S().active) { const st = stepOf(id); if (st && st.t === 'deliver' && stepActor(id, st) === a) return deliver(id, a); } return null; };
function useItem(a, itemId) {
  if (!a || !itemId) return;
  try {
    if (F.Act.wearable && F.Act.wearable(itemId)) { a.wear(itemId, 1, { silent: true }); return; }
    const c = F.CAT.byId(itemId), m = c ? F.CAT.mid(c.id) : null;
    if (m && has(m) && a.anchors && a.anchors.hand && F.Act.fitModel) { if (a._rqHeld && a._rqHeld.parent) a._rqHeld.parent.remove(a._rqHeld); const mm = F.Act.fitModel(m, c.opts || {}, 0.42); a.anchors.hand.add(mm); a._rqHeld = mm; }
    a.gesture('cheer', 1.6);
  } catch (e) { console.warn('[RQuest] use', itemId, e); }
}
// the queen keeps using it (re-applied when the family spawns)
F.on('royalsSpawned', id => { try { const it = S().use[id]; const q = royal(id, 'q'); if (it && q) F.T.timeout(() => useItem(q, it), 200); setup(id); placeSign(id); decorate(id, true); } catch (e) { console.error('[RQuest] spawned', e); } });

/* ---------------------------------------------------------- RQ6 shop step: a purchase in the kingdom's themed shop */
F.on('shopBuy', (shopId, itemId, realmId) => {
  const s = S();
  for (const id in s.active) {
    const st = stepOf(id); if (!st || st.t !== 'shop') continue;
    const want = F.Towns && F.Towns.realmShop ? F.Towns.realmShop(id) : null;
    if (shopId !== want && realmId !== id) continue;
    const pw = s.prog[id].want;
    if (pw && itemId !== pw && shopRows(id).some(c => c.id === pw)) { F.T.timeout(() => say('rq_n_lapp_feil'), 600); continue; }
    s.prog[id].item = itemId; F.store();
    advance(id);
    return;
  }
});

/* ---------------------------------------------------------- RQ1 starts by itself after the greeting */
F.on('royalsGreeted', id => {
  const s = S();
  if (!realmOf(id) || s.active[id] || (s.done[id] && s.done[id].RQ1 != null) || RQ.noAuto) return;
  let waited = 0;
  const go = () => {
    if (S().active[id]) return;
    // lead: let the arrival look at the castle finish first (the task camera would cover the castle) – max ~8 s
    if (F.R.cam.look && waited < 8000) { waited += 400; F.T.timeout(go, 400); return; }
    const c = royal(id, 'c');
    const can = c && !F.Task.current && !busyFor(id) && !(F.UI.isOpen && F.UI.isOpen()) && (c.space === F.Space.cur);
    start(id, 'RQ1', c, { idle: !can }).catch(e => console.error('[RQuest] RQ1', e));
  };
  F.T.timeout(go, 900);
});

/* ---------------------------------------------------------- gold bubbles on the royals (and on Kong Leo for the letter) */
function clearWish(a) { if (a && a.wish && a.wish.rq) a.clearWish(); }
// clarity R3: gold = her goal continues here (a running RQ, a delivery); an OFFER (nothing running yet) is a white bubble
function bubble(a, model, rid, gold) {
  if (!a) return;
  gold = gold !== false;
  if (a.wish && !a.wish.rq && a.wish.kind === 'quest') return;          // a home quest owns his bubble; proximity still delivers
  if (a.wish && a.wish.rq && a.wish.model === model && !!a.wish.gold === gold) return;
  a.setWish({ kind: 'quest', gold, rq: rid, model, onPress: x => RQ.deliverTo(x) || null });
}
function setup(id) {
  const s = S(), R = realmOf(id); if (!R) return;
  const qid = s.active[id], st = stepOf(id);
  for (const who of ['k', 'q', 'c']) {
    const a = royal(id, who); if (!a) continue;
    let model = null;
    if (qid && st) {
      const mine = (st.t === 'deliver' && st.to === who) || ((st.t === 'task' || st.t === 'talk' || st.t === 'back') && !st.at && Q[qid].who === who);
      if (mine) model = st.t === 'deliver' ? (RQ.carry() || {}).model : firstModel(modelFor(qid, id));
    } else if (!qid && offerFor(id, who)) model = firstModel(modelFor(offerFor(id, who), id));
    if (model) bubble(a, model, id, !!qid); else clearWish(a);
  }
  const L = leo();
  if (L) { if (qid && st && st.t === 'deliver' && st.to === 'konge') bubble(L, firstModel(['brev', 'life_konvolutt']), id); else if (L.wish && L.wish.rq === id) L.clearWish(); }
  if (st && (st.t === 'obj' || st.t === 'go')) { const th = ensureObj(id, st); if (th && F.Quest && F.Quest.mark && F.Quest.marked && F.Quest.marked() !== th && (!F.Quest.marked() || /^rq_/.test(F.Quest.marked().id || ''))) F.Quest.mark(th); }
  basket();
}
function modelFor(qid, id) {
  switch (qid) {
    case 'RQ1': return ['skilt', 'v_veiskilt', 'bok'];
    case 'RQ2': return ['p_lykt', 'lykt', 'food_bløtkake', 'kake'];
    case 'RQ3': return (LOST[id] || []).concat(['brev', 'life_konvolutt']);   // v3: the lost thing (RQ7 keeps the letter)
    case 'RQ4': return ['pensel', 'skilt', 'v_veiskilt'];                     // v3: a brush (RQ1 shows the sign)
    case 'RQ5': return ['flagg', 'c_flagg', 'tromme'];
    case 'RQ6': return ['handlelapp', 'life_handlelapp', 'life_gaveeske', 'kopp'];
    case 'RQ7': return ['brev', 'life_konvolutt'];
  }
  void id; return ['life_gaveeske'];
}
RQ.setup = setup;
let acc = 0;
F.on('tick', dt => {
  acc += dt; if (acc < 0.5) return; acc = 0;
  if (!F.booted) return;
  const s = S(), P = F.Player.pos;
  // deliver by walking up to the actor
  if (!F.Task.current && !(F.UI.isOpen && F.UI.isOpen())) {
    for (const id in s.active) {
      const st = stepOf(id); if (!st || st.t !== 'deliver' || busyFor(id)) continue;
      const a = stepActor(id, st); if (!a || a.busy || a.space !== F.Space.cur || !a.here || !a.here()) continue;
      if (Math.hypot(a.x - P.x, a.z - P.z) < 2.4) { deliver(id, a); break; }
    }
  }
  // v3 (§7.3/§7.6): «Gå til porten først! Der er det et skilt.» – after a royal said so (RQ.armGate), the pending gate step (RQ1)
  // starts when she reaches the gate (once per «Gå til porten»; walking past the gate otherwise never starts a task)
  if (RQ._gateArm && Object.keys(RQ._gateArm).length && !F.Task.current && F.Space.cur === 'out' && !(F.UI.isOpen && F.UI.isOpen()) && (!F.Quest || !F.Quest.canOfferTask || F.Quest.canOfferTask())) {
    for (const id in s.active) {
      const st = stepOf(id); if (!st || !st.gate || !RQ._gateArm[id] || busyFor(id) || (RQ._gateT && RQ._gateT[id] > F.T.now - 30)) continue;
      const g = F.Realm && F.Realm.gate ? F.Realm.gate(id) : null, a = stepActor(id, st);
      if (!g || !a || a.busy || a.space !== 'out' || Math.hypot(g.x - P.x, g.z - P.z) > 8 || (F.Royals && F.Royals.greeting && F.Royals.greeting[id])) continue;
      (RQ._gateT = RQ._gateT || {})[id] = F.T.now; delete RQ._gateArm[id];
      runStep(id, a).catch(e => console.error('[RQuest] gate', e));
      break;
    }
  }
  // the invitation journey ends at the gate
  const tr = s.travel;
  if (tr && tr.realm && F.Space.cur === 'out') {
    const g = F.Realm && F.Realm.gate ? F.Realm.gate(tr.realm) : null;
    const inside = F.Realm && F.Realm.at ? F.Realm.at(P.x, P.z) === tr.realm : false;
    if (inside || (g && Math.hypot(g.x - P.x, g.z - P.z) < 45)) { s.travel = null; F.store(); F.SAYF ? F.SAYF('rq_n_fremme') : say('rq_n_fremme'); }
  }
});
// keep bubbles in sync (royals walk in and out, home quests take Leo's bubble)
let acc2 = 0;
F.on('tick', dt => { acc2 += dt; if (acc2 < 2.5) return; acc2 = 0; if (!F.booted) return; const L = F.Royals && F.Royals.spawned ? Object.keys(F.Royals.spawned) : []; for (const id of new Set(L.concat(Object.keys(S().active)))) try { setup(id); } catch (e) { console.error('[RQuest] setup', id, e); } });
F.on('realmFound', id => { const s = S(); if (s.travel && s.travel.realm === id) { s.travel = null; F.store(); } });
// P1: which kingdom she visited today (Mia asks about it at bedtime): the family is loaded because she is there
F.on('royalsSpawned', id => { if (!F.booted || !realmOf(id)) return; const st = F.Realm && F.Realm.state ? F.Realm.state(id) : null; if (st === 'found' || st === 'friend') { S().visited = { id, day: today() }; F.store(); } });
F.on('realmFound', id => { if (realmOf(id)) { S().visited = { id, day: today() }; F.store(); } });
RQ.visitedToday = () => { const v = S().visited; return v && v.day === today() && realmOf(v.id) ? v.id : null; };

/* ---------------------------------------------------------- RQ3 things: a note in a castle room, the lost thing in the garden */
F.Things.def('rq_obj', {
  radius: 0.6, solid: false, reach: 2.0, name: null,
  build(th) {
    const d = th.data || {}, id = firstModel([d.model, 'life_gaveeske']);
    const m = id ? F.VOX.make(id, d.opts || {}) : new THREE.Group();
    const b = new THREE.Box3().setFromObject(m), sz = b.getSize(V3()); m.scale.multiplyScalar((d.width || 0.7) / Math.max(0.05, sz.x, sz.z));
    const g = new THREE.Group(); g.add(m);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.5; g.add(pick);
    return g;
  },
  tick(th, dt, t) { const m = th.obj && th.obj.children[0]; if (m) { m.position.y = 0.15 + Math.abs(Math.sin(t * 2.2)) * 0.12; m.rotation.y = t * 0.8; } },
  press(th) { return RQ.onObj(th); },
});
const objId = (id, kind) => 'rq_' + kind + '_' + id;
function ensureObj(id, st) {
  const key = objId(id, st.kind);
  let th = F.Things.byId(key);
  if (th) { RQ.objT = th; return th; }
  const R = realmOf(id); if (!R) return null;
  const data = { realm: id, kind: st.kind, model: st.kind === 'note' ? firstModel(['brev', 'life_konvolutt']) : firstModel(LOST[id] || ['krone']), width: st.kind === 'note' ? 0.6 : 0.7 };
  // the note: inside the castle (a room other than the hall) when the royal plan can be used; else the garden
  if (st.kind === 'note' && F.Bld && F.Bld.spawnIn && F.Realm && F.Realm.plan) {
    try {
      const plan = F.Realm.register ? F.Realm.register(id) : F.Realm.plan(id);
      const cells = plan && plan.cells ? plan.cells.filter(c => c.key !== 'inngang') : [];
      if (cells.length) {
        const r = U.rng(U.hashStr('rq3|' + id)), c = U.pick(r, cells);
        th = F.Bld.spawnIn(plan.id, c.key, 'rq_obj', 3.5 + r() * 7, 3.6 + r() * 2.6, { id: key, data });
      }
    } catch (e) { console.warn('[RQuest] note inside', e); th = null; }
  }
  if (!th) {
    const sp = F.Realm && F.Realm.spot ? F.Realm.spot(id, st.kind === 'note' ? 'market' : 'garden') : null;
    if (!sp || sp.x == null) return null;
    const r = U.rng(U.hashStr('rq3o|' + id + st.kind)), ang = r() * Math.PI * 2;
    const fs = F.Act.freeSpot ? F.Act.freeSpot(sp.x + Math.cos(ang) * 3.5, sp.z + Math.sin(ang) * 3.5, 'out') : { x: sp.x + 3, z: sp.z };
    th = F.Things.spawn('rq_obj', fs.x, fs.z, { id: key, space: 'out', data });
  }
  if (th && F.FX && F.FX.sparkle) F.FX.sparkle(V3(th.x, (th.y || 0) + 0.6, th.z), 0xffe27a);
  return th;
}
function removeObjs(id, all) {
  const st = all ? null : stepOf(id);
  for (const k of ['note', 'item']) {
    if (st && (st.t === 'obj' || st.t === 'go') && st.kind === k) continue;
    const th = F.Things.byId(objId(id, k));
    if (th && F.Quest && F.Quest.marked && F.Quest.marked() === th) F.Quest.mark(null);
    if (th) { if (F.FX && F.FX.burst) F.FX.burst(V3(th.x, (th.y || 0) + 0.5, th.z), { n: 16 }); F.Things.remove(th); }
  }
}
RQ.onObj = async function (th) {
  const d = th && th.data || {}, id = d.realm, st = stepOf(id);
  if (!st || (st.t !== 'obj' && st.t !== 'go') || st.kind !== d.kind) { if (th && th.obj) F.FX.pop(th.obj); if (F.sfx.boing) F.sfx.boing(); return; }
  if (busyFor(id) || F.Task.current) return;
  setBusy(id, true);
  try {
    th.reactedVisibly = true; F.FX.pop(th.obj);
    if (st.t === 'go') { if (F.sfx.chime) F.sfx.chime(); F.FX.burst(V3(th.x, (th.y || 0) + 0.8, th.z), { n: 22 }); await F.T.sleep(400); setBusy(id, false); await advance(id); return; }
    const res = await runTask(st, Object.assign({ thing: th, quest: S().active[id], rq: id }, noteCtx(st, id)));
    if (res) { const p = S().prog[id]; p.outcomes = (p.outcomes || []).concat(res.outcome || 'A'); setBusy(id, false); await advance(id); }
  } catch (e) { console.error('[RQuest] obj', id, e); }
  finally { setBusy(id, false); }
};

/* ---------------------------------------------------------- visible results that persist: the sign (RQ4), market garlands (RQ2) */
F.VOX.has('rq_skilt') || F.VOX.def('rq_skilt', { size: [24, 26, 4], scale: 1 / 16, build(v, o) {
  v.box(10, 0, 1, 13, 13, 2, 'woodDark');
  v.box(0, 13, 0, 23, 25, 3, o.c || 'woodLight'); v.box(0, 13, 0, 23, 13, 3, 'wood'); v.box(0, 25, 0, 23, 25, 3, 'wood');
  v.box(1, 14, 3, 22, 24, 3, 'cream');
}, meta: { group: 'rq' } });
F.VOX.has('rq_girlander') || F.VOX.def('rq_girlander', { size: [64, 40, 4], scale: 1 / 16, build(v) {
  const C = ['pink', 'butter', 'sky', 'mint', 'lavender', 'peach'];
  v.box(0, 0, 1, 1, 39, 2, 'woodDark'); v.box(62, 0, 1, 63, 39, 2, 'woodDark');
  for (let x = 2; x < 62; x++) { const y = 36 - Math.round(Math.sin((x - 2) / 60 * Math.PI) * 8); v.set(x, y, 1, 'white');
    if (x % 6 === 3) { const c = C[(x / 6 | 0) % C.length]; for (let k = 1; k <= 4; k++) for (let w = -2 + (k >> 1); w <= 2 - (k >> 1); w++) v.set(x + w, y - k, 1, c); } }
  for (const x of [14, 32, 50]) { const y = 36 - Math.round(Math.sin((x - 2) / 60 * Math.PI) * 8); v.box(x - 1, y - 9, 0, x + 1, y - 6, 3, 'gold'); v.box(x, y - 5, 1, x, y - 1, 2, 'woodDark'); }
}, meta: { group: 'rq' } });
F.Things.def('rq_skilt', {
  radius: 0.5, solid: true, reach: 2.4, name: 'skiltet', hoverable: true,
  build(th) { const g = new THREE.Group(); const R = realmOf(th.data.realm) || {}; const m = F.VOX.make('rq_skilt', { c: (R.pal && R.pal.trim) || 'woodLight' }); m.scale.setScalar(1.6); g.add(m); return g; },
  init(th) {
    const a = new THREE.Object3D(); a.position.set(0, 1.95, 0.25); th.obj.add(a); th.plaque = F.UI.label(a, th.data.word, { kind: 'word', maxDist: 30 });
    // v3 (DESIGN3 §1.2, WP5 §9.1): her own word is read by her first – 1st tap sounds it out by unit, the 2nd says the whole word
    if (F.UI.tryRead && th.plaque) try { th.tr = F.UI.tryRead(th.plaque, th.data.word, { tpl: 'rw_word', slots: { w: th.data.word } }); } catch (e) { console.warn('[RQuest] tryRead', e); th.tr = null; }
  },
  dispose(th) { if (th.tr && th.tr.remove) th.tr.remove(); if (th.plaque) th.plaque.remove(); },
  async press(th) {
    th.reactedVisibly = true; F.FX.pop(th.obj);
    if (th.tr && th.tr.press) { await th.tr.press(); return; }
    if (F.Speech && F.Speech.clearQueue) F.Speech.clearQueue(); if (F.TPL.has('rw_word') && F.SETS.get && F.TPL.validate('rw_word', { w: th.data.word }, '') == null) await F.SAY('rw_word', { w: th.data.word }); else if (F.sfx.chime) F.sfx.chime();
  },
});
function placeSign(id, fresh) {
  const w = S().signs[id]; if (!w || !F.Realm || !F.Realm.spot) return null;
  const key = 'rq_skilt_' + id; if (F.Things.byId(key)) return F.Things.byId(key);
  // beside the castle gate (WP3's signpost with the place names stands at spot 'sign'; ours must not cover it)
  const sp = F.Realm.spot(id, 'gate') || F.Realm.spot(id, 'sign'); if (!sp || sp.x == null || (sp.space && sp.space !== 'out')) return null;
  const sg = F.Realm.spot(id, 'sign');
  let px = sp.x - 5, pz = sp.z + 1.5;
  if (sg && sg.x != null && Math.hypot(sg.x - px, sg.z - pz) < 4) px = sp.x + 5;
  const fs = F.Act.freeSpot ? F.Act.freeSpot(px, pz, 'out') : { x: px, z: pz };
  const th = F.Things.spawn('rq_skilt', fs.x, fs.z, { id: key, space: 'out', data: { realm: id, word: w } });
  if (th && fresh && F.FX) { F.FX.burst(V3(th.x, (th.y || 0) + 1.6, th.z), { n: 30 }); if (F.sfx.magic) F.sfx.magic(); }
  return th;
}
F.Things.def('rq_pynt', {
  radius: 0.4, solid: false, reach: 2.4, name: null,
  build(th) { const g = new THREE.Group(); const m = F.VOX.make(th.data.model || 'rq_girlander', {}); m.scale.setScalar(th.data.s || 1.4); g.add(m); return g; },
  press(th) { th.reactedVisibly = true; F.FX.pop(th.obj); if (F.sfx.pop) F.sfx.pop(); F.FX.burst(V3(th.x, (th.y || 0) + 2, th.z), { n: 14 }); },
});
function decorate(id, quiet) {
  const done = S().done[id] || {}; if (done.RQ2 == null || !F.Realm || !F.Realm.spot) return;
  const sp = F.Realm.spot(id, 'market'); if (!sp || sp.x == null) return;
  [[-4.5, -2.5, 'rq_girlander', 1.4], [4.5, -2.5, 'rq_girlander', 1.4], [-6.5, 2.5, 'p_lykt', 1], [6.5, 2.5, 'p_lykt', 1]].forEach(([dx, dz, m, s], i) => {
    const key = 'rq_pynt_' + id + '_' + i; if (F.Things.byId(key) || !has(m)) return;
    const th = F.Things.spawn('rq_pynt', sp.x + dx, sp.z + dz, { id: key, space: 'out', ry: 0, data: { realm: id, model: m, s } });
    if (th && !quiet && F.FX) F.FX.sparkle(V3(th.x, (th.y || 0) + 1.5, th.z), 0xffe27a);
  });
}
F.on('realmUnloaded', id => {
  removeObjs(id, true);
  for (const th of F.Things.list.filter(t => (t.type === 'rq_skilt' || t.type === 'rq_pynt') && t.data && t.data.realm === id)) F.Things.remove(th);
});

/* ---------------------------------------------------------- the basket: what she carries for a deliver step
   clarity §3.1-8: the HUD basket chip is gone – the goal card's 'deliver' state shows the carried thing (F.Quest.goal → RQ.goal). An
   old chip element (a page that ran the previous build) is removed. */
function basket() { const el = document.querySelector('.rq-basket'); if (el) el.remove(); }
RQ.basket = basket;

/* ---------------------------------------------------------- invitation (envelope) → travel to the kingdom */
F.on('realmAppeared', id => { const s = S(); if (!s.invites[id]) { s.invites[id] = { day: today() }; F.store(); } });
// the next morning's invitation (quests.js asks while laying out the post)
RQ.pendingInvite = function () {
  const s = S(), d = today();
  const list = Object.keys(s.invites).filter(id => { const v = s.invites[id]; return v && v.day < d && !v.sent && realmOf(id); });
  list.sort((a, b) => (realmOf(a).k || 0) - (realmOf(b).k || 0));
  return list[0] || null;
};
RQ.markInvite = id => { const s = S(); if (s.invites[id]) { s.invites[id].sent = today(); F.store(); } };
RQ.invite = function (id) {
  const s = S(), st = F.Realm && F.Realm.state ? F.Realm.state(id) : null;
  if (!realmOf(id) || st === 'found' || st === 'friend') return false;
  s.travel = { realm: id, day: today() }; s.focus = null; s.focusT = Date.now(); F.store();
  return true;
};

/* ---------------------------------------------------------- the royal goal for the clarity goal card (F.Quest.goal merges it)
   {id: 'RQn:<realm>', giver, face: null, model, state: go|thing|deliver|back|travel, realm} – the picture is what the step is about
   (a delivery: the carried thing; the lost thing / the note: its model; otherwise the royal's quest picture) */
RQ.goal = function () {
  const s = S(), ids = Object.keys(s.active);
  const id = s.focus && s.active[s.focus] ? s.focus : ids[0];
  if (!id) { if (s.travel && s.travel.realm) return { id: 'inv:' + s.travel.realm, giver: null, face: null, model: firstModel(['life_konvolutt', 'brev']), state: 'travel', realm: s.travel.realm }; return null; }
  const qid = s.active[id], st = stepOf(id); if (!st) return null;
  let state = 'go', model = firstModel(modelFor(qid, id));
  if (st.t === 'deliver') { state = 'deliver'; model = (RQ.carry() || {}).model || model; }
  else if (st.t === 'obj' || st.t === 'go') { state = 'thing'; model = st.kind === 'note' ? firstModel(['brev', 'life_konvolutt']) : firstModel(LOST[id] || ['krone']) || model; }
  else if (st.t === 'back') state = 'back';
  const a = stepActor(id, st);
  return { id: qid + ':' + id, giver: a ? a.id : null, face: null, model, state, realm: id, rq: qid };
};
/* ---------------------------------------------------------- where the active royal quest wants her (F.Quest.target merges it) */
function actorTarget(a) { return a ? { space: a.space, x: a.x, z: a.z, actor: a.id, bld: a.bld || null, room: a.room || null, realm: a.royal || null, home: !a.royal } : null; }
RQ.target = function () {
  const s = S();
  const ids = Object.keys(s.active);
  const id = s.focus && s.active[s.focus] ? s.focus : ids[0];
  if (!id) {
    if (s.travel && s.travel.realm && F.Realm && F.Realm.gate) { const g = F.Realm.gate(s.travel.realm); if (g) return { space: 'out', x: g.x, z: g.z, realm: s.travel.realm, travel: true, t: s.focusT || 0 }; }
    return null;
  }
  const qid = s.active[id], st = stepOf(id); if (!st) return null;
  let t = null;
  if (st.t === 'obj' || st.t === 'go') { const th = F.Things.byId(objId(id, st.kind)) || ensureObj(id, st); if (th) t = { space: th.space, x: th.x, z: th.z, thing: th.id, bld: th.bld || null, realm: id }; }
  else if (st.t === 'shop') { const sp = F.Realm && F.Realm.spot ? F.Realm.spot(id, 'stall0') : null; if (sp && sp.x != null) t = { space: 'out', x: sp.x, z: sp.z, realm: id, shop: F.Towns && F.Towns.realmShop ? F.Towns.realmShop(id) : null }; }
  else {
    const a = stepActor(id, st);
    if (a) t = actorTarget(a);
    else if (st.to === 'konge' || st.at === 'konge') t = null;
    else {   // the family is not loaded (she is far away): the kingdom's gate
      const g = F.Realm && F.Realm.gate ? F.Realm.gate(id) : null;
      if (g) t = { space: 'out', x: g.x, z: g.z, realm: id };
    }
  }
  if (!t) return null;
  // indoors in a royal keep: WP10's trail can route via the keep door
  if (t.space === 'in' && t.realm && F.Realm && F.Realm.door) { const d = F.Realm.door(t.realm); if (d) t.door = { x: d.x, z: d.z }; }
  return Object.assign(t, { rq: qid, step: s.prog[id].step, t: s.focusT || 0 });
};

/* ---------------------------------------------------------- debug / tests */
F.on('ready', () => {
  F.dbg = F.dbg || {};
  F.dbg.rq = () => JSON.parse(JSON.stringify(S()));
  F.dbg.rqReset = id => { const s = S(); for (const k of ['stars', 'done', 'active', 'prog', 'friend', 'signs', 'last', 'pass', 'invites', 'use']) delete s[k][id]; removeObjs(id, true); F.store(); return true; };
  // drive one RQ headless: F.dbg.questRun('RQ3', 'blomst', 'A'|'C') → {ok, steps:[{step, t, target}], outcomes, status}
  F.dbg.questRun = async function (qid, id, mode, o) {
    o = o || {}; mode = mode || 'A';
    const s = S(), out = { qid, realm: id, steps: [], outcomes: [], ok: false, bad: [] };
    if (!Q[qid] || !realmOf(id)) { out.bad.push('unknown'); return out; }
    const step = n => F.dbg.stepA(n);
    RQ.noAuto = true;
    try {
      if (F.Task.current && F.dbg.abortTask) await F.dbg.abortTask();
      F.UI.closeAll && F.UI.closeAll();
      if (F.Tower && F.Tower.hop && F.Tower.inside && F.Tower.inside()) await step(2);   // let a morning wake-up in the tower settle first
      // she stands at the kingdom; it is awake and found; the family is there
      const rs = F.Realm && F.Realm.save ? F.Realm.save() : null;
      if (rs) { rs.appeared[id] = rs.appeared[id] || today(); rs.found[id] = rs.found[id] || today(); }
      if (!o.stay && F.dbg.realmGo) F.dbg.realmGo(id);
      for (let i = 0; i < 40 && !royal(id, 'k'); i++) await step(0.25);
      if (!royal(id, 'k') && F.Royals && F.Royals.spawn) F.Royals.spawn(id);
      // v3: a chain of the previous run may still be finishing (C mode is long): let it end first
      for (let i = 0; i < 160 && (busyFor(id) || F.Task.current); i++) { if (F.Task.current) { await F.dbg.answer(true); await F.dbg.finishTask(40); } await step(0.25); }
      // prerequisites
      delete s.active[id]; delete s.prog[id]; removeObjs(id, true);
      s.done[id] = s.done[id] || {};
      if (qid !== 'RQ1' && s.done[id].RQ1 == null) { s.done[id].RQ1 = today(); s.stars[id] = Math.max(1, s.stars[id] || 0); }
      if (qid === 'RQ7') s.stars[id] = Math.max(3, s.stars[id] || 0);
      if (s.friend[id] != null) s.last[id] = -1;
      F.store();
      const coins0 = F.Eco.coins();
      await start(id, qid, null, { idle: true });
      const drive = async (p) => {
        let fin = false; Promise.resolve(p).then(() => { fin = true; }, () => { fin = true; });
        for (let i = 0; i < 600 && !fin; i++) {
          await step(0.2);
          if (F.Task.current) {
            if (mode === 'C') {   // two wrong answers → the solution is shown (outcome C) → she carries out the shown solution
              for (let k = 0; k < 2 && F.Task.current; k++) { const ts = F.dbg.task ? F.dbg.task() : null; if (!ts || ts.solShown || ts.solved) break; await F.dbg.answer(false); await step(1.6); }
              for (let k = 0; k < 3 && F.Task.current; k++) { const ts = F.dbg.task ? F.dbg.task() : null; if (!ts || ts.solved) break; await F.dbg.answer(true); await step(0.8); }
            }
            else await F.dbg.answer(true);
            await F.dbg.finishTask(40);
          }
        }
        return fin;
      };
      // stand next to an actor or thing (enter / leave buildings like she would)
      const goNear = async (o2) => {
        if (!o2) return;
        const sp = o2.space || 'out', bld = o2.bld || null;
        if (sp === 'in' && bld && F.Bld && F.Bld.enter) {
          if (F.Bld.cur !== bld) {
            if (F.Bld.cur && F.Bld.exitNow) F.Bld.exitNow();
            let fin = false; Promise.resolve(F.Bld.enter(bld, { at: { f: o2.f || o2.floor || 0, x: o2.x, z: o2.z + 1.4 }, dip: false, snap: true })).then(() => { fin = true; }, () => { fin = true; });
            for (let i = 0; i < 60 && !fin; i++) await step(0.1);
          }
          F.Player.teleport(o2.x, o2.z + 1.4);
        } else if (sp === 'out') {
          if (F.Space.cur !== 'out' || Math.hypot(F.Player.pos.x - o2.x, F.Player.pos.z - o2.z) > 3) F.dbg.teleport(o2.x, o2.z + 1.8);
        }
        await step(0.4);
      };
      for (let guard = 0; guard < 8 && S().active[id] === qid; guard++) {
        const st = stepOf(id), n = S().prog[id].step;
        const tg = RQ.target(), FT = F.Quest && F.Quest.target ? F.Quest.target() : null;
        const okT = !!(tg && tg.x != null && tg.z != null && FT && FT.x != null);
        out.steps.push({ step: n, t: st.t, target: tg ? { space: tg.space, x: +tg.x.toFixed(1), z: +tg.z.toFixed(1), actor: tg.actor || null, thing: tg.thing || null, realm: tg.realm || null, far: !!(FT && FT.far) } : null });
        if (!okT) out.bad.push('target@' + n);
        let p = null;
        if (st.t === 'obj' || st.t === 'go') { const th = F.Things.byId(objId(id, st.kind)) || ensureObj(id, st); if (th) await goNear(th); p = th ? RQ.onObj(th) : null; }
        else if (st.t === 'shop') {
          const shop = F.Towns && F.Towns.realmShop ? F.Towns.realmShop(id) : null;
          const rows = shop && F.CAT.ofShop ? F.CAT.ofShop(shop).filter(c => !c.dream && !c.gear) : [];
          const it = (S().prog[id] && S().prog[id].want) || (rows.length ? rows[n % rows.length].id : (F.CAT[0] || {}).id);   // v3: what the note said
          const a = royal(id, Q[qid].who); if (a && !o.noTalk) { await goNear(a); await drive(RQ.offer(a)); }
          if (F.Eco.grant) try { F.Eco.grant(it); } catch (e) { /* a placed item without a plot */ }
          F.emit('shopBuy', shop, it, id); p = null; await step(0.6);
        }
        else if (st.t === 'deliver') { const a = stepActor(id, st); if (a) await goNear(a); p = a && S().prog[id] && S().prog[id].step === n ? deliver(id, a) : null; }
        else { const a = stepActor(id, st); if (a) await goNear(a); p = a ? (st.at ? runStep(id, a) : RQ.offer(a)) : null; }
        if (p) await drive(p);
        await step(0.4);
        if (S().prog[id] && S().prog[id].step === n && S().active[id] === qid) { out.bad.push('stuck@' + n + ':' + st.t); break; }
      }
      for (let i = 0; i < 160 && busyFor(id); i++) await step(0.25);
      await step(1);
      out.ok = !S().active[id] && (S().done[id] || {})[qid] === today();
      out.status = RQ.status(id); out.coins = F.Eco.coins() - coins0;
    } catch (e) { out.bad.push('crash:' + (e && e.message)); console.error('[questRun]', e); }
    finally { RQ.noAuto = false; }
    return out;
  };
});
})();
