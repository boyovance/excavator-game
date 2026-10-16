import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-dispatch-'));
const demo = process.argv.includes('--demo');
const output = path.resolve('artifacts/dispatch');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ onboarding: 'done', jobMode: 'stay', chatter: 'off', notify: false, scale: 3 }));
const env = { ...process.env, EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1', EXCAVATOR_DISPATCH_OUTPUT: output };
for (const key of ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL']) delete env[key];
if (demo) env.EXCAVATOR_DISPATCH_DEMO = '1';
else delete env.EXCAVATOR_DISPATCH_DEMO;
console.log(`Isolated dispatch ${demo ? 'demo' : 'test'} data: ${dir}`);
const child = spawn(electron, [fileURLToPath(new URL('./verify-dispatch.cjs', import.meta.url))], { env, stdio: 'inherit', windowsHide: true });
const timeout = demo ? null : setTimeout(() => child.kill(), 90_000);
child.on('exit', (code) => {
  clearTimeout(timeout);
  // Only this process-created temporary directory is removed; screenshots remain.
  if (code === 0 && !demo) fs.rmSync(dir, { recursive: true, force: true });
  process.exitCode = code === 0 ? 0 : 1;
});
