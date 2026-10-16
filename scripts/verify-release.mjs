import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const demo = process.argv.includes('--demo');
const packaged = process.argv.includes('--packaged');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-release-'));
const output = path.resolve('artifacts/release');
fs.mkdirSync(output, { recursive: true });
const root = packaged ? path.resolve('release/win-unpacked/resources/app.asar') : path.resolve('.');
if (!fs.existsSync(root)) throw Error('Build the Windows package before --packaged');
const env = { ...process.env, EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1', EXCAVATOR_TEST_ROOT: root, EXCAVATOR_RELEASE_OUTPUT: output };
for (const key of ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL']) delete env[key];
// Own isolated profile only: leave first-run onboarding enabled.
fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ onboarding: 'welcome', autoStart: false, notify: false, chatter: 'off', jobMode: 'stay' }));
console.log(`Isolated ${packaged ? 'packaged-resource' : 'source'} release ${demo ? 'demo' : 'test'}: ${dir}`);
async function phase(id) {
  const child = spawn(electron, [fileURLToPath(new URL('./verify-release.cjs', import.meta.url))], {
    env: { ...env, EXCAVATOR_RELEASE_PHASE: id }, stdio: 'inherit', windowsHide: true,
  });
  const timer = demo ? null : setTimeout(() => child.kill(), 120_000);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  clearTimeout(timer);
  if (code !== 0) throw Error(`Release phase ${id} failed; profile retained: ${dir}`);
}
try {
  for (const id of demo ? ['demo'] : ['new', 'legacy', 'restart']) await phase(id);
  if (!demo) fs.rmSync(dir, { recursive: true, force: true });
} catch (error) { console.error(error); process.exitCode = 1; }
