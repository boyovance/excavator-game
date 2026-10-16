const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rows = [
  '................',
  '...........kk...',
  '..........kggk..',
  '.........kkggkk.',
  '........kyyyyk.k',
  '..kkkkkkkyyyykkk',
  '.kyyyyyyyyyyyyyk',
  '.kyyyyyyyyyyyyyk',
  '.kddddddddddddk.',
  '.kkkkkkkkkkkkkk.',
  'kttttttttttttttk',
  'ktsttttttttttstk',
  'kttttttttttttttk',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
];
const colors = {
  k: [43, 43, 43],
  y: [245, 184, 0],
  d: [176, 125, 0],
  g: [159, 216, 255],
  t: [58, 58, 58],
  s: [122, 133, 144],
};
const BACKDROP = [255, 241, 200];

function render(scale, backdrop) {
  const size = 16 * scale;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = colors[rows[Math.floor(y / scale)][Math.floor(x / scale)]] ?? backdrop;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      if (c) {
        raw[o] = c[0];
        raw[o + 1] = c[1];
        raw[o + 2] = c[2];
        raw[o + 3] = 255;
      }
    }
  }
  return { size, raw };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encode({ size, raw }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
// tray: transparent background. app icon: 256px on a solid backdrop so it reads on any taskbar.
fs.writeFileSync(path.join(dir, 'tray.png'), encode(render(2, null)));
fs.writeFileSync(path.join(dir, 'icon.png'), encode(render(16, BACKDROP)));
console.log('wrote tray.png and icon.png in', dir);
