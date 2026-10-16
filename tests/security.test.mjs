import { EventEmitter } from 'node:events';
import security from '../electron/security.cjs';
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const contents = new EventEmitter();
let open;
contents.setWindowOpenHandler = (fn) => { open = fn; };
contents.session = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} };
contents.mainFrame = { url: 'file:///app/dist/garage.html#settings' };
security.protectWindow({ webContents: contents }, 'file:///app/dist/garage.html');
const event = { sender: contents, senderFrame: contents.mainFrame };
ok(security.trustedSender(event), 'own top-level page can use IPC across tab fragments');
ok(!security.trustedSender({ ...event, senderFrame: { url: contents.mainFrame.url } }), 'subframes cannot call privileged IPC');
contents.mainFrame.url = 'https://example.com/garage.html';
ok(!security.trustedSender(event), 'external navigation loses IPC privileges');
contents.mainFrame.url = 'file:///other/garage.html';
ok(!security.trustedSender(event), 'unrelated local files cannot use IPC');
ok(open().action === 'deny', 'new browser windows are blocked');
for (const name of ['will-navigate', 'will-redirect', 'will-attach-webview']) {
  let prevented = false;
  contents.emit(name, { preventDefault() { prevented = true; } });
  ok(prevented, name + ' is blocked');
}
