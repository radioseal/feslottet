/* Feslottet – save (localStorage). Modules own their sub-objects: F.save.<module> = {...}; call F.store() after changes. */
(function () {
'use strict';
const F = window.F;
const KEY = 'feslottet_v1';
function fresh() {
  return { v: 1, created: Date.now(), fairy: null, intro: false, coins: 0, totalEarned: 0, pos: null,
    settings: { sound: true, music: true }, learn: {}, world: {}, quests: {}, shop: {}, inv: {}, stats: { sessions: 0, playSec: 0 } };
}
let s = fresh();
if (!F.flags.fresh && !F.flags.collect) {
  try { const raw = localStorage.getItem(KEY); if (raw) s = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { console.warn('save load failed', e); }
}
F.save = s;
F.audioSettings = s.settings;
let pending = null;
F.store = function (now) {
  if (F.flags.collect) return;
  const write = () => { pending = null; try { localStorage.setItem(KEY, JSON.stringify(F.save)); } catch (e) { console.warn('save failed', e); } };
  if (now) { if (pending) clearTimeout(pending); write(); return; }
  if (!pending) pending = setTimeout(write, 400);
};
F.resetSave = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
addEventListener('beforeunload', () => F.store(true));
})();
