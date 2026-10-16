import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import * as prefs from '../src/shared/settings.mjs';
function moduleFrom(file, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    module, exports: module.exports, require: (id) => { if (!(id in dependencies)) throw Error('Unexpected dependency: ' + id); return dependencies[id]; },
    process: { env: {} }, __dirname: 'C:/test/electron', URL, console, ...globals,
  }, { filename: file });
  return module.exports;
}
// Check real settings module's API calls, not only a helper's return value.
for (const packaged of [false, true]) for (const isolated of [false, true]) {
  const login = [], writes = [];
  const ctx = { prefs, settings: null, win: null };
  const mod = moduleFrom('../electron/settings.cjs', {
    electron: { app: { isPackaged: packaged, setLoginItemSettings: (v) => login.push(v) } },
    fs: { readFileSync: () => JSON.stringify({ autoStart: true, onboarding: 'done' }) },
    './context.cjs': ctx, './paths.cjs': { userFile: (x) => x }, './displays.cjs': { placeWindow() {} },
    './windows.cjs': { broadcast() {}, openGarage() {} }, './log.cjs': { logLine() {} }, './tray.cjs': { refreshMenus() {} },
    '../server/persistence.cjs': { createJsonWriter: () => ({ schedule: (s) => writes.push(s), close: () => true }) },
  }, { process: { env: isolated ? { EXCAVATOR_USER_DATA: 'C:/test/profile' } : {} } });
  mod.loadSettings(); mod.updateSettings({ autoStart: false, scale: 4 }); mod.updateSettings({ autoStart: true });
  const supported = packaged && !isolated;
  assert.equal(mod.publicSettings().autoStartSupported, supported);
  assert.equal(mod.publicSettings().autoStart, supported);
  assert.equal(login.length, supported ? 3 : 0);
  assert.equal(writes.at(-1).scale, 4);
  assert(mod.closeSettings());
}
console.log('PASS Autostart: isolated packaged app never touches login settings; ordinary installed app still does');

const primary = { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 }, size: { width: 1920, height: 1080 } };
const secondary = { id: 2, workArea: { x: -1280, y: 100, width: 1280, height: 984 }, size: { width: 1280, height: 1024 }, scaleFactor: 1.5 };
let displays = [primary, secondary]; const bounds = [];
const screen = Object.assign(new EventEmitter(), { getAllDisplays: () => displays, getPrimaryDisplay: () => primary });
const ctx = { settings: { display: '2', petVisible: false }, win: { setBounds: (v) => bounds.push(v) } };
const displayModule = moduleFrom('../electron/displays.cjs', { electron: { screen }, './context.cjs': ctx });
displayModule.placeWindow(); assert.equal(bounds.at(-1).x, -1280);
assert.equal(displayModule.listDisplays().length, 2);
displays = [primary]; displayModule.placeWindow(); assert.equal(bounds.at(-1).width, 1920);
assert.equal(ctx.settings.display, '2'); // fallback doesn't destroy the preferred display choice
console.log('PASS Displays: negative coordinates, non-primary display and unplug fallback (mocked topology)');

const powerMonitor = new EventEmitter(); const windows = []; let resume = 0, broadcasts = 0;
class Window {
  constructor(options) { this.options = options; this.webContents = { send: () => broadcasts++ }; windows.push(this); }
  setAlwaysOnTop() {} setIgnoreMouseEvents() {} setBounds(v) { this.bounds = v; } loadFile() {}
  static getAllWindows() { return windows; }
}
const paths = await import('node:path'); const urls = await import('node:url');
const windowsModule = moduleFrom('../electron/windows.cjs', {
  electron: { BrowserWindow: Window, powerMonitor, screen }, path: paths, url: urls,
  './security.cjs': { protectWindow() {} }, './context.cjs': ctx, './displays.cjs': displayModule,
});
windowsModule.createWindow({ onResume: () => resume++ });
assert.equal(windows[0].options.webPreferences.sandbox, true);
screen.emit('display-metrics-changed'); screen.emit('display-added'); screen.emit('display-removed');
powerMonitor.emit('resume');
assert.equal(resume, 1); assert.equal(broadcasts, 3); assert.equal(ctx.win.bounds.width, 1920);
console.log('PASS Window handlers: display change broadcasts and resume re-placement/re-sync (synthetic events)');

let now = 1000, currentTimer; const notices = [], opened = [];
const state = { settings: { notify: true }, gameState: null, prefs: { isQuiet: (s) => !!s.quiet }, rules: { siteName: () => '工地' } };
class Notice extends EventEmitter { constructor(options) { super(); this.options = options; } show() { notices.push(this); } static isSupported() { return true; } }
const notify = moduleFrom('../electron/notifications.cjs', {
  electron: { Notification: Notice }, './context.cjs': state,
  './tray.cjs': { refreshMenus() {} }, './windows.cjs': { openGarage: (tab) => opened.push(tab) },
}, { Date: { now: () => now }, setTimeout: (fn) => { currentTimer = { fn, unref() {} }; return currentTimer; }, clearTimeout: () => { currentTimer = null; } });
const job = { id: 'notice-1', site: 'yard', end: 5000 };
state.gameState = { job, coins: 20 }; notify.notifyReturn(null, state.gameState);
now = 500; currentTimer.fn(); assert.equal(notices.length, 0);
now = 6000; currentTimer.fn(); assert.equal(notices.length, 1); assert.equal(state.gameState.coins, 20);
notices[0].emit('click'); assert.equal(opened[0], 'garage');
notify.notifyReturn(null, state.gameState); assert.equal(notices.length, 1);
state.settings.quiet = true; state.gameState.job = { ...job, id: 'quiet' };
notify.notifyReturn(null, state.gameState); currentTimer.fn(); assert.equal(notices.length, 1);
state.settings.quiet = false; state.settings.notify = false; state.gameState.job = { ...job, id: 'disabled' };
notify.notifyReturn(null, state.gameState); currentTimer.fn(); assert.equal(notices.length, 1);
state.gameState.job = null; notify.notifyReturn(null, state.gameState); assert.equal(currentTimer, null);
console.log('PASS Notification handlers: clock reversal/jump, quiet/disabled, cancel and no payout (mocked native notification)');
