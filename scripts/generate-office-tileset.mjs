import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tilesetDir = path.join(rootDir, 'assets', 'tilesets');
const outPngPath = path.join(tilesetDir, 'office-atlas-16x16.png');
const outMapPath = path.join(tilesetDir, 'atlas-map.json');

const W = 256;
const H = 256;

function hexToRgba(hex, alpha = 255) {
  if (!hex || hex === 'transparent') return [0, 0, 0, 0];
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

function createSurface(w = W, h = H) {
  const buf = new Uint8Array(w * h * 4);
  const px = (x, y, hex, alpha = 1) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return;
    const [r, g, b, a] = hexToRgba(hex, Math.round(alpha * 255));
    if (a === 0) return;
    const idx = (iy * w + ix) * 4;
    if (alpha >= 1 || buf[idx + 3] === 0) {
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    } else {
      const inv = 1 - alpha;
      buf[idx] = Math.round(buf[idx] * inv + r * alpha);
      buf[idx + 1] = Math.round(buf[idx + 1] * inv + g * alpha);
      buf[idx + 2] = Math.round(buf[idx + 2] * inv + b * alpha);
      buf[idx + 3] = 255;
    }
  };
  const rect = (x, y, rw, rh, hex, alpha = 1) => {
    for (let dy = 0; dy < rh; dy += 1) {
      for (let dx = 0; dx < rw; dx += 1) {
        px(x + dx, y + dy, hex, alpha);
      }
    }
  };
  const box = (x, y, rw, rh, fill, border, hi = null) => {
    rect(x, y, rw, rh, border);
    if (rw > 2 && rh > 2) rect(x + 1, y + 1, rw - 2, rh - 2, fill);
    if (hi && rw > 2) rect(x + 1, y + 1, rw - 2, 1, hi);
  };
  return { w, h, buf, px, rect, box };
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function writePng(surface, filePath) {
  const raw = Buffer.alloc(surface.h * (1 + surface.w * 4));
  for (let y = 0; y < surface.h; y += 1) {
    const rowStart = y * (1 + surface.w * 4);
    raw[rowStart] = 0;
    const srcStart = y * surface.w * 4;
    Buffer.from(surface.buf.buffer, srcStart, surface.w * 4).copy(raw, rowStart + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(surface.w, 0);
  ihdr.writeUInt32BE(surface.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
  return png.length;
}

function buildAtlas() {
  const s = createSurface(W, H);

  // ==========================================================================
  // ROW 0-1 (y: 0..32): 16x16 FLOOR TILES & 16x32 3/4 ARCHITECTURAL WALLS
  // ==========================================================================
  // (0,0) Warm Oak Plank Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    const row = Math.floor(y / 4);
    const seam = y % 4 === 0;
    for (let x = 0; x < 16; x += 1) {
      const joint = (x + row * 7) % 16 === 0;
      if (seam || joint) s.px(x, y, '#966336');
      else s.px(x, y, (row + ((x + row * 7) >> 3)) % 2 === 0 ? '#c9935b' : '#bf8850');
    }
  }
  s.px(3, 2, '#ad7642');
  s.px(11, 10, '#d6a26b');

  // (16,0) Pale Scandinavian Herringbone Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const zig = ((x + y) % 8 < 4) ^ ((x - y + 64) % 8 < 4);
      const seam = (x + y) % 4 === 0;
      s.px(16 + x, y, seam ? '#c4ae94' : zig ? '#eadbc8' : '#dfd0bc');
    }
  }

  // (32,0) Copa Checkered Ceramic Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const c = ((x >> 3) + (y >> 3)) % 2 === 0;
      const grout = x % 8 === 0 || y % 8 === 0;
      s.px(32 + x, y, grout ? '#c4b299' : c ? '#f5efe2' : '#d8c5a8');
    }
  }

  // (48,0) Bathroom Clinical Mosaic Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const grout = x % 4 === 0 || y % 4 === 0;
      s.px(48 + x, y, grout ? '#cbd5e1' : ((x >> 2) + (y >> 2)) % 2 === 0 ? '#f8fafc' : '#e2e8f0');
    }
  }

  // (64,0) Dark Slate Lounge Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const grout = x % 8 === 0 || y % 8 === 0;
      s.px(64 + x, y, grout ? '#1e293b' : ((x >> 3) + (y >> 3)) % 2 === 0 ? '#29374c' : '#243144');
    }
  }

  // (80,0) Cedar Patio Deck Tile (16x16)
  for (let y = 0; y < 16; y += 1) {
    const seam = y % 4 === 0;
    for (let x = 0; x < 16; x += 1) {
      s.px(80 + x, y, seam ? '#5c2808' : (y >> 2) % 2 === 0 ? '#b45309' : '#9a4406');
    }
  }

  // (96,0) 3/4 Wainscot Plaster Wall Tile (16x32)
  s.rect(96, 0, 16, 4, '#5c371c');
  s.rect(96, 4, 16, 15, '#efe1cb');
  s.rect(96, 18, 16, 1, '#c9b18e');
  s.rect(96, 19, 16, 10, '#8c5832');
  for (let wx = 98; wx < 112; wx += 4) {
    s.rect(wx, 21, 2, 6, '#6e4221');
  }
  s.rect(96, 29, 16, 3, '#3b210e');

  // (112,0) 3/4 Sunlit Window Wall Tile (16x32)
  s.rect(112, 0, 16, 4, '#5c371c');
  s.rect(112, 4, 16, 15, '#efe1cb');
  s.rect(112, 19, 16, 10, '#8c5832');
  s.rect(112, 29, 16, 3, '#3b210e');
  s.box(114, 5, 12, 14, '#7dd3fc', '#472a14');
  s.rect(115, 6, 10, 5, '#e0f2fe');
  s.rect(119, 6, 2, 12, '#472a14');
  s.rect(115, 11, 10, 1, '#472a14');

  // (128,0) 3/4 Modern Acoustic Slat Wall Tile (16x32)
  s.rect(128, 0, 16, 4, '#0f172a');
  s.rect(128, 4, 16, 25, '#334155');
  for (let wx = 129; wx < 144; wx += 3) {
    s.rect(wx, 5, 1, 23, '#475569');
  }
  s.rect(128, 29, 16, 3, '#0f172a');

  // (144,0) Framed Pixel Art Landscape Painting on Wall (16x32)
  s.rect(144, 0, 16, 4, '#5c371c');
  s.rect(144, 4, 16, 15, '#efe1cb');
  s.rect(144, 19, 16, 10, '#8c5832');
  s.rect(144, 29, 16, 3, '#3b210e');
  s.box(146, 6, 12, 10, '#38bdf8', '#78350f');
  s.rect(147, 11, 10, 4, '#22c55e');
  s.rect(153, 8, 2, 2, '#fde047');

  // ==========================================================================
  // ROW 2-3 (y: 32..64): RECEPTION, SOFAS, PLANTS, BOOKCASE, SERVER
  // ==========================================================================
  // (0,32) Curved Mahogany Reception Desk (48x32)
  s.box(0, 38, 48, 22, '#854d27', '#3b1d0a', '#c88a51');
  s.rect(2, 40, 44, 6, '#b87343');
  s.box(4, 48, 40, 10, '#6e3d1c', '#3b1d0a');
  // Monitor + lamp + call bell on reception desk
  s.box(8, 33, 12, 9, '#0f172a', '#334155');
  s.rect(10, 35, 8, 5, '#38bdf8');
  s.rect(12, 42, 4, 2, '#334155');
  s.box(34, 35, 6, 6, '#fde047', '#92400e');
  s.rect(36, 41, 2, 3, '#78350f');
  s.rect(25, 41, 4, 3, '#fbbf24');

  // (48,32) Caramel Tufted Leather Sofa (48x32)
  s.box(48, 36, 48, 24, '#b45309', '#451a03', '#f59e0b');
  s.box(50, 38, 44, 9, '#d97706', '#78350f');
  s.box(52, 47, 19, 10, '#f59e0b', '#78350f');
  s.box(73, 47, 19, 10, '#f59e0b', '#78350f');
  // Throw pillows
  s.box(53, 42, 7, 6, '#fef08a', '#92400e');
  s.box(84, 42, 7, 6, '#38bdf8', '#0369a1');

  // (96,32) Deep Navy Tufted Lounge Sofa (48x32)
  s.box(96, 36, 48, 24, '#1e3a8a', '#0f172a', '#3b82f6');
  s.box(98, 38, 44, 9, '#1d4ed8', '#172554');
  s.box(100, 47, 19, 10, '#2563eb', '#172554');
  s.box(121, 47, 19, 10, '#2563eb', '#172554');
  s.box(101, 42, 7, 6, '#f472b6', '#831843');
  s.box(132, 42, 7, 6, '#2dd4bf', '#115e59');

  // (144,32) Potted Monstera Plant (16x32)
  s.box(147, 51, 10, 11, '#c2593f', '#5c2415', '#e07a5f');
  s.rect(146, 50, 12, 3, '#d96b4e');
  s.rect(145, 36, 14, 14, '#15803d');
  s.rect(144, 39, 4, 8, '#22c55e');
  s.rect(156, 38, 4, 9, '#22c55e');
  s.rect(147, 34, 10, 11, '#22c55e');
  s.rect(149, 35, 5, 4, '#4ade80');
  s.px(146, 42, '#86efac');
  s.px(155, 37, '#86efac');

  // (160,32) Water Cooler with Blue Bottle (16x32)
  s.box(163, 45, 10, 17, '#f8fafc', '#475569', '#ffffff');
  s.rect(165, 49, 6, 5, '#cbd5e1');
  s.px(166, 50, '#ef4444');
  s.px(169, 50, '#3b82f6');
  s.box(164, 34, 8, 12, '#38bdf8', '#0284c7', '#bae6fd');
  s.rect(166, 36, 2, 8, '#e0f2fe');

  // (176,32) Tall Mahogany Bookcase (32x32)
  s.box(176, 32, 32, 32, '#6e4223', '#2b1506', '#9a6238');
  const bookCols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
  for (const sy of [36, 45, 54]) {
    s.rect(178, sy, 28, 7, '#3b210e');
    for (let bx = 0; bx < 24; bx += 3) {
      const col = bookCols[(bx + sy) % bookCols.length];
      s.rect(179 + bx, sy + 1, 2, 6, col);
      s.px(179 + bx, sy + 1, '#ffffff', 0.3);
    }
  }

  // (208,32) Server Rack with Status LEDs (16x32)
  s.box(208, 32, 16, 32, '#1e293b', '#090d16', '#475569');
  for (let sy = 36; sy <= 56; sy += 5) {
    s.rect(210, sy, 12, 3, '#0f172a');
    s.px(211, sy + 1, '#10b981');
    s.px(213, sy + 1, '#38bdf8');
    s.px(219, sy + 1, sy % 2 === 0 ? '#facc15' : '#10b981');
  }

  // ==========================================================================
  // ROW 4-5 (y: 64..96): COPA / KITCHEN APPLIANCES & DINING TABLE
  // ==========================================================================
  // (0,64) Double-Door Stainless Fridge with Magnets (32x32)
  s.box(0, 64, 32, 32, '#cbd5e1', '#334155', '#f8fafc');
  s.rect(2, 66, 28, 12, '#e2e8f0');
  s.rect(2, 79, 28, 2, '#64748b');
  s.rect(2, 81, 28, 13, '#d1d5db');
  s.rect(15, 66, 1, 28, '#94a3b8');
  s.rect(12, 70, 2, 6, '#475569');
  s.rect(17, 70, 2, 6, '#475569');
  // Sticky notes & magnets on fridge
  s.rect(5, 68, 3, 3, '#ef4444');
  s.rect(22, 69, 4, 3, '#facc15');
  s.rect(21, 74, 3, 3, '#38bdf8');
  s.rect(6, 84, 4, 4, '#4ade80');

  // (32,64) Kitchen Counter with Stainless Sink (48x32)
  s.box(32, 68, 48, 28, '#854d27', '#3b1d0a');
  s.box(32, 68, 48, 11, '#f1f5f9', '#475569', '#ffffff');
  s.box(38, 70, 18, 7, '#94a3b8', '#334155');
  s.rect(40, 72, 14, 4, '#cbd5e1');
  s.rect(46, 66, 3, 4, '#64748b'); // Faucet
  // Cabinet doors below
  s.box(35, 81, 19, 12, '#9a6238', '#472a14');
  s.box(56, 81, 19, 12, '#9a6238', '#472a14');

  // (80,64) Red Italian Espresso Bar & Grinder (32x32)
  s.box(80, 76, 32, 20, '#854d27', '#3b1d0a', '#f1f5f9');
  s.box(83, 65, 16, 14, '#dc2626', '#7f1d1d', '#f87171');
  s.rect(86, 69, 10, 6, '#cbd5e1');
  s.rect(89, 71, 4, 4, '#1e293b');
  // Coffee grinder + stacked white mugs
  s.box(101, 67, 7, 11, '#1e293b', '#090d16', '#38bdf8');
  s.rect(85, 75, 3, 3, '#ffffff');
  s.rect(91, 75, 3, 3, '#ffffff');

  // (144,64) Communal Oak Dining Table with Plates & Mugs (64x32)
  s.box(144, 66, 64, 28, '#c88a51', '#4d2c12', '#e0a972');
  s.rect(146, 68, 60, 20, '#d6985e');
  for (let py = 72; py < 88; py += 5) {
    s.rect(146, py, 60, 1, '#b3763e');
  }
  // Table runner, plates, croissants & coffee cups
  s.rect(152, 76, 48, 4, '#fef3c7');
  for (const px0 of [154, 174, 194]) {
    s.box(px0, 70, 6, 5, '#ffffff', '#94a3b8');
    s.rect(px0 + 2, 72, 2, 2, '#d97706');
    s.box(px0 + 2, 82, 5, 4, '#ffffff', '#94a3b8');
    s.px(px0 + 4, 83, '#78350f');
  }

  // ==========================================================================
  // ROW 6-7 (y: 96..128): WORKSTATIONS, AQUARIUM, WHITEBOARD, ARCADES
  // ==========================================================================
  // (0,96) Warm Oak Dual-Monitor Workstation (48x32)
  s.box(0, 104, 48, 20, '#c88a51', '#3b1d0a', '#e6b17e');
  s.rect(2, 118, 44, 5, '#966132');
  for (const mx of [6, 26]) {
    s.rect(mx + 6, 102, 4, 4, '#334155');
    s.box(mx, 96, 16, 8, '#0f172a', '#1e293b');
    s.rect(mx + 2, 98, 12, 4, '#0c192c');
    s.rect(mx + 3, 99, 6, 1, '#38bdf8');
    s.rect(mx + 3, 101, 9, 1, '#34d399');
  }
  s.rect(17, 109, 14, 4, '#334155');
  s.box(39, 108, 4, 5, '#ffffff', '#64748b');
  s.px(40, 109, '#78350f');

  // (48,96) White Hi-Bit Ultrawide Workstation (48x32)
  s.box(48, 104, 48, 20, '#e2e8f0', '#334155', '#ffffff');
  s.rect(50, 118, 44, 5, '#94a3b8');
  s.rect(69, 102, 6, 4, '#475569');
  s.box(56, 96, 32, 8, '#0f172a', '#1e293b');
  s.rect(58, 98, 28, 4, '#111827');
  s.rect(60, 99, 11, 1, '#22d3ee');
  s.rect(74, 99, 9, 1, '#f472b6');
  s.rect(60, 101, 18, 1, '#a78bfa');
  s.rect(65, 109, 14, 4, '#1e293b');

  // (96,96) Ergonomic Swivel Chair (16x16)
  s.box(99, 99, 10, 10, '#334155', '#0f172a', '#64748b');
  s.rect(97, 101, 2, 6, '#1e293b');
  s.rect(109, 101, 2, 6, '#1e293b');

  // (112,96) Panoramic Glowing Coral-Reef Aquarium (48x32)
  s.box(112, 96, 48, 28, '#0f172a', '#020617', '#334155');
  s.box(114, 98, 44, 24, '#0284c7', '#0369a1');
  s.rect(115, 99, 42, 6, '#38bdf8');
  s.rect(115, 118, 42, 3, '#fde047'); // Golden sand
  // Corals, seaweed & tropical fish
  s.rect(119, 112, 4, 6, '#f43f5e');
  s.rect(128, 110, 3, 8, '#10b981');
  s.rect(144, 111, 5, 7, '#a855f7');
  s.rect(124, 104, 5, 3, '#fb923c');
  s.px(128, 105, '#0f172a');
  s.rect(137, 107, 5, 3, '#facc15');
  s.px(138, 108, '#0f172a');
  s.px(133, 102, '#e0f2fe');
  s.px(149, 104, '#e0f2fe');

  // (160,96) Glass Whiteboard with Colorful Sticky Notes (48x16)
  s.box(160, 96, 48, 16, '#f8fafc', '#475569', '#ffffff');
  s.rect(162, 98, 44, 12, '#e2e8f0');
  for (const [nx, ny, nc] of [
    [165, 100, '#facc15'],
    [170, 100, '#f472b6'],
    [175, 100, '#38bdf8'],
    [165, 105, '#4ade80'],
    [170, 105, '#a855f7'],
    [184, 101, '#fb923c'],
  ]) {
    s.rect(nx, ny, 4, 4, nc);
  }
  s.rect(191, 101, 11, 2, '#64748b');
  s.rect(191, 105, 8, 2, '#3b82f6');

  // (208,96) Neon Purple & (224,96) Neon Pink Arcade Cabinets (16x32 each)
  for (const [ax, bodyCol, marqueeCol, scrCol] of [
    [208, '#5b21b6', '#22d3ee', '#00d992'],
    [224, '#9d174d', '#facc15', '#38bdf8'],
  ]) {
    s.box(ax, 96, 16, 32, bodyCol, '#0f0720', marqueeCol);
    s.rect(ax + 2, 98, 12, 4, marqueeCol);
    s.box(ax + 2, 104, 12, 10, '#090d16', '#1e293b');
    s.rect(ax + 4, 107, 4, 4, scrCol);
    s.rect(ax + 9, 106, 3, 3, '#f43f5e');
    s.rect(ax + 2, 115, 12, 4, '#334155');
    s.px(ax + 5, 116, '#facc15');
    s.px(ax + 10, 116, '#38bdf8');
  }

  // ==========================================================================
  // ROW 8-9 (y: 128..160): PING-PONG, BATHROOM, BISTRO UMBRELLAS
  // ==========================================================================
  // (0,128) Championship Ping-Pong Table (48x32)
  s.box(0, 130, 48, 28, '#1d4ed8', '#f8fafc', '#3b82f6');
  s.rect(2, 132, 44, 24, '#2563eb');
  s.rect(2, 143, 44, 2, '#f8fafc');
  s.rect(23, 129, 2, 30, '#e2e8f0');
  s.rect(8, 136, 4, 4, '#ef4444'); // Paddle 1
  s.rect(36, 149, 4, 4, '#f59e0b'); // Paddle 2
  s.rect(28, 140, 2, 2, '#ffffff'); // Ball

  // (48,128) Bathroom Vanity Sink & Glowing Mirror (32x32)
  s.box(50, 129, 28, 13, '#38bdf8', '#0369a1', '#bae6fd');
  s.rect(53, 131, 8, 9, '#e0f2fe');
  s.box(48, 143, 32, 16, '#f8fafc', '#64748b', '#ffffff');
  s.box(53, 145, 10, 7, '#cbd5e1', '#475569');
  s.box(65, 145, 10, 7, '#cbd5e1', '#475569');

  // (80,128) Bathroom Stall with Wood Door & Lock Indicator (32x32)
  s.box(80, 128, 32, 32, '#e2e8f0', '#475569', '#f8fafc');
  s.box(85, 133, 22, 25, '#c88a51', '#5c3415', '#df9f64');
  s.rect(102, 144, 3, 3, '#10b981'); // Vacant green lock badge

  // (112,128) Red Striped Bistro Umbrella & (144,128) Blue Bistro Umbrella (32x32)
  for (const [ux, col] of [
    [112, '#e11d48'],
    [144, '#0284c7'],
  ]) {
    s.box(ux + 4, 142, 24, 16, '#f8fafc', '#64748b');
    s.box(ux + 2, 130, 28, 16, col, '#0f172a');
    s.rect(ux + 7, 132, 5, 12, '#ffffff');
    s.rect(ux + 18, 132, 5, 12, '#ffffff');
  }

  return s;
}

const surface = buildAtlas();
const bytes = writePng(surface, outPngPath);

const atlasMap = {
  tileSize: 16,
  width: W,
  height: H,
  sprites: {
    floorOak: { x: 0, y: 0, w: 16, h: 16 },
    floorHerringbone: { x: 16, y: 0, w: 16, h: 16 },
    floorCeramic: { x: 32, y: 0, w: 16, h: 16 },
    floorBath: { x: 48, y: 0, w: 16, h: 16 },
    floorSlate: { x: 64, y: 0, w: 16, h: 16 },
    floorDeck: { x: 80, y: 0, w: 16, h: 16 },
    wallWainscot: { x: 96, y: 0, w: 16, h: 32 },
    wallWindow: { x: 112, y: 0, w: 16, h: 32 },
    wallAcoustic: { x: 128, y: 0, w: 16, h: 32 },
    wallPainting: { x: 144, y: 0, w: 16, h: 32 },
    receptionDesk: { x: 0, y: 32, w: 48, h: 32 },
    sofaCaramel: { x: 48, y: 32, w: 48, h: 32 },
    sofaNavy: { x: 96, y: 32, w: 48, h: 32 },
    plantMonstera: { x: 144, y: 32, w: 16, h: 32 },
    waterCooler: { x: 160, y: 32, w: 16, h: 32 },
    bookcase: { x: 176, y: 32, w: 32, h: 32 },
    serverRack: { x: 208, y: 32, w: 16, h: 32 },
    fridge: { x: 0, y: 64, w: 32, h: 32 },
    kitchenSink: { x: 32, y: 64, w: 48, h: 32 },
    espressoBar: { x: 80, y: 64, w: 32, h: 32 },
    diningTable: { x: 144, y: 64, w: 64, h: 32 },
    deskOak: { x: 0, y: 96, w: 48, h: 32 },
    deskModern: { x: 48, y: 96, w: 48, h: 32 },
    chairSwivel: { x: 96, y: 96, w: 16, h: 16 },
    aquarium: { x: 112, y: 96, w: 48, h: 32 },
    whiteboard: { x: 160, y: 96, w: 48, h: 16 },
    arcadePurple: { x: 208, y: 96, w: 16, h: 32 },
    arcadePink: { x: 224, y: 96, w: 16, h: 32 },
    pingPong: { x: 0, y: 128, w: 48, h: 32 },
    bathVanity: { x: 48, y: 128, w: 32, h: 32 },
    bathStall: { x: 80, y: 128, w: 32, h: 32 },
    bistroRed: { x: 112, y: 128, w: 32, h: 32 },
    bistroBlue: { x: 144, y: 128, w: 32, h: 32 },
  },
};

fs.writeFileSync(outMapPath, JSON.stringify(atlasMap, null, 2), 'utf8');
console.error(`[generate-office-tileset] Wrote ${outPngPath} (${(bytes / 1024).toFixed(1)} KiB) and ${outMapPath}`);
