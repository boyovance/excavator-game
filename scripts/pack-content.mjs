// Builds a signed content bundle from content-src/<pack>/ folders (skin.json + PNG frames).
//   node scripts/pack-content.mjs [--src=DIR] [--out=DIR] [--key=PRIVATE.pem] [--pub=PUBLIC.pem]
// The private key never ships. The public key goes into the app so it can verify downloads.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const src = path.resolve(args.src ?? path.join(root, 'content-src'));
const out = path.resolve(args.out ?? path.join(root, 'content-dist'));
const keyFile = path.resolve(args.key ?? path.join(root, 'keys', 'private.pem'));
const pubFile = path.resolve(args.pub ?? path.join(root, 'electron', 'content-public.pem'));

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
const FILE_RE = /^[A-Za-z0-9_-]{1,40}\.png$/;
const MAX_FILE = 8 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

let privateKey;
if (fs.existsSync(keyFile)) {
  privateKey = crypto.createPrivateKey(fs.readFileSync(keyFile));
} else {
  const pair = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  fs.writeFileSync(keyFile, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  privateKey = pair.privateKey;
  fs.writeFileSync(pubFile, pair.publicKey.export({ type: 'spki', format: 'pem' }));
  console.log(`generated a new signing key: ${keyFile}\nKeep it private and back it up. Public key: ${pubFile}`);
}
if (!fs.existsSync(pubFile)) {
  fs.writeFileSync(pubFile, crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }));
}

if (!fs.existsSync(src)) fail(`source folder not found: ${src}`);
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'files'), { recursive: true, force: true });

const packs = [];
for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
  const dir = path.join(src, entry.name);
  if (!entry.isDirectory() || !fs.existsSync(path.join(dir, 'skin.json'))) continue;
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'skin.json'), 'utf8'));
  if (spec.enabled === false) continue;

  const id = entry.name;
  const version = String(spec.version ?? '1');
  if (!ID_RE.test(id)) fail(`pack folder name must be lowercase letters, digits or dashes: ${id}`);
  if (!VERSION_RE.test(version)) fail(`${id}: bad version "${version}"`);
  if (!spec.name || String(spec.name).length > 40) fail(`${id}: name is required (40 chars max)`);
  if (!spec.frames?.idle) fail(`${id}: frames.idle is required`);

  const files = [];
  for (const file of new Set(Object.values(spec.frames))) {
    if (!FILE_RE.test(file)) fail(`${id}: bad file name "${file}"`);
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) fail(`${id}: ${file} is listed in frames but missing`);
    const buf = fs.readFileSync(p);
    if (buf.length > MAX_FILE) fail(`${id}: ${file} is larger than 8 MB`);
    if (!buf.subarray(0, 8).equals(PNG_MAGIC)) fail(`${id}: ${file} is not a PNG`);
    files.push({ name: file, sha256: crypto.createHash('sha256').update(buf).digest('hex'), size: buf.length });
    const dest = path.join(out, 'files', id, version);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, file), buf);
  }
  packs.push({
    id,
    version,
    name: String(spec.name),
    pixelArt: !!spec.pixelArt,
    dirt: spec.dirt ?? [],
    frames: spec.frames,
    files,
  });
  console.log(`packed ${id}@${version} (${files.length} files)`);
}

const manifest = Buffer.from(JSON.stringify({ version: 1, packs }, null, 2));
fs.writeFileSync(path.join(out, 'manifest.json'), manifest);
fs.writeFileSync(path.join(out, 'manifest.sig'), crypto.sign(null, manifest, privateKey).toString('base64'));
console.log(`wrote ${packs.length} pack(s) to ${out}`);
