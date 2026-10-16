import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const PACK_SCRIPT = fileURLToPath(new URL('../scripts/pack-content.mjs', import.meta.url));
import { startServer } from '../server/index.mjs';

const require = createRequire(import.meta.url);
const content = require('../electron/content.cjs');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const png = (shade) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6; const raw = Buffer.alloc(2 * (1 + 8), shade); for (let y = 0; y < 2; y++) raw[y * 9] = 0; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-content-'));
const src = path.join(tmp, 'src');
const out = path.join(tmp, 'dist');
const key = path.join(tmp, 'keys', 'private.pem');
const pub = path.join(tmp, 'public.pem');

const writePack = (id, name, version, shade) => {
  const dir = path.join(src, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'idle.png'), png(shade));
  fs.writeFileSync(path.join(dir, 'dig0.png'), png(shade + 1));
  fs.writeFileSync(path.join(dir, 'skin.json'), JSON.stringify({ name, version, pixelArt: true, dirt: ['#112233', 'not-a-color'], frames: { idle: 'idle.png', dig0: 'dig0.png' } }));
};
const pack = () => spawnSync('node', [PACK_SCRIPT, `--src=${src}`, `--out=${out}`, `--key=${key}`, `--pub=${pub}`], { encoding: 'utf8' });

writePack('alpha', '阿爾法', '1', 10);
writePack('beta', '貝塔', '1', 50);
let r = pack();
ok(r.status === 0 && fs.existsSync(path.join(out, 'manifest.sig')) && fs.existsSync(pub), 'pack-content builds a signed bundle: ' + r.stdout.split('\n').slice(-2, -1));
ok(!fs.readFileSync(pub, 'utf8').includes('PRIVATE'), 'public key file contains no private key');

// packer refuses bad input
fs.mkdirSync(path.join(src, 'Bad_ID'), { recursive: true });
fs.writeFileSync(path.join(src, 'Bad_ID', 'skin.json'), JSON.stringify({ name: 'x', frames: { idle: 'idle.png' } }));
r = pack();
ok(r.status !== 0 && /lowercase/.test(r.stderr), 'packer rejects bad pack id');
fs.rmSync(path.join(src, 'Bad_ID'), { recursive: true });
fs.mkdirSync(path.join(src, 'notpng'), { recursive: true });
fs.writeFileSync(path.join(src, 'notpng', 'idle.png'), 'hello');
fs.writeFileSync(path.join(src, 'notpng', 'skin.json'), JSON.stringify({ name: 'x', frames: { idle: 'idle.png' } }));
r = pack();
ok(r.status !== 0 && /not a PNG/.test(r.stderr), 'packer rejects non-PNG file');
fs.rmSync(path.join(src, 'notpng'), { recursive: true });
pack();

const publicKey = fs.readFileSync(pub, 'utf8');
const TOKEN = 'tok';
const H = { Authorization: `Bearer ${TOKEN}` };
const srv = await startServer({ dataDir: path.join(tmp, 'data'), token: TOKEN, contentDir: out });
const base = `http://127.0.0.1:${srv.port}`;

// server routes
const get = (p, headers = H) => fetch(base + p, { headers });
ok((await get('/content/manifest.json', {})).status === 401, 'content requires the token');
ok((await get('/content/manifest.json')).status === 200, 'manifest is served');
ok((await get('/content/files/alpha/1/idle.png')).headers.get('content-type') === 'image/png', 'frame served as image/png');
for (const p of ['/content/files/alpha/1/../../../data/state.json', '/content/files/alpha/../idle.png', '/content/files/alpha/1/idle.txt', '/content/files/ALPHA/1/idle.png', '/content/files/alpha/1/%2e%2e%2fmanifest.json', '/content/other']) {
  const st = (await get(p)).status;
  ok(st === 404 || st === 400, `path trick blocked (${st}): ${p}`);
}
const rawTraversal = await new Promise((resolve) => { const q = http.request({ host: '127.0.0.1', port: srv.port, path: '/content/files/alpha/1/..%2f..%2fmanifest.json', headers: { ...H } }, (res) => resolve(res.statusCode)); q.end(); });
ok(rawTraversal === 404, 'encoded traversal blocked');

// client sync
const cache = path.join(tmp, 'cache');
let list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey });
ok(list.length === 2 && list[0].id === 'dl-alpha' && list[0].base === 'excavator-pack://alpha/1/', 'sync downloads both packs');
ok(list[0].dirt.length === 1 && list[0].dirt[0] === '#112233', 'invalid dirt colors dropped');
ok(fs.existsSync(path.join(cache, 'packs', 'alpha', '1', 'idle.png')), 'files cached on disk');
ok(content.resolveCachedFile(cache, 'alpha', '1', 'idle.png') !== null, 'cached file resolves');
ok(content.resolveCachedFile(cache, 'alpha', '1', '../../manifest.json') === null && content.resolveCachedFile(cache, '..', '1', 'idle.png') === null, 'resolveCachedFile rejects traversal');

// offline fallback
const offline = await content.syncContent({ baseUrl: 'http://127.0.0.1:1', headers: H, cacheDir: cache, publicKey }).then(() => 'ok', () => 'threw');
ok(offline === 'threw' && content.listPacks({ cacheDir: cache, publicKey }).length === 2, 'offline: sync throws but cached packs still listed');

// tampered cached manifest is ignored
const cm = path.join(cache, 'manifest.json');
const goodManifest = fs.readFileSync(cm);
fs.writeFileSync(cm, goodManifest.toString().replace('阿爾法', '被改過'));
ok(content.listPacks({ cacheDir: cache, publicKey }).length === 0, 'tampered cached manifest -> nothing trusted');
fs.writeFileSync(cm, goodManifest);

// a forged manifest signed by someone else is rejected, cache untouched
const evil = crypto.generateKeyPairSync('ed25519');
const forged = Buffer.from(JSON.stringify({ version: 1, packs: [] }));
const forgedFetch = async (url, init) => url.endsWith('manifest.json') ? new Response(forged) : url.endsWith('manifest.sig') ? new Response(crypto.sign(null, forged, evil.privateKey).toString('base64')) : fetch(url, init);
const forgedResult = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey, fetchFn: forgedFetch }).then(() => 'accepted', (e) => e.message);
ok(/signature/.test(forgedResult) && content.listPacks({ cacheDir: cache, publicKey }).length === 2, 'forged manifest rejected, cache untouched: ' + forgedResult);

// tampered file in transit is rejected
writePack('gamma', '伽瑪', '1', 90);
pack();
const tamperFetch = async (url, init) => { const res = await fetch(url, init); if (url.includes('/files/gamma/')) return new Response(Buffer.alloc(Number(res.headers.get('content-length')), 7)); return res; };
list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey, fetchFn: tamperFetch });
ok(!list.some((p) => p.id === 'dl-gamma') && !fs.existsSync(path.join(cache, 'packs', 'gamma', '1')) && !fs.existsSync(path.join(cache, 'packs', 'gamma', '1.tmp')), 'tampered file rejected, nothing left behind');
ok(list.some((p) => p.id === 'dl-alpha'), 'other packs unaffected by one bad pack');
list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey });
ok(list.some((p) => p.id === 'dl-gamma'), 'good download works on retry');

// version upgrade keeps new, prunes old
writePack('alpha', '阿爾法二代', '2', 20);
pack();
list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey });
ok(list.find((p) => p.id === 'dl-alpha').name === '阿爾法二代' && fs.existsSync(path.join(cache, 'packs', 'alpha', '2')) && !fs.existsSync(path.join(cache, 'packs', 'alpha', '1')), 'upgrade: new version used, old pruned');

// a failed upgrade keeps the working old version
writePack('beta', '貝塔三代', '3', 60);
pack();
const breakBeta3 = async (url, init) => url.includes('/files/beta/3/') ? new Response('nope', { status: 500 }) : fetch(url, init);
list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey, fetchFn: breakBeta3 });
ok(fs.existsSync(path.join(cache, 'packs', 'beta', '1', '.ok')), 'failed upgrade keeps the previous working version on disk');

// revoked pack is removed
fs.rmSync(path.join(src, 'gamma'), { recursive: true });
pack();
list = await content.syncContent({ baseUrl: base, headers: H, cacheDir: cache, publicKey });
ok(!list.some((p) => p.id === 'dl-gamma') && !fs.existsSync(path.join(cache, 'packs', 'gamma')), 'pack removed from manifest is deleted locally');

// manifest validation
const bad = (m) => { try { content.parseManifest(Buffer.from(JSON.stringify(m))); return false; } catch { return true; } };
const sha = 'a'.repeat(64);
const good = { id: 'ok', version: '1', name: 'n', files: [{ name: 'idle.png', sha256: sha, size: 5 }], frames: { idle: 'idle.png' } };
ok(!bad({ version: 1, packs: [good] }), 'valid manifest parses');
ok(bad({ version: 1, packs: [{ ...good, id: '../x' }] }), 'rejects id with dots/slashes');
ok(bad({ version: 1, packs: [{ ...good, version: '..' }] }), 'rejects version ".."');
ok(bad({ version: 1, packs: [{ ...good, files: [{ name: '../idle.png', sha256: sha, size: 5 }] }] }), 'rejects file name with traversal');
ok(bad({ version: 1, packs: [{ ...good, files: [{ name: 'idle.png', sha256: sha, size: 99999999 }] }] }), 'rejects oversize file entry');
ok(bad({ version: 1, packs: [{ ...good, frames: { idle: 'other.png' } }] }), 'rejects frame pointing to an unlisted file');
ok(bad({ version: 1, packs: [{ ...good, frames: { dig0: 'idle.png' } }] }), 'rejects pack without idle');
ok(bad({ version: 1, packs: [good, good] }), 'rejects duplicate pack ids');
ok(bad({ version: 2, packs: [] }), 'rejects unknown manifest version');

await srv.close();
fs.rmSync(tmp, { recursive: true, force: true });
