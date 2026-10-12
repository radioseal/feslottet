/* Feslottet copy (WebGL via swiftshader). Minimal Chrome DevTools Protocol driver (no dependencies; Node ≥ 22 for global WebSocket/fetch).
 *   const { launch } = require('../tools/cdp');
 *   const b = await launch();                       // headless Chrome, throwaway profile in /private/tmp
 *   await b.open('Glittergruva.html#seed=7&fast');     // path relative to the game root, or a full URL
 *   await b.eval('G.UI.current');  await b.clickSel('.start-spill');  b.errors  // console errors + exceptions
 *   await b.close();
 * Clicks are real Input.dispatchMouseEvent events (count as user gestures). */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Browser lock (wave A, 11.10.): with FES_LOCK=1 (or a lock dir path) only one headless Chrome runs at a time across all agents –
   a mkdir lock at _dev/v6/browser.lock holding the owner's pid; a lock whose pid is gone, or older than 30 min, is taken over. */
const LOCK = process.env.FES_LOCK ? (process.env.FES_LOCK === '1' ? path.join(ROOT, '_dev', 'v6', 'browser.lock') : process.env.FES_LOCK) : null;
let lockHeld = false;
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
async function lockAcquire() {
  if (!LOCK || lockHeld) return;
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  let said = false;
  for (;;) {
    try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid)); lockHeld = true; return; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let pid = 0, age = 0; try { pid = +fs.readFileSync(path.join(LOCK, 'pid'), 'utf8'); age = Date.now() - fs.statSync(LOCK).mtimeMs; } catch (e) { /* being written */ }
    if ((pid && !alive(pid)) || age > 30 * 60 * 1000) { try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch (e) {} continue; }
    if (!said) { said = true; console.error('[cdp] waiting for the browser lock (pid ' + pid + ')'); }
    await sleep(1000);
  }
}
function lockRelease() { if (!lockHeld) return; lockHeld = false; try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch (e) {} }
process.on('exit', lockRelease);

async function launch(opts) {
  opts = opts || {};
  await lockAcquire();
  let port = opts.port || 0;      // 0 = let Chrome pick a free port (read back from DevToolsActivePort) – no collisions between parallel tests
  const tmpBase = fs.existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir();
  const dir = fs.mkdtempSync(path.join(tmpBase, 'feslottet-chrome-'));
  const args = [
    '--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir,
    '--no-first-run', '--no-default-browser-check', (process.env.FES_SWIFTSHADER ? '--use-angle=swiftshader' : '--use-angle=metal'), '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=' + (opts.size || '1280,800'), 'about:blank'
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  const killer = () => { try { proc.kill(); } catch (e) {} };
  process.on('exit', killer); process.on('SIGINT', () => { killer(); process.exit(130); }); process.on('uncaughtException', e => { console.error(e); killer(); process.exit(1); });
  let wsUrl = null;
  for (let i = 0; i < 400 && !wsUrl; i++) {
    await sleep(100);
    if (!port) { try { port = +fs.readFileSync(path.join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { continue; } if (!port) continue; }
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const errors = [], logs = [];
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      return;
    }
    const p = msg.params || {};
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (p.args || []).map((a) => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      logs.push({ type: p.type, text });
      if (p.type === 'error' || p.type === 'assert') errors.push('console.' + p.type + ': ' + text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails || {};
      errors.push('exception: ' + ((d.exception && d.exception.description) || d.text) + ' @' + d.url + ':' + d.lineNumber);
    } else if (msg.method === 'Log.entryAdded' && p.entry && p.entry.level === 'error') {
      errors.push('log: ' + p.entry.text + (p.entry.url ? ' @' + p.entry.url : ''));
    }
    listeners.forEach((fn) => fn(msg));
  };
  // a reply that never comes (a stuck renderer) rejects after FES_SEND_MS (default 300 s) instead of hanging the test
  const SEND_MS = +(process.env.FES_SEND_MS || 300000);
  const send = (method, params) => new Promise((res0, rej0) => {
    const mid = ++id;
    const tm = setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej0(new Error('CDP timeout after ' + SEND_MS + ' ms: ' + method)); } }, SEND_MS);
    const res = v => { clearTimeout(tm); res0(v); }, rej = e => { clearTimeout(tm); rej0(e); };
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

  const b = {
    errors, logs, send,
    on: (fn) => listeners.push(fn),
    async open(rel, waitExpr) {
      const url = /^[a-z]+:/.test(rel) ? rel : 'file://' + path.join(ROOT, rel).split(path.sep).map((s, i) => i ? encodeURIComponent(s) : s).join('/').replace(/%23/, '#').replace(/%26/g, '&').replace(/%3D/g, '=');
      await send('Page.navigate', { url: 'about:blank' }); await sleep(50); // force a real reload even if only the #hash differs
      await send('Page.navigate', { url });
      await b.waitFor(waitExpr || 'window.F && F.booted === true', 60000);
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async waitFor(expr, ms) {
      const t0 = Date.now();
      while (Date.now() - t0 < (ms || 5000)) {
        try { if (await b.eval(`!!(${expr})`)) return true; } catch (e) { /* page loading */ }
        await sleep(50);
      }
      throw new Error('waitFor timeout: ' + expr);
    },
    async click(x, y) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse' });
      }
    },
    async clickSel(sel) {
      const r = await b.eval(`(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};})()`);
      if (!r) throw new Error('clickSel: not found ' + sel);
      await b.click(r.x, r.y);
    },
    // press, keep the button down for ms, release (hold-to-confirm buttons)
    async holdSel(sel, ms) {
      const r = await b.eval(`(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};})()`);
      if (!r) throw new Error('holdSel: not found ' + sel);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y, button: 'none', pointerType: 'mouse' });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
      await sleep(ms || 2200);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
    },
    async key(key, code) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key, text: key.length === 1 ? key : undefined });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key });
    },
    async keyDown(key, code) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key }); },
    async keyUp(key, code) { await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key }); },
    async type(text) { for (const ch of text) await b.key(ch); },
    async screenshot(file) {
      const jpg = /\.jpe?g$/i.test(file);
      const r = await send('Page.captureScreenshot', jpg ? { format: 'jpeg', quality: 80 } : { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async close() {
      try { ws.close(); } catch (e) {}
      proc.kill();
      await sleep(200);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
      lockRelease();
    }
  };
  return b;
}

module.exports = { launch, sleep, ROOT };
