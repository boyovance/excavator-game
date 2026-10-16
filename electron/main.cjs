const { app, dialog } = require('electron');
const path = require('path');
const ctx = require('./context.cjs');
const { registerIpc } = require('./ipc.cjs');
const { installCrashLogging } = require('./log.cjs');
const { notifyReturn } = require('./notifications.cjs');
const packs = require('./packs.cjs');
const { importLocal } = require('./paths.cjs');
const server = require('./server.cjs');
const { loadSettings, closeSettings } = require('./settings.cjs');
const { createTray, refreshMenus } = require('./tray.cjs');
const { createWindow, openGarage, broadcast } = require('./windows.cjs');

// A fixed data folder, so a development run and an installed build see the same progress.
// EXCAVATOR_USER_DATA lets a test run use a throwaway folder without touching real progress.
app.setPath('userData', process.env.EXCAVATOR_USER_DATA ?? path.join(app.getPath('appData'), 'excavator-game'));

packs.registerPackScheme();

installCrashLogging();

function onServerState(next) {
  const prev = ctx.gameState;
  ctx.gameState = next;
  broadcast('state', ctx.gameState);
  refreshMenus();
  notifyReturn(prev, next);
}

registerIpc();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openGarage('garage'));
  app.on('before-quit', (e) => {
    if (ctx.quitting) return;
    ctx.quitting = true;
    const settingsSaved = closeSettings();
    server.eventsAbort.abort();
    if (ctx.embedded) {
      e.preventDefault();
      ctx.embedded.close().then((saved) => {
        if (!saved || !settingsSaved) dialog.showErrorBox('存檔未完成', '無法寫入部分進度或設定，請檢查磁碟空間及資料夾權限。詳情見日誌。');
      }).finally(() => app.quit());
    } else if (!settingsSaved) {
      dialog.showErrorBox('設定未儲存', '無法儲存設定，請檢查磁碟空間及資料夾權限。');
    }
  });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    ctx.rules = await importLocal('src', 'shared', 'reducer.mjs');
    ctx.prefs = await importLocal('src', 'shared', 'settings.mjs');
    loadSettings();
    packs.handlePackProtocol();
    await server.startBackend();
    ctx.gameState = await (await server.call('/state')).json();
    packs.loadCachedPacks();
    createWindow({ onResume: packs.syncPacks });
    createTray();
    notifyReturn(null, ctx.gameState);
    if (ctx.settings.onboarding === 'welcome') openGarage('welcome');
    server.listenForState(onServerState);
    packs.startPackSync();
  });
}
