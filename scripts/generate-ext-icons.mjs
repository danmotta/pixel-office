import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '..', 'chrome-extension', 'icons');

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.allocUnsafe(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter none
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 16x16 pixel-art sprite grid:
// . = transparent, B = border/navy, S = slate, C = sky cyan, P = Gemini purple, G = green, Y = yellow
const PALETTE = {
  '.': [0, 0, 0, 0],
  B: [15, 23, 42, 255],
  S: [30, 41, 59, 255],
  C: [56, 189, 248, 255],
  P: [192, 132, 252, 255],
  G: [74, 222, 128, 255],
  Y: [250, 204, 21, 255],
  W: [248, 250, 252, 255],
};

const SPRITE_16 = [
  '......YYYY......',
  '...CCCCCCCCCC...',
  '..BBBBBBBBBBBB..',
  '..BSSSSSSSSSSB..',
  '..BSCCCSSPPPSB..',
  '..BSCCCSSPPPSB..',
  '..BSCCCSSPPPSB..',
  '..BSSSSSSSSSSB..',
  '..BSGGGSSWWWSB..',
  '..BSGGGSSWWWSB..',
  '..BSGGGSSPYPSB..',
  '..BSSSSSSSSSSB..',
  '..BBBBCCCCBBBB..',
  '..BBBBCCCCBBBB..',
  '..BBBBBBBBBBBB..',
  '................',
];

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = size / 16;

  for (let y = 0; y < size; y += 1) {
    const sy = Math.min(15, Math.floor(y / scale));
    const row = SPRITE_16[sy];
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(15, Math.floor(x / scale));
      const ch = row[sx];
      const [r, g, b, a] = PALETTE[ch] || PALETTE['.'];
      const idx = (y * size + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return encodePng(size, size, rgba);
}

fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  const png = renderIcon(size);
  fs.writeFileSync(outPath, png);
  console.error(`[generate-ext-icons] Wrote ${outPath} (${png.length} bytes)`);
}
