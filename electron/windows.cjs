const { BrowserWindow, powerMonitor, screen } = require('electron');
const path = require('path');
const ctx = require('./context.cjs');
const { listDisplays, placeWindow, targetDisplay } = require('./displays.cjs');

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload);
}

function pageTarget(target, page, hash = '', query = {}) {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    const url = new URL(page, devUrl);
    url.hash = hash;
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    target.loadURL(url.toString());
  } else {
    target.loadFile(path.join(__dirname, '..', 'dist', page), { hash, query });
  }
}

function createWindow({ onResume }) {
  ctx.win = new BrowserWindow({
    ...targetDisplay().workArea,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    show: ctx.settings.petVisible,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });
  ctx.win.setAlwaysOnTop(true, 'floating');
  ctx.win.setIgnoreMouseEvents(true, { forward: true });
  placeWindow();
  // EXCAVATOR_DEBUG exposes the scene to the page for automated checks; never set it for normal use
  pageTarget(ctx.win, 'index.html', '', process.env.EXCAVATOR_DEBUG ? { debug: '1' } : {});
  const onDisplaysChanged = () => {
    placeWindow();
    broadcast('displays', listDisplays());
  };
  screen.on('display-metrics-changed', onDisplaysChanged);
  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  powerMonitor.on('resume', () => {
    placeWindow();
    onResume();
  });
}

function openGarage(tab) {
  const view = tab === 'settings' || tab === 'welcome' ? tab : 'garage';
  if (ctx.garageWin) {
    if (ctx.garageWin.isMinimized()) ctx.garageWin.restore();
    ctx.garageWin.focus();
    ctx.garageWin.webContents.send('garage-tab', view);
    return;
  }
  ctx.garageWin = new BrowserWindow({
    width: 580,
    height: 780,
    title: '車庫',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });
  ctx.garageWin.setMenu(null);
  pageTarget(ctx.garageWin, 'garage.html', view);
  ctx.garageWin.on('closed', () => {
    ctx.garageWin = null;
  });
}

module.exports = { broadcast, createWindow, openGarage };
