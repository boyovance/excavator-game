const allowedPages = new WeakMap();
const withoutFragment = (url) => { const parsed = new URL(url); parsed.hash = ''; return parsed.href; };

function protectWindow(win, url) {
  allowedPages.set(win.webContents, withoutFragment(url));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('will-redirect', (event) => event.preventDefault());
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
}

function trustedSender(event) {
  try {
    return event.senderFrame === event.sender.mainFrame &&
      allowedPages.has(event.sender) &&
      withoutFragment(event.senderFrame.url) === allowedPages.get(event.sender);
  } catch { return false; }
}

module.exports = { protectWindow, trustedSender };
