/* Feslottet – the purse picture (economy plan §5, owner «hud»). One place-value builder for every purse view.
   F.Purse = {
     MAX: 9999                      the picture is right for 0–9,999 (the number chip is always right)
     parts(n) -> {th, h, t, o}      thousands, hundreds, tens, ones (each 0–9; n clamped to 0–9,999)
     noteEl(v)                      a paper note: 100 = sky-blue (the task prop fx_n2_lapp100's colours), 1000 = lilac, a little larger
     coinEl(v)                      a gold «10» coin (.coin10, the HUD's) or a gold one-coin
     fanLayout(th, h, u) -> {width, pos(i) -> {x, y, rot}}   the notes fan: thousands first, then hundreds; 22·u apart for a few, ≥ 8·u for 9
     el(n, o) -> element            a static purse (notes fan, tens, ten-frame, chip) for the shop, the bedtime card, the goal card
     swish()                        the soft paper sound of a merge / break (never words)
   }
   The HUD's own live purse (js/game/hud.js) uses parts / noteEl / fanLayout and animates the silent merges (10 tens → a 100-note,
   10 notes → a 1000-note) and breaks (a note → ten tens when she pays). F.save.coins stays one integer: nothing to migrate.
   Works in any load order (pure helpers; css in css/hud.css). */
(function () {
'use strict';
const F = window.F = window.F || {};
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const P = F.Purse = { MAX: 9999 };

P.parts = function (n) {
  n = Math.max(0, Math.min(P.MAX, Math.floor(+n || 0)));
  return { th: Math.floor(n / 1000), h: Math.floor((n % 1000) / 100), t: Math.floor((n % 100) / 10), o: n % 10 };
};
P.noteEl = function (v) {
  const e = mk('div', 'pnote ' + (v >= 1000 ? 'n1000' : 'n100'));
  e.appendChild(mk('span', '', v >= 1000 ? '1000' : '100'));
  return e;
};
P.coinEl = function (v) { return v >= 10 ? mk('div', 'coin10', '10') : mk('div', 'pone'); };
// the notes fan: a note is 44×24 u (a 1000-note 50×28 u); each next note 8 u to the right (9 notes ≈ 108 u), a slight fan rotation
P.NOTE_DX = 8;
P.fanLayout = function (th, h, u) {
  u = u || 1;
  // a few notes spread wider so each can be counted (≥ 8 u of every note shows; a full fan of 9 stays ≈ 108 u)
  const step = n => (n > 1 ? Math.max(P.NOTE_DX, Math.min(22, 64 / (n - 1))) * u : 0);
  const dxTh = step(th), dxH = step(h), w1000 = 50 * u, w100 = 44 * u, gap = 6 * u;
  const wTh = th ? w1000 + (th - 1) * dxTh : 0, wH = h ? w100 + (h - 1) * dxH : 0;
  const x0H = th ? wTh + gap : 0;
  const rot = (i, n) => (n > 1 ? (i / (n - 1) - 0.5) * 10 : 0);
  return {
    width: wTh + (th && h ? gap : 0) + wH, height: 50 * u,
    pos(i) {                                   // i < th: a thousand-note; otherwise the (i - th)th hundred-note
      if (i < th) return { x: i * dxTh, y: (50 - 28) / 2 * u + (i % 2 ? 1.5 : -1.5) * u, rot: rot(i, th), v: 1000 };
      const k = i - th;
      return { x: x0H + k * dxH, y: (50 - 24) / 2 * u + (k % 2 ? 1.5 : -1.5) * u, rot: rot(k, h), v: 100 };
    },
  };
};
// a static purse picture (for panels and cards): notes fan, tens (≤ 9, rows of 5), the 2×5 ten-frame, the numeral
P.el = function (n, o) {
  o = o || {};
  n = Math.max(0, Math.floor(+n || 0));
  const p = P.parts(n), w = mk('div', 'ppurse' + (o.cls ? ' ' + o.cls : ''));
  if (p.th || p.h) {
    const fan = mk('div', 'pp-notes');
    const L = P.fanLayout(p.th, p.h, 1);
    for (let i = 0; i < p.th + p.h; i++) {
      const q = L.pos(i), e = P.noteEl(q.v);
      e.style.left = q.x + 'px'; e.style.top = q.y + 'px'; e.style.transform = 'rotate(' + q.rot.toFixed(1) + 'deg)'; e.style.zIndex = String(i + 1);
      fan.appendChild(e);
    }
    fan.style.width = L.width + 'px';
    w.appendChild(fan);
  }
  if (p.t) { const tens = mk('div', 'pp-tens'); for (let i = 0; i < p.t; i++) tens.appendChild(P.coinEl(10)); w.appendChild(tens); }
  if (o.frame !== false) {
    const fr = mk('div', 'pp-frame');
    for (let i = 0; i < 10; i++) { const c = mk('div', 'pp-cell'); if (i < p.o) c.classList.add('on'); fr.appendChild(c); }
    w.appendChild(fr);
  }
  if (o.chip !== false) w.appendChild(mk('div', 'pp-num', String(n)));
  return w;
};
// the soft paper swish of a merge or a break (no words, ever)
P.swish = function () {
  try { if (F.sfx && F.sfx.noise) { F.sfx.noise(0.26, 0.06, 3400, 0.7, 0, 'bandpass'); F.sfx.noise(0.18, 0.035, 5200, 0.9, 0.1, 'bandpass'); } } catch (e) { /* audio is optional */ }
};
})();
