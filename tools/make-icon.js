'use strict';
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, checksum]);
}
function createIcon(size, appIcon) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const center = (size - 1) / 2;
  const outer = size * 0.43;
  const inner = size * 0.28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      const distance = Math.hypot(x - center, y - center);
      const edge = Math.max(0, Math.min(1, Math.min(outer - distance, distance - inner) + 0.5));
      const angle = Math.atan2(y - center, x - center);
      const gap = angle > -1.3 && angle < -0.2 ? 0.22 : 1;
      const background = appIcon && distance < size * 0.48 ? Math.max(0, Math.min(1, size * 0.48 - distance + 0.5)) : 0;
      raw[offset] = appIcon ? 20 : 255;
      raw[offset + 1] = appIcon ? 184 : 255;
      raw[offset + 2] = appIcon ? 166 : 255;
      raw[offset + 3] = Math.round(255 * Math.max(background * 0.30, edge * gap));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const assets = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(assets, 'tray.png'), createIcon(32, false));
fs.writeFileSync(path.join(assets, 'app.png'), createIcon(256, true));
console.log('assets/tray.png and assets/app.png written');
