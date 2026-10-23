// Electron side of the UI checks. Only depends on Electron and Node, so it works against source or a packaged app.asar.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireIsolatedProfile(prefix) {
  const dir = process.env.EXCAVATOR_USER_DATA ?? '';
  assert(path.basename(dir).startsWith(prefix), `Only an isolated ${prefix}* test profile may run this script`);
  return dir;
}

/** Console errors and renderer crashes from a page; every check asserts this stays empty. */
function watchContents(contents, errors) {
  contents.setBackgroundThrottling(false);
  contents.on('console-message', (details) => { if (details.level === 'error') errors.push(details.message); });
  contents.on('render-process-gone', (_event, details) => errors.push(JSON.stringify(details)));
}

function watchWindows(app, { hide = false } = {}) {
  const errors = [];
  app.on('browser-window-created', (_event, win) => {
    if (hide) win.hide();
    watchContents(win.webContents, errors);
  });
  return errors;
}

function makeUntil(label, tries = 300) {
  return async (check) => {
    for (let i = 0; i < tries; i++) { if (await check()) return; await wait(50); }
    throw new Error(`Timed out waiting for ${label}`);
  };
}

/** Screenshot helper; theme or size changes can briefly invalidate Chromium's compositor surface, so it retries. */
function makeShot(contents, output, { prefix = '', capture = {} } = {}) {
  return async (name) => {
    for (let attempt = 1; ; attempt++) {
      await wait(300 * attempt);
      try {
        const image = await contents().capturePage(undefined, { stayAwake: true, ...capture });
        assert(!image.isEmpty(), 'Empty screenshot');
        fs.writeFileSync(path.join(output, `${prefix}${name}.png`), image.toPNG());
        return;
      } catch (err) { if (attempt === 3) throw new Error(`Screenshot ${prefix}${name} failed`, { cause: err }); }
    }
  };
}

/** Replace the isolated profile's state through the debug-only admin route. */
async function adminReplace(call, state) {
  const result = await call('/admin/replace', { method: 'POST', body: JSON.stringify({ state }) });
  assert.equal(result.status, 200);
  return result.json();
}

module.exports = { wait, requireIsolatedProfile, watchContents, watchWindows, makeUntil, makeShot, adminReplace };
