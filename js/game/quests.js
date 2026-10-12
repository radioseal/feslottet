/* Feslottet – LIFE: quests, wishes, play rhythm, envelopes, event log, Kongeposten headlines (DESIGN §6.2–6.3, §8.5, §9.8). Owner: WP8 (was LIFE).
   F.Quest.offer(npcOrId) -> questId|null    gives the character a gold bubble for one of their quests (not done recently)
   F.Quest.start(questId, giverId?)          starts/resumes a quest (gold bubble on the giver or a gold star over the next target)
   F.Quest.canOfferTask() -> bool            play-break rule (v3 §11.1): after 8 weighted tasks (never inside an activity) unsolicited offers
                                             go quiet; her own direct press (≤1.5 s) still gets its task. Ends after 2 free presses / 20 s.
   F.Quest.inBreak() / quiet() / activityBusy()   v3: the break flag / «unsolicited offers stay quiet» / something multi-step runs
   F.Quest.startChain(actor, wish, {kind, steps}) v3 helping missions H1–H3 (instance id 'H1~<actorId>'); F.dbg.chain(id, kind, steps)
   F.Quest.smallWish(actor)                  a white wish bubble (a need or an errand) that runs one task when tapped
   F.Quest.log(type, data)                   event log (F.save.events, last 300) – used by memory lines and Kongeposten
   F.Quest.headlines(day) -> [{tplId, slots, truth, text, model}]   yesterday's news for Kongeposten (reading targets)
   F.Quest.openPaper()                       the newspaper panel (tap a headline → it is read aloud)
   F.Quest.envelopes()                       Pip brings the morning post (day 1: the king; later ≤ 2 − open goals) – on 'dayStart'
   F.Quest.target() -> {space, x, z} | null  where the active quest wants her to go (HUD «vis vei»)
   F.Quest.defs / F.Quest.state(id)          quest data;  F.dbg.quest(id) starts one;  F.dbg.questRun(id) plays it through (tests)
   Frustration guard: 3 non-A outcomes in a row → «Prøv staven!» and her favourite thing rains down; the engine gives a safe item next.
   Wave 2: Q17 «Ny nabo» (HUS on an empty village plot → saved house 'life_nyhus' with its street number (v5: the plot's number) → F40 name → new neighbour),
   Q20 «Jeg fryser!» (need «varme», many right words), Q21 «Markedsdagen» (F.Stall.market() → 5 customers → gentle fireworks).
   F.Quest.bedtimeStory() -> Promise   Mia's 3 reading items at bedtime (SHELL awaits it; resolves after the story or 4½ min).
   F.Quest.fulfil(actor, word) / needyFor(word, at) / needOf(actor) / wordFits(word, need): a free wand cast that fits an NPC's
   need near them completes the wish (thanks + 3 coins; a quest step that asked for that need advances). Listens to 'cast',
   'wishFulfilled' and 'wandGive'; emits 'wishDone'(npcId, word, need), 'newNeighbour'(name, num), 'storyDone'(n, nA).
   F.Quest.houses() – Q17 houses {hid: {num, x, z, ry, region, name, job}}  (F.save.life.houses).
   DESIGN2 (WP8, open-world update):
   - Step types travel {realm} (the kingdom gate; done on arrival / realmFound), shop {shop} (done on 'shopBuy' there),
     deliver {actor, item|letter} (gold bubble on that actor; done on tapping or reaching them). The royal quests RQ1–RQ7 live in
     quests_realm.js (F.RQuest) with the same step types.
   - F.Quest.target() merges F.RQuest.target() (whichever quest was touched last) and adds far:true + realm|home when the target is
     more than 250 m away (indoor targets count at their building's door). The HUD makes the map glow on far.
   - Bundles: tasks that share ctx.bundle (befriend 'bf:<gid>') count as ONE task toward the play break.
   - The morning post goes to the tower mailbox (F.Tower.mailbox(); WP2 tucks it in). The morning after a kingdom appeared there
     is a 4th invitation envelope (crest → F.Map.open({focus}), then the travel target). Mia's bedtime story is in the tower
     (F.Tower.miaSpot(); she walks in through the door).
   v5 WP-W (DESIGN5 §3.2, logic_audit): chains keep ONE story word + number (no setW; tell = F06/F08/F09 with the story model, tall =
   F16 with the counted number, dor = F02), the step line is chosen after the item from the served format (life_h_lapp/skilt/krukke/les/
   tallapp/pris/dor), Puff says h_to / h_siste / h_steg truthfully; need chains open with the need line and end with the need reaction;
   counting quests pass params.model; Q7 uses Mia's real coins and wish price (only while she is short; F.Quest.miaGap); Q2's rooms by id
   with the plan's real number (F.Quest.roomNum); Q2's look re-applied on reload (d.look); Q4 once per 30 days (d.every); Q16 builds a
   bridge when she wrote «bro»; needs weighted by place / weather / phase (F.Quest.needFor); item bubbles only when the wish is not
   affordable; Q17 houses take their plot's street number (F.Quest.freeHouseNum). F.Quest.stepRunning() = a step / activity runs now.
   v5c WP-Q (DESIGN5 §10, longevity_plan #2 – «the stories carry the curriculum»):
   - STORY SLOTS: quest / chain steps name a set of story-compatible formats across ALL strands (Quest.SLOT: fest, bake, egg, hage,
     spare, post, brev, bok, orden, ball, musikk, parade, gard, gjerde, taarn, marked, kode, bygg) instead of one old strand; only the
     formats that serve an active strand at her CURRENT rung stay (Quest.slotFits – a story never re-drills a passed rung), the engine
     picks among them by debt / mix / sequencing (Quest.slotItem; not her last 3 formats when another fits), the line is chosen after
     the item (step.fit = the formats the written lines describe, step.other = the generic line for the rest; chains: life_h_hjelp).
     Old saves / builds without the new formats fall back to the step's old formats + strands.
   - Kingdom specialties: Quest.SPEC (SYNTHESIS §4.5) – used by quests_realm.js (RQ2 / RQ3 / RQ5 lean on them) and royals.js.
   - Morning post: Quest.envQuest(who) applies every / when / the calendar (Q4 at most once per 30 days, Q7 only while Mia is short,
     never yesterday's quest when another fits); the card word rotates within the quest's word family at her reading rung
     (Quest.cardWord, CARD_WORDS; only words with a picture model and a clip) and becomes the quest's story word (st.vars.w).
   - Quest-unlock calendar: Quest.UNLOCK {quest: play day} – 6 kinds on day 1, the last on play day 20; Quest.unlocked(id),
     Quest.upcoming(), Quest.calOff. Bedtime story: one listening story (F78) or story-picture order (F79) may join the reading.
   Clarity P1 §3.1 (12.10, owner «quests»): the morning post brings day 1 = the king's letter only, later at most 2 − open goals
   envelopes (the givers who waited longest; an invitation takes a slot; no room → Pip does not come); a letter quest is st.letter, its
   giver asks in the letter (brev_<qid>, the giver's voice) and greets in person (step.sayL instead of the premise); gold = a goal she
   took on (offers are white); a thing step gets a gold DOM bubble with the step's picture (no 3D star); a quest ends next to its
   giver by itself (≤ 12 m at once, else the gold bubble shows ✓, 'questBack'(id, giver) fires and arriving within 3 m finishes it).
   F.Quest.goal() -> null | {id, giver, face, model, state: go|thing|deliver|back|travel|story, target, far}; event 'goalChanged'.
   Economy §2 (honest coins): a quest pays 4 per first-try answer, a helping chain 2 per first-try answer – nothing for other answers;
   q_coins is never spoken (the coins fly from the giver, or from her when the giver cannot pay). Verify 2nd round: a step done by her
   own free cast (not the retyped near-miss ghost) counts as a first-try answer; in person after a letter the giver only greets
   (q_hei) – the task asks; Quest.bubbleCompat keeps offers white and adds the ✓ chip (.lw-done) on screen until actors.js does. */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const QS = () => { const q = F.save.quests = F.save.quests || {}; q.list = q.list || {}; q.done = q.done || {}; return q; };

/* ---------------------------------------------------------- event log */
function log(type, data) {
  const ev = Object.assign({ day: F.save.day || 1, t: Math.round(F.T.now), type }, data || {});
  const L = F.save.events = F.save.events || []; L.push(ev); if (L.length > 300) L.splice(0, L.length - 300);
  F.store();
  return ev;
}

/* ---------------------------------------------------------- play rhythm: play-break rule + frustration guard
   v3 WP6 (DESIGN3 §6.3, §11.1): a SOFT break that counts work, not interactions.
   - R.tasks is weighted: a single task 1; inside a bundle (ctx.bundle) the 1st task 1 and every further task 0.5 (helping chains,
     quests, series); a befriend trial ('bf:…') counts ceil(n/2). The break is due at R.BREAK_AT (8) weighted tasks.
   - The break and the frustration party never fire inside an activity (F.Quest.activityBusy(): F.emit('activity', key, true|false),
     F.Befriend.busy, F.RQuest.busy, a helping chain / quest step whose giver is within 30 m). They are queued and re-checked when the
     activity ends ('activity' false, befriendEnd, questDone, rqDone) and every 2 s. After a befriend trial the 3-non-A party only
     runs when the trial was lost.
   - In a break only UNSOLICITED offers go quiet (wish bubbles, scheduler, spot invitations): canOfferTask() is true ≤1.5 s after
     her own press (or while she is still flying to what she tapped), unless the frustration calm window / bedtime is on.
   - The break ends after 2 free presses (taps on people count; a press that gave her a task does not) or 20 s of free play.
     Outside a break the counter still resets after a natural pause (3 free presses or 45 s free play, as before). */
const R = { tasks: 0, freePresses: 0, freeT: 0, outcomes: [], hist: [], breakSaid: false, inBreak: false, bundle: null, lastBundle: null, bundleN: 0,
  BREAK_AT: 8, END_PRESSES: 2, END_SEC: 20, RESET_PRESSES: 3, RESET_SEC: 45, DIRECT_SEC: 1.5, CALM_SEC: 15,
  breakDue: false, partyDue: false, calmUntil: -1e9, directT: -1e9, movingT: -1e9, act: {}, taskN: 0, pressTaskN: -1, breaks: 0, parties: 0, queued: 0 };
F.on('taskStart', () => { R.freeT = 0; const c = F.Task.current; R.bundle = (c && c.ctx && c.ctx.bundle) || (F.Befriend && F.Befriend.busy && F.Befriend.bundle) || null; });
F.on('taskEnd', (item, res) => {
  const b = R.bundle || (F.Befriend && F.Befriend.busy && F.Befriend.bundle) || null; R.bundle = null;
  if (res && res.aborted) return;                                   // an aborted task (bedtime, parent page) is not work
  const same = !!(b && b === R.lastBundle); R.lastBundle = b;
  R.bundleN = same ? R.bundleN + 1 : 1;
  const w = !b ? 1 : /^bf:/.test(b) ? (R.bundleN % 2 === 1 ? 1 : 0) : (R.bundleN === 1 ? 1 : 0.5);
  R.tasks += w; R.taskN++;
  R.freePresses = 0; R.freeT = 0;
  const o = (res && res.outcome) || 'A';
  R.outcomes.push(o); if (R.outcomes.length > 6) R.outcomes.shift();
  R.hist.push(o); if (R.hist.length > 6) R.hist.shift();
  if (R.tasks >= R.BREAK_AT && !R.inBreak) R.breakDue = true;
  const last3 = R.outcomes.slice(-3);
  if (last3.length === 3 && last3.every(x => x !== 'A')) { R.outcomes = []; R.partyDue = true; }
  F.T.timeout(() => recheck('party'), 2200);
  F.T.timeout(() => recheck('break'), 2600);
});
// is anything multi-step going on right now? (the break / party wait for it)
function activityBusy() {
  const now = F.T.now;
  for (const k in R.act) { if (now - R.act[k] > 300) delete R.act[k]; else return true; }   // a stale flag expires after 5 min
  if (F.Befriend && F.Befriend.busy) return true;
  if (F.RQuest && F.RQuest.busy) return true;
  return !!helpBusy();
}
// a helping chain / quest with a pending task step whose giver is near her (she is in the middle of it)
function helpBusy() {
  if (stepBusy) return true;
  const q = QS(), P = F.Player.pos, now = F.T.now;
  for (const id in q.list) {
    const st = q.list[id], d = defOf(id); if (!d || !st || st.offer) continue;   // v5r2: a bubble she did not take is no work in hand
    const t = R.touch[id]; if (t == null || now - t > 180) continue;   // not touched in the last 3 min → not «in the middle»
    const step = d.steps[st.step]; if (!step || step.t !== 'task') continue;
    const g = giverOf(id); if (!g) continue;
    if (g.space === F.Space.cur && Math.hypot(g.x - P.x, g.z - P.z) < 30) return id;
  }
  return null;
}
R.touch = {};
F.on('questStart', id => { R.touch[id] = F.T.now; });
F.on('questStep', id => { R.touch[id] = F.T.now; F.T.timeout(() => recheck('step'), 400); });
F.on('activity', (key, on) => { if (!key) return; if (on) R.act[key] = F.T.now; else { delete R.act[key]; F.T.timeout(() => recheck('activity'), 500); } });
F.on('befriendEnd', (sp, res) => { if (res && res.won) R.partyDue = false; F.T.timeout(() => recheck('befriend'), 700); });
F.on('questDone', () => F.T.timeout(() => recheck('questDone'), 900));
F.on('rqDone', () => F.T.timeout(() => recheck('rqDone'), 900));
function recheck(why) {
  if (!R.partyDue && !R.breakDue) return;
  if (F.Task.current) return;                                       // the running task's taskEnd re-checks
  if (activityBusy()) { R.queued++; return; }
  if (R.partyDue && why !== 'break') { R.partyDue = false; R.parties++; R.calmUntil = F.T.now + R.CALM_SEC; frustrationParty(); }
  if (R.breakDue && !R.inBreak && why !== 'party') {
    // natural audit §3 #24: the break is silent – unsolicited offers rest, nothing is announced («Nå kan du leke litt!» is gone)
    R.breakDue = false; R.inBreak = true; R.breakSaid = true; R.breaks++;
    F.emit('playBreak', true);
  }
}
let reAcc = 0;
F.on('tick', dt => { reAcc += dt; if (reAcc < 2) return; reAcc = 0; if (R.partyDue || R.breakDue) recheck('tick'); });
// her own presses (a thing she flew to, an animal or a hook she tapped)
F.on('press', () => { R.directT = F.T.now; R.pressTaskN = R.taskN; });
F.on('worldClick', hit => { if (hit && (hit.thing || hit.hook || hit.rec || hit.animal)) R.directT = F.T.now; });
F.on('hookPress', () => { R.directT = F.T.now; });
F.on('pressed', th => {
  if (F.Task.current) return;
  if (R.taskN !== R.pressTaskN) return;                             // the press gave her a task: that is not a free press
  void th;                                                          // taps on people count as free presses too (v3)
  R.freePresses++;
  if (R.inBreak ? R.freePresses >= R.END_PRESSES : R.freePresses >= R.RESET_PRESSES) endBreak();
});
let lastP = null;
F.on('tick', dt => {
  const P = F.Player && F.Player.pos;
  if (P) { if (lastP && Math.hypot(P.x - lastP.x, P.z - lastP.z) > 0.02) R.movingT = F.T.now; lastP = { x: P.x, z: P.z }; }
  if (F.Task.current || F.UI.isOpen()) return;
  R.freeT += dt;
  if (R.freeT >= (R.inBreak ? R.END_SEC : R.RESET_SEC)) endBreak();
});
function endBreak() { if (R.tasks === 0 && !R.inBreak) return; R.tasks = 0; R.freePresses = 0; R.freeT = 0; R.lastBundle = null; R.breakDue = false; if (R.inBreak) { R.inBreak = false; F.emit('playBreak', false); } }
// a direct press: ≤1.5 s ago, or she is still flying to what she tapped (≤8 s, moving)
function direct() {
  const now = F.T.now, dt = now - R.directT;
  if (dt <= R.DIRECT_SEC) return true;
  return dt <= 8 && R.movingT >= R.directT && now - R.movingT <= 0.6;
}
const hardStop = () => !!(F.Day && (F.Day.golden || F.Day.inBed));
async function frustrationParty() {
  if (F.Task.current) return;
  // natural audit D5: no «Prøv staven!» order – her favourite thing simply rains down (show, don't tell)
  const made = (F.save.words && F.save.words.made) || {};
  let fav = Object.keys(made).sort((a, b) => made[b] - made[a])[0];
  if (!fav || !F.VOX.has(fav)) fav = ['hjerte', 'kake', 'stjerne', 'ball', 'blomst', 'eple'].find(w => F.VOX.has(w)) || 'life_gaveeske';
  const P = F.Player.pos, scene = F.Space.scene(), objs = [];
  for (let i = 0; i < 14; i++) {
    const m = F.Act.fitModel(fav, {}, 0.45 + Math.random() * 0.2), a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3.5;
    const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r, gy = F.Space.heightAt(x, z);
    m.position.set(x, gy + 7 + Math.random() * 4, z); m.rotation.y = Math.random() * 6; scene.add(m); objs.push(m);
    const y0 = m.position.y;
    F.T.tween(900 + Math.random() * 500, k => { m.position.y = U.lerp(y0, gy, k * k); m.rotation.x = k * 3; }).then(() => { m.rotation.x = 0; F.FX.burst(m.position, { n: 6, size: 0.06 }); F.sfx.pop(); });
  }
  F.sfx.magic();
  F.T.timeout(() => objs.forEach(m => { F.FX.sparkle(m.position); m.parent && m.parent.remove(m); }), 5200);
}

/* ---------------------------------------------------------- small wishes (white bubbles) */
const NEEDS = { sulten: 'kake', tørst: 'saft', kald: 'lue', trøtt: 'seng', kjed: 'ball', fin: 'krone', sitte: 'stol', dyr: 'katt' };
const NEED_LINE = { sulten: 'life_sulten', kald: 'life_kald', trøtt: 'life_trøtt', kjed: 'life_kjedelig' };
const NEED_GEST = { kald: 'shiver', trøtt: 'yawn', sulten: 'eat', kjed: 'nod' };
// v5 WP-W (logic #36): needs fit the place, weather and time of day – cold only outdoors in the snow / wind / rain or in the evening
// (never on a sunny beach or in a warm kitchen), tired only in the evening, thirsty more in the sun. Weighted pick (r = the bubble rng).
function needFor(a, r) {
  const out = (a.space || 'out') === 'out';
  let ph = 'dag', wx = 'sol', biome = null;
  try { ph = F.Weather && F.Weather.phase ? F.Weather.phase() : 'dag'; } catch (e) { /* no weather */ }
  try { wx = out && F.Weather && F.Weather.at ? F.Weather.at({ x: a.x, z: a.z }) : 'sol'; } catch (e) { /* no weather */ }
  try { const rg = out && F.W && F.W.region ? F.W.region(a.x, a.z) : null; biome = rg && rg.biome; } catch (e) { biome = null; }
  const snow = biome === 'snohaugen', beach = biome === 'strand';
  const W = { sulten: 3, tørst: wx === 'sol' ? (beach ? 3 : 2) : 1, kald: out && (snow || wx === 'regn' || (wx === 'vind' && !beach) || ph === 'kveld') && !(beach && wx === 'sol') ? (snow ? 3 : 1.5) : 0,
    trøtt: ph === 'kveld' ? 2.5 : 0, kjed: 1.5, fin: 1, sitte: 1, dyr: 1 };
  const keys = Object.keys(NEEDS).filter(k => (W[k] || 0) > 0), tot = keys.reduce((t, k) => t + W[k], 0);
  let x = r() * tot; for (const k of keys) { x -= W[k]; if (x <= 0) return k; }
  return keys[0] || 'sulten';
}
const ROLE_MODEL = { konge: 'kake', dronning: 'rose', mia: 'ball', kokk: 'egg', tor: 'rose', per: 'brev', siv: 'bok', rolf: 'flagg',
  baker: 'bolle', bonde: 'egg', fisker: 'fisk', maler: 'pensel', musikant: 'tromme', isselger: 'is', blomsterselger: 'blomst',
  leketoysmaker: 'dukke', batmann: 'båt', fyrvokter: 'lykt', gjeter: 'sau', bestemor: 'kake', bestefar: 'bok', barn: 'ball' };
const firstModel = list => list.find(m => m && F.VOX.has(m)) || null;
function satToday() { const l = F.save.life = F.save.life || {}, day = F.save.day || 1; if (!l.sat || l.sat.day !== day) l.sat = { day, ids: {} }; return l.sat; }
const Quest = F.Quest = {
  defs: {}, R, log,
  // v3 (DESIGN3 §11.1): in a break only unsolicited offers go quiet – her own direct press still gets its task
  canOfferTask: () => !R.inBreak || (direct() && F.T.now >= R.calmUntil && !hardStop()),
  inBreak: () => R.inBreak,                                       // unsolicited offers (bubbles, scheduler, invitations) check this
  // unsolicited offers stay quiet: in the break, or when canOfferTask() says no (outside a break it is always true – tests stub it)
  quiet: () => !!(Quest.inBreak() || (Quest.canOfferTask && !Quest.canOfferTask())),
  activityBusy,                                                   // §3: the break / frustration party wait while true
  playBreakNote() { /* natural audit §3 #24: no line – a tap in the break is a normal hello (actors.js) */ },
  // natural audit D5 (#27, minimum): a character whose wish / chain / quest she finished today asks for nothing new until tomorrow
  // («Nå har jeg alt jeg trenger!» stays true). F.save.life.sat = {day, ids: {npcId: why}}.
  satisfy(id, why) { if (!id) return; const S = satToday(); S.ids[id] = why || true; F.store(); F.emit('npcSatisfied', id, why || true); },
  satisfied: id => !!(id && satToday().ids[id]),
  smallWish(a, o) {
    o = o || {};
    if (!a || a.kind === 'animal' || a.noTasks || a.owner) return null;
    const running = Quest.runningFor(a.id);
    if (running) { Quest.start(running); return a.wish; }
    if (Quest.satisfied(a.id)) return null;
    if (!o.need && a.id.startsWith('v_') && U.rng(U.hashStr(a.id + '|q|' + (F.save.day || 1)))() < 0.3 && Quest.offer(a, { fresh: true })) return a.wish;
    // staff with their own quests (Kari, Per, Siv, Rolf) sometimes offer one (royals' quests come with the morning post)
    if (!o.need && ['kokk', 'per', 'siv', 'rolf'].includes(a.id) && F.rand() < 0.4 && Quest.offer(a, { fresh: true })) return a.wish;
    const r = U.rng(U.hashStr(a.id + '|' + Math.floor(F.T.now / 30)));
    const needy = o.need || (r() < 0.4 ? needFor(a, r) : null);
    if (needy === 'kald' && unlocked('Q20') && !QS().list.Q20 && !(QS().done.Q20 || []).includes(F.save.day || 1) && r() < 0.6) { Quest.start('Q20', a.id, { offer: true }); return a.wish; }
    if (needy) {
      const w = a.setWish({ kind: 'need', need: needy, model: firstModel([NEEDS[needy], 'kake']), formats: ['F33', 'F39'], onPress: runWish });
      if (NEED_GEST[needy] === 'shiver') a.shiver = true;
      return w;
    }
    // v3 (DESIGN3 §6.4): what the task will be about decides the bubble – a number plaque for number strands, a picture otherwise
    let strand = null;
    try { const av = (a.repertoire || []).filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f)); const pk = F.LEARN && F.LEARN.peek && av.length ? F.LEARN.peek({ formats: av, place: a.job || a.role, npcRole: a.role, npc: a.id, rng: F.rand, now: Date.now() }) : null; strand = pk ? pk.strand : null; } catch (e) { strand = null; }
    // natural audit D5 (#27): no «123» plaque – the bubble shows the real want (the character's own thing), whatever the strand
    return a.setWish({ kind: 'task', strand, model: firstModel([ROLE_MODEL[a.job], ROLE_MODEL[a.role], 'brev', 'eple']), formats: a.repertoire, onPress: runWish });
  },
  // the item they are saving for (pocket-money bubble with the price)
  itemWish(a) {
    if (!a || a.kind === 'animal' || !F.Eco) return null;
    // D5: Mia saves her own money (never a pocket-money bubble); no new ask after a finished wish, nor after «Nei takk» today
    if (a.id === 'mia' || Quest.satisfied(a.id)) return null;
    try { if (F.Eco.npc(a.id).declineDay === (F.save.day || 1)) return null; } catch (e) { /* no wallet */ }
    const top = F.Eco.topWish(a.id); if (!top) return null;
    const c = F.CAT.byId(top);
    // v5 WP-W (logic #1 wallet rule): no «help me save» price bubble over someone who can already afford the wish
    try { const st = F.Eco.npc(a.id); if (c && st && (st.coins || 0) >= c.price) return null; } catch (e) { /* no wallet */ }
    return a.setWish({ kind: 'item', itemId: top, price: c ? c.price : null, onPress: x => F.Eco.talk(x, { wish: true }) });
  },
};
// v3 (DESIGN3 §6.1/§6.4): 70 % of white wishes become a helping mission (2–4 linked questions, H1–H3), 30 % stay a quick single
// wish with a frame line that matches the task's strand. Kingdom royals never get chains (WP4 has its own audiences).
const isKid = a => !!a && (a.voice === 'barn' || a.id === 'mia' || a.role === 'barn' || a.kid);
const FRAME = { LES: 'life_h_lapp', 'T-MENGDE': 'life_h_tell', SKRIV: 'life_h_skriv', 'T-NAVN': 'life_h_tall', 'T-ORDEN': 'life_h_tall', 'T-SKRIV': 'life_h_tall' };
Quest.CHAIN_P = 0.7;
// v5 WP-W: something multi-step is RUNNING right now (a step / chain in progress, an explicit 'activity'), narrower than activityBusy
// (which also counts a quest merely touched near her in the last 3 min): ambient chatter and world homes wait for this one
Quest.stepRunning = () => !!stepBusy || Object.keys(R.act).some(k => F.T.now - R.act[k] <= 300);
Quest.needFor = needFor;
async function runWish(a) {
  const w = a.wish; if (!w) return;
  a.facePlayer();
  const wantChain = w.chain != null ? !!w.chain : F.rand() < Quest.CHAIN_P;
  if (wantChain && !a.royal && F.TPL.has('life_h_lapp')) {
    // v5 WP-W (logic #3): a need chain opens with the need line (cold, hungry …) and ends with the need reaction
    if (w.kind === 'need' && !QS().list[chainKind(a, w) + '~' + a.id]) { a.gesture(NEED_GEST[w.need] || 'nod', 1.6); if (NEED_LINE[w.need]) await a.say(NEED_LINE[w.need]); }
    const id = startChain(a, w);
    if (id) { await runStep(id, a); return; }
  }
  if (w.kind === 'need') { a.gesture(NEED_GEST[w.need] || 'nod', 1.6); if (NEED_LINE[w.need]) await a.say(NEED_LINE[w.need]); }
  else a.gesture('wave', 1);
  const ctx = { npc: a, thing: a.th, place: a.job || a.role, need: w.need || null, wish: w };
  let res = null; const t0 = F.T.now;
  if (w.need) res = await Quest.task(w.formats || ['F33', 'F39'], ctx, { strands: ['SKRIV'], need: w.need });
  else {
    // the item first, so the ask line fits it (no answer in the line: frame lines have no slots)
    const item = quickItem(a, w.formats || a.repertoire, w.strand);
    if (item) {
      // v5 WP-W (logic #53): «Her er ønskelappen min» only when the note's word is the wish in the bubble; otherwise a neutral frame
      let fl = FRAME[item.strand];
      if (fl === 'life_h_lapp' && String(item.word || '').toLowerCase() !== String(w.model || '').toLowerCase() && F.TPL.has('life_h_les')) fl = 'life_h_les';
      if (fl && F.TPL.has(fl) && !a.royal) await a.say(fl); res = await F.Task.run(item, ctx); }
    else res = await F.Task.offer({ formats: w.formats || a.repertoire, ctx });
  }
  if (!res) { await a.say('life_hei'); return; }
  a.clearWish(); a.shiver = false;
  if (res.outcome && !res.aborted) Quest.satisfy(a.id, 'wish');
  // one thanks only: when the task already made her cheer (stage → react), no second reaction line (actors.say also skips a 2nd thanks ≤3 s)
  // a need wish keeps its payoff (she eats the cake, puts on the cap); a plain «cheer» is skipped when the task already cheered
  const tag = w.need === 'sulten' ? 'eat' : w.need === 'kald' ? 'warm' : w.need === 'sitte' ? 'sit' : 'cheer';
  if (res.outcome && (tag !== 'cheer' || !(a._reactT != null && a._reactT >= t0)) && !(tag === 'cheer' && a.lastReactFresh())) await a.react(tag, w.need ? NEEDS[w.need] : null);
  // the wish comes back later so the world stays alive
  F.T.timeout(() => { if (F.Act.all[a.id] && !a.wish && !a.busy) Quest.smallWish(a); }, (150 + Math.random() * 120) * 1000);
}
function quickItem(a, formats, strand) {
  const avail = (formats || []).filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f));
  if (!avail.length || !F.LEARN || !F.LEARN.next) return null;
  const recentNpc = F.Task.recent ? F.Task.recent.filter(r => r.npc === a.id).slice(-3).map(r => r.format) : [];
  const o = { formats: avail, place: a.job || a.role, npcRole: a.role, npc: a.id, rng: F.rand, now: Date.now(), avoid: recentNpc,
    last: (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null };
  try {
    // the strand the bubble promised (number plaque / picture); the engine's free pick when that strand has nothing here
    let it = strand ? F.LEARN.next(Object.assign({}, o, { strands: [strand] })) : null;
    if (!it || !F.Task.resolveFormat(it.format) || !avail.includes(it.format) && !avail.includes(String(it.format).replace(/_demo$/, ''))) it = F.LEARN.next(o);
    return it && F.Task.resolveFormat(it.format) ? it : null;
  } catch (e) { console.warn('[Quest] quickItem', e); return null; }
}

/* ---------------------------------------------------------- v5c WP-Q: STORY SLOTS – the stories carry the whole curriculum
   (longevity_plan #2, DESIGN5 §10). A story step names a SLOT: a set of story-compatible formats ACROSS strands (a baker step: count
   the buns / the ten-tray / bake / the puppet show for the guests / sort the crates) instead of one of the six old strands. Only the
   formats that serve one of her ACTIVE strands AT HER CURRENT RUNG stay in the slot (a story never re-drills a rung she has passed),
   then F.LEARN.next picks among them by its own mix (learning debt, domain shares, sequencing, thinking-type variety). The line is
   chosen AFTER the item, from the served format (logic_audit §3-C). Kingdom specialties / place formats come in as slot.lead (preferred
   with probability slot.leadP when they fit her level).
   Quest.slotFits(formats) -> {formats, strands}   the formats (and their strands) that serve her level now
   Quest.slotItem(slot, ctx, o) -> item | null      slot = {formats, lead?, leadP?, model?, word?, prefer?}; o = {said, rng, lead}
   Quest.SLOT                                        the story-compatible format sets (named, reused by quests_realm.js / royals.js)
   Quest.COUNT_FMTS                                  formats that count the story's own thing (params.model) – only these feed a
                                                     chain's story number */
const COUNT_FMTS = ['F06', 'F08', 'F09', 'F10'];
const SLOT = {
  // a feast / guests / the king's food: count the cakes, bake, the ten-tray, a puppet show for the guests, share fairly on the scale,
  // the garland pattern
  fest:    ['F09', 'F06', 'F08', 'F10', 'F48', 'F53', 'F58'],   // (review #3) no F55 apple puppet show
  // baking: buns on the ten-tray, bake, egg cartons, the scale, sort the goods
  bake:    ['F09', 'F06', 'F08', 'F10', 'F48', 'F43', 'F53', 'F71'],
  // the kitchen: eggs, cartons, bake, the tray
  egg:     ['F09', 'F08', 'F06', 'F10', 'F43', 'F53'],          // v5r fix1 (review #3): no F48 «Ferske boller!» in the egg step; the kitchen scale
  // the garden: roses, the flower bed (sudoku), the garden gates (number facts), sort the plants, a bead garland of flowers
  hage:    ['F09', 'F08', 'F06', 'F74', 'F47', 'F71', 'F58'],
  // saving coins: count coins, the coin works, bundles, the ribbon bar model (how many more?), the balance
  spare:   ['F06', 'F08', 'F11', 'F43', 'F53', 'F16', 'F54'],  // (review #3) no F56 birds-in-a-tree story; the neutral equation scrolls
  // the post: the street doors, the village fact-family house, the number-line bridge, the hundred board
  post:    ['F02', 'F49', 'F44', 'F42', 'F15', 'F18'],
  // a letter / a note read aloud: reading the note, or the story told in it (listening comprehension), the picture shelf
  brev:    ['F23', 'F27', 'F78', 'F79'],
  // the library: books, the story chair, the picture shelf, ordering, sorting the books
  bok:     ['F25', 'F23', 'F79'],                               // (review #3) F78 brings its own rabbit story
  orden:   ['F20', 'F18', 'F19', 'F79', 'F71'],
  // the ball: lights, the lantern pattern, window shapes, the puppet theatre in the ballroom
  ball:    ['F09', 'F06', 'F08', 'F58', 'F65'],                 // (review #3) no F55 apple basket at the ball
  musikk:  ['F21', 'F20', 'F58', 'F18', 'F79'],
  // the parade / the guards: line up by clues, the frog stones (step patterns), flags in a pattern, number stones
  parade:  ['F20', 'F79', 'F18', 'F19', 'F58', 'F21'],          // (review #3) F52's lost-number stones are no parade
  // the farm: count the sheep, sort the animals, the puppet theatre (sheep walked off), the fence pattern
  gard:    ['F08', 'F06', 'F09', 'F71', 'F59'],                 // (review #3) F55's apples are not the farm's sheep
  gjerde:  ['F19', 'F18', 'F59', 'F71', 'F79', 'F60'],
  // a tower: hats / blocks / the growing tower
  taarn:   ['F09', 'F08', 'F06', 'F59'],                        // (review #3) F60's block tower is no «hattetårn»
  // the market: pay, coins, the market balance, bundles, price tags
  marked:  ['F12', 'F11', 'F06', 'F09', 'F53', 'F43', 'F16'],
  // a code / a gate / the king's numbers: the code lock, the garden gates, the scrolls, the cave, the number line
  kode:    ['F14', 'F47', 'F54', 'F46', 'F44', 'F42'],
  // the building site of a future kingdom
  bygg:    ['F60', 'F59', 'F08', 'F09', 'F07', 'F43'],
};
// story-neutral formats (they bring their own little scene): the fallback when a slot's only fitting format was her last task
const WIDE = ['F53', 'F55', 'F56', 'F71', 'F58', 'F52', 'F47', 'F44', 'F60', 'F65'];
// the kingdom specialties (SYNTHESIS §4.5): RQ2–RQ6 and the royal audiences lean on these where they fit her level
const SPEC = { blomst: ['F74', 'F71'], hest: ['F79', 'F71'], boble: ['F52', 'F44'], skjell: ['F58'], kake: ['F48', 'F56'], krystall: ['F43', 'F46', 'F60'],
  sno: ['F60', 'F65'], stjerne: ['F65', 'F60'], musikk: ['F58', 'F21'], regnbue: ['F74', 'F54'] };
const fmtReal = f => { try { const r = F.Task && F.Task.resolveFormat ? F.Task.resolveFormat(f) : null; return !!(r && r === f && F.Task.defs[f]); } catch (e) { return false; } };
const curRung = s => { try { const st = F.LEARN && F.LEARN.strand ? F.LEARN.strand(s) : null; return st && st.rung ? st.rung : null; } catch (e) { return null; } };
function slotFits(formats, skip) {
  const out = { formats: [], strands: [] };
  if (!F.LEARN || !F.LEARN.serves) return out;
  let act = []; try { act = F.LEARN.active ? F.LEARN.active() : (F.LEARN.STRANDS || []); } catch (e) { act = []; }
  if (skip && skip.length) act = act.filter(s => !skip.includes(s));
  for (const f of formats || []) {
    if (!fmtReal(f)) continue;
    const sp = F.Task.defs[f], ss = Object.keys((sp && sp.strands) || {}).filter(s => act.includes(s) && curRung(s) != null && F.LEARN.serves(f, s, curRung(s)));
    if (!ss.length) continue;
    out.formats.push(f); ss.forEach(s => { if (!out.strands.includes(s)) out.strands.push(s); });
  }
  return out;
}
// the texts of lines (to pass as `said`: a word just spoken in the story is never the reading / writing target, C6)
function lineTexts(ids) {
  const out = [];
  for (const id of [].concat(ids || [])) { try { const t = id && F.TPL.all && F.TPL.all[id]; if (!t) continue; [].concat(t.text || t.texts || []).forEach(x => { if (typeof x === 'string') out.push(x); }); } catch (e) { /* no text */ } }
  return out;
}
function slotItem(slot, ctx, o) {
  o = o || {}; ctx = ctx || {};
  if (!slot || !F.LEARN || !F.LEARN.next) return null;
  const r = o.rng || F.rand;
  let all = slotFits(slot.formats);
  if (!all.formats.length) return null;
  // a retired strand (top rung Gold: T-NAVN / T-SKRIV review only), a parked or valved one only when nothing else in the slot fits
  let skipS = null;
  try {
    const sm = (F.LEARN.summary && (F.LEARN.summary() || {}).strands) || {};
    const rest = all.strands.filter(s => sm[s] && (sm[s].retired || sm[s].parked || sm[s].valve));
    if (rest.length) { const live = slotFits(slot.formats, rest); if (live.formats.length) { all = live; skipS = rest; } }
  } catch (e) { /* engine without summary flags */ }
  // never the same format twice in a row (SYNTHESIS §4.2 rule 1), and not one of her last 3 formats when the slot has another one at
  // her level (RQ5's two steps, a chain's tell + pris …)
  const rec3 = F.Task.recent ? F.Task.recent.slice(-3).map(x => x.format) : [];
  // the slot's only fitting format is the one she just did (Q8: the ten-tray, then «Nå trenger jeg egg!» where only the ten-tray fits
  // her level): a story-neutral wider set at her level instead (the step's generic line is used for it), never the same task twice
  if (all.formats.length === 1 && rec3.length && all.formats[0] === rec3[rec3.length - 1] && slot.wide !== false) {
    const w = slotFits(WIDE.filter(f => f !== all.formats[0]), skipS);
    if (w.formats.length) all = w;
  }
  for (const k of [3, 1]) {
    const avoid = rec3.slice(-k);
    if (all.formats.length > 1 && all.formats.some(f => avoid.includes(f))) { const keep = slotFits(all.formats.filter(f => !avoid.includes(f)), skipS); if (keep.formats.length) { all.formats = keep.formats; all.strands = keep.strands; break; } }
  }
  const lead = slotFits((o.lead || slot.lead || []).filter(f => all.formats.includes(f)), skipS);
  const useLead = lead.formats.length && r() < (slot.leadP != null ? slot.leadP : 0.6);
  const pool = useLead ? lead : all;
  const prefer = slot.prefer || (slot.word ? ['LES:' + slot.word, 'SKRIV:' + slot.word] : undefined);
  const recent = F.Task.recent ? F.Task.recent.slice(-3).map(x => x.format) : [];
  // an animal story (Q15's sheep, a chain about a cat) passes its animal as the engine's theme: the reasoning generators then sort /
  // pattern / count with that animal's world (feature-detected: only a species F.THEMES knows)
  let theme; try { theme = slot.theme && F.THEMES && F.THEMES.of && F.THEMES.of(slot.theme) ? slot.theme : undefined; } catch (e) { theme = undefined; }
  const q = { formats: pool.formats, strands: pool.strands, prefer, said: o.said && o.said.length ? o.said : undefined, place: ctx.place && (ctx.place.id || ctx.place),
    theme, rng: r, now: Date.now(), avoid: recent, last: (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null };
  let it = null;
  try { it = F.LEARN.next(q); } catch (e) { console.warn('[Quest] slot', e); it = null; }
  if ((!it || !pool.formats.includes(it.format)) && useLead) { try { it = F.LEARN.next(Object.assign({}, q, { formats: all.formats, strands: all.strands })); } catch (e) { it = null; } }
  if (!it || !all.formats.includes(it.format)) return null;
  // the story's own thing is counted by the formats that honour a model (never a wrong noun: only real models)
  if (slot.model && COUNT_FMTS.includes(it.format) && F.VOX.has(slot.model)) it.params = Object.assign({}, it.params || {}, { model: slot.model });
  // the story's word / thing ride along for formats that can use them (params.story – read by none yet: REQUEST WP-R2 / format owners)
  if (slot.model || slot.word) it.params = Object.assign({}, it.params || {}, { story: { model: slot.model || null, word: slot.word || null } });
  it.slot = true;
  Quest.slotLog.push({ f: it.format, s: it.strand, r: it.rung, lead: !!useLead, n: all.formats.length }); if (Quest.slotLog.length > 200) Quest.slotLog.shift();
  return it;
}
Quest.SLOT = SLOT; Quest.SPEC = SPEC; Quest.COUNT_FMTS = COUNT_FMTS;
Quest.slotFits = slotFits; Quest.slotItem = slotItem; Quest.lineTexts = lineTexts; Quest.slotLog = [];

/* ---------------------------------------------------------- v3 helping missions H1–H3 (DESIGN3 §6.1)
   Generic quest defs with vars {w, n} ('$w' / '$n' substitution) on the normal quest engine. Instance id = 'H1~<actorId>' (one
   chain per character); the instance's steps are saved in its state (st.steps, st.vars, st.outcomes), so old saves still load.
   H1 «Ønskelappen» (need / item NPCs): read the wish note → count out N → write the label → (strong) the number.
   H2 «Bestillingen» (bakers, farmers, fishers, shepherds, flower / ice-cream sellers, Kari, Tor): count N job items → read the box
   label → the price → (strong) write the label.   H3 «Brevet» (Per, villagers): read the parcel → the door number → write the name.
   Steps: kid 2, adult 3, +1 when ≥5 of her last 6 answers were first-try right. All steps run in ONE visit (Puff: «Ett steg til!»);
   if she stops, the gold bubble keeps the rest. Stars on the strip (★ A, ☆ B/C); coins 2 per A + 1 per other; all A → a job gift
   into Puff's basket. Every task comes from F.LEARN at her level (strands + prefer = the story word when it fits her level). */
const HS = {
  // v5 WP-W (logic #3 / §3-C): ONE story word + ONE number per chain. The read word never replaces the story word (no setW: only a
  // read word that fits the same need keeps the story true), tell = formats that count the story model (F06/F08/F09), tall = the
  // counted number written on the label (F16), dor = the real door (F02). The line is chosen AFTER the item, from the served format.
  les:   { t: 'task', k: 'les', say: 'life_h_lapp', formats: ['F23', 'F27', 'F24'], strands: ['LES'], strand: 'LES', word: '$w', keepW: true, lines: { F23: 'life_h_lapp', F27: 'life_h_skilt', F24: 'life_h_krukke' }, other: 'life_h_les' },
  // v5c WP-Q: tell / pris / dor are story SLOTS across strands (the engine's mix at her level); the counted story number only comes
  // from a format that counts the story's own thing (COUNT_FMTS) – another served format drops the «write the number» step
  tell:  { t: 'task', k: 'tell', say: 'life_h_tell', formats: ['F06', 'F08', 'F09'], strands: ['T-MENGDE'], params: { model: '$w' }, setN: true,
    slot: v => tellSlot(v), fit: ['F06', 'F08', 'F09', 'F10', 'F48', 'F43'], other: 'life_h_hjelp' },
  skriv: { t: 'task', k: 'skriv', say: 'life_h_skriv', formats: ['F35', 'F36', 'F33'], strands: ['SKRIV'], strand: 'SKRIV', word: '$w' },
  tall:  { t: 'task', k: 'tall', say: 'life_h_tallapp', formats: ['F16'], strands: ['T-SKRIV', 'T-NAVN'], target: '$n', needN: true },
  pris:  { t: 'task', k: 'pris', say: 'life_h_pris', formats: ['F16'], strands: ['T-SKRIV'], slot: () => ['F16', 'F53', 'F43', 'F11', 'F56'], fit: ['F16'], other: 'life_h_hjelp' },
  dor:   { t: 'task', k: 'dor', say: 'life_h_dor', formats: ['F02'], strands: ['T-NAVN', 'T-ORDEN'], village: true, slot: () => ['F49', 'F44', 'F42'], other: 'life_h_hjelp' },
};
// the counting step of a chain by what the story is about: food → the ten-tray / bake / cartons / the scale; clothes and finery → the
// ribbon loom / bead patterns; animals → sorting / the puppet theatre; other things → sorting / patterns / the scale
const FOODW = new Set(['kake', 'bolle', 'eple', 'brød', 'is', 'saft', 'melk', 'vann', 'egg', 'fisk', 'pære', 'banan', 'gulrot', 'pannekake', 'vaffel']);
const WEARW = new Set(['lue', 'vott', 'skjerf', 'sokk', 'krone', 'hatt', 'rose', 'kjole', 'genser', 'ring', 'kjede', 'blomst']);
const ANIMW = new Set(['katt', 'hund', 'kanin', 'sau', 'hest', 'ku', 'gris', 'and', 'høne', 'fugl', 'fisk']);
function tellSlot(v) {
  const w = String((v && v.w) || ''), nd = v && v.need;
  if (FOODW.has(w) || nd === 'sulten' || nd === 'tørst') return ['F06', 'F08', 'F09', 'F10', 'F48', 'F43', 'F53'];
  if (ANIMW.has(w) || nd === 'dyr') return ['F06', 'F08', 'F09', 'F71', 'F55'];
  if (WEARW.has(w) || nd === 'kald' || nd === 'fin') return ['F06', 'F08', 'F09', 'F56', 'F58'];
  return ['F06', 'F08', 'F09', 'F71', 'F58', 'F53'];
}
Quest.tellSlot = tellSlot;
const H_PLAN = { H1: ['les', 'tell', 'skriv', 'tall'], H2: ['tell', 'les', 'pris', 'skriv'], H3: ['les', 'dor', 'skriv', 'tall'] };
// v5r2 (world review): the note the shared 'les' step reads, by chain – only H1 «Ønskelappen» is a wish (handed to the giver);
// H2 «Bestillingen» reads the order list, H3 «Brevet» the letter (F23 then finds the thing, never «Hva ønsker jeg meg?»)
const H_NOTE = { H2: 'list', H3: 'letter' };
const H_JOB = new Set(['baker', 'bonde', 'fisker', 'gjeter', 'blomsterselger', 'isselger', 'kokk', 'tor']);
const H_POST = new Set(['per', 'batmann', 'fyrvokter', 'bestefar']);
const H_NEEDW = { sulten: ['kake', 'bolle', 'eple', 'brød', 'is'], tørst: ['saft', 'melk', 'vann'], kald: ['lue', 'vott', 'skjerf', 'sokk'], trøtt: ['seng', 'pute', 'teppe'],
  kjed: ['ball', 'bok', 'dukke', 'drage'], fin: ['krone', 'hatt', 'rose'], sitte: ['stol', 'benk', 'sofa'], dyr: ['katt', 'hund', 'kanin'] };
['H1', 'H2', 'H3'].forEach(h => { Quest.defs[h] = { giver: null, chain: true, name: { H1: 'Ønskelappen', H2: 'Bestillingen', H3: 'Brevet' }[h], word: 'brev', coins: [0, 0], kp: null, steps: H_PLAN[h].map(k => HS[k]), done: {} }; });
// the instance def: the base H def with the instance's own step list
function defOf(id) {
  if (!id) return null;
  if (D[id]) return D[id];
  const i = id.indexOf('~'); if (i < 0) return null;
  const base = D[id.slice(0, i)]; if (!base) return null;
  const st = QS().list[id];
  if (!st || !Array.isArray(st.steps)) return base;
  return Object.assign({}, base, { steps: st.steps.map(k => HS[k] || HS.les) });
}
Quest.defOf = defOf;
const wOK = w => !!(w && F.VOX.has(w));
function chainKind(a, w) {
  const k = chainKind0(a, w);
  return unlocked(k) ? k : 'H1';                                    // v5c WP-Q: H2 from play day 2, H3 from day 4 (the calendar)
}
function chainKind0(a, w) {
  if (w && w.kind === 'need') return 'H1';
  if (H_POST.has(a.id) || H_POST.has(a.job)) return 'H3';
  if (H_JOB.has(a.job) || H_JOB.has(a.id)) return 'H2';
  if (a.id && a.id.startsWith('v_')) return F.rand() < 0.5 ? 'H3' : 'H1';
  return 'H1';
}
// the story word: a model; for a need the word her reading level serves best (so the wish note shows THIS word)
function lesFit(word) { try { const e = F.WORDS && F.WORDS.get ? F.WORDS.get(word) : null, wr = e && e.rung ? e.rung.LES : null; const cur = ((((F.LEARN.summary() || {}).strands) || {}).LES || {}).rung || 1; return wr == null ? 9 : Math.abs(wr - cur) + (wr > cur ? 0.5 : 0); } catch (e) { return 9; } }
function chainWord(a, w, kind) {
  const r = F.rand;
  if (w && w.need && H_NEEDW[w.need]) { const c = U.shuffle(r, H_NEEDW[w.need].filter(wOK)); if (c.length) return c.sort((x, y) => lesFit(x) - lesFit(y))[0]; }
  const c = [w && w.model, ROLE_MODEL[a.job], ROLE_MODEL[a.role], ROLE_MODEL[a.id], kind === 'H3' ? 'brev' : null, 'eple'].filter(wOK);
  return c[0] || null;
}
// she is doing well: ≥5 of her last 6 outcomes were A → one step more
const strong = () => R.hist.length >= 6 && R.hist.filter(o => o === 'A').length >= 5;
function startChain(a, w, o) {
  o = o || {};
  if (!a || a.royal || a.kind === 'animal' || a.noTasks || a.owner) return null;
  const kind = o.kind || chainKind(a, w), id = kind + '~' + a.id, q = QS();
  if (q.list[id]) { Quest.start(id); return id; }
  const plan = H_PLAN[kind]; if (!plan) return null;
  const n = Math.min(plan.length, (o.steps || (isKid(a) ? 2 : 3)) + (o.steps ? 0 : strong() ? 1 : 0));
  const steps = plan.slice(0, n);
  q.list[id] = { id, step: 0, giver: a.id, day: F.save.day || 1, chain: kind, steps, vars: { w: chainWord(a, w, kind), n: null, need: (w && w.need) || null }, outcomes: [] };
  F.store();
  log('chainStart', { id: kind, who: a.id, steps: steps.length });
  Quest.start(id, a.id);
  showStrip(id);
  return id;
}
Quest.startChain = startChain;
const subst = (v, vars) => typeof v === 'string' ? (v === '$w' ? vars.w : v === '$n' ? vars.n : v) : v;
function substParams(p, vars) {
  if (!p) return undefined;
  const out = {};
  for (const k in p) { const v = subst(p[k], vars); if (v != null && !(k === 'model' && !wOK(v))) out[k] = v; }
  return Object.keys(out).length ? out : undefined;
}
// the story word as an item when it sits at her level in this strand (else null → the engine's pick at her level, preferring it)
function fitItem(formats, step, word) {
  try {
    const e = F.WORDS && F.WORDS.get ? F.WORDS.get(word) : null; if (!e || !e.rung) return null;
    const wr = e.rung[step.strand]; if (!wr) return null;
    const cur = (((F.LEARN.summary() || {}).strands || {})[step.strand] || {}).rung || 1;
    if (wr > cur || wr < cur - 1) return null;
    return makeItem(formats, { word, strand: step.strand });
  } catch (e) { return null; }
}
async function chainTask(step, ctx, st, a) {
  const vars = st.vars || {};
  const avail = step.formats.filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f));
  const sayLine = async id => { if (a && id && F.TPL.has(id)) await a.say(id); };
  if (!avail.length) return { outcome: 'A', skipped: true };
  // v5r2: ctx is this step's own object (runStep builds it per step), the shared HS.les stays untouched
  const noteK = step.k === 'les' ? H_NOTE[st.chain] : null;
  if (noteK && !ctx.noteKind) ctx.noteKind = noteK;
  const params = substParams(step.params, vars);
  const w = step.word ? subst(step.word, vars) : null, n = step.target ? subst(step.target, vars) : null;
  if (step.needN && n == null) return { outcome: 'A', skipped: true };          // no counted number yet: no number label
  // H3: the real street doors (F02 Postrunden) when they serve her level in T-NAVN / T-ORDEN – the parcel then flies there
  if (step.k === 'dor') {
    const S = ((F.LEARN.summary && F.LEARN.summary()) || {}).strands || {}, R2 = (F.Task.defs.F02 && F.Task.defs.F02.strands) || {};
    const fit = ['T-NAVN', 'T-ORDEN'].find(k => R2[k] && S[k] && S[k].rung >= R2[k][0] && S[k].rung <= R2[k][1]);
    if (fit && F.Task.resolveFormat('F02')) { await sayLine(step.say); return Quest.task(['F02'], ctx, { strands: [fit] }); }
    // v5c WP-Q: past the street doors' rungs the postman's numbers go on (the village fact-family house, the number-line bridge,
    // the hundred board) – the parcel then lands by the giver
    const it = step.slot ? slotItem({ formats: step.slot(vars) }, ctx, { said: lineTexts([step.other]) }) : null;
    if (!it) return { outcome: 'A', skipped: true };
    await sayLine(step.other);
    return F.Task.run(it, ctx);
  }
  // v5c WP-Q: «write the number on the label» never re-drills a T-SKRIV rung she has passed (F16 serves W3–W8)
  if (step.k === 'tall' && !slotFits(['F16']).formats.length && (curRung('T-SKRIV') || 0) > 8) return { outcome: 'A', skipped: true };
  // v5c WP-Q: a story slot (tell / pris): the item at her level from the slot, the line after the item from the served format
  if (step.slot && step.k !== 'dor') {
    const it = slotItem({ formats: step.slot(vars), model: step.k === 'tell' && wOK(vars.w) ? vars.w : null, word: vars.w || null, theme: ANIMW.has(String(vars.w || '')) ? vars.w : null }, ctx,
      { said: lineTexts([step.say, step.other]) });
    if (it) {
      await sayLine(step.fit && !step.fit.includes(it.format) ? step.other : step.say);
      return F.Task.run(it, ctx);
    }
  }
  // 1. the item: the story word / number at her level, else the engine's pick (preferring them)
  let it = w ? fitItem(avail, step, w) : null;
  if (!it && (w && step.k === 'les' || n != null)) it = makeItem(avail, Object.assign({}, step, { word: w, target: n }));
  if (!it && F.LEARN && F.LEARN.next) {
    const prefer = [];
    if (w) step.strands.forEach(s => prefer.push(s + ':' + w));
    if (n != null) step.strands.forEach(s => prefer.push(s + ':' + n));
    try { it = F.LEARN.next({ formats: avail, strands: step.strands, prefer: prefer.length ? prefer : undefined, place: ctx.place, npcRole: ctx.npc && ctx.npc.role, npc: ctx.npc ? ctx.npc.id : undefined, rng: F.rand, now: Date.now(), avoid: [], last: (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null }); } catch (e) { it = null; }
    if (it && !avail.includes(F.Task.resolveFormat(it.format))) it = null;
  }
  // a counting step whose engine item counts something else (F06 without the model …) keeps the story model
  if (it && params) it.params = Object.assign({}, it.params || {}, params);
  // 2. the line for the format actually served (a read word that is not the story word gets a neutral frame)
  const fid = it ? F.Task.resolveFormat(it.format) : null;
  let line = step.say;
  if (step.lines && fid) line = step.lines[fid] || step.say;
  if (step.k === 'les' && it && w && String(it.word || '').toLowerCase() !== String(w).toLowerCase() && step.other) line = step.other;
  if (noteK && line === 'life_h_lapp' && step.other) line = step.other;   // v5r2: no «ønskelappen min» before an order list / a letter
  await sayLine(line);
  if (it) return F.Task.run(it, ctx);
  return F.Task.offer({ formats: avail, ctx, strands: step.strands });
}
// after a step: the word she really read / the number she really counted becomes the story's word / number
function chainLearn(st, step) {
  const lr = F.Task.lastResult, it = lr && lr.item; if (!it || !st.vars) return;
  const rw = it.word ? String(it.word).toLowerCase() : null, need = st.vars.need;
  if (step.keepW && rw && rw !== st.vars.w && wOK(rw) && need && H_NEEDW[need] && H_NEEDW[need].includes(rw)) st.vars.w = rw;   // same need: still true
  // v5c WP-Q: the story number only from a format that counted the story's own thing; another served format of the slot drops the
  // later «write the number on the label» step (there is no counted number to write)
  const counted = COUNT_FMTS.includes(String(it.format));
  if (step.setN && counted && it.target != null && +it.target >= 1 && +it.target <= 40 && Math.round(+it.target) === +it.target) st.vars.n = +it.target;
  else if (step.setN && !counted && Array.isArray(st.steps)) { const keep = st.steps.filter((k, i) => i <= st.step || k !== 'tall'); if (keep.length !== st.steps.length) { st.steps = keep; F.store(); } }
  if (step.k === 'dor' && /^F02/.test(it.format || '') && it.target != null && +it.target >= 1 && +it.target <= 99) { st.vars.door = +it.target; if (st.vars.n == null) st.vars.n = +it.target; }   // a real door (Postrunden) – H3's label number
}
// H3 «Brevet»: the parcel flies from the giver to the house with the number she found (a real village door), sparkles there
async function parcelFly(g, num) {
  try {
    if (!g || g.space !== 'out' || num == null) return false;
    // the NEAREST village that has this door (v5: natural street numbers – villages no longer share one 10–20 range)
    const vs = (F.W && F.W.villages ? F.W.villages({ x: g.x, z: g.z }, 160) || [] : []).filter(q => q.houses && q.houses.some(x => +x.num === +num))
      .sort((a, c) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(c.x - g.x, c.z - g.z));
    const v = vs[0] || null;
    const h = v && v.houses.find(x => +x.num === +num); if (!h || Math.hypot(h.x - g.x, h.z - g.z) > 120) return false;
    const mid = firstModel(['pakke', 'life_gaveeske', 'brev']); if (!mid) return false;
    const grp = new THREE.Group(); grp.add(F.Act.fitModel(mid, {}, 0.5)); F.Space.scene('out').add(grp);
    const y0 = F.Space.impl.out.heightAt(g.x, g.z) + 1.6, y1 = F.Space.impl.out.heightAt(h.x, h.z) + 1.2, d = Math.hypot(h.x - g.x, h.z - g.z);
    F.sfx.magic && F.sfx.magic();
    await F.T.tween(Math.min(2600, 900 + d * 40), k => { grp.position.set(U.lerp(g.x, h.x, k), U.lerp(y0, y1, k) + Math.sin(k * Math.PI) * Math.min(8, 2 + d * 0.15), U.lerp(g.z, h.z, k)); grp.rotation.y = k * 6; if (Math.random() < 0.3) F.FX.sparkle(grp.position.clone(), 0xffe27a); });
    F.FX.burst(grp.position.clone(), { n: 30, colors: [0xffd84a, 0xff9fd0, 0xffffff] }); F.sfx.chime();
    grp.parent && grp.parent.remove(grp);
    F.emit('parcelDelivered', g.id, +num);
    return true;
  } catch (e) { console.warn('[Quest] parcel', e); return false; }
}
// payoff: N of the thing appear by the NPC in a row of ten + the rest
function deliverPile(g, vars) {
  const w = vars && vars.w, n = U.clamp((vars && vars.n) || 1, 1, 40);
  if (!wOK(w) || !g) return;
  const scene = F.Space.scene(g.space), grp = new THREE.Group(), ang = g.heading + 1.2;
  const bx = g.x + Math.sin(ang) * 1.6, bz = g.z + Math.cos(ang) * 1.6;
  grp.position.set(bx, F.Space.impl[g.space].heightAt(bx, bz), bz); grp.rotation.y = g.heading;
  scene.add(grp);
  for (let i = 0; i < n; i++) {
    const m = F.Act.fitModel(w, {}, 0.3); const row = Math.floor(i / 10), col = i % 10;
    m.position.set((col - 4.5) * 0.34, 0, row * 0.42); m.visible = false; grp.add(m);
    F.T.timeout(() => { m.visible = true; F.FX.pop && F.FX.pop(m); F.sfx.pop(); }, 120 + i * 110);
  }
  F.T.timeout(() => { F.FX.sparkle(grp.position); grp.parent && grp.parent.remove(grp); }, 9000);
}
// a small thank-you gift for a perfect mission (food / toy / gift kinds go to Puff's basket)
function jobGift(g, w) {
  const all = F.CAT.filter(c => ['food', 'toy'].includes(c.kind) && c.price <= 15);
  const same = all.find(c => c.word === w || c.model === w || c.id === w);
  return same ? same.id : all.length ? all[U.hashStr(g.id + '|' + (F.save.day || 1)) % all.length].id : null;
}
async function chainFinish(id, st, g) {
  // economy §2 (honest coins): 2 per first-try answer, nothing for other answers or a mission without answers
  const outs = st.outcomes || [], nA = outs.filter(o => o === 'A').length, coins = Quest.PER_A_CHAIN * nA;
  if (g) Quest.satisfy(g.id, 'chain');
  showStrip(id, { done: true });
  if (g) {
    g.clearWish(); g.facePlayer(); g.shiver = false;
    const h3 = st.chain === 'H3' && st.vars && st.vars.door != null;
    if (!(h3 && await parcelFly(g, st.vars.door))) deliverPile(g, h3 ? { w: st.vars.w, n: 1 } : st.vars);   // H3: the door number is no count
    g.gesture('cheer', 2); F.Act.hearts(g.headPos()); F.sfx.levelup();
    await g.say('life_h_ferdig');
    const nd = st.vars && st.vars.need, tag = nd === 'sulten' ? 'eat' : nd === 'kald' ? 'warm' : nd === 'sitte' ? 'sit' : null;
    if (tag) { g.shiver = false; try { await g.react(tag, wOK(st.vars.w) ? st.vars.w : null); } catch (e) { /* no reaction */ } }
  }
  if (coins > 0) F.Eco.add(coins, { from: payer(g, coins) || herPoint(), reason: 'quest' });   // (review #1) a saving giver never pays; then they rise from her
  goalSoon();
  let gift = null;
  if (g && outs.length >= 2 && nA === outs.length && F.Eco.receive) {
    gift = jobGift(g, st.vars && st.vars.w);
    if (gift && F.Eco.receive(gift, { from: g.id })) { await g.say('life_h_gave'); F.SAY('eco_kurv'); } else gift = null;
  }
  log('questDone', { id: id.split('~')[0], who: g ? g.id : null, kp: null, coins, chain: true, stars: nA, steps: outs.length, gift });
  F.emit('questDone', id, coins);
  F.emit('chainDone', id, { outcomes: outs.slice(), coins, gift, steps: (st.steps || []).length });
  if (g) F.T.timeout(() => { if (F.Act.all[g.id] && !g.wish && !g.busy) Quest.smallWish(g); }, (150 + Math.random() * 120) * 1000);
}
/* the star strip of a running mission (★ first try, ☆ otherwise; the current step pulses) */
let stripEl = null, stripId = null, stripT = null;
function showStrip(id, o) {
  o = o || {};
  try {
    const st = QS().list[id] || (o.done && stripId === id ? stripState : null); if (!st || !st.steps) return;
    stripState = { steps: st.steps.slice(), outcomes: (st.outcomes || []).slice(), step: st.step };
    if (!document.getElementById('hchain-css')) { const cs = document.createElement('style'); cs.id = 'hchain-css';
      cs.textContent = '#hchain{position:fixed;left:50%;top:106px;transform:translateX(-50%);display:flex;gap:10px;padding:6px 16px;border-radius:28px;background:rgba(255,250,235,.92);box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:30;pointer-events:none;transition:opacity .4s}' +
        '#hchain .hs{font:700 40px/1 Andika,sans-serif;color:#d9cfb8}#hchain .hs.a{color:#f2b51b;text-shadow:0 0 6px #ffe27a}#hchain .hs.b{color:#a9b4c2}#hchain .hs.cur{animation:hcp 1s ease-in-out infinite}' +
        '@keyframes hcp{50%{transform:scale(1.25)}}body.panel-on #hchain{opacity:0}'; document.head.appendChild(cs); }
    if (!stripEl) { stripEl = document.createElement('div'); stripEl.id = 'hchain'; document.body.appendChild(stripEl); }
    // natural audit D5 (#29): the strip never sits over a task – hidden while ANY task runs (the stage cards are under top:106);
    // it shows while the giver talks before a step, ~2.6 s after each step (the new star) and 4 s at the end
    stripId = id; stripEl.innerHTML = ''; stripEl.style.transition = 'opacity .3s'; stripEl.style.opacity = F.Task.current ? '0' : '1';
    stripState.steps.forEach((k, i) => {
      const oc = stripState.outcomes[i];
      const e = document.createElement('span'); e.className = 'hs' + (oc === 'A' ? ' a' : oc ? ' b' : '') + (!oc && i === stripState.step && !o.done ? ' cur' : '');
      e.textContent = oc === 'A' ? '★' : '☆'; stripEl.appendChild(e);
    });
    if (stripT) clearTimeout(stripT);
    stripT = setTimeout(() => { if (stripEl) stripEl.style.opacity = '0'; }, o.done ? 4000 : 2600);
  } catch (e) { console.warn('[Quest] strip', e); }
}
let stripState = null;
// any task – this mission's own step too – hides the strip at once (no fade over the first cards)
F.on('taskStart', () => { if (!stripEl) return; if (stripT) { clearTimeout(stripT); stripT = null; } stripEl.style.transition = 'none'; stripEl.style.opacity = '0'; });
Quest.strip = () => (stripEl && stripEl.style.opacity !== '0' ? Array.from(stripEl.children).map(e => e.className) : null);
Quest.runWish = runWish;
F.Act.proto.lastReactFresh = function () { return this._reactT != null && F.T.now - this._reactT < 4; };
/* ---------------------------------------------------------- wishes fulfilled by her own wand casts
   A free cast that fits an NPC's need (sulten → kake, kald → lue …) near them completes that wish: the thing flies to the NPC
   (F.Wand.reactTo – the NPC eats it / puts it on), «Tusen takk!» + 3 coins. Works for small need wishes and for quest steps that
   ask for a need (Q1 «noe å spise», Q19 «noe å ha på», Q20 «Jeg fryser!»). Listens to 'cast' (wand.js) and 'wishFulfilled' /
   'wandGive' (FORMATS-W: the NPC already received the thing). */
const actorOfAny = x => { if (!x) return null; if (typeof x === 'string') return F.Act.byId(x) || F.Act.list.find(a => a.th.id === x) || null; if (x.setWish) return x; if (x.actor) return x.actor; if (x.id) return F.Act.byId(x.id) || F.Act.list.find(a => a.th.id === x.id) || null; return null; };
function needOf(a) {
  const w = a && a.wish; if (!w) return null;
  if (w.kind === 'need') return w.need || null;
  if (w.kind === 'quest' && w.questId) { const st = QS().list[w.questId], d = defOf(w.questId), step = d && st && d.steps[st.step]; if (step && step.t === 'task' && step.at !== 'obj' && step.need) return step.need; }
  return null;
}
Quest.needOf = needOf;
function wordFits(word, need) {
  if (!word || !need) return false;
  const tag = NEED_TAG[need] || need, e = F.WORDS && F.WORDS.get ? F.WORDS.get(String(word).toLowerCase()) : null;
  return !!(e && (e.tags || []).includes(tag));
}
Quest.wordFits = wordFits;
// the NPC (within r m of a point) whose need this word fits
Quest.needyFor = function (word, at, r, space) {
  if (!at) return null;
  const list = F.Act.near(at.x, at.z, r || 7, space || F.Space.cur).filter(a => a.kind === 'person' && !a.temp && !a.owner && wordFits(word, needOf(a)));
  list.sort((x, y) => Math.hypot(x.x - at.x, x.z - at.z) - Math.hypot(y.x - at.x, y.z - at.z));
  return list[0] || null;
};
Quest.CAST_COINS = 1;
function castNeeds() { const l = F.save.life = F.save.life || {}, day = F.save.day || 1; if (!l.castNeeds || l.castNeeds.day !== day) l.castNeeds = { day, list: {} }; return l.castNeeds; }
Quest.fulfil = async function (a, word, o) {
  o = o || {};
  if (!a || !a.wish || (a._fulfilT != null && F.T.now - a._fulfilT < 4)) return false;
  const need = needOf(a); if (!need || !wordFits(word, need)) return false;
  // v3 (DESIGN3 §6.6): the same word for the same need twice a day → «Det fikk jeg i stad! Kan du trylle noe annet?», the wish stays
  const CN = castNeeds(), wl = String(word).toLowerCase();
  if ((CN.list[need] || []).includes(wl) && F.TPL.has('life_h_annet')) {
    a._fulfilT = F.T.now; a.facePlayer(); a.gesture('nod', 1.2); await a.say('life_h_annet'); F.emit('wishAgain', a.id, wl, need); return false;
  }
  (CN.list[need] = CN.list[need] || []).push(wl); F.store();
  a._fulfilT = F.T.now;
  const w = a.wish, qid = w.kind === 'quest' ? w.questId : null;
  log('wish', { who: a.id, word, need });
  F.emit('wishDone', a.id, word, need);
  a.shiver = false;
  // a free cast is a shortcut: 1 coin (a checked task pays more)
  if (qid) { F.Eco.add(Quest.CAST_COINS, { from: payer(a, Quest.CAST_COINS) || herPoint(), reason: 'wish' }); F.sfx.chime(); await a.say('life_takk'); advanceFromCast(qid, a, word); return true; }
  a.clearWish(); Quest.satisfy(a.id, 'cast');
  if (!o.reacted) { try { await a.react(need === 'sulten' || need === 'tørst' ? 'eat' : need === 'kald' ? 'warm' : need === 'fin' ? 'wear' : 'cheer', word); } catch (e) { /* model missing */ } }
  F.Eco.add(Quest.CAST_COINS, { from: payer(a, Quest.CAST_COINS) || herPoint(), reason: 'wish' }); F.sfx.chime(); F.Act.hearts(a.headPos());
  if (!o.thanked) await a.say('life_takk');
  F.T.timeout(() => { if (F.Act.all[a.id] && !a.wish && !a.busy) Quest.smallWish(a); }, (180 + Math.random() * 120) * 1000);
  return true;
};
F.on('wandGive', e => {
  const a = actorOfAny(e && e.npc); if (!a) return;
  a._reactT = F.T.now;
  if (!a.busy && e.word) Quest.fulfil(a, e.word, { reacted: true });
});
F.on('wishFulfilled', e => {
  const a = actorOfAny(e && (e.npc || e.actor || e.who)); if (!a) return;
  a._reactT = F.T.now;
  const word = e.word || e.w; if (word) Quest.fulfil(a, word, { reacted: true });
});
// a free cast next to a needy NPC: the thing goes to them (unless FORMATS-W already handed it over)
F.on('cast', e => {
  if (!e || !e.word || e.swap || F.Task.current) return;
  if (!e.free && !e.forNpc) return;
  const P = F.Player.pos, at = e.at || { x: P.x, z: P.z };
  const a = (e.forNpc && actorOfAny(e.forNpc)) || Quest.needyFor(e.word, at, 7) || Quest.needyFor(e.word, { x: P.x, z: P.z }, 7);
  if (!a || !wordFits(e.word, needOf(a))) return;
  const t0 = F.T.now;
  F.T.timeout(async () => {
    if (a._fulfilT != null && a._fulfilT >= t0) return;                  // already handled ('wishFulfilled' / 'wandGive')
    if (!F.Act.all[a.id] || a.busy || F.Task.current) return;
    const th = e.thing && (e.n || 1) === 1 ? F.Things.byId(e.thing) : null;   // a Tallmagi group stays where it is
    a.busy = true;
    try {
      a.facePlayer();
      if (F.Wand && F.Wand.reactTo && th) { a._fulfilT = null; await F.Wand.reactTo(a, e.word, th); }
      if (a._fulfilT == null || a._fulfilT < t0) { a.busy = false; await Quest.fulfil(a, e.word, { reacted: !!th }); }
    } catch (err) { console.warn('[Quest] cast→wish', err); }
    finally { a.busy = false; }
  }, 1200);
});

// scheduler: keep 1–2 small wishes near her (castle cast + villagers), royals show what they save for
let schedAcc = 0;
F.on('tick', dt => {
  schedAcc += dt; if (schedAcc < 15) return; schedAcc = 0;
  if (!F.booted || F.Task.current || Quest.quiet()) return;        // unsolicited: quiet during the break (v3)
  const P = F.Player.pos, near = F.Act.near(P.x, P.z, 35, F.Space.cur).filter(a => a.kind !== 'animal' && !a.owner && !a.noTasks && !a.temp && !a.royal);
  const active = near.filter(a => a.wish && a.wish.kind !== 'item' && a.wish.kind !== 'gift').length;   // (a gift bubble is hers, not a request)
  if (active < 2) { const free = near.filter(a => !a.wish && !a.busy); if (free.length) Quest.smallWish(U.pick(F.rand, free)); }
  for (const a of near) if (!a.wish && !a.busy && (['konge', 'dronning', 'mia'].includes(a.id) ? F.rand() < 0.3 : F.rand() < 0.12)) Quest.itemWish(a);
});

/* ---------------------------------------------------------- quest objects + gold star marker */
F.VOX.has('life_konvolutt') || F.VOX.def('life_konvolutt', { size: [16, 3, 12], scale: 1 / 16, build(v, o) {
  v.box(0, 0, 0, 15, 1, 11, 'white'); for (let x = 0; x < 8; x++) { v.set(x, 2, Math.min(11, 5 + Math.floor(x * 0.75)), 'cream'); v.set(15 - x, 2, Math.min(11, 5 + Math.floor(x * 0.75)), 'cream'); }
  v.box(6, 2, 4, 9, 2, 6, o.c || 'red'); v.box(0, 1, 0, 15, 1, 0, o.c || 'red');
}, meta: { group: 'life' } });
F.VOX.has('life_bord') || F.VOX.def('life_bord', { size: [32, 14, 20], scale: 1 / 16, build(v) {
  v.box(0, 11, 0, 31, 12, 19, 'woodLight'); v.box(0, 12, 0, 31, 12, 19, 'white'); for (let x = 0; x < 32; x += 4) v.box(x, 12, 0, x + 1, 12, 19, 'blossom');
  for (const [x, z] of [[2, 2], [28, 2], [2, 16], [28, 16]]) v.box(x, 0, z, x + 1, 10, z + 1, 'wood');
}, meta: { group: 'life' } });
F.Things.def('life_qobj', {
  radius: 0.6, solid: false, reach: 1.9, name: null,
  build(th) {
    const d = th.data || {}, id = firstModel([d.model, d.alt, 'life_gaveeske']);
    const m = F.VOX.make(id, d.opts || {});
    if (d.width) { const b = new THREE.Box3().setFromObject(m), s = b.getSize(V3()); m.scale.multiplyScalar(d.width / Math.max(0.05, s.x, s.z)); }
    const g = new THREE.Group(); g.add(m); return g;
  },
  press(th) { return Quest.onObj(th); },
});
/* clarity §3.1-6 (R1/R2): the thing a quest step points at gets the same GOLD bubble that people get, with the step's picture
   (no 3D star: «Se etter den gule stjernen» looked like the teapot's lid knob). A DOM .lifewish.gold.thing in #bubbles, projected over
   the thing's top each preRender; a tap on it presses the thing (the fairy flies there). Hidden in tasks, panels, other spaces,
   well off screen and beyond 45 m; the whole bubble always stays on screen (clamped at an edge, clear of the HUD cards). Quest.mark(thing, model?) / Quest.marked() (F.RQuest uses them for its notes and lost things). */
let markTarget = null, markEl = null, markKey = null, markT = -1;
const markModel = tg => { if (!tg) return null; const d = tg.data || {}; return firstModel([tg._markModel, d.model, d.alt, tg.type]) || firstModel(['life_gaveeske']); };
function markOn(target, model) {
  markTarget = target || null;
  if (target && model) target._markModel = model;
  if (!target && markEl) markEl.style.display = 'none';
}
Quest.mark = markOn;
Quest.marked = () => markTarget;
Quest.markEl = () => markEl;
const mtmp = V3();
function markBubble(tg) {
  const mid = markModel(tg), key = tg.id + '|' + mid;
  if (markEl && markKey === key) return markEl;
  if (!markEl) {
    markEl = F.UI.el('div', 'lifewish gold thing');
    markEl.onclick = e => { e.stopPropagation(); const t = markTarget; if (t && F.Input && F.Input.enabled && !F.Player.frozen && F.Things.press) F.Things.press(t); };
    markEl.addEventListener('pointerdown', e => e.stopPropagation());
  }
  markEl.innerHTML = ''; markKey = key;
  if (mid && F.Thumb && F.Thumb.img) markEl.appendChild(F.Thumb.img(mid, (tg.data && tg.data.opts) || {}, { size: 96 }));
  else markEl.appendChild(F.UI.el('div', 'lw-dot', '★'));
  const host = document.getElementById('bubbles') || document.body; if (markEl.parentNode !== host) host.appendChild(markEl);
  return markEl;
}
F.on('preRender', () => {
  const tg = markTarget;
  if (!tg) { if (markEl) markEl.style.display = 'none'; return; }
  const P = F.Player.pos, ov = (F.Castle && F.Castle.ov) || (F.R.cam && F.R.cam.mode === 'overview');
  const live = tg.obj && !tg.taken && F.Things.byId(tg.id) === tg && tg.space === F.Space.cur && (tg.obj.visible !== false);
  if (!live || F.Task.current || ov || (F.UI.isOpen && F.UI.isOpen()) || Math.hypot(tg.x - P.x, tg.z - P.z) > 45) { if (markEl) markEl.style.display = 'none'; return; }
  const top = tg._markY || (tg._markY = (() => { const b = new THREE.Box3().setFromObject(tg.obj); return b.isEmpty() ? 1.2 : b.max.y - tg.obj.position.y; })());
  mtmp.set(tg.obj.position.x, tg.obj.position.y + top + 0.25, tg.obj.position.z); mtmp.project(F.R.camera);
  // (2nd round) a thing just beyond a side edge (the 1280 view of the same throne room) keeps its bubble AT that edge, pointing the way
  if (mtmp.z > 1 || Math.abs(mtmp.x) > 1.4 || Math.abs(mtmp.y) > 1.2) { if (markEl) markEl.style.display = 'none'; return; }
  const el = markBubble(tg), r = F.R.renderer.domElement.getBoundingClientRect();
  el.style.display = ''; markT = F.T.now;
  // (verify 2nd round) a thing at the screen's edge (Q1's table at the throne room's left wall) had half its bubble cut off: the
  // whole bubble stays on screen – clamped inside the edges, and at a side edge below the HUD cards / above the UT button
  const x0 = r.left + (mtmp.x + 1) / 2 * r.width, y0 = r.top + (1 - mtmp.y) / 2 * r.height, mx = 56;
  const x = Math.min(r.right - mx, Math.max(r.left + mx, x0)), side = Math.abs(x - x0) > 0.5 || x0 < r.left + 140 || x0 > r.right - 140;
  const y = Math.min(r.bottom - (side ? 140 : 100), Math.max(r.top + (side ? 300 : 110), y0)) + Math.sin(F.T.now * 2.2) * 4;
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
});
F.on('spaceChanged', () => { if (markEl) markEl.style.display = 'none'; });
Quest.markShown = () => !!(markEl && markEl.style.display !== 'none' && F.T.now - markT < 0.5);
/* clarity §3.1-5 / §3.2-1/2 compat (verify 2nd round): «gold = a goal she took on» must hold on screen even while actors.js still
   renders every kind:'quest' wish gold. Runs after actors' own preRender (quests.js loads later), so no frame shows the wrong colour:
   a quest wish with gold === false (an offer, a royal offer) loses the class; a wish with done:true gets the ✓ chip (.lw-done) unless
   actors already drew one. A no-op once actors.js does both itself. */
function bubbleCompat() {
  if (!F.Act || !F.Act.list) return;
  for (const a of F.Act.list) {
    const w = a.wish, el = a.bubbleEl; if (!w || !el || w.kind !== 'quest') continue;
    if (w.gold === false && el.classList.contains('gold')) el.classList.remove('gold');
    const chip = el.querySelector('.lw-done');
    if (w.done && !chip) {
      if (!document.getElementById('q-lwdone-css')) { const cs = document.createElement('style'); cs.id = 'q-lwdone-css';
        // :where() keeps the specificity at 0 – actors' / shop.css' own .lw-done rule wins when it lands
        cs.textContent = ':where(.lifewish) :where(.lw-done){position:absolute;right:-10px;top:-10px;width:34px;height:34px;border-radius:50%;background:#3fbf5f;color:#fff;font:700 24px/34px system-ui,sans-serif;text-align:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none}:where(.lifewish){position:relative}';
        document.head.appendChild(cs); }
      el.appendChild(F.UI.el('div', 'lw-done', '✓'));
    } else if (!w.done && chip) chip.remove();
  }
}
F.on('preRender', bubbleCompat);
Quest.bubbleCompat = bubbleCompat;

/* ---------------------------------------------------------- quest definitions (Q1–Q8; DESIGN §6.3) */
// step: {t:'task'|'go'|'back', at:'giver'|'obj', say, sayN (narrator), formats, need, word, strand, target, obj:{model, room, near, find, width}, after}
const D = Quest.defs;
D.Q1 = { giver: 'konge', name: 'Kongens kake', word: 'kake', coins: [12, 16], kp: 'kp_q1', steps: [
  { t: 'task', say: 'q1_intro', sayL: ['q_hei'], formats: ['F33', 'F39'], strands: ['SKRIV'], need: 'sulten', after: 'eat' },
  { t: 'task', say: 'q1_s2', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], params: { model: 'kake' }, wModel: true, slot: 'fest' },
  { t: 'go', say: 'q1_s3', obj: { find: /bord|table/i, model: 'bord', alt: 'life_bord', near: 'giver', width: 2.2 } },
], done: { say: 'q1_done', react: ['cheer'] } };   // v5 WP-W (logic #25): he already ate what she conjured in step 1
const q2Look = a => { a.unwearHats(); a.crownGone = true; if (a.restyle) a.restyle({ hat: null }); };
// v5 WP-W (logic #46): the rooms are named by id; the spoken number is the plan's real number (WP-X renumbers rooms naturally)
const roomNum = id => { try { const r = F.Act.roomInfo ? F.Act.roomInfo('slott', id) : null; const n = r && r.num != null ? +r.num : null; return n != null && F.SETS.ROOM_NUMS && F.SETS.ROOM_NUMS.includes(n) ? n : null; } catch (e) { return null; } };
Quest.roomNum = roomNum;
D.Q2 = { giver: 'konge', name: 'Krona er borte', word: 'krone', coins: [14, 18], kp: 'kp_q2', start: q2Look, look: q2Look, steps: [
  { t: 'task', say: 'q2_intro', sayL: ['q_hei'], say2: 'q2_lapp', formats: ['F27', 'F23'], word: 'bad', strand: 'LES', strands: ['LES'], noteKind: 'clue' },
  { t: 'task', at: 'obj', sayN: 'q2_bad', sayN0: 'q2_bad0', sayNRoom: 'bad', sayIfWord: 'bad', formats: ['F23', 'F27'], word: 'seng', strand: 'LES', strands: ['LES'], noteKind: 'clue', obj: { model: 'brev', alt: 'life_konvolutt', room: 'bad', near: 'giver', dist: 6, width: 0.6 } },
  { t: 'go', sayN: 'q2_seng', sayN0: 'q2_seng0', sayNRoom: 'soverom', sayIfWord: 'seng', obj: { model: 'krone', alt: 'w_litenkrone', room: 'soverom', near: 'giver', dist: 9, width: 0.55 } },
  { t: 'back' },
], done: { say: 'q2_found', say2: 'q2_done', react: ['cheer'] } };
D.Q3 = { giver: 'per', name: 'Brev til huset', word: 'brev', coins: [10, 14], kp: 'kp_q3', steps: [
  { t: 'talk', say: 'q3_intro' },
  { t: 'task', at: 'obj', sayN: 'q3_landsby', formats: ['F02', 'F15', 'F01'], strands: ['T-NAVN', 'T-ORDEN', 'T-SKRIV'], slot: 'post', obj: { model: 'v_postkasse', alt: 'life_konvolutt', village: true, near: 'giver', dist: 14, width: 0.8 } },
  { t: 'task', at: 'obj', formats: ['F23', 'F27'], strands: ['LES'], keepObj: true, slot: 'brev', noteKind: 'letter', sayN2: { F78: 'q_brev_hor', F79: 'q_brev_bilder' } },
  { t: 'back' },
], done: { say: 'q3_done', react: ['cheer'] } };
// v5 WP-W (logic #31): a birthday is once a year – here at most once per 30 game days (Quest.offer checks d.every)
D.Q4 = { giver: 'mia', name: 'Mias bursdag', word: 'fest', coins: [15, 20], kp: 'kp_q4', every: 30, steps: [
  { t: 'task', say: 'q4_intro', sayL: ['q_hei'], say2: 'q4_s1', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], params: { model: 'lys' }, slot: ['F09', 'F06', 'F08', 'F10', 'F48', 'F58', 'F56', 'F65'], fit: ['F09', 'F06', 'F08', 'F10', 'F48'], other: ['q4_intro', 'life_h_hjelp'] },
  { t: 'task', say: 'q4_s2', sayAlt: 'q4_s2b', formats: ['F40', 'F33', 'F35'], word: 'fest', strand: 'SKRIV', strands: ['SKRIV'] },
  { t: 'go', say: 'q4_s3', obj: { model: 'food_bløtkake', alt: 'kake', near: 'giver', dist: 2.2, width: 0.7 } },
], done: { say: 'q4_done', party: true } };
D.Q5 = { giver: 'dronning', name: 'Dronningens handleliste', word: 'liste', coins: [12, 18], kp: 'kp_q5', steps: [
  // v5r fix1 (review #3): a shopping list – the engine prefers things one buys at the market (never «mølle» on the queen's list)
  { t: 'task', say: 'q5_intro', sayL: ['q_hei'], formats: ['F34', 'F40', 'F33', 'F35'], strands: ['SKRIV'], prefer: ['melk', 'brød', 'egg', 'ost', 'eple', 'kake', 'saft', 'mel', 'smør', 'te', 'pære', 'bolle', 'fisk', 'ris', 'is', 'sukker', 'gulrot', 'banan'].map(w => 'SKRIV:' + w) },
  { t: 'task', at: 'obj', sayN: 'q5_marked', formats: ['F12', 'F06', 'F11', 'F09'], strands: ['T-MENGDE'], slot: 'marked', obj: { zone: 'markedsplassen', model: 'life_kiosk', near: 'giver', dist: 10, width: 1.6 } },
  { t: 'back' },
], done: { say: 'q5_done', react: ['eat', 'kake'] } };
D.Q6 = { giver: 'dronning', name: 'Rosehagen', word: 'rose', coins: [12, 16], kp: 'kp_q6', steps: [
  { t: 'task', say: 'q6_intro', sayL: ['q_hei'], formats: ['F09', 'F08', 'F06'], strands: ['T-MENGDE'], params: { model: 'rose' }, wModel: true, slot: 'hage', lead: ['F74', 'F47'] },
  // v5r2 (world review): the queen's garden note is a list of what the garden needs – never «Hva ønsker jeg meg?» (F23 noteKind)
  { t: 'task', say: 'q6_s2', formats: ['F28', 'F23', 'F26'], strands: ['LES'], slot: ['F28', 'F23', 'F26', 'F74', 'F71', 'F58', 'F79', 'F47'], noteKind: 'list' },
], done: { say: 'q6_done', bloom: 'rose' } };
// v5 WP-W (logic #1 wallet rule, #21): Mia only asks for savings help while her wish costs more than she has; the piggy numbers are
// her REAL coins and her wish's REAL price (F13 «missing» with a = coins, b = price when 1 ≤ b − a and b ≤ 20), else counting coins.
const miaGap = () => { try { const st = F.Eco.npc('mia'), top = F.Eco.topWish('mia'), c = top && F.CAT.byId(top); if (!st || !c) return null; return { have: st.coins || 0, price: c.price, gap: c.price - (st.coins || 0) }; } catch (e) { return null; } };
Quest.miaGap = miaGap;
D.Q7 = { giver: 'mia', name: 'Mia sparer', word: 'gris', coins: [10, 15], kp: 'kp_q7', when: () => { const g = miaGap(); return !g || g.gap >= 1; }, steps: [
  // v5r fix1 (review #3): the coin model that exists (F.VOX has no 'mynt' – she counted random apples); no bird-story lead
  { t: 'task', say: 'q7_intro', sayL: ['q_hei'], formats: ['F06', 'F08', 'F11'], strands: ['T-MENGDE'], params: { model: 'fx_n_mynt1' }, slot: 'spare' },
  { t: 'task', say: 'q7_s2', formats: ['F13', 'F11', 'F06'], strands: ['T-MENGDE'], topOnly: 'F13', params: { model: 'fx_n_mynt1' },
    prep: st => { const g = miaGap(); if (g && g.gap >= 1 && g.gap <= 20 && g.price <= 20 && F.Eco.strandRung('T-MENGDE') >= 10) return Object.assign({}, st, { formats: ['F13'], target: g.gap, params: { op: 'missing', a: g.have, b: g.price } }); return Object.assign({}, st, { topOnly: null, formats: ['F11', 'F06'] }); } },
], done: { say: 'q7_done' } };   // natural audit D5: Mia saves her own money – no «Vil du gi meg litt lommepenger?», no coin panel
D.Q8 = { giver: 'kokk', name: 'Kokkens kjøkken', word: 'egg', coins: [12, 16], kp: 'kp_q8', steps: [
  { t: 'task', say: 'q8_intro', say2: 'q8_s1', formats: ['F24', 'F23', 'F05'], strands: ['LES', 'T-NAVN'], slot: ['F24', 'F23', 'F05', 'F48', 'F10', 'F43'], fit: ['F24'], other: ['q8_intro', null], noteKind: 'list' },
  { t: 'task', say: 'q8_s2', formats: ['F09', 'F08', 'F06'], strands: ['T-MENGDE'], params: { model: 'egg' }, slot: 'egg', fit: ['F09', 'F08', 'F06', 'F10', 'F43'], other: ['life_h_hjelp', null] },
], done: { say: 'q8_done', tower: 'pannekake' } };
D.Q9 = { giver: 'siv', name: 'Bøkene har falt', word: 'bok', coins: [12, 16], kp: 'kp_q9', steps: [
  { t: 'task', say: 'q9_intro', formats: ['F25', 'F23'], strands: ['LES'], slot: 'bok', lead: ['F79'], noteKind: 'list' },   // v5r2: Siv's book list, no wish
  { t: 'task', say: 'q9_s2', formats: ['F20', 'F18'], strands: ['T-ORDEN'], slot: 'orden', lead: ['F79', 'F71'] },
], done: { say: 'q9_done', react: ['cheer'] } };
// clarity §3.1-3: the card word is never «feil» (her letter shows the pencil that writes wrong words)
D.Q10 = { giver: 'mia', name: 'Mias skrivefeil', word: 'blyant', coins: [12, 14], kp: 'kp_q10', steps: [
  { t: 'task', say: 'q10_intro', sayL: ['q_hei'], formats: ['F37', 'F35'], strands: ['SKRIV'] },
  { t: 'task', say: 'q10_s2', formats: ['F37', 'F35', 'F36'], strands: ['SKRIV'] },
], done: { say: 'q10_done', react: ['cheer'] } };
D.Q11 = { giver: 'dronning', name: 'Det store ballet', word: 'lys', coins: [16, 20], kp: 'kp_q11', steps: [
  { t: 'task', say: 'q11_intro', sayL: ['q_hei'], formats: ['F27', 'F23'], strands: ['LES'], slot: ['F27', 'F23', 'F65'], noteKind: 'letter' },   // (review #3) no F56 birds   // v5c: the invitation, the ballroom windows, the dress ribbons
  { t: 'task', say: 'q11_s2', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], params: { model: 'lys' }, slot: 'ball', fit: ['F09', 'F06', 'F08'], other: ['q11_s3', null] },
  { t: 'task', say: 'q11_s3', formats: ['F21', 'F20', 'F18'], strands: ['T-ORDEN'], slot: 'musikk' },
], done: { say: 'q11_done', party: true } };
D.Q12 = { giver: 'konge', name: 'Kongeposten', word: 'avis', coins: [10, 10], kp: 'kp_q12', steps: [
  // v5r2 (world review): the king's post is read like a letter («Hva står det i brevet?»), never as a wish note
  { t: 'task', say: 'q12_intro', formats: ['F30', 'F23'], strands: ['LES'], noteKind: 'letter' },
  { t: 'task', say: 'q12_s2', formats: ['F30', 'F23'], strands: ['LES'], noteKind: 'letter' },
], done: { say: 'q12_done', react: ['cheer'] } };
D.Q18 = { giver: 'rolf', name: 'Rolfs parade', word: 'flagg', coins: [12, 16], kp: 'kp_q18', steps: [
  { t: 'task', say: 'q18_intro', formats: ['F20', 'F18', 'F19'], strands: ['T-ORDEN'], slot: 'parade', lead: ['F79', 'F20'] },
  { t: 'task', say: 'q18_s2', formats: ['F18', 'F20'], strands: ['T-ORDEN'], slot: 'parade', lead: ['F58'] },
], done: { say: 'q18_done', party: true } };
D.Q19 = { giver: 'konge', name: 'Hatte-tårnet', word: 'hatt', coins: [12, 16], kp: 'kp_q19', steps: [
  { t: 'task', say: 'q19_intro', sayL: ['q_hei'], formats: ['F33', 'F39'], strands: ['SKRIV'], need: 'fin', after: 'wear' },
  { t: 'task', say: 'q19_s2', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], hats: true, params: { model: 'hatt' }, slot: 'taarn', fit: ['F09', 'F06', 'F08'], other: ['q19_s2b', null] },
], done: { say: 'q19_done', sayOk: () => !!Quest._hatsCounted, sayAlt: 'life_takk', react: ['cheer'] } };   // (review #3) «hattetårn» only after counted hats
// villager quests (the giver is whoever offers it; voices vm/vk/barn)
D.Q13 = { giver: null, name: 'Den tapte tingen', word: 'nøkkel', coins: [10, 14], kp: 'kp_q13', steps: [
  { t: 'task', say: 'q13_intro', formats: ['F23', 'F26'], strands: ['LES'], noteKind: 'clue', good: 'nøkkel' },
  { t: 'go', obj: { model: 'nøkkel', alt: 'life_gaveeske', near: 'giver', dist: 11, width: 0.45, lost: true } },
  { t: 'back' },
], done: { say: 'q13_done', react: ['cheer'] } };
D.Q14 = { giver: null, name: 'Bakerens bestilling', word: 'bolle', coins: [12, 16], kp: 'kp_q14', steps: [
  { t: 'task', say: 'q14_intro', formats: ['F09', 'F06', 'F08'], strands: ['T-MENGDE'], params: { model: 'bolle' }, slot: 'bake', lead: ['F48', 'F10'] },
  { t: 'task', say: 'q14_s2', formats: ['F02'], strands: ['T-NAVN', 'T-ORDEN'], village: true, slot: ['F02', 'F49', 'F44'] },
], done: { say: 'q14_done', react: ['eat', 'bolle'] } };
D.Q15 = { giver: null, name: 'Sauene har rømt', word: 'sau', coins: [10, 14], kp: 'kp_q15', steps: [
  { t: 'task', say: 'q15_intro', formats: ['F08', 'F06', 'F09'], strands: ['T-MENGDE'], params: { model: 'sau' }, slot: 'gard', theme: 'sau', fit: ['F08', 'F06', 'F09'], other: ['q15_intro2', null] },
  { t: 'task', say: 'q15_s2', formats: ['F19', 'F18'], strands: ['T-ORDEN'], slot: 'gjerde', theme: 'sau' },
], done: { say: 'q15_done', react: ['cheer'] } };
D.Q16 = { giver: null, name: 'Bygg en bro', word: 'bro', coins: [14, 18], kp: 'kp_q16', steps: [
  { t: 'task', say: 'q16_intro', formats: ['F33', 'F35', 'F40'], word: 'bro', strand: 'SKRIV', strands: ['SKRIV'], after: 'bridge' },
], done: { say: 'q16_done', sayOk: g => !!g._bridgeOK, sayAlt: 'life_takk', party: true } };
// Q17 «Ny nabo»: write HUS on an empty village plot → the house assembles there (saved via F.W.addThing, numbered 10–20) →
// write the newcomer's name (F40) → the new neighbour steps out and waves. Offered by villagers next to an empty plot.
D.Q17 = { giver: null, name: 'Ny nabo', word: 'hus', coins: [15, 20], kp: 'kp_q17', when: a => !!emptyPlotNear(a), steps: [
  { t: 'talk', say: 'q17_intro' },
  { t: 'task', at: 'obj', formats: ['F33', 'F35', 'F40'], word: 'hus', strand: 'SKRIV', strands: ['SKRIV'],
    obj: { find: /tomt/, where: t => plotFree(t), near: 'giver', findRadius: 60, model: 'p_tomt', alt: 'life_gaveeske', width: 2.4 }, onDone: (id, th) => buildHouse(id, th) },
  { t: 'task', say: 'q17_s2', formats: ['F40'], strands: ['SKRIV'], params: { kind: 'name' }, onDone: id => moveIn(id) },
], done: { say: 'q17_done', party: true } };
// Q20 «Jeg fryser!» (any NPC): Ordmagi for the need «varme» – lue, vott, skjerf, teppe, jakke, sol, peis, sokk … all are right
D.Q20 = { giver: null, name: 'Jeg fryser!', word: 'lue', coins: [10, 12], kp: 'kp_q20', start: a => { a.shiver = true; a.gesture('shiver', 2); }, steps: [
  { t: 'task', say: 'life_kald', formats: ['F33', 'F39'], strands: ['SKRIV'], need: 'kald', after: 'warm', params: { kind: 'need', needTag: 'varme', tag: 'varme' } },
], done: { say: 'life_varm', react: ['cheer'] } };
// Q21 «Markedsdagen» (event, every 3rd day): 5 customers at her stall in a rush → gentle fireworks. Coins = the sales themselves.
D.Q21 = { giver: null, event: true, name: 'Markedsdagen', word: 'bod', coins: null, kp: 'kp_q21', steps: [
  { t: 'stall', n: 5 },
], done: { fn: () => marketDone() } };
const POOL = { konge: ['Q1', 'Q2', 'Q12', 'Q19'], dronning: ['Q5', 'Q6', 'Q11'], mia: ['Q4', 'Q7', 'Q10'], kokk: ['Q8'], per: ['Q3'], siv: ['Q9'], rolf: ['Q18'] };
const POOL_JOB = { baker: ['Q14', 'Q13', 'Q17'], gjeter: ['Q15', 'Q13', 'Q17'], bonde: ['Q15', 'Q13', 'Q17'], fisker: ['Q16', 'Q13'], batmann: ['Q16', 'Q13'],
  maler: ['Q17', 'Q13'], musikant: ['Q13', 'Q17'], bestemor: ['Q17', 'Q13'], bestefar: ['Q17', 'Q13'], blomsterselger: ['Q13', 'Q17'], leketoysmaker: ['Q17', 'Q13'] };
Quest.POOL = POOL; Quest.POOL_JOB = POOL_JOB;
const poolOf0 = a => POOL[a.id] || (a.id && a.id.startsWith('v_') ? (POOL_JOB[a.job] || ['Q13']) : []);
const poolOf = a => poolOf0(a).filter(id => unlocked(id));
/* v5c WP-Q: the quest-unlock calendar (longevity_plan §1.1: «stories start repeating in week 2»). New quest kinds arrive over the
   first ~3–4 weeks of play days (F.save.day counts days she played: 6 kinds on day 1, ≈ 13 in week 1, 6 more in week 2, the last on
   play day 20) instead of all 19 on day 1. Every giver of the morning post (konge, dronning, mia) has 2 quests from day 2 (Pip always
   brings 3 envelopes; the 2-day gap then alternates them). A quest she already did stays open
   (old saves lose nothing); Quest.start / F.dbg.quest are never gated. Quest.unlocked(id), Quest.UNLOCK {id: play day},
   Quest.calOff = true switches the calendar off. Chains: H1 day 1, H2 day 2, H3 day 4. */
const UNLOCK = { Q1: 1, Q6: 1, Q7: 1, Q10: 1, Q13: 1, H1: 1, Q2: 2, Q5: 2, Q14: 2, Q8: 3, H2: 3, Q3: 5, Q15: 6, Q19: 7, H3: 8, Q9: 8,
  Q20: 9, Q11: 10, Q18: 11, Q4: 13, Q16: 14, Q12: 17, Q17: 20 };
function unlocked(id) {
  const base = String(id).split('~')[0], d = UNLOCK[base];
  if (Quest.calOff || !d || (F.save.day || 1) >= d) return true;
  const q = QS(); return !!(q.done[base] && q.done[base].length);
}
Quest.UNLOCK = UNLOCK; Quest.unlocked = unlocked;
// what opens next (for the parent page / tests): [{id, day}] of quests still waiting, soonest first
Quest.upcoming = () => Object.keys(UNLOCK).filter(id => !unlocked(id)).map(id => ({ id, day: UNLOCK[id] })).sort((a, b) => a.day - b.day);
Quest.runningFor = gid => { const q = QS(); return Object.keys(q.list).find(id => q.list[id].giver === gid) || null; };

/* ---------------------------------------------------------- quest runtime */
Quest.state = id => QS().list[id] || null;
Quest.offer = function (npc, o) {
  o = o || {};
  const a = typeof npc === 'string' ? F.Act.byId(npc) : npc; if (!a) return null;
  const q = QS(), day = F.save.day || 1;
  const running = Object.keys(q.list).find(id => q.list[id].giver === a.id);
  if (running) { Quest.start(running); return running; }
  const can = id => !D[id].when || D[id].when(a);
  const gapOK = id => { const d = q.done[id] || []; return !d.length || day - d[d.length - 1] >= (D[id].every || 2); };
  const pool = poolOf(a).filter(id => gapOK(id) && !q.list[id] && can(id));
  const all = poolOf(a).filter(id => !q.list[id] && can(id) && (!D[id].every || gapOK(id)));
  const id = pool.length ? U.pick(F.rand, pool) : (all.length && !o.fresh) ? U.pick(F.rand, all) : null;
  if (!id) return null;
  Quest.start(id, a.id, { offer: true });
  return id;
};
/* v5r2 (world review, Q13 at boot): an OFFER is only a gold bubble. A villager's bubble roll (Quest.offer, Q20's shiver) writes the
   quest with st.offer = true: it is not the active quest, not a HUD target, not «busy» and does not hold back Puff's «Du har post!» –
   until she taps the bubble (runStep → accept) or answers its need by her own cast (advance). An offer she never took is dropped at
   the next day start. Quest.start(id, giver, {offer}) marks a new entry; {accept} (F.dbg.quest) takes it at once. */
Quest.start = function (id, giverId, o) {
  o = o || {};
  const d = defOf(id); if (!d) return null;
  const q = QS(), fresh = !q.list[id];
  const st = q.list[id] = q.list[id] || { id, step: 0, giver: giverId || d.giver, day: F.save.day || 1 };
  if (fresh && o.offer) st.offer = true; else if (o.accept) delete st.offer;
  if (o.letter) st.letter = true;
  // clarity §3.1-2: a letter start does not take the «now» goal while another goal is live (the goal card keeps what she works on)
  const otherLive = () => liveIds().some(k => k !== id) || rqLive() || !!Quest.storyPending;
  if (!st.offer && !(o.letter && otherLive())) { q.active = { id, step: st.step, giver: st.giver }; q.activeT = Date.now(); }
  F.store();
  const g = F.Act.byId(st.giver);
  if (g && d.start && !st.started) { try { d.start(g); } catch (e) {} }
  st.started = true;
  F.emit('questStart', id);
  setupStep(id);
  goalSoon();
  return st;
};
function giverOf(id) { const st = QS().list[id]; return st ? F.Act.byId(st.giver) : null; }
// v5r2: she took an offer (tapped its bubble): from now on it is her quest – the active one, the HUD target; clarity R3: its
// bubble turns gold now (an offer is white: «I wish for this. Will you help?»)
function accept(id) {
  const q = QS(), st = q.list[id]; if (!st || !st.offer) return;
  delete st.offer; st.accepted = true;
  q.active = { id, step: st.step, giver: st.giver }; q.activeT = Date.now(); F.store();
  const g = giverOf(id); if (g && g.wish && g.wish.questId === id && !g.wish.gold) { g.wish.gold = true; g.wishChanged = true; }
  goalSoon();
}
Quest.accept = accept;
// clarity §3.1-7: a step that only says «come back» – the quest's work is done (no step left, or a plain 'back' step)
const backStep = step => !step || (step.t === 'back' && !step.say);
function setupStep(id) {
  const d = defOf(id), st = QS().list[id]; if (!d || !st) return;
  const step = d.steps[st.step];
  const g = giverOf(id), gold = !st.offer;
  if (backStep(step) && !d.chain) { // all work done → it ends next to the giver (event quests without a giver finish by themselves)
    if (g) g.setWish({ kind: 'quest', gold, done: true, questId: id, model: firstModel([st.vars && st.vars.w, d.word, 'life_gaveeske']), onPress: () => (step ? runStep(id, g) : finish(id)) });
    else F.T.timeout(() => finish(id), 400);
    markOn(null);
    return;
  }
  if (!step) { // a chain past its last step (an interrupted visit): its gold bubble finishes it
    if (g) g.setWish({ kind: 'quest', gold, questId: id, model: firstModel([d.word, 'life_gaveeske']), onPress: () => finish(id) });
    else F.T.timeout(() => finish(id), 400);
    return;
  }
  if (step.t === 'stall') { markOn(null); return; }      // clarity R3: the market-day rush is an event, not her goal – the customers' own bubbles show it
  // DESIGN2 §7.4 step types: travel {realm} (the kingdom gate), shop {shop} (a purchase there), deliver {actor, item|letter}
  if (step.t === 'travel' || step.t === 'shop') { if (g && g.wish && g.wish.questId === id) g.clearWish(); markOn(null); return; }
  if (step.t === 'deliver') {
    if (g && g.wish && g.wish.questId === id && g.id !== step.actor) g.clearWish();
    const to = F.Act.byId(step.actor);
    if (to) to.setWish({ kind: 'quest', gold, questId: id, model: firstModel([step.item, step.letter ? 'brev' : null, 'life_gaveeske']), onPress: () => deliverDone(id) });
    markOn(null); return;
  }
  if (step.t === 'task' && step.at !== 'obj' || step.t === 'back' || step.t === 'talk') {
    if (g) g.setWish({ kind: 'quest', gold, questId: id, model: firstModel([st.vars && st.vars.w, d.word, 'life_gaveeske']), need: step.need || null, onPress: a => runStep(id, a) });
    markOn(null);
  } else {
    if (g && g.wish && g.wish.questId === id) g.clearWish();
    const th = questObj(id, step, g);
    markOn(th);
  }
}
// find or spawn the thing a 'go'/'obj' step points at
function questObj(id, step, g) {
  const st = QS().list[id], o = step.obj || {};
  const key = 'q_' + id + '_' + st.step;
  if (step.keepObj && st.lastObj && F.Things.byId(st.lastObj)) { const th = F.Things.byId(st.lastObj); th.data.quest = id; th.data.step = st.step; return th; }
  let th = F.Things.byId(key);
  if (th) return th;
  // an existing thing of the right kind near the giver
  if (o.find && g) {
    const rr = o.findRadius || 25;
    const cand = F.Things.list.filter(t => t.space === g.space && t.type !== 'life_actor' && o.find.test(t.type + ' ' + (t.def.name || '') + ' ' + ((t.data && t.data.shop) || '')) && Math.hypot(t.x - g.x, t.z - g.z) < rr && (!o.where || o.where(t)));
    // indoors the floors share x/z: keep only things on the giver's floor, same room first
    if (g.space === 'in' && g.room && F.Castle && F.Castle.rooms) {
      const RM = F.Castle.rooms, gf = RM[g.room] ? RM[g.room].floor : null;
      for (let i = cand.length - 1; i >= 0; i--) { const t = cand[i], tf = t.room && RM[t.room] ? RM[t.room].floor : t.floor; if (t.room !== g.room && (gf == null || tf !== gf)) cand.splice(i, 1); }
    }
    const dq = t => Math.hypot(t.x - g.x, t.z - g.z) + (g.room && t.room !== g.room ? 1000 : 0);
    cand.sort((a, b) => dq(a) - dq(b));
    if (cand.length) { const t = cand[0]; t._quest = { id, step: st.step }; t._markModel = firstModel([o.model, o.alt, t.type]); st.target = t.id; F.store(); return t; }
  }
  // spawn a quest object
  let p = null;
  if (o.room != null) { const rp = F.Act.roomPos(o.room); if (rp) p = { space: 'in', x: rp.x - 2.5, z: rp.z + 0.5, room: rp.room }; }
  if (!p && o.zone) { const zp = F.Act.parkPos(o.zone); const fs = F.Act.freeSpot(zp.x + 4, zp.z + 3, 'out'); p = { space: 'out', x: fs.x, z: fs.z }; }
  if (!p && o.village && F.W && F.W.villages && g) {
    try { const vs = F.W.villages({ x: g.x, z: g.z }, 140) || []; const v = vs[0]; if (v && v.houses && v.houses.length) { const h = v.houses[0]; p = { space: 'out', x: h.x + 2, z: h.z + 2 }; } } catch (e) { p = null; }
  }
  if (!p) {
    const base = g ? { space: g.space, x: g.x, z: g.z } : { space: F.Space.cur, x: F.Player.pos.x, z: F.Player.pos.z };
    const ang = (g ? g.heading : 0) + 1.1 + st.step, dist = o.dist || 3;
    const fs = F.Act.freeSpot(base.x + Math.sin(ang) * dist, base.z + Math.cos(ang) * dist, base.space);
    p = { space: base.space, x: fs.x, z: fs.z };
  }
  th = F.Things.spawn('life_qobj', p.x, p.z, { id: key, space: p.space, data: { model: o.model, alt: o.alt, width: o.width || 0.8, quest: id, step: st.step } });
  st.target = th.id; st.lastObj = th.id; F.store();
  F.FX.sparkle(V3(p.x, (th.y || 0) + 0.6, p.z), 0xffe27a);
  return th;
}
// pressing any thing: is it the target of a 'go'/'obj' step?
F.on('pressed', th => {
  if (!th || th.type === 'life_qobj' || !th._quest) return;
  const { id, step } = th._quest; const st = QS().list[id];
  if (st && st.step === step) { th._quest = null; Quest.onObj(Object.assign(th, { data: Object.assign(th.data || {}, { quest: id, step }) }), true); }
});
let stepBusy = false;
// v3: every quest keeps the outcome of each of its tasks (rewards per first-try answer, chain stars)
function noteOutcome(id, res) {
  const st = QS().list[id]; if (!st || !res || res.skipped || !res.outcome) return;
  (st.outcomes = st.outcomes || []).push(res.outcome); F.store();
  if (st.chain) showStrip(id);
}
const bundleOf = (id, st) => 'q:' + id + ':' + ((st && st.day) || 0);
Quest.onObj = async function (th, already) {
  const id = th.data && th.data.quest; const st = id && QS().list[id];
  if (!st || st.step !== th.data.step) { if (!already) { F.FX.pop(th.obj); F.sfx.boing(); } return; }
  if (stepBusy) return;
  const d = defOf(id), step = d.steps[st.step];
  stepBusy = true;
  try {
    F.FX.pop(th.obj);
    if (step.t === 'go') { F.sfx.chime(); F.FX.burst(V3(th.x, (th.y || 0) + 0.8, th.z), { n: 22 }); await F.T.sleep(400); advance(id, th); return; }
    const res = await runTask(step, Object.assign({ thing: th, place: step.obj && step.obj.village ? 'village' : (step.formats[0] === 'F12' ? 'shop' : id), quest: id, bundle: bundleOf(id, st) }, noteCtx(step)), null);
    if (!res || res.aborted) return;
    noteOutcome(id, res);
    if (step.onDone) { try { await step.onDone(id, th, res); } catch (e) { console.error('[Quest] onDone', id, e); } }
    advance(id, th);
  } finally { stepBusy = false; }
};
async function runStep(id, a) {
  if (!defOf(id) || !QS().list[id]) return;
  if (!defOf(id).steps[QS().list[id].step]) return finish(id);
  if (stepBusy) return;
  stepBusy = true;
  accept(id);
  let done = false;
  const chainA = defOf(id).chain ? a : null; if (chainA) { chainA._chainQuiet = true; F.emit('activity', 'help', true); }
  try {
    // a helping chain (v3) runs all its task steps in one visit; a classic quest runs one step per tap
    for (let guard = 0; guard < 6; guard++) {
      const d = defOf(id), st = QS().list[id]; if (!d || !st) return;
      let step = d.steps[st.step];
      if (!step) { done = true; return; }
      if (step.prep) { try { step = step.prep(step, a) || step; } catch (e) { console.warn('[Quest] prep', e); } }
      a.facePlayer();
      if (step.t === 'back' || step.t === 'talk') { if (step.say) await a.say(step.say); advance(id, a); return; }
      const ctx = Object.assign({ npc: a, thing: a.th, place: step.village && a.id && a.id.startsWith('v_') ? 'village' : (a.job || a.role), need: step.need || null, quest: id, bundle: bundleOf(id, st) }, noteCtx(step));
      // a story word (e.g. «fest»): only promise it when the bank can really make that item
      let pre = null;
      if (step.word != null && step.sayAlt) { const av = step.formats.filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f)); pre = makeItem(av, step); }
      // v5c WP-Q: a story slot – the item first (the engine's pick among the story-compatible formats at her level), then the lines
      // that fit the served format (step.fit: the formats the written lines describe; other formats get step.other)
      else if (step.slot && !d.chain) pre = slotItem(slotOf(step, st), ctx, { said: lineTexts([step.say, step.say2].concat(step.other || [], step.sayL || [])) });
      // (review #3) a story slot with nothing at her level: the engine's free pick follows – the giver's generic line, never the
      // story line of a format that is not served (Q8 «Nå trenger jeg egg!» before F11)
      const [l1, l2] = stepLines(step, pre ? pre.format : step.slot && step.fit && !d.chain ? '-' : null);
      const line = step.sayAlt && !pre ? step.sayAlt : l1;
      // clarity §3.1-4: the letter already told the premise (brev_<qid>) – in person the giver greets (step.sayL); the task's own prompt
      // asks (verify 2nd round: «Der er du!» + q1_ask + «Jeg er så sulten!» + «Skriv noe som kan hjelpe!» was the king asking 3 times)
      const lead = st.letter && st.step === 0 && step.sayL && line === step.say ? step.sayL.filter(x => F.TPL.has(x)) : null;
      if (lead && lead.length && !d.chain) { for (const x of lead) await a.say(x); }
      else if (line && !d.chain) await a.say(line);
      if (l2) await a.say(l2);
      if (step.need) { a.wish = Object.assign({}, a.wish, { need: step.need }); }
      if (d.chain) showStrip(id);
      const res = d.chain ? await chainTask(step, ctx, st, a) : pre ? await F.Task.run(pre, ctx) : await runTask(step.sayAlt ? Object.assign({}, step, { word: null }) : step, ctx, a);
      if (!res || res.aborted) return;
      noteOutcome(id, res);
      if (d.chain) chainLearn(st, step);
      // (v5c WP-Q: only a count of HATS puts that many hats on – another served format of the slot ends with a small hat tower of 3)
      if (step.hats) { const li = F.Task.lastResult && F.Task.lastResult.item, n = li && COUNT_FMTS.includes(String(li.format)) ? +li.target : li ? 3 : 0; Quest._hatsCounted = !!(li && COUNT_FMTS.includes(String(li.format))); const hm = firstModel(['hatt', 'w_solhatt', 'w_litenkrone']); if (n > 0 && hm) { a.unwearHats(); a.wear(hm, Math.min(n, 20)); a.gesture('dance', 2.4); F.sfx.levelup(); } }
      else if (step.after === 'bridge') a._bridgeOK = await bridgeFor(a);
      else if (step.after === 'wear') { const w = F.Task.lastResult && F.Task.lastResult.item ? (F.Task.lastResult.chosen || []).slice(-1)[0] || F.Task.lastResult.item.word : null;
        // v5 WP-W (logic #25): «Den passer perfekt!» only for something one can wear (klær / pynt), else a plain cheer
        const we = w && F.WORDS && F.WORDS.get ? F.WORDS.get(String(w).toLowerCase()) : null, wearable = !!(we && we.tags && (we.tags.includes('klær') || we.tags.includes('pynt')));
        if (w && F.VOX.has(w) && wearable) await a.react('wear', w); else await a.react('cheer'); }
      else if (step.after === 'warm') { const w = F.Task.lastResult && F.Task.lastResult.item ? (F.Task.lastResult.chosen || []).slice(-1)[0] || F.Task.lastResult.item.word : null; a.shiver = false; await a.react('warm', w && F.VOX.has(w) ? w : null); }
      else if (step.after) await a.react(step.after, null);
      if (step.onDone) { try { await step.onDone(id, a, res); } catch (e) { console.error('[Quest] onDone', id, e); } }
      advance(id, a);
      if (!d.chain) return;
      const st2 = QS().list[id], d2 = defOf(id), nx = st2 && d2 && d2.steps[st2.step];
      if (!nx) { done = true; return; }
      if (nx.t !== 'task') return;
      // between steps: a short breath; the star strip shows how far she is (natural audit: no «Neste steg!» / «To steg til!» – the
      // strip says it). Only the last step is named («Nå er det siste steg!»), so she knows the end is near.
      a.gesture('nod', 0.8);
      await F.T.sleep(450);
      const left = d2.steps.length - st2.step;
      if (left <= 1) await F.SAY('h_siste'); else { F.sfx.chime && F.sfx.chime(); await F.T.sleep(500); }
    }
  } finally {
    stepBusy = false;
    if (chainA) chainA._chainQuiet = false;
    if (chainA && !done && stripId === id) { if (stripT) clearTimeout(stripT); stripT = setTimeout(() => { if (stripEl) stripEl.style.opacity = '0'; }, 3000); }   // interrupted: the gold bubble keeps the rest
    try { if (done) await finish(id); }
    finally { if (chainA) F.emit('activity', 'help', false); }        // the break / party may come after the thank-you
  }
}
// v5 WP-W (logic #37): Q16 «Bygg en bro» – after she wrote the word a little bridge assembles in front of the villager (25 s), who walks
// over it; when the word was not «bro» the villager still thanks her but no bridge is promised (q16_done only after a bridge).
async function bridgeFor(a) {
  const lr = F.Task.lastResult, w = lr && lr.item ? String((lr.chosen || []).slice(-1)[0] || lr.item.word || '').toLowerCase() : '';
  if (w !== 'bro' || !a || a.space !== 'out') return false;
  try {
    const mid = ['v_bro', 'o_bro'].find(m => F.VOX.has(m)); if (!mid) return false;
    const m = F.VOX.make(mid, {}), ang = a.heading || 0, x = a.x + Math.sin(ang) * 2.4, z = a.z + Math.cos(ang) * 2.4;
    m.position.set(x, F.Space.impl.out.heightAt(x, z), z); m.rotation.y = ang + Math.PI / 2; m.scale.setScalar(0.01);
    F.Space.scene('out').add(m); F.sfx.grow ? F.sfx.grow() : F.sfx.magic();
    await F.T.tween(900, k => m.scale.setScalar(Math.max(0.01, F.BEH && F.BEH.util ? F.BEH.util.ease.back(k) : k)));
    F.FX.burst(m.position.clone().add(V3(0, 0.8, 0)), { n: 30 });
    F.T.timeout(() => { F.FX.sparkle(m.position.clone()); m.parent && m.parent.remove(m); }, 25000);
    a.gesture('cheer', 1.4);
    return true;
  } catch (e) { console.warn('[Quest] bridge', e); return false; }
}
// v5r fix1 (review #2, logic audit #9): the KIND of note a step's F23 reads – step.noteKind 'clue' | 'letter' | 'list' | 'order' (none =
// 'wish'); only a wish is handed over to the reader. step.good = the word the clue must name (Q13: the lost key) – F23 retargets to it
// when the word has a model, else keeps its own word (the prompt is still a clue, never «Hva ønsker jeg meg?»)
function noteCtx(step) { const o = {}; if (step && step.noteKind) o.noteKind = step.noteKind; if (step && step.good) o.good = step.good; return o; }
Quest.noteCtx = noteCtx;
// run a task for a step: a quest-specific word/number when the bank can make it, else the engine's pick among the step's formats
// v5 WP-W (logic #4): a counting step's model must be a real model (else no model at all: never a wrong noun)
const modelOK = p => { if (!p || p.model == null) return p; if (F.VOX.has(p.model)) return p; const q = Object.assign({}, p); delete q.model; return Object.keys(q).length ? q : undefined; };
// v5c WP-Q: the slot of a quest step: its named / listed format set, its model (the envelope card's word when the step takes it), lead
function slotOf(step, st) {
  const formats = typeof step.slot === 'function' ? step.slot((st && st.vars) || {}) : Array.isArray(step.slot) ? step.slot : SLOT[step.slot] || step.formats;
  let model = step.params && step.params.model;
  const w = st && st.vars && st.vars.w;
  if (step.wModel && w && F.VOX.has(w)) model = w;
  return { formats, model: model && F.VOX.has(model) ? model : null, lead: step.lead || null, leadP: step.leadP, word: step.word || null, theme: step.theme || null };
}
Quest.slotOf = slotOf;
// the lines for the served format: step.fit lists the formats the written lines (say / say2) describe; any other served format of the
// slot gets step.other = [line, line2] (a generic line of the giver); no fit list = the lines are generic
function stepLines(step, fid) {
  if (!fid || !step.fit || step.fit.includes(fid)) return [step.say || null, step.say2 || null];
  const o = step.other || [step.say || null, null];
  return [o[0] || null, o[1] || null];
}
async function runTask(step, ctx, a) {
  if (step.params) step = Object.assign({}, step, { params: modelOK(step.params) });
  // v5c WP-Q: a story-slot step at a thing (Q3 the mailbox, Q5 the market): the engine's pick among the slot's formats at her level;
  // the narrator bridges a format the place does not explain by itself (Q3: Per's letter read aloud → «Hør godt etter!»)
  if (step.slot && step.word == null && step.target == null) {
    const st = ctx && ctx.quest ? QS().list[ctx.quest] : null;
    const it = slotItem(slotOf(step, st), ctx, {});
    if (it) {
      const nl = step.sayN2 && step.sayN2[it.format];
      if (nl && F.TPL.has(nl)) await F.SAY(nl);
      return F.Task.run(it, ctx);
    }
  }
  let formats = step.formats.slice();
  if (step.topOnly && F.Eco.strandRung('T-MENGDE') < 10) formats = formats.filter(f => f !== step.topOnly);
  const avail = formats.filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f));
  if (!avail.length) { console.warn('[Quest] no format available for', formats.join(','), '- step skipped'); return { outcome: 'A', skipped: true }; }
  if (step.word != null || step.target != null) {
    const item = makeItem(avail, step);
    if (item) { if (step.params) item.params = Object.assign({}, item.params || {}, step.params); return F.Task.run(item, ctx); }
  }
  return Quest.task(avail, ctx, { strands: step.strands, need: step.need, params: step.params, prefer: step.prefer });
}
// one task among `formats`, restricted to the story's strands / need tag when the engine can; else the engine's free pick
const NEED_TAG = { sulten: 'spise', tørst: 'drikke', kald: 'varme', trøtt: 'sove', sitte: 'sitte', kjed: 'leke', fin: 'pynt', dyr: 'kjæledyr' };
Quest.NEED_TAG = NEED_TAG;
Quest.task = async function (formats, ctx, o) {
  o = o || {};
  if (F.Task.current) return null;
  const avail = formats.filter(f => F.Task.resolveFormat && F.Task.resolveFormat(f));
  let item = null;
  if (F.LEARN && F.LEARN.next && (o.strands || o.need)) {
    try {
      item = F.LEARN.next({ formats: avail, strands: o.strands, need: o.need ? NEED_TAG[o.need] || o.need : undefined, prefer: o.prefer, place: ctx.place, npcRole: ctx.npc && ctx.npc.role,
        npc: ctx.npc ? ctx.npc.id : undefined, rng: F.rand, now: Date.now(), avoid: [], last: (F.Task.recent && (F.Task.recent.slice(-1)[0] || {}).format) || null });
    } catch (e) { console.warn('[Quest] LEARN.next', e); item = null; }
  }
  // a scripted format (e.g. F40 «write the neighbour's name») when the engine has nothing at her level here: a practice item
  if (!item && o.params && F.LEARN && F.LEARN.next && avail.length) {
    try {
      const fid = F.Task.resolveFormat(avail[0]), spec = F.Task.defs[fid], st = Object.keys(spec.strands || {})[0];
      if (st) { const [r0, r1] = spec.strands[st], S = ((F.LEARN.summary() || {}).strands || {})[st] || {};
        item = F.LEARN.next({ formats: [fid], force: { strand: st, rung: U.clamp(S.rung || r0, r0, r1), sup: 1, format: fid, kind: 'practice' }, rng: F.rand, now: Date.now() }); }
    } catch (e) { item = null; }
  }
  if (item && o.params) item.params = Object.assign({}, item.params || {}, o.params);
  if (item && F.Task.resolveFormat(item.format)) return F.Task.run(item, ctx);
  return F.Task.offer({ formats: avail, ctx, strands: o.strands, prefer: o.prefer });
};
function makeItem(formats, step) {
  try {
    const want = step.word != null ? step.word : step.target;
    const we = step.word != null && F.WORDS && F.WORDS.get ? F.WORDS.get(step.word) : null;
    for (const f of formats) {
      const fid = F.Task.resolveFormat(f), spec = F.Task.defs[fid];
      const strands = spec.strands || {};
      const strand = step.strand && strands[step.strand] ? step.strand : Object.keys(strands)[0];
      if (!strand) continue;
      const S = (F.LEARN.summary() || {}).strands || {}, cur = S[strand] || {};
      const [r0, r1] = strands[strand];
      const wr = we && we.rung ? (we.rung[strand] || we.rung[/LES/.test(strand) ? 'LES' : 'SKRIV']) : null;
      const rung = U.clamp(Math.max(cur.rung || r0, wr || 0), r0, r1), sup = cur.sup != null ? cur.sup : 1;
      const kind = wr && wr > (cur.rung || 1) + 1 ? 'practice' : 'normal';
      let g = null;
      if (F.LEARN.next) g = F.LEARN.next({ formats: [fid], force: { strand, rung, sup, target: want, format: fid, kind }, npc: 'quest', rng: F.rand, now: Date.now() });
      if (!g && F.BANKS && F.BANKS.gen) g = F.BANKS.gen(strand, rung, sup, { kind, key: strand + ':' + want, target: want, format: fid, rng: F.rand, conf: {} });
      const got = g && (g.word != null ? g.word : g.target);
      if (g && String(got) === String(want)) return Object.assign({ id: 'q_' + Math.round(F.T.now * 1000), strand, rung, sup, kind }, g, { format: fid });
    }
  } catch (e) { console.warn('[Quest] makeItem', e); }
  return null;
}
function deliverDone(id) {
  const st = QS().list[id], d = defOf(id), step = st && d && d.steps[st.step]; if (!step || step.t !== 'deliver') return;
  const to = F.Act.byId(step.actor); if (to && to.wish && to.wish.questId === id) to.clearWish();
  if (to) { to.facePlayer(); if (F.Act.hearts) F.Act.hearts(to.headPos()); }
  F.sfx.chime(); advance(id, null);
}
function stepTarget(step) {
  if (!step) return null;
  if (step.t === 'travel' && step.realm && F.Realm && F.Realm.gate) { const gt = F.Realm.gate(step.realm); return gt ? { space: 'out', x: gt.x, z: gt.z, realm: step.realm, travel: true } : null; }
  if (step.t === 'deliver') { const a = F.Act.byId(step.actor); return a ? { space: a.space, x: a.x, z: a.z, actor: a.id, room: a.room, bld: a.bld || null, realm: a.royal || null } : null; }
  if (step.t === 'shop') {
    const th = F.Things.list.find(t => t.data && t.data.shop === step.shop);
    if (th) return { space: th.space, x: th.x, z: th.z, thing: th.id };
    const rid = F.Towns && F.Towns.realmOf ? F.Towns.realmOf(step.shop) : null, sp = rid && F.Realm && F.Realm.spot ? F.Realm.spot(rid, 'stall0') : null;
    return sp && sp.x != null ? { space: 'out', x: sp.x, z: sp.z, realm: rid } : null;
  }
  return null;
}
const curStep = id => { const st = QS().list[id], d = st && defOf(id); return d ? d.steps[st.step] : null; };
F.on('shopBuy', shopId => { for (const id in QS().list) { const sp = curStep(id); if (sp && sp.t === 'shop' && sp.shop === shopId) advance(id, null); } });
F.on('realmFound', rid => { for (const id in QS().list) { const sp = curStep(id); if (sp && sp.t === 'travel' && sp.realm === rid) advance(id, null); } });
let stAcc = 0;
F.on('tick', dt => {
  stAcc += dt; if (stAcc < 0.5) return; stAcc = 0;
  if (!F.booted || F.Task.current) return;
  const P = F.Player.pos;
  for (const id in QS().list) {
    const sp = curStep(id); if (!sp) continue;
    if (sp.t === 'travel' && F.Space.cur === 'out' && F.Realm && F.Realm.gate) { const gt = F.Realm.gate(sp.realm); if (gt && Math.hypot(gt.x - P.x, gt.z - P.z) < 45) advance(id, null); }
    else if (sp.t === 'deliver') { const a = F.Act.byId(sp.actor); if (a && !a.busy && a.space === F.Space.cur && Math.hypot(a.x - P.x, a.z - P.z) < 2.4) deliverDone(id); }
  }
  // clarity §3.1-7: the work is done and she arrives next to the giver (≤ 3 m) – the quest ends by itself, no tap needed
  if (stepBusy || (F.UI.isOpen && F.UI.isOpen())) return;
  for (const id in QS().list) {
    const st = QS().list[id], d = defOf(id); if (!d || d.chain || d.event || st.offer || !backStep(d.steps[st.step])) continue;
    const g = giverOf(id); if (g && !g.busy && giverNear(g, 3)) { endNow(id); break; }
  }
});
Quest.stepTarget = stepTarget;
Quest.advance = (id, from) => advance(id, from || null);   // (tests / other owners: a step done elsewhere)
function advance(id, from) {
  const q = QS(), st = q.list[id]; if (!st) return;
  if (st.offer) { delete st.offer; st.accepted = true; }        // v5r2: any progress (Q20 answered by her own cast) takes the offer
  st.step++; q.active = { id, step: st.step, giver: st.giver }; q.activeT = Date.now(); F.store();
  F.emit('questStep', id, st.step);
  const d = defOf(id), next = d.steps[st.step];
  // narrator hint for the next place (a story line only when the clue really was that word)
  const lastWord = F.Task.lastResult && F.Task.lastResult.item ? F.Task.lastResult.item.word : null;
  const sayN = next && next.sayN && (!next.sayIfWord || next.sayIfWord === lastWord) ? next.sayN : null;
  if (sayN && next.sayNRoom) { const n = roomNum(next.sayNRoom); F.T.timeout(() => (n != null ? F.SAY(sayN, { n }) : next.sayN0 && F.TPL.has(next.sayN0) ? F.SAY(next.sayN0) : null), 300); }
  else if (sayN) F.T.timeout(() => F.SAY(sayN), 300);
  // clarity §3.1-6: no «Se etter den gule stjernen!» – the thing wears the gold bubble; a thing step with its own line is said ONCE by
  // the giver when she is near (q1_s3 «Trykk på bordet, så spiser vi!»)
  else if (next && (next.t === 'go' || next.at === 'obj') && next.say && !d.chain) {
    const g = giverOf(id), P = F.Player.pos;
    if (g && g.space === F.Space.cur && Math.hypot(g.x - P.x, g.z - P.z) <= 14 && F.TPL.has(next.say)) F.T.timeout(() => { const s2 = QS().list[id]; if (s2 && s2.step === st.step && !F.Task.current) { s2.saidStep = s2.step; g.say(next.say); } }, 300);
  }
  // remove a finished quest object (unless the next step reuses it)
  if (from && from.type === 'life_qobj' && !(next && next.keepObj)) { const th = from; F.T.timeout(() => { F.FX.burst(V3(th.x, (th.y || 0) + 0.5, th.z), { n: 20 }); F.Things.remove(th); }, 900); }
  setupStep(id);
  if (backStep(next) && !d.chain && !d.event) endPhase(id);
  goalSoon();
}
/* clarity §3.1-7 «a clear end»: the work is done → next to the giver (same space, ≤ 12 m) it finishes at once – no third tap; farther
   away the giver's gold bubble shows ✓ (wish.done), 'questBack'(id, giverId) fires, and arriving within 3 m finishes it (tick below) */
const sameRoomish = g => !!g && g.space === F.Space.cur && !(g.space === 'in' && (g.bld || null) !== ((F.Bld && F.Bld.cur) || null));
function giverNear(g, r) { const P = F.Player.pos; return !!(g && sameRoomish(g) && (!g.here || g.here()) && Math.hypot(g.x - P.x, g.z - P.z) <= r); }
function endPhase(id) {
  const st = QS().list[id]; if (!st) return;
  const g = giverOf(id);
  if (g && giverNear(g, 12)) { st.backT = null; F.T.timeout(() => endNow(id), 500); return; }
  st.backT = Date.now(); F.store();
  if (g) F.emit('questBack', id, g.id);
}
// finish now (a plain 'back' step is stepped over: it only said «come back»)
async function endNow(id) {
  const st = QS().list[id], d = defOf(id); if (!st || !d) return;
  if (stepBusy || F.Task.current) { F.T.timeout(() => endNow(id), 600); return; }
  const step = d.steps[st.step];
  if (step && !backStep(step)) return;
  if (step) { st.step = d.steps.length; F.store(); }
  stepBusy = true;
  try { await finish(id); } finally { stepBusy = false; }
}
Quest.endNow = endNow;
let finishing = 0;
Quest.finishing = () => finishing > 0;
async function finish(id) {
  finishing++;
  try { return await finish0(id); } finally { finishing--; }
}
async function finish0(id) {
  const d = defOf(id), q = QS(), st = q.list[id]; if (!d || !st) return;
  const g = giverOf(id);
  delete q.list[id]; if (q.active && q.active.id === id) q.active = null;
  (q.done[id.split('~')[0]] = q.done[id.split('~')[0]] || []).push(F.save.day || 1);
  F.store();
  markOn(null);
  if (d.chain) return chainFinish(id, st, g);
  if (g) Quest.satisfy(g.id, 'quest');
  if (g) {
    g.clearWish(); g.facePlayer();
    if (d.done.say) await g.say(d.done.sayOk && !d.done.sayOk(g) ? d.done.sayAlt : d.done.say);
    if (g.crownGone) { g.crownGone = false; g.restyle && g.restyle({ hat: 'krone' }); }
    if (d.done.react) await g.react(d.done.react[0], d.done.react[1] || null);
    if (d.done.party) party(g);
    if (d.done.bloom) bloom(g, d.done.bloom);
    if (d.done.tower) tower(g, d.done.tower);
    if (d.done.say2 && (!d.done.short || d.done.short())) await g.say(d.done.say2);
  }
  if (d.done.fn) { try { await d.done.fn(id, g, st); } catch (e) { console.error('[Quest] done.fn', id, e); } }
  // economy §2 (honest coins; DESIGN3 §11.5): the reward follows the answers – 4 per first-try answer, nothing for other answers or a
  // quest without answers (the old 10–20 range is gone: guessing never pays). §1 row 8: no «Du får N mynter!» – the coins fly from the
  // giver into the purse (from her, when the giver cannot pay)
  const outs = st.outcomes || [], nA = outs.filter(o => o === 'A').length;
  const n = !d.coins ? 0 : Quest.PER_A * nA;
  F.sfx.levelup();
  if (n > 0) F.Eco.add(n, { from: payer(g, n) || herPoint(), reason: 'quest' });
  log('questDone', { id, who: d.giver, kp: d.kp, coins: n });
  F.emit('questDone', id, n);
  goalSoon();
}
Quest.finish = finish;
Quest.PER_A = 4;
Quest.PER_A_CHAIN = 2;
// where coins rise when nobody in the world pays them: her own head (always on screen – never the middle of the screen)
function herPoint() { try { const P = F.Player.pos, y = F.Player.obj ? F.Player.obj.position.y : (P.y || 0); return V3(P.x, y + 1.6, P.z); } catch (e) { return null; } }
Quest.herPoint = herPoint;
// v5r fix1 (review #1, logic): the coins of a reward fly from the giver only when the giver can really pay them (F.Eco.payer: the
// home king/queen, kingdom royals, a wallet with ≥ n coins that is not saving); otherwise they come from the castle (screen middle)
function payer(g, n) { try { return g && F.Eco.payer ? F.Eco.payer(g, n) : null; } catch (e) { return null; } }
Quest.payer = payer;
// a quest step that asked for a need was answered by her own free cast (the NPC already got the thing)
// (verify 2nd round, economy §2) her own correct free cast IS a right-first-try answer (the engine logs it as spont): the step counts
// as an A for the finish – unless she only retyped the wand's near-miss ghost (cast.helped) or no cast of hers is known (a code path)
let lastCast = null;
F.on('cast', e => { if (e && e.word) lastCast = { w: String(e.word).toLowerCase(), helped: !!e.helped, free: !!(e.free || e.forNpc), t: F.T.now }; });
function advanceFromCast(id, a, word) {
  const st = QS().list[id]; if (!st) return;
  try { if (F.LEARN && F.LEARN.logSpont) F.LEARN.logSpont(word); } catch (e) { /* engine without spont log */ }
  const c = lastCast, own = !!(c && c.free && !c.helped && c.w === String(word || '').toLowerCase() && F.T.now - c.t < 20);
  if (own) { (st.outcomes = st.outcomes || []).push('A'); F.store(); }
  lastCast = null;
  advance(id, a);
}
function party(g) {
  const P = V3(g.x, g.th.obj.position.y + 2, g.z);
  for (let i = 0; i < 4; i++) F.T.timeout(() => { F.FX.burst(P, { n: 40, speed: 4, up: 5 }); F.sfx.firework(); }, i * 400);
  for (const a of F.Act.near(g.x, g.z, 25, g.space)) a.gesture('dance', 4);
}
function bloom(g, model) {
  if (!F.VOX.has(model)) return;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, x = g.x + Math.cos(a) * 2.2, z = g.z + Math.sin(a) * 2.2;
    const m = F.Act.fitModel(model, {}, 0.45), grp = new THREE.Group(); grp.add(m); grp.position.set(x, F.Space.impl[g.space].heightAt(x, z), z);
    F.Space.scene(g.space).add(grp); F.FX.assemble(model, {}, m, grp.position, { ms: 800 + i * 100 });
    F.T.timeout(() => { F.FX.sparkle(grp.position); grp.parent && grp.parent.remove(grp); }, 60000);
  }
}
function tower(g, model) {
  const id = firstModel([model, 'food_bløtkake', 'kake']); if (!id) return;
  const ang = g.heading, x = g.x + Math.sin(ang) * 1.2, z = g.z + Math.cos(ang) * 1.2, grp = new THREE.Group();
  grp.position.set(x, F.Space.impl[g.space].heightAt(x, z), z); F.Space.scene(g.space).add(grp);
  for (let i = 0; i < 10; i++) { const m = F.Act.fitModel(id, {}, 0.6); m.position.y = i * Math.max(0.06, m.userData.h * 0.9); m.rotation.y = i * 0.4; m.visible = false; grp.add(m); F.T.timeout(() => { m.visible = true; F.FX.pop(m); F.sfx.pop(); }, i * 160); }
  F.T.timeout(() => grp.parent && grp.parent.remove(grp), 60000);
}
function homeTarget() {
  if (Quest.storyPending) { const m = F.Act.byId('mia'); if (m) return { space: m.space, x: m.x, z: m.z, actor: 'mia', room: m.room, bld: m.bld || null }; }
  const q = QS();
  // a helping mission whose villager is not loaded (she left that village) does not hide the other quests' targets
  // v5r2 (world review): nor does an offer she never took (st.offer), nor a quest that has nothing to point at (its villager is not
  // loaded and no quest thing is there – an old save's stray Q13): the next quest with a real target is chosen, else today's post
  // clarity §3.1-2: q.active (the goal she last worked on) first, otherwise the NEAREST goal (seen from outdoors), not key order
  const id = homeGoalId();
  const t = id ? questTarget(id) : null;
  if (t) return Object.assign(t, { qid: id });
  return postTarget();
}
function liveIds() {
  const q = QS();
  // (the market-day rush Q21 is an event, not a goal she took on: it never holds the post back – openGoals – but Puff and the card
  // still show the way to her stall while it runs)
  return Object.keys(q.list).filter(k => { const st = q.list[k], d = st && defOf(k); return !!(st && d && !st.offer && (!d.chain || F.Act.byId(st.giver))); });
}
const rqLive = () => { try { const a = F.save.rq && F.save.rq.active; return !!(a && Object.keys(a).some(k => a[k])); } catch (e) { return false; } };
function homeGoalId() {
  const q = QS(), ids = liveIds().filter(id => !!questTarget(id));
  if (!ids.length) return null;
  if (q.active && ids.includes(q.active.id)) return q.active.id;
  const me = herOutdoor(), dist = id => { const o = outdoorOf(questTarget(id)); return o ? Math.hypot(o.x - me.x, o.z - me.z) : 1e9; };
  return ids.slice().sort((a, b) => dist(a) - dist(b))[0];
}
Quest.homeGoalId = homeGoalId;
function questTarget(id) {
  const st = QS().list[id], dd = defOf(id), step = dd && dd.steps[st.step];
  if (step && step.t === 'stall' && F.Stall && F.Stall.thing) { const s2 = F.Stall.thing; return { space: s2.space, x: s2.x, z: s2.z, thing: s2.id }; }
  const tt = stepTarget(step);
  if (tt) return tt;
  const t = (step && (step.t === 'go' || step.at === 'obj') && st.target && F.Things.byId(st.target)) || null;
  if (t) return { space: t.space, x: t.x, z: t.z, thing: t.id, bld: t.bld || null };
  const g = F.Act.byId(st.giver); return g ? { space: g.space, x: g.x, z: g.z, actor: g.id, room: g.room, bld: g.bld || null } : null;
}
// v5r fix1 (review #11): no quest running but today's post is still waiting → the next goal is the nearest unopened envelope (lying
// anywhere, e.g. laid out at the tower mailbox), else the mailbox while envelopes are tucked in it – glitter trail + HUD «vis vei»
function postWaiting() {
  const day = F.save.day || 1;
  const L = F.Things.list.filter(t => t.type === 'life_brev' && t.obj && t.data && (t.data.day == null || t.data.day === day));
  const boxN = F.Tower && F.Tower.post ? F.Tower.post() : 0;
  return { L, boxN };
}
function postTarget() {
  try {
    const { L, boxN } = postWaiting();
    if (L.length) {
      const me = herOutdoor(); let best = null, bd = Infinity;
      for (const t of L) { const o = outdoorOf({ space: t.space, x: t.x, z: t.z, thing: t.id, bld: t.bld || null }) || { x: t.x, z: t.z }; const d = Math.hypot(o.x - me.x, o.z - me.z); if (d < bd) { bd = d; best = t; } }
      if (best) return { space: best.space, x: best.x, z: best.z, thing: best.id, bld: best.bld || null, post: true };
    }
    const box = boxN > 0 && F.Tower && F.Tower.mailbox ? F.Tower.mailbox() : null;
    if (box) return { space: box.space || 'out', x: box.x, z: box.z, thing: box.id, bld: box.bld || null, post: true };
  } catch (e) { console.warn('[Quest] postTarget', e); }
  return null;
}
Quest.postTarget = postTarget;
// after a quest: when nothing else is running and post is waiting, Puff says once a day «Du har post!» (the trail shows the way)
F.on('questDone', () => F.T.timeout(() => {
  try {
    const q = QS(), day = F.save.day || 1;
    if (q.postSaidDay === day || F.Task.current || (F.UI.isOpen && F.UI.isOpen()) || (F.Onboard && F.Onboard.active)) return;
    // v5r2 (world review): «nothing else is running» = the HUD target IS the post (an untaken villager offer or a quest whose giver
    // is far away no longer silences Puff – and she never says it while the trail leads to a running quest)
    const tg = Quest.target(); if (!tg || !tg.post) return;
    const { L, boxN } = postWaiting(); if (!L.length && !boxN) return;
    q.postSaidDay = day; F.store();
    if (F.TPL.has('home_post')) F.SAY('home_post');
  } catch (e) { /* no post */ }
}, 3000));
// where a target is, seen from outdoors (an indoor target counts at its building's door); null = unknown
function outdoorOf(t) {
  if (!t || t.x == null) return null;
  if ((t.space || 'out') === 'out') return { x: t.x, z: t.z };
  const bld = t.bld || (t.actor && F.Act.byId(t.actor) ? F.Act.byId(t.actor).bld : null) || (t.thing && F.Things.byId(t.thing) ? F.Things.byId(t.thing).bld : null);
  if (t.realm && F.Realm && F.Realm.door) { const d = F.Realm.door(t.realm); if (d) return { x: d.x, z: d.z }; }
  if (bld === 'tarn' && F.Tower && F.Tower.outside) return { x: F.Tower.outside.x, z: F.Tower.outside.z };
  if (bld && bld.indexOf('rk_') === 0 && F.Realm && F.Realm.door) { const d = F.Realm.door(bld.slice(3)); if (d) return { x: d.x, z: d.z }; }
  return { x: 0, z: 26 };                                                                     // the home castle (slott / legacy rooms)
}
function herOutdoor() {
  const P = F.Player.pos;
  if (F.Space.cur === 'out') return { x: P.x, z: P.z };
  const B = F.Bld, p = B && B.cur && B.plan ? B.plan(B.cur) : null, ex = p && p.exits && p.exits[0] && p.exits[0].out;
  return ex ? { x: ex.x, z: ex.z } : { x: 0, z: 26 };
}
Quest.FAR = 250;
Quest.outdoorOf = outdoorOf;
// DESIGN2 §7.4: {space, x, z, actor|thing, …} plus far:true and realm|home when the target is more than 250 m away (HUD: map glow)
Quest.target = function () {
  let t = null;
  try {
    const ht = homeTarget();
    const rt = !Quest.storyPending && F.RQuest && F.RQuest.target ? F.RQuest.target() : null;
    const q = QS();
    t = rt && (!ht || ht.post || (rt.t || 0) >= (q.activeT || 0)) ? rt : ht;     // (review #11) a running RQ beats waiting post
  } catch (e) { console.error('[Quest] target', e); t = null; }
  if (!t) return null;
  const o = outdoorOf(t), me = herOutdoor();
  if (o && Math.hypot(o.x - me.x, o.z - me.z) > Quest.FAR) { t.far = true; if (!t.realm) t.home = true; }
  else t.far = false;
  if (!t.realm && t.home == null) t.home = true;
  return t;
};
/* clarity §3.0 contract: F.Quest.goal() -> null | {id, giver, face, model, state, target, far} – the goal that is «now» (the same
   choice as Quest.target(): the goal she last worked on, else the nearest; a running royal quest touched later wins). face =
   'ch_konge' | 'ch_dronning' | 'ch_mia' | null; state ∈ go | thing | deliver | back | travel | story; null when no goal is open or
   the target is only the post. Event 'goalChanged'(goal) on start, step, accept, done and when the «now» goal changes. */
const FACE = { konge: 'ch_konge', dronning: 'ch_dronning', mia: 'ch_mia' };
const faceOf = who => (FACE[who] && F.VOX.has(FACE[who]) ? FACE[who] : null);
function stateOf(step) {
  if (backStep(step)) return 'back';
  if (step.t === 'deliver') return 'deliver';
  if (step.t === 'travel') return 'travel';
  if (step.t === 'go' || step.at === 'obj' || step.t === 'stall') return 'thing';
  return 'go';
}
Quest.goal = function () {
  let t = null;
  try { t = Quest.target(); } catch (e) { t = null; }
  if (!t || t.post) return null;
  const tg = { space: t.space, x: t.x, z: t.z, actor: t.actor || null, thing: t.thing || null, bld: t.bld || null, room: t.room || null, realm: t.realm || null };
  if (Quest.storyPending && t.actor === 'mia') return { id: 'story', giver: 'mia', face: faceOf('mia'), model: firstModel(['bok', 'life_gaveeske']), state: 'story', target: tg, far: !!t.far };
  if (t.rq || t.travel) {
    const rg = F.RQuest && F.RQuest.goal ? F.RQuest.goal() : null;
    if (rg) return Object.assign({}, rg, { target: tg, far: !!t.far });
    if (t.travel) return { id: 'inv:' + t.realm, giver: null, face: null, model: firstModel(['life_konvolutt']), state: 'travel', target: tg, far: !!t.far, realm: t.realm };
    return null;
  }
  const id = t.qid; const st = id && QS().list[id], d = st && defOf(id); if (!st || !d) return null;
  const step = d.steps[st.step], state = stateOf(step);
  if (d.event) return { id, giver: null, face: null, model: firstModel(['b_feensbod', 'stall', 'life_kiosk', d.word]), state, target: tg, far: !!t.far, event: true };
  const model = state === 'deliver' ? firstModel([step.item, step.letter ? 'brev' : null, 'life_gaveeske']) : firstModel([st.vars && st.vars.w, d.word, 'life_gaveeske']);
  return { id, giver: st.giver || null, face: faceOf(st.giver), model, state, target: tg, far: !!t.far, letter: !!st.letter };
};
let goalSig = null, goalPend = false;
function goalCheck(force) {
  let g = null; try { g = Quest.goal(); } catch (e) { g = null; }
  const sig = g ? [g.id, g.state, g.model, g.giver].join('|') : '';
  if (!force && sig === goalSig) return;
  goalSig = sig; F.emit('goalChanged', g);
}
function goalSoon() { if (goalPend) return; goalPend = true; F.T.timeout(() => { goalPend = false; goalCheck(true); }, 0); }
Quest.goalSoon = goalSoon;
['rqStart', 'rqStep', 'rqDone', 'travelEnd', 'realmFound'].forEach(ev => F.on(ev, () => goalSoon()));
let goalAcc = 0;
F.on('tick', dt => { goalAcc += dt; if (goalAcc < 1) return; goalAcc = 0; if (F.booted) goalCheck(false); });
// re-apply running quests after boot (gold bubbles / markers)
F.on('ready', () => F.T.timeout(() => { const q = QS(); for (const id in q.list) try { reLook(id); setupStep(id); } catch (e) { console.error(e); } }, 500));
// v5 WP-W (logic #30): a quest's look (Q2: the king without his crown) is re-applied after a reload / when the giver is rebuilt
function reLook(id) { const d = defOf(id), st = QS().list[id]; if (!d || !d.look || !st) return; const g = F.Act.byId(st.giver); if (g) try { d.look(g); } catch (e) { /* actor not ready */ } }
Quest.reLook = reLook;
F.on('castleReady', () => F.T.timeout(() => { for (const id in QS().list) try { reLook(id); } catch (e) { /* ignore */ } }, 700));

/* ---------------------------------------------------------- envelopes (each morning: king, queen, Mia) */
F.Things.def('life_brev', {
  radius: 0.4, solid: false, reach: 1.8, name: 'brevet',
  build(th) { const g = new THREE.Group(); const m = F.VOX.make('life_konvolutt', { c: th.data.c || 'red' }); m.rotation.x = -0.25; m.position.y = 0.15; g.add(m); return g; },
  tick(th, dt, t) { if (th.obj.children[0]) th.obj.children[0].position.y = 0.15 + Math.abs(Math.sin(t * 2 + th.t0)) * 0.08; },
  press(th) { return openEnvelope(th); },
});
const ENV = [{ who: 'konge', c: 'red', line: 'q_fra_konge', fly: 'q_fly_konge' }, { who: 'dronning', c: 'lilac', line: 'q_fra_dronning', fly: 'q_fly_dronning' }, { who: 'mia', c: 'pink', line: 'q_fra_mia', fly: 'q_fly_mia' }];
/* clarity §3.1-1: one letter on day 1 (the king's), later at most 2 − (open goals) envelopes for the givers who waited longest; a
   kingdom invitation takes one of those slots; no room → Pip does not come that morning. Old saves keep every running quest.
   Quest.postPlan(day) -> {who: [...], inv} (no side effects); q.envWho = today's givers (the reload respawn uses it). */
const LETTER_WHO = ['konge', 'dronning', 'mia'];
function openGoals() {
  const q = QS(); let n = 0;
  // (a villager's quest she took on another day and left behind – its giver not loaded – does not hold the post back)
  for (const id in q.list) { const st = q.list[id], d = defOf(id); if (!d || st.offer || d.event || d.chain) continue; if (!st.letter && !LETTER_WHO.includes(st.giver) && st.day !== (F.save.day || 1) && !F.Act.byId(st.giver)) continue; n++; }
  try { const a = F.save.rq && F.save.rq.active; if (a) n += Object.keys(a).filter(k => a[k]).length; } catch (e) { /* no RQ */ }
  return n;
}
Quest.openGoals = openGoals;
Quest.MAX_GOALS = 2;
function postPlan(day, inv) {
  const q = QS();
  if (day <= 1) return { who: Quest.runningFor('konge') ? [] : ['konge'], inv: null };   // day 1: the king's letter only (an invitation waits)
  let room = Math.max(0, Quest.MAX_GOALS - openGoals());
  const plan = { who: [], inv: null };
  if (inv && room > 0) { plan.inv = inv; room--; }
  const last = w => { const e = q.envLast && q.envLast[w]; return e && e.day != null ? e.day : -1e9; };
  const cand = LETTER_WHO.filter(w => !Quest.runningFor(w) && !!envQuest(w)).sort((a, b) => last(a) - last(b));
  plan.who = cand.slice(0, room);
  return plan;
}
Quest.postPlan = postPlan;
const onScreen = o => { try { const v = o.getWorldPosition(V3()).project(F.R.camera); return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95; } catch (e) { return false; } };
Quest.envelopes = async function () {
  const q = QS(), day = F.save.day || 1;
  if (q.envelopesDay === day) return;
  q.envelopesDay = day; F.store();
  q.envOpened = [];
  if (F.flags.skip && day === 1) return [];           // #skip: day 1 starts without post (DESIGN §11.6)
  F.Things.list.filter(t => t.type === 'life_brev').forEach(t => F.Things.remove(t));   // yesterday's unopened post is collected
  // where: the tower mailbox (DESIGN2 §2.8/§7.1; WP2 tucks them in, a tap on the mailbox lays them out), else around her
  const base = postBase();
  // the morning after a kingdom appeared: the invitation (WP8 F.RQuest) – it takes one of the goal slots
  const inv0 = F.RQuest && F.RQuest.pendingInvite ? F.RQuest.pendingInvite() : null;
  const plan = postPlan(day, inv0), inv = plan.inv;
  q.envInv = inv || null; q.envWho = plan.who.slice(); if (inv && F.RQuest.markInvite) F.RQuest.markInvite(inv); F.store();
  if (!plan.who.length && !inv) { log('noPost', { day, open: openGoals() }); return []; }   // no room: Pip does not come this morning
  // Pip flies in with the post
  let pip = null;
  try { if (F.People && F.People.animal) { pip = F.People.animal('pip'); F.Space.scene(base.space).add(pip); } } catch (e) { pip = null; }
  const from = V3(base.x - 12, F.Space.impl[base.space].heightAt(base.x, base.z) + 7, base.z - 6), to = V3(base.x + 1.2, F.Space.impl[base.space].heightAt(base.x, base.z) + 1.6, base.z + 0.4);
  if (pip) { pip.position.copy(from); pip.lookAt(to.x, from.y, to.z); await F.T.tween(1800, k => { pip.position.lerpVectors(from, to, k); pip.position.y += Math.sin(k * Math.PI) * 1.5; if (pip.userData.animate) pip.userData.animate(1 / 30, F.T.now, true); }); }
  // clarity §3.1-9: «Pip har med post til deg!» only when she can see Pip, and never in the day-1 introduction (its own line covers it)
  if (pip && base.space === F.Space.cur && onScreen(pip) && !(F.Onboard && F.Onboard.active)) F.SAY('q_post');
  const out = spawnEnvelopes(base, day, plan.who, inv);
  if (pip) { const end = V3(to.x + 14, to.y + 8, to.z - 10); await F.T.tween(1600, k => { pip.position.lerpVectors(to, end, k); if (pip.userData.animate) pip.userData.animate(1 / 30, F.T.now, true); }); pip.parent && pip.parent.remove(pip); }
  return out;
};
// the post goes to the tower mailbox when she is at home (in the tower or within 60 m of it); else around her (legacy: Fetårnet room)
function postBase() {
  const P = F.Player.pos, sp = F.Space.cur;
  const box = F.Tower && F.Tower.mailbox ? F.Tower.mailbox() : null;
  const inTower = !!(F.Tower && F.Tower.inside && F.Tower.inside());
  if (box && (inTower || (sp === 'out' && Math.hypot(P.x - box.x, P.z - box.z) < 60))) return { space: 'out', x: box.x, z: box.z, box: true };
  let base = { space: sp, x: P.x, z: P.z };
  const ft = !(F.Tower && F.Tower.real && F.Tower.real()) ? (F.Act.roomPos('fetarn') || null) : null;
  if (ft && sp === 'in') base = { space: 'in', x: ft.x - 1.5, z: ft.z + 1 };
  return base;
}
Quest.postBase = postBase;
function spawnEnvelopes(base, day, which, inv) {
  const out = [];
  const list = ENV.filter(e => !which || which.includes(e.who)); if (inv) list.push({ who: 'inv', c: 'gold', realm: inv });
  list.forEach((e, i) => {
    let x, z;
    if (base.box) { x = base.x + 1.3 + i * 1.0; z = base.z + 1.5 + (i % 2) * 0.5; }   // in front of the mailbox (WP2 tucks them in)
    else { const a = -0.8 + i * 0.8; x = base.x + Math.sin(a) * 3.0; z = base.z - 3.0 - Math.cos(a) * 0.6; }   // mid-room behind the fairy, spread wide
    const data = { who: e.who, c: e.c, day }; if (e.realm) data.realm = e.realm;
    const th = F.Things.spawn('life_brev', x, z, { id: 'brev_' + day + '_' + e.who, space: base.space, data });
    if (th) { F.FX.pop(th.obj); F.sfx.pop(); out.push(th); }
  });
  return out;
}
// unopened post is still there after a reload (at the tower mailbox when there is one)
F.on('ready', () => F.T.timeout(() => {
  const q = QS(), day = F.save.day || 1;
  if (q.envelopesDay !== day || (F.flags.skip && day === 1)) return;
  // (old saves without q.envWho: the three givers, as before)
  const opened = q.envOpened || [], left = (Array.isArray(q.envWho) ? q.envWho : ENV.map(e => e.who)).filter(w => !opened.includes(w));
  const inv = q.envInv && !opened.includes('inv') ? q.envInv : null;
  if (!left.length && !inv) return;
  if (F.Things.list.some(t => t.type === 'life_brev' && t.data && t.data.day === day) || (F.Tower && F.Tower.mail && F.Tower.mail.length)) return;
  spawnEnvelopes(postBase(), day, left, inv);
}, 900));
async function openInvite(th) {
  const id = th.data.realm, R = F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null;
  { const q0 = QS(); q0.envOpened = q0.envOpened || []; if (!q0.envOpened.includes('inv')) q0.envOpened.push('inv'); F.store(); }
  if (!R) { F.Things.remove(th); return; }
  const box = F.UI.el('div', 'lenv');
  const card = F.UI.el('div', 'lenv-card'); card.appendChild(F.UI.el('div', 'lenv-seal'));
  const from = F.UI.el('div', 'lenv-from'); if (F.VOX.has('ch_pip')) from.appendChild(F.Thumb.img('ch_pip', {}, { size: 96, angle: 0.25 }));
  let toMap = false;
  const crest = F.UI.el('div', 'rq-crest');
  crest.style.cssText = 'width:180px;height:180px;margin:6px auto;border-radius:50%;background:#fffaf0;border:5px solid #e8b04a;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.15)';
  const icon = F.Realm && F.Realm.emblemIcon ? F.Realm.emblemIcon(id, 140) : null;
  if (icon) { icon.style.width = '140px'; icon.style.height = '140px'; icon.style.margin = '0'; crest.appendChild(icon); }
  else crest.appendChild(F.UI.el('div', 'lw-dot', '★'));
  crest.onclick = ev => { ev.stopPropagation(); toMap = true; h.close(); };
  card.appendChild(crest);
  const w = F.UI.el('div', 'lenv-word', F.UI.caseText(R.castle)); w.style.fontSize = '44px';
  card.appendChild(w);
  box.appendChild(from); box.appendChild(card);
  const ok = F.UI.btn('✓', () => h.close(), { cls: 'mint big' });
  box.appendChild(ok);
  const h = F.UI.open(box, { cls: 'life-panel', onClose: async () => {
    F.Things.remove(th);
    if (F.RQuest && F.RQuest.invite) F.RQuest.invite(id);
    F.Speech && F.Speech.clearQueue && F.Speech.clearQueue();
    if (toMap && F.Map && F.Map.open) { try { F.Map.open({ focus: id }); } catch (e) { console.error('[Quest] map focus', e); } await F.SAY('rq_n_kart'); }
    else await F.SAY('rq_ga', { slott: R.castle });
  } });
  log('envelope', { who: 'inv', realm: id });
  await F.SAY('rq_inv', { slott: R.castle });
  if (F.UI.isOpen()) await F.SAY('rq_n_merket');
}
/* v5c WP-Q: the morning post follows the quest rules (Quest.offer's every / when / the calendar) and rotates its words */
// the giver's quest for the envelope: unlocked, not running, `when` holds, not done in the last 2 days (or `every` days); else the
// least recently done one that is allowed at all (a once-a-month birthday never comes early); never yesterday's quest again when
// another one is possible
function envQuest(who) {
  const q = QS(), day = F.save.day || 1, a = F.Act.byId(who);
  const pool = (POOL[who] || []).filter(id => D[id] && !q.list[id] && unlocked(id));
  const can = id => { try { return !D[id].when || D[id].when(a); } catch (e) { return true; } };
  const last = id => { const d = q.done[id] || []; return d.length ? d[d.length - 1] : -1e9; };
  const gapOK = id => day - last(id) >= (D[id].every || 2);
  const hardOK = id => !D[id].every || gapOK(id);
  const prev = q.envLast && q.envLast[who] && q.envLast[who].day < day ? q.envLast[who].qid : null;
  let c = pool.filter(id => can(id) && gapOK(id));
  if (c.length > 1 && prev) c = c.filter(id => id !== prev);
  if (!c.length) c = pool.filter(id => can(id) && hardOK(id)).sort((x, y) => last(x) - last(y)).slice(0, 1);
  if (!c.length) c = pool.filter(id => hardOK(id) && !D[id].when).slice(0, 1);
  return c.length ? U.pick(F.rand, c) : null;
}
Quest.envQuest = envQuest;
// the word family of each quest's card (all things of its story); the card shows the one closest to her reading rung (lesFit), never
// the same word as the last card of that quest when another one fits as well; only words she can hear spoken (rw_word / q_word)
const CARD_WORDS = { Q1: ['kake', 'bolle', 'vaffel', 'is', 'eple', 'brød', 'pære', 'banan', 'ost'], Q2: ['krone'], Q3: ['brev', 'pakke', 'post'],
  Q4: ['fest', 'kake', 'gave', 'ballong', 'lys', 'pakke'], Q5: ['liste', 'te', 'kopp', 'kake', 'skje', 'kanne'], Q6: ['rose', 'blomst', 'tulipan', 'hage', 'vase', 'bie'],
  Q7: ['gris', 'mynt', 'penger'], Q8: ['egg', 'melk', 'panne', 'mel', 'smør', 'høne'], Q9: ['bok', 'hylle'], Q10: ['blyant', 'penn', 'ord'],
  Q11: ['lys', 'ball', 'dans', 'kjole', 'krone', 'sko'], Q12: ['avis'], Q18: ['flagg', 'tromme'], Q19: ['hatt', 'lue', 'krone', 'caps'] };
Quest.CARD_WORDS = CARD_WORDS;
const inSet = (set, w) => !!(F.SETS && Array.isArray(F.SETS[set]) && F.SETS[set].includes(w));
const speakable = w => inSet('LIFE_ENVWORDS', w) || inSet('WORDS', w);
function cardWord(qid) {
  // (an alternative word needs its own picture model – the card's picture is never another thing than the word; the quest's own word
  // keeps today's picture rule)
  const d = D[qid], fam = (CARD_WORDS[qid] || [d && d.word]).filter(w => w && speakable(w) && (w === (d && d.word) || F.VOX.has(w)));
  if (!fam.length) return (d && d.word) || 'kake';
  const q = QS(), EW = q.envWords = q.envWords || {};
  const hist = Array.isArray(EW[qid]) ? EW[qid] : EW[qid] ? [EW[qid]] : [];        // the quest's last card words (old saves: one word)
  // (a word the LES bank serves at her rung right now is preferred: the card is a real reading try at her level, not a picture label)
  let cur = 1; try { cur = curRung('LES') || 1; } catch (e) { cur = 1; }
  const inBank = w => { try { return !!(F.BANKS && F.BANKS.fits && F.BANKS.fits('LES', cur, 'LES:' + w)); } catch (e) { return false; } };
  const sc = fam.map(w => ({ w, s: lesFit(w) - (inBank(w) ? 1 : 0) + F.rand() * 0.3 }));
  sc.sort((x, y) => x.s - y.s);
  // the words near her level (the best 3, within 2 rungs of the best), then the one she saw longest ago (never yesterday's when another fits)
  let near = sc.filter((x, i) => i < 3 && x.s <= sc[0].s + 2);
  if (near.length < 2) near = sc.slice(0, Math.min(3, sc.length));   // words without a reading rung in F.WORDS: the 3 best still rotate
  const age = w => { const i = hist.lastIndexOf(w); return i < 0 ? 1e9 : hist.length - i; };
  near.sort((x, y) => age(y.w) - age(x.w) || x.s - y.s);
  const w = near[0].w;
  EW[qid] = hist.concat([w]).slice(-4); F.store();
  return w;
}
Quest.cardWord = cardWord;
function sayCardWord(w) {
  if (inSet('LIFE_ENVWORDS', w)) return F.SAY('q_word', { w });
  if (F.TPL.has('rw_word') && inSet('WORDS', w)) return F.SAY('rw_word', { w });
  return Promise.resolve();
}
async function openEnvelope(th) {
  if (th.data && th.data.who === 'inv') return openInvite(th);
  const e = ENV.find(x => x.who === th.data.who) || ENV[0];
  { const q0 = QS(); q0.envOpened = q0.envOpened || []; if (!q0.envOpened.includes(e.who)) q0.envOpened.push(e.who); F.store(); }
  const a = F.Act.byId(e.who);
  // which quest: decided now, its key word goes on the card (v5c WP-Q: the same rules as Quest.offer – every / when / the calendar –
  // and a card word from the quest's word family at her reading level, so the morning post is not the same 3 words every week)
  const q = QS(), running = Object.keys(q.list).find(id => q.list[id].giver === e.who);
  const qid = running || envQuest(e.who);
  const word = running ? ((q.list[running].vars && q.list[running].vars.w) || (D[running] && D[running].word) || 'kake') : qid ? cardWord(qid) : 'brev';
  const box = F.UI.el('div', 'lenv');
  const card = F.UI.el('div', 'lenv-card'); card.appendChild(F.UI.el('div', 'lenv-seal'));
  const from = F.UI.el('div', 'lenv-from'); if (F.VOX.has('ch_' + e.who)) from.appendChild(F.Thumb.img('ch_' + e.who, {}, { size: 96, angle: 0.25 }));
  const mid = firstModel([word, D[qid] && D[qid].word, D[qid] && D[qid].steps.find(s => s.obj && s.obj.model) && D[qid].steps.find(s => s.obj && s.obj.model).obj.model]);
  if (mid) card.appendChild(F.Thumb.img(mid, {}, { size: 190 }));
  const w = F.UI.el('div', 'lenv-word', F.UI.caseText(word));
  card.appendChild(w);
  box.appendChild(from); box.appendChild(card);
  let spoken = false, closed = false;
  // clarity §3.1-3: after the card word the giver asks in the letter, in the giver's own voice (brev_<qid>): the premise is told here,
  // so in person the giver only greets and asks (step.sayL)
  const brev = qid && !running && F.TPL.has('brev_' + qid) ? 'brev_' + qid : null;
  const speak = async () => { if (spoken) return; spoken = true; w.classList.add('read'); await sayCardWord(word); if (brev && !closed) await F.SAY(brev, {}, e.who); };
  w.onclick = ev => { ev.stopPropagation(); speak(); };
  let cardRect = null;
  const ok = F.UI.btn('✓', () => { try { cardRect = card.getBoundingClientRect(); } catch (er) { cardRect = null; } h.close(); }, { cls: 'mint big' });
  box.appendChild(ok);
  const h = F.UI.open(box, { cls: 'life-panel', closable: false, onClose: async () => {
    spoken = true; closed = true;   // the 4 s word timer stays quiet once the card is closed
    F.Things.remove(th);
    // the card word becomes the quest's story word (Q1 counts the waffles the card showed, when that model exists)
    if (qid && !running) { const st0 = q.list[qid] = q.list[qid] || { id: qid, step: 0, giver: e.who, day: F.save.day || 1 }; if (word) st0.vars = Object.assign({}, st0.vars || {}, { w: word }); }
    if (qid) Quest.start(qid, e.who, { letter: true });
    (q.envLast = q.envLast || {})[e.who] = { day: F.save.day || 1, qid, word }; F.store();
    // the closed letter flies into the goal card (H owner's F.Goal; a stub-free no-op until it lands)
    try { if (qid && F.Goal && F.Goal.arrive) F.Goal.arrive(cardRect); } catch (er) { console.warn('[Quest] Goal.arrive', er); }
    // «Fly til kongen!» – not in the day-1 introduction: its Puff step says it when she asks Puff
    if (!(F.Onboard && F.Onboard.active)) await F.SAY(e.fly);
  } });
  await F.SAY(e.line); await F.SAY('q_hva_står');
  F.T.timeout(speak, 4000);   // spoken after 4 s or a tap (not scored)
  log('envelope', { who: e.who, word });
}
F.on('dayStart', () => { F.T.timeout(() => Quest.envelopes().catch(e => console.error(e)), 1500); });
// helping missions are for the day: an unfinished one from an earlier day is dropped (no penalty)
// v5r2: so is an offer she never took (st.offer), and an old save's villager quest that never got past its first step (written at the
// bubble roll before offers were marked) – nothing she did is lost, the villager may offer again
const staleOffer = st => st.offer || (!st.accepted && !st.step && /^v_/.test(String(st.giver || '')));
function dropOldChains() {
  const q = QS(), day = F.save.day || 1; let n = 0;
  for (const id in q.list) if ((q.list[id].chain || staleOffer(q.list[id])) && (q.list[id].day || 0) < day) { const g = giverOf(id); if (g && g.wish && g.wish.questId === id) g.clearWish(); delete q.list[id]; n++; }
  if (q.active && !q.list[q.active.id]) q.active = null;
  if (n) F.store();
}
F.on('dayStart', dropOldChains);
F.on('ready', dropOldChains);

/* ---------------------------------------------------------- event hooks for the log */
F.on('cast', e => { if (e && e.word) log('cast', { word: e.word, n: e.n || 1, free: !!e.free }); });
F.on('stallSale', (good, n, price) => log('stallSale', { good, n, price }));

/* ---------------------------------------------------------- Kongeposten headlines (yesterday's news) */
const ROYAL_NAME = { konge: 'Kongen', dronning: 'Dronningen', mia: 'Mia', ole: 'Ole' };
const MISC_TRUE = ['kp_m1', 'kp_m2', 'kp_m3', 'kp_m4', 'kp_m5', 'kp_m6', 'kp_m7'];
const MISC_FALSE = ['kp_f1', 'kp_f2', 'kp_f3', 'kp_f4', 'kp_f5', 'kp_f6', 'kp_f7', 'kp_f8'];
const MISC_MODEL = { kp_m1: 'krone', kp_m2: 'ch_pus', kp_m3: 'ch_tass', kp_m4: 'kopp', kp_m5: 'skjerf', kp_m6: 'ch_ole', kp_m7: 'sol', kp_f1: 'ch_konge', kp_f2: 'sky', kp_f3: 'ch_bris', kp_f4: 'buss', kp_f5: 'c_slott', kp_f6: 'tre', kp_f7: 'bok', kp_f8: 'ch_mia' };
Quest.headlines = function (day) {
  day = day || F.save.day || 1;
  const ev = (F.save.events || []).filter(e => e.day === day - 1);
  const r = U.rng(U.hashStr('kp|' + day));
  const out = [];
  const add = (tplId, slots, truth, model) => { if (!F.TPL.has(tplId) || out.find(o => o.tplId === tplId && JSON.stringify(o.slots) === JSON.stringify(slots))) return; out.push({ tplId, slots: slots || {}, truth, text: F.TPL.text(tplId, slots || {}, 0), model: firstModel([model]) }); };
  for (const e of ev) {
    if (e.type === 'npcBought' && ROYAL_NAME[e.who] && F.GIFT_IDS.includes(e.item)) { if (e.who === 'ole') add('kp_olefikk', { item: F.giftName(e.item) }, true, F.CAT.mid(e.item)); else add('kp_kjøpte', { royal: ROYAL_NAME[e.who], item: F.giftName(e.item) }, true, F.CAT.mid(e.item)); }
    if (e.type === 'questDone' && e.kp) add(e.kp, {}, true, D[e.id] && D[e.id].word);
    if (e.type === 'cast' && e.n >= 10 && e.n <= 20 && F.GOODS[e.word]) add('kp_trylla', { n: e.n, goods: F.GOODS[e.word] }, true, e.word);
    if (e.type === 'stallSale') add('kp_solgte', {}, true, 'life_kiosk');
    if (e.type === 'bought' && e.who === 'feen') add('kp_handlet', {}, true, F.CAT.mid(e.item));
    if (e.type === 'gift') add('kp_gave', {}, true, 'life_gaveeske');
    if (e.type === 'newNeighbour' && e.name && F.SETS.NAMES.includes(e.name)) add('kp_nabo', { name: e.name }, true, 'hus');
    if (e.type === 'rqDone' && e.realm && F.REALMS && F.REALMS.get && F.REALMS.get(e.realm)) add('rq_kp', { slott: F.REALMS.get(e.realm).castle }, true, 'krone');   // P1 (WP8)
  }
  const mia = F.save.npcs && F.save.npcs.mia;
  if (mia && mia.coins >= 1 && mia.coins <= 20 && out.length < 4) add(mia.coins === 1 ? 'kp_gris1' : 'kp_gris', mia.coins === 1 ? null : { n: mia.coins }, true, 'life_sparegris');
  for (const id of U.shuffle(r, MISC_TRUE)) { if (out.length >= 4) break; add(id, {}, true, MISC_MODEL[id]); }
  // two silly false ones for the yes/no reading game (F30)
  U.sample(r, MISC_FALSE, 2).forEach(id => add(id, {}, false, MISC_MODEL[id]));
  // a false variant of a real purchase (wrong item) when there is one
  // a kingdom she did not help yesterday, as a false royal-quest headline (P1, WP8)
  const helped = out.filter(o => o.tplId === 'rq_kp').map(o => o.slots.slott);
  if (helped.length && F.SETS.REALMS) { const other = U.pick(r, F.SETS.REALMS.filter(c => !helped.includes(c))); if (other) add('rq_kp', { slott: other }, false, null); }
  const real = out.find(o => o.tplId === 'kp_kjøpte');
  if (real) { const other = U.pick(r, F.SETS.GIFTS.filter(g => g !== real.slots.item && !/ til /.test(g))); add('kp_kjøpte', { royal: real.slots.royal, item: other }, false, null); }
  return out;
};
Quest.openPaper = function () {
  const list = Quest.headlines().filter(h => h.truth);
  const box = F.UI.el('div', 'lpaper');
  box.appendChild(F.UI.el('div', 'lpaper-title', F.UI.caseText('Kongeposten')));
  list.forEach(h => {
    const row = F.UI.el('div', 'lpaper-row');
    if (h.model) row.appendChild(F.Thumb.img(h.model, {}, { size: 84 }));
    // v3 (DESIGN3 §6.8): try first – the 1st tap lights the headline word by word (3 s), the 2nd tap reads it aloud
    const tx = F.UI.el('div', 'lp-text');
    F.UI.caseText(h.text).split(/(\s+)/).forEach(part => { if (/^\s+$/.test(part)) tx.appendChild(document.createTextNode(part)); else if (part) { const sp = document.createElement('span'); sp.className = 'lp-w'; sp.textContent = part; tx.appendChild(sp); } });
    row.appendChild(tx);
    let t1 = -1e9;
    row.onclick = e => {
      e.stopPropagation();
      const now = F.T.now;
      if (now - t1 > 8 || row._lit !== true) {
        t1 = now; row._lit = true; row.classList.add('lp-glow'); F.sfx.click && F.sfx.click();
        const ws = Array.from(tx.querySelectorAll('.lp-w'));
        ws.forEach((w, i) => { setTimeout(() => w.classList.add('on'), 250 + i * Math.min(500, 2400 / Math.max(1, ws.length))); });
        setTimeout(() => { row.classList.remove('lp-glow'); ws.forEach(w => w.classList.remove('on')); }, 3200);
        Quest.paperTaps = (Quest.paperTaps || 0) + 1;
        return;
      }
      if (now - t1 < 1.2) return;
      row._lit = false; F.Speech.clearQueue(); F.SAY(h.tplId, h.slots); Quest.paperReads = (Quest.paperReads || 0) + 1;
    };
    box.appendChild(row);
  });
  if (!document.getElementById('lpaper-css')) { const cs = document.createElement('style'); cs.id = 'lpaper-css';
    cs.textContent = '.lpaper-row.lp-glow{box-shadow:0 0 0 4px #ffe27a,0 0 18px #ffd84a;border-radius:14px}.lpaper-row .lp-w{transition:color .2s,background .2s;border-radius:6px}.lpaper-row .lp-w.on{background:#fff2a8;color:#7a4b00}';
    document.head.appendChild(cs); }
  F.UI.open(box, { cls: 'life-panel' });
};

/* ---------------------------------------------------------- Q17 «Ny nabo»: new houses (saved world things) + their residents */
const HOUSES = () => { const l = F.save.life = F.save.life || {}; l.houses = l.houses || {}; return l.houses; };
function plotFree(t) { return t && t.type === 'p_tomt' && t.data && (t.data.region != null || t.data.plotId) && !(F.Eco && F.Eco.plotItem && F.Eco.plotItem(t.id)); }
function emptyPlotNear(a) {
  if (!a || a.space !== 'out') return null;
  let best = null, bd = 60;
  for (const t of F.Things.ofType ? F.Things.ofType('p_tomt') : F.Things.list.filter(x => x.type === 'p_tomt')) { if (!plotFree(t)) continue; const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; best = t; } }
  return best;
}
Quest.emptyPlotNear = emptyPlotNear;
function villageAt(x, z) { try { const vs = F.W && F.W.villages ? (F.W.villages({ x, z }, 160) || []).slice().sort((a, c) => Math.hypot(a.x - x, a.z - z) - Math.hypot(c.x - x, c.z - z)) : []; return vs[0] || null; } catch (e) { return null; } }   // v5: the nearest
// v5 WP-W (DESIGN4 §8): the new house takes the street number of its plot (odd west / even east, rising north → south), else a
// free gap of the street, else the next numbers after the street's end – never a duplicate, never «10–20 only».
function freeHouseNum(v, rng, x, z) {
  const used = new Set(((v && v.houses) || []).map(h => h.num));
  for (const k in HOUSES()) { const h = HOUSES()[k]; if (!v || h.region === v.regionId) used.add(h.num); }
  if (v && v.numLo != null) {
    if (x != null && z != null) {
      const zs = [35, 24, 13, -13, -24, -35].map(dz => v.z + dz), k = zs.reduce((b, zz, i) => Math.abs(zz - z) < Math.abs(zs[b] - z) ? i : b, 0);
      const num = v.numLo + k * 2 + (x > v.x ? 1 : 0);
      if (Math.abs(zs[k] - z) < 7 && !used.has(num)) return num;
    }
    const gaps = (v.gaps || []).filter(n => !used.has(n));
    if (gaps.length) return U.pick(rng, gaps);
    for (let n = v.numHi + 1; n < v.numHi + 40; n++) if (!used.has(n)) return n;
  }
  for (let n = 1; n <= 60; n++) if (!used.has(n) && rng() < 0.2) return n;
  return 1 + Math.floor(rng() * 60);
}
Quest.freeHouseNum = freeHouseNum;
const HOUSE_COL = [['cream', 'roofRed'], ['butter', 'roofBlue'], ['peach', 'roofRed'], ['mint', 'roofBlue'], ['white', 'roofRed'], ['blossom', 'roofBlue']];
F.Things.def('life_nyhus', {
  radius: 2.3, solid: true, reach: 3.4, name: 'det nye huset', hoverable: true,
  build(th) {
    const h = HOUSES()[th.data.hid] || {}, g = new THREE.Group();
    const mid = ['wd_hus', 'v_hus', 'hus', 'life_gaveeske'].find(m => F.VOX.has(m));
    const [wall, roof] = HOUSE_COL[(h.num || 0) % HOUSE_COL.length];
    let m;
    try { m = F.VOX.make(mid, mid === 'wd_hus' ? { wall, roof } : {}); } catch (e) { m = F.VOX.make(mid, {}); }
    const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), k = 4.4 / Math.max(0.1, sz.x, sz.z);
    m.scale.multiplyScalar(k); g.add(m); th._hd = sz.z * k; th._hh = sz.y * k;
    return g;
  },
  init(th) {
    const h = HOUSES()[th.data.hid]; if (!h) return;
    const a = new THREE.Object3D(); a.position.set(0, Math.min(3, (th._hh || 4) * 0.5), (th._hd || 4) / 2 + 0.15); th.obj.add(a);
    th.plaque = F.UI.label(a, String(h.num), { kind: 'num', maxDist: 26 });
    if (h.name) F.T.timeout(() => spawnNabo(th), 50);
  },
  dispose(th) { if (th.plaque) th.plaque.remove(); const r = F.Act.byId('nabo_' + th.data.hid); if (r) F.Act.remove(r); },
  async press(th) {
    F.FX.pop(th.obj); F.sfx.door ? F.sfx.door() : F.sfx.pop();
    const r = F.Act.byId('nabo_' + th.data.hid);
    if (r && !r.busy) { r.facePlayer(); r.gesture('wave', 1.4); await r.say('life_hei'); }
  },
});
function doorOf(th) { const d = (th._hd || 4) / 2 + 1.1; return { x: th.x + Math.sin(th.ry || 0) * d, z: th.z + Math.cos(th.ry || 0) * d }; }
function spawnNabo(th, o) {
  const h = HOUSES()[th.data.hid]; if (!h || !h.name || !F.Things.byId(th.id)) return null;
  const id = 'nabo_' + th.data.hid;
  if (F.Act.byId(id)) return F.Act.byId(id);
  const seed = U.hashStr(id), p = doorOf(th);
  // v5 WP-W (logic #5): one gender source – the name → voice + look (+ bestemor/bestefar follow it)
  const female = F.Act.FEMALE ? F.Act.FEMALE.has(h.name) : /^(Ane|Eli|Eva|Ida|Lea|Liv|Mona|Nora|Pia|Rut|Sara|Siri|Una|Vera|Anna|Mari|Iris|Ella|Sofie|Hege|Ulla|Lise|Kaja|Nina)$/.test(h.name);
  const job = (h.job === 'bestemor' && !female) ? 'bestefar' : (h.job === 'bestefar' && female) ? 'bestemor' : (h.job || 'bonde');
  const look = F.People && F.People.villager ? F.People.villager(job, seed, { female, kid: false }) : null;
  const a = F.Act.spawn(id, { name: h.name, role: 'by', job, voice: female ? 'vk' : 'vm', look, home: { space: 'out', x: p.x, z: p.z }, ry: th.ry || 0,
    repertoire: (F.Act.JOB_FORMATS && F.Act.JOB_FORMATS[job]) || ['F06', 'F23', 'F33'] });
  a.house = th.id; a.nabo = true;
  if (o && o.hello) { a.gesture('wave', 2); F.Act.hearts(a.headPos()); }
  return a;
}
async function buildHouse(id, th) {
  const st = QS().list[id]; if (!st || !th) return;
  const x = th.x, z = th.z, v = villageAt(x, z), r = U.rng(U.hashStr(id + '|' + x.toFixed(1) + '|' + z.toFixed(1)));
  // face the village street (it runs north–south through the plaza), like the other houses
  const ry = v ? (Math.abs(v.x - x) > 3 ? (v.x > x ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(v.x - x, v.z - z)) : (F.Player ? Math.atan2(F.Player.pos.x - x, F.Player.pos.z - z) : 0);
  const hid = 'h' + Math.floor(Date.now() / 1000).toString(36) + Math.floor(r() * 1e4).toString(36);
  const jobs = F.People && F.People.JOBS ? F.People.JOBS.map(j => j.id) : ['bonde', 'baker', 'maler'];
  HOUSES()[hid] = { num: freeHouseNum(v, r, x, z), x: +x.toFixed(2), z: +z.toFixed(2), ry, region: v ? v.regionId : null, name: null, job: U.pick(r, jobs), day: F.save.day || 1 };
  st.house = hid; F.store();
  // the plot becomes the house (a real village plot is removed for good; a quest marker plot is removed by advance())
  if (th.type === 'p_tomt' && F.W && F.W.removeThing) { try { F.W.removeThing(th); } catch (e) { F.Things.remove(th); } }
  let hth = null;
  try { hth = F.W && F.W.addThing ? F.W.addThing('life_nyhus', x, z, { ry, data: { hid }, kind: 'build' }) : null; } catch (e) { console.warn('[Q17] addThing', e); }
  if (!hth) hth = F.Things.spawn('life_nyhus', x, z, { id: 'lifehus_' + hid, ry, data: { hid } });
  if (hth && hth.obj) {
    const m = hth.obj.children[0];
    if (m && F.FX.assemble && F.VOX.has('wd_hus')) { const [wall, roof] = HOUSE_COL[HOUSES()[hid].num % HOUSE_COL.length]; F.FX.assemble('wd_hus', { wall, roof }, m, hth.obj.position.clone(), { ms: 1600 }).catch(() => {}); }
    F.sfx.grow ? F.sfx.grow() : F.sfx.magic();
    F.FX.burst(new THREE.Vector3(x, (hth.y || 0) + 2, z), { n: 40, speed: 3, up: 4 });
  }
  st.houseTh = hth ? hth.id : null; F.store();
  await F.T.sleep(1700);
}
async function moveIn(id) {
  const st = QS().list[id]; if (!st || !st.house) return;
  const h = HOUSES()[st.house]; if (!h) return;
  const w = F.Task.lastResult && F.Task.lastResult.item && F.Task.lastResult.item.word ? String(F.Task.lastResult.item.word) : '';
  const names = F.SETS.NAMES || ['Ida'];
  h.name = names.find(n => n.toLowerCase() === w.toLowerCase()) || U.pick(F.rand, names);
  F.store();
  log('newNeighbour', { name: h.name, num: h.num });
  F.emit('newNeighbour', h.name, h.num);
  const th = (st.houseTh && F.Things.byId(st.houseTh)) || F.Things.list.find(t => t.type === 'life_nyhus' && t.data.hid === st.house);
  if (th) {
    const a = spawnNabo(th, { hello: true });
    if (a) { F.FX.burst(new THREE.Vector3(a.x, (a.th.y || 0) + 1.6, a.z), { n: 30, colors: [0xffd84a, 0xff7fb0, 0xffffff], speed: 2, up: 3 }); F.SAY('q17_flytt'); await F.T.sleep(600); await a.say('life_hei'); }
  }
}
Quest.houses = () => JSON.parse(JSON.stringify(HOUSES()));

/* ---------------------------------------------------------- Q21 «Markedsdagen»: the stall rush counts towards the quest */
F.on('stallSale', () => {
  const st = QS().list.Q21; if (!st) return;
  const step = D.Q21.steps[st.step]; if (!step || step.t !== 'stall') return;
  st.served = (st.served || 0) + 1; F.store();
  F.emit('questStep', 'Q21', st.step, st.served);
  if (st.served >= step.n) F.T.timeout(() => advance('Q21', null), 1800);
});
async function marketDone() {
  const th = F.Stall && F.Stall.thing;
  const p = th ? new THREE.Vector3(th.x, (th.y || 0) + 4, th.z) : F.Player.pos.clone().add(new THREE.Vector3(0, 4, 0));
  // gentle fireworks: soft bursts high above the stall, quiet pops
  for (let i = 0; i < 6; i++) F.T.timeout(() => { const q = p.clone(); q.x += (Math.random() - 0.5) * 6; q.y += Math.random() * 2; F.FX.burst(q, { n: 46, speed: 3.2, up: 1.5, life: 1.6, size: 0.09, gravity: 0.4, colors: [0xffd84a, 0xff9fd0, 0x9fe3ff, 0xc8f7b5] }); F.sfx.firework ? F.sfx.firework() : F.sfx.sparkle(); }, i * 520);
  for (const a of F.Act.near(p.x, p.z, 25, 'out')) if (a.kind === 'person' && !a.busy) a.gesture('cheer', 2.5);
  await F.SAY('q21_done');
}

/* ---------------------------------------------------------- Mia's bedtime story (SHELL awaits F.Quest.bedtimeStory())
   Mia waits in her room (18) with a gold bubble (a book). When the fairy taps her: 3 short reading items, each read and
   matched to a picture / real thing (F31 riddle, F28 phrase, F23 word → thing, F30 sentence; the engine picks what fits
   her LES level, so a beginner gets words and a strong reader sentences). Scored like any task. If she never comes,
   the story is skipped after 4½ min (no penalty). */
const STORY_FORMATS = ['F31', 'F28', 'F23', 'F26', 'F30', 'F27'];
// v5c WP-Q: the bedtime story is also the home of listening comprehension (F78 Fortellerstolen: Mia tells a short story, she shows
// what happened) and of story order (F79 Bildehylla: the pictures of the story in order) – a story slot with the reading formats;
// at most one listening / picture item per evening, the rest reading (it is a reading moment)
const STORY_SLOT = STORY_FORMATS.concat(['F78', 'F79']);
function storyItem(last, nOther) {
  const fm = STORY_FORMATS.filter(f => F.Task.resolveFormat(f) && !/_demo$/.test(F.Task.resolveFormat(f)));
  if (!fm.length || !F.LEARN || !F.LEARN.next) return null;
  let item = null;
  if (!nOther) { item = slotItem({ formats: STORY_SLOT, wide: false }, { place: 'mia' }, { said: lineTexts(['q_story_ask', 'q_story_mer']) }); if (item) return item; }
  try { item = F.LEARN.next({ formats: fm, strands: ['LES'], place: 'mia', rng: F.rand, now: Date.now(), last }); } catch (e) { item = null; }
  if (item && fm.includes(item.format)) return item;
  try {
    const S = ((F.LEARN.summary() || {}).strands || {}).LES || {}, fid = fm.includes('F23') ? 'F23' : fm[0], [r0, r1] = F.Task.defs[fid].strands.LES || [1, 9];
    return F.LEARN.next({ formats: [fid], force: { strand: 'LES', rung: U.clamp(S.rung || r0, r0, r1), sup: 1, format: fid, kind: 'practice' }, rng: F.rand, now: Date.now() });
  } catch (e) { return null; }
}
async function runStory(a, done) {
  if (F.Task.current) return;
  a.clearWish(); Quest.storyPending = false;
  a.facePlayer();
  // P1 (DESIGN2 §7.1): a kingdom she visited today → «Fortell om Blomsterslottet!»
  const vis = F.RQuest && F.RQuest.visitedToday ? F.RQuest.visitedToday() : null, VR = vis && F.REALMS && F.REALMS.get ? F.REALMS.get(vis) : null;
  if (VR && F.TPL.has('rq_mia_fortell')) await a.say('rq_mia_fortell', { slott: VR.castle });
  await a.say('q_story_ask');
  let nA = 0, n = 0, last = null, nOther = 0;
  for (let i = 0; i < 3; i++) {
    const item = storyItem(last, nOther);
    if (!item) break;
    // the line after the item: «Les mer!» before a reading item, Mia's listening / picture line before F78 / F79
    const other = item.format === 'F78' || item.format === 'F79';
    if (other) { nOther++; a.facePlayer(); const l = item.format === 'F78' ? 'q_story_hor' : 'q_story_bilder'; if (F.TPL.has(l)) await a.say(l); }
    else if (i > 0) { a.facePlayer(); await a.say('q_story_mer'); }
    const res = await F.Task.run(item, { npc: a, thing: a.th, place: 'mia', story: true });
    if (!res) break;
    n++; if (res.outcome === 'A') nA++; last = item.format;
  }
  a.facePlayer(); a.gesture('yawn', 2.5);
  await a.say('q_story_takk');
  log('story', { n, A: nA });
  F.emit('storyDone', n, nA);
  done();
}
Quest.bedtimeStory = function (o) {
  o = o || {};
  const a = F.Act.byId('mia');
  if (!a) return Promise.resolve(false);
  return new Promise(resolve => {
    let fin = false;
    const done = () => { if (fin) return; fin = true; Quest.storyPending = false; if (a.wish && a.wish.story) a.clearWish(); goalSoon(); resolve(true); };
    // DESIGN2 §2.8.6: Mia walks in through the tower door and waits by the cloud bed (WP2 F.Tower.miaSpot); legacy: her room 18
    const ms = F.Tower && F.Tower.miaSpot && F.Tower.real && F.Tower.real() ? F.Tower.miaSpot() : null;
    if (ms && ms.x != null) {
      const ex = F.Tower.exitPos ? F.Tower.exitPos() : null, here = F.Tower.inside && F.Tower.inside();
      const at = here && ex ? ex : ms;
      a.place('in', at.x, at.z, 'fetarn', { bld: 'tarn', f: ms.f || 0 });
      if (at !== ms) F.T.timeout(() => { if (Quest.storyPending && !a.busy) a.walkTo(ms.x, ms.z, { always: true }).then(() => a.facePlayer()); }, 400);
      Quest.storyAt = 'tarn';
    } else if (a.room !== 'mia' && a.space === 'in' || a.space !== 'in') { const p = F.Act.roomPos(18); if (p) a.place('in', p.x, p.z, p.room); Quest.storyAt = 'mia'; }
    Quest.storyPending = true; goalSoon();
    a.setWish({ kind: 'quest', gold: true, story: true, model: firstModel(['bok', 'life_gaveeske']), onPress: x => runStory(x, done) });
    F.SAY('q_story_puff');
    F.T.timeout(() => { if (!fin && Quest.storyPending && !F.Task.current) done(); }, (o.waitSec || 270) * 1000);
  });
};
F.dbg = F.dbg || {};
F.dbg.story = () => Quest.bedtimeStory({ waitSec: 600 });

/* ---------------------------------------------------------- debug */
F.dbg = F.dbg || {};
F.dbg.quest = (id, giver) => { const st = Quest.start(id, giver, { accept: true }); F.debug.frames(2); return st ? { id, step: st.step, giver: st.giver } : null; };
F.dbg.questState = () => JSON.parse(JSON.stringify(QS()));
// v3 WP6: start a helping mission on a character (kind H1|H2|H3, steps 2–4) → instance id;  pacing state
F.dbg.chain = (actorId, kind, steps) => { const a = F.Act.byId(actorId); if (!a) return null; const id = startChain(a, a.wish, { kind, steps }); F.debug.frames(2); return id; };
F.dbg.pace = () => ({ tasks: R.tasks, inBreak: R.inBreak, breakDue: R.breakDue, partyDue: R.partyDue, freePresses: R.freePresses, freeT: +R.freeT.toFixed(1),
  busy: activityBusy(), act: Object.keys(R.act), breaks: R.breaks, parties: R.parties, queued: R.queued, hist: R.hist.slice(), direct: direct() });
F.dbg.questStep = async (id, answer) => {
  // performs the current step of quest `id` (press the giver/target, answer the task with F.dbg.answer)
  const st = QS().list[id]; if (!st) return { done: true };
  const d = defOf(id), step = d.steps[st.step];
  let p;
  if (step && step.t === 'deliver') { deliverDone(id); p = null; }
  else if (step && step.t === 'shop') { F.emit('shopBuy', step.shop, null, null); p = null; }
  else if (step && step.t === 'travel') { advance(id, null); p = null; }
  else if (!step || step.t === 'task' && step.at !== 'obj' || step.t === 'back' || step.t === 'talk') { const g = giverOf(id); p = F.Act.press(g); }
  else { const th = F.Things.byId(st.target); p = th.type === 'life_qobj' ? Quest.onObj(th) : F.Things.run(th); }
  for (let i = 0; i < 400; i++) {
    await F.dbg.stepA(0.2);
    if (F.Task.current) { const t = F.Task.current; await F.dbg.answer(answer != null ? answer : true); await F.dbg.finishTask(40); break; }
    if (!stepBusy && !(F.Act.byId(st.giver) || {}).busy) break;
  }
  let settled = false; Promise.resolve(p).then(() => { settled = true; }, () => { settled = true; });
  for (let i = 0; i < 400 && !settled; i++) {
    await F.dbg.stepA(0.2);
    if (F.Task.current) { await F.dbg.answer(answer != null ? answer : true); await F.dbg.finishTask(40); }
  }
  await F.dbg.stepA(0.5);
  // clarity §3.1-7: the end comes by itself next to the giver (≤ 0.5 s later) – wait for the giver's thanks and the reward
  for (let i = 0; i < 100; i++) { const s3 = QS().list[id], d3 = defOf(id); if (!(finishing > 0 || (s3 && d3 && !d3.chain && backStep(d3.steps[s3.step]) && giverNear(giverOf(id), 12)))) break; await F.dbg.stepA(0.2); }
  const s2 = QS().list[id];
  return s2 ? { id, step: s2.step } : { id, done: true };
};
})();
