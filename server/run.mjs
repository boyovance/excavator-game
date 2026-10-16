import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './index.mjs';

const dataDir = process.env.EXCAVATOR_DATA ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const tokenFile = path.join(dataDir, 'token');
let token = process.env.EXCAVATOR_TOKEN;
if (!token) {
  try {
    token = fs.readFileSync(tokenFile, 'utf8').trim();
  } catch {}
}
if (!token) {
  token = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(tokenFile, token);
}

const port = Number(process.env.PORT ?? 8787);
const server = await startServer({ dataDir, token, port });
console.log(`excavator server listening on http://127.0.0.1:${server.port}`);
console.log(`data: ${dataDir}`);
console.log(`token: ${tokenFile}`);

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
