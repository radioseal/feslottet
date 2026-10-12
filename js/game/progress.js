/* Feslottet – progress the child can see (DESIGN §9.8) + the parent page (§9.9). SHELL WP.
   F.Prog.floors() -> {tall:{n, gold, cur}, les:{…}, skriv:{…}}   (n counts the base floor: 1 + passed rungs; never shrinks)
   F.Prog.sync(animate)        push floors to F.Castle.towers.*.setFloors(n, goldN, {cur, animate})
   F.Prog.addFloor(tower)      (interface) queue a floor ceremony now (normally automatic from rungUp/floorAdded/mastered)
   F.Prog.gems() -> n          Staven gems: one per 5 passed rungs (max 12)
   F.Prog.bloom() -> {10:{'T-NAVN':box,…}, …, 20:{…}}   Tallhagen bloom state (Leitner box 0–5 per number × strand); emits 'bloom'
   F.Prog.museum() -> [{w, n, day, t}] newest first (array; .golden = golden letters)   Ordmuseet data feed
   F.Prog.sayFloors(tower)     «14 etasjer!»
   F.Prog.gate(onOk?)          parent gate (a×b, a,b ∈ 6–9) → onOk or the parent page
   F.Prog.openParent()         the parent page (plain text, for the parent)
   F.Prog.today()              {coins, words:[…], floors:{tall,les,skriv}, friends:[sp…] (new today), kingdoms:{found:[id…], appeared:[id…], friend:[id…]}}
                               for the bedtime summary (DESIGN2 WP10: new friends and kingdoms of the day)
   F.Prog.world()              {friends, species, pages, legends, kingdoms:{total, appeared, found, friend}, list:[…]} (parent page counts)
   Save: F.save.prog = {floors:{tall,les,skriv}, gold:{…}, gems, museum:{w:{n,day,t}}, rungLog:[[day,taskNo,strand,rung,sup,kind]], days:{day:{date,sec,sessions,tasks,A}}} */
(function () {
'use strict';
const F = window.F;
const U = F.U;
const STR = [
  { id: 'T-NAVN', name: 'Tall: navn', max: 9, tower: 'tall', desc: ['10–12, 2 valg langt fra hverandre', '10–15, 3 valg', '10–20, 3 valg', '10–20, 4 valg med naboer', 'ten vs. -ti (13/30, 14/40)', '15 / 50 / 51 / 5', 'les tallord → tall (seksten → 16)', 'tretten / tretti', 'flyt: bevegelige mål, mild tid'] },
  { id: 'T-MENGDE', name: 'Tall: mengde', max: 10, tower: 'tall', desc: ['telle 10–12 strukturert', 'telle 10–15 strukturert', 'telle 10–20 strukturert', 'bygge N: tierstav + enere', 'telle ustrukturert 10–15', 'telle ustrukturert 10–20', 'telle opp N fra en haug', 'dele opp: 17 er 10 og …?', 'betale N med tiere + enere', 'over tieren, manglende ledd, veksel fra 20'] },
  { id: 'T-SKRIV', name: 'Tall: skrive', max: 7, tower: 'tall', desc: ['hør «fjorten» → velg enersifferet', 'to sifferbrikker i riktig rekkefølge', 'skriv 10–15 på tastatur', 'skriv 10–20', 'skriv med 13/30-kontrast', 'bygg tallord med bokstaver', 'skriv tallordet'] },
  { id: 'T-ORDEN', name: 'Tall: rekkefølge', max: 8, tower: 'tall', desc: ['neste etter N (10–15)', 'før/etter (10–20)', 'mellom (mangler i en rekke)', 'mer/mindre med synlige mengder', 'sammenlign nære tall (14/16)', 'sammenlign 13/31, 15/51', 'ordne 3 tall', 'ordne 5 / telle baklengs 20→10'] },
  { id: 'LES', name: 'Lese', max: 11, tower: 'les', desc: ['3 bokstaver, 2 bildevalg', '3 bokstaver, 3 valg', 'minimale par (mus/hus/mos)', '4 bokstaver, lydrett', 'konsonantgrupper (hest, stol)', 'dobbel konsonant (katt, ball)', 'diftong og ng (stein, seng)', 'kj/skj/sj/hj, stum h/d/g', '5–6 bokstaver (banan, sykkel)', 'tobordsfraser (rød ball)', 'korte setninger, Kongeposten'] },
  { id: 'SKRIV', name: 'Skrive', max: 11, tower: 'skriv', desc: ['første lyd (3 brikker)', '3 bokstaver, lydrett', '4 bokstaver, lydrett', 'konsonantgrupper', 'dobbel konsonant', '5–6 bokstaver, to stavelser', 'diftong / ng', 'kj/skj/sj/hj, stumme bokstaver', '6 bokstaver blandet', 'bokstavbytte (mus→hus)', 'bilde uten lyd, kategori, rette Mias feil'] },
];
const SUP = ['mye støtte (s0)', 'standard (s1)', 'lite støtte (s2)'];
const TOWERS = { tall: { max: 34 }, les: { max: 11 }, skriv: { max: 11 } };
const P = F.Prog = { STR };
const prog = () => {
  const s = F.save.prog = F.save.prog || {};
  s.museum = s.museum || {}; s.rungLog = s.rungLog || []; s.days = s.days || {};
  return s;
};
const day = () => F.save.day || 1;

/* ------------------------------------------------------------ normalise F.LEARN.summary() (+ raw save as fallback) */
function toSet(x) {
  const out = new Set();
  if (x == null) return out;
  if (typeof x === 'number') { for (let i = 1; i <= x; i++) out.add(i); return out; }
  if (Array.isArray(x)) { x.forEach(v => { if (typeof v === 'number') out.add(v); else if (v && v.rung != null) out.add(+v.rung); else if (typeof v === 'string' && /^\d+$/.test(v)) out.add(+v); }); return out; }
  if (x instanceof Set) { x.forEach(v => out.add(+v)); return out; }
  if (typeof x === 'object') { for (const k in x) if (x[k]) out.add(+k); }
  return out;
}
function logOf() { const L = F.save.learn && F.save.learn.log; return Array.isArray(L) ? L : []; }
function acc20(id) {
  const L = logOf().filter(e => Array.isArray(e) ? String(e[3] || '').startsWith(id + ':') : (e && e.strand === id));
  const last = L.slice(-20); if (!last.length) return null;
  return last.filter(e => (Array.isArray(e) ? e[4] : e.outcome) === 'A').length / last.length;
}
P.summary = function () {
  let s = {};
  try { s = F.LEARN.summary() || {}; } catch (e) { s = {}; }
  const raw = (F.save.learn && F.save.learn.strands) || {};
  const out = {};
  STR.forEach(d => {
    const a = (s.strands || {})[d.id] || {}, b = raw[d.id] || {};
    let acc = a.acc20 != null ? a.acc20 / 100 : acc20(d.id);
    out[d.id] = {
      rung: +(a.rung != null ? a.rung : (b.rung != null ? b.rung : 1)), sup: +(a.sup != null ? a.sup : (b.sup != null ? b.sup : 1)),
      passed: toSet(a.passed != null ? a.passed : b.passed), mastered: toSet(a.mastered != null ? a.mastered : b.mastered),
      prov: toSet(a.prov != null ? a.prov : b.prov), acc,
      hist: a.hist || b.hist || [], timeline: a.timeline || null, n: a.n || 0,
    };
  });
  const L = F.save.learn || {};
  let conf = s.conf || L.conf || {};
  if (!Array.isArray(conf)) conf = Object.keys(conf).map(k => [k, +conf[k] || 0]).sort((x, y) => y[1] - x[1]);
  let tags = s.tags || L.tags || {};
  const tg = {}; for (const k in tags) tg[k] = Array.isArray(tags[k]) ? tags[k].length : (+tags[k] || 0);
  return { strands: out, heat: s.heat || null, conf, tags: tg, words: s.words || null, spont: s.spont || (F.save.words && F.save.words.spont) || {},
    log: s.log || logOf().slice(-50), raw: s };
};

/* ------------------------------------------------------------ towers */
P.floors = function () {
  const S = P.summary().strands;
  const res = {};
  for (const key in TOWERS) {
    const ids = STR.filter(d => d.tower === key);
    let passed = 0, gold = 0, cur = 1;
    ids.forEach(d => { const st = S[d.id]; passed += st.passed.size; gold += st.mastered.size; cur += Math.max(0, Math.min(st.rung - 1, st.passed.size)); });
    const n = Math.min(TOWERS[key].max, 1 + passed);
    if (ids.length === 1) cur = U.clamp(S[ids[0].id].rung, 1, n);
    res[key] = { n, gold: Math.min(gold, n), cur: U.clamp(cur, 1, n), passed };
  }
  return res;
};
P.sync = function (animate) {
  const fl = P.floors(), pg = prog();
  const keep = pg.floors || {};
  for (const key in fl) {
    const t = F.Castle.towers && F.Castle.towers[key];
    const n = Math.max(fl[key].n, keep[key] || 0);           // floors never disappear
    if (t && t.setFloors) { try { t.setFloors(n, fl[key].gold, { cur: fl[key].cur, animate: !!animate }); } catch (e) { console.error('[prog] setFloors', e); } }
  }
};
let queue = [], busy = false;
function check(fromEvent) {
  const pg = prog(), fl = P.floors();
  if (!pg.floors) { pg.floors = {}; pg.gold = {}; for (const k in fl) { pg.floors[k] = fl[k].n; pg.gold[k] = fl[k].gold; } pg.gems = P.gems(); F.store(); P.sync(false); return; }
  for (const k in fl) {
    const add = fl[k].n - (pg.floors[k] || 1), g = fl[k].gold - (pg.gold[k] || 0);
    if (add > 0 || g > 0) {
      pg.floors[k] = Math.max(pg.floors[k] || 1, fl[k].n); pg.gold[k] = Math.max(pg.gold[k] || 0, fl[k].gold);
      if (add > 0) { const td = F.save.today; if (td) { td.floors = td.floors || {}; td.floors[k] = (td.floors[k] || 0) + add; } }
      queue.push({ tower: k, add: Math.max(0, add), gold: Math.max(0, g) });
    }
  }
  const gm = P.gems();
  if (gm > (pg.gems || 0)) { queue.push({ gem: gm }); pg.gems = gm; }
  F.store();
  // the towers grow right away; only when she can see them does the ceremony animate the new floor cube by cube
  if ((!queue.length && fromEvent) || !nearTowers()) P.sync(false);
  pump();
}
P.check = check;
function nearTowers() { return F.Space.cur === 'out' && !!(F.Castle.towers && F.Castle.towers.les) && Math.hypot(F.Player.pos.x - 24, F.Player.pos.z - 37) < 45; }
P.gems = function () { const S = P.summary().strands; let n = 0; for (const id in S) n += S[id].passed.size; return Math.min(12, Math.floor(n / 5)); };
P.addFloor = function (tower) { queue.push({ tower: tower || 'tall', add: 1, gold: 0, manual: true }); pump(); };
// after a task that ended without an A (a miss, the solution shown) the big reward waits for the next A or a calm 20 s,
// so failing never looks like the way to a new floor
let holdUntil = 0;
F.on('taskEnd', (item, res) => {
  if (!res || res.aborted) return;
  if (res.outcome === 'A') { holdUntil = 0; return; }
  holdUntil = F.T.now + 20;
});
P._hold = () => Math.max(0, holdUntil - F.T.now);
const canShow = () => F.booted && !F.Task.current && !F.UI.isOpen() && !(F.Shell && F.Shell.screen) && F.HUD.built && !F.HUD.hidden && F.T.now >= holdUntil;
function pump() {
  if (busy || !queue.length || !canShow()) return;
  busy = true;
  const job = queue.shift();
  ceremony(job).catch(e => console.error('[prog] ceremony', e)).then(() => { busy = false; F.T.timeout(pump, 400); });
}
F.on('tick', () => { if (!busy && queue.length) pump(); });
const TCOL = { tall: ['#9ad6ff', '#6fa8ec'], les: ['#9fe6c4', '#7fd1b0'], skriv: ['#f6a9c8', '#ec7aa8'] };
function towerArt(key, n, gold) {
  const [c1, c2] = TCOL[key] || TCOL.tall, show = Math.min(7, n), base = 170;
  let f = '';
  for (let i = 0; i < show; i++) {
    const real = n - show + i, isNew = i === show - 1, y = base - (i + 1) * 20;
    const fill = real < gold ? '#ffd84a' : (real % 2 ? c1 : '#fff');
    f += `<g class="${isNew ? 'tw-new' : ''}"><rect x="34" y="${y}" width="82" height="19" rx="3" fill="${fill}" stroke="#b98a45" stroke-width="2"/>
      <rect x="47" y="${y + 5}" width="10" height="10" rx="5" fill="#9fd3f4"/><rect x="93" y="${y + 5}" width="10" height="10" rx="5" fill="#9fd3f4"/></g>`;
  }
  const top = base - show * 20;
  return `<svg class="tw-svg" viewBox="0 0 150 190"><rect x="26" y="${base}" width="98" height="16" rx="4" fill="#e8dcc4" stroke="#b98a45" stroke-width="2"/>${f}
    <path d="M26 ${top} L75 ${top - 40} L124 ${top} Z" fill="${c2}" stroke="#b98a45" stroke-width="2" stroke-linejoin="round"/>
    <path d="M75 ${top - 40} L75 ${top - 56}" stroke="#b98a45" stroke-width="2.5"/><path d="M75 ${top - 56} L92 ${top - 50} L75 ${top - 44} Z" fill="#ff7fb0"/></svg>`;
}
async function ceremony(job) {
  if (job.gem) {
    F.HUD.setGems(job.gem, true); F.sfx.sparkle(); F.sfx.chime();
    await F.SAY('prog_gem');
    return;
  }
  const key = job.tower, fl = P.floors()[key];
  const near = nearTowers();
  P.sync(near);
  if (!job.add && job.gold) { F.sfx.levelup(); await F.SAY('prog_floor_gold'); return; }
  const el = document.createElement('div'); el.className = 'hud-cer';
  el.innerHTML = '<div class="rays"></div><div class="disk"></div>' + towerArt(key, fl ? fl.n : 2, fl ? fl.gold : 0) + '<div class="coin10">10</div>';
  document.body.appendChild(el);
  void el.offsetWidth; el.classList.add('on');
  F.sfx.levelup();
  F.SAY('prog_floor_new');
  await F.T.sleep(1100);
  el.classList.add('coin'); F.sfx.coin();
  await F.T.sleep(500);
  const n = 10 * Math.min(2, Math.max(1, job.add));
  const cn = el.querySelector('.coin10'), r = cn ? cn.getBoundingClientRect() : el.getBoundingClientRect();
  F.Eco.add(n, { reason: 'floor', from: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  if (!F.Eco.flies) F.UI.flyCoins(Math.min(n, 12), { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  await F.T.sleep(1300);
  el.classList.remove('on');
  setTimeout(() => el.remove(), 500);
  if (job.gold) { await F.T.sleep(300); await F.SAY('prog_floor_gold'); }
}
P.sayFloors = function (tower) {
  const t = F.Castle.towers && F.Castle.towers[tower];
  const n = t ? t.n : P.floors()[tower].n;
  if (n === 1) return F.SAY('prog_floors1');
  if (n >= 2 && n <= 34) return F.SAY('prog_floors', { n });
  return Promise.resolve();
};
['rungUp', 'mastered', 'floorAdded', 'supUp'].forEach(ev => F.on(ev, () => check(true)));
F.on('rungDown', () => P.sync(false));                          // figurine glides down quietly; floors stay
F.on('taskEnd', () => { F.T.timeout(() => { check(false); bloomCheck(); }, 50); });
F.on('ready', () => { check(false); P.sync(false); bloomCheck(true); });
F.on('castleBuilt', () => P.sync(false));

/* ------------------------------------------------------------ learning log for the parent timeline */
['rungUp', 'rungDown'].forEach(ev => F.on(ev, (strand, rung) => {
  const S = P.summary().strands[strand];
  prog().rungLog.push([day(), (F.save.learn && F.save.learn.taskNo) || 0, strand, rung != null ? +rung : (S ? S.rung : 1), S ? S.sup : 1, ev === 'rungUp' ? 'u' : 'd', Date.now()]);
  if (prog().rungLog.length > 3000) prog().rungLog.splice(0, 500);
  F.store();
}));
F.on('dayStart', () => {
  const S = P.summary().strands;
  STR.forEach(d => prog().rungLog.push([day(), (F.save.learn && F.save.learn.taskNo) || 0, d.id, S[d.id].rung, S[d.id].sup, 's', Date.now()]));
  const dd = prog().days[day()] = prog().days[day()] || { date: new Date().toISOString().slice(0, 10), sec: 0, sessions: 0, tasks: 0, A: 0 };
  void dd;
});
function dayRec() { const k = day(); return prog().days[k] = prog().days[k] || { date: new Date().toISOString().slice(0, 10), sec: 0, sessions: 0, tasks: 0, A: 0 }; }
P.dayRec = dayRec;
F.on('taskEnd', (item, res) => { const d = dayRec(); d.tasks++; if (res && res.outcome === 'A') d.A++; });
let secAcc = 0;
F.on('tick', dt => { if (!F.Day || !F.Day.active || (F.Shell && F.Shell.screen)) return; secAcc += dt; if (secAcc >= 5) { dayRec().sec += secAcc; secAcc = 0; } });

/* ------------------------------------------------------------ Tallhagen bloom + Ordmuseet + Staven */
P.bloom = function () {
  const items = (F.save.learn && F.save.learn.items) || {}, out = {};
  const heat = (P.summary().heat) || null;
  for (let n = 10; n <= 20; n++) {
    out[n] = {};
    ['T-NAVN', 'T-MENGDE', 'T-SKRIV', 'T-ORDEN'].forEach(s => {
      let b = 0;
      if (heat && heat[s] && heat[s][n] != null) b = +heat[s][n] || 0;
      else { const it = items[s + ':' + n]; b = it ? (+it.box || 0) : 0; }
      out[n][s] = U.clamp(b, 0, 5);
    });
  }
  return out;
};
let bloomSig = '';
function bloomCheck(silent) {
  const b = P.bloom(), sig = JSON.stringify(b);
  if (sig === bloomSig) return;
  const first = !bloomSig; bloomSig = sig;
  F.emit('bloom', b);
  try { if (F.Park && F.Park.setBloom) F.Park.setBloom(b); } catch (e) { console.error(e); }
  void first; void silent;
}
P.museum = function () {
  const m = prog().museum;
  const words = Object.keys(m).map(w => ({ w, n: m[w].n, day: m[w].day, t: m[w].t })).sort((a, b) => b.t - a.t);
  words.words = words; words.golden = (F.save.golden || []).slice();   // array (newest first) with .golden attached
  return words;
};
let lastT = 0;
F.on('cast', c => {
  if (!c || !c.word) return;
  const w = String(c.word).toLowerCase(), m = prog().museum;
  const isNew = !m[w];
  m[w] = m[w] || { n: 0, day: day(), t: 0 };
  lastT = Math.max(Date.now(), lastT + 1);                         // strictly increasing: newest first is stable
  m[w].n += 1; m[w].t = lastT;
  const td = F.save.today; if (td) { td.words = td.words || {}; td.words[w] = (td.words[w] || 0) + 1; }
  F.store();
  if (isNew) F.emit('museumNew', w);
});
// DESIGN2: new animal friends and kingdoms of the day (read-only views of WP6's F.save.album and WP3's F.save.realm)
function friendsToday() {
  const A = (F.save.album && F.save.album.friends) || {}, d = day();
  return Object.keys(A).filter(sp => A[sp] && A[sp].day === d);
}
function kingdomsToday() {
  const R = F.save.realm || {}, d = day(), out = { appeared: [], found: [], friend: [] };
  for (const id in (R.found || {})) if (R.found[id] === d) out.found.push(id);
  for (const id in (R.appeared || {})) if (R.appeared[id] === d && !(((F.REALMS && F.REALMS.get && F.REALMS.get(id)) || {}).k <= 2)) out.appeared.push(id);   // K1/K2 are there from the start
  const rq = F.save.rq && F.save.rq.friend; if (rq) for (const id in rq) if (rq[id] === d) out.friend.push(id);
  return out;
}
P.today = function () {
  const td = F.save.today || {};
  return { coins: td.earned || 0, words: Object.keys(td.words || {}), floors: Object.assign({ tall: 0, les: 0, skriv: 0 }, td.floors || {}), towerN: (() => { const f = P.floors(); return { tall: f.tall.n, les: f.les.n, skriv: f.skriv.n }; })(),
    friends: friendsToday(), kingdoms: kingdomsToday() };
};
P.world = function () {
  const A = (F.save.album && F.save.album.friends) || {};
  const sp = (F.FAUNA && F.FAUNA.species) || [];
  const friends = Object.keys(A).filter(id => A[id]);
  const pages = (F.FAUNA && F.FAUNA.pages) || [];
  const fullPages = pages.filter(pg => { const n = pg.n != null ? pg.n : pg.page; const L = sp.filter(s => s.page === n); return L.length && L.every(s => A[s.id]); }).length;
  const legendSeen = Object.keys((F.save.fauna && F.save.fauna.legendSeen) || {}).length;
  let list = []; try { list = F.Realm && F.Realm.list ? F.Realm.list() : []; } catch (e) { list = []; }
  const k = { total: (F.REALMS && F.REALMS.length) || list.length || 10, appeared: 0, found: 0, friend: 0 };
  list.forEach(r => { if (r.state === 'appeared') k.appeared++; else if (r.state === 'found') { k.appeared++; k.found++; } else if (r.state === 'friend') { k.appeared++; k.found++; k.friend++; } });
  const byDay = {}; friends.forEach(id => { const d = A[id].day || 0; byDay[d] = (byDay[d] || 0) + 1; });
  return { friends: friends.length, species: sp.length || 110, pages: fullPages, pageN: pages.length || 11, legends: legendSeen, kingdoms: k, list, byDay,
    names: friends.slice(-40).reverse() };
};

/* ================================================================== parent gate (hold gear 3 s → a × b, a,b ∈ 6–9) */
P.gate = function (onOk) {
  const a = U.int(F.rand, 6, 9), b = U.int(F.rand, 6, 9);
  const box = F.UI.el('div', 'gate');
  box.innerHTML = `<h3>For voksne</h3><div class="q">${a} × ${b} = ?</div><div class="ans"></div><div class="pad"></div>`;
  const ans = box.querySelector('.ans'), pad = box.querySelector('.pad');
  let val = '', wrong = 0;
  const lockScreen = !!(F.Shell && F.Shell.screen);
  document.body.classList.add('parent-open');
  const h = F.UI.open(box, { cls: 'gate', onClose: () => { document.body.classList.remove('parent-open'); removeEventListener('keydown', key, true); if (lockScreen && F.Shell.screen) { F.Input.enabled = false; F.Player.frozen = true; } } });
  const submit = () => {
    if (+val === a * b) { h.close(); F.sfx.ok(); if (onOk) onOk(); else P.openParent(); return; }   // (close first: the page re-adds parent-open)
    wrong++; F.sfx.bad(); ans.classList.remove('wrong'); void ans.offsetWidth; ans.classList.add('wrong'); val = ''; ans.textContent = '';
    if (wrong >= 2) h.close();
  };
  const press = k => { if (k === 'ok') return submit(); if (k === 'back') val = val.slice(0, -1); else if (val.length < 3) val += k; ans.textContent = val; };
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'].forEach(k => {
    const BACK = '<svg viewBox="0 0 40 28" width="34" height="24"><path d="M12 3 H36 V25 H12 L3 14 Z" fill="#8a7fc0"/><path d="M18 9 L28 19 M28 9 L18 19" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>';
    const btn = F.UI.btn(k === 'back' ? BACK : k === 'ok' ? 'OK' : k, () => press(k), { cls: k === 'ok' ? 'mint' : '' });
    btn.dataset.k = k; pad.appendChild(btn);
  });
  function key(e) { if (/^[0-9]$/.test(e.key)) { press(e.key); e.stopPropagation(); } else if (e.key === 'Backspace') { press('back'); e.stopPropagation(); } else if (e.key === 'Enter') { press('ok'); e.stopPropagation(); } }
  addEventListener('keydown', key, true);
  P._gateAnswer = () => { val = String(a * b); submit(); };
  return h;
};

/* ================================================================== parent page (DESIGN §9.9) */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = x => x == null ? '–' : Math.round(x * 100) + ' %';
const SEQ = ['#f0efec', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf'];   // Leitner box 0–5 (sequential blue)
const epochDay = t => { const d = new Date(t); return Math.floor((t - d.getTimezoneOffset() * 60000) / 864e5); };
const dmy = ed => { const d = new Date(ed * 864e5); return d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.'; };
// the first days: rung per TASK (a 14-day axis would be one dot); later: rung per day over the last 14 days
function taskline(d, st, ent, taskNow) {
  const W = 330, Hh = 92, padL = 24, padB = 16, padT = 10;
  const t0 = ent[0][2], t1 = Math.max(taskNow || 0, ent[ent.length - 1][2], t0 + 1);
  const xs = n => padL + (n - t0) / (t1 - t0) * (W - padL - 10);
  const ys = r => padT + (1 - (r - 1) / Math.max(1, d.max - 1)) * (Hh - padT - padB);
  let path = '', prev = null; const drops = [], marks = [];
  ent.forEach(([, r, n], i) => {
    const x = xs(n), y = ys(r);
    path += i ? ` H${x.toFixed(1)} V${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`;
    if (prev != null && r < prev) drops.push([n, prev, r]); else if (prev == null || r !== prev) marks.push([n, r]);
    prev = r;
  });
  path += ` H${xs(t1).toFixed(1)} V${ys(st.rung).toFixed(1)}`;
  let grid = '';
  [1, Math.ceil(d.max / 2), d.max].forEach(r => { grid += `<line x1="${padL}" x2="${W - 10}" y1="${ys(r).toFixed(1)}" y2="${ys(r).toFixed(1)}" stroke="#ece8f3" stroke-width="1"/><text x="${padL - 6}" y="${(ys(r) + 4).toFixed(1)}" font-size="10" fill="#8a83a3" text-anchor="end">${r}</text>`; });
  const xl = `<text x="${padL}" y="${Hh - 3}" font-size="10" fill="#8a83a3">oppgave ${t0}</text><text x="${W - 10}" y="${Hh - 3}" font-size="10" fill="#8a83a3" text-anchor="end">nå (${t1})</text>`;
  const mk = marks.map(([n, r]) => `<circle cx="${xs(n).toFixed(1)}" cy="${ys(r).toFixed(1)}" r="3.5" fill="#2a78d6" stroke="#fff" stroke-width="1.5"><title>oppgave ${n}: trinn ${r}</title></circle>`).join('');
  const dm = drops.map(([n, a, b]) => { const x = xs(n), y = ys(b); return `<path d="M${(x - 6).toFixed(1)} ${(y + 7).toFixed(1)} h12 l-6 9 z" fill="#e34948" stroke="#fff" stroke-width="1.5"><title>oppgave ${n}: ned fra trinn ${a} til ${b}</title></path>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="Trinn per oppgave">${grid}${xl}<path d="${path}" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round"/>${mk}${dm}</svg>`;
}
function timeline(d, st, taskNow) {
  const W = 330, Hh = 92, padL = 24, padB = 16, padT = 10;
  const today = epochDay(Date.now()), d0 = today - 13;
  if (Array.isArray(st.timeline) && st.timeline.length >= 1 && st.timeline.every(e => e[3] != null)) {
    const recent = st.timeline.filter(e => +e[0] >= d0);
    if (recent.length >= 1 && new Set(recent.map(e => +e[0])).size <= 2) return taskline(d, st, recent.map(e => [+e[0], +e[1], +e[3]]), taskNow);
  }
  // entries [epochDay, rung]: the engine's own timeline, else SHELL's rung log (play days mapped to dates)
  let ent = [];
  if (Array.isArray(st.timeline) && st.timeline.length) ent = st.timeline.map(e => [+e[0], +e[1]]);
  else ent = prog().rungLog.filter(e => e[2] === d.id).map(e => [epochDay(e[6] || Date.now()), +e[3]]);
  const before = ent.filter(e => e[0] < d0).slice(-1)[0];
  let cur = before ? before[1] : (ent.length ? ent[0][1] : st.rung);
  const pts = [], drops = [];
  for (let k = d0; k <= today; k++) {
    const dayE = ent.filter(e => e[0] === k);
    dayE.forEach(e => { if (e[1] < cur) drops.push({ day: k, from: cur, to: e[1] }); cur = e[1]; });
    if (k === today) cur = st.rung;
    pts.push([k, cur, dayE.length > 0 || k === today]);
  }
  const xs = k => padL + (k - d0) / 13 * (W - padL - 10);
  const ys = r => padT + (1 - (r - 1) / Math.max(1, d.max - 1)) * (Hh - padT - padB);
  // the line starts on the first day with data (no invented history before she started)
  const firstK = ent.length ? Math.max(d0, Math.min(...ent.map(e => e[0]))) : today;
  let path = '';
  pts.filter(p => p[0] >= firstK).forEach(([k, r], i) => { const x = xs(k), y = ys(r); path += i ? ` H${x.toFixed(1)} V${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`; });
  let grid = '';
  [1, Math.ceil(d.max / 2), d.max].forEach(r => { grid += `<line x1="${padL}" x2="${W - 10}" y1="${ys(r).toFixed(1)}" y2="${ys(r).toFixed(1)}" stroke="#ece8f3" stroke-width="1"/><text x="${padL - 6}" y="${(ys(r) + 4).toFixed(1)}" font-size="10" fill="#8a83a3" text-anchor="end">${r}</text>`; });
  const xl = `<text x="${padL}" y="${Hh - 3}" font-size="10" fill="#8a83a3">${dmy(d0)}</text><text x="${W - 10}" y="${Hh - 3}" font-size="10" fill="#8a83a3" text-anchor="end">i dag</text>`;
  const marks = pts.filter(p => p[2]).map(([k, r]) => `<circle cx="${xs(k).toFixed(1)}" cy="${ys(r).toFixed(1)}" r="4" fill="#2a78d6" stroke="#fff" stroke-width="2"><title>${dmy(k)}: trinn ${r}</title></circle>`).join('');
  const dm = drops.map(o => { const x = xs(o.day), y = ys(o.to); return `<path d="M${(x - 6).toFixed(1)} ${(y + 7).toFixed(1)} h12 l-6 9 z" fill="#e34948" stroke="#fff" stroke-width="1.5"><title>${dmy(o.day)}: ned fra trinn ${o.from} til ${o.to}</title></path>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="Trinn siste 14 dager">${grid}${xl}<path d="${path}" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round"/>${marks}${dm}</svg>`;
}
function dayBars() {
  const days = prog().days, today = day(), d0 = Math.max(1, today - 13);
  const rows = []; for (let k = d0; k <= today; k++) rows.push([k, days[k] ? days[k].sec / 60 : 0, days[k] || null]);
  const mx = Math.max(10, ...rows.map(r => r[1]));
  const W = 520, Hh = 120, padB = 18, bw = Math.min(28, (W - 20) / rows.length - 6);
  const bars = rows.map(([k, m, rec], i) => {
    const h = (m / mx) * (Hh - padB - 10), x = 10 + i * ((W - 20) / rows.length), y = Hh - padB - h;
    const tip = `dag ${k}${rec ? ' (' + rec.date + ')' : ''}: ${Math.round(m)} min, ${rec ? rec.sessions : 0} økter, ${rec ? rec.tasks : 0} oppgaver${rec && rec.tasks ? ', ' + Math.round(100 * rec.A / rec.tasks) + ' % A' : ''}`;
    return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="4" fill="#2a78d6"><title>${esc(tip)}</title></rect>
      <rect x="${x.toFixed(1)}" y="10" width="${bw.toFixed(1)}" height="${Hh - padB - 10}" fill="transparent"><title>${esc(tip)}</title></rect>
      <text x="${(x + bw / 2).toFixed(1)}" y="${Hh - 4}" font-size="10" fill="#8a83a3" text-anchor="middle">${k}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="Minutter per dag"><line x1="6" x2="${W - 6}" y1="${Hh - padB}" y2="${Hh - padB}" stroke="#e6e0f5"/>${bars}</svg>`;
}
P.openParent = function () {
  const sm = P.summary(), S = sm.strands, L = F.save.learn || {}, items = L.items || {};
  const st = F.save.stats || {}, set = F.save.settings || (F.save.settings = {});
  const box = F.UI.el('div', 'pp');
  const totalMin = Math.round((st.playSec || 0) / 60);
  const fl = P.floors();
  const wd = P.world();
  const ST_NB = { site: 'byggeplass', appeared: 'synlig (ikke funnet)', found: 'funnet', friend: 'venner (Vennskap)' };
  const realmRows = wd.list.slice().sort((a, b) => a.k - b.k).map(r => { const R = F.REALMS && F.REALMS.get ? F.REALMS.get(r.id) : null; let st = 0; try { st = F.RQuest && F.RQuest.stars ? +F.RQuest.stars(r.id) || 0 : 0; } catch (e) { st = 0; }
    const fd = F.save.realm && F.save.realm.found && F.save.realm.found[r.id];
    return `<tr><td>${r.k}</td><td>${esc(R ? R.castle : r.id)}</td><td>${esc(ST_NB[r.state] || r.state || '–')}</td><td>${fd != null ? 'dag ' + esc(fd) : '–'}</td><td>${st} / 3</td></tr>`; }).join('');
  const world = `<h3>Dyrevenner og riker</h3>
    <div class="explain">Dyrevenner får hun ved å svare riktig i 1–3 oppgaver hos et dyr (riktig på første forsøk gir sikker venn). Nye riker dukker opp
      etter 25 riktige svar på første forsøk, når hun har besøkt det nyeste riket. «Funnet» betyr at hun har flydd dit selv; da kan hun reise dit fra kartet.</div>
    <div class="kpis"><div class="kpi"><b>${wd.friends}</b><span>dyrevenner av ${wd.species}</span></div><div class="kpi"><b>${wd.pages}</b><span>fulle albumsider av ${wd.pageN}</span></div>
      <div class="kpi"><b>${wd.legends}</b><span>eventyrdyr sett</span></div><div class="kpi"><b>${wd.kingdoms.appeared}</b><span>riker synlige</span></div>
      <div class="kpi"><b>${wd.kingdoms.found}</b><span>riker funnet</span></div><div class="kpi"><b>${wd.kingdoms.friend}</b><span>riker med Vennskap</span></div></div>
    ${wd.list.length ? `<div class="scroll" style="max-height:260px"><table><tr><th>nr</th><th>slott</th><th>status</th><th>funnet</th><th>stjerner</th></tr>${realmRows}</table></div>` : ''}
    <h4>Nyeste dyrevenner</h4>${wd.names.length ? `<div class="chips">${wd.names.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : '<div class="empty">Ingen ennå.</div>'}`;
  // strands
  const cards = STR.map(d => {
    const s = S[d.id];
    const ladder = Array.from({ length: d.max }, (_, i) => { const r = i + 1; const c = [s.mastered.has(r) ? 'm' : s.prov.has(r) ? 'v' : s.passed.has(r) ? 'p' : '', r === s.rung ? 'c' : ''].join(' ');
      return `<i class="${c}" title="${esc(d.id + ' ' + r + ': ' + d.desc[i] + (s.mastered.has(r) ? ' – mestret' : s.prov.has(r) ? ' – foreløpig bestått' : s.passed.has(r) ? ' – bestått' : ''))}">${r}</i>`; }).join('');
    return `<div class="card"><div class="hd"><span class="nm">${esc(d.name)} <span class="sub">${d.id}</span></span><span class="rg">trinn ${s.rung} · ${['s0', 's1', 's2'][U.clamp(s.sup, 0, 2)]}</span></div>
      <div class="ds">${esc(d.desc[U.clamp(s.rung, 1, d.max) - 1] || '')} – ${esc(SUP[U.clamp(s.sup, 0, 2)])}</div>
      <div class="ladder">${ladder}</div>
      <div class="meta"><span>Bestått <b>${s.passed.size}</b></span><span>Mestret <b>${s.mastered.size}</b></span><span>Foreløpig <b>${s.prov.size}</b></span><span>A siste 20 <b>${pct(s.acc)}</b></span></div>
      ${timeline(d, s, (sm.raw && sm.raw.taskNo) || L.taskNo || 0)}</div>`;
  }).join('');
  // misconceptions
  const tags = sm.tags || {}, tagRows = Object.keys(tags).map(k => [k, tags[k]]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
  const confRows = (sm.conf || []).slice(0, 5);
  // heatmap 10–20 × representation
  const reps = [['T-NAVN', 'navn'], ['T-MENGDE', 'mengde'], ['T-SKRIV', 'skrive'], ['T-ORDEN', 'rekkefølge']];
  const bl = P.bloom();
  const heat = `<table class="heat"><tr><th></th>${Array.from({ length: 11 }, (_, i) => `<th>${10 + i}</th>`).join('')}</tr>${reps.map(([id, nm]) => `<tr><th>${nm}</th>${Array.from({ length: 11 }, (_, i) => {
    const n = 10 + i, b = bl[n][id], it = items[id + ':' + n];
    return `<td class="h" style="background:${SEQ[b]};color:${b >= 4 ? '#fff' : '#2f2748'}" title="${esc(id + ' ' + n + ': boks ' + b + (it ? ', sett ' + (it.n || 0) + ', feil ' + (it.err || 0) : ', ikke sett ennå'))}">${b || ''}</td>`; }).join('')}</tr>`).join('')}</table>
    <div class="legend">${SEQ.map((c, i) => `<span><i style="background:${c}"></i>${i ? 'boks ' + i : 'ikke sett'}</span>`).join('')}</div>`;
  // words
  const wl = [];
  for (const k in items) { const m = /^(LES|SKRIV):(.+)$/.exec(k); if (m) wl.push({ s: m[1], w: m[2], box: +items[k].box || 0, n: +items[k].n || 0, err: +items[k].err || 0 }); }
  const byKey = {}; wl.forEach(x => { byKey[x.s + ':' + x.w] = x; });
  const fromKeys = arr => arr.map(k => byKey[k] || { s: String(k).split(':')[0], w: String(k).split(':').slice(1).join(':'), box: 0, err: 0 });
  const mast = sm.words && sm.words.mastered ? fromKeys(sm.words.mastered) : wl.filter(x => x.box >= 3).sort((a, b) => b.box - a.box);
  const strug = (sm.words && sm.words.struggle ? fromKeys(sm.words.struggle) : wl.filter(x => x.err >= 2 && x.box <= 1)).sort((a, b) => b.err - a.err).slice(0, 30);
  const spont = sm.spont || {}, spRows = Object.keys(spont).map(w => [w, spont[w]]).sort((a, b) => b[1] - a[1]);
  const wl0 = F.save.words || {}, nearMap = wl0.near || {};
  const nearRows = Object.keys(nearMap).map(typed => [typed, nearMap[typed]]).filter(r => r[1] && r[1] !== r[0]);
  const spTotal = spRows.reduce((a, r) => a + (+r[1] || 0), 0);
  const made = P.museum();
  const chips = (arr, f) => arr.length ? `<div class="chips">${arr.map(f).join('')}</div>` : '<div class="empty">Ingen ennå.</div>';
  // last 50
  const log = (sm.log || []).slice(-50).reverse();
  const logRows = log.map(e => { const a = Array.isArray(e) ? e : [e.day, e.taskNo, e.format, e.key, e.outcome, e.ms]; const dd = +a[0] > 5000 ? dmy(+a[0]) : a[0];
    return `<tr><td>${esc(dd)}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td><td>${a[6] != null ? esc(a[6]) + (a[7] != null ? ' · s' + esc(a[7]) : '') : ''}</td><td>${esc(a[8] || '')}</td><td class="o${esc(a[4])}">${esc(a[4])}</td><td>${a[5] != null ? (a[5] / 1000).toFixed(1) + ' s' : ''}</td></tr>`; }).join('');
  const seg = (key, opts, cur) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const bed = set.bedtimeMin != null ? set.bedtimeMin : 25;
  box.innerHTML = `<h2>Foreldreside</h2><div class="sub">Feslottet · dag ${day()} · lagret lokalt i denne nettleseren</div>
    <div class="kpis"><div class="kpi"><b>${day()}</b><span>spilledager</span></div><div class="kpi"><b>${st.sessions || 0}</b><span>økter</span></div><div class="kpi"><b>${totalMin}</b><span>minutter totalt</span></div>
      <div class="kpi"><b>${(sm.raw && sm.raw.taskNo) || L.taskNo || 0}</b><span>oppgaver</span></div><div class="kpi"><b>${F.save.coins || 0}</b><span>mynter nå</span></div>
      <div class="kpi"><b>${fl.tall.n - 1} / ${fl.les.n - 1} / ${fl.skriv.n - 1}</b><span>tårngolv tall / les / skriv</span></div>
      <div class="kpi"><b>${wd.friends} / ${wd.species}</b><span>dyrevenner i albumet</span></div>
      <div class="kpi"><b>${wd.kingdoms.found} / ${wd.kingdoms.total}</b><span>riker funnet (${wd.kingdoms.friend} venner)</span></div></div>
    <h3>Ferdigheter (trinn × støttenivå)</h3>
    <div class="explain"><b>Slik leser du stigene.</b> Hver ferdighet er en stige med trinn fra lett (1) til vanskelig. Spillet flytter henne opp
      når hun klarer et trinn sikkert (riktig på første forsøk mange ganger), og ned ett trinn hvis det blir for vanskelig – det er meningen,
      ikke et tilbakeslag, og tårnene hennes krymper aldri. <b>Støtte</b>: s0 = mye hjelp (bilder, lyder, få valg), s1 = vanlig, s2 = lite hjelp.
      <b>Grønn</b> = bestått, <b>stripet</b> = bestått raskt (sjekkes igjen senere), <b>gull</b> = mestret over tid, <b>ramme</b> = der hun øver nå.
      Kurven under hver stige viser trinnet de siste 14 dagene; røde trekanter er nedtrappinger. «A» betyr riktig på første forsøk.</div>
    <div class="legend"><span><i style="background:#9fd9b4"></i>bestått</span><span><i style="background:repeating-linear-gradient(45deg,#cfeedd 0 3px,#a8dcbd 3px 6px)"></i>foreløpig (hurtigspor, sjekkes)</span><span><i style="background:#f2c94c"></i>mestret</span><span><i style="outline:2px solid #5b3fc4;background:#fff"></i>nå</span><span><i style="background:#2a78d6"></i>trinn over tid</span><span><i style="background:#e34948"></i>nedtrapping</span></div>
    <div class="strands">${cards}</div>
    <h3>10–20 per representasjon (Leitner-boks)</h3>${heat}
    <div class="two"><div><h3>Misoppfatninger</h3>${chips(tagRows, ([k, n]) => `<span>${esc(k)}<b>${n}</b></span>`)}</div>
      <div><h3>Vanligste forvekslinger (mål → svar)</h3>${chips(confRows, ([k, n]) => `<span>${esc(k.replace('>', ' → '))}<b>${n}</b></span>`)}</div></div>
    <div class="two"><div><h3>Ord hun kan sikkert</h3>${chips(mast.slice(0, 60), x => `<span>${esc(x.w)}<b>${x.s === 'LES' ? 'L' : 'S'}</b></span>`)}</div>
      <div><h3>Ord hun strever med</h3>${chips(strug, x => `<span>${esc(x.w)}<b>${x.err}</b></span>`)}</div></div>
    <h3>Ord hun har skrevet selv</h3>
    <div class="explain">Ord hun har funnet på og skrevet i Staven helt uten oppgave${spRows.length ? ` – ${spRows.length} ulike ord, ${spTotal} ganger til sammen` : ''}. Tallet er hvor mange ganger.
      «Nesten riktig» er ord hun skrev med én liten feil; spillet viste da riktig skrivemåte, og hun skrev det på nytt.</div>
    <div class="two"><div><h4>Skrevet riktig</h4>${chips(spRows.slice(0, 80), ([w, n]) => `<span class="sp">${esc(w)}<b>${n}</b></span>`)}</div>
      <div><h4>Nesten riktig (skrev → mente)</h4>${chips(nearRows.slice(-40).reverse(), ([t, m]) => `<span class="nr"><s>${esc(t)}</s> → ${esc(m)}</span>`)}</div></div>
    <h3>Ordmuseet (ting hun har trylla fram)</h3>${chips(made.slice(0, 80), x => `<span>${esc(x.w)}<b>${x.n}</b></span>`)}
    ${world}
    <h3>Tid per dag (siste 14 spilledager)</h3>${dayBars()}
    <h3>Siste 50 oppgaver</h3><div class="scroll"><table><tr><th>dato</th><th>nr</th><th>format</th><th>oppgave</th><th>trinn</th><th>type</th><th>utfall</th><th>tid</th></tr>${logRows || '<tr><td colspan="8" class="empty">Ingen oppgaver ennå.</td></tr>'}</table></div>
    <h3>Innstillinger</h3>
    <div class="set">
      <label>Leggetid</label><div>${seg('bedtimeMin', [[15, '15 min'], [25, '25 min'], [40, '40 min'], [0, 'av']], bed)}</div>
      <label>Andel tall</label><div>${seg('numWeight', [[30, '30 %'], [50, '50 %'], [70, '70 %']], set.numWeight || 50)}</div>
      <label>Bokstaver</label><div>${seg('upper', [['false', 'små'], ['true', 'STORE']], !!set.upper)}</div>
      <label>Lyd</label><div>${seg('sound', [['true', 'på'], ['false', 'av']], set.sound !== false)}</div>
      <label>Musikk</label><div>${seg('music', [['true', 'på'], ['false', 'av']], set.music !== false)}</div>
      <label>Undertekst</label><div>${seg('sub', [['alle', 'alle'], ['korte', 'bare korte'], ['av', 'av']], set.sub || 'alle')}</div>
      <label>I dag</label><div><button class="act" data-act="extend">Forleng i dag (+15 min)</button><span class="note" data-note="extend">${set.extendToday ? 'Forlenget med ' + set.extendToday + ' min i dag.' : ''}</span></div>
      <label>Plassering</label><div><button class="act" data-act="placement">Kjør plassering på nytt</button><span class="note" data-note="placement"></span></div>
      <label>Lagring</label><div><button class="act" data-act="export">Eksporter (fil)</button><button class="act" data-act="import">Importer …</button><input type="file" accept=".json,application/json" style="display:none" data-file="1"><span class="note" data-note="io"></span></div>
      <label>Nullstill</label><div><button class="act danger" data-act="reset"><span class="fill"></span>Hold inne 2 s for å slette alt</button></div>
    </div>`;
  document.body.classList.add('parent-open');
  const h = F.UI.open(box, { cls: 'parent', onClose: () => document.body.classList.remove('parent-open') });
  const note = (k, t) => { const n = box.querySelector(`[data-note="${k}"]`); if (n) n.textContent = t; };
  box.querySelectorAll('.seg').forEach(sg => sg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    const key = sg.dataset.key; let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : (isNaN(+v) ? v : +v);   // lead v3: string settings (sub)
    set[key] = v;
    if (key === 'sound' || key === 'music') { if (F.audioSettings) F.audioSettings[key] = v; if (F.audio && F.audio.apply) F.audio.apply(); }
    if (key === 'upper' && F.UI.labels) F.UI.labels.forEach(L => L.set(L.raw));
    if (key === 'numWeight' && F.LEARN.setNumWeight) { try { F.LEARN.setNumWeight(v); } catch (er) { console.error(er); } }
    sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    F.store(); F.emit('settings', key, v);
  }));
  box.querySelectorAll('.act').forEach(b => {
    const act = b.dataset.act;
    if (act === 'reset') {
      let t = null;
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('hold'); t = setTimeout(() => { try { localStorage.removeItem('feslottet_v1'); } catch (er) {} F.store = function () {}; location.reload(); }, 2000); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { b.classList.remove('hold'); if (t) clearTimeout(t); t = null; }));
      return;
    }
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (act === 'extend') { const m = F.Day && F.Day.extend ? F.Day.extend(15) : 0; note('extend', 'Forlenget med ' + (m || set.extendToday || 15) + ' min i dag.'); }
      else if (act === 'placement') {
        const fn = F.LEARN.replace || F.LEARN.rerunPlacement || F.LEARN.placement;
        if (typeof fn === 'function') { try { fn.call(F.LEARN); F.store(); note('placement', 'Plasseringen starter på nytt ved neste oppgave.'); } catch (er) { note('placement', 'Feil: ' + er.message); } }
        else { F.save.learn = F.save.learn || {}; F.save.learn.rerunPlacement = true; F.store(); note('placement', 'Merket – motoren kjører plassering ved neste oppgave.'); }
      } else if (act === 'export') {
        F.store(true);
        const blob = new Blob([JSON.stringify(F.save, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'feslottet-lagring-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        note('io', 'Lagret som fil.');
      } else if (act === 'import') box.querySelector('[data-file]').click();
    });
  });
  box.querySelector('[data-file]').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { const o = JSON.parse(rd.result); if (!o || o.v !== 1) throw new Error('ikke en Feslottet-lagring'); F.save = o; F.store(true); location.reload(); }
      catch (er) { note('io', 'Kunne ikke lese filen: ' + er.message); }
    };
    rd.readAsText(f);
  });
  F.emit('parentOpen');
  return h;
};
})();
