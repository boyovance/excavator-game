const { app } = require('electron');
const fs = require('fs');
const ctx = require('./context.cjs');
const { userFile } = require('./paths.cjs');
const { placeWindow } = require('./displays.cjs');
const { broadcast, openGarage } = require('./windows.cjs');
const { createJsonWriter } = require('../server/persistence.cjs');
const { logLine } = require('./log.cjs');
let writer;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(userFile(file), 'utf8'));
  } catch {
    return null;
  }
}

function loadSettings() {
  const stored = readJson('settings.json') ?? readJson('settings.bak.json');
  writer = createJsonWriter({ file: userFile('settings.json'), backup: userFile('settings.bak.json'), onError: (err) => logLine('settings-save-failed', err) });
  ctx.settings = ctx.prefs.normalizeSettings(stored);
  // someone who already has a settings file was playing before the guide existed
  if (stored && typeof stored === 'object' && !('onboarding' in stored)) ctx.settings.onboarding = 'done';
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: ctx.settings.autoStart });
}

// Settings plus read-only facts the pages need.
const publicSettings = () => ({ ...ctx.settings, autoStartSupported: app.isPackaged });

function applySettingEffects(changed) {
  if ('autoStart' in changed && app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: ctx.settings.autoStart });
  }
  if ('petVisible' in changed && ctx.win) {
    if (ctx.settings.petVisible) ctx.win.showInactive();
    else ctx.win.hide();
  }
}

function updateSettings(patch) {
  const clean = ctx.prefs.sanitizePatch(patch);
  ctx.settings = ctx.prefs.mergeSettings(ctx.settings, clean);
  writer.schedule(ctx.settings);
  if ('display' in clean) placeWindow();
  if (clean.onboarding === 'welcome') openGarage('welcome');
  applySettingEffects(clean);
  broadcast('settings', publicSettings());
  require('./tray.cjs').refreshMenus(); // loaded lazily: the tray menu itself calls updateSettings
}

const closeSettings = () => writer?.close() ?? true;
module.exports = { loadSettings, publicSettings, updateSettings, closeSettings };
