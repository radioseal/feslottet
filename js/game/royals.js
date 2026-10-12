/* Feslottet – WP7 ROYALS: the kingdom families (DESIGN2 §3.9). Owner WP7. Data: js/data/realms.js (F.REALMS), lines: js/speech/lines_royals.js.
   F.Royals = {
     spawn(realmId) -> [actors]      the king, queen and child of a kingdom (F.Act actors 'r_<id>_k|q|c', royal:<id>, cvoice:null)
     despawn(realmId)                removes them (deferred while their greeting runs)
     actor(realmId, 'k'|'q'|'c')     -> actor | null
     all()                           -> every spawned royal actor
     press(actor) -> Promise         tap routing: F.RQuest.offer(actor) → free task (F.Task.offer, narrator prompts) → a royal line
     greet(realmId) -> Promise       first-arrival ceremony: trumpet, the family walks out to her, «Her bor …», «Velkommen til …!»,
                                     «Jeg er …!» ×3, then emits royalsGreeted(realmId) (WP8 starts RQ1 on it)
     postPos(post, idx) -> pos       {realm, spot:'throne'|'gate'|'garden'|'market'} → {space, x, z, bld?, f?, room?} (used by F.Act.postPos)
     sayLife(actor, lifeId)          the royal stand-in for a life_* reaction line (royals never use life_*)
   }
   Events in:  realmLoaded(id) → spawn, realmUnloaded(id) → despawn, realmFound(id) → greet.  Out: royalsSpawned(id), royalsGreeted(id).
   Positions come from F.Realm.spot(id, name) (WP3); fallbacks from F.Realm.door/gate/get. King and queen stand in the throne room
   ('throne', 'throne2'); the child roams the garden and the market. When the interior plan is not available they wait by the keep door.
   Quirk idles (per kingdom, data quirk.anim): flowerTalk bubbles pony shellCount crumbs tralala starGaze snore polish rainbow.
   Debug (in F.on('ready')): F.dbg.royalsHere(id) spawns a family next to her outdoors; F.dbg.royalGreet(id).
   v3 (DESIGN3 §7, WP4): press = never ignore a tap (busy / greeting / chain running → Roy.ack: face, wave, pop, chime + a.tapQueued,
   answered ≤ 15 s later) → «Hei igjen» once per visit → F.RQuest.offer → point to the family member who holds the step (rq_g_vent_*)
   → king/queen audience (3 tasks, rotating strands, realm words preferred; 2–3 A → roy_g_klok +15, else roy_g_ove +5; one per royal per
   10 min) or one realm task with the royal's ask line (roy_a_<realm>_k|q|c; the king counts KING_COUNT[realm]) → play break roy_g_lek.
   Royals call her (Roy.callHer: roy_g_oppgave once per 90 s + bubble jump; first time per kingdom «Trykk på kongen!»), own lines
   roy_o_<realm>_k|q (press / ambient / after an audience), «Kongen venter i rom {n}!» on entering a keep (Roy.romCall; F.Bld.quietRooms).
   Events out: royalQueued(id) royalDequeued(id) royalCalls(id) royalAudience(id, on, outcomes) royalTask(id, n, outcome)
   royalRoom(realm, n, 'call'|'found'), activity('royal', on).
   v5c WP-Q (DESIGN5 §10, SYNTHESIS §4.5): the audience's first task is the kingdom's specialty (Roy.specItem via F.Quest.slotItem)
   when it serves her level, the other two the engine's free mix (no fixed LES / T-MENGDE / SKRIV rotation); a single task is the
   specialty ≈ 40 %, the royal's own flavour (king counts his realm thing, queen reads, child writes – only on her level) ≈ 25 %, else
   the engine's mix; the ask line is chosen after the item (a specialty without an own ask line: rq_s_<format>, lines_rq.js). The
   audience's consolation coins (5) need ≥ 1 first-try answer (guessing never pays). */
(function () {
'use strict';
const F = window.F, U = F.U;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const WHO = { k: 'king', q: 'queen', c: 'child' };
const SPEED = { k: 2.0, q: 2.1, c: 2.6 };
const Roy = F.Royals = {
  real: true, spawned: {}, greeting: {}, pending: new Set(), dropAfterGreet: new Set(), ambInTest: false, here: {},
};
const realm = id => (F.REALMS && F.REALMS.get ? F.REALMS.get(id) : null);
const rlm = () => (F.Realm && typeof F.Realm.spot === 'function' ? F.Realm : null);
const call = (fn, ...a) => { try { return fn ? fn(...a) : null; } catch (e) { console.warn('[Royals]', e); return null; } };

/* ---------------------------------------------------------- positions */
// keep door / gate / castle centre of a kingdom (outdoors)
function anchorsOf(id) {
  if (Roy.testAnchor && Roy.testAnchor[id]) return Roy.testAnchor[id];   // F.dbg.royalsHere
  const R = F.Realm || {};
  const door = call(R.door && R.door.bind(R), id), gate = call(R.gate && R.gate.bind(R), id);
  let c = call(R.get && R.get.bind(R), id);
  if (!c || c.x == null) { const l = call(R.list && R.list.bind(R)) || []; c = l.find(x => x && x.id === id) || null; }
  const d = door && door.x != null ? door : (c && c.x != null ? { x: c.x, z: c.z + 9 } : (gate && gate.x != null ? { x: gate.x, z: gate.z - 16 } : null));
  const g = gate && gate.x != null ? gate : (d ? { x: d.x, z: d.z + 20 } : null);
  return d ? { door: d, gate: g } : null;
}
const OUT_OFF = { throne: [-1.6, 2.6], throne2: [1.6, 2.6], garden: [-10, 7], market: [3.5, 11], gate: [0, 0] };
function outdoorFallback(id, spot, idx) {
  const A = anchorsOf(id); if (!A) return null;
  const base = spot === 'gate' ? A.gate : A.door, o = OUT_OFF[spot] || [0, 3];
  const j = (idx || 0) * 1.4;
  const x = base.x + o[0] + (spot === 'gate' ? j - 1.4 : 0), z = base.z + o[1];
  const f = F.Act && F.Act.freeSpot ? F.Act.freeSpot(x, z, 'out') : { x, z };
  return { space: 'out', x: f.x, z: f.z, fallback: true };
}
function planOk(bld) {
  if (!bld) return true;
  if (!(F.Act && F.Act.bldReal && F.Act.bldReal())) return false;
  return !!(F.Bld.plan && F.Bld.plan(bld));
}
Roy.postPos = function (post, idx) {
  const id = post.realm, spot = post.spot || 'garden';
  if (Roy.testAnchor && Roy.testAnchor[id]) return outdoorFallback(id, spot, idx);
  const R = rlm();
  let s = R && spot !== 'throne2' ? call(R.spot.bind(R), id, spot) : null;
  if (!s && spot === 'throne2' && R) {   // the queen: the throne room's second stand spot (or 1.8 m beside the king)
    const t = call(R.spot.bind(R), id, 'throne');
    if (t) {
      const bs = t.space === 'in' && t.bld && F.Bld && F.Bld.spot && t.room ? call(F.Bld.spot.bind(F.Bld), t.bld, t.room, 1) : null;
      s = bs && bs.x != null ? Object.assign({}, t, { x: bs.x, z: bs.z }) : Object.assign({}, t, { x: t.x + 1.8 });
    }
  }
  if (s && s.x != null) {
    const space = s.space || (s.bld ? 'in' : 'out');
    if (space === 'in' && !planOk(s.bld)) return outdoorFallback(id, spot, idx);
    const p = { space, x: s.x, z: s.z, bld: s.bld || null, f: s.f != null ? s.f : 0, room: s.room || null };
    if (space === 'out' && F.Act && F.Act.freeSpot) Object.assign(p, F.Act.freeSpot(p.x + (idx || 0) * 0.3, p.z, 'out'));
    return p;
  }
  return outdoorFallback(id, spot, idx);
};
const postsFor = (id, who) => who === 'k' ? [{ realm: id, spot: 'throne' }] : who === 'q' ? [{ realm: id, spot: 'throne2' }] : [{ realm: id, spot: 'garden' }, { realm: id, spot: 'market' }];

/* ---------------------------------------------------------- spawn / despawn */
Roy.spawn = function (id) {
  const r = realm(id); if (!r || !F.Act || !F.Act.spawn) return [];
  if (!F.booted) { Roy.pending.add(id); return []; }
  Roy.dropAfterGreet.delete(id);
  const out = [];
  ['k', 'q', 'c'].forEach((who, i) => {
    const d = r[WHO[who]];
    let a = F.Act.byId(d.id);
    if (!a) {
      const posts = postsFor(id, who);
      const p = Roy.postPos(posts[0], i);
      if (!p) return;
      a = F.Act.spawn(d.id, { name: d.name, role: d.role, voice: d.voice, cvoice: null, look: Object.assign({ def: 'ch_royal' }, d.look),
        posts, home: p, royal: id, noTasks: true, speed: SPEED[who] });
      if (!a) return;
      a.who = who; a.realmId = id; a.quirk = r.quirk && r.quirk.who === who ? r.quirk.anim : null; a.postI = 0;
      a.atFallback = !!p.fallback; a.nextMove = 30 + i * 11;
      a.face(a.x, a.z + 5);
      // the king sits on his throne while she is in his throne room (Snorre already naps there: actors.js ACTS)
      if (who === 'k' && F.Act.ACTS && !F.Act.ACTS[d.id]) F.Act.ACTS[d.id] = { kind: 'throne', near: 'c_trone', r: 9 };
      if (a.quirk === 'pony') addPony(a);
    }
    out.push(a);
  });
  Roy.spawned[id] = out;
  F.emit('royalsSpawned', id);
  return out;
};
Roy.despawn = function (id) {
  if (Roy.greeting[id]) { Roy.dropAfterGreet.add(id); return; }
  Roy.pending.delete(id);
  const r = realm(id); if (!r) return;
  for (const who of ['k', 'q', 'c']) {
    const a = F.Act.byId(r[WHO[who]].id); if (!a) continue;
    if (a.pony && a.pony.parent) a.pony.parent.remove(a.pony);
    F.Act.remove(a);
  }
  delete Roy.spawned[id]; delete Roy.visit[id];
};
Roy.actor = (id, who) => { const r = realm(id); return r && WHO[who] ? F.Act.byId(r[WHO[who]].id) : null; };
Roy.all = () => (F.Act && F.Act.list ? F.Act.list.filter(a => a.royal) : []);

F.on('realmLoaded', id => { try { Roy.spawn(id); } catch (e) { console.error('[Royals] spawn', id, e); } });
F.on('realmUnloaded', id => { try { Roy.despawn(id); } catch (e) { console.error('[Royals] despawn', id, e); } });
F.on('realmFound', id => { try { Roy.greet(id); } catch (e) { console.error('[Royals] greet', id, e); } });
// entering a kingdom's keep: the king and queen are on their thrones (they may have waited by the door while the plan was not built)
F.on('bldEntered', bid => {
  const id = typeof bid === 'string' && bid.indexOf('rk_') === 0 ? bid.slice(3) : null; if (!id || !realm(id)) return;
  if (!Roy.spawned[id]) Roy.spawn(id);
  for (const who of ['k', 'q']) {
    const a = Roy.actor(id, who); if (!a || a.busy || Roy.greeting[id]) continue;
    const p = Roy.postPos(postsFor(id, who)[0], 0);
    if (p && p.space === 'in') { a.place(p.space, p.x, p.z, p.room, p); a.atFallback = false; a.greetHold = 0; a.face(a.x, a.z + 5); }
  }
  F.T.timeout(() => { try { romCall(id); } catch (e) { console.warn('[Royals] romCall', e); } }, 2500);
});
/* ---------------------------------------------------------- v3 §7.8 «Kongen venter i rom {n}!» (P2)
   Entering a kingdom's keep (≥ 5 min since the last call there, no task, no chain running, not in the play break): the king goes to one of
   the castle's numbered rooms (not the hall, not the room she is in) and the narrator says rk_rom_kom; walking into that room is the
   answer (roomEntered) → «Her er rom {n}!» (bld_rom) as confirmation + the king's welcome. The automatic number line on every room entry
   is off in royal castles (F.Bld.quietRooms, WP1). Gives up after 3 min (he walks back to his throne by his schedule). */
// v5 WP-X (#26, #46): never within 60 s of a royal quest step / audience / greeting (no «Kongen venter i rom 3!» right after «Tusen takk
// for hjelpen!»); never while the king stands in her room or within 16 m of her (he is moved only while unseen); the castle's rooms
// carry natural numbers (realm.js: 1–4 along the floor), any numbered room may be called.
const ROM_COOL = 300, ROM_MAX = 180, ROM_QUIET = 60;
Roy.rom = null; Roy.romT = {}; Roy.lastActT = -1e9;
F.on('rqStep', () => { Roy.lastActT = F.T.now; });
F.on('rqDone', () => { Roy.lastActT = F.T.now; });
F.on('royalAudience', () => { Roy.lastActT = F.T.now; });
F.on('royalsGreeted', () => { Roy.lastActT = F.T.now; });
F.on('taskEnd', () => { if (F.Bld && typeof F.Bld.cur === 'string' && F.Bld.cur.indexOf('rk_') === 0) Roy.lastActT = F.T.now; });
function romCall(id) {
  const B = F.Bld, bid = 'rk_' + id;
  if (Roy.rom || !B || B.cur !== bid || (F.flags.test && !Roy.schedInTest) || !F.TPL.has('rk_rom_kom')) return false;
  if (F.T.now - (Roy.romT[id] != null ? Roy.romT[id] : -1e9) < ROM_COOL || F.Task.current || rqBusy(id) || !canTask() || Roy.greeting[id]) return false;
  if (F.T.now - Roy.lastActT < ROM_QUIET || Object.values(Roy.audT).some(t => F.T.now - t < ROM_QUIET)) return false;
  const act = F.save.rq && F.save.rq.active ? F.save.rq.active[id] : null;
  if (act && F.RQuest && F.RQuest.holder) { const h = F.RQuest.holder(id); if (h && h.who !== 'k') return false; }   // another family member's step first
  const K = Roy.actor(id, 'k'), plan = B.plan ? B.plan(bid) : null;
  if (!K || K.busy || K.tapQueued || !plan || !plan.cells) return false;
  const P0 = F.Player.pos, seen = K.space === 'in' && (K.room === B.roomKey || Math.hypot(K.x - P0.x, K.z - P0.z) < 16);
  const cur = B.roomKey, all = plan.cells.filter(c => c.num != null && c.key !== cur && c.key !== 'inngang');
  const cells = all.filter(c => c.key !== 'tronsal').length ? all.filter(c => c.key !== 'tronsal') : all;   // not his usual throne room
  if (!cells.length) return false;
  const c = U.pick(F.rand, cells), sp = B.spot ? B.spot(bid, c.key, 0) : null;
  if (!sp || sp.x == null) return false;
  if (K.act && F.Act.stopAct) F.Act.stopAct(K, true);
  const put = () => { K.place('in', sp.x, sp.z, c.key, { bld: bid, f: c.f || 0 }); K.face(K.x, K.z + 5); };
  // in plain sight he walks there (no jump between rooms in front of her); out of sight he is simply there
  if (seen && K.walkTo) K.walkTo(sp.x, sp.z, { always: true }).then(okk => { if (!okk || Math.hypot(K.x - sp.x, K.z - sp.z) > 1.5) put(); else K.face(K.x, K.z + 5); }).catch(put);
  else put();
  K.greetHold = F.T.now + ROM_MAX;
  Roy.rom = { realm: id, n: c.num, key: c.key, bld: bid, t: F.T.now }; Roy.romT[id] = F.T.now;
  F.emit('royalRoom', id, c.num, 'call');
  F.SAY('rk_rom_kom', { n: c.num }, '');
  return true;
}
Roy.romCall = romCall;
F.on('roomEntered', rid => {
  const r = Roy.rom; if (!r) return;
  if (F.T.now - r.t > ROM_MAX || (F.Bld && F.Bld.cur !== r.bld)) { Roy.rom = null; return; }
  if (rid !== r.bld + ':' + r.key) return;
  Roy.rom = null; Roy.pressT = F.T.now;
  const K = Roy.actor(r.realm, 'k');
  F.emit('royalRoom', r.realm, r.n, 'found');
  (async () => {
    if (F.sfx.chime) F.sfx.chime();
    if (F.TPL.has('bld_rom')) await F.SAY('bld_rom', { n: r.n }, '');
    if (K && K.space === 'in' && !K.busy) { K.facePlayer(); K.gesture('cheer', 1.4); if (F.Act.hearts) F.Act.hearts(K.headPos()); await sayRoy(K, 'roy_g_fint'); K.greetHold = F.T.now + 40; }
  })().catch(e => console.warn('[Royals] rom', e));
});
F.on('bldLeft', () => { Roy.rom = null; });

F.on('ready', () => {
  // v3 §7.8: no automatic «Her er rom {n}!» in royal castles (WP1 honours plan.quietRooms / F.Bld.quietRooms)
  if (F.Bld && F.Bld.quietRooms == null) F.Bld.quietRooms = P => !!(P && P.kind === 'kongeslott');
  for (const id of [...Roy.pending]) { Roy.pending.delete(id); try { Roy.spawn(id); } catch (e) { console.error('[Royals] spawn', id, e); } }
  F.dbg = F.dbg || {};
  // spawn a family next to her outdoors (gallery / demo): anchors the kingdom 6 m north of her when F.Realm does not know it
  F.dbg.royalsHere = (id, dx, dz) => {
    const P = F.Player.pos; Roy.testAnchor = Roy.testAnchor || {};
    Roy.testAnchor[id] = { door: { x: P.x + (dx || 0), z: P.z - 9 + (dz || 0) }, gate: { x: P.x + (dx || 0), z: P.z - 2 + (dz || 0) } };
    Roy.despawn(id); const list = Roy.spawn(id); F.debug && F.debug.frames && F.debug.frames(2); return list.map(a => a.id);
  };
  F.dbg.royalGreet = id => Roy.greet(id);
});

/* ---------------------------------------------------------- speech helpers */
const LIFE_MAP = { life_nam: 'roy_g_nam', life_fin: 'roy_g_pen', life_gøy: 'roy_g_gøy', life_søt: 'roy_g_glad', life_sitte: 'roy_g_takk', life_lukt: 'roy_g_glad',
  life_varm: 'roy_g_takk', life_lys: 'roy_g_pen', life_takk: 'roy_g_takk', life_hei: 'roy_g_hei' };
// v3: the cheer after a task (stage → react('cheer') → life_takk) varies (no-repeat per royal), so an audience is not «Tusen takk!» ×3
const CHEER = ['roy_g_takk', 'roy_g_hurra', 'roy_g_glad'];
Roy.sayLife = (a, lifeId) => {
  let id = LIFE_MAP[lifeId] || 'roy_g_takk';
  // the stage's cheer at the end of a task: when the stage praises in this royal's own voice (WP7 core_praise_npc) the royal only
  // cheers (gesture + hearts) – one royal line per task, not «Tusen takk!» + «Så flink du er!»
  const T = F.Task.current;
  if (id === 'roy_g_takk' && T && (T.npc === a || (T.ctx && T.ctx.npc === a)) && praiseInVoice(a)) { a.gesture('cheer', 1.2); if (F.Act.hearts) F.Act.hearts(a.headPos()); return F.T.sleep(300); }
  if (id === 'roy_g_takk') { const pool = CHEER.filter(x => x !== a._cheer); id = a._cheer ? U.pick(F.rand, pool) : 'roy_g_takk'; a._cheer = id; }
  return sayRoy(a, id);
};
function sayRoy(a, id) {
  if (!id || !F.TPL.has(id)) return F.T.sleep(200);
  const t = F.TPL.all[id];
  if (!t.voices.includes(a.voice)) return F.T.sleep(200);   // never an undeclared voice
  Roy.talkT = F.T.now;
  if (/takk/.test(id)) { if (id === 'roy_g_takk' && a._takkT > F.T.now - 2) return F.T.sleep(100); a._takkT = F.T.now; }   // v3 P3: one thanks
  // Kong Pål sings «Tra-la-la!» before he talks (not before his own tra-la-la lines)
  if (a.quirk === 'tralala' && !/^roy_q_/.test(id) && F.TPL.has('roy_tralala') && !(a._traT > F.T.now)) {
    a._traT = F.T.now + 20;
    return a.say('roy_tralala', null, { still: true }).then(() => a.say(id, null, { still: true }));
  }
  return a.say(id, null, { still: true });
}
Roy.say = sayRoy;
function quirkLine(a) {
  const r = realm(a.royal); if (!r || !r.quirk) return null;
  if (a.who === 'c' && r.quirk.who !== 'c') return r.quirk.child;
  if (a.who === r.quirk.who) return U.pick(F.rand, r.quirk.lines);
  return null;
}

/* ---------------------------------------------------------- v3 (DESIGN3 §7): tap routing – never ignore a tap, audiences, ask lines */
const ROY_FORMATS_EX = ['F01', 'F02', 'F12', 'F26'];     // lift / village doors / shop pay / signpost: not in a royal audience
const COUNT_FMTS = ['F06', 'F08', 'F09'];                  // T-MENGDE formats that count params.model (the king's «telle …» line)
// the king's countable realm thing (his ask line names it; used only when the model exists)
const KING_COUNT = { blomst: 'rose', hest: 'eple', boble: 'and', skjell: 'skjell', kake: 'kake', musikk: 'bjelle', stjerne: 'stjerne', sno: 'lue', krystall: 'krystall', regnbue: 'blomst' };
Roy.KING_COUNT = KING_COUNT;
const AUD = { k: [['LES'], ['T-MENGDE', 'T-ORDEN'], ['SKRIV']], q: [['T-MENGDE'], ['LES'], ['T-ORDEN']] };
const AUD_COOL = 600;                                       // one audience per royal per 10 min (game seconds)
Roy.audT = {};                                              // royal id -> F.T.now of the last audience
Roy.queueS = 15;
Roy.visit = {};                                             // realm -> {greeted: bool, igjen: {who: true}} for this load of the kingdom
const rqBusy = id => !!(F.RQuest && (F.RQuest.busyFor ? F.RQuest.busyFor(id) : F.RQuest.busy));
const canTask = () => !F.Quest || !F.Quest.canOfferTask || F.Quest.canOfferTask();
const speaking = () => !!(F.Speech && F.Speech.busy && F.Speech.busy());
const seated = a => !!(a.act && a.act.sit);
// instant feedback for a tap that cannot be answered right now (a chain runs, the greeting, she is mid-speech): face her, wave,
// pop, a soft chime – and remember the tap; the queue tick answers it when the royal is free (≤ 15 s)
function ack(a) {
  try {
    if (!seated(a)) a.facePlayer();
    a.gesture('wave', 1.0); F.FX.pop(a.model);
    if (F.sfx.bell) F.sfx.bell(1318); else if (F.sfx.pop) F.sfx.pop();
    pulse(a);
  } catch (e) { console.warn('[Royals] ack', e); }
  a.tapQueued = F.T.now;
  F.emit('royalQueued', a.id);
  return 'queued';
}
Roy.ack = ack;
// the gold bubble gives a little jump (Web Animations; no stylesheet needed)
function pulse(a) {
  const el = a && a.bubbleEl; if (!el || !el.animate || el.style.display === 'none') return;
  // (the 'scale' property composes with the per-frame translate transform the bubble is positioned by)
  try { el.animate([{ scale: '1', filter: 'brightness(1)' }, { scale: '1.25', filter: 'brightness(1.35)' }, { scale: '1', filter: 'brightness(1)' }], { duration: 650, iterations: 2 }); } catch (e) { /* old engine */ }
}
Roy.pulse = pulse;
const ownLine = a => { const id = 'roy_o_' + a.royal + '_' + a.who; return F.TPL.has(id) ? id : null; };
Roy.ownLine = ownLine;
const askLine = a => { const id = 'roy_a_' + a.royal + '_' + a.who; return F.TPL.has(id) ? id : null; };
// all task formats a royal can use here (resolvable, not tied to a place she is not at)
function royalFormats() { return Object.keys(F.Task.defs || {}).filter(f => /^F\d\d$/.test(f) && !ROY_FORMATS_EX.includes(f) && F.Task.resolveFormat && F.Task.resolveFormat(f)); }
function preferOf(id) { const r = realm(id); return r && r.words ? r.words.map(w => 'LES:' + w).concat(r.words.map(w => 'SKRIV:' + w)) : undefined; }
function nextItem(a, formats, strands) {
  if (!F.LEARN || !F.LEARN.next) return null;
  const avail = formats.filter(f => F.Task.resolveFormat(f)); if (!avail.length) return null;
  try {
    return F.LEARN.next({ formats: avail, strands, prefer: preferOf(a.royal), npcRole: a.role, npc: a.id, rng: F.rand, now: Date.now(),
      avoid: (F.Task.recent || []).filter(r => r.npc === a.id).slice(-3).map(r => r.format), last: ((F.Task.recent || []).slice(-1)[0] || {}).format || null });
  } catch (e) { console.warn('[Royals] LEARN.next', e); return null; }
}
Roy.nextItem = nextItem;
// the model id that really exists (f_num's thingFor needs a VOX id: 'stjerne' only exists as the counting piece 'fx_n_stjerne')
const countModel = id => { const m = KING_COUNT[id]; return !m || !F.VOX ? null : F.VOX.has(m) ? m : F.VOX.has('fx_n_' + m) ? 'fx_n_' + m : null; };
// v5c WP-Q: the kingdom's specialty formats (F.Quest.SPEC, SYNTHESIS §4.5) as one item at her level (F.Quest.slotItem), else null
const SPEC_P = 0.4, ROLE_P = 0.25;
Roy.SPEC_P = SPEC_P;
function specItem(a) {
  const sp = F.Quest && F.Quest.SPEC ? F.Quest.SPEC[a.royal] : null;
  if (!sp || !sp.length || !F.Quest.slotItem) return null;
  try {
    const it = F.Quest.slotItem({ formats: sp, wide: false }, { npc: a }, {});
    const last = ((F.Task.recent || []).slice(-1)[0] || {}).format;
    if (!it || it.format === last) return null;                       // never the same task twice in a row: the engine's mix instead
    it.spec = true; Roy.specN = (Roy.specN || 0) + 1; return it;
  } catch (e) { console.warn('[Royals] spec', e); return null; }
}
Roy.specItem = specItem;
// run one task for this royal (the narrator prompts, the royal is the giver)
async function royalTask(a, item, formats) {
  const ctx = { npc: a, thing: a.th, royal: true };
  if (item && F.Task.resolveFormat(item.format)) return F.Task.run(item, ctx);
  return F.Task.offer({ formats, ctx });
}
// she is told who has the next step (another family member holds it): the royal says it, turns there, the star marks him/her
const TRYKK = { k: 'rq_n_trykk_k', q: 'rq_n_trykk_q' };
const childTrykk = id => { const r = realm(id); return r && r.child && r.child.title === 'Prinsesse' ? 'rq_n_trykk_ps' : 'rq_n_trykk_p'; };
async function pointTo(a, h) {
  const o = Roy.actor(a.royal, h.who);
  if (o && o !== a && o.space === a.space) {
    a.face(o.x, o.z);
    if (F.Quest && F.Quest.mark && (!F.Quest.marked || !F.Quest.marked())) { F.Quest.mark(o.th); F.T.timeout(() => { if (F.Quest.marked && F.Quest.marked() === o.th) F.Quest.mark(null); }, 10000); }
    pulse(o);
  }
  if (h.who === 'c' && h.qid === 'RQ1') { await sayRoy(a, 'rq_g_vent_c'); if (F.RQuest.armGate) F.RQuest.armGate(a.royal); }
  // v5 (#57): the kingdom's child says «Mamma / Pappa trenger hjelp nå» about its own parents
  else if (h.who === 'q') await sayRoy(a, a.who === 'c' && F.TPL.has('rq_g_vent_q_b') ? 'rq_g_vent_q_b' : 'rq_g_vent_q');
  else if (h.who === 'k') await sayRoy(a, a.who === 'c' && F.TPL.has('rq_g_vent_k_b') ? 'rq_g_vent_k_b' : 'rq_g_vent_k');
  else if (h.who === 'c') {   // «Prinsessen trenger hjelp nå. Gå til henne!» in the parent's own voice (narrator «Trykk på …» as fallback)
    a.gesture('wave', 1.2);
    const id = childTrykk(a.royal) === 'rq_n_trykk_ps' ? 'rq_g_vent_ps' : 'rq_g_vent_p';
    if (F.TPL.has(id) && F.TPL.all[id].voices.includes(a.voice)) await sayRoy(a, id); else await F.SAY(childTrykk(a.royal), {}, '');
  }
  else if (h.step && h.step.hint) await F.SAY(h.step.hint, {}, '');
}
Roy.press = async function (a) {
  if (!a) return;
  const id = a.royal;
  // §7.2 never ignore a tap: busy (her own chain step, the greeting, a running chain in this kingdom) → feedback + queue
  if (a.busy || Roy.greeting[id] || rqBusy(id) || F.Task.current) return ack(a);
  if (a.act && F.Act.stopAct) F.Act.stopAct(a);   // the king stands up from his throne to talk to her (Snorre wakes up)
  a.busy = true; a.awakeT = F.T.now + 12; a.quirkPause = F.T.now + 6; a.tapQueued = 0; Roy.pressT = F.T.now;
  let handedOver = false;
  try {
    a.facePlayer(); F.FX.pop(a.model);
    const V = Roy.visit[id] || (Roy.visit[id] = { greeted: false, igjen: {} });
    // the first tap of a visit (not right after the first-arrival greeting): «Hei igjen, lille fe!»
    const rs = F.Realm && F.Realm.save ? F.Realm.save() : null, met = !!(rs && rs.found && rs.found[id] != null);   // she has met them before
    if (met && !V.greeted && !V.igjen[a.who]) { V.igjen[a.who] = true; a.gesture('wave', 1.2); await sayRoy(a, 'roy_g_igjen'); }
    // 1. a royal quest step (this royal's)
    let q = null;
    if (F.RQuest && F.RQuest.offer) { try { q = F.RQuest.offer(a); if (q && typeof q.then === 'function') q = await q; } catch (e) { console.error('[Royals] RQuest.offer', e); q = null; } }
    if (q === 'wait') { a.busy = false; return ack(a); }
    if (q) return;
    // 2. another family member holds the next step → point there (once a minute per royal; a 2nd tap gets a task)
    const h = F.RQuest && F.RQuest.holder ? F.RQuest.holder(id) : null;
    if (h && h.who !== a.who && !(a._pointT > F.T.now - 60)) { a._pointT = F.T.now; await pointTo(a, h); return; }
    // 3. tasks: an audience (king/queen, 3 tasks) or one realm-flavoured task; during the play break: «Lek litt først …»
    if (!F.Task.current && canTask()) {
      handedOver = true;
      if ((a.who === 'k' || a.who === 'q') && !(F.T.now - (Roy.audT[a.id] != null ? Roy.audT[a.id] : -1e9) < AUD_COOL)) await audience(a);
      else await singleTask(a);
      return;
    }
    // 4. a royal line: her own line / quirk / play break
    a.gesture(F.rand() < 0.5 ? 'wave' : 'nod', 1.2);
    if (!canTask()) { await sayRoy(a, 'roy_g_lek'); return; }
    const ql = quirkLine(a), ol = ownLine(a);
    await sayRoy(a, U.pick(F.rand, [ql, ol].filter(Boolean).concat(['roy_g_hei', 'roy_g_fint'])));
  } catch (e) { console.error('[Royals.press]', a && a.id, e); }
  finally { a.busy = false; Roy.pressT = F.T.now; void handedOver; }
};
F.on('taskEnd', () => { Roy.taskEndT = F.T.now; });
// one realm-flavoured task: the item is picked first so the ask line can fit it (king counts realm things, queen reads, child writes)
async function singleTask(a) {
  const fm = royalFormats();
  const want = a.who === 'k' ? ['T-MENGDE'] : a.who === 'q' ? ['LES'] : ['SKRIV'];
  // v5c WP-Q (SYNTHESIS §4.5): ≈ 40 % of a kingdom's single tasks come from its specialty formats (when they serve her level), ≈ 25 %
  // keep the royal's own flavour (the king counts his realm thing, the queen reads, the child writes – only when that is ON her level),
  // the rest is the engine's free mix over every format (any strand, debt-driven); the ask line is chosen AFTER the item
  let item = null, ask = null;
  const u = F.rand();
  if (u < SPEC_P) item = specItem(a);
  if (!item && u < SPEC_P + ROLE_P) {
    item = nextItem(a, a.who === 'k' ? COUNT_FMTS : fm, want);
    if (item && a.who === 'k') {
      const m = countModel(a.royal);
      if (m && COUNT_FMTS.includes(item.format) && !item.offLevel) { item.params = Object.assign({}, item.params || {}, { model: m }); ask = askLine(a); }
      else item = null;
    } else if (item && !item.offLevel && want.includes(item.strand)) ask = askLine(a);
    else item = null;
  }
  if (!item) { item = nextItem(a, fm, undefined); ask = null; if (item && item.offLevel) { const rep = fm.filter(f => (a.repertoire || []).includes(f)); const i2 = nextItem(a, rep.length ? rep : fm, undefined); if (i2) item = i2; } }
  F.emit('activity', 'royal', true);
  try {
    a.gesture('wave', 1.2);
    // §7.5 a little talk first now and then: her own line before the ask («Jeg plukker blomster …» → «Kan du telle rosene …?»)
    const ol = ownLine(a) || quirkLine(a);
    if (ol && F.rand() < 0.4 && !(a._olT > F.T.now - 120)) { a._olT = F.T.now; await sayRoy(a, ol); }
    // v5c WP-Q: a specialty / mix item without the royal's own ask line: the giver names what she helps with (rq_s_<format>)
    const sl = !ask && item && F.RQuest && F.RQuest.specLine ? F.RQuest.specLine(item.format) : null;
    await sayRoy(a, ask || sl || 'roy_g_hjelp');
    a.busy = false;
    const res = await royalTask(a, item, fm);
    if (res && res.outcome === 'A' && a.here && a.here() && !praiseInVoice(a)) await sayRoy(a, 'roy_g_riktig');
    return res;
  } finally { F.emit('activity', 'royal', false); }
}
Roy.singleTask = singleTask;
// WP7 gives the giver's praise in the giver's voice (core_praise_npc for the royal voices): then the royal does not add his own
const praiseInVoice = a => !!(F.TPL.has('core_praise_npc') && F.TPL.all.core_praise_npc.voices.includes(a.voice));
// §7.4 the audience: three tasks in a row, rotating strands, realm words preferred; 2–3 A → «Så klok du er!» + 15 coins, else 5
async function audience(a) {
  const plan = AUD[a.who] || AUD.k, fm = royalFormats(), out = [];
  Roy.audT[a.id] = F.T.now;
  F.emit('activity', 'royal', true);
  F.emit('royalAudience', a.id, true);
  let stopped = false;
  try {
    a.gesture('cheer', 1.2);
    await sayRoy(a, 'roy_g_tre');
    for (let n = 1; n <= 3; n++) {
      if (n > 1 && (!canTask() || !a.here || !a.here() || Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) > 14 || a.space !== F.Space.cur)) { stopped = true; break; }
      // v5c WP-Q: the first task of an audience is the kingdom's specialty (SYNTHESIS §4.5) when it serves her level; the others follow
      // the engine's mix over every format (domain / thinking-type sequencing keeps the three different) – no more fixed LES /
      // T-MENGDE / SKRIV rotation (the old plan is the fallback only when the engine has nothing)
      let item = n === 1 ? specItem(a) : null;
      if (!item) item = nextItem(a, fm, undefined);
      if (!item) { let strands = plan[n - 1]; if (strands.length > 1) strands = [U.pick(F.rand, strands)]; item = nextItem(a, fm, strands) || nextItem(a, fm, plan[n - 1]); }
      if (item && /^T-MENGDE/.test(item.strand || '') && COUNT_FMTS.includes(item.format) && countModel(a.royal)) item.params = Object.assign({}, item.params || {}, { model: countModel(a.royal) });
      await F.SAY('rq_oppg', { n }, '');
      a.busy = false;
      const res = await royalTask(a, item, fm);
      a.busy = true;
      if (!res) { stopped = true; break; }
      out.push(res.outcome || 'C');
      F.emit('royalTask', a.id, n, res.outcome);
      if (n < 3) await F.T.sleep(350);
    }
    const nA = out.filter(o => o === 'A').length;
    if (!a.here || !a.here()) return out;
    a.facePlayer();
    if (stopped && out.length < 3) {
      if (out.length && nA >= 1) F.Eco.add(5, { from: a, reason: 'royal' });
      // v5 (#49): the play-break line only when the break really stopped it; she walked off / changed space → «Kom tilbake senere!»
      await sayRoy(a, canTask() ? 'roy_g_senere' : 'roy_g_lek');
    } else if (nA >= 2) {
      a.gesture('cheer', 1.6); if (F.sfx.levelup) F.sfx.levelup();
      await sayRoy(a, 'roy_g_klok'); F.Eco.add(15, { from: a, reason: 'royal' });
      const ol = ownLine(a) || quirkLine(a); if (ol && F.rand() < 0.6) await sayRoy(a, ol);
    } else {
      a.gesture('nod', 1.2);
      // v5c WP-Q (standing rule «guessing never pays»): the consolation coins need one first-try answer; 0 A → the kind line only
      await sayRoy(a, 'roy_g_ove'); if (nA >= 1) F.Eco.add(5, { from: a, reason: 'royal' });
    }
    F.Quest && F.Quest.log && F.Quest.log('royalAudience', { id: a.id, out: out.join('') });
    return out;
  } finally {
    a.busy = false;
    F.emit('royalAudience', a.id, false, out.slice());
    F.emit('activity', 'royal', false);
  }
}
Roy.audience = audience;
// the queued tap is answered when the royal is free again (≤ 15 s, she is near, nothing else is running or speaking)
let qAcc = 0;
F.on('tick', dt => {
  qAcc += dt; if (qAcc < 0.5) return; qAcc = 0;
  if (!F.booted) return;
  const P = F.Player.pos;
  for (const a of Roy.all()) {
    if (!a.tapQueued) continue;
    if (F.T.now - a.tapQueued > Roy.queueS) { a.tapQueued = 0; continue; }
    if (a.busy || Roy.greeting[a.royal] || rqBusy(a.royal) || F.Task.current || (F.UI.isOpen && F.UI.isOpen()) || speaking()) continue;
    if (F.T.now - (Roy.greetEndT || -1e9) < 3) continue;                 // RQ1 starts ~1 s after the greeting: let it start first
    if (a.space !== F.Space.cur || Math.hypot(a.x - P.x, a.z - P.z) > 10) continue;
    a.tapQueued = 0;
    F.emit('royalDequeued', a.id);
    Roy.press(a);
  }
});

/* ---------------------------------------------------------- greeting ceremony (first arrival, §3.6) */
// v5 (#32, logic §3-I): the ceremony never starts in the middle of a task, an encounter or an open panel – it waits (≤ 2 min)
const greetBusy = () => !!((F.Task && F.Task.current) || (F.Befriend && F.Befriend.busy) || (F.UI.isOpen && F.UI.isOpen()) || (F.Player && F.Player.frozen) || (F.Travel && F.Travel.busy));
Roy.greetBusy = greetBusy;
Roy.greet = function (id) {
  const r = realm(id); if (!r) return Promise.resolve(false);
  if (Roy.greeting[id]) return Roy.greeting[id];
  const run = (async () => {
    for (let k = 0; k < 240 && greetBusy(); k++) await F.T.sleep(500);
    let fam = ['k', 'q', 'c'].map(w => Roy.actor(id, w));
    if (fam.some(a => !a)) { Roy.spawn(id); fam = ['k', 'q', 'c'].map(w => Roy.actor(id, w)); }
    fam = fam.filter(Boolean);
    if (!fam.length) return false;
    if (F.sfx.levelup) F.sfx.levelup();
    const P = F.Player.pos, A = anchorsOf(id);
    // a row of three, 3.2 m from her toward the castle, facing her
    const tx = A ? A.door.x - P.x : 0, tz = A ? A.door.z - P.z : -1, tl = Math.hypot(tx, tz) || 1;
    const ux = tx / tl, uz = tz / tl, cx = P.x + ux * 3.2, cz = P.z + uz * 3.2;
    const spots = [-1.5, 0, 1.5].map(o => { const x = cx - uz * o, z = cz + ux * o; return F.Act.freeSpot ? F.Act.freeSpot(x, z, 'out') : { x, z }; });
    const walks = fam.map((a, i) => {
      a.greetHold = F.T.now + 90; a.clearWish && a.clearWish();
      if (a.space !== 'out') {   // indoors: step out of the keep door first
        const d = A ? A.door : { x: spots[i].x, z: spots[i].z - 6 };
        a.place('out', d.x + (i - 1) * 1.2, d.z + 0.8);
      }
      // far away (she triggered 'found' up to 40 m out): they arrive with a sparkle 8 m from her, toward the castle, and walk the rest
      if (Math.hypot(a.x - spots[i].x, a.z - spots[i].z) > 11) {
        const sx = spots[i].x + ux * 8, sz = spots[i].z + uz * 8, f = F.Act.freeSpot ? F.Act.freeSpot(sx, sz, 'out') : { x: sx, z: sz };
        a.place('out', f.x, f.z); F.FX.sparkle(V3(f.x, (a.th.obj.position.y || 0) + 1, f.z), 0xfff2a8);
      }
      return a.walkTo(spots[i].x, spots[i].z, { always: true });
    });
    await Promise.race([Promise.all(walks), F.T.sleep(5000)]);
    fam.forEach((a, i) => { if (Math.hypot(a.x - spots[i].x, a.z - spots[i].z) > 0.6) a.place('out', spots[i].x, spots[i].z); a.facePlayer(); a.gesture('wave', 1.4); });
    await F.SAY('roy_her_bor', { familie: r.family }, '');
    const king = fam.find(a => a.who === 'k');
    if (king) { king.gesture('cheer', 1.4); await sayRoy(king, 'roy_velk_' + id); }
    for (const a of fam) { a.facePlayer(); a.gesture('wave', 1.4); await sayRoy(a, 'roy_jeg_' + a.id); }
    (Roy.visit[id] || (Roy.visit[id] = { greeted: false, igjen: {} })).greeted = true;
    Roy.greetEndT = F.T.now;
    F.emit('royalsGreeted', id);
    return true;
  })().catch(e => { console.error('[Royals.greet]', id, e); return false; }).then(ok => {
    delete Roy.greeting[id];
    if (Roy.dropAfterGreet.has(id)) { Roy.dropAfterGreet.delete(id); Roy.despawn(id); }
    return ok;
  });
  Roy.greeting[id] = run;
  return run;
};

/* ---------------------------------------------------------- schedule: back to posts, the child roams */
let schedAcc = 0;
F.on('tick', dt => {
  schedAcc += dt; if (schedAcc < 1) return; const step = schedAcc; schedAcc = 0;
  if (!F.booted || (F.flags.test && !Roy.schedInTest)) return;
  const P = F.Player.pos;
  for (const a of Roy.all()) {
    if (a.busy || Roy.greeting[a.royal] || F.Task.current && F.Task.current.npc === a) continue;
    const seated = a.act && (a.act.kind === 'throne' || a.act.kind === 'nap');
    const dd = Math.hypot(a.x - P.x, a.z - P.z);
    // v3 §7.3 royals call her: close (4.5 m, 6 m for a seated king) and this royal holds an offer / the active step → «Jeg har en
    // oppgave til deg!» once per 90 s + the bubble jumps; the first time per kingdom the narrator adds «Trykk på kongen!» …
    if (dd < (a.act && a.act.sit ? 6 : 4.5) && a.visible() && !a.path && a.space === F.Space.cur && callHer(a)) continue;
    // she comes close: a royal wave (no speech), at most once a minute each
    if (dd < 4.5 && a.visible() && !a.path && (!a.act || a.act.kind === 'throne') && !(a._waveT > F.T.now) && !F.Task.current) { a._waveT = F.T.now + 60; a.quirkPause = F.T.now + 2; if (!a.act) a.facePlayer(); a.gesture('wave', 1.4); }
    if (a.greetHold && a.greetHold > F.T.now) continue;
    const near = a.visible() && dd < 10;
    a.nextMove = (a.nextMove || 0) - step;
    if (a.nextMove > 0 || near || seated) continue;   // sitting on his throne = at his post
    const posts = a.posts || [];
    if (!posts.length) continue;
    if (posts.length > 1) a.postI = ((a.postI || 0) + 1) % posts.length;
    const p = Roy.postPos(posts[a.postI || 0], 0);
    a.nextMove = a.who === 'c' ? 45 + F.rand() * 45 : 60;
    a.greetHold = 0;
    if (!p) continue;
    a.atFallback = !!p.fallback;
    if (p.space === 'in' && a.space === 'out' && a.visible()) {   // she can see them: walk to the keep door first, then go in
      const A = anchorsOf(a.royal);
      if (A) { a.walkTo(A.door.x, A.door.z).then(okk => { if (okk && a.space === 'out' && !a.busy && !Roy.greeting[a.royal]) a.place(p.space, p.x, p.z, p.room, p); }); continue; }
    }
    if (p.space !== a.space || (p.bld || null) !== (a.bld || null)) a.place(p.space, p.x, p.z, p.room, p);
    else if (Math.hypot(p.x - a.x, p.z - a.z) > 0.8) a.walkTo(p.x, p.z);
  }
});

function callHer(a) {
  if (a.act && a.act.kind === 'nap') return false;                     // a sleeping king does not call
  if (F.T.now - (Roy.talkT != null ? Roy.talkT : -1e9) < 6 || F.T.now - (Roy.callAnyT != null ? Roy.callAnyT : -1e9) < 25) return false;   // one voice at a time
  if (a._callT > F.T.now - 90 || a.tapQueued || F.Task.current || (F.UI.isOpen && F.UI.isOpen()) || speaking() || !canTask()) return false;
  if (rqBusy(a.royal) || !(F.RQuest && F.RQuest.mine && F.RQuest.mine(a.royal, a.who))) return false;
  // not while she is talking with someone in the family (or just did): one voice at a time
  if (F.T.now - (Roy.pressT != null ? Roy.pressT : -1e9) < 12 || F.T.now - (Roy.taskEndT != null ? Roy.taskEndT : -1e9) < 8 || Roy.all().some(o => o.royal === a.royal && (o.busy || o.tapQueued))) return false;
  if (!F.TPL.has('roy_g_oppgave') || !F.TPL.all.roy_g_oppgave.voices.includes(a.voice)) return false;
  a._callT = F.T.now; Roy.callAnyT = F.T.now; a._waveT = F.T.now + 60; a.quirkPause = F.T.now + 3;
  if (!seated(a)) a.facePlayer();
  a.gesture('wave', 1.4); pulse(a);
  const rs = F.save.rq = F.save.rq || {}, said = rs.trykk = rs.trykk && typeof rs.trykk === 'object' ? rs.trykk : {};
  F.emit('royalCalls', a.id);
  sayRoy(a, 'roy_g_oppgave').then(() => {
    if (said[a.royal] || F.Task.current) return;
    said[a.royal] = F.save.day || 1; F.store();
    const t = a.who === 'c' ? childTrykk(a.royal) : TRYKK[a.who];
    if (t && F.TPL.has(t)) return F.SAY(t, {}, '');
  }).catch(e => console.warn('[Royals] call', e));
  return true;
}
Roy.callHer = callHer;

/* ---------------------------------------------------------- quirk idles + ambient quirk lines */
function addPony(a) {
  const mid = F.VOX.has('ponni') ? 'ponni' : (F.VOX.has('ch_bris') ? 'ch_bris' : null);
  if (!mid || !F.Act.fitModel) return;
  try {
    const m = F.Act.fitModel(mid, {}, 1.2);
    m.rotation.y = 0; m.position.z = -0.08;
    a.th.obj.add(m); a.pony = m; a.lift = Math.max(0.3, (m.userData.h || 1) * 0.6 - 0.2);
  } catch (e) { console.warn('[Royals] pony', e); }
}
const RAINBOW = [0xff5d5d, 0xffa64a, 0xffe066, 0x6fd36b, 0x5fa8ff, 0xa070e0];
const tv = V3();
function headTop(a, up) { tv.copy(a.headPos()); tv.y += up || 0.3; return tv.clone(); }
function quirkPose(a, t, dt) {
  const P = a.parts || {}, S = Math.sin, q = a.quirk;
  if (a.pony) {   // riding: legs out to the sides, the pony walks under him
    a.pony.position.y = -(a.lift || 0);
    if (P.legL) { P.legL.rotation.x = -0.9; P.legR.rotation.x = -0.9; P.legL.rotation.z = 0.35; P.legR.rotation.z = -0.35; }
    if (F.Rig && F.Rig.tick) try { F.Rig.tick(a.pony, t, { moving: a.moving, happy: a.busy }); } catch (e) { /* not rigged */ }
    if (!a.moving && !a.path && !a.busy && a.visible() && !(a.quirkPause > F.T.now) && !(a.trotT > F.T.now)) {
      // a little trot round his spot now and then
      a.trotT = F.T.now + 7 + F.rand() * 5;
      if (Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) > 3.5) {
        const ang = F.rand() * Math.PI * 2, hx = a.trotHome ? a.trotHome.x : a.x, hz = a.trotHome ? a.trotHome.z : a.z;
        a.trotHome = a.trotHome && Math.hypot(a.trotHome.x - a.x, a.trotHome.z - a.z) < 6 ? a.trotHome : { x: a.x, z: a.z };
        a.walkTo(hx + Math.cos(ang) * 2.2, hz + Math.sin(ang) * 2.2);
      }
    }
    return;
  }
  if (q === 'rainbow') {
    if (a.moving && !(a.fxT > F.T.now)) { a.fxT = F.T.now + 0.12; F.FX.burst(V3(a.x, a.th.obj.position.y + 0.3, a.z), { kind: 'sparkle', n: 3, colors: RAINBOW, speed: 0.3, up: 0.6, life: 0.9, size: 0.06 }); }
    else if (!a.moving && !(a.fxT > F.T.now)) {
      a.fxT = F.T.now + 2.4;
      const h = headTop(a, 0.6);
      RAINBOW.forEach((c, i) => { const ang = Math.PI * (0.1 + 0.8 * i / 5); F.FX.burst(V3(h.x + Math.cos(ang) * 0.7, h.y + Math.sin(ang) * 0.5, h.z), { kind: 'sparkle', n: 2, colors: [c], speed: 0.1, up: 0.2, life: 1.2, size: 0.07 }); });
    }
    return;
  }
  if (a.moving || a.path || a.busy || (a.act && a.act.kind !== 'throne') || a.quirkPause > F.T.now || Roy.greeting[a.royal]) return;
  const fx = !(a.fxT > F.T.now);
  switch (q) {
    case 'flowerTalk':   // bends to a flower in her hand and talks to it
      if (P.armR) { P.armR.rotation.x = -1.0 + S(t * 1.3) * 0.08; P.armR.rotation.z = -0.15; }
      if (P.head) { P.head.rotation.x = 0.28; P.head.rotation.z = S(t * 0.9) * 0.12; }
      if (!a.flower && F.VOX.has('ch_prop_bukett')) { a.flower = F.VOX.make('ch_prop_bukett'); a.flower.scale.setScalar(0.9); (a.anchors.hand || a.th.obj).add(a.flower); }
      if (fx) { a.fxT = F.T.now + 2.2; F.FX.burst(headTop(a, -0.5), { kind: 'heart', n: 2, colors: [0xff7fb0, 0xffc0dc], speed: 0.3, up: 0.8, life: 1.2, size: 0.07 }); }
      break;
    case 'bubbles':      // soap bubbles when he laughs
      if (fx) { a.fxT = F.T.now + 2.6; a.gesture('laugh', 1.6); F.FX.burst(headTop(a, -0.25), { kind: 'bubble', n: 7, speed: 0.8, up: 1.4, life: 2.2, size: 0.12, gravity: -0.2 }); }
      break;
    case 'shellCount':   // counts shells on his fingers every morning
      if (fx) { a.fxT = F.T.now + 6; a.gesture('count', 2.5); F.FX.burst(headTop(a, -0.9), { kind: 'sparkle', n: 5, colors: [0xf3dfae, 0xffc8a8, 0xffffff], speed: 0.3, up: 0.5, life: 0.9, size: 0.06 }); }
      break;
    case 'crumbs':       // crumbs fall out of his beard
      if (P.head) P.head.rotation.x = S(t * 0.7) * 0.06;
      if (fx) { a.fxT = F.T.now + 2.2; if (F.rand() < 0.3) a.gesture('eat', 2); F.FX.burst(headTop(a, -0.55), { kind: 'flour', n: 5, colors: [0xd6a86a, 0xf2b632, 0xfff3dc], speed: 0.25, up: 0.1, gravity: 1.2, life: 1.0, size: 0.05 }); }
      break;
    case 'tralala':      // notes float up, a little sway
      if (a.model) a.model.rotation.z = S(t * 2.2) * 0.05;
      if (fx) {
        a.fxT = F.T.now + 2.2; F.FX.float(F.rand() < 0.5 ? '♪' : '♫', headTop(a, 0.1), 'life-zzz roy-note');
        if (F.sfx.pluck && !(F.Speech.busy && F.Speech.busy()) && Math.hypot(a.x - F.Player.pos.x, a.z - F.Player.pos.z) < 9) [0, 4, 7].forEach((n, i) => F.T.timeout(() => F.sfx.pluck(F.note(n + 12)), i * 180));
      }
      break;
    case 'starGaze':     // looks up and counts stars
      if (P.head) P.head.rotation.x = -0.5 + S(t * 0.6) * 0.05;
      if (P.armR) { P.armR.rotation.x = -2.4 + S(t * 1.1) * 0.15; P.armR.rotation.z = -0.2; }
      if (fx) { a.fxT = F.T.now + 1.6; const h = headTop(a, 1.4); F.FX.burst(V3(h.x + (F.rand() - 0.5) * 1.5, h.y, h.z + (F.rand() - 0.5)), { kind: 'star', n: 2, colors: [0xfff2a8, 0xf5c542], speed: 0.1, up: 0.1, gravity: 0, life: 1.1, size: 0.1 }); }
      break;
    case 'snore':        // dozes standing up; z-puffs
      if (a.awakeT > F.T.now) break;
      if (P.head) P.head.rotation.x = 0.42 + S(t * 1.2) * 0.04;
      if (P.armL) { P.armL.rotation.x = -0.2; P.armR.rotation.x = -0.2; }
      if (fx) { a.fxT = F.T.now + 2.6; F.FX.float('Zzz', headTop(a, 0.2), 'life-zzz'); }
      break;
    case 'polish':       // polishes a crystal: circles with the right hand, glints
      if (P.armR) { P.armR.rotation.x = -1.2 + S(t * 6) * 0.15; P.armR.rotation.z = Math.cos(t * 6) * 0.3; }
      if (P.head) P.head.rotation.x = 0.25;
      if (fx) { a.fxT = F.T.now + 1.4; const h = a.anchors.hand; if (h) { h.getWorldPosition(tv); F.FX.burst(tv.clone(), { kind: 'sparkle', n: 4, colors: [0x9fe8ff, 0xffffff, 0xcfefff], speed: 0.4, up: 0.4, life: 0.7, size: 0.06 }); } }
      break;
  }
}
let ambT = -60;
F.on('tick', (dt, t) => {
  const P = F.Player.pos;
  for (const a of Roy.all()) {
    if (!a.quirk && !a.pony) continue;
    if (!a.here() || !a.th.obj.visible || Math.hypot(a.x - P.x, a.z - P.z) > 32) { if (a.flower && a.flower.parent) { a.flower.parent.remove(a.flower); a.flower = null; } continue; }
    if (a.flower && (a.busy || a.moving || a.quirkPause > F.T.now)) { if (a.flower.parent) a.flower.parent.remove(a.flower); a.flower = null; }
    try { quirkPose(a, t, dt); } catch (e) { console.warn('[Royals] quirk', a.id, e); a.quirk = null; }
  }
  // one ambient quirk line: she is close, nothing else speaks, not too often (off in #test unless ambInTest)
  if ((F.flags.test && !Roy.ambInTest) || !F.booted || F.T.now - ambT < 45) return;
  if (F.Task.current || F.UI.isOpen() || (F.Speech.busy && F.Speech.busy())) return;
  // v3: not on top of a conversation (a press, a task, the greeting, a call) – one voice at a time
  const quiet = x => F.T.now - (x != null ? x : -1e9) > 20;
  if (!quiet(Roy.pressT) || !quiet(Roy.taskEndT) || !quiet(Roy.greetEndT) || Object.keys(Roy.greeting).length || Roy.all().some(o => o.busy || o.tapQueued || !quiet(o._callT))) return;
  const cand = Roy.all().filter(a => !a.busy && !Roy.greeting[a.royal] && a.visible() && Math.hypot(a.x - P.x, a.z - P.z) < 6.5 && F.T.now - (a._ambT || -999) > 120);
  if (!cand.length) return;
  const a = cand[0], ql = quirkLine(a), ol = ownLine(a);
  const line = ql && ol ? (a._ambQ ? ol : ql) : (ql || ol); a._ambQ = !a._ambQ;    // v3: her own line alternates with the quirk line
  ambT = F.T.now; a._ambT = F.T.now;
  if (!line) return;
  a.awakeT = F.T.now + 4;
  sayRoy(a, line);
});
})();
