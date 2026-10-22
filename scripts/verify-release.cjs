const { app, dialog, nativeTheme } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { bannerScript } = require('./demo-banner.cjs');
const dir = process.env.EXCAVATOR_USER_DATA;
assert(path.basename(dir ?? '').startsWith('exc-release-'), 'Isolated test profile required');
const root = process.env.EXCAVATOR_TEST_ROOT;
const version = require(path.join(root, 'package.json')).version;
const output = process.env.EXCAVATOR_RELEASE_OUTPUT;
const phase = process.env.EXCAVATOR_RELEASE_PHASE;
const demo = phase === 'demo';
const errors = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
nativeTheme.themeSource = 'light';
app.on('browser-window-created', (_e, win) => {
  win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (d) => { if (d.level === 'error') errors.push(d.message); });
  win.webContents.on('render-process-gone', (_event, details) => errors.push(JSON.stringify(details)));
  if (demo) win.webContents.on('did-finish-load', () => {
    if (!win.webContents.getURL().includes('/garage.html')) return;
    win.setTitle(`${version} 發佈驗收 — 獨立新存檔`);
    win.webContents.executeJavaScript(bannerScript(`${version} 發佈驗收 · 獨立新存檔 · 新經濟規則，派遣使用正式時間`)).catch(console.error);
  });
});
require(path.join(root, 'electron/main.cjs'));
const ctx = require(path.join(root, 'electron/context.cjs'));
const backend = require(path.join(root, 'electron/server.cjs'));
const { openGarage } = require(path.join(root, 'electron/windows.cjs'));
async function until(fn) {
  for (let i = 0; i < 400; i++) { if (await fn()) return; await wait(50); }
  throw Error(`Release phase ${phase} timed out`);
}
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
let g;
(async () => {
  await app.whenReady();
  await until(() => ctx.win && ctx.gameState && !ctx.win.webContents.isLoading());
  await until(() => ctx.win.webContents.executeJavaScript('!!window.__excavator?.sprite'));
  if (!demo) {
    await ctx.win.webContents.executeJavaScript('window.__excavator.scene.pause(); true');
    ctx.win.hide();
  }
  openGarage(phase === 'new' || demo ? 'welcome' : 'garage');
  await until(() => ctx.garageWin && !ctx.garageWin.webContents.isLoading());
  g = ctx.garageWin.webContents;
  const js = (code) => g.executeJavaScript(code);
  const click = (selector) => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await until(() => js('document.querySelector("#skin").options.length >= 3'));
  const shot = async (name) => {
    await wait(300);
    const image = await g.capturePage(undefined, { stayAwake: true });
    assert(!image.isEmpty()); fs.writeFileSync(path.join(output, `${phase}-${name}.png`), image.toPNG());
  };
  const replace = async (state) => {
    const r = await backend.call('/admin/replace', { method: 'POST', body: JSON.stringify({ state }) });
    assert.equal(r.status, 200);
    await until(() => js(`window.api.getState().then(s=>s.coins===${state.coins} && s.durability===${state.durability})`));
    await wait(150);
  };
  const request = (action) => js(`window.api.requestAction(${JSON.stringify(action)})`);
  const closeResult = async () => js('document.querySelector("#dispatch-result").close()');
  if (demo) {
    await js(bannerScript(`${version} 發佈驗收 · 獨立新存檔 · 已接入新經濟規則，派遣使用正式時間`));
    ctx.garageWin.setTitle(`${version} 發佈驗收 — 新玩家完整流程`);
    ctx.garageWin.show(); ctx.garageWin.focus();
    console.log('Demo ready: isolated fresh onboarding, production economy v2, normal dispatch time. Close via tray to exit.');
    return;
  }
  if (phase === 'new') {
    assert.equal(ctx.gameState.coins, 20); assert.equal(ctx.gameState.xp, 0);
    assert(await js('!document.querySelector("#view-welcome").hidden'));
    await js('document.querySelector("#welcome-name").value="發佈驗收"');
    await shot('welcome'); await click('#welcome-start');
    await until(() => !ctx.garageWin && ctx.gameState.name === '發佈驗收');
    assert.equal(ctx.settings.onboarding, 'poke');
    openGarage('garage'); await until(() => ctx.garageWin && !ctx.garageWin.webContents.isLoading());
    g = ctx.garageWin.webContents;
    await until(() => js('!!document.querySelector("[data-site=yard]")'));
    assert(await js('document.querySelector("[data-site=yard]").closest("article").textContent.includes("12–32")'));
    assert(await js('document.querySelector("[data-site=quarry]").disabled'));
    // Full UI purchase route; only elapsed time and fixed dice use isolated admin fixtures.
    for (let i = 0; i < 10 && ctx.gameState.coins < 150; i++) {
      await click('[data-site=yard]');
      assert(await js('document.querySelector("#job-confirm-body").textContent.includes("12–32")'));
      await click('#job-depart'); await until(() => !!ctx.gameState.job);
      assert.equal(ctx.gameState.job.rulesVersion, 3);
      const current = ctx.gameState;
      await replace({ ...current, job: { ...current.job, start: Date.now() - 301000, end: Date.now() - 1000,
        rolls: [0.5, 0.5, 0.99, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0] } });
      await until(() => js('!!document.querySelector("[data-job=claim]")'));
      await click('[data-job=claim]'); await until(() => !ctx.gameState.job);
      assert.equal(ctx.gameState.report.breakdown.base, 22);
      await closeResult();
      for (const id of ['level-2', 'level-3']) {
        const result = await request({ type: 'claimGrowth', id });
        if (result.ok) assert(ctx.gameState.growthClaimed.includes(id));
      }
      await click('#repair'); await until(() => ctx.gameState.durability === 100);
    }
    assert(ctx.gameState.coins >= 150);
    await click('[data-slot=machine]'); await click('[data-open-part=m_mini]');
    const before = ctx.gameState.coins;
    await click('#part-apply');
    await until(() => ctx.gameState.equipped.machine === 'm_mini');
    assert.equal(ctx.gameState.coins, before - 150);
    await until(() => js('document.querySelector("#part-detail").textContent.includes("已裝備")'));
    await shot('purchase'); await click('#part-close');
    // Repair escape hatch: production UI, real server cooldown, no coin grant.
    await replace({ ...ctx.gameState, durability: 7, coins: 0 });
    assert(await js('document.querySelector("[data-site=yard]").disabled'));
    assert.equal((await request({ type: 'startJob', site: 'yard' })).ok, false);
    await click('#free-rest'); await until(() => ctx.gameState.durability === 8);
    await click('#free-rest'); assert.equal(ctx.gameState.coins, 0);
    assert(await js('!document.querySelector("[data-site=yard]").disabled'));
    const d = ctx.gameState.durability; await wait(3200); assert.equal(ctx.gameState.durability, d);
    await click('[data-site=yard]');
    await replace({ ...ctx.gameState, durability: 7 });
    await click('#job-depart');
    assert.equal(ctx.gameState.job, null);
    assert(await js('document.querySelector("#job-confirm-error").textContent.includes("耐久已不足")'));
    await click('#job-back');
    ctx.garageWin.setContentSize(380, 760); await js('window.scrollTo(0,0)');
    assert(await js('document.documentElement.scrollWidth<=innerWidth')); await shot('narrow');
    ctx.garageWin.setContentSize(580, 780);
    // Exercise real preload/IPC save management; dialogs resolve only to this profile.
    const exportPath = path.join(dir, 'export.json');
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: exportPath });
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [exportPath] });
    dialog.showMessageBox = async () => ({ response: 1 });
    assert((await js('window.api.exportSave()')).ok);
    const exported = read('export.json').state;
    assert((await js('window.api.resetSave()')).ok); assert.equal(ctx.gameState.coins, 20);
    assert((await js('window.api.importSave()')).ok);
    for (const k of ['coins', 'owned', 'equipped', 'growthClaimed', 'xp']) assert.deepEqual(ctx.gameState[k], exported[k]);
    assert(fs.readdirSync(path.join(dir, 'backups')).length >= 2);
    write('export.json', { broken: true });
    assert.equal((await js('window.api.importSave()')).ok, false);
    assert.deepEqual(ctx.gameState.owned, exported.owned);
    // Seed a genuine v1 job for the next process to migrate/settle.
    const legacy = ctx.rules.reduce({ ...ctx.rules.normalize(null), coins: 137, durability: 1 },
      { type: 'startJob', site: 'yard', id: 'release-legacy', now: Date.now() - 301000, rolls: Array(11).fill(0.99) }, 1);
    await replace(legacy); write('expected.json', { job: legacy.job, coins: legacy.coins });
    await js('window.api.setSettings({onboarding:"done",scale:2,notify:false})');
    await until(() => ctx.settings.scale === 2);
    console.log('PASS Release new player: welcome, real v2 dispatch, growth, purchase, free recovery, narrow UI, export/reset/import and invalid import');
  } else {
    const expected = read('expected.json');
    assert.deepEqual(ctx.gameState.job, expected.job); assert.equal(ctx.gameState.coins, expected.coins);
    assert.equal(ctx.settings.scale, 2); assert.equal(ctx.settings.onboarding, 'done');
    if (phase === 'legacy') {
      assert(await js('document.querySelector("#jobs").textContent.includes("保留原版")'));
      assert((await request({ type: 'claim', jobId: expected.job.id })).ok);
      assert.equal(ctx.gameState.report.breakdown.base, 30); assert.equal(ctx.gameState.durability, 1);
      const seed = ctx.rules.reduce({ ...ctx.rules.normalize(null), durability: 8, coins: 100 },
        { type: 'startJob', site: 'yard', id: 'release-current', now: Date.now() - 301000, rolls: Array(11).fill(0.99) });
      assert.equal(seed.job.rulesVersion, 3);
      await replace(seed); write('expected.json', { job: seed.job, coins: seed.coins });
      console.log('PASS Release migration: legacy job, original reward/durability, settings and exact saved dice survive process restart');
    } else {
      assert.equal(expected.job.rulesVersion, 3);
      assert((await request({ type: 'claim', jobId: expected.job.id })).ok);
      const coins = ctx.gameState.coins;
      assert.equal(ctx.gameState.report.breakdown.base, 32); assert.equal(ctx.gameState.durability, 0);
      assert((await request({ type: 'claim', jobId: expected.job.id })).ok); assert.equal(ctx.gameState.coins, coins);
      assert(await js('document.querySelector("[data-site=yard]").disabled'));
      await js('document.querySelector("#jobs").scrollIntoView()'); await shot('v2-result');
      nativeTheme.themeSource = 'dark'; await shot('dark');
      const metrics = [];
      // Short idle sampling, not a long-term stability or leak certification.
      await ctx.win.webContents.executeJavaScript('window.__excavator.scene.resume(); true');
      for (let i = 0; i < 10; i++) { await wait(1000); metrics.push({ at: Date.now(), processes: app.getAppMetrics() }); }
      fs.writeFileSync(path.join(output, root.endsWith('.asar') ? 'packaged-metrics.json' : 'source-metrics.json'), JSON.stringify(metrics, null, 2));
      console.log('PASS Release v2 restart: exact job retained, one settlement, low-durability gates and 10-second runtime sample without renderer crash');
    }
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  app.quit();
})().catch(async (error) => {
  console.error(error);
  if (g && !g.isDestroyed()) try { fs.writeFileSync(path.join(output, `failure-${phase}.png`), (await g.capturePage()).toPNG()); } catch {}
  app.exit(1);
});
