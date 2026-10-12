/* Feslottet – task runtime: F.Task registry, the in-task protocol (DESIGN §9.6) and the stage kit S (§11.4).
   Owner: CORE+STAGE.  Formats register with F.Task.def(id, spec) – at load time, in any order (formats loaded before
   this file are kept).

   FORMAT CONTRACT (copy the 'F06_demo' pattern at the bottom of this file):
     F.Task.def('F06', { strands:{'T-MENGDE':[1,3]}, places:['…'], roles:null, family:'telle', tpl:['…'],
       async run(item, S) {
         const tray = S.tenTray(item.target, { model: 'eple' });          // real 3D things in front of the NPC
         S.prompt('f06_prompt', {}, {});                                   // spoken (template); never the reading target
         await S.chips(item.choices, { kind: 'num' });                     // resolves when SOLVED (protocol inside)
         await S.countOn(tray, item.target);                               // payoff in the world
         return S.result();                                                // {outcome:'A'|'B'|'C', tries, ms, chosen, …}
       } });
   The widget calls (S.chips / S.tiles / S.keypad / S.objects / S.yesno / S.custom(widget,{answer|check})) run the whole protocol:
     wrong 1st → bad sound + 1.2 s lock + targeted hint by misconception tag (fast guess <1.2 s → «Tenk først» + longer lock);
     wrong 2nd → the solution is shown (glow / ghost letters) and she executes it herself → outcome C.
     The expected answer defaults to item.target (numbers) / item.word (words); pass {answer} or {check(v)} to override
     (e.g. several right words). Wrong answers are tagged from item.distractors [{v, tag}] or computed (F.Task.tagNum/tagWord).
   F.Task.run(item, ctx:{npc, thing, place}) -> Promise<Result>   (coins A=3/B=0/C=0 via F.Eco.add, F.LEARN.report, events; economy §2)
   F.Task.offer({formats, ctx, strands, trial, prefer, levelFill}) -> Promise<Result|null>  (F.LEARN.next picks the item; falls back to
     a demo item). v3 (DESIGN3 §3): strands/trial/prefer are forwarded to F.LEARN.next; a restricted call that finds nothing retries
     unrestricted. trial = {atLevel, stretch, allowWarmup, preferFormats}. ctx.coins = {A, B, C} overrides the per-task coins (trials).
     v5 WP-K3: + said, theme, avoidThink, avoidDomains, preferStrands, avoidKeys (o.x, else ctx.x) are forwarded to F.LEARN.next.
   F.Task.series({n, formats, strands, ctx, bundle, trial, prefer, …v5 options, varyThink}) -> Promise<{results, nA, n}>  «Oppgaverekke»
   Golden items (item.golden: engine challenge / trial stretch) are presented: learn_utfordring before, _ok / _miss after.
   Impulsive taps (v3 §10.2, §13.3; v5): a tap while the prompt plays or the gate fills is NOT a try and is SOFT (no lock, no fastWrong:
   a click, the tray / board plaques / gate bar give a cue; her choice is remembered); a wrong tap < 1.5 s after the gate opened is a
   try with core_tenk + 2.5 s calm lock and is reported as res.fastWrong (engine guess guard). Right taps never feed fastWrong.
   F.Task.current -> {item, S, spec, ctx}   F.Task.puff() (HUD calls this when Puff is tapped; true if a task handled it)
   Events: taskStart(item), taskEnd(item, result), puffGlow(bool).
   Debug: F.dbg.forceTask(formatId, {strand, rung, sup, target, word}), F.dbg.task(), F.dbg.answer(true|false|value).

   v4 «TENK FØRST» PROTOCOL (WP-K, DESIGN4 §3 / SYNTHESIS §5.2) – runs inside S.submit for every widget, nothing to do in a format:
     think-gate   answers are judged only after the prompt + S.gateMs(): 0 s production (g < 0.1) / fluency, 1 s choice & recall,
                  2 s reasoning (item.think ∈ MØNSTER DEDUKSJON ROM MODELL KLASSIFISERE FORSTÅ ALGORITME MÅLE) with g ≥ 0.1. A tap during
                  the prompt or the fill is not judged (a RIGHT tap is not accepted either) – v5: a soft nudge, no lock (see v5 below).
                  The tray dims while the prompt plays and a fairy-dust bar fills during the gate. S.gate(ms) / arm {gate} override.
     rapid R      g ≥ 0.1, < 0.8 s (or < 15 % of her median for the format) after the gate → not judged: «Se en gang til» + S.replay;
                  two R in a row → S.onTwin(why) if the format set it (S.twinKeypad for number chips), else a re-deal.
     re-deal      after the 1st counted error the chosen wrong chip becomes a fresh distractor (item.spare → unused item.distractors →
                  misconception neighbours / RW.distractors) and the order shuffles (same handle); S.objects swap places; custom widgets
                  may define w.redeal(v). Yes/no: the 1st error shows the solution (C).
     look-back    S.lookBack(fn(v, tag)) – 2–4 s acting out HER answer after each counted error (input locked), then the hint/solution.
     help         «Hjelp meg» button (left, above the tray) once the gate is open → S.helpMe(): S.help({steps:[fn(S)|{tpl}], sibling})
                  or a kit widget's worked step (w.helpStep: one right card / stone / cell / column done for her) or the targeted
                  hint; outcome out4 'H' (res.outcome 'B'), 0 coins (economy §2). The button pulses with Puff's 12 s idle glow.
     secret (C1)  S.secret / item.secret (auto: item.target/word for T-NAVN, T-SKRIV, SKRIV; opt out item.secret = false or
                  spec.noAutoSecret) are shown as «…» / 🔊 in subtitles and bubbles until the solution step (audio.js F.Speech.maskText).
     replay (C2)  Puff replays S.replay() (audio only, the gate closes meanwhile) or the last prompt.
     keypad       fixed slots: 3 (band A, < 1000) / 4 (band B+) + ✓; the exact length only with S.keypad({showLen:true|n}) (s0/s1).
     g / mode     every widget sets item.g / item.mode when the generator did not (S.setDefaults). res.g, res.mode, res.out4
                  ('A'|'B'|'C'|'H'|'R'), res.rapid, res.redealt, res.help, res.rtFirst go to F.LEARN.report (v5: + res.wrongFast /
                  res.rapidWrong = fast taps on WRONG values only).
     coins        a v4 engine pays by g itself; else here: chip A with g > 0.2 one less (min 1), B / H 0 (economy §2), R 0 (golden keep 6).
     sweep        look-alike chips at s1+ (item.lookalike, or distractor tags REVERSAL DECADE VOWEL FIRST-LETTER ORDER DOUBLE-CONS SILENT;
                  S.chips {sweep:true|false}): right after the prompt Puff glows each chip in turn (MFFT modelling; «Se på hver av
                  dem» for the first 3 of a session), then the gate runs.
     helpers      S.sweep() (Puff looks at each chip), S.perTile(fn) (C4: per-tile sparkle only at s0 / s1 after a miss), S.keepLabel(L)
                  (re-used world label stays visible), S.unlock(), F.Task.cfg {gate, rapid, redeal, help, sweep}, F.dbg.answerRapid, F.dbg.kit().
     widget kit   js/game/tasks/kit.js extends S via F.Task.kits (S.tapAll S.order S.sortAll S.stones S.line S.grid S.vox S.voxShow
                  S.balance S.ribbons S.twoStep S.wheels) – see its header.

   v5 WP-K2 (DESIGN5 §6, playtest BUG 1+2, playtest2 «hints»):
     multi-tap    S.arm({answer, cont: true}) = a later step of ONE answer (order the baskets, the parade): no new gate, no rapid check,
                  no lock on a wrong tap, a tap that landed between two steps is replayed. Without `cont` the stage detects it (same
                  widget re-armed ≤ 4 s after it solved a step, no new prompt). `cont: false` forces a fresh step.
     early taps   soft (see above); S._earlyV remembers the choice: keeping it after the gate is never a rapid guess.
                  v5r2: it is used up by the first judged tap (judged ONCE). Ordering boards (widget.seq – F19 3/4 baskets, F20, F21)
                  keep EVERY tap in a FIFO (S._tapQ: during the prompt, the fill, between steps, behind a queued tap) and apply them
                  in order – the head 0.3 s after the gate opens, the next one at each arm({cont}); a wrong one empties the queue.
                  The kept choice wears the «valgt» ring on chips AND 3D-board plaques (widget.early(v, on, pulse) overrides).
     3D cues      body.kgate-wait / body.kgate-fill while the prompt plays / the gate fills; tappable board plaques (#nlabels .nlabel.click)
                  dim and glow once (.kwait-glow) on an early tap; the gate bar (.kgatebar) sits above the subtitle.
     PHASES       S.phase(name, {answer=true, nudge(kind, k), hint(tag, v), replay:{id, slots, voice}|fn, lineTpl}) – declare the phase
                  (call it BEFORE the widget call that arms the step). answer:false = an action phase without an answer (F08 «tap them
                  all», the F12 purse): help / Puff only say what to do there (nudge, or the phase's own last instruction line), cost
                  nothing, never count; the next arm() ends it. A widget S.use()d without a pending answer step starts such a phase by
                  itself. Every arm() clears the previous step's hint plaques/blocks.
                  S.preHint(kind) runs for «Hjelp meg» / glowing Puff before the first attempt (never the first-error hint with v = null):
                  phase nudge → S.pre(kind, k) (format hook) → widget.preHint / kit structural hint → LES lydering → SKRIV one sound unit
                  per press → «Se godt på hver av dem» + the question again. After an error: S.runHint(tag, S.lastWrong) (phase.hint wins).
                  S.activity() (any pointerdown in a task) re-arms Puff's idle glow. The stage's default number hint never shows the
                  target's numeral and says the target only where it is the heard stimulus (T-NAVN / T-SKRIV / a masked secret).
     payments     F.Task.pay runs every price 1–100 (f_num speaks the price only when it is in F.SETS.PRICE) with ctx.payment → coins 0;
                  any caller may pass ctx.payment: true.
     twins        S.voiceFor sends a first-person line the host cannot voice to the narrator; F.SAY then speaks its narrator twin (tpl.js).

   v5 WP-K3 (wave 2d):
     offer/series forward said, theme, avoidThink, avoidDomains, preferStrands, avoidKeys to F.LEARN.next (o.x, else ctx.x); a series
                  avoids its own keys, varyThink adds the thinking types it already had. Task.lastResult.item has strand / rung / think.
     prompts      S.prompt(id, slots, {more: true}) keeps S.speaking on after the line (more lines follow; S.promptEnd() or the next line
                  without more ends it; 6 s safety). S.prompts([[id, slots, o] …]) = several lines as ONE prompt (Puff replays them all).
     one praise   S.ok() says no second praise when the format already spoke its own OK line after the last solve (id …_ok / _ok2 / _okt;
                  logic §3-H); S.ok({force: true}) still praises. S.ownOk() tells.
     tags         CHANGED (F38's edited position) is a neutral tag like OTHER for the default hints and the engine's tag log.
     hint order   (WP-R2) phase nudge → S.pre → widget preHint / kit hint – unchanged and kept.

   natural audit 11.10. (D6 / D11, owner «stage») – these OVERRIDE the older notes above where they differ:
     right taps   a RIGHT tap is never answered with «Se en gang til». The rapid-guess window runs from the END OF THE QUESTION
                  (S.qEnd = max(tInput, tArm)) and is skipped whenever a think-gate of ≥ 1 s ran (S.rapidLive) – the gate is the
                  thinking time. Inside the window (only without a gate) a WRONG tap is still R («Se en gang til», two → re-deal /
                  twin); a RIGHT one is judged right and counts R silently (no evidence, 0 coins).
     early taps   a choice made WHILE THE QUESTION PLAYS is judged when the gate opens, exactly like a fill tap (A2's keepEarly is the
                  default for every chip and board widget; kit single choices – stones, line, ribbon tag – and kit composing keep
                  theirs too). A ring is never left without a judgement: a lock / closed gate waits ≤ 4 s, else ring off + wobble.
     fast wrong   unchanged: counted, calm lock 2.5 s, re-deal after the 1st error, fastWrong, 0 coins for R. Keep «production
                  twin» under the gate (verify r2): a FAST first wrong tap on a format with a production twin (S.onTwin – F52 / F58)
                  switches it on (the old trigger, two rapid taps, cannot happen after a ≥ 1 s gate).
     3D pictures  objectsWidget picks by a raycast on the real meshes (the picture under the finger), then the nearest projected
                  model centre within its own screen radius (#51: a taller neighbour no longer steals the tap). w.pickAt, w.screenC.
     way out      «Fly videre» (.kfly, a small cloud button near the fairy, never over a stage thing, the tray, a plaque or the HUD)
                  and Esc (hud.js) call F.Task.leave(): a quiet abort (res.aborted 'fly', res.left) – no coins, no report, no line,
                  the question stops talking. The same item waits in Task._again; F.Task.offer serves it first (Task.takeAgain(formats,
                  theme) for callers that run Task.run themselves). Event 'taskLeave'.
                  verify r2: no leave once the answer is solved (S.solved – the payoff is hers; the button hides meanwhile), and only
                  where leaving cannot pay, buy or open a reward (Task.leaveOk(ctx): not in payments / money tasks, not at a spot whose
                  caller runs its payoff on any result – ctx.leave = true opts in once that caller treats res.aborted as «nothing»).
     talk         «Tenk først» (core_tenk) once a session, then visuals (S.tenkLook: wobble + the asker's nod); kit_gate_intro once
                  ever; kit_tenk_forst and kit_gate only on game day 1; kit_se_alle and kit_redeal are never spoken (the sweep and the
                  shuffle show it); learn_nytt only when neither the format nor the strand was ever served (F.save.kit.seen + the
                  engine log); learn_hopp = «Her kommer en litt vanskeligere en!».
     tests        tests/natural_stage.js (child path: real clicks, Escape, real speech timing, speech log). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = THREE.Vector3;
const prevDefs = (F.Task && F.Task.defs) || {};
for (const id in prevDefs) if (prevDefs[id]) prevDefs[id].id = id;   // formats that loaded before this file
const prevKits = (F.Task && F.Task.kits) || [];                     // v4 WP-K: kit.js may load before this file (alphabetical build)
const prevPay = F.Task && F.Task.pay;
const ROYAL_VOICES = ['', 'konge', 'dronning', 'mia'];
// v3 §10.3: villagers, staff and kingdom royals praise in their own voice (core_praise_npc); strand praise (Puff / R4 voices)
const NPC_PRAISE = ['tor', 'per', 'rolf', 'siv', 'kokk', 'vm', 'vk', 'barn', 'rk1', 'rk2', 'rd1', 'rd2'];
const STRAND_PRAISE = { LES: 'core_praise_les', SKRIV: 'core_praise_skriv', 'T-SKRIV': 'core_praise_skriv', 'T-NAVN': 'core_praise_tall', 'T-MENGDE': 'core_praise_tall', 'T-ORDEN': 'core_praise_tall' };
const npcHere = a => !!a && !a.gone && !a.removed && (!a.obj || !!a.obj.parent) && (!a.space || !F.Space || a.space === F.Space.cur);
const COINS = { A: 3, B: 0, C: 0 };   // economy §2 (12.10., honest coins): only a right first-try answer (A) pays – the fallback when the engine pays nothing itself
// v5 WP-K3: F.Task.offer / series forward these F.LEARN.next options (engine.js header «v5 (DESIGN5 §5)»)
const OFFER_FWD = ['said', 'theme', 'avoidThink', 'avoidDomains', 'preferStrands', 'avoidKeys'];
const LOCK_MS = 1200, FAST_S = 1.5, CALM_MS = 2500, IDLE_GLOW_S = 12, READ_AUDIO_S = 4;
// v4 WP-K «Tenk først»: reasoning thinking types get the 2 s gate (g ≥ 0.1); listening strands mask their target automatically (C1)
const RAPID_S = 0.8, EARLY_KEEP_S = 0.5;
// v5r fix1 (review #8): a tap ≥ EARLY_FILL_S after the prompt ended (during the glitter fill) is her considered answer – it is judged
// 0.3 s after the gate opens (EARLY_AUTO_MS) instead of being dropped; an earlier tap (during the prompt) only keeps a pulsing ring
const EARLY_FILL_S = 0.3, EARLY_AUTO_MS = 300;
const REASON_T = ['MØNSTER', 'DEDUKSJON', 'ROM', 'MODELL', 'KLASSIFISERE', 'FORSTÅ', 'ALGORITME', 'MÅLE'];
const AUTO_SECRET = ['T-NAVN', 'T-SKRIV', 'SKRIV'];
// natural audit D6: the think-gate explanations (kit_tenk_forst, kit_gate) belong to her first game day only
const dayOne = () => { try { return ((F.save && F.save.day) || 1) <= 1; } catch (e) { return true; } };
// the persistent «what has she met» record (F.save.kit.seen: formats and strands ever served) – learn_nytt only for the truly new
function seenRec() {
  const ks = F.save ? (F.save.kit = F.save.kit || {}) : (Task._kitMem = Task._kitMem || {});
  const s = ks.seen = (ks.seen && typeof ks.seen === 'object') ? ks.seen : {};
  s.f = s.f || {}; s.s = s.s || {};
  return s;
}
function everServed(item) {
  const rec = seenRec();
  if (rec.f[item.format] || rec.s[item.strand]) return true;
  try {   // saves from before the record: the engine's task log (format at [2], strand at [9]) and this session's history
    const log = (F.save && F.save.learn && F.save.learn.log) || [];
    if (log.some(e => e && (e[2] === item.format || e[9] === item.strand))) return true;
    if (Task.history.some(h => h[0] === item.format)) return true;
  } catch (e) { /* no log */ }
  return false;
}
const bandOf = item => {
  if (!item) return 'A';
  if (item.band) return item.band;
  try { const L = F.LADDERS && F.LADDERS[item.strand], r = L && L.rungs && L.rungs[item.rung]; if (r && r.band) return r.band; } catch (e) {}
  return 'A';
};
// «Se en gang til»: a rapid guess is not judged – eyes, the line, the stimulus again (the gate closes while it plays)
function seeAgain(S) {
  try { F.sfx.click(); const e = F.UI.el('div', 'kseagain', '👀'); document.body.appendChild(e); setTimeout(() => e.remove(), 1500); } catch (e) {}
  S.speaking = true;
  (async () => {
    try { if (F.TPL.has('kit_igjen')) await S.say('kit_igjen', {}, ''); } catch (e) {}
    S.speaking = false;
    await S.replayPrompt();
    S.speaking = false; S.tInput = F.T.now; S._rapidHold = null;    // v5r2 r2: replay over – her taps from now on are kept again
  })();
}
// think-gate look: 'wait' (prompt playing: answers dimmed), 'fill' (fairy-dust fill for the gate time), null (open), 'nudge'
function gateMark(S, st, ms) {
  try {
    const tr = document.getElementById('tray');
    if (st === 'nudge') {
      const ti = tr && tr.querySelector('.tray-in'); if (ti && ti.children.length) { ti.classList.remove('kshake'); void ti.offsetWidth; ti.classList.add('kshake'); }
      // v5 (playtest BUG 1+2): 3D boards have no tray – the tappable number plaques glow softly once («wait a moment»), the gate bar
      // pulses; nothing is refused silently
      document.querySelectorAll('#nlabels .nlabel.click:not(.done)').forEach(e => { e.classList.remove('kwait-glow'); void e.offsetWidth; e.classList.add('kwait-glow'); setTimeout(() => e.classList.remove('kwait-glow'), 1300); });
      if (S && S._gateBar) { S._gateBar.classList.remove('knudge'); void S._gateBar.offsetWidth; S._gateBar.classList.add('knudge'); }
      return;
    }
    // v5: the whole page knows the gate state (dims the 3D-board plaques while the prompt plays – css/kit.css)
    document.body.classList.toggle('kgate-wait', st === 'wait');
    document.body.classList.toggle('kgate-fill', st === 'fill');
    if (tr) {
      tr.classList.toggle('kgate-wait', st === 'wait');
      tr.classList.remove('kgate-fill');
      if (st === 'fill') { tr.style.setProperty('--kgate', Math.max(0.05, (ms || 1000) / 1000) + 's'); void tr.offsetWidth; tr.classList.add('kgate-fill'); }
    }
    // 3D-only answers (objects on the stage, an empty tray): the fairy-dust bar floats low in the middle instead
    // v5: also while the prompt plays (an empty bar = «listen first»), and it sits ABOVE the subtitle bubble (css/kit.css)
    const empty = !tr || !tr.classList.contains('on') || !tr.querySelector('.tray-in > *:not(.khelp)');
    if (S && (st === 'fill' || st === 'wait') && empty) {
      if (!S._gateBar) { S._gateBar = F.UI.el('div', 'kgatebar'); document.body.appendChild(S._gateBar); S.kitEls.push(S._gateBar); }
      const b = S._gateBar; b.style.setProperty('--kgate', Math.max(0.05, (ms || 1000) / 1000) + 's');
      b.classList.remove('on', 'kwait'); void b.offsetWidth; b.classList.add(st === 'fill' ? 'on' : 'kwait');
    } else if (S && S._gateBar) S._gateBar.classList.remove('on', 'kwait');
    (S && S.kitEls || []).forEach(b => b.classList && b.classList.toggle('kgate-wait', st === 'wait'));
  } catch (e) { /* DOM-less */ }
}
// «Hjelp meg» button (left above the tray); visible once the gate is open, while a step runs
function helpButton(S) {
  try {
    const b = F.UI.el('button', 'khelp', '<span class="kpuff">✨</span><span>' + (F.UI.caseText ? F.UI.caseText('hjelp meg') : 'hjelp meg') + '</span>');
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); F.sfx.click(); S.helpMe(); });
    document.body.appendChild(b); S.kitEls.push(b); S._helpBtn = b;
  } catch (e) { /* DOM-less */ }
}
/* natural audit D6 (#41): «Fly videre» – a small cloud button near the fairy, outside the stage rect, always there while a task runs.
   A tap (or Esc, hud.js) = F.Task.leave(): a quiet abort, the same item waits for next time. css/kit.css .kfly */
const CLOUD = '<svg viewBox="0 0 64 40" width="40" height="25" aria-hidden="true"><path d="M14 36c-7 0-12-4.6-12-10.4 0-5.2 4-9.4 9.4-10.2C13 8.4 19 4 26 4c7.4 0 13.4 4.8 15 11.4 1-.3 2-.4 3-.4 7.6 0 14 5.2 14 11.6S51.6 36 44 36z" fill="#fff" stroke="#9cc4ef" stroke-width="3" stroke-linejoin="round"/><path d="M46 22l7-5m-7 5l7 5m-7-5h12" stroke="#7d5fd0" stroke-width="3" stroke-linecap="round" fill="none"/></svg>';
function flyButton(S) {
  try {
    const b = F.UI.el('button', 'kfly', CLOUD + '<span>' + (F.UI.caseText ? F.UI.caseText('fly videre') : 'fly videre') + '</span>');
    b.setAttribute('aria-label', 'Fly videre');
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); if (Task.current && Task.current.S === S) Task.leave(); });
    document.body.appendChild(b); S._flyBtn = b;
    S.offs.push(() => { try { b.remove(); } catch (e) { /* gone */ } });
  } catch (e) { /* DOM-less */ }
}
const _ob = new THREE.Box3(), _ob2 = new THREE.Box3(), _ovf = new V3();
function objRects(S) {
  const out = [], cam = F.R.camera, rc = F.R.renderer.domElement.getBoundingClientRect();
  const roots = S.objs.concat(S.hintObjs || [], S.screenObjs || []);
  try { const nb = F.NUM && F.NUM.board && F.NUM.board(); if (nb && nb.alive && nb.root) roots.push(nb.root); } catch (e) { /* no board */ }
  for (const o of roots) {
    if (!o || !o.parent || !o.visible || (o.userData && o.userData.stageFloor)) continue;
    _ob.makeEmpty();
    o.traverseVisible(m => { if (m.isMesh && m.geometry && !m.userData.isSil && !m.userData.stageFloor && !(m.material && m.material.transparent && m.material.opacity < 0.35)) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _ob2.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); _ob.union(_ob2); } });
    if (_ob.isEmpty()) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    for (let i = 0; i < 8; i++) {
      _ovf.set(i & 1 ? _ob.max.x : _ob.min.x, i & 2 ? _ob.max.y : _ob.min.y, i & 4 ? _ob.max.z : _ob.min.z).project(cam);
      if (_ovf.z > 1) continue;
      const x = rc.left + (_ovf.x + 1) / 2 * rc.width, y = rc.top + (1 - _ovf.y) / 2 * rc.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); n++;
    }
    if (n) out.push([x0, y0, x1, y1]);
  }
  return out;
}
// near the fairy: above her head, else beside her, else below her – the first spot clear of the stage (3D stage + board + plaques),
// the tray, the reading note / card, «Hjelp meg» and the HUD buttons; it stays where it is while that spot stays clear (no jumping)
function flyPlace(S, dt) {
  const b = S._flyBtn; if (!b || S.ended || S._runDone || !b.isConnected) return;
  // verify r2: from her solving tap until the next step is armed (or the payoff ends the run) there is nothing to leave – the
  // button fades (Task.leave ignores a tap meanwhile) and comes back at the same spot for the next step
  if (S.solved) { if (b.classList.contains('on')) b.classList.remove('on'); return; }
  S._flyAcc = (S._flyAcc || 0) + dt; if (S._flyAcc < 0.15 && S._flyAt && b.classList.contains('on')) return; S._flyAcc = 0;
  try {
    const vw = innerWidth, vh = innerHeight, bw = b.offsetWidth || 150, bh = b.offsetHeight || 50, pad = 10;
    // every stage thing on its own (the union of all of them – floor disc included – can fill the whole view in a small room):
    // the props, hint blocks, camera boards and the number board, and every plaque / label. verify r2: a plaque / label is an
    // answer she taps – the button keeps a wider berth from those (+12 px each side, 22 px in all) than from the 3D props
    const R = objRects(S), AP = 12;
    document.querySelectorAll('#nlabels > *').forEach(e => { if (e.style.display === 'none') return; const r = e.getBoundingClientRect(); if (r.width > 2) R.push([r.left - AP, r.top - AP, r.right + AP, r.bottom + AP]); });
    S.labels.forEach(L => { const e = L && L.el; if (!e || !e.isConnected || e.style.display === 'none') return; const r = e.getBoundingClientRect(); if (r.width > 2) R.push([r.left - AP, r.top - AP, r.right + AP, r.bottom + AP]); });
    let hudB = 0;
    document.querySelectorAll('#tray.on, .khelp.on, .tnote, .n2-card, .kboard.on, #hud .hud-btn, #hchain, .ser-strip, .gold-badge, .calm-glass').forEach(e => {
      const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
      R.push([r.left, r.top, r.right, r.bottom]);
      if (e.closest('#hud') && r.top < vh * 0.3) hudB = Math.max(hudB, r.bottom);
    });
    const P = F.Player, head = screenOf(new V3(P.pos.x, P.pos.y + 2.0, P.pos.z)), feet = screenOf(new V3(P.pos.x, P.pos.y, P.pos.z));
    const clampP = (x, y) => [U.clamp(x, 12, vw - bw - 12), U.clamp(y, hudB + 12, vh - bh - 12)];
    const free = ([x, y]) => !R.some(r => x < r[2] + pad && x + bw > r[0] - pad && y < r[3] + pad && y + bh > r[1] - pad);
    const cands = [];
    if (head.on) {
      cands.push(clampP(head.x - bw / 2, head.y - bh - 8), clampP(head.x + 34, head.y - bh / 2), clampP(head.x - 34 - bw, head.y - bh / 2), clampP(feet.x - bw / 2, feet.y + 12));
    }
    // a stage that fills the width (a board, a big tray of apples): just above its top edge, over the fairy, then at the sides
    const topY = R.filter(r => r[1] > hudB).reduce((a, r) => Math.min(a, r[1]), vh) - bh - pad - 2;
    const fx = head.on ? head.x - bw / 2 : vw - bw - 16;
    cands.push(clampP(fx, topY), clampP(vw - bw - 16, topY), clampP(16, topY));
    cands.push(clampP(vw - bw - 16, vh * 0.36), clampP(16, vh * 0.36), clampP(vw - bw - 16, vh * 0.55), clampP(16, vh * 0.55));
    let at = S._flyAt && free(S._flyAt) && (!head.on || Math.hypot(S._flyAt[0] + bw / 2 - head.x, S._flyAt[1] + bh / 2 - head.y) < 260) ? S._flyAt : null;
    // nothing fully clear: the spot that covers the least of the stage
    const cover = ([x, y]) => R.reduce((a, r) => a + Math.max(0, Math.min(x + bw, r[2]) - Math.max(x, r[0])) * Math.max(0, Math.min(y + bh, r[3]) - Math.max(y, r[1])), 0);
    if (!at) at = cands.find(free) || cands.slice().sort((p, q) => cover(p) - cover(q))[0];
    S._flyAt = at;
    b.style.left = at[0].toFixed(0) + 'px'; b.style.top = at[1].toFixed(0) + 'px';
    if (!b.classList.contains('on')) b.classList.add('on');
  } catch (e) { /* cosmetic */ }
}
// v3 §13.3 calm lock look (stage.js owns it; injected once – no CSS file needed)
const HOURGLASS = '<svg viewBox="0 0 24 32" width="30" height="40"><path d="M4 2h16v5c0 4-5 7-5 9s5 5 5 9v5H4v-5c0-4 5-7 5-9S4 11 4 7z" fill="#fff8e1" stroke="#c9962b" stroke-width="2"/><path d="M8 26c1-2 3-3 4-3s3 1 4 3v2H8z" fill="#f2c14e"/></svg>';
// golden item (challenge / stretch): a gold star beside the tray while it runs
const GOLDSTAR = '<svg viewBox="0 0 40 40" width="46" height="46"><path d="M20 2l5.4 11.6 12.6 1.4-9.4 8.6 2.6 12.4L20 29.8 8.8 36l2.6-12.4L2 15l12.6-1.4z" fill="#f7cf4d" stroke="#c9962b" stroke-width="2.2" stroke-linejoin="round"/><circle cx="15" cy="15" r="2.4" fill="#fff8d6"/></svg>';
let calmCssDone = false;
function calmCss() {
  if (calmCssDone || typeof document === 'undefined') return; calmCssDone = true;
  const st = document.createElement('style'); st.id = 'calmCss';
  st.textContent = '.tray.calm .tray-in > * { box-shadow: 0 0 0 3px rgba(242,193,78,.75), 0 0 22px rgba(242,193,78,.5); animation: calmPulse 1.2s ease-in-out infinite; }' +
    '@keyframes calmPulse { 50% { box-shadow: 0 0 0 5px rgba(242,193,78,.45), 0 0 30px rgba(242,193,78,.35); } }' +
    '.calm-glass { position: fixed; z-index: 45; transform: translateY(-50%); pointer-events: none; animation: calmTurn 2.5s ease-in-out infinite; filter: drop-shadow(0 2px 4px rgba(0,0,0,.25)); }' +
    '.calm-glass svg { width: 40px; height: 54px; display: block; }' +
    '.calm-glass { background: rgba(255,255,255,.9); border-radius: 50%; padding: 9px 14px; box-shadow: 0 0 0 4px rgba(242,193,78,.55); }' +
    '.gold-badge { position: fixed; left: 30px; top: 112px; z-index: 40; pointer-events: none; animation: goldSpin 3s ease-in-out infinite; filter: drop-shadow(0 2px 6px rgba(201,150,43,.6)); }' +
    '.gold-badge svg { width: 58px; height: 58px; }' +
    '@keyframes goldSpin { 0%, 100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.12); } }' +
    '@keyframes calmTurn { 0%, 70% { transform: translateY(-50%) rotate(0); } 100% { transform: translateY(-50%) rotate(180deg); } }';
  document.head.appendChild(st);
}
const VOWELS = 'aeiouyæøå';
const STOP = { stop: true };   // thrown inside hint animations when the item got solved meanwhile
const skinOf = () => ({ krystall: 'krystall', blomst: 'blomst', boble: 'boble', stjerne: 'stjerne' }[(F.save && F.save.fairy) || 'krystall'] || 'krystall');
const same = (a, b) => (typeof a === 'number' || typeof b === 'number') ? Number(a) === Number(b) : String(a).toLowerCase() === String(b).toLowerCase();

/* ---------------------------------------------------------- misconception tags */
function tagNum(t, v) {
  t = +t; v = +v; if (!isFinite(t) || !isFinite(v) || t === v) return null;
  const tt = Math.floor(t / 10), to = t % 10;
  if (t >= 10 && t < 100 && to !== 0 && v === to * 10 + tt) return 'REVERSAL';                 // 15 → 51
  if (t > 10 && t < 20 && v === to * 10) return 'DECADE';                                      // 13 → 30
  if (t >= 20 && to === 0 && v === 10 + tt) return 'DECADE';                                   // 30 → 13
  if (t > 10 && t < 20 && v === to) return 'DIGIT-ONLY';                                       // 15 → 5
  if (Math.abs(v - t) === 1) return 'OFF-BY-ONE';
  if (Math.abs(v - t) === 10) return 'COUNT-ONES';
  if (Math.abs(v - t) <= 3) return 'OFF-BY-ONE';
  return 'OTHER';
}
function silentPos(w) {
  const out = [];
  if (/^h[vj]/.test(w)) out.push(0);
  if (/^[gd]j/.test(w)) out.push(0);
  if (/[lnr]d$/.test(w)) out.push(w.length - 1);
  if (/ig$/.test(w)) out.push(w.length - 1);
  if (/gl$/.test(w)) out.push(w.length - 2);         // fugl
  return out;
}
function doublePos(w) { for (let i = 0; i < w.length - 1; i++) if (w[i] === w[i + 1] && !VOWELS.includes(w[i])) return i; return -1; }
function tagWord(t, v) {
  t = String(t || '').toLowerCase(); v = String(v || '').toLowerCase();
  if (!t || t === v) return null;
  if (v.length !== t.length) {
    const d = doublePos(t); if (d >= 0 && v === t.slice(0, d) + t.slice(d + 1)) return 'DOUBLE-CONS';
    const dv = doublePos(v); if (dv >= 0 && t === v.slice(0, dv) + v.slice(dv + 1)) return 'DOUBLE-CONS';
    for (const p of silentPos(t)) if (v === t.slice(0, p) + t.slice(p + 1)) return 'SILENT';
    if (v.length === t.length - 1) return 'CLUSTER-DROP';
    return 'LENGTH';
  }
  const diff = []; for (let i = 0; i < t.length; i++) if (t[i] !== v[i]) diff.push(i);
  if (diff.length === 1 && diff[0] === 0) return 'FIRST-LETTER';
  if (diff.every(i => VOWELS.includes(t[i]) && VOWELS.includes(v[i]))) return 'VOWEL';
  if ([...t].sort().join('') === [...v].sort().join('')) return 'ORDER';
  return 'OTHER';
}

/* ---------------------------------------------------------- demo items (fallback when LEARN/BANKS are not there) */
const DEMO_WORDS = ['sol', 'mus', 'hus', 'is', 'bil', 'katt', 'kake', 'ball', 'hest', 'stol', 'fisk', 'eple', 'krone', 'banan'];
function demoItem(strand, rung, sup, target, rng) {
  rng = rng || F.rand; strand = strand || 'T-MENGDE'; rung = rung || 1; sup = sup == null ? 1 : sup;
  if (/^T-/.test(strand)) {
    const max = rung <= 1 ? 12 : rung === 2 ? 15 : 20;
    const n = target != null ? +target : U.int(rng, 10, max);
    const tt = Math.floor(n / 10), to = n % 10;
    const cands = [[n + 1, 'OFF-BY-ONE'], [n - 1, 'OFF-BY-ONE'], [to * 10 + tt, 'REVERSAL'], [to * 10, 'DECADE'], [to, 'DIGIT-ONLY'], [n + 10, 'COUNT-ONES'], [n - 10, 'COUNT-ONES'], [n + 2, 'OFF-BY-ONE']];
    const seen = new Set([n]), ds = [];
    const order = sup >= 2 ? cands : sup === 1 ? [cands[0], cands[1], cands[7], cands[2], cands[3]] : [cands[7], cands[5], cands[0]];
    for (const [v, tag] of order) if (v >= 0 && v <= 99 && !seen.has(v)) { seen.add(v); ds.push({ v, tag }); }
    const k = sup <= 0 ? 1 : sup === 1 ? 2 : 3;
    const distractors = ds.slice(0, k);
    return { strand, rung, sup, key: strand + ':' + n, target: n, choices: U.shuffle(rng, [n, ...distractors.map(d => d.v)]), distractors, structure: sup === 0, params: {} };
  }
  const pool = (F.WORDS && F.WORDS.list && F.WORDS.list.length) ? F.WORDS.list.filter(w => w.model && F.VOX.has(w.model)).map(w => w.w) : DEMO_WORDS;
  const w = target != null ? String(target) : U.pick(rng, pool.length ? pool : DEMO_WORDS);
  const others = U.shuffle(rng, (pool.length ? pool : DEMO_WORDS).filter(x => x !== w)).slice(0, sup <= 0 ? 1 : sup === 1 ? 2 : 3);
  return { strand, rung, sup, key: strand + ':' + w, word: w, target: w, choices: U.shuffle(rng, [w, ...others]), distractors: others.map(v => ({ v, tag: tagWord(w, v) })), params: {} };
}

/* ---------------------------------------------------------- 3D helpers */
function posOf(t) {
  if (!t) return null;
  if (t.isVector3) return t.clone();
  if (t.obj && t.obj.position) return t.obj.position.clone();
  if (t.pos && t.pos.isVector3) return t.pos.clone();
  if (t.x != null && t.z != null) return new V3(t.x, t.y != null ? t.y : F.Space.heightAt(t.x, t.z), t.z);
  return null;
}
function screenOf(p) {
  const v = p.clone().project(F.R.camera), r = F.R.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, on: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
}
// fit a model into a cube of size m (metres); returns the scale used
function fitScale(obj, m) { const b = F.VOX.bbox ? F.VOX.bbox(obj) : new THREE.Box3().setFromObject(obj), s = b.getSize(new V3()); const k = m / Math.max(s.x, s.y, s.z, 0.05); obj.scale.multiplyScalar(k); return k; }

/* outdoors: the fairy's hover spot beside the stage must be free (not inside a tower/house) and visible from the task camera.
   Candidates: both sides of the stage, then 1.5 m / 3 m towards the camera. First clear one wins; otherwise the first free one. */
function pickFairySpot(S, npc, ctx) {
  const sg0 = S.sideSgn || 1, cam = F.R.cam;
  const d = Math.min(cam.distGoal, 13), pit = cam.pitchGoal != null ? cam.pitchGoal : cam.pitch;
  const focus = S.anchor.clone().addScaledVector(S.toCam, 0.9);
  const camPos = focus.clone().addScaledVector(S.toCam, Math.cos(pit) * d); camPos.y = F.Space.heightAt(focus.x, focus.z) + Math.sin(pit) * d;
  const skip = [F.Player.obj, npc && npc.obj, npc && npc.th && npc.th.obj, ctx.thing && ctx.thing.obj].filter(Boolean);
  const objs = F.Space.scene().children.filter(o => o.visible && !skip.includes(o) && !o.isLight && !o.isSprite && o !== F.R.skyDome);
  const ray = new THREE.Raycaster(); ray.camera = F.R.camera;   // nested sprites (e.g. kingdom beams) need a camera to be raycast
  const hidden = p => {
    const head = new V3(p.x, F.Space.heightAt(p.x, p.z) + 1.3, p.z), dir = head.clone().sub(camPos), L = dir.length();
    ray.set(camPos, dir.normalize()); ray.far = L - 0.6;
    for (const h of ray.intersectObjects(objs, true)) {
      let o = h.object, sk = false; while (o) { if (skip.includes(o) || (o.userData && o.userData.isSil)) { sk = true; break; } o = o.parent; }
      if (sk || h.object.isSprite || !h.object.isMesh || (h.object.material && h.object.material.transparent)) continue;
      return true;
    }
    return false;
  };
  const uOf = p => (p.x - S.base.x) * S.right.x + (p.z - S.base.z) * S.right.z, wOf = p => (p.x - S.base.x) * S.toCam.x + (p.z - S.base.z) * S.toCam.z;
  const free = p => !F.Space.blocked(p.x, p.z, 0.45) && !(Math.abs(uOf(p)) < 1.2 && Math.abs(wOf(p)) < 1.2);
  S._fairyOk = p => !F.Space.blocked(p.x, p.z, 0.45) && !hidden(p);   // stageFit re-uses it when the fairy steps out of a wide stage
  const cur = S.fairySpot ? S.fairySpot.clone() : S.anchor.clone().addScaledVector(S.right, 3.7 * sg0).addScaledVector(S.toCam, -0.4);
  if (free(cur) && !hidden(cur)) { S.fairyCheck = 'ok'; return; }
  const cands = [];
  for (const w of [0, 1.5, 3]) for (const sg of [sg0, -sg0]) cands.push({ sg, w, p: S.anchor.clone().addScaledVector(S.right, 3.7 * sg).addScaledVector(S.toCam, -0.35 + w) });
  let pick = cands.find(c => free(c.p) && !hidden(c.p));
  S.fairyCheck = pick ? 'moved' : 'fallback';
  if (!pick) pick = cands.slice().reverse().find(c => free(c.p));   // nothing fully clear: the free spot nearest the camera
  if (!pick) return;
  S.sideSgn = pick.sg; S.fairySpot = pick.p;
}

/* ---------------------------------------------------------- the stage kit */
function makeStage(item, ctx, spec) {
  const npc = ctx.npc || null;
  const voice = (npc && npc.voice) || ctx.voice || '';
  const S = {
    item, ctx, spec, npc, voice, cv: (npc && (npc.cvoice || npc.voice)) || '',
    tries: 0, stepTries: 0, usedHint: false, usedAudio: false, solShown: false, solvedAny: false, solved: false,
    chosen: [], tags: [], t0: F.T.now, tInput: F.T.now, speaking: false, locked: false, okDone: false, ended: false,
    active: null, widgets: [], objs: [], labels: [], hintObjs: [], notes: [], timers: [], offs: [],
    expected: item.word != null && !/^T-/.test(item.strand || '') ? item.word : (item.target != null ? item.target : item.word),
    check: null, reading: false, targetSay: null, lastPrompt: null, puffGlow: false, _resolve: null,
    // v4 WP-K «Tenk først» (DESIGN4 §3): secret mask, think-gate, rapid-guess R, re-deal, «Hjelp meg», look-back
    secret: [], replay: null, tArm: F.T.now, rapidN: 0, rTotal: 0, gateTaps: 0, redealt: 0, usedHelp: false, helpN: 0, kitEls: [],
    // v5 WP-K2: multi-tap answers (contStep, buffered taps, soft early taps) and the hint phase contract (S._ph, S.preHint)
    contStep: false, _contAuto: false, _promptN: 0, _pendingTap: null, _earlyV: null, _ph: null, _preN: 0, lastWrong: undefined,
    // v5r2: the FIFO of kept taps on an ordering board (S._pendingTap = its head), the values already placed in this order, the arm
    // counter, the hint-chain depth, «a chain whose step got solved» (stays muted after the next arm) and the after-error chain flag
    _tapQ: [], _seqDone: [], _armN: 0, _hintDepth: 0, _chainStale: false, _chainRel: false, _rapidHold: null, _errChain: false,
  };
  /* ---------- geometry of the stage: the NPC/thing, a stage spot between it and the camera, screen-right vector */
  const base = posOf(npc) || posOf(ctx.thing) || posOf(ctx.place);
  S.has3D = !!base;
  const yaw = F.R.cam.yaw;
  S.toCam = new V3(Math.sin(yaw), 0, Math.cos(yaw));
  S.right = new V3(Math.cos(yaw), 0, -Math.sin(yaw));
  S.base = base || F.Player.pos.clone();
  S.anchor = S.base.clone().addScaledVector(S.toCam, S.has3D ? 1.9 : 2.4);
  // which side of the stage the fairy hovers on (+1 = screen-right). Hints use the other side.
  S.sideSgn = 1;
  S.fairySpot = null;
  // Where does the stage go? Candidates: in front of the NPC (preferred), or beside it (left/right). Each is scored by how much
  // of the tray footprint is blocked (walls, tables, water…) or outside the room; the fairy then hovers on the free side.
  const roomB = F.Space.cur === 'in' && F.Castle && F.Castle.cur && F.Castle.rooms && F.Castle.rooms[F.Castle.cur] && F.Castle.rooms[F.Castle.cur].bounds;
  if (S.has3D) {
    const zMax = roomB ? Math.max(roomB.z0 + 1.6, roomB.z1 - 3.2) : Infinity;
    // static furniture/scenery that is not a Thing (tables, counters, hedges): a downward ray that hits something well above the floor
    const ray = new THREE.Raycaster(); ray.far = 3; ray.camera = F.R.camera;
    const sceneObjs = F.Space.scene().children.filter(o => o !== F.Player.obj && o.visible && !(o.userData && o.userData.thing) && !o.isLight && !o.isSprite && o !== F.R.skyDome);
    const tall = (x, z) => {
      const gy = F.Space.heightAt(x, z);
      ray.set(new V3(x, gy + 2.6, z), new V3(0, -1, 0));          // below ceilings / upper floors of the dollhouse
      const hits = ray.intersectObjects(sceneObjs, true);
      for (const h of hits) {
        let o = h.object, skip = false; while (o) { if (o.userData && (o.userData.thing || o.userData.isSil)) { skip = true; break; } o = o.parent; }
        if (skip || !h.object.isMesh || (h.object.material && h.object.material.transparent)) continue;
        return h.point.y > gy + 0.35;
      }
      return false;
    };
    // solid Things (learning towers, stalls, lamp posts …) are skipped by the ray test above: test their real boxes against the stage
    // footprint and the strip in front of it (the camera looks down at ~50°, so a tall thing in front hides the stage behind it)
    const solids = [];
    try {
      const npcTh0 = npc && (npc.th || npc.thing);
      for (const t of F.Things.list) {
        if (t.space !== F.Space.cur || !t.obj || !t.obj.visible || t === ctx.thing || t === npcTh0 || t.type === 'life_actor' || t.type === 'summoned') continue;
        if (Math.hypot(t.x - S.base.x, t.z - S.base.z) > 18 || Math.abs((t.y || 0) - S.base.y) > 2.5) continue;
        if (!(t.def && (t.def.solid || (t.radius || 0) >= 0.8))) continue;
        const b = new THREE.Box3().setFromObject(t.obj); if (b.isEmpty()) continue;
        const h = b.max.y - Math.max(b.min.y, (t.y || 0));
        if (h < 0.7) continue;
        solids.push({ t, b, h });
      }
    } catch (e) { console.warn('stage solids', e); }
    S._solids = solids;
    S._thingHit = (p, s) => {   // 2 = on the stage, 1 = in front of it and tall enough to hide it, 0 = clear
      let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
      for (const cx of [s.b.min.x, s.b.max.x]) for (const cz of [s.b.min.z, s.b.max.z]) {
        const dx = cx - p.x, dz = cz - p.z, u = dx * S.right.x + dz * S.right.z, w = dx * S.toCam.x + dz * S.toCam.z;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w);
      }
      if (u1 < -4.6 || u0 > 4.6) return 0;
      if (w1 > -1.4 && w0 < 1.7) return 2;
      if (w0 >= 1.7 && w0 < 1.7 + s.h * 0.85) return 1;
      return 0;
    };
    const thingPen = p => { let n = 0; for (const s of solids) { const k = S._thingHit(p, s); n += k === 2 ? 4 : k === 1 ? 2.5 : 0; } return n; };
    const score = (p, front) => {
      let n = thingPen(p);
      try {
        for (let u = -2.2; u <= 2.21; u += 1.1) for (const w of [-0.45, 0.45]) { const x = p.x + S.right.x * u + S.toCam.x * w, z = p.z + S.right.z * u + S.toCam.z * w; if (F.Space.blocked(x, z, 0.22, ctx.thing || null)) n += 0.5; if (tall(x, z)) n += 1; }
        // indoors the camera is low: furniture between the stage and the camera hides it
        if (roomB) for (let u = -2.2; u <= 2.21; u += 1.1) for (const w of [1.0, 1.8, 2.6]) { const x = p.x + S.right.x * u + S.toCam.x * w, z = p.z + S.right.z * u + S.toCam.z * w; if (z < roomB.z1 && tall(x, z)) n += 0.7; }
        // outdoors: a bush / hedge / planter just in front of the stage (camera side) hides its front edge
        else for (let u = -2.2; u <= 2.21; u += 1.1) for (const w of [1.1, 1.9]) { const x = p.x + S.right.x * u + S.toCam.x * w, z = p.z + S.right.z * u + S.toCam.z * w; if (tall(x, z)) n += 0.4; }
      } catch (e) { console.warn('stage score', e); }
      if (roomB && front && p.z > zMax) n += 6;
      return n + (front ? 0 : 1.5);                         // small bias for "in front"
    };
    const uOf = (a, b) => (a.x - b.x) * S.right.x + (a.z - b.z) * S.right.z, wOf = (a, b) => (a.x - b.x) * S.toCam.x + (a.z - b.z) * S.toCam.z;
    let cands;
    if (roomB) {
      // dollhouse rooms are full of furniture: search the visible floor for the freest spot near the NPC
      cands = [];
      for (let x = roomB.x0 + 2.6; x <= roomB.x1 - 2.6 + 1e-6; x += 1.0) for (let z = roomB.z0 + 2.2; z <= zMax + 1e-6; z += 0.9) {
        const p = new V3(x, 0, z), du = uOf(p, S.base), dw = wOf(p, S.base);
        const overlap = Math.abs(du) < 2.9 && Math.abs(dw) < 1.2;
        const hidden = dw <= -1.2 && Math.abs(du) < 3.1;            // behind the NPC: her body would cover the board
        cands.push({ p, front: false, pre: (overlap ? 10 : 0) + (hidden ? 6 : 0) + 0.35 * Math.abs(Math.hypot(du, dw) - 3.4) });
      }
    } else {
      cands = [
        { p: S.anchor.clone(), front: true, pre: 0 },
        { p: S.base.clone().addScaledVector(S.right, 3.4).addScaledVector(S.toCam, 0.3), front: false, pre: 1.5 },
        { p: S.base.clone().addScaledVector(S.right, -3.4).addScaledVector(S.toCam, 0.3), front: false, pre: 1.5 },
        // a ring further out: only wins when the near spots run under/into a tower, stall or house
        { p: S.base.clone().addScaledVector(S.toCam, 3.6), front: false, pre: 0.6 },
        { p: S.base.clone().addScaledVector(S.right, 3.2).addScaledVector(S.toCam, 2.8), front: false, pre: 1.9 },
        { p: S.base.clone().addScaledVector(S.right, -3.2).addScaledVector(S.toCam, 2.8), front: false, pre: 1.9 },
        { p: S.base.clone().addScaledVector(S.right, 5.6).addScaledVector(S.toCam, 1.0), front: false, pre: 2.4 },
        { p: S.base.clone().addScaledVector(S.right, -5.6).addScaledVector(S.toCam, 1.0), front: false, pre: 2.4 },
        { p: S.base.clone().addScaledVector(S.toCam, 5.4), front: false, pre: 2.4 },
      ].filter((c, i) => i === 0 || !(F.Space.cur === 'out' && F.W && F.W.water && F.W.water(c.p.x, c.p.z)));
    }
    cands.forEach(c => { c.s = c.pre + (c.pre >= 10 ? 0 : score(c.p, c.front)); });
    const best = cands.slice().sort((a, b) => a.s - b.s)[0];
    if (!best.front) {
      S.anchor.copy(best.p);
      // the fairy hovers on the stage side away from the NPC (or towards the room's free side)
      let sg = uOf(S.base, best.p) > 0 ? -1 : 1;
      const spot = sgn => best.p.clone().addScaledVector(S.right, 3.7 * sgn).addScaledVector(S.toCam, -0.3);
      if (roomB) { const sp = spot(sg); if (sp.x < roomB.x0 + 0.8 || sp.x > roomB.x1 - 0.8) sg = -sg; }
      S.sideSgn = sg; S.fairySpot = spot(sg);
      if (Math.abs(uOf(S.fairySpot, S.base)) < 1.2 && Math.abs(wOf(S.fairySpot, S.base)) < 1.2) S.fairySpot.addScaledVector(S.toCam, 1.3);   // never inside the NPC
    }
    S.stageScores = cands.map(c => +c.s.toFixed(1)).slice(0, 12);
    if (!roomB) { try { pickFairySpot(S, npc, ctx); } catch (e) { console.warn('fairy spot', e); } }
  }
  if (roomB) {
    const b = roomB, zMax = Math.max(b.z0 + 1.6, b.z1 - 3.2);
    if (!S.fairySpot) S.sideSgn = (b.x1 - S.anchor.x) >= (S.anchor.x - b.x0) ? 1 : -1;
    S.anchor.x = U.clamp(S.anchor.x, b.x0 + 2.6, b.x1 - 2.6);
    S.anchor.z = U.clamp(S.anchor.z, b.z0 + 1.6, zMax);
    if (S.fairySpot) { S.fairySpot.x = U.clamp(S.fairySpot.x, b.x0 + 0.8, b.x1 - 0.8); S.fairySpot.z = U.clamp(S.fairySpot.z, b.z0 + 0.8, b.z1 - 0.8); }
  }
  S.anchor.y = F.Space.heightAt(S.anchor.x, S.anchor.z);
  S.yaw = yaw;
  // v5 (#12, logic §3-E): a first-person line the host cannot say in her own voice goes to the narrator ('') – F.SAY then speaks its
  // declared third-person narrator twin (tpl.js F.TPL.twin) – never another character's voice
  S.voiceFor = id => { const t = F.TPL.all[id]; if (!t) return ''; if (t.voices.includes(S.voice)) return S.voice; return (t.voices.includes('') || (F.TPL.twinOf && F.TPL.twinOf(id))) ? '' : t.voices[0]; };
  // v5r fix1 (review #10, «no wrong-phase line»): a line of THIS task is never spoken once the task ended (abort / cleanup – the next
  // task's format is running) and a hint / help / look-back chain falls silent once its step is solved (the payoff waits for the
  // chain to end, S.submit). Formats' own speech helpers (K.say in f_num) ask S.mute() too.
  // v5r2 (verify «hints»): a chain whose step got solved stays mute after the next arm() reset S.solved (S._chainStale) – F22's part-1
  // recount never talks over part 2 – and every hint chain marks itself (S.chainOn/Off, nesting help → hint), so a format's own
  // S.hint override (f_num K.hint) is covered too
  // v5r2 r2 (verify «hints» regression): a chain that outlives the payoff's wait (2.5 s, S.submit) is RELEASED (S._chainRel): it no
  // longer counts as busy, so the praise is never swallowed by the mute; a format's own chain stops through its step checks (f_num
  // chainStop: S.solved), a raw-speech chain (f_lesf retell) spoke anyway. The release ends when that chain has really ended.
  const rawBusy = () => !!(S.hinting || S._helping || S._lbRunning);
  const chainIdle = () => { if (!rawBusy()) { S._chainStale = false; S._chainRel = false; } };
  S.chainBusy = () => !S._chainRel && rawBusy();
  S.mute = () => !!(S.ended || ((S.solved || S._chainStale) && S.chainBusy()));
  S.chainOn = () => { if (S._chainRel || !S.chainBusy()) S._chainStale = false; S._chainRel = false; S._hintDepth++; S.hinting = true; };
  S.chainOff = () => { S._hintDepth = Math.max(0, S._hintDepth - 1); if (!S._hintDepth) S.hinting = false; chainIdle(); };
  S._chainIdle = chainIdle;
  S.say = (id, slots, v) => S.mute() ? Promise.resolve() : F.SAY(id, slots || {}, v != null ? v : S.voiceFor(id));
  // say a number: the royals count with their own voice clips; other NPCs via actor.count(n) (LIFE); otherwise the narrator
  S.sayNum = (n, v) => {
    if (S.mute()) return Promise.resolve();
    if (v && ['konge', 'dronning', 'mia'].includes(v) && n >= 1 && n <= 20) return F.SAY('core_count', { n }, v);
    if (v && npc && npc.count && (npc.cvoice === v) && n >= 0 && n <= 20) { try { return Promise.resolve(npc.count(n)); } catch (e) { /* fall through */ } }
    return n >= 0 && n <= 100 ? F.SAY('core_num', { n }, '') : Promise.resolve();
  };
  S.timeout = (fn, ms) => { const t = F.T.timeout(() => { if (!S.ended) fn(); }, ms); S.timers.push(t); return t; };
  S.on = (ev, fn) => { const off = F.on(ev, fn); S.offs.push(off); return off; };

  S.fastWrong = 0; S.earlyTaps = 0;
  function calmMark(on) {
    try {
      calmCss();
      const tr = document.querySelector('.tray'); if (tr) tr.classList.toggle('calm', !!on);
      let hg = document.getElementById('calmGlass');
      if (on && !hg) {
        // beside the tray when it shows choices, else (3D objects on the stage) low in the middle of the screen
        hg = F.UI.el('div', 'calm-glass'); hg.id = 'calmGlass'; hg.innerHTML = HOURGLASS;
        const r = tr && tr.classList.contains('on') ? tr.getBoundingClientRect() : null;
        if (r && r.height > 30 && r.top < innerHeight - 20) { hg.style.left = Math.max(8, r.left - 84) + 'px'; hg.style.top = (r.top + r.height / 2) + 'px'; }
        else { hg.style.left = (innerWidth / 2 - 34) + 'px'; hg.style.top = (innerHeight - 80) + 'px'; }
        document.body.appendChild(hg);
      }
      if (!on && hg) hg.remove();
    } catch (e) { /* DOM-less */ }
  }
  S.calmMark = calmMark;

  /* ---------- prompt & speech */
  S.prompt = async function (tplId, slots, o) {
    o = o || {};
    if (o.readingTarget) {
      S.reading = true;
      if (o.text) S.note(o.text);
      if (o.targetTpl) S.targetSay = { id: o.targetTpl, slots: o.targetSlots || {}, voice: o.targetVoice };
    }
    if (S.mute()) return;                                          // (review #10) a solved step's hint never re-asks its question
    const id = tplId || (o.readingTarget ? 'core_les' : null);
    const v = o.voice != null ? o.voice : (id ? S.voiceFor(id) : '');
    S.lastPrompt = id ? { id, slots: slots || {}, voice: v } : null;
    // v5: a new question inside an automatically continued step makes it a fresh step (gate + rapid check again)
    S._promptN++;
    if (S.contStep && S._contAuto) freshStep();
    if (!id) { S.tInput = F.T.now; return; }
    S.speaking = true;
    if (S._moreT) { F.T.clear(S._moreT); S._moreT = null; }
    try { await F.SAY(id, slots || {}, v); }
    finally {
      // v5 WP-K3 (WP-G request): o.more = more prompt lines follow – the speaking flag stays on (the gate waits, early taps stay soft)
      // until the last line (one without more) or S.promptEnd(); a safety release after 6 s of silence
      if (o.more && !S.ended) { S._promptMore = true; S._moreT = S.timeout(() => { S._moreT = null; if (S._promptMore && !(F.Speech && F.Speech.busy())) S.promptEnd(); }, 6000); }
      else { S._promptMore = false; S.speaking = false; S.tInput = F.T.now; S.armIdle(); }
    }
  };
  S.promptEnd = function () { if (S._moreT) { F.T.clear(S._moreT); S._moreT = null; } S._promptMore = false; S.speaking = false; S.tInput = F.T.now; if (!S.ended) S.armIdle(); };
  // several prompt lines as ONE prompt: [[tplId, slots, o] …] – the gate opens after the last; Puff's replay says them all again
  S.prompts = async function (list, o) {
    list = (list || []).filter(Boolean); if (!list.length) return;
    S._promptGroup = list.map(x => [x[0], x[1] || {}, Object.assign({}, o || {}, x[2] || {})]);
    for (let i = 0; i < list.length; i++) {
      const [id, sl, oo] = S._promptGroup[i];
      if (S.ended) return;
      await S.prompt(id, sl, Object.assign({}, oo, { more: i < list.length - 1 }));
    }
    S._promptGroupN = S._promptN;
  };
  // v4 C2: replay the listening stimulus (audio only – the subtitle stays masked). S.replay (set by the format) wins over the prompt.
  // The think-gate closes while it plays and opens again after it.
  // v5 phase contract: a phase's own replay (S.phase(name, {replay})) and, in a phase without an answer (F08 «tap them all»), that
  // phase's instruction – never the next phase's question
  S.replayPrompt = async function () {
    if (S.ended || S.mute()) return;
    const ph = S._ph, phr = ph && ph.replay;
    let fn = null;
    if (phr) fn = typeof phr === 'function' ? phr : () => F.SAY(phr.id, phr.slots || {}, phr.voice != null ? phr.voice : S.voiceFor(phr.id));
    else if (ph && ph.answer === false) { const L = phaseLine(S); if (L) fn = () => F.SAY(L.id, L.slots || {}, L.voice || ''); else if (F.TPL.has(ph.lineTpl || 'kit_h_phase')) fn = () => S.say(ph.lineTpl || 'kit_h_phase', {}, ''); }
    else if (typeof S.replay !== 'function' && S._promptGroup && S._promptGroupN === S._promptN) {
      const G = S._promptGroup;
      fn = async () => { for (const [id, sl, oo] of G) await F.SAY(id, sl, oo.voice != null ? oo.voice : S.voiceFor(id)); };
    }
    else fn = typeof S.replay === 'function' ? S.replay : (S.lastPrompt ? () => F.SAY(S.lastPrompt.id, S.lastPrompt.slots, S.lastPrompt.voice) : null);
    if (!fn) return;
    S.speaking = true;
    try { await fn(); } catch (e) { console.warn('replay', e); } finally { S.speaking = false; S.tInput = F.T.now; }
  };
  S.armIdle = function () {
    if (S._idleT) F.T.clear(S._idleT);
    S._idleT = S.timeout(() => { if (!S.solved && S.stepTries === 0 && !S.usedHint && !S.ended) { S.puffGlow = true; F.emit('puffGlow', true); } }, IDLE_GLOW_S * 1000);
  };
  // v5 (playtest2 R4): any tap on the stage / tray / board means she is busy – the idle glow and the «Hjelp meg» pulse wait again
  S.activity = function () { if (S.ended) return; if (S.puffGlow) { S.puffGlow = false; F.emit('puffGlow', false); } S.armIdle(); };

  /* ---------- v5 HINT PHASE CONTRACT (DESIGN5 §6, playtest2 «hints»): every answer step / action phase has its own help.
     S.phase(name, {answer = true, nudge(kind), hint(tag, v), replay: {id, slots, voice} | fn, lineTpl})  – a format declares the phase
       it is in; `answer: false` = an action phase without an answer (tap them all, tap the purse): help and Puff only say/show WHAT TO DO
       (nudge, or the phase's own instruction), cost nothing, and never count towards the answer. The next arm() ends it.
       A widget used without a pending answer step (S.use before any arm) starts such a phase automatically (its instruction = the last
       format line spoken in it, e.g. num_f08_tap).
     S.preHint(kind)  – «Hjelp meg» / glowing Puff BEFORE the first attempt of a step: the phase nudge, the widget's structural hint, LES
       lydering (Table A), SKRIV one sound unit per press (firstUnitNudge), else «Se godt på hver av dem» + the question again. Never a
       first-error hint with v = null, never the count / spelling / digits of the answer.
     S.runHint(tag, v) – the first-error hint of the current phase (phase.hint wins over S.hint).
     S.answerPhase() → false in an action phase.   S.activity() – she is busy (re-arms the idle glow). */
  S.answerPhase = () => !(S._ph && S._ph.answer === false);
  S.phase = function (name, o) {
    o = o || {};
    clearHint();
    S._ph = { name: name || 'step', answer: o.answer !== false, nudge: typeof o.nudge === 'function' ? o.nudge : null, hint: typeof o.hint === 'function' ? o.hint : null,
      replay: o.replay || null, lineTpl: o.lineTpl || null, t: F.T.now, logFrom: logN(), auto: !!o.auto };
    S._preN = 0; S._stepHelp = 0;
    if (S.puffGlow) { S.puffGlow = false; F.emit('puffGlow', false); }
    if (!S.ended) S.armIdle();
    return S._ph;
  };
  S.runHint = function (tag, v) {
    const ph = S._ph;
    if (ph && ph.hint) { clearHint(); S.chainOn(); return Promise.resolve().then(() => ph.hint(tag, v)).catch(e => { if (e !== STOP) console.error('phase hint', e); }).then(() => S.chainOff()); }
    // v5r2: a format's own S.hint (f_num K.hint) never set S.hinting – the chain is marked here for every format
    S.chainOn();
    return Promise.resolve().then(() => S.hint(tag, v)).catch(e => { if (e !== STOP) console.error('hint', e); }).then(() => S.chainOff());
  };
  S.preHint = async function (kind) {
    if (S.ended || S.solved) return;
    const ph = S._ph, k = S._preN++;
    clearHint();
    S.chainOn();
    try {
      if (ph && ph.nudge) { await ph.nudge(kind, k); return; }
      if (ph && ph.answer === false) { if (ph.name === 'tapall' && F.TPL.has('kit_h_tapall') && k > 0) await S.say('kit_h_tapall', {}, ''); await S.replayPrompt(); return; }
      if (typeof S.pre === 'function') { await S.pre(kind, k); return; }                    // the format's own pre-attempt nudge
      const w = S.active;
      if (w && typeof w.preHint === 'function') { await w.preHint(kind, k); return; }
      if (w && w.kit && typeof w.hint === 'function') { await w.hint('PRE', null); return; }   // kit hints are structural only
      const exp = S.hintTarget != null ? S.hintTarget : S.expected;
      if (exp != null && typeof exp !== 'object' && typeof exp !== 'function') {
        const isNum = typeof exp === 'number' || /^\d+$/.test(String(exp));
        if (S.reading && !isNum) { await wordHint(S, String(exp), 'HINT'); return; }       // LES: lydering of the note is allowed (Table A)
        if (!isNum && String(exp).length && !S.reading) { await firstUnitNudge(S, String(exp), k); return; }   // SKRIV: one sound per press
      }
      if (F.TPL.has('kit_h_look')) await S.say('kit_h_look', {}, '');
      await S.replayPrompt();
    } catch (e) { if (e !== STOP) console.error('preHint', e); }
    finally { S.chainOff(); }
  };

  /* ---------- tray */
  // natural audit D6: a format that is still running after its task ended («Fly videre», bedtime) never reopens the tray or leaves a
  // widget / 3D thing / label / note behind – after the end the tray is a detached box and new stage things are dropped at once
  S.tray = () => S.ended ? (S._deadTray = S._deadTray || document.createElement('div')) : F.UI.tray(true, { keep: true });
  // arm a new answer step: expected answer / check, fresh step counters, a promise that resolves when solved
  // v5 (playtest BUG 1+2): o.cont = a later step of ONE multi-tap answer (F19 baskets, F20 parade, F21 bells): the gate, the rapid-guess
  // window and the first-answer time are NOT reset, a tap that landed between the steps is replayed, and a wrong tap does not lock.
  // Without o.cont the stage decides itself: the SAME widget re-armed ≤ 4 s after it solved the previous step, with no new prompt
  // since → continuation (a new widget or a new prompt makes it a fresh step again). o.cont === false forces a fresh step.
  // (her early choice S._earlyV survives the arm that follows the prompt – F20 arms only after its two prompt lines; it is cleared
  // when a step is solved)
  function freshStep() { S.contStep = false; S._contAuto = false; S.tArm = F.T.now; S.rapidN = 0; S.rapidOff = false; S.firstAt = null; S._seqDone = []; S._rapidHold = null; }
  function arm(o) {
    o = o || {};
    const prevW = S.active;
    const auto = o.cont == null && !!prevW && !prevW.dead && prevW === S._lastSolveW && F.T.now - (S._lastSolveT || -99) < 4 && S._promptN === S._lastSolvePromptN;
    const cont = o.cont != null ? !!o.cont : auto;
    if (o.answer !== undefined) S.expected = o.answer;
    S.check = o.check ? o.check : null;
    S.solved = false; S.stepTries = 0; S.solShown = false;
    if (cont) { S.contStep = true; S._contAuto = o.cont == null; } else freshStep();
    if (o.gate != null) S.gateOverride = +o.gate;
    // what hints talk about (e.g. the word, when the answer is an object index) and how a submitted value maps to it
    S.hintTarget = o.hintTarget !== undefined ? o.hintTarget : null;
    S.valueMap = o.valueMap ? o.valueMap : null;
    // v5 hint phase contract: the previous step's hint plaques / blocks never stay into a new step; an action phase ends here
    clearHint();
    if (S._ph && (S._ph.answer === false || S._ph.auto)) S._ph = null;
    S._preN = 0; S.lastWrong = undefined; if (!cont) S._stepHelp = 0;
    S._armPrevW = prevW; S._armPend = true; S._armN++;
    // taps that landed between the steps (while the previous one was still «solved») are her next answers – v5r2 (verify «early_tap»
    // #2): ALL of them, in order (S._tapQ, FIFO; one slot lost every tap but the last). A continued step applies the next one now (its
    // payoff and step animation keep the pace); a fresh step drops the between-steps taps (they belonged to the old question) but keeps
    // the early taps on its widget (F20 arms only after its two prompt lines)
    if (!cont) S._tapQ = S._tapQ.filter(q => !q.between);
    qSync();
    if (cont) drainQ(0);
    return new Promise(r => { S._resolve = r; });
  }
  function use(w) {
    if (S.ended) { try { if (w && w.destroy) w.destroy(); } catch (e) { /* gone */ } return w; }
    if (S._armPend) {
      S._armPend = false;
      if (S.contStep && S._contAuto && w !== S._armPrevW) freshStep();     // a new widget = a new answer, not a continuation
    } else if (!S._resolve && !S.solShown && w && !(S._ph && S._ph.answer === false && !S._ph.auto)) {
      // v5: a widget without a pending answer step (F08 «tap them all», the F12 purse, a board created before its first arm) starts an
      // action phase without an answer – help and Puff talk about what to do now, never about the next question's answer
      S.phase(w.kind || 'act', { answer: false, auto: true });
    }
    S.active = w; S.widgets.push(w); return w;
  }
  // public: custom widgets (boards, spell bar…) join the same protocol. A widget = {kind, values?, feed(v), mark(v,cls), solution(v), lock(on), destroy()}
  S.arm = arm; S.use = use;
  S.custom = (w, o) => { const p = arm(o); use(w); return p; };   // → Promise resolved with the right value when solved; submit via S.submit(v, w)

  /* ---------- the protocol: every widget funnels its submissions through S.submit */
  S.isRight = v => S.check ? !!S.check(v) : same(v, S.expected);
  S.tagOf = v => {
    const vv = S.valueMap ? S.valueMap(v) : v, ex = S.hintTarget != null ? S.hintTarget : S.expected;
    const d = (item.distractors || []).find(x => same(x.v, vv)); if (d && d.tag) return d.tag;
    if (typeof ex === 'number' || /^\d+$/.test(String(ex))) return tagNum(ex, vv);
    if (typeof ex === 'string') return tagWord(ex, vv);
    return 'OTHER';
  };
  /* ---------- v4 «Tenk først» (DESIGN4 §3.5, SYNTHESIS §5.2 B/D/E/F): guess probability, think-gate, rapid-guess R */
  // guess probability of the answer mode: item.g (generator) → spec.g(item) → the widget's default (set by S.chips/S.keypad/kit …)
  S.gOf = function () {
    if (item.g != null && isFinite(+item.g)) return +item.g;
    try { if (typeof spec.g === 'function') { const g = spec.g(item); if (g != null) return +g; } else if (spec.g != null) return +spec.g; } catch (e) { /* default */ }
    const w = S.active;
    if (w && (w.kind === 'chips' || w.kind === 'objects') && w.values) return 1 / Math.max(1, w.values.length);
    if (w && (w.kind === 'keypad' || w.kind === 'tiles')) return 0.01;
    return null;
  };
  // the widget's default g / mode – never over the generator's own values
  S.setDefaults = function (g, mode) {
    if (item.g == null || item._gAuto) { item.g = g; item._gAuto = true; }
    if (mode && (item.mode == null || item._modeAuto)) { item.mode = mode; item._modeAuto = true; }
  };
  S.isFluency = () => !!(item.fluency || item.code === 'Flu' || spec.fluency || item.mode === 'fluency' || item.kind === 'fluency');
  // think-gate length: 0 s production / fluency, 1 s choice & recall, 2 s reasoning with g ≥ 0.1 (format: S.gate(ms) or arm {gate})
  S.gateMs = function () {
    if (!Task.cfg.gate || S.solShown) return 0;
    if (S.gateOverride != null) return S.gateOverride;
    if (S.isFluency()) return 0;
    const g = S.gOf();
    if (g != null && g < 0.1) return 0;
    const think = item.think || spec.think || null;
    if (g != null && g >= 0.1 && (REASON_T.includes(think) || item.reason)) return 2000;
    return 1000;
  };
  S.gateOpenAt = () => S.speaking ? Infinity : Math.max(S.tInput, S.tArm || 0) + S.gateMs() / 1000;
  S.gateOpen = () => F.T.now >= S.gateOpenAt() - 1e-6;
  S.gate = ms => { S.gateOverride = ms == null ? null : +ms; };
  S.rapidS = function () {
    const h = (Task.rt[item.format] || []).slice().sort((a, b) => a - b);
    const med = h.length >= 5 ? h[Math.floor(h.length / 2)] : 0;
    return Math.max(RAPID_S, 0.15 * med);
  };
  // natural audit D6: the end of the question for this step (the prompt / replay ended, or the step was armed later)
  S.qEnd = () => Math.max(S.tInput || 0, S.tArm || 0);
  // would a tap right now fall into the rapid-guess window? Never after a ≥ 1 s think-gate; measured from the end of the question
  S.rapidLive = function () {
    const g = S.gOf();
    return !!(Task.cfg.rapid && !S.contStep && !S.solShown && g != null && g >= 0.1 && !S.isFluency() && S.gateMs() < 1000 &&
      F.T.now - S.qEnd() < S.rapidS());
  };
  // a tap while the gate is closed: nothing is judged (no try, A stays A, nothing marked)
  // v5 (playtest BUG 1+2): early taps are SOFT – no calm lock, no try, no fastWrong, no nag over the prompt. Her choice is remembered
  // (S._earlyV: a choice she keeps after the gate opened is not a rapid guess), the tray / the board plaques / the gate bar give a
  // soft cue, and from the 3rd early tap Puff says once (when nothing else is speaking) «Se på alle først».
  S.submitEarly = function (v) {
    S.earlyTaps++; S.gateTaps++;
    F.sfx.click();
    // v5r2 (verify «early_tap» #3/#4): an ordering board keeps EVERY early tap in order – her 1st basket stays her 1st – and they are
    // applied in order when the gate opens (a basket tapped twice is one choice); each wears the «valgt» ring meanwhile
    const w0 = S.active;
    // v5r2 r2 (verify «early_tap» regression): after a rapid first tap («Se en gang til») the taps still in flight during the replay
    // belong to that rejected burst – not kept (her 2nd basket is never judged as step 1); a soft «not yet» cue, no ring
    if (v !== undefined && seqW(w0) && !w0.dead && S._rapidHold === w0) { gateMark(S, 'nudge'); return false; }
    if (v !== undefined && seqW(w0) && !w0.dead) {
      if (!S._tapQ.some(q => q.w === w0 && same(q.v, v))) { S._tapQ.push({ v, w: w0, t: F.T.now, early: true }); qSync(); }
      ringQ();
      return false;
    }
    if (v !== undefined && !(S._earlyV && same(S._earlyV.v, v))) S._earlyV = { v, t: F.T.now };
    // (review #8) the chosen chip shows it is chosen; a tap after the prompt ended (glitter fill) is judged when the gate opens
    if (v !== undefined && S._earlyV) {
      S._earlyV.w = S.active;
      S._earlyV.fill = !S.speaking && (S._introBusy || !(F.Speech && F.Speech.busy && F.Speech.busy())) && F.T.now - (S.tInput || 0) >= EARLY_FILL_S;
      earlyRing(v);
      if (S._earlyV.fill) return false;                           // no «not yet» shake: her answer is kept and comes next
    }
    gateMark(S, 'nudge');
    // 3D objects on the stage (S.objects): the tapped one gives a tiny «not yet» wobble
    try { const w = S.active; if (w && w.kind === 'objects' && w.items && typeof v === 'number' && w.items[v]) F.FX.wobble(w.items[v].obj, 0.12); } catch (e) { /* cosmetic */ }
    // natural audit D6: «Se på alle først» only on her first game day (the glitter bar and the wobble say it afterwards)
    if (dayOne() && S.gateTaps >= 3 && F.T.now - (S._gateT || -99) > 8 && !S.speaking && !(F.Speech && F.Speech.busy()) && F.TPL.has('kit_gate')) { S._gateT = F.T.now; S.say('kit_gate', {}, ''); }
    return false;
  };
  // (review #8) the 'kvalgt' ring on the chip she chose early; v undefined = off
  // v5r2 (verify «early_tap» #4): 3D boards get it too – the widget's own mark (widget.early(values, pulse)) or the board plaque
  // (#nlabels) showing that value – so a tap during the prompt is never a tap without a visible trace
  function earlyRing(v, pulse) {
    try {
      const w = S.active; if (!w) return;
      if (!Array.isArray(w.chips)) { markBoard(w, v === undefined ? [] : [v], pulse); return; }
      w.chips.forEach((c, j) => {
        if (!c || !c.classList) return;
        const on = v !== undefined && w.values && same(w.values[j], v);
        c.classList.toggle('kvalgt', !!on); c.classList.remove('kpulse-v');
        if (on && pulse) { void c.offsetWidth; c.classList.add('kpulse-v'); }
      });
    } catch (e) { /* DOM-less */ }
  }
  function markBoard(w, vs, pulse) {
    try {
      if (typeof w.early === 'function') { w.early(vs, !!pulse); return; }
      if (typeof document === 'undefined') return;
      const vals = w.values || [];
      document.querySelectorAll('#nlabels .nlabel.click, #nlabels .nlabel.plaque, #nlabels .nlabel.stone').forEach(e => {
        const tx = e.textContent.trim();
        const on = !e.classList.contains('done') && vs.some(x => String(x) === tx) && (!vals.length || vals.some(x => String(x) === tx));
        e.classList.toggle('kvalgt', on); e.classList.remove('kpulse-v');
        if (on && pulse) { void e.offsetWidth; e.classList.add('kpulse-v'); }
      });
    } catch (e) { /* DOM-less */ }
  }
  S.earlyRing = earlyRing;
  // v5r2: the kept taps of an ordering board (widget.seq) – S._pendingTap mirrors the head (tests, F.dbg.kit().pending)
  const seqW = w => !!(w && w.seq);
  function qSync() { S._pendingTap = S._tapQ.length ? S._tapQ[0] : null; }
  function ringQ() { const w = S.active; if (seqW(w) && !w.dead) markBoard(w, S._tapQ.filter(q => q.w === w).map(q => q.v), false); }
  // apply the head of the queue when the step is armed, the gate open and nothing locked (else the gate tick / the next arm does it);
  // taps of another widget or for a value already placed in this order (a double tap on one basket) are dropped
  function drainQ(ms) {
    if (S._qT || !S._tapQ.length) return;
    S._qT = S.timeout(() => {
      S._qT = null;
      const w = S.active;
      // (another widget's tap between two of its own steps keeps the old 1.5 s freshness – only an ordering board queues for long)
      S._tapQ = S._tapQ.filter(q => q.w === w && w && !w.dead && !(S._seqDone || []).some(x => same(x, q.v)) && (seqW(w) || F.T.now - q.t < 1.5));
      qSync(); ringQ();
      if (!S._tapQ.length || S.ended || S.solved || !S._resolve || S.locked || S.solShown || !S.gateOpen()) return;
      const q = S._tapQ.shift(); qSync();
      S.submit(q.v, w, { kept: true });
      ringQ();
    }, ms || 0);
  }
  S._drainQ = drainQ;
  // the gate just opened: a fill-phase choice is judged (it counts as kept – never a rapid guess); a prompt-time one pulses its ring
  // v5r2 (verify «early_tap» #1): judged ONCE – a choice that was already judged (auto) is used up (S.submit clears S._earlyV)
  // natural audit D6 (#39/#56): a choice made WHILE THE QUESTION PLAYED is judged at the gate too, exactly like a fill-time tap (A2's
  // keepEarly, now the default for every chip and board widget) – the ring pulses once and the judgement follows 0.3 s later. A ring
  // never stays without a judgement: if the step cannot take it (a lock, the gate closed again) it waits up to 4 s, else the ring goes
  // with a small wobble (no words).
  function dropEarly(e) {
    if (S._earlyV === e) S._earlyV = null;
    earlyRing(undefined);
    gateMark(S, 'nudge');
  }
  function earlyOnOpen() {
    const e = S._earlyV, w = S.active;
    if (!e || e.auto || S.solved || S.ended) return;
    if (!w || w.dead || e.w !== w) { dropEarly(e); return; }
    if (w.values && w.values.length && !w.values.some(x => same(x, e.v))) { dropEarly(e); return; }   // re-dealt meanwhile
    if (!e.fill) earlyRing(e.v, true);
    const t0 = F.T.now;
    const go = () => {
      if (S.ended || S._earlyV !== e || e.auto) return;
      if (S.solved || S.solShown || S.active !== w || w.dead) { dropEarly(e); return; }
      if (S.locked || !S.gateOpen()) { if (F.T.now - t0 < 4) S.timeout(go, 150); else dropEarly(e); return; }
      e.auto = true; S.submit(e.v, w, { kept: true });
    };
    S.timeout(go, EARLY_AUTO_MS);
  }
  S.earlyOnOpen = earlyOnOpen;
  // production twin / sibling: the format may install S.onTwin(why); otherwise a re-deal (fresh options, new order)
  S.toTwin = function (why) {
    if (typeof S.onTwin === 'function') { try { S.onTwin(why); return true; } catch (e) { console.warn('onTwin', e); } }
    // natural audit D6: the visible shuffle says it – no «Nye valg! Se godt på hver av dem.» (kit_redeal stays as a template only)
    return S.redeal(null);
  };
  // natural audit D6: the silent «think first» – the choices wobble once and the asker tilts its head (no words)
  S.tenkLook = function () {
    gateMark(S, 'nudge');
    try { if (npc && typeof npc.gesture === 'function') npc.gesture('nod', 1.0); else if (ctx.thing && ctx.thing.obj && F.FX.wobble) F.FX.wobble(ctx.thing.obj, 0.18); } catch (e) { /* cosmetic */ }
  };
  // o.kept (stage-internal): her kept choice applied by the stage (fill tap at the gate, the queue of an ordering board) – never rapid
  S.submit = function (v, w, o) {
    if (S.ended) return false;
    const kept = !!(o && o.kept);
    // v5 (playtest BUG 1+2): a tap on the same widget between two steps of one answer (the last step is «solved», the next is not
    // armed yet) is kept and replayed by the next arm({cont}) – it is never lost (v5r2: every one of them, in order)
    if (S.solved && w && w === S.active && !w.dead) { if (!kept) { S._tapQ.push({ v, w, t: F.T.now, between: true }); qSync(); ringQ(); } return false; }
    if (S.solved) return false;
    // v5r2 (verify «early_tap» #2/#3): on an ordering board a tap behind kept taps that are not applied yet waits its turn – the 2nd
    // basket is never judged as step 1 while her 1st is still queued
    if (!kept && w && w === S.active && seqW(w) && !w.dead && !S.solShown && S._tapQ.some(q => q.w === w)) {
      if (!S._tapQ.some(q => q.w === w && same(q.v, v))) { S._tapQ.push({ v, w, t: F.T.now, early: !S.gateOpen() }); qSync(); }
      ringQ(); F.sfx.click();
      return false;
    }
    // a tap while a short lock runs (after an error, a look-back): a soft cue instead of silence
    if (S.locked) { gateMark(S, 'nudge'); return false; }
    S.activity();
    // v5: a tap on a board before its first answer step is armed, while a lead line is still playing (F20 «Hjelp dem med å gå i
    // tog» then the order prompt) is an early tap too – never judged against item.target
    if (!S._resolve && !S.solShown && S._ph && S._ph.auto && (S.speaking || (F.Speech && F.Speech.busy()))) return S.submitEarly(v);
    // v4: nothing is judged before the gate is open – a right tap during the prompt is no longer accepted either (hint_leaks item 2)
    if (!S.solShown && !S.gateOpen()) return S.submitEarly(v);
    if (S._ph && S._ph.auto) S._ph = null;                         // a widget that submits answers is an answer step after all
    S._armPend = false;
    if (seqW(w)) ringQ(); else earlyRing(undefined);               // (review #8) the judged tap replaces the early-choice ring
    const right = S.isRight(v);
    const since = F.T.now - S.gateOpenAt(), g = S.gOf();
    // rapid-guess R (Wise & Kong): g ≥ 0.1 and < 0.8 s (or < 15 % of her median for this format) after the gate opened →
    // not judged, «Se en gang til» + replay (no error, no lock). Two R in a row → production twin / re-deal; fluency exempt.
    // v5: never on a later step of one answer (contStep), never for a choice she already made before the gate opened and keeps
    // (S._earlyV, ≥ 0.5 s ago – real-timing probe: a fluent child re-taps her basket 0.7 s apart), and a right tap does not feed
    // fastWrong (the engine's guess guard)
    const persisted = kept || !!(S._earlyV && same(S._earlyV.v, v) && (F.T.now - S._earlyV.t >= EARLY_KEEP_S || S._earlyV.auto));
    // v5r2 (verify «early_tap» #1/#5): her early choice is used up by the first tap that reaches this point (right, wrong or rapid):
    // it is never judged again at the next gate opening and its ring never pulses again after she answered something else
    S._earlyV = null;
    // natural audit D6 (#39/#56): the rapid window is measured from the END OF THE QUESTION (not from the gate) and is skipped when a
    // think-gate of ≥ 1 s already ran (the gate IS the thinking time); a RIGHT tap is never answered with «Se en gang til» – a right
    // tap inside the window (only possible without a gate) is judged right and counts as R (no evidence, no coins), silently
    const rapid = !persisted && S.rapidLive();
    if (rapid && !right && !S.rapidOff) {
      S.rapidN++; S.rTotal++; if (!right) { S.fastWrong++; S.rapidWrong = (S.rapidWrong || 0) + 1; }
      // v5r2 r2: on an ordering board the rejected tap opens a hold until the replay is over – nothing of this burst is queued
      if (seqW(w) && w === S.active) { S._tapQ = S._tapQ.filter(q => q.w !== w); qSync(); ringQ(); S._rapidHold = w; }
      seeAgain(S);
      if (S.rapidN >= 2) { S.rapidOff = true; S.toTwin('rapid'); }
      return false;
    }
    S.rapidN = 0;
    if (S.firstAt == null && !S.solShown) { S.firstAt = since; const h = Task.rt[item.format] = Task.rt[item.format] || []; h.push(since); if (h.length > 15) h.shift(); }
    S.chosen.push(v);
    if (right) {
      if (rapid && S.stepTries === 0) S.rapidSolve = true;          // a lucky fast tap after two «Se en gang til»: R (no evidence)
      S.solved = true; S.solvedAny = true;
      S._lastSolveW = w || S.active; S._lastSolveT = F.T.now; S._lastSolvePromptN = S._promptN; S._lastRightV = v; S._earlyV = null;
      S._seqDone.push(v);
      S._solveLogN = F.TPL && F.TPL.logN != null ? F.TPL.logN : 0;
      if (w && w.mark) w.mark(v, 'right');
      F.sfx.ok();
      try { const av = F.Player.avatar; if (av && av.userData.play) av.userData.play('cheer', 1.0); } catch (e) {}
      if (S._idleT) F.T.clear(S._idleT);
      // a running hint stops talking; the payoff comes next. v5r2: the chain stays mute after the next arm (S._chainStale) and ends at
      // its next line (f_num loops check S.mute())
      if (S.chainBusy()) { S._chainStale = true; if (F.Speech) F.Speech.clearQueue(); }
      const r = S._resolve; S._resolve = null;
      // (review #10) solved during a hint / help chain: the chain is muted (S.mute) and the payoff waits until it has ended (≤ 2.5 s),
      // so neither its «Tell videre selv» / question replay comes after the praise nor the payoff is swallowed by the mute
      // v5r2 r2: past the cap the chain is released (S._chainRel) – its stale lines stay quiet through S.solved, the payoff speaks
      const t0 = F.T.now, go = () => { if (S.chainBusy() && F.T.now - t0 < 2.5) { S.timeout(go, 120); return; } if (S.chainBusy()) S._chainRel = true; if (r) r(v); };
      S.timeout(go, 380);
      return true;
    }
    if (w && w.mark) w.mark(v, 'wrong');
    F.sfx.bad();
    // v5r2: a wrong tap breaks her planned order – the kept taps behind it are dropped (she rethinks after the hint)
    if (S._tapQ.length) { S._tapQ = []; qSync(); ringQ(); }
    if (S.solShown) { S.lock(700); return false; }          // executing the shown solution: gentle, no extra penalty
    S.tries++; S.stepTries++; S.lastWrong = v;
    const tag = S.tagOf(v); S.tags.push(tag || 'OTHER');
    // impulsive (< 1.5 s after the gate opened): it counts, then «Tenk først» + a 2.5 s calm lock; a considered error keeps the
    // gentle flow (look-back, hint; on a slow first miss «Nesten!» half of the time – same total lock time)
    // v5: a wrong tap in the middle of one multi-tap answer (contStep) shakes, knocks, counts and gets the hint – but never locks
    const fast = !S.isFluency() && !S.contStep && since < FAST_S;
    if (fast) S.fastWrong++;
    // verify r2 (Keep: «production twin»): after a ≥ 1 s gate no tap is rapid any more, so the old trigger (two rapid taps) never
    // fires – a FAST first wrong tap is the guess now: a format with a production twin (S.onTwin) switches it on (F52 / F58: she also
    // produces the answer), on top of the calm lock and the re-deal
    if (fast && S.stepTries === 1 && !S.rapidOff && typeof S.onTwin === 'function' && !(w && w.yesno)) { S.rapidOff = true; S.toTwin('fast'); }
    // yes/no (2 options, nothing to re-deal): tapping the other one is no evidence → the solution right away (C)
    if (S.stepTries === 1 && !(w && w.yesno)) {
      if (!S.contStep) { if (fast) S.calm(CALM_MS); else S.lock(LOCK_MS); }
      const nesten = !fast && Math.random() < 0.5;
      // v5r2 (verify «hints» #8): the whole after-error chain (look-back, «Tenk først», hint) is ONE chain – «Hjelp meg» waits for it
      const ec = S._errChain = (S._errN = (S._errN || 0) + 1);
      (async () => {
        try {
          await S.runLookBack(v, tag);
          // natural audit D6 (#8/#45): «Tenk først …» is spoken at most once a session – after that the calm lock, the hourglass, the
          // chips' wobble and the asker's little head tilt say it
          if (fast) { if (!Task._tenkSaid) { Task._tenkSaid = true; await S.say('core_tenk', {}, ''); } else S.tenkLook(); }
          else if (nesten) await S.say('core_nesten', {}, '');
          if (!S.solved && !S.ended) await S.runHint(tag, v);
        } finally { if (S._errChain === ec) S._errChain = false; }
      })();
      // v4 §5.2 F: re-deal after the 1st error (the chosen wrong option is replaced, the order shuffled) – tapping through the
      // remaining chips never works
      if (Task.cfg.redeal) S.timeout(() => { if (!S.solved && !S.solShown) S.redeal(v); }, 650);
    } else {
      if (!S.contStep) S.lock(LOCK_MS);
      S.solShown = true; S.solShownAny = true;
      (async () => { await S.runLookBack(v, tag); if (!S.ended && !S.solved) await S.solution(); })();
    }
    return false;
  };
  // v4 §5.2 F re-deal. Chips: the chosen wrong value → a fresh distractor (item.spare → unused item.distractors → misconception
  // neighbours), new order. Custom widgets may define w.redeal(wrongV). Returns true when something changed.
  S.redeal = function (wrongV) {
    const w = S.active; if (!w || w.dead || S.solved || S.ended) return false;
    try {
      if (typeof w.redeal === 'function') { const r = w.redeal(wrongV); if (r !== false) S.redealt++; return r !== false; }
      if (w.kind === 'chips' && S._chipArgs && S._chipArgs.w === w && !w.yesno) {
        const { values, o } = S._chipArgs;
        const raw = values.slice();
        const vOf = x => (x && typeof x === 'object' && 'value' in x) ? x.value : x;
        const shown = raw.map(vOf);
        if (wrongV != null && !S.valueMap) {
          const i = shown.findIndex(x => same(x, wrongV));
          const fresh = i >= 0 ? S.freshDistractor(shown, raw[i]) : null;
          if (fresh != null) raw[i] = fresh;
        }
        let nv = U.shuffle(Math.random, raw.slice());
        if (nv.length > 1 && nv.every((x, k) => same(vOf(x), vOf(values[k])))) nv = nv.slice(1).concat(nv.slice(0, 1));   // never the same order
        // the SAME handle gets new buttons (formats may hold a reference to it): values, buttons and clicks are swapped in place
        const kind = o.kind || (typeof vOf(nv[0]) === 'number' ? 'num' : 'word');
        nv.forEach((rw, j) => {
          const v = vOf(rw), old = w.chips[j]; if (!old) return;
          const c = document.createElement('button'); c.className = 'chip k-' + kind; c.dataset.i = j; c.dataset.v = String(v); c.style.setProperty('--i', j);
          if (kind === 'thumb') {
            const model = (rw && rw.model) || v; const img = F.Thumb && F.VOX.has(model) ? F.Thumb.img(model, (rw && rw.opts) || o.opts || {}, { size: 180 }) : null;
            if (img) c.appendChild(img); else c.textContent = F.UI.caseText((rw && rw.label) || String(v));
          } else { const lab = (rw && rw.label != null) ? rw.label : (o.labels ? o.labels[j] : v); c.textContent = kind === 'num' ? String(lab) : F.UI.caseText(lab); }
          if (kind !== 'num' && nv.length <= 4) c.appendChild(F.UI.el('span', 'ck', String(j + 1)));
          c.addEventListener('click', e => { e.stopPropagation(); if (w.locked) return; F.sfx.click(); w._submit(v, j); });
          if (old.parentNode) old.parentNode.replaceChild(c, old);
          w.chips[j] = c; w.values[j] = v;
        });
        S._chipArgs = { values: nv, o, w };
        if (S.locked) w.lock(true);
        S.redealt++;
        return true;
      }
    } catch (e) { console.warn('redeal', e); }
    return false;
  };
  S.freshDistractor = function (shown, rawEx) {
    const exp = S.hintTarget != null ? S.hintTarget : S.expected;
    const bad = x => x == null || shown.some(y => same(y, x)) || same(x, exp) || (S.check && (() => { try { return !!S.check(x); } catch (e) { return true; } })());
    const pool = [];
    (item.spare || []).forEach(x => pool.push(x));
    (item.distractors || []).forEach(d => pool.push(d && typeof d === 'object' && 'v' in d ? d.v : d));
    const thumb = rawEx && typeof rawEx === 'object' && rawEx.model;
    if (typeof exp === 'number' || /^\d+$/.test(String(exp))) {
      const n = +exp, t = Math.floor(n / 10), on = n % 10;
      const hi = Math.max(n, ...shown.map(Number).filter(isFinite));
      const top = hi < 10 ? 9 : Math.max(100, n * 2);                      // digit chips (F15 W1 ones digit) stay digits
      [on * 10 + t, n + 1, n - 1, n + 10, n - 10, n + 2, n - 2, on * 10, 10 + on, n + 11, n - 11, n + 3, n - 3].forEach(x => pool.push(x));
      const c = pool.map(Number).filter(x => isFinite(x) && x >= 0 && x <= top && !bad(x));
      return c.length ? c[0] : null;
    }
    if (typeof exp !== 'string') return null;
    try { if (F.RW && F.RW.distractors) F.RW.distractors(exp, 6, item.sup == null ? 2 : item.sup, { needModel: !!thumb, rng: Math.random }).forEach(x => pool.push(x)); } catch (e) { /* no RW */ }
    const c = pool.filter(x => typeof x === 'string' && !bad(x) && (!thumb || (F.VOX && F.VOX.has(x))));
    if (!c.length) return null;
    return thumb ? Object.assign({}, rawEx, { value: c[0], model: c[0], label: c[0] }) : c[0];
  };
  // v4 §5.2 G look-back: after an error the prop acts out HER answer for 2–4 s (frog to her stone, the beam tips …), then the hint
  S.lookBack = fn => { S._lookBack = typeof fn === 'function' ? fn : null; };
  S.runLookBack = async function (v, tag) {
    const fn = S._lookBack; if (!fn || S.ended) return;
    S._lbRunning = true; S.lock(4300);
    try { await Promise.race([Promise.resolve().then(() => fn(v, tag)), F.T.sleep(4000)]); } catch (e) { console.warn('lookBack', e); }
    finally { S._lbRunning = false; S._chainIdle(); if (!S.ended) S.unlock(); }
  };
  // v4 §5.2 H «Hjelp meg»: a worked step (format: S.help({steps:[fn(S) | {tpl, slots}], sibling: async fn(S)})), then a fresh
  // sibling item if the format has one. Outcome H (= B for the engine, 1 coin). Without S.help the targeted hint is the worked step.
  S.help = o => { S._help = o || {}; };
  // v5 phase contract: before her first attempt of a step «Hjelp meg» never runs the first-error hint (S.preHint); in an action phase
  // without an answer (tap them all) it only says what to do and costs nothing (no H)
  S.helpMe = async function () {
    // v5r2 (verify «hints» #8): never a second chain while a hint / the after-error chain / a look-back still runs
    if (S.ended || S.solved || S._helping || S.hinting || S._errChain || S._lbRunning || !S.gateOpen()) return false;
    const ans = S.answerPhase();
    S._helping = true; S.helpN++; if (ans) S.usedHelp = true;
    if (S.puffGlow) { S.puffGlow = false; F.emit('puffGlow', false); }
    S.lock(800);
    try {
      const H = S._help || {}, steps = ans ? (H.steps || []) : [];
      S._stepHelp = (S._stepHelp || 0) + 1;                     // «Her er ett steg til» only for a 2nd press in the SAME step / phase
      await S.say(S._stepHelp > 1 ? 'kit_hjelp_igjen' : 'kit_hjelp', {}, '');
      if (steps.length) { const st = steps[Math.min(S.helpN - 1, steps.length - 1)]; if (typeof st === 'function') await st(S); else if (st && st.tpl) await S.say(st.tpl, st.slots || {}, st.voice || ''); }
      // kit widgets: a backward-faded worked step (one right card placed / one stone / one cell / one column for her), else the hint
      else if (ans && S.active && typeof S.active.helpStep === 'function' && !S.solved && !S.ended && (await S.active.helpStep()) !== false) { /* done */ }
      else if (!S.solved && !S.ended) await (S.stepTries === 0 || !ans ? S.preHint('help') : S.runHint('HELP', S.lastWrong));
      if (S.solved || S.ended || S._chainStale) return true;
      if (ans && typeof H.sibling === 'function' && S.helpN >= Math.max(1, steps.length)) { await S.say('kit_hjelp_ny', {}, ''); await H.sibling(S); }
      else await S.say('kit_hjelp_prov', {}, '');
    } catch (e) { console.warn('help', e); }
    finally { S._helping = false; S._chainIdle(); S.tInput = F.T.now; }
    return true;
  };
  // §5.2 D: the MFFT sweep on look-alike options – Puff looks at each chip in turn (call it right after S.chips, before the gate opens)
  S.sweep = async function () {
    const w = S.active; if (!w || !w.chips || S.ended) return;
    S.speaking = true;
    try {
      // natural audit D6: the glowing sweep alone shows «look at each one» – no spoken kit_se_alle
      Task._sweeps = (Task._sweeps || 0) + 1;
      for (const c of w.chips) { if (S.ended || w.dead) break; c.classList.add('glow'); await F.T.sleep(320); c.classList.remove('glow'); }
    } finally { S.speaking = false; S.tInput = F.T.now; }
  };
  // §5.2 E/F production twin for number chips: the chips become the fixed-slot keypad with the same answer (formats opt in with
  // S.onTwin = S.twinKeypad; the default after two rapid guesses is a re-deal)
  S.twinKeypad = function () {
    const w = S.active; if (!w || w.dead || w.kind !== 'chips' || S.solved || typeof S.expected !== 'number') return false;
    const exp = S.expected, fixed = (bandOf(item) !== 'A' || exp >= 1000) ? 4 : 3;
    w.destroy(); const k = S.widgets.indexOf(w); if (k >= 0) S.widgets.splice(k, 1);
    const kp = use(F.UI.keypad({ len: Math.max(fixed, String(exp).length), parent: S.tray(), onSubmit: v => S.submit(v, kp) }));
    if (kp.el) kp.el.classList.add('kfixed');
    item.g = 0.01; item._gAuto = true; item.mode = 'keypad'; item._modeAuto = true; item.twinUsed = true;
    S.tArm = F.T.now;
    if (F.TPL.has('kit_twin')) S.say('kit_twin', {}, '');
    return true;
  };
  // C4: per-tile right/wrong sparkle only at s0 (at s1 after a first miss). Wrap the format's isRight: S.perTile((i, ch) => …)
  S.perTile = fn => function () { const sup = item.sup == null ? 1 : +item.sup; return (sup <= 0 || (sup === 1 && S.tries > 0)) ? fn.apply(this, arguments) : false; };
  // v3 leftover: a world label re-used as a choice stays visible (F.UI.taskKeep) – formats call S.keepLabel(L)
  S.keepLabel = L => { if (L && F.UI.taskKeep) F.UI.taskKeep(L); if (L) L.taskKeep = true; return L; };
  // C1 secret mask: the strings the subtitle/bubbles show as «…» while this step runs and the solution is not shown
  S.maskList = function () {
    if (S.ended || S.solved || S.solShown || item.secret === false || S.secret === null) return [];
    let L = [];
    if (Array.isArray(item.secret)) L = L.concat(item.secret); else if (item.secret != null && item.secret !== true) L.push(item.secret);
    if (Array.isArray(S.secret)) L = L.concat(S.secret);
    if (!L.length && AUTO_SECRET.includes(item.strand) && !spec.noAutoSecret) { const t = item.word != null ? item.word : item.target; if (t != null && t !== '') L.push(t); }
    if (S._hintMask) L = L.concat(S._hintMask);
    return L.filter(x => x != null && String(x).trim() !== '').map(x => String(x));
  };
  S.isSecret = x => x != null && S.maskList().some(s => same(s, x));
  S.lock = function (ms, o) {
    o = o || {};
    S.locked = true; F.UI.trayLock(true);
    S.widgets.forEach(w => w.lock && w.lock(true));
    if (S._lockT) F.T.clear(S._lockT);
    const t0 = F.T.now;
    const release = () => {
      // a calm lock also waits for the prompt (and the «hør ferdig» line) to finish
      if (o.quiet && !S.ended && F.T.now - t0 < 8 && (S.speaking || (F.Speech && F.Speech.busy() && !S.hinting))) { S._lockT = F.T.timeout(release, 250); return; }
      S.locked = false; F.UI.trayLock(false); S.widgets.forEach(w => !w.dead && w.lock && w.lock(false)); S._lockT = null;
      calmMark(false);
    };
    S._lockT = F.T.timeout(release, ms);
  };
  // v3 §13.3 calm lock: no input, a soft golden glow + hourglass on the choices
  S.calm = function (ms) { calmMark(true); S.lock(ms, { quiet: true }); };
  S.unlock = function () { if (S._lockT) F.T.clear(S._lockT); S._lockT = null; S.locked = false; F.UI.trayLock(false); S.widgets.forEach(w => !w.dead && w.lock && w.lock(false)); calmMark(false); };
  S.solution = async function (showFn) {
    S.solShown = true; S.solShownAny = true;
    if (typeof showFn === 'function') { await showFn(); return; }
    const w = S.active;
    if (S._solFn) { await S._solFn(); return; }
    if (w && w.solution) w.solution(S.expected);
    const id = !w ? 'core_sol_chip' : (w.solTpl && F.TPL.has(w.solTpl)) ? w.solTpl : w.kind === 'tiles' ? 'core_sol_tiles' : w.kind === 'keypad' ? 'core_sol_keys' : 'core_sol_chip';
    await S.say(id, {}, '');
  };
  S.wrongValue = function () {
    const w = S.active, exp = S.expected;
    if (w && typeof w.wrongValue === 'function') return w.wrongValue();
    const ds = (item.distractors || []).map(d => d.v);
    if (w && w.kind === 'chips') { const vals = w.values.filter(x => !S.isRight(x)); return vals.find(x => ds.some(d => same(d, x))) ?? vals[0]; }
    if (w && w.kind === 'objects') { return w.values.findIndex(x => !S.isRight(x)); }
    if (w && w.kind === 'keypad') { const n = +exp; const rev = (n % 10) * 10 + Math.floor(n / 10); return rev !== n && rev > 0 ? rev : n + 1; }
    if (w && w.kind === 'tiles') {
      const s = String(exp); const d = ds.find(x => typeof x === 'string' && x.length === s.length && x !== s);
      if (d) return d;
      return s.length > 1 ? s[1] + s[0] + s.slice(2) === s ? s.slice(0, -1) + (s.slice(-1) === 'a' ? 'e' : 'a') : s[1] + s[0] + s.slice(2) : s + 'e';
    }
    return ds[0] != null ? ds[0] : (typeof exp === 'number' ? exp + 1 : exp + 'x');
  };

  /* ---------- widgets (each resolves with the right value when solved) */
  S.chips = function (values, o) {
    o = o || {};
    const p = arm(o);
    const w = use(F.UI.chips(values, Object.assign({}, o, { parent: S.tray(), onPick: v => S.submit(v, w), onSubmit: null })));
    if (o.kind === 'yesno') w.yesno = true;
    S._chipArgs = { values: values.slice(), o, w };
    // §5.2 D: look-alike options (17/71, 13/30, near spellings) → Puff models «look at each one» once the prompt has ended (s1+)
    const LOOK = ['REVERSAL', 'DECADE', 'VOWEL', 'FIRST-LETTER', 'ORDER', 'DOUBLE-CONS', 'SILENT'];
    if (Task.cfg.sweep && o.sweep !== false && values.length >= 3 && (item.sup == null || item.sup >= 1) &&
        (o.sweep || item.lookalike || (item.distractors || []).some(d => d && LOOK.includes(d.tag)))) S._sweepWanted = w;
    S.setDefaults(1 / Math.max(1, values.length), 'chips');
    return p;
  };
  S.yesno = function (o) {
    o = o || {};
    return S.chips([{ value: true, label: 'Ja' }, { value: false, label: 'Nei' }], Object.assign({ kind: 'yesno' }, o));
  };
  // v4 §3.4 / hint_leaks C3: fixed slots (3 up to 999 in band A, 4 from band B) + ✓ – the box count never tells the length.
  // The exact length shows only when the format passes showLen (s0/s1 scaffold: true = the answer's length, or a number).
  S.keypad = function (o) {
    o = o || {};
    if (o.answer === undefined && !o.check) o = Object.assign({ answer: item.target }, o);
    const p = arm(o);
    const exp = S.expected, el = exp != null ? String(exp).length : 0;
    const fixed = o.slots || ((bandOf(item) !== 'A' || +exp >= 1000) ? 4 : 3);
    const show = o.showLen != null && o.showLen !== false ? o.showLen : false;
    const len = show ? (typeof show === 'number' ? show : el) : Math.max(fixed, el);
    const w = use(F.UI.keypad(Object.assign({}, o, { len, auto: show ? !!o.auto : false, parent: S.tray(), onSubmit: v => S.submit(v, w) })));
    if (!show && w.el) w.el.classList.add('kfixed');
    S.setDefaults(0.01, 'keypad');
    return p;
  };
  S.tiles = function (o) {
    o = o || {};
    if (o.answer === undefined) o = Object.assign({ answer: item.word != null ? item.word : String(item.target) }, o);
    const p = arm(o);
    const w = use(F.UI.tiles(Object.assign({ slots: Array.from(String(S.expected)).length }, o, { parent: S.tray(), onSubmit: v => S.submit(v, w) })));
    S.wordView = { kind: 'tiles', w };
    S.setDefaults(0.01, 'tiles');
    return p;
  };
  // tap real 3D objects placed in an arc in front of the NPC (thumb chips in the tray when there is no 3D anchor)
  S.objects = function (models, o) {
    o = o || {};
    const ans = o.answer !== undefined ? o.answer : (() => { const i = models.findIndex(m => same(m.model || m, item.word != null ? item.word : item.target)); return i >= 0 ? i : 0; })();
    const wordOf = i => { const m = models[i]; return m == null ? null : (m.word || m.model || m); };
    if (o.hintTarget === undefined) o = Object.assign({}, o, { hintTarget: item.word != null ? item.word : wordOf(ans) });
    if (!o.valueMap) o = Object.assign({}, o, { valueMap: i => (typeof i === 'number' ? wordOf(i) : i) });
    if (!S.has3D || o.thumbs) {
      const vals = models.map((m, i) => ({ value: i, model: m.model || m, opts: m.opts || o.opts, label: o.labels ? o.labels[i] : (m.label || m.model || m) }));
      const pp = S.chips(vals, Object.assign({}, o, { kind: 'thumb', answer: ans }));
      S.setDefaults(1 / Math.max(1, models.length), 'scene');
      return pp;
    }
    const p = arm(Object.assign({}, o, { answer: ans }));
    use(objectsWidget(S, models, o));
    S.setDefaults(1 / Math.max(1, models.length), 'scene');
    return p;
  };

  /* ---------- 3D content */
  S.place = function (obj, o) {   // add any Object3D to the stage (removed at the end)
    if (S.ended) return obj;                                          // (after the end: never into the world)
    o = o || {};
    const p = o.pos ? o.pos.clone() : S.anchor.clone();
    obj.position.copy(p); obj.rotation.y = S.yaw + (o.ry || 0);
    F.Space.scene().add(obj); S.objs.push(obj);
    return obj;
  };
  S.model = function (id, o) {
    o = o || {};
    let obj;
    if (F.VOX.has(id)) obj = F.VOX.make(id, o.opts || {});
    else { const b = F.M.builder(); b.box(0.6, 0.6, 0.6, 'lilac', 0, 0.3, 0); obj = b.group; }
    if (o.size) fitScale(obj, o.size);
    return S.place(obj, o);
  };
  S.tenTray = function (n, o) {
    o = Object.assign({ skin: skinOf(), pos: S.anchor.clone(), yaw: S.yaw }, o || {});
    const t = F.FX.tenTray(n, o);
    S.objs.push(t.group); S.trays = (S.trays || []).concat(t);
    return t;
  };
  S.label = function (anchor, text, o) { const L = F.UI.label(anchor, text, Object.assign({ space: F.Space.cur }, o || {})); if (S.ended) { L.remove(); return L; } S.labels.push(L); return L; };
  // parchment note with the reading target (letters are spans so hints can light them)
  S.note = function (text, o) {
    o = o || {};
    const len = String(text).length;
    const el = F.UI.el('div', 'tnote' + (len > 26 ? ' long' : len > 12 ? ' small' : ''));
    const letters = [];
    // words are kept together (long sentences wrap between words); letters are spans so hints can light them
    String(text).split(' ').forEach(wd => {
      const ws = F.UI.el('span', 'nword');
      for (const ch of wd) { const s = F.UI.el('span', 'nletter', F.UI.caseText(ch)); ws.appendChild(s); letters.push(s); }
      el.appendChild(ws);
    });
    if (!S.ended) document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    const n = { el, letters, text: String(text), remove() { el.classList.remove('on'); setTimeout(() => el.remove(), 300); } };
    S.notes.push(n); S.wordView = { kind: 'note', n };
    return n;
  };

  /* ---------- counting payoffs */
  // count on from ten: the full ten glows («ti»), then each loose item hops with its number (NPC voice for the 3 royals)
  S.countOn = async function (tray, n, o) {
    o = o || {};
    const v = o.voice != null ? o.voice : S.cv;
    n = n != null ? n : tray.count;
    if (n >= 10) { tray.highlightTen(0); F.sfx.chime(); await S.sayNum(10, v); }
    for (let i = n >= 10 ? 10 : 0; i < n; i++) {
      if (i >= 10 && i % 10 === 0) { tray.highlightTen(1); F.sfx.chime(); await S.sayNum(20, v); break; }
      tray.highlight(i); F.sfx.pling(i % 10);
      await S.sayNum(i + 1, v);
    }
  };
  S.countAll = async function (tray, n, o) {
    o = o || {};
    const v = o.voice != null ? o.voice : S.cv;
    for (let i = 0; i < n; i++) { tray.highlight(i); F.sfx.pling(i % 10); await S.sayNum(i + 1, v); }
  };

  /* ---------- feedback */
  S.ok = async function (o) {
    o = o || {};
    S.okDone = true;
    const at = (S.objs[0] && S.objs[0].position) || S.anchor;
    F.FX.burst(new V3(at.x, at.y + 1.2, at.z), { kind: o.kind || ({ krystall: 'cube', blomst: 'petal', boble: 'bubble', stjerne: 'star' }[skinOf()]), n: 36 });
    F.sfx.sparkle();
    if (npc && npc.react) { try { const r = npc.react('cheer'); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
    const res = S.result();
    const A = res.outcome === 'A', rv = ROYAL_VOICES.includes(S.voice) ? S.voice : '';
    // v3: a golden item (engine challenge / trial stretch) gets its own words – «Den var vanskelig, og du klarte den!»
    if (item.golden && F.TPL.has('learn_utfordring_ok')) { await S.say(A ? 'learn_utfordring_ok' : 'learn_utfordring_miss', {}, ''); return; }
    // v5 WP-K3 (logic §3-H «one reaction per task end», WP-G request): the format already spoke its own OK / praise line after the last
    // solve («Godt tenkt!», «For en formjeger!», «Takk! Brevet kom fram.») → the sparkle stays, the stage says no second praise
    if (o.force !== true && S.ownOk()) return;
    if (A) {
      // v3 §10.3: the giver praises in their own voice (villager, staff, kingdom royal) and Puff stays silent (fallback: Puff)
      if (NPC_PRAISE.includes(S.voice) && npcHere(npc) && F.TPL.has('core_praise_npc')) {
        try { if (npc.say) await npc.say('core_praise_npc', {}, { voice: S.voice, still: true }); else await F.SAY('core_praise_npc', {}, S.voice); return; } catch (e) { /* fall back to Puff */ }
      }
      // v4: a production / large-space A (g ≤ 0.05) sometimes praises the careful thinking itself
      const gA = S.gOf();
      if (gA != null && gA <= 0.05 && Math.random() < 0.35 && F.TPL.has('kit_bra_tenkt')) { await S.say('kit_bra_tenkt', {}, rv); return; }
      // praise the skill she just used half of the time
      const sp = STRAND_PRAISE[item.strand];
      await S.say(sp && F.TPL.has(sp) && Math.random() < 0.5 ? sp : 'core_praise', {}, rv);
      return;
    }
    await S.say('core_praise2', {}, rv);
  };
  S.bad = function () { F.sfx.bad(); };
  // a format OK / praise line (template id …_ok, …_ok2, …_okt) spoken since the last solved step
  S.ownOk = function () {
    try { const L = F.TPL && F.TPL.log; if (!L) return false; const n0 = S._solveLogN != null ? S._solveLogN : Infinity;
      return L.some(e => e.n > n0 && /_ok(t|\d)*$/.test(e.id) && !/^(learn_|core_|kit_)/.test(e.id)); } catch (e) { return false; }
  };
  // v4: res.outcome stays A/B/C for every caller; res.out4 adds H (solved after «Hjelp meg» = B for the engine) and R (a lucky fast
  // tap after two «Se en gang til»: no evidence, no coins). F.Task.run reports out4 to F.LEARN when the engine knows it.
  S.result = function (extra) {
    const outcome = S.solShown || S.solShownAny || (!S.solvedAny && S.tries >= 2) ? 'C' : (S.tries > 0 || S.usedHint || S.usedAudio || S.usedHelp) ? 'B' : 'A';
    const out4 = outcome === 'C' ? 'C' : S.usedHelp ? 'H' : (outcome === 'A' && S.rapidSolve) ? 'R' : outcome;
    return Object.assign({ outcome, out4, tries: Math.min(3, S.tries + 1), ms: Math.round((F.T.now - S.t0) * 1000), chosen: S.chosen.slice(), tags: S.tags.slice(),
      usedAudio: S.usedAudio, usedHint: S.usedHint, usedHelp: S.usedHelp, fastWrong: S.fastWrong, earlyTaps: S.earlyTaps,
      // v5 (WP-E2 engine wrongFast()): fast taps on WRONG values only (judged < 1.5 s after the gate + rapid wrong taps; soft early
      // taps and right taps never count), and the rapid taps among them
      wrongFast: S.fastWrong, rapidWrong: S.rapidWrong || 0,
      g: S.gOf(), mode: item.mode || (S.active && S.active.kind) || null, rapid: S.rTotal, redealt: S.redealt, help: S.helpN, rtFirst: S.firstAt != null ? +S.firstAt.toFixed(2) : null },
      extra && typeof extra === 'object' ? extra : {});
  };

  /* ---------- hints (implemented once; formats may call S.hint(tag) themselves) */
  S.hint = async function (tag, v) {
    if (tag === 'CHANGED') tag = 'OTHER';      // v5 WP-K3 (WP-R2): F38's «changed position» tag is a neutral tag for the default hints
    const exp = S.hintTarget != null ? S.hintTarget : S.expected;
    if (S.valueMap && v != null) v = S.valueMap(v);
    const isNum = typeof exp === 'number' || /^\d+$/.test(String(exp));
    clearHint();
    S.chainOn();
    try {
      const w = S.active;
      if (w && typeof w.hint === 'function') await w.hint(tag, v);                   // kit widgets: their own structural hint
      else if (exp == null || typeof exp === 'object' || typeof exp === 'function') { if (F.TPL.has('kit_h_look')) await S.say('kit_h_look', {}, ''); }
      else if (isNum) await numberHint(S, +exp, tag, v);
      else await wordHint(S, String(exp), tag, v);
    } catch (e) { if (e !== STOP) console.error('hint failed', e); }
    S.chainOff();
  };
  function clearHint() { S.hintObjs.forEach(o => { if (o.parent) o.parent.remove(o); }); S.hintObjs = []; (S.hintLabels || []).forEach(L => L.remove()); S.hintLabels = []; }
  S.clearHint = clearHint;

  /* ---------- cleanup */
  S.cleanup = function () {
    // (review #10) lines a running hint / help chain of this task still has queued never play under the next task
    if ((S.hinting || S._helping || S._lbRunning) && F.Speech && F.Speech.clearQueue) { try { F.Speech.clearQueue(); } catch (e) { /* no queue */ } }
    S.ended = true;
    S.timers.forEach(t => F.T.clear(t)); S.offs.forEach(f => f());
    if (S._lockT) F.T.clear(S._lockT);
    S.widgets.forEach(w => w && w.destroy && w.destroy());
    clearHint();
    S.objs.forEach(o => { if (o.parent) o.parent.remove(o); });
    (S.trays || []).forEach(t => t.dispose && t.dispose());
    S.labels.forEach(L => L.remove());
    S.notes.forEach(n => n.remove());
    if (S.puffGlow) F.emit('puffGlow', false);
    calmMark(false);
    (S.kitEls || []).forEach(e => { try { e.remove(); } catch (er) {} }); S.kitEls = [];
    gateMark(S, null);
    if (S._gold) { S._gold.remove(); S._gold = null; }
    F.UI.trayLock(false);
  };
  // v4 WP-K (DESIGN4 §3.7): the widget kit (js/game/tasks/kit.js) and any other kit extends S here – nobody else edits stage.js
  (Task.kits || []).forEach(k => { try { k(S, item); } catch (e) { console.error('[kit] install failed', e); } });
  return S;
}

/* ---------------------------------------------------------- 3D object picking widget */
function objectsWidget(S, models, o) {
  const n = models.length;
  // v4: 6+ objects (the 6–8 object retrofits) stand in two staggered rows instead of overlapping in one arc
  // (labelled objects – plaques – and a format that sets its own spread keep one row: two label rows would overlap)
  const two = o.rows === 2 || (n >= 6 && o.rows !== 1 && o.spread == null && !o.labels);
  const perRow = two ? Math.ceil(n / 2) : n;
  const spread = o.spread || (two ? Math.min(1.75, 6.6 / Math.max(1, perRow - 1)) : Math.min(1.75, 5.2 / Math.max(1, n - 1)));
  const size = o.size || (two ? Math.min(1.15, spread * 0.92) : 1.15);
  const items = models.map((m, i) => {
    const id = m.model || m;
    let pos;
    if (two) {
      const row = i < perRow ? 0 : 1, j = row ? i - perRow : i, cnt = row ? n - perRow : perRow;
      const k = cnt === 1 ? 0 : (j - (cnt - 1) / 2);
      const stagger = (n - perRow === perRow) ? (row ? spread / 4 : -spread / 4) : 0;    // equal rows: offset so the front never hides the back
      pos = S.anchor.clone().addScaledVector(S.right, k * spread + stagger).addScaledVector(S.toCam, row ? 0.8 : -0.8);
    } else {
      const k = n === 1 ? 0 : (i / (n - 1) - 0.5);
      pos = S.anchor.clone().addScaledVector(S.right, k * spread * (n - 1)).addScaledVector(S.toCam, -Math.abs(k) * 0.5 * (o.arc === false ? 0 : 1));
    }
    pos.y = F.Space.heightAt(pos.x, pos.z);
    const holder = new THREE.Group();
    let obj;
    if (F.VOX.has(id)) obj = F.VOX.make(id, m.opts || o.opts || {});
    else { const b = F.M.builder(); b.box(0.6, 0.6, 0.6, 'lilac', 0, 0.3, 0); obj = b.group; }
    fitScale(obj, size);
    // a soft pastel disc under each object so it reads as "on offer"
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 24), new THREE.MeshLambertMaterial({ color: 0xfff6e8 }));
    disc.position.y = 0.03; disc.receiveShadow = true;
    holder.add(disc); obj.position.y = 0.06; holder.add(obj);
    S.place(holder, { pos });
    // pop-in
    holder.scale.setScalar(0.01);
    F.T.tween(300 + i * 90, kk => holder.scale.setScalar(Math.max(0.01, U.smooth(kk) * (1 + Math.sin(kk * Math.PI) * 0.12))));
    let label = null;
    if (o.labels && o.labels[i] != null) label = S.label(new V3(pos.x, pos.y + size + 0.35, pos.z), o.labels[i], { kind: o.labelKind || 'word', maxDist: 60 });
    return { id, holder, obj, pos, label, box: null };
  });
  const w = { kind: 'objects', values: items.map((_, i) => i), items, dead: false, locked: false, el: null };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // natural audit D6 (#51: «tapping the right picture answers the picture next to it»): the old 0.65× boxes let a taller neighbour's box
  // win. Now: 1. a raycast on the REAL meshes (model + its disc; hidden rings skipped) – the picture under her finger, the nearest
  // one in front wins; 2. a near miss (a gap in a voxel model) → the nearest projected model centre within that model's own screen
  // radius (min 46 px), like f_num's B.hit
  const visibleUp = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const centreOf = it => { const b = new THREE.Box3().setFromObject(it.obj); return b.isEmpty() ? new V3(it.pos.x, it.pos.y + size * 0.5, it.pos.z) : b.getCenter(new V3()); };
  function pickAt(cx, cy) {
    const r = F.R.renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, F.R.camera);
    let best = -1, bd = Infinity;
    items.forEach((it, i) => {
      if (!it.holder.parent) return;
      for (const h of ray.intersectObject(it.holder, true)) {
        if (!h.object.isMesh || !visibleUp(h.object)) continue;
        if (h.distance < bd) { bd = h.distance; best = i; }
        break;
      }
    });
    if (best >= 0) return best;
    let nd = Infinity;
    const cam = F.R.camera, t = Math.tan(cam.fov * Math.PI / 360);
    items.forEach((it, i) => {
      const c = centreOf(it), s = screenOf(c), d = Math.hypot(s.x - cx, s.y - cy);
      const sz = new THREE.Box3().setFromObject(it.obj).getSize(new V3()), rad = Math.max(sz.x, sz.y, sz.z) * 0.55;
      const pxR = Math.max(46, rad / (c.distanceTo(cam.position) * t) * r.height / 2);
      if (d < pxR && d / pxR < nd) { nd = d / pxR; best = i; }
    });
    return best;
  }
  w.pickAt = pickAt;
  const cv = F.R.renderer.domElement;
  let down = null;
  const pd = e => { down = { x: e.clientX, y: e.clientY }; };
  const pu = e => {
    if (w.dead || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) { down = null; return; }
    down = null;
    const i = pickAt(e.clientX, e.clientY);
    if (i >= 0) { e.stopPropagation(); w.pick(i); }
  };
  cv.addEventListener('pointerdown', pd, true); cv.addEventListener('pointerup', pu, true);
  w.pick = i => { if (w.locked || w.dead) return; F.sfx.click(); F.FX.pop(items[i].obj); S.submit(i, w); };
  w.feed = v => { const i = typeof v === 'number' ? v : items.findIndex(it => same(it.id, v)); if (i >= 0) w.pick(i); return true; };
  w.mark = (i, cls) => {
    const it = items[i]; if (!it) return;
    if (cls === 'right') { F.FX.burst(new V3(it.pos.x, it.pos.y + size * 0.6, it.pos.z), { kind: 'star', n: 24 }); F.T.tween(500, k => { it.obj.position.y = 0.06 + Math.sin(k * Math.PI) * 0.6; }); }
    else { F.FX.wobble(it.obj, 0.3); }
  };
  w.solution = i => { const it = items[i]; if (!it) return; w._glow = F.FX.glow(it.holder, { color: 0xffe066, size: size * 2.2, ms: 0 }); bounce(it); };
  // v5r2 r2 (verify «early_tap» #3): her kept choice (stage earlyRing / markBoard) – a gold ring on the ground under the object she
  // tapped while the prompt played, like the chips' «valgt» ring; pulse = the gate opened (it swells twice). [] = off.
  w._early = [];
  w.early = (vs, pulse) => {
    if (w.dead) return;
    w._early = (vs || []).filter(i => items[i]).map(Number);
    items.forEach((it, i) => {
      const on = w._early.includes(i);
      if (on && !it.ring) {
        it.ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffc83d }));
        it.ring.rotation.x = -Math.PI / 2; it.ring.position.y = 0.09; it.holder.add(it.ring);
      }
      if (it.ring) it.ring.visible = on;
      if (on && pulse) { const r = it.ring; F.T.tween(900, k => { r.scale.setScalar(1 + 0.22 * Math.abs(Math.sin(k * Math.PI * 2))); }).then(() => r.scale.setScalar(1)); }
    });
  };
  function bounce(it) { if (w.dead || S.solved) return; F.T.tween(700, k => { it.obj.position.y = 0.06 + Math.sin(k * Math.PI) * 0.25; }).then(() => bounce(it)); }
  w.lock = on => { w.locked = !!on; };
  w.destroy = () => { if (w.dead) return; w.dead = true; cv.removeEventListener('pointerdown', pd, true); cv.removeEventListener('pointerup', pu, true); if (w._glow && w._glow.remove) w._glow.remove(); };
  w.screen = i => screenOf(new V3(items[i].pos.x, items[i].pos.y + size * 0.5, items[i].pos.z));
  w.screenC = i => screenOf(centreOf(items[i]));         // the projected centre of the model itself (tests tap here)
  // v4 re-deal (§5.2 F): the chosen wrong object becomes a fresh distractor model and the objects swap places (unlabelled sets only)
  w.redeal = wrongI => {
    if (w.dead || items.length < 2 || items.some(it => it.label)) return false;
    if (wrongI != null && items[wrongI] && typeof models[wrongI] !== 'object') {
      const shown = items.map(it => it.id);
      const fresh = S.freshDistractor(shown, { model: shown[wrongI] });
      if (fresh && fresh.model && F.VOX.has(fresh.model)) {
        const it = items[wrongI];
        try {
          const obj = F.VOX.make(fresh.model, o.opts || {}); fitScale(obj, size); obj.position.y = 0.06;
          it.holder.remove(it.obj); it.holder.add(obj); it.obj = obj; it.id = fresh.model; models[wrongI] = fresh.model;
          F.FX.burst(new V3(it.pos.x, it.pos.y + 0.6, it.pos.z), { kind: 'sparkle', n: 14 });
        } catch (e) { /* keep the old model */ }
      }
    }
    const pos = items.map(it => it.pos.clone());
    let perm = U.shuffle(Math.random, pos.map((_, i) => i));
    if (perm.every((x, i) => x === i)) perm = perm.slice(1).concat(perm.slice(0, 1));
    items.forEach((it, i) => {
      const from = it.holder.position.clone(), to = pos[perm[i]];
      it.pos = to.clone();
      F.T.tween(420, k => { const e = U.smooth(k); it.holder.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e + Math.sin(k * Math.PI) * 0.5, from.z + (to.z - from.z) * e); });
    });
    return true;
  };
  return w;
}

/* ---------------------------------------------------------- number hints (3D contrast with rods + cubes) */
async function numberHint(S, n, tag, v) {
  const skin = skinOf();
  const g = () => { if (S.solved || S.ended) throw STOP; };
  // C1 / Table B: «Ti og 6.» must not print the ones digit of a secret target
  const sayG = async (id, slots) => { g(); const m = id === 'core_tiog' && S.isSecret(n) && slots && slots.e != null; if (m) S._hintMask = [String(slots.e)]; try { await S.say(id, slots, ''); } finally { if (m) S._hintMask = null; } g(); };
  const numG = async val => { g(); await S.sayNum(val); g(); };
  const sleepG = async ms => { g(); await F.T.sleep(ms); g(); };
  // the format's own ten-tray showing the target (counting happens ON it, where she is looking)
  const tray = (S.trays || []).filter(t => t.count === n && t.group.parent).slice(-1)[0] || null;
  const side = -(S.sideSgn || 1);                       // the side away from the fairy
  const half = tray ? 2.6 * (tray.group.scale.x || 1) : 0;
  const busy = S.objs.length > 1 || (S.active && S.active.kind === 'objects');   // the format has things on the stage → hints go beside it
  const contrast = (tag === 'REVERSAL' || tag === 'DECADE') && v != null && +v >= 0 && +v <= 99;
  const posT = busy ? side * 3.4 : (contrast ? -1.7 : 0), posW = tray ? side * (half + 2.0) : busy ? side * 6.6 : 1.7;
  const show = (val, off, dz) => {                      // base-ten blocks + numeral label, off = metres along screen-right
    const p = S.anchor.clone().addScaledVector(S.right, off).addScaledVector(S.toCam, dz || 0);
    p.y = F.Space.heightAt(p.x, p.z) + 0.02;
    const b = F.FX.numBlocks(val, { skin, pos: p, yaw: S.yaw });
    F.Space.scene().add(b.group); S.hintObjs.push(b.group);
    F.FX.burst(new V3(p.x, p.y + 0.4, p.z), { kind: 'sparkle', n: 12 });
    const rows = Math.floor(val / 10) + (val % 10 ? 1 : 0), depth = Math.max(0, rows - 1) * 0.36 * 1.15;
    const lp = p.clone().addScaledVector(S.toCam, -(depth / 2 + 0.35)); lp.y += 0.55;   // just behind the farthest row (never on the blocks)
    // C1 + v5 (DESIGN5 §6): the target's numeral is NEVER shown by a hint («?»); her own wrong number keeps its digits
    const L = F.UI.label(lp, (val === n || S.isSecret(val)) ? '?' : String(val), { kind: 'num', space: F.Space.cur, maxDist: 60 });
    (S.hintLabels = S.hintLabels || []).push(L);
    return b;
  };
  // v5: the target number is SAID only where it is the heard stimulus (T-NAVN / T-SKRIV, or a masked secret): there saying it again,
  // «ti og fire» and counting along on the rods are the Table B help. Everywhere else (counting, REGN, T-ORDEN …) the hint shows
  // the structure – the full ten («ti») and the ones lighting one by one with a pling – and SHE counts; the total is never said.
  const listen = S.isSecret(n) || ['T-NAVN', 'T-SKRIV'].includes(S.item && S.item.strand);
  const numT = async val => { if (listen || val !== n) await numG(val); };
  // the target: on the tray if there is one, else as blocks
  const T = tray ? {
    ten: () => tray.highlightTen(0), one: i => tray.highlight(10 + i - 1), ones: Math.max(0, n - 10), all: i => tray.highlight(i),
  } : null;
  const target = async () => {           // listening: «ti og fire … fjorten»; otherwise «ti» + the ones light up, she counts
    if (T && n > 10 && n < 20) {
      T.ten(); if (listen) await sayG('core_tiog', { e: n - 10 }); else await numG(10);
      for (let i = 1; i <= T.ones; i++) { T.one(i); if (!listen) F.sfx.pling(i); await sleepG(listen ? 150 : 260); }
      await numT(n); return;
    }
    if (T) { for (let i = 0; i < n; i++) { T.all(i); await sleepG(110); } await numT(n); return; }
    const b = show(n, posT, 0);
    if (n > 10 && n < 20) { b.highlight(0); if (listen) await sayG('core_tiog', { e: n - 10 }); else await numG(10); for (let i = 1; i < b.parts.length; i++) { b.highlight(i); if (!listen) F.sfx.pling(i); await sleepG(listen ? 140 : 260); } }
    else for (let i = 0; i < b.parts.length; i++) { b.highlight(i); await sleepG(150); }
    await numT(n);
  };
  if (contrast) {
    S.say('core_h_forskjell', {}, '');
    const b = show(+v, posW, 0);
    if (tray) {   // «?» over the tray's quantity, her number with its digits beside it – the two quantities side by side
      const lp = tray.group.position.clone().addScaledVector(S.toCam, -1.05); lp.y += 0.6;
      (S.hintLabels = S.hintLabels || []).push(F.UI.label(lp, '?', { kind: 'num', space: F.Space.cur, maxDist: 60 }));
    }
    await sleepG(900);
    await target();
    await sleepG(300);
    for (let i = 0; i < b.parts.length; i++) { b.highlight(i); await sleepG(110); }
    await numG(+v);
    return;
  }
  if (tag === 'DIGIT-ONLY') { await sayG('core_h_tieren', {}); await target(); return; }
  if (tag === 'COUNT-ONES') { await sayG('core_h_ten', {}); await target(); return; }
  // OFF-BY-ONE / other: count on from ten (listening strands count aloud to the heard number; elsewhere «ti», then plings only)
  if (n > 10 && n <= 20) {
    await sayG('core_h_videre', {});
    if (T) { T.ten(); await numG(10); for (let i = 1; i <= n - 10; i++) { if (i === 10) { tray.highlightTen(1); await numT(20); break; } T.one(i); F.sfx.pling(i); if (listen) await numG(10 + i); else await sleepG(330); } return; }
    const b = show(n, posT, 0);
    b.highlight(0); await numG(10);
    for (let i = 1; i < b.parts.length; i++) { b.highlight(i); F.sfx.pling(i); if (listen) await numG(10 + i); else await sleepG(330); }
    return;
  }
  await sayG('core_h_tell', {}); await target();
}
// v5 phase contract: the instruction of an action phase = the last format line spoken since the phase began (protocol, praise and
// number clips excluded) – F08's «Trykk på hvert eple», F12's «Trykk på pungen» – read from the F.SAY log (tpl.js F.TPL.log)
const PROTO = /^(core_|kit_|learn_|ser_|bf_|tw_)/;
function logN() { return (F.TPL && F.TPL.logN) || 0; }
function phaseLine(S) {
  const ph = S._ph, log = (F.TPL && F.TPL.log) || [];
  if (!ph) return null;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]; if (e.n <= ph.logFrom) break;
    if (PROTO.test(e.id)) continue;
    const t = F.TPL.all[e.id]; if (!t || t.text.every(x => /^\{\w+\}[.!]?$/.test(x))) continue;     // «{n}» number clips
    return e;
  }
  return null;
}
// v5 (playtest2 SKRIV): «Hjelp meg» / Puff before the first attempt of a writing step: the word again (audio only), «Hva hører du
// først?» and ONE sound unit lit and played – each further press moves to the next unit. Never the whole word letter by letter.
async function firstUnitNudge(S, word, k) {
  const view = S.wordView;
  const units = F.LYD ? F.LYD.units(word) : [...word].map((c, i) => ({ i0: i, n: 1, s: [], ch: c }));
  if (!units.length) return;
  const u = units[Math.min(k || 0, units.length - 1)];
  const g = () => { if (S.solved || S.ended) throw STOP; };
  const letterEl = i => { try { return !view ? null : view.kind === 'note' ? view.n.letters[i] : view.w.slotEl(i); } catch (e) { return null; } };
  await S.replayPrompt(); g();
  await S.say(k > 0 && F.TPL.has('kit_h_neste') ? 'kit_h_neste' : 'core_h_first', {}, ''); g();
  for (let j = 0; j < u.n; j++) { const e = letterEl(u.i0 + j); if (e) e.classList.add('hl'); }
  try { if (F.LYD) await F.LYD.play(u); else if (F.LETTER_SOUND && F.LETTER_SOUND[u.ch]) await F.SAY('core_lyd', { s: F.LETTER_SOUND[u.ch] }, ''); await F.T.sleep(500); }
  finally { for (let j = 0; j < u.n; j++) { const e = letterEl(u.i0 + j); if (e) e.classList.remove('hl'); } }
}

/* ---------------------------------------------------------- word hints (letters light; letter sounds) */
async function wordHint(S, word, tag, v) {
  const view = S.wordView;
  const g = () => { if (S.solved || S.ended) { for (let i = 0; i < word.length; i++) { const e = letterEl(i); if (e) e.classList.remove('hl'); } throw STOP; } };
  const letterEl = i => !view ? null : view.kind === 'note' ? view.n.letters[i] : view.w.slotEl(i);
  const sayG = async (id, slots) => { g(); await S.say(id, slots, ''); g(); };
  const sleepG = async ms => { g(); await F.T.sleep(ms); g(); };
  const light = async (i, ms) => { const e = letterEl(i); if (e) { e.classList.add('hl'); } await sleepG(ms || 0); };
  const unlight = i => { const e = letterEl(i); if (e) e.classList.remove('hl'); };
  const sound = async ch => { g(); if (F.LYD) await F.LYD.letter(ch); else if (F.LETTER_SOUND && F.LETTER_SOUND[ch]) await F.SAY('core_lyd', { s: F.LETTER_SOUND[ch] }, ''); g(); };
  // sound units (F.LYD): kj / ll / ei … light together and make ONE sound, silent letters light without a sound, h is a breath
  const units = F.LYD ? F.LYD.units(word) : [...word].map((c, i) => ({ i0: i, n: 1, s: [], ch: c }));
  const playU = async u => { g(); if (F.LYD) await F.LYD.play(u); else await sound(u.ch); g(); };
  const isWriting = view && view.kind === 'tiles';
  const lydering = async () => {
    await sayG('core_h_lyd', {}, '');
    for (const u of units) {
      for (let j = 0; j < u.n; j++) await light(u.i0 + j);
      await playU(u); await sleepG(u.silent ? 60 : 120);
      for (let j = 0; j < u.n; j++) unlight(u.i0 + j);
    }
  };
  if (tag === 'FIRST-LETTER') {
    await sayG('core_h_first', {}, '');
    const u0 = units[0] || { i0: 0, n: 1 };
    for (let j = 0; j < u0.n; j++) await light(u0.i0 + j);
    await playU(u0); await sleepG(500);
    for (let j = 0; j < u0.n; j++) unlight(u0.i0 + j);
    return;
  }
  if (tag === 'SILENT') {
    const p = silentPos(word)[0];
    if (p != null) {
      if (isWriting) view.w.setGhost(p, word[p], true);
      await light(p); await sayG('core_h_silent', {}, ''); await sleepG(400); unlight(p);
      return;
    }
  }
  if (tag === 'DOUBLE-CONS') {
    const p = doublePos(word);
    if (p >= 0) {
      await light(p); await light(p + 1);
      await sayG('core_h_double', {}, '');          // v3: 'Kort lyd! Da skriver vi to like bokstaver.' (no letter names)
      await sleepG(400); unlight(p); unlight(p + 1);
      return;
    }
  }
  if (tag === 'VOWEL') {
    const idx = [...word].map((c, i) => VOWELS.includes(c) ? i : -1).filter(i => i >= 0);
    await sayG('core_h_vowel', {}, '');
    // vowels by unit (a diphthong ei/øy/au is one gliding sound)
    for (const u of units.filter(u => idx.includes(u.i0) && !u.fx)) { for (let j = 0; j < u.n; j++) await light(u.i0 + j); await playU(u); for (let j = 0; j < u.n; j++) unlight(u.i0 + j); }
    return;
  }
  if (tag === 'LENGTH') {
    await sayG('core_h_length', {}, '');
    for (let i = 0; i < word.length; i++) { await light(i, 260); F.sfx.pling(i); unlight(i); }
    return;
  }
  await lydering();
}

/* ---------------------------------------------------------- the stage floor: a soft glowing disc where the task happens + a sparkle
   trail from the fairy (her magic sets up the scene) */
let floorTex = null;
function stageFloor(S) {
  if (!floorTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.7, 'rgba(255,255,255,.35)'); gr.addColorStop(0.92, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); floorTex = new THREE.CanvasTexture(c);
  }
  const col = { krystall: 0xd8ccff, blomst: 0xffd6e8, boble: 0xcff4ff, stjerne: 0xfff0b0 }[skinOf()] || 0xe8dcff;
  const m = new THREE.Mesh(new THREE.CircleGeometry(3.3, 40), new THREE.MeshBasicMaterial({ map: floorTex, color: col, transparent: true, opacity: 0, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.copy(S.anchor); m.position.y += 0.04; m.renderOrder = 1; m.scale.set(1.35, 1, 1);
  m.rotation.z = -S.yaw;
  m.userData.stageFloor = true;                                    // (decoration: «Fly videre» may sit over it)
  F.Space.scene().add(m); S.objs.push(m);
  F.T.tween(500, k => { m.material.opacity = 0.85 * k; });
  try { const p = F.Player.pos.clone(); p.y += 1.2; const q = S.anchor.clone(); q.y += 0.4; F.FX.trail(p, q, { ms: 650, colors: [col, 0xffffff, 0xfff2a8] }); } catch (e) {}
}

/* ---------------------------------------------------------- props standing where the stage goes (a lamp post in the ten-tray …)
   shrink away with a sparkle for the task and pop back afterwards. Characters and the task's own NPC/thing stay. */
function clearStage(S) {
  S.cleared = [];
  const npcTh = S.npc && (S.npc.th || S.npc.thing);
  for (const th of F.Things.list) {
    if (th.space !== F.Space.cur || !th.obj || !th.obj.visible || th === S.ctx.thing || th === npcTh || th.type === 'life_actor' || th.def.stageKeep) continue;
    if (Math.abs((th.y || 0) - S.anchor.y) > 2.5) continue;          // other floors of the dollhouse
    const dx = th.x - S.anchor.x, dz = th.z - S.anchor.z;
    const u = dx * S.right.x + dz * S.right.z, w = dx * S.toCam.x + dz * S.toCam.z;
    // the low dollhouse camera sees tall things behind the stage overlap it, and things in front hide it
    const wBack = F.Space.cur === 'in' ? -2.6 : -1.1, wFront = F.Space.cur === 'in' ? 3.4 : 1.3;
    if (Math.abs(u) > 2.5 + (th.radius || 0.5) * 0.5 || w < wBack || w > wFront) continue;
    const o = th.obj, s0 = o.scale.clone();
    // labels pinned to this thing hide with it
    const labs = F.UI.labels ? [...F.UI.labels].filter(L => (L.anchor === th || L.anchor === o) && L.visible) : [];
    labs.forEach(L => L.show(false));
    S.cleared.push({ o, s0, labs });
    F.FX.burst(new V3(th.x, (th.y || 0) + 0.8, th.z), { kind: 'sparkle', n: 10 });
    F.T.tween(260, k => o.scale.copy(s0).multiplyScalar(Math.max(0.0001, 1 - k)));
  }
}
// big solid things that still overlap the chosen stage (or stand tall in front of it) fade to 30 % and drop their shadows
function fadeBlockers(S) {
  S.faded = [];
  if (!S._solids || !S._thingHit) return;
  for (const s of S._solids) if (S._thingHit(S.anchor, s)) fadeThing(S, s);
}
function fadeThing(S, s) {
  if (s.faded || !s.t.obj || !s.t.obj.parent) return;
  s.faded = true;
  const mats = [];
  s.t.obj.traverse(m => {
    if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
    const m0 = m.material, cs = m.castShadow, f = m0.clone(); f.transparent = true; f.opacity = Math.min(m0.opacity == null ? 1 : m0.opacity, 0.3); f.depthWrite = false;
    m.material = f; m.castShadow = false; mats.push({ m, m0, cs, f });
  });
  if (mats.length) (S.faded = S.faded || []).push(mats);
}
const _ov = new V3();
function fadeOccluders(S, RH) {
  const cam = F.R.camera, rect = F.R.renderer.domElement.getBoundingClientRect(), cp = cam.position;
  const dStage = Math.hypot(S.anchor.x - cp.x, S.anchor.z - cp.z);
  for (const s of S._solids) {
    if (s.faded || !s.t.obj || !s.t.obj.parent) continue;
    const cx = (s.b.min.x + s.b.max.x) / 2, cz = (s.b.min.z + s.b.max.z) / 2;
    if (Math.hypot(cx - cp.x, cz - cp.z) > dStage + 0.5) continue;          // behind the stage: it never covers it
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      _ov.set(i & 1 ? s.b.max.x : s.b.min.x, i & 2 ? s.b.max.y : s.b.min.y, i & 4 ? s.b.max.z : s.b.min.z).project(cam);
      if (_ov.z > 1) continue;
      const x = rect.left + (_ov.x + 1) / 2 * rect.width, y = rect.top + (1 - _ov.y) / 2 * rect.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const ix = Math.min(x1, RH.x1) - Math.max(x0, RH.x0), iy = Math.min(y1, RH.y1) - Math.max(y0, RH.y0);
    if (ix > 24 && iy > 24) fadeThing(S, s);
  }
}
function unfadeBlockers(S) {
  (S._solids || []).forEach(s => { s.faded = false; });
  (S.faded || []).forEach(mats => mats.forEach(({ m, m0, cs, f }) => { if (m.material === f) { m.material = m0; f.dispose(); } m.castShadow = cs; }));
  S.faded = [];
}
function restoreStage(S) {
  unfadeBlockers(S);
  (S.cleared || []).forEach(({ o, s0, labs }) => { F.T.tween(300, k => o.scale.copy(s0).multiplyScalar(Math.max(0.0001, U.smooth(k)))).then(() => (labs || []).forEach(L => L.show(true))); });
  S.cleared = [];
}

/* ---------------------------------------------------------- stage fit (WP CORE wave 2): keeps the stage readable whatever a format builds
   Every 0.15 s while a task runs:
   1. world labels (made before the task: stone numbers, plaques, house numbers) that would cover the stage are hidden until it ends;
   2. outdoors, the camera focus/zoom is nudged so the stage (3D objects + their labels) fits between the HUD / reading note on top and
      the tray / spell bar at the bottom (zooms out a little if it does not fit; total shift ≤ 4 m, zoom ≤ 22);
   3. the fairy steps out of the stage footprint (wide boards) to the free side.  spec.noFit: true opts a format out of 2–3. */
const _fb = new THREE.Box3(), _fb2 = new THREE.Box3(), _fv = new V3();
// screen rect of the stage. hud: also count camera-attached boards (FORMATS-N «brettet», S.screenObjs) and their #nlabels plaques
function stageRect(S, hud) {
  const cam = F.R.camera, rect = F.R.renderer.domElement.getBoundingClientRect();
  cam.updateMatrixWorld();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, any = false;
  const wb = new THREE.Box3();
  let objs = S.objs;
  if (hud) {
    objs = objs.concat(S.screenObjs || []);
    const nb = F.NUM && F.NUM.board && F.NUM.board(); if (nb && nb.alive && nb.root) objs.push(nb.root);
  }
  for (const o of objs) {
    if (!o.parent || !o.visible) continue;
    _fb.makeEmpty();
    o.updateMatrixWorld(true);
    o.traverseVisible(m => { if (m.isMesh && m.geometry && !m.userData.isSil && !m.userData.hull && !(m.material && m.material.transparent && m.material.opacity < 0.35)) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _fb2.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); _fb.union(_fb2); } });
    if (_fb.isEmpty()) continue;
    wb.union(_fb);
    for (let i = 0; i < 8; i++) {
      _fv.set(i & 1 ? _fb.max.x : _fb.min.x, i & 2 ? _fb.max.y : _fb.min.y, i & 4 ? _fb.max.z : _fb.min.z).project(cam);
      if (_fv.z > 1) continue;
      const x = rect.left + (_fv.x + 1) / 2 * rect.width, y = rect.top + (1 - _fv.y) / 2 * rect.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); any = true;
    }
  }
  const els = S.labels.map(L => L.el);
  if (hud) document.querySelectorAll('#nlabels > *').forEach(e => els.push(e));
  for (const el of els) { if (!el || el.style.display === 'none' || !el.isConnected) continue; const r = el.getBoundingClientRect(); if (r.width < 2) continue; x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right); y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom); any = true; }
  return any ? { x0, y0, x1, y1, world: wb } : null;
}
function stageFit(S, dt) {
  S._fitAcc = (S._fitAcc || 0) + dt; if (S._fitAcc < 0.15 || S.ended) return; S._fitAcc = 0;
  const RH = stageRect(S, true), vh = innerHeight;
  // 0. a big solid thing (learning tower, stall …) nearer to the camera than the stage whose screen box covers the stage: fade it
  if (RH && S._solids && S._solids.length) { try { fadeOccluders(S, RH); } catch (e) { /* never break the task */ } }
  // 1. world labels over the stage, the tray or the reading note
  if (F.UI.labels) {
    const zones = RH ? [[RH.x0, RH.y0, RH.x1, RH.y1]] : [];
    const trE = document.querySelector('#tray.on'); if (trE) { const r = trE.getBoundingClientRect(); if (r.height > 10) zones.push([r.left, r.top, r.right, r.bottom]); }
    for (const n of S.notes) if (n.el.isConnected) { const r = n.el.getBoundingClientRect(); if (r.height > 4) zones.push([r.left, r.top, r.right, r.bottom]); }
    for (const L of F.UI.labels) {
      if (L.seq > S.labelSeq0 || L.taskHide || L.taskKeep || !L.el || L.el.style.display === 'none') continue;
      const r = L.el.getBoundingClientRect(); if (r.width < 2) continue;
      if (zones.some(z => r.right > z[0] - 24 && r.left < z[2] + 24 && r.bottom > z[1] - 24 && r.top < z[3] + 24) || r.bottom > vh - 4) { L.taskHide = true; (S._hidLabels = S._hidLabels || new Set()).add(L); }
    }
  }
  if (S.spec && S.spec.noFit) return;
  const R = stageRect(S, false);
  // 3. the fairy steps out of a wide stage
  const P = F.Player;
  if (R && R.world && !R.world.isEmpty() && F.T.now - (S._fairyMoveT || -9) > 1.2) {
    const b = R.world, px = P.pos.x, pz = P.pos.z;
    if (px > b.min.x - 0.5 && px < b.max.x + 0.5 && pz > b.min.z - 0.5 && pz < b.max.z + 0.5) {
      const c = b.getCenter(new V3()), hw = Math.abs(S.right.x) * (b.max.x - b.min.x) / 2 + Math.abs(S.right.z) * (b.max.z - b.min.z) / 2;
      const room = F.Space.cur === 'in' && F.Castle && F.Castle.cur && F.Castle.rooms && F.Castle.rooms[F.Castle.cur] && F.Castle.rooms[F.Castle.cur].bounds;
      let to = null, first = null;
      for (const w of (room ? [0] : [0, 1.5, 3])) for (const sg of [S.sideSgn || 1, -(S.sideSgn || 1)]) {
        if (to) break;
        const t = c.clone().addScaledVector(S.right, (hw + 1.3) * sg).addScaledVector(S.toCam, w); t.y = P.pos.y;
        if (room && (t.x < room.x0 + 0.7 || t.x > room.x1 - 0.7 || t.z < room.z0 + 0.7 || t.z > room.z1 - 0.7)) continue;
        if (!first) first = t;
        let ok = true; if (!room && S._fairyOk) { try { ok = S._fairyOk(t); } catch (e) { ok = true; } }   // outdoors: not inside a tower, not hidden
        if (ok) to = t;
      }
      if (!to) to = first;
      if (to) {
        S._fairyMoveT = F.T.now; S._fairyTo = to.clone();
        const from = P.pos.clone();
        F.T.tween(500, k => { if (S.ended) return; const e = U.smooth(k); P.pos.x = from.x + (to.x - from.x) * e; P.pos.z = from.z + (to.z - from.z) * e; });
      }
    }
  }
  // 2. camera fit (indoors and outdoors): the whole stage in view at any zoom she flies with (ZOOM below)
  try { camFit(S); } catch (e) { console.warn('stage camera fit', e); }
}

/* ---------------------------------------------------------- ZOOM (night 12.10., owner «stage»). The parent: «make sure problems are clear on
   any allowed zoom of camera … stuff overlay too much when zoomed in and to a kid the zoom out may not be apparent».
   Whatever zoom she flies with (outdoors 16 / 24 / 36 m, indoors 11 / 15 / 20 m), a task frames its WHOLE stage, indoors and outdoors:
   - camStart(S) (Task.run): her camera is kept (mode, zoom step, distance); cam.focus = the stage (indoors too).
   - camFit(S) every 0.15 s (stageFit): for the camera's own pitch and yaw, camSolve finds the NEAREST distance in FIT_D[mode] at which
     every stage thing (props, hint blocks – the floor disc is decoration – and every label the task made, at its real pixel size)
     fits inside availRect: below the HUD band / the reading note, above the tray / spell bar / kit board, inside the side margins,
     clear of «Hjelp meg» and Puff. It centres the stage there (a 2×2 Newton step on the focus along screen-right and toward the
     camera). The camera glides to it: out at once when the stage needs it, in only when it got much smaller (no pumping). The fairy
     is framed too when that costs ≤ 1.5 m. It solves the camera's GOAL pose (not the eased one), so it never oscillates.
   - indoors buildings.js points the camera at her each tick; the stage's own tick (registered later) points it at cam.focus instead.
   - a format that points the camera itself (a NEW cam.focus object: F02's street, F26's signpost) owns it for that task (C.yield).
   - camEnd(S): focus off; her own zoom comes back (the step she picked during the task, if she zoomed meanwhile).
   - task labels never overlap each other (deOverlap: nudged apart with the CSS translate property, which composes with the
     transform the label code sets each frame). F.dbg.taskCam() for tests (tests/zoom_sweep.js). */
// distance range of the task camera (her own zoom steps: outdoors 16 / 24 / 36, indoors 11 / 15 / 20; the old task camera used 13 outdoors);
// FIT_FILL: the stage fills at most this share of the free rect (a little room around it – she sees where she is)
const FIT_D = { out: [12, 26], in: [10.5, 21] }, FIT_D0 = { out: 13, in: 13 }, FIT_FILL = [0.9, 0.94];
const _vc = new THREE.PerspectiveCamera(), _pv = new V3(), _cb = new THREE.Box3(), _cb2 = new THREE.Box3();
function camStart(S) {
  const cam = F.R.cam, mode = cam.mode;
  const C = S._cam = { mode, dist0: cam.distGoal, zoomI: cam.zoomI, zoomInI: cam.zoomInI, focus: null, yield: false, n: 0, sol: null, d: null };
  if (mode !== 'out' && mode !== 'in') { C.yield = true; return C; }
  C.focus = cam.focus = S.anchor.clone().addScaledVector(S.toCam, 0.9);
  cam.distGoal = C.d = FIT_D0[mode];
  // indoors: buildings.js follows HER each tick (camFollow); this tick runs after it and keeps the camera on the stage
  S.on('tick', () => { if (!S.ended && !C.yield && cam.mode === 'in' && cam.focus === C.focus && F.Space.cur === 'in') cam.target.copy(C.focus); });
  return C;
}
function camEnd(S) {
  const cam = F.R.cam, C = S._cam;
  cam.focus = null;
  if (!C || cam.mode !== C.mode) return;
  if (cam.mode === 'out') cam.distGoal = cam.zoomI !== C.zoomI && F.R.ZOOM ? F.R.ZOOM[cam.zoomI] : C.dist0;
  else if (cam.mode === 'in') cam.distGoal = cam.zoomInI !== C.zoomInI && F.R.ZOOM_IN ? F.R.ZOOM_IN[cam.zoomInI != null ? cam.zoomInI : 1] : C.dist0;
}
// the free screen rect for the stage, plus the corner buttons it must not touch
function availRect(S) {
  const vw = innerWidth, vh = innerHeight, M = 14;
  let top = 96, bot = vh - 112;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return null; const cs = getComputedStyle(e); return cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 ? null : r; };
  const tops = [...document.querySelectorAll('#hud > *, #hchain, .ser-strip, .gold-badge')];
  try { if (F.Goal && F.Goal.el) tops.push(F.Goal.el); } catch (e) { /* no goal card */ }
  const obst = [];
  for (const e of tops) {
    const r = vis(e); if (!r) continue;
    if (r.top < vh * 0.3 && r.bottom < vh * 0.42) top = Math.max(top, r.bottom + 8);
    else if (r.top > vh * 0.5) obst.push([r.left - 8, r.top - 8, r.right + 8, r.bottom + 8]);     // Puff, the wand: corner obstacles
  }
  for (const n of S.notes) { if (!n.el.isConnected) continue; const r = n.el.getBoundingClientRect(); if (r.height > 4 && r.top < vh * 0.5) top = Math.max(top, r.bottom + 10); }
  const tr = document.querySelector('#tray.on'); if (tr) { const r = tr.getBoundingClientRect(); if (r.height > 10 && r.top < vh) bot = Math.min(bot, r.top - 8); }
  document.querySelectorAll('.wand-wrap .panel, .wand-wrap.task, .panel-wrap.task .panel, .kboard.on').forEach(e => { const r = e.getBoundingClientRect(); if (r.height > 10 && r.top > vh * 0.3 && r.top < vh) bot = Math.min(bot, r.top - 8); });
  // «Hjelp meg» sits at the left above the tray (shown once the gate opens): its place is kept free from the start (no zoom jump)
  const hb = S._helpBtn; if (hb && hb.isConnected) { const r = hb.getBoundingClientRect(); if (r.width > 3 && r.top > vh * 0.3) obst.push([r.left - 8, r.top - 8, r.right + 8, r.bottom + 8]); }
  const A = { x0: M, x1: vw - M, y0: top, y1: Math.max(top + 120, bot), obst };
  const mx = (A.x1 - A.x0) * (1 - FIT_FILL[0]) / 2, my = (A.y1 - A.y0) * (1 - FIT_FILL[1]) / 2;
  A.c = { x0: A.x0 + mx, x1: A.x1 - mx, y0: A.y0 + my, y1: A.y1 - my, obst };     // the comfortable rect the distance is chosen for
  return A;
}
// world points of the stage: 8 bbox corners per prop / hint block (the floor disc and camera-attached boards excluded), and the task's
// labels as {p, w, h} (drawn above their anchor point: translate(-50%, -100%))
function stagePts(S) {
  const pts = [], labs = [];
  for (const o of S.objs.concat(S.hintObjs || [])) {
    if (!o || !o.parent || !o.visible || (o.userData && o.userData.stageFloor)) continue;
    _cb.makeEmpty(); o.updateMatrixWorld(true);
    o.traverseVisible(m => { if (m.isMesh && m.geometry && !m.userData.isSil && !m.userData.hull && !m.userData.stageFloor && !(m.material && m.material.transparent && m.material.opacity < 0.35)) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _cb2.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); _cb.union(_cb2); } });
    if (_cb.isEmpty() || _cb.max.x - _cb.min.x > 40) continue;
    for (let i = 0; i < 8; i++) pts.push(new V3(i & 1 ? _cb.max.x : _cb.min.x, i & 2 ? _cb.max.y : _cb.min.y, i & 4 ? _cb.max.z : _cb.min.z));
  }
  for (const L of taskLabels(S)) {
    const w = L.el.offsetWidth || L._w || 0, h = L.el.offsetHeight || L._h || 0; if (w < 2) continue;
    const p = L.pos().clone(); p.y += L.dy || 0; labs.push({ p, w, h });
  }
  return { pts, labs };
}
// the labels this task made (S.label and the kit's own F.UI.label calls): newer than the task's start, in this space, shown
function taskLabels(S) {
  const out = [];
  if (!F.UI.labels) return out;
  const cur = F.Space.cur;
  for (const L of F.UI.labels) {
    if (!(L.seq > (S.labelSeq0 || 0)) && !S.labels.includes(L)) continue;
    if (!L.visible || L.taskHide || !L.el || !L.el.isConnected) continue;
    const sp = L.space || (L.anchor && L.anchor.space) || 'out'; if (sp !== cur) continue;
    out.push(L);
  }
  return out;
}
function camAt(T, d, pitch, yaw) {
  const c = F.R.camera;
  if (_vc.fov !== c.fov || _vc.aspect !== c.aspect || _vc.near !== c.near) { _vc.fov = c.fov; _vc.aspect = c.aspect; _vc.near = c.near; _vc.far = c.far; _vc.updateProjectionMatrix(); }
  const cp = Math.cos(pitch);
  _vc.position.set(T.x + Math.sin(yaw) * cp * d, T.y + Math.sin(pitch) * d, T.z + Math.cos(yaw) * cp * d);   // = render.js updateCamera
  _vc.lookAt(T.x, T.y + 1, T.z); _vc.updateMatrixWorld(true);
  return _vc;
}
function rectAt(P, T, d, pitch, yaw, rc) {
  const cam = camAt(T, d, pitch, yaw);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P.pts) {
    _pv.copy(p).project(cam); if (_pv.z > 1) return null;
    const x = rc.left + (_pv.x + 1) / 2 * rc.width, y = rc.top + (1 - _pv.y) / 2 * rc.height;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  for (const L of P.labs) {
    _pv.copy(L.p).project(cam); if (_pv.z > 1) continue;
    const x = rc.left + (_pv.x + 1) / 2 * rc.width, y = rc.top + (1 - _pv.y) / 2 * rc.height;
    x0 = Math.min(x0, x - L.w / 2); x1 = Math.max(x1, x + L.w / 2); y0 = Math.min(y0, y - L.h); y1 = Math.max(y1, y);
  }
  return x0 < x1 ? [x0, y0, x1, y1] : null;
}
// the focus that centres the stage in A at distance d (Newton steps on screen-right / toward-the-camera)
function centreAt(S, P, T0, d, pitch, yaw, rc, A) {
  const T = T0.clone(), cx = r => (r[0] + r[2]) / 2, cy = r => (r[1] + r[3]) / 2, ax = (A.x0 + A.x1) / 2, ay = (A.y0 + A.y1) / 2;
  let r = rectAt(P, T, d, pitch, yaw, rc);
  for (let it = 0; it < 4 && r; it++) {
    const ex = ax - cx(r), ey = ay - cy(r);
    if (Math.abs(ex) < 3 && Math.abs(ey) < 3) break;
    const ru = rectAt(P, T.clone().addScaledVector(S.right, 1), d, pitch, yaw, rc), rw = rectAt(P, T.clone().addScaledVector(S.toCam, 1), d, pitch, yaw, rc);
    if (!ru || !rw) break;
    const a = cx(ru) - cx(r), b = cx(rw) - cx(r), c = cy(ru) - cy(r), e = cy(rw) - cy(r), det = a * e - b * c;
    if (Math.abs(det) < 1e-6) break;
    const u = U.clamp((ex * e - b * ey) / det, -6, 6), w = U.clamp((a * ey - c * ex) / det, -6, 6);
    T.addScaledVector(S.right, u).addScaledVector(S.toCam, w);
    r = rectAt(P, T, d, pitch, yaw, rc);
  }
  return { T, r };
}
const fitsIn = (r, A) => !!r && r[0] >= A.x0 && r[2] <= A.x1 && r[1] >= A.y0 && r[3] <= A.y1 && !A.obst.some(o => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
// → {focus, dist, fit, r} for the camera's goal pose, or null (nothing 3D on the stage)
function camSolve(S, P, A, keepD) {
  const cam = F.R.cam, rc = F.R.renderer.domElement.getBoundingClientRect();
  if (!P.pts.length && !P.labs.length) return null;
  const [dMin, dMax] = FIT_D[cam.mode] || FIT_D.out, pitch = cam.pitchGoal != null ? cam.pitchGoal : cam.pitch, yaw = cam.yawGoal != null ? cam.yawGoal : cam.yaw;
  const T0 = (S._cam && S._cam.sol ? S._cam.sol.focus : cam.focus || S.anchor).clone();
  T0.y = S.anchor.y;
  const at = d => { const c = centreAt(S, P, T0, d, pitch, yaw, rc, A); return { focus: c.T, dist: d, r: c.r, fit: fitsIn(c.r, A.c || A), inA: fitsIn(c.r, A) }; };
  // the distance she already has keeps while the stage still fits there and is not much farther than needed (no pumping)
  if (keepD != null && keepD >= dMin && keepD <= dMax) { const k = at(keepD); if (k.fit) { const lo = at(Math.max(dMin, keepD - 1.2)); if (!lo.fit) return k; } }
  let s = at(dMin); if (s.fit) return s;
  let hi = at(dMax); if (!hi.fit) return hi;
  let lo = dMin;
  for (let i = 0; i < 7; i++) { const m = (lo + hi.dist) / 2, q = at(m); if (q.fit) hi = q; else lo = m; }
  return hi;
}
function camFit(S) {
  const cam = F.R.cam, C = S._cam;
  if (!C || C.yield || S.ended) return;
  if (cam.focus !== C.focus || cam.mode !== C.mode) { C.yield = true; return; }     // a format (or a ride) took the camera
  // her wheel / «+» during the task changes her zoom step (given back at the end), not the task's framing
  if (C.d != null && Math.abs(cam.distGoal - C.d) > 0.01) cam.distGoal = C.d;
  const A = availRect(S), P = stagePts(S);
  if (!P.pts.length && !P.labs.length) return;
  // the fairy is framed too when that costs little (she is the one asked)
  const pl = F.Player, fp = S._fairyTo || pl.pos;
  // nothing moved since the last solve (same stage box, labels, free rect, fairy spot): the framing stands – no work
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const p of P.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const q = v => isFinite(v) ? Math.round(v * 8) : 'x';
  const sig = [x0, y0, z0, x1, y1, z1].map(q).join(',') + '|' + P.labs.map(L => q(L.p.x) + ',' + q(L.p.z) + ',' + Math.round(L.w / 8)).join(';') + '|' +
    [A.y0, A.y1, A.obst.length].map(v => Math.round(v / 6)).join(',') + '|' + Math.round(fp.x * 2) + ',' + Math.round(fp.z * 2) + '|' + innerWidth + 'x' + innerHeight;
  if (sig === C.sig) return;
  C.sig = sig;
  const Pf = { pts: P.pts.concat([new V3(fp.x, pl.pos.y + 0.2, fp.z), new V3(fp.x, pl.pos.y + 2.1, fp.z)]), labs: P.labs };
  let sol = camSolve(S, P, A, cam.distGoal);
  if (sol && sol.fit) { const s2 = camSolve(S, Pf, A, cam.distGoal); if (s2 && s2.fit && s2.dist <= sol.dist + 1.5) sol = s2; }
  if (!sol) return;
  C.n++; C.A = A;
  const dd = sol.dist - cam.distGoal, df = Math.hypot(sol.focus.x - cam.focus.x, sol.focus.z - cam.focus.z);
  if (!C.sol || Math.abs(dd) > 0.2 || df > 0.2) {
    cam.focus.copy(sol.focus); cam.distGoal = C.d = sol.dist;
    C.sol = { focus: sol.focus.clone(), dist: sol.dist, fit: sol.fit, r: sol.r && sol.r.map(Math.round) };
  }
}
// the stage's CONTENT on screen, mesh by mesh: props, hint blocks, camera boards and the things on them (a flat plate – a board's base,
// a ten-frame: > 2.4 m wide, < 0.8 m and < 30 % of that tall; its projected box is loose at the corners – may tuck under a corner
// button and is left out), plus the task's labels and board plaques
const _hb = new THREE.Box3(), _hs = new V3(), _hv = new V3();
function contentRects(S) {
  const out = [], cam = F.R.camera, rc = F.R.renderer.domElement.getBoundingClientRect();
  const roots = S.objs.concat(S.hintObjs || [], S.screenObjs || []);
  try { const nb = F.NUM && F.NUM.board && F.NUM.board(); if (nb && nb.alive && nb.root) roots.push(nb.root); } catch (e) { /* no board */ }
  for (const o of roots) {
    if (!o || !o.parent || !o.visible || (o.userData && o.userData.stageFloor)) continue;
    o.traverseVisible(m => {
      if (!m.isMesh || !m.geometry || m.userData.isSil || m.userData.hull || m.userData.stageFloor || m.userData.numHook || (m.material && m.material.transparent && m.material.opacity < 0.35)) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      _hb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); if (_hb.isEmpty()) return;
      _hb.getSize(_hs); const fw = Math.max(_hs.x, _hs.z); if (fw > 2.4 && _hs.y < 0.8 && _hs.y < 0.3 * fw) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        _hv.set(i & 1 ? _hb.max.x : _hb.min.x, i & 2 ? _hb.max.y : _hb.min.y, i & 4 ? _hb.max.z : _hb.min.z).project(cam); if (_hv.z > 1) continue;
        const x = rc.left + (_hv.x + 1) / 2 * rc.width, y = rc.top + (1 - _hv.y) / 2 * rc.height;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 > x0) out.push([x0, y0, x1, y1]);
    });
  }
  const els = taskLabels(S).map(L => L.el); document.querySelectorAll('#nlabels > *').forEach(e => els.push(e));
  for (const e of els) { if (e.style.display === 'none') continue; const r = e.getBoundingClientRect(); if (r.width > 2) out.push([r.left, r.top, r.right, r.bottom]); }
  return out;
}
/* ZOOM: «Hjelp meg» never sits on the stage. Its home is the CSS spot (left, above the tray); when that spot covers a thing of the stage
   (a camera board's things reach there – a 3D stage is framed clear of it by camFit), it moves: beside the tray (left, then right,
   clear of Puff), then up or down the left edge, else the spot that covers the least. It stays where it is while that spot stays
   clear (no jumping). */
function helpPlace(S, dt) {
  const b = S._helpBtn; if (!b || !b.isConnected || S.ended) return;
  S._hpAcc = (S._hpAcc || 0) + dt; if (S._hpAcc < 0.2) return; S._hpAcc = 0;
  const cam = F.R.cam; if (F.T.now - S.t0 < 1 || Math.abs(cam.dist - cam.distGoal) > 0.4) return;    // the camera still glides in
  try {
    const vw = innerWidth, vh = innerHeight, bw = b.offsetWidth || 190, bh = b.offsetHeight || 64, pad = 10;
    const C = contentRects(S), blk = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return null; const cs = getComputedStyle(e); return cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 ? null : r; };
    const tr = document.querySelector('#tray.on'), tin = tr && tr.querySelector('.tray-in'), trR = tin && tin.querySelector(':scope > *') ? vis(tin) : null;   // the visible card
    if (trR) blk.push([trR.left, trR.top, trR.right, trR.bottom]);
    document.querySelectorAll('#hud > *, .kboard.on, .tnote, .n2-card, .calm-glass, .ser-strip').forEach(e => { const r = vis(e); if (r) blk.push([r.left, r.top, r.right, r.bottom]); });
    const hit = (x, y, L, p) => L.some(r => x < r[2] + p && x + bw > r[0] - p && y < r[3] + p && y + bh > r[1] - p);
    const inView = (x, y) => x >= 8 && y >= 8 && x + bw <= vw - 8 && y + bh <= vh - 4;
    const free = ([x, y]) => inView(x, y) && !hit(x, y, C, pad) && !hit(x, y, blk, 6);
    const trayH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tray-h')) || 0;
    const home = [18, vh - trayH - 64 - bh];
    const cands = [home];
    if (trR) {
      const cy = (trR.top + trR.bottom) / 2 - bh / 2;
      cands.push([Math.max(56, trR.left - 16 - bw), cy], [trR.right + 16, cy]);
    }
    for (const dy of [-90, -180, 70, -270]) cands.push([18, home[1] + dy]);
    let at = S._hpAt && free(S._hpAt) ? S._hpAt : null;
    if (!at) {
      at = cands.find(free);
      if (!at) {     // nothing fully clear: the spot that covers the least of the stage
        const cov = ([x, y]) => C.reduce((a, r) => a + Math.max(0, Math.min(x + bw, r[2]) - Math.max(x, r[0])) * Math.max(0, Math.min(y + bh, r[3]) - Math.max(y, r[1])), 0) + (inView(x, y) && !hit(x, y, blk, 0) ? 0 : 1e7);
        at = cands.slice().sort((p, q) => cov(p) - cov(q))[0];
      }
    }
    const isHome = at[0] === home[0] && Math.abs(at[1] - home[1]) < 1;
    S._hpAt = isHome ? null : at;
    if (isHome) { if (b.style.top) { b.style.left = ''; b.style.top = ''; b.style.bottom = ''; } }
    else { b.style.left = at[0].toFixed(0) + 'px'; b.style.top = at[1].toFixed(0) + 'px'; b.style.bottom = 'auto'; }
  } catch (e) { /* cosmetic */ }
}
// task labels never sit on each other: overlapping pairs are pushed apart (CSS translate composes with the label code's transform)
function deOverlap(S) {
  const Ls = taskLabels(S).filter(L => L.el.style.display !== 'none' && L.el.style.visibility !== 'hidden');
  if (Ls.length < 2) { Ls.forEach(L => { if (L._nudge) { L._nudge = null; L.el.style.translate = ''; } }); return; }
  const R = Ls.map(L => { const r = L.el.getBoundingClientRect(), n = L._nudge || [0, 0]; return { L, x0: r.left - n[0], y0: r.top - n[1], x1: r.right - n[0], y1: r.bottom - n[1], dx: 0, dy: 0 }; });
  const G = 6;
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const a = R[i], b = R[j];
      const ox = Math.min(a.x1 + a.dx, b.x1 + b.dx) - Math.max(a.x0 + a.dx, b.x0 + b.dx) + G, oy = Math.min(a.y1 + a.dy, b.y1 + b.dy) - Math.max(a.y0 + a.dy, b.y0 + b.dy) + G;
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      // the smaller push wins: side by side → apart sideways; stacked → apart up / down
      if (ox <= oy) { const s = (a.x0 + a.x1) <= (b.x0 + b.x1) ? 1 : -1; a.dx -= s * ox / 2; b.dx += s * ox / 2; }
      else { const s = (a.y0 + a.y1) <= (b.y0 + b.y1) ? 1 : -1; a.dy -= s * oy / 2; b.dy += s * oy / 2; }
    }
    if (!moved) break;
  }
  for (const q of R) {
    const n = [Math.round(q.dx), Math.round(q.dy)], o = q.L._nudge || [0, 0];
    if (Math.abs(n[0] - o[0]) < 2 && Math.abs(n[1] - o[1]) < 2) continue;
    q.L._nudge = n[0] || n[1] ? n : null; q.L.el.style.translate = q.L._nudge ? n[0] + 'px ' + n[1] + 'px' : '';
  }
}

/* ---------------------------------------------------------- v4 coins by g (SYNTHESIS §5.2 I): think > help > guess */
function coinsByG(coins, out4, g) {
  if (out4 === 'R') return 0;
  if (out4 === 'H') return 0;                                       // economy §2: help pays nothing (only a right first try does)
  if (out4 === 'A' && g != null && +g > 0.2) return Math.max(1, coins - 1);
  return coins;
}
function kitCss() {
  try {
    if (document.getElementById('kitCssLink') || [...document.querySelectorAll('link[rel=stylesheet]')].some(l => /css\/kit\.css$/.test(l.getAttribute('href') || ''))) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/kit.css'; l.id = 'kitCssLink'; document.head.appendChild(l);
  } catch (e) { /* DOM-less */ }
}

/* ---------------------------------------------------------- «Oppgaverekke» dot strip (●●○): gold A, silver B, grey C, current pulses */
function seriesStrip(n) {
  if (typeof document === 'undefined') return { set() {}, remove() {} };
  if (!document.getElementById('serCss')) {
    const st = document.createElement('style'); st.id = 'serCss';
    st.textContent = '.ser-strip { position: fixed; left: 50%; top: 104px; transform: translateX(-50%); display: flex; gap: 12px; padding: 8px 14px; border-radius: 22px;' +
      ' background: rgba(255,255,255,.82); box-shadow: 0 3px 12px rgba(80,60,120,.18); z-index: 40; pointer-events: none; transition: opacity .3s; }' +
      '.ser-dot { width: 22px; height: 22px; border-radius: 50%; border: 3px solid #b9a7d8; background: #fff; box-sizing: border-box; }' +
      '.ser-dot.A { background: radial-gradient(circle at 35% 35%, #fff3b0, #f2c14e 60%, #c9962b); border-color: #c9962b; }' +
      '.ser-dot.B { background: radial-gradient(circle at 35% 35%, #ffffff, #cfd6e2 60%, #9aa5b8); border-color: #9aa5b8; }' +
      '.ser-dot.C { background: #d9d6e0; border-color: #b4afc0; }' +
      '.ser-dot.cur { animation: serPulse 1s ease-in-out infinite; border-color: #8a6fd1; }' +
      '@keyframes serPulse { 50% { transform: scale(1.25); } }';
    document.head.appendChild(st);
  }
  const el = document.createElement('div'); el.className = 'ser-strip'; el.id = 'serStrip';
  const dots = []; for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'ser-dot'; el.appendChild(d); dots.push(d); }
  document.body.appendChild(el);
  return {
    el,
    set(k, results) { dots.forEach((d, i) => { d.className = 'ser-dot' + (results[i] ? ' ' + (results[i].outcome || 'C') : '') + (i === k && !results[i] ? ' cur' : ''); }); },
    remove() { el.id = ''; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); },
  };
}

/* ---------------------------------------------------------- the runtime */
const Task = F.Task = {
  defs: prevDefs, kits: prevKits, current: null, recent: [], lastResult: null, history: [],
  tagNum, tagWord, demoItem, silentPos, doublePos, coinsByG,
  // v4 WP-K switches (tests may turn single rules off) and the per-format first-answer times (median → rapid-guess threshold)
  cfg: { gate: true, rapid: true, redeal: true, help: true, sweep: true }, rt: {},
  def(id, spec) {
    if (Task.defs[id] && Task.defs[id] !== spec) console.warn('Task.def duplicate', id);
    spec.id = id; Task.defs[id] = spec; return spec;
  },
  resolveFormat(fid) { return Task.defs[fid] ? fid : Task.defs[fid + '_demo'] ? fid + '_demo' : null; },
  async run(item, ctx) {
    ctx = ctx || {};
    if (Task.current) { console.warn('Task.run: a task is already running'); return null; }
    // v5 (#18, logic §3-D): a payment task (F.Task.pay, ctx.payment) never pays task coins in the middle of the payment
    if (Task._payNext) { Task._payNext = false; ctx.payment = true; }
    if (ctx.payment && ctx.coins == null) ctx.coins = 0;
    const fid = Task.resolveFormat(item.format);
    const spec = fid && Task.defs[fid];
    if (!spec) { console.error('Task.run: unknown format', item.format); return null; }
    item.format = fid;
    const S = makeStage(item, ctx, spec);
    const cur = Task.current = { item, S, spec, ctx, t0: F.T.now };
    // freeze the world around the task, frame the stage above the tray
    const P = F.Player, wasFrozen = P.frozen;
    P.stop(); P.frozen = true;
    // the fairy hovers beside the stage (screen-right; left when a room wall is closer) so the stage in front of the NPC is free
    const room = F.Space.cur === 'in' && F.Castle && F.Castle.cur && F.Castle.rooms && F.Castle.rooms[F.Castle.cur] && F.Castle.rooms[F.Castle.cur].bounds;
    const sgn = S.sideSgn;
    if (ctx.keepPlayer !== true) {
      const side = S.fairySpot ? S.fairySpot.clone() : S.anchor.clone().addScaledVector(S.right, 3.7 * sgn).addScaledVector(S.toCam, -0.4);
      if (room) { side.x = U.clamp(side.x, room.x0 + 0.8, room.x1 - 0.8); side.z = U.clamp(side.z, room.z0 + 0.8, room.z1 - 0.8); }
      const from = P.pos.clone(); S._fairyTo = side.clone();
      F.T.tween(450, k => { const e = U.smooth(k); P.pos.x = from.x + (side.x - from.x) * e; P.pos.z = from.z + (side.z - from.z) * e; });
    }
    { const dx = S.toCam.x * 0.7 - S.right.x * 0.7 * sgn, dz = S.toCam.z * 0.7 - S.right.z * 0.7 * sgn; P.heading = Math.atan2(dx, dz); }   // looks at the stage, half towards her
    // ZOOM: the camera frames the whole stage (indoors too) whatever zoom she had; camEnd gives her zoom back
    const cam = F.R.cam;
    camStart(S);
    F.UI.tray(true, { skin: skinOf() });
    clearStage(S);
    try { fadeBlockers(S); } catch (e) { console.warn('stage fade', e); }
    stageFloor(S);
    // natural audit D6: «Fly videre» re-offers THIS item next time (a copy before the format decorates it); learn_nytt only for the new
    try { cur.item0 = JSON.parse(JSON.stringify(item)); } catch (e) { cur.item0 = Object.assign({}, item); }
    const newHere = !everServed(item);
    try { const rec = seenRec(); if (item.format) rec.f[item.format] = 1; if (item.strand) rec.s[item.strand] = 1; } catch (e) { /* no save */ }
    F.emit('taskStart', item);
    S.labelSeq0 = F.UI.labelSeq ? F.UI.labelSeq() : 0;
    S.on('tick', dt => stageFit(S, dt));
    S.on('tick', dt => { if (!S.ended) { try { deOverlap(S); } catch (e) { /* cosmetic */ } helpPlace(S, dt); } });
    // v4 WP-K: kit.css (gate fill, «Hjelp meg», kit boards), the think-gate look and the «Hjelp meg» button
    kitCss();
    if (Task.cfg.help) helpButton(S);
    S._leaveOk = Task.leaveOk(ctx);
    if (S._leaveOk) flyButton(S);
    // v5 (playtest2 R4): any tap while the task runs (apples, +1/+10, tiles, the board) means she is busy – the idle glow waits again.
    // Puff and «Hjelp meg» themselves are excluded (tapping the glowing Puff must still find the glow on).
    try {
      const act = e => { const t = e.target; if (t && t.closest && t.closest('.hud-puff, .khelp')) return; S.activity(); };
      document.addEventListener('pointerdown', act, true); S.offs.push(() => document.removeEventListener('pointerdown', act, true));
    } catch (e) { /* DOM-less */ }
    S.on('tick', () => {
      if (S.ended) return;
      const live = S.active && !S.active.dead && !S.solved;
      const st = !live || S.solShown ? null : S.speaking ? 'wait' : !S.gateOpen() ? 'fill' : null;
      // the MFFT sweep on look-alike chips: right after the prompt, before the gate opens (it closes the gate while it runs)
      if (S._sweepWanted && S._sweepWanted === S.active && !S.speaking && !S.solved && !S.locked && S.stepTries === 0) { S._sweepWanted = null; S.sweep(); return; }
      if (st !== S._gateSt) {
        const prev = S._gateSt; S._gateSt = st; gateMark(S, st, S.gateMs());
        if (st === null && (prev === 'fill' || prev === 'wait') && S._earlyV && S.earlyOnOpen) S.earlyOnOpen();     // (review #8)
        if (st === null && (prev === 'fill' || prev === 'wait')) { S._openT = F.T.now; S._rapidHold = null; }
        // natural audit D6 (#8/#45): the glitter bar is explained ONCE ever (kit_gate_intro, saved in F.save.kit); «Først tenker vi
        // litt» (kit_tenk_forst) only on her first game day – after that the glitter bar speaks for itself
        const ks0 = F.save ? (F.save.kit = F.save.kit || {}) : {};
        const introDue = (ks0.gateIntro || 0) < 1 && F.TPL.has('kit_gate_intro');
        if (st === 'fill' && S.gateMs() >= 1000 && (Task._gateIntro || 0) < 2 && !S._gateIntroSaid && (introDue || (dayOne() && F.TPL.has('kit_tenk_forst'))) && !(F.Speech && F.Speech.busy())) {
          const ks = ks0;
          Task._gateIntro = (Task._gateIntro || 0) + 1; S._gateIntroSaid = true;
          // v5r2 (verify minor): the intro is not the prompt – a tap during it is still a fill tap (S._introBusy, submitEarly)
          const introOff = () => { S._introBusy = false; }; S._introBusy = true;
          if (introDue) { ks.gateIntro = (ks.gateIntro || 0) + 1; Promise.resolve(S.say('kit_gate_intro', {}, '')).then(introOff, introOff); }
          else Promise.resolve(S.say('kit_tenk_forst', {}, '')).then(introOff, introOff);
        }
        if (prev === 'fill' && st === null && S.gateMs() >= 1000) {
          try { F.sfx.sparkle(); } catch (e) {}
          // 3D answers «light up» too: a little sparkle on each object on offer
          try { const w = S.active; if (w && w.kind === 'objects' && w.items) w.items.forEach(it => F.FX.burst(new V3(it.pos.x, it.pos.y + 1.0, it.pos.z), { kind: 'sparkle', n: 8 })); } catch (e) {}
          F.emit('gateOpen', item);
        }
      }
      // v5r2: kept taps of an ordering board are applied in order once the step is live and the gate open (the head 0.3 s after the
      // gate opened, like a fill tap); drainQ re-checks everything when it fires
      if (live && st === null && S._tapQ.length && !S._qT && S._resolve && !S.locked && S._drainQ) S._drainQ(Math.max(0, EARLY_AUTO_MS - 1000 * (F.T.now - (S._openT || -99))));
      if (S._helpBtn) {
        S._helpBtn.classList.toggle('on', !!live && !S.speaking && S.gateOpen() && !S.solShown && !S._helping && !S._lbRunning && !S.hinting && !S._errChain && !(spec.noHelp || item.noHelp));
        S._helpBtn.classList.toggle('kpulse', !!S.puffGlow);           // 12 s idle: the honest way out is offered gently
      }
    });
    S.on('tick', dt => flyPlace(S, dt));
    let res = null;
    // Task.abort(why) (bedtime, parent page, a stuck format, tests) resolves the run early: no learning report, no coins, clean exit
    let abortRes = null;
    const abortP = new Promise(r => { S.abort = why => { if (S.ended || abortRes) return; abortRes = { outcome: null, aborted: why || true }; if (why === 'fly') abortRes.left = true; r(abortRes); }; });
    // v3 §3: a golden item is announced (and the stage floor turns gold) before the format's own prompt
    if (item.golden && F.TPL.has('learn_utfordring')) {
      try { const fl = S.objs[S.objs.length - 1]; if (fl && fl.material && fl.material.color) fl.material.color.setHex(0xffd34d); } catch (e) {}
      try { calmCss(); const g = F.UI.el('div', 'gold-badge'); g.id = 'goldBadge'; g.innerHTML = GOLDSTAR; document.body.appendChild(g); S._gold = g; } catch (e) {}
      // v5 (playtest2 V6: «Gullutfordring!» opened 48 of 195 tasks): the spoken announcement at most every 6 minutes – the gold star,
      // the gold floor and the chime always say it; a «hopp over» test-out item says what it is for (learn_hopp)
      const id = item.testOut && F.TPL.has('learn_hopp') && !(F.Speech && F.Speech.recent('learn_hopp', 360)) ? 'learn_hopp' : 'learn_utfordring';
      try { F.sfx.chime(); if (!(F.Speech && (F.Speech.recent('learn_utfordring', 360) || F.Speech.recent('learn_hopp', 360))) || id === 'learn_hopp') await Promise.race([S.say(id, {}, ''), abortP]); } catch (e) {}
    } else if (item.intro && newHere && F.TPL.has('learn_nytt') && !(F.Speech && F.Speech.recent('learn_nytt', 120))) {
      // WP-E request: the first (unscored) item of a new strand is presented as something new – no pressure.
      // natural audit D6: only when neither this format nor this strand was ever served before (it was said for F71 15 min after
      // she had done F71)
      try { await Promise.race([S.say('learn_nytt', {}, ''), abortP]); } catch (e) {}
    }
    // (a format that rejects after its task was left / aborted – e.g. a STOP thrown after the end – is not an error)
    // (spec.run is called synchronously, as before: the format builds its stage in this same tick)
    let runP = null;
    if (!abortRes) { try { runP = Promise.resolve(spec.run(item, S)); } catch (e) { runP = Promise.reject(e); } }
    if (runP) runP.catch(e => { if (!(S.ended && (e === STOP || abortRes))) console.error('task format failed', item.format, e); });
    try { res = abortRes || await Promise.race([runP, abortP]); }
    catch (e) { console.error('task format failed', item.format, e); }
    if (abortRes) res = abortRes;
    S._runDone = true;                                               // the payoff runs now: «Fly videre» goes (nothing left to leave)
    if (S._flyBtn) { S._flyBtn.classList.remove('on'); S._flyBtn.disabled = true; }
    if (!res || (!res.outcome && !res.aborted)) res = S.result(res);
    if (!res.aborted && !res.out4) { const r0 = S.result(); if (r0.outcome === res.outcome) res.out4 = r0.out4; if (res.g == null) res.g = r0.g; }
    if (res.out4 === 'H' && res.outcome === 'A') res.outcome = 'B';
    res.format = item.format;
    // learning report first (it may grant bonus coins), then the payoff
    let rep = null;
    // v4: the engine gets out4 (H / R) when it knows them (F.LEARN.OUTCOMES); an older engine gets H as B and no report for R
    const out4 = res.out4 || res.outcome;
    // a v4 engine (WP-E: report() takes R / H and pays coins by g itself) is recognised by F.LEARN.OUTCOMES or TH.rapidProdN
    const v4E = !!(F.LEARN && (F.LEARN.OUTCOMES || (F.LEARN.TH && F.LEARN.TH.rapidProdN != null)));
    if (!res.aborted) {
      const OUT = (F.LEARN && F.LEARN.OUTCOMES) || (v4E ? ['A', 'B', 'C', 'R', 'H'] : ['A', 'B', 'C']);
      let rres = res;
      if (out4 !== res.outcome) rres = OUT.includes(out4) ? Object.assign({}, res, { outcome: out4 }) : out4 === 'H' ? Object.assign({}, res, { outcome: 'B', help: true }) : null;
      if (rres) { try { rep = F.LEARN.report(item, rres); } catch (e) { console.error('LEARN.report failed', e); } }
    }
    // coins: the engine's mastery table (rep.coins, v3 §11.5) – or the caller's per-task table ctx.coins {A, B, C} (trials: 1 per A)
    let coins = res.aborted ? 0 : rep && rep.coins != null ? rep.coins : (COINS[res.outcome] || 0) + ((rep && rep.bonus) || 0);
    // v4 coins by g (SYNTHESIS §5.2 I): R 0, help 1, a chip A with g > 0.2 one less (min 1) – unless the engine did it (rep.coinsByG)
    if (!res.aborted && !(rep && (rep.coinsByG || v4E)) && !item.golden) coins = coinsByG(coins, out4, res.g != null ? res.g : S.gOf());   // golden: 6 stays
    res.coins0 = coins;
    if (!res.aborted && ctx.coins != null) {
      try { coins = typeof ctx.coins === 'function' ? +ctx.coins(res, rep, item) || 0 : typeof ctx.coins === 'number' ? ctx.coins : +(ctx.coins[res.outcome] || 0); } catch (e) { /* keep */ }
    }
    if (out4 === 'R') coins = 0;                                      // a rapid guess never pays, whatever the caller's table says
    res.coins = coins;
    S.widgets.forEach(w => w && w.lock && w.lock(true));
    if (!S.okDone && !res.error && !res.aborted) { try { await S.ok(); } catch (e) { console.error(e); } }
    if (coins > 0) {
      const at = S.objs[0] ? S.objs[0].position.clone() : S.base.clone();
      at.y += 1.2;
      const sc = screenOf(at);
      try { F.Eco.add(coins, { from: { x: sc.x, y: sc.y }, reason: 'task', format: item.format, outcome: res.outcome }); } catch (e) { console.error(e); }
      if (!F.Eco.flies) F.UI.flyCoins(coins, { x: sc.x, y: sc.y });
      F.FX.float('+' + coins, at);
      F.sfx.coins(coins);
    }
    await F.T.sleep(coins > 0 ? 700 : 300);
    S.cleanup();
    if (S._hidLabels) S._hidLabels.forEach(L => { L.taskHide = false; });
    restoreStage(S);
    F.UI.tray(false);
    camEnd(S);
    taskLabels(S).forEach(L => { if (L._nudge) { L._nudge = null; L.el.style.translate = ''; } });
    P.frozen = false; void wasFrozen;
    Task.current = null;
    Task.lastResult = Object.assign({ item: { format: item.format, key: item.key, target: item.target, word: item.word, strand: item.strand, rung: item.rung, think: item.think } }, res);
    Task.history.push([item.format, item.key, res.outcome, res.ms]); if (Task.history.length > 60) Task.history.shift();
    const npcId = ctx.npc && ctx.npc.id;
    Task.recent.push({ format: item.format, npc: npcId || null }); if (Task.recent.length > 20) Task.recent.shift();
    F.emit('taskEnd', item, res);
    if (rep && rep.events) rep.events.forEach(ev => { try { if (Array.isArray(ev)) F.emit(...ev); else if (ev && ev.type) F.emit(ev.type, ev.strand, ev.rung, ev); } catch (e) {} });
    return res;
  },
  // end the running task now (no report, no coins); resolves when the stage is cleaned up
  abort(why) {
    const c = Task.current; if (!c || !c.S.abort) return Promise.resolve(null);
    c.S.abort(why || 'abort');
    return new Promise(r => { const off = F.on('taskEnd', (it, res) => { off(); r(res); }); });
  },
  /* natural audit D6 (#41): «Fly videre» (the cloud button near the fairy) and Esc – SHE leaves the task. A quiet abort: no coins, no
     report, no line, no scolding; the question that was still talking stops. The same item waits (Task._again) and the next
     F.Task.offer that can serve its format serves it again, so leaving never fishes for an easier item. Callers see
     res.aborted === 'fly' (res.left). Returns the abort promise (null when no task runs). */
  leave() {
    const c = Task.current; if (!c || !c.S.abort || c.S.ended || c.S._runDone) return null;
    // verify r2: a solved answer is hers – a tap on «Fly videre» right after the right tap never takes the coins away or queues the
    // solved item again; and no leave where its caller would pay / buy / open the reward for it (Task.leaveOk)
    if (c.S.solved || !c.S._leaveOk) return null;
    try { F.sfx.whoosh(); } catch (e) { /* audio */ }
    try {
      if (F.Speech) { F.Speech.clearQueue(); const a = F.Speech.cur; if (a && typeof a.pause === 'function') { a.pause(); if (typeof a.onended === 'function') a.onended(); } }
    } catch (e) { /* speech */ }
    const ctx = c.ctx || {}, th = ctx.theme || (ctx.trial && ctx.trial.sp ? { sp: ctx.trial.sp } : null);
    // (a payment – the shop / stall price – is no learning item to come back elsewhere: leaving it just cancels the purchase)
    if (!ctx.payment) Task._again = { item: c.item0 || c.item, sp: th ? (th.sp || th) : null, t: F.T.now, day: (F.save && F.save.day) || 0, npc: ctx.npc && ctx.npc.id || null };
    const p = Task.abort('fly');
    F.emit('taskLeave', c.item);
    return p;
  },
  /* verify r2: may she leave this task? Only where leaving cannot pay, buy or open a reward. Some callers treat ANY result as done
     (a truthy res → their payoff), so a leave there would be a free chest or a free purchase. Until such a caller treats res.aborted as
     «nothing happened» and says so with ctx.leave = true, its task has no way out (it runs as before):
     - payments and money tasks: ctx.payment / pay / pocket, ctx.coins === 0, place 'shop' / 'stall' (shop.payTask and F.Task.pay
       return 'A' for a left result → the purchase goes through; stall.serve sells; economy pocket money / F22 «Ble det riktig?»)
     - a spot's own payoff: a thing without an asker (behaviours.learnOrPlay opens the chest, picks up the lost thing, fixes the plate,
       runs the castle spots' payoffs on any result; the house-number post says its number) – except the callers that check the outcome:
       homes and invites (ctx.home, ctx.refHouse), the throne decree (ctx.throne), the signpost (ctx.signpost), the lift (place 'lift')
       and animal trials (ctx.trial)
     ctx.leave === true / false overrides both. Askers (quests, wishes, royals, befriend, the realm builders) keep the way out. */
  leaveOk(ctx) {
    ctx = ctx || {};
    if (ctx.leave != null) return !!ctx.leave;
    const pl = ctx.place && (ctx.place.id || ctx.place);
    if (ctx.payment || ctx.pay || ctx.pocket || ctx.coins === 0 || pl === 'shop' || pl === 'stall') return false;
    if (ctx.thing && !ctx.npc && !ctx.home && !ctx.refHouse && !ctx.throne && !ctx.signpost && !ctx.trial && pl !== 'lift') return false;
    return true;
  },
  // the item she left with «Fly videre», when it can be served with these formats (and, for an animal-themed item, the same animal) –
  // taken (cleared) by the call. Befriend / quests that run Task.run directly may use it too.
  takeAgain(formats, theme) {
    const A = Task._again; if (!A || !A.item) return null;
    if ((F.save && F.save.day || 0) !== A.day) { Task._again = null; return null; }      // a new game day starts fresh
    const fid = Task.resolveFormat(A.item.format); if (!fid) { Task._again = null; return null; }
    if (Array.isArray(formats) && formats.length && !formats.some(f => Task.resolveFormat(f) === fid)) return null;
    const sp = theme ? (theme.sp || theme) : null;
    if (A.item.themed && A.sp && sp !== A.sp) return null;
    Task._again = null;
    return Object.assign({}, A.item, { again: true });
  },
  // pick an item with the learning engine for the formats available here, then run it
  async offer(o) {
    o = o || {};
    if (Task.current) return null;
    const ctx = o.ctx || {};
    const formats = (o.formats || Object.keys(Task.defs)).filter(f => Task.resolveFormat(f));
    if (!formats.length) return null;
    const npcId = ctx.npc && ctx.npc.id;
    const recentNpc = npcId ? Task.recent.filter(r => r.npc === npcId).slice(-3).map(r => r.format) : [];
    let item = null;
    // v3 §3: strands / trial / prefer go to the engine. A thing/spot offer (no NPC, no trial, no strand restriction) may fill with
    // same-family / portable formats at her exact rung (§11.2 «spots serve her level»); encounters (ctx.portable) keep their pool.
    const base = { formats, place: ctx.place && (ctx.place.id || ctx.place), npcRole: ctx.npc && ctx.npc.role, rng: F.rand, now: Date.now(), avoid: recentNpc,
      last: (Task.recent.slice(-1)[0] || {}).format, prefer: Array.isArray(o.prefer) ? o.prefer : undefined,
      levelFill: o.levelFill != null ? !!o.levelFill : ctx.levelFill != null ? !!ctx.levelFill : !!(ctx.thing && !ctx.npc && !ctx.portable && !o.trial && !o.strands) };
    // v5 WP-K3 (WP-E2 request): the engine's v5 options reach F.LEARN.next – said (C6: lines / words just spoken; never the LES/SKRIV
    // target), theme (the encounter's animal), avoidThink / avoidDomains (what the trial already had), preferStrands, avoidKeys.
    // o.x wins over ctx.x (callers that only build a ctx still work); arrays are copied, empty ones are left out.
    for (const k of OFFER_FWD) {
      const v = o[k] != null ? o[k] : ctx[k];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
      // a ctx.theme that is no animal (some other «theme» a caller keeps in its ctx) never reaches the generators
      if (k === 'theme' && o[k] == null && !(typeof v === 'object' ? !!v.sp : (() => { try { return !!(F.THEMES && F.THEMES.of && F.THEMES.of(v)); } catch (e) { return false; } })())) continue;
      base[k] = Array.isArray(v) ? v.slice() : v;
    }
    // natural audit D6: the item she left with «Fly videre» comes back first (same item – leaving never fishes for an easier one)
    item = Task.takeAgain(formats, o.theme || ctx.theme || (o.trial && o.trial.sp) || (ctx.trial && ctx.trial.sp) || null);
    if (item) return Task.run(item, ctx);
    const tries = [];
    if (o.strands || o.trial) tries.push(Object.assign({}, base, { strands: o.strands, trial: o.trial }));
    if (o.strands && o.trial) tries.push(Object.assign({}, base, { trial: o.trial }));     // restricted call returned null → unrestricted
    tries.push(base);
    for (const q of tries) {
      try { item = F.LEARN.next(q); } catch (e) { console.error('LEARN.next failed', e); item = null; }
      if (item) break;
    }
    if (!item) {
      // no engine yet: a demo item for a random available format (never the same format twice in a row)
      const last = (Task.recent.slice(-1)[0] || {}).format;
      const pool = formats.filter(f => f !== last && !recentNpc.includes(f));
      const fid = U.pick(F.rand, pool.length ? pool : formats);
      const spec = Task.defs[Task.resolveFormat(fid)];
      const strand = Object.keys(spec.strands || { 'T-MENGDE': [1, 3] })[0];
      const rr = (spec.strands || {})[strand] || [1, 1];
      item = Object.assign(demoItem(strand, rr[0], 1), { format: fid, kind: 'normal', id: 'demo_' + Date.now() });
    }
    return Task.run(item, ctx);
  },
  /* v3 §11.4 «Oppgaverekke»: n items from F.LEARN in a row with a dot strip (●●○), one bundle for the play break (emits
     activity 'series' true/false, and seriesEnd), pays at the end by result (the engine's mastery coins summed), narrator lines
     ser_en_til / ser_siste between items, ser_alle (all first-try) or ser_fikk {n} at the end. Stops cleanly when a task is aborted.
     o = {n 2–4, formats, strands, ctx, bundle, trial, prefer, quiet (no end line)} -> {results, nA, n, coins, aborted}
     v5 WP-K3: + said, theme, avoidThink, avoidDomains, preferStrands, avoidKeys (forwarded like offer; said only to the 1st item),
     the series' own keys are avoided, varyThink: true adds the thinking types it already had to avoidThink */
  async series(o) {
    o = o || {};
    if (Task.current || Task._series) return null;
    const n = Math.max(1, Math.min(6, o.n || 3)), results = [];
    const strip = seriesStrip(n);
    Task._series = { n, k: 0, results };
    try { F.emit('activity', 'series', true); } catch (e) {}
    let total = 0, aborted = false;
    const seenKeys = [], seenThink = [];
    try {
      for (let k = 0; k < n; k++) {
        Task._series.k = k; strip.set(k, results);
        if (k > 0) { try { await F.SAY(k === n - 1 ? 'ser_siste' : 'ser_en_til', {}, ''); } catch (e) {} }
        const ctx = Object.assign({}, o.ctx || {}, { series: { k, n }, coins: (r, rep) => { total += rep && rep.coins != null ? rep.coins : (COINS[r.outcome] || 0); return 0; } });
        // v5 WP-K3: the engine's v5 options (said, theme, avoidThink, avoidDomains, preferStrands, avoidKeys) go to every offer of the
        // series; the keys already played in it are avoided, and with o.varyThink the thinking types it already had (≥3 types per trial)
        const fwd = {};
        for (const kk of OFFER_FWD) if (o[kk] != null) fwd[kk] = Array.isArray(o[kk]) ? o[kk].slice() : o[kk];
        if (seenKeys.length) fwd.avoidKeys = (fwd.avoidKeys || []).concat(seenKeys);
        if (o.varyThink && seenThink.length) fwd.avoidThink = [...new Set((fwd.avoidThink || []).concat(seenThink))];
        if (k > 0) delete fwd.said;          // a line said before the series only shapes its first item
        const r = await Task.offer(Object.assign(fwd, { formats: o.formats, strands: Array.isArray(o.strands) && Array.isArray(o.strands[0]) ? o.strands[k % o.strands.length] : o.strands,
          trial: o.trial, prefer: o.prefer, levelFill: o.levelFill, ctx }));
        if (!r || r.aborted) { aborted = true; break; }
        try { const li = Task.lastResult && Task.lastResult.item; if (li) { if (li.key) seenKeys.push(li.key); if (li.think) seenThink.push(li.think); } } catch (e) {}
        results.push(r); strip.set(k + 1, results);
      }
      const nA = results.filter(r => r.outcome === 'A').length;
      // v5 (#44): «riktige» = solved without the solution being shown (A + B); one is «Du fikk én riktig!», never «1 riktige»
      const nOK = results.filter(r => r.outcome === 'A' || r.outcome === 'B').length;
      if (!aborted && results.length) {
        if (total > 0) { try { F.Eco.add(total, { from: { x: innerWidth / 2, y: innerHeight * 0.45 }, reason: 'series' }); if (!F.Eco.flies) F.UI.flyCoins(total, { x: innerWidth / 2, y: innerHeight * 0.45 }); F.sfx.coins(total); } catch (e) { console.error(e); } }
        if (!o.quiet) {
          if (nA === results.length) await F.SAY('ser_alle', {}, '');
          else if (nOK === results.length && F.TPL.has('ser_alle_til')) await F.SAY('ser_alle_til', {}, '');
          else if (nOK === 1 && F.TPL.has('ser_fikk1')) await F.SAY('ser_fikk1', {}, '');
          else if (nOK >= 2 && nOK <= 10) await F.SAY('ser_fikk', { n: nOK }, '');
          else if (nOK === 0 && F.TPL.has('ser_prov')) await F.SAY('ser_prov', {}, '');
        }
      }
      return { results, nA, n: results.length, coins: aborted ? 0 : total, aborted };
    } finally {
      strip.remove();
      Task._series = null;
      try { F.emit('activity', 'series', false); F.emit('seriesEnd', { n: results.length, nA: results.filter(r => r.outcome === 'A').length, outcomes: results.map(r => r.outcome), bundle: o.bundle || null }); } catch (e) {}
    }
  },
  // HUD: Puff was tapped. Returns true when the running task used the tap.
  puff() {
    const c = Task.current; if (!c) return false;
    const S = c.S;
    if (S.puffGlow && !S.solved) {           // glowing Puff = hint (costs the A) – v5: the CURRENT phase's help, never a v = null error hint
      S.puffGlow = false; F.emit('puffGlow', false);
      const ans = S.answerPhase(); if (ans) S.usedHint = true;   // an action phase (tap them all) costs nothing
      S.say('core_puff_hint', {}, '').then(() => (S.stepTries === 0 || !ans) ? S.preHint('puff') : S.runHint('HINT', S.lastWrong));
      return true;
    }
    // v5: in an action phase Puff repeats THAT phase's instruction (F08: «tap every apple», not the counting question)
    if (!S.answerPhase() || (S._ph && S._ph.replay)) { if (!S.speaking) S.replayPrompt(); return true; }
    if (S.reading && S.stepTries === 0 && !S.solved) {
      if (F.T.now - S.tInput >= READ_AUDIO_S && S.targetSay) { S.usedAudio = true; F.SAY(S.targetSay.id, S.targetSay.slots, S.targetSay.voice != null ? S.targetSay.voice : S.voiceFor(S.targetSay.id)); }
      else S.say('core_les', {}, S.voiceFor('core_les'));
      return true;
    }
    // v4 C2: replays are audio only (the subtitle stays masked); S.replay (format) wins over the prompt
    if (S.speaking) return true;
    if (typeof S.replay === 'function') { S.replayPrompt(); return true; }
    if (S.lastPrompt) F.SAY(S.lastPrompt.id, S.lastPrompt.slots, S.lastPrompt.voice);
    return true;
  },
};

/* ---------------------------------------------------------- v3 leftover (DESIGN4 §3.9): F.Task.pay (f_num.js) used to say «Den koster
   15» for any price outside F.SETS.PRICE. v5: f_num's pay() / F12 now speak the price only when it is in the set (the price tag shows
   it), so every natural price 1–100 runs (DESIGN4 §8 natural prices; WP-R2's F12 «rest» mode for pocket money); only prices outside
   1–100 are skipped (null → the caller's plain coin confirm). 'poor' passes through (WP-R request). The payment task never pays task
   coins (#18: ctx.payment → ctx.coins = 0, set in Task.run). */
let rawPay = prevPay || null;
function payGuard(price, o) {
  const p = Math.round(+price);
  if (!isFinite(p) || p < 1 || p > 100) { Task.paySkipped = (Task.paySkipped || 0) + 1; return Promise.resolve(null); }
  Task._payNext = true;                       // the Task.run that rawPay starts (synchronously) is a payment
  let r;
  try { r = rawPay(price, o); } finally { Task._payNext = false; }
  return r;
}
Object.defineProperty(Task, 'pay', { configurable: true, enumerable: true, get() { return rawPay ? payGuard : undefined; }, set(fn) { rawPay = fn === payGuard ? rawPay : fn; } });

/* ---------------------------------------------------------- camera focus during tasks (player.js honours cam.focus) */
F.on('spaceChanged', () => { if (F.R.cam.focus && !Task.current) F.R.cam.focus = null; });

/* ---------------------------------------------------------- debug API */
const dbg = F.dbg = F.dbg || {};
// yield to promise callbacks without timers (headless Chrome throttles setTimeout in long runs)
const yieldT = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); r(); }; ch.port2.postMessage(0); });
function nearestCtx(fid) {
  const P = F.Player.pos;
  try { const a = F.Act && F.Act.near ? F.Act.near(P.x, P.z, 14, F.Space.cur) : []; if (a && a.length) return { npc: a[0] }; } catch (e) {}
  const things = F.Things.near(P.x, P.z, 12).filter(t => !fid || (t.def.learn || []).includes(fid));
  if (things.length) return { thing: things[0] };
  return { place: { x: P.x, z: P.z - 3, id: 'here' } };
}
dbg.forceTask = function (fid, o) {
  o = o || {};
  const rid = Task.resolveFormat(fid); if (!rid) throw new Error('unknown format ' + fid);
  const spec = Task.defs[rid];
  const strand = o.strand || Object.keys(spec.strands || { 'T-MENGDE': [1, 3] })[0];
  const rung = o.rung || ((spec.strands || {})[strand] || [1])[0];
  const sup = o.sup != null ? o.sup : 1;
  const target = o.target != null ? o.target : o.word;
  let item = null;
  try {
    const g = F.BANKS.gen(strand, rung, sup, { kind: 'normal', key: target != null ? strand + ':' + target : undefined, target, rng: F.U.rng(F.flags.seed || 7), conf: {} });
    if (g && (g.target != null || g.word != null) && (target == null || same(g.target != null ? g.target : g.word, target))) item = g;
  } catch (e) { /* BANKS not ready */ }
  if (!item) item = demoItem(strand, rung, sup, target);
  item = Object.assign({ id: 'dbg_' + Math.floor(F.T.now * 1000), strand, rung, sup, kind: 'normal' }, item, { format: rid });
  if (o.params) item.params = Object.assign({}, item.params || {}, o.params);
  const ctx = o.ctx || nearestCtx(rid);
  Task._lastRun = Task.run(item, ctx).then(r => (Task._lastRunResult = r));
  F.debug.frames(3);
  return { format: rid, item: JSON.parse(JSON.stringify(item)) };
};
dbg.task = function () {
  const c = Task.current; if (!c) return null;
  const S = c.S;
  return { format: c.item.format, item: JSON.parse(JSON.stringify(c.item)), expected: S.expected, widget: S.active ? S.active.kind : null,
    tries: S.tries, solShown: S.solShown, solved: S.solved, locked: S.locked, outcome: S.result().outcome };
};
dbg.answer = async function (v) {
  const c = Task.current; if (!c) return { ok: false, reason: 'no task' };
  const S = c.S;
  // v3: a wrong answer fed while the prompt is still playing would not count (§10.2) – tests that want a counted miss wait for the
  // prompt to end (pass {early:true} via F.dbg.answerEarly to test the uncounted tap)
  // v4: answers wait for the think-gate and past the rapid-guess window (F.dbg.answerRapid feeds right at the gate, answerEarly at once)
  const early = dbg._early;
  const ready = () => {
    if (early) return true;
    if (S.speaking || !S.gateOpen()) return false;
    if (dbg._rapid || S.solShown) return true;
    return S.rapidOff || !S.rapidLive();          // natural audit D6: the rapid window runs from the end of the question, never after a ≥ 1 s gate
  };
  const wait = async () => { for (let i = 0; i < 900 && (!S.active || S.active.dead || S.locked || S.solved || !ready()) && Task.current === c; i++) { F.debug.frames(2, 1 / 30, true); await yieldT(); } };
  await wait();
  if (Task.current !== c || !S.active) return { ok: false, reason: 'task ended' };
  // a phase widget without an answer (F08 «tap them all»): a WRONG answer means a real wrong answer in the next step – do the phase,
  // then answer wrong there (dbg.answer(true) still just does the phase, as before).
  // NOTE (WP-N request): a widget counts as such a phase when its kind is 'tapall' (f_num's F08 phase widget) OR when it was S.use()d
  // without a pending answer step (v5 auto action phase, S.answerPhase() === false). The kit's S.tapAll widget is kind 'tapall-kit'
  // and WP-N's tap-all is 'subset' – both ARE answer steps (armed) and are answered normally.
  if (v === false && (S.active.kind === 'tapall' || !S.answerPhase())) {
    const ph = S.active; ph.feed();
    for (let i = 0; i < 300 && Task.current === c && (S.active === ph || !S.active); i++) { F.debug.frames(2, 1 / 30, true); await yieldT(); }
    await wait();
    if (Task.current !== c || !S.active) return { ok: false, reason: 'task ended' };
  }
  let val = v;
  if (v === true) val = typeof S.active.rightValue === 'function' ? S.active.rightValue() : S.active.kind === 'objects' ? S.active.values.findIndex(x => S.isRight(x)) : S.expected;
  else if (v === false) val = S.wrongValue();
  S.active.feed(val);
  F.debug.frames(2); await yieldT();
  return { ok: true, fed: val, right: S.solved, tries: S.tries, solShown: S.solShown };
};
dbg.answerEarly = async function (v) { dbg._early = true; try { return await dbg.answer(v); } finally { dbg._early = false; } };
dbg.answerRapid = async function (v) { dbg._rapid = true; try { return await dbg.answer(v); } finally { dbg._rapid = false; } };
// v4: what the subtitle would show for a line right now (secret mask), the gate state, the kit's switches
dbg.kit = function () {
  const c = Task.current; if (!c) return null;
  const S = c.S;
  return { gateMs: S.gateMs(), gateOpen: S.gateOpen(), speaking: S.speaking, g: S.gOf(), mode: c.item.mode, mask: S.maskList(), rapidN: S.rapidN, rTotal: S.rTotal,
    redealt: S.redealt, help: S.helpN, widget: S.active && S.active.kind, values: S.active && S.active.values ? S.active.values.slice() : null, cfg: Object.assign({}, Task.cfg),
    // v5: multi-tap answers and the hint phase contract
    cont: S.contStep, phase: S._ph ? S._ph.name : null, answerPhase: S.answerPhase(), locked: S.locked, tries: S.tries, stepTries: S.stepTries,
    fastWrong: S.fastWrong, earlyTaps: S.earlyTaps, pending: !!S._pendingTap, hintLabels: (S.hintLabels || []).length, hintObjs: S.hintObjs.length,
    calm: typeof document !== 'undefined' && !!document.getElementById('calmGlass'), usedHelp: S.usedHelp, usedHint: S.usedHint };
};
dbg.taskResult = () => Task.lastResult;
// natural audit: the screen rect of the running stage incl. camera boards + plaques (tests: nothing may sit over it)
dbg.stageRect = () => { const c = Task.current; return c ? stageRect(c.S, true) : null; };
// …and each stage thing on its own (props, boards, the number board – the floor disc excluded): «Fly videre» never sits over one
dbg.stageRects = () => { const c = Task.current; return c ? objRects(c.S).map(r => r.map(Math.round)) : null; };
// ZOOM: the task camera – her saved zoom, the solved framing (focus, distance, fits), the free rect, whether a format took it over
dbg.taskCam = () => { const c = Task.current, cam = F.R.cam; if (!c || !c.S._cam) return null; const C = c.S._cam;
  return { mode: C.mode, dist0: C.dist0, zoomI: C.zoomI, zoomInI: C.zoomInI, yield: C.yield, n: C.n, sol: C.sol && { dist: +C.sol.dist.toFixed(2), fit: C.sol.fit, r: C.sol.r },
    A: C.A && { x0: C.A.x0, y0: Math.round(C.A.y0), x1: C.A.x1, y1: Math.round(C.A.y1), obst: C.A.obst.map(o => o.map(Math.round)) }, dist: +cam.dist.toFixed(2), distGoal: +cam.distGoal.toFixed(2), focus: !!cam.focus }; };
dbg.abortTask = async function () { if (!Task.current) return null; const p = Task.abort('dbg'); for (let i = 0; i < 40 && Task.current; i++) await dbg.stepA(0.1); return p; };
// step game time in small slices and let promise chains run between them (sync stepping alone stalls async task code)
dbg.stepA = async function (sec, dt = 1 / 30) {
  const n = Math.ceil(sec / dt), hold = F.debug.hold; F.debug.hold = true;
  for (let i = 0; i < n; i += 3) { const k = Math.min(3, n - i); F.debug.frames(k, dt, true); await yieldT(); }
  F.debug.frames(1, 0.0001);   // one real render at the end
  F.debug.hold = hold;
  return F.T.now;
};
// run until the current task has ended (or max sec)
dbg.finishTask = async function (sec = 30) {
  for (let t = 0; t < sec && F.Task.current; t += 0.2) await dbg.stepA(0.2);
  return F.Task.lastResult;
};

/* ===================================================================================================================
   DEMO FORMAT F06_demo – «Telle-brettet» (portable): objects in a ten-tray (full row of ten + loose) → choose the number.
   FORMATS-N owns the real 'F06'; this one shows the pattern every format follows.                                    */
F.Task.def('F06_demo', {
  strands: { 'T-MENGDE': [1, 3] }, places: null, roles: null, family: 'telle', tpl: ['core_f06'], portable: true,
  async run(item, S) {
    const n = item.target;
    const tray = S.tenTray(n, { model: (item.params && item.params.model) || null });   // fairy skin manipulatives
    await tray.ready;                                                                     // items pop in one by one
    S.prompt('core_f06', {});
    await S.chips(item.choices, { kind: 'num' });          // protocol inside: hint, lock, solution → C
    await S.countOn(tray, n);                               // «ti … elleve, tolv, TRETTEN!»
    return S.result();
  },
});
})();
