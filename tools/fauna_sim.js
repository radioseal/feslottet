// node tools/fauna_sim.js [runs=40] – WP4 pacing Monte Carlo (DESIGN2 §4.5 pacing targets). Owner: WP4.
// Simulates play sessions (25 min/day) as walk logs over chunks: layer A residents (85 % vanlig / 15 % sjelden), one glimt slot per chunk
// (F.FAUNA.GLIMT tier weights by ring, ×3 un-befriended, ×2 gate match, bad-luck force at 15), legends at landmarks (conditions + 40 %).
// She taps an un-befriended animal she sees about every 2 minutes; success odds follow §5.3 with mostly-A answers.
// Reports: minutes to see all page-10 vanlig, visits to see each vanlig / sjelden, sessions for each svært sjelden, days per legend, days to a full album.
'use strict';
global.window = {};
require('../js/data/fauna.js');
const F = window.F, FA = F.FAUNA;
const RUNS = +(process.argv[2] || 40);
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pickW = (list, wf) => { let t = 0; const w = list.map(x => { const v = wf(x); t += v; return v; }); if (!t) return null; let r = rnd() * t; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; };
const KIND_PAGE = { park: 10, gardsland: 12, blomstereng: 13, lavendel: 13, frukthage: 14, innsjo: 15, vindmolle: 16, strand: 17, snohaugen: 19 };
const RING_KINDS = { 0: ['park'], 1: ['blomstereng', 'gardsland', 'innsjo'], 2: ['blomstereng', 'gardsland', 'innsjo', 'frukthage', 'lavendel', 'vindmolle', 'strand', 'snohaugen'] };
const LMS = { gardsland: ['kjempemolle', 'pariserhjul', 'kjempesolsikke', 'ballongplass', 'dyrepark'], blomstereng: ['pariserhjul', 'krystallhoyden', 'kjempesolsikke', 'regnbuebro', 'ballongplass', 'dyrepark'],
  innsjo: ['pariserhjul', 'regnbuebro'], frukthage: ['pariserhjul', 'ballongplass', 'dyrepark'], lavendel: ['pariserhjul', 'krystallhoyden', 'kjempesolsikke', 'ballongplass'],
  vindmolle: ['kjempemolle', 'pariserhjul', 'krystallhoyden', 'ballongplass'], strand: ['fyrtarn', 'sandslott'], snohaugen: ['isslott', 'krystallhoyden'] };
const P_WIN = { 1: 0.9, 2: 0.7, 3: 0.55, 4: 0.55 };
function sim() {
  const friends = new Set(), seen = {}, seenAt = {}, friendDay = {};
  const visits = {}; let dry = 0, minutes = 0, kikkert = false;
  const res = { p10: null, full: null, firstVisit: {}, legendsDay: {} };
  for (let day = 1; day <= 160; day++) {
    if (day === 12) kikkert = true;        // she buys the Kikkert after a while
    const maxRing = day <= 2 ? 1 : day <= 6 ? 2 : 3;
    let tapCd = 0, dayTravel = false;
    for (let m = 0; m < 25; m++, minutes++) {
      const ph = m < 6 ? 'morgen' : m > 17 ? 'kveld' : 'dag';
      // where is she this minute: park in the first minutes of early days, else a region of the reachable rings
      if (m === 0) dayTravel = day >= 6 && rnd() < 0.4;   // free fast travel to a found kingdom (WP10) at the start of some sessions
      const ring = (day === 1 && m < 12) || (m < 2 && !dayTravel) || m >= 23 ? 0 : (dayTravel && m < 8) ? maxRing : 1 + Math.floor(rnd() * maxRing);
      const kind = ring === 0 ? 'park' : RING_KINDS[Math.min(2, ring)][Math.floor(rnd() * RING_KINDS[Math.min(2, ring)].length)];
      const wr = rnd(), weather = wr < 0.15 ? 'regn' : wr < ((kind === 'vindmolle' || kind === 'strand') ? 0.55 : 0.35) ? 'vind' : 'sol';
      const vkey = kind + ':' + day; visits[kind] = visits[kind] || new Set(); visits[kind].add(day);
      const nVisit = visits[kind].size;
      const c = { phase: ph, weather, ring, friends: friends.size, pageFriends: {}, kikkert };
      friends.forEach(id => { const p = FA.byId(id).page; c.pageFriends[p] = (c.pageFriends[p] || 0) + 1; });
      const pages = [KIND_PAGE[kind] || 13]; if (kind !== 'park' && rnd() < 0.35) pages.push(11); if (kind === 'strand') pages.push(18);
      if (kind !== 'park' && kind !== 'strand' && kind !== 'snohaugen' && rnd() < 0.3) pages.push(15);
      const saw = [];
      // 3 chunk passes per minute
      for (let k = 0; k < 3; k++) {
        // layer A: 2–4 groups, vanlig 85 % / sjelden 15 %
        const nA = 2 + Math.floor(rnd() * 2);
        for (let g = 0; g < nA; g++) {
          const page = pages[Math.floor(rnd() * pages.length)], tier = rnd() < 0.85 ? 1 : 2;
          let pool = FA.ofPage(page).filter(s => s.tier === tier && !(s.when.ring && ring < s.when.ring));
          if (!pool.length) pool = FA.ofPage(page).filter(s => s.tier === 1);
          const s = pool[Math.floor(rnd() * pool.length)];
          if (s && FA.eligibleWhen(s, { phase: ph, weather })) saw.push(s);
        }
        // layer B: glimt slot
        const tw = FA.GLIMT[Math.min(3, ring)]; let r = rnd() * 100, t = 0; for (; t < 4; t++) { r -= tw[t]; if (r <= 0) break; }
        let tier = t >= 4 ? 0 : t; const forced = dry >= 15; if (forced) tier = rnd() < 0.6 ? 2 : 3;
        if (ring === 0 && tier === 3 && !pages.includes(10)) tier = 0;
        let got = null;
        if (tier) {
          const pool = FA.species.filter(s => pages.includes(s.page) && s.tier === tier && FA.eligibleWhen(s, c) && (!forced || !friends.has(s.id)));
          got = pool.length ? pickW(pool, s => (s.when.phase || s.when.weather ? 2 : 1) * (friends.has(s.id) ? 1 : 3) * (kikkert && s.tier >= 2 ? 1.5 : 1)) : null;
          if (forced) dry = 0;
        }
        if (!got || friends.has(got.id)) dry++; else saw.push(got);
      }
      // legends: she passes a landmark about once per 8 minutes
      if (ring >= 1 && rnd() < 0.125) {
        const lm = (LMS[kind] || [])[Math.floor(rnd() * (LMS[kind] || []).length)];
        const L = FA.species.find(s => s.page === 20 && s.landmark === lm);
        if (L && FA.eligibleWhen(L, c) && rnd() < (friends.has(L.id) ? 0.4 : 0.55)) saw.push(L);
      }
      for (const s of saw) {
        if (!seen[s.id]) { seen[s.id] = minutes; seenAt[s.id] = { day, nVisit, kind }; }
        if (s.tier === 1 && s.page === KIND_PAGE[kind] && res.firstVisit[s.id] == null) res.firstVisit[s.id] = nVisit;
      }
      // a befriend attempt every ~2 minutes on something new she sees
      tapCd--;
      if (tapCd <= 0) {
        const cand = saw.filter(s => !friends.has(s.id));
        if (cand.length) {
          const s = cand.sort((a, b) => b.tier - a.tier)[0]; tapCd = 2;
          if (rnd() < P_WIN[s.tier]) { friends.add(s.id); friendDay[s.id] = day; if (s.tier === 4) res.legendsDay[s.id] = day; }
        }
      }
      if (res.p10 == null && FA.ofPage(10).filter(s => s.tier === 1).every(s => seen[s.id] != null)) res.p10 = minutes + 1;
    }
    if (res.full == null && friends.size >= 110) { res.full = day; break; }
  }
  res.seenAt = seenAt; res.friends = friends.size; res.friendDay = friendDay; res.missing = FA.species.filter(s => !friends.has(s.id)).map(s => s.id);
  return res;
}
const runs = []; for (let i = 0; i < RUNS; i++) runs.push(sim());
const med = a => { const b = a.filter(x => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const pct = (a, n) => Math.round(100 * a.filter(x => x != null).length / n);
const byTier = t => FA.species.filter(s => s.tier === t && s.page <= 19);
console.log('runs', RUNS);
const p10 = med(runs.map(r => r.p10)); console.log('page-10 vanlig all seen: median', p10, 'min', p10 != null && p10 <= 10 ? 'PASS (≤ 10 min)' : 'CHECK');
const fv = byTier(1).filter(s => s.page !== 11 && s.page !== 18).map(s => med(runs.map(r => r.firstVisit[s.id])));
console.log('vanlig (own habitat) first-visit median: ', fv.filter(v => v === 1).length + '/' + fv.length, 'seen on the 1st visit;', 'worst', Math.max(...fv.filter(v => v != null)));
const sj = byTier(2).map(s => med(runs.map(r => r.seenAt[s.id] ? r.seenAt[s.id].nVisit : null)));
console.log('sjelden: median visits of its habitat to first sight', JSON.stringify(sj), 'within 1–3:', sj.filter(v => v != null && v <= 3).length + '/' + sj.length);
const sv = byTier(3).map(s => [s.id, med(runs.map(r => r.seenAt[s.id] ? r.seenAt[s.id].day : null)), pct(runs.map(r => r.seenAt[s.id] ? 1 : null), RUNS)]);
console.log('svært sjelden: median session (day) of first sight', JSON.stringify(sv.map(x => x[0] + ':' + x[1])), 'in 3–8 sessions:', sv.filter(x => x[1] != null && x[1] >= 3 && x[1] <= 8).length + '/' + sv.length);
const lg = FA.species.filter(s => s.tier === 4).map(s => [s.id, med(runs.map(r => r.legendsDay[s.id])), pct(runs.map(r => r.legendsDay[s.id]), RUNS)]);
console.log('legends: median day befriended (1–4 weeks = day 7–28):', JSON.stringify(lg.map(x => x[0] + ':' + x[1] + '(' + x[2] + '%)')));
console.log('full album (110): median day', med(runs.map(r => r.full)), '(target ≈ 60–90), reached in', pct(runs.map(r => r.full), RUNS) + '% of runs; median friends at day 160:', med(runs.map(r => r.friends)));
const miss = {}; runs.forEach(r => r.missing.forEach(id => { miss[id] = (miss[id] || 0) + 1; }));
console.log('most often missing at the end:', JSON.stringify(Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 14)));
