/* Feslottet – WP1 BLD: the indoor map (DESIGN2 §2.2, §2.10). A parchment plan of the building she is in: floor tabs 1/2/3, one big tile
   per room (number + name), stairs / lift / exit icons, a fairy marker where she is. Tapping a room closes the map and draws a glitter
   trail there (to the stairs or the lift first when it is on another floor). The map never teleports.
   v3 (DESIGN3 §4.9): a green «UT» button (trail to the exit mat), the exit room's tile leads to the mat, unreachable rooms are greyed.
   F.BldMap = { open({floor?}) , close(), isOpen }   (F.Bld.openMap / closeMap call these; F.Castle.ov mirrors isOpen) */
(function () {
'use strict';
const F = window.F;
const M = F.BldMap = { isOpen: false, panel: null, floor: 0 };
const say = (id, slots) => (F.TPL && F.TPL.has && F.TPL.has(id) ? F.SAYF(id, slots || {}) : Promise.resolve(false));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const ICON = {
  stair: '<svg viewBox="0 0 40 40" class="bm-ico"><circle cx="20" cy="20" r="16" fill="#fff3d6" stroke="#e0a91e" stroke-width="3"/><path d="M20 20 L20 6 A14 14 0 0 1 33 15 Z M20 20 L33 15 A14 14 0 0 1 30 30 Z" fill="#ec7aa8"/><path d="M20 20 L30 30 A14 14 0 0 1 12 32 Z" fill="#f6a9c8"/><circle cx="20" cy="20" r="3.5" fill="#e0a91e"/></svg>',
  lift: '<svg viewBox="0 0 40 40" class="bm-ico"><rect x="7" y="4" width="26" height="32" rx="4" fill="#ffe9a8" stroke="#e0a91e" stroke-width="3"/><path d="M14 16 L20 9 L26 16 Z M14 24 L20 31 L26 24 Z" fill="#c0392b"/></svg>',
  exit: '<svg viewBox="0 0 40 40" class="bm-ico"><path d="M8 36 V16 A12 12 0 0 1 32 16 V36 Z" fill="#a8dd88" stroke="#5a9a3a" stroke-width="3"/><circle cx="20" cy="10" r="5" fill="#ffe066"/><path d="M20 30 L20 19 M15 24 L20 30 L25 24" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  fe: '<svg viewBox="0 0 40 40" class="bm-fe"><ellipse cx="11" cy="17" rx="8" ry="11" fill="#e9f6ff" stroke="#8fb8ff" stroke-width="2"/><ellipse cx="29" cy="17" rx="8" ry="11" fill="#e9f6ff" stroke="#8fb8ff" stroke-width="2"/><path d="M13 38 L20 18 L27 38 Z" fill="#c6a8ff"/><circle cx="20" cy="14" r="6" fill="#ffd9c2"/><path d="M14 12 Q20 3 26 12" fill="#ffd36e"/></svg>',
};
function render(wrap, P) {
  wrap.innerHTML = '';
  const head = el('div', 'bm-head');
  head.appendChild(el('div', 'bm-title', P.name || 'Slottet'));
  // v3 §4.9: a green «UT» button – the glitter way to the exit mat (to the stairs / lift first on another floor)
  if (P.exits && P.exits.length && F.Bld.guideOut) {
    const ut = F.UI.btn(ICON.exit + '<span>UT</span>', () => { M.close(); F.Bld.guideOut(); }, { cls: 'bm-ut' });
    ut.dataset.ut = '1'; head.appendChild(ut);
  }
  wrap.appendChild(head);
  if (P.floors > 1) {
    const tabs = el('div', 'bm-tabs');
    for (let f = P.floors - 1; f >= 0; f--) {
      const b = F.UI.btn('<span class="bm-tabn">' + (f + 1) + '</span>', () => { M.floor = f; F.sfx && F.sfx.click && F.sfx.click(); render(wrap, P); }, { cls: 'bm-tab' + (f === M.floor ? ' on' : '') + (f === F.Bld.f ? ' here' : '') });
      tabs.appendChild(b);
    }
    wrap.appendChild(tabs);
  }
  const row = el('div', 'bm-row');
  const cells = P.cells.filter(c => c.f === M.floor).sort((a, b) => a.c - b.c);
  const S = P.stair, Lc = P.lift ? P.lift.cells : [];
  let reach = null;
  try { if (F.Bld.reach && (!P._reach || F.T.now - (P._reachT || 0) > 30)) { P._reach = F.Bld.reach(P.id); P._reachT = F.T.now; } reach = P._reach || null; } catch (e) { reach = null; }
  for (const c of cells) {
    const isHere = F.Bld.cur === P.id && F.Bld.f === c.f && F.Bld.roomKey === c.key;
    const icons = [];
    if (S && c.c === S.col && c.f >= S.fMin && c.f <= S.fMax) icons.push(ICON.stair);
    if (Lc.includes(c.key)) icons.push(ICON.lift);
    if (P.exits.some(e => e.cell === c.key)) icons.push(ICON.exit);
    const html = (c.num != null ? '<span class="bm-num">' + c.num + '</span>' : '<span class="bm-num bm-none"></span>') +
      '<span class="bm-name">' + (F.UI.caseText ? F.UI.caseText(c.name) : c.name) + '</span>' +
      (icons.length ? '<span class="bm-icons">' + icons.join('') + '</span>' : '') + (isHere ? '<span class="bm-here">' + ICON.fe + '</span>' : '');
    const off = !!(reach && reach[c.key] && !reach[c.key].ok);               // v3 §4.9: a room she cannot reach is greyed
    const b = F.UI.btn(html, () => pick(P, c, off), { cls: 'bm-room' + (isHere ? ' here' : '') + (off ? ' bm-off' : '') });
    b.dataset.room = c.key;
    row.appendChild(b);
  }
  wrap.appendChild(row);
}
function pick(P, c, off) {
  const here = F.Bld.cur === P.id && F.Bld.f === c.f && F.Bld.roomKey === c.key;
  M.close();
  if (here) { say('bld_her'); const p = F.Player.pos; if (F.FX && F.FX.sparkle) F.FX.sparkle(new THREE.Vector3(p.x, p.y + 1.2, p.z)); return; }
  if (off) { if (F.sfx && F.sfx.boing) F.sfx.boing(); return; }
  // the exit room (Hallen): the trail ends on the UT mat, not in the middle of the hall (v3 §4.9)
  if (P.exits.some(e => e.cell === c.key) && F.Bld.guideOut) { F.Bld.guideOut(); return; }
  const leg = F.Bld.guideTo({ room: c.key }, { quiet: true });
  if (leg && leg.hint) say(leg.hint); else if (c.num != null) say('bld_rom', { n: c.num }); else say('bld_kart_dit');
}
M.open = function (o) {
  o = o || {};
  if (M.isOpen) return M.panel;
  const P = F.Bld.curPlan && F.Bld.curPlan(); if (!P || F.Space.cur !== 'in') return null;
  M.floor = o.floor != null ? o.floor : F.Bld.f;
  const wrap = el('div', 'bldmap');
  render(wrap, P);
  M.panel = F.UI.open(wrap, { cls: 'bldmap-wrap', onClose: () => { M.isOpen = false; M.panel = null; if (F.Castle) F.Castle.ov = false; F.emit('overview', false); } });
  M.isOpen = true; if (F.Castle) F.Castle.ov = true;
  F.emit('overview', true);
  say('bld_kart_trykk');
  return M.panel;
};
M.close = function () { if (M.panel) M.panel.close(); };
addEventListener('keydown', e => { if (M.isOpen && e.code === 'Escape') M.close(); });
})();
