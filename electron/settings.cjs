const { app } = require('electron');
const fs = require('fs');
const ctx = require('./context.cjs');
const { userFile } = require('./paths.cjs');
const { placeWindow } = require('./displays.cjs');
const { broadcast, openGarage } = require('./windows.cjs');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(userFile(file), 'utf8'));
  } catch {
    return null;
  }
}

function loadSettings() {
  const stored = readJson('settings.json');
  ctx.settings = ctx.prefs.normalizeSettings(stored);
  // someone who already has a settings file was playing before the guide existed
  if (stored && !('onboarding' in stored)) ctx.settings.onboarding = 'done';
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
  try {
    fs.writeFileSync(userFile('settings.json'), JSON.stringify(ctx.settings, null, 2));
  } catch {}
  if ('display' in clean) placeWindow();
  if (clean.onboarding === 'welcome') openGarage('welcome');
  applySettingEffects(clean);
  broadcast('settings', publicSettings());
  require('./tray.cjs').refreshMenus(); // loaded lazily: the tray menu itself calls updateSettings
}

module.exports = { loadSettings, publicSettings, updateSettings };
