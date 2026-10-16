// A repeatable, persistent manual-test profile. No debugger, test hooks or accelerated jobs.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { normalize } from '../src/shared/reducer.mjs';

const exe = path.resolve('release/win-unpacked/Excavator.exe');
const archive = path.join(path.dirname(exe), 'resources/app.asar');
const results = JSON.parse(fs.readFileSync('artifacts/release/exe-results.json', 'utf8'));
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert(results.result === 'passed' && results.archiveSha256 === hash(archive) && results.exeSha256 === hash(exe),
  'The exact package must pass npm run test:exe before manual testing');
if (process.argv.includes('--check')) { console.log('Verified executable/archive hashes; no profile created or application started.'); process.exit(0); }
const dir = path.resolve('artifacts/release/manual-profile');
fs.mkdirSync(dir, { recursive: true });
// wx refuses to replace existing test progress, even if another launch races this one.
for (const [name, value] of [
  ['state.json', { ...normalize(null), name: 'M5獨立驗收' }],
  ['settings.json', { onboarding: 'done', autoStart: false, notify: true, chatter: 'off', petVisible: true }],
]) {
  try { fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2), { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
const env = { ...process.env, EXCAVATOR_USER_DATA: dir };
for (const key of ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL', 'EXCAVATOR_DEBUG']) delete env[key];
const child = spawn(exe, [], { env, detached: true, stdio: 'ignore', windowsHide: true });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.once('spawn', () => {
  child.unref();
  console.log(`Manual-test EXE launched (PID ${child.pid}). Profile retained: ${dir}`);
  console.log('Use the tray to open the garage or quit. Run the same command again to resume this test save.');
});
