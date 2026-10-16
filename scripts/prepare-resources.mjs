import fs from 'node:fs';
// A fresh checkout has no optional signed packs. Packaging still needs this directory.
fs.mkdirSync(new URL('../content-dist/', import.meta.url), { recursive: true });
