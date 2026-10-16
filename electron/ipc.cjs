const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const ctx = require('./context.cjs');
const { listDisplays } = require('./displays.cjs');
const { logDir, logLine } = require('./log.cjs');
const { userFile } = require('./paths.cjs');
const { exportSave, importSave, resetSave } = require('./savefiles.cjs');
const { dispatch } = require('./server.cjs');
const { publicSettings, updateSettings } = require('./settings.cjs');
const { buildMenu, refreshMenus } = require('./tray.cjs');
const { openGarage } = require('./windows.cjs');

function registerIpc() {
  ipcMain.handle('export-save', exportSave);
  ipcMain.handle('import-save', importSave);
  ipcMain.handle('reset-save', resetSave);
  ipcMain.handle('get-displays', () => listDisplays());
  ipcMain.on('open-folder', (_e, kind) => {
    const target = kind === 'logs' ? logDir() : kind === 'backups' ? userFile('backups') : kind === 'data' ? app.getPath('userData') : null;
    if (!target) return;
    fs.mkdirSync(target, { recursive: true });
    shell.openPath(target);
  });
  ipcMain.on('renderer-error', (_e, message) => logLine('renderer-error', String(message).slice(0, 2000)));

  ipcMain.handle('get-settings', () => publicSettings());
  ipcMain.handle('get-state', () => ctx.gameState);
  ipcMain.handle('get-packs', () => ctx.packs);
  ipcMain.on('set-settings', (_e, patch) => updateSettings(patch));
  ipcMain.on('dispatch', (_e, action) => {
    if (action && typeof action.type === 'string') dispatch(action);
  });
  ipcMain.on('register-skins', (_e, list) => {
    ctx.skins = list;
    refreshMenus();
  });
  ipcMain.on('set-interactive', (e, v) => {
    if (ctx.win && e.sender === ctx.win.webContents) ctx.win.setIgnoreMouseEvents(!v, { forward: true });
  });
  ipcMain.on('show-menu', () => {
    if (ctx.rules && ctx.gameState) buildMenu().popup();
  });
  ipcMain.on('open-garage', (_e, tab) => openGarage(tab));
}

module.exports = { registerIpc };
