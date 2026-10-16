import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-smoke-'));
const env = { ...process.env, EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1' };
for (const key of ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL']) delete env[key];
const child = spawnSync(electron, [fileURLToPath(new URL('./smoke-electron.cjs', import.meta.url))], {
  env, encoding: 'utf8', timeout: 45_000, windowsHide: true,
});
console.log(child.stdout);
if (child.status !== 0) {
  console.error(child.stderr || child.error);
  const log = path.join(dir, 'logs', 'app.log');
  if (fs.existsSync(log)) console.error(fs.readFileSync(log, 'utf8'));
  console.error(`Smoke-test data retained: ${dir}`);
} else {
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(child.status === 0 ? 0 : 1);
