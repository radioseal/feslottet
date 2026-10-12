/* Feslottet – audio: pre-recorded speech queue (mp3 ONLY, never Web Speech), synth SFX, gentle music */
(function () {
'use strict';
const F = window.F;

/* ---------------------------------------------------------- WebAudio */
let AC = null, master = null, sfxGain = null, musicGain = null;
F.audioSettings = { sound: true, music: true };
function ensure() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination);
      sfxGain = AC.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
      musicGain = AC.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      startMusic();
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  apply();
}
function apply() {
  if (!AC) return;
  master.gain.value = F.audioSettings.sound && !F.flags.silent ? 1 : 0;
  musicGain.gain.setTargetAtTime(F.audioSettings.music ? 0.045 : 0, AC.currentTime, 0.6);
}
// v5 (WP-A / playtest2 sounds request): the sound-effects bus, so module SFX (sfx_animals.js) respect the sound-off setting –
// F.audio.out / F.sfx.out (null until the first user gesture created the AudioContext)
F.audio = { ensure, apply, get ctx() { return AC; }, get out() { return sfxGain; } };
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, ensure, { capture: true }));

function tone(f, dur, type = 'sine', vol = 0.15, when = 0, f2 = null, dest = null) {
  if (!AC) return;
  const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, freq, q = 1, when = 0, type = 'bandpass') {
  if (!AC) return;
  const t = AC.currentTime + when, n = Math.max(1, Math.floor(AC.sampleRate * dur)), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = b; fl.type = type; fl.frequency.value = freq; fl.Q.value = q; g.gain.value = vol;
  s.connect(fl).connect(g).connect(sfxGain); s.start(t);
}
const R = () => Math.random();
// Named sound effects. Modules may add more: F.sfx.myname = () => {...} using F.sfx.tone / F.sfx.noise
F.sfx = {
  tone, noise,
  get out() { return sfxGain; },
  ok() { [523, 659, 784].forEach((f, i) => tone(f, .18, 'triangle', .16, i * .08)); tone(1046, .45, 'triangle', .13, .24); },
  // v3 §13.6 «no sad sounds»: a wrong answer is a soft, neutral double knock (was a falling 300→200 Hz tone).
  // v5 WP-K2 (DESIGN5 §6): softer still and never buzzer-like – two pure sine «tok» knocks on the SAME pitch (no falling «sad» step),
  // a gentle wooden attack (a tiny low-passed tick) and a quick decay; about as loud as a chip click, quieter than the right-answer chime
  bad() { tone(540, .09, 'sine', .07); noise(.025, .025, 1400, .8, 0, 'lowpass'); tone(540, .1, 'sine', .055, .13); noise(.025, .02, 1400, .8, .13, 'lowpass'); },
  click() { tone(900, .05, 'triangle', .07); },
  pling(i = 0) { tone(880 * Math.pow(1.122, i), .25, 'triangle', .12); },
  sparkle() { for (let i = 0; i < 6; i++) tone(1400 + R() * 1400, .18, 'sine', .05, i * .045); },
  coin() { tone(1318, .08, 'square', .05); tone(1760, .25, 'square', .05, .07); },
  coins(n = 5) { for (let i = 0; i < Math.min(n, 12); i++) { tone(1318 + R() * 200, .07, 'square', .035, i * .06); tone(1760 + R() * 200, .15, 'square', .03, i * .06 + .05); } },
  pop() { noise(.07, .3, 2200, 1); tone(650, .07, 'square', .04); },
  boing() { tone(190, .35, 'sine', .17, 0, 620); },
  whoosh() { noise(.45, .18, 900, .5, 0, 'bandpass'); },
  splash() { noise(.5, .22, 700, .6); },
  step() { noise(.05, .035, 1000 + R() * 300, .7); },
  door() { tone(140, .25, 'triangle', .1, 0, 110); noise(.2, .08, 300, .8, .05); },
  bell(f = 880) { tone(f, 1.6, 'sine', .12); tone(f * 2.76, .9, 'sine', .04); tone(f * 5.4, .4, 'sine', .02); },
  chime() { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .7, 'sine', .08, i * .07)); },
  magic() { for (let i = 0; i < 10; i++) tone(600 + i * 120 + R() * 60, .3, 'sine', .05, i * .035); noise(.6, .05, 5000, .7); },
  levelup() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, .55, 'triangle', .12, i * .085)); },
  thud() { tone(90, .2, 'sine', .2, 0, 50); noise(.12, .1, 200, .7); },
  squeak() { tone(1800, .12, 'sine', .07, 0, 2600); },
  pluck(f = 440) { tone(f, .5, 'triangle', .12); tone(f * 2, .25, 'sine', .04); },
  piano(f = 440) { tone(f, 1.1, 'triangle', .13); tone(f * 2, .5, 'sine', .04); tone(f * 3, .25, 'sine', .02); },
  firework() { noise(.6, .18, 300, .4); tone(1200 + R() * 800, .5, 'sine', .04, .05, 400); },
  grow() { tone(300, .5, 'sine', .1, 0, 900); tone(450, .5, 'triangle', .05, .05, 1200); },
  crystal() { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, .9, 'sine', .05, i * .06)); },
};
F.note = semis => 261.63 * Math.pow(2, semis / 12);   // semitones from C4

/* ---------------------------------------------------------- gentle procedural music (pentatonic over I–vi–IV–V) */
function startMusic() {
  const chords = [[261.6, 329.6, 392, 523.3], [220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392]];
  let beat = 0, next = AC.currentTime + 0.5;
  setInterval(() => {
    if (!AC || !F.audioSettings.music) return;
    while (next < AC.currentTime + 0.6) {
      const ch = chords[Math.floor(beat / 8) % 4], w = next - AC.currentTime;
      if (beat % 8 === 0) { tone(ch[0] / 2, 3.6, 'sine', 0.33, w, null, musicGain); tone(ch[2] / 2, 3.6, 'sine', 0.16, w, null, musicGain); }
      if (Math.random() < 0.5) { const f = ch[Math.floor(Math.random() * 4)] * (Math.random() < 0.3 ? 2 : 1); tone(f, 1.4, 'triangle', 0.2, w, null, musicGain); }
      beat++; next += 0.42;
    }
  }, 200);
}

/* ---------------------------------------------------------- speech: pre-recorded mp3 only
   F.say(text, voice) -> Promise (resolves when finished). Splits into sentences.
   Lookup: SPEECH[voice + '|' + sentence] || SPEECH[sentence]. Missing -> subtitle only (never Web Speech).
   F.sayFree(text, voice): only speaks when nothing else is queued (for object reactions; never cuts speech).
   v3 (DESIGN3 §3, §10.5): F.Speech.recent(textOrId, sec = 30) -> bool: was this text (whole line or one sentence) or this template id
   (any variant, via F.SAY) spoken in the last sec seconds of game time? Every line is stamped when it is queued. */
const segs = t => String(t).split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean);
/* v4 WP-K (DESIGN4 §3.1, hint_leaks C1): the secret mask. While a task step runs and its solution is not shown, every secret token
   (the number to find / write, the dictated word – S.secret, item.secret, auto for T-NAVN/T-SKRIV/SKRIV) is shown as «…» in the
   subtitle and in the speech bubbles (both listen to 'subtitle'); a line that is only the secret shows 🔊. The audio is unchanged
   (the clip lookup uses the original text). Whole tokens only (Unicode letters/digits as boundaries), case-insensitive. */
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function maskWith(text, list) {
  let out = String(text);
  const L = [...new Set((list || []).map(x => String(x).trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const sec of L) out = out.replace(new RegExp('(^|[^\\p{L}\\p{N}])' + escRe(sec) + '(?=$|[^\\p{L}\\p{N}])', 'giu'), '$1…');
  if (out !== String(text) && !/[\p{L}\p{N}]/u.test(out.replace(/…/g, ''))) return '🔊';
  return out;
}
F.missingSpeech = new Set();
/* v5 WP-K3: the recorded letter sounds (tools/static_audio.json → audio/ls/*.mp3, installed by the lead 11.10. 01:44) are found even when
   the clip map audio/speech.js predates them (the unit clips /h/ /sj/ /kj/ /ng/ /ei/ /oey/ /au/ were added after the 00:59 build).
   The clip map wins when it has the key. */
const LS_STATIC = {};
['a', 'e', 'i', 'o', 'u', 'y', 'ae', 'oe', 'aa', 'ei', 'oey', 'au', 'f', 'h', 'j', 'l', 'm', 'n', 'r', 's', 'v', 'sj', 'kj', 'ng', 'b', 'd', 'g', 'k', 'p', 't']
  .forEach(k => { LS_STATIC['/' + k + '/'] = 'audio/ls/' + k + '.mp3'; });
const SPOKEN = new Map();          // text / sentence / template id → game time it was last spoken
const nowT = () => (F.T && F.T.now != null ? F.T.now : performance.now() / 1000);
const Speech = F.Speech = {
  q: [], cur: null, waiters: [],
  // F.SAY marks the template id right before speaking (tpl.js); the text is stamped in say()
  stamp(key) { if (key == null) return; SPOKEN.set(String(key), nowT()); if (SPOKEN.size > 600) { const k = SPOKEN.keys().next().value; SPOKEN.delete(k); } },
  recent(key, sec) {
    if (key == null) return false;
    const t = SPOKEN.get(String(key)); if (t == null) return false;
    return nowT() - t <= (sec != null ? sec : 30);
  },
  say(text, voice = '') {
    if (!text) return Promise.resolve();
    const parts = segs(text);
    this.stamp(text); parts.forEach(p => this.stamp(p));
    if (F.flags.test && !F.flags.collect) {
      if (!F._enumSet) { F._enumSet = new Set(F.collectSpeech(1).map(([v, t]) => v + '|' + t)); }
      parts.forEach(s => { if (!F._enumSet.has(voice + '|' + s)) console.error('UNENUMERATED SPEECH: [' + voice + '] ' + s); });
    }
    return new Promise(res => {
      parts.forEach((s, i) => this.q.push({ s, voice, gap: i > 0, done: i === parts.length - 1 ? res : null }));   // gap: short calm pause between sentences
      if (!this.cur) this.next();
    });
  },
  file(s, voice) { const M = window.SPEECH || {}; return (voice && M[voice + '|' + s]) || M[s] || LS_STATIC[s] || null; },
  // v5 WP-K3: the last 80 queued sentences with the clip file each one used (null = none) – tests read it (sounding-out checks)
  trace: [],
  maskWith,
  extraMask: null,                 // extra tokens to mask (tests / scripted scenes); the running task's S.maskList() is always applied
  maskText(text) {
    if (!text) return text;
    let list = [];
    try { const c = F.Task && F.Task.current; if (c && c.S && typeof c.S.maskList === 'function') list = c.S.maskList(); } catch (e) { list = []; }
    if (this.extraMask && this.extraMask.length) list = list.concat(this.extraMask);
    return list.length ? maskWith(text, list) : text;
  },
  /* recorded letter-sound keys ('/m/', '/ae/', '/oey/') show as the plain letter(s) – v5r (review: letter-sound subtitles): but 🔊
     while a task step runs unsolved (no solution shown): a hint's sound of the hole / the wrong letter / the first sound IS the answer
     letter, and she must go from the sound to the letter herself. Outside tasks and after the solve the letter shows. null = not a key */
  lsText(s) {
    const ls = /^\/([a-zæøå]+)\/$/.exec(s); if (!ls) return null;
    let live = false;
    try { const c = F.Task && F.Task.current, S = c && c.S; live = !!(S && !S.ended && !S.solved && !S.solShown); } catch (e) { live = false; }
    if (live) return '🔊';
    const LS = { ae: 'æ', oe: 'ø', aa: 'å', oey: 'øy' };
    return LS[ls[1]] || ls[1];
  },
  has(text, voice = '') { return segs(text).every(s => !!this.file(s, voice)); },
  next() {
    const it = this.q.shift();
    if (!it) { this.cur = null; F.emit('subtitle', '', ''); const w = this.waiters; this.waiters = []; w.forEach(f => f()); return; }
    if (it.gap && !it.waited && !F.flags.silent) { it.waited = true; this.q.unshift(it); const gt = this.cur = { fake: true }; F.T.timeout(() => { if (this.cur === gt) this.next(); }, 280); return; }
    // recorded letter-sound keys: the plain letter(s), 🔊 while a task step is unsolved (lsText)
    const ls = this.lsText(it.s);
    F.emit('subtitle', ls != null ? ls : this.maskText(it.s), it.voice);
    const file = this.file(it.s, it.voice);
    this.trace.push({ s: it.s, voice: it.voice, file, t: nowT() }); if (this.trace.length > 80) this.trace.shift();
    const finish = () => { if (this.cur !== tok) return; if (it.done) it.done(); this.next(); };
    let tok;
    if (!file) { F.missingSpeech.add((it.voice ? it.voice + '|' : '') + it.s); if (!F.flags.collect) console.warn('Mangler lydfil:', it.voice, it.s); }
    if (!file || !F.audioSettings.sound || F.flags.silent) {
      tok = this.cur = { fake: true };
      F.T.timeout(finish, F.flags.silent ? 120 : 600 + it.s.length * 55);
      return;
    }
    const a = new Audio(file); tok = this.cur = a;
    a.onended = finish; a.onerror = finish;
    a.play().catch(finish);
  },
  clearQueue() { this.q.forEach(it => it.done && it.done()); this.q = []; },
  busy() { return !!this.cur || this.q.length > 0; },
  idle() { return this.busy() ? new Promise(r => this.waiters.push(r)) : Promise.resolve(); },
  pause(p) { if (this.cur && this.cur.pause) p ? this.cur.pause() : this.cur.play().catch(() => {}); },
};
F.say = (text, voice) => Speech.say(text, voice);
F.sayFree = (text, voice) => Speech.busy() ? Promise.resolve(false) : Speech.say(text, voice).then(() => true);
})();
