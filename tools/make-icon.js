'use strict';
// Generates assets/tray.png (32x32 anti-aliased ring) without any dependency.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const S = 32, cx = 15.5, cy = 15.5, rOut = 14, rIn = 9;
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const a = Math.max(0, Math.min(1, Math.min(rOut - d, d - rIn) + 0.5));
    const o = y * (S * 4 + 1) + 1 + x * 4;
    // gap in the upper-right quadrant to read as a "consumed" ring
    const ang = Math.atan2(y - cy, x - cx);
    const gap = ang > -1.3 && ang < -0.2 ? 0.25 : 1;
    raw[o] = 255; raw[o + 1] = 255; raw[o + 2] = 255; raw[o + 3] = Math.round(255 * a * gap);
  }
}
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'tray.png'), png);
console.log('assets/tray.png written');
