// Runs every tests/*.test.mjs in its own process and reports one line per file.
// A test file prints "PASS ..." / "FAIL ..." lines; any FAIL, or a crash, makes the whole run fail.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.mjs') && (!only || f.includes(only)))
  .sort();

let passed = 0;
let failed = 0;
let crashed = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8', timeout: 120_000 });
  const lines = `${res.stdout}\n${res.stderr}`.split(/\r?\n/);
  const p = lines.filter((l) => l.startsWith('PASS ')).length;
  const f = lines.filter((l) => l.startsWith('FAIL '));
  const crash = res.status !== 0 || res.error;
  passed += p;
  failed += f.length;
  if (crash) crashed++;
  console.log(`${f.length || crash ? 'x' : 'ok'}  ${file.padEnd(22)} ${p} passed, ${f.length} failed${crash ? ', CRASHED' : ''}`);
  for (const line of f) console.log(`     ${line}`);
  if (crash) console.log(`     ${String(res.stderr || res.error).split('\n').slice(0, 4).join('\n     ')}`);
}

console.log(`\n${files.length} files, ${passed} passed, ${failed} failed${crashed ? `, ${crashed} crashed` : ''}`);
process.exit(failed || crashed || files.length === 0 ? 1 : 0);
