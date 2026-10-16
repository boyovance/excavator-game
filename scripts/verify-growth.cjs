const { app, nativeTheme } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bannerScript } = require('./demo-banner.cjs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const demo = process.env.EXCAVATOR_GROWTH_DEMO === '1';
const output = process.env.EXCAVATOR_GROWTH_OUTPUT;
assert(path.basename(process.env.EXCAVATOR_USER_DATA ?? '').startsWith('exc-growth-ui-'), 'Test profile required');
const errors = [];
nativeTheme.themeSource = 'light';
app.on('browser-window-created', (_e, win) => {
  if (!demo) win.hide();
  win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (d) => { if (d.level === 'error') errors.push(d.message); });
});
require('../electron/main.cjs');
const ctx = require('../electron/context.cjs');
const { call } = require('../electron/server.cjs');
const { openGarage } = require('../electron/windows.cjs');
async function until(fn) {
  for (let i = 0; i < 300; i++) { if (await fn()) return; await wait(50); }
  throw Error('Timed out waiting for growth UI');
}
(async () => {
  await app.whenReady();
  await until(() => ctx.win && ctx.gameState && !ctx.win.webContents.isLoading());
  openGarage('garage');
  await until(() => ctx.garageWin && !ctx.garageWin.webContents.isLoading());
  const g = ctx.garageWin.webContents;
  const js = (code) => g.executeJavaScript(code);
  await until(() => js('!!document.querySelector("[data-growth-claim]")'));
  const replace = async (state) => {
    assert.equal((await call('/admin/replace', { method: 'POST', body: JSON.stringify({ state }) })).status, 200);
    await until(async () => (await js('window.api.getState()')).xp === state.xp);
    await wait(100);
  };
  const seed = ctx.rules.reduce(ctx.rules.normalize({ schemaVersion: 3, xp: 68, coins: 120, name: '成長測試', growthClaimed: ['level-2'] }),
    { type: 'startJob', site: 'yard', id: 'growth-demo-job', now: Date.now() - 301000, rolls: [0.5, 0.5, 0.99, 0, 0, 0.99, 0, 0.99, 0, 0.99, 0] });
  const badge = () => js(bannerScript('成長驗收 · 獨立存檔 · 派遣領收穫 → 升至 Lv.3 → 領取階段獎勵'));
  const scroll = (id) => js(`document.querySelector(${JSON.stringify(id)}).scrollIntoView({block:'start'})`);
  const shot = async (id) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await wait(300);
      try {
        const capture = await g.capturePage(undefined, { stayHidden: !demo, stayAwake: true });
        assert(!capture.isEmpty()); fs.writeFileSync(path.join(output, id + '.png'), capture.toPNG()); return;
      } catch (err) { if (attempt === 2) throw err; }
    }
  };
  // New-player gates and source information must agree.
  await replace({ ...ctx.rules.normalize(null), xp: 19 });
  assert(await js('document.querySelector("[data-site=yard]").disabled === false'));
  assert(await js('document.querySelector("[data-site=quarry]").disabled'));
  assert(await js('document.querySelector("[data-growth-claim=level-2]").disabled'));
  await js('document.querySelector("[data-slot=accessory]").click(); document.querySelector("[data-open-part=acc_gps]").click()');
  assert(await js('document.querySelector("[data-source-site=mine]").disabled'));
  assert(await js('document.querySelector("#part-detail-sources").textContent.includes("Lv.6 解鎖")'));
  await js('document.querySelector("#part-close").click()'); await wait(100);
  await replace({ ...ctx.rules.normalize(null), xp: 20 });
  assert(await js('!document.querySelector("[data-growth-claim=level-2]").disabled'));
  assert(await js('document.querySelector("[data-site=alley]").textContent === "機型不符"'));
  await replace(seed); await badge(); await scroll('#growth');
  assert(await js('document.querySelector(".growth-next").textContent.includes("12 經驗")'));
  await shot('01-next-goal');
  await js('document.querySelector("#growth-to-jobs").click()'); await wait(500);
  await js('document.querySelector("[data-job=claim]").click()');
  await until(() => ctx.gameState.xp === 80 && js('document.querySelector(".growth-summary strong").textContent === "Lv.3"'));
  assert.equal(ctx.gameState.xp, 80);
  assert(await js('document.querySelector("[data-site=quarry]").disabled === false'));
  assert(await js('document.querySelector("[data-site=river]").disabled'));
  assert(await js('document.querySelector("#growth-message").textContent.includes("升級至 Lv.3")'));
  await scroll('#growth'); await shot('02-level-up');
  const coins = ctx.gameState.coins;
  const blocked = path.join(app.getPath('userData'), 'state.json.tmp');
  fs.mkdirSync(blocked);
  await js('document.querySelector("[data-growth-claim=level-3]").click()');
  await until(() => js('document.querySelector("#growth-message").textContent.includes("存檔失敗")'));
  assert.equal(ctx.gameState.coins, coins); assert(!ctx.gameState.growthClaimed.includes('level-3'));
  fs.rmdirSync(blocked);
  await js('document.querySelector("[data-growth-claim=level-3]").click(); document.querySelector("[data-growth-claim=level-3]").click()');
  await until(() => js('document.querySelector("#growth-message").textContent.includes("已入帳並儲存")'));
  assert.equal(ctx.gameState.coins, coins + 30);
  assert(await js('document.querySelector("[data-growth-claim=level-3]").disabled'));
  await shot('03-reward-claimed');
  await new Promise((resolve) => { g.once('did-finish-load', resolve); g.reload(); });
  await until(() => js('document.querySelector("[data-growth-claim=level-3]")?.textContent.includes("已領取")'));
  assert.equal(ctx.gameState.coins, coins + 30);
  assert((await js('window.api.requestAction({type:"claimGrowth",id:"level-3"})')).ok);
  assert.equal(ctx.gameState.coins, coins + 30);
  console.log('PASS Growth UI: threshold, machine restrictions, source gate, dispatch level-up, unlock, save failure, retry, double-click and reload');
  const size = ctx.garageWin.getContentSize();
  ctx.garageWin.setContentSize(380, size[1]);
  await badge(); await scroll('#growth'); await wait(100);
  assert(await js('document.documentElement.scrollWidth <= innerWidth'));
  assert(await js('getComputedStyle(document.querySelector(".growth-stages")).gridTemplateColumns.split(" ").length === 1'));
  await shot('04-narrow');
  ctx.garageWin.setContentSize(...size);
  nativeTheme.themeSource = 'dark'; await scroll('#growth'); await shot('05-dark');
  nativeTheme.themeSource = 'light';
  await replace({ ...ctx.rules.normalize(null), xp: 500 });
  assert(await js('document.querySelector(".growth-next").textContent.includes("本版路線已完成")'));
  assert(await js('document.querySelectorAll("[data-growth-claim]:not(:disabled)").length === 5'));
  await replace(ctx.rules.normalize({ schemaVersion: 2, xp: 0, coins: 123, owned: ['stick_long'] }));
  assert(await js('!!document.querySelector(".growth-legacy")'));
  assert(await js('document.querySelector("[data-site=mine]").disabled === false'));
  assert(await js('document.querySelector("[data-growth-claim=level-2]").disabled'));
  assert(ctx.gameState.owned.includes('stick_long'));
  await scroll('#growth'); await shot('06-legacy');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS Growth UI: narrow/dark layouts, completed route, old-save access and collections');
  if (demo) {
    await replace(seed);
    // Reload clears test-only feedback so the acceptance demo starts clean.
    await new Promise((resolve) => { g.once('did-finish-load', resolve); g.reload(); });
    await until(() => js('!!document.querySelector("[data-growth-claim]")'));
    await badge(); await scroll('#growth');
    ctx.garageWin.setTitle('成長與解鎖驗收 — 獨立測試存檔'); ctx.garageWin.show(); ctx.garageWin.focus();
    console.log('Demo ready: visit dispatch and claim the completed yard job to reach level 3, then claim the 30-coin growth reward.');
  } else app.quit();
})().catch(async (err) => {
  console.error(err);
  if (ctx.garageWin) {
    try { fs.writeFileSync(path.join(output, 'failure.png'), (await ctx.garageWin.webContents.capturePage()).toPNG()); } catch {}
    console.error(await ctx.garageWin.webContents.executeJavaScript('document.querySelector("#growth-message")?.textContent'));
  }
  app.exit(1);
});
