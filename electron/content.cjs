const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
const FILE_RE = /^[A-Za-z0-9_-]{1,40}\.png$/;
const POSE_RE = /^[a-z0-9]{1,12}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_FILES = 30;
const MAX_PACKS = 50;
const MAX_MANIFEST = 256 * 1024;

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });

function verifySignature(bytes, signatureB64, publicKey) {
  try {
    return crypto.verify(null, bytes, publicKey, Buffer.from(String(signatureB64).trim(), 'base64'));
  } catch {
    return false;
  }
}

/** Throws on anything unexpected; returns a sanitized copy so unknown fields never leak through. */
function parseManifest(bytes) {
  if (bytes.length > MAX_MANIFEST) throw new Error('manifest too large');
  const m = JSON.parse(bytes.toString('utf8'));
  if (!m || m.version !== 1 || !Array.isArray(m.packs) || m.packs.length > MAX_PACKS) throw new Error('bad manifest');
  const seen = new Set();
  const packs = m.packs.map((p) => {
    if (!p || !ID_RE.test(p.id) || seen.has(p.id) || !VERSION_RE.test(String(p.version))) throw new Error('bad pack');
    seen.add(p.id);
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40) throw new Error('bad name');
    if (!Array.isArray(p.files) || p.files.length === 0 || p.files.length > MAX_FILES) throw new Error('bad files');
    const files = p.files.map((f) => {
      if (!f || !FILE_RE.test(f.name) || !SHA_RE.test(f.sha256)) throw new Error('bad file entry');
      if (!Number.isInteger(f.size) || f.size < 1 || f.size > MAX_FILE) throw new Error('bad file size');
      return { name: f.name, sha256: f.sha256, size: f.size };
    });
    const names = new Set(files.map((f) => f.name));
    const frames = {};
    for (const [pose, file] of Object.entries(p.frames ?? {})) {
      if (!POSE_RE.test(pose) || !names.has(file)) throw new Error('bad frame');
      frames[pose] = file;
    }
    if (!frames.idle) throw new Error('pack needs an idle frame');
    const dirt = Array.isArray(p.dirt) ? p.dirt.filter((c) => COLOR_RE.test(c)).slice(0, 6) : [];
    return {
      id: p.id,
      version: String(p.version),
      name: p.name.trim(),
      pixelArt: !!p.pixelArt,
      dirt,
      frames,
      files,
    };
  });
  return { version: 1, packs };
}

async function fetchBytes(fetchFn, url, headers, maxBytes) {
  const res = await fetchFn(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) throw new Error('response too large');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('response too large');
  return buf;
}

const toInfo = (p) => ({
  id: `dl-${p.id}`,
  name: p.name,
  pixelArt: p.pixelArt,
  dirt: p.dirt,
  frames: p.frames,
  base: `excavator-pack://${p.id}/${p.version}/`,
});

/** Packs available offline: the last manifest that verified, minus packs whose files are not all present. */
function listPacks({ cacheDir, publicKey }) {
  try {
    const bytes = fs.readFileSync(path.join(cacheDir, 'manifest.json'));
    const sig = fs.readFileSync(path.join(cacheDir, 'manifest.sig'), 'utf8');
    if (!verifySignature(bytes, sig, publicKey)) return [];
    return parseManifest(bytes)
      .packs.filter((p) => fs.existsSync(path.join(cacheDir, 'packs', p.id, p.version, '.ok')))
      .map(toInfo);
  } catch {
    return [];
  }
}

/** Absolute path of a cached frame, or null. Used by the protocol handler. */
function resolveCachedFile(cacheDir, id, version, file) {
  if (!ID_RE.test(id) || !VERSION_RE.test(version) || !FILE_RE.test(file)) return null;
  const dir = path.join(cacheDir, 'packs', id, version);
  if (!fs.existsSync(path.join(dir, '.ok'))) return null;
  const target = path.join(dir, file);
  return fs.existsSync(target) ? target : null;
}

async function downloadPack({ pack, baseUrl, headers, cacheDir, fetchFn }) {
  const dest = path.join(cacheDir, 'packs', pack.id, pack.version);
  if (fs.existsSync(path.join(dest, '.ok'))) return;
  const tmp = `${dest}.tmp`;
  rm(tmp);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    for (const f of pack.files) {
      const url = `${baseUrl}/content/files/${pack.id}/${pack.version}/${f.name}`;
      const buf = await fetchBytes(fetchFn, url, headers, f.size);
      if (buf.length !== f.size) throw new Error(`size mismatch: ${f.name}`);
      if (crypto.createHash('sha256').update(buf).digest('hex') !== f.sha256) throw new Error(`hash mismatch: ${f.name}`);
      fs.writeFileSync(path.join(tmp, f.name), buf);
    }
    fs.writeFileSync(path.join(tmp, '.ok'), '');
    rm(dest);
    fs.renameSync(tmp, dest);
  } catch (err) {
    rm(tmp);
    throw err;
  }
}

/**
 * Fetch the signed manifest, download what is new, and return the packs available offline.
 * Throws only when the manifest itself cannot be fetched or verified; the cache stays untouched then.
 */
async function syncContent({ baseUrl, headers = {}, cacheDir, publicKey, fetchFn = fetch }) {
  const bytes = await fetchBytes(fetchFn, `${baseUrl}/content/manifest.json`, headers, MAX_MANIFEST);
  const sig = (await fetchBytes(fetchFn, `${baseUrl}/content/manifest.sig`, headers, 1024)).toString('utf8');
  if (!verifySignature(bytes, sig, publicKey)) throw new Error('manifest signature is invalid');
  const manifest = parseManifest(bytes);

  fs.mkdirSync(path.join(cacheDir, 'packs'), { recursive: true });
  for (const pack of manifest.packs) {
    try {
      await downloadPack({ pack, baseUrl, headers, cacheDir, fetchFn });
      for (const v of fs.readdirSync(path.join(cacheDir, 'packs', pack.id))) {
        if (v !== pack.version) rm(path.join(cacheDir, 'packs', pack.id, v));
      }
    } catch {
      // keep whatever version already works and retry on the next sync
    }
  }

  const keep = new Set(manifest.packs.map((p) => p.id));
  for (const id of fs.readdirSync(path.join(cacheDir, 'packs'))) {
    if (!keep.has(id) && isDir(path.join(cacheDir, 'packs', id))) rm(path.join(cacheDir, 'packs', id));
  }

  fs.writeFileSync(path.join(cacheDir, 'manifest.json.tmp'), bytes);
  fs.writeFileSync(path.join(cacheDir, 'manifest.sig.tmp'), sig);
  fs.renameSync(path.join(cacheDir, 'manifest.json.tmp'), path.join(cacheDir, 'manifest.json'));
  fs.renameSync(path.join(cacheDir, 'manifest.sig.tmp'), path.join(cacheDir, 'manifest.sig'));
  return listPacks({ cacheDir, publicKey });
}

module.exports = { syncContent, listPacks, resolveCachedFile, parseManifest, verifySignature };
