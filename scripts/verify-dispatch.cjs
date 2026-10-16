const { app, nativeTheme } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const demo = process.env.EXCAVATOR_DISPATCH_DEMO === '1';
const output = process.env.EXCAVATOR_DISPATCH_OUTPUT;
assert(process.env.EXCAVATOR_USER_DATA && path.basename(process.env.EXCAVATOR_USER_DATA).startsWith('exc-dispatch-'), 'Only an isolated test profile may run this script');
nativeTheme.themeSource = 'light';
const errors = [];
app.on('browser-window-created', (_e, win) => {
  if (!demo) win.hide();
  win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (details) => { if (details.level === 'error') errors.push(details.message); });
});
require('../electron/main.cjs');
const ctx = require('../electron/context.cjs');
const backend = require('../electron/server.cjs');
const { openGarage } = require('../electron/windows.cjs');
const { updateSettings } = require('../electron/settings.cjs');
async function until(check) {
  for (let i = 0; i < 300; i++) { if (await check()) return; await wait(50); }
  throw new Error('Timed out waiting for dispatch UI');
}
(async () => {
  await app.whenReady();
  await until(() => ctx.win && ctx.gameState && !ctx.win.webContents.isLoading());
  openGarage('garage');
  await until(() => ctx.garageWin && !ctx.garageWin.webContents.isLoading());
  const g = ctx.garageWin.webContents;
  const p = ctx.win.webContents;
  const js = (code) => g.executeJavaScript(code);
  const scene = (code) => p.executeJavaScript(code);
  await until(() => js('!!document.querySelector("[data-site=yard]")'));
  await until(() => scene('!!window.__excavator?.sprite'));
  const replace = async (state) => {
    const result = await backend.call('/admin/replace', { method: 'POST', body: JSON.stringify({ state }) });
    assert.equal(result.status, 200);
    return result.json();
  };
  // Existing game art and production renderer, deterministic test rewards only.
  await replace({ ...ctx.gameState, name: '派遣測試', coins: 120, xp: 0, durability: 100, owned: [...ctx.gameState.owned, 'stick_long', 'acc_beacon'], equipped: { ...ctx.gameState.equipped, stick: 'stick_long' } });
  await until(() => js('document.querySelector("#pet-name").value === "派遣測試"'));
  await js(`const badge = document.createElement('div'); badge.textContent = '派遣驗收演示 · 獨立存檔 · 測試已加速計時'; badge.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:50;background:#283b35;color:white;text-align:center;font-size:12px;padding:5px;pointer-events:none'; document.body.append(badge);`);
  ctx.garageWin.setTitle('派遣驗收演示 — 不影響正式存檔');
  const focusJobs = () => js('document.querySelector("#jobs").closest("section").scrollIntoView(); window.scrollBy(0,-38)');
  const shot = async (name) => { await wait(250); fs.writeFileSync(path.join(output, `${name}.png`), (await g.capturePage()).toPNG()); };
  await focusJobs(); await shot('01-sites');
  await js('document.querySelector("[data-site=yard]").click()');
  assert(await js('document.querySelector("#job-confirm").open'));
  assert(await js('document.querySelector("#job-confirm-body").textContent.includes("×1.15")'));
  await shot('02-confirm');
  await js('document.querySelector("#job-depart").click(); document.querySelector("#job-depart").click()');
  await until(() => ctx.gameState.job && js('!!document.querySelector("[data-job=cancel]")'));
  const original = ctx.gameState.job;
  assert.equal(original.equippedSnapshot.stick, 'stick_long');
  assert.equal((await js('window.api.requestAction({type:"claim",jobId:' + JSON.stringify(original.id) + '})')).ok, false);
  await until(() => scene('window.__excavator.debugState().state === "working"'));
  await focusJobs(); await shot('03-running');
  const now = Date.now();
  await replace({ ...ctx.gameState, job: { ...original, start: now - 299_000, end: now + 1000, rolls: [0.5, 0.5, 0.99, 0.01, 0, 0.99, 0, 0.99, 0, 0.99, 0] } });
  await until(() => js('!!document.querySelector("[data-job=claim]")'));
  await until(() => scene('window.__excavator.debugState().state === "waiting"'));
  const before = ctx.gameState.coins;
  await wait(1200);
  assert.equal(ctx.gameState.coins, before);
  assert(ctx.gameState.job, 'scene must not claim automatically');
  assert.equal(await js('!!document.querySelector("[data-job=cancel]")'), false);
  await focusJobs(); await shot('04-ready');
  // Capture the existing 2D pet and its actual completion label.
  const crop = await scene(`(() => { const s=window.__excavator.sprite; return {x:Math.max(0,Math.floor(s.x-190)),y:Math.max(0,Math.floor(s.y-220)),width:380,height:220}; })()`);
  fs.writeFileSync(path.join(output, '05-pet-ready.png'), (await p.capturePage(crop)).toPNG());
  // The real save writer fails; UI must retain the claim button and show a failure, not a success.
  const blocked = path.join(app.getPath('userData'), 'state.json.tmp');
  fs.mkdirSync(blocked);
  await js('document.querySelector("[data-job=claim]").click()');
  await until(() => js('document.querySelector("#job-message").textContent.includes("存檔失敗")'));
  assert.equal(ctx.gameState.coins, before);
  assert(ctx.gameState.job);
  fs.rmdirSync(blocked);
  await js('document.querySelector("[data-job=claim]").click(); document.querySelector("[data-job=claim]")?.click()');
  await until(() => !ctx.gameState.job && js('!!document.querySelector(".reward-grid")'));
  const paid = ctx.gameState.coins;
  assert.equal(ctx.gameState.report.breakdown.duplicates, 25);
  assert.equal(paid - before, ctx.gameState.report.coins);
  assert.equal((await js('window.api.requestAction({type:"claim",jobId:' + JSON.stringify(original.id) + '})')).ok, true);
  assert.equal(ctx.gameState.coins, paid);
  await focusJobs(); await shot('06-result');
  // Reload both renderers; the result must survive and not be paid again.
  g.reload(); p.reload();
  await until(() => !g.isLoading() && !p.isLoading());
  await until(() => js('!!document.querySelector(".reward-grid")'));
  assert.equal(ctx.gameState.coins, paid);
  // Away mode returns when due without claiming; use debug placement only to avoid a long walk in tests.
  updateSettings({ jobMode: 'away' });
  await js('window.api.requestAction({type:"startJob",site:"yard"})');
  await until(() => ctx.gameState.job);
  const awayJob = ctx.gameState.job;
  await scene('window.__excavator.state="away"; window.__excavator.sprite.setVisible(false); void 0');
  await replace({ ...ctx.gameState, job: { ...awayJob, start: Date.now() - 301_000, end: Date.now() - 1000 } });
  await until(() => scene('window.__excavator.debugState().state === "return"'));
  await scene('window.__excavator.sprite.x = window.__excavator.targetX');
  await until(() => scene('window.__excavator.debugState().state === "waiting"'));
  assert(ctx.gameState.job);
  assert.equal(ctx.gameState.coins, paid);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS Dispatch Electron: confirm, double-click guard, fixed equipment, timer, manual claim, failed-save UI, retry, breakdown, reload and away-mode return');
  console.log(`Screenshots: ${output}`);
  if (demo) {
    updateSettings({ jobMode: 'stay' });
    ctx.garageWin.show(); ctx.garageWin.focus();
    await js(`const badge=document.createElement('div'); badge.textContent='驗收演示 · 獨立測試存檔 · 可直接領取，不影響正式進度'; badge.style.cssText='position:fixed;top:0;left:0;right:0;z-index:50;background:#283b35;color:white;text-align:center;font-size:12px;padding:5px'; document.body.append(badge)`);
    ctx.garageWin.setTitle('派遣驗收演示 — 不影響正式存檔');
    await focusJobs();
    console.log('Demo ready: a completed job is waiting for your manual claim. Close via the tray Quit command.');
  } else app.quit();
})().catch((err) => { console.error(err); app.exit(1); });
