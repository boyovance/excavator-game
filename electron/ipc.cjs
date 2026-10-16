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
const { trustedSender } = require('./security.cjs');

function registerIpc() {
  const handle = (channel, fn) => ipcMain.handle(channel, (event, ...args) => {
    if (!trustedSender(event)) throw new Error('Untrusted IPC sender');
    return fn(event, ...args);
  });
  const on = (channel, fn) => ipcMain.on(channel, (event, ...args) => {
    if (trustedSender(event)) fn(event, ...args);
  });
  handle('export-save', exportSave);
  handle('import-save', importSave);
  handle('reset-save', resetSave);
  handle('get-displays', () => listDisplays());
  on('open-folder', (_e, kind) => {
    const target = kind === 'logs' ? logDir() : kind === 'backups' ? userFile('backups') : kind === 'data' ? app.getPath('userData') : null;
    if (!target) return;
    fs.mkdirSync(target, { recursive: true });
    shell.openPath(target);
  });
  on('renderer-error', (_e, message) => logLine('renderer-error', String(message).slice(0, 2000)));

  handle('get-settings', () => publicSettings());
  handle('get-state', () => ctx.gameState);
  handle('get-packs', () => ctx.packs);
  on('set-settings', (_e, patch) => updateSettings(patch));
  on('dispatch', (_e, action) => {
    if (action && typeof action.type === 'string') dispatch(action);
  });
  on('register-skins', (_e, list) => {
    if (!Array.isArray(list) || list.length > 100) return;
    ctx.skins = list.filter((s) => s && typeof s.id === 'string' && s.id.length <= 64 && typeof s.name === 'string' && s.name.length <= 80)
      .map(({ id, name }) => ({ id, name }));
    refreshMenus();
  });
  on('set-interactive', (e, v) => {
    if (typeof v !== 'boolean') return;
    if (ctx.win && e.sender === ctx.win.webContents) ctx.win.setIgnoreMouseEvents(!v, { forward: true });
  });
  on('show-menu', () => {
    if (ctx.rules && ctx.gameState) buildMenu().popup();
  });
  on('open-garage', (_e, tab) => openGarage(tab));
}

module.exports = { registerIpc };
