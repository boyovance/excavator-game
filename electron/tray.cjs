const { app, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const ctx = require('./context.cjs');
const { dispatch } = require('./server.cjs');
const { updateSettings } = require('./settings.cjs');
const { openGarage } = require('./windows.cjs');

/** "1 份工作中 · 1 份待領取", or '' with nothing out. */
function jobSummary(jobs, now = Date.now()) {
  const ready = jobs.filter((j) => now >= j.end).length;
  const running = jobs.length - ready;
  return [running && `${running} 份工作中`, ready && `${ready} 份待領取`].filter(Boolean).join(' · ');
}

function buildMenu() {
  const { rules, gameState, settings, skins } = ctx;
  const cost = rules.repairCost(gameState.durability);
  const jobItems = gameState.jobs.flatMap((job) => [
        {
          label: `${rules.partName(job.machineId)}・${Date.now() >= job.end ? `工作完成：${rules.siteName(job.site)}，待領取` : `工作中:${rules.siteName(job.site)},剩餘 ${Math.max(0, Math.ceil((job.end - Date.now()) / 60000))} 分鐘`}`,
          enabled: false,
        },
        Date.now() >= job.end
          ? { label: '到車庫領取收穫', click: () => openGarage('garage') }
          : { label: '召回(放棄這次收穫)', click: async () => {
              const { response } = await dialog.showMessageBox({ type: 'question', message: '召回會放棄本次收穫，確定召回？', buttons: ['繼續工作', '確認召回'], defaultId: 0, cancelId: 0 });
              if (response === 1) {
                const result = await dispatch({ type: 'cancelJob', jobId: job.id });
                if (!result.ok) await dialog.showMessageBox({ type: 'warning', message: result.message });
              }
            } },
      ]);
  return Menu.buildFromTemplate([
    {
      label: `${gameState.name} Lv.${rules.levelInfo(gameState.xp).level}　陪伴 ${rules.companionDays(gameState)} 天　金幣:${gameState.coins}　耐久:${Math.round(gameState.durability)}%`,
      enabled: false,
    },
    ...(jobItems.length ? [{ label: `派遣：${jobSummary(gameState.jobs)}`, enabled: false }] : []),
    ...jobItems,
    {
      label: cost > 0 ? `維修(${cost} 金幣)` : '狀態良好',
      enabled: cost > 0 && gameState.coins >= cost,
      click: () => dispatch({ type: 'repair' }),
    },
    ...(settings.onboarding === 'done' || settings.onboarding === 'welcome'
      ? []
      : [{ label: '略過新手引導', click: () => updateSettings({ onboarding: 'done' }) }]),
    { label: '打開車庫…', click: () => openGarage('garage') },
    { label: '設定…', click: () => openGarage('settings') },
    {
      label: '顯示寵物',
      type: 'checkbox',
      checked: settings.petVisible,
      click: (item) => updateSettings({ petVisible: item.checked }),
    },
    { type: 'separator' },
    { label: '立即挖掘', click: () => ctx.win && ctx.win.webContents.send('dig-now') },
    {
      label: '做個動作',
      submenu: [
        ['伸懶腰', 'stretch'],
        ['揮揮手', 'wave'],
        ['檢查零件', 'tinker'],
        ['東張西望', 'look'],
        ['跳一下', 'hop'],
      ].map(([label, name]) => ({
        label,
        click: () => ctx.win && ctx.win.webContents.send('play-action', name),
      })),
    },
    { type: 'separator' },
    {
      label: '風格',
      submenu: skins.map((s) => ({
        label: s.name,
        type: 'radio',
        checked: s.id === settings.skin,
        click: () => updateSettings({ skin: s.id }),
      })),
    },
    {
      label: '大小',
      submenu: [
        { label: '小', scale: 2 },
        { label: '中', scale: 3 },
        { label: '大', scale: 4 },
      ].map((o) => ({
        label: o.label,
        type: 'radio',
        checked: o.scale === settings.scale,
        click: () => updateSettings({ scale: o.scale }),
      })),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
}

function refreshMenus() {
  if (!ctx.tray || !ctx.rules || !ctx.gameState) return;
  ctx.tray.setContextMenu(buildMenu());
  const summary = jobSummary(ctx.gameState.jobs);
  ctx.tray.setToolTip(summary ? `Excavator · ${summary}` : 'Excavator');
}

function createTray() {
  ctx.tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray.png')));
  ctx.tray.setToolTip('Excavator');
  ctx.tray.on('double-click', () => openGarage('garage'));
  refreshMenus();
}

module.exports = { buildMenu, refreshMenus, createTray, jobSummary };
