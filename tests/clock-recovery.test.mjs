import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-clock-'));
let server, time = 5_000_000;
const boot = async () => { server = await startServer({ dataDir: dir, token: 'clock-test', now: () => time }); };
const request = (action) => fetch(`http://127.0.0.1:${server.port}/dispatch`, { method: 'POST', headers: { Authorization: 'Bearer clock-test', 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
try {
  await boot(); assert.equal((await request({ type: 'startJob', site: 'yard' })).status, 200);
  const before = server.getState(); const job = before.jobs[0];
  time -= 3600_000;
  assert.equal((await request({ type: 'claim', jobId: job.id })).status, 409);
  assert.deepEqual(server.getState().jobs[0], job); assert.equal(server.getState().coins, before.coins);
  await server.close(); time = job.end + 86400_000 * 7; await boot();
  assert.deepEqual(server.getState().jobs[0], job); assert.equal(server.getState().coins, before.coins);
  assert.equal((await request({ type: 'claim', jobId: job.id })).status, 200);
  const paid = server.getState().coins;
  time -= 86400_000 * 10;
  assert.equal((await request({ type: 'claim', jobId: job.id })).status, 200);
  assert.equal(server.getState().coins, paid); assert.equal(server.getState().jobs.length, 0);
  console.log('PASS Clock injection: backward clock delays claim; long offline jump preserves one job; repeated claim after rollback pays once');
} finally { await server?.close(); fs.rmSync(dir, { recursive: true, force: true }); }
