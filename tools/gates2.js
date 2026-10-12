// v2 integration gates: runs the key tests, each with its own time limit, and prints a summary table.
// Usage: node tools/gates2.js [filter] [-j N]
// 11.10. (process review): N workers in parallel (default 3; -j 1 = the old one-after-another run). The frame-cost / frame-time gates
// (PERF below) still run alone at the end so their numbers are not skewed by the other browsers. Results also go to
// _dev/reports/gates2_last.json.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const GATES = [
  ['boot 1470', 'tests/boot.js', ['1470,773']], ['boot 1280', 'tests/boot.js', ['1280,700']],
  ['smoke', 'tools/smoke.js', []], ['learn_sim', 'tests/learn_sim.js', []],
  ['core', 'tests/core_test.js', []], ['core_w2', 'tests/core_w2.js', []],
  ['castle(v1)', 'tests/castle_test.js', [], 'legacy'], ['bld_walk', 'tests/bld_walk.js', []], ['bld_w2_walk', 'tests/bld_w2_walk.js', []], ['bld_stairs', 'tests/bld_stairs.js', []],
  ['life', 'tests/life_test.js', []], ['life_w2', 'tests/life_w2.js', []],
  ['formats_num', 'tests/formats_num.js', ['--quick', '--noshots']], ['formats_rw', 'tests/formats_rw.js', ['quick']],
  ['density', 'tests/density.js', []],
  ['catch_flow', 'tests/catch_flow.js', []], ['catch_wheel', 'tests/catch_wheel.js', []], ['catch_album', 'tests/catch_album.js', []],
  ['fauna_w2', 'tests/fauna_w2.js', []], ['fauna_gates', 'tests/fauna_gates.js', []],
  ['realm_w2', 'tests/realm_w2.js', []], ['realm_rule', 'tests/realm_rule.js', []], ['royals_w2', 'tests/royals_w2.js', []],
  ['rq_run', 'tests/rq_run.js', []], ['shop2_gates', 'tests/shop2_gates.js', []], ['shop2_walk', 'tests/shop2_walk.js', []],
  ['shell2_map', 'tests/shell2_map.js', []], ['shell2_travel', 'tests/shell2_travel.js', []],
  ['home_flow', 'tests/home_flow.js', []], ['home_onboard', 'tests/home_onboard.js', []],
  ['world_walk', 'tests/world_walk.js', []], ['press_world', 'tests/press_world.js', []],
  // v3 (DESIGN3) gates
  ['learn_trial', 'tests/learn_trial.js', []], ['core_v3', 'tests/core_v3.js', []], ['bld_reach', 'tests/bld_reach.js', []],
  ['throne', 'tests/throne.js', []], ['castle_learn', 'tests/castle_learn.js', []], ['royals_pick', 'tests/royals_pick.js', []],
  ['royals_v3', 'tests/royals_v3.js', []], ['royals_live', 'tests/royals_live.js', []], ['rq_home', 'tests/rq_home.js', []],
  ['catch_trial', 'tests/catch_trial.js', []], ['catch_name', 'tests/catch_name.js', []], ['world_signs', 'tests/world_signs.js', []],
  ['life_chain', 'tests/life_chain.js', []], ['life_balance', 'tests/life_balance.js', []], ['learn_session', 'tests/learn_session.js', []],
  // v4/v5 (DESIGN4/DESIGN5) gates
  ['banks_check', 'tests/banks_check.js', []], ['kit_widgets', 'tests/kit_widgets.js', []], ['order_early', 'tests/order_early.js', []],
  ['core_lyd', 'tests/core_lyd.js', []], ['v4_wpb1', 'tests/v4_wpb1.js', []], ['v4_wpn', 'tests/v4_wpn.js', []], ['v4_wpm', 'tests/v4_wpm.js', []],
  ['v4_wpp', 'tests/v4_wpp.js', []], ['v4_wpg', 'tests/v4_wpg.js', []], ['v4_wpl', 'tests/v4_wpl.js', []], ['v4_wpa', 'tests/v4_wpa.js', []],
  ['catch_stars', 'tests/catch_stars.js', []], ['rq_story', 'tests/rq_story.js', []], ['world_hooks', 'tests/world_hooks.js', []],
  ['v5_trylle', 'tests/v5_trylle.js', []],
  // night 12.10. (clarity plan §10 + economy plan §8): T1–T3 (owner «guide») and every owner's new tests. The 5th field is the time
  // limit in minutes (default 10): the child paths run in real time with real speech timing and take longer.
  ['clarity_day1 i', 'tests/clarity_day1.js', ['i'], false, 12], ['clarity_day1 p', 'tests/clarity_day1.js', ['p'], false, 15],
  ['clarity_day1 z', 'tests/clarity_day1.js', ['z'], false, 15], ['clarity_probes', 'tests/clarity_probes.js', [], false, 15],
  ['clarity_play', 'tests/clarity_play.js', [], false, 40],
  ['actors_clarity', 'tests/actors_clarity_probe.js', [], false, 15], ['econ_honest', 'tests/econ_honest.js', [], false, 15],
  ['fauna_clarity', 'tests/fauna_clarity_child.js', [], false, 25], ['firsts_child', 'tests/firsts_child.js', [], false, 25],
  ['firsts_probe', 'tests/firsts_probe.js', [], false, 15], ['hud_day1', 'tests/hud_day1.js', [], false, 12],
  ['hud_goal', 'tests/hud_goal.js', [], false, 20], ['money_talk', 'tests/money_talk.js', [], false, 15],
  ['onboard_day1', 'tests/onboard_day1.js', [], false, 30], ['quests_letter', 'tests/quests_letter.js', [], false, 15],
  ['realm_edge_child', 'tests/realm_edge_child.js', [], false, 25], ['realm_edge_probe', 'tests/realm_edge_probe.js', [], false, 20],
  ['realm_edge_seeds', 'tests/realm_edge_seeds.js', [], false, 15], ['shop_effects', 'tests/shop_effects.js', [], false, 20],
  ['shop_purse', 'tests/shop_purse.js', [], false, 12], ['travel_offer', 'tests/travel_offer.js', [], false, 25],
  ['wand_clarity_child', 'tests/wand_clarity_child.js', [], false, 20], ['wand_clarity_day1', 'tests/wand_clarity_day1.js', [], false, 15],
  ['zoom_child', 'tests/zoom_child.js', [], false, 25], ['zoom_sweep', 'tests/zoom_sweep.js', ['--noshots'], false, 30],
];
const argv = process.argv.slice(2);
const jIdx = argv.indexOf('-j'), J = jIdx >= 0 ? Math.max(1, +argv[jIdx + 1] || 3) : 3;
const filtArg = argv.filter((a, i) => a !== '-j' && i !== jIdx + 1)[0];
const filt = filtArg ? new RegExp(filtArg) : null;
const BAD = /(?<!\b0 )\bFAIL|✗|Uncaught|TypeError|ReferenceError|errors?\s*[:=]?\s*\[?\s*[1-9]|"errors":\s*[1-9]|"errors":\s*\[\s*"/;
const PERF = new Set(['core_w2', 'world_walk', 'v4_wpg', 'fauna_gates', 'density']);   // frame cost / frame time: run alone
const rows = [];
const runOne = ([name, file, args, legacy, min]) => new Promise(done => {
  const t0 = Date.now();
  const ch = spawn('node', [file, ...args], { cwd: ROOT });
  let buf = '', killed = false;
  ch.stdout.on('data', d => { buf += d; }); ch.stderr.on('data', d => { buf += d; });
  const tm = setTimeout(() => { killed = true; ch.kill('SIGKILL'); }, (min || 10) * 60000);
  ch.on('close', code => {
    clearTimeout(tm);
    const out = buf.trim().split('\n');
    const tail = out.slice(-3).join(' ⏎ ').replace(/\s+/g, ' ').slice(0, 260);
    const bad = code !== 0 || killed || out.slice(-12).some(l => BAD.test(l));
    const st = killed ? 'TIMEOUT' : bad ? (legacy ? 'legacy' : 'CHECK') : 'ok';   // legacy: v1 dollhouse checks (overview, lift drop-in) that v2 replaced on purpose
    const row = { name, st, s: Math.round((Date.now() - t0) / 1000), tail };
    rows.push(row);
    console.log(`${st.padEnd(7)} ${name.padEnd(14)} ${String(row.s).padStart(4)}s  ${tail}`);
    done(row);
  });
});
(async () => {
  const T0 = Date.now();
  const sel = GATES.filter(g => !filt || filt.test(g[0]));
  const par = sel.filter(g => !PERF.has(g[0])), ser = sel.filter(g => PERF.has(g[0]));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(J, par.length) }, async () => { while (next < par.length) await runOne(par[next++]); }));
  for (const g of ser) await runOne(g);
  const order = sel.map(g => g[0]); rows.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const n = s => rows.filter(r => r.st === s).length;
  console.log(`\nGATES: ${n('ok')} ok, ${n('CHECK')} to check, ${n('TIMEOUT')} timeout, ${n('legacy')} legacy (of ${rows.length}) in ${Math.round((Date.now() - T0) / 60000)} min with -j ${J}`);
  rows.filter(r => r.st === 'CHECK' || r.st === 'TIMEOUT').forEach(r => console.log(`${r.st.padEnd(7)} ${r.name.padEnd(14)} ${String(r.s).padStart(4)}s  ${r.tail}`));
  try { fs.writeFileSync(path.join(ROOT, '_dev', 'reports', 'gates2_last.json'), JSON.stringify({ when: new Date().toISOString(), J, rows }, null, 1)); } catch (e) {}
})();
