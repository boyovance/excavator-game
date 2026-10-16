import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import persistence from '../server/persistence.cjs';
import { startServer } from '../server/index.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-persistence-'));
const file = path.join(dir, 'settings.json');
const backup = path.join(dir, 'settings.bak.json');
const errors = [];
const writer = persistence.createJsonWriter({ file, backup, delayMs: 10, retryMs: 20, onError: (err) => errors.push(err) });
let srv;
try {
  ok(writer.commit({ scale: 2 }), 'initial atomic settings write');
  fs.mkdirSync(`${file}.tmp`);
  writer.schedule({ scale: 3 });
  await wait(60);
  ok(errors.length > 0, 'write errors are reported');
  ok(JSON.parse(fs.readFileSync(file)).scale === 2, 'failed write preserves current file');
  writer.schedule({ scale: 4 });
  fs.rmdirSync(`${file}.tmp`);
  for (let i = 0; i < 100 && JSON.parse(fs.readFileSync(file)).scale !== 4; i++) await wait(20);
  ok(JSON.parse(fs.readFileSync(file)).scale === 4, 'retry persists the latest pending settings without another action');
  ok(JSON.parse(fs.readFileSync(backup)).scale === 2, 'backup contains previous valid settings');
  fs.writeFileSync(file, '{ broken');
  ok(writer.commit({ scale: 3 }), 'corrupt main file can be replaced');
  ok(JSON.parse(fs.readFileSync(backup)).scale === 2, 'corrupt main file never overwrites valid backup');
  writer.schedule({ scale: 4 });
  ok(writer.close() && JSON.parse(fs.readFileSync(file)).scale === 4, 'close flushes pending changes immediately');

  const dataDir = path.join(dir, 'server');
  srv = await startServer({ dataDir, token: 'test', onSaveError: (err) => errors.push(err) });
  const post = (state) => fetch(`http://127.0.0.1:${srv.port}/admin/replace`, {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
  });
  await post({ coins: 123 });
  fs.mkdirSync(path.join(dataDir, 'state.json.tmp'));
  ok((await post({ coins: 999 })).status === 503, 'failed import reports failure, not success');
  ok(srv.getState().coins === 123, 'failed import leaves in-memory progress unchanged');
  ok(JSON.parse(fs.readFileSync(path.join(dataDir, 'state.json'))).coins === 123, 'failed import leaves disk progress unchanged');
  fs.rmdirSync(path.join(dataDir, 'state.json.tmp'));
  ok((await post({ coins: 456 })).status === 200, 'import works after disk recovers');
} finally {
  writer.close();
  await srv?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
