import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import electron from 'electron';
import { cleanEnv, isolatedProfile, scriptPath } from './lib/launch.mjs';

// Captures output instead of streaming it, so a failure can print the app log next to it.
const dir = isolatedProfile('exc-smoke-');
const env = cleanEnv({ EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1' });
const child = spawnSync(electron, [scriptPath('smoke-electron.cjs')], {
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
