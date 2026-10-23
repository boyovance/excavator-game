// Node side of the Electron UI checks: an isolated temporary profile and a clean environment for each run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

export const TEST_SETTINGS = { onboarding: 'done', jobMode: 'stay', chatter: 'off', notify: false, scale: 3 };
// Variables that would point a test at a real server, token or dev build.
const LEAKY_ENV = ['ELECTRON_RUN_AS_NODE', 'EXCAVATOR_SERVER_URL', 'EXCAVATOR_TOKEN', 'VITE_DEV_SERVER_URL'];

export const demoRequested = () => process.argv.includes('--demo');
export const scriptPath = (name) => fileURLToPath(new URL(`../${name}`, import.meta.url));

export function isolatedProfile(prefix, settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  if (settings) fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(settings));
  return dir;
}

export function outputDir(name) {
  const dir = path.resolve('artifacts', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanEnv(extra) {
  const env = { ...process.env, ...extra };
  for (const key of LEAKY_ENV) delete env[key];
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete env[key];
  return env;
}

/** Run one Electron script; resolves with its exit code. A null timeout (demos) never kills it. */
export function runElectron(script, env, timeoutMs) {
  const child = spawn(electron, [scriptPath(script)], { env, stdio: 'inherit', windowsHide: true });
  const timer = timeoutMs ? setTimeout(() => child.kill(), timeoutMs) : null;
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => { clearTimeout(timer); resolve(code); });
  });
}

/**
 * The usual UI check: fresh profile, run the script, delete the profile only after a passing non-demo run.
 * `demoEnv` is the variable the script reads to stay open for manual acceptance.
 */
export async function runUiCheck({ label, prefix, artifacts, script, demoEnv, settings = TEST_SETTINGS, debug = true, outputEnv, timeoutMs = 90_000 }) {
  const demo = demoRequested();
  const dir = isolatedProfile(prefix, settings);
  const env = cleanEnv({
    EXCAVATOR_USER_DATA: dir,
    EXCAVATOR_DEBUG: debug ? '1' : undefined,
    [outputEnv]: outputDir(artifacts),
    [demoEnv]: demo ? '1' : undefined,
  });
  console.log(`Isolated ${label} ${demo ? 'demo' : 'test'} data: ${dir}`);
  const code = await runElectron(script, env, demo ? null : timeoutMs);
  // Only the directory this run created is removed; screenshots remain in artifacts/.
  if (code === 0 && !demo) fs.rmSync(dir, { recursive: true, force: true });
  process.exitCode = code === 0 ? 0 : 1;
}
