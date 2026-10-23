// Launches the actual packaged executable, not an alternate Electron main script.
// Test-only localhost CDP; no installer, registry change, system clock change or real save access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { normalize, reduce } from '../src/shared/reducer.mjs';

const exe = path.resolve('release/win-unpacked/Excavator.exe');
assert(fs.existsSync(exe), 'Run npm run pack or dist first');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-exe-'));
const output = path.resolve('artifacts/release'); fs.mkdirSync(output, { recursive: true });
const file = path.join(dir, 'state.json');
const settingsFile = path.join(dir, 'settings.json');
const seed = reduce(normalize({ schemaVersion: 3, coins: 120, xp: 68, growthClaimed: ['level-2'], name: 'EXE驗收' }),
  { type: 'startJob', site: 'yard', id: 'exe-ready-job', now: Date.now() - 301000, rolls: [0.5, 0.5, 0.99, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0] });
fs.writeFileSync(file, JSON.stringify(seed));
fs.writeFileSync(settingsFile, JSON.stringify({ onboarding: 'done', petVisible: false, autoStart: true, notify: false, chatter: 'off' }));
const env = { ...process.env, EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1' };
for (const key of ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL']) delete env[key];
let child, exitPromise, cdp;
const archive = path.join(path.dirname(exe), 'resources/app.asar');
const errors = [], evidence = { executable: exe, profile: dir,
  archiveSha256: createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),
  exeSha256: createHash('sha256').update(fs.readFileSync(exe)).digest('hex'),
  startedAt: new Date().toISOString(), checks: [], samples: [] };
const mark = (name) => { evidence.checks.push(name); console.log('PASS EXE ' + name); };
async function until(check, label) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await wait(100); }
  throw Error('Timed out: ' + label);
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(String(e.data));
      if (m.id) { const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); }
      else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Inspector.targetCrashed') errors.push(m.params);
    });
    ws.addEventListener('close', () => { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(Error('CDP closed')); } this.pending.clear(); });
  }
  call(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async eval(sessionId, expression) {
    const r = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
}
async function launch() {
  let stderr = '';
  child = spawn(exe, ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  exitPromise = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code)); });
  child.stderr.on('data', (bytes) => { stderr += bytes.toString(); });
  child.stdout.resume();
  await until(() => /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/.test(stderr), 'packaged debug endpoint');
  const endpoint = stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/)[1];
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  cdp = new CDP(ws);
  let targets;
  await until(async () => { targets = (await cdp.call('Target.getTargets')).targetInfos; return targets.some((t) => t.url.includes('/index.html')); }, 'pet renderer');
  const attach = async (target) => {
    const { sessionId } = await cdp.call('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    await cdp.call('Runtime.enable', {}, sessionId); return sessionId;
  };
  const pet = await attach(targets.find((t) => t.url.includes('/index.html')));
  await until(() => cdp.eval(pet, '!!window.__excavator?.sprite'), 'pet boot');
  await cdp.eval(pet, 'window.__excavator.scene.pause(); window.api.openGarage("garage"); true');
  await until(async () => { targets = (await cdp.call('Target.getTargets')).targetInfos; return targets.some((t) => t.url.includes('/garage.html')); }, 'garage renderer');
  const garage = await attach(targets.find((t) => t.url.includes('/garage.html')));
  await until(() => cdp.eval(garage, '!!document.querySelector("[data-job]")'), 'garage boot');
  return { pet, garage, js: (expression) => cdp.eval(garage, expression) };
}
async function close() {
  try { await cdp.call('Browser.close'); } catch (error) { if (!/closed/i.test(error.message)) throw error; }
  const result = await Promise.race([exitPromise, wait(15000, undefined, { ref: false }).then(() => 'timeout')]);
  assert.equal(result, 0, 'Actual EXE must exit cleanly and flush saves');
  cdp.ws.close(); child = null;
}
try {
  console.log('Isolated real EXE test: ' + dir);
  let run = await launch();
  const js = (expression) => run.js(expression);
  const state = () => js('window.api.getState()');
  assert((await cdp.call('Browser.getVersion')).product.includes('Chrome/'));
  assert.equal(await js('typeof require'), 'undefined');
  assert.equal((await js('window.api.getSettings()')).autoStartSupported, false);
  await js('window.api.setSettings({autoStart:true}); true'); await wait(400);
  assert.equal((await js('window.api.getSettings()')).autoStart, false);
  assert.deepEqual((await state()).jobs[0], seed.jobs[0]);
  mark('actual packaged renderer/preload/backend boot and isolated autostart disabled');
  evidence.displays = await js('window.api.getDisplays()');
  // No public network used. Emulate offline only for the renderer, not the OS adapter.
  await cdp.call('Network.enable', {}, run.garage);
  await cdp.call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, run.garage);
  assert.equal((await state()).name, 'EXE驗收');
  const request = (action) => js(`window.api.requestAction(${JSON.stringify(action)})`);
  // Deliberately block only this temporary profile's atomic-write path.
  await wait(400); fs.mkdirSync(file + '.tmp');
  assert.equal((await request({ type: 'claim', jobId: seed.jobs[0].id })).ok, false);
  assert.equal((await state()).coins, 120); assert.deepEqual((await state()).jobs[0], seed.jobs[0]);
  fs.rmdirSync(file + '.tmp');
  assert((await request({ type: 'claim', jobId: seed.jobs[0].id })).ok);
  assert.equal((await state()).coins, 142); assert.equal((await state()).xp, 80);
  assert((await request({ type: 'claimGrowth', id: 'level-3' })).ok);
  assert((await request({ type: 'buy', id: 'm_mini' })).ok);
  assert.equal((await state()).coins, 22);
  mark('offline-renderer IPC, failed claim preserves state, retry, growth and purchase');
  fs.mkdirSync(file + '.tmp');
  await js('window.api.dispatch({type:"rename",name:"寫入恢復"}); true');
  await until(async () => (await state()).name === '寫入恢復', 'rename in memory');
  await wait(500);
  assert.notEqual(JSON.parse(fs.readFileSync(file)).name, '寫入恢復');
  fs.rmdirSync(file + '.tmp');
  await until(() => JSON.parse(fs.readFileSync(file)).name === '寫入恢復', 'delayed retry without new action');
  mark('ordinary save retries automatically after temporary write failure');
  await js('window.api.setSettings({scale:2}); true'); await wait(400);
  fs.mkdirSync(settingsFile + '.tmp');
  await js('window.api.setSettings({scale:4}); true'); await wait(500);
  assert.equal(JSON.parse(fs.readFileSync(settingsFile)).scale, 2);
  fs.rmdirSync(settingsFile + '.tmp');
  await until(() => JSON.parse(fs.readFileSync(settingsFile)).scale === 4, 'settings write retry');
  mark('settings retry preserves prior file and saves latest preference');
  // A short real render loop sample under production throttling settings; not a soak test.
  await cdp.eval(run.pet, 'window.__excavator.scene.resume(); true');
  for (const visible of [true, false]) {
    await js(`window.api.setSettings({petVisible:${visible}}); true`);
    for (let i = 0; i < 15; i++) {
      await wait(2000);
      evidence.samples.push({ at: Date.now(), petVisible: visible,
        processes: (await cdp.call('SystemInfo.getProcessInfo')).processInfo,
        heap: (await cdp.call('Runtime.getHeapUsage', {}, run.pet)) });
    }
    console.log(`EXE sample complete: pet ${visible ? 'visible' : 'hidden'}, 30 seconds`);
  }
  mark('30 seconds visible and 30 seconds hidden render sampling without uncaught exceptions');
  await cdp.eval(run.pet, 'window.__excavator.scene.pause(); true');
  await js('document.querySelector("[data-view=settings]").click(); document.querySelector("#autostart-note").scrollIntoView(); true');
  const screen = await cdp.call('Page.captureScreenshot', {}, run.garage);
  fs.writeFileSync(path.join(output, 'exe-settings.png'), Buffer.from(screen.data, 'base64'));
  assert((await request({ type: 'startJob', site: 'yard' })).ok);
  const beforeRestart = await state();
  await close();
  assert.deepEqual(JSON.parse(fs.readFileSync(file)).jobs[0], beforeRestart.jobs[0]);
  run = await launch();
  assert.deepEqual((await state()).jobs[0], beforeRestart.jobs[0]);
  for (const k of ['coins', 'xp', 'owned', 'equipped', 'growthClaimed', 'name']) assert.deepEqual((await state())[k], beforeRestart[k]);
  assert.equal((await js('window.api.getSettings()')).scale, 4);
  mark('real EXE quit/relaunch preserves pending job, dice, purchased machine, growth and settings');
  await close();
  // Corrupt main JSON only after clean quit. The valid backup must be read on next boot.
  const fallback = JSON.parse(fs.readFileSync(path.join(dir, 'state.bak.json')));
  fs.writeFileSync(file, '{broken');
  run = await launch();
  for (const k of ['coins', 'owned', 'equipped', 'growthClaimed', 'xp', 'name']) assert.deepEqual((await state())[k], fallback[k]);
  mark('corrupt primary save recovers from its last valid backup (not guaranteed latest state)');
  await close(); assert.equal(errors.length, 0, JSON.stringify(errors));
  const log = fs.readFileSync(path.join(dir, 'logs/app.log'), 'utf8');
  assert.doesNotMatch(log, /renderer-error|main-error|main-rejection/);
  assert.match(log, /state-save-failed/); assert.match(log, /settings-save-failed/);
  evidence.finishedAt = new Date().toISOString(); evidence.result = 'passed';
  fs.writeFileSync(path.join(output, 'exe-results.json'), JSON.stringify(evidence, null, 2));
  fs.rmSync(dir, { recursive: true, force: true });
} catch (error) {
  console.error(error); evidence.result = 'failed'; evidence.error = String(error);
  fs.writeFileSync(path.join(output, 'exe-results.json'), JSON.stringify(evidence, null, 2));
  // Only terminate the process tree created by this test, never a name-wide kill.
  if (child && child.exitCode === null) try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {}
  cdp?.ws.close(); console.error('Test profile retained: ' + dir); process.exitCode = 1;
}
