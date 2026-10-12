/* Feslottet – core: namespace, utils, seeded RNG, noise, event bus, game-clock timers */
(function () {
'use strict';
const F = window.F = window.F || {};
F.VERSION = 1;
F.booted = false;
const H = location.hash || '';
F.flags = {
  silent: /silent/.test(H) || !!navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent),
  collect: /collect/.test(H),
  debug: /debug/.test(H),
  fresh: /fresh/.test(H),
  seed: (H.match(/seed=(\d+)/) || [])[1] ? +(H.match(/seed=(\d+)/)[1]) : null,
  test: /(^|[#&])test/.test(H),
  noshadow: /noshadow/.test(H),
  skip: /(^|[#&])skip/.test(H),
  fairy: (H.match(/fairy=([a-z]+)/) || [])[1] || null,
};
if (F.flags.test) F.flags.debug = true;
if (/sound/.test(H)) F.flags.silent = false;

/* ---------------------------------------------------------- utils */
const U = F.U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: t => t * t * (3 - 2 * t),
  dist2: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  hash2(x, z, seed) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
  // mulberry32 – deterministic RNG; returns function () -> [0,1)
  rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
  pick: (r, arr) => arr[Math.floor(r() * arr.length)],
  int: (r, a, b) => a + Math.floor(r() * (b - a + 1)),
  shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  sample(r, arr, n) { return U.shuffle(r, arr).slice(0, n); },
  // smooth value noise in [0,1]
  noise2(x, z, seed = 0) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = U.hash2(xi, zi, seed), b = U.hash2(xi + 1, zi, seed), c = U.hash2(xi, zi + 1, seed), d = U.hash2(xi + 1, zi + 1, seed);
    const u = U.smooth(xf), v = U.smooth(zf);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  },
  fbm(x, z, seed = 0, oct = 3) { let s = 0, amp = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += amp * U.noise2(x * f, z * f, seed + i * 101); n += amp; amp *= 0.5; f *= 2; } return s / n; },
  cap: s => s ? s[0].toUpperCase() + s.slice(1) : s,
};
// global non-deterministic-ish rng for gameplay (seedable for tests)
F.rand = U.rng(F.flags.seed != null ? F.flags.seed : (Date.now() & 0xffffffff));

/* ---------------------------------------------------------- event bus */
const subs = {};
F.on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); return () => F.off(ev, fn); };
F.off = (ev, fn) => { const a = subs[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } };
F.emit = (ev, ...args) => { (subs[ev] || []).slice().forEach(fn => { try { fn(...args); } catch (e) { console.error('[F.emit ' + ev + ']', e); } }); };

/* ---------------------------------------------------------- game clock (pausable, steppable in tests) */
const VT = [], TW = [];
F.T = {
  now: 0,          // game seconds since boot (pauses with the game)
  timeout(fn, ms) { const t = { at: F.T.now + ms / 1000, fn }; VT.push(t); return t; },
  clear(t) { const i = VT.indexOf(t); if (i >= 0) VT.splice(i, 1); },
  sleep: ms => new Promise(r => F.T.timeout(r, ms)),
  // tween(ms, k => ...) resolves when done; k in [0,1]
  tween(ms, fn) { return new Promise(res => TW.push({ t: 0, d: Math.max(0.001, ms / 1000), fn, res })); },
  step(dt) {
    F.T.now += dt;
    for (let i = VT.length - 1; i >= 0; i--) if (VT[i].at <= F.T.now) { const t = VT.splice(i, 1)[0]; try { t.fn(); } catch (e) { console.error(e); } }
    for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; w.t += dt; const k = Math.min(1, w.t / w.d); try { w.fn(k); } catch (e) { console.error(e); } if (k >= 1) { TW.splice(i, 1); w.res(); } }
  },
};

/* ---------------------------------------------------------- speech enumeration registry
   Every module that can speak registers an enumerator: F.speechEnum.push((S, N) => { S(voice, text) ... })
   tools/collect_speech.js calls F.collectSpeech(N) in headless Chrome. */
F.speechEnum = [];
F.collectSpeech = function (N) {
  const out = [];
  const segs = t => String(t).split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean);
  const S = (voice, text) => { if (text == null || text === '') return; segs(text).forEach(s => out.push([voice || '', s])); };
  for (const fn of F.speechEnum) { try { fn(S, N || 400); } catch (e) { console.error('[collectSpeech]', e); } }
  return out;
};
})();
