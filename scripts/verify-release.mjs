import fs from 'node:fs';
import path from 'node:path';
import { cleanEnv, demoRequested, isolatedProfile, outputDir, runElectron } from './lib/launch.mjs';

const demo = demoRequested();
const packaged = process.argv.includes('--packaged');
const root = packaged ? path.resolve('release/win-unpacked/resources/app.asar') : path.resolve('.');
if (!fs.existsSync(root)) throw Error('Build the Windows package before --packaged');
// Own isolated profile only: leave first-run onboarding enabled.
const dir = isolatedProfile('exc-release-', { onboarding: 'welcome', autoStart: false, notify: false, chatter: 'off', jobMode: 'stay' });
const env = cleanEnv({ EXCAVATOR_USER_DATA: dir, EXCAVATOR_DEBUG: '1', EXCAVATOR_TEST_ROOT: root, EXCAVATOR_RELEASE_OUTPUT: outputDir('release') });
console.log(`Isolated ${packaged ? 'packaged-resource' : 'source'} release ${demo ? 'demo' : 'test'}: ${dir}`);
async function phase(id) {
  const code = await runElectron('verify-release.cjs', { ...env, EXCAVATOR_RELEASE_PHASE: id }, demo ? null : 120_000);
  if (code !== 0) throw Error(`Release phase ${id} failed; profile retained: ${dir}`);
}
try {
  for (const id of demo ? ['demo'] : ['new', 'legacy', 'restart']) await phase(id);
  if (!demo) fs.rmSync(dir, { recursive: true, force: true });
} catch (error) { console.error(error); process.exitCode = 1; }
