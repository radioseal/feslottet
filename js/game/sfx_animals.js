/* Feslottet – real (synthesized) animal sounds (DESIGN5 §2.6; playtest «Bzzz»). Owner: WP-A.
   The TTS reads vowel-less words letter by letter («Bzzz» → «be-sett-sett-sett»), so animal sounds are never spoken as onomatopoeia:
   each sound id of F.FAUNA (.sound: kurr rapp knask gnag hopp flagre snadder snus plask mjau voff pip kvitt hallo mo bae mae noff klukk
   knegg bzz kryp gress kra bank hoo kvekk ia klikk kja sel delfin hval pingvin brumm trut) has a soft WebAudio voice here.
   All sounds are gentle (peak gain ≤ 0.12, soft attacks, low-passed, no harsh buzzers) and short (≤ 1.3 s).
   API: F.sfx.animal(soundId) -> true if played      F.SFXA.ids  (sound ids)      F.SFXA.play(soundId, {vol})
        F.AnimalSfx.play(speciesOrSoundId) / F.SFXA.playAnimal(…) -> true | false (species → its F.FAUNA sound; e.g. 'bie' → the buzz)
        v5c WP-A2: F.AnimalSfx.has(id), F.AnimalSfx.ids(); 'vind' / F.sfx.wind = a soft gust (fauna.js plays it on windy weather, #48)
        F.sfx.buzz / moo / baa / oink / cluck / quack / ribbit / chirp / neigh / meow (the old names, now soft – the beehive's harsh
        sawtooth buzz is replaced: a bee = band-limited noise with 180–220 Hz amplitude modulation).
   Output: F.audio.out (the sfx bus) when audio.js exports it, else a private bus to the destination that honours
   F.audioSettings.sound / F.flags.silent at play time (REQUEST WP-K2: export the sfx gain as F.audio.out). */
(function () {
'use strict';
const F = window.F;
const A = () => { try { if (F.audio && F.audio.ensure && !F.audio.ctx) F.audio.ensure(); return F.audio && F.audio.ctx; } catch (e) { return null; } };
let bus = null;
function out(ac) {
  if (F.audio && F.audio.out) return F.audio.out;
  if (!bus || bus.context !== ac) { bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(ac.destination); }
  return bus;
}
const muted = () => !!(F.flags && F.flags.silent) || !(F.audioSettings && F.audioSettings.sound !== false);
// envelope helper: a gain node with attack / hold / release (exponential ramps never hit 0)
function env(ac, t, peak, a, h, r, dest) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + h); g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r);
  g.connect(dest); return g;
}
function osc(ac, type, f, t, dur) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; }
function filt(ac, type, f, q, dest) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q == null ? 0.7 : q; b.connect(dest); return b; }
let noiseBuf = null, noiseOff = 0;
function noiseSrc(ac, t, dur) {
  if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
    const n = Math.floor(ac.sampleRate * 1.5); noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, (noiseOff = (noiseOff + 0.137) % 0.5)); s.stop(t + dur + 0.05); return s;
}
// a voiced call: oscillator (pitch path) → formant filter (path) → envelope
function call(ac, dest, t, o) {
  const dur = o.dur, e = env(ac, t, o.vol || 0.08, o.a || 0.03, Math.max(0, dur - (o.a || 0.03) - (o.r || 0.12)), o.r || 0.12, dest);
  const lp = filt(ac, o.ft || 'lowpass', o.f0 || 1200, o.q || 1.5, e);
  if (o.f1) { lp.frequency.setValueAtTime(o.f0, t); lp.frequency.linearRampToValueAtTime(o.f1, t + dur * (o.fk || 0.5)); if (o.f2) lp.frequency.linearRampToValueAtTime(o.f2, t + dur); }
  const s = osc(ac, o.type || 'sawtooth', o.p0, t, dur);
  if (o.p1) s.frequency.linearRampToValueAtTime(o.p1, t + dur * (o.pk || 1)); if (o.p2) s.frequency.linearRampToValueAtTime(o.p2, t + dur);
  if (o.vib) { const v = osc(ac, 'sine', o.vib, t, dur), vg = ac.createGain(); vg.gain.value = o.vibD || 8; v.connect(vg).connect(s.frequency); }
  if (o.trem) { const v = osc(ac, 'sine', o.trem, t, dur), vg = ac.createGain(); vg.gain.value = 0.5; const tg = ac.createGain(); tg.gain.value = 0.5; v.connect(vg).connect(tg.gain); s.connect(tg).connect(lp); }
  else s.connect(lp);
  return s;
}
// a soft noise burst (rustle, splash, sniff, click)
function burst(ac, dest, t, o) {
  const e = env(ac, t, o.vol || 0.05, o.a || 0.01, o.h || 0.02, o.r || 0.08, dest);
  const b = filt(ac, o.ft || 'bandpass', o.f || 2000, o.q || 1, e);
  noiseSrc(ac, t, (o.a || 0.01) + (o.h || 0.02) + (o.r || 0.08)).connect(b);
}
const V = {
  // bee / bumblebee: band-limited noise, amplitude-modulated at the wingbeat (≈ 200 Hz), drifting a little as it flies past
  bzz(ac, d, t) {
    const dur = 1.1, e = env(ac, t, 0.07, 0.18, 0.55, 0.35, d);
    const lp = filt(ac, 'lowpass', 1400, 0.6, e), bp = filt(ac, 'bandpass', 420, 0.9, lp);
    const am = ac.createGain(); am.gain.value = 0.5; am.connect(bp);
    noiseSrc(ac, t, dur).connect(am);
    const lfo = osc(ac, 'sine', 196, t, dur), lg = ac.createGain(); lg.gain.value = 0.5; lfo.connect(lg).connect(am.gain);
    lfo.frequency.linearRampToValueAtTime(218, t + 0.45); lfo.frequency.linearRampToValueAtTime(186, t + dur);
    const body = osc(ac, 'sine', 196, t, dur), bg = env(ac, t, 0.018, 0.2, 0.5, 0.35, d); body.connect(bg);
    body.frequency.linearRampToValueAtTime(218, t + 0.45); body.frequency.linearRampToValueAtTime(186, t + dur);
  },
  mo(ac, d, t) { call(ac, d, t, { p0: 128, p1: 112, dur: 1.0, vol: 0.09, a: 0.12, r: 0.35, f0: 320, f1: 820, f2: 420, fk: 0.4, q: 3 }); },
  bae(ac, d, t) { call(ac, d, t, { p0: 380, p1: 360, dur: 0.6, vol: 0.06, a: 0.04, r: 0.2, ft: 'bandpass', f0: 950, q: 2.2, vib: 9, vibD: 14 }); },
  mae(ac, d, t) { call(ac, d, t, { p0: 520, p1: 470, dur: 0.55, vol: 0.055, a: 0.03, r: 0.2, ft: 'bandpass', f0: 1150, q: 2.2, vib: 11, vibD: 20 }); },
  noff(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.22, { p0: 150, p1: 115, dur: 0.14, vol: 0.07, a: 0.01, r: 0.08, f0: 650, q: 2, trem: 34 }); },
  klukk(ac, d, t) { for (let i = 0; i < 3; i++) call(ac, d, t + i * 0.13, { type: 'triangle', p0: 640 - i * 30, p1: 470, dur: 0.07, vol: 0.06, a: 0.005, r: 0.05, ft: 'bandpass', f0: 1100, q: 2 }); },
  knegg(ac, d, t) { call(ac, d, t, { p0: 820, p1: 560, p2: 420, pk: 0.6, dur: 0.95, vol: 0.05, a: 0.05, r: 0.3, f0: 2200, q: 1.2, vib: 13, vibD: 45 }); },
  mjau(ac, d, t) { call(ac, d, t, { type: 'triangle', p0: 520, p1: 720, p2: 470, pk: 0.45, dur: 0.6, vol: 0.07, a: 0.05, r: 0.2, f0: 700, f1: 2400, f2: 800, fk: 0.45, q: 2 }); },
  voff(ac, d, t) { for (let i = 0; i < 2; i++) { call(ac, d, t + i * 0.24, { p0: 300, p1: 190, dur: 0.12, vol: 0.075, a: 0.008, r: 0.07, f0: 1000, q: 1.6 }); burst(ac, d, t + i * 0.24, { f: 900, q: 0.8, vol: 0.02, h: 0.02, r: 0.05 }); } },
  rapp(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.2, { type: 'square', p0: 470, p1: 410, dur: 0.12, vol: 0.035, a: 0.01, r: 0.07, ft: 'bandpass', f0: 1250, q: 3 }); },
  snadder(ac, d, t) { for (let i = 0; i < 4; i++) call(ac, d, t + i * 0.1, { type: 'square', p0: 520 + (i % 2) * 40, p1: 460, dur: 0.06, vol: 0.03, a: 0.006, r: 0.04, ft: 'bandpass', f0: 1300, q: 3 }); },
  kvekk(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.26, { type: 'square', p0: 190, p1: 170, dur: 0.16, vol: 0.04, a: 0.01, r: 0.08, ft: 'bandpass', f0: 620, q: 2.5, trem: 28 }); },
  hoo(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.45, { type: 'sine', p0: 390, p1: 350, dur: 0.32, vol: 0.08, a: 0.08, r: 0.15, f0: 900, q: 0.7 }); },
  kvitt(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.14, { type: 'sine', p0: 3000, p1: 4100, dur: 0.08, vol: 0.045, a: 0.008, r: 0.05, f0: 6000, q: 0.7 }); },
  pip(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.12, { type: 'sine', p0: 3300, p1: 3800, dur: 0.06, vol: 0.035, a: 0.006, r: 0.04, f0: 6000, q: 0.7 }); },
  kurr(ac, d, t) { call(ac, d, t, { type: 'sine', p0: 310, p1: 260, dur: 0.7, vol: 0.08, a: 0.08, r: 0.25, f0: 700, q: 0.8, trem: 16 }); },
  kra(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.3, { p0: 640, p1: 520, dur: 0.2, vol: 0.035, a: 0.02, r: 0.1, ft: 'bandpass', f0: 1300, q: 2.2 }); },
  kja(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.32, { p0: 1000, p1: 1350, p2: 900, pk: 0.4, dur: 0.24, vol: 0.03, a: 0.02, r: 0.1, ft: 'bandpass', f0: 1800, q: 2 }); },
  hallo(ac, d, t) { call(ac, d, t, { type: 'triangle', p0: 700, p1: 900, p2: 600, pk: 0.5, dur: 0.45, vol: 0.05, a: 0.03, r: 0.15, f0: 1600, f1: 2600, f2: 1200, q: 2 }); },
  ia(ac, d, t) {
    for (let i = 0; i < 2; i++) {
      call(ac, d, t + i * 0.62, { p0: 560, p1: 600, dur: 0.24, vol: 0.04, a: 0.02, r: 0.08, f0: 1800, q: 1.4 });
      call(ac, d, t + i * 0.62 + 0.26, { p0: 250, p1: 220, dur: 0.3, vol: 0.05, a: 0.03, r: 0.12, f0: 800, q: 1.4 });
    }
  },
  delfin(ac, d, t) { call(ac, d, t, { type: 'sine', p0: 2400, p1: 3600, p2: 2700, pk: 0.5, dur: 0.5, vol: 0.04, a: 0.03, r: 0.15, f0: 6000, q: 0.7 }); for (let i = 0; i < 4; i++) burst(ac, d, t + 0.55 + i * 0.05, { f: 3500, q: 3, vol: 0.02, h: 0.005, r: 0.02 }); },
  hval(ac, d, t) { call(ac, d, t, { type: 'sine', p0: 170, p1: 250, p2: 160, pk: 0.5, dur: 1.25, vol: 0.09, a: 0.25, r: 0.4, f0: 600, q: 0.7 }); },
  pingvin(ac, d, t) { for (let i = 0; i < 3; i++) call(ac, d, t + i * 0.15, { type: 'square', p0: 600 + i * 40, p1: 520, dur: 0.09, vol: 0.025, a: 0.01, r: 0.05, ft: 'bandpass', f0: 1400, q: 3 }); },
  brumm(ac, d, t) { call(ac, d, t, { p0: 120, p1: 105, dur: 0.6, vol: 0.06, a: 0.08, r: 0.2, f0: 420, q: 1.2, trem: 22 }); },
  trut(ac, d, t) { call(ac, d, t, { p0: 420, p1: 620, p2: 520, pk: 0.4, dur: 0.6, vol: 0.04, a: 0.04, r: 0.2, ft: 'bandpass', f0: 1100, q: 2.5, vib: 6, vibD: 10 }); },
  // non-voiced: little noises of what the animal does
  knask(ac, d, t) { for (let i = 0; i < 3; i++) burst(ac, d, t + i * 0.16, { f: 3200, q: 1.2, vol: 0.05, h: 0.02, r: 0.06 }); },
  gnag(ac, d, t) { for (let i = 0; i < 7; i++) burst(ac, d, t + i * 0.07, { f: 2600, q: 2, vol: 0.035, h: 0.01, r: 0.03 }); },
  hopp(ac, d, t) { for (let i = 0; i < 2; i++) call(ac, d, t + i * 0.28, { type: 'sine', p0: 150, p1: 75, dur: 0.12, vol: 0.1, a: 0.005, r: 0.08, f0: 400, q: 0.7 }); },
  flagre(ac, d, t) { const e = env(ac, t, 0.035, 0.08, 0.4, 0.2, d), b = filt(ac, 'bandpass', 2400, 0.8, e), am = ac.createGain(); am.gain.value = 0.5; am.connect(b); noiseSrc(ac, t, 0.7).connect(am); const l = osc(ac, 'sine', 14, t, 0.7), lg = ac.createGain(); lg.gain.value = 0.5; l.connect(lg).connect(am.gain); },
  snus(ac, d, t) { for (let i = 0; i < 3; i++) burst(ac, d, t + i * 0.17, { f: 1900, q: 1.5, vol: 0.04, a: 0.03, h: 0.03, r: 0.06 }); },
  plask(ac, d, t) { burst(ac, d, t, { ft: 'lowpass', f: 1500, q: 0.7, vol: 0.08, a: 0.01, h: 0.05, r: 0.35 }); call(ac, d, t + 0.02, { type: 'sine', p0: 700, p1: 1300, dur: 0.12, vol: 0.03, a: 0.01, r: 0.08, f0: 3000, q: 0.7 }); },
  sel(ac, d, t) { V.plask(ac, d, t); V.plask(ac, d, t + 0.35); },
  kryp(ac, d, t) { burst(ac, d, t, { f: 4200, q: 0.9, vol: 0.02, a: 0.1, h: 0.25, r: 0.2 }); },
  gress(ac, d, t) { for (let i = 0; i < 3; i++) burst(ac, d, t + i * 0.22, { ft: 'lowpass', f: 900, q: 0.8, vol: 0.06, a: 0.02, h: 0.05, r: 0.08 }); },
  bank(ac, d, t) { for (let i = 0; i < 8; i++) { call(ac, d, t + i * 0.055, { type: 'triangle', p0: 900, p1: 600, dur: 0.03, vol: 0.05, a: 0.002, r: 0.025, f0: 2500, q: 0.7 }); } },
  klikk(ac, d, t) { for (let i = 0; i < 3; i++) burst(ac, d, t + i * 0.09, { f: 4500, q: 3, vol: 0.05, a: 0.002, h: 0.004, r: 0.02 }); },
  // v5c WP-A2 (logic #48 «Hør på vinden»): a soft gust – low-passed noise that swells and fades, the filter opening as it passes
  vind(ac, d, t) {
    const dur = 1.3, e = env(ac, t, 0.06, 0.45, 0.3, 0.55, d);
    const lp = filt(ac, 'lowpass', 320, 0.9, e);
    lp.frequency.setValueAtTime(320, t); lp.frequency.linearRampToValueAtTime(950, t + 0.6); lp.frequency.linearRampToValueAtTime(380, t + dur);
    const hp = filt(ac, 'highpass', 90, 0.7, lp);
    noiseSrc(ac, t, dur).connect(hp);
  },
};
// loudness match (offline-measured peaks → ≈ 0.08 peak each, still soft beside speech clips at ≈ −20 dB RMS)
const NORM = { bzz: 2.1, mo: 0.8, bae: 2.6, mae: 2.6, klukk: 4, knegg: 1.5, mjau: 1.1, rapp: 4.4, snadder: 6, kvekk: 3.5, kvitt: 1.5, pip: 2,
  kra: 4.2, kja: 5.3, hallo: 1.6, ia: 1.5, delfin: 1.1, hval: 0.8, pingvin: 6, brumm: 1.3, trut: 4, knask: 1.6, gnag: 1.2, hopp: 0.8, flagre: 2.5,
  snus: 2.2, plask: 1.2, sel: 1.1, kryp: 4, gress: 2.7, bank: 1.6, klikk: 2, vind: 2.4 };
function voiceOut(ac, dest, id, vol) {
  const k = (NORM[id] || 1) * (vol || 1); if (k === 1) return dest;
  const g = ac.createGain(); g.gain.value = k; g.connect(dest); return g;
}
const SFXA = F.SFXA = {
  ids: Object.keys(V),
  // tests: render one voice into any (Offline)AudioContext destination – F.SFXA.render(id, ctx, dest, t)
  render(id, ac, dest, t) { const fn = V[id]; if (!fn) return false; fn(ac, voiceOut(ac, dest, id), t || 0); return true; },
  play(id, o) {
    const fn = V[id]; if (!fn) return false;
    if (muted()) return true;
    const ac = A(); if (!ac) return false;
    try {
      const t = ac.currentTime + 0.01, vol = (o && o.vol) || 1;
      fn(ac, voiceOut(ac, out(ac), id, vol), t);
      return true;
    } catch (e) { console.warn('SFXA', id, e); return false; }
  },
};
// F.sfx.animal(sound) + soft versions of the old names (overwrite behaviours.js' sawtooth buzzer; any load order)
function install() {
  if (!F.sfx) return;
  F.sfx.animal = (id, o) => SFXA.play(id, o);
  const map = { buzz: 'bzz', moo: 'mo', baa: 'bae', oink: 'noff', cluck: 'klukk', quack: 'rapp', ribbit: 'kvekk', chirp: 'kvitt', neigh: 'knegg', meow: 'mjau', honk: 'snadder',
    bie: 'bzz', bee: 'bzz', wind: 'vind', vind: 'vind' };
  for (const k in map) F.sfx[k] = () => { SFXA.play(map[k]); };
}
// species id or sound id → its voice (WP-W's things feature-detect F.AnimalSfx.play('bie')); false when there is none
SFXA.playAnimal = function (id, o) {
  if (V[id]) return SFXA.play(id, o);
  const s = F.FAUNA && F.FAUNA.byId ? F.FAUNA.byId(id) : null;
  return s && s.sound && V[s.sound] ? SFXA.play(s.sound, o) : false;
};
F.AnimalSfx = F.AnimalSfx || { play: (id, o) => SFXA.playAnimal(id, o) };
// v5c WP-A2: for other modules (the beehive, hooks): does a species / sound id have a voice? and the list of sound ids
F.AnimalSfx.has = id => !!(V[id] || (F.FAUNA && F.FAUNA.byId && F.FAUNA.byId(id) && V[F.FAUNA.byId(id).sound]));
F.AnimalSfx.ids = () => Object.keys(V);
install();
F.on && F.on('boot', install);
F.on && F.on('ready', install);
})();
